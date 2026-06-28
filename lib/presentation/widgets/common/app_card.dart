import 'package:flutter/material.dart';

import '../../../core/theme/colors.dart';
import '../../../core/theme/dimensions.dart';

/// 通用卡片
class AppCard extends StatelessWidget {
  const AppCard({
    super.key,
    required this.child,
    this.onTap,
    this.padding = const EdgeInsets.all(AppDimensions.base),
    this.margin,
    this.borderRadius,
    this.borderColor,
  });

  final Widget child;
  final VoidCallback? onTap;
  final EdgeInsetsGeometry padding;
  final EdgeInsetsGeometry? margin;
  final double? borderRadius;
  final Color? borderColor;

  @override
  Widget build(BuildContext context) {
    final card = Container(
      margin: margin,
      decoration: BoxDecoration(
        color: AppColors.bgElevated,
        borderRadius: BorderRadius.circular(
          borderRadius ?? AppDimensions.radiusMd,
        ),
        border: Border.all(
          color: borderColor ?? AppColors.borderSubtle,
        ),
      ),
      child: Padding(
        padding: padding,
        child: child,
      ),
    );

    if (onTap != null) {
      return Semantics(
        button: true,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(
            borderRadius ?? AppDimensions.radiusMd,
          ),
          child: card,
        ),
      );
    }

    return card;
  }
}
