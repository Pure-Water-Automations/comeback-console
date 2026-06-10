// Minimal Node host for the COMEBACK console on the VPS (behind the Cloudflare
// tunnel). The vite build exports a web-standard fetch handler from
// dist/server/server.js; this wraps it in node:http and serves the hashed
// client assets from dist/client first. Zero dependencies — runs on the VPS's
// system Node (>=18 for global Request/Response). Binds loopback only; public
// reachability is via the tunnel + Cloudflare Access.

import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { Readable } from "node:stream";
// dist/ is resolved from the working directory (the systemd unit sets
// WorkingDirectory to the deploy root; locally run from the repo root).
const ROOT = process.cwd();
const CLIENT_DIR = join(ROOT, "dist", "client");
const PORT = Number(process.env.PORT) || 8794;

const { default: app } = await import(join(ROOT, "dist", "server", "server.js"));

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain",
  ".webmanifest": "application/manifest+json",
};

function tryStatic(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") return false;
  const pathname = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const safe = normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  const file = join(CLIENT_DIR, safe);
  if (!file.startsWith(CLIENT_DIR) || !existsSync(file) || !statSync(file).isFile()) return false;
  const hashed = /\/assets\//.test(safe);
  res.writeHead(200, {
    "content-type": MIME[extname(file).toLowerCase()] || "application/octet-stream",
    "cache-control": hashed ? "public, max-age=31536000, immutable" : "no-cache",
  });
  if (req.method === "HEAD") res.end();
  else createReadStream(file).pipe(res);
  return true;
}

const server = createServer(async (req, res) => {
  try {
    if (tryStatic(req, res)) return;
    const url = `http://${req.headers.host || "localhost"}${req.url}`;
    const body =
      req.method === "GET" || req.method === "HEAD"
        ? undefined
        : Readable.toWeb(req);
    const request = new Request(url, {
      method: req.method,
      headers: req.headers,
      body,
      duplex: body ? "half" : undefined,
    });
    const response = await app.fetch(request, {}, {});
    res.writeHead(response.status, Object.fromEntries(response.headers));
    if (response.body) Readable.fromWeb(response.body).pipe(res);
    else res.end();
  } catch (err) {
    console.error(err);
    res.writeHead(500, { "content-type": "text/plain" });
    res.end("internal error");
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`comeback console on 127.0.0.1:${PORT}`);
});
