# CommitToDo 首页模拟认证弹窗 Plan

> 状态：已批准（2026-07-13，用户明确回复“批准 plan”）
>
> 文档阶段：2 / 4（技术设计）
>
> 需求基线：`./spec.md`（已批准）
>
> 技术栈：React 18、TypeScript、React Router 7、Zustand 5、
> Radix Dialog、Vitest、Testing Library、TailwindCSS、V3 Token。
>
> 约束：本阶段只定义实现方案，不编写认证实现代码。Plan 批准后才生成
> `task.md`。

---

## 1. 技术目标

本方案把认证设计成一个纯前端、可持久化、可测试的演示功能：

- 首页、登录和注册共享同一个 Landing 实例，切换认证 URL 不重建粒子画布。
- `/login` 和 `/signup` 是可直接访问的认证状态，而不是独立视觉页面。
- Radix Dialog 负责 modal 语义、焦点锁定、Escape 和读屏基础能力。
- Zustand Store 负责 `admin` 会话、记住我、GitHub 模拟登录和退出。
- 表单组件负责输入值、同步校验、错误定位和密码可见性。
- 不创建 Domain 实体、Repository、UseCase、Data Model 或后端 API。
- 不修改 IndexedDB 业务数据，也不建立应用路由守卫。

---

## 2. 架构概览

### 2.1 模块关系

```text
React Router
  |
  +-- LandingAuthLayout (共享父布局，始终渲染同一 LandingPage)
  |     |
  |     +-- LandingPage (既有，只负责首页)
  |     |
  |     +-- AuthDialog (路径决定 open 与 login/signup 模式)
  |            |
  |            +-- LoginForm
  |            +-- SignupForm
  |            +-- ForgotPasswordView
  |            +-- AuthBranchVisual
  |            +-- useDemoAuthStore
  |
  +-- V3AppShell
        |
        +-- V3TopCommandBar
              |
              +-- V3UserMenu
                    |
                    +-- useDemoAuthStore

useDemoAuthStore
  |
  +-- credential validation (admin/admin)
  +-- simulated operation delay
  +-- auth-session-storage
        |
        +-- sessionStorage (未勾选记住我)
        +-- localStorage   (勾选记住我)
```

### 2.2 分层归属

本功能属于 Presentation 层的演示能力：

- 路由、弹窗、表单和账号菜单放在 `src/presentation/`。
- 模拟会话 Store 放在 `src/presentation/stores/`。
- 不依赖 `src/data/`，不在 `src/domain/` 声明伪用户实体。
- 不向 DI 容器注册模拟认证服务。
- 仅使用 `core` 的格式化/样式帮助能力和现有 V3 Token。

这是有意选择。模拟认证不是业务身份系统；过早建立 Domain/Auth Repository 会让
其他模型误以为本功能具备真实安全边界，也会扩大未来删除模拟实现的成本。

---

## 3. 路由设计

### 3.1 共享父布局

当前 `/` 直接渲染 `LandingPage`。实现后改为共享父布局：

```tsx
<Route path="/" element={<LandingAuthLayout />}>
  <Route index />
  <Route path="login" />
  <Route path="signup" />
</Route>
```

`LandingAuthLayout` 渲染：

```tsx
<>
  <LandingPage />
  <AuthDialog ... />
  <Outlet />
</>
```

三个子路由不需要提供内容节点；当前路径只用来决定认证弹窗状态。React Router 的
父路由保持挂载，因此 `/`、`/login`、`/signup` 之间导航时，首页滚动位置、Hero
粒子系统和 `LandingPage` 内部动画状态不会重新初始化。

### 3.2 路径到视图的映射

| pathname | Landing | Dialog | 初始视图 |
| --- | --- | --- | --- |
| `/` | 显示 | 关闭 | 无 |
| `/login` | 显示并压暗 | 打开 | `login` |
| `/signup` | 显示并压暗 | 打开 | `signup` |

忘记密码不新增 `/forgot-password` 路由。它是登录弹窗内部的临时子视图，避免扩大公开
URL 契约；关闭或刷新 `/login` 后回到标准登录视图。

### 3.3 导航规则

- 首页“登录”：`/login`。
- 登录 Tab：`/login`。
- 注册 Tab 和“创建账户”：`/signup`。
- 注册成功：`replace('/login')`，避免后退回到已完成的注册表单。
- 关闭按钮、Escape、遮罩关闭：`replace('/')`。
- 登录成功：`replace('/workspace')`。
- GitHub 模拟成功：`replace('/workspace')`。
- 退出登录：清理会话后 `replace('/')`。
- 已登录用户访问 `/login` 或 `/signup`：`replace('/workspace')`。

手动从登录切换注册使用普通 push 导航，因此浏览器后退可以回到登录；流程成功或关闭
使用 replace，避免产生重复、不可操作的历史记录。

### 3.4 Landing 修改边界

首页目录在项目规范中默认只读。本任务明确要求在首页增加认证入口，因此只允许对
`landing-header-actions.tsx` 做最小行为修改：

- “登录”从 `/workspace` 改为 `/login`。
- 已登录时，“登录”按钮目标改为 `/workspace`，文字可保持“登录”或改为“工作台”；
  本计划固定改为“工作台”，避免已登录用户看到错误动作。
