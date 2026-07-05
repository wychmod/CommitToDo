# Commit — Web 端接入设计方案

**版本**: 1.1.0
**创建日期**: 2026-07-03
**更新日期**: 2026-07-03 — v1.1 新增完整移动端适配策略（§8 重写）
**状态**: 规划完成 — 已确认关键决策，待进入开发
**关联文档**: `docs/PRD.md`、`docs/TECHNICAL.md`、`docs/system_design.md`、`docs/MULTI_PLATFORM_GUARDRAILS.md`、`docs/DESIGN.md`

---

## 0. 文档目的

本文档分析 Commit 项目接入 Web 端的技术方案，核心回答两个问题：

1. **Web 端应该采用什么技术架构？**
2. **Web 端与现有 Flutter 架构应该合并还是分离？**

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
| Git Graph | 见第 6 节详细比较与推荐 |

---

## 2. 现有架构摘要

### 2.1 技术栈

| 维度 | 当前选型 |
|------|---------|
| 框架 | Flutter 3.x + Dart |
| 状态管理 | Riverpod 2.x + riverpod_annotation |
| 数据库 | drift (SQLite ORM) + drift_sqflite |
| 路由 | go_router 14.x |
| DI | get_it + injectable |
| 目标平台 | iOS / Android / Windows / macOS |
| 数据存储 | 100% 本地 SQLite，离线优先 |
| 后端服务 | **无**（PRD 明确标注「数据同步：暂不实现」）|
| 用户认证 | **无**（本地应用，无账户体系）|

### 2.2 分层架构

```
Presentation (Flutter Widgets + Riverpod Providers)
       ↓
Application (Use Cases — 单一职责业务编排)
       ↓
Domain (Entities + Repository Interfaces — 纯 Dart，零外部依赖)
       ↑
Data (Drift DB + DAOs + Models + Local*Repository 实现)
```

**关键特征**：
- Domain 层为纯 Dart，定义了 `Task`、`Branch`、`Repository`、`Commit` 四个核心实体和对应的 Repository 接口
- Data 层完全绑定 drift/SQLite，所有 `Local*Repository` 直接操作 `AppDatabase`
- 无网络层（TECHNICAL.md 列了 dio 但 pubspec.yaml 未实际引入）
- 无后端 API 契约定义

### 2.3 核心实体模型

| 实体 | 关键字段 | 关系 |
|------|---------|------|
| **Repository** | id, name, icon, color, isArchived | 1:N → Branch |
| **Branch** | id, repositoryId, name, parentBranchId, isMain, color | N:1 → Repository, 1:N → Task, 自引用 parent |
| **Task** | id, branchId, title, description, status, priority, dueDate, parentTaskId, sortOrder | N:1 → Branch, 自引用 parent (子任务) |
| **Commit** | id, taskId, branchId, message, type, createdAt | N:1 → Task, N:1 → Branch |

**枚举**：`TaskStatus`(todo/inProgress/done/cancelled)、`Priority`(low/medium/high)、`CommitType`(create/update/merge/complete/delete)

### 2.4 数据库 Schema

```
Repositories ──1:N──→ Branches ──1:N──→ Tasks ──1:N──→ Commits
                         │                  │
                         └─ parentBranchId  └─ parentTaskId (子任务)

Tags ──M:N──→ TaskTags ←── Tasks
```

- 6 张表：`repositories`、`branches`、`tasks`、`commits`、`tags`、`task_tags`
- 软删除模式（`isDeleted` 字段）
- 已建索引：`tasks(branch_id)`、`tasks(status)`、`tasks(due_date)`、`commits(task_id)`、`commits(branch_id)`

### 2.5 设计系统

已有完整的 Linear-inspired 设计规范（`docs/DESIGN.md`），包括：
- 色彩 Ladder：canvas / surface1-4 / hairline / ink 四阶文字
- 13 档字号 + letterSpacing 体系
- 4px 网格间距体系
- 深色模式为主模式，浅色模式完整映射
- 完整组件规范（按钮、卡片、徽章、输入框、对话框等）

### 2.6 现有功能与 Web 适配难度

| 功能 | 状态 | Web 端适配难度 | 说明 |
|------|------|---------------|------|
| 仓库 CRUD | ✅ | 低 | 标准 RESTful 操作 |
| 分支 CRUD + 合并 | ✅ | 低 | 合并逻辑在 Domain 层，直接移植 |
| 任务 CRUD + 子任务 | ✅ | 低 | 树形结构，递归渲染 |
| 提交历史 (Commit Log) | ✅ | 低 | 时间线列表 |
| 全局搜索 | ✅ | 低 | Dexie.js 支持 where/equals 查询 |
| 热力图 (CustomPainter) | ✅ | 中 | 用 CSS Grid + Tailwind 重写（见 §7.2）|
| Git Graph (CustomPainter) | ✅ | 中 | 用 ReactFlow 重写（见 §6）|
| 数据导出 (JSON/CSV/MD) | ✅ | 低 | 浏览器 Download API |
| 本地通知 | ✅ | 中 | Web Notifications API |
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
| **状态** | Zustand | 5.x | 轻量，类比 Riverpod 的 Provider 模式，无 boilerplate |
| **路由** | React Router | 7.x | 主流方案，支持数据加载 |
| **存储** | Dexie.js | 4.x | IndexedDB 封装，支持索引/事务/复杂查询，类比 drift |
| **UI 基础** | Radix UI | latest | 无样式无障碍基础组件（Dialog/Popover/Toast 等）|
| **图标** | Lucide React | latest | 类比 Heroicons，SVG 图标库 |
| **Git Graph** | ReactFlow | 12.x | 见 §6 详细分析，移动端支持 pinch-to-zoom |
| **热力图** | CSS Grid + Tailwind | — | 纯 CSS 实现，移动端水平滚动 |
| **PWA** | vite-plugin-pwa | latest | Service Worker + manifest，可安装到主屏幕 |
| **虚拟列表** | @tanstack/react-virtual | 3.x | 长列表性能优化（任务列表/提交历史） |
| **日期** | date-fns | 4.x | 轻量日期处理，类比 intl |
| **UUID** | uuid | 10.x | 与 Dart 端一致，生成 v4 UUID |
| **DI** | tsyringe | 4.x | 轻量 DI 容器，类比 get_it |

### 5.2 与 Flutter 端技术栈对照

