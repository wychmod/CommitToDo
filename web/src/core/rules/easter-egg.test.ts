import { describe, expect, it } from 'vitest';
import type { BadgeBranchRow, BadgeCommitRow } from './badges';
import { assessEasterEggs } from './easter-egg';

const TZ = 480;

function at(date: string, time: string): number {
  return Date.parse(`${date}T${time}:00+08:00`);
}

function commit(
  overrides: Partial<BadgeCommitRow> & Pick<BadgeCommitRow, 'date' | 'at'>,
): BadgeCommitRow {
  return {
    id: `commit-${overrides.date}-${overrides.at}`,
    branchId: 'branch-1',
    summary: '做了一件事',
    voidedAt: null,
    deletedAt: null,
    ...overrides,
  };
}

function branch(overrides: Partial<BadgeBranchRow> = {}): BadgeBranchRow {
  return {
    id: 'branch-1',
    parentId: 'root',
    depth: 1,
    title: '分支',
    status: 'active',
    createdAt: at('2025-01-01', '09:00'),
    finishedAt: null,
    finishedIntoId: null,
    droppedAt: null,
    dropReason: null,
    archivedAt: null,
    deletedAt: null,
    ...overrides,
  };
}

function idsOf(count: number): string[] {
  return Array.from({ length: count }, (_, index) => `id-${index}`);
}

describe('夜航', () => {
  it('连续 3 个自然日各有 23:00–4:59 的有效提交时触发', () => {
    const commits = [
      commit({ date: '2026-03-01', at: at('2026-03-01', '23:00') }),
      commit({ date: '2026-03-02', at: at('2026-03-02', '04:59') }),
      commit({ date: '2026-03-03', at: at('2026-03-03', '12:00') }),
      commit({ date: '2026-03-03', at: at('2026-03-03', '23:30') }),
    ];
    const result = assessEasterEggs({ branches: [], commits }, at('2026-03-04', '09:00'), TZ);
    expect(result.candidates.map((row) => row.catalogId)).toEqual(['night-flight']);
  });

  it('3 天中间断一天不触发', () => {
    const commits = [
      commit({ date: '2026-03-01', at: at('2026-03-01', '23:00') }),
      commit({ date: '2026-03-03', at: at('2026-03-03', '23:00') }),
    ];
    const result = assessEasterEggs({ branches: [], commits }, at('2026-03-04', '09:00'), TZ);
    expect(result.candidates).toEqual([]);
  });

  it('5:00 整与 22:59 都不算夜间', () => {
    const commits = [
      commit({ date: '2026-03-01', at: at('2026-03-01', '22:59') }),
      commit({ date: '2026-03-02', at: at('2026-03-02', '05:00') }),
      commit({ date: '2026-03-03', at: at('2026-03-03', '23:00') }),
    ];
    const result = assessEasterEggs({ branches: [], commits }, at('2026-03-04', '09:00'), TZ);
    expect(result.candidates).toEqual([]);
  });

  it('作废的提交不计入', () => {
    const commits = [
      commit({ date: '2026-03-01', at: at('2026-03-01', '23:00') }),
      commit({ date: '2026-03-02', at: at('2026-03-02', '23:00'), voidedAt: 1 }),
      commit({ date: '2026-03-03', at: at('2026-03-03', '23:00') }),
    ];
    const result = assessEasterEggs({ branches: [], commits }, at('2026-03-04', '09:00'), TZ);
    expect(result.candidates).toEqual([]);
  });

  it('多段满足时同一枚只返回一次', () => {
    const commits = [
      commit({ date: '2026-01-01', at: at('2026-01-01', '23:00') }),
      commit({ date: '2026-01-02', at: at('2026-01-02', '23:00') }),
      commit({ date: '2026-01-03', at: at('2026-01-03', '23:00') }),
      commit({ date: '2026-02-01', at: at('2026-02-01', '23:00') }),
      commit({ date: '2026-02-02', at: at('2026-02-02', '23:00') }),
      commit({ date: '2026-02-03', at: at('2026-02-03', '23:00') }),
    ];
    const result = assessEasterEggs({ branches: [], commits }, at('2026-02-04', '09:00'), TZ);
    expect(result.candidates.filter((row) => row.catalogId === 'night-flight')).toHaveLength(1);
  });
});

