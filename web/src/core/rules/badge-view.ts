import { toLocalDate } from '@/core/clock';
import { milestoneAnchor } from '@/core/rules/timeline-placement';
import type { BadgeCatalogId } from '@/core/rules/badges';

/**
 * 徽章跳转与撤销标注（PRD M11 OP-04 / OP-07）。
 *
 * 快照只记录授予时的事实；跳转目标按快照里的实体 ID 回到当前数据里找。
 * 触发提交被撤销 → `revoked`；来源行被删除或找不到 → `missing`；两者都不删徽章。
 */
export type BadgeSourceState = 'ok' | 'revoked' | 'missing';

export interface BadgeJumpTarget {
  branchId: string;
  date: string;
  commitId?: string;
  milestoneId?: string;
}

export interface BadgeViewInput {
  catalogId: string;
  sourceEntityId: string | null;
  snapshot: Record<string, unknown>;
}

export interface BadgeViewCommit {
  id: string;
  branchId: string;
  date: string;
  voidedAt: number | null;
  deletedAt: number | null;
}

export interface BadgeViewBranch {
  id: string;
  parentId: string | null;
  createdAt: number;
  finishedAt: number | null;
  finishedIntoId: string | null;
  deletedAt: number | null;
}

export interface BadgeViewMilestone {
  id: string;
  branchId: string;
  achievedAt: number;
  datePrecision: 'day' | 'month' | 'year';
  deletedAt: number | null;
}

export interface BadgeViewRows {
  commits: readonly BadgeViewCommit[];
  branches: readonly BadgeViewBranch[];
  milestones: readonly BadgeViewMilestone[];
}

export interface BadgeViewResult {
  state: BadgeSourceState;
  jump: BadgeJumpTarget | null;
}

function text(snapshot: Record<string, unknown>, key: string): string | null {
  const value = snapshot[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function num(snapshot: Record<string, unknown>, key: string): number | null {
  const value = snapshot[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function resolveBadgeView(
  badge: BadgeViewInput,
  rows: BadgeViewRows,
  tzOffsetMinutes: number,
): BadgeViewResult {
  const missing: BadgeViewResult = { state: 'missing', jump: null };
  const catalogId = badge.catalogId as BadgeCatalogId;

  if (catalogId === 'first-commit') {
    const commitId = text(badge.snapshot, 'commitId') ?? badge.sourceEntityId;
    const commit = commitId ? rows.commits.find((row) => row.id === commitId) : undefined;
    if (!commit || commit.deletedAt !== null) return missing;
    if (commit.voidedAt !== null) return { state: 'revoked', jump: null };
    return {
      state: 'ok',
      jump: { branchId: commit.branchId, date: commit.date, commitId: commit.id },
    };
  }

  if (catalogId === 'first-branch') {
    const branchId = text(badge.snapshot, 'branchId') ?? badge.sourceEntityId;
    const branch = branchId ? rows.branches.find((row) => row.id === branchId) : undefined;
    if (!branch || branch.deletedAt !== null) return missing;
    return {
      state: 'ok',
      jump: { branchId: branch.id, date: toLocalDate(branch.createdAt, tzOffsetMinutes) },
    };
  }

  if (catalogId === 'first-milestone') {
    const milestoneId = text(badge.snapshot, 'milestoneId') ?? badge.sourceEntityId;
    const milestone = milestoneId
      ? rows.milestones.find((row) => row.id === milestoneId)
      : undefined;
    if (!milestone || milestone.deletedAt !== null) return missing;
    return {
      state: 'ok',
      jump: {
        branchId: milestone.branchId,
        date: milestoneAnchor(milestone.achievedAt, milestone.datePrecision, tzOffsetMinutes),
        milestoneId: milestone.id,
      },
    };
  }

  if (catalogId === 'first-merge') {
    const branchId = text(badge.snapshot, 'branchId') ?? badge.sourceEntityId;
    const branch = branchId ? rows.branches.find((row) => row.id === branchId) : undefined;
    if (!branch || branch.deletedAt !== null) return missing;
    const finishedAt = branch.finishedAt ?? num(badge.snapshot, 'finishedAt');
    const intoId = branch.finishedIntoId ?? text(badge.snapshot, 'finishedIntoId');
    if (finishedAt === null || !intoId) return missing;
    return {
      state: 'ok',
      jump: { branchId: intoId, date: toLocalDate(finishedAt, tzOffsetMinutes) },
    };
  }

  return missing;
}
