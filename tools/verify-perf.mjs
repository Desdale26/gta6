// verify-perf.mjs — does a frame ask for a sane amount of work, and does the
// game keep stopping to compile shaders while you play?
//
// Absolute frame times are meaningless here: the container is CPU-throttled and
// draws through SwiftShader. Counts are not, and counts are what decide whether
// a real machine stutters.
//
// The number that matters most is the shader program cache. three.js compiles a
// separate program per material per *lighting shape*, and the number of visible
// point lights and spot lights are both part of the cache key
// (three.module.js r180: line 7097 builds `numPointLights: lights.point.length`,
// line 7229 pushes it into the key). Anything that changes how many lights are in
// the scene therefore recompiles every material in the city — hundreds of
// milliseconds, on the main thread, while the player is driving.
//
// The game used to do that constantly: the street-light pool toggled `visible` on
// up to thirty lights every quarter second, the sun was hidden at dusk and shown
// at dawn, every car the player entered attached two spot lights and every one
// they left detached them, every police unit did the same, and every explosion
// added a point light to the scene and took it away again. Measured on the
// shipped build, one minute of ordinary play — walk, nightfall, drive, back to
// midday — compiled 176 programs after boot and was still climbing. With the
// pools fixed and a full prewarm at boot it compiles 9, and the count is flat
// across dusk, night driving and dawn.
//
// The second number is draw calls. They are paid by the CPU, so the adaptive
// resolution cannot reach them however far it drops the frame: a 900 m draw
// distance, a 190 m shadow box and 4036 shadow casters cost 5824 calls and 2.5
// million triangles a frame no matter what size the picture was.
//
//   node tools/verify-perf.mjs [path/to/vice-coast.html]
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import path from 'node:path';
import url from 'node:url';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const FILE = path.resolve(process.argv[2] || path.join(ROOT, 'vice-coast.html'));

// Budgets. Each is set well above what the game currently measures and well
// below what it measured before this was written, so it catches a regression
// without failing on noise.
const MAX_COMPILES_IN_PLAY = 40;    // was 176; is 9
const MAX_COMPILES_AFTER_SETTLING = 6;  // once the world has been seen once, ~0
const MAX_CALLS = 2200;             // was 5824; is ~1150
const MAX_TRIS = 1_600_000;         // was 2_530_000; is ~860k
const MAX_SCENE_LIGHTS = 16;        // the fixed pools plus sun, moon, hemisphere

// Which passes to run. The play pass simulates a minute of the game and the
// render-mode pass boots every preset, and under SwiftShader those take ten and
// fourteen minutes; the daylight pass takes under two. Working on the lighting
// meant a twenty-five minute wait to see one number, so each pass can be asked
// for by name — PERF_ONLY=daylight — and the checks that need a pass that did
// not run are skipped rather than reported against missing data. No argument
// runs everything, which is what CI and the final check do.
const ONLY = (process.env.PERF_ONLY || '').split(',').map((x) => x.trim()).filter(Boolean);
const want = (pass) => !ONLY.length || ONLY.includes(pass);
for (const o of ONLY) {
  if (!['play', 'modes', 'daylight'].includes(o)) {
    console.log(`unknown pass "${o}" — PERF_ONLY takes play, modes, daylight`);
    process.exit(2);
  }
}

const T0 = Date.now();
const problems = [];
const note = (s) => console.log(s);

