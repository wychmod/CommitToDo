import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/di/injection_container.dart';
import '../../../domain/entities/commit.dart';
import '../../../domain/entities/enums.dart';
import '../../../domain/entities/task.dart';
import '../../../domain/repositories/i_commit_repository.dart';
import '../../../domain/repositories/i_task_repository.dart';
import '../../../domain/usecases/task/complete_task_usecase.dart';
import '../../../domain/usecases/task/delete_task_usecase.dart';
import '../../../domain/usecases/task/update_task_usecase.dart';

/// 任务详情状态
class TaskDetailState {
  const TaskDetailState({
    this.task,
    this.commits = const [],
    this.isLoading = false,
    this.error,
  });

  final Task? task;
  final List<Commit> commits;
  final bool isLoading;
  final String? error;

  TaskDetailState copyWith({
    Task? task,
    List<Commit>? commits,
    bool? isLoading,
    String? error,
  }) {
    return TaskDetailState(
      task: task ?? this.task,
      commits: commits ?? this.commits,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

/// 任务详情 Notifier
class TaskNotifier extends StateNotifier<TaskDetailState> {
  TaskNotifier(this._taskId)
      : super(const TaskDetailState()) {
    _taskRepo = getIt<ITaskRepository>();
    _commitRepo = getIt<ICommitRepository>();
    _updateTaskUseCase = getIt<UpdateTaskUseCase>();
    _completeTaskUseCase = getIt<CompleteTaskUseCase>();
    _deleteTaskUseCase = getIt<DeleteTaskUseCase>();
    loadData();
  }

  final String _taskId;
  late final ITaskRepository _taskRepo;
  late final ICommitRepository _commitRepo;
  late final UpdateTaskUseCase _updateTaskUseCase;
  late final CompleteTaskUseCase _completeTaskUseCase;
  late final DeleteTaskUseCase _deleteTaskUseCase;

  Future<void> loadData() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final task = await _taskRepo.getById(_taskId);
      final commits = await _commitRepo.getByTaskId(_taskId);
      state = state.copyWith(
        task: task,
        commits: commits,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  Future<void> updateTask({
    String? title,
    String? description,
    TaskStatus? status,
    Priority? priority,
    DateTime? dueDate,
  }) async {
    try {
      await _updateTaskUseCase.execute(
        id: _taskId,
        title: title,
        description: description,
        status: status,
        priority: priority,
        dueDate: dueDate,
      );
      await loadData();
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  Future<void> completeTask() async {
    try {
      await _completeTaskUseCase.execute(_taskId);
      await loadData();
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  /// 重新打开任务（将已完成/已取消任务置为待办）
  Future<void> reopenTask() async {
    try {
      await _updateTaskUseCase.execute(
        id: _taskId,
        status: TaskStatus.todo,
      );
      await loadData();
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  Future<void> deleteTask() async {
    try {
      await _deleteTaskUseCase.execute(_taskId);
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }
}

/// 任务详情 Notifier Provider
final taskNotifierProvider = StateNotifierProvider
    .family<TaskNotifier, TaskDetailState, String>(
  (ref, taskId) => TaskNotifier(taskId),
);
