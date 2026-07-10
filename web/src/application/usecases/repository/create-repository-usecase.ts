import { Branch } from '../../../domain/entities/branch';
import { Repository } from '../../../domain/entities/repository';
import { IBranchRepository } from '../../../domain/repositories/i-branch-repository';
import { IRepositoryRepository } from '../../../domain/repositories/i-repository-repository';
import { validateNotEmpty } from '../../../core/utils/validators';

export interface CreateRepositoryInput {
  name: string;
  description?: string | null;
  icon?: string;
  color?: string;
}

export class CreateRepositoryUseCase {
  constructor(
    private repositoryRepo: IRepositoryRepository,
    private branchRepo: IBranchRepository
  ) {}

  async execute(input: CreateRepositoryInput): Promise<Repository> {
    validateNotEmpty(input.name, '仓库名称');
    const repo = Repository.create(
      input.name,
      input.icon ?? 'repository',
      input.color ?? '#3B82F6',
      input.description ?? null
    );
    const createdRepo = await this.repositoryRepo.create(repo);
    const mainBranch = Branch.main(createdRepo.id, createdRepo.color);
    await this.branchRepo.create(mainBranch);
    const repoWithDefaultBranch = createdRepo.copyWith({
      defaultBranchId: mainBranch.id,
    });
    return this.repositoryRepo.update(repoWithDefaultBranch);
  }
}
