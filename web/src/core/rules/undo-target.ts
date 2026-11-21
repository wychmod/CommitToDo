import { isBranchAccepting } from './branch-state';

/**
 * 撤销后的待办去向（M05 §5 / OP-06）。
 *
 * 原分支可接收就留在原分支；已合并、已放下或已归档则向上取最近可接收祖先，
 * 一路都不可接收时落到根分支；`dueDate` 不在这里处理，由用例原样保留。
 */

export interface UndoBranchNode {
  id: string;
  parentId: string | null;
  status: 'active' | 'merged' | 'dropped';
  archivedAt: number | null;
  deletedAt?: number | null;
}

export function resolveUndoBranchId(
  branchId: string,
  byId: ReadonlyMap<string, UndoBranchNode>,
): string {
  const start = byId.get(branchId);
  if (!start) return branchId;
  if (isBranchAccepting(start)) return start.id;

  let current = start;
  let topmost = start.id;
  let guard = 0;
  while (current.parentId && guard < 32) {
    const parent = byId.get(current.parentId);
    if (!parent) break;
    if (isBranchAccepting(parent)) return parent.id;
    topmost = parent.id;
    current = parent;
    guard += 1;
  }
  return topmost;
}
