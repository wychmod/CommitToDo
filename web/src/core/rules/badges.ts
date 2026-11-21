/**
 * 首批四枚徽章的条件判定（PRD M11 / R18）。
 *
 * 只做纯判定：从当前数据里找出每个 `catalogId` 的「第一次」并给出快照，
 * 不读写库、不关心是否已经发过。同一枚举只取最早的一条，`id` 做稳定兜底。
 * 根分支不参与「汇流」：只有收尾子分支才可能让分支变成 `merged`。
 */

export type BadgeCatalogId = 'first-commit' | 'first-branch' | 'first-milestone' | 'first-merge';

export type BadgeCategory = 'structure' | 'time' | 'milestone';

/** 首批徽章一辈子只发一次，用固定周期键配合唯一索引做幂等。 */
export const BADGE_PERIOD_ONCE = 'once';

export interface BadgeCatalogEntry {
  catalogId: BadgeCatalogId;
  category: BadgeCategory;
}

export const BADGE_CATALOG: readonly BadgeCatalogEntry[] = [
  { catalogId: 'first-commit', category: 'time' },
  { catalogId: 'first-branch', category: 'structure' },
  { catalogId: 'first-milestone', category: 'milestone' },
  { catalogId: 'first-merge', category: 'structure' },
];

export interface BadgeBranchRow {
  id: string;
  parentId: string | null;
  depth: number;
  title: string;
  status: 'active' | 'merged' | 'dropped';
  createdAt: number;
  finishedAt: number | null;
  finishedIntoId: string | null;
  deletedAt: number | null;
}

export interface BadgeCommitRow {
  id: string;
  branchId: string;
  summary: string;
  at: number;
  voidedAt: number | null;
  deletedAt: number | null;
}

export interface BadgeMilestoneRow {
  id: string;
  branchId: string;
  title: string;
  achievedAt: number;
  datePrecision: 'day' | 'month' | 'year';
  deletedAt: number | null;
}

export interface BadgeTriggerRows {
  branches: readonly BadgeBranchRow[];
  commits: readonly BadgeCommitRow[];
  milestones: readonly BadgeMilestoneRow[];
}

export interface BadgeCandidate {
  catalogId: BadgeCatalogId;
  category: BadgeCategory;
  sourceEntityId: string;
  snapshot: Record<string, unknown>;
}

function earliest<T>(rows: readonly T[], at: (row: T) => number, id: (row: T) => string): T | null {
  let best: T | null = null;
  for (const row of rows) {
    if (best === null) {
      best = row;
      continue;
    }
    const delta = at(row) - at(best);
    if (delta < 0 || (delta === 0 && id(row) < id(best))) best = row;
  }
  return best;
}

/** 四枚徽章各自的候选；不满足条件的跳过，四者互不串扰。 */
export function assessBadges(rows: BadgeTriggerRows): BadgeCandidate[] {
  const candidates: BadgeCandidate[] = [];

  const firstCommit = earliest(
    rows.commits.filter((commit) => commit.deletedAt === null && commit.voidedAt === null),
    (commit) => commit.at,
    (commit) => commit.id,
  );
  if (firstCommit) {
    candidates.push({
      catalogId: 'first-commit',
      category: 'time',
      sourceEntityId: firstCommit.id,
      snapshot: {
        commitId: firstCommit.id,
        branchId: firstCommit.branchId,
        summary: firstCommit.summary,
        at: firstCommit.at,
      },
    });
  }

  const firstBranch = earliest(
    rows.branches.filter((branch) => branch.deletedAt === null && branch.depth === 2),
    (branch) => branch.createdAt,
    (branch) => branch.id,
  );
  if (firstBranch) {
    candidates.push({
      catalogId: 'first-branch',
      category: 'structure',
      sourceEntityId: firstBranch.id,
      snapshot: {
        branchId: firstBranch.id,
        parentId: firstBranch.parentId,
        title: firstBranch.title,
        createdAt: firstBranch.createdAt,
      },
    });
  }

  const firstMilestone = earliest(
    rows.milestones.filter((milestone) => milestone.deletedAt === null),
    (milestone) => milestone.achievedAt,
    (milestone) => milestone.id,
  );
  if (firstMilestone) {
    candidates.push({
      catalogId: 'first-milestone',
      category: 'milestone',
      sourceEntityId: firstMilestone.id,
      snapshot: {
        milestoneId: firstMilestone.id,
        branchId: firstMilestone.branchId,
        title: firstMilestone.title,
        datePrecision: firstMilestone.datePrecision,
        achievedAt: firstMilestone.achievedAt,
      },
    });
  }

  const firstMerge = earliest(
    rows.branches.filter(
      (branch) =>
        branch.deletedAt === null &&
        branch.depth > 0 &&
        branch.status === 'merged' &&
        branch.finishedAt !== null,
    ),
    (branch) => branch.finishedAt ?? 0,
    (branch) => branch.id,
  );
  if (firstMerge) {
    candidates.push({
      catalogId: 'first-merge',
      category: 'structure',
      sourceEntityId: firstMerge.id,
      snapshot: {
        branchId: firstMerge.id,
        finishedIntoId: firstMerge.finishedIntoId,
        title: firstMerge.title,
        finishedAt: firstMerge.finishedAt,
      },
    });
  }

  return candidates;
}
