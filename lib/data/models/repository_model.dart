import '../../domain/entities/repository.dart';
import '../database/app_database.dart';

/// 仓库数据模型 - Entity ↔ Data 转换
extension RepositoryDataExtension on RepositoryData {
  /// 转换为领域实体
  Repository toEntity() {
    return Repository(
      id: id,
      name: name,
      icon: icon ?? 'folder',
      color: color ?? '#3B82F6',
      isArchived: isArchived,
      isDeleted: isDeleted,
      createdAt: createdAt,
      updatedAt: updatedAt,
    );
  }
}

/// 仓库实体扩展 - 转换为 drift 数据
extension RepositoryEntityExtension on Repository {
  /// 转换为 drift 数据对象
  RepositoryData toData() {
    return RepositoryData(
      id: id,
      name: name,
      icon: icon,
      color: color,
      isArchived: isArchived,
      isDeleted: isDeleted,
      createdAt: createdAt,
      updatedAt: updatedAt,
    );
  }
}
