import { branchRows } from './tree-history.mjs';

const width = 1056;
const height = 500;
const positions = {
  我: [28, 264, 139, 78], 工作: [231, 133, 164, 78], 健康: [231, 264, 164, 78], 生活: [231, 407, 164, 78],
  产品设计: [466, 84, 212, 82], 页面调研: [466, 179, 212, 78], 跑步: [466, 264, 212, 78],
  阅读: [466, 359, 212, 78], 摄影: [466, 454, 212, 76], 交互细化: [759, 84, 245, 78]
};

const root = { children: [] };
const ancestors = [];
for (const branch of branchRows) {
  const [x, y, w, h] = positions[branch.name];
  const entry = { ...branch, x, y, w, h, children: [] };
  const parent = ancestors[branch.level - 1] || root;
  parent.children.push(entry);
  ancestors[branch.level] = entry;
  ancestors.length = branch.level + 1;
}

const rootNode = root.children[0];
const paths = {
  map: '<rect x="2" y="3" width="4" height="4" rx=".8"/><rect x="10" y="2" width="4" height="4" rx=".8"/><rect x="10" y="10" width="4" height="4" rx=".8"/><path d="M6 5h2v7h2m-2-7V4h2"/>',
  list: '<path d="M5.5 4H14M5.5 8H14m-8.5 4H14M2.25 4h.5m-.5 4h.5m-.5 4h.5"/>',
  plus: '<path d="M8 3v10M3 8h10"/>', down: '<path d="m4 6 4 4 4-4"/>',
  right: '<path d="m6 4 4 4-4 4"/>', arrow: '<path d="M2.5 8h10m-4-4 4 4-4 4"/>',
  fork: '<circle cx="4" cy="4" r="1.5"/><circle cx="4" cy="12" r="1.5"/><circle cx="12" cy="4" r="1.5"/><path d="M4 5.5v5M10.5 4C8 4 8 8 4 8"/>',
  merge: '<path d="M2.5 8h11M3 4h2l4 4"/>', pause: '<path d="M6 4v8m4-8v8"/>',
};
const icon = (name, size = 15) =>
  '<svg width="' + size + '" height="' + size + '" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.38" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths[name] + '</svg>';
const part = (length, limit) => (length / limit * 100).toFixed(4) + '%';

function styleFor(node) {
  const structural = node.level === 0 || node.status === '已放下';
  const tone = structural ? 'var(--neutral)' : 'var(--' + node.color + '-' + node.level + ')';
  const tint = structural ? 'var(--neutral-bg)' : 'var(--' + node.color + '-bg)';
  return '--node-x:' + part(node.x, width) + ';--node-y:' + node.y + 'px;--node-w:' + part(node.w, width) +
    ';--node-h:' + node.h + 'px;--node-tint:' + tint + ';--node-tone:' + tone;
}

function renderBranch(node) {
  const isRoot = node.level === 0;
  const family = node.level === 1;
  const progress = node.total ? '<span class="bm-ratio">' + node.done + '<span> / </span>' + node.total + '</span>' : '';
  const metadata = family ? '<span>' + node.children.length + ' 个子分支</span>' : progress;
  const stateIcon = node.status === '已合并' ? icon('merge', 12) : node.status === '已放下' ? icon('pause', 12) : '';
  const stateClass = node.status === '已合并' ? ' is-merged' : node.status === '已放下' ? ' is-paused' : '';
  const state = isRoot ? '<span>根分支</span>' : '<span class="bm-status' + stateClass + '">' + stateIcon + node.status + '</span>';
  const selected = node.selected ? ' is-selected' : '';
  const kind = isRoot ? ' bm-root' : family ? ' bm-family' : '';
  const tag = node.selected ? 'a' : 'div';
  const link = node.selected ? ' href="#map-selection" aria-label="' + node.name + '，已完成 ' + node.done + ' 项，共 ' + node.total + ' 项，当前选中"' : '';
  const arrow = node.selected ? '<span class="bm-node-arrow">' + icon('right', 13) + '</span>' : '';
  const date = stateClass ? '<span class="bm-node-date">' + node.date + '</span>' : '';
  const children = node.children.length ? '<ul>' + node.children.map(renderBranch).join('') + '</ul>' : '';
  return '<li><' + tag + ' class="bm-node' + kind + selected + '"' + link + ' style="' + styleFor(node) + '">' +
    '<span class="bm-node-title"><span class="bm-node-mark">' + (isRoot ? icon('fork') : '') + '</span><strong>' +
    node.name + '</strong>' + arrow + '</span><span class="bm-node-meta">' + state + (metadata ? '<i></i>' + metadata : '') +
    date + '</span></' + tag + '>' + children + '</li>';
}

