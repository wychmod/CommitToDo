/**
 * 周回顾提问（TECH §5.3.3 R9 / PRD M09 OP-03）。
 *
 * 只生成一个问题：优先本周提交最多的分支；并列取最近提交所在分支；
 * 仍并列按分支 `order`，最后用 id 保证稳定。分支缺失或全部已放下时退化为通用提问，
 * 不报错、不给建议、不接受输入。
 */

export type WeekQuestionTemplate =
  'today.weekReview.question.topBranch' | 'today.weekReview.question.generic';

export interface WeekQuestionCommit {
  branchId: string;
  at: number;
  voidedAt: number | null;
  date: string;
}

export interface WeekQuestionBranch {
  id: string;
  title: string;
  order: number;
  status: 'active' | 'merged' | 'dropped';
  deletedAt?: number | null;
}

export interface WeekQuestion {
  template: WeekQuestionTemplate;
  branchId: string | null;
  branchTitle: string | null;
  commitCount: number;
  branchCount: number;
}

interface Candidate {
  branchId: string;
  title: string;
  count: number;
  latestAt: number;
  order: number;
}

export function pickWeekQuestion(input: {
  commits: readonly WeekQuestionCommit[];
  branches: readonly WeekQuestionBranch[];
}): WeekQuestion {
  const branchById = new Map(input.branches.map((branch) => [branch.id, branch]));
  const grouped = new Map<string, Candidate>();

  for (const commit of input.commits) {
    if (commit.voidedAt !== null) continue;
    const branch = branchById.get(commit.branchId);
    // 已放下与已删除的分支不参与提问候选；提交事实仍由统计层保留。
    if (!branch || branch.deletedAt || branch.status === 'dropped') continue;
    const current = grouped.get(commit.branchId);
    if (current) {
      current.count += 1;
      current.latestAt = Math.max(current.latestAt, commit.at);
    } else {
      grouped.set(commit.branchId, {
        branchId: branch.id,
        title: branch.title,
        count: 1,
        latestAt: commit.at,
        order: branch.order,
      });
    }
  }

  const candidates = [...grouped.values()].sort(
    (left, right) =>
      right.count - left.count ||
      right.latestAt - left.latestAt ||
      left.order - right.order ||
      left.branchId.localeCompare(right.branchId),
  );
  const top = candidates[0];
  const commitCount = input.commits.filter((commit) => commit.voidedAt === null).length;
  const branchCount = new Set(
    input.commits
      .filter((commit) => commit.voidedAt === null && branchById.has(commit.branchId))
      .map((commit) => commit.branchId),
  ).size;

  if (!top) {
    return {
      template: 'today.weekReview.question.generic',
      branchId: null,
      branchTitle: null,
      commitCount,
      branchCount,
    };
  }

  return {
    template: 'today.weekReview.question.topBranch',
    branchId: top.branchId,
    branchTitle: top.title,
    commitCount,
    branchCount,
  };
}
