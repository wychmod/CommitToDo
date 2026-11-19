import { writeFile } from 'node:fs/promises';

const PORT = process.argv[2] ?? '9222';
const URL_TO_OPEN = process.argv[3] ?? 'http://127.0.0.1:5173/';
const OUT_DIR = process.argv[4] ?? '.';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const page = targets.find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));

let id = 0;
const pending = new Map();
const events = [];
ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  } else if (msg.method) {
    events.push(msg.method);
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

async function shoot({ width, height, file, fullPage = false, wait = 3200, mobile = false }) {
  await send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile,
  });
  await send('Page.navigate', { url: URL_TO_OPEN });
  await sleep(wait);
  let clip;
  if (fullPage) {
    const m = await send('Page.getLayoutMetrics');
    const cs = m.result.cssContentSize ?? m.result.contentSize;
    clip = { x: 0, y: 0, width: cs.width, height: cs.height, scale: 1 };
  }
  const res = await send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: fullPage,
    ...(clip ? { clip } : {}),
  });
  const data = res.result?.data;
  if (!data) {
    console.log(`FAILED ${file}`, JSON.stringify(res).slice(0, 400));
    return;
  }
  await writeFile(`${OUT_DIR}/${file}`, Buffer.from(data, 'base64'));
  console.log(`saved ${file}`);
}

await send('Emulation.setDeviceMetricsOverride', {
  width: 1512,
  height: 950,
  deviceScaleFactor: 1,
  mobile: false,
});
await send('Page.navigate', { url: URL_TO_OPEN });
await sleep(2500);

await shoot({ width: 1512, height: 950, file: '01-hero-1512x950.png' });
await shoot({ width: 1512, height: 950, file: '02-full-page-1512.png', fullPage: true, wait: 3600 });
await shoot({ width: 1512, height: 950, file: '03-mid-1512.png', wait: 1200 });
await shoot({ width: 430, height: 932, file: '04-mobile-430.png', fullPage: true, mobile: true });
ws.close();
