/**
 * 结构类 8 枚徽章的条件判定（PRD V1-05 §4.1 / OP-02）。
 *
 * 只看当前数据里已经发生的事实：未删除分支、有效提交（`voidedAt == null`）；
 * 已归档不改变判定。根分支不参与任何结构类候选。
 */

import { toLocalDate } from '@/core/clock';
import type {
  BadgeBranchRow,
  BadgeCandidate,
  BadgeCommitRow,
  BadgeMilestoneRow,
  BadgeProgress,
} from './badges';
import { longestRun, monthBreakdown, monthStats, type MonthRun } from './badge-months';

const DAY_MS = 86_400_000;

export interface StructureAssessment {
  candidates: BadgeCandidate[];
  progress: BadgeProgress[];
}

interface Rows {
  branches: readonly BadgeBranchRow[];
  commits: readonly BadgeCommitRow[];
}

function validCommits(commits: readonly BadgeCommitRow[]): BadgeCommitRow[] {
  return commits.filter((commit) => commit.voidedAt === null && commit.deletedAt === null);
}

function liveBranches(branches: readonly BadgeBranchRow[]): BadgeBranchRow[] {
  return branches.filter((branch) => branch.deletedAt === null);
}

function branchPath(branch: BadgeBranchRow, byId: Map<string, BadgeBranchRow>): string {
  const titles: string[] = [branch.title];
  let current = branch.parentId ? byId.get(branch.parentId) : undefined;
  let guard = 0;
  while (current && guard < 32) {
    titles.unshift(current.title);
    current = current.parentId ? byId.get(current.parentId) : undefined;
    guard += 1;
  }
  return titles.join(' / ');
}

function subtreeIds(rootId: string, childrenOf: Map<string, BadgeBranchRow[]>): Set<string> {
  const ids = new Set<string>([rootId]);
  const stack = [rootId];
  while (stack.length > 0) {
    const current = stack.pop()!;
    for (const child of childrenOf.get(current) ?? []) {
      if (ids.has(child.id)) continue;
      ids.add(child.id);
      stack.push(child.id);
    }
  }
  return ids;
}

function commitCount(commits: readonly BadgeCommitRow[], branchIds: ReadonlySet<string>): number {
  return commits.filter((commit) => branchIds.has(commit.branchId)).length;
}

function activeEnd(branch: BadgeBranchRow, nowMs: number): number {
  const ends = [branch.finishedAt, branch.droppedAt].filter(
    (value): value is number => value !== null,
  );
  return ends.length > 0 ? Math.min(...ends) : nowMs;
}

/**
 * 结构类候选与达成度。
 *
 * `progress` 只用于徽章墙「还差 N」；授予仍以 `candidates` 为准。
 */
