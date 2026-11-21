'use strict';

const api = require('../../utils/api');
const session = require('../../utils/session');
const format = require('../../utils/format');
const view = require('../../utils/view');

/**
 * 分支树（PRD V2-04 OP-04 / OP-10）。
 *
 * 三层结构可展开 / 收起；行内只有名称、颜色、进度与状态，不出现拖拽、置顶、
 * 更多菜单与新建入口。已归档子树从默认树隐藏，只在归档区只读浏览。
 */
Page({
  data: {
    phase: 'loading',
    offline: false,
    updatedAt: '',
    usage: { used: 0, limit: 200 },
    archivedCount: 0,
    tree: [],
    empty: false,
    errorTitle: '',
    errorBody: ''
  },

  onLoad(options) {
    this.entryOptions = options || {};
    this.collapsed = {};
    if (!session.requireLogin(this, this.entryOptions)) return;
    this.load({ silent: false });
  },

  onShow() {
    const tabBar = typeof this.getTabBar === 'function' ? this.getTabBar() : null;
    if (tabBar) tabBar.setData({ selected: 1 });

    if (this.shownOnce) this.load({ silent: true });
    this.shownOnce = true;
  },

  onPullDownRefresh() {
    this.load({ silent: true }).then(() => wx.stopPullDownRefresh());
  },

  load(options) {
    const silent = Boolean(options && options.silent);
    if (!silent && this.data.phase !== 'ready') this.setData({ phase: 'loading' });

    return api.fetchScope('branches').then((result) => {
      if (!result.ok) {
        if (session.handleAuthCode(result.code, this, this.entryOptions)) return;
        if (silent && this.data.phase === 'ready') {
          this.setData({ offline: true });
          return;
        }
        this.setData({ phase: 'error', errorTitle: '暂时读不到分支树', errorBody: result.message || '请稍后重试' });
        return;
      }

      const data = result.data;
      this.rawTree = data.tree;
      this.setData({
        phase: 'ready',
        offline: result.cached,
        updatedAt: format.updatedLabel(result.serverTime),
        usage: data.usage,
        archivedCount: data.archivedCount,
        tree: view.flattenTree(data.tree, this.collapsed, 0, []),
        empty: !data.tree || data.tree.length === 0
      });
    });
  },

  onToggle(event) {
    const id = event.currentTarget.dataset.id;
    this.collapsed = this.collapsed || {};
    this.collapsed[id] = !this.collapsed[id];
    this.setData({ tree: view.flattenTree(this.rawTree, this.collapsed, 0, []) });
  },

  onOpen(event) {
    const id = event.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/branch-detail/branch-detail?id=${encodeURIComponent(id)}` });
  },

  onOpenArchive() {
    wx.navigateTo({ url: '/pages/archive/archive' });
  },

  onRetry() {
    this.load({ silent: true });
  }
});
