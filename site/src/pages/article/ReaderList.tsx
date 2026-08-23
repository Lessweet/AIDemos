/**
 * 阅读页左栏(writing.js renderReaderList 的组件化移植):
 * 文章清单(注册表驱动,替代旧版 articles.json fetch —— 数据编译进 bundle,
 * 清单与页面永不脱节)。
 * 分类 tab(全部/UI 视觉/产品体验)已删(2026-08-23 用户定):此前就被
 * body.reading-page .reader-cats { display:none } 藏死,是渲染着的死 UI ——
 * 连组件、筛选态、CSS、--brand-grad 下划线渐变一并移除,清单恒显全部文章。
 */
import type { ArticleMeta } from '../../content/articles';

export default function ReaderList({
  items,
  currentFile,
}: {
  items: ArticleMeta[];
  currentFile: string;
}) {
  return (
    <aside aria-label="文章列表" className="reader-list">
      <div className="reader-items">
        {items.map((it) => (
          <a
            key={it.slug}
            className={'reader-item' + (it.file === currentFile ? ' active' : '')}
            href={it.file}
            data-file={it.file}
            data-cat={it.cat}
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
