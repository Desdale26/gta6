/*
 * tools/smoke.mjs — optional developer check. NOT needed to play.
 *
 * Boots the game from its file:// URL in headless Chromium (the engine
 * inside Microsoft Edge), fails on any console error or page error, then
 * plays a short scripted session and asserts that what should happen does:
 * the city builds, New Game starts, W moves Jay the way the camera faces,
 * walls stop him, sprint is faster than running, jumping leaves the ground,
 * crates can be climbed, low walls vaulted, the camera doesn't end up
 * inside a building, pause/resume work and settings apply, and a bot can
 * finish both challenges.
 *
 *   node vicehaven/tools/smoke.mjs              (uses the global Playwright)
 *   SHOTS=1 node vicehaven/tools/smoke.mjs      (also writes screenshots to /tmp/vicehaven-shots)
 *   TARGET=dist node vicehaven/tools/smoke.mjs  (tests dist/vicehaven.html instead; run tools/bundle.mjs first)
 */
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
let playwright;
try {
  playwright = require('playwright');
} catch {
  const root = execSync('npm root -g').toString().trim();
  playwright = require(path.join(root, 'playwright'));
}

const here = path.dirname(fileURLToPath(import.meta.url));
const targetFile = process.env.TARGET === 'dist' ? path.join(here, '..', 'dist', 'vicehaven.html') : path.join(here, '..', 'index.html');
if (!fs.existsSync(targetFile)) {
  console.log('[smoke] ' + targetFile + ' does not exist' + (process.env.TARGET === 'dist' ? ' (run node vicehaven/tools/bundle.mjs first)' : ''));
  process.exit(1);
}
const indexUrl = pathToFileURL(targetFile).href;
const shotsDir = process.env.SHOTS_DIR || '/tmp/vicehaven-shots';
const takeShots = !!process.env.SHOTS;
if (takeShots) fs.mkdirSync(shotsDir, { recursive: true });

const problems = [];
const log = (...a) => console.log('[smoke]', ...a);
const fail = (msg) => {
  problems.push(msg);
  console.log('[smoke] FAIL:', msg);
};
const check = (cond, msg) => (cond ? log('ok  -', msg) : fail(msg));

const browser = await playwright.chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--allow-file-access-from-files'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
// Start from default settings with the High preset (software rendering would otherwise auto-pick Low).
await page.addInitScript(() => { try { localStorage.removeItem('vicehaven.settings.v1'); localStorage.setItem('vicehaven.settings.v1', JSON.stringify({ graphics: { quality: 'high', renderScale: 1, maxPixelRatio: 1.25, shadows: 'high', drawDistance: 950, antialias: true, propDensity: 1, effects: 'high', fov: 65, showFps: true } })); } catch (e) {} });
page.on('console', (m) => {
  const t = m.type();
  const text = m.text();
  if (t === 'error') fail('console error: ' + text);
  else if (t === 'warning' && !/GPU stall|WebGL-|Automatic fallback to software WebGL|swiftshader|ReadPixels/i.test(text)) log('warning:', text);
  else if (t === 'info' && /Vicehaven/.test(text)) log(text);
});
page.on('pageerror', (e) => fail('page error: ' + e.message + '\n' + (e.stack || '')));
page.on('requestfailed', (r) => fail('request failed: ' + r.url() + ' ' + (r.failure() && r.failure().errorText)));

const shot = async (name) => {
  if (!takeShots) return;
  await page.screenshot({ path: path.join(shotsDir, name + '.png') });
  log('screenshot', name);
};
const game = (fn, arg) => page.evaluate(fn, arg);
const wait = (ms) => page.waitForTimeout(ms);

log('opening', indexUrl);
const t0 = Date.now();
await page.goto(indexUrl);
await page.waitForFunction(() => window.VH && VH.game && VH.game.state === 'title', null, { timeout: 240000 });
log('title screen after', ((Date.now() - t0) / 1000).toFixed(1), 's');
const fatal = await page.evaluate(() => document.getElementById('fatal').classList.contains('visible'));
check(!fatal, 'no fatal error overlay');

const world = await game(() => ({ ...VH.game.world.stats, chunks: VH.game.world.chunks.size }));
log('world', JSON.stringify(world));
check(world.buildings > 300, 'city has hundreds of buildings (' + world.buildings + ')');
check(world.tallest > 200, 'Vicehaven Tower is tall (' + world.tallest.toFixed(0) + ' m)');
check(world.colliders > 2000, 'colliders registered (' + world.colliders + ')');
await game(() => VH.game.freeze(true));
if (takeShots) {
  await wait(700); // let the loading screen finish fading out
  await game(() => VH.game.renderOnce());
  await shot('01-title');
}

