const strokes = {
  pen: '<path d="m5 17-.6 3.4 3.4-.6L18.7 9l-2.8-2.8L5 17ZM14 8l2.8 2.8M12 20h8"/>',
  branch: '<circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="7" r="2"/><path d="M6 7v10m12-8c0 4-2 6-6 6H6"/>',
  milestone: '<path d="m12 3 8 9-8 9-8-9 8-9Z"/><path d="M9 12l2 2 4-4"/>',
  merge: '<circle cx="5" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><path d="M5 7v10m14 0v-3a6 6 0 0 0-6-6H6"/>',
  laptop: '<rect x="4" y="5" width="16" height="12" rx="2"/><path d="M2 20h20"/>',
  backup: '<path d="M5 16h14a2 2 0 0 1 2 2v2H3v-2a2 2 0 0 1 2-2ZM12 4v9m-4-4 4 4 4-4"/>',
  download: '<path d="M12 3v12m-4-4 4 4 4-4M4 17v3h16v-3"/>',
  upload: '<path d="M12 16V4m-4 4 4-4 4 4M4 17v3h16v-3"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  next: '<path d="m9 6 6 6-6 6"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v3m0 14v3m10-10h-3M5 12H2m17-7-2 2M7 17l-2 2m14 0-2-2M7 7 5 5"/>',
  tune: '<path d="M4 8h6m4 0h6M4 16h10m4 0h2"/><circle cx="12" cy="8" r="2"/><circle cx="16" cy="16" r="2"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.4 9a2.6 2.6 0 1 1 3.4 2.5l-.8.5v1.6m0 3.4h.01"/>',
  file: '<path d="M6 3h8l4 4v14H6zM14 3v5h4M9 13h6m-6 4h6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  lock: '<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 1 1 8 0v3m-4 4v2"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>'
};

function icon(name, size = 18) {
  return '<svg aria-hidden="true" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round">' +
    strokes[name] + '</svg>';
}

function pageHeading(title, description, action = '') {
  return '<header class="page-head md-page-head"><div><h1>' + title +
    '</h1><p>' + description + '</p></div>' + action + '</header>';
}

const badges = [
  { title: '起笔', date: '01.12', icon: 'pen', tone: 'sky', category: '时间', grant: '留下第一条提交' },
  { title: '第一道岔', date: '02.08', icon: 'branch', tone: 'coral', category: '结构', grant: '创建第一个子分支' },
  { title: '汇流', date: '11.13', icon: 'merge', tone: 'iris', category: '结构', grant: '把子分支合回父分支' },
  { title: '立碑', date: '11.16', icon: 'milestone', tone: 'honey', category: '里程碑', grant: '添加第一个里程碑' },
];

function badgeToken(badge, extra = '') {
  return '<span class="md-badge-token ' + extra + '" data-tone="' + badge.tone + '">' + icon(badge.icon, extra ? 39 : 29) + '</span>';
}

function miniBadge(badge) {
  return '<a class="md-mini-badge" href="/history?date=2026-' + badge.date.replace('.', '-') + '">' + badgeToken(badge) +
    '<div><strong>' + badge.title + '</strong><span>' + badge.grant + '</span><time class="mono">' + badge.date + '</time></div></a>';
}

function navRow(glyph, name, description, route) {
  return '<a class="md-nav-row" href="' + route + '"><span class="md-row-icon">' + icon(glyph, 17) + '</span><span><strong>' +
    name + '</strong><small>' + description + '</small></span>' + icon('next', 15) + '</a>';
}

const meMarkup = '<div class="md-page">' +
  pageHeading('我的', '徽章、数据与个人偏好。', '<span class="md-local-tag">' + icon('laptop', 16) + '本机空间</span>') +
  '<div class="md-me-layout"><section class="panel md-badges"><header class="md-section-head"><div><h2>我的徽章</h2>' +
  '<p>点开徽章，回到获得它的那一天。</p></div><span class="chip">已获得 4 枚</span></header><ul class="list md-badge-grid">' +
  badges.map(badge => '<li>' + miniBadge(badge) + '</li>').join('') + '</ul></section><div class="md-me-side"><section class="panel md-data-card">' +
  '<div class="md-section-head"><div><h2>数据与备份</h2><p>待办和历程保存在这台设备上。</p></div><span class="md-row-icon">' + icon('backup') +
  '</span></div><div class="md-copy-status"><i></i><div><strong>本地备份已完成</strong><time class="mono">11.20 09:12</time></div></div>' +
  '<div class="md-card-actions"><button class="btn" type="button">立即备份</button><a href="/data">打开数据与备份 ' + icon('arrow', 15) +
  '</a></div></section><section class="panel md-preference"><header class="md-section-head"><h2>偏好与应用</h2></header>' +
  navRow('sun', '外观', '主题与树密度', '/settings#appearance') + navRow('help', '注解', '分支、合并与停滞说明', '/settings#notes') +
  navRow('tune', '关于', '应用信息与隐私', '/settings#about') + '</section></div></div></div>';

