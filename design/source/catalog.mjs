import { readFile, writeFile } from 'node:fs/promises';
import { directory, fileStem } from './shared.mjs';
import { join } from 'node:path';
import { pages as work } from './today-detail.mjs';
import { pages as tree } from './tree-history.mjs';
import { page as grouped } from './branches-grouped.mjs';
import { pages as year } from './year.mjs';
import { pages as personal } from './me-data.mjs';
import { pages as auth } from './auth-pages.mjs';
import { pages as branches } from './branch-layers.mjs';
import { pages as support } from './support-views.mjs';

const scenes = new Map([...work, ...tree, grouped, ...year, ...personal, ...auth, ...branches, ...support]
  .map((page) => [page.slug, page]));
const notes = {
  today: '今日清单、分组待办、最近提交与停滞提醒。',
  'branches-grouped': '选定的分组树。名称进入详情，行尾更多打开分支操作。',
  'branch-detail': '分支目标、进度、待办、提交、子分支与里程碑。',
  history: '按真实日期分布的泳道、子分支合回与提交节点。',
  year: '按年回看提交和分支，含年度总结与分享入口。',
  me: '查看首批徽章、设置和本机数据。',
  settings: '明暗主题、树密度与注解偏好。',
  data: '本机快照、文件导出和从文件恢复。',
  login: '账号用于跨设备同步，也可直接打开本机工作区。',
  signup: '独立注册页面，沿用首页便签、回执和分支色。',
  recover: '输入邮箱、检查邮箱、设置新密码共用一个页面。',
  'branch-menu': '在每个分支行尾点「···」；菜单贴着原行展开。',
  'branch-new': '从页头新建一级分支，选择预设色相。',
  'branch-new-child': '在「产品设计」下创建三级子分支，继承色相。',
  'branch-finish': '选择待办去向，以及是否将收尾的分支继续留在树上。',
  'branch-finish-confirm': '明确合并影响后完成确认。',
  'restore-file': '先校验文件并核对摘要，备份本机数据，再整体替换。',
  'data-v1': '本机快照恢复与异地 JSON 备份，仍可按本机模式使用。',
  'sync-entry': '页面内的可选入口，带登录链接。',
  'sync-conflict': '对照两次修改并查看留痕，V2 方案稿。'
};

const stageById = { P05:'V1', P09:'V2', P10:'V2', P11:'V2', S11:'V2', O04:'V1', O07:'V2', O08:'V2' };
const stageBySlug = {
  'week-review':'MVP', 'month-review':'V1', 'year-share':'V1', 'archived-branches':'V1',
  'badge-wall':'V1', 'badge-detail':'V1', help:'V2', 'data-v1':'V1', 'snapshot-restore':'V1'
};
const displayNames = {
  'branches-grouped':'分支树 · 分组',
  'branch-detail':'分支详情',
  'quick-add':'快速添加',
  'todo-detail':'待办详情',
  'commit-detail':'提交详情',
  search:'全局搜索',
  'week-review':'周回顾',
  'month-review':'月回顾',
  'sample-tree':'示例树',
  'milestone-detail':'里程碑详情',
  'milestone-new':'新建里程碑',
  'year-share':'年度分享图',
  'sync-entry':'站内登录提示',
  'sync-devices':'设备管理',
  'sync-conflict':'同步冲突记录',
  'clear-local':'危险操作确认',
};

function escape(text) {
  return String(text).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
}

async function image(source, caption, home) {
  const data = await readFile(join(directory, source));
  if (data.toString('latin1', 1, 4) !== 'PNG') throw new Error('Expected PNG: ' + source);
  const width = data.readUInt32BE(16);
  const height = data.readUInt32BE(20);
  return '<figure' + (home ? ' class="home-preview"' : '') + '><a href="' + escape(source) +
    '"><img src="' + escape(source) + '" width="' + width + '" height="' + height +
    '" loading="lazy" alt="' + escape(caption) + '"></a><figcaption><a href="' + escape(source) + '">' +
    (caption.endsWith('深色') ? '深色' : '浅色') + '原图 ↗</a></figcaption></figure>';
}

async function card(record) {
  const name = escape(record.name);
  const images = await Promise.all(record.images.map((source, index) =>
    image(source, record.name + ' · ' + (index ? '深色' : '浅色'), record.home)));
  const desc = record.description ? '<p>' + escape(record.description) + '</p>' : '';
  return '<details class="scene" id="' + record.anchor + '"' + (record.open ? ' open' : '') +
    '><summary><span class="disclosure" aria-hidden="true">›</span><span><strong>' + name + '</strong>' +
    (record.route ? '<code>' + escape(record.route) + '</code>' : '') + '</span>' +
    '<span class="stage">' + escape(record.stage) + '</span></summary><div class="scene-body">' + desc +
    '<div class="pair">' + images.join('') + '</div></div></details>';
}

