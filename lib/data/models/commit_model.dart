import '../../domain/entities/commit.dart' as entity;
import '../../domain/entities/enums.dart';
import '../database/app_database.dart';

/// 提交数据模型 - Entity ↔ Data 转换
extension CommitDataExtension on CommitData {
  /// 转换为领域实体
  entity.Commit toEntity() {
    return entity.Commit(
      id: id,
      taskId: taskId,
      branchId: branchId,
      message: message,
      type: CommitType.fromValue(type.value),
      createdAt: createdAt,
    );
  }
}

/// 提交实体扩展 - 转换为 drift 数据
extension CommitEntityExtension on entity.Commit {
  /// 转换为 drift 数据对象
  CommitData toData() {
    return CommitData(
      id: id,
      taskId: taskId,
      branchId: branchId,
      message: message,
      type: type,
      createdAt: createdAt,
    );
  }
}
