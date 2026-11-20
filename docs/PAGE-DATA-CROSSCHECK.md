# 页面 × 数据核对报告

**日期**: 2026-11-21
**状态**: 核对结论与建议；表结构已在 [`TECH-ARCHITECTURE.md`](./TECH-ARCHITECTURE.md) 0.12 落定（以画稿为准的字段补全，规则见其 §5.3.3）。
**核对对象**: [`PAGE-ARCHITECTURE.md`](./archive/2026-11/PAGE-ARCHITECTURE.md)（已归档）的 12 个页面与 8 类全局层；[`TECH-ARCHITECTURE.md`](./TECH-ARCHITECTURE.md) §5.3 / §5.3.1 / §5.3.2 的表、字段、索引与 Q1–Q5。
**判定口径**: 页面元素能落到「具体表.字段」或「可执行查询」即为能接住；需要新增字段、需要新规则、或两处口径冲突的单独列出。

> **依据文档的前提问题**：`PAGE-ARCHITECTURE.md` 已归档，现行规格是 [`UI-PAGES.md`](./UI-PAGES.md)，本报告涉及页面阶段与文案的结论一律以 `UI-PAGES.md` 为准（见 §3.3 D11–D13）。

---

## 0. 结论摘要

| 结论 | 数量 | 说明 |
|---|---|---|
| 能接住 | 约 70 个数据点 | 现有 7 张业务表 + Q1–Q5 覆盖了绝大部分展示 |
| 缺字段 | 7 项（MVP/V1）+ 3 项（V2） | 其中 4 项卡住 P3 分支详情，1 项卡住 P6/P8 备份 |
| 缺派生或口径 | 14 项 | 含 3 处索引缺口、2 处文档互相矛盾 |
| 冗余可疑 | 5 项 | 2 项建议删，3 项建议明确标注为预留 |

**必须优先处理的 5 件事**

1. `branches` 缺 `goal`、`color`、`finishedAt` —— P3 页头目标、右栏颜色、"已合并于 11-02" 均无字段可落（M1–M3）。
2. `milestones` 缺 `note` —— P3 里程碑行的备注无处存（M5）。
3. 没有任何表记录本机快照 —— P6「上次备份」与 P8「7 份快照 + 计数」无法实现（M6）。
4. 任务没有 `completedAt`，周回顾与年轮只能靠 `commits.date`；必须把「完成 = 生成提交」写成规则（D5）。
5. 四个计数的软删、撤销、移动、合并后的重算规则未写，当前只有"同事务维护"一句（D6）。

**0.12 落定结果（以画稿为准，详见 `TECH-ARCHITECTURE.md` §5.3 / §5.3.3）**

| 本报告条目 | 落定方式 |
|---|---|
| M1–M4：`goal` / `color` / `finishedAt` / `dropReason` | 已补；另补 `finishedIntoId`、`droppedAt`、`pinnedAt` |
| M5：`milestones.note` | 已补（只在里程碑详情消费，行内不显示） |
| M6 / M7：`backups`、`year_reviews` | 新增两张表；**均随 V1 启用**（每日快照与备份库归 V1，见 `FRAMEWORK.md` J-02），MVP 仍 7 张 |
| D5 / D6 / D7 / D9 / D10 等口径 | 收敛为 §5.3.3 规则表 R1–R19 |
| R1 / R2 / R3 冗余 | `tasks.priority`、`users.prefs`、`commits.isBackfill` 已删；另删 `settings.fontScale` |

---

## 1. 数据基线（本次核对所用）

| 表 | 关键字段（只列核对相关） |
|---|---|
| `branches` | `_id`、`ownerId`、`parentId`、`path`、`depth`、`title`、`status`、`order`、`archivedAt`、`taskTotal`、`taskDone`、`commitCount`、`ownLastCommitAt`、时间戳、`deletedAt` |
| `tasks` | `_id`、`branchId`、`title`、`note`、`dueDate`、`plannedDate`、`status`、`priority`、`order`、时间戳、`deletedAt` |
| `commits` | `_id`、`branchId`、`sourceBranchId`、`taskId`、`date`、`summary`、`isBackfill`、`voidedAt`、时间戳、`deletedAt` |
| `milestones` | `_id`、`branchId`、`title`、`achievedAt`、`datePrecision`、时间戳、`deletedAt` |
| `badges` | `_id`、`type`、`grantedAt`、`snapshot`、`sourceEntityId`、`rev` |
| `settings` | `_id='app'`、`theme`、`fontScale`、`treeDensity`、`annotations`、`reminderEnabled`、`updatedAt` |
| `events` | `entityType`、`entityId`、`action`、`payload`、`at`、`tzOffset` |

