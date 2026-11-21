import { beforeEach, describe, expect, it } from 'vitest';
import { createManualBackup } from './create-manual-backup';
import type { WriteDeps } from './deps';
import { db, LOCAL_OWNER_ID } from './db';
import { restoreSnapshot } from './snapshot-restore';
import type { Badge, Branch, Commit, EventRecord, Milestone, Settings, Task } from './types';

/**
 * 快照恢复事务（PRD V1-06 §8.2 / OP-04、OP-05）。
 *
 * 最值钱的回归：恢复前副本与七张表的整体替换必须在同一事务里。
 * 若逐表写入而没有事务，中途失败会留下「分支是新的、待办是旧的」的混合状态，
 * 页面重载后看起来恢复了，却与任何快照都不一致。
 */

const AT = Date.UTC(2026, 10, 21, 9, 0);
const TZ = 480;

function makeDeps(over: Partial<WriteDeps> = {}): WriteDeps {
  let seq = 0;
  return {
    clock: { now: () => AT },
    ids: { ulid: () => `gen-${++seq}` },
    tzOffset: () => TZ,
    ...over,
  };
}

function branchRow(over: Partial<Branch> & Pick<Branch, 'id'>): Branch {
  return {
    ownerId: LOCAL_OWNER_ID,
    parentId: null,
    path: over.id,
    depth: 1,
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
    taskTotal: 99,
    taskDone: 99,
    commitCount: 99,
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
    tzOffset: TZ,
    deviceId: null,
    ...over,
  };
}

async function seed(): Promise<void> {
  await db.branches.add(branchRow({ id: 'b' }));
  await db.tasks.add(taskRow({ id: 't-open', branchId: 'b' }));
  await db.tasks.add(taskRow({ id: 't-done', branchId: 'b', status: 'done' }));
  await db.tasks.add(taskRow({ id: 't-cancelled', branchId: 'b', status: 'cancelled' }));
  await db.commits.add(commitRow({ id: 'c-live', branchId: 'b', at: AT - 1_000 }));
  await db.commits.add(
    commitRow({ id: 'c-void', branchId: 'b', at: AT - 500, voidedAt: AT - 100 }),
  );
  await db.milestones.add(milestoneRow({ id: 'm', branchId: 'b' }));
  await db.badges.add(badgeRow({ id: 'badge', catalogId: 'first-branch' }));
  await db.settings.add(settingsRow());
  await db.events.add(eventRow({ id: 'old-event' }));
}

async function readState() {
  return {
    branches: await db.branches.toArray(),
    tasks: await db.tasks.toArray(),
    commits: await db.commits.toArray(),
    milestones: await db.milestones.toArray(),
    badges: await db.badges.toArray(),
    settings: await db.settings.toArray(),
    events: await db.events.toArray(),
    backups: await db.backups.toArray(),
  };
}

async function makeSnapshot() {
  const result = await createManualBackup(makeDeps());
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error('manual backup failed');
  return result.value;
}

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('restoreSnapshot（OP-04）', () => {
  it('先写 pre-restore，再整体替换；四计数按正文重算，撤销提交与徽章保持快照状态', async () => {
    await seed();
    const target = await makeSnapshot();

    await db.branches.add(branchRow({ id: 'extra' }));
    await db.tasks.add(taskRow({ id: 'extra-task', branchId: 'extra' }));
    await db.commits.add(commitRow({ id: 'extra-commit', branchId: 'extra' }));
    await db.branches.update('b', { taskTotal: 0, taskDone: 0, commitCount: 0 });

    let restoreSeq = 0;
    const result = await restoreSnapshot(
      { backupId: target.id },
      makeDeps({ ids: { ulid: () => `restore-${++restoreSeq}` } }),
    );

    expect(result.ok).toBe(true);

    const branches = await db.branches.toArray();
    expect(branches).toHaveLength(1);
    expect(branches[0]).toMatchObject({
      id: 'b',
      taskTotal: 2,
      taskDone: 1,
      commitCount: 1,
      ownLastCommitAt: AT - 1_000,
    });

    expect(await db.tasks.count()).toBe(3);
    expect(await db.milestones.count()).toBe(1);
    expect(await db.badges.count()).toBe(1);

    const voided = await db.commits.get('c-void');
    expect(voided?.voidedAt).toBe(AT - 100);

    const settings = await db.settings.get('app');
    expect(settings?.theme).toBe('light');

    const backups = await db.backups.toArray();
    expect(backups.filter((row) => row.kind === 'pre-restore')).toHaveLength(1);
    expect(backups.find((row) => row.id === target.id)?.restoredAt).toBe(AT);

    const events = await db.events.toArray();
    expect(events.some((event) => event.action === 'backup.restore')).toBe(true);
  });

  it('写 pre-restore 失败时恢复不执行，七张表与备份列表都不变', async () => {
    await seed();
    const target = await makeSnapshot();
    const before = await readState();

    const result = await restoreSnapshot(
      { backupId: target.id },
      makeDeps({
        ids: {
          ulid: () => {
            throw new Error('pre-restore-failed');
          },
        },
      }),
    );

    expect(result).toMatchObject({
      ok: false,
      error: { code: 'storage.write_failed', field: 'pre-restore', retriable: true },
    });
    expect(await readState()).toEqual(before);
  });

  it('替换中途失败时七张表与 pre-restore 一起回滚', async () => {
    await seed();
    const target = await makeSnapshot();
    const before = await readState();

    let calls = 0;
    const result = await restoreSnapshot(
      { backupId: target.id },
      makeDeps({
        ids: {
          ulid: () => {
            calls += 1;
            if (calls > 1) throw new Error('replace-failed');
            return 'pre-id';
          },
        },
      }),
    );

    expect(result).toMatchObject({
      ok: false,
      error: { code: 'storage.write_failed', field: 'replace', retriable: true },
    });
    expect(await readState()).toEqual(before);
  });

  it('版本不一致时拒绝恢复，不写 pre-restore', async () => {
    await seed();
    const target = await makeSnapshot();
    await db.backups.update(target.id, { schemaVersion: 99 });
    const before = await readState();

    const result = await restoreSnapshot({ backupId: target.id }, makeDeps());

    expect(result).toMatchObject({
      ok: false,
      error: { code: 'backup.version_unsupported' },
    });
    expect(await readState()).toEqual(before);
    expect(await db.backups.where('kind').equals('pre-restore').count()).toBe(0);
  });

  it('不存在的快照返回 not_found，不改动任何数据', async () => {
    await seed();
    const before = await readState();

    const result = await restoreSnapshot({ backupId: 'missing' }, makeDeps());

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('domain.not_found');
    expect(await readState()).toEqual(before);
  });
});
