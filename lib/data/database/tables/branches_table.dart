import 'package:drift/drift.dart';

import 'repositories_table.dart';

/// 分支表定义
@DataClassName('BranchData')
class Branches extends Table {
  TextColumn get id => text()();
  TextColumn get repositoryId =>
      text().references(Repositories, #id)();
  TextColumn get name => text()();
  TextColumn get parentBranchId => text().nullable()();
  BoolColumn get isMain =>
      boolean().withDefault(const Constant(false))();
  TextColumn get color => text().nullable()();
  BoolColumn get isDeleted =>
      boolean().withDefault(const Constant(false))();
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get updatedAt => dateTime()();

  @override
  Set<Column> get primaryKey => {id};
}
