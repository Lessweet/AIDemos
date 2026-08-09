/**
 * 文章注册表 —— 全站文章数据的单一来源(编译进 bundle,替代运行时 fetch articles.json)。
 * 字段来源:blog 卡片相关字段以 docs/blog.html 为准;read_time / listCover / excerpt
 * 以 docs/writing/articles.json 为准;文章页字段(accent/tint/封面等)以各 article-*.html 为准。
 * 注意:blogTag 是 blog 卡片上实际展示的单个标签(与 tags[0] 一致,但显式存储防漂移)。
 */
export interface ArticleCover {
  type: 'iframe' | 'video' | 'img';
  src: string;
  poster?: string;
}

export interface ArticleMeta {
  slug: string;
  file: string; // article-<slug>.html(站内链接/切换匹配用)
  title: string; // 纯文本标题(<title> / 列表用)
  date: string;
  readTime: string; // '9 分钟'
  tags: string[];
  cat: 'ui' | 'product';
  accent: string;
  collection: string;
  excerpt: string;
  listCover: string; // 阅读器左栏缩略图(articles.json cover 字段,相对 writing/)
  /* Blog 卡片封面(相对 writing/)。由 scripts/build-card-covers.mjs 从 listCover 压出:
     1200px 宽 webp。listCover 是设计原图(最大 6MB、3240px 宽),拿它直接当卡片封面
     会让 Blog 首屏拉 30MB —— 卡片实际只显示 382px(2026-07-28 用户报「封面加载不出来」)。 */
  cardCover?: string;
  /** blog 卡片(docs/blog.html 为准) */
  inBlogGrid: boolean;
  blogTag?: string;
  blogDelay?: number;
  blogCover?: ArticleCover; // src 相对站点根
  /** 状态 */
  draft?: boolean; // voices(articles.json draft:true)/ app-shape(status:draft)
  unlisted?: boolean; // figma-agent / genie:文件存在但不在任何列表
}

