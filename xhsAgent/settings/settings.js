// 默认配置
const DEFAULT_CONFIG = {
  understanding: {
    baseUrl: 'https://openrouter.ai/api/v1',
    apiKey: '',
    model: 'qwen/qwen-vl-max'
  },
  generation: {
    baseUrl: 'https://api.deepseek.com',
    apiKey: '',
    model: 'deepseek-chat'
  },
  commentCount: 3,
  persona: ''
};

// 页面加载时读取配置
document.addEventListener('DOMContentLoaded', async () => {
  console.log('=== 设置页面加载 ===');

  console.log('正在加载配置...');
  const config = await loadConfig();
  console.log('配置加载完成:', config);

  populateForm(config);
  console.log('表单已填充');

  // 绑定事件
  document.getElementById('save-btn').addEventListener('click', saveConfig);
  document.getElementById('test-btn').addEventListener('click', testConnection);

  console.log('事件绑定完成');
});

// 加载配置
async function loadConfig() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['xhsAgentConfig'], (result) => {
      resolve(result.xhsAgentConfig || DEFAULT_CONFIG);
    });
  });
}

// 填充表单
function populateForm(config) {
  document.getElementById('understanding-base-url').value = config.understanding.baseUrl;
  document.getElementById('understanding-api-key').value = config.understanding.apiKey;
  document.getElementById('understanding-model').value = config.understanding.model;

  document.getElementById('generation-base-url').value = config.generation.baseUrl;
  document.getElementById('generation-api-key').value = config.generation.apiKey;
  document.getElementById('generation-model').value = config.generation.model;

  document.getElementById('comment-count').value = config.commentCount;
  document.getElementById('persona').value = config.persona;
}

// 保存配置
async function saveConfig() {
  console.log('=== 开始保存配置 ===');

  const config = {
    understanding: {
      baseUrl: document.getElementById('understanding-base-url').value.trim(),
      apiKey: document.getElementById('understanding-api-key').value.trim(),
      model: document.getElementById('understanding-model').value.trim()
    },
    generation: {
      baseUrl: document.getElementById('generation-base-url').value.trim(),
      apiKey: document.getElementById('generation-api-key').value.trim(),
      model: document.getElementById('generation-model').value.trim()
    },
    commentCount: parseInt(document.getElementById('comment-count').value),
    persona: document.getElementById('persona').value.trim()
  };

  console.log('读取的配置:', {
    ...config,
    understanding: { ...config.understanding, apiKey: config.understanding.apiKey ? '***' : '' },
    generation: { ...config.generation, apiKey: config.generation.apiKey ? '***' : '' }
  });

  // 验证
  if (!config.generation.baseUrl || !config.generation.apiKey || !config.generation.model) {
    console.warn('验证失败: 评论生成模型配置不完整');
    showMessage('请至少填写评论生成模型的配置', 'error');
    return;
  }

  if (config.commentCount < 3 || config.commentCount > 10) {
    console.warn('验证失败: 评论数量超出范围');
    showMessage('评论数量必须在3-10之间', 'error');
    return;
  }

  try {
    console.log('正在保存到chrome.storage...');
    await new Promise((resolve, reject) => {
      chrome.storage.sync.set({ xhsAgentConfig: config }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });

    console.log('✅ 配置保存成功');
    showMessage('保存成功！', 'success');
  } catch (error) {
    console.error('❌ 保存配置失败:', error);
    showMessage('保存失败: ' + error.message, 'error');
  }
}

// 测试连接
async function testConnection() {
  console.log('=== 开始测试连接 ===');

  const baseUrl = document.getElementById('generation-base-url').value.trim();
  const apiKey = document.getElementById('generation-api-key').value.trim();
  const model = document.getElementById('generation-model').value.trim();

  console.log('测试配置:', {
    baseUrl,
    apiKey: apiKey ? '***' : '',
    model
  });

  if (!baseUrl || !apiKey || !model) {
    console.warn('测试失败: 配置不完整');
    showMessage('请先填写评论生成模型配置', 'error');
    return;
  }

  showMessage('正在测试连接...', 'info');

  try {
    console.log('发送测试请求到:', `${baseUrl}/chat/completions`);

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'user', content: '你好' }
        ],
        max_tokens: 10
      })
    });

    console.log('响应状态:', response.status);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ 测试成功，返回数据:', data);
      showMessage('连接测试成功！', 'success');
    } else {
      const error = await response.json();
      console.error('❌ 测试失败，错误信息:', error);
      showMessage(`连接测试失败: ${error.error?.message || response.statusText}`, 'error');
    }
  } catch (error) {
    console.error('❌ 测试异常:', error);
    showMessage('连接测试失败: ' + error.message, 'error');
  }
}

// 显示消息
function showMessage(text, type) {
  console.log(`显示消息 [${type}]:`, text);

  const messageEl = document.getElementById('message');
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;
  messageEl.style.display = 'block';

  if (type === 'success') {
    setTimeout(() => {
      messageEl.style.display = 'none';
      console.log('成功消息已自动隐藏');
    }, 3000);
  }
}
