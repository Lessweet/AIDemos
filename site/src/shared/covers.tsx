/* ── 动态封面统一实现:海报首帧默认静止,「激活」才动 ──
 *
 * 背景:Blog 首屏 16 个 iframe、Archive 7 iframe + 10 video 全量自启,
 * 冷缓存下封面长时间空白(2026-08-16 用户报慢)。现在默认只显示
 * build-cover-posters.mjs 截的「t=0 冻结帧」海报,激活才真正播放。
 *
 * 激活方式按输入能力分,不按视口宽度:
 *   · 能 hover 的设备 —— 指针悬停激活,移开暂停(原地冻结,再悬停续播);
 *   · 触屏 —— 卡片进入视口中央带(上下各让出 40%)激活,离开暂停。
 *
 * 零等待原理(2026-08-17 用户反馈「hover 要等放大完成才动」后引入预热):
 *   · 预热:页面 load + 空闲后,视口 ±1 屏内的封面就以 #frozen 悄悄挂载 ——
 *     cover-shim.js 把它的虚拟时钟钉在 0,画好与海报同帧的首帧就停住,
 *     rAF 全部排队,零 CPU 等待。首屏绘制不受影响(空闲后才开始)。
 *   · 激活:撤海报(120ms 溶解)与 cover-play 同时发生 —— 封面都是慢速漂移,
 *     溶解那几帧里的移动不可见,体感是「碰到的瞬间就活了」。
 *   · 视频用 ffmpeg 抽的第 0 帧当 poster 天然同帧;预热时把 preload 升到 auto,
 *     激活即刻有帧可播。
 */
import { useEffect, useRef, useState } from 'react';

const HOVER_MQ = '(hover: hover)';
/* 页面级转场(首页模态开合 / 文章模态开合)期间的分级静默:
   · 结构性操作(预热挂载 / 远端卸载)全程按兵不动 —— 转场起步常伴随
     scrollTo(0,0) 和整块位移,IO 判定风暴会让 React 在动画帧上挂卸 iframe,
     正是收起卡顿的一环(2026-08-17 用户录屏);
   · 居中激活只在「收起方向」静默 —— 展开途中放行:它只触发揭示+播放
     (零 DOM 结构变化),预热好的首卡在飞入途中经过中带就能活过来
     (2026-08-17 用户:展开后第一张卡出现太慢);收起时则不许把刚冻结的
     封面又唤醒。
   转场方结束时会广播 covers:resync,各 observer 重判一次补上真值。 */
const inPageTransition = () => {
  const c = document.body.classList;
  return (
    c.contains('home-modal-riding') ||
    c.contains('home-restoring') ||
    c.contains('article-morphing') ||
    c.contains('article-closing')
  );
};
const inPageClosing = () => {
  const c = document.body.classList;
  return (
    c.contains('home-modal-closing') || c.contains('home-restoring') || c.contains('article-closing')
  );
};
/* 转场结束后的统一重判:IO 对已观察元素重新 observe 会立刻重发一次判定。
   各 effect 内联挂这个监听(闭包里就有自己的 io/el)。 */
const onResync = (io: IntersectionObserver, el: Element) => {
  const fn = () => {
    io.unobserve(el);
    io.observe(el);
  };
  window.addEventListener('covers:resync', fn);
  return () => window.removeEventListener('covers:resync', fn);
};
/* 触屏的「中央带」:视口上下各收 40%,即中间 20% 的横带。带内最多 1-2 张卡,
   不至于满屏同播;贴边的卡在用户滚到中间前就是海报,符合「滚到哪看哪」。 */
const CENTER_MARGIN = '-40% 0px -40% 0px';
/* 预热带 ±1 屏 / 卸载带 ±1.5 屏:两条线错开做迟滞,边界上来回滚不抖 */
const WARM_MARGIN = '100% 0px';
const EVICT_MARGIN = '150% 0px';
/* load 后再歇这么久才开始预热:让海报、字体这些首屏资源先吃完带宽 */
const WARM_IDLE_MS = 1200;

function useCoverActive<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [active, setActive] = useState(false);
  /* 输入能力当作会话常量:hover 设备中途变触屏的场景(拔掉鼠标)不值得监听 */
  const [hoverable] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(HOVER_MQ).matches,
  );
  useEffect(() => {
    if (hoverable) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => {
        if (inPageClosing()) return;
        es.forEach((e) => setActive(e.isIntersecting));
      },
      { rootMargin: CENTER_MARGIN },
    );
    io.observe(el);
    const off = onResync(io, el);
    return () => {
      off();
      io.disconnect();
    };
  }, [hoverable]);
  /* hover 绑到最近的卡片祖先(<a>/<article>),不绑封面容器自己:Archive 的
     卡片 hover 蒙层是宿主上的伪元素,命中全部落在宿主 <a> 上,容器的 enter
     永远不触发 —— 表现就是 iframe 预热好了却永远不播
     (2026-08-17 用户:桌面这俩 hover 没动态)。Blog 卡绑到 <a>.writing-card,
     语义相同。native 监听而非 React 事件:目标在组件树之外。 */
  useEffect(() => {
    if (!hoverable) return;
    const el = ref.current;
    if (!el) return;
    const target = el.closest<HTMLElement>('a, article') ?? el;
    const enter = () => setActive(true);
    const leave = () => setActive(false);
    target.addEventListener('mouseenter', enter);
    target.addEventListener('mouseleave', leave);
    return () => {
      target.removeEventListener('mouseenter', enter);
      target.removeEventListener('mouseleave', leave);
    };
  }, [hoverable]);
  return { ref, active };
}

