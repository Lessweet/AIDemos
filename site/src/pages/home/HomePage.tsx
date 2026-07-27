/**
 * 首页(docs/index.html 的 React 版)。loader(里程表引擎/灰底首帧/字体)原样留在
 * 入口 HTML 内联;React 只渲染 hero + 三行大字索引。
 * hero 逐字拆分与索引行 rise 拆字在 JSX 直渲(产物 DOM 与旧版内联 walker 一致,
 * 不做挂载后变异);显现时机仍由 html.hero-ready / CSS 闸门控制,与旧版一致。
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent, ReactNode } from 'react';
import { useScrollProgress, useHeaderAlwaysVisible } from '../../shared/hooks';
import BlogPage from '../blog/BlogPage';
import ArchivePage from '../archive/ArchivePage';
import { INDEX_ARROW_PATH } from '../../shared/PageCollapse';

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
/* = --rise-fade-dur(writing.css token):行内末字淡入完成即视为该行「已就位」,
   逐行挂 .row-in 放开 hover 反色 —— 每行显示完立刻可交互,不等整段入场收尾 */
const RISE_FADE = 1050;

/* 行尾箭头与 Blog/Archive 标题行的「收起」箭头同一 path(PageCollapse 单一数据源)——
   模态 morph 时两端用克隆互相变形,造型必须同源 */
const ARROW = (
  <svg viewBox="0 0 24 24">
    <path d={INDEX_ARROW_PATH} />
  </svg>
);

/* ── 首页 → Blog / Archive 全屏模态(test/page-interaction 实验)──
   点击 Blog / Archive 行不跳页:同文档内把 body 换成目标页布局、就地挂载目标页组件。
   2026-07-27 v2「整块位移」:标题与索引行已同字号同左缘 —— 不再用克隆飞字,而是把
   模态内容(标题行 + 菜单 + feed,即 #app 里除首页两块外的全部)整体从「行的位置」
   平移到最终位置:标题本身就是那行字,feed 从行下方跟着一起上移入场,行不再是
   孤立组件(用户要求)。收起箭头 = 行尾同一支箭头原位旋转 0→135°,随整体移动。
   返回键 / Esc / 收起箭头关闭,反向整块下移;后半程重播首页 hero 入场。
   morph = 整块上移中;open = 已就位;closing = 整块下移中。 */
type ModalTarget = 'blog' | 'archive';
type ModalState = { target: ModalTarget; phase: 'morph' | 'open' | 'closing' } | null;

const MODAL_PAGES: Record<ModalTarget, { href: string; bodyClass: string; label: string }> = {
  blog: { href: 'blog.html', bodyClass: 'blog-page', label: 'Blog' },
  archive: { href: 'archive.html', bodyClass: 'works-page', label: 'Archive' },
};
/* 收起的后半程时点:模态内容淡出一收完就恢复首页布局,hero / 索引随即显形,
   块继续下移落进已经在场的行里。
   下限约束:必须小于 morphTiming 的最短时长(560ms),布局恢复才来得及在落位前发生。
   CSS 侧的淡出时长(writing.css .home-modal-closing)与这里同值 —— 一起改。 */
const HOME_RESTORE_MS = 420;
/* 首页入场大致收尾后,把两个模态页隐藏挂载做后台预载(2026-07-27 用户要求
   「展开前内容就该是完整的」)。点击才加载的话,7 个 iframe + 10 个视频要靠
   「赶在位移落位前备齐」,热缓存下勉强赶得上(实测 840ms < 1385ms),冷启动
   就会看到内容陆续补上。延迟到入场之后再开始:太早会与 loader / hero 抢带宽。
   注意这与被否掉的骨架图方案无关 —— 骨架是「位移期间不给 src、拿灰块顶着」,
   这里是「提前把内容备好」,展开时直接展示。 */
const PRELOAD_DELAY_MS = 1500;
/* 预载后 DOM 里同时躺着两页,所有针对模态内容的查询都必须限定在激活页内 ——
   document.querySelector 会命中第一个(隐藏那页),隐藏元素的 rect 全是 0,
   位移起终点、fixed 接力、首屏批次全会算错(2026-07-27 加回预载时实测:
   收起会多出一个差 53px 的中间布局)。 */
