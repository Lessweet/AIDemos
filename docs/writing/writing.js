/**
 * Writing — 列表页标签筛选 + reveal 动效 + 阅读页目录(TOC)
 * 复用 ../script.js 的 brand banner / sticky header,这里只补文章特有逻辑。
 */
document.addEventListener('DOMContentLoaded', () => {
    initPageTint();
    initSiteNav();
    initStickyMenu();
    initArticleReveal();
    initReveal();
    initTagFilter();
    initWritingFilter();
    initTOC();
    initReader();
    initNavSpy();
    initScrollProgress();
    initNavSolidOnScroll();
});

/* 分类页:顶栏初始透明叠在通栏 banner 上;banner 向上滚出顶栏后给顶栏加 .nav-solid → 变白底。
   判据:banner 底边滚到顶栏下沿(navH)之上时,顶栏不再压着 banner。 */
function initNavSolidOnScroll() {
    const nav = document.querySelector('.header.home-nav');
    const banner = document.querySelector('.design-banner-frame');
    if (!nav || !banner) return;   // 文章页无 banner,跳过
    const update = () => {
        const solid = banner.getBoundingClientRect().bottom <= nav.offsetHeight;
        nav.classList.toggle('nav-solid', solid);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
}

/* 顶栏底部滚动进度条:进度 = 已滚动距离 / 可滚动总距离(0~1),写到顶栏的 --scroll-progress,
   CSS 用它 scaleX 拉伸进度条。页面不可滚动时进度为 0(条宽 0,不显示)。 */
function initScrollProgress() {
    const header = document.querySelector('.header');
    if (!header) return;
    const doc = document.documentElement;
    let ticking = false;
    const update = () => {
        ticking = false;
        const max = doc.scrollHeight - doc.clientHeight;
        const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
        header.style.setProperty('--scroll-progress', p);
    };
    const onScroll = () => {
        if (!ticking) { ticking = true; requestAnimationFrame(update); }
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
}

/* 阅读页底层规则:每篇文章都必须有底色。
   手动在 <body data-tint="..."> 写了就用手动的;没写就按文章 slug 稳定哈希,
   从纯色盘里自动分配一个 —— 同一篇永远同一色,不同篇尽量不同。
   (渐变档不参与自动分配,是 opt-in 的手动选择) */
function initPageTint() {
    const body = document.body;
    if (!body || !body.classList.contains('reading-page')) return;
    if (body.dataset.tint) return;   // 手动指定优先
    const SOLIDS = ['violet', 'blue', 'mint', 'peach', 'rose', 'sand'];
    const slug = body.dataset.slug
        || (location.pathname.split('/').pop() || 'article').replace(/\.html?$/, '');
    let hash = 0;
    for (let i = 0; i < slug.length; i++) hash = (hash * 31 + slug.charCodeAt(i)) >>> 0;
    body.dataset.tint = SOLIDS[hash % SOLIDS.length];
}

/* 移动端:把胶囊分类条的 sticky top 设为顶栏实际高度,使其紧贴顶栏下方 */
function initStickyMenu() {
    const menu = document.querySelector('.design-menu');
    const header = document.querySelector('.header');
    if (!menu || !header) return;
    const set = () => document.documentElement.style.setProperty('--design-menu-top', header.offsetHeight + 'px');
    set();
    window.addEventListener('resize', set);
    window.addEventListener('load', set);
}

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
        ctr:     { src: 'logo-ctr.svg?v=1', alt: 'CTR' },
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
    var NAV_ARROW = '<span class="nav-arrow" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5.3 18.7 L18 6 M8.1 6 H18 V15.9"/></svg></span>';
    nav.innerHTML =
        navBg +
        '<div class="header-left">' +
            '<a href="' + LOGO_HOME + '" class="site-title" data-wordmark="' + WORDMARK + '" aria-label="' + wm.alt + '"><img src="' + base + 'favicon.png?v=20" class="site-logo" alt=""><img src="' + base + wm.src + '" class="site-wordmark" alt="' + wm.alt + '"></a>' +
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
                '<a href="' + HOME + '" class="' + a('writing') + '">' + I(pencil) + 'Blog' + NAV_ARROW + '</a>' +
                '<a href="' + base + 'archive.html" class="' + a('design') + '">' + I(design) + 'Archive' + NAV_ARROW + '</a>' +
            '</nav>' +
            '<div class="header-right">' +
                '<a href="mailto:chentongrong1@gmail.com" class="header-connect" title="chentongrong1@gmail.com" aria-label="Contact">' +
                    '<svg class="mail-icon" viewBox="2 6.5 20 11" aria-hidden="true"><path fill-rule="evenodd" d="M3.75,6.5 3.75,6.75 3.25,6.75 3.25,7.0 3.0,7.0 3.0,7.25 3.5,7.25 3.5,7.5 3.75,7.5 3.75,7.75 4.0,7.75 4.0,8.0 4.5,8.0 4.5,8.25 4.75,8.25 4.75,8.5 5.0,8.5 5.0,8.75 5.5,8.75 5.5,9.0 5.75,9.0 5.75,9.25 6.0,9.25 6.0,9.5 6.5,9.5 6.5,9.75 6.75,9.75 6.75,10.0 7.0,10.0 7.0,10.25 7.5,10.25 7.5,10.5 7.75,10.5 7.75,10.75 8.0,10.75 8.0,11.0 8.5,11.0 8.5,11.25 8.75,11.25 8.75,11.5 9.0,11.5 9.0,11.75 9.25,11.75 9.25,12.0 9.75,12.0 9.75,12.25 10.0,12.25 10.0,12.5 10.25,12.5 10.25,12.75 10.75,12.75 10.75,13.0 11.0,13.0 11.0,13.25 11.25,13.25 11.25,13.5 11.5,13.5 11.5,13.75 12.5,13.75 12.5,13.5 12.75,13.5 12.75,13.25 13.25,13.25 13.25,13.0 13.5,13.0 13.5,12.75 13.75,12.75 13.75,12.5 14.25,12.5 14.25,12.25 14.5,12.25 14.5,12.0 14.75,12.0 14.75,11.75 15.0,11.75 15.0,11.5 15.5,11.5 15.5,11.25 15.75,11.25 15.75,11.0 16.0,11.0 16.0,10.75 16.5,10.75 16.5,10.5 16.75,10.5 16.75,10.25 17.0,10.25 17.0,10.0 17.5,10.0 17.5,9.75 17.75,9.75 17.75,9.5 18.0,9.5 18.0,9.25 18.25,9.25 18.25,9.0 18.75,9.0 18.75,8.75 19.0,8.75 19.0,8.5 19.25,8.5 19.25,8.25 19.75,8.25 19.75,8.0 20.0,8.0 20.0,7.75 20.25,7.75 20.25,7.5 20.75,7.5 20.75,7.25 21.0,7.25 21.0,7.0 20.75,7.0 20.75,6.75 20.25,6.75 20.25,6.5ZM2.0,8.5 2.0,16.75 2.25,16.75 2.25,17.0 2.5,17.0 2.5,17.25 2.75,17.25 2.75,17.5 8.0,17.5 8.0,17.25 7.5,17.25 7.5,17.0 7.25,17.0 7.25,16.75 7.0,16.75 7.0,12.25 6.75,12.25 6.75,11.75 6.5,11.75 6.5,11.5 6.25,11.5 6.25,11.25 6.0,11.25 6.0,11.0 5.5,11.0 5.5,10.75 5.25,10.75 5.25,10.5 4.75,10.5 4.75,10.25 4.5,10.25 4.5,10.0 4.25,10.0 4.25,9.75 3.75,9.75 3.75,9.5 3.5,9.5 3.5,9.25 3.0,9.25 3.0,9.0 2.75,9.0 2.75,8.75 2.5,8.75 2.5,8.5ZM21.75,8.75 21.5,8.75 21.5,9.0 21.0,9.0 21.0,9.25 20.5,9.25 20.5,9.5 20.25,9.5 20.25,9.75 20.0,9.75 20.0,10.0 19.5,10.0 19.5,10.25 19.25,10.25 19.25,10.5 19.0,10.5 19.0,10.75 18.5,10.75 18.5,11.0 18.25,11.0 18.25,11.25 17.75,11.25 17.75,11.5 17.5,11.5 17.5,11.75 17.25,11.75 17.25,12.25 17.0,12.25 17.0,16.75 16.75,16.75 16.75,17.0 16.5,17.0 16.5,17.25 16.0,17.25 16.0,17.5 21.25,17.5 21.25,17.25 21.75,17.25 21.75,16.75 22.0,16.75 22.0,9.0 21.75,9.0Z"/></svg>' +
                    '<span class="connect-label">Contact</span>' + NAV_ARROW +
                '</a>' +
            '</div>' +
        '</div>';
    initNavToggle(nav);
    /* 右上角深/浅色切换按钮:首页 / Blog / Archive 三页都有(文章详情页不放) */
    if (bd.contains('home-landing') || bd.contains('blog-page') || bd.contains('works-page')) {
        var tt = document.createElement('button');
        tt.type = 'button';
        tt.className = 'theme-toggle';
        tt.setAttribute('aria-label', '切换深色 / 浅色模式');
        tt.innerHTML =
            '<svg viewBox="0 0 24 24" aria-hidden="true">' +
                '<circle cx="12" cy="12" r="4.6"/>' +
                '<path d="M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5.2 5.2l1.9 1.9M16.9 16.9l1.9 1.9M18.8 5.2l-1.9 1.9M7.1 16.9l-1.9 1.9"/>' +
            '</svg>';
        tt.addEventListener('click', toggleSiteTheme);
        nav.appendChild(tt);
    }
}

/* ---- 站点主题(浅色 / 深色)----
   首页右上角按钮切换,localStorage('site-theme') 记忆,首页 / Blog / Archive 共用;
   文章详情页(reading-page)不参与、保持原样。theme-dark / menu-dark 是既有的
   深色改版类,切换 = 在 body 上挂 / 摘这两个类,深浅两套样式都在 writing.css 里。
   applySiteTheme() 需在各页 body 起始的内联脚本里、initSiteNav() 之后同步调用,
   保证首次绘制前就带上主题类、不闪色。 */
function setSiteTheme(dark) {
    document.body.classList.toggle('theme-dark', dark);
    document.body.classList.toggle('menu-dark', dark);
    /* html 背景必须跟 body 同色:内容不满一屏 / 橡皮筋滚动时露出的是 html 底,
       只翻 body 会在页面底部留一条异色(浅色 #f9f9f9 = --site-bg,深色 #0a0a0a = --page-bg)。
       用内联样式写 —— 首页 loading 的 cleanup 也是内联写这里,保持同一优先级。 */
    document.documentElement.style.background = dark ? '#0a0a0a' : '#f9f9f9';
}
function applySiteTheme() {
    try {
        if (localStorage.getItem('site-theme') === 'dark') setSiteTheme(true);
    } catch (e) { /* 隐私模式等取不到 localStorage 时静默,维持浅色 */ }
}
function toggleSiteTheme() {
    var dark = !document.body.classList.contains('theme-dark');
    setSiteTheme(dark);
    try { localStorage.setItem('site-theme', dark ? 'dark' : 'light'); } catch (e) {}
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
    // 点击模态内的链接(Blog / Skills / Contact)收起菜单,再正常跳转 ——
    // 首页点 Blog 是跳回本页(./),不收起菜单就会盖在刚加载出来的页面上。
    // 点击模态空白区 / 模态外 / Esc 仍不收起(只有 X 或选项能关)。
    panel.addEventListener('click', (e) => {
        if (e.target.closest('a[href]')) setOpen(false);
    });
}

/* 首页 v2:右侧导航(.nav-cat)随滚动高亮当前模块 */
function initNavSpy() {
    const links = Array.from(document.querySelectorAll('.nav-cat[href^="#"]'));
    if (!links.length || !('IntersectionObserver' in window)) return;

    const map = new Map();
    links.forEach((a) => {
        const sec = document.querySelector(a.getAttribute('href'));
        if (sec) map.set(sec, a);
    });
    if (!map.size) return;

    const spy = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            const a = map.get(entry.target);
            if (a) a.dataset.visible = entry.isIntersecting ? '1' : '';
        });
        // 最上方仍在视口内的模块为 active
        let active = null;
        for (const [sec, a] of map) {
            if (a.dataset.visible) { active = a; break; }
        }
        links.forEach((a) => a.classList.toggle('active', a === active));
    }, { rootMargin: '-120px 0px -55% 0px', threshold: 0 });

    map.forEach((_, sec) => spy.observe(sec));
}

