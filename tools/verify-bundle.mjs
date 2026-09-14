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

  // --- 4b. the direction keys in a car -------------------------------------
  // Same question as above and the same method: hold the key, then measure
  // which way the car actually went against the camera's own screen-right,
  // read off its world matrix. The engine's internal steering convention is
  // self-consistent but says nothing about which side of the screen it is on,
  // so the only way to answer that is to look at the camera.
  note('');
  note('key  expected            lateral   verdict');
  for (const d of [{ key: 'KeyD', name: 'D', sign: 1 }, { key: 'KeyA', name: 'A', sign: -1 }]) {
    const r = await page.evaluate(([code]) => {
      const ctx = window.__VC.ctx;
      const p = ctx.player;
      // A single-file bundle cannot import the catalogue, so borrow a body from
      // something already driving around.
      const donor = ctx.traffic.all().find((v) => !v.dead && v.def.body.kind === 'car')
        || ctx.traffic.all().find((v) => !v.dead);
      if (!donor) return { error: 'no traffic to borrow a car from' };

      // A city street is full of things to hit, and a car that stops against a
      // kerb after nine-tenths of a metre says nothing about which way the
      // wheels were pointing. Try a few spots and measure the first clear run.
      let last = null;
      for (const along of [0, 26, -26, 52]) {
        window.__VC.release();
        if (p.inVehicle) p.exitVehicle(true);
        const spot = ctx.world.safeRoadPoint(806 + along * 0.2, -300 + along);
        p.body.position.set(spot.x, ctx.physics.groundHeight(spot.x, spot.z) + 1.0, spot.z);
        p.body.velocity.set(0, 0, 0);
        const car = ctx.traffic.spawnAt(donor.def, spot.x + 3, spot.z + 3, spot.yaw || 0, { ai: false });
        if (!car) continue;
        p.enterVehicle(car, 0);

        // Get rolling in a straight line first.
        window.__VC.hold(['KeyW']);
        window.__VC.simulate(2.2);

        ctx.camera.updateMatrixWorld(true);
        const right = new ctx.THREE.Vector3().setFromMatrixColumn(ctx.camera.matrixWorld, 0);
        right.y = 0; right.normalize();
        const before = car.sim.position.clone();

        window.__VC.hold(['KeyW', code]);
        window.__VC.simulate(1.6);
        window.__VC.release();
        const moved = car.sim.position.clone().sub(before);
        moved.y = 0;
        const dist = moved.length();
        p.exitVehicle(true);
        last = { dist, attempts: (last ? last.attempts : 0) + 1, lateral: dist > 1e-6 ? moved.dot(right) / dist : 0 };
        if (dist > 3) return last;
      }
      return last || { error: 'no car could be spawned anywhere on the road' };
    }, [d.key]);

    if (r.error) { problems.push(r.error); note(`${d.name}    ${r.error}`); continue; }
    // The car keeps most of its momentum down the road over 1.6 s, so the
    // lateral fraction is modest even in a hard turn; the sign is the point.
    const ok = r.dist > 3 && r.lateral * d.sign > 0.08;
    note(`${d.name}    steer ${(d.sign > 0 ? 'right' : 'left ')} on screen  ${r.lateral.toFixed(2).padStart(7)}   ${ok ? 'ok' : 'WRONG'}`);
    if (!ok) {
      problems.push(r.dist <= 3
        ? `${d.name} in a car: the car only moved ${r.dist.toFixed(1)} m in ${r.attempts} attempt(s), nothing to measure`
        : `${d.name} should steer ${d.sign > 0 ? 'right' : 'left'} but the car went the other way (lateral ${r.lateral.toFixed(2)})`);
    }
  }

  // Put the player back on foot before the remaining checks.
  await page.evaluate(() => {
    const ctx = window.__VC.ctx;
    window.__VC.release();
    if (ctx.player.inVehicle) ctx.player.exitVehicle(true);
  });

  // --- 4c. the radar turns with the player ---------------------------------
  // The minimap draws a "player arrow, always pointing up", so it is a
  // heading-up radar: whatever is straight ahead in the world has to appear
  // straight above the centre. Measured by reading the pixels back, because
  // the question is what the canvas transform actually did, not what the
  // rotate() call was meant to do.
  const radar = await page.evaluate(() => {
    const ctx = window.__VC.ctx;
    const p = ctx.player;
    const mm = ctx.hud.minimap;
    if (p.inVehicle) p.exitVehicle(true);
    const out = [];
    // Straight ahead and out to the right. "Ahead" alone cannot catch a radar
    // that is mirrored left-to-right, because a mirror leaves the forward axis
    // exactly where it was — which is why the sideways case is here.
    const cases = [
      { yaw: 0, side: 0 }, { yaw: 1.0, side: 0 }, { yaw: -2.2, side: 0 },
      { yaw: 0, side: 1 }, { yaw: 1.0, side: 1 }, { yaw: -2.2, side: -1 },
    ];
    for (const { yaw, side } of cases) {
      p.yaw = yaw;
      // The chase camera damps toward the player's yaw, so give it a moment to
      // get there before asking it which way is right.
      window.__VC.release();
      window.__VC.simulate(0.9);
      p.yaw = yaw; p.bodyYaw = yaw;      // the radar reads bodyYaw on foot
      // Ahead is the engine's own forward. Sideways is the camera's screen-right,
      // read off its world matrix rather than derived.
      ctx.camera.updateMatrixWorld(true);
      const right = new ctx.THREE.Vector3().setFromMatrixColumn(ctx.camera.matrixWorld, 0);
      right.y = 0; right.normalize();
      const dx = side ? right.x * 120 * side : Math.sin(yaw) * 120;
      const dz = side ? right.z * 120 * side : Math.cos(yaw) * 120;
      // A blip in a colour nothing else on the radar uses. The waypoint's own
      // pink is shared with every side-job marker, and averaging those in
      // dragged the centroid off the mark.
      const blip = mm.addBlip({ x: p.position.x + dx, z: p.position.z + dz, color: '#00ff00', size: 6 });
      mm.draw();
      mm.removeBlip(blip);
      const W = mm.canvas.width, H = mm.canvas.height;
      const d = mm.g.getImageData(0, 0, W, H).data;
      let sx = 0, sy = 0, n = 0;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = (y * W + x) * 4;
          if (d[i] < 60 && d[i + 1] > 220 && d[i + 2] < 60) { sx += x; sy += y; n++; }
        }
      }
      out.push(n ? { yaw, side, x: sx / n - W / 2, y: sy / n - H / 2, n } : { yaw, side, n: 0 });
    }
    return out;
  });
  note('');
  note('radar: where a waypoint 120 m away actually lands on the canvas');
  for (const r of radar) {
    const what = r.side === 0 ? 'straight ahead' : r.side > 0 ? 'out to the right' : 'out to the left';
    if (!r.n) {
      problems.push(`the radar drew nothing for a waypoint ${what} at yaw ${r.yaw}`);
      note(`  yaw ${String(r.yaw).padStart(5)} ${what.padEnd(17)} blip not found`);
      continue;
    }
    // Canvas y grows downward, so "above centre" is a negative y.
    // 120 m at 0.42 px/m puts it 50 px out; the angle is what is under test, so
    // 12 degrees of slack covers blip rounding without admitting a wrong axis.
    const want = r.side === 0 ? { x: 0, y: -1 } : { x: r.side, y: 0 };
    const len = Math.hypot(r.x, r.y) || 1;
    const cos = (r.x * want.x + r.y * want.y) / len;
    const off = Math.acos(Math.max(-1, Math.min(1, cos))) * 180 / Math.PI;
    const ok = len > 35 && len < 66 && off < 12;
    note(`  yaw ${String(r.yaw).padStart(5)} ${what.padEnd(17)} blip at ${r.x.toFixed(0).padStart(4)},${r.y.toFixed(0).padStart(4)} px`
      + ` (${len.toFixed(0)} px out, ${off.toFixed(0)} deg off)   ${ok ? 'ok' : 'WRONG'}`);
    if (!ok) {
      problems.push(`at yaw ${r.yaw} a blip ${what} lands ${off.toFixed(0)} degrees off where it belongs on the radar`
        + ` (${r.x.toFixed(0)},${r.y.toFixed(0)} px, ${len.toFixed(0)} px from centre, expected about 50)`);
    }
  }

  // --- 4d. the map arrow points where the player is going ------------------
  // Measured, not derived: put a waypoint a long way straight ahead, draw the
  // map, and find both the waypoint's pink crosshair and the player's white
  // arrow in the pixels. The arrow is one pixel wide at the tip and twelve
  // across at the tail, so which end is which is unambiguous — and the tip has
  // to be the end facing the waypoint.
  const mapArrow = await page.evaluate(() => {
    const ctx = window.__VC.ctx;
    const p = ctx.player;
    const mn = ctx.menus;
    if (p.inVehicle) p.exitVehicle(true);
    mn.mapZoom = 1; mn.mapPan.x = 0; mn.mapPan.z = 0;
    const out = [];
    for (const yaw of [0.6, -2.0]) {
      p.yaw = yaw; p.bodyYaw = yaw;
      mn._drawMap();
      const c = mn.el.bigMap;
      const W = c.width, H = c.height;
      const d = c.getContext('2d').getImageData(0, 0, W, H).data;
      const [px, py] = mn._worldToMap(p.position.x, p.position.z);

      const white = [];
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = (y * W + x) * 4;
          if (d[i] >= 232 && d[i + 1] >= 232 && d[i + 2] >= 232) {
            const dx = x - px, dy = y - py;
            if (dx * dx + dy * dy < 256) white.push([dx, dy]);
          }
        }
      }
      // Where "straight ahead" lands on the map, asked of the map's own
      // projection. Hunting for a pink waypoint in the pixels does not work:
      // every side job is drawn in the same pink and skews the centroid.
      const [ax, ay] = mn._worldToMap(p.position.x + Math.sin(yaw) * 300, p.position.z + Math.cos(yaw) * 300);
      if (white.length < 16) { out.push({ yaw, arrowPixels: white.length }); continue; }
      let ux = ax - px, uy = ay - py;
      const ul = Math.hypot(ux, uy) || 1; ux /= ul; uy /= ul;
      // Mean width of each half of the arrow. The white fill is inset by the
      // black outline, so the tip can be a pixel or two short of the polygon's
      // point -- averaging every pixel in each half is steadier than hunting
      // for the extreme one.
      let tipAcross = 0, tailAcross = 0, tipN = 0, tailN = 0;
      for (const [dx, dy] of white) {
        const along = dx * ux + dy * uy;
        const across = Math.abs(-dx * uy + dy * ux);
        if (along > 0) { tipN++; tipAcross += across; }
        else { tailN++; tailAcross += across; }
      }
      out.push({
        yaw, arrowPixels: white.length, tipN, tailN,
        tipSpread: tipN ? tipAcross / tipN : 0,
        tailSpread: tailN ? tailAcross / tailN : 0,
      });
    }
    return out;
  });
  note('');
  note('map: the player arrow should point the way the player is heading');
  for (const r of mapArrow) {
    if (r.arrowPixels < 16) {
      problems.push(`the map drew no player arrow at yaw ${r.yaw} (${r.arrowPixels} px found)`);
      note(`  yaw ${String(r.yaw).padStart(5)}  arrow px ${r.arrowPixels}  NOTHING TO MEASURE`);
      continue;
    }
    // Validated offline against the real canvas: with the arrow pointing the
    // right way the behind half is 0.58 to 0.80 px wider and always holds more
    // pixels; pointing backwards it is 0.61 to 0.93 px NARROWER and holds
    // fewer. Both signs are asked for, and the margin sits between the two.
    const ok = r.tipN >= 5 && r.tailN >= 5 && r.tailSpread > r.tipSpread + 0.25 && r.tailN > r.tipN;
    note(`  yaw ${String(r.yaw).padStart(5)}  ahead half ${r.tipSpread.toFixed(2)} px wide (${r.tipN} px),`
      + ` behind half ${r.tailSpread.toFixed(2)} px wide (${r.tailN} px)   ${ok ? 'ok' : 'WRONG'}`);
    if (!ok) {
      problems.push(r.tipN < 6 || r.tailN < 6
        ? `at yaw ${r.yaw} only ${r.tipN}/${r.tailN} arrow pixels fell either side — nothing to measure`
        : `at yaw ${r.yaw} the map arrow's broad tail faces the way the player is going`
          + ` (${r.tipSpread.toFixed(2)} px mean width ahead, ${r.tailSpread.toFixed(2)} px behind) — the arrow points backwards`);
    }
  }

  // --- 4e. the ground you see is the ground you stand on -------------------
  // The visible terrain is a mesh baked from the height field; the physics
  // reads the height field directly. Nothing kept them in step, so a pad
  // flattened under a building after the mesh was built left the two
  // disagreeing by the whole fall of the hill. Raycast the drawn ground and
  // compare, which is the only way to ask the question of the mesh itself.
  const ground = await page.evaluate(() => {
    const ctx = window.__VC.ctx;
    const T = ctx.THREE;
    const terrain = ctx.scene.getObjectByName('terrain');
    if (!terrain) return { error: 'no terrain mesh in the scene' };
    const ray = new T.Raycaster();
    ray.far = 400;
    const down = new T.Vector3(0, -1, 0);
    const from = new T.Vector3();
    let hits = 0, worst = 0, worstAt = null, over = 0;
    const sum = { d: 0 };
    for (let i = 0; i < 16; i++) {
      for (let j = 0; j < 16; j++) {
        const x = -1400 + (i / 15) * 2500;
        const z = -1400 + (j / 15) * 2800;
        if (ctx.physics.terrain.isWater(x, z)) continue;
        const gh = ctx.physics.groundHeight(x, z);
        if (!Number.isFinite(gh)) continue;
        from.set(x, gh + 150, z);
        ray.set(from, down);
        const hit = ray.intersectObject(terrain, true)[0];
        if (!hit) continue;
        hits++;
        const d = Math.abs(hit.point.y - gh);
        sum.d += d;
        if (d > 0.6) over++;
        if (d > worst) { worst = d; worstAt = [Math.round(x), Math.round(z)]; }
      }
    }
    return { hits, worst, over, mean: hits ? sum.d / hits : 0, worstAt };
  });
  note('');
  if (ground.error) {
    problems.push(ground.error);
    note(`ground: ${ground.error}`);
  } else {
    note(`ground: ${ground.hits} land samples, mean gap ${ground.mean.toFixed(3)} m,`
      + ` worst ${ground.worst.toFixed(2)} m${ground.worstAt ? ` at ${ground.worstAt[0]},${ground.worstAt[1]}` : ''},`
      + ` ${ground.over} over 0.6 m`);
    if (ground.hits < 100) problems.push(`only ${ground.hits} of the ground samples hit the drawn terrain at all`);
    if (ground.worst > 0.6) {
      problems.push(`the drawn ground and the ground you collide with differ by ${ground.worst.toFixed(2)} m`
        + ` at ${ground.worstAt[0]},${ground.worstAt[1]} (${ground.over} samples over 0.6 m)`);
    }
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
      colliders: 0, lights: 0, parkedSlots: 0, failures: noFailures };
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
    g._popPeak = { traffic: 40, peds: 40, parked: 20, reported: false };
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
