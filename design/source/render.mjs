import { spawn } from 'node:child_process';
import { access, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { once } from 'node:events';
import { directory, fileStem, makePage, makeTokensCss } from './shared.mjs';
import { pages as todayDetail } from './today-detail.mjs';
import { pages as treeHistory } from './tree-history.mjs';
import { pages as year } from './year.mjs';
import { languageBoard } from './visual-language.mjs';

const branchVariantsOnly = process.argv.includes('--branch-variants');
const allPages = process.argv.includes('--all-pages');
const onboardingOnly = process.argv.includes('--onboarding');
const branchVariantFiles = ['branches-grouped', 'branches-inspect', 'branches-map'];
const allPageFiles = ['auth-pages', 'me-data', 'branch-layers', 'support-views'];
if ([branchVariantsOnly, allPages, onboardingOnly].filter(Boolean).length > 1) throw new Error('Choose one render group.');
const pages = onboardingOnly
  ? (await import('./support-views.mjs')).pages.filter((page) => page.id === 'O06')
  : branchVariantsOnly
    ? await Promise.all(branchVariantFiles.map(async (file) => (await import('./' + file + '.mjs')).page))
    : allPages
      ? (await Promise.all(allPageFiles.map(async (file) => (await import('./' + file + '.mjs')).pages))).flat()
      : [...todayDetail, ...treeHistory, ...year].sort((a, b) => a.id.localeCompare(b.id));
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const imagePath = join(directory, 'images');

function connect(url) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    const pending = new Map();
    let id = 0;
    socket.addEventListener('error', reject, { once: true });
    socket.addEventListener('open', () => resolve({
      close: () => socket.close(),
      send(method, params = {}) {
        const sequence = ++id;
        return new Promise((accept, fail) => {
          const timer = setTimeout(() => {
            pending.delete(sequence);
            fail(new Error(method + ' timed out'));
          }, 7500);
          pending.set(sequence, { accept, fail, timer });
          socket.send(JSON.stringify({ id: sequence, method, params }));
        });
      }
    }), { once: true });
    socket.addEventListener('message', ({ data }) => {
      const message = JSON.parse(data);
      const request = pending.get(message.id);
      if (!request) return;
      pending.delete(message.id);
      clearTimeout(request.timer);
      if (message.error) request.fail(new Error(message.error.message));
      else request.accept(message.result);
    });
    socket.addEventListener('close', () => {
      for (const { fail, timer } of pending.values()) {
        clearTimeout(timer);
        fail(new Error('Browser connection closed'));
      }
      pending.clear();
    });
  });
}

async function findBrowser() {
  const candidates = [
    process.env.CTD_DESIGN_BROWSER,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
  ];
  for (const path of candidates.filter(Boolean)) {
    try {
      await access(path);
      return path;
    } catch {}
  }
  throw new Error('Set CTD_DESIGN_BROWSER to your Chromium executable.');
}

async function evaluate(client, expression) {
  const result = await client.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}

async function viewport(client, width, height) {
  await client.send('Emulation.setDeviceMetricsOverride', {
    width, height, deviceScaleFactor: 1, mobile: false, screenWidth: width, screenHeight: height
  });
}

