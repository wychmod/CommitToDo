import '../../entities/commit.dart' as entity;
import '../../entities/enums.dart';
import '../../repositories/i_commit_repository.dart';
import '../../repositories/i_task_repository.dart';

/// 删除任务用例
class DeleteTaskUseCase {
  DeleteTaskUseCase(
    this._taskRepository,
    this._commitRepository,
  );

  final ITaskRepository _taskRepository;
  final ICommitRepository _commitRepository;

  Future<void> execute(String taskId) async {
    final task = await _taskRepository.getById(taskId);
    if (task == null) {
      throw ArgumentError('任务不存在: $taskId');
    }

    // 记录删除提交
    await _commitRepository.create(
      entity.Commit.create(
        taskId: task.id,
        branchId: task.branchId,
        message: '删除任务: ${task.title}',
        type: CommitType.delete,
      ),
    );

    await _taskRepository.delete(taskId);
  }
}
