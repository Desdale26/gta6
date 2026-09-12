// main.js — boot sequence and the frame loop.
import * as THREE from 'three';
import { Settings } from './core/settings.js';
import { Input } from './core/input.js';
import { bus } from './core/events.js';
import { Renderer } from './engine/renderer.js';
import { AudioSystem } from './audio/audio.js';
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

const ctx = {
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
    ctx.game.update(dt);
    if (render) ctx.renderer.render(dt, ctx.time.elapsed);
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
  ctx.camera = ctx.renderer.camera;
  ctx.input = new Input(el.canvas, ctx.settings);
  ctx.particlesPixelScale = () => ctx.renderer.height;

  setProgress(0.04, 'Tuning the radio');
  ctx.audio = new AudioSystem(ctx);
  await ctx.audio.init((frac) => setProgress(0.04 + frac * 0.06, 'Building sounds'));

  const game = new Game(ctx);
  await game.boot((frac, label) => setProgress(0.10 + frac * 0.88, label));

  ctx.particles.setPixelScale(ctx.renderer.height || window.innerHeight);
  clearInterval(tipTimer);
  setProgress(1, 'Ready');

  // First render primes shaders so the first interactive frame isn't a stutter.
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
