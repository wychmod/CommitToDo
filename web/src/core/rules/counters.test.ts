import { describe, expect, it } from 'vitest';
import { recountBranch, type CountCommit, type CountTask } from './counters';

const task = (over: Partial<CountTask> = {}): CountTask => ({
  branchId: 'product-design',
  status: 'open',
  ...over,
});

const commit = (over: Partial<CountCommit> = {}): CountCommit => ({
  branchId: 'product-design',
  at: 1_000,
  ...over,
});

describe('recountBranch（R7 四计数重算）', () => {
  it('只统计本分支、未删除、未取消的待办', () => {
    const counts = recountBranch(
      'product-design',
      [
        task({ status: 'done' }),
        task(),
        task({ status: 'cancelled' }),
        task({ deletedAt: 1 }),
        task({ branchId: 'interaction', status: 'done' }),
      ],
      [],
    );

    expect(counts.taskTotal).toBe(2);
    expect(counts.taskDone).toBe(1);
  });

  it('撤销与软删的提交不计入，最近提交取有效提交的最大 at', () => {
    const counts = recountBranch(
      'product-design',
      [],
      [
        commit({ at: 1_000 }),
        commit({ at: 3_000 }),
        commit({ at: 9_000, voidedAt: 9_500 }),
        commit({ at: 12_000, deletedAt: 12_100 }),
      ],
    );

    expect(counts.commitCount).toBe(2);
    expect(counts.ownLastCommitAt).toBe(3_000);
  });

  it('没有任何有效提交时最近提交为 null（停滞判定不把无提交分支算进去）', () => {
    const counts = recountBranch('reading', [], [commit({ branchId: 'reading', voidedAt: 1 })]);

    expect(counts).toEqual({
      taskTotal: 0,
      taskDone: 0,
      commitCount: 0,
      ownLastCommitAt: null,
    });
  });
});
