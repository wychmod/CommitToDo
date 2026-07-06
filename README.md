<div align="center">

```
 ██████╗ ██████╗ ███╗   ███╗███╗   ███╗██╗████████╗
██╔════╝██╔═══██╗████╗ ████║████╗ ████║██║╚══██╔══╝
██║     ██║   ██║██╔████╔██║██╔████╔██║██║   ██║
██║     ██║   ██║██║╚██╔╝██║██║╚██╔╝██║██║   ██║
╚██████╗╚██████╔╝██║ ╚═╝ ██║██║ ╚═╝ ██║██║   ██║
 ╚═════╝ ╚═════╝ ╚═╝     ╚═╝╚═╝     ╚═╝╚═╝   ╚═╝
```

**A todo tool that thinks in commits.**

`taskflow ready · indexeddb online · pwa installable · v0.1`

</div>

---

> **关于本仓库** — `Commit` 是一个跨平台任务管理工具集，主仓库同时托管 Flutter 桌面/移动端与 **`/web`** 浏览器版本。本 README 当前只描述 **`/web` 子项目**（已具备完整工作台能力，刚刚开发完成）。其他平台的代码与文档将随后续 release 同步补充。
>
> Flutter 主项目相关规范请见 [`AGENTS.md`](./AGENTS.md) 与 [`overview.md`](./overview.md)。

---

## ✦ 视觉预览

启动台首页 — 一个会"开机"的暗色终端 HUD，扫描线 / 打字机 / 流程流点全部是真实的 CSS + 动效，不是占位图。

![CommitToDo Landing — booting committodo -- taskflow ready](./web/docs/landing-hero.png)

> `commit@todo:~$` · `booting committodo — taskflow ready` · `> 待办索引 ....... 就绪` · `> 分支清单 ....... 已挂载` · `> 提交日志 ....... 记录中` · `> 本地数据 ....... IndexedDB` · `OK`

---

## ✦ 它是什么

**CommitToDo** 把 Git 的版本控制隐喻搬进个人任务管理：

| Git 概念 | CommitToDo |
| --- | --- |
| Repository | 目标 / 项目空间（一个长期方向） |
| Branch | 工作线（主题、阶段、迭代） |
| Commit | 推进记录（创建、更新、完成、合并、删除） |
| Graph | 提交图谱（节点 + 边，可缩放） |
| Heatmap | 节奏热力图（每天的完成量） |

每一次创建、更新、完成、合并都会自动写入一条 commit，让你的进展"有迹可循"。所有数据留在本地浏览器（PWA + IndexedDB），可以离线、可以安装、可以导出 JSON / CSV / Markdown。

---

## ✦ 核心能力

| | 能力 | 说明 |
| --- | --- | --- |
| **01** | **新式 ToDo** | 把待办拆成 *仓库 → 分支 → 任务*，保留上下文而不是一份扁平清单 |
| **02** | **完成即提交** | 每次推进自动落 commit，进展可回放、可审计 |
| **03** | **节奏热力图** | 365 天的完成度压缩成一张可扫描的网格，看见节奏 |
| **04** | **离线优先** | 数据 100% 留在本地 IndexedDB，PWA 可安装，断网照用 |

---

## ✦ 特性矩阵

### 工作台

- **三栏布局**：左侧 Context Panel（仓库 + 分支树）· 主工作区 · 右侧 Task Detail Drawer
- **统计卡**：仓库数、待办数、近 7 日完成数、今日活跃
- **仓库网格**：每个仓库展示 branch 数 / task 数 / 最近活动时间
- **命令面板**：`Ctrl/Cmd + K` 全局唤起，支持动作、任务、分支、仓库的模糊搜索

### 任务管理

