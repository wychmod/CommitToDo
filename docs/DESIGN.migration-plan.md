# Commit — UI 改造开发改动计划

> **版本**: 1.0.0
> **创建日期**: 2026-06-28
> **目标**: 将项目 UI **完全**对齐 `docs/DESIGN.md`（Linear-inspired Developer Dark）
> **性质**: 像素级 UI 改造——非 CSS 替换，覆盖样式、位置、布局、间距、字距、组件结构、交互态、数据可视化
> **前置**: 设计规范已落库 `docs/DESIGN.md`（唯一视觉事实来源），旧 `docs/UI_DESIGN.md` 已重命名为 `UI_DESIGN.deprecated.md`。

---

## 0. 改造原则

1. **以 `docs/DESIGN.md` 为唯一准绳**。代码与规范冲突时改代码，不改规范。
2. **token 先行，组件后行**。先把 `lib/core/theme/*` 校准到 DESIGN.md，再用 token 重写组件，避免魔法值。
3. **像素级**：每个间距走 4px 网格 token、每个圆角走 `rounded.*`、每个字距显式设置、每个色值引用 `AppColors.*`。
4. **不破坏架构**：只改 `presentation/` + `core/theme/`，不碰 `domain/` `data/` 业务逻辑。
5. **保留无障碍成果**：所有可见交互维持 `Semantics` + `InkWell`（`overview.md` 已建立，不回退）。
6. **每阶段可验证**：每阶段结束跑 `flutter analyze` + `flutter test`（需本机 Flutter SDK，当前环境缺失，见 `overview.md`）。

---

## 阶段 1：Token 层校准（基础设施，必做）

> 目标：让 `lib/core/theme/*` 成为 `docs/DESIGN.md` 的忠实实现，消除散落魔法值。

### 1.1 `lib/core/theme/colors.dart`
**现状问题**：命名是 `bgBase/bgElevated/bgOverlay` 等自定义名，与 DESIGN.md 的 `canvas/surface-1..4` ladder 不对齐；缺 `surface-4`、`hairline-strong/tertiary` 分级、`inverse-*`、`overlay`、`primary-gradient`、`on-primary`。

**改动**（已完成）：
- [x] 新增 ladder 语义常量（值复用现有，加别名映射 + 注释指向 DESIGN.md §2.2）：
  - `canvas = bgBase (#0F172A)`
  - `surface1 = bgElevated (#1E293B)`
  - `surface2 = bgOverlay (#334155)`
  - `surface3 = #475569`（新增）
  - `surface4 = #64748B`（新增，复用 textTertiary 值）
- [x] hairline 三阶：`hairline = borderSubtle (#1E293B)`、`hairlineStrong = borderDefault (#334155)`、`hairlineTertiary = #475569`（新增）。
- [x] accent 补全：`onPrimary = #FFFFFF`、`primaryGradient = [Color(0xFF3B82F6), Color(0xFF8B5CF6)]`（LinearGradient stops）、`primaryFocus = #2563EB`（复用 primaryDark，加别名）。
- [x] inverse 系：`inverseCanvas = #FFFFFF`、`inverseInk = #0F172A`。
- [x] `overlay = Color(0x80000000)`（50% 黑）。
- [x] 顶部 edge-highlight：`edgeHighlight = Color(0x0FFFFFFF)`（6% 白）。
- [x] 保留旧别名（`bgBase` 等）标记 `@Deprecated`，指向新名，避免一次性全项目报错；后续阶段逐步迁移引用。

### 1.2 `lib/core/theme/typography.dart`
**现状问题**：仅 7 档字号、**完全无 letterSpacing**（DESIGN.md 的负字距是高级感核心）、无 display 层级、无 eyebrow/button/mono-sm 语义样式。

**改动**（已完成）：
- [x] 字号补齐到 13 档（DESIGN.md §3.2）：新增 `displayXl=48 / displayLg=40 / displayMd=32`，现有 `xxl=24→headline`、`lg=17→cardTitle/bodyLg`、`base=15→body`、`sm=13→bodySm/mono`、`xs=11→caption/monoSm`。新增 `button=14`、`subhead=20`、`eyebrow=12`。
- [x] **新增 letterSpacing 常量**（关键）：
  - `trackingDisplayXl = -2.0`、`trackingDisplayLg = -1.5`、`trackingDisplayMd = -1.0`、`trackingHeadline = -0.6`、`trackingCardTitle = -0.4`、`trackingBody = -0.05`、`trackingEyebrow = 0.4`。