export const ARTICLES: ArticleMeta[] = [
  {
    slug: 'beyond-chat-edit-in-place',
    file: 'article-beyond-chat-edit-in-place.html',
    title: 'AI 产品设计｜修改在内容上而不是聊天框里',
    date: '2026-08-05',
    readTime: '9 分钟',
    tags: ['AI 界面模式'],
    cat: 'ui',
    accent: '#B8550F',
    collection: 'AI 产品设计',
    excerpt:
      '聊天框里改一句话，得先把它说成一段话。提示词增强、智能文档、输出级撤销这三个模式围着同一条线转，写作流程里的修改、调整、编辑和回退，各自该长成什么控件。',
    listCover: 'assets/beyond-chat-edit-in-place/cover.png',
    inBlogGrid: false,
    draft: true, // 2026-08-09 用户下线:站上完全不存在(voices 同款,docs 页面进 .gitignore)
  },
  {
    slug: 'code-connect-mcp-coverage',
    file: 'article-code-connect-mcp-coverage.html',
    title: '设计走查揪的细节恰好是 AI 生成代码差的那一点',
    date: '2026-08-07',
    readTime: '7 分钟',
    tags: ['设计系统', 'AI 代码生成'],
    cat: 'product',
    accent: '#17A57E',
    collection: 'Figma 观察',
    excerpt:
      'AI agent 从设计稿生成代码，图标画错 glyph、间距丢了、tab 不可交互，全是设计师走查才揪得出来的细节。组件映射喂给 AI 之后偏差消失了，像素级还原靠的是 agent 拿到了正确的组件。',
    listCover: 'assets/code-connect-mcp-coverage/cover.png',
    inBlogGrid: false,
    draft: true, // 2026-08-09 用户下线:站上完全不存在(voices 同款,docs 页面进 .gitignore)
  },
  {
    slug: 'codex-voice-delegation',
    file: 'article-codex-voice-delegation.html',
    title: 'ChatGPT Voice 用聊天的方式干活，还能随时打断',
    date: '2026-08-06',
    readTime: '6 分钟',
    tags: ['派活式交互'],
    cat: 'product',
    accent: '#306DB6',
    collection: '',
    excerpt:
      'Codex 语音接的是完整的多线程能力，按热键唤起、读屏拿上下文、同时派出几条线程；可逆的动作自动跑，下单和提交这类不可逆的动作，全部停在人点确认之前。',
    listCover: 'assets/codex-voice-delegation/cover.png',
    inBlogGrid: false,
    draft: true, // 2026-08-09 用户下线:站上完全不存在(voices 同款,docs 页面进 .gitignore)
  },
  {
    slug: 'selection-as-context',
    file: 'article-selection-as-context.html',
    title: 'AI 产品设计｜选中即上下文',
    date: '2026-08-05',
    readTime: '7 分钟',
    tags: ['上下文当对象'],
    cat: 'product',
    accent: '#4B5FE8',
    collection: '',
    excerpt:
      '选中一段文字，它就变成对话的上下文，看得见，删得掉。Monica、Gemini、ChatGPT 三家取舍各不相同。',
    listCover: 'assets/selection-as-context/cover.png',
    cardCover: 'assets/cards/selection-as-context.webp',
    inBlogGrid: true,
    blogTag: '上下文当对象',
    blogDelay: 600,
    blogCover: { type: 'iframe', src: 'writing/assets/selection-as-context/cover.html' },
  },
  {
    slug: 'genui-no-style-to-write',
    file: 'article-genui-no-style-to-write.html',
    title: '跳过 Figma 直接用 GenUI 做设计，踩了一路坑，也跑通了上线',
    date: '2026-08-02',
    readTime: '6 分钟',
    tags: ['GenUI', '设计系统'],
    cat: 'ui',
    accent: '#1C1B1B',
    collection: '',
    excerpt:
      '视觉决策前置到 token，使用规则显式化成契约，agent 手里只剩组装；7 天 330 个提交跑下来，真实环境的失控让我确定暂时走不了 A2UI 那条路。',
    listCover: 'assets/genui-no-style-to-write/cover5.png',
    cardCover: 'assets/cards/genui-no-style-to-write.webp',
    inBlogGrid: true,
    blogTag: 'GenUI',
    blogDelay: 550,
    blogCover: { type: 'iframe', src: 'writing/assets/genui-no-style-to-write/cover5.html' },
  },
  {
    slug: 'claude-code-verification-loops',
    file: 'article-claude-code-verification-loops.html',
    title: '验证循环，把手动检查写进 Skill',
    date: '2026-07-23',
    readTime: '6 分钟',
    tags: ['Agent 协作'],
    cat: 'product',
    accent: '#6A823F',
    collection: '',
    excerpt:
      'Anthropic 博客提了一个概念——验证循环：每次重复做的手动检查，写成 Skill 让 Claude 自己跑。编进去的规矩越多，AI 第一次出手就越接近你要的标准。',
    listCover: 'assets/claude-code-verification-loops/cover4.png',
    cardCover: 'assets/cards/claude-code-verification-loops.webp',
    inBlogGrid: true,
    blogTag: 'Agent 协作',
    blogDelay: 500,
    blogCover: { type: 'iframe', src: 'writing/assets/claude-code-verification-loops/cover4.html' },
  },
  {
    slug: 'figma-make-designer-pr',
    file: 'article-figma-make-designer-pr.html',
    title: 'AI native 设计师的交付物，不只设计稿，还有 GitHub PR',
    date: '2026-07-19',
    readTime: '5 分钟',
    tags: ['设计协作'],
    cat: 'product',
    accent: '#2F3336',
    collection: 'Figma 观察',
    excerpt:
      '设计师直接交付，在 AI native 团队已经是常态：Figma Make 连上真实仓库改细节、发 PR，Slack 里 Claude Tag 几分钟挂出草稿 PR；不要求设计师变成工程师，判断力花在各自擅长处，从画布一路带进合并的 PR。',
    listCover: 'assets/figma-make-designer-pr/cover4.png',
    cardCover: 'assets/cards/figma-make-designer-pr.webp',
    inBlogGrid: true, // 2026-07-22 用户要求上线到 blog 网格(迁移时曾按旧站缺席状态复刻)
    blogTag: '设计协作',
    blogDelay: 450,
    blogCover: { type: 'iframe', src: 'writing/assets/figma-make-designer-pr/cover4.html' },
  },
  {
    slug: 'remove-ai-taste-in-design',
    file: 'article-remove-ai-taste-in-design.html',
    title: '看不出 AI 味的 AI 设计方式',
    date: '2026-07-16',
    readTime: '6 分钟',
    tags: ['刻意零 AI'],
    cat: 'ui',
    accent: '#5A6CD8',
    collection: '',
    excerpt:
      'AI 能实现 shader，但生成的默认值不代表想要的效果。设计师的品味得通过参数、mood board、甚至刻意零 AI 的手绘，一层层加进去。',
    listCover: 'assets/remove-ai-taste-in-design/cover4.png',
    cardCover: 'assets/cards/remove-ai-taste-in-design.webp',
    inBlogGrid: true,
    blogTag: '刻意零 AI',
    blogDelay: 400,
    blogCover: { type: 'iframe', src: 'writing/assets/remove-ai-taste-in-design/cover4.html' },
  },
  {
    slug: 'voices',
    file: 'article-voices.html',
    title: 'Voices',
    date: '2026-07-14',
    readTime: '3 分钟',
    tags: ['听觉优先', '无界面交互'],
    cat: 'ui',
    accent: '#D6558E',
    collection: '',
    excerpt: '当界面开始说话，设计的重心从「看」挪到「听」——一篇跑封面与发布链路的测试稿。',
    listCover: 'assets/voices/cover.png',
    inBlogGrid: false,
    draft: true,
  },
  {
    slug: 'figma-make-gpt-5-6',
    file: 'article-figma-make-gpt-5-6.html',
    title: '设计师的新习惯，给 AI 模型分工',
    date: '2026-07-11',
    readTime: '6 分钟',
    tags: ['AI 设计工作流'],
    cat: 'product',
    accent: '#5F82F5',
    collection: 'Figma 观察',
    excerpt:
      'Fable 做复杂设计，Opus 做常规实现，Sonnet 干辅助活；新模型发布就拿旧任务再做一遍，感知质量的进步，再决定要不要换进工作流。',
    listCover: 'assets/figma-make-gpt-5-6/cover3.png',
    cardCover: 'assets/cards/figma-make-gpt-5-6.webp',
    inBlogGrid: true,
    blogTag: 'AI 设计工作流',
    blogDelay: 350,
    blogCover: { type: 'iframe', src: 'writing/assets/figma-make-gpt-5-6/cover3.html' },
  },
  {
    slug: 'review-ai-output',
    file: 'article-review-ai-output.html',
    title: '设计师的新工作，审查 AI 产物',
    date: '2026-07-05',
    readTime: '7 分钟',
    tags: ['AI 辅助工作流'],
    cat: 'ui',
    accent: '#0E9E6E',
    collection: '',
    excerpt:
      'AI 生成的半成品完成度越来越高，设计师的活儿正从「从零创作」变成「审查与打磨」——怎么在 AI 产物上继续投入，直到做出无法被反驳的东西。',
    listCover: 'assets/review-ai-output/cover.png',
    cardCover: 'assets/cards/review-ai-output.webp',
    inBlogGrid: true,
    blogTag: 'AI 辅助工作流',
    blogDelay: 300,
    blogCover: { type: 'iframe', src: 'writing/assets/review-ai-output/cover.html' },
  },
  {
    slug: 'figma-skills',
    file: 'article-figma-skills.html',
    title: '设计师的新资产，是 Skills',
    date: '2026-07-05',
    readTime: '9 分钟',
    tags: ['Agent 协作'],
    cat: 'ui',
    accent: '#D4A017',
    collection: '',
    excerpt:
      '第一次接触 Skills 是在 vibe coding 里攒图标系列；这回在 Figma 里拿一个小需求上手，再看官方 blog 的团队协作案例。设计系统管零件，Skills 管规矩。',
    listCover: 'assets/figma-skills/cover2.1.png',
    cardCover: 'assets/cards/figma-skills.webp',
    inBlogGrid: true,
    blogTag: 'Agent 协作',
    blogDelay: 250,
    blogCover: { type: 'iframe', src: 'writing/assets/figma-skills/cover2.1.html' },
  },
  {
    slug: 'figma-shader-motion',
    file: 'article-figma-shader-motion.html',
    title: '在设计系统里，Figma Shader 和 Motion ，正从效果变成可复用元素',
    date: '2026-07-01',
    readTime: '8 分钟',
    tags: ['参数化材质', '动效即组件'],
    cat: 'ui',
    accent: '#7C4DFF',
    collection: 'Figma 观察',
    excerpt:
      '不开 AE 和 C4D，我在 Figma 里用官方预设做了几张 shader 视觉图和动图；Motion 比 AE 轻，更有用的是能把一段动效做成组件、复用到整套图标上。Figma Shader 和 Motion，正在被当成组件和变量那样对待，从「加在最后」变成「一开始就在画布上」。',
    listCover: 'assets/figma-shader-motion/cover.webp',
    cardCover: 'assets/cards/figma-shader-motion.webp',
    inBlogGrid: true,
    blogTag: '参数化材质',
    blogDelay: 200,
    blogCover: {
      type: 'video',
      src: 'writing/assets/figma-shader-motion/cover_anim.mp4?v=2',
      poster: 'writing/assets/figma-shader-motion/cover.webp',
    },
  },
  {
    slug: 'figma-config-2026',
    file: 'article-figma-config-2026.html',
    title: '设计师被 AI 替代之前，Figma 用一整套新功能抬高设计师上限',
    date: '2026-06-26',
    readTime: '7 分钟',
    tags: ['AI 设计工作流', '协作画布'],
    cat: 'product',
    accent: '#D4A017',
    collection: 'Figma 观察',
    excerpt:
      'AI 拉低了设计的下限，却没抬高上限。Config 2026 的生成式插件、Agent、代码图层、Motion，都在放大设计表达。以不受限制的方式设计，是一种持续的创作力。',
    listCover: 'assets/figma-config-2026/cover.png',
    cardCover: 'assets/cards/figma-config-2026.webp',
    inBlogGrid: true,
    blogTag: 'AI 设计工作流',
    blogDelay: 150,
    blogCover: { type: 'iframe', src: 'writing/assets/figma-config-2026/cover.html' },
  },
  {
    slug: 'app-shape-for-ai',
    file: 'article-app-shape-for-ai.html',
    title: 'SiriAI 设计',
    date: '2026-06-25',
    readTime: '9 分钟',
    tags: ['即将发布'],
    cat: 'product',
    accent: '#5B7FFF',
    collection: '',
    excerpt:
      'WWDC26 上 Apple 把 App 接入 Siri 的逻辑整个反转——不再让开发者写话术，而是让 App 把自己暴露成 AI 读得懂的结构。设计师要交付的，多了一份给机器看的设计稿。',
    listCover: 'assets/app-shape-for-ai/cover_v9.png',
    cardCover: 'assets/cards/app-shape-for-ai.webp',
    inBlogGrid: true, // 今天的 blog.html 里有这张卡(articles.json 里是 status:draft,但卡片在)
    blogTag: '即将发布',
    blogDelay: 100,
    blogCover: { type: 'iframe', src: 'writing/assets/app-shape-for-ai/cover_v9.html' },
    // articles.json 里是 status:"draft",但今天的 loadReaderManifest 只过滤 draft:true,
    // 所以这篇在阅读器列表里(9 条之一)、blog 卡片也在 —— 不标 draft,保持一致
  },
  {
    slug: 'sparkle',
    file: 'article-sparkle.html',
    title: 'AI 符号被秒懂，是调用了成熟的用户心智模型',
    date: '2026-05-24',
    readTime: '9 分钟',
    tags: ['认知设计', '图形设计'],
    cat: 'ui',
    accent: '#6F8FC4',
    collection: '',
    excerpt:
      '那颗四角星 ✦ 不是被发明的，是被借来的——AI 入口设计的真相，是调用用户脑子里早就成熟的心智模型；而越成熟的 AI，越不需要被标出来。',
    listCover: 'assets/sparkle/cover.png',
    cardCover: 'assets/cards/sparkle.webp',
    inBlogGrid: true,
    blogTag: '认知设计',
    blogDelay: 50,
    blogCover: { type: 'iframe', src: 'writing/assets/sparkle/cover.html' },
  },
  /* 两篇「幽灵页」:文件存在、直链可达,但不在 articles.json / blog / 阅读器任何列表里 */
  {
    slug: 'figma-agent',
    file: 'article-figma-agent.html',
    title: 'Figma Agent',
    date: '2026-06-20',
    readTime: '',
    tags: [],
    cat: 'product',
    accent: '#2F3336',
    collection: 'Figma 观察',
    excerpt: '',
    listCover: '',
    inBlogGrid: false,
    unlisted: true,
  },
  {
    slug: 'genie',
    file: 'article-genie.html',
    title: 'Genie',
    date: '2026-03-01',
    readTime: '',
    tags: [],
    cat: 'ui',
    accent: '#5B7FFF',
    collection: 'AI 设计语言',
    excerpt: '',
    listCover: '',
    inBlogGrid: false,
    unlisted: true,
  },
];

export const bySlug = (slug: string) => ARTICLES.find((a) => a.slug === slug);
export const byFile = (file: string) => ARTICLES.find((a) => a.file === file);

/** blog 网格卡片:今天的 blog.html 就是日期倒序(同日期保持源顺序,与 initWritingFilter 的稳定排序一致) */
export const blogCards = () =>
  ARTICLES.filter((a) => a.inBlogGrid).sort((a, b) => b.date.localeCompare(a.date));

/** 阅读器左栏列表(= 今天 articles.json fetch + draft 过滤后的结果,日期倒序) */
export const readerList = () =>
  ARTICLES.filter((a) => !a.draft && !a.unlisted).sort((a, b) => b.date.localeCompare(a.date));
