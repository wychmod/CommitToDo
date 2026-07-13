# CommitToDo 首页模拟认证弹窗 Checklist

> 状态：待用户审批
>
> 文档阶段：4 / 4（验收设计）
>
> 需求基线：`./spec.md`（已批准）
>
> 技术基线：`./plan.md`（已批准）
>
> 执行基线：`./task.md`（已批准）
>
> 视觉基准：
> `C:/Users/Administrator.SY-202401060959/AppData/Local/Temp/codex-clipboard-7a4d7ab4-3938-47a3-b9f8-e6ece1daf59e.png`
>
> 硬门槛：本文件批准前不得开始实现。批准后严格按 `task.md` 开发，完成后按本
> Checklist 逐项验收；任何失败项修复并复验后才可勾选。

---

## 1. 使用规则

### 1.1 勾选规则

1. `[ ]` 只在对应检查真实执行且满足“通过标准”后改为 `[x]`。
2. 自动化测试通过不能替代真实浏览器视觉和交互检查。
3. 浏览器肉眼通过不能替代单元测试、类型检查和静态安全审计。
4. 发现失败时记录实际结果、截图或日志、原因和修复提交；修复后重新执行完整检查。
5. 不能通过禁用 lint、删除测试、放宽断言或更新无关快照来勾选项目。
6. 不得清理或覆盖用户原有未提交改动；所有范围审计都以 T01 的基线记录为准。

### 1.2 证据格式

每个检查项至少保留一种可复核证据：

| 类型 | 最低证据 |
| --- | --- |
| 命令 | 完整命令、exit code、通过/失败数量、关键 warning |
| 自动化测试 | 测试文件、用例名称、结果；失败修复后需保留复验结果 |
| 浏览器交互 | URL、输入、动作、最终可见文字或状态 |
| 视觉 | 视口、截图、参考图对比结论、差异说明 |
| Storage | key、存储位置、序列化字段；不得记录密码输入值 |
| IndexedDB | 登录/退出前后的数据库名、表名、记录数或稳定样本 ID |
| 可访问性 | 当前焦点、键盘路径、ARIA 属性和 live region 结果 |

建议使用以下记录格式：

```text
检查项：AC2-01
结果：PASS / FAIL
环境：Chromium，1536 x 1024，/login
证据：截图名或命令摘要
备注：与参考图的有意差异/修复说明
```

### 1.3 全局失败条件

出现以下任一情况时，整体验收直接失败，即使其他项已通过：

- 认证流程发出真实网络请求、打开 GitHub/OAuth 页面或生成 Token。
- localStorage、sessionStorage、URL、日志或 Toast 中出现用户输入密码。
- 退出登录清除了 IndexedDB 业务数据或现有设置。
- 未登录用户被强制跳转登录，无法进入本地工作台。
- 修改了 Plan 明确禁止的 Landing、Domain、Application、Data、DI 或 Dexie 文件。
- 1536 x 1024 或任一指定移动视口存在重叠、裁切、横向滚动或不可达主按钮。
- 四项质量门禁任一 exit code 非 0。

---

## 2. 验收前环境与基线

- [ ] **ENV-01 工作区基线已记录。**
  - 验证方式：执行 `git status --short`，并读取 T01 的既有改动记录。
  - 通过标准：能区分本功能改动与用户原有改动；没有执行 reset、checkout、clean。
  - 失败标准：无法说明某项改动来源，或用户原有文件被覆盖/删除。

- [ ] **ENV-02 依赖满足且没有新增包。**
  - 验证方式：确认现有依赖包含 React Router、Zustand、Radix Dialog、Lucide、Vitest、
    Testing Library；比较 `package.json` 和 lockfile 前后差异。
  - 通过标准：功能只使用现有依赖，`package.json` 和 lockfile 没有本任务变化。
  - 失败标准：为本功能安装新包，或依赖文件产生无解释改动。

- [ ] **ENV-03 开发服务可用。**
  - 验证方式：执行 `npm run dev -- --host 127.0.0.1`，记录实际端口；访问 `/`。
  - 通过标准：首页非空、无 Vite/React 错误覆盖层，控制台无本功能相关 error。
  - 失败标准：服务无法启动、页面空白或存在运行时错误。

- [ ] **ENV-04 浏览器证据环境固定。**
  - 验证方式：记录浏览器名称和版本、设备缩放 100%、主题、reduced-motion 状态。
  - 通过标准：桌面参考验收使用 1536 x 1024；其余视口按本清单指定值执行。
  - 失败标准：截图视口或缩放未知，导致结果无法与参考图比较。

- [ ] **ENV-05 本地数据保护基线已建立。**
  - 验证方式：在工作台创建或选择稳定的仓库、分支、任务、提交和设置样本，记录其
    IndexedDB 表、记录数及至少一个稳定 ID。
  - 通过标准：后续退出验收能够用同一组样本证明数据未变化。
  - 失败标准：没有退出前证据，无法证明本地数据保留。

---

## 3. Spec 验收标准

### AC1 视觉还原

- [ ] **AC1-01 首页背景与遮罩层级正确。**
  - 验证方式：1536 x 1024 直接访问 `/login`，与参考图并排观察。
  - 通过标准：首页顶部导航、Hero 分支流和工作台预览仍可辨认但不可交互；遮罩均匀
    压暗，无重度模糊、纯黑遮死或局部漏亮。
  - 失败标准：背景消失、重新变成独立登录页、背景可点击或遮罩影响弹窗可读性。
  - 证据：全视口截图和浏览器元素层级记录。

- [ ] **AC1-02 Dialog 构图接近视觉基准。**
  - 验证方式：测量 1536 x 1024 下 Content 边界。
  - 通过标准：宽度约 488px（允许视觉微调但不得明显宽于 520px 或窄于 456px），
    水平居中、略高于垂直中心；最大高度不超视口减 48px；圆角不超过 8px。
  - 失败标准：比例像通用大卡片、位置偏斜、底部裁切或依赖负 top 导致低屏溢出。
  - 证据：带尺寸标注截图。

- [ ] **AC1-03 信息结构与参考图一致。**
  - 验证方式：从上至下检查品牌栏、分支视觉、标题说明、登录/注册 Tab、表单、
    分隔线、GitHub 按钮、账号入口和可信说明。
  - 通过标准：所有区域顺序一致，视觉层级明确，弹窗内没有嵌套卡片。
  - 失败标准：缺少区域、顺序错误、重复大标题或卡片套卡片。

