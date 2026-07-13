# CommitToDo 首页模拟认证弹窗 Tasks

> 状态：已批准（2026-07-13，用户明确回复“批准 task”）
>
> 文档阶段：3 / 4（任务拆解）
>
> 需求基线：`./spec.md`（已批准）
>
> 技术基线：`./plan.md`（已批准）
>
> 约束：本文件批准后生成 `checklist.md`；四份文档全部批准前不得执行实现任务。

---

## 1. 执行规则

1. 严格按依赖顺序执行，不得跳过测试任务直接实现。
2. 每个任务开始前重读目标文件，保留用户现有未提交改动。
3. 每个任务完成后立即执行其“验证”，失败时不进入依赖任务。
4. 不新增 npm 依赖，不修改 Domain、Application、Data、DI 或 Dexie schema。
5. 不修改 `landing-page.tsx`、`landing-theme.css`、Hero、WorkbenchPreview、
   ValueSection 和 BottomCta。
6. 唯一允许修改的既有 Landing 文件是
   `landing/components/landing-header-actions.tsx` 及其测试。
7. 所有新增颜色必须来自 `--v3-*`，所有按钮图标使用 Lucide。
8. 不提交密码、Token、OAuth 配置或任何网络认证调用。

---

## 2. 文件清单

### 2.1 新增文件

| 文件 | 职责 |
| --- | --- |
| `src/presentation/screens/auth/auth-types.ts` | 认证视图、会话、输入、结果和错误类型 |
| `src/presentation/screens/auth/auth-constants.ts` | admin 演示常量、storage key、delay |
| `src/presentation/screens/auth/auth-validation.ts` | 登录和注册纯校验函数 |
| `src/presentation/screens/auth/auth-validation.test.ts` | 校验规则和首错字段测试 |
| `src/presentation/stores/auth-session-storage.ts` | local/session 双存储适配器 |
| `src/presentation/stores/auth-session-storage.test.ts` | schema、写入、损坏记录和密码排除测试 |
| `src/presentation/stores/demo-auth-store.ts` | Zustand 模拟认证 Store |
| `src/presentation/stores/demo-auth-store.test.ts` | 登录、模拟操作、持久化和退出测试 |
| `src/presentation/screens/auth/auth-brand-header.tsx` | 弹窗品牌栏 |
| `src/presentation/screens/auth/auth-branch-visual.tsx` | 装饰性 Git 分支 SVG |
| `src/presentation/screens/auth/auth-trust-note.tsx` | local-first 可信说明 |
| `src/presentation/screens/auth/auth-field.tsx` | 标签、图标、输入和错误组合 |
| `src/presentation/screens/auth/auth-tabs.tsx` | 登录/注册语义 Tab |
| `src/presentation/screens/auth/login-form.tsx` | 登录、记住我和 GitHub 模拟入口 |
| `src/presentation/screens/auth/signup-form.tsx` | 注册校验与模拟流程 |
| `src/presentation/screens/auth/forgot-password-view.tsx` | 演示账号恢复流程 |
| `src/presentation/screens/auth/auth-dialog.tsx` | Radix Dialog 编排和视图同步 |
| `src/presentation/screens/auth/auth-dialog.test.tsx` | 弹窗完整行为和无障碍测试 |
| `src/presentation/screens/auth/auth-modal.css` | 遮罩、响应式、动效、safe-area |
| `src/presentation/screens/auth/landing-auth-layout.tsx` | 共享首页父布局和路径映射 |
| `src/presentation/screens/auth/landing-auth-layout.test.tsx` | 路由、关闭、重定向和持续挂载测试 |
| `src/presentation/components/v3/v3-user-menu.tsx` | Guest/admin 用户菜单 |
| `src/presentation/components/v3/v3-user-menu.test.tsx` | 登录入口、账号展示和退出测试 |

### 2.2 修改文件

| 文件 | 改动 |
| --- | --- |
| `src/app.tsx` | 将 `/`、`/login`、`/signup` 接入共享父布局 |
| `src/presentation/screens/landing/components/landing-header-actions.tsx` | 登录入口改为认证路由，已登录显示工作台 |
| `src/presentation/screens/landing/components/landing-header.test.tsx` | 更新登录/开始使用行为测试 |
| `src/presentation/components/v3/v3-top-command-bar.tsx` | 移除内嵌 UserMenu，使用 V3UserMenu |
| `src/presentation/components/v3/v3-app-shell.test.tsx` | 增加 auth store mock，保持壳层测试稳定 |
| `src/presentation/components/v3/index.ts` | 仅在外部确实需要时导出 V3UserMenu |
| `src/test/setup.ts` | 仅在 jsdom 缺失 API 时补最小 mock |

### 2.3 明确不修改

