import '../entities/task.dart';

/// 任务仓库接口
abstract class ITaskRepository {
  /// 获取所有任务
  Future<List<Task>> getAll();

  /// 根据分支 ID 获取任务列表
  Future<List<Task>> getByBranchId(String branchId);

  /// 根据 ID 获取任务
  Future<Task?> getById(String id);

  /// 创建任务
  Future<Task> create(Task task);

  /// 更新任务
  Future<Task> update(Task task);

  /// 删除任务（软删除）
  Future<void> delete(String id);

  /// 全局搜索任务
  Future<List<Task>> search(String query);

  /// 按仓库搜索任务
  Future<List<Task>> searchInRepository(
    String repositoryId,
    String query,
  );

  /// 获取指定日期范围内已完成的任务
  Future<List<Task>> getCompletedByDateRange(
    DateTime start,
    DateTime end,
  );
}
