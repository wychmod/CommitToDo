import '../../domain/entities/branch.dart';
import '../../domain/repositories/i_branch_repository.dart';
import '../database/app_database.dart';
import '../models/branch_model.dart';

/// 分支仓储实现
class LocalBranchRepository implements IBranchRepository {
  LocalBranchRepository(this._db);

  final AppDatabase _db;

  @override
  Future<List<Branch>> getAll() async {
    final data = await _db.branchDao.getAll();
    return data.map((d) => d.toEntity()).toList();
  }

  @override
  Future<List<Branch>> getByRepositoryId(
    String repositoryId,
  ) async {
    final data = await _db.branchDao
        .getByRepositoryId(repositoryId);
    return data.map((d) => d.toEntity()).toList();
  }

  @override
  Future<Branch?> getById(String id) async {
    final data = await _db.branchDao.getById(id);
    return data?.toEntity();
  }

  @override
  Future<Branch> create(Branch branch) async {
    await _db.branchDao.insert(branch.toData());
    return branch;
  }

  @override
  Future<Branch> update(Branch branch) async {
    final updated = branch.copyWith(
      updatedAt: DateTime.now(),
    );
    await _db.branchDao.update_(updated.toData());
    return updated;
  }

  @override
  Future<void> delete(String id) async {
    await _db.branchDao.delete(id);
  }
}
