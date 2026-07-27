/**
 * 页面标题(Blog / Archive 共用一套,2026-07-22):
 * per-character-rise 入场(35ms/字,复用 style.css heading-rise 通用样式);
 * 刷新恢复滚动位置(不在页顶)时直接以完成态渲染,避免滑回顶部撞见半程动画。
 * held 模式(首页 → Blog/Archive 模态,test/page-interaction):标题不自己入场 ——
 * 它随整块从索引行位置平移上来,本身就是那行字的延续,再播一次逐字升起会重影;
 * 逐字过渡一并关掉,revealed 时瞬时显形。
 */
import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';

/* 逐字升起的字符步长。标题行右侧的收起箭头按「标题的下一个字符」接着升起,
   延迟 = 字数 × 本值,两处共用这一个数(见 PageCollapse 的 riseDelay)。 */
export const RISE_CHAR_STEP = 35;

export default function PageTitle({
  text,
  held = false,
  revealed = false,
}: {
  text: string;
  held?: boolean;
  revealed?: boolean;
}) {
  const [titleIn, setTitleIn] = useState(false);

  useEffect(() => {
    if (held) return;
    if (window.scrollY > 100) {
      setTitleIn(true);
      return;
    }
    let r2: number;
    const r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => setTitleIn(true));
    });
    return () => {
      cancelAnimationFrame(r1);
      cancelAnimationFrame(r2);
    };
  }, [held]);

  const shown = held ? revealed : titleIn;
  return (
    <h1
      className={'page-title heading-rise' + (shown ? ' heading-rise-in' : '')}
      aria-label={text}
    >
      <span className="heading-rise-mask" aria-hidden="true">
        {text.split('').map((ch, i) => (
          <span
            key={i}
            className="heading-rise-char"
            style={
              {
                '--d': `${i * RISE_CHAR_STEP}ms`,
                ...(held ? { transition: 'none' } : null),
              } as CSSProperties
            }
          >
            {ch}
          </span>
        ))}
      </span>
    </h1>
  );
}