const ACTIVE_CLASS = 'home-modal-active';
const inActive = <T extends Element>(sel: string) =>
  document.querySelector<T>(`.${ACTIVE_CLASS} ${sel}`);
const allInActive = <T extends Element>(sel: string) =>
  Array.from(document.querySelectorAll<T>(`.${ACTIVE_CLASS} ${sel}`));
/* 恢复时 hero(含署名)的显形:整块一起淡入 1s(骨架前定稿;其后的 1.5s /
   依次错峰 / 不淡入等尝试随 2026-07-27 完整回滚一并撤销)。 */
const HOME_HERO_FADE_MS = 1000;
/* morph 的时长/缓动从 token 读(--page-morph-dur / --ease-soft),展开收起同一组:
   ease-out —— 点击立即起步、长尾滑行落位(用户定的,不要 in-out 的缓起)。
   时长按行程缩放、速度恒定(2026-07-27 用户定):Blog / Archive 行位置不同,
   固定时长会让 Archive(行更靠下、行程更长)明显更快。--page-morph-dur 定义为
   「基准行程 MORPH_REF_PX 的时长」,实际时长线性缩放,夹在 0.5×–1.6× 之间
   (下限 0.5× = 560ms 必须大于 HOME_RESTORE_MS,收起的布局恢复才来得及在落位前发生)。
   系统开了减弱动效就不飞了,直接落位(与 CSS 侧 prefers-reduced-motion 规则同一态度)。 */
const MORPH_REF_PX = 420;
/* 箭头旋转占位移时长的比例:同一条 ease-out 里,前 40% 时间转掉 85% 的角度,
   剩下一点角度要磨完大半时长 —— 位移的长尾看不出来,角度的长尾非常显眼,
   观感就是「转到一半停住、过一会儿才补完」(2026-07-27 用户实测 Archive)。
   0.55 仍嫌慢(用户再提),收到 0.36:块刚起步箭头就已转到位,干脆利落。 */
const ARROW_SPIN_RATIO = 0.36;
function morphTiming(distance?: number) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return { duration: 1, easing: 'linear' };
  }
  const rootCs = getComputedStyle(document.documentElement);
  const base = (parseFloat(rootCs.getPropertyValue('--page-morph-dur')) || 1.12) * 1000;
  const duration =
    distance === undefined
      ? base
      : Math.min(base * 1.6, Math.max(base * 0.5, (base * distance) / MORPH_REF_PX));
  return {
    duration,
    easing: rootCs.getPropertyValue('--ease-soft').trim() || 'cubic-bezier(0.22, 1, 0.36, 1)',
  };
}

/* 参与整块位移的元素:#app 里除首页 hero / 索引外的全部内容。不包一层 wrapper 是
   因为 works-page 的 .design-layout 是网格,子项必须保持直接子级 —— 改为对每个子项
   施加同一段 transform。
   必须递归下探 display:contents:Archive 为了让 banner 与作品拼成一个连续网格,把
   .design-content / .category-section 设成了 display:contents —— 这类元素没有盒子,
   transform / opacity 对它完全无效。只取直接子级的话,Archive 上真正动起来的只有
   banner 卡(它是 #app 的真实子节点),其余卡片纹丝不动,banner 就成了「自己走自己
   轨迹」的孤立组件(2026-07-27 用户三次实测的同一根因)。下探到真实盒子后,
   全部内容拿同一段 transform,才是一个整体。
   同时打上 .home-ride-el:收起时的淡出规则要按这批真实盒子来写(同理,写在
   display:contents 的容器上不生效)。 */
