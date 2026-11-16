/*
 * tools/dry-run.mjs — developer check: a cheat-driven play-through of the story.
 *
 *   node vicehaven/tools/dry-run.mjs                 (every job: main story, its side stories, the DLC)
 *   node vicehaven/tools/dry-run.mjs --dlc           (the story DLC only: its main jobs, then its side chains)
 *   node vicehaven/tools/dry-run.mjs --main          (the main story and its side stories only)
 *   node vicehaven/tools/dry-run.mjs d01_x d02_y     (just these jobs, in this order)
 *   node vicehaven/tools/dry-run.mjs --dlc --once    (option 1 at every choice only: one run a job)
 *
 * Boots the game headless once, then starts each job and drives it to its
 * pass screen by satisfying each step directly: Jay is teleported to goto /
 * fly / land targets and put in the vehicle a step asks for, kill and
 * destroy targets are removed, chases are caught, tails reach their end,
 * races are won checkpoint by checkpoint, deliveries and collections are
 * made, hold-ups hand over the bag, heat is cleared, and dialogue and waits
 * are fast-forwarded. A job with choices runs once per option (option k at
 * every choice, or its last one where there are fewer), so every branch is
 * exercised. Reports every job or branch that throws, fails, hangs (a step
 * that never finishes) or cannot finish; every place id that failed to
 * resolve or resolved outside its district; and page errors. Exit code 1 if
 * anything was found.
 *
 * Jobs run in story order on one save, so flags and passed jobs carry
 * forward the way they would in play (the choices of option 1 are kept).
 */
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
let playwright;
try {
  playwright = require('playwright');
} catch {
  playwright = require(path.join(execSync('npm root -g').toString().trim(), 'playwright'));
}
const here = path.dirname(fileURLToPath(import.meta.url));
const indexUrl = pathToFileURL(path.join(here, '..', 'index.html')).href;

const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const ids = args.filter((a) => !a.startsWith('--'));
const JOB_WALL = Number(process.env.JOB_WALL || 75) * 1000; // wall-clock limit for one run of a job
const verbose = flag('--verbose');

