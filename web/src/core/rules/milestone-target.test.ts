import { describe, expect, it } from 'vitest';
import {
  defaultMilestoneBranchId,
  isMilestoneTargetEligible,
  milestoneTargetOptions,
  milestoneTargetReason,
  validateMilestoneDraft,
  type MilestoneTargetBranch,
} from './milestone-target';

const ROOT = 'root';

function branch(over: Partial<MilestoneTargetBranch> = {}): MilestoneTargetBranch {
  return {
    id: 'work',
    parentId: ROOT,
    title: '工作',
    status: 'active',
    archivedAt: null,
    droppedAt: null,
    deletedAt: null,
    depth: 1,
    order: 1,
    ...over,
  };
}

const root = branch({ id: ROOT, parentId: null, title: '我', depth: 0, order: 0 });

describe('里程碑所属分支（M07 §4.2）', () => {
  it('根分支始终可选', () => {
    expect(isMilestoneTargetEligible(root)).toBe(true);
    expect(isMilestoneTargetEligible({ ...root, archivedAt: 1, status: 'merged' })).toBe(true);
  });

  it('进行中且未归档分支可选', () => {
    expect(isMilestoneTargetEligible(branch())).toBe(true);
    expect(milestoneTargetReason(branch())).toBeNull();
  });

  it('已归档、已合并、已放下、已删除分别给出原因', () => {
    expect(milestoneTargetReason(branch({ archivedAt: 1 }))).toBe('archived');
    expect(milestoneTargetReason(branch({ status: 'merged' }))).toBe('merged');
    expect(milestoneTargetReason(branch({ status: 'dropped' }))).toBe('dropped');
    expect(milestoneTargetReason(branch({ deletedAt: 1 }))).toBe('deleted');
    expect(isMilestoneTargetEligible(branch({ status: 'merged' }))).toBe(false);
  });

  it('下拉顺序根在上，其余按层级与 order', () => {
    const rows = [
      branch({ id: 'design', depth: 2, order: 1 }),
      branch({ id: 'life', depth: 1, order: 2 }),
      root,
      branch({ id: 'work', depth: 1, order: 1 }),
    ];
    expect(milestoneTargetOptions(rows).map((item) => item.branch.id)).toEqual([
      'root',
      'work',
      'life',
      'design',
    ]);
  });

  it('未选或所选不可用时默认根分支', () => {
    const rows = [root, branch(), branch({ id: 'old', archivedAt: 1 })];
    expect(defaultMilestoneBranchId(rows, null)).toBe(ROOT);
    expect(defaultMilestoneBranchId(rows, 'work')).toBe('work');
    expect(defaultMilestoneBranchId(rows, 'old')).toBe(ROOT);
    expect(defaultMilestoneBranchId(rows, 'missing')).toBe(ROOT);
  });

  it('没有根分支时返回 null', () => {
    expect(defaultMilestoneBranchId([branch()], null)).toBeNull();
  });
});

describe('里程碑草稿校验（M07 §5）', () => {
  const todayDate = '2026-11-21';

  it('标题为空或只有空白时报错', () => {
    expect(
      validateMilestoneDraft({ title: '   ', date: '2026-11-20', precision: 'day', todayDate }),
    ).toEqual([{ field: 'title', reason: 'empty' }]);
  });

  it('今天与过去的日期都允许', () => {
    expect(
      validateMilestoneDraft({ title: '发布', date: todayDate, precision: 'day', todayDate }),
    ).toEqual([]);
    expect(
      validateMilestoneDraft({ title: '发布', date: '2020-01-01', precision: 'day', todayDate }),
    ).toEqual([]);
  });

  it('未来日期不允许，月精度按月份比较', () => {
    expect(
      validateMilestoneDraft({ title: '发布', date: '2026-11-22', precision: 'day', todayDate }),
    ).toEqual([{ field: 'date', reason: 'future' }]);
    expect(
      validateMilestoneDraft({ title: '发布', date: '2026-12-01', precision: 'month', todayDate }),
    ).toEqual([{ field: 'date', reason: 'future' }]);
    expect(
      validateMilestoneDraft({ title: '发布', date: '2026-11-01', precision: 'month', todayDate }),
    ).toEqual([]);
  });

  it('非法日期与空标题可同时报出', () => {
    expect(
      validateMilestoneDraft({ title: '', date: '2026-02-30', precision: 'day', todayDate }),
    ).toEqual([
      { field: 'title', reason: 'empty' },
      { field: 'date', reason: 'invalid' },
    ]);
  });
});
