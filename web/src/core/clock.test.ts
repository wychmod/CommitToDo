import { describe, expect, it } from 'vitest';
import { currentTzOffset, today, toLocalDate, type Clock } from './clock';

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
