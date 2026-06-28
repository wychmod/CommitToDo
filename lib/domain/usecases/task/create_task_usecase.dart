import '../../entities/commit.dart' as entity;
import '../../entities/enums.dart';
import '../../entities/task.dart';
import '../../repositories/i_commit_repository.dart';
import '../../repositories/i_task_repository.dart';

/// 创建任务用例
class CreateTaskUseCase {
  CreateTaskUseCase(
    this._taskRepository,
    this._commitRepository,
  );

  final ITaskRepository _taskRepository;
  final ICommitRepository _commitRepository;

  Future<Task> execute({
    required String branchId,
    required String title,
    String? description,
    Priority priority = Priority.medium,
    DateTime? dueDate,
    String? parentTaskId,
  }) async {
    if (title.trim().isEmpty) {
      throw ArgumentError('任务标题不能为空');
    }

    final task = Task.create(
      branchId: branchId,
      title: title.trim(),
      description: description,
      priority: priority,
      dueDate: dueDate,
      parentTaskId: parentTaskId,
    );

    final createdTask = await _taskRepository.create(task);

    // 记录创建提交
    await _commitRepository.create(
      entity.Commit.create(
        taskId: createdTask.id,
        branchId: branchId,
        message: '创建任务: ${createdTask.title}',
        type: CommitType.create,
      ),
    );

    return createdTask;
  }
}
