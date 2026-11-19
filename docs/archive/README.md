# 归档文档

**状态**: 只读，不得作为实现依据
**建立日期**: 2026-11-13
**最近更新**: 2026-11-15（新增 2026-11 批次）

本目录存放**已失效、已被取代或前提已变更**的历史文档。它们被移出 `web/docs/` 的唯一原因是：那是一个活跃目录，留在里面会被误读为现行需求。

## 1. 归档规则

文档满足以下任一条件时移入本目录，并在文件头保留状态横幅：

| 条件 | 判断依据 |
|---|---|
| 功能已不存在 | 描述的代码已删除，仓库内无对应实现 |
| 已被新文档取代 | 有明确的上位替代文档，且新文档已声明生效 |
| 前提已变更 | 方案的核心假设被后续决策推翻 |
| 一次性操作记录 | 配置清单、迁移脚本说明、审计快照，不具备长期效力 |

不归档：现行规范、仍被引用的实现细节、明确标注为「参考素材」的设计基准。

## 2. 索引

### 2026-11 · 旧产品框架（被重新设计取代）

产品框架于 2026-11-15 按新方案从零重写，不再沿用旧 PRD 的章节结构与编号。旧框架相关文档整体移出活跃目录。

| 文件 | 内容 | 失效原因 | 现行替代 |
|---|---|---|---|
| [`PRD.md`](./2026-11/PRD.md) | 旧框架产品需求（2.3.0，39 条 FR，含「仓库 / 分支 / 任务 / 提交」四层模型与三种视图） | 对象模型已被单根分支树（5 个对象）取代；入口从 3 个改为 4 个 | `docs/FRAMEWORK.md` |
| [`ROADMAP.md`](./2026-11/ROADMAP.md) | 旧阶段规划（1.3.0，M-01~M-13 / V1-01~V1-12 / V2-01~V2-06） | 编号体系与阶段边界随框架重写全部作废 | `docs/FRAMEWORK.md` §7 |
| [`web/PRD.md`](./2026-11/web/PRD.md) | 2026-07 的 Web 端实现需求 | 旧命名时期的一次性实现需求，产品定义已失效 | `docs/FRAMEWORK.md` |
| [`web/TASKS.md`](./2026-11/web/TASKS.md) | 2026-07 的 Web 端开发任务清单 | 同上；任务划分不再对应当前计划 | `docs/FRAMEWORK.md` §9 |

> 这四份文档的价值只在**历史基线**：核对「当时打算做什么」「当时的质量数据是多少」。不要从中沿用任何对象名、编号或验收口径。

### 2026-11 · 旧视觉体系（整体作废，待重新设计）

2026-11-15 决定：全仓库视觉体系重做，此前并存的三套视觉规范（Linear 深色 + Commit Blue、V3 纯黑 + 绿、应用壳层深青 + 青）全部作废。在产出新版规范前，仓库内**不设视觉事实来源**。

| 文件 | 内容 | 失效原因 | 现行替代 |
|---|---|---|---|
| [`DESIGN.md`](./2026-11/visual-system/DESIGN.md) | Linear-inspired 深色设计规范（3.0.0，slate `#0F172A` + 蓝 `#3B82F6`） | 视觉体系整体重做 | 无（待重新设计） |
| [`DESIGN.reference.linear.md`](./2026-11/visual-system/DESIGN.reference.linear.md) | Linear 官方 DESIGN.md 原文 | 随 `DESIGN.md` 一并归档，仅作溯源素材 | 无 |
| [`STYLE_GUIDE.md`](./2026-11/visual-system/STYLE_GUIDE.md) | V3 工程化风格指南（纯黑 + 绿 `#80e48c`） | 同上 | 无 |
| [`v3版首页.md`](./2026-11/visual-system/v3版首页.md) | 旧落地页像素级还原规格 | 同上 | 无 |
| [`commit-homepage-light-dark-design-tokens.md`](./2026-11/visual-system/commit-homepage-light-dark-design-tokens.md) | 旧首页深浅色 token 提取 | 同上 | 无 |
| [`website-design-token-extractor.md`](./2026-11/visual-system/website-design-token-extractor.md) | 截图取 token 的提示词模板 | 同上 | 无 |

