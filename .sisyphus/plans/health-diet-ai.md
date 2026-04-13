# 健康饮食 AI 助手 — Tang (唐) 工作计划

## TL;DR

> **Quick Summary**: 构建一个全栈 Web 应用（React + Node.js + PostgreSQL），通过 AI 为用户生成个性化中式饮食计划、每日食谱、营养分析和健康追踪。架构设计优先考虑未来 React Native 迁移能力。
>
> **Deliverables**:
>
> - 响应式 Web 应用（手机 + 桌面自适应）
> - RESTful API 后端服务
> - 管理后台
> - Docker 容器化部署配置
> - 核心模块自动化测试
>
> **Estimated Effort**: XL（大型项目，40+ 任务）
> **Parallel Execution**: YES — 5 waves
> **Critical Path**: 项目脚手架 → 数据模型 → 认证系统 → AI 集成 → 核心功能 → 集成测试

---

## Context

### Original Request

用户希望构建一个 Web 应用，能够根据用户的性别、年龄、身高、体重等信息，使用 AI 生成个性化的长期饮食计划和中式食谱。包含登录注册、第三方登录、每日打卡、体重记录、AI 拍照分析热量等功能。代码架构需要方便后期迁移到 Android/iOS App。

### Interview Summary

**Key Discussions**:

- **技术栈**: React + Node.js + PostgreSQL + Docker，面向 React Native 迁移
- **认证**: 邮箱/密码注册 + 微信登录 + Google 登录 + 手机号验证码
- **AI**: OpenAI 兼容协议，平台默认 + 用户自带 Key 双模式
- **食谱**: AI 实时生成中式菜谱 + 用户收藏库，支持一键换食谱
- **场景**: 自己做饭（详细食谱） + 外出记录（AI 估算热量）
- **激励**: 连续打卡 + 成就徽章 + 进度可视化 + AI 励志反馈
- **补充功能**: 过敏管理、购物清单、营养分析、健康报告、通知提醒、数据导出
- **后台**: 简单管理后台
- **语言**: 中文优先 + 预留 i18n
- **付费**: 暂不做 + 预留架构

### Metis Review

**Identified Gaps** (addressed):

- **API 设计规范**: 采用 RESTful API-first 设计，使用 OpenAPI 规范，确保前后端解耦和 RN 迁移
- **AI 安全防护**: 添加 AI 输出验证层，防止不合理的营养建议（如极端低卡路里）
- **数据隐私**: 健康数据加密存储，敏感字段脱敏，符合基本数据保护要求
- **AI 成本控制**: 添加速率限制和用量追踪，防止 API 调用费用失控
- **冲突解决**: 多设备同步采用 last-write-wins + 版本号策略
- **AI 幻觉防护**: 营养数据需要与基础数据库交叉验证
- **单位标准化**: 后端统一使用公制单位，前端按需转换

---

## Work Objectives

### Core Objective

构建一个以 AI 为核心的全栈健康饮食管理 Web 应用，面向中国用户，提供个性化中式饮食计划、食谱生成、营养追踪和健康管理功能。

### Concrete Deliverables

- `/apps/web` — React 前端应用（响应式，手机+桌面）
- `/apps/server` — Node.js RESTful API 后端
- `/apps/admin` — 管理后台
- `/packages/shared` — 共享类型、工具函数、业务逻辑（为 RN 迁移准备）
- `/docker-compose.yml` — 完整的容器化部署配置
- 核心模块自动化测试覆盖

### Definition of Done

- [ ] 用户可以注册、登录（邮箱 + 手机号 + 微信 + Google）
- [ ] 用户可以填写个人信息并获得 AI 生成的饮食计划
- [ ] AI 生成的食谱包含中式食材、做法和营养信息
- [ ] 用户可以每日记录体重和打卡餐食
- [ ] 用户可以拍照上传食物获得热量估算
- [ ] 激励系统正常运作（打卡天数、徽章、进度图表）
- [ ] 管理后台可以查看用户数据和配置 AI
- [ ] 所有页面在手机和桌面端正常显示
- [ ] Docker 一键部署可用
- [ ] 核心模块测试通过

### Must Have

- API-first 架构设计，前后端完全解耦
- 共享业务逻辑层（`packages/shared`），不依赖任何 Web/RN 特定 API
- 所有 AI 调用通过统一的 Service 层，支持 baseURL/apiKey/model 配置
- 食谱内容必须是真实中国菜系（川菜、粤菜、苏菜等），食材用中文名称，计量用中式习惯（克、两、勺）
- 响应式设计（Mobile-first），断点覆盖手机（<768px）、平板（768-1024px）、桌面（>1024px）
- 所有 API 端点带认证和权限检查
- 健康数据加密存储

### Must NOT Have (Guardrails)

- ❌ 不做实际的 React Native App（只准备架构）
- ❌ 不做实际的支付/订阅系统（只预留接口）
- ❌ 不做社交功能（分享、社区、评论）
- ❌ 不做运动/健身计划（纯饮食）
- ❌ 不做营养师人工咨询
- ❌ 不使用 SSR 渲染（CSR + API 模式，方便迁移 RN）
- ❌ 前端不直接调用数据库（必须通过 API）
- ❌ AI 相关代码不硬编码 prompt（必须可配置）
- ❌ 不在前端存储 API Key（必须通过后端代理）
- ❌ 不过度抽象（YAGNI 原则，只在有明确复用需求时抽象）
- ❌ 不添加过多注释（代码自解释，只在复杂业务逻辑处注释）

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision

- **Infrastructure exists**: NO（全新项目）
- **Automated tests**: YES — 核心模块测试（auth, AI service, data models, API endpoints）
- **Framework**: Vitest（前端 + 共享包） + Supertest（API 集成测试）
- **Setup**: Wave 1 包含测试框架搭建

### QA Policy

Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Frontend/UI**: Use Playwright — Navigate, interact, assert DOM, screenshot
- **API/Backend**: Use Bash (curl) — Send requests, assert status + response fields
- **Library/Module**: Use Bash (node/ts-node) — Import, call functions, compare output

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — 项目脚手架 + 基础设施):
├── Task 1:  Monorepo 项目脚手架 + 工具链配置 [quick]
├── Task 2:  共享类型定义 (packages/shared/types) [quick]
├── Task 3:  数据库 Schema + ORM 配置 (Drizzle) [quick]
├── Task 4:  测试框架搭建 (Vitest + Supertest) [quick]
├── Task 5:  Docker 基础配置 [quick]
├── Task 6:  i18n 框架搭建 [quick]
└── Task 7:  UI 设计系统 (组件库基础) [visual-engineering]

Wave 2 (Core Services — 核心后端服务):
├── Task 8:  认证系统后端 — 邮箱/密码 + JWT (depends: 2, 3) [deep]
├── Task 9:  手机号验证码登录 (depends: 8) [unspecified-high]
├── Task 10: 微信 OAuth 登录 (depends: 8) [unspecified-high]
├── Task 11: Google OAuth 登录 (depends: 8) [unspecified-high]
├── Task 12: 用户 Profile CRUD API (depends: 2, 3) [quick]
├── Task 13: AI Service 统一抽象层 (depends: 2) [deep]
├── Task 14: AI 配置管理 API — baseURL/apiKey/model (depends: 3, 13) [unspecified-high]
└── Task 15: 文件上传服务 — 图片存储 (depends: 3) [unspecified-high]

Wave 3 (AI Features — AI 驱动功能):
├── Task 16: AI 饮食计划生成 (depends: 13, 12) [deep]
├── Task 17: AI 每日食谱生成 — 中式菜谱 (depends: 16) [deep]
├── Task 18: AI 拍照食物热量分析 (depends: 13, 15) [deep]
├── Task 19: AI 每日总结 + 次日规划 (depends: 16, 22) [deep]
├── Task 20: 食谱收藏 + 一键换食谱 API (depends: 17) [unspecified-high]
├── Task 21: 根据现有食材生成食谱 (depends: 13) [unspecified-high]
├── Task 22: 体重记录 + 餐食打卡 API (depends: 3, 12) [unspecified-high]
├── Task 23: 食物过敏/禁忌管理 API (depends: 12) [quick]
└── Task 24: 自动购物清单 API (depends: 17) [unspecified-high]

Wave 4 (Frontend — 前端页面):
├── Task 25: 登录注册页面 (depends: 7, 8-11) [visual-engineering]
├── Task 26: 用户 Profile 设置页面 (depends: 7, 12, 23) [visual-engineering]
├── Task 27: AI 饮食计划主页面 (depends: 7, 16, 17) [visual-engineering]
├── Task 28: 每日食谱详情页 + 做法步骤 (depends: 7, 17, 20) [visual-engineering]
├── Task 29: 食物拍照分析页面 (depends: 7, 18) [visual-engineering]
├── Task 30: 体重记录 + 打卡页面 (depends: 7, 22) [visual-engineering]
├── Task 31: 进度可视化 — 体重曲线 + 营养图表 (depends: 7, 22, 17) [visual-engineering]
├── Task 32: 激励系统 — 打卡天数 + 成就徽章 (depends: 22) [deep]
├── Task 33: AI 励志反馈 + 每日总结页面 (depends: 7, 19, 32) [visual-engineering]
├── Task 34: 购物清单页面 (depends: 7, 24) [visual-engineering]
├── Task 35: 营养素分布分析页面 (depends: 7, 17) [visual-engineering]
├── Task 36: 外出就餐记录页面 (depends: 7, 18) [visual-engineering]
├── Task 37: AI 配置设置页面 (depends: 7, 14) [visual-engineering]
├── Task 38: 推送通知/提醒系统 (depends: 8) [unspecified-high]
└── Task 39: 数据导出功能 (depends: 12, 22, 17) [quick]

Wave 5 (Admin + Polish — 管理后台 + 收尾):
├── Task 40: 管理后台 — 用户管理 (depends: 8, 12) [visual-engineering]
├── Task 41: 管理后台 — AI 配置 + 数据统计 (depends: 14, 22) [visual-engineering]
├── Task 42: 周/月健康报告 — AI 生成 (depends: 19, 31) [deep]
├── Task 43: 全局错误处理 + Loading 状态 (depends: 25-39) [unspecified-high]
├── Task 44: 响应式设计验证 + 适配优化 (depends: 25-39) [visual-engineering]
├── Task 45: Docker Compose 完整部署配置 (depends: all) [quick]
└── Task 46: 端到端集成测试 (depends: all) [deep]

Wave FINAL (After ALL tasks — 4 parallel reviews, then user okay):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)
-> Present results -> Get explicit user okay

Critical Path: T1 → T3 → T8 → T13 → T16 → T17 → T27 → T44 → F1-F4 → user okay
Parallel Speedup: ~65% faster than sequential
Max Concurrent: 9 (Wave 4)
```

### Dependency Matrix

| Task  | Depends On | Blocks             | Wave |
| ----- | ---------- | ------------------ | ---- |
| 1     | -          | 2-7, all           | 1    |
| 2     | 1          | 8, 12, 13          | 1    |
| 3     | 1          | 8, 12, 14, 15, 22  | 1    |
| 4     | 1          | testing tasks      | 1    |
| 5     | 1          | 45                 | 1    |
| 6     | 1          | all frontend       | 1    |
| 7     | 1          | 25-37, 40-41, 44   | 1    |
| 8     | 2, 3       | 9-11, 25, 38, 40   | 2    |
| 9     | 8          | 25                 | 2    |
| 10    | 8          | 25                 | 2    |
| 11    | 8          | 25                 | 2    |
| 12    | 2, 3       | 16, 23, 26, 39     | 2    |
| 13    | 2          | 14, 16-18, 21      | 2    |
| 14    | 3, 13      | 37, 41             | 2    |
| 15    | 3          | 18, 29             | 2    |
| 16    | 13, 12     | 17, 19, 27         | 3    |
| 17    | 16         | 20, 24, 28, 31, 35 | 3    |
| 18    | 13, 15     | 29, 36             | 3    |
| 19    | 16, 22     | 33, 42             | 3    |
| 20    | 17         | 28                 | 3    |
| 21    | 13         | 28                 | 3    |
| 22    | 3, 12      | 19, 30, 31, 32, 39 | 3    |
| 23    | 12         | 26                 | 3    |
| 24    | 17         | 34                 | 3    |
| 25-39 | varies     | 43, 44             | 4    |
| 40-46 | varies     | F1-F4              | 5    |

### Agent Dispatch Summary

- **Wave 1**: **7 tasks** — T1-T6 → `quick`, T7 → `visual-engineering`
- **Wave 2**: **8 tasks** — T8, T13 → `deep`, T9-T11, T14, T15 → `unspecified-high`, T12 → `quick`
- **Wave 3**: **9 tasks** — T16-T19, T21 → `deep`, T20, T22, T24 → `unspecified-high`, T23 → `quick`
- **Wave 4**: **15 tasks** — T25-T31, T33-T37, T44 → `visual-engineering`, T32 → `deep`, T38 → `unspecified-high`, T39 → `quick`
- **Wave 5**: **7 tasks** — T40-T41, T44 → `visual-engineering`, T42, T46 → `deep`, T43 → `unspecified-high`, T45 → `quick`
- **FINAL**: **4 tasks** — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

### Wave 1 — Foundation (项目脚手架 + 基础设施)

- [x] 1. Monorepo 项目脚手架 + 工具链配置

  **What to do**:
  - 使用 pnpm workspace 创建 monorepo 结构：
    ```
    tang/
    ├── apps/
    │   ├── web/          # React SPA (Vite + React 18)
    │   ├── server/       # Node.js + Express API
    │   └── admin/        # React SPA 管理后台 (Vite + React 18)
    ├── packages/
    │   └── shared/       # 共享类型 + 工具函数 + 业务逻辑
    ├── pnpm-workspace.yaml
    ├── package.json
    ├── tsconfig.base.json
    └── .eslintrc.js
    ```
  - 配置 TypeScript（strict mode）、ESLint、Prettier
  - 配置路径别名（`@tang/shared`, `@tang/web` 等）
  - 确保 `packages/shared` 可被所有 apps 引用
  - 使用 Vite 作为前端构建工具（不用 Next.js，CSR 模式方便 RN 迁移）
  - 后端使用 Express + ts-node-dev 开发
  - 配置 `.env.example` 模板文件

  **Must NOT do**:
  - 不使用 Next.js（需要 CSR 模式）
  - 不在此任务安装业务相关依赖（只装工具链）
  - 不创建业务代码文件

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 项目脚手架是标准化工作，模式固定
  - **Skills**: [`playwright`]
    - `playwright`: QA 验证需要检查构建输出
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: 本任务无 UI 设计内容

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (standalone — 其他 Wave 1 任务都依赖本任务)
  - **Blocks**: Tasks 2, 3, 4, 5, 6, 7 and all subsequent
  - **Blocked By**: None (can start immediately)
  - **NOTE**: 本任务必须是 Wave 1 中最先执行的，其余 Wave 1 任务在此完成后并行

  **References**:

  **Pattern References**:
  - 无（全新项目）

  **External References**:
  - pnpm workspace 文档: https://pnpm.io/workspaces
  - Vite React 模板: https://vitejs.dev/guide/
  - TypeScript monorepo 配置: https://www.typescriptlang.org/docs/handbook/project-references.html

  **Acceptance Criteria**:
  - [ ] `pnpm install` 成功执行，无错误
  - [ ] `pnpm --filter @tang/web dev` 启动 Vite 开发服务器
  - [ ] `pnpm --filter @tang/server dev` 启动 Express 开发服务器
  - [ ] `pnpm --filter @tang/admin dev` 启动管理后台开发服务器
  - [ ] `packages/shared` 中导出的类型可以在 `apps/web` 中引用
  - [ ] `tsc --noEmit` 无错误

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Monorepo 构建验证
    Tool: Bash
    Preconditions: 项目根目录存在
    Steps:
      1. Run `pnpm install` — Expected: exit code 0
      2. Run `pnpm --filter @tang/shared build` — Expected: exit code 0
      3. Run `tsc --noEmit` — Expected: exit code 0, no errors
      4. Run `pnpm --filter @tang/web build` — Expected: dist/ directory created
      5. Run `pnpm --filter @tang/server build` — Expected: dist/ directory created
    Expected Result: All builds succeed with exit code 0
    Failure Indicators: non-zero exit code, TypeScript errors, missing dist/
    Evidence: .sisyphus/evidence/task-1-monorepo-build.txt

  Scenario: 跨包引用验证
    Tool: Bash
    Preconditions: packages/shared 中有导出的类型
    Steps:
      1. 在 packages/shared/src/index.ts 中创建并导出 `export type TestType = { id: string }`
      2. 在 apps/web/src/test-import.ts 中 `import type { TestType } from '@tang/shared'`
      3. Run `tsc --noEmit` — Expected: no errors
    Expected Result: 跨包类型引用无 TypeScript 错误
    Failure Indicators: "Cannot find module '@tang/shared'" error
    Evidence: .sisyphus/evidence/task-1-cross-package.txt
  ```

  **Commit**: YES
  - Message: `chore(init): monorepo scaffolding with pnpm workspace`
  - Files: `pnpm-workspace.yaml, package.json, tsconfig.base.json, apps/*, packages/*`
  - Pre-commit: `tsc --noEmit`

