# Tang 完整使用文档

更新时间：2026-04-14

---

## 1. 项目简介

Tang 是一个 AI 健康饮食助手，围绕以下流程设计：

1. 注册 / 登录
2. 填写身体资料与饮食偏好
3. 生成饮食计划
4. 生成今日食谱
5. 记录体重与餐次打卡
6. 生成每日总结 / 周报
7. 按需接入自己的 AI 服务
8. 管理员后台登录与查看

当前技术框架保持不变：

- `apps/web`：React + Vite 用户端
- `apps/admin`：React + Vite 管理后台
- `apps/server`：Express API
- `packages/shared`：共享类型 / 基础 UI / AI 抽象

---

## 2. 环境要求

- Node.js 18+（推荐 Node 22）
- pnpm 8.x（仓库锁定 `pnpm@8.15.9`）

建议：

```bash
corepack enable
```

---

## 3. 安装依赖

在仓库根目录执行：

```bash
pnpm install
```

若本机 `pnpm` 版本与 lockfile 不兼容，可执行：

```bash
npx -y pnpm@8.15.9 install --frozen-lockfile
```

---

## 4. 环境变量配置

### 4.1 Server

复制：

```bash
cp apps/server/.env.example apps/server/.env
```

默认内容：

```env
PORT=3002
JWT_SECRET=change-me-in-production
AI_CONFIG_SECRET=change-me-in-production
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174
UPLOAD_ROOT=uploads
ADMIN_EMAILS=admin@example.com
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=tang
DB_PASSWORD=tang
DB_NAME=tang
PGLITE_DATA_DIR=.data/pglite
```

说明：

- `PORT`：服务端口
- `JWT_SECRET`：登录鉴权密钥
- `AI_CONFIG_SECRET`：用户 AI Key 的加密密钥
- `ALLOWED_ORIGINS`：允许的浏览器来源
- `UPLOAD_ROOT`：上传图片目录
- `ADMIN_EMAILS`：管理员邮箱白名单
- `DB_*`：PostgreSQL 连接参数
- `PGLITE_DATA_DIR`：本地嵌入式 PostgreSQL 兼容存储目录

### 4.2 Web

```bash
cp apps/web/.env.example apps/web/.env
```

```env
VITE_API_BASE_URL=http://localhost:3002/api
```

### 4.3 Admin

```bash
cp apps/admin/.env.example apps/admin/.env
```

```env
VITE_API_BASE_URL=http://localhost:3002/api
```

---

## 5. 启动项目

在根目录执行：

```bash
pnpm start:all
```

默认地址：

- Web：`http://localhost:5173`
- Admin：`http://localhost:5174`
- API：`http://localhost:3002`
- Health：`http://localhost:3002/health`

### 5.1 启动 PostgreSQL（推荐）

如果本机安装了 Docker，可直接执行：

```bash
docker compose up -d postgres
```

说明：

- 配置数据库后，服务端会在启动时自动执行迁移
- 如果未配置外部 PostgreSQL，服务默认回退到 **PGlite 持久化模式**
- 只有在测试或显式指定内存模式时才会退回纯内存

如果只想启动单个服务：

```bash
pnpm --filter @tang/web dev
pnpm --filter @tang/admin dev
pnpm --filter @tang/server start
```

---

## 6. 用户端完整使用流程

### 6.1 注册账号

打开：

- `http://localhost:5173/register`

输入：

- 邮箱
- 密码
- 确认密码

注册成功后会自动进入首页。

### 6.2 登录账号

打开：

- `http://localhost:5173/login`

输入邮箱和密码即可登录。

说明：

- 登录态会保存在浏览器本地
- 刷新页面后不会立即掉线
- 配置 PostgreSQL 后，用户与刷新 token 会在服务重启后保留

### 6.3 完善个人资料

进入：

- 首页点击“先完善资料”
- 或直接访问 `http://localhost:5173/profile`

填写：

