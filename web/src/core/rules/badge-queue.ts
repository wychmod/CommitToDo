import { toLocalDate } from '@/core/clock';

/**
 * 今天页的徽章轻提示队列（PRD M11 OP-06）。
 *
 * 只保留「发放当天」的徽章；跨天不补。同一 `catalogId` 只入队一次，
 * 多条按 `grantedAt` 升序（相同则按 `createdAt`、`id`）逐条出队。
 */
export interface QueuedBadge {
  id: string;
  catalogId: string;
  grantedAt: number;
  createdAt: number;
}

export function pendingBadgeQueue<T extends QueuedBadge>(
  badges: readonly T[],
  todayDate: string,
  tzOffsetMinutes: number,
  dismissed: ReadonlySet<string>,
): T[] {
  const seen = new Set<string>();
  const queued: T[] = [];

  const sorted = badges
    .slice()
    .sort(
      (left, right) =>
        left.grantedAt - right.grantedAt ||
        left.createdAt - right.createdAt ||
        left.id.localeCompare(right.id),
    );

  for (const badge of sorted) {
    if (dismissed.has(badge.id)) continue;
    if (toLocalDate(badge.grantedAt, tzOffsetMinutes) !== todayDate) continue;
    if (seen.has(badge.catalogId)) continue;
    seen.add(badge.catalogId);
    queued.push(badge);
  }

  return queued;
}
