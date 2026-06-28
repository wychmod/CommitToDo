import '../../entities/branch.dart';
import '../../repositories/i_branch_repository.dart';

/// 创建分支用例
class CreateBranchUseCase {
  CreateBranchUseCase(this._branchRepository);

  final IBranchRepository _branchRepository;

  Future<Branch> execute({
    required String repositoryId,
    required String name,
    String? parentBranchId,
    String color = '#3B82F6',
  }) async {
    if (name.trim().isEmpty) {
      throw ArgumentError('分支名称不能为空');
    }

    final branch = Branch.create(
      repositoryId: repositoryId,
      name: name.trim(),
      parentBranchId: parentBranchId,
      color: color,
    );

    return await _branchRepository.create(branch);
  }
}
