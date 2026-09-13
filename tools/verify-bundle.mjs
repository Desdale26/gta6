// verify-bundle.mjs — boots the single-file build the way a player does and
// checks the things that fail silently.
//
// The bundle shipped once with no stylesheet in it. Nothing errored: no console
// message, no failed request, no exception. The only symptom was that
// `.hidden{display:none}` never loaded, so every overlay in the game stayed on
// screen forever and the page became a scrolling document. A boot-and-look-for-
// errors check cannot catch that, so this one asserts on what is actually true
// of a working page: the stylesheet applied, the overlays hide, and pressing a
// direction key moves the player in the direction the camera is looking.
//
//   node tools/verify-bundle.mjs [path/to/vice-coast.html]
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import path from 'node:path';
import url from 'node:url';
import { existsSync } from 'node:fs';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const FILE = path.resolve(process.argv[2] || path.join(ROOT, 'vice-coast.html'));
if (!existsSync(FILE)) {
  console.error(`no bundle at ${FILE} — run: node tools/bundle.mjs`);
  process.exit(1);
}

const IGNORE = [/favicon/i, /SwiftShader/i, /Automatic fallback/i, /GroupMarkerNotSet/i,
  /Third-party cookie/i, /GL Driver Message/i, /GL_INVALID_OPERATION: Texture format/i];
const problems = [];
const note = (s) => console.log(s);

