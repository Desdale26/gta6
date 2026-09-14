// main.js — boot sequence and the frame loop.
import * as THREE from 'three';
import { Settings } from './core/settings.js';
import { Input } from './core/input.js';
import { bus } from './core/events.js';
import { Renderer } from './engine/renderer.js';
import { probeDevice, presetForDevice, describeDevice } from './engine/deviceProbe.js';
import { AudioSystem } from './audio/audio.js';
import { Ambience } from './audio/ambience.js';
import { Game } from './gameplay/game.js';

const TIPS = [
  'Hold <b>E</b> while aiming a gun at a shop to rob it instead of shopping there.',
  'Cars land better if you steer with <b>W</b> and <b>S</b> while airborne.',
  'The police lose interest faster if nobody can see you. Alleys and car parks work.',
  'A respray at any auto shop takes some heat off your plate.',
  'Press <b>V</b> to change camera. Cinematic mode is worth it on the coast road.',
  'Every stunt spot on the map has a challenge. Gold pays properly.',
  'Wet roads mean less grip. Watch the puddles after a storm.',
  'Press <b>Tab</b> to open the weapon wheel — time slows while it is open.',
  'Headshots do far more damage. Aim with the right mouse button first.',
  'The radio remembers what you were listening to when you get back in.',
  'Parked cars are often unlocked. Often.',
  'Press <b>M</b> for the full map, then click anywhere to set a waypoint.',
];

const el = {
  loading: document.getElementById('loading'),
  fill: document.getElementById('loadFill'),
  status: document.getElementById('loadStatus'),
  tip: document.getElementById('loadTip'),
  gate: document.getElementById('startGate'),
  startBtn: document.getElementById('startBtn'),
  canvas: document.getElementById('game'),
  hud: document.getElementById('hud'),
  crash: document.getElementById('crashOverlay'),
  crashText: document.getElementById('crashText'),
};

const params = new URLSearchParams(location.search);
const SMOKE = params.get('smoke') === '1';

/** What the last frame actually cost, split by side. Read by the governor. */
const perf = { updateMs: 0, renderMs: 0, workMs: 0 };

const ctx = {
  perf,
  THREE,
  bus,
  settings: new Settings(),
};

// The headless smoke test renders through SwiftShader, so drop to the cheapest preset
// there — we are exercising game logic, not the GPU.
if (SMOKE) {
  ctx.settings.data.quality = 'potato';
  ctx.settings.data.autoQuality = false;
  ctx.settings.data.showFps = true;
}

// Expose a small control surface for the headless smoke test.
window.__VC = {
  ready: false,
  bootStatus: { step: 'starting', progress: 0 },
  ctx,
  simulate: (seconds, renderEvery = 8) => {
    const step = 1 / 60;
    const n = Math.min(2400, Math.ceil(seconds / step));
    for (let i = 0; i < n; i++) tick(step, true, i % renderEvery === 0);
    return n;
  },
  report: () => (ctx.game ? ctx.game.report() : null),
  validate: () => (ctx.game ? ctx.game.validate() : ['game not booted']),
  // Scenario tests drive the real input layer rather than poking at game state.
  hold: (codes) => { for (const c of codes) ctx.input.keys.add(c); },
  release: (codes) => {
    if (codes) for (const c of codes) ctx.input.keys.delete(c);
    else ctx.input.keys.clear();
  },
  press: (code) => { ctx.input.keysDownEdge.add(code); ctx.input.keys.add(code); },
};

function setProgress(frac, label) {
  window.__VC.bootStatus = { step: label, progress: frac };
  el.fill.style.width = `${Math.round(clamp01(frac) * 100)}%`;
  if (label) el.status.textContent = label;
}
function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

function rotateTip() {
  el.tip.innerHTML = TIPS[Math.floor(Math.random() * TIPS.length)];
}

// ---------------------------------------------------------------------------
let lastTime = 0;
let rafId = 0;
let started = false;