// ------------------------------------------------------------ new game
// From here the real loop is frozen and the test drives time itself, so
// the checks behave the same on a fast GPU or a software renderer.
const advance = (sec) => game((s) => VH.game.advance(s), sec);
const render = () => game(() => VH.game.renderOnce());
const advanceUntil = async (cond, maxSec) => {
  for (let t = 0; t < maxSec; t += 0.05) {
    await advance(0.05);
    if (await page.evaluate(cond)) return true;
  }
  return false;
};
const hold = async (keys, sec) => {
  for (const k of keys) await page.keyboard.down(k);
  await advance(sec);
  for (const k of keys) await page.keyboard.up(k);
};
const tap = async (key, after = 0.1) => {
  await page.keyboard.press(key);
  await advance(after);
};
const shotNow = async (name) => {
  if (!takeShots) return;
  await render();
  await shot(name);
};

// The story's first job starts by itself after New Game; the movement checks need a quiet city.
await game(() => { VH.game.noAutoStory = true; });
await page.click('#screen-title button:has-text("New Game")');
await advance(2.5);
check((await game(() => VH.game.state)) === 'playing', 'New Game reaches gameplay after the intro');
await shotNow('02-spawn');

const pos = () => game(() => ({ x: VH.game.player.pos.x, y: VH.game.player.pos.y, z: VH.game.player.pos.z, state: VH.game.player.state, speed: VH.game.player.speed, grounded: VH.game.player.grounded }));
const start = await pos();
log('spawn', JSON.stringify(start));

// Walk forward (camera faces north = -Z).
await page.keyboard.down('KeyW');
await advance(1.5);
const walked = await pos();
await page.keyboard.up('KeyW');
check(walked.z < start.z - 4, 'W moves Jay forward, away from the camera (dz ' + (walked.z - start.z).toFixed(2) + ')');
check(Math.abs(walked.x - start.x) < 0.5, 'W does not drift sideways (dx ' + (walked.x - start.x).toFixed(2) + ')');
check(walked.speed > 4.2 && walked.speed < 5.0, 'run speed ~4.6 m/s (' + walked.speed.toFixed(2) + ')');
await advance(0.6);
check((await pos()).speed < 0.05, 'Jay decelerates to a stop when W is released');

// D moves to the right of the screen: camera faces -Z, so right is -X.
const beforeD = await pos();
await hold(['KeyD'], 0.7);
const afterD = await pos();
// Facing north (-Z), the right of the screen is east (+X).
check(afterD.x > beforeD.x + 1.5, 'D moves to the right of the screen (dx ' + (afterD.x - beforeD.x).toFixed(2) + ')');
await advance(0.6);

// Mouse look turns the camera, and W follows the camera.
await game(() => { VH.game.cameraRig.yaw = Math.PI / 2; }); // facing east (+X)
const beforeE = await pos();
await hold(['KeyW'], 0.8);
const afterE = await pos();
check(afterE.x > beforeE.x + 2 && Math.abs(afterE.z - beforeE.z) < 0.5, 'W follows the camera when it turns (dx ' + (afterE.x - beforeE.x).toFixed(2) + ')');
await game(() => { VH.game.cameraRig.yaw = Math.PI; });
await advance(0.6);

// Sprint is faster, and speed builds up rather than snapping.
await page.keyboard.down('KeyW');
await page.keyboard.down('ShiftLeft');
await advance(0.1);
const early = await pos();
await advance(1.5);
const sprint = await pos();
await page.keyboard.up('ShiftLeft');
await page.keyboard.up('KeyW');
check(sprint.speed > 7.0, 'sprint reaches > 7 m/s (' + sprint.speed.toFixed(2) + ')');
check(early.speed < sprint.speed * 0.6, 'movement accelerates (' + early.speed.toFixed(2) + ' → ' + sprint.speed.toFixed(2) + ')');
await advance(0.8);

// Jump.
const pre = await pos();
await tap('Space', 0.2);
const air = await pos();
check(!air.grounded && air.y > pre.y + 0.5, 'Space jumps (y +' + (air.y - pre.y).toFixed(2) + ')');
await advance(1.0);
const landed = await pos();
check(landed.grounded && Math.abs(landed.y - pre.y) < 0.05, 'lands again after a jump');

