import { describe, expect, it } from 'vitest';
import { assessWrite, buildConflict, isStaleWrite } from './sync-conflict';

const base = {
  entity: 'task',
  entityId: 'task-1',
  localPayload: { title: '本机标题' },
  serverPayload: { title: '服务端标题' },
  deviceId: 'device-b',
  localRev: 4,
  serverRev: 5,
  at: 1_700_000_000_000,
};

describe('过期写入判定与冲突记录（V2-02 §8.2）', () => {
  it('首次写入（baseRev 为 null）不算过期', () => {
    expect(isStaleWrite(null, 3)).toBe(false);
    expect(assessWrite({ ...base, baseRev: null }).stale).toBe(false);
  });

  it('版本恰好相同表示基于最新版本，允许写入', () => {
    expect(isStaleWrite(5, 5)).toBe(false);
    const result = assessWrite({ ...base, baseRev: 5 });
    expect(result).toEqual({ stale: false, serverRev: 5, conflict: null });
  });

  it('版本不一致判定过期，返回服务端版本并生成整行冲突', () => {
    const result = assessWrite({ ...base, baseRev: 4 });
    expect(result.stale).toBe(true);
    expect(result.serverRev).toBe(5);
    expect(result.conflict).toEqual({
      entity: 'task',
      entityId: 'task-1',
      branchId: null,
      field: null,
      localPayload: { title: '本机标题' },
      serverPayload: { title: '服务端标题' },
      deviceId: 'device-b',
      localRev: 4,
      serverRev: 5,
      at: 1_700_000_000_000,
    });
    expect(result.conflict).not.toHaveProperty('resolved');
    expect(result.conflict).not.toHaveProperty('resolvedAt');
  });

  it('同一秒两次写入仍按版本判定，且保留具体字段', () => {
    const sameSecond = 1_700_000_000_000;
    const first = assessWrite({ ...base, baseRev: 1, serverRev: 2, at: sameSecond });
    const second = assessWrite({
      ...base,
      baseRev: 2,
      serverRev: 2,
      at: sameSecond,
      field: 'title',
    });
    expect(first.stale).toBe(true);
    expect(second.stale).toBe(false);

    const conflict = buildConflict({ ...base, branchId: 'branch-1', field: 'title' });
    expect(conflict).toMatchObject({ branchId: 'branch-1', field: 'title' });
  });

  it('对象不在分支下时 branchId 为 null', () => {
    const conflict = buildConflict({ ...base, entity: 'settings', entityId: 'app' });
    expect(conflict.branchId).toBeNull();
  });
});
