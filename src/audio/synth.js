// synth.js — every sound effect in the game, synthesised numerically into AudioBuffers.
//
// No sample files ship with this project. Guns are a noise burst through a resonant filter
// plus a body thump and a reverberant tail; explosions layer a sub sweep, a filtered roar and
// crackle; sirens are seamless loopable sweeps. Buffers are written sample by sample so this
// module can be tested with a stub AudioContext.

export const LOOPING_SFX = new Set(['sirenWail', 'sirenYelp', 'sirenAir', 'alarmShop', 'alarmCar',
  'rainLoop', 'wind', 'helicopterLoop', 'boatEngine', 'skidLoop', 'fireLoop', 'crowdMurmur',
  'gasLeak', 'radioStatic', 'swim']);

export const SFX_NAMES = [
  'gunPistol', 'gunSmg', 'gunShotgun', 'gunRifle', 'gunSniper', 'gunMg', 'gunSilenced',
  'rocketLaunch', 'explosion', 'explosionBig', 'grenadeBounce', 'bulletWhiz', 'ricochet',
  'impactMetal', 'impactConcrete', 'impactGlass', 'impactFlesh', 'impactWood', 'impactWater',
  'shellDrop', 'reload', 'reloadShotgun', 'dryFire', 'weaponSwitch',
  'punch', 'swing', 'knifeStab', 'bodyFall', 'glassBreak',
  'carCrashLight', 'carCrashHeavy', 'tireScreech', 'tireBlow', 'carDoorOpen', 'carDoorClose',
  'carHorn', 'carHornTruck', 'sirenWail', 'sirenYelp', 'sirenAir', 'alarmShop', 'alarmCar',
  'footstepConcrete', 'footstepGrass', 'footstepSand', 'footstepWater',
  'jumpGrunt', 'landThud', 'splash', 'swim', 'rainLoop', 'thunder', 'wind', 'seagull', 'dogBark',
  'crowdMurmur', 'cashRegister', 'pickupCash', 'pickupHealth', 'pickupArmor', 'pickupWeapon',
  'uiClick', 'uiHover', 'uiConfirm', 'uiCancel', 'uiWanted', 'missionPass', 'missionFail',
  'checkpoint', 'comboUp', 'phoneRing', 'radioStatic', 'helicopterLoop', 'boatEngine',
  'skidLoop', 'fireLoop', 'gasLeak', 'elevatorDing', 'clockTick', 'cameraShutter',
];

// ---------------------------------------------------------------------------
// DSP helpers — all operate on plain Float32Arrays.
// ---------------------------------------------------------------------------
function rngFactory(seed) {
  let a = (seed >>> 0) || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return (((t ^ (t >>> 14)) >>> 0) / 4294967296) * 2 - 1;
  };
}

