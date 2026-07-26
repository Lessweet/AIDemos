/**
 * 站点行为 hooks —— 从 docs/script.js / docs/writing/writing.js 近乎逐行移植。
 * 移植纪律:选择器、常量、时序与旧实现保持一致;头部(#site-nav)由 nav-boot.js
 * 原生层负责,这些 hooks 只在 React 挂载后接管头部以下的行为。
 */
import { useEffect } from 'react';

/* ── writing.js: initStickyMenu ──
   移动端:把胶囊分类条的 sticky top 设为顶栏实际高度(入口内联脚本已同步设过一次,
   这里补 resize / load 监听) */
export function useStickyMenu() {
  useEffect(() => {
    const menu = document.querySelector('.design-menu');
    const header = document.querySelector('.header');
    if (!menu || !header) return;
    const set = () =>
      document.documentElement.style.setProperty(
        '--design-menu-top',
        (header as HTMLElement).offsetHeight + 'px',
      );
    set();
    window.addEventListener('resize', set);
    window.addEventListener('load', set);
    return () => {
      window.removeEventListener('resize', set);
      window.removeEventListener('load', set);
    };
  }, []);
}

/* ── writing.js: initScrollProgress ──
   顶栏底部滚动进度条:进度写到 .header 的 --scroll-progress */
export function useScrollProgress() {
  useEffect(() => {
    const header = document.querySelector('.header') as HTMLElement | null;
    if (!header) return;
    const doc = document.documentElement;
    let ticking = false;
    const update = () => {
      ticking = false;
      const max = doc.scrollHeight - doc.clientHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      header.style.setProperty('--scroll-progress', String(p));
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);
}

/* ── writing.js: initNavSolidOnScroll ──
   分类页:banner 底边滚过顶栏下沿后给顶栏加 .nav-solid(无 banner 的页面自动跳过) */
export function useNavSolidOnScroll() {
  useEffect(() => {
    const nav = document.querySelector('.header.home-nav');
    const banner = document.querySelector('.design-banner-frame');
    if (!nav || !banner) return;
    const update = () => {
      const solid = banner.getBoundingClientRect().bottom <= (nav as HTMLElement).offsetHeight;
      nav.classList.toggle('nav-solid', solid);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);
}

/* ── writing.js: initNavSpy ──
   右侧导航(.nav-cat[href^="#"])随滚动高亮当前模块 */
export function useNavSpy() {
  useEffect(() => {
    const links = Array.from(
      document.querySelectorAll<HTMLAnchorElement>('.nav-cat[href^="#"]'),
    );
    if (!links.length || !('IntersectionObserver' in window)) return;

    const map = new Map<Element, HTMLAnchorElement>();
    links.forEach((a) => {
      const sec = document.querySelector(a.getAttribute('href')!);
      if (sec) map.set(sec, a);
    });
    if (!map.size) return;

    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const a = map.get(entry.target);
          if (a) a.dataset.visible = entry.isIntersecting ? '1' : '';
        });
        let active: HTMLAnchorElement | null = null;
        for (const [, a] of map) {
          if (a.dataset.visible) {
            active = a;
            break;
          }
        }
        links.forEach((a) => a.classList.toggle('active', a === active));
      },
      { rootMargin: '-120px 0px -55% 0px', threshold: 0 },
    );

    map.forEach((_, sec) => spy.observe(sec));
    return () => spy.disconnect();
  }, []);
}

/* ── script.js: initCoverFade ──
   卡片封面媒体加载就绪后淡入(.cover-in),2s 兜底 */
export function useCoverFade() {
  useEffect(() => {
    const covers = document.querySelectorAll(
      '.home-v2 .card-video, .home-v2 .icon-preview-frame, .home-v2 .card-iframe',
    );
    const timers: number[] = [];
    covers.forEach((el) => {
      const show = () => el.classList.add('cover-in');
      if (el.tagName === 'VIDEO') {
        if ((el as HTMLVideoElement).readyState >= 2) show();
        else el.addEventListener('loadeddata', show, { once: true });
      } else {
        el.addEventListener('load', show, { once: true });
      }
      timers.push(window.setTimeout(show, 2000));
    });
    return () => timers.forEach(clearTimeout);
  }, []);
}

