'use strict';

const config = require('./config');
const cache = require('./cache');

/**
 * 只读数据入口（PRD V2-04 §5）。
 *
 * 所有业务数据都经 `workspace.read` 云函数按账号归属读取；小程序不直连数据库、
 * 不写 outbox、不写 events。网络失败时回退该范围上一次成功缓存，并标记 `cached`。
 */

let ready = false;

function initCloud() {
  if (ready || typeof wx === 'undefined' || !wx.cloud) return;
  const options = { traceUser: true };
  if (config.ENV_ID) options.env = config.ENV_ID;
  wx.cloud.init(options);
  ready = true;
}

function tzOffset() {
  return -new Date().getTimezoneOffset();
}

function call(scope, params) {
  initCloud();
  return new Promise((resolve) => {
    wx.cloud.callFunction({
      name: config.READ_FUNCTION,
      data: Object.assign({ scope, tzOffset: tzOffset() }, params || {}),
      success: (response) => resolve((response && response.result) || { ok: false, code: 'read_failed' }),
      fail: () => resolve({ ok: false, code: 'network', message: '网络不可用' })
    });
  });
}

function fetchScope(scope, params) {
  return call(scope, params).then((result) => {
    if (result && result.ok) {
      cache.write(scope, params, result);
      return {
        ok: true,
        data: result.data,
        serverTime: result.serverTime,
        todayDate: result.todayDate,
        cached: false
      };
    }

    const fallback = cache.read(scope, params);
    if (fallback && (result.code === 'network' || result.code === 'read_failed')) {
      return {
        ok: true,
        data: fallback.payload.data,
        serverTime: fallback.savedAt,
        todayDate: fallback.payload.todayDate,
        cached: true
      };
    }

    return {
      ok: false,
      code: (result && result.code) || 'read_failed',
      message: (result && result.message) || '读取失败'
    };
  });
}

module.exports = { initCloud, fetchScope };