| 维度 | Flutter 端 | Web 端 | 对应关系 |
|------|-----------|--------|---------|
| 状态管理 | Riverpod 2.x | Zustand | Provider → Store 映射 |
| 数据库 | drift + SQLite | Dexie.js + IndexedDB | ORM 层等价 |
| 路由 | go_router | React Router | 声明式路由 |
| DI | get_it + injectable | tsyringe | 服务定位器模式 |
| 图标 | Heroicons (flutter_svg) | Lucide React | SVG 图标库 |
| 设计 Token | AppColors / AppTypography | Tailwind config + CSS vars | 同一 DESIGN.md 源 |

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
| **React 集成** | ⚠️ 冲突（D3 操纵 DOM vs React 虚拟 DOM） | ✅ 原生 React 组件 | ⚠️ 需 wrapper | ⚠️ 需手动管理 |
| **Pan/Zoom** | 需自己实现（d3-zoom） | ✅ 内置 | ✅ 内置 | 需自己实现 |
| **自定义节点** | ✅ 完全自由 | ✅ React 组件作为节点 | ⚠️ 仅 Canvas 绘制 | ✅ 完全自由 |
| **自定义连线** | ✅ Path 生成器 | ✅ 自定义 Edge 类型 | ⚠️ 有限定制 | ✅ 完全自由 |
| **样式控制** | ✅ SVG/CSS | ✅ CSS/Tailwind | ❌ Canvas API，难以匹配 DESIGN.md | ✅ Canvas API |
| **交互事件** | 需自己实现 | ✅ 内置 onClick/onSelect | ✅ 内置 | 需自己实现 |
| **性能（大量节点）** | ✅ SVG 虚拟化 | ✅ 内置虚拟化 | ✅ Canvas 高性能 | ✅ Canvas 最高 |
| **无障碍** | ✅ SVG DOM | ✅ DOM 元素 | ❌ Canvas 无语义 | ❌ Canvas 无语义 |
| **学习曲线** | ⚠️ 陡峭 | ✅ 平缓 | ⚠️ 中等 | ⚠️ 高 |
| **维护成本** | ⚠️ 高（D3 + React 双范式） | ✅ 低（纯 React） | ⚠️ 中 | ❌ 高 |
| **DESIGN.md 还原** | ✅ 精准 | ✅ 精准 | ❌ 困难 | ✅ 精准 |
| **扩展性** | ✅ 高 | ✅ 高（可加交互编辑） | ⚠️ 中 | ❌ 低 |
| **包体积** | ~280KB (full) / ~60KB (modular) | ~120KB | ~400KB | 0 |

### 6.3 推荐：ReactFlow

**选择理由**：

1. **内置 Pan/Zoom**：完美替代 Flutter 的 `InteractiveViewer` + `TransformationController`，支持 minScale/maxScale 配置
2. **React 原生**：节点是 React 组件，可以直接用 Tailwind 样式精准匹配 DESIGN.md 的节点规范（彩色圆点、merge 高亮、选中描边）
3. **自定义 Edge**：可以创建贝塞尔曲线 Edge 类型，与 Flutter 端的 `cubicTo` 路径效果一致
4. **交互内置**：节点点击/选中事件开箱即用，无需手动实现 hit detection
5. **虚拟化**：大量 commit 节点时自动虚拟化渲染，性能有保障
6. **无障碍**：节点是 DOM 元素，可添加 ARIA 标签，符合 WCAG 2.1 AA
7. **扩展性**：未来可以轻松添加拖拽编辑、右键菜单等交互功能
8. **TypeScript 友好**：完善的类型定义，开发体验好

**实现要点**：
- 自定义 `CommitNode` 组件：外环分支色 + 内心 canvas 色，merge 节点用 primary
- 自定义 `BranchEdge` 类型：贝塞尔曲线，颜色按分支色环
- `panOnDrag` + `zoomOnScroll` 启用，`minZoom={0.5}` + `maxZoom={2.0}` 对齐 Flutter 端
- 右下角 `<Controls />` 组件或自定义缩放控件
- 底部详情面板用 React 条件渲染

### 6.4 热力图方案：CSS Grid + Tailwind

**选择理由**：
- 热力图本质是 7 行 × N 列的彩色方格网格
- CSS Grid 天然适合网格布局，比 Canvas 更简单
- 每个格子是 DOM 元素，可以轻松添加 hover tooltip
- Tailwind 直接控制颜色（`bg-heatmap-empty` / `bg-heatmap-level-1` 等）
- 响应式天然支持
- 无障碍：每个格子可以添加 `title` 或 ARIA 标签

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
│   │   │   ├── task.ts            ← Task interface + factory
│   │   │   ├── branch.ts
│   │   │   ├── repository.ts
│   │   │   ├── commit.ts
│   │   │   └── enums.ts           ← TaskStatus, Priority, CommitType
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
│   │   │   ├── home-screen.tsx
│   │   │   ├── repository-screen.tsx
│   │   │   ├── task-detail-screen.tsx
│   │   │   ├── task-form-screen.tsx
│   │   │   ├── search-screen.tsx
│   │   │   ├── heatmap-screen.tsx
│   │   │   ├── git-graph-screen.tsx
│   │   │   └── settings-screen.tsx
│   │   ├── components/
│   │   │   ├── common/            ← 通用组件 (对齐 DESIGN.md §7)
│   │   │   │   ├── app-button.tsx
│   │   │   │   ├── app-card.tsx
│   │   │   │   ├── app-badge.tsx
│   │   │   │   ├── app-input.tsx
│   │   │   │   ├── app-dialog.tsx
│   │   │   │   ├── app-toast.tsx
│   │   │   │   ├── app-bar.tsx
│   │   │   │   ├── side-nav.tsx         ← 桌面端侧边导航
│   │   │   │   ├── bottom-nav.tsx       ← 移动端底部导航
│   │   │   │   ├── bottom-sheet.tsx     ← 移动端底部弹出面板
│   │   │   │   ├── pull-to-refresh.tsx  ← 移动端下拉刷新
│   │   │   │   ├── fab.tsx              ← 浮动操作按钮
│   │   │   │   ├── loading-widget.tsx
│   │   │   │   └── error-widget.tsx
│   │   │   ├── layout/           ← 响应式布局组件
│   │   │   │   ├── app-layout.tsx       ← 导航模式切换 (≥840px / <840px)
│   │   │   │   ├── responsive-grid.tsx  ← 响应式网格容器
│   │   │   │   └── safe-area.tsx        ← iOS 安全区包装器
│   │   │   ├── repository/
│   │   │   │   ├── repository-card.tsx
│   │   │   │   └── repository-list.tsx
│   │   │   ├── branch/
│   │   │   │   ├── branch-indicator.tsx
│   │   │   │   └── branch-list.tsx
│   │   │   ├── task/
│   │   │   │   ├── task-card.tsx
│   │   │   │   ├── task-list.tsx
│   │   │   │   └── task-form.tsx
│   │   │   ├── heatmap/
│   │   │   │   ├── heatmap-cell.tsx
│   │   │   │   └── heatmap-calendar.tsx
│   │   │   └── graph/
│   │   │       ├── commit-node.tsx       ← ReactFlow 自定义节点
│   │   │       └── branch-edge.tsx       ← ReactFlow 自定义连线
│   │   └── stores/               ← Zustand stores
│   │       ├── repository-store.ts
│   │       ├── task-store.ts
│   │       ├── settings-store.ts
│   │       └── search-store.ts
│   │
│   ├── core/
│   │   ├── theme/
│   │   │   ├── colors.ts          ← DESIGN.md §2 色彩 token
│   │   │   ├── typography.ts      ← DESIGN.md §3 字号 token
│   │   │   └── dimensions.ts      ← DESIGN.md §4 间距 token + 断点常量
│   │   ├── hooks/                 ← 响应式 hooks
│   │   │   ├── use-is-desktop.ts  ← 导航模式判断 (≥840px)
│   │   │   ├── use-is-mobile.ts   ← 移动端判断 (<768px)
│   │   │   ├── use-swipe.ts       ← 触摸手势 (左滑/右滑/下拉)
│   │   │   └── use-breakpoint.ts  ← 当前断点查询
│   │   ├── di/
│   │   │   └── injection-container.ts  ← tsyringe DI 配置
│   │   ├── constants/
│   │   │   └── app-constants.ts
│   │   ├── extensions/
│   │   │   └── date-extensions.ts
│   │   └── utils/
│   │       ├── formatters.ts
│   │       ├── logger.ts
│   │       └── validators.ts
│   │
│   ├── platform/                  ← Web 平台特定
│   │   ├── web-notification-service.ts
│   │   └── web-file-save-service.ts
│   │
│   ├── app.tsx                    ← 根组件 + 路由
│   ├── main.tsx                   ← 入口
│   └── index.css                  ← Tailwind + CSS Variables
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

