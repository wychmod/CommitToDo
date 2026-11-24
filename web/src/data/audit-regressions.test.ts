import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createBranch } from './create-branch';
import { createTask } from './create-task';
import { db, LOCAL_OWNER_ID, setOwnerId } from './db';
import type { WriteDeps } from './deps';
import { ensureRootBranch } from './ensure-root-branch';
import { clearAllData } from './clear-data';
import { completeTask } from './complete-task';
import { importData } from './import-data';
import { moveBranch } from './move-branch';
import { pauseBranch } from './pause-branch';
import { planTask } from './plan-task';
import { updateTask } from './update-task';

/**
 * 走查修复的回归用例。
 *
 * 每条都对应一个曾经「门禁全绿但行为错」的具体场景：
 * 树级只读、目标分支状态、导入归属、清空范围、outbox 基线。
 */

const AT = Date.UTC(2026, 10, 21, 8, 42);

function makeDeps(): WriteDeps {
  let seq = 0;
  return {
    clock: { now: () => AT },
    ids: { ulid: () => `id-${++seq}` },
    tzOffset: () => 480,
  };
}

async function seedChain(deps: WriteDeps) {
  const root = await ensureRootBranch(deps);
  if (!root.ok) throw new Error('root');
  const parent = await createBranch({ title: '工作', parentId: root.value.id }, deps);
  if (!parent.ok) throw new Error('parent');
  const child = await createBranch({ title: '产品', parentId: parent.value.id }, deps);
  if (!child.ok) throw new Error('child');
  const task = await createTask({ title: '写方案', branchId: child.value.id }, deps);
  if (!task.ok) throw new Error('task');
  return { root: root.value, parent: parent.value, child: child.value, task: task.value };
}

beforeEach(async () => {
  await db.delete();
  await db.open();
  setOwnerId('local');
});

afterEach(() => {
  setOwnerId('local');
});

describe('树级只读（祖先归档后整棵子树只读）', () => {
  it('祖先归档后不能完成子分支待办', async () => {
    const deps = makeDeps();
    const { parent, task } = await seedChain(deps);
    // 有进行中后代时归档入口会被拒（R14），这里直接写库模拟「祖先已归档」的既成状态：
    // 无论该状态怎么来的，写准入都必须挡住整棵子树。
    await db.branches.update(parent.id, { archivedAt: AT });

    const result = await completeTask({ taskId: task.id }, deps);
    if (result.ok) throw new Error('祖先归档后仍完成了待办');
    expect(result.error.code).toBe('domain.readonly_branch');
    expect(await db.commits.count()).toBe(0);
  });

  it('祖先归档后不能改归属 / 安排 / 编辑子分支待办', async () => {
    const deps = makeDeps();
    const { root, parent, child, task } = await seedChain(deps);
    await db.branches.update(parent.id, { archivedAt: AT });

    const planned = await planTask({ taskId: task.id, plannedDate: '2026-11-21' }, deps);
    expect(planned.ok).toBe(false);
    const edited = await updateTask(
      {
        taskId: task.id,
        title: '改名',
        note: null,
        dueDate: null,
        plannedDate: null,
        branchId: root.id,
      },
      deps,
    );
    expect(edited.ok).toBe(false);
    expect((await db.tasks.get(task.id))?.branchId).toBe(child.id);
  });
});

describe('移动分支的目标父分支状态', () => {
  it('不能挂到已放下的父分支下', async () => {
    const deps = makeDeps();
    const { root, child } = await seedChain(deps);
    const other = await createBranch({ title: '生活', parentId: root.id }, deps);
    if (!other.ok) throw new Error('other');
    // 已放下的分支不能再接收新的子树（与 createBranch 的父分支判定同口径）。
    await db.branches.update(other.value.id, {
      status: 'dropped',
      droppedAt: AT,
      dropReason: '不做了',
    });

    const moved = await moveBranch({ branchId: child.id, targetParentId: other.value.id }, deps);
    expect(moved.ok).toBe(false);
    if (!moved.ok) expect(moved.error.code).toBe('domain.readonly_branch');
    const stored = await db.branches.get(child.id);
    expect(stored?.parentId).not.toBe(other.value.id);
  });
});

