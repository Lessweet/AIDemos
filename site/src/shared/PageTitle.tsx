/**
 * 页面标题(Blog / Archive 共用一套,2026-07-22):
 * per-character-rise 入场(35ms/字,复用 style.css heading-rise 通用样式);
 * 刷新恢复滚动位置(不在页顶)时直接以完成态渲染,避免滑回顶部撞见半程动画。
 * held 模式(首页 → Blog 模态,test/page-interaction):标题不自己入场,由父级的
 * FLIP 克隆飞到标题位后把 revealed 置真 —— 此时要「瞬时显形」接住克隆落位,
 * 逐字过渡全部关掉,否则克隆消失后标题还要再淡入一遍,中间会空一拍。
 */
import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';

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
                '--d': `${i * 35}ms`,
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
