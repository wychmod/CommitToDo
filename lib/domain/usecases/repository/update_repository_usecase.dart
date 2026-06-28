import '../../entities/repository.dart';
import '../../repositories/i_repository_repository.dart';

/// 更新仓库用例
class UpdateRepositoryUseCase {
  UpdateRepositoryUseCase(this._repository);

  final IRepositoryRepository _repository;

  Future<Repository> execute({
    required String id,
    String? name,
    String? icon,
    String? color,
    bool? isArchived,
  }) async {
    final existing = await _repository.getById(id);
    if (existing == null) {
      throw ArgumentError('仓库不存在: $id');
    }

    final updated = existing.copyWith(
      name: name ?? existing.name,
      icon: icon ?? existing.icon,
      color: color ?? existing.color,
      isArchived: isArchived ?? existing.isArchived,
    );

    return await _repository.update(updated);
  }
}
