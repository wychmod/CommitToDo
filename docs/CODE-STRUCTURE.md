# 代码结构契约

**状态**：2026-11-21 定稿（对应 TECH-ARCHITECTURE 0.20）。本文回答七件"开发照做即可"的事：用例层与事务边界、clock/ids 注入、错误模型、events 写入、Dexie 升级、响应式断点、组件与 CSS Modules 命名。与 PRD 的 205 个 OP、`web/src/core/**` 与 `web/src/data/**` 两类测试路径保持相容。

依据：`docs/TECH-ARCHITECTURE.md`、`docs/prd/`（25 份，§6.1 的 Harness 模板）、`web/src` 现有骨架。冲突项集中在 §8，不改 PRD、不改已定表结构。

## 1. 用例层与事务边界

### 1.1 位置与命名

- 用例（写操作）放 **`web/src/data/` 根目录下一层**，文件名 `动词-名词.ts`：`complete-task.ts`、`undo-commit.ts`、`finish-branch.ts`、`drop-branch.ts`、`resume-branch.ts`、`archive-branch.ts`、`restore-backup.ts`、`grant-badge.ts`、`bulk-import-tasks.ts`、`reorder-branches.ts`。
- 一个用例 = 一个用户动作 = PRD 的一个 OP；不写通用 CRUD 服务、不写 `updateBranch(patch)` 这种万能入口。
- 测试与被测同目录、同名：`web/src/data/complete-task.test.ts`，与 PRD §8.2 已声明的路径一致（如 `undo-transaction.test.ts`、`finish-transaction.test.ts` 继续可用，它们只是文件名，不要求与用例文件一一同名）。
- 只读查询留在 `data/repositories.ts` + `data/hooks.ts`；用例不导出 React Hook，页面用 `useLiveQuery` 读、用 `await useCase()` 写。

### 1.2 谁开事务

**用例函数是唯一开 `db.transaction` 的地方。** 仓储方法只做单表读写，不嵌套事务、不跨表。

```ts
// src/data/complete-task.ts
export async function completeTask(
  input: CompleteTaskInput,
  deps: WriteDeps = defaultWriteDeps,
): Promise<Result<CompleteTaskOutput>> {
  return db.transaction('rw', [db.tasks, db.commits, db.branches, db.events], async (tx) => {
    // 读 → 规则（core）→ 写 → 写事件，全部同一事务
  });
}
```

- 事务表清单必须显式列全，禁止 `db.transaction('rw', db.tables, ...)` 一把梭。
- 事务内只做同步规则计算与单表写；不发网络请求、不 `await` 非 Dexie Promise（V2 的 `outbox` 也是同事务写本地，不在这里等网络）。
- 仓储写方法内加 `assertInTransaction()`（`src/data/transaction.ts`）守卫：不在事务里调用直接抛 `Error`（编程错误，不是领域错误）。

### 1.3 仓储写接口形状

```ts
export interface TaskRepository {
  get(id: string): Promise<Task | undefined>;
  listByBranch(branchId: string): Promise<Task[]>;
  add(row: Task): Promise<string>;
  update(id: string, patch: Partial<Omit<Task, 'id' | 'ownerId'>>, rev: number): Promise<number>;
}
```

- 写方法一律单表、行级、带 `rev`（乐观校验），不做"顺带改计数"。
- 四计数（R7）只由用例在事务内调用 `recountBranch()`（`src/core/rules/counters.ts`）后写回。
- 返回值统一 `Promise`；错误由用例捕获并转 `Result`（见 §3）。

### 1.4 跨表动作的归属

| 动作 | 事务内表 | 用例文件 |
| --- | --- | --- |
| 完成待办 | tasks、commits、branches、events | `complete-task.ts` |
| 撤销提交 | tasks、commits、branches、events | `undo-commit.ts` |
| 收尾分支 | branches、commits、tasks、events | `finish-branch.ts` |
| 放下 / 重新开始 | branches、tasks、events | `drop-branch.ts`、`resume-branch.ts` |
| 导入 / 恢复 | 七表 + backups、events | `restore-backup.ts` |
| 发徽章 | badges、events | `grant-badge.ts` |
| 排序 / 置顶 | branches 或 tasks、events | `reorder-branches.ts` |

