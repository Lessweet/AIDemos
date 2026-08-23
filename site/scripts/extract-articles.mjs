/**
 * 文章提取生成器 —— 从 docs/writing/article-*.html(手写原版)提取:
 *   1. .article-reading 的 innerHTML → site/src/content/fragments/<slug>.reading.html
 *      (与旧版 switchArticle 交换的单元完全一致,含 eyebrow/h1/byline/封面/正文含内联 <style>/页脚)
 *   2. <title> / body data-accent / data-tint → site/src/content/articleShell.ts
 *      (data-tint 缺失时按旧版 initPageTint 的 slug 哈希预计算,结果与运行时一致)
 *   3. site/writing/article-<slug>.html 入口 × 13(外壳模板 + 每篇的 title/accent/tint)
 *
 * 一次性迁移工具,重跑安全(幂等覆盖)。以后新文章:手写 fragment + articleShell + 入口,
 * 或往 docs/writing/ 放一篇旧格式 HTML 再跑本脚本。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = path.join(ROOT, 'docs/writing');
const FRAG_DIR = path.join(ROOT, 'site/src/content/fragments');
const ENTRY_DIR = path.join(ROOT, 'site/writing');

/* slug 清单不再手写,从实际文件推导:docs/writing/ 的整页 ∪ 已提取的 fragment。
   取并集是因为草稿(如 voices)的 docs 页面被 .gitignore 挡住不进仓库,
   CI 的 checkout 里只有 fragment —— 只扫 docs/ 会把它整个丢掉(2026-08-09 实测)。 */
const FRAG_DIR_EARLY = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/content/fragments');
const SLUGS = [
  ...new Set([
    ...fs
      .readdirSync(SRC)
      .filter((f) => /^article-[\w-]+\.html$/.test(f))
      .map((f) => f.slice('article-'.length, -'.html'.length)),
    ...fs
      .readdirSync(FRAG_DIR_EARLY)
      .filter((f) => /^[\w-]+\.reading\.html$/.test(f))
      .map((f) => f.slice(0, -'.reading.html'.length)),
  ]),
].sort();

