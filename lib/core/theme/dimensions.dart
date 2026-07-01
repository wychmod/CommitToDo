import 'package:flutter/widgets.dart';

import 'colors.dart';

/// 间距与尺寸常量
///
/// 对齐 `docs/DESIGN.md` §4 / §6。
/// - 间距 base unit = 4px
/// - 圆角：CTA 用 `radiusMd`(8)，卡片用 `radiusLg`(12)，CTA 绝不 pill
/// - 深色面靠 surface ladder + hairline 承层级，几乎不用投影（见阴影策略）
class AppDimensions {
  AppDimensions._();

  // ─── 基础间距（4px 网格，DESIGN.md §4.1）───
  static const double xxs = 4.0;
  static const double xs = 8.0;
  static const double sm = 12.0;
  static const double md = 16.0;
  static const double lg = 24.0;
  static const double xl = 32.0;
  static const double xxl = 48.0;
  static const double section = 96.0;

  @Deprecated('Use AppDimensions.md instead.')
  static const double base = md;

  /// 2px 微间距（hairline gap、热力图格子 gap 等小于 4 的场景）。
  static const double micro = 2.0;

  // ─── 触摸高度（DESIGN.md §9.2）───
  static const double tapTargetMin = 44.0;
  static const double navItemHeight = 48.0;
  static const double ctaHeightSm = 32.0;
  static const double ctaHeight = 40.0;
  static const double ctaHeightLg = 48.0;
  static const double ctaPaddingHorizontal = 14.0;
  static const double sideNavWidth = 200.0;
  static const double contentMaxWidth = 1280.0;
  static const double desktopXlBreakpoint = 1440.0;
  static const double desktopBreakpoint = 1280.0;
  static const double tabletBreakpoint = 1024.0;
  static const double mobileBreakpoint = 768.0;

  // ─── 圆角（DESIGN.md §6.1）───
  static const double radiusXs = 4.0; // 小 chip、status badge、热力图格子
  static const double radiusSm = 6.0; // inline tag、commit hash chip
  static const double radiusMd = 8.0; // 所有按钮、表单输入
  static const double radiusLg = 12.0; // 任务卡、仓库卡、feature 卡
  static const double radiusXl = 16.0; // 大面板、Git Graph 容器、模态
  static const double radiusXxl = 24.0; // 空状态、CTA banner
  static const double radiusPill = 999.0; // status pill、tab toggle
  static const double radiusFull = 999.0; // 头像、圆形图标容器

  // ─── 图标与数据可视化尺寸 ───
  static const double iconXs = 12.0;
  static const double iconSm = 16.0;
  static const double iconMd = 20.0;
  static const double iconNav = 24.0;
  static const double priorityStripWidth = 3.0;
  static const double dotSm = 6.0;
  static const double dotMd = 8.0;
  static const double graphControlSize = 36.0;
  static const double repositoryIconBox = 40.0;

  // ─── 阴影（深色模式策略，DESIGN.md §5）───
  // 深色面靠 surface ladder + hairline 承层级，几乎不用投影。
  // 仅浅色模式允许轻微投影（shadowSm）。
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

  // ─── 顶部边缘微高光（DESIGN.md §5.1）───
  /// 浮起面板顶部 1px 半透明白线，给深色面「像素级渲染」质感。
  ///
  /// 用 gradient 绘制顶部高光，避免 `Border` 四边在圆角交汇处混色断裂：
  /// 仅顶部 1px 高的区域叠一层 6% 白，圆角处自然过渡。
  static LinearGradient topEdgeHighlightGradient() => const LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [AppColors.edgeHighlight, Color(0x00FFFFFF)],
        stops: [0.0, 0.0],
      );

  /// 带顶部微高光的卡片 BoxDecoration 边框组合。
  static Border cardBorder({Color? color}) => Border(
        top: BorderSide(color: color ?? AppColors.hairline, width: 1),
        left: BorderSide(color: color ?? AppColors.hairline, width: 1),
        right: BorderSide(color: color ?? AppColors.hairline, width: 1),
        bottom: BorderSide(color: color ?? AppColors.hairline, width: 1),
      );
}
