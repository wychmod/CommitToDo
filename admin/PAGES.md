# 管理站页面与字段设计

本文定义**信息架构、页面结构、字段口径、操作与状态、响应式降级**。页面结构与区块顺序以 [`admin/docs/visuals/README.md`](docs/visuals/README.md) 的 15 张画稿为准；字段、权限与编辑规则以 [`admin/DESIGN.md`](DESIGN.md) 为准；字段名以环境 `committodo-d6gmapg0j6397889f` 已建的 18 个集合为准。

数据源与边界：

- 18 个集合：`users`、`branches`、`tasks`、`commits`、`milestones`、`badges`、`settings`、`backups`、`year_reviews`、`events`、`outbox`、`conflicts`、`devices`、`migration_state`、`counters`、`ops_events`、`user_first_seen`、`admin_audit_log`。
- 写能力：仅 `branches`、`tasks`、`commits`、`milestones`、`settings`、`year_reviews` 六张表按字段白名单更新；接口 `tables.update` 当前返回 `admin_not_implemented`，所有写入口在开放前禁用。其余集合一律只读。
- 敏感展示：邮箱、`wxOpenId`、设备/安装标识、`payload`、`props`、`snapshot` 默认脱敏或折叠。
- 部署：同环境静态托管子路径 `/admin-console/`，页面空壳可公开；数据接口由 `admin-api` 白名单邮箱鉴权。

---

## 0. 视觉对齐结论

### 0.1 视觉文档定义了什么

| 维度 | 定义 |
|---|---|
| 画布 | 1536×1024 桌面，浅色；内容居中，最大 1376px，左右 72px |
| 顶栏 | 64px 白底，1px 底部分割线；左侧斜置 C 标记 + “CommitToDo 管理站”；中间仅三个文字标签“总览 / 数据表 / 审计”；右侧当前邮箱 + 描边“退出登录”；**无侧边栏** |
| 导航态 | 当前标签蓝色文字 + 细蓝下划线；其余为中性文字 |
| 配色 | 画布 `#F7F9FC`，面板纸白，墨色 `#20242C`，主操作蓝 `#245F9D`；就绪用薄荷绿，警告/未就绪用暖金；错误/关闭节点用珊瑚 |
| 字体 | 标题 32px，正文 14–15px，表格 13–14px；`_id`、表名、`admin.update` 等用等宽 |
| 组件 | 6–10px 圆角、1px 冷灰边框、几乎无阴影、无渐变；按钮分蓝色实心与描边两种；状态用文字 + 小色点/细描边标签，不用大插画 |
| 页面 | 登录、指标总览、数据表清单、单表浏览、只读行详情、管理审计；鉴权三态（无权 / 未验证 / 资料读取失败）为全屏卡片 |
| 状态 | 指标未接入、表未就绪、筛选无结果、审计暂无记录；受限单行编辑与版本冲突为“后续”方案 |
| 状态文案 | 逐字定义，见 §4 |

### 0.2 与旧版 PAGES.md 的差异

1. 旧版有 10 个一级导航 + 侧栏分组；视觉只有 3 个顶部标签、**明确无侧栏**。旧版信息架构作废。
2. 旧版的“留存与活跃”“运营事件”“用户”“设备”“同步与冲突”“业务数据”“备份”“系统状态”不再各占导航，统一收敛到 **数据表** 与 **总览**：
   - 指标与留存 → 总览；
   - 所有集合（含用户、设备、队列、冲突、备份、运营事件、计数、首见、审计）→ 数据表清单与单表浏览；
   - 系统状态 → 总览的来源状态卡 + 数据表清单的“状态”列，不再单开页面。
3. 视觉把“数据表”作为主入口，旧版里“全部集合”的兜底定位升级为主视图。
4. 行详情是右侧抽屉，不是独立路由页；受限编辑与冲突态同为抽屉。
5. 登录页从单卡片改为视觉 01 的左表单 + 右权限校验示意双栏。

### 0.3 冲突点（等用户定，不自行取舍）

| 编号 | 冲突 | 旧版 / 现状 | 视觉 | 当前处理 |
|---|---|---|---|---|
| C1 | 数据表分组 | 旧版按“监控 / 数据 / 治理”分导航 | 只写了“业务表与运营表”两组 | 暂按三组：业务表 / 运营与指标表 / 账号与平台表。若坚持两组，账号与平台表并入运营表 |
| C2 | 用户、设备、同步是否需要语义化页面 | 旧版都要独立页 | 视觉无这些页，只有通用表浏览 | 暂不单开页，通过 `users`、`devices`、`outbox`、`conflicts`、`migration_state` 的表浏览查看 |
| C3 | 留存 cohort 明细 | 旧版是独立指标页 | 视觉只在总览放 D1/D7（就绪稿含 D30）与趋势 | 暂把 cohort 明细折叠为总览底部区块，不单开路由 |
| C4 | 系统状态 | 旧版独立页 | 视觉无 | 暂以总览来源卡 + 表清单状态列替代 |
| C5 | 运营事件流 | 旧版独立页 + 三子标签 | 视觉无 | 暂以 `ops_events`、`events`、`counters` 三张表浏览替代 |
| C6 | 编辑开放 | 旧版标注“受限可写（未开放）” | 13/14 标为“后续编辑方案” | 保持只读，编辑抽屉先不接保存 |

### 0.4 视觉未写、但必须有的内容

1. **390 窄屏**：视觉只有 1536×1024 桌面稿，未定义移动端；本文 §5 给出降级方案。
2. **数据表清单的三类分组与列**：视觉只给“名称、权限、状态、浏览入口”，未给 18 表如何归类；本文按 C1 默认值展开。
3. **加载态**：视觉只画稳定态与空态，未画骨架屏；本文按“骨架 + 不改变布局高度”补齐。
4. **错误态与请求 ID**：视觉 09 有“重新校验”，列表/接口错误态未画；本文补统一错误条与 `requestId` 复制。
5. **深链接**：视觉未写 URL 形态；本文 §2 给出路由。
6. **无权限页的请求 ID**：README 提到 09 显示请求 ID，但 `prompts-audit-access.md` 的 09 文案写“无请求 ID”；本文以提示词为准，不显示请求 ID。
7. **退出确认**：视觉未定义；不弹确认，直接退出。