- “开始使用”、Hero CTA、Bottom CTA 继续指向 `/workspace`，不修改。
- 不修改 Hero、工作台预览、价值卡、底部 CTA 和 `landing-theme.css`。

---

## 4. 核心类型与数据结构

### 4.1 认证视图

```ts
export type AuthView = 'login' | 'signup' | 'forgot-password';
```

- `login`、`signup` 由 URL 决定。
- `forgot-password` 由 `AuthDialog` 本地状态决定。
- URL 变化时，本地视图重新同步为路径对应值，防止历史导航显示错误内容。

### 4.2 演示账号

```ts
export type DemoAuthProvider = 'credentials' | 'github';

export interface DemoAuthUser {
  username: 'admin';
  provider: DemoAuthProvider;
  signedInAt: string;
}
```

`signedInAt` 使用 ISO 8601 字符串，便于安全序列化。用户名通过字面量类型限制为
`admin`，避免其他组件误以为注册能创建任意真实用户。

### 4.3 持久会话

```ts
export interface DemoAuthSession {
  version: 1;
  user: DemoAuthUser;
  persistence: 'local' | 'session';
}
```

持久记录只包含版本、账号、provider、时间和持久方式。严禁添加 `password`、
`token`、`refreshToken` 或模拟密钥。

### 4.4 Store 状态

```ts
export type AuthOperation =
  | 'login'
  | 'github'
  | 'signup'
  | 'recovery'
  | null;

export type AuthErrorCode =
  | 'invalid-credentials'
  | null;

export interface DemoAuthState {
  session: DemoAuthSession | null;
  operation: AuthOperation;
  error: AuthErrorCode;

  signIn(input: DemoSignInInput): Promise<DemoAuthResult>;
  signInWithGithub(remember: boolean): Promise<DemoAuthResult>;
  simulateRegistration(): Promise<DemoRegistrationResult>;
  simulateRecovery(): Promise<DemoRecoveryResult>;
  clearError(): void;
  signOut(): void;
}
```

Store 不保存重复的 `isAuthenticated` 布尔值。组件通过稳定 selector 派生：

```ts
export const selectIsAuthenticated = (state: DemoAuthState): boolean =>
  state.session !== null;
```

这样不存在 session 和布尔值相互矛盾的中间状态。

### 4.5 输入与结果

```ts
export interface DemoSignInInput {
  username: string;
  password: string;
  remember: boolean;
}

export type DemoAuthResult =
  | {
      ok: true;
      session: DemoAuthSession;
      warning?: 'storage-unavailable';
    }
  | { ok: false; code: 'invalid-credentials' };

export type DemoRegistrationResult = {
  ok: true;
  suggestedUsername: 'admin';
};

export type DemoRecoveryResult = {
  ok: true;
  suggestedUsername: 'admin';
};
```

### 4.6 表单数据与错误

```ts
export interface LoginFormValues {
  username: string;
  password: string;
  remember: boolean;
}

export interface SignupFormValues {
  username: string;
  password: string;
  confirmPassword: string;
  acceptedTerms: boolean;
}

export interface LoginFormErrors {
  username?: string;
  password?: string;
  form?: string;
}

export interface SignupFormErrors {
  username?: string;
  password?: string;
  confirmPassword?: string;
  acceptedTerms?: string;
}
```

---

## 5. 常量设计

文件 `auth-constants.ts` 集中定义：

```ts
export const demoAuthUsername = 'admin' as const;
export const demoAuthPassword = 'admin' as const;
export const demoAuthSessionVersion = 1 as const;
export const demoAuthStorageKey = 'commit.demo-auth.session.v1';
export const demoAuthDelayMs = 450;
```

说明：

- 密码常量仅用于前端演示比较，不作为密钥。
- UI 可以在错误和恢复说明中显示 `admin / admin`，符合已批准 Spec。
- loading 延迟统一为 450ms，既能观察状态，又不拖慢流程。
- 测试使用 fake timers，不真实等待 450ms。

---

## 6. 会话存储设计

### 6.1 为什么不用固定 `persist` Storage

Zustand `persist` 官方方案适合绑定一个 storage，并能用 `partialize` 排除字段。本需求
需要根据“记住我”动态选择 `localStorage` 或 `sessionStorage`，还必须在切换方式时清理
另一个 storage。使用显式存储适配器更直观，也更容易证明密码从未持久化。

Store 仍使用 Zustand 5 的 `create<T>()` 和 selector 订阅，不引入新依赖。

### 6.2 存储函数

`auth-session-storage.ts` 提供：

```ts
export function readDemoAuthSession(): DemoAuthSession | null;

export function writeDemoAuthSession(
  session: DemoAuthSession,
): 'ok' | 'unavailable';

export function clearDemoAuthSession(): void;

export function isDemoAuthSession(value: unknown): value is DemoAuthSession;
```

### 6.3 读写算法

#### 读取

1. 检查 `window` 和 Web Storage 是否可用；SSR/test 环境不可用时返回 null。
2. 先读 `sessionStorage`，再读 `localStorage`。
3. JSON parse 后用 `isDemoAuthSession` 校验：版本、用户名、provider、时间、
   persistence 均合法。
