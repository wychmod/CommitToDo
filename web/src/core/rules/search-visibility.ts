/**
 * 全局搜索的可见性与归属（PRD V1-04 §5 / OP-03、OP-04）。
 *
 * 只产出可展示的候选：撤销提交、软删对象、示例命名空间不进入；
 * 默认排除自身或祖先已归档的对象，开关打开后不过滤。
 * 已并入父分支的提交按当前 `branchId` 归属，并在来源不同时标注原始分支名。
 */

import { branchTrail } from './quick-add';
import { SAMPLE_ID_PREFIX, SAMPLE_OWNER_ID } from './sample-tree';

export type SearchKind = 'branch' | 'task' | 'commit' | 'milestone';
export type SearchBranchStatus = 'active' | 'merged' | 'dropped';

export interface SearchBranchRow {
  id: string;
  ownerId?: string;
  parentId: string | null;
  title: string;
  status: SearchBranchStatus;
  archivedAt: number | null;
  createdAt: number;
  deletedAt?: number | null;
}

export interface SearchTaskRow {
  id: string;
  ownerId?: string;
  branchId: string;
  title: string;
  dueDate: string | null;
  createdAt: number;
  deletedAt: number | null;
}

export interface SearchCommitRow {
  id: string;
  ownerId?: string;
  branchId: string;
  sourceBranchId: string;
  summary: string;
  date: string;
  at: number;
  voidedAt: number | null;
  deletedAt: number | null;
}

export interface SearchMilestoneRow {
  id: string;
  ownerId?: string;
  branchId: string;
  title: string;
  achievedAt: number;
  datePrecision: 'day' | 'month' | 'year';
  deletedAt: number | null;
}

export interface SearchSources {
  branches: readonly SearchBranchRow[];
  tasks: readonly SearchTaskRow[];
  commits: readonly SearchCommitRow[];
  milestones: readonly SearchMilestoneRow[];
}

export interface SearchVisibilityOptions {
  /** 包含归档历史；默认关闭。 */
  includeArchived: boolean;
}

interface SearchCandidateBase {
  id: string;
  kind: SearchKind;
  /** 匹配字段：分支名、待办标题、提交文案或里程碑标题。 */
  title: string;
  /** 主操作打开的对象所属分支；分支结果为自身。 */
  branchId: string;
  /** 归属路径，如「我 / 工作 / 主业」。 */
  path: string;
  /** 同组排序用的时间戳：分支与待办取 `createdAt`，提交取 `at`，里程碑取 `achievedAt`。 */
  at: number;
}

export interface SearchBranchCandidate extends SearchCandidateBase {
  kind: 'branch';
  status: SearchBranchStatus;
  /** 自身已归档；用于右侧信息展示。 */
  archived: boolean;
}

export interface SearchTaskCandidate extends SearchCandidateBase {
  kind: 'task';
  dueDate: string | null;
}

export interface SearchCommitCandidate extends SearchCandidateBase {
  kind: 'commit';
  /** 业务日期 `YYYY-MM-DD`。 */
  date: string;
  /** 并入父分支后与当前归属不同时才给出的原始分支名。 */
  sourceTitle: string | null;
}

export interface SearchMilestoneCandidate extends SearchCandidateBase {
  kind: 'milestone';
  achievedAt: number;
  datePrecision: 'day' | 'month' | 'year';
}

export type SearchCandidate =
  SearchBranchCandidate | SearchTaskCandidate | SearchCommitCandidate | SearchMilestoneCandidate;

/** 示例树使用独立命名空间，搜索只覆盖真实数据。 */
export function isSampleSearchRow(row: { id: string; ownerId?: string }): boolean {
  return row.ownerId === SAMPLE_OWNER_ID || row.id.startsWith(SAMPLE_ID_PREFIX);
}

