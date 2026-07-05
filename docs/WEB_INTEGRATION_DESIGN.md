# Commit — Web 端接入设计方案

**版本**: 2.0.0
**创建日期**: 2026-07-03
**更新日期**: 2026-07-05 — v2.0 基于项目重构全面重写
**状态**: 规划完成 — 已确认关键决策，待进入开发
**关联文档**: `docs/PRD.md`、`docs/TECHNICAL.md`、`docs/system_design.md`、`docs/MULTI_PLATFORM_GUARDRAILS.md`、`docs/DESIGN.md`

---

## 0. 文档目的

本文档分析 Commit 项目接入 Web 端的技术方案，核心回答两个问题：

1. **Web 端应该采用什么技术架构？**
2. **Web 端与现有 Flutter 架构应该合并还是分离？**

> **v2.0 变更说明**：项目已完成全面重构，新增 `AppThemeColors` (ThemeExtension) 主题系统、`ResponsiveLayout` / `SplitView` 响应式布局体系、屏幕级 `Notifier + State` 状态管理模式、`AppIcons` 统一图标系统、`HeroEmptyState` / `AppSegmentedControl` 等新组件。本文档已全部同步。

---

## 1. 已确认决策摘要

| 决策项 | 确认结果 |
|--------|---------|
| 产品定位 | 全功能 Web 版，更适配网页交互范式，功能与桌面端对等 |
| 数据同步 | 当前不需要，但架构必须预留扩展空间 |
| 技术栈 | React + TypeScript（排除 Vue）|
| 功能范围 | 全功能对等（仓库/分支/任务/搜索/热力图/Git Graph）|
| 项目关系 | Monorepo 子目录，与 Flutter 项目并存 |
| 本地存储 | Dexie.js (IndexedDB) |
| UI 组件 | Headless (Radix UI) + Tailwind CSS |
| 移动端适配 | Mobile-first 响应式，完整覆盖手机/平板/桌面，支持 PWA 安装 |
| Git Graph | ReactFlow（见第 6 节详细比较）|
| 主题系统 | 对齐重构后的 `AppThemeColors` + `isDarkMode` 模型，CSS 变量切换 |

---

## 2. 现有架构摘要（基于 v2.0 重构）

### 2.1 技术栈

| 维度 | 当前选型 |
|------|---------|
| 框架 | Flutter 3.x + Dart |
| 状态管理 | Riverpod 2.x — `StateNotifier` + `StateNotifierProvider`（手动声明，非 @riverpod 注解）|
| 数据库 | drift (SQLite ORM) + drift_sqflite + DAO 模式 |
| 路由 | go_router 14.x — `StatefulShellRoute.indexedStack` |
| DI | get_it + injectable（Notifier 内部通过 `getIt<T>()` 解析依赖）|
| 主题 | `AppThemeColors` (ThemeExtension) + `app_theme.dart` (完整 ThemeData) |
| 图标 | `AppIcons` 系统 — 内联 Heroicons SVG，36 个 `AppIconName` 枚举 |
| 持久化 | shared_preferences（设置项）|
| 目标平台 | iOS / Android / Windows / macOS |
| 数据存储 | 100% 本地 SQLite，离线优先 |
| 后端服务 | **无**（PRD 明确标注「数据同步：暂不实现」）|
| 用户认证 | **无**（本地应用，无账户体系）|

### 2.2 分层架构

```
Presentation (Screens + Notifiers + Widgets + Providers)
  │  ├─ Screens: 每屏独立 Notifier + State
  │  ├─ Widgets: 通用组件 + 业务组件
  │  └─ Providers: 按功能拆分 (branch/task/repository/heatmap/search/settings)
  ↓
Application (Use Cases — 单一职责业务编排)
  ↓
Domain (Entities + Repository Interfaces — 纯 Dart，零外部依赖)
  ↑
Data (drift DB + DAOs + Models + Local*Repository 实现)
```

**关键特征**：
- Domain 层为纯 Dart，定义了 `Task`、`Branch`、`Repository`、`Commit` 四个核心实体和对应的 Repository 接口
- Data 层完全绑定 drift/SQLite，所有 `Local*Repository` 通过 DAO 操作 `AppDatabase`
- 无网络层（TECHNICAL.md 列了 dio 但 pubspec.yaml 未实际引入）
- 无后端 API 契约定义

### 2.3 屏幕级状态管理模式（重构新增）

每个屏幕拥有独立的 `Notifier + State` 对，通过 `StateNotifierProvider` 暴露：

| 屏幕 | Notifier | State | 职责 |
|------|----------|-------|------|
| 首页 | `HomeNotifier` | `HomeState` | 仓库列表加载/创建/删除 |
| 仓库详情 | `RepositoryNotifier` | `RepositoryScreenState` | 分支/任务加载、分支切换、任务 CRUD、选中态 |
| 任务详情 | `TaskNotifier` | — | 单任务详情 + 提交历史 |
| 搜索 | `SearchNotifier` | — | 全局搜索 |
| 设置 | `SettingsNotifier` | `AppSettings` | 主题/通知/备份设置（持久化到 SharedPreferences）|

**DI 模式**：Notifier 构造函数内通过 `getIt<IRepositoryRepository>()` 解析依赖，不通过 Riverpod ref 注入。

```dart
// 重构后的典型 Notifier 模式
class HomeNotifier extends StateNotifier<HomeState> {
  HomeNotifier() : super(const HomeState()) {
    _repositoryRepo = getIt<IRepositoryRepository>();
    _createRepoUseCase = getIt<CreateRepositoryUseCase>();
    loadRepositories();
  }
  // ...
}
```

### 2.4 主题系统（重构新增）

**`AppThemeColors`** — Flutter `ThemeExtension<AppThemeColors>`，定义了全部语义色 token：

- 深色实例 (`AppThemeColors.dark`) 和浅色实例 (`AppThemeColors.light`)
- 组件层统一通过 `AppThemeColors.of(context)` 取色，不直接引用 `AppColors` 常量
- 包含 30+ token：canvas / surface1-4 / hairline / hairlineStrong / hairlineTertiary / ink / inkMuted / inkSubtle / inkTertiary / edgeHighlight / primaryGradient / primary / primaryHover / primaryFocus / primaryDark / onPrimary / success / successLight / warning / warningLight / error / errorLight / info / overlay / inverseCanvas / inverseInk

**`app_theme.dart`** — 完整 `ThemeData`（浅色 + 深色）：
- `cardTheme`：surface1 底 + radiusLg(12) + 1px hairline + elevation: 0
- `inputDecorationTheme`：surface1 填充 + radiusMd(8) + hairline 边框 + focus ring (primaryFocus @ 50%)
- `elevatedButtonTheme` / `outlinedButtonTheme` / `textButtonTheme`：统一按钮样式
- `appBarTheme`：canvas 底 + 1px hairline 底边 + 56px 高
- `dialogTheme`：surface1 底 + radiusXl(16) + hairlineStrong 边框
- `dividerTheme`：hairline 色 + 1px

**设置模型**：
```dart
class AppSettings {
  final bool isDarkMode;        // 深色/浅色切换（非 light/dark/system 三态）
  final String themeColor;      // 主题色自定义（如 '#3B82F6'）
  final bool enableNotifications;
  final int reminderHours;
  final bool enableAutoBackup;
}
```

**应用入口**：
```dart
// app.dart
MaterialApp.router(
  theme: buildLightTheme(),
  darkTheme: buildDarkTheme(),
  themeMode: settings.isDarkMode ? ThemeMode.dark : ThemeMode.light,
  // ...
)
```

### 2.5 响应式布局体系（重构新增）

#### `ResponsiveLayout` 工具类

| 方法 | 断点 | 对应常量 |
|------|------|---------|
| `isMobile` | < 768px | `< mobileBreakpoint` |
| `isMobileLg` | 768 ~ 1023px | `mobileBreakpoint ~ tabletBreakpoint` |
| `isTablet` | 1024 ~ 1279px | `tabletBreakpoint ~ desktopBreakpoint` |
| `isDesktop` | 1280 ~ 1439px | `desktopBreakpoint ~ desktopXlBreakpoint` |
| `isDesktopXl` | ≥ 1440px | `≥ desktopXlBreakpoint` |
| `isWide` | ≥ 1024px | `≥ tabletBreakpoint`（快捷判断）|

#### `ResponsiveBuilder` 组件

```dart
ResponsiveBuilder(
  mobile: MobileLayout(),
  tablet: TabletLayout(),    // 可选，缺省回退到 desktop
  desktop: DesktopLayout(),
)
```

#### `SplitView` Master-Detail 组件

- **≥ 1024px**：左右双栏（`Row` + `VerticalDivider`），master:detail = 2:3（可配置）
- **< 1024px**：只显示 master，detail 由调用方通过导航单独展示
- 支持 `detailVisible`（控制右侧面板显隐）和 `emptyDetail`（占位组件）

#### `AppScaffold` 导航切换

- **≥ 840px**：侧边导航（`_SideNav`，200px 宽，选中项左侧 3px primary 色条）
- **< 840px**：底部导航（`BottomNavWidget`，48px 高，4 项）

> **注意**：840px 是 `AppScaffold._desktopBreakpoint`，与 `ResponsiveLayout` 的 768px/1024px 不同，是导航模式专用断点。

### 2.6 统一图标系统（重构新增）

`AppIcons` 系统 — 36 个 `AppIconName` 枚举值，内联 Heroicons SVG 生成：

- UI 层统一使用 `AppIcon(AppIconName.xxx)` 渲染，不再直接依赖 Material Icons
- SVG 内联生成，无需维护大量图标资产文件
- 包含：repository / heatmap / graph / settings / add / edit / delete / search / back / close / more / chevronRight / checkCircle / undo / calendar / fork / star / success / error / warning / info / darkMode / upload / download / deleteSweep / notifications / timer / zoomIn / zoomOut / reset / gitBranch / gitCommit / gitMerge 等

