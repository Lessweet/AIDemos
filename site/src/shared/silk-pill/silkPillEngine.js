/* 自 design-gallery 搬入(2026-08-22),带一处本站补丁:
   原实现 shader 里 t = uTime*uSpeed,运行时改 speed 会让相位瞬移(uTime 已很大,
   Δspeed × uTime = 画面跳变)。本站首页 Blog 圆球要做「hover 瞬间加速、5s 滑回」,
   speed 必须能平滑变 —— 改为 JS 侧按 speed 积分累加时间(state.t += dt*speed),
   uSpeed 恒传 1。除此以外与 gallery 原文件一致,同步上游时保住这个补丁。 */
/* =====================================================================
 * silk-pill.js — 丝绸胶囊组件(复刻自 Grok App 语音选择的 voice 胶囊)
 *
 * 官方实现是 iOS 原生 Metal,没有公开源码;但本复刻的运动核心 turb()
 * (黄金比例旋转矩阵 + 三层正弦折叠湍流)逐字来自 grok.com 网页端
 * AuroraShaderBackground 的线上 GLSL —— xAI 所有"流动质感"共用这套母题。
 * 在它之上是"极光"式着色(不是打光的布料):深彩底色(谷底=第一色,不发黑)
 * → 褶皱侧坡自发光成光帘(面越倾斜越亮,即天鹅绒/极光原理)
 * → 光帘颜色沿褶皱虹彩游走(C1↔C2,最亮芯发白)
 * → 表面锚定的闪粉颗粒随光帘流动、亮带里密集闪烁
 * → 圆角胶囊 SDF 裁形 + 暗角 + 贴边一线浅壳亮边。
 *
 * 用法:
 *   const pill = createSilkPill(container, {
 *     width: 340, height: 212,   // 胶囊尺寸 px
 *     seed: 'Ara',               // 种子:相位偏移,每个胶囊涌动不同步
 *     colors: ['#c2334d', '#7a1fa2', '#3b4fd8'],  // 三色 palette(暗→中→亮随意)
 *     grainColor: '#ffffff',     // 绒面斑驳/颗粒颜色(默认白)
 *     silk: {
 *       speed: 1,                //   涌动速度
 *       rotate: 0.08,            //   自转速度:褶皱场绕中心旋转(负值反转,0 = 不转)
 *       scale: 2.2,              //   褶皱大小(越大褶皱越碎)
 *       contrast: 1,             //   光帘宽窄(越大光帘越细锐)
 *       sheen: 1,                //   极光强度(光帘亮度)
 *       grain: 0.2,              //   闪粉密度
 *       drift: 0.12,             //   虹彩漂移速度(0 = 颜色静止)
 *       radius: 0.78,            //   圆角(× 半高,1 = 全圆头药丸)
 *     },
 *   });
 *
 *   pill.setAudio(0.7);          // 音量 0~1:涌动加剧、光泽变亮
 *   pill.set({ colors, silk }); // 运行时改参数(全部是 uniform,零重建)
 *   pill.canvas
 *   pill.destroy();
 * =================================================================== */

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
uniform float uTime, uPhase;
uniform vec3 uC0, uC1, uC2;
uniform float uSpeed, uRotate, uScale, uContrast, uSheen, uGrain, uDrift;
uniform float uRadius;
uniform vec3 uGrainCol;
uniform float uAudio;

// ── xAI 原厂湍流(逐字来自 grok.com AuroraShaderBackground)──
const float TURB_START = 2.58;
const float WAVE_SPEED = 0.3;
const float TURB_SPEED = 1.0;
const vec3  WAVE_VEC   = vec3(1.0, 4.0, 2.0);

const mat3 gold1 = mat3(
  vec3(-0.571464913, +0.814921382, +0.096597072),
  vec3(-0.278044873, -0.303026659, +0.911518454),
  vec3(+0.772087367, +0.494042493, +0.399753815)
);

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

// 双线性插值 value noise:斑驳结块的基础
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i), b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

