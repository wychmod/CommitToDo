# CommitToDo 内部管理站 · 设计与契约

> 状态：第一阶段设计定稿（2026-11-22）。实现分两段：先只读看板与表浏览，再按需开放编辑。
> 云端环境：`committodo-d6gmapg0j6397889f`（PostgreSQL 版 / ap-shanghai）。
> 表结构以 `docs/TECH-ARCHITECTURE.md` §5.3 与 V2 各 PRD 为准；本文只提出**新增表与索引请求**，不建表、不写 DDL。

管理端设计仅采用 CommitToDo 首页的浅色视觉语言。[桌面画稿与生成提示词](docs/visuals/README.md)包含页面、关键状态和后续编辑方案。路由、权限、指标口径与编辑开放条件按本文执行。

---

## 1. 目标与边界

管理站只做两件事：

1. **按表浏览与修改云端数据**：默认只读，编辑能力后置，所有写操作留审计。
2. **看留存与使用指标**：CloudBase 日志只保留 2 小时，必须自建运营事件表，指标从事件与现有业务表计算。

明确不做：

- 不做公开产品入口，不在 `web` 路由中挂任何管理链接。
- 不新建 CloudBase 环境、不改套餐、不动 bucket 既有对象。
- 不直接在前端持有服务端密钥；前端只使用可公开的 `VITE_CLOUDBASE_ENV_ID` 与登录会话。
- 不由管理站创建或修改云端表结构；表由重建库那条线按本文的移交清单落库。
- 不伪造数据源；表或事件未就绪时，看板显示「未接入 / 表未就绪」，不填假数据。
- 不写测试业务数据到云端。

---

## 2. 独立目录、独立构建、独立产物

### 2.1 目录结构

```
admin/                              # 独立前端工程，不进 web 包
  DESIGN.md                         # 本文
  docs/
    CLOUD-SCHEMA-REQUEST.md         # 转给重建库那条线的表清单
  package.json                      # 独立依赖与脚本
  package-lock.json
  tsconfig.json
  vite.config.ts
  index.html                        # noindex,nofollow
  .env.example
  cloudbaserc.json                  # 声明 admin-api / ops-event / ops-retention，functionRoot 指向 ../cloudfunctions
  src/
    main.tsx
    app.tsx
    i18n.ts                         # 管理站文案集中处
    styles/
      tokens.css                    # 管理站最小令牌，组件不写死色值
      global.css
    lib/
      cloudbase.ts                  # CloudBase Web SDK 唯一入口
      admin-api.ts                  # callFunction 封装与错误码映射
      format.ts
    session/
      session-context.tsx            # 登录态 + whoami 权限门
    components/
      app-shell.tsx
      state-panel.tsx                # 空态/错误态/未接入
      data-table.tsx
      metric-card.tsx
    pages/
      login-page.tsx
      overview-page.tsx
      tables-page.tsx
      table-detail-page.tsx
      audit-page.tsx
      denied-page.tsx                # 无权限与邮箱未验证的明确状态
cloudfunctions/
  admin-api/                        # 只新增本目录，不改别人的函数
    index.js
    package.json
    README.md
  ops-event/                        # 客户端行为事件采集，写 ops_events
    index.js
    package.json
    README.md
  ops-retention/                    # ops_events 400 天保留清理，定时触发器
    index.js
    package.json
    README.md
```

### 2.2 构建与部署

```bash
cd admin
npm ci
npm run build          # 产物 admin/dist
npm run dev            # 本地预览，默认 http://localhost:5174
```

- Vite `base` 生产固定为 `/admin-console/`，本地开发为 `/`。
- 静态产物部署到同一环境的静态托管子路径，**不覆盖 web 根目录**：

```bash
cd admin
npx @cloudbase/cli hosting deploy dist /admin-console -e committodo-d6gmapg0j6397889f
```

- 若后续希望完全独立域名，可把 `admin/dist` 挂到单独静态站点或自定义域名；管理接口鉴权不依赖静态资源位置，静态 HTML 暴露不构成数据泄露。
- `index.html` 带 `<meta name="robots" content="noindex,nofollow">`，且 web 侧不出现任何入口链接。
- **当前状态**：2026-11-22 23 个文件已发布到 `/admin-console`；深链接与资源均实测 200（见 §11.4）。`--verify` 的 CDN 校验存在假阴性，发布以实际 HTTP 复核为准。

### 2.3 为什么不会破坏 `web` 的 lint / test / build

| 验证 | 原因 |
|---|---|
| `cd web && npm run lint` | `web/eslint.config.js` 只匹配 `src/**`，且命令在 `web/` 内执行；`admin/` 不在扫描范围 |
| `cd web && npm test` | Vitest 根目录与 `include` 都在 `web/` 内；`admin/` 没有测试文件被收集 |
| `cd web && npm run build` | `web/tsconfig.json` 的 `include` 只有 `["src"]`；Vite 根目录是 `web/`，不会打包 `admin/` |
| `cd web && npm run dev` | 只启动 `web` 的 Vite，端口与路由不变 |
| 依赖 | 根目录没有 `package.json`/workspace；`admin/` 自带 `node_modules` 与 lockfile，不参与 `web` 的依赖解析 |
| 提交 | 只显式提交 `admin/**`、`cloudfunctions/admin-api/**` 与必要的 `.gitignore` 行，不碰他人文件 |

gitignore 需追加：

```
/admin/node_modules/
/admin/dist/
/admin/.env
/admin/.env.*
```

---

## 3. 鉴权：只允许白名单邮箱

### 3.1 链路

```
管理站登录（CloudBase 邮箱密码）
  → 前端拿到会话（只用于调用云函数）
  → 每次调用 admin-api，函数内独立鉴权
     1. 取调用身份 uid；没有 → admin_unauthenticated
     2. 用 uid 查 CloudBase 账号资料 → 邮箱、邮箱验证状态
     3. 归一化邮箱（trim + 小写）
     4. 邮箱为空或未验证 → admin_email_unverified
     5. 与 ADMIN_EMAILS 白名单比较；不在名单 → admin_forbidden
     6. 通过后才进入具体 action
```

**服务端是唯一鉴权点。** 前端路由守卫、隐藏入口只影响体验，不影响权限；即使有人直接调用云函数，也会被同样拦截。

### 3.2 白名单配置

| 环境变量 | 必填 | 说明 |
|---|---|---|
| `ADMIN_EMAILS` | 是 | 逗号分隔的邮箱列表，例如 `a@example.com,b@example.com`。函数内逐项 `trim().toLowerCase()` 后比较；空项丢弃；**配置为空时默认全部拒绝**，不会因为漏配而放开 |
| `ADMIN_EMAIL_VERIFICATION_MODE` | 否 | `enforce`（默认）或 `trust-login`。`enforce` 要求账号资料明确返回已验证；`trust-login` 用于已确认 CloudBase 登录强制邮箱验证、但接口不返回验证字段的环境 |

邮箱值不写入前端、不写入仓库，只在 CloudBase 函数环境变量中配置。部署时示例：

```bash
ADMIN_EMAILS="admin1@example.com,admin2@example.com"
ADMIN_EMAIL_VERIFICATION_MODE="enforce"
```

### 3.3 邮箱来源

- 身份：`app.auth().getUserInfo().uid`（与现有 `sync-push` / `workspace-read` 一致）。
- 邮箱：`app.auth().getEndUserInfo(uid)` 返回的 `email`。
- 验证状态：优先读返回中的 `emailVerified` / `email_verified`；字段缺失时按 `ADMIN_EMAIL_VERIFICATION_MODE` 处理。
- **不接受**请求参数里的 `email`、`userId` 作为鉴权依据；这些只用于展示或筛选，且会在服务端重新校验。
- **不接受**请求体里的 `userInfo.uid`。身份只取平台注入的调用上下文，防止客户端伪造 uid 冒充白名单账号。

### 3.4 错误码（三种情况必须分开）

