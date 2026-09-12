// scenarios.mjs — drives the real game through gameplay situations in a headless browser
// and fails on any console error, page error, NaN, or broken invariant.
//
//   node tools/scenarios.mjs            run every scenario
//   node tools/scenarios.mjs drive rob  run only those
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
import fs from 'node:fs';

const PORT = Number(process.env.PORT || 8106);
const ONLY = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const SHOTS = process.argv.includes('--shots');

const IGNORE = [
  /GPU stall due to ReadPixels/i, /SwiftShader/i, /Automatic fallback/i,
  /GL_INVALID_OPERATION: Texture format does not support/i,
];

// Each scenario: { name, setup (runs in page), seconds, assert (runs in page, returns string[]) }
const SCENARIOS = [
  {
    name: 'idle',
    seconds: 8,
    setup: () => {},
    assert: (c) => {
      const bad = [];
      if (c.peds.count < 3) bad.push(`only ${c.peds.count} pedestrians spawned`);
      if (c.traffic.count < 3) bad.push(`only ${c.traffic.count} traffic vehicles spawned`);
      if (c.player.health < 100) bad.push('player lost health while standing still');
      return bad;
    },
  },
  {
    name: 'walk',
    seconds: 8,
    setup: (c) => { window.__VC.hold(['KeyW', 'ShiftLeft']); },
    assert: (c) => {
      const bad = [];
      if (c.player.distanceWalked < 10) bad.push(`walked only ${c.player.distanceWalked.toFixed(1)} m while holding W`);
      if (!Number.isFinite(c.player.position.y)) bad.push('player Y not finite');
      if (c.player.position.y < -20) bad.push('player fell through the world');
      return bad;
    },
    teardown: () => window.__VC.release(),
  },
  {
    name: 'drive',
    seconds: 14,
    setup: (c) => {
      const v = c.traffic.spawnAt('', c.player.position.x + 4, c.player.position.z + 4, 0, { ai: false })
        || c.traffic.spawnAt(c.__anyCar, c.player.position.x + 4, c.player.position.z + 4, 0, { ai: false });
      if (v) c.player.enterVehicle(v, 0);
      window.__VC.hold(['KeyW']);
    },
    assert: (c) => {
      const bad = [];
      if (!c.player.inVehicle) { bad.push('player is not in a vehicle'); return bad; }
      const sim = c.player.vehicle.sim;
      if (c.player.distanceDriven < 25) bad.push(`drove only ${c.player.distanceDriven.toFixed(1)} m at full throttle`);
      if (sim.speed > 120) bad.push(`vehicle reached ${sim.speed.toFixed(0)} m/s`);
      if (!Number.isFinite(sim.position.y)) bad.push('vehicle Y not finite');
      if (sim.position.y < -20) bad.push('vehicle fell through the world');
      if (sim.engineRpm < sim.def.engine.idleRpm * 0.8) bad.push('engine rpm below idle under throttle');
      // `wheelsOnGround === 0` is not the same as flying: a car that has rammed
      // a building and is left leaning nose-up against it has no wheel contact
      // either, and that is a crash, not a physics failure. What would be a
      // failure is a car well above where it could ever rest.
      const restY = c.physics.groundHeight(sim.position.x, sim.position.z) + sim.rideHeight;
      if (sim.airTime > 2.5 && sim.position.y > restY + 2.5) {
        bad.push(`flying: ${(sim.position.y - restY).toFixed(1)} m up after ${sim.airTime.toFixed(1)}s airborne`);
      }
      // Holding W for fourteen seconds can end in a building. A car that hits one
      // at 20 m/s, spins, and trips over its own tyres has rolled for real
      // reasons; a car that ends up inverted having hit nothing has not.
      if (sim.up.y < 0.2 && sim.health > sim.maxHealth * 0.92) {
        bad.push('car ended up on its roof without a scratch on it');
      }
      return bad;
    },
    teardown: () => window.__VC.release(),
  },
  {
    name: 'brake-and-reverse',
    seconds: 8,
    setup: (c) => {
      const v = c.traffic.nearestVehicle(c.player.position.x, c.player.position.z, 60)
        || c.traffic.spawnAt(c.__anyCar, c.player.position.x + 4, c.player.position.z + 4, 0, { ai: false });
      if (v && !c.player.inVehicle) c.player.enterVehicle(v, 0);
      window.__VC.hold(['KeyS']);
    },
    assert: (c) => {
      const bad = [];
      if (!c.player.inVehicle) return ['player is not in a vehicle'];
      const sim = c.player.vehicle.sim;
      if (sim.gear !== -1 && sim.forwardSpeed > -0.5) bad.push(`holding S did not engage reverse (gear ${sim.gear}, fwd ${sim.forwardSpeed.toFixed(2)})`);
      return bad;
    },
    teardown: () => window.__VC.release(),
  },
  {
    name: 'shoot',
    seconds: 6,
    setup: (c) => {
      if (c.player.inVehicle) c.player.exitVehicle(true);
      c.player.weapons.add('assault-rifle', 300);
      c.player.weapons.select('assault-rifle');
      c.input.mouse.right = true;
      c.input.mouse.left = true;
    },
    assert: (c) => {
      const bad = [];
      const s = c.player.weapons.slots.get('assault-rifle');
      if (!s) return ['assault rifle was not added'];
      if (s.ammoInMag + s.reserve >= 300 + s.def.magazine) bad.push('no ammo was consumed while firing');
      if (c.player.weapons.lastShotTime < 0) bad.push('no shot was ever registered');
      if (!Number.isFinite(c.player.weapons.recoil.x + c.player.weapons.recoil.y)) bad.push('recoil went non-finite');
      return bad;
    },
    teardown: (c) => { c.input.mouse.left = false; c.input.mouse.right = false; },
  },
  {
    name: 'explosions',
    seconds: 8,
    setup: (c) => {
      if (c.player.inVehicle) c.player.exitVehicle(true);
      const p = c.player.position;
      for (let i = 0; i < 6; i++) {
        c.combat.explode(p.x + (i - 3) * 9, p.y + 1, p.z + 12, { radius: 10, damage: 150, force: 18000 });
      }
      c.player.weapons.add('rpg', 10);
      c.player.weapons.select('rpg');
    },
    assert: (c) => {
      const bad = [];
      if (c.combat.projectiles.length > 160) bad.push('projectile pool overflowed');
      for (const v of c.traffic.all()) {
        if (!Number.isFinite(v.sim.position.x + v.sim.position.y + v.sim.position.z)) { bad.push('a vehicle went non-finite after an explosion'); break; }
      }
      for (const ped of c.peds.peds) {
        const b = ped.body.position;
        if (!Number.isFinite(b.x + b.y + b.z)) { bad.push('a pedestrian went non-finite after an explosion'); break; }
      }
      return bad;
    },
  },
  {
    name: 'wanted',
    seconds: 18,
    setup: (c) => { c.police.setStars(4); },
    assert: (c) => {
      const bad = [];
      if (c.police.stars < 1) bad.push('wanted level vanished immediately');
      if (c.police.units.length === 0 && c.police.officers.length === 0) bad.push('no police responded at 4 stars');
      for (const u of c.police.units) {
        if (!Number.isFinite(u.sim.position.x)) { bad.push('a police vehicle went non-finite'); break; }
      }
      return bad;
    },
    teardown: (c) => c.police.clear(),
  },
  {
    name: 'rob',
    seconds: 26,
    setup: (c) => {
      // A till-only shop finishes inside the scenario budget.
      const shop = c.world.shops.find((s) => s.typeDef.robbery.possible && s.typeDef.robbery.safeCash[1] === 0)
        || c.world.shops[0];
      window.__scenarioShop = shop;
      c.player.spawn(shop.x, c.physics.groundHeight(shop.x, shop.z) + 0.3, shop.z, 0);
      c.player.weapons.add('combat-pistol', 100);
      c.player.weapons.select('combat-pistol');
      c.shops.startRobbery(shop);
    },
    assert: (c) => {
      const bad = [];
      if (c.shops.robbery) bad.push(`robbery never finished (state ${c.shops.robbery.state}, t=${c.shops.robbery.timer.toFixed(1)})`);
      if (!c.economy.ledger.some((l) => /Robbery/.test(l.reason))) bad.push('robbery paid out nothing');
      return bad;
    },
    teardown: (c) => { c.shops.cancelRobbery(); c.police.clear(); },
  },
  {
    name: 'mission',
    seconds: 16,
    setup: (c) => {
      const m = c.missions.available.find((x) => x.type === 'story') || c.missions.available[0];
      window.__scenarioMission = m.id;
      c.player.spawn(m.start.x, c.physics.groundHeight(m.start.x, m.start.z) + 0.3, m.start.z, 0);
      c.missions.start(m.id);
    },
    assert: (c) => {
      const bad = [];
      if (!c.missions.active && !c.missions.completed.size) bad.push('mission neither running nor completed');
      if (c.missions.active && !c.missions.hudState()) bad.push('active mission has no HUD state');
      return bad;
    },
    teardown: (c) => { if (c.missions.active) c.missions.abandon(); },
  },
  {
    name: 'stunt',
    seconds: 14,
    setup: (c) => {
      const spot = c.world.stuntSpots.find((s) => s.def.kind === 'megaramp') || c.world.stuntSpots[0];
      const yaw = spot.def.yaw || 0;
      const bx = spot.x - Math.sin(yaw) * 70;
      const bz = spot.z - Math.cos(yaw) * 70;
      const v = c.traffic.spawnAt(c.__fastCar, bx, bz, yaw, { ai: false });
      if (v) { c.player.enterVehicle(v, 0); }
      window.__VC.hold(['KeyW']);
    },
    assert: (c) => {
      const bad = [];
      if (!c.player.inVehicle) return ['not in the stunt vehicle'];
      if (!Number.isFinite(c.stunts.totalScore)) bad.push('stunt score went non-finite');
      if (c.stunts.combo.length > 40) bad.push('combo list grew unbounded');
      return bad;
    },
    teardown: () => window.__VC.release(),
  },
  {
    name: 'water',
    seconds: 10,
    setup: (c) => {
      if (c.player.inVehicle) c.player.exitVehicle(true);
      c.player.spawn(1260, 2, 0, 0);
      window.__VC.hold(['KeyW']);
    },
    assert: (c) => {
      const bad = [];
      if (!Number.isFinite(c.player.position.y)) bad.push('player Y non-finite in water');
      if (c.player.position.y < -30) bad.push('player sank through the sea bed');
      return bad;
    },
    teardown: () => window.__VC.release(),
  },
  {
    name: 'menus',
    seconds: 4,
    setup: (c) => {
      c.menus.openPause();
      c.menus.menuPage = 'settings';
      c.menus._renderPause();
      for (let i = 0; i < 12; i++) { c.menus.menuIndex = i; c.menus._renderPause(); }
      c.menus._close();
      c.menus.openMap();
      c.menus._drawMap();
      c.menus._close();
      c.menus.openPhone();
      for (const app of ['missions', 'radio', 'stats']) { c.menus.phoneApp = app; c.menus._renderPhone(); }
      c.menus._close();
      c.player.weapons.add('pump-shotgun', 40);
      c.player.weapons.add('smg', 90);
      c.menus.openWheel();
      c.menus._drawWheel();
      c.menus._confirmWheel();
      c.menus.openShop();
    },
    assert: (c) => {
      const bad = [];
      if (c.menus.open !== null && c.menus.open !== 'shop') bad.push(`menu stuck open: ${c.menus.open}`);
      return bad;
    },
    teardown: (c) => { if (c.menus.open) c.menus._close(); },
  },
  {
    name: 'death-respawn',
    seconds: 12,
    setup: (c) => { c.player.kill({ source: 'test' }); },
    assert: (c) => {
      const bad = [];
      if (c.player.dead) bad.push('player never respawned');
      if (c.player.health <= 0) bad.push('player respawned with no health');
      if (!Number.isFinite(c.player.position.x)) bad.push('respawn position not finite');
      return bad;
    },
  },
  {
    name: 'weather-storm',
    seconds: 8,
    setup: (c) => { c.weather.setWeather('storm', true); c.time.hour = 15; },
    assert: (c) => {
      const bad = [];
      if (c.weather.rain < 0.4) bad.push('storm produced no rain');
      if (c.weather.wetness < 0.3) bad.push('roads never got wet in a storm');
      return bad;
    },
    teardown: (c) => c.weather.setWeather('fair', true),
  },
  {
    name: 'day-cycle',
    seconds: 10,
    setup: (c) => { c.game.timeScale = 1; c.__fastClock = true; },
    assert: (c) => {
      const bad = [];
      if (!Number.isFinite(c.sky.sunDir.y)) bad.push('sun direction went non-finite');
      if (!c.sky.envRT) bad.push('environment probe was never built');
      return bad;
    },
  },
  {
    // A thunderstorm once dimmed the scene three separate times over — cloud,
    // storm and exposure each cutting the same light — and left two in the
    // afternoon darker than midnight. Nothing else in the suite noticed,
    // because an unplayably dark frame throws no errors.
    name: 'lighting-levels',
    seconds: 2,
    setup: (c) => { c.__lightProbe = null; },
    assert: (c) => {
      const bad = [];
      const hourWas = c.time.hour, weatherWas = c.weather.type;
      const measure = (hour, weather) => {
        c.time.hour = hour;
        c.weather.setWeather(weather, true);
        c.sky.update(0.016, hour, c.weather);
        c.weather.update(0.016, hour);
        return {
          key: c.sky.sun.intensity,
          fill: c.sky.hemi.intensity + c.sky.moon.intensity,
          exposure: c.renderer.grade.uExposure.value,
        };
      };
      for (const w of ['clear', 'fair', 'overcast', 'drizzle', 'rain', 'storm', 'fog']) {
        const m = measure(13, w);
        // Daylight: whatever the sky is doing, you can see the road.
        const lit = m.key + m.fill * 1.6;
        if (lit < 1.2) bad.push(`${w} at midday is too dark to play (key ${m.key.toFixed(2)}, fill ${m.fill.toFixed(2)})`);
        if (m.key > 6 || m.fill > 4) bad.push(`${w} at midday is blown out (key ${m.key.toFixed(2)}, fill ${m.fill.toFixed(2)})`);
      }
      for (const w of ['clear', 'rain']) {
        const m = measure(23, w);
        // Night is dark, not black: unlit back streets still need a floor.
        if (m.fill < 0.75) bad.push(`${w} at night has no ambient floor (fill ${m.fill.toFixed(2)})`);
        if (m.fill > 1.6) bad.push(`${w} at night is washed out (fill ${m.fill.toFixed(2)})`);
      }
      c.time.hour = hourWas;
      c.weather.setWeather(weatherWas, true);
      return bad;
    },
  },
];

