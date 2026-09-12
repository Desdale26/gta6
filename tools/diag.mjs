import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
const PORT = 8103;
const server = spawn(process.execPath, ['tools/serve.js'], { env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
await new Promise(r => setTimeout(r, 800));
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
p.on('console', m => { const t = m.text(); if (m.type() === 'error' || /\[(mark|boot|gen)\]/.test(t)) console.log(m.type().toUpperCase(), t.slice(0, 400)); });
p.on('pageerror', e => console.log('PAGEERROR', (e.stack || e.message).slice(0, 800)));
await p.goto(`http://localhost:${PORT}/index.html?smoke=1`, { waitUntil: 'domcontentloaded' });
const t0 = Date.now();
for (let i = 0; i < 40; i++) {
  await new Promise(r => setTimeout(r, 3000));
  const st = await p.evaluate(() => (window.__VC ? { ready: window.__VC.ready, ...window.__VC.bootStatus } : null)).catch(e => ({ err: String(e) }));
  console.log(`t=${((Date.now() - t0) / 1000).toFixed(0)}s`, JSON.stringify(st));
  if (st && st.ready) break;
}
const ready = await p.evaluate(() => window.__VC && window.__VC.ready).catch(() => false);
if (ready) {
  console.log('REPORT', JSON.stringify(await p.evaluate(() => window.__VC.report())));
}
await b.close(); server.kill();