/* 进入视口逐个淡入 */
/* 阅读页:顶栏以下的正文内容(导言/标题/署名/封面/正文各块/页脚)逐块入场,
   动画与首页网格卡片(.card-wrapper)完全一致:上移 22px + 0.9s 淡入,从上到下一片接一片错开。
   关键的双 requestAnimationFrame:先让 opacity:0 的初始态真正绘制一帧,再开始显现,
   否则首屏第一波会在首次绘制前就加上 .visible、直接以最终态绘制(看起来「没有动画」)。 */
function initArticleReveal() {
    if (!document.body.classList.contains('reading-page')) return;
    const root = document.querySelector('.article-reading');
    if (!root) return;

    const blocks = [];
    Array.from(root.children).forEach((child) => {
        // 正文容器拆到段落/小标题/图片粒度,使级联更细腻;其余块整体入场
        if (child.classList.contains('article-body')) {
            Array.from(child.children).forEach((c) => blocks.push(c));
        } else {
            blocks.push(child);
        }
    });
    if (!blocks.length) return;

    // 首屏块:淡入+上移(.article-enter 含 opacity:0,只给首屏块加)
    const playEnter = (el, delayMs) => {
        el.classList.add('article-enter');
        el.style.animationDelay = (delayMs || 0) + 'ms';
        el.classList.add('play');
    };

    const STAGGER = 120;   // 相邻块之间的错峰间隔(ms)
    const ROW_TOL = 28;    // 顶部相差小于此值视为同一片,一起入场
    // 首屏可见的块,按视觉顺序(getBoundingClientRect.top,已含封面 order:-1 置顶)从上到下逐块错开
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const inViewSet = new Set();
    const inView = blocks
        .filter((el) => { const r = el.getBoundingClientRect(); return r.top < vh - 40 && r.bottom > 0; })
        .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
    inView.forEach((el) => inViewSet.add(el));
    let lastTop = null;
    let step = 0;
    inView.forEach((el) => {
        const top = Math.round(el.getBoundingClientRect().top);
        if (lastTop !== null && top - lastTop > ROW_TOL) step += 1;
        lastTop = top;
        playEnter(el, step * STAGGER);
    });

    // 屏外块:只上移、不淡入。加 .article-move(初始下移、opacity 不变),滚动进入视口时各自播放
    const offscreen = blocks.filter((el) => !inViewSet.has(el));
    if (!('IntersectionObserver' in window)) { offscreen.forEach((el) => el.classList.add('article-move', 'play')); return; }
    offscreen.forEach((el) => el.classList.add('article-move'));
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
            if (!e.isIntersecting) return;
            observer.unobserve(e.target);
            e.target.classList.add('play');
        });
    }, { root: null, rootMargin: '0px 0px -50px 0px', threshold: 0.1 });
    offscreen.forEach((el) => observer.observe(el));
}

