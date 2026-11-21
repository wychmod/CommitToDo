'use strict';

const { initCloud } = require('./utils/api');
const session = require('./utils/session');

/**
 * 第二端只读（PRD V2-04）。
 *
 * 启动时只初始化云环境与本地会话，不预读业务数据：
 * 每个页面进入或下拉刷新时按自己的范围拉取，失败时回退上次成功缓存。
 */

App({
  globalData: {
    session: null
  },

  onLaunch() {
    initCloud();
    this.globalData.session = session.read();
  },

  onShow() {
    if (!this.globalData.session) this.globalData.session = session.read();
  }
});