索引：Q1 `[ownerId+parentId]`、Q2 `[ownerId+status+dueDate]` / `[ownerId+status+plannedDate]`、Q3/Q5 `[ownerId+branchId+date]`、Q4 `[ownerId+date]`。

---

## 2. 逐页映射

### P0 首页 `/`

| 区块 | 页面数据项 | 映射 | 判定 |
|---|---|---|---|
| 首屏产品窗 | 今日清单、勾选、回执、便签 | 示例常量 | 能接住（不落库，示例不得计入统计） |
| 功能卡 / 分段导航 | 今天、分支、历程 | 路由 | 能接住 |
| 今日清单卡 / 历程柱状卡 | 示例数值 | 示例常量 | 能接住 |
| 时间树产品窗 | 3 条泳道、分叉、合回 | 示例常量 | 能接住 |
| 场景卡 / CTA / 页脚 | 文案、GitHub 外链 | 静态 | 能接住 |

**结论**：首页不需要任何真实数据；但要在实现上保证示例树不进入 `branches`，否则 P2 的 `活跃 12/200` 会被污染（`UI-PAGES.md` 已明确这条）。

### P1 今天 `/today`

| 区块 | 页面数据项 | 映射 | 判定 |
|---|---|---|---|
| 1 页头 | 日期、`5 条有截止日期 · 另有 2 条无截止日期` | 设备时钟；`tasks` 计数（Q2） | 能接住，口径见 D1 |
| 2 快速添加 | 标题、识别日期、归属分支 | `tasks.title`、`dueDate`、`branchId`；默认根分支 | 能接住，规则见 D3 |
| 3 逾期组 | 标题、分支路径、截止 | `tasks.title`、`[ownerId+status+dueDate]`、`branches.path` 反查标题 | 能接住，路径显示见 D8 |
| 4 今天组 | 今日待办 | `dueDate = today` 或 `plannedDate = today`（Q2） | 能接住，口径见 D4 |
| 5 无截止组 | 无截止待办 + 条数 | `tasks.dueDate` 为空 | **索引缺口 I1** |
| 6 全部待办 | 全量表格 | `[ownerId+status]`（需新增） | **索引缺口 I1** |
| 7 回顾卡片 | 3 个数字 + 一句提问 | `commits.date`、`branches.createdAt/finishedAt` | **缺 `finishedAt`（M3）**，口径见 D5 |
| 8 停滞分支 | 分支名 + 天数（≤5） | `ownLastCommitAt` + `path` | 能接住，口径见 D6 |
| 8 最近提交 | 3 条：文案 + 分支 + 日期（**画稿无 hash**） | `commits`（Q4） | 能接住，见 D7 |

### P2 分支 `/branches`

| 区块 | 页面数据项 | 映射 | 判定 |
|---|---|---|---|
| 1 页头 | `7 条进行中 · 1 条已合并 · 1 条已放下` | `branches.status`（`[ownerId+status]`） | 能接住，归档是否计数见 D2 |
| 2 筛选条 | 状态、排序 | `status`、`archivedAt`、`updatedAt` / `ownLastCommitAt` | 能接住，排序见 I2 |
| 3 树视图 | 缩进、连接线、状态点、名称、`3/7`、最近活动 | `depth`、`parentId`、`status`、`title`、`taskDone/taskTotal`、`ownLastCommitAt`（Q1） | 能接住 |
| 4 列表视图 | 名称 / 层级 / 待办 / 提交 / 最近活动 / 状态 | 同上 + `commitCount` | 能接住 |
| 5 底部统计 | `一级分支 3 / 7`、`活跃 12 / 200` | `[ownerId+parentId]` + 过滤 `archivedAt` | 能接住，活跃定义见 D2 |

### P3 分支详情 `/branches/:id`