async function render(client, page, theme, styles) {
  const isBoard = page.board;
  const stem = fileStem(page, theme);
  const width = 1440;
  const height = page.height ?? (isBoard ? 850 : page.id === 'P01' ? 960 : 1040);
  await viewport(client, width, height);
  const markup = makePage(page, theme, styles);
  await client.send('Page.navigate', { url: 'data:text/html;base64,' + Buffer.from(markup, 'utf8').toString('base64') });
  let loaded = false;
  const expectedTitle = JSON.stringify('CommitToDo · ' + page.title);
  const expectedTheme = JSON.stringify(theme);
  const expectedDesign = JSON.stringify(page.slug);
  for (let attempt = 0; attempt < 30 && !loaded; attempt++) {
    try {
      loaded = await evaluate(client, "(async () => { if (!document.querySelector('main') || document.readyState !== 'complete' || document.title !== " +
        expectedTitle + " || document.documentElement.dataset.theme !== " + expectedTheme +
        " || document.documentElement.dataset.design !== " + expectedDesign + ") return false; await document.fonts.ready; return true; })()");
    } catch {}
    if (!loaded) await wait(70);
  }
  if (!loaded) throw new Error('Page never became ready: ' + stem);

  const layout = await client.send('Page.getLayoutMetrics');
  const captureHeight = page.overlay ? height : Math.max(height, Math.ceil(layout.cssContentSize.height));
  const { data } = await client.send('Page.captureScreenshot', {
    format: 'png', captureBeyondViewport: true, fromSurface: true,
    clip: { x: 0, y: 0, width, height: captureHeight, scale: 1 }
  });
  await writeFile(join(imagePath, stem + '.png'), Buffer.from(data, 'base64'));
  const desktopOverflow = await evaluate(client, 'document.documentElement.scrollWidth - innerWidth');
  await viewport(client, 390, 844);
  const mobile = await evaluate(client, "(async () => {await new Promise(requestAnimationFrame); return {overflow:document.documentElement.scrollWidth - innerWidth, headerVisible:[...document.querySelectorAll('.header-actions button')].every(node => node.getBoundingClientRect().right <= innerWidth + 1)};})()");
  console.log(stem + '  ' + width + ' × ' + captureHeight + '  ' +
    'desktop overflow ' + desktopOverflow + ' | 390px overflow ' + mobile.overflow + ' | actions ' + mobile.headerVisible);
}

const browserPath = await findBrowser();
await mkdir(imagePath, { recursive: true });
const styleFiles = onboardingOnly
  ? ['shared', 'layers', 'support-views']
  : branchVariantsOnly
    ? ['shared', ...branchVariantFiles]
    : allPages
      ? ['shared', 'today-detail', 'tree-history', 'year', 'branches-grouped', 'layers', ...allPageFiles]
      : ['shared', 'today-detail', 'tree-history', 'year', 'visual-language'];
const cssParts = await Promise.all(styleFiles.map((file) => readFile(new URL('./' + file + '.css', import.meta.url), 'utf8')));
const tokenCss = makeTokensCss();
if (!branchVariantsOnly && !allPages && !onboardingOnly) {
  await writeFile(join(directory, 'tokens.css'), tokenCss, 'utf8');
}
const styles = tokenCss + '\n' + cssParts.join('\n');
const tempBase = await realpath(tmpdir());
const profile = await mkdtemp(join(tempBase, 'commit-design-capture-'));
const browser = spawn(browserPath, [
  '--headless=new', '--remote-debugging-port=0', '--no-first-run', '--no-default-browser-check',
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--hide-scrollbars',
  '--user-data-dir=' + profile, 'about:blank'
], { windowsHide: true, stdio: 'ignore' });
const exited = once(browser, 'exit').catch(() => []);
let control;
let tab;
try {
  let endpoint;
  for (let attempt = 0; attempt < 60 && !endpoint; attempt++) {
    try {
      const [port] = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split(/\r?\n/);
      endpoint = 'http://127.0.0.1:' + port;
    } catch { await wait(100); }
  }
  if (!endpoint) throw new Error('Chromium did not start.');
  const version = await (await fetch(endpoint + '/json/version')).json();
  control = await connect(version.webSocketDebuggerUrl);
  const opened = await (await fetch(endpoint + '/json/new?about:blank', { method: 'PUT' })).json();
  tab = await connect(opened.webSocketDebuggerUrl);
  await tab.send('Page.enable');
  for (const theme of ['light', 'dark']) {
    const themedPages = branchVariantsOnly || allPages || onboardingOnly ? pages : [...pages, languageBoard(theme)];
    for (const page of themedPages) {
      await render(tab, page, theme, styles);
    }
  }
} finally {
  if (tab) tab.close();
  if (control) {
    await control.send('Browser.close').catch(() => {});
    control.close();
  } else browser.kill();
  await Promise.race([exited, wait(1000)]);
  const resolvedProfile = await realpath(profile).catch(() => null);
  if (resolvedProfile && dirname(resolvedProfile) === tempBase && basename(resolvedProfile).startsWith('commit-design-capture-')) {
    await rm(resolvedProfile, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }).catch(() => {});
  }
}
