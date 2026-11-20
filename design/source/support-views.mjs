import { pages as workPages } from './today-detail.mjs';
import { pages as historyPages } from './tree-history.mjs';
import { pages as yearPages } from './year.mjs';
import { pages as personalPages } from './me-data.mjs';

const today = workPages.find((screen) => screen.id === 'P01');
const history = historyPages.find((screen) => screen.id === 'P04');
const localSettings = personalPages.find((screen) => screen.id === 'P07');

function button(text, style = 'quiet') {
  return '<button type="button" class="btn btn-' + style + '">' + text + '</button>';
}

function field(label, value, hint = '', multiline = false) {
  return '<div class="ds-field"><span class="ds-field-label">' + label + '</span><div class="ds-input' +
    (multiline ? ' gx-textarea' : '') + '">' + value + '</div>' + (hint ? '<span class="caption">' + hint + '</span>' : '') + '</div>';
}

function ribbon(path, branch = 'coral') {
  const color = path === '我' ? '--neutral' : '--' + branch + '-1';
  return '<span class="gx-identity" style="--branch:var(' + color + ')"><i class="branch-dot"></i>' + path + '</span>';
}

function row(label, value) {
  return '<div class="gx-keyrow"><span>' + label + '</span><span>' + value + '</span></div>';
}

function state(id, slug, title, section, route, markup) {
  return { id, slug, title, section, route, markup };
}

function layer(id, slug, title, back, tag, help, body, actions, kind = 'sheet') {
  const width = kind === 'wide' ? 'ds-dialog ds-dialog-wide' : kind === 'dialog' ? 'ds-dialog' : 'ds-sheet';
  return {
    ...back, id, slug,
    overlay: '<div class="ds-overlay"><div class="ds-scrim"></div><article class="' + width +
      ' gx-layer" aria-label="' + title + '"><header class="ds-layer-head"><div><span class="ds-layer-kicker">' + tag +
      '</span><h2>' + title + '</h2>' + (help ? '<p>' + help + '</p>' : '') + '</div><button type="button" class="ds-close" aria-label="关闭">×</button></header>' +
      '<div class="ds-layer-body">' + body + '</div><footer class="ds-layer-actions">' + actions + '</footer></article></div>'
  };
}

const todoGroups = [
  ['逾期', [
    ['确认移动端的空态文案', '工作 / 产品设计', 'coral', '11 月 18 日'],
    ['更新训练计划', '健康 / 跑步', 'sky', '11 月 19 日']
  ]],
  ['今天', [
    ['复查移动端界面', '工作 / 产品设计', 'coral', '今天'],
    ['检查底部页脚对比度', '工作 / 产品设计 / 交互细化', 'coral', '今天'],
    ['整理一页读书笔记', '生活 / 阅读', 'honey', '今天']
  ]],
  ['未来到期', [
    ['调整首页卡片间距', '工作 / 产品设计', 'coral', '11 月 24 日'],
    ['准备下一次长跑', '健康 / 跑步', 'sky', '11 月 29 日']
  ]],
  ['无截止日期', [
    ['整理桌面备份', '我', 'sky', '—'],
    ['列出愿意尝试的选题', '我', 'sky', '—']
  ]],
  ['已放下', [
    ['整理街拍选片', '生活 / 摄影', 'honey', '已放下']
  ]]
];

const allTodo = state('S01','all-todos','全部待办','今天','/today/all',
  '<div class="gx-page"><header class="page-head"><div><span class="eyebrow">今天 / 全部待办</span><h1>全部待办</h1>' +
  '<p>查看所有未完成的事项。</p></div>' + button('＋ 添加待办', 'primary') + '</header><div class="gx-toolbar">' +
  '<span class="chip chip-info">未完成 · 10</span>' + button('全部分支 ⌄') + '<span class="caption">按截止日期排序</span></div>' +
  '<section class="panel gx-table">' + todoGroups.map(([title, items]) => '<div class="gx-table-group"><h2>' + title + ' <small>' +
    items.length + '</small></h2>' + items.map(([name, path, shade, due]) => '<div class="gx-todo-row"><span><i class="gx-checkbox"></i><strong>' +
    name + '</strong></span>' + ribbon(path, shade) + '<span class="caption">' + due + '</span><span aria-hidden="true">›</span></div>').join('') + '</div>').join('') + '</section></div>');

