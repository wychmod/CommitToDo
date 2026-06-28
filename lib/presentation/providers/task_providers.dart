import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/di/injection_container.dart';
import '../../domain/entities/task.dart';
import '../../domain/entities/commit.dart' as entity;
import '../../domain/repositories/i_task_repository.dart';
import '../../domain/repositories/i_commit_repository.dart';

/// 任务仓储 Provider
final taskRepositoryProvider =
    Provider<ITaskRepository>((ref) {
  return getIt<ITaskRepository>();
});

/// 提交仓储 Provider
final commitRepositoryProvider =
    Provider<ICommitRepository>((ref) {
  return getIt<ICommitRepository>();
});

/// 分支下的任务列表 Provider
final branchTasksProvider =
    FutureProvider.family<List<Task>, String>(
  (ref, branchId) async {
    final repo = ref.read(taskRepositoryProvider);
    return await repo.getByBranchId(branchId);
  },
);

/// 任务详情 Provider
final taskDetailProvider =
    FutureProvider.family<Task?, String>((ref, id) async {
  final repo = ref.read(taskRepositoryProvider);
  return await repo.getById(id);
});

/// 任务的提交历史 Provider
final taskCommitsProvider =
    FutureProvider.family<List<entity.Commit>, String>(
  (ref, taskId) async {
    final repo = ref.read(commitRepositoryProvider);
    return await repo.getByTaskId(taskId);
  },
);
