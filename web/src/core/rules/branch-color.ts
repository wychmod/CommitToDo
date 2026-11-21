/**
 * 分支色相与层级深浅（K-03）。
 *
 * 7 个预设色相，同一条血脉沿用同一色相；层级只改变深浅档位（L1 最浅、L3 最深）。
 * 根分支用中性色，不进入色相表；这里的档位函数对根返回 1，仅作占位。
 */

export const BRANCH_COLORS = ['coral', 'sky', 'honey', 'mint', 'iris', 'rose', 'teal'] as const;

export type BranchColor = (typeof BRANCH_COLORS)[number];

export const DEFAULT_BRANCH_COLOR: BranchColor = 'sky';

export function isBranchColor(value: unknown): value is BranchColor {
  return typeof value === 'string' && (BRANCH_COLORS as readonly string[]).includes(value);
}

/** 旧数据缺色、非法色相一律回落默认色，不抛错。 */
export function normalizeBranchColor(value: unknown): BranchColor {
  return isBranchColor(value) ? value : DEFAULT_BRANCH_COLOR;
}

/** 子分支继承父分支色相，不重新抽取。 */
export function inheritedBranchColor(parentColor: unknown): BranchColor {
  return normalizeBranchColor(parentColor);
}

/** 层级到深浅档位：L1 → 1，L2 → 2，L3 及更深 → 3。 */
export function branchShadeForDepth(depth: number): 1 | 2 | 3 {
  if (depth <= 1) return 1;
  if (depth === 2) return 2;
  return 3;
}