| 区块 | 页面数据项 | 映射 | 判定 |
|---|---|---|---|
| 1 页头 | 面包屑、H1、状态点、创建/最近活动/层级 | `path` 反查、`title`、`status`、`createdAt`、`ownLastCommitAt`、`depth` | 能接住 |
| 1 页头 | **目标一句话（可编辑）** | 无字段 | **缺 `branches.goal`（M1）** |
| 1 页头 | 收尾对话框：未完成条数、去向 | `tasks` 计数 + `parentId` | 能接住 |
| 2 进度 | `4/9` + 最近提交 | `taskDone/taskTotal`、`ownLastCommitAt` | 能接住 |
| 4 待办 | checkbox、标题、截止 | `tasks` 按 `branchId` | 能接住，**索引缺口 I3** |
| 5 提交 | 文案、日期 + 时分、缩进（**画稿无 hash**） | `commits`（Q3），`at` 精确到分钟 | 能接住，见 D7 |
| 6 子分支 | 状态、名称、进度、`第 3 层` | Q1 + `taskDone/taskTotal` | 能接住 |
| 7 里程碑 | 行内只有日期 + 标题，**备注只在里程碑详情** | `achievedAt`、`title`、`note` | 已补 `milestones.note`（M5），列表不渲染备注 |
| 8 右栏 | **颜色（7 预设）** | 无字段 | **缺 `branches.color`（M2）** |
| 8 右栏 | 父分支、创建时间、归档状态 | `parentId`、`createdAt`、`archivedAt` | 能接住 |
| 状态 | `已合并于 11-02 · 只读` | 无收尾时间字段 | **缺 `branches.finishedAt`（M3）** |
| 交互 | 放下原因必填（V1） | 无字段 | **缺 `branches.dropReason`（M4）** |

### P4 历程 `/history`

| 区块 | 页面数据项 | 映射 | 判定 |
|---|---|---|---|
| 1 页头 | 范围、分支筛选 | Q4 + `depth` / `parentId` | 能接住 |
| 2 泳道图 | 分支创建岔出 | `createdAt` + `parentId` | 能接住 |
| 2 泳道图 | 收尾汇合、放下日期 | 无字段 | **缺 `finishedAt`（M3）** |
| 2 泳道图 | 节点、提交 | `commits`（Q4） | 能接住 |
| 2 泳道图 | 停滞 >30 天、从未提交 | `ownLastCommitAt` + 子树最大值 | 能接住，口径见 D6 |
| 3 图例 | 实线/虚线/灰线 | 静态 | 能接住 |
| 4 里程碑列表 | 日期、标题、路径 | `achievedAt`、`title`、`branchId`、`path` | 能接住，精度见 D9 |
| 5 年份入口 | 可选年份 | `commits` 的 min/max `date` | 能接住 |
| 交互 | 提交详情、上下节点 | Q5 | 能接住 |

### P5 年轮 `/history/:year`（V1）

| 区块 | 页面数据项 | 映射 | 判定 |
|---|---|---|---|
| ① 数字带 | 提交数 | `commits` 按年过滤 | 能接住，口径见 D10 |
| ① 数字带 | 活跃分支数 | `commits.branchId` 去重 | 能接住 |
| ① 数字带 | 新开 | `branches.createdAt` | 能接住（是否排除根，见 D10） |
| ① 数字带 | **收尾** | 无收尾时间 | **缺 `finishedAt`（M3）** |
| ② 月分布 | 12 个月提交数 | `commits.date` 按月分组 | 能接住 |
| ③ Top 5 | 分支进度 + 占比 | `taskDone/taskTotal` + 提交分组 | 能接住 |
| ④ **年度总结（可编辑）** | 2 行文本 | 无表无字段 | **缺 `year_reviews`（M7）**，见 §4 |
| ⑤ 分享图 | 泳道缩略 + 数字 | 复用以上统计 | 能接住；分支名显示选择若需持久化，见 D14 |

### P6 我的 `/me`

| 区块 | 页面数据项 | 映射 | 判定 |
|---|---|---|---|
| 1 页头 | 固定说明 | 静态 | 能接住 |
| 2 身份行（V2） | 邮箱、同步状态、上次同步 | 本地无 `email` / `lastSyncedAt` | **V2 缺字段（M8、M9）** |
| 3 徽章区 | 类型、名称、日期 | `badges.type`、`grantedAt`；名称/图标用常量映射 | 能接住 |
| 3 徽章区 | 4 枚 / 16 枚 | `badges` 记录 | 能接住，规则见 §4 |
| 4 数据卡 | **上次备份 3 分钟前** | 无快照记录 | **缺 `backups`（M6）** |
| 4 数据卡 | 立即备份、导出、导入 | 实现能力 | 能接住 |
| 5 设置入口 | 6 行 | 静态 | 能接住 |