### 0.5 引用资源存在性

已逐条核对，**全部存在**，无缺失：

- `admin/docs/visuals/01-login-light.png` … `15-row-detail-light.png`（15 张，均存在）
- 风格参考 `design/images/p00-home-light.png`
- 登录参考 `docs/web-auth/p09-login-imagegen-light.png`
- 提示词 `prompts-core.md`、`prompts-empty-states.md`、`prompts-audit-access.md`、`prompts-editing.md`

---

## 1. 信息架构

### 1.1 一级导航

| 标签 | 路由 | 页面 | 权限 | 说明 |
|---|---|---|---|---|
| 总览 | `/` | 指标总览 | 只读 | 日期筛选、来源状态、KPI、趋势与留存 |
| 数据表 | `/tables` | 数据表清单 | 只读 | 18 个集合分组目录 |
| 数据表 | `/tables/:collection` | 单表浏览 | 只读 | `ownerId` 筛选、加载更多、行详情抽屉 |
| 数据表 | `/tables/:collection/:id`（可选） | 行详情直达 | 只读 | 打开对应抽屉；视觉未要求独立页 |
| 审计 | `/audit` | 管理审计 | 只读 | 只读审计列表 |

公共页面（无顶栏导航）：

| 页面 | 触发条件 | 权限 | 操作 |
|---|---|---|---|
| 登录管理站 | 未登录 / 登录失效 | 公开 | 邮箱 + 密码登录 |
| 无权访问管理站 | 已登录、邮箱不在白名单 | 不可进入后台 | 仅“退出登录” |
| 邮箱未验证 | 已登录、邮箱未验证 | 不可进入后台 | 仅“退出登录” |
| 无法读取账号资料 | 身份解析失败 | 不可进入后台 | “重新校验” + “退出登录” |
| 配置缺失 | 未配置环境 ID | 不可进入后台 | 提示配置项，不提供重试 |

### 1.2 18 个集合的归属

| 分组 | 集合 | 权限 | 页面 |
|---|---|---|---|
| 业务表 | `branches`、`tasks`、`commits`、`milestones` | 受限可写（未开放） | `/tables/:collection` + 行详情；编辑抽屉后续 |
| 业务表 | `badges`、`settings`、`year_reviews` | `settings`、`year_reviews` 受限可写；`badges` 只读 | 同上 |
| 运营与指标表 | `ops_events`、`events`、`counters`、`user_first_seen` | 只读 | 表浏览；`ops_events` 同时是总览数据源 |
| 账号与平台表 | `users`、`devices`、`backups`、`outbox`、`conflicts`、`migration_state` | 只读 | 表浏览 |
| 治理表 | `admin_audit_log` | 只读 | 同时是审计页数据源 |

### 1.3 权限与写状态标记

| 标记 | 含义 | 出现位置 |
|---|---|---|
| 只读 | 仅查询、筛选、复制、查看原始字段 | 表清单“权限”列、单表浏览标题旁、审计标题旁 |
| 受限可写（未开放） | 六表字段白名单更新；当前保存按钮禁用 | 表清单对应行、行详情抽屉 |
| 只读（禁止写） | 不提供任何写入口 | 其余集合 |

---

## 2. 页面结构与区块顺序（以视觉为准）

### 2.1 登录管理站 `/login`

| 顺序 | 区块 | 内容 |
|---|---|---|
| 1 | 页头 | 仅“CommitToDo 管理站”标识，不显示导航 |
| 2 | 左栏 | 邮箱、密码、登录按钮；错误内联 |
| 3 | 右栏 | 权限校验示意（分支合流意象），不含真实数据 |
| 4 | 页脚 | “仅限内部使用” |

### 2.2 总览 `/`

| 顺序 | 区块 | 内容 |
|---|---|---|
| 1 | 顶栏 | 64px，三标签，“总览”选中 |
| 2 | 标题行 | “指标总览” + 说明；右侧日期 `from` – `to` + “刷新” |
| 3 | 状态公告 | 指标未接入时的细条提示“指标未接入 / 等待运营事件与首见数据。” |
| 4 | 来源卡 | `ops_events`、`user_first_seen` 两卡，各带“已就绪 / 未就绪” |
| 5 | KPI 网格 | 2×3：日活账号、周活账号、月活账号、注册数、D1 留存、D7 留存；未接入统一破折号 + “未接入” |
| 6 | 趋势区 | 活跃趋势；就绪后显示折线 |
| 7 | 留存区 | D1 / D7 / D30；样本不足显示“样本不足” |
| 8 | 运营补充 | 同步、备份、提交指标 |
| 9 | 底部留白 | 不放大插画 |

### 2.3 数据表清单 `/tables`

| 顺序 | 区块 | 内容 |
|---|---|---|
| 1 | 标题行 | “数据表” + 说明“浏览云端业务与运营数据。当前仅提供只读访问。” + 表数 |
| 2 | 分组 | 业务表 / 运营与指标表 / 账号与平台表（见 C1） |
| 3 | 表行 | 名称、集合名（等宽）、权限、状态（已就绪 / 未就绪 / 未知）、行数、“浏览” |
| 4 | 空态 | “暂无数据表 / 接口尚未返回任何集合。” |

### 2.4 单表浏览 `/tables/:collection`

| 顺序 | 区块 | 内容 |
|---|---|---|
| 1 | 返回 | “← 返回表清单” |
| 2 | 标题行 | “浏览 {collection}”；集合名等宽 + “只读”描边标签 |
| 3 | 工具条 | “按 ownerId 筛选”、输入框（占位 `ownerId`）、蓝色“筛选” |
| 4 | 表卡 | 顶部左侧中文表名、右侧就绪状态；表头列名 |
| 5 | 表体 | 行列表；加载更多；行点击开抽屉 |
| 6 | 空态 | 表未就绪：“表未就绪 / 云端尚未创建 {collection}。”；无匹配：“没有匹配的记录 / 调整 ownerId 或清除筛选后重试。” + “清除筛选” |

### 2.5 行详情抽屉（无独立页）

