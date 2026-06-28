import '../../entities/commit.dart' as entity;
import '../../entities/enums.dart';
import '../../entities/task.dart';
import '../../repositories/i_commit_repository.dart';
import '../../repositories/i_task_repository.dart';

/// 完成任务用例
class CompleteTaskUseCase {
  CompleteTaskUseCase(
    this._taskRepository,
    this._commitRepository,
  );

  final ITaskRepository _taskRepository;
  final ICommitRepository _commitRepository;

  Future<Task> execute(String taskId) async {
    final task = await _taskRepository.getById(taskId);
    if (task == null) {
      throw ArgumentError('任务不存在: $taskId');
    }

    if (task.status == TaskStatus.done) {
      throw StateError('任务已完成');
    }

    final updated = task.copyWith(
      status: TaskStatus.done,
      completedAt: DateTime.now(),
    );

    final savedTask = await _taskRepository.update(updated);

    // 记录完成提交
    await _commitRepository.create(
      entity.Commit.create(
        taskId: savedTask.id,
        branchId: savedTask.branchId,
        message: '完成任务: ${savedTask.title}',
        type: CommitType.complete,
      ),
    );

    return savedTask;
  }
}
