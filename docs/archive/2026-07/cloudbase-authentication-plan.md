# Commit Web CloudBase 登录注册专项规划

> **文档状态：前提已变更（2026-11-13 标注）** 本文件是 2026-07-20 的登录注册方案，其「必须登录才能使用」的前提已被本地模式推翻（`AuthMode` 支持 `local`，未登录可直接进入工作区）。
>
> 认证体系能否上线的实际状态以 `web/docs/cloudbase-authentication-implementation-audit.md` 为准；本文件的阶段划分**不再等于当前计划**。

**文档版本**：1.0  
**规划日期**：2026-07-20  
**阶段性质**：设计阶段，不包含代码实现、CloudBase 资源创建或路由改动  
**适用项目**：`web/` React 18 + TypeScript + Vite 应用

配套实施拆分见：`docs/cloudbase-authentication-implementation-roadmap.md`。

## 1. 文档目标

本文档把当前 Commit Web 的演示认证迁移为真实 CloudBase 认证，并从当前项目的页面、
路由、状态管理和本地优先架构出发，完整规划以下内容：

- 邮箱注册与登录；
- 手机号注册与验证码登录；
- GitHub 第三方登录；
- 邮箱或 GitHub 账号绑定手机号；
- 未登录访问受保护页面时的跳转与登录后回跳；
- 登录注册相关的应用表、约束和安全审计；
- 验证码发送与校验的多层防刷和成本熔断；
- 用户风险通知、运维告警与 CloudBase 日志巡检；
- 从现有演示认证平滑迁移到真实认证的实施顺序。

本阶段不设计业务数据云同步，不迁移现有 Dexie 仓库、分支、任务和提交数据，也不实现
完整的企业 RBAC。登录成功只建立用户身份和访问会话，业务数据同步应另立专项。

## 2. 当前项目基线

### 2.1 已有认证界面

项目已经存在可用的认证 UI，而不是从零开始：

- `/login` 和 `/signup` 是 `LandingAuthLayout` 的子路由；
- 登录和注册以 `AuthDialog` 叠加在落地页上；
- `/`、`/login`、`/signup` 之间切换时落地页持续挂载；
- 当前 `demo-auth-store.ts` 只支持 `admin/admin` 和模拟 GitHub 登录；
- 当前注册、找回密码和 Session 都是演示逻辑；
- 当前所有应用页面都没有路由守卫；
- 当前设置页账户区域显示“本地模式”，登录按钮不可用；
- 当前业务数据存储在 Dexie/IndexedDB，退出登录不会清理本地数据。

真实认证应保留现有认证 Dialog 的交互和视觉资产，替换其数据源、表单结构和路由权限，
而不是另建一套风格割裂的登录页面。

### 2.2 当前路由

| 路由 | 当前页面 | 当前状态 |
|---|---|---|
| `/` | Landing | 公开 |
| `/login` | Landing + 登录 Dialog | 公开、演示认证 |
| `/signup` | Landing + 注册 Dialog | 公开、演示认证 |
| `/workspace` | TodayWorkspaceScreen | 未保护 |
| `/repository/:id` | RepositoryOverviewScreen | 未保护 |
| `/repository/:id/tasks` | RepositoryTasksScreen | 未保护 |
| `/insights` | InsightsScreen | 未保护 |
| `/settings` | SettingsScreen | 未保护 |
| 旧 search/heatmap/graph 等路由 | Navigate 兼容跳转 | 未保护 |

### 2.3 必须保留的项目约束

- 继续遵循 Presentation -> Application -> Domain <- Data 分层；
- Presentation 不直接依赖 CloudBase 的数据实现；
- CloudBase SDK 初始化属于 `core`/`platform` 边界；
- Auth 接口在 Domain 定义，实现放 Data/Platform，并通过 tsyringe 注入；
- 新认证 UI 继续使用 V3 Token 与现有 V3 组件；
- 不修改只读落地页实现，只通过已有认证布局和入口接入；
- 真实 Session 与本地业务数据生命周期分离；
- 不把 Refresh Token、验证码、密码或服务端 API Key 写入 Dexie。

## 3. 架构决策

### 3.1 推荐架构

```text
React 页面与 Auth Dialog
  -> Auth Store（只保存可展示的 Session 摘要和初始化状态）
  -> Auth UseCase（登录、注册、退出、绑定、回跳）
  -> IAuthRepository / IAuthSecurityRepository
  -> CloudBase Web SDK（登录、验证、Session）
  -> Auth Gateway 云函数（发送配额、风险判断、绑定与合并）
  -> CloudBase Auth（身份凭据和 Token）
  -> CloudBase PostgreSQL（应用用户、身份映射、配额、安全事件）
  -> CLS/日志监控 + 告警通知
```

职责边界：

- CloudBase Auth 负责密码、OTP 验证、OAuth 和 Session 签发；
- Auth Gateway 不自行签发登录 Token，只承担防刷、风险判断、敏感操作编排；
- PostgreSQL 不保存密码或验证码，只保存应用身份映射、计数器和审计；
- 前端路由守卫用于用户体验，服务端/RLS 才是数据授权边界；
- `service_role`/API Key 只存在于云函数，不得进入 Vite 环境变量或浏览器包。

### 3.2 用户唯一标识

采用两级标识：

1. CloudBase `uid`：认证层的稳定用户标识，来自真实 Session；
2. `principal_id`：Commit 应用层用户标识，使用 UUID，由 `auth_subjects` 关联一个或多个
   CloudBase `uid`。

邮箱、手机号、GitHub 用户名和 GitHub 邮箱都不是主键。它们可能变更，也可能缺失。
GitHub 身份必须使用 provider 返回的不可变 subject/user ID。

这样设计允许未来在完成双账号所有权验证后，把两个 CloudBase 身份合并到同一个
`principal_id`，而不需要重写所有业务表外键。

### 3.3 数据库选择

