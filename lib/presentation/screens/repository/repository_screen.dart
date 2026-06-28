import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_icons.dart';
import '../../../core/theme/colors.dart';
import '../../../core/theme/dimensions.dart';
import '../../../core/theme/typography.dart';
import '../../widgets/branch/branch_list.dart';
import '../../widgets/common/app_bar_widget.dart';
import '../../widgets/common/app_dialog.dart';
import '../../widgets/common/app_input.dart';
import '../../widgets/common/app_button.dart';
import '../../widgets/common/app_toast.dart';
import '../../widgets/common/loading_widget.dart';
import '../../widgets/task/task_list.dart';
import 'repository_notifier.dart';

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

    return Scaffold(
      appBar: AppBarWidget(
        title: repoState.repository?.name ?? '仓库详情',
        showBack: true,
        actions: [
          IconButton(
            icon: const AppIcon(AppIcons.add),
            color: AppColors.textSecondary,
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

    return Column(
      children: [
        // 分支选择栏
        Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: AppDimensions.base,
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
              const SizedBox(width: AppDimensions.sm),
              Semantics(
                button: true,
                label: '新建分支',
                child: InkWell(
                  onTap: () =>
                      _showCreateBranchDialog(context, ref),
                  borderRadius: BorderRadius.circular(
                    AppDimensions.radiusSm,
                  ),
                  child: Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: AppColors.bgElevated,
                      borderRadius: BorderRadius.circular(
                        AppDimensions.radiusSm,
                      ),
                      border: Border.all(
                        color: AppColors.borderDefault,
                      ),
                    ),
                    child: const AppIcon(
                      AppIcons.add,
                      size: 16,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),

        // 任务列表
        Expanded(
          child: RefreshIndicator(
            color: AppColors.primary,
            onRefresh: () => ref
                .read(
                  repositoryNotifierProvider(
                    repositoryId,
                  ).notifier,
                )
                .loadData(),
            child: state.tasks.isEmpty
                ? const Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        AppIcon(
                          AppIcons.checkCircleOutline,
                          size: 48,
                          color: AppColors.textTertiary,
                        ),
                        SizedBox(
                          height: AppDimensions.base,
                        ),
                        Text(
                          '暂无任务，点击右上角添加',
                          style: TextStyle(
                            color: AppColors.textTertiary,
                          ),
                        ),
                      ],
                    ),
                  )
                : Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppDimensions.base,
                    ),
                    child: TaskList(
                      tasks: state.tasks,
                      onTaskTap: (task) {
                        context.push('/task/${task.id}');
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
                AppIcons.checkCircleOutline,
                color: AppColors.success,
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