| 错误码 | 语义 | 前端表现 | 建议状态码 |
|---|---|---|---|
| `admin_unauthenticated` | 没有登录会话或 uid 缺失 | 回登录页，提示「登录已失效」 | 401 |
| `admin_email_unverified` | 已登录，但邮箱为空或未验证 | 独立「邮箱未验证」页，说明需先完成邮箱验证，可退出登录 | 403 |
| `admin_forbidden` | 邮箱已归一化但不在白名单，或白名单为空 | 独立「无权访问」页，显示当前登录邮箱与退出按钮 | 403 |
| `admin_identity_unresolved` | 查询 CloudBase 账号资料失败 | 可重试错误态，不跳登录页 | 502 |
| `admin_invalid_action` | 未知 action | 错误态 | 400 |
| `admin_invalid_params` | 参数缺失或格式错误 | 表单内联/错误态 | 400 |
| `admin_table_not_allowed` | 表不在允许清单 | 错误态 | 403 |
| `admin_field_not_allowed` | 字段不在允许清单 | 表单内联错误 | 403 |
| `admin_not_found` | 行不存在 | 空态 | 404 |
| `admin_conflict` | `expectedRev` 与服务端不一致 | 提示刷新后重试 | 409 |
| `admin_not_implemented` | 编辑能力尚未开放 | 按钮禁用/说明 | 501 |
| `admin_collection_missing` | 云端表尚未创建 | 「表未就绪」空态 | 503 |
| `admin_metrics_unavailable` | 指标事件表尚未就绪 | 「指标未接入」空态 | 503 |
| `admin_write_failed` | 写入或审计失败 | 可重试错误态 | 500 |

统一响应：

```json
{
  "ok": false,
  "code": "admin_forbidden",
  "message": "当前账号不在管理站白名单",
  "status": 403,
  "retriable": false,
  "requestId": "..."
}
```

成功响应：

```json
{ "ok": true, "data": {}, "serverTime": 1760000000000, "requestId": "..." }
```

### 3.5 前端明确状态

`session-context` 在登录后必须调用 `whoami`：

- `admin_unauthenticated` → 清会话，回登录页。
- `admin_email_unverified` → 渲染「邮箱未验证」页，不渲染任何数据页。
- `admin_forbidden` → 渲染「无权访问」页，显示登录邮箱、退出登录，不白屏、不回公开首页。
- `admin_identity_unresolved` → 渲染可重试错误页。
- 通过 → 进入看板。

---

## 4. 数据浏览与编辑范围

### 4.1 表清单

| 表 / 集合 | 浏览 | 修改 | 说明 |
|---|---|---|---|
| `branches` | 是 | 受限 | 只允许标题、目标、颜色等展示字段；路径、层级、生命周期、四计数只读 |
| `tasks` | 是 | 受限 | 只允许标题、备注、截止/计划日期、排序；完成状态必须走业务用例 |
| `commits` | 是 | 受限 | 只允许摘要；日期、时刻、撤销状态只读 |
| `milestones` | 是 | 受限 | 只允许标题、备注；达成时间与精度只读 |
| `badges` | 是 | 否 | 授予由规则与业务动作产生 |
| `settings` | 是 | 受限 | 主题、树密度、标注、提醒开关；备份时间戳只读 |
| `year_reviews` | 是 | 受限 | 只允许年度一句话 |
| `users` | 是 | 否 | 账号资料；邮箱变更走认证流程 |
| `devices` | 是 | 否 | 设备与最近同步时间 |
| `events` | 是 | 否 | 业务事件与审计，只追加 |
| `backups` | 是 | 否 | 备份元数据；正文与对象存储不在管理站编辑 |
| `outbox` | 是 | 否 | 服务端幂等日志，含业务 payload，默认不展示 payload |
| `conflicts` | 是 | 否 | 同步冲突记录 |
| `migration_state` | 是 | 否 | 迁移断点 |
| `counters` | 是 | 否 | 现有匿名计数，只有聚合值，无法算留存 |
| `ops_events` | 是 | 否 | 新增运营事件表，服务端/客户端只追加 |
| `user_first_seen` | 是 | 否 | 新增首见表，用于留存与注册口径 |
| `admin_audit_log` | 是 | 否 | 新增管理审计表，只追加 |

### 4.2 字段级写白名单（六张可写表逐个列全）

写接口只做**更新**，不做新增、物理删除、批量写。字段类型与取值范围如下；任何不在「可写字段」列中的字段一律拒绝，返回 `admin_field_not_allowed`。

#### 4.2.1 `branches`

| 可写字段 | 类型 | 校验与范围 | 为什么允许改 |
|---|---|---|---|
| `title` | string | `trim()` 后长度 1–120；不可只含空白；不可包含换行 | 纯展示标题，改动不影响树结构、计数或生命周期 |
| `goal` | string \| null | `trim()`；长度 0–500；空串归一为 `null` | 页头展示的一句话目标，不参与任何规则计算 |
| `color` | string | 只能是 `coral`、`sky`、`honey`、`mint`、`iris`、`rose`、`teal` 之一 | 只影响分支线色相；不改变层级、归属或计数 |

本表只读字段：`id` / `_id`、`ownerId`、`parentId`、`path`、`depth`、`status`、`order`、`archivedAt`、`finishedAt`、`finishedIntoId`、`droppedAt`、`dropReason`、`pinnedAt`、`taskTotal`、`taskDone`、`commitCount`、`ownLastCommitAt`、`rev`、`createdAt`、`updatedAt`、`deletedAt`。其中 `parentId` / `path` / `depth` 决定树结构，`status` 与各生命周期时间由 R1–R19 与业务用例维护，四计数由提交写入重算；直接改会破坏树一致性与事件记录。

#### 4.2.2 `tasks`

| 可写字段 | 类型 | 校验与范围 | 为什么允许改 |
|---|---|---|---|
| `title` | string | `trim()` 后长度 1–120；不可只含空白；不可包含换行 | 纯展示标题，不影响分组与完成口径 |
| `note` | string \| null | `trim()`；长度 0–1000；空串归一为 `null` | 补充说明，不参与 R1–R19 计算 |
| `dueDate` | string \| null | `YYYY-MM-DD` 或 `null`；必须是真实日期；年份 1900–2999 | 外部截止日期，只影响展示与分组；不改完成状态 |
| `plannedDate` | string \| null | `YYYY-MM-DD` 或 `null`；必须是真实日期；年份 1900–2999 | R8 的「显式安排到今天」输入项；允许管理站纠正误填 |
| `order` | number | 整数，范围 0–9999；不可为 `NaN` / 小数 / 字符串 | 只影响同组内排序，不影响统计与生命周期 |

本表只读字段：`id` / `_id`、`ownerId`、`branchId`、`status`、`completedAt`、`completedCommitId`、`cancelledAt`、`rev`、`createdAt`、`updatedAt`、`deletedAt`。`status` 必须由「完成待办」用例同时写提交与四计数，直接改会绕过 R1、事件与计数重算；`branchId` 改动会破坏分支归属与统计。

#### 4.2.3 `commits`

| 可写字段 | 类型 | 校验与范围 | 为什么允许改 |
|---|---|---|---|
| `summary` | string | `trim()` 后长度 0–500；允许空串；不可包含换行 | 提交文案「待办标题 —— 补一句」中的补句，纯展示，不参与统计 |

本表只读字段：`id` / `_id`、`ownerId`、`branchId`、`sourceBranchId`、`taskId`、`date`、`at`、`voidedAt`、`rev`、`createdAt`、`updatedAt`、`deletedAt`。`date` / `at` 决定历程与日桶，`voidedAt` 是撤销动作的结果；直接改会破坏历程、周月摘要与统计口径。

#### 4.2.4 `milestones`

| 可写字段 | 类型 | 校验与范围 | 为什么允许改 |
|---|---|---|---|
| `title` | string | `trim()` 后长度 1–120；不可只含空白；不可包含换行 | 纯展示标题 |
| `note` | string \| null | `trim()`；长度 0–1000；空串归一为 `null` | 补充说明，不参与日期精度与回顾计算 |

