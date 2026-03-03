# personal_blog

基于 Vue 3 + Vite 的个人博客，配套 Node 管理后台。  
当前架构已调整为:

- GitHub 只存代码
- 业务数据只存服务器本地（Docker 挂载目录）
- 前端统一通过 `/api/*` 读取数据

## 目录结构

```text
personal_blog/
├── admin/                  # 后台页面
├── data/seed/              # 数据模板（*.example.json）
├── deploy/                 # Dockerfile + Nginx 配置
├── public/data/            # 静态导出目录（默认不作为线上数据源）
├── scripts/                # 后端服务与工具脚本
├── src/                    # 前端代码
├── docker-compose.yml
└── .env.example
```

## 本地开发

```bash
npm install
npm run init:data
npm run admin:web
npm run dev
```

- 前端: `http://127.0.0.1:5173`
- 后台: `http://127.0.0.1:3030/admin`

## 数据初始化

首次启动前，请在 `data/seed` 中创建运行文件:

```bash
npm run init:data
```

该命令会把 `*.example.json` 复制为对应的 `*.json`（仅在目标文件不存在时创建）。

如果是 Docker 外部挂载目录（例如 `/srv/blog-data/seed`），可这样初始化:

```bash
BLOG_DATA_DIR=/srv/blog-data/seed npm run init:data
```

## 旧数据迁移（避免重写）

如果你以前的数据还在仓库的 `data/seed/*.json`，可以一键迁移到新目录:

```bash
BLOG_DATA_DIR=/srv/blog-data npm run migrate:data
```

- 默认不会覆盖目标已存在文件。
- 如需覆盖可加 `-- --force`:

```bash
BLOG_DATA_DIR=/srv/blog-data npm run migrate:data -- --force
```

## Docker 部署（代码与数据分离）

1. 复制环境变量模板:

```bash
cp .env.example .env
```

2. 确保宿主机数据目录存在（默认 `/srv/blog-data/seed`）:

```bash
sudo mkdir -p /srv/blog-data/seed
sudo chown -R $USER:$USER /srv/blog-data
```

3. 启动:

```bash
docker compose up -d --build
```

`docker-compose.yml` 已配置:

- API 容器从 `${BLOG_DATA_DIR:-/srv/blog-data}/seed` 挂载数据
- `blog-api` / `blog-web` 健康检查
- `cloudflared` 依赖 `blog-web` healthy 后启动

## 备份建议

```bash
tar -czf backup-data-$(date +%F).tar.gz /srv/blog-data/seed
```

## 开发指南

### 项目架构

本项目采用前后端分离架构：

- **前端**: Vue 3 + Vite + Tailwind CSS
- **后端**: Node.js + 原生HTTP模块
- **数据存储**: JSON文件（服务器本地存储）

### 核心功能模块

#### 1. 前端模块 (`src/`)

| 模块 | 文件 | 功能描述 |
|------|------|----------|
| 主应用 | `App.vue` | 页面路由、状态管理、数据获取 |
| 导航栏 | `components/NavBar.vue` | 顶部导航、搜索框 |
| 文章网格 | `components/PostGrid.vue` | 首页文章列表展示 |
| 轮播图 | `components/HeroCarousel.vue` | 首页轮播展示 |
| 侧边栏 | `components/CategorySidebar.vue` | 分类筛选 |
| 侧边栏 | `components/TagSidebar.vue` | 标签筛选 |
| 个人卡片 | `components/ProfileCard.vue` | 个人信息展示 |

#### 2. 后端模块 (`scripts/`)

| 模块 | 文件 | 功能描述 |
|------|------|----------|
| API服务 | `admin-server.cjs` | RESTful API、JWT认证、数据管理 |
| 数据初始化 | `init-data.cjs` | 初始化数据文件 |
| 数据迁移 | `migrate-data.cjs` | 迁移旧数据到新目录 |
| 数据生成 | `generate-data.cjs` | 生成示例数据 |
| 数据恢复 | `restore-local-dev-data.cjs` | 恢复开发数据 |

#### 3. 管理后台 (`admin/`)

| 功能 | 描述 |
|------|------|
| 文章管理 | 创建、编辑、删除文章，支持Markdown编辑器 |
| 分类管理 | 创建、编辑、删除分类 |
| 标签管理 | 创建、编辑、删除标签 |
| 导航管理 | 管理顶部导航栏 |
| 问题记录 | 记录和追踪问题 |
| 工具分享 | 管理工具资源 |

### 代码规范

#### JSDoc注释规范

所有核心函数都应添加JSDoc注释：

```javascript
/**
 * 函数描述
 * @param {类型} 参数名 - 参数描述
 * @returns {类型} 返回值描述
 */
function exampleFunction(param) {
  // 实现代码
}
```

#### 命名规范

- **变量**: 小驼峰命名法 (`searchQuery`, `categoryList`)
- **常量**: 全大写下划线 (`API_BASE`, `DEFAULT_NAV`)
- **组件**: PascalCase (`NavBar`, `PostGrid`)
- **文件**: 小写中划线 (`category-sidebar.vue`)

### 安全注意事项

1. **XSS防护**: 所有用户输入在渲染前必须经过转义
2. **JWT认证**: 管理后台API需要有效的JWT Token
3. **环境变量**: 敏感信息（如JWT_SECRET）应通过环境变量配置

### 开发流程

1. **启动开发环境**:
   ```bash
   npm run dev          # 启动前端
   npm run admin        # 启动后端API
   ```

2. **代码修改**: 修改后保存，Vite会自动热更新

3. **测试**: 在浏览器中测试功能

4. **构建**:
   ```bash
   npm run build        # 构建前端
   ```

### 调试技巧

- 前端调试: 浏览器开发者工具 (F12)
- 后端调试: 查看控制台输出
- API测试: 使用浏览器开发者工具的Network面板

### 常见问题

1. **数据不更新**: 检查 `data/seed/` 目录权限
2. **API连接失败**: 确认后端服务已启动
3. **构建失败**: 检查Node.js版本（推荐18+）
