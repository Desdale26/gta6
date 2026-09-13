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
try {
  await page.waitForFunction(() => window.__VC && window.__VC.ready === true, null,
    { timeout: 240000, polling: 500 });
  note('boot: ok');
} catch (e) {
  problems.push('did not boot: ' + e.message);
}

if (!problems.length) {
  // --- 3. overlays actually hide -------------------------------------------
  await page.evaluate(() => window.__VC.simulate(2));
  const overlays = await page.evaluate(() => {
    const out = [];
    for (const id of ['startScreen', 'start', 'pauseMenu', 'mapScreen', 'phone', 'shop', 'crash']) {
      const el = document.getElementById(id);
      if (!el) continue;
      const cs = getComputedStyle(el);
      out.push({ id, hidden: el.classList.contains('hidden'), display: cs.display, visible: cs.display !== 'none' });
    }
    return out;
  });
  for (const o of overlays) {
    note(`overlay ${o.id.padEnd(12)} class=hidden:${String(o.hidden).padEnd(5)} computed display:${o.display}`);
    if (o.hidden && o.visible) problems.push(`overlay ${o.id} is marked hidden but still rendering`);
  }

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
    const r = await page.evaluate(([code, ax, sg]) => {
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
      const camRight = new before.constructor(camDir.z, 0, -camDir.x); // right = forward rotated -90 about Y

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
    }, [d.key, d.axis, d.sign]);

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
}

await browser.close();
console.log('');
if (problems.length) {
  console.log('FAIL');
  problems.slice(0, 20).forEach((p) => console.log('  ! ' + p));
  process.exit(1);
}
console.log('single-file bundle verified: stylesheet applied, overlays hide, direction keys correct');