/** One-pole lowpass with a time-varying cutoff supplied per sample. */
function lowpass(buf, sr, cutoffAt) {
  let y = 0;
  for (let i = 0; i < buf.length; i++) {
    const fc = Math.max(20, Math.min(sr * 0.45, cutoffAt(i / buf.length, i)));
    const a = 1 - Math.exp((-2 * Math.PI * fc) / sr);
    y += a * (buf[i] - y);
    buf[i] = y;
  }
  return buf;
}
function highpass(buf, sr, fc) {
  const rc = 1 / (2 * Math.PI * fc);
  const dt = 1 / sr;
  const a = rc / (rc + dt);
  let prevIn = buf[0], prevOut = 0;
  for (let i = 0; i < buf.length; i++) {
    const x = buf[i];
    prevOut = a * (prevOut + x - prevIn);
    prevIn = x;
    buf[i] = prevOut;
  }
  return buf;
}
/** State-variable bandpass — good for metallic clangs and resonant bodies. */
function bandpass(buf, sr, fc, q) {
  const f = 2 * Math.sin((Math.PI * Math.min(fc, sr * 0.45)) / sr);
  const damp = Math.min(1 / q, 1.4);
  let low = 0, band = 0;
  for (let i = 0; i < buf.length; i++) {
    const high = buf[i] - low - damp * band;
    band += f * high;
    low += f * band;
    buf[i] = band;
  }
  return buf;
}
function add(dst, src, gain = 1, offset = 0) {
  for (let i = 0; i < src.length; i++) {
    const j = i + offset;
    if (j >= dst.length) break;
    dst[j] += src[i] * gain;
  }
  return dst;
}
function envExp(buf, sr, attack, decay, power = 1) {
  const aN = Math.max(1, Math.floor(attack * sr));
  for (let i = 0; i < buf.length; i++) {
    const t = i / sr;
    const a = i < aN ? i / aN : 1;
    const d = Math.exp(-t / Math.max(decay, 1e-4));
    buf[i] *= a * Math.pow(d, power);
  }
  return buf;
}
function noise(len, rnd) {
  const b = new Float32Array(len);
  for (let i = 0; i < len; i++) b[i] = rnd();
  return b;
}
/** Sine/saw/square sweep from f0 to f1 over the buffer. */
function sweep(len, sr, f0, f1, shape = 'sine', curve = 1) {
  const b = new Float32Array(len);
  let phase = 0;
  for (let i = 0; i < len; i++) {
    const t = Math.pow(i / len, curve);
    const f = f0 + (f1 - f0) * t;
    phase += (2 * Math.PI * f) / sr;
    b[i] = shape === 'saw' ? ((phase / Math.PI) % 2) - 1
      : shape === 'square' ? (Math.sin(phase) >= 0 ? 1 : -1)
      : Math.sin(phase);
  }
  return b;
}
/** Cheap Schroeder-ish tail: a few delayed, filtered, decaying copies. */
function reverbTail(src, sr, time, mix, rnd) {
  const out = new Float32Array(src.length);
  out.set(src);
  const taps = 9;
  for (let t = 0; t < taps; t++) {
    // rnd() is bipolar, so take its magnitude and keep the delay strictly positive.
    const d = Math.max(1, Math.floor((0.007 + Math.abs(rnd()) * 0.5 + t * 0.011) * sr * time));
    if (d >= src.length) continue;
    const g = mix * Math.pow(0.62, t + 1);
    for (let i = 0; i < src.length - d; i++) out[i + d] += src[i] * g;
  }
  return out;
}
function normalize(buf, peak = 0.92) {
  let max = 0;
  for (let i = 0; i < buf.length; i++) { const a = Math.abs(buf[i]); if (a > max) max = a; }
  if (max < 1e-6) return buf;
  const k = peak / max;
  for (let i = 0; i < buf.length; i++) buf[i] *= k;
  return buf;
}
/** Force a loop-safe buffer: zero-crossing ends with matched energy. */
function makeLoopable(buf, sr) {
  const fade = Math.min(Math.floor(sr * 0.02), Math.floor(buf.length / 4));
  for (let i = 0; i < fade; i++) {
    const t = i / fade;
    buf[i] *= t;
    buf[buf.length - 1 - i] *= t;
  }
  return buf;
}
function softClip(buf, drive = 1.4) {
  for (let i = 0; i < buf.length; i++) buf[i] = Math.tanh(buf[i] * drive);
  return buf;
}

// ---------------------------------------------------------------------------
// Sound recipes
// ---------------------------------------------------------------------------
function gunshot(sr, { len, body, click, tail, bright, punch = 1 }, rnd) {
  const n = Math.floor(sr * len);
  const out = new Float32Array(n);

  // crack: bright noise through a falling resonant filter
  const crack = noise(n, rnd);
  lowpass(crack, sr, (t) => bright * Math.exp(-t * 9) + 300);
  envExp(crack, sr, 0.0004, 0.028, 1);
  add(out, crack, 0.85 * punch);

  // body: a fast pitch drop, the "thump" you feel
  const thump = sweep(Math.floor(n * 0.35), sr, body, body * 0.35, 'sine', 0.5);
  envExp(thump, sr, 0.0006, 0.05);
  add(out, thump, 0.75 * punch);

  // mechanical click of the action
  const cl = noise(Math.floor(sr * 0.012), rnd);
  bandpass(cl, sr, click, 3);
  envExp(cl, sr, 0.0002, 0.006);
  add(out, cl, 0.3, Math.floor(sr * 0.004));

  // reverberant tail — how big the world sounds
  const wet = reverbTail(out, sr, tail, 0.32, rnd);
  lowpass(wet, sr, () => 4200);
  for (let i = 0; i < n; i++) out[i] = out[i] * 0.82 + wet[i] * 0.5;
  softClip(out, 1.25);
  return normalize(out, 0.95);
}

function impact(sr, { len, freqs, noiseAmt, decay, bright }, rnd) {
  const n = Math.floor(sr * len);
  const out = new Float32Array(n);
  for (let k = 0; k < freqs.length; k++) {
    const f = freqs[k];
    const part = new Float32Array(n);
    let phase = rnd() * Math.PI;
    for (let i = 0; i < n; i++) {
      phase += (2 * Math.PI * f) / sr;
      part[i] = Math.sin(phase);
    }
    envExp(part, sr, 0.0003, decay * (1 - k * 0.14));
    add(out, part, 0.7 / (k + 1));
  }
  if (noiseAmt > 0) {
    const nz = noise(n, rnd);
    lowpass(nz, sr, (t) => bright * Math.exp(-t * 6) + 200);
    envExp(nz, sr, 0.0004, decay * 0.6);
    add(out, nz, noiseAmt);
  }
  return normalize(out, 0.9);
}