- [ ] **AC1-04 品牌和分支视觉具有 CommitToDo 识别度。**
  - 验证方式：检查白底 Git 分支 Logo、CommitToDo 品牌名、绿色/青色分支路径、节点和
    右侧提交勾。
  - 通过标准：SVG 清晰、比例克制、不抢表单；无外部图片依赖和无限动画。
  - 失败标准：使用通用插画、Emoji、低清素材或复制首页粒子 canvas。

- [ ] **AC1-05 Tab、字段和按钮样式符合 V3。**
  - 验证方式：检查颜色、字体、圆角、边框、focus ring、控件高度和图标。
  - 通过标准：当前 Tab 为绿色文字加平直底线；输入约 46-48px；主按钮全宽；GitHub
    为描边次按钮；颜色来自 `--v3-*`，按钮图标来自 Lucide。
  - 失败标准：胶囊 Tab、过大圆角、玻璃拟态、裸 hex、手绘按钮 SVG 或一片单调绿色。

- [ ] **AC1-06 所有认证视图宽度稳定。**
  - 验证方式：依次打开 `/login`、`/signup` 和忘记密码视图。
  - 通过标准：视图切换时 Dialog 宽度不变，标题、错误、loading 不导致横向抖动。
  - 失败标准：注册或错误状态让弹窗宽度突变、按钮或文本跳位。

- [ ] **AC1-07 视觉差异账本已完成。**
  - 验证方式：逐项记录参考图、当前截图、差异和处理结论。
  - 通过标准：仅保留已批准的差异，例如“邮箱”改“账号”；其余明显差异已修复或有
    产品/可访问性理由。
  - 失败标准：以“差不多”代替对比，或存在未解释的布局、色彩、层级差异。

### AC2 登录成功

- [ ] **AC2-01 固定凭据登录成功。**
  - 验证方式：`/login` 输入账号 `admin`、密码 `admin`，点击“登录”。
  - 通过标准：按钮出现约 450ms 可观察 loading，重复提交被禁用，随后出现成功状态并
    `replace` 到 `/workspace`。
  - 失败标准：立即无反馈跳转、重复创建 operation、停留 loading 或使用 push 留下无效页。

- [ ] **AC2-02 登录成功会话字段正确。**
  - 验证方式：检查 Zustand session 和对应 Web Storage JSON。
  - 通过标准：version=1、username=admin、provider=credentials、合法 ISO signedInAt、
    persistence 与复选框一致。
  - 失败标准：字段缺失、provider 错误、时间无效或包含未计划字段。

- [ ] **AC2-03 用户菜单展示 admin 状态。**
  - 验证方式：在 `/workspace` 打开顶部用户菜单。
  - 通过标准：触发器显示 A；菜单显示 `admin`、`账号密码演示登录` 和业务数据仍在本机。
  - 失败标准：仍显示 Local User、本地模式、错误 provider 或强制同步暗示。

- [ ] **AC2-04 登录成功测试可重复。**
  - 验证方式：运行 Store 和 AuthDialog 的 admin/admin 成功用例，使用 fake timers。
  - 通过标准：测试无真实等待、无 act warning、成功回调只调用一次。
  - 失败标准：测试偶发失败、依赖真实 450ms 或重复导航。

### AC3 登录失败

- [ ] **AC3-01 空账号错误正确。**
  - 验证方式：密码输入 `admin`，账号留空提交。
  - 通过标准：显示“请输入账号”，账号具有 `aria-invalid`，焦点落到账号，不导航。
  - 失败标准：浏览器原生气泡代替界面错误、焦点未知或写入 session。

- [ ] **AC3-02 空密码错误正确。**
  - 验证方式：账号输入 `admin`，密码留空提交。
  - 通过标准：显示“请输入密码”，焦点落到密码，不导航、不创建 session。
  - 失败标准：错误位置不对应、密码字段未关联描述或发生认证调用。

- [ ] **AC3-03 两字段为空时首错顺序稳定。**
  - 验证方式：空表单提交。
  - 通过标准：两个必填错误均显示，焦点优先账号，错误顺序与视觉顺序一致。
  - 失败标准：只显示一个无关错误或焦点跳到关闭按钮。

- [ ] **AC3-04 错误凭据提示正确。**
  - 验证方式：输入 `wrong` / `wrong`。
  - 通过标准：loading 后显示“账号或密码不正确，请使用 admin / admin”，留在 `/login`，
    session 为空且两处 auth storage 无记录。
  - 失败标准：导航、成功提示、真实 alert 或保存错误凭据。

- [ ] **AC3-05 错误可通过编辑清除。**
  - 验证方式：触发字段错误和凭据错误后分别修改相关输入。
  - 通过标准：对应旧错误立即清除；无关字段错误保留；再次提交可正常校验。
  - 失败标准：必须刷新或切 Tab 才能清除，或输入变化清除所有无关错误。

- [ ] **AC3-06 错误状态可被读屏器感知。**
  - 验证方式：检查 `aria-describedby`、`aria-invalid` 和错误 live region。
  - 通过标准：字段错误与输入程序化关联，凭据错误被宣告且不重复轰炸。
  - 失败标准：错误只有颜色、DOM 无关联或每次渲染重复宣告。

### AC4 记住我

- [ ] **AC4-01 默认勾选记住我。**
  - 验证方式：清空认证 storage 后首次打开 `/login`。
  - 通过标准：“记住我”默认 checked，键盘可切换，命中区域至少 44px。
  - 失败标准：默认未选、仅文字可见不可操作或缺少 accessible name。

- [ ] **AC4-02 remember=true 只写 localStorage。**
  - 验证方式：保持勾选，admin/admin 登录后检查两处 storage。
  - 通过标准：localStorage 有唯一合法 auth key，sessionStorage 无该 key。
  - 失败标准：两处同时存在、写错 persistence 或出现密码/token。

- [ ] **AC4-03 remember=false 只写 sessionStorage。**
  - 验证方式：退出，取消勾选，再次 admin/admin 登录。
  - 通过标准：sessionStorage 有唯一合法 auth key，localStorage 无该 key。
  - 失败标准：写入 localStorage、两处冲突或刷新即丢失当前标签会话。

