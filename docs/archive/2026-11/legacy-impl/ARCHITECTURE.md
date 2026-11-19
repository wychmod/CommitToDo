# 架构说明

**版本**: 2.8.1
**更新日期**: 2026-11-19
**作用域**: 全仓库

本文描述**当前真实存在的架构**，以及**已确定但尚未实施**的方向。凡是尚未决策的内容，统一列入 §9「待定事项」，不在此处预设结论。目标领域模型见 §12。

> ⚠️ **已过时（2026-11-19）**：`web/` 旧实现已整体清空并重建为最小外壳，**§1–§11 描述的是已删除的实现**，仅作追溯；§12「目标领域模型」与 §13「变更记录」仍然有效。逐项清单见 [`STALE.md`](./STALE.md)。

---

## 1. 现状速览

> ⚠️ 已过时：下表的代码规模、测试数、存储与网络描述均对应 2026-11-19 已删除的实现。现行状态：`web/src` 仅最小外壳，无测试、无存储层、无网络请求。

| 项 | 现状 |
|---|---|
| 客户端 | 1 个：`web/`（React SPA） |
| 后端 | 无。原登录后端（3 个云函数 + PostgreSQL 7 个迁移）已于 2026-11-16 删除 |
| 数据存储 | IndexedDB（Dexie，四版 schema）；本地模式为单库，登录后按 `principalId` 切库（见 §4） |
| 网络 | 无服务端请求；业务数据全本地（V1 起加异地备份与匿名统计两个端点，见 §7） |
| 代码规模 | `web/src/` 非测试代码约 24,000 行；测试约 5,900 行 |
| 类型检查 | `npx tsc -b` 通过 |
| 测试 | 51 个文件、291 个用例，全部通过 |

---

## 2. 分层与依赖

> ⚠️ 已过时：下列六层目录与 `core/di/injection-container.ts` 装配点均已删除；分层与依赖方向待新规范重新定义，现行 `web/src` 未分层。

```
            presentation  ─┐
            application   ─┼──►  domain  ◄──  data
            core          ─┘                  ▲
                                  platform ──┘
```

| 层 | 路径 | 文件数 | 职责 |
|---|---|---|---|
| core | `src/core/` | 24 | 设计令牌、主题、Hook、DI 容器、工具、日期/字符串扩展、OAuth state、会话刷新锁 |
| domain | `src/domain/` | 18 | 实体、Repository 接口、导出服务 |
| application | `src/application/` | 24 | UseCase 23 个（业务 10 / 认证 12 / 导入 1）+ 统一导出 1 个文件 |
| data | `src/data/` | 12 | Dexie schema、记录类型、7 个仓储实现（4 Dexie + 2 CloudBase + 1 工作区） |
| platform | `src/platform/` | 2 | 文件保存（File System Access API）、浏览器通知 |
| presentation | `src/presentation/` | 148 | 屏幕、组件、9 个 Zustand Store、路由守卫、图标系统 |

**依赖规则**：只能向下。`presentation` 不得直接 `import` `data`；`domain` 不依赖任何外层；`data` 只实现 `domain` 的接口。测试文件允许直接构造真实实现用于集成断言。

**依赖注入**：`tsyringe`，全部注册集中在 `src/core/di/injection-container.ts`。这是唯一的装配点，新增仓储或用例必须在此登记。

---

## 3. 领域模型

> ⚠️ 已过时：本节实体 `Repository` / `Branch` / `Task` / `Commit`、枚举与索引映射已随实现删除；现行代码没有任何领域对象，目标模型见 §12。

### 3.1 实体

| 实体 | 字段 |
|---|---|
| `Repository` | `id` · `name` · `description` · `defaultBranchId` · `icon` · `color` · `isArchived` · `isDeleted` · `createdAt` · `updatedAt` |
| `Branch` | `id` · `repositoryId` · `name` · `parentBranchId` · `isMain` · `color` · `isDeleted` · `createdAt` · `updatedAt` |
| `Task` | `id` · `branchId` · `title` · `description` · `status` · `priority` · `dueDate` · `completedAt` · `parentTaskId` · `sortOrder` · `isDeleted` · `createdAt` · `updatedAt` |
| `Commit` | `id` · `taskId` · `branchId` · `message` · `type` · `createdAt` |
| `UserProfile` | `principalId` · `email` · `displayName` · `avatarUrl` · `locale` · `securityVersion` · `identities` |

### 3.2 枚举

