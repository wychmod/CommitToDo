# CloudBase Authentication Implementation Audit

审计基准：`cloudbase-authentication-plan.md`、`cloudbase-authentication-implementation-roadmap.md`（两份已归档至 `docs/archive/2026-07/`）、
CloudBase Web SDK `@cloudbase/js-sdk@3.6.3` 类型声明，以及 Cloud Functions 运行时规范。

本文件只记录仓库内可验证的事实。CloudBase 控制台状态、真实 EnvId、OAuth Client、PG 连接串、
短信/邮件供应商和告警收件人不写入仓库，必须按 `cloudbase-authentication-manual-setup-checklist.md`
在目标环境复核。

本次工作区未提供可用的 CloudBase 管理凭证/MCP 入口，因此没有执行云端写入、部署或权限变更。

## 结论

当前实现已经完成了类型边界、基础邮箱认证、Session 三态、OAuth state 存储、受保护路由、本地
principal 命名空间和认证网关代码骨架，但尚未达到路线图 P0-P9 的“可上线完成”条件。主要上线阻断项是：

- 目标环境的 Provider、Publishable Key、PG/RLS、函数权限和网关路由没有可提交的脱敏证据；
- 手机 OTP 路径尚未完成“不可绕过网关 + 供应商预算 + CAPTCHA + CloudBase Session”闭环，前端默认关闭；
- 账户绑定的最近 10 分钟重新认证、解绑和双账号合并证明尚未实现，后端接口 fail-closed；
- 安全通知 Worker 需要可信的 CloudBase 用户邮箱解析，不能把数据库中的掩码地址当收件地址；
- 未完成真实 Email/Phone/GitHub 浏览器 E2E、云端 RLS/告警验证和 `cloudbase-code-review`/`ops-inspector`；
- CloudBase HTTP API 用户查询基址、函数权限、Secrets、SMTP/SMS/CAPTCHA 仍需按人工清单配置并验证。
- 本地浏览器在未配置 `VITE_CLOUDBASE_ENV_ID` / Publishable Key 时访问 `/workspace` 会显示“会话初始化失败”；这是配置缺失的 fail-closed 表现，不应被当作已完成登录 E2E。

## 阶段状态

| 阶段 | 状态 | 仓库证据 | 剩余阻断 |
|---|---|---|---|
| P0 能力 PoC | 部分完成 | `@cloudbase/js-sdk@3.6.3` v3 类型已核对；新增 `.env.example`；可选 Provider 改为显式开关 | 目标 Env/Provider/SDK 实际调用、OTP 路径和 GitHub 回调仍需人工实测 |
| P1 资源准备 | 部分完成 | `cloudbase/migrations/20260720000001...007`、三个函数 | 云端状态、权限、Secrets、SMTP/SMS/CAPTCHA、CLS 未复核 |
| P2 Domain/Data | 部分完成 | `src/domain`、`src/application/usecases/auth`、DI、Repository 测试 | 真实 Gateway/PG 集成测试缺失 |
| P3 邮箱闭环 | 部分完成 | `auth-store`、邮箱登录/注册/两步验证码恢复、Session 刷新锁、状态订阅 | 真实邮箱验证码、跨标签页浏览器验证缺失 |
| P4 路由/本地隔离 | 部分完成 | `AuthenticatedRoute`、`PublicOnlyRoute`、namespace copy/verify 测试 | 深链、刷新、A/B 浏览器 E2E 尚未完成 |
| P5 手机 OTP | 阻断 | 网关具备 HMAC、幂等、多窗口配额、预算和 CAPTCHA 适配器 | CloudBase Session/Custom Ticket 路径未冻结；前端 `VITE_AUTH_PHONE_ENABLED=false` |
| P6 GitHub OAuth | 部分完成 | SDK state 保存、一次性消费、callback 校验和安全回跳 | Provider/回调白名单、PKCE/真实授权 E2E 未验证 |
| P7 账户安全 | 阻断 | 账户安全页面、身份列表、事件读取骨架 | Reauth、解绑、双账号证明未完成；绑定接口返回 `REAUTH_REQUIRED` |
| P8 通知/告警 | 部分完成 | 风险评估、Worker 原子抢占/重试/死信代码 | 真实收件地址解析、SMTP、CLS 告警收件人未配置/验证 |
| P9 发布加固 | 部分完成 | 删除运行时代码 demo store；新增敏感信息扫描规则、锁文件和部署模板 | E2E、CloudBase 巡检和大包拆分仍待处理 |

## 已修复的实现问题

- CloudBase 客户端惰性初始化，避免公开落地页在缺少运行时配置时导入即崩溃。
- 认证状态使用 `getSession()`，拒绝匿名 Session，并订阅 `onAuthStateChange`。
- OAuth 使用 SDK 返回的 state、固定 callback URL 和一次性 sessionStorage 记录；callback 失败不再误跳转。
- 邮箱重发不再提交空密码；密码注册本地校验统一为至少 12 位。
- `/login`、`/signup` 接入 guest-only 守卫；所有应用壳层和旧兼容路由接入认证守卫。
- Dexie 从单一 `commit-db` 改为 `commit-db-{principalId}` 命名空间，旧库复制后计数校验且保留原库。
- SessionRefreshLock 改为真正 single-flight，避免并发刷新顺序执行两次。
- Auth Gateway 增加增量迁移字段、HMAC pepper fail-closed、验证码哈希、幂等键、窗口限流、预算/CAPTCHA、真实 SMTP/SMS 适配和不记录验证码。
- Risk Evaluator/Notification Worker 不再关闭热实例全局 Pool；Worker 使用 `processing` lease、死信和 `SKIP LOCKED` 抢占，不向掩码地址投递。
- Auth Gateway 不再调用不存在的 `app.auth().verifyToken()`；受保护请求通过 CloudBase 官方 `/auth/v1/user/me` HTTP API 校验 Bearer access token，并只用返回的 `user_id/sub` 做主体映射。
- 根 `.gitignore` 增加 `.env`、证书、密钥和 secrets 目录规则，并提供不含真实值的环境变量模板。
- `cloudbaserc.example.json` 明确三个函数的目录、运行时、类型、资源和依赖安装策略；真实配置文件被忽略。

## 验证证据

- `npx tsc -b`：通过。
- 四个 Cloud Function 文件 `node --check`：通过。
- 新增核心/UseCase/Repository/路由测试：通过；全量 `51` 个测试文件、`289` 个用例通过。
- `npm run lint`：无 error，仍有 5 条既有 Fast Refresh warnings。
- `npm run build`：通过；Vite 仅提示入口包约 1.79 MB、gzip 493 KB，属于后续拆包优化项。
- `npm audit` 与三个函数 `npm audit --omit=dev`：均为 0 vulnerabilities。
- 浏览器回退验证：Playwright CLI 在本机通过 `npx` 运行；页面非空、桌面/390x844 移动端截图和密码找回校验交互通过，控制台无 error/warning；真实登录、受保护路由重定向因本地未配置 CloudBase 环境而未宣称通过。
- CloudBase RLS/Provider/函数权限/Secrets/CLS 与真实 Email/Phone/GitHub E2E：尚未完成，见人工清单。
