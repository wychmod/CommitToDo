'use strict';

const api = require('../../utils/api');
const session = require('../../utils/session');
const format = require('../../utils/format');
const labels = require('../../utils/labels');
const view = require('../../utils/view');

/**
 * 分支详情（PRD V2-04 OP-05）。
 *
 * 只读展示目标、进度、待办、最近提交、子分支与里程碑；提交与里程碑可进入
 * 只读详情。已合并、已放下、已归档只展示状态与原因，不提供任何操作入口。
 */
const STATUS_TAG = {
  进行中: 'tag-accent',
  已合并: 'tag-success',
  已放下: 'tag-warning',
  已归档: 'tag-neutral'
};

Page({
  data: {
    phase: 'loading',
    offline: false,
    updatedAt: '',
    branch: null,
    tasks: [],
    commits: [],
    children: [],
    milestones: [],
    errorTitle: '',
    errorBody: ''
  },

  onLoad(options) {
    this.entryOptions = options || {};
    this.branchId = options && options.id ? decodeURIComponent(options.id) : '';
    if (!this.branchId) {
      this.setData({ phase: 'error', errorTitle: '没有找到这条分支', errorBody: '返回分支树重新选择一条。' });
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

    return api.fetchScope('branch', { id: this.branchId }).then((result) => {
      if (!result.ok) {
        if (session.handleAuthCode(result.code, this, this.entryOptions)) return;
        if (silent && this.data.phase === 'ready') {
          this.setData({ offline: true });
          return;
        }
        this.setData({ phase: 'error', errorTitle: '暂时读不到这条分支', errorBody: result.message || '请稍后重试' });
        return;
      }
      this.apply(result);
    });
  },

  apply(result) {
    const data = result.data;
    const branch = view.branchView(data.branch);
    branch.createdLabel = format.dateTimeLabel(data.branch.createdAt);
    branch.statusTagClass = STATUS_TAG[branch.statusLabel] || 'tag-accent';
    branch.archivedLabel = data.branch.archivedAt ? format.dateTimeLabel(data.branch.archivedAt) : '';
    branch.finishedLabel = data.branch.finishedAt ? format.dateTimeLabel(data.branch.finishedAt) : '';
    branch.droppedLabel = data.branch.droppedAt ? format.dateTimeLabel(data.branch.droppedAt) : '';

    wx.setNavigationBarTitle({ title: branch.title || '分支详情' });

    this.setData({
      phase: 'ready',
      offline: result.cached,
      updatedAt: format.updatedLabel(result.serverTime),
      branch,
      tasks: data.tasks.map((task) =>
        Object.assign(view.taskView(task, result.todayDate), {
          statusTagClass: task.status === 'done' ? 'tag-success' : 'tag-neutral'
        })
      ),
      commits: data.commits.map(view.commitView),
      children: data.children.map(view.branchView),
      milestones: data.milestones.map((milestone) =>
        Object.assign({}, milestone, {
          colorHex: labels.colorOf(milestone.branchColor),
          colorBg: labels.colorBgOf(milestone.branchColor)
        })
      )
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

  onOpenMilestone(event) {
    const id = event.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/detail/detail?kind=milestone&id=${encodeURIComponent(id)}` });
  },

  onOpenChild(event) {
    const id = event.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/branch-detail/branch-detail?id=${encodeURIComponent(id)}` });
  },

  onRetry() {
    this.load({ silent: true });
  }
});
