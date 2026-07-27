/**
 * 标题行右侧的「收起」箭头(test/page-interaction 实验,Blog / Archive 共用):
 * 图形 = 首页索引行行尾的同一支箭头(同 path,单一数据源 INDEX_ARROW_PATH),
 * 由 CSS 旋转 135° 指向下 —— 展开/收起时 HomePage 用克隆在两端之间平移 + 旋转互相变形,
 * 所以两端造型必须同源(2026-07-27 用户要求)。
 * 模态态点击 = history.back(),与返回键 / Esc 同一条关闭链路;独立入口页普通跳回首页。
 * held:morph 飞行期间按住不显示(飞行中的箭头是克隆),落位后显形。
 */
export const INDEX_ARROW_PATH = 'M5.3 18.7 L18 6 M8.1 6 H18 V15.9';

export default function PageCollapse({ modal, held = false }: { modal: boolean; held?: boolean }) {
  return (
    <button
      type="button"
      className="page-collapse"
      style={held ? { visibility: 'hidden' } : undefined}
      aria-label="收起,回到首页"
      onClick={() => {
        if (modal) history.back();
        else window.location.href = 'index.html';
      }}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d={INDEX_ARROW_PATH} />
      </svg>
    </button>
  );
}
