import { describe, expect, it } from 'vitest';
import { Branch } from './branch';
import { Commit } from './commit';
import { CommitType, Priority, TaskStatus } from './enums';
import { Repository } from './repository';
import { Task } from './task';

describe('Domain entities', () => {
  it('Repository.create produces valid entity', () => {
    const repo = Repository.create('My Repo', 'repository', '#3B82F6');
    expect(repo.id).toBeDefined();
    expect(repo.name).toBe('My Repo');
    expect(repo.description).toBeNull();
    expect(repo.isDeleted).toBe(false);
    expect(repo.toJson().name).toBe('My Repo');
  });

  it('Branch.create and main branch', () => {
    const branch = Branch.create('repo-1', 'feature', { color: '#8B5CF6' });
    expect(branch.repositoryId).toBe('repo-1');
    expect(branch.name).toBe('feature');
    expect(branch.isMain).toBe(false);

    const main = Branch.main('repo-1');
    expect(main.isMain).toBe(true);
    expect(main.name).toBe('main');
  });

  it('Task.create and computed properties', () => {
    const task = Task.create('branch-1', 'Implement auth', {
      priority: Priority.high,
    });
    expect(task.branchId).toBe('branch-1');
    expect(task.status).toBe(TaskStatus.todo);
    expect(task.priority).toBe(Priority.high);
    expect(task.isCompleted).toBe(false);

    const completed = task.copyWith({ status: TaskStatus.done, completedAt: new Date() });
    expect(completed.isCompleted).toBe(true);
  });

  it('Commit.create stores type', () => {
    const commit = Commit.create('task-1', 'branch-1', '创建任务', CommitType.create);
    expect(commit.type).toBe(CommitType.create);
    expect(commit.message).toBe('创建任务');
  });
});