| 枚举 | 取值 |
|---|---|
| `TaskStatus` | `todo(0)` · `inProgress(1)` · `done(2)` · `cancelled(3)` |
| `Priority` | `low(0)` · `medium(1)` · `high(2)` |
| `CommitType` | `create(0)` · `update(1)` · `merge(2)` · `complete(3)` · `delete(4)` |

枚举统一提供 `fromValue` 与 `label`，中文展示文本只在枚举层定义，组件不得硬编码。

### 3.3 语义约定

- **软删除**：`isDeleted` 标记，仓储默认过滤；删除仓库需级联标记其分支与任务。
- **提交即审计**：任务的新增、更新、完成、删除、分支合并，均写入一条 `Commit`，不做静默变更。
- **完成判定**：`Task.isCompleted` 的定义是 `status === done || status === cancelled`。此定义是全端唯一口径，任何端不得改写。
- **热力图口径**：仅统计 `status === done` 且 `completedAt != null` 的记录。

---

## 4. 持久化

> ⚠️ 已过时：Dexie 库名、六张表与全部复合索引已随实现删除，现无任何持久化层。

Dexie 四版 schema，当前版本新增两张复合索引表用于过滤扫描：

| 表 | 主键 | 索引 |
|---|---|---|
| `repositories` | `id` | `isArchived` · `isDeleted` |
| `branches` | `id` | `repositoryId` · `parentBranchId` · `isDeleted` · `[repositoryId+isDeleted]` |
| `tasks` | `id` | `branchId` · `status` · `dueDate` · `parentTaskId` · `isDeleted` · `sortOrder` · `[branchId+isDeleted]` |
| `commits` | `id` | `taskId` · `branchId` · `createdAt` |
| `tags` | `id` | `name` |
| `taskTags` | `[taskId+tagId]` | `taskId` · `tagId` |

**库隔离**：库名由 `commit.active-workspace-db.v1` 决定，登录后切换为 `commit-db-{principalId}`。旧库复制时做计数校验，并保留原库不删除。

`tags` 与 `taskTags` 目前仅有表结构，没有读写路径与界面；仅在工作区复制时原样搬运。

---

## 5. 状态管理

> ⚠️ 已过时：下列 9 个 Zustand store 已全部删除，现行外壳只有组件内状态。

Zustand，一屏一 Store，共 9 个：

| Store | 承载 |
|---|---|
| `auth-store` | 会话、身份、登录流程状态 |
| `home-store` | 仓库列表与统计 |
| `repository-store` | 单仓库的分支、任务、选中项 |
| `repository-overview-store` | 仓库概览聚合 |
| `task-store` | 任务详情与提交时间线 |
| `insights-store` | 洞察页范围筛选与聚合 |
| `search-store` | 搜索词、结果、历史（当前仅命令面板使用） |
| `settings-store` | 主题、提醒、PWA 状态 |
| `today-workspace-store` | 工作台分组、筛选、进度 |

Store 在构造时通过 DI 容器解析 UseCase，组件按选择器订阅，不做整店订阅。

---

## 6. 路由

> ⚠️ 已过时：文档列出的 8 条路由与兼容重定向均已删除，现行只有 `/` 一条占位路由（`web/src/app.tsx`）。

| 路径 | 说明 | 守卫 |
|---|---|---|
| `/` | 落地页（嵌套 `/login`、`/signup`） | 公开 |
| `/auth/callback` | OAuth 回调 | 公开 |
| `/auth/local-data` | 本地数据归属选择 | 公开 |
| `/workspace` | 今日工作台 | 登录 + 工作区归属（本地模式放行） |
| `/repository/:id` | 仓库概览 | 登录 + 工作区归属（本地模式放行） |
| `/repository/:id/tasks` | 仓库任务 | 登录 + 工作区归属（本地模式放行） |
| `/insights` | 洞察（`?tab=activity\|graph\|heatmap`） | 登录 + 工作区归属（本地模式放行） |
| `/settings` · `/settings/security` | 设置 / 账户安全 | 登录 + 工作区归属（本地模式放行） |

另有一组旧路径（`/search`、`/heatmap`、`/graph`、`/repository/:id/{commits,graph,heatmap,search,settings}`、`/task/:id`）重定向到新路由，属于兼容层，不再扩展。

---

## 7. 后端

**无后端。** 2026-11-16 决定当前版本不做账号与同步，原登录后端已整体删除：

- 3 个云函数：`auth-gateway`、`auth-risk-evaluator`、`security-notification-worker`
- PostgreSQL 7 个迁移与 CloudBase 配置示例

