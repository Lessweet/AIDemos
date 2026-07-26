/**
 * 首页(docs/index.html 的 React 版)。loader(里程表引擎/灰底首帧/字体)原样留在
 * 入口 HTML 内联;React 只渲染 hero + 三行大字索引。
 * hero 逐字拆分与索引行 rise 拆字在 JSX 直渲(产物 DOM 与旧版内联 walker 一致,
 * 不做挂载后变异);显现时机仍由 html.hero-ready / CSS 闸门控制,与旧版一致。
 */
import { useEffect } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useScrollProgress, useHeaderAlwaysVisible } from '../../shared/hooks';

const HERO_STEP = 18;

/* hero 逐字拆分(移植入口内联 walker):词包 .hero-word(nowrap 防词中折行),
   空格单元加 .hero-sp;counter 跨行连续,--d = i*18ms */
function splitHero(text: string, c: { i: number }): ReactNode[] {
  const out: ReactNode[] = [];
  const ch = (char: string, key: string) => (
    <span
      key={key}
      className={/\s/.test(char) ? 'hero-ch hero-sp' : 'hero-ch'}
      style={{ '--d': `${c.i++ * HERO_STEP}ms` } as CSSProperties}
    >
      {char}
    </span>
  );
  (text.match(/\s+|\S+/g) || []).forEach((tok, t) => {
    if (/\s/.test(tok)) {
      tok.split('').forEach((s, k) => out.push(ch(s, `s${t}-${k}`)));
    } else {
      out.push(
        <span key={`w${t}`} className="hero-word">
          {tok.split('').map((s, k) => ch(s, `c${k}`))}
        </span>,
      );
    }
  });
  return out;
}

/* 索引行 rise 拆字(移植入口内联脚本):BASE=620 / 行间 120 / 字间 35,
   箭头包成该行最后一个「字符」同批升起 */
const ROWS = [
  { label: 'Blog', href: 'blog.html' },
  { label: 'Archive', href: 'archive.html' },
  { label: 'Contact', href: 'mailto:chentongrong1@gmail.com' },
];
const BASE = 620;
const ROW_STEP = 120;
const CHAR_STEP = 35;

const ARROW = (
  <svg viewBox="0 0 24 24">
    <path d="M5.3 18.7 L18 6 M8.1 6 H18 V15.9" />
  </svg>
);

export default function HomePage() {
  useHeaderAlwaysVisible();
  useScrollProgress();
  /* 首页顶栏常驻固定,不随滚动收起(2026-07-22 用户要求;Blog/Archive 保留收起交互) */

  /* 刷新/同会话回访:hero-ready 可能在 React 挂载前已就位,内容以最终态首绘、
     入场动画被跳过。摘掉重加让入场每次刷新都重播(2026-07-22 用户要求)。
     关键:索引行字符走 transition,--d(620ms+)的延迟是双向的 —— 直接摘类后
     隐藏态要等延迟才生效,2 帧后加回类等于什么都没发生。所以摘类时临时
     transition:none + 强制回流,让隐藏态立即落地,再恢复过渡、重加闸门。
     hero 字符走 animation(重加类自动从头播),不受影响。 */
  useEffect(() => {
    const docEl = document.documentElement;
    if (!docEl.classList.contains('hero-ready')) return;
    docEl.classList.remove('hero-ready');
    docEl.classList.remove('entrance-done'); // 行分割线也按首载节奏重播
    const els = Array.from(
      document.querySelectorAll<HTMLElement>('.heading-rise-char, .home-index-row'),
    );
    els.forEach((el) => (el.style.transition = 'none'));
    void document.body.offsetWidth; // 强制回流:隐藏态立即生效
    const r1 = requestAnimationFrame(() => {
      els.forEach((el) => (el.style.transition = ''));
      requestAnimationFrame(() => docEl.classList.add('hero-ready'));
    });
    return () => cancelAnimationFrame(r1);
  }, []);

  /* 入场收尾 2200ms 后给 html 挂 entrance-done(过渡换快速档);
     闸门 = html.hero-ready(loader 收尾/跳过时由入口脚本添加) */
  useEffect(() => {
    let timer: number | undefined;
    const markDone = () => {
      timer = window.setTimeout(() => document.documentElement.classList.add('entrance-done'), 2200);
    };
    let mo: MutationObserver | undefined;
    if (document.documentElement.classList.contains('hero-ready')) markDone();
    else {
      mo = new MutationObserver((_, o) => {
        if (document.documentElement.classList.contains('hero-ready')) {
          o.disconnect();
          markDone();
        }
      });
      mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    }
    return () => {
      clearTimeout(timer);
      mo?.disconnect();
    };
  }, []);

  /* hero 拆字:counter 跨两行与 accent 连续,署名延迟 = 总字数*18 + 120 */
  const c = { i: 0 };
  const line1 = splitHero('From AI-Assisted', c);
  const line2a = splitHero('to ', c);
  const line2b = splitHero('AI-Native Design.', c);
  const bylineDelay = c.i * HERO_STEP + 120;

  return (
    <>
      {/* 首页 hero:黑底居中排版(纯 HTML/CSS,不走 iframe) */}
      <header className="home-hero">
        <h1 className="hero-headline">
          <span className="hero-line">{line1}</span>
          <span className="hero-line">
            {line2a}
            <span className="accent">{line2b}</span>
          </span>
        </h1>
        <div className="hero-byline" style={{ '--d': `${bylineDelay}ms` } as CSSProperties}>
          <span aria-label="Tongrong 头像" className="hero-avatar" role="img">
            <img alt="" src="writing/assets/tongrong-avatar.svg?v=2" />
          </span>
          <span className="hero-meta">
            <span className="hero-by">
              By <b>Tongrong</b>
            </span>
            <span className="hero-role">UI Designer</span>
          </span>
        </div>
      </header>
      {/* 首页索引:Blog / Archive / Contact 三行大字导航 */}
      <nav className="home-index" aria-label="站内入口">
        {ROWS.map((row, r) => {
          const base = BASE + r * ROW_STEP;
          let i = 0;
          return (
            <a
              key={row.label}
              className="home-index-row heading-rise"
              href={row.href}
              style={{ '--row-d': `${base}ms` } as CSSProperties}
            >
              <span className="hi-label" aria-label={row.label}>
                <span className="heading-rise-mask" aria-hidden="true">
                  {row.label.split('').map((chr, k) => (
                    <span
                      key={k}
                      className="heading-rise-char"
                      style={{ '--d': `${base + i++ * CHAR_STEP}ms` } as CSSProperties}
                    >
                      {chr}
                    </span>
                  ))}
                </span>
              </span>
              <span className="hi-arrow" aria-hidden="true">
                <span className="heading-rise-mask" aria-hidden="true">
                  <span
                    className="heading-rise-char"
                    style={{ '--d': `${base + i++ * CHAR_STEP}ms` } as CSSProperties}
                  >
                    {ARROW}
                  </span>
                </span>
              </span>
            </a>
          );
        })}
      </nav>
    </>
  );
}
