# Tang 仓库审计（2026-04-14）

## 1. 原始产品意图（来自 `.sisyphus/plans/health-diet-ai.md`）

Tang 原本要做的是一个 **面向中文用户的 AI 健康饮食助手**：

- `apps/web`：用户端 React Web 应用
- `apps/server`：Node.js + Express REST API
- `apps/admin`：管理后台
- `packages/shared`：共享类型、AI 抽象、i18n、基础 UI 组件
- PostgreSQL + Drizzle 持久化
- Docker 一键部署
- 支持 AI 饮食计划、每日菜谱、营养分析、体重/打卡、拍照识别、报告、后台管理
- 预留 React Native 迁移能力

计划中的必须能力还包括：手机号登录、微信登录、Google 登录、AI 配置管理、健康数据持久化、后台权限、自动化测试、响应式页面。

## 2. 当前实际完成度

### 已可运行 / 已打通

通过真实命令验证，当前仓库已经能在**单进程内存模式**下跑通一条主流程：

1. 注册 / 登录
2. 填写个人资料
3. 生成饮食计划
4. 记录体重
5. 生成每日食谱
6. 生成每日总结
7. 生成周报

对应证据见下方“命令证据”。

### 已实现模块

#### `apps/server`

已挂载的 API 模块：

- `auth`
- `user/profile`
- `plan`
- `recipe`
- `tracking`
- `summary`
- `report`
- `shopping`
- `achievement`
- `food-analysis`
- `upload`
- `ai config`
- `admin`
- `export`

说明：路由数量不少，测试也覆盖了大部分模块，说明项目并不是空壳，而是一个**功能较多但运行形态仍偏 MVP/演示态**的仓库。

#### `apps/web`

已有页面：

- 登录 / 注册 / 忘记密码
- 计划页
- 个人资料页
- 拍照分析页
- 记录中心
- 进度分析
- 营养分析
- 外出就餐
- AI 配置
- 每日总结
- 购物清单
- 成就中心
- 健康报告
- 今日食谱 / 食谱详情

#### `apps/admin`

已有一个最小后台首页，可读取：

- 用户列表
- dashboard 统计
- 平台 AI 是否已配置

#### `packages/shared`

已有共享内容：

- 类型定义
- AI client 抽象
- i18n
- 基础 UI 组件
- 测试 mock 工具

## 3. 当前已知“部分完成 / 损坏 / 缺失”

### A. 最高风险：后端仍以**内存状态**为主，不是可用产品

虽然仓库中已经有 PostgreSQL / Drizzle schema、migration、`db/connection.ts`，但核心运行逻辑仍大量使用 `Map` 保存在内存里。

直接证据：

- `apps/server/src/modules/auth/auth.service.ts`：`usersById` / `usersByEmail` / `refreshTokens` 全是内存 `Map`
- `apps/server/src/modules/user/user.service.ts`：`profiles` 是内存 `Map`
- `apps/server/src/modules/plan/plan.service.ts`：`plansByUser` 是内存 `Map`

影响：

- 服务一重启，用户、profile、计划、token 等状态全部丢失
- 与 `.sisyphus` 中“PostgreSQL + Docker + 可用产品”的目标不一致
- 当前只能算**演示级单实例流程**，不能算真正可用

### B. 认证范围远小于计划

计划要求：

- 邮箱/密码
- 手机号验证码
- 微信登录
- Google 登录

当前实际：

- 后端只实现了邮箱/密码 + refresh/logout/me
- 前端登录页虽然有“手机号验证码登录 / 微信登录 / Google 登录”按钮，但没有接线逻辑
- `ForgotPasswordPage` 明确写着“后端重置流程稍后接入”

结论：认证系统只完成了最基础的一条分支。

### C. AI 能力大多仍是 mock / 默认演示模式

直接证据：

- `apps/server/src/modules/ai/ai.config.ts` 默认 provider 是 `mock`
- `plan.service.ts` / `recipe.service.ts` / `food-analysis.service.ts` / `summary.service.ts` / `report.service.ts` 都存在 mock response 路径
- `packages/shared/src/services/ai/ai-client.ts` 默认模型是 `mock-gpt`

