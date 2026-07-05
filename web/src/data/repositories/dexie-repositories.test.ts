import { describe, expect, it, beforeEach } from 'vitest';
import { AppDatabase } from '../db/app-database';
import { DexieRepositoryRepository } from './dexie-repository-repository';
import { DexieBranchRepository } from './dexie-branch-repository';
import { DexieTaskRepository } from './dexie-task-repository';
import { DexieCommitRepository } from './dexie-commit-repository';
import { Repository } from '../../domain/entities/repository';
import { Branch } from '../../domain/entities/branch';
import { Task } from '../../domain/entities/task';
import { Priority, TaskStatus, CommitType } from '../../domain/entities/enums';
import { Commit } from '../../domain/entities/commit';

describe('Dexie repositories', () => {
  let db: AppDatabase;

  beforeEach(async () => {
    db = new AppDatabase();
    await db.delete();
    await db.open();
  });

  it('creates and retrieves a repository', async () => {
    const repo = new DexieRepositoryRepository(db);
    const created = await repo.create(Repository.create('Test'));
    const fetched = await repo.getById(created.id);
    expect(fetched?.name).toBe('Test');
  });

  it('filters deleted repositories', async () => {
    const repo = new DexieRepositoryRepository(db);
    const created = await repo.create(Repository.create('Delete Me'));
    await repo.delete(created.id);
    const all = await repo.getAll();
    expect(all.some((r) => r.id === created.id)).toBe(false);
  });

  it('creates branches by repository', async () => {
    const branches = new DexieBranchRepository(db);
    const branch = await branches.create(Branch.create('repo-1', 'feature'));
    const list = await branches.getByRepositoryId('repo-1');
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(branch.id);
  });

  it('soft deletes main branch too', async () => {
    const branches = new DexieBranchRepository(db);
    const main = await branches.create(Branch.main('repo-1'));
    await branches.delete(main.id);
    const fetched = await branches.getById(main.id);
    expect(fetched).toBeNull();
  });

  it('creates tasks and commits', async () => {
    const tasks = new DexieTaskRepository(db);
    const commits = new DexieCommitRepository(db);
    const task = await tasks.create(
      Task.create('branch-1', 'Task 1', { priority: Priority.medium })
    );
    await commits.create(
      Commit.create(task.id, task.branchId, 'Created', CommitType.create)
    );
    const fetched = await tasks.getByBranchId('branch-1');
    expect(fetched).toHaveLength(1);
    const history = await commits.getByTaskId(task.id);
    expect(history).toHaveLength(1);
  });

  it('soft deletes tasks', async () => {
    const tasks = new DexieTaskRepository(db);
    const task = await tasks.create(Task.create('branch-1', 'To delete'));
    await tasks.delete(task.id);
    const all = await tasks.getByBranchId('branch-1');
    expect(all).toHaveLength(0);
  });

  it('searches tasks', async () => {
    const tasks = new DexieTaskRepository(db);
    await tasks.create(Task.create('branch-1', 'Alpha task'));
    await tasks.create(Task.create('branch-1', 'Beta task'));
    const results = await tasks.search('alpha');
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Alpha task');
  });

  it('filters completed tasks by date range', async () => {
    const tasks = new DexieTaskRepository(db);
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const task = await tasks.create(
      Task.create('branch-1', 'Completed task').copyWith({
        status: TaskStatus.done,
        completedAt: now,
      })
    );
    await tasks.update(task);
    const results = await tasks.getCompletedByDateRange(yesterday, tomorrow);
    expect(results).toHaveLength(1);
  });
});
