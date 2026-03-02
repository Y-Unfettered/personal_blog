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
