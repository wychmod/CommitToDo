'use strict';

/**
 * 第二端只读查询云函数（PRD V2-04 §5 / §8.1）。
 *
 * 第二端不持有业务表，也不另算一套数字：今天三组、四计数、停滞、周月年与徽章
 * 全部在本函数里按 Web 同一口径现算后返回，小程序只负责渲染。
 *
 * 归属：先用调用身份里的 `uid`（Web 的 CloudBase 账号即 `ownerId`）；微信小程序
 * 没有 `uid` 时按 `(AppID, OpenID)` 在 `users` 里找绑定记录，未绑定返回
 * `binding_required`，不回退到请求参数，避免越权读取。
 */

const cloudbase = require('@cloudbase/node-sdk');

const app = cloudbase.init({ env: cloudbase.SYMBOL_CURRENT_ENV });
const db = app.database();
const _ = db.command;

const SCHEMA_VERSION = 1;
const BRANCH_LIMIT = 200;
const RECENT_RANGE_DAYS = 90;
const STALL_DAYS = 30;
const PAGE_SIZE = 200;
const MAX_ROWS = 5000;

const STATUS_LABEL = { active: '进行中', merged: '已合并', dropped: '已放下' };

/** 与 web/src/core/rules/badge-catalog.ts 同序；彩蛋获得前不出现。 */
const BADGE_CATALOG = [
  ['first-commit', 'time'],
  ['first-fork', 'structure'],
  ['first-milestone', 'milestone'],
  ['first-merge', 'structure'],
  ['all-merged', 'structure'],
  ['dual-lanes', 'structure'],
  ['let-go', 'structure'],
  ['well-ended', 'structure'],
  ['five-faces', 'structure'],
  ['trunk', 'structure'],
  ['backfill', 'time'],
  ['evergreen', 'time'],
  ['first-year', 'time'],
  ['three-milestones', 'milestone'],
  ['milestone-note', 'milestone'],
  ['year-marks', 'milestone'],
  ['night-flight', 'easter'],
  ['cross-year', 'easter'],
  ['blank-year', 'easter'],
  ['revival', 'easter'],
  ['full-moon', 'easter']
];
const BADGE_CATEGORY_ORDER = ['structure', 'time', 'milestone', 'easter'];
const BADGE_LEGACY = { 'first-branch': 'first-fork' };
const badgeCatalogId = (id) => BADGE_LEGACY[id] || (BADGE_CATALOG.some((row) => row[0] === id) ? id : '');

function pad(value) {
  return String(value).padStart(2, '0');
}

function toLocalDate(epochMs, tzOffsetMinutes) {
  const shifted = new Date(Number(epochMs) + tzOffsetMinutes * 60000);
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
}

function addDays(date, delta) {
  const [year, month, day] = date.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day) + delta * 86400000);
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
}

function daysBetween(from, to) {
  const parse = (value) => {
    const [year, month, day] = value.split('-').map(Number);
    return Date.UTC(year, month - 1, day);
  };
  return Math.round((parse(to) - parse(from)) / 86400000);
}

function readTzOffset(event) {
  const value = Number(event.tzOffset);
  if (!Number.isFinite(value) || value < -720 || value > 840) return 480;
  return Math.round(value);
}

function idOf(row) {
  return String(row.id || row._id || '');
}

function isLive(row) {
  return row.deletedAt === null || row.deletedAt === undefined;
}

function isValidCommit(row) {
  return isLive(row) && (row.voidedAt === null || row.voidedAt === undefined);
}

