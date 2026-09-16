// verify-driving.mjs — can a PLAYER get into a car and drive it?
//
// This check exists because nothing else asked. The scenario suite has a 'drive'
// scenario and it passes, but it seats the player by calling
// `ctx.player.enterVehicle(v, 0)` directly (tools/scenarios.mjs, in drive.setup)
// and then holds W. So the physics was covered, the sim was covered, and the one
// thing every player does in the first thirty seconds — walk up to a car, press
// the key, drive away — was covered by nothing at all. "The cars don't work" was
// reported against a build where every check was green.
//
// Everything here goes through the real input edge (`window.__VC.press`, which
// sets the same keysDownEdge the browser's keydown handler does) and the real
// game loop. Nothing calls enterVehicle, and nothing writes to the sim.
//
//   node tools/verify-driving.mjs [path/to/vice-coast.html]
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import path from 'node:path';
import url from 'node:url';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const FILE = path.resolve(process.argv[2] || path.join(ROOT, 'vice-coast.html'));

const problems = [];
const note = (s) => console.log(s);

const browser = await chromium.launch({
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage',
         '--autoplay-policy=no-user-gesture-required', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 1024, height: 576 } });
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e.message).slice(0, 200)));
await page.goto(url.pathToFileURL(FILE).href, { waitUntil: 'load', timeout: 120000 });
try {
  await page.waitForFunction(() => window.__VC && window.__VC.ready === true, null,
    { timeout: 300000, polling: 500 });
} catch (e) {
  console.log('did not boot: ' + e.message);
  await browser.close();
  process.exit(1);
}

