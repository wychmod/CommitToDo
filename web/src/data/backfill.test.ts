import { beforeEach, describe, expect, it } from 'vitest';
import { normalizeMilestoneAchievedAt } from '@/core/rules/milestone-date';
import { backfillMilestones } from './backfill-milestones';
import { db } from './db';
import type { WriteDeps } from './deps';
import { ensureRootBranch } from './ensure-root-branch';

/**
 * 回填过去的单事务一致性（PRD V1-07 §8.2）。
 *
 * 断言只写月精度里程碑与事件，不产生提交与待办，也不改四计数；
 * 回滚用例让第二条的 ID 生成失败，验证不会只落一条。
 */

const AT = Date.UTC(2026, 10, 21, 8, 42);
const TZ = 480;

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
    tzOffset: () => TZ,
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

describe('backfillMilestones（V1-07 / OP-06）', () => {
  it('同一事务写入月精度里程碑，不生成提交与待办', async () => {
    const deps = makeDeps();
    const root = await seed(deps);

    const result = await backfillMilestones(
      {
        rows: [
          { title: '入职', month: '2023-06', branchId: root.id },
          { title: '搬家', month: '2021-09', branchId: root.id },
        ],
      },
      deps,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.milestones).toHaveLength(2);
    expect(result.value.earliest?.title).toBe('搬家');

    const rows = await db.milestones.toArray();
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.datePrecision)).toEqual(['month', 'month']);
    expect(rows.map((row) => row.note)).toEqual([null, null]);
    expect(rows.map((row) => row.achievedAt)).toEqual([
      normalizeMilestoneAchievedAt('2023-06-01', 'month', TZ),
      normalizeMilestoneAchievedAt('2021-09-01', 'month', TZ),
    ]);

    expect(await db.commits.count()).toBe(0);
    expect(await db.tasks.count()).toBe(0);
    const branch = await db.branches.get(root.id);
    expect(branch).toMatchObject({
      taskTotal: 0,
      taskDone: 0,
      commitCount: 0,
      ownLastCommitAt: null,
    });

    const creates = (await db.events.toArray()).filter(
      (event) => event.action === 'milestone.create',
    );
    expect(creates).toHaveLength(2);
    expect(creates.map((event) => event.payload.source)).toEqual(['backfill', 'backfill']);
  });

  it('首条过去里程碑触发补白徽章，重复回填不再发放', async () => {
    const deps = makeDeps();
    const root = await seed(deps);

    await backfillMilestones(
      { rows: [{ title: '入职', month: '2023-06', branchId: root.id }] },
      deps,
    );
    expect((await db.badges.toArray()).filter((row) => row.catalogId === 'backfill')).toHaveLength(
      1,
    );

    await backfillMilestones(
      { rows: [{ title: '搬家', month: '2021-09', branchId: root.id }] },
      deps,
    );
    expect((await db.badges.toArray()).filter((row) => row.catalogId === 'backfill')).toHaveLength(
      1,
    );
  });

  it('任一条失败时一条也不留', async () => {
    const deps = makeDeps(3);
    const root = await seed(deps);

    const result = await backfillMilestones(
      {
        rows: [
          { title: '入职', month: '2023-06', branchId: root.id },
          { title: '搬家', month: '2021-09', branchId: root.id },
        ],
      },
      deps,
    );
    expect(result.ok).toBe(false);
    expect(await db.milestones.count()).toBe(0);
    expect(await db.events.count()).toBe(1);
    expect((await db.badges.toArray()).filter((row) => row.category === 'time')).toHaveLength(0);
  });

  it('空数组与未来月份拒绝写入', async () => {
    const deps = makeDeps();
    const root = await seed(deps);

    expect((await backfillMilestones({ rows: [] }, deps)).ok).toBe(false);
    expect(
      (
        await backfillMilestones(
          { rows: [{ title: '未来', month: '2026-12', branchId: root.id }] },
          deps,
        )
      ).ok,
    ).toBe(false);
    expect(await db.milestones.count()).toBe(0);
  });

  it('同一月多条都保留', async () => {
    const deps = makeDeps();
    const root = await seed(deps);

    const result = await backfillMilestones(
      {
        rows: [
          { title: '入职', month: '2023-06', branchId: root.id },
          { title: '转正', month: '2023-06', branchId: root.id },
        ],
      },
      deps,
    );
    expect(result.ok).toBe(true);
    expect(await db.milestones.count()).toBe(2);
  });
});