const add = layer('O01','quick-add','记一笔',today,'快速添加','标题、日期和分支可以一起写。',
  field('待办', '复查按钮焦点明天 #产品设计') +
  '<div class="gx-chips"><span class="chip chip-info">截止 · 11 月 21 日</span><span class="chip">' + ribbon('工作 / 产品设计') + '</span></div>' +
  '<p class="gx-field-note">识别结果可在保存前调整。</p>',
  button('取消') + button('保存待办','primary'));

const todo = layer('O02','todo-detail','复查移动端界面',today,'今天 / 待办详情','修改后保存在此设备。',
  '<div class="gx-chips"><span class="chip chip-info">今天</span>' + ribbon('工作 / 产品设计') + '</div>' +
  '<div class="gx-fields">' + field('备注','检查 390 px 下的首页导航、工作台卡片和提交回执。','',true) +
  row('截止日期','11 月 20 日') + row('计划日期','今天') + row('所属分支',ribbon('工作 / 产品设计')) +
  '<div class="gx-subsection"><h3>历史</h3><p class="caption">11 月 19 日 16:30 · 已添加</p></div></div>',
  button('关闭') + button('标为完成','primary'));

const commit = layer('O03','commit-detail','完成线框初稿',history,'历程 / 提交详情','2026 年 11 月 20 日 16:42',
  '<div class="gx-chips">' + ribbon('工作 / 产品设计') + '<span class="chip chip-success">已完成</span></div>' +
  '<div class="gx-fields">' + field('提交文案','完成线框初稿','写入当日可修改文案或撤销完成。',true) +
  '<div class="gx-subsection"><h3>同分支前一条</h3>' + row('整理首页参考','11 月 19 日') + '</div></div>',
  button('撤销完成') + button('保存文案','primary'));

const search = layer('O04','search','搜索',today,'全局搜索','查找分支、待办、提交和里程碑。',
  field('关键词','首页') +
  '<div class="gx-chips"><span class="chip chip-info">全部</span><span class="chip">分支</span><span class="chip">待办</span><span class="chip">提交</span><span class="chip">里程碑</span></div>' +
  '<div class="gx-search-results"><div><span class="chip">待办</span><strong>调整首页卡片间距</strong><small>工作 / 产品设计</small></div>' +
  '<div><span class="chip chip-success">提交</span><strong>整理首页参考</strong><small>工作 / 产品设计</small></div>' +
  '<div><span class="chip chip-warning">里程碑</span><strong>首页结构确认</strong><small>工作 / 产品设计</small></div></div>',
  '<span class="caption gx-shortcut">↑ ↓ 选择　↵ 打开　Esc 关闭</span>', 'wide');

function firstRun(completed) {
  return '<div class="gx-page"><header class="page-head"><div><span class="eyebrow">个人工作区 / 今天</span><h1>今天</h1>' +
    '<p>从一件正在做的事开始。</p></div></header><section class="panel gx-start-card">' +
    '<div class="gx-start-illustration" aria-hidden="true"><i></i><b>✓</b><span></span><em></em></div>' +
    '<div><h2>' + (completed ? '第一条提交已留下。' : '写下第一条待办。') + '</h2><p>' +
    (completed ? '「整理桌面」已记录在根分支「我」里。' : '这件事会先放在根分支「我」里，完成后就能在历程回看。') + '</p>' +
    (completed ? '<span class="chip chip-success">✓ 整理桌面 · 已提交</span><div class="gx-start-actions">' + button('在历程查看','primary') + '</div>'
      : '<div class="gx-start-actions"><div class="ds-input">整理桌面</div>' + button('添加待办','primary') + '</div><a href="#example">先看看示例</a>') +
    '</div></section></div>';
}
const start = state('O06','first-task','首次引导','今天','/today',firstRun(false));
const firstCommit = state('O06','first-commit','首次完成','今天','/today',firstRun(true));

const examples = layer('O06','sample-tree','先看看示例',start,'示例','用一棵小树看懂分支和提交。',
  '<div class="gx-example">' + row('根分支','我') + row('　工作',ribbon('产品设计')) + row('　　准备首屏草图','✓ 已提交') +
  row('　健康',ribbon('跑步','sky')) + row('　　完成一次晨跑','✓ 已提交') + row('　生活',ribbon('阅读','honey')) + '</div>',
  button('返回工作区') + ' ' + button('开始我的第一条待办','primary'),'dialog');