const out = await page.evaluate(() => {
  const ctx = window.__VC.ctx;
  const R = {};

  // Let the world populate first. Traffic and parked cars stream in around the
  // player over the first few seconds; counting at the instant `ready` flips
  // measures the streamer's first tick, not the city a player walks out into.
  R.atBoot = ctx.traffic.all().filter((v) => !v.dead && !v.sim.exploded).length;
  window.__VC.simulate(10);
  R.after10s = ctx.traffic.all().filter((v) => !v.dead && !v.sim.exploded).length;

  // What the bindings actually say, rather than what anyone remembers.
  const b = ctx.input.bindings || ctx.input.binds || {};
  R.enterKeys = (b.enter || []).slice();
  R.interactKeys = (b.interact || []).slice();

  // --- is there a car to get into at all? ---
  const p = ctx.player.body.position;
  const dists = [];
  for (const v of ctx.traffic.all()) {
    if (v.dead || v.sim.exploded) continue;
    dists.push(Math.hypot(v.sim.position.x - p.x, v.sim.position.z - p.z));
  }
  dists.sort((a, c) => a - c);
  R.vehiclesAlive = dists.length;
  R.nearest = dists.length ? +dists[0].toFixed(1) : null;
  R.within25 = dists.filter((d) => d <= 25).length;
  const still = [];
  for (const v of ctx.traffic.all()) {
    if (v.dead || v.sim.exploded || v.sim.speed > 0.5) continue;
    still.push(Math.hypot(v.sim.position.x - p.x, v.sim.position.z - p.z));
  }
  still.sort((a, c) => a - c);
  R.nearestStill = still.length ? +still[0].toFixed(1) : null;
  R.stillWithin25 = still.filter((d) => d <= 25).length;
  R.reachableAtSpawn = !!ctx.player.findNearbyVehicle();

  // --- walk to the nearest car using the real movement keys ---
  // Face it, hold W, and let the game move the player. If walking cannot close
  // the distance the problem is movement, not the car.
  // Walk to a STATIONARY car. An earlier version of this walked to whichever
  // vehicle was nearest, which was usually an AI car in traffic — the player
  // chased it for thirty seconds, lost ground the whole way, and the check
  // reported that no car could be reached. That was this file's bug, not the
  // game's: walking is fine (yaw 0 moves +Z at 3.5 m/s, measured). A player
  // gets into a parked car, so that is what this walks to.
  // Walk to a car from traffic.parked SPECIFICALLY, not just any stationary one.
  //
  // This is the whole point of the check. Parked cars are the ones standing at
  // the kerb that a player on foot walks up to, and they were the broken case:
  // nothing stepped their physics, so they could be entered and never driven. A
  // stationary car that happens to be in traffic.vehicles drives fine and would
  // have made this check pass over the bug — which is exactly how the existing
  // 'drive' scenario missed it, since traffic.spawnAt() puts its car in the
  // stepped list.
  let target = null, bestD = Infinity;
  for (const v of ctx.traffic.parked) {
    if (v.dead || v.sim.exploded || v.locked) continue;
    const d = Math.hypot(v.sim.position.x - p.x, v.sim.position.z - p.z);
    if (d < bestD) { bestD = d; target = v; }
  }
  R.fromParkedList = !!target;
  // Fall back to any stationary car only if the city genuinely has no parked one.
  if (!target) {
    for (const v of ctx.traffic.all()) {
      if (v.dead || v.sim.exploded || v.sim.speed > 0.5) continue;
      const d = Math.hypot(v.sim.position.x - p.x, v.sim.position.z - p.z);
      if (d < bestD) { bestD = d; target = v; }
    }
  }
  R.targetWas = target ? `${target.def.id} at ${bestD.toFixed(1)} m` : null;
  R.parkedCount = ctx.traffic.parked.length;
  R.walked = 0;
  R.closedFrom = null;
  R.closedTo = null;
  if (target) {
    const pp0 = ctx.player.body.position;
    R.closedFrom = +Math.hypot(target.sim.position.x - pp0.x, target.sim.position.z - pp0.z).toFixed(1);
    const atTarget = () => {
      const n = ctx.player.findNearbyVehicle();
      return !!n && n.vehicle === target;
    };
    for (let i = 0; i < 90 && !atTarget(); i++) {
      const pp = ctx.player.body.position;
      // Re-aim every step: the target may be a moving AI car.
      ctx.player.yaw = Math.atan2(target.sim.position.x - pp.x, target.sim.position.z - pp.z);
      window.__VC.hold(['KeyW']);
      window.__VC.simulate(0.35);
      R.walked++;
    }
    window.__VC.release(['KeyW']);
    const pp1 = ctx.player.body.position;
    R.closedTo = +Math.hypot(target.sim.position.x - pp1.x, target.sim.position.z - pp1.z).toFixed(1);
  }
  // Only the target counts. An unrelated AI car drifting past at 1.7 m used to
  // satisfy this, and then drove off before the key press was processed — the
  // check failed on traffic it never meant to test.
  const near = (() => {
    const n = ctx.player.findNearbyVehicle();
    return n && n.vehicle === target ? n : null;
  })();
  R.reachedACar = !!near;
  R.prompt = near ? `${near.vehicle.def.name}, seat ${near.seat}, ${near.dist.toFixed(1)} m` : null;
  R.seatOffered = near ? near.seat : null;

  // --- press the INTERACT key (E). A player coming from any other game in this
  // genre presses this first, so what it does matters even though it is not the
  // binding. ---
  R.eEnters = false;
  if (R.reachedACar && R.interactKeys.length) {
    window.__VC.press(R.interactKeys[0]);
    window.__VC.simulate(0.4);
    R.eEnters = !!ctx.player.inVehicle;
    if (ctx.player.inVehicle) ctx.player.exitVehicle();
  }

  // --- press the real ENTER key, through the real edge ---
  R.enterWorked = false;
  R.enterError = null;
  if (R.reachedACar && R.enterKeys.length) {
    ctx.player.enterCooldown = 0;
    try {
      window.__VC.press(R.enterKeys[0]);
      window.__VC.simulate(0.5);
    } catch (e) { R.enterError = String(e && e.message).slice(0, 200); }
    R.enterWorked = !!ctx.player.inVehicle;
  }
  R.carName = ctx.player.vehicle ? ctx.player.vehicle.def.name : null;

  // --- drive it with the throttle key, and see whether it moves ---
  R.drove = null;
  R.topSpeed = null;
  R.aiStillDriving = null;
  R.handbrake = null;
  if (R.enterWorked) {
    const v = ctx.player.vehicle;
    const start = { x: v.sim.position.x, z: v.sim.position.z };
    let top = 0;
    window.__VC.hold(['KeyW']);
    for (let i = 0; i < 24; i++) {
      window.__VC.simulate(0.25);
      top = Math.max(top, v.sim.speed);
    }
    window.__VC.release(['KeyW']);
    R.drove = +Math.hypot(v.sim.position.x - start.x, v.sim.position.z - start.z).toFixed(1);
    R.topSpeed = +top.toFixed(1);
    R.throttle = +(v.sim.throttle ?? -1).toFixed(2);
    R.aiStillDriving = !!(v.aiDriver && v.aiDriver.mode !== 'parked');
    R.handbrake = (v.sim.handbrake ?? 0) > 0.01;
    R.rpm = Math.round(v.sim.engineRpm);
    R.gear = v.sim.gear;

    // --- steering: does the car go where the key points? ---
    //
    // Measured against the CAMERA's right vector, not a world yaw delta. The car's
    // forward is its own local -Z, so a naive atan2(forward.x, forward.z) delta
    // reports a sign that has nothing to do with what the player sees, which is
    // the exact confusion that produced the original "D steers left" bug. What a
    // player means by "right" is "toward the right of my screen", so that is what
    // this measures: where the car ends up, projected onto the camera's own world
    // right axis.
    const steerTest = (keys) => {
      const before = { x: v.sim.position.x, z: v.sim.position.z };
      const cam = ctx.camera;
      cam.updateMatrixWorld();
      const e = cam.matrixWorld.elements;
      const rx = e[0], rz = e[2];              // camera's world right (column 0)
      const len = Math.hypot(rx, rz) || 1;
      window.__VC.hold(keys);
      for (let i = 0; i < 14; i++) window.__VC.simulate(0.25);
      window.__VC.release(keys);
      const dx = v.sim.position.x - before.x, dz = v.sim.position.z - before.z;
      const along = (dx * rx + dz * rz) / len;   // + = toward screen-right
      const dist = Math.hypot(dx, dz) || 1;
      return +(along / dist).toFixed(2);         // fraction of travel, -1..1
    };
    R.steerRight = steerTest(['KeyW', 'KeyD']);
    R.steerLeft = steerTest(['KeyW', 'KeyA']);

    // --- and can they get back out? ---
    ctx.player.enterCooldown = 0;
    window.__VC.press(R.enterKeys[0]);
    window.__VC.simulate(0.5);
    R.exitWorked = !ctx.player.inVehicle;
  }
  R.errors = (ctx.game?.errors || []).slice(0, 3).map((e) => String(e).slice(0, 160));
  return R;
});