/* 旧版 writing.js initPageTint 的稳定哈希(输入 = 'article-<slug>',与 pathname 推导一致) */
function autoTint(fileSlug) {
  const SOLIDS = ['violet', 'blue', 'mint', 'peach', 'rose', 'sand'];
  let hash = 0;
  for (let i = 0; i < fileSlug.length; i++) hash = (hash * 31 + fileSlug.charCodeAt(i)) >>> 0;
  return SOLIDS[hash % SOLIDS.length];
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

fs.mkdirSync(FRAG_DIR, { recursive: true });
fs.mkdirSync(ENTRY_DIR, { recursive: true });

const shellMeta = {};
const report = [];

for (const slug of SLUGS) {
  const file = path.join(SRC, `article-${slug}.html`);
  /* 草稿的 docs 页面被 .gitignore 挡在仓库外,CI 里不存在 —— 当作已迁移走复用分支 */
  const html = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';

  /* 已迁移的文章:docs/ 里这篇早被 build 的 React 外壳覆盖(不再含 .article-reading),
     原稿只剩上次提取出来的 fragment。复用它 + 入口里的 title/accent/tint,不重新提取。
     所以本脚本可以随时重跑:只有新放进 docs/writing/ 的旧格式整页才会被提取。 */
  if (!html.includes('<article class="article-reading">')) {
    const fragFile = path.join(FRAG_DIR, `${slug}.reading.html`);
    const entryFile = path.join(ENTRY_DIR, `article-${slug}.html`);
    if (!fs.existsSync(fragFile) || !fs.existsSync(entryFile))
      throw new Error(`${slug}: docs/ 里没有 .article-reading,也没有已提取的 fragment/入口可复用`);
    const entry = fs.readFileSync(entryFile, 'utf8');
    shellMeta[slug] = {
      title: (entry.match(/<title>([\s\S]*?)<\/title>/) || [])[1],
      accent: (entry.match(/data-accent="([^"]*)"/) || [])[1] || '',
      tint: (entry.match(/data-tint="([^"]*)"/) || [])[1] || '',
    };
    report.push({
      slug,
      accent: shellMeta[slug].accent,
      tint: `${shellMeta[slug].tint}(reuse)`,
      bytes: fs.statSync(fragFile).size,
      source: '已迁移,复用',
    });
    continue;
  }

  const title = (html.match(/<title>([\s\S]*?)<\/title>/) || [])[1];
  if (!title) throw new Error(`${slug}: 缺 <title>`);

  const bodyTag = (html.match(/<body[^>]*>/) || [])[0];
  if (!bodyTag) throw new Error(`${slug}: 缺 <body>`);
  const accent = (bodyTag.match(/data-accent="([^"]*)"/) || [])[1] || '';
  let tint = (bodyTag.match(/data-tint="([^"]*)"/) || [])[1] || '';
  let tintNote = tint ? 'html' : 'auto';
  if (!tint) tint = autoTint(`article-${slug}`);
  const bodyClass = (bodyTag.match(/class="([^"]*)"/) || [])[1] || '';

  const open = html.indexOf('<article class="article-reading">');
  if (open < 0) throw new Error(`${slug}: 缺 .article-reading`);
  const innerStart = open + '<article class="article-reading">'.length;
  const close = html.lastIndexOf('</article>');
  if (close <= innerStart) throw new Error(`${slug}: </article> 位置异常`);
  const inner = html.slice(innerStart, close);

  fs.writeFileSync(path.join(FRAG_DIR, `${slug}.reading.html`), inner);
  shellMeta[slug] = { title, accent, tint };

  /* 结构核对信息 */
  const scripts = [...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map((m) => m[1]);
  report.push({
    slug,
    bodyClass,
    accent,
    tint: `${tint}(${tintNote})`,
    bytes: inner.length,
    scripts: scripts.join(','),
    hasPlaceholder: html.includes('header-placeholder'),
    tocAside: html.includes('class="article-toc"'),
  });

  /* 入口 HTML(外壳与旧版逐段一致;writing.js → ../nav-boot.js,尾部 script.js → React bundle) */
  const entry = `<!DOCTYPE html>

<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>${title}</title>
<link href="../favicon.png?v=20" rel="icon" type="image/png"/>
<link href="../favicon.png?v=20" rel="shortcut icon"/>
<link href="../apple-touch-icon.png?v=12" rel="apple-touch-icon"/>
<link href="../style.css?v=150" rel="stylesheet"/>
<link href="writing.css?v=456" rel="stylesheet"/>
<!-- 提前加载,使顶部导航能在首次绘制前同步注入,避免空 header 闪烁(React 迁移后的原生 boot 层) -->
<script src="../nav-boot.js?v=17"></script>
</head>
<!-- 复用首页 index.html 的胶囊顶栏:home-v2 控制顶栏内边距,design-page 提供胶囊样式;
     no-banner = 顶栏不叠在 banner 上(与 Blog / Archive 同款),深色主题下顶栏整组反白靠它 -->
<body class="writing-page home-v2 design-page reading-page no-banner" data-accent="${esc(accent)}" data-tint="${esc(tint)}">
<!-- 顶部导航:与首页同一个组件(initSiteNav);data-base="../" 把站内链接/资源指回 docs 根目录 -->
<header class="header home-nav" data-active="writing" data-base="../" id="site-nav"></header>
<script>
        initSiteNav();
        applySiteTheme();   /* 首绘前应用记忆的深/浅色主题(nav-boot.js),与 blog.html 同一时机 */
    </script>
<div class="header-placeholder"></div>
<script>
        // 顶栏 fixed 脱流,占位块高度跟随顶栏实际高度(big VIBEUX 标题在不同断点高度不同)
        // 同时把左侧固定目录的 top 对齐到正文顶部 = 顶栏高度 + 正文上间距(56px,见 .reading-layout)
        (function () {
            const READING_TOP = 104;
            const h = document.querySelector('.header');
            const ph = document.querySelector('.header-placeholder');
            const set = () => {
                if (!h) return;
                if (ph) ph.style.height = h.offsetHeight + 'px';
                document.documentElement.style.setProperty('--toc-top', (h.offsetHeight + READING_TOP) + 'px');
            };
            set();
            window.addEventListener('resize', set);
            window.addEventListener('load', set);
        })();
    </script>
<div class="reading-layout" id="app" data-slug="${slug}"></div>
<script src="/src/pages/article/main.tsx" type="module"></script>
</body>
</html>
`;
  fs.writeFileSync(path.join(ENTRY_DIR, `article-${slug}.html`), entry);
}

/* articleShell.ts:每篇的 <title>/accent/tint(切换文章时同步 document.title 与 body 属性) */
let ts = '/** 由 site/scripts/extract-articles.mjs 生成 —— 每篇文章的外壳元数据(勿手改,重跑脚本更新) */\n';
ts += 'export const ARTICLE_SHELL: Record<string, { title: string; accent: string; tint: string }> = {\n';
for (const slug of SLUGS) {
  const m = shellMeta[slug];
  ts += `  ${JSON.stringify(slug)}: { title: ${JSON.stringify(m.title)}, accent: ${JSON.stringify(m.accent)}, tint: ${JSON.stringify(m.tint)} },\n`;
}
ts += '};\n';
fs.writeFileSync(path.join(ROOT, 'site/src/content/articleShell.ts'), ts);

/* fragments.ts:?raw 引入全部片段 */
let fr = '/** 由 site/scripts/extract-articles.mjs 生成 —— 文章正文片段(.article-reading innerHTML,原样) */\n';
for (const slug of SLUGS) fr += `import ${slug.replace(/-/g, '_')} from './fragments/${slug}.reading.html?raw';\n`;
fr += '\nexport const FRAGMENTS: Record<string, string> = {\n';
for (const slug of SLUGS) fr += `  ${JSON.stringify(slug)}: ${slug.replace(/-/g, '_')},\n`;
fr += '};\n';
fs.writeFileSync(path.join(ROOT, 'site/src/content/fragments.ts'), fr);

console.table(report);
console.log('done:', SLUGS.length, 'articles');
