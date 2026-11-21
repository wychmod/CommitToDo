/**
 * 收尾迁移计划（PRD M08 §5 / OP-04）。
 *
 * 纯计算，不读写库：列出要移到父分支的未完成待办与提交、留在原分支的行，
 * 以及留在原分支的里程碑。写入侧按这份计划逐行改归属，任一步失败整体回滚。
 */

export type PlanTaskStatus = 'open' | 'done' | 'cancelled';

export interface PlanTask {
  id: string;
  branchId: string;
  status: PlanTaskStatus;
  deletedAt?: number | null;
}

export interface PlanCommit {
  id: string;
  branchId: string;
  /** 原始来源，迁移时保持不变，父分支提交流据此标注「来自 X」。 */
  sourceBranchId: string;
  at: number;
  voidedAt: number | null;
  deletedAt?: number | null;
}

export interface PlanMilestone {
  id: string;
  branchId: string;
  deletedAt?: number | null;
}

export interface FinishPlan {
  /** 未完成待办：改属父分支。 */
  movedTasks: PlanTask[];
  /** 已完成、已取消与软删待办：留在原分支。 */
  stayedTasks: PlanTask[];
  /** 全部未删除提交（含已撤销）：改属父分支。 */
  movedCommits: PlanCommit[];
  /** 迁移后仍计入有效提交的条数（`voidedAt` 为空）。 */
  effectiveCommitCount: number;
  /** 里程碑不改归属，留在原分支。 */
  milestones: PlanMilestone[];
}

const isLive = (row: { deletedAt?: number | null }): boolean => !row.deletedAt;

export function planFinishMigration(
  subjectId: string,
  tasks: readonly PlanTask[],
  commits: readonly PlanCommit[],
  milestones: readonly PlanMilestone[],
): FinishPlan {
  const movedTasks: PlanTask[] = [];
  const stayedTasks: PlanTask[] = [];

  for (const task of tasks) {
    if (task.branchId !== subjectId || !isLive(task)) continue;
    if (task.status === 'open') movedTasks.push(task);
    else stayedTasks.push(task);
  }

  const movedCommits: PlanCommit[] = [];
  let effectiveCommitCount = 0;
  for (const commit of commits) {
    if (commit.branchId !== subjectId || !isLive(commit)) continue;
    movedCommits.push(commit);
    if (commit.voidedAt === null) effectiveCommitCount += 1;
  }

  return {
    movedTasks,
    stayedTasks,
    movedCommits,
    effectiveCommitCount,
    milestones: milestones.filter(
      (milestone) => milestone.branchId === subjectId && isLive(milestone),
    ),
  };
}