| 顺序 | 区块 | 内容 |
|---|---|---|
| 1 | 抽屉 | 右侧约 480px，从顶栏下沿到底部；白色、细边框、轻阴影 |
| 2 | 标题 | 行标题 + `_id` 等宽芯片 |
| 3 | 结构字段 | 按表字段表展示；敏感值脱敏 |
| 4 | 原始字段 | 折叠 JSON；隐藏敏感键或脱敏 |
| 5 | 底部 | “关闭”；六表在开放后显示“编辑” |

### 2.6 受限编辑抽屉（后续，C6）

| 顺序 | 区块 | 内容 |
|---|---|---|
| 1 | 标题 | “编辑{表名}” + 行 ID 芯片 |
| 2 | 冲突提示 | 版本冲突时置顶：“记录已更新 / 刷新后核对最新内容，再提交修改。” + “编辑版本 rev N　最新版本 rev M” |
| 3 | 可编辑字段 | 仅白名单字段 |
| 4 | 修改原因 | 必填，1–200 字符；帮助文案“将记录在管理审计中。” |
| 5 | 只读摘要 | 当前 `rev`、状态、归属 |
| 6 | 底部 | “取消” + “保存更改”；冲突态改为“刷新后重试” |

### 2.7 管理审计 `/audit`

| 顺序 | 区块 | 内容 |
|---|---|---|
| 1 | 标题行 | “管理审计” + “写入操作会在此留痕。当前只读。” + “刷新” |
| 2 | 标签 | “只读” + 就绪状态 |
| 3 | 表卡 | “审计记录”；列：时间、操作者、动作、目标、变更字段 |
| 4 | 加载更多 | 底部 |
| 5 | 空态 | “暂无审计记录 / 有管理写入后，审计记录将出现在这里。” |

### 2.8 鉴权三态（全屏卡片）

| 状态 | 图标 | 标题 | 正文 | 按钮 |
|---|---|---|---|---|
| 无权访问 | 浅桃底 + 珊瑚闭合节点 | 无权访问管理站 | 当前邮箱不在管理站白名单。请联系管理员确认访问权限。 | 退出登录 |
| 邮箱未验证 | 蜂蜜黄底 + 空心节点 | 邮箱未验证 | 请先完成邮箱验证，再访问管理站。 | 退出登录 |
| 资料读取失败 | 浅蓝底 + 虚线连接 | 无法读取账号资料 | 云端账号资料暂不可用，请稍后重试。 | 重新校验、退出登录 |

三态均展示“当前登录邮箱”行；不展示任何业务数据。

---

## 3. 字段表

> 约定：`—` 表示只读；`受限` 表示在六表白名单内、`tables.update` 开放后可编辑。类型 `number` 的时间字段均为毫秒时间戳。所有列表支持复制 `_id`。

### 3.1 总览

| 字段 / 指标 | 含义 | 类型 | 可编辑 | 校验 / 展示 | 敏感 |
|---|---|---|---|---|---|
| M1 日活（账号） | 当天 `app.open` 去重账号数 | number | — | 整数；可算且为零显示 `0` | 否 |
| M2 日活（设备） | 当天 `app.open` 去重 `visitorId` 数 | number | — | 整数；可算且为零显示 `0` | 否 |
| M3 周活 | 近 7 日去重账号数 | number | — | 整数 | 否 |
| M4 月活 | 近 30 日去重账号数 | number | — | 整数 | 否 |
| M5 注册数 | 当天新增账号数 | number | — | 按 `signupAt` 本地日 | 否 |
| M6 / M7 / M8 | D1 / D7 / D30 留存 | number(0–1) | — | 百分比 1 位小数；未成熟显示 `insufficient` | 否 |
| M10 同步设备数 | 近 7 日成功同步去重设备 | number | — | 整数 | 否 |
| M11 同步成功率 | 成功 / 总推送 | number(0–1) | — | 百分比；无推送显示 `—` | 否 |
| M12 / M13 | 备份成功 / 失败数 | number | — | 当天计数 | 否 |
| M14 / M15 | 提交活跃账号 / 每日提交数 | number | — | 整数 | 否 |
| `ops_events` 最近 20 条 | 事件流预览 | array | — | `event`、`localDate`、`at`、`platform` | 否 |
| 数据源状态 | `ops_events`、`user_first_seen`、`admin_audit_log` 是否就绪 | enum | — | `ready` / `not_ready` / `insufficient` | 否 |
| `serverTime` | 服务端时间 | ISO string | — | 页脚展示 | 否 |

筛选项（接口参数，非集合字段）：

| 参数 | 含义 | 类型 | 默认 | 校验 |
|---|---|---|---|---|
| `from` / `to` | 日期窗口 | `YYYY-MM-DD` | 近 30 天 | `from <= to`，跨度 ≤ 180 天 |
| `metric` | 指标代码 | enum `M1`–`M18` | `M1` | 必须在 DESIGN §5.2 |
| `cohortDate` | 留存队列首见日 | `YYYY-MM-DD` | 昨天 | 不得晚于今天 |
| `retentionMode` | 留存口径 | enum `exact` / `any` | `exact` | — |
| `tz` | 展示时区 | enum `Asia/Shanghai` | 固定 | 第一阶段只读 |

留存明细（总览底部区块，见 C3）：

| 字段 | 含义 | 类型 | 可编辑 | 校验 / 展示 | 敏感 |
|---|---|---|---|---|---|
| `points[].date` | 分桶日 | `YYYY-MM-DD` | — | 按升序 | 否 |
| `points[].value` | 指标值 | number | — | 按指标类型格式化 | 否 |
| `points[].status` | 数据状态 | enum | — | `ready` / `insufficient` / `not_ready` | 否 |
| `cohort.size` | 队列账号数 | number | — | 0 时整表空态 | 否 |
| `cohort.retained` | 回访账号数 | number | — | ≤ `size` | 否 |
| `cohort.rate` | 留存率 | number(0–1) | — | 百分比 1 位小数 | 否 |
| `cohort.day` | D0 / D1 / D7 / D30 / Dn+ | number | — | 观察窗为 `C+n` | 否 |
| `cohort.firstSeenDate` | 队列首见日 | `YYYY-MM-DD` | — | 来自 `user_first_seen.firstSeenDate` | 否 |
| `cohort.userId` | 账号标识 | string | — | 默认脱敏 `u_***` | 是 |
| `window.from` / `window.to` | 观察窗口 | `YYYY-MM-DD` | — | `C+n > today` → `insufficient` | 否 |