### 7.2 设计 Token 映射

将 `lib/core/theme/colors.dart`、`typography.dart`、`dimensions.dart` 精准映射到 Tailwind CSS 4 配置：

```typescript
// tailwind.config.ts (核心映射)
export default {
  theme: {
    extend: {
      colors: {
        // Surface Ladder (DESIGN.md §2.2)
        canvas: '#0F172A',
        'surface-1': '#1E293B',
        'surface-2': '#334155',
        'surface-3': '#475569',
        'surface-4': '#64748B',

        // Hairline Borders (DESIGN.md §2.3)
        hairline: '#1E293B',
        'hairline-strong': '#334155',
        'hairline-tertiary': '#475569',

        // Text (DESIGN.md §2.4)
        ink: '#F1F5F9',
        'ink-muted': '#94A3B8',
        'ink-subtle': '#64748B',
        'ink-tertiary': '#475569',

        // Accent (DESIGN.md §2.1)
        primary: '#3B82F6',
        'primary-hover': '#60A5FA',
        'primary-focus': '#2563EB',
        'primary-dark': '#1D4ED8',
        'on-primary': '#FFFFFF',

        // Semantic (DESIGN.md §2.5)
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6',

        // Priority (DESIGN.md §2.6)
        'priority-high': '#EF4444',
        'priority-medium': '#F59E0B',
        'priority-low': '#10B981',

        // Status (DESIGN.md §2.7)
        'status-todo': '#94A3B8',
        'status-in-progress': '#3B82F6',
        'status-done': '#10B981',
        'status-cancelled': '#6B7280',

        // Heatmap (DESIGN.md §2.8)
        'heatmap-empty': '#1E293B',
        'heatmap-level-1': '#064E3B',
        'heatmap-level-2': '#065F46',
        'heatmap-level-3': '#047857',
        'heatmap-level-4': '#10B981',

        // Light Mode (DESIGN.md §9.4)
        'light-canvas': '#F8FAFC',
        'light-surface-1': '#FFFFFF',
        'light-surface-2': '#F1F5F9',
        'light-surface-3': '#E2E8F0',
        'light-hairline': '#E2E8F0',
        'light-ink': '#0F172A',
        'light-ink-muted': '#475569',
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
        // 4px 网格 (DESIGN.md §4)
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
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        'xxl': '24px',
        'pill': '999px',
        'full': '999px',
      },
    },
  },
}
```

### 7.3 数据库 Schema 映射（Dexie.js）

```typescript
// src/data/db/app-database.ts
import Dexie, { Table } from 'dexie'

// 表结构完全对齐 Flutter 端 drift 表定义
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
      // 主键 + 索引，对齐 Flutter 端索引策略
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

### 7.4 Repository 接口模式（预留同步扩展）

```typescript
// src/domain/repositories/i-task-repository.ts
// 与 Flutter 端 ITaskRepository 接口完全对齐
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

// src/data/repositories/dexie-task-repository.ts
// 当前实现：Dexie.js / IndexedDB
export class DexieTaskRepository implements ITaskRepository {
  constructor(private db: AppDatabase) {}
  // ... 实现
}

// 未来扩展：src/data/repositories/remote-task-repository.ts
// 引入后端时新增，DI 容器切换即可
// export class RemoteTaskRepository implements ITaskRepository {
//   constructor(private client: ApiClient) {}
//   // ... 调用后端 API
// }

