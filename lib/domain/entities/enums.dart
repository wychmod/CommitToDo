/// 任务状态枚举
enum TaskStatus {
  todo(0, '待办'),
  inProgress(1, '进行中'),
  done(2, '已完成'),
  cancelled(3, '已取消');

  final int value;
  final String label;
  const TaskStatus(this.value, this.label);

  /// 从整数值解析
  static TaskStatus fromValue(int value) {
    return TaskStatus.values.firstWhere(
      (e) => e.value == value,
      orElse: () => TaskStatus.todo,
    );
  }
}

/// 优先级枚举
enum Priority {
  low(0, '低'),
  medium(1, '中'),
  high(2, '高');

  final int value;
  final String label;
  const Priority(this.value, this.label);

  /// 从整数值解析
  static Priority fromValue(int value) {
    return Priority.values.firstWhere(
      (e) => e.value == value,
      orElse: () => Priority.medium,
    );
  }
}

/// 提交类型枚举
enum CommitType {
  create(0, '创建'),
  update(1, '更新'),
  merge(2, '合并'),
  complete(3, '完成'),
  delete(4, '删除');

  final int value;
  final String label;
  const CommitType(this.value, this.label);

  /// 从整数值解析
  static CommitType fromValue(int value) {
    return CommitType.values.firstWhere(
      (e) => e.value == value,
      orElse: () => CommitType.create,
    );
  }
}
