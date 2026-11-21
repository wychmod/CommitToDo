import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SAMPLE_ID_PREFIX, SAMPLE_OWNER_ID } from '@/core/rules/sample-tree';
import type { WriteDeps } from './deps';
import { db, LOCAL_OWNER_ID } from './db';
import { clearSampleTree, loadSampleTree } from './sample-namespace';
import type { Branch, Commit, Milestone, Task } from './types';

/**
 * 示例命名空间的隔离与清除（PRD M12 §8.2）。
 *
 * 最值钱的回归是「载入只写示例命名空间、真实业务表行数不变」：
 * 若把示例行直接写进 `ownerId = local`，它们会进入真实分支树、四计数与导出文件，
 * 删除示例时还可能连真实数据一起清掉。
 */

const AT = Date.UTC(2026, 10, 21, 9, 0);

const DEPS: WriteDeps = {
  clock: { now: () => AT },
  ids: { ulid: () => 'gen-1' },
  tzOffset: () => 480,
};

function branchRow(over: Partial<Branch> & Pick<Branch, 'id'>): Branch {
  return {
    ownerId: LOCAL_OWNER_ID,
    parentId: null,
    path: over.id,
    depth: 0,
    title: over.id,
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
    taskTotal: 1,
    taskDone: 0,
    commitCount: 1,
    ownLastCommitAt: AT,
    rev: 1,
    createdAt: AT,
    updatedAt: AT,
    deletedAt: null,
    ...over,
  };
}

function taskRow(over: Partial<Task> & Pick<Task, 'id' | 'branchId'>): Task {
  return {
    ownerId: LOCAL_OWNER_ID,
    title: over.id,
    note: null,
    status: 'open',
    dueDate: null,
    plannedDate: null,
    completedAt: null,
    completedCommitId: null,
    cancelledAt: null,
    order: 0,
    rev: 1,
    createdAt: AT,
    updatedAt: AT,
    deletedAt: null,
    ...over,
  };
}

function commitRow(over: Partial<Commit> & Pick<Commit, 'id' | 'branchId'>): Commit {
  return {
    ownerId: LOCAL_OWNER_ID,
    sourceBranchId: over.branchId,
    taskId: null,
    date: '2026-11-21',
    at: AT,
    summary: over.id,
    voidedAt: null,
    rev: 1,
    createdAt: AT,
    updatedAt: AT,
    deletedAt: null,
    ...over,
  };
}

function milestoneRow(over: Partial<Milestone> & Pick<Milestone, 'id' | 'branchId'>): Milestone {
  return {
    ownerId: LOCAL_OWNER_ID,
    title: over.id,
    note: null,
    achievedAt: AT,
    datePrecision: 'day',
    rev: 1,
    createdAt: AT,
    updatedAt: AT,
    deletedAt: null,
    ...over,
  };
}

async function seedRealData(): Promise<void> {
  await db.branches.add(branchRow({ id: 'real-root' }));
  await db.tasks.add(taskRow({ id: 'real-task', branchId: 'real-root' }));
  await db.commits.add(commitRow({ id: 'real-commit', branchId: 'real-root' }));
  await db.milestones.add(milestoneRow({ id: 'real-milestone', branchId: 'real-root' }));
}

async function sampleCounts(): Promise<{ branches: number; commits: number; milestones: number }> {
  const [branches, commits, milestones] = await Promise.all([
    db.branches.where('ownerId').equals(SAMPLE_OWNER_ID).count(),
    db.commits.where('ownerId').equals(SAMPLE_OWNER_ID).count(),
    db.milestones.where('ownerId').equals(SAMPLE_OWNER_ID).count(),
  ]);
  return { branches, commits, milestones };
}

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('loadSampleTree（M12 OP-05 / OP-06）', () => {
  it('真实表非空时载入，只写示例命名空间，真实行逐行不变', async () => {
    await seedRealData();
    const before = await db.branches.get('real-root');

    const result = await loadSampleTree(DEPS);

    expect(result.ok).toBe(true);
    expect(result.ok && result.value).toEqual({ branches: 4, commits: 10, milestones: 2 });
    expect(await sampleCounts()).toEqual({ branches: 4, commits: 10, milestones: 2 });
    expect(await db.branches.get('real-root')).toEqual(before);
    expect(await db.tasks.count()).toBe(1);
    expect(await db.commits.where('ownerId').equals(LOCAL_OWNER_ID).count()).toBe(1);
    expect(await db.milestones.where('ownerId').equals(LOCAL_OWNER_ID).count()).toBe(1);
    expect(await db.events.count()).toBe(0);
  });

  it('示例 id 全部带命名空间前缀，不会与真实 id 混淆', async () => {
    await seedRealData();
    await loadSampleTree(DEPS);

    const branches = await db.branches.where('ownerId').equals(SAMPLE_OWNER_ID).toArray();

    expect(branches.every((row) => row.id.startsWith(SAMPLE_ID_PREFIX))).toBe(true);
    expect(branches.some((row) => row.id === 'real-root')).toBe(false);
  });

  it('重复载入同一示例不重复写入', async () => {
    await loadSampleTree(DEPS);
    await loadSampleTree(DEPS);

    expect(await sampleCounts()).toEqual({ branches: 4, commits: 10, milestones: 2 });
    expect(await db.branches.count()).toBe(4);
    expect(await db.commits.count()).toBe(10);
    expect(await db.milestones.count()).toBe(2);
    expect(await db.events.count()).toBe(0);
  });

  it('写入中途失败时整体回滚，不残留半载入数据', async () => {
    await loadSampleTree(DEPS);
    const before = await sampleCounts();
    const spy = vi
      .spyOn(db.branches, 'bulkPut')
      .mockImplementationOnce((() => Promise.reject(new Error('boom'))) as never);

    const result = await loadSampleTree(DEPS);
    spy.mockRestore();

    expect(result.ok).toBe(false);
    expect(await sampleCounts()).toEqual(before);
    expect(await db.events.count()).toBe(0);
  });
});

describe('clearSampleTree（M12 OP-07）', () => {
  it('删除示例后示例命名空间为空且真实数据逐行不变', async () => {
    await seedRealData();
    await loadSampleTree(DEPS);
    const before = await db.branches.get('real-root');

    const result = await clearSampleTree();

    expect(result).toEqual({ ok: true, value: true });
    expect(await sampleCounts()).toEqual({ branches: 0, commits: 0, milestones: 0 });
    expect(await db.branches.get('real-root')).toEqual(before);
    expect(await db.tasks.count()).toBe(1);
    expect(await db.commits.count()).toBe(1);
    expect(await db.milestones.count()).toBe(1);
    expect(await db.events.count()).toBe(0);
  });

  it('删除不写 events，删除后再删除仍成功', async () => {
    await loadSampleTree(DEPS);

    await clearSampleTree();
    const again = await clearSampleTree();

    expect(again.ok).toBe(true);
    expect(await db.events.count()).toBe(0);
    expect(await sampleCounts()).toEqual({ branches: 0, commits: 0, milestones: 0 });
  });
});
