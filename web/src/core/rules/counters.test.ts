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

describe('恢复后四计数全量重算（R7，快照正文）', () => {
  interface SnapshotBody {
    branches: Array<{ id: string; taskTotal: number; taskDone: number; commitCount: number }>;
    tasks: CountTask[];
    commits: CountCommit[];
  }

  const recountAll = (body: SnapshotBody) =>
    body.branches.map((branch) => ({
      id: branch.id,
      ...recountBranch(branch.id, body.tasks, body.commits),
    }));

  it('快照里保存的旧计数与正文不符时，以正文重算结果为准', () => {
    const body: SnapshotBody = {
      branches: [{ id: 'b', taskTotal: 99, taskDone: 99, commitCount: 99 }],
      tasks: [
        { branchId: 'b', status: 'done' },
        { branchId: 'b', status: 'open' },
      ],
      commits: [{ branchId: 'b', at: 2_000 }],
    };

    expect(recountAll(body)).toEqual([
      { id: 'b', taskTotal: 2, taskDone: 1, commitCount: 1, ownLastCommitAt: 2_000 },
    ]);
  });

  it('撤销提交不计入，最近提交取有效提交最大值', () => {
    const body: SnapshotBody = {
      branches: [{ id: 'b', taskTotal: 0, taskDone: 0, commitCount: 0 }],
      tasks: [],
      commits: [
        { branchId: 'b', at: 5_000, voidedAt: 6_000 },
        { branchId: 'b', at: 3_000 },
      ],
    };

    expect(recountAll(body)[0]).toMatchObject({ commitCount: 1, ownLastCommitAt: 3_000 });
  });

  it('已删除分支仍按正文重算，不保留快照旧值', () => {
    const body: SnapshotBody = {
      branches: [{ id: 'gone', taskTotal: 7, taskDone: 7, commitCount: 7 }],
      tasks: [{ branchId: 'gone', status: 'done', deletedAt: 1 }],
      commits: [],
    };

    expect(recountAll(body)[0]).toEqual({
      id: 'gone',
      taskTotal: 0,
      taskDone: 0,
      commitCount: 0,
      ownLastCommitAt: null,
    });
  });

  it('空快照的四计数全为 0', () => {
    const body: SnapshotBody = {
      branches: [{ id: 'b', taskTotal: 3, taskDone: 2, commitCount: 1 }],
      tasks: [],
      commits: [],
    };

    expect(recountAll(body)[0]).toEqual({
      id: 'b',
      taskTotal: 0,
      taskDone: 0,
      commitCount: 0,
      ownLastCommitAt: null,
    });
  });
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

  it('完成待办：taskDone 与 commitCount 各 +1，ownLastCommitAt 取最新有效提交', () => {
    const counts = recountBranch(
      'product-design',
      [task({ status: 'open' }), task({ status: 'done' })],
      [commit({ at: 1_000 }), commit({ at: 5_000 })],
    );

    expect(counts).toMatchObject({ taskTotal: 2, taskDone: 1, commitCount: 2 });
    expect(counts.ownLastCommitAt).toBe(5_000);
  });

  it('取消待办：taskTotal 减一，taskDone 不变', () => {
    const counts = recountBranch(
      'product-design',
      [task({ status: 'open' }), task({ status: 'done' }), task({ status: 'cancelled' })],
      [],
    );

    expect(counts).toMatchObject({ taskTotal: 2, taskDone: 1 });
  });

  it('改归属后两个分支分别按当前归属重算', () => {
    const moved = task({ branchId: 'interaction', status: 'done' });
    const source = recountBranch('product-design', [task(), moved], []);
    const target = recountBranch('interaction', [task(), moved], []);

    expect(source).toMatchObject({ taskTotal: 1, taskDone: 0 });
    expect(target).toMatchObject({ taskTotal: 1, taskDone: 1 });
  });
});

describe('撤销完成后的四计数（M05 / R7）', () => {
  it('撤销唯一有效提交后 commitCount 归零、ownLastCommitAt 变 null', () => {
    const counts = recountBranch(
      'product-design',
      [task({ status: 'open' })],
      [commit({ at: 1_000, voidedAt: 2_000 })],
    );

    expect(counts).toEqual({
      taskTotal: 1,
      taskDone: 0,
      commitCount: 0,
      ownLastCommitAt: null,
    });
  });

  it('撤销较早的一条时最近提交取剩下那条的 at', () => {
    const counts = recountBranch(
      'product-design',
      [task({ status: 'done' })],
      [commit({ at: 1_000, voidedAt: 2_000 }), commit({ at: 3_000 })],
    );

    expect(counts.commitCount).toBe(1);
    expect(counts.ownLastCommitAt).toBe(3_000);
  });

  it('撤销后待办回到 open，taskDone 减一但 taskTotal 不变', () => {
    const before = recountBranch('product-design', [task({ status: 'done' })], [commit()]);
    const after = recountBranch(
      'product-design',
      [task({ status: 'open' })],
      [commit({ voidedAt: 2_000 })],
    );

    expect(before).toMatchObject({ taskTotal: 1, taskDone: 1, commitCount: 1 });
    expect(after).toMatchObject({ taskTotal: 1, taskDone: 0, commitCount: 0 });
  });
});

