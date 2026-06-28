import 'package:drift/drift.dart';

import '../app_database.dart';
import '../tables/commits_table.dart';

part 'commit_dao.g.dart';

/// 提交 DAO
@DriftAccessor(tables: [Commits])
class CommitDao extends DatabaseAccessor<AppDatabase>
    with _$CommitDaoMixin {
  CommitDao(AppDatabase db) : super(db);

  /// 根据任务 ID 获取提交列表
  Future<List<CommitData>> getByTaskId(String taskId) async {
    return (select(commits)
          ..where((c) => c.taskId.equals(taskId))
          ..orderBy(
            [(c) => OrderingTerm.desc(c.createdAt)],
          ))
        .get();
  }

  /// 根据分支 ID 获取提交列表
  Future<List<CommitData>> getByBranchId(
    String branchId,
  ) async {
    return (select(commits)
          ..where((c) => c.branchId.equals(branchId))
          ..orderBy(
            [(c) => OrderingTerm.desc(c.createdAt)],
          ))
        .get();
  }

  /// 插入提交
  Future<void> insert(CommitData commit) async {
    into(commits).insert(commit);
  }
}