function timeLabel(at) {
  if (!at) return '';
  const date = new Date(Number(at));
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function normalizeBranch(row) {
  return {
    id: idOf(row),
    parentId: row.parentId || null,
    depth: typeof row.depth === 'number' ? row.depth : 0,
    title: row.title || '',
    goal: row.goal || '',
    color: row.color || '',
    status: row.status || 'active',
    order: typeof row.order === 'number' ? row.order : 0,
    pinnedAt: row.pinnedAt || null,
    archivedAt: row.archivedAt || null,
    finishedAt: row.finishedAt || null,
    finishedIntoId: row.finishedIntoId || null,
    droppedAt: row.droppedAt || null,
    dropReason: row.dropReason || '',
    createdAt: row.createdAt || 0,
    updatedAt: row.updatedAt || row.createdAt || 0,
    deletedAt: row.deletedAt || null
  };
}

function normalizeTask(row) {
  return {
    id: idOf(row),
    branchId: row.branchId || '',
    title: row.title || '',
    note: row.note || '',
    dueDate: row.dueDate || null,
    plannedDate: row.plannedDate || null,
    status: row.status || 'open',
    order: typeof row.order === 'number' ? row.order : null,
    completedAt: row.completedAt || null,
    cancelledAt: row.cancelledAt || null,
    createdAt: row.createdAt || 0,
    deletedAt: row.deletedAt || null
  };
}

function normalizeCommit(row) {
  return {
    id: idOf(row),
    branchId: row.branchId || '',
    taskId: row.taskId || null,
    date: row.date || '',
    at: row.at || 0,
    summary: row.summary || '',
    voidedAt: row.voidedAt || null,
    deletedAt: row.deletedAt || null
  };
}

function normalizeMilestone(row) {
  return {
    id: idOf(row),
    branchId: row.branchId || '',
    title: row.title || '',
    note: row.note || '',
    achievedAt: row.achievedAt || 0,
    datePrecision: row.datePrecision || 'day',
    deletedAt: row.deletedAt || null
  };
}

async function fetchAll(collection, where, orderBy) {
  const rows = [];
  for (let skip = 0; skip < MAX_ROWS; skip += PAGE_SIZE) {
    let query = db.collection(collection).where(where).skip(skip).limit(PAGE_SIZE);
    if (orderBy) query = query.orderBy(orderBy.field, orderBy.direction || 'asc');
    const result = await safeGet(query);
    rows.push(...result.data);
    if (result.data.length < PAGE_SIZE) break;
  }
  return rows;
}

/**
 * 集合尚未创建（新账号、从未同步）等价于没有数据，按空集返回，
 * 让第二端走 PRD §4.6 的空态而不是错误态。
 */
function isEmptyCollectionError(error) {
  if (!error) return false;
  const code = String(error.code || '');
  const message = String(error.message || '');
  return code === 'DATABASE_COLLECTION_NOT_EXIST' || /DATABASE_COLLECTION_NOT_EXIST|Db or Table not exist/.test(message);
}

async function safeGet(query) {
  try {
    return await query.get();
  } catch (error) {
    if (isEmptyCollectionError(error)) return { data: [] };
    throw error;
  }
}

function callerIdentity(event) {
  let info = {};
  try {
    const auth = app.auth();
    if (auth && typeof auth.getUserInfo === 'function') info = auth.getUserInfo() || {};
  } catch (error) {
    info = {};
  }
  const userInfo = event && event.userInfo ? event.userInfo : {};
  return {
    uid: info.uid || userInfo.uid || '',
    openId: info.openId || info.openid || userInfo.openId || userInfo.openid || ''
  };
}

/** 账号归属；未绑定微信时返回 `binding_required`。 */
async function resolveOwner(event) {
  const identity = callerIdentity(event);
  if (identity.uid) {
    return { ownerId: String(identity.uid), email: '' , identity };
  }
  if (!identity.openId) return null;

  const direct = await safeGet(db.collection('users').where({ wxOpenId: identity.openId }).limit(1));
  if (direct.data.length > 0) {
    const row = direct.data[0];
    return { ownerId: idOf(row), email: row.email || '', identity };
  }
  const listed = await safeGet(db.collection('users').where({ wxOpenIds: identity.openId }).limit(1));
  if (listed.data.length > 0) {
    const row = listed.data[0];
    return { ownerId: idOf(row), email: row.email || '', identity };
  }
  return { ownerId: '', email: '', identity };
}

async function ownerEmail(owner, account) {
  if (owner.email) return owner.email;
  try {
    const result = await db.collection('users').doc(owner.ownerId).get();
    const row = (result.data && result.data[0]) || result.data || {};
    return row.email || account.email || '';
  } catch (error) {
    return account.email || '';
  }
}

function byDueThenCreated(left, right) {
  const dueA = left.dueDate || '9999-12-31';
  const dueB = right.dueDate || '9999-12-31';
  return dueA.localeCompare(dueB) || left.createdAt - right.createdAt || left.id.localeCompare(right.id);
}

function byCreated(left, right) {
  return left.createdAt - right.createdAt || left.id.localeCompare(right.id);
}

function isOutsideDefaultTree(task, byId) {
  const own = byId.get(task.branchId);
  if (!own) return true;
  if (own.status === 'dropped') return true;
  let current = own;
  let guard = 0;
  while (current && guard < 8) {
    if (!isLive(current) || current.archivedAt !== null) return true;
    current = current.parentId ? byId.get(current.parentId) : undefined;
    guard += 1;
  }
  return false;
}

function groupToday(tasks, branches, todayDate) {
  const byId = new Map(branches.map((branch) => [branch.id, branch]));
  const groups = { overdue: [], today: [], noDue: [] };
  for (const task of tasks) {
    if (task.status !== 'open' || !isLive(task)) continue;
    if (isOutsideDefaultTree(task, byId)) continue;
    if (task.plannedDate === todayDate) groups.today.push(task);
    else if (task.dueDate === null) groups.noDue.push(task);
    else if (task.dueDate === todayDate) groups.today.push(task);
    else if (task.dueDate < todayDate) groups.overdue.push(task);
  }
  groups.overdue.sort(byDueThenCreated);
  groups.today.sort(byDueThenCreated);
  groups.noDue.sort(byCreated);

  let dueCount = groups.overdue.length;
  let noDueCount = groups.noDue.length;
  for (const task of groups.today) {
    if (task.dueDate === null) noDueCount += 1;
    else dueCount += 1;
  }
  return { groups, dueCount, noDueCount };
}

function byIdMap(branches) {
  return new Map(branches.map((branch) => [branch.id, branch]));
}

function branchPath(branch, byId) {
  const titles = [];
  let current = branch;
  let guard = 0;
  while (current && guard < 32) {
    titles.unshift(current.title);
    current = current.parentId ? byId.get(current.parentId) : undefined;
    guard += 1;
  }
  return titles.join(' / ');
}

function levelOneOf(branchId, byId) {
  let current = byId.get(branchId);
  let guard = 0;
  while (current && guard < 32) {
    if (!current.parentId || current.depth === 0) return null;
    if (current.depth === 1) return current;
    current = current.parentId ? byId.get(current.parentId) : undefined;
    guard += 1;
  }
  return null;
}

function recountBranch(branchId, tasks, commits) {
  let taskTotal = 0;
  let taskDone = 0;
  let commitCount = 0;
  let ownLastCommitAt = null;
  const seen = new Set();
  for (const task of tasks) {
    if (task.branchId !== branchId || !isLive(task) || task.status === 'cancelled') continue;
    taskTotal += 1;
    if (task.status === 'done') taskDone += 1;
  }
  for (const commit of commits) {
    if (commit.branchId !== branchId || !isValidCommit(commit)) continue;
    if (seen.has(commit.id)) continue;
    seen.add(commit.id);
    commitCount += 1;
    if (ownLastCommitAt === null || commit.at > ownLastCommitAt) ownLastCommitAt = commit.at;
  }
  return { taskTotal, taskDone, commitCount, ownLastCommitAt };
}

function taskRow(task, byId) {
  const branch = byId.get(task.branchId);
  return {
    id: task.id,
    title: task.title,
    branchId: task.branchId,
    branchTitle: branch ? branch.title : '',
    branchColor: branch ? branch.color : '',
    path: branch ? branchPath(branch, byId) : '',
    dueDate: task.dueDate,
    plannedDate: task.plannedDate,
    note: task.note
  };
}

function commitRow(commit, byId) {
  const branch = byId.get(commit.branchId);
  return {
    id: commit.id,
    summary: commit.summary,
    branchId: commit.branchId,
    branchTitle: branch ? branch.title : '',
    branchColor: branch ? branch.color : '',
    path: branch ? branchPath(branch, byId) : '',
    date: commit.date,
    at: commit.at,
    timeLabel: timeLabel(commit.at),
    voided: commit.voidedAt !== null
  };
}

function milestoneRow(milestone, byId) {
  const branch = byId.get(milestone.branchId);
  return {
    id: milestone.id,
    title: milestone.title,
    note: milestone.note,
    branchId: milestone.branchId,
    branchTitle: branch ? branch.title : '',
    branchColor: branch ? branch.color : '',
    path: branch ? branchPath(branch, byId) : '',
    achievedAt: milestone.achievedAt,
    datePrecision: milestone.datePrecision,
    dateLabel: milestoneDateLabel(milestone)
  };
}

function milestoneDateLabel(milestone) {
  const date = toLocalDate(milestone.achievedAt, 480);
  if (milestone.datePrecision === 'month') return date.slice(0, 7);
  if (milestone.datePrecision === 'year') return date.slice(0, 4);
  return date;
}

function buildTree(branches, tasks, commits) {
  const byId = byIdMap(branches);
  const childrenOf = new Map();
  for (const branch of branches) {
    if (!branch.parentId) continue;
    const list = childrenOf.get(branch.parentId) || [];
    list.push(branch);
    childrenOf.set(branch.parentId, list);
  }
  const sortChildren = (rows) =>
    rows.sort((left, right) => {
      const pinned = (right.pinnedAt ? 1 : 0) - (left.pinnedAt ? 1 : 0);
      return pinned || left.order - right.order || left.createdAt - right.createdAt;
    });

  const hidden = (branch) => {
    let current = branch;
    let guard = 0;
    while (current && guard < 32) {
      if (current.archivedAt !== null) return true;
      current = current.parentId ? byId.get(current.parentId) : undefined;
      guard += 1;
    }
    return false;
  };

  const visit = (branch) => {
    const counts = recountBranch(branch.id, tasks, commits);
    const children = sortChildren((childrenOf.get(branch.id) || []).filter((row) => !hidden(row)));
    return {
      id: branch.id,
      title: branch.title,
      color: branch.color,
      status: branch.status,
      statusLabel: STATUS_LABEL[branch.status] || STATUS_LABEL.active,
      depth: branch.depth,
      taskDone: counts.taskDone,
      taskTotal: counts.taskTotal,
      commitCount: counts.commitCount,
      hasChildren: children.length > 0,
      children: children.map(visit)
    };
  };

  const root = branches.find((branch) => !branch.parentId);
  if (!root) return [];
  return [visit(root)];
}

function stallFor(branch, branches, commits, todayDate) {
  const childrenOf = new Map();
  for (const row of branches) {
    if (!row.parentId) continue;
    const list = childrenOf.get(row.parentId) || [];
    list.push(row);
    childrenOf.set(row.parentId, list);
  }
  const scope = new Set([branch.id]);
  const walk = (id) => {
    for (const child of childrenOf.get(id) || []) {
      if (child.archivedAt !== null || child.droppedAt !== null) continue;
      scope.add(child.id);
      walk(child.id);
    }
  };
  walk(branch.id);

  let latest = null;
  for (const commit of commits) {
    if (!scope.has(commit.branchId) || !isValidCommit(commit)) continue;
    if (!latest || commit.at > latest.at) latest = commit;
  }
  if (!latest) return null;
  const days = daysBetween(latest.date, todayDate);
  return days > STALL_DAYS ? { lastDate: latest.date, days } : null;
}

function resolveTimeRange(kind, todayDate) {
  const recentStart = addDays(todayDate, -(RECENT_RANGE_DAYS - 1));
  if (kind === 'all') return { kind: 'all', start: null, end: todayDate };
  if (kind === 'thisYear') {
    const yearStart = `${todayDate.slice(0, 4)}-01-01`;
    return { kind: 'thisYear', start: recentStart < yearStart ? recentStart : yearStart, end: todayDate };
  }
  return { kind: 'recent90', start: recentStart, end: todayDate };
}

function milestoneAnchor(milestone) {
  const date = toLocalDate(milestone.achievedAt, 480);
  if (milestone.datePrecision === 'month') return `${date.slice(0, 7)}-01`;
  if (milestone.datePrecision === 'year') return `${date.slice(0, 4)}-01-01`;
  return date;
}

function computeYearMetrics(year, commits, branches, tzOffsetMinutes) {
  const byId = byIdMap(branches);
  let commitCount = 0;
  const active = new Set();
  for (const commit of commits) {
    if (!isValidCommit(commit) || commit.date.slice(0, 4) !== String(year)) continue;
    commitCount += 1;
    const lane = levelOneOf(commit.branchId, byId);
    if (lane) active.add(lane.id);
  }
  let opened = 0;
  let finished = 0;
  for (const branch of branches) {
    if (!isLive(branch)) continue;
    if (branch.depth > 0 && toLocalDate(branch.createdAt, tzOffsetMinutes).slice(0, 4) === String(year)) {
      opened += 1;
    }
    if (
      branch.status === 'merged' &&
      branch.finishedAt !== null &&
      toLocalDate(branch.finishedAt, tzOffsetMinutes).slice(0, 4) === String(year)
    ) {
      finished += 1;
    }
  }
  return { commits: commitCount, activeLevelOneBranches: active.size, opened, finished };
}

function buildYearView(year, commits, branches, tasks, todayDate, tzOffsetMinutes) {
  const metrics = computeYearMetrics(year, commits, branches, tzOffsetMinutes);
  const byId = byIdMap(branches);
  const todayYear = Number(todayDate.slice(0, 4));
  const todayMonth = Number(todayDate.slice(5, 7));
  const monthly = new Map();
  const grouped = new Map();
  let total = 0;

  for (const commit of commits) {
    if (!isValidCommit(commit) || commit.date.slice(0, 4) !== String(year)) continue;
    total += 1;
    const month = Number(commit.date.slice(5, 7));
    monthly.set(month, (monthly.get(month) || 0) + 1);
    const lane = levelOneOf(commit.branchId, byId);
    const key = lane ? lane.id : '';
    grouped.set(key, (grouped.get(key) || 0) + 1);
  }

  const months = [];
  for (let month = 1; month <= 12; month += 1) {
    const notReached = year > todayYear || (year === todayYear && month > todayMonth);
    months.push({ month, count: notReached ? null : monthly.get(month) || 0 });
  }

  const root = branches.find((branch) => !branch.parentId);
  const shares = [];
  for (const [key, count] of grouped) {
    const branch = key === '' ? root : byId.get(key);
    if (key !== '' && !branch) continue;
    const counts = branch ? recountBranch(branch.id, tasks, commits) : { taskDone: 0, taskTotal: 0 };
    shares.push({
      branchId: key === '' ? null : key,
      title: branch ? branch.title : '我',
      color: key === '' ? null : branch ? branch.color : '',
      archived: Boolean(branch && branch.archivedAt !== null),
      commits: count,
      ratio: total === 0 ? 0 : count / total,
      taskDone: counts.taskDone,
      taskTotal: counts.taskTotal,
      createdAt: branch ? branch.createdAt : 0
    });
  }
  shares.sort(
    (left, right) =>
      right.commits - left.commits ||
      left.createdAt - right.createdAt ||
      String(left.branchId || '').localeCompare(String(right.branchId || ''))
  );

  return { metrics, months, total, shares };
}

async function loadBranches(ownerId) {
  const rows = await fetchAll('branches', { ownerId }, { field: 'createdAt', direction: 'asc' });
  return rows.map(normalizeBranch).filter(isLive);
}

async function loadTasks(ownerId) {
  const rows = await fetchAll('tasks', { ownerId }, { field: 'createdAt', direction: 'asc' });
  return rows.map(normalizeTask).filter(isLive);
}

async function loadCommits(ownerId, start, end) {
  const where = { ownerId };
  if (start && end) where.date = _.and(_.gte(start), _.lte(end));
  const rows = await fetchAll('commits', where, { field: 'date', direction: 'asc' });
  return rows.map(normalizeCommit).filter(isLive);
}

async function loadMilestones(ownerId) {
  const rows = await fetchAll('milestones', { ownerId }, { field: 'achievedAt', direction: 'asc' });
  return rows.map(normalizeMilestone).filter(isLive);
}

async function loadBadges(ownerId) {
  const rows = await fetchAll('badges', { ownerId }, { field: 'grantedAt', direction: 'asc' });
  return rows.map((row) => ({
    id: idOf(row),
    catalogId: row.catalogId || '',
    category: row.category || '',
    grantedAt: row.grantedAt || 0
  }));
}

async function loadDevices(ownerId) {
  const rows = await fetchAll('devices', { ownerId }, { field: 'lastSyncAt', direction: 'desc' });
  return rows
    .map((row) => ({
      id: idOf(row),
      label: row.label || '',
      platform: row.platform || '',
      lastSyncAt: row.lastSyncAt || null,
      removedAt: row.removedAt || null
    }))
    .filter((row) => row.removedAt === null);
}

async function scopeSession(owner) {
  const email = await ownerEmail(owner, { email: '' });
  return { bound: true, account: { email, ownerId: owner.ownerId } };
}

async function scopeToday(owner, tzOffsetMinutes, todayDate) {
  const [branches, tasks, commits] = await Promise.all([
    loadBranches(owner.ownerId),
    loadTasks(owner.ownerId),
    loadCommits(owner.ownerId)
  ]);
  const byId = byIdMap(branches);
  const grouped = groupToday(tasks, branches, todayDate);
  const recent = commits
    .filter(isValidCommit)
    .sort((left, right) => right.at - left.at)
    .slice(0, 3)
    .map((commit) => commitRow(commit, byId));

  return {
    localDate: todayDate,
    dueCount: grouped.dueCount,
    noDueCount: grouped.noDueCount,
    groups: [
      { key: 'overdue', title: '逾期', tasks: grouped.groups.overdue.map((task) => taskRow(task, byId)) },
      { key: 'today', title: '今天', tasks: grouped.groups.today.map((task) => taskRow(task, byId)) },
      { key: 'noDue', title: '无截止', tasks: grouped.groups.noDue.map((task) => taskRow(task, byId)) }
    ],
    recentCommits: recent
  };
}

async function scopeBranches(owner) {
  const [branches, tasks, commits] = await Promise.all([
    loadBranches(owner.ownerId),
    loadTasks(owner.ownerId),
    loadCommits(owner.ownerId)
  ]);
  const tree = buildTree(branches, tasks, commits);
  const used = branches.length;
  return {
    usage: { used, limit: BRANCH_LIMIT },
    tree,
    archivedCount: branches.filter((branch) => branch.archivedAt !== null).length
  };
}

async function scopeArchive(owner) {
  const [branches, tasks, commits] = await Promise.all([
    loadBranches(owner.ownerId),
    loadTasks(owner.ownerId),
    loadCommits(owner.ownerId)
  ]);
  const byId = byIdMap(branches);
  const groups = new Map();
  for (const branch of branches) {
    if (branch.archivedAt === null) continue;
    const lane = levelOneOf(branch.id, byId);
    const key = lane ? lane.id : branch.parentId || branch.id;
    const group = groups.get(key) || {
      id: key,
      title: lane ? lane.title : branch.title,
      color: lane ? lane.color : branch.color,
      branches: []
    };
    const counts = recountBranch(branch.id, tasks, commits);
    group.branches.push({
      id: branch.id,
      title: branch.title,
      color: branch.color,
      path: branchPath(branch, byId),
      status: branch.status,
      statusLabel: branch.archivedAt !== null ? '已归档' : STATUS_LABEL[branch.status],
      taskDone: counts.taskDone,
      taskTotal: counts.taskTotal,
      commitCount: counts.commitCount,
      archivedAt: branch.archivedAt,
      reason: branch.dropReason
    });
    groups.set(key, group);
  }
  return { groups: Array.from(groups.values()) };
}

async function scopeBranch(owner, event) {
  const id = String(event.id || '');
  const branches = await loadBranches(owner.ownerId);
  const byId = byIdMap(branches);
  const branch = byId.get(id);
  if (!branch) return { missing: true };

  const [tasks, commits, milestones] = await Promise.all([
    loadTasks(owner.ownerId),
    loadCommits(owner.ownerId, null, null),
    loadMilestones(owner.ownerId)
  ]);
  const counts = recountBranch(branch.id, tasks, commits);
  const parent = branch.parentId ? byId.get(branch.parentId) : null;
  const mergedInto = branch.finishedIntoId ? byId.get(branch.finishedIntoId) : null;
  const archivedAncestor = (() => {
    let current = branch;
    let guard = 0;
    while (current && guard < 32) {
      if (current.archivedAt !== null) return true;
      current = current.parentId ? byId.get(current.parentId) : undefined;
      guard += 1;
    }
    return false;
  })();

  const children = branches
    .filter((row) => row.parentId === branch.id)
    .sort((left, right) => left.order - right.order || left.createdAt - right.createdAt)
    .map((row) => {
      const childCounts = recountBranch(row.id, tasks, commits);
      return {
        id: row.id,
        title: row.title,
        color: row.color,
        status: row.status,
        statusLabel: STATUS_LABEL[row.status],
        taskDone: childCounts.taskDone,
        taskTotal: childCounts.taskTotal,
        commitCount: childCounts.commitCount,
        archived: row.archivedAt !== null
      };
    });

  const branchTasks = tasks
    .filter((task) => task.branchId === branch.id && isLive(task) && task.status !== 'cancelled')
    .sort((left, right) => {
      const openFirst = (left.status === 'open' ? 0 : 1) - (right.status === 'open' ? 0 : 1);
      return openFirst || byDueThenCreated(left, right);
    })
    .map((task) => ({
      ...taskRow(task, byId),
      status: task.status,
      statusLabel: task.status === 'done' ? '已完成' : '待完成',
      completedAt: task.completedAt
    }));

  const branchCommits = commits
    .filter((commit) => commit.branchId === branch.id)
    .sort((left, right) => right.at - left.at)
    .slice(0, 20)
    .map((commit) => commitRow(commit, byId));

  const branchMilestones = milestones
    .filter((milestone) => milestone.branchId === branch.id)
    .sort((left, right) => right.achievedAt - left.achievedAt)
    .map((milestone) => milestoneRow(milestone, byId));

  return {
    branch: {
      id: branch.id,
      title: branch.title,
      goal: branch.goal,
      color: branch.color,
      depth: branch.depth,
      status: branch.status,
      statusLabel: archivedAncestor ? '已归档' : STATUS_LABEL[branch.status],
      path: branchPath(branch, byId),
      parentTitle: parent ? parent.title : '',
      taskDone: counts.taskDone,
      taskTotal: counts.taskTotal,
      commitCount: counts.commitCount,
      createdAt: branch.createdAt,
      archivedAt: branch.archivedAt,
      finishedAt: branch.finishedAt,
      droppedAt: branch.droppedAt,
      dropReason: branch.dropReason,
      mergedIntoTitle: mergedInto ? mergedInto.title : ''
    },
    tasks: branchTasks,
    commits: branchCommits,
    children,
    milestones: branchMilestones
  };
}

async function scopeHistory(owner, event, tzOffsetMinutes, todayDate) {
  const kind = ['recent90', 'thisYear', 'all'].includes(event.range) ? event.range : 'recent90';
  const range = resolveTimeRange(kind, todayDate);
  const [branches, commits, milestones] = await Promise.all([
    loadBranches(owner.ownerId),
    loadCommits(owner.ownerId, range.start, range.end),
    loadMilestones(owner.ownerId)
  ]);
  const byId = byIdMap(branches);
  const root = branches.find((branch) => !branch.parentId) || null;
  const levelOne = branches
    .filter((branch) => root && branch.parentId === root.id && branch.archivedAt === null)
    .sort((left, right) => left.order - right.order || left.createdAt - right.createdAt);

  const lanes = [];
  if (root) lanes.push({ branch: root, title: root.title, color: root.color });
  for (const branch of levelOne) {
    lanes.push({ branch, title: branch.title, color: branch.color });
  }
  const laneIndexByBranch = new Map();
  lanes.forEach((lane, index) => laneIndexByBranch.set(lane.branch.id, index));

  const laneIndexOf = (branchId) => {
    const lane = levelOneOf(branchId, byId);
    if (!lane) return root && branchId === root.id ? 0 : null;
    return laneIndexByBranch.has(lane.id) ? laneIndexByBranch.get(lane.id) : null;
  };

  const rows = [];
  const within = (date) => date <= range.end && (range.start === null || date >= range.start);

  for (const lane of lanes.slice(1)) {
    const date = toLocalDate(lane.branch.createdAt, tzOffsetMinutes);
    if (!within(date)) continue;
    rows.push({
      key: `fork:${lane.branch.id}`,
      kind: 'fork',
      date,
      at: lane.branch.createdAt,
      laneIndex: laneIndexByBranch.get(lane.branch.id),
      branchId: lane.branch.id,
      title: `分出「${lane.branch.title}」`,
      sublabel: root ? root.title : '',
      entityId: null,
      mergeToIndex: null
    });
  }

  for (const branch of branches) {
    if (branch.status !== 'merged' || branch.finishedAt === null) continue;
    const date = toLocalDate(branch.finishedAt, tzOffsetMinutes);
    if (!within(date)) continue;
    const laneIndex = laneIndexOf(branch.id);
    if (laneIndex === null) continue;
    const targetIndex = branch.finishedIntoId ? laneIndexOf(branch.finishedIntoId) : null;
    const target = branch.finishedIntoId ? byId.get(branch.finishedIntoId) : null;
    rows.push({
      key: `merge:${branch.id}`,
      kind: 'merge',
      date,
      at: branch.finishedAt,
      laneIndex,
      branchId: branch.id,
      title: target ? `合回「${target.title}」` : '合回',
      sublabel: branch.title,
      entityId: null,
      mergeToIndex: targetIndex
    });
  }

  for (const commit of commits) {
    if (!isValidCommit(commit)) continue;
    const laneIndex = laneIndexOf(commit.branchId);
    if (laneIndex === null) continue;
    rows.push({
      key: `commit:${commit.id}`,
      kind: 'commit',
      date: commit.date,
      at: commit.at,
      laneIndex,
      branchId: commit.branchId,
      title: commit.summary,
      sublabel: `${branchPath(byId.get(commit.branchId), byId)} · ${timeLabel(commit.at)}`,
      entityId: commit.id,
      mergeToIndex: null
    });
  }

  for (const milestone of milestones) {
    const date = milestoneAnchor(milestone);
    if (!within(date)) continue;
    const laneIndex = laneIndexOf(milestone.branchId);
    if (laneIndex === null) continue;
    rows.push({
      key: `milestone:${milestone.id}`,
      kind: 'milestone',
      date,
      at: milestone.achievedAt,
      laneIndex,
      branchId: milestone.branchId,
      title: milestone.title,
      sublabel: `${branchPath(byId.get(milestone.branchId), byId)} · 里程碑`,
      entityId: milestone.id,
      mergeToIndex: null
    });
  }

  const kindOrder = { fork: 0, commit: 1, milestone: 2, merge: 3 };
  rows.sort(
    (left, right) =>
      left.date.localeCompare(right.date) ||
      kindOrder[left.kind] - kindOrder[right.kind] ||
      left.at - right.at
  );

  return {
    range,
    lanes: lanes.map((lane, index) => {
      const stall = stallFor(lane.branch, branches, commits, todayDate);
      return {
        index,
        branchId: lane.branch.id,
        title: lane.title,
        color: lane.color,
        stalledDays: stall ? stall.days : null,
        lastDate: stall ? stall.lastDate : null
      };
    }),
    rows
  };
}

async function scopeYear(owner, event, tzOffsetMinutes, todayDate) {
  const currentYear = Number(todayDate.slice(0, 4));
  const requested = Number(event.year);
  const year = Number.isInteger(requested) && requested >= 1970 && requested <= currentYear ? requested : currentYear;

  const [branches, tasks, yearCommits, allCommits, reviews] = await Promise.all([
    loadBranches(owner.ownerId),
    loadTasks(owner.ownerId),
    loadCommits(owner.ownerId, `${year}-01-01`, `${year}-12-31`),
    loadCommits(owner.ownerId),
    fetchAll('year_reviews', { ownerId: owner.ownerId }, { field: 'year', direction: 'desc' })
  ]);

  const view = buildYearView(year, yearCommits, branches, tasks, todayDate, tzOffsetMinutes);
  const years = new Set([currentYear]);
  for (const commit of allCommits) {
    if (isValidCommit(commit)) years.add(Number(commit.date.slice(0, 4)));
  }
  for (const branch of branches) {
    years.add(Number(toLocalDate(branch.createdAt, tzOffsetMinutes).slice(0, 4)));
  }
  const review = reviews.find((row) => Number(row.year) === year);

  return {
    year,
    years: Array.from(years)
      .filter((value) => Number.isInteger(value) && value >= 1970)
      .sort((left, right) => right - left)
      .slice(0, 10),
    metrics: view.metrics,
    months: view.months,
    total: view.total,
    shares: view.shares,
    review: review ? review.note || '' : ''
  };
}

async function scopeMe(owner) {
  const [email, devices] = await Promise.all([ownerEmail(owner, { email: '' }), loadDevices(owner.ownerId)]);
  const sorted = devices
    .filter((row) => row.lastSyncAt !== null)
    .sort((left, right) => right.lastSyncAt - left.lastSyncAt);
  const lastSyncAt = sorted.length > 0 ? sorted[0].lastSyncAt : null;
  return {
    account: { email },
    device: { label: '微信小程序', lastSyncAt },
    devices: devices
      .sort((left, right) => (right.lastSyncAt || 0) - (left.lastSyncAt || 0))
      .map((row) => ({
        label: row.label,
        platform: row.platform,
        lastSyncAt: row.lastSyncAt,
        current: row.platform === 'wechat'
      }))
  };
}

async function scopeBadges(owner) {
  const rows = await loadBadges(owner.ownerId);
  const earned = new Map();
  for (const row of rows) {
    const catalogId = badgeCatalogId(row.catalogId);
    if (!catalogId) continue;
    const existing = earned.get(catalogId);
    if (!existing || row.grantedAt < existing.grantedAt) earned.set(catalogId, row);
  }

  const groups = BADGE_CATEGORY_ORDER.map((category) => {
    const entries = BADGE_CATALOG.filter((row) => row[1] === category);
    const earnedItems = entries
      .filter((row) => earned.has(row[0]))
      .sort((left, right) => earned.get(right[0]).grantedAt - earned.get(left[0]).grantedAt)
      .map((row) => ({
        catalogId: row[0],
        earned: true,
        grantedAt: earned.get(row[0]).grantedAt,
        remaining: null,
        percent: 1
      }));
    const unearnedItems =
      category === 'easter'
        ? []
        : entries
            .filter((row) => !earned.has(row[0]))
            .map((row) => ({ catalogId: row[0], earned: false, grantedAt: null, remaining: null, percent: 0 }));
    return {
      category,
      earnedCount: earnedItems.length,
      total: entries.length,
      items: [...earnedItems, ...unearnedItems]
    };
  });

  const easter = groups.find((group) => group.category === 'easter');
  const hidden = easter ? easter.total - easter.earnedCount : 0;
  return {
    total: BADGE_CATALOG.length - hidden,
    earnedCount: earned.size,
    groups
  };
}

async function scopeDetail(owner, event) {
  const kind = String(event.kind || '');
  const id = String(event.id || '');
  const branches = await loadBranches(owner.ownerId);
  const byId = byIdMap(branches);

  if (kind === 'task') {
    const tasks = await loadTasks(owner.ownerId);
    const task = tasks.find((row) => row.id === id);
    if (!task) return { missing: true };
    const branch = byId.get(task.branchId);
    return {
      kind,
      task: {
        ...taskRow(task, byId),
        status: task.status,
        statusLabel: task.status === 'done' ? '已完成' : '待完成',
        completedAt: task.completedAt
      },
      branch: branch
        ? { id: branch.id, title: branch.title, goal: branch.goal, statusLabel: STATUS_LABEL[branch.status], path: branchPath(branch, byId) }
        : null
    };
  }

  if (kind === 'commit') {
    const commits = await loadCommits(owner.ownerId);
    const commit = commits.find((row) => row.id === id);
    if (!commit) return { missing: true };
    const branch = byId.get(commit.branchId);
    const tasks = commit.taskId ? await loadTasks(owner.ownerId) : [];
    const task = commit.taskId ? tasks.find((row) => row.id === commit.taskId) : null;
    return {
      kind,
      commit: { ...commitRow(commit, byId), voidedAt: commit.voidedAt },
      taskTitle: task ? task.title : '',
      branch: branch
        ? { id: branch.id, title: branch.title, goal: branch.goal, statusLabel: STATUS_LABEL[branch.status], path: branchPath(branch, byId) }
        : null
    };
  }

  if (kind === 'milestone') {
    const milestones = await loadMilestones(owner.ownerId);
    const milestone = milestones.find((row) => row.id === id);
    if (!milestone) return { missing: true };
    const branch = byId.get(milestone.branchId);
    return {
      kind,
      milestone: milestoneRow(milestone, byId),
      branch: branch
        ? { id: branch.id, title: branch.title, goal: branch.goal, statusLabel: STATUS_LABEL[branch.status], path: branchPath(branch, byId) }
        : null
    };
  }

  return { missing: true };
}

const SCOPES = ['session', 'today', 'branches', 'branch', 'archive', 'history', 'year', 'me', 'badges', 'detail'];

exports.main = async (event) => {
  const payload = event || {};
  const scope = String(payload.scope || 'session');
  if (!SCOPES.includes(scope)) {
    return { ok: false, code: 'invalid_scope', message: '未知的读取范围' };
  }

  const tzOffsetMinutes = readTzOffset(payload);
  const serverTime = Date.now();
  const todayDate = toLocalDate(serverTime, tzOffsetMinutes);

  try {
    const owner = await resolveOwner(payload);
    if (!owner) {
      return { ok: false, code: 'unauthenticated', message: '未登录' };
    }
    if (!owner.ownerId) {
      return { ok: false, code: 'binding_required', message: '当前微信尚未绑定 CommitToDo 账号' };
    }

    let data;
    switch (scope) {
      case 'session':
        data = await scopeSession(owner);
        break;
      case 'today':
        data = await scopeToday(owner, tzOffsetMinutes, todayDate);
        break;
      case 'branches':
        data = await scopeBranches(owner);
        break;
      case 'branch':
        data = await scopeBranch(owner, payload);
        break;
      case 'archive':
        data = await scopeArchive(owner);
        break;
      case 'history':
        data = await scopeHistory(owner, payload, tzOffsetMinutes, todayDate);
        break;
      case 'year':
        data = await scopeYear(owner, payload, tzOffsetMinutes, todayDate);
        break;
      case 'me':
        data = await scopeMe(owner);
        break;
      case 'badges':
        data = await scopeBadges(owner);
        break;
      default:
        data = await scopeDetail(owner, payload);
        break;
    }

    if (data && data.missing) {
      return { ok: false, code: 'not_found', message: '内容不存在或已被删除' };
    }

    return {
      ok: true,
      scope,
      schemaVersion: SCHEMA_VERSION,
      serverTime,
      todayDate,
      data
    };
  } catch (error) {
    return {
      ok: false,
      code: 'read_failed',
      message: error && error.message ? error.message : '读取失败'
    };
  }
};
