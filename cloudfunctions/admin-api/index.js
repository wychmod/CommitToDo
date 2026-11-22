'use strict';

/**
 * admin-api：内部管理站唯一云端入口。
 *
 * 约束：
 * - 每个 action 进入前独立鉴权，只允许 ADMIN_EMAILS 白名单邮箱。
 * - 不信任请求里的 email / userId 作为身份依据。
 * - 只读接口先交付；写接口保留 tables.update，未开放时返回 admin_not_implemented。
 * - 新增表由数据库线创建，本函数只读；不建表、不写测试业务数据。
 */

const tcb = require('@cloudbase/node-sdk');

const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV });
const db = app.database();
const _ = db.command;

const SCHEMA_VERSION = 1;
const MAX_LIMIT = 100;
const MAX_EVENT_ROWS = 20000;

// ---------------------------------------------------------------------------
// 表注册表
// ---------------------------------------------------------------------------

/**
 * timeField 用于 from/to 过滤；没有时间字段的表不支持范围过滤。
 * writeFields 为空表示只读。
 */
const TABLES = {
  branches: {
    label: '分支',
    timeField: 'createdAt',
    writeFields: ['title', 'goal', 'color'],
    searchFields: ['title', 'goal'],
  },
  tasks: {
    label: '待办',
    timeField: 'createdAt',
    writeFields: ['title', 'note', 'dueDate', 'plannedDate', 'order'],
    searchFields: ['title', 'note'],
  },
  commits: {
    label: '提交',
    timeField: 'at',
    writeFields: ['summary'],
    searchFields: ['summary'],
  },
  milestones: {
    label: '里程碑',
    timeField: 'achievedAt',
    writeFields: ['title', 'note'],
    searchFields: ['title', 'note'],
  },
  badges: {
    label: '徽章',
    timeField: 'grantedAt',
    writeFields: [],
    searchFields: [],
  },
  settings: {
    label: '设置',
    timeField: 'updatedAt',
    writeFields: ['theme', 'treeDensity', 'annotations', 'reminderEnabled'],
    searchFields: [],
  },
  year_reviews: {
    label: '年度回顾',
    timeField: 'updatedAt',
    writeFields: ['note'],
    searchFields: ['note'],
  },
  users: {
    label: '账号',
    timeField: 'createdAt',
    writeFields: [],
    searchFields: ['email', 'nickName'],
  },
  devices: {
    label: '设备',
    timeField: 'lastSyncAt',
    writeFields: [],
    searchFields: [],
  },
  events: {
    label: '业务事件',
    timeField: 'at',
    writeFields: [],
    searchFields: ['action'],
  },
  backups: {
    label: '备份',
    timeField: 'createdAt',
    writeFields: [],
    searchFields: [],
  },
  outbox: {
    label: '同步幂等日志',
    timeField: 'appliedAt',
    writeFields: [],
    searchFields: [],
  },
  conflicts: {
    label: '同步冲突',
    timeField: 'createdAt',
    writeFields: [],
    searchFields: [],
  },
  migration_state: {
    label: '迁移断点',
    timeField: 'updatedAt',
    writeFields: [],
    searchFields: [],
  },
  counters: {
    label: '匿名计数',
    timeField: 'updatedAt',
    writeFields: [],
    searchFields: [],
  },
  ops_events: {
    label: '运营事件',
    timeField: 'at',
    writeFields: [],
    searchFields: ['event'],
  },
  user_first_seen: {
    label: '账号首见',
    timeField: 'firstSeenAt',
    writeFields: [],
    searchFields: [],
  },
  admin_audit_log: {
    label: '管理审计',
    timeField: 'at',
    writeFields: [],
    searchFields: ['action', 'collection'],
  },
};

const EVENT_NAMES = [
  'app.open',
  'account.signup',
  'sync.push',
  'backup.upload',
  'commit.create',
  'task.complete',
  'branch.create',
  'milestone.create',
  'badge.grant',
  'review.open',
];

