/**
 * 首页模态开合回归 —— 移动端仿真 + 4x CPU 节流:展开(封面挂载/播放)、
 * 收起(帧率 / 罩布 / 标题落位 / 首页元素淡入时点)、再展开(封面恢复)。
 * 用法:node site/scripts/verify-home-modal.mjs
 */
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const DOCS = join(ROOT, 'docs');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.json': 'application/json' };
const server = createServer((req, res) => {
  const p = decodeURIComponent((req.url || '/').split('?')[0]);
  const f = join(DOCS, p === '/' ? 'index.html' : p);
  if (!existsSync(f) || !statSync(f).isFile()) return void res.writeHead(404).end();
  res.writeHead(200, { 'content-type': MIME[extname(f)] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: false,
  args: ['--window-size=500,960', '--disable-background-timer-throttling', '--no-first-run'],
});
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
const cdp = await page.createCDPSession();
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle2', timeout: 60000 });
await new Promise((r) => setTimeout(r, 8000));

const openArchive = async () => {
  for (const r of await page.$$('.home-index-row')) {
    if ((await r.evaluate((el) => el.textContent))?.includes('Archive')) { await r.tap(); break; }
  }
  await new Promise((r) => setTimeout(r, 3500));
};
await openArchive();
const opened1 = await page.evaluate(() => ({
  iframes: document.querySelectorAll('.home-modal-active iframe').length,
}));
console.log(`第一次展开:模态内 iframe ${opened1.iframes} 个`);

/* 收起:采样帧率 + shed + 标题 + Contact 行淡入时机 */
await page.evaluate(() => {
  const w = window;
  w.__t0 = performance.now();
  w.__frames = 0;
  w.__trace = [];
  const contact = [...document.querySelectorAll('.home-index-row')].find((r) => r.textContent.includes('Contact'));
  const tick = () => {
    w.__frames++;
    const tr = document.querySelector('.home-modal-active .page-title-row');
    w.__trace.push([
      Math.round(performance.now() - w.__t0),
      tr ? Math.round(tr.getBoundingClientRect().top) : null,
      document.querySelectorAll('.home-modal-active iframe').length,
      contact ? +getComputedStyle(contact).opacity.slice(0, 4) : null,
    ]);
    if (performance.now() - w.__t0 < 2400) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});
const collapse = await page.$('.home-modal-active .page-collapse');
await collapse.tap();
await new Promise((r) => setTimeout(r, 3000));
const res1 = await page.evaluate(() => {
  const w = window;
  const t = w.__trace;
  const shedAt = t.find((x) => x[2] === 0)?.[0] ?? -1;
  const landAt = t.filter((x) => x[1] !== null).pop()?.[0] ?? -1;
  /* 淡入起点 = 一段 0 之后第一次抬升(收起前的常态 1 不算) */
  let fadeStart = -1;
  let sawZero = false;
  for (const x of t) {
    if (x[3] === null) continue;
    if (x[3] < 0.01) sawZero = true;
    else if (sawZero && x[3] > 0.02) { fadeStart = x[0]; break; }
  }
  return { fps: Math.round((w.__frames / 2400) * 1000), shedAt, landAt, fadeStart };
});
console.log(
  `收起(CPU 4x):帧率 ${res1.fps}fps;iframe 清空@${res1.shedAt}ms;标题落位@约${res1.landAt}ms;Contact 行开始淡入@${res1.fadeStart}ms(应晚于落位)`,
);

/* 再次展开:封面应恢复(eager 重挂 + 激活) */
await openArchive();
const opened2 = await page.evaluate(() => ({
  iframes: document.querySelectorAll('.home-modal-active iframe').length,
  playing: [...document.querySelectorAll('.home-modal-active iframe')].some(
    (f) => f.contentWindow && f.contentWindow.performance.now() > 0,
  ),
}));
console.log(`第二次展开:模态内 iframe ${opened2.iframes} 个,有封面在播=${opened2.playing}`);
console.log('pageerror:', errors.length ? errors : '无');
await browser.close();
server.close();
