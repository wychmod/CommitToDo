import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_icons.dart';
import '../../../core/theme/app_theme_colors.dart';
import '../../../core/theme/dimensions.dart';
import '../../providers/repository_providers.dart';
import '../../widgets/branch/branch_list.dart';
import '../../widgets/common/app_bar_widget.dart';
import '../../widgets/common/app_card.dart';
import '../../widgets/common/app_dialog.dart';
import '../../widgets/common/app_input.dart';
import '../../widgets/common/app_button.dart';
import '../../widgets/common/app_toast.dart';
import '../../widgets/common/loading_widget.dart';
import '../../widgets/common/responsive_layout.dart';
import '../../widgets/common/split_view.dart';
import '../../widgets/task/task_list.dart';
import '../task/task_detail_screen.dart' show TaskDetailBody;
import 'repository_state.dart';

/// 仓库详情页
class RepositoryScreen extends ConsumerWidget {
  const RepositoryScreen({
    super.key,
    required this.repositoryId,
  });

  final String repositoryId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final repoState = ref.watch(
      repositoryNotifierProvider(repositoryId),
    );
    final colors = AppThemeColors.of(context);

    return Scaffold(
      appBar: AppBarWidget(
        title: repoState.repository?.name ?? '仓库详情',
        showBack: true,
        actions: [
          IconButton(
            icon: const AppIcon(AppIcons.add),
            color: colors.inkMuted,
            onPressed: () {
              context.push(
                '/task-form?branchId=${repoState.activeBranchId ?? ''}',
              );
            },
          ),
        ],
      ),
      body: _buildBody(context, ref, repoState),
    );
  }

  Widget _buildBody(
    BuildContext context,
    WidgetRef ref,
    RepositoryScreenState state,
  ) {
    if (state.isLoading && state.branches.isEmpty) {
      return const LoadingWidget(message: '加载中...');
    }

    final master = _buildMaster(context, ref, state);
    final selectedTaskId = state.selectedTaskId;

    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(
          maxWidth: AppDimensions.contentMaxWidth,
        ),
        child: SplitView(
          master: master,
          detail: selectedTaskId != null
              ? TaskDetailBody(taskId: selectedTaskId)
              : const _EmptyDetail(),
          detailVisible: selectedTaskId != null,
          emptyDetail: const _EmptyDetail(),
        ),
      ),
    );
  }

  Widget _buildMaster(
    BuildContext context,
    WidgetRef ref,
    RepositoryScreenState state,
  ) {
    final colors = AppThemeColors.of(context);
    return Column(
      children: [
        // 分支选择栏
        Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: AppDimensions.md,
            vertical: AppDimensions.sm,
          ),
          child: Row(
            children: [
              Expanded(
                child: BranchList(
                  branches: state.branches,
                  activeBranchId: state.activeBranchId,
                  onBranchTap: (branch) {
                    ref
                        .read(
                          repositoryNotifierProvider(
                            repositoryId,
                          ).notifier,
                        )
                        .switchBranch(branch.id);
                  },
                ),
              ),
              const SizedBox(width: AppDimensions.xs),
              _AddBranchButton(
                onTap: () => _showCreateBranchDialog(context, ref),
              ),
            ],
          ),
        ),

        // 任务列表
        Expanded(
          child: RefreshIndicator(
            color: colors.primary,
            backgroundColor: colors.surface1,
            onRefresh: () => ref
                .read(
                  repositoryNotifierProvider(
                    repositoryId,
                  ).notifier,
                )
                .loadData(),
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.symmetric(
                horizontal: AppDimensions.md,
              ),
              child: TaskList(
                tasks: state.tasks,
                onTaskTap: (task) {
                  if (ResponsiveLayout.isWide(context)) {
                    ref
                        .read(
                          repositoryNotifierProvider(
                            repositoryId,
                          ).notifier,
                        )
                        .selectTask(task.id);
                  } else {
                    context.push('/task/${task.id}');
                  }
                },
                onTaskLongPress: (task) {
                  _showTaskActions(
                    context,
                    ref,
                    task.id,
                    task.title,
                  );
                },
              ),
            ),
          ),
        ),
      ],
    );
  }

  void _showCreateBranchDialog(
    BuildContext context,
    WidgetRef ref,
  ) {
    final nameController = TextEditingController();

    AppDialog.show<void>(
      context,
      title: '创建分支',
      content: AppInput(
        controller: nameController,
        label: '分支名称',
        hint: '输入分支名称...',
        autofocus: true,
      ),
      actions: [
        DialogAction(
          text: '取消',
          variant: ButtonVariant.secondary,
        ),
        DialogAction(
          text: '创建',
          onPressed: () async {
            final name = nameController.text.trim();
            if (name.isEmpty) return;

            await ref
                .read(
                  repositoryNotifierProvider(
                    repositoryId,
                  ).notifier,
                )
                .createBranch(name: name);

            if (context.mounted) {
              AppToast.show(
                context,
                message: '分支创建成功',
                variant: ToastVariant.success,
              );
            }
          },
        ),
      ],
    );
  }

  void _showTaskActions(
    BuildContext context,
    WidgetRef ref,
    String taskId,
    String taskTitle,
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
                AppIcons.checkCircleOutline,
                color: colors.success,
              ),
              title: const Text('完成任务'),
              onTap: () {
                Navigator.pop(ctx);
                ref
                    .read(
                      repositoryNotifierProvider(
                        repositoryId,
                      ).notifier,
                    )
                    .completeTask(taskId);
              },
            ),
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
                ref
                    .read(
                      repositoryNotifierProvider(
                        repositoryId,
                      ).notifier,
                    )
                    .deleteTask(taskId);
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _AddBranchButton extends StatelessWidget {
  const _AddBranchButton({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: '新建分支',
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppDimensions.radiusSm),
        child: AppCard(
          padding: const EdgeInsets.all(
            AppDimensions.md - AppDimensions.micro,
          ),
          radius: AppDimensions.radiusSm,
          child: AppIcon(
            AppIcons.add,
            size: AppDimensions.iconSm,
            color: AppThemeColors.of(context).inkMuted,
          ),
        ),
      ),
    );
  }
}

class _EmptyDetail extends StatelessWidget {
  const _EmptyDetail();

  @override
  Widget build(BuildContext context) {
    final colors = AppThemeColors.of(context);
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          AppIcon(
            AppIcons.repository,
            size: AppDimensions.xxl,
            color: colors.inkSubtle,
          ),
          const SizedBox(height: AppDimensions.md),
          Text(
            '选择一个任务查看详情',
            style: AppTypography.bodyStyle.copyWith(
              color: colors.inkMuted,
            ),
          ),
        ],
      ),
    );
  }
}
