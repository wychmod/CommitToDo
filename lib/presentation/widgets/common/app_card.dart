import 'package:flutter/material.dart';

import '../../../core/theme/app_theme_colors.dart';
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
    this.semanticLabel,
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
    this.semanticLabel,
    this.margin,
    this.lifted = false,
  })  : padding = const EdgeInsets.all(AppDimensions.md),
        radius = AppDimensions.radiusLg;

  const AppCard.repository({
    super.key,
    required this.child,
    this.onTap,
    this.onLongPress,
    this.semanticLabel,
    this.margin,
    this.lifted = false,
  })  : padding = const EdgeInsets.all(AppDimensions.md),
        radius = AppDimensions.radiusLg;

  const AppCard.feature({
    super.key,
    required this.child,
    this.onTap,
    this.onLongPress,
    this.semanticLabel,
    this.margin,
    this.lifted = false,
  })  : padding = const EdgeInsets.all(AppDimensions.lg),
        radius = AppDimensions.radiusLg;

  final Widget child;
  final VoidCallback? onTap;
  final VoidCallback? onLongPress;

  /// 语义标签，传入时作为 [Semantics.label] 包裹卡片。
  final String? semanticLabel;

  /// 内边距。task/repository 卡 16，feature 卡 24。
  final EdgeInsetsGeometry padding;
  final EdgeInsetsGeometry? margin;

  /// 是否提升到 surface2 + hairlineStrong（hover/选中态）。
  final bool lifted;

  /// 圆角，默认 radiusLg(12)。
  final double radius;

  @override
  Widget build(BuildContext context) {
    final colors = AppThemeColors.of(context);
    final color = lifted ? colors.surface2 : colors.surface1;
    final border = lifted ? colors.hairlineStrong : colors.hairline;

    // 圆角矩形容器，先画统一 hairline 边框，再在顶部叠 1px edge highlight。
    // 拆成两段避免 `Border` 四边在圆角交汇处与顶部高光混色断裂。
    final card = AnimatedContainer(
      duration: AppDimensions.animFast,
      curve: AppDimensions.easeOutQuart,
      margin: margin,
      padding: padding,
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(radius),
        border: Border.all(color: border, width: 1),
      ),
      child: child,
    );

    final withHighlight = Stack(
      children: [
        card,
        Positioned(
          left: 1,
          right: 1,
          top: 0,
          height: 1,
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: colors.edgeHighlight,
              borderRadius: BorderRadius.only(
                topLeft: Radius.circular(radius - 1),
                topRight: Radius.circular(radius - 1),
              ),
            ),
          ),
        ),
      ],
    );

    if (onTap != null || onLongPress != null) {
      return Semantics(
        button: true,
        label: semanticLabel,
        child: InkWell(
          onTap: onTap,
          onLongPress: onLongPress,
          borderRadius: BorderRadius.circular(radius),
          child: withHighlight,
        ),
      );
    }

    return withHighlight;
  }
}