function ancestors(
  branch: SearchBranchRow,
  byId: ReadonlyMap<string, SearchBranchRow>,
): SearchBranchRow[] {
  const chain: SearchBranchRow[] = [];
  let current = branch.parentId ? byId.get(branch.parentId) : undefined;
  let guard = 0;
  while (current && guard < 32) {
    chain.push(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
    guard += 1;
  }
  return chain;
}

/**
 * 分支是否进入结果。
 *
 * 默认要求自身与祖先都未归档；开关打开后只排除删除，
 * 归档不是状态，不能靠 `status` 判断。
 */
export function isSearchVisibleBranch(
  branch: SearchBranchRow,
  byId: ReadonlyMap<string, SearchBranchRow>,
  includeArchived: boolean,
): boolean {
  if (branch.deletedAt) return false;
  if (isSampleSearchRow(branch)) return false;
  if (!includeArchived && branch.archivedAt !== null) return false;

  for (const ancestor of ancestors(branch, byId)) {
    if (ancestor.deletedAt) return false;
    if (!includeArchived && ancestor.archivedAt !== null) return false;
  }
  return true;
}

/**
 * 收集四类候选（未做前缀匹配）。
 *
 * 调用方先过 `matchesSearchPrefix`，再交给 `groupSearchCandidates`
 * 排序与截断；本函数只负责「谁可以出现、归属写什么」。
 */
export function collectSearchCandidates(
  sources: SearchSources,
  options: SearchVisibilityOptions,
): SearchCandidate[] {
  const branches = sources.branches.filter((row) => !isSampleSearchRow(row));
  const byId = new Map(branches.map((branch) => [branch.id, branch]));
  const visible = new Set(
    branches
      .filter((branch) => isSearchVisibleBranch(branch, byId, options.includeArchived))
      .map((branch) => branch.id),
  );

  const items: SearchCandidate[] = [];

  for (const branch of branches) {
    if (!visible.has(branch.id)) continue;
    const parent = branch.parentId ? byId.get(branch.parentId) : undefined;
    items.push({
      kind: 'branch',
      id: branch.id,
      title: branch.title,
      branchId: branch.id,
      path: parent ? branchTrail(parent, byId) : '',
      status: branch.status,
      archived: branch.archivedAt !== null,
      at: branch.createdAt,
    });
  }

  for (const task of sources.tasks) {
    if (isSampleSearchRow(task) || task.deletedAt !== null) continue;
    if (!visible.has(task.branchId)) continue;
    const branch = byId.get(task.branchId);
    if (!branch) continue;
    items.push({
      kind: 'task',
      id: task.id,
      title: task.title,
      branchId: task.branchId,
      path: branchTrail(branch, byId),
      dueDate: task.dueDate,
      at: task.createdAt,
    });
  }

  for (const commit of sources.commits) {
    if (isSampleSearchRow(commit) || commit.voidedAt !== null || commit.deletedAt !== null)
      continue;
    if (!visible.has(commit.branchId)) continue;
    const branch = byId.get(commit.branchId);
    if (!branch) continue;
    const source = byId.get(commit.sourceBranchId);
    items.push({
      kind: 'commit',
      id: commit.id,
      title: commit.summary,
      branchId: commit.branchId,
      path: branchTrail(branch, byId),
      date: commit.date,
      sourceTitle: source && source.id !== commit.branchId ? source.title : null,
      at: commit.at,
    });
  }

  for (const milestone of sources.milestones) {
    if (isSampleSearchRow(milestone) || milestone.deletedAt !== null) continue;
    if (!visible.has(milestone.branchId)) continue;
    const branch = byId.get(milestone.branchId);
    if (!branch) continue;
    items.push({
      kind: 'milestone',
      id: milestone.id,
      title: milestone.title,
      branchId: milestone.branchId,
      path: branchTrail(branch, byId),
      achievedAt: milestone.achievedAt,
      datePrecision: milestone.datePrecision,
      at: milestone.achievedAt,
    });
  }

  return items;
}