note('driving  (walk to a car, press the key, drive it — all through real input)');
note('');
note(`  enter is bound to   : ${out.enterKeys.join(', ') || '(nothing)'}`);
note(`  interact is bound to: ${out.interactKeys.join(', ') || '(nothing)'}`);
note(`  vehicles alive      : ${out.atBoot} at boot, ${out.after10s} after 10 s`);
note(`  nearest of any kind : ${out.nearest} m, ${out.within25} within 25 m`);
note(`  nearest parked      : ${out.nearestStill} m, ${out.stillWithin25} within 25 m`);
note(`  walked toward       : ${out.targetWas || '(nothing stationary to walk to)'}`);
note(`  from the parked list: ${out.fromParkedList ? 'yes — the case a player on foot meets' : 'NO (no parked car available; fell back to a traffic car)'}`);
note(`  a car in reach at spawn: ${out.reachableAtSpawn ? 'yes' : 'no'}`);
note(`  walking             : ${out.walked} step(s), closed ${out.closedFrom} m -> ${out.closedTo} m`);
note(`  after walking       : ${out.reachedACar ? 'in reach — ' + out.prompt : 'STILL no car in reach'}`);
note(`  seat offered        : ${out.seatOffered === null ? 'n/a' : out.seatOffered + (out.seatOffered === 0 ? " (driver's)" : ' (PASSENGER)')}`);
note('');
note(`  pressing ${out.interactKeys[0] || 'interact'} (interact) gets in: ${out.eEnters ? 'yes' : 'no'}`);
note(`  pressing ${out.enterKeys[0] || 'enter'} (enter) gets in   : ${out.enterWorked ? 'yes — ' + out.carName : 'NO'}`);
if (out.enterError) note(`  entering threw       : ${out.enterError}`);
if (out.enterWorked) {
  note(`  held W for 6 s      : drove ${out.drove} m, top ${out.topSpeed} m/s, throttle ${out.throttle}, rpm ${out.rpm}, gear ${out.gear}`);
  note(`  holding D 3.5 s     : ${out.steerRight > 0 ? 'right' : 'LEFT'} (${out.steerRight} of travel toward screen-right)`);
  note(`  holding A 3.5 s     : ${out.steerLeft < 0 ? 'left' : 'RIGHT'} (${out.steerLeft} of travel toward screen-right)`);
  note(`  ai driver still on  : ${out.aiStillDriving ? 'YES' : 'no'}   handbrake: ${out.handbrake ? 'YES' : 'no'}`);
  note(`  pressing it again gets out: ${out.exitWorked ? 'yes' : 'NO'}`);
}