- [ ] **AC4-04 持久方式切换会清理旧记录。**
  - 验证方式：依次用 true、false、true 登录，每次检查两处 key。
  - 通过标准：任一时刻只有一个 storage 来源。
  - 失败标准：旧 local/session 记录残留，导致读取优先级影响登录态。

- [ ] **AC4-05 新页面会话行为正确。**
  - 验证方式：同一浏览器 profile 中，关闭登录页后新建独立页面访问 `/workspace`。
  - 通过标准：remember=true 仍显示 admin；remember=false 的新页面恢复本地模式；原页面
    刷新时 sessionStorage 会话仍有效。
  - 失败标准：两种方式行为相同，或 guest 被强制送往 `/login`。

- [ ] **AC4-06 损坏/旧版 session 安全回退。**
  - 验证方式：分别写入损坏 JSON、错误 version、非 admin username 后刷新。
  - 通过标准：损坏 auth key 被删除，应用回到 guest，本地工作台仍可使用，无白屏。
  - 失败标准：解析异常、错误账号被接受或清理其他 storage key。

- [ ] **AC4-07 密码从未持久化。**
  - 验证方式：扫描 localStorage、sessionStorage、Store session、URL、console；运行 storage 测试。
  - 通过标准：没有 `password`、用户输入密码、token、refreshToken 字段和值。
  - 失败标准：任一位置存在密码或认证秘密。

### AC5 注册闭环

- [ ] **AC5-01 注册视图完整。**
  - 验证方式：访问 `/signup`。
  - 通过标准：显示账号、密码、确认密码、协议复选框、“创建账户”和返回登录入口；
    标题为“创建你的工作区”。
  - 失败标准：字段缺失、仍显示登录文案或出现邮箱唯一性/验证码字段。

- [ ] **AC5-02 注册必填与首错焦点正确。**
  - 验证方式：空表单提交。
  - 通过标准：必填错误可见，焦点按账号、密码、确认密码、协议顺序定位首错。
  - 失败标准：只显示总错误、焦点离开 Dialog 或使用浏览器 alert。

- [ ] **AC5-03 密码长度规则正确。**
  - 验证方式：输入 4 位密码和相同确认密码，勾选协议。
  - 通过标准：提示密码至少 5 个字符，不进入 operation。
  - 失败标准：4 位通过、错误挂到账号或发出网络请求。

- [ ] **AC5-04 确认密码规则正确。**
  - 验证方式：输入不同的 password/confirmPassword。
  - 通过标准：确认密码字段显示不一致错误并获得首错焦点。
  - 失败标准：允许提交或清空原密码。

- [ ] **AC5-05 协议规则正确。**
  - 验证方式：输入合法三字段但不勾协议。
  - 通过标准：显示关联协议错误，不开始 loading。
  - 失败标准：未同意仍完成注册，或协议文案不可键盘操作。

- [ ] **AC5-06 有效注册形成诚实闭环。**
  - 验证方式：输入任意非 admin 账号、至少 5 位且一致的密码，勾选协议后提交。
  - 通过标准：显示 loading；不创建该账号；随后 `replace('/login')`，账号预填 `admin`、
    密码为空，并显示“演示注册完成，请使用 admin / admin 登录”。
  - 失败标准：允许新凭据登录、自动填明文密码、后退回到已完成表单或暗示真实账号创建。

- [ ] **AC5-07 注册不产生认证副作用。**
  - 验证方式：注册前后比较 session、两处 storage、网络日志。
  - 通过标准：session 仍为空、无 auth key、无 fetch/XHR/beacon/WebSocket。
  - 失败标准：注册自动登录、保存注册输入或发生网络请求。

### AC6 忘记密码闭环

- [ ] **AC6-01 忘记密码留在同一 Dialog。**
  - 验证方式：`/login` 点击“忘记密码”。
  - 通过标准：URL 仍为 `/login`，同一 Dialog 切换标题/说明，未打开第二层弹窗。
  - 失败标准：新页面、新 modal、URL 变成未计划路径或背景重新挂载。

- [ ] **AC6-02 恢复说明诚实。**
  - 验证方式：读取恢复视图文案。
  - 通过标准：明确说明不会发送邮件，固定账号和密码均为 admin；无邮箱输入和验证码。
  - 失败标准：出现“邮件已发送”等虚假成功文案。

- [ ] **AC6-03 恢复操作完整。**
  - 验证方式：点击“恢复演示账号”。
  - 通过标准：显示 recovery loading、防重复；完成后回登录，预填 admin、密码为空，并显示
    “演示密码已恢复为 admin”。
  - 失败标准：创建 session、自动填密码、按钮永久 loading 或 notice 缺失。

- [ ] **AC6-04 返回登录行为正确。**
  - 验证方式：进入恢复视图后点击“返回登录”。
  - 通过标准：回标准登录视图，不发生网络请求，不残留 recovery operation。
  - 失败标准：关闭整个 Dialog、导航 workspace 或保留错误状态。

- [ ] **AC6-05 恢复无外部副作用。**
  - 验证方式：比较 session/storage/网络日志。
  - 通过标准：无 session、无 storage 写入、无网络请求。
  - 失败标准：任一外部副作用存在。

### AC7 GitHub 模拟闭环

- [ ] **AC7-01 GitHub 操作有独立 loading。**
  - 验证方式：点击“使用 GitHub 继续”。
  - 通过标准：只显示 GitHub loading 文案，登录和 GitHub 提交均防并发，关闭按钮仍可用。
  - 失败标准：整个 Dialog 卡死、可重复提交或错误显示 credentials loading。

- [ ] **AC7-02 GitHub 成功状态诚实。**
  - 验证方式：等待模拟完成。
  - 通过标准：出现“GitHub 演示登录成功”，随后进入 `/workspace`；用户菜单显示 admin 和
    `GitHub 演示登录`。
  - 失败标准：暗示 OAuth 已授权、provider=credentials 或成功反馈不可观察。

- [ ] **AC7-03 GitHub 不访问外部服务。**
  - 验证方式：监控 popup、页面、Network 面板并静态搜索 `window.open`、`fetch`、OAuth SDK。
  - 通过标准：无新窗口、无 GitHub 导航、无任何认证网络请求。
  - 失败标准：打开外链、请求 GitHub 或触发第三方 SDK。

