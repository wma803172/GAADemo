/* ---------------------------------------------------------------------------
   shoot.mjs — 通过 CDP 驱动 Chrome 截图
   用法: node tools/shoot.mjs --url http://127.0.0.1:8124 --out shots/a.png --t 0.2
   --------------------------------------------------------------------------- */
import { spawn } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const args = process.argv.slice(2);
const arg = (name, def) => {
  const i = args.indexOf('--' + name);
  return i >= 0 ? args[i + 1] : def;
};
const flag = (name) => args.includes('--' + name);

const url = arg('url', 'http://127.0.0.1:8124/');
const out = resolve(arg('out', 'shots/shot.png'));
const ts = (arg('t', '') || '').split(',').filter(Boolean).map(Number);
const W = Number(arg('width', 1600));
const H = Number(arg('height', 1000));
const wait = Number(arg('wait', 900));
const port = Number(arg('port', 9333));
const gpu = !flag('swiftshader');

const chromeCandidates = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
];
const chrome = chromeCandidates[0];

const profile = 'C:\\Users\\cx330\\AppData\\Local\\Temp\\dsh-chrome-profile-' + port;
const chromeArgs = [
  '--headless=new',
  '--remote-debugging-port=' + port,
  '--user-data-dir=' + profile,
  '--window-size=' + W + ',' + H,
  '--hide-scrollbars',
  '--mute-audio',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-extensions',
  '--force-device-scale-factor=1',
  '--allow-file-access-from-files',
];
if (!gpu) chromeArgs.push('--use-angle=swiftshader', '--enable-unsafe-swiftshader');
else chromeArgs.push('--use-angle=d3d11', '--enable-gpu-rasterization');

const proc = spawn(chrome, chromeArgs, { stdio: ['ignore', 'ignore', 'pipe'] });
let chromeErr = '';
proc.stderr.on('data', (d) => { chromeErr += d.toString(); });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getWs() {
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch('http://127.0.0.1:' + port + '/json/version');
      const j = await r.json();
      return j.webSocketDebuggerUrl;
    } catch { await sleep(150); }
  }
  throw new Error('chrome did not start: ' + chromeErr.slice(0, 500));
}

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); this.events = []; }
  static async connect(url) {
    const ws = new WebSocket(url);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    const c = new CDP(ws);
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && c.pending.has(msg.id)) {
        const { res, rej } = c.pending.get(msg.id);
        c.pending.delete(msg.id);
        if (msg.error) rej(new Error(JSON.stringify(msg.error)));
        else res(msg.result);
      } else if (msg.method) {
        c.events.push(msg);
      }
    };
    return c;
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    this.ws.send(JSON.stringify(payload));
    return new Promise((res, rej) => this.pending.set(id, { res, rej }));
  }
  close() { try { this.ws.close(); } catch {} }
}

const main = async () => {
  const wsUrl = await getWs();
  const cdp = await CDP.connect(wsUrl);
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  const send = (m, p) => cdp.send(m, p, sessionId);

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Log.enable');

  await send('Page.navigate', { url });
  await sleep(400);

  let ready = false;
  for (let i = 0; i < 120; i++) {
    try {
      const r = await send('Runtime.evaluate', { expression: 'window.__ready === true', returnByValue: true });
      if (r.result.value === true) { ready = true; break; }
    } catch {}
    await sleep(200);
  }

  const info = await send('Runtime.evaluate', {
    expression: 'JSON.stringify({ready: window.__ready, gl: (()=>{try{const c=document.createElement("canvas");const g=c.getContext("webgl2")||c.getContext("webgl");const d=g.getExtension("WEBGL_debug_renderer_info");return d?g.getParameter(d.UNMASKED_RENDERER_WEBGL):"n/a";}catch(e){return String(e)}})()})',
    returnByValue: true,
  });
  console.log('PAGE', info.result.value);

  await mkdir(dirname(out), { recursive: true });

  const list = ts.length ? ts : [null];
  for (let i = 0; i < list.length; i++) {
    const t = list[i];
    if (t !== null) {
      await send('Runtime.evaluate', { expression: 'window.__setT && window.__setT(' + t + ')' });
      await sleep(wait);
    } else {
      await sleep(wait);
    }
    const ev = arg('eval', '');
    if (ev) {
      const rr = await send('Runtime.evaluate', { expression: ev, returnByValue: true });
      if (rr && rr.result) console.log('EVAL ' + JSON.stringify(rr.result.value ?? rr.result.description));
      if (rr && rr.exceptionDetails) console.log('EVAL-ERR ' + JSON.stringify(rr.exceptionDetails.text));
      await sleep(600);
    }
    const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const path = list.length > 1 ? out.replace(/\.png$/, '_' + String(t).replace('.', 'p') + '.png') : out;
    await writeFile(path, Buffer.from(shot.data, 'base64'));
    console.log('SAVED ' + path);
  }

  const logs = cdp.events.filter((e) => e.method === 'Log.entryAdded' || e.method === 'Runtime.consoleAPICalled');
  for (const e of logs.slice(0, 40)) {
    if (e.method === 'Log.entryAdded') {
      const en = e.params.entry;
      if (en.level === 'error' || en.level === 'warning') console.log('[' + en.level + '] ' + en.text);
    } else {
      const a = (e.params.args || []).map((x) => x.value ?? x.description ?? '').join(' ');
      if (e.params.type === 'error') console.log('[console.error] ' + a);
      else if (e.params.type === 'log') console.log('[log] ' + a);
    }
  }

  cdp.close();
  proc.kill();
  process.exit(0);
};

main().catch((e) => { console.error('FAIL', e); proc.kill(); process.exit(1); });
