import { Commit } from '../../../domain/entities/commit';
import { CommitType } from '../../../domain/entities/enums';
import { ICommitRepository } from '../../../domain/repositories/i-commit-repository';
import { ITaskRepository } from '../../../domain/repositories/i-task-repository';
import { validateNotEmpty } from '../../../core/utils/validators';

export class DeleteTaskUseCase {
  constructor(
    private taskRepo: ITaskRepository,
    private commitRepo: ICommitRepository
  ) {}

  async execute(id: string): Promise<void> {
    validateNotEmpty(id, '任务 ID');
    const task = await this.taskRepo.getById(id);
    if (!task) {
      throw new Error('任务不存在');
    }
    await this.taskRepo.delete(id);
    const commit = Commit.create(
      id,
      task.branchId,
      `删除任务 ${task.title}`,
      CommitType.delete
    );
    await this.commitRepo.create(commit);
  }
}
