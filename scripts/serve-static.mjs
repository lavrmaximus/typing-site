// Minimal static file server with the same lookup rules as deploy/nginx.conf:
// $uri, $uri.html, $uri/index.html, else 404.html with status 404; /api/* is
// proxied to API_URL (like nginx's proxy_pass). Used by e2e tests and `npm start`.
import { createServer, request } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const root = process.argv[2] ?? "out";
const port = Number(process.argv[3] ?? 3100);
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".woff2": "font/woff2", ".ico": "image/x-icon", ".svg": "image/svg+xml", ".txt": "text/plain" };

async function file(p) {
  try { return (await stat(p)).isFile() ? p : null; } catch { return null; }
}

const api = process.env.API_URL ? new URL(process.env.API_URL) : null;

function proxy(req, res) {
  const up = request({ host: api.hostname, port: api.port, path: req.url, method: req.method, headers: req.headers }, (r) => {
    res.writeHead(r.statusCode ?? 502, r.headers);
    r.pipe(res);
  });
  up.on("error", () => { res.writeHead(502); res.end("api unavailable"); });
  req.pipe(up);
}

createServer(async (req, res) => {
  if (req.url.startsWith("/api/")) {
    if (api) return proxy(req, res);
    res.writeHead(404); return res.end();
  }
  const path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^(\.\.[/\\])+/, "");
  const base = join(root, path);
  const hit = (await file(base)) ?? (await file(base + ".html")) ?? (await file(join(base, "index.html")));
  const target = hit ?? join(root, "404.html");
  res.writeHead(hit ? 200 : 404, { "content-type": TYPES[extname(target)] ?? "application/octet-stream" });
  res.end(await readFile(target));
}).listen(port, () => console.log(`serving ${root} on http://localhost:${port}`));