4. 非法、过期版本或损坏记录立即删除并继续读取另一个 storage。
5. 两处都无合法记录时返回 null。

#### 写入

1. 先清除 local/session 两处旧记录，保证单一来源。
2. 根据 `session.persistence` 选择 storage。
3. 只序列化 `DemoAuthSession`。
4. 捕获配额、隐私模式或禁用 storage 的异常并返回 `unavailable`。
5. 存储失败时登录仍保持当前内存会话，并在成功结果中附带 warning；UI 提示
   “已登录，但当前会话无法持久保存”。

#### 清理

- 退出时同时删除 local/session 两处记录。
- 清理失败不阻止内存退出。
- 不触碰设置 Store、IndexedDB 或 PWA 缓存。

### 6.4 初始化

Store 创建时同步调用 `readDemoAuthSession()` 形成初始 session，避免应用先显示本地模式、
随后再闪成 admin。由于 Web 应用不做 SSR，不需要异步 hydration 屏障。

---

## 7. Demo Auth Store 设计

### 7.1 `signIn`

```text
clear error
  -> operation = login
  -> wait demoAuthDelayMs
  -> compare trimmed username and raw password
       -> mismatch: operation = null, error = invalid-credentials, return fail
       -> match: build session, write storage, set session, operation = null
  -> return result
```

- username 允许首尾空格并在比较前 trim。
- password 不 trim，避免掩盖输入错误。
- 错误凭据绝不创建 session。
- storage 不可用时保留内存登录，在成功结果附带 `storage-unavailable` warning，
  不走凭据失败分支。

### 7.2 `signInWithGithub`

- 不读取表单账号密码。
- operation 设为 `github`。
- 延迟后创建 `username: admin`、`provider: github` 的 session。
- `remember` 沿用登录表单当前勾选值；默认 true。
- 不调用 `window.open`、`fetch` 或第三方 SDK。

### 7.3 `simulateRegistration`

- Store 只负责可观察的异步 operation，不保存注册输入。
- 表单在调用前完成所有同步校验。
- 延迟后返回 `suggestedUsername: admin`，session 保持 null。

### 7.4 `simulateRecovery`

- operation 设为 `recovery`。
- 延迟后返回 `suggestedUsername: admin`。
- 不修改 storage，不创建 session。

### 7.5 `signOut`

- 清理两处 storage。
- 同步设置 `session = null`、`operation = null`、`error = null`。
- 导航由调用方 `V3UserMenu` 完成，Store 不依赖 React Router。

### 7.6 Selector 规则

组件不得无选择器订阅整个 Store：

```ts
const session = useDemoAuthStore((state) => state.session);
const signIn = useDemoAuthStore((state) => state.signIn);
```

这样可以避免输入、路由或其他操作导致账号菜单和整个应用壳层无意义重渲染。

---

## 8. 表单校验设计

### 8.1 纯函数接口

`auth-validation.ts` 提供：

```ts
export function validateLoginForm(
  values: LoginFormValues,
): LoginFormErrors;

export function validateSignupForm(
  values: SignupFormValues,
): SignupFormErrors;

export function firstLoginErrorField(
  errors: LoginFormErrors,
): 'username' | 'password' | null;

export function firstSignupErrorField(
  errors: SignupFormErrors,
): 'username' | 'password' | 'confirmPassword' | 'acceptedTerms' | null;
```

### 8.2 登录规则

- username trim 后为空：`请输入账号`。
- password 为空：`请输入密码`。
- admin/admin 比较不放在同步必填函数中，由 Store 返回 form error。
- submit 失败后焦点移动到第一个字段错误；凭据错误聚焦账号输入框。

### 8.3 注册规则

- 账号 trim 后必填。
- 密码必填且长度至少 5。
- 确认密码必填且必须一致。
- 协议必须勾选。
- 不校验邮箱、不检查账号唯一性、不写入 storage。

### 8.4 错误生命周期

- 第一次提交前不显示红色错误。
- 字段发生 change 时清除该字段错误。
- 表单凭据错误在账号或密码改变时清除。
- Tab/视图切换时清除旧错误和密码值。
- 账号可按成功结果预填 admin；密码永不跨视图保留。

---

## 9. LandingAuthLayout 设计

### 9.1 职责

- 保持 `LandingPage` 在 `/`、`/login`、`/signup` 间持续挂载。
- 从 pathname 解析 `login` / `signup` / closed。
- 控制 `AuthDialog.open` 和初始模式。
- 提供关闭、Tab 导航和登录成功导航回调。
- 已登录访问认证路由时重定向工作台。

### 9.2 接口

```ts
export function LandingAuthLayout(): JSX.Element;

export function authModeFromPathname(
  pathname: string,
): 'login' | 'signup' | null;
```

解析函数独立导出并测试，避免散落字符串判断。

### 9.3 关闭与焦点恢复

Radix Dialog 没有 Trigger，因为打开行为来自路由。首页登录链接增加稳定属性：

```html
id="landing-login-trigger"
```

关闭时：

