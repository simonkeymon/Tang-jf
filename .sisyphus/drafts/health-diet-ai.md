# Draft: 健康饮食 AI 助手

## Requirements (confirmed)

### 技术栈
- **前端**: React (Next.js) — 未来迁移到 React Native 做 App
- **后端**: Node.js
- **数据库**: PostgreSQL
- **部署**: 云服务器 + Docker 双支持

### 第三方登录
- 微信登录
- Google 登录
- 手机号验证码登录

### 目标用户
- 全部都要：减脂、增肌、通用健康饮食，根据用户目标自动适配

### 核心功能（用户明确提出）
1. **AI 制定计划** — 根据用户目标(性别/年龄/身高/体重)，生成长期饮食计划 + 每日食谱
   - 分场景：自己做饭 → 生成食材 + 做法
   - 食材食谱必须契合中国人群
2. **AI 配置** — 第三方兼容 OpenAI 协议，支持 baseURL + apiKey + 模型设置
3. **每日总结** — AI 每日结束时帮助用户总结复习 + 第二天规划
4. **体重记录 + 打卡** — 每日记录体重，餐食是否坚持打卡
5. **用户激励机制** — 连续打卡、目标达成等激励
6. **AI 拍照分析热量** — 拍照食物，AI 分析大致热量

## Technical Decisions
- **AI 配置**: 两者都支持 — 平台提供默认 AI 服务 + 用户可用自己的 Key
- **外出就餐**: 做饭为主 + 外出记录（外出时记录吃了什么，AI 帮估算热量）
- **语言**: 中文优先 + 预留 i18n 国际化能力
- **付费模式**: 暂不做 + 预留会员系统架构
- **数据同步**: 全部云端同步，多端数据一致

## Research Findings
- (pending — 需要研究 React Native 迁移最佳实践)

## Additional Decisions (Round 2)
- **拍照分析**: 复用 AI 接口的 Vision 能力（GPT-4o 等），不单独接入食物识别 API
- **食谱来源**: AI 实时生成 + 用户收藏库（喜欢的食谱可收藏，AI 可复用）
- **激励机制**: 连续打卡天数 + 成就徽章系统 + 进度可视化 + AI 励志反馈
- **管理后台**: 简单后台（用户管理、AI 配置、数据统计）

## Additional Features (Round 3 — 用户全选)
- 食物过敏/禁忌管理（AI 生成食谱时自动规避）
- 自动购物清单（按周汇总食材采购）
- 营养素分布分析（蛋白质/碳水/脂肪/纤维）
- 周/月健康报告（AI 生成趋势分析+建议）
- 一键换食谱
- 根据现有食材生成食谱
- 推送通知/提醒（餐前提醒、打卡鼓励）
- 数据导出功能

## Test Strategy Decision
- **Infrastructure exists**: NO（全新项目）
- **Automated tests**: YES — 核心模块测试（认证、AI 调用、数据模型）
- **If setting up**: 需要在计划中包含测试框架搭建
- **Agent-Executed QA**: ALWAYS（所有任务都有 QA 场景）

## Open Questions (remaining)
- NONE — all key questions answered, ready for plan generation

## Scope Boundaries
- INCLUDE:
  - 用户认证（邮箱/手机号 + 微信/Google）
  - 用户 Profile（性别/年龄/身高/体重/目标）
  - AI 长期饮食计划生成
  - 每日食谱 + 食材 + 做法（中国人群）
  - 外出就餐记录 + AI 热量估算
  - AI 每日总结 + 第二天规划
  - 体重记录 + 餐食打卡
  - 用户激励机制
  - AI 拍照食物热量分析
  - 响应式设计（手机 + 桌面）
  - AI 配置面板（baseURL/apiKey/模型）
  - Docker + 云服务器部署
  - 代码架构适合迁移到 React Native
- EXCLUDE:
  - 实际的 React Native App 开发（本期只做 Web）
  - 付费系统实现（只预留架构）
  - 社交功能（待确认）
  - 运动/健身计划（纯饮食）
  - 营养师人工咨询
