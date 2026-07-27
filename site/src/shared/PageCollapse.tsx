/**
 * 标题行右侧的「收起」箭头(test/page-interaction 实验,Blog / Archive 共用):
 * 图形 = 首页索引行行尾的同一支箭头(同 path,单一数据源 INDEX_ARROW_PATH),
 * 由 CSS 旋转 135° 指向下 —— 展开/收起时 HomePage 把行尾箭头原位旋转到这个角度,
 * 两端造型必须同源(2026-07-27 用户要求)。
 * 模态态点击 = history.back(),与返回键 / Esc 同一条关闭链路;独立入口页普通跳回首页。
 * held:整块位移期间按住不显示,落位后显形。
 */
import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';

export const INDEX_ARROW_PATH = 'M5.3 18.7 L18 6 M8.1 6 H18 V15.9';

export default function PageCollapse({
  modal,
  held = false,
  riseDelay,
}: {
  modal: boolean;
  held?: boolean;
  /* 独立页直接访问时的升起延迟(ms)。传入 = 标题字数 × RISE_CHAR_STEP,
     等于把箭头当作标题的「下一个字符」接着升起 —— 与首页索引行里箭头作为
     该行最后一个字符同批升起是同一套编排(2026-07-27 用户要求)。
     模态态不传:那时箭头是由行尾箭头旋转过来的,不该再播一次升起。 */
  riseDelay?: number;
}) {
  const rise = !modal && riseDelay !== undefined;
  /* 模态态直接就位;独立页挂载后双 rAF 放闸,与 PageTitle 同一时机
     (刷新时滚动位置不在页顶则跳过入场,免得滑回顶部撞见半程动画) */
  const [risen, setRisen] = useState(!rise);
  useEffect(() => {
    if (!rise) return;
    if (window.scrollY > 100) {
      setRisen(true);
      return;
    }
    let r2: number;
    const r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => setRisen(true));
    });
    return () => {
      cancelAnimationFrame(r1);
      cancelAnimationFrame(r2);
    };
  }, [rise]);

  return (
    <button
      type="button"
      className={
        'page-collapse' + (rise ? ' heading-rise' : '') + (risen ? ' heading-rise-in' : '')
      }
      style={held ? { visibility: 'hidden' } : undefined}
      aria-label="收起,回到首页"
      onClick={() => {
        if (modal) history.back();
        else window.location.href = 'index.html';
      }}
    >
      {/* 独立页:复用 heading-rise 的遮罩 + 字符结构,从基线下方升起;
          模态态:裸 svg,由整块位移与旋转接管 */}
      {rise ? (
        <span className="heading-rise-mask" aria-hidden="true">
          <span className="heading-rise-char" style={{ '--d': `${riseDelay}ms` } as CSSProperties}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d={INDEX_ARROW_PATH} />
            </svg>
          </span>
        </span>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d={INDEX_ARROW_PATH} />
        </svg>
      )}
    </button>
  );
}
