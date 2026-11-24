import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EXPORT_SCHEMA_VERSION } from '@/core/rules/export-file';
import { clearAllData } from './clear-data';
import type { WriteDeps } from './deps';
import { db, LOCAL_OWNER_ID } from './db';
import { exportData } from './export-data';
import { importData } from './import-data';
import type { Badge, Branch, Commit, EventRecord, Milestone, Settings, Task } from './types';

/**
 * 导出 / 导入 / 清空的事务一致性（PRD M10 §8.2）。
 *
 * 最值钱的回归是「写入中途失败必须回滚到导入前状态」：
 * 若把「先清空再写入」拆成两个事务，写入失败后用户现有数据已被清空，
 * 页面却只显示「导入失败」，原数据永久丢失。
 */

const AT = Date.UTC(2026, 10, 21, 9, 0);

function makeDeps(over: Partial<WriteDeps> = {}): WriteDeps {
  let seq = 0;
  return {
    clock: { now: () => AT },
    ids: { ulid: () => `gen-${++seq}` },
    tzOffset: () => 480,
    ...over,
  };
}

function branchRow(over: Partial<Branch> & Pick<Branch, 'id'>): Branch {
  return {
    ownerId: LOCAL_OWNER_ID,
    parentId: null,
    path: over.id,
    depth: 0,
    title: over.id,
    goal: null,
    color: 'accent',
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

function badgeRow(over: Partial<Badge> & Pick<Badge, 'id' | 'catalogId'>): Badge {
  return {
    ownerId: LOCAL_OWNER_ID,
    category: 'structure',
    periodKey: '2026-W46',
    grantedAt: AT,
    snapshot: {},
    sourceEntityId: null,
    rev: 1,
    createdAt: AT,
    ...over,
  };
}

function settingsRow(over: Partial<Settings> = {}): Settings {
  return {
    id: 'app',
    ownerId: LOCAL_OWNER_ID,
    theme: 'light',
    treeDensity: 'comfortable',
    annotations: 'once',
    reminderEnabled: true,
    lastAutoBackupAt: null,
    rev: 1,
    updatedAt: AT,
    ...over,
  };
}

function eventRow(over: Partial<EventRecord> & Pick<EventRecord, 'id'>): EventRecord {
  return {
    ownerId: LOCAL_OWNER_ID,
    entityType: 'branch',
    entityId: 'b',
    action: 'branch.create',
    payload: {},
    at: AT,
    tzOffset: 480,
    deviceId: null,
    ...over,
  };
}

interface FileInput {
  branches?: ImportTablesInput['branches'];
  tasks?: ImportTablesInput['tasks'];
  commits?: ImportTablesInput['commits'];
  milestones?: ImportTablesInput['milestones'];
  badges?: ImportTablesInput['badges'];
  settings?: ImportTablesInput['settings'];
  events?: ImportTablesInput['events'];
  year_reviews?: ImportTablesInput['year_reviews'];
}

interface ImportTablesInput {
  branches: unknown[];
  tasks: unknown[];
  commits: unknown[];
  milestones: unknown[];
  badges: unknown[];
  settings: unknown[];
  events: unknown[];
  year_reviews: unknown[];
}

function fileText(over: FileInput = {}): string {
  return JSON.stringify({
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt: '2026-11-21T09:00:00.000Z',
    appVersion: '0.1.0',
    branches: [],
    tasks: [],
    commits: [],
    milestones: [],
    badges: [],
    settings: [],
    events: [],
    year_reviews: [],
    ...over,
  });
}

async function snapshot() {
  return {
    branches: await db.branches.toArray(),
    tasks: await db.tasks.toArray(),
    commits: await db.commits.toArray(),
    milestones: await db.milestones.toArray(),
    badges: await db.badges.toArray(),
    settings: await db.settings.toArray(),
    events: await db.events.toArray(),
    year_reviews: await db.yearReviews.toArray(),
  };
}

async function seed() {
  await db.branches.add(branchRow({ id: 'old-b', taskTotal: 50, commitCount: 50 }));
  await db.tasks.add(taskRow({ id: 'old-t', branchId: 'old-b' }));
  await db.commits.add(commitRow({ id: 'old-c', branchId: 'old-b' }));
  await db.milestones.add(milestoneRow({ id: 'old-m', branchId: 'old-b' }));
  await db.badges.add(badgeRow({ id: 'old-badge', catalogId: 'first-branch' }));
  await db.settings.add(settingsRow());
  await db.events.add(eventRow({ id: 'old-e' }));
}

beforeEach(async () => {
  await db.delete();
  await db.open();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('importData（OP-05 / OP-07）', () => {
  it('整体替换七张表，四计数按文件内容重算，voidedAt 原样保留', async () => {
    await seed();

    const result = await importData(
      {
        text: fileText({
          branches: [
            branchRow({
              id: 'new-b',
              taskTotal: 99,
              taskDone: 99,
              commitCount: 99,
              ownLastCommitAt: AT,
            }),
          ],
          tasks: [
            taskRow({ id: 'n-open', branchId: 'new-b' }),
            taskRow({ id: 'n-done', branchId: 'new-b', status: 'done' }),
            taskRow({ id: 'n-cancelled', branchId: 'new-b', status: 'cancelled' }),
            taskRow({ id: 'n-deleted', branchId: 'new-b', deletedAt: AT }),
          ],
          commits: [
            commitRow({ id: 'n-c1', branchId: 'new-b', at: AT - 1_000 }),
            commitRow({ id: 'n-c2', branchId: 'new-b', at: AT - 500, voidedAt: AT - 400 }),
            commitRow({ id: 'n-c3', branchId: 'new-b', at: AT - 300, deletedAt: AT - 200 }),
          ],
          milestones: [milestoneRow({ id: 'n-m', branchId: 'new-b' })],
          badges: [badgeRow({ id: 'n-badge', catalogId: 'first-commit' })],
          settings: [settingsRow({ theme: 'dark' })],
          events: [eventRow({ id: 'n-e' })],
        }),
      },
      makeDeps(),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.counts).toEqual({
      branches: 1,
      tasks: 4,
      commits: 3,
      milestones: 1,
      badges: 1,
      settings: 1,
      events: 1,
      year_reviews: 0,
    });

    // 旧数据全部消失，只剩文件内容。
    expect((await db.branches.toArray()).map((row) => row.id)).toEqual(['new-b']);
    expect((await db.tasks.toArray()).map((row) => row.id).sort()).toEqual([
      'n-cancelled',
      'n-deleted',
      'n-done',
      'n-open',
    ]);
    expect((await db.commits.toArray()).map((row) => row.id).sort()).toEqual([
      'n-c1',
      'n-c2',
      'n-c3',
    ]);

    // 文件里被篡改的计数不采用，按实际待办与有效提交重算。
    expect(await db.branches.get('new-b')).toMatchObject({
      taskTotal: 2,
      taskDone: 1,
      commitCount: 1,
      ownLastCommitAt: AT - 1_000,
    });
    expect((await db.commits.get('n-c2'))?.voidedAt).toBe(AT - 400);
    expect((await db.settings.get('app'))?.theme).toBe('dark');

    const actions = (await db.events.toArray()).map((event) => event.action).sort();
    expect(actions).toEqual(['branch.create', 'data.import']);
    const importEvent = (await db.events.toArray()).find((event) => event.action === 'data.import');
    expect(importEvent?.payload).toMatchObject({
      schemaVersion: EXPORT_SCHEMA_VERSION,
      counts: { branches: 1, tasks: 4, commits: 3 },
    });
  });

  it('写入中途失败时逐表回滚到导入前状态', async () => {
    await seed();
    const before = await snapshot();

    vi.spyOn(db.milestones, 'bulkPut').mockImplementationOnce(
      () => Promise.reject(new Error('milestone write failed')) as never,
    );

    const result = await importData(
      {
        text: fileText({
          branches: [branchRow({ id: 'new-b' })],
          milestones: [milestoneRow({ id: 'n-m', branchId: 'new-b' })],
        }),
      },
      makeDeps(),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatchObject({ code: 'storage.write_failed', retriable: true });
    }
    expect(await snapshot()).toEqual(before);
  });

  it('事件写入失败时同样整体回滚', async () => {
    await seed();
    const before = await snapshot();

    const result = await importData(
      {
        text: fileText({ branches: [branchRow({ id: 'new-b' })] }),
      },
      makeDeps({
        ids: {
          ulid: () => {
            throw new Error('event id failed');
          },
        },
      }),
    );

    expect(result.ok).toBe(false);
    expect(await snapshot()).toEqual(before);
  });

  it('同一文件连续导入两次结果相同', async () => {
    const text = fileText({
      branches: [branchRow({ id: 'new-b', taskTotal: 99 })],
      tasks: [taskRow({ id: 'n-t', branchId: 'new-b' })],
    });

    await importData({ text }, makeDeps());
    const once = await snapshot();
    await importData({ text }, makeDeps());
    const twice = await snapshot();

    expect(twice.branches).toEqual(once.branches);
    expect(twice.tasks).toEqual(once.tasks);
    expect(twice.commits).toEqual(once.commits);
    expect(twice.milestones).toEqual(once.milestones);
    expect(twice.badges).toEqual(once.badges);
    expect(twice.settings).toEqual(once.settings);
    // 第二次导入会清掉第一次的 data.import，再写一条新的。
    expect(twice.events.filter((event) => event.action === 'data.import')).toHaveLength(1);
  });

  it('非法文件不写库', async () => {
    await seed();
    const before = await snapshot();

    const result = await importData({ text: 'not json' }, makeDeps());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('backup.invalid_file');
    }
    expect(await snapshot()).toEqual(before);
  });
});

describe('exportData（OP-01）', () => {
  it('文件名按本地日期生成，七张表齐全且剔除示例命名空间', async () => {
    await seed();
    await db.branches.add(branchRow({ id: 'example:root', ownerId: 'example' }));
    await db.tasks.add(taskRow({ id: 'example:t', branchId: 'old-b', ownerId: 'example' }));

    const result = await exportData(makeDeps());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.fileName).toBe('committo-export-2026-11-21.json');
    const payload = result.value.payload;
    expect(payload).toMatchObject({
      schemaVersion: EXPORT_SCHEMA_VERSION,
      exportedAt: '2026-11-21T09:00:00.000Z',
      appVersion: '0.1.0',
    });
    expect(payload.branches.map((row) => row.id)).toEqual(['old-b']);
    expect(payload.tasks.map((row) => row.id)).toEqual(['old-t']);
    expect(result.value.counts).toEqual({
      branches: 1,
      tasks: 1,
      commits: 1,
      milestones: 1,
      badges: 1,
      settings: 1,
      events: 1,
      year_reviews: 0,
    });

    const exported = (await db.events.toArray()).filter((event) => event.action === 'data.export');
    expect(exported).toHaveLength(1);
  });

  it('空库也能导出，各表为零', async () => {
    const result = await exportData(makeDeps());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.counts).toEqual({
      branches: 0,
      tasks: 0,
      commits: 0,
      milestones: 0,
      badges: 0,
      settings: 0,
      events: 0,
      year_reviews: 0,
    });
  });
});

describe('clearAllData（OP-06）', () => {
  it('清空七张表，只保留一条 data.clear', async () => {
    await seed();

    const result = await clearAllData(makeDeps());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({
      branches: 1,
      tasks: 1,
      commits: 1,
      milestones: 1,
      badges: 1,
      settings: 1,
      events: 1,
      year_reviews: 0,
    });

    const after = await snapshot();
    expect(after.branches).toEqual([]);
    expect(after.tasks).toEqual([]);
    expect(after.commits).toEqual([]);
    expect(after.milestones).toEqual([]);
    expect(after.badges).toEqual([]);
    expect(after.settings).toEqual([]);
    expect(after.events.map((event) => event.action)).toEqual(['data.clear']);
  });
});