const weekendToday = { ...today, markup: today.markup.replace('2026 年 11 月 20 日 · 周五', '2026 年 11 月 21 日 · 周六') };
const week = layer('S01','week-review','周回顾',weekendToday,'今天 / 本周','11 月 16 日至 22 日 · 周末预览 · 已统计至 11 月 21 日',
  '<div class="gx-review-kpis"><div><strong>8</strong><small>有效提交</small></div><div><strong>2</strong><small>活跃的一级分支</small></div>' +
  '<div><strong>1</strong><small>停滞分支</small></div></div>' +
  '<div class="gx-subsection"><h3>分支分布</h3><div class="gx-review-meter"><i></i><i></i></div>' +
  row(ribbon('工作'),'6 条') + row(ribbon('健康','sky'),'2 条') + row(ribbon('生活 / 阅读','honey'),'停滞 38 天') +
  '</div><div class="ds-notice">这一周的提交集中在工作分支，哪些事情值得带到下一周？</div>',
  button('关闭'),'wide');

const month = layer('S01','month-review','月回顾',today,'今天 / 回顾','2026 年 11 月 · 截至 11 月 20 日',
  '<div class="gx-subsection gx-month"><h3>精力分布怎么变了</h3>' +
  '<div class="gx-month-line"><span>10 月</span><div><i style="--w:50%;--c:var(--coral-1)"></i><i style="--w:28%;--c:var(--sky-1)"></i><i style="--w:22%;--c:var(--honey-1)"></i></div></div>' +
  '<div class="gx-month-line"><span>11 月</span><div><i style="--w:65%;--c:var(--coral-1)"></i><i style="--w:35%;--c:var(--sky-1)"></i></div></div>' +
  '</div><div class="gx-subsection"><h3>结构变化</h3>' + row('新开 · 工作 / 产品设计','11 月 13 日') +
  row('收尾 · 工作 / 页面调研','11 月 13 日') + row('生活 / 阅读','37 天未有新提交') + '</div>',
  button('关闭'),'wide');

const sync = state('O07','sync-entry','账号与同步','我的','/settings#sync',
  '<div class="gx-page gx-settings"><header class="page-head"><div><span class="eyebrow">我的 / 设置</span><h1>账号与同步</h1><p>在多台设备上查看同一份进展。</p></div></header>' +
  '<section class="panel gx-block"><div class="panel-head"><h2>此设备</h2><span class="chip">本机模式</span></div><div class="panel-body">' +
  '<div class="gx-keyrow"><div><strong>开启多设备同步</strong><p class="caption">登录后可开启同步，' +
  '<a href="/auth/login?next=/settings%23sync">登录</a></p></div><span class="gx-toggle" aria-label="同步开关关闭"></span></div>' +
  row('本机数据', '<span class="chip chip-success">可继续使用</span>') + '</div></section></div>');

const signedIn = state('O08','sync-base','账号与同步','我的','/settings#sync',
  '<div class="gx-page gx-settings"><header class="page-head"><div><span class="eyebrow">我的 / 设置</span><h1>账号与同步</h1><p>管理同步状态和已连接的设备。</p></div></header>' +
  '<section class="panel gx-block"><div class="panel-head"><h2>同步</h2><span class="chip chip-success">已开启</span></div><div class="panel-body">' +
  row('账户','name@example.com') + row('最近同步','16:44') + row('已连接设备','2 台') +
  row('修改记录','<span class="chip chip-warning">1 条待查看</span>') + '</div></section></div>');

const device = layer('O08','sync-devices','已连接设备',signedIn,'账号与同步','查看当前账号连接的设备。',
  '<div class="gx-device-list"><div><span aria-hidden="true">▣</span><strong>工作电脑<small>此设备 · 最近同步 16:44</small></strong><span class="chip chip-success">当前</span></div>' +
  '<div><span aria-hidden="true">▣</span><strong>个人笔记本<small>最近同步 16:41</small></strong>' + button('移除') + '</div></div>',
  button('关闭'), 'dialog');
const conflict = layer('O08','sync-conflict','查看同步冲突',signedIn,'账号与同步 / 修改记录','两台设备在接近的时间编辑了同一条待办。',
  '<div class="gx-conflicts"><article><span class="caption">此设备 · 16:42</span><strong>复查移动端界面</strong><p class="caption">检查首屏和提交回执。</p></article>' +
  '<article><span class="caption">另一台设备 · 16:44</span><strong>复查移动端界面</strong><p class="caption">增加导航焦点检查。</p></article></div>' +
  '<p class="ds-notice">两次修改已记录在「产品设计」的分支历史。</p>',
  button('关闭') + button('查看分支历史','primary'), 'wide');

