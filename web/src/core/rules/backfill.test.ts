import { describe, expect, it } from 'vitest';
import { BACKFILL_MAX, validateBackfill, type BackfillDraftRow } from './backfill';
import type { MilestoneTargetBranch } from './milestone-target';

const TODAY = '2026-11-21';

const branch = (over: Partial<MilestoneTargetBranch> = {}): MilestoneTargetBranch => ({
  id: 'work',
  parentId: 'root',
  title: '工作',
  status: 'active',
  archivedAt: null,
  droppedAt: null,
  deletedAt: null,
  depth: 1,
  order: 1,
  ...over,
});

const ROOT = branch({ id: 'root', parentId: null, title: '我', depth: 0, order: 0 });

const row = (over: Partial<BackfillDraftRow> = {}): BackfillDraftRow => ({
  title: '入职',
  month: '2023-06',
  branchId: 'work',
  ...over,
});

const issuesOf = (rows: BackfillDraftRow[], branches = [ROOT, branch()]) =>
  validateBackfill(rows, branches, TODAY).issues;

describe('回填过去的校验（V1-07 / A-04）', () => {
  it('1–5 行合法时输出月精度条目', () => {
    const result = validateBackfill(
      [row(), row({ title: ' 搬家 ', month: '2021-09', branchId: 'root' })],
      [ROOT, branch()],
      TODAY,
    );
    expect(result.issues).toEqual([]);
    expect(result.canSave).toBe(true);
    expect(result.entries).toEqual([
      { title: '入职', date: '2023-06-01', month: '2023-06', branchId: 'work' },
      { title: '搬家', date: '2021-09-01', month: '2021-09', branchId: 'root' },
    ]);
  });

  it('0 行不可保存', () => {
    const result = validateBackfill([], [ROOT, branch()], TODAY);
    expect(result.entries).toEqual([]);
    expect(result.canSave).toBe(false);
  });

  it('超过 5 行给出上限问题', () => {
    const rows = Array.from({ length: BACKFILL_MAX + 1 }, () => row());
    expect(issuesOf(rows)).toContainEqual({ index: BACKFILL_MAX, field: 'rows', reason: 'limit' });
  });

  it('标题为空不可保存', () => {
    expect(issuesOf([row({ title: '   ' })])).toContainEqual({
      index: 0,
      field: 'title',
      reason: 'empty',
    });
  });

  it('年月为空、非法或晚于当前月都不可保存', () => {
    expect(issuesOf([row({ month: '' })])).toContainEqual({
      index: 0,
      field: 'month',
      reason: 'empty',
    });
    expect(issuesOf([row({ month: '2023-13' })])).toContainEqual({
      index: 0,
      field: 'month',
      reason: 'invalid',
    });
    expect(issuesOf([row({ month: '2026-12' })])).toContainEqual({
      index: 0,
      field: 'month',
      reason: 'future',
    });
    expect(issuesOf([row({ month: '2027-01' })])).toContainEqual({
      index: 0,
      field: 'month',
      reason: 'future',
    });
  });

  it('当前月可选', () => {
    expect(issuesOf([row({ month: '2026-11' })])).toEqual([]);
  });

  it('已合并、已放下、已归档分支不可选', () => {
    const branches = [
      ROOT,
      branch({ id: 'merged', status: 'merged' }),
      branch({ id: 'dropped', status: 'dropped', droppedAt: 1 }),
      branch({ id: 'archived', archivedAt: 1 }),
    ];
    expect(issuesOf([row({ branchId: 'merged' })], branches)).toContainEqual({
      index: 0,
      field: 'branch',
      reason: 'merged',
    });
    expect(issuesOf([row({ branchId: 'dropped' })], branches)).toContainEqual({
      index: 0,
      field: 'branch',
      reason: 'dropped',
    });
    expect(issuesOf([row({ branchId: 'archived' })], branches)).toContainEqual({
      index: 0,
      field: 'branch',
      reason: 'archived',
    });
  });

  it('根分支即使状态非 active 也可选', () => {
    const root = branch({ id: 'root', parentId: null, status: 'merged', depth: 0 });
    expect(issuesOf([row({ branchId: 'root' })], [root])).toEqual([]);
  });

  it('未选或找不到分支不可保存', () => {
    expect(issuesOf([row({ branchId: null })])).toContainEqual({
      index: 0,
      field: 'branch',
      reason: 'missing',
    });
    expect(issuesOf([row({ branchId: 'gone' })])).toContainEqual({
      index: 0,
      field: 'branch',
      reason: 'missing',
    });
  });
});
