const icons = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="m5 12 4 4 10-10"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  branch: '<path d="M7 6v12m0-2a9 9 0 0 1 9-9"/><circle cx="7" cy="5" r="2"/><circle cx="7" cy="19" r="2"/><circle cx="17" cy="7" r="2"/>',
  diamond: '<path d="m12 3 9 9-9 9-9-9 9-9Z"/>',
};

function icon(name, size = 16) {
  return `<svg aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${icons[name]}</svg>`;
}

const branches = {
  design: { label: '工作 / 产品设计', tone: 'coral', level: 2 },
  interaction: { label: '工作 / 产品设计 / 交互细化', tone: 'coral', level: 3 },
  run: { label: '健康 / 跑步', tone: 'sky', level: 2 },
  reading: { label: '生活 / 阅读', tone: 'honey', level: 2 },
  root: { label: '我', tone: 'root' },
};

const tasks = {
  emptyStates: { title: '确认移动端空状态', branch: 'design', date: '11 月 18 日' },
  training: { title: '更新训练计划', branch: 'run', date: '11 月 19 日' },
  review: { title: '复查移动端界面', branch: 'design', date: '今天' },
  interactions: { title: '完成首页交互细节', branch: 'interaction', date: '今天' },
  notes: { title: '整理一页读书摘记', branch: 'reading', date: '今天' },
  copy: { title: '补齐页面说明', branch: 'design', date: '无截止日期' },
  nextMonth: { title: '整理下月主题', branch: 'root', date: '无截止日期' },
  appearance: { title: '走查深色模式', branch: 'design', date: '11 月 24 日' },
  handoff: { title: '补齐交接清单', branch: 'design', date: '11 月 27 日' },
};

const recent = [
  { title: '完成线框初稿', branch: 'design', date: '11 月 20 日', time: '16:42' },
  { title: '整理首页参考', branch: 'design', date: '11 月 19 日', time: '17:10' },
  { title: '晚饭后散步', branch: 'run', date: '11 月 18 日', time: '19:20' },
];

const designCommits = [
  recent[0],
  recent[1],
  { title: '梳理功能入口', branch: 'design', date: '11 月 16 日', time: '14:25' },
  { title: '整理页面需求', branch: 'design', date: '11 月 14 日', time: '10:30' },
];

function branchTag(id) {
  const { label, tone, level } = branches[id];
  const dot = tone === 'root' ? '--subtle' : `--${tone}-${level}`;
  return `<span class="td-branch-tag" title="${label}"><i style="--td-dot:var(${dot})"></i><span>${label}</span></span>`;
}

function taskRow(task, showBranch = true, dateTone = '') {
  return `
    <li class="td-task">
      <label class="td-task-name"><input type="checkbox"><span>${task.title}</span></label>
      ${showBranch ? branchTag(task.branch) : ''}
      <span class="td-date ${dateTone}">${task.date}</span>
    </li>`;
}

function taskGroup(title, entries, expanded = true) {
  return `
    <details class="panel td-task-group" ${expanded ? 'open' : ''}>
      <summary class="td-group-head">
        <span class="td-group-label">${icon('chevron')}<span>${title}</span><span class="td-count">${entries.length}</span></span>
      </summary>
      <ul class="td-task-list">${entries.map(task => taskRow(task)).join('')}</ul>
    </details>`;
}

function receipt() {
  const current = recent[0];
  return `
    <section class="td-receipt" aria-label="最新提交回执">
      <div class="td-receipt-heading">
        <span class="td-check-mark">${icon('check', 15)}</span><span>已提交</span><time>${current.time}</time>
      </div>
      <h2>${current.title}</h2>
      <div class="td-receipt-foot">
        ${branchTag(current.branch)}
        <a href="/history?commit=wireframe">在历程查看 ${icon('arrow', 14)}</a>
      </div>
    </section>`;
}

const todayMarkup = `
  <div class="td-page td-today">
    <header class="page-head td-page-head">
      <div>
        <p class="eyebrow td-page-date">2026 年 11 月 20 日 · 周五</p>
        <h1>今天</h1>
        <p class="muted td-page-description">眼前要做的事。</p>
      </div>
      <p class="td-head-summary"><strong>5 条</strong>有截止日期 <span></span> 另有 2 条无截止日期</p>
    </header>
    <div class="td-today-grid">
      <section class="td-main-column" aria-label="今日清单">
        <div class="td-quick-add">
          <label for="today-quick-add"><span class="td-quick-icon">${icon('plus')}</span>
            <input id="today-quick-add" aria-label="快速添加待办" placeholder="记一件要做的事，可带日期" type="text">
          </label>
          <button type="button" class="btn btn-primary">添加待办</button>
        </div>
        ${taskGroup('逾期', [tasks.emptyStates, tasks.training])}
        ${taskGroup('今天', [tasks.review, tasks.interactions, tasks.notes])}
        ${taskGroup('无截止日期', [tasks.copy, tasks.nextMonth], false)}
        <a class="td-all-tasks" href="/today/all">全部待办 ${icon('arrow')}</a>
      </section>
      <aside class="td-rail" aria-label="今日相关进度">
        ${receipt()}
        <section class="panel td-rail-panel">
          <div class="td-panel-title"><h2>最近提交</h2><a href="/history" class="td-inline-link">查看历程 ${icon('chevron', 13)}</a></div>
          <ul class="td-recent">
            ${recent.map(entry => `
              <li><div><strong>${entry.title}</strong>${branchTag(entry.branch)}</div><time>${entry.date}</time></li>
            `).join('')}
          </ul>
        </section>
        <section class="panel td-rail-panel td-stalled-panel">
          <div class="td-panel-title"><h2>停滞分支</h2><span class="td-count">1</span></div>
          <a class="td-stalled-item" href="/history?branch=reading">
            <i aria-hidden="true"></i><strong>阅读</strong><span class="muted">37 天</span>${icon('chevron', 14)}
          </a>
          <p class="td-stalled-since">最近一次提交在 10 月 14 日</p>
        </section>
      </aside>
    </div>
  </div>`;

