import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from './db';
import type { WriteDeps } from './deps';
import { writeEvent } from './events';
import type { Task } from './types';

/**
 * 本地先写与 `outbox` 入队的事务一致性（PRD V2-02 OP-01 / §8.2）。
 *
 * 只验证契约：业务行与 outbox 同生共死、离线照常成功、连续写入各入队一条。
 */

const AT = Date.UTC(2026, 10, 20, 8, 0);

function deps(): WriteDeps {
  let tick = 0;
  let seq = 0;
  return {
    // 每次取时间递增 1 毫秒，用来断言 outbox 的写入顺序。
    clock: { now: () => AT + tick++ },
    ids: { ulid: () => `event-${++seq}` },
    tzOffset: () => 480,
  };
}

const task = (over: Partial<Task> = {}): Task => ({
  id: 'task-1',
  ownerId: 'local',
  branchId: 'branch-1',
  title: '写周报',
  note: null,
  status: 'open',
  dueDate: null,
  plannedDate: null,
  completedAt: null,
  completedCommitId: null,
  cancelledAt: null,
  order: 1,
  rev: 1,
  createdAt: AT,
  updatedAt: AT,
  deletedAt: null,
  ...over,
});

beforeEach(async () => {
  await db.delete();
  await db.open();
});

afterEach(() => {
  vi.restoreAllMocks();
  Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
});

describe('本地先写与 outbox 入队', () => {
  it('业务写入与 outbox 同事务成功，并保存实体快照', async () => {
    await db.transaction('rw', [db.tasks, db.events, db.outbox], async (tx) => {
      await tx.table<Task, string>('tasks').add(task());
      await writeEvent(
        tx,
        'task.create',
        'task-1',
        { taskId: 'task-1', branchId: 'branch-1' },
        deps(),
      );
    });

    expect(await db.tasks.count()).toBe(1);
    const ops = await db.outbox.toArray();
    expect(ops).toHaveLength(1);
    expect(ops[0]).toMatchObject({
      entity: 'task',
      entityId: 'task-1',
      action: 'task.create',
      baseRev: null,
      attempts: 0,
      lastError: null,
    });
    expect(ops[0].payload).toMatchObject({ id: 'task-1', title: '写周报' });
  });

  it('outbox 写入失败时业务行不落库', async () => {
    vi.spyOn(crypto, 'getRandomValues').mockImplementation(() => {
      throw new Error('id failure');
    });

    await expect(
      db.transaction('rw', [db.tasks, db.events, db.outbox], async (tx) => {
        await tx.table<Task, string>('tasks').add(task());
        await writeEvent(
          tx,
          'task.create',
          'task-1',
          { taskId: 'task-1', branchId: 'branch-1' },
          deps(),
        );
      }),
    ).rejects.toBeTruthy();

    expect(await db.tasks.count()).toBe(0);
    expect(await db.outbox.count()).toBe(0);
  });

  it('离线时写入照常成功，outbox 保持待推状态', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

    await db.transaction('rw', [db.tasks, db.events, db.outbox], async (tx) => {
      await tx.table<Task, string>('tasks').add(task());
      await writeEvent(
        tx,
        'task.create',
        'task-1',
        { taskId: 'task-1', branchId: 'branch-1' },
        deps(),
      );
    });

    const [op] = await db.outbox.toArray();
    expect(op).toBeDefined();
    expect(op.attempts).toBe(0);
    expect(op.lastError).toBeNull();
  });

  it('连续两条写入各入队一条，顺序按写入时刻', async () => {
    const shared = deps();
    await db.transaction('rw', [db.tasks, db.events, db.outbox], async (tx) => {
      await tx.table<Task, string>('tasks').add(task());
      await writeEvent(
        tx,
        'task.create',
        'task-1',
        { taskId: 'task-1', branchId: 'branch-1' },
        shared,
      );
      await tx.table<Task, string>('tasks').add(task({ id: 'task-2', title: '整理书架' }));
      await writeEvent(
        tx,
        'task.create',
        'task-2',
        { taskId: 'task-2', branchId: 'branch-1' },
        shared,
      );
    });

    const ops = await db.outbox.orderBy('createdAt').toArray();
    expect(ops.map((op) => op.entityId)).toEqual(['task-1', 'task-2']);
  });
});