前端残留的认证代码（`auth-store`、登录页、路由守卫、CloudBase 仓储）不影响本地使用，将在重做时一并移除。

> ⚠️ 已过时：上述残留代码已随 `web/src` 于 2026-11-19 一并删除，`auth-store`、登录页与路由守卫均不存在。

**后端形态（2026-11-17 定，方案 B）**：

| 阶段 | 后端能力 | 说明 |
|---|---|---|
| **MVP** | 无 | 纯本地，零网络请求 |
| **V1** | 两个端点：异地备份、匿名统计 | 不做同步、不带账号。备份包客户端加密，服务端只存二进制块；统计只收计数器，不收任何内容 |
| **V2** | 账号 + 端到端加密同步 | 协议、冲突策略单独立项，不沿用已删除的旧后端 |

V1 的极简后端必须为 V2 预留扩展点，实现时按以下五条约束写，不能事后补：

1. **本地唯一可信源**：所有读写先落本地，云端只在后台异步参与；云端失败不阻塞任何用户操作。
2. **状态字段预留**：数据行带 `syncState`（`local` / `pending` / `synced`），MVP 阶段恒为 `local`，不写网络逻辑，但字段和迁移路径留好。
3. **导出格式带 `schemaVersion`**：备份包格式 = 导出 JSON + 加密信封；V2 同步复用同一套序列化，不另造格式。
4. **匿名设备 ID**：本地生成 UUID，存在独立命名空间；V2 加账号时把它作为「旧数据的归属凭据」，不重造身份体系。
5. **服务端接口按资源划分，不按功能划分**：只做 `backup` 与 `events` 两类资源，V2 加 `sync` 是新增资源，不是重写已有端点。

---

## 8. 端与共享策略

### 8.1 已确定

- 以 TypeScript 技术栈承载多端，不引入第二套语言生态。
- 优先把 Web 端做完整，再启动第二个端。
- 跨端共享的是**领域模型与用例**，不是界面。

### 8.2 未确定

见 §9。在定案前，目录不预先拆分，也不建立空壳工程——空壳会制造「已经支持」的错觉。

### 8.3 已写入规范的前置约束

平台能力收口、禁止平台判断散落、契约先于实现、同一语义唯一定义、新端先跑通只读链路。这五条原写在 `AGENTS.md` §9，该文件已随改版移除，内容以本处为准。

---

## 9. 待定事项

| 事项 | 影响面 | 未定原因 |
|---|---|---|
| 目录是否迁移为 monorepo（`apps/` + `packages/`） | 全部 | 依赖「第二个端用什么」的结论 |
| 桌面端外壳方案 | 新端 | 需先确认所需原生能力范围 |
| 小程序端框架选型 | 新端 | 需确认小程序是否为主路径 |
| App 端是否建设 | 新端 | 已明确暂缓 |
| V2 是否重启账号与同步 | 产品、后端 | 当前版本明确不做；重启需重新立项，不沿用已删除的旧后端 |

---

## 10. 已知缺口

> ⚠️ 已过时：第 1–7 项均指向已删除的实现（测试文件、构建体积、提醒服务、示例数据、`seedDemoData` 等），只有「无账号、无同步」这一产品结论仍然成立。

按阻断程度排序：

1. **无账号、无同步**。旧登录后端已于 2026-11-16 删除，当前版本只能单机使用；换设备需手动导出 / 导入。V2 若要同步需重新设计。
2. **提醒未闭环**。通知服务只提供「申请权限」与「立即发送」两个能力，全仓无调用点，也没有截止前定时调度。
3. **子任务与标签仅有模型**。`parentTaskId` 无界面入口，`tags` 无仓储与 UI；新模型中子任务已明确不做，重做时一并删除。
4. **一处测试对时序敏感**。`repository-tasks-screen.test.tsx` 首例在分支数据渲染完成前查询 `role="tab"`，高负载下偶发失败；应先等待分支 Tab 出现再断言。
5. **主包体积超阈值**。构建产物 JS 1,796 kB（gzip 493 kB）、CSS 110 kB（gzip 20 kB），单入口 chunk，构建告警超过 500 kB，需路由级拆包。
6. **无覆盖率数据**。未接入覆盖率上报，原工程规范设定的覆盖率目标无法验证。
7. **示例数据与占位开关**。首次进入且本地为空时自动种入 3 个仓库（`today-workspace-store` 的 `seedDemoData`），但没有「示例」标识与批量清理入口；设置页「自动备份」为 `disabled` 占位，不产生任何行为。