- [x] 预设样式 `TextStyle` 全部补 `letterSpacing` 字段（display/headline/cardTitle/subhead/bodyLg/body/eyebrow 走对应 tracking；bodySm/caption/button/mono/monoSm 显式 `letterSpacing: 0`，对齐「显式 > 隐式」）。
- [x] 新增预设：`displayXl/displayLg/displayMd`、`headline`、`subhead`、`bodyLg`、`button`、`eyebrow`、`monoSm`。
- [x] `mono` 样式明确用途注释：branch name / commit id / label。
- [x] 旧别名（`pageTitle/sectionTitle` 等）保留兼容，内部指向新预设。

### 1.3 `lib/core/theme/dimensions.dart`
**现状问题**：缺 `section(96)`、`radiusXxl(24)`、`pill` 与 `full` 语义混用、深色模式阴影策略未声明。

**改动**（已完成）：
- [x] 间距补 `section = 96.0`；`xxs` 早已是 4（4px 网格），新增 `micro = 2.0` 承接小于 4 的场景（hairline gap、热力图 gap）。
- [x] 圆角补 `radiusXxl = 24.0`；明确 `radiusPill = 999.0`（status/tab）、`radiusFull = 999.0`（头像/圆点）——值同但语义分离。
- [x] 阴影策略注释：深色模式禁用 `shadowMd/shadowLg`，改用 surface ladder + hairline；仅浅色模式用 `shadowSm`。
- [x] 触摸高度常量：`tapTargetMin = 44.0`、`navItemHeight = 48.0`、`ctaHeight = 40.0`。
- [x] 顶部 edge highlight 工厂：`cardBorder({color})` 用统一 hairline 四边（顶部高光改由组件 `Stack` 单独叠 1px，避免圆角处混色断裂）；`topEdgeHighlightGradient()` 提供 gradient 备选。

### 1.4 `lib/core/theme/app_theme.dart`
**现状问题**：light/dark 两个 ThemeData 内散落大量魔法色值（`#0F172A`/`#E2E8F0`/`#F8FAFC`/`#CBD5E1` 直写）；focus ring 缺 50% opacity；卡片圆角用 `radiusMd`(8) 而 DESIGN.md 规定 `radiusLg`(12)；无 surface ladder 注入。

**改动**（已完成）：
- [x] 所有魔法色值替换为 `AppColors.*` 引用（dark 用 canvas/surface1..3/hairline/ink；light 用 §9.4 浅色映射）。
- [x] `cardTheme` 圆角改 `radiusLg`(12)，边框改 `hairline`，elevation 0。
- [x] `inputDecorationTheme`：底 `surface1`、边框 `hairlineStrong`、focusedBorder 改 `2px primaryFocus@50%`（由 `_focusRingColor` 提供）。组件层 `AppInput` 不再覆盖 focusedBorder，统一交给 theme + 外层 `_FocusRingField` 包裹层。
- [x] `elevatedButtonTheme`：primary 底、`radiusMd`、padding 8/14、`button` 字号；新增 `OutlinedButtonTheme`（secondary 炭色）+ `TextButtonTheme`（tertiary）。
- [x] `bottomNavigationBarTheme`：选中 `primary`、未选中 `inkSubtle`、顶部 hairline 分隔（通过 `Border`）。
- [x] `appBarTheme`：底 `canvas`、底部 1px hairline、elevation 0、高度 56。
- [x] `dialogTheme`：底 `surface1`、`radiusXl`(16)、`hairlineStrong` 边。
- [x] `dividerTheme`：`hairline` 1px。
- [x] `textTheme` 全部用 `AppTypography.*` 预设（含 letterSpacing）。
- [x] **新增 `AppThemeColors` ThemeExtension**（`lib/core/theme/app_theme_colors.dart`）：把 surface ladder / hairline / ink / edgeHighlight 作为主题扩展注入 light/dark ThemeData。组件层通过 `AppThemeColors.of(context)` 取色，确保浅色模式组件配色跟随主题，不再硬编码深色常量。

### 1.5 `lib/core/theme/app_icons.dart`
**现状**：已有 Heroicons 枚举系统（`overview.md` 确认）。
**改动**（已完成）：
- [x] 审计图标尺寸是否对齐 DESIGN.md（图标默认 20、小图标 12-16、nav 图标 24）。
- [x] 补 Git 语义图标确认：`git-branch` / `git-commit` / `git-merge` / `git-fork`（`git-fork` 复用 `fork`，枚举已含）。
- [x] 无需大改，仅尺寸常量化到 `AppDimensions`。

---

## 阶段 2：通用组件层重写（`lib/presentation/widgets/common/`）