- `src/main.tsx`
- `src/presentation/screens/landing/landing-page.tsx`
- `src/presentation/screens/landing/landing-theme.css`
- `src/presentation/screens/landing/components/hero/**`
- `src/presentation/screens/landing/components/workbench/**`
- `src/domain/**`、`src/application/**`、`src/data/**`
- `src/core/di/injection-container.ts`

---

## 3. 有序任务

## T01：建立工作区差异基线

**文件：** 无代码写入

**依赖：** 无

**步骤：**

1. 执行 `git status --short`，记录已有修改和新增文件。
2. 执行 `git diff -- src/app.tsx src/presentation/screens/landing/components/landing-header-actions.tsx src/presentation/components/v3/v3-top-command-bar.tsx`。
3. 确认这些文件当前内容与 Plan 假设一致；若已有用户改动，标注需要增量合并的位置。
4. 确认 `@radix-ui/react-dialog`、`zustand`、`react-router-dom`、`lucide-react` 已存在，禁止安装新包。

**验证：** 输出一份简短基线记录；没有执行 reset、checkout、clean 或覆盖操作。

---

## T02：创建认证类型契约

**文件：** `src/presentation/screens/auth/auth-types.ts`

**依赖：** T01

**步骤：**

1. 定义 `AuthView`、`DemoAuthProvider`、`DemoAuthUser`、`DemoAuthSession`。
2. 定义 `AuthOperation`、`AuthErrorCode`、`DemoAuthState`。
3. 定义 `DemoSignInInput`、`DemoAuthResult`、`DemoRegistrationResult`、
   `DemoRecoveryResult`。
4. 定义 Login/Signup values 和 errors。
5. 定义 `selectIsAuthenticated(state)`，只从 session 派生登录态。
6. 不在 session 或结果成功数据中添加 password/token 字段。

**验证：** `npx tsc -b`；类型文件无 unused export 和 strict error。

---

## T03：创建演示认证常量

**文件：** `src/presentation/screens/auth/auth-constants.ts`

**依赖：** T02

**步骤：**

1. 定义 `demoAuthUsername = 'admin' as const`。
2. 定义 `demoAuthPassword = 'admin' as const`。
3. 定义 session version、storage key 和 `demoAuthDelayMs = 450`。
4. 使用 camelCase，避免全大写常量。
5. 添加简短注释说明凭据仅用于 UI 演示，不是安全秘密。

**验证：** `npx tsc -b`；`rg -n "admin|demoAuth"` 能定位所有演示常量且没有重复定义。

---

## T04：先写表单校验测试

**文件：** `src/presentation/screens/auth/auth-validation.test.ts`

**依赖：** T02

**步骤：**

1. 用 AAA 模式覆盖登录空账号、空密码、两者为空。
2. 覆盖账号 trim 后为空。
3. 覆盖注册账号为空、密码为空、密码少于 5 位。
4. 覆盖确认密码为空和不一致。
5. 覆盖未勾协议。
6. 覆盖合法注册返回空错误对象。
7. 覆盖 login/signup 首错误字段的固定顺序。

**验证：** 单独运行该测试，预期因实现文件缺失或未实现而失败；确认失败原因与测试目标一致。

---

## T05：实现表单校验纯函数

**文件：** `src/presentation/screens/auth/auth-validation.ts`

**依赖：** T04

**步骤：**

1. 实现 `validateLoginForm`。
2. 实现 `validateSignupForm`。
3. 实现 `firstLoginErrorField` 和 `firstSignupErrorField`。
4. 登录只做必填校验，不在这里比较 admin/admin。
5. 注册不做邮箱、唯一性或真实账号校验。
6. 返回新对象，不修改传入 values。

**验证：** `npm test -- auth-validation.test.ts`，所有校验测试通过。

---

## T06：先写会话存储测试

**文件：** `src/presentation/stores/auth-session-storage.test.ts`

**依赖：** T02、T03

**步骤：**

1. 每个测试前清理 localStorage 和 sessionStorage 的 auth key。
2. 覆盖合法 session schema。
3. 覆盖错误 version、非 admin 用户、错误 provider、无效日期。
4. 覆盖 local 持久化只写 localStorage。
5. 覆盖 session 持久化只写 sessionStorage。
6. 覆盖每次写入前清理另一处旧记录。
7. 覆盖损坏 JSON 被删除并返回 null。
8. 覆盖 setItem 抛错时返回 unavailable。
9. 断言序列化结果不包含 `password`、`token`、`refreshToken`。
10. 断言 clear 不删除无关 key。

**验证：** 单独运行测试，预期先失败；失败必须来自待实现的存储函数。

---

## T07：实现双 Storage 适配器

**文件：** `src/presentation/stores/auth-session-storage.ts`