本规划推荐 CloudBase PostgreSQL，原因是手机号全局唯一、账号合并、验证码计数和审计写入
需要唯一索引、事务、条件索引和行级权限。实施前必须先通过 MCP 确认目标环境
`RuntimeBackends.postgresql === true`；旧环境不能假定可原地升级为 PG 模式。

如果最终环境没有 PostgreSQL，应单独评审 NoSQL 方案，不能把本文 SQL 约束机械改成文档
集合后直接实施。

## 4. 界面设计规格

### 4.1 目的

认证界面服务于首次进入和会话失效后的快速恢复，目标是让用户明确知道自己正在建立云端
身份，同时不破坏 Commit 已有的本地优先叙事。

### 4.2 视觉方向

- 方向：工业化、克制的工作台体验；
- 色彩：完全复用 `--v3-*` Token，不新增裸色值；
- 字体：沿用项目已批准的 IBM Plex Sans / JetBrains Mono；
- 布局：继续使用落地页背景上的路由驱动 Dialog；
- 图标：继续使用 Lucide，统一 `size={16}`、`strokeWidth={1.5}`；
- 动效：保留 Dialog 进入/退出和成功反馈，遵循 `prefers-reduced-motion`；
- 响应式：移动端使用可滚动全高 Dialog，验证码输入与发送按钮不得横向溢出。

这里以项目已有设计系统覆盖通用 UI skill 的默认字体和配色建议，因为 V3 Token、品牌字体和
现有认证 Dialog 已是项目批准的视觉标准。

### 4.3 认证 Dialog 信息架构

`/login`：

- 顶部保持“登录 / 注册”Tab；
- 登录方式使用“邮箱 / 手机号”分段控件；
- 邮箱模式：邮箱、密码、记住我、忘记密码；
- 手机模式：国家/地区代码、手机号、验证码、发送按钮；
- GitHub 按钮置于分隔线后，邮箱和手机模式共用；
- 被路由守卫跳转时显示“登录后继续访问 {目标名称}”的短提示；
- 不显示用户是否存在、手机号是否已注册等可枚举信息。

`/signup`：

- 注册方式使用“邮箱 / 手机号”分段控件；
- 邮箱注册：邮箱、密码、确认密码、邮箱验证码；
- 手机注册：国家/地区代码、手机号、短信验证码，可按 CloudBase 能力选择是否同时设密码；
- GitHub 注册与 GitHub 登录使用同一 OAuth 入口，回调后按身份是否存在决定创建或登录；
- 用户协议勾选在发送验证码或发起 OAuth 前校验；
- 注册成功直接建立 Session，不再跳回演示账号登录。

找回密码：

- 继续作为 `/login` Dialog 内部子视图，不扩大公开 URL 契约；
- 仅支持已验证邮箱/手机号；
- 无论目标是否存在都返回同样文案；
- 找回和改密成功后撤销其他活跃 Session，并发送安全通知。

## 5. 页面与路由访问规划

### 5.1 访问等级

定义三种路由状态：

- `public`：任何人可访问；
- `guestOnly`：只允许未登录用户访问，已登录则回工作台或安全的 `returnTo`；
- `authenticated`：必须存在真实、非匿名 CloudBase Session。

### 5.2 路由矩阵

| 路由 | 等级 | 未登录行为 | 已登录行为 |
|---|---|---|---|
| `/` | public | 显示落地页 | 显示落地页，入口文案为“进入工作台” |
| `/login` | guestOnly | 打开真实登录 Dialog | 重定向 `/workspace` 或安全 `returnTo` |
| `/signup` | guestOnly | 打开真实注册 Dialog | 重定向 `/workspace` 或安全 `returnTo` |
| `/workspace` | authenticated | 跳 `/login?returnTo=%2Fworkspace` | 正常访问 |
| `/repository/:id` | authenticated | 带完整路径跳登录 | 正常访问并由数据层校验归属 |
| `/repository/:id/tasks` | authenticated | 带完整路径跳登录 | 正常访问并由数据层校验归属 |
| `/insights` | authenticated | 带 query 跳登录 | 正常访问 |
| `/settings` | authenticated | 带 query 跳登录 | 正常访问 |
| 旧兼容路由 | authenticated | 先进入登录，再执行兼容跳转 | 执行现有 Navigate |
| 未知路由 | public fallback | 回 `/` | 回 `/` |

所有应用壳层页面整体受保护，不在每个 Screen 内重复写 Session 判断。建议在路由树中增加
`PublicOnlyRoute` 与 `AuthenticatedRoute` 两个布局守卫。

### 5.3 `returnTo` 规则

1. 守卫捕获 `pathname + search + hash`；
2. 编码后写入 `/login?returnTo=...`；
3. 登录或注册成功后使用 `replace(returnTo)`，避免后退回登录页；
4. 仅接受以单个 `/` 开头的站内相对路径；
5. 拒绝 `//host`、协议 URL、反斜杠、控制字符、`/login` 和 `/signup`；
6. 不合法或缺失时回 `/workspace`；
7. OAuth 发起前把已校验目标写入带过期时间的 `state` 关联记录；
8. OAuth 回调后再次验证，不能直接相信 URL 参数。

示例：

```text
访客打开 /repository/r-123/tasks?status=todo
  -> AuthenticatedRoute 检查 getSession()
  -> 无真实 Session
  -> replace /login?returnTo=%2Frepository%2Fr-123%2Ftasks%3Fstatus%3Dtodo
  -> 用户完成邮箱/手机/GitHub 登录
  -> replace /repository/r-123/tasks?status=todo
```

### 5.4 哪些点击需要跳登录

