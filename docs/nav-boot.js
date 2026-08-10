/* nav-boot.js — 顶栏/主题首帧前引导层(React 迁移后的原生部分)。
   内容原样抽取自 writing/writing.js(initSiteNav / 主题三函数 / initNavToggle),
   必须在各入口 <head> 同步加载,body 内联脚本在解析时调用 initSiteNav()+applySiteTheme(),
   保证首次绘制前导航已注入、主题已应用(与旧站同一套代码、同一时机)。 */
/* 顶部导航(一处定义,两页复用)。页面用 <header id="site-nav" data-active="writing|design"> 占位 */
function initSiteNav() {
    const nav = document.getElementById('site-nav');
    if (!nav || nav.dataset.built) return;   // 幂等:解析时已内联注入过则跳过,避免重复构建/闪烁
    nav.dataset.built = '1';
    const active = nav.dataset.active || '';
    // data-base:子目录页面(如 writing/article.html)用 "../" 把站内链接/资源指回 docs 根目录
    const base = nav.dataset.base || '';
    const I = (p) => '<span class="menu-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg></span>';
    const pencil = '<path d="M16.5 4.5 L19.5 7.5 L8 19 L4 20 L5 16 Z"/><path d="M14.5 6.5 L17.5 9.5"/>';
    const design = '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M4 10 H20"/><path d="M10 10 V20"/>';
    const a = (cls) => 'nav-cat' + (active === cls ? ' active' : '');
    // 字标配置:以后换字标只改 WORDMARK 这一处。data-wordmark 写到 .site-title 上,
    // 供 CSS 区分不同字标的细节(例如 LENS 需要与左侧 favicon 多留一点间距,VIBEUX 不需要)。
    const WORDMARK = 'ctr';   // 'ctr' | 'lenslab' | 'lens' | 'vibeux'
    const WORDMARKS = {
        ctr:     { src: 'logo-ctr.svg?v=2', alt: 'TR' },
        lenslab: { src: 'logo-lenslab.svg?v=6', alt: 'LENSLAB' },
        lens:    { src: 'logo-lens-spiral.png?v=1', alt: 'LENS' },
        vibeux:  { src: 'logo-wordmark.png?v=2',    alt: 'VIBEUX' },
    };
    const wm = WORDMARKS[WORDMARK] || WORDMARKS.lens;
    // 顶栏背景层:复用流沙渐变 banner(bare 模式,无文字)。默认透明,滚动到 banner 滚出后(.nav-solid)淡入替代白底。
    // 仅分类页(index / design = design-page 且非 writing-page / reading-page)注入,与 CSS 作用域一致;
    // 阅读页(article)与 writing/index 顶栏维持现状,不注入。
    const bd = document.body.classList;
    // 字标 → 首页入口(index,带 loading;目录形式是规范地址);
    // 「Blog」标签 → blog.html(无 loading 的 Feed 页),Archive⇄Blog 切换不重播 loading。
    const LOGO_HOME = base || './';
    const HOME = base + 'blog.html';
    const wantNavBg = bd.contains('design-page') && !bd.contains('writing-page') && !bd.contains('reading-page');
    const navBg = wantNavBg
        ? '<iframe class="nav-bg" src="' + base + 'writing-banner.html?v=10&bare=1" title="" aria-hidden="true" tabindex="-1" scrolling="no"></iframe>'
        : '';
    /* 全屏菜单 per-character-rise 拆字(与首页索引行同规范,2026-07-22):
       桌面共用同一份 DOM,拆字 span 在桌面无样式、正常渲染;
       rise 隐藏/升起样式仅在 ≤600px 菜单态生效(writing.css)。 */
    var ARROW_SVG = '<svg viewBox="0 0 24 24"><path d="M5.3 18.7 L18 6 M8.1 6 H18 V15.9"/></svg>';
    var riseText = function (text, base) {
        var out = '<span class="heading-rise-mask" aria-hidden="true">';
        /* --i = 字符序号,供顶栏 hover 的逐字上浮取 stagger(--d 含 base 偏移,取不出序号)。
           入场动画仍走 --d,两者互不干扰。 */
        for (var k = 0; k < text.length; k++) out += '<span class="heading-rise-char" style="--d:' + (base + k * 35) + 'ms;--i:' + k + '">' + text[k] + '</span>';
        return out + '</span>';
    };
    var riseArrow = function (base, n) {
        return '<span class="nav-arrow" aria-hidden="true"><span class="heading-rise-mask"><span class="heading-rise-char" style="--d:' + (base + n * 35) + 'ms">' + ARROW_SVG + '</span></span></span>';
    };
    nav.innerHTML =
        navBg +
        '<div class="header-left">' +
            '<a href="' + LOGO_HOME + '" class="site-title" data-wordmark="' + WORDMARK + '" aria-label="' + wm.alt + '"><svg class="site-logo site-logo-svg" viewBox="0 0 200 200" aria-hidden="true"><path fill="currentColor" d="M70 30h100v70H70zM30 100h40v70H30z"/></svg><img src="' + base + wm.src + '" class="site-wordmark" alt="' + wm.alt + '"></a>' +
        '</div>' +
        // 手机端汉堡按钮:桌面隐藏,≤600px 显示;点击展开 .nav-collapse 下拉
        '<button type="button" class="nav-toggle" aria-label="菜单" aria-expanded="false" aria-controls="nav-collapse">' +
            '<span></span><span></span><span></span>' +
        '</button>' +
        // 折叠容器:桌面 display:contents(不产生盒子,Blog/Skills/Contact 仍是顶栏直接 flex 项,布局不变);
        // 手机端变为绝对定位下拉面板,三项纵向排布
        '<div class="nav-collapse" id="nav-collapse">' +
            '<nav class="nav-cats" aria-label="分类">' +
                // .nav-arrow:直角箭头(icon 规范),仅手机端全屏菜单显示(复刻首页索引行版式)
                '<a href="' + HOME + '" class="' + a('writing') + '" aria-label="Blog" style="--row-d:120ms">' + I(pencil) + riseText('Blog', 120) + riseArrow(120, 4) + '</a>' +
                '<a href="' + base + 'archive.html" class="' + a('design') + '" aria-label="Archive" style="--row-d:240ms">' + I(design) + riseText('Archive', 240) + riseArrow(240, 7) + '</a>' +
            '</nav>' +
            '<div class="header-right">' +
                '<a href="mailto:chentongrong1@gmail.com" class="header-connect" title="chentongrong1@gmail.com" aria-label="Contact" style="--row-d:360ms">' +
                    '<svg class="mail-icon" viewBox="2 6.5 20 11" aria-hidden="true"><path fill-rule="evenodd" d="M3.75,6.5 3.75,6.75 3.25,6.75 3.25,7.0 3.0,7.0 3.0,7.25 3.5,7.25 3.5,7.5 3.75,7.5 3.75,7.75 4.0,7.75 4.0,8.0 4.5,8.0 4.5,8.25 4.75,8.25 4.75,8.5 5.0,8.5 5.0,8.75 5.5,8.75 5.5,9.0 5.75,9.0 5.75,9.25 6.0,9.25 6.0,9.5 6.5,9.5 6.5,9.75 6.75,9.75 6.75,10.0 7.0,10.0 7.0,10.25 7.5,10.25 7.5,10.5 7.75,10.5 7.75,10.75 8.0,10.75 8.0,11.0 8.5,11.0 8.5,11.25 8.75,11.25 8.75,11.5 9.0,11.5 9.0,11.75 9.25,11.75 9.25,12.0 9.75,12.0 9.75,12.25 10.0,12.25 10.0,12.5 10.25,12.5 10.25,12.75 10.75,12.75 10.75,13.0 11.0,13.0 11.0,13.25 11.25,13.25 11.25,13.5 11.5,13.5 11.5,13.75 12.5,13.75 12.5,13.5 12.75,13.5 12.75,13.25 13.25,13.25 13.25,13.0 13.5,13.0 13.5,12.75 13.75,12.75 13.75,12.5 14.25,12.5 14.25,12.25 14.5,12.25 14.5,12.0 14.75,12.0 14.75,11.75 15.0,11.75 15.0,11.5 15.5,11.5 15.5,11.25 15.75,11.25 15.75,11.0 16.0,11.0 16.0,10.75 16.5,10.75 16.5,10.5 16.75,10.5 16.75,10.25 17.0,10.25 17.0,10.0 17.5,10.0 17.5,9.75 17.75,9.75 17.75,9.5 18.0,9.5 18.0,9.25 18.25,9.25 18.25,9.0 18.75,9.0 18.75,8.75 19.0,8.75 19.0,8.5 19.25,8.5 19.25,8.25 19.75,8.25 19.75,8.0 20.0,8.0 20.0,7.75 20.25,7.75 20.25,7.5 20.75,7.5 20.75,7.25 21.0,7.25 21.0,7.0 20.75,7.0 20.75,6.75 20.25,6.75 20.25,6.5ZM2.0,8.5 2.0,16.75 2.25,16.75 2.25,17.0 2.5,17.0 2.5,17.25 2.75,17.25 2.75,17.5 8.0,17.5 8.0,17.25 7.5,17.25 7.5,17.0 7.25,17.0 7.25,16.75 7.0,16.75 7.0,12.25 6.75,12.25 6.75,11.75 6.5,11.75 6.5,11.5 6.25,11.5 6.25,11.25 6.0,11.25 6.0,11.0 5.5,11.0 5.5,10.75 5.25,10.75 5.25,10.5 4.75,10.5 4.75,10.25 4.5,10.25 4.5,10.0 4.25,10.0 4.25,9.75 3.75,9.75 3.75,9.5 3.5,9.5 3.5,9.25 3.0,9.25 3.0,9.0 2.75,9.0 2.75,8.75 2.5,8.75 2.5,8.5ZM21.75,8.75 21.5,8.75 21.5,9.0 21.0,9.0 21.0,9.25 20.5,9.25 20.5,9.5 20.25,9.5 20.25,9.75 20.0,9.75 20.0,10.0 19.5,10.0 19.5,10.25 19.25,10.25 19.25,10.5 19.0,10.5 19.0,10.75 18.5,10.75 18.5,11.0 18.25,11.0 18.25,11.25 17.75,11.25 17.75,11.5 17.5,11.5 17.5,11.75 17.25,11.75 17.25,12.25 17.0,12.25 17.0,16.75 16.75,16.75 16.75,17.0 16.5,17.0 16.5,17.25 16.0,17.25 16.0,17.5 21.25,17.5 21.25,17.25 21.75,17.25 21.75,16.75 22.0,16.75 22.0,9.0 21.75,9.0Z"/></svg>' +
                    '<span class="connect-label">' + riseText('Contact', 360) + '</span>' + riseArrow(360, 7) +
                '</a>' +
            '</div>' +
        '</div>';
    initNavToggle(nav);
    /* 顶栏三项:移出时让字「滚过去」—— 向下沉出遮罩,再从上方回到原位。
       移入那一段是纯 CSS(:hover),但移出瞬间 :hover 规则就没了、动画跟着消失,
       所以这一段只能靠 class 驱动。用 nav-rolling,动画播完自己摘掉。
       连续快速划过时要能重新触发:先摘类 + 强制重排,再加回去。 */
    Array.prototype.forEach.call(nav.querySelectorAll('.nav-cats .nav-cat, .header-connect'), function (el) {
        el.addEventListener('mouseenter', function () { el.classList.remove('nav-rolling'); });
        el.addEventListener('mouseleave', function () {
            el.classList.remove('nav-rolling');
            void el.offsetWidth;
            el.classList.add('nav-rolling');
        });
        el.addEventListener('animationend', function (e) {
            if (e.animationName === 'nav-char-roll') el.classList.remove('nav-rolling');
        });
    });
    /* 右上角深/浅色切换按钮:首页 / Blog / Archive / 文章详情页都有
       (2026-08-11 文章详情页补上深色主题,顶栏与 Blog 对齐,自然也要这颗切换键) */
    if (bd.contains('home-landing') || bd.contains('blog-page') || bd.contains('works-page') || bd.contains('reading-page')) {
        var tt = document.createElement('button');
        tt.type = 'button';
        tt.className = 'theme-toggle';
        tt.setAttribute('aria-label', '切换深色 / 浅色模式');
        /* 双 icon:浅色显示太阳、深色显示月亮(writing.css 按 body.theme-dark 切换显隐) */
        tt.innerHTML =
            '<svg class="tt-sun" viewBox="0 0 24 24" aria-hidden="true">' +
                '<circle cx="12" cy="12" r="4.6"/>' +
                '<path d="M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5.2 5.2l1.9 1.9M16.9 16.9l1.9 1.9M18.8 5.2l-1.9 1.9M7.1 16.9l-1.9 1.9"/>' +
            '</svg>' +
            '<svg class="tt-moon" viewBox="0 0 24 24" aria-hidden="true">' +
                '<path d="M20.6 13.4A8.4 8.4 0 1 1 10.6 3.4 6.6 6.6 0 0 0 20.6 13.4z"/>' +
            '</svg>';
        tt.addEventListener('click', toggleSiteTheme);
        nav.appendChild(tt);
    }
}