**依赖：** T06

**步骤：**

1. 实现 `isDemoAuthSession(value: unknown)`，逐字段收窄。
2. 实现安全 JSON 解析，不使用 `any`。
3. 实现 sessionStorage 优先、localStorage 次之的读取。
4. 发现损坏或旧版本记录时只删除 auth key。
5. 实现写前双清理，再按 persistence 写单一 storage。
6. 捕获 Web Storage 异常并返回 unavailable。
7. 实现双 storage clear，错误不向外抛出。
8. 对 `window` 不可用环境返回安全结果。

**验证：** `npm test -- auth-session-storage.test.ts`；所有测试通过。

---

## T08：先写 Demo Auth Store 测试

**文件：** `src/presentation/stores/demo-auth-store.test.ts`

**依赖：** T02、T03、T07

**步骤：**

1. 用 fake timers 覆盖 450ms operation 生命周期。
2. 覆盖从合法 local/session 记录初始化 session。
3. 覆盖 admin/admin 登录成功和 provider=credentials。
4. 覆盖用户名首尾空格可 trim，密码不 trim。
5. 覆盖错误账号或密码返回 invalid-credentials，session 为空。
6. 覆盖 remember true/false 的 persistence。
7. 覆盖 storage unavailable 返回 success + warning，并保留内存 session。
8. 覆盖 GitHub 模拟 provider=github。
9. 覆盖 registration/recovery 不创建 session。
10. 覆盖异常时 operation 最终复位。
11. 覆盖 signOut 清 session 和 auth storage。
12. 覆盖 selector 只根据 session 派生。

**验证：** 单独运行测试，预期先失败；测试不使用真实 450ms 等待。

---

## T09：实现 Demo Auth Store

**文件：** `src/presentation/stores/demo-auth-store.ts`

**依赖：** T08

**步骤：**

1. 使用 `create<DemoAuthState>()` 创建 Store。
2. 初始 session 同步读取 storage。
3. 实现统一 `waitForDemoAuth()`，使用 delay 常量。
4. 实现 signIn，账号 trim、密码不 trim。
5. 实现 success warning 和 invalid credentials 结果。
6. 实现 signInWithGithub。
7. 实现 simulateRegistration 和 simulateRecovery。
8. 所有 async action 用 try/finally 复位 operation。
9. 实现 clearError 和 signOut。
10. 不调用 fetch、window.open、DI 或 IndexedDB。

**验证：** `npm test -- demo-auth-store.test.ts`，随后运行 `npx tsc -b`。

---

## T10：创建认证自包含样式骨架

**文件：** `src/presentation/screens/auth/auth-modal.css`

**依赖：** T03

**步骤：**

1. 定义 overlay 的固定定位、60% 遮罩、滚动容器和 z-index。
2. 定义 desktop content：488px、max-width、max-height、8px Token 圆角和面板阴影。
3. 定义 open/closed opacity + 8px translateY 动画。
4. 定义 `<768px` 全屏 content、100dvh、无圆角、safe-area。
5. 定义 branch visual 一次淡入和 loading spinner。
6. 添加 `prefers-reduced-motion` 覆盖。
7. 所有颜色、圆角、阴影引用 V3 Token，不写页面私有 hex。

**验证：** `rg -n "#[0-9a-fA-F]" auth-modal.css` 无结果；`npm run lint` 不因 CSS import 失败。

---

## T11：实现品牌栏与可信说明

**文件：**

- `src/presentation/screens/auth/auth-brand-header.tsx`
- `src/presentation/screens/auth/auth-trust-note.tsx`

**依赖：** T02、T10

**步骤：**

1. 品牌栏使用白色 32px 方块、Lucide GitBranch 和 `CommitToDo`。
2. 品牌组件不包含 link/button，不增加焦点项。
3. 可信说明使用 ShieldCheck、绿色状态点和批准文案。
4. 图标统一 16px、strokeWidth 1.5、`aria-hidden`。
5. 组件显式返回 `JSX.Element`。

**验证：** `npx tsc -b`；渲染时品牌文字和可信说明可由文本查询定位。

---

## T12：实现装饰性分支视觉

**文件：** `src/presentation/screens/auth/auth-branch-visual.tsx`

**依赖：** T10

**步骤：**

1. 创建稳定 viewBox 的 inline SVG，高度 44-48px。
2. 绘制主绿、青色和中性三条分支路径。
3. 添加 6-10 个节点和右侧提交勾节点。
4. 所有 stroke/fill 使用 `var(--v3-*)`。
5. 标记 `aria-hidden="true"`、`focusable="false"`。
6. 不复制首页粒子 canvas，不使用 SMIL 或无限动画。

**验证：** `npx tsc -b`；检查 SVG 无裸 hex、无交互焦点、无外部图片依赖。

