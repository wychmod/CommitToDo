'use strict';

/** 页面只读文案与常量：状态、分支色、徽章目录、帮助内容。 */

const BRANCH_COLOR_HEX = {
  coral: '#A84427',
  sky: '#286BA3',
  honey: '#906511',
  mint: '#23725A',
  iris: '#6451A8',
  rose: '#A23862',
  teal: '#156E75'
};

const BRANCH_COLOR_BG = {
  coral: '#F9EDE8',
  sky: '#E8F2FB',
  honey: '#F8F0D9',
  mint: '#E7F4ED',
  iris: '#F0ECFA',
  rose: '#F8E9EF',
  teal: '#E5F2F2'
};

const BADGE_CATEGORY = {
  structure: '结构与取舍',
  time: '时间与坚持',
  milestone: '里程碑',
  easter: '彩蛋'
};

const BADGE_CATALOG = {
  'first-commit': { name: '第一笔提交', hint: '完成第一条待办' },
  'first-fork': { name: '第一次分叉', hint: '新建第一条子分支' },
  'first-milestone': { name: '第一座里程碑', hint: '记下第一个里程碑' },
  'first-merge': { name: '第一次合回', hint: '收尾并并入父分支' },
  'all-merged': { name: '全部归位', hint: '所有子分支都已收尾' },
  'dual-lanes': { name: '双线并行', hint: '两条一级分支同时有提交' },
  'let-go': { name: '放下也是选择', hint: '放下一条分支并写下原因' },
  'well-ended': { name: '善始善终', hint: '收尾时补齐分支目标' },
  'five-faces': { name: '五面人生', hint: '五个一级分支都有提交' },
  trunk: { name: '主干常青', hint: '根分支持续有提交' },
  backfill: { name: '补记过去', hint: '回填一条过去的提交' },
  evergreen: { name: '常青树', hint: '连续多周都有提交' },
  'first-year': { name: '一年之约', hint: '一条分支走过一年' },
  'three-milestones': { name: '三座里程碑', hint: '累计三个里程碑' },
  'milestone-note': { name: '有注脚的里程碑', hint: '里程碑写下备注' },
  'year-marks': { name: '年度刻度', hint: '一年内三座里程碑' },
  'night-flight': { name: '夜航', hint: '深夜完成一次提交' },
  'cross-year': { name: '跨年', hint: '在跨年时刻留下提交' },
  'blank-year': { name: '空白年', hint: '一年没有提交后仍回来' },
  revival: { name: '复苏', hint: '放下的分支重新开始' },
  'full-moon': { name: '满月', hint: '连续三十天有提交' }
};

const HISTORY_KIND_LABEL = {
  commit: '提交',
  milestone: '里程碑',
  fork: '分出',
  merge: '合回',
  stall: '停滞'
};

const HELP_SECTIONS = [
  {
    title: '这是只读的第二端',
    body: '在手机上查看今天、分支树、历程与年轮。新建、完成、编辑、收尾与设置都在 Web 主端完成。'
  },
  {
    title: '数据从哪里来',
    body: '与 Web 登录同一账号，读取已经同步到账号的数据。第二端不写入任何业务数据，也不产生离线补传。'
  },
  {
    title: '为什么会有延迟',
    body: '主端写入后，第二端在同步延迟内可能仍是旧值；下拉刷新会拉取最新结果，页面顶部显示更新时间。'
  },
  {
    title: '撤销的提交',
    body: '已撤销的提交仍保留文案并标注「已撤销」，但不计入提交数、进度与年轮统计。'
  },
  {
    title: '徽章',
    body: '徽章记录使用方式，不是任务。已获得的徽章按分类只读展示；未获得的只显示名称与条件。'
  }
];

function colorOf(name) {
  return BRANCH_COLOR_HEX[name] || BRANCH_COLOR_HEX.sky;
}

function colorBgOf(name) {
  return BRANCH_COLOR_BG[name] || BRANCH_COLOR_BG.sky;
}

function badgeName(id) {
  const row = BADGE_CATALOG[id];
  return row ? row.name : id;
}

function badgeHint(id) {
  const row = BADGE_CATALOG[id];
  return row ? row.hint : '';
}

module.exports = {
  BRANCH_COLOR_HEX,
  BRANCH_COLOR_BG,
  BADGE_CATEGORY,
  BADGE_CATALOG,
  HISTORY_KIND_LABEL,
  HELP_SECTIONS,
  colorOf,
  colorBgOf,
  badgeName,
  badgeHint
};