---

## 11. 验证方式

> ⚠️ 已过时：四条门禁中的 `npm run lint` 与 `npm test` 已随 ESLint / Vitest 配置一起删除；现行只有 `npm run dev`、`npm run build`（内含 `tsc -b`）、`npm run preview`。门禁待新规范重新定义。

提交前的四条门禁：`npm run lint`、`npx tsc -b`、`npm test`、`npm run build`（在 `web/` 内执行）。除此之外，涉及界面的改动需在浏览器中实际走查，不以单元测试通过替代——测试无法覆盖布局与真实交互。

---

## 12. 目标领域模型（v0.2 已定）

> 2026-11-16：对象模型改为「单根分支树 + 5 个对象」，**取消领域 / 仓库 / 项目 / 并行线**。对象定义见 [`FRAMEWORK.md`](./FRAMEWORK.md) §2；本节只写落地约束。

### 12.1 实体

> 以下为完整字段清单（含产品需求所需字段）。具体命名、类型、索引与约束在数据模型设计稿中定稿。

| 实体 | 字段 |
|---|---|
| **分支** | `id` · `parentId` · `name` · `path` · `depth(0–3)` · `color` · `status(active/merged/abandoned)` · `isArchived` · `archivedAt` · `goal` · `mergedInto` · `mergedAt` · `abandonReason` · `abandonedAt` · `createdAt` · `sortOrder` · `openTodoCount` · `commitCount` · `lastCommitAt` · `isSample` |
| **待办** | `id` · `branchId` · `title` · `description` · `dueDate` · `priority` · `status(todo/done/cancelled)` · `completedAt` · `sortOrder` · `createdAt` · `updatedAt` |
| **提交** | `id` · `todoId` · `branchId` · `message` · `sourceBranchId` · `createdAt` · `editedAt` · `isDeleted` |
| **里程碑** | `id` · `branchId` · `title` · `date` · `note` · `createdAt` |
| **徽章** | `id` · `key` · `earnedAt` · `snapshot` |

字段说明：

| 字段 | 说明 |
|---|---|
| `path` | 物化路径（如 `工作/副业`），全树唯一，用于子树前缀查询 |
| `description`（待办） | 待办备注，可空，显示在待办详情；提交详情不设备注字段（E-03） |
| `depth` | 0 = 根，1–3 = 三级分支；写入路径校验，不靠界面 |
| `goal` | 分支目标，一句话，可空 |
| `mergedInto` / `mergedAt` | 收尾合并时写入；`mergedInto` 恒为父分支 ID |
| `abandonReason` / `abandonedAt` | 「放下」时必填原因与时间；「重新开始」时保留原因、清空时间但状态改回 active |
| `openTodoCount` / `commitCount` / `lastCommitAt` | 冗余计数，同事务更新；归档后冻结 |
| `lastCommitAt` | 停滞虚线唯一数据源，不扫提交表 |
| `isSample` | 示例数据标记，一次性清空的依据；示例不计入上限与徽章统计 |
| `sourceBranchId` | 提交的来源分支；合并后在父分支历史中用于标注「来自 X」 |
| `todoId` | 提交关联的待办；待办取消后提交保留，此字段仍指向原待办 |
| `date`（里程碑） | 用户指定的日期，可只到年月 |
| `snapshot`（徽章） | 授予当时的真实数据快照，用于「为什么给你」 |

根分支唯一：`parentId = null`、`depth = 0`，不可删、不可合并。深度上限 3，校验在写入路径完成，不能只靠界面。

### 12.2 查询约束

| 约束 | 做法 |
|---|---|
| 全树一次加载 | 只加载 `isArchived = false` 的活跃分支，总数 ≤200；按 `depth, sortOrder` 一次取回，不做递归查询 |
| 归档分离 | 归档分支按一级分支懒加载；索引 `[isArchived + parentId]`，默认树查询不带归档 |
| 子树查询 | 物化路径 `path`（如 `work/side/launch`）+ 前缀索引，避免递归 |
| 停滞判定 | 分支上冗余 `lastCommitAt`，30 天口径直接读字段，不扫提交表；归档分支不参与 |
| 分支计数 | 分支上冗余 `openTodoCount` / `commitCount`，在完成、取消、迁移时同事务更新；归档后冻结 |
| 提交分页 | `[branchId+createdAt]` 复合索引；树上每线只取最近 1 条 |
| 合并 | 只改 `status / mergedInto / mergedAt`，不搬提交、不改提交；合并前父分支历史只含自己的提交，合并后才并入子分支提交；合并可同时设 `isArchived`（收尾时选归档）或保持未归档（选留在默认树） |
| 归档 | 只改 `isArchived` / `archivedAt`，可逆；归档前校验状态必须是 merged / abandoned；**收尾后留在默认树的分支保持 `isArchived = false`，仍计入 200 活跃上限** |
| 移动分支 | 校验目标深度 + 非自身子孙，更新整棵子树的 `path` 与 `depth` |
| 重名 | 同一 `parentId` 下 `name` 唯一；`path` 全树唯一 |