describe('跨年', () => {
  it('12 月 31 日有有效提交时触发', () => {
    const commits = [commit({ date: '2025-12-31', at: at('2025-12-31', '10:00') })];
    const result = assessEasterEggs({ branches: [], commits }, at('2026-01-02', '09:00'), TZ);
    expect(result.candidates.map((row) => row.catalogId)).toContain('cross-year');
  });

  it('1 月 1 日有有效提交时触发', () => {
    const commits = [commit({ date: '2026-01-01', at: at('2026-01-01', '00:30') })];
    const result = assessEasterEggs({ branches: [], commits }, at('2026-01-02', '09:00'), TZ);
    expect(result.candidates.map((row) => row.catalogId)).toContain('cross-year');
  });

  it('其他日期不触发', () => {
    const commits = [commit({ date: '2025-12-30', at: at('2025-12-30', '10:00') })];
    const result = assessEasterEggs({ branches: [], commits }, at('2026-01-02', '09:00'), TZ);
    expect(result.candidates.map((row) => row.catalogId)).not.toContain('cross-year');
  });
});

describe('复活', () => {
  const dropped = branch({ droppedAt: at('2026-01-01', '12:00') });

  it('已放下分支重新开始后间隔 90 天又有提交时触发', () => {
    const commits = [
      commit({ date: '2025-12-01', at: at('2025-12-01', '09:00'), branchId: dropped.id }),
      commit({ date: '2026-04-01', at: at('2026-04-01', '09:00'), branchId: dropped.id }),
    ];
    const result = assessEasterEggs(
      { branches: [dropped], commits },
      at('2026-04-02', '09:00'),
      TZ,
    );
    expect(result.candidates.map((row) => row.catalogId)).toContain('revival');
  });

  it('间隔 89 天不触发', () => {
    const commits = [
      commit({ date: '2026-01-01', at: at('2026-01-01', '09:00'), branchId: dropped.id }),
      commit({ date: '2026-03-31', at: at('2026-03-31', '09:00'), branchId: dropped.id }),
    ];
    const result = assessEasterEggs(
      { branches: [dropped], commits },
      at('2026-04-01', '09:00'),
      TZ,
    );
    expect(result.candidates.map((row) => row.catalogId)).not.toContain('revival');
  });

  it('从未放下的分支间隔再久也不触发', () => {
    const active = branch({ droppedAt: null });
    const commits = [
      commit({ date: '2025-01-01', at: at('2025-01-01', '09:00'), branchId: active.id }),
      commit({ date: '2026-04-01', at: at('2026-04-01', '09:00'), branchId: active.id }),
    ];
    const result = assessEasterEggs({ branches: [active], commits }, at('2026-04-02', '09:00'), TZ);
    expect(result.candidates.map((row) => row.catalogId)).not.toContain('revival');
  });

  it('根分支与仍有放下状态的分支都不触发', () => {
    const root = branch({
      id: 'root',
      parentId: null,
      depth: 0,
      droppedAt: at('2026-01-01', '12:00'),
    });
    const stillDropped = branch({
      id: 'branch-2',
      status: 'dropped',
      droppedAt: at('2026-01-01', '12:00'),
    });
    const commits = [
      commit({ date: '2025-12-01', at: at('2025-12-01', '09:00'), branchId: 'root' }),
      commit({ date: '2026-04-01', at: at('2026-04-01', '09:00'), branchId: 'root' }),
      commit({ date: '2025-12-01', at: at('2025-12-01', '09:00'), branchId: 'branch-2' }),
      commit({ date: '2026-04-01', at: at('2026-04-01', '09:00'), branchId: 'branch-2' }),
    ];
    const result = assessEasterEggs(
      { branches: [root, stillDropped], commits },
      at('2026-04-02', '09:00'),
      TZ,
    );
    expect(result.candidates.map((row) => row.catalogId)).not.toContain('revival');
  });

  it('首次提交与重新开始之前的提交都不触发', () => {
    const commits = [
      commit({ date: '2025-09-01', at: at('2025-09-01', '09:00'), branchId: dropped.id }),
    ];
    const result = assessEasterEggs(
      { branches: [dropped], commits },
      at('2026-04-02', '09:00'),
      TZ,
    );
    expect(result.candidates.map((row) => row.catalogId)).not.toContain('revival');
  });
});

