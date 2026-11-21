/**
 * 分支自己的进度（R7 / M04 §5）。
 *
 * 只看 `branchId` 等于本分支的待办：已完成分子只算 `done`，
 * 分母不含 `cancelled` 与软删；子分支待办一律不计入。
 */

export interface ProgressTask {
  branchId: string;
  status: 'open' | 'done' | 'cancelled';
  deletedAt?: number | null;
}

export interface BranchProgress {
  done: number;
  total: number;
  /** 0–1；分母为 0 时固定 0，页面改为显示「还没有待办」。 */
  ratio: number;
  hasProgress: boolean;
}

export function computeBranchProgress(
  branchId: string,
  tasks: readonly ProgressTask[],
): BranchProgress {
  let done = 0;
  let total = 0;
  for (const task of tasks) {
    if (task.branchId !== branchId) continue;
    if ((task.deletedAt ?? null) !== null) continue;
    if (task.status === 'cancelled') continue;
    total += 1;
    if (task.status === 'done') done += 1;
  }
  return { done, total, ratio: total === 0 ? 0 : done / total, hasProgress: total > 0 };
}
