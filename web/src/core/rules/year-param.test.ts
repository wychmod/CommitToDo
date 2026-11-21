import { describe, expect, it } from 'vitest';
import {
  listSelectableYears,
  resolveYearParam,
  yearBoundsFor,
  type YearBounds,
} from './year-param';

/**
 * 年份解析与可选范围（PRD V1-02 §8.2）。
 *
 * 非法与越界的年份一律回落到当前年；可选范围只到当前年。
 */

const BOUNDS: YearBounds = { earliestYear: 2024, currentYear: 2026 };

describe('年份参数解析', () => {
  it('四位数字且在范围内时原样保留', () => {
    expect(resolveYearParam('2025', BOUNDS)).toEqual({
      year: 2025,
      normalized: '2025',
      corrected: false,
    });
  });

  it.each(['2026abc', '02026', '-1', '9999', '26', ''])('非法或越界参数 %s 回落到当前年', (raw) => {
    expect(resolveYearParam(raw, BOUNDS)).toEqual({
      year: 2026,
      normalized: '2026',
      corrected: true,
    });
  });

  it('早于最早记录的年份回落到当前年', () => {
    expect(resolveYearParam('2023', BOUNDS).year).toBe(2026);
    expect(resolveYearParam('2023', BOUNDS).corrected).toBe(true);
  });

  it('未提供参数时回落到当前年', () => {
    expect(resolveYearParam(undefined, BOUNDS)).toMatchObject({ year: 2026, corrected: true });
  });
});

describe('年份可选范围', () => {
  it('从当前年倒序列到最早记录年', () => {
    expect(listSelectableYears(BOUNDS)).toEqual([2026, 2025, 2024]);
  });

  it('库为空时范围只有当前年', () => {
    expect(listSelectableYears({ earliestYear: 2026, currentYear: 2026 })).toEqual([2026]);
  });

  it('最早记录在未来时也收敛到当前年', () => {
    expect(listSelectableYears({ earliestYear: 2030, currentYear: 2026 })).toEqual([2026]);
  });
});

describe('年份边界推导', () => {
  it('库为空时最早年等于当前年', () => {
    expect(
      yearBoundsFor({
        commits: [],
        branches: [],
        todayDate: '2026-11-21',
        tzOffsetMinutes: 480,
      }),
    ).toEqual({ earliestYear: 2026, currentYear: 2026 });
  });

  it('早于当前年的有效提交决定最早年，撤销的提交忽略', () => {
    const bounds = yearBoundsFor({
      commits: [
        { date: '2024-03-01', voidedAt: Date.UTC(2024, 2, 2) },
        { date: '2025-01-01', voidedAt: null },
      ],
      branches: [],
      todayDate: '2026-11-21',
      tzOffsetMinutes: 480,
    });
    expect(bounds).toEqual({ earliestYear: 2025, currentYear: 2026 });
  });

  it('分支创建时间按本地年归类，12 月 31 日晚间东八区算次年', () => {
    const bounds = yearBoundsFor({
      commits: [],
      branches: [{ createdAt: Date.UTC(2026, 11, 31, 20, 0) }],
      todayDate: '2026-11-21',
      tzOffsetMinutes: 480,
    });
    expect(bounds.earliestYear).toBe(2026);
  });
});