- [ ] **AC7-04 GitHub 遵循 remember 设置。**
  - 验证方式：分别勾选和取消记住我执行 GitHub 模拟登录。
  - 通过标准：session provider=github，persistence 和 storage 位置与当前复选框一致。
  - 失败标准：强制 local、忽略当前选项或两处 storage 冲突。

### AC8 本地模式保持

- [ ] **AC8-01 未登录可直接进入工作台。**
  - 验证方式：清空 auth key，从首页点击顶部“开始使用”、Hero“进入工作台”和底部 CTA。
  - 通过标准：三处均直接进入 `/workspace`，不显示登录错误或路由守卫。
  - 失败标准：任一入口打开认证、跳回首页或拒绝访问。

- [ ] **AC8-02 Guest 用户菜单保持本地模式。**
  - 验证方式：未登录进入工作台并打开菜单。
  - 通过标准：显示“本地模式”“数据保存在本机 IndexedDB”、登录演示账号和设置入口。
  - 失败标准：显示 admin、错误状态或“退出本地模式”不可用动作。

- [ ] **AC8-03 退出只清认证会话。**
  - 验证方式：登录后在用户菜单点击“退出登录”。
  - 通过标准：Popover 关闭，session 和两处 auth key 清除，`replace('/')`。
  - 失败标准：退出无响应、后退恢复已登录页或清除其他 storage key。

- [ ] **AC8-04 IndexedDB 数据在退出前后相同。**
  - 验证方式：使用 ENV-05 样本，对比仓库、分支、任务、提交、设置记录数和稳定 ID。
  - 通过标准：所有业务数据和设置保持不变。
  - 失败标准：记录减少、数据库被清空、设置恢复默认或 schema 变化。

- [ ] **AC8-05 退出后可再次登录。**
  - 验证方式：退出回 `/` 后点击“登录”。
  - 通过标准：正常打开空密码登录视图，可再次 admin/admin 登录。
  - 失败标准：Store 残留 operation/error、Dialog 空白或必须刷新。

### AC9 URL 与历史记录

- [ ] **AC9-01 `/login` 可直接访问和刷新。**
  - 验证方式：地址栏输入 `/login` 并刷新。
  - 通过标准：Landing 背景加登录 Dialog，URL 保持 `/login`，无 404/白屏。
  - 失败标准：跳 `/`、独立登录页或服务端 fallback 失败。

- [ ] **AC9-02 `/signup` 可直接访问和刷新。**
  - 验证方式：地址栏输入 `/signup` 并刷新。
  - 通过标准：Landing 背景加注册 Dialog，URL 保持 `/signup`。
  - 失败标准：错误 Tab、404 或首页重新闪烁多次。

- [ ] **AC9-03 Tab 与 URL 双向一致。**
  - 验证方式：在登录/注册 Tab 间点击和用方向键切换。
  - 通过标准：login 对应 `/login`，signup 对应 `/signup`；内容、title、description 同步。
  - 失败标准：URL 与选中 Tab 不一致或出现短暂错误表单。

- [ ] **AC9-04 浏览器后退/前进正确。**
  - 验证方式：`/login -> /signup` 后执行后退、前进。
  - 通过标准：依次回 login、进 signup；Landing 实例不重新挂载。
  - 失败标准：关闭 Dialog、重置首页粒子或历史记录形成循环。

- [ ] **AC9-05 关闭使用 replace。**
  - 验证方式：分别用关闭按钮、Escape、遮罩关闭，再按浏览器后退。
  - 通过标准：回 `/`，后退不会立刻重开刚关闭的认证弹窗。
  - 失败标准：关闭使用 push 导致后退重开，或三种关闭方式行为不一致。

- [ ] **AC9-06 登录成功使用 replace。**
  - 验证方式：admin/admin 登录到 workspace 后按后退。
  - 通过标准：不会回到可提交的登录表单。
  - 失败标准：后退重现旧密码或成功前状态。

- [ ] **AC9-07 已登录访问认证路由稳定。**
  - 验证方式：保持 admin session，直接访问 `/login` 和 `/signup`。
  - 通过标准：均 replace 到 `/workspace`，不闪现可操作表单。
  - 失败标准：允许重复登录、显示 signup 或产生重定向循环。

- [ ] **AC9-08 Landing 持续挂载。**
  - 验证方式：运行 mount-count 测试，并在浏览器观察 `/login` 与 `/signup` 切换。
  - 通过标准：Landing mount count 保持 1，滚动位置和 Hero 动画状态不重置。
  - 失败标准：每次 Tab 切换重新初始化 Landing 或粒子画布。

### AC10 键盘与读屏

- [ ] **AC10-01 登录初始焦点正确。**
  - 验证方式：从首页用键盘激活“登录”，或直接访问 `/login`。
  - 通过标准：焦点进入登录账号输入框，且 focus ring 清晰。
  - 失败标准：焦点留在背景、body 或关闭按钮。

- [ ] **AC10-02 注册初始焦点正确。**
  - 验证方式：直接访问 `/signup`。
  - 通过标准：焦点进入注册账号输入框。
  - 失败标准：进入登录字段或无可见焦点。

- [ ] **AC10-03 焦点被限制在 Dialog。**
  - 验证方式：连续 Tab/Shift+Tab 循环所有控件。
  - 通过标准：焦点按视觉顺序循环，不能进入背景导航或工作台预览。
  - 失败标准：焦点逃逸、跳过可操作控件或落在装饰 SVG。

- [ ] **AC10-04 Tab 键盘模型正确。**
  - 验证方式：聚焦认证 Tab，使用 ArrowLeft/ArrowRight、Enter、Space。
  - 通过标准：roving tabIndex、aria-selected 和 URL/内容同步；disabled 时不切换。
  - 失败标准：两个 Tab 同时可 Tab 聚焦、方向键无效或状态不同步。

- [ ] **AC10-05 Enter 提交当前表单。**
  - 验证方式：在登录和注册最后字段按 Enter。
  - 通过标准：只提交当前 form 一次，执行同按钮一致的校验和 loading。
  - 失败标准：同时触发 GitHub、重复提交或关闭 Dialog。