/* ── script.js: initPillarEntrance ──
   支柱页加载入场:菜单 / banner / 标题 / 卡片按垂直位置分「片」级联淡入。
   常量与原实现一致:STAGGER=110 / ROW_TOL=28 / COL_STAGGER=180;
   双 rAF 跨过首次绘制;首页 loading 遮罩(html.is-loading)在场时等其摘除再开始。 */
export function usePillarEntrance(deps: unknown[] = []) {
  useEffect(() => {
    const targets = Array.from(
      document.querySelectorAll<HTMLElement>(
        '.design-menu, .design-banner-frame, .section-divider h2, .card-wrapper',
      ),
    );
    if (!targets.length) return;

    const reveal = (el: HTMLElement) =>
      el.classList.add(el.classList.contains('heading-rise') ? 'heading-rise-in' : 'visible');

    if (!('IntersectionObserver' in window)) {
      targets.forEach(reveal);
      return;
    }

    const STAGGER = 110;
    const ROW_TOL = 28;
    const COL_STAGGER = 180;
    /* 波次方向跟随滚动方向(2026-07-22):下滑批次从上往下,上滑批次从下往上
       (贴近已可见内容的那排先出现,显现沿滚动方向推进) */
    let scrollDir: 1 | -1 = 1;
    let lastY = window.scrollY;
    const onDirScroll = () => {
      const y = window.scrollY;
      if (y !== lastY) scrollDir = y > lastY ? 1 : -1;
      lastY = y;
    };
    window.addEventListener('scroll', onDirScroll, { passive: true });
    const timers: number[] = [];
    let observer: IntersectionObserver | null = null;
    let resetObserver: IntersectionObserver | null = null;
    let mo: MutationObserver | null = null;

    const revealByRow = (els: HTMLElement[]) => {
      /* 轨迹随滚动方向:上滑进入 → 隐藏态切到上方(-22px),显现时向下落;
         切换在显现前瞬时完成(禁过渡 + 强制回流),不会被看到 */
      const fromAbove = scrollDir < 0;
      els.forEach((el) => {
        if (el.classList.contains('enter-from-above') !== fromAbove) {
          el.style.transition = 'none';
          el.classList.toggle('enter-from-above', fromAbove);
          void el.offsetWidth;
          el.style.transition = '';
        }
      });
      const sorted = els
        .slice()
        .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
      const rows: HTMLElement[][] = [];
      let lastTop: number | null = null;
      sorted.forEach((el) => {
        const top = Math.round(el.getBoundingClientRect().top);
        if (lastTop === null || top - lastTop > ROW_TOL) rows.push([]);
        lastTop = top;
        rows[rows.length - 1].push(el);
      });
      if (scrollDir < 0) rows.reverse(); // 上滑:从下往上依次显现
      rows.forEach((row, step) => {
        const rowDelay = step * STAGGER;
        const ordered = row
          .slice()
          .sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
        ordered.forEach((el, col) => {
          timers.push(window.setTimeout(() => reveal(el), rowDelay + col * COL_STAGGER));
          el.dataset.entered = '1';
        });
      });
    };

    const start = () =>
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          const vh = window.innerHeight || document.documentElement.clientHeight;
          const inView = targets.filter((el) => {
            const r = el.getBoundingClientRect();
            return r.top < vh - 40 && r.bottom > 0;
          });
          revealByRow(inView);

          /* 2026-07-22 改为可重播:进入视口按行错峰显现;完全离开视口后复位,
             再次进入(上滑回来同样)重新依次入场 */
          observer = new IntersectionObserver(
            (entries) => {
              const hits = entries
                .filter((e) => e.isIntersecting)
                .map((e) => e.target as HTMLElement)
                .filter((el) => !el.dataset.entered);
              if (hits.length) revealByRow(hits);
            },
            { root: null, rootMargin: '0px 0px -50px 0px', threshold: 0.1 },
          );
          resetObserver = new IntersectionObserver(
            (entries) => {
              entries.forEach((e) => {
                if (e.isIntersecting) return;
                const el = e.target as HTMLElement;
                if (!el.dataset.entered) return;
                /* 复位瞬时完成(临时禁过渡),避免快速滑回时撞见半程反向动画 */
                el.style.transition = 'none';
                el.classList.remove('visible', 'heading-rise-in');
                delete el.dataset.entered;
                void el.offsetWidth;
                el.style.transition = '';
              });
            },
            { threshold: 0 },
          );
          targets.forEach((el) => {
            observer!.observe(el);
            resetObserver!.observe(el);
          });
        }),
      );

    const docEl = document.documentElement;
    if (docEl.classList.contains('is-loading')) {
      mo = new MutationObserver((_, obs) => {
        if (docEl.classList.contains('is-loading')) return;
        obs.disconnect();
        start();
      });
      mo.observe(docEl, { attributes: true, attributeFilter: ['class'] });
    } else {
      start();
    }

    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener('scroll', onDirScroll);
      observer?.disconnect();
      resetObserver?.disconnect();
      mo?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/* ── script.js: 顶部平滑滚动 IIFE(a[href^="#"] → scrollIntoView smooth) ──
   React 页里用事件代理实现同样行为,作用域限定在挂载根之内 + 头部(头部由 nav-boot 注入,
   其内部无 # 锚点,保持与旧版 document 级绑定等效) */