- 性别
- 年龄
- 身高
- 体重
- 目标（减脂 / 维持 / 增肌）
- 活动水平
- 过敏食物
- 饮食禁忌

保存后系统会计算：

- BMR
- TDEE
- 每日建议热量

### 6.4 生成饮食计划

进入：

- `http://localhost:5173/plan`

点击：

- “创建饮食计划”

系统会生成：

- 目标
- 每日热量目标
- 计划周期
- 宏量营养比例
- 阶段说明

### 6.5 生成今日食谱

进入：

- `http://localhost:5173/recipe/today`

点击：

- “生成今日食谱”

将得到：

- 早餐
- 午餐
- 晚餐
- 加餐

支持操作：

- 查看详情
- 收藏
- 换一份
- 完成打卡

### 6.6 打卡与体重记录

进入：

- `http://localhost:5173/tracking`

你可以：

- 记录今日体重
- 给早餐 / 午餐 / 晚餐 / 加餐打卡
- 查看最近 7 天体重
- 查看连续打卡天数

### 6.7 查看每日总结

进入：

- `http://localhost:5173/summary/today`

点击：

- “生成今日总结”

将看到：

- 今日完成率
- 实际 / 目标热量
- 热量差值
- 今日体重
- AI 反馈
- 明日预告

### 6.8 查看营养分析

进入：

- `http://localhost:5173/nutrition`

内容包括：

- 每日总热量
- 蛋白质 / 碳水 / 脂肪
- 宏量营养占比
- 按餐次的营养分布

### 6.9 查看进度分析

进入：

- `http://localhost:5173/progress`

支持：

- 最近 7 天 / 30 天切换
- 体重折线图
- 热量完成度

### 6.10 购物清单

进入：

- `http://localhost:5173/shopping`

点击：

- “生成本周购物清单”

支持：

- 分类查看
- 勾选已购 / 未购

### 6.11 健康报告

进入：

- `http://localhost:5173/report`

点击：

- “生成周报”

将汇总：

- 体重记录数量
- 最新体重
- 执行率
- 热量统计
- AI 周总结

### 6.12 食物拍照分析

进入：

- `http://localhost:5173/food-analysis`

支持：

- 上传图片
- 分析热量
- 查看估算结果

说明：

- 上传后的图片会保存在 `uploads/`
- 服务端已经开放 `/uploads/*` 静态访问

---

## 7. AI 配置说明

### 7.1 入口

登录后进入：

- `http://localhost:5173/settings/ai`

### 7.2 可配置项

- 是否使用自定义 AI
- Base URL
- API Key
- 模型名（**可自定义输入**）

### 7.3 模型支持方式

当前模型字段不是固定下拉限制，而是：

- 可输入任意模型名
- 同时提供常见模型建议

例如：

- `gpt-4o`
- `gpt-4.1`
- `gpt-4.1-mini`
- `deepseek-chat`
- `qwen-plus`

### 7.4 API Key 保存规则

- 首次保存时必须填写 API Key
- 已保存过 Key 后，再次保存时可以**留空保留原 Key**
- 若要测试连接，需重新输入一次 API Key

### 7.5 当前 AI 运行模式

当前项目支持 **OpenAI-compatible** 接口：

- 当用户配置了自定义 AI 时，优先使用用户配置
- 若用户未配置，但平台管理员配置了平台 AI，则使用平台配置
- 若都未配置，则自动退回 mock 模式，保证流程可运行

这意味着：

- **没有 AI Key 时，项目也能完整跑通**
- **填入 AI 配置后，文本类 AI 结果会走真实模型**

---

## 8. 管理后台使用说明

地址：

- `http://localhost:5174`

当前后台已支持管理员账号直接登录。

### 8.1 管理员身份规则

如果系统中还没有管理员账号，首次进入后台会进入**管理员初始化模式**：

- 在 `http://localhost:5174` 直接填写邮箱和密码
- 第一个创建的账号会自动成为管理员