// Kerbs: walking off the plaza onto the road steps down, back up steps up.
await game(() => {
  const plaza = VH.game.layout.plazaBlock;
  VH.game.player.teleport(plaza.cx, plaza.maxZ - 2, 0);
  VH.game.cameraRig.yaw = 0;
});
await hold(['KeyW'], 1.2);
const onRoad = await pos();
check(onRoad.y < 0.05, 'steps down the kerb onto the road (y ' + onRoad.y.toFixed(2) + ')');
await game(() => { VH.game.cameraRig.yaw = Math.PI; });
await hold(['KeyW'], 1.2);
const backUp = await pos();
check(Math.abs(backUp.y - 0.15) < 0.02, 'steps up the kerb without jumping (y ' + backUp.y.toFixed(2) + ')');

// Collision with a building: walk north into a downtown block across Meridian Boulevard.
await game(() => {
  const L = VH.game.layout;
  const b = L.blocks.find((bl) => bl.bx === 2 && bl.bz === 3);
  const lot = b.lots.find((l) => l.kind === 'building' && l.front.s && l.maxX - l.minX > 10);
  VH.game.player.teleport(lot.cx, b.maxZ - 1.5, Math.PI);
  VH.game.cameraRig.yaw = Math.PI;
  window.__lot = lot;
});
await hold(['KeyW'], 2.0);
const blocked = await game(() => {
  const p = VH.game.player.pos;
  const inside = VH.game.physics.overlaps(p.x, p.z, 0.25, p.y + 0.5, p.y + 1.5);
  return { z: p.z, maxZ: window.__lot.maxZ, inside };
});
check(!blocked.inside && blocked.z > blocked.maxZ - 0.2 && blocked.z < blocked.maxZ + 1.0, 'buildings are solid (stopped at z ' + blocked.z.toFixed(2) + ', lot edge ' + blocked.maxZ.toFixed(2) + ')');
// Sliding: pushing diagonally into the wall still moves along it.
await game(() => { VH.game.cameraRig.yaw = Math.PI + 0.6; });
const beforeSlide = await pos();
await hold(['KeyW'], 0.8);
const afterSlide = await pos();
check(Math.abs(afterSlide.x - beforeSlide.x) > 1, 'slides along walls instead of sticking (dx ' + (afterSlide.x - beforeSlide.x).toFixed(2) + ')');

// Camera collision: point the camera so it would end up inside the building behind Jay.
await game(() => {
  const lot = window.__lot;
  VH.game.player.teleport(lot.cx, lot.maxZ + 0.6, 0);
  VH.game.cameraRig.yaw = 0;
  VH.game.cameraRig.pitch = -0.1;
});
await advance(0.5);
const camInfo = await game(() => {
  const c = VH.game.renderer.camera.position;
  const inside = VH.game.physics.overlaps(c.x, c.z, 0.05, c.y - 0.05, c.y + 0.05, VH.COLLIDE.CAMERA);
  return { inside, dist: VH.game.cameraRig.curDist, z: c.z, wall: window.__lot.maxZ };
});
check(!camInfo.inside && camInfo.dist < 3, 'camera pulls in and stays out of walls (arm ' + camInfo.dist.toFixed(2) + ' m)');
await shotNow('04-camera-wall');

// Plaza geometry for the movement tests.
const P = await game(() => {
  const plaza = VH.game.layout.plazaBlock;
  const ix0 = plaza.minX + 4, ix1 = plaza.maxX - 4, iz0 = plaza.minZ + 4;
  const cx = (ix0 + ix1) / 2;
  return { ix0, ix1, iz0, cx, px0: cx + 8 };
});

// Climb onto the 1.0 m crate.
await game((P) => {
  VH.game.player.teleport(P.px0 + 1.9 + 0.9, P.iz0 + 3 + 1.8 + 1.0, Math.PI);
  VH.game.cameraRig.yaw = Math.PI;
}, P);
await page.keyboard.down('KeyW');
await advance(0.25);
await page.keyboard.press('Space');
await advanceUntil(() => VH.game.player.state === 'ground' && VH.game.player.pos.y > 1, 2);
await page.keyboard.up('KeyW');
await advance(0.3);
const onCrate = await pos();
check(Math.abs(onCrate.y - 1.15) < 0.05, 'climbs onto a 1 m crate (y ' + onCrate.y.toFixed(2) + ')');
await shotNow('05-climb');