本表只读字段：`id` / `_id`、`ownerId`、`branchId`、`achievedAt`、`datePrecision`、`rev`、`createdAt`、`updatedAt`、`deletedAt`。`achievedAt` 与 `datePrecision` 决定月精度归一化、历程位置与回顾统计，直接改会破坏 V1-02/V1-03 的既有口径。

#### 4.2.5 `settings`

| 可写字段 | 类型 | 校验与范围 | 为什么允许改 |
|---|---|---|---|
| `theme` | string | `light` / `dark` | 用户偏好，纯前端表现 |
| `treeDensity` | string | `compact` / `comfortable` | 用户偏好，纯前端表现 |
| `annotations` | string | `off` / `once` / `always` | 用户偏好，纯前端表现 |
| `reminderEnabled` | boolean | `true` / `false` | 回顾提醒开关，不影响业务数据 |

本表只读字段：`id` / `_id`、`ownerId`、`lastAutoBackupAt`、`rev`、`updatedAt`。`lastAutoBackupAt` 由备份用例维护，直接改会让每日自动备份去重失效。

#### 4.2.6 `year_reviews`

| 可写字段 | 类型 | 校验与范围 | 为什么允许改 |
|---|---|---|---|
| `note` | string | `trim()` 后长度 0–2000；允许空串；不可包含换行以外的控制字符 | 用户手写的一句话，纯展示，不参与年度统计计算 |

本表只读字段：`id` / `_id`、`ownerId`、`year`、`rev`、`createdAt`、`updatedAt`。`year` 是行键的一部分，改它等于换行；年度统计由提交与分支数据实时计算，不从该字段读取。

**所有可写表共同规则**：

- 服务端先读当前行，再比对 `expectedRev === row.rev`；不一致返回 `admin_conflict`，前端提示刷新。
- `patch` 中不允许出现未列出的字段；不允许 `null` 覆盖非空必填字段（`title`）。
- 字符串统一 `trim()` 后校验；不合法返回 `admin_invalid_params`，并在 `field` 中指出具体字段。
- 写入时服务端只改可写字段，并自动 `rev + 1`、`updatedAt = 服务端时间`；客户端不能传 `rev` / `updatedAt`。
- 任何写操作都必须携带 `reason`（1–200 字符），写入审计，便于复盘。

**禁止操作**：新增行、物理删除、批量改多行、修改归属、修改计数、修改生命周期状态。删除一律由业务侧软删；管理站第一阶段不提供删除。

### 4.3 写入流程（已实现）

```
1. 鉴权（每个 action 独立执行）
2. 校验 collection 在白名单、patch 字段在白名单
3. 读取当前行，校验 expectedRev === row.rev
4. 在数据库事务内：
   a. 更新业务行（rev + 1、updatedAt = 服务端时间）
   b. 追加 admin_audit_log
5. 返回更新后的行与 auditId
```

- 失败整体回滚；不出现「改了但没审计」。
- 审计写入失败时业务写入必须回滚，返回 `admin_write_failed`。
- 实现：`cloudfunctions/admin-api/index.js` 的 `handleTableUpdate` 优先使用 `db.runTransaction`（事务内「读行 → 校验 rev → update → 写 `admin_audit_log`」）；运行时不提供 `runTransaction` 时退化为「写 pending 审计 → 更新业务行 → 标记 applied」的补偿流程，三步任一步失败都返回 `admin_write_failed` 并记录待核对状态。
- `reason` 必填（trim 后 1–200 字），缺失或超长返回 `admin_invalid_params`。
- 冲突返回 `admin_conflict` 409，`details` 带 `{ expectedRev, currentRev }`，前端提示刷新后重试，不自动合并。
- 只更新：不提供新增、物理删除、批量写；`patch` 与当前值完全相同时直接返回原行与 `noop: true`，不写审计。

### 4.4 审计记录

`admin_audit_log` 每条至少包含：

| 字段 | 说明 |
|---|---|
| `actorUid` / `actorEmail` | 谁操作的；邮箱取服务端解析值，不取请求参数 |
| `action` | 固定 `admin.update`（后续可扩展） |
| `collection` / `docId` / `ownerId` | 改了哪张表哪一行、行归属谁 |
| `changedFields` | 改了哪些字段 |
| `before` / `after` | 仅记录变更字段的旧值/新值；新增/删除类操作才记录整行 |
| `revBefore` / `revAfter` | 并发校验依据 |
| `reason` | 操作原因，来自请求且已 trim；必填 1–200 字 |
| `at` / `requestId` / `clientIp` | 服务端时间、请求 ID、来源 IP |
| `status` / `errorCode` | `applied` / `failed`；失败时带错误码 |
| `schemaVersion` | 审计行结构版本，当前 `1` |

脱敏：`passwordHash`、`token`、`secret`、`apiKey`、`authorization` 永不入库；`outbox.payload`、`backups.payload` 默认不返回、不审计正文。

### 4.5 审计的旧值新值：仅变更字段，可逆还原

**结论：`before` / `after` 只存本次变更字段的旧值与新值，不是整行快照。** 这样审计体积小，也不会把未变更的隐私字段反复复制。

字段存在性要显式表达，避免把「值变成 null」与「字段原本不存在」混为一谈：

```json
{
  "changedFields": ["title", "goal"],
  "before": { "title": "旧标题", "goal": null },
  "after":  { "title": "新标题", "goal": "新目标" },
  "beforeAbsent": [],
  "afterAbsent": []
}
```

- 字段原本不存在时，列入 `beforeAbsent`；新值删除字段时列入 `afterAbsent`。
- 值为 `null` 表示字段存在且值为空，与「不存在」区分。

**如何还原**：

1. **单次回退**：读取当前行，按该条审计的 `before` / `beforeAbsent` 反向覆盖变更字段；不要动未变更字段。
2. **回退到某个时间点**：按 `at` 倒序读取该行之后的全部审计，逐条应用 `before`，遇到 `afterAbsent` 则删除对应字段；最后一条应用完即为目标时刻状态。
3. **核对**：回退后用 `revBefore` 与审计链做连续性校验；若当前 `rev` 与审计链不连续（例如业务侧也写过），停止自动回退，转人工比对。
4. **不提供物理删除**：行始终在库，回退只改字段；不会出现「删了无法还原」。
5. **不改历史审计**：回退本身也是一次新的 `admin.update`，写新审计，不修改旧记录；审计表只追加。

如果后续需要「整行快照」用于合规留档，另加 `snapshot` 字段或独立归档表，不与本表的 `before` / `after` 混用；当前阶段不请求。

---

## 5. 指标口径

### 5.1 数据来源分层

| 层 | 来源 | 能算什么 | 现状 |
|---|---|---|---|
| A 现有业务表 | `commits`、`branches`、`devices`、`users`（若存在） | 提交活跃、新增分支、同步设备最新状态 | 可读取，但跨账号聚合需要索引或逐页扫描 |
| B 运营事件表 | `ops_events` + `user_first_seen` | 日活/周活/月活、D1/D7/D30 留存、注册、同步成功失败、备份成功失败 | **必须新增**；现有 `counters` 只有每日聚合值，不能算留存 |

看板对每个指标返回 `status`：

- `ready`：有数据且可计算。
- `not_ready`：事件表或依赖字段未就绪，显示「未接入」。
- `insufficient`：时间窗口内样本不足（例如 D30 尚未成熟）。

### 5.2 指标定义