---

## T13：实现 AuthField

**文件：** `src/presentation/screens/auth/auth-field.tsx`

**依赖：** T02、T10

**步骤：**

1. 按 Plan 定义 `AuthFieldProps`，继承 input attributes 并排除冲突字段。
2. 关联 label、input、error id。
3. 支持 Lucide 左图标和可选 trailing action。
4. error 时设置 `aria-invalid`、`aria-describedby` 和 danger 样式。
5. 输入容器高 48px，右动作命中区至少 40px。
6. 支持 ref 转发，供首错字段聚焦。

**验证：** 增加临时或后续 Dialog 测试前先运行 `npx tsc -b`；无 ref 类型错误。

---

## T14：实现 AuthTabs

**文件：** `src/presentation/screens/auth/auth-tabs.tsx`

**依赖：** T02、T10

**步骤：**

1. 实现 login/signup 两个 Tab 和 Plan 接口。
2. 添加 tablist、tab、aria-selected 和 roving tabIndex。
3. 点击触发 onChange。
4. ArrowLeft/ArrowRight 切换；Enter/Space 激活。
5. 当前项使用绿色文字和 2px 底线，不使用胶囊背景。
6. disabled/operation 时阻止重复切换。

**验证：** 用 Testing Library 在 `auth-dialog.test.tsx` 前置小节覆盖点击和方向键；单测通过。

---

## T15：实现 LoginForm 基础结构

**文件：** `src/presentation/screens/auth/login-form.tsx`

**依赖：** T05、T09、T13、T14

**步骤：**

1. 建立 username、password、remember、showPassword、errors 本地状态。
2. 使用 AuthField 渲染账号和密码。
3. 密码按钮切换 text/password，保持 accessible name。
4. 渲染默认勾选“记住我”和“忘记密码”。
5. 渲染主登录按钮、分隔线、GitHub 描边按钮和注册链接。
6. 设置 username/current-password autocomplete。
7. usernamePreset 改变时只更新账号，不预填密码。

**验证：** `npx tsc -b`；组件渲染包含账号、密码、记住我、忘记、登录、GitHub、注册入口。

---

## T16：接通 LoginForm 校验与凭据登录

**文件：** `src/presentation/screens/auth/login-form.tsx`

**依赖：** T15

**步骤：**

1. submit 时运行 validateLoginForm。
2. 聚焦首个字段错误。
3. 调用 onSubmit 并映射 invalid credentials form error。
4. 账号或密码变化时清理对应错误和 auth error。
5. operation=login 时显示 loading 文案并禁用提交相关控件。
6. success warning 显示非阻断持久化提示。
7. success 调用 onAuthenticated，不在表单内直接 navigate。

**验证：** 新增行为测试覆盖空值、wrong/wrong、admin/admin、loading、错误清除；测试通过。

---

## T17：接通 GitHub 模拟登录

**文件：** `src/presentation/screens/auth/login-form.tsx`

**依赖：** T16

**步骤：**

1. GitHub 点击调用 onGithub，并传当前 remember。
2. operation=github 时只显示 GitHub loading 文案。
3. 防止登录按钮和 GitHub 按钮并发提交。
4. 成功显示“GitHub 演示登录成功”并调用 onAuthenticated。
5. 确认实现没有 window.open、fetch 或外链导航。

**验证：** fake timers 推进后成功回调一次；`rg -n "window.open|fetch\(" login-form.tsx` 无结果。

---

## T18：实现 SignupForm

**文件：** `src/presentation/screens/auth/signup-form.tsx`

**依赖：** T05、T09、T13

**步骤：**

1. 建立 username/password/confirm/accepted/errors 状态。
2. 使用 AuthField 渲染三个输入。
3. 两个密码分别支持可见性切换。
4. 渲染协议复选框、主按钮和返回登录入口。
5. submit 运行 validateSignupForm 并聚焦首错字段。
6. operation=signup 显示 loading。
7. 成功清空密码并调用 onCompleted('admin')。
8. 不把注册 values 写入 Store 或 storage。

**验证：** 测试必填、短密码、不一致、未勾协议、有效完成；storage 中无注册输入。

---

## T19：实现 ForgotPasswordView

**文件：** `src/presentation/screens/auth/forgot-password-view.tsx`

**依赖：** T09、T10

**步骤：**

1. 显示演示说明和等宽 `admin / admin`。
2. 渲染“恢复演示账号”和“返回登录”。
3. operation=recovery 时显示 loading 并防重复。
4. success 调用 onRecovered('admin')。
5. 不显示邮件发送、验证码或网络状态。

**验证：** 组件测试点击恢复后调用 onRecover/onRecovered；返回按钮调用 onBack。

---

