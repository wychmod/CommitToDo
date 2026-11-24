import { describe, expect, it } from 'vitest';
import { addDays, currentTzOffset, isDateString, today, toLocalDate, type Clock } from './clock';

const fixedClock = (at: number): Clock => ({ now: () => at });

describe('toLocalDate（业务日期换算）', () => {
  it('UTC+8 的跨日边界按偏移推进', () => {
    expect(toLocalDate(Date.UTC(2026, 10, 20, 15, 59, 59), 480)).toBe('2026-11-20');
    expect(toLocalDate(Date.UTC(2026, 10, 20, 16, 0, 0), 480)).toBe('2026-11-21');
  });

  it('UTC-5 的同一时刻落回前一天', () => {
    expect(toLocalDate(Date.UTC(2026, 10, 21, 3, 0), -300)).toBe('2026-11-20');
  });
});

describe('today（R8 今天分组 / M05 锁定）', () => {
  it('固定时钟与显式偏移即可断言当天，不依赖机器时区', () => {
    const clock = fixedClock(Date.UTC(2026, 10, 20, 16, 42));
    expect(today(clock, 480)).toBe('2026-11-21');
    expect(today(clock, -300)).toBe('2026-11-20');
  });

  it('偏移缺省时取运行环境当前时区', () => {
    const at = Date.UTC(2026, 10, 20, 16, 42);
    expect(today(fixedClock(at))).toBe(toLocalDate(at, currentTzOffset(at)));
  });
});

describe('isDateString（日期形状 + 真实日历）', () => {
  it('合法日期通过', () => {
    expect(isDateString('2026-11-21')).toBe(true);
    expect(isDateString('2024-02-29')).toBe(true);
  });

  it('形状正确但日历不存在的日期被拒', () => {
    expect(isDateString('2026-02-30')).toBe(false);
    expect(isDateString('2026-13-01')).toBe(false);
    expect(isDateString('2026-00-10')).toBe(false);
    expect(isDateString('2026-11-31')).toBe(false);
    expect(isDateString('2025-02-29')).toBe(false);
  });

  it('非日期串被拒', () => {
    expect(isDateString('2026-1-1')).toBe(false);
    expect(isDateString('2026/11/21')).toBe(false);
    expect(isDateString('')).toBe(false);
  });
});

describe('addDays（跨月与闰年）', () => {
  it('月底与闰年按自然日推进', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2025-02-28', 1)).toBe('2025-03-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });
});
