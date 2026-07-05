import '../../../domain/entities/branch.dart';
import '../../../domain/entities/repository.dart';
import '../../../domain/entities/task.dart';

/// 仓库详情页状态
class RepositoryScreenState {
  const RepositoryScreenState({
    this.repository,
    this.branches = const [],
    this.tasks = const [],
    this.activeBranchId,
    this.selectedTaskId,
    this.isLoading = false,
    this.error,
  });

  final Repository? repository;
  final List<Branch> branches;
  final List<Task> tasks;
  final String? activeBranchId;
  final String? selectedTaskId;
  final bool isLoading;
  final String? error;

  Branch? get activeBranch {
    if (activeBranchId == null) return null;
    try {
      return branches.firstWhere(
        (b) => b.id == activeBranchId,
      );
    } catch (_) {
      return null;
    }
  }

  RepositoryScreenState copyWith({
    Repository? repository,
    List<Branch>? branches,
    List<Task>? tasks,
    String? activeBranchId,
    String? selectedTaskId,
    bool? isLoading,
    String? error,
    bool clearSelectedTaskId = false,
  }) {
    return RepositoryScreenState(
      repository: repository ?? this.repository,
      branches: branches ?? this.branches,
      tasks: tasks ?? this.tasks,
      activeBranchId: activeBranchId ?? this.activeBranchId,
      selectedTaskId: clearSelectedTaskId
          ? null
          : (selectedTaskId ?? this.selectedTaskId),
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}