| 当前入口 | 访客点击行为 |
|---|---|
| Landing Header“登录” | `/login` |
| Landing“开始使用”/主 CTA | `/login?returnTo=%2Fworkspace` |
| Landing 已有工作台预览中的可交互入口 | 若目标是应用路由，统一经过守卫 |
| V3 左侧“今日” | `/login?returnTo=%2Fworkspace` |
| V3 左侧“仓库概览/仓库任务/Recent” | 带实际仓库路径跳登录 |
| V3 左侧“洞察” | `/login?returnTo=%2Finsights` |
| V3 左侧“设置” | `/login?returnTo=%2Fsettings` |
| 顶栏用户菜单“登录” | `/login?returnTo={当前受保护路径}` |
| 设置页账户卡“登录” | `/login?returnTo=%2Fsettings` |
| 浏览器直接输入受保护深链 | 由 AuthenticatedRoute 自动跳登录 |

正常情况下访客不会看到 V3 应用壳，因为应用路由已经受保护。表格中的 V3 点击行为主要用于
Session 在页面存活期间失效、跨标签页退出或刷新失败等场景，所有入口仍必须由路由守卫兜底。

### 5.5 Session 初始化页面状态

不能在应用启动时默认判断为“未登录”并立即跳转，否则本地 Session 恢复会闪烁或误跳。
Auth Store 需要三态：

- `initializing`：调用 `auth.getSession()` 中，显示全屏 V3 Loading；
- `authenticated`：存在真实且非匿名 Session；
- `guest`：确认不存在真实 Session；
- `error`：初始化失败，显示重试；网络错误不能伪装成已退出。

必须拒绝 `session.user.is_anonymous === true`。不能使用废弃的 `getLoginState()`，也不能仅用
`getUser()` 或 `uid` 是否存在证明已登录，因为 Publishable Key 可能产生轻量匿名状态。

## 6. 当前文件的迁移映射

| 当前文件/模块 | 规划后的职责 |
|---|---|
| `src/app.tsx` | 公开路由与受保护路由分组；兼容路由置于认证守卫内 |
| `landing-auth-layout.tsx` | 解析 login/signup/returnTo；已登录用户安全回跳 |
| `auth-dialog.tsx` | 编排真实登录、注册、找回、验证码和错误状态 |
| `login-form.tsx` | 邮箱密码、手机号 OTP、GitHub OAuth |
| `signup-form.tsx` | 邮箱注册、手机号注册、GitHub OAuth |
| `forgot-password-view.tsx` | 真实恢复流程、统一防枚举反馈 |
| `demo-auth-store.ts` | 被真实 `auth-store.ts` 替换；不保留 admin/admin 后门 |
| `auth-session-storage.ts` | 删除自定义 Session 模拟；Token 持久化交给 CloudBase SDK |
| `v3-user-menu.tsx` | 显示真实头像/昵称/邮箱掩码、账户安全入口、退出 |
| `settings-screen.tsx` | 增加账户与安全 Section；账户卡展示真实身份 |
| `core/di/injection-container.ts` | 注册 Auth Repository 和认证 UseCase |

建议新增的代码所有权边界（后续实施阶段）：

```text
src/domain/entities/auth-session.ts
src/domain/entities/user-profile.ts
src/domain/repositories/i-auth-repository.ts
src/domain/repositories/i-auth-security-repository.ts
src/application/usecases/auth/sign-in-with-email-usecase.ts
src/application/usecases/auth/request-phone-code-usecase.ts
src/application/usecases/auth/verify-phone-code-usecase.ts
src/application/usecases/auth/sign-in-with-github-usecase.ts
src/application/usecases/auth/sign-out-usecase.ts
src/application/usecases/auth/bind-phone-usecase.ts
src/data/repositories/cloudbase-auth-repository.ts
src/data/repositories/cloudbase-auth-security-repository.ts
src/core/cloudbase/cloudbase-client.ts
src/presentation/routes/authenticated-route.tsx
src/presentation/routes/public-only-route.tsx
src/presentation/stores/auth-store.ts
src/presentation/screens/settings/account-security-section.tsx
```

## 7. 认证流程设计

### 7.1 邮箱注册

```text
用户填写邮箱、密码、确认密码并同意协议
  -> 本地格式和密码强度校验
  -> 请求验证码网关（purpose=email_signup）
  -> 网关校验 CAPTCHA、IP、设备、邮箱和全局额度
  -> CloudBase 发送验证码
  -> 用户提交验证码
  -> CloudBase 完成邮箱注册并签发 Session
  -> bootstrapProfile 幂等创建 principal/auth_subject/email identity
  -> 记录 REGISTER_SUCCESS 和安全通知
  -> 安全 returnTo 或 /workspace
```

邮箱采用 trim + lowercase 规范化用于查重。不要对 Gmail 等域名擅自删除点号或 `+tag`。

### 7.2 邮箱登录

```text
用户填写邮箱和密码
  -> 登录速率检查
  -> CloudBase signInWithPassword({ email, password })（以实施时 SDK 提示为准）
  -> 成功：刷新 profile，记录 LOGIN_SUCCESS，安全回跳
  -> 失败：统一显示“账号或密码不正确”，记录 LOGIN_FAILED
```

不能区分“邮箱不存在”和“密码错误”。连续失败触发渐进延迟、CAPTCHA 和临时封锁。

### 7.3 手机号注册/登录

手机号使用 E.164 规范化，UI 明确国家/地区代码。

```text
用户输入手机号
  -> 请求验证码网关（purpose=phone_signin）
  -> 多维配额 + 风险判断 + 必要时 CAPTCHA
  -> 发送 OTP，前端开始 60 秒倒计时
  -> 用户提交 verification_id + code
  -> 最多 5 次尝试，成功后由 CloudBase 建立 Session
  -> 身份不存在则创建用户，存在则登录
  -> 幂等创建/读取 principal，记录审计，安全回跳
```

登录与注册界面可以分别存在，但手机号 OTP 后端使用同一流程，通过
`shouldCreateUser` 或等效参数决定登录页是否允许自动创建。建议：

- `/login` 手机模式设置 `shouldCreateUser=false`，避免误注册；
- `/signup` 手机模式允许创建；
- 错误文案仍避免暴露该号码是否已注册，提供“前往注册/前往登录”的普通导航。

### 7.4 GitHub 登录/注册

