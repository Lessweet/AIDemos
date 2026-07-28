/**
 * Blog 页(docs/blog.html 的 React 版)。DOM 结构与旧页逐类名一致;
 * 筛选逻辑 = writing.js initWritingFilter 的状态化移植(卡片日期倒序、hidden 显隐)。
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { blogCards, bySlug } from '../../content/articles';
import ArticlePage from '../article/ArticlePage';
import { ARTICLE_SHELL } from '../../content/articleShell';
import { CatIcon } from '../../shared/catIcons';
import PageTitle, { RISE_CHAR_STEP } from '../../shared/PageTitle';
import PageCollapse from '../../shared/PageCollapse';
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
  return Number.isFinite(v) && v > 0 ? v * 1000 : back ? 240 : 480;
};
/* 展开时标题走自己那一档(略快,先落位);其余三件用通档。
   收起不分档 —— 四件一起收更利落。 */
const morphMsFor = (kind: string) => {
  if (kind !== 'title') return morphMs();
  const v = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue('--article-morph-title-dur'),
  );
  return Number.isFinite(v) && v > 0 ? v * 1000 : 420;
};
/* 起步果断、尾段长收 —— 贴近参考里那种「一下就到位、最后轻轻停住」的手感。
   先前用的 easeOutQuad(0.25,0.46,0.45,0.94)全程温吞,起步不够干脆。 */
const COVER_EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';
/* 排版属性专用:两端略缓、中段匀速。字号变化要的是「一路缩下去」的过程感,
   不能像位移那样前段冲刺(见 flightAnims 的注释)。 */
const TYPE_EASE = 'cubic-bezier(0.4, 0.05, 0.35, 1)';
/* 字号专用:极陡的 ease-out(easeOutExpo 一路),约前四分之一时间走完八成变化。
   字号每变一帧就重排一帧,把这段抖动挤到起步、让收尾只剩纯位移(见 flightAnims)。 */
const TYPE_RUSH = 'cubic-bezier(0.16, 1, 0.3, 1)';
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
type PendingCover = {
  flyer: HTMLElement;
  anims: Animation[] | null;
  rest: { el: HTMLElement; kind: string; target: HTMLElement; anims: Animation[]; origin: Landing }[];
  /* 撤掉「等滚动」的监听但不交接 —— 收起时用。closeArticle 自己会 scrollTo 把
     位置归位,那一下同样会触发 scroll,不撤的话交接当场发生、四件被 unpin,
     原路飞回就没得飞了(2026-07-27 实测收起第一帧只剩封面还挂着)。 */
  disarm: () => void;
};

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

/* 封面交接。列表和文章用的是同一张静态图,落位那一刻两边像素级一致,所以交接
   本身已经不会被看见了。仍然延后到「滚动或收起」才做,是因为飞行件是 fixed:
   不交接就跟不上页面滚动。收起时压根不交接 —— 飞回去的还是同一份。 */
