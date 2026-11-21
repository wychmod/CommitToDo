'use strict';

const api = require('../../utils/api');
const session = require('../../utils/session');
const format = require('../../utils/format');

/**
 * 我的（PRD V2-04 OP-07）。
 *
 * 只显示账号邮箱、当前设备与最近同步时间；账号操作只有退出登录，
 * 不提供改密、改昵称、设备管理等写入口。
 */
Page({
  data: {
    phase: 'loading',
    offline: false,
    updatedAt: '',
    email: '',
    syncText: '',
    errorTitle: '',
    errorBody: ''
  },

  onLoad(options) {
    this.entryOptions = options || {};
    if (!session.requireLogin(this, this.entryOptions)) return;
    this.load({ silent: false });
  },

  onShow() {
    const tabBar = typeof this.getTabBar === 'function' ? this.getTabBar() : null;
    if (tabBar) tabBar.setData({ selected: 3 });

    if (this.shownOnce) this.load({ silent: true });
    this.shownOnce = true;
  },

  onPullDownRefresh() {
    this.load({ silent: true }).then(() => wx.stopPullDownRefresh());
  },

  load(options) {
    const silent = Boolean(options && options.silent);
    if (!silent && this.data.phase !== 'ready') this.setData({ phase: 'loading' });

    return api.fetchScope('me').then((result) => {
      if (!result.ok) {
        if (session.handleAuthCode(result.code, this, this.entryOptions)) return;
        if (silent && this.data.phase === 'ready') {
          this.setData({ offline: true });
          return;
        }
        this.setData({ phase: 'error', errorTitle: '暂时读不到账号信息', errorBody: result.message || '请稍后重试' });
        return;
      }

      const data = result.data;
      this.setData({
        phase: 'ready',
        offline: result.cached,
        updatedAt: format.updatedLabel(result.serverTime),
        email: data.account.email || '未返回邮箱',
        syncText: format.syncLabel(data.device.lastSyncAt)
      });
    });
  },

  onOpenBadges() {
    wx.navigateTo({ url: '/pages/badges/badges' });
  },

  onOpenHelp() {
    wx.navigateTo({ url: '/pages/help/help' });
  },

  onLogout() {
    wx.showModal({
      title: '退出登录',
      content: '退出后需要重新登录才能查看。',
      success: (result) => {
        if (!result.confirm) return;
        session.clear();
        wx.reLaunch({ url: '/pages/login/login' });
      }
    });
  },

  onRetry() {
    this.load({ silent: true });
  }
});
