import { Commit } from '../../../domain/entities/commit';
import { CommitType, Priority, TaskStatus } from '../../../domain/entities/enums';
import { Task } from '../../../domain/entities/task';
import { ICommitRepository } from '../../../domain/repositories/i-commit-repository';
import { ITaskRepository } from '../../../domain/repositories/i-task-repository';
import { validateNotEmpty } from '../../../core/utils/validators';

export interface UpdateTaskInput {
  id: string;
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: Priority;
  dueDate?: Date | null;
  parentTaskId?: string | null;
  sortOrder?: number;
}

export class UpdateTaskUseCase {
  constructor(
    private taskRepo: ITaskRepository,
    private commitRepo: ICommitRepository
  ) {}

  async execute(input: UpdateTaskInput): Promise<Task> {
    validateNotEmpty(input.id, '任务 ID');
    const task = await this.taskRepo.getById(input.id);
    if (!task) {
      throw new Error('任务不存在');
    }
    if (input.title !== undefined) {
      validateNotEmpty(input.title, '任务标题');
    }

    const updated = task.copyWith(input);
    const result = await this.taskRepo.update(updated);

    const commit = Commit.create(
      result.id,
      result.branchId,
      `更新任务 ${result.title}`,
      CommitType.update
    );
    await this.commitRepo.create(commit);
    return result;
  }
}