function settingRow(title, description, choices, active) {
  const options = choices.map((choice, index) => '<button type="button" aria-pressed="' + (index === active) + '">' + choice + '</button>').join('');
  return '<div class="md-setting-row"><div><strong>' + title + '</strong><small>' + description +
    '</small></div><div class="md-segment" role="group" aria-label="' + title + '">' + options + '</div></div>';
}

const settingsMarkup = '<div class="md-page">' + pageHeading('设置', '调整外观和阅读偏好。设置保存在本机。') +
  '<div class="md-settings-layout"><nav class="panel md-settings-nav" aria-label="设置分区">' +
  '<a href="#appearance" aria-current="page">' + icon('sun', 17) + '外观</a>' +
  '<a href="#notes">' + icon('help', 17) + '注解</a><a href="/data">' + icon('backup', 17) + '数据与备份</a>' +
  '<a href="#about">' + icon('tune', 17) + '关于</a></nav>' +
  '<div class="md-stack"><section class="panel md-settings-section" id="appearance"><div class="md-section-head"><h2>外观</h2></div>' +
  settingRow('主题', '跟随系统的明暗切换，也可以指定主题。', ['跟随系统', '浅色', '深色'], 0) +
  settingRow('树密度', '调节树行高、列表行高和节点旁日期。', ['紧凑', '舒适'], 1) +
  '<div class="md-display-example"><div><span class="md-row-icon">' + icon('branch', 17) + '</span><div><strong>当前密度</strong><p>舒适 · 树行高 48 px</p></div></div>' +
  '<div class="md-tree-fragment"><span><i></i>工作</span><span><i></i>产品设计<time class="mono">11.20</time></span></div></div></section>' +
  '<section class="panel md-settings-section" id="notes"><div class="md-section-head"><h2>注解</h2></div>' +
  settingRow('概念说明', '控制分支、合并、里程碑和停滞的行内说明。', ['关闭', '只显示一次', '始终显示'], 1) +
  '</section><section class="panel md-settings-section" id="about"><div class="md-section-head"><h2>关于</h2></div>' +
  '<div class="md-setting-row"><div><strong>本机数据</strong><small>可以随时导出，换设备时从文件恢复。</small></div><a href="/data">数据与备份 ' + icon('arrow', 15) + '</a></div>' +
  '</section></div></div></div>';

const snapshots = [
  ['11.20', '09:12', 9, 88], ['11.19', '08:47', 9, 87], ['11.18', '08:54', 9, 86], ['11.17', '09:06', 9, 85],
  ['11.16', '08:50', 9, 84], ['11.15', '10:21', 9, 83], ['11.14', '09:43', 9, 79],
];

function snapshotRow(snapshot, index, canRestore) {
  const [day, time, branchCount, submitCount] = snapshot;
  return '<li class="md-snapshot-row"><time class="mono">' + day + ' <span>' + time + '</span>' +
    (index === 0 ? '<span class="md-snapshot-today">今天</span>' : '') + '</time><span class="md-snapshot-summary">' +
    branchCount + ' 分支 · ' + submitCount + ' 提交</span>' + (canRestore
      ? '<button class="btn btn-quiet md-snapshot-button" type="button">恢复</button>'
      : '<span></span>') + '</li>';
}

const cloudBackup = '<section class="panel md-file-section"><header class="md-section-head"><div><h2>异地备份</h2>' +
  '<p>手动上传一份 JSON 备份，用于另行下载恢复。</p></div></header><div class="md-file-action"><span class="md-row-icon">' +
  icon('backup', 17) + '</span><div><strong>最近上传 · 11 月 19 日</strong><p>文件按本机匿名设备归档，包含备份原文。</p></div>' +
  '<button class="btn btn-quiet" type="button">上传备份</button></div><div class="md-file-action"><span class="md-row-icon">' +
  icon('download', 17) + '</span><div><strong>最近一份 JSON</strong><p>下载后通过「从文件恢复」导入。</p></div>' +
  '<button class="btn btn-quiet" type="button">下载备份</button></div></section>';

