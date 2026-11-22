# 管理站 · 云端表清单移交

> 交给正在按 `docs/TECH-ARCHITECTURE.md` §5.3 重建库那条线。
> **本文只描述需求，不提供 DDL，不要求在管理站代码里建表。**
> 环境：`committodo-d6gmapg0j6397889f`（PostgreSQL 版 / ap-shanghai）。
> 原则：新增表只追加、不改现有业务表字段；表名 / 字段名与现有命名一致（集合 `snake_case`、字段 `camelCase`）。

---

## 1. 必需新增

### 1.1 `ops_events`（运营事件）

用途：留存与使用指标的唯一持久来源。CloudBase 日志仅保留 2 小时，不能作为指标来源。

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `_id` | string | 是 | ULID；`app.open` 等「每账号每设备每日一次」事件可用确定性键 `event:userId:visitorId:localDate` 去重 |
| `event` | string | 是 | 事件名，见 §3 白名单 |
| `userId` | string | 否 | 账号 `ownerId`；服务端从调用身份解析后写入，忽略客户端传值 |
| `visitorId` | string | 否 | 匿名安装 ID，≤64 字符 |
| `deviceId` | string | 否 | 设备 ID，≤64 字符 |
| `platform` | string | 是 | `web` / `wechat` / `admin` |
| `appVersion` | string | 否 | ≤32 字符 |
| `localDate` | string | 是 | 客户端本地日 `YYYY-MM-DD`；服务端校验格式，非法拒收 |
| `at` | number | 是 | **服务端接收时间** UTC 毫秒；不取客户端时间 |
| `tzOffset` | number | 是 | 分钟，东正西负，`-720..840` |
| `props` | object | 否 | 每事件白名单键值，最多 12 个键；值只能是短字符串、数字、布尔 |
| `source` | string | 是 | `client` / `server` |
| `schemaVersion` | number | 是 | 固定 `1` |

索引：

| 索引 | 用途 |
|---|---|
| `localDate` | 按日全量扫描 |
| `event + localDate` | 单事件日统计（DAU、备份、同步） |
| `userId + localDate` | 账号留存、活跃天数 |
| `visitorId + localDate` | 设备留存与去重 |
| `at` | 原始时间线、排障 |

保留：原始事件建议保留 **400 天**（覆盖 D30、年度对比）；到期由定时任务清理，管理站不删除。若成本敏感，最低保留 90 天，但 D30 之外的历史留存会缺失。

写入方：

- 新增 `ops-event` 云函数（管理站这条线新增，不改其他函数）：登录用户上报，服务端解析 `userId`，按事件白名单校验 `props`，非法键整包拒绝。
- 服务端埋点（`sync-push` / `backup-sign` 等）后续可按同一 schema 写入 `source='server'`；需要改其他函数时另行协调，不在本次范围。

隐私：不得写入邮箱、标题、分支名、备注、业务实体 ID、IP、自由文本。

---

### 1.2 `user_first_seen`（账号首见与最近活跃）

用途：留存 cohort、注册数、最近活跃。可由 `ops_events` 重建，属于派生表。

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `_id` | string | 是 | 等于 `userId`（账号 `ownerId`） |
| `userId` | string | 是 | 账号归属键 |
| `firstSeenDate` | string | 是 | 首次出现本地日 `YYYY-MM-DD` |
| `firstSeenAt` | number | 是 | 首次出现服务端 UTC 毫秒 |
| `firstPlatform` | string | 是 | `web` / `wechat` |
| `firstAppVersion` | string | 否 | 首次版本 |
| `signupAt` | number | 否 | 注册成功时间；没有注册事件时为空 |
| `lastSeenDate` | string | 是 | 最近一次活跃本地日 |
| `lastSeenAt` | number | 是 | 最近一次活跃服务端 UTC 毫秒 |
| `schemaVersion` | number | 是 | 固定 `1` |

索引：

| 索引 | 用途 |
|---|---|
| `firstSeenDate` | 按 cohort 取新增与留存分母 |
| `lastSeenDate` | 最近活跃、流失 |
| `signupAt` | 注册数按日分桶 |

写入方：`ops-event` 云函数在每次接收事件时 upsert；`firstSeen*` 只在首次写入，`signupAt` 只在 `account.signup` 首次写入，`lastSeen*` 取较大值。

---

### 1.3 `admin_audit_log`（管理站审计）