### 2.7 核心实体模型

> 实体定义未随重构变化，与 v1.0 一致。

| 实体 | 关键字段 | 关系 |
|------|---------|------|
| **Repository** | id, name, icon, color, isArchived, isDeleted, createdAt, updatedAt | 1:N → Branch |
| **Branch** | id, repositoryId, name, parentBranchId, isMain, color, isDeleted, createdAt, updatedAt | N:1 → Repository, 1:N → Task, 自引用 parent |
| **Task** | id, branchId, title, description, status, priority, dueDate, completedAt, parentTaskId, sortOrder, isDeleted, createdAt, updatedAt | N:1 → Branch, 自引用 parent (子任务) |
| **Commit** | id, taskId, branchId, message, type, createdAt | N:1 → Task, N:1 → Branch |

**枚举**（均带 `value` + `label`，支持 `fromValue` 反序列化）：
- `TaskStatus`: todo(0) / inProgress(1) / done(2) / cancelled(3)
- `Priority`: low(0) / medium(1) / high(2)
- `CommitType`: create(0) / update(1) / merge(2) / complete(3) / delete(4)

### 2.8 数据库 Schema

```
Repositories ──1:N──→ Branches ──1:N──→ Tasks ──1:N──→ Commits
                         │                  │
                         └─ parentBranchId  └─ parentTaskId (子任务)

Tags ──M:N──→ TaskTags ←── Tasks
```

- 6 张表：`repositories`、`branches`、`tasks`、`commits`、`tags`、`task_tags`
- 4 个 DAO：`RepositoryDao`、`BranchDao`、`TaskDao`、`CommitDao`（均有 `.g.dart` 代码生成）
- 软删除模式（`isDeleted` 字段）
- 已建索引：`tasks(branch_id)`、`tasks(status)`、`tasks(due_date)`、`commits(task_id)`、`commits(branch_id)`

### 2.9 设计系统

已有完整的 Linear-inspired 设计规范（`docs/DESIGN.md`），包括：
- 色彩 Ladder：canvas / surface1-4 / hairline / hairlineStrong / hairlineTertiary / ink 四阶文字
- 13 档字号 + letterSpacing 体系
- 4px 网格间距体系（micro=2, xxs=4, xs=8, sm=12, md=16, lg=24, xl=32, xxl=48, section=96）
- 圆角体系（radiusXs=4 ~ radiusFull=999）
- 阴影体系（shadowSm / shadowMd / shadowLg）— 深色模式靠 surface ladder + hairline 承层级，几乎不用投影
- 动画体系（animFast=150ms / animNormal=250ms / animSlow=350ms，easeOutQuart / easeOutExpo 曲线）
- 顶部边缘微高光（`topEdgeHighlightGradient`）
- 深色模式为主模式，浅色模式完整映射（通过 `AppThemeColors.light`）
- 完整组件规范（按钮、卡片、徽章、输入框、对话框、分段选择器等）

### 2.10 重构后新增组件清单

| 组件 | 文件 | 说明 |
|------|------|------|
| `HeroEmptyState` | `widgets/common/hero_empty_state.dart` | 高端空状态：渐变图标盒 + 渐变标题 + CTA，内置 mobile/desktop 响应式 |
| `AppSegmentedControl` | `widgets/common/app_segmented_control.dart` | 分段选择器：pill 容器 + 选中 surface2 底，泛型 `<T>` |
| `AppDatePickerField` | `widgets/common/app_date_picker_field.dart` | 日期选择输入框 |
| `ResponsiveLayout` | `widgets/common/responsive_layout.dart` | 响应式断点工具 + `ResponsiveBuilder` 组件 |
| `SplitView` | `widgets/common/split_view.dart` | Master-Detail 分栏布局（≥1024px 双栏）|
| `HeatmapCalendar` | `widgets/heatmap/heatmap_calendar.dart` | 热力图日历组件（从 screen 提取）|
| `HeatmapCell` | `widgets/heatmap/heatmap_cell.dart` | 热力图单元格（从 screen 提取）|
| `RepositoryList` | `widgets/repository/repository_list.dart` | 仓库列表组件（从 screen 提取）|
| `TaskForm` | `widgets/task/task_form.dart` | 任务表单组件（从 screen 提取）|

### 2.11 现有功能与 Web 适配难度

| 功能 | 状态 | Web 端适配难度 | 说明 |
|------|------|---------------|------|
| 仓库 CRUD | ✅ | 低 | 标准 RESTful 操作 |
| 分支 CRUD + 合并 | ✅ | 低 | 合并逻辑在 Domain 层，直接移植 |
| 任务 CRUD + 子任务 | ✅ | 低 | 树形结构，递归渲染 |
| 提交历史 (Commit Log) | ✅ | 低 | 时间线列表 |
| 全局搜索 | ✅ | 低 | Dexie.js 支持 where/equals 查询 |
| 热力图 | ✅ | 中 | `HeatmapCalendar` + `HeatmapCell` → CSS Grid + Tailwind 重写 |
| Git Graph | ✅ | 中 | `graph_painter.dart` (CustomPainter) → ReactFlow 重写 |
| 数据导出 (JSON/CSV/MD) | ✅ | 低 | 浏览器 Download API |
| 本地通知 | ✅ | 中 | Web Notifications API |
| 主题切换 | ✅ | 低 | `AppThemeColors` → CSS 变量 + `.dark` / `.light` class |
| 响应式布局 | ✅ | 低 | `ResponsiveLayout` / `SplitView` → `useBreakpoint` hook + 条件渲染 |
| 桌面窗口管理 | ✅ | N/A | Web 无窗口概念 |
| 系统托盘 | ✅ | N/A | Web 无系统托盘 |
| 数据导入 | ⏳ | 低 | File Input + JSON 解析 |
| 数据同步 | ❌ | 预留 | 架构预留 Repository 接口抽象 |

---

## 3. 核心矛盾与解决策略

### 矛盾 1：本地存储 vs Web 存储

| 维度 | 桌面/移动 | Web |
|------|----------|-----|
| 存储引擎 | SQLite (drift) | IndexedDB (Dexie.js) |
| 数据持久性 | 永久 | 可能被浏览器清除 |
| 跨设备共享 | ❌ | ❌（当前阶段）|
| 存储容量 | 几乎无限 | ~50MB-1GB |

**解决策略**：使用 Dexie.js 封装 IndexedDB，提供与 drift 等价的查询能力。Repository 接口抽象层确保未来可无缝切换到后端 API。

### 矛盾 2：Domain 层复用 vs 技术栈选择

| 方案 | Domain 复用度 | Web 体验 | 决策 |
|------|-------------|---------|------|
| Flutter Web | 100% | ⚠️ 折中 | ❌ 不采用 |
| 独立 React 项目 | 0%（需移植）| ✅ 最佳 | ✅ 采用 |

**解决策略**：Domain 层从 Dart 移植为 TypeScript。实体模型简单（4 实体 + 3 枚举 + ~10 UseCase），移植成本可控。通过共享 JSON Schema 定义确保两端数据格式一致。

### 矛盾 3：离线优先 vs 未来同步扩展

**解决策略**：采用 Repository 接口模式。当前 Data 层实现为 `DexieTaskRepository`，未来引入后端时新增 `RemoteTaskRepository`，DI 容器切换实现即可，Presentation 和 Application 层零改动。

### 矛盾 4：主题系统映射（重构新增）

Flutter 端使用 `AppThemeColors` (ThemeExtension) 在 `ThemeData` 中注入深/浅色实例，组件通过 `AppThemeColors.of(context)` 取色。Web 端需要等价机制：

**解决策略**：CSS 自定义属性（CSS Variables）+ `.dark` / `.light` class 切换。每个 `AppThemeColors` token 映射为一个 CSS 变量，Tailwind 通过 `var(--color-xxx)` 引用。主题切换 = 切换 `<html>` 上的 class，所有变量瞬时更新。

---

## 4. 最终方案：独立 React Web + 纯前端存储（架构预留同步）

### 4.1 方案概述

```
Commit/ (Monorepo 根目录)
  ├── lib/                     ← 现有 Flutter 项目（不变）
  │   ├── domain/
  │   ├── data/
  │   ├── presentation/
  │   └── core/
  │
  ├── web/                     ← 新建 React Web 项目
  │   ├── src/
  │   │   ├── domain/          ← 从 Dart 移植
  │   │   ├── data/            ← Dexie.js 实现
  │   │   ├── application/     ← UseCase 移植
  │   │   ├── presentation/    ← React 组件
  │   │   └── core/            ← 主题/工具/DI
  │   ├── tailwind.config.ts   ← DESIGN.md token 映射
  │   └── vite.config.ts
  │
  └── docs/                    ← 共享文档（含 DESIGN.md）
```

### 4.2 为什么选择独立项目而非 Flutter Web

| 维度 | Flutter Web | 独立 React | 判定 |
|------|------------|-----------|------|
| 首屏性能 | ⚠️ 2MB+ WASM | ✅ <500KB | React 胜 |
| 交互范式 | ⚠️ Canvas 渲染，非原生 Web 交互 | ✅ 原生 DOM | React 胜 |
| CustomPainter 替代 | ⚠️ Web Canvas 性能折中 | ✅ ReactFlow / CSS Grid | React 胜 |
| 代码复用 | ✅ 100% | ❌ Domain 需移植 | Flutter 胜 |
| 未来同步扩展 | ⚠️ 需改造 Data 层 | ✅ Repository 接口可插拔 | React 胜 |
| SEO | ❌ 不可行 | ✅ 可选 SSR | React 胜 |
| 设计系统还原 | ⚠️ Flutter Widget 限制 | ✅ CSS/Tailwind 精准控制 | React 胜 |
| AppThemeColors 映射 | ⚠️ ThemeExtension 无法直接复用 | ✅ CSS Variables 等价映射 | React 胜 |

