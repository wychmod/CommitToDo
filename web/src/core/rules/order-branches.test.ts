import { describe, expect, it } from 'vitest';
import {
  canPinBranch,
  isBranchPinned,
  nextBranchOrder,
  sortSiblingBranches,
  type OrderableBranch,
} from './order-branches';

const branch = (over: Partial<OrderableBranch> = {}): OrderableBranch => ({
  id: 'work',
  parentId: 'root',
  depth: 1,
  order: 1,
  pinnedAt: null,
  archivedAt: null,
  deletedAt: null,
  createdAt: 1,
  ...over,
});

describe('分支树置顶与顺序（V1-08 / OP-04）', () => {
  it('置顶项按最近置顶优先排在最前', () => {
    const rows = [
      branch({ id: 'a', order: 1, pinnedAt: 100 }),
      branch({ id: 'b', order: 2 }),
      branch({ id: 'c', order: 3, pinnedAt: 200 }),
    ];
    expect(sortSiblingBranches(rows).map((row) => row.id)).toEqual(['c', 'a', 'b']);
  });

  it('同一时间置顶用创建时间兜底', () => {
    const rows = [
      branch({ id: 'a', pinnedAt: 100, createdAt: 2 }),
      branch({ id: 'b', pinnedAt: 100, createdAt: 1 }),
    ];
    expect(sortSiblingBranches(rows).map((row) => row.id)).toEqual(['b', 'a']);
  });

  it('普通区按 order 升序，order 相同用创建时间', () => {
    const rows = [
      branch({ id: 'a', order: 3 }),
      branch({ id: 'b', order: 1 }),
      branch({ id: 'c', order: 1, createdAt: 0 }),
    ];
    expect(sortSiblingBranches(rows).map((row) => row.id)).toEqual(['c', 'b', 'a']);
  });

  it('取消置顶后回到 order 位置', () => {
    const pinned = branch({ id: 'a', order: 2, pinnedAt: 100 });
    const rows = [branch({ id: 'b', order: 1 }), pinned];
    expect(sortSiblingBranches(rows).map((row) => row.id)).toEqual(['a', 'b']);
    expect(
      sortSiblingBranches([{ ...pinned, pinnedAt: null }, rows[0]!]).map((row) => row.id),
    ).toEqual(['b', 'a']);
  });

  it('归档与删除的分支不参与排序', () => {
    const rows = [
      branch({ id: 'a', archivedAt: 10 }),
      branch({ id: 'b', deletedAt: 10 }),
      branch({ id: 'c' }),
    ];
    expect(sortSiblingBranches(rows).map((row) => row.id)).toEqual(['c']);
  });

  it('新分支追加到兄弟末尾，置顶不影响 order', () => {
    expect(
      nextBranchOrder([branch({ order: 1 }), branch({ id: 'b', order: 4, pinnedAt: 1 })]),
    ).toBe(5);
  });

  it('根分支与归档分支不可置顶，合并 / 放下的可见分支可置顶', () => {
    expect(canPinBranch(branch({ depth: 0, id: 'root' }))).toBe(false);
    expect(canPinBranch(branch({ archivedAt: 1 }))).toBe(false);
    expect(canPinBranch(branch({ deletedAt: 1 }))).toBe(false);
    expect(canPinBranch(branch())).toBe(true);
    expect(isBranchPinned(branch({ pinnedAt: 100 }))).toBe(true);
    expect(isBranchPinned(branch())).toBe(false);
  });
});
