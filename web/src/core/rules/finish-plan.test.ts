import { describe, expect, it } from 'vitest';
import {
  planFinishMigration,
  type PlanCommit,
  type PlanMilestone,
  type PlanTask,
} from './finish-plan';

const task = (over: Partial<PlanTask> = {}): PlanTask => ({
  id: 'task',
  branchId: 'child',
  status: 'open',
  ...over,
});

const commit = (over: Partial<PlanCommit> = {}): PlanCommit => ({
  id: 'commit',
  branchId: 'child',
  sourceBranchId: 'child',
  at: 1_000,
  voidedAt: null,
  ...over,
});

const milestone = (over: Partial<PlanMilestone> = {}): PlanMilestone => ({
  id: 'milestone',
  branchId: 'child',
  ...over,
});

describe('收尾迁移计划（OP-04 / OP-05）', () => {
  it('未完成待办移入父分支，已完成与已取消留在原分支', () => {
    const plan = planFinishMigration(
      'child',
      [
        task({ id: 'open' }),
        task({ id: 'done', status: 'done' }),
        task({ id: 'cancelled', status: 'cancelled' }),
      ],
      [],
      [],
    );

    expect(plan.movedTasks.map((row) => row.id)).toEqual(['open']);
    expect(plan.stayedTasks.map((row) => row.id)).toEqual(['done', 'cancelled']);
  });

  it('全部待办已完成或已取消时不移走任何待办', () => {
    const plan = planFinishMigration(
      'child',
      [task({ id: 'done', status: 'done' }), task({ id: 'cancelled', status: 'cancelled' })],
      [],
      [],
    );

    expect(plan.movedTasks).toHaveLength(0);
    expect(plan.stayedTasks).toHaveLength(2);
  });

  it('提交迁移保留原始来源，已撤销提交同样迁移但不计入有效', () => {
    const plan = planFinishMigration(
      'child',
      [],
      [
        commit({ id: 'valid' }),
        commit({ id: 'voided', voidedAt: 2_000 }),
        commit({ id: 'other', branchId: 'parent' }),
      ],
      [],
    );

    expect(plan.movedCommits.map((row) => row.id)).toEqual(['valid', 'voided']);
    expect(plan.movedCommits.every((row) => row.sourceBranchId === 'child')).toBe(true);
    expect(plan.effectiveCommitCount).toBe(1);
  });

  it('子分支无提交时迁移列表为空', () => {
    const plan = planFinishMigration('child', [], [], [milestone()]);

    expect(plan.movedCommits).toHaveLength(0);
    expect(plan.effectiveCommitCount).toBe(0);
  });

  it('里程碑留在原分支，不进入迁移列表', () => {
    const plan = planFinishMigration(
      'child',
      [],
      [],
      [milestone({ id: 'm1' }), milestone({ id: 'm2', branchId: 'parent' })],
    );

    expect(plan.milestones).toHaveLength(1);
    expect(plan.milestones[0].branchId).toBe('child');
    expect(plan).not.toHaveProperty('movedMilestones');
  });

  it('软删的待办、提交与里程碑都不参与迁移', () => {
    const plan = planFinishMigration(
      'child',
      [task({ id: 'gone', deletedAt: 1 })],
      [commit({ id: 'gone', deletedAt: 1 })],
      [milestone({ id: 'gone', deletedAt: 1 })],
    );

    expect(plan.movedTasks).toHaveLength(0);
    expect(plan.movedCommits).toHaveLength(0);
    expect(plan.milestones).toHaveLength(0);
  });
});
