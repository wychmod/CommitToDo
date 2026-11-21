import { beforeEach, describe, expect, it } from 'vitest';
import { completeTask } from './complete-task';
import { createTask } from './create-task';
import { db } from './db';
import type { WriteDeps } from './deps';
import { ensureRootBranch } from './ensure-root-branch';

/**
 * 完成待办的单事务一致性（PRD M03 §8.2 最值钱回归）。
 *
 * 正常路径断言「待办 + 提交 + 四计数 + 事件」一次写全；
 * 回滚用例让事件生成 ID 失败，验证不会留下孤立提交或半更新计数。
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
  return { root: root.value, task: task.value };
}

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('completeTask（R1 / OP-02）', () => {
  it('同一事务写入待办完成态、提交、四计数与事件', async () => {
    const deps = makeDeps();
    const { root, task } = await seed(deps);

    const result = await completeTask({ taskId: task.id }, deps);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const stored = await db.tasks.get(task.id);
    expect(stored).toMatchObject({
      status: 'done',
      completedAt: AT,
      completedCommitId: result.value.commit.id,
    });

    const commits = await db.commits.toArray();
    expect(commits).toHaveLength(1);
    expect(commits[0]).toMatchObject({
      branchId: root.id,
      sourceBranchId: root.id,
      taskId: task.id,
      date: '2026-11-21',
      at: AT,
      summary: '交周报',
      voidedAt: null,
    });

    const branch = await db.branches.get(root.id);
    expect(branch).toMatchObject({
      taskTotal: 1,
      taskDone: 1,
      commitCount: 1,
      ownLastCommitAt: AT,
    });

    const actions = (await db.events.toArray()).map((row) => row.action);
    expect(actions.filter((action) => action === 'task.complete')).toHaveLength(1);
  });

  it('同一待办连点两次只产生一条提交与一条完成事件', async () => {
    const deps = makeDeps();
    const { task } = await seed(deps);

    await completeTask({ taskId: task.id }, deps);
    const second = await completeTask({ taskId: task.id }, deps);

    expect(second.ok).toBe(true);
    expect(await db.commits.count()).toBe(1);
    const completeEvents = (await db.events.toArray()).filter(
      (row) => row.action === 'task.complete',
    );
    expect(completeEvents).toHaveLength(1);
  });

  it('提交写入成功后事件失败，整个事务回滚且不留孤立提交', async () => {
    const seedDeps = makeDeps();
    const { root, task } = await seed(seedDeps);

    let failCount = 0;
    const failingDeps = makeDeps({
      ids: {
        ulid: () => {
          // 第一次生成提交 ID 成功，第二次（事件 ID）失败：
          // 覆盖「提交已写入、后续步骤失败」这一最值钱的不一致路径。
          if (failCount === 0) {
            failCount += 1;
            return 'commit-before-failure';
          }
          throw new Error('id source failed');
        },
      },
    });
    const result = await completeTask({ taskId: task.id }, failingDeps);

    expect(result.ok).toBe(false);
    expect(await db.commits.count()).toBe(0);
    expect(await db.tasks.get(task.id)).toMatchObject({
      status: 'open',
      completedAt: null,
      completedCommitId: null,
    });
    expect(await db.branches.get(root.id)).toMatchObject({
      taskTotal: 1,
      taskDone: 0,
      commitCount: 0,
      ownLastCommitAt: null,
    });
    const completeEvents = (await db.events.toArray()).filter(
      (row) => row.action === 'task.complete',
    );
    expect(completeEvents).toHaveLength(0);
  });

  it('已取消的待办不能完成，也不产生提交', async () => {
    const deps = makeDeps();
    const { task } = await seed(deps);
    await db.tasks.update(task.id, { status: 'cancelled' });

    const result = await completeTask({ taskId: task.id }, deps);
    expect(result.ok).toBe(false);
    expect(await db.commits.count()).toBe(0);
  });

  it('只读分支上的待办不能完成', async () => {
    const deps = makeDeps();
    const { root, task } = await seed(deps);
    await db.branches.update(root.id, { archivedAt: AT });

    const result = await completeTask({ taskId: task.id }, deps);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('domain.readonly_branch');
    }
    expect(await db.commits.count()).toBe(0);
  });
});
