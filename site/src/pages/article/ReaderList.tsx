/**
 * 阅读页左栏(writing.js renderReaderList 的组件化移植):
 * 分类 tab(全部/UI 视觉/产品体验,像素图标与 blog 同源)+ 文章清单(注册表驱动,
 * 替代旧版 articles.json fetch —— 数据编译进 bundle,清单与页面永不脱节)。
 * 滚动边缘渐隐 mask 与 tab 显隐逻辑逐行移植。
 */
import { useEffect, useRef, useState } from 'react';
import type { ArticleMeta } from '../../content/articles';
import { CatIcon } from '../../shared/catIcons';

const READER_CATS = [
  { key: 'all', label: '全部' },
  { key: 'ui', label: 'UI 视觉' },
  { key: 'product', label: '产品体验' },
] as const;

type CatKey = (typeof READER_CATS)[number]['key'];

export default function ReaderList({
  items,
  currentFile,
}: {
  items: ArticleMeta[];
  currentFile: string;
}) {
  const [cat, setCat] = useState<CatKey>('all');
  const catsRef = useRef<HTMLDivElement | null>(null);

  /* 筛选栏左右渐变:默认只右侧淡出;滑出内容后左侧才淡出,滑到尽头右侧不再淡 */
  useEffect(() => {
    const cats = catsRef.current;
    if (!cats) return;
    const updateFade = () => {
      const atStart = cats.scrollLeft <= 1;
      const atEnd = cats.scrollLeft >= cats.scrollWidth - cats.clientWidth - 1;
      const left = atStart ? '#000' : 'transparent';
      const right = atEnd ? '#000' : 'transparent';
      const mask = 'linear-gradient(to right, ' + left + ', #000 28px, #000 calc(100% - 28px), ' + right + ')';
      cats.style.webkitMaskImage = mask;
      cats.style.maskImage = mask;
    };
    cats.addEventListener('scroll', updateFade, { passive: true });
    window.addEventListener('resize', updateFade);
    updateFade();
    return () => {
      cats.removeEventListener('scroll', updateFade);
      window.removeEventListener('resize', updateFade);
    };
  }, []);

  return (
    <aside aria-label="文章列表" className="reader-list" data-cat={cat}>
      <div className="reader-cats" role="tablist" ref={catsRef}>
        {READER_CATS.map((c) => (
          <button
            key={c.key}
            className={'reader-cat' + (c.key === cat ? ' active' : '')}
            data-cat={c.key}
            type="button"
            onClick={() => setCat(c.key)}
          >
            <CatIcon kind={c.key} />
            <span className="reader-cat-label">{c.label}</span>
          </button>
        ))}
      </div>
      <div className="reader-items">
        {items.map((it) => (
          <a
            key={it.slug}
            className={'reader-item' + (it.file === currentFile ? ' active' : '')}
            href={it.file}
            data-file={it.file}
            data-cat={it.cat}
            hidden={!(cat === 'all' || it.cat === cat)}
          >
            <span className="reader-thumb">
              {/* 用压好的静态卡片封面(1200px webp,几十 KB),不要 listCover ——
                  那是设计原图,最大 6MB、3240px 宽,而这里只显示约 50px。
                  同一个坑在 Blog 卡片上已经踩过一次(见 articles.ts 里 cardCover 的
                  注释「用户报封面加载不出来」),当时只换了卡片、漏了阅读器左栏:
                  桌面端左列表十来张缩略图因此要拉几十 MB,长时间是空白
                  (2026-07-28 用户实测)。
                  个别还没压出 cardCover 的退回原图保底,不至于没图。 */}
              {it.cardCover || it.listCover ? (
                <img src={it.cardCover || it.listCover} alt="" loading="lazy" />
              ) : (
                <span className="reader-thumb-ph">封面</span>
              )}
            </span>
            <span className="reader-text">
              <span className="reader-title">{it.title}</span>
              <span className="reader-date">{it.date}</span>
            </span>
          </a>
        ))}
      </div>
    </aside>
  );
}