```text
用户点击 GitHub
  -> 先校验协议（注册场景）和 OAuth 发起频率
  -> 生成 state/PKCE 和安全 returnTo
  -> 跳转 GitHub 授权
  -> CloudBase/可信后端验证回调
  -> 用 GitHub 不可变 subject 查 user_identities
  -> 已关联：登录目标 principal
  -> 未关联：创建 principal + github identity
  -> 记录 LOGIN_SUCCESS 或 REGISTER_SUCCESS
  -> 安全回跳
```

实施前必须通过 `queryAppAuth`/`manageAppAuth` 和目标 SDK 做 GitHub Provider PoC：

1. 如果目标环境支持通用 GitHub OAuth Provider，优先使用 `signInWithOAuth`/`linkIdentity`；
2. 如果只支持 GitHub Token 输入，使用可信后端完成 OAuth code 交换，再使用官方
   `signInWithIdToken({ provider: 'github' })` 或自定义登录票据；
3. 不得把 GitHub Client Secret 放到浏览器；
4. 不得根据 GitHub 邮箱与现有邮箱自动合并账号。

### 7.5 绑定手机号

邮箱或 GitHub 用户均在设置页“账户与安全”发起绑定：

```text
真实 Session + 最近 10 分钟内重新认证
  -> 请求 bind_phone 验证码
  -> 验证 OTP
  -> 事务检查 active phone identity 唯一索引
  -> 无占用：绑定 CloudBase 身份并写 user_identities
  -> 已绑定当前 principal：返回幂等成功
  -> 已绑定其他 principal：PHONE_ALREADY_BOUND，不覆盖
```

冲突时只显示：“该手机号已关联其他账户。请先登录原账户完成合并或联系支持。”不得返回
对方邮箱、昵称、GitHub 用户名或精确注册时间。

账号合并必须证明两个账号的控制权：当前 Session 重新认证，再独立完成冲突账号登录；合并由
云函数在事务中执行。仅凭收到当前手机号 OTP 不足以夺取已绑定账号。

### 7.6 退出与失效

- 用户主动退出：调用 CloudBase `signOut()`，清空内存 profile，`replace('/')`；
- 不删除 Dexie 业务数据，但 UI 必须明确这是当前设备的未同步数据；
- Token 刷新失败：先单飞重试一次，确认不可恢复后转 guest；
- 跨标签页收到 `SIGNED_OUT`：立即关闭敏感 Dialog，转 `/login?returnTo=当前路径`；
- 账号封禁、改密、身份解绑或合并后撤销其他 Session；
- `TOKEN_REFRESHED` 和 `USER_UPDATED` 只更新 Store，不造成页面重载。

## 8. 登录注册专项库表设计

以下表只承载应用认证辅助数据。CloudBase Auth 自己的用户、密码和 Token 不复制到这些表。

### 8.1 `principals`

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | uuid | PK | Commit 用户主标识 |
| `status` | varchar(20) | NOT NULL | active/locked/merged/deleted |
| `display_name` | varchar(80) | NULL | 展示名 |
| `avatar_url` | text | NULL | 头像地址 |
| `locale` | varchar(16) | NOT NULL | 默认 `zh-CN` |
| `security_version` | bigint | NOT NULL | 敏感变更后递增，用于失效缓存 |
| `merged_into_id` | uuid | FK NULL | 合并后的目标主体 |
| `created_at` | timestamptz | NOT NULL | 创建时间 |
| `updated_at` | timestamptz | NOT NULL | 更新时间 |

### 8.2 `auth_subjects`

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `auth_uid` | varchar(128) | PK | CloudBase Session user.id |
| `principal_id` | uuid | FK, INDEX | 对应应用主体 |
| `is_canonical` | boolean | NOT NULL | 主认证 UID |
| `created_at` | timestamptz | NOT NULL | 建立时间 |
| `revoked_at` | timestamptz | NULL | UID 停用时间 |

同一个 `principal_id` 可以在账号合并后关联多个历史 `auth_uid`，但只能有一个有效 canonical
subject。

### 8.3 `user_identities`

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | uuid | PK | 身份记录 ID |
| `principal_id` | uuid | FK, INDEX | 所属主体 |
| `provider` | varchar(24) | NOT NULL | email/phone/github |
| `provider_subject` | varchar(255) | NOT NULL | Provider 不可变标识 |
| `identifier_hash` | char(64) | NULL | 邮箱/手机号 HMAC |
| `identifier_masked` | varchar(128) | NULL | UI 脱敏展示 |
| `is_primary` | boolean | NOT NULL | 是否主要身份 |
| `verified_at` | timestamptz | NOT NULL | 验证时间 |
| `last_used_at` | timestamptz | NULL | 最近登录时间 |
| `revoked_at` | timestamptz | NULL | 解绑时间 |
| `created_at` | timestamptz | NOT NULL | 创建时间 |

约束：

- `UNIQUE(provider, provider_subject)`；
- 有效 phone 身份的 `identifier_hash` 条件唯一；
- 有效 email 身份也建议唯一；若业务决定允许同邮箱多账号，必须取消自动合并且另行评审；
- 原始手机号/邮箱优先由 CloudBase Auth 保管，应用库只存 HMAC 与掩码；
- HMAC 使用服务端 pepper，不能使用无密钥 SHA-256 防止字典枚举。

### 8.4 `verification_challenges`

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | uuid | PK | 应用挑战 ID |
| `provider_verification_id` | varchar(255) | NULL | CloudBase 返回的关联 ID |
| `purpose` | varchar(32) | NOT NULL | signup/signin/bind/recovery |
| `channel` | varchar(10) | NOT NULL | sms/email |
| `target_hash` | char(64) | INDEX | 目标 HMAC |
| `principal_id` | uuid | NULL | 已登录敏感操作的主体 |
| `ip_prefix_hash` | char(64) | INDEX | IP 前缀 HMAC |
| `device_hash` | char(64) | INDEX | 一方设备标识 HMAC |
| `status` | varchar(20) | NOT NULL | pending/verified/expired/blocked |
| `attempt_count` | smallint | NOT NULL | 错误验证次数 |
| `expires_at` | timestamptz | NOT NULL | 过期时间 |
| `created_at` | timestamptz | NOT NULL | 创建时间 |
| `verified_at` | timestamptz | NULL | 成功时间 |

