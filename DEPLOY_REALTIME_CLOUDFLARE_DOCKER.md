# personal_blog Linux + Docker + Cloudflare Tunnel 部署教程（实时同步版）

## 0. 这份教程解决什么问题

你现在的项目已经改成了实时模式：

1. 前台会请求 `/api/posts` 等接口拿数据。
2. 前台会连接 `/api/events`（SSE）监听后台变更。
3. 后台新增/修改/删除后，前台无需刷新就会自动更新。

所以，不能再用 `file:///dist/index.html` 双击打开。必须通过 Web 服务（Nginx）和 API 服务（Node）运行。

---

## 1. 最终目标架构

1. `blog-api` 容器：运行 `scripts/admin-server.cjs`，提供 `/api/*` + `/admin`。
2. `blog-web` 容器：Nginx，托管前台 `dist`，并反向代理到 `blog-api`。
3. `cloudflared` 容器：把你的服务安全暴露到 Cloudflare，不需要开路由器端口。
4. 域名：
   1. `lemontop.asia`：前台访问。
   2. `admin.lemontop.asia`：后台访问（建议加 Cloudflare Access 登录保护）。

---

## 2. 前置条件（逐条确认）

在 Linux 服务器上执行：

```bash
uname -a
docker --version
docker compose version
git --version
```

如果 Docker 没装，先安装 Docker Engine + Docker Compose Plugin，再继续。

---

## 3. 拉取项目到 Linux

```bash
sudo mkdir -p /srv
cd /srv
sudo git clone <你的仓库地址> personal_blog
sudo chown -R $USER:$USER /srv/personal_blog
cd /srv/personal_blog
```

确认你能看到这些文件：

```bash
ls -la
```

至少应有：

1. `package.json`
2. `scripts/admin-server.cjs`
3. `src/App.vue`
4. `.env.production`（值是 `VITE_DATA_SOURCE=api`）

---

## 4. 新建部署文件

在项目根目录创建 `deploy` 文件夹：

```bash
mkdir -p deploy
```

### 4.1 创建 `deploy/Dockerfile.api`

```bash
cat > deploy/Dockerfile.api <<'EOF'
FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY scripts ./scripts
COPY admin ./admin
COPY data ./data
COPY public ./public

ENV NODE_ENV=production
ENV ADMIN_HOST=0.0.0.0
ENV ADMIN_PORT=3030

EXPOSE 3030
CMD ["node", "scripts/admin-server.cjs"]
EOF
```

### 4.2 创建 `deploy/Dockerfile.web`

```bash
cat > deploy/Dockerfile.web <<'EOF'
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EOF
```

### 4.3 创建 `deploy/nginx.conf`

```bash
cat > deploy/nginx.conf <<'EOF'
server {
  listen 80;
  server_name lemontop.asia www.lemontop.asia;

  root /usr/share/nginx/html;
  index index.html;

  location = /api/events {
    proxy_pass http://blog-api:3030/api/events;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 1h;
    add_header Cache-Control "no-cache";
  }

  location ~ ^/api/(posts|categories|tags|nav|settings)$ {
    limit_except GET HEAD OPTIONS { deny all; }
    proxy_pass http://blog-api:3030;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }

  location = /api/health {
    proxy_pass http://blog-api:3030/api/health;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }

  location /admin { return 403; }
  location /api/ { return 403; }

  location / {
    try_files $uri $uri/ /index.html;
  }
}

server {
  listen 80;
  server_name admin.lemontop.asia;

  location = /admin {
    proxy_pass http://blog-api:3030/admin;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }

  location /api/events {
    proxy_pass http://blog-api:3030/api/events;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 1h;
    add_header Cache-Control "no-cache";
  }

  location /api/ {
    proxy_pass http://blog-api:3030;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }

  location / {
    return 404;
  }
}
EOF
```

### 4.4 创建 `docker-compose.yml`

```bash
cat > docker-compose.yml <<'EOF'
services:
  blog-api:
    build:
      context: .
      dockerfile: deploy/Dockerfile.api
    container_name: blog-api
    restart: unless-stopped
    environment:
      - ADMIN_HOST=0.0.0.0
      - ADMIN_PORT=3030
    volumes:
      - ./data:/app/data
      - ./public:/app/public
    networks:
      - blog-net

  blog-web:
    build:
      context: .
      dockerfile: deploy/Dockerfile.web
    container_name: blog-web
    restart: unless-stopped
    depends_on:
      - blog-api
    ports:
      - "80:80"
    networks:
      - blog-net

  cloudflared:
    image: cloudflare/cloudflared:latest
    container_name: blog-cloudflared
    restart: unless-stopped
    command: tunnel --no-autoupdate run --token ${CF_TUNNEL_TOKEN}
    depends_on:
      - blog-web
    networks:
      - blog-net

networks:
  blog-net:
    driver: bridge
EOF
```

### 4.5 创建 `.env`

```bash
cat > .env <<'EOF'
CF_TUNNEL_TOKEN=把这里替换成你的Cloudflare隧道Token
EOF
```

---

## 5. 先本机验证（不走 Cloudflare）

### 5.1 启动容器

```bash
docker compose up -d --build
```

### 5.2 看状态