| # | 指标 | 口径 | 所需事件/字段 | 计算方式 |
|---|---|---|---|---|
| M1 | 日活 DAU（账号） | 当天有一次 `app.open` 的去重账号数 | `ops_events.event='app.open'`、`userId`、`localDate` | `count(distinct userId) where event='app.open' and localDate=D` |
| M2 | 日活 DAU（设备） | 当天有一次 `app.open` 的去重安装数 | `visitorId`、`localDate` | `count(distinct visitorId)` 同上 |
| M3 | 周活 WAU | 近 7 个自然日（含当天）去重账号数 | 同上 | `localDate in [D-6, D]`，`count(distinct userId)` |
| M4 | 月活 MAU | 近 30 个自然日（含当天）去重账号数 | 同上 | `localDate in [D-29, D]`，`count(distinct userId)` |
| M5 | 注册数 | 每天新增账号数 | `account.signup` 事件或 `user_first_seen.signupAt` | 按 `signupAt` 的本地日分桶；同一 `userId` 只计一次 |
| M6 | D1 留存 | 首见日为 C 的账号，在 C+1 当天有 `app.open` 的比例 | `user_first_seen.firstSeenDate`、`app.open` | `cohort = userId where firstSeenDate=C`；`retained = cohort 中 localDate=C+1 有 app.open`；`rate = retained / cohortSize` |
| M7 | D7 留存 | 同上，C+7 | 同上 | 同上 |
| M8 | D30 留存 | 同上，C+30 | 同上 | 同上 |
| M9 | 任意回访 Dn+ | C 之后第 n 天及以后任意一天有 `app.open` 的比例 | 同上 | `min(localDate) >= C+n` 的去重账号 / cohortSize；作为留存图第二口径 |
| M10 | 同步设备数 | 近 7 天有成功同步的去重设备数 | `sync.push`、`deviceId`、`props.result` | `count(distinct deviceId) where event='sync.push' and result='success' and localDate in [D-6,D]` |
| M11 | 同步成功率 | 成功推送 / 总推送 | `sync.push`、`props.result` | 按日分桶；`result in success/conflict/failed` |
| M12 | 备份成功数 | 每天异地备份成功次数 | `backup.upload`、`props.result` | `count where result='success'` |
| M13 | 备份失败数 | 每天异地备份失败次数 | `backup.upload`、`props.result`、`props.errorCode` | `count where result='failed'`；按错误码 Top N |
| M14 | 提交活跃账号 | 每天有有效提交的去重账号数 | 现有 `commits`（`voidedAt=null`、`deletedAt=null`）或 `commit.create` | `count(distinct ownerId) where date=D`；以 `commits` 为准 |
| M15 | 每日提交数 | 每天有效提交总数 | 现有 `commits` | `count where date=D and voidedAt=null and deletedAt=null` |
| M16 | 新增分支数 | 每天新建分支数 | 现有 `branches` 或 `branch.create` | `count where createdAt` 落在 D 的本地日 |
| M17 | 功能使用 | 搜索、回顾、模板、徽章等使用次数 | 对应事件 | 按事件名与日分桶 |
| M18 | 使用漏斗 | 注册 → 建分支 → 完成待办 → 首次提交 → 首次同步 | `account.signup`、`branch.create`、`task.complete`、`commit.create`、`sync.push` | 同一 `userId` 在窗口内是否触达各步，输出各步人数与转化率 |

第一阶段看板优先展示：**M1–M8、M10–M15**；M9、M16–M18 作为后续补充。

### 5.3 事件字段

`ops_events` 的公共字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `event` | string | 事件名，白名单枚举 |
| `userId` | string | 账号 `ownerId`；服务端从调用身份解析，忽略客户端传值 |
| `visitorId` | string | 匿名安装 ID，客户端生成；≤64 字符 |
| `deviceId` | string | 设备 ID；≤64 字符 |
| `platform` | string | `web` / `wechat` / `admin` |
| `appVersion` | string | 版本号；≤32 字符 |
| `localDate` | string | 客户端本地日 `YYYY-MM-DD`，用于按用户时区分桶 |
| `at` | number | **服务端接收时间** UTC 毫秒，不取客户端时间 |
| `tzOffset` | number | 客户端时区偏移分钟，东正西负，范围 `-720..840` |
| `props` | object | 每事件白名单键值，最多 12 个键；值只能是短字符串、数字、布尔 |
| `source` | string | `client` / `server` |
| `schemaVersion` | number | 固定 `1` |

事件与 `props` 白名单：

| 事件 | 触发 | props |
|---|---|---|
| `app.open` | 每个本地日首次进入工作区 | 无；同一账号+设备+日期只记一次 |
| `account.signup` | 注册成功 | `{ method: 'email' }` |
| `sync.push` | 一次补推结束 | `{ ops: number, result: 'success'\|'conflict'\|'failed', errorCode?: string }` |
| `backup.upload` | 异地备份上传结束 | `{ result: 'success'\|'failed', bytes?: number, errorCode?: string }` |
| `commit.create` | 完成待办产生提交 | `{ count: number }` |
| `task.complete` | 完成待办 | `{ count: number, hadDueDate: boolean }` |
| `branch.create` | 新建分支 | `{ depth: number }` |
| `milestone.create` | 新建里程碑 | `{ precision: 'day'\|'month' }` |
| `badge.grant` | 授予徽章 | `{ catalogId: string }` |
| `review.open` | 打开周/月/年回顾 | `{ kind: 'week'\|'month'\|'year' }` |

隐私约束：事件中**不出现**标题、分支名、备注、邮箱、业务实体 ID、IP、任何自由文本。`userId` 是账号归属键，已在业务表中存在；`visitorId` 是随机安装标识，不跨账号关联。

### 5.4 日界与时区

- 事件按 `localDate`（客户端本地日）分桶，避免跨时区用户在 UTC 零点附近被拆成两天。
- 看板默认按 `Asia/Shanghai` 展示；`localDate` 直接使用，不再二次换算。
- `at` 只用于排查与原始时间线，不参与日活口径。
- 汇总时若 `localDate` 缺失或非法，服务端拒收该事件；不做服务端猜测。

### 5.5 留存口径说明

- 默认使用**精确日留存**（C+n 当天回访），同时提供**任意回访**（C+n 及以后）作为第二口径；两者在图上分开标注，不混用。
- 新用户 cohort 以 `user_first_seen.firstSeenDate` 为准，首见事件优先 `account.signup`，没有注册事件时取首次 `app.open`。
- D30 需要 C+30 已结束才标记 `ready`；未成熟显示 `insufficient`，不拿 0 填充。

### 5.6 M1–M18 逐项实现定义

统一符号：`D` 为报表日；`C` 为 cohort 首见日；`today` 为服务端按 `Asia/Shanghai` 算出的当天；所有日界使用事件 `localDate`，不使用 `at`。空态三档：`not_ready`（依赖表/索引缺失）、`insufficient`（分母为 0 或观察窗未成熟）、`ready`（可计算，计数类 0 是合法值）。

#### 5.6.1 活跃（M1–M4）

| 指标 | 分子 | 分母 | 计算窗口 | 依赖字段 | 空态 |
|---|---|---|---|---|---|
| M1 DAU（账号） | `count(distinct userId)`，条件 `event='app.open'` 且 `localDate=D` | 无（计数） | `[D, D]` | `event`、`userId`、`localDate` | 表缺失 → `not_ready`；表存在无行 → `0` |
| M2 DAU（设备） | `count(distinct visitorId)`，条件同上 | 无（计数） | `[D, D]` | `event`、`visitorId`、`localDate` | 同上 |
| M3 WAU | `count(distinct userId)`，条件 `event='app.open'` 且 `localDate ∈ [D-6, D]` | 无（计数） | 滚动 7 天 | 同上 | 同上 |
| M4 MAU | `count(distinct userId)`，条件 `event='app.open'` 且 `localDate ∈ [D-29, D]` | 无（计数） | 滚动 30 天 | 同上 | 同上 |

去重键：账号指标用 `userId`；设备指标用 `visitorId`；两者都不回退到对方，避免把「换设备」误算成「新用户」。

#### 5.6.2 注册与留存（M5–M9）