### P7 设置 `/settings`

| 分区 | 页面数据项 | 映射 | 判定 |
|---|---|---|---|
| 外观 | 主题、字号、树密度、注解 | `settings.theme/fontScale/treeDensity/annotations` | 能接住 |
| 数据与备份 | 上次备份 | 无快照记录 | **缺 `backups`（M6）** |
| 账号（V2） | 邮箱、显示名、密码 | `users.nickname`；`email` 缺，密码由认证方管 | **V2 缺字段（M8）** |
| 同步（V2） | 开关、上次同步、设备、冲突 | 无 `syncEnabled` / `devices` / `lastSyncedAt` | **V2 缺字段（M9）** |
| 提醒（V1） | 开关 | `settings.reminderEnabled` | 能接住 |
| 关于 | 版本、许可 | `package.json` | 能接住 |
| 危险区 | 清空本地数据 | 实现能力 | 能接住 |

### P8 数据与备份 `/data`

| 区块 | 页面数据项 | 映射 | 判定 |
|---|---|---|---|
| 2 本地快照 | 7 份、日期、分支数/提交数、恢复 | 无快照表 | **缺 `backups`（M6）** |
| 3 导出 / 导入 | 摘要计数、`schemaVersion` | 导出结构 + 计数 | 能接住 |
| 4 异地备份（V2） | **"加密包 / 密钥不出本机"** | 与「不做 E2EE」冲突 | **文案不一致（D11）** |
| 5 危险区 | 清空 | 实现能力 | 能接住 |

### P9–P11 认证

| 区块 | 页面数据项 | 映射 | 判定 |
|---|---|---|---|
| P9 登录 | 邮箱、密码 | 认证服务字段，不落本机库 | 能接住（V2） |
| P9 底部 | **"服务端只存加密块"** | 与明文备份冲突 | **文案不一致（D11）** |
| P10 注册 | 邮箱、密码、`本机 N 条待办` | 认证字段 + `tasks` 计数 | 能接住（V2） |
| P11 找回 | 邮箱、token、新密码 | 认证服务字段 | 能接住（V2） |

### 全局层（8 类）

| 层 | 页面数据项 | 映射 | 判定 |
|---|---|---|---|
| 快速添加 | 标题、日期、分支 | `tasks` + 根分支默认 | 能接住，规则见 D3 |
| 待办详情 | 标题、备注、日期、归属、历史 | `tasks` + `events` | 能接住，日期语义见 D4 |
| 提交详情 | 时间、原始分支、文案、前后节点、当天编辑 | `commits`（Q5）、`sourceBranchId`、`summary`、`voidedAt` | 能接住，hash 见 D7、跨天见 D12 |
| 搜索（V1） | 分支/待办/提交/里程碑 | 四个 `title`/`summary` 字段 | **前缀匹配覆盖不足（D13）** |
| 确认对话框 | 影响清单 | 各实体计数 | 能接住 |
| 首次引导 | 第一条待办、根分支 | `tasks.branchId` = 根 | 能接住，根规则见 D3 |
| 站内登录提示 | `next` | 路由 | 能接住 |
| 同步冲突/设备（V2） | 两次修改、设备列表 | `conflicts` 够；`devices` 缺 | **V2 缺 `devices`（M9）** |

---

## 3. 四类清单

### 3.1 能接住（摘要）

- **P2 全页**：树/列表/统计条所需字段齐备，Q1 与 `[ownerId+status]` 足够。
- **P4 泳道图的主干**：`createdAt` + `commits` + `ownLastCommitAt` + `path` 可画；只差收尾时间。
- **P1 三组待办**：`tasks` 字段齐备，Q2 命中；只差"无截止"的索引路径。
- **提交详情**：`commits` 的 `sourceBranchId`、`summary`、`voidedAt`、`taskId` + Q5 完全够用。
- **设置外观四项**：`theme`、`fontScale`、`treeDensity`、`annotations` 一一对应。
- **导出/导入**：`schemaVersion` + `fieldVersions` 已定，摘要计数可现算。

### 3.2 缺字段

