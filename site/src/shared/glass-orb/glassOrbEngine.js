/* =====================================================================
 * glass-orb.js — 玻璃星系球组件(复刻自 x.ai flagship voices orb)
 * 两层结构:
 *   1. 星系层:WebGL fragment shader 程序化生成(shader 逆向自 x.ai 线上代码)
 *   2. 玻璃层:SVG filter —— 预计算透镜位移贴图 + 三次 feDisplacementMap
 *      分别折射 R/G/B 通道,合成边缘彩虹色散
 *
 * 用法:
 *   const orb = createGlassOrb(container, {
 *     size: 200,                 // 直径 px
 *     seed: 'Luna',              // 字符串种子,决定这颗球的星系长相(可复现)
 *     archetype: 'auto',         // 'spiral' 银河带 | 'nebula' 星云 | 'core' 银心
 *                                // | 'deep' 深空场 | 'auto' 由种子决定
 *     background: '#ffffff',     // 页面底色(玻璃边缘透光用)
 *     palette: {                 // 这颗球的色彩身份
 *       anchor:  '#9a8cff',      //   球体虚空/边缘的主色
 *       accents: ['#8b7bff', '#ff9ac4', '#ffd27f'], // 星尘/星云/口袋的三个强调色
 *     },
 *     galaxy: {                  // 星系层参数
 *       speed: 0.8,              //   整体时间流速(翻滚/闪烁/流星都受它控制)
 *       spin: 0.22,              //   自转速度(说话时仍会在此基础上加速)
 *       starDensity: 1,          //   恒星密度 0~2(0.3 稀疏深空,1.5 密集星海)
 *       aurora: 1,               //   极光强度 0~2(0 = 关)
 *       meteor: 1,               //   流星强度 0~2(0 = 关)
 *       colorful: 1,             //   色彩浓度 0~2.5:星云口袋/虚空微光/星尘染色一起加减
 *     },
 *     glass: {                   // 玻璃层参数
 *       strength: 0.56,          //   边缘折射位移幅度(× 直径,越大边缘拉伸越猛)
 *       depth: 0.16,             //   边缘折射带宽度(× 半径,越大折射圈越宽、玻璃越"厚")
 *       softness: 1,             //   折射带过渡软硬(<1 更锐利,>1 更绵软)
 *       dome: 0,                 //   整体球面放大 0~0.6(不止边缘,整个镜面都凸起来)
 *       dispersion: 0.14,        //   色散强度:R/G/B 三通道折射量的差(0 = 无彩虹)
 *       specAngle: 40,           //   高光轴角度(度)
 *       glow: 0.65,              //   面高光强度
 *       glowSpread: 0.95,        //   面高光铺开范围 0~1(越大高光面积越大)
 *       edge: 1.02,              //   轮廓圈高光强度
 *       edgeWidth: 0.09,         //   轮廓圈高光宽度(× 半径)
 *       blur: 0.15,              //   折射前的轻微模糊(px)
 *       breath: 0.05,            //   透镜"呼吸"波动幅度(0 = 静止)
 *     },
 *   });
 *
 *   orb.setAudio(0.6);   // 喂音量 0~1:极光涌动、内核闪耀、边缘点亮、自转加速
 *   orb.set({ palette, galaxy, archetype, background });  // 运行时改星系层
 *   orb.setGlass({ depth: 0.3, dome: 0.2 });              // 运行时改玻璃层(重建滤镜)
 *   orb.canvas           // 内部 canvas,可自行加 class / 动画
 *   orb.destroy();
 * =================================================================== */

import { guardGL } from './glGuard.js';

/* ── GLSL ── */
const VERT = `
attribute vec2 aPos;
attribute vec2 aUV;
varying vec2 vUV;
void main() {
  vUV = aUV;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = `
precision highp float;
varying vec2 vUV;
uniform vec2 uRes;
uniform vec3 uBg;
uniform vec3 uAnchor, uC0, uC1, uC2;
uniform float uTime, uPhase;
uniform float uAudio;       // 实时音量 0..1
uniform float uSpin;        // CPU 端积分的自转角(可加速、缓动)
uniform float uArch;        // 星系原型;< 0 = 由种子决定
uniform float uSpeed;       // 时间流速
uniform float uStarDensity; // 恒星密度
uniform float uAurora;      // 极光强度
uniform float uMeteor;      // 流星强度
uniform float uColorful;    // 色彩浓度:星云口袋 / 虚空微光 / 星尘染色的总量

float h1(float x) { return fract(sin(x * 127.1) * 43758.5453); }

