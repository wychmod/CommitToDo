import 'package:flutter/material.dart';

import '../../../core/theme/app_icons.dart';
import '../../../core/theme/colors.dart';
import '../../../core/theme/dimensions.dart';
import '../../../core/theme/typography.dart';
import '../../../domain/entities/repository.dart';
import 'repository_card.dart';

/// 仓库列表
class RepositoryList extends StatelessWidget {
  const RepositoryList({
    super.key,
    required this.repositories,
    this.onRepositoryTap,
    this.onRepositoryLongPress,
    this.taskCounts,
    this.mainBranches,
  });

  final List<Repository> repositories;
  final ValueChanged<Repository>? onRepositoryTap;
  final ValueChanged<Repository>? onRepositoryLongPress;
  final Map<String, int>? taskCounts;
  final Map<String, dynamic>? mainBranches;

  @override
  Widget build(BuildContext context) {
    if (repositories.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const AppIcon(
              AppIcons.repositoryOpen,
              size: 64,
              color: AppColors.textTertiary,
            ),
            const SizedBox(height: AppDimensions.base),
            const Text(
              '开始你的第一个仓库',
              style: TextStyle(
                fontFamily: AppTypography.headingFont,
                fontSize: AppTypography.xl,
                fontWeight: AppTypography.semiBold,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: AppDimensions.sm),
            const Text(
              '像管理代码一样管理你的任务',
              style: TextStyle(
                fontSize: AppTypography.sm,
                color: AppColors.textSecondary,
              ),
            ),
          ],
        ),
      );
    }

    return ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: repositories.length,
      separatorBuilder: (_, __) => const SizedBox(
        height: AppDimensions.sm,
      ),
      itemBuilder: (context, index) {
        final repo = repositories[index];
        return RepositoryCard(
          repository: repo,
          taskCount: taskCounts?[repo.id] ?? 0,
          onTap: () => onRepositoryTap?.call(repo),
          onLongPress: () =>
              onRepositoryLongPress?.call(repo),
        );
      },
    );
  }
}
