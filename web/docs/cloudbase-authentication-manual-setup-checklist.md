# CloudBase 认证体系 — 手动配置清单

> 环境：请在本地/控制台填入目标 CloudBase EnvId；仓库不记录真实 EnvId。
> 生成时间：2026-07-20
> 自动执行部分已由 AI 通过 CloudBase MCP 完成；本文档记录**仍需要人工/控制台操作**的项目，以及已自动完成的对照，便于核查。

---

## ✅ 已自动完成（无需手动）

| # | 事项 | 结果 |
|---|------|------|
| 1 | 应用 7 个 PG 迁移（001~007） | 仓库包含 001~007；目标环境必须幂等应用 007 并复核实际列、索引、约束 |
| 2 | 建表 + RLS + GRANT | 9 张 `public` 表全部就位（`principals`/`auth_subjects`/`user_identities`/`verification_challenges`/`auth_rate_limits`/`account_merge_requests`/`auth_security_events`/`security_notification_outbox`/`auth_schema_version`）；4 张受保护表 RLS 已 `ENABLE`；`authenticated` / `service_role` 角色 GRANT 通过 |
| 3 | 迁移自检 | 代码侧迁移与自检 SQL 已补齐；目标环境版本号和约束仍需复核 |
| 4 | 注册 3 个云函数 | 代码已具备 HTTP/Event 运行时形状；云端 Active 状态需用目标 EnvId 重新核验 |
| 5 | 定时触发器 | `auth-risk-evaluator` 每 5 分钟、``security-notification-worker`` 每 1 分钟 |
| 6 | 网关访问入口 | 入口路径约定为 `/auth-gateway`；域名/API ID 不写入仓库，需在控制台或 MCP 重新核验 |
| 7 | 登录方式 / Provider | 仓库默认只开启邮箱密码；Phone/GitHub 均需目标环境按清单验证后显式开启 |

---

## 🔧 必须手动（阻塞"跑通"）

### 1. 给三个函数设置服务端环境变量  ⛔ 最高优先
- **原因**：三个函数都直连 PostgreSQL；缺少连接串或 HMAC pepper 时会 fail-closed，认证数据不会被处理。
- **取值**：CloudBase 控制台 → **PostgreSQL** → 连接信息 → 复制连接串（含用户/密码/库名）。建议使用 `service_role` / 管理员级连接串，以匹配 005 迁移里对 `service_role` 的 `GRANT ALL`。
- **配置位置**：三个云函数 → **函数配置 / 环境变量**。
- 必填：`PG_CONNECTION_STRING`、`TCB_ENV_ID`、`AUTH_HMAC_PEPPER`、`AUTH_CHALLENGE_PEPPER`。
- `auth-gateway` 还需：`AUTH_CLOUDBASE_AUTH_API_BASE_URL`（目标环境 HTTP API 基址，例如 `https://<env-id>.api.tcloudbasegateway.com`）。网关通过官方 `GET /auth/v1/user/me` 校验 Bearer access token，不在函数内自行解析 JWT。
- `auth-gateway` 还需：`AUTH_ALLOWED_ORIGINS`（逗号分隔的 HTTPS 白名单；不要生产使用 `*`）、`AUTH_SMS_DAILY_BUDGET`。
- 短信通道还需：`TENCENTCLOUD_SECRET_ID`、`TENCENTCLOUD_SECRET_KEY`、`AUTH_SMS_REGION`、`AUTH_SMS_SDK_APP_ID`、`AUTH_SMS_SIGN_NAME`、`AUTH_SMS_TEMPLATE_ID`；临时凭据另配置 `TENCENTCLOUD_SESSION_TOKEN`。
- 邮件通道还需：`SMTP_HOST`、`SMTP_PORT`、`SMTP_SECURE`、`SMTP_FROM`，以及 SMTP 用户名/密码（如供应商要求）。
- CAPTCHA 触发后还需：`AUTH_CAPTCHA_VERIFY_URL`、`AUTH_CAPTCHA_VERIFY_TOKEN`。
- 所有值只写入 CloudBase Secret/函数环境变量，不写入 Vite 变量、源码、日志或仓库。

### 1.1 配置 Web 构建环境变量  ⛔ 最高优先
- 从 `web/.env.example` 创建部署环境配置，填写 `VITE_CLOUDBASE_ENV_ID`、`VITE_CLOUDBASE_REGION`、`VITE_CLOUDBASE_PUBLISHABLE_KEY`、`VITE_AUTH_GATEWAY_URL`。
- `VITE_AUTH_PHONE_ENABLED` 与 `VITE_AUTH_GITHUB_ENABLED` 都默认关闭，只有对应 Provider、回调白名单、预算/CAPTCHA 和真实 E2E 通过后才显式设置为 `true`。
- 未配置 CloudBase EnvId/Publishable Key 时，公开落地页可加载，但受保护路由会显示会话初始化失败；这不代表登录链路已通过。

