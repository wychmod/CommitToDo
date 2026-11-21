/**
 * 停滞判定与线型（R4 / M06 §4.2 / OP-03）。
 *
 * 只对 `status=active` 且未归档的分支计算；最近有效提交取本分支与
 * 「未归档且未放下」的后代（与是否展开无关）中 `at` 最大的一条。
 * 超过 30 天才画虚线；范围内无提交但历史有 → 淡实线；从未有 → 不计。
 */

import { toLocalDate } from '@/core/clock';
import { daysBetween, type TimeRange } from './time-range';

export const STALL_DAYS = 30;

export type BranchLifeStatus = 'active' | 'merged' | 'dropped';

export interface StallBranch {
  id: string;
  parentId: string | null;
  status: BranchLifeStatus;
  createdAt: number;
  archivedAt: number | null;
  droppedAt: number | null;
}

export interface StallCommit {
  branchId: string;
  at: number;
  date: string;
  voidedAt: number | null;
  deletedAt?: number | null;
}

export type StallKind = 'none' | 'stalled' | 'history' | 'dropped' | 'archived';

export interface StallInfo {
  branchId: string;
  kind: StallKind;
  /** 最后一条有效提交的日期；从未提交为 `null`。 */
  lastDate: string | null;
  /** 虚线天数；只有 `stalled` 有值。 */
  days: number | null;
  /** 线起点日期；`none` / `archived` 为 `null`。 */
  fromDate: string | null;
  /** 线终点日期；已放下为放下日期，其余为今天。 */
  toDate: string | null;
}

function isVisible(branch: StallBranch): boolean {
  return branch.archivedAt === null && branch.droppedAt === null;
}

function isValidCommit(commit: StallCommit): boolean {
  return commit.voidedAt === null && (commit.deletedAt ?? null) === null;
}

/** 本分支与未归档、未放下后代的 id 集合。 */
export function stallScopeIds(branchId: string, branches: readonly StallBranch[]): Set<string> {
  const children = new Map<string, StallBranch[]>();
  for (const branch of branches) {
    if (branch.parentId === null) continue;
    const list = children.get(branch.parentId) ?? [];
    list.push(branch);
    children.set(branch.parentId, list);
  }

  const ids = new Set<string>([branchId]);
  const walk = (id: string): void => {
    for (const child of children.get(id) ?? []) {
      if (!isVisible(child)) continue;
      ids.add(child.id);
      walk(child.id);
    }
  };
  walk(branchId);
  return ids;
}

/** 本分支与可见后代中最近一条有效提交。 */
export function latestVisibleCommit(
  branchId: string,
  branches: readonly StallBranch[],
  commits: readonly StallCommit[],
): StallCommit | null {
  const scope = stallScopeIds(branchId, branches);
  let latest: StallCommit | null = null;
  for (const commit of commits) {
    if (!scope.has(commit.branchId) || !isValidCommit(commit)) continue;
    if (!latest || commit.at > latest.at) latest = commit;
  }
  return latest;
}

export interface StallOptions {
  todayDate: string;
  tzOffsetMinutes: number;
  range: Pick<TimeRange, 'start'>;
}

export function assessStall(
  branch: StallBranch,
  branches: readonly StallBranch[],
  commits: readonly StallCommit[],
  options: StallOptions,
): StallInfo {
  const base: StallInfo = {
    branchId: branch.id,
    kind: 'none',
    lastDate: null,
    days: null,
    fromDate: null,
    toDate: null,
  };

  if (branch.archivedAt !== null) return { ...base, kind: 'archived' };

  const latest = latestVisibleCommit(branch.id, branches, commits);
  const lastDate = latest?.date ?? null;

  if (branch.status === 'dropped' || branch.droppedAt !== null) {
    const droppedDate =
      branch.droppedAt !== null ? toLocalDate(branch.droppedAt, options.tzOffsetMinutes) : null;
    return {
      ...base,
      kind: 'dropped',
      lastDate,
      fromDate: lastDate ?? toLocalDate(branch.createdAt, options.tzOffsetMinutes),
      toDate: droppedDate,
    };
  }

  // 已合并的分支不再参与停滞，只展示历史。
  if (branch.status !== 'active' || lastDate === null) return base;

  const start = options.range.start;
  if (start !== null && lastDate < start) {
    return {
      ...base,
      kind: 'history',
      lastDate,
      fromDate: lastDate,
      toDate: options.todayDate,
    };
  }

  const days = daysBetween(lastDate, options.todayDate);
  if (days > STALL_DAYS) {
    return {
      ...base,
      kind: 'stalled',
      lastDate,
      days,
      fromDate: lastDate,
      toDate: options.todayDate,
    };
  }

  return base;
}

export interface StallReminder {
  branchId: string;
  days: number;
  lastDate: string;
}

/** 今天页停滞提醒：停滞分支按天数降序取前 `limit` 条。 */
export function stallReminders(
  branches: readonly StallBranch[],
  commits: readonly StallCommit[],
  options: StallOptions,
  limit = 5,
): StallReminder[] {
  return branches
    .map((branch) => assessStall(branch, branches, commits, options))
    .filter(
      (info): info is StallInfo & { days: number; lastDate: string } =>
        info.kind === 'stalled' && info.days !== null && info.lastDate !== null,
    )
    .sort((a, b) => b.days - a.days || a.branchId.localeCompare(b.branchId))
    .slice(0, limit)
    .map((info) => ({ branchId: info.branchId, days: info.days, lastDate: info.lastDate }));
}
