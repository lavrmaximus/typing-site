// Minimal static file server with the same lookup rules as deploy/nginx.conf:
// $uri, $uri.html, $uri/index.html, else 404.html with status 404. Used by e2e tests.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const root = process.argv[2] ?? "out";
const port = Number(process.argv[3] ?? 3100);
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".woff2": "font/woff2", ".ico": "image/x-icon", ".svg": "image/svg+xml", ".txt": "text/plain" };

async function file(p) {
  try { return (await stat(p)).isFile() ? p : null; } catch { return null; }
}

createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^(\.\.[/\\])+/, "");
  const base = join(root, path);
  const hit = (await file(base)) ?? (await file(base + ".html")) ?? (await file(join(base, "index.html")));
  const target = hit ?? join(root, "404.html");
  res.writeHead(hit ? 200 : 404, { "content-type": TYPES[extname(target)] ?? "application/octet-stream" });
  res.end(await readFile(target));
}).listen(port, () => console.log(`serving ${root} on http://localhost:${port}`));
