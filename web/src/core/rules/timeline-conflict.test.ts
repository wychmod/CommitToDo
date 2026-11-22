import { describe, expect, it } from 'vitest';
import { collectTimelineConflicts } from './timeline-conflict';

const TZ = 480;
const AT = Date.UTC(2026, 10, 22, 2, 30); // 2026-11-22 10:30 +08:00

describe('collectTimelineConflicts', () => {
  it('只保留 sync.conflict 且带 branchId 的记录', () => {
    const rows = collectTimelineConflicts(
      [
        {
          id: 'e1',
          at: AT,
          action: 'sync.conflict',
          payload: { branchId: 'b1', entity: 'task', deviceId: 'd1' },
        },
        { id: 'e2', at: AT, action: 'task.complete', payload: { branchId: 'b1' } },
        { id: 'e3', at: AT, action: 'sync.conflict', payload: { entity: 'badge' } },
      ],
      TZ,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: 'e1', branchId: 'b1', entity: 'task', deviceId: 'd1' });
  });

  it('按本地时区落到日期，并保留事件级设备兜底', () => {
    const rows = collectTimelineConflicts(
      [
        {
          id: 'e1',
          at: AT,
          action: 'sync.conflict',
          deviceId: 'local',
          payload: { branchId: 'b1' },
        },
      ],
      TZ,
    );
    expect(rows[0]).toMatchObject({ date: '2026-11-22', deviceId: 'local', entity: '' });
  });

  it('跨时区时日期随偏移变化', () => {
    const early = Date.UTC(2026, 10, 21, 23, 30); // UTC 21 日 23:30
    expect(
      collectTimelineConflicts(
        [{ id: 'e1', at: early, action: 'sync.conflict', payload: { branchId: 'b1' } }],
        TZ,
      )[0]?.date,
    ).toBe('2026-11-22');
    expect(
      collectTimelineConflicts(
        [{ id: 'e1', at: early, action: 'sync.conflict', payload: { branchId: 'b1' } }],
        0,
      )[0]?.date,
    ).toBe('2026-11-21');
  });

  it('按时间升序稳定排序', () => {
    const rows = collectTimelineConflicts(
      [
        { id: 'b', at: AT + 1000, action: 'sync.conflict', payload: { branchId: 'b1' } },
        { id: 'a', at: AT, action: 'sync.conflict', payload: { branchId: 'b1' } },
      ],
      TZ,
    );
    expect(rows.map((row) => row.id)).toEqual(['a', 'b']);
  });
});
