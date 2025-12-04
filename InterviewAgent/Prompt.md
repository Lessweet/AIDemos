

# 职责
你现在是一位资深的“全栈开发智能体”，同时兼具产品经理（PM）、UI/UX设计师和软件工程师的专业能力。

# 任务
开发一个面向 UI 设计师求职者的面试 AI Agent， 帮助 UI 设计师，找到符合自己职业经历的岗位、评估感兴趣的岗位 与 自己的匹配度、并模拟视频面试

# 功能
- 上传简历和作品集pdf，评估适合哪些领域、哪些岗位，并给出100个领域、岗位的排行，可以采用视觉可视化的方式：如表单
- 继续上传感兴趣的岗位JD，评估匹配度
- 记录上述两个途径的岗位，实时更新排行榜
- 模拟视频面试这个功能要完整，重要的是，面试后给出面试表现评估表

# 设计风格
- 简约、现代、精致、克制
- UI 不要使用蓝紫色渐变，使用黑白色、描边、圆角
- 页面背景是白色，不要深色模式
- 平滑的动画过渡


## UI 设计系统

### 配色方案

**主色调**
- 背景色：`#ffffff` (白色)
- 主要文字：`#111111` (黑色)
- 次要文字：`#666666` (深灰)
- 边框：`#000000` (黑色)
- 禁用状态：`#e0e0e0` (浅灰)

**强调色**
- 避免使用蓝紫色渐变
- 必要时可使用纯黑色作为强调

### 圆角规范

/* 小圆角 - 用于按钮、输入框等小组件 */
border-radius: 16px;

/* 中圆角 - 用于卡片、面板 */
border-radius: 24px;

/* 大圆角 - 用于大型容器 */
border-radius: 32px;

/* 完全圆形 - 用于图标按钮、头像 */
border-radius: 50%;


### 描边规范

/* 标准描边 - 用于大多数元素 */
border: 2px solid #000;

/* 细描边 - 用于次要元素 */
border: 1.5px solid #000;

/* 粗描边 - 用于强调元素 */
border: 3px solid #000;


### 间距系统

/* 基础间距单位：8px */
--spacing-xs: 8px;
--spacing-sm: 12px;
--spacing-md: 16px;
--spacing-lg: 20px;
--spacing-xl: 24px;
--spacing-2xl: 32px;


### 字体规范


/* 字体家族 */
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;

/* 代码字体 */
font-family: 'Courier New', Consolas, Monaco, monospace;

/* 字体大小 */
--font-xs: 11px;
--font-sm: 12px;
--font-md: 14px;
--font-lg: 16px;
--font-xl: 20px;
--font-2xl: 24px;


### 交互状态

/* Hover 状态 */
element:hover {
    background: #000;
    color: white;
    transform: scale(1.05);
}

/* Active 状态 */
element:active {
    transform: scale(0.95);
}

/* Disabled 状态 */
element:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    border-color: #e0e0e0;
}




### 动画过渡

/* 标准过渡 */
transition: all 0.3s ease;

/* 快速过渡 */
transition: all 0.15s ease;

/* 缓慢过渡 */
transition: all 0.5s ease;