// The 2.0 m crate can't be climbed from the ground directly, but a jump reaches its edge.
await game((P) => {
  VH.game.player.teleport(P.px0 + 3 * 1.9 + 0.9, P.iz0 + 3 + 1.8 + 1.0, Math.PI);
  VH.game.cameraRig.yaw = Math.PI;
}, P);
await page.keyboard.down('KeyW');
await advance(0.2);
await page.keyboard.press('Space');
await advanceUntil(() => VH.game.player.state === 'ground' && VH.game.player.pos.y > 2, 2.5);
await page.keyboard.up('KeyW');
await advance(0.3);
const onTall = await pos();
check(Math.abs(onTall.y - 2.15) < 0.05, 'jump + ledge grab gets onto the 2 m crate (y ' + onTall.y.toFixed(2) + ')');

// Vault: run at the 0.6 m wall.
await game((P) => {
  VH.game.player.teleport(P.px0 + 3, P.iz0 + 12 + 3.2, Math.PI);
  VH.game.cameraRig.yaw = Math.PI;
  VH.game.player.stats.vaults = 0;
}, P);
await page.keyboard.down('KeyW');
await advance(0.45);
await page.keyboard.press('Space');
await advance(1.0);
await page.keyboard.up('KeyW');
const afterVault = await pos();
const vaults = await game(() => VH.game.player.stats.vaults);
check(afterVault.z < P.iz0 + 12 - 0.5 && vaults === 1, 'vaults a low wall (z ' + afterVault.z.toFixed(2) + ' past wall at ' + (P.iz0 + 12).toFixed(2) + ', vaults ' + vaults + ')');

// The tall 3.4 m wall can't be climbed from the ground.
await game((P) => {
  const wallX0 = P.px0 + 4 * 1.9;
  VH.game.player.teleport(wallX0 + 1.1, P.iz0 + 3 + 1.8 + 1.2 + 1.0, Math.PI);
  VH.game.cameraRig.yaw = Math.PI;
}, P);
await page.keyboard.down('KeyW');
await advance(0.3);
await page.keyboard.press('Space');
await advance(1.3);
await page.keyboard.up('KeyW');
const atWall = await pos();
check(atWall.y < 0.3, 'the 3.4 m wall is too tall to climb from the ground (y ' + atWall.y.toFixed(2) + ')');

// Stairs to the terrace.
await game((P) => {
  VH.game.player.teleport(P.ix0 + 7, P.iz0 + 16 + 5, Math.PI);
  VH.game.cameraRig.yaw = Math.PI;
}, P);
await hold(['KeyW'], 2.0);
const onTerrace = await pos();
check(Math.abs(onTerrace.y - 2.55) < 0.05, 'walks up the stairs onto the terrace (y ' + onTerrace.y.toFixed(2) + ')');

// Ramp down from the terrace.
await game((P) => {
  VH.game.player.teleport(P.ix0 + 15, P.iz0 + 5, -Math.PI / 2, 3);
  VH.game.cameraRig.yaw = -Math.PI / 2 + Math.PI; // face +X, towards the ramp
}, P);
await game(() => { VH.game.cameraRig.yaw = Math.PI / 2; });
await hold(['KeyW'], 4.5);
const offRamp = await pos();
check(offRamp.x > P.ix0 + 32 && Math.abs(offRamp.y - 0.15) < 0.05 && offRamp.grounded, 'walks down the ramp to the plaza (x ' + offRamp.x.toFixed(1) + ', y ' + offRamp.y.toFixed(2) + ')');

// Crouch toggles, and crouching is slower.
await tap('KeyC', 0.3);
check(await game(() => VH.game.player.crouched), 'C toggles crouch on');
await hold(['KeyW'], 1.0);
const crouchSpeed = (await pos()).speed;
check(crouchSpeed > 1.5 && crouchSpeed < 2.3, 'crouch-walk is slow (' + crouchSpeed.toFixed(2) + ' m/s)');
await tap('KeyC', 0.3);
check(!(await game(() => VH.game.player.crouched)), 'C toggles crouch off');

// Camera modes.
await tap('KeyV');
check((await game(() => VH.game.cameraRig.mode.id)) === 'far', 'V switches to the far camera');
await tap('KeyV');
check((await game(() => VH.game.cameraRig.mode.id)) === 'first', 'V reaches first person');
await advance(0.5);
await shotNow('06-first-person');
await tap('KeyV');
check((await game(() => VH.game.cameraRig.mode.id)) === 'near', 'V cycles back to the close camera');

