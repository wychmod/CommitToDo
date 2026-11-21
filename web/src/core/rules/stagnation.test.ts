import { describe, expect, it } from 'vitest';
import {
  assessStall,
  latestVisibleCommit,
  stallReminders,
  type StallBranch,
  type StallCommit,
} from './stagnation';

const TZ = 480;
const RANGE = { start: '2026-08-24' };
const TODAY = '2026-11-21';

function localMs(year: number, month: number, day: number): number {
  return Date.UTC(year, month - 1, day) - TZ * 60_000;
}

function branch(over: Partial<StallBranch> = {}): StallBranch {
  return {
    id: 'work',
    parentId: 'root',
    status: 'active',
    createdAt: localMs(2026, 1, 1),
    archivedAt: null,
    droppedAt: null,
    ...over,
  };
}

function commit(over: Partial<StallCommit> = {}): StallCommit {
  return {
    branchId: 'work',
    at: localMs(2026, 10, 22),
    date: '2026-10-22',
    voidedAt: null,
    deletedAt: null,
    ...over,
  };
}

function assess(branchRow: StallBranch, branches: StallBranch[], commits: StallCommit[]) {
  return assessStall(branchRow, branches, commits, {
    todayDate: TODAY,
    tzOffsetMinutes: TZ,
    range: RANGE,
  });
}

describe('停滞判定（R4 / M06 §4.2）', () => {
  it('恰好 30 天不画虚线，31 天才画', () => {
    const thirty = assess(branch(), [branch()], [commit()]);
    expect(thirty.kind).toBe('none');
    expect(thirty.days).toBeNull();

    const thirtyOne = assess(
      branch(),
      [branch()],
      [commit({ at: localMs(2026, 10, 21), date: '2026-10-21' })],
    );
    expect(thirtyOne.kind).toBe('stalled');
    expect(thirtyOne.days).toBe(31);
    expect(thirtyOne.fromDate).toBe('2026-10-21');
    expect(thirtyOne.toDate).toBe(TODAY);
  });

  it('本分支无提交但子分支有，仍取子分支最近有效提交', () => {
    const parent = branch({ id: 'work' });
    const child = branch({ id: 'design', parentId: 'work' });
    const info = assess(
      parent,
      [parent, child],
      [commit({ branchId: 'design', at: localMs(2026, 10, 1), date: '2026-10-01' })],
    );
    expect(info.kind).toBe('stalled');
    expect(info.lastDate).toBe('2026-10-01');
  });

  it('未展开的后代同样计入，与展开状态无关', () => {
    const parent = branch({ id: 'work' });
    const child = branch({ id: 'design', parentId: 'work' });
    const grandchild = branch({ id: 'draft', parentId: 'design' });
    const latest = latestVisibleCommit(
      'work',
      [parent, child, grandchild],
      [commit({ branchId: 'draft', at: localMs(2026, 10, 20), date: '2026-10-20' })],
    );
    expect(latest?.date).toBe('2026-10-20');
  });

  it('已归档或已放下的后代不参与最近提交', () => {
    const parent = branch({ id: 'work' });
    const archivedChild = branch({
      id: 'old',
      parentId: 'work',
      archivedAt: localMs(2026, 11, 1),
    });
    const droppedChild = branch({
      id: 'gone',
      parentId: 'work',
      status: 'dropped',
      droppedAt: localMs(2026, 11, 1),
    });
    const info = assess(
      parent,
      [parent, archivedChild, droppedChild],
      [
        commit({ branchId: 'old', at: localMs(2026, 9, 1), date: '2026-09-01' }),
        commit({ branchId: 'gone', at: localMs(2026, 9, 2), date: '2026-09-02' }),
      ],
    );
    expect(info.kind).toBe('none');
  });

  it('唯一提交被撤销后不计停滞', () => {
    const info = assess(branch(), [branch()], [commit({ voidedAt: localMs(2026, 11, 1) })]);
    expect(info.kind).toBe('none');
    expect(info.lastDate).toBeNull();
  });

  it('范围内无提交但历史有 → 淡实线且不标天数', () => {
    const info = assess(
      branch(),
      [branch()],
      [commit({ at: localMs(2026, 5, 1), date: '2026-05-01' })],
    );
    expect(info.kind).toBe('history');
    expect(info.days).toBeNull();
    expect(info.fromDate).toBe('2026-05-01');
    expect(info.toDate).toBe(TODAY);
  });

  it('从未有有效提交的分支不画线、不计停滞', () => {
    const info = assess(branch(), [branch()], []);
    expect(info).toEqual({
      branchId: 'work',
      kind: 'none',
      lastDate: null,
      days: null,
      fromDate: null,
      toDate: null,
    });
  });

  it('已放下画灰线到放下日期，不画到今天', () => {
    const dropped = branch({
      status: 'dropped',
      droppedAt: localMs(2026, 11, 10),
    });
    const info = assess(
      dropped,
      [dropped],
      [commit({ at: localMs(2026, 9, 20), date: '2026-09-20' })],
    );
    expect(info.kind).toBe('dropped');
    expect(info.days).toBeNull();
    expect(info.toDate).toBe('2026-11-10');
    expect(info.fromDate).toBe('2026-09-20');
  });

  it('已归档不参与停滞', () => {
    const archived = branch({ archivedAt: localMs(2026, 11, 1) });
    expect(assess(archived, [archived], [commit({ date: '2026-01-01' })]).kind).toBe('archived');
  });

  it('归档子树内的后代随祖先退出停滞', () => {
    const parent = branch({ id: 'work', archivedAt: localMs(2026, 11, 1) });
    const child = branch({ id: 'design', parentId: 'work' });
    const info = assess(
      child,
      [parent, child],
      [commit({ branchId: 'design', at: localMs(2026, 9, 1), date: '2026-09-01' })],
    );
    expect(info.kind).toBe('archived');
  });

  it('已合并分支不再参与停滞', () => {
    const merged = branch({ status: 'merged' });
    expect(assess(merged, [merged], [commit({ date: '2026-01-01' })]).kind).toBe('none');
  });
});

