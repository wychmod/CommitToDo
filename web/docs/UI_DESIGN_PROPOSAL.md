# CommitToDo Web 端企业级 UI/UX 设计规格

版本：2.0.0  
更新日期：2026-07-06  
适用范围：CommitToDo Web 端首页、工作台、任务系统、Git Graph、热力图、未来登录与后端协作能力  
文档目标：给设计师、前端工程师或其他大模型软件直接执行，用于重构 CommitToDo Web 端为企业级、可扩展、长期可维护的产品界面。

## 0. 核心结论

CommitToDo 不应该把首页的强视觉风格原样复制到所有工作页面。更好的方向是：

- 首页保持“科技感启动界面”：黑底、扫描线、终端感、渐变、高能动效，用来建立品牌记忆。
- 应用内界面保持同一套设计 DNA：深色底、青色/石灰色/琥珀色高亮、细线 HUD、局部扫描感、轻量终端语言。
- 应用内界面必须降噪：减少大字、减少装饰动效、减少高对比渐变，让用户长时间管理任务、分支、提交记录时不疲劳。
- 当前“左侧固定导航栏”不适合作为主导航。它容易显得像模板或学生作品，也不利于未来组织、仓库、登录、权限、搜索、创建入口扩展。
- 企业级方案应采用“顶部全局命令栏 + 仓库上下文导航 + 内容区域三栏布局 + 命令面板”的产品壳结构。

一句话定义：

> CommitToDo 的首页像一次启动仪式，应用内像一个安静、专业、可扩展的任务操作系统。

## 1. 产品定位

CommitToDo 是一个新式 ToDo 工具，但它不只是清单应用。它把 ToDo、分支、提交记录、节奏热力图和本地优先数据组织在一起，让用户用接近 Git 的方式管理目标和任务推进。

### 1.1 产品关键词

- 新式 ToDo
- 分支化任务管理
- 提交式进度记录
- 可回溯工作流
- 本地优先 PWA
- 个人效率工具，可向团队协作扩展
- 任务节奏可视化

### 1.2 设计关键词

- 企业级
- 科技感
- 克制
- 高密度但不拥挤
- 可扫描
- 强状态反馈
- 可扩展
- 长时间使用不疲劳

### 1.3 不应该走的方向

- 不做传统营销站式大卡片堆叠。
- 不做普通后台模板式左侧导航。
- 不做纯终端模拟器，避免牺牲可用性。
- 不做过多霓虹、过多渐变、过多动画。
- 不把 Agent、M3、Pipeline 等与项目无关的概念放进界面。
- 不为了科技感牺牲中文可读性。

## 2. 首页与应用内是否保持一致

### 2.1 推荐决策

保持一致，但不是完全相同。

首页和应用内应共享：

- 同一套色彩变量。
- 同一套品牌字体倾向。
- 同一套细线、状态码、网格、终端式微文案。
- 同一套动效语言，例如扫描、脉冲、轨迹推进、状态就绪。

首页和应用内应区分：

- 首页可以更戏剧化，应用内要更克制。
- 首页可以使用大字号和强渐变，应用内只在关键操作和状态中使用渐变。
- 首页可以有持续动效，应用内动效必须服务于反馈、加载、切换或数据变化。
- 首页偏品牌表达，应用内偏效率、准确和可操作。

### 2.2 两套界面的关系

| 场景 | 设计强度 | 视觉目标 | 动效策略 | 文案策略 |
| --- | --- | --- | --- | --- |
| 首页 `/` | 高 | 建立品牌记忆和产品气质 | 可以有持续背景动效 | 中英混合可接受 |
| 登录 `/login` | 中 | 建立信任、减少阻力 | 轻微扫描、聚焦动画 | 中文为主 |
| 工作台 `/workspace` 或 `/app` | 低到中 | 高效处理任务 | 只做反馈型动效 | 中文为主，技术标签英文 |
| Graph/Heatmap | 中 | 数据洞察和空间感 | 数据变化动效 | 中文说明 + 英文缩写 |
| 设置/团队/账号 | 低 | 稳定、清晰、可信 | 极少动效 | 中文为主 |

## 3. 企业级信息架构

### 3.1 当前问题

左侧固定导航栏的问题不只是视觉上显得普通，更重要的是它和 CommitToDo 的未来扩展方向冲突：

- 未来会有登录，左侧栏很难优雅容纳用户、组织、工作空间和账号入口。
- 未来会有后端和团队协作，导航层级会从“页面”变成“组织 > 工作空间 > 仓库 > 分支 > 任务”。
- 左侧栏会占用横向空间，而任务列表、分支树、详情抽屉、Graph 都需要宽度。
- 图标加文字的纵向菜单容易让应用显得像通用管理后台，而不是有鲜明产品气质的新式 ToDo。

### 3.2 新的信息架构

