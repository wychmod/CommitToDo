import '../../entities/repository.dart';
import '../../repositories/i_repository_repository.dart';

/// 创建仓库用例
class CreateRepositoryUseCase {
  CreateRepositoryUseCase(this._repository);

  final IRepositoryRepository _repository;

  Future<Repository> execute({
    required String name,
    String icon = 'folder',
    String color = '#3B82F6',
  }) async {
    if (name.trim().isEmpty) {
      throw ArgumentError('仓库名称不能为空');
    }

    final repository = Repository.create(
      name: name.trim(),
      icon: icon,
      color: color,
    );

    return await _repository.create(repository);
  }
}
