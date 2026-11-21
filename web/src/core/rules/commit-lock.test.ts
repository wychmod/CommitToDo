import { describe, expect, it } from 'vitest';
import { commitLockAt, commitWriteState, isCommitLocked } from './commit-lock';

const TZ_SHANGHAI = 480;
const TZ_NEW_YORK = -300;

describe('提交跨天锁定（M05）', () => {
  it('UTC+8 下锁定时刻是次日 00:00 本地时间', () => {
    expect(commitLockAt('2026-11-20', TZ_SHANGHAI)).toBe(Date.UTC(2026, 10, 20, 16, 0));
  });

  it('写入于 23:59 时仍可编辑', () => {
    const at = Date.UTC(2026, 10, 20, 15, 59);
    expect(isCommitLocked('2026-11-20', TZ_SHANGHAI, at)).toBe(false);
  });

  it('恰好在 00:00:00 时锁定', () => {
    const at = Date.UTC(2026, 10, 20, 16, 0);
    expect(isCommitLocked('2026-11-20', TZ_SHANGHAI, at)).toBe(true);
  });

  it('月末与年末的次日跨月跨年', () => {
    expect(commitLockAt('2026-11-30', TZ_SHANGHAI)).toBe(Date.UTC(2026, 10, 30, 16, 0));
    expect(commitLockAt('2026-12-31', TZ_SHANGHAI)).toBe(Date.UTC(2026, 11, 31, 16, 0));
  });

  it('同一 date 在 UTC+8 与 UTC-5 下锁定时刻不同', () => {
    const shanghai = commitLockAt('2026-11-20', TZ_SHANGHAI);
    const newYork = commitLockAt('2026-11-20', TZ_NEW_YORK);
    expect(shanghai).toBe(Date.UTC(2026, 10, 20, 16, 0));
    expect(newYork).toBe(Date.UTC(2026, 10, 21, 5, 0));
    expect(shanghai).not.toBe(newYork);
  });

  it('切换时区后按新时区重新判定，date 本身不变', () => {
    const at = Date.UTC(2026, 10, 20, 20, 0);
    const date = '2026-11-20';
    expect(isCommitLocked(date, TZ_SHANGHAI, at)).toBe(true);
    expect(isCommitLocked(date, TZ_NEW_YORK, at)).toBe(false);
    expect(date).toBe('2026-11-20');
  });

  it('锁定只挡编辑与撤销，查看始终可用', () => {
    const locked = commitWriteState({
      date: '2026-11-20',
      tzOffsetMinutes: TZ_SHANGHAI,
      nowMs: Date.UTC(2026, 10, 21, 1, 0),
      voided: false,
    });
    expect(locked).toMatchObject({ locked: true, readOnly: true, canEdit: false, canUndo: false });
    expect(locked.canView).toBe(true);

    const editable = commitWriteState({
      date: '2026-11-20',
      tzOffsetMinutes: TZ_SHANGHAI,
      nowMs: Date.UTC(2026, 10, 20, 8, 0),
      voided: false,
    });
    expect(editable).toMatchObject({ locked: false, canEdit: true, canUndo: true });
  });

  it('已撤销时即使未跨天也写不了，但能查看', () => {
    const state = commitWriteState({
      date: '2026-11-20',
      tzOffsetMinutes: TZ_SHANGHAI,
      nowMs: Date.UTC(2026, 10, 20, 8, 0),
      voided: true,
    });
    expect(state).toMatchObject({ readOnly: true, canEdit: false, canUndo: false });
    expect(state.canView).toBe(true);
  });
});
