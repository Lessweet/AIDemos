/**
 * 封面首帧海报 —— 给每个动态封面(iframe cover.html / 视频)截「t=0 冻结帧」,
 * 输出 docs/writing/assets/posters/<name>.webp,Blog/Archive 卡片默认显示它,
 * hover 才挂真封面(见 cover-shim.js 的交接协议)。
 *
 * 为什么必须是「冻结帧」而不是随手截图:hover 挂载的 iframe 以 #frozen 启动,
 * 渲染的第一帧就是虚拟时钟 0 的画面 —— 海报也截同一帧,交接才逐像素无跳变。
 *
 * 为什么用带界面的 Chrome(会闪一个窗口):headless 的 WebGL 走 SwiftShader
 * 软渲染,shader 噪点的浮点精度与真 GPU 不同,截出的纹理和用户浏览器里
 * 渲染的对不上。headed + 禁节流参数,渲染路径与真实浏览器一致。
 *
 * 目录名不能以下划线开头:GitHub Pages 的 Jekyll 会跳过 _ 开头的目录(2026-07-28 实测)。
 *
 * 用法:node site/scripts/build-cover-posters.mjs
 * 依赖:puppeteer-core(npm 装过)+ 系统 Chrome + cwebp + ffmpeg
 * 新增文章配了 blogCover 后重跑一次。
 */
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const DOCS = join(ROOT, 'docs');
const OUT_DIR = join(DOCS, 'writing/assets/posters');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const QUALITY = 95;

/* Blog 卡片 16:9(writing.css .writing-card aspect-ratio)。
   按 1280 视口下卡片的真实显示尺寸(382×215)截:海报与 hover 挂载的 iframe
   同布局渲染,噪点/细线纹理对得上 —— 1200 宽截完再缩显会让高频纹理重采样,
   SSIM 从 0.99 掉到 0.7(2026-08-17 实测)。
   双密度出两份,<img srcset> 按设备 DPR 选(2026-08-17,手机端也走动态封面后):
     <slug>.webp     dpr2 q90 —— 桌面 2x 屏,与冻结帧同分辨率;q95 在噪点图上
                     体积翻倍,而压缩残差是均匀噪点级、被交接的 120ms 溶解盖住;
     <slug>@3x.webp  dpr3 q85 —— 3x 手机上海报是滚动中的常驻画面,清晰度优先。 */
const BLOG_W = 382;
const BLOG_H = 215;
const BLOG_DENSITIES = [
  { dpr: 2, q: 90, suffix: '' },
  { dpr: 3, q: 85, suffix: '@3x' },
];

/* ---- 任务清单:Blog 的 iframe 封面从 articles.ts 读,Archive 的手写 ---- */
const src = readFileSync(join(ROOT, 'site/src/content/articles.ts'), 'utf8');
const jobs = [];
for (const b of src.split(/\n {2}\{\n/).slice(1)) {
  const slug = b.match(/slug: '([^']+)'/)?.[1];
  const cover = b.match(/blogCover: \{ type: 'iframe', src: '([^']+)'/)?.[1];
  if (!slug || !cover) continue;
  if (!existsSync(join(DOCS, cover.split('?')[0]))) {
    console.warn(`  跳过 ${slug}:找不到 ${cover}`);
    continue;
  }
  jobs.push({ name: slug, url: cover, w: BLOG_W, h: BLOG_H });
}

/* Archive 页的 iframe 封面。Blog 封面是 16:9 定比例、内部 scale-to-fit,
   截 1200 宽即可;这些 demo 页不保证 scale-to-fit,所以按 1280 视口下卡片的
   CSS 显示尺寸(2026-08-16 实测)+ dpr 放大截,布局与线上逐像素同构。
   改版式后重量一次(devtools 读 iframe 的 getBoundingClientRect)。 */
const ARCHIVE_OUT = join(DOCS, 'posters');
/* 尺寸 = 1280 视口、3 列布局(2026-08-17 与 Blog 同规则:3 → ≤900 两列 → ≤560 单列)
   下卡片的实测显示尺寸;design-banner 已随 VIBEDESIGN 卡下架(2026-08-17) */
const archiveJobs = [
  { name: 'preview-outlined', url: 'icon-studio/preview-outlined.html', w: 402, h: 402, dpr: 3 },
  { name: 'preview-pixel', url: 'icon-studio/preview-pixel.html', w: 402, h: 402, dpr: 3 },
  /* poster-stack 页面底透明,海报抠通道露出宿主卡的主题底色 */
  { name: 'poster-stack', url: 'poster-stack.html', w: 402, h: 402, dpr: 3, transparent: true },
  { name: 'ai-assistant-motion', url: 'ai-assistant-motion/index.html', w: 402, h: 402, dpr: 3 },
  {
    name: 'multi-scene-character-demo',
    url: 'multi-scene-character-demo/multi-scene-character-demo.html',
    w: 167,
    h: 362,
    dpr: 3,
  },
  { name: 'voice-particles', url: 'voice-particles/index.html', w: 186, h: 402, dpr: 3 },
];