### 12.3 旧数据处置（不做迁移）

2026-11-16 决定：**旧数据不迁移，直接删除**。新版本首次启动时清空旧库，从一棵空树开始。

| 旧数据 | 处置 |
|---|---|
| `repositories` / `branches` / `tasks` / `commits` / `tags` / `taskTags` | 删除，不读取、不转换 |
| 旧库文件 | 升级时提示一次「旧数据将被清空」，用户确认后删除；不保留备份入口 |
| 旧版本的导出 JSON | 不作为导入格式支持；导入功能只接受新模型格式 |

因此 §12 不需要旧字段映射表，也不需要迁移脚本。**省下的成本全部投到新模型本身。**

### 12.4 不变更的架构约束

| 约束 | 说明 |
|---|---|
| **提交当天可改、跨天锁定** | 提交写入后仅当天（自然日）提供 update / delete 写入路径，`editedAt` / `isDeleted` 记录变更痕迹；跨天写入路径直接拒绝。删除后需同事务重算 `commitCount` 与 `lastCommitAt` |
| **软删除 + 级联恢复** | 删除写 `isDeleted`，恢复时按归属链级联还原，不做物理删除 |
| **迁移三原则** | 迁移前自动导出一次 JSON 备份；迁移后做计数校验；失败停止并保留旧库 |
| **代码层命名** | 新模型落地时把 `Repository` / `Branch` / `Task` / `Commit` 重命名为 `Branch` / `Todo` / `Commit`（分支统一为一个实体）；具体命名在数据模型设计稿中定 |

仍需单独决策：根分支之外是否允许第二棵树（V2 多工作区）；同步后的多端 ID 与冲突策略。里程碑照片已明确不做（2026-11-17 取消，见 `FRAMEWORK.md` §4.6），不再列为本项待决。

---

## 13. 变更记录

| 版本 | 日期 | 变更 |
|---|---|---|
| 2.8.1 | 2026-11-19 | **文档一致性修订**：§1 数据存储行改为「本地单库 + 登录后按 `principalId` 切库」；§1 测试数改为 291；§12.1 待办补 `description` 字段及说明；§12.4 移除已取消的「里程碑照片」待决项；变更记录新增本行 |
| 2.8.0 | 2026-11-17 | **§7 后端形态定案（方案 B）**：MVP 无后端；V1 增加两个端点（加密备份包上传下载、匿名计数统计），不做同步、不带账号；写入 V2 同步的五条预留约束（本地唯一可信源、`syncState` 字段、`schemaVersion`、匿名设备 ID、按资源划分接口）。§1 网络行同步 |
| 2.5.0 | 2026-11-16 | **§12 改为「单根分支树 + 5 个对象」**：写入实体、查询约束（物化路径、冗余计数、活跃/归档分离、提交分页）与 append-only 约束；**旧数据不迁移、直接删除**；取消领域 / 仓库 / 项目 / 并行线 |
| 2.4.0 | 2026-11-15 | **§12 整段重写**：删除上一版目标模型（`LifeArea` / `Milestone` 实体、`Repository.areaId`、`Branch.isMain`、迁移策略），改为「待框架定稿后编写」并只保留不随框架变的架构约束；新对象定义指向 `docs/FRAMEWORK.md` §2 |
| 2.3.0 | 2026-11-13 | §12.1 改为「双视角 + 文案层」，新增词表集中管理与「不得渲染代码标识符」约束；§12.5 历程视图收敛为单一渲染 |
| 2.2.0 | 2026-11-13 | §12.1 命名决策与 §12.5 影响面改为「双模式」表述；历程视图渲染拆为 Git Graph / 人生 Git 树两套规则 |
| 2.1.0 | 2026-11-13 | 新增 §12 目标领域模型、迁移策略与影响面；修正主包体积数据 |
| 2.0.0 | 2026-11-11 | 重写为 TypeScript 工程基线；补充多端预留约束 |