function initReveal() {
    const items = document.querySelectorAll('.reveal-up');
    if (!items.length) return;

    if (!('IntersectionObserver' in window)) {
        items.forEach((el) => el.classList.add('visible'));
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, i) => {
            if (!entry.isIntersecting) return;
            const el = entry.target;
            setTimeout(() => el.classList.add('visible'), i * 60);
            observer.unobserve(el);
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    items.forEach((el) => observer.observe(el));
}

/* Writing 列表:左栏门类作筛选。「全部」按发布时间从新到旧合并展示,
   点具体门类只看该类(相对顺序仍是新→旧)。 */
function initWritingFilter() {
    const buttons = Array.from(document.querySelectorAll('.design-menu .nav-cat[data-filter]'));
    const grid = document.querySelector('#writing-all .category-grid');
    if (!buttons.length || !grid) return;

    // 先把所有卡片按发布日期从新到旧排好(一次即可,分类视图也沿用该相对顺序)
    const cards = Array.from(grid.querySelectorAll('.card-wrapper'));
    cards
        .sort((a, b) => (b.dataset.date || '').localeCompare(a.dataset.date || ''))
        .forEach((c) => grid.appendChild(c));

    const apply = (filter) => {
        cards.forEach((c) => {
            c.hidden = !(filter === 'all' || c.dataset.cat === filter);
        });
    };

    buttons.forEach((btn) => {
        btn.addEventListener('click', () => {
            buttons.forEach((b) => b.classList.toggle('active', b === btn));
            apply(btn.dataset.filter || 'all');
        });
    });

    const initial = buttons.find((b) => b.classList.contains('active')) || buttons[0];
    apply(initial.dataset.filter || 'all');
}

/* 标签筛选:按 data-tags(逗号分隔)显隐文章 */
function initTagFilter() {
    const buttons = document.querySelectorAll('.tag-btn[data-tag]');
    const items = document.querySelectorAll('.article-item[data-tags]');
    if (!buttons.length || !items.length) return;

    const apply = (tag) => {
        items.forEach((item) => {
            const tags = (item.dataset.tags || '').split(',').map((t) => t.trim());
            const show = tag === 'all' || tags.includes(tag);
            item.hidden = !show;
        });
    };

    buttons.forEach((btn) => {
        btn.addEventListener('click', () => {
            buttons.forEach((b) => b.classList.toggle('active', b === btn));
            apply(btn.dataset.tag || 'all');
        });
    });
}

/* 阅读页:从正文 h2/h3 生成目录,滚动时高亮当前章节 */
function initTOC() {
    const toc = document.getElementById('toc');
    const body = document.querySelector('.article-body');
    if (!toc || !body) return;

    // 可重复调用:切换文章后先清空旧目录并复位容器显隐
    toc.innerHTML = '';
    const tocAside = toc.closest('.article-toc');
    if (tocAside) tocAside.style.display = '';

    const heads = Array.from(body.querySelectorAll('h2, h3'));
    if (!heads.length) {
        if (tocAside) tocAside.style.display = 'none';
        return;
    }

    const links = [];
    heads.forEach((h, i) => {
        if (!h.id) h.id = 'sec-' + i;
        const a = document.createElement('a');
        a.href = '#' + h.id;
        a.textContent = h.textContent;
        if (h.tagName === 'H3') a.classList.add('sub');
        a.addEventListener('click', (e) => {
            e.preventDefault();
            h.scrollIntoView({ behavior: 'smooth', block: 'start' });
            history.replaceState(null, '', '#' + h.id);
        });
        toc.appendChild(a);
        links.push(a);
    });

    /* scrollspy */
    if (!('IntersectionObserver' in window)) return;
    const seen = new Map();
    const spy = new IntersectionObserver((entries) => {
        entries.forEach((entry) => seen.set(entry.target, entry.isIntersecting));
        let activeId = heads[0].id;
        for (const h of heads) {
            if (seen.get(h)) { activeId = h.id; break; }
            if (h.getBoundingClientRect().top < 140) activeId = h.id;
        }
        links.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + activeId));
    }, { rootMargin: '-120px 0px -70% 0px', threshold: [0, 1] });

    heads.forEach((h) => spy.observe(h));
}

