/**
 * 模板入口与撤回的判定（PRD V2-03 §3 / §4.3 / OP-08 / OP-09）。
 *
 * 入口只在「空白工作区」出现：只剩根分支「我」，没有待办、提交与里程碑；
 * 示例树归属示例账号，不计入本机真实数据。撤回只要求模板子树内没有
 * 有效提交（`voidedAt == null`）与里程碑，已作废的提交不算。
 */

export interface GuardBranchRow {
  id: string;
  parentId: string | null;
  depth: number;
  deletedAt: number | null;
}

export interface GuardTaskRow {
  id: string;
  branchId: string;
  deletedAt: number | null;
}

export interface GuardCommitRow {
  branchId: string;
  voidedAt: number | null;
  deletedAt: number | null;
}

export interface GuardMilestoneRow {
  branchId: string;
  deletedAt: number | null;
}

export interface GuardRows {
  branches: readonly GuardBranchRow[];
  tasks: readonly GuardTaskRow[];
  commits: readonly GuardCommitRow[];
  milestones: readonly GuardMilestoneRow[];
}

export function isBlankWorkspace(rows: GuardRows): boolean {
  const liveBranches = rows.branches.filter((branch) => branch.deletedAt === null);
  if (liveBranches.length !== 1) return false;
  if (liveBranches[0]!.depth !== 0) return false;
  if (rows.tasks.some((task) => task.deletedAt === null)) return false;
  if (rows.commits.some((commit) => commit.deletedAt === null)) return false;
  return !rows.milestones.some((milestone) => milestone.deletedAt === null);
}

export type TemplateWithdrawReason = 'none' | 'missing' | 'commits' | 'milestones';

export interface TemplateWithdrawAssessment {
  allowed: boolean;
  reason: TemplateWithdrawReason;
  branchIds: string[];
  taskIds: string[];
}

/** 收集模板根分支及其后代（只看未删除分支）。 */
export function templateSubtree(rootId: string, rows: GuardRows): string[] {
  const live = rows.branches.filter((branch) => branch.deletedAt === null);
  const ids = new Set<string>([rootId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const branch of live) {
      if (branch.parentId === null || !ids.has(branch.parentId) || ids.has(branch.id)) continue;
      ids.add(branch.id);
      grew = true;
    }
  }
  return [...ids];
}

export function assessTemplateWithdraw(
  rootId: string,
  rows: GuardRows,
): TemplateWithdrawAssessment {
  const root = rows.branches.find(
    (branch) => branch.id === rootId && branch.deletedAt === null && branch.depth === 1,
  );
  if (!root) {
    return { allowed: false, reason: 'missing', branchIds: [], taskIds: [] };
  }

  const branchIds = templateSubtree(rootId, rows);
  const inSubtree = new Set(branchIds);
  const taskIds = rows.tasks
    .filter((task) => task.deletedAt === null && inSubtree.has(task.branchId))
    .map((task) => task.id);

  const hasCommit = rows.commits.some(
    (commit) =>
      commit.deletedAt === null && commit.voidedAt === null && inSubtree.has(commit.branchId),
  );
  if (hasCommit) return { allowed: false, reason: 'commits', branchIds, taskIds };

  const hasMilestone = rows.milestones.some(
    (milestone) => milestone.deletedAt === null && inSubtree.has(milestone.branchId),
  );
  if (hasMilestone) return { allowed: false, reason: 'milestones', branchIds, taskIds };

  return { allowed: true, reason: 'none', branchIds, taskIds };
}