| 指标 | 分子 | 分母 | 计算窗口 | 依赖字段 | 空态 |
|---|---|---|---|---|---|
| M5 新增账号 | `count(distinct userId)`，满足注册日 = D | 无（计数） | `[D, D]` | `user_first_seen.signupAt`；无 `signupAt` 时用 `firstSeenDate` | `user_first_seen` 缺失 → `not_ready`；无行 → `0` |
| M6 D1 留存 | cohort 中 `localDate=C+1` 有 `app.open` 的 `userId` 数 | cohort 大小 = `count(distinct userId)` 且 `firstSeenDate=C` | 观察窗 `[C+1, C+1]`；仅当 `C+1 ≤ today` 才计算 | `user_first_seen.firstSeenDate`、`ops_events.event/userId/localDate` | 表缺失 → `not_ready`；cohort=0 或 `C+1>today` → `insufficient`；否则百分比 |
| M7 D7 留存 | cohort 中 `localDate=C+7` 有 `app.open` 的 `userId` 数 | 同上，`firstSeenDate=C` | 观察窗 `[C+7, C+7]`；仅当 `C+7 ≤ today` | 同上 | 同上 |
| M8 D30 留存 | cohort 中 `localDate=C+30` 有 `app.open` 的 `userId` 数 | 同上 | 观察窗 `[C+30, C+30]`；仅当 `C+30 ≤ today` | 同上 | 同上 |
| M9 Dn+ 任意回访 | cohort 中在 `[C+n, min(today, C+30)]` 内任意一天有 `app.open` 的 `userId` 数 | 同上 | 观察窗从 `C+n` 到 `min(today, C+30)`；仅当 `C+n ≤ today` | 同上 | 同上；`n` 取 1/7/30 |

留存补充：

- 注册日口径：`signupAt` 非空时用 `signupAt` 的本地日；为空时用 `firstSeenDate`，并在返回中标注 `signupSource='first_seen_fallback'`。
- 首次出现日 `C` 必须来自 `user_first_seen.firstSeenDate`，不能用查询窗口内的最小活跃日代替，否则老用户会被误判为新 cohort。
- 分子只统计 cohort 内用户；cohort 外用户同一天活跃不计入。
- 百分比保留 1 位小数；分母为 0 返回 `null` 而不是 `0%`。
- `mode='exact'` 用 M6–M8；`mode='any'` 用 M9；前端必须显示当前口径，不能混在同一根柱子。

#### 5.6.3 同步与备份（M10–M13）

| 指标 | 分子 | 分母 | 计算窗口 | 依赖字段 | 空态 |
|---|---|---|---|---|---|
| M10 同步设备数 | `count(distinct deviceId)`，条件 `event='sync.push'`、`props.result='success'` | 无（计数） | `[D-6, D]` | `event`、`deviceId`、`props.result`、`localDate` | 表缺失 → `not_ready`；无行 → `0` |
| M11 同步成功率 | `count(sync.push 且 result='success')` | `count(全部 sync.push)` | 报表区间 `[from, to]`；日序列按单日 D | `event`、`props.result`、`localDate` | 分母 0 → `insufficient` + `null`；否则百分比 1 位小数 |
| M12 备份成功数 | `count(backup.upload 且 result='success')` | 无（计数） | `[D, D]`；区间视图用 `[from, to]` | `event`、`props.result`、`localDate` | 表缺失 → `not_ready`；无行 → `0` |
| M13 备份失败数 | `count(backup.upload 且 result='failed')` | 无（计数） | 同上 | 同上；另按 `props.errorCode` 分组 Top N | 同上 |

`result` 只允许 `success` / `conflict` / `failed`；`conflict` 不计入成功也不计入失败，单独展示。`deviceId` 为空的 `sync.push` 计入成功率分母，但不计入 M10 设备数。

#### 5.6.4 业务活跃与功能使用（M14–M18）

| 指标 | 分子 | 分母 | 计算窗口 | 依赖字段 | 空态 |
|---|---|---|---|---|---|
| M14 提交活跃账号 | `count(distinct ownerId)`，条件 `commits.date=D`、`deletedAt=null`、`voidedAt=null` | 无（计数） | `[D, D]` | `ownerId`、`date`、`deletedAt`、`voidedAt` | `commits` 缺失/缺跨账号 `date` 索引 → `not_ready`；无行 → `0` |
| M15 每日提交数 | `count(*)`，条件同上 | 无（计数） | `[D, D]` | 同上 | 同上 |
| M16 新增分支数 | `count(*)`，条件 `localDate(createdAt)=D`、`deletedAt=null` | 无（计数） | `[D, D]` | `createdAt`、`deletedAt` | `branches` 缺失/缺跨账号 `createdAt` 索引 → `not_ready`；无行 → `0` |
| M17 功能使用次数 | 按事件名分别 `count(*)`：`branch.create`、`task.complete`、`commit.create`、`milestone.create`、`badge.grant`、`review.open`、`sync.push`、`backup.upload` | 无（计数） | `[D, D]` | `event`、`localDate` | `ops_events` 缺失 → `not_ready`；无行 → `0` |
| M18 使用漏斗 | 各步 cohort 内去重 `userId` 数 | cohort = `account.signup` 落在 `[from, to]` 的去重 `userId`；无注册事件时回退 `user_first_seen.firstSeenDate` | 每个用户观察窗 `[注册本地日, min(today, 注册本地日+30)]` | `account.signup`、`branch.create`、`task.complete`、`commit.create`、`sync.push`、`userId`、`localDate` | 事件表缺失 → `not_ready`；cohort=0 → `insufficient`；每步输出人数与「该步人数 / cohort」转化率 |

M18 步骤顺序固定为：`注册` → `建分支` → `完成待办` → `首次提交` → `首次同步`。同一步骤只计一次；用户在某步之前没有完成前序步骤也算触达后续步骤（漏斗图如实展示，不强制路径唯一），另给一列「严格路径转化」用于对比。

#### 5.6.5 共同规则

- 所有计数类指标：表存在且查询成功但无行 → `0`；表/索引缺失 → `not_ready`；不把缺失伪装成 0。
- 所有比例类指标：分母 0 或观察窗未成熟 → `insufficient` + `null`；不显示 `0%`。
- 时间窗口左闭右闭；`from`/`to` 均为 `localDate` 字符串；跨越 90 天时前端提示「按日查询较慢」。
- 同一 `userId` 在同一天重复上报 `app.open` 只算一次；服务端按 `event + userId + visitorId + localDate` 去重。
- 管理员账号是否从指标中排除尚未拍板（见 §7 D13）；未拍板前不排除，避免静默改变口径。

---


## 6. 管理接口契约（`admin-api`）

### 6.1 调用方式

前端通过 CloudBase Web SDK 调用云函数，不直连数据库：

```ts
app.callFunction({
  name: 'admin-api',
  data: { action: 'tables.rows', collection: 'branches', limit: 50 },
});
```

函数名只使用小写字母、数字与连字符：`admin-api`。`cloudbaserc.json` 的 `functions[].name`、目录名、调用名必须一致。

### 6.2 鉴权包装

每个 action 在注册表里都被 `requireAdmin(handler)` 包装，进入 handler 前完成 §3 的完整校验；不存在绕过鉴权的 action。`whoami` 也走同一包装，只是成功时返回身份信息。

### 6.3 只读接口（第二阶段先交付）

| action | 参数 | 返回 |
|---|---|---|
| `whoami` | 无 | `{ uid, email, role: 'admin' }` |
| `meta.contract` | 无 | `{ schemaVersion, collections: [...], writable: {...}, eventNames: [...] }` |
| `tables.list` | 无 | 每张表的 `{ name, label, read, write, writableFields, ready }` |
| `tables.rows` | `{ collection, limit≤100, cursor?, ownerId?, from?, to?, q? }` | `{ rows, nextCursor, maskedFields }`；按 `_id` 倒序分页 |
| `tables.row` | `{ collection, id }` | `{ row, maskedFields }` |
| `metrics.overview` | `{ from, to, tzOffset? }` | 每个指标 `{ value, status, source, note? }` |
| `metrics.timeseries` | `{ metric, from, to }` | `{ points: [{ date, value }] }` |
| `metrics.retention` | `{ from, to, days: [1,7,30], mode: 'exact'\|'any' }` | `{ cohorts: [{ cohortDate, cohortSize, d1, d7, d30 }] }` |
| `audit.list` | `{ collection?, docId?, actorEmail?, from?, to?, limit≤100, cursor? }` | `{ rows, nextCursor }` |

约定：

