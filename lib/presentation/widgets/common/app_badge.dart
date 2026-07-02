import 'package:flutter/material.dart';

import '../../../core/theme/app_theme_colors.dart';
import '../../../core/theme/colors.dart';
import '../../../core/theme/dimensions.dart';
import '../../../core/theme/typography.dart';

/// 徽章变体（DESIGN.md §7.5）
enum BadgeVariant {
  filled,
  outlined,
  soft,
}

/// 通用徽章
///
/// 对齐 `docs/DESIGN.md` §7.5。
/// - status-badge：soft = 语义色 @ 12% opacity 底 + 语义色字、monoSm、radiusPill、padding 2/8。
class AppBadge extends StatelessWidget {
  const AppBadge({
    super.key,
    required this.label,
    this.color = AppColors.primary,
    this.variant = BadgeVariant.soft,
    this.fontSize = AppTypography.monoSm,
  });

  final String label;
  final Color color;
  final BadgeVariant variant;
  final double fontSize;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppDimensions.xs,
        vertical: AppDimensions.micro,
      ),
      decoration: BoxDecoration(
        color: variant == BadgeVariant.filled
            ? color
            : variant == BadgeVariant.soft
                ? color.withAlpha(31) // 12% opacity
                : Colors.transparent,
        borderRadius: BorderRadius.circular(AppDimensions.radiusPill),
        border: variant == BadgeVariant.outlined
            ? Border.all(color: color)
            : null,
      ),
      child: Text(
        label,
        style: AppTypography.monoSmStyle.copyWith(
          fontSize: fontSize,
          color: variant == BadgeVariant.filled
              ? AppColors.onPrimary
              : color,
        ),
      ),
    );
  }
}

/// 优先级圆点（DESIGN.md §7.5）
class PriorityDot extends StatelessWidget {
  const PriorityDot({
    super.key,
    required this.color,
    this.size = 8,
  });

  final Color color;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: color,
        shape: BoxShape.circle,
      ),
    );
  }
}

/// 计数徽章（DESIGN.md §7.5）
class CountBadge extends StatelessWidget {
  const CountBadge({
    super.key,
    required this.label,
    this.color,
  });

  final String label;

  /// 文字色，默认取主题 inkMuted 以跟随浅/深模式。
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final colors = AppThemeColors.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppDimensions.xs,
        vertical: AppDimensions.micro,
      ),
      decoration: BoxDecoration(
        color: colors.surface2,
        borderRadius: BorderRadius.circular(AppDimensions.radiusPill),
      ),
      child: Text(
        label,
        style: AppTypography.monoSmStyle.copyWith(
          color: color ?? colors.inkMuted,
        ),
      ),
    );
  }
}
