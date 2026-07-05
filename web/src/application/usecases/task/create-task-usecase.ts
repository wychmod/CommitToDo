import { Commit } from '../../../domain/entities/commit';
import { CommitType, Priority } from '../../../domain/entities/enums';
import { Task } from '../../../domain/entities/task';
import { ICommitRepository } from '../../../domain/repositories/i-commit-repository';
import { ITaskRepository } from '../../../domain/repositories/i-task-repository';
import { validateNotEmpty } from '../../../core/utils/validators';

export interface CreateTaskInput {
  branchId: string;
  title: string;
  description?: string | null;
  priority?: Priority;
  dueDate?: Date | null;
  parentTaskId?: string | null;
}

export class CreateTaskUseCase {
  constructor(
    private taskRepo: ITaskRepository,
    private commitRepo: ICommitRepository
  ) {}

  async execute(input: CreateTaskInput): Promise<Task> {
    validateNotEmpty(input.branchId, '分支 ID');
    validateNotEmpty(input.title, '任务标题');
    const task = Task.create(input.branchId, input.title, {
      description: input.description,
      priority: input.priority,
      dueDate: input.dueDate,
      parentTaskId: input.parentTaskId,
    });
    const created = await this.taskRepo.create(task);
    const commit = Commit.create(
      created.id,
      created.branchId,
      `创建任务 ${created.title}`,
      CommitType.create
    );
    await this.commitRepo.create(commit);
    return created;
  }
}