- `cursor` 是上一页最后一行的 `_id`；服务端用 `_id < cursor` 继续分页，避免 skip 越翻越慢。
- 行返回前统一脱敏：`users` 去掉密码/令牌类字段；`outbox` 默认去掉 `payload`；`backups` 去掉 `payload`；`ops_events` 不含自由文本。
- 表未创建时返回 `admin_collection_missing`，前端显示「表未就绪」，不是空数据。
- 指标事件表未创建时返回 `admin_metrics_unavailable`，或按指标返回 `status: 'not_ready'`。
- 不允许前端传任意 `collection`；服务端只认注册表内的表。
- 不允许前端传 `ownerId` 作为鉴权；`ownerId` 只作为筛选条件。

### 6.4 写接口（已实现）

| action | 参数 | 返回 |
|---|---|---|
| `tables.update` | `{ collection, id, patch, expectedRev, reason, ownerId? }` | `{ row, auditId, noop? }` |

- 只允许 §4.2 的六张表与字段白名单；越界返回 `admin_field_not_allowed` 403，表只读返回 `admin_table_not_allowed` 403。
- `reason` 必填（trim 后 1–200 字），缺失或超长 `admin_invalid_params` 400。
- `expectedRev` 必须等于服务端当前 `rev`；不等返回 `admin_conflict` 409，`details = { expectedRev, currentRev }`。
- `patch` 与当前值完全一致时不写数据库、不写审计，返回原行与 `noop: true`。
- 成功：服务端把 `rev + 1`、`updatedAt` 置为服务端时间，并在同一事务写一条 `admin_audit_log`（`action = 'admin.update'`，`before` / `after` 仅含变更字段，含 `beforeAbsent` / `afterAbsent`）。
- 不支持新增、物理删除、批量写。
- 前端入口：表详情抽屉的「编辑」→ 抽屉内二次确认层 → 提交；确认层逐字段列出「旧值 → 新值」，冲突时就地提示刷新。

### 6.5 事件采集接口（`ops-event`）

```ts
await app.callFunction({
  name: 'ops-event',
  data: {
    events: [{
      event: 'app.open',
      platform: 'web',          // web | wechat
      localDate: '2026-11-22',  // 客户端本地日
      tzOffset: 480,            // 分钟，东正西负，-720..840
      visitorId: 'v_xxx',       // 未登录必填
      deviceId: 'd_xxx',
      appVersion: '2.0.0',
      eventId: '...',           // 非 app.open/account.signup 必填，8..64 位
      props: {},                // 仅白名单键
    }],
  },
});
```

| 约束 | 规则 |
|---|---|
| 批量 | 单次最多 20 条，超过返回 `ops_batch_too_large`（413） |
| 事件白名单 | 只接受 CLOUD-SCHEMA-REQUEST §3 的 10 个事件；未知事件整包拒绝 `ops_invalid_event` |
| props | 每事件白名单键；未知键、超过 12 键、类型不符整包拒绝 |
| 身份 | `userId` 只取调用身份；客户端传值忽略；未登录必须带 `visitorId` 或 `deviceId` |
| 时间 | `localDate` 必须是合法日期且与服务端日期偏差 ≤1 天；`at` 取服务端时间 |
| 去重 | `app.open` 键为 `evt:app.open:<账号或匿名>:<设备>:<localDate>`；`account.signup` 为 `evt:account.signup:<账号>:<localDate>`；其余为 `evt:<event>:<eventId>`；重试命中已存在键计入 `duplicates`，不重复计数 |
| 失败 | 返回 `ok:false` + 错误码，客户端静默忽略，不阻塞主流程 |
| 派生表 | 有 `userId` 时 upsert `user_first_seen`；派生失败只记日志，不影响事件写入 |

### 6.6 保留清理（`ops-retention`）

- 触发：定时触发器 `ops-retention-daily`，Cron `0 10 3 * * * *`（每天 03:10，北京时间）。
- 行为：只删除 `ops_events.at < now - 400 天` 的行；单次最多 5000 行，未删完下次继续。
- 保护：带用户身份的客户端调用返回 `ops_retention_forbidden`；定时触发器与控制台运维无用户身份，可执行。
- 真实返回：`{ ok: true, data: { retentionDays: 400, cutoffIso, scanned, deleted, capped } }`。

---

## 7. 待定清单与最小风险默认值

下列口径仍待最终拍板。为避免「因为待定整块不做」，当前实现一律先取**最小风险默认值**；后续拍板与此不同时，只改对应实现，不改变其余结构。

| # | 问题 | 选项 | 当前默认（最小风险） | 说明 |
|---|---|---|---|---|
| D1 | 是否区分只读管理员与可写管理员 | A. 单一 `ADMIN_EMAILS`；B. 再加 `ADMIN_WRITE_EMAILS` | **A** | 白名单内即管理员；写接口仍受字段白名单与审计约束 |
| D2 | 编辑是否二次确认 | A. 弹窗确认；B. 必须输入行 ID；C. 不确认 | **A（抽屉内确认层）** | 确认层逐字段列旧值/新值；不要求手输 ID，避免无谓摩擦 |
| D3 | 指标先上哪些 | A. M1–M12；B. 再加 M13–M18 漏斗 | **A** | `metrics.overview` 覆盖 M1–M12；M13–M18 无事件来源，保持未接入，不造假 |
| D4 | 留存主口径 | A. 精确日；B. 任意回访；C. 两者都展示 | **A（精确日 D1/D7/D30）** | 队列按 `firstSeenDate` 精确日；C 需额外口径与图位 |
| D5 | 原始事件保留多久 | A. 90 天；B. 180 天；C. 400 天 | **C（400 天）** | `ops-retention` 已按 400 天清理 |
| D6 | 未登录/匿名事件是否统计 | A. 只统计登录账号；B. 同时统计匿名安装 | **A（账号口径）** | 日活/周活/月活/留存只认 `userId`；设备数用 `visitorId` 兜底，仅作设备维度 |
| D7 | 指标日界 | A. 统一 `Asia/Shanghai`；B. 按事件 `localDate` | **B（事件 `localDate`）** | 趋势与队列按客户端本地日；`tzOffset` 仅决定默认区间与「今天」 |
| D8 | 生命周期字段是否允许直接编辑 | A. 只读，走业务动作；B. 管理站直接改 | **A** | `status`、完成/归档时间、计数、树结构全部只读 |
| D9 | 审计保留多久、是否记录读取 | A. 只记写、长期保留；B. 记录读取并设保留期 | **A** | 只追加写审计，不记录读取；不设清理任务 |
| D10 | 管理站部署位置 | A. 同环境 `/admin-console/`；B. 独立域名 | **A** | 已发布到同环境子路径，未影响 web 根目录 |
| D11 | 邮箱验证判定 | A. `enforce`；B. `trust-login` | **A** | 环境变量 `ADMIN_EMAIL_VERIFICATION_MODE=enforce`；接口不返回验证字段时按未验证拒绝 |
| D12 | 表浏览是否默认脱敏用户邮箱 | A. 脱敏；B. 完整显示 | **B（完整显示）** | 仅白名单管理员可见，排障优先；如需脱敏只改 `maskRow` |
| D13 | 指标是否排除管理员账号 | A. 不排除；B. `EXCLUDED_USER_IDS` | **A** | 口径最简单；内部使用对指标的影响当前可接受 |

**回退口径（最小风险）**：审计页只支持「单次回退到某条审计的旧值」——读取当前行，用该条审计的 `before` / `beforeAbsent` 反向覆盖变更字段，以当前 `rev` 作 `expectedRev` 重新走一次 `tables.update`，并写一条新的 `admin.update` 审计；不实现「回退到某个时间点」的多步重放，也不改历史审计。若当前字段值已与 `before` 相同，提示「无需回退」且不写审计。

---

## 8. 第二阶段实施顺序

