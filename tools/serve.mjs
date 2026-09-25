#!/usr/bin/env node
// Minimal static dev server that mirrors Cloudflare's clean-URL handling:
//   /            -> index.html
//   /products    -> products.html (or products/index.html)
//   /x.html      -> served as-is
//   missing      -> 404.html (status 404)
// Usage: node tools/serve.mjs [port]   (default 8792)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.argv[2] || process.env.PORT || 8792);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.mp4': 'video/mp4' };

function resolve(urlPath) {
  let p = decodeURIComponent(urlPath.split('?')[0]);
  if (p.includes('..')) return null;
  if (p.endsWith('/')) p += 'index.html';
  const candidates = [p, p + '.html', p + '/index.html'];
  for (const c of candidates) {
    const f = path.join(root, c);
    if (fs.existsSync(f) && fs.statSync(f).isFile()) return f;
  }
  return null;
}

const redirects = fs.existsSync(path.join(root, '_redirects'))
  ? fs.readFileSync(path.join(root, '_redirects'), 'utf8').split('\n').map((l) => l.trim().split(/\s+/)).filter((p) => p.length >= 2 && !p[0].startsWith('#'))
  : [];

http.createServer((req, res) => {
  // honour Cloudflare-style _redirects (exact paths only) so local behaviour matches production
  const rule = redirects.find((r) => r[0] === req.url.split('?')[0]);
  if (rule) { res.writeHead(Number(rule[2] || 301), { location: rule[1] }); res.end(); return; }
  // Local stand-in for the Cloudflare contact handler: accepts the enquiry and logs it (no email is sent).
  if (req.method === 'POST' && req.url.split('?')[0] === '/api/contact') {
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 1e6) req.destroy(); });
    req.on('end', () => {
      try { const data = JSON.parse(body); console.log('[contact] enquiry received (dev stub):', data.type, data.organisation, data.email); }
      catch { res.writeHead(400, { 'content-type': 'application/json' }); res.end('{"ok":false,"error":"Invalid JSON"}'); return; }
      res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      res.end('{"ok":true,"dev":true}');
    });
    return;
  }
  const file = resolve(req.url);
  if (!file) {
    const nf = path.join(root, '404.html');
    res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
    res.end(fs.existsSync(nf) ? fs.readFileSync(nf) : 'Not found');
    return;
  }
  const ext = path.extname(file).toLowerCase();
  const type = types[ext] || 'application/octet-stream';
  const compressible = /^(text\/|application\/(json|xml|manifest|javascript))|svg/.test(type);
  const gz = compressible && /\bgzip\b/.test(req.headers['accept-encoding'] || '');
  res.writeHead(200, { 'content-type': type, 'cache-control': ext === '.html' ? 'no-cache' : 'public, max-age=3600', ...(gz ? { 'content-encoding': 'gzip', vary: 'Accept-Encoding' } : {}) });
  const stream = fs.createReadStream(file);
  gz ? stream.pipe(zlib.createGzip({ level: 6 })).pipe(res) : stream.pipe(res);
}).listen(port, () => console.log(`Sterlington dev server → http://localhost:${port}`));
