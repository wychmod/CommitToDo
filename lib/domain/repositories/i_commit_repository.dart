import '../entities/commit.dart';

/// 提交仓库接口
abstract class ICommitRepository {
  /// 根据任务 ID 获取提交列表
  Future<List<Commit>> getByTaskId(String taskId);

  /// 根据分支 ID 获取提交列表
  Future<List<Commit>> getByBranchId(String branchId);

  /// 创建提交
  Future<Commit> create(Commit commit);
}