if (!out.vehiclesAlive) problems.push('there are no vehicles in the world at all');
if (!out.parkedCount) problems.push('no parked cars streamed in at all — a player on foot has nothing to get into');
if (!out.reachedACar) {
  problems.push(`the player walked ${out.walked} step(s) toward the nearest car, closing`
    + ` ${out.closedFrom} m to ${out.closedTo} m, and never got close enough for the game to`
    + ' offer it — a player cannot get into any car');
}
if (out.seatOffered !== null && out.seatOffered !== 0) {
  problems.push(`walking up to a car and pressing the key offers seat ${out.seatOffered}, not the`
    + " driver's seat — the player becomes a passenger in a car they cannot drive");
}
if (out.reachedACar && !out.enterWorked) {
  problems.push(`standing at a reachable car (${out.prompt}), pressing the bound enter key`
    + ` ${out.enterKeys[0]} does not put the player in it`);
}
if (out.enterError) problems.push(`entering a car threw: ${out.enterError}`);
if (out.enterWorked) {
  // Six seconds of full throttle from rest. A working car covers tens of metres;
  // anything under 10 m means the throttle is not reaching the wheels.
  if (out.drove < 10) {
    problems.push(`the player held the throttle for six seconds and the car moved ${out.drove} m`
      + ` (top ${out.topSpeed} m/s, throttle ${out.throttle}, handbrake ${out.handbrake}`
      + `, ai driver ${out.aiStillDriving ? 'still attached' : 'detached'}) — it does not drive`);
  }
  // A car that steers sends a clear fraction of its travel to the named side.
  // 0.12 is well below what a real turn produces and well above drift and noise.
  if (out.steerRight < 0.12) {
    problems.push(`holding the right key sent the car ${out.steerRight} of its travel toward`
      + ' screen-right — it does not steer right');
  }
  if (out.steerLeft > -0.12) {
    problems.push(`holding the left key sent the car ${out.steerLeft} of its travel toward`
      + ' screen-right — it does not steer left');
  }
  if (out.aiStillDriving) problems.push('the AI driver is still driving the car the player is sitting in');
  if (!out.exitWorked) problems.push('the player cannot get back out of the car');
}
if (pageErrors.length) problems.push(`the page threw: ${pageErrors[0]}`);
if (out.errors && out.errors.length) problems.push(`the update loop caught: ${out.errors[0]}`);

await browser.close();

note('');
if (problems.length) {
  note('FAIL');
  for (const p of problems) note('  ! ' + p);
  process.exit(1);
}
note('a player can walk to a car, get in, drive it, steer it and get out again');
