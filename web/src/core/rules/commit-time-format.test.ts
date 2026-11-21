import { describe, expect, it } from 'vitest';
import { formatCommitTime } from './commit-time-format';

const TZ = 480;

describe('提交时间格式（R5）', () => {
  it('输出年月日与本地时刻', () => {
    expect(formatCommitTime(Date.UTC(2026, 10, 20, 8, 42), TZ)).toBe('2026 年 11 月 20 日 16:42');
  });

  it('零点与分钟补零', () => {
    expect(formatCommitTime(Date.UTC(2026, 10, 20, 16, 0), TZ)).toBe('2026 年 11 月 21 日 00:00');
  });

  it('23:59 不跨日', () => {
    expect(formatCommitTime(Date.UTC(2026, 10, 20, 15, 59), TZ)).toBe('2026 年 11 月 20 日 23:59');
  });

  it('跨月与跨年按本地时区换算', () => {
    expect(formatCommitTime(Date.UTC(2026, 11, 31, 16, 30), TZ)).toBe('2027 年 1 月 1 日 00:30');
  });

  it('输出不含内部 ID 或短 hash', () => {
    const text = formatCommitTime(Date.UTC(2026, 10, 20, 8, 42), TZ);
    expect(text).not.toMatch(/[0-9a-f]{6,}/i);
    expect(text).not.toContain('_');
  });
});
