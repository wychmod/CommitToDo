import '../../domain/entities/enums.dart';
import '../../domain/entities/task.dart';
import '../database/app_database.dart';

/// 任务数据模型 - Entity ↔ Data 转换
extension TaskDataExtension on TaskData {
  /// 转换为领域实体
  Task toEntity() {
    return Task(
      id: id,
      branchId: branchId,
      title: title,
      description: description,
      status: TaskStatus.fromValue(status.value),
      priority: Priority.fromValue(priority.value),
      dueDate: dueDate,
      completedAt: completedAt,
      parentTaskId: parentTaskId,
      sortOrder: sortOrder,
      isDeleted: isDeleted,
      createdAt: createdAt,
      updatedAt: updatedAt,
    );
  }
}

/// 任务实体扩展 - 转换为 drift 数据
extension TaskEntityExtension on Task {
  /// 转换为 drift 数据对象
  TaskData toData() {
    return TaskData(
      id: id,
      branchId: branchId,
      title: title,
      description: description,
      status: status,
      priority: priority,
      dueDate: dueDate,
      completedAt: completedAt,
      parentTaskId: parentTaskId,
      sortOrder: sortOrder,
      isDeleted: isDeleted,
      createdAt: createdAt,
      updatedAt: updatedAt,
    );
  }
}
