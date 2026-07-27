/**
 * Blog 页(docs/blog.html 的 React 版)。DOM 结构与旧页逐类名一致;
 * 筛选逻辑 = writing.js initWritingFilter 的状态化移植(卡片日期倒序、hidden 显隐)。
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { blogCards, bySlug } from '../../content/articles';
import ArticlePage from '../article/ArticlePage';
import { ARTICLE_SHELL } from '../../content/articleShell';
import { CatIcon } from '../../shared/catIcons';
import PageTitle from '../../shared/PageTitle';
import {
  useStickyMenu,
  useScrollProgress,
  usePillarEntrance,
  useHeaderAlwaysVisible,
  useScrollLag,
  useHideNavOnScrollMobile,
  useAppReady,
} from '../../shared/hooks';

type Filter = 'all' | 'ui' | 'product';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'ui', label: 'UI' },
  { key: 'product', label: 'Product' },
];

const SMALL_MQ = '(max-width: 800px)';

/* ── Blog → 文章详情 全屏模态(feat/article-modal)──
   点卡片不跳页:同文档内换成阅读页外壳、就地挂载 ArticlePage,封面从被点卡片的
   位置放大到详情页的通栏 hero 位置(FLIP),正文随后依次上移入场。
   morph = 封面放大中;open = 已就位;closing = 反向收起。 */
type ArticleState = { slug: string; phase: 'morph' | 'open' | 'closing' } | null;

/* 封面放大的时长与缓动。ease-out:点击立即起步、末端滑行落位。
   420ms:620 实测偏慢(2026-07-27 用户「要更快」)—— 手机端位移距离本来就短,
   放大要跟手。 */
/* 飞行时长的真值在 style.css 的 --article-morph-dur / --article-morph-back-dur ——
   顶栏底色的过渡也读它们,两处同步才不会「颜色先到位、元素还在飞」。
   展开与收起分两档:收起是让路,比展开快(见 style.css 那里的注释)。 */
const morphMs = (back = false) => {
  const v = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue(
      back ? '--article-morph-back-dur' : '--article-morph-dur',
    ),
  );
  return Number.isFinite(v) && v > 0 ? v * 1000 : back ? 240 : 340;
};
/* 起步果断、尾段长收 —— 贴近参考里那种「一下就到位、最后轻轻停住」的手感。
   先前用的 easeOutQuad(0.25,0.46,0.45,0.94)全程温吞,起步不够干脆。 */
const COVER_EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';
/* 排版属性专用:两端略缓、中段匀速。字号变化要的是「一路缩下去」的过程感,
   不能像位移那样前段冲刺(见 flightAnims 的注释)。 */
const TYPE_EASE = 'cubic-bezier(0.4, 0.05, 0.35, 1)';
/* 模态只在手机端(SMALL_MQ)启用 —— 桌面点卡片照常跳转到独立文章页,那边是
   「左列表 + 右正文」的两栏阅读布局(2026-07-27 用户定)。 */


/* 一段飞行的关键帧。封面是 iframe,只能用 transform scale(重排 iframe 太贵);
   标题两端字号差一倍(18→36)且换行位置不同,scale 到落位那一帧字号会猛跳一截
   —— 用户实测「看着是两套」。所以文字改成真动 font-size / width,让它一路真实
   重排,落位与目标逐像素吻合;代价是每帧重排一个元素,420ms 内可接受。 */
/* 文章侧的日期:fragment 里 byline 是 <div.article-eyebrow> + 裸 <span>日期 +
   <span>阅读时长,日期没有 class。取 byline 下第一个不在 eyebrow 里的 span。 */
function articleDateEl(host: HTMLElement): HTMLElement | null {
  const byline = host.querySelector('.article-byline');
  if (!byline) return null;
  return (
    [...byline.querySelectorAll<HTMLElement>(':scope > span')].find(
      (el) => !el.closest('.article-eyebrow'),
    ) ?? null
  );
}

/* 落位后还钉在封面位、尚未交接的那份卡片封面。收起时直接拿它原路飞回去,
   连交接都不用发生 —— 见 handoffCover 里 arm 的注释。 */
type PendingCover = { flyer: HTMLElement; anims: Animation[] | null };

