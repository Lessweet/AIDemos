// 全局变量
let config = null;
let noteCache = {}; // 缓存笔记理解结果
let commentCache = {}; // 缓存生成的评论
let currentNoteId = null;
let generatedRepliesPanel = null;

// 初始化
async function init() {
  console.log('=== 小红书Agent 初始化开始 ===');
  console.log('当前页面URL:', window.location.href);

  // 加载配置
  console.log('正在加载配置...');
  config = await loadConfig();
  console.log('配置加载完成:', {
    hasUnderstandingKey: !!config.understanding.apiKey,
    hasGenerationKey: !!config.generation.apiKey,
    commentCount: config.commentCount,
    hasPersona: !!config.persona
  });

  if (!config.generation.apiKey) {
    console.warn('⚠️ 小红书Agent: 请先配置API Key');
    return;
  }

  // 获取当前笔记ID
  currentNoteId = getNoteIdFromUrl();
  console.log('当前笔记ID:', currentNoteId);

  if (!currentNoteId) {
    console.warn('⚠️ 小红书Agent: 无法获取笔记ID');
    return;
  }

  // 监听DOM变化，添加AI图标
  console.log('开始监听DOM变化...');
  observeComments();

  // 初始添加图标
  console.log('正在添加AI图标到评论区...');
  addAIIconsToComments();
  console.log('=== 小红书Agent 初始化完成 ===');
}

// 加载配置
function loadConfig() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['xhsAgentConfig'], (result) => {
      resolve(result.xhsAgentConfig || {
        understanding: { baseUrl: '', apiKey: '', model: '' },
        generation: { baseUrl: '', apiKey: '', model: '' },
        commentCount: 3,
        persona: ''
      });
    });
  });
}

// 从URL获取笔记ID
function getNoteIdFromUrl() {
  const match = window.location.pathname.match(/\/explore\/([a-f0-9]+)/);
  return match ? match[1] : null;
}