const browser = await chromium.launch({
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage',
         '--autoplay-policy=no-user-gesture-required', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => problems.push('[pageerror] ' + e.message));
await page.goto(url.pathToFileURL(FILE).href, { waitUntil: 'load', timeout: 120000 });
try {
  await page.waitForFunction(() => window.__VC && window.__VC.ready === true, null,
    { timeout: 300000, polling: 500 });
} catch (e) {
  console.log('did not boot: ' + e.message);
  await browser.close();
  process.exit(1);
}

note(`booted in ${((Date.now() - T0) / 1000).toFixed(0)} s`);
const out = !want('play') ? null : await page.evaluate(() => {
  const ctx = window.__VC.ctx;
  const gl = ctx.renderer.renderer;
  const samples = [];
  const lightCounts = new Set();
  const snap = (label) => {
    samples.push({
      label,
      programs: gl.info.programs ? gl.info.programs.length : -1,
      calls: gl.info.render.calls,
      tris: gl.info.render.triangles,
      lit: ctx.lights.activeCount,
      night: +(ctx.sky?.palette?.night ?? -1).toFixed(2),
      errors: (ctx.game?.errors || []).length,
      scale: +ctx.renderer.renderScaleUsed.toFixed(3),
      quality: ctx.settings.data.quality,
    });
  };

  // How many lights are actually IN the scene. This is the number that must not
  // move, and counting it directly is cheaper than inferring it from compiles.
  const countLights = () => {
    let n = 0;
    ctx.scene.traverse((o) => { if (o.isLight && o.visible) n++; });
    return n;
  };
  const sceneLights = new Set();
  sceneLights.add(countLights());

  snap('after boot');
  ctx.time.hour = 12;
  window.__VC.simulate(3);
  snap('midday, still');

  // Walk about: new chunks and materials come into view.
  for (let i = 0; i < 6; i++) {
    ctx.player.yaw = i * 1.05;
    window.__VC.hold(['KeyW']);
    window.__VC.simulate(2.5);
    window.__VC.release();
    sceneLights.add(countLights());
  }
  snap('after walking');

  // Dusk into night is when the street-light pool fills and the sun sets, which
  // is where the old build compiled forty programs in a few seconds.
  for (const h of [17, 18, 19, 20, 21, 22]) {
    ctx.time.hour = h;
    window.__VC.simulate(2);
    lightCounts.add(ctx.lights.activeCount);
    sceneLights.add(countLights());
  }
  snap('after nightfall');

  // Driving covers ground fastest, so the pool churns hardest here.
  const v = ctx.traffic.all().find((c) => !c.dead);
  if (v && ctx.player.enterVehicle) {
    ctx.player.enterVehicle(v);
    for (let i = 0; i < 8; i++) {
      window.__VC.hold(['KeyW']);
      window.__VC.simulate(2.5);
      lightCounts.add(ctx.lights.activeCount);
      sceneLights.add(countLights());
    }
    window.__VC.release();
  }
  snap('after driving at night');

  // An explosion used to add a light to the scene and take it away again.
  if (ctx.combat && ctx.combat.explode) {
    const p = ctx.player.position;
    ctx.combat.explode(p.x + 30, p.y, p.z + 30, { radius: 9, damage: 40, force: 3000 });
    window.__VC.simulate(1.5);
    sceneLights.add(countLights());
  }
  snap('after an explosion');

  // Back to midday: anything compiled here was compiled for a second time.
  ctx.time.hour = 12;
  window.__VC.simulate(3);
  sceneLights.add(countLights());
  snap('back to midday');

  return {
    samples,
    lit: [...lightCounts].sort((a, b) => a - b),
    sceneLights: [...sceneLights].sort((a, b) => a - b),
  };
});
if (out) note(`  play pass done at ${((Date.now() - T0) / 1000).toFixed(0)} s`);

// --- the cheap path has to draw the same city, not a black rectangle --------
// The bottom two presets skip the post chain entirely and render the scene
// straight to the canvas. That is the single largest saving in the renderer and
// also the easiest thing to get silently wrong: tone mapping moves from the
// composite pass into the materials, and if that swap is missed the picture
// comes out either black or blown out, and no count anywhere would say so.
const modes = !want('modes') ? [] : await page.evaluate(async () => {
  const ctx = window.__VC.ctx;
  const gl = ctx.renderer.renderer;
  // Read the default framebuffer with readPixels in the SAME task as the draw.
  // Copying the canvas with drawImage cannot work here: the context is created
  // without preserveDrawingBuffer, so by the time a 2D canvas gets to copy it
  // the buffer has been presented and cleared, and every preset reads as pure
  // black whether it drew a city or not.
  const read = () => {
    const g = gl.getContext();
    ctx.renderer.render(1 / 60, ctx.time.elapsed);
    gl.setRenderTarget(null);
    const w = Math.max(1, gl.domElement.width | 0);
    const h = Math.max(1, gl.domElement.height | 0);
    const sw = Math.min(96, w), sh = Math.min(54, h);
    const x0 = ((w - sw) / 2) | 0, y0 = ((h - sh) / 2) | 0;
    const px = new Uint8Array(sw * sh * 4);
    g.readPixels(x0, y0, sw, sh, g.RGBA, g.UNSIGNED_BYTE, px);
    let sum = 0, min = 255, max = 0, lit = 0;
    for (let i = 0; i < px.length; i += 4) {
      const l = px[i] * 0.3 + px[i + 1] * 0.59 + px[i + 2] * 0.11;
      sum += l; if (l < min) min = l; if (l > max) max = l;
      if (l > 12) lit++;
    }
    const n = px.length / 4;
    return { mean: sum / n, min, max, litFrac: lit / n };
  };
  // Nothing is simulated between these reads. The world, the clock and the
  // camera are held exactly where they are and only the render path changes, so
  // the brightness difference below is the path's and nothing else's. Letting
  // the world run for a second between samples made this a comparison of two
  // different moments and hid a whole stop of disagreement between the two
  // tone curves.
  const out = [];
  window.__VC.simulate(0.5);
  ctx.game.setPaused(true);
  for (const q of ['medium', 'low', 'potato', 'medium']) {
    ctx.settings.set('quality', q);
    ctx.game.applyQuality();
    const pic = read();
    out.push({
      quality: q,
      direct: !!ctx.renderer._direct,
      calls: gl.info.render.calls,
      programs: gl.info.programs ? gl.info.programs.length : -1,
      night: +(ctx.sky?.palette?.night ?? -1).toFixed(2),
      ...pic,
    });
  }
  ctx.game.setPaused(false);
  return out;
});
if (modes.length) note(`  render-mode pass done at ${((Date.now() - T0) / 1000).toFixed(0)} s`);
if (modes.length) {
note('');
note('render modes: does the composer-free path still draw the city?');
}
for (const m of modes) {
  const ok = m.mean > 8 && m.mean < 245 && m.litFrac > 0.25 && m.max > 40;
  note(`  ${ok ? 'ok    ' : 'WRONG '} ${m.quality.padEnd(7)} ${m.direct ? 'direct ' : 'composer'}`
    + `  ${String(m.calls).padStart(5)} calls, ${String(m.programs).padStart(3)} programs,`
    + ` mean luma ${m.mean.toFixed(1)}, ${(m.litFrac * 100).toFixed(0)}% lit, night ${m.night}`);
  if (!ok) {
    problems.push(`the ${m.quality} preset renders a picture with mean luma ${m.mean.toFixed(1)}`
      + ` and ${(m.litFrac * 100).toFixed(0)}% of pixels lit — that is not a city`);
  }
}
// --- is the city lit at all? --------------------------------------------------
// Half past twelve, clear sky, standing on a road. This is the check that did
// not exist, and its absence let the whole game ship rendering at a fifth of
// daylight: a street view wrote 0.044 in linear light where a correctly exposed
// one sits nearer 0.3, and every count-based check in this file passed happily
// while the player looked at a black screen. Draw calls, triangles, shader
// programs and light counts can all be perfect on a game nobody can see.
const daylight = !want('daylight') ? null : await page.evaluate(() => {
  const ctx = window.__VC.ctx;
  const gl = ctx.renderer.renderer;
  ctx.settings.set('quality', 'medium');
  ctx.settings.data.autoQuality = false;
  ctx.game.applyQuality();
  ctx.time.hour = 12.5;
  ctx.weather.setWeather('clear', true);
  // The widest road there is, looking along it.
  let best = null, bestScore = -1;
  for (const e of ctx.world.roads.edges) {
    const score = (e.lanesPerDir || 1) * 1000 + e.length;
    if (score > bestScore) { bestScore = score; best = e; }
  }
  if (best) {
    const t = 0.18;
    const px = best.a.x + (best.b.x - best.a.x) * t;
    const pz = best.a.z + (best.b.z - best.a.z) * t;
    ctx.player.position.set(px, ctx.physics.groundHeight(px, pz) + 1.0, pz);
    ctx.player.yaw = Math.atan2(best.dx, best.dz);
    ctx.player.bodyYaw = ctx.player.yaw;
    ctx.player.pitch = -0.04;
  }
  window.__VC.simulate(2.5);

  const g = gl.getContext();
  ctx.renderer.render(1 / 60, ctx.time.elapsed);
  gl.setRenderTarget(null);
  const w = Math.max(1, gl.domElement.width | 0);
  const h = Math.max(1, gl.domElement.height | 0);
  const sw = Math.min(160, w), sh = Math.min(90, h);
  const px2 = new Uint8Array(sw * sh * 4);
  g.readPixels(((w - sw) / 2) | 0, ((h - sh) / 2) | 0, sw, sh, g.RGBA, g.UNSIGNED_BYTE, px2);
  let sum = 0, dark = 0, blown = 0, sat = 0;
  for (let i = 0; i < px2.length; i += 4) {
    const r = px2[i], gg = px2[i + 1], b = px2[i + 2];
    const l = r * 0.3 + gg * 0.59 + b * 0.11;
    sum += l;
    if (l < 24) dark++;
    if (l > 248) blown++;
    const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b);
    sat += mx > 0 ? (mx - mn) / mx : 0;
  }
  const n = px2.length / 4;
  return { mean: sum / n, darkFrac: dark / n, blownFrac: blown / n, sat: sat / n,
    sun: +ctx.sky.sun.intensity.toFixed(2), hemi: +ctx.sky.hemi.intensity.toFixed(2),
    env: ctx.scene.environmentIntensity };
});
if (daylight) note(`  daylight pass done at ${((Date.now() - T0) / 1000).toFixed(0)} s`);
if (daylight) {
  note('');
  note('daylight: half past twelve, clear sky, standing on the widest road');
  const d = daylight;
  note(`  mean luma ${d.mean.toFixed(1)}, ${(d.darkFrac * 100).toFixed(0)}% near-black, `
    + `${(d.blownFrac * 100).toFixed(0)}% blown, mean saturation ${(d.sat * 100).toFixed(0)}%`);
  note(`  sun ${d.sun}, sky fill ${d.hemi}, environment ${d.env}`);
  // The floor is 100, and it is worth saying what that does and does not buy.
  // The build that shipped measured 66 here, so this catches it with a third of
  // the band to spare, and the current build measures 128-136 across runs — the
  // spread is where the harness happens to stand and how far the weather has
  // settled, not noise in the reading, and it is what stops this being tightened
  // further. What it will NOT catch is a partial dimming: with the sky gain put
  // back to 1 but the environment probe left alone the street still reads 111
  // and passes. This is a floor against a city nobody can see, not a tuner.
  if (d.mean < 100) problems.push(`a clear midday street reads at luma ${d.mean.toFixed(0)} — the city is not lit`);
  if (d.mean > 225) problems.push(`a clear midday street reads at luma ${d.mean.toFixed(0)} — the city is blown out`);
  if (d.darkFrac > 0.35) problems.push(`${(d.darkFrac * 100).toFixed(0)}% of a clear midday street is near-black`);
  if (d.blownFrac > 0.2) problems.push(`${(d.blownFrac * 100).toFixed(0)}% of a clear midday street is pure white`);
}

