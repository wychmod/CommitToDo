/**
 * 收尾预检（TECH §5.3.3 R12 / PRD M08 OP-01、OP-08）。
 *
 * 只做纯判断：只能合并到直接父分支，父分支必须进行中且未归档；
 * 根分支、已合并、已归档、已放下以及存在进行中后代的分支不可收尾。
 * 提交数与未完成待办数由调用方（用例或读钩子）先算好再传入，便于确认文案直接使用。
 */

export type FinishLifecycle = 'active' | 'merged' | 'dropped';

export interface FinishNode {
  id: string;
  parentId: string | null;
  depth: number;
  status: FinishLifecycle;
  archivedAt: number | null;
  deletedAt?: number | null;
}

export type FinishBlockReason =
  'root' | 'readonly' | 'parent-missing' | 'parent-readonly' | 'unfinished-descendant';

export interface FinishPrecheck {
  allowed: boolean;
  reason: FinishBlockReason | null;
  /** 合并去向：直接父分支；父分支缺失时为 null。 */
  parent: FinishNode | null;
  /** 将并入父分支的提交数量（含已撤销，撤销提交同样迁移）。 */
  commitCount: number;
  /** 将移入父分支的未完成待办数量。 */
  openTaskCount: number;
}

export interface FinishPrecheckInput {
  subject: FinishNode;
  parent: FinishNode | undefined;
  descendants: readonly FinishNode[];
  commitCount: number;
  openTaskCount: number;
}

/** 入口可用性：不计条数，只判断结构上能否收尾；可收尾时返回 null。 */
export function finishEntryReason(
  subject: FinishNode,
  parent: FinishNode | undefined,
  descendants: readonly FinishNode[],
): FinishBlockReason | null {
  if (subject.deletedAt) return 'readonly';
  if (subject.depth === 0 || subject.parentId === null) return 'root';
  if (subject.status !== 'active' || subject.archivedAt !== null) return 'readonly';
  if (!parent || parent.deletedAt || parent.id !== subject.parentId) return 'parent-missing';
  if (parent.status !== 'active' || parent.archivedAt !== null) return 'parent-readonly';
  const unfinished = descendants.some(
    (node) => !node.deletedAt && node.status === 'active' && node.archivedAt === null,
  );
  if (unfinished) return 'unfinished-descendant';
  return null;
}

export function assessFinish(input: FinishPrecheckInput): FinishPrecheck {
  const reason = finishEntryReason(input.subject, input.parent, input.descendants);
  return {
    allowed: reason === null,
    reason,
    parent: input.parent ?? null,
    commitCount: input.commitCount,
    openTaskCount: input.openTaskCount,
  };
}
