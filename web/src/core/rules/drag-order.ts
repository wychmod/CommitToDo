/**
 * 组内拖拽排序（PRD V1-08 OP-01 / OP-07）。
 *
 * 纯函数只认同一作用域内的 id 顺序：跨组（今天三组）或跨父（分支树）直接拒绝；
 * 拖到自身位置是无操作。写入 `order` 由用例完成，这里不碰仓储。
 */

export type DragPosition = 'before' | 'after';

export interface DragScope {
  /** 今天组 `overdue|today|noDue`，或分支树的父分支 id。 */
  group: string;
  /** 分支树用父分支 id；今天组留空。 */
  parentId?: string | null;
}

export type DragRejectReason = 'cross-group' | 'cross-parent' | 'single';

export type DragResult =
  { ok: true; ids: string[]; changed: boolean } | { ok: false; reason: DragRejectReason };

export function reorderIds(
  ids: readonly string[],
  draggedId: string,
  targetId: string,
  position: DragPosition,
  source: DragScope,
  target: DragScope,
): DragResult {
  if (source.group !== target.group) return { ok: false, reason: 'cross-group' };
  if ((source.parentId ?? null) !== (target.parentId ?? null)) {
    return { ok: false, reason: 'cross-parent' };
  }
  if (ids.length < 2) return { ok: false, reason: 'single' };
  if (draggedId === targetId) return { ok: true, ids: [...ids], changed: false };

  const without = ids.filter((id) => id !== draggedId);
  const targetIndex = without.indexOf(targetId);
  if (targetIndex === -1) return { ok: true, ids: [...ids], changed: false };

  const insertAt = position === 'before' ? targetIndex : targetIndex + 1;
  const next = [...without.slice(0, insertAt), draggedId, ...without.slice(insertAt)];
  return {
    ok: true,
    ids: next,
    changed: next.some((id, index) => id !== ids[index]),
  };
}

/** 按当前显示顺序写成 1..n；重复与空值都会在这里被规整。 */
export function sequentialOrders(ids: readonly string[]): Array<{ id: string; order: number }> {
  return ids.map((id, index) => ({ id, order: index + 1 }));
}
