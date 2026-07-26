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
/* 镜像 style.css 的 --hero-speed:hero 逐字与署名的时长/延迟在 CSS 里都 ×它,而索引
   --row-d 不经 CSS 缩放。下方按署名的「真实」出现时刻算列表起始,故要乘它 ——
   改 style.css 的 --hero-speed 时,这里同步。 */
const HERO_SPEED = 1.4;

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

/* 索引行 rise 拆字:行间 120 / 字间 35;箭头包成该行最后一个「字符」同批升起。
   列表起始 BASE 不再固定 620 —— 改由组件内按「署名真实出现时刻」算出(见下方),
   否则 --hero-speed 放慢署名后,列表会抢在署名之前升起(2026-07-26 修正入场先后)。 */
const ROWS = [
  { label: 'Blog', href: 'blog.html' },
  { label: 'Archive', href: 'archive.html' },
  { label: 'Contact', href: 'mailto:chentongrong1@gmail.com' },
];
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
      timer = window.setTimeout(() => document.documentElement.classList.add('entrance-done'), entranceEnd);
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

  /* hero 拆字:counter 跨两行与 accent 连续。署名延迟 = 总字数*18 + 40 —— +40 是 hero 末字
     到署名的极小间隔(约 1 步),让署名接着逐字节拍立刻跟上、不留停顿(2026-07-26 用户要求)。 */
  const c = { i: 0 };
  const line1 = splitHero('From AI-Assisted', c);
  const line2a = splitHero('to ', c);
  const line2b = splitHero('AI-Native Design.', c);
  const bylineDelay = c.i * HERO_STEP + 40;
  /* 入场先后 = 视觉自上而下:hero → 署名 → 列表。署名走 hero-soft-blur 且 CSS ×--hero-speed,
     末元素(Role)真实起步 = (bylineDelay+180)×HERO_SPEED;列表在其后 +200ms 起步
     (真实毫秒;索引 --row-d 不再被 CSS 缩放)。 */
  const BASE = Math.round((bylineDelay + 180) * HERO_SPEED + 200);
  /* 入场彻底结束(最后一行最后一字升完 + 余量)→ 用于挂 entrance-done 换快速档 */
  const entranceEnd = BASE + 2 * ROW_STEP + 8 * CHAR_STEP + 1260 + 200;

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
