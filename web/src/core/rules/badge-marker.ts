/**
 * 历程树上标记的日期归并（PRD V1-05 OP-07 / §4.4）。
 *
 * 绑定日期优先 `snapshot.eventDate`，缺失时退回 `grantedAt` 的本地日期；
 * 同一本地日多枚只产出一个标记，标记上带数量与当天徽章名。
 */

import { toLocalDate } from '@/core/clock';
import { badgeOrder, canonicalBadgeId, type BadgeCatalogId } from './badge-catalog';

export interface BadgeMarkerInput {
  id: string;
  catalogId: string;
  grantedAt: number;
  snapshot: Record<string, unknown>;
}

export interface BadgeMarker {
  /** `YYYY-MM-DD`。 */
  date: string;
  count: number;
  /** 当天徽章，按目录顺序。 */
  catalogIds: BadgeCatalogId[];
  badgeIds: string[];
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function badgeMarkerDate(badge: BadgeMarkerInput, tzOffsetMinutes: number): string {
  const value = badge.snapshot.eventDate;
  if (typeof value === 'string' && DATE_PATTERN.test(value)) return value;
  return toLocalDate(badge.grantedAt, tzOffsetMinutes);
}

/** 按日期升序返回；同一天合并为一条。 */
export function buildBadgeMarkers(
  badges: readonly BadgeMarkerInput[],
  tzOffsetMinutes: number,
): BadgeMarker[] {
  const byDate = new Map<string, { badgeIds: string[]; catalogIds: Set<BadgeCatalogId> }>();

  for (const badge of badges) {
    const catalogId = canonicalBadgeId(badge.catalogId);
    if (!catalogId) continue;
    const date = badgeMarkerDate(badge, tzOffsetMinutes);
    const entry = byDate.get(date) ?? { badgeIds: [], catalogIds: new Set<BadgeCatalogId>() };
    entry.badgeIds.push(badge.id);
    entry.catalogIds.add(catalogId);
    byDate.set(date, entry);
  }

  return [...byDate.entries()]
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([date, entry]) => {
      const catalogIds = [...entry.catalogIds].sort(
        (left, right) => badgeOrder(left) - badgeOrder(right),
      );
      return {
        date,
        count: catalogIds.length,
        catalogIds,
        badgeIds: entry.badgeIds,
      };
    });
}