/* 视频封面:直接抽第一帧,天然与播放起点同帧,不用走浏览器 */
const videoJobs = [
  { name: 'figma-shader-motion', file: 'writing/assets/figma-shader-motion/cover_anim.mp4' },
];
/* Archive 的 10 路作品视频(位于 docs/ 根,见 build-archive-videos.mjs) */
const archiveVideoJobs = [
  'voicer_compressed',
  'voicer_card_compressed',
  'voicer_search_bar_compressed',
  'voicer_loading_compressed',
  'Metal_compressed',
  '3DCardGlass_compressed',
  '3DSphere-particle_compressed',
  '3DBallsIPhone_compressed',
  '3DSphere_compressed',
  '3DCards_compressed',
].map((n) => ({ name: n, file: `${n}.mp4`, out: ARCHIVE_OUT }));

if (!jobs.length && !videoJobs.length) {
  console.error('没有找到任何动态封面');
  process.exit(1);
}
mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(ARCHIVE_OUT, { recursive: true });

/* ---- docs/ 静态服务器:封面里相对路径的图片/字体要能取到 ---- */
const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
};
const server = createServer((req, res) => {
  const path = decodeURIComponent((req.url || '/').split('?')[0]);
  const file = join(DOCS, path);
  if (!file.startsWith(DOCS) || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: false,
  args: [
    '--window-size=1320,820',
    /* 窗口被遮挡/失焦时 rAF 会被 macOS Chrome 节流,冻结帧就画不出来 */
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows',
    '--hide-crash-restore-bubble',
    '--no-first-run',
  ],
});

let total = 0;
try {
  const page = await browser.newPage();
  /* 每份密度独立整页加载:冻结渲染完全确定(两次加载 SSIM=1.000000,2026-08-17
     实测),重开一次比在冻结态里改 viewport 稳 —— resize 重画是 rAF 驱动的,
     冻结时被排队,画布会留在旧尺寸上。 */
  const all = [
    ...jobs.flatMap((j) =>
      BLOG_DENSITIES.map(({ dpr, q, suffix }) => ({ ...j, name: `${j.name}${suffix}`, dpr, q, dir: OUT_DIR })),
    ),
    ...archiveJobs.map((j) => ({ ...j, q: QUALITY, dir: ARCHIVE_OUT })),
  ];
  for (const { name, url, w, h, dpr, q, dir, transparent } of all) {
    await page.setViewport({ width: w, height: h, deviceScaleFactor: dpr });
    await page.goto(`http://127.0.0.1:${PORT}/${url.split('?')[0]}#frozen`, {
      waitUntil: 'load',
      timeout: 30000,
    });
    /* cover-shim:load + 字体 + 沉降期 + 两帧 rAF 后置位,此刻屏上就是冻结帧 */
    await page.waitForFunction(() => window.__coverReady === true, { timeout: 20000 });
    const png = join(tmpdir(), `poster-${name}.png`);
    await page.screenshot({ path: png, omitBackground: !!transparent });
    const out = join(dir, `${name}.webp`);
    execFileSync('cwebp', ['-quiet', '-q', String(q), '-sharp_yuv', png, '-o', out]);
    const kb = statSync(out).size / 1024;
    total += kb;
    console.log(`  ${kb.toFixed(0).padStart(5)} KB  ${name}`);
  }
} finally {
  await browser.close();
  server.close();
}

for (const { name, file, out: dir = OUT_DIR } of [...videoJobs, ...archiveVideoJobs]) {
  const mp4 = join(DOCS, file);
  if (!existsSync(mp4)) {
    console.warn(`  跳过 ${name}:找不到 ${file}`);
    continue;
  }
  const png = join(tmpdir(), `poster-${name}.png`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', mp4, '-frames:v', '1', png]);
  const out = join(dir, `${name}.webp`);
  execFileSync('cwebp', ['-quiet', '-q', String(QUALITY), '-sharp_yuv', png, '-o', out]);
  const kb = statSync(out).size / 1024;
  total += kb;
  console.log(`  ${kb.toFixed(0).padStart(5)} KB  ${name}(视频首帧)`);
}

console.log(`\n  合计 ${total.toFixed(0)} KB → docs/writing/assets/posters/`);