1. `AuthDialog` 触发 `onOpenChange(false)`。
2. Layout `replace('/')`。
3. `onCloseAutoFocus` 阻止默认行为并尝试聚焦 `#landing-login-trigger`。
4. 直接访问 `/login` 时该按钮同样存在于背景首页，因此仍可恢复焦点。

---

## 10. AuthDialog 设计

### 10.1 组件接口

```ts
export interface AuthDialogProps {
  open: boolean;
  routeMode: 'login' | 'signup';
  onOpenChange(open: boolean): void;
  onNavigateLogin(): void;
  onNavigateSignup(): void;
  onAuthenticated(): void;
}

export function AuthDialog(props: AuthDialogProps): JSX.Element;
```

### 10.2 Radix 结构

```text
Dialog.Root (controlled, modal=true)
  Dialog.Portal
    Dialog.Overlay (scroll container + backdrop)
      Dialog.Content
        Auth header
        AuthBranchVisual
        Dialog.Title
        Dialog.Description
        Auth tabs / forgot back state
        Active form/view
        Auth trust note
        Dialog.Close
```

使用 Overlay 包裹 Content 的可滚动结构，确保低高度视口能滚动完整弹窗。该方式与 Radix
官方 scrollable overlay 模式一致。

### 10.3 状态归属

`AuthDialog` 只保存 UI 编排状态：

- `localView: AuthView`。
- `loginUsernamePreset`。
- `notice`（注册完成、恢复完成、storage 不可用等）。

认证 session、operation 和 auth error 来自 Store；具体字段值和字段错误留在表单组件。

### 10.4 路由同步

- routeMode 变化时：localView 同步为 routeMode，清除 notice。
- 点击忘记密码：localView 变为 forgot-password，URL 保持 `/login`。
- 忘记密码返回：localView 变为 login。
- 注册成功：设置 preset admin 和 notice，再调用 onNavigateLogin。
- 弹窗重新打开时不保留旧密码或错误。

### 10.5 Dialog 可访问性

- 动态 `Dialog.Title` 和 `Dialog.Description` 与当前视图一致。
- `onOpenAutoFocus` 将焦点交给当前表单首字段；找不到时使用标题。
- `onCloseAutoFocus` 恢复首页登录入口。
- 关闭按钮 `aria-label="关闭登录与注册"`。
- loading 时不关闭整个 Dialog，但按钮禁用避免重复提交。
- 错误/notice 使用 `role="status"` 或 `aria-live="polite"`；凭据错误可用 assertive。

---

## 11. 认证视觉组件设计

### 11.1 `AuthBrandHeader`

职责：

- 左侧白色 32px 品牌方块、GitBranch 16px 图标、`CommitToDo` 18px 品牌名。
- 关闭按钮由 Dialog 单独定位，不放在品牌组件内部。
- 组件本身不包含链接，避免对话框内多余导航焦点。

### 11.2 `AuthBranchVisual`

使用自包含、装饰性的 inline SVG，而不是图片资源或复制首页粒子系统：

- 稳定 `viewBox`，宽度 100%，高度 44-48px。
- 3 条细分支路径：主绿、青色、低对比中性线。
- 6-10 个小节点和右侧提交勾节点。
- 路径使用 V3 Token，不写裸色。
- `aria-hidden="true"`、不可聚焦。
- 只做一次轻微淡入；减少动态效果时静态显示。

它是领域可视化而非 UI 图标，因此允许使用 inline SVG；按钮和表单图标仍统一用 Lucide。

### 11.3 `AuthTabs`

```ts
export interface AuthTabsProps {
  value: 'login' | 'signup';
  disabled?: boolean;
  onChange(value: 'login' | 'signup'): void;
}
```

- 使用 `role="tablist"`、两个 `role="tab"`。
- 当前项有 `aria-selected`、绿色文字、2px 底线。
- 左右方向键切换 Tab；Enter/Space 激活。
- Tab 高度 42px，不使用胶囊容器。

### 11.4 `AuthField`

```ts
export interface AuthFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  id: string;
  label: string;
  icon: LucideIcon;
  error?: string;
  trailingAction?: React.ReactNode;
}
```

- label、input、error id 自动关联。
- 输入容器 46-48px，左图标 16px，右动作至少 40px 命中区域。
- error 时使用 danger border、文本和 `aria-invalid`。
- focus-within 使用 V3 focus ring。
- 不把输入框做成卡片。

### 11.5 `AuthTrustNote`

- ShieldCheck 14-16px。
- 绿色状态点。
- 12px 次级文案。
- 与表单用 divider 分开，但不额外加卡片。

---

## 12. LoginForm 设计

### 12.1 接口

```ts
export interface LoginFormProps {
  usernamePreset?: string;
  operation: AuthOperation;
  authError: AuthErrorCode;
  notice?: string;
  onSubmit(values: LoginFormValues): Promise<DemoAuthResult>;
  onGithub(remember: boolean): Promise<DemoAuthResult>;
  onForgotPassword(): void;
  onNavigateSignup(): void;
  onAuthenticated(): void;
  onClearAuthError(): void;
}
```

### 12.2 本地状态