不保存 OTP 明文或可逆密文。验证码由 CloudBase 验证，应用表只维护风控状态和关联 ID。

### 8.5 `auth_rate_limits`

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `scope_type` | varchar(20) | PK 组成 | target/ip/device/principal/global |
| `scope_key_hash` | char(64) | PK 组成 | 作用域键 HMAC |
| `action` | varchar(32) | PK 组成 | send_sms/send_email/verify/login/oauth |
| `window_started_at` | timestamptz | PK 组成 | 固定窗口起点 |
| `count` | integer | NOT NULL | 当前计数 |
| `blocked_until` | timestamptz | NULL | 临时封锁截止 |
| `updated_at` | timestamptz | NOT NULL | 更新时间 |

计数增加必须使用原子 UPSERT 或数据库函数，不能先查后写。

### 8.6 `account_merge_requests`

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | uuid | PK | 合并请求 |
| `source_principal_id` | uuid | FK | 被合并主体 |
| `target_principal_id` | uuid | FK | 保留主体 |
| `source_proof_at` | timestamptz | NULL | 源账号验证时间 |
| `target_proof_at` | timestamptz | NULL | 目标账号验证时间 |
| `status` | varchar(20) | NOT NULL | pending/approved/completed/rejected/expired |
| `expires_at` | timestamptz | NOT NULL | 请求过期时间 |
| `created_at` | timestamptz | NOT NULL | 创建时间 |
| `completed_at` | timestamptz | NULL | 完成时间 |

### 8.7 `auth_security_events`

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | uuid | PK | 事件 ID |
| `principal_id` | uuid | NULL, INDEX | 用户主体 |
| `event_type` | varchar(48) | NOT NULL, INDEX | LOGIN_FAILED 等 |
| `risk_level` | varchar(10) | NOT NULL | info/low/medium/high/critical |
| `ip_prefix_hash` | char(64) | NULL | IP HMAC |
| `device_hash` | char(64) | NULL | 设备 HMAC |
| `user_agent_family` | varchar(80) | NULL | 归一化 UA，避免全量指纹 |
| `request_id` | varchar(128) | NULL | 关联函数/CLS 日志 |
| `metadata` | jsonb | NOT NULL | 不含密码、Token、OTP 和完整 PII |
| `created_at` | timestamptz | NOT NULL, INDEX | 发生时间 |

### 8.8 `security_notification_outbox`

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | uuid | PK | 通知 ID |
| `principal_id` | uuid | FK | 接收用户 |
| `event_id` | uuid | FK, UNIQUE 组成 | 来源安全事件 |
| `channel` | varchar(16) | UNIQUE 组成 | email/in_app |
| `template_code` | varchar(48) | NOT NULL | 通知模板 |
| `status` | varchar(16) | NOT NULL | pending/sent/failed/suppressed |
| `attempt_count` | smallint | NOT NULL | 发送次数 |
| `next_attempt_at` | timestamptz | NULL | 重试时间 |
| `sent_at` | timestamptz | NULL | 发送时间 |
| `created_at` | timestamptz | NOT NULL | 创建时间 |

Outbox 保证安全事件与通知意图同事务落库，异步发送失败不会回滚登录主流程。

### 8.9 权限与 RLS

- 浏览器不直接读写 `verification_challenges`、`auth_rate_limits`、合并请求和安全事件；
- 这些表仅授予 `service_role`，通过 Auth Gateway 操作；
- `principals` 和 `user_identities` 如需浏览器读取，必须启用 RLS；
- RLS 使用 `auth.uid()` 经 `auth_subjects` 映射到 `principal_id`；
- 不能使用 PostgreSQL `current_user` 识别最终用户；
- 前端不可修改 `status`、`security_version`、身份归属或验证时间。

## 9. 验证码防刷与成本保护

### 9.1 威胁模型

必须同时防御：

- 单个手机号/邮箱被反复轰炸；
- 同一 IP 批量攻击不同号码；
- 攻击者轮换 IP 但复用设备；
- 攻击者绕过前端倒计时直接调用接口；
- 验证码暴力猜解和重放；
- 自动化注册消耗短信、邮件和函数资源；
- 全局成本达到预算后仍持续发送。

前端倒计时不是安全措施。限流必须在可信网关和平台侧执行。

### 9.2 CloudBase 已确认的基础限制

根据当前 CloudBase 认证资料：

- 同一手机号或邮箱 60 秒内只能发送一次；
- 同一 IP 每小时最多发送 10 次验证码；
- 风险请求可能返回 `captcha_required`，后续请求需携带 CAPTCHA Token；
- 验证 ID 与验证码绑定，验证码有短有效期；
- 应限制错误校验次数，验证码不能存储在客户端。

这些平台限制是最后防线，应用仍要设置更保守的额度和全局成本熔断。

### 9.3 建议初始限额

以下值用于 Beta 初始配置，全部放在服务端配置中，不写死前端；上线后按真实转化率调整。

| 维度 | 短信发送 | 邮件发送 | 超限动作 |
|---|---:|---:|---|
| 单目标冷却 | 1 次/60 秒 | 1 次/60 秒 | 返回剩余秒数 |
| 单目标短窗 | 3 次/15 分钟 | 5 次/15 分钟 | CAPTCHA + 冷却 |
| 单目标小时 | 5 次/小时 | 8 次/小时 | 封锁 1 小时 |
| 单目标日 | 10 次/24 小时 | 20 次/24 小时 | 封锁至滚动窗口释放 |
| 单 IP | 8 次/小时 | 20 次/小时 | CAPTCHA；重复则封锁 |
| 单设备 | 5 次/小时、15 次/日 | 10 次/小时、30 次/日 | CAPTCHA/封锁 |
| 已登录主体 | 5 次/小时、10 次/日 | 8 次/小时、20 次/日 | 用于绑定/恢复 |
| 单 challenge 校验 | 最多 5 次 | 最多 5 次 | 立即作废 challenge |
| 登录密码失败 | 5 次/15 分钟 | 同左 | CAPTCHA + 指数退避 |
| OAuth 发起 | 10 次/10 分钟 | 不适用 | 冷却，防重定向滥用 |