// The governor switches between these two paths while the player is standing
// still, so they have to agree on how bright the world is. They did not: the
// composite tone-maps with Narkowicz's ACES fit and three.js's own ACES is the
// full RRT/ODT fit with exposure pre-divided by 0.6, which is most of a stop.
{
  const composed = modes.filter((m) => !m.direct);
  const direct = modes.filter((m) => m.direct);
  if (composed.length && direct.length) {
    const cAvg = composed.reduce((n, m) => n + m.mean, 0) / composed.length;
    const dAvg = direct.reduce((n, m) => n + m.mean, 0) / direct.length;
    const ratio = dAvg / Math.max(cAvg, 0.001);
    const ok = ratio > 0.8 && ratio < 1.25;
    note(`  ${ok ? 'ok    ' : 'WRONG '} the two paths agree on exposure: composer ${cAvg.toFixed(1)}, `
      + `composer-free ${dAvg.toFixed(1)} (${ratio.toFixed(2)}x)`);
    if (!ok) {
      problems.push(`the composer-free path renders the same frame ${ratio.toFixed(2)}x the brightness of the`
        + ` post path — the governor switches between them mid-play, so that is a visible jump`);
    }
  }
}
if (modes.length && !modes.some((m) => m.direct)) {
  problems.push('no preset used the composer-free path — the cheap renderer is unreachable');
}
if (modes.length && !modes.some((m) => !m.direct)) {
  problems.push('every preset used the composer-free path — the post chain is unreachable');
}