- 4 态生命周期：`待办 → 进行中 → 已完成 / 已取消`
- 3 级优先级：高 / 中 / 低，列表左侧色条标记
- 父子任务（`parentTaskId`）、分支归属、截止日期、标签、排序
- Task Form 抽屉内联编辑；Task Detail Drawer 侧滑展开
- Commit Timeline：每一次状态变化都留痕

### 视图

- **HomeScreen** — 工作台总览、仓库网格、统计、快捷创建
- **RepositoryScreen** — 单仓库视图，分支树 + 任务列表
- **CommitsScreen** — 单仓库的 commit 时间线
- **HeatmapScreen** — 全局 365 天节奏热力图
- **GitGraphScreen** — 全局提交图谱（基于 `@xyflow/react`）
- **RepoHeatmapScreen / RepoGraphScreen / RepoSearchScreen / RepoSettingsScreen** — 单仓库视角的四个工具
- **SearchScreen** — 全局跨仓库搜索 + 搜索历史持久化
- **TaskFormScreen** — 任务创建 / 编辑
- **SettingsScreen** — 主题色、深色 / 浅色切换、数据导出、导入

### 数据

- **导出**：JSON / CSV / Markdown 三种格式，弹出系统保存对话框选择目标路径
- **导入**：从 JSON 反向重建仓库 / 分支 / 任务
- **本地优先**：IndexedDB（Dexie 4）多版本 schema 演进，软删除 + 归档

### 体验

- **暗 / 亮主题**：CSS 变量驱动，可在运行时切换主色（`applyThemeColor`）
- **响应式**：mobile / tablet / laptop / desktop / desktop-xl 五档断点
- **PWA**：`vite-plugin-pwa` 自动注册 service worker，可"添加到主屏幕"
- **键盘**：命令面板、Esc 关闭、抽屉内快捷键
- **无障碍**：`aria-label` / `aria-hidden` / 焦点环 / `prefers-reduced-motion`

---

## ✦ 技术栈

**运行时**

| 层 | 选型 |
| --- | --- |
| UI 框架 | React 18 + TypeScript 5.5 |
| 构建 | Vite 6 |
| 样式 | TailwindCSS 3.4 + CSS Variables（design token 驱动） |
| 路由 | React Router 7 |
| 状态 | Zustand 5 |
| DI | tsyringe + reflect-metadata |
| 本地存储 | Dexie 4（IndexedDB） |
| 图谱 | @xyflow/react 12 |
| 时间 | date-fns 4 |
| 虚拟列表 | @tanstack/react-virtual |
| 图标 | lucide-react |
| 基础组件 | @radix-ui（Dialog / Popover / Toast / Select / Switch / Slot / VisuallyHidden） |
| 工具 | class-variance-authority · clsx · tailwind-merge · uuid |

**质量**

| 层 | 选型 |
| --- | --- |
| 类型 | TypeScript strict + 多份 tsconfig（app / node） |
| Lint | ESLint 9 + typescript-eslint + react-hooks / react-refresh |
| 测试 | Vitest 2 + jsdom + fake-indexeddb + Testing Library |
| PWA | vite-plugin-pwa（autoUpdate） |

---

## ✦ 架构

Web 端严格沿用主项目的 Clean Architecture 分层，**Presentation → Application → Domain ← Data**，依赖只能向内。

```
┌─────────────────────────────────────────────────────────────┐
│  presentation/   React 组件、屏幕、Zustand store、UI tokens │
│      ↓ uses                                                   │
│  application/    UseCase（create / update / complete / merge │
│                  / delete / import）                           │
│      ↓ uses                                                   │
│  domain/         实体 (Repository / Branch / Task / Commit)  │
│                  仓库接口 (I*Repository)、领域服务            │
│      ↑ implements                                             │
│  data/           Dexie schema、Repository 实现                │
│                                                              │
│  platform/       Web 平台适配（文件保存、通知 service）      │
│  core/           DI 容器、扩展、hook、theme、utils           │
└─────────────────────────────────────────────────────────────┘
```