function tick(forcedDt, manual, render = true) {
  const now = performance.now();
  let dt = forcedDt !== undefined ? forcedDt : (now - lastTime) / 1000;
  lastTime = now;
  if (!Number.isFinite(dt) || dt <= 0) dt = 1 / 60;
  dt = Math.min(dt, 0.1);

  try {
    // Time the two halves separately. The governor needs to know not just that
    // the frame is late but WHICH side is late — the resolution lever is free
    // money on a machine that is fill-bound and does absolutely nothing on one
    // that is spending its frame simulating eighty cars. It also needs a number
    // that does not saturate: the gap between frames stops at the display's
    // refresh interval, so on a 60 Hz panel a machine with three times the
    // headroom it needs reports exactly the same 16.7 ms as one with none, and
    // a governor reading only that can never work out that it is safe to give
    // quality back.
    const a = performance.now();
    ctx.game.update(dt);
    const b = performance.now();
    if (render) ctx.renderer.render(dt, ctx.time.elapsed);
    const c = performance.now();
    ctx.perf.updateMs = b - a;
    ctx.perf.renderMs = c - b;
    ctx.perf.workMs = c - a;
  } catch (err) {
    handleRuntimeError(err);
  }
  if (!manual) rafId = requestAnimationFrame(() => tick());
}

let errorCount = 0;
function handleRuntimeError(err) {
  errorCount++;
  const msg = (err && (err.stack || err.message)) || String(err);
  console.error('[runtime]', err);
  if (ctx.game) ctx.game.errors.push(msg.split('\n')[0]);
  // A handful of hiccups is survivable; a storm of them is not.
  if (errorCount > 40) {
    cancelAnimationFrame(rafId);
    showCrash(msg);
  }
}

function showCrash(msg) {
  el.crashText.textContent = msg;
  el.crash.classList.remove('hidden');
}