export function useSmoothScrollAnchors() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const anchor = (e.target as Element).closest?.('a[href^="#"]');
      if (!anchor) return;
      e.preventDefault();
      const target = document.querySelector(anchor.getAttribute('href')!);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
}

/* ── script.js: Sticky Header IIFE ── 顶栏常驻(摘除可能存在的 .header-hidden) */
export function useHeaderAlwaysVisible() {
  useEffect(() => {
    document.querySelector('.header')?.classList.remove('header-hidden');
  }, []);
}

/* 内容挂载完成后放开内容区(配合 writing.css 的 #app / #app.app-ready)。
   Blog / Archive 没有 loading 遮罩:浏览器在 React 挂载之前就画了第一帧,
   那一帧只有顶栏、内容区是空的,随后内容整块以最终态出现 —— 看着就是闪一下。
   基态透明 + 挂载后淡入,把这一跳抹平。无 JS 时本来也没有内容,不怕一直透明。 */
export function useAppReady() {
  useEffect(() => {
    document.getElementById('app')?.classList.add('app-ready');
  }, []);
}

/* ── script.js: updateDynamicScale ──
   .card-dynamic-scale 内容按卡片高度自适应(--content-scale) */
export function useDynamicScale() {
  useEffect(() => {
    const update = () => {
      document.querySelectorAll<HTMLElement>('.card-dynamic-scale').forEach((card) => {
        const cardHeight = card.offsetHeight;
        const contentHeight = parseInt(card.dataset.contentHeight || '') || 812;
        const targetRatio = parseFloat(card.dataset.targetRatio || '') || 0.9;
        card.style.setProperty('--content-scale', String((cardHeight * targetRatio) / contentHeight));
      });
    };
    update();
    window.addEventListener('load', update);
    window.addEventListener('resize', update);
    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(update);
      document.querySelectorAll('.card-dynamic-scale').forEach((card) => ro!.observe(card));
    }
    return () => {
      window.removeEventListener('load', update);
      window.removeEventListener('resize', update);
      ro?.disconnect();
    };
  }, []);
}

