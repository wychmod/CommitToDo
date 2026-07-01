import 'package:flutter/material.dart';

import '../../../core/theme/app_icons.dart';
import '../../../core/theme/colors.dart';
import '../../../core/theme/dimensions.dart';
import '../../../core/theme/typography.dart';
import '../../../domain/entities/branch.dart';
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
  final Map<String, Branch>? mainBranches;

  @override
  Widget build(BuildContext context) {
    if (repositories.isEmpty) {
      return _EmptyRepositoryState();
    }

    return LayoutBuilder(
      builder: (context, constraints) {
        if (constraints.maxWidth >= 768) {
          return GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: repositories.length,
            gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
              maxCrossAxisExtent: 400,
              mainAxisExtent: 128,
              mainAxisSpacing: AppDimensions.xs,
              crossAxisSpacing: AppDimensions.xs,
            ),
            itemBuilder: (context, index) => _buildCard(index),
          );
        }

        return ListView.separated(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: repositories.length,
          separatorBuilder: (_, __) =>
              const SizedBox(height: AppDimensions.xs),
          itemBuilder: (context, index) => _buildCard(index),
        );
      },
    );
  }

  Widget _buildCard(int index) {
    final repo = repositories[index];
    return RepositoryCard(
      repository: repo,
      taskCount: taskCounts?[repo.id] ?? 0,
      mainBranch: mainBranches?[repo.id],
      onTap: () => onRepositoryTap?.call(repo),
      onLongPress: () => onRepositoryLongPress?.call(repo),
    );
  }
}
/// 仓库空状态（DESIGN.md §7.3 empty-state-card，展示面）
class _EmptyRepositoryState extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppDimensions.xxl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: AppDimensions.xxl + AppDimensions.xl,
              height: AppDimensions.xxl + AppDimensions.xl,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: AppColors.primaryGradient,
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(
                  AppDimensions.radiusXl,
                ),
              ),
              child: const Center(
                child: AppIcon(
                  AppIcons.repositoryOpen,
                  size: AppDimensions.repositoryIconBox,
                  color: AppColors.onPrimary,
                ),
              ),
            ),
            const SizedBox(height: AppDimensions.lg),
            ShaderMask(
              shaderCallback: (bounds) => const LinearGradient(
                colors: AppColors.primaryGradient,
              ).createShader(bounds),
              child: Text(
                '开始你的第一个仓库',
                style: AppTypography.displayMdStyle.copyWith(
                  color: AppColors.onPrimary,
                ),
                textAlign: TextAlign.center,
              ),
            ),
            const SizedBox(height: AppDimensions.sm),
            Text(
              '像管理代码一样管理你的任务',
              style: AppTypography.bodySmStyle.copyWith(
                color: AppColors.inkMuted,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