- `username`，初始为 preset 或空。
- `password`，始终初始为空。
- `remember`，初始 true。
- `showPassword`，初始 false。
- `errors`。

### 12.3 提交流程

1. `preventDefault`。
2. 运行 `validateLoginForm`。
3. 有错时更新 errors 并聚焦首错字段。
4. 调用 Store `signIn`。
5. invalid credentials 映射为 form error 并聚焦账号。
6. 成功结果带 storage unavailable warning 时显示非阻断提示，并继续调用
   `onAuthenticated`，因为内存登录有效。
7. 成功显示短暂成功状态后 `onAuthenticated`。

### 12.4 GitHub 流程

- 复用当前 remember 值。
- GitHub 按钮 loading 时显示 spinner 和“正在模拟 GitHub 登录…”。
- 只禁用提交相关控件，不禁用关闭按钮。
- 成功显示“GitHub 演示登录成功”后进入工作台。

### 12.5 Autocomplete

- username：`autoComplete="username"`。
- password：`autoComplete="current-password"`。
- 浏览器可以建议本地值，但组件不主动保存密码。

---

## 13. SignupForm 设计

### 13.1 接口

```ts
export interface SignupFormProps {
  operation: AuthOperation;
  onSubmit(values: SignupFormValues): Promise<DemoRegistrationResult>;
  onCompleted(username: 'admin'): void;
  onNavigateLogin(): void;
}
```

### 13.2 本地状态

- username、password、confirmPassword、acceptedTerms。
- 两个密码可见性状态分别管理，默认隐藏。
- errors。

### 13.3 流程

1. 同步校验所有字段。
2. 聚焦首错字段。
3. 有效时调用 `simulateRegistration`。
4. loading 主按钮文案“正在创建演示账户…”。
5. 成功清空两个密码，调用 `onCompleted('admin')`。
6. Dialog 切换 `/login`，显示成功 notice，账号预填 admin。

注册值不传入 Auth Store 持久层，不写任何 storage。

---

## 14. ForgotPasswordView 设计

### 14.1 接口

```ts
export interface ForgotPasswordViewProps {
  operation: AuthOperation;
  onRecover(): Promise<DemoRecoveryResult>;
  onRecovered(username: 'admin'): void;
  onBack(): void;
}
```

### 14.2 内容

- KeyRound 或 ShieldCheck 图标。
- 标题和说明由 Dialog.Title/Description 提供，不在视图重复大标题。
- 演示账号摘要使用等宽字体显示 `admin / admin`。
- 主按钮“恢复演示账号”。
- 次级文本按钮“返回登录”。

### 14.3 流程

- 点击恢复后 operation=recovery。
- 成功后回到 login，账号预填 admin，密码为空。
- notice 显示“演示密码已恢复为 admin”。
- 不显示“邮件已发送”等虚假文案。

---

## 15. 用户菜单集成

### 15.1 组件拆分

当前 `UserMenu` 内嵌在 `v3-top-command-bar.tsx`。计划提取为：

```text
src/presentation/components/v3/v3-user-menu.tsx
src/presentation/components/v3/v3-user-menu.test.tsx
```

`V3TopCommandBar` 只渲染 `<V3UserMenu />`，降低顶栏文件复杂度。

### 15.2 Guest / 本地模式

- 触发器显示 User 图标。
- 状态：`本地模式`。
- 说明：`数据保存在本机 IndexedDB`。
- 动作：`登录演示账号` → `/login`。
- 动作：`设置` → `/settings`。
- 删除当前不可用的“退出本地模式（即将支持）”。

### 15.3 Authenticated / admin

- 触发器显示字母 `A`，并提供 `aria-label="admin 用户菜单"`。
- 状态：`admin`。
- 说明：根据 provider 显示“账号密码演示登录”或“GitHub 演示登录”。
- local-first 提示：`业务数据仍保存在本机`。
- 动作：`设置`。
- 动作：`退出登录`，使用 danger 文字但不做大红按钮。

### 15.4 退出流程

```text
click logout
  -> close popover
  -> authStore.signOut()
  -> navigate('/', replace=true)
  -> landing shows guest login entry
```

退出不调用数据库、不清理任务、不重置设置。

---

## 16. 响应式与视觉实现

### 16.1 Desktop：>= 1280px

- Overlay `padding: 24px`，滚动容器居中。
- Content 宽 488px，最大宽度 `calc(100vw - 48px)`。
- 内容 padding 30-32px。
- 最大高度 `calc(100dvh - 48px)`，内容内部可滚动。
- Modal 顶部略高视觉中心，可通过 overlay 的上下 padding 比例实现，不使用固定负 top。

### 16.2 Tablet：768-1279px

- Content 宽 440-488px。
- 页面背景保持可辨，但导航会按现有断点自动简化。
- padding 24px，按钮保持全宽。

### 16.3 Mobile：< 768px

- Overlay padding 0。
- Content 固定 inset 0，宽高 100%，`min-height: 100dvh`。
- 无圆角、无外部阴影、仅内部滚动。
- 顶部品牌/关闭栏 sticky。
- 内容左右 padding 20px，底部加入 safe-area inset。
- 输入和按钮最小 48px；可信说明不能被软键盘永久遮挡。