// Vending machine.
const money0 = await game(() => VH.game.player.money);
await game(() => {
  const vend = VH.game.world.interactables.find((i) => i.kind === 'vending');
  VH.game.player.teleport(vend.x, vend.z, 0, 0.2);
  VH.game.player.heading = 0;
  VH.game.player.prevHeading = 0;
  VH.game.player.health = 60;
});
await advance(0.3);
const prompt = await page.evaluate(() => document.querySelector('.hud-prompt').classList.contains('visible'));
check(prompt, 'interaction prompt appears near the vending machine');
await tap('KeyE', 0.3);
const money1 = await game(() => ({ money: VH.game.player.money, health: VH.game.player.health }));
check(money1.money === money0 - 2 && money1.health > 60, 'vending machine: -$2 and +health (' + money0 + ' → ' + money1.money + ', hp ' + money1.health + ')');

// Kiosk dialog.
await game(() => {
  const k = VH.game.world.interactables.find((i) => i.kind === 'kiosk');
  VH.game.player.teleport(k.x, k.z + (k.z > 0 ? 0 : 0), 0, 0.2);
  window.__k = k;
});
await game(() => { const k = window.__k; const P = VH.game.player; P.heading = P.prevHeading = Math.atan2(0, -(k.z - P.pos.z) || 1); });
await advance(0.2);
await tap('KeyE', 0.3);
const dialogOpen = await game(() => VH.game.ui.dialogOpen && VH.game.state === 'dialog');
check(dialogOpen, 'E at the kiosk opens the city guide');
await shotNow('07-city-guide');
await tap('KeyE', 0.2);
check(await game(() => !VH.game.ui.dialogOpen && VH.game.state === 'playing'), 'E closes the city guide');

// Fall damage and knock-out.
await game(() => {
  const P = VH.game.player;
  P.teleport(-51, 60, Math.PI);
  P.pos.y = 14; P.prevPos.y = 14; P.grounded = false; P.state = 'air'; P._fallStartY = 14; P.health = 100;
});
await advance(1.5);
const hp = await game(() => VH.game.player.health);
check(hp < 100 && hp > 0, 'a 14 m fall hurts (health ' + hp.toFixed(0) + ')');
await game(() => {
  const P = VH.game.player;
  P.pos.y = 40; P.prevPos.y = 40; P.grounded = false; P.state = 'air'; P._fallStartY = 40;
});
await advance(3);
check(await game(() => VH.game.player.isDead), 'a 40 m fall knocks Jay out');
await advance(6);
check(await game(() => !VH.game.player.isDead && VH.game.player.health === 100), 'Jay comes to after being knocked out');

// Pause and settings.
await game(() => VH.game.pause());
check((await game(() => VH.game.state)) === 'paused', 'pause menu opens');
await game(() => VH.game.freeze(false));
await wait(300);
await game(() => VH.game.freeze(true));
await shotNow('08-pause');
await game(() => VH.game.ui.show('settings', true));
await wait(400);
await shot('09-settings');
await game(() => VH.settings.applyPreset('low'));
const low = await game(() => ({ shadows: VH.game.renderer.renderer.shadowMap.enabled, pr: VH.game.renderer.renderer.getPixelRatio() }));
check(!low.shadows && low.pr <= 0.76, 'Low preset turns shadows off and lowers resolution');
await game(() => VH.settings.applyPreset('high'));
const high = await game(() => ({ shadows: VH.game.renderer.renderer.shadowMap.enabled }));
check(high.shadows, 'High preset turns shadows back on');
await game(() => VH.game.ui.back());
await game(() => VH.game.resume());
check((await game(() => VH.game.state)) === 'playing', 'resume returns to play');

// Rebinding a key changes the controls.
await game(() => VH.settings.setBinding('jump', 0, 'KeyJ'));
const pre2 = await pos();
await tap('KeyJ', 0.2);
check((await pos()).y > pre2.y + 0.3, 'a rebound key (J for jump) works');
await game(() => VH.settings.resetBindings());
await advance(1);

// Debug overlay.
await tap('F8', 0.3);
check(await game(() => VH.game.debug.visible), 'F8 opens the developer overlay');
await game(() => VH.game.debug.run('tp pier'));
await advance(0.3);
check(await game(() => VH.game.player.pos.x > 424 && VH.game.player.pos.y > 0.1), 'tp pier puts Jay on the pier deck');
await shotNow('10-pier-debug');
await game(() => VH.game.debug.run('time 21.5'));
await game(() => VH.game.world.setNightFactor(VH.game.environment.shared.uWindowGlow.value));
await advance(2.2);
await shotNow('11-night');
await game(() => VH.game.debug.run('time 16.6'));
await game(() => VH.game.world.setNightFactor(VH.game.environment.shared.uWindowGlow.value));
await tap('F8', 0.1);