/* ---- 站点主题(浅色 / 深色)----
   首页右上角按钮切换,sessionStorage('site-theme') 记忆,首页 / Blog / Archive /
   文章详情页共用(详情页 2026-08-11 接入)。theme-dark / menu-dark 是既有的
   深色改版类,切换 = 在 body 上挂 / 摘这两个类,深浅两套样式都在 writing.css 里。
   applySiteTheme() 需在各页 body 起始的内联脚本里、initSiteNav() 之后同步调用,
   保证首次绘制前就带上主题类、不闪色。 */
function setSiteTheme(dark) {
    /* 切换期间把所有过渡压到一档:底色是下面几行内联写的、瞬切,而文字色走各自的
       hover 过渡(实测 .w-title 的 color 0.42s,要 450ms 才褪完)——两者脱节,看着
       就是「底色已经黑了、字还在慢慢变」(2026-07-28 用户反馈「切换太慢」)。
       240ms 后摘掉,不影响常规 hover 手感。 */
    document.body.classList.add('theme-switching');
    setTimeout(function () { document.body.classList.remove('theme-switching'); }, 240);
    document.body.classList.toggle('theme-dark', dark);
    /* 菜单与页面主题「反着来」(2026-07-28 用户定:浅色模式 = 黑背景菜单,
       深色模式 = 浅背景菜单)。所以这里取反,不是跟随。
       走过两次弯路:先做成静态类让菜单恒黑(那样不随主题变),再改成跟随主题
       (方向反了)。 */
    document.body.classList.toggle('menu-dark', !dark);
    /* html 背景必须跟 body 同色:内容不满一屏 / 橡皮筋滚动时露出的是 html 底,
       只翻 body 会在页面底部留一条异色(浅色 #f2f2f2 = --site-bg,深色 #0a0a0a = --page-bg)。
       2026-07-27 底色加深时这里一度漏改(仍写旧 #f9f9f9):主题切换重绘的一两帧里
       html 与 body 两层颜色对不上,边缘闪异色 —— 改 --site-bg 必须同步这里。
       用内联样式写 —— 首页 loading 的 cleanup 也是内联写这里,保持同一优先级。 */
    document.documentElement.style.background = dark ? '#0a0a0a' : '#f2f2f2';
}
function applySiteTheme() {
    /* 2026-07-22 改为会话级记忆:每次新会话强制浅色,切换只在当前会话内保持。
       顺带清掉旧版遗留的 localStorage 跨会话记忆(老访客不再被锁在深色)。 */
    try {
        localStorage.removeItem('site-theme');
        /* 无论深浅都要调一次:菜单类是取反挂的,默认浅色时若不调,
           menu-dark 就挂不上,首屏打开菜单会是浅底(应为黑底)。 */
        setSiteTheme(sessionStorage.getItem('site-theme') === 'dark');
    } catch (e) { /* 隐私模式等取不到 storage 时静默,维持浅色 */ }
}
function toggleSiteTheme() {
    var dark = !document.body.classList.contains('theme-dark');
    setSiteTheme(dark);
    try { sessionStorage.setItem('site-theme', dark ? 'dark' : 'light'); } catch (e) {}
}

