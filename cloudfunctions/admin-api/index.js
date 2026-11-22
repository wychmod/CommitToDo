'use strict';

/**
 * admin-api：内部管理站唯一云端入口。
 *
 * 约束：
 * - 每个 action 进入前独立鉴权，只允许 ADMIN_EMAILS 白名单邮箱。
 * - 不信任请求里的 email / userId 作为身份依据。
 * - 只读接口与 `tables.update` 均已开放；写接口仅限 §4.2 六张表与字段白名单，
 *   校验 `expectedRev` / `reason`，业务写入与 admin_audit_log 同事务。
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

/**
 * M17 / M18 的事件口径（DESIGN §5.6.4）。
 * 只读 ops_events；不拿业务表估算，缺失时明确返回 not_ready。
 */
const USAGE_EVENT_LABELS = [
  ['branch.create', '建分支', true],
  ['task.complete', '完成待办', true],
  ['commit.create', '创建提交', true],
  ['milestone.create', '新建里程碑', true],
  ['badge.grant', '授予徽章', true],
  ['review.open', '打开回顾', true],
  ['sync.push', '同步推送', true],
  ['backup.upload', '异地备份', true],
];

/** Web 端尚未调用这些事件；M17 对应项保持未接入，不按 0 计算。 */
const USAGE_EVENTS_MISSING = USAGE_EVENT_LABELS.filter((item) => !item[2]).map((item) => item[0]);

const FUNNEL_STEPS = [
  { key: 'signup', label: '注册', event: 'account.signup' },
  { key: 'branch', label: '建分支', event: 'branch.create' },
  { key: 'task', label: '完成待办', event: 'task.complete' },
  { key: 'commit', label: '首次提交', event: 'commit.create' },
  { key: 'sync', label: '首次同步', event: 'sync.push' },
];

/** 漏斗观察窗：注册当日起 30 天，且不晚于今天。 */
const FUNNEL_WINDOW_DAYS = 30;

function percentOf(part, whole) {
  if (!whole) return null;
  return Number(((part / whole) * 100).toFixed(1));
}

function emptyFunnel(status, note) {
  return {
    status,
    cohortSource: null,
    cohort: 0,
    windowDays: FUNNEL_WINDOW_DAYS,
    steps: FUNNEL_STEPS.map((step) => ({
      key: step.key,
      label: step.label,
      users: 0,
      rate: null,
    })),
    strictUsers: null,
    strictRate: null,
    note: note || '',
  };
}

function emptyUsage(status, note) {
  return {
    status,
    counts: USAGE_EVENT_LABELS.map(([event, label, implemented]) => ({
      event,
      label,
      value: null,
      implemented,
    })),
    missing: USAGE_EVENTS_MISSING.slice(),
    note: note || '',
  };
}

/**
 * M18：cohort 内去重用户数。
 * - cohort 优先取 [from,to] 的 account.signup 去重 userId；
 *   没有注册事件时回退 user_first_seen.firstSeenDate（DESIGN §5.6.4）。
 * - 每步只计一次；观察窗 [注册日, min(today, 注册日+30)]。
 * - 严格路径：各步首次发生日按 注册→建分支→完成待办→首次提交→首次同步 非递减。
 */
