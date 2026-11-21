/**
 * 默认树可见性与归档分组（V1-01 / R14 / R8）。
 *
 * 归档只写选中分支自己的 `archivedAt`，后代靠「祖先不可见」一起隐藏；
 * 取消归档只清选中行，未被单独归档的后代随之回到默认树。
 * 归档区按一级分支分组，顶层只列最外层归档分支，后代作为缩进行随祖先展示。
 */

import { isDescendantPath } from './branch-path';

export interface VisibilityBranch {
  id: string;
  parentId: string | null;
  path: string;
  depth: number;
  title: string;
  order: number;
  status: 'active' | 'merged' | 'dropped';
  archivedAt: number | null;
  deletedAt?: number | null;
  createdAt?: number;
}

function byTreeOrder(a: VisibilityBranch, b: VisibilityBranch): number {
  return (
    a.depth - b.depth ||
    a.order - b.order ||
    (a.createdAt ?? 0) - (b.createdAt ?? 0) ||
    a.path.localeCompare(b.path)
  );
}

function ancestorOf(
  branch: VisibilityBranch,
  byId: ReadonlyMap<string, VisibilityBranch>,
): VisibilityBranch | undefined {
  return branch.parentId ? byId.get(branch.parentId) : undefined;
}

/** 祖先链上是否有已归档或已删除的分支。 */
export function hasHiddenAncestor(
  branch: VisibilityBranch,
  byId: ReadonlyMap<string, VisibilityBranch>,
): boolean {
  let current = ancestorOf(branch, byId);
  let guard = 0;
  while (current && guard < 32) {
    if (current.deletedAt || current.archivedAt !== null) return true;
    current = ancestorOf(current, byId);
    guard += 1;
  }
  return false;
}

/** 分支是否出现在默认树：自身未归档未删除，且祖先链上没有归档或删除。 */
export function isVisibleInDefaultTree(
  branch: VisibilityBranch,
  byId: ReadonlyMap<string, VisibilityBranch>,
): boolean {
  if (branch.deletedAt) return false;
  if (branch.archivedAt !== null) return false;
  return !hasHiddenAncestor(branch, byId);
}

export function visibleDefaultTree<T extends VisibilityBranch>(branches: readonly T[]): T[] {
  const byId = new Map(branches.map((branch) => [branch.id, branch]));
  return branches.filter((branch) => isVisibleInDefaultTree(branch, byId)).sort(byTreeOrder);
}

/** 沿父链找到一级分支（depth = 1）；自身就是一级时返回自身。 */
export function firstLevelAncestor(
  branch: VisibilityBranch,
  byId: ReadonlyMap<string, VisibilityBranch>,
): VisibilityBranch {
  let current: VisibilityBranch = branch;
  let guard = 0;
  while (current.parentId && guard < 32) {
    const parent = byId.get(current.parentId);
    if (!parent || parent.depth < 1) break;
    current = parent;
    guard += 1;
  }
  return current;
}

export interface ArchivedRow<T> {
  branch: T;
  /** 相对分组一级分支的缩进层数。 */
  indent: number;
  /** 是否自己写过 `archivedAt`；未单独归档的后代不能直接取消归档。 */
  individuallyArchived: boolean;
}

export interface ArchivedGroup<T> {
  groupId: string;
  groupTitle: string;
  /** 该一级分支下最外层归档条数。 */
  archivedCount: number;
  rows: ArchivedRow<T>[];
}

/**
 * 归档区列表。
 *
 * 顶层只取「自身已归档且祖先未归档」的分支；其整棵可见子树作为缩进行，
 * 因此同一子树不会在归档区重复列出，未单独归档的后代也能随祖先看到。
 */
export function groupArchivedBranches<T extends VisibilityBranch>(
  branches: readonly T[],
): ArchivedGroup<T>[] {
  const live = branches.filter((branch) => !branch.deletedAt);
  const byId = new Map(live.map((branch) => [branch.id, branch]));
  const tops = live
    .filter((branch) => branch.archivedAt !== null && !hasHiddenAncestor(branch, byId))
    .sort(byTreeOrder);

  const groups = new Map<string, ArchivedGroup<T>>();
  for (const top of tops) {
    const groupBranch = firstLevelAncestor(top, byId);
    const existing = groups.get(groupBranch.id);
    const group: ArchivedGroup<T> = existing ?? {
      groupId: groupBranch.id,
      groupTitle: groupBranch.title,
      archivedCount: 0,
      rows: [],
    };

    const subtree = live
      .filter((branch) => branch.path === top.path || isDescendantPath(branch.path, top.path))
      .sort(byTreeOrder);

    group.archivedCount += subtree.filter((branch) => branch.archivedAt !== null).length;
    group.rows.push(
      ...subtree.map((branch) => ({
        branch,
        indent: Math.max(0, branch.depth - groupBranch.depth),
        individuallyArchived: branch.archivedAt !== null,
      })),
    );
    groups.set(groupBranch.id, group);
  }

  return [...groups.values()].sort((a, b) =>
    (byId.get(a.groupId)?.path ?? '').localeCompare(byId.get(b.groupId)?.path ?? ''),
  );
}