用途：记录谁、什么时候、改了哪张表哪一行、旧值新值。只追加，管理站不提供修改/删除入口。

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `_id` | string | 是 | ULID |
| `actorUid` | string | 是 | 操作者 CloudBase uid |
| `actorEmail` | string | 是 | 服务端解析并归一化后的邮箱 |
| `action` | string | 是 | 固定 `admin.update`，后续可扩展 |
| `collection` | string | 是 | 被修改的表 / 集合名 |
| `docId` | string | 是 | 被修改行的 `_id` |
| `ownerId` | string | 否 | 被修改行的归属账号 |
| `changedFields` | array<string> | 是 | 变更字段名 |
| `before` | object | 否 | 仅变更字段的旧值；删除类操作才记录整行 |
| `after` | object | 否 | 仅变更字段的新值 |
| `revBefore` | number | 否 | 写入前 `rev` |
| `revAfter` | number | 否 | 写入后 `rev` |
| `at` | number | 是 | 服务端 UTC 毫秒 |
| `requestId` | string | 是 | 云函数请求 ID |
| `clientIp` | string | 否 | 调用来源 IP |
| `source` | string | 是 | 固定 `admin-console` |
| `status` | string | 是 | `applied` / `failed` |
| `errorCode` | string | 否 | 失败错误码 |
| `schemaVersion` | number | 是 | 固定 `1` |

索引：

| 索引 | 用途 |
|---|---|
| `at` | 审计时间线 |
| `collection + docId + at` | 单行变更历史 |
| `actorEmail + at` | 按操作者查 |

保留：默认长期保留，不设 TTL；后续按合规要求再定。

脱敏：`passwordHash`、`token`、`secret`、`apiKey`、`authorization` 永不写入；`outbox.payload`、`backups.payload` 不写入审计正文。

写入方：`admin-api`，与业务写入同一事务；审计失败则业务写入回滚。

---

## 2. 可选（先不建）

### 2.1 `metrics_daily`（指标日缓存）

只有在 `ops_events` 数据量增大、看板实时聚合变慢时再建。字段：`_id`=日期、`date`、`dau`、`wau`、`mau`、`newUsers`、`activeDevices`、`syncSuccess`、`syncFailure`、`backupSuccess`、`backupFailure`、`commits`、`tasksCompleted`、`computedAt`、`schemaVersion`；索引 `date`。第一阶段**不请求**，避免多余表。

---

## 3. 事件白名单

| 事件 | 触发 | `props` 允许键 |
|---|---|---|
| `app.open` | 每个本地日首次进入工作区 | 无 |
| `account.signup` | 注册成功 | `method` |
| `sync.push` | 一次补推结束 | `ops`、`result`、`errorCode` |
| `backup.upload` | 异地备份上传结束 | `result`、`bytes`、`errorCode` |
| `commit.create` | 完成待办产生提交 | `count` |
| `task.complete` | 完成待办 | `count`、`hadDueDate` |
| `branch.create` | 新建分支 | `depth` |
| `milestone.create` | 新建里程碑 | `precision` |
| `badge.grant` | 授予徽章 | `catalogId` |
| `review.open` | 打开周/月/年回顾 | `kind` |

`result` 仅允许 `success` / `conflict` / `failed`；`errorCode` 使用短枚举，不写自由文本。

---

## 4. 现有业务表：管理站读取方式

**不需要改字段。** 管理站按 `_id` 倒序分页读取（业务行主键是 ULID，字典序即时间序），按 `ownerId` 筛选时复用现有 `[ownerId+...]` 索引。以下索引只在希望「跨账号按时间排序 / 统计」时再加，属于可选优化：

| 表 | 可选索引 | 用途 |
|---|---|---|
| `commits` | `date`、`at` | 跨账号每日提交统计 |
| `branches` | `createdAt` | 跨账号每日新开分支 |
| `devices` | `lastSyncAt` | 跨账号活跃设备 |
| `users` | `createdAt` | 跨账号注册列表排序 |
| `events` | `at` | 跨账号事件时间线 |

若数据库线选择不加，管理站退回逐页扫描并在页面标注「统计为抽样/较慢」，不伪造精确值。

---

## 5. 表就绪判定

管理站通过「集合是否存在」判定，不通过配置文件猜测：

- `ops_events`、`user_first_seen` 缺失 → 指标 `not_ready`，页面显示「指标未接入」。
- `admin_audit_log` 缺失 → 只读看板可用；编辑能力保持关闭（写入必须能审计）。
- 现有业务表缺失 → 对应表显示「表未就绪」，不显示 0 行假数据。