async function buildFunnel({ from, to, today, eventsReady, cohortRows }) {
  if (!eventsReady) {
    return emptyFunnel('not_ready', 'ops_events 尚未创建，漏斗无法计算');
  }

  const cohort = new Map();
  let cohortSource = 'account.signup';
  const signupRows = await loadEvents('account.signup', from, to);
  for (const row of signupRows) {
    if (!row.userId || !row.localDate) continue;
    const previous = cohort.get(row.userId);
    if (!previous || row.localDate < previous) cohort.set(row.userId, row.localDate);
  }
  if (cohort.size === 0) {
    cohortSource = 'user_first_seen';
    for (const row of cohortRows) {
      const userId = row.userId || row._id;
      if (userId && row.firstSeenDate) cohort.set(userId, row.firstSeenDate);
    }
  }
  if (cohort.size === 0) {
    return emptyFunnel('insufficient', '窗口内没有注册样本');
  }

  const windowEnd = addDays(to, FUNNEL_WINDOW_DAYS) < today ? addDays(to, FUNNEL_WINDOW_DAYS) : today;
  const stepEvents = FUNNEL_STEPS.slice(1).map((step) => step.event);
  const rows = await fetchPage(
    'ops_events',
    {
      event: _.in(stepEvents),
      localDate: _.and([_.gte(from), _.lte(windowEnd)]),
    },
    MAX_EVENT_ROWS,
  );

  const firstByUser = new Map();
  for (const row of rows) {
    if (!row.userId || !row.localDate) continue;
    const signupDate = cohort.get(row.userId);
    if (!signupDate) continue;
    const limit = addDays(signupDate, FUNNEL_WINDOW_DAYS);
    const end = limit < today ? limit : today;
    if (row.localDate < signupDate || row.localDate > end) continue;
    if (!firstByUser.has(row.userId)) firstByUser.set(row.userId, new Map());
    const steps = firstByUser.get(row.userId);
    const previous = steps.get(row.event);
    if (!previous || row.localDate < previous) steps.set(row.event, row.localDate);
  }

  const stepUsers = FUNNEL_STEPS.map((step, index) => {
    if (index === 0) return cohort.size;
    let users = 0;
    for (const steps of firstByUser.values()) {
      if (steps.has(step.event)) users += 1;
    }
    return users;
  });

  let strictUsers = 0;
  for (const steps of firstByUser.values()) {
    const dates = stepEvents.map((event) => steps.get(event));
    if (dates.some((date) => !date)) continue;
    let ordered = true;
    for (let index = 1; index < dates.length; index += 1) {
      if (dates[index] < dates[index - 1]) {
        ordered = false;
        break;
      }
    }
    if (ordered) strictUsers += 1;
  }

  return {
    status: 'ready',
    cohortSource,
    cohort: cohort.size,
    windowDays: FUNNEL_WINDOW_DAYS,
    steps: FUNNEL_STEPS.map((step, index) => ({
      key: step.key,
      label: step.label,
      users: stepUsers[index],
      rate: percentOf(stepUsers[index], cohort.size),
    })),
    strictUsers,
    strictRate: percentOf(strictUsers, cohort.size),
    note: '',
  };
}

// ---------------------------------------------------------------------------
// 通用工具
// ---------------------------------------------------------------------------

function requestIdOf(context) {
  return (context && (context.request_id || context.requestId)) || `req-${Date.now()}`;
}