function explosionBuf(sr, { len, subFrom, subTo, roar, crackle, tail }, rnd) {
  const n = Math.floor(sr * len);
  const out = new Float32Array(n);

  const sub = sweep(Math.floor(n * 0.55), sr, subFrom, subTo, 'sine', 0.6);
  envExp(sub, sr, 0.004, len * 0.28);
  add(out, sub, 1.0);

  const mid = noise(n, rnd);
  lowpass(mid, sr, (t) => roar * Math.exp(-t * 3.2) + 90);
  envExp(mid, sr, 0.005, len * 0.30);
  add(out, mid, 0.85);

  const hi = noise(Math.floor(n * 0.25), rnd);
  highpass(hi, sr, 1800);
  envExp(hi, sr, 0.001, 0.06);
  add(out, hi, 0.32);

  // crackle: random impulses through a bandpass
  const cr = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    if (rnd() > 0.985) cr[i] = rnd() * Math.exp(-(i / n) * 5) * crackle;
  }
  bandpass(cr, sr, 2400, 2.5);
  add(out, cr, 0.6);

  const wet = reverbTail(out, sr, tail, 0.45, rnd);
  lowpass(wet, sr, () => 2600);
  for (let i = 0; i < n; i++) out[i] = out[i] * 0.8 + wet[i] * 0.6;
  softClip(out, 1.5);
  return normalize(out, 0.98);
}

function siren(sr, { len, f0, f1, rate, shape, duty = 0.5 }, rnd) {
  const n = Math.floor(sr * len);
  const out = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    let m;
    if (shape === 'wail') m = 0.5 - 0.5 * Math.cos(2 * Math.PI * rate * t);
    else if (shape === 'yelp') m = ((rate * t) % 1) < duty ? 1 : 0;
    else m = ((rate * t) % 1) < duty ? 0 : 1;   // two-tone air horn
    const f = f0 + (f1 - f0) * m;
    phase += (2 * Math.PI * f) / sr;
    out[i] = Math.sin(phase) * 0.7 + Math.sin(phase * 2) * 0.22 + Math.sin(phase * 3) * 0.08;
  }
  bandpass(out, sr, 1200, 0.8);
  softClip(out, 1.1);
  normalize(out, 0.8);
  return makeLoopable(out, sr);
}

function footstep(sr, { bright, body, len, grit }, rnd) {
  const n = Math.floor(sr * len);
  const out = noise(n, rnd);
  lowpass(out, sr, (t) => bright * Math.exp(-t * 10) + 120);
  envExp(out, sr, 0.0008, 0.035);
  const b = sweep(Math.floor(n * 0.4), sr, body, body * 0.5, 'sine', 0.6);
  envExp(b, sr, 0.001, 0.02);
  add(out, b, 0.4);
  if (grit > 0) {
    const g = noise(n, rnd);
    highpass(g, sr, 3000);
    envExp(g, sr, 0.001, 0.05);
    add(out, g, grit);
  }
  return normalize(out, 0.62);
}

function tone(sr, freqs, len, { decay = 0.25, wave = 'sine', vibrato = 0 } = {}) {
  const n = Math.floor(sr * len);
  const out = new Float32Array(n);
  for (let k = 0; k < freqs.length; k++) {
    const seg = Math.floor(n / freqs.length);
    let phase = 0;
    for (let i = 0; i < seg; i++) {
      const vib = vibrato ? Math.sin((2 * Math.PI * 6 * i) / sr) * vibrato : 0;
      phase += (2 * Math.PI * (freqs[k] * (1 + vib))) / sr;
      const v = wave === 'square' ? (Math.sin(phase) >= 0 ? 0.7 : -0.7)
        : wave === 'saw' ? ((phase / Math.PI) % 2) - 1 : Math.sin(phase);
      const env = Math.exp(-(i / sr) / decay) * Math.min(1, i / (sr * 0.004));
      out[k * seg + i] += v * env;
    }
  }
  return normalize(out, 0.6);
}

