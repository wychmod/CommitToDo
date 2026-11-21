'use strict';

const api = require('../../utils/api');
const session = require('../../utils/session');
const format = require('../../utils/format');
const labels = require('../../utils/labels');

/**
 * 年轮（PRD V2-04 OP-06）。
 *
 * 四项指标、12 个月分布、一级分支占比与年度总结全部只读；年度总结只展示文本，
 * 不提供编辑。默认当前年，可切到有数据的年份。
 */
Page({
  data: {
    phase: 'loading',
    offline: false,
    updatedAt: '',
    year: 0,
    years: [],
    yearLabels: [],
    yearIndex: 0,
    metrics: [],
    months: [],
    shares: [],
    review: '',
    empty: false,
    errorTitle: '',
    errorBody: ''
  },

  onLoad(options) {
    this.entryOptions = options || {};
    this.selectedYear = null;
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

    const params = this.selectedYear ? { year: this.selectedYear } : {};
    return api.fetchScope('year', params).then((result) => {
      if (!result.ok) {
        if (session.handleAuthCode(result.code, this, this.entryOptions)) return;
        if (silent && this.data.phase === 'ready') {
          this.setData({ offline: true });
          return;
        }
        this.setData({ phase: 'error', errorTitle: '暂时读不到年轮', errorBody: result.message || '请稍后重试' });
        return;
      }
      this.apply(result);
    });
  },

  apply(result) {
    const data = result.data;
    const counts = data.months.map((month) => (month.count === null ? 0 : month.count));
    const max = Math.max(1, ...counts);

    const metrics = [
      { value: data.metrics.commits, label: '有效提交' },
      { value: data.metrics.activeLevelOneBranches, label: '活跃一级分支' },
      { value: data.metrics.opened, label: '新开分支' },
      { value: data.metrics.finished, label: '合回分支' }
    ];

    const months = data.months.map((month) => ({
      month: month.month,
      count: month.count,
      show: month.count !== null,
      empty: month.count === 0,
      percent: month.count === null ? 0 : Math.max(month.count === 0 ? 2 : 4, Math.round((month.count / max) * 100))
    }));

    const shares = data.shares.map((share) => ({
      branchId: share.branchId,
      title: share.title,
      ratio: share.ratio,
      percent: Math.round(share.ratio * 100),
      commits: share.commits,
      taskDone: share.taskDone,
      taskTotal: share.taskTotal,
      colorHex: labels.colorOf(share.color)
    }));

    const yearIndex = Math.max(0, data.years.indexOf(data.year));

    this.setData({
      phase: 'ready',
      offline: result.cached,
      updatedAt: format.updatedLabel(result.serverTime),
      year: data.year,
      years: data.years,
      yearLabels: data.years.map((year) => `${year} 年`),
      yearIndex,
      metrics,
      months,
      shares,
      review: data.review || '',
      empty: data.total === 0 && data.metrics.opened === 0 && data.metrics.finished === 0
    });
  },

  onYearChange(event) {
    const index = Number(event.detail.value);
    const year = this.data.years[index];
    if (!year) return;
    this.selectedYear = year;
    this.setData({ yearIndex: index });
    this.load({ silent: false });
  },

  onRetry() {
    this.load({ silent: true });
  }
});
