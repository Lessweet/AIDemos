// 小红书Agent - Background Service Worker

// 安装时初始化
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('小红书Agent: 插件已安装');
  } else if (details.reason === 'update') {
    console.log('小红书Agent: 插件已更新');
  }
});

// 监听来自content script的消息（预留）
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // 可以在这里处理来自content script的消息
  // 例如：API调用、存储管理等

  return true; // 保持消息通道开放
});