| 编号 | 表 | 建议字段 | 类型 | 索引 | 支撑页面 | 说明 |
|---|---|---|---|---|---|---|
| M1 | `branches` | `goal` | `string`，≤240，可空 | 不需要 | P3 页头 | 目标一句话，页面明确可原地编辑；不能塞 `events`，因为要参与渲染与导出 |
| M2 | `branches` | `color` | `string`，7 个预设之一 | 不需要 | P3 右栏、B02/B03 | 新建时可选、子分支默认继承父；存枚举值而非色值 |
| M3 | `branches` | `finishedAt` | UTC 毫秒，可空 | `[ownerId+finishedAt]` | P3 只读条、P4 汇合、P5 收尾 | 与 `status` 配套：`merged`/`dropped` 时写入；取消归档/重新开始时清空 |
| M4 | `branches` | `dropReason` | `string`，≤240，可空 | 不需要 | P3 放下（V1） | B08 要求原因必填；同时写一条 `events` 审计 |
| M5 | `milestones` | `note` | `string`，可空 | 不需要 | P3 里程碑行、里程碑详情 | 页面有"备注 13（一行）" |
| M6 | 新表 `backups` | `_id`、`kind`、`schemaVersion`、`branchCount`、`taskCount`、`commitCount`、`size`、`storageKey`、`createdAt` | — | `[createdAt]` | P6 数据卡、P8 快照 | 只存元数据；快照本体仍是独立 DB / OPFS 文件。`kind`：`auto` / `manual` / `pre-restore` / `pre-import` |
| M7 | 新表 `year_reviews`（V1） | `_id`、`year`、`text`、`createdAt`、`updatedAt`、`rev` | — | `[ownerId+year]` | P5 年度总结 | 详见 §4.1 |
| M8 | `users`（V2） | `email` | `string` | 不需要 | P6 身份行、P7 账号 | 若认证服务返回邮箱，可只在会话中显示；但导出与"删除账号"需要明确是否落库 |
| M9 | 新表 `devices`（V2）/ `users` | `devices[{id,name,lastSeenAt,current}]`、`lastSyncedAt`、`syncEnabled` | — | — | P6 身份行、P7 同步、P8 异地 | 同步态是账号级，不能塞进 `settings` 单行 |
| M10 | `badges`（V1） | `periodKey` | `string \| null` | `[ownerId+type+periodKey]` | P6 徽章墙 | 一次性徽章为 `null`；周期型（如连续 7 天）用 `2026-W47`，避免重复发放 |
| M11 | `settings`（V2） | `rev` | `number` | 不需要 | V2 同步 | 其余表都有 `rev`，`settings` 只有 `updatedAt`；若 V2 同步设置，缺 `rev` 无法判冲突 |

> 建议顺序：M1/M2/M3/M5/M6 属 MVP，先加；M4/M7/M10 随 V1；M8/M9/M11 随 V2。**本报告不改表，等确认。**

### 3.3 缺派生或口径不一致

