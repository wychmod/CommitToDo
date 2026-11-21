'use strict';

const api = require('../../utils/api');
const session = require('../../utils/session');
const format = require('../../utils/format');
const labels = require('../../utils/labels');
const view = require('../../utils/view');

/**
 * 历程（PRD V2-04 OP-06）。
 *
 * 默认最近 90 天，按日期从早到晚的纵向时间树；泳道、合回与停滞虚线与主端同一
 * 口径（R3 / R4），由云函数算好后返回。分支筛选只改变显示，不另算统计。
 */
const RANGES = [
  { kind: 'recent90', label: '最近 90 天' },
  { kind: 'thisYear', label: '今年' },
  { kind: 'all', label: '全部' }
];

const LANE_STEP = 12;

Page({
  data: {
    phase: 'loading',
    offline: false,
    updatedAt: '',
    rangeIndex: 0,
    rangeKind: 'recent90',
    rangeLabels: RANGES.map((row) => row.label),
    rangeLabel: RANGES[0].label,
    laneIndex: 0,
    laneLabels: ['全部分支'],
    laneWidth: 40,
    lanes: [],
    rows: [],
    stallNotes: [],
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
    const tabBar = typeof this.getTabBar === 'function' ? this.getTabBar() : null;
    if (tabBar) tabBar.setData({ selected: 2 });

    if (this.shownOnce) this.load({ silent: true });
    this.shownOnce = true;
  },

  onPullDownRefresh() {
    this.load({ silent: true }).then(() => wx.stopPullDownRefresh());
  },

  load(options) {
    const silent = Boolean(options && options.silent);
    if (!silent && this.data.phase !== 'ready') this.setData({ phase: 'loading' });

    return api.fetchScope('history', { range: this.data.rangeKind }).then((result) => {
      if (!result.ok) {
        if (session.handleAuthCode(result.code, this, this.entryOptions)) return;
        if (silent && this.data.phase === 'ready') {
          this.setData({ offline: true });
          return;
        }
        this.setData({ phase: 'error', errorTitle: '暂时读不到历程', errorBody: result.message || '请稍后重试' });
        return;
      }
      this.apply(result);
    });
  },

  apply(result) {
    const data = result.data;
    const lanes = data.lanes.map((lane) => ({
      index: lane.index,
      branchId: lane.branchId,
      title: lane.title,
      colorHex: labels.colorOf(lane.color),
      left: 10 + lane.index * LANE_STEP,
      stalledDays: lane.stalledDays
    }));

    this.allRows = data.rows.map((row) => {
      const lane = lanes[row.laneIndex];
      const from = 10 + row.laneIndex * LANE_STEP;
      const to = row.mergeToIndex === null ? from : 10 + row.mergeToIndex * LANE_STEP;
      return {
        key: row.key,
        kind: row.kind,
        date: row.date,
        laneIndex: row.laneIndex,
        branchId: row.branchId,
        title: row.title,
        sublabel: row.sublabel,
        entityId: row.entityId,
        colorHex: lane ? lane.colorHex : labels.BRANCH_COLOR_HEX.sky,
        nodeLeft: from,
        linkLeft: Math.min(from, to),
        linkWidth: Math.abs(to - from),
        ring: row.kind === 'fork' || row.kind === 'merge'
      };
    });

    const stallNotes = lanes
      .filter((lane) => lane.stalledDays !== null)
      .map((lane) => `「${lane.title}」已 ${lane.stalledDays} 天没有提交`);

    this.setData(
      {
        phase: 'ready',
        offline: result.cached,
        updatedAt: format.updatedLabel(result.serverTime),
        lanes,
        laneWidth: 12 * lanes.length + 16,
        laneLabels: ['全部分支', ...lanes.map((lane) => lane.title)],
        laneIndex: 0,
        rangeLabels: RANGES.map((row) => row.label),
        rangeLabel: (RANGES.find((row) => row.kind === data.range.kind) || RANGES[0]).label,
        stallNotes
      },
      () => this.applyRows()
    );
  },

  applyRows() {
    const laneIndex = Number(this.data.laneIndex);
    let lastDate = '';
    const rows = (this.allRows || [])
      .filter((row) => laneIndex === 0 || row.laneIndex === laneIndex - 1)
      .map((row) => {
        const showDate = row.date !== lastDate;
        if (showDate) lastDate = row.date;
        return Object.assign({}, row, { showDate, dayLabel: format.monthDay(row.date) });
      });

    this.setData({ rows, empty: rows.length === 0 });
  },

  onRangeChange(event) {
    const index = Number(event.detail.value);
    const range = RANGES[index] || RANGES[0];
    this.setData({ rangeIndex: index, rangeKind: range.kind, rangeLabel: range.label });
    this.load({ silent: false });
  },

  onLaneChange(event) {
    this.setData({ laneIndex: Number(event.detail.value) }, () => this.applyRows());
  },

  onOpenRow(event) {
    const dataset = event.currentTarget.dataset;
    if (!dataset.id) return;
    wx.navigateTo({
      url: `/pages/detail/detail?kind=${dataset.kind}&id=${encodeURIComponent(dataset.id)}`
    });
  },

  onOpenYear() {
    wx.navigateTo({ url: '/pages/year/year' });
  },

  onRetry() {
    this.load({ silent: true });
  }
});
