import { beforeEach, describe, expect, it } from 'vitest';
import { bulkImportTasks } from './bulk-import';
import { createBranch } from './create-branch';
import { db } from './db';
import type { WriteDeps } from './deps';
import { ensureRootBranch } from './ensure-root-branch';
import { reorderBranches, reorderTasks, setBranchPinned, type ReorderDeps } from './reorder';

const AT = Date.UTC(2026, 10, 21, 8, 42);
const TODAY = '2026-11-21';

function makeDeps(failAfterWrites?: number): ReorderDeps {
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
    failAfterWrites,
  };
}

async function seed(deps: WriteDeps) {
  const root = await ensureRootBranch(deps);
  if (!root.ok) throw new Error('root creation failed');
  return root.value;
}

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('reorderTasks（V1-08 / OP-01）', () => {
  it('把组内 order 重写为 1..n，四计数不变', async () => {
    const deps = makeDeps();
    const root = await seed(deps);
    const imported = await bulkImportTasks({ titles: ['一', '二', '三'], branchId: root.id }, deps);
    if (!imported.ok) throw new Error('import failed');
    const ids = imported.value.tasks.map((task) => task.id);
    const before = await db.branches.get(root.id);

    const result = await reorderTasks(
      { groupKey: 'noDue', orderedIds: [ids[2]!, ids[0]!, ids[1]!], todayDate: TODAY },
      deps,
    );
    expect(result.ok).toBe(true);

    const rows = await Promise.all(ids.map((id) => db.tasks.get(id)));
    expect(rows.map((row) => row?.order)).toEqual([2, 3, 1]);
    const after = await db.branches.get(root.id);
    expect(after).toMatchObject({
      taskTotal: before?.taskTotal,
      taskDone: before?.taskDone,
      commitCount: before?.commitCount,
    });
  });

  it('跨组请求整批拒绝，order 不变', async () => {
    const deps = makeDeps();
    const root = await seed(deps);
    const imported = await bulkImportTasks({ titles: ['一', '二'], branchId: root.id }, deps);
    if (!imported.ok) throw new Error('import failed');
    const ids = imported.value.tasks.map((task) => task.id);
    await db.tasks.update(ids[1]!, { dueDate: TODAY });

    const result = await reorderTasks(
      { groupKey: 'noDue', orderedIds: [ids[1]!, ids[0]!], todayDate: TODAY },
      deps,
    );
    expect(result.ok).toBe(false);
    const rows = await Promise.all(ids.map((id) => db.tasks.get(id)));
    expect(rows.map((row) => row?.order)).toEqual([1, 2]);
  });

  it('写到一半失败时整批回滚', async () => {
    const deps = makeDeps(2);
    const root = await seed(deps);
    const imported = await bulkImportTasks({ titles: ['一', '二', '三'], branchId: root.id }, deps);
    if (!imported.ok) throw new Error('import failed');
    const ids = imported.value.tasks.map((task) => task.id);

    const result = await reorderTasks(
      { groupKey: 'noDue', orderedIds: [ids[2]!, ids[1]!, ids[0]!], todayDate: TODAY },
      deps,
    );
    expect(result.ok).toBe(false);
    const rows = await Promise.all(ids.map((id) => db.tasks.get(id)));
    expect(rows.map((row) => row?.order)).toEqual([1, 2, 3]);
  });
});

describe('reorderBranches 与置顶（V1-08 / OP-04 / OP-07）', () => {
  it('同父兄弟写入 1..n', async () => {
    const deps = makeDeps();
    const root = await seed(deps);
    const first = await createBranch({ title: '工作', parentId: root.id }, deps);
    const second = await createBranch({ title: '生活', parentId: root.id }, deps);
    if (!first.ok || !second.ok) throw new Error('branch creation failed');

    const result = await reorderBranches(
      { parentId: root.id, orderedIds: [second.value.id, first.value.id] },
      deps,
    );
    expect(result.ok).toBe(true);
    expect((await db.branches.get(second.value.id))?.order).toBe(1);
    expect((await db.branches.get(first.value.id))?.order).toBe(2);
  });

  it('跨父请求整批拒绝', async () => {
    const deps = makeDeps();
    const root = await seed(deps);
    const first = await createBranch({ title: '工作', parentId: root.id }, deps);
    const second = await createBranch({ title: '生活', parentId: root.id }, deps);
    if (!first.ok || !second.ok) throw new Error('branch creation failed');
    const child = await createBranch({ title: '子项', parentId: first.value.id }, deps);
    if (!child.ok) throw new Error('child creation failed');

    const result = await reorderBranches(
      { parentId: root.id, orderedIds: [second.value.id, child.value.id] },
      deps,
    );
    expect(result.ok).toBe(false);
    expect((await db.branches.get(first.value.id))?.order).toBe(1);
  });

  it('写到一半失败时整批回滚', async () => {
    const deps = makeDeps(1);
    const root = await seed(deps);
    const first = await createBranch({ title: '工作', parentId: root.id }, deps);
    const second = await createBranch({ title: '生活', parentId: root.id }, deps);
    if (!first.ok || !second.ok) throw new Error('branch creation failed');

    const result = await reorderBranches(
      { parentId: root.id, orderedIds: [second.value.id, first.value.id] },
      deps,
    );
    expect(result.ok).toBe(false);
    expect((await db.branches.get(first.value.id))?.order).toBe(1);
    expect((await db.branches.get(second.value.id))?.order).toBe(2);
  });

  it('置顶只改 pinnedAt，取消后 order 保留', async () => {
    const deps = makeDeps();
    const root = await seed(deps);
    const branch = await createBranch({ title: '工作', parentId: root.id }, deps);
    if (!branch.ok) throw new Error('branch creation failed');
    const before = branch.value.order;

    const pinned = await setBranchPinned({ branchId: branch.value.id, pinned: true }, deps);
    expect(pinned.ok).toBe(true);
    if (!pinned.ok) return;
    expect(pinned.value.pinnedAt).toBe(AT);
    expect(pinned.value.order).toBe(before);

    const unpinned = await setBranchPinned({ branchId: branch.value.id, pinned: false }, deps);
    expect(unpinned.ok).toBe(true);
    if (!unpinned.ok) return;
    expect(unpinned.value.pinnedAt).toBeNull();
    expect(unpinned.value.order).toBe(before);
  });

  it('根分支与归档分支不可置顶', async () => {
    const deps = makeDeps();
    const root = await seed(deps);
    const branch = await createBranch({ title: '工作', parentId: root.id }, deps);
    if (!branch.ok) throw new Error('branch creation failed');

    expect((await setBranchPinned({ branchId: root.id, pinned: true }, deps)).ok).toBe(false);
    await db.branches.update(branch.value.id, { archivedAt: AT });
    expect((await setBranchPinned({ branchId: branch.value.id, pinned: true }, deps)).ok).toBe(
      false,
    );
  });
});
