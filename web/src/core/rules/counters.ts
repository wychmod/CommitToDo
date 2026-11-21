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
  /** 提交主键；同一条提交因同步重放出现两次时按它去重。 */
  id?: string;
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
  const seenCommitIds = new Set<string>();

  for (const task of tasks) {
    if (task.branchId !== branchId || !isLive(task)) continue;
    if (task.status === 'cancelled') continue;
    taskTotal += 1;
    if (task.status === 'done') taskDone += 1;
  }

  for (const commit of commits) {
    if (commit.branchId !== branchId || !isLive(commit) || commit.voidedAt) continue;
    if (commit.id) {
      if (seenCommitIds.has(commit.id)) continue;
      seenCommitIds.add(commit.id);
    }
    commitCount += 1;
    if (ownLastCommitAt === null || commit.at > ownLastCommitAt) ownLastCommitAt = commit.at;
  }

  return { taskTotal, taskDone, commitCount, ownLastCommitAt };
}
