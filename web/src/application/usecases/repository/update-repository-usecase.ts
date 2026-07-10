import { Repository } from '../../../domain/entities/repository';
import { IRepositoryRepository } from '../../../domain/repositories/i-repository-repository';
import { validateNotEmpty } from '../../../core/utils/validators';

export interface UpdateRepositoryInput {
  id: string;
  name?: string;
  description?: string | null;
  defaultBranchId?: string | null;
  icon?: string;
  color?: string;
  isArchived?: boolean;
}

export class UpdateRepositoryUseCase {
  constructor(private repositoryRepo: IRepositoryRepository) {}

  async execute(input: UpdateRepositoryInput): Promise<Repository> {
    validateNotEmpty(input.id, '仓库 ID');
    const repo = await this.repositoryRepo.getById(input.id);
    if (!repo) {
      throw new Error('仓库不存在');
    }
    if (input.name !== undefined) {
      validateNotEmpty(input.name, '仓库名称');
    }
    const updated = repo.copyWith(input);
    return this.repositoryRepo.update(updated);
  }
}
