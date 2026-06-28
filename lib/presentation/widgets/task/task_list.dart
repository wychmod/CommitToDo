import 'package:flutter/material.dart';

import '../../../core/theme/app_icons.dart';
import '../../../core/theme/colors.dart';
import '../../../core/theme/dimensions.dart';
import '../../../core/theme/typography.dart';
import '../../../domain/entities/enums.dart';
import '../../../domain/entities/task.dart';
import 'task_card.dart';

/// 任务列表，按状态分组
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
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(AppDimensions.xl),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              AppIcon(
                AppIcons.checkCircleOutline,
                size: 48,
                color: AppColors.textTertiary,
              ),
              SizedBox(height: AppDimensions.base),
              Text(
                '暂无任务',
                style: TextStyle(
                  fontSize: AppTypography.base,
                  color: AppColors.textTertiary,
                ),
              ),
            ],
          ),
        ),
      );
    }

    if (!groupByStatus) {
      return ListView.separated(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: tasks.length,
        separatorBuilder: (_, __) => const SizedBox(
          height: AppDimensions.sm,
        ),
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
      final tasksWithStatus = tasks
          .where((t) => t.status == status)
          .toList();
      if (tasksWithStatus.isNotEmpty) {
        grouped[status] = tasksWithStatus;
      }
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (final entry in grouped.entries) ...[
          // 分组标题
          Padding(
            padding: const EdgeInsets.symmetric(
              vertical: AppDimensions.sm,
            ),
            child: Row(
              children: [
                Text(
                  '${entry.key.label} (${entry.value.length})',
                  style: const TextStyle(
                    fontFamily: AppTypography.monoFont,
                    fontSize: AppTypography.sm,
                    fontWeight: AppTypography.medium,
                    color: AppColors.textTertiary,
                  ),
                ),
                const SizedBox(width: AppDimensions.sm),
                const Expanded(
                  child: Divider(
                    color: AppColors.borderSubtle,
                  ),
                ),
              ],
            ),
          ),

          // 任务卡片列表
          for (final task in entry.value) ...[
            TaskCard(
              task: task,
              onTap: () => onTaskTap?.call(task),
              onLongPress: () =>
                  onTaskLongPress?.call(task),
            ),
            const SizedBox(height: AppDimensions.sm),
          ],
        ],
      ],
    );
  }
}
