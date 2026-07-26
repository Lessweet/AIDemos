/**
 * Blog 页(docs/blog.html 的 React 版)。DOM 结构与旧页逐类名一致;
 * 筛选逻辑 = writing.js initWritingFilter 的状态化移植(卡片日期倒序、hidden 显隐)。
 */
import { useEffect, useState } from 'react';
import { blogCards } from '../../content/articles';
import { CatIcon } from '../../shared/catIcons';
import PageTitle from '../../shared/PageTitle';
import Typewriter, { twCounts } from '../../shared/Typewriter';
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

export default function BlogPage() {
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
                {/* 三组文字依次打字(typewriter):组字数经 twCounts 下发给 CSS 算起点 */}
                <div className="card-info writing-info" style={twCounts(a.title, a.excerpt)}>
                  <h3 className="w-title">
                    <Typewriter text={a.title} />
                  </h3>
                  <div className="w-excerpt">
                    <Typewriter text={a.excerpt} />
                  </div>
                  <div className="w-meta">
                    <div className="w-tags">
                      <span className="a-tag">
                        <Typewriter text={a.blogTag ?? ''} />
                      </span>
                    </div>
                    <div className="w-date">
                      <Typewriter text={a.date} />
                    </div>
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
                    <span className="bl-text" style={twCounts(a.title, a.excerpt)}>
                      <h3 className="bl-title">
                        <Typewriter text={a.title} />
                      </h3>
                      <p className="bl-excerpt">
                        <Typewriter text={a.excerpt} />
                      </p>
                      <span className="bl-date">
                        <Typewriter text={a.date} />
                      </span>
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
