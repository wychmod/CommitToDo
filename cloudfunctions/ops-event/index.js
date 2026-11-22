'use strict';

/**
 * ops-event：客户端行为事件采集。
 *
 * 约束（对应 admin/docs/CLOUD-SCHEMA-REQUEST.md §1.1 与 §3）：
 * - 只接受白名单事件与白名单 props，未知事件 / 未知键 / 非法类型整包拒绝。
 * - userId 只取调用身份，忽略客户端传值；未登录时允许匿名安装事件（visitorId）。
 * - `_id` 即幂等键：app.open / account.signup 用「事件:身份:本地日」；其余事件要求客户端 eventId。
 * - 任何失败都返回结构化错误，由客户端静默忽略，不影响主流程。
 * - 不写邮箱、标题、分支名、备注、业务实体 ID、IP 或自由文本。
 */

const tcb = require('@cloudbase/node-sdk');

const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV });
const db = app.database();
const _ = db.command;

const SCHEMA_VERSION = 1;
const MAX_BATCH = 20;
const MAX_CLOCK_SKEW_DAYS = 1;
const PLATFORMS = new Set(['web', 'wechat']);
const DAILY_EVENTS = new Set(['app.open', 'account.signup']);

/** 事件白名单；`null` 表示该事件不接受任何 props。 */
const EVENT_PROPS = {
  'app.open': null,
  'account.signup': { method: { type: 'string', max: 32 } },
  'sync.push': {
    ops: { type: 'integer', min: 0, max: 10000 },
    result: { type: 'enum', values: ['success', 'conflict', 'failed'] },
    errorCode: { type: 'code', max: 32 },
  },
  'backup.upload': {
    result: { type: 'enum', values: ['success', 'conflict', 'failed'] },
    bytes: { type: 'integer', min: 0, max: 1e12 },
    errorCode: { type: 'code', max: 32 },
  },
  'commit.create': { count: { type: 'integer', min: 0, max: 10000 } },
  'task.complete': {
    count: { type: 'integer', min: 0, max: 10000 },
    hadDueDate: { type: 'boolean' },
  },
  'branch.create': { depth: { type: 'integer', min: 0, max: 1000 } },
  'milestone.create': { precision: { type: 'string', max: 32 } },
  'badge.grant': { catalogId: { type: 'string', max: 64 } },
  'review.open': { kind: { type: 'string', max: 16 } },
};

const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const EVENT_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const CODE_PATTERN = /^[A-Za-z0-9._-]{1,32}$/;

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

function isDuplicateKey(error) {
  const message = String((error && (error.message || error.errMsg)) || error || '');
  return /duplicate|already exists|E11000|重复|唯一/i.test(message);
}

function resolveUid() {
  try {
    const info = app.auth().getUserInfo() || {};
    return info.uid || '';
  } catch (_) {
    return '';
  }
}

