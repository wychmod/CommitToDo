import { Branch } from '../../domain/entities/branch';
import { Commit } from '../../domain/entities/commit';
import { CommitType, Priority, TaskStatus } from '../../domain/entities/enums';
import { Repository } from '../../domain/entities/repository';
import { Task } from '../../domain/entities/task';
import { IBranchRepository } from '../../domain/repositories/i-branch-repository';
import { ICommitRepository } from '../../domain/repositories/i-commit-repository';
import { IRepositoryRepository } from '../../domain/repositories/i-repository-repository';
import { ITaskRepository } from '../../domain/repositories/i-task-repository';
import { ExportData } from '../../domain/services/data-export-service';

export type ImportMode = 'merge' | 'overwrite';

export interface ImportResult {
  repositories: number;
  branches: number;
  tasks: number;
  commits: number;
}

function parseDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (typeof value === 'string') return new Date(value);
  return new Date();
}

function parseOptionalDate(value: unknown): Date | null {
  if (value === null || value === undefined) return null;
  return parseDate(value);
}

export class ImportDataUseCase {
  constructor(
    private repositoryRepo: IRepositoryRepository,
    private branchRepo: IBranchRepository,
    private taskRepo: ITaskRepository,
    private commitRepo: ICommitRepository
  ) {}

  async execute(json: string, mode: ImportMode = 'merge'): Promise<ImportResult> {
    let data: ExportData;
    try {
      data = JSON.parse(json) as ExportData;
    } catch {
      throw new Error('导入文件不是有效的 JSON');
    }

    if (data.version !== 1) {
      throw new Error(`不支持的导出版本: ${data.version ?? '未知'}`);
    }

    if (mode === 'overwrite') {
      await Promise.all([
        this.commitRepo.clear(),
        this.taskRepo.clear(),
        this.branchRepo.clear(),
        this.repositoryRepo.clear(),
      ]);
    }

    return this.importData(data);
  }

  private async importData(data: ExportData): Promise<ImportResult> {
    const repositories = Array.isArray(data.repositories) ? data.repositories : [];
    const branches = Array.isArray(data.branches) ? data.branches : [];
    const tasks = Array.isArray(data.tasks) ? data.tasks : [];
    const commits = Array.isArray(data.commits) ? data.commits : [];

    let repoCount = 0;
    let branchCount = 0;
    let taskCount = 0;
    let commitCount = 0;

    for (const raw of repositories) {
      const repo = new Repository({
        id: String(raw.id),
        name: String(raw.name),
        icon: String(raw.icon ?? 'repository'),
        color: String(raw.color ?? '#3B82F6'),
        isArchived: Boolean(raw.isArchived),
        isDeleted: Boolean(raw.isDeleted),
        createdAt: parseDate(raw.createdAt),
        updatedAt: parseDate(raw.updatedAt),
      });
      await this.saveRepository(repo);
      repoCount++;
    }

    for (const raw of branches) {
      const branch = new Branch({
        id: String(raw.id),
        repositoryId: String(raw.repositoryId),
        name: String(raw.name),
        parentBranchId: raw.parentBranchId === undefined ? null : (raw.parentBranchId as string | null),
        isMain: Boolean(raw.isMain),
        color: String(raw.color ?? '#3B82F6'),
        isDeleted: Boolean(raw.isDeleted),
        createdAt: parseDate(raw.createdAt),
        updatedAt: parseDate(raw.updatedAt),
      });
      await this.saveBranch(branch);
      branchCount++;
    }

    for (const raw of tasks) {
      const task = new Task({
        id: String(raw.id),
        branchId: String(raw.branchId),
        title: String(raw.title),
        description: raw.description === undefined ? null : (raw.description as string | null),
        status: TaskStatus.fromValue(Number(raw.status)),
        priority: Priority.fromValue(Number(raw.priority)),
        dueDate: parseOptionalDate(raw.dueDate),
        completedAt: parseOptionalDate(raw.completedAt),
        parentTaskId: raw.parentTaskId === undefined ? null : (raw.parentTaskId as string | null),
        sortOrder: Number(raw.sortOrder ?? 0),
        isDeleted: Boolean(raw.isDeleted),
        createdAt: parseDate(raw.createdAt),
        updatedAt: parseDate(raw.updatedAt),
      });
      await this.saveTask(task);
      taskCount++;
    }

    for (const raw of commits) {
      const commit = new Commit({
        id: String(raw.id),
        taskId: String(raw.taskId),
        branchId: String(raw.branchId),
        message: String(raw.message),
        type: CommitType.fromValue(Number(raw.type)),
        createdAt: parseDate(raw.createdAt),
      });
      await this.saveCommit(commit);
      commitCount++;
    }

    return { repositories: repoCount, branches: branchCount, tasks: taskCount, commits: commitCount };
  }

  private async saveRepository(repository: Repository): Promise<void> {
    const existing = await this.repositoryRepo.getById(repository.id);
    if (existing) {
      await this.repositoryRepo.update(repository);
    } else {
      await this.repositoryRepo.create(repository);
    }
  }

  private async saveBranch(branch: Branch): Promise<void> {
    const existing = await this.branchRepo.getById(branch.id);
    if (existing) {
      await this.branchRepo.update(branch);
    } else {
      await this.branchRepo.create(branch);
    }
  }

  private async saveTask(task: Task): Promise<void> {
    const existing = await this.taskRepo.getById(task.id);
    if (existing) {
      await this.taskRepo.update(task);
    } else {
      await this.taskRepo.create(task);
    }
  }

  private async saveCommit(commit: Commit): Promise<void> {
    await this.commitRepo.create(commit);
  }
}
