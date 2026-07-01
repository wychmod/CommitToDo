import 'package:flutter/material.dart';

import '../../../core/theme/app_icons.dart';
import '../../../core/extensions/date_extensions.dart';
import '../../../core/theme/colors.dart';
import '../../../core/theme/dimensions.dart';
import '../../../core/theme/typography.dart';
import '../../../domain/entities/enums.dart';
import '../../../domain/entities/task.dart';
import '../common/app_badge.dart';

/// 任务卡片
///
/// 对齐 `docs/DESIGN.md` §7.3 task-card。
/// - 底 surface1、`radiusLg`(12)、padding 16、1px hairline。
/// - 左侧 3px 优先级色条；标题 cardTitle；meta monoSm + inkSubtle；右侧 status pill。
/// - hover → lift surface2 + hairlineStrong。
class TaskCard extends StatefulWidget {
  const TaskCard({
    super.key,
    required this.task,
    this.onTap,
    this.onLongPress,
    this.showBranch = false,
  });

  final Task task;
  final VoidCallback? onTap;
  final VoidCallback? onLongPress;
  final bool showBranch;

  @override
  State<TaskCard> createState() => _TaskCardState();
}

class _TaskCardState extends State<TaskCard> {
  bool _hovering = false;

  Color get _priorityColor {
    return switch (widget.task.priority) {
      Priority.high => AppColors.priorityHigh,
      Priority.medium => AppColors.priorityMedium,
      Priority.low => AppColors.priorityLow,
    };
  }

  Color get _statusColor {
    return switch (widget.task.status) {
      TaskStatus.todo => AppColors.statusTodo,
      TaskStatus.inProgress => AppColors.statusInProgress,
      TaskStatus.done => AppColors.statusDone,
      TaskStatus.cancelled => AppColors.statusCancelled,
    };
  }

  @override
  Widget build(BuildContext context) {
    final task = widget.task;
    final lifted = _hovering;

    return Semantics(
      button: widget.onTap != null,
      label: '${task.title}，${task.status.label}，${task.priority.label}优先级',
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
              color: lifted ? AppColors.surface2 : AppColors.surface1,
              borderRadius: BorderRadius.circular(AppDimensions.radiusLg),
              border: Border(
                top: const BorderSide(
                  color: AppColors.edgeHighlight,
                  width: 1,
                ),
                left: BorderSide(
                  color: lifted
                      ? AppColors.hairlineStrong
                      : AppColors.hairline,
                  width: 1,
                ),
                right: BorderSide(
                  color: lifted
                      ? AppColors.hairlineStrong
                      : AppColors.hairline,
                  width: 1,
                ),
                bottom: BorderSide(
                  color: lifted
                      ? AppColors.hairlineStrong
                      : AppColors.hairline,
                  width: 1,
                ),
              ),
            ),
            child: Row(
              children: [
                // 左侧 3px 优先级色条
                Container(
                  width: AppDimensions.priorityStripWidth,
                  height: AppDimensions.ctaHeight,
                  decoration: BoxDecoration(
                    color: _priorityColor,
                    borderRadius: BorderRadius.circular(AppDimensions.micro),
                  ),
                ),
                const SizedBox(width: AppDimensions.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        task.title,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: AppTypography.cardTitleStyle.copyWith(
                          color: task.isCompleted
                              ? AppColors.inkSubtle
                              : AppColors.ink,
                          decoration: task.isCompleted
                              ? TextDecoration.lineThrough
                              : null,
                        ),
                      ),
                      const SizedBox(height: AppDimensions.xs),
                      Row(
                        children: [
                          AppBadge(
                            label: task.status.label,
                            color: _statusColor,
                            variant: BadgeVariant.soft,
                          ),
                          const SizedBox(width: AppDimensions.sm),
                          if (widget.showBranch) ...[
                            _BranchChip(branchId: task.branchId),
                            const SizedBox(width: AppDimensions.sm),
                          ],
                          if (task.dueDate != null) ...[
                            AppIcon(
                              AppIcons.calendar,
                              size: AppDimensions.iconXs,
                              color: task.isOverdue
                                  ? AppColors.error
                                  : AppColors.inkSubtle,
                            ),
                            const SizedBox(width: AppDimensions.xxs),
                            Text(
                              task.dueDate!.relativeTime,
                              style: AppTypography.monoSmStyle.copyWith(
                                color: task.isOverdue
                                    ? AppColors.error
                                    : AppColors.inkSubtle,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ],
                  ),
                ),
                const AppIcon(
                  AppIcons.chevronRight,
                  size: AppDimensions.iconMd,
                  color: AppColors.inkSubtle,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _BranchChip extends StatelessWidget {
  const _BranchChip({required this.branchId});

  final String branchId;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppDimensions.xs,
        vertical: AppDimensions.micro,
      ),
      decoration: BoxDecoration(
        color: AppColors.surface2.withAlpha(128),
        borderRadius: BorderRadius.circular(AppDimensions.radiusSm),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const AppIcon(
            AppIcons.gitBranch,
            size: AppDimensions.iconXs,
            color: AppColors.inkMuted,
          ),
          const SizedBox(width: AppDimensions.xxs),
          Text(
            branchId,
            style: AppTypography.monoSmStyle.copyWith(
              color: AppColors.inkSubtle,
            ),
          ),
        ],
      ),
    );
  }
}
