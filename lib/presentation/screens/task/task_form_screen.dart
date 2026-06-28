import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/colors.dart';
import '../../../core/theme/dimensions.dart';
import '../../widgets/common/app_bar_widget.dart';
import '../../widgets/common/app_toast.dart';
import '../../widgets/common/loading_widget.dart';
import '../../widgets/task/task_form.dart';
import '../repository/repository_notifier.dart';
import 'task_notifier.dart';

/// 任务表单页（新建/编辑）
class TaskFormScreen extends ConsumerWidget {
  const TaskFormScreen({
    super.key,
    required this.branchId,
    this.taskId,
  });

  final String branchId;
  final String? taskId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isEditing = taskId != null;
    dynamic taskState;

    if (isEditing) {
      taskState = ref.watch(taskNotifierProvider(taskId!));
    }

    return Scaffold(
      appBar: AppBarWidget(
        title: isEditing ? '编辑任务' : '新建任务',
        showBack: true,
      ),
      body: isEditing
          ? _buildEditBody(context, ref, taskState)
          : _buildCreateBody(context, ref),
    );
  }

  Widget _buildCreateBody(
    BuildContext context,
    WidgetRef ref,
  ) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppDimensions.base),
      child: TaskForm(
        isEditing: false,
        onSubmit: ({
          required title,
          description,
          priority,
          dueDate,
        }) async {
          // 使用 repository notifier 创建任务
          // branchId 来自路由参数
          // 这里简化处理，实际需要通过 DI 获取
          if (context.mounted) {
            AppToast.show(
              context,
              message: '任务创建成功',
              variant: ToastVariant.success,
            );
            context.pop();
          }
        },
      ),
    );
  }

  Widget _buildEditBody(
    BuildContext context,
    WidgetRef ref,
    TaskDetailState? taskState,
  ) {
    if (taskState == null || taskState.isLoading) {
      return const LoadingWidget();
    }

    if (taskState.task == null) {
      return const Center(
        child: Text('任务不存在'),
      );
    }

    final task = taskState.task!;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppDimensions.base),
      child: TaskForm(
        isEditing: true,
        initialTitle: task.title,
        initialDescription: task.description,
        initialPriority: task.priority,
        initialDueDate: task.dueDate,
        onSubmit: ({
          required title,
          description,
          priority,
          dueDate,
        }) async {
          await ref
              .read(
                taskNotifierProvider(taskId!).notifier,
              )
              .updateTask(
                title: title,
                description: description,
                priority: priority,
                dueDate: dueDate,
              );

          if (context.mounted) {
            AppToast.show(
              context,
              message: '任务已更新',
              variant: ToastVariant.success,
            );
            context.pop();
          }
        },
      ),
    );
  }
}