> 目标：每个通用组件按 DESIGN.md §7 重写，含完整交互态。

### 2.1 `app_button.dart`
- [ ] 重构为支持 4 variant：`primary / secondary / tertiary / danger / inverse`（DESIGN.md §7.1）。
- [ ] 三态：default → hover(`primary-hover`) → pressed(`primary-focus`) → focused(2px ring @ 50%)。Flutter desktop 用 `MouseRegion`+` InkWell` hover；移动端省略 hover。
- [ ] 字号 `button`(14/500)、圆角 `radiusMd`(8)、padding 8/14、最小高度 `ctaHeight`(40)。
- [ ] 危险按钮底 `error`。
- [ ] 全部 `Semantics` + `InkWell`。

### 2.2 `app_card.dart`
- [ ] 统一 `panel-card` 规范：底 `surface1`、`radiusLg`(12)、1px `hairline`、padding 16/24（可配置）、elevation 0、顶部 edge highlight。
- [ ] 提供 `lifted` 参数（hover/选中时升 `surface2` + `hairlineStrong`）。
- [ ] 提供工厂：`AppCard.task()` / `AppCard.repository()` / `AppCard.feature()`，注入对应 padding。

### 2.3 `app_badge.dart`
- [ ] 重写 `status-badge`：底 = 语义色 @ 12% opacity（`Color.withOpacity(0.12)`）、字 = 语义色、`monoSm`(11/500)、`radiusPill`、padding 2/8。
- [ ] `priority-dot`：`radiusFull` 8px。
- [ ] `count-badge`：底 `surface2`、字 `ink-muted`、`monoSm`、`radiusPill`。
- [ ] variant `soft` 调整为上述透明度方案（当前可能不一致，需对齐）。

### 2.4 `app_input.dart`
- [ ] 底 `surface1`、`radiusMd`(8)、padding 10/12、1px `hairlineStrong`。
- [ ] **focus ring 50% opacity**：用 `Focus` widget + `AnimatedContainer`，focused 时外层 2px `primaryFocus.withOpacity(0.5)` border（Flutter 原生 input 不支持，需包裹层实现）。
- [ ] label 用 `eyebrow`(12/500/+0.4) + `ink-muted`。
- [ ] error 态：1px `error` + 下方 `caption` `error` 色提示。
- [ ] 触摸端最小高度 `tapTargetMin`(44)。

### 2.5 `app_dialog.dart`
- [ ] 底 `surface1`、`radiusXl`(16)、padding 24、1px `hairlineStrong`、遮罩 `overlay`(50%黑)。
- [ ] 标题 `headline`、正文 `body`、按钮组右对齐（secondary 左 primary 右）。

### 2.6 `app_toast.dart`
- [ ] 底 `surface3`、`radiusMd`(8)、padding 12/16、左侧 3px 语义色条、`bodySm`。
- [ ] 底部浮出动画（`animNormal` + `easeOutQuart`）。

### 2.7 `app_bar_widget.dart`
- [ ] 底 `canvas`、高 56（桌面 64）、底部 1px `hairline`、elevation 0。
- [ ] 标题用 `headline` 或 `body`，左侧返回按钮 `tertiary`。

### 2.8 `bottom_nav_widget.dart`
- [ ] 底 `canvas`、顶部 1px `hairline`、选中 `primary`、未选中 `inkSubtle`、label `monoSm`、项高 `navItemHeight`(48)。
- [ ] 图标 24、选中态可选 accent 上移微动效。

### 2.9 `loading_widget.dart` / `error_widget.dart`
- [ ] loading：`primary` 环形进度居中。
- [ ] error：`error` 色图标 + `body` 文案 + `button-secondary`「重试」。

---

## 阶段 3：Git 专属组件重写（`lib/presentation/widgets/{task,branch,heatmap,repository}/` + painters）

> 目标：Commit 区别于 Linear 的核心——Git 隐喻可视化，按 DESIGN.md §7.3/7.6-7.9 像素级重写。

### 3.1 `task_card.dart`（核心，§7.3）
**现状**（已读源码）：左侧 3px 优先级色条已有 ✓；但圆角用 `radiusMd`(8) 需改 `radiusLg`(12)；标题字号 `base`(15) 需改 `cardTitle`(17/-0.4)；meta 文字用 `bodyFont` 应改 `mono`；hover 态缺（无 surface2 lift）；status badge 需对齐 §7.5 透明度方案；chevron 颜色 `textTertiary` 需对齐 `inkSubtle`。
- [ ] 圆角 `radiusLg`、padding 16、底 `surface1`、1px `hairline`。
- [ ] 标题 `cardTitle`(17/500/-0.4)；完成态 `ink-subtle` + lineThrough。
- [ ] meta（截止日）改 `monoSm` + `inkSubtle`；逾期 `error`。
- [ ] status badge 用 §7.5 透明度方案。
- [ ] hover：`AnimatedContainer` 升 `surface2` + `hairlineStrong`（desktop）。
- [ ] 分支指示器（showBranch）接入 §7.6 branch-indicator。