// ── starfield:玻璃球里的一整个星系 —— 倾斜的银河带、暗尘带、
// 发光星云口袋、三个尺度的闪烁恒星、深空黑底
vec4 starfield(vec3 n, float t) {
  float lon = atan(n.z, n.x);
  float lat = asin(clamp(n.y, -1.0, 1.0));

  // 由种子派生的结构变量:每颗球一个专属星系
  float v1 = fract(uPhase * 7.13);
  float v2 = fract(uPhase * 3.71);
  float v3 = fract(uPhase * 5.37);

  // 星系原型:0 银河带 · 1 发射星云 · 2 银心 · 3 深空场
  float at = uArch >= 0.0 ? uArch : floor(fract(uPhase * 9.73) * 4.0);
  float isNeb = step(0.5, at) * (1.0 - step(1.5, at));
  float isCore = step(1.5, at) * (1.0 - step(2.5, at));
  float isDeep = step(2.5, at);

  // 银道面:密度集中在一条倾斜赤道带上。
  // lon 的频率必须取整数,否则花纹在 ±PI 接缝处对不上
  float gb = lat + (0.15 + 0.4 * v1) * sin(lon * (1.0 + floor(v2 * 2.0)) + 1.3)
           + 0.12 * sin(lon * 3.0 + t * 0.1);
  float band = exp(-gb * gb * (5.0 + 10.0 * v3));
  band = mix(band, max(band, 0.8), isNeb); // 星云:云雾铺满全天
  band *= 1.0 - 0.85 * isDeep;             // 深空场:近乎空无

  // 星云:两个八度的扭曲云絮 + 暗尘带切割
  float n1 = sin(lon * 2.0 + sin(lat * 3.0 + t * 0.25) * 1.6 + t * 0.15);
  float n2 = sin(lon * 5.0 - sin(lat * 4.0 - t * 0.2) * 1.2 - t * 0.22 + 2.4);
  float neb = pow(0.5 + 0.5 * n1, 2.0) * (0.45 + 0.55 * pow(0.5 + 0.5 * n2, 2.0));
  float lane = pow(0.5 + 0.5 * sin(lon * 4.0 + lat * 7.0 + sin(lon * 2.0) * 2.0), 3.0);
  float galaxy = clamp(band * neb * (1.0 - lane * (0.55 + 0.35 * v2)), 0.0, 1.0);

  // 每颗球的色彩身份
  vec3 hue = mix(mix(uC0, uC1, v1), mix(uC1, uC2, v3), 0.5 + 0.5 * sin(lon + lat * 2.0 - t * 0.2));
  vec3 hueGrey = vec3(dot(hue, vec3(0.299, 0.587, 0.114)));
  hue = clamp(hueGrey + (hue - hueGrey) * 1.45, 0.0, 1.0);
  vec3 dust = mix(vec3(0.72, 0.78, 0.92), hue, clamp((0.45 + 0.3 * v1 + 0.45 * isNeb) * uColorful, 0.0, 0.95));
  vec3 col = dust * galaxy * (0.6 + 0.9 * isNeb);

  // 带内的轨道剪切流光:星系看得出在"转"
  float shear = sin(lon * 13.0 + lat * 4.0 - t * 0.35) * sin(lon * 5.0 + t * 0.2);
  col += dust * band * neb * max(shear, 0.0) * 0.14;
  // 第二条更暗的尘埃旋臂,交叉出纵深
  float gb2 = lat - (0.35 + 0.25 * v2) * sin(lon * 2.0 - 1.1) + 0.4;
  float arm = exp(-gb2 * gb2 * 7.0) * neb;
  col += mix(dust, uC1, 0.35) * arm * 0.2;
  // 虚空从不纯黑:带着这颗球主色的一层微光在呼吸
  vec3 voidGlow = mix(vec3(0.04, 0.03, 0.1), mix(uC0, mix(uC1, uC2, v3), v1) * 0.22, 0.75);
  col += voidGlow * (0.5 + 0.22 * sin(t * 0.4 + lon)) * (0.4 + 0.6 * band) * uColorful;
  // 带深处的暖琥珀核辉
  col += vec3(1.0, 0.88, 0.68) * pow(band, 4.0) * pow(neb, 2.0) * 0.4;
  // 银心原型:炽热核球固定在球面上,随星系一起转
  float ca = v2 * 6.28318;
  vec3 Cdir = normalize(vec3(cos(ca) * 0.85, 0.6 * (v3 - 0.5), sin(ca) * 0.85));
  float bulge = max(dot(n, Cdir), 0.0);
  col += mix(vec3(1.0, 0.85, 0.6), uC2, 0.25) * (pow(bulge, 14.0) * 1.6 + pow(bulge, 4.0) * 0.5) * isCore;
  // 星云口袋:两层不同色相的饱和亮斑,缓慢呼吸
  float pocket = pow(neb, 5.0) * band * (0.7 + 0.3 * sin(t * 0.6 + lon * 3.0));
  col += mix(uC2, uC0, fract(v1 + 0.5 * sin(lon * 2.0) + 0.5)) * pocket * (0.5 + 0.4 * v2 + 0.8 * isNeb) * uColorful;
  float pocket2 = pow(0.5 + 0.5 * sin(lon * 3.0 + lat * 4.0 - t * 0.18 + 2.0), 6.0) * band;
  col += mix(uC1, uC2, v3) * pocket2 * (0.25 + 0.3 * v1 + 0.5 * isNeb) * uColorful;

  // 细节系数:小尺寸球自动丢弃细颗粒,防锯齿闪烁
  float detail = smoothstep(90.0, 200.0, uRes.y);
  // 乳状星尘颗粒:长曝光照片里"银河"质感的来源
  vec2 gg = vec2(lon, lat) * 34.0;
  vec2 gc = floor(gg);
  vec2 gf = fract(gg);
  float gh = h1(gc.x * 3.7 + gc.y * 11.3);
  vec2 gp = vec2(0.2 + 0.6 * h1(gh * 91.0), 0.2 + 0.6 * h1(gh * 47.0));
  float gd = length((gf - gp) * vec2(cos(lat), 1.0));
  float grain = exp(-gd * gd * 700.0 * clamp(uRes.y / 420.0, 0.22, 1.0)) * step(0.3, gh) * (0.15 + 0.85 * band);
  col += vec3(0.88, 0.9, 1.0) * grain * 0.4 * detail * min(uStarDensity, 1.5);
  float w = clamp(galaxy * 0.7 + pow(band, 4.0) * 0.25, 0.0, 1.0);

  // 三个尺度的恒星:少量亮星、成片中星、致密暗尘
  for (int s = 0; s < 3; s++) {
    float K = s == 0 ? 6.0 : (s == 1 ? 11.0 : 19.0);
    vec2 g = vec2(lon, lat) * K;
    vec2 cell = floor(g);
    vec2 f = fract(g);
    float hx = h1(cell.x * 13.7 + cell.y * 7.3 + float(s) * 91.0);
    float hy = h1(cell.x * 5.1 + cell.y * 17.9 + float(s) * 37.0);
    vec2 sp = vec2(0.15 + 0.7 * hx, 0.15 + 0.7 * hy);
    float d = length((f - sp) * vec2(cos(lat), 1.0));
    // 原型星口普查:星云贫星、银心富星、深空稀疏;uStarDensity 整体加减
    float census = (v2 - 0.5) * 0.2 + 0.35 * isNeb - 0.2 * isCore + 0.3 * isDeep
                 - (uStarDensity - 1.0) * 0.3;
    float keep = step((s == 2 ? 0.3 : 0.55) + census, h1(hx * 89.0 + hy * 31.0) + band * 0.25);
    float resFac = clamp(uRes.y / 420.0, 0.22, 1.0);
    float tw = mix(0.92, 0.6 + 0.4 * sin(t * (1.5 + 3.0 * hx) + hx * 40.0), resFac);
    // 每颗星自己抽大小和亮度:真实的星等分布
    float hz = h1(hx * 53.0 + hy * 71.0 + cell.x);
    float sizeJit = 0.35 + 1.8 * hz * hz;
    float sharp = (s == 0 ? 260.0 : (s == 1 ? 700.0 : 1600.0)) / sizeJit * resFac;
    float star = exp(-d * d * sharp) * keep * tw;
    vec3 tint = mix(vec3(1.0), hx < 0.33 ? vec3(0.85, 0.9, 1.0) : (hx < 0.66 ? vec3(1.0, 0.95, 0.85) : mix(vec3(1.0), uC1, 0.3)), 0.6);
    float bright = (s == 0 ? 1.7 : (s == 1 ? 0.9 : 0.5)) * (0.55 + 0.7 * sizeJit);
    float starFade = mix(s == 2 ? 0.14 : 0.45, 1.0, detail);
    col += tint * star * bright * starFade;
    // 最亮的星带柔光晕 + 衍射十字
    if (s == 0) {
      float big = smoothstep(1.2, 2.0, sizeJit);
      col += tint * exp(-d * d * 60.0) * 0.18 * big * tw * starFade;
      vec2 dd = (f - sp) * vec2(cos(lat), 1.0);
      float spike = exp(-dd.x * dd.x * 1200.0) * exp(-dd.y * dd.y * 26.0)
                  + exp(-dd.y * dd.y * 1200.0) * exp(-dd.x * dd.x * 26.0);
      col += tint * spike * 0.3 * big * tw * starFade;
      w = max(w, spike * 0.3 * big * starFade);
    }
    w = max(w, star * min(bright, 1.5) * starFade);
  }

  // 脉冲星:每球一颗按节奏闪烁的亮星,音量推它更亮更快
  float pa = v1 * 6.28318;
  vec3 P = normalize(vec3(sin(pa) * 0.9, 1.4 * (v2 - 0.5), cos(pa) * 0.9));
  float pd = max(dot(n, P), 0.0);
  float beat = pow(0.5 + 0.5 * sin(t * (1.2 + v3 + 1.5 * uAudio) + v3 * 6.28), 8.0);
  beat = min(1.0, beat + 0.6 * uAudio);
  float pulsarFade = mix(0.45, 1.0, detail);
  col += vec3(0.9, 0.95, 1.0) * (pow(pd, 900.0) * (0.6 + 1.2 * beat) + pow(pd, 110.0) * 0.5 * beat) * pulsarFade;
  w = max(w, pow(pd, 900.0) * (0.5 + 0.5 * beat) * pulsarFade);

  return vec4(min(col, vec3(1.0)), min(w, 1.0));
}

