/* grabvideo.mjs — 打开页面，找到 <video>，按时间点抽帧存 PNG */
import { spawn } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';

const url = process.argv[2];
const outDir = process.argv[3];
const times = (process.argv[4] || '').split(',').filter(Boolean).map(Number);
const port = 9401;
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const proc = spawn(chrome, ['--headless=new','--remote-debugging-port='+port,'--user-data-dir=C:\\Users\\cx330\\AppData\\Local\\Temp\\dsh-chrome-vid','--window-size=1600,900','--mute-audio','--autoplay-policy=no-user-gesture-required','--use-angle=d3d11'], { stdio: ['ignore','ignore','ignore'] });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

class CDP {
  constructor(ws){this.ws=ws;this.id=0;this.p=new Map();}
  static async connect(u){const ws=new WebSocket(u);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});const c=new CDP(ws);ws.onmessage=(e)=>{const m=JSON.parse(e.data);if(m.id&&c.p.has(m.id)){const{res,rej}=c.p.get(m.id);c.p.delete(m.id);m.error?rej(new Error(JSON.stringify(m.error))):res(m.result);}};return c;}
  send(method,params={},sid){const id=++this.id;const pl={id,method,params};if(sid)pl.sessionId=sid;this.ws.send(JSON.stringify(pl));return new Promise((res,rej)=>this.p.set(id,{res,rej}));}
}

const main = async () => {
  let wsUrl;
  for (let i=0;i<60;i++){ try{const r=await fetch('http://127.0.0.1:'+port+'/json/version'); wsUrl=(await r.json()).webSocketDebuggerUrl; break;}catch{await sleep(200);} }
  const cdp = await CDP.connect(wsUrl);
  const {targetId} = await cdp.send('Target.createTarget',{url:'about:blank'});
  const {sessionId} = await cdp.send('Target.attachToTarget',{targetId,flatten:true});
  const S = (m,p)=>cdp.send(m,p,sessionId);
  await S('Runtime.enable');
  await S('Page.navigate',{url});
  await sleep(6000);

  const info = await S('Runtime.evaluate',{returnByValue:true, expression:`(()=>{const vs=[...document.querySelectorAll('video')];return JSON.stringify(vs.map(v=>({src:v.currentSrc||v.src, dur:v.duration, w:v.videoWidth, h:v.videoHeight})))})()`});
  console.log('VIDEOS', info.result.value);

  await mkdir(outDir,{recursive:true});
  const multi = times.length > 1;
  for (const t of times) {
    const shot = await S('Runtime.evaluate',{returnByValue:true, awaitPromise:true, expression:`(async()=>{const v=[...document.querySelectorAll('video')][0]; if(!v) return 'NONE'; v.pause(); v.currentTime=${t}; await new Promise(r=>{const done=()=>{v.removeEventListener('seeked',done); r();}; v.addEventListener('seeked',done); setTimeout(r,1500);}); await new Promise(r=>setTimeout(r,420)); const c=document.createElement('canvas'); c.width=v.videoWidth||1280; c.height=v.videoHeight||720; c.getContext('2d').drawImage(v,0,0,c.width,c.height); return c.toDataURL('image/png');})()`});
    const val = shot.result.value;
    if (!val || val === 'NONE') { console.log('no video at', t); continue; }
    const b64 = String(val).split(',')[1];
    const f = outDir + '/t' + String(t).padStart(4,'0') + '.png';
    await writeFile(f, Buffer.from(b64,'base64'));
    console.log('SAVED', f);
  }
  proc.kill(); process.exit(0);
};
main().catch(e=>{console.error('FAIL',e); proc.kill(); process.exit(1);});