/* 飞行件复位:摘掉钉住用的内联样式,让它回到自己原本的排版里。 */
function unpin(el: HTMLElement) {
  el.classList.remove('article-flying-el');
  el.style.cssText = el.style.cssText
    .replace(/position:[^;]+;?/, '')
    .replace(/left:[^;]+;?/, '')
    .replace(/top:[^;]+;?/, '')
    .replace(/width:[^;]+;?/, '')
    .replace(/height:[^;]+;?/, '')
    .replace(/margin:[^;]+;?/, '')
    .replace(/z-index:[^;]+;?/, '')
    .replace(/transform-origin:[^;]+;?/, '')
    .replace(/transition:[^;]+;?/, '');
}

/* 把 from 里每条 CSS 动画的进度抄到 to 的同一条上。跨域会抛 SecurityError
   (本站封面同源,不会走到),文档没就绪时列表为空,都按「同步不了」处理。 */
function syncCoverAnimations(from: HTMLIFrameElement | null, to: HTMLIFrameElement | null) {
  if (!from || !to) return;
  try {
    const a = from.contentDocument?.getAnimations?.() ?? [];
    const b = to.contentDocument?.getAnimations?.() ?? [];
    if (!a.length || a.length !== b.length) return;
    b.forEach((anim, i) => {
      try {
        anim.currentTime = a[i].currentTime;
      } catch {
        /* 单条对不上不影响其他 */
      }
    });
  } catch {
    /* 拿不到 contentDocument:放弃同步,交叉淡入兜底 */
  }
}

/* 动态封面是 canvas shader,不是 CSS 动画:内部有个 shaderTime,从 HERO_CFG.time0
   起按 __shaderRate(0.9)每秒推进,由自己的 rAF 驱动。两个实例各自从 time0 开始,
   相位差 = 各自已运行的时长 —— 交接时就是用户说的「卡一下,从另一帧跳到另一帧」。
   shaderTime 是闭包变量,外面改不了;但 time0 写在文档内联的 HERO_CFG 里,只要在
   解析前改掉就行。封面是自包含的单文件(80K,无外部资源),所以取回文本、把 time0
   换成卡片此刻的进度、用 srcdoc 挂上去 —— 新实例睁眼就在正确的相位上,是真的接着
   播。取文本在飞行一开始就发,340ms 的飞行足够盖掉这次请求(还走缓存)。
   列表行的缩略图是静态 png,没有源 iframe 可读,拿不到进度,只能交给交叉淡入。 */
function coverPhase(win: (Window & { HERO_CFG?: { time0?: number }; __shaderRate?: number }) | null) {
  const base = win?.HERO_CFG?.time0;
  if (win == null || typeof base !== 'number') return null;
  const rate = typeof win.__shaderRate === 'number' ? win.__shaderRate : 0.9;
  return base + rate * (win.performance.now() / 1000);
}

/* 封面交接。三件事:

   ① iframe 的 src 到这一刻才挂上。它和卡片封面是同一个 HTML,但这是第二个实例,
      渲染要从零跑一遍(实测 40~50ms 一帧);飞行期间不加载,这一帧就落在静止
      状态下,看不出来。

   ② 能对齐进度的就对齐:<video> 直接把 currentTime 抄过去,接着放而不是从头。

   ③ 对不齐的交叉淡入。动态封面(iframe)里跑的是它自己的 CSS/JS 动画,没有
      外部接口能把进度设过去,两个实例必然各播各的;列表行的缩略图更是静态图,
      和动态封面根本不同源。硬切就是用户说的「卡一下,从另一帧跳到另一帧」。
      淡入盖不住内容不同,但盖得住那一下硬切。 */
