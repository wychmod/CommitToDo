import 'package:uuid/uuid.dart';

import '../../domain/entities/repository.dart';
import '../../domain/repositories/i_repository_repository.dart';
import '../database/app_database.dart';
import '../models/repository_model.dart';

/// 仓库仓储实现
class LocalRepositoryRepository implements IRepositoryRepository {
  LocalRepositoryRepository(this._db);

  final AppDatabase _db;

  @override
  Future<List<Repository>> getAll() async {
    final data = await _db.repositoryDao.getAll();
    return data.map((d) => d.toEntity()).toList();
  }

  @override
  Future<Repository?> getById(String id) async {
    final data = await _db.repositoryDao.getById(id);
    return data?.toEntity();
  }

  @override
  Future<Repository> create(Repository repository) async {
    final id = const Uuid().v4();
    final now = DateTime.now();

    // 插入仓库
    await _db.repositoryDao.insert(
      repository.copyWith(id: id).toData(),
    );

    // 自动创建 main 分支
    await _db.branchDao.insert(
      BranchData(
        id: const Uuid().v4(),
        repositoryId: id,
        name: 'main',
        isMain: true,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      ),
    );

    return repository.copyWith(id: id);
  }

  @override
  Future<Repository> update(Repository repository) async {
    final updated = repository.copyWith(
      updatedAt: DateTime.now(),
    );
    await _db.repositoryDao.update_(updated.toData());
    return updated;
  }

  @override
  Future<void> delete(String id) async {
    await _db.repositoryDao.delete(id);
  }

  @override
  Future<void> restore(String id) async {
    await _db.repositoryDao.restore(id);
  }
}