| 编号 | 问题 | 需要的规则 | 涉及 |
|---|---|---|---|
| D1 | 页头 `5 条有截止日期 · 另有 2 条无截止日期` 的计数口径 | 有截止 = `status=open` 且 `dueDate != null`（含逾期与今天）；无截止 = `dueDate == null`；逾期单独计 `dueDate < today`；排除 `deletedAt`、归档分支、已放下分支 | P1 |
| D2 | 归档/放下是否计入页头与统计 | 建议：页头 `进行中/已合并` 均不含 `archivedAt`；底部 `活跃` = `status=active && !archivedAt`；`已放下` 不占总树 200 额度，但 `state` 仍显示 | P2 |
| D3 | 根分支如何存在 | 每个 owner 恰好一条 `parentId=null`、`path='/'`、`depth=0` 的根；不可删、不可归档、不可移动；快速添加与首次引导默认落根 | P1、全局层 |
| D4 | `dueDate` 与 `plannedDate` 语义 | `dueDate` = 截止；`plannedDate` = 打算做的日子；"今天"组 = 二者任一命中今天；"安排到今天"写 `plannedDate`。两字段都可空 | P1、待办详情 |
| D5 | 周回顾的数据来源与口径 | 完成数 = 周期内有效提交数（`voidedAt` 为空、`deletedAt` 为空）；活跃分支 = 周期内有提交的 `branchId` 去重；新开/收尾用 `createdAt`/`finishedAt`。周期 = 本地周一 00:00 至周日 23:59；周六日看预览、周一看正式、周二至周五收起 | P1 |
| D6 | 停滞判定 | 可见、`status=active`、未归档的分支，取子树 `max(ownLastCommitAt)`；**无有效提交的分支不判停滞**（画稿的停滞卡都带「最近一次提交在 …」，例如「阅读 37 天 / 最近一次提交在 10 月 14 日」）；`> 30 天` 判定；天数 = 本地自然日差；P1 最多 5 条按天数降序 | P1、P4 |
| D7 | 提交短 hash（**画稿已复核：不展示**） | P1 最近提交只有「文案 + 分支 + 日期」，P3 提交流是「文案 + 日期 + 时分」，O03 提交详情只有标题与「2026 年 11 月 20 日 16:42」；**不显示 hash、不新增 `hash` 字段**，内部只用 `_id` | P1、P3、P4、提交详情 |
| D8 | 分支路径的显示 | `path` 只存 ID；显示时按路径里的 ID 批量取 `title` 拼接（深度 ≤3，一次 `bulkGet`）。**不要**存冗余的 `pathTitles`，改名会失真 | P1、P3、P4 |
| D9 | `datePrecision` 如何展示 | 只有两档：`day` → `11 月 16 日`；`month` → `2026 年 11 月`（时间树对齐到月列）。只填年月时 `achievedAt` 规范化为当月 1 日 00:00（本地）再转 UTC；排序始终用 `achievedAt` | P3、P4、S04 |
| D10 | 年轮四项统计 | 有效提交数（不含撤销）；活跃分支 = 当年有有效提交的 `branchId` 去重；新开 = 当年 `createdAt` 的非根分支；收尾 = 当年 `finishedAt` 且 `status=merged`（放下单列，不计入收尾） | P5 |
| D11 | **加密文案已过期（已修复）** | 旧稿 P8「加密包 / 密钥不出本机」与 P9/P10「服务端只存加密块」与「不做 E2EE」冲突；2026-11-21 旧稿已归档并改为明文口径，现行 `UI-PAGES.md` 统一为明文 JSON + `schemaVersion` | P8、P9、P10 |
| D12 | 提交"当天可编辑"的边界 | 用 `date`（业务日期）与设备本地"今天"比较；跨天只读。编辑 `summary` 后 `updatedAt` 更新，但 `date` 不变；撤销写 `voidedAt`，不改 `date` | 提交详情 |
| D13 | **搜索前缀匹配不够** | 中文用户通常记得词中片段（如"报销"在"周五报销材料"里）。数据量只有几千行，建议：先用前缀命中做排序优先，再做一次 `includes` 全扫兜底（分支/待办/有效提交/里程碑），上限 50 条；不做分词与模糊纠错 | 搜索 |
| D14 | 分享图的分支名开关是否持久化 | 若只在预览内选择，属 UI 状态；若要记住，加 `settings.shareBranchNames`（boolean）。当前无字段，先按"不持久化"实现 | P5 |

**索引缺口（与字段无关，但会卡查询）**

| 编号 | 缺口 | 建议 |
|---|---|---|
| I1 | P1「无截止」与「全部待办」没有可用的 `[ownerId+status]`；IndexedDB 不索引 `null`，`[ownerId+status+dueDate]` 取不到 `dueDate` 为空的行 | 加 `[ownerId+status]`，查询后内存过滤 `!dueDate`；数据量 ≤ 数千，成本可接受 |
| I2 | P2 排序「最近活动」若用 `ownLastCommitAt`，现有索引只有 `[ownerId+updatedAt]` | 加 `[ownerId+ownLastCommitAt]`；或 ≤200 行内存排序（推荐后者，少一个索引） |
| I3 | P3 待办区按 `branchId` 列全部状态，现有 `[ownerId+branchId+status]` 需拆两次查询 | 加 `[ownerId+branchId]`；或按 `open` / `done` 各查一次再合并 |

### 3.4 冗余可疑

