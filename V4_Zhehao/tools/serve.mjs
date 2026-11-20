import http from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const positional = process.argv.slice(2).filter((arg) => arg !== '--open');
const root = resolve(positional[0] ?? fileURLToPath(new URL('..', import.meta.url)));
const port = Number(positional[1] ?? 8124);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    let p = decodeURIComponent(url.pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = normalize(join(root, p));
    if (!file.startsWith(root)) { res.writeHead(403).end('forbidden'); return; }
    const s = await stat(file);
    if (!s.isFile()) { res.writeHead(404).end('not found'); return; }
    const body = await readFile(file);
    res.writeHead(200, {
      'Content-Type': types[extname(file).toLowerCase()] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
});

server.on('error', (err) => {
  console.error(err.code === 'EADDRINUSE' ? `端口 ${port} 已被占用。请关闭占用该端口的服务，或双击 V4_Zhehao 中的 index.html。` : err.message);
  process.exitCode = 1;
});

server.listen(port, '127.0.0.1', () => {
  const url = 'http://127.0.0.1:' + server.address().port + '/';
  console.log('serving ' + root + ' at ' + url);
  if (!process.argv.includes('--open')) return;
  const windows = process.platform === 'win32';
  const command = windows ? 'rundll32.exe' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  const opener = spawn(command, windows ? ['url.dll,FileProtocolHandler', url] : [url], { detached: true, stdio: 'ignore' });
  opener.on('error', () => console.error('请在浏览器中打开 ' + url));
  opener.unref();
});
