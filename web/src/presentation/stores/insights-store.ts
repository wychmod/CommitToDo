import { create } from 'zustand';
import { endOfDay, startOfDay, subDays, subMonths, startOfYear } from 'date-fns';

import { container } from '@/core/di/injection-container';
import { Branch } from '@/domain/entities/branch';
import { Commit } from '@/domain/entities/commit';
import { Repository } from '@/domain/entities/repository';
import { Task } from '@/domain/entities/task';
import { TaskStatus } from '@/domain/entities/enums';
import { IRepositoryRepository } from '@/domain/repositories/i-repository-repository';
import { IBranchRepository } from '@/domain/repositories/i-branch-repository';
import { ICommitRepository } from '@/domain/repositories/i-commit-repository';
import { ITaskRepository } from '@/domain/repositories/i-task-repository';

export type InsightsTab = 'activity' | 'graph' | 'heatmap';
export type InsightsRange = '90d' | '12m' | 'year' | 'custom';

export interface InsightsScope {
  repositoryId?: string;
  branchId?: string;
  range: InsightsRange;
  tab: InsightsTab;
}

export interface InsightsStats {
  commits: number;
  completedTasks: number;
  streakDays: number;
  bestDay: number;
}

export interface InsightsState {
  repositories: Repository[];
  branches: Branch[];
  commits: Commit[];
  tasks: Task[];
  selectedCommit: Commit | null;
  isLoading: boolean;
  error: string | null;
  scope: InsightsScope;

  setScope: (scope: Partial<InsightsScope>) => void;
  selectCommit: (commit: Commit | null) => void;
  loadForScope: (scope: InsightsScope) => Promise<void>;
  loadRepositories: () => Promise<void>;
  clearError: () => void;
}

function computeRangeBounds(range: InsightsRange): { start: Date; end: Date } {
  const end = endOfDay(new Date());
  switch (range) {
    case '90d':
      return { start: startOfDay(subDays(end, 90)), end };
    case '12m':
      return { start: startOfDay(subMonths(end, 12)), end };
    case 'year':
      return { start: startOfYear(end), end };
    case 'custom':
    default:
      return { start: startOfDay(subMonths(end, 120)), end };
  }
}

export function filterByRange<T extends { createdAt: Date }>(
  items: T[],
  range: InsightsRange
): T[] {
  const { start, end } = computeRangeBounds(range);
  return items.filter((item) => item.createdAt >= start && item.createdAt <= end);
}

export function filterTasksByCompletionRange(
  tasks: Task[],
  range: InsightsRange
): Task[] {
  const { start, end } = computeRangeBounds(range);
  return tasks.filter(
    (task) =>
      task.completedAt &&
      task.completedAt >= start &&
      task.completedAt <= end
  );
}

function computeStreak(tasks: Task[]): number {
  const dates = new Set(
    tasks
      .filter((t) => t.completedAt)
      .map((t) => startOfDay(t.completedAt!).toDateString())
  );
  let streak = 0;
  const today = startOfDay(new Date());
  for (let i = 0; i < 365; i++) {
    const d = subDays(today, i);
    if (dates.has(d.toDateString())) {
      streak++;
    } else if (i === 0) {
      continue;
    } else {
      break;
    }
  }
  return streak;
}

function computeBestDay(tasks: Task[]): number {
  const counts = new Map<string, number>();
  for (const task of tasks) {
    if (!task.completedAt) continue;
    const key = startOfDay(task.completedAt).toDateString();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Math.max(0, ...Array.from(counts.values()));
}

export function computeInsightsStats(
  commits: Commit[],
  tasks: Task[]
): InsightsStats {
  const completedTasks = tasks.filter(
    (t) => t.status === TaskStatus.done || t.status === TaskStatus.cancelled
  );
  return {
    commits: commits.length,
    completedTasks: completedTasks.length,
    streakDays: computeStreak(completedTasks),
    bestDay: computeBestDay(completedTasks),
  };
}

export const useInsightsStore = create<InsightsState>((set, get) => {
  const repositoryRepository = container.resolve<IRepositoryRepository>('IRepositoryRepository');
  const branchRepository = container.resolve<IBranchRepository>('IBranchRepository');
  const commitRepository = container.resolve<ICommitRepository>('ICommitRepository');
  const taskRepository = container.resolve<ITaskRepository>('ITaskRepository');

  return {
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

    setScope: (partial) => {
      const next = { ...get().scope, ...partial };
      set({ scope: next });
    },

    selectCommit: (commit) => set({ selectedCommit: commit }),

    loadRepositories: async () => {
      const repositories = await repositoryRepository.getAll();
      set({ repositories });
    },

    loadForScope: async (scope) => {
      set({ isLoading: true, error: null, scope });
      try {
        let repositories: Repository[] = [];
        let branches: Branch[] = [];
        let commits: Commit[] = [];
        let tasks: Task[] = [];

        if (scope.repositoryId) {
          const repo = await repositoryRepository.getById(scope.repositoryId);
          repositories = repo ? [repo] : [];
          branches = await branchRepository.getByRepositoryId(scope.repositoryId);
        } else {
          repositories = await repositoryRepository.getAll();
          const lists = await Promise.all(
            repositories.map((r) => branchRepository.getByRepositoryId(r.id))
          );
          branches = lists.flat();
        }

        if (scope.branchId) {
          branches = branches.filter((b) => b.id === scope.branchId);
        }

        const commitLists = await Promise.all(
          branches.map((b) => commitRepository.getByBranchId(b.id))
        );
        commits = commitLists.flat();

        const taskLists = await Promise.all(
          branches.map((b) => taskRepository.getByBranchId(b.id))
        );
        tasks = taskLists.flat();

        commits = filterByRange(commits, scope.range);

        set({
          repositories,
          branches,
          commits,
          tasks,
          isLoading: false,
        });
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : '加载洞察数据失败',
          isLoading: false,
        });
      }
    },

    clearError: () => set({ error: null }),
  };
});