IP 限额要考虑公司/NAT 网络，达到阈值时优先要求 CAPTCHA，不要立刻永久封禁。

### 9.4 全局短信预算

设置 `dailySmsBudget`，Beta 默认建议 100 条/环境/日，正式值按购买套餐、日活和可接受成本
计算。网关每次发送前原子检查预算：

| 使用比例 | 动作 |
|---:|---|
| 70% | 运维 Info，观察渠道与来源分布 |
| 85% | 运维 Warning，强制所有匿名发送先过 CAPTCHA |
| 95% | 运维 Critical，匿名注册短信进入熔断，仅保留恢复/绑定白名单额度 |
| 100% | 停止短信发送，用户看到可恢复提示；邮箱/GitHub 登录继续可用 |

另设每小时突增告警：当前小时发送量大于过去 7 天同小时基线 3 倍，且绝对数量至少 20 条时
触发。基线不足的新环境使用静态阈值。

预算不能只依赖应用表。还要在短信供应商/腾讯云费用中心设置套餐余量、预算和费用告警，
形成平台侧硬保护。实际控制台支持的阈值与通知渠道在实施时核验。

### 9.5 CAPTCHA 策略

以下任一条件要求 CAPTCHA：

- CloudBase 返回 `captcha_required`；
- 同 IP 10 分钟内请求超过 3 次；
- 同设备切换超过 3 个目标；
- 同目标当天第 4 次发送；
- 登录或验证码连续失败；
- 数据中心代理、异常国家/地区跳变或高风险 UA；
- 全局短信预算达到 85%。

CAPTCHA 成功只解除本次挑战，不清零历史额度。

### 9.6 网关不可绕过要求

生产实现要验证 CloudBase Provider 是否允许关闭或约束浏览器直接发送 OTP：

- 最佳方案：浏览器只调用 Auth Gateway，由网关调用官方验证码接口；
- 如果 Publishable Key 仍允许直接绕过网关发送，则应用限流无法完全保护资源；
- 此时必须依赖 CloudBase 硬限额、CAPTCHA、短信供应商日预算，或改用完全由后端控制的
  自定义 OTP 通道；
- 该能力验证是实施前阻断项，PoC 未通过不得直接上线短信注册。

## 10. 风险事件、用户通知与运维告警

### 10.1 对 skill 的检查结论

当前 CloudBase skill 确实提到监控和告警，但需要区分能力：

- `cloudbase-platform` 指出日志监控页可观察资源用量、性能和错误率，并配置告警与通知；
- `ops-inspector` 可以检查 CLS、函数、CloudRun、数据库和错误日志；
- `ops-inspector` 明确说明它是一次性巡检，不替代持续监控/告警基础设施；
- `auth-nodejs` 提到可读取客户端 IP，用于审计、异常检测和访问控制；
- skill 没有提供开箱即用的“用户账号风险短信/邮件通知”完整业务流程。

因此，本系统需要自行产生日志和安全事件，通过 CloudBase 持续告警通知运营人员，并通过
Outbox 给最终用户发送安全邮件。不能认为运行 skill 会自动给用户报警。

### 10.2 用户安全通知

优先发送到已验证邮箱，避免用短信告警进一步消耗短信资源。没有邮箱时先保留站内安全中心
记录；手机号用户可在后续版本选择关键事件短信通知。

| 事件 | 风险级别 | 是否通知用户 | 内容要求 |
|---|---|---|---|
| 新设备首次登录 | medium | 是 | 时间、粗粒度地区、设备类型、非本人处置链接 |
| 短时间异地登录 | high | 是 | 不展示精确 IP，提供撤销会话入口 |
| 连续登录失败后成功 | medium | 是 | 提醒检查密码和活跃会话 |
| 密码重置/修改 | high | 是 | 立即通知，提供冻结入口 |
| 邮箱/手机号绑定或解绑 | high | 是 | 同时通知旧、新验证渠道 |
| GitHub 绑定或解绑 | medium | 是 | 显示 Provider 和时间 |
| 账号合并完成 | critical | 是 | 双账号渠道都通知，列出保留主体 |
| Session 被安全策略撤销 | high | 是 | 说明原因类别和重新登录方式 |
| OTP 发送被限流 | low | 条件通知 | 不逐次发送，避免被攻击者借通知轰炸 |

通知中的“不是本人操作”入口使用一次性、短有效期 Token，进入后仍需重新认证；不得在邮件中
放置可直接修改身份的长期链接。

### 10.3 运维告警

| 告警 | Warning | Critical | 自动动作 |
|---|---:|---:|---|
| 短信日预算 | 85% | 95% | CAPTCHA / 熔断 |
| OTP 发送失败率（5 分钟） | >10% 且 >=20 次 | >30% 且 >=20 次 | 降级提示、停止重试风暴 |
| OTP 验证失败率（10 分钟） | >40% 且 >=30 次 | >70% 且 >=30 次 | 加 CAPTCHA、封锁高风险维度 |
| Auth Gateway 5xx（5 分钟） | >2% | >10% | 打开故障模式，禁止重复发送 |
| 单 IP 被限流 | 5 个/10 分钟 | 20 个/10 分钟 | 提升全局风险等级 |
| 注册量突增 | 基线 2 倍 | 基线 5 倍 | 强制 CAPTCHA，人工确认 |
| 数据库/函数不可用 | 连续 2 分钟 | 连续 5 分钟 | 禁止敏感写操作 |
| 安全通知 Outbox 积压 | >100 或 10 分钟 | >500 或 30 分钟 | 扩容/暂停非关键通知 |

