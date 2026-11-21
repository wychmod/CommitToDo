import { describe, expect, it } from 'vitest';
import { pendingBadgeQueue } from './badge-queue';

const TZ = 480;
const AT = Date.UTC(2026, 10, 21, 1, 0);

function badge(id: string, catalogId: string, grantedAt: number, createdAt = grantedAt) {
  return { id, catalogId, grantedAt, createdAt };
}

describe('pendingBadgeQueue（M11 OP-06）', () => {
  it('只保留发放当天的徽章，跨天不补', () => {
    const queue = pendingBadgeQueue(
      [
        badge('today', 'first-commit', AT),
        badge('yesterday', 'first-branch', AT - 86_400_000),
        badge('tomorrow', 'first-merge', AT + 86_400_000),
      ],
      '2026-11-21',
      TZ,
      new Set(),
    );

    expect(queue.map((item) => item.id)).toEqual(['today']);
  });

  it('按本地时区判断当天', () => {
    // UTC 2026-11-20 17:00 在 UTC+8 已是 21 日。
    const queue = pendingBadgeQueue(
      [badge('late', 'first-commit', Date.UTC(2026, 10, 20, 17, 0))],
      '2026-11-21',
      TZ,
      new Set(),
    );

    expect(queue).toHaveLength(1);
  });

  it('同一枚徽章只排队一次，保留最早一条', () => {
    const queue = pendingBadgeQueue(
      [badge('later', 'first-commit', AT + 1_000), badge('earlier', 'first-commit', AT)],
      '2026-11-21',
      TZ,
      new Set(),
    );

    expect(queue.map((item) => item.id)).toEqual(['earlier']);
  });

  it('已关闭的徽章不再出现，并按下一条排序', () => {
    const queue = pendingBadgeQueue(
      [
        badge('second', 'first-merge', AT + 2_000),
        badge('first', 'first-branch', AT + 1_000),
        badge('closed', 'first-commit', AT),
      ],
      '2026-11-21',
      TZ,
      new Set(['closed']),
    );

    expect(queue.map((item) => item.id)).toEqual(['first', 'second']);
  });
});