### 3.2 数据表清单

| 字段 | 含义 | 类型 | 可编辑 | 校验 / 展示 | 敏感 |
|---|---|---|---|---|---|
| `collection` | 集合名 | string | — | 等宽，18 项之一 | 否 |
| 名称 | 中文表名 | string | — | 来自 `tableLabels` | 否 |
| 权限 | 只读 / 受限可写（未开放） | enum | — | 见 §1.3 | 否 |
| 状态 | 就绪情况 | enum | — | `ready` / `not_ready` / `unknown` | 否 |
| 行数 | 总行数 | number | — | 整数；未知显示 `—` | 否 |
| 浏览 | 进入单表浏览 | action | — | 指向 `/tables/:collection` | 否 |

### 3.3 账号 `users` + `user_first_seen`

| 字段 | 含义 | 类型 | 可编辑 | 校验 / 展示 | 敏感 |
|---|---|---|---|---|---|
| `users._id` | principalId | string | — | 复制 | 否 |
| `users.email` | 登录邮箱 | string | — | 脱敏 `a***@domain` | 是 |
| `users.nickname` | 昵称 | string | — | 为空显示“未设置” | 否 |
| `users.createdAt` | 建号时间 | number | — | 本地时间 | 否 |
| `users.updatedAt` | 资料更新时间 | number | — | 本地时间 | 否 |
| `users.wxOpenId` | 微信 OpenID | string | — | 脱敏 | 是 |
| `users.wxOpenIds` | 多 OpenID | array | — | 折叠 | 是 |
| `user_first_seen.firstSeenDate` | 首次出现日 | `YYYY-MM-DD` | — | 关联 `userId` | 否 |
| `user_first_seen.signupAt` | 注册时间 | number | — | 与 `users.createdAt` 并列 | 否 |
| `user_first_seen.lastSeenDate` | 最近活跃日 | `YYYY-MM-DD` | — | 空显示“无事件” | 否 |
| 设备数（派生） | `devices` 计数 | number | — | 派生查询 | 否 |
| 最近同步（派生） | `devices.lastSyncAt` 最大值 | number | — | 派生查询 | 否 |

### 3.4 设备 `devices`

| 字段 | 含义 | 类型 | 可编辑 | 校验 / 展示 | 敏感 |
|---|---|---|---|---|---|
| `devices._id` | 设备 ID | string | — | 脱敏中间段 | 是 |
| `devices.ownerId` | 归属账号 | string | — | 可跳 `users` 行 | 是 |
| `devices.label` | 设备名 | string | — | 空显示“未命名” | 否 |
| `devices.platform` | 平台 | string | — | `web` / `wechat` | 否 |
| `devices.lastSyncAt` | 最近同步 | number | — | 相对时间 + 绝对时间 | 否 |
| `devices.createdAt` | 首次出现 | number | — | 本地时间 | 否 |
| `devices.removedAt` | 移除时间 | number | — | 非空显示“已移除” | 否 |
| 状态（派生） | 在线状态 | enum | — | 7 天内同步为“活跃”，否则“沉默” | 否 |
| 同步结果（派生） | 成功 / 冲突 / 失败次数 | number | — | 来自 `ops_events`；无事件显示 `—` | 否 |

### 3.5 同步与迁移 `outbox` / `conflicts` / `migration_state`

| 字段 | 含义 | 类型 | 可编辑 | 校验 / 展示 | 敏感 |
|---|---|---|---|---|---|
| `outbox._id` / `opId` | 操作幂等键 | string | — | 复制 | 否 |
| `outbox.ownerId` | 归属账号 | string | — | 脱敏 | 是 |
| `outbox.entity` | 实体 | string | — | `branches` 等 | 否 |
| `outbox.entityId` | 实体 ID | string | — | 复制 | 否 |
| `outbox.action` | 动作 | string | — | — | 否 |
| `outbox.baseRev` | 基线版本 | number | — | 整数 | 否 |
| `outbox.attempts` | 重试次数 | number | — | 整数；≥3 标红 | 否 |
| `outbox.lastError` | 最近错误 | string | — | 截断展示 | 否 |
| `outbox.createdAt` | 入队时间 | number | — | 本地时间 | 否 |
| `outbox.payload` | 业务载荷 | object | — | 默认折叠 | 是 |
| `conflicts.entity` / `entityId` | 冲突实体 | string | — | — | 否 |
| `conflicts.branchId` | 分支 | string | — | 可跳 `branches` | 否 |
| `conflicts.field` | 冲突字段 | string | — | — | 否 |
| `conflicts.deviceId` | 来源设备 | string | — | 脱敏 | 是 |
| `conflicts.localRev` / `serverRev` | 本地 / 服务端版本 | number | — | 整数 | 否 |
| `conflicts.localPayload` / `serverPayload` | 本地 / 服务端值 | object | — | 抽屉左右并排 diff | 是 |
| `conflicts.at` | 冲突时间 | number | — | 本地时间 | 否 |
| `conflicts.resolved` | 是否已解决 | boolean | — | — | 否 |
| `conflicts.resolvedAt` | 解决时间 | number | — | — | 否 |
| `migration_state._id` | 集合名 | string | — | — | 否 |
| `migration_state.lastId` | 断点 | string | — | 复制 | 否 |
| `migration_state.pushed` | 已推数量 | number | — | 整数 | 否 |
| `migration_state.done` | 是否完成 | boolean | — | — | 否 |
| `migration_state.updatedAt` | 更新时间 | number | — | 本地时间 | 否 |

### 3.6 分支 `branches`