**核心判断**：用户明确要求"更适配网页的版本"，Flutter Web 的 Canvas 渲染模型与原生 Web 交互范式有本质差异。Domain 层移植成本（4 实体 + 3 枚举 + ~10 UseCase）远低于 Flutter Web 体验折中的长期代价。

### 4.3 为什么选择 Monorepo 子目录而非独立仓库

- **共享文档**：`docs/DESIGN.md` 是唯一视觉事实来源，两端必须对齐
- **共享数据格式**：JSON 导出/导入格式必须一致，放在同一仓库便于同步
- **独立代码**：`web/` 和 `lib/` 物理隔离，互不影响，各自独立构建
- **简单高效**：无需 pnpm workspace / turborepo 等工具链开销，一个 Git 仓库即可

---

## 5. 技术栈

### 5.1 完整选型

| 维度 | 选型 | 版本 | 理由 |
|------|------|------|------|
| **框架** | React | 18.x | 生态最大，排除 Vue 后的最佳选择 |
| **语言** | TypeScript | 5.x | 类型安全，类比 Dart 的类型系统 |
| **构建** | Vite | 6.x | 极速 HMR，生产构建优秀，零配置 |
| **样式** | Tailwind CSS | 4.x | 从 DESIGN.md token 精准映射，原子化 CSS |
| **状态** | Zustand | 5.x | 轻量，类比 Riverpod 的 StateNotifier 模式，无 boilerplate |
| **路由** | React Router | 7.x | 主流方案，支持数据加载 |
| **存储** | Dexie.js | 4.x | IndexedDB 封装，支持索引/事务/复杂查询，类比 drift |
| **UI 基础** | Radix UI | latest | 无样式无障碍基础组件（Dialog/Popover/Toast 等）|
| **图标** | Lucide React | latest | 对标 AppIcons (Heroicons)，SVG 图标库 |
| **Git Graph** | ReactFlow | 12.x | 见 §6 详细分析，移动端支持 pinch-to-zoom |
| **热力图** | CSS Grid + Tailwind | — | 纯 CSS 实现，移动端水平滚动 |
| **PWA** | vite-plugin-pwa | latest | Service Worker + manifest，可安装到主屏幕 |
| **虚拟列表** | @tanstack/react-virtual | 3.x | 长列表性能优化（任务列表/提交历史） |
| **日期** | date-fns | 4.x | 轻量日期处理，类比 intl |
| **UUID** | uuid | 10.x | 与 Dart 端一致，生成 v4 UUID |
| **DI** | tsyringe | 4.x | 轻量 DI 容器，类比 get_it |

### 5.2 与 Flutter 端技术栈对照（重构后）

| 维度 | Flutter 端（重构后） | Web 端 | 对应关系 |
|------|---------------------|--------|---------|
| 状态管理 | Riverpod StateNotifier + State | Zustand store | 每屏独立 store，类比 Notifier+State |
| 数据库 | drift + SQLite + DAO | Dexie.js + IndexedDB | ORM 层等价 |
| 路由 | go_router (StatefulShellRoute) | React Router | 嵌套路由 + Outlet |
| DI | get_it + injectable | tsyringe | 服务定位器模式 |
| 主题 | AppThemeColors (ThemeExtension) | CSS Variables + .dark/.light class | 语义色 token 等价 |
| 图标 | AppIcons (Heroicons 内联 SVG) | Lucide React | SVG 图标库 |
| 响应式 | ResponsiveLayout + SplitView | useBreakpoint hook + 条件渲染 | 断点体系等价 |
| 设置持久化 | SharedPreferences | localStorage | 键值对存储 |
| 日期 | intl | date-fns | 日期格式化 |

---

## 6. Git Graph 可视化方案比较与推荐

### 6.1 现有 Flutter 实现分析

当前 `graph_painter.dart` + `git_graph_screen.dart` 的实现特征：
- `CommitNode`：id, branchId, message, column, parents[]
- 贝塞尔曲线连接父子节点（`Path.cubicTo`）
- 彩色圆点节点（外环分支色 + 内心 canvas 色），merge 节点用 primary 色
- 选中态外圈描边
- `InteractiveViewer` + `TransformationController` 实现缩放/平移
- 缩放范围 0.5x ~ 2.0x，步进 0.1
- 右下角浮动缩放控件（放大/缩小/重置 + 百分比显示）
- 底部详情面板（选中节点时展示）

### 6.2 方案比较

| 维度 | D3.js | ReactFlow | vis-network | Canvas 手写 |
|------|-------|-----------|-------------|------------|
| **React 集成** | ⚠️ 冲突 | ✅ 原生 React 组件 | ⚠️ 需 wrapper | ⚠️ 需手动管理 |
| **Pan/Zoom** | 需自己实现 | ✅ 内置 | ✅ 内置 | 需自己实现 |
| **自定义节点** | ✅ 完全自由 | ✅ React 组件作为节点 | ⚠️ 仅 Canvas 绘制 | ✅ 完全自由 |
| **自定义连线** | ✅ Path 生成器 | ✅ 自定义 Edge 类型 | ⚠️ 有限定制 | ✅ 完全自由 |
| **样式控制** | ✅ SVG/CSS | ✅ CSS/Tailwind | ❌ Canvas API | ✅ Canvas API |
| **交互事件** | 需自己实现 | ✅ 内置 onClick/onSelect | ✅ 内置 | 需自己实现 |
| **性能** | ✅ SVG 虚拟化 | ✅ 内置虚拟化 | ✅ Canvas 高性能 | ✅ Canvas 最高 |
| **无障碍** | ✅ SVG DOM | ✅ DOM 元素 | ❌ Canvas 无语义 | ❌ Canvas 无语义 |
| **学习曲线** | ⚠️ 陡峭 | ✅ 平缓 | ⚠️ 中等 | ⚠️ 高 |
| **维护成本** | ⚠️ 高 | ✅ 低（纯 React）| ⚠️ 中 | ❌ 高 |
| **DESIGN.md 还原** | ✅ 精准 | ✅ 精准 | ❌ 困难 | ✅ 精准 |
| **包体积** | ~280KB / ~60KB (modular) | ~120KB | ~400KB | 0 |

### 6.3 推荐：ReactFlow

**选择理由**：

1. **内置 Pan/Zoom**：完美替代 Flutter 的 `InteractiveViewer` + `TransformationController`，支持 minScale/maxScale 配置
2. **React 原生**：节点是 React 组件，可以直接用 Tailwind 样式精准匹配 DESIGN.md 的节点规范
3. **自定义 Edge**：贝塞尔曲线 Edge 类型，与 Flutter 端 `cubicTo` 路径效果一致
4. **交互内置**：节点点击/选中事件开箱即用，无需手动实现 hit detection
5. **虚拟化**：大量 commit 节点时自动虚拟化渲染
6. **无障碍**：节点是 DOM 元素，可添加 ARIA 标签
7. **移动端**：原生支持 `zoomOnPinch`（双指缩放）和 `panOnDrag`（单指拖拽）

**实现要点**：
- 自定义 `CommitNode` 组件：外环分支色 + 内心 canvas 色，merge 节点用 primary
- 自定义 `BranchEdge` 类型：贝塞尔曲线，颜色按分支色环
- `panOnDrag` + `zoomOnScroll` 启用，`minZoom={0.5}` + `maxZoom={2.0}` 对齐 Flutter 端
- 右下角 `<Controls />` 组件或自定义缩放控件
- 底部详情面板用 React 条件渲染

### 6.4 热力图方案：CSS Grid + Tailwind

Flutter 端已将热力图拆分为 `HeatmapCalendar` + `HeatmapCell` 组件，Web 端对应实现更简单：
- 热力图本质是 7 行 × N 列的彩色方格网格
- CSS Grid 天然适合网格布局
- 每个格子是 DOM 元素，可添加 hover tooltip
- Tailwind 直接控制颜色（`bg-heatmap-empty` / `bg-heatmap-level-1` 等）
- 移动端水平滚动

---

## 7. 详细架构设计

### 7.1 项目结构

