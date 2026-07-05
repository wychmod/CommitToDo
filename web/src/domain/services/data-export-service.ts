import { IRepositoryRepository } from '../repositories/i-repository-repository';
import { IBranchRepository } from '../repositories/i-branch-repository';
import { ITaskRepository } from '../repositories/i-task-repository';
import { ICommitRepository } from '../repositories/i-commit-repository';
import { Branch } from '../entities/branch';
import { Commit } from '../entities/commit';
import { Task } from '../entities/task';

export type ExportFormat = 'json' | 'csv' | 'markdown';

export interface ExportData {
  version: number;
  exportedAt: string;
  repositories: Record<string, unknown>[];
  branches: Record<string, unknown>[];
  tasks: Record<string, unknown>[];
  commits: Record<string, unknown>[];
}

export class DataExportService {
  constructor(
    private repositoryRepo: IRepositoryRepository,
    private branchRepo: IBranchRepository,
    private taskRepo: ITaskRepository,
    private commitRepo: ICommitRepository
  ) {}

  async export(format: ExportFormat): Promise<string> {
    const data = await this.gatherData();
    switch (format) {
      case 'json':
        return this.exportJson(data);
      case 'csv':
        return this.exportCsv(data);
      case 'markdown':
        return this.exportMarkdown(data);
      default:
        throw new Error(`不支持的导出格式: ${format}`);
    }
  }

  private async gatherData(): Promise<ExportData> {
    const repositories = await this.repositoryRepo.getAll();
    const allBranches: Branch[] = [];
    for (const repo of repositories) {
      const branches = await this.branchRepo.getByRepositoryId(repo.id);
      allBranches.push(...branches);
    }

    const allTasks: Task[] = [];
    const allCommits: Commit[] = [];
    for (const branch of allBranches) {
      const tasks = await this.taskRepo.getByBranchId(branch.id);
      allTasks.push(...tasks);
      for (const task of tasks) {
        const commits = await this.commitRepo.getByTaskId(task.id);
        allCommits.push(...commits);
      }
    }

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      repositories: repositories.map((r) => r.toJson()),
      branches: allBranches.map((b) => b.toJson()),
      tasks: allTasks.map((t) => t.toJson()),
      commits: allCommits.map((c) => c.toJson()),
    };
  }

  private exportJson(data: ExportData): string {
    return JSON.stringify(data, null, 2);
  }

  private exportCsv(data: ExportData): string {
    const header = 'id,branchId,title,status,priority,dueDate,completedAt,createdAt,updatedAt';
    const rows = data.tasks.map((task) => {
      const t = task as Record<string, string | number | null>;
      return [
        t.id,
        t.branchId,
        `"${String(t.title).replace(/"/g, '""')}"`,
        t.status,
        t.priority,
        t.dueDate,
        t.completedAt,
        t.createdAt,
        t.updatedAt,
      ].join(',');
    });
    return [header, ...rows].join('\n');
  }

  private exportMarkdown(data: ExportData): string {
    const lines: string[] = ['# Commit 数据导出', ''];

    lines.push('## 仓库');
    for (const repo of data.repositories) {
      const r = repo as Record<string, string | number | boolean>;
      lines.push(`- **${r.name}** (${r.id})`);
    }
    lines.push('');

    lines.push('## 分支');
    for (const branch of data.branches) {
      const b = branch as Record<string, string | number | boolean | null>;
      lines.push(`- ${b.name} (${b.id})`);
    }
    lines.push('');

    lines.push('## 任务');
    lines.push('| 标题 | 状态 | 优先级 | 创建时间 |');
    lines.push('| --- | --- | --- | --- |');
    for (const task of data.tasks) {
      const t = task as Record<string, string | number | null>;
      lines.push(`| ${t.title} | ${t.status} | ${t.priority} | ${t.createdAt} |`);
    }

    return lines.join('\n');
  }
}