// src/core/di/injection-container.ts
// DI 容器：当前注册 Dexie 实现，未来可一行切换为 Remote
container.register<ITaskRepository>('ITaskRepository', {
  useFactory: () => new DexieTaskRepository(container.resolve(AppDatabase)),
  // 未来: new RemoteTaskRepository(container.resolve(ApiClient))
})
```

### 7.5 数据兼容性

Web 端的 JSON 导出格式与 Flutter 端 `DataExportService` 完全一致：

```json
{
  "version": 1,
  "exportedAt": "2026-07-03T00:00:00.000Z",
  "repositories": [{ "id": "...", "name": "...", ... }],
  "branches": [{ "id": "...", "repositoryId": "...", ... }],
  "tasks": [{ "id": "...", "branchId": "...", ... }],
  "commits": [{ "id": "...", "taskId": "...", ... }]
}
```

- 用户可在 Flutter 端导出 JSON → Web 端导入
- 用户可在 Web 端导出 JSON → Flutter 端导入
- `shared/schemas/export-schema.json` 定义 JSON Schema，CI 校验两端兼容

---

## 8. 响应式布局与移动端适配策略

### 8.1 设计哲学：Mobile-First

Web 端必须完整覆盖从手机（≥320px）到超宽桌面（≥1440px）的全尺寸范围。采用 **Mobile-First** 策略：

- 默认样式面向移动端编写，通过 `min-width` 媒体查询逐步增强
- 所有功能在手机端可用，不只是"能看"，而是"好用"
- 触摸交互优先，鼠标/键盘作为渐进增强
- 不做"移动端简化版"——功能与桌面端完全对等

### 8.2 断点体系

严格对齐 Flutter 端 `lib/core/theme/dimensions.dart` 的断点定义：

| 断点名称 | Tailwind 前缀 | 宽度范围 | 对应 Flutter 常量 | 用途 |
|---------|-------------|---------|-----------------|------|
| **mobile** | (默认) | 0 ~ 767px | `< mobileBreakpoint (768)` | 手机竖屏 / 横屏 |
| **tablet** | `md:` | 768 ~ 1023px | `mobileBreakpoint ~ tabletBreakpoint` | 平板竖屏 |
| **laptop** | `lg:` | 1024 ~ 1279px | `tabletBreakpoint ~ desktopBreakpoint` | 平板横屏 / 小笔电 |
| **desktop** | `xl:` | 1280 ~ 1439px | `desktopBreakpoint ~ desktopXlBreakpoint` | 标准桌面 |
| **desktop-xl** | `2xl:` | ≥ 1440px | `≥ desktopXlBreakpoint` | 超宽桌面 |

> **注意**：AppScaffold 的导航切换断点为 `840px`（`_desktopBreakpoint`），不与上述断点完全重合。Web 端在 `840px` 处单独处理导航形态切换，其他布局变化使用标准断点。

```typescript
// tailwind.config.ts — 断点配置
export default {
  theme: {
    // Mobile-First: 默认 = mobile，向上逐级增强
    screens: {
      'mobile': '0px',       // 默认，无需前缀
      'tablet': '768px',     // md: 前缀
      'laptop': '1024px',    // lg: 前缀
      'desktop': '1280px',   // xl: 前缀
      'desktop-xl': '1440px',// 2xl: 前缀
    },
  },
}

// 导航切换专用断点（不放入 Tailwind screens，单独管理）
export const NAV_BREAKPOINT = 840 // 对齐 Flutter AppScaffold._desktopBreakpoint
```

### 8.3 导航系统适配

对齐 Flutter 端 `AppScaffold` 的双模式导航：

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
│  │                       │ │
│  │                       │ │
│  ├───────────────────────┤ │
│  │ 仓库  热力图  图形  设置│ │ ← 底部导航 48px
│  └───────────────────────┘ │
│  底部导航: canvas 底色,     │ │
│  顶部 1px hairline,        │ │
│  选中 primary 色           │ │
└───────────────────────────┘
```

**实现要点**：

```typescript
// useIsDesktop hook — 导航模式判断
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(
    window.innerWidth >= NAV_BREAKPOINT
  )
  useEffect(() => {
    const handler = () => setIsDesktop(window.innerWidth >= NAV_BREAKPOINT)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isDesktop
}

// AppLayout 组件
function AppLayout() {
  const isDesktop = useIsDesktop()

  if (isDesktop) {
    return (
      <div className="flex h-screen">
        <SideNav />              {/* 200px 固定宽度 */}
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
      <BottomNav />  {/* 固定底部, 48px 高, SafeArea insets */}
    </div>
  )
}
```

**底部导航组件规范**（对齐 `bottom_nav_widget.dart` + DESIGN.md §7.10）：

```typescript
// BottomNav.tsx — 移动端底部导航
const navItems = [
  { icon: RepositoryIcon, label: '仓库', path: '/' },
  { icon: HeatmapIcon, label: '热力图', path: '/heatmap' },
  { icon: GraphIcon, label: '图形', path: '/graph' },
  { icon: SettingsIcon, label: '设置', path: '/settings' },
]

function BottomNav() {
  const location = useLocation()
  return (
    <nav className="
      shrink-0 border-t border-hairline bg-canvas
      pb-[env(safe-area-inset-bottom)]  /* iOS 安全区 */
    ">
      <div className="flex h-12 items-center justify-around">  {/* 48px 高 */}
        {navItems.map((item) => {
          const active = location.pathname === item.path
          return (
            <NavLink key={item.path} to={item.path}
              className={`
                flex w-16 flex-col items-center justify-center rounded-md
                ${active ? 'text-primary' : 'text-ink-subtle'}
              `}
            >
              <item.icon size={24} />          {/* iconNav: 24px */}
              <span className="mt-micro text-[11px]">  {/* monoSm */}
                {item.label}
              </span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
```

### 8.4 各页面移动端适配详情

#### 8.4.1 首页（仓库列表）

| 维度 | 桌面端 (≥840px) | 移动端 (<840px) |
|------|----------------|----------------|
| 内容最大宽度 | 1280px 居中 | 100% 全宽 |
| 内边距 | `p-md` (16px) | `p-sm` (12px) |
| 仓库卡片网格 | 自适应 2~3 列 | 单列 |
| 空状态 | 大图标(80px) + displayXl 标题 | 中图标(64px) + displayMd 标题 |
| 创建入口 | AppBar 右上角 + 按钮 | AppBar 右上角 + FAB |

对齐 `home_screen.dart` 的 `LayoutBuilder` 逻辑：

