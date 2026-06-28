import 'package:drift/drift.dart';
import 'package:drift_sqflite/drift_sqflite.dart';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as p;

import 'dart:io';
import 'daos/branch_dao.dart';
import 'daos/commit_dao.dart';
import 'daos/repository_dao.dart';
import 'daos/task_dao.dart';
import 'tables/branches_table.dart';
import 'tables/commits_table.dart';
import 'tables/repositories_table.dart';
import 'tables/tags_table.dart';
import 'tables/task_tags_table.dart';
import 'tables/tasks_table.dart';

part 'app_database.g.dart';

/// 应用数据库
@DriftDatabase(
  tables: [
    Repositories,
    Branches,
    Tasks,
    Commits,
    Tags,
    TaskTags,
  ],
  daos: [
    RepositoryDao,
    BranchDao,
    TaskDao,
    CommitDao,
  ],
)
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(_openConnection());

  @override
  int get schemaVersion => 1;

  @override
  MigrationStrategy get migration => MigrationStrategy(
        onCreate: (Migrator m) async {
          await m.createAll();
          // 创建索引以优化查询性能
          await customStatement(
            'CREATE INDEX idx_tasks_branch_id ON tasks (branch_id)',
          );
          await customStatement(
            'CREATE INDEX idx_tasks_status ON tasks (status)',
          );
          await customStatement(
            'CREATE INDEX idx_tasks_due_date ON tasks (due_date)',
          );
          await customStatement(
            'CREATE INDEX idx_commits_task_id ON commits (task_id)',
          );
          await customStatement(
            'CREATE INDEX idx_commits_branch_id ON commits (branch_id)',
          );
        },
      );
}

/// 创建数据库连接
LazyDatabase _openConnection() {
  return LazyDatabase(() async {
    final dbFolder = await getApplicationDocumentsDirectory();
    final file = File(p.join(dbFolder.path, 'commit.db'));
    return sqflite.openDatabase(file.path);
  });
}