function isValidDate(value) {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function serverLocalDate(tzOffset, now) {
  return new Date(now + tzOffset * 60 * 1000).toISOString().slice(0, 10);
}

function dayDiff(from, to) {
  const a = new Date(`${from}T00:00:00.000Z`).getTime();
  const b = new Date(`${to}T00:00:00.000Z`).getTime();
  return Math.round((b - a) / 86400000);
}

function validateProps(eventName, props) {
  const rules = EVENT_PROPS[eventName];
  if (props == null) return { value: null };
  if (typeof props !== 'object' || Array.isArray(props)) {
    return { error: `${eventName} 的 props 必须是对象` };
  }
  const keys = Object.keys(props);
  if (keys.length > 12) return { error: 'props 最多 12 个键' };
  if (!rules) {
    return keys.length ? { error: `${eventName} 不接受 props` } : { value: null };
  }

  const output = {};
  for (const key of keys) {
    const rule = rules[key];
    if (!rule) return { error: `${eventName} 不接受 props.${key}` };
    const value = props[key];
    if (value == null) continue;
    if (rule.type === 'boolean') {
      if (typeof value !== 'boolean') return { error: `props.${key} 必须是布尔值` };
    } else if (rule.type === 'integer') {
      if (!Number.isInteger(value) || value < rule.min || value > rule.max) {
        return { error: `props.${key} 必须是 ${rule.min}..${rule.max} 的整数` };
      }
    } else if (rule.type === 'enum') {
      if (typeof value !== 'string' || !rule.values.includes(value)) {
        return { error: `props.${key} 只能是 ${rule.values.join(' / ')}` };
      }
    } else if (rule.type === 'code') {
      if (typeof value !== 'string' || !CODE_PATTERN.test(value)) {
        return { error: `props.${key} 必须是短枚举串` };
      }
    } else {
      if (typeof value !== 'string' || value.length > rule.max) {
        return { error: `props.${key} 必须是 ≤${rule.max} 字符的字符串` };
      }
    }
    output[key] = value;
  }
  return { value: Object.keys(output).length ? output : null };
}

function validateEvent(raw, uid, now) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { error: '事件必须是对象' };
  const eventName = String(raw.event || '');
  if (!Object.prototype.hasOwnProperty.call(EVENT_PROPS, eventName)) {
    return { error: `未知事件：${eventName || '(空)'}` };
  }

  const tzOffset = Number(raw.tzOffset);
  if (!Number.isInteger(tzOffset) || tzOffset < -720 || tzOffset > 840) {
    return { error: 'tzOffset 必须是 -720..840 的整数' };
  }
  if (!isValidDate(raw.localDate)) return { error: 'localDate 必须是 YYYY-MM-DD' };
  if (
    Math.abs(dayDiff(raw.localDate, serverLocalDate(tzOffset, now))) > MAX_CLOCK_SKEW_DAYS
  ) {
    return { error: 'localDate 与服务端日期偏差超过 1 天' };
  }

  const platform = String(raw.platform || '');
  if (!PLATFORMS.has(platform)) return { error: 'platform 只能是 web / wechat' };

  if (eventName === 'account.signup' && !uid) {
    return { error: 'account.signup 需要登录身份' };
  }

  let visitorId = '';
  if (raw.visitorId != null) {
    visitorId = String(raw.visitorId);
    if (!ID_PATTERN.test(visitorId)) return { error: 'visitorId 必须是 1..64 位字母数字' };
  }
  let deviceId = '';
  if (raw.deviceId != null) {
    deviceId = String(raw.deviceId);
    if (!ID_PATTERN.test(deviceId)) return { error: 'deviceId 必须是 1..64 位字母数字' };
  }
  let appVersion = '';
  if (raw.appVersion != null) {
    appVersion = String(raw.appVersion);
    if (appVersion.length > 32) return { error: 'appVersion 最多 32 字符' };
  }

  let eventId = '';
  if (!DAILY_EVENTS.has(eventName)) {
    eventId = String(raw.eventId || '');
    if (!EVENT_ID_PATTERN.test(eventId)) {
      return { error: `${eventName} 需要 8..64 位字母数字的 eventId` };
    }
  }
  if (!uid && !visitorId && !deviceId) {
    return { error: '未登录时必须提供 visitorId 或 deviceId' };
  }

  const props = validateProps(eventName, raw.props);
  if (props.error) return { error: props.error };

  return {
    value: {
      event: eventName,
      eventId,
      visitorId,
      deviceId,
      platform,
      appVersion,
      localDate: raw.localDate,
      tzOffset,
      props: props.value,
    },
  };
}

function docIdOf(event, uid) {
  if (event.event === 'app.open') {
    const account = uid || event.visitorId || event.deviceId;
    const device = event.visitorId || event.deviceId || '-';
    return `evt:app.open:${account}:${device}:${event.localDate}`;
  }
  if (event.event === 'account.signup') {
    const account = uid || event.visitorId || event.deviceId;
    return `evt:account.signup:${account}:${event.localDate}`;
  }
  return `evt:${event.event}:${event.eventId}`;
}

/** 去掉 undefined，避免驱动把缺失字段写成非法值。 */
function compact(row) {
  const output = {};
  for (const [key, value] of Object.entries(row)) {
    if (value !== undefined) output[key] = value;
  }
  return output;
}

async function loadExisting(ids) {
  const result = await db
    .collection('ops_events')
    .where({ _id: _.in(ids) })
    .limit(ids.length)
    .get();
  const rows = (result && result.data) || [];
  return new Set(rows.map((row) => row._id));
}

/**
 * 维护 user_first_seen：首次写入 firstSeen*，之后只推进 lastSeen*，signupAt 只写一次。
 * 派生表失败不影响事件写入结果。
 */
