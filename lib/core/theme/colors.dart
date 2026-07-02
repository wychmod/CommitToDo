import 'dart:ui';

/// 应用颜色常量
///
/// 对齐 `docs/DESIGN.md` §2。深色模式为系统主模式。
///
/// 命名约定：DESIGN.md 的 ladder 语义名为 `canvas / surface1..4 / hairline* / ink*`；
/// 旧别名（`bgBase / bgElevated / textPrimary` 等）保留兼容，指向同一色值。
class AppColors {
  AppColors._();

  // ─── 基础色板（DESIGN.md §2.1）───
  /// 主 accent——主 CTA、品牌标识、focus ring、链接强调。
  static const Color primary = Color(0xFF3B82F6);

  /// 主 CTA 悬停态（更亮）。
  static const Color primaryHover = Color(0xFF60A5FA);

  /// 主色浅变体，等价于 primaryHover。
  static const Color primaryLight = Color(0xFF60A5FA);

  /// pressed 深态。
  static const Color primaryDark = Color(0xFF1D4ED8);

  // ─── Accent 扩展（DESIGN.md §2.1）───
  /// focus ring tint、按钮按下态。
  static const Color primaryFocus = Color(0xFF2563EB);

  /// 主 CTA 上的文字色。
  static const Color onPrimary = Color(0xFFFFFFFF);

  /// 展示面克制渐变（#3B82F6 → #8B5CF6）。仅用于空状态/标题装饰/设置页头部。
  static const List<Color> primaryGradient = [
    Color(0xFF3B82F6),
    Color(0xFF8B5CF6),
  ];

  // ─── Surface Ladder（深色，四阶，DESIGN.md §2.2）───
  /// 系统锚定面，默认页面背景。
  static const Color canvas = Color(0xFF0F172A);

  /// 默认卡片、面板、列表项底。
  static const Color surface1 = Color(0xFF1E293B);

  /// 高亮卡片、hover 卡片、status badge 底、选中态。
  static const Color surface2 = Color(0xFF334155);

  /// 子导航、下拉菜单、popover。
  static const Color surface3 = Color(0xFF475569);

  /// surface-3 更深一阶，极少使用。
  static const Color surface4 = Color(0xFF64748B);

  // ─── Hairline Borders（DESIGN.md §2.3）───
  /// 卡片、分隔线默认 1px 边框。
  static const Color hairline = Color(0xFF1E293B);

  /// 输入框边框、强化分隔。
  static const Color hairlineStrong = Color(0xFF334155);

  /// 嵌套面三级边框。
  static const Color hairlineTertiary = Color(0xFF475569);

  // ─── Text（DESIGN.md §2.4）───
  /// 所有标题、强调正文。
  static const Color ink = Color(0xFFF1F5F9);

  /// 次要正文、meta。
  static const Color inkMuted = Color(0xFF94A3B8);

  /// 三级文字、未选中态、footer。
  static const Color inkSubtle = Color(0xFF64748B);

  /// 四级、disabled、脚注。
  static const Color inkTertiary = Color(0xFF475569);

  // ─── Inverse（浅色面，DESIGN.md §2.10）───
  static const Color inverseCanvas = Color(0xFFFFFFFF);
  static const Color inverseInk = Color(0xFF0F172A);

  // ─── Light Mode（可选，DESIGN.md §9.4）───
  static const Color lightCanvas = Color(0xFFF8FAFC);
  static const Color lightSurface1 = Color(0xFFFFFFFF);
  static const Color lightSurface2 = Color(0xFFF1F5F9);
  static const Color lightSurface3 = Color(0xFFE2E8F0);

  /// 浅色模式 surface-4，对应深色 `surface4` 位置。
  static const Color lightSurface4 = Color(0xFFCBD5E1);

  static const Color lightHairline = Color(0xFFE2E8F0);
  static const Color lightHairlineStrong = Color(0xFFCBD5E1);