describe('收尾合并后的父分支四计数（M08 / R7）', () => {
  it('并入待办按当前归属重算，cancelled 不计入 taskTotal', () => {
    const counts = recountBranch(
      'main',
      [
        task({ branchId: 'main', status: 'done' }),
        task({ branchId: 'main', status: 'open' }),
        task({ branchId: 'main', status: 'open' }),
        task({ branchId: 'main', status: 'cancelled' }),
      ],
      [],
    );

    expect(counts).toMatchObject({ taskTotal: 3, taskDone: 1 });
  });

  it('ownLastCommitAt 取合并后有效提交的最大值，而非保留父分支原值', () => {
    const counts = recountBranch(
      'main',
      [],
      [
        commit({ branchId: 'main', at: 1_000 }),
        commit({ branchId: 'main', at: 9_000 }),
        commit({ branchId: 'main', at: 5_000 }),
      ],
    );

    expect(counts.commitCount).toBe(3);
    expect(counts.ownLastCommitAt).toBe(9_000);
  });

  it('并入提交全部已撤销时 commitCount 与 ownLastCommitAt 不变', () => {
    const counts = recountBranch(
      'main',
      [],
      [
        commit({ branchId: 'main', at: 2_000 }),
        commit({ branchId: 'main', at: 8_000, voidedAt: 8_100 }),
      ],
    );

    expect(counts).toMatchObject({ commitCount: 1, ownLastCommitAt: 2_000 });
  });

  it('并入提交时间早于父分支最近提交时保留父分支最大值', () => {
    const counts = recountBranch(
      'main',
      [],
      [commit({ branchId: 'main', at: 12_000 }), commit({ branchId: 'main', at: 3_000 })],
    );

    expect(counts.ownLastCommitAt).toBe(12_000);
  });
});

describe('导入后的四计数全量重算（M10 / R7、R3）', () => {
  it('不采用文件里的旧计数，按文件内实际待办与有效提交输出', () => {
    const counts = recountBranch(
      'imported',
      [
        task({ branchId: 'imported', status: 'done' }),
        task({ branchId: 'imported' }),
        task({ branchId: 'imported', status: 'cancelled' }),
        task({ branchId: 'imported', deletedAt: 1 }),
      ],
      [
        commit({ branchId: 'imported', at: 1_000 }),
        commit({ branchId: 'imported', at: 2_000, voidedAt: 2_500 }),
      ],
    );

    expect(counts).toEqual({
      taskTotal: 2,
      taskDone: 1,
      commitCount: 1,
      ownLastCommitAt: 1_000,
    });
  });

  it('文件内提交全部已撤销时 commitCount 为零、ownLastCommitAt 为 null', () => {
    const counts = recountBranch(
      'imported',
      [],
      [
        commit({ branchId: 'imported', at: 1_000, voidedAt: 1_500 }),
        commit({ branchId: 'imported', at: 2_000, voidedAt: 2_500 }),
      ],
    );

    expect(counts).toEqual({
      taskTotal: 0,
      taskDone: 0,
      commitCount: 0,
      ownLastCommitAt: null,
    });
  });
});

describe('里程碑不计入四计数（M07 / R7）', () => {
  it('新建里程碑后重算结果仍只由任务与提交决定', () => {
    const tasks = [task({ status: 'done' })];
    const commits = [commit({ at: 4_000 })];
    const counts = recountBranch('product-design', tasks, commits);

    // 里程碑（无论 achievedAt 多晚）不进入 recountBranch 的输入，
    // 这里固化「四计数只统计任务与提交」的契约。
    expect(counts).toEqual({
      taskTotal: 1,
      taskDone: 1,
      commitCount: 1,
      ownLastCommitAt: 4_000,
    });
    expect(Object.keys(counts).sort()).toEqual([
      'commitCount',
      'ownLastCommitAt',
      'taskDone',
      'taskTotal',
    ]);
  });
});

describe('生命周期动作不改四计数（V1-01 / R7）', () => {
  it('同一组待办与提交在 active / dropped / merged / archived 下输出一致', () => {
    const tasks = [task({ status: 'open' }), task({ status: 'done' })];
    const commits = [commit({ at: 1_000 })];

    // 生命周期状态不是 recountBranch 的输入：放下不减少 taskTotal，
    // 归档也不重算统计；这里固化「恢复与导出重算不受状态影响」的契约。
    expect(recountBranch('product-design', tasks, commits)).toEqual({
      taskTotal: 2,
      taskDone: 1,
      commitCount: 1,
      ownLastCommitAt: 1_000,
    });
  });

  it('已放下分支仍有未完成待办时 taskTotal 不减少', () => {
    const counts = recountBranch(
      'product-design',
      [task({ status: 'open' }), task({ status: 'open' })],
      [],
    );
    expect(counts.taskTotal).toBe(2);
  });

  it('已合并后再归档、且持有已撤销提交时不改变计数口径', () => {
    const counts = recountBranch(
      'product-design',
      [task({ status: 'done' })],
      [commit({ at: 1_000 }), commit({ at: 2_000, voidedAt: 2_100 })],
    );
    expect(counts).toMatchObject({ taskTotal: 1, taskDone: 1, commitCount: 1 });
  });
});

describe('批量导入后的四计数（V1-07 / R7）', () => {
  it('导入 N 条 open 待办后 taskTotal 增加 N，其余不变', () => {
    const imported = Array.from({ length: 5 }, () => task({ status: 'open' }));
    expect(recountBranch('product-design', imported, [])).toEqual({
      taskTotal: 5,
      taskDone: 0,
      commitCount: 0,
      ownLastCommitAt: null,
    });
  });

  it('同一分支连续两次导入按累计条数重算', () => {
    const first = [task({ status: 'open' }), task({ status: 'open' })];
    const second = [...first, task({ status: 'open' })];
    expect(recountBranch('product-design', first, []).taskTotal).toBe(2);
    expect(recountBranch('product-design', second, []).taskTotal).toBe(3);
  });

  it('空批次不改变既有计数', () => {
    const existing = [task({ status: 'done' })];
    expect(recountBranch('product-design', existing, [commit({ at: 1_000 })])).toEqual({
      taskTotal: 1,
      taskDone: 1,
      commitCount: 1,
      ownLastCommitAt: 1_000,
    });
  });
});