```typescript
// HomeScreen 空状态响应式
function HomeEmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex items-center justify-center p-lg md:p-md lg:p-xxl">
      <div className="w-full max-w-[640px] rounded-xxl border border-hairline bg-canvas
                      p-xl md:p-xxl text-center">
        {/* 图标容器: 移动端 64px, 桌面端 80px */}
        <div className="mx-auto flex items-center justify-center rounded-xl
                        bg-gradient-to-br from-primary to-primary-hover
                        h-16 w-16 md:h-20 md:w-20">
          <RepositoryIcon size={32} className="text-on-primary md:h-10" />
        </div>
        {/* 标题: 移动端 displayMd, 桌面端 displayXl */}
        <h2 className="mt-lg bg-gradient-to-r from-primary to-primary-hover
                       bg-clip-text text-transparent
                       text-display-md md:text-display-xl">
          开始你的第一个仓库
        </h2>
        <p className="mt-sm text-subhead text-ink-muted">
          像管理代码一样管理你的任务
        </p>
        <AppButton text="创建仓库" icon={<AddIcon />} onPress={onCreate}
                   className="mt-xl" />
      </div>
    </div>
  )
}
```

#### 8.4.2 仓库详情页（分支 + 任务列表）

| 维度 | 桌面端 (≥1024px) | 平板 (768~1023px) | 移动端 (<768px) |
|------|-----------------|-------------------|----------------|
| 布局 | 双栏: 左侧分支列表 + 右侧任务列表 | 单栏 + 侧滑分支选择 | 单栏 + 顶部 Tab 切换 |
| 分支展示 | 列表常驻 | 抽屉式(Drawer) | 下拉选择器 |
| 任务卡片 | 完整信息行 | 紧凑模式 | 紧凑模式 + 折叠描述 |
| 任务操作 | 右键菜单 / 悬浮按钮 | 点击进入详情 | 长按 + 底部操作栏 |

```typescript
// 仓库详情页响应式布局
function RepositoryScreen({ repositoryId }: { repositoryId: string }) {
  return (
    <div className="flex h-full">
      {/* 桌面端: 分支侧边栏常驻 */}
      <aside className="hidden lg:block w-64 border-r border-hairline overflow-auto">
        <BranchList repositoryId={repositoryId} />
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 overflow-auto">
        {/* 平板: 抽屉式分支选择 */}
        <div className="lg:hidden p-md border-b border-hairline">
          <BranchSelector repositoryId={repositoryId} />
        </div>

        {/* 任务列表 */}
        <div className="p-md">
          <TaskList branchId={selectedBranchId} />
        </div>
      </main>
    </div>
  )
}
```

#### 8.4.3 任务详情页

对齐 `task_detail_screen.dart` 的移动端模式：

| 维度 | 桌面端 | 移动端 |
|------|--------|--------|
| 布局 | 居中单栏 (max-width: 800px) | 全宽单栏 |
| 操作按钮 | 顶部 AppBar + 右键菜单 | 底部固定操作栏 + 更多菜单(ModalBottomSheet) |
| 提交历史 | 完整行布局 | 紧凑行（hash + message，时间戳换行） |
| 编辑入口 | AppBar 编辑图标 | 底部操作栏 "更多" → ModalBottomSheet |

```typescript
// 任务详情底部操作栏 — 移动端专属
function TaskDetailBottomBar({ task }: { task: Task }) {
  return (
    <div className="
      shrink-0 border-t border-hairline bg-canvas p-md
      pb-[calc(env(safe-area-inset-bottom)+16px)]
    ">
      <div className="flex gap-md">
        {/* 主操作: 完成/重开 */}
        <AppButton
          text={task.isCompleted ? '重新打开' : '完成任务'}
          variant={task.isCompleted ? 'secondary' : 'primary'}
          isExpanded
          icon={task.isCompleted ? <UndoIcon /> : <CheckCircleIcon />}
          onPress={handleToggleComplete}
        />
        {/* 更多操作: 移动端用 BottomSheet, 桌面端用 Dropdown */}
        <button
          className="md:hidden flex h-10 w-10 items-center justify-center
                     rounded-md border border-hairline text-ink-muted"
          onClick={openMoreActionsSheet}
        >
          <MoreIcon />
        </button>
        {/* 桌面端直接显示删除按钮 */}
        <AppButton
          text="删除"
          variant="danger"
          className="hidden md:flex"
          icon={<DeleteIcon />}
          onPress={handleDelete}
        />
      </div>
    </div>
  )
}
```

#### 8.4.4 热力图

对齐 `heatmap_screen.dart` 的 `LayoutBuilder` 统计卡片自适应：

| 维度 | 桌面端 (≥768px) | 移动端 (<768px) |
|------|----------------|----------------|
| 统计卡片 | 4 列横排 | 2×2 网格 |
| 热力图网格 | 完整 53 列展示 | 水平滚动 + 固定左侧星期标签 |
| 格子尺寸 | 12×12px | 10×10px |
| 格子间隙 | 3px | 2px |
| 月份标签 | 显示 | 显示（随滚动） |

```typescript
// 热力图统计卡片响应式
function StatsRow({ today, thisWeek, total, streak }: Stats) {
  return (
    <div className="grid grid-cols-2 gap-sm md:grid-cols-4">
      <StatCard label="今日" value={today} />
      <StatCard label="本周" value={thisWeek} />
      <StatCard label="总计" value={total} />
      <StatCard label="连续" value={`${streak}天`} />
    </div>
  )
}

// 热力图网格移动端水平滚动
function HeatmapCalendar({ data }: { data: Map<string, number> }) {
  return (
    <div className="overflow-x-auto">
      <div className="inline-block">
        {/* CSS Grid: 7行 × 53列 */}
        <div className="grid gap-[2px] md:gap-[3px]"
             style={{ gridTemplateRows: 'repeat(7, 1fr)' }}>
          {weeks.map(week => (
            <div key={week.key} className="grid gap-[2px] md:gap-[3px]"
                 style={{ gridTemplateColumns: 'repeat(53, 1fr)' }}>
              {week.days.map(day => (
                <HeatmapCell key={day.date} level={day.level}
                  className="h-2.5 w-2.5 md:h-3 md:w-3 rounded-xs" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

#### 8.4.5 Git Graph（移动端最难部分）

Git Graph 在移动端面临最大挑战：小屏幕 + 触摸交互 + 复杂图形。

| 维度 | 桌面端 | 移动端 |
|------|--------|--------|
| 画布 | 全屏可交互 | 全屏可交互 |
| 缩放 | 鼠标滚轮 + 控件按钮 | **双指捏合 (pinch-to-zoom)** + 控件按钮 |
| 平移 | 鼠标拖拽 | **单指拖拽** |
| 节点点击 | 鼠标点击 | 手指点击（增大命中区域） |
| 详情面板 | 底部固定面板 | 底部弹出 BottomSheet |
| 初始缩放 | 1.0x | **0.8x**（默认缩小以显示更多内容） |
| 最小缩放 | 0.5x | **0.3x**（允许更远缩小） |
| 节点命中区域 | 实际大小 | **扩展到 44×44px 最小触摸区域** |

```typescript
// ReactFlow 移动端配置
import ReactFlow, { Controls, Background } from 'reactflow'