```
web/
├── public/
│   ├── favicon.svg
│   ├── manifest.json             ← PWA manifest
│   └── icons/                    ← PWA 图标 (192/512/maskable)
├── src/
│   ├── domain/                    ← 从 Dart 移植，纯 TS
│   │   ├── entities/
│   │   │   ├── task.ts
│   │   │   ├── branch.ts
│   │   │   ├── repository.ts
│   │   │   ├── commit.ts
│   │   │   └── enums.ts           ← TaskStatus, Priority, CommitType (带 value + label)
│   │   ├── repositories/          ← 接口定义
│   │   │   ├── i-task-repository.ts
│   │   │   ├── i-branch-repository.ts
│   │   │   ├── i-repository-repository.ts
│   │   │   └── i-commit-repository.ts
│   │   └── services/
│   │       └── data-export-service.ts
│   │
│   ├── data/                      ← Dexie.js 实现
│   │   ├── db/
│   │   │   └── app-database.ts    ← Dexie DB 定义 (6 表 + 索引)
│   │   ├── models/                ← Entity ↔ DB Record 转换
│   │   │   ├── task-model.ts
│   │   │   ├── branch-model.ts
│   │   │   ├── repository-model.ts
│   │   │   └── commit-model.ts
│   │   └── repositories/          ← 接口实现
│   │       ├── dexie-task-repository.ts
│   │       ├── dexie-branch-repository.ts
│   │       ├── dexie-repository-repository.ts
│   │       └── dexie-commit-repository.ts
│   │
│   ├── application/               ← UseCase 移植
│   │   └── usecases/
│   │       ├── task/
│   │       │   ├── create-task-usecase.ts
│   │       │   ├── update-task-usecase.ts
│   │       │   ├── complete-task-usecase.ts
│   │       │   └── delete-task-usecase.ts
│   │       ├── branch/
│   │       │   ├── create-branch-usecase.ts
│   │       │   ├── merge-branch-usecase.ts
│   │       │   └── delete-branch-usecase.ts
│   │       └── repository/
│   │           ├── create-repository-usecase.ts
│   │           ├── update-repository-usecase.ts
│   │           └── delete-repository-usecase.ts
│   │
│   ├── presentation/              ← React UI
│   │   ├── screens/
│   │   │   ├── home-screen.tsx          ← HomeStore (类比 HomeNotifier + HomeState)
│   │   │   ├── repository-screen.tsx    ← RepositoryStore (类比 RepositoryNotifier + RepositoryScreenState)
│   │   │   ├── task-detail-screen.tsx   ← TaskStore (类比 TaskNotifier)
│   │   │   ├── task-form-screen.tsx
│   │   │   ├── search-screen.tsx        ← SearchStore (类比 SearchNotifier)
│   │   │   ├── heatmap-screen.tsx
│   │   │   ├── git-graph-screen.tsx
│   │   │   └── settings-screen.tsx      ← SettingsStore (类比 SettingsNotifier + AppSettings)
│   │   ├── stores/               ← Zustand stores (每屏独立，类比 Notifier + State)
│   │   │   ├── home-store.ts
│   │   │   ├── repository-store.ts
│   │   │   ├── task-store.ts
│   │   │   ├── search-store.ts
│   │   │   └── settings-store.ts
│   │   ├── components/
│   │   │   ├── common/            ← 通用组件 (对齐 DESIGN.md)
│   │   │   │   ├── app-button.tsx       ← 对齐 app_button.dart
│   │   │   │   ├── app-card.tsx
│   │   │   │   ├── app-badge.tsx        ← 对齐 app_badge.dart
│   │   │   │   ├── app-input.tsx        ← 对齐 app_input.dart
│   │   │   │   ├── app-dialog.tsx       ← 对齐 app_dialog.dart
│   │   │   │   ├── app-toast.tsx        ← 对齐 app_toast.dart
│   │   │   │   ├── app-date-picker.tsx  ← 对齐 app_date_picker_field.dart
│   │   │   │   ├── app-segmented-control.tsx ← 对齐 app_segmented_control.dart (pill 容器)
│   │   │   │   ├── hero-empty-state.tsx ← 对齐 hero_empty_state.dart (渐变图标 + 渐变标题)
│   │   │   │   ├── side-nav.tsx         ← 桌面端侧边导航 (200px, 3px primary 色条)
│   │   │   │   ├── bottom-nav.tsx       ← 移动端底部导航 (48px, 4 项)
│   │   │   │   ├── bottom-sheet.tsx     ← 移动端底部弹出面板
│   │   │   │   ├── pull-to-refresh.tsx  ← 移动端下拉刷新
│   │   │   │   ├── fab.tsx              ← 浮动操作按钮
│   │   │   │   ├── split-view.tsx       ← Master-Detail 分栏 (≥1024px, 对齐 split_view.dart)
│   │   │   │   ├── responsive-builder.tsx ← 对齐 responsive_layout.dart
│   │   │   │   ├── loading-widget.tsx   ← 对齐 loading_widget.dart
│   │   │   │   └── error-widget.tsx     ← 对齐 error_widget.dart
│   │   │   ├── layout/
│   │   │   │   ├── app-layout.tsx       ← 导航模式切换 (≥840px / <840px)
│   │   │   │   └── safe-area.tsx        ← iOS 安全区包装器
│   │   │   ├── repository/
│   │   │   │   ├── repository-card.tsx
│   │   │   │   └── repository-list.tsx  ← 对齐 repository_list.dart
│   │   │   ├── branch/
│   │   │   │   ├── branch-indicator.tsx
│   │   │   │   └── branch-list.tsx
│   │   │   ├── task/
│   │   │   │   ├── task-card.tsx
│   │   │   │   ├── task-list.tsx
│   │   │   │   └── task-form.tsx        ← 对齐 task_form.dart
│   │   │   ├── heatmap/
│   │   │   │   ├── heatmap-cell.tsx     ← 对齐 heatmap_cell.dart
│   │   │   │   └── heatmap-calendar.tsx ← 对齐 heatmap_calendar.dart
│   │   │   └── graph/
│   │   │       ├── commit-node.tsx       ← ReactFlow 自定义节点
│   │   │       └── branch-edge.tsx       ← ReactFlow 自定义连线
│   │   └── icons/
│   │       └── app-icons.tsx             ← 对齐 AppIcons 系统 (Lucide 映射)
│   │
│   ├── core/
│   │   ├── theme/
│   │   │   ├── colors.ts          ← DESIGN.md §2 色彩 token (CSS Variables)
│   │   │   ├── typography.ts      ← DESIGN.md §3 字号 token
│   │   │   ├── dimensions.ts      ← DESIGN.md §4 间距 token + 断点常量 + 阴影 + 动画
│   │   │   └── theme-provider.tsx ← 主题 Provider (对齐 AppThemeColors + app_theme.dart)
│   │   ├── hooks/
│   │   │   ├── use-is-desktop.ts  ← 导航模式判断 (≥840px, 对齐 AppScaffold._desktopBreakpoint)
│   │   │   ├── use-is-mobile.ts   ← 移动端判断 (<768px, 对齐 ResponsiveLayout.isMobile)
│   │   │   ├── use-is-wide.ts     ← 宽屏判断 (≥1024px, 对齐 ResponsiveLayout.isWide / SplitView)
│   │   │   ├── use-breakpoint.ts  ← 当前断点查询 (对齐 ResponsiveLayout 全部方法)
│   │   │   └── use-swipe.ts       ← 触摸手势 (左滑/右滑/下拉)
│   │   ├── di/
│   │   │   └── injection-container.ts  ← tsyringe DI 配置 (对齐 getIt)
│   │   ├── constants/
│   │   │   └── app-constants.ts
│   │   ├── extensions/
│   │   │   ├── date-extensions.ts
│   │   │   └── string-extensions.ts    ← 对齐 string_extensions.dart
│   │   └── utils/
│   │       ├── formatters.ts
│   │       ├── logger.ts
│   │       └── validators.ts
│   │
│   ├── platform/                  ← Web 平台特定
│   │   ├── web-notification-service.ts
│   │   └── web-file-save-service.ts
│   │
│   ├── app.tsx                    ← 根组件 + 路由 + 主题 Provider
│   ├── main.tsx                   ← 入口
│   └── index.css                  ← Tailwind + CSS Variables (AppThemeColors 映射)
│
├── shared/                        ← 两端共享的数据契约
│   └── schemas/
│       └── export-schema.json     ← JSON 导出格式定义
│
├── tailwind.config.ts             ← DESIGN.md token → Tailwind
├── vite.config.ts
├── tsconfig.json
└── package.json
```

### 7.2 主题系统映射（AppThemeColors → CSS Variables）

Flutter 端 `AppThemeColors` (ThemeExtension) 有深/浅两个实例。Web 端用 CSS Variables 等价实现：

```css
/* index.css — AppThemeColors 映射 */

/* 深色模式 (AppThemeColors.dark) — 默认 */
:root {
  /* Surface Ladder */
  --color-canvas: #0F172A;
  --color-surface-1: #1E293B;
  --color-surface-2: #334155;
  --color-surface-3: #475569;
  --color-surface-4: #64748B;

  /* Hairline Borders */
  --color-hairline: #1E293B;
  --color-hairline-strong: #334155;
  --color-hairline-tertiary: #475569;

  /* Text (Ink) */
  --color-ink: #F1F5F9;
  --color-ink-muted: #94A3B8;
  --color-ink-subtle: #64748B;
  --color-ink-tertiary: #475569;

  /* Edge Highlight (DESIGN.md §5.1) */
  --color-edge-highlight: rgba(255, 255, 255, 0.06);

  /* Accent — 可被 themeColor 覆盖 */
  --color-primary: #3B82F6;
  --color-primary-hover: #60A5FA;
  --color-primary-focus: #2563EB;
  --color-primary-dark: #1D4ED8;
  --color-on-primary: #FFFFFF;

  /* Semantic */
  --color-success: #10B981;
  --color-success-light: rgba(16, 185, 129, 0.1);
  --color-warning: #F59E0B;
  --color-warning-light: rgba(245, 158, 11, 0.1);
  --color-error: #EF4444;
  --color-error-light: rgba(239, 68, 68, 0.1);
  --color-info: #3B82F6;

  /* Overlay & Inverse */
  --color-overlay: rgba(0, 0, 0, 0.5);
  --color-inverse-canvas: #F8FAFC;
  --color-inverse-ink: #0F172A;
}

/* 浅色模式 (AppThemeColors.light) */
.light {
  /* Surface Ladder — 反转 */
  --color-canvas: #F8FAFC;
  --color-surface-1: #FFFFFF;
  --color-surface-2: #F1F5F9;
  --color-surface-3: #E2E8F0;
  --color-surface-4: #CBD5E1;

  /* Hairline Borders — 反转 */
  --color-hairline: #E2E8F0;
  --color-hairline-strong: #CBD5E1;
  --color-hairline-tertiary: #94A3B8;

  /* Text (Ink) — 反转 */
  --color-ink: #0F172A;
  --color-ink-muted: #475569;
  --color-ink-subtle: #64748B;
  --color-ink-tertiary: #94A3B8;

  /* Edge Highlight */
  --color-edge-highlight: rgba(0, 0, 0, 0.06);

  /* Accent / Semantic / Overlay — 色值不变 */
  /* (与深色模式相同，仅 surface/ink 反转) */
}
```

