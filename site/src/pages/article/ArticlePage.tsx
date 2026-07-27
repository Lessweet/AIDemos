/**
 * 文章阅读页(docs/writing/article-*.html 的 React 版,12 个入口共享)。
 * 正文 = 整个 .article-reading 的原样片段(dangerouslySetInnerHTML),与旧版
 * switchArticle 的可交换单元一致;左栏列表 / 目录 / 文章切换从 writing.js 逐行移植。
 * 切换文章 = setSlug + pushState 到真实 article-x.html(每篇都有独立入口,直链照常)。
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { FRAGMENTS } from '../../content/fragments';
import { ARTICLE_SHELL } from '../../content/articleShell';
import { readerList, byFile } from '../../content/articles';
import ReaderList from './ReaderList';

const fileOf = (slug: string) => `article-${slug}.html`;

/* 当前 URL 的文章文件名(popstate 恢复用) */
const currentUrlFile = () => (location.pathname.split('/').pop() || '').split('#')[0];

export default function ArticlePage({ initialSlug }: { initialSlug: string }) {
  const [slug, setSlug] = useState(initialSlug);
  const [listOpen, setListOpen] = useState(false);
  const layoutRef = useRef<HTMLDivElement | null>(null);
  const articleRef = useRef<HTMLElement | null>(null);
  const tocNavRef = useRef<HTMLElement | null>(null);
  const tocAsideRef = useRef<HTMLElement | null>(null);

  /* 挂载根是入口 HTML 里的 div.reading-layout#app —— 取它做布局引用 */
  useLayoutEffect(() => {
    layoutRef.current = document.getElementById('app') as HTMLDivElement;
  }, []);

  /* ── writing.js initReader:布局测量 ──
     --reader-toc-top(列表/目录 sticky 顶)与 --reading-x/w/mid(整屏固定竖分割线) */
  useEffect(() => {
    const header = document.querySelector('.header') as HTMLElement | null;
    const layout = layoutRef.current;
    if (!layout) return;
    const setTop = () => {
      if (header)
        document.documentElement.style.setProperty('--reader-toc-top', header.offsetHeight + 24 + 'px');
    };
    const setRules = () => {
      const r = layout.getBoundingClientRect();
      const root = document.documentElement.style;
      root.setProperty('--reading-x', Math.round(r.left) + 'px');
      root.setProperty('--reading-w', Math.round(r.width) + 'px');
      const article = layout.querySelector('.article-reading');
      if (article) root.setProperty('--reading-mid', Math.round(article.getBoundingClientRect().left) + 'px');
    };
    setTop();
    setRules();
    const onResize = () => {
      setTop();
      setRules();
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('load', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('load', onResize);
    };
  }, []);

  /* ── writing.js initReader:滚轮锁在左栏内 ── */
  useEffect(() => {
    const list = layoutRef.current?.querySelector('.reader-list') as HTMLElement | null;
    if (!list) return;
    const onWheel = (e: WheelEvent) => {
      if (!list.offsetParent) return;
      const canScroll = list.scrollHeight > list.clientHeight;
      const atTop = list.scrollTop <= 0 && e.deltaY < 0;
      const atBottom = list.scrollTop + list.clientHeight >= list.scrollHeight - 1 && e.deltaY > 0;
      if (!canScroll || atTop || atBottom) e.preventDefault();
    };
    list.addEventListener('wheel', onWheel, { passive: false });
    return () => list.removeEventListener('wheel', onWheel);
  }, []);

  /* ── ≤1440 单栏:列表下拉开关 —— 点面板外 / Esc 关闭 ── */
  useEffect(() => {
    const layout = layoutRef.current;
    if (!layout) return;
    layout.classList.toggle('reader-list-open', listOpen);
    if (!listOpen) return;
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Element;
      if (t.closest('.reader-list') || t.closest('.reader-list-toggle')) return;
      setListOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setListOpen(false);
    };
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [listOpen]);

  /* ── 切换文章(writing.js switchArticle 的状态化移植) ── */
  const switchTo = (file: string, push: boolean) => {
    const meta = byFile(file);
    const nextSlug = meta ? meta.slug : file.replace(/^article-/, '').replace(/\.html?$/, '');
    const shell = ARTICLE_SHELL[nextSlug];
    if (!shell) {
      location.href = file; // 注册表外的文件 → 普通跳转兜底
      return;
    }
    setSlug(nextSlug);
    document.title = shell.title;
    document.body.setAttribute('data-tint', shell.tint);
    if (shell.accent) document.body.setAttribute('data-accent', shell.accent);
    else document.body.removeAttribute('data-accent');
    document.body.style.removeProperty('--page-tint');
    if (push) history.pushState({ file }, '', file);
    window.scrollTo(0, 0);
  };

  /* 站内文章链接(列表项 / 合集)统一拦截 → 原地切换;popstate 前进后退恢复 */
  useEffect(() => {
    const layout = layoutRef.current;
    if (!layout) return;
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element).closest?.('a[href]');
      if (!a || !layout.contains(a)) return;
      const file = (a.getAttribute('href') || '').split('/').pop()!.split('#')[0];
      /* 与旧版 isArticleFile 一致:仅拦截左栏清单内的文章,其余链接(外链/幽灵页)放行普通跳转 */
      if (!readerList().some((it) => it.file === file)) return;
      e.preventDefault();
      setListOpen(false);
      if (file === fileOf(slugRef.current)) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      switchTo(file, true);
    };
    layout.addEventListener('click', onClick);
    const onPop = () => {
      const file = currentUrlFile();
      if (file.startsWith('article-')) switchTo(file, false);
    };
    window.addEventListener('popstate', onPop);
    return () => {
      layout.removeEventListener('click', onClick);
      window.removeEventListener('popstate', onPop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const slugRef = useRef(slug);
  slugRef.current = slug;

  /* 标签(eyebrow)位置归一化:13 篇 fragment 有两种结构 —— 4 篇把标签写在 byline 内
     (与日期/阅读时长同排),9 篇是独立元素排在标题上方。样式规则是按前者写的
     (body.reading-page .article-byline .article-eyebrow),后者命中不了,标签就还
     留在标题上方(2026-07-27 用户实测)。
     这里在渲染后把独立的那种移进 byline 最前 —— 不改 fragment:它们由
     extract-articles.mjs 生成,手改会被重跑覆盖。按 slug 重跑,与目录重建同批。 */
  useLayoutEffect(() => {
    const root = articleRef.current;
    const byline = root?.querySelector('.article-byline');
    if (!root || !byline) return;
    root.querySelectorAll(':scope > .article-eyebrow').forEach((eyebrow) => {
      byline.insertBefore(eyebrow, byline.firstChild);
    });
  }, [slug]);

  /* ── writing.js initTOC:从正文 h2/h3 生成目录 + scrollspy(逐行移植,按 slug 重建) ── */
  useLayoutEffect(() => {
    const toc = tocNavRef.current;
    const body = articleRef.current?.querySelector('.article-body');
    const tocAside = tocAsideRef.current;
    if (!toc) return;
    toc.innerHTML = '';
    if (tocAside) tocAside.style.display = '';
    if (!body) return;

    const heads = Array.from(articleRef.current!.querySelectorAll('.article-body h2, .article-body h3')) as HTMLElement[];
    if (!heads.length) {
      if (tocAside) tocAside.style.display = 'none';
      return;
    }
    const links: HTMLAnchorElement[] = [];
    heads.forEach((h, i) => {
      if (!h.id) h.id = 'sec-' + i;
      const a = document.createElement('a');
      a.href = '#' + h.id;
      a.textContent = h.textContent;
      if (h.tagName === 'H3') a.classList.add('sub');
      a.addEventListener('click', (e) => {
        e.preventDefault();
        h.scrollIntoView({ behavior: 'smooth', block: 'start' });
        history.replaceState(null, '', '#' + h.id);
      });
      toc.appendChild(a);
      links.push(a);
    });

    if (!('IntersectionObserver' in window)) return;
    const seen = new Map<Element, boolean>();
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => seen.set(entry.target, entry.isIntersecting));
        let activeId = heads[0].id;
        for (const h of heads) {
          if (seen.get(h)) {
            activeId = h.id;
            break;
          }
          if (h.getBoundingClientRect().top < 140) activeId = h.id;
        }
        links.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + activeId));
      },
      { rootMargin: '-120px 0px -70% 0px', threshold: [0, 1] },
    );
    heads.forEach((h) => spy.observe(h));
    return () => spy.disconnect();
  }, [slug]);

  /* ── writing.js initArticleReveal:正文逐块入场(逐行移植,按 slug 重放) ── */
  useEffect(() => {
    const root = articleRef.current;
    if (!root) return;
    const blocks: HTMLElement[] = [];
    Array.from(root.children).forEach((child) => {
      if (child.classList.contains('article-body')) {
        Array.from(child.children).forEach((c) => blocks.push(c as HTMLElement));
      } else {
        blocks.push(child as HTMLElement);
      }
    });
    if (!blocks.length) return;

    const playEnter = (el: HTMLElement, delayMs: number) => {
      el.classList.add('article-enter');
      el.style.animationDelay = (delayMs || 0) + 'ms';
      el.classList.add('play');
    };

    const STAGGER = 120;
    const ROW_TOL = 28;
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const inViewSet = new Set<HTMLElement>();
    const inView = blocks
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.top < vh - 40 && r.bottom > 0;
      })
      .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
    inView.forEach((el) => inViewSet.add(el));
    let lastTop: number | null = null;
    let step = 0;
    inView.forEach((el) => {
      const top = Math.round(el.getBoundingClientRect().top);
      if (lastTop !== null && top - lastTop > ROW_TOL) step += 1;
      lastTop = top;
      playEnter(el, step * STAGGER);
    });

    const offscreen = blocks.filter((el) => !inViewSet.has(el));
    if (!('IntersectionObserver' in window)) {
      offscreen.forEach((el) => el.classList.add('article-move', 'play'));
      return;
    }
    offscreen.forEach((el) => el.classList.add('article-move'));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          observer.unobserve(e.target);
          e.target.classList.add('play');
        });
      },
      { root: null, rootMargin: '0px 0px -50px 0px', threshold: 0.1 },
    );
    offscreen.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [slug]);

  return (
    <>
      {/* ① 文章列表(master–detail 左栏) */}
      <ReaderList items={readerList()} currentFile={fileOf(slug)} />
      {/* ③ 浮动目录(按 slug 重建) */}
      <aside aria-label="目录" className="article-toc" ref={(el) => (tocAsideRef.current = el)}>
        <div className="article-toc-title">目录</div>
        <nav id="toc" ref={(el) => (tocNavRef.current = el)}></nav>
      </aside>
      {/* 正文:整段原样片段(含 eyebrow / h1 / byline / 封面 / 正文内联 <style> / 页脚合集) */}
      <article
        className="article-reading"
        ref={(el) => (articleRef.current = el)}
        dangerouslySetInnerHTML={{ __html: FRAGMENTS[slug] }}
      />
      {/* ≤1440 单栏:列表收成顶部「文章 ▾」下拉开关(仅该断点 CSS 显示) */}
      <button
        className="reader-list-toggle"
        type="button"
        aria-haspopup="true"
        aria-expanded={listOpen ? 'true' : 'false'}
        onClick={(e) => {
          e.stopPropagation();
          setListOpen((o) => !o);
        }}
      >
        <span>文章</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
    </>
  );
}
