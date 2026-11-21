import { toLocalDate } from '@/core/clock';

/**
 * 示例树规格（PRD M12 A-02 / OP-05）。
 *
 * 3–4 条分支覆盖 L1/L2/L3、8–12 条提交、恰好 2 个里程碑；全部记录带
 * `ownerId = 'example'` 与 `example:` 前缀，落库时只进独立命名空间，
 * 真实树、四计数、徽章、搜索与导出都按 `ownerId = 'local'` 或前缀排除。
 * 示例只读，因此这里只产出可展示的行，不提供任何写操作。
 */

export const SAMPLE_OWNER_ID = 'example';
export const SAMPLE_ID_PREFIX = 'example:';

export interface SampleBranchRow {
  id: string;
  ownerId: string;
  parentId: string | null;
  path: string;
  depth: number;
  title: string;
  goal: string | null;
  color: string;
  status: 'active' | 'merged' | 'dropped';
  order: number;
  archivedAt: number | null;
  finishedAt: number | null;
  finishedIntoId: string | null;
  droppedAt: number | null;
  dropReason: string | null;
  pinnedAt: number | null;
  taskTotal: number;
  taskDone: number;
  commitCount: number;
  ownLastCommitAt: number | null;
  rev: number;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

export interface SampleCommitRow {
  id: string;
  ownerId: string;
  branchId: string;
  sourceBranchId: string;
  taskId: string | null;
  date: string;
  at: number;
  summary: string;
  voidedAt: number | null;
  rev: number;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

export interface SampleMilestoneRow {
  id: string;
  ownerId: string;
  branchId: string;
  title: string;
  note: string | null;
  achievedAt: number;
  datePrecision: 'day' | 'month' | 'year';
  rev: number;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

export interface SampleTree {
  branches: SampleBranchRow[];
  commits: SampleCommitRow[];
  milestones: SampleMilestoneRow[];
}

const DAY = 86_400_000;

const BRANCHES: ReadonlyArray<{
  key: string;
  parent: string | null;
  depth: number;
  title: string;
  goal: string;
  color: string;
  order: number;
  daysAgo: number;
}> = [
  {
    key: 'work',
    parent: null,
    depth: 1,
    title: '示例 · 工作',
    goal: '把每天要做的事放到同一条线上',
    color: 'sky',
    order: 0,
    daysAgo: 21,
  },
  {
    key: 'study',
    parent: null,
    depth: 1,
    title: '示例 · 学习',
    goal: '读完一本书并留下几条笔记',
    color: 'mint',
    order: 1,
    daysAgo: 18,
  },
  {
    key: 'side',
    parent: 'work',
    depth: 2,
    title: '示例 · 副业',
    goal: '从工作线里分出一条小路',
    color: 'sky',
    order: 0,
    daysAgo: 12,
  },
  {
    key: 'read',
    parent: 'side',
    depth: 3,
    title: '示例 · 读书计划',
    goal: '再往下一层，看看时间树的样子',
    color: 'sky',
    order: 0,
    daysAgo: 6,
  },
];

const COMMITS: ReadonlyArray<{ branch: string; daysAgo: number; summary: string }> = [
  { branch: 'work', daysAgo: 20, summary: '整理本周要做的事' },
  { branch: 'work', daysAgo: 17, summary: '完成项目周报' },
  { branch: 'study', daysAgo: 16, summary: '读完第一章' },
  { branch: 'work', daysAgo: 13, summary: '和同事对齐接口' },
  { branch: 'side', daysAgo: 11, summary: '搭好副业的第一版页面' },
  { branch: 'study', daysAgo: 9, summary: '写下三条读书笔记' },
  { branch: 'work', daysAgo: 7, summary: '修掉一个拖了很久的问题' },
  { branch: 'read', daysAgo: 5, summary: '读完第二本书的前半本' },
  { branch: 'side', daysAgo: 3, summary: '把页面发给朋友试用' },
  { branch: 'study', daysAgo: 1, summary: '整理笔记并归档' },
];

const MILESTONES: ReadonlyArray<{ branch: string; daysAgo: number; title: string }> = [
  { branch: 'work', daysAgo: 14, title: '示例 · 第一个里程碑' },
  { branch: 'read', daysAgo: 4, title: '示例 · 读完一本书' },
];

function id(key: string): string {
  return `${SAMPLE_ID_PREFIX}${key}`;
}

/** 以「今天」为锚点生成示例树；同一 `deps` 重复生成得到同一组 id。 */
export function buildSampleTree(anchorMs: number, tzOffsetMinutes: number): SampleTree {
  const at = (daysAgo: number) => anchorMs - daysAgo * DAY;

  const branches: SampleBranchRow[] = [];
  const byId = new Map<string, SampleBranchRow>();

  for (const item of BRANCHES) {
    const createdAt = at(item.daysAgo);
    const parentId = item.parent ? id(item.parent) : null;
    const parentPath = parentId ? byId.get(parentId)?.path : null;
    const row: SampleBranchRow = {
      id: id(item.key),
      ownerId: SAMPLE_OWNER_ID,
      parentId,
      path: parentPath ? `${parentPath}/${id(item.key)}` : id(item.key),
      depth: item.depth,
      title: item.title,
      goal: item.goal,
      color: item.color,
      status: 'active',
      order: item.order,
      archivedAt: null,
      finishedAt: null,
      finishedIntoId: null,
      droppedAt: null,
      dropReason: null,
      pinnedAt: null,
      taskTotal: 0,
      taskDone: 0,
      commitCount: COMMITS.filter((commit) => commit.branch === item.key).length,
      ownLastCommitAt: null,
      rev: 1,
      createdAt,
      updatedAt: createdAt,
      deletedAt: null,
    };
    branches.push(row);
    byId.set(row.id, row);
  }

  const commits: SampleCommitRow[] = COMMITS.map((item) => {
    const committedAt = at(item.daysAgo);
    return {
      id: id(`commit-${item.branch}-${item.daysAgo}`),
      ownerId: SAMPLE_OWNER_ID,
      branchId: id(item.branch),
      sourceBranchId: id(item.branch),
      taskId: null,
      date: toLocalDate(committedAt, tzOffsetMinutes),
      at: committedAt,
      summary: item.summary,
      voidedAt: null,
      rev: 1,
      createdAt: committedAt,
      updatedAt: committedAt,
      deletedAt: null,
    };
  });

  const milestones: SampleMilestoneRow[] = MILESTONES.map((item) => {
    const achievedAt = at(item.daysAgo);
    return {
      id: id(`milestone-${item.branch}`),
      ownerId: SAMPLE_OWNER_ID,
      branchId: id(item.branch),
      title: item.title,
      note: null,
      achievedAt,
      datePrecision: 'day',
      rev: 1,
      createdAt: achievedAt,
      updatedAt: achievedAt,
      deletedAt: null,
    };
  });

  return { branches, commits, milestones };
}

/** 规格自检：数量、层级覆盖与命名空间标识。 */
export function sampleTreeProblems(tree: SampleTree): string[] {
  const problems: string[] = [];
  const liveBranches = tree.branches.filter((branch) => branch.deletedAt === null);
  if (liveBranches.length < 3 || liveBranches.length > 4) {
    problems.push('branch-count');
  }
  for (const depth of [1, 2, 3]) {
    if (!liveBranches.some((branch) => branch.depth === depth)) {
      problems.push(`missing-depth-${depth}`);
    }
  }
  if (tree.commits.length < 8 || tree.commits.length > 12) {
    problems.push('commit-count');
  }
  if (tree.milestones.length !== 2) {
    problems.push('milestone-count');
  }
  const records = [...tree.branches, ...tree.commits, ...tree.milestones];
  if (
    records.some((row) => row.ownerId !== SAMPLE_OWNER_ID || !row.id.startsWith(SAMPLE_ID_PREFIX))
  ) {
    problems.push('namespace');
  }
  return problems;
}

export function isValidSampleTree(tree: SampleTree): boolean {
  return sampleTreeProblems(tree).length === 0;
}
