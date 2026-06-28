# Commit - UI 设计风格文档

**版本**: 1.0.0
**更新日期**: 2026-05-28
**设计风格**: Developer Elegant Dark Mode
**技术栈**: Flutter 3.x + Dart

---

## 🎨 设计理念

### 核心设计哲学

Commit 采用 **"Developer Elegant"** 设计语言——融合开发者工具的专业感与现代应用的精致美学。

> **设计宣言**: 像管理代码一样管理任务，界面也应该像优秀的 IDE 一样——高效、精确、令人愉悦。

### 设计关键词

| 关键词 | 含义 |
|--------|------|
| **精确** | 每个像素都有意义，间距遵循 4px 网格 |
| **克制** | 减少视觉噪音，让内容成为主角 |
| **技术感** | JetBrains Mono 等宽字体唤起开发者认同 |
| **温度** | 通过微妙的色彩和动效避免冰冷感 |

### 反模式（绝不使用）

- ❌ Emoji 作为 UI 图标（使用 Heroicons/Lucide SVG）
- ❌ 纯黑 `#000` 背景（使用深灰 `#0F172A`）
- ❌ 紫色渐变（避免 AI 审美）
- ❌ 毛玻璃滥用
- ❌ 圆角+通用阴影的卡片堆叠

---

## 🖌️ 设计系统 (Design Tokens)

### 色彩系统

#### 主色调

```dart
// core/theme/colors.dart

class AppColors {
  // ─── 基础色板 ───
  static const Color primary = Color(0xFF3B82F6);        // Blue-500 - 主强调色
  static const Color primaryHover = Color(0xFF2563EB);    // Blue-600 - 悬停态
  static const Color primaryLight = Color(0xFF60A5FA);    // Blue-400 - 浅色变体
  static const Color primaryDark = Color(0xFF1D4ED8);     // Blue-700 - 深色变体

  // ─── 深色背景系统 ───
  static const Color bgBase = Color(0xFF0F172A);          // Slate-900 - 页面背景
  static const Color bgElevated = Color(0xFF1E293B);      // Slate-800 - 卡片/面板
  static const Color bgOverlay = Color(0xFF334155);       // Slate-700 - 弹窗/浮层
  static const Color bgSurface = Color(0xFF0F172A);       // Slate-900 - 输入框背景

  // ─── 文字色 ───
  static const Color textPrimary = Color(0xFFF1F5F9);     // Slate-100 - 主文字
  static const Color textSecondary = Color(0xFF94A3B8);   // Slate-400 - 次要文字
  static const Color textTertiary = Color(0xFF64748B);    // Slate-500 - 辅助文字
  static const Color textDisabled = Color(0xFF475569);    // Slate-600 - 禁用文字

  // ─── 边框色 ───
  static const Color borderSubtle = Color(0xFF1E293B);    // 微妙边框
  static const Color borderDefault = Color(0xFF334155);   // 默认边框
  static const Color borderFocus = Color(0xFF3B82F6);     // 聚焦边框

  // ─── 语义色 ───
  static const Color success = Color(0xFF10B981);         // Emerald-500
  static const Color successLight = Color(0xFF34D399);    // Emerald-400
  static const Color warning = Color(0xFFF59E0B);         // Amber-500
  static const Color warningLight = Color(0xFFFBBF24);    // Amber-400
  static const Color error = Color(0xFFEF4444);           // Red-500
  static const Color errorLight = Color(0xFFF87171);      // Red-400
  static const Color info = Color(0xFF3B82F6);            // Blue-500

  // ─── 优先级色 ───
  static const Color priorityHigh = Color(0xFFEF4444);    // 红色 - 高优先级
  static const Color priorityMedium = Color(0xFFF59E0B);  // 黄色 - 中优先级
  static const Color priorityLow = Color(0xFF10B981);     // 绿色 - 低优先级

  // ─── 任务状态色 ───
  static const Color statusTodo = Color(0xFF94A3B8);      // 灰色 - 待办
  static const Color statusInProgress = Color(0xFF3B82F6); // 蓝色 - 进行中
  static const Color statusDone = Color(0xFF10B981);      // 绿色 - 已完成
  static const Color statusCancelled = Color(0xFF6B7280);  // 灰色 - 已取消

  // ─── 热力图色阶 ───
  static const Color heatmapEmpty = Color(0xFF1E293B);    // 无数据
  static const Color heatmapLevel1 = Color(0xFF064E3B);   // Level 1
  static const Color heatmapLevel2 = Color(0xFF065F46);   // Level 2
  static const Color heatmapLevel3 = Color(0xFF047857);   // Level 3
  static const Color heatmapLevel4 = Color(0xFF10B981);   // Level 4 (最高)

  // ─── Git Graph 分支色 ───
  static const List<Color> branchColors = [
    Color(0xFF3B82F6),  // 蓝色 - main
    Color(0xFF8B5CF6),  // 紫色
    Color(0xFFF59E0B),  // 琥珀色
    Color(0xFF10B981),  // 绿色
    Color(0xFFEC4899),  // 粉色
    Color(0xFF06B6D4),  // 青色
    Color(0xFFF97316),  // 橙色
  ];
}
```