- **DI 容器** 在 `core/di/injection-container.ts` 单例化所有 Repository 与 UseCase
- **Domain 接口** 在 `domain/repositories/`，**Data 层用 Dexie 实现**
- **Zustand store** 在 `presentation/stores/` 注入 DI 容器，分发到 React 组件

---

## ✦ 设计语言

参考主项目 `docs/DESIGN.md`，**Linear-inspired Developer Dark** 风格：

- **字体**：`JetBrains Mono`（等宽，标题 / hash / branch 名）+ `IBM Plex Sans`（正文）
- **主色**：青色 `#16c7c7` / `#2bd8d8`，强调色 `#b2ff59`，警示色 `#ffc65c`，危险色 `#ff5c7a`
- **背景 ladder**：`canvas → surface → surface-soft → surface-strong → surface-quiet`
- **Motion**：`out-expo` 缓动（`cubic-bezier(0.16, 1, 0.3, 1)`），大部分交互 150ms / 250ms
- **入场**：landing 用 `landing-reveal` 序列动画 + 模糊→清晰，App Shell 更克制
- **Tailwind 扩展**：display / headline / card-title / body / button / eyebrow / mono 七级字号、6 档 spacing、4 档圆角、5 档断点

---

## ✦ 快速开始

### 环境要求

- Node.js ≥ 18
- pnpm（推荐）/ npm / yarn

### 安装与启动

```bash
cd web
npm install
npm run dev          # http://localhost:5173
```

### 常用命令

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 启动 Vite 开发服务器（HMR） |
| `npm run build` | `tsc -b && vite build`，输出到 `dist/` |
| `npm run preview` | 本地预览生产构建 |
| `npm run lint` | ESLint 全量扫描 |
| `npm run test` | Vitest 单次跑测 |
| `npm run test:watch` | Vitest watch 模式 |

### 第一次进入

1. 打开 `http://localhost:5173`，看到的是 Landing 启动台
2. 点击 **「进入工作台」** → HomeScreen
3. 点击右上角 **「+ 新建仓库」** 创建第一个仓库
4. 进入仓库 → 默认分支会自动创建 → 在分支上添加任务
5. 勾选任务 → 自动写入 commit → 时间线与热力图开始累计

> Tip：浏览器 DevTools → Application → IndexedDB → `commit-db` 可看到所有表（`repositories / branches / tasks / commits / tags / taskTags`）。

---

## ✦ 项目结构

```
web/
├── public/                     静态资源（favicon / manifest / icons）
├── src/
│   ├── app.tsx                 路由 + Provider 装配
│   ├── main.tsx                入口
│   ├── index.css               Design token CSS variables + 全局样式
│   │
│   ├── core/                   框架无关的基础设施
│   │   ├── di/                 tsyringe 容器
│   │   ├── extensions/         Date / String 扩展
│   │   ├── hooks/              useBreakpoint / useIsDesktop / ...
│   │   ├── theme/              colorTokens · typography · dimensions · provider
│   │   └── utils/              formatters · validators · logger
│   │
│   ├── domain/                 纯领域（无 React / 无 IO）
│   │   ├── entities/           Repository / Branch / Task / Commit
│   │   ├── repositories/       I*Repository 接口
│   │   └── services/           数据导出服务
│   │
│   ├── application/            UseCase（每个动作一个文件）
│   │   └── usecases/
│   │       ├── repository/     create · update · delete
│   │       ├── branch/         create · delete · merge
│   │       ├── task/           create · update · complete · delete
│   │       └── import-data-usecase.ts
│   │
│   ├── data/                   领域接口的具体实现
│   │   ├── db/                 Dexie schema（v1 / v2 演进）
│   │   ├── models/             Dexie record 类型
│   │   └── repositories/       Dexie*Repository 实现
│   │
│   ├── platform/               Web 平台适配
│   │   ├── web-file-save-service.ts   File System Access API 包装
│   │   └── web-notification-service.ts
│   │
│   └── presentation/
│       ├── screens/            14 个路由屏幕
│       ├── components/
│       │   ├── app-shell/      Topbar / Context Tabs / Switcher / Sync
│       │   ├── command-palette/  Ctrl/Cmd+K
│       │   ├── common/         AppButton / Input / Dialog / Toast / Badge
│       │   ├── graph/          Commit node / Branch edge / layout 算法
│       │   ├── heatmap/        Calendar / Cell / Helpers
│       │   ├── layout/         AppLayout / SafeArea
│       │   ├── repository/     RepositoryRow
│       │   └── tasks/          TaskList / TaskForm / BranchTree / Timeline
│       ├── stores/             Zustand stores（home / repo / task / search / settings）
│       └── icons/              自绘 SVG 图标系统
│
├── test/                       vitest setup
├── tailwind.config.ts          design token → Tailwind theme extend
├── vite.config.ts              React + VitePWA
└── package.json
```

