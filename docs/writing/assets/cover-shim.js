/* cover-shim.js —— 封面「静态首帧 → hover 无缝接管」的统一协议。
 *
 * 背景:Blog 首屏一次挂 16 个 iframe 封面,冷缓存下封面长时间空白(2026-08-16)。
 * 方案:默认只显示首帧海报图(build-cover-posters.mjs 截的),hover 才挂 iframe;
 * iframe 以 #frozen 启动 —— 虚拟时钟钉死在 0,画出的第一帧与海报逐像素同帧;
 * 画完发 cover-ready,父页撤掉海报再发 cover-play 放行时钟。从构造上零跳帧。
 *
 * 必须是文档里第一个执行的 <script>(封面代码在解析期就读 performance.now,
 * 晚注入就接管不到)。所有 cover*.html 在 <head> 顶部引 ../cover-shim.js。
 *
 * 协议(父页 postMessage):
 *   { type: 'cover-play' }  放行/恢复 —— 时钟从冻结值续走,rAF 队列原样放行
 *   { type: 'cover-pause' } 冻结 —— 时钟钉住,rAF 回调排队,CSS 动画暂停
 * 子页发出:
 *   { type: 'cover-ready' } 首帧已上屏(load + 字体就绪 + 两帧 rAF 之后)
 * 封面内代码可用:
 *   window.COVER.started —— 首次放行时 resolve(非 frozen 模式立即 resolve)。
 *   定时器驱动的序列(如 remove-ai-taste 的轮播)挂在它后面,冻结期不偷跑。
 *
 * 不虚拟化 setTimeout/setInterval:code-connect 的布局自适应靠它,冻结期也得跑。
 * 时间基准只有 performance.now 和 rAF 时间戳 —— 16 个封面审计过,没有
 * Date.now / 运行时 Math.random(2026-08-16,两个带 random 的只是演示模式兜底)。 */
(() => {
  const rawNow = performance.now.bind(performance);
  const rawRaf = window.requestAnimationFrame.bind(window);
  const rawCancel = window.cancelAnimationFrame.bind(window);

  /* #frozen:从 0 帧起冻结(海报截图与 hover 挂载都走这个模式)。
     用 hash 而不用 query:不打散 HTTP 缓存,同一份文档两种模式复用。 */
  const frozen = location.hash.indexOf('frozen') >= 0;

  let pinned = frozen; /* 时钟钉住:vnow 不再前进 */
  let pinnedAt = 0; /* 钉住时刻的虚拟时间 */
  let offset = rawNow(); /* vnow = rawNow - offset */
  const vnow = () => (pinned ? pinnedAt : rawNow() - offset);
  performance.now = vnow;

  /* 可复现随机(mulberry32):运行时随机的封面(banner 选款、粒子系统)每次加载
     走同一条随机序列,首帧才能与海报同帧。动画放行后序列继续,动态观感不变。 */
  let rs = 0x9e3779b9;
  Math.random = () => {
    rs = (rs + 0x6d2b79f5) | 0;
    let t = Math.imul(rs ^ (rs >>> 15), 1 | rs);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  /* Date.now 也挂到虚拟时钟(固定纪元):voice-particles 拿它驱动波形相位,
     不固定的话首帧相位每次不同。封面里没人拿它显示真实日期(2026-08-16 审计)。 */
  const EPOCH = 1755360000000;
  Date.now = () => EPOCH + vnow();

  /* rAF 分两种状态:
     · 钉住但未 gated(frozen 加载期):回调照常跑、时间戳给 0 —— WebGL 循环
       得靠它把首帧画上屏,只是画面不往前走;
     · gated(pause 后 / frozen 就绪后):回调进队列,play 时原样放行 ——
       动画循环的下一帧从冻结时间续起,dt 正常。 */
  let gated = false;
  const queue = new Map();
  let synthId = -1;
  window.requestAnimationFrame = (cb) => {
    if (gated) {
      const id = synthId--;
      queue.set(id, cb);
      return id;
    }
    return rawRaf(() => cb(vnow()));
  };
  window.cancelAnimationFrame = (id) => {
    if (id < 0) queue.delete(id);
    else rawCancel(id);
  };

  const cssAll = () => (document.getAnimations ? document.getAnimations() : []);

  let startedResolve;
  window.COVER = { started: new Promise((r) => (startedResolve = r)) };
  if (!frozen) startedResolve();

  /* 封面里内嵌的 <video autoplay>(如 poster-stack 的四路动态海报):
     它们不吃虚拟时钟,冻结期要显式按住、放行时恢复 */
  const frozenVids = [];
  const pause = () => {
    if (pinned && gated) return;
    pinnedAt = vnow();
    pinned = true;
    gated = true;
    cssAll().forEach((a) => a.pause());
    document.querySelectorAll('video').forEach((v) => {
      if (v.paused) return;
      v.pause();
      frozenVids.push(v);
    });
  };
  const play = () => {
    if (!pinned && !gated) return;
    offset = rawNow() - pinnedAt;
    pinned = false;
    gated = false;
    cssAll().forEach((a) => a.play());
    frozenVids.splice(0).forEach((v) => {
      const p = v.play();
      if (p && p.catch) p.catch(() => {});
    });
    const q = [...queue.values()];
    queue.clear();
    q.forEach((cb) => rawRaf(() => cb(vnow())));
    startedResolve();
  };

  addEventListener('message', (e) => {
    const t = e && e.data && e.data.type;
    if (t === 'cover-pause') pause();
    else if (t === 'cover-play') play();
  });

  /* 就绪:load(封面内图片已到)→ 字体就绪 → 400ms 沉降 → 两帧 rAF(首帧确实上了屏)。
     沉降期是给「时钟管不到的杂事」留的:code-connect 用 setTimeout(0/60/300)
     做布局自适应,poster-stack 的内嵌视频 seek 到 0 帧也是异步 —— 不等它们落定,
     海报截图和 hover 挂载各自撞上竞态,冻结帧就不可复现(2026-08-17 实测
     SSIM 0.60/0.93 两个离群点正是它俩)。冻结模式下时钟钉死,多等不改画面。
     frozen 模式先把 CSS 动画统一回 0 帧 —— 加载耗时每次不同,不回零的话
     「冻结帧」不可复现,海报和 hover 挂载就对不上同一帧。 */
  const SETTLE_MS = 400;
  const ready = () => {
    if (frozen) {
      cssAll().forEach((a) => {
        a.currentTime = 0;
        a.pause();
      });
      /* 内嵌视频也回 0 帧按住,放行时从头播 —— 与海报截到的画面一致 */
      document.querySelectorAll('video').forEach((v) => {
        if (!v.paused) {
          v.pause();
          frozenVids.push(v);
        }
        try {
          v.currentTime = 0;
        } catch {
          /* 元数据未就绪时 seek 会抛,放过 —— 此时它本来就停在 0 */
        }
      });
    }
    rawRaf(() =>
      rawRaf(() => {
        if (frozen) gated = true;
        window.__coverReady = true; /* 截图脚本轮询这个标志 */
        try {
          parent.postMessage({ type: 'cover-ready' }, '*');
        } catch {
          /* 独立打开(非 iframe)时 parent 就是自己,不会抛;保险起见兜住 */
        }
      }),
    );
  };
  const readySoon = () => setTimeout(ready, SETTLE_MS);
  const fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  if (document.readyState === 'complete') fonts.then(readySoon);
  else addEventListener('load', () => fonts.then(readySoon));
})();