## T20：先写 AuthDialog 结构测试

**文件：** `src/presentation/screens/auth/auth-dialog.test.tsx`

**依赖：** T11-T19

**步骤：**

1. 渲染 controlled open login Dialog。
2. 断言 dialog、动态 title、description、品牌、分支视觉、trust note。
3. 断言登录 Tab selected、注册 Tab 未选。
4. 断言关闭按钮调用 onOpenChange(false)。
5. 断言 login/signup Tab 调用对应导航回调。
6. 断言 aria modal、title、description 关联存在。

**验证：** 单独运行，预期因 AuthDialog 未实现失败；失败与缺失组件一致。

---

## T21：实现 AuthDialog Radix 外壳

**文件：** `src/presentation/screens/auth/auth-dialog.tsx`

**依赖：** T20

**步骤：**

1. 导入 v3-tokens 和 auth-modal.css。
2. 实现 controlled Dialog.Root、Portal、scrollable Overlay、Content。
3. 组合品牌栏、分支视觉、动态 Title/Description、关闭按钮、可信说明。
4. routeMode=login/signup 时渲染正确 Tabs 和表单。
5. 设置 modal、open、onOpenChange。
6. 关闭按钮 aria-label 为“关闭登录与注册”。
7. 不在 Dialog 中复制 Landing DOM。

**验证：** T20 结构测试通过；`npx tsc -b` 通过。

---

## T22：实现 AuthDialog 视图同步和通知

**文件：** `src/presentation/screens/auth/auth-dialog.tsx`

**依赖：** T21

**步骤：**

1. 添加 localView、usernamePreset、notice。
2. routeMode 变化时同步视图并清除旧密码相关状态。
3. forgot 入口切 localView，不改变 URL。
4. recovery success 回 login，预填 admin，显示恢复 notice。
5. signup success 调 onNavigateLogin，预填 admin，显示注册 notice。
6. 从 Store 用 selector 获取 operation/actions/error。
7. 认证成功显示短暂状态后调用 onAuthenticated。
8. close/reopen 不保留错误或密码。

**验证：** Dialog 测试覆盖 signup、forgot、notice、preset 和 reopen reset；通过。

---

## T23：实现 Dialog 焦点与键盘行为

**文件：**

- `src/presentation/screens/auth/auth-dialog.tsx`
- `src/presentation/screens/auth/auth-dialog.test.tsx`

**依赖：** T22

**步骤：**

1. onOpenAutoFocus 聚焦当前视图首字段。
2. onCloseAutoFocus 聚焦 `#landing-login-trigger`。
3. 验证 Radix Tab focus trap。
4. Escape 触发关闭回调。
5. Enter 提交当前 form。
6. live region 宣告错误、warning、success。
7. 关闭按钮在 loading 时仍可操作。

**验证：** 使用 userEvent.tab/keyboard 测试焦点顺序、Escape、Enter 和焦点恢复。

---

## T24：先写 LandingAuthLayout 路由测试

**文件：** `src/presentation/screens/auth/landing-auth-layout.test.tsx`

**依赖：** T21

**步骤：**

1. Mock LandingPage 并记录 mount 次数。
2. `/` 断言 Dialog 关闭。
3. `/login` 断言 login Dialog。
4. `/signup` 断言 signup Dialog。
5. 关闭断言 replace 到 `/`。
6. Tab 切换断言 pathname。
7. 登录成功断言 replace `/workspace`。
8. 已登录访问 auth 路由断言重定向。
9. `/login` 到 `/signup` 时 Landing mount count 保持 1。

**验证：** 单独运行，预期先因 Layout 缺失失败。

---

## T25：实现 LandingAuthLayout

**文件：** `src/presentation/screens/auth/landing-auth-layout.tsx`

**依赖：** T24

**步骤：**

1. 实现 `authModeFromPathname`。
2. 始终渲染现有 LandingPage。
3. 读取 pathname 控制 AuthDialog。
4. 实现 close、login、signup、authenticated 导航规则。
5. 渲染 Outlet 保持嵌套路由契约。
6. 已登录访问 /login 或 /signup 时 replace workspace。
7. 只用 auth selector 读取 session，不订阅整个 Store。

**验证：** `npm test -- landing-auth-layout.test.tsx` 全部通过。

---

## T26：接入 App 嵌套路由

**文件：** `src/app.tsx`

**依赖：** T25

**步骤：**

1. 先重读当前 app.tsx，保留已有 V3 路由和重定向。
2. 导入 LandingAuthLayout，移除 app.tsx 对 LandingPage 的直接路由使用。
3. 将 `/`、`login`、`signup` 配置为共享父/子路由。
4. 保持 workspace、repository、insights、settings 路由不变。
5. 保持 wildcard 最后匹配。
6. 不修改 basename 和 Provider 层级。