/* 预热信号:load + 空闲之后,元素进入视口 ±1 屏 → true,滚出 → false。
   隐藏容器(首页后台预载)里的元素量不到交叉,IO 不会置 true ——
   eager 就是给这种场景的:首屏头部的封面(Blog 前两张卡 / Archive banner)
   在预载期就无条件冻结挂载。display:none 里 iframe 的 rAF 是停的,shim 的
   就绪流程恰好停在「等可见后画首帧」那一步 —— 模态一展开,两帧内 ready,
   首卡不用再吃「加载 + 沉降」整条冷启动链(2026-08-17 用户:第一张卡出现太慢)。 */
function useWarm(ref: React.RefObject<HTMLElement | null>, eager?: boolean) {
  const [warm, setWarm] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let io: IntersectionObserver | null = null;
    let timer = 0;
    let off: (() => void) | null = null;
    const start = () => {
      timer = window.setTimeout(() => {
        /* eager 先置 true 触发挂载;IO 照常接管后续真值(滚远了照样降温)。
           隐藏容器里 IO 首判 false 会把 warm 拨回去,但 mounted 一经置位不回退,
           挂载已经完成 —— 卸载由 evict 管,而 evict 会跳过零尺寸元素。 */
        if (eager) setWarm(true);
        io = new IntersectionObserver(
          (es) => {
            if (inPageTransition()) return;
            es.forEach((e) => setWarm(e.isIntersecting));
          },
          { rootMargin: WARM_MARGIN },
        );
        io.observe(el);
        off = onResync(io, el);
      }, WARM_IDLE_MS);
    };
    if (document.readyState === 'complete') start();
    else window.addEventListener('load', start, { once: true });
    return () => {
      window.removeEventListener('load', start);
      clearTimeout(timer);
      off?.();
      io?.disconnect();
    };
  }, [ref, eager]);
  return warm;
}

const FILL = { width: '100%', height: '100%', display: 'block' } as const;

