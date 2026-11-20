import { page as grouped } from './branches-grouped.mjs';

const icons = {
  branch: '<path d="M7 5v5a4 4 0 0 0 4 4h4M7 10v5"/><circle cx="7" cy="4" r="2"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="14" r="2"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  next: '<path d="m9 6 6 6-6 6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  merge: '<path d="M4 6h4l8 12h4M4 18h12m0-4 4 4-4 4"/>',
  edit: '<path d="m13 6 5 5m-13 7 4-.5 10-10a2.5 2.5 0 0 0-3.5-3.5l-10 10L5 18Z"/>',
  pin: '<path d="m12 12-7 7m8-13 5 5M9 9l7-5 4 4-5 7m-7-3 4-3 3 3-3 4-4-4Z"/>',
  pause: '<path d="M9 5v14m6-14v14"/>',
  archive: '<rect x="4" y="5" width="16" height="4" rx="1"/><path d="M6 9v10h12V9m-8 4h4"/>',
  delete: '<path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13m-7 3v7m4-7v7"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  alert: '<path d="m12 4 9 16H3l9-16Zm0 6v4m0 3h.01"/>',
  undo: '<path d="m10 5-5 5 5 5M5 10h9a5 5 0 0 1 5 5v3"/>',
};
const colors = [
  ['coral', '珊瑚橙'], ['sky', '晴蓝'], ['honey', '蜂蜜金'], ['mint', '薄荷绿'],
  ['iris', '鸢尾紫'], ['rose', '玫瑰红'], ['teal', '深湖青'],
];

function icon(name, size = 18) {
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size +
    '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    icons[name] + '</svg>';
}

function controls(primary, secondary = '取消', tone = '') {
  return '<footer class="ds-layer-actions bl-actions"><button type="button" class="btn btn-quiet">' + secondary +
    '</button><button type="button" class="btn btn-primary' + (tone ? ' bl-button-' + tone : '') + '">' + primary + '</button></footer>';
}

function surface({title, glyph, body, primary, secondary, type = 'dialog', step = '', tone = ''}) {
  return '<div class="ds-overlay bl-overlay"><div class="ds-scrim"></div><section class="ds-' + type +
    ' bl-frame ' + (tone ? 'bl-tone-' + tone : '') + '" role="dialog" aria-modal="true" aria-labelledby="bl-title">' +
    '<header class="ds-layer-head bl-head"><span class="bl-head-icon">' + icon(glyph, 19) + '</span><div class="bl-head-copy">' +
    (step ? '<div class="bl-step">' + step + '</div>' : '') + '<h2 id="bl-title">' + title + '</h2></div>' +
    '<button type="button" class="icon-button bl-close" aria-label="关闭">' + icon('close', 16) + '</button></header>' +
    '<div class="ds-layer-body bl-body">' + body + '</div>' + controls(primary, secondary, tone) + '</section></div>';
}

function field(id, label, value, { optional = false, textarea = false, hint = '' } = {}) {
  const input = textarea
    ? '<textarea class="ds-input bl-input bl-textarea" id="' + id + '" readonly>' + value + '</textarea>'
    : '<input class="ds-input bl-input" type="text" id="' + id + '" value="' + value + '" readonly>';
  return '<div class="ds-field bl-field"><label class="ds-field-label bl-label" for="' + id + '">' + label +
    (optional ? '<small>选填</small>' : '') + '</label>' + input + (hint ? '<p class="bl-hint">' + hint + '</p>' : '') + '</div>';
}

function parentField(parts, meta, color = 'coral-2') {
  return '<div class="ds-field bl-field"><span class="ds-field-label bl-label">所属父分支</span>' +
    '<div class="ds-input bl-input bl-select"><span class="bl-parent-path"><span class="branch-dot" style="--branch:var(--' +
    color + ')"></span>' + parts.join(icon('next', 12)) + '</span>' + icon('down', 15) +
    '</div><p class="bl-hint">' + meta + '</p></div>';
}

