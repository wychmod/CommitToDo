/**
 * 徽章授予选择与幂等（PRD V1-05 OP-05 / R18）。
 *
 * 纯选择：已存在同 `catalogId` 的记录即跳过；旧标识 `first-branch`
 * 归一到 `first-fork` 后再比较，避免 M11 已发的徽章被重复授予。
 * 一次满足多枚时按目录顺序返回。导入后的补查抑制由 `skipBackfill` 表达。
 */

import {
  badgeOrder,
  canonicalBadgeId,
  type BadgeCandidate,
  type BadgeCatalogId,
} from './badge-catalog';

export interface ExistingBadgeRef {
  catalogId: string;
}

export interface GrantSelectOptions {
  /** 本次会话刚导入/恢复过数据：不重算、不补发缺失徽章。 */
  skipBackfill?: boolean;
}

export function selectNewBadges(
  candidates: readonly BadgeCandidate[],
  existing: readonly ExistingBadgeRef[],
  options: GrantSelectOptions = {},
): BadgeCandidate[] {
  if (options.skipBackfill) return [];

  const taken = new Set<BadgeCatalogId>();
  for (const badge of existing) {
    const catalogId = canonicalBadgeId(badge.catalogId);
    if (catalogId) taken.add(catalogId);
  }

  const chosen = new Map<BadgeCatalogId, BadgeCandidate>();
  for (const candidate of candidates) {
    const catalogId = canonicalBadgeId(candidate.catalogId);
    if (!catalogId || taken.has(catalogId) || chosen.has(catalogId)) continue;
    chosen.set(catalogId, candidate);
  }

  return [...chosen.values()].sort(
    (left, right) => badgeOrder(left.catalogId) - badgeOrder(right.catalogId),
  );
}
