import '../../repositories/i_repository_repository.dart';

/// 删除仓库用例
class DeleteRepositoryUseCase {
  DeleteRepositoryUseCase(this._repository);

  final IRepositoryRepository _repository;

  Future<void> execute(String id) async {
    final existing = await _repository.getById(id);
    if (existing == null) {
      throw ArgumentError('仓库不存在: $id');
    }

    await _repository.delete(id);
  }
}
