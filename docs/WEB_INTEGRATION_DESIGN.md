# Commit — Web 端接入设计方案

**版本**: 1.0.0
**创建日期**: 2026-07-03
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
| **Git Graph** | ReactFlow | 12.x | 见 §6 详细分析 |
| **热力图** | CSS Grid + Tailwind | — | 纯 CSS 实现，无需额外库 |
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
│   └── favicon.svg
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
│   │   │   │   ├── side-nav.tsx
│   │   │   │   ├── bottom-nav.tsx
│   │   │   │   ├── loading-widget.tsx
│   │   │   │   └── error-widget.tsx
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
│   │   │   └── dimensions.ts      ← DESIGN.md §4 间距 token
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

## 8. 响应式布局策略

对齐 Flutter 端 `AppScaffold` 的 840px 断点：

| 断点 | 宽度范围 | 布局 | 导航 |
|------|---------|------|------|
| Desktop | ≥ 1280px | 侧边导航 + 主内容 + 可选右栏 | 侧边导航 (240px) |
| Laptop | 840px ~ 1280px | 侧边导航 + 主内容 | 侧边导航 (64px 折叠) |
| Tablet | 768px ~ 840px | 单栏 | 底部导航 |
| Mobile | < 768px | 单栏 | 底部导航 |

```typescript
// Tailwind 断点对齐
screens: {
  'mobile': '0px',      // < 768px
  'tablet': '768px',    // 768px ~ 840px
  'laptop': '840px',    // 840px ~ 1280px (Flutter 端 isDesktop 断点)
  'desktop': '1280px',  // ≥ 1280px
}
```

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
- [ ] 配置 Tailwind CSS 4 + 设计 token 映射
- [ ] 移植 Domain 层（实体 + 枚举 + Repository 接口）
- [ ] 实现 Dexie.js 数据库 + Repository 实现
- [ ] 搭建 DI 容器 + 路由框架
- [ ] 实现深色/浅色/系统主题切换

### 阶段 2：核心功能（2-3 周）

- [ ] 通用组件库（Button/Card/Badge/Input/Dialog/Toast 等）
- [ ] 首页（仓库列表 + 创建/删除）
- [ ] 仓库详情页（分支列表 + 任务列表）
- [ ] 任务 CRUD + 子任务 + 表单
- [ ] 分支创建 + 合并
- [ ] 全局搜索
- [ ] 侧边导航 + 底部导航（响应式）

### 阶段 3：数据可视化（1-2 周）

- [ ] 热力图（CSS Grid + Tailwind）
- [ ] Git Graph（ReactFlow + 自定义节点/连线）
- [ ] 提交历史时间线

### 阶段 4：完善与对齐（1 周）

- [ ] 数据导出（JSON/CSV/Markdown）
- [ ] 数据导入（JSON）
- [ ] Web 通知（Web Notifications API）
- [ ] 设置页（主题/通知/数据管理/关于）
- [ ] 响应式全断点走查
- [ ] 深色/浅色模式视觉走查

### 阶段 5：质量保障（1 周）

- [ ] 单元测试（Domain + Data 层）
- [ ] 组件测试（关键交互组件）
- [ ] E2E 测试（核心用户流程）
- [ ] 性能优化（代码分割、懒加载）
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

---

## 12. 下一步行动

1. ✅ 确认关键决策点 — 已完成
2. ✅ 选择技术方案 — 已完成（方案 D + 预留同步）
3. ✅ 完成详细架构设计 — 已完成
4. ⬜ 初始化 Web 项目骨架
5. ⬜ 移植 Domain 层
6. ⬜ 实现 Dexie.js Data 层
7. ⬜ 搭建设计 Token + 主题系统
8. ⬜ 逐屏实现 UI

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
