import { describe, expect, it, beforeEach } from 'vitest';
import { addDays, subDays } from 'date-fns';

import { AppDatabase } from '@/data/db/app-database';
import { container } from '@/core/di/injection-container';
import { Branch } from '@/domain/entities/branch';
import { Commit } from '@/domain/entities/commit';
import { CommitType, TaskStatus } from '@/domain/entities/enums';
import { Repository } from '@/domain/entities/repository';
import { Task } from '@/domain/entities/task';

import {
  useInsightsStore,
  computeInsightsStats,
  filterTasksByCompletionRange,
} from './insights-store';

async function resetDatabase(): Promise<void> {
  const db = container.resolve(AppDatabase);
  await db.repositories.clear();
  await db.branches.clear();
  await db.tasks.clear();
  await db.commits.clear();
}

describe('InsightsStore', () => {
  beforeEach(async () => {
    await resetDatabase();
    useInsightsStore.setState({
      repositories: [],
      branches: [],
      commits: [],
      tasks: [],
      selectedCommit: null,
      isLoading: false,
      error: null,
      scope: {
        repositoryId: undefined,
        branchId: undefined,
        range: '90d',
        tab: 'graph',
      },
    });
  });

  it('loads data for all repositories scope', async () => {
    const repoRepository = container.resolve('IRepositoryRepository') as {
      create: (r: Repository) => Promise<Repository>;
    };
    const repo = await repoRepository.create(Repository.create('Test Repo'));

    await useInsightsStore.getState().loadForScope({
      repositoryId: undefined,
      branchId: undefined,
      range: '90d',
      tab: 'graph',
    });

    expect(useInsightsStore.getState().repositories).toHaveLength(1);
    expect(useInsightsStore.getState().repositories[0].id).toBe(repo.id);
  });

  it('filters commits by selected range', async () => {
    const repoRepository = container.resolve('IRepositoryRepository') as {
      create: (r: Repository) => Promise<Repository>;
    };
    const branchRepository = container.resolve('IBranchRepository') as {
      create: (b: Branch) => Promise<Branch>;
    };
    const commitRepository = container.resolve('ICommitRepository') as {
      create: (c: Commit) => Promise<Commit>;
    };

    const repo = await repoRepository.create(Repository.create('Test Repo'));
    const main = await branchRepository.create(Branch.main(repo.id));

    const oldCommit = Commit.create('task-1', main.id, 'Old', CommitType.create);
    oldCommit.createdAt = subDays(new Date(), 100);
    const recentCommit = Commit.create('task-2', main.id, 'Recent', CommitType.update);
    recentCommit.createdAt = new Date();

    await commitRepository.create(oldCommit);
    await commitRepository.create(recentCommit);

    await useInsightsStore.getState().loadForScope({
      repositoryId: repo.id,
      branchId: undefined,
      range: '90d',
      tab: 'graph',
    });

    expect(useInsightsStore.getState().commits).toHaveLength(1);
    expect(useInsightsStore.getState().commits[0].id).toBe(recentCommit.id);
  });

  it('updates scope and selected commit', () => {
    const store = useInsightsStore.getState();

    store.setScope({ tab: 'activity', range: '12m' });
    expect(useInsightsStore.getState().scope.tab).toBe('activity');
    expect(useInsightsStore.getState().scope.range).toBe('12m');

    const commit = Commit.create('task-1', 'branch-1', 'Test', CommitType.create);
    store.selectCommit(commit);
    expect(useInsightsStore.getState().selectedCommit?.id).toBe(commit.id);
  });
});

describe('computeInsightsStats', () => {
  it('counts commits and completed tasks', () => {
    const today = new Date();
    const commit = Commit.create('task-1', 'branch-1', 'Test', CommitType.create);
    const completedTask = Task.create('branch-1', 'Done');
    (completedTask as unknown as { status: TaskStatus }).status = TaskStatus.done;
    (completedTask as unknown as { completedAt: Date }).completedAt = today;

    const stats = computeInsightsStats([commit], [completedTask]);

    expect(stats.commits).toBe(1);
    expect(stats.completedTasks).toBe(1);
  });

  it('computes streak and best day', () => {
    const tasks: Task[] = [];
    for (let i = 0; i < 3; i++) {
      const task = Task.create('branch-1', `Task ${i}`);
      (task as unknown as { status: TaskStatus }).status = TaskStatus.done;
      (task as unknown as { completedAt: Date }).completedAt = subDays(new Date(), i);
      tasks.push(task);
    }

    const stats = computeInsightsStats([], tasks);

    expect(stats.streakDays).toBeGreaterThanOrEqual(3);
    expect(stats.bestDay).toBe(1);
  });
});

describe('filterTasksByCompletionRange', () => {
  it('keeps tasks completed within the range', () => {
    const inRange = Task.create('branch-1', 'In range');
    (inRange as unknown as { completedAt: Date }).completedAt = new Date();

    const outOfRange = Task.create('branch-1', 'Out of range');
    (outOfRange as unknown as { completedAt: Date }).completedAt = addDays(
      new Date(),
      -100
    );

    const result = filterTasksByCompletionRange([inRange, outOfRange], '90d');

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('In range');
  });
});
