/// 数据库常量定义
class DbConstants {
  DbConstants._();

  /// 数据库名称
  static const String dbName = 'commit.db';

  /// 数据库版本
  static const int dbVersion = 1;

  /// 表名
  static const String tableRepositories = 'repositories';
  static const String tableBranches = 'branches';
  static const String tableTasks = 'tasks';
  static const String tableCommits = 'commits';
  static const String tableTags = 'tags';
  static const String tableTaskTags = 'task_tags';

  /// 索引名
  static const String indexTasksBranchId = 'idx_tasks_branch_id';
  static const String indexTasksStatus = 'idx_tasks_status';
  static const String indexTasksDueDate = 'idx_tasks_due_date';
  static const String indexCommitsTaskId = 'idx_commits_task_id';
  static const String indexCommitsBranchId = 'idx_commits_branch_id';
}