---

## ✦ 数据模型（IndexedDB · Dexie v2 schema）

```ts
repositories  ─┐
               │ 1:N
branches  ─────┤
               │ 1:N
tasks  ────────┤
               │ 1:N
commits  ──────┘

tags  ── M:N ── tasks      (via taskTags)
tasks  ── 1:N ── tasks     (parentTaskId, 子任务)
```

- **soft delete**：所有实体带 `isDeleted` / `isArchived`，删除走事务级联
- **多版本 schema**：v1 → v2 增加复合索引 `[branchId+isDeleted]`
- **commit 自动落库**：所有写操作经 UseCase，自动生成 `Commit{ type, taskId, branchId, createdAt, message }`

---

## ✦ 测试

```bash
cd web
npm run test
```

已覆盖：

| 模块 | 文件 |
| --- | --- |
| 实体 | `domain/entities/entities.test.ts` |
| 仓库实现 | `data/repositories/dexie-repositories.test.ts` |
| 仓库用例 | `application/usecases/repository/repository-usecases.test.ts` |
| 数据导入 | `application/usecases/import-data-usecase.test.ts` |
| 平台适配 | `platform/web-file-save-service.test.ts`、`web-notification-service.test.ts` |
| Zustand store | `presentation/stores/*.test.ts` |
| 图谱布局 | `presentation/components/graph/graph-layout.test.ts` |
| 热力图 | `presentation/components/heatmap/heatmap-helpers.test.ts` |

测试栈：`vitest` + `jsdom` + `fake-indexeddb` + `@testing-library/react` + `@testing-library/user-event`。

---

## ✦ 键盘快捷键

| 快捷键 | 行为 |
| --- | --- |
| `Ctrl / Cmd + K` | 唤起命令面板 |
| `Esc` | 关闭对话框 / 抽屉 |
| `Enter` | 在 Task Form 中提交 |
| `/` | 聚焦搜索（部分屏幕） |

---

## ✦ 路线图

- [x] Landing 启动台 + 工作台
- [x] 仓库 / 分支 / 任务 CRUD + commit 留痕
- [x] Git Graph（@xyflow/react）+ Heatmap Calendar
- [x] 全局搜索 + 搜索历史持久化
- [x] 数据导出（JSON / CSV / Markdown）+ 导入
- [x] PWA 离线 / 可安装
- [x] 深 / 亮主题 + 主色可定制
- [x] 命令面板（动作 + 实体模糊搜索）
- [ ] 跨设备同步（WebRTC / WebSocket 通道）
- [ ] 任务标签云 + 智能推荐
- [ ] 协作模式（共享仓库 / 角色权限）

---

## ✦ 许可与署名

本仓库当前为内部项目，源代码与设计资源暂未对外授权开源。如需引用、合作或扩展，请联系项目所有者。

---

<div align="center">

**Commit · taskflow ready**

`committed in the open · committed to the craft`

</div>