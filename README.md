# Tang

Tang 是一个基于 **pnpm monorepo + React/Vite + Express** 的 AI 健康饮食助手。

它包含 3 个主要应用：

- `apps/web`：用户端
- `apps/admin`：管理后台
- `apps/server`：API 服务

主要功能包括：

- 注册 / 登录
- 个人资料与饮食目标管理
- AI 生成饮食计划与今日食谱
- 体重记录、餐次打卡、每日总结、周报
- 食物图片分析
- 用户自定义 AI 配置（OpenAI-compatible）
- 管理员后台与平台 AI 配置

---

## 仓库结构

```text
apps/
  web/      用户端（React + Vite）
  admin/    管理后台（React + Vite）
  server/   API 服务（Express + TypeScript）
packages/
  shared/   共享类型、基础 UI、i18n、客户端工具
docs/
  USER_GUIDE.md
```

---

## 环境要求

- Linux / macOS / Windows
- Node.js **18+**（推荐 **Node.js 20 或 22**）
- `pnpm` **8.15.9**

推荐先启用 Corepack：

```bash
corepack enable
```

---

## 快速开始

### 1) 克隆仓库

```bash
git clone <your-repo-url>.git
cd Tang-jf
```

### 2) 安装依赖

```bash
pnpm install
```

如果本机 `pnpm` 版本与锁文件不兼容，可使用：

```bash
npx -y pnpm@8.15.9 install --frozen-lockfile
```

### 3) 配置环境变量

```bash
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env
cp apps/admin/.env.example apps/admin/.env
```

默认示例：

#### `apps/server/.env`

```env
PORT=3002
JWT_SECRET=change-me-in-production
AI_CONFIG_SECRET=change-me-in-production
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174
UPLOAD_ROOT=uploads
ADMIN_EMAILS=admin@example.com
PERSISTENCE_MODE=pg
DATABASE_URL=postgresql://tang:tang@127.0.0.1:5432/tang
DB_CONNECT_RETRIES=10
DB_CONNECT_DELAY_MS=1500
```

#### `apps/web/.env`

```env
VITE_API_BASE_URL=http://localhost:3002/api
```

#### `apps/admin/.env`

```env
VITE_API_BASE_URL=http://localhost:3002/api
```

### 4) 启动 PostgreSQL

```bash
pnpm db:up
```

### 5) 启动项目

```bash
pnpm start:all
```

默认访问地址：

- Web：`http://localhost:5173`
- Admin：`http://localhost:5174`
- API：`http://localhost:3002`
- Health：`http://localhost:3002/health`

---

## 数据库说明

Tang 默认使用 PostgreSQL 作为主持久化方案。

### 方案 A：PostgreSQL（主推荐）

本地开发推荐直接启动仓库自带的 PostgreSQL：

```bash
pnpm db:up
```

或：

```bash
docker compose up -d postgres
```

环境变量推荐优先使用：

```env
PERSISTENCE_MODE=pg
DATABASE_URL=postgresql://tang:tang@127.0.0.1:5432/tang
```

服务启动时会自动等待数据库可用并执行 `apps/server/drizzle/migrations` 下的迁移。

### 方案 B：PGlite（备用兜底）

如果本地确实没有 PostgreSQL，可切换到文件型本地数据库：

```env
PERSISTENCE_MODE=pglite
PGLITE_DATA_DIR=~/.tang/pglite
```

这更适合临时体验或单机兜底，不再作为主推荐链路。

可通过健康检查确认当前模式：

```bash
curl http://localhost:3002/health
```

示例返回：

```json
{
  "ok": true,
  "name": "tang-server",
  "persistence": "postgres",
  "engine": "pg"
}
```

---

## 远程 Linux 安装与运行

如果你准备把源码上传到 GitHub，然后在远程 Linux 服务器部署，推荐按下面流程操作。

### 1) 安装基础环境

以 Ubuntu / Debian 为例：

```bash
sudo apt update
sudo apt install -y git curl build-essential
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
corepack enable
```

确认版本：

```bash
node -v
pnpm -v
```

### 2) 拉取代码