// ------------------------------------------------------------ challenges
// A bot plays each challenge: it steers at the next checkpoint (via optional
// waypoints around buildings), sprints, and jumps at gaps and ledges.
const botRun = (id, waypoints) => game(({ id, waypoints }) => {
  const g = VH.game, inp = g.input, P = g.player, ph = g.physics;
  g.challenges._closeResults();
  g.challenges.start(id);
  g.advance(3.5);
  const log = [];
  inp.codesDown.add('KeyW');
  inp.codesDown.add('ShiftLeft');
  let wpi = 0, lastIndex = -1, stuck = 0, last = { x: P.pos.x, z: P.pos.z };
  for (let step = 0; step < 60 * 240; step++) {
    const run = g.challenges.run;
    if (!run) break;
    if (run.index !== lastIndex) { lastIndex = run.index; wpi = 0; }
    const cp = run.def.checkpoints[run.index];
    const wps = (waypoints && waypoints[run.index]) || [];
    while (wpi < wps.length && Math.hypot(wps[wpi][0] - P.pos.x, wps[wpi][1] - P.pos.z) < (wps[wpi][2] || 2)) wpi++;
    const target = wpi < wps.length ? { x: wps[wpi][0], z: wps[wpi][1] } : cp;
    const yaw = Math.atan2(target.x - P.pos.x, target.z - P.pos.z);
    g.cameraRig.yaw = yaw;
    const dx = Math.sin(yaw), dz = Math.cos(yaw), feet = P.pos.y;
    if (P.grounded && P.state === 'ground') {
      const near = ph.groundHeight(P.pos.x + dx * 0.9, P.pos.z + dz * 0.9, feet + 0.3);
      const far = ph.groundHeight(P.pos.x + dx * 3.2, P.pos.z + dz * 3.2, feet + 0.3);
      const ledge = ph.groundHeight(P.pos.x + dx * 0.75, P.pos.z + dz * 0.75, feet + 1.8);
      if ((near < feet - 0.6 && far > feet - 0.4) || ledge > feet + 0.44) inp._queuePress('jump');
    }
    g.advance(1 / 60);
    if (step % 60 === 0) {
      if (Math.hypot(P.pos.x - last.x, P.pos.z - last.z) < 0.3 && ++stuck > 5) { log.push('stuck at ' + P.pos.x.toFixed(1) + ',' + P.pos.z.toFixed(1)); break; }
      if (Math.hypot(P.pos.x - last.x, P.pos.z - last.z) >= 0.3) stuck = 0;
      last = { x: P.pos.x, z: P.pos.z };
    }
  }
  inp.codesDown.clear();
  const res = g.challenges.results;
  return { log, view: res ? g.challenges._resultView(res.data) : null, failed: res ? res.data.failed : null, record: g.challenges.records[id] || null };
}, { id, waypoints });

const course = await game(() => VH.game.world.courses && VH.game.world.courses.yard_run ? VH.game.world.courses.yard_run.checkpoints.length : 0);
check(course === 10, 'Meridian Yard builds the Yard Run course (' + course + ' checkpoints)');
await game(() => { localStorage.removeItem('vicehaven.records.v1'); VH.game.challenges.records = {}; });
const money2 = await game(() => VH.game.player.money);
const yard = await botRun('yard_run', { 6: [[-153.5, 52, 0.5], [-151, 52, 0.5]] });
check(yard.view && !yard.failed && yard.view.medal === 'gold', 'a clean Yard Run finishes with gold (' + (yard.view ? yard.view.main : yard.log.join(' ')) + ')');
check(yard.record && yard.record.ghost && yard.record.ghost.length > 100, 'the best run is recorded for the ghost (' + (yard.record && yard.record.ghost ? yard.record.ghost.length : 0) + ' samples)');
check((await game(() => VH.game.player.money)) === money2 + 500, 'gold pays the $500 reward once');
// Second attempt: the ghost runs alongside.
await game(() => { VH.game.challenges._closeResults(); VH.game.challenges.start('yard_run'); VH.game.advance(3.5); });
await hold(['KeyW'], 1.5);
check(await game(() => VH.game.challenges.ghost.root.visible), 'the ghost of your best run appears on a retry');
// Falling off the course sends you back to the last checkpoint with a penalty.
const slip = await game(() => {
  const g = VH.game;
  const run = g.challenges.run;
  run.index = 6; // heading for the frame, across the beam
  const t0 = run.time;
  g.player.teleport(-146, 52, Math.PI / 2, 9.3);
  g.player.pos.x = -146; g.player.pos.y = 5; g.player.grounded = false; g.player.state = 'air';
  g.advance(0.2);
  return { falls: run.falls, dt: run.time - t0, y: g.player.pos.y, z: g.player.pos.z };
});
check(slip.falls === 1 && slip.dt > 2.9 && slip.y > 9, 'slipping off the beam returns you to the checkpoint with +3 s (y ' + slip.y.toFixed(2) + ')');
await game(() => VH.game.pause());
check(await game(() => document.querySelector('#screen-pause .btn-warn').style.display !== 'none'), 'the pause menu offers "Abandon challenge" during a run');
await game(() => VH.game.ui.actions.abandonChallenge());
check(await game(() => !VH.game.challenges.active && VH.game.state === 'playing'), 'abandoning ends the run and resumes play');