- [x] 2. 共享类型定义 (packages/shared/types)

  **What to do**:
  - 在 `packages/shared/src/types/` 下定义所有共享类型：
    - `user.ts` — User, UserProfile, Gender, UserGoal, DietaryRestriction
    - `auth.ts` — LoginRequest, RegisterRequest, AuthResponse, TokenPayload
    - `plan.ts` — DietPlan, DailyPlan, MealType(早餐/午餐/晚餐/加餐), PlanStatus
    - `recipe.ts` — Recipe, Ingredient, CookingStep, CuisineType(川菜/粤菜/苏菜等), NutritionInfo
    - `tracking.ts` — WeightEntry, MealCheckIn, CheckInStatus
    - `achievement.ts` — Achievement, Badge, AchievementType, Streak
    - `shopping.ts` — ShoppingList, ShoppingItem
    - `ai.ts` — AIConfig, AIProvider, AIRequest, AIResponse, ChatMessage
    - `report.ts` — WeeklyReport, MonthlyReport, NutritionSummary
    - `common.ts` — PaginatedResponse, ApiResponse, ErrorCode
  - 所有类型使用 TypeScript interface/type（不用 class）
  - 导出统一入口 `packages/shared/src/types/index.ts`
  - 食材和菜系类型必须包含中文标签

  **Must NOT do**:
  - 不实现任何业务逻辑
  - 不引入运行时依赖
  - 不使用 class（纯类型定义）

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 纯类型定义，无业务逻辑
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 3-7, after Task 1)
  - **Blocks**: Tasks 8, 12, 13
  - **Blocked By**: Task 1

  **References**:

  **External References**:
  - TypeScript handbook interfaces: https://www.typescriptlang.org/docs/handbook/2/objects.html

  **WHY Each Reference Matters**:
  - 用 interface 而非 class 确保类型定义是零运行时成本的，适合跨包共享和 RN 迁移

  **Acceptance Criteria**:
  - [ ] `tsc --noEmit` 在 packages/shared 无错误
  - [ ] 所有类型文件导出 ≥3 个类型
  - [ ] `packages/shared/src/types/index.ts` 统一导出所有类型
  - [ ] 中文菜系类型包含至少 8 大菜系

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: 类型完整性验证
    Tool: Bash
    Preconditions: packages/shared 已构建
    Steps:
      1. Run `tsc --noEmit` in packages/shared — Expected: exit code 0
      2. Run `grep -r "export " packages/shared/src/types/ | wc -l` — Expected: ≥ 30 exports
      3. Verify CuisineType includes '川菜' by grep — Expected: found
    Expected Result: 所有类型文件编译通过，导出数量充足
    Failure Indicators: TypeScript errors, missing type files, < 30 exports
    Evidence: .sisyphus/evidence/task-2-types-check.txt

  Scenario: 类型在 apps/web 中可用
    Tool: Bash
    Preconditions: Task 1 完成
    Steps:
      1. 创建 apps/web/src/type-test.ts 引用 `import type { User, Recipe, DietPlan } from '@tang/shared'`
      2. Run `tsc --noEmit` — Expected: no errors
    Expected Result: 共享类型可跨包无错引用
    Failure Indicators: "Cannot find module" or type errors
    Evidence: .sisyphus/evidence/task-2-cross-import.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `feat(shared): define core shared types for user, recipe, plan, tracking`
  - Files: `packages/shared/src/types/*`
  - Pre-commit: `tsc --noEmit`

- [x] 3. 数据库 Schema + ORM 配置 (Drizzle ORM)

  **What to do**:
  - 安装配置 Drizzle ORM + drizzle-kit + pg driver
  - 在 `apps/server/src/db/` 下创建：
    - `connection.ts` — 数据库连接配置（从环境变量读取）
    - `schema/users.ts` — users 表（id, email, phone, password_hash, wechat_openid, google_id, role, created_at, updated_at）
    - `schema/profiles.ts` — user_profiles 表（user_id, gender, age, height_cm, weight_kg, goal, dietary_restrictions JSON, allergies JSON）
    - `schema/plans.ts` — diet_plans 表（id, user_id, goal, duration_days, status, ai_config_snapshot JSON, created_at）
    - `schema/recipes.ts` — recipes 表（id, plan_id, date, meal_type, title, cuisine_type, ingredients JSON, steps JSON, nutrition JSON, is_favorite）
    - `schema/tracking.ts` — weight_entries 表 + meal_check_ins 表
    - `schema/achievements.ts` — achievements 表 + user_achievements 表
    - `schema/shopping.ts` — shopping_lists 表 + shopping_items 表
    - `schema/ai_configs.ts` — ai_configs 表（user_id, base_url, encrypted_api_key, model, is_custom）
    - `schema/index.ts` — 统一导出
  - 配置 drizzle-kit 迁移生成
  - 创建初始迁移文件
  - 所有敏感字段（api_key）需要加密处理设计

  **Must NOT do**:
  - 不使用 Prisma（Drizzle 更轻量，适合迁移）
  - 不在 schema 中硬编码数据
  - 不跳过 migration 直接 push

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 数据库 schema 定义模式固定
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 4-7, after Task 1)
  - **Blocks**: Tasks 8, 12, 14, 15, 22
  - **Blocked By**: Task 1

  **References**:

  **External References**:
  - Drizzle ORM 文档: https://orm.drizzle.team/docs/overview
  - Drizzle PostgreSQL schema: https://orm.drizzle.team/docs/column-types/pg

  **Acceptance Criteria**:
  - [ ] `tsc --noEmit` 在 apps/server 无错误
  - [ ] `npx drizzle-kit generate` 生成迁移文件
  - [ ] 所有表 schema 已定义（≥9 个表）
  - [ ] 关联关系正确（user_id 外键等）

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Schema 编译 + 迁移生成
    Tool: Bash
    Preconditions: PostgreSQL 无需运行（仅验证 schema 定义）
    Steps:
      1. Run `tsc --noEmit` in apps/server — Expected: exit code 0
      2. Run `npx drizzle-kit generate` — Expected: migration SQL files created in drizzle/ folder
      3. Count schema files: `ls apps/server/src/db/schema/*.ts | wc -l` — Expected: ≥ 9
    Expected Result: Schema 编译通过，迁移文件成功生成
    Failure Indicators: TypeScript errors, drizzle-kit errors, missing schema files
    Evidence: .sisyphus/evidence/task-3-schema-migration.txt

  Scenario: Schema 关系验证
    Tool: Bash
    Preconditions: Schema 文件已创建
    Steps:
      1. Grep for "references" in schema files — Expected: ≥ 5 foreign key references
      2. Verify users table has columns: id, email, phone, password_hash, wechat_openid, google_id
    Expected Result: 外键关系正确定义，核心字段存在
    Failure Indicators: missing references, missing columns
    Evidence: .sisyphus/evidence/task-3-schema-relations.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `feat(db): database schema with Drizzle ORM for all core tables`
  - Files: `apps/server/src/db/*`
  - Pre-commit: `tsc --noEmit`

- [x] 4. 测试框架搭建 (Vitest + Supertest)

  **What to do**:
  - 安装 Vitest 作为所有包的测试框架
  - 配置 `vitest.config.ts`（每个 app/package 独立配置 + 根 workspace 配置）
  - 安装 Supertest 用于 API 集成测试
  - 安装 `@testing-library/react` 用于前端组件测试
  - 创建测试工具：
    - `packages/shared/src/test-utils/` — 通用 mock 工厂（createMockUser, createMockRecipe 等）
    - `apps/server/src/test-utils/` — API 测试辅助（createTestApp, authenticatedRequest 等）
  - 创建示例测试确保框架可用
  - 配置 `package.json` scripts: `test`, `test:watch`, `test:coverage`

  **Must NOT do**:
  - 不使用 Jest（Vitest 更快，原生 ESM）
  - 不编写业务测试（只搭框架 + 示例）

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 测试框架配置是标准化工作
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 5-7, after Task 1)
  - **Blocks**: 所有需要写测试的任务
  - **Blocked By**: Task 1

  **References**:

  **External References**:
  - Vitest 文档: https://vitest.dev/guide/
  - Supertest: https://github.com/ladderjs/supertest

  **Acceptance Criteria**:
  - [ ] `pnpm test` 在根目录运行所有测试
  - [ ] 示例测试通过（≥1 per workspace）
  - [ ] mock 工厂函数可在任意包中使用
  - [ ] `pnpm test:coverage` 生成覆盖率报告

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: 测试框架可用性验证
    Tool: Bash
    Preconditions: Task 1 完成
    Steps:
      1. Run `pnpm test` — Expected: exit code 0, ≥ 3 tests pass
      2. Run `pnpm test:coverage` — Expected: coverage report generated
      3. Verify mock factories exist: `ls packages/shared/src/test-utils/` — Expected: files exist
    Expected Result: 测试可运行，覆盖率可生成
    Failure Indicators: test failures, missing config, no coverage output
    Evidence: .sisyphus/evidence/task-4-test-framework.txt

  Scenario: API 测试辅助验证
    Tool: Bash
    Preconditions: apps/server 可构建
    Steps:
      1. 验证 supertest 已安装: `pnpm --filter @tang/server list | grep supertest`
      2. 运行 server 示例测试: `pnpm --filter @tang/server test`
    Expected Result: API 测试辅助工具可用
    Failure Indicators: supertest not found, test failures
    Evidence: .sisyphus/evidence/task-4-api-test-utils.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `chore(test): Vitest + Supertest testing framework setup`
  - Files: `vitest.config.ts, vitest.workspace.ts, */test-utils/*`
  - Pre-commit: `pnpm test`

- [ ] 5. Docker 基础配置

  **What to do**:
  - 创建 `Dockerfile` for each app:
    - `apps/web/Dockerfile` — 多阶段构建：build → nginx 静态服务
    - `apps/server/Dockerfile` — 多阶段构建：build → node 运行
    - `apps/admin/Dockerfile` — 多阶段构建：build → nginx 静态服务
  - 创建 `docker-compose.yml`（开发环境）:
    - PostgreSQL 服务
    - Redis 服务（用于 session/cache）
    - Web 前端
    - API 后端
    - Admin 后台
  - 创建 `docker-compose.prod.yml`（生产环境增量配置）
  - 创建 `.dockerignore` 文件
  - 创建 `nginx.conf` 模板（前端 SPA 路由支持）
  - 环境变量配置说明

  **Must NOT do**:
  - 不配置 CI/CD（后续任务）
  - 不配置 HTTPS（部署环境特定）

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Docker 配置模式标准化
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2-4, 6-7, after Task 1)
  - **Blocks**: Task 45
  - **Blocked By**: Task 1

  **References**:

  **External References**:
  - Docker 多阶段构建: https://docs.docker.com/build/building/multi-stage/
  - Nginx SPA 配置: https://nginx.org/en/docs/

  **Acceptance Criteria**:
  - [ ] 每个 app 有独立的 Dockerfile
  - [ ] `docker compose build` 成功（不需要运行）
  - [ ] docker-compose.yml 包含 postgres + redis + 3 apps
  - [ ] `.dockerignore` 排除 node_modules, dist 等

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Docker 配置文件完整性
    Tool: Bash
    Preconditions: Task 1 完成
    Steps:
      1. Verify files exist: apps/web/Dockerfile, apps/server/Dockerfile, apps/admin/Dockerfile
      2. Verify docker-compose.yml exists and contains 5 services
      3. Run `docker compose config` — Expected: valid configuration output
    Expected Result: Docker 配置文件完整且语法正确
    Failure Indicators: missing files, docker compose config errors
    Evidence: .sisyphus/evidence/task-5-docker-config.txt

  Scenario: Docker 构建验证
    Tool: Bash
    Preconditions: Docker daemon running
    Steps:
      1. Run `docker compose build` — Expected: all images built successfully
    Expected Result: 所有 Docker 镜像构建成功
    Failure Indicators: build errors, missing dependencies
    Evidence: .sisyphus/evidence/task-5-docker-build.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `chore(docker): Docker multi-stage build + compose configuration`
  - Files: `Dockerfile*, docker-compose*.yml, nginx.conf, .dockerignore`
  - Pre-commit: `docker compose config`

- [x] 6. i18n 框架搭建

  **What to do**:
  - 安装 `react-i18next` + `i18next`
  - 在 `packages/shared/src/i18n/` 创建：
    - `locales/zh-CN.json` — 中文翻译文件（初始包含通用 UI 词汇）
    - `locales/en-US.json` — 英文翻译文件（占位，只写少量示例）
    - `config.ts` — i18n 配置（默认中文，fallback 英文）
    - `useTranslation.ts` — 封装 hook（方便后续 RN 迁移可替换实现）
  - 在 `apps/web` 中集成 i18n provider
  - 翻译文件 key 使用 namespace 分组（common, auth, plan, recipe, tracking 等）

  **Must NOT do**:
  - 不翻译所有 UI 文本（只建立框架 + 示例）
  - 不做语言切换 UI（架构预留即可）

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: i18n 框架配置是标准化工作
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2-5, 7, after Task 1)
  - **Blocks**: 所有前端页面任务
  - **Blocked By**: Task 1

  **References**:

  **External References**:
  - react-i18next: https://react.i18next.com/
  - i18next namespaces: https://www.i18next.com/principles/namespaces

  **Acceptance Criteria**:
  - [ ] `import { useTranslation } from '@tang/shared/i18n'` 可用
  - [ ] zh-CN.json 包含 ≥ 5 个 namespace
  - [ ] en-US.json 结构与 zh-CN.json 一致
  - [ ] `tsc --noEmit` 无错误

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: i18n 翻译加载验证
    Tool: Bash
    Preconditions: packages/shared 可构建
    Steps:
      1. Run `tsc --noEmit` — Expected: no errors
      2. Verify zh-CN.json is valid JSON: `node -e "JSON.parse(require('fs').readFileSync('packages/shared/src/i18n/locales/zh-CN.json'))"` — Expected: no error
      3. Count namespaces in zh-CN.json — Expected: ≥ 5
    Expected Result: 翻译文件有效，namespace 数量充足
    Failure Indicators: JSON parse errors, < 5 namespaces
    Evidence: .sisyphus/evidence/task-6-i18n-setup.txt

  Scenario: 缺少翻译 key 检测
    Tool: Bash
    Preconditions: en-US.json 和 zh-CN.json 都存在
    Steps:
      1. Compare key count between zh-CN.json and en-US.json — Expected: same structure
    Expected Result: 两个语言文件有相同的 key 结构
    Failure Indicators: key 数量不匹配
    Evidence: .sisyphus/evidence/task-6-i18n-keys.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `feat(i18n): internationalization framework with zh-CN default`
  - Files: `packages/shared/src/i18n/*`
  - Pre-commit: `tsc --noEmit`

- [ ] 7. UI 设计系统 (组件库基础)

  **What to do**:
  - 安装 Tailwind CSS v4 + 配置
  - 安装 shadcn/ui 初始化 + 配置中文主题
  - 创建 `packages/shared/src/ui/` 组件库：
    - 基础组件：Button, Input, Card, Modal, Toast, Avatar, Badge, Tabs, Select, DatePicker
    - 布局组件：AppLayout, MobileNav, DesktopSidebar, PageContainer, ResponsiveGrid
    - 表单组件：FormField, FormGroup, PasswordInput, PhoneInput
    - 数据展示：DataCard, StatCard, ProgressBar, ChartContainer
  - 定义设计 tokens：
    - 颜色系统（主色调绿色系，契合健康主题）
    - 响应式断点（mobile: <768px, tablet: 768-1024px, desktop: >1024px）
    - 间距、圆角、阴影统一变量
  - Mobile-first 响应式设计
  - 所有组件支持 className prop 扩展
  - 组件不依赖路由或状态管理（纯展示 + 事件回调）

  **Must NOT do**:
  - 不创建业务组件（只做通用 UI 组件）
  - 不安装 Material UI 或 Ant Design（用 Tailwind + shadcn 保持轻量）
  - 不实现暗色模式（后续可扩展）

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI 组件库设计需要视觉工程能力
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: UI 组件设计和响应式布局

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2-6, after Task 1)
  - **Blocks**: Tasks 25-37, 40-41, 44
  - **Blocked By**: Task 1

  **References**:

  **External References**:
  - Tailwind CSS: https://tailwindcss.com/docs
  - shadcn/ui: https://ui.shadcn.com/docs
  - Mobile-first responsive: https://tailwindcss.com/docs/responsive-design

  **Acceptance Criteria**:
  - [ ] `tsc --noEmit` 无错误
  - [ ] Tailwind 配置包含自定义主题色
  - [ ] ≥ 15 个组件文件
  - [ ] 每个组件支持 className prop
  - [ ] AppLayout 在 320px/768px/1440px 宽度下正确渲染

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: 组件库构建验证
    Tool: Bash
    Preconditions: Task 1 完成
    Steps:
      1. Run `tsc --noEmit` — Expected: exit code 0
      2. Count component files: `find packages/shared/src/ui -name "*.tsx" | wc -l` — Expected: ≥ 15
      3. Verify each component exports a default or named export
    Expected Result: 所有组件编译通过
    Failure Indicators: TypeScript errors, < 15 components
    Evidence: .sisyphus/evidence/task-7-ui-build.txt

  Scenario: 响应式布局验证
    Tool: Playwright
    Preconditions: apps/web dev server running with a test page importing AppLayout
    Steps:
      1. Navigate to http://localhost:5173/test-layout
      2. Set viewport to 375x812 (iPhone) — Assert: MobileNav visible, DesktopSidebar hidden
      3. Set viewport to 1440x900 (Desktop) — Assert: DesktopSidebar visible, MobileNav hidden
      4. Screenshot at both viewports
    Expected Result: 布局在手机和桌面正确切换
    Failure Indicators: Both nav visible, layout overflow, content hidden
    Evidence: .sisyphus/evidence/task-7-responsive-mobile.png, .sisyphus/evidence/task-7-responsive-desktop.png
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `feat(ui): design system with Tailwind + shadcn base components`
  - Files: `packages/shared/src/ui/*, tailwind.config.*`
  - Pre-commit: `tsc --noEmit`