function GitGraph({ nodes, edges }: GraphProps) {
  const isMobile = useIsMobile()

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={{ commit: CommitNode }}
      edgeTypes={{ branch: BranchEdge }}
      // 缩放配置: 移动端允许更大范围
      minZoom={isMobile ? 0.3 : 0.5}
      maxZoom={2.0}
      defaultZoom={isMobile ? 0.8 : 1.0}
      // 触摸交互
      panOnDrag={true}           // 单指拖拽平移
      zoomOnPinch={true}         // 双指捏合缩放
      zoomOnScroll={!isMobile}   // 桌面端滚轮缩放
      zoomOnDoubleClick={!isMobile} // 桌面端双击缩放
      preventScrolling={true}    // 阻止页面滚动干扰
      // 节点交互
      nodesDraggable={false}     // 节点不可拖拽（只读视图）
      nodesConnectable={false}
      elementsSelectable={true}
      onNodeClick={handleNodeClick}
    >
      <Background color="var(--color-hairline)" gap={16} />
      {/* 缩放控件: 桌面端右下角, 移动端也保留但缩小 */}
      <Controls
        showInteractive={false}
        className="!bottom-4 !right-4 !shadow-md"
      />
    </ReactFlow>
  )
}

// CommitNode — 移动端增大命中区域
function CommitNode({ data }: NodeProps) {
  const isMobile = useIsMobile()
  return (
    <div
      className={`
        flex items-center justify-center rounded-full
        ${isMobile ? 'h-11 w-11' : 'h-6 w-6'}  /* 移动端 44px 命中区域 */
        ${data.selected ? 'ring-2 ring-ink' : ''}
      `}
    >
      {/* 实际可见节点: 移动端 16px, 桌面端 12px */}
      <div
        className="rounded-full"
        style={{
          width: isMobile ? 16 : 12,
          height: isMobile ? 16 : 12,
          backgroundColor: data.isMerge ? 'var(--color-primary)' : data.branchColor,
          boxShadow: `inset 0 0 0 2px var(--color-canvas)`,
        }}
      />
    </div>
  )
}
```

#### 8.4.6 搜索页

| 维度 | 桌面端 | 移动端 |
|------|--------|--------|
| 入口 | 侧边导航 / 快捷键 | AppBar 搜索图标 |
| 布局 | 居中单栏 (max-width: 640px) | 全宽单栏 |
| 搜索框 | 固定顶部 | 固定顶部 + 自动聚焦 |
| 结果展示 | 完整卡片 | 紧凑列表行 |
| 过滤器 | 左侧面板 | 顶部展开式过滤条 |

#### 8.4.7 设置页

| 维度 | 桌面端 | 移动端 |
|------|--------|--------|
| 布局 | 分组卡片 + 右侧预览 | 分组卡片全宽 |
| 主题切换 | 按钮组 (浅色/深色/系统) | 同左 |
| 数据管理 | 导出/导入按钮横排 | 导出/导入按钮纵排 |
| 关于信息 | 卡片底部 | 卡片底部 |

### 8.5 触摸交互规范

对齐 DESIGN.md §9.2 触摸目标规范：

| 元素 | 最小触摸区域 | 说明 |
|------|------------|------|
| 底部导航项 | 48×48px | `navItemHeight` |
| 按钮高度 | 40px (CTA) / 48px (大按钮) | `ctaHeight` / `ctaHeightLg` |
| 列表项 | 48px 最小高度 | 可点击行 |
| 图标按钮 | 44×44px 命中区域 | `tapTargetMin` |
| 热力图格子 | 实际尺寸（10-12px） | 通过 tooltip 展示详情，不需大触摸区 |

**手势支持**：

```typescript
// useSwipe hook — 移动端手势
function useSwipe(handlers: {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onPullDown?: () => void  // 下拉刷新
}) {
  // ... 触摸事件追踪
  // 左滑: 下一个 Tab
  // 右滑: 上一个 Tab
  // 下拉: 刷新数据
}

// Pull-to-refresh — 移动端
function PullToRefresh({ onRefresh, children }: Props) {
  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative overflow-auto"
    >
      {/* 下拉指示器 */}
      {pulling && (
        <div className="absolute top-0 left-0 right-0 flex justify-center">
          <Spinner className={pullDistance > threshold ? 'animate-spin' : ''} />
        </div>
      )}
      {children}
    </div>
  )
}
```

### 8.6 移动端 UI 模式映射

Flutter 端的移动端 UI 模式在 Web 端的对应实现：

| Flutter 模式 | Flutter 实现 | Web 端实现 | 说明 |
|-------------|------------|-----------|------|
| ModalBottomSheet | `showModalBottomSheet` | Radix UI Dialog (bottom variant) | 底部弹出操作菜单 |
| AlertDialog | `AppDialog.show` | Radix UI Dialog (centered) | 居中确认对话框 |
| SnackBar/Toast | `AppToast.show` | 自定义 Toast (底部) | 底部短暂提示 |
| RefreshIndicator | `RefreshIndicator` | PullToRefresh 组件 | 下拉刷新 |
| AppBar | `AppBarWidget` | 顶部固定栏 (sticky) | 页面标题 + 操作 |
| FAB | `FloatingActionButton` | 固定右下角浮动按钮 | 快捷创建入口 |
| Dismissible | `Dismissible` | 左滑删除手势 | 列表项滑动操作 |

**ModalBottomSheet 实现**（移动端核心交互模式）：

```typescript
// BottomSheet.tsx — 对齐 Flutter showModalBottomSheet
function BottomSheet({ open, onClose, children }: BottomSheetProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onClose}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="
          fixed inset-0 bg-black/50 backdrop-blur-sm
          data-[state=open]:animate-in data-[state=open]:fade-in
        " />
        <RadixDialog.Content className="
          fixed bottom-0 left-0 right-0
          rounded-t-xl border-t border-hairline bg-surface-1
          p-md pb-[calc(env(safe-area-inset-bottom)+16px)]
          data-[state=open]:animate-in
          data-[state=open]:slide-in-from-bottom
        ">
          {/* 拖拽指示器 */}
          <div className="mx-auto mb-md h-1 w-10 rounded-full bg-hairline-strong" />
          {children}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}
