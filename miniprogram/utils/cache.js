'use strict';

const config = require('./config');

/**
 * 上次成功结果的端侧缓存（PRD V2-04 §5「缓存」）。
 *
 * 只缓存读取响应，用于断网时展示「上次内容」，不写任何业务表；
 * 每个范围一份，键里带参数，避免切换年份或分支后串数据。
 */

function keyOf(scope, params) {
  return `${config.CACHE_PREFIX}${scope}:${JSON.stringify(params || {})}`;
}

function write(scope, params, payload) {
  try {
    wx.setStorageSync(keyOf(scope, params), { savedAt: Date.now(), payload });
  } catch (error) {
    // 存储不可用时放弃缓存，界面仍显示本次成功结果。
  }
}

function read(scope, params) {
  try {
    const row = wx.getStorageSync(keyOf(scope, params));
    return row && row.payload ? row : null;
  } catch (error) {
    return null;
  }
}

module.exports = { write, read };
