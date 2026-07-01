import 'package:flutter/material.dart';

import '../../../core/theme/app_icons.dart';
import '../../../core/theme/colors.dart';
import '../../../core/theme/dimensions.dart';
import '../../../core/theme/typography.dart';
import '../../../domain/entities/enums.dart';
import '../../../domain/entities/task.dart';
import 'task_card.dart';

/// 任务列表，按状态分组
///
/// 对齐 `docs/DESIGN.md` §7.3。item 间距 xs(8)。
class TaskList extends StatelessWidget {
  const TaskList({
    super.key,
    required this.tasks,
    this.onTaskTap,
    this.onTaskLongPress,
    this.groupByStatus = true,
  });

  final List<Task> tasks;
  final ValueChanged<Task>? onTaskTap;
  final ValueChanged<Task>? onTaskLongPress;
  final bool groupByStatus;

  @override
  Widget build(BuildContext context) {
    if (tasks.isEmpty) {
      return _EmptyTaskState();
    }

    if (!groupByStatus) {
      return ListView.separated(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: tasks.length,
        separatorBuilder: (_, __) =>
            const SizedBox(height: AppDimensions.xs),
        itemBuilder: (context, index) {
          final task = tasks[index];
          return TaskCard(
            task: task,
            onTap: () => onTaskTap?.call(task),
            onLongPress: () => onTaskLongPress?.call(task),
          );
        },
      );
    }

    // 按状态分组
    final grouped = <TaskStatus, List<Task>>{};
    for (final status in TaskStatus.values) {
      final tasksWithStatus =
          tasks.where((t) => t.status == status).toList();
      if (tasksWithStatus.isNotEmpty) {
        grouped[status] = tasksWithStatus;
      }
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (final entry in grouped.entries) ...[
          // 分组标题（eyebrow 风格）
          Padding(
            padding: const EdgeInsets.symmetric(
              vertical: AppDimensions.sm,
            ),
            child: Row(
              children: [
                Text(
                  '${entry.key.label} · ${entry.value.length}',
                  style: AppTypography.eyebrowStyle.copyWith(
                    color: AppColors.inkSubtle,
                  ),
                ),
                const SizedBox(width: AppDimensions.sm),
                const Expanded(
                  child: Divider(color: AppColors.hairline),
                ),
              ],
            ),
          ),

          // 任务卡片列表
          for (final task in entry.value) ...[
            TaskCard(
              task: task,
              onTap: () => onTaskTap?.call(task),
              onLongPress: () => onTaskLongPress?.call(task),
            ),
            const SizedBox(height: AppDimensions.xs),
          ],
        ],
      ],
    );
  }
}

class _EmptyTaskState extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppDimensions.xl),
        child: Container(
          padding: const EdgeInsets.all(AppDimensions.xl),
          decoration: BoxDecoration(
            color: AppColors.canvas,
            borderRadius: BorderRadius.circular(AppDimensions.radiusXxl),
            border: AppDimensions.cardBorder(),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const AppIcon(
                AppIcons.checkCircleOutline,
                size: AppDimensions.xxl,
                color: AppColors.inkSubtle,
              ),
              const SizedBox(height: AppDimensions.md),
              Text(
                '暂无任务',
                style: AppTypography.cardTitleStyle.copyWith(
                  color: AppColors.ink,
                ),
              ),
              const SizedBox(height: AppDimensions.xs),
              Text(
                '当前分支还没有待处理项',
                style: AppTypography.bodySmStyle.copyWith(
                  color: AppColors.inkMuted,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
