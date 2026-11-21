'use strict';

const api = require('../../utils/api');
const session = require('../../utils/session');
const format = require('../../utils/format');
const labels = require('../../utils/labels');

/**
 * 徽章墙（PRD V2-04 OP-07）。
 *
 * 分类与顺序沿用 V1-05 / V2-03，只读展示已获得与未获得；彩蛋获得前不出现，
 * 不显示「去今天」等写操作引导。
 */
Page({
  data: {
    phase: 'loading',
    offline: false,
    updatedAt: '',
    earnedCount: 0,
    total: 0,
    groups: [],
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

    return api.fetchScope('badges').then((result) => {
      if (!result.ok) {
        if (session.handleAuthCode(result.code, this, this.entryOptions)) return;
        if (silent && this.data.phase === 'ready') {
          this.setData({ offline: true });
          return;
        }
        this.setData({ phase: 'error', errorTitle: '暂时读不到徽章', errorBody: result.message || '请稍后重试' });
        return;
      }
      this.apply(result);
    });
  },

  apply(result) {
    const data = result.data;
    const groups = data.groups
      .filter((group) => group.category !== 'easter' || group.earnedCount > 0)
      .map((group) => ({
        category: group.category,
        label: labels.BADGE_CATEGORY[group.category] || group.category,
        earnedCount: group.earnedCount,
        total: group.total,
        items: group.items.map((item, index) => ({
          catalogId: item.catalogId,
          name: labels.badgeName(item.catalogId),
          hint: labels.badgeHint(item.catalogId),
          earned: item.earned,
          mark: item.earned ? '✓' : String(index + 1),
          stateLabel: item.earned ? '已获得' : '未获得'
        }))
      }));

    this.setData({
      phase: 'ready',
      offline: result.cached,
      updatedAt: format.updatedLabel(result.serverTime),
      earnedCount: data.earnedCount,
      total: data.total,
      groups
    });
  },

  onRetry() {
    this.load({ silent: true });
  }
});