单表动作（重命名、目标、里程碑、设置、主题）同样走用例，只是事务表清单短。

## 2. clock / ids 注入

### 2.1 统一入口

```ts
// src/core/clock.ts
export interface Clock {
  now(): number; // UTC 毫秒
}
export const systemClock: Clock;

/** 把 UTC 毫秒按给定时区偏移换成 YYYY-MM-DD（东八区传 +480）。 */
export function toLocalDate(epochMs: number, tzOffsetMinutes: number): string;
/** 当天日期；偏移缺省取运行环境当前时区。 */
export function today(clock: Clock, tzOffsetMinutes?: number): string;
/** 当前时区偏移（东正西负，分钟）。 */
export function currentTzOffset(epochMs: number): number;
```

```ts
// src/core/ids.ts
export interface IdSource {
  /** 生成 ULID；时间部分取传入的毫秒，保证与注入时钟同源。 */
  ulid(now: number): string;
}
export const systemIds: IdSource;
```

- `src/data/deps.ts` 定义 `WriteDeps = { clock: Clock; ids: IdSource; tzOffset(epochMs): number }` 与 `defaultWriteDeps`（`systemClock` + `systemIds` + `currentTzOffset`）；用例第二参数默认取它，测试传固定时钟、固定 ID 与固定偏移。
- 领域代码禁止直接 `Date.now()` / `new Date()` / `crypto.randomUUID()`；只在 `core/clock.ts`、`core/ids.ts` 内部出现。
- `new Date()` 只允许出现在展示层做本地化格式化，且不得参与业务判定。

### 2.2 时区与"当天"

- M05 锁定口径：`commits.date` 在写入时按**操作当时的本地时区**换算；锁定时刻 = `date` 的次日 00:00 按同一偏移换算。函数签名带 `tzOffsetMinutes`，测试固定 UTC+8 / UTC-5 即可断言，不依赖 CI 机器时区。
- R8 今天分组：`today(clock, offset)` 产出唯一"今天"字符串，逾期 / 今天 / 无截止三组比较同一个值；调用方不得各自 `new Date()`。
- V1-06 每日快照：以 `today(clock, offset)` 作自然日键，配合 `settings.lastAutoBackupAt` 判定当日是否已写，不新增字段、不用 `localStorage`。
- 偏移方向写死：**东正西负**（UTC+8 → `480`），`currentTzOffset = -new Date(epoch).getTimezoneOffset()`。
- 月精度里程碑（R6）归一：`datePrecision = 'month'` 的 `achievedAt` 存「当月 1 日 00:00 **本地时间**再转 UTC 毫秒」，即 `Date.UTC(y, m, 1) - offset*60000`；判定与写入都用 `core/clock.ts` 的偏移函数，不手算。日精度保留用户选定的当日 00:00 本地时间转 UTC，不做额外归一。
- 测试注入方式：`completeTask(input, { clock: fixedClock(Date.UTC(2026, 10, 20, 8, 42)), ids: systemIds, tzOffset: () => 480 })`；不引 sinon/fake-timers。`fixedClock` 只在本测试文件内联定义，不建共享 fixture。

## 3. 错误模型

### 3.1 抛异常还是 Result

- **可预期的领域失败返回 `Result`**：校验不通过、只读分支、额度已满、版本不符、导入文件损坏、事务写失败。
- **违反不变量抛 `Error`**：参数组合不可能出现、仓储在事务外被调用、未知状态值。这类错误不捕获成 `Result`，让它出现在错误边界。
- Dexie 的 `AbortError` / `QuotaExceededError` 在用例边界统一映射为 `Result.fail`，保留 `cause`。

```ts
// src/core/errors.ts
export type ErrorCode =
  | 'validation.invalid_input'
  | 'validation.title_empty'
  | 'domain.readonly_branch'
  | 'domain.quota_exceeded'
  | 'domain.not_found'
  | 'domain.conflict'
  | 'storage.write_failed'
  | 'storage.read_failed'
  | 'backup.invalid_file'
  | 'backup.version_unsupported'
  | 'auth.invalid_credentials';

export interface AppError {
  code: ErrorCode;
  /** 字段级错误的落点，如 'title'、'dueDate'。 */
  field?: string;
  retriable: boolean;
  cause?: unknown;
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: AppError };
export const ok: <T>(value: T) => Result<T>;
export const fail: (code: ErrorCode, options?: Partial<AppError>) => Result<never>;
```

