'use strict';

/**
 * 同步补推云函数（PRD V2-02 OP-02/OP-03，TECH §4.3）。
 *
 * 客户端只发本机 outbox 里的增量，函数负责：
 * - 按 `opId` 幂等：已处理过的 opId 直接返回当时的结果，重试不产生第二条记录；
 * - 按 `baseRev` 判定过期写入：服务端 `rev` 与提交前看到的不一致就拒绝，并把当前行返回给客户端；
 * - 每次成功同步更新当前设备的 `lastSyncAt`，并返回设备清单供 O08-sync-devices 使用。
 *
 * 归属一律取调用身份里的 `uid`，不接受请求参数里的 `ownerId`。
 */

const cloudbase = require('@cloudbase/node-sdk');

const app = cloudbase.init({ env: cloudbase.SYMBOL_CURRENT_ENV });
const db = app.database();

/** 参与同步的业务实体到集合的映射；`sync` 等审计实体的增量在这里是空操作。 */
const COLLECTIONS = {
  branch: 'branches',
  task: 'tasks',
  commit: 'commits',
  milestone: 'milestones',
  badge: 'badges'
};

const MAX_OPS = 200;
const MAX_DEVICES = 200;

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
 * 集合缺失时整体失败，客户端保留 outbox 等数据库就绪后重试。
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

async function getRow(collection, id) {
  try {
    const result = await db.collection(collection).doc(id).get();
    const row = (result.data && result.data[0]) || null;
    return row ? { ...row, id: row.id || id } : null;
  } catch (error) {
    if (isEmptyCollectionError(error)) return null;
    throw error;
  }
}

/** `outbox` 集合同时充当服务端的幂等日志：`_id = opId`。 */
async function readApplied(opId) {
  try {
    const result = await db.collection('outbox').doc(opId).get();
    const row = (result.data && result.data[0]) || null;
    return row && row.result ? row.result : null;
  } catch (error) {
    if (isEmptyCollectionError(error)) return null;
    throw error;
  }
}

/** 幂等日志按 `opId` 记录；集合缺失时退化为按 `_id` upsert 的自然幂等，不阻塞同步。 */
async function writeApplied(ownerId, op, result, serverTime, deviceId) {
  try {
    await db
      .collection('outbox')
      .doc(op.opId)
      .set({
        ownerId,
        entity: String(op.entity || ''),
        entityId: String(op.entityId || ''),
        action: String(op.action || ''),
        deviceId,
        appliedAt: serverTime,
        result
      });
  } catch (error) {
    if (isEmptyCollectionError(error)) return;
    throw error;
  }
}

/** 设备元数据缺失不影响业务数据补推，只影响设备页的最近同步时间。 */
async function touchDevice(ownerId, device, serverTime) {
  const id = String((device && device.id) || '');
  if (!id) return;
  try {
    const existing = await getRow('devices', id);
    await db
      .collection('devices')
      .doc(id)
      .set({
        ownerId,
        label: String(device.label || (existing && existing.label) || ''),
        platform: String(device.platform || (existing && existing.platform) || ''),
        lastSyncAt: serverTime,
        createdAt: (existing && existing.createdAt) || serverTime,
        removedAt: (existing && existing.removedAt) || null
      });
  } catch (error) {
    if (isEmptyCollectionError(error)) return;
    throw error;
  }
}

async function listDevices(ownerId) {
  try {
    const result = await db
      .collection('devices')
      .where({ ownerId })
      .orderBy('lastSyncAt', 'desc')
      .limit(MAX_DEVICES)
      .get();
    return (result.data || []).map((row) => ({
      _id: String(row._id || ''),
      id: String(row._id || ''),
      label: row.label || '',
      platform: row.platform || '',
      lastSyncAt: row.lastSyncAt || null,
      createdAt: row.createdAt || 0,
      removedAt: row.removedAt || null
    }));
  } catch (error) {
    if (isEmptyCollectionError(error)) return [];
    throw error;
  }
}

function rowForClient(row, id) {
  if (!row) return null;
  return { ...row, _id: String(row._id || id), id: row.id || id };
}

/** 单条增量：返回 `accepted` 与冲突时的服务端当前版本。 */
async function applyOp(ownerId, op, serverTime, deviceId) {
  const opId = String(op.opId || '');
  if (!opId) return { opId, accepted: false, serverRev: null, server: null, error: 'invalid_op' };

  const applied = await readApplied(opId);
  if (applied) return applied;

  const entityId = String(op.entityId || '');
  const collection = COLLECTIONS[String(op.entity || '')];

  let result;
  if (!collection || !entityId) {
    // `sync` 等审计实体没有业务表，按已接收处理，避免客户端反复重试。
    result = { opId, accepted: true, serverRev: null, server: null };
  } else {
    const existing = await getRow(collection, entityId);
    // 不属于当前账号的行一律拒绝，且不回传内容，避免越权读写。
    if (existing && existing.ownerId && existing.ownerId !== ownerId) {
      result = { opId, accepted: false, serverRev: null, server: null };
    } else {
      // 同一台设备的连续写入（含响应丢失后的重试）不算冲突；只有另一台设备
      // 已经改过同一行、且本地基于旧版本时才拒绝。
      const stale =
        existing !== null &&
        (typeof op.baseRev !== 'number' ||
          Number(existing.rev || 0) !== Number(op.baseRev)) &&
        (!deviceId || String(existing.lastDeviceId || '') !== deviceId);

      if (stale) {
        result = {
          opId,
          accepted: false,
          serverRev: typeof existing.rev === 'number' ? existing.rev : null,
          server: rowForClient(existing, entityId)
        };
      } else {
        const payload = op.payload && typeof op.payload === 'object' ? { ...op.payload } : {};
        delete payload._id;
        const nextRev = existing ? Number(existing.rev || 1) + 1 : Number(payload.rev || 1);
        const row = {
          ...payload,
          id: payload.id || entityId,
          ownerId,
          rev: nextRev,
          updatedAt: serverTime,
          lastDeviceId: deviceId || null
        };
        await db.collection(collection).doc(entityId).set(row);
        result = { opId, accepted: true, serverRev: nextRev, server: null };
      }
    }
  }

  await writeApplied(ownerId, { ...op, entityId }, result, serverTime, deviceId);
  return result;
}

exports.main = async (event) => {
  const payload = event || {};
  const ownerId = callerUid(payload);
  if (!ownerId) {
    return { ok: false, code: 'unauthenticated', message: '未登录' };
  }

  const ops = Array.isArray(payload.ops) ? payload.ops.slice(0, MAX_OPS) : [];
  const deviceId = String((payload.device && payload.device.id) || '');
  const serverTime = Date.now();

  try {
    const results = [];
    for (const op of ops) {
      results.push(await applyOp(ownerId, op, serverTime, deviceId));
    }

    await touchDevice(ownerId, payload.device, serverTime);
    const devices = await listDevices(ownerId);

    return { ok: true, results, devices, serverTime };
  } catch (error) {
    const normalized = collectionMissing(error);
    return {
      ok: false,
      code: normalized.code === 'collection_missing' ? 'collection_missing' : 'sync_failed',
      message: normalized.message || '同步失败'
    };
  }
};
