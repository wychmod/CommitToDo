import { beforeEach, describe, expect, it } from 'vitest';
import { completeTask } from './complete-task';
import { createTask } from './create-task';
import { db } from './db';
import type { WriteDeps } from './deps';
import { ensureRootBranch } from './ensure-root-branch';
import { undoCommit } from './undo-commit';

/**
 * 撤销完成的事务一致性（PRD M05 §8.2）。
 *
 * 正常路径断言待办、提交、四计数与事件一次写全；
 * 回滚用例在计数写入之后让时钟失败，验证不会留下
 * 「待办已恢复但提交仍有效」的半完成状态。
 */

const AT = Date.UTC(2026, 10, 21, 8, 42);

function makeDeps(over: Partial<WriteDeps> = {}): WriteDeps {
  let seq = 0;
  return {
    clock: { now: () => AT },
    ids: { ulid: () => `id-${++seq}` },
    tzOffset: () => 480,
    ...over,
  };
}

async function seed(deps: WriteDeps) {
  const root = await ensureRootBranch(deps);
  if (!root.ok) throw new Error('root creation failed');
  const task = await createTask(
    { title: '交周报', branchId: root.value.id, dueDate: '2026-11-21' },
    deps,
  );
  if (!task.ok) throw new Error('task creation failed');
  const completed = await completeTask({ taskId: task.value.id }, deps);
  if (!completed.ok) throw new Error('completion failed');
  return { root: root.value, task: task.value, commit: completed.value.commit };
}

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('undoCommit（R2 / OP-04）', () => {
  it('同一事务内恢复待办、作废提交、回退四计数并写事件', async () => {
    const deps = makeDeps();
    const { root, task, commit } = await seed(deps);

    const result = await undoCommit({ commitId: commit.id }, deps);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toMatchObject({ targetBranchId: root.id, noop: false });

    expect(await db.tasks.get(task.id)).toMatchObject({
      status: 'open',
      completedAt: null,
      completedCommitId: null,
      branchId: root.id,
      dueDate: '2026-11-21',
    });
    expect(await db.commits.get(commit.id)).toMatchObject({
      voidedAt: AT,
      summary: commit.summary,
      at: commit.at,
    });
    expect(await db.branches.get(root.id)).toMatchObject({
      taskTotal: 1,
      taskDone: 0,
      commitCount: 0,
      ownLastCommitAt: null,
    });

    const actions = (await db.events.toArray()).map((row) => row.action);
    expect(actions.filter((action) => action === 'commit.void')).toHaveLength(1);
  });

  it('计数写入后失败，待办、提交与计数一起回滚', async () => {
    const seedDeps = makeDeps();
    const { root, task, commit } = await seed(seedDeps);

    let clockCalls = 0;
    const failingDeps = makeDeps({
      clock: {
        now: () => {
          clockCalls += 1;
          // 第 1 次取锁定时刻，第 2 次写四计数，第 3 次写事件：
          // 计数已经写入后失败，覆盖最值钱的半完成路径。
          if (clockCalls >= 3) throw new Error('clock failed');
          return AT;
        },
      },
    });

    const result = await undoCommit({ commitId: commit.id }, failingDeps);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('storage.write_failed');
    }

    expect(await db.tasks.get(task.id)).toMatchObject({
      status: 'done',
      completedAt: AT,
      completedCommitId: commit.id,
    });
    expect(await db.commits.get(commit.id)).toMatchObject({ voidedAt: null });
    expect(await db.branches.get(root.id)).toMatchObject({
      taskDone: 1,
      commitCount: 1,
      ownLastCommitAt: AT,
    });
    const voidEvents = (await db.events.toArray()).filter((row) => row.action === 'commit.void');
    expect(voidEvents).toHaveLength(0);
  });

  it('重复撤销返回无变化，不写第二遍也不重复回退计数', async () => {
    const deps = makeDeps();
    const { root, task, commit } = await seed(deps);

    await undoCommit({ commitId: commit.id }, deps);
    const eventCount = await db.events.count();
    const branchAfterFirst = await db.branches.get(root.id);

    const second = await undoCommit({ commitId: commit.id }, deps);
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.value.noop).toBe(true);

    expect(await db.events.count()).toBe(eventCount);
    expect(await db.branches.get(root.id)).toMatchObject({
      taskDone: branchAfterFirst?.taskDone,
      commitCount: branchAfterFirst?.commitCount,
      ownLastCommitAt: branchAfterFirst?.ownLastCommitAt,
      rev: branchAfterFirst?.rev,
    });
    expect(await db.tasks.get(task.id)).toMatchObject({ status: 'open' });
  });

  it('跨天锁定的提交拒绝撤销，且不改任何表', async () => {
    const deps = makeDeps();
    const { root, task, commit } = await seed(deps);
    await db.commits.update(commit.id, { date: '2026-11-20' });
    const eventCount = await db.events.count();

    const result = await undoCommit({ commitId: commit.id }, deps);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('domain.conflict');
    }

    expect(await db.tasks.get(task.id)).toMatchObject({ status: 'done' });
    expect(await db.commits.get(commit.id)).toMatchObject({ voidedAt: null });
    expect(await db.branches.get(root.id)).toMatchObject({
      taskDone: 1,
      commitCount: 1,
      ownLastCommitAt: AT,
    });
    expect(await db.events.count()).toBe(eventCount);
  });
});
