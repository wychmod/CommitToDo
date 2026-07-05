import { IRepositoryRepository } from '../../../domain/repositories/i-repository-repository';
import { IBranchRepository } from '../../../domain/repositories/i-branch-repository';
import { ITaskRepository } from '../../../domain/repositories/i-task-repository';

export class DeleteRepositoryUseCase {
  constructor(
    private repositoryRepo: IRepositoryRepository,
    private branchRepo: IBranchRepository,
    private taskRepo: ITaskRepository
  ) {}

  async execute(id: string): Promise<void> {
    const branches = await this.branchRepo.getByRepositoryId(id);
    for (const branch of branches) {
      const tasks = await this.taskRepo.getByBranchId(branch.id);
      for (const task of tasks) {
        await this.taskRepo.delete(task.id);
      }
      await this.branchRepo.delete(branch.id);
    }
    await this.repositoryRepo.delete(id);
  }
}