### 3.2 分层归属与 UI 映射

| 层 | 职责 |
| --- | --- |
| `core/errors.ts` | 错误码枚举、`Result` 与构造函数；不 import 任何上层 |
| `data/*` 用例 | 捕获 Dexie 异常 → 映射 `storage.*`；返回 `Result`，不抛给页面 |
| `i18n` | `errorKey(code)` 映射到文案 key（`error.<code>`），i18n 可依赖 core |
| `components` / `pages` | 读 `result.error`：`field` 非空 → 表单字段下方内联；否则 → 回执失败条 / 弹层内联提示，`retriable` 决定是否给"重试" |

- 失败回弹（如勾选完成失败）由页面把本地乐观状态回滚，再展示 `errorKey`；不弹 toast 堆叠。
- 密码错误与账号不存在必须映射同一码 `auth.invalid_credentials`（PRD V2-01）。
- `CloudBaseConfigError`：**当前没有这个类**。MVP 已保留 `@cloudbase/js-sdk@^3.11.1`，但只在 `src/data/cloud/` 内按需初始化；`client.ts` 在缺少 `VITE_CLOUDBASE_ENV_ID` 时抛 `new Error('cloud.not_configured')`。若 V1 需要结构化错误，把类归 `data/cloud/`，码沿用 `cloud.not_configured`，不进 `core`；本轮不预建。

## 4. events 写入约定

### 4.1 谁写、何时写

- 只有用例写 `events`，且与业务写入**同一事务**；组件、仓储、Hook 一律不写。
- 只写"改变了用户可回溯事实"的动作；读、筛选、搜索、展开、引导卡片展示、`localStorage` 标记都不写。
- 每个动作**一条**事件；批量动作合并为一条并用 `payload.count` 记条数（如移动子树 `movedCount`，PRD 冲突表 #28）。
- 删除示例树、清空本机数据等"整段移除"按 PRD 保持不写业务事件（M12、O05）；`data.clear` 只在用户确认清空真实数据时写一条。

### 4.2 action 命名与 payload 类型化

- 格式 `entity.verb`，全小写、无驼峰。**完整清单（27 个，以此为准）**：
  - `task`：`task.create`、`task.complete`、`task.cancel`、`task.reopen`、`task.plan`、`task.update`、`task.delete`
  - `commit`：`commit.update`、`commit.void`
  - `branch`：`branch.create`、`branch.rename`、`branch.move`、`branch.update`、`branch.finish`、`branch.pause`、`branch.resume`、`branch.archive`、`branch.unarchive`
  - `milestone`：`milestone.create`
  - `badge`：`badge.grant`
  - `settings`：`settings.update`
  - `data`：`data.export`、`data.import`、`data.clear`
  - `backup`：`backup.create`、`backup.restore`
  - `sync`：`sync.conflict`（`entityType = 'sync'`，不按业务实体归类）
- **明确不写 events 的动作**（保持 PRD 既有例外，不新增字面值）：
  - R13 物理删除空分支：不写 `branch.delete`；
  - V1-08 排序与置顶：不写 `branch.pin` / `branch.unpin` / 排序类动作；
  - V2-03 模板生成与撤回：不写模板类动作；
  - 删除示例树（M12）与清空本机数据（O05）：不写业务事件，仅 `data.clear` 在真实清空时写一条；
  - `milestone.delete` 不存在：M07 明确里程碑永存，只增不删。
- 「放下 / 重新开始」的事件名跟 PRD（`branch.pause` / `branch.resume`），用例文件名跟字段（`drop-branch.ts` / `resume-branch.ts`，对应 `droppedAt`）；两者不同源是有意的，不互相改名。
- 收尾与归档合并：收尾时若同时归档，**只写一条 `branch.finish`**，用 `payload.archived` 标记，不另写 `branch.archive`；单独归档（V1-01）才写 `branch.archive` / `branch.unarchive`。
- `sync.conflict` 的分支历史回溯：写入 `payload.branchId`（冲突发生在分支上下文时），分支历史用它过滤；`payload.branchId = null` 表示与分支无关的冲突。
- payload 用映射表类型化，不写 `Record<string, unknown>`：