/* ========================================
   阅读页 master–detail 阅读器
   左栏 = 文章清单。数据源 = writing/articles.json(发布时 render.py 自动维护);
   下面 READER_ARTICLES 仅是 fetch 不可用(file:// 直开)时的兜底快照。右栏 = 正文。
   点列表项 / 上一篇下一篇 / 合集链接 → fetch 目标页、只换正文,不整页刷新。
   fetch 不可用时(如 file:// 本地直开)自动兜底为普通跳转,体验降级但不坏。
   ======================================== */
/* READER_ARTICLES:AUTO —— 发布时 render.py 从 articles.json 自动重生成此数组,勿手改。 */
let READER_ARTICLES = [
    { file: "article-codex-voice-delegation.html", cat: "product", title: "把活说给 Codex 之后它停在提交前等确认", date: "2026-08-06", cover: "assets/codex-voice-delegation/cover.png", accent: "#306DB6" },
    { file: "article-selection-as-context.html", cat: "product", title: "AI 产品设计｜选中即上下文", date: "2026-08-05", cover: "assets/selection-as-context/cover.png", accent: "#4B5FE8" },
    { file: "article-genui-no-style-to-write.html", cat: "ui", title: "跳过 Figma 直接用 GenUI 做设计，踩了一路坑，也跑通了上线", date: "2026-08-02", cover: "assets/genui-no-style-to-write/cover5.png", accent: "#1C1B1B" },
    { file: "article-claude-code-verification-loops.html", cat: "product", title: "验证循环，把手动检查写进 Skill", date: "2026-07-23", cover: "assets/claude-code-verification-loops/cover4.png", accent: "#6A823F" },
    { file: "article-figma-make-designer-pr.html", cat: "product", title: "AI native 设计师的交付物，不只设计稿，还有 GitHub PR", date: "2026-07-19", cover: "assets/figma-make-designer-pr/cover4.png", accent: "#2F3336" },
    { file: "article-remove-ai-taste-in-design.html", cat: "ui", title: "看不出 AI 味的 AI 设计方式", date: "2026-07-16", cover: "assets/remove-ai-taste-in-design/cover4.png", accent: "#5A6CD8" },
    { file: "article-figma-make-gpt-5-6.html", cat: "product", title: "设计师的新习惯，给 AI 模型分工", date: "2026-07-11", cover: "assets/figma-make-gpt-5-6/cover3.png", accent: "#5F82F5" },
    { file: "article-review-ai-output.html", cat: "ui", title: "设计师的新工作，审查 AI 产物", date: "2026-07-05", cover: "assets/review-ai-output/cover.png", accent: "#0E9E6E" },
    { file: "article-figma-skills.html", cat: "ui", title: "设计师的新资产，是 Skills", date: "2026-07-05", cover: "assets/figma-skills/cover2.1.png", accent: "#D4A017" },
    { file: "article-figma-shader-motion.html", cat: "ui", title: "在设计系统里，Figma Shader 和 Motion ，正从效果变成可复用元素", date: "2026-07-01", cover: "assets/figma-shader-motion/cover.webp", accent: "#7C4DFF" },
    { file: "article-figma-config-2026.html", cat: "product", title: "设计师被 AI 替代之前，Figma 用一整套新功能抬高设计师上限", date: "2026-06-26", cover: "assets/figma-config-2026/cover.png", accent: "#D4A017" },
    { file: "article-app-shape-for-ai.html", cat: "product", title: "SiriAI 设计", date: "2026-06-25", cover: "assets/app-shape-for-ai/cover_v9.png", accent: "#5B7FFF" },
    { file: "article-sparkle.html", cat: "ui", title: "AI 符号被秒懂，是调用了成熟的用户心智模型", date: "2026-05-24", cover: "assets/sparkle/cover.png", accent: "#6F8FC4" },
];
/* READER_ARTICLES:END */

