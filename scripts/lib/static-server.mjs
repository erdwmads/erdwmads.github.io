// Serves the built site in dist/ on 127.0.0.1 for the browser tools (run-browser-tests.mjs, perf-probe.mjs and the
// standalone style snapshot). It always takes a free port, so several checkouts can run browser checks at the same
// time; callers pass the resulting URL to their tests as SITE_TEST_URL and TEST_BASE_URL. With { gzip: true } text
// responses are compressed the way GitHub Pages serves them, for transfer-size measurements.
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import zlib from "node:zlib";
import { root } from "./site-paths.mjs";

export const distDir = path.join(root, "dist");
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".ico": "image/x-icon", ".woff2": "font/woff2", ".glb": "model/gltf-binary", ".wasm": "application/wasm", ".xml": "application/xml", ".txt": "text/plain", ".pdf": "application/pdf" };
const compressible = /^(?:text\/|application\/(?:json|xml)|image\/svg)/;

export function distBuilt() {
  return fs.existsSync(path.join(distDir, "index.html"));
}

// Resolves to { url, close() }.
export async function serveDist({ gzip = false } = {}) {
  const server = http.createServer((request, response) => {
    let file = path.join(distDir, decodeURIComponent(new URL(request.url, "http://localhost").pathname));
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
    const found = file.startsWith(distDir) && fs.existsSync(file);
    if (!found) file = path.join(distDir, "404.html");
    const type = found ? types[path.extname(file).toLowerCase()] || "application/octet-stream" : types[".html"];
    const headers = { "content-type": type, "cache-control": "no-store" };
    const body = fs.existsSync(file) ? fs.readFileSync(file) : Buffer.from("Not found");
    if (gzip && compressible.test(type) && /\bgzip\b/.test(request.headers["accept-encoding"] || "")) {
      response.writeHead(found ? 200 : 404, { ...headers, "content-encoding": "gzip", vary: "Accept-Encoding" });
      response.end(zlib.gzipSync(body));
      return;
    }
    response.writeHead(found ? 200 : 404, headers);
    response.end(body);
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return { url: `http://127.0.0.1:${server.address().port}`, close: () => new Promise((resolve) => server.close(resolve)) };
}
