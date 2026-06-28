import 'package:uuid/uuid.dart';

import 'enums.dart';

/// 任务实体
class Task {
  final String id;
  final String branchId;
  final String title;
  final String? description;
  final TaskStatus status;
  final Priority priority;
  final DateTime? dueDate;
  final DateTime? completedAt;
  final String? parentTaskId;
  final int sortOrder;
  final bool isDeleted;
  final DateTime createdAt;
  final DateTime updatedAt;

  const Task({
    required this.id,
    required this.branchId,
    required this.title,
    this.description,
    this.status = TaskStatus.todo,
    this.priority = Priority.medium,
    this.dueDate,
    this.completedAt,
    this.parentTaskId,
    this.sortOrder = 0,
    this.isDeleted = false,
    required this.createdAt,
    required this.updatedAt,
  });

  /// 创建新任务（无 ID）
  factory Task.create({
    required String branchId,
    required String title,
    String? description,
    TaskStatus status = TaskStatus.todo,
    Priority priority = Priority.medium,
    DateTime? dueDate,
    String? parentTaskId,
    int sortOrder = 0,
  }) {
    final now = DateTime.now();
    return Task(
      id: const Uuid().v4(),
      branchId: branchId,
      title: title,
      description: description,
      status: status,
      priority: priority,
      dueDate: dueDate,
      parentTaskId: parentTaskId,
      sortOrder: sortOrder,
      createdAt: now,
      updatedAt: now,
    );
  }

  /// copyWith 方法
  Task copyWith({
    String? id,
    String? branchId,
    String? title,
    String? description,
    TaskStatus? status,
    Priority? priority,
    DateTime? dueDate,
    DateTime? completedAt,
    String? parentTaskId,
    int? sortOrder,
    bool? isDeleted,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return Task(
      id: id ?? this.id,
      branchId: branchId ?? this.branchId,
      title: title ?? this.title,
      description: description ?? this.description,
      status: status ?? this.status,
      priority: priority ?? this.priority,
      dueDate: dueDate ?? this.dueDate,
      completedAt: completedAt ?? this.completedAt,
      parentTaskId: parentTaskId ?? this.parentTaskId,
      sortOrder: sortOrder ?? this.sortOrder,
      isDeleted: isDeleted ?? this.isDeleted,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  /// 序列化为 JSON
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'branchId': branchId,
      'title': title,
      'description': description,
      'status': status.value,
      'priority': priority.value,
      'dueDate': dueDate?.toIso8601String(),
      'completedAt': completedAt?.toIso8601String(),
      'parentTaskId': parentTaskId,
      'sortOrder': sortOrder,
      'isDeleted': isDeleted,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  /// 是否已完成
  bool get isCompleted => status == TaskStatus.done;

  /// 是否进行中
  bool get isInProgress => status == TaskStatus.inProgress;

  /// 是否已过期
  bool get isOverdue {
    if (dueDate == null || isCompleted) return false;
    return DateTime.now().isAfter(dueDate!);
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Task &&
          runtimeType == other.runtimeType &&
          id == other.id;

  @override
  int get hashCode => id.hashCode;
}
