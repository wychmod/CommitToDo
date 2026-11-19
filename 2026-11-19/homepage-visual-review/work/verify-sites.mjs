import { writeFile, mkdir } from 'node:fs/promises';

const PORT = '9333';
const OUT = 'd:/idea/Commit/2026-11-19/homepage-visual-review/outputs/refs';
const WORK = 'd:/idea/Commit/2026-11-19/homepage-visual-review/work';

const sites = [
  { slug: 'en-linear', url: 'https://linear.app/' },
  { slug: 'en-cursor', url: 'https://cursor.com/' },
  { slug: 'en-vercel', url: 'https://vercel.com/' },
  { slug: 'en-resend', url: 'https://resend.com/' },
  { slug: 'en-stripe-press', url: 'https://stripe.press/' },
  { slug: 'cn-trae', url: 'https://www.trae.ai/' },
  { slug: 'cn-manus', url: 'https://manus.im/' },
  { slug: 'cn-sspai', url: 'https://sspai.com/' },
  { slug: 'cn-yuque', url: 'https://www.yuque.com/' },
  { slug: 'cn-kimi', url: 'https://www.kimi.com/' },
];

await mkdir(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const page = targets.find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));

let id = 0;
const pending = new Map();
ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  }
});
const send = (method, params = {}) =>
  new Promise((resolve) => {
    const mid = ++id;
    pending.set(mid, resolve);
    ws.send(JSON.stringify({ id: mid, method, params }));
  });

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width: 1440,
  height: 900,
  deviceScaleFactor: 1,
  mobile: false,
});

const results = [];
for (const site of sites) {
  await send('Page.navigate', { url: site.url });
  await sleep(7000);
  let info = {};
  try {
    const r = await send('Runtime.evaluate', {
      expression: `(() => {
        const h = document.querySelector('h1');
        const cs = getComputedStyle(document.body);
        const hcs = h ? getComputedStyle(h) : null;
        return {
          title: document.title,
          url: location.href,
          h1: h ? h.innerText.slice(0,180) : null,
          h1size: hcs ? hcs.fontSize : null,
          h1weight: hcs ? hcs.fontWeight : null,
          bg: cs.backgroundColor,
          ff: cs.fontFamily,
          text: (document.body.innerText || '').replace(/\\s+/g,' ').slice(0, 500),
          scrollH: document.documentElement.scrollHeight
        };
      })()`,
      returnByValue: true,
    });
    info = r.result?.result?.value ?? {};
  } catch (e) {
    info = { error: String(e) };
  }
  let shot = null;
  try {
    const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 70 });
    if (r.result?.data) {
      shot = `${site.slug}.jpg`;
      await writeFile(`${OUT}/${shot}`, Buffer.from(r.result.data, 'base64'));
    }
  } catch (e) {
    shot = `ERR ${String(e)}`;
  }
  results.push({ ...site, info, shot });
  console.log(JSON.stringify({ url: site.url, finalUrl: info.url, title: info.title, h1: info.h1, bg: info.bg, shot }));
}
await writeFile(`${WORK}/verify.json`, JSON.stringify(results, null, 2));
ws.close();
