import 'package:drift/drift.dart';

import '../../../domain/entities/enums.dart';
import 'branches_table.dart';
import 'tasks_table.dart';

/// 提交表定义
@DataClassName('CommitData')
class Commits extends Table {
  TextColumn get id => text()();
  TextColumn get taskId => text().references(Tasks, #id)();
  TextColumn get branchId =>
      text().references(Branches, #id)();
  TextColumn get message => text()();
  IntColumn get type => intEnum<CommitType>()();
  DateTimeColumn get createdAt => dateTime()();

  @override
  Set<Column> get primaryKey => {id};
}