export function CoverIframe({
  src,
  poster,
  posterSrcSet,
  className,
  style,
  frameProps,
  eager,
}: {
  src: string;
  poster: string;
  /* 双密度海报(如 "p.webp 2x, p@3x.webp 3x"):海报是默认常驻画面,
     3x 手机不糊、2x 桌面不多下 —— 视频的 poster 属性不支持 srcset,只有这里有 */
  posterSrcSet?: string;
  className?: string;
  style?: React.CSSProperties;
  frameProps?: React.IframeHTMLAttributes<HTMLIFrameElement>;
  /* 首屏头部封面:预载期(含隐藏容器)就冻结挂载,见 useWarm 注释 */
  eager?: boolean;
}) {
  const { ref, active } = useCoverActive<HTMLDivElement>();
  const warm = useWarm(ref, eager);
  const [mounted, setMounted] = useState(false);
  const [ready, setReady] = useState(false); /* 冻结帧已画好,随时可交接 */
  const [revealed, setRevealed] = useState(false); /* 海报已撤 */
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  /* 预热或激活都触发挂载:预热是常态(hover 到的瞬间冻结帧早已画好),
     激活兜冷启(load 后立刻去 hover 还没预热的卡,照样能走通,只是首次要等加载)。
     转场期间不做结构性挂载 —— 展开途中被居中激活的冷卡等 covers:resync 后再挂。
     syncTick:resync 时 IO 重判出的值若与转场前相同,setActive/setWarm 会被
     React 空操作掉,这个挂载判定就永远不再跑 —— 用事件计数强制它重估一次。 */
  const [syncTick, setSyncTick] = useState(0);
  useEffect(() => {
    const on = () => setSyncTick((n) => n + 1);
    window.addEventListener('covers:resync', on);
    return () => window.removeEventListener('covers:resync', on);
  }, []);
  useEffect(() => {
    if ((warm || active) && !mounted && !inPageTransition()) setMounted(true);
  }, [warm, active, mounted, syncTick]);

  /* 远离视口(1.5 屏外)就卸载,回到海报态。iframe 只挂不卸的话,把列表滚一遍
     就攒下十几个 WebGL 上下文 —— 浏览器上限一到(移动端约 8 个)就丢最旧的,
     那个封面直接黑屏。卸载发生在屏外,回来看到的是海报,再滚近就重新预热,
     视觉上无损。activeRef:卸载判定要读最新 active,但不想让 active 变化本身
     触发这个 effect 重建 observer。 */
  const activeRef = useRef(active);
  activeRef.current = active;
  useEffect(() => {
    if (!mounted) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (inPageTransition()) return;
          if (e.isIntersecting || activeRef.current) return;
          /* 零尺寸 = 藏在 display:none 的预载容器里,几何没有意义 ——
             eager 挂载的首屏封面别按「不在视口」误逐出 */
          const r = e.boundingClientRect;
          if (r.width === 0 && r.height === 0) return;
          setMounted(false);
          setReady(false);
          setRevealed(false);
        }),
      { rootMargin: EVICT_MARGIN },
    );
    io.observe(el);
    const off = onResync(io, el);
    return () => {
      off();
      io.disconnect();
    };
  }, [mounted, ref]);

  /* 收起转场(covers:shed):罩回海报 + iframe visibility:hidden。整块位移最贵
     的就是 iframe 合成层(Archive 首屏 3 个,poster-stack 里还嵌着 4 路视频),
     隐藏层不参与合成,收起时全页只剩图片,和 Blog 一样轻(2026-08-17 用户:
     Archive 收起总是卡)。不卸载 —— 拆 7 个 iframe 文档要几百毫秒,正好砸在
     收起首段动画帧上(先试过卸载方案,实测 iframe 清空拖到 1.3s 后)。
     活封面罩布时闪回 t0 海报帧:慢速漂移 + 整块正要位移,不可感。
     罩布由 covers:resync 摘;revealed 一并回退,下次激活重走溶解。 */
  const [shrouded, setShrouded] = useState(false);
  useEffect(() => {
    const onShed = () => {
      setShrouded(true);
      setRevealed(false);
    };
    const onSync = () => setShrouded(false);
    window.addEventListener('covers:shed', onShed);
    window.addEventListener('covers:resync', onSync);
    return () => {
      window.removeEventListener('covers:shed', onShed);
      window.removeEventListener('covers:resync', onSync);
    };
  }, []);

  /* iframe 画好冻结帧发 cover-ready。此时若未激活,就让它钉在海报底下等 */
  useEffect(() => {
    if (!mounted || ready) return;
    const go = () => setReady(true);
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type !== 'cover-ready') return;
      if (e.source !== frameRef.current?.contentWindow) return;
      requestAnimationFrame(go);
    };
    window.addEventListener('message', onMsg);
    /* 兜底:封面异常(404/脚本报错)发不出 ready,也别让海报永远压着。
       只在激活状态下兜 —— 预热态没人看,不急 */
    const timer = window.setTimeout(go, 8000);
    return () => {
      window.removeEventListener('message', onMsg);
      clearTimeout(timer);
    };
  }, [mounted, ready]);

  /* 首次激活:撤海报与放行同时进行。海报 120ms 溶解到冻结帧 —— 两边内容同帧,
     溶解只为兜住不同 DPR/卡宽下海报缩放的亚像素重采样差;时钟同刻放行,
     慢速漂移的封面在这 120ms 里只挪亚像素级距离,肉眼看是「瞬间活了」。 */
  useEffect(() => {
    /* 罩布期间不揭示:海报下的 iframe 是 visibility:hidden,揭了就是空盒 */
    if (!ready || !active || revealed || shrouded) return;
    const img = imgRef.current;
    if (!img) {
      setRevealed(true);
      return;
    }
    const anim = img.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, fill: 'forwards' });
    anim.onfinish = () => setRevealed(true);
    return () => anim.cancel();
  }, [ready, active, revealed, shrouded]);

  /* 播放/暂停跟随激活状态(首次播放也走这里,与上面的溶解同一次提交);
     罩布期间一律暂停 —— 看不见的封面不许烧帧 */
  useEffect(() => {
    if (!ready) return;
    frameRef.current?.contentWindow?.postMessage(
      { type: active && !shrouded ? 'cover-play' : 'cover-pause' },
      '*',
    );
  }, [active, ready, shrouded]);

  return (
    <div
      ref={ref}
      className={className}
      style={{ position: 'relative', overflow: 'hidden', ...style }}
    >
      {mounted && (
        <iframe
          ref={frameRef}
          src={`${src}#frozen`}
          {...frameProps}
          style={{
            ...FILL,
            border: 0,
            ...frameProps?.style,
            ...(shrouded ? { visibility: 'hidden' as const } : null),
          }}
        />
      )}
      {(!revealed || shrouded) && (
        <img
          ref={imgRef}
          src={poster}
          srcSet={posterSrcSet}
          alt=""
          decoding="async"
          style={{ ...FILL, objectFit: 'cover', position: 'absolute', inset: 0, zIndex: 1 }}
        />
      )}
    </div>
  );
}

export function CoverVideo({
  src,
  poster,
  className,
  style,
}: {
  src: string;
  poster: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { ref, active } = useCoverActive<HTMLVideoElement>();
  const warm = useWarm(ref);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    /* play() 返回 promise,被打断会抛 AbortError —— 快速滚动时很常见,吞掉 */
    if (active) void v.play().catch(() => {});
    else if (!v.paused) v.pause();
  }, [active]);
  return (
    <video
      ref={ref}
      muted
      loop
      playsInline
      /* 预热带内提前缓冲,激活即刻有帧;带外不动流量 */
      preload={warm ? 'auto' : 'none'}
      poster={poster}
      src={src}
      className={className}
      style={style}
    />
  );
}