function record(slug, open = false) {
  const page = scenes.get(slug);
  if (!page) throw new Error('Missing scene: ' + slug);
  return {
    name: displayNames[slug] || page.label || page.title,
    stage: page.stage || stageBySlug[slug] || stageById[page.id] || 'MVP',
    route: page.id.startsWith('P') ? page.route : '',
    description: notes[slug],
    anchor: slug === 'branches-grouped' ? 'p02-branches' : fileStem(page, '').slice(0, -1),
    open,
    images: ['light','dark'].map(theme => 'images/' + fileStem(page, theme) + '.png')
  };
}

const home = {
  name:'首页', anchor:'p00-home', stage:'MVP', route:'/', home:true,
  description:'确认的首页明暗原稿。',
  images:['images/p00-home-light.png','images/p00-home-dark.png']
};

const groups = [
  {id:'core-pages',title:'核心工作台',blurb:'从首页进入本机空间。分支页采用你选定的分组树。',items:[
    home, ...['today','branches-grouped','branch-detail','history','year','me','settings','data'].map(slug => record(slug, slug === 'branches-grouped'))
  ]},
  {id:'auth-pages',title:'登录、注册与找回',blurb:'三个 V2 独立页面。找回流程另展示「检查邮箱」和「设置新密码」两步。',items:
    auth.map(page => record(page.slug, page.slug === 'login' || page.slug === 'signup'))},
  {id:'branch-operations',title:'分组树展开后的画面',blurb:'打开更多菜单，或进入新建、移动、收尾等操作。',items:
    branches.map(page => record(page.slug, page.slug === 'branch-menu'))},
  {id:'workspace-states',title:'工作台其他视图与弹层',blurb:'待办、历程、搜索、回顾和首次使用的关键画面。',items:
    ['all-todos','quick-add','todo-detail','commit-detail','milestone-detail','milestone-new','search','archived-branches','week-review','month-review','year-share','first-task','first-commit','sample-tree'].map(slug => record(slug))},
  {id:'personal-states',title:'徽章、数据与协同状态',blurb:'备份恢复用真实产品阶段标注。同步与设备状态为 V2。',items:
    ['badge-wall','badge-detail','restore-file','data-v1','snapshot-restore','clear-local','help','sync-entry','sync-devices','sync-conflict'].map(slug => record(slug))},
];

const coreCount = groups[0].items.length + 3;
const sceneCount = groups.reduce((count, group) => count + group.items.length, 0);
const referencedSlugs = new Set(groups.flatMap(group => group.items.flatMap(item => item.images)));
for (const page of [...personal, ...auth, ...branches, ...support]) {
  if (!referencedSlugs.has('images/' + fileStem(page, 'light') + '.png')) throw new Error('Unlisted scene: ' + page.slug);
}

const sections = await Promise.all(groups.map(async group =>
  '<section class="gallery-group" id="' + group.id + '"><header class="group-head"><div><h2>' + group.title +
  '</h2><p>' + group.blurb + '</p></div><span class="caption">' + group.items.length + ' 组</span></header>' +
  (await Promise.all(group.items.map(card))).join('\n') + '</section>'
));

const geometry = await card({
  name:'配色与图形样板', anchor:'visual-language', stage:'设计规范',
  images:['images/visual-language-light.png','images/visual-language-dark.png']
});

