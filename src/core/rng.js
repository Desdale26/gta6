// rng.js — seeded, deterministic randomness + coherent noise.
// Everything in the world is generated from a single seed so the city is stable
// across reloads and identical for every player.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export class RNG {
  constructor(seed = 1337) {
    this.seed = typeof seed === 'string' ? hashString(seed) : seed >>> 0;
    this._f = mulberry32(this.seed);
    this._spare = null;
  }
  /** Derive a new independent stream — use for sub-generators. */
  fork(tag = '') {
    return new RNG((this.seed ^ hashString(String(tag)) ^ Math.floor(this._f() * 0xffffffff)) >>> 0);
  }
  float() { return this._f(); }
  range(a, b) { return a + (b - a) * this._f(); }
  int(a, b) { return Math.floor(a + (b - a + 1) * this._f()); } // inclusive
  bool(p = 0.5) { return this._f() < p; }
  sign() { return this._f() < 0.5 ? -1 : 1; }
  pick(arr) { return arr[Math.floor(this._f() * arr.length)]; }
  /** Weighted pick. items: [{w, ...}] or parallel weights array. */
  weighted(items, weightFn = (o) => o.w ?? 1) {
    let total = 0;
    for (const it of items) total += weightFn(it);
    let r = this._f() * total;
    for (const it of items) { r -= weightFn(it); if (r <= 0) return it; }
    return items[items.length - 1];
  }
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this._f() * (i + 1));
      const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }
  /** Standard normal (Box–Muller with cached spare). */
  gauss(mean = 0, sd = 1) {
    if (this._spare !== null) { const s = this._spare; this._spare = null; return mean + sd * s; }
    let u, v, s;
    do { u = this._f() * 2 - 1; v = this._f() * 2 - 1; s = u * u + v * v; } while (s >= 1 || s === 0);
    const mul = Math.sqrt((-2 * Math.log(s)) / s);
    this._spare = v * mul;
    return mean + sd * u * mul;
  }
  /** Random point on a disc of radius r. */
  onDisc(r = 1) {
    const a = this._f() * Math.PI * 2;
    const d = Math.sqrt(this._f()) * r;
    return { x: Math.cos(a) * d, z: Math.sin(a) * d };
  }
  hexColor(h0 = 0, h1 = 1, s0 = 0.4, s1 = 0.9, l0 = 0.3, l1 = 0.7) {
    return hslToHex(this.range(h0, h1), this.range(s0, s1), this.range(l0, l1));
  }
}

export function hslToHex(h, s, l) {
  h = ((h % 1) + 1) % 1;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h * 12) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
    return Math.round(255 * c);
  };
  return (f(0) << 16) | (f(8) << 8) | f(4);
}

// ---------------------------------------------------------------------------
// Coherent noise
// ---------------------------------------------------------------------------
const _hash2 = (x, y, seed) => {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
export const hash2 = _hash2;

const _fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);

export function valueNoise2D(x, y, seed = 0) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = _fade(xf), v = _fade(yf);
  const a = _hash2(xi, yi, seed), b = _hash2(xi + 1, yi, seed);
  const c = _hash2(xi, yi + 1, seed), d = _hash2(xi + 1, yi + 1, seed);
  return (a + (b - a) * u) * (1 - v) + (c + (d - c) * u) * v;
}

function _grad(hx, x, y) {
  const a = hx * Math.PI * 2;
  return Math.cos(a) * x + Math.sin(a) * y;
}

/** Perlin-style gradient noise in [-1, 1]. */
export function perlin2D(x, y, seed = 0) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = _fade(xf), v = _fade(yf);
  const n00 = _grad(_hash2(xi, yi, seed), xf, yf);
  const n10 = _grad(_hash2(xi + 1, yi, seed), xf - 1, yf);
  const n01 = _grad(_hash2(xi, yi + 1, seed), xf, yf - 1);
  const n11 = _grad(_hash2(xi + 1, yi + 1, seed), xf - 1, yf - 1);
  return (n00 + (n10 - n00) * u) * (1 - v) + (n01 + (n11 - n01) * u) * v;
}

export function fbm2D(x, y, { octaves = 4, lacunarity = 2, gain = 0.5, seed = 0, freq = 1 } = {}) {
  let amp = 1, f = freq, sum = 0, norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * perlin2D(x * f, y * f, seed + i * 1013);
    norm += amp;
    amp *= gain;
    f *= lacunarity;
  }
  return sum / (norm || 1);
}

/** Ridged multifractal — good for mountains and cloud wisps. */
export function ridged2D(x, y, { octaves = 4, lacunarity = 2, gain = 0.5, seed = 0, freq = 1 } = {}) {
  let amp = 1, f = freq, sum = 0, norm = 0;
  for (let i = 0; i < octaves; i++) {
    const n = 1 - Math.abs(perlin2D(x * f, y * f, seed + i * 7717));
    sum += amp * n * n;
    norm += amp;
    amp *= gain;
    f *= lacunarity;
  }
  return sum / (norm || 1);
}

/** Cheap Worley/cellular noise — returns distance to nearest feature point. */
export function worley2D(x, y, seed = 0) {
  const xi = Math.floor(x), yi = Math.floor(y);
  let best = 8;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const cx = xi + dx, cy = yi + dy;
      const px = cx + _hash2(cx, cy, seed);
      const py = cy + _hash2(cx, cy, seed + 5501);
      const d = (px - x) * (px - x) + (py - y) * (py - y);
      if (d < best) best = d;
    }
  }
  return Math.sqrt(best);
}