- [ ] **AC10-06 Escape 和关闭后焦点恢复。**
  - 验证方式：从首页打开后按 Escape；再用关闭按钮重复。
  - 通过标准：Dialog 关闭到 `/`，焦点回 `#landing-login-trigger`。
  - 失败标准：焦点丢到 body、背景错误元素或认证立即重开。

- [ ] **AC10-07 遮罩点击关闭可用且不误触。**
  - 验证方式：点击 Content 外 Overlay，再点击 Content 内空白。
  - 通过标准：外部点击关闭并恢复焦点；内部点击不关闭。
  - 失败标准：表单内点击导致关闭，或背景按钮被穿透触发。

- [ ] **AC10-08 密码显示按钮可访问。**
  - 验证方式：键盘激活显示/隐藏按钮。
  - 通过标准：input type 在 password/text 间切换，accessible name 随状态明确，值和焦点不丢失。
  - 失败标准：按钮无名称、图标不可聚焦或切换清空密码。

- [ ] **AC10-09 Dialog 语义完整。**
  - 验证方式：检查 role=dialog、aria-modal、动态 title/description 关联。
  - 通过标准：登录、注册、恢复三种视图均有正确名称和说明。
  - 失败标准：无名称 Dialog、隐藏标题未关联或视图切换后读到旧说明。

- [ ] **AC10-10 状态对读屏器可感知。**
  - 验证方式：检查 loading、错误、warning、success 的 live region/role。
  - 通过标准：重要变化被适度宣告；纯装饰图标 aria-hidden。
  - 失败标准：状态只靠颜色、loading 无文字或装饰元素进入无障碍树。

### AC11 响应式

- [ ] **AC11-01 1536 x 1024 桌面通过。**
  - 验证方式：完整走登录默认、错误、注册、恢复视图。
  - 通过标准：弹窗和首页背景完整，无横向滚动、重叠、裁切或文字溢出。
  - 失败标准：任何状态破坏构图或主操作不可达。

- [ ] **AC11-02 1024 x 768 紧凑桌面通过。**
  - 验证方式：检查长注册表单、错误状态和 Overlay 滚动。
  - 通过标准：Dialog 居中且可纵向滚动，关闭、标题、主按钮、可信说明均可到达。
  - 失败标准：固定居中导致顶部/底部裁切。

- [ ] **AC11-03 768 x 1024 平板通过。**
  - 验证方式：检查背景导航现有简化行为和窄 Dialog。
  - 通过标准：Content 不超视口，背景没有因认证样式发生新断点错误。
  - 失败标准：Dialog 贴边异常、导航遮挡或出现横向滚动。

- [ ] **AC11-04 390 x 844 手机通过。**
  - 验证方式：检查登录、错误、注册、恢复、GitHub loading。
  - 通过标准：全屏 100dvh、无圆角/外阴影，品牌关闭栏可达，内容独立滚动，控件至少
    44 x 44px，无横向滚动。
  - 失败标准：仍是悬浮小卡、底部按钮被裁切或关闭按钮滚走后不可恢复。

- [ ] **AC11-05 360 x 800 小屏通过。**
  - 验证方式：显示最长错误和成功中文文案，完整提交 admin/admin。
  - 通过标准：文本自然换行、不遮挡相邻内容，主按钮和可信说明可达。
  - 失败标准：长词/文案溢出、按钮高度抖动或页面横向移动。

- [ ] **AC11-06 软键盘/低高度通过。**
  - 验证方式：手机模拟器聚焦账号、密码和确认密码，缩短 visual viewport。
  - 通过标准：当前输入不被永久遮住，可滚动到主按钮并完成提交；safe-area 有效。
  - 失败标准：必须关闭键盘才能看到按钮，或 Content 被双重滚动锁死。

### AC12 动效与性能

- [ ] **AC12-01 打开和关闭动效克制。**
  - 验证方式：正常 motion 下反复打开/关闭。
  - 通过标准：Overlay 120-200ms 淡入，Content 约 200ms opacity + 8px 上移；无夸张缩放。
  - 失败标准：明显弹跳、长动画、缩放造成文字模糊或布局位移。

- [ ] **AC12-02 Tab 和状态切换无布局抖动。**
  - 验证方式：快速切 login/signup，触发错误、loading、notice。
  - 通过标准：宽度固定，内容只发生必要的纵向变化，按钮/标题不横跳。
  - 失败标准：弹窗重排闪烁、页面滚动位置跳变或按钮尺寸改变。

- [ ] **AC12-03 reduced-motion 被尊重。**
  - 验证方式：启用 `prefers-reduced-motion: reduce` 后打开、切换、loading。
  - 通过标准：位移动画和 branch 淡入取消；状态仍即时可辨；loading 有静态图标和文字。
  - 失败标准：仍有明显位移/无限旋转，或取消动画后状态不可理解。

- [ ] **AC12-04 Landing 不被重复实例化。**
  - 验证方式：mount-count 自动化测试和浏览器性能观察。
  - 通过标准：`/`、`/login`、`/signup` 间 Landing 保持单实例，粒子 canvas 数量不增加。
  - 失败标准：切换后 canvas/监听器累积或动画从头开始。

- [ ] **AC12-05 打开认证不重载首页数据。**
  - 验证方式：观察 Network、React 状态和 IndexedDB 查询；打开/关闭多次。
  - 通过标准：无新增首页数据请求/数据库重载，背景状态和滚动位置保持。
  - 失败标准：每次打开触发加载、闪屏或数据重新初始化。

- [ ] **AC12-06 动画实现合成友好。**
  - 验证方式：检查 CSS 和 Performance；确认主要动画只使用 opacity/transform。
  - 通过标准：没有对整个首页实时 blur/filter，没有无限 branch 动画。
  - 失败标准：持续高开销重绘、滚动明显卡顿或背景滤镜耗时异常。

### AC13 工程门禁

- [ ] **AC13-01 ESLint 通过。**
  - 验证方式：执行 `npm run lint`。
  - 通过标准：exit code 0；新增/修改文件 0 error；既有 warning 单独说明。
  - 失败标准：任一 error，或通过禁用规则掩盖问题。

