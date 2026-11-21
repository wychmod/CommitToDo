/**
 * 徽章条件判定聚合（PRD V1-05 / R18）。
 *
 * 目录为 16 枚常规徽章与 5 枚彩蛋；条件各自在独立模块里判定，这里只做：
 * 合并候选、按目录顺序排序、合并「还差 N」进度。纯函数，不读写库。
 */

import {
  badgeOrder,
  BADGE_PERIOD_ALL,
  type BadgeCandidate,
  type BadgeCatalogId,
  type BadgeCategory,
  type BadgeProgress,
} from './badge-catalog';
import { assessMilestoneBadges } from './badge-milestone';
import { assessStructureBadges } from './badge-structure';
import { assessTimeBadges } from './badge-time';
import { assessEasterEggs } from './easter-egg';

export type { BadgeCandidate, BadgeCatalogId, BadgeCategory, BadgeProgress };
export { BADGE_PERIOD_ALL };

export interface BadgeBranchRow {
  id: string;
  parentId: string | null;
  depth: number;
  title: string;
  status: 'active' | 'merged' | 'dropped';
  createdAt: number;
  finishedAt: number | null;
  finishedIntoId: string | null;
  droppedAt: number | null;
  dropReason: string | null;
  archivedAt: number | null;
  deletedAt: number | null;
}

export interface BadgeCommitRow {
  id: string;
  branchId: string;
  summary: string;
  /** 业务日期 `YYYY-MM-DD`。 */
  date: string;
  at: number;
  voidedAt: number | null;
  deletedAt: number | null;
}

export interface BadgeMilestoneRow {
  id: string;
  branchId: string;
  title: string;
  note: string | null;
  achievedAt: number;
  datePrecision: 'day' | 'month' | 'year';
  createdAt: number;
  deletedAt: number | null;
}

export interface BadgeTriggerRows {
  branches: readonly BadgeBranchRow[];
  commits: readonly BadgeCommitRow[];
  milestones: readonly BadgeMilestoneRow[];
}

export interface BadgeAssessment {
  /** 按目录顺序排列。 */
  candidates: BadgeCandidate[];
  /** 按目录顺序排列，供徽章墙现算「还差 N」。 */
  progress: BadgeProgress[];
}

function mergeProgress(groups: readonly BadgeProgress[][]): BadgeProgress[] {
  const byId = new Map<BadgeCatalogId, BadgeProgress>();
  for (const group of groups) {
    for (const row of group) {
      if (!byId.has(row.catalogId)) byId.set(row.catalogId, row);
    }
  }
  return [...byId.values()].sort(
    (left, right) => badgeOrder(left.catalogId) - badgeOrder(right.catalogId),
  );
}

/**
 * 一次判定全部徽章（16 枚常规 + 5 枚彩蛋）。
 *
 * `nowMs` 只影响「活跃区间到判定时刻」「第一年」与已结束周期的边界；
 * `tzOffsetMinutes` 决定自然月、自然年与快照里的 `eventDate`。
 */
export function assessBadges(
  rows: BadgeTriggerRows,
  nowMs: number,
  tzOffsetMinutes: number,
): BadgeAssessment {
  const structure = assessStructureBadges(rows, nowMs, tzOffsetMinutes);
  const time = assessTimeBadges(rows, nowMs, tzOffsetMinutes);
  const milestone = assessMilestoneBadges(rows, tzOffsetMinutes);
  const easter = assessEasterEggs(rows, nowMs, tzOffsetMinutes);

  const candidates = [
    ...structure.candidates,
    ...time.candidates,
    ...milestone.candidates,
    ...easter.candidates,
  ].sort((left, right) => badgeOrder(left.catalogId) - badgeOrder(right.catalogId));

  return {
    candidates,
    progress: mergeProgress([structure.progress, time.progress, milestone.progress]),
  };
}
