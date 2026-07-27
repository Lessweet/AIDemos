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

/* 大封面数响应式(2026-07-22 定稿):桌面 12,小屏/手机(≤800px)6 */
const BIG_COVERS_DESKTOP = 12;
const BIG_COVERS_MOBILE = 6;
const SMALL_MQ = '(max-width: 800px)';

/* ── Blog → 文章详情 全屏模态(feat/article-modal)──
   点卡片不跳页:同文档内换成阅读页外壳、就地挂载 ArticlePage,封面从被点卡片的
   位置放大到详情页的通栏 hero 位置(FLIP),正文随后依次上移入场。
   morph = 封面放大中;open = 已就位;closing = 反向收起。 */
type ArticleState = { slug: string; phase: 'morph' | 'open' | 'closing' } | null;

/* 封面放大的时长与缓动。ease-out:点击立即起步、末端滑行落位。
   420ms:620 实测偏慢(2026-07-27 用户「要更快」)—— 手机端位移距离本来就短,
   放大要跟手。 */
const COVER_MORPH_MS = 420;
const COVER_EASE = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)';
/* 模态只在手机端(SMALL_MQ)启用 —— 桌面点卡片照常跳转到独立文章页,那边是
   「左列表 + 右正文」的两栏阅读布局(2026-07-27 用户定)。 */


/* 一段飞行的关键帧。封面是 iframe,只能用 transform scale(重排 iframe 太贵);
   标题两端字号差一倍(18→36)且换行位置不同,scale 到落位那一帧字号会猛跳一截
   —— 用户实测「看着是两套」。所以文字改成真动 font-size / width,让它一路真实
   重排,落位与目标逐像素吻合;代价是每帧重排一个元素,420ms 内可接受。 */
