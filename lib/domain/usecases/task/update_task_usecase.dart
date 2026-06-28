import '../../entities/commit.dart' as entity;
import '../../entities/enums.dart';
import '../../entities/task.dart';
import '../../repositories/i_commit_repository.dart';
import '../../repositories/i_task_repository.dart';

/// 更新任务用例
class UpdateTaskUseCase {
  UpdateTaskUseCase(
    this._taskRepository,
    this._commitRepository,
  );

  final ITaskRepository _taskRepository;
  final ICommitRepository _commitRepository;

  Future<Task> execute({
    required String id,
    String? title,
    String? description,
    TaskStatus? status,
    Priority? priority,
    DateTime? dueDate,
    int? sortOrder,
  }) async {
    final existing = await _taskRepository.getById(id);
    if (existing == null) {
      throw ArgumentError('任务不存在: $id');
    }

    // 如果状态变更，验证状态机
    if (status != null && status != existing.status) {
      if (!TaskStateMachine.canTransition(
        existing.status,
        status,
      )) {
        throw StateError(
          '非法状态转换: ${existing.status} -> $status',
        );
      }
    }

    final updated = existing.copyWith(
      title: title ?? existing.title,
      description: description ?? existing.description,
      status: status ?? existing.status,
      priority: priority ?? existing.priority,
      dueDate: dueDate ?? existing.dueDate,
      sortOrder: sortOrder ?? existing.sortOrder,
    );

    final savedTask = await _taskRepository.update(updated);

    // 记录更新提交
    await _commitRepository.create(
      entity.Commit.create(
        taskId: savedTask.id,
        branchId: savedTask.branchId,
        message: '更新任务: ${savedTask.title}',
        type: CommitType.update,
      ),
    );

    return savedTask;
  }
}

/// 任务状态机
class TaskStateMachine {
  static bool canTransition(
    TaskStatus from,
    TaskStatus to,
  ) {
    return switch (from) {
      TaskStatus.todo => [
          TaskStatus.inProgress,
          TaskStatus.done,
          TaskStatus.cancelled,
        ].contains(to),
      TaskStatus.inProgress => [
          TaskStatus.todo,
          TaskStatus.done,
          TaskStatus.cancelled,
        ].contains(to),
      TaskStatus.done => [
          TaskStatus.todo,
        ].contains(to),
      TaskStatus.cancelled => [
          TaskStatus.todo,
        ].contains(to),
    };
  }
}
