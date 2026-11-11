# CloudBase 认证体系 — 手动配置清单

> 环境：`committodo-d6gmapg0j6397889f`
> 生成时间：2026-07-20
> 自动执行部分已由 AI 通过 CloudBase MCP 完成；本文档记录**仍需要人工/控制台操作**的项目，以及已自动完成的对照，便于核查。

---

## ✅ 已自动完成（无需手动）

| # | 事项 | 结果 |
|---|------|------|
| 1 | 应用 6 个 PG 迁移（001~006） | 成功。版本号 `20260720000001`~`20260720000006`，本地文件已重命名为 `14位时间戳_名称.sql` 以匹配工具约定 |
| 2 | 建表 + RLS + GRANT | 9 张 `public` 表全部就位（`principals`/`auth_subjects`/`user_identities`/`verification_challenges`/`auth_rate_limits`/`account_merge_requests`/`auth_security_events`/`security_notification_outbox`/`auth_schema_version`）；4 张受保护表 RLS 已 `ENABLE`；`authenticated` / `service_role` 角色 GRANT 通过 |
| 3 | 迁移自检 | `auth_schema_version.version = 6`，006 的约束自检通过 |
| 4 | 注册 3 个云函数 | `auth-gateway`(HTTP)、`auth-risk-evaluator`(Event)、`security-notification-worker`(Event) 均 `Active` |
| 5 | 定时触发器 | `auth-risk-evaluator` 每 5 分钟、``security-notification-worker`` 每 1 分钟 |
| 6 | 网关访问入口 | `auth-gateway` 已创建 HTTP 访问入口，路径 `/auth-gateway`，网关层 `auth=false`，APIId `7b579f70-6fc3-44f2-8244-99f91cf0151f` |
| 7 | 登录方式 / Provider | 已就绪，无需操作：`usernamePassword=true`、`email=true`、`phone=true`；Provider `github`(OAuth 已配置)、`email` 均为 `On` |

---

## 🔧 必须手动（阻塞"跑通"）

### 1. 给 `auth-gateway` 设置 `PG_CONNECTION_STRING` 环境变量  ⛔ 最高优先
- **原因**：`auth-gateway` 用直连 `pg`（`db.js` 读 `process.env.PG_CONNECTION_STRING`，备选 `AUTH_PG_CONNECTION_STRING` / `DATABASE_URL`）。没有它，函数能启动但所有数据库操作失败（`/health` 返回 `db:false`）。
- **取值**：CloudBase 控制台 → **PostgreSQL** → 连接信息 → 复制连接串（含用户/密码/库名）。建议使用 `service_role` / 管理员级连接串，以匹配 005 迁移里对 `service_role` 的 `GRANT ALL`。
- **配置位置**：云函数 `auth-gateway` → **函数配置 / 环境变量** → 新增 `PG_CONNECTION_STRING`。
- 可选同批设置：
  - `AUTH_CHALLENGE_PEPPER`（默认已是 `dev-challenge-pepper`，生产请换随机值）
  - `AUTH_ALLOWED_ORIGINS`（CORS 白名单，逗号分隔；留空默认 `*`）
  - `TCB_ENV_ID` 已自动设为 `committodo-d6gmapg0j6397889f`

### 2. 放开 `auth-gateway` 的函数调用权限  ⛔ 高优先
- **原因**：网关入口 `auth=false` **不等于**函数允许匿名调用。CloudBase 函数默认权限通常仅管理员可调用，Web 端在登录前就要打 `/v1/auth/challenges`，必须允许匿名/浏览器调用。
- **注意**：`auth-gateway` 内部已做端点级鉴权（`verifySession` 保护非公开端点），因此放开函数级调用是安全的。
- **配置位置**：控制台 → **云函数** → `auth-gateway` → **权限配置** → 将调用权限设为「所有用户」/允许匿名调用。
- **MCP 限制**：`queryPermissions` / `managePermissions` 在 PG 环境下报 "does not support PostgreSQL type environments"，故本项无法通过 MCP 完成，需控制台手动配置。

### 3. 等待路由生效并验证网关健康检查
- 网关入口创建后通常需 **30 秒 ~ 3 分钟** 传播。
- 验证：`GET <网关域名>/auth-gateway/health`，期望返回
  ```json
  { "ok": true, "env": "configured", "db": true }
  ```
  （`db` 在步骤 1 完成后才变 `true`）。
- 网关域名可通过控制台 → 云函数 `auth-gateway` → 访问入口查看，或用 `queryGateway(action="getAccess")` 查询。

---

## 📨 业务依赖（按需）

### 4. 配置 OTP 实际下发通道（短信 / 邮件）
- `auth-gateway` 只**生成并校验**验证码（`verification_challenges`），真正的"发送"依赖外部通道：
  - **手机号 OTP** → 腾讯云短信 SMS（需配置签名/模板/密钥）。
  - **邮箱 OTP** → SMTP（当前 `email` provider 的 `SmtpConfig` 中 `ServerHost` 为空，需填）。
- 未配置时，注册/登录流程能走到"请求验证码"但用户收不到码。

### 5. （可选）绑定自定义域名 + SSL
- 生产环境用自有域名 HTTPS 访问 `auth-gateway`：`manageGateway(action="bindCustomDomain", domain=..., certificateId=...)`。
- 需要域名 + 已签发证书 ID，属人工资产，未自动处理。

---

## 🧩 代码侧待办（非配置）

### 6. 实现两个定时函数的真实逻辑
- `auth-risk-evaluator` 与 `security-notification-worker` 目前是 **TODO 空壳**（`exports.main` 直接 `return {ok:true}`，不做任何事）。
- 已按设计注册并挂上定时器，但风险评估、通知投递逻辑需在 `web/cloudfunctions/*/index.js` 中补全。

### 7. Web 端联调登录
- 完成 1~4 后，在 Web 应用用 Web SDK 验证：`auth.signInWithPassword({ username|email|phone, password })`（SDK 风格为 supabase-like）。
- 登录后调用 `POST /auth-gateway/profile/bootstrap` 创建 `principal` + `auth_subject` 映射（由 `current_principal_id()` 经 JWT `sub` 关联）。

---

## ⚠️ 备注
- **迁移历史元数据差异**：`listMigrations` 仅回显 1 条（服务端时间戳版本），但数据库实际已完整应用 6 个迁移（已用 `auth_schema_version` 与 RLS 状态交叉验证）。此为控制表呈现差异，**不影响功能**，无需处理。后续重跑 `applyMigration` 时 SQL 均为 `IF NOT EXISTS` / `CREATE OR REPLACE`，天然幂等。
- 迁移本地文件名已改为 `20260720000001_auth_principals.sql` … `20260720000006_auth_seed_and_verification.sql`，与 `applyMigration` 工具约定一致。