### 16.4 CSS 组织

新增 `auth-modal.css`，只承担以下难以用通用类表达的内容：

- Overlay/Content data-state 动画。
- 响应式全屏 Dialog。
- `100dvh` 和 safe-area。
- Auth branch SVG path/node 动画。
- `prefers-reduced-motion` 覆盖。

颜色、字体、圆角和阴影只引用 `--v3-*`。普通布局继续使用 Tailwind，避免把整个
组件样式复制进 CSS。

### 16.5 动效

- Overlay：120-200ms opacity。
- Dialog：200ms opacity + 8px translateY，不使用 0.95 缩放。
- Tab indicator：120ms color/position。
- Branch visual：一次 360ms 淡入，不无限循环。
- loading spinner：CSS rotation；reduced motion 时显示静态 loading 图标和文字。

---

## 17. 文件组织

```text
src/
├── app.tsx                                      # 修改：共享 Landing/Auth 父路由
├── presentation/
│   ├── stores/
│   │   ├── demo-auth-store.ts                  # 新增：模拟认证状态与 actions
│   │   ├── demo-auth-store.test.ts             # 新增：登录/持久化/退出测试
│   │   ├── auth-session-storage.ts             # 新增：local/session 双存储适配器
│   │   └── auth-session-storage.test.ts        # 新增：schema、损坏数据和密码排除
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── auth-types.ts                   # 新增：视图、输入、结果类型
│   │   │   ├── auth-constants.ts               # 新增：admin、storage key、delay
│   │   │   ├── auth-validation.ts              # 新增：纯表单校验
│   │   │   ├── auth-validation.test.ts         # 新增：校验边界
│   │   │   ├── landing-auth-layout.tsx         # 新增：共享首页与路由映射
│   │   │   ├── landing-auth-layout.test.tsx    # 新增：URL、关闭、历史行为
│   │   │   ├── auth-dialog.tsx                 # 新增：Radix 编排与状态同步
│   │   │   ├── auth-dialog.test.tsx            # 新增：完整行为测试
│   │   │   ├── auth-brand-header.tsx           # 新增：Logo/品牌栏
│   │   │   ├── auth-branch-visual.tsx          # 新增：装饰性分支 SVG
│   │   │   ├── auth-tabs.tsx                   # 新增：login/signup Tab
│   │   │   ├── auth-field.tsx                  # 新增：输入/错误/图标
│   │   │   ├── login-form.tsx                  # 新增：登录/GitHub/记住我
│   │   │   ├── signup-form.tsx                 # 新增：注册模拟流程
│   │   │   ├── forgot-password-view.tsx        # 新增：恢复模拟流程
│   │   │   ├── auth-trust-note.tsx             # 新增：local-first 可信说明
│   │   │   └── auth-modal.css                  # 新增：Dialog/响应式/动效
│   │   └── landing/
│   │       └── components/
│   │           └── landing-header-actions.tsx  # 修改：登录入口和已登录文案
│   └── components/
│       └── v3/
│           ├── v3-top-command-bar.tsx          # 修改：使用拆分后的用户菜单
│           ├── v3-user-menu.tsx                # 新增：guest/admin 菜单
│           ├── v3-user-menu.test.tsx           # 新增：登录态和退出测试
│           └── index.ts                        # 修改：导出 V3UserMenu（如需）
└── test/
    └── setup.ts                                # 仅在测试确实缺 API 时修改
```

### 17.1 预计不修改

- `src/presentation/screens/landing/landing-page.tsx`
- `src/presentation/screens/landing/landing-theme.css`
- Hero、WorkbenchPreview、ValueSection、BottomCta。
- Domain、Application、Data、DI、Dexie schema。
- `src/main.tsx`。

---

## 18. 模块交互流程

### 18.1 首页打开登录

```text
LandingHeaderActions.Login link
  -> navigate /login
  -> LandingAuthLayout remains mounted
  -> pathname => routeMode login
  -> AuthDialog open=true
  -> Radix traps focus
  -> LoginForm username receives focus
```

### 18.2 凭据登录成功

```text
LoginForm submit
  -> validateLoginForm
  -> demoAuthStore.signIn(admin/admin, remember)
  -> operation=login
  -> simulate delay
  -> create DemoAuthSession
  -> auth-session-storage writes one storage
  -> Store session updated
  -> LoginForm success notice
  -> LandingAuthLayout replace /workspace
  -> V3UserMenu reads session and displays admin
```

### 18.3 凭据登录失败

```text
LoginForm submit
  -> local required validation passes
  -> Store compares credentials
  -> invalid-credentials
  -> no storage write / no session
  -> form-level error announced
  -> focus username
```

### 18.4 注册模拟

```text
/signup
  -> SignupForm
  -> local validation
  -> simulateRegistration delay
  -> no user/session write
  -> replace /login
  -> LoginForm preset username admin
  -> success notice instructs admin/admin
```

### 18.5 忘记密码模拟

```text
/login
  -> click forgot password
  -> AuthDialog localView=forgot-password
  -> simulateRecovery
  -> localView=login
  -> username preset admin
  -> notice says demo password restored to admin
```