### 2. 放开 `auth-gateway` 的函数调用权限  ⛔ 高优先
- **原因**：网关入口 `auth=false` **不等于**函数允许匿名调用。CloudBase 函数默认权限通常仅管理员可调用，Web 端在登录前就要打 `/v1/auth/challenges`，必须允许匿名/浏览器调用。
- **注意**：`auth-gateway` 内部已做端点级鉴权（`verifySession` 保护非公开端点），因此放开函数级调用是安全的。
- **配置位置**：控制台 → **云函数** → `auth-gateway` → **权限配置** → 将调用权限设为「所有用户」/允许匿名调用。
- **MCP 限制**：`queryPermissions` / `managePermissions` 在 PG 环境下报 "does not support PostgreSQL type environments"，故本项无法通过 MCP 完成，需控制台手动配置。

### 3. 应用增量迁移并复核
- 应用 `cloudbase/migrations/20260721000007_auth_runtime_hardening.sql`。
- 必须确认 `verification_challenges.code_hash`、`idempotency_key`、`updated_at` 和 outbox `processing_at` 已存在。
- 必须确认 outbox 支持 `processing` / `dead_letter` 状态；不要用破坏性 reset。

### 4. 等待路由生效并验证网关健康检查
- 网关入口创建后通常需 **30 秒 ~ 3 分钟** 传播。
- 验证：`GET <网关域名>/auth-gateway/health`，期望返回
  ```json
  { "ok": true, "env": "configured", "db": true }
  ```
  （`db` 在步骤 1 完成后才变 `true`）。
- 网关域名可通过控制台 → 云函数 `auth-gateway` → 访问入口查看，或用 `queryGateway(action="getAccess")` 查询。

### 4.1 函数部署配置
- 复制 `cloudbaserc.example.json` 为本地未提交的 `cloudbaserc.json`，填入目标 EnvId；该文件已被 `.gitignore` 忽略。
- 使用 CLI/MCP 部署前先执行 dry-run，并确认 HTTP 函数包含 `scf_bootstrap`、Node 18 运行时、9000 端口和依赖安装；不要把 `node_modules` 提交到 Git。

---

## 📨 业务依赖（按需）

### 5. 配置 OTP 实际下发通道（短信 / 邮件）
- `auth-gateway` 只**生成并校验**验证码（`verification_challenges`），真正的"发送"依赖外部通道：
  - **手机号 OTP** → 腾讯云短信 SMS（需配置签名/模板/密钥）。
  - **邮箱 OTP** → SMTP（当前 `email` provider 的 `SmtpConfig` 中 `ServerHost` 为空，需填）。
- 未配置时，注册/登录流程能走到"请求验证码"但用户收不到码。

### 6. （可选）绑定自定义域名 + SSL
- 生产环境用自有域名 HTTPS 访问 `auth-gateway`：`manageGateway(action="bindCustomDomain", domain=..., certificateId=...)`。
- 需要域名 + 已签发证书 ID，属人工资产，未自动处理。

---

## 🧩 代码侧待办（非配置）

### 7. 核验两个定时函数的生产依赖
- `auth-risk-evaluator` 已实现预算、失败率和 IP/设备聚合；需配置 PG、定时器并验证 CLS 告警。
- `security-notification-worker` 已实现 outbox 原子抢占、重试和死信；仍需配置真实收件地址解析、SMTP 和 Critical/Warning 接收人。
- Worker 不会向 `a***e@example.com` 这类掩码地址发送邮件；必须提供受信任的 CloudBase 用户邮箱解析方案并在配置后做端到端验证。

### 8. Web 端联调登录
- 完成 1~4 后，在 Web 应用用 Web SDK 验证：`auth.signInWithPassword({ username|email|phone, password })`（SDK 风格为 supabase-like）。
- 登录后调用 `POST /auth-gateway/profile/bootstrap` 创建 `principal` + `auth_subject` 映射（由 CloudBase `/auth/v1/user/me` 返回的 `user_id/sub` 关联）。

### 9. 手机和绑定功能开关
- `VITE_AUTH_PHONE_ENABLED` 默认必须为 `false`；只有完成 P0 OTP 路径、短信预算、CAPTCHA 和真实投递验证后，才在部署环境设置为 `true`。
- 手机号绑定还要求后端完成最近 10 分钟 reauthentication ticket；当前未完成前不可在生产开启绑定入口。
- `VITE_AUTH_GITHUB_ENABLED` 只有在 GitHub Provider、回调白名单和真实 callback E2E 通过后才保持开启。

---

## ⚠️ 备注
- 当前代码审计环境未提供可用的目标 EnvId/CloudBase 管理凭证，因此未执行任何云端写入或部署；以下人工配置与复核项是有意保留的安全边界。
- **迁移历史元数据差异**：`listMigrations` 可能只回显服务端版本；必须用 `auth_schema_version`、列/索引、RLS 和 007 状态查询交叉验证，不能仅凭列表宣称完成。
- 迁移文件均使用时间戳前缀；重新应用前执行 dry-run/plan，禁止 reset 或删除用户数据。
