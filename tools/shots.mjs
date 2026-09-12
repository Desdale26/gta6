// Capture screenshots at several times of day and camera setups.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
const PORT = 8104;
const server = spawn(process.execPath, ['tools/serve.js'], { env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
await new Promise(r => setTimeout(r, 800));
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 1024, height: 576 } });
const errs = [];
p.on('pageerror', e => errs.push(String(e.message)));
p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
await p.goto(`http://localhost:${PORT}/index.html?smoke=1`, { waitUntil: 'domcontentloaded' });
await p.waitForFunction(() => window.__VC && window.__VC.ready, { timeout: 180000 });
// Bump quality for the screenshots so they show the real look.
await p.evaluate(() => {
  const c = window.__VC.ctx;
  c.settings.data.quality = 'medium';
  c.settings.data.autoQuality = false;
  c.game.applyQuality();
});
fs.mkdirSync('shots', { recursive: true });
const shots = JSON.parse(process.argv[2] || '[]');
for (const s of shots) {
  await p.evaluate((cfg) => {
    const c = window.__VC.ctx;
    if (cfg.hour !== undefined) c.time.hour = cfg.hour;
    if (cfg.weather) c.weather.setWeather(cfg.weather, true);
    if (cfg.pos) {
      const g = c.physics.groundHeight(cfg.pos[0], cfg.pos[1]);
      c.player.spawn(cfg.pos[0], g + 0.3, cfg.pos[1], cfg.yaw || 0);
    }
    if (cfg.camMode) c.cameraRig.setMode(cfg.camMode);
    if (cfg.car) {
      if (c.player.vehicle) c.player.exitVehicle(true);
      const v = c.traffic.spawnAt(cfg.car, c.player.position.x + 3, c.player.position.z + 3, cfg.yaw || 0, { ai: false });
      if (v) c.player.enterVehicle(v, 0);
    }
    c.sky.refreshEnvironment();
  }, s);
  await p.evaluate((n) => window.__VC.simulate(n, 1), s.settle ?? 1.2);
  await p.screenshot({ path: `shots/${s.name}.png` });
  console.log('shot', s.name);
}
console.log('errors:', errs.length ? [...new Set(errs)].slice(0, 6).join(' | ') : 'none');
await b.close(); server.kill();