1. **只读骨架**：登录、`whoami` 权限门、无权/未验证页、指标空态、表列表、表浏览、审计列表。
2. **表就绪后**：`admin-api` 接真实表；指标先显示 `not_ready`，`ops_events` 落库后自动变为 `ready`。
3. **事件接入**：由 Web/小程序/服务端按 §5.3 埋点；管理站不写测试业务数据。
4. **编辑能力**：按 D1/D2/D8 拍板后开放 `tables.update`，先单表、单行、字段白名单、事务审计。
5. **验证**：`admin` 的 `npm run build`；`web` 的 lint/test/build/dev 四条命令保持全绿；管理站用白名单邮箱、非白名单邮箱、未验证邮箱各走一次。

---

## 9. 验证与验收

### 9.1 自动化

- `cd admin && npm run build`：类型检查与构建通过。
- `cd web && npm run lint && npm test && npm run build`：三条保持全绿。
- `cd web && npm run dev`：首页仍返回 200，路由无管理入口。

### 9.2 人工验收（需真实环境）

1. 未登录调用 `admin-api` → `admin_unauthenticated`，前端回登录页。
2. 非白名单邮箱登录 → `admin_forbidden`，前端显示「无权访问」，不白屏。
3. 未验证邮箱登录 → `admin_email_unverified`，前端显示独立说明页。
4. 白名单邮箱大小写/前后空格不同 → 仍可进入，证明归一化生效。
5. 清空 `ADMIN_EMAILS` → 所有人都被拒绝，证明默认全拒。
6. `ops_events` 未创建 → 指标显示「未接入」，不显示假数据。
7. `ops_events` 创建但无数据 → 指标显示空态或 `insufficient`，不报错。
8. 无权限账号看不到任何业务行；通过云函数直接调用同样被拒绝。
9. 总览：KPI 5 项；趋势双折线（本期/上期对比）；留存 3 个统计框 + cohort 表；同步成功率、备份成功/失败、有效提交三卡与画稿一致。
10. 编辑：抽屉内改字段 → 确认层列出「旧值 → 新值」→ 提交后 `rev + 1`，审计列表出现一条 `admin.update`。
11. 冲突：用过期 `expectedRev` 提交 → `admin_conflict`，确认层就地提示刷新，不写入。
12. 回退：审计行点「回退」→ 确认层显示「当前值 → 恢复值」→ 提交后字段恢复，并新增一条审计；值已相同则提示「无需回退」。

---

## 10. 部署与运维

### 10.1 目标与产物

| 项 | 值 |
|---|---|
| 前端工程 | `admin/`（独立 `package.json` 与 lockfile） |
| 构建命令 | `cd admin && npm ci && npm run build` |
| 构建产物 | `admin/dist/`（`index.html` + `assets/*` + 各路由的 `index.html` 副本） |
| 生产 `base` | `/admin-console/` |
| 静态托管目标 | 环境 `committodo-d6gmapg0j6397889f` 的 `/admin-console` 子路径 |
| 访问域名 | `https://committodo-d6gmapg0j6397889f-1259162353.tcloudbaseapp.com/admin-console/` |
| 部署命令 | `npx @cloudbase/cli hosting deploy ./dist /admin-console -e committodo-d6gmapg0j6397889f`（不要加 `--verify`，CDN 同步延迟会造成假阴性） |
| 当前状态 | 2026-11-22 已发布 23 个文件；`/admin-console/`、`/admin-console/tables/branches`、`/admin-console/audit` 均实测 200；只写 `/admin-console`，未改 web 根目录与既有对象 |

### 10.2 环境变量清单

| 变量 | 归属 | 必填 | 说明 |
|---|---|---|---|
| `ADMIN_EMAILS` | `admin-api` 函数环境变量 | 是（未配置时默认全拒） | 逗号分隔的白名单邮箱；服务端 `trim + 小写` 归一化；空串或未配置 → 所有请求 `admin_forbidden` |
| `ADMIN_EMAIL_VERIFICATION_MODE` | `admin-api` 函数环境变量 | 否 | `enforce`（默认，要求接口返回邮箱已验证）或 `trust-login`（已确认登录强制验证时使用） |
| `VITE_CLOUDBASE_ENV_ID` | 前端构建时 | 是 | `committodo-d6gmapg0j6397889f` |
| `VITE_CLOUDBASE_REGION` | 前端构建时 | 是 | `ap-shanghai` |
| `VITE_ADMIN_API_FUNCTION` | 前端构建时 | 是 | `admin-api` |

- 不配置任何密钥：管理前端只用 CloudBase Web SDK 的登录态调用云函数；云函数用环境内置凭据访问数据库。
- `.env.local` 只放环境 ID / 地域 / 函数名，已被 gitignore；`.env.example` 入库。
- 白名单具体邮箱值不进仓库，只在云函数环境变量里配置。

### 10.3 云函数部署

```bash
# 三个函数都在 admin/cloudbaserc.json 中声明，functionRoot 指向 ../cloudfunctions
tcb fn deploy admin-api     --cwd admin -e committodo-d6gmapg0j6397889f
tcb fn deploy ops-event     --cwd admin -e committodo-d6gmapg0j6397889f
tcb fn deploy ops-retention --cwd admin -e committodo-d6gmapg0j6397889f
```

- 函数名只允许小写字母、数字与连字符：`admin-api`、`ops-event`、`ops-retention`。
- 只新增自己的函数目录，不修改 `backup-sign`、`workspace-read`、`sync-push` 等他人函数。
- 部署配置：Nodejs20.19，`admin-api` / `ops-event` 超时 20s，`ops-retention` 超时 60s，云端安装依赖。

### 10.4 定时触发器

| 项 | 值 |
|---|---|
| 函数 | `ops-retention` |
| 触发器名 | `ops-retention-daily` |
| 类型 | `timer` |
| Cron | `0 10 3 * * * *`（每天 03:10，SCF 定时触发器按北京时间） |
| 创建命令 | `tcb fn trigger create ops-retention --trigger-name ops-retention-daily --cron "0 10 3 * * * *" -e committodo-d6gmapg0j6397889f` |
| 已创建 | 2026-11-22 13:45:58，`tcb fn detail ops-retention` 已确认 |

### 10.5 更新流程

1. 前端：`cd admin && npm ci && npm run build`；`vite.config.ts` 的 `spaRouteFallbacks` 会为 `/tables`、`/audit` 和 18 个 `/tables/<collection>` 各复制一份 `index.html`。确认 `dist/index.html` 引用 `/admin-console/assets/...` 且含 `noindex,nofollow`。
2. 云函数：改动后按 §10.3 重新 `fn deploy`；改环境变量用 `tcb fn env` 或控制台。
3. 静态托管：执行 §10.1 的 `hosting deploy`，只写 `/admin-console`，不动 web 根路径与既有 bucket 对象。
4. 发布后回归：`whoami` → `tables.list` → `metrics.overview` → 浏览器打开 `/admin-console/` 与任一深链接，确认 HTML 与资源均 200。

---

## 11. 真实验证记录（2026-11-22）

### 11.1 已完成

