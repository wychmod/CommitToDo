/**
 * 历程「加载更早区间」的分批口径（M06 F-01 / OP-08）。
 *
 * 默认近 90 天；每次向左扩 90 个自然日，不足一批时贴到最早活动日。
 * 「全部」范围不再触发加载；没有更早活动时返回无更多数据。
 */

import { addDays, isDateString } from '@/core/clock';
import type { TimeRangeKind } from './time-range';

export const HISTORY_LOAD_STEP_DAYS = 90;

export type EarlierWindow =
  { status: 'load'; start: string } | { status: 'exhausted' } | { status: 'unavailable' };

function assertDate(value: string): void {
  if (!isDateString(value)) {
    throw new Error(`日期必须是 YYYY-MM-DD：${value}`);
  }
}

/**
 * 计算下一次加载要扩展到的起点。
 *
 * - `unavailable`：范围为「全部」，没有可扩展的下界；
 * - `exhausted`：已经贴到最早活动日，或没有活动日期；
 * - `load`：返回下一批起点，最早不超过 `earliest`。
 */
export function nextEarlierWindow(
  kind: TimeRangeKind,
  currentStart: string | null,
  earliest: string | null,
  stepDays = HISTORY_LOAD_STEP_DAYS,
): EarlierWindow {
  if (kind === 'all') return { status: 'unavailable' };
  if (earliest === null || currentStart === null) return { status: 'exhausted' };
  assertDate(currentStart);
  assertDate(earliest);
  if (currentStart <= earliest) return { status: 'exhausted' };
  if (!Number.isInteger(stepDays) || stepDays <= 0) {
    throw new Error(`加载步长必须是正整数：${stepDays}`);
  }
  const candidate = addDays(currentStart, -stepDays);
  return { status: 'load', start: candidate < earliest ? earliest : candidate };
}