const browser = await chromium.launch({
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage',
         '--allow-file-access-from-files', '--autoplay-policy=no-user-gesture-required', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('console', (m) => {
  const t = m.text();
  if (m.type() === 'error' && !IGNORE.some((r) => r.test(t))) problems.push('[console] ' + t);
});
page.on('pageerror', (e) => problems.push('[pageerror] ' + e.message));
page.on('requestfailed', (r) => {
  if (!IGNORE.some((x) => x.test(r.url()))) problems.push(`[request] ${r.url()} failed`);
});

await page.goto(url.pathToFileURL(FILE).href, { waitUntil: 'load', timeout: 120000 });

// --- 1. the stylesheet actually applied -------------------------------------
// Asserted through the computed style of a real element, not by grepping the
// file: that is the only way to know the CSS both landed and parsed.
const css = await page.evaluate(() => {
  const probe = document.createElement('div');
  probe.className = 'hidden';
  document.body.appendChild(probe);
  const display = getComputedStyle(probe).display;
  probe.remove();
  return {
    hiddenWorks: display === 'none',
    sheets: document.styleSheets.length,
    rules: [...document.styleSheets].reduce((n, s) => {
      try { return n + s.cssRules.length; } catch { return n; }
    }, 0),
    bodyMargin: getComputedStyle(document.body).margin,
  };
});
note(`stylesheet: ${css.sheets} sheet(s), ${css.rules} rules, .hidden -> display:${css.hiddenWorks ? 'none' : 'NOT APPLIED'}`);
if (!css.hiddenWorks) problems.push('.hidden does not compute to display:none — the stylesheet is missing or did not parse');
if (css.rules < 100) problems.push(`only ${css.rules} CSS rules reached the page`);

// --- 2. it boots ------------------------------------------------------------
let booted = false;
try {
  await page.waitForFunction(() => window.__VC && window.__VC.ready === true, null,
    { timeout: 240000, polling: 500 });
  booted = true;
  note('boot: ok');
} catch (e) {
  problems.push('did not boot: ' + e.message);
}

// Only the boot gates the rest. Gating on `problems.length` meant a single
// unrelated console message silently skipped the direction-key test, which is
// the one check here that exists to catch a bug a player would notice.
if (booted) {
  // --- 3. overlays actually hide -------------------------------------------
  // Two halves, because either alone is fair-weather. The named list is the
  // positive assertion: these specific panels cover the screen, so if one is
  // still rendering after boot the game is unplayable -- and if an id in the
  // list no longer exists, that is a failure too, not a quiet skip. (An earlier
  // version of this check listed ids that had never existed, so it was really
  // inspecting one element out of seven and passed with the loading screen
  // welded open.) The sweep is the general assertion: whatever else carries
  // `.hidden`, it has to actually be gone.
  const MUST_HIDE = ['loading', 'pauseMenu', 'mapOverlay', 'shopOverlay', 'wheelOverlay',
    'phoneOverlay', 'deathOverlay', 'crashOverlay', 'debugPanel', 'scopeOverlay'];
  const MUST_SHOW = ['startGate', 'hud'];

  // The loading screen fades for 900 ms before it is marked hidden, and
  // `ready` can be observed inside that window.
  try {
    await page.waitForFunction(
      () => document.getElementById('loading')?.classList.contains('hidden'),
      null, { timeout: 15000, polling: 100 });
  } catch {
    problems.push('the loading screen never got the hidden class — it stays over the game');
  }

  await page.evaluate(() => window.__VC.simulate(2));
  const ov = await page.evaluate(([mustHide, mustShow]) => {
    const shown = (el) => {
      const cs = getComputedStyle(el);
      return cs.display !== 'none' && cs.visibility !== 'hidden';
    };
    const named = [];
    for (const id of [...mustHide, ...mustShow]) {
      const el = document.getElementById(id);
      named.push(el
        ? { id, missing: false, marked: el.classList.contains('hidden'), display: getComputedStyle(el).display, shown: shown(el) }
        : { id, missing: true });
    }
    const marked = [...document.querySelectorAll('.hidden')];
    return {
      named,
      markedCount: marked.length,
      markedButShowing: marked.filter(shown).map((el) => el.id || el.className),
    };
  }, [MUST_HIDE, MUST_SHOW]);

  for (const o of ov.named) {
    const want = MUST_HIDE.includes(o.id) ? 'hidden' : 'shown';
    if (o.missing) {
      problems.push(`no element #${o.id} — this check is looking for an overlay that no longer exists`);
      note(`overlay ${o.id.padEnd(13)} MISSING`);
      continue;
    }
    const ok = want === 'hidden' ? !o.shown : o.shown;
    note(`overlay ${o.id.padEnd(13)} want:${want.padEnd(6)} class=hidden:${String(o.marked).padEnd(5)} display:${o.display.padEnd(7)} ${ok ? 'ok' : 'WRONG'}`);
    if (!ok) {
      problems.push(want === 'hidden'
        ? `#${o.id} is still on screen after boot (display:${o.display})`
        : `#${o.id} never appeared after boot (display:${o.display})`);
    }
  }
  note(`overlay sweep:  ${ov.markedCount} elements carry .hidden, ${ov.markedButShowing.length} of them still render`);
  // 12 is a floor, not a target: the markup carries about twenty. A sweep that
  // finds almost nothing is a sweep that has stopped testing anything.
  if (ov.markedCount < 12) problems.push(`only ${ov.markedCount} elements carry .hidden — the class was probably renamed and this check has gone blind`);
  for (const id of ov.markedButShowing) problems.push(`element ${id} is marked hidden but still rendering`);

  // --- 4. the direction keys move the player the right way ------------------
  // The real question is not "does W do something" but "does W move the player
  // toward where the camera is pointing". Measured as a dot product against the
  // camera's own world direction, so it holds in every camera mode.
  const DIRS = [
    { key: 'KeyW', name: 'W', axis: 'forward', sign: 1 },
    { key: 'KeyS', name: 'S', axis: 'forward', sign: -1 },
    { key: 'KeyD', name: 'D', axis: 'right', sign: 1 },
    { key: 'KeyA', name: 'A', axis: 'right', sign: -1 },
  ];
  note('');
  note('key  expected      along-forward  along-right   verdict');
  for (const d of DIRS) {
    const r = await page.evaluate(([code]) => {
      const ctx = window.__VC.ctx;
      const p = ctx.player;
      // Put the player somewhere flat and open, facing a known way, and settle.
      p.body.position.set(820, ctx.physics.groundHeight(820, -300) + 1.0, -300);
      p.body.velocity.set(0, 0, 0);
      p.yaw = 0.9; p.pitch = 0;
      window.__VC.release();
      window.__VC.simulate(1.2);

      const before = p.position.clone();
      // Camera forward, flattened to the ground plane.
      const camDir = new before.constructor();
      ctx.camera.getWorldDirection(camDir);
      camDir.y = 0; camDir.normalize();
      // Screen-right is the camera's own local +X, read straight off its world
      // matrix. Deriving it by hand is how this check previously certified a
      // mirrored strafe: cross(up, forward) is screen-LEFT for a three.js
      // camera, because the camera looks down local -Z. Never re-derive it.
      ctx.camera.updateMatrixWorld(true);
      const camRight = new before.constructor().setFromMatrixColumn(ctx.camera.matrixWorld, 0);
      camRight.y = 0; camRight.normalize();

      window.__VC.hold([code]);
      window.__VC.simulate(1.0);
      window.__VC.release();
      const after = p.position.clone();

      const moved = after.sub(before);
      moved.y = 0;
      const dist = moved.length();
      return {
        dist,
        alongForward: dist > 1e-6 ? moved.dot(camDir) / dist : 0,
        alongRight: dist > 1e-6 ? moved.dot(camRight) / dist : 0,
      };
    }, [d.key]);

    const along = d.axis === 'forward' ? r.alongForward : r.alongRight;
    const want = d.sign;
    // 0.8 leaves room for the body-yaw turn-in and ground slope without
    // admitting anything that is actually sideways or backwards.
    const ok = r.dist > 0.4 && along * want > 0.8;
    if (!ok) {
      problems.push(`${d.name} should move ${want > 0 ? '' : 'anti-'}${d.axis} but moved ${r.dist.toFixed(2)} m with forward=${r.alongForward.toFixed(2)} right=${r.alongRight.toFixed(2)}`);
    }
    note(`${d.name}    ${(want > 0 ? '+' : '-') + d.axis.padEnd(11)} ${r.alongForward.toFixed(2).padStart(11)} ${r.alongRight.toFixed(2).padStart(12)}   ${ok ? 'ok' : 'WRONG'}`);
  }

  // --- 5. nothing the engine itself considers broken ------------------------
  const bad = await page.evaluate(() => window.__VC.validate());
  if (bad && bad.length) for (const b of bad) problems.push('[validate] ' + b);
  note(`engine validate: ${bad && bad.length ? bad.length + ' problem(s)' : 'clean'}`);

  // --- 6. the guards fail when they should ---------------------------------
  // A validator that returns nothing is indistinguishable from a validator
  // that checks nothing, and this project has already shipped one of each. So
  // the checks get checked: feed the world and population guards a city that
  // is empty, broken and unpopulated, and require them to object. Every stub
  // is put back before the next one goes in.
  const guards = await page.evaluate(() => {
    const ctx = window.__VC.ctx;
    const g = ctx.game;
    const out = {};

    const realStats = ctx.world.stats;
    const noFailures = { buildings: 0, props: 0, stuntSpots: 0, first: null };
    ctx.world.stats = { buildings: 0, shops: 0, roadNodes: 0, roadEdges: 0, blocks: 0,
      colliders: 0, lights: 0, failures: noFailures };
    out.emptyCity = g._validateWorld().length;
    ctx.world.stats = { ...realStats, failures: { buildings: 3, props: 1, stuntSpots: 0, first: 'building tower: boom' } };
    out.droppedObjects = g._validateWorld().length;
    ctx.world.stats = { ...realStats, failures: undefined };
    out.noFailureTally = g._validateWorld().length;
    ctx.world.stats = realStats;
    out.realWorld = g._validateWorld().length;

    const realTraffic = ctx.traffic, realPeds = ctx.peds;
    const realPeak = g._popPeak, realElapsed = ctx.time.elapsed;
    ctx.time.elapsed = 60;
    ctx.traffic = { count: 0, parked: [] };
    ctx.peds = { count: 0 };
    g._popPeak = null;
    out.deadStreets = g._validatePopulation().length;
    ctx.traffic = realTraffic; ctx.peds = realPeds;
    g._popPeak = { traffic: 40, peds: 40, reported: false };
    out.livePopulation = g._validatePopulation().length;
    ctx.time.elapsed = realElapsed;
    g._popPeak = realPeak;
    return out;
  });
  const GUARD_CASES = [
    ['emptyCity', 'fire', 'a city with zero buildings, roads and colliders'],
    ['droppedObjects', 'fire', 'four objects dropped during generation'],
    ['noFailureTally', 'fire', 'generation failures not being counted at all'],
    ['realWorld', 'pass', 'the world that actually generated'],
    ['deadStreets', 'fire', 'no traffic and no pedestrians after a minute'],
    ['livePopulation', 'pass', 'a populated city'],
  ];
  note('');
  note('guard self-test (does the check object when it should?)');
  for (const [key, want, what] of GUARD_CASES) {
    const n = guards[key];
    const ok = want === 'fire' ? n > 0 : n === 0;
    note(`  ${String(n).padStart(2)} problem(s) for ${what.padEnd(52)} ${ok ? 'ok' : 'WRONG'}`);
    if (!ok) {
      problems.push(want === 'fire'
        ? `the world/population guard said nothing about ${what} — it is not actually checking`
        : `the world/population guard objected to ${what}`);
    }
  }
}

await browser.close();
console.log('');
if (problems.length) {
  console.log('FAIL');
  problems.slice(0, 20).forEach((p) => console.log('  ! ' + p));
  process.exit(1);
}
console.log('single-file bundle verified: stylesheet applied, every overlay hides, direction keys correct,\nengine validate clean, and the world/population guards object when fed a broken world');
