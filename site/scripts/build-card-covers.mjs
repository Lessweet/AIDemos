/**
 * Blog 卡片封面压缩 —— 从每篇的 listCover 压出 1200px 宽的 webp,输出到
 * docs/writing/assets/cards/<slug>.webp,供 articles.ts 的 cardCover 引用。
 *
 * 为什么需要:listCover 是设计原图(最大 6MB、3240px 宽),它原本只喂阅读器左栏
 * 那个小缩略图,没人在意体积。2026-07-28 把 Blog 卡片封面改成静态图后直接复用了它,
 * 于是 Blog 首屏要拉 30MB —— 用户报「封面加载不出来」。卡片实际只显示 382px 宽,
 * 3x 屏也只要 1146px,1200/q85 足够且几乎看不出差别(29.8MB → 540KB)。
 *
 * 目录名不能以下划线开头:GitHub Pages 的 Jekyll 会跳过 _ 开头的目录,
 * 图片会 404(2026-07-28 上线后实测)。
 *
 * 用法:node site/scripts/build-card-covers.mjs
 * 依赖:cwebp(brew install webp)
 * 新增文章、或换了 listCover 之后重跑一次,再把 cardCover 写进 articles.ts。
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const OUT_DIR = join(ROOT, 'docs/writing/assets/cards');
const WIDTH = 1200;
const QUALITY = 85;

const src = readFileSync(join(ROOT, 'site/src/content/articles.ts'), 'utf8');
const blocks = src.split(/\n {2}\{\n/).slice(1);

const jobs = [];
for (const b of blocks) {
  if (!b.includes('inBlogGrid: true')) continue;
  const slug = b.match(/slug: '([^']+)'/)?.[1];
  const cover = b.match(/listCover: '([^']+)'/)?.[1];
  if (!slug || !cover) continue;
  const from = join(ROOT, 'docs/writing', cover);
  if (existsSync(from)) jobs.push({ slug, from });
  else console.warn(`  跳过 ${slug}:找不到 ${cover}`);
}

if (!jobs.length) {
  console.error('没有找到任何 inBlogGrid 文章的 listCover');
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });
let before = 0;
let after = 0;
for (const { slug, from } of jobs) {
  const to = join(OUT_DIR, `${slug}.webp`);
  execFileSync('cwebp', ['-quiet', '-q', String(QUALITY), '-resize', String(WIDTH), '0', from, '-o', to]);
  const b = statSync(from).size;
  const a = statSync(to).size;
  before += b;
  after += a;
  console.log(`  ${(b / 1024).toFixed(0).padStart(7)} KB -> ${(a / 1024).toFixed(0).padStart(6)} KB   ${slug}`);
}
console.log(
  `\n  合计 ${(before / 1024 / 1024).toFixed(1)} MB -> ${(after / 1024).toFixed(0)} KB` +
    `(${WIDTH}px / q${QUALITY})`,
);