```typescript
// tailwind.config.ts — 通过 CSS 变量引用
export default {
  darkMode: 'class',  // .dark / .light class 切换
  theme: {
    extend: {
      colors: {
        canvas: 'var(--color-canvas)',
        'surface-1': 'var(--color-surface-1)',
        'surface-2': 'var(--color-surface-2)',
        'surface-3': 'var(--color-surface-3)',
        'surface-4': 'var(--color-surface-4)',
        hairline: 'var(--color-hairline)',
        'hairline-strong': 'var(--color-hairline-strong)',
        'hairline-tertiary': 'var(--color-hairline-tertiary)',
        ink: 'var(--color-ink)',
        'ink-muted': 'var(--color-ink-muted)',
        'ink-subtle': 'var(--color-ink-subtle)',
        'ink-tertiary': 'var(--color-ink-tertiary)',
        primary: 'var(--color-primary)',
        'primary-hover': 'var(--color-primary-hover)',
        'primary-focus': 'var(--color-primary-focus)',
        'primary-dark': 'var(--color-primary-dark)',
        'on-primary': 'var(--color-on-primary)',
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        error: 'var(--color-error)',
        info: 'var(--color-info)',
        // ... 其他语义色
      },
      fontSize: {
        // 13 档字号 + letterSpacing (DESIGN.md §3.2)
        'display-xl': ['48px', { letterSpacing: '-2.0px' }],
        'display-lg': ['40px', { letterSpacing: '-1.5px' }],
        'display-md': ['32px', { letterSpacing: '-1.0px' }],
        'headline':   ['24px', { letterSpacing: '-0.6px' }],
        'subhead':    ['20px', { letterSpacing: '-0.3px' }],
        'card-title': ['17px', { letterSpacing: '-0.4px' }],
        'body-lg':    ['17px', { letterSpacing: '-0.1px' }],
        'body':       ['15px', { letterSpacing: '-0.05px' }],
        'body-sm':    ['13px', { letterSpacing: '0' }],
        'button':     ['14px', { letterSpacing: '0' }],
        'caption':    ['11px', { letterSpacing: '0' }],
        'eyebrow':    ['12px', { letterSpacing: '0.4px' }],
        'mono-sm':    ['11px', { letterSpacing: '0' }],
      },
      spacing: {
        // 4px 网格 (DESIGN.md §4) — 对齐 AppDimensions
        'micro': '2px',
        'xxs': '4px',
        'xs': '8px',
        'sm': '12px',
        'md': '16px',
        'lg': '24px',
        'xl': '32px',
        'xxl': '48px',
        'section': '96px',
      },
      borderRadius: {
        'xs': '4px',
        'sm': '6px',
        'md': '8px',     // 所有按钮、表单输入
        'lg': '12px',    // 卡片
        'xl': '16px',    // 大面板、模态
        'xxl': '24px',   // 空状态
        'pill': '999px', // 分段选择器、status pill
        'full': '999px',
      },
      boxShadow: {
        // 对齐 AppDimensions.shadowSm/Md/Lg
        'sm': '0 1px 2px rgba(0,0,0,0.05)',
        'md': '0 2px 6px rgba(0,0,0,0.1)',
        'lg': '0 4px 12px rgba(0,0,0,0.15)',
      },
      transitionDuration: {
        // 对齐 AppDimensions.animFast/Normal/Slow
        'fast': '150ms',
        'normal': '250ms',
        'slow': '350ms',
      },
      transitionTimingFunction: {
        // 对齐 AppDimensions.easeOutQuart / easeOutExpo
        'out-quart': 'cubic-bezier(0.25, 1, 0.5, 1)',
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
}
```

### 7.3 状态管理模式映射（Notifier + State → Zustand Store）

Flutter 端重构后每屏有独立 `Notifier + State`，Web 端用 Zustand store 等价实现：

```typescript
// stores/home-store.ts — 对齐 HomeNotifier + HomeState
interface HomeState {
  repositories: Repository[]
  isLoading: boolean
  error: string | null
}

interface HomeStore extends HomeState {
  loadRepositories: () => Promise<void>
  createRepository: (name: string, icon?: string, color?: string) => Promise<Repository | null>
  deleteRepository: (id: string) => Promise<void>
}

const useHomeStore = create<HomeStore>((set) => {
  // DI 解析 — 对齐 getIt<IRepositoryRepository>()
  const repositoryRepo = container.resolve<IRepositoryRepository>('IRepositoryRepository')
  const createRepoUseCase = container.resolve(CreateRepositoryUseCase)
  const deleteRepoUseCase = container.resolve(DeleteRepositoryUseCase)

  return {
    repositories: [],
    isLoading: false,
    error: null,

    loadRepositories: async () => {
      set({ isLoading: true, error: null })
      try {
        const repos = await repositoryRepo.getAll()
        set({ repositories: repos, isLoading: false })
      } catch (e) {
        set({ isLoading: false, error: String(e) })
      }
    },

    createRepository: async (name, icon = 'folder', color = '#3B82F6') => {
      try {
        const repo = await createRepoUseCase.execute({ name, icon, color })
        await useHomeStore.getState().loadRepositories()
        return repo
      } catch (e) {
        set({ error: String(e) })
        return null
      }
    },

    deleteRepository: async (id) => {
      try {
        await deleteRepoUseCase.execute(id)
        await useHomeStore.getState().loadRepositories()
      } catch (e) {
        set({ error: String(e) })
      }
    },
  }
})
```

```typescript
// stores/settings-store.ts — 对齐 SettingsNotifier + AppSettings
interface AppSettings {
  isDarkMode: boolean       // 注意：bool，非 'light'|'dark'|'system'
  themeColor: string        // 主题色自定义
  enableNotifications: boolean
  reminderHours: number
  enableAutoBackup: boolean
}

interface SettingsStore extends AppSettings {
  setDarkMode: (value: boolean) => void
  setThemeColor: (color: string) => void
  setNotifications: (value: boolean) => void
  setReminderHours: (hours: number) => void
  setAutoBackup: (value: boolean) => void
}

const useSettingsStore = create<SettingsStore>((set) => {
  // 从 localStorage 加载 — 对齐 SharedPreferences
  const load = <T>(key: string, fallback: T): T => {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) : fallback
  }

  const persist = (key: string, value: unknown) => {
    localStorage.setItem(key, JSON.stringify(value))
  }

  return {
    isDarkMode: load('isDarkMode', true),
    themeColor: load('themeColor', '#3B82F6'),
    enableNotifications: load('enableNotifications', true),
    reminderHours: load('reminderHours', 1),
    enableAutoBackup: load('enableAutoBackup', false),

    setDarkMode: (value) => {
      persist('isDarkMode', value)
      set({ isDarkMode: value })
      // 应用主题 — 对齐 app.dart 的 themeMode 逻辑
      document.documentElement.classList.toggle('dark', value)
      document.documentElement.classList.toggle('light', !value)
    },
    setThemeColor: (color) => {
      persist('themeColor', color)
      set({ themeColor: color })
      // 动态覆盖 --color-primary 等 CSS 变量
      applyThemeColor(color)
    },
    // ... 其他 setter
  }
})
```

### 7.4 数据库 Schema 映射（Dexie.js）

```typescript
// src/data/db/app-database.ts
import Dexie, { Table } from 'dexie'

class AppDatabase extends Dexie {
  repositories!: Table<RepositoryRecord, string>
  branches!: Table<BranchRecord, string>
  tasks!: Table<TaskRecord, string>
  commits!: Table<CommitRecord, string>
  tags!: Table<TagRecord, string>
  taskTags!: Table<TaskTagRecord, string>

  constructor() {
    super('commit-db')

    this.version(1).stores({
      // 主键 + 索引，对齐 Flutter 端 DAO 索引策略
      repositories: 'id, isArchived, isDeleted',
      branches: 'id, repositoryId, parentBranchId, isDeleted',
      tasks: 'id, branchId, status, dueDate, parentTaskId, isDeleted, sortOrder',
      commits: 'id, taskId, branchId, createdAt',
      tags: 'id, name',
      taskTags: '[taskId+tagId], taskId, tagId',
    })
  }
}
```

### 7.5 Repository 接口模式（预留同步扩展）

```typescript
// src/domain/repositories/i-task-repository.ts
export interface ITaskRepository {
  getAll(): Promise<Task[]>
  getByBranchId(branchId: string): Promise<Task[]>
  getById(id: string): Promise<Task | null>
  create(task: Task): Promise<Task>
  update(task: Task): Promise<Task>
  delete(id: string): Promise<void>
  search(query: string): Promise<Task[]>
  searchInRepository(repositoryId: string, query: string): Promise<Task[]>
  getCompletedByDateRange(start: Date, end: Date): Promise<Task[]>
}

// src/data/repositories/dexie-task-repository.ts — 当前实现
export class DexieTaskRepository implements ITaskRepository {
  constructor(private db: AppDatabase) {}
  // ... 实现
}

// 未来扩展：remote-task-repository.ts — 引入后端时新增
// export class RemoteTaskRepository implements ITaskRepository { ... }

// DI 容器
container.register<ITaskRepository>('ITaskRepository', {
  useFactory: () => new DexieTaskRepository(container.resolve(AppDatabase)),
})
```

### 7.6 数据兼容性

Web 端的 JSON 导出格式与 Flutter 端 `DataExportService` 完全一致：

```json
{
  "version": 1,
  "exportedAt": "2026-07-05T00:00:00.000Z",
  "repositories": [{ "id": "...", "name": "...", ... }],
  "branches": [{ "id": "...", "repositoryId": "...", ... }],
  "tasks": [{ "id": "...", "branchId": "...", ... }],
  "commits": [{ "id": "...", "taskId": "...", ... }]
}
```

### 7.7 响应式组件映射

Flutter 端重构后的响应式组件 → Web 端等价实现：