- [ ] **AC13-02 TypeScript 构建检查通过。**
  - 验证方式：执行 `npx tsc -b`。
  - 通过标准：exit code 0，无 strict、unused、ref 或路由类型错误。
  - 失败标准：任一 TS error 或使用 `any` 规避类型。

- [ ] **AC13-03 全量测试通过。**
  - 验证方式：执行 `npm test`。
  - 通过标准：exit code 0，0 failed、0 unhandled error、无新增 act warning。
  - 失败标准：跳过/only 测试、删除断言或存在偶发失败。

- [ ] **AC13-04 生产构建通过。**
  - 验证方式：执行 `npm run build`。
  - 通过标准：exit code 0；构建产物成功；体积 warning 如为既有问题需记录。
  - 失败标准：构建失败、认证样式未打包或新增不可解释的大体积依赖。

- [ ] **AC13-05 认证相关测试覆盖完整。**
  - 验证方式：单独运行 validation、storage、Store、Dialog、Layout、Header、UserMenu、
    AppShell 测试。
  - 通过标准：所有目标文件全绿，覆盖成功、失败、边界、路由、焦点和持久化。
  - 失败标准：只测快照/结构，缺少关键行为或测试依赖真实网络/时间。

---

## 4. 集成检查

- [ ] **INT-01 路由结构未破坏既有页面。**
  - 验证方式：检查 `src/app.tsx` 并访问 workspace、repository、commits、graph、heatmap、
    search、settings 及既有 compatibility redirects。
  - 通过标准：只新增共享 Landing/Auth 父路由；原路径和 wildcard 顺序保持。
  - 失败标准：既有页面 404、重定向变化或 Provider/basename 层级改变。

- [ ] **INT-02 Landing 修改边界正确。**
  - 验证方式：`git diff -- src/presentation/screens/landing`。
  - 通过标准：只有 `landing-header-actions.tsx` 及对应测试有本任务差异。
  - 失败标准：landing-page、landing-theme、Hero、Workbench、Value、BottomCta 被修改。

- [ ] **INT-03 认证样式自包含。**
  - 验证方式：检查 import 链和全局入口。
  - 通过标准：认证页面按需引入 `v3-tokens.css` 和 `auth-modal.css`；`main.tsx`、全局入口
    未无条件引入认证私有样式。
  - 失败标准：样式污染既有页面或 auth CSS 被放入 Landing 私有主题。

- [ ] **INT-04 V3 Token 使用一致。**
  - 验证方式：扫描认证 TSX/CSS 中裸 hex、`--color-*` 和 Landing 私有 class。
  - 通过标准：颜色/圆角/阴影使用 `--v3-*`，同页不混用应用主题 Token。
  - 失败标准：裸色散落、使用 `.v3-btn/.v3-card` 私有 class 或修改 Token 值。

- [ ] **INT-05 Presentation 分层正确。**
  - 验证方式：扫描认证 imports。
  - 通过标准：无 `data`、`domain`、`application`、DI、Dexie 依赖；Store 不依赖 Router。
  - 失败标准：模拟认证被建成伪 Repository/UseCase 或直接触碰数据库。

- [ ] **INT-06 Store 订阅粒度正确。**
  - 验证方式：检查 LandingHeaderActions、AuthDialog、V3UserMenu 的 Zustand 用法。
  - 通过标准：组件使用 selector 读取必要字段，不订阅整个 Store，不存重复 isAuthenticated。
  - 失败标准：输入状态导致顶栏/壳层无意义重渲染，或 session 与布尔状态可能冲突。

- [ ] **INT-07 Storage adapter 是会话唯一持久入口。**
  - 验证方式：搜索 auth key 和 local/sessionStorage 调用。
  - 通过标准：只有 adapter 直接读写认证 key；表单和 UI 不直接序列化。
  - 失败标准：多个模块各自写 storage 或 persist 整个 Store。

- [ ] **INT-08 用户菜单替换不破坏壳层。**
  - 验证方式：运行 V3UserMenu/AppShell 测试，浏览 guest/admin/github 三种状态。
  - 通过标准：Popover 尺寸、设置入口、focus 样式和顶部布局保持；旧内嵌 UserMenu 删除干净。
  - 失败标准：顶栏位移、重复菜单、unused import 或 guest 无登录入口。

- [ ] **INT-09 operation 生命周期可靠。**
  - 验证方式：对 login/github/signup/recovery 运行 success/failure/异常测试。
  - 通过标准：operation 开始时正确、结束或异常后总是回 null，按钮可再次使用。
  - 失败标准：永久 loading、并发提交或一个流程污染另一个流程。

- [ ] **INT-10 Storage 不可用时降级正确。**
  - 验证方式：mock `setItem` 抛错后执行 admin/admin。
  - 通过标准：返回 success + storage-unavailable warning，当前内存 session 有效并进入 workspace。
  - 失败标准：把存储失败误报为凭据错误、应用崩溃或隐藏持久化风险。

- [ ] **INT-11 关闭/重开不会泄漏敏感表单状态。**
  - 验证方式：输入密码并触发错误，关闭后重新打开 login/signup。
  - 通过标准：密码、错误、loading 清空；仅批准的 admin username preset 可保留在成功流程内。
  - 失败标准：旧密码、确认密码、错误或 success 在新流程中残留。

- [ ] **INT-12 控制台和网络面板健康。**
  - 验证方式：完成所有 E2E 场景期间持续收集 console 和 network。
  - 通过标准：无 React error、Radix aria warning、act warning、404 资源或认证网络请求。
  - 失败标准：任一未解释相关 warning/error/request。

---

## 5. 端到端用户场景

- [ ] **E2E-01 Guest 从首页登录并退出。**
  - 起点：清空 auth key，访问 `/`，保留 ENV-05 IndexedDB 样本。
  - 步骤：点击顶部登录 -> 输入 admin/admin -> 登录 -> 打开用户菜单 -> 退出。
  - 通过标准：路径依次 `/`、`/login`、`/workspace`、`/`；菜单先显示 admin，退出后恢复
    guest；IndexedDB 样本不变。
  - 失败标准：路径、菜单、storage 或数据任一不符合。

- [ ] **E2E-02 错误登录后修正成功。**
  - 起点：`/login` 空表单。
  - 步骤：空提交 -> wrong/wrong -> 修改为 admin/admin -> 提交。
  - 通过标准：依次看到字段错误、凭据错误、错误清除、loading 和成功；只在最后创建 session。
  - 失败标准：中途导航、错误不清除或错误凭据写入状态。