```ts
// src/data/event-payloads.ts
export type EventPayloads = {
  'task.complete': { taskId: string; commitId: string; branchId: string };
  'branch.update': { branchId: string; fields: string[] };
  'branch.finish': { branchId: string; finishedIntoId: string; archived: boolean; movedTaskCount: number };
  'branch.move': { branchId: string; fromParentId: string; toParentId: string; movedCount: number };
  'sync.conflict': { branchId: string | null; entityId: string; field: string };
  // …每个 action 一条
};
export type EventAction = keyof EventPayloads;
```

- 写入统一走 `writeEvent(tx, action, entityId, payload, deps?)`（`src/data/events.ts`），在事务内 `tx.table('events').add`：`entityType` 由 action 前缀推导（`sync` 是独立前缀，因此 `sync.conflict` 落 `sync`），`at` 取注入时钟，`id` 用 `ids.ulid(at)`，`tzOffset` 取 `deps.tzOffset(at)`（审计字段，与 TECH §5.3 一致）。
- `events` 行只增不改；审计失败不得静默吞掉——事件写失败必须让事务整体回滚（PRD M05/M08 的回滚用例）。

## 5. Dexie schema 升级与迁移

- 库名固定 `committodo`；`db.ts` 导出 `DB_VERSION`（当前 1）。**只有增删表、增删索引、改主键才 bump**；新增不建索引的普通字段不 bump、不写 upgrade。
- bump 模板：

```ts
this.version(2)
  .stores({ /* 只写变化的表，其余沿用上一版 */ })
  .upgrade(async (tx) => { /* 回填历史行；分页处理，禁止一次性 toArray 全表 */ });
```

- 迁移三条硬约束：只前进不回退（`VersionError` 时展示"版本过新"页面并引导导出）；不删除用户数据（新增字段给默认值）；升级期间禁用写入入口。
- 多标签页：监听 `db.on('versionchange')`，提示刷新，不在旧连接上继续写。
- 导出文件的 `schemaVersion` 是**文件格式版本**，与 `DB_VERSION` 解耦：当前都从 1 起，但各自独立递增。MVP 导入只接受相等版本，高于当前 → `backup.version_unsupported`；低于当前 → 走文件迁移表（暂无条目，先拒绝并提示升级客户端）。
- `backups.schemaVersion` 记录快照生成时的文件格式版本；恢复时以它决定迁移路径，而不是读当前 `DB_VERSION`。

## 6. 响应式断点

| 名称 | 值 | 用途 |
| --- | --- | --- |
| `mobile` | **390px** | 设计基准窄屏；明细/编辑改全屏面板 |
| `compact` | **760px** | 应用外壳断点：侧栏转顶部横向导航，树保留层级 |
| `wide` | **1440px** | 桌面设计基准；详情用侧栏而非覆盖层 |

- CSS 自定义属性不能用于 `@media` 条件，因此媒体查询内**允许**写这三个数值，且只允许这三个；这是"禁止硬编码尺寸"的唯一例外，其他尺寸仍必须走令牌。
- 统一写法：移动优先，`@media (max-width: 760px)` 做降级；不用 `min-width` 混写，避免断点交叉。
- 三个值**不进 `design/design-tokens.json`**（已定）：`design/` 下任何文件都不改，也不新造 `--bp-*` 变量；是否入令牌由设计线后续决定，落地时只改本文与媒体查询。
- PRD 只承诺 390 / 1440 两个验收视口；760 是实现层断点，不新增人工验收项。

## 7. 组件与 CSS Modules 命名

### 7.1 文件

- 组件文件 `kebab-case.tsx`，一个文件一个公开组件，组件名 `PascalCase`（`app-shell.tsx` → `AppShell`）。
- 页面 `*-page.tsx`；全局层 `components/overlays/*-dialog.tsx`；布局 `components/layout/`。
- 样式与组件同名：`app-shell.module.css`；全局样式只留 `styles/reset.css`、`styles/global.css`。