const METRIC_DEFS = [
  { key: 'dau', label: '日活（账号）', source: 'ops_events', note: '当天有 app.open 的去重账号' },
  { key: 'dauDevice', label: '日活（设备）', source: 'ops_events', note: '当天有 app.open 的去重安装' },
  { key: 'wau', label: '周活', source: 'ops_events', note: '近 7 个自然日去重账号' },
  { key: 'mau', label: '月活', source: 'ops_events', note: '近 30 个自然日去重账号' },
  { key: 'newUsers', label: '新增账号', source: 'user_first_seen', note: '按首见日分桶' },
  { key: 'syncDevices', label: '同步设备（7 天）', source: 'ops_events', note: '有成功 sync.push 的去重设备' },
  { key: 'syncSuccessRate', label: '同步成功率', source: 'ops_events', note: '成功 / 全部 sync.push' },
  { key: 'backupSuccess', label: '备份成功', source: 'ops_events', note: 'backup.upload result=success' },
  { key: 'backupFailure', label: '备份失败', source: 'ops_events', note: 'backup.upload result=failed' },
  { key: 'commitUsers', label: '提交活跃账号', source: 'commits', note: '当天有有效提交的去重账号' },
  { key: 'commits', label: '每日提交数', source: 'commits', note: '有效提交总数' },
  { key: 'newBranches', label: '新增分支', source: 'branches', note: '按 createdAt 本地日分桶' },
];

// ---------------------------------------------------------------------------
// 通用工具
// ---------------------------------------------------------------------------

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

function ok(data, requestId) {
  return { ok: true, data, serverTime: Date.now(), requestId: requestId || '' };
}

function isMissingCollection(error) {
  const message = String((error && (error.message || error.errMsg)) || error || '');
  return /not exist|not found|不存在|DATABASE_COLLECTION_NOT_EXIST|collection.*missing/i.test(message);
}

function isMissingIndex(error) {
  const message = String((error && (error.message || error.errMsg)) || error || '');
  return /index|索引|no index/i.test(message);
}

function normalizeEmail(value) {
  return String(value == null ? '' : value).trim().toLowerCase();
}

function parseWhitelist(raw) {
  return String(raw || '')
    .split(',')
    .map((item) => normalizeEmail(item))
    .filter(Boolean);
}

function maskEmail(email) {
  const value = normalizeEmail(email);
  const at = value.indexOf('@');
  if (at <= 0) return value ? '***' : '';
  const name = value.slice(0, at);
  const domain = value.slice(at + 1);
  const head = name.slice(0, 1);
  return `${head}***@${domain}`;
}

function maskRow(collection, row) {
  if (!row || typeof row !== 'object') return row;
  const copy = { ...row };
  if (collection === 'users') {
    for (const key of ['passwordHash', 'password', 'salt', 'token', 'secret', 'apiKey', 'authorization']) {
      if (key in copy) delete copy[key];
    }
    if (typeof copy.email === 'string') {
      copy.email = maskEmail(copy.email);
      copy.emailMasked = true;
    }
  }
  if ((collection === 'outbox' || collection === 'backups') && 'payload' in copy) {
    delete copy.payload;
    copy.payloadOmitted = true;
  }
  return copy;
}

function assertCollection(collection, requestId) {
  if (!Object.prototype.hasOwnProperty.call(TABLES, collection)) {
    return fail('admin_table_not_allowed', '该表不在管理站允许清单内', 403, false, requestId);
  }
  return null;
}

function clampLimit(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 50;
  return Math.min(Math.floor(parsed), MAX_LIMIT);
}

function isValidDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function todayLocalDate(tzOffsetMinutes) {
  const offset = Number.isFinite(Number(tzOffsetMinutes)) ? Number(tzOffsetMinutes) : 480;
  const date = new Date(Date.now() + offset * 60 * 1000);
  return date.toISOString().slice(0, 10);
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function dayDiff(from, to) {
  const a = new Date(`${from}T00:00:00.000Z`).getTime();
  const b = new Date(`${to}T00:00:00.000Z`).getTime();
  return Math.round((b - a) / 86400000);
}

function rangeDays(from, to) {
  const total = dayDiff(from, to);
  if (!Number.isFinite(total) || total < 0) return [];
  return Array.from({ length: total + 1 }, (_, index) => addDays(from, index));
}

async function collectionExists(collection) {
  try {
    await db.collection(collection).limit(1).get();
    return true;
  } catch (error) {
    if (isMissingCollection(error)) return false;
    throw error;
  }
}

async function fetchPage(collection, query, max) {
  const rows = [];
  let cursor = null;
  const pageSize = 100;
  while (rows.length < max) {
    const conditions = { ...(query || {}) };
    if (cursor) conditions._id = _.lt(cursor);
    let ref = db.collection(collection);
    if (Object.keys(conditions).length) ref = ref.where(conditions);
    const result = await ref.orderBy('_id', 'desc').limit(pageSize).get();
    const page = (result && result.data) || [];
    if (!page.length) break;
    rows.push(...page);
    if (page.length < pageSize) break;
    cursor = page[page.length - 1]._id;
  }
  return rows.slice(0, max);
}

// ---------------------------------------------------------------------------
// 鉴权
// ---------------------------------------------------------------------------

async function resolveCaller(eventInfo) {
  const auth = app.auth();
  let uid = '';
  try {
    const info = auth.getUserInfo() || {};
    uid = info.uid || '';
  } catch (_) {
    uid = '';
  }
  if (!uid && eventInfo && eventInfo.userInfo && eventInfo.userInfo.uid) {
    uid = eventInfo.userInfo.uid;
  }
  if (!uid) return { code: 'admin_unauthenticated' };

  let userInfo = null;
  try {
    if (typeof auth.getEndUserInfo === 'function') {
      const result = await auth.getEndUserInfo(uid);
      userInfo = (result && (result.userInfo || result)) || null;
    } else if (typeof auth.queryUserInfo === 'function') {
      const result = await auth.queryUserInfo({ uid });
      userInfo = (result && (result.userInfo || result)) || null;
    }
  } catch (error) {
    return { code: 'admin_identity_unresolved', detail: String(error && error.message ? error.message : error) };
  }
  if (!userInfo) return { code: 'admin_identity_unresolved' };

  return { uid, userInfo };
}

async function authorize(eventInfo) {
  const caller = await resolveCaller(eventInfo);
  if (caller.code === 'admin_unauthenticated') {
    return { error: fail('admin_unauthenticated', '未登录或登录已失效', 401, false) };
  }
  if (caller.code === 'admin_identity_unresolved') {
    return {
      error: fail('admin_identity_unresolved', '无法读取账号资料，请稍后重试', 502, true),
    };
  }

  const userInfo = caller.userInfo || {};
  const email = normalizeEmail(userInfo.email);
  const verifiedFlag =
    typeof userInfo.emailVerified === 'boolean'
      ? userInfo.emailVerified
      : typeof userInfo.email_verified === 'boolean'
        ? userInfo.email_verified
        : undefined;
  const verificationMode = String(process.env.ADMIN_EMAIL_VERIFICATION_MODE || 'enforce')
    .trim()
    .toLowerCase();

  if (!email) {
    return {
      error: fail('admin_email_unverified', '当前账号没有可用邮箱，无法进入管理站', 403, false),
      email,
    };
  }
  if (verifiedFlag === false) {
    return {
      error: fail('admin_email_unverified', '邮箱尚未验证，请先完成邮箱验证', 403, false),
      email,
    };
  }
  if (verifiedFlag === undefined && verificationMode !== 'trust-login') {
    return {
      error: fail(
        'admin_email_unverified',
        '无法确认邮箱验证状态；请完成邮箱验证，或由运维确认登录已强制验证后切换 ADMIN_EMAIL_VERIFICATION_MODE',
        403,
        false,
      ),
      email,
    };
  }

  const whitelist = parseWhitelist(process.env.ADMIN_EMAILS);
  if (!whitelist.length) {
    return {
      error: fail('admin_forbidden', '管理站白名单未配置，已默认拒绝所有访问', 403, false),
      email,
    };
  }
  if (!whitelist.includes(email)) {
    return {
      error: fail('admin_forbidden', '当前账号不在管理站白名单', 403, false),
      email,
    };
  }

  return { uid: caller.uid, email, role: 'admin' };
}

/**
 * 每个 action 都通过这里进入，避免某个接口漏掉鉴权。
 */
function requireAdmin(handler) {
  return async (event, context, requestId) => {
    const auth = await authorize(event);
    if (auth.error) {
      auth.error.requestId = requestId;
      return auth.error;
    }
    return handler({ event, context, requestId, auth });
  };
}

// ---------------------------------------------------------------------------
// 只读接口
// ---------------------------------------------------------------------------

async function handleWhoami({ requestId, auth }) {
  return ok({ uid: auth.uid, email: auth.email, role: auth.role }, requestId);
}

async function handleMetaContract({ requestId }) {
  const collections = Object.entries(TABLES).map(([name, def]) => ({
    name,
    label: def.label,
    read: true,
    write: def.writeFields.length > 0,
    writableFields: def.writeFields,
    timeField: def.timeField,
  }));
  return ok(
    {
      schemaVersion: SCHEMA_VERSION,
      collections,
      eventNames: EVENT_NAMES,
      metrics: METRIC_DEFS,
      writeEnabled: false,
    },
    requestId,
  );
}

async function handleTablesList({ requestId }) {
  const names = Object.keys(TABLES);
  const readiness = await Promise.all(
    names.map(async (name) => {
      try {
        return [name, await collectionExists(name)];
      } catch (_) {
        return [name, false];
      }
    }),
  );
  const readyMap = Object.fromEntries(readiness);
  const tables = names.map((name) => {
    const def = TABLES[name];
    return {
      name,
      label: def.label,
      read: true,
      write: def.writeFields.length > 0,
      writableFields: def.writeFields,
      timeField: def.timeField,
      ready: readyMap[name],
    };
  });
  return ok({ tables }, requestId);
}

async function handleTablesRows({ event, requestId }) {
  const collection = String(event.collection || '');
  const invalid = assertCollection(collection, requestId);
  if (invalid) return invalid;

  const def = TABLES[collection];
  const limit = clampLimit(event.limit);
  const query = {};

  if (event.ownerId) query.ownerId = String(event.ownerId);
  if (def.timeField && (event.from || event.to)) {
    const from = event.from;
    const to = event.to;
    if (from && !isValidDate(from) && !Number.isFinite(Number(from))) {
      return fail('admin_invalid_params', 'from 需要是 YYYY-MM-DD 或时间戳', 400, false, requestId);
    }
    if (to && !isValidDate(to) && !Number.isFinite(Number(to))) {
      return fail('admin_invalid_params', 'to 需要是 YYYY-MM-DD 或时间戳', 400, false, requestId);
    }
    const range = [];
    if (from) range.push(_.gte(from));
    if (to) range.push(_.lte(to));
    query[def.timeField] = range.length === 1 ? range[0] : _.and(range);
  }

  if (event.cursor) query._id = _.lt(String(event.cursor));

  let rows;
  try {
    let ref = db.collection(collection);
    if (Object.keys(query).length) ref = ref.where(query);
    const result = await ref.orderBy('_id', 'desc').limit(limit + 1).get();
    rows = (result && result.data) || [];
  } catch (error) {
    if (isMissingCollection(error)) {
      return fail('admin_collection_missing', `表 ${collection} 尚未创建`, 503, true, requestId);
    }
    if (isMissingIndex(error)) {
      return fail(
        'admin_collection_missing',
        `表 ${collection} 缺少查询所需索引，暂不能按该条件浏览`,
        503,
        false,
        requestId,
      );
    }
    throw error;
  }

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  let filtered = page;
  if (event.q && def.searchFields.length) {
    const keyword = String(event.q).trim().toLowerCase();
    if (keyword) {
      filtered = page.filter((row) =>
        def.searchFields.some((field) =>
          String(row[field] == null ? '' : row[field]).toLowerCase().includes(keyword),
        ),
      );
    }
  }

  return ok(
    {
      rows: filtered.map((row) => maskRow(collection, row)),
      nextCursor: hasMore && page.length ? page[page.length - 1]._id : null,
      maskedFields: collection === 'users' ? ['email'] : [],
      note: event.q ? '当前关键词只过滤本页结果' : undefined,
    },
    requestId,
  );
}

async function handleTablesRow({ event, requestId }) {
  const collection = String(event.collection || '');
  const invalid = assertCollection(collection, requestId);
  if (invalid) return invalid;
  const id = String(event.id || '');
  if (!id) return fail('admin_invalid_params', '缺少 id', 400, false, requestId);
  try {
    const result = await db.collection(collection).doc(id).get();
    const row = result && result.data && (Array.isArray(result.data) ? result.data[0] : result.data);
    if (!row) return fail('admin_not_found', '该行不存在', 404, false, requestId);
    return ok(
      {
        row: maskRow(collection, row),
        maskedFields: collection === 'users' ? ['email'] : [],
      },
      requestId,
    );
  } catch (error) {
    if (isMissingCollection(error)) {
      return fail('admin_collection_missing', `表 ${collection} 尚未创建`, 503, true, requestId);
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 指标
// ---------------------------------------------------------------------------

function metricResult(def, value, status, note) {
  return {
    key: def.key,
    label: def.label,
    value,
    status,
    source: def.source,
    note: note || def.note,
  };
}

function groupCountByDate(rows, dateField, valueField) {
  const map = new Map();
  for (const row of rows) {
    const date = row[dateField];
    if (!date) continue;
    if (!map.has(date)) map.set(date, new Set());
    const value = row[valueField];
    if (value != null && value !== '') map.get(date).add(value);
  }
  return map;
}

async function loadEvents(eventName, from, to) {
  const query = { event: eventName, localDate: _.and([_.gte(from), _.lte(to)]) };
  return fetchPage('ops_events', query, MAX_EVENT_ROWS);
}

async function handleMetricsOverview({ event, requestId }) {
  const tzOffset = Number.isFinite(Number(event.tzOffset)) ? Number(event.tzOffset) : 480;
  const to = isValidDate(event.to) ? event.to : todayLocalDate(tzOffset);
  const from = isValidDate(event.from) ? event.from : addDays(to, -6);
  if (dayDiff(from, to) < 0) {
    return fail('admin_invalid_params', 'from 不能晚于 to', 400, false, requestId);
  }

  const metrics = [];
  const notes = [];
  let eventsReady = false;
  let firstSeenReady = false;

  try {
    eventsReady = await collectionExists('ops_events');
  } catch (_) {
    eventsReady = false;
  }
  try {
    firstSeenReady = await collectionExists('user_first_seen');
  } catch (_) {
    firstSeenReady = false;
  }

  if (!eventsReady) {
    notes.push('ops_events 尚未就绪，活跃/留存/同步/备份指标不可用');
    for (const def of METRIC_DEFS.filter((item) => item.source === 'ops_events')) {
      metrics.push(metricResult(def, null, 'not_ready', '事件表未创建'));
    }
  } else {
    try {
      const lookbackFrom = addDays(to, -29);
      const appOpen = await loadEvents('app.open', lookbackFrom, to);
      const openByDate = groupCountByDate(appOpen, 'localDate', 'userId');
      const deviceByDate = groupCountByDate(appOpen, 'localDate', 'visitorId');
      const today = to;
      const dau = (openByDate.get(today) || new Set()).size;
      const dauDevice = (deviceByDate.get(today) || new Set()).size;
      const wauSet = new Set();
      const mauSet = new Set();
      for (const [date, users] of openByDate) {
        if (date >= addDays(to, -6)) users.forEach((uid) => wauSet.add(uid));
        users.forEach((uid) => mauSet.add(uid));
      }
      metrics.push(metricResult(METRIC_DEFS[0], dau, 'ready'));
      metrics.push(metricResult(METRIC_DEFS[1], dauDevice, 'ready'));
      metrics.push(metricResult(METRIC_DEFS[2], wauSet.size, 'ready'));
      metrics.push(metricResult(METRIC_DEFS[3], mauSet.size, 'ready'));

      const syncRows = await loadEvents('sync.push', from, to);
      const syncDevices = new Set();
      let syncTotal = 0;
      let syncSuccess = 0;
      for (const row of syncRows) {
        syncTotal += 1;
        const result = row.props && row.props.result;
        if (result === 'success') {
          syncSuccess += 1;
          if (row.deviceId) syncDevices.add(row.deviceId);
        }
      }
      metrics.push(metricResult(METRIC_DEFS[5], syncDevices.size, 'ready'));
      metrics.push(
        metricResult(
          METRIC_DEFS[6],
          syncTotal ? Number(((syncSuccess / syncTotal) * 100).toFixed(1)) : null,
          syncTotal ? 'ready' : 'insufficient',
          syncTotal ? '单位：%' : '窗口内没有同步事件',
        ),
      );

      const backupRows = await loadEvents('backup.upload', from, to);
      let backupSuccess = 0;
      let backupFailure = 0;
      for (const row of backupRows) {
        const result = row.props && row.props.result;
        if (result === 'success') backupSuccess += 1;
        if (result === 'failed') backupFailure += 1;
      }
      metrics.push(metricResult(METRIC_DEFS[7], backupSuccess, 'ready'));
      metrics.push(metricResult(METRIC_DEFS[8], backupFailure, 'ready'));
    } catch (error) {
      notes.push(`事件指标计算失败：${String(error && error.message ? error.message : error)}`);
      for (const def of METRIC_DEFS.filter((item) => item.source === 'ops_events')) {
        if (!metrics.some((item) => item.key === def.key)) {
          metrics.push(metricResult(def, null, 'not_ready', '事件查询失败'));
        }
      }
    }
  }

  if (!firstSeenReady) {
    metrics.push(metricResult(METRIC_DEFS[4], null, 'not_ready', '首见表未创建'));
  } else {
    try {
      const rows = await fetchPage(
        'user_first_seen',
        { firstSeenDate: _.and([_.gte(from), _.lte(to)]) },
        MAX_EVENT_ROWS,
      );
      metrics.push(metricResult(METRIC_DEFS[4], rows.length, 'ready'));
    } catch (error) {
      if (isMissingCollection(error)) {
        metrics.push(metricResult(METRIC_DEFS[4], null, 'not_ready', '首见表未创建'));
      } else {
        metrics.push(metricResult(METRIC_DEFS[4], null, 'not_ready', '首见表查询失败'));
      }
    }
  }

  // 现有业务表兜底：commits / branches。缺索引时明确标记为未就绪。
  try {
    const commitRows = await fetchPage(
      'commits',
      { date: _.and([_.gte(from), _.lte(to)]) },
      MAX_EVENT_ROWS,
    );
    const valid = commitRows.filter((row) => !row.deletedAt && !row.voidedAt);
    const usersByDate = groupCountByDate(valid, 'date', 'ownerId');
    const todayUsers = (usersByDate.get(to) || new Set()).size;
    const todayCommits = valid.filter((row) => row.date === to).length;
    metrics.push(metricResult(METRIC_DEFS[9], todayUsers, 'ready', '按 commits.date 统计；不含已撤销/已删除'));
    metrics.push(metricResult(METRIC_DEFS[10], todayCommits, 'ready', '按 commits.date 统计；不含已撤销/已删除'));
  } catch (error) {
    const note = isMissingCollection(error)
      ? 'commits 表未创建'
      : isMissingIndex(error)
        ? 'commits 缺少跨账号 date 索引'
        : 'commits 查询失败';
    metrics.push(metricResult(METRIC_DEFS[9], null, 'not_ready', note));
    metrics.push(metricResult(METRIC_DEFS[10], null, 'not_ready', note));
  }

  try {
    const branchRows = await fetchPage(
      'branches',
      { createdAt: _.and([_.gte(Date.parse(`${from}T00:00:00.000Z`)), _.lte(Date.parse(`${to}T23:59:59.999Z`))]) },
      MAX_EVENT_ROWS,
    );
    const valid = branchRows.filter((row) => !row.deletedAt);
    metrics.push(metricResult(METRIC_DEFS[11], valid.length, 'ready', '按 createdAt 统计；不含已删除'));
  } catch (error) {
    const note = isMissingCollection(error)
      ? 'branches 表未创建'
      : isMissingIndex(error)
        ? 'branches 缺少跨账号 createdAt 索引'
        : 'branches 查询失败';
    metrics.push(metricResult(METRIC_DEFS[11], null, 'not_ready', note));
  }

  return ok(
    {
      range: { from, to, timezone: 'Asia/Shanghai', tzOffset },
      availability: {
        opsEvents: eventsReady,
        userFirstSeen: firstSeenReady,
      },
      metrics,
      notes,
    },
    requestId,
  );
}

async function handleMetricsRetention({ event, requestId }) {
  const tzOffset = Number.isFinite(Number(event.tzOffset)) ? Number(event.tzOffset) : 480;
  const to = isValidDate(event.to) ? event.to : todayLocalDate(tzOffset);
  const from = isValidDate(event.from) ? event.from : addDays(to, -6);
  const mode = event.mode === 'any' ? 'any' : 'exact';
  const days = Array.isArray(event.days) && event.days.length ? event.days.map(Number) : [1, 7, 30];

  let firstSeenReady = false;
  let eventsReady = false;
  try {
    firstSeenReady = await collectionExists('user_first_seen');
    eventsReady = await collectionExists('ops_events');
  } catch (_) {
    firstSeenReady = false;
    eventsReady = false;
  }
  if (!firstSeenReady || !eventsReady) {
    return fail(
      'admin_metrics_unavailable',
      'user_first_seen 或 ops_events 尚未就绪，无法计算留存',
      503,
      true,
      requestId,
    );
  }

  const cohortRows = await fetchPage(
    'user_first_seen',
    { firstSeenDate: _.and([_.gte(from), _.lte(to)]) },
    MAX_EVENT_ROWS,
  );
  const cohortMap = new Map();
  for (const row of cohortRows) {
    if (!row.userId || !row.firstSeenDate) continue;
    if (!cohortMap.has(row.firstSeenDate)) cohortMap.set(row.firstSeenDate, new Set());
    cohortMap.get(row.firstSeenDate).add(row.userId);
  }

  const maxDay = Math.max(...days, 0);
  const eventRows = await fetchPage(
    'ops_events',
    {
      event: 'app.open',
      localDate: _.and([_.gte(from), _.lte(addDays(to, maxDay))]),
    },
    MAX_EVENT_ROWS,
  );
  const activeByUser = new Map();
  for (const row of eventRows) {
    if (!row.userId || !row.localDate) continue;
    if (!activeByUser.has(row.userId)) activeByUser.set(row.userId, new Set());
    activeByUser.get(row.userId).add(row.localDate);
  }

  const today = todayLocalDate(tzOffset);
  const cohorts = Array.from(cohortMap.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([cohortDate, users]) => {
      const result = { cohortDate, cohortSize: users.size, model: mode };
      for (const day of days) {
        const target = addDays(cohortDate, day);
        if (target > today) {
          result[`d${day}`] = null;
          continue;
        }
        let retained = 0;
        for (const uid of users) {
          const dates = activeByUser.get(uid);
          if (!dates) continue;
          if (mode === 'exact') {
            if (dates.has(target)) retained += 1;
          } else {
            for (const date of dates) {
              if (date >= target) {
                retained += 1;
                break;
              }
            }
          }
        }
        result[`d${day}`] = users.size ? Number(((retained / users.size) * 100).toFixed(1)) : null;
      }
      return result;
    });

  return ok({ range: { from, to }, mode, days, cohorts }, requestId);
}

async function handleMetricsTimeseries({ event, requestId }) {
  const tzOffset = Number.isFinite(Number(event.tzOffset)) ? Number(event.tzOffset) : 480;
  const to = isValidDate(event.to) ? event.to : todayLocalDate(tzOffset);
  const from = isValidDate(event.from) ? event.from : addDays(to, -29);
  const metric = String(event.metric || 'dau');
  if (!['dau', 'dauDevice', 'newUsers', 'syncSuccess', 'backupSuccess'].includes(metric)) {
    return fail('admin_invalid_params', '暂不支持该时间序列指标', 400, false, requestId);
  }

  let eventsReady = false;
  let firstSeenReady = false;
  try {
    eventsReady = await collectionExists('ops_events');
    firstSeenReady = await collectionExists('user_first_seen');
  } catch (_) {
    eventsReady = false;
    firstSeenReady = false;
  }

  if (metric === 'newUsers') {
    if (!firstSeenReady) {
      return fail('admin_metrics_unavailable', 'user_first_seen 尚未就绪', 503, true, requestId);
    }
    const rows = await fetchPage(
      'user_first_seen',
      { firstSeenDate: _.and([_.gte(from), _.lte(to)]) },
      MAX_EVENT_ROWS,
    );
    const counts = new Map();
    for (const row of rows) {
      if (!row.firstSeenDate) continue;
      counts.set(row.firstSeenDate, (counts.get(row.firstSeenDate) || 0) + 1);
    }
    return ok(
      {
        metric,
        range: { from, to },
        points: rangeDays(from, to).map((date) => ({ date, value: counts.get(date) || 0 })),
      },
      requestId,
    );
  }

  if (!eventsReady) {
    return fail('admin_metrics_unavailable', 'ops_events 尚未就绪', 503, true, requestId);
  }

  const eventName =
    metric === 'dau' || metric === 'dauDevice'
      ? 'app.open'
      : metric === 'syncSuccess'
        ? 'sync.push'
        : 'backup.upload';
  const rows = await loadEvents(eventName, from, to);
  const counts = new Map();
  for (const row of rows) {
    if (!row.localDate) continue;
    let include = true;
    if (metric === 'syncSuccess') include = row.props && row.props.result === 'success';
    if (metric === 'backupSuccess') include = row.props && row.props.result === 'success';
    if (!include) continue;
    if (metric === 'dau') {
      if (!row.userId) continue;
      if (!counts.has(row.localDate)) counts.set(row.localDate, new Set());
      counts.get(row.localDate).add(row.userId);
    } else if (metric === 'dauDevice') {
      if (!row.visitorId) continue;
      if (!counts.has(row.localDate)) counts.set(row.localDate, new Set());
      counts.get(row.localDate).add(row.visitorId);
    } else {
      counts.set(row.localDate, (counts.get(row.localDate) || 0) + 1);
    }
  }

  return ok(
    {
      metric,
      range: { from, to },
      points: rangeDays(from, to).map((date) => {
        const value = counts.get(date);
        return { date, value: value instanceof Set ? value.size : value || 0 };
      }),
    },
    requestId,
  );
}

// ---------------------------------------------------------------------------
// 审计
// ---------------------------------------------------------------------------

async function handleAuditList({ event, requestId }) {
  const limit = clampLimit(event.limit);
  const query = {};
  if (event.collection) query.collection = String(event.collection);
  if (event.docId) query.docId = String(event.docId);
  if (event.actorEmail) query.actorEmail = normalizeEmail(event.actorEmail);
  if (event.from || event.to) {
    const range = [];
    if (event.from) range.push(_.gte(Number(event.from) || 0));
    if (event.to) range.push(_.lte(Number(event.to) || Date.now()));
    query.at = range.length === 1 ? range[0] : _.and(range);
  }

  if (event.cursor) query._id = _.lt(String(event.cursor));

  try {
    let ref = db.collection('admin_audit_log');
    if (Object.keys(query).length) ref = ref.where(query);
    const result = await ref.orderBy('_id', 'desc').limit(limit + 1).get();
    const rows = (result && result.data) || [];
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    return ok(
      {
        rows: page,
        nextCursor: hasMore && page.length ? page[page.length - 1]._id : null,
      },
      requestId,
    );
  } catch (error) {
    if (isMissingCollection(error)) {
      return fail('admin_collection_missing', 'admin_audit_log 尚未创建', 503, true, requestId);
    }
    if (isMissingIndex(error)) {
      return fail('admin_collection_missing', 'admin_audit_log 缺少查询索引', 503, false, requestId);
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 写接口（第二阶段后段开放）
// ---------------------------------------------------------------------------

async function handleTableUpdate({ requestId }) {
  return fail(
    'admin_not_implemented',
    '编辑能力尚未开放；需要先完成 admin_audit_log 与事务写入验收',
    501,
    false,
    requestId,
  );
}

// ---------------------------------------------------------------------------
// 路由
// ---------------------------------------------------------------------------

const ACTIONS = {
  whoami: requireAdmin(handleWhoami),
  'meta.contract': requireAdmin(handleMetaContract),
  'tables.list': requireAdmin(handleTablesList),
  'tables.rows': requireAdmin(handleTablesRows),
  'tables.row': requireAdmin(handleTablesRow),
  'metrics.overview': requireAdmin(handleMetricsOverview),
  'metrics.retention': requireAdmin(handleMetricsRetention),
  'metrics.timeseries': requireAdmin(handleMetricsTimeseries),
  'audit.list': requireAdmin(handleAuditList),
  'tables.update': requireAdmin(handleTableUpdate),
};

exports.main = async (event, context) => {
  const requestId = requestIdOf(context);
  const action = String((event && event.action) || '');
  const handler = ACTIONS[action];
  if (!handler) {
    return fail('admin_invalid_action', `未知管理接口：${action || '(空)'}`, 400, false, requestId);
  }

  try {
    return await handler(event, context, requestId);
  } catch (error) {
    console.error('[admin-api]', requestId, action, error && (error.stack || error.message || error));
    const missing = isMissingCollection(error);
    return fail(
      missing ? 'admin_collection_missing' : 'admin_write_failed',
      missing ? '依赖的云端表尚未创建' : '管理接口执行失败',
      missing ? 503 : 500,
      true,
      requestId,
    );
  }
};