function note(glyph, message, tone = '') {
  return '<div class="ds-notice bl-notice ' + (tone ? 'bl-note-' + tone : '') + '">' + icon(glyph, 18) + '<p>' +
    message + '</p></div>';
}

function palette() {
  return '<div class="ds-field bl-field"><span class="ds-field-label bl-label">分支颜色</span><div class="bl-palette" aria-label="分支颜色">' +
    colors.map(([key, label]) => '<button type="button" aria-label="' + label + '" aria-pressed="' + (key === 'mint') +
      '" style="--chip-tone:var(--' + key + '-1)">' + (key === 'mint' ? icon('check', 14) : '') + '</button>').join('') +
    '</div><p class="bl-hint">薄荷绿 · 子分支沿用这一色相。</p></div>';
}

function pathLabel(parts) {
  return '<div class="bl-path-label">' + icon('branch', 14) + '<span>' + parts.join(' / ') + '</span></div>';
}

function choice(name, caption, checked, { disabled = false, extra = '' } = {}) {
  return '<div class="bl-choice' + (checked ? ' is-selected' : '') + (disabled ? ' is-disabled' : '') + '">' +
    '<span class="bl-radio" aria-hidden="true">' + (checked ? '<i></i>' : '') + '</span><span class="bl-choice-text">' +
    '<strong>' + name + '</strong>' + (caption ? '<small>' + caption + '</small>' : '') + '</span>' +
    (extra ? '<span class="bl-choice-extra">' + extra + '</span>' : '') + '</div>';
}

function effectRows(rows) {
  return '<dl class="bl-effect-rows">' + rows.map(([label, description]) =>
    '<div><dt>' + label + '</dt><dd>' + description + '</dd></div>').join('') + '</dl>';
}

function menuLine(glyph, label, reason = '', emphasized = false) {
  return '<button type="button" role="menuitem" class="bl-menu-item' + (emphasized ? ' is-emphasized' : '') +
    '"' + (reason ? ' disabled' : '') + '>' + icon(glyph, 16) +
    '<span>' + label + (reason ? '<small>' + reason + '</small>' : '') + '</span></button>';
}

const menu = '<div class="bl-menu" role="menu" aria-label="产品设计操作"><div class="bl-menu-head"><span class="branch-dot" style="--branch:var(--coral-2)"></span>' +
  '<div><strong>产品设计</strong><small>工作 / 产品设计</small></div></div>' +
  '<div class="bl-menu-group">' + menuLine('merge', '收尾', '仍有进行中的「交互细化」') +
  menuLine('plus', '新建子分支', '', true) + menuLine('edit', '重命名') + menuLine('arrow', '移动分支') +
  menuLine('pin', '置顶') + '</div><div class="bl-menu-group">' + menuLine('pause', '放下') +
  menuLine('archive', '归档', '收尾或放下后可归档') + menuLine('delete', '删除空分支', '已有待办与提交') + '</div></div>';

function anchorMenu(markup) {
  const trigger = /(<button[^>]*aria-label="产品设计的更多操作"[^>]*>[\s\S]*?<\/button>)/;
  return markup.replace(trigger, (button) =>
    button.replace('class="bga-more"', 'class="bga-more bl-menu-trigger" aria-haspopup="menu" aria-expanded="true"') + menu);
}

const newTop = surface({
  title: '新建分支', glyph: 'plus', type: 'sheet', primary: '创建分支',
  body: field('bl-name', '分支名称', '学习', { hint: '同一父分支下的名称需要唯一。' }) +
    parentField(['我'], '将创建为一级分支 · 已使用 3 / 7 个名额', 'muted') +
    field('bl-objective', '目标', '每周整理一条读书或课程笔记', { optional: true, textarea: true }) + palette() +
    note('branch', '新分支会加入「我」的下一级，今后可以把围绕同一目标的待办放在这里。')
});

