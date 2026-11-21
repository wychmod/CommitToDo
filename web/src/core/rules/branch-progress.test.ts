import { describe, expect, it } from 'vitest';
import { computeBranchProgress, type ProgressTask } from './branch-progress';

function task(over: Partial<ProgressTask> & { status: ProgressTask['status'] }): ProgressTask {
  return { branchId: 'work', deletedAt: null, ...over };
}

describe('分支进度口径（R7）', () => {
  it('分子只算 done，分母含 open', () => {
    const tasks = [
      task({ status: 'done' }),
      task({ status: 'done' }),
      task({ status: 'open' }),
      task({ status: 'open' }),
      task({ status: 'open' }),
    ];
    expect(computeBranchProgress('work', tasks)).toMatchObject({
      done: 2,
      total: 5,
      hasProgress: true,
    });
  });

  it('已取消不进分母，也不进分子', () => {
    const tasks = [task({ status: 'done' }), task({ status: 'cancelled' })];
    expect(computeBranchProgress('work', tasks)).toMatchObject({ done: 1, total: 1 });
  });

  it('软删待办不计入', () => {
    const tasks = [task({ status: 'done' }), task({ status: 'open', deletedAt: 1000 })];
    expect(computeBranchProgress('work', tasks)).toMatchObject({ done: 1, total: 1 });
  });

  it('子分支待办不计入父分支', () => {
    const tasks = [
      task({ status: 'done' }),
      task({ branchId: 'design', status: 'done' }),
      task({ branchId: 'design', status: 'open' }),
    ];
    expect(computeBranchProgress('work', tasks)).toMatchObject({ done: 1, total: 1 });
  });

  it('全部完成时比例为 1', () => {
    const tasks = [task({ status: 'done' }), task({ status: 'done' })];
    expect(computeBranchProgress('work', tasks)).toMatchObject({ done: 2, total: 2, ratio: 1 });
  });

  it('分母为 0 时返回无进度而不是 0%', () => {
    const tasks = [task({ status: 'cancelled' }), task({ status: 'open', deletedAt: 1 })];
    const progress = computeBranchProgress('work', tasks);
    expect(progress.hasProgress).toBe(false);
    expect(progress.done).toBe(0);
    expect(progress.total).toBe(0);
  });
});
