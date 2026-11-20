import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export const directory = fileURLToPath(new URL('../', import.meta.url));
export const tokenData = JSON.parse(await readFile(new URL('../design-tokens.json', import.meta.url), 'utf8'));
const stroke = {
  today: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4m8-4v4M4 10h16m-12 5 2 2 4-4"/>',
  branch: '<circle cx="7" cy="5" r="2"/><circle cx="7" cy="19" r="2"/><circle cx="17" cy="6" r="2"/><path d="M7 7v10m10-9c0 4-1 5-5 5H7"/>',
  history: '<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>',
  me: '<circle cx="12" cy="8" r="3"/><path d="M5 20c0-3 2.8-5 7-5s7 2 7 5"/>',
  search: '<circle cx="10.5" cy="10.5" r="5.5"/><path d="m15 15 4 4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  device: '<rect x="4" y="4" width="16" height="12" rx="2"/><path d="M12 16v4m-4 0h8"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4 19 5"/>',
  moon: '<path d="M20 14A8 8 0 0 1 10 4a8.2 8.2 0 1 0 10 10Z"/>'
};

function icon(name, size = 18) {
  return '<svg class="stroke-icon" aria-hidden="true" width="' + size + '" height="' + size +
    '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
    stroke[name] + '</svg>';
}

function declarations(values) {
  return Object.entries(values).map(([name, value]) => '  --' + name + ': ' + value + ';').join('\n');
}

export function makeTokensCss() {
  const { metrics, themes, branches } = tokenData;
  const common = { radius: metrics.radius.panel + 'px', 'radius-control': metrics.radius.control + 'px' };
  const unit = { duration: 'ms', receipt: 'ms', ease: '' };
  metrics.spacing.forEach((size, index) => { common['s' + (index + 1)] = size + 'px'; });
  for (const [name, group] of Object.entries(metrics)) {
    if (name === 'spacing') continue;
    for (const [key, value] of Object.entries(group)) {
      if (typeof value !== 'number' && typeof value !== 'string') continue;
      const cssKey = key.replace(/[A-Z]/g, (letter) => '-' + letter.toLowerCase());
      const suffix = typeof value === 'number' ? (unit[name] ?? 'px') : '';
      common[name + '-' + cssKey] = value + suffix;
    }
  }
  common['timeline-stall-pattern'] = metrics.timeline.stallPattern.join(' ');
  return ':root {\n' + declarations(common) + '\n}\n' +
    Object.entries(themes).map(([theme, values]) => {
      const colors = { ...values };
      for (const [branch, palette] of Object.entries(branches)) {
        const [l1, l2, l3, fill] = palette[theme];
        Object.assign(colors, { [branch + '-1']: l1, [branch + '-2']: l2, [branch + '-3']: l3, [branch + '-bg']: fill });
      }
      // 默认主题挂在 :root，不声明 data-theme 时即生效；其余主题只能显式切换
      const selector = theme === (tokenData.defaultTheme ?? 'light')
        ? ':root, [data-theme="' + theme + '"]'
        : '[data-theme="' + theme + '"]';
      return selector + ' {\n' + declarations(colors) + '\n  color-scheme: ' + theme + ';\n}';
    }).join('\n');
}

function shell(page, theme) {
  const links = [
    ['今天', 'today', 'p01-today'], ['分支', 'branch', 'p02-branches'],
    ['历程', 'history', 'p04-history'], ['我的', 'me', 'p06-me']
  ].map(([label, key, slug]) => {
    const selected = page.section === label ? ' aria-current="page"' : '';
    const content = icon(key) + '<span>' + label + '</span>';
    return slug
      ? '<a class="nav-item" href="' + slug + '-' + theme + '.html"' + selected + '>' + content + '</a>'
      : '<span class="nav-item">' + content + '</span>';
  }).join('');

  const trail = page.section === page.title ? '' : '<span aria-hidden="true">/</span><span class="crumb-current">' + page.title + '</span>';
  return '<div class="app-frame">' +
    '<header class="topbar"><span class="brand"><span class="brand-mark" aria-hidden="true">C</span>CommitToDo</span>' +
    '<div class="breadcrumbs"><span>我的工作区</span><span aria-hidden="true">/</span><span class="crumb-current">' + page.section + '</span>' + trail + '</div>' +
    '<div class="header-actions"><button class="icon-button" type="button" aria-label="搜索">' + icon('search', 16) + '</button>' +
    '<button class="icon-button" type="button" aria-label="' + (theme === 'dark' ? '深色主题' : '浅色主题') + '">' +
    icon(theme === 'dark' ? 'moon' : 'sun', 16) + '</button>' +
    '<button class="btn btn-quiet" type="button">' + icon('plus', 15) + '记一笔</button></div></header>' +
    '<aside class="app-sidebar"><div class="sidebar-inner"><div class="workspace-name"><span class="workspace-icon">' + icon('device', 17) +
    '</span><div><strong>个人工作区</strong><span>本机空间</span></div></div><nav class="nav-list" aria-label="工作区">' + links + '</nav>' +
    '<div class="sidebar-status"><span><i class="local-dot" aria-hidden="true"></i>本地数据</span><span>已备份于 11.20 09:12</span></div></div></aside>' +
    '<main class="app-main" aria-label="' + page.title + '"><div class="content">' + page.markup + '</div></main></div>';
}

export function makePage(page, theme, styles) {
  const body = page.board ? '<main class="content language-board">' + page.markup + '</main>'
    : page.layout === 'standalone' ? page.markup : shell(page, theme);
  return '<!doctype html><html lang="zh-CN" data-theme="' + theme +
    '" data-design="' + page.slug + '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>CommitToDo · ' + page.title + '</title><style>' + styles + '</style></head><body>' +
    body + (page.overlay || '') + '</body></html>';
}

export function fileStem(page, theme) {
  const id = page.id ? page.id.toLowerCase() + '-' : '';
  return id + page.slug + '-' + theme;
}
