import { beforeEach, describe, expect, it } from 'vitest';
import { BULK_IMPORT_MAX } from '@/core/rules/bulk-import';
import { bulkImportTasks } from './bulk-import';
import { db } from './db';
import type { WriteDeps } from './deps';
import { ensureRootBranch } from './ensure-root-branch';

/**
 * 批量导入的单事务一致性（PRD V1-07 §8.2 最值钱回归）。
 *
 * 正常路径断言全部待办、未完成态与四计数一次写全；
 * 回滚用例让第三条的 ID 生成失败，验证不会留下前两条。
 */

const AT = Date.UTC(2026, 10, 21, 8, 42);

function makeDeps(failAt = 0): WriteDeps {
  let seq = 0;
  return {
    clock: { now: () => AT },
    ids: {
      ulid: () => {
        seq += 1;
        if (failAt > 0 && seq === failAt) throw new Error('id failure');
        return `id-${seq}`;
      },
    },
    tzOffset: () => 480,
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

describe('bulkImportTasks（V1-07 / OP-03）', () => {
  it('同一事务创建全部待办，四计数只增 taskTotal', async () => {
    const deps = makeDeps();
    const root = await seed(deps);

    const result = await bulkImportTasks(
      { titles: ['交周报', '写方案', '复盘'], branchId: root.id },
      deps,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.tasks).toHaveLength(3);

    const tasks = await db.tasks.toArray();
    expect(tasks).toHaveLength(3);
    expect(tasks.map((task) => task.status)).toEqual(['open', 'open', 'open']);
    expect(tasks.map((task) => task.dueDate)).toEqual([null, null, null]);
    expect(tasks.map((task) => task.plannedDate)).toEqual([null, null, null]);
    expect(tasks.map((task) => task.branchId)).toEqual([root.id, root.id, root.id]);
    expect(tasks.map((task) => task.title)).toEqual(['交周报', '写方案', '复盘']);
    expect(tasks.map((task) => task.order)).toEqual([1, 2, 3]);

    const branch = await db.branches.get(root.id);
    expect(branch).toMatchObject({
      taskTotal: 3,
      taskDone: 0,
      commitCount: 0,
      ownLastCommitAt: null,
    });

    const creates = (await db.events.toArray()).filter((event) => event.action === 'task.create');
    expect(creates).toHaveLength(3);
    expect(creates.map((event) => event.payload.source)).toEqual(['bulk', 'bulk', 'bulk']);
  });

  it('任一条失败时前几条一并回滚', async () => {
    const deps = makeDeps(4);
    const root = await seed(deps);

    const result = await bulkImportTasks({ titles: ['一', '二', '三'], branchId: root.id }, deps);
    expect(result.ok).toBe(false);

    expect(await db.tasks.count()).toBe(0);
    expect(await db.events.count()).toBe(1);
    const branch = await db.branches.get(root.id);
    expect(branch).toMatchObject({ taskTotal: 0, taskDone: 0 });
  });

  it('非空行超过 200 时拒绝且不写入', async () => {
    const deps = makeDeps();
    const root = await seed(deps);
    const titles = Array.from({ length: BULK_IMPORT_MAX + 1 }, (_, index) => `条目 ${index}`);

    const result = await bulkImportTasks({ titles, branchId: root.id }, deps);
    expect(result.ok).toBe(false);
    expect(await db.tasks.count()).toBe(0);
    expect((await db.branches.get(root.id))?.taskTotal).toBe(0);
  });

  it('目标分支不存在时一条也不写', async () => {
    const deps = makeDeps();
    await seed(deps);

    const result = await bulkImportTasks({ titles: ['一'], branchId: 'missing' }, deps);
    expect(result.ok).toBe(false);
    expect(await db.tasks.count()).toBe(0);
  });

  it('空标题或空批次拒绝写入', async () => {
    const deps = makeDeps();
    const root = await seed(deps);

    expect((await bulkImportTasks({ titles: [], branchId: root.id }, deps)).ok).toBe(false);
    expect((await bulkImportTasks({ titles: ['  '], branchId: root.id }, deps)).ok).toBe(false);
    expect(await db.tasks.count()).toBe(0);
  });
});