function handoffCover(
  target: HTMLElement | null,
  flyer: HTMLElement | null,
  anims: Animation[] | null,
  ref: { current: (() => void) | null },
  html: Promise<string | null> | null,
  pending: { current: PendingCover | null },
) {
  /* 真正的交接:目标显形、飞行件退场。不在落位那一刻做 —— 见下方 arm 的注释。 */
  const settle = () => {
    ref.current = null;
    pending.current = null;
    if (!target) {
      anims?.forEach((a) => a.cancel());
      if (flyer) unpin(flyer);
      return;
    }
    /* 能同步的先同步,别只靠淡入盖 */
    const src = flyer?.querySelector<HTMLVideoElement>('video');
    const dst = target.querySelector<HTMLVideoElement>('video');
    if (src && dst && Number.isFinite(src.currentTime)) {
      try {
        dst.currentTime = src.currentTime;
      } catch {
        /* 元数据还没就绪就设 currentTime 会抛,忽略即可 —— 下面的淡入照样兜底 */
      }
    }
    syncCoverAnimations(
      flyer?.querySelector<HTMLIFrameElement>('iframe') ?? null,
      target.querySelector<HTMLIFrameElement>('iframe'),
    );
    target.style.visibility = '';
    const fade = target.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 180,
      easing: 'ease-out',
    });
    if (flyer) {
      flyer.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, easing: 'ease-out' });
      fade.onfinish = () => {
        anims?.forEach((a) => a.cancel());
        unpin(flyer);
        flyer.style.opacity = '';
      };
    } else {
      anims?.forEach((a) => a.cancel());
    }
  };
  const iframe = target?.querySelector<HTMLIFrameElement>('iframe[data-src]');
  /* 落位不交接。封面的实现五花八门:只有两个封面把 time0 写成字面量能被注入相位,
     有的 time0 每次随机、有的连 CFG 都没有,还有 <video> —— 换实例就必然闪一下
     (用户实测「下面的卡片都是淡入淡出」「视频封面会闪」)。
     所以落位后让卡片自己那份继续钉在封面位顶着,等两件事之一发生才换:
       · 用户滚动 —— 封面正在离开视野、眼睛也跟着动,这一下最不容易被看见;
       · 收起 —— 那就根本不用换,飞回去的还是同一份,全程零跳变。
     不滚动就直接收起的话,这次展开自始至终没有换过实例。 */
  let armed = false;
  let onScroll: (() => void) | null = null;
  const done = () => {
    clearTimeout(timer);
    if (onScroll) window.removeEventListener('scroll', onScroll);
    settle();
  };
  /* ref 始终是「立即收尾」的语义 —— closeArticle 拿它把交接一次性了结。
     布置滚动监听是 arm 干的事,由 load / 超时触发,不走 ref。 */
  ref.current = done;
  if (flyer) pending.current = { flyer, anims };
  const arm = () => {
    if (armed) return;
    armed = true;
    clearTimeout(timer);
    onScroll = () => {
      onScroll = null;
      settle();
    };
    window.addEventListener('scroll', onScroll, { passive: true, once: true });
  };
  /* 没有待挂载的 iframe(封面是 <video>,或 fragment 结构没被 deferCover 命中):
     没有「等它画出来」这一步,直接进入等滚动的状态。 */
  const timer = window.setTimeout(arm, 900);
  if (!iframe) {
    arm();
    return;
  }
  iframe.addEventListener(
    'load',
    // 再等两帧:load 只说明文档就绪,封面自己的首帧还没画上去
    () => requestAnimationFrame(() => requestAnimationFrame(arm)),
    { once: true },
  );
  const raw = iframe.dataset.src ?? '';
  iframe.removeAttribute('data-src');
  const phase = coverPhase(
    (flyer?.querySelector<HTMLIFrameElement>('iframe')?.contentWindow ?? null) as never,
  );
  /* 挂源这件事不能受交接状态影响:先前这里写了 if (fired) return,超时一旦先到,
     iframe 就再也拿不到源、封面全白(2026-07-27 实测 srcdoc 和 src 都是空的)。
     交接早晚是观感问题,没有源是功能没了。 */
  void (async () => {
    if (html && phase != null) {
      const text = await html.catch(() => null);
      const patched = text?.replace(/"time0":\s*[0-9.]+/, `"time0":${phase.toFixed(2)}`);
      // patched === text 说明没找到 time0 字段(封面换了写法),退回原路
      if (text && patched && patched !== text) {
        iframe.srcdoc = patched;
        return;
      }
    }
    iframe.src = raw; // 对不齐相位:照常加载,交叉淡入兜底
  })();
}

/* 把元素就地钉成 fixed。left/top 直接写视口坐标是不够的:只要任何一个祖先带了
   transform / filter / will-change,它就成了 fixed 的包含块,坐标会相对它算 ——
   Blog 列表行的入场动画正是这种,实测飞行件跑到视口外 2400px 处(2026-07-27)。
   所以钉完再量一次,把偏差反补回去。校正分两趟做(先全钉、再全补),避免
   读写交替反复触发重排。 */
function pin(el: HTMLElement, r: DOMRect, z: string) {
  el.style.position = 'fixed';
  el.style.left = `${r.left}px`;
  el.style.top = `${r.top}px`;
  el.style.width = `${r.width}px`;
  el.style.height = `${r.height}px`;
  el.style.margin = '0';
  el.style.zIndex = z;
  el.style.transformOrigin = 'top left';
  /* 关掉 transition:卡片带着按下反馈的 transform 过渡,飞行归 WAAPI 管,
     两者叠在同一个属性上会在起飞和复位时各自抢一下。 */
  el.style.transition = 'none';
  el.classList.add('article-flying-el');
}
function correctPin(el: HTMLElement, r: DOMRect) {
  const now = el.getBoundingClientRect();
  const dx = now.left - r.left;
  const dy = now.top - r.top;
  if (Math.abs(dx) > 0.5) el.style.left = `${r.left - dx}px`;
  if (Math.abs(dy) > 0.5) el.style.top = `${r.top - dy}px`;
}