const newChild = surface({
  title: '新建子分支', glyph: 'branch', type: 'sheet', primary: '创建子分支',
  body: field('bl-child-name', '分支名称', '交付演示', { hint: '同一父分支下的名称需要唯一。' }) +
    parentField(['我', '工作', '产品设计'], '将创建为三级分支 · 「产品设计」下已使用 1 / 20 个名额') +
    field('bl-child-objective', '目标', '整理发布演示稿，准备一次完整演练', { optional: true, textarea: true }) +
    note('branch', '继承「工作」的珊瑚橙色相，使用适合三级分支的浅色层级。')
});

const rename = surface({
  title: '重命名分支', glyph: 'edit', primary: '保存名称',
  body: pathLabel(['工作', '产品设计']) +
    field('bl-rename', '新名称', '网站产品设计', { hint: '「工作」下的分支名称需要唯一，包含已归档分支。' }) +
    note('branch', '更新后，分支树和新建待办会使用新名称。')
});

const move = surface({
  title: '移动「产品设计」', glyph: 'arrow', primary: '移动分支',
  body: '<p>选择新的父分支。「交互细化」会一并移动。</p><div class="bl-move-tree">' +
    choice('我', '移到最上层，成为一级分支', true, { extra: '4 / 7' }) +
    choice('工作', '现在的父分支', false, { disabled: true }) +
    choice('健康', '', false) + choice('生活', '', false) +
    choice('产品设计 / 交互细化', '自身或后代无法作为父分支', false, { disabled: true }) + '</div>' +
    note('branch', '新位置 <strong>我 / 产品设计</strong>，所属子分支仍可在树上继续推进。')
});

const finish = surface({
  title: '收尾「交互细化」', glyph: 'merge', primary: '确认收尾', step: '选择去向 · 1 / 2',
  body: '<p>这一段做完了。它的 <strong>1 条提交</strong>会并入「产品设计」的历史，并在「产品设计」上留一个汇合点。</p>' +
    '<div class="bl-section"><h3>这段还要一直挂在树上吗？</h3><div class="bl-choice-stack">' +
    choice('不用了，从树上收起', '细节已经定稿，之后可以在历程中回看这段。', true) +
    choice('留着，作为一段完成的路', '交互规则还要给下一版作参考。', false) + '</div></div>' +
    '<div class="bl-section"><h3>还有 2 条没做完的待办</h3><div class="bl-pills"><span class="is-selected">' +
    icon('check', 15) + '移到「产品设计」</span><span>取消掉</span></div></div>'
});

const finishConfirm = surface({
  title: '确认收尾「交互细化」？', glyph: 'merge', primary: '确认收尾', secondary: '再想想', step: '确认影响 · 2 / 2',
  body: effectRows([['提交', '1 条并入「产品设计」的历史'], ['未完成待办', '2 条移到「产品设计」'], ['默认分支树', '从树上收起，历程中仍可回看']]) +
    note('alert', '<strong>收尾之后不能撤销。</strong>', 'warning')
});

const pause = surface({
  title: '放下「产品设计」', glyph: 'pause', primary: '放下分支',
  body: pathLabel(['工作', '产品设计']) +
    field('bl-pause-reason', '放下原因', '等产品方向确认，再继续这条线。', { textarea: true }) +
    note('pause', '5 条未完成待办将移出「今天」，仍可在「全部待办」找到。子分支「交互细化」照常进行。') +
    '<p class="bl-hint">这条分支会留在树上，之后可从菜单中重新开始。</p>'
});

const archive = surface({
  title: '归档「页面调研」', glyph: 'archive', primary: '归档分支',
  body: pathLabel(['工作', '页面调研']) + effectRows([
    ['默认分支树', '收起这条已合并分支，释放 1 个可见名额'],
    ['历程与统计', '保留分支的分叉、汇合点和有效提交'],
    ['再次查看', '可在「已归档」中找到并取消归档'],
  ])
});

