import 'package:flutter_test/flutter_test.dart';
import 'package:commit/domain/entities/branch.dart';
import 'package:commit/domain/entities/commit.dart' as entity;
import 'package:commit/domain/entities/enums.dart';
import 'package:commit/domain/entities/task.dart';
import 'package:commit/domain/repositories/i_branch_repository.dart';
import 'package:commit/domain/repositories/i_commit_repository.dart';
import 'package:commit/domain/repositories/i_task_repository.dart';
import 'package:commit/domain/usecases/branch/merge_branch_usecase.dart';

void main() {
  group('MergeBranchUseCase', () {
    late FakeBranchRepository branchRepository;
    late FakeTaskRepository taskRepository;
    late FakeCommitRepository commitRepository;
    late MergeBranchUseCase useCase;

    setUp(() {
      branchRepository = FakeBranchRepository();
      taskRepository = FakeTaskRepository();
      commitRepository = FakeCommitRepository();
      useCase = MergeBranchUseCase(
        branchRepository,
        taskRepository,
        commitRepository,
      );
    });

    test('moves unfinished tasks to target branch and deletes source', () async {
      branchRepository
        ..seed(sampleBranch(id: 'source', name: 'feature'))
        ..seed(sampleBranch(id: 'target', name: 'main', isMain: true));
      taskRepository
        ..seed(sampleTask(id: 'todo', branchId: 'source'))
        ..seed(
          sampleTask(
            id: 'done',
            branchId: 'source',
            status: TaskStatus.done,
          ),
        );

      await useCase.execute(
        sourceBranchId: 'source',
        targetBranchId: 'target',
      );

      expect(taskRepository.updatedTasks, hasLength(1));
      expect(taskRepository.updatedTasks.single.id, 'todo');
      expect(taskRepository.updatedTasks.single.branchId, 'target');
      expect(commitRepository.createdCommits, hasLength(1));
      expect(commitRepository.createdCommits.single.type, CommitType.merge);
      expect(commitRepository.createdCommits.single.branchId, 'target');
      expect(branchRepository.deletedIds, ['source']);
    });

    test('throws ArgumentError when source and target are same', () async {
      expect(
        () => useCase.execute(
          sourceBranchId: 'same',
          targetBranchId: 'same',
        ),
        throwsA(isA<ArgumentError>()),
      );
    });

    test('throws ArgumentError when source branch is missing', () async {
      branchRepository.seed(sampleBranch(id: 'target', name: 'main'));

      expect(
        () => useCase.execute(
          sourceBranchId: 'missing',
          targetBranchId: 'target',
        ),
        throwsA(isA<ArgumentError>()),
      );
    });
  });
}

Branch sampleBranch({
  required String id,
  required String name,
  bool isMain = false,
}) {
  final now = DateTime(2026, 5, 28, 10);
  return Branch(
    id: id,
    repositoryId: 'repo-1',
    name: name,
    isMain: isMain,
    createdAt: now,
    updatedAt: now,
  );
}

Task sampleTask({
  required String id,
  required String branchId,
  TaskStatus status = TaskStatus.todo,
}) {
  final now = DateTime(2026, 5, 28, 10);
  return Task(
    id: id,
    branchId: branchId,
    title: id,
    status: status,
    createdAt: now,
    updatedAt: now,
  );
}

class FakeBranchRepository implements IBranchRepository {
  final Map<String, Branch> _branches = {};
  final List<String> deletedIds = [];

  void seed(Branch branch) => _branches[branch.id] = branch;

  @override
  Future<Branch> create(Branch branch) async {
    _branches[branch.id] = branch;
    return branch;
  }

  @override
  Future<void> delete(String id) async {
    deletedIds.add(id);
    final branch = _branches[id];
    if (branch != null) {
      _branches[id] = branch.copyWith(isDeleted: true);
    }
  }

  @override
  Future<List<Branch>> getAll() async => _branches.values.toList();

  @override
  Future<Branch?> getById(String id) async => _branches[id];

  @override
  Future<List<Branch>> getByRepositoryId(String repositoryId) async {
    return _branches.values
        .where((branch) => branch.repositoryId == repositoryId)
        .toList();
  }

  @override
  Future<Branch> update(Branch branch) async {
    _branches[branch.id] = branch;
    return branch;
  }
}

class FakeTaskRepository implements ITaskRepository {
  final Map<String, Task> _tasks = {};
  final List<Task> updatedTasks = [];

  void seed(Task task) => _tasks[task.id] = task;

  @override
  Future<Task> create(Task task) async {
    _tasks[task.id] = task;
    return task;
  }

  @override
  Future<void> delete(String id) async {
    final task = _tasks[id];
    if (task != null) _tasks[id] = task.copyWith(isDeleted: true);
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
  Future<List<Task>> search(String query) async => [];

  @override
  Future<List<Task>> searchInRepository(
    String repositoryId,
    String query,
  ) async {
    return [];
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