const dataMarkup = (canRestore = false) => '<div class="md-page">' + pageHeading('数据与备份', '导出文件可用于换浏览器或换设备时恢复。', '<span class="md-local-tag">' + icon('laptop', 16) + '本机空间</span>') +
  '<div class="md-data-layout"><section class="panel md-snapshots"><div class="md-section-head"><div><h2>本地备份</h2><p>每日首次打开自动备份，保留最近 7 份。</p></div>' +
  '<button class="btn" type="button">立即备份</button></div><div class="md-snapshot-columns"><span>备份时间</span><span>备份内容</span><span></span></div><ul class="list">' +
  snapshots.map((snapshot, index) => snapshotRow(snapshot, index, canRestore)).join('') + '</ul></section><div class="md-stack"><section class="panel md-file-section"><header class="md-section-head"><h2>备份文件</h2></header>' +
  '<div class="md-file-action"><span class="md-row-icon">' + icon('download', 18) + '</span><div><strong>导出当前数据</strong><p>保留分支、待办、提交、设置和历史。</p></div>' +
  '<button class="btn btn-quiet" type="button">导出 JSON</button></div>' +
  '<div class="md-file-action"><span class="md-row-icon">' + icon('upload', 18) + '</span><div><strong>从文件恢复</strong><p>先校验文件并显示摘要，经确认后恢复。</p></div>' +
  '<button class="btn btn-primary" type="button">选择文件</button></div></section>' +
  '<section class="panel md-file-section"><header class="md-section-head"><h2>上次恢复前的副本</h2></header>' +
  '<div class="md-file-action"><span class="md-row-icon">' + icon('file', 17) + '</span><div><strong>11 月 1 日 08:43</strong><p>可下载后作为备份文件重新导入。</p></div>' +
  '<button class="btn btn-quiet" type="button">下载副本</button></div></section>' + (canRestore ? cloudBackup : '') + '</div></div>' +
  '<section class="panel md-danger-zone"><div><h2>清空本地数据</h2><p>开始前可以先导出当前数据。</p></div><button class="btn btn-danger" type="button">清空本地数据</button></section></div>';

const wallBadges = [
  ...badges,
  { title: '断舍离', date: '11.02', icon: 'branch', tone: 'mint', category: '结构', grant: '第一次放下一个分支' },
  { title: '主干', date: '09.30', icon: 'branch', tone: 'coral', category: '结构', grant: '工作连续三个月有提交' },
  { title: '常青', date: '06.24', icon: 'pen', tone: 'sky', category: '时间', grant: '工作持续六个月有提交' },
];

const wallData = [
  { category: '结构', remaining: ['收束', '双线并行', '有始有终', '五面'] },
  { category: '时间', remaining: ['补白', '第一年'] },
  { category: '里程碑', remaining: ['三碑', '碑上有字', '年轮有痕'] },
];

function wallCategory(entry) {
  const earned = wallBadges.filter(badge => badge.category === entry.category).sort((a, b) => b.date.localeCompare(a.date));
  const earnedTiles = earned.map(badge => '<a href="#badge-detail" class="md-wall-tile">' +
    badgeToken(badge) + '<strong>' + badge.title + '</strong><time class="mono">' + badge.date + '</time></a>').join('');
  const remaining = entry.remaining.map(name => '<div class="md-wall-tile md-locked"><span aria-hidden="true"></span><strong>' +
    name + '</strong><small>' + (name === '五面' ? '还差 2 个一级分支' : '待获得') + '</small></div>').join('');
  return '<section class="panel md-wall-panel"><div class="md-section-head"><h2>' + entry.category + '</h2><span class="caption">' +
    earned.length + ' / ' + (earned.length + entry.remaining.length) + '</span></div><div class="md-wall-grid">' + earnedTiles + remaining + '</div></section>';
}

