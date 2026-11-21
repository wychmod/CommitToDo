import { describe, expect, it } from 'vitest';
import { commitVoidPatch, taskUndoPatch, undoDecision } from './commit-undo';

describe('撤销完成的字段变化（R2）', () => {
  it('待办回到 open 并清空完成字段', () => {
    expect(taskUndoPatch(1000)).toEqual({
      status: 'open',
      completedAt: null,
      completedCommitId: null,
      updatedAt: 1000,
    });
  });

  it('提交补丁只写 voidedAt 与 updatedAt，不删行', () => {
    expect(commitVoidPatch(1000)).toEqual({ voidedAt: 1000, updatedAt: 1000 });
  });

  it('有效提交可以撤销', () => {
    expect(undoDecision({ voidedAt: null })).toBe('undo');
  });

  it('已撤销提交再次调用返回无变化', () => {
    expect(undoDecision({ voidedAt: 1000 })).toBe('noop');
  });

  it('同一时刻两条提交只影响被撤销的那条', () => {
    const first = { id: 'a', voidedAt: null };
    const second = { id: 'b', voidedAt: null };
    const decision = undoDecision(first);
    expect(decision).toBe('undo');
    expect(second.voidedAt).toBeNull();
  });
});