async function touchFirstSeen(uid, event, now) {
  if (!uid) return false;
  const collection = db.collection('user_first_seen');
  const id = uid;
  let existing = null;
  try {
    const result = await collection.doc(id).get();
    existing = result && result.data && (Array.isArray(result.data) ? result.data[0] : result.data);
  } catch (error) {
    if (!isMissingCollection(error)) throw error;
  }

  if (!existing) {
    const row = compact({
      _id: id,
      userId: uid,
      firstSeenDate: event.localDate,
      firstSeenAt: now,
      firstPlatform: event.platform,
      firstAppVersion: event.appVersion,
      signupAt: event.event === 'account.signup' ? now : undefined,
      lastSeenDate: event.localDate,
      lastSeenAt: now,
      schemaVersion: SCHEMA_VERSION,
    });
    try {
      await collection.add(row);
      return true;
    } catch (error) {
      if (!isDuplicateKey(error)) throw error;
      existing = null;
    }
  }

  const patch = {};
  if (!existing || String(event.localDate) > String(existing.lastSeenDate || '')) {
    patch.lastSeenDate = event.localDate;
  }
  if (!existing || now > Number(existing.lastSeenAt || 0)) patch.lastSeenAt = now;
  if (event.event === 'account.signup' && !(existing && existing.signupAt)) patch.signupAt = now;
  if (Object.keys(patch).length) await collection.doc(id).update(patch);
  return true;
}

exports.main = async (event, context) => {
  const requestId = (context && (context.request_id || context.requestId)) || `req-${Date.now()}`;
  const now = Date.now();
  const payload = event || {};
  const list = Array.isArray(payload.events) ? payload.events : null;

  if (!list || !list.length) {
    return fail('ops_invalid_payload', 'events 必须是非空数组', 400, false, requestId);
  }
  if (list.length > MAX_BATCH) {
    return fail('ops_batch_too_large', `单次最多 ${MAX_BATCH} 条事件`, 413, false, requestId);
  }

  const uid = resolveUid();
  const rows = [];
  const seen = new Set();
  let duplicates = 0;

  for (let index = 0; index < list.length; index += 1) {
    const validated = validateEvent(list[index], uid, now);
    if (validated.error) {
      return fail('ops_invalid_event', `${validated.error}（第 ${index + 1} 条）`, 400, false, requestId);
    }
    const item = validated.value;
    const id = docIdOf(item, uid);
    if (seen.has(id)) {
      duplicates += 1;
      continue;
    }
    seen.add(id);
    rows.push(
      compact({
        _id: id,
        event: item.event,
        userId: uid,
        visitorId: item.visitorId,
        deviceId: item.deviceId,
        platform: item.platform,
        appVersion: item.appVersion,
        localDate: item.localDate,
        at: now,
        tzOffset: item.tzOffset,
        props: item.props,
        source: 'client',
        schemaVersion: SCHEMA_VERSION,
      }),
    );
  }

  let existingIds;
  try {
    existingIds = rows.length ? await loadExisting(rows.map((row) => row._id)) : new Set();
  } catch (error) {
    if (isMissingCollection(error)) {
      return fail('ops_collection_missing', 'ops_events 尚未创建', 503, true, requestId);
    }
    console.error('[ops-event] load existing failed', requestId, error && (error.stack || error.message));
    return fail('ops_read_failed', '事件表读取失败，请稍后重试', 503, true, requestId);
  }

  let accepted = 0;
  let failed = 0;
  let firstSeenTouched = false;

  for (const row of rows) {
    if (existingIds.has(row._id)) {
      duplicates += 1;
      continue;
    }
    try {
      await db.collection('ops_events').add(row);
      accepted += 1;
      try {
        if (await touchFirstSeen(uid, row, now)) firstSeenTouched = true;
      } catch (error) {
        console.warn(
          '[ops-event] user_first_seen upsert failed',
          requestId,
          error && (error.message || error),
        );
      }
    } catch (error) {
      if (isDuplicateKey(error)) {
        duplicates += 1;
      } else {
        failed += 1;
        console.error('[ops-event] add failed', requestId, row._id, error && (error.message || error));
      }
    }
  }

  if (failed) {
    return {
      ok: false,
      code: 'ops_write_partial',
      message: `部分事件写入失败：成功 ${accepted}，失败 ${failed}`,
      status: 500,
      retriable: true,
      accepted,
      duplicates,
      requestId,
    };
  }

  return {
    ok: true,
    data: { accepted, duplicates, firstSeen: firstSeenTouched },
    serverTime: Date.now(),
    requestId,
  };
};
