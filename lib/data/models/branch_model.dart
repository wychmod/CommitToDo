import '../../domain/entities/branch.dart';
import '../database/app_database.dart';

/// 分支数据模型 - Entity ↔ Data 转换
extension BranchDataExtension on BranchData {
  /// 转换为领域实体
  Branch toEntity() {
    return Branch(
      id: id,
      repositoryId: repositoryId,
      name: name,
      parentBranchId: parentBranchId,
      isMain: isMain,
      color: color ?? '#3B82F6',
      isDeleted: isDeleted,
      createdAt: createdAt,
      updatedAt: updatedAt,
    );
  }
}

/// 分支实体扩展 - 转换为 drift 数据
extension BranchEntityExtension on Branch {
  /// 转换为 drift 数据对象
  BranchData toData() {
    return BranchData(
      id: id,
      repositoryId: repositoryId,
      name: name,
      parentBranchId: parentBranchId,
      isMain: isMain,
      color: color,
      isDeleted: isDeleted,
      createdAt: createdAt,
      updatedAt: updatedAt,
    );
  }
}
