# 发布流程：草稿 → 上线

线上站点：<https://vibeux.space>（GitHub Pages + 自定义域名）。

**发布分支 = `main`**（Pages 取 `main` 分支的 `docs/` 目录）。
> 第一次请到 GitHub 仓库 **Settings → Pages** 确认一次 Source 分支确实是 `main`。如果不是，把下文的 `main` 换成实际那个分支即可。

## 一条核心规则

> **只有「合并进 `main` 并推送」的内容，才会出现在 vibeux.space。
> 其它任何分支上的东西，公网都看不到。**

这就是你要的「权限开关」：草稿待在别的分支 = 别人看不到、你能随便改；合并进 `main` = 开权限、公开。

---

## 0. React 迁移后的变化（2026-07）

主站页面已是 React(源码在 `site/`,构建产物提交在 `docs/`)。发布一篇新文章 = 三步:

1. **正文片段**:`site/src/content/fragments/<slug>.reading.html` — 整段 `.article-reading` 的 innerHTML(eyebrow / h1 / byline / 封面 / 正文含内联 `<style>` / 页脚合集)。也可以先按旧格式把整页 HTML 放进 `docs/writing/article-<slug>.html`,把 slug 加进 `site/scripts/extract-articles.mjs` 与 `vite.config.ts` 的清单后跑 `node site/scripts/extract-articles.mjs` 自动提取。
2. **注册表**:`site/src/content/articles.ts` 加一条(标题/日期/分类/accent/tint/封面/blog 卡片字段)。blog 网格、阅读器左栏、合集页脚都由它推导。
3. **封面海报**(配了 `blogCover` 的文章):新增动态封面(cover.html)时,`<head>` 顶部要引 `<script src="../cover-shim.js"></script>`(统一交接协议:冻结首帧 / cover-ready / 播放暂停,见 `docs/writing/assets/cover-shim.js` 头注释),然后本地跑 `node site/scripts/build-cover-posters.mjs` 生成首帧海报并一起提交。**这步只能本地跑**(要带界面的 Chrome + 真 GPU 渲染 shader,CI 的软渲染截出来的噪点对不上),CI 不会兜底,忘跑 = 新卡片 hover 前是裂图。封面里定时器驱动的序列(轮播等)要挂在 `COVER.started` 后面(参考 remove-ai-taste cover4 / poster-stack)。
4. **构建**:`npm run build`,把 `site/` 与 `docs/` 的变更一起提交。**忘记 build 就 push = 线上是旧页面。**

本地预览用 `npm run dev`(不能再 file:// 直开主站页面);`docs/writing/articles.json` 已不再被页面读取,仅作遗留兼容保留。

## 1. 写草稿（别人看不到，自己随便改）

```bash
# 从最新的上线版本开一个草稿分支
git checkout main && git pull
git checkout -b draft/文章名

# 按上面第 0 节的三步添加文章,npm run dev 预览
```

想存档或换设备继续写，可以把草稿分支推上去（**仍然不会上线**）：

```bash
git push -u origin draft/文章名
```

此刻：文章只在草稿分支 → vibeux.space 上没有 → 别人看不到；你可以接着改。

## 2. 发布（开权限，让别人能看到）

定稿后：

```bash
git checkout main && git pull
git merge draft/文章名
git push
```

GitHub Pages 会自动重建，几十秒后文章就出现在 vibeux.space。

## 3. 发布后还想改

继续在草稿分支改 → 再 `git merge draft/文章名` 到 `main` → `git push`，线上版本随之更新。

---

## 两条习惯（避免「不小心提前公开」）

1. **草稿文章的链接不要加进 `main` 上的列表页**。列表里只放已发布的文章；草稿的入口链接只留在草稿分支。这样即使草稿文件哪天上了线，列表里也没人点得到。
2. **每篇文章独立成文件 + 独立提交**，方便「只发布这一篇」，不被其它没写完的草稿连累。

> 注意：GitHub Pages 是公开托管，做不到「登录后才能看」。本方案靠的是「草稿根本不在线上分支」来保证私密——只要不合并进 `main`，就是安全的。

---

## 当前待办（重要）

整套改版目前在 **`design-refresh`** 分支，**尚未合并进 `main`**，所以线上还是旧版。
等你确认改版可以正式上线时，执行：

```bash
git checkout main && git pull
git merge design-refresh
git push
```
