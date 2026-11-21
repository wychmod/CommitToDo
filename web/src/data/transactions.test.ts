import { beforeEach, describe, expect, it } from 'vitest';
import { recountBranch } from '@/core/rules/counters';
import { db } from './db';
import type { Branch, Commit, Task } from './types';

/**
 * Dexie 事务一致性（§2.9 的 db 项目）。
 * 用例自造最小行，验证「提交与四计数在同一事务内写入」以及失败回滚。
 */

const OWNER_ID = 'local';
const BRANCH_ID = 'product-design';
const AT = Date.UTC(2026, 10, 20, 8, 42);

function makeBranch(over: Partial<Branch> = {}): Branch {
  return {
    id: BRANCH_ID,
    ownerId: OWNER_ID,
    parentId: 'work',
    path: '/work/product-design',
    depth: 2,
    title: '产品设计',
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

function makeTask(over: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    ownerId: OWNER_ID,
    branchId: BRANCH_ID,
    title: '完成线框初稿',
    note: null,
    status: 'done',
    dueDate: '2026-11-20',
    plannedDate: '2026-11-20',
    completedAt: AT,
    completedCommitId: 'commit-1',
    cancelledAt: null,
    order: 0,
    rev: 1,
    createdAt: AT,
    updatedAt: AT,
    deletedAt: null,
    ...over,
  };
}

function makeCommit(over: Partial<Commit> = {}): Commit {
  return {
    id: 'commit-1',
    ownerId: OWNER_ID,
    branchId: BRANCH_ID,
    sourceBranchId: BRANCH_ID,
    taskId: 'task-1',
    date: '2026-11-20',
    at: AT,
    summary: '完成线框初稿',
    voidedAt: null,
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
  await db.branches.add(makeBranch());
});

describe('Dexie 事务一致性', () => {
  it('完成待办时，提交与四计数在同一事务内落库', async () => {
    await db.transaction('rw', [db.tasks, db.commits, db.branches, db.outbox], async () => {
      await db.tasks.add(makeTask());
      await db.commits.add(makeCommit());

      const tasks = await db.tasks.where('branchId').equals(BRANCH_ID).toArray();
      const commits = await db.commits.where('branchId').equals(BRANCH_ID).toArray();
      await db.branches.update(BRANCH_ID, recountBranch(BRANCH_ID, tasks, commits));
    });

    const branch = await db.branches.get(BRANCH_ID);
    expect(branch).toMatchObject({
      taskTotal: 1,
      taskDone: 1,
      commitCount: 1,
      ownLastCommitAt: AT,
    });
    expect(await db.commits.count()).toBe(1);
  });

  it('事务中途失败时，提交与计数一起回滚', async () => {
    await expect(
      db.transaction('rw', [db.tasks, db.commits, db.branches, db.outbox], async () => {
        await db.tasks.add(makeTask());
        await db.commits.add(makeCommit());
        await db.branches.update(BRANCH_ID, { taskTotal: 1, taskDone: 1, commitCount: 1 });
        throw new Error('transaction aborted');
      }),
    ).rejects.toThrow('transaction aborted');

    expect(await db.tasks.count()).toBe(0);
    expect(await db.commits.count()).toBe(0);
    expect(await db.branches.get(BRANCH_ID)).toMatchObject({
      taskTotal: 0,
      taskDone: 0,
      commitCount: 0,
    });
  });
});