**验证：** `npx tsc -b`；MemoryRouter/App 路由测试确认三个路径正确。

---

## T27：更新首页登录入口和测试

**文件：**

- `src/presentation/screens/landing/components/landing-header-actions.tsx`
- `src/presentation/screens/landing/components/landing-header.test.tsx`

**依赖：** T09、T26

**步骤：**

1. 先重读文件并保留当前主题切换实现。
2. Guest 状态登录 Link 指向 `/login`，添加 `id="landing-login-trigger"`。
3. Authenticated 状态显示“工作台”并指向 `/workspace`。
4. “开始使用”始终指向 `/workspace`。
5. 使用 auth selector，不订阅整个 Store。
6. 更新测试 mock 和 href/text 断言。
7. 不修改 LandingHeader 其他导航和 CSS。

**验证：** `npm test -- landing-header.test.tsx`；Guest/Auth 两组行为通过。

---

## T28：先写 V3UserMenu 测试

**文件：** `src/presentation/components/v3/v3-user-menu.test.tsx`

**依赖：** T09

**步骤：**

1. Mock auth Store 为 guest，断言本地模式、IndexedDB、登录演示账号和设置。
2. 点击登录断言导航 `/login`。
3. Mock credentials session，断言 A、admin、账号密码演示登录。
4. Mock github session，断言 GitHub 演示登录。
5. 点击退出断言 signOut、Popover 关闭、导航 `/`。
6. 断言退出按钮使用危险文本但不是禁用。

**验证：** 单独运行，预期先因组件缺失失败。

---

## T29：实现 V3UserMenu

**文件：** `src/presentation/components/v3/v3-user-menu.tsx`

**依赖：** T28

**步骤：**

1. 从现有 UserMenu 迁移 Popover 结构，不改变 V3 尺寸和 Token。
2. Guest trigger 使用 User 图标，菜单增加登录和设置。
3. Auth trigger 使用字母 A，显示 admin/provider/local-first 提示。
4. 实现退出：关闭、signOut、replace `/`。
5. 删除“退出本地模式（即将支持）”。
6. 使用 Store selectors。
7. 补齐 aria-label 和 focus 样式。

**验证：** `npm test -- v3-user-menu.test.tsx` 全部通过。

---

## T30：将用户菜单接回顶部命令栏

**文件：**

- `src/presentation/components/v3/v3-top-command-bar.tsx`
- `src/presentation/components/v3/v3-app-shell.test.tsx`
- `src/presentation/components/v3/index.ts`（仅需要时）

**依赖：** T29

**步骤：**

1. 先重读 top bar 当前用户改动。
2. 删除文件内部 UserMenu 函数及不再使用的 imports。
3. 导入并渲染 V3UserMenu。
4. 更新 app-shell 测试的 auth store mock。
5. 补 Guest 用户菜单 smoke 断言。
6. 只有外部模块需要时才从 index.ts 导出，避免无意义公共 API。

**验证：** `npm test -- v3-app-shell.test.tsx v3-user-menu.test.tsx`，ESLint 无 unused import。

---

## T31：补全 AuthDialog 登录行为测试

**文件：** `src/presentation/screens/auth/auth-dialog.test.tsx`

**依赖：** T23

**步骤：**

1. 覆盖密码显示/隐藏。
2. 覆盖 remember 默认 true 和切 false。
3. 覆盖空字段错误与清除。
4. 覆盖 wrong/wrong form error。
5. 覆盖 admin/admin loading、success、authenticated 回调。
6. 覆盖 storage warning 仍认证成功。
7. 使用 fake timers，不等待真实时间。

**验证：** 相关测试通过且没有 act warning。

---

## T32：补全注册、恢复和 GitHub 测试

**文件：** `src/presentation/screens/auth/auth-dialog.test.tsx`

**依赖：** T31

**步骤：**

1. 覆盖注册必填、短密码、不一致、未勾协议。
2. 覆盖注册成功切登录、admin preset、密码为空。
3. 覆盖忘记密码进入、返回和恢复 notice。
4. 覆盖 GitHub loading 和成功。
5. 断言注册/恢复不产生 session。
6. 断言任何模拟流程不调用 fetch/window.open。

**验证：** AuthDialog 测试全绿；测试日志无网络调用。

---

## T33：补充响应式和 reduced-motion 结构检查

**文件：**

- `src/presentation/screens/auth/auth-modal.css`
- `src/presentation/screens/auth/auth-dialog.test.tsx`

**依赖：** T21、T32

**步骤：**

