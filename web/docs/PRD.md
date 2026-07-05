# Commit Web 端产品需求文档（PRD）

**版本**: 1.0.0  
**语言**: 中文  
**创建日期**: 2026-07-05  
**关联文档**: `docs/PRD.md`、`docs/WEB_INTEGRATION_DESIGN.md`、`docs/DESIGN.md`  
**状态**: 初稿，待评审

---

## 1. 项目信息

| 项目 | 说明 |
|------|------|
| **Project Name** | `commit_web` |
| **Programming Language** | Vite + React 18 + TypeScript 5 + Tailwind CSS 4 + Radix UI + Dexie.js |
| **项目位置** | Monorepo 子目录 `web/`，与 Flutter `lib/` 并存 |
| **原始需求** | 为现有 Flutter 桌面/移动应用 Commit 新增一个独立的 Web 端版本，作为 Monorepo 的 `web/` 子目录存在；采用 React 技术栈，以 IndexedDB 为本地存储，全功能覆盖「仓库-分支-任务-提交」核心模型，并支持响应式布局、主题切换与 PWA 安装。 |

---

## 2. 产品定义

### 2.1 Product Goals

1. **功能对等**：Web 端在核心功能（仓库/分支/任务/搜索/提交历史）上与 Flutter 端完全对等，成为用户可选的跨平台入口。  
2. **原生 Web 体验**：采用 React + DOM 原生交互范式，不采用 Flutter Web，确保首屏性能、可访问性与响应式体验优于 Canvas 渲染方案。  
3. **设计一致性**：Web 端严格复用 `docs/DESIGN.md` 作为唯一视觉事实来源，保证深/浅主题、组件规范、交互密度与 Flutter 端一致。  
4. **离线优先 + PWA**：通过 IndexedDB 实现本地数据持久化，并通过 PWA 支持可安装、离线可用、主屏图标与状态栏适配。  

### 2.2 与 Flutter 端关系

- **数据独立**：Web 端数据存储在浏览器 IndexedDB，与 Flutter 端 SQLite 不直接互通；两端通过统一的 JSON 导出/导入格式交换数据。  
- **架构映射**：Web 端 `domain/application/data/presentation` 分层与 Flutter 端对齐；Repository 接口抽象为后续数据同步预留扩展空间。  
- **设计共享**：`docs/DESIGN.md` 是唯一视觉来源；`AppThemeColors` 通过 CSS Variables 映射，`AppIcons` 通过 Lucide React 映射。  

### 2.3 目标用户

- 个人开发者、项目经理、学生及任何需要任务管理的个人用户。  
- 需要在浏览器中快速访问、不想安装桌面/移动客户端的用户。  
- 希望通过手机/平板浏览器使用并安装 PWA 的移动用户。  

### 2.4 用户故事

1. 作为个人开发者，我希望在浏览器中创建和管理仓库、分支与任务，以便在工作电脑和家中设备上都能使用 Commit。  
2. 作为项目经理，我想要查看任务完成的热力图和分支关系的 Git Graph，以便直观地追踪项目进度与变更历史。  
3. 作为移动端用户，我希望将 Commit Web 安装到主屏幕并离线可用，以便像原生 App 一样使用。  
4. 作为用户，我希望数据可以导出为 JSON/CSV/Markdown 并重新导入，以便备份或在不同设备间迁移。  
5. 作为对视觉舒适度有要求的用户，我希望在深色与浅色模式之间切换，并可自定义主题色，以减少长时间使用的视觉疲劳。  
6. 作为高效用户，我希望通过全局搜索快速定位任务、分支或仓库，以减少在多层导航中翻找的时间。  

---

## 3. 技术规范

### 3.1 需求池（P0 / P1 / P2）

#### P0 — 必须完成（基础设施 + 核心功能 + 响应式 + 主题 + PWA）

