'use strict';

/**
 * 匿名计数云函数（PRD V2-02 OP-08 / J-07，TECH §4.3）。
 *
 * 只接受白名单字段：`installId`、`localDate`、`commitCount`、`activeBranchCount`、
 * `appVersion`、`platform`。多一个键就整包拒绝，标题、分支名、备注与实体 ID 无法进入。
 *
 * `counters` 的 `_id` 固定为「事件名 + 日期」，函数是唯一写入方；重复上报只累加计数。
 * 留存口径由服务端另行定义（PRD §7 未决），本函数只保证计数准确。
 */

const cloudbase = require('@cloudbase/node-sdk');

const app = cloudbase.init({ env: cloudbase.SYMBOL_CURRENT_ENV });
const db = app.database();

const ALLOWED_KEYS = [
  'installId',
  'localDate',
  'commitCount',
  'activeBranchCount',
  'appVersion',
  'platform'
];

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
 * `counters` 由数据库线按 TECH §5.3 统一创建，函数内不建表、不改表。
 * 集合缺失时返回可重试失败，客户端保留本机待上报队列。
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

function invalidKeys(payload) {
  return Object.keys(payload).filter((key) => !ALLOWED_KEYS.includes(key));
}

exports.main = async (event) => {
  const payload = event || {};
  const ownerId = callerUid(payload);
  if (!ownerId) {
    return { ok: false, code: 'unauthenticated', message: '未登录' };
  }

  const name = String(payload.event || '');
  const date = String(payload.date || '');
  if (name !== 'workspace.daily') {
    return { ok: false, code: 'invalid_event', message: '未知的统计事件' };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { ok: false, code: 'invalid_date', message: '日期格式不正确' };
  }

  const stats = payload.payload && typeof payload.payload === 'object' ? payload.payload : {};
  const extra = invalidKeys(stats);
  if (extra.length > 0) {
    return { ok: false, code: 'payload_invalid', message: '统计包包含白名单之外的字段' };
  }

  try {
    const id = `${name}:${date}`;
    // 原子自增，避免并发上报时互相覆盖；文档只定义 `_id` 与 `value`，不额外落字段。
    const command = db.command;
    let updated = null;
    try {
      updated = await db
        .collection('counters')
        .doc(id)
        .update({ value: command.inc(1) });
    } catch (error) {
      if (!/DOCUMENT_NOT_EXIST|not exist/i.test(String((error && error.message) || ''))) {
        throw error;
      }
    }
    if (!updated || !updated.updated) {
      await db.collection('counters').doc(id).set({ value: 1 });
    }
    const current = await db.collection('counters').doc(id).get();
    const row = (current.data && current.data[0]) || null;
    return { ok: true, value: row && Number(row.value) ? Number(row.value) : 1 };
  } catch (error) {
    const normalized = collectionMissing(error);
    return {
      ok: false,
      code: normalized.code === 'collection_missing' ? 'collection_missing' : 'counter_failed',
      message: normalized.message || '统计写入失败'
    };
  }
};