function fail(code, message, status, retriable, requestId, extra) {
  return {
    ok: false,
    code,
    message,
    status: status || 400,
    retriable: Boolean(retriable),
    requestId: requestId || '',
    ...(extra || {}),
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

async function resolveCaller() {
  const auth = app.auth();
  let uid = '';
  try {
    const info = auth.getUserInfo() || {};
    uid = info.uid || '';
  } catch (_) {
    uid = '';
  }
  // 只信任平台注入的调用身份；请求体里的 userInfo 一律忽略，避免伪造 uid。
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

async function authorize() {
  const caller = await resolveCaller();
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
    const auth = await authorize();
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
      writeEnabled: true,
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

async function existsOrFalse(name) {
  try {
    return await collectionExists(name);
  } catch (_) {
    return false;
  }
}

/**
 * 精确日留存：cohort 来自 user_first_seen.firstSeenDate，
 * 分子只统计 cohort 内用户在 C+n 当天有 app.open。
 * 未成熟（C+n > today）输出 null，不拿 0 填充；无 mature cohort 返回 insufficient。
 */
function buildRetention(cohortRows, activeByUser, today, days, ready) {
  if (!ready) {
    return {
      mode: 'exact',
      status: 'not_ready',
      stats: days.map((day) => ({ day, value: null, status: 'not_ready' })),
      cohorts: [],
    };
  }
  const cohortMap = new Map();
  for (const row of cohortRows) {
    if (!row.userId || !row.firstSeenDate) continue;
    if (!cohortMap.has(row.firstSeenDate)) cohortMap.set(row.firstSeenDate, new Set());
    cohortMap.get(row.firstSeenDate).add(row.userId);
  }
  const totals = new Map(days.map((day) => [day, { retained: 0, size: 0 }]));
  const cohorts = [];
  const ordered = Array.from(cohortMap.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  for (const [cohortDate, users] of ordered) {
    const entry = { cohortDate, cohortSize: users.size };
    let matured = false;
    for (const day of days) {
      const target = addDays(cohortDate, day);
      if (target > today) {
        entry[`d${day}`] = null;
        continue;
      }
      matured = true;
      let retained = 0;
      for (const uid of users) {
        const dates = activeByUser.get(uid);
        if (dates && dates.has(target)) retained += 1;
      }
      entry[`d${day}`] = users.size ? Number(((retained / users.size) * 100).toFixed(1)) : null;
      const total = totals.get(day);
      total.retained += retained;
      total.size += users.size;
    }
    entry.matured = matured;
    cohorts.push(entry);
  }
  const stats = days.map((day) => {
    const total = totals.get(day);
    if (!total || !total.size) return { day, value: null, status: 'insufficient' };
    return {
      day,
      value: Number(((total.retained / total.size) * 100).toFixed(1)),
      status: 'ready',
    };
  });
  return {
    mode: 'exact',
    status: stats.some((item) => item.status === 'ready') ? 'ready' : 'insufficient',
    stats,
    cohorts: cohorts.slice(0, 3),
  };
}

async function handleMetricsOverview({ event, requestId }) {
  const tzOffset = Number.isFinite(Number(event.tzOffset)) ? Number(event.tzOffset) : 480;
  const to = isValidDate(event.to) ? event.to : todayLocalDate(tzOffset);
  const from = isValidDate(event.from) ? event.from : addDays(to, -6);
  if (dayDiff(from, to) < 0) {
    return fail('admin_invalid_params', 'from 不能晚于 to', 400, false, requestId);
  }

  const today = todayLocalDate(tzOffset);
  const days = [1, 7, 30];
  const notes = [];
  const metrics = [];

  const eventsReady = await existsOrFalse('ops_events');
  const firstSeenReady = await existsOrFalse('user_first_seen');

  let openRows = [];
  let openByDate = new Map();
  let compareByDate = new Map();
  let deviceByDate = new Map();
  let syncRows = [];
  let backupRows = [];
  let cohortRows = [];
  let eventsComputed = false;

  if (!eventsReady) {
    notes.push('ops_events 尚未就绪，活跃/留存/同步/备份指标不可用');
    for (const def of METRIC_DEFS.filter((item) => item.source === 'ops_events')) {
      metrics.push(metricResult(def, null, 'not_ready', '事件表未创建'));
    }
  } else {
    try {
      const lookbackFrom = addDays(to, -29);
      const fetchFrom = from < lookbackFrom ? from : lookbackFrom;
      openRows = await loadEvents('app.open', fetchFrom, to);
      openByDate = groupCountByDate(openRows, 'localDate', 'userId');
      deviceByDate = groupCountByDate(openRows, 'localDate', 'visitorId');
      const dau = (openByDate.get(to) || new Set()).size;
      const dauDevice = (deviceByDate.get(to) || new Set()).size;
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

      // 上期对比：取等长的前一个区间，按相同位移映射到当天。
      const span = rangeDays(from, to).length;
      try {
        const compareRows = await loadEvents('app.open', addDays(from, -span), addDays(to, -span));
        compareByDate = groupCountByDate(compareRows, 'localDate', 'userId');
      } catch (compareError) {
        notes.push(
          `上期对比计算失败：${String(
            compareError && compareError.message ? compareError.message : compareError,
          )}`,
        );
      }

      syncRows = await loadEvents('sync.push', from, to);
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

      backupRows = await loadEvents('backup.upload', from, to);
      let backupSuccess = 0;
      let backupFailure = 0;
      for (const row of backupRows) {
        const result = row.props && row.props.result;
        if (result === 'success') backupSuccess += 1;
        if (result === 'failed') backupFailure += 1;
      }
      metrics.push(metricResult(METRIC_DEFS[7], backupSuccess, 'ready'));
      metrics.push(metricResult(METRIC_DEFS[8], backupFailure, 'ready'));
      eventsComputed = true;
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
      cohortRows = await fetchPage(
        'user_first_seen',
        { firstSeenDate: _.and([_.gte(from), _.lte(to)]) },
        MAX_EVENT_ROWS,
      );
      metrics.push(metricResult(METRIC_DEFS[4], cohortRows.length, 'ready'));
    } catch (error) {
      if (isMissingCollection(error)) {
        metrics.push(metricResult(METRIC_DEFS[4], null, 'not_ready', '首见表未创建'));
      } else {
        metrics.push(metricResult(METRIC_DEFS[4], null, 'not_ready', '首见表查询失败'));
      }
    }
  }

  // 现有业务表兜底：commits / branches。缺索引时明确标记为未就绪。
  let commitsBlock = {
    status: 'not_ready',
    activeUsers: null,
    total: null,
    points: [],
  };
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

    const perDay = new Map();
    const owners = new Set();
    for (const row of valid) {
      if (row.date) perDay.set(row.date, (perDay.get(row.date) || 0) + 1);
      if (row.ownerId) owners.add(row.ownerId);
    }
    commitsBlock = {
      status: 'ready',
      activeUsers: owners.size,
      total: valid.length,
      points: rangeDays(from, to).map((date) => ({ date, value: perDay.get(date) || 0 })),
    };
  } catch (error) {
    const note = isMissingCollection(error)
      ? 'commits 表未创建'
      : isMissingIndex(error)
        ? 'commits 缺少跨账号 date 索引'
        : 'commits 查询失败';
    metrics.push(metricResult(METRIC_DEFS[9], null, 'not_ready', note));
    metrics.push(metricResult(METRIC_DEFS[10], null, 'not_ready', note));
    commitsBlock.status = 'not_ready';
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

  const signupCounts = new Map();
  for (const row of cohortRows) {
    if (!row.firstSeenDate) continue;
    signupCounts.set(row.firstSeenDate, (signupCounts.get(row.firstSeenDate) || 0) + 1);
  }
  const seriesDays = rangeDays(from, to);
  const seriesSpan = seriesDays.length;
  const series = eventsComputed
    ? seriesDays.map((date) => ({
        date,
        active: (openByDate.get(date) || new Set()).size,
        signups: signupCounts.get(date) || 0,
        compare: (compareByDate.get(addDays(date, -seriesSpan)) || new Set()).size,
      }))
    : null;

  let retention = buildRetention([], new Map(), today, days, false);
  if (eventsReady && firstSeenReady) {
    try {
      const end = today > to ? today : to;
      const activeRows = await loadEvents('app.open', from, end);
      const activeByUser = new Map();
      for (const row of activeRows) {
        if (!row.userId || !row.localDate) continue;
        if (!activeByUser.has(row.userId)) activeByUser.set(row.userId, new Set());
        activeByUser.get(row.userId).add(row.localDate);
      }
      retention = buildRetention(cohortRows, activeByUser, today, days, true);
    } catch (error) {
      notes.push(`留存计算失败：${String(error && error.message ? error.message : error)}`);
    }
  }

  let sync = {
    status: eventsComputed ? 'insufficient' : 'not_ready',
    successRate: null,
    total: null,
    success: null,
    conflict: null,
    failed: null,
    devices: null,
  };
  if (eventsComputed) {
    let total = 0;
    let success = 0;
    let conflict = 0;
    let failed = 0;
    const devices = new Set();
    for (const row of syncRows) {
      total += 1;
      const result = row.props && row.props.result;
      if (result === 'success') {
        success += 1;
        if (row.deviceId) devices.add(row.deviceId);
      } else if (result === 'conflict') {
        conflict += 1;
      } else if (result === 'failed') {
        failed += 1;
      }
    }
    sync = {
      status: total ? 'ready' : 'insufficient',
      successRate: total ? Number(((success / total) * 100).toFixed(1)) : null,
      total,
      success,
      conflict,
      failed,
      devices: devices.size,
    };
  }

  let backup = { status: eventsComputed ? 'ready' : 'not_ready', success: null, failure: null };
  if (eventsComputed) {
    let success = 0;
    let failure = 0;
    for (const row of backupRows) {
      const result = row.props && row.props.result;
      if (result === 'success') success += 1;
      if (result === 'failed') failure += 1;
    }
    backup = { status: 'ready', success, failure };
  }

  // M17 功能使用：只数 ops_events；表存在但无行按口径返回 0，不伪造。
  let usage = emptyUsage(eventsReady ? 'ready' : 'not_ready', eventsReady ? '' : '事件表未创建');
  if (eventsReady) {
    try {
      const usageRows = await fetchPage(
        'ops_events',
        {
          event: _.in(USAGE_EVENT_LABELS.map(([event]) => event)),
          localDate: _.and([_.gte(from), _.lte(to)]),
        },
        MAX_EVENT_ROWS,
      );
      const counts = new Map();
      for (const row of usageRows) counts.set(row.event, (counts.get(row.event) || 0) + 1);
      usage = {
        status: 'ready',
        counts: USAGE_EVENT_LABELS.map(([event, label, implemented]) => ({
          event,
          label,
          value: implemented ? counts.get(event) || 0 : null,
          implemented,
        })),
        missing: USAGE_EVENTS_MISSING.slice(),
        note: USAGE_EVENTS_MISSING.length
          ? `Web 端尚未上报：${USAGE_EVENTS_MISSING.join('、')}`
          : usageRows.length
            ? ''
            : '窗口内没有事件；需用户登录并开启匿名统计后才会补报',
      };
    } catch (error) {
      usage = emptyUsage(
        'not_ready',
        isMissingIndex(error) ? 'ops_events 缺少 event+localDate 索引' : '事件查询失败',
      );
    }
  }

  // M18 使用漏斗：事件表缺失 → not_ready；无 cohort → insufficient。
  let funnel;
  try {
    funnel = await buildFunnel({ from, to, today, eventsReady, cohortRows });
  } catch (error) {
    funnel = emptyFunnel(
      'not_ready',
      isMissingIndex(error) ? 'ops_events 缺少 event+localDate 索引' : '漏斗查询失败',
    );
    notes.push(`漏斗计算失败：${String(error && error.message ? error.message : error)}`);
  }

  return ok(
    {
      range: { from, to, timezone: 'Asia/Shanghai', tzOffset },
      availability: {
        opsEvents: eventsReady,
        userFirstSeen: firstSeenReady,
        commits: commitsBlock.status === 'ready',
      },
      metrics,
      series,
      retention,
      sync,
      backup,
      commits: commitsBlock,
      usage,
      funnel,
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
// 写接口：仅更新，不新增、不删除
// ---------------------------------------------------------------------------

const WRITE_RULES = {
  branches: {
    title: { kind: 'text', min: 1, max: 120 },
    goal: { kind: 'nullableText', max: 500 },
    color: { kind: 'enum', values: ['coral', 'sky', 'honey', 'mint', 'iris', 'rose', 'teal'] },
  },
  tasks: {
    title: { kind: 'text', min: 1, max: 120 },
    note: { kind: 'nullableText', max: 1000 },
    dueDate: { kind: 'nullableDate' },
    plannedDate: { kind: 'nullableDate' },
    order: { kind: 'int', min: 0, max: 9999 },
  },
  commits: {
    summary: { kind: 'text', min: 0, max: 500 },
  },
  milestones: {
    title: { kind: 'text', min: 1, max: 120 },
    note: { kind: 'nullableText', max: 1000 },
  },
  settings: {
    theme: { kind: 'enum', values: ['light', 'dark'] },
    treeDensity: { kind: 'enum', values: ['compact', 'comfortable'] },
    annotations: { kind: 'enum', values: ['off', 'once', 'always'] },
    reminderEnabled: { kind: 'boolean' },
  },
  year_reviews: {
    note: { kind: 'text', min: 0, max: 2000 },
  },
};

function normalizeField(rule, raw) {
  if (rule.kind === 'boolean') {
    return typeof raw === 'boolean' ? { value: raw } : { error: '必须是布尔值' };
  }
  if (rule.kind === 'int') {
    if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < rule.min || raw > rule.max) {
      return { error: `必须是 ${rule.min}–${rule.max} 的整数` };
    }
    return { value: raw };
  }
  if (rule.kind === 'enum') {
    if (typeof raw !== 'string' || !rule.values.includes(raw)) {
      return { error: `只能是 ${rule.values.join(' / ')}` };
    }
    return { value: raw };
  }
  if (rule.kind === 'nullableDate') {
    if (raw == null || raw === '') return { value: null };
    if (typeof raw !== 'string' || !isValidDate(raw)) return { error: '需要 YYYY-MM-DD 或 null' };
    const year = Number(raw.slice(0, 4));
    if (year < 1900 || year > 2999) return { error: '年份需要在 1900–2999' };
    const parsed = new Date(`${raw}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== raw) {
      return { error: '日期不存在' };
    }
    return { value: raw };
  }
  if (typeof raw !== 'string') return { error: '必须是字符串' };
  if (/[\r\n]/.test(raw)) return { error: '不能包含换行' };
  const value = raw.trim();
  if (value.length < rule.min) return { error: rule.min > 0 ? '不能为空' : '长度不合法' };
  if (value.length > rule.max) return { error: `长度不能超过 ${rule.max}` };
  if (rule.kind === 'nullableText' && !value) return { value: null };
  return { value };
}

function validatePatch(collection, patch, requestId) {
  const rules = WRITE_RULES[collection];
  if (!rules) {
    return { error: fail('admin_table_not_allowed', '该表不在可写清单内', 403, false, requestId) };
  }
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    return { error: fail('admin_invalid_params', 'patch 必须是对象', 400, false, requestId) };
  }
  const keys = Object.keys(patch);
  if (!keys.length) {
    return { error: fail('admin_invalid_params', 'patch 不能为空', 400, false, requestId) };
  }
  const values = {};
  for (const key of keys) {
    const rule = rules[key];
    if (!rule) {
      return {
        error: fail('admin_field_not_allowed', `字段 ${key} 不允许修改`, 403, false, requestId, { field: key }),
      };
    }
    const result = normalizeField(rule, patch[key]);
    if (result.error) {
      return {
        error: fail('admin_invalid_params', `${key}：${result.error}`, 400, false, requestId, { field: key }),
      };
    }
    values[key] = result.value;
  }
  return { keys, values };
}

function prepareUpdate(row, values, expectedRev) {
  const currentRev = Number.isInteger(row.rev) ? row.rev : 0;
  if (currentRev !== expectedRev) return { conflict: currentRev };
  const changedFields = [];
  const before = {};
  const after = {};
  const beforeAbsent = [];
  for (const key of Object.keys(values)) {
    const next = values[key];
    const had = Object.prototype.hasOwnProperty.call(row, key);
    const prev = had ? row[key] : null;
    if (JSON.stringify(prev) === JSON.stringify(next)) continue;
    changedFields.push(key);
    if (had) before[key] = prev === undefined ? null : prev;
    else beforeAbsent.push(key);
    after[key] = next;
  }
  return {
    currentRev,
    revAfter: currentRev + 1,
    changedFields,
    before,
    after,
    beforeAbsent,
    afterAbsent: [],
  };
}

function buildAudit({ auth, collection, id, row, prepared, reason, requestId, context, at, status }) {
  return {
    actorUid: auth.uid,
    actorEmail: auth.email,
    action: 'admin.update',
    collection,
    docId: id,
    ownerId: row && row.ownerId ? row.ownerId : null,
    changedFields: prepared.changedFields,
    before: prepared.before,
    after: prepared.after,
    beforeAbsent: prepared.beforeAbsent,
    afterAbsent: prepared.afterAbsent,
    revBefore: prepared.currentRev,
    revAfter: prepared.revAfter,
    reason,
    at,
    requestId,
    clientIp: (context && (context.clientIP || context.clientIp)) || '',
    status: status || 'applied',
    errorCode: null,
    schemaVersion: 1,
  };
}

function auditIdOf(added) {
  if (!added) return '';
  return added.id || added._id || (added.data && (added.data.id || added.data._id)) || '';
}

function throwAdminError(code, message, extra) {
  const error = new Error(message);
  error.adminCode = code;
  Object.assign(error, extra || {});
  return error;
}

function assertEditableRow(row, values, expectedRev) {
  if (!row) throw throwAdminError('admin_not_found', '该行不存在或已删除');
  const prepared = prepareUpdate(row, values, expectedRev);
  if (prepared.conflict != null) {
    throw throwAdminError('admin_conflict', 'rev 不一致', { currentRev: prepared.conflict });
  }
  if (!prepared.changedFields.length) {
    throw throwAdminError('admin_invalid_params', '未检测到字段变化');
  }
  return prepared;
}

async function handleTableUpdate({ event, context, requestId, auth }) {
  const collection = String(event.collection || '');
  const invalid = assertCollection(collection, requestId);
  if (invalid) return invalid;
  if (!WRITE_RULES[collection]) {
    return fail('admin_table_not_allowed', '该表不在可写清单内', 403, false, requestId);
  }
  const id = String(event.id || '');
  if (!id) return fail('admin_invalid_params', '缺少 id', 400, false, requestId);
  const expectedRev = Number(event.expectedRev);
  if (!Number.isInteger(expectedRev) || expectedRev < 0) {
    return fail('admin_invalid_params', 'expectedRev 必须是非负整数', 400, false, requestId);
  }
  const reason = typeof event.reason === 'string' ? event.reason.trim() : '';
  if (!reason || reason.length > 200) {
    return fail('admin_invalid_params', 'reason 必填，长度 1–200', 400, false, requestId);
  }

  const checked = validatePatch(collection, event.patch, requestId);
  if (checked.error) return checked.error;
  const values = checked.values;
  const now = Date.now();

  try {
    let payload;
    if (typeof db.runTransaction === 'function') {
      payload = await db.runTransaction(async (transaction) => {
        const result = await transaction.collection(collection).doc(id).get();
        const raw = result && result.data;
        const row = Array.isArray(raw) ? raw[0] : raw;
        const prepared = assertEditableRow(row, values, expectedRev);
        const patch = { ...values, rev: prepared.revAfter, updatedAt: now };
        await transaction.collection(collection).doc(id).update(patch);
        const audit = buildAudit({
          auth,
          collection,
          id,
          row,
          prepared,
          reason,
          requestId,
          context,
          at: now,
          status: 'applied',
        });
        const added = await transaction.collection('admin_audit_log').add(audit);
        return { row: maskRow(collection, { ...row, ...patch }), auditId: auditIdOf(added) };
      });
    } else {
      // 兼容不支持 runTransaction 的环境：先写 pending 审计，再写业务，最后回填 applied。
      const result = await db.collection(collection).doc(id).get();
      const raw = result && result.data;
      const row = Array.isArray(raw) ? raw[0] : raw;
      const prepared = assertEditableRow(row, values, expectedRev);
      const audit = buildAudit({
        auth,
        collection,
        id,
        row,
        prepared,
        reason,
        requestId,
        context,
        at: now,
        status: 'pending',
      });
      const added = await db.collection('admin_audit_log').add(audit);
      const auditId = auditIdOf(added);
      const patch = { ...values, rev: prepared.revAfter, updatedAt: now };
      try {
        await db.collection(collection).doc(id).update(patch);
        await db.collection('admin_audit_log').doc(auditId).update({ status: 'applied' });
      } catch (error) {
        await db
          .collection('admin_audit_log')
          .doc(auditId)
          .update({ status: 'failed', errorCode: 'admin_write_failed' })
          .catch(() => {});
        throw error;
      }
      payload = { row: maskRow(collection, { ...row, ...patch }), auditId };
    }
    return ok(payload, requestId);
  } catch (error) {
    if (error && error.adminCode === 'admin_not_found') {
      return fail('admin_not_found', '该行不存在或已删除', 404, false, requestId);
    }
    if (error && error.adminCode === 'admin_conflict') {
      return fail(
        'admin_conflict',
        `记录已被更新：编辑版本 rev ${expectedRev}，最新版本 rev ${error.currentRev}。请刷新后重试。`,
        409,
        false,
        requestId,
        { expectedRev, currentRev: error.currentRev },
      );
    }
    if (error && error.adminCode === 'admin_invalid_params') {
      return fail('admin_invalid_params', error.message, 400, false, requestId);
    }
    if (isMissingCollection(error)) {
      return fail('admin_collection_missing', '业务表或审计表尚未创建，未写入任何变更', 503, true, requestId);
    }
    console.error(`[admin-api] tables.update failed requestId=${requestId}`, error);
    return fail('admin_write_failed', '写入失败，未产生任何变更', 500, true, requestId);
  }
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
