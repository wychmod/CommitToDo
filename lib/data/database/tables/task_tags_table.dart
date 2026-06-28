import 'package:drift/drift.dart';

import 'tags_table.dart';
import 'tasks_table.dart';

/// 任务标签关联表
@DataClassName('TaskTagData')
class TaskTags extends Table {
  TextColumn get taskId => text().references(Tasks, #id)();
  TextColumn get tagId => text().references(Tags, #id)();

  @override
  Set<Column> get primaryKey => {taskId, tagId};
}