推荐结构：

```text
Public
├─ /                         Landing 首页
├─ /login                    登录
├─ /signup                   注册
└─ /pricing 或 /about         可选，未来商业化使用

App
├─ /app                      个人总览
├─ /app/:workspaceId         工作空间总览
├─ /app/:workspaceId/repositories
├─ /app/:workspaceId/repository/:repoId/tasks
├─ /app/:workspaceId/repository/:repoId/graph
├─ /app/:workspaceId/repository/:repoId/heatmap
├─ /app/:workspaceId/repository/:repoId/commits
├─ /app/:workspaceId/repository/:repoId/search
├─ /app/:workspaceId/settings
├─ /app/:workspaceId/members  未来团队协作
└─ /account                  账号、登录状态、同步设置
```

当前阶段可以兼容：

```text
/workspace                  现有工作台入口
/graph                      当前 Graph 页面
/heatmap                    当前热力图页面
/search                     当前搜索页面
/settings                   当前设置页面
```

但新设计应朝 `/app/...` 的结构收敛，为后端和登录系统留好位置。

### 3.3 导航原则

不要使用固定左侧全局导航作为主框架。推荐使用：

- 顶部全局命令栏：放品牌、工作空间、仓库、搜索、创建、同步、用户。
- 仓库上下文标签栏：放当前仓库内的任务、提交、图谱、热力图、搜索、设置。
- 内容内上下文面板：例如分支树、筛选器、任务分组，只在需要时出现。
- 命令面板：承载快速跳转、创建任务、切换仓库、搜索任务、打开设置。

这样更像 Linear、GitHub、Raycast、Notion Calendar、现代 DevTools 的组合气质，而不是普通后台系统。

## 4. 应用壳设计

### 4.1 全局顶部命令栏

顶部命令栏是整个应用的核心骨架。

高度建议：56px。  
布局建议：

```text
┌──────────────────────────────────────────────────────────────────────┐
│ CommitToDo  Workspace ▾  Repository ▾   [ Search or command... ⌘K ] │
│                                      + New   Sync   Bell   User ▾     │
└──────────────────────────────────────────────────────────────────────┘
```

必须包含：

- 品牌标识：CommitToDo，短小，不做大 Logo。
- 工作空间切换器：当前可显示 “Local Workspace”，未来显示组织或团队。
- 仓库切换器：当前仓库，支持搜索和切换。
- 全局搜索/命令入口：点击打开 Command Palette。
- 新建入口：新建任务、新建分支、新建提交记录。
- 同步状态：当前可显示 Local / IndexedDB / Offline，未来显示 Cloud Sync。
- 通知入口：未来用于评论、任务指派、冲突提醒。
- 用户菜单：当前可显示 Local User，未来接入登录。

视觉规则：

- 顶部栏背景使用深色半透明或实色深绿黑。
- 边界使用 1px 青灰线。
- 当前选择项使用淡青背景或细线描边，不使用大面积渐变。
- 顶部栏不使用复杂图案，保持企业级稳定感。

### 4.2 仓库上下文标签栏

当用户进入某个仓库后，顶部命令栏下方出现上下文标签。

```text
Repository: Personal Goals / main
Tasks    Commits    Graph    Heatmap    Search    Settings
```

规则：

- 标签栏高度 44px 到 48px。
- 当前项使用青色下划线或细线框。
- 不使用垂直左侧菜单。
- 标签只展示当前上下文相关页面，避免全局菜单混乱。
- 当屏幕较窄时，变成可横向滚动的 segmented tabs。

### 4.3 内容布局

