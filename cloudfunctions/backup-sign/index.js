'use strict';

/**
 * 异地备份云函数（PRD V1-06 OP-07，TECH §4.3）。
 *
 * 只做整包上传、取下载地址与删除，不解析备份内容、不合并、不回写用户数据。
 * 归档路径按匿名设备标识与请求 id 分层；Web 只在拿到 remoteKey 后才写本机元数据。
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

function sanitize(segment) {
  return String(segment || '').replace(/[^a-zA-Z0-9_-]/g, '');
}

function objectPath(event) {
  const deviceId = sanitize(event.deviceId);
  const requestId = sanitize(event.requestId);
  if (!deviceId || !requestId) throw new Error('backup.invalid_key');
  return `${OBJECT_PREFIX}/${deviceId}/${requestId}.json`;
}

async function upload(event) {
  if (typeof event.text !== 'string' || event.text.length === 0) {
    throw new Error('backup.empty_payload');
  }
  const cloudPath = objectPath(event);
  const result = await storage.upload(cloudPath, Buffer.from(event.text, 'utf8'), {
    contentType: 'application/json',
    upsert: true,
  });
  if (!result || result.error) {
    console.error('[backup-sign] upload failed', result && result.error);
    throw new Error('backup.upload_failed');
  }
  return { remoteKey: cloudPath };
}

async function download(event) {
  if (typeof event.remoteKey !== 'string' || event.remoteKey.length === 0) {
    throw new Error('backup.invalid_key');
  }
  const result = await storage.createSignedUrls([event.remoteKey], 3600);
  if (result && result.error) {
    console.error('[backup-sign] sign failed', result.error);
    throw new Error('backup.download_failed');
  }
  const list = (result && result.data) || [];
  const first = Array.isArray(list) ? list[0] : list;
  const signedUrl = first && (first.fullSignedURL || first.signedURL || first.signedUrl);
  if (!signedUrl) {
    console.error('[backup-sign] object missing', list);
    throw new Error('backup.not_found');
  }
  return { url: signedUrl };
}

async function remove(event) {
  if (typeof event.remoteKey !== 'string' || event.remoteKey.length === 0) {
    throw new Error('backup.invalid_key');
  }
  const result = await storage.remove([event.remoteKey]);
  if (result && result.error) {
    console.error('[backup-sign] delete failed', result.error);
    throw new Error('backup.delete_failed');
  }
  return { deleted: true };
}

exports.main = async (event) => {
  switch (event && event.action) {
    case 'upload':
      return upload(event);
    case 'download':
      return download(event);
    case 'delete':
      return remove(event);
    default:
      throw new Error('backup.unknown_action');
  }
};