| Flutter 组件 | Web 端组件 | 说明 |
|-------------|-----------|------|
| `ResponsiveLayout` (工具类) | `useBreakpoint()` hook | 5 个断点方法：isMobile/isMobileLg/isTablet/isDesktop/isDesktopXl |
| `ResponsiveBuilder` | `<ResponsiveBuilder>` 组件 | mobile/tablet/desktop 三态渲染 |
| `SplitView` | `<SplitView>` 组件 | ≥1024px 双栏 master-detail，<1024px 仅 master |
| `HeroEmptyState` | `<HeroEmptyState>` 组件 | 渐变图标 + 渐变标题 + CTA，内置 mobile/desktop 响应式 |
| `AppScaffold` (840px 断点) | `<AppLayout>` 组件 | ≥840px 侧边导航，<840px 底部导航 |
| `AppSegmentedControl` | `<AppSegmentedControl>` 组件 | pill 容器 + 选中 surface2 底 |
| `AppIcons` (Heroicons SVG) | Lucide React + 映射表 | 36 个图标名 → Lucide 组件名映射 |

---

## 8. 响应式布局与移动端适配策略

### 8.1 设计哲学：Mobile-First

Web 端必须完整覆盖从手机（≥320px）到超宽桌面（≥1440px）的全尺寸范围。采用 **Mobile-First** 策略：

- 默认样式面向移动端编写，通过 `min-width` 媒体查询逐步增强
- 所有功能在手机端可用，不只是"能看"，而是"好用"
- 触摸交互优先，鼠标/键盘作为渐进增强
- 不做"移动端简化版"——功能与桌面端完全对等

### 8.2 断点体系

严格对齐 Flutter 端 `ResponsiveLayout` + `AppDimensions` 的断点定义：

| 断点名称 | Tailwind 前缀 | 宽度范围 | 对应 Flutter 方法 | 用途 |
|---------|-------------|---------|------------------|------|
| **mobile** | (默认) | 0 ~ 767px | `ResponsiveLayout.isMobile` | 手机竖屏 / 横屏 |
| **mobileLg** | `md:` | 768 ~ 1023px | `ResponsiveLayout.isMobileLg` | 平板竖屏 |
| **tablet** | `lg:` | 1024 ~ 1279px | `ResponsiveLayout.isTablet` | 平板横屏 / 小笔电 |
| **desktop** | `xl:` | 1280 ~ 1439px | `ResponsiveLayout.isDesktop` | 标准桌面 |
| **desktopXl** | `2xl:` | ≥ 1440px | `ResponsiveLayout.isDesktopXl` | 超宽桌面 |

**专用断点**（不放入 Tailwind screens，单独管理）：

| 断点 | 值 | 用途 | 对应 Flutter |
|------|-----|------|-------------|
| 导航切换 | 840px | 侧边导航 ↔ 底部导航 | `AppScaffold._desktopBreakpoint` |
| 分栏切换 | 1024px | SplitView 双栏 ↔ 单栏 | `SplitView` (=`tabletBreakpoint`) |
| 宽屏快捷 | 1024px | `isWide` 判断 | `ResponsiveLayout.isWide` |

```typescript
// tailwind.config.ts — 断点配置
export default {
  theme: {
    screens: {
      'mobile': '0px',
      'tablet': '768px',     // md: — 对齐 mobileBreakpoint
      'laptop': '1024px',    // lg: — 对齐 tabletBreakpoint
      'desktop': '1280px',   // xl: — 对齐 desktopBreakpoint
      'desktop-xl': '1440px',// 2xl: — 对齐 desktopXlBreakpoint
    },
  },
}

// 专用断点常量
export const NAV_BREAKPOINT = 840   // AppScaffold._desktopBreakpoint
export const SPLIT_BREAKPOINT = 1024 // SplitView / tabletBreakpoint
export const WIDE_BREAKPOINT = 1024  // ResponsiveLayout.isWide
```

### 8.3 useBreakpoint Hook（对齐 ResponsiveLayout）

```typescript
// hooks/use-breakpoint.ts — 对齐 ResponsiveLayout 工具类
function useBreakpoint() {
  const [width, setWidth] = useState(window.innerWidth)

  useEffect(() => {
    const handler = () => setWidth(window.innerWidth)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  return {
    isMobile: width < 768,                    // ResponsiveLayout.isMobile
    isMobileLg: width >= 768 && width < 1024, // ResponsiveLayout.isMobileLg
    isTablet: width >= 1024 && width < 1280,  // ResponsiveLayout.isTablet
    isDesktop: width >= 1280 && width < 1440, // ResponsiveLayout.isDesktop
    isDesktopXl: width >= 1440,               // ResponsiveLayout.isDesktopXl
    isWide: width >= 1024,                    // ResponsiveLayout.isWide
  }
}
```

### 8.4 导航系统适配

对齐 Flutter 端 `AppScaffold` 的双模式导航（840px 断点）：

```
┌─────────────────────────────────────────────────────────────────┐
│  ≥ 840px (Desktop / Laptop / Tablet 横屏)                       │
│  ┌──────────┬──────────────────────────────────────────────┐   │
│  │ SideNav  │  Main Content                                │   │
│  │ 200px    │  (max-width: 1280px, 居中)                    │   │
│  │ ──────── │                                              │   │
│  │ ◉ 仓库   │                                              │   │
│  │ ○ 热力图 │                                              │   │
│  │ ○ 图形   │                                              │   │
│  │ ○ 设置   │                                              │   │
│  └──────────┴──────────────────────────────────────────────┘   │
│  侧边导航: 200px 宽, 选中项左侧 3px primary 色条                   │
└─────────────────────────────────────────────────────────────────┘

┌───────────────────────────┐
│  < 840px (Mobile / Tablet) │
│  ┌───────────────────────┐ │
│  │   Main Content        │ │
│  │   (full width)        │ │
│  ├───────────────────────┤ │
│  │ 仓库  热力图  图形  设置│ │ ← 底部导航 48px
│  └───────────────────────┘ │
└───────────────────────────┘
```

```typescript
// AppLayout.tsx — 对齐 AppScaffold
function AppLayout() {
  const isDesktop = useIsDesktop() // ≥ 840px

  if (isDesktop) {
    return (
      <div className="flex h-screen">
        <SideNav />              {/* 200px 固定宽度, 3px primary 色条 */}
        <div className="hairline-left flex-1 overflow-auto">
          <main className="mx-auto max-w-[1280px] p-md">
            <Outlet />
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col">
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
      <BottomNav />  {/* 48px 高, SafeArea insets */}
    </div>
  )
}
```

### 8.5 SplitView Master-Detail（对齐 split_view.dart）

```typescript
// SplitView.tsx — 对齐 Flutter SplitView (≥1024px 双栏)
function SplitView({
  master, detail, detailVisible = true, masterFlex = 2, detailFlex = 3, emptyDetail
}: SplitViewProps) {
  const isWide = useIsWide() // ≥ 1024px

  if (!isWide) return <>{master}</>  // < 1024px: 仅 master

  return (
    <div className="flex h-full">
      <div className="flex-[2] overflow-auto">{master}</div>
      <div className="w-px bg-hairline" />  {/* VerticalDivider */}
      <div className="flex-[3] overflow-auto">
        {detailVisible ? detail : (emptyDetail ?? <div className="h-full w-full" />)}
      </div>
    </div>
  )
}
```

### 8.6 各页面移动端适配详情

#### 8.6.1 首页（仓库列表）

对齐 `home_screen.dart` + `HeroEmptyState`：

| 维度 | 桌面端 (≥840px) | 移动端 (<840px) |
|------|----------------|----------------|
| 内容最大宽度 | 1280px 居中 | 100% 全宽 |
| 内边距 | `p-md` (16px) | `p-sm` (12px) |
| 仓库卡片网格 | 自适应 2~3 列 | 单列 |
| 空状态 | `HeroEmptyState` 大图标(80px) + displayXl 标题 | `HeroEmptyState` 中图标(64px) + displayMd 标题 |
| 创建入口 | AppBar 右上角 + 按钮 | AppBar 右上角 + FAB |

#### 8.6.2 仓库详情页（SplitView 模式）

对齐 `repository_screen.dart` + `RepositoryNotifier`：

| 维度 | 桌面端 (≥1024px) | 平板 (768~1023px) | 移动端 (<768px) |
|------|-----------------|-------------------|----------------|
| 布局 | `SplitView` 双栏: 左分支 + 右任务 | 单栏 + 侧滑分支选择 | 单栏 + 顶部 Tab 切换 |
| 分支展示 | 列表常驻 (master) | 抽屉式 (Drawer) | 下拉选择器 |
| 任务详情 | 右侧面板 (detail) | 导航跳转 | 导航跳转 |
| 任务操作 | 右键菜单 / 悬浮按钮 | 点击进入详情 | 长按 + 底部操作栏 |

#### 8.6.3 任务详情页

对齐 `task_detail_screen.dart`：

| 维度 | 桌面端 | 移动端 |
|------|--------|--------|
| 布局 | 居中单栏 (max-width: 800px) | 全宽单栏 |
| 操作按钮 | 顶部 AppBar + 右键菜单 | 底部固定操作栏 + 更多菜单(BottomSheet) |
| 提交历史 | 完整行布局 | 紧凑行（hash + message，时间戳换行） |

#### 8.6.4 热力图

对齐 `heatmap_screen.dart` + `HeatmapCalendar` + `HeatmapCell`：

| 维度 | 桌面端 (≥768px) | 移动端 (<768px) |
|------|----------------|----------------|
| 统计卡片 | 4 列横排 | 2×2 网格 |
| 热力图网格 | 完整 53 列展示 | 水平滚动 + 固定左侧星期标签 |
| 格子尺寸 | 12×12px | 10×10px |
| 格子间隙 | 3px (`heatmapGap`) | 2px |

#### 8.6.5 Git Graph（移动端最难部分）

| 维度 | 桌面端 | 移动端 |
|------|--------|--------|
| 缩放 | 鼠标滚轮 + 控件按钮 | **双指捏合 (pinch-to-zoom)** + 控件按钮 |
| 平移 | 鼠标拖拽 | **单指拖拽** |
| 节点点击 | 鼠标点击 | 手指点击（增大命中区域到 44px） |
| 详情面板 | 底部固定面板 | 底部弹出 BottomSheet |
| 初始缩放 | 1.0x | **0.8x**（默认缩小以显示更多内容） |
| 最小缩放 | 0.5x | **0.3x** |