```bash
docker compose ps
docker compose logs -f blog-api
```

### 5.3 验证接口

```bash
curl http://127.0.0.1/api/health
curl http://127.0.0.1/api/posts | head
```

### 5.4 验证 SSE 通道

```bash
curl -N http://127.0.0.1/api/events
```

这个命令会保持连接，不会自动退出，这是正常现象。

### 5.5 浏览器验证

1. 打开 `http://<你的Linux服务器IP>/`，看到前台即通过。
2. 打开 `http://<你的Linux服务器IP>/admin`，应返回 403（前台域名策略下是故意禁止）。

---

## 6. 配置 Cloudflare Tunnel

### 6.1 在 Cloudflare Zero Trust 创建 Tunnel

1. 进入 Cloudflare Zero Trust。
2. 路径：`Networks > Connectors > Cloudflare Tunnels`。
3. `Create a tunnel`，选择 `Cloudflared`。
4. 创建后复制 Docker 运行命令里的 token（或直接复制 token）。
5. 把 token 填进 `/srv/personal_blog/.env` 的 `CF_TUNNEL_TOKEN`。
6. docker run cloudflare/cloudflared:latest tunnel --no-autoupdate run --token <YOUR_CF_TUNNEL_TOKEN>

### 6.2 给同一个 Tunnel 添加 2 条 Public Hostname

1. `lemontop.asia` -> Service: `http://blog-web:80`
2. `admin.lemontop.asia` -> Service: `http://blog-web:80`

注意：这里 service 写的是 Docker 网络里的服务名 `blog-web`，不是 `localhost`。

### 6.3 重启 cloudflared 容器

```bash
docker compose up -d cloudflared
docker compose logs -f cloudflared
```

看到连接成功、tunnel healthy 即可。

---

## 7. 给后台加登录保护（强烈建议）

你现在后台是写接口，如果不加保护，任何人都可能改数据。

在 Cloudflare Zero Trust 中：

1. 路径：`Access controls > Applications > Add an application`。
2. 类型选 `Self-hosted`。
3. 保护域名填：`admin.lemontop.asia/*`。
4. Policy：只允许你自己的邮箱（或邮箱域）。
5. 保存后，再访问后台会先登录。

---

## 8. 验证“实时同步”是否成功

### 8.1 连通性检查

1. 访问 `https://lemontop.asia`，前台应正常打开。
2. 在浏览器开发者工具 Network 里，应该看到 `/api/events` 状态为 `200` 且一直 Pending。

### 8.2 功能检查

1. 打开第二个标签页：`https://admin.lemontop.asia/admin`。
2. 新增或编辑一篇已发布文章。
3. 保存后回到前台标签页，不刷新，内容应自动更新。

---

## 9. 后续更新流程（每次改代码）

```bash
cd /srv/personal_blog
git pull
docker compose up -d --build blog-api blog-web
docker compose ps
```

如果仅 tunnel token 变化：

```bash
docker compose up -d cloudflared
```

---

## 10. 典型故障与处理

### 10.1 页面只显示 Loading...

原因通常是以下之一：

1. 你在用 `file:///.../dist/index.html` 打开（错误方式）。
2. `/assets/*` 没有通过 HTTP 服务提供。
3. `/api/posts` 请求失败。

处理：

1. 只用 `http://IP` 或 `https://域名` 访问。
2. 打开浏览器 F12 看 Console 和 Network。
3. 在服务器执行 `curl http://127.0.0.1/api/posts` 看是否有 JSON。

### 10.2 后台保存成功，但前台不自动更新

处理顺序：

1. 检查前台是否已建立 `/api/events` 长连接。
2. 检查 Nginx 对 `/api/events` 是否 `proxy_buffering off`。
3. 检查 Cloudflare 缓存规则，确保 `/api/*` 不缓存。
4. 检查 `blog-api` 日志有没有异常。

### 10.3 `admin.lemontop.asia` 502

1. 看 `docker compose ps`，确认 `blog-api` 是 `Up`。
2. 看 `docker compose logs -f blog-api`。
3. 容器内检查 API：

```bash
docker exec -it blog-web sh -c "wget -qO- http://blog-api:3030/api/health"
```

---

## 11. 数据备份（一定要做）

实时模式下，你的数据核心在 `data/seed/*.json`。

建议每天至少一次备份：

```bash
cd /srv/personal_blog
tar -czf backup-data-$(date +%F).tar.gz data/seed
```

再把备份包同步到网盘或另一台机器。

---

## 12. 本教程涉及的关键官方文档

1. Cloudflare Tunnel（创建远程管理 tunnel）：  
   https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/get-started/create-remote-tunnel/
2. Tunnel token 权限说明：  
   https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/configure-tunnels/remote-tunnel-permissions/
3. cloudflared 运行参数（`--token`）：  
   https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/configure-tunnels/cloudflared-parameters/run-parameters/
4. Cloudflare Access 保护自建应用：  
   https://developers.cloudflare.com/cloudflare-one/applications/configure-apps/self-hosted-public-app/
5. Nginx `proxy_buffering` 官方说明（SSE关键）：  
   https://nginx.org/en/docs/http/ngx_http_proxy_module.html