/* ── Blog 滚动拖影(2026-07-22 新增交互):滚动时卡片按视口位置错峰位移,
   越靠下的卡响应越滞后、被「拖」得越开;停止滚动后依次弹回原位。
   位移写在 card-wrapper 的子元素上(封面链接 + 信息条),不碰 wrapper 本身 ——
   入场动画(.visible 过渡)的 transform 在 wrapper 上,互不覆盖。 */
export function useScrollLag() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const wrappers = Array.from(
      document.querySelectorAll<HTMLElement>('#writing-all .card-wrapper'),
    );
    if (!wrappers.length) return;
    const parts = wrappers.map((w) => Array.from(w.children) as HTMLElement[]);
    let prev = window.scrollY;
    let smooth = 0;
    let raf = 0;
    let cleared = true;
    const K = 0.9; // 位移系数
    const MAX = 56; // 单卡最大拖开距离
    const tick = () => {
      const y = window.scrollY;
      const d = y - prev;
      prev = y;
      smooth += (d - smooth) * 0.18; // 平滑滚动速度 → 拖影量
      if (Math.abs(smooth) < 0.05) {
        smooth = 0;
        if (!cleared) {
          parts.forEach((els) => els.forEach((el) => (el.style.transform = '')));
          cleared = true;
        }
      } else {
        cleared = false;
        const vh = window.innerHeight || 1;
        wrappers.forEach((w, i) => {
          const top = w.getBoundingClientRect().top;
          /* 视口位置系数 0.35~1.35:越靠下的卡位移越大(「下面的先下移」) */
          const factor = 0.35 + Math.min(1, Math.max(0, top / vh));
          const ty = Math.max(-MAX, Math.min(MAX, smooth * K * factor));
          parts[i].forEach((el) => (el.style.transform = `translateY(${ty}px)`));
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      parts.forEach((els) => els.forEach((el) => (el.style.transform = '')));
    };
  }, []);
}

/* ── Smart Sticky Header(复刻旧站 2fa5094 版实现,2026-07-22 恢复):
   下滑过 100px(累计 10px 阈值)收起,上滑(累计 10px)出现,页顶强制显示。
   动画 = .header-hidden + 1.12s 柔和缓动(原版观感)。原版全宽生效,此处一致;
   桌面走 style.css 的 transform 滑出,手机端 transform 被清空(保全屏菜单包含块)、
   由 writing.css 的 top 位移实现同曲线滑出。 */
export function useHideNavOnScrollMobile() {
  useEffect(() => {
    const header = document.querySelector('.header.home-nav') as HTMLElement | null;
    if (!header) return;
    header.classList.remove('header-hidden'); // 加载时必可见
    const mq = window.matchMedia('(max-width: 600px)');
    let lastScrollY = window.scrollY;
    let scrollDelta = 0;
    const onScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollDiff = currentScrollY - lastScrollY;
      scrollDelta += scrollDiff;
      if (header.classList.contains('nav-open')) {
        header.classList.remove('header-hidden');
        scrollDelta = 0;
        lastScrollY = currentScrollY;
        return;
      }
      /* 手机端(≤600):order.design 手感 —— 方向一变立即响应(4px 死区),
         过了顶栏高度就可收起;桌面:沿用旧站 Smart Sticky(10px 累计、100px 起始) */
      const threshold = mq.matches ? 4 : 10;
      const hideAfter = mq.matches ? 80 : 100;
      if (scrollDiff > 0 && currentScrollY > hideAfter) {
        if (scrollDelta > threshold) {
          header.classList.add('header-hidden');
          scrollDelta = 0;
        }
      } else if (scrollDiff < 0) {
        if (scrollDelta < -threshold) {
          header.classList.remove('header-hidden');
          scrollDelta = 0;
        }
      }
      if (currentScrollY <= 10) {
        header.classList.remove('header-hidden');
        scrollDelta = 0;
      }
      lastScrollY = currentScrollY;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      header.classList.remove('header-hidden');
      header.style.top = '';
    };
  }, []);
}
