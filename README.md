# personal_blog

一个轻量的个人博客项目，前台基于 Vue 3 + Vite 渲染文章与分类/标签页，配套本地后台用于内容管理，数据以 JSON 形式维护并可一键生成静态站点数据。

## 项目背景
我希望有一个「可以本地维护内容、线上静态部署」的个人博客。写作在本地完成，通过后台或脚本更新数据，再生成静态 JSON 供前端读取，减少部署复杂度。

## 项目在线预览地址
待补充。

## 项目截图（留空）
- 首页：
- 文章详情：
- 分类 / 标签：
- 本地后台：

## 技术栈
- 前端：Vue 3、Vite
- Markdown 渲染：marked
- 代码高亮：highlight.js
- 本地后台：纯静态页面 + fetch 调用本地 Node 服务
- 数据生成：Node 脚本（JSON 规范化、阅读时长统计、发布）

## 项目结构
```
personal_blog/
├── admin/                 # 本地后台页面
├── data/seed/             # 原始数据（posts/categories/tags/nav/settings）
├── public/data/           # 生成后的静态数据（前台读取）
├── scripts/               # 数据生成与后台服务脚本
├── src/                   # 前台页面（Vue 3）
├── index.html             # 入口 HTML
└── vite.config.js         # Vite 配置
```

## 目前已有功能
- 文章列表/详情页（Markdown 渲染、代码高亮、目录浮层）
- 分类页、标签页、关于页
- 置顶文章、阅读时长统计
- 数据来源切换：开发时走本地 API，生产读取 `public/data`
- 本地后台管理：文章 / 分类 / 标签 / 导航 / 设置
- 后台支持：搜索、分页、草稿/发布、置顶上限控制、Markdown 编辑器
- 一键生成静态 JSON；可选自动 git commit + push

## 计划中的功能
- TODO：站点搜索
- TODO：RSS/站点地图优化

## 如何克隆并使用
### 1) 克隆与安装
```bash
git clone https://github.com/Y-Unfettered/DevToolBox.git
cd personal_blog
npm install
```

### 2) 启动前台开发服务器
```bash
npm run dev
```
默认打开 `http://localhost:5173`。

### 3) 启动本地后台（可选）
```bash
npm run admin:web
```
后台地址：`http://127.0.0.1:3030/admin`  
可通过环境变量调整：`ADMIN_HOST`、`ADMIN_PORT`。

### 4) 生成静态数据（可选）
```bash
node scripts/generate-data.cjs
```
生成后的 JSON 位于 `public/data/`，前台构建时将直接读取。