const archived = state('S02','archived-branches','已归档分支','分支','/branches?view=archived',
  '<div class="gx-page"><header class="page-head"><div><span class="eyebrow">分支 / 已归档</span><h1>已归档分支</h1><p>从一级分支找到需要回看的历史。</p></div>' +
  button('返回分组树') + '</header><section class="panel gx-block"><div class="panel-head"><h2>工作</h2><span class="chip">1 条已归档</span></div>' +
  '<div class="panel-body">' + row(ribbon('工作 / 页面调研'),'<span class="chip chip-info">已合并</span> <span class="caption">11 月 13 日</span>') +
  '<div class="gx-end-action">' + button('查看历程') + ' ' + button('取消归档') + '</div></div></section></div>');

const danger = layer('O05','clear-local','清空本机数据',localSettings,'设置 / 数据与备份','仅影响此设备的本机数据。',
  '<div class="ds-notice ds-notice-warn">当前设备上的分支、待办、提交、里程碑和设置将被清空。可先导出文件作为副本。</div>' +
  '<div class="gx-fields">' + field('输入「清空」以继续','输入确认词') + '<a href="/data">去导出备份</a></div>',
  button('取消') + '<button type="button" class="btn btn-danger" disabled>清空本机数据</button>','dialog');

const help = state('S06','help','帮助','我的','/me#help',
  '<div class="gx-page gx-settings"><header class="page-head"><div><span class="eyebrow">我的 / 帮助</span><h1>帮助</h1><p>使用规则和常见问题。</p></div></header>' +
  '<section class="panel gx-block"><div class="panel-head"><h2>分支与历程</h2></div><div class="panel-body">' +
  '<div class="gx-help-item"><h3>为什么只能建到第 3 层？</h3><p>三级结构便于从一级方向找到具体任务。需要继续细分时，可以按目标换一个分支。</p></div>' +
  '<div class="gx-help-item"><h3>收尾合并后，原来的提交还在吗？</h3><p>会保留。历程在收尾日显示汇合点，可以沿原分支回看提交。</p></div>' +
  '<div class="gx-help-item"><h3>虚线表示什么？</h3><p>进行中分支连续超过 30 天没有新提交时，虚线标出最近一次提交到今天的间隔。</p></div>' +
  '<div class="gx-help-item"><h3>换设备怎么带走数据？</h3><p>在旧设备导出备份文件，再在新设备从文件恢复。</p></div>' +
  '</div></section></div>');

const milestone = layer('S04','milestone-detail','首页结构确认',history,'历程 / 里程碑','2026 年 11 月 16 日',
  '<div class="gx-chips"><span class="chip chip-warning">◆ 里程碑</span>' + ribbon('工作 / 产品设计') + '</div>' +
  '<div class="gx-fields">' + field('备注','首页的工作台、三块功能卡和时间树，按同一个结构展开。','里程碑不计入最近提交日期。',true) + '</div>',
  button('关闭') + button('在时间树定位','primary'));

const milestoneNew = layer('S04','milestone-new','记一座里程碑',history,'历程 / 新建','记录一个值得回看的阶段。',
  field('标题','完成第一轮设计评审') + field('所属分支',ribbon('工作 / 产品设计') + '　⌄') +
  field('日期','2026 年 11 月 20 日','过去的里程碑可以只填写年月。') +
  field('备注 · 可选','写一句关于这个阶段的话','',true),
  button('取消') + button('保存里程碑','primary'));

const share = layer('S05','year-share','生成年度分享图',yearPages[0],'历程 / 年轮','预览分享图片里会出现的内容。',
  '<div class="gx-share-layout"><div class="gx-share-art"><small>CommitToDo</small><h3>2026 年轮</h3><span>截至 11 月 20 日</span>' +
  '<div class="gx-share-tracks"><i style="--track:var(--coral-1)"></i><i style="--track:var(--sky-1)"></i><i style="--track:var(--honey-1)"></i></div>' +
  '<div class="gx-share-numbers"><strong>89</strong> 条提交　<strong>3</strong> 个方向</div></div>' +
  '<div><h3>图中显示</h3>' + row('待办标题','隐藏') + row('分支名称','<span class="gx-toggle" aria-label="显示分支名称已关闭"></span>') +
  '<p class="caption">保存一张 4:5 的时间树回顾。</p></div></div>',
  button('取消') + button('保存图片','primary'), 'wide');

export const pages = [allTodo, add, todo, commit, search, start, firstCommit, examples, week, month, sync, device, conflict, archived, danger, help, milestone, milestoneNew, share];
