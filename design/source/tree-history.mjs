const glyphs = {
  plus: '<path d="M8 3.25v9.5M3.25 8h9.5"/>',
  down: '<path d="m4 6 4 4 4-4"/>',
  right: '<path d="m6 4 4 4-4 4"/>',
  diagonal: '<path d="M4 12 12 4M6 4h6v6"/>',
  tree: '<path d="M8 4v3m0 0H4v4m4-4h4v4"/><circle cx="8" cy="3" r="1.4"/><circle cx="4" cy="12.5" r="1.4"/><circle cx="12" cy="12.5" r="1.4"/>',
  list: '<path d="M5.5 4h7.5M5.5 8h7.5m-7.5 4h7.5M3 4h.25M3 8h.25M3 12h.25"/>',
  calendar: '<rect x="2.5" y="4" width="11" height="9" rx="1.3"/><path d="M5.5 2.5v3m5-3v3m-8 1.5h11"/>',
  more: '<circle cx="4" cy="8" r=".7"/><circle cx="8" cy="8" r=".7"/><circle cx="12" cy="8" r=".7"/>',
  merge: '<path d="M2 8h12M2 4h3l4 4"/>',
  milestone: '<path d="m8 2.5 5.5 5.5-5.5 5.5L2.5 8Z"/>',
};

function icon(name, size = 16) {
  return `<svg class="bh-icon" width="${size}" height="${size}" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${glyphs[name]}</svg>`;
}

const rows = [
  { name: '我', level: 0, expands: true, color: 'root', status: '根分支' },
  { name: '工作', level: 1, expands: true, color: 'coral', date: '11.20', status: '进行中' },
  { name: '产品设计', level: 2, expands: true, color: 'coral', done: 4, total: 9, date: '11.20', guides: [true], status: '进行中', selected: true },
  { name: '交互细化', level: 3, color: 'coral', done: 1, total: 3, date: '11.17', guides: [true, true], last: true, status: '进行中' },
  { name: '页面调研', level: 2, color: 'coral', done: 3, total: 3, date: '11.13', guides: [true], last: true, status: '已合并' },
  { name: '健康', level: 1, expands: true, color: 'sky', date: '11.18', status: '进行中' },
  { name: '跑步', level: 2, color: 'sky', done: 3, total: 5, date: '11.18', guides: [true], last: true, status: '进行中' },
  { name: '生活', level: 1, expands: true, color: 'honey', date: '10.14', last: true, status: '进行中' },
  { name: '阅读', level: 2, color: 'honey', done: 2, total: 6, date: '10.14', guides: [false], status: '进行中' },
  { name: '摄影', level: 2, color: 'honey', done: 1, total: 3, date: '11.02', guides: [false], last: true, status: '已放下' },
];

function treeWire(row) {
  const x = (depth) => 7 + depth * 20;
  const parts = [];
  for (const [depth, keep] of (row.guides || []).entries()) {
    if (keep) parts.push(`M${x(depth)} 0V48`);
  }
  if (row.level) {
    parts.push(`M${x(row.level - 1)} 0V24H${x(row.level)}`);
    if (!row.last) parts.push(`M${x(row.level - 1)} 24V48`);
  }
  if (row.expands) parts.push(`M${x(row.level)} 32V48`);
  return `<svg class="bh-tree-wire" width="84" height="48" viewBox="0 0 84 48" aria-hidden="true"><path d="${parts.join(' ')}"/></svg>`;
}

function treeRow(row) {
  const dormant = row.status === '已放下';
  return `<div class="bh-tree-row bh-color-${row.color}${row.selected ? ' is-selected' : ''}${dormant ? ' is-dormant' : ''}" style="--depth:${row.level}">
    <div class="bh-tree-name" data-level="${row.level}">${treeWire(row)}<span class="bh-tree-arrival">${row.expands ? `<span class="bh-tree-expander">${icon('down', 12)}</span>` : '<span class="bh-tree-expander"></span>'}<i class="bh-tree-mark"></i><span class="bh-tree-label">${row.name}</span></span></div>
    <div class="bh-tree-progress">${row.total ? `<span class="bh-progress"><i style="--progress:${row.done / row.total}"></i></span><span class="mono">${row.done}<span class="bh-slash">/</span>${row.total}</span>` : '<span class="bh-empty-value">—</span>'}</div>
    <div class="bh-tree-date mono">${row.date || '—'}</div>
    <div><span class="bh-tree-status ${row.status === '进行中' ? 'is-live' : ''} ${row.status === '已合并' ? 'is-merged' : ''}">${row.status === '已合并' ? icon('merge', 12) : ''}${row.status}</span></div>
    <span class="bh-tree-more">${row.level ? icon('more') : ''}</span>
  </div>`;
}

