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
| [`PRD.md`](./2026-11/PRD.md) | 旧框架产品需求（2.3.0，39 条 FR，含「仓库 / 分支 / 任务 / 提交」四层模型与三种视图） | 对象模型从 4 层改为 7 个对象（领域 / 项目 / 并行线 / 待办 / 记录 / 里程碑 / 徽章）；入口从 3 个改为 4 个 | `docs/FRAMEWORK.md` |
| [`ROADMAP.md`](./2026-11/ROADMAP.md) | 旧阶段规划（1.3.0，M-01~M-13 / V1-01~V1-12 / V2-01~V2-06） | 编号体系与阶段边界随框架重写全部作废 | `docs/FRAMEWORK.md` §7 |
| [`web/PRD.md`](./2026-11/web/PRD.md) | 2026-07 的 Web 端实现需求 | 旧命名时期的一次性实现需求，产品定义已失效 | `docs/FRAMEWORK.md` |
| [`web/TASKS.md`](./2026-11/web/TASKS.md) | 2026-07 的 Web 端开发任务清单 | 同上；任务划分不再对应当前计划 | `docs/FRAMEWORK.md` §9 |

> 这四份文档的价值只在**历史基线**：核对「当时打算做什么」「当时的质量数据是多少」。不要从中沿用任何对象名、编号或验收口径。

### 2026-07 · Web 端设计与认证方案

| 文件 | 内容 | 失效原因 | 现行替代 |
|---|---|---|---|
| [`UI_DESIGN_PROPOSAL.md`](./2026-07/UI_DESIGN_PROPOSAL.md) | 1,336 行的 Web 端 UI/UX 提案（v2.0.0） | `CommitToDo` 品牌与「企业级 UI 规格」方向废弃；全仓库无引用 | `docs/DESIGN.md`、`web/docs/v3/STYLE_GUIDE.md` |
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

删除前请确认：归档中的设计推演（尤其是 `v3-system-redesign` 的页面构图思路）是否有值得吸收进 `docs/DESIGN.md` 的部分。