| 编号 | 需求 | 验收标准 |
|------|------|----------|
| P0-1 | **项目初始化** | `web/` 目录下具备可运行的 Vite + React + TypeScript 项目骨架，并集成 Tailwind CSS 4、Radix UI、Dexie.js、React Router 7。 |
| P0-2 | **设计 Token 映射** | `docs/DESIGN.md` 全部颜色/字号/间距/圆角/动画 token 映射到 `tailwind.config.ts` 与 CSS Variables，支持 `.dark` / `.light` 切换。 |
| P0-3 | **主题系统** | 实现 `isDarkMode` 布尔切换与 `themeColor` 自定义，设置持久化到 `localStorage`，切换无闪烁。 |
| P0-4 | **响应式布局骨架** | 实现 `AppLayout`（≥840px 侧边导航 200px + 3px 选中色条，<840px 底部导航 48px）、`SplitView`（≥1024px 双栏，<1024px 单栏）、`useBreakpoint` 系列 hooks。 |
| P0-5 | **PWA 基础** | 配置 `manifest.json`、Service Worker、viewport meta、theme-color meta 与安全区 CSS；支持添加到主屏幕。 |
| P0-6 | **Domain 层移植** | 将 `Task`、`Branch`、`Repository`、`Commit` 实体与 `TaskStatus`、`Priority`、`CommitType` 枚举移植为 TypeScript，保持与 Flutter 端字段一致。 |
| P0-7 | **Dexie.js 数据层** | 实现 6 张表（repositories、branches、tasks、commits、tags、taskTags）与对应索引，实现 4 个 Repository 接口。 |
| P0-8 | **仓库管理** | 支持创建、编辑、删除（软删除）、列表查看仓库；新建仓库自动创建 `main` 分支。 |
| P0-9 | **分支管理** | 支持创建、切换、合并、删除（软删除）分支；`main` 分支不可删除；合并时未完成任务移动到目标分支。 |
| P0-10 | **任务管理** | 支持任务的创建、编辑、完成、删除（软删除）、状态流转、优先级设置、截止日期设置与子任务。 |
| P0-11 | **全局搜索** | 支持按任务标题/描述/分支名/仓库名实时搜索，移动端自动聚焦。 |
| P0-12 | **设置页** | 支持主题、通知开关、提醒时间、数据管理（导出/导入入口）与关于信息。 |
| P0-13 | **移动端适配** | 所有核心页面在 375px ~ 1440px 范围内可用，触摸目标 ≥44px，底部导航适配 iOS SafeArea。 |

#### P1 — 重要（热力图 + Git Graph + 数据导入导出）

| 编号 | 需求 | 验收标准 |
|------|------|----------|
| P1-1 | **热力图** | 实现类似 GitHub 的贡献日历，展示任务完成密度；移动端支持水平滚动，格子尺寸按断点调整。 |
| P1-2 | **Git Graph 可视化** | 使用 ReactFlow 实现分支-提交关系图；支持节点点击、贝塞尔连线、缩放/平移；移动端支持双指缩放，默认缩放 0.8x。 |
| P1-3 | **提交历史** | 在任务详情页展示 Commit 时间线，支持按创建/更新/合并/完成/删除类型筛选。 |
| P1-4 | **数据导出** | 支持导出完整数据为 JSON、任务列表为 CSV、仓库概览为 Markdown。 |
| P1-5 | **数据导入** | 支持从 JSON 导入数据，与 Flutter 端导出格式保持一致；导入时校验版本号并提示冲突。 |
| P1-6 | **虚拟列表** | 在任务列表与提交历史中集成 `@tanstack/react-virtual`，保证长列表滚动流畅。 |

#### P2 — 增强（Web 通知、动画细化等）

| 编号 | 需求 | 验收标准 |
|------|------|----------|
| P2-1 | **Web 通知** | 在任务截止前通过 Web Notifications API 发送提醒，用户可开启/关闭。 |
| P2-2 | **动画细化** | 页面切换、列表项 hover、主题切换、空状态展示等符合 `DESIGN.md` 动画体系（150ms/250ms/350ms，easeOutQuart/easeOutExpo）。 |
| P2-3 | **手势交互** | 移动端支持下拉刷新、长按操作、BottomSheet 等原生 App 交互模式。 |
| P2-4 | **性能优化** | 实现路由级代码分割、懒加载、Tree Shaking，首屏加载 < 500KB。 |
| P2-5 | **无障碍** | 通过 WCAG 2.1 AA 基础审计，关键组件具备 ARIA 标签与键盘可达性。 |

### 3.2 UI/UX 设计稿引用

Web 端视觉与交互必须严格以 `docs/DESIGN.md`（版本 2.0.0）为唯一事实来源。需还原的关键组件与设计点如下：

