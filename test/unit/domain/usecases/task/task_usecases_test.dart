import 'package:flutter_test/flutter_test.dart';
import 'package:commit/domain/entities/commit.dart' as entity;
import 'package:commit/domain/entities/enums.dart';
import 'package:commit/domain/entities/task.dart';
import 'package:commit/domain/repositories/i_commit_repository.dart';
import 'package:commit/domain/repositories/i_task_repository.dart';
import 'package:commit/domain/usecases/task/complete_task_usecase.dart';
import 'package:commit/domain/usecases/task/create_task_usecase.dart';
import 'package:commit/domain/usecases/task/delete_task_usecase.dart';

void main() {
  group('CreateTaskUseCase', () {
    late FakeTaskRepository taskRepository;
    late FakeCommitRepository commitRepository;
    late CreateTaskUseCase useCase;

    setUp(() {
      taskRepository = FakeTaskRepository();
      commitRepository = FakeCommitRepository();
      useCase = CreateTaskUseCase(taskRepository, commitRepository);
    });

    test('creates task with trimmed title and records commit', () async {
      final task = await useCase.execute(
        branchId: 'branch-1',
        title: '  设计数据库架构  ',
        priority: Priority.high,
      );

      expect(task.title, '设计数据库架构');
      expect(task.branchId, 'branch-1');
      expect(task.priority, Priority.high);
      expect(taskRepository.createdTasks, hasLength(1));
      expect(commitRepository.createdCommits, hasLength(1));
      expect(commitRepository.createdCommits.single.type, CommitType.create);
      expect(
        commitRepository.createdCommits.single.message,
        '创建任务: 设计数据库架构',
      );
    });

    test('throws ArgumentError when title is empty', () async {
      expect(
        () => useCase.execute(branchId: 'branch-1', title: '   '),
        throwsA(isA<ArgumentError>()),
      );
      expect(taskRepository.createdTasks, isEmpty);
      expect(commitRepository.createdCommits, isEmpty);
    });
  });

  group('CompleteTaskUseCase', () {
    late FakeTaskRepository taskRepository;
    late FakeCommitRepository commitRepository;
    late CompleteTaskUseCase useCase;

    setUp(() {
      taskRepository = FakeTaskRepository();
      commitRepository = FakeCommitRepository();
      useCase = CompleteTaskUseCase(taskRepository, commitRepository);
    });

    test('marks task as done, sets completedAt and records commit', () async {
      final task = sampleTask(id: 'task-1');
      taskRepository.seed(task);

      final result = await useCase.execute('task-1');

      expect(result.status, TaskStatus.done);
      expect(result.completedAt, isNotNull);
      expect(taskRepository.updatedTasks.single.status, TaskStatus.done);
      expect(commitRepository.createdCommits.single.type, CommitType.complete);
      expect(
        commitRepository.createdCommits.single.message,
        '完成任务: ${task.title}',
      );
    });

    test('throws StateError for already completed task', () async {
      taskRepository.seed(
        sampleTask(id: 'task-1', status: TaskStatus.done),
      );

      expect(
        () => useCase.execute('task-1'),
        throwsA(isA<StateError>()),
      );
      expect(taskRepository.updatedTasks, isEmpty);
      expect(commitRepository.createdCommits, isEmpty);
    });
  });

  group('DeleteTaskUseCase', () {
    late FakeTaskRepository taskRepository;
    late FakeCommitRepository commitRepository;
    late DeleteTaskUseCase useCase;

    setUp(() {
      taskRepository = FakeTaskRepository();
      commitRepository = FakeCommitRepository();
      useCase = DeleteTaskUseCase(taskRepository, commitRepository);
    });

    test('records delete commit before soft deleting task', () async {
      final task = sampleTask(id: 'task-1');
      taskRepository.seed(task);

      await useCase.execute('task-1');

      expect(commitRepository.createdCommits.single.type, CommitType.delete);
      expect(commitRepository.createdCommits.single.branchId, task.branchId);
      expect(taskRepository.deletedIds, ['task-1']);
    });

    test('throws ArgumentError when task does not exist', () async {
      expect(
        () => useCase.execute('missing'),
        throwsA(isA<ArgumentError>()),
      );
      expect(commitRepository.createdCommits, isEmpty);
      expect(taskRepository.deletedIds, isEmpty);
    });
  });
}

Task sampleTask({
  String id = 'task-1',
  String branchId = 'branch-1',
  String title = '示例任务',
  TaskStatus status = TaskStatus.todo,
  Priority priority = Priority.medium,
  DateTime? completedAt,
}) {
  final now = DateTime(2026, 5, 28, 10);
  return Task(
    id: id,
    branchId: branchId,
    title: title,
    status: status,
    priority: priority,
    completedAt: completedAt,
    createdAt: now,
    updatedAt: now,
  );
}

class FakeTaskRepository implements ITaskRepository {
  final Map<String, Task> _tasks = {};
  final List<Task> createdTasks = [];
  final List<Task> updatedTasks = [];
  final List<String> deletedIds = [];

  void seed(Task task) => _tasks[task.id] = task;

  @override
  Future<Task> create(Task task) async {
    createdTasks.add(task);
    _tasks[task.id] = task;
    return task;
  }

  @override
  Future<void> delete(String id) async {
    deletedIds.add(id);
    final task = _tasks[id];
    if (task != null) {
      _tasks[id] = task.copyWith(isDeleted: true);
    }
  }

  @override
  Future<List<Task>> getAll() async => _tasks.values.toList();

  @override
  Future<List<Task>> getByBranchId(String branchId) async {
    return _tasks.values
        .where((task) => task.branchId == branchId && !task.isDeleted)
        .toList();
  }

  @override
  Future<Task?> getById(String id) async => _tasks[id];

  @override
  Future<List<Task>> getCompletedByDateRange(
    DateTime start,
    DateTime end,
  ) async {
    return _tasks.values.where((task) {
      final completedAt = task.completedAt;
      return !task.isDeleted &&
          task.status == TaskStatus.done &&
          completedAt != null &&
          !completedAt.isBefore(start) &&
          !completedAt.isAfter(end);
    }).toList();
  }

  @override
  Future<List<Task>> search(String query) async {
    return _tasks.values
        .where((task) => task.title.contains(query) && !task.isDeleted)
        .toList();
  }

  @override
  Future<List<Task>> searchInRepository(
    String repositoryId,
    String query,
  ) async {
    return search(query);
  }

  @override
  Future<Task> update(Task task) async {
    updatedTasks.add(task);
    _tasks[task.id] = task;
    return task;
  }
}

class FakeCommitRepository implements ICommitRepository {
  final List<entity.Commit> createdCommits = [];

  @override
  Future<entity.Commit> create(entity.Commit commit) async {
    createdCommits.add(commit);
    return commit;
  }

  @override
  Future<List<entity.Commit>> getByBranchId(String branchId) async {
    return createdCommits
        .where((commit) => commit.branchId == branchId)
        .toList();
  }

  @override
  Future<List<entity.Commit>> getByTaskId(String taskId) async {
    return createdCommits
        .where((commit) => commit.taskId == taskId)
        .toList();
  }
}
