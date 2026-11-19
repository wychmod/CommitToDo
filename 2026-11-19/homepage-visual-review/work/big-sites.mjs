import { writeFile } from 'node:fs/promises';
const PORT = '9334';
const OUT = 'd:/idea/Commit/2026-11-19/homepage-visual-review/outputs/refs';
const WORK = 'd:/idea/Commit/2026-11-19/homepage-visual-review/work';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const sites = [
  { slug: 'big-apple', url: 'https://www.apple.com/', wait: 9000 },
  { slug: 'big-stripe', url: 'https://stripe.com/', wait: 9000 },
  { slug: 'big-figma', url: 'https://www.figma.com/', wait: 9000 },
  { slug: 'big-microsoft', url: 'https://www.microsoft.com/zh-cn/', wait: 9000 },
  { slug: 'big-tencent', url: 'https://www.tencent.com/zh-cn/', wait: 9000 },
  { slug: 'big-mi', url: 'https://www.mi.com/', wait: 9000 },
  { slug: 'big-doubao', url: 'https://www.doubao.com/', wait: 9000 },
  { slug: 'big-aliyun', url: 'https://www.aliyun.com/', wait: 9000 },
];

const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const page = targets.find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let id = 0;
const pending = new Map();
ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((res) => { const mid = ++id; pending.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params })); });

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

const expr = `(() => {
  const cs = (el) => el ? getComputedStyle(el) : null;
  const h1 = document.querySelector('h1');
  const hcs = cs(h1);
  const header = document.querySelector('header') || document.querySelector('nav');
  const hdr = cs(header);
  const main = document.querySelector('main');
  const mrect = main ? main.getBoundingClientRect() : null;
  let btn = null;
  for (const el of document.querySelectorAll('a,button')) {
    const s = cs(el);
    if (!s) continue;
    const bg = s.backgroundColor;
    const m = bg.match(/rgba?\\(([^)]+)\\)/);
    if (!m) continue;
    const parts = m[1].split(',').map(Number);
    const a = parts.length > 3 ? parts[3] : 1;
    if (a > 0.05 && parts.slice(0,3).some(v => v > 12)) { btn = el; break; }
  }
  const bcs = cs(btn);
  const br = btn ? btn.getBoundingClientRect() : null;
  return {
    title: document.title,
    finalUrl: location.href,
    bg: cs(document.body).backgroundColor,
    ff: cs(document.body).fontFamily.slice(0,60),
    scrollH: document.documentElement.scrollHeight,
    h1: h1 ? h1.innerText.replace(/\\s+/g,' ').slice(0,90) : null,
    h1fs: hcs ? hcs.fontSize : null, h1lh: hcs ? hcs.lineHeight : null,
    h1fw: hcs ? hcs.fontWeight : null, h1ls: hcs ? hcs.letterSpacing : null,
    h1w: h1 ? Math.round(h1.getBoundingClientRect().width) : null,
    headerH: header ? Math.round(header.getBoundingClientRect().height) : null,
    headerBg: hdr ? hdr.backgroundColor : null,
    mainW: mrect ? Math.round(mrect.width) : null,
    btnH: br ? Math.round(br.height) : null,
    btnR: bcs ? bcs.borderRadius : null,
    btnBg: bcs ? bcs.backgroundColor : null,
    btnFs: bcs ? bcs.fontSize : null,
    btnW: br ? Math.round(br.width) : null
  };
})()`;

const out = [];
for (const s of sites) {
  await send('Page.navigate', { url: s.url });
  await sleep(s.wait);
  let info = {};
  try {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
    info = r.result?.result?.value ?? {};
  } catch (e) { info = { error: String(e) }; }
  let shot = null;
  try {
    const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 70 });
    if (r.result?.data) {
      shot = `${s.slug}.jpg`;
      await writeFile(`${OUT}/${shot}`, Buffer.from(r.result.data, 'base64'));
    }
  } catch (e) { shot = 'ERR'; }
  out.push({ ...s, info, shot });
  console.log(s.slug, JSON.stringify(info));
}
await writeFile(`${WORK}/big-verify.json`, JSON.stringify(out, null, 2));
ws.close();
