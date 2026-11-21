import { describe, expect, it } from 'vitest';
import {
  collectSearchCandidates,
  isSearchVisibleBranch,
  type SearchBranchRow,
  type SearchCommitRow,
  type SearchMilestoneRow,
  type SearchSources,
  type SearchTaskRow,
} from './search-visibility';

/**
 * 结果可见性与归属（V1-04 §8.2 / OP-03、OP-04）。
 *
 * 最值钱的回归：祖先归档、自身未归档时，子树里的待办与提交也必须默认隐藏。
 */

function branch({ id, ...over }: Partial<SearchBranchRow> & { id: string }): SearchBranchRow {
  return {
    id,
    parentId: null,
    title: id,
    status: 'active',
    archivedAt: null,
    createdAt: 1,
    deletedAt: null,
    ...over,
  };
}

function task({
  id,
  branchId,
  ...over
}: Partial<SearchTaskRow> & { id: string; branchId: string }): SearchTaskRow {
  return {
    id,
    branchId,
    title: id,
    dueDate: null,
    createdAt: 1,
    deletedAt: null,
    ...over,
  };
}

function commit({
  id,
  branchId,
  ...over
}: Partial<SearchCommitRow> & { id: string; branchId: string }): SearchCommitRow {
  return {
    id,
    branchId,
    sourceBranchId: branchId,
    summary: id,
    date: '2026-11-20',
    at: 1,
    voidedAt: null,
    deletedAt: null,
    ...over,
  };
}

function milestone({
  id,
  branchId,
  ...over
}: Partial<SearchMilestoneRow> & { id: string; branchId: string }): SearchMilestoneRow {
  return {
    id,
    branchId,
    title: id,
    achievedAt: 1,
    datePrecision: 'day',
    deletedAt: null,
    ...over,
  };
}

function emptySources(): SearchSources {
  return { branches: [], tasks: [], commits: [], milestones: [] };
}

const TREE: SearchBranchRow[] = [
  branch({ id: 'me', title: '我' }),
  branch({ id: 'work', parentId: 'me', title: '工作', createdAt: 10 }),
  branch({ id: 'side', parentId: 'work', title: '主业', createdAt: 20 }),
];

