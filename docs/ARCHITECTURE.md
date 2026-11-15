# 架构说明

**版本**: 2.4.0
**更新日期**: 2026-11-15
**作用域**: 全仓库

本文描述**当前真实存在的架构**，以及**已确定但尚未实施**的方向。凡是尚未决策的内容，统一列入 §9「待定事项」，不在此处预设结论。目标领域模型待 `docs/FRAMEWORK.md` 定稿后编写，其约束见 §12。

---

## 1. 现状速览

| 项 | 现状 |
|---|---|
| 客户端 | 1 个：`web/`（React SPA） |
| 后端 | CloudBase 云函数 3 个 + PostgreSQL（7 个迁移） |
| 数据存储 | IndexedDB（Dexie，四版 schema），按账户隔离 |
| 网络 | 仅认证与账号相关请求走服务端；业务数据全本地 |
| 代码规模 | `web/src/` 非测试代码约 24,000 行；测试约 5,900 行 |
| 类型检查 | `npx tsc -b` 通过 |
| 测试 | 51 个文件、289 个用例，全部通过 |

---

## 2. 分层与依赖

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

### 7.1 组成

| 组件 | 类型 | 职责 |
|---|---|---|
| `auth-gateway` | HTTP 云函数 | 验证码、邮箱/手机登录、身份绑定、限流、幂等、风险联动 |
| `auth-risk-evaluator` | 事件函数 | 登录与绑定风险评分 |
| `security-notification-worker` | 事件函数 | 安全告警投递（抢占、重试、死信） |

数据库为 PostgreSQL，7 个迁移覆盖：主体、身份、挑战与配额、安全事件、RLS、种子数据、运行时加固。网关以 service role 直连（`pg` 连接池 `max: 5`），浏览器侧走 RLS。

### 7.2 安全设计

- 验证码与标识符以 HMAC 哈希落库，不存明文；日志不记录验证码。
- 幂等键 + 多窗口配额 + 每日预算 + CAPTCHA 适配器。
- OAuth 使用 SDK 返回的 state 并一次性消费，回调校验后安全回跳。

### 7.3 配置边界

真实 `EnvId`、Publishable Key、PG 连接串、SMTP/SMS 凭证、CAPTCHA token 一律通过环境变量或密钥管理注入，仓库内只保留 `.env.example` 与 `cloudbaserc.example.json`。

---

### 7.4 本地模式（无需登录）

认证不是使用前提。`auth-store` 持有 `mode: 'local' | 'cloud'`，持久化在 `commit.auth-mode.v1`，默认 `local`：

- **local**：`initialize()` 完全不触碰 CloudBase，状态直接置为 `guest`；`AuthenticatedRoute` 与 `WorkspaceOwnershipGuard` 直接放行；数据写入本地库 `commit-db`。
- **cloud**：登录成功后写入该模式，数据切换到 `commit-db-{principalId}`。首次登录由归属守卫引导到 `/auth/local-data`，选择「认领本地数据」或「新建工作区」。
- **退出登录**：解除工作区绑定并回到 `local`，需重新加载页面以切换数据库实例。
- **云端不可用**：会话初始化失败时，错误页提供「使用本地数据」入口，不会把用户卡在错误页。

因此本地开发不需要任何 CloudBase 配置即可跑通全部业务功能；CloudBase 只影响登录与账号安全能力。

---

## 8. 端与共享策略

### 8.1 已确定

- 以 TypeScript 技术栈承载多端，不引入第二套语言生态。
- 优先把 Web 端做完整，再启动第二个端。
- 跨端共享的是**领域模型与用例**，不是界面。

### 8.2 未确定

见 §9。在定案前，目录不预先拆分，也不建立空壳工程——空壳会制造「已经支持」的错觉。

### 8.3 已写入规范的前置约束

平台能力收口、禁止平台判断散落、契约先于实现、同一语义唯一定义、新端先跑通只读链路。详见 `AGENTS.md` §9。

---

## 9. 待定事项

| 事项 | 影响面 | 未定原因 |
|---|---|---|
| 目录是否迁移为 monorepo（`apps/` + `packages/`） | 全部 | 依赖「第二个端用什么」的结论 |
| 桌面端外壳方案 | 新端 | 需先确认所需原生能力范围 |
| 小程序端框架选型 | 新端 | 需确认小程序是否为主路径 |
| App 端是否建设 | 新端 | 已明确暂缓 |
| 云数据库形态（文档型 / 关系型） | 后端、同步 | 与现有 PostgreSQL 实现冲突，需权衡 |
| 跨端同步协议 | 后端、数据层 | 依赖上一条；当前无任何同步代码 |

---

## 10. 已知缺口

按阻断程度排序：

