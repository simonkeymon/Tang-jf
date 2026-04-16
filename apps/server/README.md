# Tang Server

Tang 服务端使用 Express + Drizzle ORM，默认以 PostgreSQL 作为主持久化方案。

## 推荐本地启动方式

1. 启动 PostgreSQL：

```bash
docker compose up -d postgres
```

2. 复制环境变量：

```bash
cp apps/server/.env.example apps/server/.env
```

3. 启动服务：

```bash
pnpm --dir apps/server start
```

服务启动时会自动：
- 读取 PostgreSQL 配置
- 等待数据库就绪（带重试）
- 执行 Drizzle migrations
- 启动 API 服务

## 环境变量

优先使用：

```env
PERSISTENCE_MODE=pg
DATABASE_URL=postgresql://tang:tang@127.0.0.1:5432/tang
```

也支持分项配置：

```env
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=tang
DB_PASSWORD=tang
DB_NAME=tang
```

## 备用持久化

如果本地确实没有 PostgreSQL，可将：

```env
PERSISTENCE_MODE=pglite
PGLITE_DATA_DIR=~/.tang/pglite
```

作为文件型兜底方案使用。
