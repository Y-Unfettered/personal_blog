# 数据分离改造说明（2026-03-02）

## 改造目标

- GitHub 仅保存代码，不再保存运行数据。
- 前端只从 API 获取数据，不再读取 `public/data/*.json`。
- 旧的“生成 JSON + Git 提交推送”发布链路下线。
- Docker 部署改为宿主机绝对路径挂载数据，提升稳定性与可运维性。

## 已修改内容

### 1) 前端数据源强制 API

- 文件: `src/App.vue`
- 调整:
  - 删除 `VITE_DATA_SOURCE` / 静态 JSON fallback 分支。
  - 固定请求 `/api/posts`、`/api/categories`、`/api/tags`、`/api/nav`、`/api/settings`。
  - 实时更新通道固定为 `/api/events`。

### 2) 后台下线 Git 发布能力

- 文件: `scripts/admin-server.cjs`
- 调整:
  - 删除 `/api/generate`、`/api/publish` 接口。
  - 删除 `runGenerate()` 及 `child_process` 依赖。
  - 数据目录支持环境变量 `BLOG_DATA_DIR`（默认 `data/seed`）。
  - JSON 写入改为原子写（tmp + rename）。

- 文件: `admin/index.html`
- 调整:
  - 删除“发布管理”导航和页面。
  - 删除 `generateJson()` / `publish()` 前端函数调用链。
  - `setTab` 移除 `publish` tab。

- 文件: `scripts/admin.cjs`
- 调整:
  - 删除 `generate` / `publish` 命令入口。
  - 数据目录支持 `BLOG_DATA_DIR`。
  - JSON 写入改为原子写。

- 文件: `scripts/generate-data.cjs`
- 调整:
  - 删除 `--git-title`、`git add/commit/push` 逻辑。
  - JSON 写入改为原子写。

### 3) 数据与环境文件出仓库

- 文件: `.gitignore`
- 新增忽略:
  - `.env`、`.env.*`（保留 `*.example`）
  - `data/seed/*.json`
  - `public/data/*.json`

- 已移除（不再跟踪）:
  - `.env`
  - `.env.production`
  - `data/seed/*.json` 真实数据文件
  - `public/data/*.json` 静态数据文件
  - 若干 fake data JSON 文件

- 新增模板文件:
  - `.env.example`
  - `.env.production.example`
  - `data/seed/*.example.json`
  - `public/data/.gitkeep`

### 4) 初始化与部署改造

- 新增文件: `scripts/init-data.cjs`
  - 功能: 首次启动时把 `*.example.json` 初始化为 `*.json`（仅缺失时创建）。

- 新增文件: `scripts/migrate-data.cjs`
  - 功能: 将旧版 `data/seed/*.json` 一次性迁移到外部目录（默认 `/srv/blog-data/seed`）。
  - 兜底: 若工作区源文件缺失，会尝试从 Git 历史恢复后迁移。

- 文件: `package.json`
  - 新增脚本: `npm run init:data`
  - 新增脚本: `npm run migrate:data`

- 文件: `deploy/Dockerfile.api`
  - 删除 `COPY data`、`COPY public`，避免将业务数据打进镜像。
  - 增加 `BLOG_DATA_DIR=/app/data/seed`。

- 文件: `docker-compose.yml`
  - 数据挂载改为:
    - `${BLOG_DATA_DIR:-/srv/blog-data}/seed:/app/data/seed`
  - 新增 `blog-api` / `blog-web` 健康检查。
  - `depends_on` 改为 `service_healthy`。

- 新增文件: `.dockerignore`
  - 排除 `.env`、`data`、`public/data`、`node_modules`、`dist` 等。

### 5) 文档更新

- 文件: `README.md`
  - 已重写为“代码/数据分离”后的使用说明。

- 文件: `DEPLOY_REALTIME_CLOUDFLARE_DOCKER.md`
  - 移除文档内硬编码 tunnel token 示例，改为占位符。

## 影响评估

### 对你现有流程的影响

1. GitHub 不再保存任何业务数据
   - 以后 `git pull` 只更新代码，不会覆盖线上数据。

2. 后台不能再一键“发布并推送”
   - 现在内容保存即写入服务器本地 JSON，前端通过 API + SSE 实时刷新。

3. 首次部署/新环境部署需要额外一步初始化
   - 执行 `npm run init:data`（或手动准备 `data/seed/*.json`）。

4. Docker 部署需要宿主机数据目录
   - 默认 `/srv/blog-data/seed`，可通过 `.env` 的 `BLOG_DATA_DIR` 覆盖。

5. 环境变量改为模板管理
   - 需要自行创建 `.env`，并填写 `CF_TUNNEL_TOKEN`。

## 上线前建议

1. 在 Linux 服务器执行数据备份:
   - `tar -czf backup-data-$(date +%F).tar.gz /srv/blog-data/seed`
2. 因历史中出现过真实 tunnel token，建议立即在 Cloudflare 里轮换 token。
3. 重新部署:
   - `docker compose up -d --build`
4. 验证:
   - `curl http://127.0.0.1/api/health`
   - 后台新增/编辑文章后，前端是否无刷新更新。
