import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_icons.dart';
import '../../../core/extensions/date_extensions.dart';
import '../../../core/theme/app_theme_colors.dart';
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

/// 任务详情页（全屏）
class TaskDetailScreen extends ConsumerWidget {
  const TaskDetailScreen({
    super.key,
    required this.taskId,
  });

  final String taskId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final colors = AppThemeColors.of(context);

    return Scaffold(
      appBar: AppBarWidget(
        title: '任务详情',
        showBack: true,
        actions: [
          IconButton(
            icon: const AppIcon(AppIcons.edit),
            color: colors.inkMuted,
            onPressed: () {
              context.push('/task-form?taskId=$taskId');
            },
          ),
          IconButton(
            icon: const AppIcon(AppIcons.more),
            color: colors.inkMuted,
            onPressed: () =
                _showMoreActions(context, ref, taskId),
          ),
        ],
      ),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(
            maxWidth: AppDimensions.contentMaxWidth,
          ),
          child: TaskDetailBody(taskId: taskId),
        ),
      ),
    );
  }
}

/// 任务详情内容体
///
/// 可独立用于分栏布局的右侧面板，因此不内嵌 [Scaffold] 和 [AppBar]。
class TaskDetailBody extends ConsumerWidget {
  const TaskDetailBody({
    super.key,
    required this.taskId,
    this.showBottomBar = true,
  });

  final String taskId;
  final bool showBottomBar;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final taskState = ref.watch(taskNotifierProvider(taskId));

    return Column(
      children: [
        Expanded(
          child: _buildBody(context, ref, taskState),
        ),
        if (showBottomBar)
          _buildBottomBar(context, ref, taskState),
      ],
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
      return Center(
        child: Text(
          '任务不存在',
          style: AppTypography.bodyStyle.copyWith(
            color: AppThemeColors.of(context).inkMuted,
          ),
        ),
      );
    }

    final task = state.task!;
    final commits = state.commits;
    final colors = AppThemeColors.of(context);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppDimensions.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 标题
          Text(
            task.title,
            style: AppTypography.headlineStyle.copyWith(
              fontWeight: AppTypography.medium,
              color: colors.ink,
            ),
          ),
          const SizedBox(height: AppDimensions.md),

