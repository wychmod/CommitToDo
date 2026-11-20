import { branchRows } from './tree-history.mjs';

const ids = {
  '我': 'root',
  '工作': 'work',
  '产品设计': 'product-design',
  '交互细化': 'interaction',
  '页面调研': 'page-research',
  '健康': 'health',
  '跑步': 'running',
  '生活': 'life',
  '阅读': 'reading',
  '摄影': 'photography',
};

const iconPaths = {
  add: '<path d="M8 3v10M3 8h10"/>',
  chevron: '<path d="m6 4 4 4-4 4"/>',
  down: '<path d="m4 6 4 4 4-4"/>',
  branch: '<circle cx="4.5" cy="3" r="1.5"/><circle cx="4.5" cy="13" r="1.5"/><circle cx="11.5" cy="4" r="1.5"/><path d="M4.5 4.5v7m7-6c0 3-2.5 3.5-7 3.5"/>',
  list: '<path d="M6.5 4h6.5M6.5 8h6.5m-6.5 4h6.5M3.25 4h.25m-.25 4h.25m-.25 4h.25"/>',
  check: '<path d="m3.5 8.5 2.5 2.5 6.5-6.5"/>',
  merge: '<path d="M2 11h12M2 5h3l5.5 6"/>',
  pause: '<path d="M6 4.25v7.5m4-7.5v7.5"/>',
  arrow: '<path d="M3 8h9m-4-4 4 4-4 4"/>',
};

function icon(name, size = 16) {
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + iconPaths[name] + '</svg>';
}

function familyTree(rows) {
  const path = [];
  const nodes = [];
  for (const row of rows) {
    const node = { ...row, id: ids[row.name], children: [], parents: path.slice(0, row.level) };
    path[row.level] = node;
    if (row.level) path[row.level - 1].children.push(node);
    nodes.push(node);
  }
  return { root: nodes[0], nodes };
}

const { root, nodes } = familyTree(branchRows);
const activeCount = nodes.filter(node => node.status === '进行中').length;
const mergedCount = nodes.filter(node => node.status === '已合并').length;
const pausedCount = nodes.filter(node => node.status === '已放下').length;

function shortDate(date) {
  if (!date) return '';
  const [month, day] = date.split('.').map(Number);
  return month + ' 月 ' + day + ' 日';
}

function identity(node) {
  return 'var(--' + (node.level ? node.color + '-' + node.level : 'muted') + ')';
}

function familyFill(node) {
  return node.level ? 'var(--' + node.color + '-bg)' : 'var(--inset)';
}

function rowStatus(node) {
  if (node.status === '已合并') return '<span class="bi-row-status bi-row-history">' + icon('merge', 13) + node.status + '</span>';
  if (node.status === '已放下') return '<span class="bi-row-status">' + icon('pause', 12) + node.status + '</span>';
  if (node.level === 0) return '<span class="bi-row-status">根分支</span>';
  return '<span class="sr-only">' + node.status + '</span>';
}

function outline(node) {
  const rowArrow = node.children.length ? icon('down', 13) : '';
  const dot = node.level === 0 ? icon('branch', 16) : '<i aria-hidden="true"></i>';
  const time = node.date ? '<time class="bi-row-date" datetime="2026-' + node.date.replace('.', '-') + '">' + shortDate(node.date) + '</time>' : '';
  return '<li class="bi-tree-entry" style="--bi-node:' + identity(node) + ';--bi-family:' + familyFill(node) + '">' +
    '<label class="bi-choice"><input type="radio" name="bi-current" id="bi-pick-' + node.id + '"' +
    (node.selected ? ' checked' : '') + '><span class="bi-tree-row"><span class="bi-tree-arrow">' + rowArrow +
    '</span><span class="bi-tree-symbol">' + dot + '</span><strong>' + node.name + '</strong>' +
    '<span class="bi-row-end">' + rowStatus(node) + time + '</span></span></label>' +
    (node.children.length ? '<ul class="bi-tree bi-children">' + node.children.map(outline).join('') + '</ul>' : '') + '</li>';
}

function nodesMotif() {
  return '<svg class="bi-branch-motif" width="148" height="116" viewBox="0 0 148 116" fill="none" aria-hidden="true">' +
    '<path d="M48 88h18a15 15 0 0 0 15-15V53a15 15 0 0 1 15-15h24M81 67h35a12 12 0 0 0 12-12V23" stroke="currentColor" stroke-width="1.5"/>' +
    '<circle cx="48" cy="88" r="3.5" fill="currentColor"/><circle cx="120" cy="38" r="3.5" fill="currentColor"/><circle cx="128" cy="23" r="3.5" fill="currentColor"/>' +
    '<circle cx="118" cy="34" r="52" stroke="currentColor" stroke-width="1" opacity=".25"/><circle cx="118" cy="34" r="40" stroke="currentColor" stroke-width="1" opacity=".25"/>' +
    '</svg>';
}

