import { beforeEach, describe, expect, it } from 'vitest';
import { archiveBranch } from './archive-branch';
import { db, LOCAL_OWNER_ID } from './db';
import type { WriteDeps } from './deps';
import { pauseBranch } from './pause-branch';
import { resumeBranch } from './resume-branch';
import { unarchiveBranch } from './unarchive-branch';
import type { Branch, Commit, Task } from './types';

/**
 * 生命周期写入与回滚（PRD V1-01 §8.2）。
 *
 * 四个动作都只写 `branches` 与 `events`；回滚用例让事件写入抛错，
 * 断言分支字段与操作前逐字段相等且没有孤立事件。
 */

const AT = Date.UTC(2026, 10, 21, 9, 0);

function makeDeps(over: Partial<WriteDeps> = {}): WriteDeps {
  let seq = 0;
  return {
    clock: { now: () => AT },
    ids: { ulid: () => `id-${++seq}` },
    tzOffset: () => 480,
    ...over,
  };
}

function branchRow(over: Partial<Branch> & Pick<Branch, 'id'>): Branch {
  return {
    ownerId: LOCAL_OWNER_ID,
    parentId: null,
    path: '/',
    depth: 0,
    title: over.id,
    goal: null,
    color: 'coral',
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

function taskRow(over: Partial<Task> & Pick<Task, 'id' | 'branchId'>): Task {
  return {
    ownerId: LOCAL_OWNER_ID,
    title: over.id,
    note: null,
    status: 'open',
    dueDate: null,
    plannedDate: null,
    completedAt: null,
    completedCommitId: null,
    cancelledAt: null,
    order: 0,
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

const ROOT = branchRow({ id: 'root', path: '/' });
const L1 = branchRow({ id: 'l1', parentId: 'root', path: '/l1/', depth: 1 });
const L1_CHILD = branchRow({ id: 'c', parentId: 'l1', path: '/l1/c/', depth: 2 });

beforeEach(async () => {
  await db.delete();
  await db.open();
  await db.branches.bulkAdd([ROOT, L1, L1_CHILD]);
});

async function readBranch(id: string): Promise<Branch | undefined> {
  return db.branches.get(id);
}

async function eventActions(): Promise<string[]> {
  return (await db.events.toArray()).map((event) => event.action);
}

describe('pauseBranch（OP-01 / R15）', () => {
  it('写 status / droppedAt / dropReason，并记一条 branch.pause', async () => {
    await db.tasks.bulkAdd([
      taskRow({ id: 't1', branchId: 'l1' }),
      taskRow({ id: 't2', branchId: 'l1', status: 'done' }),
    ]);
    await db.commits.add(commitRow({ id: 'c1', branchId: 'l1' }));
    await db.branches.update('l1', { taskTotal: 2, taskDone: 1, commitCount: 1 });

    const result = await pauseBranch({ branchId: 'l1', reason: '  这学期先不跑步了 ' }, makeDeps());

    expect(result.ok).toBe(true);
    const row = await readBranch('l1');
    expect(row).toMatchObject({
      status: 'dropped',
      droppedAt: AT,
      dropReason: '这学期先不跑步了',
      taskTotal: 2,
      taskDone: 1,
      commitCount: 1,
    });
    expect((await eventActions()).filter((action) => action.startsWith('branch.'))).toEqual([
      'branch.pause',
    ]);
  });

  it('原因只有空白时不写入，也不产生事件', async () => {
    const before = await readBranch('l1');
    const result = await pauseBranch({ branchId: 'l1', reason: ' \n\t ' }, makeDeps());

    expect(result.ok).toBe(false);
    expect(await readBranch('l1')).toEqual(before);
    expect(await db.events.count()).toBe(0);
  });

  it('事件写入抛错时分支保持原值', async () => {
    const before = await readBranch('l1');
    const result = await pauseBranch(
      { branchId: 'l1', reason: '先放下' },
      makeDeps({
        ids: {
          ulid: () => {
            throw new Error('event failed');
          },
        },
      }),
    );

    expect(result.ok).toBe(false);
    expect(await readBranch('l1')).toEqual(before);
    expect(await db.events.count()).toBe(0);
  });

  it('重复放下第二次返回只读，字段保持第一次的结果', async () => {
    const first = await pauseBranch({ branchId: 'l1', reason: '第一次' }, makeDeps());
    if (!first.ok) throw new Error('pause failed');
    const second = await pauseBranch({ branchId: 'l1', reason: '第二次' }, makeDeps());

    expect(second.ok).toBe(false);
    expect(await readBranch('l1')).toMatchObject({ dropReason: '第一次' });
    expect((await eventActions()).filter((action) => action === 'branch.pause')).toHaveLength(1);
  });
});

describe('resumeBranch（OP-02 / R15）', () => {
  it('回到 active 并保留上次放下原因与时间', async () => {
    await db.branches.update('l1', {
      status: 'dropped',
      droppedAt: AT,
      dropReason: '先放一放',
    });

    const result = await resumeBranch({ branchId: 'l1' }, makeDeps());

    expect(result.ok).toBe(true);
    expect(await readBranch('l1')).toMatchObject({
      status: 'active',
      droppedAt: AT,
      dropReason: '先放一放',
    });
    expect((await eventActions()).filter((action) => action.startsWith('branch.'))).toEqual([
      'branch.resume',
    ]);
  });

  it('祖先已合并时不可重新开始，状态不变', async () => {
    await db.branches.update('l1', { status: 'merged' });
    await db.branches.update('c', { status: 'dropped', droppedAt: AT, dropReason: 'x' });

    const result = await resumeBranch({ branchId: 'c' }, makeDeps());

    expect(result).toMatchObject({ ok: false, error: { code: 'domain.readonly_branch' } });
    expect(await readBranch('c')).toMatchObject({ status: 'dropped' });
    expect(await db.events.count()).toBe(0);
  });
});

describe('archiveBranch（OP-03 / R14）', () => {
  it('只写选中分支的 archivedAt，后代不被批量标记', async () => {
    await db.branches.update('l1', { status: 'merged' });
    await db.branches.update('c', { status: 'dropped' });

    const result = await archiveBranch({ branchId: 'l1' }, makeDeps());

    expect(result.ok).toBe(true);
    expect(await readBranch('l1')).toMatchObject({ archivedAt: AT, status: 'merged' });
    expect(await readBranch('c')).toMatchObject({ archivedAt: null, status: 'dropped' });
    expect(await eventActions()).toEqual(['branch.archive']);
    const event = await db.events.toCollection().first();
    expect(event?.payload).toMatchObject({ branchId: 'l1', subtreeCount: 2 });
  });

  it('存在进行中后代时不可归档，也不写入', async () => {
    await db.branches.update('l1', { status: 'dropped' });

    const result = await archiveBranch({ branchId: 'l1' }, makeDeps());

    expect(result).toMatchObject({ ok: false, error: { code: 'domain.conflict' } });
    expect(await readBranch('l1')).toMatchObject({ archivedAt: null });
    expect(await db.events.count()).toBe(0);
  });

  it('事件写入抛错时 archivedAt 保持原值', async () => {
    await db.branches.update('l1', { status: 'merged' });

    const result = await archiveBranch(
      { branchId: 'l1' },
      makeDeps({
        ids: {
          ulid: () => {
            throw new Error('event failed');
          },
        },
      }),
    );

    expect(result.ok).toBe(false);
    expect(await readBranch('l1')).toMatchObject({ archivedAt: null });
    expect(await db.events.count()).toBe(0);
  });
});

describe('unarchiveBranch（OP-04 / R14、R16）', () => {
  it('清空 archivedAt，status 不变', async () => {
    await db.branches.update('l1', { status: 'dropped', archivedAt: AT });

    const result = await unarchiveBranch({ branchId: 'l1' }, makeDeps());

    expect(result.ok).toBe(true);
    expect(await readBranch('l1')).toMatchObject({ archivedAt: null, status: 'dropped' });
    expect(await eventActions()).toEqual(['branch.unarchive']);
  });

  it('父分支仍归档时不可取消归档', async () => {
    await db.branches.update('l1', { status: 'merged', archivedAt: AT });
    await db.branches.update('c', { status: 'dropped', archivedAt: AT + 1 });

    const result = await unarchiveBranch({ branchId: 'c' }, makeDeps());

    expect(result.ok).toBe(false);
    expect(await readBranch('c')).toMatchObject({ archivedAt: AT + 1 });
    expect(await db.events.count()).toBe(0);
  });

  it('恢复后超出父分支名额时不可用', async () => {
    const siblings = Array.from({ length: 7 }, (_, index) =>
      branchRow({ id: `s${index}`, parentId: 'root', path: `/s${index}/`, depth: 1 }),
    );
    await db.branches.bulkPut(siblings);
    await db.branches.update('l1', { status: 'merged', archivedAt: AT });

    const result = await unarchiveBranch({ branchId: 'l1' }, makeDeps());

    expect(result).toMatchObject({ ok: false, error: { code: 'domain.quota_exceeded' } });
    expect(await readBranch('l1')).toMatchObject({ archivedAt: AT });
    expect(await db.events.count()).toBe(0);
  });
});
