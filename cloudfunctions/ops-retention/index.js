'use strict';

/**
 * ops-retention：清理 ops_events 中超过保留期的原始事件。
 *
 * 约束：
 * - 只由定时触发器或控制台运维调用；带用户身份的客户端调用一律拒绝。
 * - 只删除 `at` 早于 400 天的行，不碰其他集合。
 * - 单次最多删除 5000 行，未删完时下一次触发继续；不做批量 DDL。
 */

const tcb = require('@cloudbase/node-sdk');

const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV });
const db = app.database();
const _ = db.command;

const RETENTION_DAYS = 400;
const PAGE_SIZE = 100;
const MAX_DELETE_PER_RUN = 5000;

function requestIdOf(context) {
  return (context && (context.request_id || context.requestId)) || `req-${Date.now()}`;
}

function fail(code, message, status, retriable, requestId) {
  return {
    ok: false,
    code,
    message,
    status: status || 400,
    retriable: Boolean(retriable),
    requestId: requestId || '',
  };
}

function isMissingCollection(error) {
  const message = String((error && (error.message || error.errMsg)) || error || '');
  return /not exist|not found|不存在|DATABASE_COLLECTION_NOT_EXIST|collection.*missing/i.test(message);
}

function callerUid() {
  try {
    const info = app.auth().getUserInfo() || {};
    return info.uid || '';
  } catch (_) {
    return '';
  }
}

exports.main = async (event, context) => {
  const requestId = requestIdOf(context);

  if (callerUid()) {
    return fail('ops_retention_forbidden', '该函数只接受定时触发器调用', 403, false, requestId);
  }

  const now = Date.now();
  const cutoff = now - RETENTION_DAYS * 86400000;
  let deleted = 0;
  let scanned = 0;
  let capped = false;

  try {
    while (deleted < MAX_DELETE_PER_RUN) {
      const result = await db
        .collection('ops_events')
        .where({ at: _.lt(cutoff) })
        .orderBy('at', 'asc')
        .limit(PAGE_SIZE)
        .get();
      const rows = (result && result.data) || [];
      if (!rows.length) break;

      for (const row of rows) {
        scanned += 1;
        if (deleted >= MAX_DELETE_PER_RUN) {
          capped = true;
          break;
        }
        await db.collection('ops_events').doc(row._id).remove();
        deleted += 1;
      }
      if (rows.length < PAGE_SIZE) break;
    }
  } catch (error) {
    if (isMissingCollection(error)) {
      return fail('ops_collection_missing', 'ops_events 尚未创建', 503, true, requestId);
    }
    console.error('[ops-retention]', requestId, error && (error.stack || error.message || error));
    return fail('ops_retention_failed', '清理执行失败，请查看函数日志', 500, true, requestId);
  }

  console.log('[ops-retention]', requestId, JSON.stringify({ cutoff, scanned, deleted, capped }));

  return {
    ok: true,
    data: {
      retentionDays: RETENTION_DAYS,
      cutoffIso: new Date(cutoff).toISOString(),
      scanned,
      deleted,
      capped,
    },
    serverTime: Date.now(),
    requestId,
  };
};
