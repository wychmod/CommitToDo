import 'package:flutter/material.dart';

import '../../../core/theme/app_icons.dart';
import '../../../core/extensions/date_extensions.dart';
import '../../../core/theme/colors.dart';
import '../../../core/theme/dimensions.dart';
import '../../../core/theme/typography.dart';
import '../../../domain/entities/branch.dart';
import '../../../domain/entities/repository.dart';
import '../common/app_badge.dart';

/// 仓库卡片
class RepositoryCard extends StatelessWidget {
  const RepositoryCard({
    super.key,
    required this.repository,
    this.taskCount = 0,
    this.mainBranch,
    this.onTap,
    this.onLongPress,
  });

  final Repository repository;
  final int taskCount;
  final Branch? mainBranch;
  final VoidCallback? onTap;
  final VoidCallback? onLongPress;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: onTap != null,
      label: '${repository.name}，$taskCount 个任务',
      child: InkWell(
        onTap: onTap,
        onLongPress: onLongPress,
        borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
        child: AnimatedContainer(
          duration: AppDimensions.animFast,
          curve: AppDimensions.easeOutQuart,
          padding: const EdgeInsets.all(AppDimensions.base),
          decoration: BoxDecoration(
            color: AppColors.bgElevated,
            borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
            border: Border.all(color: AppColors.borderSubtle),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: AppColors.primary.withAlpha(26),
                      borderRadius: BorderRadius.circular(
                        AppDimensions.radiusSm,
                      ),
                    ),
                    child: const Center(
                      child: AppIcon(
                        AppIcons.repository,
                        size: 20,
                        color: AppColors.primary,
                      ),
                    ),
                  ),
                  const SizedBox(width: AppDimensions.md),
                  Expanded(
                    child: Text(
                      repository.name,
                      style: const TextStyle(
                        fontFamily: AppTypography.bodyFont,
                        fontSize: AppTypography.lg,
                        fontWeight: AppTypography.medium,
                        color: AppColors.textPrimary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  AppBadge(
                    label: '$taskCount 任务',
                    color: AppColors.primary,
                    variant: BadgeVariant.soft,
                  ),
                ],
              ),
              if (mainBranch != null) ...[
                const SizedBox(height: AppDimensions.sm),
                Row(
                  children: [
                    Text(
                      mainBranch!.name,
                      style: const TextStyle(
                        fontFamily: AppTypography.monoFont,
                        fontSize: AppTypography.sm,
                        color: AppColors.textTertiary,
                      ),
                    ),
                    const Text(
                      ' · ',
                      style: TextStyle(
                        color: AppColors.textTertiary,
                      ),
                    ),
                    Text(
                      repository.updatedAt.relativeTime,
                      style: const TextStyle(
                        fontFamily: AppTypography.bodyFont,
                        fontSize: AppTypography.sm,
                        color: AppColors.textTertiary,
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
