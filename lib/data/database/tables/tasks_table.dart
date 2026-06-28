import 'package:drift/drift.dart';

import '../../../domain/entities/enums.dart';
import 'branches_table.dart';

/// 任务表定义
@DataClassName('TaskData')
class Tasks extends Table {
  TextColumn get id => text()();
  TextColumn get branchId => text().references(Branches, #id)();
  TextColumn get title => text()();
  TextColumn get description => text().nullable()();
  IntColumn get status => intEnum<TaskStatus>()();
  IntColumn get priority => intEnum<Priority>()();
  DateTimeColumn get dueDate => dateTime().nullable()();
  DateTimeColumn get completedAt => dateTime().nullable()();
  TextColumn get parentTaskId => text().nullable()();
  IntColumn get sortOrder =>
      integer().withDefault(const Constant(0))();
  BoolColumn get isDeleted =>
      boolean().withDefault(const Constant(false))();
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get updatedAt => dateTime()();

  @override
  Set<Column> get primaryKey => {id};
}