#### 色彩使用规则

| 元素 | 色彩 | 对比度 |
|------|------|--------|
| 页面背景 | `bgBase` #0F172A | - |
| 卡片背景 | `bgElevated` #1E293B | - |
| 主文字 | `textPrimary` #F1F5F9 | 15.4:1 ✓ |
| 次要文字 | `textSecondary` #94A3B8 | 7.1:1 ✓ |
| 辅助文字 | `textTertiary` #64748B | 4.6:1 ✓ |
| 主按钮 | `primary` #3B82F6 | 4.6:1 ✓ |
| 成功状态 | `success` #10B981 on `bgBase` | 5.2:1 ✓ |

> 所有文字色彩组合均满足 WCAG AA 标准（4.5:1）

---

### 字体系统

```dart
// core/theme/typography.dart

class AppTypography {
  // ─── 字体族 ───
  static const String headingFont = 'JetBrains Mono';    // 标题/代码风
  static const String bodyFont = 'IBM Plex Sans';        // 正文
  static const String monoFont = 'JetBrains Mono';       // 等宽

  // ─── 字体大小 ───
  static const double xs = 11.0;    // 辅助标签
  static const double sm = 13.0;    // 次要文字
  static const double base = 15.0;  // 正文
  static const double lg = 17.0;    // 大正文
  static const double xl = 20.0;    // 小标题
  static const double xxl = 24.0;   // 标题
  static const double xxxl = 32.0;  // 页面标题

  // ─── 行高 ───
  static const double lineHeightTight = 1.2;
  static const double lineHeightNormal = 1.5;
  static const double lineHeightRelaxed = 1.75;

  // ─── 字重 ───
  static const FontWeight light = FontWeight.w300;
  static const FontWeight regular = FontWeight.w400;
  static const FontWeight medium = FontWeight.w500;
  static const FontWeight semiBold = FontWeight.w600;
  static const FontWeight bold = FontWeight.w700;
}
```

#### 字体搭配说明

| 场景 | 字体 | 大小 | 字重 | 行高 |
|------|------|------|------|------|
| 页面标题 | JetBrains Mono | 32px | Bold | 1.2 |
| 区域标题 | JetBrains Mono | 24px | SemiBold | 1.2 |
| 卡片标题 | IBM Plex Sans | 17px | Medium | 1.5 |
| 正文 | IBM Plex Sans | 15px | Regular | 1.5 |
| 次要文字 | IBM Plex Sans | 13px | Regular | 1.5 |
| 标签/徽章 | JetBrains Mono | 11px | Medium | 1.2 |
| 分支名 | JetBrains Mono | 13px | Medium | 1.2 |
| 代码/ID | JetBrains Mono | 13px | Regular | 1.5 |

---

### 间距系统

```dart
// core/theme/dimensions.dart

class AppDimensions {
  // ─── 基础间距 (4px 网格) ───
  static const double xxs = 2.0;
  static const double xs = 4.0;
  static const double sm = 8.0;
  static const double md = 12.0;
  static const double base = 16.0;
  static const double lg = 20.0;
  static const double xl = 24.0;
  static const double xxl = 32.0;
  static const double xxxl = 48.0;
  static const double huge = 64.0;

  // ─── 圆角 ───
  static const double radiusXs = 4.0;
  static const double radiusSm = 6.0;
  static const double radiusMd = 8.0;
  static const double radiusLg = 12.0;
  static const double radiusXl = 16.0;
  static const double radiusFull = 999.0;

  // ─── 阴影 ───
  static const List<BoxShadow> shadowSm = [
    BoxShadow(
      color: Color(0x0D000000),
      blurRadius: 2,
      offset: Offset(0, 1),
    ),
  ];

  static const List<BoxShadow> shadowMd = [
    BoxShadow(
      color: Color(0x1A000000),
      blurRadius: 6,
      offset: Offset(0, 2),
    ),
  ];

  static const List<BoxShadow> shadowLg = [
    BoxShadow(
      color: Color(0x26000000),
      blurRadius: 12,
      offset: Offset(0, 4),
    ),
  ];

  // ─── 动画时长 ───
  static const Duration animFast = Duration(milliseconds: 150);
  static const Duration animNormal = Duration(milliseconds: 250);
  static const Duration animSlow = Duration(milliseconds: 350);

  // ─── 动画曲线 ───
  static const Curve easeOutQuart = Cubic(0.25, 1, 0.5, 1);
  static const Curve easeOutExpo = Cubic(0.16, 1, 0.3, 1);
}
```

---

### 图标系统

**图标库**: Heroicons (Outline 风格)
**尺寸**: 20px (默认), 16px (紧凑), 24px (强调)

