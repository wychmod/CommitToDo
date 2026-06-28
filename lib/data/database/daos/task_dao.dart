import 'package:drift/drift.dart';

import '../app_database.dart';
import '../tables/branches_table.dart';
import '../tables/repositories_table.dart';
import '../tables/tasks_table.dart';

part 'task_dao.g.dart';

/// 任务 DAO
@DriftAccessor(tables: [Tasks, Branches, Repositories])
class TaskDao extends DatabaseAccessor<AppDatabase>
    with _$TaskDaoMixin {
  TaskDao(AppDatabase db) : super(db);

  /// 获取所有未删除的任务
  Future<List<TaskData>> getAll() async {
    return (select(tasks)
          ..where((t) => t.isDeleted.equals(false))
          ..orderBy([(t) => OrderingTerm.desc(t.updatedAt)]))
        .get();
  }

  /// 根据分支 ID 获取任务列表
  Future<List<TaskData>> getByBranchId(String branchId) async {
    return (select(tasks)
          ..where((t) =>
              t.branchId.equals(branchId) &
              t.isDeleted.equals(false))
          ..orderBy([
            (t) => OrderingTerm.asc(t.status),
            (t) => OrderingTerm.desc(t.priority),
            (t) => OrderingTerm.asc(t.sortOrder),
          ]))
        .get();
  }

  /// 根据 ID 获取任务
  Future<TaskData?> getById(String id) async {
    return (select(tasks)
          ..where((t) => t.id.equals(id)))
        .getSingleOrNull();
  }

  /// 插入任务
  Future<void> insert(TaskData task) async {
    into(tasks).insert(task);
  }

  /// 更新任务
  Future<void> update_(TaskData task) async {
    (update(tasks)..where((t) => t.id.equals(task.id)))
        .write(task);
  }

  /// 软删除任务
  Future<void> delete(String id) async {
    (update(tasks)..where((t) => t.id.equals(id)))
        .write(
      TasksCompanion(
        isDeleted: const Value(true),
        updatedAt: Value(DateTime.now()),
      ),
    );
  }

  /// 全局搜索任务
  Future<List<TaskData>> search(String query) async {
    final lowercaseQuery = '%${query.toLowerCase()}%';
    return (select(tasks)
          ..where((t) =>
              t.isDeleted.equals(false) &
              (t.title.like(lowercaseQuery) |
                  t.description.like(lowercaseQuery)))
          ..orderBy([(t) => OrderingTerm.desc(t.updatedAt)])
          ..limit(50))
        .get();
  }

  /// 按仓库搜索任务
  Future<List<TaskData>> searchInRepository(
    String repositoryId,
    String query,
  ) async {
    final lowercaseQuery = '%${query.toLowerCase()}%';

    final branchIdsQuery = select(branches)
      ..where((b) =>
          b.repositoryId.equals(repositoryId) &
          b.isDeleted.equals(false))
      ..map((b) => b.id);

    return (select(tasks)
          ..where((t) =>
              t.isDeleted.equals(false) &
              t.branchId.isInQuery(branchIdsQuery) &
              (t.title.like(lowercaseQuery) |
                  t.description.like(lowercaseQuery)))
          ..orderBy([(t) => OrderingTerm.desc(t.updatedAt)])
          ..limit(50))
        .get();
  }

  /// 按状态统计任务数量
  Future<int> countByStatus(
    String branchId,
    int status,
  ) async {
    final count = tasks.id.count();
    final query = selectOnly(tasks)
      ..addColumns([count])
      ..where(tasks.branchId.equals(branchId) &
          tasks.status.equals(status) &
          tasks.isDeleted.equals(false));
    final result = await query.getSingle();
    return result.read(count) ?? 0;
  }

  /// 获取已完成任务（按日期范围）
  Future<List<TaskData>> getCompletedByDateRange(
    DateTime start,
    DateTime end,
  ) async {
    return (select(tasks)
          ..where((t) =>
              t.isDeleted.equals(false) &
              t.status.equals(2) &
              t.completedAt.isNotNull() &
              t.completedAt.isBiggerOrEqualValue(start) &
              t.completedAt.isSmallerOrEqualValue(end))
          ..orderBy(
            [(t) => OrderingTerm.desc(t.completedAt)],
          ))
        .get();
  }
}