| 编号 | 字段 | 判断 | 建议 |
|---|---|---|---|
| R1 | `tasks.priority` | 12 个页面与全局层没有任何一处展示或操作优先级 | **删**；若要保留，先在待办详情加控件 |
| R2 | `users.prefs` | `settings` 表已承接全部偏好，`users.prefs` 无消费者 | **删**，避免两套偏好真源 |
| R3 | `commits.isBackfill` | 画稿没有任何补记入口（提交只能由「标为完成」产生），也没有页面引用该标记 | **删**（0.12 已删） |
| R4 | `milestones.datePrecision` | 若 UI 仍把年月补成具体日显示，这个字段等于没用 | 保留，按 D9 强制展示；否则删 |
| R5 | `branches.path` / `depth` | 与 `parentId` 存在冗余，但前者支撑子树查询、后者支撑缩进与层级校验 | **保留**，标注为"受控冗余"，写入时互为断言（§5.3.1 已写） |

---

## 4. 六个重点疑点：明确结论

### 4.1 年轮「年度总结」存在哪里

**结论：单独建 `year_reviews` 表，不塞 `settings`。**

| 方案 | 评价 |
|---|---|
| `settings` 加 `yearSummaries: { [year]: text }` | 不推荐。单行文档会随年份无限增长，没有逐年的 `updatedAt`/`rev`，V2 同步时无法按年合并；还会把"内容"混进"偏好" |
| 新表 `year_reviews` | 推荐 |

建议结构：`_id` ULID、`ownerId`、`year`（number）、`text`（≤500）、`createdAt`、`updatedAt`、`rev`。逻辑唯一键 `(ownerId, year)`，索引 `[ownerId+year]`。只有当前年可编辑，往年只读；清空用空字符串，不必加 `deletedAt`。导出时进入 `data.year_reviews`，`schemaVersion` 在加入该表时 +1。

### 4.2 今天页「周回顾卡」的数据来源与统计口径

**结论：不建周报表，全部由 `commits` + `branches` 现算。**

- **完成数**：周期内有效提交数（`voidedAt == null`、`deletedAt == null`）。产品规则是"完成待办即生成提交"，所以不需要 `tasks.completedAt`。
- **活跃分支**：周期内提交的 `branchId` 去重。
- **新开 / 收尾**：`branches.createdAt` / `branches.finishedAt` 落在周期内（收尾只算 `status=merged`）。
- **周期**：本地周一 00:00 至周日 23:59；周六日显示本周预览，周一显示上一周期正式版，周二至周五收起。
- **提问句**：用本周与上周的差值生成（如"比上周多完成 3 条，连续第 2 周"），纯前端拼接，不存储。
- **补记**：`isBackfill=true` 的提交不计入"本周完成"，但计入年轮总量（D5/D10）。

### 4.3 徽章的授予规则、发放记录与去重

**结论：`badges` 对 MVP 够用；V1 徽章墙前必须加 `periodKey`。**

- **规则位置**：领域层，在提交写入的同一事务后评估；不写在页面里。MVP 4 枚均为一次性（首条提交、首条分支、首个里程碑、首次收尾），V1 的 16 枚里若有周期型，用 `periodKey`。
- **发放记录**：`type`、`grantedAt`、`snapshot`、`sourceEntityId` 足够。`snapshot` 存授予当时的上下文（如分支标题、累计数），供"徽章详情"展示"当时快照"；`sourceEntityId` 指向触发实体。
- **去重**：逻辑唯一键 `(type, periodKey)`；发放前按 `[ownerId+type+periodKey]` 查一次，存在则跳过。重复执行发放任务不会产生第二条。
- **可追溯**：同事务写一条 `events`（`action='badge.granted'`、`entityType='badge'`、`entityId=badge._id`），"定位授予事件"靠它。
- **不需要**：`badges` 的 `deletedAt`（徽章不单独删除，清空数据是整库操作）；名称与图标不落库，用 `type → 常量` 映射。

### 4.4 搜索：前缀匹配是否够

**结论：不够，需加"前缀优先 + 子串兜底"。**

- 前缀只覆盖"从第一个字开始记得"的情况；中文用户更常记得词中片段。页面承诺"搜分支、待办、有效提交和里程碑"，前缀会在最常见的输入上无结果。
- 数据量 ≤200 分支、数千待办、数千提交，全量 `includes` 是毫秒级，不需要全文索引，也不需要 SQLite FTS。
- 建议：归一化（小写、去首尾空格）→ 前缀命中排前 → `includes` 兜底 → 结果按类型分组、各取上限（分支 10 / 待办 20 / 提交 15 / 里程碑 5）→ 过滤 `voidedAt` / `deletedAt`。
- 明确不做：拼音、错字纠正、分词。中文分词引入的召回问题大于收益。

### 4.5 里程碑 `datePrecision` 在各页怎么用

