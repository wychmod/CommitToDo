'use strict';

const api = require('../../utils/api');
const session = require('../../utils/session');
const format = require('../../utils/format');
const view = require('../../utils/view');

/**
 * 只读详情（PRD V2-04 OP-03 / OP-05 / OP-09）。
 *
 * 一张页面承载待办、提交与里程碑三种只读详情；不出现完成、编辑、删除、收尾、
 * 放下或归档入口。已撤销提交保留文案并标注「已撤销」。
 */
Page({
  data: {
    phase: 'loading',
    offline: false,
    updatedAt: '',
    kind: '',
    task: null,
    commit: null,
    milestone: null,
    branch: null,
    errorTitle: '',
    errorBody: ''
  },

  onLoad(options) {
    this.entryOptions = options || {};
    this.kind = options && options.kind ? options.kind : '';
    this.detailId = options && options.id ? decodeURIComponent(options.id) : '';
    if (!this.kind || !this.detailId) {
      this.setData({ phase: 'error', errorTitle: '没有找到这条内容', errorBody: '返回上一页重新选择。' });
      return;
    }
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

    return api.fetchScope('detail', { kind: this.kind, id: this.detailId }).then((result) => {
      if (!result.ok) {
        if (session.handleAuthCode(result.code, this, this.entryOptions)) return;
        if (silent && this.data.phase === 'ready') {
          this.setData({ offline: true });
          return;
        }
        this.setData({ phase: 'error', errorTitle: '暂时读不到这条内容', errorBody: result.message || '请稍后重试' });
        return;
      }
      this.apply(result);
    });
  },

  apply(result) {
    const data = result.data;
    const todayDate = result.todayDate;
    const patch = {
      phase: 'ready',
      offline: result.cached,
      updatedAt: format.updatedLabel(result.serverTime),
      kind: data.kind,
      branch: data.branch || null,
      task: null,
      commit: null,
      milestone: null
    };

    if (data.kind === 'task') {
      const task = view.taskView(data.task, todayDate);
      task.plannedLabel = data.task.plannedDate || '未安排';
      task.statusTagClass = data.task.status === 'done' ? 'tag-success' : 'tag-neutral';
      task.completedLabel = data.task.completedAt ? format.dateTimeLabel(data.task.completedAt) : '';
      patch.task = task;
      wx.setNavigationBarTitle({ title: '待办详情' });
    } else if (data.kind === 'commit') {
      const commit = view.commitView(data.commit);
      commit.voidedLabel = data.commit.voidedAt ? format.dateTimeLabel(data.commit.voidedAt) : '';
      patch.commit = commit;
      patch.taskTitle = data.taskTitle || '';
      wx.setNavigationBarTitle({ title: '提交详情' });
    } else if (data.kind === 'milestone') {
      patch.milestone = data.milestone;
      wx.setNavigationBarTitle({ title: '里程碑详情' });
    }

    this.setData(patch);
  },

  onOpenBranch() {
    if (!this.data.branch || !this.data.branch.id) return;
    wx.navigateTo({ url: `/pages/branch-detail/branch-detail?id=${encodeURIComponent(this.data.branch.id)}` });
  },

  onRetry() {
    this.load({ silent: true });
  }
});