```

### 8.7 移动端性能优化

| 优化项 | 策略 | 说明 |
|-------|------|------|
| 代码分割 | 路由级 lazy loading | 首屏只加载当前路由代码 |
| 图片优化 | AVIF/WebP + lazy load | `<img loading="lazy">` |
| 动画降级 | `prefers-reduced-motion` | 系统设置开启时减少动画 |
| 虚拟列表 | `@tanstack/react-virtual` | 长列表虚拟滚动 |
| ReactFlow 性能 | 节点数 > 100 时启用虚拟化 | 大型仓库 commit 历史可能很长 |
| 触摸延迟 | CSS `touch-action: manipulation` | 消除 300ms 点击延迟 |
| 滚动性能 | CSS `will-change: transform` | 列表滚动优化 |
| 字体加载 | `font-display: swap` | 避免字体加载阻塞渲染 |

```typescript
// 路由级代码分割
const HomeScreen = lazy(() => import('./screens/home-screen'))
const HeatmapScreen = lazy(() => import('./screens/heatmap-screen'))
const GitGraphScreen = lazy(() => import('./screens/git-graph-screen'))

// 使用 Suspense 包裹
<Suspense fallback={<LoadingWidget message="加载中..." />}>
  <Routes>
    <Route path="/" element={<HomeScreen />} />
    <Route path="/heatmap" element={<HeatmapScreen />} />
    <Route path="/graph" element={<GitGraphScreen />} />
  </Routes>