          // 标签行
          Wrap(
            spacing: AppDimensions.xs,
            runSpacing: AppDimensions.xs,
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
                      ? colors.error
                      : colors.inkSubtle,
                  variant: BadgeVariant.outlined,
                ),
            ],
          ),

          // 描述
          if (task.description != null &&
              task.description!.isNotEmpty) ...[
            const SizedBox(height: AppDimensions.xl),
            _buildSectionTitle('描述', colors),
            const SizedBox(height: AppDimensions.xs),
            Text(
              task.description!,
              style: AppTypography.bodyStyle.copyWith(
                color: colors.inkMuted,
                height: 1.6,
              ),
            ),
          ],

          // 信息区域
          const SizedBox(height: AppDimensions.xl),
          _buildSectionTitle('信息', colors),
          const SizedBox(height: AppDimensions.xs),
          _buildInfoRow('创建时间', task.createdAt.toDateTimeStr, colors),
          _buildInfoRow('更新时间', task.updatedAt.toDateTimeStr, colors),
          if (task.completedAt != null)
            _buildInfoRow(
              '完成时间',
              task.completedAt!.toDateTimeStr,
              colors,
            ),

          // 提交历史
          if (commits.isNotEmpty) ...[
            const SizedBox(height: AppDimensions.xl),
            _buildSectionTitle('提交历史 (${commits.length})', colors),
            const SizedBox(height: AppDimensions.xs),
            _buildCommitTimeline(commits, colors),
          ],
        ],
      ),
    );
  }

  Widget _buildSectionTitle(String title, AppThemeColors colors) {
    return Row(
      children: [
        Text(
          title,
          style: AppTypography.eyebrowStyle.copyWith(
            color: colors.inkSubtle,
          ),
        ),
        const SizedBox(width: AppDimensions.sm),
        Expanded(
          child: Divider(color: colors.hairline),
        ),
      ],
    );
  }

  Widget _buildInfoRow(
    String label,
    String value,
    AppThemeColors colors,
  ) {
    return Padding(
      padding: const EdgeInsets.only(
        bottom: AppDimensions.xs,
      ),
      child: Row(
        children: [
          SizedBox(
            width: AppDimensions.xxl + AppDimensions.xl,
            child: Text(
              label,
              style: AppTypography.monoSmStyle.copyWith(
                color: colors.inkSubtle,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: AppTypography.monoSmStyle.copyWith(
                color: colors.inkMuted,
                fontWeight: AppTypography.regular,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCommitTimeline(
    List<entity.Commit> commits,
    AppThemeColors colors,
  ) {
    return Column(
      children: [
        for (final commit in commits)
          _CommitRow(commit: commit, colors: colors),
      ],
    );
  }

  Widget _buildBottomBar(
    BuildContext context,
    WidgetRef ref,
    TaskDetailState state,
  ) {
    if (state.task == null) return const SizedBox.shrink();
    final colors = AppThemeColors.of(context);

    return Container(
      padding: const EdgeInsets.all(AppDimensions.md),
      decoration: BoxDecoration(
        color: colors.canvas,
        border: Border(
          top: BorderSide(color: colors.hairline),
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
                  final notifier = ref.read(
                    taskNotifierProvider(taskId).notifier,
                  );
                  if (state.task!.isCompleted) {
                    notifier.reopenTask();
                  } else {
                    notifier.completeTask();
                  }
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
              onPressed: () =
                  _showDeleteDialog(context, ref, taskId),
            ),
          ],
        ),
      ),
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

void _showMoreActions(
  BuildContext context,
  WidgetRef ref,
  String taskId,
) {
  final colors = AppThemeColors.of(context);
  showModalBottomSheet(
    context: context,
    backgroundColor: colors.surface1,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(
        top: Radius.circular(AppDimensions.radiusXl),
      ),
    ),
    builder: (ctx) => SafeArea(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          ListTile(
            leading: AppIcon(
              AppIcons.edit,
              color: colors.primary,
            ),
            title: const Text('编辑任务'),
            onTap: () {
              Navigator.pop(ctx);
              context.push('/task-form?taskId=$taskId');
            },
          ),
          ListTile(
            leading: AppIcon(
              AppIcons.delete,
              color: colors.error,
            ),
            title: const Text('删除任务'),
            onTap: () {
              Navigator.pop(ctx);
              _showDeleteDialog(context, ref, taskId);
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
  String taskId,
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

class _CommitRow extends StatelessWidget {
  const _CommitRow({required this.commit, required this.colors});

  final entity.Commit commit;
  final AppThemeColors colors;

  @override
  Widget build(BuildContext context) {
    final hash = commit.id.length > 7
        ? commit.id.substring(0, 7)
        : commit.id;

    return Container(
      padding: const EdgeInsets.symmetric(vertical: AppDimensions.md),
      decoration: BoxDecoration(
        color: colors.canvas,
        borderRadius: BorderRadius.circular(AppDimensions.radiusXs),
        border: Border(
          bottom: BorderSide(color: colors.hairline),
        ),
      ),
      child: Row(
        children: [
          AppIcon(
            AppIcons.gitCommit,
            size: AppDimensions.iconSm,
            color: colors.primary,
          ),
          const SizedBox(width: AppDimensions.sm),
          Text(
            hash,
            style: AppTypography.monoSmStyle.copyWith(
              color: colors.primary,
            ),
          ),
          const SizedBox(width: AppDimensions.md),
          Expanded(
            child: Text(
              commit.message,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: AppTypography.bodyStyle.copyWith(
                color: colors.ink,
              ),
            ),
          ),
          const SizedBox(width: AppDimensions.md),
          Text(
            commit.createdAt.relativeTime,
            style: AppTypography.monoSmStyle.copyWith(
              color: colors.inkSubtle,
              fontWeight: AppTypography.regular,
            ),
          ),
        ],
      ),
    );
  }
}