const courier = await botRun('courier_rush', {
  0: [[-70, 70], [-79, 36]], 1: [[-66, 18], [-54, 18], [-46, 16.9]], 2: [[-20, 0], [-5, -20], [-5, -36.4]],
  3: [[-5, -96], [59, -99]], 4: [[88, -104]], 6: [[100, -5], [284, -5]], 7: [[292, -5], [380, -5], [400, 0]],
});
check(courier.view && !courier.failed && courier.view.medal, 'Courier Rush can be finished in time (' + (courier.view ? courier.view.main + ', ' + courier.view.title : courier.log.join(' ')) + ')');
const outOfTime = await game(() => {
  const g = VH.game;
  g.challenges._closeResults();
  g.challenges.start('courier_rush');
  g.advance(3.5);
  g.challenges.run.remaining = 0.4;
  g.advance(1);
  const r = g.challenges.results;
  return r ? { failed: r.data.failed, reason: r.data.reason } : null;
});
check(outOfTime && outOfTime.failed && outOfTime.reason === 'Out of time', 'running out of the clock fails the Courier Rush');
await game(() => VH.game.challenges._closeResults());
await shotNow('19-challenge-results');

// Sound and post-processing.
const steps = await game(() => {
  let n = 0;
  const off = VH.events.on('player:step', () => n++);
  VH.game.player.teleport(-51, 60, Math.PI);
  VH.game.input.codesDown.add('KeyW');
  VH.game.advance(2);
  VH.game.input.codesDown.clear();
  off();
  return { n, audio: !!VH.game.audio.ctx };
});
check(steps.audio && steps.n >= 3, 'the audio engine is running and footsteps fire while walking (' + steps.n + ' in 2 s)');
check(await game(() => VH.game.renderer.postEnabled), 'post-processing (bloom and grading) is on at High');
await game(() => VH.settings.set('graphics.effects', 'low'));
check(!(await game(() => VH.game.renderer.postEnabled)), 'Effects Off renders directly without post-processing');
await game(() => VH.settings.set('graphics.effects', 'high'));
await advance(0.5);

// A look around town.
if (takeShots) {
  const views = [
    ['12-grand-avenue', 6, 70, Math.PI, -0.02],
    ['13-old-market', -300, -193, Math.PI / 2, 0.08],
    ['14-palm-crescent', -150, 250, 0, 0],
    ['15-boardwalk', 410, 60, Math.PI, -0.05],
    ['16-park', -240, 150, Math.PI / 2 + 0.3, -0.1],
    ['17-tower', 51, -95, Math.PI, 0.45],
    ['18-plaza-course', -40, 50, Math.PI, -0.25],
    ['20-meridian-yard', -96, 34, -Math.PI / 2 - 0.35, 0.18],
  ];
  for (const [name, x, z, yaw, pitch] of views) {
    await game(([x, z, yaw, pitch]) => {
      VH.game.player.teleport(x, z, yaw);
      VH.game.cameraRig.yaw = yaw;
      VH.game.cameraRig.pitch = pitch;
    }, [x, z, yaw, pitch]);
    await advance(0.5);
    await shotNow(name);
  }
}

