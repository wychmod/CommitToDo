import '../../entities/enums.dart';
import '../../entities/commit.dart' as entity;
import '../../repositories/i_branch_repository.dart';
import '../../repositories/i_commit_repository.dart';
import '../../repositories/i_task_repository.dart';

/// 合并分支用例
class MergeBranchUseCase {
  MergeBranchUseCase(
    this._branchRepository,
    this._taskRepository,
    this._commitRepository,
  );

  final IBranchRepository _branchRepository;
  final ITaskRepository _taskRepository;
  final ICommitRepository _commitRepository;

  Future<void> execute({
    required String sourceBranchId,
    required String targetBranchId,
  }) async {
    if (sourceBranchId == targetBranchId) {
      throw ArgumentError('不能合并分支到自身');
    }

    // 1. 验证分支存在
    final sourceBranch =
        await _branchRepository.getById(sourceBranchId);
    if (sourceBranch == null) {
      throw ArgumentError('源分支不存在: $sourceBranchId');
    }

    final targetBranch =
        await _branchRepository.getById(targetBranchId);
    if (targetBranch == null) {
      throw ArgumentError('目标分支不存在: $targetBranchId');
    }

    // 2. 获取源分支的所有任务
    final tasks =
        await _taskRepository.getByBranchId(sourceBranchId);

    // 3. 将未完成的任务移动到目标分支
    for (final task in tasks) {
      if (task.status != TaskStatus.done) {
        await _taskRepository.update(
          task.copyWith(branchId: targetBranchId),
        );

        // 记录合并提交
        await _commitRepository.create(
          entity.Commit.create(
            taskId: task.id,
            branchId: targetBranchId,
            message: '合并自分支: ${sourceBranch.name}',
            type: CommitType.merge,
          ),
        );
      }
    }

    // 4. 删除源分支（软删除）
    await _branchRepository.delete(sourceBranchId);
  }
}