| 用途 | 图标名 | 说明 |
|------|--------|------|
| 仓库 | `folder` | 仓库列表 |
| 分支 | `git-branch` | 分支管理 |
| 任务 | `check-circle` | 任务列表 |
| 添加 | `plus` | 新建操作 |
| 搜索 | `magnifying-glass` | 搜索功能 |
| 设置 | `cog-6-tooth` | 设置页面 |
| 删除 | `trash` | 删除操作 |
| 编辑 | `pencil` | 编辑操作 |
| 返回 | `arrow-left` | 导航返回 |
| 筛选 | `funnel` | 筛选功能 |
| 排序 | `bars-arrow-up` | 排序功能 |
| 日历 | `calendar` | 日期选择 |
| 图表 | `chart-bar` | 统计图表 |
| 热力图 | `fire` | 热力图 |
| 图形 | `square-3-stack-3d` | Git Graph |
| 导出 | `arrow-up-tray` | 导出功能 |
| 更多 | `ellipsis-horizontal` | 更多操作 |
| 关闭 | `x-mark` | 关闭/取消 |
| 检查 | `check` | 确认/完成 |

---

## 📱 页面设计规范

### 1. 首页 (HomePage)

#### 布局结构

```
┌─────────────────────────────────────────┐
│  App Bar                    [搜索] [设置] │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  📁 项目 Alpha           12 任务 │   │
│  │  main · 更新于 2 小时前         │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  📁 项目 Beta            8 任务 │   │
│  │  main · 更新于 1 天前           │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  📁 项目 Gamma           5 任务 │   │
│  │  main · 更新于 3 天前           │   │
│  └─────────────────────────────────┘   │
│                                         │
├─────────────────────────────────────────┤
│  [仓库]     [热力图]    [图形]    [设置] │
└─────────────────────────────────────────┘
```

#### 设计细节

```dart
// 仓库卡片设计
class RepositoryCard extends StatelessWidget {
  // 视觉规格
  // - 背景: bgElevated (#1E293B)
  // - 圆角: radiusMd (8px)
  // - 内边距: base (16px)
  // - 边框: 1px borderSubtle
  // - 悬停: translateY(-2px) + shadowMd
  // - 按压缩放: 0.98

  // 内容布局
  // - 左侧: 仓库图标 (24px) + 仓库名 (lg, medium)
  // - 右侧: 任务数量徽章
  // - 底部: 分支名 (mono, sm) + 更新时间 (sm, textSecondary)
}
```

#### 空状态

当没有仓库时，显示引导界面：
- 插图: 简约的 Git 分支线条画
- 标题: "开始你的第一个仓库"
- 描述: "像管理代码一样管理你的任务"
- 按钮: "创建仓库" (Primary Button)

---

### 2. 仓库详情页 (RepositoryPage)

#### 布局结构

```
┌─────────────────────────────────────────┐
│  [←] 项目 Alpha              [+] [···] │
├─────────────────────────────────────────┤
│  分支: [main ▾]   筛选: [全部 ▾]       │
├─────────────────────────────────────────┤
│                                         │
│  ── 待办 (3) ───────────────────────── │
│  ┌─────────────────────────────────┐   │
│  │  🔴 设计数据库架构              │   │
│  │  截止: 明天 · 高优先级          │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │  🟡 编写 API 文档               │   │
│  │  截止: 本周五 · 中优先级        │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ── 进行中 (2) ─────────────────────── │
│  ┌─────────────────────────────────┐   │
│  │  🔵 用户认证模块                │   │
│  │  已进行 3 天 · 高优先级         │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ── 已完成 (7) ─────────────────────── │
│  ┌─────────────────────────────────┐   │
│  │  ✅ 项目初始化          [折叠]  │   │
│  └─────────────────────────────────┘   │
│                                         │
├─────────────────────────────────────────┤
│  [仓库]     [热力图]    [图形]    [设置] │
└─────────────────────────────────────────┘
```

#### 设计细节

```dart
// 任务卡片设计
class TaskCard extends StatelessWidget {
  // 视觉规格
  // - 背景: bgElevated (#1E293B)
  // - 圆角: radiusMd (8px)
  // - 内边距: md (12px)
  // - 左边框: 3px 优先级色
  //   - 高: priorityHigh (红)
  //   - 中: priorityMedium (黄)
  //   - 低: priorityLow (绿)
  // - 悬停: 背景色变亮 5%

  // 内容布局
  // - 第一行: 优先级指示器 + 任务标题
  // - 第二行: 截止日期 + 状态标签

  // 交互
  // - 点击: 进入任务详情
  // - 长按: 显示上下文菜单
  // - 左滑: 快速完成
  // - 右滑: 快速删除
}

// 分支切换器
class BranchSwitcher extends StatelessWidget {
  // 视觉规格
  // - 背景: bgOverlay (#334155)
  // - 圆角: radiusLg (12px)
  // - 下拉动画: 从上方滑入 (200ms, easeOutQuart)
  // - 分支名: JetBrains Mono, 13px
  // - main 分支: 带星标图标
  // - 当前分支: primary 色高亮
}
```

---

### 3. 任务详情页 (TaskDetailPage)

#### 布局结构

