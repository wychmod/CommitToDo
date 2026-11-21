'use strict';

const api = require('../../utils/api');
const session = require('../../utils/session');
const format = require('../../utils/format');
const view = require('../../utils/view');

/**
 * 归档区（PRD V2-04 OP-10）。
 *
 * 已归档子树不进入默认树，按一级分支分组只读浏览；内容、进度与归档时间保留，
 * 不提供恢复、删除或编辑入口。
 */
Page({
  data: {
    phase: 'loading',
    offline: false,
    updatedAt: '',
    groups: [],
    empty: false,
    errorTitle: '',
    errorBody: ''
  },

  onLoad(options) {
    this.entryOptions = options || {};
    if (!session.requireLogin(this, this.entryOptions)) return;
    this.load({ silent: false });
  },

  onShow() {
    if (this.shownOnce) this.load({ silent: true });
    this.shownOnce = true;
  },

  onPullDownRefresh() {
    this.load({ silent: true }).then(() => wx.stopPullDownRefresh());
  },

  load(options) {
    const silent = Boolean(options && options.silent);
    if (!silent && this.data.phase !== 'ready') this.setData({ phase: 'loading' });

    return api.fetchScope('archive').then((result) => {
      if (!result.ok) {
        if (session.handleAuthCode(result.code, this, this.entryOptions)) return;
        if (silent && this.data.phase === 'ready') {
          this.setData({ offline: true });
          return;
        }
        this.setData({ phase: 'error', errorTitle: '暂时读不到归档区', errorBody: result.message || '请稍后重试' });
        return;
      }

      const groups = result.data.groups.map((group) => ({
        id: group.id,
        title: group.title,
        colorHex: view.branchView({ color: group.color }).colorHex,
        branches: group.branches.map((branch) =>
          Object.assign(view.branchView(branch), {
            archivedLabel: branch.archivedAt ? format.dateTimeLabel(branch.archivedAt) : ''
          })
        )
      }));

      this.setData({
        phase: 'ready',
        offline: result.cached,
        updatedAt: format.updatedLabel(result.serverTime),
        groups,
        empty: groups.length === 0
      });
    });
  },

  onOpen(event) {
    const id = event.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/branch-detail/branch-detail?id=${encodeURIComponent(id)}` });
  },

  onRetry() {
    this.load({ silent: true });
  }
});