CloudBase/CLS 日志必须使用结构化字段：`event_type`、`risk_level`、`request_id`、
`principal_id`（可内部使用）、`result`、`latency_ms`。日志不得包含完整邮箱、手机号、密码、
OTP、Access Token、Refresh Token、GitHub Token 或 API Key。

建议接收方：

- Critical：值班负责人 + 项目所有者；
- Warning：认证运维群/邮件组；
- Info：仅仪表盘和日报；
- 告警渠道以 CloudBase 控制台实际支持为准，实施时验证邮件、短信、企业微信等可用性；
- 成本告警不要只发短信，避免短信服务异常时告警链路同时失效。

### 10.4 巡检计划

- 每日：验证码发送量、失败率、限流率、预算余量、Top IP/设备（脱敏）；
- 每周：运行一次 CloudBase `ops-inspector` 全量巡检；
- 发布后 24 小时：每 2 小时检查 Auth Gateway 错误和短信消耗；
- 事故时：按明确时间范围查询 CLS，关联 `request_id`，避免无范围日志搜索；
- CLS 未启用属于上线阻断项，因为无法完成认证风险诊断。

## 11. API 设计概要

CloudBase Web SDK 直接负责登录和 Session；下列为应用侧安全网关接口。

| 方法与路径 | 认证 | 用途 |
|---|---|---|
| `POST /v1/auth/challenges` | 可公开，需风控 | 请求邮箱/短信验证码 |
| `POST /v1/auth/challenges/:id/verify` | 可公开，需风控 | 验证 OTP 或协调 CloudBase verify callback |
| `POST /v1/auth/profile/bootstrap` | 必须登录 | 幂等创建应用主体和身份映射 |
| `POST /v1/auth/reauth` | 必须登录 | 发起敏感操作二次验证 |
| `POST /v1/auth/identities/phone` | 登录 + 重新认证 | 绑定手机号 |
| `DELETE /v1/auth/identities/:id` | 登录 + 重新认证 | 解绑，至少保留一种登录方式 |
| `GET /v1/auth/me` | 必须登录 | 获取 profile、身份掩码和安全摘要 |
| `GET /v1/auth/sessions` | 必须登录 | 后续版本查看活跃设备 |
| `DELETE /v1/auth/sessions/:id` | 登录 + 重新认证 | 撤销指定会话 |
| `POST /v1/auth/merge-requests` | 登录 + 双账号证明 | 创建账号合并请求 |

统一错误码：

```text
AUTH_REQUIRED
SESSION_EXPIRED
REAUTH_REQUIRED
INVALID_CREDENTIALS
INVALID_VERIFICATION_CODE
CHALLENGE_EXPIRED
CAPTCHA_REQUIRED
RATE_LIMITED
SMS_BUDGET_EXHAUSTED
PHONE_ALREADY_BOUND
IDENTITY_ALREADY_LINKED
MERGE_PROOF_REQUIRED
OAUTH_STATE_INVALID
SERVICE_TEMPORARILY_UNAVAILABLE
```

`RATE_LIMITED` 可以返回 `retryAfterSeconds`，但不能返回其他用户信息或内部风控分数。

## 12. 安全要求

### 12.1 Session 与 Token

- 使用 `auth.getSession()` 判断登录；
- 仅接受真实、非匿名 Session；
- Token 刷新使用 SDK `refreshSession()` 和单飞锁；
- 同一标签页并发 401 只触发一次刷新；
- Refresh Token 不进入 Zustand 持久化、Dexie、日志或错误上报；
- “记住我”是否能映射不同持久化级别需以当前 SDK 能力为准；如果 SDK 只支持 local，UI 不应
  提供无法兑现的 Session 级选项；
- 退出、改密、合并和高风险事件后撤销会话。

### 12.2 登录与注册

- 密码最少 12 位，建议允许密码管理器生成，不设置妨碍长密码的低上限；
- 允许粘贴密码和验证码；
- 服务端统一错误，防止用户枚举；
- 注册、找回、绑定均需要短有效期 challenge；
- challenge 单次使用，成功或超限后立即作废；
- OAuth 使用 state，支持时启用 PKCE；
- GitHub Client Secret、CloudBase API Key 和 HMAC pepper 存在服务端 Secret；
- 对安全域名、OAuth 回调域名和 CORS 使用明确白名单。

### 12.3 浏览器安全

- 设置严格 CSP，限制脚本、连接和 frame 来源；
- 防止 XSS，因为浏览器认证 Session 的安全取决于执行环境；
- `returnTo` 严格白名单，防止开放重定向；
- 表单错误不回显服务端堆栈；
- 不使用浏览器可伪造的设备指纹作为唯一安全凭据；
- PWA/Service Worker 不缓存认证接口响应、验证码或包含用户资料的 HTML。

### 12.4 敏感操作二次验证

以下操作要求最近 10 分钟内重新认证：

- 绑定/解绑邮箱、手机号、GitHub；
- 修改或重置密码；
- 合并账号；
- 查看或撤销其他设备 Session；
- 删除账号；
- 未来的角色提升和云数据导出。

## 13. 状态管理规划

`useAuthStore` 只保存：

```text
status: initializing | authenticated | guest | error
sessionSummary: userId, expiresAt, provider（不保存原始 token）
profile: principalId, displayName, avatarUrl, maskedIdentities
operation: 当前认证动作
error: 归一化错误
lastSecurityEvent: 可选提示
```

Store action：

```text
initialize()
signInWithEmail()
requestPhoneCode()
verifyPhoneCode()
signInWithGitHub()
signUpWithEmail()
signOut()
refreshSession()
bindPhone()
clearError()
```

Auth Store 不直接访问 fetch/SDK；它调用 Application UseCase。表单输入、验证码倒计时、字段
错误和 password visibility 留在组件本地状态。