- [ ] **E2E-03 注册体验后使用固定账号登录。**
  - 起点：直接访问 `/signup`。
  - 步骤：触发四类校验 -> 输入合法任意注册值 -> 创建 -> 使用预填 admin 和手输 admin 密码登录。
  - 通过标准：注册不创建账号/session；回 `/login` 后密码为空；最终以 credentials 进入工作台。
  - 失败标准：注册值可登录、自动填密码或产生网络请求。

- [ ] **E2E-04 恢复演示账号后登录。**
  - 起点：`/login`。
  - 步骤：忘记密码 -> 恢复 -> 返回登录 -> 输入密码 admin -> 登录。
  - 通过标准：URL 在恢复阶段保持 `/login`，恢复 notice 正确，最终 credentials 登录成功。
  - 失败标准：打开第二弹窗、发送网络请求或恢复自动登录。

- [ ] **E2E-05 GitHub 模拟登录并识别 provider。**
  - 起点：guest `/login`。
  - 步骤：点击 GitHub -> 等待 -> 打开 workspace 用户菜单 -> 退出。
  - 通过标准：无 popup/network；菜单显示 GitHub 演示登录；退出恢复 guest。
  - 失败标准：provider 错误、外部导航或退出残留会话。

- [ ] **E2E-06 remember true/false 跨页面对比。**
  - 起点：同一浏览器 profile 的独立页面。
  - 步骤：remember=true 登录并关闭页面，新页面检查；退出后 remember=false 登录，刷新当前页，
    再关闭并新建独立页面检查。
  - 通过标准：true 新页面仍为 admin；false 当前页刷新仍为 admin、新页面为 guest。
  - 失败标准：local/session 语义不符合或两处 storage 同时存在。

- [ ] **E2E-07 URL、Tab 与历史导航。**
  - 起点：`/login`。
  - 步骤：切 signup -> 后退 -> 前进 -> 关闭 -> 后退。
  - 通过标准：login/signup 内容与路径同步；关闭后不会因后退立即重开；Landing mount 一次。
  - 失败标准：历史循环、空白视图或首页状态重置。

- [ ] **E2E-08 纯键盘移动端外的完整登录。**
  - 起点：桌面 `/`，不使用鼠标。
  - 步骤：Tab 到登录 -> Enter -> 填写 -> Tab 遍历 -> 切 Tab/返回 -> Enter 登录 -> 打开菜单退出。
  - 通过标准：所有关键动作可完成，焦点始终可见、顺序合理、不进入背景。
  - 失败标准：任一步必须鼠标、焦点丢失或快捷键触发错误动作。

---

## 6. 回归检查

- [ ] **REG-01 首页 `/` 无认证时视觉不变。**
  - 验证方式：guest 访问 `/`，与本功能前基线或既有截图比较。
  - 通过标准：Hero、粒子、工作台预览、价值区、Bottom CTA 的布局和动画无变化。
  - 失败标准：认证 CSS 泄漏、首屏亮度/间距/层级变化。

- [ ] **REG-02 首页非登录导航不变。**
  - 验证方式：检查功能、定价、文档、更新日志、主题切换等既有动作。
  - 通过标准：目标和行为保持现状。
  - 失败标准：因 header auth 接入造成链接、主题或移动导航回归。

- [ ] **REG-03 所有“开始使用”仍免登录。**
  - 验证方式：分别点击顶部、Hero、Bottom CTA。
  - 通过标准：均直接到 `/workspace`。
  - 失败标准：任一被错误改为 `/login`。

- [ ] **REG-04 工作台本地业务功能可用。**
  - 验证方式：guest 和 admin 各执行一次查看仓库、切分支、勾任务、查看提交。
  - 通过标准：认证状态不改变业务数据读写能力。
  - 失败标准：admin/guest 之一出现数据缺失、权限错误或刷新异常。

- [ ] **REG-05 设置和主题保持。**
  - 验证方式：切换主题或一个稳定设置，登录/退出后检查。
  - 通过标准：设置值不因 auth session 改变。
  - 失败标准：退出重置设置或认证 Dialog 混用错误 Token。

- [ ] **REG-06 其他 V3 页面布局不变。**
  - 验证方式：访问 repository、insights/graph、heatmap、search、settings 的代表页。
  - 通过标准：顶部命令栏和内容无重叠、跳动或主题污染。
  - 失败标准：新用户菜单或 CSS 使壳层变形。

- [ ] **REG-07 PWA/Local-first 表达保持。**
  - 验证方式：首页和 guest 菜单检查文案与行为。
  - 通过标准：无需注册仍可用，数据默认本地保存；认证不暗示云同步已经实现。
  - 失败标准：文案冲突或登录成为强制条件。

- [ ] **REG-08 浏览器刷新无状态闪烁。**
  - 验证方式：有合法 local/session 会话时刷新 workspace。
  - 通过标准：Store 同步读取会话，不先明显显示 guest 再闪 admin。
  - 失败标准：可见状态闪烁、hydration 错误或白屏。

- [ ] **REG-09 兼容重定向与 wildcard 正常。**
  - 验证方式：运行既有路由测试并访问一个已知 compatibility path 和未知 path。
  - 通过标准：行为与改动前一致。
  - 失败标准：父路由吞掉其他路径或 wildcard 顺序改变。

- [ ] **REG-10 没有无关文件变化。**
  - 验证方式：执行 `git status --short`、`git diff --stat` 并对照 T01。
  - 通过标准：本任务文件与 Task 清单一致；用户原有改动保留且无内容回退。
  - 失败标准：出现格式化整库、生成物、依赖锁或无关模块变化。

---

## 7. 静态安全与范围审计

- [ ] **SEC-01 无真实认证调用。**
  - 验证命令：
    ```bash
    rg -n "fetch\(|axios|XMLHttpRequest|WebSocket|sendBeacon|window\.open|oauth|authorize" src/presentation/screens/auth src/presentation/stores
    ```
  - 通过标准：无实现调用；若测试或透明文案命中，逐条说明。
  - 失败标准：任何认证、注册、恢复、GitHub 外部调用。

