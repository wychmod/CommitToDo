/**
 * 分支物化路径（TECH §5.3.1）。
 *
 * 每个分支的 `path` 为「父路径 + 自身 id + `/`」，根为 `/`。
 * 末尾斜杠让前缀查询不会把 `/a/b/` 与 `/a/bc/` 混为一支。
 */

export const ROOT_PATH = '/';

export function childPath(parentPath: string, id: string): string {
  const base = parentPath.endsWith('/') ? parentPath : `${parentPath}/`;
  return `${base}${id}/`;
}

/** 路径段数减一：`/` → 0，`/a/` → 1，`/a/b/` → 2。 */
export function depthFromPath(path: string): number {
  if (path === ROOT_PATH) return 0;
  return path.split('/').filter(Boolean).length;
}

/** 严格后代判定，避免把兄弟分支算进子树。 */
export function isDescendantPath(path: string, ancestorPath: string): boolean {
  return path !== ancestorPath && path.startsWith(ancestorPath);
}

/** 按路径前缀取整棵子树（含自身），不把 `/a/bc/` 混进 `/a/b/`。 */
export function collectSubtree<T extends { path: string }>(
  nodes: readonly T[],
  rootPath: string,
): T[] {
  return nodes.filter((node) => node.path === rootPath || node.path.startsWith(rootPath));
}

/** 移动子树时的路径改写：保留自身及后代在原子树中的相对后缀。 */
export function movedPath(nodePath: string, oldRootPath: string, newParentPath: string): string {
  const suffix = nodePath.slice(oldRootPath.length);
  const base = newParentPath.endsWith('/') ? newParentPath : `${newParentPath}/`;
  return `${base}${suffix}`;
}
