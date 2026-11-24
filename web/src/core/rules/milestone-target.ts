import { isDateString } from '@/core/clock';

/**
 * 里程碑的所属分支规则（M07 §4.2 / §5）。
 *
 * 根分支始终可选；进行中且未归档的分支可选；已归档、已合并、已放下不可选。
 * 未选或所选不可用时默认根分支。
 */

export type MilestoneTargetReason = 'deleted' | 'archived' | 'merged' | 'dropped' | null;

export interface MilestoneTargetBranch {
  id: string;
  parentId: string | null;
  title: string;
  status: 'active' | 'merged' | 'dropped';
  archivedAt: number | null;
  droppedAt: number | null;
  deletedAt: number | null;
  depth: number;
  order: number;
}

export function milestoneTargetReason(branch: MilestoneTargetBranch): MilestoneTargetReason {
  if (branch.parentId === null) return null;
  if (branch.deletedAt !== null) return 'deleted';
  if (branch.archivedAt !== null) return 'archived';
  if (branch.status === 'dropped' || branch.droppedAt !== null) return 'dropped';
  if (branch.status === 'merged') return 'merged';
  return null;
}

export function isMilestoneTargetEligible(branch: MilestoneTargetBranch): boolean {
  return milestoneTargetReason(branch) === null;
}

/** 下拉顺序：根在上，其余按层级与 `order`。 */
export function milestoneTargetOptions(
  branches: readonly MilestoneTargetBranch[],
): Array<{ branch: MilestoneTargetBranch; reason: MilestoneTargetReason }> {
  return branches
    .filter((branch) => branch.deletedAt === null)
    .slice()
    .sort((a, b) => a.depth - b.depth || a.order - b.order)
    .map((branch) => ({ branch, reason: milestoneTargetReason(branch) }));
}

export function defaultMilestoneBranchId(
  branches: readonly MilestoneTargetBranch[],
  preferredId: string | null,
): string | null {
  const preferred = preferredId ? branches.find((branch) => branch.id === preferredId) : undefined;
  if (preferred && isMilestoneTargetEligible(preferred)) return preferred.id;
  return (
    branches.find((branch) => branch.parentId === null && branch.deletedAt === null)?.id ?? null
  );
}

export type MilestoneDraftField = 'title' | 'date';
export type MilestoneDraftReason = 'empty' | 'invalid' | 'future';

export interface MilestoneDraftIssue {
  field: MilestoneDraftField;
  reason: MilestoneDraftReason;
}

export interface MilestoneDraftInput {
  title: string;
  /** 始终为 `YYYY-MM-DD`；月精度由调用方归一为当月 1 日。 */
  date: string;
  precision: 'day' | 'month';
  todayDate: string;
}

/** 只校验标题与日期；分支可用性由目标规则单独判定。 */
export function validateMilestoneDraft(input: MilestoneDraftInput): MilestoneDraftIssue[] {
  const issues: MilestoneDraftIssue[] = [];
  if (input.title.trim().length === 0) {
    issues.push({ field: 'title', reason: 'empty' });
  }
  if (!isDateString(input.date)) {
    issues.push({ field: 'date', reason: 'invalid' });
  } else {
    const future =
      input.precision === 'month'
        ? input.date.slice(0, 7) > input.todayDate.slice(0, 7)
        : input.date > input.todayDate;
    if (future) issues.push({ field: 'date', reason: 'future' });
  }
  return issues;
}
