import { addDays } from '@/core/clock';

/**
 * 提交的跨天锁定（R2 的写侧边界 / M05 §4.3）。
 *
 * 锁定时刻 = 提交 `date` 的下一自然日 00:00，按判定当时的本地时区换算。
 * 只挡编辑与撤销，不挡查看与前后节点；`date` / `at` 不因判定而变化。
 */

export function commitLockAt(date: string, tzOffsetMinutes: number): number {
  const next = addDays(date, 1);
  const [year, month, day] = next.split('-').map(Number);
  return Date.UTC(year, month - 1, day) - tzOffsetMinutes * 60_000;
}

export function isCommitLocked(date: string, tzOffsetMinutes: number, nowMs: number): boolean {
  return nowMs >= commitLockAt(date, tzOffsetMinutes);
}

export interface CommitWriteInput {
  date: string;
  tzOffsetMinutes: number;
  nowMs: number;
  voided: boolean;
}

export interface CommitWriteState {
  locked: boolean;
  readOnly: boolean;
  canEdit: boolean;
  canUndo: boolean;
  /** 锁定与撤销都只影响写入，查看与前后节点始终可用。 */
  canView: true;
}

export function commitWriteState({
  date,
  tzOffsetMinutes,
  nowMs,
  voided,
}: CommitWriteInput): CommitWriteState {
  const locked = isCommitLocked(date, tzOffsetMinutes, nowMs);
  const readOnly = voided || locked;
  return {
    locked,
    readOnly,
    canEdit: !readOnly,
    canUndo: !readOnly,
    canView: true,
  };
}
