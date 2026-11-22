'use strict';

/**
 * 异地备份云函数（PRD V1-06 OP-07，TECH §4.3）。
 *
 * 只做整包上传、取下载地址与删除，不解析备份内容、不合并、不回写用户数据。
 * 归档路径按匿名设备标识与请求 id 分层；Web 只在拿到 remoteKey 后才写本机元数据。
 */

const cloudbase = require('@cloudbase/node-sdk');

const app = cloudbase.init({ env: cloudbase.SYMBOL_CURRENT_ENV });

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
  const result = await app.uploadFile({
    cloudPath,
    fileContent: Buffer.from(event.text, 'utf8'),
  });
  return { remoteKey: result.fileID };
}

async function download(event) {
  if (typeof event.remoteKey !== 'string' || event.remoteKey.length === 0) {
    throw new Error('backup.invalid_key');
  }
  const result = await app.getTempFileURL({ fileList: [event.remoteKey] });
  const item = result.fileList && result.fileList[0];
  if (!item || item.status !== 0 || !item.tempFileURL) {
    throw new Error('backup.not_found');
  }
  return { url: item.tempFileURL };
}

async function remove(event) {
  if (typeof event.remoteKey !== 'string' || event.remoteKey.length === 0) {
    throw new Error('backup.invalid_key');
  }
  await app.deleteFile({ fileList: [event.remoteKey] });
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