```bash
git clone <your-repo-url>.git
cd Tang-jf
pnpm install
```

### 3) 配置环境变量

```bash
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env
cp apps/admin/.env.example apps/admin/.env
```

如果你要对外部署，请至少修改：

- `JWT_SECRET`
- `AI_CONFIG_SECRET`
- `ALLOWED_ORIGINS`
- `VITE_API_BASE_URL`

例如：

```env
# apps/server/.env
PORT=3002
JWT_SECRET=replace-with-a-long-random-secret
AI_CONFIG_SECRET=replace-with-another-long-random-secret
ALLOWED_ORIGINS=https://your-web-domain,https://your-admin-domain
PGLITE_DATA_DIR=.data/pglite
```

```env
# apps/web/.env
VITE_API_BASE_URL=https://api.example.com/api
```

```env
# apps/admin/.env
VITE_API_BASE_URL=https://api.example.com/api
```

### 4) 构建项目

```bash
pnpm build
```

### 5) 启动服务

#### 启动 API

推荐在 `apps/server` 目录启动，确保迁移路径正确：

```bash
cd apps/server
pnpm start
```

#### 启动前端开发预览（简单方式）

如果只是临时体验，也可以直接在两个终端中运行：

```bash
pnpm --filter @tang/web start
pnpm --filter @tang/admin start
```

> 注意：上面这两个命令启动的是 Vite 服务，适合开发或内网预览，不是正式生产部署方式。

### 6) 生产部署建议

正式部署时推荐：

- `apps/server` 用 Node.js 常驻运行（例如 systemd / pm2）
- `apps/web/dist` 与 `apps/admin/dist` 交给 Nginx 提供静态文件服务
- API 反向代理到 `3002`

仓库中已提供：

- `nginx.web.conf`
- `nginx.admin.conf`

可作为静态站点配置参考。

---

## 使用说明

### 用户端

打开：

- `http://localhost:5173`

建议体验顺序：

1. 注册账号
2. 登录
3. 完善个人资料
4. 生成饮食计划
5. 生成今日食谱
6. 进行体重记录与餐次打卡
7. 查看每日总结 / 周报 / 营养分析
8. 按需配置自定义 AI

### AI 配置

登录后进入：

- `/settings/ai`

支持填写：

- Base URL
- API Key
- 模型名称

当前支持 **OpenAI-compatible** 接口。  
如果未配置真实 AI，系统也可以使用 mock 流程继续运行。

### 管理后台

打开：

- `http://localhost:5174`

首次进入时：

- 如果系统中还没有管理员账号，页面会显示“初始化首个管理员”
- 创建的第一个账号会自动成为管理员

默认管理员白名单可通过 `ADMIN_EMAILS` 配置，例如：

```env
ADMIN_EMAILS=admin@example.com
```

---

## 常用命令

```bash
# 安装依赖
pnpm install

# 启动全部服务
pnpm start:all

# 分别启动
pnpm --filter @tang/web dev
pnpm --filter @tang/admin dev
pnpm --filter @tang/server start

# 质量检查
pnpm typecheck
pnpm test
pnpm build
pnpm lint
```

---

## 常见问题

### 1. 服务能启动，但登录 / 注册失败

请优先检查：

- `apps/server/.env` 是否正确
- `http://localhost:3002/health` 是否正常返回
- `apps/web/.env` 和 `apps/admin/.env` 中的 `VITE_API_BASE_URL` 是否正确

### 2. 没有 PostgreSQL 可以运行吗？

可以。  
Tang 默认会回退到 **PGlite** 本地持久化模式，不依赖系统级 PostgreSQL。

### 3. 为什么远程服务器上不建议直接跑 Vite？

因为 `pnpm --filter @tang/web start` 和 `pnpm --filter @tang/admin start` 本质上仍然是开发服务器，更适合开发和预览。  
生产环境更推荐：

- 先执行 `pnpm build`
- 再用 Nginx 托管 `dist` 静态文件

---

## 文档

- 完整使用手册：[`docs/USER_GUIDE.md`](docs/USER_GUIDE.md)

---

## License

如需开源发布，请在此处补充许可证信息。