export function assessStructureBadges(
  rows: Rows,
  nowMs: number,
  tzOffsetMinutes: number,
): StructureAssessment {
  const branches = liveBranches(rows.branches);
  const byId = new Map(branches.map((branch) => [branch.id, branch]));
  const childrenOf = new Map<string, BadgeBranchRow[]>();
  for (const branch of branches) {
    if (branch.parentId === null) continue;
    const list = childrenOf.get(branch.parentId) ?? [];
    list.push(branch);
    childrenOf.set(branch.parentId, list);
  }
  const commits = validCommits(rows.commits);
  const dateOf = (ms: number): string => toLocalDate(ms, tzOffsetMinutes);

  const candidates: BadgeCandidate[] = [];
  const progress: BadgeProgress[] = [];

  // 第一道岔：第一次创建 depth ≥ 2 的子分支。
  const forks = branches
    .filter((branch) => branch.depth >= 2)
    .sort((left, right) => left.createdAt - right.createdAt || left.id.localeCompare(right.id));
  const firstFork = forks[0];
  progress.push({ catalogId: 'first-fork', current: forks.length, target: 1 });
  if (firstFork) {
    candidates.push({
      catalogId: 'first-fork',
      category: 'structure',
      sourceEntityId: firstFork.id,
      snapshot: {
        branchId: firstFork.id,
        parentId: firstFork.parentId,
        title: firstFork.title,
        path: branchPath(firstFork, byId),
        createdAt: firstFork.createdAt,
        eventDate: dateOf(firstFork.createdAt),
      },
    });
  }

  // 汇流：第一次收尾。
  const merges = branches
    .filter(
      (branch) => branch.depth > 0 && branch.status === 'merged' && branch.finishedAt !== null,
    )
    .sort(
      (left, right) =>
        (left.finishedAt ?? 0) - (right.finishedAt ?? 0) || left.id.localeCompare(right.id),
    );
  const firstMerge = merges[0];
  progress.push({ catalogId: 'first-merge', current: merges.length, target: 1 });
  if (firstMerge) {
    candidates.push({
      catalogId: 'first-merge',
      category: 'structure',
      sourceEntityId: firstMerge.id,
      snapshot: {
        branchId: firstMerge.id,
        parentId: firstMerge.parentId,
        title: firstMerge.title,
        path: branchPath(firstMerge, byId),
        finishedIntoId: firstMerge.finishedIntoId,
        finishedAt: firstMerge.finishedAt,
        commitCount: commitCount(commits, new Set([firstMerge.id])),
        eventDate: dateOf(firstMerge.finishedAt ?? firstMerge.createdAt),
      },
    });
  }

  // 收束：某个非根分支的子分支全部 merged；放下不算。
  let allMerged: { parent: BadgeBranchRow; children: BadgeBranchRow[]; last: number } | null = null;
  let allMergedBest = { current: 0, target: 1 };
  for (const parent of branches) {
    if (parent.depth === 0) continue;
    const children = childrenOf.get(parent.id) ?? [];
    if (children.length === 0) continue;
    const merged = children.filter(
      (child) => child.status === 'merged' && child.finishedAt !== null,
    );
    if (merged.length / children.length > allMergedBest.current / allMergedBest.target) {
      allMergedBest = { current: merged.length, target: children.length };
    }
    if (merged.length !== children.length) continue;
    const last = Math.max(...merged.map((child) => child.finishedAt ?? 0));
    if (!allMerged || last < allMerged.last) {
      allMerged = { parent, children, last };
    }
  }
  progress.push({
    catalogId: 'all-merged',
    current: allMergedBest.current,
    target: allMergedBest.target,
  });
  if (allMerged) {
    candidates.push({
      catalogId: 'all-merged',
      category: 'structure',
      sourceEntityId: allMerged.parent.id,
      snapshot: {
        parentId: allMerged.parent.id,
        parentTitle: allMerged.parent.title,
        path: branchPath(allMerged.parent, byId),
        childCount: allMerged.children.length,
        lastFinishedAt: allMerged.last,
        eventDate: dateOf(allMerged.last),
      },
    });
  }

  // 双线并行：同一父下两条子分支活跃区间交集 ≥14 天。
  let bestPair: {
    parent: BadgeBranchRow;
    first: BadgeBranchRow;
    second: BadgeBranchRow;
    from: number;
    to: number;
    days: number;
  } | null = null;
  for (const parent of branches) {
    const children = (childrenOf.get(parent.id) ?? []).filter((child) => child.depth > 0);
    for (let i = 0; i < children.length; i += 1) {
      for (let j = i + 1; j < children.length; j += 1) {
        const first = children[i]!;
        const second = children[j]!;
        const from = Math.max(first.createdAt, second.createdAt);
        const to = Math.min(activeEnd(first, nowMs), activeEnd(second, nowMs));
        const days = Math.floor((to - from) / DAY_MS);
        if (days < 0) continue;
        const better =
          !bestPair ||
          days > bestPair.days ||
          (days === bestPair.days && parent.id < bestPair.parent.id);
        if (better) {
          bestPair = { parent, first, second, from, to, days };
        }
      }
    }
  }
  progress.push({
    catalogId: 'dual-lanes',
    current: bestPair?.days ?? 0,
    target: 14,
  });
  if (bestPair && bestPair.days >= 14) {
    candidates.push({
      catalogId: 'dual-lanes',
      category: 'structure',
      sourceEntityId: bestPair.parent.id,
      snapshot: {
        parentId: bestPair.parent.id,
        parentTitle: bestPair.parent.title,
        firstBranchId: bestPair.first.id,
        firstTitle: bestPair.first.title,
        secondBranchId: bestPair.second.id,
        secondTitle: bestPair.second.title,
        fromDate: dateOf(bestPair.from),
        toDate: dateOf(bestPair.to),
        days: bestPair.days,
        eventDate: dateOf(bestPair.to),
      },
    });
  }

  // 断舍离：第一次放下并填写原因。
  const drops = branches
    .filter(
      (branch) =>
        branch.depth > 0 &&
        branch.droppedAt !== null &&
        (branch.dropReason ?? '').trim().length > 0,
    )
    .sort(
      (left, right) =>
        (left.droppedAt ?? 0) - (right.droppedAt ?? 0) || left.id.localeCompare(right.id),
    );
  progress.push({ catalogId: 'let-go', current: drops.length, target: 1 });
  const firstDrop = drops[0];
  if (firstDrop && firstDrop.droppedAt !== null) {
    candidates.push({
      catalogId: 'let-go',
      category: 'structure',
      sourceEntityId: firstDrop.id,
      snapshot: {
        branchId: firstDrop.id,
        title: firstDrop.title,
        path: branchPath(firstDrop, byId),
        droppedAt: firstDrop.droppedAt,
        dropReason: firstDrop.dropReason,
        eventDate: dateOf(firstDrop.droppedAt),
      },
    });
  }

  // 有始有终：L3 收尾且本分支有效提交 ≥10。
  let wellEnded: { branch: BadgeBranchRow; count: number } | null = null;
  let wellEndedMax = 0;
  for (const branch of branches) {
    if (branch.depth !== 3 || branch.status !== 'merged' || branch.finishedAt === null) continue;
    const count = commitCount(commits, new Set([branch.id]));
    wellEndedMax = Math.max(wellEndedMax, count);
    if (count < 10) continue;
    if (!wellEnded || (branch.finishedAt ?? 0) < (wellEnded.branch.finishedAt ?? 0)) {
      wellEnded = { branch, count };
    }
  }
  progress.push({ catalogId: 'well-ended', current: wellEndedMax, target: 10 });
  if (wellEnded) {
    candidates.push({
      catalogId: 'well-ended',
      category: 'structure',
      sourceEntityId: wellEnded.branch.id,
      snapshot: {
        branchId: wellEnded.branch.id,
        title: wellEnded.branch.title,
        path: branchPath(wellEnded.branch, byId),
        commitCount: wellEnded.count,
        createdAt: wellEnded.branch.createdAt,
        finishedAt: wellEnded.branch.finishedAt,
        eventDate: dateOf(wellEnded.branch.finishedAt ?? wellEnded.branch.createdAt),
      },
    });
  }

  // 五面：5 条一级分支各自含后代至少 1 条有效提交。
  const topLevel: Array<{ branch: BadgeBranchRow; firstDate: string }> = [];
  for (const branch of branches) {
    if (branch.depth !== 1) continue;
    const ids = subtreeIds(branch.id, childrenOf);
    const dates = commits
      .filter((commit) => ids.has(commit.branchId))
      .map((commit) => commit.date)
      .sort();
    if (dates.length > 0) topLevel.push({ branch, firstDate: dates[0]! });
  }
  topLevel.sort(
    (left, right) =>
      left.firstDate.localeCompare(right.firstDate) ||
      left.branch.id.localeCompare(right.branch.id),
  );
  progress.push({ catalogId: 'five-faces', current: topLevel.length, target: 5 });
  if (topLevel.length >= 5) {
    const five = topLevel.slice(0, 5);
    const sortedDates = five.map((row) => row.firstDate).sort();
    const eventDate = sortedDates[sortedDates.length - 1] ?? five[0]!.firstDate;
    candidates.push({
      catalogId: 'five-faces',
      category: 'structure',
      sourceEntityId: five[0]!.branch.id,
      snapshot: {
        branches: five.map((row) => ({
          branchId: row.branch.id,
          title: row.branch.title,
          firstDate: row.firstDate,
        })),
        eventDate,
      },
    });
  }

  // 主干：某条一级分支连续 3 个自然月有提交（含后代）。
  let trunk: {
    branch: BadgeBranchRow;
    run: MonthRun;
    stats: ReturnType<typeof monthStats>;
  } | null = null;
  let trunkMax = 0;
  for (const branch of branches) {
    if (branch.depth !== 1) continue;
    const ids = subtreeIds(branch.id, childrenOf);
    const stats = monthStats(commits, ids);
    const run = longestRun(stats);
    trunkMax = Math.max(trunkMax, run.length);
    if (run.length < 3) continue;
    if (!trunk || run.lastDate < trunk.run.lastDate) trunk = { branch, run, stats };
  }
  progress.push({ catalogId: 'trunk', current: trunkMax, target: 3 });
  if (trunk) {
    candidates.push({
      catalogId: 'trunk',
      category: 'structure',
      sourceEntityId: trunk.branch.id,
      snapshot: {
        branchId: trunk.branch.id,
        title: trunk.branch.title,
        fromMonth: trunk.run.months[0]!,
        toMonth: trunk.run.months[trunk.run.months.length - 1]!,
        months: monthBreakdown(trunk.stats, trunk.run.months),
        eventDate: trunk.run.lastDate,
      },
    });
  }

  return { candidates, progress };
}

export type { BadgeBranchRow, BadgeCommitRow, BadgeMilestoneRow };