// ---------------------------------------------------------------- the full game
// Driving: a car beside Jay, F to get in, W to drive.
const drive = await game(() => {
  const g = VH.game;
  g.player.teleport(-51, 86, Math.PI / 2);
  const v = g.vehicles.spawn('vireo', -51, 90.6, -Math.PI / 2, { persistent: true });
  g.advance(0.2);
  const t = g.vehicles.findEnterable(g.player.pos.x, g.player.pos.z, 5);
  if (t) g.vehicles.beginEnter(t);
  g.advance(2);
  return { inCar: g.player.vehicle === v, name: v.name };
});
check(drive.inCar, 'F gets Jay into a car (' + drive.name + ')');
await page.keyboard.down('KeyW');
await advance(2);
const carSpeed = await game(() => (VH.game.player.vehicle ? VH.game.player.vehicle.speed : 0));
await page.keyboard.up('KeyW');
check(carSpeed > 8, 'W accelerates the car (' + carSpeed.toFixed(1) + ' m/s after 2 s)');
await tap('KeyF', 2.5);
check(await game(() => !VH.game.player.inVehicle), 'F gets Jay out again');
await advance(3);
const life = await game(() => ({ traffic: VH.game.vehicles.list.filter((v) => v.role === 'traffic').length, peds: VH.game.crowd.agents.length }));
check(life.traffic >= 5, 'traffic drives the streets (' + life.traffic + ' cars)');
check(life.peds >= 10, 'pedestrians walk the city (' + life.peds + ')');

// Combat: a pistol, an enemy, three shots.
const fight = await game(() => {
  const g = VH.game;
  g.combat.giveWeapon('pistol', 60, true);
  const p = g.player;
  const e = g.combat.spawnEnemy(p.pos.x + Math.sin(p.heading) * 9, p.pos.z + Math.cos(p.heading) * 9, { faction: 'halberd', weapon: 'pistol', alert: false, hostile: true, look: g.missions.factionLook('halberd', 0), health: 100 });
  for (let i = 0; i < 6 && !e.dead; i++) e.damage(40, 'player', 'bullet');
  return { weapon: g.combat.current, dead: e.dead, weapons: VH.Data.weapons.length };
});
check(fight.weapons >= 11, 'eleven weapons are defined (' + fight.weapons + ')');
check(fight.dead, 'enemies can be taken down');
// Police: heat 2 brings patrol cars.
await game(() => { VH.game.police.setLevel(2, 'test'); VH.game.police._sawPlayer(); });
await advance(4);
const cops = await game(() => ({ level: VH.game.police.level, units: VH.game.police.units ? VH.game.police.units.length : 0 }));
check(cops.level === 2 && cops.units >= 1, 'heat 2 sends police (' + cops.units + ' units)');
await game(() => VH.game.police.reset());

// The story: all four acts load, and a job runs.
const story = await game(() => {
  const g = VH.game;
  const all = Array.from(g.missions.all.values());
  return { main: all.filter((m) => m._main).length, side: all.filter((m) => m._chain).length, jobs: all.filter((m) => m.activity).length, first: g.missions.nextMain ? g.missions.nextMain.id : null };
});
check(story.main >= 31, 'the main story has 31 jobs (' + story.main + ')');
check(story.side >= 16, 'four side stories of four jobs (' + story.side + ')');
check(story.jobs >= 35, 'races, the list, bounties and turf wars are registered (' + story.jobs + ')');
await game(() => { const g = VH.game; g.missions.start(g.missions.all.get('m01_homecoming')); });
await page.waitForTimeout(300);
await advance(1);
const m1 = await game(() => ({ run: VH.game.missions.run ? VH.game.missions.run.m.id : null, talking: VH.game.dialogue.active }));
check(m1.run === 'm01_homecoming' && m1.talking, 'Homecoming starts and its cold open plays');
await game(() => { const g = VH.game; g.missions._failNow(g.missions.run, 'test'); g.dialogue.stop(); });
await advance(0.5);
// Saving: a passed job survives a save and a load.
const saved = await game(() => {
  const g = VH.game;
  g.missions.completed.m01_homecoming = true;
  g.missions.flags.kept_cut = true;
  g.missions.save();
  g.missions.completed = {};
  g.missions.flags = {};
  g.missions.load(VH.MissionEngine.loadSave());
  return { done: !!g.missions.completed.m01_homecoming, flag: !!g.missions.flags.kept_cut };
});
check(saved.done && saved.flag, 'a save keeps finished jobs and choices');

const perf = await game(() => ({ fps: VH.game.fps, ...VH.game.renderer.stats() }));
log('renderer (software rendering here, not representative of a GPU):', JSON.stringify(perf));
check(perf.calls < 1400, 'draw calls under budget (' + perf.calls + ')');

await browser.close();
if (problems.length) {
  console.log('\n[smoke] ' + problems.length + ' problem(s):');
  for (const p of problems) console.log('  - ' + p);
  process.exit(1);
}
console.log('\n[smoke] all checks passed');
