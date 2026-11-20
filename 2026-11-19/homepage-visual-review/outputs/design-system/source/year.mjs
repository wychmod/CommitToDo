const months = [
  [2, 0, 0], [4, 1, 1], [2, 1, 1], [4, 2, 1], [3, 1, 1], [4, 2, 2],
  [2, 2, 2], [4, 3, 2], [6, 3, 3], [6, 3, 4], [12, 5, 0], null,
];
const branches = [
  { label: '工作', color: 'coral' },
  { label: '健康', color: 'sky' },
  { label: '生活', color: 'honey' },
];
const counts = branches.map((_, index) => months.reduce((sum, month) => sum + (month?.[index] ?? 0), 0));
const total = counts.reduce((sum, count) => sum + count, 0);

const icon = (path, size = 16) =>
  `<svg aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
const left = icon('<path d="m14 6-6 6 6 6"/>');
const right = icon('<path d="m10 6 6 6-6 6"/>');
const share = icon('<path d="M8 12l8-5m-8 5 8 5"/><circle cx="6" cy="12" r="2.2"/><circle cx="18" cy="6" r="2.2"/><circle cx="18" cy="18" r="2.2"/>');
const edit = icon('<path d="m5 16-.5 3.5L8 19l10-10-3-3L5 16Zm8-8 3 3M4 21h16"/>');

const stat = (value, label, details) => `
  <div class="year-stat"><span>${label}</span><strong>${value}</strong><small>${details}</small></div>`;
const monthColumn = (month, index) => {
  const monthLabel = `${String(index + 1).padStart(2, '0')}`;
  if (!month) {
    return `<div class="year-month month-future"><div class="year-bar-track"><span class="year-future-mark" aria-hidden="true">—</span></div><span aria-label="12 月未开始">${monthLabel}</span></div>`;
  }
  const monthTotal = month.reduce((sum, count) => sum + count, 0);
  const current = index === 10;
  const detail = `${index + 1} 月 · ${monthTotal} 条提交 · ${branches.map((branch, branchIndex) => `${branch.label} ${month[branchIndex]}`).join('、')}`;
  return `
  <div class="year-month${current ? ' month-current' : ''}" role="img" aria-label="${detail}" title="${detail}">
    <div class="year-bar-track">
      <div class="year-bar" style="--bar-size:${monthTotal * 5}%">
        ${current ? `<span class="year-bar-number">${monthTotal}</span>` : ''}
        ${month.map((count, branchIndex) => count > 0 ? `<span class="year-segment year-${branches[branchIndex].color}" style="flex-grow:${count}"></span>` : '').join('')}
      </div>
    </div>
    <span>${monthLabel}</span>
  </div>`;
};

const shareGraphic = `
  <svg role="img" aria-label="年度分享图示例。只显示匿名分支轨迹和提交总数" viewBox="0 0 144 180" fill="none" class="year-share-graphic">
    <defs>
      <pattern id="year-share-grid" width="16" height="16" patternUnits="userSpaceOnUse"><path d="M16 0H0V16" class="year-share-grid" /></pattern>
    </defs>
    <rect x="1" y="1" width="142" height="178" rx="10" class="year-share-paper"/>
    <g transform="translate(1 17) scale(.85 1.16)">
    <path d="M18 42h132v66H18z" fill="url(#year-share-grid)"/>
    <text x="16" y="25" class="year-share-typography">2026 年轮</text>
    <g stroke-width="1.6" stroke-linecap="round">
      <path class="year-share-coral" d="M18 58h132m-107 0 13-10h26l13 10"/>
      <path class="year-share-sky" d="M18 76h132m-79 0 12 9h25"/>
      <path class="year-share-honey" d="M18 96h96"/>
    </g>
    <g stroke-width="0">
      <circle cx="28" cy="58" r="3.2" class="year-share-coral"/><circle cx="69" cy="48" r="3.2" class="year-share-coral"/><circle cx="95" cy="58" r="3.2" class="year-share-coral"/><circle cx="142" cy="58" r="3.2" class="year-share-coral"/>
      <circle cx="39" cy="76" r="3.2" class="year-share-sky"/><circle cx="71" cy="76" r="3.2" class="year-share-sky"/><circle cx="108" cy="85" r="3.2" class="year-share-sky"/>
      <circle cx="59" cy="96" r="3.2" class="year-share-honey"/><circle cx="98" cy="96" r="3.2" class="year-share-honey"/>
    </g>
    <text x="16" y="124" class="year-share-foot">CommitToDo</text>
    <text x="150" y="124" class="year-share-foot" text-anchor="end">${total} 条提交</text>
    </g>
  </svg>`;

export const pages = [{
  id: 'P05',
  slug: 'year',
  title: '2026 年轮',
  section: '历程',
  route: '/history/2026',
  markup: `
    <div class="year-page">
      <header class="year-head">
        <div>
          <div class="year-breadcrumb"><span>历程</span><span aria-hidden="true">/</span><span>年度回顾</span></div>
          <h1>2026 <span>年轮</span></h1>
          <p>回看一年里的每一次提交、开枝和收尾。</p>
        </div>
        <div class="year-picker" aria-label="年度选择">
          <button type="button" aria-label="上一年">${left}</button>
          <span>2026 年</span>
          <button type="button" aria-label="下一年" disabled>${right}</button>
        </div>
      </header>

      <section class="year-stats" aria-label="年度统计">
        ${stat(total, '有效提交', '截至 11 月 20 日')}
        ${stat(3, '活跃一级分支', '工作、健康、生活')}
        ${stat(7, '新开分支', '全年新建的分支')}
        ${stat(1, '收尾并合并', '页面调研 · 11 月 13 日')}
      </section>

      <section class="year-panel year-monthly" aria-labelledby="year-monthly">
        <div class="year-panel-head">
          <div><h2 id="year-monthly">每月提交</h2><p>按一级分支分组，包含其下的有效提交。</p></div>
          <div class="year-chart-legend" aria-label="分支图例">
            ${branches.map(branch => `<span><i class="year-${branch.color}" aria-hidden="true"></i>${branch.label}</span>`).join('')}
          </div>
        </div>
        <div class="year-chart" aria-label="2026 年每月有效提交">
          <div class="year-axis" aria-hidden="true"><span>20</span><span>15</span><span>10</span><span>5</span><span>0</span></div>
          <div class="year-chart-inner">
            <div class="year-grid" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
            <div class="year-columns">${months.map(monthColumn).join('')}</div>
          </div>
        </div>
        <div class="year-chart-footer">
          <span><i></i>11 月截至 20 日</span>
          <span>12 月尚未开始</span>
        </div>
      </section>

      <div class="year-bottom">
        <section class="year-panel year-distribution" aria-labelledby="year-distribution">
          <div class="year-panel-head">
            <div><h2 id="year-distribution">分支分布</h2><p>按全年有效提交排序。</p></div>
            <span class="year-distribution-label">提交 <span>占比</span></span>
          </div>
          <div class="year-share-bar" role="img" aria-label="工作 55%，健康 26%，生活 19%">
            ${branches.map((branch, index) => `<i class="year-${branch.color}" style="flex-grow:${counts[index]}"></i>`).join('')}
          </div>
          <div class="year-branch-list">
            ${branches.map((branch, index) => `<div class="year-branch-row"><span><i class="year-${branch.color}"></i>${branch.label}</span><b>${counts[index]}</b><span>${Math.round(counts[index] / total * 100)}%</span></div>`).join('')}
          </div>
          <p class="year-observation">工作占比从第三季度的 44% 升至 10 月至今的 60%。</p>
        </section>

        <section class="year-panel year-notes" aria-labelledby="year-notes">
          <div class="year-panel-head"><div><h2 id="year-notes">年度总结</h2><p>留一句话给这一年。</p></div><button type="button" class="year-icon-button" aria-label="编辑年度总结">${edit}</button></div>
          <p class="year-note">把零散的点子做成了能推进的设计，<br>也让散步成了日常。</p>
          <div class="year-share">
            <div><strong>带走这一年的轨迹</strong><p>分享图默认隐藏待办标题和分支名称。</p><button type="button" class="btn btn-quiet year-share-button">${share} 生成分享图</button></div>
            ${shareGraphic}
          </div>
        </section>
      </div>
    </div>`,
}];