| 字段 | 含义 | 类型 | 可编辑 | 校验 / 展示 | 敏感 |
|---|---|---|---|---|---|
| `branches._id` | 分支 ID | string | — | 复制 | 否 |
| `branches.ownerId` | 归属账号 | string | — | 脱敏；可跳用户 | 是 |
| `branches.parentId` | 父分支 | string | — | 树内跳转 | 否 |
| `branches.path` | 物化路径 | string | — | 折叠展示 | 否 |
| `branches.depth` | 层级 | number | — | 0–3 | 否 |
| `branches.title` | 标题 | string | 受限 | 1–120 字符；不可全空白 / 换行 | 否 |
| `branches.goal` | 目标 | string \| null | 受限 | 0–500 字符；空串归 `null` | 否 |
| `branches.color` | 色相 | enum | 受限 | `coral/sky/honey/mint/iris/rose/teal` | 否 |
| `branches.status` | 状态 | enum | — | `active/merged/dropped` | 否 |
| `branches.order` | 同父排序 | number | — | 只读 | 否 |
| `branches.archivedAt` | 归档时间 | number \| null | — | 非空显示“已归档” | 否 |
| `branches.finishedAt` | 收尾时间 | number \| null | — | — | 否 |
| `branches.finishedIntoId` | 汇合点 | string \| null | — | 可跳父分支 | 否 |
| `branches.droppedAt` / `dropReason` | 放下时间 / 原因 | number \| string | — | — | 否 |
| `branches.pinnedAt` | 置顶时间 | number \| null | — | — | 否 |
| `branches.taskTotal` / `taskDone` | 待办计数 | number | — | `done/total` | 否 |
| `branches.commitCount` | 有效提交数 | number | — | 整数 | 否 |
| `branches.ownLastCommitAt` | 本分支最近提交 | number \| null | — | 相对时间 | 否 |
| `branches.rev` | 版本 | number | — | 保存时回传 `expectedRev` | 否 |
| `branches.createdAt` / `updatedAt` | 时间戳 | number | — | 本地时间 | 否 |
| `branches.deletedAt` | 软删时间 | number \| null | — | 非空显示“已删除” | 否 |

### 3.7 待办 `tasks`

| 字段 | 含义 | 类型 | 可编辑 | 校验 / 展示 | 敏感 |
|---|---|---|---|---|---|
| `tasks._id` | 待办 ID | string | — | 复制 | 否 |
| `tasks.ownerId` | 归属账号 | string | — | 脱敏 | 是 |
| `tasks.branchId` | 所属分支 | string | — | 可跳分支 | 否 |
| `tasks.title` | 标题 | string | 受限 | 1–120 字符；不可全空白 / 换行 | 否 |
| `tasks.note` | 备注 | string \| null | 受限 | 0–1000 字符；空串归 `null` | 否 |
| `tasks.dueDate` | 截止日 | `YYYY-MM-DD` \| null | 受限 | 真实日期；年份 1900–2999 | 否 |
| `tasks.plannedDate` | 计划日 | `YYYY-MM-DD` \| null | 受限 | 同上 | 否 |
| `tasks.order` | 排序 | number | 受限 | 整数 0–9999 | 否 |
| `tasks.status` | 状态 | enum | — | `open/done/cancelled`；必须走业务用例 | 否 |
| `tasks.completedAt` | 完成时间 | number \| null | — | — | 否 |
| `tasks.completedCommitId` | 完成产生的提交 | string \| null | — | 可跳提交 | 否 |
| `tasks.cancelledAt` | 取消时间 | number \| null | — | — | 否 |
| `tasks.rev` | 版本 | number | — | `expectedRev` | 否 |
| `tasks.createdAt` / `updatedAt` / `deletedAt` | 时间戳 | number | — | 本地时间 | 否 |

### 3.8 提交 `commits`

| 字段 | 含义 | 类型 | 可编辑 | 校验 / 展示 | 敏感 |
|---|---|---|---|---|---|
| `commits._id` | 提交 ID | string | — | 复制 | 否 |
| `commits.ownerId` | 归属账号 | string | — | 脱敏 | 是 |
| `commits.branchId` | 当前挂载分支 | string | — | 可跳分支 | 否 |
| `commits.sourceBranchId` | 原始分支 | string \| null | — | 合并后保留 | 否 |
| `commits.taskId` | 来源待办 | string \| null | — | 可跳待办 | 否 |
| `commits.date` | 业务日 | `YYYY-MM-DD` | — | 按日分桶 | 否 |
| `commits.at` | 真实时刻 | number | — | `YYYY-MM-DD HH:mm` | 否 |
| `commits.summary` | 摘要补句 | string | 受限 | 0–500 字符；不可换行 | 否 |
| `commits.voidedAt` | 撤销时间 | number \| null | — | 非空显示“已撤销” | 否 |
| `commits.rev` | 版本 | number | — | `expectedRev` | 否 |
| `commits.createdAt` / `updatedAt` / `deletedAt` | 时间戳 | number | — | 本地时间 | 否 |

### 3.9 里程碑 `milestones`

| 字段 | 含义 | 类型 | 可编辑 | 校验 / 展示 | 敏感 |
|---|---|---|---|---|---|
| `milestones._id` | 里程碑 ID | string | — | 复制 | 否 |
| `milestones.ownerId` | 归属账号 | string | — | 脱敏 | 是 |
| `milestones.branchId` | 所属分支 | string | — | 可跳分支 | 否 |
| `milestones.title` | 标题 | string | 受限 | 1–120 字符；不可全空白 / 换行 | 否 |
| `milestones.note` | 备注 | string \| null | 受限 | 0–1000 字符；空串归 `null` | 否 |
| `milestones.achievedAt` | 达成时间 | number | — | 按 `datePrecision` 格式化 | 否 |
| `milestones.datePrecision` | 精度 | enum | — | `day` / `month` | 否 |
| `milestones.rev` | 版本 | number | — | `expectedRev` | 否 |
| `milestones.createdAt` / `updatedAt` / `deletedAt` | 时间戳 | number | — | 本地时间 | 否 |

### 3.10 徽章 `badges`（只读）