### Wave 2 — Core Services (核心后端服务)

- [x] 8. 认证系统后端 — 邮箱/密码 + JWT

  **What to do**:
  - 在 `apps/server/src/modules/auth/` 创建：
    - `auth.controller.ts` — POST /api/auth/register, POST /api/auth/login, POST /api/auth/refresh, POST /api/auth/logout, GET /api/auth/me
    - `auth.service.ts` — 注册（邮箱+密码哈希 bcrypt）、登录、JWT 生成/验证、refresh token 轮转
    - `auth.middleware.ts` — JWT 验证中间件（extractToken → verify → attach user to req）
    - `auth.validator.ts` — 请求体验证（zod schema: email格式, 密码强度 ≥8位）
  - JWT 策略：access token (15min) + refresh token (7d, 存DB)
  - 密码使用 bcrypt 哈希（salt rounds = 12）
  - 统一错误响应格式：`{ code: string, message: string, details?: any }`
  - 中间件支持可选认证（某些端点不强制）
  - 编写测试：注册流程、登录流程、token 刷新、无效 token 拒绝

  **Must NOT do**:
  - 不在此任务做第三方 OAuth（Task 9-11）
  - 不做 RBAC 权限（admin 权限在 admin 任务中）
  - 不存储明文密码

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 认证是安全关键模块，需要严谨实现
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 9-15)
  - **Blocks**: Tasks 9, 10, 11, 25, 38, 40
  - **Blocked By**: Tasks 2, 3

  **References**:

  **External References**:
  - jsonwebtoken: https://github.com/auth0/node-jsonwebtoken
  - bcrypt: https://github.com/kelektiv/node.bcrypt.js
  - Zod validation: https://zod.dev/

  **Acceptance Criteria**:
  - [ ] `vitest run` auth 测试全部通过
  - [ ] POST /api/auth/register 创建用户并返回 token
  - [ ] POST /api/auth/login 返回 access + refresh token
  - [ ] GET /api/auth/me 需要有效 token
  - [ ] 无效/过期 token 返回 401

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: 注册 → 登录完整流程
    Tool: Bash (curl)
    Preconditions: Server running, database migrated
    Steps:
      1. POST /api/auth/register body={"email":"test@example.com","password":"Test1234!"} — Expected: 201, body has accessToken + refreshToken
      2. POST /api/auth/login body={"email":"test@example.com","password":"Test1234!"} — Expected: 200, body has accessToken
      3. GET /api/auth/me with Authorization: Bearer {accessToken} — Expected: 200, body has user email
      4. GET /api/auth/me without token — Expected: 401
    Expected Result: 完整认证流程正常工作
    Failure Indicators: non-201 on register, non-200 on login, 200 without token
    Evidence: .sisyphus/evidence/task-8-auth-flow.txt

  Scenario: 密码安全验证
    Tool: Bash (curl)
    Preconditions: Server running
    Steps:
      1. POST /api/auth/register body={"email":"weak@test.com","password":"123"} — Expected: 400, validation error
      2. 直接查询 DB 验证 password_hash 不等于明文密码
    Expected Result: 弱密码被拒绝，密码哈希存储
    Failure Indicators: weak password accepted, plaintext password in DB
    Evidence: .sisyphus/evidence/task-8-password-security.txt
  ```

  **Commit**: YES
  - Message: `feat(auth): email/password authentication with JWT`
  - Files: `apps/server/src/modules/auth/*`
  - Pre-commit: `vitest run`

- [ ] 9. 手机号验证码登录

  **What to do**:
  - 在 `apps/server/src/modules/auth/` 扩展：
    - `sms.service.ts` — 短信验证码发送（接口抽象，支持阿里云/腾讯云 SMS）
    - `sms.controller.ts` — POST /api/auth/sms/send-code, POST /api/auth/sms/verify
  - 验证码策略：6位数字，5分钟有效，存 Redis，同一手机号60秒内不可重发
  - 开发环境使用 console.log 输出验证码（不实际发送 SMS）
  - 验证通过后自动创建/关联用户账号
  - 防刷限制：IP 维度 10次/小时，手机号维度 5次/小时

  **Must NOT do**:
  - 不实际对接 SMS 服务商（只留接口 + 开发模式 mock）
  - 不做图形验证码

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 涉及安全策略和速率限制
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (after Task 8)
  - **Parallel Group**: Wave 2 (with Tasks 10, 11)
  - **Blocks**: Task 25
  - **Blocked By**: Task 8

  **References**:

  **Pattern References**:
  - `apps/server/src/modules/auth/auth.service.ts` — 复用 JWT token 生成逻辑
  - `apps/server/src/modules/auth/auth.controller.ts` — 复用错误响应格式

  **Acceptance Criteria**:
  - [ ] POST /api/auth/sms/send-code 返回 200
  - [ ] 开发环境验证码打印到控制台
  - [ ] POST /api/auth/sms/verify 验证成功返回 JWT token
  - [ ] 60秒内重复发送返回 429
  - [ ] 错误验证码返回 400

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: 验证码登录流程
    Tool: Bash (curl)
    Preconditions: Server + Redis running
    Steps:
      1. POST /api/auth/sms/send-code body={"phone":"13800138000"} — Expected: 200
      2. 从 server 日志获取验证码
      3. POST /api/auth/sms/verify body={"phone":"13800138000","code":"{code}"} — Expected: 200, has accessToken
      4. POST /api/auth/sms/verify body={"phone":"13800138000","code":"000000"} — Expected: 400
    Expected Result: 正确验证码登录成功，错误验证码被拒绝
    Failure Indicators: wrong code accepted, correct code rejected
    Evidence: .sisyphus/evidence/task-9-sms-login.txt

  Scenario: 频率限制验证
    Tool: Bash (curl)
    Preconditions: Server + Redis running
    Steps:
      1. POST /api/auth/sms/send-code 第一次 — Expected: 200
      2. 立即 POST /api/auth/sms/send-code 第二次 — Expected: 429, "请60秒后重试"
    Expected Result: 频率限制生效
    Failure Indicators: second request returns 200
    Evidence: .sisyphus/evidence/task-9-rate-limit.txt
  ```

  **Commit**: YES (groups with auth)
  - Message: `feat(auth): SMS verification code login with rate limiting`
  - Files: `apps/server/src/modules/auth/sms.*`
  - Pre-commit: `vitest run`

- [ ] 10. 微信 OAuth 登录

  **What to do**:
  - 在 `apps/server/src/modules/auth/` 扩展：
    - `wechat.service.ts` — 微信 OAuth2.0 流程（获取 code → 换 access_token → 获取用户信息）
    - `wechat.controller.ts` — GET /api/auth/wechat/url (返回授权链接), GET /api/auth/wechat/callback (处理回调)
  - 微信配置项：APP_ID, APP_SECRET（环境变量）
  - 首次登录自动创建用户（保存 openid + unionid + 头像 + 昵称）
  - 已有账号通过 openid 关联
  - 开发模式 mock（不实际调用微信 API）

  **Must NOT do**:
  - 不处理微信小程序登录（只做网页授权）
  - 不做微信支付
  - 不在前端暴露 APP_SECRET

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 第三方 OAuth 集成有特定流程
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (after Task 8, with Tasks 9, 11)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 25
  - **Blocked By**: Task 8

  **References**:

  **External References**:
  - 微信开放平台文档: https://developers.weixin.qq.com/doc/oplatform/Website_App/WeChat_Login/Wechat_Login.html

  **Acceptance Criteria**:
  - [ ] GET /api/auth/wechat/url 返回有效的微信授权 URL
  - [ ] GET /api/auth/wechat/callback?code=xxx 处理回调并返回 JWT
  - [ ] 用户表正确保存 wechat_openid
  - [ ] 开发模式 mock 可用

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: 微信登录 URL 生成
    Tool: Bash (curl)
    Preconditions: Server running with WECHAT_APP_ID configured
    Steps:
      1. GET /api/auth/wechat/url — Expected: 200, body contains redirect URL with appid parameter
      2. Verify URL contains "open.weixin.qq.com" or mock URL
    Expected Result: 返回有效的微信授权 URL
    Failure Indicators: 400/500, URL missing appid
    Evidence: .sisyphus/evidence/task-10-wechat-url.txt

  Scenario: 微信回调处理（开发 mock 模式）
    Tool: Bash (curl)
    Preconditions: Server in dev mode
    Steps:
      1. GET /api/auth/wechat/callback?code=mock_code — Expected: 200 or redirect with JWT
      2. Verify user created with wechat_openid in DB
    Expected Result: Mock 模式下回调正常处理
    Failure Indicators: 500 error, user not created
    Evidence: .sisyphus/evidence/task-10-wechat-callback.txt
  ```

  **Commit**: YES (groups with auth)
  - Message: `feat(auth): WeChat OAuth login integration`
  - Files: `apps/server/src/modules/auth/wechat.*`
  - Pre-commit: `vitest run`

- [ ] 11. Google OAuth 登录

  **What to do**:
  - 在 `apps/server/src/modules/auth/` 扩展：
    - `google.service.ts` — Google OAuth2.0 流程（Authorization Code Flow）
    - `google.controller.ts` — GET /api/auth/google/url, GET /api/auth/google/callback
  - 使用 `google-auth-library` 验证 ID token
  - 配置项：GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
  - 首次登录自动创建用户（保存 google_id + email + 头像 + 名称）
  - 如果邮箱已注册，自动关联 Google 账号

  **Must NOT do**:
  - 不做 Google One Tap（标准 OAuth 流程即可）

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 第三方 OAuth 集成
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (after Task 8, with Tasks 9, 10)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 25
  - **Blocked By**: Task 8

  **References**:

  **External References**:
  - Google OAuth: https://developers.google.com/identity/protocols/oauth2/web-server
  - google-auth-library: https://github.com/googleapis/google-auth-library-nodejs

  **Acceptance Criteria**:
  - [ ] GET /api/auth/google/url 返回 Google 授权 URL
  - [ ] 回调正确处理并返回 JWT
  - [ ] 已有邮箱的用户自动关联
  - [ ] 测试覆盖

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Google OAuth URL 生成
    Tool: Bash (curl)
    Preconditions: Server running with GOOGLE_CLIENT_ID configured
    Steps:
      1. GET /api/auth/google/url — Expected: 200, URL contains accounts.google.com
    Expected Result: 有效的 Google 授权 URL
    Failure Indicators: invalid URL, missing client_id
    Evidence: .sisyphus/evidence/task-11-google-url.txt

  Scenario: 邮箱关联验证
    Tool: Bash (curl)
    Preconditions: 已存在 email=test@gmail.com 的用户
    Steps:
      1. 模拟 Google 回调 with email=test@gmail.com — Expected: 关联而非新建
      2. 查询 DB 验证 google_id 被写入已有用户
    Expected Result: 已有邮箱的 Google 登录关联到现有账户
    Failure Indicators: duplicate user created
    Evidence: .sisyphus/evidence/task-11-google-link.txt
  ```

  **Commit**: YES (groups with auth)
  - Message: `feat(auth): Google OAuth login integration`
  - Files: `apps/server/src/modules/auth/google.*`
  - Pre-commit: `vitest run`

- [x] 12. 用户 Profile CRUD API

  **What to do**:
  - 在 `apps/server/src/modules/user/` 创建：
    - `user.controller.ts` — GET /api/user/profile, PUT /api/user/profile, PATCH /api/user/profile
    - `user.service.ts` — 获取/更新用户 profile（性别、年龄、身高、体重、目标、过敏信息等）
    - `user.validator.ts` — Zod 验证（身高 50-250cm, 体重 20-300kg, 年龄 1-150）
  - Profile 字段：gender, age, height_cm, weight_kg, goal(减脂/增肌/维持/健康饮食), activity_level(久坐/轻度/中度/重度), dietary_restrictions[], allergies[]
  - 计算 BMR（基础代谢率）和 TDEE（每日总能量消耗）
  - BMR 计算使用 Mifflin-St Jeor 公式
  - 返回计算后的 daily_calorie_target
  - 编写测试覆盖

  **Must NOT do**:
  - 不做头像上传（文件上传在 Task 15）
  - 不做密码修改（属于 auth 模块）

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 标准 CRUD + 公式计算
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 8-11, 13-15)
  - **Blocks**: Tasks 16, 23, 26, 39
  - **Blocked By**: Tasks 2, 3

  **References**:

  **External References**:
  - Mifflin-St Jeor 公式: 男性 BMR = 10×体重(kg) + 6.25×身高(cm) - 5×年龄 - 161; 女性 +5

  **Acceptance Criteria**:
  - [ ] GET /api/user/profile 返回完整 profile + 计算的 BMR/TDEE
  - [ ] PUT /api/user/profile 更新成功
  - [ ] 无效数据（体重=0）返回 400
  - [ ] 未认证请求返回 401

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Profile 创建和获取
    Tool: Bash (curl)
    Preconditions: Authenticated user
    Steps:
      1. PUT /api/user/profile body={"gender":"male","age":30,"height_cm":175,"weight_kg":75,"goal":"减脂","activity_level":"中度"} — Expected: 200
      2. GET /api/user/profile — Expected: 200, body contains daily_calorie_target > 0
      3. Verify BMR calculation: 10*75 + 6.25*175 - 5*30 - 5 = 1,697.75 (male with offset -5)
    Expected Result: Profile 保存并返回正确的 BMR/TDEE
    Failure Indicators: wrong BMR, missing calorie target
    Evidence: .sisyphus/evidence/task-12-profile-crud.txt

  Scenario: 无效数据拒绝
    Tool: Bash (curl)
    Preconditions: Authenticated user
    Steps:
      1. PUT /api/user/profile body={"height_cm":-10,"weight_kg":0} — Expected: 400
      2. PUT /api/user/profile body={"age":200} — Expected: 400
    Expected Result: 无效数据被拒绝并返回明确错误信息
    Failure Indicators: 200 with invalid data
    Evidence: .sisyphus/evidence/task-12-validation.txt
  ```

  **Commit**: YES
  - Message: `feat(user): user profile CRUD with BMR/TDEE calculation`
  - Files: `apps/server/src/modules/user/*`
  - Pre-commit: `vitest run`

- [x] 13. AI Service 统一抽象层

  **What to do**:
  - 在 `packages/shared/src/services/ai/` 创建（共享层，RN 可复用逻辑）：
    - `ai-client.ts` — OpenAI 兼容 API 客户端（支持 baseURL + apiKey + model 配置）
    - `ai-types.ts` — AI 请求/响应类型定义
  - 在 `apps/server/src/modules/ai/` 创建：
    - `ai.service.ts` — AI 服务核心：
      - `chat(messages, config)` — 文本对话
      - `chatWithVision(messages, images, config)` — 图片分析对话
      - `stream(messages, config)` — 流式响应（SSE）
    - `ai.config.ts` — 配置管理（平台默认 config + 用户自定义 config 合并逻辑）
    - `ai.prompts.ts` — Prompt 模板管理（模板 + 变量替换，不硬编码）
    - `ai.middleware.ts` — AI 调用中间件：速率限制（用户级）、用量追踪、错误重试（3次指数退避）
  - 使用 `openai` npm 包（官方 SDK，兼容第三方 API）
  - 支持流式和非流式两种模式
  - AI 配置优先级：用户自定义 > 平台默认
  - 所有 prompt 模板可配置，存储在数据库或配置文件中
  - 错误处理：API 不可用 → 降级提示，余额不足 → 明确告知

  **Must NOT do**:
  - 不硬编码任何 prompt 内容
  - 不在前端直接调用 AI API（必须通过后端代理）
  - 不实现具体的业务 prompt（只做基础设施）

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: AI 集成是核心模块，需要考虑安全、性能、可配置性
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 8-12, 14-15)
  - **Blocks**: Tasks 14, 16, 17, 18, 21
  - **Blocked By**: Task 2

  **References**:

  **External References**:
  - OpenAI Node.js SDK: https://github.com/openai/openai-node
  - Server-Sent Events: https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events

  **Acceptance Criteria**:
  - [ ] `chat()` 成功调用并返回结果（可用 mock API）
  - [ ] `stream()` 返回 SSE 流
  - [ ] `chatWithVision()` 支持图片输入
  - [ ] 速率限制生效（超过限制返回 429）
  - [ ] 用户自定义 config 优先于平台默认
  - [ ] 测试覆盖 ≥ 80%

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: AI 聊天调用（Mock 模式）
    Tool: Bash
    Preconditions: Server running with AI_MOCK=true or test API endpoint
    Steps:
      1. 调用 AI service chat() with messages=[{role:"user",content:"你好"}] — Expected: 返回 AI 响应文本
      2. 验证响应格式符合 AIResponse 类型
      3. 验证用量追踪记录已写入
    Expected Result: AI 调用成功并记录用量
    Failure Indicators: undefined response, missing usage tracking
    Evidence: .sisyphus/evidence/task-13-ai-chat.txt

  Scenario: 自定义配置优先级
    Tool: Bash
    Preconditions: 平台默认 config 存在
    Steps:
      1. 设置用户自定义 config: {baseURL:"https://custom.api.com",model:"gpt-4o"}
      2. 调用 AI service — 验证实际使用的是自定义 config
      3. 删除用户自定义 config — 验证 fallback 到平台默认
    Expected Result: 用户配置优先，无用户配置时使用默认
    Failure Indicators: always uses default, ignores custom config
    Evidence: .sisyphus/evidence/task-13-ai-config-priority.txt
  ```

  **Commit**: YES
  - Message: `feat(ai): unified AI service abstraction with OpenAI-compatible API`
  - Files: `packages/shared/src/services/ai/*, apps/server/src/modules/ai/*`
  - Pre-commit: `vitest run`

- [x] 14. AI 配置管理 API

  **What to do**:
  - 在 `apps/server/src/modules/ai/` 扩展：
    - `ai-config.controller.ts` — GET/PUT /api/ai/config (用户自己的), GET/PUT /api/admin/ai/config (平台默认, admin only)
    - `ai-config.service.ts` — CRUD 操作，API Key 加密存储（AES-256），获取时脱敏显示
  - 配置字段：base_url, api_key (encrypted), model, temperature, max_tokens, is_active
  - 用户端：可以设置自己的 AI 配置，也可以选择使用平台默认
  - Admin 端：设置平台默认 AI 配置
  - API Key 显示脱敏：只显示前4位 + 后4位，中间用 \*\*\* 替代
  - 配置变更时验证 API 可用性（发测试请求）

  **Must NOT do**:
  - 不在响应中返回完整 API Key
  - 不允许普通用户修改平台默认配置

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 涉及加密和权限控制
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (after Tasks 3, 13)
  - **Blocks**: Tasks 37, 41
  - **Blocked By**: Tasks 3, 13

  **References**:

  **Pattern References**:
  - `apps/server/src/modules/ai/ai.service.ts` — AI config 合并逻辑

  **Acceptance Criteria**:
  - [ ] PUT /api/ai/config 存储加密的 API Key
  - [ ] GET /api/ai/config 返回脱敏的 Key（sk-ab**...**xy）
  - [ ] Admin 端配置与用户端分离
  - [ ] 配置保存时验证 API 可达性

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: API Key 加密存储验证
    Tool: Bash (curl)
    Preconditions: Authenticated user
    Steps:
      1. PUT /api/ai/config body={"base_url":"https://api.openai.com","api_key":"sk-abcdef1234567890","model":"gpt-4o"} — Expected: 200
      2. GET /api/ai/config — Expected: api_key 显示为 "sk-a***...***90"
      3. 直接查询 DB — Expected: api_key 字段是加密后的值，非明文
    Expected Result: API Key 加密存储，脱敏显示
    Failure Indicators: plaintext key in DB, full key in response
    Evidence: .sisyphus/evidence/task-14-key-encryption.txt

  Scenario: 权限验证
    Tool: Bash (curl)
    Preconditions: 普通用户 token
    Steps:
      1. PUT /api/admin/ai/config with regular user token — Expected: 403
      2. PUT /api/admin/ai/config with admin token — Expected: 200
    Expected Result: 只有管理员可以修改平台默认配置
    Failure Indicators: regular user can modify admin config
    Evidence: .sisyphus/evidence/task-14-admin-permission.txt
  ```

  **Commit**: YES (groups with AI)
  - Message: `feat(ai): AI configuration management with encrypted key storage`
  - Files: `apps/server/src/modules/ai/ai-config.*`
  - Pre-commit: `vitest run`

- [x] 15. 文件上传服务

  **What to do**:
  - 在 `apps/server/src/modules/upload/` 创建：
    - `upload.controller.ts` — POST /api/upload/image (multipart/form-data)
    - `upload.service.ts` — 文件保存（本地存储 + 可扩展到 S3/OSS）
    - `upload.middleware.ts` — 文件大小限制（10MB）、类型验证（jpg/png/webp）
  - 使用 `multer` 处理 multipart 上传
  - 生成唯一文件名（UUID + 原始扩展名）
  - 返回文件 URL（可配置 CDN 前缀）
  - 本地存储路径：`uploads/{year}/{month}/{filename}`
  - 图片自动压缩（使用 sharp，质量 80%，最大宽度 1920px）

  **Must NOT do**:
  - 不做视频上传
  - 不做云存储对接（预留接口，本地存储优先）

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 文件处理和安全验证
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 8-14)
  - **Blocks**: Tasks 18, 29
  - **Blocked By**: Task 3

  **References**:

  **External References**:
  - Multer: https://github.com/expressjs/multer
  - Sharp image processing: https://sharp.pixelplumbing.com/

  **Acceptance Criteria**:
  - [ ] POST /api/upload/image 接受图片上传并返回 URL
  - [ ] 大于 10MB 的文件返回 413
  - [ ] 非图片文件返回 400
  - [ ] 上传后图片经过压缩处理

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: 图片上传成功
    Tool: Bash (curl)
    Preconditions: Authenticated user, test image file exists
    Steps:
      1. Create test image: `convert -size 100x100 xc:red test.jpg` (or use existing)
      2. curl -X POST /api/upload/image -F "image=@test.jpg" -H "Authorization: Bearer {token}" — Expected: 200, body has url
      3. curl GET {returned url} — Expected: 200, content-type: image/*
    Expected Result: 图片上传成功并可通过 URL 访问
    Failure Indicators: 400/500 on upload, 404 on access
    Evidence: .sisyphus/evidence/task-15-upload-success.txt

  Scenario: 文件类型和大小限制
    Tool: Bash (curl)
    Preconditions: Authenticated user
    Steps:
      1. Upload .txt file — Expected: 400, "不支持的文件类型"
      2. Upload >10MB image — Expected: 413, "文件过大"
    Expected Result: 非法文件被拒绝
    Failure Indicators: non-image accepted, oversized accepted
    Evidence: .sisyphus/evidence/task-15-upload-validation.txt
  ```

  **Commit**: YES
  - Message: `feat(upload): image upload service with compression and validation`
  - Files: `apps/server/src/modules/upload/*`
  - Pre-commit: `vitest run`

### Wave 3 — AI Features (AI 驱动功能)

- [x] 16. AI 饮食计划生成

  **What to do**:
  - 在 `apps/server/src/modules/plan/` 创建：
    - `plan.controller.ts` — POST /api/plan/generate, GET /api/plan/current, GET /api/plan/:id, GET /api/plan/list
    - `plan.service.ts` — 调用 AI 生成长期饮食计划
    - `plan.prompts.ts` — 计划生成 prompt 模板
  - Prompt 设计要点：
    - 输入：用户 profile（性别/年龄/身高/体重/目标/过敏）+ TDEE 计算结果
    - 输出：结构化 JSON（duration_days, daily_calorie_target, macro_ratio, phase_description[]）
    - 约束：必须基于用户的 TDEE 计算，减脂/增肌有不同的热量缺口/盈余
    - 安全：AI 生成的热量目标不得低于 1200kcal（女性）/ 1500kcal（男性）
  - 计划状态：draft → active → completed / paused
  - 一个用户同时只能有一个 active 计划
  - AI 响应需要解析和验证（zod schema），格式错误则重试

  **Must NOT do**:
  - 不生成具体食谱（Task 17）
  - 不硬编码 prompt

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: AI prompt 工程和营养学约束需要深度思考
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 17-24)
  - **Blocks**: Tasks 17, 19, 27
  - **Blocked By**: Tasks 13, 12

  **References**:

  **Pattern References**:
  - `apps/server/src/modules/ai/ai.service.ts` — AI 调用方式
  - `apps/server/src/modules/user/user.service.ts` — 获取用户 profile 和 TDEE

  **External References**:
  - Mifflin-St Jeor TDEE 计算公式

  **Acceptance Criteria**:
  - [ ] POST /api/plan/generate 返回结构化饮食计划
  - [ ] 计划包含 daily_calorie_target 且 ≥ 1200kcal
  - [ ] GET /api/plan/current 返回当前 active 计划
  - [ ] 有过敏信息时，计划中注明规避
  - [ ] AI 返回非法格式时自动重试

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: 饮食计划生成
    Tool: Bash (curl)
    Preconditions: User with profile (male, 30, 175cm, 80kg, goal=减脂)
    Steps:
      1. POST /api/plan/generate — Expected: 201, body has plan with daily_calorie_target
      2. Verify daily_calorie_target ≥ 1500 (male minimum)
      3. GET /api/plan/current — Expected: 200, status="active"
    Expected Result: AI 生成合理的饮食计划
    Failure Indicators: calorie < 1500, missing macro_ratio, 500 error
    Evidence: .sisyphus/evidence/task-16-plan-generate.txt

  Scenario: 安全底线验证
    Tool: Bash (curl)
    Preconditions: Female user profile, goal=减脂
    Steps:
      1. POST /api/plan/generate — Expected: daily_calorie_target ≥ 1200
      2. Verify macro_ratio percentages sum to ~100%
    Expected Result: 热量不低于安全底线
    Failure Indicators: calorie < 1200 for female
    Evidence: .sisyphus/evidence/task-16-safety-floor.txt
  ```

  **Commit**: YES
  - Message: `feat(plan): AI-powered diet plan generation with safety constraints`
  - Files: `apps/server/src/modules/plan/*`
  - Pre-commit: `vitest run`

- [x] 17. AI 每日食谱生成 — 中式菜谱

  **What to do**:
  - 在 `apps/server/src/modules/recipe/` 创建：
    - `recipe.controller.ts` — POST /api/recipe/generate-daily, GET /api/recipe/today, GET /api/recipe/:id
    - `recipe.service.ts` — 基于饮食计划生成每日食谱
    - `recipe.prompts.ts` — 食谱生成 prompt 模板
  - 每日食谱结构：
    - 早餐 + 午餐 + 晚餐 + 可选加餐
    - 每餐包含：菜名、所属菜系、食材列表(名称+用量)、烹饪步骤[]、营养信息(热量/蛋白质/碳水/脂肪/纤维)、预计烹饪时间
  - 中国饮食特色要求：
    - 菜系标注（川菜、粤菜、苏菜、鲁菜、湘菜、闽菜、浙菜、徽菜、家常菜等）
    - 食材用中文名称（不翻译成英文）
    - 计量单位：克、毫升、勺、片、根、个等中式习惯单位
    - 烹饪方法：炒、炖、蒸、煮、烤、凉拌等
    - 考虑食材搭配禁忌（如柿子+螃蟹）
  - 每日总热量与计划目标差距 ≤ 10%
  - 支持批量生成（一次生成一周食谱）

  **Must NOT do**:
  - 不做西餐食谱（除非用户明确要求）
  - 不让 AI 推荐不常见/难买到的食材

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 中式食谱 prompt 工程需要深度领域知识
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (after Task 16)
  - **Parallel Group**: Wave 3
  - **Blocks**: Tasks 20, 24, 28, 31, 35
  - **Blocked By**: Task 16

  **References**:

  **Pattern References**:
  - `apps/server/src/modules/plan/plan.service.ts` — 获取用户饮食计划
  - `apps/server/src/modules/ai/ai.service.ts` — AI 调用方式
  - `packages/shared/src/types/recipe.ts` — Recipe 类型定义

  **Acceptance Criteria**:
  - [ ] POST /api/recipe/generate-daily 返回3-4餐食谱
  - [ ] 每餐包含完整的食材列表和烹饪步骤
  - [ ] 食材名称为中文，计量单位为中式习惯
  - [ ] 每日总热量与目标差距 ≤ 10%
  - [ ] 营养素分布合理（蛋白质/碳水/脂肪）

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: 每日食谱生成
    Tool: Bash (curl)
    Preconditions: User has active diet plan with target 2000kcal
    Steps:
      1. POST /api/recipe/generate-daily body={"date":"2025-01-15"} — Expected: 201
      2. Verify response has ≥ 3 meals (breakfast, lunch, dinner)
      3. Verify each meal has: title, cuisine_type, ingredients[], steps[], nutrition
      4. Sum all meal calories — Expected: 1800-2200 (within 10% of 2000)
      5. Verify ingredients contain Chinese characters
    Expected Result: 完整中式食谱，热量匹配计划
    Failure Indicators: < 3 meals, missing ingredients, total calories off by > 10%
    Evidence: .sisyphus/evidence/task-17-daily-recipe.txt

  Scenario: 食材中文验证
    Tool: Bash
    Preconditions: 已生成食谱
    Steps:
      1. 获取食谱中所有 ingredient.name 字段
      2. 验证全部为中文字符（不含英文食材名）
      3. 验证单位使用 "克/毫升/勺/片/根/个" 等
    Expected Result: 食材名称和单位符合中式习惯
    Failure Indicators: English ingredient names, imperial units
    Evidence: .sisyphus/evidence/task-17-chinese-ingredients.txt
  ```

  **Commit**: YES
  - Message: `feat(recipe): AI Chinese cuisine recipe generation with nutrition tracking`
  - Files: `apps/server/src/modules/recipe/*`
  - Pre-commit: `vitest run`

- [x] 18. AI 拍照食物热量分析

  **What to do**:
  - 在 `apps/server/src/modules/food-analysis/` 创建：
    - `food-analysis.controller.ts` — POST /api/food/analyze (接受图片 URL 或 base64)
    - `food-analysis.service.ts` — 调用 AI Vision API 分析食物图片
    - `food-analysis.prompts.ts` — 图片分析 prompt 模板
  - AI 分析返回结构：
    - 识别的食物名称[]
    - 每种食物的估算分量
    - 每种食物的估算热量
    - 总热量
    - 营养素大致分布
    - 置信度（高/中/低）
  - 分析结果可保存，关联到用户的当日餐食记录
  - 置信度低时提示用户手动调整

  **Must NOT do**:
  - 不做食物精准识别（AI 估算即可）
  - 不保证热量精确性（声明为"估算"）

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Vision API 集成 + 结果验证逻辑
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 16-17, 19-24)
  - **Blocks**: Tasks 29, 36
  - **Blocked By**: Tasks 13, 15

  **References**:

  **Pattern References**:
  - `apps/server/src/modules/ai/ai.service.ts:chatWithVision()` — Vision API 调用
  - `apps/server/src/modules/upload/upload.service.ts` — 图片上传获取 URL

  **Acceptance Criteria**:
  - [ ] POST /api/food/analyze 接受图片并返回分析结果
  - [ ] 返回结构包含 foods[], total_calories, confidence
  - [ ] 分析结果可保存到餐食记录
  - [ ] 无效图片返回合适的错误提示

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: 食物图片分析
    Tool: Bash (curl)
    Preconditions: Server running with AI Vision API configured
    Steps:
      1. Upload a food image via /api/upload/image — get URL
      2. POST /api/food/analyze body={"image_url":"{url}"} — Expected: 200
      3. Verify response has foods array with ≥ 1 item
      4. Verify each food has name, estimated_portion, estimated_calories
      5. Verify total_calories > 0
    Expected Result: AI 识别食物并估算热量
    Failure Indicators: empty foods array, missing calories, 500 error
    Evidence: .sisyphus/evidence/task-18-food-analysis.txt

  Scenario: 非食物图片处理
    Tool: Bash (curl)
    Preconditions: Server running
    Steps:
      1. Upload non-food image (e.g., landscape)
      2. POST /api/food/analyze — Expected: 200, confidence="low", message 提示可能不是食物
    Expected Result: 非食物图片返回低置信度提示
    Failure Indicators: high confidence on non-food, 500 error
    Evidence: .sisyphus/evidence/task-18-non-food.txt
  ```

  **Commit**: YES
  - Message: `feat(food): AI-powered food photo calorie analysis via Vision API`
  - Files: `apps/server/src/modules/food-analysis/*`
  - Pre-commit: `vitest run`

- [x] 19. AI 每日总结 + 次日规划

  **What to do**:
  - 在 `apps/server/src/modules/summary/` 创建：
    - `summary.controller.ts` — POST /api/summary/generate, GET /api/summary/today, GET /api/summary/:date
    - `summary.service.ts` — 汇总当日数据，调用 AI 生成总结
    - `summary.prompts.ts` — 总结 prompt 模板
  - 每日总结包含：
    - 今日饮食执行情况（完成/部分完成/未完成的餐食）
    - 实际热量 vs 目标热量对比
    - 今日体重变化（如果有记录）
    - AI 评价和建议（鼓励为主，建设性反馈）
    - 明日饮食计划预告
    - 连续打卡天数更新
  - 支持手动触发和定时生成（晚上 21:00 自动生成）
  - 定时任务使用 node-cron

  **Must NOT do**:
  - 不批评用户（以鼓励为主）
  - 不生成极端建议（如断食）

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 数据聚合 + AI 总结需要深度逻辑
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 16-18, 20-24)
  - **Blocks**: Tasks 33, 42
  - **Blocked By**: Tasks 16, 22

  **References**:

  **Pattern References**:
  - `apps/server/src/modules/plan/plan.service.ts` — 获取计划数据
  - `apps/server/src/modules/tracking/` — 获取打卡和体重数据

  **Acceptance Criteria**:
  - [ ] POST /api/summary/generate 返回当日总结
  - [ ] 总结包含饮食执行率、热量对比、AI 建议
  - [ ] AI 建议以鼓励性语言为主
  - [ ] GET /api/summary/today 返回今日总结
  - [ ] 定时任务 21:00 可触发

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: 每日总结生成
    Tool: Bash (curl)
    Preconditions: User has today's meal check-ins and weight entry
    Steps:
      1. POST /api/summary/generate — Expected: 200
      2. Verify response has: meal_completion_rate, actual_vs_target_calories, ai_feedback, tomorrow_preview
      3. Verify ai_feedback does NOT contain negative/critical language
    Expected Result: 总结数据完整，AI 反馈积极正面
    Failure Indicators: missing fields, negative tone in feedback
    Evidence: .sisyphus/evidence/task-19-daily-summary.txt

  Scenario: 无数据日总结
    Tool: Bash (curl)
    Preconditions: User has no check-ins today
    Steps:
      1. POST /api/summary/generate — Expected: 200
      2. Verify AI acknowledges lack of data and encourages starting tomorrow
    Expected Result: 无数据时也能生成鼓励性总结
    Failure Indicators: 500 error, blank summary
    Evidence: .sisyphus/evidence/task-19-empty-day.txt
  ```

  **Commit**: YES
  - Message: `feat(summary): AI daily summary and next-day planning`
  - Files: `apps/server/src/modules/summary/*`
  - Pre-commit: `vitest run`

- [x] 20. 食谱收藏 + 一键换食谱 API

  **What to do**:
  - 在 `apps/server/src/modules/recipe/` 扩展：
    - 收藏功能：POST /api/recipe/:id/favorite, DELETE /api/recipe/:id/favorite, GET /api/recipe/favorites
    - 换食谱：POST /api/recipe/:id/swap — AI 重新生成同一餐的替代食谱
  - 收藏的食谱可以在后续 AI 生成时被优先推荐
  - 换食谱时保持热量目标一致，但换不同的菜品
  - 换食谱时考虑用户过敏和禁忌

  **Must NOT do**:
  - 不做食谱编辑（用户不能修改 AI 生成的食谱内容）

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 涉及 AI 重新生成和收藏逻辑
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (after Task 17)
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 28
  - **Blocked By**: Task 17

  **References**:

  **Pattern References**:
  - `apps/server/src/modules/recipe/recipe.service.ts` — 食谱生成逻辑
  - `apps/server/src/modules/recipe/recipe.prompts.ts` — 食谱 prompt 模板

  **Acceptance Criteria**:
  - [ ] POST /api/recipe/:id/favorite 成功收藏
  - [ ] GET /api/recipe/favorites 返回收藏列表
  - [ ] POST /api/recipe/:id/swap 返回新食谱，热量接近原食谱
  - [ ] 新食谱不重复原食谱的菜品

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: 食谱收藏和获取
    Tool: Bash (curl)
    Preconditions: User has generated recipes
    Steps:
      1. POST /api/recipe/{id}/favorite — Expected: 200
      2. GET /api/recipe/favorites — Expected: 200, array contains the favorited recipe
      3. DELETE /api/recipe/{id}/favorite — Expected: 200
      4. GET /api/recipe/favorites — Expected: recipe removed from list
    Expected Result: 收藏/取消收藏正常工作
    Failure Indicators: favorite not persisted, not removed after delete
    Evidence: .sisyphus/evidence/task-20-favorite.txt

  Scenario: 一键换食谱
    Tool: Bash (curl)
    Preconditions: User has a lunch recipe with ~600kcal
    Steps:
      1. POST /api/recipe/{lunch_id}/swap — Expected: 200, new recipe returned
      2. Verify new recipe title ≠ original title
      3. Verify new recipe calories within ±15% of original
    Expected Result: 新食谱不同但热量接近
    Failure Indicators: same recipe returned, calorie difference > 15%
    Evidence: .sisyphus/evidence/task-20-swap.txt
  ```

  **Commit**: YES (groups with recipe)
  - Message: `feat(recipe): recipe favorites and one-click swap`
  - Files: `apps/server/src/modules/recipe/*`
  - Pre-commit: `vitest run`

- [x] 21. 根据现有食材生成食谱

  **What to do**:
  - 在 `apps/server/src/modules/recipe/` 扩展：
    - `recipe.controller.ts` 添加 POST /api/recipe/from-ingredients
  - 用户输入现有食材列表（文字输入，支持中文）
  - AI 根据输入食材 + 用户饮食计划目标生成食谱
  - 可以指定做几道菜、偏好的烹饪方式
  - 生成的食谱尽量使用用户提供的食材，避免需要额外采购太多

  **Must NOT do**:
  - 不做食材库存管理
  - 不做食材识别（纯文字输入）

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: AI prompt 设计有特殊约束
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 16-20, 22-24)
  - **Blocks**: Task 28
  - **Blocked By**: Task 13

  **References**:

  **Pattern References**:
  - `apps/server/src/modules/recipe/recipe.prompts.ts` — 食谱 prompt 模板风格

  **Acceptance Criteria**:
  - [ ] POST /api/recipe/from-ingredients 接受食材列表并返回食谱
  - [ ] 返回食谱主要使用用户提供的食材
  - [ ] 额外需要的食材单独标注

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: 根据食材生成食谱
    Tool: Bash (curl)
    Preconditions: Authenticated user with active plan
    Steps:
      1. POST /api/recipe/from-ingredients body={"ingredients":["鸡胸肉","西兰花","胡萝卜","大蒜"],"meals":2} — Expected: 200
      2. Verify response has 2 recipes
      3. Verify each recipe's ingredients overlap ≥ 50% with input
    Expected Result: 食谱主要使用提供的食材
    Failure Indicators: no overlap with input, 500 error
    Evidence: .sisyphus/evidence/task-21-from-ingredients.txt

  Scenario: 空食材列表
    Tool: Bash (curl)
    Steps:
      1. POST /api/recipe/from-ingredients body={"ingredients":[]} — Expected: 400
    Expected Result: 空食材列表被拒绝
    Failure Indicators: 200 with empty ingredients
    Evidence: .sisyphus/evidence/task-21-empty-ingredients.txt
  ```

  **Commit**: YES (groups with recipe)
  - Message: `feat(recipe): generate recipes from available ingredients`
  - Files: `apps/server/src/modules/recipe/*`
  - Pre-commit: `vitest run`

- [x] 22. 体重记录 + 餐食打卡 API

  **What to do**:
  - 在 `apps/server/src/modules/tracking/` 创建：
    - `tracking.controller.ts`:
      - POST /api/tracking/weight — 记录体重
      - GET /api/tracking/weight?from=&to= — 获取体重历史
      - POST /api/tracking/checkin — 餐食打卡（标记某餐已完成）
      - GET /api/tracking/checkin/today — 今日打卡状态
      - GET /api/tracking/streak — 连续打卡天数
    - `tracking.service.ts` — 业务逻辑
  - 体重记录：每日最多一条，记录 weight_kg + date + 可选备注
  - 餐食打卡：关联到当日食谱的每一餐，状态 = completed / skipped / partial
  - 连续打卡计算：每日至少完成2餐算完成一天
  - 打卡中断自动重置连续天数（但保留历史记录）

  **Must NOT do**:
  - 不做运动打卡
  - 不做其他健康指标（血压、心率等）

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 涉及连续打卡计算逻辑
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 16-21, 23-24)
  - **Blocks**: Tasks 19, 30, 31, 32, 39
  - **Blocked By**: Tasks 3, 12

  **References**:

  **Pattern References**:
  - `apps/server/src/db/schema/tracking.ts` — tracking 表结构

  **Acceptance Criteria**:
  - [ ] POST /api/tracking/weight 成功记录
  - [ ] GET /api/tracking/weight 返回时间范围内的体重数据
  - [ ] POST /api/tracking/checkin 成功打卡
  - [ ] GET /api/tracking/streak 返回正确的连续天数
  - [ ] 每日只允许一条体重记录（重复提交更新）

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: 体重记录和查询
    Tool: Bash (curl)
    Preconditions: Authenticated user
    Steps:
      1. POST /api/tracking/weight body={"weight_kg":75.5,"date":"2025-01-15"} — Expected: 201
      2. POST /api/tracking/weight body={"weight_kg":75.3,"date":"2025-01-16"} — Expected: 201
      3. GET /api/tracking/weight?from=2025-01-15&to=2025-01-16 — Expected: 200, 2 entries
    Expected Result: 体重正确记录和查询
    Failure Indicators: missing entries, wrong weight values
    Evidence: .sisyphus/evidence/task-22-weight-tracking.txt

  Scenario: 连续打卡计算
    Tool: Bash (curl)
    Preconditions: Authenticated user with recipes for 3 days
    Steps:
      1. Day 1: Check in 3 meals — Expected: streak = 1
      2. Day 2: Check in 2 meals — Expected: streak = 2
      3. Day 3: Check in 0 meals (skip) — Expected: streak = 0 (reset)
      4. Day 4: Check in 3 meals — Expected: streak = 1 (restart)
    Expected Result: 连续打卡正确计算，中断后重置
    Failure Indicators: streak not reset after skip, wrong count
    Evidence: .sisyphus/evidence/task-22-streak.txt
  ```

  **Commit**: YES
  - Message: `feat(tracking): weight logging and meal check-in with streak tracking`
  - Files: `apps/server/src/modules/tracking/*`
  - Pre-commit: `vitest run`

- [x] 23. 食物过敏/禁忌管理 API

  **What to do**:
  - 在 `apps/server/src/modules/user/` 扩展 profile 模块：
    - PATCH /api/user/allergies — 更新过敏食物列表
    - PATCH /api/user/restrictions — 更新饮食禁忌
  - 预定义常见过敏原：花生、牛奶、鸡蛋、海鲜、小麦、大豆、坚果
  - 预定义饮食禁忌：素食、纯素、清真、无麸质、低糖、低盐
  - 支持用户自定义过敏食物（自由输入）
  - 过敏和禁忌信息在 AI 生成食谱时自动传入 prompt
  - 所有 recipe 相关的 AI 调用都必须检查并传入用户过敏/禁忌

  **Must NOT do**:
  - 不做医学级过敏检测
  - 不做交叉过敏推断

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 简单 CRUD + 数据关联
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 16-22, 24)
  - **Blocks**: Task 26
  - **Blocked By**: Task 12

  **References**:

  **Pattern References**:
  - `apps/server/src/modules/user/user.service.ts` — Profile 更新模式

  **Acceptance Criteria**:
  - [ ] PATCH /api/user/allergies 更新成功
  - [ ] GET /api/user/profile 返回完整的 allergies + restrictions
  - [ ] 预定义选项可选，也可自由输入
  - [ ] 过敏信息在食谱生成 prompt 中可见

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: 过敏食物设置
    Tool: Bash (curl)
    Preconditions: Authenticated user
    Steps:
      1. PATCH /api/user/allergies body={"allergies":["花生","海鲜","芒果"]} — Expected: 200
      2. GET /api/user/profile — Expected: allergies=["花生","海鲜","芒果"]
      3. POST /api/recipe/generate-daily — 验证生成的食谱不含花生、海鲜、芒果
    Expected Result: 过敏食物被 AI 食谱生成规避
    Failure Indicators: allergic ingredients in generated recipe
    Evidence: .sisyphus/evidence/task-23-allergy-avoidance.txt
  ```

  **Commit**: YES (groups with user)
  - Message: `feat(user): allergy and dietary restriction management`
  - Files: `apps/server/src/modules/user/*`
  - Pre-commit: `vitest run`

- [x] 24. 自动购物清单 API

  **What to do**:
  - 在 `apps/server/src/modules/shopping/` 创建：
    - `shopping.controller.ts` — POST /api/shopping/generate, GET /api/shopping/:id, PATCH /api/shopping/:id/item/:itemId
    - `shopping.service.ts` — 根据食谱汇总食材生成购物清单
  - 功能：
    - 根据 N 天食谱自动汇总食材（合并相同食材，累加用量）
    - 每个清单项：食材名、总用量、单位、勾选状态（已购/未购）
    - 按食材分类（蔬菜、肉类、调味料、主食等）
    - 支持手动添加/删除/修改清单项
    - 标注哪些是常备调味料（可能已有，不需每次购买）

  **Must NOT do**:
  - 不对接电商平台
  - 不做价格比较
  - 不做自动下单

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 食材汇总和分类逻辑
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (after Task 17)
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 34
  - **Blocked By**: Task 17

  **References**:

  **Pattern References**:
  - `apps/server/src/modules/recipe/recipe.service.ts` — 获取食谱食材数据

  **Acceptance Criteria**:
  - [ ] POST /api/shopping/generate 返回汇总后的购物清单
  - [ ] 相同食材的用量被合并
  - [ ] 清单按分类组织（蔬菜、肉类等）
  - [ ] PATCH 可以更新勾选状态

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: 购物清单生成
    Tool: Bash (curl)
    Preconditions: User has 3 days of recipes generated
    Steps:
      1. POST /api/shopping/generate body={"days":3} — Expected: 201
      2. Verify response has categorized items (蔬菜、肉类 etc.)
      3. Verify same ingredient from different meals is merged (e.g., 大蒜 = 总量)
    Expected Result: 食材正确汇总和分类
    Failure Indicators: duplicate ingredients, no categories
    Evidence: .sisyphus/evidence/task-24-shopping-list.txt

  Scenario: 清单项勾选
    Tool: Bash (curl)
    Preconditions: Shopping list exists
    Steps:
      1. PATCH /api/shopping/{id}/item/{itemId} body={"purchased":true} — Expected: 200
      2. GET /api/shopping/{id} — Verify item.purchased = true
    Expected Result: 清单项勾选状态更新
    Failure Indicators: status not persisted
    Evidence: .sisyphus/evidence/task-24-checklist.txt
  ```

  **Commit**: YES
  - Message: `feat(shopping): auto-generated shopping list from meal recipes`
  - Files: `apps/server/src/modules/shopping/*`
  - Pre-commit: `vitest run`

### Wave 4 — Frontend (前端页面)

- [x] 25. 登录注册页面

  **What to do**:
  - 在 `apps/web/src/pages/auth/` 创建：
    - `LoginPage.tsx` — 邮箱密码登录 + 手机号验证码 + 微信扫码 + Google 登录按钮
    - `RegisterPage.tsx` — 邮箱密码注册 + 手机号注册
    - `ForgotPasswordPage.tsx` — 忘记密码（发重置链接到邮箱）
  - 使用 `apps/web/src/hooks/useAuth.ts` 管理认证状态
  - 使用 React Router 配置路由守卫（未登录 → 跳转登录页）
  - 登录后跳转到主页面
  - 表单验证使用 react-hook-form + zod
  - 手机号输入组件支持 +86 中国区号
  - 微信登录显示二维码（调用后端获取 URL）
  - Google 登录跳转 OAuth URL
  - Mobile-first 布局，居中卡片样式
  - 配置全局状态管理 zustand（auth store）
  - 配置 API 请求库 axios（拦截器自动附加 token，401 自动刷新）

  **Must NOT do**:
  - 不做注册后的邮箱验证流程
  - 不做 CAPTCHA 验证码

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 登录页面需要良好的 UI/UX 设计
  - **Skills**: [`frontend-ui-ux`, `playwright`]
    - `frontend-ui-ux`: 登录页设计
    - `playwright`: UI 测试验证

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 26-39)
  - **Blocks**: Tasks 43, 44
  - **Blocked By**: Tasks 7, 8, 9, 10, 11

  **References**:

  **Pattern References**:
  - `packages/shared/src/ui/` — UI 组件库
  - `packages/shared/src/types/auth.ts` — Auth 类型定义
  - `packages/shared/src/i18n/locales/zh-CN.json` — 中文翻译 keys

  **External References**:
  - react-hook-form: https://react-hook-form.com/
  - zustand: https://zustand-demo.pmnd.rs/
  - axios interceptors: https://axios-http.com/docs/interceptors

  **Acceptance Criteria**:
  - [ ] 邮箱登录表单可提交并成功登录
  - [ ] 手机号验证码流程完整
  - [ ] 微信/Google 按钮可跳转 OAuth
  - [ ] 未认证访问其他页面重定向到登录页
  - [ ] 401 时自动刷新 token
  - [ ] 手机端和桌面端布局正常

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: 邮箱登录流程
    Tool: Playwright
    Preconditions: User registered with test@example.com
    Steps:
      1. Navigate to /login
      2. Fill input[name="email"] with "test@example.com"
      3. Fill input[name="password"] with "Test1234!"
      4. Click button[type="submit"]
      5. Wait for navigation to / (homepage) — timeout: 5s
      6. Assert URL is "/" or "/dashboard"
    Expected Result: 登录成功跳转首页
    Failure Indicators: stays on /login, error message shown
    Evidence: .sisyphus/evidence/task-25-email-login.png

  Scenario: 手机端登录页布局
    Tool: Playwright
    Preconditions: Dev server running
    Steps:
      1. Set viewport to 375x812 (iPhone)
      2. Navigate to /login
      3. Assert login form is visible and not overflowing
      4. Assert all buttons are clickable (not overlapping)
      5. Screenshot
    Expected Result: 手机端布局正确，无溢出
    Failure Indicators: horizontal scroll, overlapping elements
    Evidence: .sisyphus/evidence/task-25-mobile-layout.png
  ```

  **Commit**: YES
  - Message: `feat(ui): login and registration pages with multi-auth support`
  - Files: `apps/web/src/pages/auth/*, apps/web/src/hooks/useAuth.ts, apps/web/src/stores/auth.ts`
  - Pre-commit: `tsc --noEmit`

- [x] 26. 用户 Profile 设置页面

  **What to do**:
  - 在 `apps/web/src/pages/profile/` 创建：
    - `ProfilePage.tsx` — 用户信息设置页面
  - 包含表单：性别选择、年龄输入、身高输入(cm)、体重输入(kg)、目标选择(减脂/增肌/维持/健康饮食)、活动水平选择
  - 过敏食物管理：预定义标签多选 + 自定义输入
  - 饮食禁忌管理：预定义标签多选
  - 显示计算后的 BMR 和 TDEE（实时计算预览）
  - 显示每日建议热量
  - AI 配置入口（链接到 AI 配置页面）
  - 数据导出入口
  - 退出登录按钮

  **Must NOT do**:
  - 不做头像上传（简化版，可后续添加）

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 表单设计和数据展示
  - **Skills**: [`frontend-ui-ux`, `playwright`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 25, 27-39)
  - **Blocks**: Tasks 43, 44
  - **Blocked By**: Tasks 7, 12, 23

  **References**:

  **Pattern References**:
  - `packages/shared/src/ui/` — UI 组件
  - `packages/shared/src/types/user.ts` — User/Profile 类型

  **Acceptance Criteria**:
  - [ ] 表单可填写所有 profile 字段
  - [ ] 保存后刷新页面数据不丢失
  - [ ] BMR/TDEE 实时计算显示
  - [ ] 过敏食物标签可添加/删除
  - [ ] 手机端和桌面端布局正常

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Profile 填写和保存
    Tool: Playwright
    Preconditions: Logged in user
    Steps:
      1. Navigate to /profile
      2. Select gender "男"
      3. Fill age = 30, height = 175, weight = 75
      4. Select goal "减脂"
      5. Click "保存"
      6. Refresh page — verify all fields persist
      7. Verify BMR display shows ~1698 kcal
    Expected Result: Profile 保存成功，BMR 正确显示
    Failure Indicators: data lost after refresh, wrong BMR
    Evidence: .sisyphus/evidence/task-26-profile.png

  Scenario: 过敏食物管理
    Tool: Playwright
    Preconditions: Profile page loaded
    Steps:
      1. Click "花生" allergy tag — assert selected state
      2. Type "芒果" in custom input — press Enter
      3. Assert "芒果" tag appears
      4. Click save — verify allergies persisted
    Expected Result: 标签选择和自定义输入都正常
    Failure Indicators: tag not selectable, custom input not working
    Evidence: .sisyphus/evidence/task-26-allergies.png
  ```

  **Commit**: YES (groups with UI)
  - Message: `feat(ui): user profile settings with BMR/TDEE display`
  - Files: `apps/web/src/pages/profile/*`
  - Pre-commit: `tsc --noEmit`

- [x] 27. AI 饮食计划主页面

  **What to do**:
  - 在 `apps/web/src/pages/plan/` 创建：
    - `PlanPage.tsx` — 饮食计划主页面
  - 无计划状态：引导用户创建计划的空状态页面（填写目标 → 生成计划）
  - 有计划状态：
    - 计划概览卡片（目标、持续天数、每日热量目标、宏量素比例）
    - 今日食谱快速入口
    - 进度条（已完成天数 / 总天数）
    - 连续打卡天数徽章
    - 最近体重趋势迷你图
  - 计划生成过程：loading 动画 + 流式输出展示（SSE）
  - 计划操作：暂停/恢复/重新生成
  - 底部导航栏（手机端）：首页、食谱、拍照、记录、我的

  **Must NOT do**:
  - 不做日历视图（简化版用列表）
  - 不展示完整食谱详情（链接到 Task 28 页面）

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 主页面设计是 UX 重点
  - **Skills**: [`frontend-ui-ux`, `playwright`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: Tasks 43, 44
  - **Blocked By**: Tasks 7, 16, 17

  **References**:

  **Pattern References**:
  - `packages/shared/src/ui/` — StatCard, ProgressBar, ChartContainer
  - `packages/shared/src/types/plan.ts` — DietPlan 类型

  **Acceptance Criteria**:
  - [ ] 无计划用户看到引导创建页面
  - [ ] 有计划用户看到计划概览 + 今日食谱入口
  - [ ] 计划生成时有 loading 动画
  - [ ] 底部导航栏在手机端显示
  - [ ] 手机端和桌面端布局正常

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: 新用户首次体验
    Tool: Playwright
    Preconditions: Logged in user with no plan
    Steps:
      1. Navigate to /
      2. Assert empty state UI visible with "创建饮食计划" button
      3. Click "创建饮食计划"
      4. Assert plan generation flow starts (loading state)
      5. Wait for plan to generate — timeout: 30s
      6. Assert plan overview card visible with calorie target
    Expected Result: 从无到有创建计划的完整流程
    Failure Indicators: no empty state, generation hangs, no overview
    Evidence: .sisyphus/evidence/task-27-new-user.png

  Scenario: 手机端底部导航
    Tool: Playwright
    Preconditions: Logged in user with plan, viewport 375x812
    Steps:
      1. Navigate to /
      2. Assert bottom navigation bar visible with 5 tabs
      3. Click each tab — verify navigation works
    Expected Result: 底部导航在手机端正常工作
    Failure Indicators: nav hidden, tabs not clickable
    Evidence: .sisyphus/evidence/task-27-mobile-nav.png
  ```

  **Commit**: YES
  - Message: `feat(ui): diet plan main page with overview and navigation`
  - Files: `apps/web/src/pages/plan/*`
  - Pre-commit: `tsc --noEmit`

- [x] 28. 每日食谱详情页 + 做法步骤

  **What to do**:
  - 在 `apps/web/src/pages/recipe/` 创建：
    - `DailyRecipePage.tsx` — 今日食谱列表（早/午/晚/加餐）
    - `RecipeDetailPage.tsx` — 单个食谱详情（食材 + 步骤 + 营养）
  - 每日食谱页面：
    - 按餐次分组显示（早餐、午餐、晚餐、加餐）
    - 每餐卡片显示：菜名、菜系标签、热量、预计烹饪时间
    - 总热量汇总 vs 目标对比
    - 打卡按钮（标记已完成/跳过）
    - 一键换食谱按钮
    - 收藏按钮
  - 食谱详情页面：
    - 菜名 + 菜系标签
    - 食材清单（带用量）
    - 分步烹饪说明（步骤号 + 文字描述）
    - 营养信息卡片（热量、蛋白质、碳水、脂肪、纤维 — 饼图）
    - 预计烹饪时间
  - "根据现有食材做菜"入口按钮

  **Must NOT do**:
  - 不做烹饪视频
  - 不做步骤计时器

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 食谱展示需要优秀的信息架构和视觉设计
  - **Skills**: [`frontend-ui-ux`, `playwright`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: Tasks 43, 44
  - **Blocked By**: Tasks 7, 17, 20, 21

  **References**:

  **Pattern References**:
  - `packages/shared/src/types/recipe.ts` — Recipe, Ingredient, CookingStep, NutritionInfo
  - `packages/shared/src/ui/` — Card, Badge, Tabs

  **Acceptance Criteria**:
  - [ ] 今日食谱按餐次分组显示
  - [ ] 点击菜品进入详情页
  - [ ] 详情页完整显示食材、步骤、营养
  - [ ] 打卡/收藏/换食谱按钮可用
  - [ ] 营养信息有可视化图表

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: 食谱详情完整性
    Tool: Playwright
    Preconditions: User has today's recipes generated
    Steps:
      1. Navigate to /recipe/today
      2. Assert ≥ 3 meal sections (早餐, 午餐, 晚餐)
      3. Click first recipe card
      4. Assert detail page shows: ingredients list, cooking steps, nutrition chart
      5. Assert ingredients are in Chinese with Chinese units
    Expected Result: 食谱详情完整展示所有信息
    Failure Indicators: missing sections, English ingredients, no nutrition
    Evidence: .sisyphus/evidence/task-28-recipe-detail.png

  Scenario: 打卡和收藏操作
    Tool: Playwright
    Preconditions: Recipe detail page loaded
    Steps:
      1. Click "已完成" check-in button — assert visual confirmation
      2. Click "收藏" button — assert heart icon filled
      3. Navigate back to /recipe/today — verify meal shows completed status
    Expected Result: 打卡和收藏状态正确更新
    Failure Indicators: status not updated, buttons not responding
    Evidence: .sisyphus/evidence/task-28-checkin-favorite.png
  ```

  **Commit**: YES (groups with UI)
  - Message: `feat(ui): daily recipe page with cooking instructions and nutrition`
  - Files: `apps/web/src/pages/recipe/*`
  - Pre-commit: `tsc --noEmit`

- [x] 29. 食物拍照分析页面

  **What to do**:
  - 在 `apps/web/src/pages/food-analysis/` 创建：
    - `FoodAnalysisPage.tsx` — 拍照/上传食物图片分析页面
  - 功能：
    - 拍照按钮（调用设备摄像头）或从相册选择
    - 上传后显示预览图
    - 点击"分析"调用后端 API
    - 分析结果展示：识别的食物列表 + 每种热量 + 总热量
    - 置信度显示（高/中/低 + 颜色标识）
    - 可以将分析结果记录到当日餐食
    - 可以手动调整分量/热量

  **Must NOT do**:
  - 不做实时摄像头分析（拍照后分析）
  - 不做食物数据库搜索

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 摄像头交互 + 结果展示
  - **Skills**: [`frontend-ui-ux`, `playwright`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: Tasks 43, 44
  - **Blocked By**: Tasks 7, 18

  **References**:

  **Pattern References**:
  - `apps/server/src/modules/food-analysis/` — API 接口

  **Acceptance Criteria**:
  - [ ] 可从相册选择图片或拍照
  - [ ] 上传后显示预览
  - [ ] 分析结果显示食物名称 + 热量
  - [ ] 结果可记录到当日餐食

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: 图片上传分析流程
    Tool: Playwright
    Preconditions: Logged in, food-analysis page
    Steps:
      1. Navigate to /food-analysis
      2. Upload test food image via file input
      3. Assert image preview displayed
      4. Click "分析热量" button
      5. Wait for analysis result — timeout: 15s
      6. Assert result shows food names and calorie numbers
    Expected Result: 食物分析完整流程
    Failure Indicators: no preview, analysis timeout, no results
    Evidence: .sisyphus/evidence/task-29-food-analysis.png

  Scenario: 记录到餐食
    Tool: Playwright
    Preconditions: Analysis result displayed
    Steps:
      1. Click "记录到今日午餐" button
      2. Assert success toast message
      3. Navigate to /recipe/today — verify lunch has recorded item
    Expected Result: 分析结果成功记录
    Failure Indicators: no record, navigation error
    Evidence: .sisyphus/evidence/task-29-record-meal.png
  ```

  **Commit**: YES (groups with UI)
  - Message: `feat(ui): food photo analysis page with camera and gallery support`
  - Files: `apps/web/src/pages/food-analysis/*`
  - Pre-commit: `tsc --noEmit`

- [x] 30. 体重记录 + 打卡页面

  **What to do**:
  - 在 `apps/web/src/pages/tracking/` 创建：
    - `TrackingPage.tsx` — 体重记录 + 打卡综合页面
  - 体重记录：
    - 今日体重输入（数字键盘友好）
    - 体重变化概要（vs 昨天、vs 目标）
    - 最近 7 天体重迷你图表
    - "查看更多" 链接到进度可视化页面
  - 打卡状态：
    - 今日各餐打卡状态总览
    - 连续打卡天数大字展示
    - 本周打卡日历视图（简单 7 格）

  **Must NOT do**:
  - 不做复杂图表（Task 31）

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 数据输入 + 状态展示
  - **Skills**: [`frontend-ui-ux`, `playwright`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: Tasks 43, 44
  - **Blocked By**: Tasks 7, 22

  **References**:

  **Pattern References**:
  - `apps/server/src/modules/tracking/` — API 接口
  - `packages/shared/src/types/tracking.ts` — 类型定义

  **Acceptance Criteria**:
  - [ ] 体重输入可保存
  - [ ] 显示 vs 昨天的变化
  - [ ] 连续打卡天数正确显示
  - [ ] 最近 7 天迷你图表可见

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: 体重记录流程
    Tool: Playwright
    Preconditions: Logged in user
    Steps:
      1. Navigate to /tracking
      2. Input weight "75.5" in weight field
      3. Click "记录" button
      4. Assert success feedback
      5. Assert weight change vs yesterday displayed (if yesterday data exists)
    Expected Result: 体重记录成功并显示变化
    Failure Indicators: save failed, no change display
    Evidence: .sisyphus/evidence/task-30-weight-input.png
  ```

  **Commit**: YES (groups with UI)
  - Message: `feat(ui): weight tracking and check-in status page`
  - Files: `apps/web/src/pages/tracking/*`
  - Pre-commit: `tsc --noEmit`

- [x] 31. 进度可视化 — 体重曲线 + 营养图表

  **What to do**:
  - 在 `apps/web/src/pages/progress/` 创建：
    - `ProgressPage.tsx` — 进度可视化综合页面
  - 使用 Recharts 图表库：
    - 体重趋势折线图（30天/90天/全部）
    - 每日热量摄入 vs 目标柱状图（最近7天）
    - 营养素分布饼图（蛋白质/碳水/脂肪 比例）
    - 打卡完成率趋势（最近30天）
  - 图表支持时间范围筛选（7天/30天/90天/全部）
  - 图表颜色使用设计系统定义的主题色
  - 数据为空时显示"暂无数据"提示

  **Must NOT do**:
  - 不做实时数据更新（刷新即可）
  - 不使用 D3.js（Recharts 更简单适合此场景）

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 数据可视化是核心视觉任务
  - **Skills**: [`frontend-ui-ux`, `playwright`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: Tasks 43, 44
  - **Blocked By**: Tasks 7, 22, 17

  **References**:

  **External References**:
  - Recharts: https://recharts.org/en-US/

  **Acceptance Criteria**:
  - [ ] 体重折线图正确渲染
  - [ ] 热量柱状图显示 vs 目标对比
  - [ ] 营养素饼图比例正确
  - [ ] 时间范围筛选可用
  - [ ] 空数据状态友好

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: 图表渲染验证
    Tool: Playwright
    Preconditions: User has ≥ 7 days of tracking data
    Steps:
      1. Navigate to /progress
      2. Assert weight chart SVG rendered with data points
      3. Assert calorie bar chart visible
      4. Click "30天" filter — assert chart updates
      5. Screenshot full page
    Expected Result: 所有图表正确渲染和筛选
    Failure Indicators: blank charts, wrong data points
    Evidence: .sisyphus/evidence/task-31-charts.png

  Scenario: 空数据状态
    Tool: Playwright
    Preconditions: New user with no tracking data
    Steps:
      1. Navigate to /progress
      2. Assert "暂无数据" message visible
      3. Assert no broken chart components
    Expected Result: 空数据优雅处理
    Failure Indicators: JS errors, broken layout
    Evidence: .sisyphus/evidence/task-31-empty-state.png
  ```

  **Commit**: YES (groups with UI)
  - Message: `feat(ui): progress visualization with weight, calorie, and nutrition charts`
  - Files: `apps/web/src/pages/progress/*`
  - Pre-commit: `tsc --noEmit`

- [x] 32. 激励系统 — 打卡天数 + 成就徽章

  **What to do**:
  - 在 `apps/server/src/modules/achievement/` 创建后端：
    - `achievement.controller.ts` — GET /api/achievements, GET /api/achievements/badges
    - `achievement.service.ts` — 成就检查和解锁逻辑
  - 在 `apps/web/src/pages/achievement/` 创建前端：
    - `AchievementPage.tsx` — 成就展示页面
  - 成就类型：
    - 连续打卡：3天、7天、14天、30天、60天、100天
    - 体重里程碑：减重1kg、3kg、5kg、10kg
    - 使用里程碑：首次生成计划、首次拍照分析、收藏10个食谱
    - 健康达标：连续7天热量在目标范围内
  - 每个成就有：图标、名称、描述、解锁条件、解锁时间
  - 新成就解锁时弹出庆祝动画（confetti + toast）
  - 成就检查触发时机：打卡时、记录体重时、生成食谱时

  **Must NOT do**:
  - 不做排行榜（无社交功能）
  - 不做积分兑换系统（预留架构但不实现）

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 前后端联动 + 复杂触发逻辑
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (after Task 22)
  - **Parallel Group**: Wave 4
  - **Blocks**: Task 33
  - **Blocked By**: Task 22

  **References**:

  **Pattern References**:
  - `packages/shared/src/types/achievement.ts` — Achievement 类型
  - `apps/server/src/db/schema/achievements.ts` — 数据库表

  **Acceptance Criteria**:
  - [ ] GET /api/achievements 返回用户成就列表（已解锁 + 未解锁）
  - [ ] 连续打卡 3 天后自动解锁"坚持3天"成就
  - [ ] 新成就解锁有庆祝动画
  - [ ] 成就页面展示所有成就和解锁状态

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: 成就解锁验证
    Tool: Playwright + Bash (curl)
    Preconditions: User with 2 days consecutive check-ins
    Steps:
      1. POST /api/tracking/checkin for day 3 (complete 3 meals)
      2. GET /api/achievements — verify "坚持3天" is unlocked
      3. Navigate to achievement page — verify badge displayed with unlock date
    Expected Result: 连续打卡成就自动解锁
    Failure Indicators: achievement not unlocked, missing badge
    Evidence: .sisyphus/evidence/task-32-achievement-unlock.png

  Scenario: 庆祝动画
    Tool: Playwright
    Preconditions: Achievement about to be unlocked
    Steps:
      1. Trigger achievement unlock action
      2. Assert confetti animation appears — timeout: 3s
      3. Assert toast notification with achievement name
    Expected Result: 解锁时有庆祝效果
    Failure Indicators: no animation, no toast
    Evidence: .sisyphus/evidence/task-32-celebration.png
  ```

  **Commit**: YES
  - Message: `feat(achievement): gamification system with badges and streak rewards`
  - Files: `apps/server/src/modules/achievement/*, apps/web/src/pages/achievement/*`
  - Pre-commit: `vitest run`

- [x] 33. AI 励志反馈 + 每日总结页面

  **What to do**:
  - 在 `apps/web/src/pages/summary/` 创建：
    - `DailySummaryPage.tsx` — 每日总结展示页面
  - 页面内容：
    - AI 生成的当日总结文字（鼓励性语气）
    - 今日数据卡片：实际热量 vs 目标、打卡完成率、体重变化
    - 明日计划预告
    - AI 励志语句（每日不同）
    - 如果全部完成显示特殊庆祝 UI
  - 总结页面入口：从主页 banner 或推送通知进入
  - 历史总结可回看（列表 + 详情）

  **Must NOT do**:
  - 不生成总结（调用已有 API）
  - 不做社交分享

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 情感化设计和数据展示
  - **Skills**: [`frontend-ui-ux`, `playwright`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: Tasks 43, 44
  - **Blocked By**: Tasks 7, 19, 32

  **References**:

  **Pattern References**:
  - `apps/server/src/modules/summary/` — 总结 API

  **Acceptance Criteria**:
  - [ ] 每日总结页面显示 AI 反馈
  - [ ] 显示今日数据对比
  - [ ] 显示明日计划预告
  - [ ] 历史总结可回看
  - [ ] 全部完成有庆祝 UI

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: 每日总结展示
    Tool: Playwright
    Preconditions: User has today's summary generated
    Steps:
      1. Navigate to /summary/today
      2. Assert AI feedback text visible and in Chinese
      3. Assert data cards show actual vs target calories
      4. Assert tomorrow preview section exists
    Expected Result: 总结页面完整展示所有信息
    Failure Indicators: missing sections, English text, no data
    Evidence: .sisyphus/evidence/task-33-daily-summary.png
  ```

  **Commit**: YES (groups with UI)
  - Message: `feat(ui): daily summary page with AI motivational feedback`
  - Files: `apps/web/src/pages/summary/*`
  - Pre-commit: `tsc --noEmit`

- [x] 34. 购物清单页面

  **What to do**:
  - 在 `apps/web/src/pages/shopping/` 创建：
    - `ShoppingListPage.tsx` — 购物清单页面
  - 功能：
    - 按分类分组显示食材（蔬菜、肉类、调味料等）
    - 每项显示：名称 + 总用量 + 勾选框
    - 一键生成本周购物清单按钮
    - 可勾选已购买项（划线样式）
    - 显示已购/总数 进度
    - 常备调味料标注（灰色字体提示"可能已有"）
    - 手动添加额外购买项

  **Must NOT do**:
  - 不做电商对接
  - 不做价格信息

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 清单 UI 需要良好的交互设计
  - **Skills**: [`frontend-ui-ux`, `playwright`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: Tasks 43, 44
  - **Blocked By**: Tasks 7, 24

  **References**:

  **Pattern References**:
  - `apps/server/src/modules/shopping/` — 购物清单 API

  **Acceptance Criteria**:
  - [ ] 清单按分类显示
  - [ ] 勾选状态可保存
  - [ ] 进度显示正确
  - [ ] 手动添加项可用

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: 购物清单交互
    Tool: Playwright
    Preconditions: Shopping list generated
    Steps:
      1. Navigate to /shopping
      2. Assert items grouped by category
      3. Click checkbox on first item — assert strikethrough style
      4. Assert progress counter updates (e.g., "1/15 已购")
    Expected Result: 清单交互流畅
    Failure Indicators: no groups, checkbox not working, wrong count
    Evidence: .sisyphus/evidence/task-34-shopping-list.png
  ```

  **Commit**: YES (groups with UI)
  - Message: `feat(ui): shopping list page with categorized items and progress`
  - Files: `apps/web/src/pages/shopping/*`
  - Pre-commit: `tsc --noEmit`

- [x] 35. 营养素分布分析页面

  **What to do**:
  - 在 `apps/web/src/pages/nutrition/` 创建：
    - `NutritionPage.tsx` — 营养素分析页面
  - 展示内容：
    - 每餐营养素分布（蛋白质/碳水/脂肪/纤维）— 堆叠柱状图
    - 每日营养素总量 vs 建议摄入量
    - 各营养素占比饼图
    - 7天营养素趋势图
    - 建议调整提示（如蛋白质不足、碳水过多）

  **Must NOT do**:
  - 不做微量元素分析（维生素、矿物质）
  - 不做精确到克的营养计算

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 数据可视化
  - **Skills**: [`frontend-ui-ux`, `playwright`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: Tasks 43, 44
  - **Blocked By**: Tasks 7, 17

  **References**:

  **External References**:
  - Recharts: https://recharts.org/

  **Acceptance Criteria**:
  - [ ] 营养素饼图正确显示比例
  - [ ] 每日数据 vs 建议量有对比
  - [ ] 7天趋势图可用

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: 营养分析展示
    Tool: Playwright
    Preconditions: User has recipe data with nutrition
    Steps:
      1. Navigate to /nutrition
      2. Assert pie chart rendered with protein/carbs/fat segments
      3. Assert recommendation text visible if nutrition is unbalanced
    Expected Result: 营养分析图表正确展示
    Failure Indicators: blank chart, wrong percentages
    Evidence: .sisyphus/evidence/task-35-nutrition.png
  ```

  **Commit**: YES (groups with UI)
  - Message: `feat(ui): nutrition breakdown analysis with charts`
  - Files: `apps/web/src/pages/nutrition/*`
  - Pre-commit: `tsc --noEmit`

- [x] 36. 外出就餐记录页面

  **What to do**:
  - 在 `apps/web/src/pages/dining-out/` 创建：
    - `DiningOutPage.tsx` — 外出就餐记录页面
  - 功能：
    - 记录方式：文字描述（"吃了一碗牛肉面"）或拍照（跳转食物分析）
    - AI 根据描述估算热量
    - 记录到当日指定餐次
    - 历史外出就餐记录查看
    - 快捷入口：常见外出选项（食堂、快餐、餐厅）

  **Must NOT do**:
  - 不做餐厅推荐
  - 不对接外卖平台

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 表单交互设计
  - **Skills**: [`frontend-ui-ux`, `playwright`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: Tasks 43, 44
  - **Blocked By**: Tasks 7, 18

  **References**:

  **Acceptance Criteria**:
  - [ ] 文字描述方式可用
  - [ ] AI 估算热量并显示
  - [ ] 记录关联到当日餐次
  - [ ] 拍照入口可跳转到食物分析

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: 文字描述记录
    Tool: Playwright
    Preconditions: Logged in user
    Steps:
      1. Navigate to /dining-out
      2. Input "午餐吃了一碗兰州牛肉面"
      3. Select meal type "午餐"
      4. Click "AI估算热量"
      5. Assert calorie estimate displayed (e.g., ~500kcal)
      6. Click "记录" — assert success
    Expected Result: 文字描述成功估算并记录
    Failure Indicators: no estimate, record failed
    Evidence: .sisyphus/evidence/task-36-dining-out.png
  ```

  **Commit**: YES (groups with UI)
  - Message: `feat(ui): dining out record page with AI calorie estimation`
  - Files: `apps/web/src/pages/dining-out/*`
  - Pre-commit: `tsc --noEmit`

- [x] 37. AI 配置设置页面

  **What to do**:
  - 在 `apps/web/src/pages/settings/` 创建：
    - `AIConfigPage.tsx` — AI 配置设置页面
  - 功能：
    - 开关：使用平台默认 AI / 使用自定义 AI
    - 自定义表单：Base URL、API Key（密码输入框）、模型选择（下拉 + 自定义输入）
    - 预设模型选项：gpt-4o, gpt-4o-mini, deepseek-chat, claude-3.5-sonnet
    - "测试连接" 按钮 — 发送测试请求验证配置可用
    - API Key 显示脱敏（已保存的 key 只显示 sk-a***...***xy）
    - 当前配置状态显示（已连接/未配置/连接失败）

  **Must NOT do**:
  - 不显示完整 API Key
  - 不做 API 用量统计展示

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 配置表单 + 状态展示
  - **Skills**: [`frontend-ui-ux`, `playwright`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: Tasks 43, 44
  - **Blocked By**: Tasks 7, 14

  **References**:

  **Pattern References**:
  - `apps/server/src/modules/ai/ai-config.controller.ts` — AI 配置 API

  **Acceptance Criteria**:
  - [ ] 自定义 AI 配置可保存
  - [ ] API Key 脱敏显示
  - [ ] "测试连接" 按钮可用
  - [ ] 可切换平台默认/自定义

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: AI 配置切换和测试
    Tool: Playwright
    Preconditions: Logged in user
    Steps:
      1. Navigate to /settings/ai
      2. Toggle "使用自定义 AI" switch ON
      3. Fill base_url = "https://api.openai.com/v1"
      4. Fill api_key = "sk-test1234567890"
      5. Select model "gpt-4o"
      6. Click "测试连接" — wait for result
      7. Click "保存"
      8. Refresh — verify api_key shows "sk-t***...***90"
    Expected Result: 配置保存成功，Key 脱敏显示
    Failure Indicators: full key displayed, save failed
    Evidence: .sisyphus/evidence/task-37-ai-config.png
  ```

  **Commit**: YES (groups with UI)
  - Message: `feat(ui): AI provider configuration page`
  - Files: `apps/web/src/pages/settings/*`
  - Pre-commit: `tsc --noEmit`

- [ ] 38. 推送通知/提醒系统

  **What to do**:
  - 在 `apps/server/src/modules/notification/` 创建：
    - `notification.service.ts` — 通知管理服务
    - `notification.controller.ts` — GET /api/notifications, PATCH /api/notifications/:id/read
  - 使用 Web Push API（Service Worker）实现浏览器推送
  - 通知类型：
    - 餐前提醒（早上7:30、中午11:30、下午17:30）
    - 打卡提醒（晚上20:00 如果今天还没打完卡）
    - 成就解锁通知
    - 每日总结提醒（晚上21:00）
  - 通知设置：用户可以开关各类通知
  - 应用内通知中心（铃铛图标 + 未读数 + 列表）
  - 使用 node-cron 定时触发

  **Must NOT do**:
  - 不做邮件通知
  - 不做短信通知
  - 不做原生 App 推送（Web Push only）

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Service Worker + 定时任务
  - **Skills**: [`playwright`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: Tasks 43, 44
  - **Blocked By**: Task 8

  **References**:

  **External References**:
  - Web Push API: https://developer.mozilla.org/en-US/docs/Web/API/Push_API
  - web-push npm: https://github.com/web-push-libs/web-push

  **Acceptance Criteria**:
  - [ ] Service Worker 注册成功
  - [ ] 通知权限请求可弹出
  - [ ] 应用内通知列表可显示
  - [ ] 通知可标记已读
  - [ ] 用户可开关各类通知

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: 应用内通知中心
    Tool: Playwright
    Preconditions: User has unread notifications
    Steps:
      1. Assert notification bell icon shows unread badge count
      2. Click bell icon — assert notification dropdown/page opens
      3. Click a notification — assert marked as read, badge count decreases
    Expected Result: 通知中心正常工作
    Failure Indicators: wrong count, notification not opening
    Evidence: .sisyphus/evidence/task-38-notification.png
  ```

  **Commit**: YES
  - Message: `feat(notification): push notification system with Web Push API`
  - Files: `apps/server/src/modules/notification/*, apps/web/src/service-worker.ts`
  - Pre-commit: `vitest run`

- [x] 39. 数据导出功能

  **What to do**:
  - 在 `apps/server/src/modules/export/` 创建：
    - `export.controller.ts` — GET /api/export/data?format=json|csv
    - `export.service.ts` — 聚合用户数据并导出
  - 在 `apps/web/src/pages/settings/` 扩展数据导出 UI
  - 导出内容：
    - 个人信息（脱敏后）
    - 体重记录历史
    - 打卡记录
    - 收藏的食谱
    - 成就记录
  - 支持 JSON 和 CSV 格式
  - 大数据量使用流式导出
  - 导出前需确认（弹窗提示包含哪些数据）

  **Must NOT do**:
  - 不导出 AI 配置中的 API Key
  - 不导出其他用户的数据

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 数据聚合 + 文件生成
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: Tasks 43, 44
  - **Blocked By**: Tasks 12, 22, 17

  **References**:

  **Acceptance Criteria**:
  - [ ] GET /api/export/data?format=json 返回 JSON 文件
  - [ ] GET /api/export/data?format=csv 返回 CSV 文件
  - [ ] 导出不包含 API Key
  - [ ] 前端有确认弹窗

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: JSON 导出
    Tool: Bash (curl)
    Preconditions: User with tracking and recipe data
    Steps:
      1. GET /api/export/data?format=json — Expected: 200, Content-Type: application/json
      2. Verify response contains weight_entries[], recipes[], achievements[]
      3. Verify NO api_key field in response
    Expected Result: 完整数据导出，无敏感信息
    Failure Indicators: missing data sections, api_key present
    Evidence: .sisyphus/evidence/task-39-export-json.txt
  ```

  **Commit**: YES
  - Message: `feat(export): user data export in JSON and CSV formats`
  - Files: `apps/server/src/modules/export/*, apps/web/src/pages/settings/*`
  - Pre-commit: `vitest run`

### Wave 5 — Admin + Polish (管理后台 + 收尾)

- [x] 40. 管理后台 — 用户管理

  **What to do**:
  - 在 `apps/admin/src/pages/` 创建：
    - `UsersPage.tsx` — 用户列表页面
    - `UserDetailPage.tsx` — 用户详情页面
  - 在 `apps/server/src/modules/admin/` 创建：
    - `admin.middleware.ts` — 管理员权限验证（role=admin）
    - `admin-user.controller.ts` — GET /api/admin/users (分页+搜索), GET /api/admin/users/:id
  - 功能：
    - 用户列表（分页、搜索、排序）
    - 用户详情查看（profile、注册时间、最近活跃、打卡统计）
    - 用户禁用/启用
    - 用户统计：总用户数、今日活跃、本周新增
  - Admin 登录使用同一套认证系统，角色区分

  **Must NOT do**:
  - 不做用户数据修改（只读 + 禁用操作）
  - 不做批量操作

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 管理后台表格和列表 UI
  - **Skills**: [`frontend-ui-ux`, `playwright`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5 (with Tasks 41-46)
  - **Blocks**: Tasks 43, 44
  - **Blocked By**: Tasks 8, 12

  **References**:

  **Pattern References**:
  - `apps/server/src/modules/auth/auth.middleware.ts` — 认证中间件模式

  **Acceptance Criteria**:
  - [ ] Admin 登录后可访问用户列表
  - [ ] 列表支持分页和搜索
  - [ ] 普通用户无法访问 admin 页面
  - [ ] 用户统计数据正确

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: 管理后台访问控制
    Tool: Bash (curl) + Playwright
    Preconditions: Admin user and regular user tokens
    Steps:
      1. GET /api/admin/users with regular user token — Expected: 403
      2. GET /api/admin/users with admin token — Expected: 200, paginated list
      3. Navigate to /admin with regular user — Expected: redirect to /login or 403 page
    Expected Result: 只有管理员可访问后台
    Failure Indicators: regular user sees admin data
    Evidence: .sisyphus/evidence/task-40-admin-access.txt

  Scenario: 用户列表和搜索
    Tool: Playwright
    Preconditions: Admin logged in, ≥ 5 users in system
    Steps:
      1. Navigate to /admin/users
      2. Assert table shows user list with ≥ 5 rows
      3. Type "test" in search box — assert list filters
      4. Click user row — assert detail page opens
    Expected Result: 用户管理功能正常
    Failure Indicators: empty list, search not working
    Evidence: .sisyphus/evidence/task-40-user-list.png
  ```

  **Commit**: YES
  - Message: `feat(admin): user management dashboard with search and stats`
  - Files: `apps/admin/src/pages/*, apps/server/src/modules/admin/*`
  - Pre-commit: `vitest run`

- [x] 41. 管理后台 — AI 配置 + 数据统计

  **What to do**:
  - 在 `apps/admin/src/pages/` 创建：
    - `AIConfigPage.tsx` — 平台默认 AI 配置管理
    - `DashboardPage.tsx` — 数据统计仪表板
  - AI 配置管理：
    - 设置平台默认 baseURL/apiKey/model
    - 查看 AI 调用统计（总调用次数、今日调用、平均响应时间）
    - 测试连接功能
  - 数据统计仪表板：
    - 总用户数 + 增长趋势
    - 今日/本周/本月活跃用户
    - AI 调用次数统计
    - 热门菜谱 Top 10（被收藏最多的）
    - 用户打卡完成率

  **Must NOT do**:
  - 不做实时监控
  - 不做告警系统

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 仪表板数据可视化
  - **Skills**: [`frontend-ui-ux`, `playwright`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5 (with Tasks 40, 42-46)
  - **Blocks**: Tasks 43, 44
  - **Blocked By**: Tasks 14, 22

  **References**:

  **Pattern References**:
  - `apps/server/src/modules/ai/ai-config.controller.ts` — AI 配置 API

  **Acceptance Criteria**:
  - [ ] Admin 可设置平台默认 AI 配置
  - [ ] 统计仪表板显示关键指标
  - [ ] 图表正确渲染

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: 管理仪表板数据
    Tool: Playwright
    Preconditions: Admin logged in, system has data
    Steps:
      1. Navigate to /admin/dashboard
      2. Assert stat cards show: total users, active today, AI calls
      3. Assert charts rendered (user growth, top recipes)
    Expected Result: 仪表板数据完整
    Failure Indicators: zero values everywhere, blank charts
    Evidence: .sisyphus/evidence/task-41-dashboard.png
  ```

  **Commit**: YES (groups with admin)
  - Message: `feat(admin): AI configuration and analytics dashboard`
  - Files: `apps/admin/src/pages/*`
  - Pre-commit: `tsc --noEmit`

- [x] 42. 周/月健康报告 — AI 生成

  **What to do**:
  - 在 `apps/server/src/modules/report/` 创建：
    - `report.controller.ts` — POST /api/report/generate, GET /api/report/weekly, GET /api/report/monthly
    - `report.service.ts` — 聚合数据 + 调用 AI 生成分析报告
    - `report.prompts.ts` — 报告 prompt 模板
  - 在 `apps/web/src/pages/report/` 创建：
    - `ReportPage.tsx` — 健康报告展示页面
  - 报告内容：
    - 体重变化趋势分析
    - 饮食计划执行率
    - 营养素摄入分析
    - AI 总结和建议（下周重点改进方向）
    - 成就回顾（本周解锁的成就）
  - 周报每周一自动生成，月报每月1号自动生成
  - 历史报告可查看

  **Must NOT do**:
  - 不做 PDF 导出（本期）
  - 不做对比报告（与上周/上月对比）

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 数据聚合 + AI 报告生成
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5 (with Tasks 40-41, 43-46)
  - **Blocks**: Tasks 43, 44
  - **Blocked By**: Tasks 19, 31

  **References**:

  **Pattern References**:
  - `apps/server/src/modules/summary/summary.service.ts` — 数据聚合模式
  - `apps/server/src/modules/ai/ai.prompts.ts` — Prompt 模板模式

  **Acceptance Criteria**:
  - [ ] POST /api/report/generate?type=weekly 返回周报
  - [ ] 报告包含体重趋势、执行率、营养分析、AI 建议
  - [ ] 前端报告页面完整展示
  - [ ] 定时任务可触发

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: 周报生成和展示
    Tool: Bash (curl) + Playwright
    Preconditions: User has ≥ 7 days of data
    Steps:
      1. POST /api/report/generate?type=weekly — Expected: 201
      2. GET /api/report/weekly — Expected: 200, report with all sections
      3. Navigate to /report — assert report renders with charts and AI text
    Expected Result: 完整周报生成和展示
    Failure Indicators: missing sections, AI text empty
    Evidence: .sisyphus/evidence/task-42-weekly-report.png
  ```

  **Commit**: YES
  - Message: `feat(report): AI-generated weekly and monthly health reports`
  - Files: `apps/server/src/modules/report/*, apps/web/src/pages/report/*`
  - Pre-commit: `vitest run`

- [x] 43. 全局错误处理 + Loading 状态

  **What to do**:
  - 在 `apps/web/src/` 完善：
    - `components/ErrorBoundary.tsx` — React Error Boundary 组件
    - `components/LoadingStates.tsx` — 统一 Loading 组件（Skeleton、Spinner、FullPage Loading）
    - `components/ErrorPage.tsx` — 404、500 错误页面
    - `hooks/useApiQuery.ts` — 封装 API 请求 hook（loading / error / data 状态管理）
    - `utils/error-handler.ts` — 统一错误处理（Toast 提示 + 日志）
  - 全局 API 错误拦截：
    - 网络错误 → Toast "网络连接异常"
    - 401 → 自动刷新 token，失败则跳转登录
    - 403 → Toast "权限不足"
    - 429 → Toast "请求过于频繁，请稍后重试"
    - 500 → Toast "服务异常，请稍后重试"
  - 所有 API 请求页面加 Skeleton loading
  - 同步在 admin 应用中复制相同的错误处理

  **Must NOT do**:
  - 不做错误上报到监控平台
  - 不做自定义 500 错误详情

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 跨页面统一错误处理策略
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (after most Wave 4 tasks)
  - **Parallel Group**: Wave 5
  - **Blocks**: Task 44
  - **Blocked By**: Tasks 25-39

  **References**:

  **External References**:
  - React Error Boundaries: https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary

  **Acceptance Criteria**:
  - [ ] 404 页面正确显示
  - [ ] API 错误自动显示 Toast
  - [ ] Loading 状态有 Skeleton 效果
  - [ ] 网络断开有提示

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: 错误页面和处理
    Tool: Playwright
    Preconditions: Dev server running
    Steps:
      1. Navigate to /nonexistent-page — Expected: 404 page with "返回首页" link
      2. 断开 API 连接 — trigger API call — Expected: Toast "网络连接异常"
      3. Navigate to any data page — assert Skeleton loading appears before data loads
    Expected Result: 错误处理全面且用户友好
    Failure Indicators: blank page on 404, no error feedback, no loading state
    Evidence: .sisyphus/evidence/task-43-error-handling.png
  ```

  **Commit**: YES
  - Message: `feat(ui): global error handling, loading states, and error pages`
  - Files: `apps/web/src/components/Error*, apps/web/src/hooks/useApiQuery.ts`
  - Pre-commit: `tsc --noEmit`

- [x] 44. 响应式设计验证 + 适配优化

  **What to do**:
  - 使用 Playwright 在以下视口尺寸验证所有页面：
    - 320px (iPhone SE)
    - 375px (iPhone 12)
    - 768px (iPad)
    - 1024px (iPad Pro)
    - 1440px (Desktop)
  - 检查项目：
    - 无水平滚动条
    - 文字不溢出容器
    - 按钮可点击（不重叠）
    - 图表在小屏幕可读
    - 导航正确切换（底部 nav vs 侧栏）
    - 表单输入框大小适当
  - 修复发现的所有响应式问题
  - 为每个关键页面在各视口截图存证

  **Must NOT do**:
  - 不做暗色模式
  - 不做无障碍访问（a11y）优化（后续）

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 纯视觉验证和 CSS 修复
  - **Skills**: [`frontend-ui-ux`, `playwright`]

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on all UI tasks)
  - **Parallel Group**: Sequential
  - **Blocks**: F1-F4
  - **Blocked By**: Tasks 25-39, 43

  **References**:

  **Acceptance Criteria**:
  - [ ] 所有页面在 320px-1440px 无布局问题
  - [ ] 每个关键页面有 5 种视口的截图
  - [ ] 零水平滚动条
  - [ ] 导航正确切换

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: 全页面响应式验证
    Tool: Playwright
    Preconditions: All pages built and functional
    Steps:
      For each page in [/login, /, /recipe/today, /tracking, /progress, /profile, /settings/ai]:
        For each viewport in [320x568, 375x812, 768x1024, 1440x900]:
          1. Set viewport
          2. Navigate to page
          3. Assert no horizontal scroll: document.documentElement.scrollWidth <= window.innerWidth
          4. Screenshot
    Expected Result: 所有页面在所有视口正常
    Failure Indicators: horizontal scroll, overlapping elements, hidden content
    Evidence: .sisyphus/evidence/task-44-responsive-{page}-{viewport}.png
  ```

  **Commit**: YES
  - Message: `fix(ui): responsive design fixes across all viewports`
  - Files: various CSS/component files
  - Pre-commit: `tsc --noEmit`

- [ ] 45. Docker Compose 完整部署配置

  **What to do**:
  - 更新 `docker-compose.yml` 和 `docker-compose.prod.yml`：
    - 确保所有服务正确连接
    - 添加健康检查（healthcheck）
    - 配置 PostgreSQL 初始化脚本
    - 配置 Redis
    - 配置 Nginx 反向代理（前端 + API）
    - 环境变量通过 .env 文件注入
    - 数据卷持久化（PostgreSQL data, uploads）
  - 创建 `scripts/deploy.sh` — 一键部署脚本
  - 创建 `scripts/init-db.sh` — 数据库初始化脚本
  - 更新 `.env.example` 包含所有环境变量
  - 添加 docker-compose 网络隔离

  **Must NOT do**:
  - 不配置 HTTPS（由部署环境的 reverse proxy 处理）
  - 不做 K8s 配置
  - 不做 CI/CD 配置

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Docker 配置是标准化工作
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on all apps being buildable)
  - **Parallel Group**: Sequential (after all build tasks)
  - **Blocks**: F1-F4
  - **Blocked By**: All previous tasks

  **References**:

  **Acceptance Criteria**:
  - [ ] `docker compose up -d` 启动所有服务
  - [ ] 健康检查通过
  - [ ] API 通过 Nginx 可访问
  - [ ] 前端通过 Nginx 可访问
  - [ ] 数据持久化重启不丢失

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Docker 完整部署
    Tool: Bash
    Preconditions: Docker daemon running
    Steps:
      1. Run `docker compose up -d` — Expected: all services start
      2. Run `docker compose ps` — Expected: all services "healthy" or "running"
      3. curl http://localhost/api/health — Expected: {"status":"ok"}
      4. curl http://localhost — Expected: HTML response (frontend)
      5. Run `docker compose down && docker compose up -d` — verify data persists
    Expected Result: 完整部署成功，数据持久化
    Failure Indicators: service crashes, unhealthy status, data lost
    Evidence: .sisyphus/evidence/task-45-docker-deploy.txt
  ```

  **Commit**: YES
  - Message: `feat(deploy): production-ready Docker Compose deployment`
  - Files: `docker-compose*.yml, scripts/*, nginx.conf, .env.example`
  - Pre-commit: `docker compose config`

- [ ] 46. 端到端集成测试

  **What to do**:
  - 在 `apps/web/e2e/` 创建 Playwright E2E 测试：
    - `auth.e2e.ts` — 注册 → 登录 → 设置 profile 完整流程
    - `plan.e2e.ts` — 创建饮食计划 → 查看食谱 → 打卡
    - `tracking.e2e.ts` — 记录体重 → 查看进度图表
    - `food-analysis.e2e.ts` — 上传食物图片 → 查看分析结果
  - 配置 Playwright test runner
  - 测试使用独立的测试数据库
  - 每个测试前重置数据库状态

  **Must NOT do**:
  - 不测试第三方 OAuth 真实流程（mock）
  - 不测试 AI 真实调用（mock 响应）

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: E2E 测试需要全面的场景覆盖
  - **Skills**: [`playwright`]

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on all features)
  - **Parallel Group**: Sequential
  - **Blocks**: F1-F4
  - **Blocked By**: All previous tasks

  **References**:

  **External References**:
  - Playwright testing: https://playwright.dev/docs/intro

  **Acceptance Criteria**:
  - [ ] 所有 E2E 测试通过
  - [ ] 测试覆盖核心用户流程
  - [ ] 测试可在 CI 环境运行

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: E2E 测试套件执行
    Tool: Bash
    Preconditions: All services running with test database
    Steps:
      1. Run `npx playwright test` — Expected: all tests pass
      2. Verify test report generated
    Expected Result: 所有端到端测试通过
    Failure Indicators: test failures, flaky tests
    Evidence: .sisyphus/evidence/task-46-e2e-results.txt
  ```

  **Commit**: YES
  - Message: `test(e2e): end-to-end integration tests for core user flows`
  - Files: `apps/web/e2e/*`
  - Pre-commit: `npx playwright test`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [ ] F1. **Plan Compliance Audit** — `oracle`
      Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
      Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
      Run `tsc --noEmit` + ESLint + `vitest run`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names (data/result/item/temp).
      Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill)
      Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration (features working together). Test edge cases: empty state, invalid input, rapid actions. Save to `.sisyphus/evidence/final-qa/`.
      Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
      For each task: read "What to do", read actual diff. Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination. Flag unaccounted changes.
      Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

| Wave | Commit | Message                                                                  | Files            | Pre-commit             |
| ---- | ------ | ------------------------------------------------------------------------ | ---------------- | ---------------------- |
| 1    | 1      | `chore(init): project scaffolding with monorepo structure`               | all Wave 1 files | `tsc --noEmit`         |
| 2    | 2      | `feat(auth): authentication system with email, SMS, WeChat, Google`      | auth modules     | `vitest run`           |
| 2    | 3      | `feat(ai): AI service abstraction layer with configurable providers`     | AI service       | `vitest run`           |
| 3    | 4      | `feat(plan): AI diet plan and recipe generation`                         | plan + recipe    | `vitest run`           |
| 3    | 5      | `feat(tracking): weight tracking, meal check-in, and allergy management` | tracking modules | `vitest run`           |
| 4    | 6      | `feat(ui): auth and profile pages`                                       | frontend auth    | `tsc --noEmit`         |
| 4    | 7      | `feat(ui): diet plan, recipe, and food analysis pages`                   | frontend core    | `tsc --noEmit`         |
| 4    | 8      | `feat(ui): tracking, motivation, and utility pages`                      | frontend extras  | `tsc --noEmit`         |
| 5    | 9      | `feat(admin): admin panel with user management and AI config`            | admin            | `tsc --noEmit`         |
| 5    | 10     | `feat(deploy): Docker Compose production deployment`                     | docker           | `docker compose build` |
| 5    | 11     | `test(e2e): end-to-end integration tests`                                | test files       | `vitest run`           |

---

## Success Criteria

### Verification Commands

```bash
# Build check
cd apps/web && npm run build        # Expected: Build successful
cd apps/server && npm run build     # Expected: Build successful
cd apps/admin && npm run build      # Expected: Build successful

# Type check
npx tsc --noEmit                    # Expected: No errors

# Tests
npx vitest run                      # Expected: All tests pass

# Docker
docker compose build                # Expected: All images built
docker compose up -d                # Expected: All services healthy

# API health check
curl http://localhost:3000/api/health  # Expected: {"status":"ok"}

# Frontend accessible
curl -s http://localhost:5173 | head  # Expected: HTML response
```

### Final Checklist

- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All tests pass
- [ ] Docker deployment works
- [ ] Mobile responsive verified (320px, 768px, 1440px)
- [ ] AI plan generation returns valid Chinese recipes
- [ ] Auth flows complete (email, SMS, WeChat, Google)
- [ ] Admin panel accessible and functional
