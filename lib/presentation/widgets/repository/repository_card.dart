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
///
/// 对齐 `docs/DESIGN.md` §7.3。
/// - 底 surface1、`radiusLg`(12)、padding 16、1px hairline。
/// - 仓库名 cardTitle；分支/任务计数 monoSm + inkMuted。
class RepositoryCard extends StatefulWidget {
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
  State<RepositoryCard> createState() => _RepositoryCardState();
}

class _RepositoryCardState extends State<RepositoryCard> {
  bool _hovering = false;

  @override
  Widget build(BuildContext context) {
    final repo = widget.repository;
    return Semantics(
      button: widget.onTap != null,
      label: '${repo.name}，${widget.taskCount} 个任务',
      child: MouseRegion(
        cursor: widget.onTap != null
            ? SystemMouseCursors.click
            : MouseCursor.defer,
        onEnter: (_) => setState(() => _hovering = true),
        onExit: (_) => setState(() => _hovering = false),
        child: InkWell(
          onTap: widget.onTap,
          onLongPress: widget.onLongPress,
          borderRadius: BorderRadius.circular(AppDimensions.radiusLg),
          child: AnimatedContainer(
            duration: AppDimensions.animFast,
            curve: AppDimensions.easeOutQuart,
            padding: const EdgeInsets.all(AppDimensions.md),
            decoration: BoxDecoration(
              color: _hovering ? AppColors.surface2 : AppColors.surface1,
              borderRadius: BorderRadius.circular(AppDimensions.radiusLg),
              border: Border(
                top: const BorderSide(
                  color: AppColors.edgeHighlight,
                  width: 1,
                ),
                left: BorderSide(
                  color: _hovering
                      ? AppColors.hairlineStrong
                      : AppColors.hairline,
                  width: 1,
                ),
                right: BorderSide(
                  color: _hovering
                      ? AppColors.hairlineStrong
                      : AppColors.hairline,
                  width: 1,
                ),
                bottom: BorderSide(
                  color: _hovering
                      ? AppColors.hairlineStrong
                      : AppColors.hairline,
                  width: 1,
                ),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: AppDimensions.repositoryIconBox,
                      height: AppDimensions.repositoryIconBox,
                      decoration: BoxDecoration(
                        color: AppColors.primary.withAlpha(31),
                        borderRadius: BorderRadius.circular(
                          AppDimensions.radiusSm,
                        ),
                      ),
                      child: const Center(
                        child: AppIcon(
                          AppIcons.repository,
                          size: AppDimensions.iconMd,
                          color: AppColors.primary,
                        ),
                      ),
                    ),
                    const SizedBox(width: AppDimensions.md),
                    Expanded(
                      child: Text(
                        repo.name,
                        style: AppTypography.cardTitleStyle.copyWith(
                          color: AppColors.ink,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    AppBadge(
                      label: '${widget.taskCount} 任务',
                      color: AppColors.primary,
                      variant: BadgeVariant.soft,
                    ),
                  ],
                ),
                if (widget.mainBranch != null) ...[
                  const SizedBox(height: AppDimensions.sm),
                  Row(
                    children: [
                      AppIcon(
                        AppIcons.gitBranch,
                        size: AppDimensions.iconXs,
                        color: AppColors.inkSubtle,
                      ),
                      const SizedBox(width: AppDimensions.xxs),
                      Text(
                        widget.mainBranch!.name,
                        style: AppTypography.monoSmStyle.copyWith(
                          color: AppColors.inkSubtle,
                        ),
                      ),
                      Text(
                        ' · ',
                        style: AppTypography.monoSmStyle.copyWith(
                          color: AppColors.inkSubtle,
                        ),
                      ),
                      Text(
                        repo.updatedAt.relativeTime,
                        style: AppTypography.monoSmStyle.copyWith(
                          color: AppColors.inkSubtle,
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