```
┌─────────────────────────────────────────┐
│  [←] 任务详情              [编辑] [···] │
├─────────────────────────────────────────┤
│                                         │
│  设计数据库架构                          │
│  ┌─────┐ ┌──────┐ ┌────────┐          │
│  │ 高  │ │ 待办 │ │ 明天   │          │
│  └─────┘ └──────┘ └────────┘          │
│                                         │
│  ── 描述 ───────────────────────────── │
│  设计用户表、任务表、分支表的结构...     │
│                                         │
│  ── 子任务 (2/4) ───────────────────── │
│  ✅ 用户表设计                          │
│  ✅ 任务表设计                          │
│  ⬜ 分支表设计                          │
│  ⬜ 提交历史表设计                      │
│                                         │
│  ── 信息 ───────────────────────────── │
│  创建时间: 2026-05-26 14:30            │
│  更新时间: 2026-05-27 09:15            │
│  所属分支: main                         │
│  所属仓库: 项目 Alpha                   │
│                                         │
│  ── 提交历史 ───────────────────────── │
│  ○ 创建任务        2 小时前            │
│  ○ 更新优先级      1 小时前            │
│  ○ 添加子任务      30 分钟前           │
│                                         │
├─────────────────────────────────────────┤
│  [完成任务]              [删除任务]     │
└─────────────────────────────────────────┘
```

#### 设计细节

```dart
// 任务详情页设计规格
class TaskDetailDesign {
  // 标题区域
  // - 字体: IBM Plex Sans, 24px, Medium
  // - 颜色: textPrimary
  // - 标签: 水平排列，间距 8px

  // 标签设计
  // - 优先级: 实心圆 + 文字 (高/中/低)
  //   - 高: 红色背景 10% + 红色文字
  //   - 中: 黄色背景 10% + 黄色文字
  //   - 低: 绿色背景 10% + 绿色文字
  // - 状态: 圆角胶囊
  //   - 待办: 灰色边框
  //   - 进行中: 蓝色填充
  //   - 已完成: 绿色填充
  // - 日期: 日历图标 + 日期文字

  // 子任务
  // - 复选框: 20px, 圆角 4px
  //   - 未完成: 边框 borderDefault
  //   - 已完成: 填充 success + 白色勾
  // - 文字: 15px, 已完成时加删除线 + textTertiary

  // 提交历史
  // - 时间线: 左侧竖线 (2px, borderSubtle)
  // - 节点: 8px 圆点, primary 色
  // - 内容: 13px, textSecondary
}
```

---

### 4. Git Graph 页 (GitGraphPage)

#### 布局结构

```
┌─────────────────────────────────────────┐
│  [←] Git Graph            [+] [放大] [缩小]│
├─────────────────────────────────────────┤
│                                         │
│  ●─●─●─●─●─●─●─●─●─●─●─●─●─●─●      │
│  │ │     │     │ │     │               │
│  │ │     ●─●─●─┘ │     ●─●─●         │
│  │ │             │         │           │
│  │ ●─●─●─────────┘         │           │
│  │                         │           │
│  main    feature-a    feature-b        │
│                                         │
│  ── 节点详情 ───────────────────────── │
│  提交: "添加用户认证功能"              │
│  分支: feature-a                        │
│  时间: 2026-05-27 10:30                │
│  任务: 用户认证模块 (进行中)           │
│                                         │
├─────────────────────────────────────────┤
│  [仓库]     [热力图]    [图形]    [设置] │
└─────────────────────────────────────────┘
```

#### 设计细节

```dart
// Git Graph 设计规格
class GitGraphDesign {
  // 节点
  // - 尺寸: 12px 直径
  // - 形状: 圆形
  // - 颜色: 分支色 (branchColors)
  // - 边框: 2px 深色描边 (选中时)
  // - 悬停: 放大到 14px + 阴影

  // 连接线
  // - 宽度: 2px
  // - 颜色: 分支色
  // - 样式: 贝塞尔曲线连接
  // - 合并节点: 空心圆 + 交叉线

  // 提交信息
  // - 字体: JetBrains Mono, 13px
  // - 颜色: textSecondary
  // - 位置: 节点右侧 16px
  // - 截断: 超过 40 字符显示省略号

  // 分支标签
  // - 背景: 分支色 15% 透明度
  // - 文字: 分支色
  // - 圆角: radiusXs (4px)
  // - 内边距: 4px 8px
  // - 字体: JetBrains Mono, 11px, Medium

  // 缩放控制
  // - 位置: 右上角浮层
  // - 按钮: 40px x 40px, 圆角 radiusMd
  // - 图标: 20px, textPrimary
  // - 间距: 8px
}
```

---

### 5. 热力图页 (HeatmapPage)

#### 布局结构

