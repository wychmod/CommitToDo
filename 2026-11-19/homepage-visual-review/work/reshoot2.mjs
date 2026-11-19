import { writeFile } from 'node:fs/promises';
const PORT = '9334';
const OUT = 'd:/idea/Commit/2026-11-19/homepage-visual-review/outputs/refs';
const sites = [
  { slug: 'en-linear', url: 'https://linear.app/', wait: 14000 },
  { slug: 'en-stripe-press', url: 'https://stripe.press/', wait: 14000 },
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const page = targets.find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let id = 0;
const pending = new Map();
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
});
const send = (method, params = {}) => new Promise((res) => { const mid = ++id; pending.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params })); });
await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
for (const s of sites) {
  await send('Page.navigate', { url: s.url });
  await sleep(s.wait);
  const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 72 });
  if (r.result?.data) await writeFile(`${OUT}/${s.slug}.jpg`, Buffer.from(r.result.data, 'base64'));
  const t = await send('Runtime.evaluate', { expression: 'document.body.innerText.slice(0,120)', returnByValue: true });
  console.log(s.slug, JSON.stringify(t.result?.result?.value ?? ''));
}
ws.close();
