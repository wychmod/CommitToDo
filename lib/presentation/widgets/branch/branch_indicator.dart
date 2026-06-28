import 'package:flutter/material.dart';

import '../../../core/theme/app_icons.dart';
import '../../../core/theme/colors.dart';
import '../../../core/theme/dimensions.dart';
import '../../../core/theme/typography.dart';
import '../../../domain/entities/branch.dart';

/// 分支指示器
class BranchIndicator extends StatelessWidget {
  const BranchIndicator({
    super.key,
    required this.branch,
    this.isActive = false,
    this.onTap,
  });

  final Branch branch;
  final bool isActive;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: onTap != null,
      selected: isActive,
      label: branch.isMain ? '${branch.name} 主分支' : branch.name,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppDimensions.radiusSm),
        child: Container(
          padding: const EdgeInsets.symmetric(
            horizontal: AppDimensions.sm,
            vertical: AppDimensions.xs,
          ),
          decoration: BoxDecoration(
            color: isActive
                ? AppColors.primary.withAlpha(26)
                : AppColors.bgElevated,
            borderRadius: BorderRadius.circular(AppDimensions.radiusSm),
            border: Border.all(
              color: isActive
                  ? AppColors.primary
                  : AppColors.borderSubtle,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              AppIcon(
                AppIcons.fork,
                size: 14,
                color: isActive
                    ? AppColors.primary
                    : AppColors.textTertiary,
              ),
              const SizedBox(width: AppDimensions.xs),
              Text(
                branch.name,
                style: TextStyle(
                  fontFamily: AppTypography.monoFont,
                  fontSize: AppTypography.sm,
                  fontWeight: isActive
                      ? AppTypography.medium
                      : AppTypography.regular,
                  color: isActive
                      ? AppColors.primary
                      : AppColors.textSecondary,
                ),
              ),
              if (branch.isMain) ...[
                const SizedBox(width: AppDimensions.xs),
                const AppIcon(
                  AppIcons.star,
                  size: 12,
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