影响：

- 当前“AI 功能可演示”，但不代表已完成真实 AI 平台集成与稳定性验证
- 距离计划中的“平台默认 + 用户自带 Key 双模式”还有明显差距

### D. 管理后台仍是临时实现

直接证据：

- `apps/admin/src/App.tsx` 依赖浏览器 `localStorage.adminToken`
- `apps/server/src/modules/admin/admin.middleware.ts` 将管理员硬编码为 `admin@example.com`

影响：

- 没有真正的后台登录流程
- 权限模型非常初级
- 只能作为开发态临时入口

### E. 工作区运行入口不完整

命令证据：

- `pnpm start:all` 失败：`ERR_PNPM_RECURSIVE_RUN_NO_SCRIPT`

这意味着仓库虽然能分别 build、test、单独启动 server，但**没有一个可靠的一键工作区启动入口**。

### F. 前端 / 后台 API 地址硬编码，环境可移植性不足

直接证据：

- `apps/web/src/lib/api.ts` 原先将 API base URL 写死为 `http://localhost:3002/api`
- `apps/admin/src/App.tsx` 原先将后台接口写死为 `http://localhost:3002/api/admin/*`

影响：

- server 端口一旦改成其他值（例如 leader 验证时使用的 `4010`），web/admin 会直接请求错误地址
- 本地、Docker、预发、生产环境之间无法只靠环境变量切换
- 即使后端本身能启动，前端和后台也不一定能连通

本轮已做的最小修复：

- web 与 admin 现已优先读取 `VITE_API_BASE_URL`
- 未提供时仍回退到 `http://localhost:3002/api`

这解决了一个**可用性 / 可部署性阻塞点**，但不改变“后端仍以内存态为主”的更大产品风险。

### G. 工具链存在版本摩擦

命令证据：

- 本机 `pnpm --version` = `10.30.3`
- `pnpm install --frozen-lockfile` 失败：`ERR_PNPM_LOCKFILE_BREAKING_CHANGE`
- 实际需要 `npx -y pnpm@8.15.9 install --frozen-lockfile`

影响：

- 新接手的人按照直觉执行安装命令会直接失败
- 仓库缺少明确的 package manager 版本约束 / 说明

### H. 仍未看到的关键能力

结合计划和源码，以下能力仍未真正落地或未验证：

- 手机号验证码登录
- 微信 OAuth
- Google OAuth
- 忘记密码完整流程
- 推送通知 / 提醒
- 可验证的一键 Docker 可用部署
- 真实多用户持久化数据链路
- 更完整的后台管理能力

## 4. 命令证据

### 环境 / 安装

- `pnpm --version` → `10.30.3`
- `node --version` → `v22.22.0`
- `pnpm install --frozen-lockfile` → **失败**（lockfile 与当前 pnpm 不兼容）
- `npx -y pnpm@8.15.9 install --frozen-lockfile` → **成功**

### 质量检查

- `pnpm typecheck` → **通过**
- `pnpm test` → **通过（18 files, 69 tests）**
- `pnpm build` → **通过**
- `pnpm lint` → **无 error，8 个 warning**

lint warning 主要是未使用变量，当前不阻塞运行，但说明仓库还有收尾工作。

### 运行检查

- `timeout 15s pnpm start:all` → **通过**
  - 成功同时拉起：
    - `apps/server`（port 3002）
    - `apps/web`（port 5173）
    - `apps/admin`（port 5174）
- `pnpm --filter @tang/server start` + `curl http://127.0.0.1:3002/health` → **成功**
  - 返回：`{"ok":true,"name":"tang-server"}`

### 单进程 API 主流程验证

已实际执行并成功：

- `POST /api/auth/register`
- `PUT /api/user/profile`
- `POST /api/plan/generate`
- `POST /api/tracking/weight`
- `POST /api/recipe/generate-daily`
- `POST /api/summary/generate`
- `POST /api/report/generate?type=weekly`

