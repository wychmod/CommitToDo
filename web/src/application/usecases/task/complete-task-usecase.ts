import { Commit } from '../../../domain/entities/commit';
import { CommitType, TaskStatus } from '../../../domain/entities/enums';
import { Task } from '../../../domain/entities/task';
import { ICommitRepository } from '../../../domain/repositories/i-commit-repository';
import { ITaskRepository } from '../../../domain/repositories/i-task-repository';
import { validateNotEmpty } from '../../../core/utils/validators';

export class CompleteTaskUseCase {
  constructor(
    private taskRepo: ITaskRepository,
    private commitRepo: ICommitRepository
  ) {}

  async execute(id: string): Promise<Task> {
    validateNotEmpty(id, '任务 ID');
    const task = await this.taskRepo.getById(id);
    if (!task) {
      throw new Error('任务不存在');
    }
    if (task.isCompleted) {
      throw new Error('任务已经完成');
    }
    const completed = task.copyWith({
      status: TaskStatus.done,
      completedAt: new Date(),
    });
    const result = await this.taskRepo.update(completed);
    const commit = Commit.create(
      result.id,
      result.branchId,
      `完成任务 ${result.title}`,
      CommitType.complete
    );
    await this.commitRepo.create(commit);
    return result;
  }
}
