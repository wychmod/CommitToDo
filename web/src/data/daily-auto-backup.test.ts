import { beforeEach, describe, expect, it } from 'vitest';
import { toLocalDate } from '@/core/clock';
import { EXPORT_SCHEMA_VERSION } from '@/core/rules/export-file';
import type { WriteDeps } from './deps';
import { runDailyAutoBackup } from './daily-auto-backup';
import { db, LOCAL_OWNER_ID } from './db';
import type { Backup, Settings } from './types';

/**
 * 每日自动快照与淘汰事务（PRD V1-06 §8.2 / OP-01）。
 *
 * 关键守卫：同一个自然日只写一条 auto；第 8 天只淘汰最旧的 auto，
 * 手动与恢复前快照必须原地不动。自动写入失败只能返回 Result，
 * 不能把异常抛给工作区外壳。
 */

const DAY = 24 * 60 * 60 * 1000;
const BASE = Date.UTC(2026, 10, 1, 9, 0);
const TZ = 480;

let now = BASE;

function makeDeps(over: Partial<WriteDeps> = {}): WriteDeps {
  let seq = 0;
  return {
    clock: { now: () => now },
    ids: { ulid: () => `gen-${++seq}` },
    tzOffset: () => TZ,
    ...over,
  };
}

function backupRow(over: Partial<Backup> & Pick<Backup, 'id' | 'kind' | 'createdAt'>): Backup {
  return {
    ownerId: LOCAL_OWNER_ID,
    branchCount: 0,
    taskCount: 0,
    commitCount: 0,
    schemaVersion: 1,
    bytes: 2,
    restoredAt: null,
    remoteKey: null,
    payload: '{}',
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
    updatedAt: BASE,
    ...over,
  };
}

beforeEach(async () => {
  now = BASE;
  await db.delete();
  await db.open();
});

describe('runDailyAutoBackup（OP-01）', () => {
  it('当日首次进入新增恰好 1 条 auto，并记录计数与 schemaVersion', async () => {
    await db.branches.add({
      id: 'b',
      ownerId: LOCAL_OWNER_ID,
      parentId: null,
      path: 'b',
      depth: 1,
      title: '分支',
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
      createdAt: BASE,
      updatedAt: BASE,
      deletedAt: null,
    });

    const result = await runDailyAutoBackup(makeDeps());

    expect(result.ok).toBe(true);
    const rows = await db.backups.toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      kind: 'auto',
      branchCount: 1,
      schemaVersion: EXPORT_SCHEMA_VERSION,
    });
    expect(rows[0].payload.length).toBeGreaterThan(0);

    const settings = await db.settings.get('app');
    expect(settings?.lastAutoBackupAt).toBe(now);

    const events = await db.events.toArray();
    expect(events.map((event) => event.action)).toEqual(['backup.create']);
  });

  it('同一自然日多次打开不新增', async () => {
    await runDailyAutoBackup(makeDeps());
    now += 60 * 60 * 1000;
    const second = await runDailyAutoBackup(makeDeps());

    expect(second.ok).toBe(true);
    expect(await db.backups.count()).toBe(1);
  });

  it('当日已有 auto 时即使上次备份时间超过 7 天也不补写', async () => {
    await db.backups.add(backupRow({ id: 'today-auto', kind: 'auto', createdAt: now }));
    await db.settings.add(settingsRow({ lastAutoBackupAt: now - 8 * DAY }));

    const result = await runDailyAutoBackup(makeDeps());

    expect(result).toMatchObject({ ok: true, value: { created: false } });
    expect(await db.backups.count()).toBe(1);
  });

  it('跨自然日后再次打开新增一条', async () => {
    const deps = makeDeps();
    await runDailyAutoBackup(deps);
    now += DAY;
    await runDailyAutoBackup(deps);

    const rows = await db.backups.toArray();
    expect(rows).toHaveLength(2);
    expect(new Set(rows.map((row) => toLocalDate(row.createdAt, TZ))).size).toBe(2);
  });

  it('第 8 天 auto 保持 7 条，只淘汰最旧 auto，手动与恢复前不动', async () => {
    for (let index = 0; index < 7; index += 1) {
      await db.backups.add(
        backupRow({
          id: `auto-${index}`,
          kind: 'auto',
          createdAt: BASE + index * DAY,
        }),
      );
    }
    await db.backups.add(backupRow({ id: 'manual-keep', kind: 'manual', createdAt: BASE + DAY }));
    await db.backups.add(backupRow({ id: 'pre-keep', kind: 'pre-restore', createdAt: BASE + DAY }));

    now = BASE + 7 * DAY;
    await runDailyAutoBackup(makeDeps());

    const rows = await db.backups.toArray();
    const autos = rows.filter((row) => row.kind === 'auto');

    expect(autos).toHaveLength(7);
    expect(autos.map((row) => row.id)).not.toContain('auto-0');
    expect(rows.map((row) => row.id)).toContain('manual-keep');
    expect(rows.map((row) => row.id)).toContain('pre-keep');
  });

  it('自动写入失败返回可重试结果，不抛错也不留下半条记录', async () => {
    const deps = makeDeps({
      ids: {
        ulid: () => {
          throw new Error('id-failed');
        },
      },
    });

    await expect(runDailyAutoBackup(deps)).resolves.toMatchObject({
      ok: false,
      error: { code: 'storage.write_failed', retriable: true },
    });
    expect(await db.backups.count()).toBe(0);
    expect(await db.settings.count()).toBe(0);
  });
});
