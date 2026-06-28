import '../entities/repository.dart';

/// 仓库仓库接口
abstract class IRepositoryRepository {
  /// 获取所有仓库
  Future<List<Repository>> getAll();

  /// 根据 ID 获取仓库
  Future<Repository?> getById(String id);

  /// 创建仓库
  Future<Repository> create(Repository repository);

  /// 更新仓库
  Future<Repository> update(Repository repository);

  /// 删除仓库（软删除）
  Future<void> delete(String id);

  /// 恢复仓库
  Future<void> restore(String id);
}