const styles = '<style>' +
  '*{box-sizing:border-box}body{margin:0;background:var(--page);color:var(--text);font:15px/1.6 "Microsoft YaHei UI","Noto Sans SC",sans-serif}' +
  'h1,h2,p,figure{margin:0}button{font:inherit}a{color:var(--accent);text-decoration:none}a:hover{text-decoration:underline;text-underline-offset:4px}' +
  'a:focus-visible,summary:focus-visible{outline:2px solid var(--focus);outline-offset:3px}' +
  '.bar{border-bottom:1px solid var(--line);background:var(--panel)}.bar>div,.catalog{max-width:1280px;margin:auto;padding-inline:28px}' +
  '.bar>div{min-height:57px;display:flex;align-items:center;justify-content:space-between;gap:12px}.bar strong{letter-spacing:-.04em;font-size:18px}' +
  '.bar a{font-size:13px}.catalog{padding-bottom:58px}.hero{padding:51px 0 20px}.hero h1{font-size:clamp(33px,6vw,57px);line-height:1.14;letter-spacing:-.055em}' +
  '.hero p,.group-head p,.scene-body>p{color:var(--muted);margin-top:10px}.reference,.jump{display:flex;flex-wrap:wrap;gap:9px 17px;font-size:13px;margin-top:15px}' +
  '.jump{gap:8px;margin-top:0;padding:14px 0 20px;border-bottom:1px solid var(--line)}.jump a{background:var(--panel);border:1px solid var(--line);color:var(--text);border-radius:6px;padding:6px 10px}' +
  '.gallery-group{padding-top:39px;scroll-margin-top:18px}.group-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-bottom:15px}' +
  '.group-head h2{font-size:26px;letter-spacing:-.035em;line-height:1.24}.group-head p,.caption{font-size:13px;color:var(--muted)}.caption{white-space:nowrap}' +
  '.scene{border:1px solid var(--line);border-radius:8px;background:var(--panel);margin:8px 0;scroll-margin-top:14px}.scene>summary{display:flex;align-items:center;gap:9px;min-height:52px;padding:10px 13px;cursor:pointer;list-style:none}' +
  '.scene>summary::-webkit-details-marker{display:none}.disclosure{color:var(--accent);font-size:18px;line-height:1;transition:transform .15s}.scene[open] .disclosure{transform:rotate(90deg)}' +
  'summary strong{font-size:15px}summary code{margin-left:9px;color:var(--muted);font-size:12px;font-family:"Cascadia Mono",monospace;overflow-wrap:anywhere}' +
  '.stage{margin-left:auto;background:var(--info-bg);color:var(--info);padding:2px 7px;border-radius:4px;font-size:11px;white-space:nowrap}.scene-body{padding:0 13px 13px}' +
  '.scene-body>p{margin:0 0 10px;font-size:13px}.pair{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));align-items:start;gap:12px}' +
  'figure{border:1px solid var(--line);border-radius:6px;overflow:hidden;background:var(--inset)}figure>a{display:block}img{display:block;width:100%;height:auto}' +
  '.home-preview img{height:min(560px,65vw);object-fit:contain;object-position:top}figcaption{border-top:1px solid var(--line);padding:7px 10px;background:var(--panel);font-size:12px}' +
  '.geometry{margin-top:36px}@media(max-width:720px){.bar>div,.catalog{padding-inline:15px}.hero{padding-top:30px}.pair{grid-template-columns:1fr}.scene-body{padding-inline:8px}.home-preview img{height:auto}}' +
  '</style>';
const script = '<script>function reveal(){const id=location.hash.slice(1);const el=document.getElementById(id);if(el&&el.tagName==="DETAILS"){el.open=true;el.scrollIntoView({block:"start"});}}window.addEventListener("hashchange",reveal);reveal();</script>';
const body = '<div class="bar"><div><strong>CommitToDo</strong><a href="../docs/DESIGN.md">设计交接</a></div></div>' +
  '<main class="catalog"><header class="hero"><h1>全部页面设计稿</h1><p>' + coreCount + ' 个独立页面与 ' + (sceneCount-coreCount) +
  ' 个补充视图和操作状态，每组都有浅色和深色。展开后点击图片查看原图。</p>' +
  '<nav class="reference" aria-label="设计资料"><a href="branch-variants.html">分支树方案对照</a><a href="../docs/UI-VISUAL.md">视觉规范</a>' +
  '<a href="../docs/UI-COMPONENTS.md">组件清单</a><a href="../docs/UI-PAGES.md">页面设计</a><a href="../docs/HOMEPAGE-MOTION.md">首页动效</a></nav></header>' +
  '<nav class="jump" aria-label="画稿分类">' + groups.map(group => '<a href="#' + group.id + '">' + group.title + '</a>').join('') +
  '<a href="#visual-language">配色与图形样板</a></nav>' + sections.join('\n') + '<div class="geometry">' + geometry + '</div></main>';
const html = '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<title>CommitToDo · 全部页面设计稿</title><link rel="stylesheet" href="tokens.css">' + styles + '</head><body>' + body + script + '</body></html>';
await writeFile(join(directory, 'index.html'), html, 'utf8');
console.log(coreCount + ' independent screens, ' + (sceneCount-coreCount) + ' supplemental states, ' + sceneCount * 2 + ' themed images.');
