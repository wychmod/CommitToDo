import { beforeEach, describe, expect, it } from 'vitest';
import type { WriteDeps } from './deps';
import { db } from './db';
import { createBranch } from './create-branch';
import { ensureRootBranch } from './ensure-root-branch';
import { moveBranch } from './move-branch';
import { renameBranch } from './rename-branch';

/**
 * 分支写路径的事务一致性（PRD M02 §8.2）。
 *
 * 每条用例都在真实 Dexie（fake-indexeddb）里跑：断言库内路径、层级、rev 与事件条数，
 * 不用 mock 仓储；回滚用例让事件写入抛错，验证分支不会被写进库。
 */

const AT = Date.UTC(2026, 10, 20, 9, 0);

function makeDeps(over: Partial<WriteDeps> = {}): WriteDeps {
  let seq = 0;
  return {
    clock: { now: () => AT },
    ids: { ulid: () => `id-${++seq}` },
    tzOffset: () => 480,
    ...over,
  };
}

async function withRoot(deps: WriteDeps) {
  const result = await ensureRootBranch(deps);
  if (!result.ok) throw new Error('root creation failed');
  return result.value;
}

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('ensureRootBranch（OP-01）', () => {
  it('首次进入创建根，重复调用不产生第二条', async () => {
    const deps = makeDeps();
    const first = await withRoot(deps);
    const second = await withRoot(deps);

    expect(second.id).toBe(first.id);
    expect(await db.branches.count()).toBe(1);
    expect(first).toMatchObject({ title: '我', depth: 0, path: '/', parentId: null });
    expect(await db.events.count()).toBe(1);
  });

  it('事件写失败时根分支不落库', async () => {
    const result = await ensureRootBranch(
      makeDeps({
        ids: {
          ulid: () => {
            throw new Error('id source failed');
          },
        },
      }),
    );
    expect(result.ok).toBe(false);
    expect(await db.branches.count()).toBe(0);
  });
});

describe('createBranch（B02 / B03）', () => {
  it('一级分支挂在根下，路径与深度正确，并记一条 branch.create', async () => {
    const deps = makeDeps();
    const root = await withRoot(deps);
    const result = await createBranch({ title: ' 工作 ', parentId: root.id, color: 'coral' }, deps);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value).toMatchObject({
      title: '工作',
      parentId: root.id,
      depth: 1,
      path: `/${result.value.id}/`,
      color: 'coral',
      status: 'active',
      rev: 1,
      createdAt: AT,
    });

    const events = await db.events.toArray();
    expect(events.filter((event) => event.action === 'branch.create')).toHaveLength(2);
  });

  it('子分支继承父色相，且不能自己指定一级色相', async () => {
    const deps = makeDeps();
    const root = await withRoot(deps);
    const parent = await createBranch({ title: '工作', parentId: root.id, color: 'iris' }, deps);
    if (!parent.ok) throw new Error('parent creation failed');

    const child = await createBranch(
      { title: '产品', parentId: parent.value.id, color: 'rose' },
      deps,
    );
    expect(child.ok).toBe(true);
    if (!child.ok) return;
    expect(child.value.color).toBe('iris');
    expect(child.value.depth).toBe(2);
    expect(child.value.path).toBe(`${parent.value.path}${child.value.id}/`);
  });

  it('同级重名被拒（已归档的同级也参与查重）', async () => {
    const deps = makeDeps();
    const root = await withRoot(deps);
    const first = await createBranch({ title: '工作', parentId: root.id }, deps);
    if (!first.ok) throw new Error('creation failed');

    await db.branches.update(first.value.id, { archivedAt: AT });
    const again = await createBranch({ title: ' 工作 ', parentId: root.id }, deps);

    expect(again.ok).toBe(false);
    if (!again.ok) {
      expect(again.error).toMatchObject({ code: 'domain.conflict', field: 'title' });
    }
    expect(await db.branches.count()).toBe(2);
  });

  it('根下第 8 条被拒且不写库', async () => {
    const deps = makeDeps();
    const root = await withRoot(deps);
    for (let index = 1; index <= 7; index += 1) {
      const result = await createBranch({ title: `分支 ${index}`, parentId: root.id }, deps);
      expect(result.ok).toBe(true);
    }

    const overflow = await createBranch({ title: '分支 8', parentId: root.id }, deps);
    expect(overflow.ok).toBe(false);
    if (!overflow.ok) {
      expect(overflow.error).toMatchObject({
        code: 'domain.quota_exceeded',
        field: 'parentId',
      });
    }
    expect(await db.branches.count()).toBe(8);
  });

  it('超过 3 层不能再建子分支', async () => {
    const deps = makeDeps();
    const root = await withRoot(deps);
    const l1 = await createBranch({ title: 'L1', parentId: root.id }, deps);
    if (!l1.ok) throw new Error('l1');
    const l2 = await createBranch({ title: 'L2', parentId: l1.value.id }, deps);
    if (!l2.ok) throw new Error('l2');
    const l3 = await createBranch({ title: 'L3', parentId: l2.value.id }, deps);
    if (!l3.ok) throw new Error('l3');

    const overflow = await createBranch({ title: 'L4', parentId: l3.value.id }, deps);
    expect(overflow.ok).toBe(false);
    expect(await db.branches.count()).toBe(4);
  });

  it('事件写失败时新建分支回滚', async () => {
    const rootDeps = makeDeps();
    const root = await withRoot(rootDeps);
    const result = await createBranch(
      { title: '工作', parentId: root.id },
      makeDeps({
        ids: {
          ulid: () => {
            throw new Error('id source failed');
          },
        },
      }),
    );
    expect(result.ok).toBe(false);
    expect(await db.branches.count()).toBe(1);
  });
});