默认服务端也会将以下邮箱视为管理员白名单：

- `admin@example.com`

也可以通过 `ADMIN_EMAILS` 增加更多管理员邮箱。

### 8.2 使用方式

#### 首次进入后台

1. 打开 `http://localhost:5174`
2. 如果没有管理员账号，页面会显示“初始化首个管理员”
3. 填写邮箱和密码后提交
4. 创建成功后会自动进入后台

#### 后续登录

1. 打开 `http://localhost:5174`
2. 输入管理员邮箱和密码
3. 登录后即可查看后台数据

后台可查看：

- 用户列表
- dashboard 统计
- 平台 AI 是否已配置
- 平台 AI 配置编辑

---

## 9. 质量检查命令

在根目录运行：

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm lint
```

当前验证目标：

- TypeScript 类型检查通过
- 测试通过
- Web/Admin/Server 均能构建
- lint 无 error（允许保留少量历史 warning）

---

## 10. 已知说明

### 10.1 数据持久化现状

当前支持两种模式：

#### A. PostgreSQL 持久化模式（推荐）

配置数据库后，以下核心数据会持久化：

- 用户
- 刷新 token
- 密码重置 token
- 个人资料
- AI 配置
- 饮食计划
- 今日食谱
- 体重记录
- 餐次打卡
- 购物清单
- 每日总结
- 周报 / 月报
- 食物拍照分析结果
- 成就解锁记录
- 上传文件元数据
- 导出历史

#### A-2. PGlite 本地持久化模式（当前环境可用）

如果没有系统级 PostgreSQL，Tang 会自动使用：

- `PGLITE_DATA_DIR`

来启动一个**嵌入式 PostgreSQL 兼容数据库**，同样支持业务数据持久化。

你可以通过健康检查确认：

- `persistence: "postgres"`
- `engine: "pglite"`

#### B. 内存模式（兜底）

未配置数据库时，应用仍然可运行，但服务重启后运行态数据不会保留。

说明：

- 这里指的是**业务数据结构**已经覆盖持久化
- 诸如限流计数、进程内缓存、prompt 注册表这类运行时技术状态仍保持内存态，这是设计使然，不属于业务持久化数据

### 10.2 忘记密码

当前已实现开发态密码重置流程：

- 提交邮箱申请重置
- 返回 reset token（开发环境可见）
- 使用 token 设置新密码

当前尚未接入真实邮件发送。

### 10.3 第三方登录

目前未接入：

- 手机号验证码登录
- 微信登录
- Google 登录

---

## 11. 推荐体验顺序

建议你第一次体验时按以下顺序操作：

1. 注册账号
2. 登录
3. 如果需要持久化，先启动 PostgreSQL
4. 去 AI 设置页填写自己的模型配置（可选）
5. 完善个人资料
6. 生成饮食计划
7. 生成今日食谱
8. 在记录中心打卡
9. 生成每日总结
10. 查看周报和营养分析

---

## 12. 故障排查

### 12.1 登录 / 注册失败

优先检查：

- `apps/server` 是否成功启动
- `http://localhost:3002/health` 是否返回正常
- `apps/web/.env` 中的 `VITE_API_BASE_URL` 是否正确

### 12.2 AI 连接测试失败

检查：

- Base URL 是否正确
- API Key 是否有效
- 模型名是否为目标服务支持的名称
- 服务是否兼容 OpenAI `/chat/completions`

### 12.3 上传图片后无法访问

确认：

- 服务端已启动
- 上传目录存在
- `app.ts` 已挂载 `/uploads` 静态目录

---

## 13. 命令速查

```bash
# 全部启动
pnpm start:all

# 用户端
pnpm --filter @tang/web dev

# 后台
pnpm --filter @tang/admin dev

# 服务端
pnpm --filter @tang/server start

# 测试
pnpm test

# 构建
pnpm build
```