// ---------------------------------------------------------------------------
const RECIPES = {
  gunPistol: (sr, r) => gunshot(sr, { len: 0.55, body: 190, click: 3400, tail: 0.45, bright: 8500 }, r),
  gunSmg: (sr, r) => gunshot(sr, { len: 0.4, body: 230, click: 4200, tail: 0.32, bright: 9500, punch: 0.85 }, r),
  gunShotgun: (sr, r) => gunshot(sr, { len: 0.85, body: 110, click: 2200, tail: 0.7, bright: 6800, punch: 1.35 }, r),
  gunRifle: (sr, r) => gunshot(sr, { len: 0.7, body: 155, click: 3800, tail: 0.6, bright: 11000, punch: 1.15 }, r),
  gunSniper: (sr, r) => gunshot(sr, { len: 1.3, body: 82, click: 3000, tail: 1.1, bright: 12000, punch: 1.5 }, r),
  gunMg: (sr, r) => gunshot(sr, { len: 0.5, body: 140, click: 3600, tail: 0.5, bright: 10000, punch: 1.2 }, r),
  gunSilenced: (sr, r) => {
    const b = gunshot(sr, { len: 0.22, body: 260, click: 5200, tail: 0.12, bright: 2600, punch: 0.5 }, r);
    lowpass(b, sr, () => 1800);
    return normalize(b, 0.55);
  },
  rocketLaunch: (sr, r) => {
    const n = Math.floor(sr * 1.2);
    const out = new Float32Array(n);
    const hiss = noise(n, r);
    lowpass(hiss, sr, (t) => 6000 - t * 3600);
    envExp(hiss, sr, 0.01, 0.42);
    add(out, hiss, 0.8);
    const w = sweep(n, sr, 420, 90, 'saw', 0.7);
    envExp(w, sr, 0.005, 0.3);
    add(out, w, 0.45);
    return normalize(out, 0.92);
  },
  explosion: (sr, r) => explosionBuf(sr, { len: 2.2, subFrom: 90, subTo: 26, roar: 2400, crackle: 0.5, tail: 1.2 }, r),
  explosionBig: (sr, r) => explosionBuf(sr, { len: 4.2, subFrom: 70, subTo: 18, roar: 1800, crackle: 0.8, tail: 2.4 }, r),
  grenadeBounce: (sr, r) => impact(sr, { len: 0.28, freqs: [620, 1450, 2380], noiseAmt: 0.25, decay: 0.06, bright: 5200 }, r),
  bulletWhiz: (sr, r) => {
    const n = Math.floor(sr * 0.3);
    const out = noise(n, r);
    bandpass(out, sr, 2600, 6);
    for (let i = 0; i < n; i++) out[i] *= Math.sin((Math.PI * i) / n);
    return normalize(out, 0.45);
  },
  ricochet: (sr, r) => {
    const n = Math.floor(sr * 0.42);
    const out = sweep(n, sr, 3400, 900, 'sine', 1.6);
    envExp(out, sr, 0.001, 0.14);
    const nz = noise(n, r);
    bandpass(nz, sr, 3800, 5);
    envExp(nz, sr, 0.001, 0.07);
    add(out, nz, 0.5);
    return normalize(out, 0.7);
  },
  impactMetal: (sr, r) => impact(sr, { len: 0.6, freqs: [780, 1630, 2870, 4210], noiseAmt: 0.3, decay: 0.16, bright: 7000 }, r),
  impactConcrete: (sr, r) => impact(sr, { len: 0.24, freqs: [180, 420], noiseAmt: 0.9, decay: 0.05, bright: 4200 }, r),
  impactGlass: (sr, r) => impact(sr, { len: 0.5, freqs: [2400, 3900, 5600, 7200], noiseAmt: 0.55, decay: 0.09, bright: 11000 }, r),
  impactFlesh: (sr, r) => impact(sr, { len: 0.22, freqs: [95, 160], noiseAmt: 0.75, decay: 0.05, bright: 1400 }, r),
  impactWood: (sr, r) => impact(sr, { len: 0.3, freqs: [320, 640, 980], noiseAmt: 0.45, decay: 0.07, bright: 3600 }, r),
  impactWater: (sr, r) => {
    const n = Math.floor(sr * 0.5);
    const out = noise(n, r);
    lowpass(out, sr, (t) => 3200 - t * 2400);
    envExp(out, sr, 0.002, 0.12);
    const bub = sweep(Math.floor(n * 0.5), sr, 420, 1100, 'sine', 1.4);
    envExp(bub, sr, 0.004, 0.08);
    add(out, bub, 0.3);
    return normalize(out, 0.6);
  },
  shellDrop: (sr, r) => impact(sr, { len: 0.34, freqs: [1900, 3100, 4600], noiseAmt: 0.18, decay: 0.055, bright: 8000 }, r),
  reload: (sr, r) => {
    const n = Math.floor(sr * 0.7);
    const out = new Float32Array(n);
    for (const [at, f] of [[0.02, 2600], [0.18, 1800], [0.34, 3200], [0.5, 2200]]) {
      const c = impact(sr, { len: 0.12, freqs: [f, f * 1.7], noiseAmt: 0.35, decay: 0.03, bright: 6000 }, r);
      add(out, c, 0.7, Math.floor(at * sr));
    }
    return normalize(out, 0.6);
  },
  reloadShotgun: (sr, r) => {
    const n = Math.floor(sr * 0.9);
    const out = new Float32Array(n);
    for (let i = 0; i < 4; i++) {
      const c = impact(sr, { len: 0.14, freqs: [1400 + i * 90, 2600], noiseAmt: 0.4, decay: 0.035, bright: 5200 }, r);
      add(out, c, 0.65, Math.floor(i * 0.19 * sr));
    }
    return normalize(out, 0.65);
  },
  dryFire: (sr, r) => impact(sr, { len: 0.1, freqs: [3400, 5200], noiseAmt: 0.2, decay: 0.012, bright: 7000 }, r),
  weaponSwitch: (sr, r) => impact(sr, { len: 0.2, freqs: [1200, 2400], noiseAmt: 0.25, decay: 0.04, bright: 5000 }, r),
  punch: (sr, r) => impact(sr, { len: 0.2, freqs: [110, 190], noiseAmt: 0.7, decay: 0.045, bright: 1800 }, r),
  swing: (sr, r) => {
    const n = Math.floor(sr * 0.26);
    const out = noise(n, r);
    bandpass(out, sr, 900, 1.4);
    for (let i = 0; i < n; i++) out[i] *= Math.sin((Math.PI * i) / n) ** 2;
    return normalize(out, 0.4);
  },
  knifeStab: (sr, r) => impact(sr, { len: 0.28, freqs: [220, 3200], noiseAmt: 0.8, decay: 0.05, bright: 6000 }, r),
  bodyFall: (sr, r) => impact(sr, { len: 0.42, freqs: [72, 130, 210], noiseAmt: 0.85, decay: 0.1, bright: 1200 }, r),
  glassBreak: (sr, r) => {
    const n = Math.floor(sr * 1.1);
    const out = new Float32Array(n);
    for (let i = 0; i < 26; i++) {
      const f = 1800 + r() * 5200;
      const c = impact(sr, { len: 0.3, freqs: [Math.abs(f), Math.abs(f) * 1.6], noiseAmt: 0.3, decay: 0.05, bright: 10000 }, r);
      add(out, c, 0.3, Math.floor(Math.abs(r()) * 0.55 * sr));
    }
    return normalize(out, 0.9);
  },
  carCrashLight: (sr, r) => impact(sr, { len: 0.7, freqs: [190, 420, 880, 1600], noiseAmt: 0.6, decay: 0.14, bright: 5200 }, r),
  // A tyre letting go: the bang of the carcass splitting, then the air leaving.
  tyreBlowout: (sr, r) => {
    const n = Math.floor(sr * 1.4);
    const out = new Float32Array(n);
    add(out, impact(sr, { len: 0.5, freqs: [70, 150, 340], noiseAmt: 0.9, decay: 0.07, bright: 2600 }, r), 1, 0);
    // The hiss: filtered noise fading over a second.
    const hiss = new Float32Array(Math.floor(sr * 1.1));
    for (let i = 0; i < hiss.length; i++) {
      hiss[i] = (r() * 2 - 1) * Math.exp(-i / (sr * 0.34));
    }
    bandpass(hiss, sr, 2400, 0.9);
    add(out, hiss, 0.55, Math.floor(sr * 0.04));
    return normalize(out, 0.75);
  },
  carCrashHeavy: (sr, r) => {
    const n = Math.floor(sr * 1.5);
    const out = new Float32Array(n);
    const metal = impact(sr, { len: 1.2, freqs: [95, 210, 470, 910, 1750], noiseAmt: 0.8, decay: 0.3, bright: 4600 }, r);
    add(out, metal, 1.0);
    const gl = RECIPES.glassBreak(sr, r);
    add(out, gl, 0.4, Math.floor(sr * 0.06));
    return normalize(out, 0.98);
  },
  tireScreech: (sr, r) => {
    const n = Math.floor(sr * 1.4);
    const out = noise(n, r);
    bandpass(out, sr, 2100, 7);
    for (let i = 0; i < n; i++) {
      const t = i / n;
      out[i] *= (0.7 + 0.3 * Math.sin(t * 42)) * Math.min(1, t * 8) * (1 - t * 0.3);
    }
    normalize(out, 0.55);
    return makeLoopable(out, sr);
  },
  tireBlow: (sr, r) => {
    const n = Math.floor(sr * 0.8);
    const out = explosionBuf(sr, { len: 0.8, subFrom: 220, subTo: 60, roar: 3800, crackle: 0.2, tail: 0.3 }, r);
    return normalize(out, 0.8);
  },
  carDoorOpen: (sr, r) => impact(sr, { len: 0.4, freqs: [340, 720], noiseAmt: 0.5, decay: 0.09, bright: 3200 }, r),
  carDoorClose: (sr, r) => impact(sr, { len: 0.34, freqs: [120, 280, 560], noiseAmt: 0.55, decay: 0.07, bright: 2600 }, r),
  carHorn: (sr) => {
    const b = tone(sr, [440, 440], 0.55, { wave: 'square', decay: 4 });
    const b2 = tone(sr, [554, 554], 0.55, { wave: 'square', decay: 4 });
    for (let i = 0; i < b.length; i++) b[i] = b[i] * 0.6 + b2[i] * 0.4;
    return normalize(softClip(b, 1.3), 0.62);
  },
  carHornTruck: (sr) => {
    const b = tone(sr, [160, 160], 0.9, { wave: 'square', decay: 6 });
    const b2 = tone(sr, [214, 214], 0.9, { wave: 'square', decay: 6 });
    for (let i = 0; i < b.length; i++) b[i] = b[i] * 0.6 + b2[i] * 0.4;
    return normalize(softClip(b, 1.5), 0.7);
  },
  sirenWail: (sr, r) => siren(sr, { len: 1.6, f0: 620, f1: 1450, rate: 1, shape: 'wail' }, r),
  sirenYelp: (sr, r) => siren(sr, { len: 0.8, f0: 700, f1: 1500, rate: 4, shape: 'yelp', duty: 0.5 }, r),
  sirenAir: (sr, r) => siren(sr, { len: 1.2, f0: 380, f1: 520, rate: 2, shape: 'air', duty: 0.5 }, r),
  alarmShop: (sr) => {
    const b = tone(sr, [2000, 0, 2000, 0], 1.0, { wave: 'square', decay: 0.12 });
    return makeLoopable(normalize(b, 0.5), sr);
  },
  alarmCar: (sr) => {
    const b = tone(sr, [880, 1320, 880, 1320], 1.2, { wave: 'square', decay: 0.16 });
    return makeLoopable(normalize(b, 0.5), sr);
  },
  footstepConcrete: (sr, r) => footstep(sr, { bright: 5200, body: 180, len: 0.14, grit: 0.15 }, r),
  footstepGrass: (sr, r) => footstep(sr, { bright: 2600, body: 120, len: 0.16, grit: 0.35 }, r),
  footstepSand: (sr, r) => footstep(sr, { bright: 3400, body: 95, len: 0.2, grit: 0.55 }, r),
  footstepWater: (sr, r) => footstep(sr, { bright: 4200, body: 220, len: 0.26, grit: 0.5 }, r),
  jumpGrunt: (sr, r) => {
    const n = Math.floor(sr * 0.32);
    const out = sweep(n, sr, 220, 140, 'saw', 1.2);
    lowpass(out, sr, () => 1200);
    envExp(out, sr, 0.01, 0.09);
    const nz = noise(n, r);
    bandpass(nz, sr, 800, 2);
    envExp(nz, sr, 0.01, 0.08);
    add(out, nz, 0.3);
    return normalize(out, 0.4);
  },
  landThud: (sr, r) => impact(sr, { len: 0.3, freqs: [80, 150], noiseAmt: 0.7, decay: 0.06, bright: 1600 }, r),
  splash: (sr, r) => {
    const n = Math.floor(sr * 1.0);
    const out = noise(n, r);
    lowpass(out, sr, (t) => 5200 * Math.exp(-t * 3) + 220);
    envExp(out, sr, 0.004, 0.22);
    for (let i = 0; i < 10; i++) {
      const b = sweep(Math.floor(sr * 0.12), sr, 500 + Math.abs(r()) * 900, 1600, 'sine', 1.3);
      envExp(b, sr, 0.002, 0.04);
      add(out, b, 0.12, Math.floor(Math.abs(r()) * 0.5 * sr));
    }
    return normalize(out, 0.75);
  },
  swim: (sr, r) => {
    const n = Math.floor(sr * 1.6);
    const out = noise(n, r);
    lowpass(out, sr, () => 1400);
    for (let i = 0; i < n; i++) out[i] *= 0.4 + 0.6 * Math.abs(Math.sin((i / sr) * 3.2));
    normalize(out, 0.35);
    return makeLoopable(out, sr);
  },
  rainLoop: (sr, r) => {
    const n = Math.floor(sr * 4);
    const out = noise(n, r);
    bandpass(out, sr, 4200, 0.7);
    const drops = new Float32Array(n);
    for (let i = 0; i < n; i++) if (r() > 0.9985) drops[i] = r() * 0.7;
    bandpass(drops, sr, 6000, 3);
    add(out, drops, 0.5);
    normalize(out, 0.42);
    return makeLoopable(out, sr);
  },
  thunder: (sr, r) => explosionBuf(sr, { len: 4.5, subFrom: 55, subTo: 20, roar: 900, crackle: 0.9, tail: 3.0 }, r),
  wind: (sr, r) => {
    const n = Math.floor(sr * 5);
    const out = noise(n, r);
    lowpass(out, sr, (t) => 400 + 300 * Math.sin(t * 11));
    for (let i = 0; i < n; i++) out[i] *= 0.6 + 0.4 * Math.sin((i / sr) * 0.8);
    normalize(out, 0.3);
    return makeLoopable(out, sr);
  },
  seagull: (sr, r) => {
    const n = Math.floor(sr * 0.9);
    const out = new Float32Array(n);
    for (let k = 0; k < 3; k++) {
      const c = sweep(Math.floor(sr * 0.16), sr, 1400, 900, 'saw', 0.7);
      lowpass(c, sr, () => 3200);
      envExp(c, sr, 0.01, 0.06);
      add(out, c, 0.8, Math.floor(k * 0.24 * sr));
    }
    return normalize(out, 0.4);
  },
  dogBark: (sr, r) => {
    const n = Math.floor(sr * 0.5);
    const out = new Float32Array(n);
    for (let k = 0; k < 2; k++) {
      const c = sweep(Math.floor(sr * 0.12), sr, 420, 200, 'saw', 0.8);
      lowpass(c, sr, () => 2400);
      envExp(c, sr, 0.004, 0.05);
      add(out, c, 0.9, Math.floor(k * 0.22 * sr));
    }
    return normalize(out, 0.5);
  },
  crowdMurmur: (sr, r) => {
    const n = Math.floor(sr * 5);
    const out = noise(n, r);
    bandpass(out, sr, 700, 0.9);
    for (let i = 0; i < n; i++) out[i] *= 0.5 + 0.5 * Math.sin((i / sr) * 1.7 + Math.sin((i / sr) * 0.4));
    normalize(out, 0.22);
    return makeLoopable(out, sr);
  },
  cashRegister: (sr, r) => {
    const b = tone(sr, [1320, 1760], 0.35, { decay: 0.12 });
    const clack = impact(sr, { len: 0.2, freqs: [420, 900], noiseAmt: 0.4, decay: 0.04, bright: 4000 }, r);
    add(b, clack, 0.5, Math.floor(sr * 0.16));
    return normalize(b, 0.6);
  },
  pickupCash: (sr) => normalize(tone(sr, [880, 1174, 1568], 0.34, { decay: 0.16 }), 0.5),
  pickupHealth: (sr) => normalize(tone(sr, [523, 784, 1046], 0.4, { decay: 0.2 }), 0.5),
  pickupArmor: (sr) => normalize(tone(sr, [392, 587, 784], 0.42, { decay: 0.2 }), 0.5),
  pickupWeapon: (sr) => normalize(tone(sr, [330, 494], 0.28, { wave: 'square', decay: 0.12 }), 0.45),
  uiClick: (sr) => normalize(tone(sr, [1400], 0.06, { decay: 0.02 }), 0.32),
  uiHover: (sr) => normalize(tone(sr, [900], 0.05, { decay: 0.016 }), 0.18),
  uiConfirm: (sr) => normalize(tone(sr, [880, 1320], 0.22, { decay: 0.1 }), 0.36),
  uiCancel: (sr) => normalize(tone(sr, [560, 380], 0.22, { decay: 0.1 }), 0.36),
  uiWanted: (sr) => normalize(tone(sr, [220, 330, 220], 0.7, { wave: 'square', decay: 0.2 }), 0.45),
  missionPass: (sr) => normalize(tone(sr, [523, 659, 784, 1046], 1.1, { decay: 0.4 }), 0.55),
  missionFail: (sr) => normalize(tone(sr, [392, 349, 294, 233], 1.2, { decay: 0.45 }), 0.55),
  checkpoint: (sr) => normalize(tone(sr, [1046, 1568], 0.22, { decay: 0.09 }), 0.45),
  comboUp: (sr) => normalize(tone(sr, [784, 988, 1318], 0.3, { decay: 0.11 }), 0.42),
  phoneRing: (sr) => {
    const b = tone(sr, [1000, 800, 1000, 800], 1.0, { wave: 'square', decay: 0.1 });
    return normalize(b, 0.4);
  },
  radioStatic: (sr, r) => {
    const n = Math.floor(sr * 2);
    const out = noise(n, r);
    bandpass(out, sr, 2400, 1.1);
    normalize(out, 0.22);
    return makeLoopable(out, sr);
  },
  helicopterLoop: (sr, r) => {
    const n = Math.floor(sr * 2);
    const out = new Float32Array(n);
    const bladeHz = 13;
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      const chop = Math.max(0, Math.sin(2 * Math.PI * bladeHz * t)) ** 3;
      out[i] = chop * 0.8;
    }
    const nz = noise(n, r);
    lowpass(nz, sr, () => 900);
    for (let i = 0; i < n; i++) out[i] = out[i] * 0.7 + nz[i] * 0.5;
    const turbine = new Float32Array(n);
    let ph = 0;
    for (let i = 0; i < n; i++) { ph += (2 * Math.PI * 240) / sr; turbine[i] = Math.sin(ph) * 0.15; }
    add(out, turbine, 1);
    normalize(out, 0.55);
    return makeLoopable(out, sr);
  },
  boatEngine: (sr, r) => {
    const n = Math.floor(sr * 2);
    const out = new Float32Array(n);
    let ph = 0;
    for (let i = 0; i < n; i++) {
      ph += (2 * Math.PI * 58) / sr;
      out[i] = (Math.sin(ph) * 0.6 + Math.sin(ph * 2.02) * 0.25 + Math.sin(ph * 3.1) * 0.12);
    }
    const nz = noise(n, r);
    lowpass(nz, sr, () => 700);
    add(out, nz, 0.35);
    softClip(out, 1.2);
    normalize(out, 0.5);
    return makeLoopable(out, sr);
  },
  skidLoop: (sr, r) => RECIPES.tireScreech(sr, r),
  fireLoop: (sr, r) => {
    const n = Math.floor(sr * 3);
    const out = noise(n, r);
    lowpass(out, sr, (t) => 700 + 400 * Math.sin(t * 23));
    const cr = new Float32Array(n);
    for (let i = 0; i < n; i++) if (r() > 0.997) cr[i] = r() * 0.8;
    bandpass(cr, sr, 3200, 3);
    add(out, cr, 0.6);
    normalize(out, 0.4);
    return makeLoopable(out, sr);
  },
  gasLeak: (sr, r) => {
    const n = Math.floor(sr * 2);
    const out = noise(n, r);
    bandpass(out, sr, 5200, 2.4);
    normalize(out, 0.3);
    return makeLoopable(out, sr);
  },
  elevatorDing: (sr) => normalize(tone(sr, [1568, 1046], 0.8, { decay: 0.35 }), 0.4),
  clockTick: (sr, r) => impact(sr, { len: 0.06, freqs: [2800, 4600], noiseAmt: 0.2, decay: 0.008, bright: 8000 }, r),
  cameraShutter: (sr, r) => {
    const n = Math.floor(sr * 0.2);
    const out = new Float32Array(n);
    const a = impact(sr, { len: 0.05, freqs: [3200, 5400], noiseAmt: 0.4, decay: 0.008, bright: 9000 }, r);
    add(out, a, 1);
    add(out, a, 0.8, Math.floor(sr * 0.06));
    return normalize(out, 0.5);
  },
};