1. 检查 desktop 宽 488px、视口 max-height、overlay overflow。
2. 检查 tablet max-width 不超视口。
3. 检查 mobile 100dvh、inset 0、无圆角、safe-area。
4. 检查输入/按钮最小 44px。
5. 检查 prefers-reduced-motion 关闭位移动画。
6. 添加稳定 class/attribute 测试，不依赖 jsdom 实际布局像素。

**验证：** 测试断言关键响应式 class；`rg` 确认 CSS 有 mobile 和 reduced-motion。

---

## T34：增加路由和首页回归测试

**文件：**

- `src/presentation/screens/auth/landing-auth-layout.test.tsx`
- `src/presentation/screens/landing/components/landing-header.test.tsx`
- 可选 `src/app.test.tsx`

**依赖：** T26、T27、T30

**步骤：**

1. 覆盖 `/`、`/login`、`/signup` 直接访问。
2. 覆盖浏览器后退从 signup 回 login。
3. 覆盖关闭 replace `/`。
4. 覆盖开始使用和 Hero CTA 仍可免登录进入 workspace。
5. 覆盖 auth session 刷新恢复后访问 login 跳 workspace。
6. 确认既有 app 路由和 compatibility redirects 未变化。

**验证：** 认证路由测试和既有 Landing 测试全绿。

---

## T35：运行认证模块静态审计

**文件：** 所有认证新增/修改文件

**依赖：** T34

**步骤：**

1. 搜索 `any`、裸 hex、Emoji、手写按钮 SVG。
2. 搜索 `fetch(`、`axios`、`window.open`、`oauth`、`token`。
3. 搜索 storage 序列化中的 password。
4. 搜索对 data/domain/application/DI 的认证依赖。
5. 搜索 Landing 除 header actions 之外的 diff。
6. 修复发现的计划内违规；计划外变化先更新文档。

**验证：**

```bash
rg -n "\bany\b|fetch\(|window\.open|oauth|refreshToken" src/presentation/screens/auth src/presentation/stores/demo-auth-store.ts src/presentation/stores/auth-session-storage.ts
git diff -- src/presentation/screens/landing
```

结果只允许出现类型/文案中有意的安全说明，不允许有实际网络或密码持久代码。

---

## T36：运行认证相关测试集

**文件：** 无新增写入，除非修复失败

**依赖：** T35

**步骤：**

1. 运行 validation 测试。
2. 运行 storage 测试。
3. 运行 Store 测试。
4. 运行 AuthDialog 测试。
5. 运行 LandingAuthLayout 测试。
6. 运行 LandingHeader 和 V3UserMenu/AppShell 测试。
7. 修复失败后从对应最小测试重新运行。

**验证：** 所有认证及受影响测试文件 0 failed、0 unhandled error、无 act warning。

---

## T37：桌面真实浏览器视觉验证

**文件：** 不向仓库写临时截图；证据由浏览器工具保留

**依赖：** T36

**步骤：**

1. 启动 Vite 开发服务器。
2. 用 1536 x 1024 打开 `/login`。
3. 检查 URL/title、DOM 非空、无错误覆盖层、console 健康。
4. 截取首屏，与用户参考图并排检查。
5. 检查弹窗约 488px、位置、遮罩、背景可辨、边框、Tab、字段和可信说明。
6. 检查 `/signup` 和 forgot 视图不改变弹窗宽度。
7. 记录 mismatch ledger：参考证据、当前证据、修复或有意差异。

**验证：** 1536 x 1024 无重叠、裁切、横向滚动；视觉差异仅为“邮箱改账号”等已批准差异。

---

## T38：桌面完整交互验证

**文件：** 不写临时测试脚本到仓库

**依赖：** T37

**步骤：**

1. `/ -> 登录 -> /login`。
2. wrong/wrong 显示错误且不导航。
3. admin/admin 显示 loading 后进入 workspace。
4. 打开用户菜单，确认 admin/provider。
5. 退出回首页，确认 IndexedDB 数据未变化。
6. 测试注册失败、注册成功、admin preset。
7. 测试忘记密码恢复。
8. 测试 GitHub 模拟登录。
9. 测试浏览器前进/后退和直接刷新 `/login`、`/signup`。
10. 测试记住我 true/false 的新会话行为。

**验证：** 每条流程都有 URL、可见文字、状态或 storage 的可观察证据。

---

## T39：键盘与可访问性浏览器验证

**文件：** 无

**依赖：** T37

**步骤：**

1. 只用键盘打开登录。
2. 确认初始焦点在账号。
3. Tab 循环不离开 Dialog。
4. ArrowLeft/Right 切换认证 Tab。
5. Enter 提交当前表单。
6. Escape 关闭并将焦点返回首页登录入口。
7. 检查错误 live region 和 aria-invalid。
8. 开启 reduced-motion，确认无位移动画依赖。

**验证：** 所有关键路径无需鼠标；焦点可见且顺序与视觉一致。