/* 手机端顶栏汉堡菜单:点击 .nav-toggle 展开/收起 .nav-collapse 下拉;点击面板外或选项后收起 */
function initNavToggle(nav) {
    const btn = nav.querySelector('.nav-toggle');
    const panel = nav.querySelector('.nav-collapse');
    if (!btn || !panel) return;
    const setOpen = (open) => {
        nav.classList.toggle('nav-open', open);
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        document.body.classList.toggle('nav-locked', open);   // 模态展开时锁定页面滚动
    };
    // 右上角按钮(汉堡 ⇄ X)开合
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        setOpen(!nav.classList.contains('nav-open'));
    });
    // 点击模态内的链接:
    // · mailto(Contact)不发生页面跳转 —— 立即收起菜单,否则会永远盖着页面。
    // · 页面跳转类(Blog / Archive,含跳回本页 = 整页 reload)不播收起动画:
    //   收起会瞬时复位字符、黑块/分割线/面板再各按时长淡出,新页首绘前
    //   旧页是一堆先后消失的残影(2026-07-26 用户反馈)。改为菜单原样冻结、
    //   被点的行加 .nav-leaving 钉住反色,直到浏览器整页切换;
    //   reload 后的新页本来就是收起态,不存在「菜单盖在新页上」。
    // 点击模态空白区 / 模态外 / Esc 仍不收起(只有 X 或选项能关)。
    panel.addEventListener('click', (e) => {
        const link = e.target.closest('a[href]');
        if (!link) return;
        if ((link.getAttribute('href') || '').indexOf('mailto:') === 0) { setOpen(false); return; }
        link.classList.add('nav-leaving');
    });
    // 从 bfcache 返回(iOS 后退)会原样恢复「菜单开 + 行反色」的冻结页面:复位
    window.addEventListener('pageshow', (e) => {
        if (!e.persisted) return;
        panel.querySelectorAll('.nav-leaving').forEach((el) => el.classList.remove('nav-leaving'));
        setOpen(false);
    });
}
