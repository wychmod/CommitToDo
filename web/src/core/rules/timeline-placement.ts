/**
 * 分叉、合回与节点定位（M06 §5 / OP-01、OP-02）。
 *
 * 分叉点用 `createdAt`、合回点用 `finishedAt`；区间开始前创建的分支在左边界
 * 截断显示，不虚构日期；`month` 精度里程碑对齐到月份列（当月 1 日）。
 */

import { toLocalDate } from '@/core/clock';

export type PlacementStatus = 'active' | 'merged' | 'dropped';

export interface PlacementBranch {
  id: string;
  parentId: string | null;
  status: PlacementStatus;
  order: number;
  createdAt: number;
  finishedAt: number | null;
  finishedIntoId: string | null;
  archivedAt: number | null;
  droppedAt: number | null;
}

export interface PlacementCommit {
  branchId: string;
  voidedAt: number | null;
  deletedAt?: number | null;
}

export interface PlacementMilestone {
  branchId: string;
}

export interface PlacementRange {
  start: string | null;
  end: string;
}

export interface PlacementPoint {
  date: string;
  /** 分支创建早于区间起点，横坐标截断在左边界。 */
  clampedAtStart: boolean;
}

export function placeBranchStart(
  branch: PlacementBranch,
  range: PlacementRange,
  tzOffsetMinutes: number,
): PlacementPoint | null {
  const date = toLocalDate(branch.createdAt, tzOffsetMinutes);
  if (date > range.end) return null;
  if (range.start !== null && date < range.start) {
    return { date: range.start, clampedAtStart: true };
  }
  return { date, clampedAtStart: false };
}

export function placeBranchEnd(
  branch: PlacementBranch,
  range: PlacementRange,
  tzOffsetMinutes: number,
): PlacementPoint | null {
  if (branch.finishedAt === null) return null;
  const date = toLocalDate(branch.finishedAt, tzOffsetMinutes);
  if (date > range.end) return null;
  if (range.start !== null && date < range.start) return null;
  return { date, clampedAtStart: false };
}

export type MilestonePrecision = 'day' | 'month' | 'year';

/** 里程碑的渲染锚点：`month` 对齐当月 1 日，`year` 对齐当年 1 月 1 日。 */
export function milestoneAnchor(
  achievedAt: number,
  precision: MilestonePrecision,
  tzOffsetMinutes: number,
): string {
  const date = toLocalDate(achievedAt, tzOffsetMinutes);
  if (precision === 'month') return `${date.slice(0, 7)}-01`;
  if (precision === 'year') return `${date.slice(0, 4)}-01-01`;
  return date;
}

function isValidCommit(commit: PlacementCommit): boolean {
  return commit.voidedAt === null && (commit.deletedAt ?? null) === null;
}

/** 根泳道只在根有提交、里程碑或合并时出现。 */
export function rootLaneVisible(
  rootId: string,
  commits: readonly PlacementCommit[],
  milestones: readonly PlacementMilestone[],
  branches: readonly PlacementBranch[],
): boolean {
  if (commits.some((commit) => commit.branchId === rootId && isValidCommit(commit))) return true;
  if (milestones.some((milestone) => milestone.branchId === rootId)) return true;
  return branches.some((branch) => branch.id !== rootId && branch.finishedIntoId === rootId);
}

/** 泳道顺序：根在上，一级分支按 `order`，同级稳定。 */
export function orderLanes<T extends Pick<PlacementBranch, 'id' | 'parentId' | 'order'>>(
  rootId: string | null,
  branches: readonly T[],
): T[] {
  const root = rootId === null ? undefined : branches.find((branch) => branch.id === rootId);
  const levelOne = branches
    .filter((branch) => branch.parentId === rootId)
    .sort((a, b) => a.order - b.order);
  return root ? [root, ...levelOne] : levelOne;
}
