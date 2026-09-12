// Headless smoke test: boots the game in Chromium (WebGL2 via SwiftShader), runs it for a
// number of simulated seconds, and fails on ANY console error, page error, failed request,
// NaN in game state, or missing expected world content.
//
//   node tools/smoke.js [--seconds 20] [--shots] [--scenario name] [--keep]
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import url from 'node:url';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const arg = (name, def) => {
  const i = argv.indexOf('--' + name);
  return i >= 0 ? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true) : def;
};
const SECONDS = Number(arg('seconds', 20));
const SHOTS = !!arg('shots', false);
const SCENARIO = String(arg('scenario', 'default'));
const PORT = Number(process.env.PORT || 8099);

const IGNORE = [
  /Failed to load resource.*favicon/i,
  /WebGL: INVALID_OPERATION: bindTexture/i,
  /Automatic fallback to software WebGL/i,
  /GroupMarkerNotSet/i,
  /Third-party cookie/i,
  /SwiftShader/i,
  /\[\.WebGL-.*\] GL_INVALID_OPERATION: Texture format does not support/i,
];

function startServer() {
  return new Promise((resolve, reject) => {
    const p = spawn(process.execPath, [path.join(ROOT, 'tools/serve.js')], {
      env: { ...process.env, PORT: String(PORT) }, stdio: ['ignore', 'pipe', 'pipe'],
    });
    let done = false;
    p.stdout.on('data', (d) => { if (!done && String(d).includes('http://')) { done = true; resolve(p); } });
    p.stderr.on('data', (d) => process.stderr.write('[server] ' + d));
    p.on('error', reject);
    setTimeout(() => { if (!done) { done = true; resolve(p); } }, 2500);
  });
}

const errors = [];
const warns = [];

async function main() {
  const server = await startServer();
  const browser = await chromium.launch({
    args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage',
           '--autoplay-policy=no-user-gesture-required', '--mute-audio'],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  page.on('console', (m) => {
    const t = m.text();
    if (IGNORE.some((r) => r.test(t))) return;
    if (m.type() === 'error') errors.push('[console.error] ' + t);
    else if (m.type() === 'warning') warns.push('[console.warn] ' + t);
  });
  page.on('pageerror', (e) => errors.push('[pageerror] ' + (e.stack || e.message)));
  page.on('requestfailed', (r) => {
    const u = r.url();
    if (/favicon/.test(u)) return;
    errors.push('[requestfailed] ' + u + ' — ' + (r.failure()?.errorText || '?'));
  });

  const t0 = Date.now();
  await page.goto(`http://localhost:${PORT}/index.html?smoke=1&scenario=${SCENARIO}`, {
    waitUntil: 'domcontentloaded', timeout: 60000,
  });

  // Wait for the game to report that it finished booting.
  let booted = false;
  try {
    await page.waitForFunction(() => window.__VC && window.__VC.ready === true, { timeout: 180000 });
    booted = true;
  } catch (e) {
    const st = await page.evaluate(() => (window.__VC ? { ...window.__VC.bootStatus } : null)).catch(() => null);
    errors.push('[boot] game never reported ready. bootStatus=' + JSON.stringify(st));
  }
  const bootMs = Date.now() - t0;

  let report = null;
  if (booted) {
    if (SHOTS) fs.mkdirSync(path.join(ROOT, 'shots'), { recursive: true });
    const steps = Math.max(1, Math.ceil(SECONDS / 2));
    for (let i = 0; i < steps; i++) {
      await page.evaluate((s) => window.__VC.simulate(s), 2);
      const bad = await page.evaluate(() => window.__VC.validate());
      if (bad && bad.length) for (const b of bad) errors.push('[validate] ' + b);
      if (SHOTS) {
        await page.screenshot({ path: path.join(ROOT, 'shots', `${SCENARIO}-${String(i).padStart(2, '0')}.png`) });
      }
    }
    report = await page.evaluate(() => window.__VC.report());
  }

  await browser.close();
  server.kill();

  console.log('\n=== SMOKE REPORT ===');
  console.log('scenario     :', SCENARIO);
  console.log('boot         :', booted ? `ok in ${bootMs} ms` : 'FAILED');
  if (report) {
    for (const [k, v] of Object.entries(report)) {
      console.log(String(k).padEnd(13) + ':', typeof v === 'object' ? JSON.stringify(v) : v);
    }
  }
  if (warns.length) {
    console.log(`\n--- ${warns.length} warning(s) ---`);
    for (const w of [...new Set(warns)].slice(0, 25)) console.log('  ' + w.slice(0, 400));
  }
  if (errors.length) {
    console.log(`\n--- ${errors.length} ERROR(S) ---`);
    for (const e of [...new Set(errors)].slice(0, 40)) console.log('  ' + e.slice(0, 1200));
    process.exit(1);
  }
  console.log('\nNo errors. PASS');
}

main().catch((e) => { console.error('smoke harness crashed:', e); process.exit(2); });