describe('空白年', () => {
  it('已结束自然年恰好 1 条有效提交时触发', () => {
    const commits = [
      commit({ date: '2025-05-05', at: at('2025-05-05', '09:00') }),
      commit({ date: '2026-01-05', at: at('2026-01-05', '09:00') }),
    ];
    const result = assessEasterEggs({ branches: [], commits }, at('2026-02-10', '09:00'), TZ);
    const hit = result.candidates.find((row) => row.catalogId === 'blank-year');
    expect(hit?.snapshot.year).toBe(2025);
  });

  it('0 条或 2 条都不触发', () => {
    const none = assessEasterEggs(
      { branches: [], commits: [commit({ date: '2026-02-01', at: at('2026-02-01', '09:00') })] },
      at('2026-02-10', '09:00'),
      TZ,
    );
    expect(none.candidates.map((row) => row.catalogId)).not.toContain('blank-year');

    const two = assessEasterEggs(
      {
        branches: [],
        commits: [
          commit({ date: '2025-05-05', at: at('2025-05-05', '09:00') }),
          commit({ date: '2025-06-06', at: at('2025-06-06', '09:00') }),
        ],
      },
      at('2026-02-10', '09:00'),
      TZ,
    );
    expect(two.candidates.map((row) => row.catalogId)).not.toContain('blank-year');
  });

  it('当年不提前授予', () => {
    const result = assessEasterEggs(
      { branches: [], commits: [commit({ date: '2026-02-01', at: at('2026-02-01', '09:00') })] },
      at('2026-12-31', '23:00'),
      TZ,
    );
    expect(result.candidates.map((row) => row.catalogId)).not.toContain('blank-year');
  });

  it('作废提交不算有效提交', () => {
    const result = assessEasterEggs(
      {
        branches: [],
        commits: [
          commit({ date: '2025-05-05', at: at('2025-05-05', '09:00'), voidedAt: 1 }),
          commit({ date: '2025-06-06', at: at('2025-06-06', '09:00') }),
        ],
      },
      at('2026-02-10', '09:00'),
      TZ,
    );
    const hit = result.candidates.find((row) => row.catalogId === 'blank-year');
    expect(hit?.snapshot.year).toBe(2025);
  });
});

function monthCommits(
  year: number,
  month: number,
  days: number,
  missing: number[] = [],
): BadgeCommitRow[] {
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  return idsOf(days)
    .map((_, index) => index + 1)
    .filter((day) => !missing.includes(day))
    .map((day) => {
      const date = `${prefix}-${String(day).padStart(2, '0')}`;
      return commit({ date, at: at(date, '09:00') });
    });
}

describe('满月', () => {
  it('已结束自然月每天都有有效提交时触发', () => {
    const commits = monthCommits(2026, 2, 28);
    const result = assessEasterEggs({ branches: [], commits }, at('2026-03-01', '09:00'), TZ);
    const hit = result.candidates.find((row) => row.catalogId === 'full-moon');
    expect(hit?.snapshot.month).toBe('2026-02');
    expect(hit?.snapshot.days).toBe(28);
  });

  it('闰年 2 月按 29 天判定', () => {
    const complete = assessEasterEggs(
      { branches: [], commits: monthCommits(2024, 2, 29) },
      at('2024-03-01', '09:00'),
      TZ,
    );
    expect(complete.candidates.map((row) => row.catalogId)).toContain('full-moon');

    const short = assessEasterEggs(
      { branches: [], commits: monthCommits(2024, 2, 28) },
      at('2024-03-01', '09:00'),
      TZ,
    );
    expect(short.candidates.map((row) => row.catalogId)).not.toContain('full-moon');
  });

  it('缺任意一天不触发', () => {
    const commits = monthCommits(2026, 2, 28, [14]);
    const result = assessEasterEggs({ branches: [], commits }, at('2026-03-01', '09:00'), TZ);
    expect(result.candidates.map((row) => row.catalogId)).not.toContain('full-moon');
  });

  it('当月不提前授予，次月 1 日才判定', () => {
    const commits = monthCommits(2026, 3, 31);
    const during = assessEasterEggs({ branches: [], commits }, at('2026-03-31', '23:00'), TZ);
    expect(during.candidates.map((row) => row.catalogId)).not.toContain('full-moon');

    const after = assessEasterEggs({ branches: [], commits }, at('2026-04-01', '00:01'), TZ);
    expect(after.candidates.map((row) => row.catalogId)).toContain('full-moon');
  });

  it('作废提交不能凑满一天', () => {
    const commits = monthCommits(2026, 2, 28).map((row) =>
      row.date === '2026-02-14' ? { ...row, voidedAt: 1 } : row,
    );
    const result = assessEasterEggs({ branches: [], commits }, at('2026-03-01', '09:00'), TZ);
    expect(result.candidates.map((row) => row.catalogId)).not.toContain('full-moon');
  });
});