```typescript
// ReactFlow 移动端配置
function GitGraph({ nodes, edges }: GraphProps) {
  const isMobile = useIsMobile()

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={{ commit: CommitNode }}
      edgeTypes={{ branch: BranchEdge }}
      minZoom={isMobile ? 0.3 : 0.5}
      maxZoom={2.0}
      defaultZoom={isMobile ? 0.8 : 1.0}
      panOnDrag={true}
      zoomOnPinch={true}
      zoomOnScroll={!isMobile}
      zoomOnDoubleClick={!isMobile}
      preventScrolling={true}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={true}
      onNodeClick={handleNodeClick}
    >
      <Background color="var(--color-hairline)" gap={16} />
      <Controls showInteractive={false} className="!bottom-4 !right-4" />
    </ReactFlow>
  )
}
```

#### 8.6.6 搜索页

| 维度 | 桌面端 | 移动端 |
|------|--------|--------|
| 入口 | 侧边导航 / 快捷键 | AppBar 搜索图标 |
| 布局 | 居中单栏 (max-width: 640px) | 全宽单栏 |
| 搜索框 | 固定顶部 | 固定顶部 + 自动聚焦 |
| 结果展示 | 完整卡片 | 紧凑列表行 |

#### 8.6.7 设置页

对齐 `SettingsNotifier` + `AppSettings`：

| 维度 | 桌面端 | 移动端 |
|------|--------|--------|
| 布局 | 分组卡片 + 右侧预览 | 分组卡片全宽 |
| 主题切换 | 开关 (isDarkMode) | 同左 |
| 主题色 | 颜色选择器 (themeColor) | 同左 |
| 通知设置 | 开关 + 提醒时间选择 | 同左 |
| 数据管理 | 导出/导入按钮横排 | 导出/导入按钮纵排 |

### 8.7 触摸交互规范

对齐 DESIGN.md §9.2 + `AppDimensions`：

| 元素 | 最小触摸区域 | 对应常量 |
|------|------------|---------|
| 底部导航项 | 48×48px | `navItemHeight` |
| 按钮高度 | 40px (CTA) / 48px (大按钮) | `ctaHeight` / `ctaHeightLg` |
| 列表项 | 48px 最小高度 | — |
| 图标按钮 | 44×44px 命中区域 | `tapTargetMin` |

### 8.8 移动端 UI 模式映射

| Flutter 模式 | Flutter 实现 | Web 端实现 |
|-------------|------------|-----------|
| ModalBottomSheet | `showModalBottomSheet` | Radix UI Dialog (bottom variant) |
| AlertDialog | `AppDialog` | Radix UI Dialog (centered) |
| SnackBar/Toast | `AppToast` | 自定义 Toast (底部) |
| AppBar | `AppBarWidget` | 顶部固定栏 (sticky) |
| FAB | `FloatingActionButton` | 固定右下角浮动按钮 |
| HeroEmptyState | `HeroEmptyState` | 渐变图标 + 渐变标题组件 |
| AppSegmentedControl | `AppSegmentedControl` | pill 容器分段选择器 |
| SplitView | `SplitView` | ≥1024px 双栏布局 |

### 8.9 移动端性能优化

| 优化项 | 策略 |
|-------|------|
| 代码分割 | 路由级 lazy loading |
| 动画降级 | `prefers-reduced-motion` |
| 虚拟列表 | `@tanstack/react-virtual` |
| ReactFlow 性能 | 节点数 > 100 时启用虚拟化 |
| 触摸延迟 | CSS `touch-action: manipulation` |
| 滚动性能 | CSS `will-change: transform` |
| 字体加载 | `font-display: swap` |

### 8.10 PWA 支持

| PWA 特性 | 实现方式 | 价值 |
|---------|---------|------|
| 可安装 | `manifest.json` + 安装提示 | 添加到主屏幕，全屏运行 |
| 离线可用 | Service Worker 缓存 | 断网时仍可查看已加载数据 |
| 应用图标 | manifest icons | 主屏幕显示应用图标 |
| 状态栏适配 | `theme-color` meta | 状态栏颜色与主题一致 |

### 8.11 iOS 安全区适配

```css
:root {
  --safe-area-top: env(safe-area-inset-top, 0px);
  --safe-area-bottom: env(safe-area-inset-bottom, 0px);
}

.bottom-nav { padding-bottom: var(--safe-area-bottom); }
.app-bar { padding-top: var(--safe-area-top); }
```

### 8.12 移动端测试矩阵

| 设备类型 | 尺寸 | 测试重点 |
|---------|------|---------|
| iPhone SE | 375×667 | 最小屏幕，所有功能可用性 |
| iPhone 15 Pro | 393×852 | 标准手机，SafeArea 适配 |
| iPad Mini | 768×1024 | 平板竖屏，导航断点切换 |
| iPad Pro 11" | 834×1194 | 平板横屏，SplitView 双栏 |
| Android Pixel 8 | 412×915 | Android Chrome 兼容 |

---

## 9. 主题系统

### 9.1 对齐重构后的 AppThemeColors + isDarkMode 模型

Flutter 端重构后的主题系统：

```dart
// app.dart — 应用入口
MaterialApp.router(
  theme: buildLightTheme(),
  darkTheme: buildDarkTheme(),
  themeMode: settings.isDarkMode ? ThemeMode.dark : ThemeMode.light,
)
```

Web 端等价实现：

```typescript
// theme-provider.tsx — 对齐 AppThemeColors + app_theme.dart
function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { isDarkMode, themeColor } = useSettingsStore()

  useEffect(() => {
    // 对齐 themeMode 切换 — isDarkMode: bool，非三态
    document.documentElement.classList.toggle('dark', isDarkMode)
    document.documentElement.classList.toggle('light', !isDarkMode)
  }, [isDarkMode])

  useEffect(() => {
    // 对齐 themeColor 自定义 — 动态覆盖 CSS 变量
    applyThemeColor(themeColor)
  }, [themeColor])

  return <>{children}</>
}

// 动态应用主题色 — 覆盖 --color-primary 等 CSS 变量
function applyThemeColor(color: string) {
  const root = document.documentElement
  root.style.setProperty('--color-primary', color)
  // 可选：根据 color 生成 hover/focus/dark 变体
}
```

### 9.2 主题切换无动画瞬切

对齐 `app_theme.dart` 的 `ThemeData` 切换 — Flutter 端主题切换是即时的（MaterialApp 重建）。Web 端通过 CSS Variables + class 切换同样实现瞬切：

```css
/* 所有颜色通过 CSS Variables 引用，class 切换时瞬时更新 */
* {
  transition: background-color 0ms, border-color 0ms, color 0ms;
}
/* 可选：为特定组件添加过渡动画 */
.theme-transition {
  transition: background-color 150ms ease, color 150ms ease;
}
```

### 9.3 app_theme.dart → Tailwind 基础样式映射

| Flutter ThemeData | Web 端等价 |
|------------------|-----------|
| `cardTheme` (surface1 + radiusLg + hairline + elevation:0) | `.app-card` class |
| `inputDecorationTheme` (surface1 + radiusMd + hairline + focus ring) | `.app-input` class |
| `elevatedButtonTheme` (primary + radiusMd + ctaHeight) | `<AppButton>` 组件 |
| `appBarTheme` (canvas + 1px hairline + 56px) | `.app-bar` class |
| `dialogTheme` (surface1 + radiusXl + hairlineStrong) | Radix Dialog + 自定义 class |
| `dividerTheme` (hairline + 1px) | `border-hairline` Tailwind class |

---

## 10. 开发计划与里程碑

### 阶段 1：基础设施（1-2 周）

- [ ] 初始化 Vite + React + TypeScript 项目
- [ ] 配置 Tailwind CSS 4 + CSS Variables 主题映射 + Mobile-First 断点
- [ ] 实现 ThemeProvider + isDarkMode/themeColor 设置（对齐 AppThemeColors）
- [ ] 移植 Domain 层（实体 + 枚举 + Repository 接口）
- [ ] 实现 Dexie.js 数据库 + Repository 实现
- [ ] 搭建 DI 容器 (tsyringe) + 路由框架
- [ ] 实现响应式布局骨架（AppLayout + SideNav + BottomNav + 840px 切换）
- [ ] 实现 useBreakpoint / useIsDesktop / useIsMobile / useIsWide hooks
- [ ] 实现 SplitView 组件（≥1024px 双栏）
- [ ] 实现 ResponsiveBuilder 组件
- [ ] 配置 PWA（manifest + Service Worker + viewport meta + 安全区 CSS）

### 阶段 2：核心功能（2-3 周）

- [ ] 通用组件库（Button/Card/Badge/Input/Dialog/Toast/DatePicker/SegmentedControl）
- [ ] HeroEmptyState 组件（渐变图标 + 渐变标题 + CTA + 响应式）
- [ ] AppIcons 映射表（AppIconName → Lucide 组件）
- [ ] 移动端交互组件（BottomSheet / PullToRefresh / FAB）
- [ ] 屏幕级 Zustand stores（HomeStore / RepositoryStore / TaskStore / SearchStore / SettingsStore）
- [ ] 首页（仓库列表 + 创建/删除）— HeroEmptyState + 响应式网格
- [ ] 仓库详情页（SplitView: 分支列表 + 任务列表）
- [ ] 任务 CRUD + 子任务 + 表单 — 移动端底部操作栏 + BottomSheet
- [ ] 分支创建 + 合并
- [ ] 全局搜索 — 移动端自动聚焦 + 紧凑结果行
- [ ] 设置页（isDarkMode 开关 + themeColor 选择器 + 通知 + 数据管理）
- [ ] 虚拟列表（@tanstack/react-virtual）集成