function rideEls(): HTMLElement[] {
  const app = document.getElementById('app');
  if (!app) return [];
  const out: HTMLElement[] = [];
  const walk = (parent: Element) => {
    Array.from(parent.children).forEach((child) => {
      const el = child as HTMLElement;
      if (el.classList.contains('home-hero') || el.classList.contains('home-index')) return;
      const d = getComputedStyle(el).display;
      if (d === 'contents') {
        /* 穿透进去取真实盒子,但容器自己也要打标记:收起恢复 home-landing 后
           works-page / blog-page 的 display:contents 规则失效,.design-content
           变回 block 重新占位(实测 663px),把首页索引行顶上去,直到模态卸载
           才塌回去 —— 就是收起落位时的那一下硬跳(2026-07-27 用户实测 Archive)。
           打上类后 home-restoring 的摘除规则能连整棵子树一起拿掉。 */
        el.classList.add('home-ride-el');
        walk(el);
      } else if (d !== 'none') {
        el.classList.add('home-ride-el');
        out.push(el);
      }
      /* d === 'none' 的整支跳过:那是未激活的预载页(常驻挂载、隐藏),
         既不参与位移,也不该被打上 .home-ride-el —— 打了会被收起时的
         淡出/摘除规则误伤,下次激活它就是隐形的。 */
    });
  };
  walk(app);
  /* 只让当前视口内的元素真的动:Archive 有 3 个 iframe + 9 个 video,23 个元素
     同时跑 transform 会各自提一个合成层,每帧重新合成 —— 展开中段明显卡顿
     (2026-07-27 用户实测)。视口外的元素此刻不可见(尚未入场),不动它们无差别。
     .home-ride-el 仍打在全部真实盒子上 —— 收起的淡出规则要覆盖到所有内容。 */
  const vh = window.innerHeight;
  return out.filter((el) => {
    const r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < vh;
  });
}

