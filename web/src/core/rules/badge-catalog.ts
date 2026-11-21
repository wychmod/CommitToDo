/**
 * 徽章目录与徽章墙派生（PRD V1-05 §4.1 / §4.2 / R18）。
 *
 * 目录为 V1 的 16 项加 V2 的 5 枚彩蛋，是常量不是表；`periodKey` 统一为 `all`，
 * 同一用户同一 `catalogId` 只授一次。「还差 N」现算：达成度 ≥50% 才给差距。
 */

export type BadgeCategory = 'structure' | 'time' | 'milestone' | 'easter';

export type BadgeCatalogId =
  | 'first-commit'
  | 'first-fork'
  | 'first-milestone'
  | 'first-merge'
  | 'all-merged'
  | 'dual-lanes'
  | 'let-go'
  | 'well-ended'
  | 'five-faces'
  | 'trunk'
  | 'backfill'
  | 'evergreen'
  | 'first-year'
  | 'three-milestones'
  | 'milestone-note'
  | 'year-marks'
  | 'night-flight'
  | 'cross-year'
  | 'blank-year'
  | 'revival'
  | 'full-moon';

/** 16 枚一辈子只发一次，统一周期键。 */
export const BADGE_PERIOD_ALL = 'all';

export interface BadgeCatalogEntry {
  catalogId: BadgeCatalogId;
  category: BadgeCategory;
}

/** 顺序即目录顺序：同批发放与徽章墙「未获得」都按此排列。 */
export const BADGE_CATALOG: readonly BadgeCatalogEntry[] = [
  { catalogId: 'first-commit', category: 'time' },
  { catalogId: 'first-fork', category: 'structure' },
  { catalogId: 'first-milestone', category: 'milestone' },
  { catalogId: 'first-merge', category: 'structure' },
  { catalogId: 'all-merged', category: 'structure' },
  { catalogId: 'dual-lanes', category: 'structure' },
  { catalogId: 'let-go', category: 'structure' },
  { catalogId: 'well-ended', category: 'structure' },
  { catalogId: 'five-faces', category: 'structure' },
  { catalogId: 'trunk', category: 'structure' },
  { catalogId: 'backfill', category: 'time' },
  { catalogId: 'evergreen', category: 'time' },
  { catalogId: 'first-year', category: 'time' },
  { catalogId: 'three-milestones', category: 'milestone' },
  { catalogId: 'milestone-note', category: 'milestone' },
  { catalogId: 'year-marks', category: 'milestone' },
  // V2 彩蛋：获得前不进任何界面，顺序同样固定。
  { catalogId: 'night-flight', category: 'easter' },
  { catalogId: 'cross-year', category: 'easter' },
  { catalogId: 'blank-year', category: 'easter' },
  { catalogId: 'revival', category: 'easter' },
  { catalogId: 'full-moon', category: 'easter' },
];

export const BADGE_CATALOG_SIZE = BADGE_CATALOG.length;

export const BADGE_CATEGORY_ORDER: readonly BadgeCategory[] = [
  'structure',
  'time',
  'milestone',
  'easter',
];

const BY_ID = new Map(BADGE_CATALOG.map((entry) => [entry.catalogId, entry]));

const ORDER = new Map(BADGE_CATALOG.map((entry, index) => [entry.catalogId, index]));

/** M11 上线时的旧标识，读库时归一到当前目录。 */
const LEGACY_IDS: Record<string, BadgeCatalogId> = {
  'first-branch': 'first-fork',
};

export function catalogEntry(catalogId: string): BadgeCatalogEntry | null {
  const canonical = canonicalBadgeId(catalogId);
  return canonical ? (BY_ID.get(canonical) ?? null) : null;
}

/** 未知或彩蛋标识返回 `null`；旧标识归一到现行目录。 */
export function canonicalBadgeId(catalogId: string): BadgeCatalogId | null {
  const legacy = LEGACY_IDS[catalogId];
  if (legacy) return legacy;
  return BY_ID.has(catalogId as BadgeCatalogId) ? (catalogId as BadgeCatalogId) : null;
}

