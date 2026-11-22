'use strict';

/**
 * 设备列表云函数（PRD V2-02 OP-06，TECH §4.3）。
 *
 * 只返回当前调用身份所属账号的设备与最近同步时间；归属取调用身份的 `uid`。
 * 设备名与平台仅用于展示，本函数不读写任何业务内容。
 */

const cloudbase = require('@cloudbase/node-sdk');

const app = cloudbase.init({ env: cloudbase.SYMBOL_CURRENT_ENV });
const db = app.database();

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

exports.main = async (event) => {
  const ownerId = callerUid(event || {});
  if (!ownerId) {
    return { ok: false, code: 'unauthenticated', message: '未登录' };
  }

  try {
    const result = await db
      .collection('devices')
      .where({ ownerId })
      .orderBy('lastSyncAt', 'desc')
      .limit(MAX_DEVICES)
      .get();
    const devices = (result.data || []).map((row) => ({
      _id: String(row._id || ''),
      id: String(row._id || ''),
      label: row.label || '',
      platform: row.platform || '',
      lastSyncAt: row.lastSyncAt || null,
      createdAt: row.createdAt || 0,
      removedAt: row.removedAt || null
    }));
    return { ok: true, devices, serverTime: Date.now() };
  } catch (error) {
    if (isEmptyCollectionError(error)) {
      return { ok: true, devices: [], serverTime: Date.now() };
    }
    return { ok: false, code: 'read_failed', message: (error && error.message) || '读取失败' };
  }
};