1. **认证未达上线条件**。缺目标环境的 Provider、密钥、PgSQL/RLS、函数权限验证；手机验证码链路未闭环（前端开关默认关闭）；重新认证、身份解绑、双账号合并未实现；无真实浏览器端到端验证。以上只影响登录能力，本地模式已可完整使用。
2. **无同步能力**。数据只存在本机，换设备、换浏览器即丢失上下文；多端并存时会出现多个互不相通的数据库。
3. **提醒未闭环**。通知服务只提供「申请权限」与「立即发送」两个能力，全仓无调用点，也没有截止前定时调度。
4. **子任务与标签仅有模型**。`parentTaskId` 无界面入口，`tags` 无仓储与 UI。
5. **一处测试对时序敏感**。`repository-tasks-screen.test.tsx` 首例在分支数据渲染完成前查询 `role="tab"`，高负载下偶发失败；应先等待分支 Tab 出现再断言。
6. **主包体积超阈值**。构建产物 JS 1,796 kB（gzip 493 kB）、CSS 110 kB（gzip 20 kB），单入口 chunk，构建告警超过 500 kB，需路由级拆包。
7. **无覆盖率数据**。未接入覆盖率上报，`AGENTS.md` 的覆盖率目标无法验证。
8. **示例数据与占位开关**。首次进入且本地为空时自动种入 3 个仓库（`today-workspace-store` 的 `seedDemoData`），但没有「示例」标识与批量清理入口；设置页「自动备份」为 `disabled` 占位，不产生任何行为。

---

## 11. 验证方式

提交前的四条门禁与命令见 `AGENTS.md` §7。除此之外，涉及界面的改动需在浏览器中实际走查，不以单元测试通过替代——测试无法覆盖布局与真实交互。

---

## 12. 目标领域模型（待框架定稿后编写）

> 2026-11-15：原 §12 描述的是上一版模型（`LifeArea` / `Repository.areaId` / `Branch.isMain` / 主线·支线·任务·提交），已随对象定义一起移入 `docs/archive/2026-11/`。
> 新模型的对象是**领域 / 项目 / 并行线 / 待办 / 记录 / 里程碑 / 徽章**七件，定义见 [`FRAMEWORK.md`](./FRAMEWORK.md) §2。

本节暂不写实体与字段。原因：`FRAMEWORK.md` 仍是 v0.1（待评审），对象可能调整；按其 §9 的依赖顺序，**对象与数据模型是下一个功能点设计的第一项**，设计稿通过后再落回本节。提前写会二次返工。

已确定、不随框架调整而变的架构约束（后续设计必须满足）：

| 约束 | 说明 |
|---|---|
| **记录 append-only** | 「记录」实体不提供 update / delete 写入路径；更正通过追加一条新记录表达。仓储接口从设计上就不暴露 `update`。 |
| **软删除 + 级联恢复** | 沿用现状：删除写 `isDeleted`，恢复时按归属链级联还原，不做物理删除。 |
| **迁移三原则** | 迁移前自动导出一次 JSON 备份；迁移后做计数校验（各表数量一致）；失败停止并保留旧库，新库不覆盖旧库。 |
| **代码层命名待定** | 是否把 `Repository` / `Branch` / `Task` / `Commit` 重命名为 `Project` / `Line` / `Todo` / `Record`，取决于框架定稿与迁移成本评估；在此之前不改动实体名。 |

仍需单独决策、不属本节范围的事项：

- 里程碑照片的存储形态（本地 Blob / 对象存储 URL / 暂不支持）。
- 领域是否允许硬删除（当前倾向只允许归档）。
- 同步后的多端 ID 与冲突策略（V2 前定，见 §9）。
- 多端共享包边界（依赖第二个端的选型，见 §9）。

---

## 13. 变更记录

| 版本 | 日期 | 变更 |
|---|---|---|
| 2.4.0 | 2026-11-15 | **§12 整段重写**：删除上一版目标模型（`LifeArea` / `Milestone` 实体、`Repository.areaId`、`Branch.isMain`、迁移策略），改为「待框架定稿后编写」并只保留不随框架变的架构约束；新对象定义指向 `docs/FRAMEWORK.md` §2 |
| 2.3.0 | 2026-11-13 | §12.1 改为「双视角 + 文案层」，新增词表集中管理与「不得渲染代码标识符」约束；§12.5 历程视图收敛为单一渲染 |
| 2.2.0 | 2026-11-13 | §12.1 命名决策与 §12.5 影响面改为「双模式」表述；历程视图渲染拆为 Git Graph / 人生 Git 树两套规则 |
| 2.1.0 | 2026-11-13 | 新增 §12 目标领域模型、迁移策略与影响面；修正主包体积数据 |
| 2.0.0 | 2026-11-11 | 重写为 TypeScript 工程基线；补充多端预留约束 |