---

## T40：移动与平板浏览器验证

**文件：** 无

**依赖：** T37

**步骤：**

1. 1024 x 768 检查居中弹窗和低高度滚动。
2. 768 x 1024 检查窄弹窗和简化首页导航。
3. 390 x 844 检查全屏 Dialog。
4. 360 x 800 检查最长中文、错误、注册表单和可信说明。
5. 检查无横向滚动、按钮不裁切、关闭始终可达。
6. 模拟软键盘/缩短视口，确认当前输入与主按钮可达。
7. 截取 desktop 和 mobile 证据。

**验证：** 五个目标视口无布局失败；mobile 可完整完成 admin/admin 登录。

---

## T41：运行全量质量门禁

**文件：** 无新增写入，除非修复失败

**依赖：** T38、T39、T40

**步骤：**

1. 运行 `npm run lint`。
2. 运行 `npx tsc -b`。
3. 运行 `npm test`。
4. 运行 `npm run build`。
5. 区分新增错误、既有 warning 和构建体积 warning。
6. 不通过禁用规则、删测试或更新无关快照来做绿。

**验证：** 四个命令 exit code 0；新增代码无 lint error、TS error、测试失败。

---

## T42：最终差异与范围审计

**文件：** 全部改动

**依赖：** T41

**步骤：**

1. 执行 `git diff --check`。
2. 执行 `git status --short`，区分任务改动与用户原有改动。
3. 检查新增/修改文件与本 Task 文件清单一致。
4. 确认没有 package.json/lockfile 变化。
5. 确认 Landing 只修改 header actions 和对应测试。
6. 确认退出前后 IndexedDB 数据证据已记录。
7. 汇总测试命令、浏览器视口、交互路径和剩余风险。

**验证：** 无空白错误、无越界文件、无未说明失败；交付报告具备可复核证据。

---

## 4. 执行顺序与并行关系

```text
T01
  |
  v
T02 -> T03
  |      |
  +--> T04 -> T05
  |
  +--> T06 -> T07 -> T08 -> T09
  |
  +--> T10 -> T11
  |          T12
  |          T13
  |          T14
  |           |
  |           +--> T15 -> T16 -> T17
  |           +--> T18
  |           +--> T19
  |                  |
  +----------------> T20 -> T21 -> T22 -> T23
                                      |
                                      +--> T24 -> T25 -> T26 -> T27
                                      |
T09 --------------------------------> T28 -> T29 -> T30
                                      |
T23 -> T31 -> T32 -> T33 ------------+
                                      |
                         T27 + T30 -> T34
                                      |
                                     T35
                                      |
                                     T36
                                      |
                                     T37
                               /       |       \
                            T38       T39      T40
                               \       |       /
                                      T41
                                       |
                                      T42
```

可并行组：

- T04（校验测试）与 T06（存储测试）在 T02/T03 后可并行。
- T11、T12、T13、T14 在 T10 后可并行。
- T18、T19 可在 T13 和 Store 完成后并行。
- T24 路由测试与 T28 用户菜单测试可并行。
- T38、T39、T40 在桌面视觉基线 T37 通过后可并行验证，但必须避免同时操作同一浏览器会话。

---

## 5. Plan 组件覆盖检查

| Plan 模块 | Task |
| --- | --- |
| Auth types/constants | T02、T03 |
| Validation | T04、T05 |
| Session storage | T06、T07 |
| Demo Auth Store | T08、T09 |
| Auth modal CSS | T10、T33 |
| Brand/trust/branch visual | T11、T12 |
| AuthField/AuthTabs | T13、T14 |
| LoginForm | T15-T17、T31 |
| SignupForm | T18、T32 |
| ForgotPasswordView | T19、T32 |
| AuthDialog | T20-T23、T31-T33 |
| LandingAuthLayout | T24-T26、T34 |
| Landing header integration | T27、T34 |
| V3UserMenu | T28-T30 |
| Static/security audit | T35 |
| Automated tests | T36、T41 |
| Browser visual/interaction | T37-T40 |
| Final scope audit | T42 |

覆盖缺口：无。

---

## 6. Task 审批重点

批准本 Task 即确认：

1. 共 42 个聚焦任务，采用测试先行和逐层集成。
2. 底层类型、校验、Storage、Store 完成后才开始 Dialog 编排。
3. 路由和 Landing 接入晚于 Dialog 单元行为，降低首页回归风险。
4. 用户菜单作为独立并行集成线，最终在 T34 汇合。
5. 浏览器视觉、交互、键盘和移动端验证均为必须项。
6. T41 四项质量门禁和 T42 范围审计是交付前硬门槛。

Task 批准后，下一阶段生成逐条可勾选、带明确通过/失败标准的 `checklist.md`。
