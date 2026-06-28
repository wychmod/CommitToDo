import 'package:drift/drift.dart';

import '../app_database.dart';
import '../tables/branches_table.dart';
import '../tables/tasks_table.dart';

part 'branch_dao.g.dart';

/// 分支 DAO
@DriftAccessor(tables: [Branches, Tasks])
class BranchDao extends DatabaseAccessor<AppDatabase>
    with _$BranchDaoMixin {
  BranchDao(AppDatabase db) : super(db);

  /// 获取所有未删除的分支
  Future<List<BranchData>> getAll() async {
    return (select(branches)
          ..where((b) => b.isDeleted.equals(false))
          ..orderBy([(b) => OrderingTerm.desc(b.createdAt)]))
        .get();
  }

  /// 根据仓库 ID 获取分支列表
  Future<List<BranchData>> getByRepositoryId(
    String repositoryId,
  ) async {
    return (select(branches)
          ..where((b) =>
              b.repositoryId.equals(repositoryId) &
              b.isDeleted.equals(false))
          ..orderBy([
            (b) => OrderingTerm.desc(b.isMain),
            (b) => OrderingTerm.desc(b.createdAt),
          ]))
        .get();
  }

  /// 根据 ID 获取分支
  Future<BranchData?> getById(String id) async {
    return (select(branches)
          ..where((b) => b.id.equals(id)))
        .getSingleOrNull();
  }

  /// 插入分支
  Future<void> insert(BranchData branch) async {
    await into(branches).insert(branch);
  }

  /// 更新分支
  Future<void> update_(BranchData branch) async {
    (update(branches)
          ..where((b) => b.id.equals(branch.id)))
        .write(branch);
  }

  /// 软删除分支及其任务
  Future<void> delete(String id) async {
    await transaction(() async {
      final now = DateTime.now();
      await (update(branches)..where((b) => b.id.equals(id)))
          .write(
        BranchesCompanion(
          isDeleted: const Value(true),
          updatedAt: Value(now),
        ),
      );
      await (update(tasks)..where((t) => t.branchId.equals(id)))
          .write(
        TasksCompanion(
          isDeleted: const Value(true),
          updatedAt: Value(now),
        ),
      );
    });
  }
}
