import 'package:flutter/material.dart';

import '../../../core/theme/colors.dart';
import '../../../core/theme/dimensions.dart';
import '../../../core/theme/typography.dart';

/// 徽章变体
enum BadgeVariant {
  filled,
  outlined,
  soft,
}

/// 通用徽章
class AppBadge extends StatelessWidget {
  const AppBadge({
    super.key,
    required this.label,
    this.color = AppColors.primary,
    this.variant = BadgeVariant.soft,
    this.fontSize = AppTypography.xs,
  });

  final String label;
  final Color color;
  final BadgeVariant variant;
  final double fontSize;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppDimensions.sm,
        vertical: AppDimensions.xxs,
      ),
      decoration: BoxDecoration(
        color: variant == BadgeVariant.filled
            ? color
            : variant == BadgeVariant.soft
                ? color.withAlpha(26)
                : Colors.transparent,
        borderRadius: BorderRadius.circular(
          AppDimensions.radiusFull,
        ),
        border: variant == BadgeVariant.outlined
            ? Border.all(color: color)
            : null,
      ),
      child: Text(
        label,
        style: TextStyle(
          fontFamily: AppTypography.monoFont,
          fontSize: fontSize,
          fontWeight: AppTypography.medium,
          color: variant == BadgeVariant.filled
              ? AppColors.textPrimary
              : color,
        ),
      ),
    );
  }
}
