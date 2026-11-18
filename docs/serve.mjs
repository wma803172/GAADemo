import { spawn } from "node:child_process";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)));
const port = 1818;
const address = "http://localhost:" + port + "/";
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".vtt": "text/vtt; charset=utf-8",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".mp4": "video/mp4",
};

function openBrowser() {
  const child = spawn("explorer.exe", [address], { windowsHide: true, detached: true, stdio: "ignore" });
  child.unref();
}

const server = createServer(async (req, res) => {
  const finish = (code, extra = {}) => {
    res.writeHead(code, extra);
    res.end();
  };
  if (!["GET", "HEAD"].includes(req.method)) return finish(405, { Allow: "GET, HEAD" });
  try {
    const url = new URL(req.url, address);
    const name = decodeURIComponent(url.pathname).slice(1) || "index.html";
    const file = resolve(root, name);
    const mime = types[extname(file).toLowerCase()];
    if (!file.startsWith(root + sep) || !mime) return finish(404);
    const info = await stat(file);
    if (!info.isFile()) return finish(404);
    const headers = { "Content-Type": mime, "Accept-Ranges": "bytes", "Cache-Control": "no-cache" };
    let start = 0,
      end = info.size - 1;
    if (req.headers.range) {
      const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
      const invalid = () => finish(416, { "Content-Range": "bytes */" + info.size });
      if (!range || (!range[1] && !range[2])) return invalid();
      if (range[1]) {
        start = Number(range[1]);
        if (range[2]) end = Math.min(end, Number(range[2]));
      } else {
        start = Math.max(0, info.size - Number(range[2]));
      }
      if (!Number.isSafeInteger(start) || start > end) return invalid();
      headers["Content-Range"] = "bytes " + start + "-" + end + "/" + info.size;
    }
    headers["Content-Length"] = end - start + 1;
    res.writeHead(req.headers.range ? 206 : 200, headers);
    if (req.method === "HEAD" || info.size === 0) return res.end();
    const source = createReadStream(file, { start, end });
    res.on("close", () => source.destroy());
    source.on("error", () => res.destroy());
    source.pipe(res);
  } catch (err) {
    finish(err.code === "ENOENT" ? 404 : 400);
  }
});

server.on("error", async (err) => {
  if (err.code === "EADDRINUSE" && process.argv.includes("--open")) {
    try {
      const page = await fetch(address, { signal: AbortSignal.timeout(2000) });
      if ((await page.text()).includes("Silicon Atlas")) return openBrowser();
    } catch {}
  }
  console.error(err.message);
  process.exitCode = 1;
});
server.listen(port, "127.0.0.1", () => {
  console.log(address);
  if (process.argv.includes("--open")) openBrowser();
});
