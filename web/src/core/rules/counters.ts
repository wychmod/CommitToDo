/**
 * 分支四个计数的重算（TECH-ARCHITECTURE.md §5.3.3 R7）。
 *
 * 只做纯计算：不读库、不写库。写入侧同事务更新计数，
 * 恢复 / 导入 / 迁移后调用本函数做全量重算与一致性自检。
 */

export interface CountTask {
  branchId: string;
  status: 'open' | 'done' | 'cancelled';
  deletedAt?: number | null;
}

export interface CountCommit {
  branchId: string;
  at: number;
  voidedAt?: number | null;
  deletedAt?: number | null;
}

export interface BranchCounts {
  taskTotal: number;
  taskDone: number;
  commitCount: number;
  ownLastCommitAt: number | null;
}

const isLive = (row: { deletedAt?: number | null }): boolean => !row.deletedAt;

export function recountBranch(
  branchId: string,
  tasks: readonly CountTask[],
  commits: readonly CountCommit[],
): BranchCounts {
  let taskTotal = 0;
  let taskDone = 0;
  let commitCount = 0;
  let ownLastCommitAt: number | null = null;

  for (const task of tasks) {
    if (task.branchId !== branchId || !isLive(task)) continue;
    if (task.status === 'cancelled') continue;
    taskTotal += 1;
    if (task.status === 'done') taskDone += 1;
  }

  for (const commit of commits) {
    if (commit.branchId !== branchId || !isLive(commit) || commit.voidedAt) continue;
    commitCount += 1;
    if (ownLastCommitAt === null || commit.at > ownLastCommitAt) ownLastCommitAt = commit.at;
  }

  return { taskTotal, taskDone, commitCount, ownLastCommitAt };
}