| 字段 | 含义 | 类型 | 可编辑 | 校验 / 展示 | 敏感 |
|---|---|---|---|---|---|
| `badges._id` | 授予 ID | string | — | 复制 | 否 |
| `badges.ownerId` | 归属账号 | string | — | 脱敏 | 是 |
| `badges.catalogId` | 目录项 | string | — | 常量目录映射名称 | 否 |
| `badges.category` | 分类 | string | — | 结构 / 时间 / 里程碑 | 否 |
| `badges.periodKey` | 周期键 | string | — | 如 `2026-Q3` | 否 |
| `badges.grantedAt` | 授予时间 | number | — | 本地时间 | 否 |
| `badges.snapshot` | 授予快照 | object | — | 折叠 JSON | 否 |
| `badges.sourceEntityId` | 来源实体 | string | — | 可跳转 | 否 |
| `badges.rev` | 版本 | number | — | — | 否 |

### 3.11 偏好 `settings`

| 字段 | 含义 | 类型 | 可编辑 | 校验 / 展示 | 敏感 |
|---|---|---|---|---|---|
| `settings._id` | 固定 `app` | string | — | — | 否 |
| `settings.ownerId` | 归属账号 | string | — | 脱敏 | 是 |
| `settings.theme` | 主题 | enum | 受限 | `light` / `dark` | 否 |
| `settings.treeDensity` | 树密度 | enum | 受限 | `compact` / `comfortable` | 否 |
| `settings.annotations` | 标注 | enum | 受限 | `off` / `once` / `always` | 否 |
| `settings.reminderEnabled` | 回顾提醒 | boolean | 受限 | `true` / `false` | 否 |
| `settings.lastAutoBackupAt` | 最近自动备份 | number \| null | — | 本地时间 | 否 |
| `settings.rev` | 版本 | number | — | `expectedRev` | 否 |
| `settings.updatedAt` | 更新时间 | number | — | 本地时间 | 否 |

### 3.12 年度总结 `year_reviews`

| 字段 | 含义 | 类型 | 可编辑 | 校验 / 展示 | 敏感 |
|---|---|---|---|---|---|
| `year_reviews._id` | 行 ID | string | — | 复制 | 否 |
| `year_reviews.ownerId` | 归属账号 | string | — | 脱敏 | 是 |
| `year_reviews.year` | 年份 | number | — | 行键，不可改 | 否 |
| `year_reviews.note` | 一句话 | string | 受限 | 0–2000 字符；不可含控制字符 | 否 |
| `year_reviews.rev` | 版本 | number | — | `expectedRev` | 否 |
| `year_reviews.createdAt` / `updatedAt` | 时间戳 | number | — | 本地时间 | 否 |

### 3.13 备份 `backups`

| 字段 | 含义 | 类型 | 可编辑 | 校验 / 展示 | 敏感 |
|---|---|---|---|---|---|
| `backups._id` | 备份 ID | string | — | 复制 | 否 |
| `backups.ownerId` | 归属账号 | string | — | 脱敏 | 是 |
| `backups.kind` | 类型 | enum | — | `auto/manual/pre-restore/remote` | 否 |
| `backups.createdAt` | 创建时间 | number | — | 本地时间 | 否 |
| `backups.branchCount` | 分支数 | number | — | 整数 | 否 |
| `backups.taskCount` | 待办数 | number | — | 整数 | 否 |
| `backups.commitCount` | 提交数 | number | — | 整数 | 否 |
| `backups.schemaVersion` | 结构版本 | number | — | 整数 | 否 |
| `backups.bytes` | 大小 | number | — | 人类可读 | 否 |
| `backups.restoredAt` | 恢复时间 | number \| null | — | — | 否 |
| `backups.remoteKey` | 对象存储键 | string | — | 折叠 | 是 |
| `backups.payload` | 快照正文 | object | — | 不加载；显示“不展示” | 是 |

### 3.14 运营与事件 `ops_events` / `counters` / `events`

| 字段 | 含义 | 类型 | 可编辑 | 校验 / 展示 | 敏感 |
|---|---|---|---|---|---|
| `ops_events._id` | 幂等键 | string | — | 复制；不直接展示全文 | 否 |
| `ops_events.event` | 事件名 | enum | — | 白名单事件 | 否 |
| `ops_events.userId` | 账号 ID | string | — | 脱敏 `u_***` | 是 |
| `ops_events.visitorId` | 匿名安装 ID | string | — | 脱敏中间段 | 是 |
| `ops_events.deviceId` | 设备 ID | string | — | 脱敏中间段 | 是 |
| `ops_events.platform` | 平台 | enum | — | `web` / `wechat` / `admin` | 否 |
| `ops_events.appVersion` | 版本 | string | — | ≤32 字符 | 否 |
| `ops_events.localDate` | 客户端本地日 | `YYYY-MM-DD` | — | 分桶键 | 否 |
| `ops_events.at` | 服务端接收时间 | number | — | 本地时间展示 | 否 |
| `ops_events.tzOffset` | 时区偏移 | number | — | `-720..840` | 否 |
| `ops_events.props` | 事件属性 | object | — | 仅白名单键；抽屉展示 | 否 |
| `ops_events.source` | 来源 | enum | — | `client` / `server` | 否 |
| `ops_events.schemaVersion` | 结构版本 | number | — | 固定 1 | 否 |
| `counters.event` | 计数事件名 | string | — | — | 否 |
| `counters.date` | 计数日期 | `YYYY-MM-DD` | — | — | 否 |
| `counters.value` | 计数值 | number | — | 整数 | 否 |
| `events.entityType` | 业务实体类型 | string | — | 分支 / 待办 / 提交等 | 否 |
| `events.entityId` | 业务实体 ID | string | — | 复制 | 否 |
| `events.action` | 动作 | string | — | `entity.verb` | 否 |
| `events.payload` | 动作载荷 | object | — | 默认折叠 | 是 |
| `events.tzOffset` | 写入时区偏移 | number | — | — | 否 |

### 3.15 审计 `admin_audit_log`