### 3.2 `task_list.dart` / `task_form.dart`
- [ ] list：item 间距 `xs`(8)，用 `ListView.separated`；空状态接 §7.3 `empty-state-card`。
- [ ] form：字段用 §7.4 `app_input`；优先级选择用 `segmented`（§7.2）；日期选择 dialog 用 §7.5。

### 3.3 `branch_indicator.dart` / `branch_list.dart`（§7.6）
- [ ] branch-indicator：`git-branch` 图标 + 分支色环圆点 + `mono` 分支名、`radiusSm` chip、底 `surface2`@50%、padding 4/8。
- [ ] 分支色按 `branchColors` 列表循环取色（按 branch index % 7）。
- [ ] branch-list：每项 `commit-row` 风格 + branch-indicator。

### 3.4 `heatmap_cell.dart` / `heatmap_calendar.dart` / `heatmap_painter.dart`（§7.7）
- [ ] cell：`heatmap-*` 色阶、`radiusXs`(4)、gap 3。
- [ ] hover：1px `hairlineStrong` 边 + tooltip（`surface3` 底 + `caption`）。
- [ ] 标签：月份/星期 `monoSm` + `inkSubtle`。
- [ ] 图例：「Less → More」`caption` + 5 格色阶。
- [ ] painter 确认色阶常量引用 `AppColors.heatmap*`，无硬编码。

### 3.5 `graph_painter.dart` + `git_graph_screen.dart`（§7.8）
- [ ] canvas 底 `canvas`、`radiusXl`(16) 容器、padding 24。
- [ ] 节点：分支色 + `radiusFull` 8px、commit 节点带 ring。
- [ ] 连线：分支色 2px 贝塞尔；merge 节点高亮 `primary`。
- [ ] 缩放控件：`button-secondary` 圆形（`radiusFull` 36）右下浮动。
- [ ] 确认 `TransformationController` 持久化（`overview.md` 已实现，保留）。

### 3.6 `repository_card.dart` / `repository_list.dart`（§7.3）
- [ ] card：底 `surface1`、`radiusLg`、padding 16、1px `hairline`、仓库名 `cardTitle`、分支/任务计数 `monoSm` + `ink-muted`。
- [ ] hover lift `surface2`。
- [ ] list 空状态 `empty-state-card`。

---

## 阶段 4：屏幕层布局重写（`lib/presentation/screens/`）

> 目标：每个屏幕按 DESIGN.md §4 布局 + §7 组件重排，含响应式。

### 4.1 `home_screen.dart`（首屏，展示面）
- [ ] 首屏 hero：`displayXl` 标题 + 蓝紫渐变 accent 装饰 + `ink-muted` 引导 + 主 CTA（`empty-state-card` 规范）。
- [ ] 有数据时：仓库卡片网格 3-up（desktop）/2-up（tablet）/1-up（mobile），用 `LayoutBuilder`。
- [ ] AppBar `canvas` 底 + hairline。
- [ ] 底部导航 `bottom-nav`。

### 4.2 `heatmap_screen.dart`（数据面）
- [ ] 标题区 `displayMd`(32) + eyebrow；热力图主体 §7.7。
- [ ] 周围 `spacing.lg`(24) 留白。

### 4.3 `git_graph_screen.dart`（数据面）
- [ ] 标题 `displayMd` + eyebrow；Graph 容器 §7.8。

### 4.4 `repository_screen.dart` + `repository_notifier/state`
- [ ] 详情页：仓库标题 `headline` + branch-indicator；任务列表接 §3.2。
- [ ] 双栏（desktop）：主列表 + 详情侧栏；单栏（mobile）。

### 4.5 `task_detail_screen.dart` / `task_form_screen.dart`
- [ ] detail：`headline` 标题、commit 历史用 `commit-row` §7.9。
- [ ] form：字段 §7.4、优先级 segmented §7.2、保存 `button-primary` / 取消 `button-secondary`。

### 4.6 `search_screen.dart`
- [ ] 搜索框 §7.4；历史记录 `commit-row` 风格；结果 `task-card`。
- [ ] 空搜索 `empty-state-card`。

