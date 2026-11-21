/**
 * 分支层级与移动约束（TECH §5.3.3 R16、PRD B05）。
 *
 * 单根、最多 3 层；根不可被移动；分支只能移到自己的父分支；不能移到自身或后代下。
 */

export const MAX_BRANCH_DEPTH = 3;

export interface HierarchyPoint {
  id: string;
  /** 物化路径，以 `/` 开头并以 `/` 结尾，根为 `/`。 */
  path: string;
  depth: number;
}

export type MoveBlockReason = 'root' | 'self' | 'descendant' | 'too-deep';

export interface MoveAssessment {
  allowed: boolean;
  reason: MoveBlockReason | null;
  /** 移动后整棵子树的最大深度。 */
  resultingMaxDepth: number;
}

/** 是否还能在指定层级下新建子分支。 */
export function canCreateChild(parentDepth: number): boolean {
  return parentDepth + 1 <= MAX_BRANCH_DEPTH;
}

/** 路径前缀判定：`/a/` 是 `/a/b/` 的祖先，但不是 `/a/bc/` 的祖先。 */
export function isDescendantPath(path: string, ancestorPath: string): boolean {
  return path !== ancestorPath && path.startsWith(ancestorPath);
}

/**
 * 移动评估。
 *
 * @param subject 被移动分支当前的路径与深度
 * @param subtreeMaxDepth 被移动子树当前的最大深度（含自身）
 * @param target 目标父分支
 */
export function assessMove(
  subject: HierarchyPoint,
  subtreeMaxDepth: number,
  target: HierarchyPoint,
): MoveAssessment {
  const resultingMaxDepth = target.depth + 1 + Math.max(0, subtreeMaxDepth - subject.depth);

  if (subject.depth === 0) {
    return { allowed: false, reason: 'root', resultingMaxDepth };
  }
  if (target.id === subject.id) {
    return { allowed: false, reason: 'self', resultingMaxDepth };
  }
  if (isDescendantPath(target.path, subject.path)) {
    return { allowed: false, reason: 'descendant', resultingMaxDepth };
  }
  if (resultingMaxDepth > MAX_BRANCH_DEPTH) {
    return { allowed: false, reason: 'too-deep', resultingMaxDepth };
  }

  return { allowed: true, reason: null, resultingMaxDepth };
}
