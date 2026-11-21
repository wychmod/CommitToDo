/**
 * 首次迁移的集合顺序与断点续传（PRD V2-02 OP-05 / §8.2）。
 *
 * 集合顺序固定，已完成（`done`）的集合跳过；每个集合按 `_id` 升序分页，
 * `lastId` 是最后一条已成功推送的记录，重试从它之后继续，不重头再来。
 */

export const MIGRATION_COLLECTIONS = [
  'branches',
  'tasks',
  'commits',
  'milestones',
  'badges',
  'events',
  'settings',
] as const;

export type MigrationCollection = (typeof MIGRATION_COLLECTIONS)[number];

export interface MigrationCursor {
  collection: string;
  lastId: string | null;
  pushed: number;
  done: boolean;
  updatedAt: number;
}

export type MigrationStep =
  | {
      done: false;
      collection: MigrationCollection;
      index: number;
      total: number;
      lastId: string | null;
    }
  | { done: true; completed: number; total: number };

function cursorOf(
  cursors: readonly MigrationCursor[],
  collection: MigrationCollection,
): MigrationCursor | undefined {
  return cursors.find((cursor) => cursor.collection === collection);
}

/** 下一个待迁移集合；全部完成时返回结束态。 */
export function nextMigrationStep(cursors: readonly MigrationCursor[]): MigrationStep {
  const total = MIGRATION_COLLECTIONS.length;
  for (let index = 0; index < total; index += 1) {
    const collection = MIGRATION_COLLECTIONS[index];
    const cursor = cursorOf(cursors, collection);
    if (cursor?.done) continue;
    return { done: false, collection, index, total, lastId: cursor?.lastId ?? null };
  }
  return { done: true, completed: total, total };
}

/** 已完成集合数，用于「正在迁移 3/7 个集合」的进度。 */
export function completedCollections(cursors: readonly MigrationCursor[]): number {
  return MIGRATION_COLLECTIONS.filter((collection) => cursorOf(cursors, collection)?.done).length;
}

/** 按 `id` 升序取 `lastId` 之后的一页；`lastId = null` 从第一条开始。 */
export function pageAfter<T extends { id: string }>(
  rows: readonly T[],
  lastId: string | null,
  size: number,
): T[] {
  if (size <= 0) return [];
  const sorted = rows.slice().sort((left, right) => left.id.localeCompare(right.id));
  const start = lastId === null ? 0 : sorted.findIndex((row) => row.id > lastId);
  if (start < 0) return [];
  return sorted.slice(start, start + size);
}

/** 一页推送成功后的新断点；最后一页推完即该集合完成。 */
export function nextCursor(
  lastId: string | null,
  page: readonly { id: string }[],
  done: boolean,
): {
  lastId: string | null;
  done: boolean;
} {
  const nextId = page.length > 0 ? page[page.length - 1].id : lastId;
  return { lastId: nextId, done };
}