describe('renameBranch（B04）', () => {
  it('改名保留路径与父子关系，rev 递增并记 branch.rename', async () => {
    const deps = makeDeps();
    const root = await withRoot(deps);
    const created = await createBranch({ title: '旧名', parentId: root.id }, deps);
    if (!created.ok) throw new Error('creation failed');

    const renamed = await renameBranch({ branchId: created.value.id, title: ' 新名 ' }, deps);
    expect(renamed.ok).toBe(true);
    if (!renamed.ok) return;

    expect(renamed.value).toMatchObject({
      title: '新名',
      path: created.value.path,
      parentId: root.id,
      depth: 1,
      rev: 2,
    });

    const event = (await db.events.toArray()).find((row) => row.action === 'branch.rename');
    expect(event?.payload).toEqual({ branchId: created.value.id, from: '旧名', to: '新名' });
  });

  it('改成同级已有的名字被拒', async () => {
    const deps = makeDeps();
    const root = await withRoot(deps);
    await createBranch({ title: '工作', parentId: root.id }, deps);
    const life = await createBranch({ title: '生活', parentId: root.id }, deps);
    if (!life.ok) throw new Error('creation failed');

    const renamed = await renameBranch({ branchId: life.value.id, title: '工作' }, deps);
    expect(renamed.ok).toBe(false);
    if (!renamed.ok) {
      expect(renamed.error).toMatchObject({ code: 'domain.conflict', field: 'title' });
    }
  });

  it('已合并分支只读，不允许改名', async () => {
    const deps = makeDeps();
    const root = await withRoot(deps);
    const branch = await createBranch({ title: '工作', parentId: root.id }, deps);
    if (!branch.ok) throw new Error('creation failed');
    await db.branches.update(branch.value.id, { status: 'merged', finishedAt: AT });

    const renamed = await renameBranch({ branchId: branch.value.id, title: '新名' }, deps);
    expect(renamed.ok).toBe(false);
    if (!renamed.ok) {
      expect(renamed.error.code).toBe('domain.readonly_branch');
    }
  });

  it('名称未变化时不写库、不记事件', async () => {
    const deps = makeDeps();
    const root = await withRoot(deps);
    const branch = await createBranch({ title: '工作', parentId: root.id }, deps);
    if (!branch.ok) throw new Error('creation failed');
    const before = await db.events.count();

    const renamed = await renameBranch({ branchId: branch.value.id, title: ' 工作 ' }, deps);
    expect(renamed.ok).toBe(true);
    if (!renamed.ok) return;
    expect(renamed.value.rev).toBe(1);
    expect(await db.events.count()).toBe(before);
  });
});

