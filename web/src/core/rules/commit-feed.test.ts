import { describe, expect, it } from 'vitest';
import {
  branchCommitFeed,
  commitFeedPage,
  isIncomingCommit,
  isValidCommit,
  type CommitFeedRow,
} from './commit-feed';

function row(over: Partial<CommitFeedRow> = {}): CommitFeedRow {
  return {
    branchId: 'work',
    sourceBranchId: 'work',
    date: '2026-11-20',
    at: 100,
    voidedAt: null,
    deletedAt: null,
    ...over,
  };
}

function series(count: number): CommitFeedRow[] {
  return Array.from({ length: count }, (_, index) =>
    row({ date: `2026-11-${String((index % 28) + 1).padStart(2, '0')}`, at: index }),
  );
}

describe('分支提交流（R3）', () => {
  it('过滤已撤销与已删除提交', () => {
    const rows = [row({ at: 1 }), row({ at: 2, voidedAt: 5 }), row({ at: 3, deletedAt: 5 })];
    expect(branchCommitFeed(rows, 'work').map((item) => item.at)).toEqual([1]);
    expect(isValidCommit(rows[1]!)).toBe(false);
  });

  it('按业务日期倒序，同一天按时刻倒序', () => {
    const rows = [
      row({ date: '2026-11-19', at: 1 }),
      row({ date: '2026-11-20', at: 2 }),
      row({ date: '2026-11-20', at: 9 }),
    ];
    expect(branchCommitFeed(rows, 'work').map((item) => item.at)).toEqual([9, 2, 1]);
  });

  it('恰好 20 条时只有一页且没有更多', () => {
    const feed = branchCommitFeed(series(20), 'work');
    const first = commitFeedPage(feed, 1);
    expect(first.items).toHaveLength(20);
    expect(first.hasMore).toBe(false);
  });

  it('21 条时第二页只有 1 条，跨页不重不漏', () => {
    const feed = branchCommitFeed(series(21), 'work');
    const first = commitFeedPage(feed, 1);
    const second = commitFeedPage(feed, 2);
    expect(first.items).toHaveLength(20);
    expect(first.hasMore).toBe(true);
    expect(second.items).toHaveLength(1);
    expect(second.hasMore).toBe(false);
    const union = new Set([...first.items, ...second.items].map((item) => item.at));
    expect(union.size).toBe(21);
  });

  it('全部被撤销后提交流为空', () => {
    const rows = [row({ voidedAt: 1 }), row({ voidedAt: 2 })];
    expect(branchCommitFeed(rows, 'work')).toHaveLength(0);
  });

  it('来源分支不同时标记为并入', () => {
    const own = row({ branchId: 'work', sourceBranchId: 'work' });
    const merged = row({ branchId: 'work', sourceBranchId: 'design' });
    expect(isIncomingCommit(own, 'work')).toBe(false);
    expect(isIncomingCommit(merged, 'work')).toBe(true);
  });

  it('只取属于本分支的提交', () => {
    const rows = [row({ branchId: 'work' }), row({ branchId: 'design' })];
    expect(branchCommitFeed(rows, 'work')).toHaveLength(1);
  });
});