type Landing = {
  left: number;
  top: number;
  width: number;
  height: number;
  fs: number;
  lh: string;
  ls: string;
  color: string;
};
function readLanding(el: HTMLElement): Landing {
  const r = el.getBoundingClientRect();
  const c = getComputedStyle(el);
  return {
    left: r.left,
    top: r.top,
    width: r.width,
    height: r.height,
    fs: parseFloat(c.fontSize),
    lh: c.lineHeight,
    ls: c.letterSpacing,
    color: c.color,
  };
}

/* 一段飞行拆成两条曲线,作用在同一个元素的不同属性上:

   · 几何(transform)走 COVER_EASE —— 起步果断,位移要跟手。
   · 排版(字号/行高/字距/宽度/颜色)走 TYPE_EASE —— 均匀得多。字号如果跟着
     果断曲线走,前 30% 时间就跑完 70% 的变化,看起来是「唰一下变小然后慢慢挪」,
     用户实测收起时「标题没有联动缩小的过程」正是这个(36px→20px 只用了 72ms)。

   封面是 iframe/video,只能用 transform scale(重排它太贵);文字则真动 font-size,
   一路真实重排,落位与目标逐像素吻合。颜色也在这里插值 —— 卡片上的 tag 和日期
   是 #969696,文章里是 #1a1a1a,不插值就是交接瞬间硬切一下。 */
function flightAnims(
  el: HTMLElement,
  from: DOMRect,
  to: Landing,
  kind: string,
  dur: number,
): Animation[] {
  const shift = `translate(${to.left - from.left}px, ${to.top - from.top}px)`;
  const geom = { duration: dur, easing: COVER_EASE, fill: 'both' as FillMode };
  if (kind === 'cover') {
    return [
      el.animate(
        [
          { transform: 'translate(0px, 0px) scale(1, 1)' },
          { transform: `${shift} scale(${to.width / from.width}, ${to.height / from.height})` },
        ],
        geom,
      ),
    ];
  }
  const c = getComputedStyle(el);
  return [
    el.animate([{ transform: 'translate(0px, 0px)' }, { transform: shift }], geom),
    el.animate(
      [
        {
          fontSize: c.fontSize,
          lineHeight: c.lineHeight,
          letterSpacing: c.letterSpacing,
          width: `${from.width}px`,
          color: c.color,
        },
        {
          fontSize: `${to.fs}px`,
          lineHeight: to.lh,
          letterSpacing: to.ls,
          width: `${to.width}px`,
          color: to.color,
        },
      ],
      { duration: dur, easing: TYPE_EASE, fill: 'both' },
    ),
  ];
}