function startServer() {
  return new Promise((resolve) => {
    const p = spawn(process.execPath, ['tools/serve.js'], {
      env: { ...process.env, PORT: String(PORT) }, stdio: ['ignore', 'pipe', 'pipe'],
    });
    let done = false;
    p.stdout.on('data', (d) => { if (!done && String(d).includes('http://')) { done = true; resolve(p); } });
    setTimeout(() => { if (!done) { done = true; resolve(p); } }, 2500);
  });
}

const results = [];
let errors = [];

async function main() {
  const server = await startServer();
  const browser = await chromium.launch({
    args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage', '--mute-audio'],
  });
  const page = await browser.newPage({ viewport: { width: 800, height: 450 } });
  page.on('console', (m) => {
    const t = m.text();
    if (m.type() !== 'error' || IGNORE.some((r) => r.test(t))) return;
    errors.push('[console] ' + t.slice(0, 400));
  });
  page.on('pageerror', (e) => errors.push('[pageerror] ' + (e.stack || e.message).slice(0, 600)));

  await page.goto(`http://localhost:${PORT}/index.html?smoke=1`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.__VC && window.__VC.ready, { timeout: 240000 });

  // Pick a couple of representative vehicles once.
  await page.evaluate(async () => {
    const m = await import('/src/content/vehicleCatalog.js');
    const c = window.__VC.ctx;
    c.__anyCar = m.VEHICLES.find((v) => v.cls === 'sedan')?.id || m.VEHICLES[0].id;
    c.__fastCar = m.VEHICLES.find((v) => v.cls === 'super' || v.cls === 'sports')?.id || c.__anyCar;
  });

  if (SHOTS) fs.mkdirSync('shots', { recursive: true });

  for (const s of SCENARIOS) {
    if (ONLY.length && !ONLY.includes(s.name)) continue;
    const errBefore = errors.length;
    const t0 = Date.now();
    try {
      await page.evaluate(`(${s.setup.toString()})(window.__VC.ctx)`);
      const chunk = 2;
      let bad = [];
      for (let t = 0; t < s.seconds; t += chunk) {
        await page.evaluate((n) => window.__VC.simulate(n, 10), chunk);
        const v = await page.evaluate(() => window.__VC.validate());
        if (v && v.length) bad.push(...v);
      }
      const asserted = await page.evaluate(`(${s.assert.toString()})(window.__VC.ctx)`);
      bad.push(...(asserted || []));
      if (s.teardown) await page.evaluate(`(${s.teardown.toString()})(window.__VC.ctx)`);
      if (SHOTS) await page.screenshot({ path: `shots/sc-${s.name}.png` });
      const scenarioErrors = errors.slice(errBefore);
      results.push({ name: s.name, ms: Date.now() - t0, bad: [...new Set(bad)], errors: [...new Set(scenarioErrors)] });
    } catch (e) {
      results.push({ name: s.name, ms: Date.now() - t0, bad: ['scenario threw: ' + String(e).slice(0, 300)], errors: [] });
    }
    process.stdout.write(`· ${s.name}\n`);
  }

  const report = await page.evaluate(() => window.__VC.report());
  await browser.close();
  server.kill();

  console.log('\n=== SCENARIO REPORT ===');
  let failures = 0;
  for (const r of results) {
    const issues = r.bad.length + r.errors.length;
    if (issues) failures++;
    console.log(`\n${issues ? 'FAIL' : 'ok  '}  ${r.name.padEnd(18)} ${(r.ms / 1000).toFixed(1)}s`);
    for (const b of r.bad.slice(0, 8)) console.log('        ! ' + b.slice(0, 300));
    for (const e of r.errors.slice(0, 6)) console.log('        × ' + e.slice(0, 300));
  }
  console.log('\nfinal state:', JSON.stringify(report));
  console.log(failures ? `\n${failures}/${results.length} scenarios have issues` : `\nall ${results.length} scenarios clean`);
  process.exit(failures ? 1 : 0);
}

main().catch((e) => { console.error('harness crashed', e); process.exit(2); });