function summaryProgress(node) {
  if (!node.total) return '';
  return '<div class="bi-progress"><div class="bi-block-label">待办进度<span><strong>' + node.done +
    '</strong> / ' + node.total + '</span></div><div class="bi-progress-track" role="progressbar" aria-label="待办进度" aria-valuenow="' +
    node.done + '" aria-valuemax="' + node.total + '"><span style="width:' + (node.done / node.total * 100) + '%"></span></div></div>';
}

function latestActivity(node) {
  if (node.selected) {
    return '<div class="bi-summary-section"><h3>最近提交</h3><div class="bi-activity"><span class="bi-commit-icon">' +
      icon('check', 14) + '</span><div><strong>完成线框初稿</strong><time datetime="2026-11-20T16:42">11 月 20 日 · 16:42</time></div></div></div>';
  }
  if (!node.date) return '';
  return '<div class="bi-summary-section"><h3>最近提交</h3><p class="bi-last-date">' + shortDate(node.date) + '</p></div>';
}

function childLinks(node) {
  if (!node.children.length) return '';
  return '<div class="bi-summary-section"><h3>子分支 <small>' + node.children.length + '</small></h3><ul class="bi-preview-children">' +
    node.children.map(child => '<li><label for="bi-pick-' + child.id + '"><i style="--bi-child:' + identity(child) +
      '"></i><span>' + child.name + '</span>' + icon('chevron', 14) + '</label></li>').join('') + '</ul></div>';
}

function preview(node) {
  const parentPath = node.parents.length ? node.parents.map(parent => parent.name).slice(node.level > 1 ? 1 : 0).join(' / ') : '';
  const context = parentPath ? parentPath + ' <span aria-hidden="true">/</span> ' : '';
  const className = node.status === '已合并' ? 'bi-status-merged' : node.status === '已放下' ? 'bi-status-paused' : '';
  return '<article class="bi-detail" id="bi-preview-' + node.id + '" style="--bi-node:' + identity(node) +
    ';--bi-family:' + familyFill(node) + '" aria-labelledby="bi-name-' + node.id + '">' +
    '<div class="bi-detail-heading">' + nodesMotif() + '<p>' + context + '分支预览</p><h2 id="bi-name-' + node.id + '">' + node.name +
    '</h2><span class="bi-preview-status ' + className + '"><i aria-hidden="true"></i>' + node.status + '</span></div>' +
    '<div class="bi-detail-body">' + summaryProgress(node) + latestActivity(node) + childLinks(node) +
    '<a class="bi-detail-link" href="/branches/' + node.id + '">打开分支详情' + icon('arrow', 15) + '</a></div></article>';
}

const selectionStyles = nodes.map(node =>
  '.bi-layout:has(#bi-pick-' + node.id + ':checked) #bi-preview-' + node.id + '{display:block;}'
).join('\n');

const markup =
  '<div class="bi-page"><header class="page-head bi-header"><div><h1>分支</h1><p>在分支间切换，随手查看当前进度。</p></div>' +
  '<button type="button" class="btn btn-primary">' + icon('add', 15) + '新建分支</button></header>' +
  '<div class="bi-bar"><div class="bi-views" aria-label="视图"><button type="button" aria-pressed="true">' + icon('branch', 15) +
  '树与详情</button><button type="button" aria-pressed="false">' + icon('list', 15) + '列表</button></div>' +
  '<div class="bi-counts"><span><i></i><strong>' + activeCount + '</strong> 进行中</span><span><i></i><strong>' + mergedCount +
  '</strong> 已合并</span><span><i></i><strong>' + pausedCount + '</strong> 已放下</span></div></div>' +
  '<div class="bi-layout"><style>' + selectionStyles + '</style><section class="bi-outline panel" aria-label="分支树">' +
  '<header class="bi-panel-head"><h2>我的分支树</h2><span>' + root.children.length + ' 个一级分支</span></header>' +
  '<ul class="bi-tree">' + outline(root) + '</ul></section><aside class="bi-preview panel" aria-label="所选分支预览">' +
  nodes.map(preview).join('') + '</aside></div></div>';

export const page = {
  id: 'P02',
  slug: 'branches-inspect',
  title: '树与详情',
  section: '分支',
  route: '/branches',
  markup,
};
