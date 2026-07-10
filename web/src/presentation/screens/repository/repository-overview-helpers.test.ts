import { describe, expect, it } from 'vitest';
import { Branch } from '@/domain/entities/branch';
import { Commit } from '@/domain/entities/commit';
import { CommitType, TaskStatus } from '@/domain/entities/enums';
import { Repository } from '@/domain/entities/repository';
import { Task } from '@/domain/entities/task';
import {
  buildBranchSummaries,
  buildHeatmapData,
  computeHeatmapLevel,
  computeRepositoryStats,
  getBranchColorName,
  getBranchColorToken,
} from './repository-overview-helpers';

const repo = Repository.create('Test', 'repository', '#3B82F6');

function makeBranch(name: string, color = '#3B82F6'): Branch {
  return Branch.create(repo.id, name, { color });
}

function makeTask(
  branchId: string,
  title: string,
  options?: { status?: TaskStatus; completedAt?: Date; updatedAt?: Date }
): Task {
  let task = Task.create(branchId, title);
  if (options?.status !== undefined) {
    task = task.copyWith({ status: options.status });
  }
  if (options?.completedAt) {
    task = task.copyWith({
      status: TaskStatus.done,
      completedAt: options.completedAt,
    });
  }
  if (options?.updatedAt) {
    task = task.copyWith({ updatedAt: options.updatedAt });
  }
  return task;
}

describe('Repository overview helpers', () => {
  it('maps known branch names to V3 color tokens', () => {
    expect(getBranchColorToken(makeBranch('main'))).toBe('var(--v3-primary)');
    expect(getBranchColorToken(makeBranch('launch'))).toBe('var(--v3-launch)');
    expect(getBranchColorToken(makeBranch('design'))).toBe('var(--v3-design)');
    expect(getBranchColorToken(makeBranch('feature'))).toBe('#3B82F6');
  });

  it('maps known branch names to color names', () => {
    expect(getBranchColorName(makeBranch('main'))).toBe('primary');
    expect(getBranchColorName(makeBranch('launch'))).toBe('launch');
    expect(getBranchColorName(makeBranch('design'))).toBe('design');
    expect(getBranchColorName(makeBranch('feature'))).toBe('design');
  });

  it('builds branch summaries from tasks and commits', () => {
    const main = makeBranch('main');
    const launch = makeBranch('launch');
    const tasks = [
      makeTask(main.id, 'Done', { status: TaskStatus.done }),
      makeTask(main.id, 'In Progress', { status: TaskStatus.inProgress }),
      makeTask(launch.id, 'Todo'),
    ];
    const commits = [
      Commit.create('task-1', launch.id, 'Commit', CommitType.create),
    ];

    const summaries = buildBranchSummaries([main, launch], tasks, commits);
    expect(summaries).toHaveLength(2);
    expect(summaries[0].totalCount).toBe(2);
    expect(summaries[0].inProgressCount).toBe(1);
    expect(summaries[1].totalCount).toBe(1);
    expect(summaries[1].lastActivity).not.toBeNull();
  });

  it('computes heatmap levels', () => {
    expect(computeHeatmapLevel(0)).toBe(0);
    expect(computeHeatmapLevel(1)).toBe(1);
    expect(computeHeatmapLevel(3)).toBe(2);
    expect(computeHeatmapLevel(5)).toBe(3);
    expect(computeHeatmapLevel(10)).toBe(4);
  });

  it('computes repository stats', () => {
    const main = makeBranch('main');
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tasks = [
      makeTask(main.id, 'A', { completedAt: today }),
      makeTask(main.id, 'B', { completedAt: yesterday }),
      makeTask(main.id, 'C'),
    ];
    const commits = [
      Commit.create('task-1', main.id, 'Today', CommitType.complete),
    ];

    const stats = computeRepositoryStats(tasks, commits);
    expect(stats.completedTasks).toBe(2);
    expect(stats.streakDays).toBeGreaterThanOrEqual(2);
    expect(stats.commitsThisMonth).toBe(1);
  });

  it('builds 12 week heatmap data', () => {
    const main = makeBranch('main');
    const today = new Date();
    const tasks = [makeTask(main.id, 'Today', { completedAt: today })];
    const { grid, months } = buildHeatmapData(tasks, 12);
    expect(grid.length).toBe(12 * 7);
    expect(months.length).toBeGreaterThan(0);
  });
});