vec3 turb(vec3 p, float time, float waveAmp, float turbIntensity) {
  float t = TURB_SPEED * time;
  t += waveAmp * cos(WAVE_SPEED * time - dot(p, WAVE_VEC));

  mat3 ori = mat3(1.0);
  vec3 w = vec3(0.0);

  ori = ori * gold1;
  float f1 = TURB_START;
  w += sin(ori * (w + p).zxy * f1 + t + vec3(f1, 6.0, t)) * ori / f1;

  ori = ori * gold1;
  float f2 = TURB_START + 1.0;
  w += sin(ori * (w + p).zxy * f2 + t + vec3(f2, 6.0, t)) * ori / f2;

  ori = ori * gold1;
  float f3 = TURB_START + 2.0;
  w += sin(ori * (w + p).zxy * f3 + t + vec3(f3, 6.0, t)) * ori / f3;

  return turbIntensity * w;
}

// 圆角矩形 SDF(radius 拉满即胶囊)
float sdRoundBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

// 布料高度场:大块拉长的软褶皱(云雾感,不要碎纹)
float field(vec2 q, float t) {
  vec3 w = turb(vec3(q, t * 0.16), t, 0.22 + 0.5 * uAudio, 0.34 + 0.2 * uAudio);
  float h = sin(q.x * 1.0 + w.x * 3.2) * 0.65
          + sin(q.y * 1.4 + w.y * 2.8 + 1.7) * 0.55
          + w.z * 2.2;
  return h;
}

