import { writeFile } from 'node:fs/promises';
const PORT = '9334';
const OUT = 'd:/idea/Commit/2026-11-19/homepage-visual-review/outputs/refs';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const page = targets.find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let id = 0; const pending = new Map();
ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((res) => { const mid = ++id; pending.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params })); });
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

// Microsoft: scroll to reveal content
await send('Page.navigate', { url: 'https://www.microsoft.com/zh-cn/' });
await sleep(8000);
await send('Runtime.evaluate', { expression: 'window.scrollTo(0, 420);' });
await sleep(3000);
let r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 72 });
if (r.result?.data) await writeFile(`${OUT}/big-microsoft.jpg`, Buffer.from(r.result.data, 'base64'));
let t = await send('Runtime.evaluate', { expression: `document.body.innerText.replace(/\\s+/g,' ').slice(0,200)`, returnByValue: true });
console.log('MS', t.result?.result?.value);

// Feishu: close promo modal then capture
await send('Page.navigate', { url: 'https://www.feishu.cn/' });
await sleep(9000);
await send('Runtime.evaluate', {
  expression: `(() => {
    const cands = [...document.querySelectorAll('[aria-label*="关闭"],[aria-label*="close"],[class*="close"],[class*="Close"]')];
    for (const el of cands) { const r = el.getBoundingClientRect(); if (r.width>0 && r.height>0 && r.top < 700) { el.click(); return 'clicked '+el.className; } }
    return 'no close found';
  })()`,
  returnByValue: true,
});
await sleep(2500);
r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 72 });
if (r.result?.data) await writeFile(`${OUT}/big-feishu.jpg`, Buffer.from(r.result.data, 'base64'));
console.log('done');
ws.close();
