import { describe, expect, it } from 'vitest';
import { groupSearchCandidates, SEARCH_GROUP_LIMIT, SEARCH_TOTAL_LIMIT } from './search-sort-limit';
import type {
  SearchBranchCandidate,
  SearchCandidate,
  SearchCommitCandidate,
  SearchTaskCandidate,
} from './search-visibility';

/**
 * 分组、排序与上限（V1-04 §8.2 / OP-05）。
 *
 * 边界取恰好 20/21 与总计 50/51：截断只影响展示，`hidden` 必须给出真实条数。
 */

function branchCandidate({
  id,
  ...over
}: Partial<SearchBranchCandidate> & { id: string }): SearchCandidate {
  return {
    kind: 'branch',
    id,
    title: id,
    branchId: id,
    path: '',
    status: 'active',
    archived: false,
    at: 0,
    ...over,
  };
}

function taskCandidate({
  id,
  ...over
}: Partial<SearchTaskCandidate> & { id: string }): SearchCandidate {
  return {
    kind: 'task',
    id,
    title: id,
    branchId: 'work',
    path: '我 / 工作',
    dueDate: null,
    at: 0,
    ...over,
  };
}

function commitCandidate({
  id,
  ...over
}: Partial<SearchCommitCandidate> & { id: string }): SearchCandidate {
  return {
    kind: 'commit',
    id,
    title: id,
    branchId: 'work',
    path: '我 / 工作',
    date: '2026-11-20',
    sourceTitle: null,
    at: 0,
    ...over,
  };
}

function repeat(count: number, prefix: string, make: (id: string) => SearchCandidate) {
  return Array.from({ length: count }, (_, index) => make(`${prefix}${index + 1}`));
}

const branches = (count: number) => repeat(count, 'b', (id) => branchCandidate({ id }));
const tasks = (count: number) => repeat(count, 't', (id) => taskCandidate({ id }));
const commits = (count: number) => repeat(count, 'c', (id) => commitCandidate({ id }));

describe('groupSearchCandidates', () => {
  it('组顺序固定，空组不输出', () => {
    const groups = groupSearchCandidates([
      commitCandidate({ id: 'c1' }),
      branchCandidate({ id: 'b1' }),
      commitCandidate({ id: 'c2' }),
    ]);

    expect(groups.map((group) => group.kind)).toEqual(['branch', 'commit']);
    expect(groups[0]?.items).toHaveLength(1);
    expect(groups[1]?.items).toHaveLength(2);
  });

  it('同组按标题长度升序，同长按时间倒序', () => {
    const groups = groupSearchCandidates([
      branchCandidate({ id: 'long', title: '跑步计划', at: 300 }),
      branchCandidate({ id: 'short-new', title: '跑步', at: 200 }),
      branchCandidate({ id: 'short-old', title: '早起', at: 100 }),
    ]);

    expect(groups[0]?.items.map((item) => item.id)).toEqual(['short-new', 'short-old', 'long']);
  });

  it('恰好 20 条与 21 条：后者保留 20 条并给出隐藏数', () => {
    const twenty = groupSearchCandidates(branches(SEARCH_GROUP_LIMIT));
    expect(twenty[0]?.items).toHaveLength(20);
    expect(twenty[0]?.hidden).toBe(0);

    const twentyOne = groupSearchCandidates(branches(SEARCH_GROUP_LIMIT + 1));
    expect(twentyOne[0]?.items).toHaveLength(20);
    expect(twentyOne[0]?.hidden).toBe(1);
  });

  it('总计恰好 50 与 51：后者在最后一组截断', () => {
    const fifty = groupSearchCandidates([...branches(20), ...tasks(20), ...commits(10)]);
    expect(fifty.reduce((total, group) => total + group.items.length, 0)).toBe(50);
    expect(fifty.every((group) => group.hidden === 0)).toBe(true);

    const fiftyOne = groupSearchCandidates([...branches(20), ...tasks(20), ...commits(11)]);
    expect(fiftyOne.reduce((total, group) => total + group.items.length, 0)).toBe(
      SEARCH_TOTAL_LIMIT,
    );
    const lastGroup = fiftyOne[fiftyOne.length - 1];
    expect(lastGroup).toMatchObject({ kind: 'commit', hidden: 1 });
    expect(lastGroup?.items).toHaveLength(10);
  });

  it('长度与时间都相同时按 id 稳定排序', () => {
    const groups = groupSearchCandidates([
      branchCandidate({ id: 'b', title: '同长', at: 10 }),
      branchCandidate({ id: 'a', title: '同等', at: 10 }),
    ]);

    expect(groups[0]?.items.map((item) => item.id)).toEqual(['a', 'b']);
  });
});