  /// 浅色模式三级边框，对应深色 `hairlineTertiary` 位置。
  static const Color lightHairlineTertiary = Color(0xFF94A3B8);
  static const Color lightInk = Color(0xFF0F172A);
  static const Color lightInkMuted = Color(0xFF475569);
  static const Color lightInkSubtle = Color(0xFF64748B);

  /// 浅色模式第四级文字，对应深色 `inkTertiary` 位置。
  static const Color lightInkTertiary = Color(0xFF94A3B8);

  // ─── Overlay（DESIGN.md §2.11）───
  /// 模态遮罩，50% 黑。
  static const Color overlay = Color(0x80000000);

  // ─── Decorative Depth（DESIGN.md §5.1）───
  /// 浮起面板顶部 1px 微高光，6% 白。
  static const Color edgeHighlight = Color(0x0FFFFFFF);

  // ─── 语义色（DESIGN.md §2.5）───
  static const Color success = Color(0xFF10B981);
  static const Color successLight = Color(0xFF34D399);
  static const Color warning = Color(0xFFF59E0B);
  static const Color warningLight = Color(0xFFFBBF24);
  static const Color error = Color(0xFFEF4444);
  static const Color errorLight = Color(0xFFF87171);
  static const Color info = Color(0xFF3B82F6);

  // ─── 优先级色（DESIGN.md §2.6）───
  static const Color priorityHigh = Color(0xFFEF4444);
  static const Color priorityMedium = Color(0xFFF59E0B);
  static const Color priorityLow = Color(0xFF10B981);

  // ─── 任务状态色（DESIGN.md §2.7）───
  static const Color statusTodo = Color(0xFF94A3B8);
  static const Color statusInProgress = Color(0xFF3B82F6);
  static const Color statusDone = Color(0xFF10B981);
  static const Color statusCancelled = Color(0xFF6B7280);

  // ─── 热力图色阶（DESIGN.md §2.8）───
  static const Color heatmapEmpty = Color(0xFF1E293B);
  static const Color heatmapLevel1 = Color(0xFF064E3B);
  static const Color heatmapLevel2 = Color(0xFF065F46);
  static const Color heatmapLevel3 = Color(0xFF047857);
  static const Color heatmapLevel4 = Color(0xFF10B981);

  // ─── Git Graph 分支色环（DESIGN.md §2.9，7 色循环）───
  static const List<Color> branchColors = [
    Color(0xFF3B82F6),
    Color(0xFF8B5CF6),
    Color(0xFFF59E0B),
    Color(0xFF10B981),
    Color(0xFFEC4899),
    Color(0xFF06B6D4),
    Color(0xFFF97316),
  ];

  /// 按 index 循环取分支色。
  static Color branchColor(int index) =>
      branchColors[index % branchColors.length];

  // ════════════════════════════════════════════════════════════════
  // 旧别名兼容层（指向同一色值，逐步迁移后可移除）
  // ════════════════════════════════════════════════════════════════

  // ─── 深色背景系统（旧）───
  @Deprecated('Use AppColors.canvas instead.')
  static const Color bgBase = canvas;

  @Deprecated('Use AppColors.surface1 instead.')
  static const Color bgElevated = surface1;

  @Deprecated('Use AppColors.surface2 instead.')
  static const Color bgOverlay = surface2;

  @Deprecated('Use AppColors.surface1 instead.')
  static const Color bgSurface = surface1;

  // ─── 文字色（旧）───
  @Deprecated('Use AppColors.ink instead.')
  static const Color textPrimary = ink;

  @Deprecated('Use AppColors.inkMuted instead.')
  static const Color textSecondary = inkMuted;

  @Deprecated('Use AppColors.inkSubtle instead.')
  static const Color textTertiary = inkSubtle;

  @Deprecated('Use AppColors.inkTertiary instead.')
  static const Color textDisabled = inkTertiary;

  // ─── 边框色（旧）───
  @Deprecated('Use AppColors.hairline instead.')
  static const Color borderSubtle = hairline;

  @Deprecated('Use AppColors.hairlineStrong instead.')
  static const Color borderDefault = hairlineStrong;

  @Deprecated('Use AppColors.primaryFocus instead.')
  static const Color borderFocus = primaryFocus;
}
