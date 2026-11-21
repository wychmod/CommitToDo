import { beforeEach, describe, expect, it } from 'vitest';
import { deleteEmptyBranch } from './delete-empty-branch';
import type { WriteDeps } from './deps';
import { db, LOCAL_OWNER_ID } from './db';
import { ensureRootBranch } from './ensure-root-branch';
import { createBranch } from './create-branch';
import { finishBranch } from './finish-branch';
import type { Commit, Task } from './types';

/**
 * 收尾与删除空分支的事务一致性（PRD M08 §8.2）。
 *
 * 重点回归「中途失败全部回滚」：不能出现待办已经移到父分支、但子分支仍是进行中；
 * 也不允许删除后留下 events 或 deletedAt 墓碑。
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

async function buildTree(deps: WriteDeps) {
  const root = await ensureRootBranch(deps);
  if (!root.ok) throw new Error('root');
  const parent = await createBranch({ title: '主业', parentId: root.value.id }, deps);
  if (!parent.ok) throw new Error('parent');
  const child = await createBranch({ title: '小程序', parentId: parent.value.id }, deps);
  if (!child.ok) throw new Error('child');
  return { root: root.value, parent: parent.value, child: child.value };
}

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('finishBranch（R12 / OP-04 / OP-05）', () => {
  it('收尾并归档：待办与提交迁移、父分支计数重算、只记一条 branch.finish', async () => {
    const deps = makeDeps();
    const { parent, child } = await buildTree(deps);

    await db.tasks.bulkAdd([
      taskRow({ id: 't-open-1', branchId: child.id, status: 'open' }),
      taskRow({ id: 't-open-2', branchId: child.id, status: 'open' }),
      taskRow({
        id: 't-done',
        branchId: child.id,
        status: 'done',
        completedAt: AT,
        completedCommitId: 'c-done',
      }),
      taskRow({ id: 't-cancelled', branchId: child.id, status: 'cancelled' }),
      taskRow({ id: 'p-open', branchId: parent.id, status: 'open' }),
      taskRow({ id: 'p-done', branchId: parent.id, status: 'done' }),
    ]);
    await db.commits.bulkAdd([
      commitRow({ id: 'c-done', branchId: child.id, at: AT - 3_000 }),
      commitRow({ id: 'c-2', branchId: child.id, at: AT - 2_000 }),
      commitRow({ id: 'c-voided', branchId: child.id, at: AT - 1_000, voidedAt: AT - 500 }),
      commitRow({ id: 'p-own', branchId: parent.id, at: AT - 10_000 }),
    ]);
    // 徽章是独立事务，不计入收尾事件条数的断言。
    const eventsBefore = (await db.events.toArray()).filter(
      (event) => event.action !== 'badge.grant',
    ).length;

    const result = await finishBranch({ branchId: child.id, archived: true }, deps);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value).toMatchObject({
      status: 'merged',
      finishedAt: AT,
      finishedIntoId: parent.id,
      archivedAt: AT,
      rev: child.rev + 1,
    });
    // 子分支计数保留为历史值，不因迁移而清零。
    expect(result.value.taskTotal).toBe(child.taskTotal);
    expect(result.value.commitCount).toBe(child.commitCount);

    const movedTasks = await db.tasks.where('branchId').equals(parent.id).toArray();
    expect(movedTasks.map((row) => row.id).sort()).toEqual([
      'p-done',
      'p-open',
      't-open-1',
      't-open-2',
    ]);
    expect((await db.tasks.get('t-done'))?.branchId).toBe(child.id);
    expect((await db.tasks.get('t-cancelled'))?.branchId).toBe(child.id);

    const movedCommits = await db.commits.where('branchId').equals(parent.id).toArray();
    expect(movedCommits.map((row) => row.id).sort()).toEqual([
      'c-2',
      'c-done',
      'c-voided',
      'p-own',
    ]);
    const migrated = await db.commits.get('c-done');
    expect(migrated).toMatchObject({ branchId: parent.id, sourceBranchId: child.id });

    const parentAfter = await db.branches.get(parent.id);
    expect(parentAfter).toMatchObject({
      taskTotal: 4,
      taskDone: 1,
      commitCount: 3,
      ownLastCommitAt: AT - 2_000,
    });

    const finishes = (await db.events.toArray()).filter(
      (event) => event.action === 'branch.finish',
    );
    expect(finishes).toHaveLength(1);
    expect(finishes[0].payload).toEqual({
      branchId: child.id,
      finishedIntoId: parent.id,
      archived: true,
      movedTaskCount: 2,
    });
    const nonBadgeEvents = (await db.events.toArray()).filter(
      (event) => event.action !== 'badge.grant',
    );
    expect(nonBadgeEvents).toHaveLength(eventsBefore + 1);
  });

  it('选择留在树上时不写 archivedAt，仍为已合并', async () => {
    const deps = makeDeps();
    const { child } = await buildTree(deps);

    const result = await finishBranch({ branchId: child.id, archived: false }, deps);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value).toMatchObject({ status: 'merged', archivedAt: null });
    expect(result.value.finishedIntoId).not.toBeNull();
  });

  it('事件写入失败时待办、提交与分支状态全部回滚', async () => {
    const deps = makeDeps();
    const { parent, child } = await buildTree(deps);
    await db.tasks.add(taskRow({ id: 't-open', branchId: child.id }));
    await db.commits.add(commitRow({ id: 'c-1', branchId: child.id }));
    const eventsBefore = await db.events.count();
    const parentBefore = await db.branches.get(parent.id);

    const result = await finishBranch(
      { branchId: child.id, archived: true },
      {
        ...deps,
        ids: {
          ulid: () => {
            throw new Error('event id failed');
          },
        },
      },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatchObject({ code: 'storage.write_failed', retriable: true });
    }
    expect(await db.branches.get(child.id)).toMatchObject({
      status: 'active',
      finishedAt: null,
      finishedIntoId: null,
      archivedAt: null,
    });
    expect((await db.tasks.get('t-open'))?.branchId).toBe(child.id);
    expect((await db.commits.get('c-1'))?.branchId).toBe(child.id);
    expect(await db.events.count()).toBe(eventsBefore);
    expect(await db.branches.get(parent.id)).toEqual(parentBefore);
  });

  it('父分支不可接收时拒绝收尾且不移动任何行', async () => {
    const deps = makeDeps();
    const { parent, child } = await buildTree(deps);
    await db.tasks.add(taskRow({ id: 't-open', branchId: child.id }));
    await db.branches.update(parent.id, { status: 'dropped', droppedAt: AT });

    const result = await finishBranch({ branchId: child.id, archived: true }, deps);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatchObject({ code: 'domain.readonly_branch', field: 'parentId' });
    }
    expect((await db.tasks.get('t-open'))?.branchId).toBe(child.id);
    expect(await db.branches.get(child.id)).toMatchObject({ status: 'active' });
  });

  it('同一分支再次收尾被拒绝，不产生第二条事件', async () => {
    const deps = makeDeps();
    const { child } = await buildTree(deps);
    const first = await finishBranch({ branchId: child.id, archived: false }, deps);
    expect(first.ok).toBe(true);
    const eventsAfterFirst = await db.events.count();

    const second = await finishBranch({ branchId: child.id, archived: true }, deps);
    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.error.code).toBe('domain.readonly_branch');
    }
    expect(await db.events.count()).toBe(eventsAfterFirst);
  });

  it('存在进行中后代时拒绝收尾', async () => {
    const deps = makeDeps();
    const { child } = await buildTree(deps);
    const grandchild = await createBranch({ title: '1.0', parentId: child.id }, deps);
    if (!grandchild.ok) throw new Error('grandchild');

    const result = await finishBranch({ branchId: child.id, archived: true }, deps);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatchObject({ code: 'domain.conflict', field: 'branchId' });
    }
    expect(await db.branches.get(child.id)).toMatchObject({ status: 'active' });
  });
});

describe('deleteEmptyBranch（R13 / OP-06）', () => {
  it('整棵子树为空时物理删除，不写 events 与 deletedAt', async () => {
    const deps = makeDeps();
    const { parent, child } = await buildTree(deps);
    const eventsBefore = await db.events.count();

    const result = await deleteEmptyBranch({ branchId: child.id }, deps);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({ branchId: child.id, parentId: parent.id });

    expect(await db.branches.get(child.id)).toBeUndefined();
    expect(await db.events.count()).toBe(eventsBefore);
  });

  it('根分支不可删除', async () => {
    const deps = makeDeps();
    const { root } = await buildTree(deps);

    const result = await deleteEmptyBranch({ branchId: root.id }, deps);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('domain.readonly_branch');
    }
    expect(await db.branches.get(root.id)).toBeDefined();
  });

  it('有已取消待办时不可删除', async () => {
    const deps = makeDeps();
    const { child } = await buildTree(deps);
    await db.tasks.add(taskRow({ id: 't-cancelled', branchId: child.id, status: 'cancelled' }));

    const result = await deleteEmptyBranch({ branchId: child.id }, deps);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('domain.conflict');
    }
    expect(await db.branches.get(child.id)).toBeDefined();
  });

  it('最深一层有提交时整棵子树都不可删除', async () => {
    const deps = makeDeps();
    const { child } = await buildTree(deps);
    const grandchild = await createBranch({ title: '1.0', parentId: child.id }, deps);
    if (!grandchild.ok) throw new Error('grandchild');
    await db.commits.add(commitRow({ id: 'c-deep', branchId: grandchild.value.id }));

    const result = await deleteEmptyBranch({ branchId: child.id }, deps);
    expect(result.ok).toBe(false);
    expect(await db.branches.get(child.id)).toBeDefined();
    expect(await db.branches.get(grandchild.value.id)).toBeDefined();
  });

  it('收尾后的分支不可删除（保留为已合并的历史）', async () => {
    const deps = makeDeps();
    const { child } = await buildTree(deps);
    await finishBranch({ branchId: child.id, archived: false }, deps);

    const result = await deleteEmptyBranch({ branchId: child.id }, deps);
    expect(result.ok).toBe(false);
    expect((await db.branches.get(child.id))?.status).toBe('merged');
  });

  it('分支不存在时返回 not_found', async () => {
    const deps = makeDeps();
    await buildTree(deps);

    const result = await deleteEmptyBranch({ branchId: 'missing' }, deps);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('domain.not_found');
    }
  });
});