| 字段 | 含义 | 类型 | 可编辑 | 校验 / 展示 | 敏感 |
|---|---|---|---|---|---|
| `admin_audit_log._id` | 审计 ID | string | — | 复制 | 否 |
| `admin_audit_log.actorUid` | 操作者 UID | string | — | 脱敏 | 是 |
| `admin_audit_log.actorEmail` | 操作者邮箱 | string | — | 脱敏 `a***@domain` | 是 |
| `admin_audit_log.action` | 动作 | string | — | 当前 `admin.update` | 否 |
| `admin_audit_log.collection` | 表 | string | — | 六表之一 | 否 |
| `admin_audit_log.docId` | 行 ID | string | — | 复制 | 否 |
| `admin_audit_log.ownerId` | 行归属 | string | — | 脱敏 | 是 |
| `admin_audit_log.changedFields` | 变更字段 | array | — | 标签展示 | 否 |
| `admin_audit_log.before` / `after` | 旧值 / 新值 | object | — | 抽屉 diff；仅变更字段 | 否 |
| `admin_audit_log.revBefore` / `revAfter` | 版本前后 | number | — | 校验连续性 | 否 |
| `admin_audit_log.at` | 操作时间 | number | — | 本地时间 | 否 |
| `admin_audit_log.requestId` | 请求 ID | string | — | 复制 | 否 |
| `admin_audit_log.clientIp` | 来源 IP | string | — | 脱敏 | 是 |
| `admin_audit_log.source` | 来源 | string | — | `admin-console` | 否 |
| `admin_audit_log.status` | 结果 | enum | — | `applied` / `failed` | 否 |
| `admin_audit_log.errorCode` | 失败码 | string \| null | — | — | 否 |
| `admin_audit_log.schemaVersion` | 结构版本 | number | — | 固定 1 | 否 |

### 3.16 系统状态（并入总览与表清单）

| 字段 | 含义 | 类型 | 数据来源 | 可编辑 | 展示 |
|---|---|---|---|---|---|
| 集合名 | 18 个集合 | string | 配置常量 | — | 表清单 |
| 就绪 | 是否存在 | boolean | 探测查询 | — | 就绪 / 未就绪 / 未知 |
| 行数 | 总行数 | number | 计数查询 | — | 整数 |
| 最新时间 | 最近一条时间 | number | 各表时间字段 | — | 本地时间 |
| 保留截止 | `ops_events` 400 天线 | `YYYY-MM-DD` | 服务端计算 | — | 日期 |
| 环境到期 | 环境有效期 | `YYYY-MM-DD` | 手工维护 | — | 日期 + 提醒 |
| 安全规则 | 客户端是否可直读 | enum | **无数据来源** | — | 显示“待控制台确认” |

---

## 4. 操作与状态

### 4.1 总览

| 项 | 设计 |
|---|---|
| 主操作 | 修改日期范围、刷新 |
| 危险操作 | 无 |
| 空态 | 未接入：公告“指标未接入”，KPI 破折号 + “未接入”；可算且为零显示 `0`；样本不足显示“样本不足” |
| 加载态 | KPI 与图表骨架，保持网格高度 |
| 错误态 | 顶部错误条 + 错误码 + `requestId`，可重试；单卡失败不影响其他卡 |
| 无权限态 | 不进入页面，走鉴权三态 |
| 编辑形态 | 无 |

### 4.2 数据表清单

| 项 | 设计 |
|---|---|
| 主操作 | 进入某表浏览 |
| 危险操作 | 无 |
| 空态 | “暂无数据表 / 接口尚未返回任何集合。” |
| 加载态 | 表行骨架 |
| 错误态 | 错误条 + 重试；已返回的集合保留 |
| 无权限态 | 走鉴权三态 |
| 编辑形态 | 无 |

### 4.3 单表浏览

| 项 | 设计 |
|---|---|
| 主操作 | `ownerId` 筛选、加载更多、打开行详情 |
| 危险操作 | 无（编辑未开放） |
| 空态 | 表未就绪与筛选无结果分开：前者“表未就绪 / 云端尚未创建 {collection}。”；后者“没有匹配的记录 / 调整 ownerId 或清除筛选后重试。” + “清除筛选” |
| 加载态 | 表体骨架；加载更多按钮内显示“加载中…” |
| 错误态 | 错误条 + 重试；保留已有行 |
| 无权限态 | 走鉴权三态 |
| 编辑形态 | 当前只读；编辑开放后走右侧抽屉 |

### 4.4 行详情

| 项 | 设计 |
|---|---|
| 主操作 | 复制 `_id`、展开原始字段、关闭 |
| 危险操作 | 无 |
| 加载态 | 抽屉骨架 |
| 错误态 | 抽屉内错误 + 重试 |
| 编辑形态 | 六表开放后显示“编辑”，进入编辑抽屉 |

### 4.5 管理审计

| 项 | 设计 |
|---|---|
| 主操作 | 刷新、加载更多、复制 `_id` / `requestId` |
| 危险操作 | 无（审计不可改、不可删） |
| 空态 | “暂无审计记录 / 有管理写入后，审计记录将出现在这里。” |
| 加载态 | 表体骨架 |
| 错误态 | 错误条 + 重试 |
| 无权限态 | 走鉴权三态 |
| 编辑形态 | 无 |

### 4.6 鉴权三态

| 项 | 设计 |
|---|---|
| 无权访问 | 只提供“退出登录” |
| 邮箱未验证 | 只提供“退出登录” |
| 资料读取失败 | “重新校验” + “退出登录”；不显示请求 ID |
| 数据 | 三态均不展示任何业务数据 |

---

## 5. 响应式（1440 / 390）

视觉只定义 1536×1024 桌面稿，以下窄屏规则是本文补充，待视觉补齐移动稿后再对齐外观。