### 阶段 3：数据可视化（1-2 周）

- [ ] 热力图（HeatmapCalendar + HeatmapCell → CSS Grid + Tailwind）
- [ ] Git Graph（ReactFlow + 自定义节点/连线）— 移动端 pinch-to-zoom
- [ ] 提交历史时间线 — 移动端紧凑模式

### 阶段 4：完善与对齐（1 周）

- [ ] 数据导出（JSON/CSV/Markdown）
- [ ] 数据导入（JSON）
- [ ] Web 通知（Web Notifications API）
- [ ] 响应式全断点走查（375px ~ 1440px+）
- [ ] 移动端专项走查（iOS SafeArea / 安卓 Chrome / 横屏旋转 / SplitView 切换）
- [ ] 深色/浅色模式视觉走查（AppThemeColors 映射验证）
- [ ] PWA 安装测试（iOS Safari / Android Chrome）

### 阶段 5：质量保障（1 周）

- [ ] 单元测试（Domain + Data 层）
- [ ] 组件测试（关键交互组件）
- [ ] E2E 测试（核心用户流程 — 桌面端 + 移动端各一轮）
- [ ] 性能优化（代码分割、懒加载、虚拟列表）
- [ ] 无障碍审计（WCAG 2.1 AA）

---

## 11. 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| Domain 逻辑双份维护 | Dart 和 TS 两套实体/UseCase 需同步 | 实体模型简单（4+3），通过 shared/schemas 共享 JSON Schema |
| 设计系统偏差 | Web 端视觉与桌面端不一致 | 严格按 DESIGN.md + AppThemeColors token 映射，CSS Variables 等价 |
| IndexedDB 数据丢失 | 浏览器清除数据导致用户数据丢失 | 定期导出提醒 + 数据导出功能 |
| ReactFlow 学习成本 | 团队不熟悉 ReactFlow | 文档完善，自定义节点/连线代码清晰 |
| 未来同步改造 | 引入后端时需要大改 | Repository 接口模式确保 Data 层可插拔，DI 一行切换 |
| 包体积 | ReactFlow + Radix 等依赖增大 | Vite 代码分割 + 按需导入 + Tree shaking |
| SplitView 移动端降级 | <1024px 时 detail 需导航跳转 | 确保导航体验流畅，返回时保持 master 滚动位置 |
| 主题色动态覆盖 | themeColor 自定义需运行时生成色阶 | 使用 HSL 色彩空间算法生成 hover/focus/dark 变体 |
| iOS SafeArea 适配 | iPhone 底部 Home Indicator 遮挡内容 | `env(safe-area-inset-bottom)` 全局适配 |

---

## 12. 下一步行动

1. ✅ 确认关键决策点 — 已完成
2. ✅ 选择技术方案 — 已完成（独立 React + 预留同步）
3. ✅ 完成详细架构设计 — 已完成
4. ✅ 完成移动端适配策略 — 已完成
5. ✅ 同步项目重构变化 — 已完成（v2.0）
6. ⬜ 初始化 Web 项目骨架（含 PWA 配置）
7. ⬜ 移植 Domain 层
8. ⬜ 实现 Dexie.js Data 层
9. ⬜ 搭建 CSS Variables 主题系统 + isDarkMode + themeColor
10. ⬜ 实现响应式布局骨架（SideNav / BottomNav / SplitView / 840px 切换）
11. ⬜ 逐屏实现 UI（Mobile-First 顺序）

---

## 附录 A：现有项目可复用资产（重构后）

| 资产 | Flutter 文件 | Web 端复用方式 |
|------|-------------|---------------|
| 实体定义 | `lib/domain/entities/*.dart` | 移植为 TypeScript interface |
| 枚举定义 | `lib/domain/entities/enums.dart` | 移植为 TypeScript enum + value + label |
| Repository 接口 | `lib/domain/repositories/i_*.dart` | 移植为 TypeScript interface |
| UseCase | `lib/domain/usecases/**/*.dart` | 移植为 TypeScript class |
| 数据库 Schema | `lib/data/database/tables/*.dart` + `daos/*.dart` | 映射为 Dexie.js schema |
| **AppThemeColors** | `lib/core/theme/app_theme_colors.dart` | 映射为 CSS Variables (深/浅双套) |
| **app_theme.dart** | `lib/core/theme/app_theme.dart` | 映射为 Tailwind base styles + 组件 class |
| **AppDimensions** | `lib/core/theme/dimensions.dart` | 映射为 Tailwind spacing/radius/shadow/animation |
| 设计 Token | `lib/core/theme/colors.dart` + `typography.dart` | 映射为 Tailwind config |
| **ResponsiveLayout** | `lib/presentation/widgets/common/responsive_layout.dart` | 映射为 useBreakpoint hook |
| **SplitView** | `lib/presentation/widgets/common/split_view.dart` | 映射为 SplitView React 组件 |
| **HeroEmptyState** | `lib/presentation/widgets/common/hero_empty_state.dart` | 映射为 HeroEmptyState React 组件 |
| **AppSegmentedControl** | `lib/presentation/widgets/common/app_segmented_control.dart` | 映射为 AppSegmentedControl React 组件 |
| **AppIcons** | `lib/core/theme/app_icons.dart` | 映射为 Lucide React 图标映射表 |
| **SettingsNotifier** | `lib/presentation/providers/settings_providers.dart` | 映射为 settings-store.ts (isDarkMode + themeColor) |
| **HomeNotifier + HomeState** | `lib/presentation/screens/home/` | 映射为 home-store.ts |
| **RepositoryNotifier + State** | `lib/presentation/screens/repository/` | 映射为 repository-store.ts |
| 设计规范 | `docs/DESIGN.md` | 直接参考，Web 端按此实现 |
| 数据导出格式 | `lib/domain/services/data_export_service.dart` | JSON 格式保持一致 |
| PRD | `docs/PRD.md` | 功能需求直接复用 |
| StringExtensions | `lib/core/extensions/string_extensions.dart` | 移植为 TS 工具函数 |

## 附录 B：Flutter Web 不采用的技术原因

| 维度 | 详情 |
|------|------|
| 首屏性能 | Flutter Web 编译为 WASM/JS，体积 2MB+，首屏加载 3-5 秒 |
| 渲染模型 | Canvas 渲染，非原生 DOM，文本选择/右键菜单/浏览器搜索均不可用 |
| 交互范式 | Flutter 的 Widget 交互模型与 Web 原生交互有本质差异 |
| AppThemeColors | ThemeExtension 在 Web 上可用但无法与 CSS 生态互通 |
| CustomPainter | Web 上 Canvas 性能不如 SVG/DOM |
| SEO | Canvas 渲染，搜索引擎无法索引任何内容 |
| 包体积 | 即使 modular build，Flutter runtime 本身就 ~1MB |
| 开发体验 | Flutter Web 的 HMR 远不如 Vite 快速 |

## 附录 C：ReactFlow 自定义节点设计预览

```
┌─────────────────────────────────────────────────┐
│  ReactFlow Canvas (pan/zoom enabled)            │
│                                                  │
│    ●─────●          ● = commit node             │
│    │     │          ─ = branch edge (bezier)    │
│    │     ●          蓝色 = main branch           │
│    │     │          紫色 = feature branch        │
│    │     ●          primary色 = merge node       │
│    │    /                                           │
│    ●───●  ← merge node (parents.length > 1)     │
│    │                                               │
│    ●  "初始化项目"  ← commit message (mono-sm)    │
│                                                  │
│  [100%] [+] [-] [↺]  ← 缩放控件 (右下角)         │
└─────────────────────────────────────────────────┘

节点结构 (React Component):
┌─────────────────────────────┐
│  ○ CommitNode               │
│  ├─ 外环: branchColors[i]   │
│  ├─ 内心: canvas色           │
│  ├─ merge? → primary色       │
│  ├─ selected? → ink描边      │
│  └─ label: commit message   │
└─────────────────────────────┘
```

## 附录 D：v2.0 重构变更对照表

| 变更项 | v1.0（旧） | v2.0（重构后） | Web 端影响 |
|--------|-----------|---------------|-----------|
| 主题模型 | `theme: 'light'\|'dark'\|'system'` | `isDarkMode: bool` + `themeColor: String` | settings-store 简化为布尔切换 + 颜色自定义 |
| 主题系统 | 直接引用 `AppColors.xxx` | `AppThemeColors.of(context)` (ThemeExtension) | CSS Variables 等价映射 |
| 主题配置 | 无完整 ThemeData | `app_theme.dart` (card/input/button/dialog/appbar/divider) | Tailwind base styles + 组件 class |
| 状态管理 | Riverpod @riverpod 注解 | StateNotifier + StateNotifierProvider（手动） | Zustand store per screen |
| DI 方式 | ref.read(repositoryProvider) | `getIt<T>()` inside Notifier | tsyringe container.resolve() inside store |
| 响应式 | LayoutBuilder + MediaQuery | `ResponsiveLayout` + `ResponsiveBuilder` + `SplitView` | useBreakpoint hook + SplitView 组件 |
| 图标 | Heroicons (散落) | `AppIcons` 统一系统 (36 枚举) | Lucide 映射表 |
| 空状态 | 自定义 Widget | `HeroEmptyState` (渐变图标+标题+CTA) | HeroEmptyState 组件 |
| 分段选择器 | 无 | `AppSegmentedControl` (pill 容器) | AppSegmentedControl 组件 |
| 日期选择 | 无 | `AppDatePickerField` | AppDatePicker 组件 |
| 阴影/动画 | 无统一常量 | shadowSm/Md/Lg + animFast/Normal/Slow + easeOutQuart/Expo | Tailwind boxShadow + transitionDuration |
| DAO | Repository 直接写 SQL | 4 个独立 DAO + `.g.dart` 代码生成 | Dexie.js schema 直接映射 |
