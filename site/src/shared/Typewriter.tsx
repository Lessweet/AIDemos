/**
 * Feed 卡片逐字 typewriter(pixel-point/animate-text 的 typewriter 规范)。
 * 只负责拆字与字序(--tw-i):时序参数、组间依次起步、显隐闸门全在
 * docs/style.css 的 --tw-* token 区 —— 改 token 一处,Blog/Archive 处处同步。
 * 无障碍:外层 aria-label 读整句,拆字层 aria-hidden(与首页索引行同一套约定)。
 */
import type { CSSProperties } from 'react';

/* 组容器上标注前几组字数(--tw-n1/--tw-n2),CSS 据此算后续组的打字起点 */
export function twCounts(...texts: string[]): CSSProperties {
  const style: Record<string, number> = {};
  texts.forEach((t, i) => (style[`--tw-n${i + 1}`] = Array.from(t).length));
  return style as CSSProperties;
}

/* .tw-text 是整段文字唯一的行内容器:除了装拆字单元,也是 hover 反色高亮块的
   附着点(见 writing.css「hover 反色高亮块」)—— 行内元素才能让底块贴着文字走、
   折行时每行各自成块;挂在外层块级元素上会撑满整列。 */
export default function Typewriter({ text }: { text: string }) {
  return (
    <span aria-label={text}>
      <span className="tw-text" aria-hidden="true">
        {Array.from(text).map((ch, i) => (
          <span key={i} className="tw-ch" style={{ '--tw-i': i } as CSSProperties}>
            {ch}
          </span>
        ))}
      </span>
    </span>
  );
}