// 监听评论区DOM变化
function observeComments() {
  const observer = new MutationObserver((mutations) => {
    addAIIconsToComments();
  });

  // 观察整个文档
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// 为所有评论添加AI图标
function addAIIconsToComments() {
  // 查找所有评论项
  const comments = document.querySelectorAll('.comment-item');
  console.log(`找到 ${comments.length} 条评论`);

  let addedCount = 0;
  comments.forEach(comment => {
    // 检查是否已经添加过图标
    if (comment.querySelector('.xhs-agent-ai-icon')) {
      return;
    }

    // 查找评论的交互区域
    const interactions = comment.querySelector('.interactions');
    if (!interactions) {
      return;
    }

    // 创建AI图标容器
    const aiIconContainer = createAIIcon();
    const commentId = comment.id || `comment-${Date.now()}-${Math.random()}`;
    comment.id = commentId;

    // 添加点击事件
    aiIconContainer.addEventListener('click', () => {
      handleAIIconClick(commentId);
    });

    // 插入图标
    interactions.appendChild(aiIconContainer);
    addedCount++;
  });

  if (addedCount > 0) {
    console.log(`✅ 成功添加 ${addedCount} 个AI图标`);
  }
}

// 创建AI图标
function createAIIcon() {
  const container = document.createElement('div');
  container.className = 'xhs-agent-ai-icon icon-container';
  container.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 2C6.9 2 6 2.9 6 4V5H4C2.9 5 2 5.9 2 7V12C2 13.1 2.9 14 4 14H12C13.1 14 14 13.1 14 12V7C14 5.9 13.1 5 12 5H10V4C10 2.9 9.1 2 8 2ZM8 3C8.6 3 9 3.4 9 4V5H7V4C7 3.4 7.4 3 8 3ZM4 6H12C12.6 6 13 6.4 13 7V12C13 12.6 12.6 13 12 13H4C3.4 13 3 12.6 3 12V7C3 6.4 3.4 6 4 6ZM6 8V11H7V8H6ZM9 8V11H10V8H9Z" fill="currentColor"/>
    </svg>
    <span class="count">AI</span>
  `;
  return container;
}

// 处理AI图标点击
async function handleAIIconClick(commentId) {
  console.log('=== 开始处理AI图标点击 ===');
  console.log('评论ID:', commentId);

  // 检查是否有缓存的评论
  if (commentCache[commentId]) {
    console.log('✅ 使用缓存的评论回复');
    showGeneratedReplies(commentCache[commentId], commentId);
    return;
  }

  // 显示loading
  console.log('显示Loading面板...');
  showLoadingPanel();

  try {
    // 1. 获取或理解笔记内容
    console.log('步骤1: 获取笔记内容...');
    const noteContent = await getNoteContent();
    console.log('笔记内容获取成功，长度:', noteContent.length);

    // 2. 获取评论内容和父评论
    console.log('步骤2: 获取评论数据...');
    const commentData = getCommentData(commentId);
    console.log('评论数据:', commentData);

    // 3. 生成评论
    console.log('步骤3: 开始生成评论回复...');
    const replies = await generateReplies(noteContent, commentData);
    console.log(`✅ 生成成功，共 ${replies.length} 条回复`);

    // 4. 缓存结果
    commentCache[commentId] = replies;
    console.log('回复已缓存');

    // 5. 显示生成的评论
    console.log('显示生成的评论...');
    showGeneratedReplies(replies, commentId);
    console.log('=== AI图标点击处理完成 ===');

  } catch (error) {
    console.error('❌ 生成评论失败:', error);
    console.error('错误详情:', {
      message: error.message,
      stack: error.stack
    });
    showErrorPanel(error.message);
  }
}

// 获取笔记内容（带缓存）
async function getNoteContent() {
  // 检查缓存
  if (noteCache[currentNoteId]) {
    console.log('✅ 使用缓存的笔记内容');
    return noteCache[currentNoteId];
  }

  console.log('开始理解笔记内容...');

  // 获取笔记的文本内容
  const titleEl = document.querySelector('#detail-title');
  const descEl = document.querySelector('#detail-desc .note-text');

  const title = titleEl ? titleEl.textContent.trim() : '';
  const description = descEl ? descEl.textContent.trim() : '';
  console.log('笔记标题:', title);
  console.log('笔记正文长度:', description.length);

  // 获取图片URL
  const images = [];
  const imageElements = document.querySelectorAll('.note-slider-img');
  imageElements.forEach(img => {
    if (img.src && !img.src.includes('nc_n_webp_mw')) {
      images.push(img.src);
    }
  });
  console.log(`找到 ${images.length} 张图片`);

  // 如果配置了理解模型，使用视觉模型理解
  if (config.understanding.apiKey && images.length > 0) {
    console.log('使用视觉模型理解笔记（包含图片）...');
    const understood = await understandNoteWithVision(title, description, images);
    console.log('✅ 视觉理解完成');
    noteCache[currentNoteId] = understood;

    // 保存到本地存储
    saveNoteCache(currentNoteId, understood);

    return understood;
  }

  // 否则直接返回文本内容
  console.log('仅使用文字内容（未配置视觉模型或无图片）');
  const content = `标题: ${title}\n内容: ${description}`;
  noteCache[currentNoteId] = content;

  // 保存到本地存储
  saveNoteCache(currentNoteId, content);

  return content;
}

// 使用视觉模型理解笔记
async function understandNoteWithVision(title, description, images) {
  const messages = [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: `请详细理解这篇小红书笔记的内容，包括图片和文字。\n\n标题: ${title}\n\n正文: ${description}\n\n请用简洁的文字概括笔记的主要内容、主题和关键信息。`
        },
        ...images.slice(0, 5).map(url => ({
          type: 'image_url',
          image_url: { url }
        }))
      ]
    }
  ];

  const response = await fetch(`${config.understanding.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.understanding.apiKey}`
    },
    body: JSON.stringify({
      model: config.understanding.model,
      messages: messages,
      max_tokens: 1000
    })
  });

  if (!response.ok) {
    throw new Error('理解笔记内容失败: ' + response.statusText);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// 获取评论数据
function getCommentData(commentId) {
  const commentEl = document.getElementById(commentId);
  if (!commentEl) {
    throw new Error('找不到评论元素');
  }

  // 获取当前评论内容
  const contentEl = commentEl.querySelector('.content .note-text');
  const content = contentEl ? contentEl.textContent.trim() : '';

  // 获取评论作者
  const authorEl = commentEl.querySelector('.author .name');
  const author = authorEl ? authorEl.textContent.trim() : '';

  // 查找父评论（如果是回复）
  const parentComments = [];
  let currentEl = commentEl;

  // 检查是否是子评论
  if (commentEl.classList.contains('comment-item-sub')) {
    // 向上查找父评论
    const parentContainer = commentEl.closest('.parent-comment');
    if (parentContainer) {
      const parentCommentEl = parentContainer.querySelector('.comment-item:not(.comment-item-sub)');
      if (parentCommentEl) {
        const parentContent = parentCommentEl.querySelector('.content .note-text');
        const parentAuthor = parentCommentEl.querySelector('.author .name');
        if (parentContent) {
          parentComments.push({
            author: parentAuthor ? parentAuthor.textContent.trim() : '',
            content: parentContent.textContent.trim()
          });
        }
      }
    }
  }

  return {
    author,
    content,
    parentComments
  };
}

// 生成评论回复
async function generateReplies(noteContent, commentData) {
  // 构建prompt
  const prompt = buildPrompt(noteContent, commentData);
  console.log('构建的Prompt:', prompt.substring(0, 200) + '...');

  const messages = [
    {
      role: 'system',
      content: '你是一个小红书评论助手，帮助用户生成合适的评论回复。请以JSON格式返回结果。'
    },
    {
      role: 'user',
      content: prompt
    }
  ];

  console.log('调用API:', config.generation.baseUrl);
  console.log('使用模型:', config.generation.model);

  const response = await fetch(`${config.generation.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.generation.apiKey}`
    },
    body: JSON.stringify({
      model: config.generation.model,
      messages: messages,
      temperature: 0.8,
      response_format: { type: 'json_object' }
    })
  });

  console.log('API响应状态:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('API错误响应:', errorText);
    throw new Error('生成评论失败: ' + response.statusText);
  }

  const data = await response.json();
  console.log('API返回数据:', data);

  const result = JSON.parse(data.choices[0].message.content);
  console.log('解析后的回复:', result);

  return result.replies || [];
}

// 构建prompt
function buildPrompt(noteContent, commentData) {
  let prompt = `基于以下信息，生成${config.commentCount}条适合回复的评论。\n\n`;

  prompt += `【笔记内容】\n${noteContent}\n\n`;

  if (commentData.parentComments.length > 0) {
    prompt += `【父评论】\n`;
    commentData.parentComments.forEach((parent, idx) => {
      prompt += `${parent.author}: ${parent.content}\n`;
    });
    prompt += `\n`;
  }

  prompt += `【当前评论】\n${commentData.author}: ${commentData.content}\n\n`;

  if (config.persona) {
    prompt += `【我的人设】\n${config.persona}\n\n`;
  }

  prompt += `请生成${config.commentCount}条适合回复的评论，要求：\n`;
  prompt += `1. 评论要自然、真诚，符合小红书的交流风格\n`;
  prompt += `2. 结合笔记内容和当前评论的上下文\n`;
  prompt += `3. 如果有人设，要符合人设的特点\n`;
  prompt += `4. 长度适中，不要太长\n`;
  prompt += `5. 避免机器人式的生硬回复\n\n`;
  prompt += `请以JSON格式返回，格式为: {"replies": ["回复1", "回复2", ...]}\n`;

  return prompt;
}

// 显示loading面板
function showLoadingPanel() {
  if (generatedRepliesPanel) {
    generatedRepliesPanel.remove();
  }

  generatedRepliesPanel = createRepliesPanel();
  generatedRepliesPanel.innerHTML = `
    <div class="panel-header">
      <span class="panel-title">AI 生成中</span>
      <button class="panel-close">✕</button>
    </div>
    <div class="panel-content">
      <div class="loading">
        <div class="loading-dots">
          <span>.</span><span>.</span><span>.</span>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(generatedRepliesPanel);

  // 绑定关闭按钮
  generatedRepliesPanel.querySelector('.panel-close').addEventListener('click', () => {
    generatedRepliesPanel.remove();
    generatedRepliesPanel = null;
  });
}

// 显示错误面板
function showErrorPanel(message) {
  if (generatedRepliesPanel) {
    generatedRepliesPanel.remove();
  }

  generatedRepliesPanel = createRepliesPanel();
  generatedRepliesPanel.innerHTML = `
    <div class="panel-header">
      <span class="panel-title">生成失败</span>
      <button class="panel-close">✕</button>
    </div>
    <div class="panel-content">
      <div class="error-message">${message}</div>
    </div>
  `;

  document.body.appendChild(generatedRepliesPanel);

  // 绑定关闭按钮
  generatedRepliesPanel.querySelector('.panel-close').addEventListener('click', () => {
    generatedRepliesPanel.remove();
    generatedRepliesPanel = null;
  });
}

// 显示生成的评论
function showGeneratedReplies(replies, commentId) {
  if (generatedRepliesPanel) {
    generatedRepliesPanel.remove();
  }

  generatedRepliesPanel = createRepliesPanel();

  let repliesHtml = '';
  replies.forEach((reply, idx) => {
    repliesHtml += `
      <div class="reply-item">
        <div class="reply-number">${idx + 1}</div>
        <div class="reply-content">${reply}</div>
        <button class="copy-btn" data-reply="${reply}">复制</button>
      </div>
    `;
  });

  generatedRepliesPanel.innerHTML = `
    <div class="panel-header">
      <span class="panel-title">AI 生成的回复</span>
      <div class="panel-actions">
        <button class="panel-regenerate">重新生成</button>
        <button class="panel-close">✕</button>
      </div>
    </div>
    <div class="panel-content">
      ${repliesHtml}
    </div>
  `;

  document.body.appendChild(generatedRepliesPanel);

  // 绑定关闭按钮
  generatedRepliesPanel.querySelector('.panel-close').addEventListener('click', () => {
    generatedRepliesPanel.remove();
    generatedRepliesPanel = null;
  });

  // 绑定重新生成按钮
  generatedRepliesPanel.querySelector('.panel-regenerate').addEventListener('click', async () => {
    delete commentCache[commentId];
    handleAIIconClick(commentId);
  });

  // 绑定复制按钮
  generatedRepliesPanel.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const reply = btn.getAttribute('data-reply');
      navigator.clipboard.writeText(reply).then(() => {
        btn.textContent = '已复制';
        setTimeout(() => {
          btn.textContent = '复制';
        }, 2000);
      });
    });
  });
}

// 创建回复面板
function createRepliesPanel() {
  const panel = document.createElement('div');
  panel.className = 'xhs-agent-replies-panel';
  return panel;
}

// 保存笔记缓存到本地
function saveNoteCache(noteId, content) {
  chrome.storage.local.get(['noteCache'], (result) => {
    const cache = result.noteCache || {};
    cache[noteId] = {
      content,
      timestamp: Date.now()
    };
    chrome.storage.local.set({ noteCache: cache });
  });
}

// 启动
init();