/** How many pitch variants of this sound the bank should pre-render. */
export function sfxVariants(name) {
  if (name.startsWith('gun') || name.startsWith('impact') || name.startsWith('footstep')) return 3;
  if (name === 'punch' || name === 'ricochet' || name === 'shellDrop' || name === 'bulletWhiz') return 3;
  if (LOOPING_SFX.has(name)) return 1;
  return 1;
}

/** Render one effect into an AudioBuffer. `opts.variant` gives deterministic variation. */
export function renderSfx(audioCtx, name, opts = {}) {
  const recipe = RECIPES[name];
  const sr = audioCtx.sampleRate || 44100;
  const variant = opts.variant || 0;
  const rnd = rngFactory(hash(name) + variant * 7919);
  let data;
  if (!recipe) {
    // Unknown name: a short quiet blip rather than a crash.
    data = tone(sr, [600], 0.08, { decay: 0.03 });
  } else {
    data = recipe(sr, rnd);
  }
  // Pitch variants shift the buffer by resampling.
  const pitch = opts.pitch ?? (variant ? 1 + ((variant % 3) - 1) * 0.06 : 1);
  if (pitch !== 1) data = resample(data, pitch);

  const len = Math.max(2, data.length);
  const buffer = audioCtx.createBuffer(1, len, sr);
  const ch = buffer.getChannelData(0);
  ch.set(data.subarray(0, len));
  return buffer;
}

function resample(src, ratio) {
  const n = Math.max(2, Math.floor(src.length / ratio));
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const s = i * ratio;
    const i0 = Math.floor(s);
    const f = s - i0;
    const a = src[Math.min(i0, src.length - 1)];
    const b = src[Math.min(i0 + 1, src.length - 1)];
    out[i] = a + (b - a) * f;
  }
  return out;
}

function hash(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/**
 * Render a bank of effects. Yields between sounds so a long build does not block the frame.
 * @returns {Promise<Map<string, AudioBuffer[]>>} name → variant buffers
 */
export async function buildSfxBank(audioCtx, names = SFX_NAMES, onProgress) {
  const bank = new Map();
  const list = names || SFX_NAMES;
  for (let i = 0; i < list.length; i++) {
    const name = list[i];
    const variants = [];
    const count = sfxVariants(name);
    for (let v = 0; v < count; v++) {
      try { variants.push(renderSfx(audioCtx, name, { variant: v })); }
      catch (e) { console.warn('[synth] failed', name, e); }
    }
    if (variants.length) bank.set(name, variants);
    if (onProgress && i % 6 === 0) onProgress(i / list.length, name);
    if (i % 6 === 5) await new Promise((r) => setTimeout(r, 0));
  }
  return bank;
}
