import '../../repositories/i_branch_repository.dart';

/// 删除分支用例
class DeleteBranchUseCase {
  DeleteBranchUseCase(this._branchRepository);

  final IBranchRepository _branchRepository;

  Future<void> execute(String id) async {
    final branch = await _branchRepository.getById(id);
    if (branch == null) {
      throw ArgumentError('分支不存在: $id');
    }

    if (branch.isMain) {
      throw ArgumentError('不能删除主分支');
    }

    await _branchRepository.delete(id);
  }
}