- [ ] **SEC-02 无密码或 Token 持久字段。**
  - 验证命令：
    ```bash
    rg -n "password|token|refreshToken" src/presentation/stores/auth-session-storage.ts src/presentation/stores/demo-auth-store.ts
    ```
  - 通过标准：password 仅可出现在凭据比较输入和禁止持久化测试语境；session schema 无此字段。
  - 失败标准：序列化、日志、URL 或 session 中包含敏感字段。

- [ ] **SEC-03 无类型与视觉违规。**
  - 验证命令：
    ```bash
    rg -n "\bany\b|#[0-9a-fA-F]{3,8}|--color-|\.v3-(btn|card)" src/presentation/screens/auth src/presentation/components/v3/v3-user-menu.tsx
    ```
  - 通过标准：无 `any`、裸 hex、主题混用或 Landing 私有 class；合法测试文本需说明。
  - 失败标准：任一未解释违规。

- [ ] **SEC-04 无越层依赖。**
  - 验证命令：
    ```bash
    rg -n "@/(data|domain|application)|injection-container|Dexie" src/presentation/screens/auth src/presentation/stores/demo-auth-store.ts
    ```
  - 通过标准：无匹配。
  - 失败标准：模拟认证触碰业务层、DI 或数据库。

- [ ] **SEC-05 Landing 只读边界未扩大。**
  - 验证命令：`git diff --name-only -- src/presentation/screens/landing`。
  - 通过标准：只有 header actions 和其测试。
  - 失败标准：其他 Landing 文件有本任务差异。

- [ ] **SEC-06 依赖和入口未变化。**
  - 验证方式：检查 `package.json`、lockfile、`src/main.tsx` 和全局样式入口 diff。
  - 通过标准：无本任务差异。
  - 失败标准：新增依赖或全局引入认证样式。

- [ ] **SEC-07 差异格式干净。**
  - 验证命令：`git diff --check`。
  - 通过标准：无 trailing whitespace、冲突标记或空白错误。
  - 失败标准：命令输出任一错误。

---

## 8. 最终交付门槛

- [ ] **REL-01 13 条 Spec 验收标准全部通过。**
  - 通过标准：AC1-AC13 下所有子项均为 `[x]`，且每个 AC 至少有一项自动化或浏览器证据。
  - 失败标准：存在未执行、失败、无证据或被标记为延期处理的子项。

- [ ] **REL-02 42 个 Task 全部完成并逐项验证。**
  - 通过标准：T01-T42 均有完成记录；依赖顺序未跳过；测试先行任务保留预期红灯证据。
  - 失败标准：只报告最终 build，无法证明中间验证，或越过失败任务继续开发。

- [ ] **REL-03 集成、E2E、回归和安全检查全部通过。**
  - 通过标准：INT、E2E、REG、SEC 项全部 `[x]`。
  - 失败标准：任何一项失败或因“自动化已通过”跳过真实浏览器。

- [ ] **REL-04 视觉证据完整。**
  - 通过标准：至少保留 1536 x 1024 `/login`、1536 x 1024 `/signup`、390 x 844
    登录、360 x 800 注册/错误状态截图，以及参考图差异账本。
  - 失败标准：只有裁切组件图、没有首页背景，或未覆盖 mobile。

- [ ] **REL-05 交付报告可复核。**
  - 通过标准：报告包含改动文件、四项质量门禁结果、目标测试结果、浏览器/视口、核心路径、
    storage 与 IndexedDB 证据、已批准视觉差异、剩余风险。
  - 失败标准：只写“已完成/测试通过”，没有命令和观察证据。

- [ ] **REL-06 没有未说明风险。**
  - 通过标准：所有 warning、浏览器差异、视觉偏差和测试限制都有结论；不存在 P0/P1/P2 未解决项。
  - 失败标准：已知问题被遗漏、隐藏或留给用户自行发现。

---

## 9. 追踪矩阵

| Spec 验收标准 | 主要 Checklist | 主要 Task |
| --- | --- | --- |
| AC1 视觉还原 | AC1-01 至 AC1-07、REL-04 | T10-T14、T20-T23、T33、T37 |
| AC2 登录成功 | AC2-01 至 AC2-04、E2E-01 | T08-T09、T15-T16、T29-T31、T38 |
| AC3 登录失败 | AC3-01 至 AC3-06、E2E-02 | T04-T05、T08-T09、T16、T31 |
| AC4 记住我 | AC4-01 至 AC4-07、E2E-06 | T06-T09、T31、T38 |
| AC5 注册闭环 | AC5-01 至 AC5-07、E2E-03 | T05、T09、T18、T22、T32 |
| AC6 忘记密码 | AC6-01 至 AC6-05、E2E-04 | T09、T19、T22、T32 |
| AC7 GitHub 模拟 | AC7-01 至 AC7-04、E2E-05 | T09、T17、T31-T32 |
| AC8 本地模式 | AC8-01 至 AC8-05、REG-03/04 | T27-T30、T34、T38 |
| AC9 URL/历史 | AC9-01 至 AC9-08、E2E-07 | T24-T27、T34、T38 |
| AC10 键盘/读屏 | AC10-01 至 AC10-10、E2E-08 | T13-T14、T20-T23、T31-T32、T39 |
| AC11 响应式 | AC11-01 至 AC11-06 | T10、T21、T33、T40 |
| AC12 动效/性能 | AC12-01 至 AC12-06 | T10、T12、T24-T25、T33、T37 |
| AC13 工程门禁 | AC13-01 至 AC13-05、REL-01/02 | T35-T42 |

覆盖缺口：无。

---

## 10. Checklist 审批重点

批准本 Checklist 即确认：

1. 13 条 Spec 验收标准均拆成可执行、可观察、可判定失败的检查项。
2. 视觉验收必须与用户参考图并排比较，且覆盖桌面、平板和手机。
3. admin/admin、错误登录、注册、恢复、GitHub、remember、退出和 guest 本地模式都必须
   形成真实浏览器闭环。
4. 自动化、键盘、读屏、Storage、IndexedDB、性能和改动范围证据都属于交付门槛。
5. 四项质量命令和所有 Checklist 项全部通过后，功能才算完成。

本文件批准后进入开发阶段，严格执行 `task.md` 的 T01-T42；开发完成后再按本清单
逐项验收并填写证据。