| 项 | 命令 / 方式 | 真实返回 |
|---|---|---|
| 部署 `admin-api`（未配置 `ADMIN_EMAILS`） | `tcb fn deploy admin-api` | `create` 成功 |
| 未登录调用 | `tcb fn invoke admin-api` + `{"action":"whoami"}` | `{"ok":false,"code":"admin_unauthenticated","status":401}`，requestId `fc4e2be0-d761-4c3a-935c-9bce6b2d5797` |
| 伪造 `userInfo.uid` 调用 | `{"action":"whoami","userInfo":{"uid":"forged-uid"}}` | 仍返回 `admin_unauthenticated` 401，requestId `3a785456-0cb0-47fa-9419-0e09ae7ad882` |
| 空白名单 / 归一化 / 未验证 / 无身份（本地校验同一份函数代码） | 注入假身份调用 `main()` | `empty-whitelist → admin_forbidden 403`；`whitelisted-normalized → ok`；`not-whitelisted → admin_forbidden 403`；`verified-false → admin_email_unverified 403`；`verified-unknown-enforce → admin_email_unverified 403`；`trust-login → ok`；`no-uid → admin_unauthenticated 401` |
| 部署 `ops-event` | `tcb fn deploy ops-event` | `create` 成功 |
| 未知事件 | 真实调用 | `ops_invalid_event`：`未知事件：fake.event（第 1 条）` |
| 非法 props | 真实调用 `app.open` + `props.email` | `ops_invalid_event`：`app.open 不接受 props（第 1 条）` |
| 日期偏差 | 真实调用 `localDate=2020-01-01` | `ops_invalid_event`：`localDate 与服务端日期偏差超过 1 天（第 1 条）` |
| 批量超限 | 真实调用 21 条 | `ops_batch_too_large`：`单次最多 20 条事件`（413） |
| 未带身份 | 真实调用 `app.open` 不带 `visitorId` | `ops_invalid_event`：`未登录时必须提供 visitorId 或 deviceId（第 1 条）` |
| 未登录注册事件 | 真实调用 `account.signup` 仅带 `visitorId` | `ops_invalid_event`：`account.signup 需要登录身份（第 1 条）` |
| 部署 `ops-retention` + 触发器 | `tcb fn deploy` / `tcb fn trigger create` | 触发器详情：`ops-retention-daily` / `timer` / `{"cron":"0 10 3 * * * *"}` |
| 清理函数空跑 | 真实调用 | `{"ok":true,"data":{"retentionDays":400,"cutoffIso":"2025-10-18T05:46:19.666Z","scanned":0,"deleted":0,"capped":false}}` |

### 11.2 待验证（被账号阻塞）

| 项 | 阻塞原因 | 解除条件 |
|---|---|---|
| 真实只读链路：`tables.list` 列出 18 张真实表、`tables.row` 读行、`metrics.overview` 从 `not_ready` 变 `ready` | 云函数身份只能来自真实登录；本地没有白名单账号凭据 | 用户提供白名单账号的邮箱 + 测试密码（或临时密码），或用户在预览里自行登录后交接 |
| 三个鉴权错误码端到端 | 同上 | 同上，另加一个非白名单账号 |
| `tables.update` 单行真实改回与两条审计 | 同上；代码与 fixture 已打通 | 同上 |
| 集合安全规则：客户端能否直读集合 | 该环境**未开启匿名登录**：`signInAnonymously` 真实返回 `login_type_disabled`（errorCode 4045） | 控制台开启匿名登录后复测，或用真实登录账号的 token 直读测试 |

### 11.3 集合安全规则（待办）

- 现状：无法用匿名 key 验证（匿名登录未开启）。
- 需要确认：所有业务集合应为「仅云函数可读写」，客户端 Web SDK 直接 `collection().get()` 应被拒绝。
- 这条已列为待办，需到控制台「数据库 → 安全规则」逐集合确认；管理站代码无法替代该配置。

### 11.4 静态托管与深链接回退（2026-11-22）

| 项 | 结论 |
|---|---|
| 环境支持的配置方式 | CloudBase CLI 没有设置错误文档 / rewrite 的命令；`hosting detail` 显示 `errorDocument` 为空。桶级静态网站配置可设 `IndexDocument` 与 `RoutingRules`，但路由规则是**重定向**（3xx），且错误文档是**整桶生效** |
| 为什么不设整桶错误文档 | 同桶根目录是 Web 客户端；把错误文档指向 `admin-console/index.html` 会让 Web 的 404 返回管理站 HTML，影响另一条产品线 |
| 为什么不设前缀重定向 | 前缀 + 404 的规则会把 `/admin-console/tables/branches` 302 到 `/admin-console/index.html`，URL 与目标路由丢失，不满足“深链接返回 200 并落在原页面” |
| 采用方案 | 保留 `BrowserRouter`；构建时由 `vite.config.ts` 的 `spaRouteFallbacks` 为已注册路由生成 `index.html` 副本，利用桶已有 `AutoAddressing`（`/dir` 自动寻址 `dir/index.html`）实现无重定向回退 |
| 覆盖路由 | `/`、`/tables`、`/audit`、`/tables/<18 个集合>`；行详情与编辑是抽屉，不占路由。新增路由必须同步更新 `ADMIN_COLLECTIONS` 或路由列表，否则该深链接返回 404 |
| 部署结果 | `tcb hosting list /admin-console` 共 23 个对象；`hosting deploy --verify` 的上传成功但校验阶段因 CDN 尚未生效报“缺失”，属假阴性，已用实际 HTTP 复核 |
| HTTP 复核 | `/admin-console/`、`/admin-console`、`/admin-console/tables`、`/admin-console/tables/branches`、`/admin-console/tables/ops_events`、`/admin-console/audit` 均 `200 text/html`；JS/CSS 资源 `200`；深链接返回的 HTML 含 `noindex,nofollow`、标题“CommitToDo 管理站”、资源前缀 `/admin-console/assets/` |
| 接口 fail-closed | 部署前 `admin-api` 未配置 `ADMIN_EMAILS`；`tables.list`、`metrics.overview`、`tables.rows`、`audit.list`、`tables.update` 无身份调用均返回 `admin_unauthenticated` 401 |

### 11.5 本轮补全后的复验（2026-11-22）

| 项 | 方式 | 结果 |
|---|---|---|
| `admin-api` 重新部署（指标聚合 + 上期对比 + `tables.update`） | `tcb fn deploy admin-api -e committodo-d6gmapg0j6397889f --force` | 部署成功，`node --check` 通过 |
| 白名单 fail-closed | `tcb fn detail admin-api` | 环境变量只有 `ADMIN_EMAIL_VERIFICATION_MODE=enforce`，无 `ADMIN_EMAILS`；空名单即全拒 |
| 无身份调用 | `tcb fn invoke admin-api --params '{"action":"whoami"}'` | `{"ok":false,"code":"admin_unauthenticated","status":401}` |
| 静态托管发布 | `tcb hosting deploy ./dist /admin-console` | 23 个文件全部上传成功，未写 web 根目录 |
| 深链接 | curl `/admin-console/`、`/admin-console/tables/branches`、`/admin-console/audit` | 全部 `200` |
| `--verify` 行为 | 带 `--verify` 的同一命令 | 上传成功但校验报 `missing=...`；属 CDN 同步假阴性，去掉 `--verify` 后以真实 HTTP 复核为准 |

---

## 12. Web 端埋点改动清单（只报告，未修改 `web/src/**`）

> 等用户确认没有其他线在改这些文件后再实施。

| 文件 | 改动 | 事件 |
|---|---|---|
| `web/src/data/cloud/ops-events.ts`（新增） | 事件队列 + `callFunction('ops-event')`；自动补 `localDate`（`core/clock` 的 `today()`）、`tzOffset`（`-new Date().getTimezoneOffset()`）、`eventId`（ULID/UUID）；失败静默、不重试阻塞主流程 | 通用 |
| `web/src/components/layout/app-shell.tsx` | 每个本地日首次进入工作区上报一次（localStorage 记已上报日期） | `app.open` |
| `web/src/data/cloud/auth.ts` | 注册成功后上报 | `account.signup`（`method`） |
| `web/src/data/sync.ts` | `pushOutbox` 结束后按结果上报 | `sync.push`（`ops`、`result`、`errorCode`） |
| `web/src/data/upload-remote-backup.ts` | 备份上传结束后上报 | `backup.upload`（`result`、`bytes`、`errorCode`） |
| `web/src/data/complete-task.ts` | 完成待办事务成功后上报 | `task.complete`（`count`、`hadDueDate`）、`commit.create`（`count`） |
| `web/src/data/create-branch.ts` | 新建分支成功后上报 | `branch.create`（`depth`） |
| `web/src/data/create-milestone.ts` | 新建里程碑成功后上报 | `milestone.create`（`precision`） |
| `web/src/data/grant-badge.ts` | 授予徽章成功后上报 | `badge.grant`（`catalogId`） |
| 周/月/年回顾页 | 打开回顾时上报 | `review.open`（`kind`） |

- 所有上报都在业务成功后异步发出，不改变原有用例的返回值和事务边界。
- 不上报标题、备注、邮箱、分支名等自由文本；`eventId` 由客户端生成，重试复用同一个。

