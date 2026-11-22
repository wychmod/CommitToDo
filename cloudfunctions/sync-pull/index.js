'use strict';

/**
 * 入站同步（方案 B：游标轮询）。
 *
 * 返回 `ownerId` 下、游标之后发生变化的行，按 `updatedAt` + `id` 单调推进。
 * 不返回本设备刚推上去的行；重复请求同一游标幂等。
 * 只读云端集合，不建表、不写业务数据。
 */

const cloudbase = require('@cloudbase/node-sdk');

const app = cloudbase.init({ env: cloudbase.SYMBOL_CURRENT_ENV });
const db = app.database();
const _ = db.command;

const COLLECTIONS = ['branches', 'tasks', 'commits', 'milestones', 'badges'];
const ENTITY_OF_COLLECTION = {
  branches: 'branch',
  tasks: 'task',
  commits: 'commit',
  milestones: 'milestone',
  badges: 'badge',
};
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 100;
/** 无 updatedAt 索引的集合退回全量扫描时的上限。 */
const MAX_SCAN = 1000;

function callerUid(event) {
  if (event && event.userInfo && event.userInfo.uid) return String(event.userInfo.uid);
  try {
    const info = app.auth().getUserInfo();
    if (info && info.uid) return String(info.uid);
  } catch (error) {
    return '';
  }
  return '';
}

function isEmptyCollectionError(error) {
  const text = `${(error && error.code) || ''} ${(error && error.message) || ''}`.toLowerCase();
  return (
    text.includes('not_exist') ||
    text.includes('not exist') ||
    text.includes('collection not found') ||
    text.includes('resource not found')
  );
}

function collectionMissing(collection) {
  const error = new Error(`collection_missing:${collection}`);
  error.code = 'collection_missing';
  error.collection = collection;
  return error;
}

/** 游标编码为 `<updatedAt>|<id>`，两部分都由服务端生成，按元组单调。 */
function parseCursor(raw) {
  const text = String(raw || '');
  if (text.length === 0) return null;
  const index = text.indexOf('|');
  if (index <= 0) return null;
  const at = Number(text.slice(0, index));
  const id = text.slice(index + 1);
  if (!Number.isFinite(at) || id.length === 0) return null;
  return { at, id };
}

function formatCursor(at, id) {
  return `${at}|${id}`;
}

function atOf(row) {
  const value = Number(row.updatedAt);
  return Number.isFinite(value) ? value : 0;
}

async function fetchRows(collection, ownerId, cursor, limit) {
  try {
    const where = cursor ? { ownerId, updatedAt: _.gte(cursor.at) } : { ownerId };
    const result = await db.collection(collection).where(where).orderBy('updatedAt', 'asc').limit(limit).get();
    return result.data || [];
  } catch (error) {
    if (isEmptyCollectionError(error)) throw collectionMissing(collection);
    // 部分集合没有 updatedAt 索引：退回按 ownerId 取一页，在函数内过滤与排序。
    const result = await db.collection(collection).where({ ownerId }).limit(MAX_SCAN).get();
    return result.data || [];
  }
}

function isAfterCursor(at, id, cursor) {
  if (!cursor) return true;
  if (at > cursor.at) return true;
  if (at < cursor.at) return false;
  return id > cursor.id;
}

exports.main = async (event) => {
  const payload = event || {};
  const ownerId = callerUid(payload);
  if (ownerId.length === 0) {
    return { ok: false, code: 'unauthenticated' };
  }

  const cursor = parseCursor(payload.cursor);
  const deviceId = String(payload.deviceId || '');
  const requested = Number(payload.limit);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number.isFinite(requested) && requested > 0 ? Math.floor(requested) : DEFAULT_LIMIT),
  );
  const serverTime = Date.now();

  try {
    const pages = await Promise.all(
      COLLECTIONS.map(async (collection) => {
        const rows = await fetchRows(collection, ownerId, cursor, limit);
        return rows.map((row) => {
          const id = String(row._id || row.id || '');
          return {
            collection,
            id,
            at: atOf(row),
            row: { ...row, _id: id, id },
          };
        });
      }),
    );

    const merged = [];
    for (const page of pages) {
      for (const item of page) {
        if (item.id.length === 0) continue;
        if (!isAfterCursor(item.at, item.id, cursor)) continue;
        merged.push(item);
      }
    }
    merged.sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));

    const changes = [];
    let nextCursor = cursor === null ? null : formatCursor(cursor.at, cursor.id);
    let scanned = 0;
    for (const item of merged) {
      if (scanned >= limit) break;
      scanned += 1;
      nextCursor = formatCursor(item.at, item.id);
      // 本设备刚推上去的行不进反向同步，但仍推进游标。
      if (deviceId.length > 0 && String(item.row.lastDeviceId || '') === deviceId) continue;
      changes.push({
        entity: ENTITY_OF_COLLECTION[item.collection],
        collection: item.collection,
        row: item.row,
      });
    }

    return { ok: true, changes, cursor: nextCursor, serverTime };
  } catch (error) {
    const code = error && error.code === 'collection_missing' ? 'collection_missing' : 'sync_failed';
    return {
      ok: false,
      code,
      message: error && error.message ? String(error.message) : 'sync pull failed',
      retriable: true,
    };
  }
};
