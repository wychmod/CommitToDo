'use strict';

const api = require('../../utils/api');
const session = require('../../utils/session');
const config = require('../../utils/config');

/**
 * 未登录拦截（PRD V2-04 OP-01）。
 *
 * 只显示登录入口与说明，不展示今天、分支树、历程、年轮或任何业务数据；
 * 登录成功后回到进入登录前的原页面（`next`），缺省「今天」。
 * 登录与绑定本身由 V2-01 负责，本页只做会话探测与回跳。
 */
Page({
  data: {
    checking: true,
    unbound: false,
    expired: false,
    error: '',
    next: 'pages/today/today',
    webUrl: config.WEB_URL
  },

  onLoad(options) {
    const next = options && options.next ? decodeURIComponent(options.next) : 'pages/today/today';
    this.setData({ next, expired: Boolean(options && options.reason === 'unauthenticated') });

    if (session.read()) {
      this.goNext();
      return;
    }
    this.probe();
  },

  probe() {
    this.setData({ checking: true, error: '' });
    api.fetchScope('session').then((result) => {
      if (result.ok) {
        session.save(result.data.account || {});
        this.goNext();
        return;
      }
      if (result.code === 'binding_required') {
        this.setData({ checking: false, unbound: true });
        return;
      }
      this.setData({
        checking: false,
        unbound: false,
        error: result.code === 'network' ? '网络不可用，请稍后重试' : ''
      });
    });
  },

  goNext() {
    wx.reLaunch({ url: `/${this.data.next}` });
  },

  onLogin() {
    if (this.data.checking) return;
    this.probe();
  },

  onCopyWeb() {
    wx.setClipboardData({ data: this.data.webUrl });
  }
});
