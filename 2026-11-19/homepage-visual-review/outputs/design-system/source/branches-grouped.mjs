import { branchRows } from './tree-history.mjs';

const symbols = {
  plus: '<path d="M8 3v10M3 8h10"/>',
  root: '<path d="M8 5v3m0 0H4v3m4-3h4v3"/><circle cx="8" cy="3.5" r="1.5"/><circle cx="4" cy="12.5" r="1.5"/><circle cx="12" cy="12.5" r="1.5"/>',
  coral: '<rect x="2.5" y="5.4" width="11" height="7.6" rx="1.4"/><path d="M5.4 5.4V4.2c0-.7.4-1.2 1.2-1.2h2.8c.8 0 1.2.5 1.2 1.2v1.2M2.6 8.6c3.6 1 7.3 1 10.8 0"/>',
  sky: '<path d="M13 4.5a2.8 2.8 0 0 0-4 0L8 5.6l-1.1-1A2.8 2.8 0 0 0 3 8.5l5 4.6 5-4.6a2.8 2.8 0 0 0 0-4Z"/>',
  honey: '<path d="M2.5 7.5 8 3l5.5 4.5M4 6.8V13h8V6.8m-5 6.2v-3h2v3"/>',
  down: '<path d="m4 6 4 4 4-4"/>',
  merge: '<path d="M2.4 8h11m-10-4h2l4 4"/>',
  more: '<circle cx="3.5" cy="8" r=".65"/><circle cx="8" cy="8" r=".65"/><circle cx="12.5" cy="8" r=".65"/>',
};

function icon(key, size = 16) {
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + symbols[key] + '</svg>';
}

const root = branchRows[0];

function groupsAtLevel(rows, level) {
  const groups = [];
  for (const row of rows) {
    if (row.level === level) groups.push({ row, children: [] });
    else if (row.level > level && groups.length) groups.at(-1).children.push(row);
  }
  return groups;
}

const groupRoots = groupsAtLevel(branchRows, 1);

function renderStatus(status) {
  const mark = status === '已合并' ? icon('merge', 13) : '<i aria-hidden="true"></i>';
  return '<span class="bga-status" data-status="' + status + '">' + mark + status + '</span>';
}

function renderDate(date, label = '最近提交') {
  return '<span class="bga-date" aria-label="' + label + ' ' + date + '"><span class="bga-date-label">' + label + '</span><span class="mono">' + date + '</span></span>';
}

function renderNode(row) {
  const progress = '<span class="bga-progress" aria-label="完成 ' + row.done + ' 项，共 ' + row.total + ' 项"><i aria-hidden="true"><i style="--done:' + (row.done / row.total) + '"></i></i><span class="mono">' + row.done + '/' + row.total + '</span></span>';
  const marker = '<i class="bga-marker" aria-hidden="true"></i>';
  const button = '<button type="button" class="bga-more" aria-label="' + row.name + '的更多操作">' + icon('more', 17) + '</button>';
  return '<div class="bga-row" data-level="' + row.level + '"' + (row.selected ? ' data-selected="true"' : '') + '>' +
    '<div class="bga-branch-name">' + marker + '<strong>' + row.name + '</strong></div><div class="bga-meta">' +
    progress + renderDate(row.date, row.status === '已合并' ? '合并于' : row.status === '已放下' ? '放下于' : undefined) + renderStatus(row.status) + '</div>' + button + '</div>';
}

function renderFamily({ row: family, children: descendants }) {
  const levelTwo = groupsAtLevel(descendants, 2);
  const children = levelTwo.map(({ row, children: nested }) =>
    '<li>' + renderNode(row) + (nested.length
      ? '<ul class="bga-children">' + nested.map((leaf) => '<li>' + renderNode(leaf) + '</li>').join('') + '</ul>'
      : '') + '</li>'
  ).join('');

  return '<li class="bga-family-item" data-family="' + family.color + '"><section class="bga-family" aria-label="' + family.name + '">' +
    '<header class="bga-family-head"><div class="bga-family-title"><span class="bga-family-icon">' + icon(family.color, 18) +
    '</span><div><h2>' + family.name + '</h2><span class="caption">' + levelTwo.length + ' 个直接子分支</span></div></div>' +
    '<div class="bga-family-meta">' + renderDate(family.date) + renderStatus(family.status) + '<button type="button" class="bga-more" aria-label="' +
    family.name + '的更多操作">' + icon('more', 17) + '</button></div></header><ul class="bga-children">' + children + '</ul></section></li>';
}

const totals = ['进行中', '已合并', '已放下'].map((status) => '<span data-status="' + status + '"><i aria-hidden="true"></i><strong>' +
  branchRows.filter((row) => row.status === status).length + '</strong> ' + status + '</span>').join('');

const markup = '<div class="bga-page"><header class="page-head bga-head"><div><span class="eyebrow">个人工作区 / 分支</span><h1>分支</h1></div>' +
  '<button type="button" class="btn btn-primary">' + icon('plus') + '新建分支</button></header>' +
  '<div class="bga-tools"><div class="bga-view"><button type="button" aria-pressed="true">' + icon('root') +
  '分组树</button><button type="button" aria-pressed="false">列表</button></div>' +
  '<button type="button" class="btn btn-quiet bga-filter">全部状态' + icon('down', 13) + '</button><div class="bga-totals" aria-label="分支状态">' +
  totals + '</div></div>' +
  '<div class="bga-root"><span class="bga-root-icon">' + icon('root', 14) + '</span><h2>' + root.name +
  '</h2><span class="caption">' + root.status + ' · ' + groupRoots.length + ' 个一级分支</span></div><ul class="bga-groups">' +
  groupRoots.map(renderFamily).join('') + '</ul></div>';

export const page = { id: 'P02', slug: 'branches-grouped', title: '分组树', section: '分支', route: '/branches', markup };