</Suspense>
```

### 8.8 PWA 支持

Web 端配置为可安装的 PWA，实现"添加到主屏幕"后类原生应用体验：

| PWA 特性 | 实现方式 | 价值 |
|---------|---------|------|
| 可安装 | `manifest.json` + 安装提示 | 用户可"安装"到主屏幕，全屏运行 |
| 离线可用 | Service Worker 缓存 | 断网时仍可查看已加载数据 |
| 应用图标 | manifest icons | 主屏幕显示应用图标 |
| 启动画面 | manifest splash_screen | 类原生启动体验 |
| 状态栏适配 | `theme-color` meta | 状态栏颜色与主题一致 |
| 方向锁定 | `orientation: portrait` | 可选锁定竖屏 |

```json
// public/manifest.json
{
  "name": "Commit",
  "short_name": "Commit",
  "description": "像管理代码一样管理你的任务",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0F172A",
  "theme_color": "#3B82F6",
  "orientation": "any",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

```html
<!-- index.html meta 标签 -->
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
<meta name="theme-color" content="#0F172A" media="(prefers-color-scheme: dark)" />
<meta name="theme-color" content="#F8FAFC" media="(prefers-color-scheme: light)" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="Commit" />
```

```typescript
// vite.config.ts — PWA 插件
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // IndexedDB 数据不缓存，只缓存静态资源
        navigateFallback: '/index.html',
      },
    }),
  ],
})
```

### 8.9 iOS 安全区适配

iPhone 的刘海/灵动岛和底部 Home Indicator 需要特殊处理：

```css
/* 全局安全区适配 */
:root {
  --safe-area-top: env(safe-area-inset-top, 0px);
  --safe-area-bottom: env(safe-area-inset-bottom, 0px);
  --safe-area-left: env(safe-area-inset-left, 0px);
  --safe-area-right: env(safe-area-inset-right, 0px);
}

/* 底部导航: 加上底部安全区间距 */
.bottom-nav {
  padding-bottom: var(--safe-area-bottom);
}

/* 顶部 AppBar: 沉浸式状态栏 */
.app-bar {
  padding-top: var(--safe-area-top);
}

/* 横屏: 左右安全区 */
@media (orientation: landscape) {
  .side-nav {
    padding-left: var(--safe-area-left);
  }
}
```

### 8.10 移动端测试矩阵

| 设备类型 | 尺寸 | 测试重点 |
|---------|------|---------|
| iPhone SE | 375×667 | 最小屏幕，所有功能可用性 |
| iPhone 15 Pro | 393×852 | 标准手机，SafeArea 适配 |
| iPhone 15 Pro Max | 430×932 | 大屏手机，横屏测试 |
| iPad Mini | 768×1024 | 平板竖屏，导航断点切换 |
| iPad Pro 11" | 834×1194 | 平板横屏，侧边导航显示 |
| Android Pixel 8 | 412×915 | Android Chrome 兼容 |
| Android Galaxy S24 | 360×780 | 小屏 Android |

**响应式走查清单**：

- [ ] 所有页面在 375px 宽度下无水平溢出
- [ ] 底部导航在所有手机尺寸下可正常点击
- [ ] 840px 断点处导航模式切换无闪烁
- [ ] Git Graph 双指缩放在 iOS/Android 上流畅
- [ ] 热力图在手机上可水平滚动，不导致页面水平溢出
- [ ] ModalBottomSheet 在 iPhone 上正确避开底部安全区
- [ ] Pull-to-refresh 不与浏览器原生下拉刷新冲突
- [ ] PWA 安装后全屏运行，状态栏颜色正确
- [ ] 横屏旋转时布局正确适配（无布局错乱）

---

## 9. 主题系统（深色/浅色/系统）

对齐 Flutter 端 `CommitApp` 的 `themeMode` 逻辑：

```typescript
// Zustand store
interface SettingsStore {
  theme: 'light' | 'dark' | 'system'
  setTheme: (theme: 'light' | 'dark' | 'system') => void
}

// CSS 变量切换
function applyTheme(theme: 'light' | 'dark' | 'system') {
  const resolved = theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme
  document.documentElement.classList.toggle('dark', resolved === 'dark')
}

// Tailwind dark mode
darkMode: 'class' // 使用 class 策略
```

---

## 10. 开发计划与里程碑

### 阶段 1：基础设施（1-2 周）

- [ ] 初始化 Vite + React + TypeScript 项目
- [ ] 配置 Tailwind CSS 4 + 设计 token 映射 + Mobile-First 断点
- [ ] 移植 Domain 层（实体 + 枚举 + Repository 接口）
- [ ] 实现 Dexie.js 数据库 + Repository 实现
- [ ] 搭建 DI 容器 + 路由框架
- [ ] 实现深色/浅色/系统主题切换
- [ ] 实现响应式布局骨架（AppLayout + SideNav + BottomNav + 840px 切换）
- [ ] 配置 PWA（manifest + Service Worker + viewport meta + 安全区 CSS）
- [ ] 实现移动端 hooks（useIsDesktop / useIsMobile / useSwipe）

### 阶段 2：核心功能（2-3 周）

- [ ] 通用组件库（Button/Card/Badge/Input/Dialog/Toast 等）
- [ ] 移动端交互组件（BottomSheet / PullToRefresh / FAB）
- [ ] 首页（仓库列表 + 创建/删除）— 响应式空状态 + 移动端紧凑卡片
- [ ] 仓库详情页（分支列表 + 任务列表）— 桌面双栏 / 移动端 Tab 切换
- [ ] 任务 CRUD + 子任务 + 表单 — 移动端底部操作栏 + BottomSheet
- [ ] 分支创建 + 合并
- [ ] 全局搜索 — 移动端自动聚焦 + 紧凑结果行
- [ ] 侧边导航 + 底部导航（响应式切换）
- [ ] 虚拟列表（@tanstack/react-virtual）集成

### 阶段 3：数据可视化（1-2 周）

- [ ] 热力图（CSS Grid + Tailwind）— 移动端水平滚动 + 2×2 统计卡片
- [ ] Git Graph（ReactFlow + 自定义节点/连线）— 移动端 pinch-to-zoom + 扩大命中区域
- [ ] 提交历史时间线 — 移动端紧凑模式

### 阶段 4：完善与对齐（1 周）

- [ ] 数据导出（JSON/CSV/Markdown）
- [ ] 数据导入（JSON）
- [ ] Web 通知（Web Notifications API）
- [ ] 设置页（主题/通知/数据管理/关于）— 移动端纵向按钮布局
- [ ] 响应式全断点走查（375px ~ 1440px+）
- [ ] 移动端专项走查（iOS SafeArea / 安卓 Chrome / 横屏旋转）
- [ ] 深色/浅色模式视觉走查
- [ ] PWA 安装测试（iOS Safari / Android Chrome）

### 阶段 5：质量保障（1 周）

- [ ] 单元测试（Domain + Data 层）
- [ ] 组件测试（关键交互组件）
- [ ] E2E 测试（核心用户流程 — 桌面端 + 移动端各一轮）
- [ ] 性能优化（代码分割、懒加载、虚拟列表）
- [ ] 移动端性能优化（prefers-reduced-motion / touch-action / will-change）
- [ ] 无障碍审计（WCAG 2.1 AA）

---

## 11. 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| Domain 逻辑双份维护 | Dart 和 TS 两套实体/UseCase 需同步 | 实体模型简单（4+3），通过 shared/schemas 共享 JSON Schema |
| 设计系统偏差 | Web 端视觉与桌面端不一致 | 严格按 DESIGN.md token 映射，建立视觉回归测试 |
| IndexedDB 数据丢失 | 浏览器清除数据导致用户数据丢失 | 定期导出提醒 + 数据导出功能 |
| ReactFlow 学习成本 | 团队不熟悉 ReactFlow | 文档完善，自定义节点/连线代码清晰 |
| 未来同步改造 | 引入后端时需要大改 | Repository 接口模式确保 Data 层可插拔，DI 一行切换 |
| 包体积 | ReactFlow + Radix 等依赖增大 | Vite 代码分割 + 按需导入 + Tree shaking |
| Git Graph 移动端交互 | 双指缩放在部分浏览器上可能冲突 | ReactFlow `preventScrolling` + `zoomOnPinch` 配置，充分测试 iOS/Android |
| 小屏布局溢出 | 375px 极窄屏可能出现水平滚动 | 全断点走查 + `overflow-x: hidden` 兜底 + CSS Grid 自适应 |
| iOS SafeArea 适配 | iPhone 底部 Home Indicator 遮挡内容 | `env(safe-area-inset-bottom)` 全局适配 + 底部导航留白 |
| PWA 兼容差异 | iOS Safari PWA 限制比 Android Chrome 多 | 核心功能不依赖 PWA API，PWA 作为增强体验 |

---

## 12. 下一步行动

1. ✅ 确认关键决策点 — 已完成
2. ✅ 选择技术方案 — 已完成（方案 D + 预留同步）
3. ✅ 完成详细架构设计 — 已完成
4. ✅ 完成移动端适配策略 — 已完成（v1.1 新增 §8 完整移动端方案）
5. ⬜ 初始化 Web 项目骨架（含 PWA 配置）
6. ⬜ 移植 Domain 层
7. ⬜ 实现 Dexie.js Data 层
8. ⬜ 搭建设计 Token + 主题系统 + 响应式断点
9. ⬜ 实现响应式布局骨架（SideNav / BottomNav / 840px 切换）
10. ⬜ 逐屏实现 UI（Mobile-First 顺序：移动端样式 → 桌面端增强）

---

## 附录 A：现有项目可复用资产

| 资产 | Flutter 文件 | Web 端复用方式 |
|------|-------------|---------------|
| 实体定义 | `lib/domain/entities/*.dart` | 移植为 TypeScript interface |
| 枚举定义 | `lib/domain/entities/enums.dart` | 移植为 TypeScript enum + label |
| Repository 接口 | `lib/domain/repositories/i_*.dart` | 移植为 TypeScript interface |
| UseCase | `lib/domain/usecases/**/*.dart` | 移植为 TypeScript class |
| 数据库 Schema | `lib/data/database/tables/*.dart` | 映射为 Dexie.js schema |
| 设计 Token | `lib/core/theme/colors.dart` 等 | 映射为 Tailwind config |
| 设计规范 | `docs/DESIGN.md` | 直接参考，Web 端按此实现 |
| 数据导出格式 | `lib/domain/services/data_export_service.dart` | JSON 格式保持一致 |
| PRD | `docs/PRD.md` | 功能需求直接复用 |
| 组件规范 | DESIGN.md §7 | Tailwind 组件实现参考 |

## 附录 B：Flutter Web 不采用的技术原因

| 维度 | 详情 |
|------|------|
| 首屏性能 | Flutter Web 编译为 WASM/JS，体积 2MB+，首屏加载 3-5 秒 |
| 渲染模型 | Canvas 渲染，非原生 DOM，文本选择/右键菜单/浏览器搜索均不可用 |
| 交互范式 | Flutter 的 Widget 交互模型与 Web 原生交互（hover/focus/键盘快捷键）有本质差异 |
| CustomPainter | Web 上 Canvas 性能不如 SVG/DOM，大量 commit 节点时可能卡顿 |
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