function handoffCover(
  target: HTMLElement | null,
  flyer: HTMLElement | null,
  anims: Animation[] | null,
  ref: { current: (() => void) | null },
  pending: { current: PendingCover | null },
  rest: { el: HTMLElement; kind: string; target: HTMLElement; anims: Animation[]; origin: Landing }[],
) {
  /* 真正的交接:目标显形、飞行件退场。不在落位那一刻做 —— 见下方 arm 的注释。 */
  const settle = () => {
    ref.current = null;
    pending.current = null;
    /* 文字三件:两边渲染完全一致(位置/字号/字重/颜色实测逐项相同),直接切,
       不需要淡入 —— 淡入反而会让同样的字重影一下。 */
    rest.forEach(({ el, target, anims: group }) => {
      target.style.visibility = '';
      group.forEach((a) => a.cancel());
      unpin(el);
      /* 落位时给卡片那份打的 visibility:hidden 要在这里摘 —— unpin 是按属性名
         正则剥内联样式的,不含 visibility。漏了的话这张卡的标题/标签/日期回到
         列表里仍然是隐形的。 */
      el.style.visibility = '';
    });
    if (!target) {
      anims?.forEach((a) => a.cancel());
      if (flyer) unpin(flyer);
      return;
    }
    target.style.visibility = '';
    /* 不做交叉淡入:两边是同一张静态图,像素级一致,淡入反而让同样的画面重影一下 */
    anims?.forEach((a) => a.cancel());
    if (flyer) unpin(flyer);
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
  const disarm = () => {
    clearTimeout(timer);
    if (onScroll) {
      window.removeEventListener('scroll', onScroll);
      onScroll = null;
    }
    ref.current = null;
    pending.current = null;
  };
  if (flyer) pending.current = { flyer, anims, rest, disarm };
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
  /* 动态封面在模态里彻底不用了(CSS 里 display:none),src 也就不必挂 ——
     data-src 留着不动,等于这一屏一个 shader 都不跑。 */
  arm();
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
    // 位移:合成器动画,零重排
    el.animate([{ transform: 'translate(0px, 0px)' }, { transform: shift }], geom),
    // 颜色:平滑插值。color 不触发重排,可以逐帧变
    el.animate([{ color: c.color }, { color: to.color }], {
      duration: dur,
      easing: TYPE_EASE,
      fill: 'both',
    }),
    /* 字号/行高/字距:每变一次就要重排一次文字,3x DPR 上逐帧变肉眼能看出抖。
       试过 steps 分档,更糟 —— 跳变比抖动显眼(2026-07-28 用户实测「太卡」)。
       现在仍连续变,但用极陡的 ease-out 把变化压到起步那一小段:那时位移最快、
       字最小,重排的抖动被大位移盖住;后半程字号已经到位,只剩纯 transform 位移,
       全程最显眼的收尾阶段是完全平滑的。
       为什么不用 transform: scale —— 那会把宽度一起放大 1.33 倍撑出容器,而两端
       容器同宽,文字的换行位置会全错。 */
    el.animate(
      [
        { fontSize: c.fontSize, lineHeight: c.lineHeight, letterSpacing: c.letterSpacing, width: `${from.width}px` },
        { fontSize: `${to.fs}px`, lineHeight: to.lh, letterSpacing: to.ls, width: `${to.width}px` },
      ],
      { duration: dur, easing: TYPE_RUSH, fill: 'both' },
    ),
  ];
}

/* modalTitle(来自首页模态那条线):首页模态内嵌时由 HomePage 传入 ——
   标题随整块从索引行位置平移上来,本身就是那行字的延续,不再自己播逐字升起:
   'held' = 位移期间按住,'revealed' = 瞬时显形。
   独立 blog.html 入口不传,标题走自己的 per-character rise,行为与线上一致。 */
