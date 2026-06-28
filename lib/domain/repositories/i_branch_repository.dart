import '../entities/branch.dart';

/// 分支仓库接口
abstract class IBranchRepository {
  /// 获取所有分支
  Future<List<Branch>> getAll();

  /// 根据仓库 ID 获取分支列表
  Future<List<Branch>> getByRepositoryId(String repositoryId);

  /// 根据 ID 获取分支
  Future<Branch?> getById(String id);

  /// 创建分支
  Future<Branch> create(Branch branch);

  /// 更新分支
  Future<Branch> update(Branch branch);

  /// 删除分支（软删除）
  Future<void> delete(String id);
}
