import 'package:drift/drift.dart';

import '../app_database.dart';
import '../tables/branches_table.dart';
import '../tables/repositories_table.dart';
import '../tables/tasks_table.dart';

part 'repository_dao.g.dart';

/// 仓库 DAO
@DriftAccessor(tables: [Repositories, Branches, Tasks])
class RepositoryDao extends DatabaseAccessor<AppDatabase>
    with _$RepositoryDaoMixin {
  RepositoryDao(AppDatabase db) : super(db);

  /// 获取所有未删除的仓库
  Future<List<RepositoryData>> getAll() async {
    return (select(repositories)
          ..where((r) =>
              r.isDeleted.equals(false) &
              r.isArchived.equals(false))
          ..orderBy([(r) => OrderingTerm.desc(r.updatedAt)]))
        .get();
  }

  /// 根据 ID 获取仓库
  Future<RepositoryData?> getById(String id) async {
    return (select(repositories)
          ..where((r) => r.id.equals(id)))
        .getSingleOrNull();
  }

  /// 插入仓库
  Future<void> insert(RepositoryData repository) async {
    into(repositories).insert(repository);
  }

  /// 更新仓库
  Future<void> update_(
    RepositoryData repository,
  ) async {
    (update(repositories)
          ..where((r) => r.id.equals(repository.id)))
        .write(repository);
  }

  /// 软删除仓库，并级联软删除关联分支和任务
  Future<void> delete(String id) async {
    await transaction(() async {
      final now = DateTime.now();
      final branchRows = await (select(branches)
            ..where((b) => b.repositoryId.equals(id)))
          .get();
      final branchIds = branchRows.map((b) => b.id).toList();

      await (update(repositories)..where((r) => r.id.equals(id)))
          .write(
        RepositoriesCompanion(
          isDeleted: const Value(true),
          updatedAt: Value(now),
        ),
      );
      await (update(branches)..where((b) => b.repositoryId.equals(id)))
          .write(
        BranchesCompanion(
          isDeleted: const Value(true),
          updatedAt: Value(now),
        ),
      );
      if (branchIds.isNotEmpty) {
        await (update(tasks)..where((t) => t.branchId.isIn(branchIds)))
            .write(
          TasksCompanion(
            isDeleted: const Value(true),
            updatedAt: Value(now),
          ),
        );
      }
    });
  }

  /// 恢复仓库及其主分支
  Future<void> restore(String id) async {
    await transaction(() async {
      final now = DateTime.now();
      await (update(repositories)..where((r) => r.id.equals(id)))
          .write(
        RepositoriesCompanion(
          isDeleted: const Value(false),
          updatedAt: Value(now),
        ),
      );
      await (update(branches)
            ..where(
              (b) => b.repositoryId.equals(id) & b.isMain.equals(true),
            ))
          .write(
        BranchesCompanion(
          isDeleted: const Value(false),
          updatedAt: Value(now),
        ),
      );
    });
  }
}