/* 从 writing/articles.json 拉取最新文章清单 → 映射成 READER_ARTICLES 形状(file/cat/title/date/cover/accent),
   按 date 倒序。fetch 不可用(file://)或失败时返回 null,调用方继续用内置兜底。
   草稿(draft: true)在这里滤掉 —— 这一步不能省:articles.json 是运行时拉的,
   render.py 那边把草稿挡在快照/首页之外没用,页面加载后会从这里把它拉回左栏。 */
function loadReaderManifest() {
    // 带时间戳避免浏览器/CDN 缓存旧清单 —— 否则新发布的文章不会同步进左栏列表
    return fetch('articles.json?t=' + Date.now(), { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
            const arts = data && data.articles;
            if (!Array.isArray(arts) || !arts.length) return null;
            return arts.filter((a) => !a.draft).map((a) => ({
                file: a.file || ('article-' + a.slug + '.html'),
                cat: a.cat || 'product',
                title: a.title || '',
                date: a.date || '',
                cover: a.cover || '',
                accent: a.accent || '',
            })).sort((x, y) => (y.date || '').localeCompare(x.date || ''));
        })
        .catch(() => null);
}
const READER_CATS = [
    { key: 'all', label: '全部' },
    { key: 'ui', label: 'UI 视觉' },
    { key: 'product', label: '产品体验' },
];

