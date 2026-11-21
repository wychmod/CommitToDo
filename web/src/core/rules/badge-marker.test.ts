import { describe, expect, it } from 'vitest';
import { badgeMarkerDate, buildBadgeMarkers, type BadgeMarkerInput } from './badge-marker';

const AT = Date.UTC(2026, 10, 21, 9, 0);
const TZ = 480;

function badge(over: Partial<BadgeMarkerInput> & { id: string }): BadgeMarkerInput {
  return {
    catalogId: 'first-commit',
    grantedAt: AT,
    snapshot: {},
    ...over,
  };
}

describe('树上标记（V1-05 OP-07 / §4.4）', () => {
  it('优先使用 snapshot.eventDate', () => {
    expect(badgeMarkerDate(badge({ id: 'b1', snapshot: { eventDate: '2026-11-13' } }), TZ)).toBe(
      '2026-11-13',
    );
  });

  it('缺少 eventDate 时退回 grantedAt 的本地日期', () => {
    // 21:00 UTC 在 UTC+8 已是次日。
    const late = Date.UTC(2026, 10, 21, 21, 0);
    expect(badgeMarkerDate(badge({ id: 'b1', grantedAt: late }), TZ)).toBe('2026-11-22');
  });

  it('同一天多枚合并为一个标记并带数量', () => {
    const markers = buildBadgeMarkers(
      [
        badge({ id: 'b1', catalogId: 'first-commit', snapshot: { eventDate: '2026-11-13' } }),
        badge({ id: 'b2', catalogId: 'first-milestone', snapshot: { eventDate: '2026-11-13' } }),
        badge({ id: 'b3', catalogId: 'trunk', snapshot: { eventDate: '2026-11-14' } }),
      ],
      TZ,
    );

    expect(markers).toHaveLength(2);
    expect(markers[0]).toMatchObject({
      date: '2026-11-13',
      count: 2,
      catalogIds: ['first-commit', 'first-milestone'],
    });
    expect(markers[1]).toMatchObject({ date: '2026-11-14', count: 1 });
  });

  it('旧标识归一到 first-fork 后仍只算一枚', () => {
    const markers = buildBadgeMarkers(
      [
        badge({ id: 'old', catalogId: 'first-branch', snapshot: { eventDate: '2026-11-13' } }),
        badge({ id: 'new', catalogId: 'first-fork', snapshot: { eventDate: '2026-11-13' } }),
      ],
      TZ,
    );

    expect(markers).toHaveLength(1);
    expect(markers[0]!.catalogIds).toEqual(['first-fork']);
  });

  it('未知目录标识不渲染标记', () => {
    const markers = buildBadgeMarkers([badge({ id: 'egg', catalogId: 'easter-egg' })], TZ);

    expect(markers).toEqual([]);
  });
});