const t0 = Date.now();
const log = (...a) => console.log('[dry-run]', ...a);
const browser = await playwright.chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--allow-file-access-from-files'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const pageErrors = [];
let currentJob = '(boot)';
page.on('pageerror', (e) => pageErrors.push(currentJob + ': ' + e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
page.on('console', (m) => {
  if (m.type() === 'error') pageErrors.push(currentJob + ': console: ' + m.text());
});
await page.addInitScript(() => {
  try {
    localStorage.clear();
    localStorage.setItem('vicehaven.settings.v1', JSON.stringify({ version: 1, graphics: { quality: 'low' }, gameplay: { voicedDialogue: false } }));
  } catch (e) {}
});
await page.goto(indexUrl);
await page.waitForFunction(() => window.VH && VH.game && VH.game.state === 'title', null, { timeout: 300000 });
await page.evaluate(() => {
  const g = VH.game;
  g.freeze(true);
  g.noAutoStory = true;
  g.newGame();
  g.advance(3);
});
log('booted in ' + Math.round((Date.now() - t0) / 1000) + ' s');

// ------------------------------------------------------------- the in-page driver
await page.evaluate(() => {
  const g = VH.game;
  const M = g.missions;
  const DR = (window.__DR = { missing: [], resolved: new Map(), job: null });
  // Keep the auto-started things out of the way: credits and chained starts.
  M.completed._credits = true;
  M.completed._dlcCredits = true;
  const airCheck = (v) => !!v && M.constructor.isAircraft(v);

  // Which step is running (the innermost _exec), and since when.
  const exec = M._exec.bind(M);
  M._exec = function (step, run, setup) {
    if (!setup && run) {
      if (run._dr && run._dr.t > 5 && DR.slow) DR.slow.push(Math.round(run._dr.t) + ' s ' + desc(run._dr));
      if (run._dr && DR.kindT) DR.kindT[run._dr.kind] = Math.round(((DR.kindT[run._dr.kind] || 0) + run._dr.t) * 10) / 10;
      run._dr = { step, kind: M.constructor.kindOf(step), t: 0, n: (run._dr ? run._dr.n : 0) + 1, top: run.stepIndex, depth: run.depth || 0 };
    }
    return exec(step, run, setup);
  };
  // Waits, fades, establishing shots and hold-outs are cut short (a few
  // seconds of game time each): what's being tested is that they end.
  const sleep = M._sleep.bind(M);
  M._sleep = (seconds, run) => sleep(Math.min(seconds, 0.3), run);
  const survive = M._survive.bind(M);
  M._survive = (step, run) => survive(Object.assign({}, step, { survive: Math.min(step.survive || 0, 6), waves: (step.waves || []).map((w) => Object.assign({}, w, { delay: Math.min(w.delay || 0, 4) })) }), run);
  // Place ids that don't resolve (people and cars of the job are looked up first by _place).
  const get = g.places.get.bind(g.places);
  g.places.get = function (id) {
    const p = get(id);
    if (typeof id === 'string' && DR.job) {
      if (!p) DR.missing.push(DR.job + ': ' + id + (M.run && M.run._dr ? ' (' + M.run._dr.kind + ')' : ''));
      else if (!DR.resolved.has(id)) DR.resolved.set(id, DR.job);
    }
    return p;
  };
  VH.events.on('mission:pass', (e) => {
    if (DR.job && e.m.id === DR.job) DR.result = { state: 'pass' };
  });
  VH.events.on('mission:fail', (e) => {
    if (DR.job && e.m.id === DR.job) DR.result = { state: 'fail', reason: e.reason, at: DR.lastStep };
  });

  const P = () => g.player;
  const desc = (d) => {
    if (!d) return '?';
    const s = d.step;
    const v = s[d.kind];
    const val = typeof v === 'string' ? v : v && typeof v === 'object' && !Array.isArray(v) ? (v.id || v.at || (v.checkpoints ? 'race' : '')) : Array.isArray(v) && typeof v[0] === 'string' ? v.join(',') : '';
    const short = String(val).slice(0, 40);
    return 'step ' + (d.top + 1) + (d.depth ? ' (in a branch)' : '') + ' ' + d.kind + (short ? ' ' + short : '') + (s.vehicle !== undefined ? ' vehicle:' + s.vehicle : '');
  };

  function stopCar(v) {
    if (!v) return;
    v.vel.set(0, 0, 0);
    if (v.omega !== undefined) v.omega = 0;
    if (v.speed !== undefined) v.speed = 0;
    if (v.input) {
      v.input.accel = 0;
      v.input.brake = 0;
      v.input.handbrake = 1;
    }
  }
  function putCar(v, x, z, yaw, y) {
    v.place(x, z, yaw === undefined ? v.yaw : yaw, y);
    stopCar(v);
    if (P().vehicle === v) P().pos.copy(v.pos);
  }
  function getOut() {
    const p = P();
    const v = p.vehicle;
    if (!v) return;
    if (v.flying) putCar(v, v.pos.x, v.pos.z, v.yaw);
    stopCar(v);
    g.vehicles.exitVehicle();
    if (p.vehicle) {
      // No room to get out: just stand beside it.
      p.vehicle = null;
      p.state = 'idle';
      v.driver = null;
      if (p.model) p.model.setVisible(true);
    }
  }
  function enter(v) {
    const p = P();
    if (!v || p.vehicle === v) return;
    getOut();
    g.vehicles.entering = null;
    if (v.driver === 'ai') {
      try {
        M.ejectDriver(v);
      } catch (e) {}
      v.driver = null;
      v.controller = null;
    }
    v.noEnter = false;
    p.teleport(v.pos.x, v.pos.z, v.yaw);
    const quiet = M.suppressHeat;
    M.suppressHeat = true;
    g.vehicles.beginEnter({ v, side: 1, x: p.pos.x, z: p.pos.z });
    g.vehicles._finishEnter();
    M.suppressHeat = quiet;
    stopCar(v);
  }
  function spawnAndEnter(type) {
    const p = P();
    const v = g.vehicles.spawn(type, p.pos.x + 4, p.pos.z, p.heading || 0, { role: 'mission', persistent: true });
    enter(v);
    return v;
  }
  function moveJay(pl, yaw) {
    const p = P();
    const y = pl.y !== undefined ? pl.y : undefined;
    if (p.vehicle) putCar(p.vehicle, pl.x, pl.z, yaw !== undefined ? yaw : pl.yaw, y);
    else p.teleport(pl.x, pl.z, yaw !== undefined ? yaw : pl.yaw || 0, y);
  }
  function need(step, run) {
    // Put Jay in whatever the step asks for.
    const p = P();
    const want = step.vehicle;
    if (want === false) return getOut();
    if (want === true) {
      if (!p.vehicle) spawnAndEnter('vireo');
      return;
    }
    if (want === 'aircraft') {
      if (!airCheck(p.vehicle)) spawnAndEnter('skylark');
      return;
    }
    if (typeof want === 'string') {
      const car = run.cars.get(want);
      if (car && !car.wrecked && p.vehicle !== car) enter(car);
    }
  }
  function keepAlive(run) {
    const p = P();
    p.godMode = true;
    if (p.health !== undefined && p.maxHealth) p.health = p.maxHealth;
    if (g.police.level > 0) g.police.reset();
    for (const id of [...run.crew, ...run.protect]) {
      const a = run.actors.get(id);
      if (a && !a.dead && a.maxHealth) a.health = a.maxHealth;
    }
    for (const [, v] of run.cars) {
      if (v.wrecked || v.removed) continue;
      if (v.burning) v.burning = 0;
      if (v.health < 700 && !(run.targetCars || []).includes(v)) v.health = 1000;
    }
  }
  function ffDialogue() {
    const d = g.dialogue;
    let n = 0;
    while (d.current && n++ < 50) {
      try {
        d._stopSpeech();
      } catch (e) {}
      d.current.i = d.current.lines.length;
      d._line();
    }
    if (d._choice) {
      const k = Math.min(DR.variant, d._choice.n - 1);
      DR.picks.push(k + 1 + '/' + d._choice.n);
      d._pick(k);
    }
  }

  function drive(run) {
    const d = run._dr;
    if (!d) return;
    const s = d.step;
    const p = P();
    switch (d.kind) {
      case 'goto': {
        const pl = M._place(s.goto);
        if (!pl) return;
        if (pl.roof && pl.door && Math.abs(p.pos.y - pl.y) > 3) {
          getOut();
          const door = M._place(pl.door);
          p.teleport(door.x, door.z, door.yaw || 0, door.y);
          return;
        }
        need(s, run);
        if (s.clearOf) {
          for (const a of run.actors.values()) if (!a.dead && !a.removed && a.faction === s.clearOf.faction) g.crowd.remove(a);
        }
        if (d.placed && Math.hypot(p.pos.x - pl.x, p.pos.z - pl.z) < 2) {
          if (p.vehicle) stopCar(p.vehicle);
          return;
        }
        moveJay(pl);
        d.placed = true;
        return;
      }
      case 'getIn': {
        if (s.getIn === 'any') {
          if (!p.vehicle) spawnAndEnter('vireo');
        } else if (s.getIn === 'aircraft') {
          if (!airCheck(p.vehicle)) spawnAndEnter('skylark');
        } else enter(run.cars.get(s.getIn));
        return;
      }
      case 'kill':
        for (const a of run.targets || []) if (!a.dead && !a.removed) g.crowd.remove(a);
        return;
      case 'survive':
        for (const a of run.targets || []) if (!a.dead && !a.removed) g.crowd.remove(a);
        return;
      case 'destroy':
        for (const v of run.targetCars || []) {
          if (v.wrecked || v.removed) continue;
          if (p.vehicle === v) getOut();
          g.vehicles.remove(v);
        }
        return;
      case 'chase': {
        const car = run.cars.get(s.chase);
        if (!car || car.wrecked || car.removed) return;
        if ((s.mode || 'wreck') !== 'catch') {
          car.health = 50;
          return;
        }
        car.controller = null;
        stopCar(car);
        const side = { x: car.pos.x + Math.cos(car.yaw) * 5, z: car.pos.z - Math.sin(car.yaw) * 5 };
        if (Math.hypot(p.pos.x - side.x, p.pos.z - side.z) > 3) moveJay({ x: side.x, z: side.z, y: car.pos.y }, car.yaw);
        return;
      }
      case 'follow': {
        const car = run.cars.get(s.follow);
        if (!car || !car.controller) return;
        const dest = M._place(s.to);
        if (dest && !d.placed) {
          putCar(car, dest.x, dest.z, car.yaw);
          d.placed = true;
        }
        car.controller.arrived = true;
        const back = { x: car.pos.x - Math.sin(car.yaw) * 30, z: car.pos.z - Math.cos(car.yaw) * 30 };
        if (Math.hypot(p.pos.x - car.pos.x, p.pos.z - car.pos.z) > 60 || Math.hypot(p.pos.x - car.pos.x, p.pos.z - car.pos.z) < 15) moveJay(back, car.yaw);
        return;
      }
      case 'race': {
        if (g.frozenControls || !run.marker) return;
        const m = run.marker;
        if (Math.hypot(p.pos.x - m.x, p.pos.z - m.z) < 5) return;
        moveJay({ x: m.x, z: m.z });
        return;
      }
      case 'deliver': {
        const car = run.cars.get(s.deliver) || p.vehicle;
        const pl = M._place(s.to);
        if (!car || !pl) return;
        if (p.vehicle !== car) enter(car);
        if (car.health < 950) car.health = 1000;
        if (Math.hypot(car.pos.x - pl.x, car.pos.z - pl.z) > 2) putCar(car, pl.x, pl.z, pl.yaw);
        else stopCar(car);
        return;
      }
      case 'collect': {
        const it = (run.watchItems || []).find((i) => !i.collected);
        if (!it) return;
        getOut();
        p.teleport(it.pos.x, it.pos.z, 0, it.pos.y - 0.85);
        return;
      }
      case 'fly': {
        const pl = M._place(s.fly);
        if (!pl) return;
        const want = s.vehicle ? run.cars.get(s.vehicle) : null;
        if (want) enter(want);
        else if (!airCheck(p.vehicle)) spawnAndEnter('skylark');
        const v = p.vehicle;
        const base = Math.max(0, g.physics.groundHeight(pl.x, pl.z, 800));
        const y = base + (s.height !== undefined ? s.height : 120);
        putCar(v, pl.x, pl.z, v.yaw, y);
        v.flying = true;
        return;
      }
      case 'land': {
        const pl = M._place(s.land);
        if (!pl) return;
        const want = s.vehicle ? run.cars.get(s.vehicle) : null;
        if (want) enter(want);
        else if (!airCheck(p.vehicle)) spawnAndEnter('skylark');
        const v = p.vehicle;
        if (v.flying || Math.hypot(v.pos.x - pl.x, v.pos.z - pl.z) > 4) putCar(v, pl.x, pl.z, pl.yaw || v.yaw);
        else stopCar(v);
        return;
      }
      case 'holdup':
        if (run.holdupStore && !d.done) {
          d.done = true;
          VH.events.emit(s.safe ? 'holdup:safe' : 'holdup:bag', { s: run.holdupStore });
        }
        return;
      case 'loseHeat':
        g.police.reset();
        return;
      default:
    }
  }

  DR.start = function (id, variant) {
    const m = M.all.get(id);
    if (!m) return { error: 'no such job' };
    if (M.run) M.fail('dry-run: next job');
    M._retry = null;
    g.hud.missionResult(null);
    g.dialogue.stop();
    g.police.reset();
    getOut();
    for (const r of m.requires || []) M.completed[r] = true;
    DR.flags0 = DR.flags0 || {};
    if (variant === 0) DR.flags0[id] = JSON.stringify(M.flags);
    else M.flags = JSON.parse(DR.flags0[id]);
    DR.job = id;
    DR.variant = variant;
    DR.picks = [];
    DR.slow = [];
    DR.kindT = {};
    DR.result = null;
    DR.lastStep = null;
    DR.simT = 0;
    if (g.state !== 'playing') g.state = 'playing';
    M.start(m);
    if (!M.run) return { error: 'did not start (start() refused)' };
    return { ok: true };
  };

  // (The job's steps are promises: let them run between frames, as the real loop does.)
  const yieldNow = () => new Promise((r) => setTimeout(r, 0));
  DR.tick = async function (seconds) {
    const STEP = 0.1;
    for (let t = 0; t < seconds; t += STEP) {
      await yieldNow();
      if (DR.result) break;
      const run = M.run;
      if (!run) {
        g.advance(STEP);
        DR.simT += STEP;
        continue;
      }
      try {
        keepAlive(run);
        ffDialogue();
        drive(run);
      } catch (e) {
        return { state: 'error', reason: 'driver threw: ' + e.message + ' at ' + desc(run._dr) };
      }
      if (run._dr) DR.lastStep = desc(run._dr);
      g.advance(STEP);
      DR.simT += STEP;
      if (run._dr) {
        run._dr.t += STEP;
        const lim = 90;
        if (run._dr.t > lim) {
          const obj = (document.querySelector('.hud-objective, #objective') || {}).textContent || run.objective || '';
          return { state: 'hang', reason: 'stuck ' + Math.round(run._dr.t) + ' s on ' + desc(run._dr) + (obj ? ' — objective: "' + String(obj).trim().slice(0, 90) + '"' : '') };
        }
      }
      if (DR.simT > 900) return { state: 'hang', reason: 'over 15 sim minutes, last at ' + DR.lastStep };
    }
    if (DR.result) {
      const r = DR.result;
      M._chainPending = null;
      M._retry = null;
      return Object.assign({ picks: DR.picks.slice(), simT: Math.round(DR.simT), slow: DR.slow.slice(), kindT: DR.kindT }, r);
    }
    return { state: 'running', at: DR.lastStep };
  };

  DR.abort = function () {
    if (M.run) M.fail('dry-run abort');
    M._retry = null;
    M._chainPending = null;
    g.dialogue.stop();
  };

  DR.finishJob = function (id) {
    // After all of a job's runs: keep option 1's flags, mark it passed.
    if (DR.keepFlags) M.flags = JSON.parse(DR.keepFlags);
    M.completed[id] = true;
    DR.job = null;
  };
  DR.keep = function () {
    DR.keepFlags = JSON.stringify(M.flags);
  };

  // Places resolved during the run that sit outside their district.
  DR.districtCheck = function () {
    const out = [];
    const near = (p, want) => {
      for (const [dx, dz] of [[0, 0], [15, 0], [-15, 0], [0, 15], [0, -15]]) {
        const d = g.world.districtAt(p.x + dx, p.z + dz);
        if (d && d.id === want) return true;
      }
      return false;
    };
    for (const [id, job] of DR.resolved) {
      const p = g.places.map.get(id);
      if (!p || !p.district || !g.places.defs[id]) continue; // built-in spots and aliases have their own homes
      if (p.district === 'neonstrand' && ['neonstrand', 'oldpaloma', 'palomaheights', 'palomafield'].includes((g.world.districtAt(p.x, p.z) || {}).id)) continue;
      // Jetties and piers stand out over the water.
      if (['dock', 'pier', 'boardwalk', 'beach'].includes(p.kind) && (g.world.districtAt(p.x, p.z) || {}).id === 'bay') continue;
      if (!near(p, p.district)) out.push(job + ': ' + id + ' (' + p.district + ') is in ' + ((g.world.districtAt(p.x, p.z) || {}).id || '?') + ' at ' + Math.round(p.x) + ', ' + Math.round(p.z));
    }
    return out;
  };

  DR.jobs = function (which) {
    const out = [];
    const add = (m) => out.push(m.id);
    if (which !== 'dlc') {
      M.main.forEach(add);
      for (const c of M.side) (c.missions || []).forEach(add);
    }
    if (which !== 'main') {
      M.dlcMain.forEach(add);
      for (const c of M.dlcSide) (c.missions || []).forEach(add);
    }
    return out;
  };
  // The most options any choice in the job has (nested ones too).
  DR.variants = function (id) {
    const m = M.all.get(id);
    let n = 1;
    const walk = (steps) => {
      for (const s of steps || []) {
        if (s.choice) {
          n = Math.max(n, (s.choice.options || []).length);
          for (const o of s.choice.options || []) walk(o.then);
        }
        if (s.then) walk(s.then);
        if (s.else) walk(s.else);
      }
    };
    walk(m && m.steps);
    return n;
  };
});

// ------------------------------------------------------------- run the jobs
const which = flag('--dlc') ? 'dlc' : flag('--main') ? 'main' : 'all';
const jobs = ids.length ? ids : await page.evaluate((w) => __DR.jobs(w), which);
log(jobs.length + ' jobs');
const problems = [];
let passes = 0;
let runs = 0;
for (const id of jobs) {
  currentJob = id;
  const variants = flag('--once') ? 1 : await page.evaluate((id) => __DR.variants(id), id);
  for (let k = 0; k < variants; k++) {
    const tag = id + (variants > 1 ? ' [option ' + (k + 1) + ']' : '');
    const w0 = Date.now();
    runs++;
    let r;
    try {
      r = await page.evaluate(([id, k]) => __DR.start(id, k), [id, k]);
      if (r.error) {
        problems.push(tag + ': ' + r.error);
        log('✗ ' + tag + ': ' + r.error);
        continue;
      }
      for (;;) {
        r = await page.evaluate(() => __DR.tick(3));
        if (r.state !== 'running') break;
        if (Date.now() - w0 > JOB_WALL) {
          r = { state: 'hang', reason: 'over ' + JOB_WALL / 1000 + ' s of wall-clock, last at ' + r.at };
          break;
        }
      }
    } catch (e) {
      r = { state: 'error', reason: 'harness: ' + e.message.split('\n')[0] };
    }
    const secs = ((Date.now() - w0) / 1000).toFixed(1);
    if (r.state === 'pass') {
      passes++;
      if (k === 0) await page.evaluate(() => __DR.keep());
      if (verbose) log('  slow steps: ' + r.slow.join(' · ') + ' | by kind: ' + JSON.stringify(r.kindT));
      log('✓ ' + tag + ' (' + secs + ' s, ' + r.simT + ' s game time' + (r.picks.length ? ', picks ' + r.picks.join(' ') : '') + ')');
    } else {
      const msg = tag + ': ' + r.state.toUpperCase() + ' — ' + r.reason + (r.at ? ' (at ' + r.at + ')' : '');
      problems.push(msg);
      log('✗ ' + msg + ' (' + secs + ' s)');
      await page.evaluate(() => __DR.abort()).catch(() => {});
      if (k === 0) await page.evaluate(() => __DR.keep()).catch(() => {});
    }
  }
  await page.evaluate((id) => __DR.finishJob(id), id).catch(() => {});
}
currentJob = '(end)';
const { missing, districts } = await page.evaluate(() => ({ missing: [...new Set(__DR.missing)], districts: __DR.districtCheck() }));

console.log('\n==== dry-run: ' + passes + ' / ' + runs + ' runs passed (' + jobs.length + ' jobs) in ' + Math.round((Date.now() - t0) / 1000) + ' s');
const section = (title, list) => {
  if (!list.length) return;
  console.log('\n' + title + ' (' + list.length + ')');
  for (const l of list) console.log('  - ' + l);
};
section('Jobs or branches that did not finish', problems);
section('Place ids that did not resolve', missing);
section('Places outside their district', districts);
section('Page errors', [...new Set(pageErrors)]);
if (!problems.length && !missing.length && !districts.length && !pageErrors.length) console.log('\nAll clear.');
await browser.close();
process.exit(problems.length || missing.length || pageErrors.length ? 1 : 0);