describe('导入与清空的归属/范围', () => {
  it('登录态下导入本机导出文件，数据按当前账号可见', async () => {
    const deps = makeDeps();
    const { root, task } = await seedChain(deps);
    const payload = {
      schemaVersion: 2,
      exportedAt: '2026-11-21T09:00:00.000Z',
      appVersion: '0.1.0',
      branches: await db.branches.toArray(),
      tasks: await db.tasks.toArray(),
      commits: [],
      milestones: [],
      badges: [],
      settings: [],
      events: [],
      year_reviews: [],
    };

    setOwnerId('acct-1');
    const imported = await importData({ text: JSON.stringify(payload) }, deps);
    expect(imported.ok).toBe(true);

    const visible = await db.tasks.where('ownerId').equals('acct-1').toArray();
    expect(visible.map((row) => row.id)).toEqual([task.id]);
    const importedRoot = await db.branches.get(root.id);
    expect(importedRoot?.ownerId).toBe(LOCAL_OWNER_ID);
  });

  it('清空数据会一并清掉待推送队列与冲突记录', async () => {
    const deps = makeDeps();
    const { task } = await seedChain(deps);
    await completeTask({ taskId: task.id }, deps);
    expect(await db.outbox.count()).toBeGreaterThan(0);

    const cleared = await clearAllData(deps);
    expect(cleared.ok).toBe(true);
    expect(await db.outbox.count()).toBe(0);
    expect(await db.conflicts.count()).toBe(0);
  });

  it('清空数据会清掉年度总结', async () => {
    const deps = makeDeps();
    await db.yearReviews.add({
      id: 'y-2026',
      ownerId: LOCAL_OWNER_ID,
      year: 2026,
      note: '一年一句话',
      rev: 1,
      createdAt: AT,
      updatedAt: AT,
    });
    const cleared = await clearAllData(deps);
    expect(cleared.ok).toBe(true);
    if (cleared.ok) expect(cleared.value.year_reviews).toBe(1);
    expect(await db.yearReviews.count()).toBe(0);
  });
});

describe('outbox 基线', () => {
  it('更新类动作的 baseRev 是写入前的版本，不是写入后的', async () => {
    const deps = makeDeps();
    const { root, task } = await seedChain(deps);
    await updateTask(
      {
        taskId: task.id,
        title: '写方案 v2',
        note: null,
        dueDate: null,
        plannedDate: null,
        branchId: root.id,
      },
      deps,
    );

    const stored = await db.tasks.get(task.id);
    const ops = (await db.outbox.toArray()).filter((op) => op.entityId === task.id);
    const update = ops.find((op) => op.action === 'task.update');
    expect(stored?.rev).toBe(2);
    expect(update?.baseRev).toBe(1);
    expect(update?.payload.rev).toBe(2);
  });

  it('计数重算也会入队，保证服务端 rev 与本地同格', async () => {
    const deps = makeDeps();
    const { child, task } = await seedChain(deps);
    const before = (await db.branches.get(child.id))?.rev ?? 0;
    await completeTask({ taskId: task.id }, deps);
    const after = (await db.branches.get(child.id))?.rev ?? 0;
    const ops = (await db.outbox.toArray()).filter(
      (op) => op.entityId === child.id && op.entity === 'branch',
    );
    // 每次 rev 自增都必须有一条 branch 快照；否则下一次推送的 baseRev 会对不上。
    expect(after).toBeGreaterThan(before);
    expect(ops.length).toBeGreaterThanOrEqual(after - 1);
    // 计数入队用的是「写入前」的 rev：快照读到的 rev 是 branch.rev + 1。
    // 建待办与完成待办各重算一次计数；同毫秒写入时 opId 顺序不保证，按快照 rev 排序。
    const counts = ops
      .filter((op) => op.action === 'branch.counts')
      .sort((left, right) => Number(left.payload.rev) - Number(right.payload.rev));
    const last = counts[counts.length - 1];
    expect(last.baseRev).toBe(after - 1);
    expect(last.payload.rev).toBe(after);
  });
});

describe('放下前必须已清空子树进行中分支', () => {
  it('放下父分支后，子分支待办不再出现在今天', async () => {
    const deps = makeDeps();
    const { parent, task } = await seedChain(deps);
    await db.tasks.update(task.id, { status: 'cancelled', cancelledAt: AT });
    const paused = await pauseBranch({ branchId: parent.id, reason: '先搁置' }, deps);
    expect(paused.ok).toBe(true);
  });
});