const badgesNewest = [...wallBadges].sort((a, b) => b.date.localeCompare(a.date));
const badgeWallMarkup = '<div class="md-page md-wall"><a class="md-backlink" href="/me">‹ 返回我的</a>' +
  pageHeading('徽章墙', '每枚徽章都对应一段可回看的历程。', '<span class="chip chip-info">已获得 7 / 16</span>') +
  '<section class="panel md-wall-panel"><div class="md-section-head"><h2>已获得</h2><span class="caption">按获得时间排列</span></div>' +
  '<div class="md-wall-recent">' + badgesNewest.map(miniBadge).join('') + '</div></section><div class="md-wall-categories">' +
  wallData.map(wallCategory).join('') + '</div></div>';

function dialog(title, subheading, body, primary, extra = '') {
  return '<div class="ds-overlay"><div class="ds-scrim"></div><section class="ds-dialog md-dialog ' + extra +
    '" role="dialog" aria-modal="true" aria-labelledby="md-dialog-title"><header class="ds-layer-head"><div><h2 id="md-dialog-title">' + title +
    '</h2><p>' + subheading + '</p></div><button class="icon-button" type="button" aria-label="关闭">' + icon('close', 16) +
    '</button></header><div class="ds-layer-body">' + body + '</div><footer class="ds-layer-actions"><button class="btn btn-quiet" type="button">' +
    (extra ? '取消' : '关闭') + '</button>' + primary + '</footer></section></div>';
}

const badgeDetail = dialog('徽章详情', '结构类 · 汇流',
  '<div class="md-badge-feature">' + badgeToken(badges[2], 'md-badge-large') + '<div><h3>汇流</h3><p>第一次把子分支合并到父分支。</p></div></div>' +
  '<dl class="md-dialog-record"><div><dt>获得于</dt><dd>2026 年 11 月 13 日</dd></div>' +
  '<div><dt>分支去向</dt><dd>页面调研 → 工作</dd></div><div><dt>获得时的完成进度</dt><dd>3 / 3 项</dd></div></dl>',
  '<a class="btn btn-primary" href="/history?date=2026-11-13">在历程查看 ' + icon('arrow', 15) + '</a>');

function restoreDialog(title, description, item, verification, commitCount) {
  return dialog(title, description, '<div class="md-file-verification"><span class="md-row-icon">' + icon('file', 18) +
    '</span><div><strong>' + item + '</strong><span>' + icon('check', 13) + ' ' + verification +
    '</span></div></div><div class="md-restore-metrics"><div><strong>9</strong><span>分支</span></div>' +
    '<div><strong>28</strong><span>待办</span></div><div><strong>' + commitCount + '</strong><span>提交</span></div></div>' +
    '<div class="md-restore-note"><strong>恢复前会备份当前数据</strong><p>恢复后将整份替换。校验、备份或写入失败会保留现有数据。</p></div>',
    '<button class="btn btn-primary" type="button">备份并恢复</button>', 'md-restore-dialog');
}

const restoreFile = restoreDialog('从文件恢复', '核对文件内容后再替换当前数据。', 'CommitToDo-2026-11-19.json', '文件已通过校验', 88);
const restoreSnapshot = restoreDialog('恢复本地快照', '确认把当前工作区恢复到这个备份时点。', '11 月 19 日 08:47', '本地备份', 87);

export const pages = [
  { id: 'P06', slug: 'me', title: '我的', section: '我的', route: '/me', markup: meMarkup },
  { id: 'P07', slug: 'settings', title: '设置', section: '我的', route: '/settings', markup: settingsMarkup },
  { id: 'P08', slug: 'data', title: '数据与备份', section: '我的', route: '/data', markup: dataMarkup() },
  { id: 'S06', slug: 'badge-wall', title: '徽章墙', section: '我的', route: '/me#badges', markup: badgeWallMarkup },
  { id: 'S06', slug: 'badge-detail', title: '徽章详情', section: '我的', route: '/me#badges', markup: badgeWallMarkup, overlay: badgeDetail },
  { id: 'S08', slug: 'restore-file', title: '从文件恢复', section: '我的', route: '/data', markup: dataMarkup(), overlay: restoreFile },
  { id: 'S08', slug: 'data-v1', title: '备份与快照', section: '我的', route: '/data', markup: dataMarkup(true) },
  { id: 'S08', slug: 'snapshot-restore', title: '恢复本地快照', section: '我的', route: '/data', markup: dataMarkup(true), overlay: restoreSnapshot },
];