export function badgeOrder(catalogId: string): number {
  const canonical = canonicalBadgeId(catalogId);
  return canonical ? (ORDER.get(canonical) ?? Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER;
}

export function badgesInCategory(category: BadgeCategory): BadgeCatalogEntry[] {
  return BADGE_CATALOG.filter((entry) => entry.category === category);
}

export interface BadgeCandidate {
  catalogId: BadgeCatalogId;
  category: BadgeCategory;
  sourceEntityId: string;
  snapshot: Record<string, unknown>;
}

/** 「还差 N」的分母与当前值；由各条件模块现算。 */
export interface BadgeProgress {
  catalogId: BadgeCatalogId;
  current: number;
  target: number;
}

export interface BadgeWallBadgeRow {
  id: string;
  catalogId: string;
  grantedAt: number;
}

export interface BadgeWallItem {
  catalogId: BadgeCatalogId;
  category: BadgeCategory;
  /** 已获得时给出授予记录；重复行按 `grantedAt` 取最早一条。 */
  earned: { id: string; grantedAt: number } | null;
  /** 未获得且达成度 ≥50% 时为剩余数量，否则 `null`。 */
  remaining: number | null;
  /** 0–1，已获得恒为 1。 */
  percent: number;
}

export interface BadgeWallGroup {
  category: BadgeCategory;
  earnedCount: number;
  total: number;
  items: BadgeWallItem[];
}

export interface BadgeWall {
  total: number;
  earnedCount: number;
  groups: BadgeWallGroup[];
}

const HALF = 0.5;

/**
 * 徽章墙：已获得在前按 `grantedAt` 倒序，未获得按目录顺序；
 * 空分类保留（页头按三类固定 8 / 4 / 4）。
 */
export function buildBadgeWall(
  badges: readonly BadgeWallBadgeRow[],
  progress: readonly BadgeProgress[],
): BadgeWall {
  const progressById = new Map(progress.map((row) => [row.catalogId, row]));
  const earnedById = new Map<BadgeCatalogId, { id: string; grantedAt: number }>();

  for (const badge of badges) {
    const catalogId = canonicalBadgeId(badge.catalogId);
    if (!catalogId) continue;
    const existing = earnedById.get(catalogId);
    if (!existing || badge.grantedAt < existing.grantedAt) {
      earnedById.set(catalogId, { id: badge.id, grantedAt: badge.grantedAt });
    }
  }

  const groups = BADGE_CATEGORY_ORDER.map((category) => {
    const entries = badgesInCategory(category);
    const earned = entries
      .filter((entry) => earnedById.has(entry.catalogId))
      .sort((left, right) => {
        const a = earnedById.get(left.catalogId)!;
        const b = earnedById.get(right.catalogId)!;
        return b.grantedAt - a.grantedAt || a.id.localeCompare(b.id);
      });
    // 彩蛋未获得时连灰点与条件都不出现，只列已获得的。
    const unearned =
      category === 'easter' ? [] : entries.filter((entry) => !earnedById.has(entry.catalogId));

    const items: BadgeWallItem[] = [
      ...earned.map((entry) => ({
        catalogId: entry.catalogId,
        category,
        earned: earnedById.get(entry.catalogId)!,
        remaining: null,
        percent: 1,
      })),
      ...unearned.map((entry) => {
        const row = progressById.get(entry.catalogId);
        if (!row || row.target <= 0) {
          return {
            catalogId: entry.catalogId,
            category,
            earned: null,
            remaining: null,
            percent: 0,
          };
        }
        const ratio = Math.min(1, Math.max(0, row.current / row.target));
        return {
          catalogId: entry.catalogId,
          category,
          earned: null,
          remaining: ratio >= HALF ? Math.ceil(row.target) - row.current : null,
          percent: ratio,
        };
      }),
    ];

    return {
      category,
      earnedCount: earned.length,
      total: entries.length,
      items,
    };
  });

  return {
    total: BADGE_CATALOG_SIZE,
    earnedCount: earnedById.size,
    groups,
  };
}