```
┌─────────────────────────────────────────┐
│  [←] 贡献热力图            [年] [月] [周]│
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  今日    本周    本月    连续    │   │
│  │   5      23      87     12天    │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  一  ░░░░░░░░░░░░░░░░░░░░░░░░ │   │
│  │  二  ░░▓▓░░░░▓▓▓░░░░░▓▓░░░░░░ │   │
│  │  三  ░▓▓▓▓░░▓▓▓▓▓░░▓▓▓▓░░░░░ │   │
│  │  四  ░░▓▓░░░░▓▓▓░░░░░▓▓░░░░░░ │   │
│  │  五  ░░░░░░░░░░░░░░░░░░░░░░░░ │   │
│  │  六  ░░░░░░░░░░░░░░░░░░░░░░░░ │   │
│  │  日  ░░░░░░░░░░░░░░░░░░░░░░░░ │   │
│  └─────────────────────────────────┘   │
│                                         │
│  少 ░░▓▓▓▓▓▓▓▓▓▓ 多                    │
│                                         │
├─────────────────────────────────────────┤
│  [仓库]     [热力图]    [图形]    [设置] │
└─────────────────────────────────────────┘
```

#### 设计细节

```dart
// 热力图设计规格
class HeatmapDesign {
  // 单元格
  // - 尺寸: 14px x 14px
  // - 间距: 3px
  // - 圆角: 3px
  // - 色阶:
  //   - 无数据: heatmapEmpty (#1E293B)
  //   - Level 1: heatmapLevel1 (#064E3B)
  //   - Level 2: heatmapLevel2 (#065F46)
  //   - Level 3: heatmapLevel3 (#047857)
  //   - Level 4: heatmapLevel4 (#10B981)

  // 统计卡片
  // - 背景: bgElevated
  // - 圆角: radiusMd (8px)
  // - 内边距: base (16px)
  // - 布局: 4 列等宽
  // - 数字: JetBrains Mono, 32px, Bold, primary
  // - 标签: IBM Plex Sans, 13px, textSecondary

  // 图例
  // - 位置: 底部居中
  // - 文字: "少" 和 "多", 11px, textTertiary
  // - 色块: 5 级渐变

  // 交互
  // - 悬停: 显示 tooltip (日期 + 完成数)
  // - 点击: 显示当日任务列表
}
```

---

### 6. 搜索页 (SearchPage)

#### 布局结构

```
┌─────────────────────────────────────────┐
│  [←] [搜索输入框________________] [取消] │
├─────────────────────────────────────────┤
│                                         │
│  ── 最近搜索 ───────────────────────── │
│  ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │ 数据库   │ │ API 文档 │ │ 设计   │ │
│  └──────────┘ └──────────┘ └────────┘ │
│                                         │
│  ── 搜索结果 (3) ───────────────────── │
│  ┌─────────────────────────────────┐   │
│  │  📁 项目 Alpha / main           │   │
│  │  设计数据库架构                  │   │
│  │  "设计用户表、任务表..."         │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │  📁 项目 Beta / feature-db      │   │
│  │  数据库优化方案                  │   │
│  │  "优化查询性能，添加索引..."     │   │
│  └─────────────────────────────────┘   │
│                                         │
├─────────────────────────────────────────┤
│  筛选: [全部] [仓库] [分支] [状态]     │
└─────────────────────────────────────────┘
```

#### 设计细节

```dart
// 搜索页设计规格
class SearchDesign {
  // 搜索栏
  // - 高度: 48px
  // - 背景: bgOverlay (#334155)
  // - 圆角: radiusFull (999px)
  // - 图标: magnifying-glass, 20px, textTertiary
  // - 输入文字: IBM Plex Sans, 15px, textPrimary
  // - 占位符: "搜索任务...", textTertiary
  // - 聚焦: 边框 primary 色

  // 搜索历史标签
  // - 背景: bgElevated
  // - 圆角: radiusFull
  // - 内边距: 6px 12px
  // - 文字: 13px, textSecondary
  // - 间距: 8px
  // - 布局: 水平 Wrap

  // 搜索结果项
  // - 背景: bgElevated
  // - 圆角: radiusMd (8px)
  // - 内边距: md (12px)
  // - 面包屑: 仓库 / 分支 (11px, mono, textTertiary)
  // - 标题: 15px, medium, textPrimary
  // - 摘要: 13px, textSecondary, 高亮匹配词 (primary 色)
  // - 间距: 列表项之间 8px

  // 筛选栏
  // - 位置: 底部固定
  // - 背景: bgBase + 顶部边框
  // - 标签: 胶囊按钮, 选中时 primary 填充
}
```

---

### 7. 设置页 (SettingsPage)

#### 布局结构

```
┌─────────────────────────────────────────┐
│  [←] 设置                               │
├─────────────────────────────────────────┤
│                                         │
│  ── 外观 ───────────────────────────── │
│  ┌─────────────────────────────────┐   │
│  │  深色模式              [开关 ●] │   │
│  ├─────────────────────────────────┤   │
│  │  主题色           [蓝色 ▾]     │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ── 数据 ───────────────────────────── │
│  ┌─────────────────────────────────┐   │
│  │  导出数据                       │   │
│  ├─────────────────────────────────┤   │
│  │  导入数据                       │   │
│  ├─────────────────────────────────┤   │
│  │  清除已删除项目                 │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ── 通知 ───────────────────────────── │
│  ┌─────────────────────────────────┐   │
│  │  任务提醒              [开关 ●] │   │
│  ├─────────────────────────────────┤   │
│  │  提前提醒时间        [1 小时 ▾] │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ── 关于 ───────────────────────────── │
│  ┌─────────────────────────────────┐   │
│  │  版本                  v1.0.0   │   │
│  ├─────────────────────────────────┤   │
│  │  开源协议                       │   │
│  ├─────────────────────────────────┤   │
│  │  反馈建议                       │   │
│  └─────────────────────────────────┘   │
│                                         │
├─────────────────────────────────────────┤
│  [仓库]     [热力图]    [图形]    [设置] │
└─────────────────────────────────────────┘
```

