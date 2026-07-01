import 'package:flutter/material.dart';

import '../../../core/theme/colors.dart';
import '../../../core/theme/dimensions.dart';

/// 通用卡片
///
/// 对齐 `docs/DESIGN.md` §7.3。
/// - 底 surface1、`radiusLg`(12)、1px hairline、elevation 0、顶部 edge highlight。
/// - `lifted` 时升 surface2 + hairlineStrong（hover/选中）。
class AppCard extends StatelessWidget {
  const AppCard({
    super.key,
    required this.child,
    this.onTap,
    this.onLongPress,
    this.padding = const EdgeInsets.all(AppDimensions.md),
    this.margin,
    this.lifted = false,
    this.radius = AppDimensions.radiusLg,
  });

  const AppCard.task({
    super.key,
    required this.child,
    this.onTap,
    this.onLongPress,
    this.margin,
    this.lifted = false,
  })  : padding = const EdgeInsets.all(AppDimensions.md),
        radius = AppDimensions.radiusLg;

  const AppCard.repository({
    super.key,
    required this.child,
    this.onTap,
    this.onLongPress,
    this.margin,
    this.lifted = false,
  })  : padding = const EdgeInsets.all(AppDimensions.md),
        radius = AppDimensions.radiusLg;

  const AppCard.feature({
    super.key,
    required this.child,
    this.onTap,
    this.onLongPress,
    this.margin,
    this.lifted = false,
  })  : padding = const EdgeInsets.all(AppDimensions.lg),
        radius = AppDimensions.radiusLg;

  final Widget child;
  final VoidCallback? onTap;
  final VoidCallback? onLongPress;

  /// 内边距。task/repository 卡 16，feature 卡 24。
  final EdgeInsetsGeometry padding;
  final EdgeInsetsGeometry? margin;

  /// 是否提升到 surface2 + hairlineStrong（hover/选中态）。
  final bool lifted;

  /// 圆角，默认 radiusLg(12)。
  final double radius;

  @override
  Widget build(BuildContext context) {
    final color = lifted ? AppColors.surface2 : AppColors.surface1;
    final border = lifted ? AppColors.hairlineStrong : AppColors.hairline;

    final card = AnimatedContainer(
      duration: AppDimensions.animFast,
      curve: AppDimensions.easeOutQuart,
      margin: margin,
      padding: padding,
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(radius),
        border: Border(
          top: const BorderSide(color: AppColors.edgeHighlight, width: 1),
          left: BorderSide(color: border, width: 1),
          right: BorderSide(color: border, width: 1),
          bottom: BorderSide(color: border, width: 1),
        ),
      ),
      child: child,
    );

    if (onTap != null || onLongPress != null) {
      return Semantics(
        button: true,
        child: InkWell(
          onTap: onTap,
          onLongPress: onLongPress,
          borderRadius: BorderRadius.circular(radius),
          child: card,
        ),
      );
    }

    return card;
  }
}