const READER_CAT_ICONS = {
    all: '<span class="menu-icon"><svg viewBox="0 0 24 24"><path d="M4.25,4.12 4.25,4.38 4.0,4.38 4.0,11.38 11.25,11.38 11.25,4.38 11.0,4.38 11.0,4.12ZM15.5,4.12 15.5,4.38 14.75,4.38 14.75,4.62 14.25,4.62 14.25,4.88 14.0,4.88 14.0,5.12 13.75,5.12 13.75,5.38 13.5,5.38 13.5,5.62 13.25,5.62 13.25,5.88 13.0,5.88 13.0,6.38 12.75,6.38 12.75,7.62 12.5,7.62 12.5,8.12 12.75,8.12 12.75,9.12 13.0,9.12 13.0,9.62 13.25,9.62 13.25,10.12 13.5,10.12 13.5,10.38 13.75,10.38 13.75,10.62 14.25,10.62 14.25,10.88 14.5,10.88 14.5,11.12 15.0,11.12 15.0,11.38 17.5,11.38 17.5,11.12 18.0,11.12 18.0,10.88 18.5,10.88 18.5,10.62 18.75,10.62 18.75,10.38 19.0,10.38 19.0,10.12 19.25,10.12 19.25,9.88 19.5,9.88 19.5,9.38 19.75,9.38 19.75,8.88 20.0,8.88 20.0,6.62 19.75,6.62 19.75,6.12 19.5,6.12 19.5,5.62 19.25,5.62 19.25,5.38 19.0,5.38 19.0,5.12 18.75,5.12 18.75,4.88 18.25,4.88 18.25,4.62 17.75,4.62 17.75,4.38 17.25,4.38 17.25,4.12ZM5.0,12.88 5.0,13.12 4.75,13.12 4.75,13.38 4.5,13.38 4.5,13.62 4.25,13.62 4.25,14.12 4.0,14.12 4.0,15.38 4.25,15.38 4.25,15.88 4.5,15.88 4.5,16.12 5.0,16.12 5.0,16.38 4.75,16.38 4.75,16.62 4.5,16.62 4.5,16.88 4.25,16.88 4.25,17.38 4.0,17.38 4.0,18.62 4.25,18.62 4.25,19.12 4.5,19.12 4.5,19.38 4.75,19.38 4.75,19.62 5.25,19.62 5.25,19.88 6.5,19.88 6.5,19.62 7.0,19.62 7.0,19.38 7.25,19.38 7.25,19.12 8.0,19.12 8.0,19.38 8.25,19.38 8.25,19.62 8.75,19.62 8.75,19.88 9.75,19.88 9.75,19.62 10.25,19.62 10.25,19.38 10.75,19.38 10.75,18.88 11.0,18.88 11.0,18.38 11.25,18.38 11.25,17.38 11.0,17.38 11.0,16.88 10.75,16.88 10.75,16.62 10.5,16.62 10.5,16.38 10.25,16.38 10.25,16.12 10.5,16.12 10.5,15.88 10.75,15.88 10.75,15.62 11.0,15.62 11.0,15.12 11.25,15.12 11.25,14.12 11.0,14.12 11.0,13.62 10.75,13.62 10.75,13.38 10.5,13.38 10.5,13.12 10.25,13.12 10.25,12.88 8.5,12.88 8.5,13.12 8.0,13.12 8.0,13.38 7.75,13.38 7.75,13.62 7.5,13.62 7.5,13.38 7.25,13.38 7.25,13.12 6.75,13.12 6.75,12.88ZM19.5,12.88 19.5,13.12 19.0,13.12 19.0,13.38 18.5,13.38 18.5,13.62 18.0,13.62 18.0,13.88 17.75,13.88 17.75,14.12 17.25,14.12 17.25,14.38 17.0,14.38 17.0,14.62 16.75,14.62 16.75,14.88 16.25,14.88 16.25,15.12 16.0,15.12 16.0,15.38 15.75,15.38 15.75,15.62 15.5,15.62 15.5,15.88 15.25,15.88 15.25,16.12 15.0,16.12 15.0,16.38 14.75,16.38 14.75,16.62 14.5,16.62 14.5,16.88 14.25,16.88 14.25,17.12 14.0,17.12 14.0,17.62 13.75,17.62 13.75,17.88 13.5,17.88 13.5,18.38 13.25,18.38 13.25,18.88 13.0,18.88 13.0,19.38 12.75,19.38 12.75,19.62 13.0,19.62 13.0,19.88 19.75,19.88 19.75,19.62 20.0,19.62 20.0,12.88Z" fill-rule="evenodd"></path></svg></span>',
    ui: '<span class="menu-icon"><svg viewBox="0 0 24 24"><path d="M10.28,5.12 10.28,5.47 9.25,5.47 9.25,5.81 8.56,5.81 8.56,6.16 8.22,6.16 8.22,6.5 6.16,6.5 6.16,6.84 5.47,6.84 5.47,7.19 4.78,7.19 4.78,7.53 4.44,7.53 4.44,8.22 4.09,8.22 4.09,8.91 3.75,8.91 3.75,9.25 2.72,9.25 2.72,9.59 2.38,9.59 2.38,9.94 2.03,9.94 2.03,10.28 1.69,10.28 1.69,10.62 1.34,10.62 1.34,11.66 1.0,11.66 1.0,12.34 1.34,12.34 1.34,13.03 1.69,13.03 1.69,13.72 2.03,13.72 2.03,14.06 2.38,14.06 2.38,14.41 2.72,14.41 2.72,14.75 3.41,14.75 3.41,15.09 4.09,15.09 4.09,15.78 4.44,15.78 4.44,16.47 4.78,16.47 4.78,16.81 5.47,16.81 5.47,17.16 6.16,17.16 6.16,17.5 8.22,17.5 8.22,17.84 8.56,17.84 8.56,18.19 9.25,18.19 9.25,18.53 9.94,18.53 9.94,18.88 11.31,18.88 11.31,18.53 12.34,18.53 12.34,18.88 14.06,18.88 14.06,18.53 14.75,18.53 14.75,18.19 15.44,18.19 15.44,17.5 17.84,17.5 17.84,17.16 18.53,17.16 18.53,16.81 19.22,16.81 19.22,16.47 19.56,16.47 19.56,15.78 19.91,15.78 19.91,15.09 20.59,15.09 20.59,14.75 21.28,14.75 21.28,14.41 21.62,14.41 21.62,14.06 21.97,14.06 21.97,13.72 22.31,13.72 22.31,13.03 22.66,13.03 22.66,10.97 22.31,10.97 22.31,10.28 21.97,10.28 21.97,9.94 21.62,9.94 21.62,9.59 21.28,9.59 21.28,9.25 19.91,9.25 19.91,8.22 19.56,8.22 19.56,7.88 19.22,7.88 19.22,7.53 18.88,7.53 18.88,7.19 18.53,7.19 18.53,6.84 17.84,6.84 17.84,6.5 15.78,6.5 15.78,6.16 15.44,6.16 15.44,5.81 14.75,5.81 14.75,5.47 14.06,5.47 14.06,5.12 12.69,5.12 12.69,5.47 10.97,5.47 10.97,5.12ZM11.66,8.91 12.34,8.91 12.34,9.25 13.38,9.25 13.38,9.59 13.72,9.59 13.72,9.94 14.41,9.94 14.41,10.62 14.75,10.62 14.75,11.66 15.09,11.66 15.09,12.69 14.75,12.69 14.75,13.38 14.41,13.38 14.41,14.06 14.06,14.06 14.06,14.41 13.38,14.41 13.38,14.75 12.69,14.75 12.69,15.09 10.97,15.09 10.97,14.75 10.28,14.75 10.28,14.41 9.94,14.41 9.94,14.06 9.59,14.06 9.59,13.72 9.25,13.72 9.25,13.03 8.91,13.03 8.91,11.31 9.25,11.31 9.25,10.62 9.59,10.62 9.59,9.94 9.94,9.94 9.94,9.59 10.62,9.59 10.62,9.25 11.66,9.25Z" fill-rule="evenodd"></path></svg></span>',
    product: '<span class="menu-icon"><svg viewBox="0 0 24 24"><path d="M5.12,4.0 5.12,16.0 5.62,16.0 5.62,15.75 6.62,15.75 6.62,16.0 6.88,16.0 6.88,19.75 7.12,19.75 7.12,20.0 9.12,20.0 9.12,16.0 10.88,16.0 10.88,15.75 11.12,15.75 11.12,14.0 12.62,14.0 12.62,15.75 12.88,15.75 12.88,16.0 14.62,16.0 14.62,17.75 14.88,17.75 14.88,18.0 16.62,18.0 16.62,20.0 18.88,20.0 18.88,17.75 17.38,17.75 17.38,17.5 17.12,17.5 17.12,15.75 15.38,15.75 15.38,13.75 15.12,13.75 15.12,13.5 13.62,13.5 13.62,11.75 18.88,11.75 18.88,9.75 16.88,9.75 16.88,8.5 16.62,8.5 16.62,7.75 12.88,7.75 12.88,6.0 12.12,6.0 12.12,5.75 9.38,5.75 9.38,4.0Z" fill-rule="evenodd"></path></svg></span>',
};


