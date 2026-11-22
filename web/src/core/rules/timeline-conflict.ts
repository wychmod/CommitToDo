import { toLocalDate } from '@/core/clock';

/**
 * 分支历史里的同步冲突留痕（PRD V2-02 §5 / OP-03）。
 *
 * 只消费 `events` 中 `action = 'sync.conflict'` 的记录：按 `payload.branchId`
 * 归到分支，按事件时刻落到本地日期。没有 branchId 的冲突（如徽章）不进入时间线。
 */

export interface ConflictEventRow {
  id: string;
  at: number;
  action: string;
  deviceId?: string | null;
  payload: Record<string, unknown>;
}

export interface TimelineConflict {
  id: string;
  branchId: string;
  at: number;
  date: string;
  entity: string;
  deviceId: string | null;
}

const CONFLICT_ACTION = 'sync.conflict';

export function collectTimelineConflicts(
  events: readonly ConflictEventRow[],
  tzOffsetMinutes: number,
): TimelineConflict[] {
  const rows: TimelineConflict[] = [];
  for (const event of events) {
    if (event.action !== CONFLICT_ACTION) continue;
    if (!Number.isFinite(event.at)) continue;
    const branchId = typeof event.payload.branchId === 'string' ? event.payload.branchId : '';
    if (branchId.length === 0) continue;
    const payloadDevice = event.payload.deviceId;
    const deviceId =
      typeof payloadDevice === 'string' && payloadDevice.length > 0
        ? payloadDevice
        : (event.deviceId ?? null);
    rows.push({
      id: event.id,
      branchId,
      at: event.at,
      date: toLocalDate(event.at, tzOffsetMinutes),
      entity: typeof event.payload.entity === 'string' ? event.payload.entity : '',
      deviceId,
    });
  }
  return rows.sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
}
