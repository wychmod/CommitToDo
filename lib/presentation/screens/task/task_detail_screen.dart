import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_icons.dart';
import '../../../core/extensions/date_extensions.dart';
import '../../../core/theme/colors.dart';
import '../../../core/theme/dimensions.dart';
import '../../../core/theme/typography.dart';
import '../../../domain/entities/commit.dart' as entity;
import '../../../domain/entities/enums.dart';
import '../../widgets/common/app_badge.dart';
import '../../widgets/common/app_bar_widget.dart';
import '../../widgets/common/app_button.dart';
import '../../widgets/common/app_dialog.dart';
import '../../widgets/common/loading_widget.dart';
import 'task_notifier.dart';

/// 任务详情页
class TaskDetailScreen extends ConsumerWidget {
  const TaskDetailScreen({
    super.key,
    required this.taskId,
  });

  final String taskId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final taskState = ref.watch(
      taskNotifierProvider(taskId),
    );

    return Scaffold(
      appBar: AppBarWidget(
        title: '任务详情',
        showBack: true,
        actions: [
          IconButton(
            icon: const AppIcon(AppIcons.edit),
            color: AppColors.textSecondary,
            onPressed: () {
              context.push('/task-form?taskId=$taskId');
            },
          ),
          IconButton(
            icon: const AppIcon(AppIcons.more),
            color: AppColors.textSecondary,
            onPressed: () =>
                _showMoreActions(context, ref),
          ),
        ],
      ),
      body: _buildBody(context, ref, taskState),
      bottomNavigationBar: _buildBottomBar(
        context,
        ref,
        taskState,
      ),
    );
  }

  Widget _buildBody(
    BuildContext context,
    WidgetRef ref,
    TaskDetailState state,
  ) {
    if (state.isLoading) {
      return const LoadingWidget(message: '加载任务...');
    }

    if (state.task == null) {
      return const Center(
        child: Text(
          '任务不存在',
          style: TextStyle(color: AppColors.textSecondary),
        ),
      );
    }

    final task = state.task!;
    final commits = state.commits;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppDimensions.base),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 标题
          Text(
            task.title,
            style: const TextStyle(
              fontFamily: AppTypography.bodyFont,
              fontSize: AppTypography.xxl,
              fontWeight: AppTypography.medium,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: AppDimensions.md),

          // 标签行
          Wrap(
            spacing: AppDimensions.sm,
            runSpacing: AppDimensions.sm,
            children: [
              // 优先级
              AppBadge(
                label: task.priority.label,
                color: _priorityColor(task.priority),
                variant: BadgeVariant.soft,
              ),
              // 状态
              AppBadge(
                label: task.status.label,
                color: _statusColor(task.status),
                variant: BadgeVariant.soft,
              ),
              // 截止日期
              if (task.dueDate != null)
                AppBadge(
                  label: task.dueDate!.relativeTime,
                  color: task.isOverdue
                      ? AppColors.error
                      : AppColors.textTertiary,
                  variant: BadgeVariant.outlined,
                ),
            ],
          ),

          // 描述
          if (task.description != null &&
              task.description!.isNotEmpty) ...[
            const SizedBox(height: AppDimensions.xl),
            _buildSectionTitle('描述'),
            const SizedBox(height: AppDimensions.sm),
            Text(
              task.description!,
              style: const TextStyle(
                fontSize: AppTypography.base,
                color: AppColors.textSecondary,
                height: 1.6,
              ),
            ),
          ],

          // 信息区域
          const SizedBox(height: AppDimensions.xl),
          _buildSectionTitle('信息'),
          const SizedBox(height: AppDimensions.sm),
          _buildInfoRow(
            '创建时间',
            task.createdAt.toDateTimeStr,
          ),
          _buildInfoRow(
            '更新时间',
            task.updatedAt.toDateTimeStr,
          ),
          if (task.completedAt != null)
            _buildInfoRow(
              '完成时间',
              task.completedAt!.toDateTimeStr,
            ),

          // 提交历史
          if (commits.isNotEmpty) ...[
            const SizedBox(height: AppDimensions.xl),
            _buildSectionTitle(
              '提交历史 (${commits.length})',
            ),
            const SizedBox(height: AppDimensions.sm),
            _buildCommitTimeline(commits),
          ],
        ],
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Row(
      children: [
        Text(
          title,
          style: const TextStyle(
            fontFamily: AppTypography.monoFont,
            fontSize: AppTypography.sm,
            fontWeight: AppTypography.medium,
            color: AppColors.textTertiary,
          ),
        ),
        const SizedBox(width: AppDimensions.sm),
        const Expanded(
          child: Divider(color: AppColors.borderSubtle),
        ),
      ],
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(
        bottom: AppDimensions.sm,
      ),
      child: Row(
        children: [
          SizedBox(
            width: 80,
            child: Text(
              label,
              style: const TextStyle(
                fontSize: AppTypography.sm,
                color: AppColors.textTertiary,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                fontSize: AppTypography.sm,
                color: AppColors.textSecondary,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCommitTimeline(
    List<entity.Commit> commits,
  ) {
    return Column(
      children: [
        for (var i = 0; i < commits.length; i++) ...[
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 时间线指示器
              Column(
                children: [
                  Container(
                    width: 8,
                    height: 8,
                    decoration: const BoxDecoration(
                      shape: BoxShape.circle,
                      color: AppColors.primary,
                    ),
                  ),
                  if (i < commits.length - 1)
                    Container(
                      width: 2,
                      height: 32,
                      color: AppColors.borderSubtle,
                    ),
                ],
              ),
              const SizedBox(width: AppDimensions.md),

              // 内容
              Expanded(
                child: Column(
                  crossAxisAlignment:
                      CrossAxisAlignment.start,
                  children: [
                    Text(
                      commits[i].message,
                      style: const TextStyle(
                        fontSize: AppTypography.sm,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(
                      height: AppDimensions.xxs,
                    ),
                    Text(
                      commits[i]
                          .createdAt
                          .relativeTime,
                      style: const TextStyle(
                        fontSize: AppTypography.xs,
                        color: AppColors.textTertiary,
                      ),
                    ),
                    const SizedBox(
                      height: AppDimensions.sm,
                    ),
                  ],
                ),
              ),
            ],
          ),
      ],
    );
  }

  Widget? _buildBottomBar(
    BuildContext context,
    WidgetRef ref,
    TaskDetailState state,
  ) {
    if (state.task == null) return null;

    return Container(
      padding: const EdgeInsets.all(AppDimensions.base),
      decoration: const BoxDecoration(
        color: AppColors.bgBase,
        border: Border(
          top: BorderSide(color: AppColors.borderSubtle),
        ),
      ),
      child: SafeArea(
        child: Row(
          children: [
            // 完成/重开按钮
            Expanded(
              child: AppButton(
                text: state.task!.isCompleted
                    ? '重新打开'
                    : '完成任务',
                icon: state.task!.isCompleted
                    ? AppIcons.undo
                    : AppIcons.checkCircle,
                onPressed: () {
                  ref
                      .read(
                        taskNotifierProvider(taskId)
                            .notifier,
                      )
                      .completeTask();
                },
                variant: state.task!.isCompleted
                    ? ButtonVariant.secondary
                    : ButtonVariant.primary,
                isExpanded: true,
              ),
            ),
            const SizedBox(width: AppDimensions.md),

            // 删除按钮
            AppButton(
              text: '删除',
              icon: AppIcons.delete,
              variant: ButtonVariant.danger,
              onPressed: () =>
                  _showDeleteDialog(context, ref),
            ),
          ],
        ),
      ),
    );
  }

  void _showMoreActions(
    BuildContext context,
    WidgetRef ref,
  ) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.bgElevated,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(AppDimensions.radiusXl),
        ),
      ),
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const AppIcon(
                AppIcons.edit,
                color: AppColors.primary,
              ),
              title: const Text('编辑任务'),
              onTap: () {
                Navigator.pop(ctx);
                context.push('/task-form?taskId=$taskId');
              },
            ),
            ListTile(
              leading: const AppIcon(
                AppIcons.delete,
                color: AppColors.error,
              ),
              title: const Text('删除任务'),
              onTap: () {
                Navigator.pop(ctx);
                _showDeleteDialog(context, ref);
              },
            ),
          ],
        ),
      ),
    );
  }

  void _showDeleteDialog(
    BuildContext context,
    WidgetRef ref,
  ) {
    AppDialog.show<void>(
      context,
      title: '删除任务',
      content: const Text('确定要删除这个任务吗？'),
      actions: [
        DialogAction(
          text: '取消',
          variant: ButtonVariant.secondary,
        ),
        DialogAction(
          text: '删除',
          variant: ButtonVariant.danger,
          onPressed: () async {
            await ref
                .read(
                  taskNotifierProvider(taskId).notifier,
                )
                .deleteTask();
            if (context.mounted) {
              context.pop();
            }
          },
        ),
      ],
    );
  }

  Color _priorityColor(Priority p) {
    return switch (p) {
      Priority.high => AppColors.priorityHigh,
      Priority.medium => AppColors.priorityMedium,
      Priority.low => AppColors.priorityLow,
    };
  }

  Color _statusColor(TaskStatus s) {
    return switch (s) {
      TaskStatus.todo => AppColors.statusTodo,
      TaskStatus.inProgress => AppColors.statusInProgress,
      TaskStatus.done => AppColors.statusDone,
      TaskStatus.cancelled => AppColors.statusCancelled,
    };
  }
}
