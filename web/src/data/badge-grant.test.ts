import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { completeTask } from './complete-task';
import { createTask } from './create-task';
import { db, LOCAL_OWNER_ID } from './db';
import type { WriteDeps } from './deps';
import { ensureRootBranch } from './ensure-root-branch';
import { grantBadge } from './grant-badge';
import type { Branch, Commit, Milestone } from './types';

/**
 * 徽章发放与补查（PRD M11 §8.2）。
 *
 * 最值钱的回归是「徽章写入失败不拖累主操作」：
 * 若把徽章并入完成待办的事务，徽章写失败会把已经完成的待办一起回滚，
 * 用户看到完成失败，但提交可能已生成，重启后又出现不一致。
 */

const AT = Date.UTC(2026, 10, 21, 9, 0);

function makeDeps(over: Partial<WriteDeps> = {}): WriteDeps {
  let seq = 0;
  return {
    clock: { now: () => AT },
    ids: { ulid: () => `gen-${++seq}` },
    tzOffset: () => 480,
    ...over,
  };
}

function branchRow(over: Partial<Branch> & Pick<Branch, 'id'>): Branch {
  return {
    ownerId: LOCAL_OWNER_ID,
    parentId: null,
    path: over.id,
    depth: 0,
    title: over.id,
    goal: null,
    color: 'accent',
    status: 'active',
    order: 0,
    archivedAt: null,
    finishedAt: null,
    finishedIntoId: null,
    droppedAt: null,
    dropReason: null,
    pinnedAt: null,
    taskTotal: 0,
    taskDone: 0,
    commitCount: 0,
    ownLastCommitAt: null,
    rev: 1,
    createdAt: AT,
    updatedAt: AT,
    deletedAt: null,
    ...over,
  };
}

function commitRow(over: Partial<Commit> & Pick<Commit, 'id' | 'branchId'>): Commit {
  return {
    ownerId: LOCAL_OWNER_ID,
    sourceBranchId: over.branchId,
    taskId: null,
    date: '2026-11-21',
    at: AT,
    summary: over.id,
    voidedAt: null,
    rev: 1,
    createdAt: AT,
    updatedAt: AT,
    deletedAt: null,
    ...over,
  };
}

function milestoneRow(over: Partial<Milestone> & Pick<Milestone, 'id' | 'branchId'>): Milestone {
  return {
    ownerId: LOCAL_OWNER_ID,
    title: over.id,
    note: null,
    achievedAt: AT,
    datePrecision: 'day',
    rev: 1,
    createdAt: AT,
    updatedAt: AT,
    deletedAt: null,
    ...over,
  };
}

beforeEach(async () => {
  await db.delete();
  await db.open();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('grantBadge（M11 OP-01–OP-03）', () => {
  it('没有满足条件的数据时不产生徽章', async () => {
    const result = await grantBadge(makeDeps());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual([]);
    expect(await db.badges.count()).toBe(0);
  });

  it('四枚徽章一次发齐，各写一条 badge.grant', async () => {
    await db.branches.add(branchRow({ id: 'root' }));
    await db.branches.add(branchRow({ id: 'child', parentId: 'root', depth: 2 }));
    await db.branches.add(
      branchRow({
        id: 'merged',
        parentId: 'root',
        depth: 1,
        status: 'merged',
        finishedAt: AT,
        finishedIntoId: 'root',
      }),
    );
    await db.commits.add(commitRow({ id: 'c1', branchId: 'child' }));
    await db.milestones.add(milestoneRow({ id: 'm1', branchId: 'child' }));

    const result = await grantBadge(makeDeps());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.map((badge) => badge.catalogId).sort()).toEqual([
      'first-commit',
      'first-fork',
      'first-merge',
      'first-milestone',
    ]);
    expect(result.value.every((badge) => badge.periodKey === 'all')).toBe(true);
    expect(await db.badges.toArray()).toHaveLength(4);
    const events = (await db.events.toArray()).filter((event) => event.action === 'badge.grant');
    expect(events).toHaveLength(4);
  });

  it('再次调用不重复发放，也不改写已发放的快照', async () => {
    await db.branches.add(branchRow({ id: 'root' }));
    await db.commits.add(commitRow({ id: 'c1', branchId: 'root' }));

    await grantBadge(makeDeps());
    const before = await db.badges.toArray();

    const second = await grantBadge(
      makeDeps({ clock: { now: () => AT + 60_000 }, ids: { ulid: () => 'later' } }),
    );
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.value).toEqual([]);
    expect(await db.badges.toArray()).toEqual(before);
  });

  it('起笔提交被撤销后不再补发新的起笔', async () => {
    await db.branches.add(branchRow({ id: 'root' }));
    await db.commits.add(commitRow({ id: 'c1', branchId: 'root' }));
    await grantBadge(makeDeps());

    await db.commits.update('c1', { voidedAt: AT + 1_000 });
    await db.commits.add(commitRow({ id: 'c2', branchId: 'root', at: AT + 2_000 }));

    const second = await grantBadge(makeDeps());
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.value).toEqual([]);
    const badges = await db.badges.toArray();
    expect(badges).toHaveLength(1);
    expect(badges[0].snapshot).toMatchObject({ commitId: 'c1' });
  });
});

describe('徽章写入失败不拖累主操作（M11 OP-10）', () => {
  it('完成待办仍然成功，下次补查补齐徽章', async () => {
    const deps = makeDeps();
    const root = await ensureRootBranch(deps);
    if (!root.ok) throw new Error('root creation failed');
    const task = await createTask(
      { title: '交周报', branchId: root.value.id, dueDate: '2026-11-21' },
      deps,
    );
    if (!task.ok) throw new Error('task creation failed');

    vi.spyOn(db.badges, 'add').mockImplementationOnce(
      () => Promise.reject(new Error('badge write failed')) as never,
    );

    const completed = await completeTask({ taskId: task.value.id }, deps);
    expect(completed.ok).toBe(true);
    expect((await db.tasks.get(task.value.id))?.status).toBe('done');
    expect(await db.commits.count()).toBe(1);
    expect(await db.badges.count()).toBe(0);

    const retried = await grantBadge(deps);
    expect(retried.ok).toBe(true);
    if (!retried.ok) return;
    expect(retried.value.map((badge) => badge.catalogId)).toEqual(['first-commit']);
    expect(await db.badges.count()).toBe(1);
  });
});