void main() {
  float aspect = uRes.x / uRes.y;
  // p:以中心为原点,y 半高为 1
  vec2 p = (vUV * 2.0 - 1.0) * vec2(aspect, 1.0);
  float t = uTime * uSpeed + uPhase;

  // ── 胶囊裁形 ──
  vec2 half_ = vec2(aspect, 1.0) * 0.97;
  float r = uRadius * 0.97;
  float d = sdRoundBox(p, half_, r);
  float px = 2.0 / uRes.y; // 1 设备像素在 p 坐标里的大小
  float mask = smoothstep(px, -px, d);
  if (mask <= 0.0) { gl_FragColor = vec4(0.0); return; }

  // ── 高度场 + 数值梯度求法线 ──
  // 自转:褶皱场绕中心旋转,胶囊外形保持不动
  float ang = t * uRotate;
  float ca = cos(ang), sa = sin(ang);
  vec2 q = mat2(ca, -sa, sa, ca) * p * uScale;
  float e = 0.16;
  float h  = field(q, t);
  float hx = field(q + vec2(e, 0.0), t);
  float hy = field(q + vec2(0.0, e), t);
  vec3 N = normalize(vec3(-(hx - h) / e, -(hy - h) / e, 1.7 / uContrast));

  // ── 极光光帘:亮的不是"被照亮的面",而是褶皱的侧坡自己发光 ──
  // (天鹅绒/极光同一原理:面越倾斜越亮,平坦处沉入暗底 —— 光帘挂在褶皱边缘)
  float tilt = 1.0 - abs(N.z);
  float curtain = pow(smoothstep(0.0, 0.6, tilt), 1.5);
  // 方向偏置:朝左上的坡更亮,光帘有主次、不均匀
  vec2 nxy = N.xy / max(length(N.xy), 1e-4);
  float side = 0.5 + 0.5 * dot(nxy, normalize(vec2(0.3, 0.8)));
  float lum = curtain * (0.45 + 0.55 * side);
  // 大面积柔光:高处整体透亮(光幕是宽的,不是细丝)
  float airglow = smoothstep(-0.6, 1.3, h);

  // ── 底色:谷底就是第一色本身(实测原版最暗处 ≈ #253449/#5e2a49,不发黑),
  //    大面积铺到中间色 —— 整颗胶囊是透亮的彩色,极光叠在上面 ──
  float dr = t * uDrift;
  vec3 deep = mix(uC0, uC1, 0.12 + 0.06 * sin(dr));
  vec3 base = mix(deep, uC1, smoothstep(-1.5, 1.2, h) * 0.85);

  // ── 虹彩:光帘颜色沿褶皱在 C1↔C2 之间游走,最亮芯微微发白 ──
  vec3 w = turb(vec3(q, t * 0.16), t, 0.22 + 0.5 * uAudio, 0.34 + 0.2 * uAudio);
  float ir = 0.5 + 0.5 * sin(h * 1.1 + w.x * 2.0 + dr * 1.7);
  vec3 glowCol = mix(uC1, uC2, ir);
  glowCol = mix(glowCol, vec3(1.0), pow(lum, 2.5) * 0.45);
  vec3 col = base + glowCol * (lum * 1.25 + airglow * 0.3) * uSheen * (1.0 + 0.6 * uAudio);

  // ── 闪粉:表面锚定细颗粒,乘在颜色上 → 暗处稳、亮带里密集闪烁(粉状光感)──
  vec2 gp = (q + w.xy * 1.2) * (uRes.y * 0.5 / uScale);
  float s1 = hash(floor(gp));
  float tw = 0.5 + 0.5 * sin(t * 2.5 + s1 * 61.0);   // 每颗微闪
  float spark = s1 * s1 * (0.6 + 0.4 * tw);
  // 亮带里闪得凶,谷底保持平滑的深色(原版暗部几乎没颗粒)
  float sparkAmp = 0.3 + 0.7 * min(1.0, lum + airglow * 0.5);
  col *= 1.0 + (spark - 0.3) * sparkAmp * uGrain * 3.5;
  col += uGrainCol * spark * pow(lum, 2.0) * uGrain * 2.0;  // 热区闪白
  // 极轻的屏幕空间底噪,防色带
  float g = hash(vUV * uRes + fract(t * vec2(9.0, 7.0)));
  col += (g - 0.5) * 0.035;

  gl_FragColor = vec4(col * mask, mask); // 预乘 alpha,可叠在任何页面底色上
}`;

function fnv(s) {
  s = String(s);
  let t = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { t ^= s.charCodeAt(i); t = Math.imul(t, 0x1000193); }
  return t >>> 0;
}
const rgb = h => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
const merge = (base, over) => Object.assign({}, base, over || {});

const DEFAULTS = {
  width: 340, height: 212,
  seed: 'silk',
  colors: ['#c2334d', '#7a1fa2', '#3b4fd8'],
  grainColor: '#ffffff',
  silk: { speed: 0.5, rotate: -0.52, scale: 0.6, contrast: 1, sheen: 1.35, grain: 0.2, drift: 0.31, radius: 1 },
};

const instances = [];
let rafId = 0, lastT = 0;
function tick(now) {
  const dt = Math.min(0.1, (now - lastT) / 1000);
  lastT = now;
  for (const o of instances) o._frame(now / 1000, dt);
  rafId = instances.length ? requestAnimationFrame(tick) : 0;
}
function startLoop() {
  if (!rafId && instances.length) { lastT = performance.now(); rafId = requestAnimationFrame(tick); }
}

// 全部胶囊共用一个隐藏 WebGL 画布(页面 WebGL 上下文有限,逐颗独占会把别的区块挤掉):
// 每帧按各颗参数画到共享画布,再 drawImage 拷进它自己的 2D 画布
let R = null;
function sharedRenderer() {
  if (R) return R;
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: true });
  if (!gl) return null;
  const sh = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error('[SilkPill]', gl.getShaderInfoLog(s));
    return s;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog); gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 0, 0, 1, -1, 1, 0, -1, 1, 0, 1, 1, 1, 1, 1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'aPos'), aUV = gl.getAttribLocation(prog, 'aUV');
  gl.enableVertexAttribArray(aPos); gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 16, 0);
  gl.enableVertexAttribArray(aUV); gl.vertexAttribPointer(aUV, 2, gl.FLOAT, false, 16, 8);
  const U = {};
  ['uRes', 'uTime', 'uPhase', 'uC0', 'uC1', 'uC2', 'uSpeed', 'uRotate', 'uScale', 'uContrast',
    'uSheen', 'uGrain', 'uDrift', 'uRadius', 'uGrainCol', 'uAudio'].forEach(n => { U[n] = gl.getUniformLocation(prog, n); });
  R = { canvas, gl, U };
  return R;
}

export function createSilkPill(container, opts) {
  opts = opts || {};
  const width = opts.width || DEFAULTS.width;
  const height = opts.height || DEFAULTS.height;
  const silk = merge(DEFAULTS.silk, opts.silk);
  let colors = (opts.colors || DEFAULTS.colors).slice();
  let grainColor = opts.grainColor || DEFAULTS.grainColor;
  const phase = (fnv(opts.seed || DEFAULTS.seed) % 6283) / 100;

  if (!sharedRenderer()) return null;
  const canvas = document.createElement('canvas');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  // fluid:画布跟着容器走(封面卡用),尺寸由外部 resize() 驱动;否则固定 px
  canvas.style.cssText = opts.fluid
    ? 'display:block;width:100%;height:100%'
    : 'display:block;width:' + width + 'px;height:' + height + 'px';
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  const state = { audio: 0, audioTarget: 0, t: 0 };   // t:按 speed 积分的自有时钟(见文件头补丁注释)
  const pill = {
    canvas,
    setAudio(v) { state.audioTarget = Math.max(0, Math.min(1, v)); },
    // 外部尺寸变化时重设后备画布分辨率(CSS 尺寸由布局决定)
    resize(w, h) {
      const cw = Math.max(1, Math.round(w * dpr));
      const ch = Math.max(1, Math.round(h * dpr));
      if (cw === canvas.width && ch === canvas.height) return;
      canvas.width = cw;
      canvas.height = ch;
    },
    // 运行时改任意参数:pill.set({ colors: [...], silk: { drift: 0.3 } })
    set(o) {
      o = o || {};
      if (o.colors) colors = o.colors.slice();
      if (o.grainColor) grainColor = o.grainColor;
      if (o.silk) Object.assign(silk, o.silk);
    },
    destroy() {
      const i = instances.indexOf(pill);
      if (i >= 0) instances.splice(i, 1);
      canvas.remove();
    },
    _frame(t, dt) {
      const tau = state.audioTarget > state.audio ? 0.11 : 0.3;
      state.audio += (state.audioTarget - state.audio) * (1 - Math.exp(-dt / tau));
      const { canvas: mc, gl, U } = R;
      if (mc.width !== canvas.width || mc.height !== canvas.height) {
        mc.width = canvas.width; mc.height = canvas.height;
      }
      gl.viewport(0, 0, mc.width, mc.height);
      gl.uniform2f(U.uRes, mc.width, mc.height);
      gl.uniform1f(U.uPhase, phase);
      gl.uniform3fv(U.uC0, rgb(colors[0]));
      gl.uniform3fv(U.uC1, rgb(colors[1]));
      gl.uniform3fv(U.uC2, rgb(colors[2] || colors[1]));
      gl.uniform1f(U.uSpeed, 1);   // 速度不再走乘法,见文件头补丁注释
      gl.uniform1f(U.uRotate, silk.rotate);
      gl.uniform1f(U.uScale, silk.scale);
      gl.uniform1f(U.uContrast, silk.contrast);
      gl.uniform1f(U.uSheen, silk.sheen);
      gl.uniform1f(U.uGrain, silk.grain);
      gl.uniform1f(U.uDrift, silk.drift);
      gl.uniform1f(U.uRadius, silk.radius);
      gl.uniform3fv(U.uGrainCol, rgb(grainColor));
      state.t += dt * silk.speed;
      gl.uniform1f(U.uTime, state.t);
      gl.uniform1f(U.uAudio, state.audio);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(mc, 0, 0);
    },
  };
  instances.push(pill);
  startLoop();
  return pill;
}
