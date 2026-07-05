import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/di/injection_container.dart';
import '../../../domain/entities/enums.dart';
import '../../../domain/entities/task.dart';
import '../../../domain/repositories/i_branch_repository.dart';
import '../../../domain/repositories/i_commit_repository.dart';
import '../../../domain/repositories/i_repository_repository.dart';
import '../../../domain/repositories/i_task_repository.dart';
import '../../../domain/usecases/branch/create_branch_usecase.dart';
import '../../../domain/usecases/branch/merge_branch_usecase.dart';
import '../../../domain/usecases/task/complete_task_usecase.dart';
import '../../../domain/usecases/task/create_task_usecase.dart';
import '../../../domain/usecases/task/delete_task_usecase.dart';
import 'repository_state.dart';

/// 仓库详情页 Notifier
class RepositoryNotifier
    extends StateNotifier<RepositoryScreenState> {
  RepositoryNotifier(this._repositoryId)
      : super(const RepositoryScreenState()) {
    _repositoryRepo = getIt<IRepositoryRepository>();
    _branchRepo = getIt<IBranchRepository>();
    _taskRepo = getIt<ITaskRepository>();
    _commitRepo = getIt<ICommitRepository>();
    _createBranchUseCase = getIt<CreateBranchUseCase>();
    _mergeBranchUseCase = getIt<MergeBranchUseCase>();
    _createTaskUseCase = getIt<CreateTaskUseCase>();
    _completeTaskUseCase = getIt<CompleteTaskUseCase>();
    _deleteTaskUseCase = getIt<DeleteTaskUseCase>();
    loadData();
  }

  final String _repositoryId;
  late final IRepositoryRepository _repositoryRepo;
  late final IBranchRepository _branchRepo;
  late final ITaskRepository _taskRepo;
  late final ICommitRepository _commitRepo;
  late final CreateBranchUseCase _createBranchUseCase;
  late final MergeBranchUseCase _mergeBranchUseCase;
  late final CreateTaskUseCase _createTaskUseCase;
  late final CompleteTaskUseCase _completeTaskUseCase;
  late final DeleteTaskUseCase _deleteTaskUseCase;

  Future<void> loadData() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final repository = await _repositoryRepo.getById(_repositoryId);
      if (repository == null || repository.isDeleted) {
        throw ArgumentError('仓库不存在: $_repositoryId');
      }

      final branches =
          await _branchRepo.getByRepositoryId(_repositoryId);

      String? activeBranchId = state.activeBranchId;
      if (activeBranchId == null && branches.isNotEmpty) {
        final main = branches.firstWhere(
          (b) => b.isMain,
          orElse: () => branches.first,
        );
        activeBranchId = main.id;
      }

      List<Task> tasks = [];
      if (activeBranchId != null) {
        tasks = await _taskRepo.getByBranchId(
          activeBranchId,
        );
      }

      state = state.copyWith(
        repository: repository,
        branches: branches,
        tasks: tasks,
        activeBranchId: activeBranchId,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  Future<void> switchBranch(String branchId) async {
    state = state.copyWith(
      activeBranchId: branchId,
      selectedTaskId: null,
      isLoading: true,
    );
    try {
      final tasks = await _taskRepo.getByBranchId(branchId);
      state = state.copyWith(
        tasks: tasks,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  Future<Task?> createTask({
    required String title,
    String? description,
    Priority priority = Priority.medium,
    DateTime? dueDate,
  }) async {
    if (state.activeBranchId == null) return null;
    try {
      final task = await _createTaskUseCase.execute(
        branchId: state.activeBranchId!,
        title: title,
        description: description,
        priority: priority,
        dueDate: dueDate,
      );
      await loadData();
      return task;
    } catch (e) {
      state = state.copyWith(error: e.toString());
      return null;
    }
  }

  Future<void> completeTask(String taskId) async {
    try {
      await _completeTaskUseCase.execute(taskId);
      await loadData();
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  Future<void> deleteTask(String taskId) async {
    try {
      await _deleteTaskUseCase.execute(taskId);
      await loadData();
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  void selectTask(String? taskId) {
    state = state.copyWith(selectedTaskId: taskId);
  }

  Future<void> createBranch({
    required String name,
    String color = '#3B82F6',
  }) async {
    try {
      await _createBranchUseCase.execute(
        repositoryId: _repositoryId,
        name: name,
        color: color,
      );
      await loadData();
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  Future<void> mergeBranch(
    String sourceId,
    String targetId,
  ) async {
    try {
      await _mergeBranchUseCase.execute(
        sourceBranchId: sourceId,
        targetBranchId: targetId,
      );
      await loadData();
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }
}