// ---------------------------------------------------------------------------
async function boot() {
  rotateTip();
  const tipTimer = setInterval(rotateTip, 6500);

  setProgress(0.01, 'Starting the engine');
  try {
    ctx.renderer = new Renderer(el.canvas, ctx.settings);
  } catch (err) {
    clearInterval(tipTimer);
    showCrash('WebGL2 could not start on this device.\n\n' + (err.message || err));
    return;
  }
  ctx.gl = ctx.renderer.renderer;          // the raw THREE.WebGLRenderer
  ctx.scene = ctx.renderer.scene;

  // Ask the machine what it is before asking it to draw a city.
  //
  // Every player used to start on the same preset and let the adaptive system
  // find its way down, which meant the first thirty seconds — the window in
  // which someone decides whether a game is broken — was reliably the worst the
  // game would ever look and feel. A saved preference always wins; this only
  // picks the opening setting for someone who has never played before.
  ctx.device = probeDevice(ctx.gl);
  if (!ctx.settings.wasLoaded) {
    const want = presetForDevice(ctx.device);
    if (want !== ctx.settings.data.quality) {
      ctx.settings.set('quality', want);
      ctx.renderer.applyQuality();
    }
  }
  console.log(`[device] ${describeDevice(ctx.device)} -> ${ctx.settings.data.quality}`);
  ctx.camera = ctx.renderer.camera;
  ctx.input = new Input(el.canvas, ctx.settings);

  setProgress(0.04, 'Tuning the radio');
  ctx.audio = new AudioSystem(ctx);
  await ctx.audio.init((frac) => setProgress(0.04 + frac * 0.06, 'Building sounds'));
  ctx.ambience = new Ambience(ctx);

  const game = new Game(ctx);
  await game.boot((frac, label) => setProgress(0.10 + frac * 0.88, label));

  ctx.particles.setPixelScale(ctx.renderer.height || window.innerHeight);
  // ...and again every time the window changes size, which is what the old
  // single call at boot never did.
  ctx.renderer.onResized = (w, h) => ctx.particles.setPixelScale(h);
  // Compile every shader in the city before the player sees the city.
  //
  // "First render primes shaders" was wishful: a render only compiles what is
  // inside the first frame's frustum, which is one street. Every other material
  // compiled the first time the player turned a corner and saw it — a stall, at
  // the exact moment they were moving. renderer.compile walks the whole scene
  // instead, and because the number of lights in the scene is now fixed for the
  // session (see render/lighting.js), what it compiles here is what runs for the
  // rest of the game rather than being invalidated at the next dusk.
  setProgress(0.985, 'Compiling shaders');
  const cam = ctx.renderer.camera;
  const gl3 = ctx.renderer.renderer;
  const compile = async () => {
    // The async form yields between materials, so the loading bar keeps painting
    // instead of the page appearing to hang on a big scene.
    if (gl3.compileAsync) await gl3.compileAsync(ctx.scene, cam);
    else gl3.compile(ctx.scene, cam);
  };
  // Both tone-mapping variants, because there are two renderers in here.
  //
  // The bottom two presets skip the post chain and let the renderer tone-map on
  // the way out; the rest tone-map inside the composite pass. That setting is
  // part of three.js's program cache key, so every material needs a program for
  // whichever mode it is drawn in — and the adaptive governor crosses between
  // them, on the machine least able to afford a compile, at the exact moment it
  // has worked out that machine is in trouble. Compiling both here costs a second
  // or two of a loading screen that is already up, and makes that crossing free.
  const wantTone = gl3.toneMapping;
  gl3.toneMapping = THREE.NoToneMapping;
  await compile();
  gl3.toneMapping = THREE.ACESFilmicToneMapping;
  await compile();
  gl3.toneMapping = wantTone;
  clearInterval(tipTimer);
  setProgress(1, 'Ready');

  ctx.renderer.render(1 / 60, 0);

  el.loading.classList.add('gone');
  setTimeout(() => el.loading.classList.add('hidden'), 900);
  el.gate.classList.remove('hidden');
  el.hud.classList.remove('hidden');

  window.__VC.ready = true;
  lastTime = performance.now();

  if (SMOKE) {
    // Headless: skip the gate, run without pointer lock.
    el.gate.classList.add('hidden');
    ctx.audio.enabled = false;
    started = true;
  } else {
    rafId = requestAnimationFrame(() => tick());
  }
}

el.startBtn.addEventListener('click', () => {
  if (started) return;
  started = true;
  el.gate.classList.add('hidden');
  ctx.audio.resume();
  ctx.input.lockPointer();
  ctx.hud.toast('Vice Coast', 'Press Esc for settings, M for the map', 'info');
  if (ctx.player) {
    ctx.dialogs.play([
      'MONA: You made it. Barely.',
      'MONA: Find me on Ocean Mile when you want to earn something.',
    ]);
  }
});

document.addEventListener('pointerlockchange', () => {
  if (!started || SMOKE) return;
  // Losing the pointer pauses rather than leaving the player standing in traffic.
  if (!document.pointerLockElement && ctx.game && !ctx.menus.isOpen) ctx.game.setPaused(true);
  else if (ctx.game) ctx.game.setPaused(false);
});

el.canvas.addEventListener('click', () => {
  if (started && !ctx.menus?.isOpen && !document.pointerLockElement) {
    ctx.input.lockPointer();
    ctx.game.setPaused(false);
  }
});

window.addEventListener('error', (e) => {
  if (ctx.game) ctx.game.errors.push(String(e.message));
});
window.addEventListener('beforeunload', () => { try { ctx.game?.save(); } catch (err) { /* ignore */ } });

// Autosave every couple of minutes.
setInterval(() => {
  if (ctx.game && ctx.game.running && ctx.settings.get('autoSave') && !ctx.player?.dead) ctx.game.save();
}, 120000);

boot().catch((err) => {
  console.error('[boot] failed', err);
  showCrash((err && (err.stack || err.message)) || String(err));
});