/* 当前文章文件名(URL 末段,去掉 # 锚点) */
function currentArticleFile() {
    return (location.pathname.split('/').pop() || 'article.html').split('#')[0];
}
function isArticleFile(file) {
    return READER_ARTICLES.some((it) => it.file === file);
}

function initReader() {
    if (!document.body.classList.contains('reading-page')) return;
    const layout = document.querySelector('.reading-layout');
    const list = document.querySelector('.reader-list');
    if (!layout || !list) return;

    // 把目录/列表 sticky 顶部对齐到顶栏下方(顶栏 fixed,高度随断点变)
    const header = document.querySelector('.header');
    if (header) {
        const setTop = () => document.documentElement.style.setProperty('--reader-toc-top', (header.offsetHeight + 24) + 'px');
        setTop();
        window.addEventListener('resize', setTop);
        window.addEventListener('load', setTop);
    }

    // 量出两栏布局的水平位置,供「整屏固定竖分割线」用 CSS 变量精确对齐列边
    // (用 getBoundingClientRect 而非 100vw,避开滚动条宽度误差;只随 resize/load 变,滚动不动)
    const article = layout.querySelector('.article-reading');
    const setRules = () => {
        const r = layout.getBoundingClientRect();
        const root = document.documentElement.style;
        root.setProperty('--reading-x', Math.round(r.left) + 'px');           // 左缘 → 左线
        root.setProperty('--reading-w', Math.round(r.width) + 'px');          // 宽度 → 右线 = 左缘 + 宽度
        if (article) root.setProperty('--reading-mid', Math.round(article.getBoundingClientRect().left) + 'px'); // 正文左缘 → 中线
    };
    setRules();
    window.addEventListener('resize', setRules);
    window.addEventListener('load', setRules);

    // 把滚轮锁在左栏内:左栏无可滚内容、或已滚到顶/底时,阻止滚动冒泡到页面(右侧不动)。
    // 仅两栏布局(列表可见)生效;单栏时列表 display:none,offsetParent 为 null 直接放行。
    list.addEventListener('wheel', (e) => {
        if (!list.offsetParent) return;                  // 列表隐藏(单栏)→ 不拦截
        const canScroll = list.scrollHeight > list.clientHeight;
        const atTop = list.scrollTop <= 0 && e.deltaY < 0;
        const atBottom = list.scrollTop + list.clientHeight >= list.scrollHeight - 1 && e.deltaY > 0;
        if (!canScroll || atTop || atBottom) e.preventDefault();   // 无内容 / 到边界 → 截断,页面不滚
    }, { passive: false });

    renderReaderList(list, currentArticleFile());   // 先用内置兜底渲染,避免空白/file:// 直开失效
    // 再拉 articles.json 刷新:新发布的文章会自动出现(render.py 发布时已写入清单)
    loadReaderManifest().then((arts) => {
        if (!arts) return;
        READER_ARTICLES = arts;
        renderReaderList(list, currentArticleFile());
    });

    // ≤1440 单栏时:列表收成顶部「文章 ▾」下拉菜单的开关(仅该断点 CSS 显示)
    const setOpen = (open) => {
        layout.classList.toggle('reader-list-open', open);
        const t = layout.querySelector('.reader-list-toggle');
        if (t) t.setAttribute('aria-expanded', open ? 'true' : 'false');
    };
    if (!layout.querySelector('.reader-list-toggle')) {
        const btn = document.createElement('button');
        btn.className = 'reader-list-toggle';
        btn.type = 'button';
        btn.setAttribute('aria-haspopup', 'true');
        btn.setAttribute('aria-expanded', 'false');
        btn.innerHTML =
            '<span>文章</span>' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
            '<path d="M6 9l6 6 6-6"/></svg>';
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            setOpen(!layout.classList.contains('reader-list-open'));
        });
        layout.appendChild(btn);
        // 点击下拉面板外部 / 按 Esc 关闭
        document.addEventListener('click', (e) => {
            if (!layout.classList.contains('reader-list-open')) return;
            if (e.target.closest('.reader-list') || e.target.closest('.reader-list-toggle')) return;
            setOpen(false);
        });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
    }

    // 站内文章链接(列表项 / 上一篇下一篇 / 合集)统一拦截 → 原地切换
    layout.addEventListener('click', (e) => {
        const a = e.target.closest('a[href]');
        if (!a || !layout.contains(a)) return;
        const file = (a.getAttribute('href') || '').split('/').pop().split('#')[0];
        if (!isArticleFile(file)) return;   // 非文章链接(如外链)放行
        e.preventDefault();
        setOpen(false);
        if (file === currentArticleFile()) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
        switchArticle(file, true);
    });

    window.addEventListener('popstate', () => {
        const file = currentArticleFile();
        if (isArticleFile(file)) switchArticle(file, false);
    });
}

