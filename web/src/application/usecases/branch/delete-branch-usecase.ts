import { IBranchRepository } from '../../../domain/repositories/i-branch-repository';

export class DeleteBranchUseCase {
  constructor(private branchRepo: IBranchRepository) {}

  async execute(id: string): Promise<void> {
    const branch = await this.branchRepo.getById(id);
    if (!branch) {
      throw new Error('分支不存在');
    }
    if (branch.isMain) {
      throw new Error('main 分支不能删除');
    }
    await this.branchRepo.delete(id);
  }
}
