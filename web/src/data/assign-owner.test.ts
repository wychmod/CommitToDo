import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { assignOwnerTo } from './assign-owner';
import { createTask } from './create-task';
import { db, LOCAL_OWNER_ID, setOwnerId } from './db';
import type { WriteDeps } from './deps';
import { ensureRootBranch } from './ensure-root-branch';
import type { Badge } from './types';

const AT = Date.UTC(2026, 10, 21, 8, 42);

function makeDeps(): WriteDeps {
  let seq = 0;
  return {
    clock: { now: () => AT },
    ids: {
      ulid: () => {
        seq += 1;
        return `id-${seq}`;
      },
    },
    tzOffset: () => 480,
  };
}

function badge(over: Partial<Badge>): Badge {
  return {
    id: 'badge',
    ownerId: 'local',
    catalogId: 'first-commit',
    category: 'structure',
    periodKey: '2026-11',
    grantedAt: AT,
    snapshot: {},
    sourceEntityId: null,
    rev: 1,
    createdAt: AT,
    ...over,
  };
}

beforeEach(async () => {
  await db.delete();
  await db.open();
  setOwnerId('local');
});

afterEach(() => {
  setOwnerId('local');
});

describe('assignOwnerTo（V2-01 / OP-08）', () => {
  it('把全部业务表的归属改到账号，条数与四计数不变', async () => {
    const deps = makeDeps();
    const root = await ensureRootBranch(deps);
    if (!root.ok) throw new Error('root creation failed');
    const task = await createTask({ title: '写周报' }, deps);
    if (!task.ok) throw new Error('task creation failed');

    const beforeRoot = await db.branches.get(root.value.id);
    const beforeTasks = await db.tasks.count();

    const result = await assignOwnerTo('principal-1');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.moved).toBeGreaterThan(0);

    expect(await db.tasks.count()).toBe(beforeTasks);
    const afterRoot = await db.branches.get(root.value.id);
    expect(afterRoot).toMatchObject({
      ownerId: 'principal-1',
      taskTotal: beforeRoot?.taskTotal,
      taskDone: beforeRoot?.taskDone,
      commitCount: beforeRoot?.commitCount,
    });

    for (const name of [
      'branches',
      'tasks',
      'commits',
      'milestones',
      'badges',
      'settings',
      'events',
      'backups',
      'year_reviews',
    ]) {
      expect(await db.table(name).where('ownerId').equals('local').count()).toBe(0);
    }

    expect(LOCAL_OWNER_ID).toBe('principal-1');

    const again = await assignOwnerTo('principal-1');
    expect(again).toEqual({ ok: true, value: { moved: 0 } });
  });

  it('账号已有同键徽章时整体回滚，归属仍留在 local', async () => {
    const deps = makeDeps();
    const root = await ensureRootBranch(deps);
    if (!root.ok) throw new Error('root creation failed');

    await db.badges.put(badge({ id: 'local-badge' }));
    await db.badges.put(badge({ id: 'account-badge', ownerId: 'principal-1' }));

    const result = await assignOwnerTo('principal-1');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('storage.write_failed');

    expect(LOCAL_OWNER_ID).toBe('local');
    const branch = await db.branches.get(root.value.id);
    expect(branch?.ownerId).toBe('local');
    expect((await db.badges.get('local-badge'))?.ownerId).toBe('local');
  });

  it('空账号返回校验失败', async () => {
    const result = await assignOwnerTo('');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('validation.invalid_input');
  });
});