| 区域 | 1440 | 390 |
|---|---|---|
| 顶栏 | 64px；品牌 + 三标签居中偏左；右侧邮箱 + 退出 | 64px；品牌 + 汉堡；三标签进抽屉；邮箱省略号，退出进抽屉 |
| 总览标题行 | 标题与日期筛选同一行 | 标题独占一行；日期筛选换行，刷新与日期同排 |
| 来源卡 | 两列 | 单列 |
| KPI 网格 | 2×3 | 2×3（保留 2 列，数值缩小） |
| 趋势 / 留存 | 并排 | 单列上下堆叠 |
| 表清单 | 表格多列 | 卡片：表名 + 权限 + 状态 + “浏览”；集合名与行数折叠进详情 |
| 单表浏览 | 表头多列，行内多字段 | 列表最多 3 个主字段（如 `_id` 缩短、`title`、`updatedAt`）；其余进抽屉；工具条纵向排列 |
| 行详情 | 右侧 480px 抽屉 | 全屏 sheet，底部关闭 |
| 审计 | 表格五列 | 时间线卡片：时间 + 动作 + 目标；操作者与变更字段进详情 |
| 鉴权三态 | 居中卡片 506×355 | 卡片宽度 `calc(100vw - 32px)`，上下留白收窄 |
| 通用折叠 | `rev`、`schemaVersion`、`createdAt`、`updatedAt`、`deletedAt` 可在列设置中显示 | 全部折叠进抽屉；列表最多 3 字段 |
| 触控 | 鼠标 hover 显示操作 | 操作常驻，按钮 ≥44px |

断点：mobile 390 / compact 760 / wide 1440；媒体查询只出现这三个数值。

---

## 6. 必须有但没有数据来源的字段

以下内容**不写入正常字段表**。在补埋点、集合或索引前，页面只能显示 `—` / “未接入” / “样本不足”，不得估算或伪造。

### 6.1 有集合与字段、但依赖埋点接入

| 字段 / 指标 | 依赖 | 当前状态 |
|---|---|---|
| M1–M13 全部活跃、留存、同步、备份指标 | `ops_events` 的 `app.open` / `sync.push` / `backup.upload` | 集合已建，`ops-event` 已部署；Web 端尚未埋点，因此无数据 |
| M17 功能使用 | `review.open` 等事件 | 同上 |
| M18 使用漏斗 | `account.signup` / `branch.create` / `task.complete` / `commit.create` / `sync.push` | 同上 |
| 设备最近活跃 | `ops_events.userId/deviceId` | 同上 |
| 用户首见 / 最近活跃 | `user_first_seen` | 表已建；写入依赖 `ops-event` 收到带账号的事件 |

### 6.2 完全缺字段或集合

| 需求 | 缺什么 | 影响页面 | 建议 |
|---|---|---|---|
| 会话时长 / 使用时长 | 无 `session.start` / `session.end` 事件 | 总览 | 新增会话事件；或明确不做 |
| 实时在线人数 | 无心跳 / presence | 总览 | 不做实时，改为日活 |
| 崩溃率 / 前端错误率 | 无 `error.*` 事件 | 总览来源卡 | 新增错误事件，需脱敏 |
| 渠道 / 邀请归因 | 无 `channel` / `referrer` | `users`、总览 | 注册时记录归因字段 |
| 设备型号 / OS / 浏览器 / 地区 | `ops_events` 未采集 | `devices` | 新增受限枚举字段，禁止自由文本 |
| 账号禁用 / 封禁状态 | `users` 无状态字段 | `users` | 需产品确认，改认证或加字段 |
| 邮箱验证状态 | 认证系统内部字段，`users` 未落地 | `users` | 需确认是否同步到 `users` |
| 同步耗时 | `ops_events` 无 duration | `outbox` | 新增 `durationMs` 白名单字段 |
| 定时清理上次执行 | `ops-retention` 不落执行记录，日志只留 2h | 系统状态 | 可选新增 `ops_job_runs` 集合 |
| 读操作审计 | 只记录写操作 | `admin_audit_log` | 需产品确认是否记录查看行为 |
| 备份总占用趋势 | 只有单条 `bytes`，无按日聚合 | `backups` | 可按日聚合 `backups.bytes`，或新增快照 |

### 6.3 需要新增索引（字段不改）

| 集合 | 建议索引 | 支撑页面 / 查询 | 不加的后果 |
|---|---|---|---|
| `users` | `createdAt` | 用户列表按注册时间排序、每日注册数 | 跨账号排序退化为全表扫描 |
| `devices` | `lastSyncAt` | 设备列表按最近同步排序 | 跨账号排序退化为全表扫描 |
| `backups` | `createdAt` | 备份时间线（跨账号） | 同上 |
| `conflicts` | `[resolved+at]` | 未解决冲突列表 | 需全表扫描后内存过滤 |
| `commits` | `date` | M14 / M15 跨账号按日统计 | 用 `[ownerId+date]` 需逐账号查询；也可改用 `commit.create` 事件 |
| `branches` | `createdAt` | M16 跨账号新建分支数 | 同上，或用 `branch.create` 事件 |
| `ops_events` | `[event+userId+localDate]`（可选） | M18 漏斗按用户逐事件查 | 现有 `[userId+localDate]` 可先过滤事件，量大再补 |

### 6.4 需要新增集合（当前未申请，暂不做）

| 集合 | 用途 | 何时需要 |
|---|---|---|
| `metrics_daily` | 指标预聚合，避免每次现算 | 事件量增大、看板变慢时 |
| `ops_job_runs` | 定时任务执行记录（开始、结束、删除数、错误） | 需要“上次清理时间”时 |
| `admin_read_log` | 管理端读操作审计 | 合规要求记录查看行为时 |

---

## 7. 待决策

| 编号 | 事项 | 本文默认 |
|---|---|---|
| C1 | 数据表清单分组（两组还是三组） | 三组：业务表 / 运营与指标表 / 账号与平台表 |
| C2 | 用户、设备、同步是否单开语义页 | 不单开，走表浏览 |
| C3 | 留存 cohort 明细位置 | 总览底部折叠区块 |
| C4 | 系统状态是否单开页 | 不单开，并入总览与表清单 |
| C5 | 运营事件流是否单开页 | 不单开，走 `ops_events` / `events` / `counters` 表浏览 |
| C6 | 受限编辑何时开放 | 保持只读，编辑抽屉后续再接 |
| D1 | 是否区分只读管理员与可写管理员 | 当前不区分，全部白名单账号同一权限 |
| D2 | 编辑是否强制二次确认 | 是 |
| D3 | 首批上线指标 | M1–M8、M10–M15 |
| D4 | 留存主口径 | 精确日留存，任意回访作第二口径 |
| D11 | 邮箱验证模式 | `enforce` |
| D12 | 表浏览是否默认脱敏 | 是 |
| D13 | 指标是否排除管理员账号 | 待定 |