describe('今天页停滞提醒（M06 OP-07）', () => {
  it('按天数降序取前 5 条，排除已放下与已归档', () => {
    const rows = [
      branch({ id: 'a' }),
      branch({ id: 'b' }),
      branch({ id: 'c' }),
      branch({ id: 'd' }),
      branch({ id: 'e' }),
      branch({ id: 'f' }),
      branch({ id: 'gone', parentId: 'root', status: 'dropped', droppedAt: localMs(2026, 11, 1) }),
      branch({ id: 'old', parentId: 'root', archivedAt: localMs(2026, 11, 1) }),
    ];
    const commits = [
      commit({ branchId: 'a', at: localMs(2026, 10, 1), date: '2026-10-01' }),
      commit({ branchId: 'b', at: localMs(2026, 10, 5), date: '2026-10-05' }),
      commit({ branchId: 'c', at: localMs(2026, 10, 10), date: '2026-10-10' }),
      commit({ branchId: 'd', at: localMs(2026, 10, 15), date: '2026-10-15' }),
      commit({ branchId: 'e', at: localMs(2026, 10, 18), date: '2026-10-18' }),
      commit({ branchId: 'f', at: localMs(2026, 10, 20), date: '2026-10-20' }),
      commit({ branchId: 'gone', at: localMs(2026, 9, 1), date: '2026-09-01' }),
      commit({ branchId: 'old', at: localMs(2026, 9, 2), date: '2026-09-02' }),
    ];
    const reminders = stallReminders(rows, commits, {
      todayDate: TODAY,
      tzOffsetMinutes: TZ,
      range: RANGE,
    });
    expect(reminders).toHaveLength(5);
    expect(reminders.map((item) => item.branchId)).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(reminders[0]!.days).toBeGreaterThanOrEqual(reminders[4]!.days);
  });

  it('没有停滞分支时返回空数组', () => {
    expect(
      stallReminders([branch()], [commit({ date: '2026-11-20' })], {
        todayDate: TODAY,
        tzOffsetMinutes: TZ,
        range: RANGE,
      }),
    ).toEqual([]);
  });
});
