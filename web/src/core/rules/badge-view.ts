import { addDays, toLocalDate } from '@/core/clock';
import { canonicalBadgeId } from '@/core/rules/badge-catalog';
import { milestoneAnchor } from '@/core/rules/timeline-placement';

/**
 * 徽章跳转与撤销标注（PRD V1-05 OP-06 / M11 OP-04 / OP-07）。
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
  droppedAt?: number | null;
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

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MISSING: BadgeViewResult = { state: 'missing', jump: null };

function text(snapshot: Record<string, unknown>, key: string): string | null {
  const value = snapshot[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function num(snapshot: Record<string, unknown>, key: string): number | null {
  const value = snapshot[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function preferEventDate(snapshot: Record<string, unknown>, fallback: string): string {
  const value = snapshot.eventDate;
  return typeof value === 'string' && DATE_PATTERN.test(value) ? value : fallback;
}

function liveBranch(rows: BadgeViewRows, branchId: string | null): BadgeViewBranch | null {
  if (!branchId) return null;
  const branch = rows.branches.find((row) => row.id === branchId);
  return branch && branch.deletedAt === null ? branch : null;
}

function liveMilestone(rows: BadgeViewRows, milestoneId: string | null): BadgeViewMilestone | null {
  if (!milestoneId) return null;
  const milestone = rows.milestones.find((row) => row.id === milestoneId);
  return milestone && milestone.deletedAt === null ? milestone : null;
}

function branchJump(
  badge: BadgeViewInput,
  branch: BadgeViewBranch,
  fallback: string,
): BadgeViewResult {
  return {
    state: 'ok',
    jump: { branchId: branch.id, date: preferEventDate(badge.snapshot, fallback) },
  };
}

function milestoneJump(
  badge: BadgeViewInput,
  milestone: BadgeViewMilestone,
  tzOffsetMinutes: number,
): BadgeViewResult {
  return {
    state: 'ok',
    jump: {
      branchId: milestone.branchId,
      date: preferEventDate(
        badge.snapshot,
        milestoneAnchor(milestone.achievedAt, milestone.datePrecision, tzOffsetMinutes),
      ),
      milestoneId: milestone.id,
    },
  };
}

export function resolveBadgeView(
  badge: BadgeViewInput,
  rows: BadgeViewRows,
  tzOffsetMinutes: number,
): BadgeViewResult {
  const catalogId = canonicalBadgeId(badge.catalogId);
  if (!catalogId) return MISSING;

  if (catalogId === 'first-commit') {
    const commitId = text(badge.snapshot, 'commitId') ?? badge.sourceEntityId;
    const commit = commitId ? rows.commits.find((row) => row.id === commitId) : undefined;
    if (!commit || commit.deletedAt !== null) return MISSING;
    if (commit.voidedAt !== null) return { state: 'revoked', jump: null };
    return {
      state: 'ok',
      jump: { branchId: commit.branchId, date: commit.date, commitId: commit.id },
    };
  }

  if (catalogId === 'first-milestone') {
    const milestone = liveMilestone(
      rows,
      text(badge.snapshot, 'milestoneId') ?? badge.sourceEntityId,
    );
    return milestone ? milestoneJump(badge, milestone, tzOffsetMinutes) : MISSING;
  }

  if (catalogId === 'first-merge') {
    const branch = liveBranch(rows, text(badge.snapshot, 'branchId') ?? badge.sourceEntityId);
    if (!branch) return MISSING;
    const finishedAt = branch.finishedAt ?? num(badge.snapshot, 'finishedAt');
    const intoId = branch.finishedIntoId ?? text(badge.snapshot, 'finishedIntoId');
    if (finishedAt === null || !intoId) return MISSING;
    return {
      state: 'ok',
      jump: {
        branchId: intoId,
        date: preferEventDate(badge.snapshot, toLocalDate(finishedAt, tzOffsetMinutes)),
      },
    };
  }

  if (
    catalogId === 'first-fork' ||
    catalogId === 'all-merged' ||
    catalogId === 'dual-lanes' ||
    catalogId === 'well-ended' ||
    catalogId === 'trunk' ||
    catalogId === 'evergreen' ||
    catalogId === 'first-year'
  ) {
    const branchId =
      text(badge.snapshot, 'branchId') ?? text(badge.snapshot, 'parentId') ?? badge.sourceEntityId;
    const branch = liveBranch(rows, branchId);
    if (!branch) return MISSING;
    const fallback =
      catalogId === 'first-year'
        ? addDays(toLocalDate(branch.createdAt, tzOffsetMinutes), 365)
        : toLocalDate(branch.finishedAt ?? branch.droppedAt ?? branch.createdAt, tzOffsetMinutes);
    return branchJump(badge, branch, fallback);
  }

  if (catalogId === 'let-go') {
    const branch = liveBranch(rows, text(badge.snapshot, 'branchId') ?? badge.sourceEntityId);
    if (!branch) return MISSING;
    const droppedAt = branch.droppedAt ?? num(badge.snapshot, 'droppedAt') ?? branch.createdAt;
    return branchJump(badge, branch, toLocalDate(droppedAt, tzOffsetMinutes));
  }

  if (catalogId === 'five-faces') {
    const entries = Array.isArray(badge.snapshot.branches)
      ? (badge.snapshot.branches as Array<Record<string, unknown>>)
      : [];
    for (const entry of entries) {
      const branchId = typeof entry.branchId === 'string' ? entry.branchId : null;
      const branch = liveBranch(rows, branchId);
      if (!branch) continue;
      const fallback =
        typeof entry.firstDate === 'string' && DATE_PATTERN.test(entry.firstDate)
          ? entry.firstDate
          : toLocalDate(branch.createdAt, tzOffsetMinutes);
      return branchJump(badge, branch, fallback);
    }
    const fallbackBranch = liveBranch(rows, badge.sourceEntityId);
    if (!fallbackBranch) return MISSING;
    return branchJump(
      badge,
      fallbackBranch,
      toLocalDate(fallbackBranch.createdAt, tzOffsetMinutes),
    );
  }

  if (
    catalogId === 'backfill' ||
    catalogId === 'three-milestones' ||
    catalogId === 'milestone-note'
  ) {
    const milestone = liveMilestone(
      rows,
      text(badge.snapshot, 'milestoneId') ?? badge.sourceEntityId,
    );
    return milestone ? milestoneJump(badge, milestone, tzOffsetMinutes) : MISSING;
  }

  if (catalogId === 'year-marks') {
    const ids = Array.isArray(badge.snapshot.milestoneIds)
      ? badge.snapshot.milestoneIds.filter((value): value is string => typeof value === 'string')
      : [];
    for (const id of ids) {
      const milestone = liveMilestone(rows, id);
      if (milestone) return milestoneJump(badge, milestone, tzOffsetMinutes);
    }
    return MISSING;
  }

  return MISSING;
}
