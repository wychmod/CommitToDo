'use strict';

/**
 * 异地备份云函数（PRD V1-06 OP-07，TECH §4.3）。
 *
 * 只做整包上传、取下载地址与删除，不解析备份内容、不合并、不回写用户数据。
 *
 * 归属：所有动作都要求调用者已登录，对象键固定为
 * `remote-backups/<uid>/<deviceId>/<requestId>.json`。download / delete 前校验
 * 键是否落在调用者自己的前缀下，否则任何人都能凭一个键取走或删除别人的备份。
 *
 * 键格式变更前的旧键（`remote-backups/<deviceId>/<requestId>.json`）不再可读写，
 * 返回 `backup.legacy_key`，由客户端提示重新上传一次。
 */

const cloudbase = require('@cloudbase/node-sdk');

// PG 存储由 RLS 把关，服务端需用 service_role API Key 才能越过策略；
// 密钥只通过云函数环境变量注入，不写入仓库。
const initOptions = { env: cloudbase.SYMBOL_CURRENT_ENV };
if (process.env.BACKUP_API_KEY) initOptions.accessKey = process.env.BACKUP_API_KEY;
const app = cloudbase.init(initOptions);

// PG 环境的对象存储必须显式指定 bucket；bucket 名由部署配置注入，缺省为当前环境的桶。
const BUCKET_ID = process.env.BACKUP_BUCKET || 'committodo';
const storage = app.storage.from(BUCKET_ID);

const OBJECT_PREFIX = 'remote-backups';
const MAX_PAYLOAD_BYTES = 32 * 1024 * 1024;

function sanitize(segment) {
  return String(segment || '').replace(/[^a-zA-Z0-9_-]/g, '');
}

function fail(code, message) {
  const error = new Error(message || code);
  error.code = code;
  return error;
}

/** 只信任平台注入的调用身份，不接受请求参数里的 uid。 */
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

/** 调用者自己的键前缀；download / delete 必须命中它。 */
function ownerPrefix(uid) {
  return `${OBJECT_PREFIX}/${uid}/`;
}

function requireOwnedKey(uid, remoteKey) {
  if (typeof remoteKey !== 'string' || remoteKey.length === 0) {
    throw fail('backup.invalid_key', 'backup.invalid_key');
  }
  if (remoteKey.includes('..')) throw fail('backup.invalid_key', 'backup.invalid_key');
  if (!remoteKey.startsWith(ownerPrefix(uid))) {
    // 旧格式键（没有 uid 段）与别人的键都走这里：不暴露「这个键是否存在」。
    throw fail('backup.legacy_key', 'backup.legacy_key');
  }
  return remoteKey;
}

function objectPath(uid, event) {
  const deviceId = sanitize(event.deviceId);
  const requestId = sanitize(event.requestId);
  if (!deviceId || !requestId) throw fail('backup.invalid_key', 'backup.invalid_key');
  return `${ownerPrefix(uid)}${deviceId}/${requestId}.json`;
}

async function upload(uid, event) {
  if (typeof event.text !== 'string' || event.text.length === 0) {
    throw fail('backup.empty_payload', 'backup.empty_payload');
  }
  const buffer = Buffer.from(event.text, 'utf8');
  if (buffer.length > MAX_PAYLOAD_BYTES) {
    throw fail('backup.too_large', 'backup.too_large');
  }
  const cloudPath = objectPath(uid, event);
  const result = await storage.upload(cloudPath, buffer, {
    contentType: 'application/json',
    upsert: true,
  });
  if (!result || result.error) {
    console.error('[backup-sign] upload failed', result && result.error);
    throw fail('backup.upload_failed', 'backup.upload_failed');
  }
  return { remoteKey: cloudPath };
}

async function download(uid, event) {
  const remoteKey = requireOwnedKey(uid, event.remoteKey);
  const result = await storage.createSignedUrls([remoteKey], 3600);
  if (result && result.error) {
    console.error('[backup-sign] sign failed', result.error);
    throw fail('backup.download_failed', 'backup.download_failed');
  }
  const list = (result && result.data) || [];
  const first = Array.isArray(list) ? list[0] : list;
  const signedUrl = first && (first.fullSignedURL || first.signedURL || first.signedUrl);
  if (!signedUrl) {
    console.error('[backup-sign] object missing', list);
    throw fail('backup.not_found', 'backup.not_found');
  }
  return { url: signedUrl };
}

async function remove(uid, event) {
  const remoteKey = requireOwnedKey(uid, event.remoteKey);
  const result = await storage.remove([remoteKey]);
  if (result && result.error) {
    console.error('[backup-sign] delete failed', result.error);
    throw fail('backup.delete_failed', 'backup.delete_failed');
  }
  return { deleted: true };
}

exports.main = async (event) => {
  const payload = event || {};
  const uid = callerUid(payload);
  if (!uid) return { ok: false, code: 'unauthenticated', message: '未登录' };

  try {
    switch (payload.action) {
      case 'upload':
        return { ok: true, ...(await upload(uid, payload)) };
      case 'download':
        return { ok: true, ...(await download(uid, payload)) };
      case 'delete':
        return { ok: true, ...(await remove(uid, payload)) };
      default:
        return { ok: false, code: 'backup.unknown_action', message: '未知动作' };
    }
  } catch (error) {
    const code = (error && error.code) || 'backup.failed';
    return { ok: false, code, message: (error && error.message) || 'backup failed' };
  }
};
