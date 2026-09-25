#!/usr/bin/env node
// Crawl the built site for broken internal links and missing assets.
import fs from 'node:fs'; import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const pages = [...fs.readdirSync(ROOT).filter((f) => f.endsWith('.html')).map((f) => f), ...fs.readdirSync(path.join(ROOT, 'products')).map((f) => 'products/' + f)];
const exists = (p) => { const clean = p.split('#')[0].split('?')[0]; if (clean === '/' ) return true; const abs = path.join(ROOT, clean); return fs.existsSync(abs) || fs.existsSync(abs + '.html') || fs.existsSync(path.join(abs, 'index.html')); };
let bad = 0, total = 0;
for (const pg of pages) {
  const html = fs.readFileSync(path.join(ROOT, pg), 'utf8');
  const refs = [...html.matchAll(/(href|src|srcset)="([^"]+)"/g)].flatMap((m) => m[1] === 'srcset' ? m[2].split(',').map((s) => s.trim().split(' ')[0]) : [m[2]]);
  for (const r of refs) {
    if (!r || r.startsWith('http') || r.startsWith('mailto:') || r.startsWith('tel:') || r.startsWith('data:') || r.startsWith('#')) continue;
    total++;
    if (!exists(r)) { bad++; console.log(`BROKEN in ${pg}: ${r}`); }
  }
}
console.log(`${total} internal references checked, ${bad} broken`);