const detailTasks = [tasks.emptyStates, tasks.review, tasks.appearance, tasks.handoff, tasks.copy];

const branchDetailMarkup = `
  <div class="td-page td-detail">
    <header class="page-head td-page-head td-detail-head">
      <div>
        <p class="eyebrow td-ancestry"><a href="/branches">分支</a> ${icon('chevron', 13)} <a href="/branches/work">工作</a></p>
        <div class="td-branch-title"><h1>产品设计</h1><span class="td-active"><i></i>进行中</span></div>
        <p class="muted td-page-description">把首页和核心工作区整理到可评审的程度。</p>
      </div>
      <div class="td-header-actions">
        <button class="btn" type="button">收尾分支</button><button class="btn td-icon-button" type="button" aria-label="更多分支操作">${icon('more')}</button>
      </div>
    </header>
    <section class="td-detail-progress panel">
      <span>本分支待办</span>
      <div class="td-progress-track" role="progressbar" aria-label="本分支待办完成进度" aria-valuenow="4" aria-valuemax="9"><i></i></div>
      <strong>4 <small>/ 9 已完成</small></strong>
    </section>
    <nav class="td-section-nav" aria-label="分支内容">
      <a href="#branch-tasks" aria-current="location">待办</a>
      <a href="#branch-commits">提交</a>
      <a href="#branch-children">子分支</a>
      <a href="#branch-milestones">里程碑</a>
    </nav>
    <div class="td-detail-grid">
      <div class="td-main-column">
        <section id="branch-tasks" class="panel td-feature-panel">
          <div class="td-panel-title"><h2>待办 <span class="td-count">5</span></h2><button type="button" class="btn btn-quiet td-add-link">${icon('plus', 15)} 添加待办</button></div>
          <ul class="td-task-list">${detailTasks.map(task => taskRow(task, false, task === tasks.emptyStates ? 'td-late-date' : '')).join('')}</ul>
        </section>
        <section id="branch-commits" class="panel td-feature-panel">
          <div class="td-panel-title"><h2>提交 <span class="td-count">4</span></h2><a href="/history?branch=product-design" class="td-inline-link">查看历程 ${icon('chevron', 13)}</a></div>
          <ol class="td-commit-list">
            ${designCommits.map((entry, index) => `
              <li>
                <span class="td-commit-node ${index === 0 ? 'td-commit-selected' : ''}" aria-hidden="true"></span>
                <a href="/history?branch=product-design">${entry.title}</a>
                <time>${entry.date} <span>${entry.time}</span></time>
              </li>`).join('')}
          </ol>
        </section>
        <section id="branch-children" class="panel td-feature-panel">
          <div class="td-panel-title"><h2>子分支 <span class="td-count">1</span></h2><button type="button" class="btn btn-quiet td-add-link">${icon('plus', 15)} 新建子分支</button></div>
          <a class="td-detail-row" href="/branches/interaction">
            <span class="td-child-symbol">${icon('branch', 17)}</span><strong>交互细化</strong><span class="td-child-level">第 3 层</span>${icon('chevron', 14)}
          </a>
        </section>
        <section id="branch-milestones" class="panel td-feature-panel">
          <div class="td-panel-title"><h2>里程碑</h2></div>
          <div class="td-detail-row">
            <span class="td-milestone-symbol">${icon('diamond', 15)}</span><strong>首页结构确认</strong><time>11 月 16 日</time>
          </div>
        </section>
      </div>
      <aside class="td-rail" aria-label="分支信息">
        <section class="panel td-rail-panel">
          <div class="td-panel-title"><h2>分支信息</h2></div>
          <dl class="td-meta">
            <div><dt>上级分支</dt><dd><a href="/branches/work">工作</a></dd></div>
            <div><dt>创建于</dt><dd>2026 年 11 月 13 日</dd></div>
            <div><dt>最近提交</dt><dd>11 月 20 日 16:42</dd></div>
            <div><dt>颜色</dt><dd><i class="td-color-sample"></i>珊瑚橙 · 继承自工作</dd></div>
          </dl>
        </section>
        ${receipt()}
      </aside>
    </div>
  </div>`;

export const pages = [
  { id: 'P01', slug: 'today', title: '今天', section: '今天', route: '/today', markup: todayMarkup },
  { id: 'P03', slug: 'branch-detail', title: '产品设计', section: '分支', route: '/branches/product-design', markup: branchDetailMarkup },
];