// 球体多轴翻滚:绕倾斜轴自转 + 轴本身进动 + 整体滚动 ——
// 像手里把玩的弹珠,花纹会滚过两极而不是只横向平移
vec4 sphereAt(vec3 n, float spin, float t) {
  float roll = t * 0.13;
  float cr = cos(roll), sr = sin(roll);
  n = vec3(cr * n.x - sr * n.y, sr * n.x + cr * n.y, n.z);
  float tilt = 0.45 + 0.35 * sin(t * 0.24);
  float cx = cos(tilt), sx = sin(tilt);
  n = vec3(n.x, cx * n.y - sx * n.z, sx * n.y + cx * n.z);
  float cs = cos(spin), ss = sin(spin);
  n = vec3(cs * n.x + ss * n.z, n.y, -ss * n.x + cs * n.z);
  return starfield(n, t);
}

void main() {
  vec2 p = vUV * 2.0 - 1.0;
  float r = length(p);
  // 不做 alpha 遮罩:星空画满整个方形 canvas(圆外是 overscan),
  // 这样 SVG 透镜向外拉像素时永远有内容可采;真正的圆由 CSS clip-path 切
  float t = uTime * uSpeed + uPhase;

  // 假 3D 球面:z = sqrt(1 - r^2) 得到法线
  float rr = min(r, 0.9995);
  float z = sqrt(1.0 - rr * rr);
  vec3 N = vec3(p.x, p.y, z);
  float fres = pow(1.0 - z, 2.4); // 中心 0 → 球缘 1

  // 视线折射进玻璃,打到球体背面内壁 —— 通透感的关键
  vec3 I = vec3(0.0, 0.0, -1.0);
  vec3 R = refract(I, N, 0.75);
  float dHit = -2.0 * dot(N, R);
  vec3 B = normalize(N + R * dHit);

  // 自转角在 CPU 端积分(uSpin),音量可以让它加速、缓动;
  // 花纹时间自带轻微非线性漂移
  float sv = fract(uPhase * 6.31);
  float sw = fract(uPhase * 2.17);
  float tWarp = t
    + (0.9 + 1.3 * sv) * sin(t * (0.09 + 0.07 * sw))
    + (0.5 + 0.8 * sw) * sin(t * (0.21 + 0.09 * sv) + 2.6);
  vec4 front = sphereAt(N, uSpin, tWarp);
  vec4 back = sphereAt(B, uSpin, tWarp * 0.8 + 2.7);

  // 玻璃本体:深空玻璃 —— 近黑的虚空,主色在球缘呼吸
  vec3 voidCol = mix(uAnchor * 0.04, uAnchor * 0.35, fres);
  vec3 col = mix(uBg, voidCol, 0.97 - 0.04 * fres);
  float fa = clamp(front.a, 0.0, 1.0);
  float ba = clamp(back.a, 0.0, 1.0);
  col = mix(col, back.rgb, ba * 0.16); // 背壁回声
  col = mix(col, front.rgb, fa * 0.85);
  {
    // ── 极光,"声音即光" —— 画在视空间,帘幕永远挂在可见的上半球
    float alon = atan(N.x, N.z);
    float speech = pow(0.5 + 0.5 * sin(alon * 3.0 + sin(alon * 7.0 + t * 1.1) * 0.7 + t * 0.5), 3.0)
                 * (0.55 + 0.45 * sin(alon * 5.0 - t * 0.65 + 1.7));
    float sky = -N.y;
    float hang = smoothstep(-0.15, 0.5, sky);
    float rays = 0.7 + 0.3 * sin(alon * 24.0 + sin(alon * 9.0 - t * 0.8) * 2.0 + t * 1.6);
    float aur = clamp(speech, 0.0, 1.0) * hang * rays * (1.0 + 2.2 * uAudio);
    float av = fract(uPhase * 2.93);
    vec3 aurCol = mix(vec3(0.12, 0.95, 0.55), vec3(0.45, 0.35, 1.0),
                      smoothstep(0.0, 0.95, sky + 0.35 * speech));
    aurCol = mix(aurCol, mix(uC0, uC2, av), 0.15 + 0.4 * av);
    col += aurCol * aur * 0.8 * uAurora;

    // 流星:每 ~6s 一颗,白热的头 + 指数衰减的尾
    float met = 4.5 + 3.5 * fract(uPhase * 4.91);
    float epoch = floor(t / met);
    float ph = fract(t / met);
    vec2 s0 = vec2(-1.1 + 2.2 * h1(epoch * 1.3), 0.85 - 1.4 * h1(epoch * 2.9));
    vec2 sd = normalize(vec2(0.7 + 0.5 * h1(epoch * 4.1), -0.35 - 0.4 * h1(epoch * 5.3)));
    vec2 head = s0 + sd * ph * 2.8;
    vec2 rel = p - head;
    float along = dot(rel, sd);
    float perp = dot(rel, vec2(-sd.y, sd.x));
    float vis = smoothstep(0.0, 0.06, ph) * smoothstep(0.5, 0.32, ph);
    float tail = exp(-perp * perp * 1600.0) * exp(along * 9.0) * step(along, 0.0)
               * smoothstep(-0.5, -0.02, along);
    float headGlow = exp(-dot(rel, rel) * 900.0);
    col += (vec3(1.0) * headGlow * 1.2 + mix(vec3(1.0), uC1, 0.3) * tail * 0.85) * vis * uMeteor;

    // 移动照明:一道柔和的晨昏线扫过球面,让球看起来是"被照亮的",
    // 而不是"印上去的"
    vec3 LD = normalize(vec3(0.85 * sin(t * 0.42), 0.45 * sin(t * 0.26 + 1.2), 0.5));
    float diffuse = 0.62 + 0.65 * max(dot(N, LD), 0.0);
    diffuse *= 1.0 + 0.35 * uAudio;
    col *= diffuse;
    // ── 声之光:说话时深处亮起暖核,球缘染上主色 —— 球在"发声"
    vec3 voiceCol = mix(uC1, vec3(1.0, 0.97, 0.9), 0.45);
    col += voiceCol * pow(1.0 - rr, 1.8) * uAudio * 0.5;
    col += (uC1 * 0.7 + vec3(0.12)) * fres * uAudio * 0.65;
    // 闪烁相位按像素 hash 随机,而不是按半径(按半径会在画面上留下同心圆环)
    float sparkPh = h1(floor(p.x * 48.0) + floor(p.y * 48.0) * 113.0 + uPhase);
    col += col * uAudio * 0.15 * sin(t * 14.0 + sparkPh * 6.28318);
    // 背光侧的微弱大气辉光
    float counter = max(dot(N.xy, -LD.xy), 0.0) * fres;
    col += mix(uC0, vec3(0.5, 0.6, 0.9), 0.5) * counter * 0.18;
  }

  // 球面法线打光:主光缓慢漂移、强度呼吸,玻璃永远不是静态打光
  vec3 L1 = normalize(vec3(-0.45 + 0.3 * sin(t * 0.34), 0.62 + 0.2 * sin(t * 0.27 + 1.7), 0.64));
  float keyAmp = 0.5 * (0.78 + 0.22 * sin(t * 0.45 + 2.2));
  col += vec3(1.0) * pow(max(dot(N, L1), 0.0), 150.0) * keyAmp;
  vec3 LS = normalize(vec3(sin(t * 0.07) * 0.9, 0.35 + 0.3 * cos(t * 0.05), 0.7));
  col += vec3(1.0) * pow(max(dot(N, LS), 0.0), 7.0) * 0.05;
  vec3 L2 = normalize(vec3(0.52, -0.5 + 0.12 * sin(t * 0.09), 0.69));
  col += vec3(1.0) * pow(max(dot(N, L2), 0.0), 140.0) * 0.25;
  // 菲涅尔球缘:气泡边缘沾一点银河带的颜色
  col = mix(col, front.rgb, fa * fres * 0.3);
  float limb = smoothstep(0.94, 1.0, rr);
  col = mix(col, col * 0.85, limb * 0.4);

  gl_FragColor = vec4(col, 1.0);
}`;

/* ── 玻璃层:透镜位移贴图(R/G = 折射向量,B = 高光遮罩)── */
function makeLensMap(mapSize, g) {
  const c = document.createElement('canvas');
  c.width = c.height = mapSize;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(mapSize, mapSize);
  const d = img.data;
  const B = g.specAngle * Math.PI / 180, cb = Math.cos(B), sb = Math.sin(B);
  const U = (1 - g.glowSpread) * Math.SQRT2, Z = Math.max(0.001, g.glowSpread) * Math.SQRT2;
  // 边缘折射剖面:幂函数 r^P,从球心起就平滑增长、越靠边越陡。
  // 在任何半径都没有"带起点"(旧 tanh 带的硬起点会在内圈留一道分界线,
  // 折射内容和面高光都在那一圈上被硬切)。depth 语义不变:
  // r = 1-depth 处剖面恰好 0.5;softness >1 指数更小、过渡更绵软
  const P = Math.log(0.5) / Math.log(Math.min(0.98, Math.max(0.02, 1 - g.depth))) / g.softness;
  const bayer = [-0.375, 0.125, 0.375, -0.125]; // 2×2 抖动:消掉 8-bit 位移量化的等高线圈
  for (let y = 0; y < mapSize; y++) {
    for (let x = 0; x < mapSize; x++) {
      const nx = ((x + 0.5) / mapSize) * 2 - 1;
      const ny = ((y + 0.5) / mapSize) * 2 - 1; // y 向下,与 SVG 滤镜坐标一致
      const r = Math.hypot(nx, ny);
      const fall = Math.pow(Math.min(r, 1), P);
      // dome:整个镜面的球面放大(随半径平方增长,中心不动)
      const profile = Math.min(1, fall + g.dome * r * r);
      // 采样向内拉 → 球缘内容向外涂抹放大,读作玻璃球
      const dx = 0.5 * (-nx) * profile;
      const dy = 0.5 * (-ny) * profile;
      // 高光:沿 specAngle 轴的两道弧光 + 轮廓圈
      const proj = Math.abs(nx * cb + ny * sb);
      let spec = g.glow * Math.pow(Math.min(1, Math.max(0, (proj - U) / Z)), 2.4) * fall;
      const edgeRing = Math.max(0, 1 - Math.abs(r - 1) / g.edgeWidth);
      spec = Math.min(1, spec + g.edge * edgeRing * Math.pow(Math.min(proj, 1), 2));
      const i = (y * mapSize + x) * 4;
      const dn = bayer[(y & 1) * 2 + (x & 1)];
      d[i] = Math.max(0, Math.min(255, Math.round((0.5 + dx) * 255 + dn)));
      d[i + 1] = Math.max(0, Math.min(255, Math.round((0.5 + dy) * 255 + dn)));
      d[i + 2] = Math.round(127 * spec + 128.5);
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL();
}

const NS = 'http://www.w3.org/2000/svg';
function el(name, attrs, href) {
  const e = document.createElementNS(NS, name);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (href !== undefined) {
    e.setAttribute('href', href);
    e.setAttributeNS('http://www.w3.org/1999/xlink', 'href', href);
  }
  return e;
}

let defsHost = null;
function ensureDefs() {
  if (defsHost) return defsHost;
  const svg = el('svg', { 'aria-hidden': 'true' });
  svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
  defsHost = document.createElementNS(NS, 'defs');
  svg.appendChild(defsHost);
  document.body.appendChild(svg);
  return defsHost;
}

let filterUid = 0;
// 滤镜链与 x.ai 线上版一致:blur → 3×feDisplacementMap(RGB 各自的 scale)
// → 合成 → 高光叠加 → 圆形裁切
function buildGlassFilter(size, g) {
  const id = 'orb-glass-' + (++filterUid);
  const mapHref = makeLensMap(size > 200 ? 512 : 256, g);
  const f = el('filter', {
    id, filterUnits: 'userSpaceOnUse', primitiveUnits: 'userSpaceOnUse',
    'color-interpolation-filters': 'sRGB', x: 0, y: 0, width: size, height: size,
  });
  f.appendChild(el('feFlood', { 'flood-color': 'rgb(128,128,128)', 'flood-opacity': 1, result: 'mapBg' }));
  f.appendChild(el('feImage', { preserveAspectRatio: 'none', x: 0, y: 0, width: size, height: size, result: 'rawMap' }, mapHref));
  f.appendChild(el('feComposite', { in: 'rawMap', in2: 'mapBg', operator: 'over', result: 'map' }));
  f.appendChild(el('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: g.blur, result: 'blurred' }));
  const S = g.strength * size;
  const chan = [
    ['1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0', 'dispR', 1],
    ['0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0', 'dispG', 1 - g.dispersion],
    ['0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0', 'dispB', 1 - 2 * g.dispersion],
  ];
  for (const [m, res, k] of chan) {
    f.appendChild(el('feDisplacementMap', { in: 'blurred', in2: 'map', scale: (S * k).toFixed(2), xChannelSelector: 'R', yChannelSelector: 'G' }));
    f.appendChild(el('feColorMatrix', { type: 'matrix', values: m, result: res }));
  }
  f.appendChild(el('feComposite', { in: 'dispR', in2: 'dispG', operator: 'arithmetic', k1: 0, k2: 1, k3: 1, k4: 0, result: 'dispRG' }));
  f.appendChild(el('feComposite', { in: 'dispRG', in2: 'dispB', operator: 'arithmetic', k1: 0, k2: 1, k3: 1, k4: 0, result: 'lensResult' }));
  f.appendChild(el('feColorMatrix', { in: 'map', type: 'matrix', values: '0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 1 0 -0.5019607843137255', result: 'specMask' }));
  // 高光增益跟随 glow:贴图里的 spec 遮罩会在 1.0 饱和(glow 大只扩面积),
  // glow > 1 时把合成增益一起抬高,高光才真的变亮
  f.appendChild(el('feComposite', { in: 'specMask', in2: 'lensResult', operator: 'arithmetic', k1: 0, k2: 0.5 * Math.max(1, g.glow), k3: 1, k4: 0, result: 'finalLens' }));
  const circ = 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '"><circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + size / 2 + '" fill="#fff"/></svg>');
  f.appendChild(el('feImage', { x: 0, y: 0, width: size, height: size, result: 'orbCircle' }, circ));
  f.appendChild(el('feComposite', { in: 'finalLens', in2: 'orbCircle', operator: 'in' }));
  ensureDefs().appendChild(f);
  const disps = Array.prototype.slice.call(f.querySelectorAll('feDisplacementMap'));
  return { id, node: f, disps, base: disps.map(e => +e.getAttribute('scale')) };
}

/* ── 工具 ── */
function fnv(s) { // 种子字符串 → 数字(FNV-1a)
  s = String(s);
  let t = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { t ^= s.charCodeAt(i); t = Math.imul(t, 0x1000193); }
  return t >>> 0;
}
const rgb = h => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
const ARCH = { spiral: 0, nebula: 1, core: 2, deep: 3, auto: -1 };
const merge = (base, over) => Object.assign({}, base, over || {});

const DEFAULTS = {
  size: 200,
  seed: 'orb',
  archetype: 'auto',
  background: '#ffffff',
  palette: { anchor: '#9a8cff', accents: ['#8b7bff', '#ff9ac4', '#ffd27f'] },
  galaxy: { speed: 0.8, spin: 0.22, starDensity: 1, aurora: 1, meteor: 1, colorful: 1 },
  // 当前默认:厚边宽高光 + 球缘折射扭曲。注意:折射带(depth)必须窄,
  // 位移才会在球内真正归零 —— 带一宽,色散会把每颗星拆成 RGB 彩屑洒满全球;
  // "整体放大 dome" 同理,开色散时建议保持 0
  // 原 x.ai 风格备份:strength .56 / depth .16 / softness 1 / dome 0 /
  //   dispersion .14 / glow .65 / glowSpread .95 / edge 1.02 / edgeWidth .09 / blur .15 / breath .05
  glass: {
    strength: 0.6, depth: 0.14, softness: 0.8, dome: 0, dispersion: 0.12,
    specAngle: 40, glow: 1.5, glowSpread: 0.95, edge: 1, edgeWidth: 0.3,
    blur: 0.3, breath: 0.06,
  },
};

/* ── 共享 rAF:所有球一个渲染循环 ── */
const instances = [];
let rafId = 0, lastT = 0;
function tick(now) {
  const dt = Math.min(0.1, (now - lastT) / 1000);
  lastT = now;
  const t = now / 1000;
  for (const o of instances) o._frame(t, dt);
  rafId = instances.length ? requestAnimationFrame(tick) : 0;
}
function startLoop() {
  if (!rafId && instances.length) { lastT = performance.now(); rafId = requestAnimationFrame(tick); }
}

/* ── 主入口 ── */
export function createGlassOrb(container, opts) {
  opts = opts || {};
  const size = opts.size || DEFAULTS.size;
  const galaxy = merge(DEFAULTS.galaxy, opts.galaxy);
  const glass = merge(DEFAULTS.glass, opts.glass);
  const palette = merge(DEFAULTS.palette, opts.palette);

  const canvas = document.createElement('canvas');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = canvas.height = Math.round(size * dpr);
  canvas.style.cssText = 'display:block;width:' + size + 'px;height:' + size +
    'px;clip-path:circle(50% at 50% 50%);will-change:filter';
  container.appendChild(canvas);

  let filter = buildGlassFilter(size, glass);
  canvas.style.filter = 'url(#' + filter.id + ')';
  canvas.style.webkitFilter = 'url(#' + filter.id + ')';

  const gl = canvas.getContext('webgl', { antialias: false, alpha: false });
  if (!gl) { canvas.remove(); filter.node.remove(); return null; }
  const sh = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error('[GlassOrb]', gl.getShaderInfoLog(s));
    return s;
  };

  const seed = fnv(opts.seed || DEFAULTS.seed);
  const state = {
    spin: ((seed % 6283) / 1000) * 3.7,
    audio: 0, audioTarget: 0,
    breathPhase: Math.random() * 6.28,
  };

  const U = {};
  function applyGalaxy(pal, gal, archName, bg) {
    gl.uniform3fv(U.uBg, rgb(bg));
    gl.uniform3fv(U.uAnchor, rgb(pal.anchor));
    gl.uniform3fv(U.uC0, rgb(pal.accents[0]));
    gl.uniform3fv(U.uC1, rgb(pal.accents[1]));
    gl.uniform3fv(U.uC2, rgb(pal.accents[2]));
    gl.uniform1f(U.uArch, ARCH[archName] !== undefined ? ARCH[archName] : -1);
    gl.uniform1f(U.uSpeed, gal.speed);
    gl.uniform1f(U.uStarDensity, gal.starDensity);
    gl.uniform1f(U.uAurora, gal.aurora);
    gl.uniform1f(U.uMeteor, gal.meteor);
    gl.uniform1f(U.uColorful, gal.colorful);
  }
  let cur = { palette, galaxy, archetype: opts.archetype || DEFAULTS.archetype, background: opts.background || DEFAULTS.background };

  // 一次性 GL 资源:program / buffer / uniform 位置 + 非每帧 uniform。
  // 上下文被 guardGL 让出再恢复时整体重建(uTime/uAudio/uSpin 每帧重传,不用管)
  function setupGL() {
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog); gl.useProgram(prog);
    // 全屏四边形;v 翻转让 -N.y 指向屏幕上方(极光挂上半球)
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 0, 1, 1, -1, 1, 1, -1, 1, 0, 0, 1, 1, 1, 0]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, 'aPos'), aUV = gl.getAttribLocation(prog, 'aUV');
    gl.enableVertexAttribArray(aPos); gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(aUV); gl.vertexAttribPointer(aUV, 2, gl.FLOAT, false, 16, 8);
    ['uRes', 'uBg', 'uAnchor', 'uC0', 'uC1', 'uC2', 'uTime', 'uPhase', 'uAudio', 'uSpin', 'uArch',
      'uSpeed', 'uStarDensity', 'uAurora', 'uMeteor', 'uColorful'].forEach(n => { U[n] = gl.getUniformLocation(prog, n); });
    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    gl.uniform1f(U.uPhase, (seed % 6283) / 1000);
    applyGalaxy(cur.palette, cur.galaxy, cur.archetype, cur.background);
  }
  setupGL();
  gl.viewport(0, 0, canvas.width, canvas.height);
  guardGL(canvas, gl, setupGL);

  const orb = {
    canvas,
    // 喂音量 0~1(内部做起音快、收音慢的包络平滑)
    setAudio(v) { state.audioTarget = Math.max(0, Math.min(1, v)); },
    // 运行时改星系层:orb.set({ palette, galaxy, archetype, background })
    set(o) {
      cur = {
        palette: merge(cur.palette, o.palette),
        galaxy: merge(cur.galaxy, o.galaxy),
        archetype: o.archetype || cur.archetype,
        background: o.background || cur.background,
      };
      applyGalaxy(cur.palette, cur.galaxy, cur.archetype, cur.background);
    },
    // 运行时改玻璃层:orb.setGlass({ depth: 0.3, dome: 0.2, ... })
    // 位移贴图和滤镜链会整体重建(毫秒级),适合拖滑杆实时调参
    setGlass(o) {
      Object.assign(glass, o);
      const next = buildGlassFilter(size, glass);
      filter.node.remove();
      filter = next;
      canvas.style.filter = 'url(#' + next.id + ')';
      canvas.style.webkitFilter = 'url(#' + next.id + ')';
    },
    destroy() {
      const i = instances.indexOf(orb);
      if (i >= 0) instances.splice(i, 1);
      canvas.remove(); filter.node.remove();
    },
    _frame(t, dt) {
      // 音量包络:起音快(0.11s)、收音慢(0.3s)
      const tau = state.audioTarget > state.audio ? 0.11 : 0.3;
      state.audio += (state.audioTarget - state.audio) * (1 - Math.exp(-dt / tau));
      state.spin += dt * (cur.galaxy.spin + 1.6 * state.audio); // 声音推着球加速转
      gl.uniform1f(U.uTime, t);
      gl.uniform1f(U.uAudio, state.audio);
      gl.uniform1f(U.uSpin, state.spin);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      // 透镜呼吸:位移 scale 缓慢波动
      if (glass.breath > 0)
        filter.disps.forEach((e, i) =>
          e.setAttribute('scale', (filter.base[i] * (1 - glass.breath * (0.7 + 0.5 * Math.sin(t * 0.7 + state.breathPhase)))).toFixed(2)));
    },
  };
  instances.push(orb);
  startLoop();
  return orb;
}