### 7.2 类名

- CSS Modules 类名 **camelCase**，语义化短名：`navActive`、`pageHead`、`snapshotRow`；用 `styles.navActive` 取用，不拼接字符串。
- 一层 BEM 式的父子用「前缀 + 名词」即可（`rowStatus`、`rowDate`），不用 `&__element`；嵌套最多一层。
- 不写 `:global`；确实要覆盖第三方时先停下来评审。
- 动态值只通过行内 CSS 变量传递（`style={{ '--node-tone': tone }}`），颜色/尺寸仍来自令牌；TypeScript 用 `CSSProperties & Record<'--node-tone', string>` 收口。

### 7.3 与禁止硬编码的配合

- 颜色、字号、线宽、圆角、间距、时长只能 `var(--token)`；ESLint 拦 `#hex`、`rgb()`、`hsl()` 字面量。
- 组件里不写中文：所有文案 `t('域.元素.语义')`，key 只进 `src/i18n/zh-CN.ts`；ESLint 拦 JSX 文本与字符串字面量中的中文。
- 不引图标库；图标内联在 `src/ui/icons/`，尺寸用令牌，颜色 `currentColor`。

## 8. 冲突与待拍板

下列事项均已有结论（2026-11-21），保留记录备查；仅 #4 的月精度归一需随实现补单测，#9 为待 PRD 侧同步的分歧。

| # | 事项 | 结论 |
| --- | --- | --- |
| 1 | `events` 字段名 | **已定：统一 `entityType`**。代码 `EventRecord` 与 `writeEvent` 已改，TECH §5.3 与 PRD 口径一致；`entityType` 未建索引，不 bump schema |
| 2 | `events.tzOffset` | **已定：补进类型**。`EventRecord.tzOffset`（东正西负，分钟）由 `WriteDeps.tzOffset(at)` 写入；不建索引，不 bump schema |
| 3 | 断点是否进设计令牌 | **已定：暂不进 `design/design-tokens.json`**。保持 390 / 760 / 1440 直接写在媒体查询里，`design/` 下文件不动；是否入令牌由设计线后续定 |
| 4 | 月精度里程碑归一化 | **已定：`month` 精度存「当月 1 日 00:00 本地时间转 UTC」**，见 §2.2；R6 与 TECH §5.3 同步。实现时补 `core/rules/milestone-date.test.ts` |
| 5 | PRD 测试文件名与用例文件名 | 不冲突：测试文件按 PRD 保留原名，断言对象指向对应用例即可 |
| 6 | PRD 未提 760 断点 | 以实现层断点补入本文，不新增人工验收 |
| 7 | `CloudBaseConfigError` | 无此类；`client.ts` 以 `new Error('cloud.not_configured')` 抛出。不预建，V1 如引入按 §3.2 归 `data/cloud/`，码 `cloud.not_configured` |
| 8 | `events.action` 字面值 | **已定：PRD 侧已统一为 `entity.verb`，本侧按 2026-11-21 决定收敛为 27 个**：补 `branch.update`；移除 `branch.pin` / `branch.unpin` / `branch.delete` / `milestone.delete`；`sync.conflict` 的 `entityType = 'sync'`，分支历史用 `payload.branchId` 过滤；收尾+归档只写 `branch.finish`（`payload.archived`）；模板不写事件 |
| 9 | 仍待 PRD 同步的分歧 | ①V2-02 §5 表仍写 `entityType='branch'` + `action='sync.conflict'`，与本侧「`entityType='sync'`」不一致；②V2-03 §7 仍把模板事件列为待技术线确认，本侧已定不写。两处均列出、不改 PRD |

## 9. 与验证命令的对应

| 命令 | 覆盖本文哪部分 |
| --- | --- |
| `npm run lint` | §7 命名与硬编码约束、依赖方向、中文文案 |
| `npm test` | §2 clock/ids（固定时钟与时区）、§3 错误映射、§4 事件 payload、§5 版本校验、`data/` 事务回滚 |
| `npm run build` | TS 严格检查（签名形状、`Result` 收窄、payload 映射） |
| `npm run dev` | §6 断点与 §7 视觉的最终人工核验 |
