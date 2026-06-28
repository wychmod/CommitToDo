import '../../domain/entities/task.dart';
import '../../domain/repositories/i_task_repository.dart';
import '../database/app_database.dart';
import '../models/task_model.dart';

/// 任务仓储实现
class LocalTaskRepository implements ITaskRepository {
  LocalTaskRepository(this._db);

  final AppDatabase _db;

  @override
  Future<List<Task>> getAll() async {
    final data = await _db.taskDao.getAll();
    return data.map((d) => d.toEntity()).toList();
  }

  @override
  Future<List<Task>> getByBranchId(String branchId) async {
    final data = await _db.taskDao.getByBranchId(branchId);
    return data.map((d) => d.toEntity()).toList();
  }

  @override
  Future<Task?> getById(String id) async {
    final data = await _db.taskDao.getById(id);
    return data?.toEntity();
  }

  @override
  Future<Task> create(Task task) async {
    await _db.taskDao.insert(task.toData());
    return task;
  }

  @override
  Future<Task> update(Task task) async {
    final updated = task.copyWith(
      updatedAt: DateTime.now(),
    );
    await _db.taskDao.update_(updated.toData());
    return updated;
  }

  @override
  Future<void> delete(String id) async {
    await _db.taskDao.delete(id);
  }

  @override
  Future<List<Task>> search(String query) async {
    final data = await _db.taskDao.search(query);
    return data.map((d) => d.toEntity()).toList();
  }

  @override
  Future<List<Task>> searchInRepository(
    String repositoryId,
    String query,
  ) async {
    final data = await _db.taskDao
        .searchInRepository(repositoryId, query);
    return data.map((d) => d.toEntity()).toList();
  }

  /// 获取按日期范围已完成的任务
  @override
  Future<List<Task>> getCompletedByDateRange(
    DateTime start,
    DateTime end,
  ) async {
    final data = await _db.taskDao
        .getCompletedByDateRange(start, end);
    return data.map((d) => d.toEntity()).toList();
  }
}
