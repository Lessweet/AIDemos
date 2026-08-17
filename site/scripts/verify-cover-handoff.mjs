/**
 * 封面交接验收 —— 量化「hover 瞬间会不会跳」。
 *
 * 交接瞬间用户看到的是两张画面的替换:海报 <img>(按卡片尺寸缩放)⇄ iframe 的
 * 冻结首帧。这脚本把两者分别按卡片真实显示尺寸渲染、截图,算 SSIM:
 *   ≥0.99 逐像素级一致(缩放抗锯齿的亚像素差),交接不可见;
 *   0.97~0.99 有可感知风险,人工过目;
 *   <0.97 有问题,查。
 * 另做一遍 hover 冒烟:真实鼠标悬停 → 等交接完成 → 确认动画在走。
 *
 * 用法:node site/scripts/verify-cover-handoff.mjs
 * 依赖:puppeteer-core + 系统 Chrome + ffmpeg(算 SSIM)
 */
import { spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const DOCS = join(ROOT, 'docs');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

/* Blog iframe 封面(与 build-cover-posters 同源解析) */
const src = readFileSync(join(ROOT, 'site/src/content/articles.ts'), 'utf8');
const blogCovers = [];
for (const b of src.split(/\n {2}\{\n/).slice(1)) {
  const slug = b.match(/slug: '([^']+)'/)?.[1];
  const cover = b.match(/blogCover: \{ type: 'iframe', src: '([^']+)'/)?.[1];
  if (slug && cover) blogCovers.push({ name: slug, url: cover, poster: `writing/assets/posters/${slug}.webp`, w: 382, h: 215 });
}
/* 与 build-cover-posters.mjs 的 archiveJobs 保持同步(尺寸 = 3 列布局实测;
   design-banner 已随 VIBEDESIGN 卡下架,2026-08-17) */
const archiveCovers = [
  { name: 'preview-outlined', url: 'icon-studio/preview-outlined.html', poster: 'posters/preview-outlined.webp', w: 402, h: 402 },
  { name: 'preview-pixel', url: 'icon-studio/preview-pixel.html', poster: 'posters/preview-pixel.webp', w: 402, h: 402 },
  { name: 'poster-stack', url: 'poster-stack.html', poster: 'posters/poster-stack.webp', w: 402, h: 402 },
  { name: 'ai-assistant-motion', url: 'ai-assistant-motion/index.html', poster: 'posters/ai-assistant-motion.webp', w: 402, h: 402 },
  { name: 'multi-scene-character-demo', url: 'multi-scene-character-demo/multi-scene-character-demo.html', poster: 'posters/multi-scene-character-demo.webp', w: 167, h: 362 },
  { name: 'voice-particles', url: 'voice-particles/index.html', poster: 'posters/voice-particles.webp', w: 186, h: 402 },
];

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.json': 'application/json', '.woff2': 'font/woff2' };
const server = createServer((req, res) => {
  const u = new URL(req.url || '/', 'http://x');
  /* 海报渲染测试页:与卡片同尺寸、object-fit: cover,与线上显示逐像素同构 */
  if (u.pathname === '/__poster') {
    const s = u.searchParams.get('src');
    const w = u.searchParams.get('w');
    const h = u.searchParams.get('h');
    res.writeHead(200, { 'content-type': 'text/html' });
    return void res.end(
      `<body style="margin:0"><img src="/${s}" style="width:${w}px;height:${h}px;object-fit:cover;display:block"></body>`,
    );
  }
  const path = decodeURIComponent(u.pathname);
  const file = join(DOCS, path === '/' ? 'index.html' : path);
  if (!file.startsWith(DOCS) || !existsSync(file) || !statSync(file).isFile()) return void res.writeHead(404).end();
  res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;
const base = `http://127.0.0.1:${PORT}`;

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: false,
  args: ['--window-size=1380,900', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--hide-crash-restore-bubble', '--no-first-run', '--autoplay-policy=no-user-gesture-required'],
});

/* ffmpeg 把 SSIM 统计写到 stderr */
const ssimScore = (a, b) => {
  const r = spawnSync('ffmpeg', ['-i', a, '-i', b, '-lavfi', 'ssim', '-f', 'null', '-'], { encoding: 'utf8' });
  const m = (r.stderr || '').match(/All:([\d.]+)/);
  return m ? parseFloat(m[1]) : NaN;
};

try {
  const page = await browser.newPage();
  console.log('== 交接同帧性(海报 vs 冻结帧,SSIM)==');
  for (const { name, url, poster, w, h } of [...blogCovers, ...archiveCovers]) {
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 2 });
    /* 冻结帧 */
    await page.goto(`${base}/${url.split('?')[0]}#frozen`, { waitUntil: 'load', timeout: 30000 });
    await page.waitForFunction(() => window.__coverReady === true, { timeout: 20000 });
    const fFrozen = join(tmpdir(), `vf-${name}-frozen.png`);
    await page.screenshot({ path: fFrozen });
    /* 海报按同尺寸渲染(object-fit: cover 同卡片) */
    await page.goto(`${base}/__poster?src=${encodeURIComponent(poster)}&w=${w}&h=${h}`, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.waitForFunction(() => { const i = document.querySelector('img'); return i && i.complete && i.naturalWidth > 0; }, { timeout: 15000 });
    const fPoster = join(tmpdir(), `vf-${name}-poster.png`);
    await page.screenshot({ path: fPoster });
    const s = ssimScore(fFrozen, fPoster);
    const flag = s >= 0.99 ? 'OK ' : s >= 0.97 ? '⚠︎  ' : '✗  ';
    console.log(`  ${flag} ${s.toFixed(4)}  ${name}`);
  }

  /* ── hover 冒烟:Blog 页真实悬停三张卡,确认交接完成且动画在走 ── */
  console.log('\n== Blog hover 冒烟 ==');
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
  await page.goto(`${base}/blog.html`, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 2500)); // 入场动画
  for (const slug of ['sparkle', 'long-chat-navigation-design', 'claude-code-verification-loops']) {
    const sel = `.card-wrapper[data-slug="${slug}"] .writing-card`;
    const el = await page.$(sel);
    if (!el) { console.log(`  ✗ 找不到卡片 ${slug}`); continue; }
    await el.scrollIntoView();
    /* 入场动画会让卡片继续位移一阵:等它落定再 hover,否则卡片从光标下滑走,
       实际收到的是 mouseleave(上一轮验收正是这么翻车的) */
    await new Promise((r) => setTimeout(r, 1500));
    await el.hover();
    try {
      await page.waitForFunction(
        (s) => {
          const w = document.querySelector(s);
          return w && w.querySelector('iframe') && !w.querySelector('img[src*="posters/"]');
        },
        { timeout: 15000 },
        sel,
      );
    } catch {
      console.log(`  ✗ ${slug}:交接超时(iframe 未就绪或海报未撤)`);
      continue;
    }
    /* 交接完成后再 hover 一次:若交接期间卡片位移把光标甩出去过,这里补一次激活 */
    await el.hover();
    await new Promise((rr) => setTimeout(rr, 300));
    /* 动画在走:以 iframe 内部虚拟时钟为准(慢速漂移的封面 600ms 内像素变化
       可能低于 SSIM 四位小数的分辨力,上一版按像素判定误报) */
    const probe = () =>
      page.evaluate(
        (s) => document.querySelector(s + ' iframe')?.contentWindow?.performance.now(),
        sel,
      );
    const t1 = await probe();
    await new Promise((rr) => setTimeout(rr, 500));
    const t2 = await probe();
    const running = typeof t1 === 'number' && typeof t2 === 'number' && t2 > t1;
    console.log(`  ${running ? 'OK ' : '✗  '} ${slug}:交接完成,时钟 ${Math.round(t1)} → ${Math.round(t2)}(在走 = 在动)`);
  }

  /* ── Archive 视频冒烟:hover 播放 / 离开暂停 ── */
  console.log('\n== Archive 视频 hover 冒烟 ==');
  await page.goto(`${base}/archive.html`, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 2500));
  const vSel = 'video.card-video';
  const v = await page.$(vSel);
  if (v) {
    await v.scrollIntoView();
    await new Promise((r) => setTimeout(r, 800));
    await v.hover();
    await new Promise((r) => setTimeout(r, 1200));
    const playing = await page.$eval(vSel, (el) => !el.paused);
    await page.mouse.move(10, 10);
    await new Promise((r) => setTimeout(r, 400));
    const pausedAfter = await page.$eval(vSel, (el) => el.paused);
    console.log(`  ${playing ? 'OK' : '✗'} hover 播放;${pausedAfter ? 'OK' : '✗'} 移开暂停`);
  } else console.log('  ✗ 找不到视频卡');

  /* ── 触屏(模拟 iPhone):视口居中才播 ── */
  console.log('\n== 触屏居中播放冒烟 ==');
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto(`${base}/archive.html`, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 2500));
  const centered = await page.evaluate(async () => {
    const v = document.querySelector('video.card-video');
    if (!v) return { err: 'no video' };
    v.scrollIntoView({ block: 'center' });
    await new Promise((r) => setTimeout(r, 1500));
    const centerPlaying = !v.paused;
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 1000));
    return { centerPlaying, topPaused: v.paused };
  });
  console.log(`  ${centered.centerPlaying ? 'OK' : '✗'} 居中播放;${centered.topPaused ? 'OK' : '✗'} 离开暂停${centered.err ? ' ' + centered.err : ''}`);
} finally {
  await browser.close();
  server.close();
}