> 同时删除的还有仓库根的 `AGENTS.md`、`CLAUDE.md` 与 `web/AGENTS.md`、`web/CLAUDE.md` 四份 Agent 约束文件。它们大量条款绑定旧视觉体系与旧工作边界（如「应用壳层页面不得改动」），留着会与改版直接冲突。工程细则（分层、命名、测试、门禁）将在新方案定稿后重写一份。

### 2026-07 · Web 端设计与认证方案

| 文件 | 内容 | 失效原因 | 现行替代 |
|---|---|---|---|
| [`UI_DESIGN_PROPOSAL.md`](./2026-07/UI_DESIGN_PROPOSAL.md) | 1,336 行的 Web 端 UI/UX 提案（v2.0.0） | `CommitToDo` 品牌与「企业级 UI 规格」方向废弃；全仓库无引用 | 无（旧视觉体系已于 2026-11-15 整体归档） |
| [`commit-homepage-concepts/功能整理与页面清单.md`](./2026-07/commit-homepage-concepts/功能整理与页面清单.md) | 2026-07 页面与功能清单 | 以「仓库 / 分支」为信息架构 | `docs/FRAMEWORK.md` |
| [`commit-homepage-concepts/auth-modal/`](./2026-07/commit-homepage-concepts/auth-modal/spec.md) | 模拟认证弹窗 Spec / Plan / Task / Checklist（4 份） | 功能已在 `adc1828` 整体移除，`web/src` 中 0 处引用 | 无（真实登录已实现） |
| [`commit-homepage-concepts/v3-system-redesign/`](./2026-07/commit-homepage-concepts/v3-system-redesign/00-总览与页面关系.md) | 页面级设计稿与对照审计（7 份） | 视觉规格可参考，但品牌与信息架构已废弃；`06` 的审计结论基于 2026-07 的代码 | `docs/PRODUCT-STRATEGY.md`、`docs/FRAMEWORK.md` |
| [`cloudbase-authentication-plan.md`](./2026-07/cloudbase-authentication-plan.md) | 登录注册专项规划（938 行） | 「必须登录才能使用」的前提被本地模式推翻 | `web/docs/cloudbase-authentication-implementation-audit.md` |
| [`cloudbase-authentication-implementation-roadmap.md`](./2026-07/cloudbase-authentication-implementation-roadmap.md) | 登录注册实施拆分（1,050 行） | 同上；阶段划分不再等于当前计划 | 同上 |
| [`screenshots/`](./2026-07/screenshots/) | 2026-07 的页面截图（7 张） | 界面已重构，且无任何文档引用 | 无 |

另：`commit-homepage-concepts/` 下的 8 张参考截图（`今日.png`、`仓库概览.png`、`登录.png` 等）随该目录一并归档，供 `v3-system-redesign` 的设计稿对照。

## 3. 使用约束

- **不得据此实现任何功能。** 尤其 `auth-modal/` 描述的是已删除的演示登录流程。
- 引用归档内容时，必须在引用处注明「历史方案，已失效」。
- 归档文档的内部链接已改为行内代码（而非可点击链接），避免后续搬迁再次断链。

## 4. 何时可以删除

满足以下全部条件时可整目录删除：

1. 新文档已稳定运行一个完整阶段（至少一次阶段门禁通过）；
2. 无任何 issue / 讨论仍在引用归档内容；
3. `git log -- docs/archive/` 已无人回查。

删除前请确认：归档中的设计推演（尤其是 `v3-system-redesign` 与 `visual-system` 的页面构图思路）是否有值得吸收进新版视觉规范的部分。
