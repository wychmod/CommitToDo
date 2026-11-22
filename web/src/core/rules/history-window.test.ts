import { describe, expect, it } from 'vitest';
import { HISTORY_LOAD_STEP_DAYS, nextEarlierWindow } from './history-window';

describe('历程分批加载', () => {
  it('每次向左扩整批 90 天', () => {
    expect(nextEarlierWindow('recent90', '2026-06-30', '2025-01-01')).toEqual({
      status: 'load',
      start: '2026-04-01',
    });
  });

  it('跨年边界按自然日回退', () => {
    expect(nextEarlierWindow('thisYear', '2026-01-15', '2025-01-01')).toEqual({
      status: 'load',
      start: '2025-10-17',
    });
  });

  it('剩余不足一批时贴到最早活动日', () => {
    expect(nextEarlierWindow('recent90', '2026-03-01', '2026-02-01')).toEqual({
      status: 'load',
      start: '2026-02-01',
    });
  });

  it('恰好一批时落在最早活动日，再加载即没有更早数据', () => {
    const first = nextEarlierWindow('recent90', '2026-04-01', '2026-01-01');
    expect(first).toEqual({ status: 'load', start: '2026-01-01' });
    expect(nextEarlierWindow('recent90', '2026-01-01', '2026-01-01')).toEqual({
      status: 'exhausted',
    });
  });

  it('起点已到最早活动日时没有更早数据', () => {
    expect(nextEarlierWindow('recent90', '2026-01-01', '2026-01-01')).toEqual({
      status: 'exhausted',
    });
    expect(nextEarlierWindow('thisYear', '2025-12-01', '2026-01-01')).toEqual({
      status: 'exhausted',
    });
  });

  it('没有任何活动日期时没有更早数据', () => {
    expect(nextEarlierWindow('recent90', '2026-01-01', null)).toEqual({ status: 'exhausted' });
  });

  it('「全部」范围不再触发加载', () => {
    expect(nextEarlierWindow('all', null, '2020-01-01')).toEqual({ status: 'unavailable' });
    expect(nextEarlierWindow('all', '2025-01-01', '2020-01-01')).toEqual({
      status: 'unavailable',
    });
  });

  it('连续多批累积到最早活动日为止', () => {
    let start = '2026-07-01';
    const earliest = '2025-10-01';
    const starts: string[] = [];
    for (;;) {
      const step = nextEarlierWindow('recent90', start, earliest);
      if (step.status !== 'load') {
        expect(step.status).toBe('exhausted');
        break;
      }
      starts.push(step.start);
      start = step.start;
    }
    expect(starts).toEqual(['2026-04-02', '2026-01-02', '2025-10-04', earliest]);
  });

  it('步长参数非法时直接报错', () => {
    expect(() => nextEarlierWindow('recent90', '2026-01-01', '2025-01-01', 0)).toThrow();
    expect(() => nextEarlierWindow('recent90', '2026-01-01', '2025-01-01', 1.5)).toThrow();
  });

  it('默认步长常量为 90', () => {
    expect(HISTORY_LOAD_STEP_DAYS).toBe(90);
  });
});
