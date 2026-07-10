import { Branch } from '@/domain/entities/branch';
import { Commit } from '@/domain/entities/commit';
import { TaskStatus } from '@/domain/entities/enums';
import { Task } from '@/domain/entities/task';

export type BranchColor = 'primary' | 'launch' | 'design';

export function getBranchColorToken(branch: Branch): string {
  if (branch.name === 'main') return 'var(--v3-primary)';
  if (branch.name === 'launch') return 'var(--v3-launch)';
  if (branch.name === 'design') return 'var(--v3-design)';
  return branch.color || 'var(--v3-design)';
}

export function getBranchColorName(branch: Branch): BranchColor {
  if (branch.name === 'main') return 'primary';
  if (branch.name === 'launch') return 'launch';
  return 'design';
}

export interface BranchSummary {
  branch: Branch;
  totalCount: number;
  inProgressCount: number;
  lastActivity: Date | null;
}

export function buildBranchSummaries(
  branches: Branch[],
  tasks: Task[],
  commits: Commit[]
): BranchSummary[] {
  const tasksByBranch = new Map<string, Task[]>();
  for (const task of tasks) {
    const list = tasksByBranch.get(task.branchId) ?? [];
    list.push(task);
    tasksByBranch.set(task.branchId, list);
  }

  const commitsByBranch = new Map<string, Commit[]>();
  for (const commit of commits) {
    const list = commitsByBranch.get(commit.branchId) ?? [];
    list.push(commit);
    commitsByBranch.set(commit.branchId, list);
  }

  return branches.map((branch) => {
    const branchTasks = tasksByBranch.get(branch.id) ?? [];
    const branchCommits = commitsByBranch.get(branch.id) ?? [];
    const lastTask = branchTasks
      .slice()
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0];
    const lastCommit = branchCommits[0];
    const candidates = [lastTask?.updatedAt, lastCommit?.createdAt].filter(
      (d): d is Date => d !== undefined
    );
    const lastActivity =
      candidates.length > 0
        ? candidates.sort((a, b) => b.getTime() - a.getTime())[0]
        : null;

    return {
      branch,
      totalCount: branchTasks.length,
      inProgressCount: branchTasks.filter(
        (t) => t.status === TaskStatus.inProgress
      ).length,
      lastActivity,
    };
  });
}

export interface RepositoryStats {
  completedTasks: number;
  streakDays: number;
  commitsThisMonth: number;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function computeRepositoryStats(
  tasks: Task[],
  commits: { createdAt: Date }[]
): RepositoryStats {
  const completedTasks = tasks.filter((t) => t.completedAt !== null).length;

  const completedDays = new Set<string>();
  for (const task of tasks) {
    if (!task.completedAt) continue;
    completedDays.add(startOfDay(task.completedAt).toDateString());
  }

  let streakDays = 0;
  const today = startOfDay(new Date());
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (completedDays.has(d.toDateString())) {
      streakDays++;
    } else if (i > 0) {
      break;
    }
  }

  const now = new Date();
  const commitsThisMonth = commits.filter((c) => {
    const created = c.createdAt;
    return (
      created.getFullYear() === now.getFullYear() &&
      created.getMonth() === now.getMonth()
    );
  }).length;

  return { completedTasks, streakDays, commitsThisMonth };
}

export interface HeatmapDay {
  date: Date;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export function computeHeatmapLevel(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 5) return 3;
  return 4;
}

export function buildHeatmapData(
  tasks: Task[],
  weeks = 12
): { grid: HeatmapDay[]; months: { label: string; index: number }[] } {
  const today = startOfDay(new Date());
  const end = today;
  const start = new Date(end);
  start.setDate(start.getDate() - (weeks * 7 - 1));
  const startWeekday = start.getDay();
  const padDays = (startWeekday + 6) % 7;
  const gridStart = new Date(start);
  gridStart.setDate(gridStart.getDate() - padDays);

  const completedByDay = new Map<string, number>();
  for (const task of tasks) {
    if (!task.completedAt) continue;
    const day = startOfDay(task.completedAt).toDateString();
    completedByDay.set(day, (completedByDay.get(day) ?? 0) + 1);
  }

  const grid: HeatmapDay[] = [];
  const months: { label: string; index: number }[] = [];
  let currentMonthLabel = '';

  for (let i = 0; i < weeks * 7; i++) {
    const date = new Date(gridStart);
    date.setDate(date.getDate() + i);
    const count = completedByDay.get(date.toDateString()) ?? 0;
    grid.push({ date, count, level: computeHeatmapLevel(count) });

    const monthLabel = date.toLocaleString('zh-CN', { month: 'short' });
    if (monthLabel !== currentMonthLabel && date.getDate() <= 7) {
      currentMonthLabel = monthLabel;
      months.push({ label: monthLabel, index: Math.floor(i / 7) });
    }
  }

  return { grid, months };
}