if (out) {
note('perf  (one minute of play: walk, nightfall, drive, an explosion, dawn)');
note('label                       programs   calls      tris   lit night  err  scale  quality');
for (const s of out.samples) {
  note(`  ${s.label.padEnd(24)} ${String(s.programs).padStart(8)} ${String(s.calls).padStart(7)} `
    + `${String(s.tris).padStart(9)} ${String(s.lit).padStart(5)} ${String(s.night).padStart(5)} `
    + `${String(s.errors).padStart(4)} ${String(s.scale).padStart(6)} ${s.quality}`);
}

const first = out.samples[0].programs;
const last = out.samples[out.samples.length - 1].programs;
const settledFrom = out.samples[2].programs;     // after walking: the world has been seen
const compiled = last - first;
const afterSettling = last - settledFrom;
const peakCalls = Math.max(...out.samples.map((s) => s.calls));
const peakTris = Math.max(...out.samples.map((s) => s.tris));

note('');
note(`shader programs compiled after boot : ${compiled}  (budget ${MAX_COMPILES_IN_PLAY})`);
note(`   ...of those, after the first walk: ${afterSettling}  (budget ${MAX_COMPILES_AFTER_SETTLING})`);
note(`peak draw calls in a frame          : ${peakCalls}  (budget ${MAX_CALLS})`);
note(`peak triangles in a frame           : ${peakTris}  (budget ${MAX_TRIS})`);
note(`lights in the scene, over the run   : ${out.sceneLights.join(', ')}  (must be one value, at most ${MAX_SCENE_LIGHTS})`);
note(`street lights lit, over the run     : ${out.lit.join(', ')}`);

if (compiled > MAX_COMPILES_IN_PLAY) {
  problems.push(`the game compiled ${compiled} shader programs during one minute of play`
    + ` — every one of those is a stall the player feels`);
}
if (afterSettling > MAX_COMPILES_AFTER_SETTLING) {
  problems.push(`${afterSettling} shader programs were still being compiled after the world had been walked`
    + ` — something is changing the shape of the lighting while the game runs`);
}
if (out.sceneLights.length > 1) {
  problems.push(`the number of lights in the scene changed during play (${out.sceneLights.join(' -> ')})`
    + ` — that is part of every material's shader cache key, so each change recompiles the whole city`);
}
if (out.sceneLights[out.sceneLights.length - 1] > MAX_SCENE_LIGHTS) {
  problems.push(`${out.sceneLights[out.sceneLights.length - 1]} lights in the scene`
    + ` — every one of them is evaluated by every fragment of every lit material`);
}
const errs = out.samples[out.samples.length - 1].errors;
if (errs > 0) {
  problems.push(`the game threw ${errs} runtime error(s) during play — the update loop catches them and carries on,`
    + ` so everything after the throw silently stops running for that frame`);
}
// Night has to actually light the street lights. This is the symptom that
// exposed setGrade: an exception two lines above ctx.lights.update meant the
// city never lit up after dark, and no count anywhere said so.
const litAtNight = out.samples.find((s) => s.label === 'after nightfall');
if (litAtNight && litAtNight.night > 0.5 && litAtNight.lit === 0) {
  problems.push(`night is at ${litAtNight.night} and not one street light is lit`);
}
if (peakCalls > MAX_CALLS) problems.push(`a frame asked for ${peakCalls} draw calls`);
if (peakTris > MAX_TRIS) problems.push(`a frame asked for ${peakTris} triangles`);
}

await browser.close();

note('');
if (problems.length) {
  note('FAIL');
  for (const p of problems) note('  ! ' + p);
  process.exit(1);
}
note(ONLY.length
  ? `pass(es) ${ONLY.join(', ')} clean — this was NOT the full check`
  : 'the frame stays inside its budget and the game stops compiling once it has started');