export default function BlogPage() {
  const [filter, setFilter] = useState<Filter>('all');
  const [article, setArticle] = useState<ArticleState>(null);
  const articleHostRef = useRef<HTMLDivElement | null>(null);
  const [hostReady, setHostReady] = useState(false);
  /* 飞行中的源元素(卡片自己的封面/标题/标签)。
     关键:动的必须是卡片上那一份,不是文章里的新元素 —— 动态封面是 iframe,
     两份 iframe 的动画进度不同步,让新元素从卡片位置放大,一眼就能看出是两个东西
     (2026-07-27 用户实测「能看出没有联动,是两个独立的」)。 */
  /* 封面交接的「立即完成」句柄:iframe 画完或超时后自行清空 */
  const handoffRef = useRef<(() => void) | null>(null);
  /* 封面 HTML 的取回:飞行一开始就发,落位时用来注入对齐后的 time0 */
  const coverHtmlRef = useRef<Promise<string | null> | null>(null);
  /* 尚未交接的封面(展开后没滚动过就收起时,直接拿它原路飞回) */
  const pendingCoverRef = useRef<PendingCover | null>(null);
  const flyingRef = useRef<{ items: { el: HTMLElement; from: DOMRect; kind: string }[] } | null>(null);
  const blogScrollRef = useRef(0);
  /* 全部走大封面卡片:不再分「大封面区 + 列表区」两种样式(2026-07-27 用户要求统一)。
     顺带解决了列表式那套的一个硬伤 —— 它的缩略图是静态 png,而文章封面是动态的,
     展开时必然看见一次内容切换,没法像大卡片那样对齐相位。 */
  const cards = blogCards();

  /* 打开文章(仅手机端):记录封面起飞几何 → 换外壳 → 挂载阅读页 → 下一相做 FLIP。
     桌面端返回 false,调用方不拦截点击,照常跳转到独立文章页 —— 那边是「左列表 +
     右正文」的两栏阅读布局,信息密度和上下文都比全屏模态好(2026-07-27 用户定)。 */
  const openArticle = (slug: string, coverEl: HTMLElement) => {
    if (article) return;
    const shell = ARTICLE_SHELL[slug];
    const meta = bySlug(slug);
    if (!shell || !meta) return; // 注册表外:交回普通跳转

    /* 返回时要回到的 Blog 滚动位置:必须在 scrollIntoView 之前记 —— 之后记的是
       被卡片滚动改写过的位置(2026-07-27 实测 371 → 19) */
    blogScrollRef.current = window.scrollY;
    /* 不做 scrollIntoView:那一下 320ms 的平滑滚动会被看成「展开时页面自己在滚」
       (2026-07-27 用户实测「有的文章展开会页面滚动」—— 正是视口外的卡片触发的)。
       卡片在视口外也无妨:FLIP 起点就在那个方向的屏幕外,封面从那儿飞入,
       方向感反而是对的。 */
    /* 把卡片的封面/标题/标签就地钉成 fixed:位置不变、脱离流,后面 Blog 内容隐藏
       时它们仍留在屏幕上继续飞。不搬 DOM —— 封面是 iframe,一移动就会重新加载。 */
    const wrapper = coverEl.closest<HTMLElement>('.card-wrapper');
    /* 卡片封面是 iframe 时,现在就把它的 HTML 取回来(走缓存),落位时要用它注入
       对齐后的 time0(见 handoffCover)。列表行是 <img>,没有可对齐的源,跳过。 */
    const srcFrame = coverEl.querySelector<HTMLIFrameElement>('iframe');
    coverHtmlRef.current = srcFrame?.src
      ? fetch(srcFrame.src)
          .then((r) => (r.ok ? r.text() : null))
          .catch(() => null)
      : null;
    const items = (
      [
        [coverEl, 'cover'],
        [wrapper?.querySelector<HTMLElement>('.w-title, .bl-title') ?? null, 'title'],
        [wrapper?.querySelector<HTMLElement>('.a-tag') ?? null, 'tag'],
        [wrapper?.querySelector<HTMLElement>('.w-date, .bl-date') ?? null, 'date'],
      ] as [HTMLElement | null, string][]
    )
      .filter(([el]) => !!el)
      .map(([el, kind]) => ({ el: el as HTMLElement, from: (el as HTMLElement).getBoundingClientRect(), kind }));
    items.forEach(({ el, from }) => pin(el, from, '95')); // 95:低于顶栏(100)
    flyingRef.current = { items };

    const body = document.body;
    /* blog-page 一并保留:顶栏、主题切换、汉堡按钮的样式全按它(与 home-landing /
       works-page)枚举,摘掉就得逐条补 article-modal —— 先前那样做漏了主题按钮,
       按钮被压成 4px 挤到左上角。Blog 自己的 feed 网格由 .article-modal 的
       display:none 规则关掉即可(2026-07-27 用户:顶栏两个按钮要和首页一样)。 */
    body.classList.add('writing-page', 'reading-page', 'article-modal');
    body.classList.add('article-morphing'); // 飞行期间:byline 里不飞的部分先不出现
    body.setAttribute('data-tint', shell.tint);
    if (shell.accent) body.setAttribute('data-accent', shell.accent);
    document.title = shell.title;
    history.pushState({ articleModal: slug }, '', `writing/${meta.file}`);
    /* behavior:'instant' 必须显式写:站点在 html 上设了 scroll-behavior: smooth
       (style.css,给锚点跳转用),不覆盖的话这次归零会变成一段平滑滚动 ——
       用户看到的就是「展开时页面自己在滚」(2026-07-27 实测滚动曲线在减速)。 */
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    /* 校正必须放在最后:带 transform 的祖先(列表行的入场动画)会随页面滚动,
       上面的归零一走,先前算好的 fixed 坐标又整体偏了两千像素。等布局全部
       落定再补(2026-07-27 实测 top 仍停在 2218)。 */
    items.forEach(({ el, from }) => correctPin(el, from));
    setArticle({ slug, phase: 'morph' });
  };

  /* 关闭:反向联动 —— 封面从通栏 hero 缩回被点的那张卡片,其余文章内容同时退场。
     做法上封面先转 fixed 钉在当前视觉位置,再恢复 Blog 布局(此时才量得到卡片的
     真实几何),最后 FLIP 回去。封面是 iframe,全程不搬动 DOM —— 一旦 appendChild
     到别处,iframe 会重新加载、画面闪空(2026-07-27)。 */
  const closeArticle = () => {
    /* 封面若还没交接(展开后没滚动过),飞回去的就该是当初飞过来的那一份 ——
       它已经钉在封面位上,原路缩回卡片,全程没换过实例,零跳变。
       只有已经交接过(用户滚动过)才退回「拿文章封面飞」的老路。 */
    const pendingCover = pendingCoverRef.current;
    if (!pendingCover) handoffRef.current?.();
    const body = document.body;
    const slug = article?.slug;

    const finish = () => {
      /* 原路飞回的那份要还原:它是 feed 里的真实节点,不还原就一直钉着 */
      if (pendingCover) {
        pendingCover.anims?.forEach((a) => a.cancel());
        unpin(pendingCover.flyer);
      }
      body.classList.remove(
        'writing-page',
        'reading-page',
        'article-modal',
        'article-closing',
        'article-morphing',
      );
      body.removeAttribute('data-tint');
      body.removeAttribute('data-accent');
      body.style.removeProperty('--page-tint');
      document.title = 'VibeUX';
      articleHostRef.current = null;
      setHostReady(false);
      setArticle(null);
    };

    const host = articleHostRef.current;
    if (!host || !slug) {
      finish();
      window.scrollTo({ top: blogScrollRef.current, behavior: 'instant' as ScrollBehavior });
      return;
    }

    /* ① 把文章侧的封面/标题/标签就地钉成 fixed:这三份继续留在屏幕上飞回卡片,
       同样保证全程只有一份可见(见 morph 处的注释)。 */
    const flyers = (
      [
        /* 封面:优先用还钉着的那份(见上),否则才用文章里的 */
        [pendingCover ? null : host.querySelector<HTMLElement>('.article-cover'), 'cover'],
        [host.querySelector<HTMLElement>('.article-h1'), 'title'],
        [host.querySelector<HTMLElement>('.article-eyebrow .a-tag'), 'tag'],
        [articleDateEl(host), 'date'],
      ] as [HTMLElement | null, string][]
    )
      .filter(([el]) => !!el)
      /* 先把三份几何全测完再钉 —— 边测边钉会互相污染:封面一旦脱流,后面的标题
         当场上移一个封面高(实测 203px),起点就量歪了(2026-07-27)。 */
      .map(([el, kind]) => ({ el: el as HTMLElement, from: (el as HTMLElement).getBoundingClientRect(), kind }))
      .map(({ el, from, kind }) => {
        pin(el, from, '90'); // 90:低于顶栏(100),缩回时从顶栏下穿过
        return { el, from, kind };
      });


    /* ② 其余文章内容退场 + 恢复 Blog 布局与滚动位置 */
    body.classList.add('article-closing');
    body.classList.remove('article-modal');
    /* 同上:瞬时归位,否则收起时页面又会平滑滚一段 */
    window.scrollTo({ top: blogScrollRef.current, behavior: 'instant' as ScrollBehavior });
    /* 同展开:等 Blog 布局与滚动都恢复完再补 fixed 坐标的偏差 */
    flyers.forEach(({ el, from }) => correctPin(el, from));

    /* ③ 量目标卡片 —— 必须在 Blog 布局恢复之后 */
    const wrapper = document.querySelector<HTMLElement>(`.card-wrapper[data-slug="${slug}"]`);
    const landing = (kind: string) =>
      kind === 'cover'
        ? (wrapper?.querySelector<HTMLElement>('.writing-card') ??
          wrapper?.querySelector<HTMLElement>('.bl-thumb') ??
          null)
        : kind === 'title'
          ? (wrapper?.querySelector<HTMLElement>('.w-title, .bl-title') ?? null)
          : kind === 'tag'
            ? (wrapper?.querySelector<HTMLElement>('.a-tag') ?? null)
            : (wrapper?.querySelector<HTMLElement>('.w-date, .bl-date') ?? null);

    const anims: Animation[] = [];
    const hidden: HTMLElement[] = [];
    flyers.forEach(({ el, from, kind }) => {
      const target = landing(kind);
      if (!target) return;
      const to = readLanding(target);
      if (!to.width || !to.height) return;
      target.style.visibility = 'hidden'; // 落位前卡片这份不露脸
      hidden.push(target);
      /* 收起不需要延迟交接:文章封面早画好了,飞的就是它 */
      anims.push(...flightAnims(el, from, to, kind, morphMs(true)));
    });

    /* 还钉着的那份:不重新量几何 —— 它现在的位置就是展开动画的终态,
       直接从当前 transform 补一段回到 translate(0,0)(pin 时的 left/top
       就是卡片原位)。不能先 cancel 展开动画再量,cancel 会撤掉 fill、
       当场弹回卡片位。 */
    if (pendingCover) {
      const el = pendingCover.flyer;
      const from = getComputedStyle(el).transform;
      anims.push(
        el.animate(
          [{ transform: from === 'none' ? 'translate(0px, 0px) scale(1, 1)' : from }, { transform: 'translate(0px, 0px) scale(1, 1)' }],
          { duration: morphMs(true), easing: COVER_EASE, fill: 'both' },
        ),
      );
      pendingCoverRef.current = null;
      handoffRef.current = null;
    }

    if (!anims.length) {
      hidden.forEach((el) => (el.style.visibility = ''));
      finish();
      return;
    }
    anims[anims.length - 1].onfinish = () => {
      hidden.forEach((el) => (el.style.visibility = ''));
      finish(); // 文章整体卸载,飞行件随之消失
    };
  };

  /* morph:让「卡片自己的那份元素」飞到文章里对应元素的位置,落位瞬间交接。
     文章侧的对应元素在飞行期间保持隐藏,落位同帧显形 —— 全程只有一份可见,
     所以动态封面的 iframe 不会出现两份不同步的画面。 */
  useLayoutEffect(() => {
    if (article?.phase !== 'morph' || !hostReady) return;
    const flying = flyingRef.current;
    const host = articleHostRef.current;
    const done = () => setArticle({ slug: article.slug, phase: 'open' });
    if (!flying || !host) {
      done();
      return;
    }
    const targetOf = (kind: string) =>
      kind === 'cover'
        ? host.querySelector<HTMLElement>('.article-cover')
        : kind === 'title'
          ? host.querySelector<HTMLElement>('.article-h1')
          : kind === 'tag'
            ? host.querySelector<HTMLElement>('.article-eyebrow .a-tag')
            : articleDateEl(host);

    const pairs: { el: HTMLElement; kind: string; target: HTMLElement; anims: Animation[] }[] = [];
    const anims: Animation[] = [];
    const hidden: HTMLElement[] = [];
    flying.items.forEach(({ el, from, kind }) => {
      const target = targetOf(kind);
      if (!target) return;
      const to = readLanding(target);
      if (!to.width || !to.height) return;
      /* 文章侧先藏起来,避免与飞行中的源元素重影 */
      target.style.visibility = 'hidden';
      hidden.push(target);
      const group = flightAnims(el, from, to, kind, morphMs());
      anims.push(...group);
      pairs.push({ el, kind, target, anims: group });
    });

    if (!anims.length) {
      done();
      return;
    }
    anims[anims.length - 1].onfinish = () => {
      /* 同一同步块内交接:文章侧显形、飞行件复位,中间不留可见帧。
         封面例外 —— 它的 iframe 到这一刻才开始加载(飞行期间被摘了 src),
         这会儿交接等于换上一张白图。留着飞行件顶在原位,等它画出来再换。 */
      pairs.forEach(({ el, kind, target, anims: group }) => {
        if (kind === 'cover') return;
        target.style.visibility = '';
        group.forEach((a) => a.cancel()); // 清掉 fill 保持的 transform,元素才能回到自己的排版
        unpin(el);
      });
      const cover = pairs.find((pr) => pr.kind === 'cover');
      handoffCover(
        cover?.target ?? null,
        cover?.el ?? null,
        cover?.anims ?? null,
        handoffRef,
        coverHtmlRef.current,
        pendingCoverRef,
      );
      flyingRef.current = null;
      /* byline 里不参与飞行的部分(阅读时长)在飞行期间被压住,落位后淡入 ——
         否则同一行里一半已就位、一半还在半路飞,读起来是两件事。
         走 WAAPI 而不是 CSS:这些 span 被上面的 guard 打了 transition:none
         !important(为了不让入场动画带偏日期),CSS 过渡在这里推不动。 */
      document.body.classList.remove('article-morphing');
      const landed = new Set<HTMLElement>(hidden); // 飞行目标:已经飞到位,不该再淡入一次
      host.querySelectorAll<HTMLElement>('.article-byline > span').forEach((el) => {
        if (landed.has(el)) return;
        el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: 'ease-out' });
      });
      done();
    };
    /* 封面若还挂着交接(handoffRef 非空),这里不能 cancel —— 它的终态全靠
       fill 顶着,一取消就当场弹回卡片原位,而文章封面还没显形,中间会空一帧
       (2026-07-27 实测 fly@72 跳回 fly@182)。 */
    return () =>
      pairs.forEach(({ kind, anims: group }) => {
        if (kind === 'cover' && handoffRef.current) return;
        group.forEach((a) => a.cancel());
      });
  }, [article, hostReady]);

  /* 返回键 / Esc 关闭 */
  useEffect(() => {
    if (!article) return;
    const onPop = () => closeArticle();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && (history.state as { articleModal?: string } | null)?.articleModal)
        history.back();
    };
    window.addEventListener('popstate', onPop);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article]);

  useAppReady();
  useHeaderAlwaysVisible();
  useStickyMenu();
  useScrollProgress();
  usePillarEntrance([cards.length]); // 卡片数变化后是新节点,入场系统需重新绑定
  useHideNavOnScrollMobile();
  useScrollLag();

  return (
    <>
      <PageTitle text="Blog" />
      <aside aria-label="Writing 分类" className="design-menu">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={'nav-cat' + (filter === f.key ? ' active' : '')}
            data-filter={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
          >
            <CatIcon kind={f.key} />
            {f.label}
          </button>
        ))}
      </aside>
      <div className="design-content">
        <section className="category-section" id="writing-all">
          <div className="category-grid">
            {cards.map((a) => (
              <div
                key={a.slug}
                className="card-wrapper"
                data-cat={a.cat}
                data-date={a.date}
                data-delay={a.blogDelay}
                data-slug={a.slug}
                hidden={!(filter === 'all' || a.cat === filter)}
              >
                <a
                  className="writing-card"
                  href={`writing/${a.file}`}
                  onClick={(e) => {
                    if (!window.matchMedia(SMALL_MQ).matches) return; // 桌面:照常跳转
                    e.preventDefault();
                    openArticle(a.slug, e.currentTarget);
                  }}
                >
                  {!a.blogCover ? (
                    /* 少数几篇没有做动态封面(voices / figma-agent / genie),
                       用阅读器那张缩略图填大封面位,object-fit 裁成同样的 16:9 */
                    <img
                      src={`writing/${a.listCover}`}
                      alt=""
                      loading="lazy"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  ) : a.blogCover.type === 'video' ? (
                    <video
                      autoPlay
                      loop
                      muted
                      playsInline
                      poster={a.blogCover.poster}
                      src={a.blogCover.src}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                  ) : (
                    <iframe
                      loading="lazy"
                      src={a.blogCover.src}
                      style={{
                        width: '100%',
                        height: '100%',
                        border: 0,
                        display: 'block',
                        pointerEvents: 'none',
                      }}
                    />
                  )}
                </a>
                <div className="card-info writing-info">
                  <h3 className="w-title">{a.title}</h3>
                  <div className="w-excerpt">{a.excerpt}</div>
                  <div className="w-meta">
                    <div className="w-tags">
                      <span className="a-tag">{a.blogTag}</span>
                    </div>
                    <div className="w-date">{a.date}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
      {/* 模态返回:顶栏左侧的返回箭头(模态时顶掉 logo 的位置)。固定在顶栏里,
          文章滚多深都点得到 —— 手机端最常见的关闭方式。 */}
      {article && (
        <button
          type="button"
          className="article-modal-back"
          aria-label="关闭文章"
          onClick={() => history.back()}
        >
          {/* 关闭叉:方头直角、currentColor、non-scaling-stroke —— 走全站 icon 规范 */}
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6 L18 18 M18 6 L6 18" />
          </svg>
        </button>
      )}
      {/* 文章层:与 Blog 内容同层替换(不叠第二层模态)。外层 div 顶替独立页的
          div.reading-layout#app —— 阅读页的布局测量、目录都挂在它上面 */}
      {article && (
        <div
          className="reading-layout blog-article-host"
          ref={(el) => {
            if (el && articleHostRef.current !== el) {
              articleHostRef.current = el;
              setHostReady(true); // 宿主到位后再渲染阅读器,embedHost 才不是 null
            }
          }}
        >
          {hostReady && <ArticlePage initialSlug={article.slug} embedHost={articleHostRef.current} />}
        </div>
      )}
    </>
  );
}