/* 渲染左栏:分类筛选 tab + 文章清单。currentFile 决定高亮项。 */
function renderReaderList(list, currentFile) {
    const activeCat = list.dataset.cat || 'all';
    const tabs = READER_CATS.map((c) =>
        '<button class="reader-cat' + (c.key === activeCat ? ' active' : '') + '" data-cat="' + c.key + '" type="button">' + (READER_CAT_ICONS[c.key] || '') + '<span class="reader-cat-label">' + c.label + '</span></button>'
    ).join('');
    const items = READER_ARTICLES.map((it) => {
        const thumb = it.cover
            ? '<img src="' + it.cover + '" alt="" loading="lazy">'
            : '<span class="reader-thumb-ph">封面</span>';
        return '<a class="reader-item' + (it.file === currentFile ? ' active' : '') + '" href="' + it.file + '"' +
            ' data-file="' + it.file + '" data-cat="' + it.cat + '">' +
            '<span class="reader-thumb">' + thumb + '</span>' +
            '<span class="reader-text">' +
                '<span class="reader-title">' + it.title + '</span>' +
                '<span class="reader-date">' + it.date + '</span>' +
            '</span></a>';
    }).join('');
    list.innerHTML =
        '<div class="reader-cats" role="tablist">' + tabs + '</div>' +
        '<div class="reader-items">' + items + '</div>';

    // 筛选栏左右渐变:默认只右侧淡出;向左滑出内容后左侧才淡出,滑到尽头右侧不再淡。
    const cats = list.querySelector('.reader-cats');
    if (cats) {
        const updateFade = () => {
            const atStart = cats.scrollLeft <= 1;
            const atEnd = cats.scrollLeft >= cats.scrollWidth - cats.clientWidth - 1;
            const left = atStart ? '#000' : 'transparent';
            const right = atEnd ? '#000' : 'transparent';
            const mask = 'linear-gradient(to right, ' + left + ', #000 28px, #000 calc(100% - 28px), ' + right + ')';
            cats.style.webkitMaskImage = mask;
            cats.style.maskImage = mask;
        };
        cats.addEventListener('scroll', updateFade, { passive: true });
        window.addEventListener('resize', updateFade);
        updateFade();
    }

    // 分类筛选:按 data-cat 显隐
    list.querySelectorAll('.reader-cat').forEach((btn) => {
        btn.addEventListener('click', () => {
            const cat = btn.dataset.cat || 'all';
            list.dataset.cat = cat;
            list.querySelectorAll('.reader-cat').forEach((b) => b.classList.toggle('active', b === btn));
            list.querySelectorAll('.reader-item').forEach((item) => {
                item.hidden = !(cat === 'all' || item.dataset.cat === cat);
            });
        });
    });
}

/* 切换文章:fetch 目标页 → 只替换 .article-reading,更新标题/底色/目录/入场动画 */
function switchArticle(file, push) {
    const layout = document.querySelector('.reading-layout');
    const live = document.querySelector('.article-reading');
    if (!layout || !live) { location.href = file; return; }
    layout.classList.add('reader-loading');

    fetch(file)
        .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
        .then((html) => {
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const next = doc.querySelector('.article-reading');
            if (!next) throw new Error('目标页缺少 .article-reading');

            live.innerHTML = next.innerHTML;
            if (doc.title) document.title = doc.title;
            // 同步底色:底色统一走 data-tint 命名档(见 writing.css 色卡);
            // 不再用内联 --page-tint,导航时若目标页残留内联则一并清掉,避免带入上一篇底色。
            const tint = doc.body.getAttribute('data-tint');
            if (tint) document.body.setAttribute('data-tint', tint);
            const accent = doc.body.getAttribute('data-accent');
            if (accent) document.body.setAttribute('data-accent', accent); else document.body.removeAttribute('data-accent');
            const inlineTint = doc.body.style.getPropertyValue('--page-tint');
            if (inlineTint) document.body.style.setProperty('--page-tint', inlineTint);
            else document.body.style.removeProperty('--page-tint');

            document.querySelectorAll('.reader-item').forEach((item) =>
                item.classList.toggle('active', item.dataset.file === file));

            if (push) history.pushState({ file: file }, '', file);

            window.scrollTo(0, 0);
            initTOC();            // 用新正文重建目录
            initArticleReveal();  // 重放逐块入场
            layout.classList.remove('reader-loading');
        })
        .catch(() => { location.href = file; });   // 兜底:fetch 不可用 → 普通跳转
}
