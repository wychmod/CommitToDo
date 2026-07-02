import 'package:flutter/material.dart';

import '../../../core/theme/app_icons.dart';
import '../../../core/theme/app_theme_colors.dart';
import '../../../core/theme/colors.dart';
import '../../../core/theme/dimensions.dart';
import '../../../core/theme/typography.dart';
import '../../../domain/entities/branch.dart';

/// 分支指示器
///
/// 对齐 `docs/DESIGN.md` §7.6。
/// - 分支色环取色 + mono 分支名。
/// - git-branch 图标 + 分支色圆点 + 等宽分支名。
/// - radiusSm chip、padding 4/8、底 surface2 @ 50%。
class BranchIndicator extends StatelessWidget {
  const BranchIndicator({
    super.key,
    required this.branch,
    this.colorIndex = 0,
    this.isActive = false,
    this.onTap,
  });

  final Branch branch;

  /// 分支色环索引（按 branch index % 7 取色）。
  final int colorIndex;
  final bool isActive;
  final VoidCallback? onTap;

  Color get _branchColor => AppColors.branchColor(colorIndex);

  @override
  Widget build(BuildContext context) {
    final colors = AppThemeColors.of(context);
    return Semantics(
      button: onTap != null,
      selected: isActive,
      label: branch.isMain ? '${branch.name} 主分支' : branch.name,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppDimensions.radiusSm),
        child: Container(
          padding: const EdgeInsets.symmetric(
            horizontal: AppDimensions.xs,
            vertical: AppDimensions.micro,
          ),
          decoration: BoxDecoration(
            color: isActive
                ? AppColors.primary.withAlpha(31)
                : colors.surface2.withAlpha(128),
            borderRadius: BorderRadius.circular(AppDimensions.radiusSm),
            border: Border.all(
              color: isActive
                  ? AppColors.primary
                  : colors.hairlineStrong,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              AppIcon(
                AppIcons.gitBranch,
                size: AppDimensions.iconSm,
                color: isActive ? AppColors.primary : colors.inkMuted,
              ),
              const SizedBox(width: AppDimensions.xxs),
              Container(
                width: AppDimensions.dotSm,
                height: AppDimensions.dotSm,
                decoration: BoxDecoration(
                  color: _branchColor,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: AppDimensions.xxs),
              Text(
                branch.name,
                style: AppTypography.monoStyle.copyWith(
                  fontSize: AppTypography.monoSm,
                  color: isActive ? AppColors.primary : colors.ink,
                  fontWeight: isActive
                      ? AppTypography.medium
                      : AppTypography.regular,
                ),
              ),
              if (branch.isMain) ...[
                const SizedBox(width: AppDimensions.xxs),
                const AppIcon(
                  AppIcons.star,
                  size: AppDimensions.iconXs,
                  color: AppColors.warning,
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