describe('collectSearchCandidates', () => {
  it('撤销提交与软删对象不进入结果', () => {
    const items = collectSearchCandidates(
      {
        branches: TREE,
        tasks: [
          task({ id: 't-live', branchId: 'work' }),
          task({ id: 't-deleted', branchId: 'work', deletedAt: 5 }),
        ],
        commits: [
          commit({ id: 'c-live', branchId: 'work' }),
          commit({ id: 'c-voided', branchId: 'work', voidedAt: 5 }),
          commit({ id: 'c-deleted', branchId: 'work', deletedAt: 6 }),
        ],
        milestones: [
          milestone({ id: 'm-live', branchId: 'work' }),
          milestone({ id: 'm-deleted', branchId: 'work', deletedAt: 7 }),
        ],
      },
      { includeArchived: false },
    );

    expect(items.filter((item) => item.kind === 'task').map((item) => item.id)).toEqual(['t-live']);
    expect(items.filter((item) => item.kind === 'commit').map((item) => item.id)).toEqual([
      'c-live',
    ]);
    expect(items.filter((item) => item.kind === 'milestone').map((item) => item.id)).toEqual([
      'm-live',
    ]);
  });

  it('示例命名空间按 ownerId 或 id 前缀排除', () => {
    const items = collectSearchCandidates(
      {
        branches: [
          ...TREE,
          branch({ id: 'example:work', ownerId: 'example', title: '示例 · 工作' }),
          branch({ id: 'example:study', ownerId: 'local', title: '示例 · 学习' }),
        ],
        tasks: [task({ id: 'example:task', branchId: 'work', ownerId: 'example' })],
        commits: [],
        milestones: [],
      },
      { includeArchived: false },
    );

    expect(items.some((item) => item.id.startsWith('example:'))).toBe(false);
  });

  it('默认排除自身归档的分支及其待办、提交与里程碑，打开开关后纳入', () => {
    const sources: SearchSources = {
      branches: [...TREE, branch({ id: 'old', parentId: 'work', title: '旧线', archivedAt: 99 })],
      tasks: [task({ id: 't-old', branchId: 'old' })],
      commits: [commit({ id: 'c-old', branchId: 'old' })],
      milestones: [milestone({ id: 'm-old', branchId: 'old' })],
    };

    const hidden = collectSearchCandidates(sources, { includeArchived: false });
    expect(hidden.some((item) => item.id === 'old')).toBe(false);
    expect(hidden.some((item) => item.id === 't-old')).toBe(false);
    expect(hidden.some((item) => item.id === 'c-old')).toBe(false);
    expect(hidden.some((item) => item.id === 'm-old')).toBe(false);

    const shown = collectSearchCandidates(sources, { includeArchived: true });
    expect(shown.map((item) => item.id)).toEqual(
      expect.arrayContaining(['old', 't-old', 'c-old', 'm-old']),
    );
  });

  it('祖先归档、自身未归档时默认不出现，打开开关后出现', () => {
    const sources: SearchSources = {
      branches: [
        ...TREE,
        branch({ id: 'frozen', parentId: 'work', title: '暂停线', archivedAt: 50 }),
        branch({ id: 'nested', parentId: 'frozen', title: '子线' }),
      ],
      tasks: [task({ id: 't-nested', branchId: 'nested' })],
      commits: [commit({ id: 'c-nested', branchId: 'nested' })],
      milestones: [],
    };

    const byId = new Map(sources.branches.map((row) => [row.id, row]));
    const nested = sources.branches[4]!;
    expect(isSearchVisibleBranch(nested, byId, false)).toBe(false);

    const hidden = collectSearchCandidates(sources, { includeArchived: false });
    expect(hidden.some((item) => item.id === 'nested')).toBe(false);
    expect(hidden.some((item) => item.id === 't-nested')).toBe(false);
    expect(hidden.some((item) => item.id === 'c-nested')).toBe(false);

    const shown = collectSearchCandidates(sources, { includeArchived: true });
    expect(shown.some((item) => item.id === 'nested')).toBe(true);
    expect(shown.some((item) => item.id === 't-nested')).toBe(true);
    expect(shown.some((item) => item.id === 'c-nested')).toBe(true);
  });

  it('并入父分支的提交只出现一次，归属父分支并标注原始来源分支', () => {
    const items = collectSearchCandidates(
      {
        ...emptySources(),
        branches: TREE,
        commits: [
          commit({ id: 'merged', branchId: 'work', sourceBranchId: 'side', summary: '上线' }),
        ],
      },
      { includeArchived: false },
    );

    const commits = items.filter((item) => item.kind === 'commit');
    expect(commits).toHaveLength(1);
    expect(commits[0]).toMatchObject({
      id: 'merged',
      branchId: 'work',
      path: '我 / 工作',
      sourceTitle: '主业',
    });
  });

  it('来源分支与当前分支相同时不标注来源', () => {
    const items = collectSearchCandidates(
      {
        ...emptySources(),
        branches: TREE,
        commits: [commit({ id: 'own', branchId: 'side', sourceBranchId: 'side' })],
      },
      { includeArchived: false },
    );

    expect(items.find((item) => item.kind === 'commit')).toMatchObject({
      kind: 'commit',
      sourceTitle: null,
    });
  });

  it('父子各有一条同名提交时保留两条，不按标题去重', () => {
    const items = collectSearchCandidates(
      {
        ...emptySources(),
        branches: TREE,
        commits: [
          commit({ id: 'c-parent', branchId: 'work', summary: '上线' }),
          commit({ id: 'c-child', branchId: 'side', sourceBranchId: 'side', summary: '上线' }),
        ],
      },
      { includeArchived: false },
    );

    expect(items.filter((item) => item.kind === 'commit')).toHaveLength(2);
  });

  it('分支的归属是父路径，待办与提交是所属分支路径', () => {
    const items = collectSearchCandidates(
      {
        ...emptySources(),
        branches: TREE,
        tasks: [task({ id: 't', branchId: 'side' })],
        commits: [commit({ id: 'c', branchId: 'side' })],
      },
      { includeArchived: false },
    );

    expect(items.find((item) => item.id === 'side')).toMatchObject({ path: '我 / 工作' });
    expect(items.find((item) => item.id === 't')).toMatchObject({ path: '我 / 工作 / 主业' });
    expect(items.find((item) => item.id === 'c')).toMatchObject({ path: '我 / 工作 / 主业' });
  });
});