export default function HomePage() {
  useHeaderAlwaysVisible();
  useScrollProgress();
  /* 首页顶栏常驻固定,不随滚动收起(2026-07-22 用户要求;Blog/Archive 保留收起交互) */

  const [modal, setModal] = useState<ModalState>(null);
  const morphFrom = useRef<DOMRect | null>(null);
  const rideAnimsRef = useRef<Animation[]>([]);

  /* 后台预载:入场收尾后挂载两个模态页(隐藏),内容提前备好 */
  const [preloaded, setPreloaded] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setPreloaded(true), PRELOAD_DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  const openModal = (target: ModalTarget) => (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    /* 双击/快速连点:state 提交前第二次点击 modal 仍是 null,靠 history.state 兜底防重 */
    if (modal || (history.state as { homeModal?: string } | null)?.homeModal) return;
    /* 点击必然发生在 hover(或触屏 :active)反色态:文字右移 --hl-shift,直接量会把
       缩进量记进起终点,落位交接回未 hover 基态就会跳一下。测量前临时清掉位移
       (同帧清 → 量 → 还原,不可见),morph 全程按未 hover 基态的几何走。 */
    const shiftEls = Array.from(
      e.currentTarget.querySelectorAll<HTMLElement>('.hi-label, .hi-arrow'),
    );
    shiftEls.forEach((el) => {
      el.style.transition = 'none';
      el.style.transform = 'none';
    });
    const mask = e.currentTarget.querySelector<HTMLElement>('.hi-label .heading-rise-mask');
    if (mask) morphFrom.current = mask.getBoundingClientRect();
    shiftEls.forEach((el) => {
      el.style.transform = '';
      el.style.transition = '';
    });
    history.pushState({ homeModal: target }, '', MODAL_PAGES[target].href);
    setModal({ target, phase: 'morph' });
  };

  /* morph:换 body 类(首页藏进模态下面、目标页布局生效)→ 量出标题的自然位置 →
     模态内容整块从「行的位置」(向下偏移 dy)动画到自然位置。标题在首帧就显形 ——
     它起步时与被点击的行像素重合,本身就是那行字的延续;feed 挂在标题下方,
     从行下面跟着一起上移、边移边由 pillar 入场系统显现(无闸门,点击瞬间就开始)。
     收起按钮的箭头同程从 0° 旋到 135°(CSS 静态值),完成行尾 ↗ → 收起 ↓ 的变形。
     全部在 layout effect 内同步完成,首帧画出来就已经是「整块压在行位置」。 */
  useLayoutEffect(() => {
    if (modal?.phase !== 'morph') return;
    const page = MODAL_PAGES[modal.target];
    const body = document.body;
    body.classList.remove('home-landing');
    body.classList.add(page.bodyClass, 'home-modal', 'home-modal-riding');
    window.scrollTo(0, 0);
    const titleMask = inActive<HTMLElement>('.page-title .heading-rise-mask');
    const from = morphFrom.current;
    const els = rideEls();
    if (!titleMask || !from || !els.length) {
      setModal({ target: modal.target, phase: 'open' });
      return;
    }
    /* 首屏内容整批首发:整块上移要读作「一整页跟着行走」—— 落位后处于第一屏内的
       feed 元素(banner / 分类菜单 / 区块标题 / 卡片)在起步时就一起显形、随块上移,
       各自走自己的入场过渡;pillar 的错峰队列只留给首屏之外、日后滚动进入的内容。
       (2026-07-27 用户两次实测迭代:先是 banner 被初批错峰排到几百毫秒后、被上移中
       拿到零延迟的 icon 卡反超;点名 banner 首发后,其余卡片又显得「没跟块一起动」——
       收敛为按最终位置划首屏、整批首发。)
       此刻 transform 动画尚未挂上,量到的就是落位后的自然位置。 */
    const firstWave = allInActive<HTMLElement>(
      '.design-menu, .design-banner-frame, .section-divider h2, .card-wrapper',
    ).filter((el) => {
      /* 零尺寸 = 藏在 display:none 支路里(如 works-page 的区块标题),不参与首发 */
      const r = el.getBoundingClientRect();
      return r.height > 0 && r.top < window.innerHeight;
    });
    firstWave.forEach((el) => (el.dataset.entered = '1'));
    /* 依次入场:直接复用 usePillarEntrance 的 revealByRow 编排(行间 STAGGER、
       行内按 left 排序列间 COL_STAGGER),与独立 blog.html / archive.html 加载时
       的卡片入场完全同一套节奏(2026-07-27 用户要求)。
       为什么不交给 pillar 自己跑:它的 useEffect 在本 layout effect 之后执行,
       那时元素已带位移偏移,视口判定会把首屏元素算成「在视口外」而全部漏掉。
       这里趁位移尚未施加、元素还在落位后的自然位置,按同一算法排好班。 */
    const PILLAR_STAGGER = 110;
    const PILLAR_ROW_TOL = 28;
    const PILLAR_COL_STAGGER = 180;
    const waveTimers: number[] = [];
    let waveRaf = 0;
    if (firstWave.length) {
      const sorted = firstWave
        .map((el) => ({ el, r: el.getBoundingClientRect() }))
        .sort((a, b) => a.r.top - b.r.top);
      const rows: { el: HTMLElement; r: DOMRect }[][] = [];
      let lastTop: number | null = null;
      sorted.forEach((item) => {
        const top = Math.round(item.r.top);
        if (lastTop === null || top - lastTop > PILLAR_ROW_TOL) rows.push([]);
        lastTop = top;
        rows[rows.length - 1].push(item);
      });
      const schedule = rows.flatMap((row, step) =>
        row
          .slice()
          .sort((a, b) => a.r.left - b.r.left)
          .map((item, col) => ({
            el: item.el,
            delay: step * PILLAR_STAGGER + col * PILLAR_COL_STAGGER,
          })),
      );
      /* 双 rAF:先让隐藏基态绘制一帧,过渡才有起点 */
      waveRaf = requestAnimationFrame(() =>
        requestAnimationFrame(() =>
          schedule.forEach(({ el, delay }) =>
            waveTimers.push(
              window.setTimeout(
                () =>
                  el.classList.add(
                    el.classList.contains('heading-rise') ? 'heading-rise-in' : 'visible',
                  ),
                delay,
              ),
            ),
          ),
        ),
      );
    }
    const to = titleMask.getBoundingClientRect();
    const dx = from.left - to.left;
    const dy = from.top - to.top;
    const timing = morphTiming(Math.hypot(dx, dy));
    const anims = els.map((el) =>
      el.animate(
        [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0px, 0px)' }],
        timing,
      ),
    );
    const collapseSvg = inActive<SVGSVGElement>('.page-collapse svg');
    if (collapseSvg) {
      anims.push(
        collapseSvg.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(135deg)' }], {
          ...timing,
          duration: timing.duration * ARROW_SPIN_RATIO,
          fill: 'forwards',
        }),
      );
    }
    rideAnimsRef.current = anims;
    anims[0].onfinish = () => setModal({ target: modal.target, phase: 'open' });
    return () => {
      cancelAnimationFrame(waveRaf);
      waveTimers.forEach(clearTimeout);
      /* pause 而非 cancel:上移中途被收起时,closing 相要从当前偏移接力反向下移 ——
         cancel 会把 transform 瞬间打回,量到的就是错的位置。正常落位后动画已结束,
         pause 无副作用。 */
      anims.forEach((a) => a.pause());
    };
  }, [modal]);

  /* open:整块已就位(动画结束、transform 回到 none),解除滚动锁 */
  useLayoutEffect(() => {
    if (modal?.phase !== 'open') return;
    document.body.classList.remove('home-modal-riding');
    rideAnimsRef.current.forEach((a) => a.cancel());
    rideAnimsRef.current = [];
  }, [modal]);

  /* closing:整块反向下移(与展开镜像),分三拍:
     ① t=0:feed / 菜单 / banner 淡出(CSS .home-modal-closing,标题行除外 ——
        标题就是即将归位的行文字,必须全程可见),整块从当前偏移(半空被收起时
        接力,不跳变)向下移往行位置;收起箭头 135° 转回 0° 变回行尾 ↗;
     ② t=HOME_RESTORE_MS(feed 淡完):恢复首页布局 —— 模态内容先用
        body.home-restoring 从布局摘除(React 卸载要等落位后),但下移中的
        标题行不受影响(排除在摘除规则外);索引行禁过渡瞬时显形垫底
        (行字符显示态锁在 home-landing 上,不禁会带错峰延迟重播);
        hero + 署名重播自己的逐字 soft-blur 入场(hero-ready 摘→回流→重挂,
        2026-07-27 用户要求「再次入场动画」);落点行文字/箭头先藏住,
        免得和下移中的标题行重影;
     ③ 落位:标题行与真实行像素重合,行显形交接,setModal(null) 卸载模态内容
        (home-restoring 由 modal=null 的 effect 在卸载提交后再摘)。 */
  useLayoutEffect(() => {
    if (modal?.phase !== 'closing') return;
    const page = MODAL_PAGES[modal.target];
    const body = document.body;
    body.classList.add('home-modal-closing', 'home-modal-riding');

    const targetRow = document.querySelector<HTMLElement>(`.home-index-row[href="${page.href}"]`);
    const rowParts = targetRow
      ? Array.from(targetRow.querySelectorAll<HTMLElement>('.hi-label, .hi-arrow'))
      : [];
    rowParts.forEach((el) => (el.style.visibility = 'hidden'));

    /* 落位接力时标题行被改成 fixed(见 restoreTimer),这些 inline 样式必须还原 ——
       预载让两页常驻不卸载,残留会留到下一次展开:标题行还挂着 top:0 就跑到页顶,
       又因脱离文档流让位移起点算错、整块从右下角移入(2026-07-27 用户实测第二次
       展开的大 bug)。以前模态关闭即卸载,残留随组件消失,所以没暴露。 */
    let landedTitleRow: HTMLElement | null = null;
    const clearTitleRowInline = () => {
      if (!landedTitleRow) return;
      const st = landedTitleRow.style;
      st.position = '';
      st.top = '';
      st.left = '';
      st.width = '';
      st.margin = '';
      landedTitleRow = null;
    };

    let finished = false;
    const finishClose = () => {
      if (finished) return;
      finished = true;
      /* 第一步必须先把激活页藏起来,再做任何清理 ——
         摘掉 position:fixed 的那一刻 transform 还挂在元素上,而这个值是按 fixed
         坐标系算的,回到文档流后叠加它会把标题行甩到页面外(实测 y 从 665 跳到
         1556),这一帧被绘制就是用户看到的「闪一下」。与缓动无关:删掉弹性落位后
         依旧存在(2026-07-27 逐帧采样定位)。
         隐藏用 inline display —— React 下次渲染这个 wrapper 时会用 style prop
         覆盖回来,不会残留。 */
      const activeWrap = document.querySelector<HTMLElement>(`.${ACTIVE_CLASS}`);
      if (activeWrap) activeWrap.style.display = 'none';
      /* 同一同步块内完成交接:标题行隐去、行文字显形,浏览器不会在中间绘制 */
      rowParts.forEach((el) => (el.style.visibility = ''));
      rideAnimsRef.current.forEach((a) => a.cancel());
      rideAnimsRef.current = [];
      clearTitleRowInline();
      body.classList.remove('home-modal-riding');
      setModal(null);
    };

    /* 下移全程的起终点偏移与时长(fixed 接力要用完整路径 + 同一时长续曲线),
       主分支里赋值;免 ride 的兜底路径不赋值,rideActive 保持 false、接力块整体跳过。 */
    let rideActive = false;
    let rideStart = { x: 0, y: 0 };
    let rideEnd = { x: 0, y: 0 };
    let rideTiming = { duration: 0, easing: 'linear' };
    const restoreTimer = window.setTimeout(() => {
      /* ① 标题行切到屏幕坐标系接力剩余下移:换类后首页内容回到文档流,标题行的
         布局原点会被顶到 hero 之下,fill:forwards 的 transform 随之整体错位
         (2026-07-27 用户实测「Blog 先消失又闪现」的另一半成因 —— 第一半是
         home-restoring 摘除规则误伤,见 writing.css)。趁布局未变量出当前几何,
         转 position:fixed 后按「完整路径 + 完整时长 + 同一条曲线」重建动画,
         再把 currentTime 拨到已流逝的 HOME_RESTORE_MS —— 接进同一条曲线的
         同一时刻,速度零断差(此前用「剩余路程的新 ease-out」接力,新曲线从头
         起步速度陡,落位前会抖一下,2026-07-27 用户实测)。 */
      const titleRow = inActive<HTMLElement>('.page-title-row');
      const tMask = inActive<HTMLElement>('.page-title .heading-rise-mask');
      if (rideActive && titleRow && tMask && from) {
        const rowRect = titleRow.getBoundingClientRect();
        const mNow = new DOMMatrixReadOnly(getComputedStyle(titleRow).transform);
        /* 标题行的「无 transform 布局位置」= 当前视口位置 − 当前动画偏移 */
        const natLeft = rowRect.left - mNow.m41;
        const natTop = rowRect.top - mNow.m42;
        rideAnimsRef.current.forEach((a) => {
          if (a.effect && (a.effect as KeyframeEffect).target === titleRow) a.cancel();
        });
        landedTitleRow = titleRow;
        titleRow.style.position = 'fixed';
        titleRow.style.top = '0';
        titleRow.style.left = '0';
        titleRow.style.width = `${rowRect.width}px`;
        titleRow.style.margin = '0';
        /* 用下移起步时算好的同一组时长/缓动(距离缩放后各次不同,不能重新取 token) */
        const landAnim = titleRow.animate(
          [
            {
              transform: `translate(${natLeft + rideStart.x}px, ${natTop + rideStart.y}px)`,
            },
            { transform: `translate(${natLeft + rideEnd.x}px, ${natTop + rideEnd.y}px)` },
          ],
          { duration: rideTiming.duration, easing: rideTiming.easing, fill: 'forwards' },
        );
        landAnim.currentTime = HOME_RESTORE_MS;
        landAnim.onfinish = finishClose;
        rideAnimsRef.current.push(landAnim);
      }
      const riseEls = Array.from(
        document.querySelectorAll<HTMLElement>('.home-index-row, .home-index-row .heading-rise-char'),
      );
      riseEls.forEach((el) => (el.style.transition = 'none'));
      body.classList.remove(page.bodyClass, 'home-modal', 'home-modal-closing');
      body.classList.add('home-landing', 'home-restoring');
      document.documentElement.classList.remove('is-loading');
      void body.offsetWidth;
      riseEls.forEach((el) => (el.style.transition = ''));
      /* 滚动已在 closing 起步帧归零(带 transform 补偿),这里不再动滚动。
         hero(含署名)整块淡入 HOME_HERO_FADE_MS;索引行短淡入(HOME_RESTORE_MS,
         2026-07-27 用户要回)—— 快于 hero,落点行在下移的标题行到达前已基本实打。 */
      const easeSoft =
        getComputedStyle(document.documentElement).getPropertyValue('--ease-soft').trim() ||
        'cubic-bezier(0.22, 1, 0.36, 1)';
      document.querySelectorAll<HTMLElement>('.home-hero').forEach((el) => {
        el.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: HOME_HERO_FADE_MS,
          easing: easeSoft,
        });
      });
    }, HOME_RESTORE_MS);

    const from = morphFrom.current; /* 首页行位置(打开时记录,scroll=0 的视口坐标) */
    const titleMask = inActive<HTMLElement>('.page-title .heading-rise-mask');
    const els = rideEls();
    let fallbackTimer: number | undefined;
    if (!titleMask || !from || !els.length) {
      fallbackTimer = window.setTimeout(finishClose, HOME_RESTORE_MS + 60);
      return () => {
        clearTimeout(restoreTimer);
        clearTimeout(fallbackTimer);
      };
    }
    /* 当前偏移:上移中途被收起时,块停在半空(morph cleanup 是 pause)——
       从计算样式里读出当前 translate,接力反向;已就位则为 0。 */
    const m = new DOMMatrixReadOnly(getComputedStyle(els[0]).transform);
    const curX = m.m41;
    const curY = m.m42;
    /* 深滚后收起:同一帧先把滚动归零,再把「原滚动量」并入起始偏移作补偿 ——
       块在视口里纹丝不动,只是坐标系换到了页顶,下移全程连续
       (否则 420ms 恢复首页时归零滚动,下移中的块会跳一段)。 */
    const scrolled = window.scrollY;
    if (scrolled) window.scrollTo(0, 0);
    const startY = curY - scrolled;
    /* 标题的自然位置 = 归零后的视口位置 - 当前 transform 偏移;目标 = 行位置 - 自然位置 */
    const now = titleMask.getBoundingClientRect();
    const dx = from.left - (now.left - curX);
    const dy = from.top - (now.top - curY);
    rideAnimsRef.current.forEach((a) => a.cancel());
    rideActive = true;
    rideStart = { x: curX, y: startY };
    rideEnd = { x: dx, y: dy };
    /* 时长按剩余行程算(半空接力时行程短、时长按比例短),速度与展开一致。
       曾试过过冲式弹性落位(--ease-spring),2026-07-27 移除:落点行上下都紧邻
       另一行、行距只有 83px,过冲 25px 时标题行会压到邻行上晃一下(用户读作
       「闪一下」),收到看不出闪的 2px 又已经完全读不出弹性 —— 这个场景没有
       可用区间,统一回 ease-out。 */
    const timing = morphTiming(Math.hypot(dx - curX, dy - startY));
    rideTiming = timing;
    const anims = els.map((el) =>
      el.animate(
        [
          { transform: `translate(${curX}px, ${startY}px)` },
          { transform: `translate(${dx}px, ${dy}px)` },
        ],
        { ...timing, fill: 'forwards' },
      ),
    );
    const collapseSvg = inActive<SVGSVGElement>('.page-collapse svg');
    if (collapseSvg) {
      /* 与展开对称:旋转压到位移时长的 ARROW_SPIN_RATIO,不拖 ease-out 的角度长尾 */
      anims.push(
        collapseSvg.animate([{ transform: 'rotate(135deg)' }, { transform: 'rotate(0deg)' }], {
          ...timing,
          duration: timing.duration * ARROW_SPIN_RATIO,
          fill: 'forwards',
        }),
      );
    }
    rideAnimsRef.current = anims;
    anims[0].onfinish = finishClose;
    return () => {
      clearTimeout(restoreTimer);
      if (fallbackTimer) clearTimeout(fallbackTimer);
      clearTitleRowInline(); // 中断兜底:fixed 残留会毁掉下一次展开
      /* 用 ref 而不是局部 anims:restore 时接力的 landAnim 也在 ref 里,一并清 */
      rideAnimsRef.current.forEach((a) => a.cancel());
      rideAnimsRef.current = [];
    };
  }, [modal]);

  /* 收尾的最后一步:模态内容卸载「提交完成后」才摘 home-restoring ——
     早一帧摘,模态内容会以无样式状态在首页下面闪现一下 */
  useEffect(() => {
    if (modal === null) {
      document.body.classList.remove('home-restoring', 'home-modal-riding');
    }
  }, [modal]);

  /* 模态打开期间:返回键(popstate)关闭;Esc 等价于按返回。
     Esc 只在历史条目还带 homeModal 时才 back —— 连按 Esc 时第二下已经 pop 过,
     再 back 会退出站点历史。 */
  useEffect(() => {
    if (!modal || modal.phase === 'closing') return;
    const onPop = () => setModal({ target: modal.target, phase: 'closing' });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && (history.state as { homeModal?: string } | null)?.homeModal)
        history.back();
    };
    window.addEventListener('popstate', onPop);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('keydown', onKey);
    };
  }, [modal]);

  /* 模态关闭后按浏览器「前进」会走回带 homeModal 的历史条目 —— 此时没有行位置可起飞,
     直接整页加载真实目标页,URL 与内容保持一致 */
  useEffect(() => {
    if (modal) return;
    const onPop = (e: PopStateEvent) => {
      if ((e.state as { homeModal?: string } | null)?.homeModal) location.reload();
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [modal]);

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
    // 重播入场时逐行 hover 闸门一并复位,由下方计时重挂
    document.querySelectorAll('.home-index-row.row-in').forEach((el) => el.classList.remove('row-in'));
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
    const timers: number[] = [];
    const markDone = () => {
      /* 逐行放开 hover:各行末字(箭头)淡入完成的时刻挂 .row-in,该行立即可交互,
         不陪最后一行等 entranceEnd。延迟公式与 JSX 里 --d 的错峰完全同源。 */
      document.querySelectorAll<HTMLElement>('.home-index-row').forEach((el, r) => {
        const chars = el.querySelectorAll('.heading-rise-char').length;
        const readyAt = BASE + r * ROW_STEP + (chars - 1) * CHAR_STEP + RISE_FADE;
        timers.push(window.setTimeout(() => el.classList.add('row-in'), readyAt));
      });
      timers.push(window.setTimeout(() => document.documentElement.classList.add('entrance-done'), entranceEnd));
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
      timers.forEach((t) => clearTimeout(t));
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
              onClick={
                row.href === 'blog.html'
                  ? openModal('blog')
                  : row.href === 'archive.html'
                    ? openModal('archive')
                    : undefined
              }
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
      {/* Blog / Archive 全屏模态:与首页同住 #app,body.blog-page / works-page 让线上样式原样生效。
          整块位移方案:标题/收起箭头从首帧就显形 —— 它们起步时与被点击的行像素重合,
          本身就是行文字/行箭头的延续('revealed' = 瞬时显形,不播逐字入场) */}
      {/* Blog / Archive 全屏模态:两页常驻挂载(预载完成后),用 display 切换激活 ——
          展开时内容早已加载完,直接展示、按 pillar 节奏依次升起。
          display:contents 让激活页的子项保持 #app 直接子级(works-page 的网格依赖
          这一点,rideEls 的 walker 也会穿透它);未激活的那页 display:none 不占布局,
          iframe 内的 rAF 循环被浏览器自动暂停,不耗帧。
          关闭后不卸载:滑出视口的卡片由 pillar 复位,再次展开照常重播入场且即点即现。
          标题/收起箭头从首帧就显形,它们是行文字/行箭头的延续。 */}
      {(preloaded || modal) && (
        <>
          <div
            className={modal?.target === 'blog' ? ACTIVE_CLASS : undefined}
            style={{ display: modal?.target === 'blog' ? 'contents' : 'none' }}
          >
            <BlogPage modalTitle="revealed" />
          </div>
          <div
            className={modal?.target === 'archive' ? ACTIVE_CLASS : undefined}
            style={{ display: modal?.target === 'archive' ? 'contents' : 'none' }}
          >
            <ArchivePage modalTitle="revealed" />
          </div>
        </>
      )}
    </>
  );
}
