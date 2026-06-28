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
class TaskCard extends StatelessWidget {
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

  Color get _priorityColor {
    return switch (task.priority) {
      Priority.high => AppColors.priorityHigh,
      Priority.medium => AppColors.priorityMedium,
      Priority.low => AppColors.priorityLow,
    };
  }

  Color get _statusColor {
    return switch (task.status) {
      TaskStatus.todo => AppColors.statusTodo,
      TaskStatus.inProgress => AppColors.statusInProgress,
      TaskStatus.done => AppColors.statusDone,
      TaskStatus.cancelled => AppColors.statusCancelled,
    };
  }

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: onTap != null,
      label: '${task.title}，${task.status.label}，${task.priority.label}优先级',
      child: InkWell(
        onTap: onTap,
        onLongPress: onLongPress,
        borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
        child: AnimatedContainer(
          duration: AppDimensions.animFast,
          curve: AppDimensions.easeOutQuart,
          padding: const EdgeInsets.all(AppDimensions.md),
          decoration: BoxDecoration(
            color: AppColors.bgElevated,
            borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
            border: Border.all(color: AppColors.borderSubtle),
          ),
          child: Row(
            children: [
              Container(
                width: 3,
                height: 40,
                decoration: BoxDecoration(
                  color: _priorityColor,
                  borderRadius: BorderRadius.circular(2),
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
                      style: TextStyle(
                        fontFamily: AppTypography.bodyFont,
                        fontSize: AppTypography.base,
                        fontWeight: AppTypography.medium,
                        color: task.isCompleted
                            ? AppColors.textTertiary
                            : AppColors.textPrimary,
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
                          fontSize: AppTypography.xs,
                        ),
                        const SizedBox(width: AppDimensions.sm),
                        if (task.dueDate != null) ...[
                          AppIcon(
                            AppIcons.calendar,
                            size: 12,
                            color: task.isOverdue
                                ? AppColors.error
                                : AppColors.textTertiary,
                          ),
                          const SizedBox(width: AppDimensions.xxs),
                          Text(
                            task.dueDate!.relativeTime,
                            style: TextStyle(
                              fontFamily: AppTypography.bodyFont,
                              fontSize: AppTypography.xs,
                              color: task.isOverdue
                                  ? AppColors.error
                                  : AppColors.textTertiary,
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
                size: 20,
                color: AppColors.textTertiary,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
