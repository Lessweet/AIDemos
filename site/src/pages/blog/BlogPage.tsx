/**
 * Blog 页(docs/blog.html 的 React 版)。DOM 结构与旧页逐类名一致;
 * 筛选逻辑 = writing.js initWritingFilter 的状态化移植(卡片日期倒序、hidden 显隐)。
 */
import { useEffect, useState } from 'react';
import { blogCards } from '../../content/articles';
import { CatIcon } from '../../shared/catIcons';
import PageTitle from '../../shared/PageTitle';
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

/* 大封面数响应式(2026-07-22 定稿):桌面 12,小屏/手机(≤800px)6 */
const BIG_COVERS_DESKTOP = 12;
const BIG_COVERS_MOBILE = 6;
const SMALL_MQ = '(max-width: 800px)';

/* modalTitle(test/page-interaction 实验):首页模态内嵌时由 HomePage 传入 ——
   'held' = 标题按住不入场(等 FLIP 克隆飞到位),'revealed' = 克隆落位后瞬时显形。
   独立 blog.html 入口不传,标题走自己的 per-character rise,行为与线上一致。 */
export default function BlogPage({ modalTitle }: { modalTitle?: 'held' | 'revealed' }) {
  const [filter, setFilter] = useState<Filter>('all');
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

  useAppReady();
  useHeaderAlwaysVisible();
  useStickyMenu();
  useScrollProgress();
  usePillarEntrance([bigCount]); // 断点切换(N 变化)后列表项是新节点,入场系统需重新绑定
  useHideNavOnScrollMobile();
  useScrollLag();

  return (
    <>
      <div className="page-title-row">
        <PageTitle text="Blog" held={!!modalTitle} revealed={modalTitle === 'revealed'} />
        <PageCollapse modal={!!modalTitle} held={modalTitle === 'held'} />
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
                <a className="writing-card" href={`writing/${a.file}`}>
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
                  <a href={`writing/${a.file}`}>
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
    </>
  );
}