核心工作页推荐“三栏可伸缩布局”：

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Top Command Bar                                                       │
├──────────────────────────────────────────────────────────────────────┤
│ Repository Context Tabs                                               │
├───────────────┬──────────────────────────────────────┬───────────────┤
│ Context Panel  │ Primary Work Surface                 │ Detail Drawer │
│ branch/filter  │ task list / graph / heatmap           │ task details  │
└───────────────┴──────────────────────────────────────┴───────────────┘
```

三栏含义：

- 左侧 Context Panel：不是全局导航，而是当前页面的上下文工具区。可放分支树、筛选器、标签、视图切换。
- 中间 Primary Work Surface：主工作区，放任务列表、Graph、热力图、提交列表。
- 右侧 Detail Drawer：任务详情、提交详情、分支详情。默认可收起。

宽度建议：

- Context Panel：240px 到 280px，可折叠。
- Primary Work Surface：自适应，占主要空间。
- Detail Drawer：360px 到 440px，可覆盖或推开内容。
- 小屏幕：Context Panel 和 Detail Drawer 均变成抽屉或全屏子页面。

### 4.4 为什么这样更企业级

- 顶部命令栏能自然承接登录、组织、团队、同步和账号。
- 上下文标签让用户知道当前在哪个仓库内工作。
- 内容三栏符合任务管理、代码平台和设计工具的常见高级工作流。
- 命令面板能承接高级用户效率需求。
- 不把所有入口堆进左侧栏，视觉更干净，也更有产品辨识度。

## 5. 视觉系统

### 5.1 总体风格

应用内风格定义为：

> Deep technical workspace with luminous operational accents.

中文描述：

> 深色技术工作台，使用青色、石灰绿和琥珀色作为状态与操作强调，整体克制、细密、清晰，有科技感但不炫技。

### 5.2 色彩系统

首页现有的深色科技感可以保留，但应用内需要更沉稳。推荐色彩如下：

```css
:root {
  --color-canvas: #061313;
  --color-canvas-elevated: #0b1c1d;
  --color-surface: #102829;
  --color-surface-soft: #163435;
  --color-border: rgba(132, 210, 205, 0.22);
  --color-border-strong: rgba(132, 210, 205, 0.36);

  --color-text-primary: #eaf7f3;
  --color-text-secondary: #a9bfba;
  --color-text-muted: #6f8783;

  --color-primary: #18d6d0;
  --color-primary-soft: rgba(24, 214, 208, 0.12);
  --color-accent: #a6ff4d;
  --color-accent-soft: rgba(166, 255, 77, 0.12);
  --color-warning: #ffc75a;
  --color-danger: #ff5c7a;
  --color-success: #5dffa7;

  --gradient-brand: linear-gradient(135deg, #18d6d0 0%, #a6ff4d 100%);
  --gradient-quiet: linear-gradient(135deg, rgba(24, 214, 208, 0.18), rgba(166, 255, 77, 0.08));
}
```

色彩使用规则：

- 深色背景用于首页和应用内主框架。
- 青色作为主操作、链接、焦点、当前选择。
- 石灰绿作为完成、推进、活跃状态。
- 琥珀色作为提醒、等待、需要注意。
- 红色只用于危险操作、失败、冲突。
- 渐变只用于首页主视觉、主 CTA、局部品牌强调，不在大量按钮和卡片上滥用。
- 普通操作按钮用纯色或描边，减少眼花感。

### 5.3 浅色模式

如果保留浅色模式，应用内可支持，但首页可以继续保持深色品牌场景。

浅色模式建议：

```css
[data-theme='light'] {
  --color-canvas: #f5fbf8;
  --color-canvas-elevated: #ffffff;
  --color-surface: #edf7f3;
  --color-surface-soft: #e1f0ec;
  --color-border: rgba(23, 86, 82, 0.16);
  --color-border-strong: rgba(23, 86, 82, 0.28);

  --color-text-primary: #102523;
  --color-text-secondary: #46625d;
  --color-text-muted: #708985;

  --color-primary: #008f8a;
  --color-accent: #4f9f00;
  --color-warning: #a46a00;
  --color-danger: #c73355;
}
```

浅色模式不应该变成普通白色后台。仍然保留青绿色品牌气质，但降低荧光感。

### 5.4 字体系统

推荐：

- 中文与正文：系统无衬线，优先 `Inter`, `Noto Sans SC`, `Microsoft YaHei UI`, `PingFang SC`, `sans-serif`。
- 技术标签、短代码、哈希、状态码：`JetBrains Mono`, `IBM Plex Mono`, `SFMono-Regular`, `Consolas`, `monospace`。
- 首页标题可以使用更硬朗的 display 风格，但应用内标题不要像海报。

字号建议：

```text
App Shell Brand       14px / mono / uppercase or mixed
Page Title            22px - 28px
Section Title         15px - 18px
Body                  14px - 15px
Table/List Primary    14px
Meta/Status           12px - 13px / mono
Button                13px - 14px
```

中文策略：

- 应用内主文案使用中文，更适合国内用户理解和长期使用。
- 技术短标签可以保留英文，例如 Graph、Commit、Heatmap、Sync、Local。
- 首页可以中英混排，应用内不要为了“酷”而大量使用英文。
- 按钮必须清晰，例如“新建任务”“进入工作台”“提交进度”，不要写成含糊的“Launch”“Execute”。

### 5.5 间距与圆角

推荐使用 4/8px 网格：

```text
4px   细微间距
8px   控件内部紧凑间距
12px  表单、列表项内部间距
16px  区块间距
24px  页面主间距
32px  大区块间距
```

圆角：

- 小控件：6px。
- 卡片、抽屉、面板：8px。
- 弹窗：10px 到 12px。
- 不使用过大的圆角，避免 SaaS 模板感。

### 5.6 阴影与边框

深色界面不依赖大阴影，应使用：

- 1px 半透明边框。
- 轻微内发光。
- 低透明度背景分层。
- 当前激活项使用边框、高亮线或小面积背景。

禁止：

- 大面积玻璃拟态。
- 多层卡片套卡片。
- 页面主体每一块都做成浮动大卡片。
- 过重阴影。

### 5.7 动效系统

动效应分为品牌动效和工作动效。

品牌动效用于首页：

- 扫描线。
- 轻微噪点。
- 轨迹推进光点。
- HUD 细线校准。
- 状态项逐条出现。

工作动效用于应用内：

- 页面切换淡入：120ms 到 180ms。
- 抽屉展开：180ms 到 240ms。
- 命令面板出现：120ms 到 160ms。
- 列表新增任务：轻微上移 + 淡入。
- 状态变更：颜色和小光点变化。
- Graph 节点变化：局部连线过渡。

规则：

- 应用内不放持续抢眼动画。
- 动效必须可被 `prefers-reduced-motion` 降级。
- 加载状态可以使用轻量扫描条，不使用大面积旋转 loader。

## 6. 页面规格

### 6.1 Landing 首页

首页继续作为品牌启动页。

目标：

- 让用户第一眼理解 CommitToDo 是新式 ToDo。
- 强调分支、提交、热力图、本地优先。
- 提供进入工作台 CTA。
- 建立与普通 ToDo 工具不同的记忆点。

内容结构：

```text
Top micro status bar
Hero terminal copy
Product scan module
Task flow animation
Capability grid
Bottom command strip
```

首页可以保留：

- 黑底。
- 细线 HUD。
- 噪点与扫描线。
- 渐变主标题。
- 任务流动效。

需要避免：

- 与项目无关的 Agent、M3、Pipeline。
- 过多英文口号。
- 过于像某个已有品牌的波形或排版。

### 6.2 登录页

未来登录页应连接首页和应用内，不应是普通表单页。

布局：

```text
┌────────────────────────────────────────────────────────────┐
│ CommitToDo                                                 │
├──────────────────────────────┬─────────────────────────────┤
│ Product trust panel           │ Login form                  │
│ - Local first                  │ Email                       │
│ - Git-like task history        │ Password                    │
│ - Sync when ready              │ SSO / Continue              │
└──────────────────────────────┴─────────────────────────────┘
```

规则：

- 表单区域必须稳定、清晰，不做强动效。
- 左侧可以放低强度 HUD 背景，增强品牌。
- 支持未来 SSO、邮箱登录、验证码登录。
- 必须有离线本地模式入口，例如“暂时使用本地工作台”。

### 6.3 App 总览

App 总览不是营销页，而是用户进入后的操作中枢。

目标：

- 用户能看到今天要做什么。
- 用户能继续最近的仓库和任务。
- 用户能快速新建任务或分支。
- 用户能看到节奏和进展。

布局：

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Top Command Bar                                                       │
├──────────────────────────────────────────────────────────────────────┤
│ Today Focus       Recent Repositories       Activity / Rhythm         │
│ ┌──────────────┐  ┌────────────────────┐    ┌─────────────────────┐ │
│ │ 3 due today  │  │ Personal Goals      │    │ Heatmap mini         │ │
│ │ 2 in progress│  │ Product Plan        │    │ Commit streak        │ │
│ └──────────────┘  └────────────────────┘    └─────────────────────┘ │
│ Quick Actions                                                         │
│ + Task   + Branch   Commit Progress   Import / Export                 │
└──────────────────────────────────────────────────────────────────────┘
```

模块：

- 今日焦点。
- 最近仓库。
- 最近任务。
- 最近提交。
- 小型热力图。
- 本地/同步状态。

视觉：

- 使用高密度但有呼吸感的面板。
- 不使用首页级大标题。
- 图表使用细线、低饱和色和局部亮色。

### 6.4 仓库任务页

这是 CommitToDo 最核心页面。

布局：

```text
Top Command Bar
Repository Context Tabs

┌────────────────┬──────────────────────────────────────┬───────────────┐
│ Branch / Filter │ Task Work Surface                     │ Task Detail   │
│                │                                      │               │
│ main           │ View: List | Board | Timeline          │ title         │
│ feature/auth   │                                      │ status        │
│ writing-plan   │ [ ] Task title          status  due    │ branch        │
│                │ [ ] Task title          status  due    │ commits       │
│ Labels         │ [ ] Task title          status  due    │ history       │
└────────────────┴──────────────────────────────────────┴───────────────┘
```

Context Panel 内容：

- 分支树。
- 状态筛选。
- 优先级筛选。
- 标签。
- 本地视图，例如“今天”“待提交”“已完成”。

Primary Work Surface 视图：

- List：默认视图，适合企业级效率。
- Board：按状态分栏，适合看流程。
- Timeline：按提交或日期查看，未来可做。

Task Detail Drawer 内容：

- 标题。
- 描述。
- 状态。
- 优先级。
- 所属仓库和分支。
- 截止日期。
- 关联提交记录。
- 活动历史。
- 评论，未来团队版启用。

关键交互：

- 点击任务打开右侧详情，不跳走页面。
- `Ctrl/Cmd + K` 打开命令面板。
- `N` 或顶部 `+ New` 新建任务。
- 拖拽任务变更状态时必须给出明确反馈。
- 离线状态下所有写操作仍可进行，顶部显示本地待同步。

### 6.5 提交记录页

提交记录页体现 CommitToDo 与普通 ToDo 的差异。

目标：

- 让用户把任务推进记录成清晰的 commit。
- 能看到每一次推进带来的任务变化。
- 未来支持团队审计和同步。

布局：

```text
Commit timeline
├─ commit message
│  ├─ changed tasks
│  ├─ branch
│  ├─ timestamp
│  └─ note
├─ commit message
└─ ...
```

设计规则：

- 使用时间线和哈希短码。
- 每条记录不要做成大卡片，使用紧凑列表。
- 重要提交可以使用石灰色细线标记。
- 失败、冲突、待同步用琥珀或红色状态。

### 6.6 Git Graph 页面

Graph 页面应该像专业工具，而不是装饰图。

目标：

- 展示分支关系。
- 展示任务推进路径。
- 帮用户理解“这个目标是怎么演进的”。

布局：

```text
┌─────────────────────┬────────────────────────────────────┐
│ Graph Controls       │ Graph Canvas                        │
│ Branch filter        │ nodes + edges + commit markers      │
│ Date range           │                                    │
│ Status filter        │                                    │
└─────────────────────┴────────────────────────────────────┘
```

视觉：

- 背景使用非常低对比网格。
- 节点颜色与任务状态一致。
- 连线不要过亮，避免混乱。
- hover 显示任务或提交摘要。

### 6.7 热力图页面

热力图是“节奏感”的核心表达。

目标：

- 让用户看到自己在哪些日期推进了任务。
- 支持按仓库、分支、任务类型筛选。
- 未来支持团队维度。

布局：

```text
Top filters
Heatmap canvas
Summary metrics
Activity list
```

视觉：

- 使用深色格子 + 青绿亮度层级。
- 不使用彩虹色。
- 强度从低到高建议：
  - 空：深色描边。
  - 低：青绿色 20%。
  - 中：青绿色 45%。
  - 高：石灰绿 75%。
  - 极高：石灰绿 + 轻微外发光。

### 6.8 搜索与命令面板

搜索页可以保留，但更推荐把它升级为命令面板。

触发：

- 点击顶部搜索框。
- `Ctrl/Cmd + K`。

能力：

- 搜索任务。
- 搜索提交。
- 搜索分支。
- 切换仓库。
- 新建任务。
- 新建分支。
- 打开 Graph/Heatmap/Settings。
- 未来邀请成员、打开账号设置。

视觉：

```text
┌──────────────────────────────────────────┐
│ Search task, branch, commit, action...   │
├──────────────────────────────────────────┤
│ Actions                                  │
│ + New task                               │
│ + Commit progress                        │
│                                          │
│ Tasks                                    │
│ Task title                   Repository  │
│                                          │
│ Branches                                 │
└──────────────────────────────────────────┘
```

规则：

- 使用居中 modal，不使用整页搜索优先。
- 输入框必须自动聚焦。
- 支持键盘上下选择与回车确认。
- 搜索结果分组，避免一锅粥。

### 6.9 设置页

设置页要为未来后端和登录系统预留结构。

分组：

- General：语言、主题、启动页。
- Data：IndexedDB、本地备份、导入导出。
- Sync：未来云同步、冲突策略。
- Account：未来账号、登录状态。
- Workspace：工作空间名称、成员、权限。
- Repository：仓库默认分支、归档策略。
- Advanced：调试、数据修复。

视觉：

- 使用传统表单布局，强调稳定。
- 不使用强 HUD 装饰。
- 危险操作单独分区，红色弱化背景 + 明确确认。

## 7. 组件设计规格

### 7.1 TopCommandBar

职责：

- 提供全局上下文和全局动作。
- 是未来登录、组织、通知、同步的承载点。

状态：

- Local only。
- Syncing。
- Synced。
- Offline。
- Conflict。
- Guest。
- Logged in。

交互：

- 点击搜索区域打开 CommandPalette。
- 点击 Workspace 打开工作空间菜单。
- 点击 Repository 打开仓库菜单。
- 点击 User 打开账号菜单。

### 7.2 WorkspaceSwitcher

当前阶段：

- 显示 Local Workspace。
- 支持打开菜单，展示本地工作空间和“未来云工作空间”占位。

未来阶段：

- 显示个人、团队、组织。
- 支持创建工作空间。
- 支持切换成员权限上下文。

### 7.3 RepositorySwitcher

能力：

- 搜索仓库。
- 最近仓库。
- 收藏仓库。
- 新建仓库。

设计：

- 使用下拉 popover。
- 每个仓库显示名称、分支数、未完成任务数、最近活动。

### 7.4 ContextTabs

标签：

- Tasks
- Commits
- Graph
- Heatmap
- Search
- Settings

规则：

- 当前页面高亮。
- 不显示与当前上下文无关的入口。
- 移动端横向滚动。

### 7.5 BranchTreePanel

职责：

- 展示分支树。
- 展示筛选器。
- 展示视图切换。

规则：

- 这是上下文面板，不是全局导航。
- 可以折叠为 48px 宽的窄栏，只保留图标和 tooltip。
- 移动端变成抽屉。

### 7.6 TaskList

默认任务视图应是高质量列表，而不是卡片瀑布。

每行字段：

- 选择框。
- 任务标题。
- 状态。
- 优先级。
- 分支。
- 截止日期。
- 最近提交状态。

行高：

- 紧凑：44px。
- 默认：52px。
- 舒适：60px。

状态：

- Hover。
- Selected。
- Editing。
- Dragging。
- Completed。
- Archived。

### 7.7 TaskDetailDrawer

规则：

- 右侧抽屉默认宽 400px。
- 标题支持直接编辑。
- 关闭后保持列表上下文。
- 不作为全屏路由优先，除非移动端。

内容顺序：

1. 标题与状态。
2. 描述。
3. 属性。
4. 所属分支。
5. 提交记录。
6. 活动历史。
7. 未来评论区。

### 7.8 CommandPalette

规则：

- 必须全局可用。
- 支持键盘导航。
- 搜索结果分组。
- 常用动作置顶。
- 空状态给出下一步建议。

### 7.9 StatusBadge

状态建议：

- Todo：青灰。
- In Progress：青色。
- Done：石灰绿。
- Blocked：琥珀。
- Archived：灰色。
- Conflict：红色。

样式：

- 小面积背景。
- 1px 边框。
- 不使用大面积实心高饱和块。

### 7.10 DataCanvas

用于 Graph、Heatmap、Activity。

规则：

- 深色底。
- 低对比网格。
- 节点和数据点高亮。
- 支持 hover tooltip。
- 支持空状态和加载骨架。

## 8. 状态与反馈

### 8.1 空状态

空状态不能只是“暂无数据”。

示例：

```text
还没有任务
创建第一个任务，或从一个目标拆出任务分支。

[新建任务] [导入数据]
```

规则：

- 说明当前为空的原因。
- 给出主要动作。
- 可以有非常轻量的线性图形，不使用插画大图。

### 8.2 加载状态

加载状态：

- 列表使用 skeleton。
- Graph 使用淡网格 + 扫描线。
- 顶部同步使用小状态点。

禁止：

- 全屏大 loader。
- 长时间无说明的空白。

### 8.3 错误状态

错误必须给出恢复动作：

- 重试。
- 查看详情。
- 导出本地数据。
- 进入离线模式。

未来后端错误要区分：

- 网络错误。
- 权限错误。
- 登录过期。
- 同步冲突。
- 服务端验证失败。

### 8.4 离线与同步

CommitToDo 的本地优先是卖点，应在设计中明确。

顶部状态建议：

```text
Local
Offline
Syncing 3 changes
Synced
Conflict 1
```

规则：

- Local 模式不是错误。
- Offline 模式不阻止用户操作。
- 待同步数量清晰可见。
- 冲突需要进入专门解决界面。

## 9. 响应式设计

### 9.1 桌面端

桌面端是主体验。

断点：

- 1280px 以上：三栏布局完整展示。
- 1024px 到 1279px：详情抽屉默认覆盖或收起。
- 768px 到 1023px：Context Panel 可折叠，标签横向滚动。
- 767px 以下：移动布局。

### 9.2 移动端

移动端不照搬桌面。

结构：

```text
Top compact bar
Current repository
Segmented tabs
Primary list
Bottom action bar
```

规则：

- 任务详情变成全屏页面或底部 sheet。
- 分支树变成筛选抽屉。
- 顶部搜索仍可打开命令面板，但样式更接近全屏搜索。
- 底部可以放 3 到 4 个核心入口：任务、提交、图谱、我的。

## 10. 未来后端与登录扩展

### 10.1 账号体系预留

UI 需要预留：

- 未登录状态。
- 本地访客状态。
- 已登录状态。
- 多工作空间。
- 团队成员。
- 权限差异。

用户菜单建议：

```text
Local User / User Name
Account settings
Workspace settings
Sync settings
Keyboard shortcuts
Sign out
```

未登录时：

```text
Local mode
Sign in to sync
Create account
```

### 10.2 权限模型预留

未来团队协作至少会有：

- Owner。
- Admin。
- Member。
- Viewer。

界面表现：

- 无权限按钮禁用并说明原因。
- 敏感设置只在有权限时显示。
- 邀请成员入口放在 Workspace settings 和 User menu 中，不放在任务主界面里。

### 10.3 同步冲突

未来后端同步必须有冲突解决界面。

冲突列表字段：

- 对象类型：Task / Branch / Commit。
- 本地版本。
- 云端版本。
- 更新时间。
- 操作：使用本地、使用云端、手动合并。

视觉：

- 冲突使用琥珀或红色，但不要全屏警告。
- 保持可恢复和可信任。

## 11. 中文与英文使用策略

### 11.1 推荐策略

应用内中文为主，英文为辅。

原因：

- ToDo 工具是高频工具，用户需要快速理解。
- 中文能降低认知成本。
- 英文只在技术术语和品牌标签中保留，更有质感。

### 11.2 文案规则

中文：

- 新建任务
- 提交进度
- 今日焦点
- 分支清单
- 最近活动
- 本地保存
- 待同步
- 已完成

英文：

- Commit
- Graph
- Heatmap
- Sync
- Local
- IndexedDB
- PWA

首页中英混排示例：

```text
CommitToDo 是一个新式 ToDo 工具。
用分支组织目标，用 Commit 记录推进，用 Heatmap 看见节奏。
```

应用内避免：

```text
Launch Workspace
Execute Todo
Taskflow Ready
```

## 12. 页面排布示例

### 12.1 桌面仓库任务页

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ CommitToDo  Local Workspace ▾  Product Plan ▾   Search or command...      │
│                                           + 新建   Local   通知   用户 ▾   │
├────────────────────────────────────────────────────────────────────────────┤
│ Product Plan / main                                                       │
│ 任务   提交记录   Graph   Heatmap   搜索   设置                            │
├─────────────────┬──────────────────────────────────────────┬───────────────┤
│ 分支             │ 今日焦点                                  │ 任务详情       │
│ main             │ ┌──────────────────────────────────────┐ │ 标题          │
│ feature/login    │ │ [ ] 登录页结构设计     进行中  main   │ │ 状态          │
│ writing/spec     │ │ [ ] 热力图筛选交互     待办    graph  │ │ 优先级        │
│                  │ │ [x] 首页 CTA 调整      完成    main   │ │ 分支          │
│ 筛选             │ └──────────────────────────────────────┘ │ 提交记录      │
│ 今天             │                                          │ 活动历史      │
│ 待提交           │ 最近提交                                  │               │
└─────────────────┴──────────────────────────────────────────┴───────────────┘
```

### 12.2 App 总览

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ CommitToDo  Local Workspace ▾                 Search or command...         │
├────────────────────────────────────────────────────────────────────────────┤
│ 今日焦点                         最近仓库                    节奏          │
│ 3 个待办                         Product Plan                 mini heatmap  │
│ 1 个待提交                       Personal Goals               streak        │
│                                                                            │
│ 快捷动作                                                                   │
│ [新建任务] [提交进度] [打开 Graph] [导入数据]                               │
│                                                                            │
│ 最近活动                                                                   │
│ commit: 完成首页视觉调整                                                    │
│ task: 新建登录系统设计                                                       │
└────────────────────────────────────────────────────────────────────────────┘
```

### 12.3 移动任务页

```text
┌──────────────────────────────┐
│ CommitToDo       Search  +   │
├──────────────────────────────┤
│ Product Plan / main ▾        │
├──────────────────────────────┤
│ 任务  提交  Graph  Heatmap   │
├──────────────────────────────┤
│ 今天                         │
│ [ ] 登录页结构设计            │
│ [ ] 热力图筛选交互            │
│ [x] 首页 CTA 调整             │
├──────────────────────────────┤
│ 任务   筛选   新建   我的     │
└──────────────────────────────┘
```

## 13. 实施路线

### 13.1 P0：设计系统与应用壳

目标：先建立企业级外壳，不急着重写业务。

任务：

- 定义 CSS 变量和主题 token。
- 建立 `TopCommandBar`。
- 建立 `ContextTabs`。
- 将现有 `AppLayout` 从左侧导航改为顶部命令栏结构。
- 保留当前路由可用。
- 建立 `CommandPalette` 的基础壳。
- 建立同步/本地状态入口的 UI 占位。

验收：

- `/` 首页仍保持品牌启动页。
- `/workspace` 使用新应用壳。
- 不再出现固定左侧全局导航。
- 搜索、创建、设置、用户入口在顶部有位置。
- 小屏幕不会横向溢出。

### 13.2 P1：核心任务页升级

目标：把工作台变成真正的企业级任务操作台。

任务：

- 任务页改成 Context Panel + Task Work Surface + Detail Drawer。
- 新增分支树上下文面板。
- 任务列表支持高密度企业级列表样式。
- 点击任务打开右侧详情抽屉。
- 建立空状态、加载状态、错误状态。
- Command Palette 支持任务搜索和跳转。

验收：

- 用户无需离开任务列表即可查看和编辑任务详情。
- 分支、筛选、任务列表、详情之间层级清晰。
- 中文文案清晰，不依赖英文装饰。

### 13.3 P2：Graph、Heatmap、Commit 视觉统一

目标：把可视化页面统一成 CommitToDo 的技术工作台风格。

任务：

- Graph 使用统一 DataCanvas。
- Heatmap 使用统一色阶。
- Commit 页面使用时间线列表。
- 所有页面共享 ContextTabs。
- hover tooltip 和筛选器统一。

验收：

- Graph/Heatmap 看起来属于同一个系统。
- 数据状态颜色一致。
- 页面中没有普通后台模板感。

### 13.4 P3：登录与后端准备

目标：在不接入后端的前提下完成 UI 结构预留。

任务：

- 新增 AuthLayout。
- 新增登录页视觉。
- UserMenu 支持 Local / Guest / Signed in 三种显示。
- WorkspaceSwitcher 支持未来组织列表结构。
- Settings 页面增加 Sync、Account、Workspace 分组。

验收：

- 接入后端时无需推翻主导航结构。
- 登录、账号、同步、团队成员都有合理入口。

## 14. 文件与组件建议

建议新增或重构：

```text
web/src/presentation/components/app-shell/
├─ top-command-bar.tsx
├─ workspace-switcher.tsx
├─ repository-switcher.tsx
├─ context-tabs.tsx
├─ user-menu.tsx
└─ sync-status.tsx

web/src/presentation/components/command-palette/
├─ command-palette.tsx
└─ command-palette.store.ts

web/src/presentation/components/tasks/
├─ branch-tree-panel.tsx
├─ task-list.tsx
├─ task-detail-drawer.tsx
└─ task-status-badge.tsx

web/src/presentation/components/data-canvas/
├─ data-canvas.tsx
├─ graph-canvas.tsx
└─ heatmap-canvas.tsx

web/src/presentation/screens/auth/
├─ login-screen.tsx
└─ auth-layout.tsx
```

注意：

- 不要一次性重写 Data/Application/Domain 层。
- UI 重构应优先发生在 Presentation 层。
- Store 可以逐步适配，不改变业务模型。
- 保持 IndexedDB、本地优先能力。

## 15. 可访问性与可用性

必须满足：

- 所有按钮有可见 focus 状态。
- Command Palette 支持键盘操作。
- 表单错误可被屏幕阅读器感知。
- 色彩不单独承载信息，状态需要文本或图标辅助。
- 深色模式下正文对比度足够。
- 动效支持 `prefers-reduced-motion`。
- 移动端触控目标不小于 44px。

## 16. 设计验收清单

整体：

- 首页和应用内有同一品牌基因，但应用内明显更克制。
- 没有固定左侧全局导航。
- 顶部命令栏承载工作空间、仓库、搜索、创建、同步、用户。
- 应用内中文为主，技术短标签英文为辅。
- 渐变保留，但不泛滥。
- 视觉不像普通后台模板，也不像单纯终端玩具。

企业级：

- 有登录、组织、用户、同步、权限的扩展位置。
- 信息架构能支持多仓库、多分支、多任务视图。
- 页面密度适合长期工作。
- 空、加载、错误、离线、冲突状态都有设计。

工程：

- 不破坏现有路由和业务数据。
- Presentation 层改造优先。
- CSS token 驱动主题。
- 组件可复用，避免页面内重复实现。
- 移动端和桌面端都可用。

## 17. 给执行模型的最终指令

如果让另一个大模型或工程代理执行本设计，请按以下顺序：

1. 先阅读现有 `web/src/app.tsx`、`web/src/presentation/components/layout/app-layout.tsx`、`web/src/presentation/screens/*`、`web/src/index.css`。
2. 不要重写业务 store，不要改变 Domain/Application/Data 层。
3. 先建立新的 App Shell：`TopCommandBar`、`ContextTabs`、`CommandPalette` 基础壳。
4. 将 `/workspace` 和其他应用内页面挂到新 App Shell 下。
5. 去掉固定左侧全局导航，改为顶部命令栏和上下文标签。
6. 保留首页视觉，但确保应用内界面降噪。
7. 使用本文档的色彩 token 和间距规则。
8. 中文文案优先，英文只用于技术标签和品牌短码。
9. 最后再逐步升级任务页、Graph、Heatmap、Commit 页面。
10. 每一步都用桌面和移动视口检查是否溢出、是否可点击、是否有清晰状态反馈。

最终目标不是做一个“好看的页面”，而是做一个能长期承载 CommitToDo 产品演进的企业级任务操作系统。