type Landing = { left: number; top: number; width: number; height: number; fs: number };
function flightFrames(el: HTMLElement, from: DOMRect, to: Landing, kind: string): Keyframe[] {
  const shift = `translate(${to.left - from.left}px, ${to.top - from.top}px)`;
  if (kind === 'cover') {
    return [
      { transform: 'translate(0px, 0px) scale(1, 1)' },
      { transform: `${shift} scale(${to.width / from.width}, ${to.height / from.height})` },
    ];
  }
  const fs = parseFloat(getComputedStyle(el).fontSize);
  return [
    { transform: 'translate(0px, 0px)', fontSize: `${fs}px`, width: `${from.width}px` },
    { transform: shift, fontSize: `${to.fs}px`, width: `${to.width}px` },
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
  const flyingRef = useRef<{ items: { el: HTMLElement; from: DOMRect; kind: string }[] } | null>(null);
  const blogScrollRef = useRef(0);
  const cards = blogCards();
  /* 大封面区展示前 N 篇(桌面 12/小屏 6),其后进列表区;
     文章按日期倒序,最新永远在大封面区最前 */
  const [bigCount, setBigCount] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia(SMALL_MQ).matches
      ? BIG_COVERS_MOBILE
      : BIG_COVERS_DESKTOP,
  );
  useEffect(() => {
    const mq = window.matchMedia(SMALL_MQ);
    const update = () => setBigCount(mq.matches ? BIG_COVERS_MOBILE : BIG_COVERS_DESKTOP);
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  const bigCards = cards.slice(0, bigCount);
  const listCards = cards.slice(bigCount);

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
    const items = (
      [
        [coverEl, 'cover'],
        [wrapper?.querySelector<HTMLElement>('.w-title, .bl-title') ?? null, 'title'],
        [wrapper?.querySelector<HTMLElement>('.a-tag') ?? null, 'tag'],
      ] as [HTMLElement | null, string][]
    )
      .filter(([el]) => !!el)
      .map(([el, kind]) => ({ el: el as HTMLElement, from: (el as HTMLElement).getBoundingClientRect(), kind }));
    items.forEach(({ el, from }) => {
      el.style.position = 'fixed';
      el.style.left = `${from.left}px`;
      el.style.top = `${from.top}px`;
      el.style.width = `${from.width}px`;
      el.style.height = `${from.height}px`;
      el.style.margin = '0';
      el.style.zIndex = '95'; // 低于顶栏(100)
      el.style.transformOrigin = 'top left';
      el.classList.add('article-flying-el'); // 配合 CSS 在隐藏的 feed 里单独露脸
    });
    flyingRef.current = { items };

    const body = document.body;
    /* blog-page 一并保留:顶栏、主题切换、汉堡按钮的样式全按它(与 home-landing /
       works-page)枚举,摘掉就得逐条补 article-modal —— 先前那样做漏了主题按钮,
       按钮被压成 4px 挤到左上角。Blog 自己的 feed 网格由 .article-modal 的
       display:none 规则关掉即可(2026-07-27 用户:顶栏两个按钮要和首页一样)。 */
    body.classList.add('writing-page', 'reading-page', 'article-modal');
    body.setAttribute('data-tint', shell.tint);
    if (shell.accent) body.setAttribute('data-accent', shell.accent);
    document.title = shell.title;
    history.pushState({ articleModal: slug }, '', `writing/${meta.file}`);
    /* behavior:'instant' 必须显式写:站点在 html 上设了 scroll-behavior: smooth
       (style.css,给锚点跳转用),不覆盖的话这次归零会变成一段平滑滚动 ——
       用户看到的就是「展开时页面自己在滚」(2026-07-27 实测滚动曲线在减速)。 */
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    setArticle({ slug, phase: 'morph' });
  };

  /* 关闭:反向联动 —— 封面从通栏 hero 缩回被点的那张卡片,其余文章内容同时退场。
     做法上封面先转 fixed 钉在当前视觉位置,再恢复 Blog 布局(此时才量得到卡片的
     真实几何),最后 FLIP 回去。封面是 iframe,全程不搬动 DOM —— 一旦 appendChild
     到别处,iframe 会重新加载、画面闪空(2026-07-27)。 */
  const closeArticle = () => {
    const body = document.body;
    const slug = article?.slug;

    const finish = () => {
      body.classList.remove('writing-page', 'reading-page', 'article-modal', 'article-closing');
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
        [host.querySelector<HTMLElement>('.article-cover'), 'cover'],
        [host.querySelector<HTMLElement>('.article-h1'), 'title'],
        [host.querySelector<HTMLElement>('.article-eyebrow .a-tag'), 'tag'],
      ] as [HTMLElement | null, string][]
    )
      .filter(([el]) => !!el)
      /* 先把三份几何全测完再钉 —— 边测边钉会互相污染:封面一旦脱流,后面的标题
         当场上移一个封面高(实测 203px),起点就量歪了(2026-07-27)。 */
      .map(([el, kind]) => ({ el: el as HTMLElement, from: (el as HTMLElement).getBoundingClientRect(), kind }))
      .map(({ el, from, kind }) => {
        const e = el;
        e.style.position = 'fixed';
        e.style.left = `${from.left}px`;
        e.style.top = `${from.top}px`;
        e.style.width = `${from.width}px`;
        e.style.height = `${from.height}px`;
        e.style.margin = '0';
        e.style.zIndex = '90'; // 低于顶栏(100),缩回时从顶栏下穿过
        e.style.transformOrigin = 'top left';
        e.classList.add('article-flying-el'); // 让位的文章内容里单独放行这三件
        return { el: e, from, kind };
      });

    /* ② 其余文章内容退场 + 恢复 Blog 布局与滚动位置 */
    body.classList.add('article-closing');
    body.classList.remove('article-modal');
    /* 同上:瞬时归位,否则收起时页面又会平滑滚一段 */
    window.scrollTo({ top: blogScrollRef.current, behavior: 'instant' as ScrollBehavior });

    /* ③ 量目标卡片 —— 必须在 Blog 布局恢复之后 */
    const wrapper = document.querySelector<HTMLElement>(`.card-wrapper[data-slug="${slug}"]`);
    const landing = (kind: string) =>
      kind === 'cover'
        ? (wrapper?.querySelector<HTMLElement>('.writing-card') ??
          wrapper?.querySelector<HTMLElement>('.bl-thumb') ??
          null)
        : kind === 'title'
          ? (wrapper?.querySelector<HTMLElement>('.w-title, .bl-title') ?? null)
          : (wrapper?.querySelector<HTMLElement>('.a-tag') ?? null);

    const anims: Animation[] = [];
    const hidden: HTMLElement[] = [];
    flyers.forEach(({ el, from, kind }) => {
      const target = landing(kind);
      if (!target) return;
      const r = target.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const to: Landing = { left: r.left, top: r.top, width: r.width, height: r.height, fs: parseFloat(getComputedStyle(target).fontSize) };
      target.style.visibility = 'hidden'; // 落位前卡片这份不露脸
      hidden.push(target);
      anims.push(
        el.animate(flightFrames(el, from, to, kind), {
          duration: COVER_MORPH_MS,
          easing: COVER_EASE,
          fill: 'both',
        }),
      );
    });

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
          : host.querySelector<HTMLElement>('.article-eyebrow .a-tag');

    const anims: Animation[] = [];
    const hidden: HTMLElement[] = [];
    flying.items.forEach(({ el, from, kind }) => {
      const target = targetOf(kind);
      if (!target) return;
      const r = target.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const to: Landing = { left: r.left, top: r.top, width: r.width, height: r.height, fs: parseFloat(getComputedStyle(target).fontSize) };
      /* 文章侧先藏起来,避免与飞行中的源元素重影 */
      target.style.visibility = 'hidden';
      hidden.push(target);
      anims.push(
        el.animate(flightFrames(el, from, to, kind), {
          duration: COVER_MORPH_MS,
          easing: COVER_EASE,
          fill: 'both',
        }),
      );
    });

    if (!anims.length) {
      done();
      return;
    }
    anims[anims.length - 1].onfinish = () => {
      /* 同一同步块内交接:文章侧显形、飞行件复位,中间不留可见帧 */
      hidden.forEach((el) => (el.style.visibility = ''));
      flying.items.forEach(({ el }) => {
        el.classList.remove('article-flying-el');
        el.style.cssText = el.style.cssText
          .replace(/position:[^;]+;?/, '')
          .replace(/left:[^;]+;?/, '')
          .replace(/top:[^;]+;?/, '')
          .replace(/width:[^;]+;?/, '')
          .replace(/height:[^;]+;?/, '')
          .replace(/margin:[^;]+;?/, '')
          .replace(/z-index:[^;]+;?/, '')
          .replace(/transform-origin:[^;]+;?/, '');
      });
      flyingRef.current = null;
      done();
    };
    return () => anims.forEach((a) => a.cancel());
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
  usePillarEntrance([bigCount]); // 断点切换(N 变化)后列表项是新节点,入场系统需重新绑定
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
            {bigCards.map((a) => (
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
                  {a.blogCover?.type === 'video' ? (
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
                      src={a.blogCover!.src}
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
          {/* 列表式条目(第 BIG_COVERS 张之后):左 1:1 方形封面缩略图 + 右标题/简介/时间 */}
          {listCards.length > 0 && (
            <div className="blog-list">
              {listCards.map((a) => (
                <div
                  key={a.slug}
                  className="card-wrapper blog-list-item"
                  data-cat={a.cat}
                  data-date={a.date}
                  data-slug={a.slug}
                  hidden={!(filter === 'all' || a.cat === filter)}
                >
                  <a
                    href={`writing/${a.file}`}
                    onClick={(e) => {
                      if (!window.matchMedia(SMALL_MQ).matches) return; // 桌面:照常跳转
                      e.preventDefault();
                      const thumb = e.currentTarget.querySelector<HTMLElement>('.bl-thumb');
                      openArticle(a.slug, thumb ?? e.currentTarget);
                    }}
                  >
                    <span className="bl-thumb">
                      <img src={`writing/${a.listCover}`} alt="" loading="lazy" />
                    </span>
                    <span className="bl-text">
                      <h3 className="bl-title">{a.title}</h3>
                      <p className="bl-excerpt">{a.excerpt}</p>
                      <span className="bl-date">{a.date}</span>
                    </span>
                  </a>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
      {/* 模态返回:顶栏左侧的返回箭头(模态时顶掉 logo 的位置)。固定在顶栏里,
          文章滚多深都点得到 —— 手机端最常见的关闭方式。 */}
      {article && (
        <button
          type="button"
          className="article-modal-back"
          aria-label="返回文章列表"
          onClick={() => history.back()}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 5 L8 12 L15 19" />
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
