// WebGL 上下文守卫 —— 解决整页十几个实验同时持有 WebGL 上下文、
// 超过浏览器单页上限(Chrome ~16 个)后最早创建的画布被强制回收变白的问题。
//
// 策略:画布滚出扩展视口(上下各 600px)就主动 loseContext() 让出名额,
// 滚回来再 restoreContext();恢复事件里由调用方重建 program / buffer / uniform
// 位置(每帧 uniform 本来就在 frame() 里重传,JS 侧状态不受影响)。
// 主动让出保证全页存活上下文数始终低于上限,浏览器不再强制回收任何画布。
//
// 用法:上下文创建后把「GL 资源重建函数」注册进来,并立即调用一次该函数:
//   var gl = canvas.getContext('webgl');
//   function setupGL() { ...编译链接 program、建 buffer、取 uniform 位置... }
//   setupGL();
//   guardGL(canvas, gl, setupGL);
// rAF 循环无需改动:上下文丢失期间 draw 调用是无害的空操作。

export function guardGL(canvas, gl, rebuild) {
  // 阻止默认行为是 restore 事件能触发的前提(WebGL 规范要求)
  canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); });
  canvas.addEventListener('webglcontextrestored', function () {
    rebuild();
    gl.viewport(0, 0, canvas.width, canvas.height);
  });

  var ext = gl.getExtension('WEBGL_lose_context');
  if (!ext || typeof IntersectionObserver === 'undefined') return;

  var io = new IntersectionObserver(function (entries) {
    for (var i = 0; i < entries.length; i++) {
      var en = entries[i];
      if (en.isIntersecting) {
        if (gl.isContextLost()) { try { ext.restoreContext(); } catch (_) { /* 非手动丢失时不可恢复,等浏览器自行 restore */ } }
      } else if (!gl.isContextLost()) {
        ext.loseContext();
      }
    }
  }, { rootMargin: '600px 0px 600px 0px' });
  io.observe(canvas);
}