### 18.6 GitHub 模拟登录

```text
click GitHub
  -> signInWithGithub(remember)
  -> no popup / no fetch
  -> provider=github session
  -> replace /workspace
  -> user menu shows GitHub demo login
```

### 18.7 退出

```text
V3UserMenu logout
  -> clear sessionStorage + localStorage auth key
  -> Store session=null
  -> replace /
  -> IndexedDB untouched
```

---

## 19. 错误处理

| 错误 | 层级 | UI | 恢复 |
| --- | --- | --- | --- |
| 空账号/密码 | 表单 | 字段下错误 + danger border | 输入时清除 |
| 凭据错误 | Store -> 表单 | 表单级错误，提示 admin/admin | 修改任一凭据 |
| 注册不一致 | 表单 | 确认密码错误 | 修改密码 |
| 未勾协议 | 表单 | 复选框关联错误 | 勾选 |
| Storage 禁用 | Storage -> Store | warning，不阻止当前内存登录 | 当前会话继续使用 |
| Storage JSON 损坏 | Storage | 静默清除损坏记录，回 guest | 重新登录 |
| 模拟 operation 异常 | Store | 通用“操作失败，请重试” | 重新提交 |

演示流程不应产生真正网络错误；不得使用 catch 空吞导致按钮永久 loading。所有 async
action 使用 `try/finally` 保证 operation 复位。

---

## 20. 测试设计

### 20.1 `auth-validation.test.ts`

- 登录空账号、空密码、两者为空。
- username trim。
- 注册密码不足 5、确认不一致、协议未勾选。
- first error field 顺序稳定。

### 20.2 `auth-session-storage.test.ts`

- session schema 合法/非法。
- remember=true 写 localStorage，sessionStorage 无记录。
- remember=false 写 sessionStorage，localStorage 无记录。
- 切换持久方式会清除旧记录。
- 序列化结果不包含 `password`。
- 损坏 JSON 被清理。
- storage.setItem 抛错返回 unavailable。
- clear 不影响其他 localStorage key。

### 20.3 `demo-auth-store.test.ts`

- 初始从 local/session 恢复。
- admin/admin 成功。
- 错误凭据失败且无 session。
- GitHub 生成 provider=github。
- registration/recovery 不生成 session。
- operation 在 success/failure 后复位。
- signOut 清会话。
- 使用 fake timers 验证 loading。

### 20.4 `auth-dialog.test.tsx`

- login 视觉结构和所有控件。
- show/hide password。
- required error 和凭据 error。
- admin/admin 成功回调。
- remember 默认选中并可切换。
- GitHub loading/success。
- Tab 切 signup。
- 注册所有校验与成功回 login。
- forgot/recover/back。
- Escape、关闭按钮、焦点管理。
- aria title/description/live region。

### 20.5 `landing-auth-layout.test.tsx`

- `/` dialog closed。
- `/login` login open。
- `/signup` signup open。
- close replace `/`。
- login/signup URL 切换。
- 已登录访问 auth route 重定向 workspace。
- Landing DOM 在 tab 切换过程中不重复 mount；可用测试计数 mock 证明。

### 20.6 `v3-user-menu.test.tsx`

- guest 显示本地模式和登录入口。
- authenticated 显示 admin/provider。
- logout 调用 signOut 并导航 `/`。
- 登录入口导航 `/login`。

### 20.7 既有测试更新

- `landing-header.test.tsx`：登录 href 为 `/login`，开始使用仍为 `/workspace`；
  已登录显示工作台入口。
- `v3-app-shell.test.tsx`：auth store mock，避免新增依赖破坏现有用例；补用户菜单状态。
- 必要时新增 `app.test.tsx` 验证嵌套路由，但不重复 Dialog 行为测试。

---

## 21. 浏览器验证设计

实现阶段必须使用真实浏览器，不以 build 通过替代视觉验证。

### 21.1 参考尺寸

- Desktop：1536 x 1024，与输入图片同构图比较。
- Compact desktop：1024 x 768。
- Tablet：768 x 1024。
- Mobile：390 x 844、360 x 800。

### 21.2 必查项

- 页面身份、URL、标题。
- Landing 背景不是空白且未重新加载。
- 无 Vite/React 错误覆盖层。
- console error/warn 无相关错误。
- Dialog 比例、位置、遮罩和首页可辨识度。
- 无文字重叠、裁切、横向滚动。
- Tab、输入、按钮、错误、loading、notice 的视觉状态。
- 键盘 Tab 顺序、Escape、Enter、焦点返回。

### 21.3 核心交互路径

```text
/ -> 登录 -> /login -> wrong/wrong -> error
   -> admin/admin -> loading -> /workspace -> admin user menu
   -> logout -> / -> local data remains
```

```text
/signup -> invalid registration -> field errors
        -> valid demo registration -> /login with admin preset
        -> admin password -> /workspace
```

```text
/login -> forgot password -> recover -> login preset
       -> GitHub demo -> /workspace -> provider shown in user menu
```

---

## 22. 技术决策

