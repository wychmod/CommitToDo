/**
 * 撤销完成的字段补丁（R2 / M05 §5）。
 *
 * 纯函数只描述「应该变成什么」；事务与 `rev` 递增由用例负责。
 * 提交只写 `voidedAt`，不物理删除。
 */

export interface UndoCommitLike {
  voidedAt: number | null;
}

export function undoDecision(commit: UndoCommitLike): 'undo' | 'noop' {
  return commit.voidedAt === null ? 'undo' : 'noop';
}

export interface TaskUndoPatch {
  status: 'open';
  completedAt: null;
  completedCommitId: null;
  updatedAt: number;
}

export function taskUndoPatch(nowMs: number): TaskUndoPatch {
  return {
    status: 'open',
    completedAt: null,
    completedCommitId: null,
    updatedAt: nowMs,
  };
}

export interface CommitVoidPatch {
  voidedAt: number;
  updatedAt: number;
}

export function commitVoidPatch(nowMs: number): CommitVoidPatch {
  return { voidedAt: nowMs, updatedAt: nowMs };
}
