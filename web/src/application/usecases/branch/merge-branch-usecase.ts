import { Commit } from '../../../domain/entities/commit';
import { CommitType } from '../../../domain/entities/enums';
import { IBranchRepository } from '../../../domain/repositories/i-branch-repository';
import { ICommitRepository } from '../../../domain/repositories/i-commit-repository';
import { ITaskRepository } from '../../../domain/repositories/i-task-repository';

export class MergeBranchUseCase {
  constructor(
    private branchRepo: IBranchRepository,
    private taskRepo: ITaskRepository,
    private commitRepo: ICommitRepository
  ) {}

  async execute(sourceId: string, targetId: string): Promise<void> {
    const source = await this.branchRepo.getById(sourceId);
    const target = await this.branchRepo.getById(targetId);
    if (!source || !target) {
      throw new Error('分支不存在');
    }
    if (source.repositoryId !== target.repositoryId) {
      throw new Error('只能合并同一仓库的分支');
    }

    const tasks = await this.taskRepo.getByBranchId(sourceId);
    const incompleteTasks = tasks.filter((task) => !task.isCompleted);

    for (const task of incompleteTasks) {
      const moved = task.copyWith({ branchId: targetId });
      await this.taskRepo.update(moved);
    }

    const mergeCommit = Commit.create(
      tasks.length > 0 ? tasks[0].id : sourceId,
      targetId,
      `合并分支 ${source.name} 到 ${target.name}`,
      CommitType.merge
    );
    await this.commitRepo.create(mergeCommit);
  }
}
