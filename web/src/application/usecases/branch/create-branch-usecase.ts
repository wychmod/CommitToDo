import { Branch } from '../../../domain/entities/branch';
import { IBranchRepository } from '../../../domain/repositories/i-branch-repository';
import { validateNotEmpty } from '../../../core/utils/validators';

export interface CreateBranchInput {
  repositoryId: string;
  name: string;
  parentBranchId?: string | null;
  color?: string;
}

export class CreateBranchUseCase {
  constructor(private branchRepo: IBranchRepository) {}

  async execute(input: CreateBranchInput): Promise<Branch> {
    validateNotEmpty(input.repositoryId, '仓库 ID');
    validateNotEmpty(input.name, '分支名称');
    const branch = Branch.create(input.repositoryId, input.name, {
      parentBranchId: input.parentBranchId ?? null,
      color: input.color ?? '#3B82F6',
    });
    return this.branchRepo.create(branch);
  }
}