const branchMarkup = `<div class="bh-page bh-branches">
  <header class="page-head bh-head"><div><div class="eyebrow">个人工作区 / 分支</div><h1>分支</h1><p>从一个起点，把不同方向的事分开做。</p></div><button type="button" class="btn btn-primary bh-btn">${icon('plus')}新建分支</button></header>
  <div class="bh-toolbar">
    <div class="bh-view-switch" aria-label="视图"><button type="button" aria-pressed="true">${icon('tree')}树视图</button><button type="button" aria-pressed="false">${icon('list')}列表</button></div>
    <div class="bh-toolbar-filters"><button type="button" class="btn btn-quiet bh-btn">全部状态${icon('down', 14)}</button><button type="button" class="btn btn-quiet bh-btn">层级顺序${icon('down', 14)}</button></div>
    <div class="bh-toolbar-count"><strong>7</strong> 条进行中 <span>·</span> <strong>1</strong> 条已合并 <span>·</span> <strong>1</strong> 条已放下</div>
  </div>
  <section class="panel bh-tree-panel" aria-label="我的分支树">
    <div class="bh-panel-label"><div>${icon('tree', 19)}<h2>我的分支树</h2></div><span class="caption">舒适密度</span></div>
    <div class="bh-tree-header"><span>分支名称</span><span>待办进度</span><span>最近提交</span><span>状态</span><span></span></div>
    <div class="bh-tree-body">${rows.map(treeRow).join('')}</div>
    <div class="bh-tree-foot"><span>一级分支 <strong>3 / 7</strong></span><span><i class="bh-key-dot"></i> 颜色沿父分支继承</span></div>
  </section>
  <div class="bh-footnote"><span>当前分支</span><span>工作 ${icon('right', 11)} <strong>产品设计</strong></span><span>完成 4 / 9</span></div>
</div>`;

const dayMs = 86400000;
const date = (month, day) => Date.UTC(2026, month - 1, day);
const start = date(8, 23);
const end = date(11, 20);
const plotStart = 160;
const plotEnd = 1067;
const horizontal = (month, day) => Math.round((plotStart + (date(month, day) - start) / (end - start) * (plotEnd - plotStart)) * 10) / 10;
const lanes = { work: 88, research: 160, design: 216, health: 288, life: 376 };
const researchStart = horizontal(11, 3);
const researchEnd = horizontal(11, 13);
const stalledFrom = horizontal(10, 14);

function rail(x1, y, x2, extra = '') {
  return `<path class="bh-rail ${extra}" d="M${x1} ${y}H${x2}"/>`;
}

function dots(y, dates) {
  return dates.map(([month, day]) => `<circle class="bh-commit" cx="${horizontal(month, day)}" cy="${y}" r="4"/>`).join('');
}

function timelineLabel(y, name, level, color) {
  const connector = level ? `<path class="bh-label-wire" d="M32 ${y - 18}V${y}h11"/>` : '';
  const left = level ? 50 : 24;
  return `<g class="bh-lane-label bh-color-${color} ${level ? 'is-child' : ''}">${connector}<rect x="${left}" y="${y - 4}" width="8" height="8" rx="2"/><text x="${left + 16}" y="${y + 4.5}">${name}</text></g>`;
}

