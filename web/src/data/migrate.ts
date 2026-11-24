import { fail, ok, type Result } from '@/core/errors';
import {
  completedCollections,
  nextCursor,
  nextMigrationStep,
  pageAfter,
} from '@/core/rules/migration-plan';
import { pushMigrationPage } from './cloud/sync';
import { db } from './db';
import { defaultWriteDeps, type WriteDeps } from './deps';
import { ensureCurrentDevice } from './devices';
import type { MigrationState } from './types';

/**
 * 首次登录迁移（PRD V2-02 OP-05）。
 *
 * 按固定集合顺序分页推送到云端，每批成功后写 `migration_state`；
 * 中断后从 `lastId` 续传，已迁移集合不重复推送。失败不删除断点。
 */

const PAGE_SIZE = 100;

let running = false;

function tableOf(collection: string) {
  return collection === 'settings' ? db.settings : db.table(collection);
}

async function loadCollection(
  collection: string,
  ownerId: string,
): Promise<Array<{ id: string } & Record<string, unknown>>> {
  const rows = (await tableOf(collection).where('ownerId').equals(ownerId).toArray()) as Array<
    { id: string } & Record<string, unknown>
  >;
  return rows;
}

async function saveCursor(row: MigrationState): Promise<void> {
  await db.migrationState.put(row);
}

function toCursor(row: MigrationState) {
  return {
    collection: row.id,
    lastId: row.lastId,
    pushed: row.pushed,
    done: row.done,
    updatedAt: row.updatedAt,
  };
}

export interface MigrationProgress {
  completed: number;
  total: number;
  collection: string | null;
  lastId: string | null;
  pushed: number;
}

export async function readMigrationProgress(): Promise<MigrationProgress> {
  const rows = await db.migrationState.toArray();
  const cursors = rows.map(toCursor);
  const step = nextMigrationStep(cursors);
  if (step.done) {
    return {
      completed: step.completed,
      total: step.total,
      collection: null,
      lastId: null,
      pushed: rows.reduce((sum, cursor) => sum + cursor.pushed, 0),
    };
  }
  const cursor = rows.find((row) => row.id === step.collection);
  return {
    completed: completedCollections(cursors),
    total: step.total,
    collection: step.collection,
    lastId: cursor?.lastId ?? null,
    pushed: cursor?.pushed ?? 0,
  };
}

export async function startMigration(
  principalId: string,
  deps: WriteDeps = defaultWriteDeps,
): Promise<Result<{ completed: number; total: number }>> {
  if (principalId.length === 0) {
    return fail('validation.invalid_input', { field: 'principalId' });
  }
  if (running) {
    return fail('sync.failed', { retriable: true, field: 'migration' });
  }

  running = true;
  try {
    await ensureCurrentDevice(principalId, deps);
    for (;;) {
      const cursors = await db.migrationState.toArray();
      const step = nextMigrationStep(cursors.map(toCursor));
      if (step.done) return ok({ completed: step.completed, total: step.total });

      const existing = cursors.find((row) => row.id === step.collection);
      const rows = await loadCollection(step.collection, principalId);
      const page = pageAfter(rows, step.lastId, PAGE_SIZE);
      const at = deps.clock.now();

      if (page.length === 0) {
        await saveCursor({
          id: step.collection,
          lastId: step.lastId,
          pushed: existing?.pushed ?? 0,
          done: true,
          updatedAt: at,
        });
        continue;
      }

      const pushed = await pushMigrationPage(
        step.collection,
        page.map((row) => ({ ...row, _id: row.id })),
      );
      if (!pushed.ok) {
        // 只保存已经成功的页，失败页不推进 lastId。
        await saveCursor({
          id: step.collection,
          lastId: step.lastId,
          pushed: existing?.pushed ?? 0,
          done: false,
          updatedAt: at,
        });
        return fail(pushed.error.code, {
          retriable: pushed.error.retriable,
          cause: pushed.error.cause,
        });
      }

      const cursor = nextCursor(step.lastId, page, page.length < PAGE_SIZE);
      await saveCursor({
        id: step.collection,
        lastId: cursor.lastId,
        pushed: (existing?.pushed ?? 0) + page.length,
        done: cursor.done,
        updatedAt: at,
      });
    }
  } catch (cause) {
    return fail('storage.write_failed', { retriable: true, cause });
  } finally {
    running = false;
  }
}
