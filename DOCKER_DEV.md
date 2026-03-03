# 开发环境使用 Docker

## 快速开始

### 1. 使用开发环境 Docker（推荐）

```bash
# 使用开发环境配置启动
docker compose -f docker-compose.dev.yml --env-file .env.dev up -d --build

# 查看日志
docker compose -f docker-compose.dev.yml logs -f

# 停止服务
docker compose -f docker-compose.dev.yml down
```

### 2. 访问地址

- 前端：http://localhost:8080
- 后台管理：http://localhost:8080/admin
- API：http://localhost:3030

### 3. 数据存储

开发环境使用 `.local-dev-data/seed/` 目录存储数据，数据会持久化到本地。

## 与生产环境的区别

| 特性 | 开发环境 | 生产环境 |
|------|---------|---------|
| 配置文件 | `docker-compose.dev.yml` | `docker-compose.yml` |
| 环境变量 | `.env.dev` | `.env` |
| 数据目录 | `.local-dev-data/seed/` | `/srv/blog-data/seed/` |
| 前端端口 | 8080 | 80 |
| Cloudflare Tunnel | 不启用 | 启用 |

## 开发流程

### 前端开发（热重载）

如果你想使用 Vite 的热重载功能，可以：

```bash
# 启动后端 API（Docker）
docker compose -f docker-compose.dev.yml up -d blog-api

# 启动前端开发服务器（Vite）
npm run dev
```

这样前端会在 `http://localhost:5173` 运行，并连接到 Docker 中的 API。

### 完整开发环境（Docker）

如果你想完全模拟生产环境，使用：

```bash
docker compose -f docker-compose.dev.yml up -d --build
```

## 常见问题

### 1. 端口冲突

如果 8080 或 3030 端口被占用，可以修改 `docker-compose.dev.yml` 中的端口映射：

```yaml
ports:
  - "8081:80"  # 改为 8081
```

### 2. 数据不更新

如果修改了 `.local-dev-data/seed/` 中的数据，但前端没有更新：

1. 检查 API 是否正常：`curl http://localhost:3030/api/posts`
2. 重启服务：`docker compose -f docker-compose.dev.yml restart`

### 3. 清理环境

```bash
# 停止并删除容器
docker compose -f docker-compose.dev.yml down

# 删除数据卷（慎用！会删除所有数据）
docker compose -f docker-compose.dev.yml down -v

# 重新构建镜像
docker compose -f docker-compose.dev.yml build --no-cache
```

## 为什么推荐用 Docker 开发？

1. **环境一致性**：开发和生产环境完全一致，避免"在我机器上能跑"的问题
2. **数据分离**：统一使用 API 加载数据，不再直接读取 JSON 文件
3. **真实模拟**：完全模拟生产环境的架构和配置
4. **简化部署**：开发完成后，直接用 `docker-compose.yml` 部署到生产环境
5. **避免混淆**：不再需要区分开发数据和生产数据的加载逻辑

## 从传统开发方式迁移

如果你之前使用 `npm run dev` 开发，现在可以：

1. **停止之前的开发服务器**：按 Ctrl+C 停止 `npm run dev`
2. **启动 Docker 开发环境**：`docker compose -f docker-compose.dev.yml up -d --build`
3. **访问应用**：打开 http://localhost:8080

你的开发数据（`.local-dev-data/seed/`）会被自动挂载到 Docker 容器中。