function elbow(startX, startY, endX, endY) {
  if (startY === endY) return 'M' + startX + ' ' + startY + 'H' + endX;
  const mid = (startX + endX) / 2;
  const radius = 11;
  const direction = Math.sign(endY - startY);
  return 'M' + startX + ' ' + startY + 'H' + (mid - radius) + 'Q' + mid + ' ' + startY + ' ' + mid + ' ' +
    (startY + radius * direction) + 'V' + (endY - radius * direction) + 'Q' + mid + ' ' + endY + ' ' +
    (mid + radius) + ' ' + endY + 'H' + endX;
}

function descendantWires(node) {
  return node.children.map(child => {
    const tone = child.status === '已放下' ? 'var(--line-strong)' : 'var(--' + child.color + '-' + child.level + ')';
    return '<path class="bm-connector' + (child.selected ? ' is-active' : '') + '" style="--wire:' + tone + '" d="' +
      elbow(node.x + node.w, node.y, child.x, child.y) + '"/>' + descendantWires(child);
  }).join('');
}

const stemX = 195;
const [head, center, tail] = rootNode.children;
const rootWires = [
  '<path class="bm-spine" d="M' + (rootNode.x + rootNode.w) + ' ' + rootNode.y + 'H' + stemX + 'M' + stemX + ' ' + (head.y + 11) + 'V' + (tail.y - 11) + '"/>',
  '<path class="bm-connector" style="--wire:var(--coral-1)" d="M' + stemX + ' ' + (head.y + 11) + 'Q' + stemX + ' ' + head.y + ' ' + (stemX + 11) + ' ' + head.y + 'H' + head.x + '"/>',
  '<path class="bm-connector" style="--wire:var(--sky-1)" d="M' + stemX + ' ' + center.y + 'H' + center.x + '"/>',
  '<path class="bm-connector" style="--wire:var(--honey-1)" d="M' + stemX + ' ' + (tail.y - 11) + 'Q' + stemX + ' ' + tail.y + ' ' + (stemX + 11) + ' ' + tail.y + 'H' + tail.x + '"/>',
  '<circle class="bm-junction" cx="' + stemX + '" cy="' + rootNode.y + '" r="2.6"/>',
].join('');
const selected = branchRows.find(node => node.selected);
const counts = ['进行中', '已合并', '已放下'].map(status => [branchRows.filter(node => node.status === status).length, status]);
const columns = [
  ['根分支', rootNode.x],
  ['一级分支', positions.工作[0]],
  ['二级分支', positions.产品设计[0]],
  ['三级分支', positions.交互细化[0]],
].map(([title, x]) => '<span style="--column-x:' + part(x, width) + '">' + title + '</span>').join('');

const markup =
  '<div class="bm-page"><header class="page-head bm-page-head"><div><div class="eyebrow">个人工作区</div>' +
  '<h1>分支</h1><p>从一个根分支出发，看清每条路径的归属与进度。</p></div>' +
  '<button type="button" class="btn btn-primary">' + icon('plus') + '新建分支</button></header>' +
  '<div class="bm-tools"><div class="bm-view-toggle" role="group" aria-label="视图"><button type="button" aria-pressed="true">' +
  icon('map') + '层级图</button><button type="button" aria-pressed="false">' + icon('list') + '列表</button></div>' +
  '<button type="button" class="btn btn-quiet">全部状态' + icon('down', 12) + '</button><div class="bm-overview">' +
  counts.map(([count, status]) => '<span><b>' + count + '</b> 条' + status + '</span>').join('') +
  '</div></div><section class="panel bm-panel" aria-label="分支层级图"><div class="bm-panel-head"><div>' +
  '<span class="bm-chart-icon">' + icon('fork') + '</span><h2>我的分支树</h2></div><span class="caption">一级分支 ' +
  rootNode.children.length + ' / 7</span></div><div class="bm-map-scroll" tabindex="0" aria-label="可横向查看的分支层级图">' +
  '<div class="bm-map"><div class="bm-columns" aria-hidden="true">' + columns +
  '</div><svg class="bm-edges" viewBox="0 0 ' + width + ' ' + height + '" preserveAspectRatio="none" aria-hidden="true">' +
  rootWires + rootNode.children.map(descendantWires).join('') + '</svg>' +
  '<ul class="bm-graph-list" aria-label="全部分支">' + renderBranch(rootNode) +
  '</ul></div></div><div class="bm-selection" id="map-selection"><div class="bm-selection-copy">' +
  '<span class="bm-selection-crumb">当前分支 <i></i> 工作 ' + icon('right', 12) + '</span><strong>' + selected.name +
  '</strong></div><div class="bm-selection-progress"><span>待办进度 <b>' + selected.done + ' / ' + selected.total +
  '</b></span><div class="bm-meter"><i style="width:' + part(selected.done, selected.total) +
  '"></i></div></div><div class="bm-selection-recent"><span>最近活动</span><b>' + selected.date + '</b></div>' +
  '<a class="btn btn-quiet bm-detail-link" href="/branches/product-design">查看分支详情 ' + icon('arrow') + '</a></div></section></div>';

export const page = { id: 'P02', slug: 'branches-map', title: '层级图', section: '分支', route: '/branches', markup };