### 4.7 `settings_screen.dart`（展示面头部 + 操作面列表）
- [ ] 头部：`displayMd` + 蓝紫渐变 accent（展示面）。
- [ ] 列表：`settings-row` §7.11（`surface1` + `radiusLg` + hairline + chevron）。
- [ ] 主题切换、导出数据入口对齐。

### 4.8 响应式断点（全屏幕）
- [ ] 统一用 `LayoutBuilder` + `MediaQuery` 实现 §9.1 断点（1440/1280/1024/768）。
- [ ] display 字号在 <768px 缩放（displayXl 48→32）。
- [ ] spacing.section 96 → xxl 48（mobile）。

---

## 阶段 5：字体资源启用

- [ ] 待 `assets/fonts/` 提供 JetBrains Mono + IBM Plex Sans ttf 后，取消 `pubspec.yaml` fonts 注释。
- [ ] 当前缺字体时回退平台默认，不阻断——本阶段不阻塞改造，可后置。

---

## 阶段 6：验证与收尾

- [ ] `flutter pub get`
- [ ] `dart run build_runner build --delete-conflicting-outputs`（Drift 生成，`overview.md` 提到当前是 placeholder，阻塞编译——需本机 Flutter SDK）
- [ ] `dart format lib test`
- [ ] `flutter analyze`（修 lint / 导入顺序 / 空安全）
- [ ] `flutter test`（修测试签名差异）
- [ ] 全项目搜索硬编码色值（`Color(0xFF`）替换为 `AppColors.*`（除 theme 文件外）。
- [ ] 全项目搜索硬编码 `radius`/`padding` 数字，替换为 `AppDimensions.*`。
- [ ] 视觉走查：深色模式逐屏对照 DESIGN.md §7。
- [ ] 浅色模式走查 §9.4。
- [ ] 更新 `overview.md` 记录本轮 UI 改造。

---

## 执行顺序与依赖

```
阶段1 (token) ── 必须先完成，其余阶段依赖
   ├─ 阶段2 (通用组件) ── 依赖阶段1
   │     └─ 阶段3 (Git 组件) ── 依赖阶段2
   │           └─ 阶段4 (屏幕) ── 依赖阶段3
   │                 └─ 阶段6 (验证)
   └─ 阶段5 (字体) ── 独立，随时可做
```

**建议分批 PR**：
- PR1：阶段 1（token 校准）——纯基础设施，低风险。
- PR2：阶段 2（通用组件）——影响面集中。
- PR3：阶段 3（Git 组件）——核心差异化。
- PR4：阶段 4（屏幕）——最大改动，逐屏提交。
- PR5：阶段 6（验证收尾）。

---

## 风险与注意事项

1. **Flutter SDK 缺失**（`overview.md` 已记录）：本机无 `flutter`/`dart`，阶段 6 验证无法在当前环境跑。需在有 SDK 的环境执行 build_runner / analyze / test。改造期间以静态正确性 + 规范对齐为准。
2. **Drift placeholder**：`*.g.dart` 是占位文件，真实编译阻塞。UI 改造不碰数据层，但验证时需先生成代码。
3. **`xxs` 间距改值**（2→4）会波及多处引用，需全局检查替换，避免布局偏移。
4. **旧别名兼容**：阶段 1 给旧 token 名加 `@Deprecated`，避免一次性几百处报错；阶段 2-4 逐步迁移到新名，最后阶段 6 清除旧名。
5. **focus ring 50% opacity**：Flutter 原生 input 不支持 outline opacity，需包裹层实现，增加组件复杂度——按 §7.4 在 `app_input` 内统一处理。
6. **不回退无障碍**：所有重写维持 `Semantics` + `InkWell`，不用 `GestureDetector`。
7. **不碰业务逻辑**：仅改 presentation + core/theme，domain/data 不动。

---

## 验收标准

- [ ] `lib/core/theme/*` 全部 token 与 `docs/DESIGN.md` §2/§3/§4/§6 一一对应，无散落魔法值。
- [ ] 每个通用组件实现 DESIGN.md §7 对应规范，含完整交互态。
- [ ] 每个屏幕布局符合 §4 + §9 响应式。
- [ ] 深色模式逐屏视觉与 DESIGN.md 一致；浅色模式符合 §9.4。
- [ ] `flutter analyze` 无警告；`flutter test` 通过。
- [ ] 无硬编码色值/圆角/间距（除 theme 文件）。
- [ ] 无障碍成果保留（Semantics + InkWell）。