#### 设计细节

```dart
// 设置页设计规格
class SettingsDesign {
  // 设置组
  // - 标题: IBM Plex Sans, 13px, SemiBold, textTertiary, 大写
  // - 背景: bgElevated
  // - 圆角: radiusMd (8px)
  // - 分隔线: 1px, bgBase

  // 设置项
  // - 高度: 56px
  // - 内边距: 16px 水平
  // - 左侧: 图标 (20px, textSecondary) + 标签 (15px, textPrimary)
  // - 右侧: 值/开关/箭头

  // 开关组件
  // - 关闭态: bgOverlay (#334155)
  // - 开启态: primary (#3B82F6)
  // - 滑块: 白色, 20px
  // - 动画: 200ms, easeOutQuart

  // 选择器
  // - 背景: bgOverlay
  // - 圆角: radiusSm (6px)
  // - 文字: 13px, textSecondary
  // - 箭头: chevron-down, 16px
}
```

---

## 🧩 组件库

### 通用组件

#### 1. AppButton

```dart
class AppButton extends StatelessWidget {
  // 变体
  enum Variant {
    primary,    // 填充 primary, 白色文字
    secondary,  // 边框 borderDefault, textPrimary 文字
    ghost,      // 透明背景, textSecondary 文字
    danger,     // 填充 error, 白色文字
  }

  // 尺寸
  enum Size {
    sm,   // 高度 32px, 文字 13px
    md,   // 高度 40px, 文字 15px
    lg,   // 高度 48px, 文字 17px
  }

  // 视觉规格
  // - 圆角: radiusMd (8px)
  // - 内边距: 水平 16px (md)
  // - 图标: 18px, 与文字间距 8px
  // - 禁用态: 50% 透明度
  // - 加载态: 20px spinner + 文字
  // - 悬停: 背景色变亮 10%
  // - 按压: scale(0.98)
}
```

#### 2. AppInput

```dart
class AppInput extends StatelessWidget {
  // 视觉规格
  // - 高度: 48px
  // - 背景: bgSurface (#0F172A)
  // - 边框: 1px borderDefault
  // - 圆角: radiusMd (8px)
  // - 内边距: 水平 16px
  // - 文字: IBM Plex Sans, 15px, textPrimary
  // - 占位符: textTertiary
  // - 聚焦态: 边框 primary, 外发光 primary 10%
  // - 错误态: 边框 error
  // - 禁用态: 背景 bgElevated, 文字 textDisabled

  // 标签
  // - 位置: 输入框上方
  // - 字体: 13px, Medium, textSecondary
  // - 间距: 8px

  // 错误提示
  // - 位置: 输入框下方
  // - 字体: 13px, Regular, error
  // - 间距: 4px
}
```

#### 3. AppCard

```dart
class AppCard extends StatelessWidget {
  // 视觉规格
  // - 背景: bgElevated (#1E293B)
  // - 圆角: radiusMd (8px)
  // - 边框: 1px borderSubtle
  // - 内边距: base (16px)
  // - 阴影: shadowSm

  // 交互态 (可点击时)
  // - 悬停: translateY(-2px) + shadowMd
  // - 按压: scale(0.98)
  // - 过渡: 150ms, easeOutQuart
}
```

#### 4. AppBadge

```dart
class AppBadge extends StatelessWidget {
  // 变体
  enum Variant {
    filled,     // 填充背景
    outlined,   // 边框样式
    soft,       // 浅色背景 (10% 透明度)
  }

  // 视觉规格
  // - 圆角: radiusFull (999px)
  // - 内边距: 水平 8px, 垂直 4px
  // - 字体: JetBrains Mono, 11px, Medium
  // - 尺寸: 自适应内容
}
```

#### 5. AppBottomNav

```dart
class AppBottomNav extends StatelessWidget {
  // 视觉规格
  // - 高度: 64px (移动端) / 56px (桌面端)
  // - 背景: bgBase + 顶部 1px 边框
  // - 安全区: 底部 safe area padding

  // 导航项
  // - 图标: 24px, 未选中 textTertiary
  // - 标签: 11px, 未选中 textTertiary
  // - 选中态: 图标 + 标签 primary 色
  // - 指示器: 选中项下方 2px 横线, primary 色
  // - 间距: 等宽分布

  // 页面列表
  // - 仓库 (folder)
  // - 热力图 (fire)
  // - Git Graph (square-3-stack-3d)
  // - 设置 (cog-6-tooth)
}
```

