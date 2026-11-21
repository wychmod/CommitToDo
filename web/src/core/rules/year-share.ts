/**
 * 年度分享图数据模型（R11，PRD V1-03 §4.4）。
 *
 * 指标与占比直接复用年轮规则；节点每次从当前提交重建，撤销后不会残留旧数字。
 */

import { buildYearDistribution, type YearDistributionBranch } from './year-distribution';
import {
  computeYearMetrics,
  createLevelOneResolver,
  isYearCommit,
  type YearCommitRecord,
  type YearMetrics,
} from './year-metrics';

export interface YearShareCommit extends YearCommitRecord {
  id: string;
  at: number;
}

export interface YearShareNode {
  id: string;
  date: string;
  at: number;
}

export interface YearShareLane {
  branchId: string | null;
  /** 空白或含换行的名称返回 null，绘制层跳过。 */
  title: string | null;
  color: string | null;
  commits: number;
  ratio: number;
  nodes: YearShareNode[];
}

export interface YearShareModel {
  year: number;
  available: boolean;
  total: number;
  metrics: YearMetrics;
  lanes: YearShareLane[];
}

export function shareBranchTitle(title: string): string | null {
  if (title.trim() === '' || /[\r\n]/.test(title)) return null;
  return title.trim();
}

export function buildYearShareModel(input: {
  year: number;
  commits: readonly YearShareCommit[];
  branches: readonly YearDistributionBranch[];
  todayDate: string;
  tzOffsetMinutes: number;
}): YearShareModel {
  const { year, commits, branches } = input;
  const metrics = computeYearMetrics({
    year,
    commits,
    branches,
    tzOffsetMinutes: input.tzOffsetMinutes,
  });
  const distribution = buildYearDistribution({
    year,
    commits,
    branches,
    todayDate: input.todayDate,
  });
  const resolve = createLevelOneResolver(branches);
  const byId = new Map(branches.map((branch) => [branch.id, branch]));
  const nodes = new Map<string | null, YearShareNode[]>();

  for (const commit of commits) {
    if (!isYearCommit(commit, year)) continue;
    const levelOne = resolve(commit.branchId);
    const list = nodes.get(levelOne) ?? [];
    list.push({ id: commit.id, date: commit.date, at: commit.at });
    nodes.set(levelOne, list);
  }

  const lanes = distribution.shares.map((share) => ({
    branchId: share.branchId,
    title: share.branchId === null ? null : shareBranchTitle(byId.get(share.branchId)?.title ?? ''),
    color: share.color,
    commits: share.commits,
    ratio: share.ratio,
    nodes: (nodes.get(share.branchId) ?? []).sort(
      (left, right) => left.at - right.at || left.id.localeCompare(right.id),
    ),
  }));

  return {
    year,
    available: metrics.commits > 0,
    total: metrics.commits,
    metrics,
    lanes,
  };
}
