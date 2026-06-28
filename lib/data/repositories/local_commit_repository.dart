import '../../domain/entities/commit.dart' as entity;
import '../../domain/repositories/i_commit_repository.dart';
import '../database/app_database.dart';
import '../models/commit_model.dart';

/// 提交仓储实现
class LocalCommitRepository implements ICommitRepository {
  LocalCommitRepository(this._db);

  final AppDatabase _db;

  @override
  Future<List<entity.Commit>> getByTaskId(
    String taskId,
  ) async {
    final data = await _db.commitDao.getByTaskId(taskId);
    return data.map((d) => d.toEntity()).toList();
  }

  @override
  Future<List<entity.Commit>> getByBranchId(
    String branchId,
  ) async {
    final data =
        await _db.commitDao.getByBranchId(branchId);
    return data.map((d) => d.toEntity()).toList();
  }

  @override
  Future<entity.Commit> create(entity.Commit commit) async {
    await _db.commitDao.insert(commit.toData());
    return commit;
  }
}