| 决策点 | 选择 | 理由 |
| --- | --- | --- |
| 认证呈现 | 首页上的 Radix Dialog | 符合图片，保留品牌上下文和可访问性 |
| 路由结构 | `/` 父布局 + login/signup 子路由 | Landing 持续挂载，URL 可刷新和回退 |
| 忘记密码 URL | 不新增路由 | 临时演示子流程，无分享价值 |
| 登录强制性 | 不加路由守卫 | 保持 local-first 和免登录使用承诺 |
| 状态管理 | 独立 Zustand Store | 与项目一致，用户菜单跨页面消费 |
| 持久化 | 显式 local/session storage adapter | remember 动态选择，能证明不存密码 |
| Zustand persist | 不使用 | 单一 storage 配置不适合双持久策略 |
| 模拟异步 | 统一 450ms Promise delay | loading 可观察，测试可用 fake timers |
| 注册 | 校验后提示 admin/admin，不创建账号 | 符合无后端和固定凭据约束 |
| GitHub | 本地模拟为 admin/provider=github | 流程完整但不冒充 OAuth |
| 分支视觉 | 装饰性 inline SVG | 轻量、自包含、可用 Token、无新资产 |
| 图标 | Lucide | 项目统一规范 |
| 新依赖 | 不新增 | 现有 Router/Zustand/Radix 足够 |
| Landing 修改 | 只改 header 登录入口 | 最小化对只读参考实现的影响 |
| 浅色模式 | 本功能仍消费 V3 Token | 不在认证组件硬编码暗色；主题完善可继承 |

---

## 23. Spec 覆盖矩阵

| Spec | 负责模块 |
| --- | --- |
| F1 | App routes、LandingAuthLayout、AuthDialog |
| F2 | LoginForm、AuthField、AuthTabs |
| F3 | auth-validation、DemoAuthStore、LoginForm |
| F4 | auth-session-storage、DemoAuthStore |
| F5 | SignupForm、auth-validation、AuthDialog |
| F6 | ForgotPasswordView、AuthDialog、DemoAuthStore |
| F7 | LoginForm、DemoAuthStore |
| F8 | V3UserMenu、DemoAuthStore |
| F9 | LandingHeaderActions、LandingAuthLayout |
| F10 | App routes、LandingAuthLayout |
| F11 | Radix Dialog、AuthField、AuthTabs |
| F12 | auth-modal.css、AuthDialog |
| F13 | auth-modal.css、DemoAuthStore、各表单 |
| N1 | Auth visual components、V3 Token |
| N2 | Radix Dialog、semantic forms、live regions |
| N3 | Storage adapter、Store、透明演示文案 |
| N4 | Shared layout、轻量 SVG、CSS motion |
| N5 | 全部 TypeScript 模块和测试 |

覆盖缺口：无。

---

## 24. 实施风险与控制

### R1. 首页被重新挂载

风险：错误地把 `/login` 直接写成 `<LandingPage /><AuthDialog />` 独立路由，导致动画和
粒子重新初始化。

控制：使用共享父布局和 Outlet；测试 mount count。

### R2. Landing 只读区域扩大修改

风险：为了弹窗改 `landing-theme.css` 或 Hero。

控制：认证样式自包含；只允许修改 header action 的目标和状态文案。

### R3. 密码被持久化

风险：把整个表单或 Store 用 persist 序列化。

控制：会话类型无 password 字段；storage 测试扫描序列化内容。

### R4. 双 Storage 冲突

风险：local/session 同时存在，读取错误账号态。

控制：每次写前清两处；schema 校验；session 优先读取。

### R5. Dialog 低高度裁切

风险：固定 center content 超出视口。

控制：Overlay 作为滚动容器；Content 有 max-height；手机全屏。

### R6. 测试定时器不稳定

风险：真实等待导致慢测或 act warning。

控制：统一 delay 常量；Vitest fake timers；每个 async action finally 复位。

### R7. 退出误删本地数据

风险：将“退出”错误理解为“清空本地模式”。

控制：signOut 只调用 auth storage adapter；IndexedDB 不进入依赖图；浏览器验证数据保留。

---

## 25. 开发完成后的质量门禁

```bash
npm run lint
npx tsc -b
npm test
npm run build
```

另外必须完成真实浏览器验证：

- 1536 x 1024 登录图与参考图并排审查。
- 390 x 844 全屏认证流程。
- admin/admin、错误登录、注册、忘记、GitHub、记住我、退出。
- 控制台无相关 warning/error。
- IndexedDB 数据在登录和退出前后保持。

---

## 26. Plan 审批重点

审批本 Plan 即确认以下技术选择：

1. 使用共享父路由持续挂载 Landing，而非为登录复制首页。
2. 使用 Radix Dialog 和自包含 `auth-modal.css`。
3. 使用 Zustand Store + 显式 local/session storage adapter。
4. 不使用路由守卫，本地模式继续免登录。
5. 只允许修改 LandingHeaderActions，不改其他 Landing 视觉实现。
6. 用户菜单提取为独立 V3 组件并承接 guest/admin/退出状态。
7. 不增加任何依赖、Domain 模型或后端接口。

Plan 批准后，下一阶段会把上述文件和模块拆成可顺序执行、每项带验证方式的
`task.md`。