export default function BlogPage({ modalTitle }: { modalTitle?: 'held' | 'revealed' }) {
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
  /* 尚未交接的封面(展开后没滚动过就收起时,直接拿它原路飞回) */
  const pendingCoverRef = useRef<PendingCover | null>(null);
  const flyingRef = useRef<{
    items: { el: HTMLElement; from: DOMRect; origin: Landing; kind: string }[];
  } | null>(null);
  const blogScrollRef = useRef(0);
  /* 全部走大封面卡片:不再分「大封面区 + 列表区」两种样式(2026-07-27 用户要求统一)。 */
  const cards = blogCards();
  /* 封面按端分型(2026-07-28 用户定):手机端静态图 —— 它和文章模态里的封面是
     同一张,联动落位像素级一致、没有换实例的跳变,顺带整页不跑 shader;
     桌面端保持动态封面(iframe/video)—— 桌面点卡片是普通跳转,没有模态联动,
     不需要陪着降级。断点切换时重渲染换型。 */
  const [isSmall, setIsSmall] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(SMALL_MQ).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia(SMALL_MQ);
    const update = () => setIsSmall(mq.matches);
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

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
    const items = (
      [
        [coverEl, 'cover'],
        [wrapper?.querySelector<HTMLElement>('.w-title, .bl-title') ?? null, 'title'],
        [wrapper?.querySelector<HTMLElement>('.a-tag') ?? null, 'tag'],
        [wrapper?.querySelector<HTMLElement>('.w-date, .bl-date') ?? null, 'date'],
      ] as [HTMLElement | null, string][]
    )
      .filter(([el]) => !!el)
      /* origin = pin 之前的完整排版快照(几何 + 字号/行高/字距/颜色)。收起时若这
         几件还没交接,就照着它原路飞回去,不必去 host 里重新找目标。 */
      .map(([el, kind]) => {
        const e = el as HTMLElement;
        return { el: e, from: e.getBoundingClientRect(), origin: readLanding(e), kind };
      });
    /* 槽位保高:四件一钉成 fixed 就脱离文档流,card-wrapper 会塌掉一个封面的
       高度,后面的卡片全体上移 —— 展开时 feed 整体隐藏看不见,收起时 feed 已恢复
       可见,用户看到的就是「快落位时飞行件压在下一张卡上」(2026-07-27 截图)。
       所以把 wrapper 锁在钉前的布局高度(offsetHeight,不受入场 transform 影响),
       流内留一个等高的洞;洞里剩下的散件(摘要等)连同 wrapper 一起藏掉(CSS
       .article-slot),飞行件单独放行 —— 列表其余部分纹丝不动,四件飞回洞里,
       落位即原样。锁在 finish() 里解。 */
    if (wrapper) {
      wrapper.style.height = `${wrapper.offsetHeight}px`;
      wrapper.classList.add('article-slot');
    }
    items.forEach(({ el, from }) => pin(el, from, '95')); // 95:低于顶栏(100)
    flyingRef.current = { items };

    const body = document.body;
    /* blog-page 一并保留:顶栏、主题切换、汉堡按钮的样式全按它(与 home-landing /
       works-page)枚举,摘掉就得逐条补 article-modal —— 先前那样做漏了主题按钮,
       按钮被压成 4px 挤到左上角。Blog 自己的 feed 网格由 .article-modal 的
       display:none 规则关掉即可(2026-07-27 用户:顶栏两个按钮要和首页一样)。 */
    /* 底色起点:先顶成「页面此刻真正的底色」,让 ::before 以它渲染一帧,下一帧再撤掉,
       颜色才有得过渡(见 writing.css 里同款注释)。
       取 body 的 computed 背景而不是 --site-bg —— 后者是浅色主题的固定值,深色主题下
       页面底其实是 #0a0a0a,写死浅色就会在展开第一帧闪一下白
       (2026-07-28 用户实测深色下「跳得扎眼」)。 */
    const startBg = getComputedStyle(body).backgroundColor;
    if (startBg && startBg !== 'rgba(0, 0, 0, 0)') body.style.setProperty('--page-tint', startBg);
    body.classList.add('writing-page', 'reading-page', 'article-modal');
    /* 文章封面的垫底图 = 卡片上那张,两边同图才能无缝落位。
       取 img 已解析的绝对地址,不要自己拼相对路径 —— pushState 之后文档 URL 变成
       /writing/article-x.html,相对基准跟着变,拼出来会是 writing/writing/...
       (2026-07-27 实测)。 */
    const stillSrc = coverEl.querySelector<HTMLImageElement>('img');
    const still = stillSrc?.currentSrc || stillSrc?.src;
    if (still) body.style.setProperty('--cover-still', `url("${still}")`);
    body.classList.add('article-morphing'); // 飞行期间:byline 里不飞的部分先不出现
    body.setAttribute('data-tint', shell.tint);
    if (shell.accent) body.setAttribute('data-accent', shell.accent);
    document.title = shell.title;
    history.pushState({ articleModal: slug }, '', `writing/${meta.file}`);
    /* behavior:'instant' 必须显式写:站点在 html 上设了 scroll-behavior: smooth
       (style.css,给锚点跳转用),不覆盖的话这次归零会变成一段平滑滚动 ——
       用户看到的就是「展开时页面自己在滚」(2026-07-27 实测滚动曲线在减速)。 */
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    /* 两帧后撤掉起点值,底色开始向该篇的 tint 过渡 */
    requestAnimationFrame(() =>
      requestAnimationFrame(() => body.style.removeProperty('--page-tint')),
    );
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
    /* 收起过程中创建的动画(反向飞回那批)。fill:'both' 会一直占着 transform 与
       颜色/字号,不清的话卡片落位后这些属性就被锁死,后续 CSS(hover、主题切换)
       全推不动 —— 实测收起后被点那张卡上残留 6 条(2026-07-28)。finish 里统一撤。 */
    const closingAnims: Animation[] = [];
    /* 封面若还没交接(展开后没滚动过),飞回去的就该是当初飞过来的那一份 ——
       它已经钉在封面位上,原路缩回卡片,全程没换过实例,零跳变。
       只有已经交接过(用户滚动过)才退回「拿文章封面飞」的老路。 */
    const pendingCover = pendingCoverRef.current;
    if (pendingCover) pendingCover.disarm();
    else handoffRef.current?.();

    const body = document.body;
    const slug = article?.slug;

    const finish = () => {
      closingAnims.forEach((a) => a.cancel());
      /* 槽位解锁(见 openArticle 里锁高的注释);与 unpin 同一同步块,不留空帧 */
      const slot = document.querySelector<HTMLElement>('.card-wrapper.article-slot');
      if (slot) {
        slot.style.height = '';
        slot.classList.remove('article-slot');
      }
      /* 原路飞回的那份要还原:它是 feed 里的真实节点,不还原就一直钉着 */
      if (pendingCover) {
        pendingCover.anims?.forEach((a) => a.cancel());
        unpin(pendingCover.flyer);
        pendingCover.rest.forEach(({ el, target, anims: g }) => {
          g.forEach((a) => a.cancel());
          unpin(el);
          el.style.visibility = ''; // 落位时打的 hidden(见 morph 的 onfinish)
          target.style.visibility = ''; // 文章那份随卸载消失,还原以免残留
        });
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
      body.style.removeProperty('--cover-still');
      document.title = 'VibeUX';
      articleHostRef.current = null;
      setHostReady(false);
      setArticle(null);
    };

    const host = articleHostRef.current;
    /* 动态版退场,露出底下那张静态图 —— 飞回卡片时两边又是同一张图。
       淡出时长与飞行同档(CSS 里定),落位时正好已经透明。 */
    host?.querySelector('.article-cover')?.classList.remove('cover-live');
    if (!host || !slug) {
      finish();
      window.scrollTo({ top: blogScrollRef.current, behavior: 'instant' as ScrollBehavior });
      return;
    }

    /* ① 释放所有还钉着的飞行件。它们是 fixed,不释放就不会跟着 host 一起淡,
       会一直挂在屏幕上;而且它们是 feed 里的真实节点,不还原列表就缺一块。
       落位时给卡片那份打过 visibility:hidden(见 morph 的 onfinish),unpin 按属性
       名剥内联样式、不含 visibility,得单独摘。 */
    const release = (el: HTMLElement) => {
      unpin(el);
      el.style.visibility = '';
    };
    if (pendingCover) {
      pendingCover.anims?.forEach((a) => a.cancel());
      release(pendingCover.flyer);
      pendingCover.rest.forEach(({ el, anims: g }) => {
        g.forEach((a) => a.cancel());
        release(el);
      });
      pendingCoverRef.current = null;
    }
    /* 文章侧四件在飞行期间被 visibility:hidden 罩着(封面到这一刻可能还罩着)。
       整篇要淡出,少一件就是画面上一个洞,统一放行。 */
    host
      .querySelectorAll<HTMLElement>(
        '.article-cover, .article-h1, .article-eyebrow .a-tag, .article-byline > span',
      )
      .forEach((el) => (el.style.visibility = ''));
    /* ② 先把模态整块就地钉成 fixed,再动 Blog 布局 —— 顺序不能反。
       article-closing 带着 .blog-article-host { height:0; overflow:hidden }(那是给
       Feed 让位用的),先收布局再量,量到的就是个零高盒子(实测 rect 高度 0),钉住它
       等于钉了个空盒,整屏全白(2026-07-28)。
       钉住之后 host 脱流,后面恢复 Feed 布局怎么重排都不会把它带偏。
       底色从 body::before 取 —— 页面底色画在那个伪元素上,body 自身
       background-color 是透明的(实测 rgba(0,0,0,0)),不铺底的话底下的 Feed 会从
       正文的空隙里透上来。也不能图省事用 --page-bg:那是深色主题的值(#0a0a0a),
       浅色下会铺出一块黑;::before 拿到的是当前主题 + 当前 data-tint 的最终底色。 */
    const hr = host.getBoundingClientRect();
    host.style.position = 'fixed';
    host.style.left = `${hr.left}px`;
    host.style.top = `${hr.top}px`;
    host.style.width = `${hr.width}px`;
    host.style.height = `${hr.height}px`;
    host.style.margin = '0';
    host.style.zIndex = '90';
    host.style.overflow = 'hidden';
    const pageBg = [
      getComputedStyle(body, '::before').backgroundColor,
      getComputedStyle(body).backgroundColor,
    ].find((c) => c && !/^rgba\(0, 0, 0, 0\)$|^transparent$/.test(c));
    host.style.background =
      pageBg ?? getComputedStyle(document.documentElement).getPropertyValue('--site-bg').trim();
    /* article-closing 会把 .article-reading 的直接子级整组 visibility:hidden ——
       那是给「四件飞回」设计的(内容让位、只留飞行件),改成整块淡出后这条会让正文
       当场消失、根本淡不起来。内联放行,压得住类选择器;host 随 finish 卸载,不用善后。 */
    host
      .querySelectorAll<HTMLElement>('.article-reading > *, .article-toc, .reader-list-toggle')
      .forEach((el) => (el.style.visibility = 'visible'));

    /* ③ Feed 就位,之后全程不再动一下 —— 用户要求「模态所有元素淡出后,下层的
       Feed 保持原位」。host 已经钉成 fixed,这一步的重排碰不到它。
       必须抢在淡出之前做:history.back() 会触发浏览器自带的 popstate 滚动恢复
       (scrollRestoration 默认 auto),不先把 Blog 布局收回来,页面会在淡出期间自己
       跳到文章深处(2026-07-28 实测冻帧停在正文中段的 PPT 截图那一屏)。
       槽位同时解锁,被点的那张卡这一刻就该正常待在 Feed 里。 */
    body.classList.add('article-closing');
    body.classList.remove('article-modal');
    window.scrollTo({ top: blogScrollRef.current, behavior: 'instant' as ScrollBehavior });
    document.querySelectorAll<HTMLElement>('.design-content .card-wrapper').forEach((el) => {
      el.classList.add('visible');
      el.dataset.entered = '1';
    });
    {
      const slot = document.querySelector<HTMLElement>('.card-wrapper.article-slot');
      if (slot) {
        slot.style.height = '';
        slot.classList.remove('article-slot');
      }
    }
    /* tint 不在这里摘 —— 页面底层的色彩交接 CSS 已经安排好了:
       body.writing-page.design-page.article-closing::before 会带 transition 渐变回
       --site-bg,时长与收起同档(见 writing.css 的注释)。
       试过在这里提前 removeAttribute('data-tint'),那反而是倒退:模态此刻还完全
       不透明,文章里吃 --page-tint 的元素会当场变色,等于在淡出的第一帧塞进一次跳变。
       留给 finish 摘就行,那时 ::before 已经渐变到位、模态也已经淡到 0。 */

    /* ④ 模态里所有元素同一条曲线、同一段时间一起淡 —— 不拆件、不做任何位移。
       关闭键 .article-modal-back 是 fixed + z101、挂在 host 外面,不单独收进来就会
       在整篇淡走之后还满不透明地杵在右上角(2026-07-28 用户实测「不对,是模态页
       整体所有元素同时淡出」)。
       收起不再做「封面/标题/标签/日期飞回卡片」的联动(2026-07-28 用户定):那套要
       飞行件逐项复刻卡片排版,还要在封面仍钉着(已脱流)的布局里量落点 —— 量到的
       卡片标题是 y=192(封面框内)而不是真实的 y=408,标题就飞进封面底下(封面
       z95 > 文字 z90)全程看不见,等解钉重排才跳到真位置,表现为「没有联动、闪一下
       出现」。
       曲线用 TYPE_EASE 而不是 COVER_EASE:后者是给位移调的、极度前重,实测 240ms
       里跑到 90ms 时 opacity 已经掉到 0.18,看着就是「唰一下没了」,正是要避开的
       那种闪。淡出要的是匀速的过程感。 */
    const fading: HTMLElement[] = [host];
    const backBtn = document.querySelector<HTMLElement>('.article-modal-back');
    if (backBtn) fading.push(backBtn);
    const outs = fading.map((el) =>
      el.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: morphMs(true),
        easing: TYPE_EASE,
        fill: 'both',
      }),
    );
    /* 刻意不并进 closingAnims —— finish 的第一件事就是把里面的动画全 cancel,
       而这两条的终态 opacity:0 正是靠 fill:'both' 顶着的:一 cancel 就当场弹回
       opacity:1,模态和关闭键在 React 卸载之前又整块显形一帧,表现为「关闭模态回到
       Feed 的瞬间闪动一下」(2026-07-28 用户实测)。
       落幕前顺手把 opacity 写成内联值,这样即便将来有谁去 cancel,它们也还是不可见。
       两者都随 finish 一起卸载,不用善后。 */
    outs[0].onfinish = () => {
      fading.forEach((el) => (el.style.opacity = '0'));
      finish();
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

    const pairs: {
      el: HTMLElement;
      kind: string;
      target: HTMLElement;
      anims: Animation[];
      origin: Landing;
    }[] = [];
    const anims: Animation[] = [];
    const hidden: HTMLElement[] = [];
    flying.items.forEach(({ el, from, origin, kind }) => {
      const target = targetOf(kind);
      if (!target) {
        /* 文章里没有这一件的落点(个别文章没做封面,fragment 里无 .article-cover,
           目前只有 app-shape-for-ai)。不飞,当场解钉回槽位(槽位 hidden 罩住)。
           不解钉的话它永远钉在 fixed 上,收起后悬浮在列表上盖住别的卡
           (2026-07-28 SiriAI 实测)。 */
        unpin(el);
        return;
      }
      const to = readLanding(target);
      if (!to.width || !to.height) return;
      /* 文章侧先藏起来,避免与飞行中的源元素重影 */
      target.style.visibility = 'hidden';
      hidden.push(target);
      const group = flightAnims(el, from, to, kind, morphMsFor(kind));
      anims.push(...group);
      pairs.push({ el, kind, target, anims: group, origin });
    });

    if (!anims.length) {
      done();
      return;
    }
    anims[anims.length - 1].onfinish = () => {
      /* 文字三件:落位即换脸 —— 文章侧显形、卡片那份就地藏起来。
         注意「藏」不是「解钉」:飞行件继续钉在原位、动画继续 fill 顶着,收起时
         原路飞回全靠它们(解钉的后果见 closeArticle 里那段长注释)。
         为什么要换:这三件曾经跟着封面一起延后到「滚动或收起」才交接,理由写的是
         「两边渲染一致,不如同一时机一起换」—— 那个「一致」靠不住,而且靠不住在
         一个很脆的地方。飞行件的落位宽度只由 fill:'both' 的动画顶着,底下压着
         pin() 写进去的卡片宽度(实测 256.95px,目标 382px);高度更是被 pin 锁死在
         卡片那一行(25px),flightAnims 从不动它。fill 一旦没顶住,元素当场回落到
         257px —— 24px 字号下标题正好断成两行,第二行还溢出 25px 的盒子压到 byline
         上。2026-07-28 用户在 iPhone 上实测到的正是这一幕:「标题一开始是两行的,
         上滑一点就自动变成 1 行」,而那一下「上滑」就是触发交接的 scroll;断行位置
         与 257px 逐字吻合。(iOS 具体哪一步没顶住没能在真机上定位 —— 桌面 Chromium
         复现不出,fill 顶得住。)
         真身是普通 DOM:没有内联宽度、不靠动画顶着、text-wrap 之类的属性也不用另
         行复刻,换行在任何引擎上都对。把「正确性依赖 WAAPI fill」这份脆弱整个去掉,
         而不是去追平某一条属性。 */
      pairs
        .filter((pr) => pr.kind !== 'cover')
        .forEach(({ el, target }) => {
          target.style.visibility = '';
          el.style.visibility = 'hidden';
        });
      /* 封面仍旧延后:它的实现五花八门(iframe/video/随机 time0),换实例必闪 ——
         理由见 handoffCover 里的长注释,等「滚动或收起」再换。
         文字三件照旧留在 rest 里:收起要靠它们原路飞回(见 closeArticle 的注释)。 */
      const cover = pairs.find((pr) => pr.kind === 'cover');
      handoffCover(
        cover?.target ?? null,
        cover?.el ?? null,
        cover?.anims ?? null,
        handoffRef,
        pendingCoverRef,
        pairs.filter((pr) => pr.kind !== 'cover'),
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
    /* 交接没完成之前,四件的动画一条都不能 cancel —— 它们的终态全靠 fill 顶着,
       一取消就当场弹回卡片原位,而文章那份还 visibility:hidden,等于这一件直接
       从画面上消失。先前这里只放过了 cover,于是 morph→open 那次 cleanup 就把
       标题/tag/日期的动画全撤了(2026-07-27 实测收起第一帧标题已在卡片位)。 */
    return () =>
      pairs.forEach(({ anims: group }) => {
        if (handoffRef.current) return;
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
      <div className="page-title-row">
        <PageTitle text="Blog" held={!!modalTitle} revealed={modalTitle === 'revealed'} />
        <PageCollapse
          modal={!!modalTitle}
          held={modalTitle === 'held'}
          riseDelay={4 * RISE_CHAR_STEP}
        />
      </div>
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
                  {/* 手机端 = 静态图(与文章模态同一张,联动零跳变);
                      桌面端 = 动态封面,无 blogCover 的少数篇用静态图兜底 */}
                  {isSmall || !a.blogCover ? (
                    <img
                      src={`writing/${a.cardCover ?? a.listCover}`}
                      alt=""
                      /* 不能用 loading="lazy":首页把 BlogPage 常驻挂载在 display:none 的
                         容器里做预载(见 HomePage 那段注释),而 lazy 图在不可见容器里
                         永远不触发下载 —— 视频没有 lazy 所以照常预载,封面却被挡在门外,
                         点进 Blog 才现拉(2026-07-28 用户报「封面加载不出来」)。
                         压到 webp 后十张合计 540KB,eager 全量拉也很轻。 */
                      decoding="async"
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
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
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