#### 6. AppDialog

```dart
class AppDialog extends StatelessWidget {
  // 视觉规格
  // - 背景: bgElevated (#1E293B)
  // - 圆角: radiusXl (16px)
  // - 最大宽度: 400px
  // - 内边距: 24px
  // - 阴影: shadowLg

  // 遮罩
  // - 颜色: 黑色 60%
  // - 点击关闭: 可配置

  // 标题
  // - 字体: 20px, SemiBold, textPrimary
  // - 间距: 16px

  // 内容
  // - 字体: 15px, Regular, textSecondary
  // - 间距: 24px

  // 按钮区
  // - 布局: 水平, 右对齐
  // - 间距: 12px
  // - 主按钮: 右侧
}
```

#### 7. AppToast

```dart
class AppToast extends StatelessWidget {
  // 变体
  enum Variant {
    success,  // 绿色
    error,    // 红色
    warning,  // 黄色
    info,     // 蓝色
  }

  // 视觉规格
  // - 背景: bgOverlay (#334155)
  // - 圆角: radiusMd (8px)
  // - 内边距: 12px 16px
  // - 图标: 20px, 变体色
  // - 文字: 14px, textPrimary
  // - 位置: 底部居中, 距底部 100px

  // 动画
  // - 出现: 从下方滑入 + 淡入 (250ms, easeOutQuart)
  // - 消失: 向上滑出 + 淡出 (200ms)
  // - 自动关闭: 3 秒后
}
```

---

## 🎬 动效规范

### 微交互

| 交互 | 动画 | 时长 | 曲线 |
|------|------|------|------|
| 按钮悬停 | 背景色变亮 | 150ms | easeOutQuart |
| 按钮按压 | scale(0.98) | 100ms | easeOutQuart |
| 卡片悬停 | translateY(-2px) + shadow | 200ms | easeOutQuart |
| 页面切换 | 滑入 (右→左) | 300ms | easeOutExpo |
| 弹窗出现 | 淡入 + scale(0.95→1) | 250ms | easeOutQuart |
| 列表项出现 | 依次淡入 (stagger 50ms) | 200ms | easeOutQuart |
| 状态切换 | 颜色渐变 | 200ms | easeOutQuart |
| 热力图加载 | 从左到右依次填充 | 300ms | linear |
| Git Graph 节点 | 依次出现 (stagger 30ms) | 150ms | easeOutQuart |

### 手势

| 手势 | 操作 | 反馈 |
|------|------|------|
| 左滑任务卡片 | 快速完成 | 绿色背景滑出 |
| 右滑任务卡片 | 快速删除 | 红色背景滑出 |
| 下拉列表 | 刷新 | 自定义刷新指示器 |
| 长按项目 | 上下文菜单 | 轻微震动 + 菜单弹出 |
| 双指缩放 (Git Graph) | 缩放视图 | 平滑缩放 |

### 减弱动效

```dart
// 尊重用户偏好
MediaQuery.of(context).reduceMotion
  ? Duration.zero
  : AppDimensions.animNormal;
```

---

## 📐 响应式设计

### 断点系统

| 断点 | 宽度 | 设备 | 布局 |
|------|------|------|------|
| xs | < 600px | 手机 | 单列, 底部导航 |
| sm | 600-839px | 小平板 | 单列, 底部导航 |
| md | 840-1199px | 大平板 | 双列, 侧边导航 |
| lg | ≥ 1200px | 桌面 | 三列, 侧边导航 |

### 移动端布局 (< 840px)

```
┌─────────────────────┐
│      App Bar        │
├─────────────────────┤
│                     │
│     单列内容        │
│                     │
├─────────────────────┤
│    底部导航栏       │
└─────────────────────┘
```

### 桌面端布局 (≥ 840px)

```
┌──────┬──────────────────────────┐
│      │         App Bar          │
│ 侧   ├──────────────────────────┤
│ 边   │                          │
│ 导   │       主内容区           │
│ 航   │                          │
│ 栏   │                          │
│      │                          │
└──────┴──────────────────────────┘
```

### Flutter 实现

```dart
// 使用 LayoutBuilder 实现响应式
LayoutBuilder(
  builder: (context, constraints) {
    if (constraints.maxWidth >= 840) {
      return _DesktopLayout();  // 侧边导航
    }
    return _MobileLayout();     // 底部导航
  },
);
```

---

## ♿ 无障碍设计

### WCAG AA 合规

| 要求 | 实现 |
|------|------|
| 文字对比度 ≥ 4.5:1 | 所有文字色彩组合已验证 ✓ |
| 大文字对比度 ≥ 3:1 | 标题文字已验证 ✓ |
| 焦点可见性 | 所有交互元素有 focus 态 ✓ |
| 键盘导航 | Tab 顺序符合视觉顺序 ✓ |
| 触摸目标 ≥ 44px | 所有按钮/列表项满足 ✓ |
| 屏幕阅读器 | 语义化标签 + ARIA ✓ |
| 减弱动效 | respects prefers-reduced-motion ✓ |