**结论：三处都必须按精度渲染，不能补日。**

| 页面 | 展示 |
|---|---|
| P3 里程碑行 | `day` → `11-02`；`month` → `2026-11`；`year` → `2026`。同一行不显示虚构的日 |
| P4 里程碑列表 | 同上，并保留完整路径 |
| P5 年轮 | 只按 `achievedAt` 落在哪一年归属；年轮不展示月/日，因此精度不影响归属 |

写入规则：只填年月时把 `achievedAt` 规范化为当月 1 日 00:00（本地）再转 UTC；只填年时为 1 月 1 日。排序与筛选始终用 `achievedAt`，不用字符串比较。

### 4.6 四个计数与页面显示是否一一对应，软删后怎么算

**结论：与页面一一对应，但重算规则必须补齐。**

| 字段 | 页面 | 定义 |
|---|---|---|
| `taskTotal` | P2 行 `3/7` 的分母、P3 `4/9` | 本分支下 `deletedAt` 为空的全部待办（含已完成） |
| `taskDone` | 分子 | 本分支下 `status='done'` 且未删 |
| `commitCount` | P2 列表"提交"列 | 本分支下 `voidedAt` 为空、`deletedAt` 为空的提交 |
| `ownLastCommitAt` | P2/P3 "最近活动" | 上述提交的最大 `date`；无提交为 `null` |

重算规则（都要在同一 Dexie 事务内）：

1. 待办完成/取消完成：`taskDone ±1`。
2. 待办软删：`taskTotal −1`，若原为 done 再 `taskDone −1`；恢复则反向。
3. 待办移分支：旧分支减、新分支加，同一事务。
4. 提交撤销（`voidedAt` 置值）/ 软删：`commitCount −1`，并把 `ownLastCommitAt` 重算为剩余提交的最大值（不是置空）。
5. 提交恢复：`commitCount +1`，`ownLastCommitAt = max(现值, 该提交 date)`。
6. 收尾合并导致 `commits.branchId` 迁移：父分支 `commitCount` 增加、`ownLastCommitAt` 取最大值；子分支计数冻结，不再变化。
7. 归档/取消归档：四个计数不变（归档只是可见性）；但 P2「活跃」统计要排除。
8. 导入/恢复/迁移后：跑一次全量重算，与存储值比对，不一致以重算为准。

**不包含后代**：四个计数只算本分支，与 P3「仅本分支待办」一致；P2 分组树的每行 `3/7` 也按行自身算。

---

## 5. 建议的最小改动集（待确认后执行）

| 优先级 | 改动 | 影响 |
|---|---|---|
| P0（MVP 前） | M1 `goal`、M2 `color`、M3 `finishedAt`、M5 `note`、M6 `backups` | P3 页头/右栏/里程碑、P6/P8 备份 |
| P0（MVP 前） | D1–D6、D8、D9、D12 的口径写入技术文档；I1 加索引 | 避免实现时各自解释 |
| P1（V1 前） | M4 `dropReason`、M7 `year_reviews`、M10 `periodKey`、D10、D13 | 年轮、徽章墙、搜索 |
| P1（V2 前） | M8 `users.email` 决策、M9 `devices`/`lastSyncedAt`/`syncEnabled`、M11 `settings.rev` | 账号与同步 |
| 清理 | 删 `tasks.priority`、`users.prefs`；`isBackfill`/`datePrecision` 落规则或删 | 减少死字段 |

---

## 6. 需要产品侧拍板的 5 个问题

1. **P1 停滞分支**是列所有层级，还是只列 L1？（影响能否直接点进去处理）
2. **周回顾卡的三个数字**是否就取「完成 / 活跃分支 / 收尾」？还是要有"连续天数"？
3. **搜索**接受"前缀优先 + 子串兜底"的全扫方案吗？（不接受就得接受只能从头匹配）
4. **年轮"收尾"**只算合并，还是把"放下"也算进去？
5. **待办优先级**要不要做？不做就删 `priority`，做就要在待办详情加控件。

---

## 7. 附：核对边界

- 本次只核对"数据能否接住页面"，不评价视觉与交互细节。
- 页面画稿中的示例数据、文案、图标不视为数据需求。
- V2 的认证字段以认证服务为准，本报告只标出"本地是否需要存"。
- 所有建议均未改动表结构；表结构变更需在确认后单独提交。