describe('moveBranch（B05 / R16）', () => {
  async function buildTree() {
    const deps = makeDeps();
    const root = await withRoot(deps);
    const x = await createBranch({ title: 'X', parentId: root.id }, deps);
    const a = await createBranch({ title: 'A', parentId: root.id }, deps);
    if (!x.ok || !a.ok) throw new Error('tree setup failed');
    const b = await createBranch({ title: 'B', parentId: a.value.id }, deps);
    if (!b.ok) throw new Error('b');
    return { deps, root, x: x.value, a: a.value, b: b.value };
  }

  it('移动子树逐行改写 path 与 depth，只记一条 branch.move', async () => {
    const { deps, x, a, b } = await buildTree();

    const result = await moveBranch({ branchId: a.id, targetParentId: x.id }, deps);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value).toMatchObject({
      parentId: x.id,
      depth: 2,
      path: `${x.path}${a.id}/`,
    });

    const movedB = await db.branches.get(b.id);
    expect(movedB).toMatchObject({
      depth: 3,
      path: `${x.path}${a.id}/${b.id}/`,
    });

    const moves = (await db.events.toArray()).filter((event) => event.action === 'branch.move');
    expect(moves).toHaveLength(1);
    expect(moves[0].payload).toEqual({
      branchId: a.id,
      fromParentId: a.parentId,
      toParentId: x.id,
      movedCount: 2,
    });
  });

  it('目标是自身或后代时拒绝', async () => {
    const { deps, a, b } = await buildTree();
    const self = await moveBranch({ branchId: a.id, targetParentId: a.id }, deps);
    const descendant = await moveBranch({ branchId: a.id, targetParentId: b.id }, deps);
    expect(self.ok).toBe(false);
    expect(descendant.ok).toBe(false);
    expect((await db.branches.get(a.id))?.path).toBe(a.path);
  });

  it('移动后超过 3 层被拒绝', async () => {
    const { deps, root, a, b } = await buildTree();
    // 新建一个 L2 目标，A 带 B 移过去会让 B 到第 4 层。
    const l1 = await createBranch({ title: 'Y', parentId: root.id }, deps);
    if (!l1.ok) throw new Error('y');
    const l2 = await createBranch({ title: 'Y1', parentId: l1.value.id }, deps);
    if (!l2.ok) throw new Error('y1');

    const result = await moveBranch({ branchId: a.id, targetParentId: l2.value.id }, deps);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('domain.quota_exceeded');
    }
    expect((await db.branches.get(a.id))?.path).toBe(a.path);
    expect((await db.branches.get(b.id))?.path).toBe(b.path);
  });

  it('目标父分支下已有同名分支时拒绝', async () => {
    const { deps, root, x, a } = await buildTree();
    await createBranch({ title: 'A', parentId: x.id }, deps);

    const result = await moveBranch({ branchId: a.id, targetParentId: x.id }, deps);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatchObject({ code: 'domain.conflict', field: 'title' });
    }
    expect(await db.branches.get(a.id)).toMatchObject({ parentId: root.id });
  });

  it('12 个节点的子树合并成 1 条事件', async () => {
    const deps = makeDeps();
    const root = await withRoot(deps);
    const x = await createBranch({ title: 'X', parentId: root.id }, deps);
    const a = await createBranch({ title: 'A', parentId: root.id }, deps);
    if (!x.ok || !a.ok) throw new Error('setup');
    const b = await createBranch({ title: 'B', parentId: a.value.id }, deps);
    if (!b.ok) throw new Error('b');
    for (let index = 1; index <= 11; index += 1) {
      const leaf = await createBranch({ title: `C${index}`, parentId: b.value.id }, deps);
      expect(leaf.ok).toBe(true);
    }
    // B 自身 + 11 个 L3 子分支 = 12 个节点。
    const beforeCount = await db.events.count();

    const result = await moveBranch({ branchId: b.value.id, targetParentId: x.value.id }, deps);
    expect(result.ok).toBe(true);

    const moves = (await db.events.toArray()).filter((event) => event.action === 'branch.move');
    expect(moves).toHaveLength(1);
    expect(moves[0].payload).toMatchObject({ movedCount: 12 });
    expect(await db.events.count()).toBe(beforeCount + 1);

    const children = await db.branches.where('parentId').equals(b.value.id).toArray();
    expect(children).toHaveLength(11);
    for (const child of children) {
      expect(child.depth).toBe(3);
      expect(child.path.startsWith(`/${x.value.id}/${b.value.id}/`)).toBe(true);
    }
  });

  it('子树写入后事件失败则整体回滚', async () => {
    const { deps, root, x, a, b } = await buildTree();
    const beforeEvents = await db.events.count();

    const result = await moveBranch(
      { branchId: a.id, targetParentId: x.id },
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

    expect((await db.branches.get(a.id))?.path).toBe(a.path);
    expect((await db.branches.get(b.id))?.path).toBe(b.path);
    expect((await db.branches.get(b.id))?.depth).toBe(2);
    expect(await db.events.count()).toBe(beforeEvents);
    expect(await db.branches.get(a.id)).toMatchObject({ parentId: root.id });
  });
});
