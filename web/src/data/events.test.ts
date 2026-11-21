import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import { defaultWriteDeps } from './deps';
import { writeEvent } from './events';

/**
 * `events` 写入契约（docs/CODE-STRUCTURE.md §4 / §2.9 的 db 项目）。
 * 只验证写入口：entity 由 action 前缀推导、时钟与 ID 注入生效、事务失败不留痕。
 */

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('writeEvent', () => {
  it('在事务内写入一条事件，entity 由 action 前缀推导', async () => {
    const at = Date.UTC(2026, 10, 20, 8, 42);
    const deps = {
      clock: { now: () => at },
      ids: { ulid: (now: number) => `ulid-${now}` },
      tzOffset: () => 480,
    };

    await db.transaction('rw', [db.events, db.outbox], async (tx) => {
      await writeEvent(
        tx,
        'branch.finish',
        'branch-1',
        { branchId: 'branch-1', finishedIntoId: 'branch-0', archived: true, movedTaskCount: 2 },
        deps,
      );
    });

    const rows = await db.events.toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: `ulid-${at}`,
      entityType: 'branch',
      entityId: 'branch-1',
      action: 'branch.finish',
      payload: {
        branchId: 'branch-1',
        finishedIntoId: 'branch-0',
        archived: true,
        movedTaskCount: 2,
      },
      at,
      tzOffset: 480,
    });
  });

  it('sync.conflict 落 entityType=sync，分支回溯字段在 payload', async () => {
    await db.transaction('rw', [db.events, db.outbox], async (tx) => {
      await writeEvent(tx, 'sync.conflict', 'branch-1', {
        branchId: 'branch-1',
        entityId: 'branch-1',
        field: 'title',
      });
    });

    const [row] = await db.events.toArray();
    expect(row).toMatchObject({ entityType: 'sync', payload: { branchId: 'branch-1' } });
  });

  it('事务中断时事件一起回滚', async () => {
    await expect(
      db.transaction('rw', [db.events, db.outbox], async (tx) => {
        await writeEvent(tx, 'task.complete', 'task-1', {
          taskId: 'task-1',
          commitId: 'commit-1',
          branchId: 'branch-1',
        });
        throw new Error('transaction aborted');
      }),
    ).rejects.toThrow('transaction aborted');

    expect(await db.events.count()).toBe(0);
    expect(defaultWriteDeps.clock.now()).toBeGreaterThan(0);
  });
});
