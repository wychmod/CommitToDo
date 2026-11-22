'use strict';

/**
 * 首次迁移云函数（PRD V2-02 OP-05，TECH §5.5）。
 *
 * 接收本机按集合分页推送的原始行，按 `_id` upsert：同一批重试不会产生重复记录。
 * 断点由客户端 `migration_state` 维护，服务端只保证幂等与归属改写，不推进任何游标。
 */

const cloudbase = require('@cloudbase/node-sdk');

const app = cloudbase.init({ env: cloudbase.SYMBOL_CURRENT_ENV });
const db = app.database();

/** 迁移集合顺序与客户端 `core/rules/migration-plan.ts` 一致。 */
const COLLECTIONS = [
  'branches',
  'tasks',
  'commits',
  'milestones',
  'badges',
  'events',
  'settings'
];

const MAX_ROWS = 200;

function isEmptyCollectionError(error) {
  if (!error) return false;
  const code = String(error.code || '');
  const message = String(error.message || '');
  return (
    code === 'DATABASE_COLLECTION_NOT_EXIST' ||
    /DATABASE_COLLECTION_NOT_EXIST|Db or Table not exist/.test(message)
  );
}

/**
 * 集合由数据库线按 TECH §5.3 统一创建，函数内不建表、不改表。
 * 集合缺失时整体失败，客户端保留迁移断点后重试。
 */
function collectionMissing(error) {
  if (!isEmptyCollectionError(error)) return error;
  const wrapped = new Error('collection_missing');
  wrapped.code = 'collection_missing';
  return wrapped;
}

function callerUid(event) {
  let info = {};
  try {
    const auth = app.auth();
    if (auth && typeof auth.getUserInfo === 'function') info = auth.getUserInfo() || {};
  } catch (error) {
    info = {};
  }
  const userInfo = event && event.userInfo ? event.userInfo : {};
  return String(info.uid || userInfo.uid || '');
}

async function existingRow(collection, id) {
  try {
    const result = await db.collection(collection).doc(id).get();
    return (result.data && result.data[0]) || null;
  } catch (error) {
    if (isEmptyCollectionError(error)) return null;
    throw error;
  }
}

exports.main = async (event) => {
  const payload = event || {};
  const ownerId = callerUid(payload);
  if (!ownerId) {
    return { ok: false, code: 'unauthenticated', message: '未登录' };
  }

  const collection = String(payload.collection || '');
  if (!COLLECTIONS.includes(collection)) {
    return { ok: false, code: 'invalid_collection', message: '未知的迁移集合' };
  }
  const rows = Array.isArray(payload.rows) ? payload.rows.slice(0, MAX_ROWS) : [];
  const serverTime = Date.now();

  try {
    let pushed = 0;
    for (const row of rows) {
      const id = String((row && (row._id || row.id)) || '');
      if (!id) continue;
      const existing = await existingRow(collection, id);
      // 已有更新的版本时不回退；同版本重试直接覆盖，保证幂等。
      if (existing && Number(existing.updatedAt || 0) > Number(row.updatedAt || 0)) continue;

      const next = { ...row, ownerId, id };
      delete next._id;
      await db.collection(collection).doc(id).set(next);
      pushed += 1;
    }
    return { ok: true, pushed, serverTime };
  } catch (error) {
    const normalized = collectionMissing(error);
    return {
      ok: false,
      code: normalized.code === 'collection_missing' ? 'collection_missing' : 'migration_failed',
      message: normalized.message || '迁移失败'
    };
  }
};