const restore = surface({
  title: '取消「页面调研」的归档', glyph: 'undo', primary: '取消归档', secondary: '返回',
  body: pathLabel(['工作', '页面调研']) + effectRows([
    ['恢复位置', '工作 / 页面调研'],
    ['分支状态', '已合并 · 历史可读'],
    ['默认分支树', '重新显示这条分支，占用 1 个可见名额'],
  ]) + note('check', '父分支「工作」已在默认树中，当前额度充足。')
});

const restart = surface({
  title: '重新开始「摄影」', glyph: 'undo', primary: '重新开始',
  body: pathLabel(['生活', '摄影']) + effectRows([
    ['分支状态', '从「已放下」恢复到「进行中」'],
    ['未完成待办', '2 条按原截止日期重新分组'],
    ['分支历史', '保留此前的放下日期和原因'],
  ])
});

const deleteEmpty = surface({
  title: '删除空分支「写作草稿」？', glyph: 'delete', primary: '删除空分支', tone: 'danger',
  body: pathLabel(['工作', '写作草稿']) + note('check', '待办、提交、里程碑和子分支都为 0，且没有业务历史。') +
    '<p>删除后，这条空分支会从树上移除。</p>'
});

function insertEmptyBranch(markup) {
  const researchRow = /(<button[^>]*aria-label="页面调研的更多操作"[^>]*>[\s\S]*?<\/button><\/div><\/li>)/;
  const item = '<li><div class="bga-row bl-empty-row" data-level="2" data-selected="true"><div class="bga-branch-name">' +
    '<i class="bga-marker" aria-hidden="true"></i><strong>写作草稿</strong></div><div class="bga-meta">' +
    '<span class="bl-hint">空分支</span><span></span><span class="bga-status" data-status="进行中"><i></i>进行中</span>' +
    '</div><button type="button" class="bga-more" aria-label="写作草稿的更多操作">⋯</button></div></li>';
  return markup.replace(' data-selected="true"', '').replace(researchRow, '$1' + item)
    .replace('<strong>7</strong> 进行中', '<strong>8</strong> 进行中')
    .replace('2 个直接子分支', '3 个直接子分支');
}

const archivedMarkup = '<div class="bga-page"><header class="page-head bga-head"><div>' +
  '<span class="eyebrow">个人工作区 / 分支</span><h1>已归档</h1></div><button type="button" class="btn btn-quiet">返回分组树</button></header>' +
  '<section class="panel"><header class="panel-head"><h2>工作</h2></header><div class="panel-body">' +
  '<div class="bga-row bl-archived-row" data-selected="true"><div class="bga-branch-name">' +
  '<span class="branch-dot" style="--branch:var(--coral-2)"></span><strong>页面调研</strong></div>' +
  '<span class="chip chip-info">已合并</span><span class="caption">11.20 归档</span></div></div></section></div>';

function scene(id, slug, label, overlay, stage = 'MVP', markup = grouped.markup) {
  return { ...grouped, id, slug, label, stage, markup, overlay };
}

export const pages = [
  scene('B01', 'branch-menu', '分支操作菜单', '', 'MVP / V1', anchorMenu(grouped.markup)),
  scene('B02', 'branch-new', '新建分支', newTop),
  scene('B03', 'branch-new-child', '新建子分支', newChild),
  scene('B04', 'branch-rename', '重命名分支', rename),
  scene('B05', 'branch-move', '移动分支', move),
  scene('B06', 'branch-finish', '收尾 · 选择去向', finish),
  scene('B07', 'branch-finish-confirm', '收尾 · 确认影响', finishConfirm),
  scene('B08', 'branch-pause', '放下分支', pause, 'V1'),
  scene('B09', 'branch-archive', '手动归档', archive, 'V1'),
  scene('B10', 'branch-delete-empty', '删除空分支', deleteEmpty, 'MVP', insertEmptyBranch(grouped.markup)),
  scene('B11', 'branch-unarchive', '取消归档', restore, 'V1', archivedMarkup),
  scene('B12', 'branch-restart', '重新开始', restart, 'V1'),
];