结果：

- 注册成功，返回 access/refresh token
- profile 成功写入并返回 BMR/TDEE/每日热量目标
- plan / recipe / summary / report 均成功返回结构化 JSON

这证明：**核心 API 业务流在内存模式下是通的**。

## 5. 当前状态分类

### 可用 now（演示级）

- 邮箱注册登录
- Profile 录入
- 饮食计划生成
- 每日食谱生成
- 体重记录
- 每日总结 / 周报
- 基本后台统计接口

### 部分完成

- 前端页面体系
- AI 配置管理
- 食物拍照分析
- 购物清单
- 成就系统
- 管理后台
- 导出能力

### 明显缺失

- 手机号登录
- 微信登录
- Google 登录
- 忘记密码完整后端流程
- 可持续运行的持久化数据层
- 一键工作区运行体验

### 明显损坏 / 不满足预期

- 安装流程对 pnpm 版本敏感但没有明确说明
- 在本轮修复前，web/admin 的 API URL 只能连 `localhost:3002`
- 后端数据重启即丢失，不满足计划中的产品形态

## 6. 优先级排序后的完成计划

### P0（最高优先级）

1. **把核心后端流程从内存实现切换到真实 PostgreSQL/Drizzle 持久化**
   - 先覆盖：auth、profile、plan、tracking、recipe
   - 原因：这是当前“演示品”与“可用产品”之间最大的断层

2. **补齐一个可靠的开发运行入口**
   - ✅ 已完成第一步：`pnpm start:all` 可同时启动 server/web/admin
   - 下一步应补充 README / 环境变量说明，保证新接手者按文档完成 install + start

3. **继续消除环境耦合配置**
   - 本轮已修复 web/admin 的 API base URL 硬编码
   - 下一步应补 package manager 版本声明、`.env.example`、启动文档

### P1

4. **把 Web 端主路径和持久化后的 API 再做一次联调**
   - 登录 → profile → plan → recipe → tracking → summary

5. **清理最明显的伪完成项**
   - 登录页中的手机号 / 微信 / Google 按钮
   - 忘记密码页面
   - 后台硬编码 admin 入口

### P2

6. **替换关键 AI mock 为真实可配置 provider 流程**
7. **验证并修复 Docker / 部署链路**
8. **继续补齐计划中的扩展能力（通知、更多后台能力、完整导出等）**

## 7. 单一最高优先级建议

**建议立刻优先做：核心后端持久化（auth/profile/plan/tracking/recipe 接 PostgreSQL/Drizzle）。**

### 为什么这是最高优先级

因为命令证据表明：

- `pnpm typecheck` / `test` / `build` 都已通过
- server 也能启动
- 核心 API 主流程已经能在内存模式下跑通

这说明项目**不是“完全不能用”**，而是已经到了“功能表面存在，但底层还是临时存储”的阶段。

当前最限制“可用状态”的，不是页面数量，也不是测试数量，而是：

- 数据无法持久化
- token / profile / 计划重启即失效
- 与原计划中的 PostgreSQL 架构脱节

只要不先解决这个问题，后续继续补 OAuth、后台、Docker、前端细节，都会建立在临时状态之上，返工风险最高。

### 建议的执行顺序（最小、安全、渐进）

1. 先把 `auth` 和 `user/profile` 落库
2. 再迁移 `plan`
3. 再迁移 `tracking`
4. 最后迁移 `recipe / summary / report`
5. 持久化主链路稳定后，补全文档和 Docker 运行说明

这样可以先稳定“登录 → 资料 → 计划”主链路，再处理派生能力，风险最小。

## 8. 审计结论

Tang 目前不是一个空项目，也不是纯脚手架；它已经具备了一个 **“AI 饮食助手 MVP 演示版”** 的大部分表层能力。

但它距离 `.sisyphus` 计划中的“可持续运行、可部署、可交付”的目标，仍卡在一个关键断层上：**核心业务仍未落到真实持久化后端上**。