## 14. 测试与验收规划

### 14.1 单元测试

- `returnTo` 白名单与恶意 URL；
- Session 三态和匿名 Session 拒绝；
- 邮箱、手机号 E.164 和密码校验；
- 错误码归一化且不泄露账号存在性；
- OTP 多维配额和原子计数；
- challenge 过期、重放、5 次失败作废；
- 手机号唯一冲突和幂等绑定；
- Outbox 去重和重试；
- Token 刷新单飞；
- 退出不删除 Dexie 数据。

### 14.2 组件与路由测试

- `/login`、`/signup` 保持落地页挂载；
- 访客进入每个受保护路由都会生成正确 `returnTo`；
- 已登录访问 login/signup 会安全回跳；
- 登录失败聚焦正确字段；
- 手机验证码 60 秒倒计时不代表服务端额度被重置；
- `CAPTCHA_REQUIRED`、`RATE_LIMITED`、预算耗尽和服务故障状态；
- GitHub 回调 state 错误不能进入应用；
- Session 初始化时不闪现受保护内容；
- 跨标签页退出后当前页面转登录；
- 设置页显示真实身份掩码和绑定状态。

### 14.3 集成与安全测试

- 真实邮箱注册、登录、找回；
- 真实手机号注册、登录、绑定和冲突；
- GitHub 首次注册、再次登录、取消授权和 state 攻击；
- 绕过 UI 直接请求验证码时仍被网关/平台限流；
- 同目标、同 IP、多目标、轮换 IP 和并发请求；
- 全局预算达到 85%/95%/100% 时的告警和熔断；
- RLS 不能读取其他用户身份；
- 浏览器包中不存在 API Key、Client Secret 或 HMAC pepper；
- 日志扫描确认不存在 Token、OTP 和完整 PII。

### 14.4 质量门禁

后续实现必须通过：

```bash
npm run lint
npx tsc -b
npm test
npm run build
```

并使用真实浏览器验证刷新、回退、深链、OAuth 回调、移动端 Dialog 和跨标签页退出。

## 15. 实施阶段划分

### Phase 0：CloudBase 能力与成本 PoC

- 用 MCP 解析完整 EnvId 并确认 PG、CLS、Auth 状态；
- 查询 Email、Phone、GitHub Provider 和 Publishable Key；
- 配置测试域名、OAuth 回调域名和测试短信/邮件模板；
- 验证 GitHub 是通用 OAuth、ID Token 还是自定义票据路径；
- 验证浏览器直接 OTP 是否能被禁用或限制；
- 明确短信套餐、日预算、供应商费用告警和通知渠道；
- 本阶段不写前端业务代码，PoC 结论评审后再继续。

### Phase 1：认证基础设施

- 建表、索引、GRANT、RLS 和迁移；
- 创建 Auth Gateway、结构化日志和配额逻辑；
- 启用 CLS 与持续告警；
- 完成 Repository/UseCase/DI，不接 UI；
- 为核心逻辑先写测试。

### Phase 2：替换演示认证

- `demo-auth-store` 切换为真实 Auth Store；
- 改造现有 Login/Signup/Forgot 表单；
- 接入邮箱、手机、GitHub；
- 保持现有 Landing + Dialog 视觉结构；
- 删除 `admin/admin` 和模拟 GitHub 后门。

### Phase 3：路由保护与设置页

- 引入 `AuthenticatedRoute`/`PublicOnlyRoute`；
- 保护应用页和旧兼容路由；
- 实现安全 `returnTo`；
- 设置页增加账户与安全 Section；
- 实现手机号绑定、冲突和二次验证。

### Phase 4：风控、通知与上线验证

- CAPTCHA、全局短信预算和熔断；
- 用户安全邮件和 Outbox；
- CloudBase 运维告警和巡检；
- 完成攻击路径、资源耗尽和浏览器 E2E 验证；
- 灰度开放手机号注册，先观察预算和误杀率再全量。

## 16. 上线前阻断项

以下任一项未完成不得上线真实登录注册：

- 未确认完整 EnvId、Provider 状态或真实 Publishable Key；
- GitHub Provider 路径未完成真实回调 PoC；
- PG 环境/RLS 未确认，或身份表可被其他用户读取；
- 浏览器可绕过网关无限发送 OTP，且没有平台硬配额/预算熔断；
- CLS 未启用，无法审计验证码和登录风险；
- 短信日预算、供应商费用告警或 Critical 接收人未配置；
- 路由守卫使用 `getLoginState()`/`getUser()` 代替真实 Session；
- 浏览器产物包含服务端 Secret；
- 未验证 `/repository/:id/tasks` 等深链登录后回跳；
- 仍保留 `admin/admin` 演示后门。

## 17. 后续独立专项

登录注册完成后再分别规划：

1. Dexie 本地数据与 CloudBase 云数据同步；
2. 多设备离线冲突解决；
3. 完整角色/权限与管理员后台；
4. 活跃设备管理、可信设备和 MFA；
5. 账户注销、数据导出和隐私合规；
6. 组织、团队和仓库级协作权限。

## 18. 参考依据

- CloudBase Web Auth：`https://docs.cloudbase.net/api-reference/webv2/initialization`
- CloudBase 验证码发送：`https://docs.cloudbase.net/http-api/auth/auth-send-verification`
- CloudBase 验证码校验：`https://docs.cloudbase.net/http-api/auth/auth-verify-verification`
- CloudBase 日志：`https://docs.cloudbase.net/logger/introduce`
- 项目架构：`docs/ARCHITECTURE.md`
- 项目 V3 规范：`docs/v3/STYLE_GUIDE.md`
- 当前演示认证规划：`docs/commit-homepage-concepts/auth-modal/plan.md`

本文阈值是保守的 Beta 初始值，不是 CloudBase 套餐承诺。实施阶段必须通过 MCP、目标环境、
当前 SDK 类型和短信供应商配置再次确认所有能力与限额。
