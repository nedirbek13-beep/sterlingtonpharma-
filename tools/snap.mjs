#!/usr/bin/env node
/**
 * Full-page screenshots with real device emulation via the Chrome DevTools Protocol.
 *   node tools/snap.mjs <outDir> <url> <width>x<height>[@scale][:mobile] [name]
 * Example: node tools/snap.mjs shots http://localhost:8792/?snap 375x812@2:mobile home-375
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const [outDir, url, size, nameArg] = process.argv.slice(2);
if (!outDir || !url || !size) { console.error('usage: snap.mjs <outDir> <url> <WxH[@scale][:mobile]> [name]'); process.exit(1); }
const m = size.match(/^(\d+)x(\d+)(?:@([\d.]+))?(?::(mobile))?$/);
const width = +m[1], height = +m[2], scale = +(m[3] || 1), mobile = !!m[4];
const name = nameArg || `${new URL(url).pathname.replace(/\W+/g, '-').replace(/^-|-$/g, '') || 'home'}-${width}`;
fs.mkdirSync(outDir, { recursive: true });
const port = 9222 + Math.floor(Math.random() * 500);
const profile = fs.mkdtempSync(path.join(process.env.TMPDIR || '/tmp', 'snap-'));
const chrome = spawn(CHROME, [`--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', `--window-size=${Math.max(500, width)},${Math.max(500, height)}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitPort() { for (let i = 0; i < 60; i++) { try { const r = await fetch(`http://127.0.0.1:${port}/json/version`); if (r.ok) return r.json(); } catch {} await sleep(150); } throw new Error('chrome did not start'); }
const killer = setTimeout(() => { console.error('snap: timed out'); chrome.kill('SIGKILL'); process.exit(2); }, 90000);
try {
  await waitPort();
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pending = new Map(); const events = [];
  ws.onmessage = (ev) => { const msg = JSON.parse(ev.data); if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); } else if (msg.method) events.push(msg.method); };
  const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile, screenWidth: width, screenHeight: height });
  if (mobile) await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  if (process.env.SNAP_RM === '1') await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await send('Page.navigate', { url });
  for (let i = 0; i < 100 && !events.includes('Page.loadEventFired'); i++) await sleep(100);
  await sleep(1200); // fonts, entrance animations
  const { result } = (await send('Runtime.evaluate', { expression: 'JSON.stringify({h: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight), w: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth})', returnByValue: true })).result;
  const dims = JSON.parse(result.value);
  const full = process.env.SNAP_FULL !== '0';
  const clipH = full ? dims.h : height;
  await send('Emulation.setDeviceMetricsOverride', { width, height: clipH, deviceScaleFactor: scale, mobile, screenWidth: width, screenHeight: clipH });
  await sleep(300);
  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width, height: clipH, scale: 1 } });
  const file = path.join(outDir, `${name}.png`);
  fs.writeFileSync(file, Buffer.from(shot.result.data, 'base64'));
  console.log(`${file} ${width}x${clipH}@${scale} scrollWidth=${dims.w} clientWidth=${dims.cw}${dims.w > dims.cw ? '  ⚠ HORIZONTAL OVERFLOW' : ''}`);
  ws.close(); clearTimeout(killer);
} finally {
  chrome.kill('SIGKILL');
  fs.rmSync(profile, { recursive: true, force: true });
}