| 组件/设计点 | DESIGN.md 出处 | Web 端实现要求 |
|-------------|----------------|----------------|
| 色彩体系 | §2 Colors | 通过 CSS Variables 完整映射 `canvas` / `surface-1~4` / `hairline` / `ink` / `primary` / 语义色 / 热力图色阶 / 分支色。 |
| 字体体系 | §3 Typography | 标题/正文使用 IBM Plex Sans，branch name / commit id / label 使用 JetBrains Mono；display 使用负字距。 |
| 间距与圆角 | §4 Layout / §6 Shapes | 4px 网格、12px 卡片圆角、8px 按钮圆角、4px 热力图格子圆角。 |
| 组件规范 | §7 Components | 还原 `button-primary/secondary/tertiary/danger`、`task-card`、`repository-card`、`status-badge`、`branch-indicator`、`commit-row`、`dialog`、`toast` 等。 |
| 展示面/操作面/数据面 | §4.4、§13 | 首页空状态用 `HeroEmptyState`（渐变图标 + 渐变标题）；列表页用 `Dense List`；热力图/Git Graph 用 `Data Canvas`；设置页用 `Settings Stack`。 |
| 响应式规则 | §9 Responsive Behavior | 断点：Mobile <768px、Mobile-Lg 768~1023px、Tablet ≥1024px、Desktop ≥1280px、Desktop-XL ≥1440px；卡片网格 1-up → 2-up → 3-up。 |
| 移动端模式 | §8.8 | 底部导航（48px）、BottomSheet、FAB、下拉刷新等 Flutter 模式映射到 Radix UI / 自定义组件。 |
| 深色/浅色模式 | §9.4 | 浅色模式 surface/ink 反转，accent/语义色/heatmap/branchColors 不变。 |

### 3.3 技术约束

- **技术栈**：React 18 + TypeScript 5 + Vite 6 + Tailwind CSS 4 + Radix UI + Zustand + React Router 7 + Dexie.js 4。  
- **状态管理**：每屏独立 Zustand store，对应 Flutter 端 `Notifier + State` 模式。  
- **本地存储**：IndexedDB（Dexie.js），设置项使用 `localStorage`。  
- **数据同步**：当前阶段不实现，但 Repository 接口必须抽象以预留远程实现。  
- **浏览器兼容**：Chrome/Edge/Firefox/Safari 最新两个主版本；移动端 Safari/Chrome 支持 PWA。  
- **构建产物**：输出到 `web/dist/`，可作为静态站点部署。  

---

## 4. 待确认问题（Open Questions）

1. **PWA 与 Flutter 端导出格式**：JSON 导出/导入是否需要在当前 Sprint 内与 Flutter 端做一次端到端兼容测试？  
2. **通知策略**：Web 通知的提醒逻辑（任务截止前 N 小时）是否与 Flutter 端完全一致，还是允许针对 Web 端做简化？  
3. **标签系统**：`tags` 与 `task_tags` 表在 P0 中是否需要完整实现 UI，还是仅保留数据层支持？  
4. **桌面小组件**：原 PRD 中桌面小组件（P1）是否适用于 Web 端，还是仅保留 Flutter 端？  
5. **数据同步路线图**：是否需要在本次 Web 端开发中预留用户账号/后端同步的 UI 占位，还是完全隐藏？  

---

## 5. 附录

### 5.1 参考文档

- `docs/WEB_INTEGRATION_DESIGN.md` — Web 端技术架构、移动端适配策略、开发计划。  
- `docs/PRD.md` — 现有 Flutter 端产品需求文档。  
- `docs/DESIGN.md` — 唯一视觉设计规范。  

### 5.2 版本规划（基于 WEB_INTEGRATION_DESIGN.md §10）

| 阶段 | 周期 | 目标 |
|------|------|------|
| 阶段 1 | 1-2 周 | 基础设施、主题、响应式骨架、PWA 基础、Dexie.js 数据层。  |
| 阶段 2 | 2-3 周 | 通用组件库、仓库/分支/任务/搜索/设置页面、移动端交互。  |
| 阶段 3 | 1-2 周 | 热力图、Git Graph（ReactFlow）、提交历史。  |
| 阶段 4 | 1 周 | 数据导入导出、Web 通知、响应式/主题/PWA 走查。  |
| 阶段 5 | 1 周 | 单元测试、组件测试、E2E、性能与无障碍审计。  |