const chart = `<svg class="bh-chart" width="1118" height="420" viewBox="0 0 1118 420" role="img" aria-labelledby="bh-chart-title bh-chart-desc">
  <title id="bh-chart-title">工作、健康、生活的时间树</title>
  <desc id="bh-chart-desc">页面调研在 11 月 13 日合回工作。产品设计的完成线框初稿在 11 月 20 日被选中。生活分支最近一次提交来自阅读，已停滞 37 天。</desc>
  <g class="bh-ledger" aria-hidden="true">
    <rect class="bh-current-date" x="${plotEnd - 9}" y="34" width="18" height="382" rx="5"/>
    <path class="bh-grid" d="M0 44H1118M0 132H1118M0 188H1118M0 244H1118M0 332H1118M${plotStart} 0V420"/>
    ${[[8,23],[9,1],[10,1],[10,14],[11,1],[11,13],[11,20]].map(([month, day], i) => {
      const x = horizontal(month, day);
      const label = `${String(month).padStart(2,'0')}.${String(day).padStart(2,'0')}`;
      const active = i === 6;
      return `<path class="bh-grid bh-date-grid" d="M${x} 44V416"/><text class="bh-tick${active ? ' is-now' : ''}" x="${x}" y="28" text-anchor="${!i ? 'start' : 'middle'}">${label}</text>`;
    }).join('')}
    ${timelineLabel(lanes.work, '工作', 0, 'coral')}
    ${timelineLabel(lanes.research, '页面调研', 1, 'coral')}
    ${timelineLabel(lanes.design, '产品设计', 1, 'coral')}
    ${timelineLabel(lanes.health, '健康', 0, 'sky')}
    ${timelineLabel(lanes.life, '生活', 0, 'honey')}
    <g class="bh-color-coral">
      ${rail(plotStart, lanes.work, plotEnd)}
      ${dots(lanes.work, [[9,3],[9,17],[10,4],[10,22]])}
      <path class="bh-rail bh-child-rail" d="M${researchStart} ${lanes.work} C${researchStart + 22} ${lanes.work}, ${researchStart + 23} ${lanes.research}, ${researchStart + 39} ${lanes.research} H${researchEnd - 44} C${researchEnd - 25} ${lanes.research}, ${researchEnd - 21} ${lanes.work}, ${researchEnd} ${lanes.work}"/>
      <path class="bh-rail bh-child-rail" d="M${researchEnd} ${lanes.work} C${researchEnd + 11} ${lanes.work}, ${researchEnd + 9} ${lanes.design}, ${researchEnd + 31} ${lanes.design} H${plotEnd}"/>
      <g class="bh-child">${dots(lanes.research, [[11,7],[11,8]])}</g>
      <circle class="bh-merge" cx="${researchEnd}" cy="${lanes.work}" r="4"/>
      <path class="bh-milestone" d="M${horizontal(11,16)} ${lanes.design - 5}l5 5-5 5-5-5Z"/>
    </g>
    <g class="bh-color-sky">
      ${rail(plotStart, lanes.health, plotEnd)}
      ${dots(lanes.health, [[8,30],[9,13],[9,27],[10,24],[11,5],[11,18]])}
    </g>
    <g class="bh-color-honey">${rail(plotStart, lanes.life, stalledFrom)}
      ${rail(stalledFrom, lanes.life, plotEnd, 'bh-stalled-rail')}
      ${dots(lanes.life, [[9,8],[9,24],[10,14]])}
      <rect class="bh-stall-chip" x="${stalledFrom + 18}" y="${lanes.life + 12}" width="49" height="20" rx="5"/><text class="bh-stall-label" x="${stalledFrom + 42.5}" y="${lanes.life + 26}" text-anchor="middle">37 天</text>
    </g>
    <g class="bh-selected-node">
      <circle class="bh-focus-halo" cx="${plotEnd}" cy="${lanes.design}" r="8"/>
      <circle class="bh-focus-dot" cx="${plotEnd}" cy="${lanes.design}" r="4"/>
      <path class="bh-tooltip-pointer" d="M${plotEnd} ${lanes.design + 8}v6"/>
      <rect class="bh-tooltip" x="884" y="230" width="194" height="47" rx="7"/>
      <text class="bh-tooltip-title" x="897" y="249">完成线框初稿</text>
      <text class="bh-tooltip-meta" x="897" y="266">工作 / 产品设计 · 11.20 16:42</text>
    </g>
  </g>
</svg>`;

const historyMarkup = `<div class="bh-page bh-history">
  <header class="page-head bh-head"><div><div class="eyebrow">个人工作区 / 历程</div><h1>历程</h1><p>看见每一次完成，也看见分支怎样长出来。</p></div><button type="button" class="btn btn-quiet bh-btn">2026 年轮 ${icon('diagonal', 15)}</button></header>
  <div class="bh-toolbar">
    <div class="bh-view-switch" aria-label="时间范围"><button type="button" aria-pressed="true">近 90 天</button><button type="button" aria-pressed="false">今年</button><button type="button" aria-pressed="false">全部</button></div>
    <div class="bh-toolbar-filters"><button type="button" class="btn btn-quiet bh-btn">全部分支${icon('down', 14)}</button></div>
    <div class="bh-toolbar-count mono">2026.08.23 <span>—</span> 2026.11.20</div>
  </div>
  <section class="panel bh-chart-panel" aria-label="时间树">
    <div class="bh-panel-label"><div>${icon('tree', 19)}<h2>我的时间树</h2></div><div class="bh-chart-context"><i></i><span>今天 · 11 月 20 日</span></div></div>
    <div class="bh-chart-viewport">${chart}</div>
    <div class="bh-chart-legend">
      <span><i class="bh-key-dot"></i>提交</span><span>${icon('milestone', 13)}里程碑</span><span>${icon('merge', 15)}汇合</span>
      <span><i class="bh-key-dashed"></i>停滞</span><span><i class="bh-key-paused"></i>已放下</span>
    </div>
  </section>
  <section class="panel bh-milestone-panel" aria-label="里程碑">
    <div class="bh-panel-label"><div>${icon('milestone', 18)}<h2>里程碑</h2></div><span class="caption">近 90 天 · 1 项</span></div>
    <div class="bh-milestone-row"><span class="mono">11.16</span><strong>首页结构确认</strong><span class="bh-color-coral"><i class="bh-tree-mark"></i>工作 / 产品设计</span></div>
  </section>
</div>`;

export { rows as branchRows };

export const pages = [
  { id: 'P02', slug: 'branches', title: '分支', section: '分支', route: '/branches', markup: branchMarkup },
  { id: 'P04', slug: 'history', title: '历程', section: '历程', route: '/history', markup: historyMarkup },
];
