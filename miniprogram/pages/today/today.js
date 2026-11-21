'use strict';

const api = require('../../utils/api');
const session = require('../../utils/session');
const format = require('../../utils/format');
const view = require('../../utils/view');

/**
 * 今天（PRD V2-04 OP-02 / OP-03）。
 *
 * 三组与页头两个计数全部来自 `workspace.read` 的同一口径；每条只能进入只读详情，
 * 不出现勾选完成、行尾更多、快速添加或「安排到今天」。
 */
Page({
  data: {
    phase: 'loading',
    offline: false,
    updatedAt: '',
    dateLabel: '',
    todayDate: '',
    dueCount: 0,
    noDueCount: 0,
    empty: false,
    groups: [],
    recentCommits: [],
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
    if (tabBar) tabBar.setData({ selected: 0 });

    if (this.shownOnce) this.load({ silent: true });
    this.shownOnce = true;
  },

  onPullDownRefresh() {
    this.load({ silent: true }).then(() => wx.stopPullDownRefresh());
  },

  load(options) {
    const silent = Boolean(options && options.silent);
    if (!silent && this.data.phase !== 'ready') this.setData({ phase: 'loading' });

    return api.fetchScope('today').then((result) => {
      if (!result.ok) {
        if (session.handleAuthCode(result.code, this, this.entryOptions)) return;
        if (silent && this.data.phase === 'ready') {
          this.setData({ offline: true });
          return;
        }
        this.setData({ phase: 'error', errorTitle: '暂时读不到今天', errorBody: result.message || '请稍后重试' });
        return;
      }
      this.apply(result);
    });
  },

  apply(result) {
    const data = result.data;
    const todayDate = data.localDate;
    const collapsed = this.collapsed || {};

    const groups = data.groups.map((group) => {
      const open = collapsed[group.key] === undefined ? group.key !== 'noDue' : collapsed[group.key] === false;
      return {
        key: group.key,
        title: group.title,
        open,
        tasks: group.tasks.map((task) => view.taskView(task, todayDate))
      };
    });

    this.setData({
      phase: 'ready',
      offline: result.cached,
      updatedAt: format.updatedLabel(result.serverTime),
      dateLabel: format.dateLabel(todayDate),
      todayDate,
      dueCount: data.dueCount,
      noDueCount: data.noDueCount,
      empty: data.dueCount + data.noDueCount === 0,
      groups,
      recentCommits: data.recentCommits.map(view.commitView)
    });
  },

  onToggleGroup(event) {
    const key = event.currentTarget.dataset.key;
    this.collapsed = this.collapsed || {};
    const group = this.data.groups.find((row) => row.key === key);
    if (!group) return;
    this.collapsed[key] = group.open;
    this.setData({
      groups: this.data.groups.map((row) => (row.key === key ? Object.assign({}, row, { open: !row.open }) : row))
    });
  },

  onOpenTask(event) {
    const id = event.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/detail/detail?kind=task&id=${encodeURIComponent(id)}` });
  },

  onOpenCommit(event) {
    const id = event.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/detail/detail?kind=commit&id=${encodeURIComponent(id)}` });
  },

  onRetry() {
    this.load({ silent: true });
  }
});