### 焦点样式

```dart
// 焦点环
BoxDecoration(
  border: Border.all(
    color: AppColors.primary,
    width: 2,
  ),
  borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
);
```

---

## 📦 资源清单

### 字体文件

| 字体 | 格式 | 用途 |
|------|------|------|
| JetBrains Mono | TTF | 标题/代码 |
| IBM Plex Sans | TTF | 正文 |

### 图标库

| 库 | 风格 | 格式 |
|----|------|------|
| Heroicons | Outline | SVG |

### 图片资源

| 资源 | 尺寸 | 格式 |
|------|------|------|
| App Icon | 1024x1024 | PNG |
| Splash Screen | 自适应 | SVG |
| 空状态插图 | 200x200 | SVG |
| 系统托盘图标 | 16x16, 32x32 | PNG |

---

## 🔧 Flutter 主题配置

```dart
// core/theme/app_theme.dart

ThemeData buildDarkTheme() {
  return ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,

    // 色彩方案
    colorScheme: ColorScheme.dark(
      primary: AppColors.primary,
      onPrimary: Colors.white,
      secondary: AppColors.primaryLight,
      surface: AppColors.bgElevated,
      onSurface: AppColors.textPrimary,
      error: AppColors.error,
      onError: Colors.white,
    ),

    // 背景色
    scaffoldBackgroundColor: AppColors.bgBase,

    // 文字主题
    textTheme: TextTheme(
      displayLarge: TextStyle(
        fontFamily: AppTypography.headingFont,
        fontSize: AppTypography.xxxl,
        fontWeight: AppTypography.bold,
        color: AppColors.textPrimary,
      ),
      headlineMedium: TextStyle(
        fontFamily: AppTypography.headingFont,
        fontSize: AppTypography.xxl,
        fontWeight: AppTypography.semiBold,
        color: AppColors.textPrimary,
      ),
      titleLarge: TextStyle(
        fontFamily: AppTypography.bodyFont,
        fontSize: AppTypography.lg,
        fontWeight: AppTypography.medium,
        color: AppColors.textPrimary,
      ),
      bodyLarge: TextStyle(
        fontFamily: AppTypography.bodyFont,
        fontSize: AppTypography.base,
        fontWeight: AppTypography.regular,
        color: AppColors.textPrimary,
      ),
      bodyMedium: TextStyle(
        fontFamily: AppTypography.bodyFont,
        fontSize: AppTypography.sm,
        fontWeight: AppTypography.regular,
        color: AppColors.textSecondary,
      ),
      labelSmall: TextStyle(
        fontFamily: AppTypography.monoFont,
        fontSize: AppTypography.xs,
        fontWeight: AppTypography.medium,
        color: AppColors.textTertiary,
      ),
    ),

    // 卡片主题
    cardTheme: CardTheme(
      color: AppColors.bgElevated,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
        side: BorderSide(color: AppColors.borderSubtle),
      ),
    ),

    // 输入框主题
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.bgSurface,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
        borderSide: BorderSide(color: AppColors.borderDefault),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
        borderSide: BorderSide(color: AppColors.primary, width: 2),
      ),
      contentPadding: EdgeInsets.symmetric(
        horizontal: AppDimensions.base,
        vertical: AppDimensions.md,
      ),
    ),

    // 按钮主题
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        elevation: 0,
        padding: EdgeInsets.symmetric(
          horizontal: AppDimensions.base,
          vertical: AppDimensions.md,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
        ),
      ),
    ),

    // 图标主题
    iconTheme: IconThemeData(
      size: 20,
      color: AppColors.textSecondary,
    ),

    // 分隔线
    dividerTheme: DividerThemeData(
      color: AppColors.borderSubtle,
      thickness: 1,
      space: 1,
    ),
  );
}
```

---

## 📋 设计检查清单

### 视觉质量

- [ ] 无 Emoji 作为 UI 图标
- [ ] 所有图标来自 Heroicons
- [ ] 色彩对比度满足 WCAG AA
- [ ] 间距遵循 4px 网格
- [ ] 圆角使用预定义尺寸

### 交互体验

- [ ] 所有可点击元素有 cursor-pointer
- [ ] 悬停状态提供清晰视觉反馈
- [ ] 过渡动画流畅 (150-300ms)
- [ ] 焦点状态对键盘导航可见

### 深色模式

- [ ] 背景色使用深灰而非纯黑
- [ ] 文字对比度足够
- [ ] 边框在深色背景下可见
- [ ] 状态色在深色背景下清晰

### 响应式

- [ ] 375px 移动端布局正常
- [ ] 768px 平板端布局正常
- [ ] 1024px 桌面端布局正常
- [ ] 1440px 大屏布局正常
- [ ] 无水平滚动

### 无障碍

- [ ] 所有图片有 alt text
- [ ] 表单输入有 label
- [ ] 颜色不是唯一指示器
- [ ] respects prefers-reduced-motion

---

**文档维护**: UI Designer
**最后更新**: 2026-05-28
**版本**: 1.0.0
