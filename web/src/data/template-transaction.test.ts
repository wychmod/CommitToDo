import { beforeEach, describe, expect, it } from 'vitest';
import { applyTemplate, withdrawTemplate } from './apply-template';
import { db, LOCAL_OWNER_ID } from './db';
import type { WriteDeps } from './deps';
import type { Branch, Commit } from './types';

/**
 * 模板生成与撤回的事务一致性（PRD V2-03 OP-07 / OP-09 / OP-11 / §8.2）。
 *
 * 用 Dexie 写入钩子注入失败，验证「不留半棵树」与「撤回失败保持原样」；
 * 只断言库内实际行，不 mock 仓储。
 */

const AT = Date.UTC(2026, 10, 20, 8, 0);

function deps(): WriteDeps {
  let seq = 0;
  return {
    clock: { now: () => AT },
    ids: { ulid: () => `id-${++seq}` },
    tzOffset: () => 480,
  };
}

const rootBranch = (over: Partial<Branch> = {}): Branch => ({
  id: 'root',
  ownerId: LOCAL_OWNER_ID,
  parentId: null,
  path: '',
  depth: 0,
  title: '我',
  goal: null,
  color: 'sky',
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
});

const commitRow = (over: Partial<Commit> = {}): Commit => ({
  id: 'commit-1',
  ownerId: LOCAL_OWNER_ID,
  branchId: 'id-2',
  sourceBranchId: 'id-2',
  taskId: null,
  date: '2026-11-20',
  at: AT,
  summary: '做了一件事',
  voidedAt: null,
  rev: 1,
  createdAt: AT,
  updatedAt: AT,
  deletedAt: null,
  ...over,
});

async function seedRoot(): Promise<void> {
  await db.branches.add(rootBranch());
}

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('模板生成', () => {
  it('空树生成 1 个一级、2 个二级与 4 条待办，并写入计数', async () => {
    await seedRoot();

    const result = await applyTemplate('reading', deps());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const branches = await db.branches.toArray();
    const tasks = await db.tasks.toArray();
    const primary = branches.find((branch) => branch.id === result.value.rootId)!;
    const secondaries = branches.filter((branch) => branch.parentId === primary.id);

    expect(branches).toHaveLength(4);
    expect(primary).toMatchObject({ title: '读书', depth: 1, parentId: 'root', status: 'active' });
    expect(secondaries.map((branch) => branch.title).sort()).toEqual(['读书清单', '读书笔记']);
    expect(secondaries.every((branch) => branch.depth === 2)).toBe(true);
    expect(secondaries.every((branch) => branch.color === primary.color)).toBe(true);
    expect(secondaries.every((branch) => branch.taskTotal === 2)).toBe(true);
    expect(primary.taskTotal).toBe(0);

    expect(tasks).toHaveLength(4);
    expect(tasks.every((task) => task.dueDate === null && task.status === 'open')).toBe(true);
    expect(tasks.every((task) => secondaries.some((branch) => branch.id === task.branchId))).toBe(
      true,
    );

    expect(await db.milestones.count()).toBe(0);
    expect(await db.commits.count()).toBe(0);
    expect(await db.events.count()).toBe(0);
    expect(await db.outbox.count()).toBe(0);
  });

  it('非空树拒绝生成，且不写入任何行', async () => {
    await seedRoot();
    await db.tasks.add({
      id: 'task-1',
      ownerId: LOCAL_OWNER_ID,
      branchId: 'root',
      title: '已有待办',
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
    });

    const result = await applyTemplate('fitness', deps());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('domain.conflict');
    expect(await db.branches.count()).toBe(1);
    expect(await db.tasks.count()).toBe(1);
  });

  it('第二个二级分支写入失败时整棵模板树回滚', async () => {
    await seedRoot();
    const onCreating = (_key: string, obj: Branch) => {
      if (obj.title === '读书笔记') throw new Error('boom');
    };
    db.branches.hook('creating', onCreating);
    try {
      const result = await applyTemplate('reading', deps());
      expect(result.ok).toBe(false);
      expect(await db.branches.count()).toBe(1);
      expect(await db.tasks.count()).toBe(0);
    } finally {
      db.branches.hook('creating').unsubscribe(onCreating);
    }
  });

  it('第四条待办写入失败时整棵模板树回滚', async () => {
    await seedRoot();
    let created = 0;
    const onCreating = () => {
      created += 1;
      if (created === 4) throw new Error('boom');
    };
    db.tasks.hook('creating', onCreating);
    try {
      const result = await applyTemplate('reading', deps());
      expect(result.ok).toBe(false);
      expect(await db.branches.count()).toBe(1);
      expect(await db.tasks.count()).toBe(0);
    } finally {
      db.tasks.hook('creating').unsubscribe(onCreating);
    }
  });
});

describe('模板撤回', () => {
  async function apply(): Promise<string> {
    await seedRoot();
    const applied = await applyTemplate('reading', deps());
    if (!applied.ok) throw new Error(applied.error.code);
    return applied.value.rootId;
  }

  it('无提交时删除整棵模板子树与待办', async () => {
    const rootId = await apply();

    const result = await withdrawTemplate(rootId, deps());
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual({ branches: 3, tasks: 4 });

    const branches = await db.branches.toArray();
    expect(branches).toHaveLength(1);
    expect(branches[0]!.id).toBe('root');
    expect(await db.tasks.count()).toBe(0);
  });

  it('有有效提交时拒绝撤回，树与待办保持原样', async () => {
    const rootId = await apply();
    await db.commits.add(commitRow({ branchId: 'id-2' }));

    const result = await withdrawTemplate(rootId, deps());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('domain.conflict');
    expect(await db.branches.count()).toBe(4);
    expect(await db.tasks.count()).toBe(4);
  });

  it('只有作废提交时可以撤回', async () => {
    const rootId = await apply();
    await db.commits.add(commitRow({ branchId: 'id-2', voidedAt: AT }));

    const result = await withdrawTemplate(rootId, deps());
    expect(result.ok).toBe(true);
    expect(await db.branches.count()).toBe(1);
  });

  it('删除中途失败时树与待办保持原样', async () => {
    const rootId = await apply();
    const onDeleting = (_key: string, obj: Branch) => {
      if (obj.id === 'id-3') throw new Error('boom');
    };
    db.branches.hook('deleting', onDeleting);
    try {
      const result = await withdrawTemplate(rootId, deps());
      expect(result.ok).toBe(false);
      expect(await db.branches.count()).toBe(4);
      expect(await db.tasks.count()).toBe(4);
    } finally {
      db.branches.hook('deleting').unsubscribe(onDeleting);
    }
  });

  it('重复撤回返回未找到，不产生额外删除', async () => {
    const rootId = await apply();
    const first = await withdrawTemplate(rootId, deps());
    const second = await withdrawTemplate(rootId, deps());

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error.code).toBe('domain.not_found');
  });
});
