// proctex.js — every texture in the game, generated from noise and canvas drawing.
//
// No image files ship with this project. Each material builds an albedo layer and a matching
// height field; normals come from finite-differencing that height, roughness from the same
// material mask. Everything is tileable (noise lattices wrap at the texture period).
//
// THREE is injected so this module can be imported and unit-tested without a WebGL context.

let THREE = null;
let CANVAS = null;
let DEFAULT_ANISO = 8;
const cache = new Map();

export function initProcTex(three, opts = {}) {
  THREE = three;
  DEFAULT_ANISO = opts.anisotropy ?? 8;
  CANVAS = opts.canvasFactory || defaultCanvasFactory;
  return true;
}

function defaultCanvasFactory(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') {
    try { return new OffscreenCanvas(w, h); } catch (e) { /* fall through */ }
  }
  if (typeof document !== 'undefined') {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }
  throw new Error('proctex: no canvas implementation available');
}

function makeCanvas(w, h) {
  if (!CANVAS) CANVAS = defaultCanvasFactory;
  const c = CANVAS(w, h);
  if (c.width !== w) c.width = w;
  if (c.height !== h) c.height = h;
  return { canvas: c, g: c.getContext('2d') };
}

// ---------------------------------------------------------------------------
// Tileable noise
// ---------------------------------------------------------------------------
function hash2i(x, y, seed) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);

/** Value noise on a lattice that wraps every `period` cells — seamless by construction. */
function tileNoise(x, y, period, seed) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = fade(xf), v = fade(yf);
  const wrap = (n) => ((n % period) + period) % period;
  const x0 = wrap(xi), x1 = wrap(xi + 1), y0 = wrap(yi), y1 = wrap(yi + 1);
  const a = hash2i(x0, y0, seed), b = hash2i(x1, y0, seed);
  const c = hash2i(x0, y1, seed), d = hash2i(x1, y1, seed);
  return (a + (b - a) * u) * (1 - v) + (c + (d - c) * u) * v;
}

function tileFbm(x, y, { octaves = 4, period = 8, seed = 0, gain = 0.5, lac = 2 } = {}) {
  let amp = 1, sum = 0, norm = 0, f = 1, p = period;
  for (let i = 0; i < octaves; i++) {
    sum += amp * tileNoise(x * f, y * f, p, seed + i * 977);
    norm += amp;
    amp *= gain;
    f *= lac; p *= lac;
  }
  return sum / norm;
}

/** Tileable Worley — great for gravel, aggregate and cracks. */
function tileWorley(x, y, period, seed) {
  const xi = Math.floor(x), yi = Math.floor(y);
  let best = 8;
  const wrap = (n) => ((n % period) + period) % period;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const cx = xi + dx, cy = yi + dy;
      const wx = wrap(cx), wy = wrap(cy);
      const px = cx + hash2i(wx, wy, seed);
      const py = cy + hash2i(wx, wy, seed + 5501);
      const d = (px - x) * (px - x) + (py - y) * (py - y);
      if (d < best) best = d;
    }
  }
  return Math.sqrt(best);
}

// ---------------------------------------------------------------------------
// Field helpers
// ---------------------------------------------------------------------------
class Field {
  constructor(size) {
    this.size = size;
    this.rgb = new Uint8ClampedArray(size * size * 4);
    this.height = new Float32Array(size * size);
    this.rough = new Float32Array(size * size);
    this.rgb.fill(255);
    this.rough.fill(0.8);
  }
  set(i, r, g, b, h, rough) {
    const k = i * 4;
    this.rgb[k] = r; this.rgb[k + 1] = g; this.rgb[k + 2] = b; this.rgb[k + 3] = 255;
    this.height[i] = h;
    this.rough[i] = rough;
  }
  /** Run a per-pixel shader: fn(u, v, x, y, i) -> [r,g,b,height,rough] with r/g/b in 0..255. */
  fill(fn) {
    const s = this.size;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const i = y * s + x;
        const out = fn(x / s, y / s, x, y, i);
        this.set(i, out[0], out[1], out[2], out[3], out[4]);
      }
    }
    return this;
  }
}

function heightToNormal(height, size, strength = 2.2) {
  const out = new Uint8ClampedArray(size * size * 4);
  const at = (x, y) => height[(((y % size) + size) % size) * size + (((x % size) + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x - 1, y) - at(x + 1, y)) * strength;
      const dy = (at(x, y - 1) - at(x, y + 1)) * strength;
      const nz = 1;
      const len = Math.hypot(dx, dy, nz) || 1;
      const k = (y * size + x) * 4;
      out[k] = ((dx / len) * 0.5 + 0.5) * 255;
      out[k + 1] = ((dy / len) * 0.5 + 0.5) * 255;
      out[k + 2] = ((nz / len) * 0.5 + 0.5) * 255;
      out[k + 3] = 255;
    }
  }
  return out;
}

function roughToBytes(rough, size) {
  const out = new Uint8ClampedArray(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const v = Math.max(0, Math.min(1, rough[i])) * 255;
    out[i * 4] = v; out[i * 4 + 1] = v; out[i * 4 + 2] = v; out[i * 4 + 3] = 255;
  }
  return out;
}

function dataToTexture(bytes, size, srgb, aniso) {
  const { canvas, g } = makeCanvas(size, size);
  const img = g.createImageData(size, size);
  img.data.set(bytes);
  g.putImageData(img, 0, 0);
  return canvasToTexture(canvas, srgb, aniso);
}

function canvasToTexture(canvas, srgb, aniso) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = aniso ?? DEFAULT_ANISO;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : (THREE.NoColorSpace ?? THREE.LinearSRGBColorSpace);
  t.needsUpdate = true;
  return t;
}

const clamp255 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);
const mixByte = (a, b, t) => a + (b - a) * t;
function hexRgb(hex) { return [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255]; }

// ---------------------------------------------------------------------------
// Generators — each returns a Field
// ---------------------------------------------------------------------------
const GEN = {
  // How dark the road is.
  //
  // The generator below was written to average 0.29 sRGB, which is the very top
  // of the 0.16-0.32 band this texture is checked against and squarely in
  // concrete territory — real tarmac is 0.10 fresh and 0.18 well worn. It did
  // not matter while the city was rendering at a fifth of daylight, because
  // everything was dark. Correctly lit, a 0.29 road renders at sRGB 146 and the
  // street reads as a pale concrete apron with the lane markings barely
  // separating from it. One scale on the finished value, so every feature the
  // generator draws — aggregate, tyre polish, tar seams, cracks — keeps its
  // relative weight and only the overall tone moves. 0.72 lands it at 0.21:
  // still inside the band, still a sunny coast rather than a documentary, and
  // dark enough that the white lines are white.
  asphalt(size, o) {
    const TONE = 0.72;
    const seed = o.seed ?? 1;
    return new Field(size).fill((u, v, x, y) => {
      const aggregate = tileWorley(u * 120, v * 120, 120, seed);
      const grain = tileFbm(u * 48, v * 48, { octaves: 4, period: 48, seed: seed + 3 });
      const patch = tileFbm(u * 6, v * 6, { octaves: 3, period: 6, seed: seed + 9 });
      // tyre-polished lanes running along V
      const lane = Math.abs(Math.sin(u * Math.PI * 2)) ;
      const polish = Math.pow(1 - Math.min(1, Math.abs(u - 0.5) * 3.2), 2) * 0.4;
      // tar seams
      const seam = tileFbm(u * 5 + 3.1, v * 5, { octaves: 2, period: 5, seed: seed + 21 });
      const isSeam = seam > 0.632 && seam < 0.648 ? 1 : 0;
      let base = 46 + grain * 22 + aggregate * 30 + patch * 9;
      base -= polish * 8;
      if (isSeam) base = 34 + grain * 10;
      const cracks = tileWorley(u * 34, v * 34, 34, seed + 77);
      const crack = cracks < 0.018 ? 1 : 0;
      if (crack) base *= 0.74;
      const c = clamp255(base * TONE);
      const h = (grain * 0.4 + aggregate * 0.55 + (isSeam ? -0.4 : 0) - crack * 0.6) * 0.5;
      const rough = 0.95 - polish * 0.28 - aggregate * 0.05;
      return [c, c * 1.0, c * 1.05, h, rough];
    });
  },

  asphaltCracked(size, o) {
    const f = GEN.asphalt(size, o);
    const seed = (o.seed ?? 1) + 400;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = y * size + x;
        const w = tileWorley(x / size * 14, y / size * 14, 14, seed);
        if (w < 0.06) {
          const k = i * 4;
          f.rgb[k] *= 0.45; f.rgb[k + 1] *= 0.45; f.rgb[k + 2] *= 0.45;
          f.height[i] -= 0.5;
        }
      }
    }
    return f;
  },

  concrete(size, o) {
    const seed = o.seed ?? 2;
    // Weathered concrete is around 0.40 in sRGB, not 0.66. The old default sat
    // bright enough that a plaza at midday came out as a sheet of paper.
    const tint = hexRgb(o.color ?? 0x78786f);
    return new Field(size).fill((u, v) => {
      const grain = tileFbm(u * 30, v * 30, { octaves: 5, period: 30, seed });
      const blotch = tileFbm(u * 4, v * 4, { octaves: 3, period: 4, seed: seed + 11 });
      const streak = tileFbm(u * 3, v * 26, { octaves: 3, period: 26, seed: seed + 31 });
      // form-board lines every 1/4
      const board = Math.abs((v * 4) % 1 - 0.5) > 0.487 ? 1 : 0;
      const stain = Math.pow(Math.max(0, streak - 0.5) * 2, 1.7) * (1 - v) * 0.55;
      let k = 0.66 + grain * 0.26 + blotch * 0.26 - stain * 0.38 - board * 0.12;
      const chip = tileWorley(u * 18, v * 18, 18, seed + 5) < 0.05 ? 0.18 : 0;
      k -= chip;
      return [
        clamp255(tint[0] * k), clamp255(tint[1] * k), clamp255(tint[2] * k),
        grain * 0.25 + blotch * 0.2 - board * 0.35 - chip * 1.2,
        0.93 - grain * 0.06 + stain * 0.04,
      ];
    });
  },

  sidewalk(size, o) {
    const seed = o.seed ?? 12;
    const f = GEN.concrete(size, { ...o, seed, color: o.color ?? 0x7d7b74 });
    // paving slab joints
    const cells = 3;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = y * size + x;
        const gx = (x / size * cells) % 1, gy = (y / size * cells) % 1;
        const j = Math.min(gx, 1 - gx, gy, 1 - gy);
        if (j < 0.018) {
          const k = i * 4;
          f.rgb[k] *= 0.72; f.rgb[k + 1] *= 0.72; f.rgb[k + 2] *= 0.72;
          f.height[i] -= 0.55;
          f.rough[i] = 0.97;
        }
      }
    }
    return f;
  },

  kerb(size, o) { return GEN.concrete(size, { ...o, color: 0x8c8a82 }); },

  brick(size, o) {
    const seed = o.seed ?? 3;
    const rows = 12, bw = 1 / 6, bh = 1 / rows;
    const base = hexRgb(o.color ?? 0x7e3b2a);
    const mortar = hexRgb(o.color2 ?? 0x8f8a80);
    return new Field(size).fill((u, v) => {
      const row = Math.floor(v / bh);
      const offset = (row % 2) * bw * 0.5;
      const bx = ((u + offset) % bw) / bw;
      const by = (v % bh) / bh;
      const m = 0.06;
      const isMortar = bx < m || bx > 1 - m || by < m * 2.4 || by > 1 - m * 2.4;
      const col = Math.floor((u + offset) / bw);
      const vary = hash2i(col, row, seed);
      const grain = tileFbm(u * 40, v * 40, { octaves: 3, period: 40, seed: seed + 7 });
      if (isMortar) {
        const k = 0.82 + grain * 0.3;
        return [clamp255(mortar[0] * k), clamp255(mortar[1] * k), clamp255(mortar[2] * k), -0.45 + grain * 0.1, 0.96];
      }
      const k = 0.74 + vary * 0.42 + grain * 0.22;
      const eff = Math.max(0, tileFbm(u * 8, v * 8, { octaves: 2, period: 8, seed: seed + 19 }) - 0.62) * 1.4;
      return [
        clamp255(mixByte(base[0] * k, 210, eff)),
        clamp255(mixByte(base[1] * k, 205, eff)),
        clamp255(mixByte(base[2] * k, 198, eff)),
        0.28 + grain * 0.12 + vary * 0.05,
        0.9 - vary * 0.08,
      ];
    });
  },

  stucco(size, o) {
    const seed = o.seed ?? 4;
    const tint = hexRgb(o.color ?? 0xe6d9c0);
    return new Field(size).fill((u, v) => {
      const bumps = tileWorley(u * 60, v * 60, 60, seed);
      const grain = tileFbm(u * 26, v * 26, { octaves: 4, period: 26, seed: seed + 4 });
      const dirt = Math.pow(Math.max(0, tileFbm(u * 5, v * 14, { octaves: 3, period: 14, seed: seed + 8 }) - 0.48) * 2, 1.6) * (1 - v * 0.6);
      const k = 0.86 + grain * 0.18 + bumps * 0.14 - dirt * 0.3;
      return [clamp255(tint[0] * k), clamp255(tint[1] * k), clamp255(tint[2] * k),
        bumps * 0.5 + grain * 0.25, 0.88 + grain * 0.08];
    });
  },

  warehouseWall(size, o) {
    const seed = o.seed ?? 14;
    const tint = hexRgb(o.color ?? 0x8f9490);
    return new Field(size).fill((u, v) => {
      const panel = Math.abs((v * 5) % 1 - 0.5) > 0.47 ? 1 : 0;
      const grain = tileFbm(u * 24, v * 24, { octaves: 4, period: 24, seed });
      const rust = Math.max(0, tileFbm(u * 6, v * 6, { octaves: 3, period: 6, seed: seed + 3 }) - 0.58) * 2.2 * (1 - v);
      let k = 0.82 + grain * 0.18 - panel * 0.16;
      const r = clamp255(mixByte(tint[0] * k, 150, rust));
      const g = clamp255(mixByte(tint[1] * k, 82, rust));
      const b = clamp255(mixByte(tint[2] * k, 44, rust));
      return [r, g, b, grain * 0.2 - panel * 0.4, 0.82 + rust * 0.14];
    });
  },

  corrugated(size, o) {
    const seed = o.seed ?? 5;
    const tint = hexRgb(o.color ?? 0x9aa0a6);
    return new Field(size).fill((u, v) => {
      const wave = Math.sin(u * Math.PI * 2 * 16);
      const grain = tileFbm(u * 30, v * 30, { octaves: 3, period: 30, seed });
      const rust = Math.max(0, tileFbm(u * 5, v * 9, { octaves: 3, period: 9, seed: seed + 6 }) - 0.6) * 2.4;
      const shade = 0.72 + wave * 0.22 + grain * 0.1;
      return [
        clamp255(mixByte(tint[0] * shade, 138, rust)),
        clamp255(mixByte(tint[1] * shade, 74, rust)),
        clamp255(mixByte(tint[2] * shade, 40, rust)),
        wave * 0.5, 0.52 + rust * 0.4 + grain * 0.05,
      ];
    });
  },

  metalPanel(size, o) {
    const seed = o.seed ?? 6;
    const tint = hexRgb(o.color ?? 0xb8bcc4);
    return new Field(size).fill((u, v) => {
      const brushed = tileFbm(u * 120, v * 6, { octaves: 3, period: 120, seed });
      const panel = (Math.abs((u * 4) % 1 - 0.5) > 0.48 || Math.abs((v * 4) % 1 - 0.5) > 0.48) ? 1 : 0;
      const bolt = tileWorley(u * 4, v * 4, 4, seed + 1) < 0.09 ? 1 : 0;
      const k = 0.86 + brushed * 0.2 - panel * 0.2;
      return [clamp255(tint[0] * k), clamp255(tint[1] * k), clamp255(tint[2] * k),
        -panel * 0.45 + bolt * 0.4 + brushed * 0.05, 0.34 + brushed * 0.14];
    });
  },

  rustMetal(size, o) {
    const seed = o.seed ?? 7;
    return new Field(size).fill((u, v) => {
      const r1 = tileFbm(u * 9, v * 9, { octaves: 5, period: 9, seed });
      const r2 = tileFbm(u * 28, v * 28, { octaves: 3, period: 28, seed: seed + 2 });
      const rust = Math.min(1, Math.max(0, (r1 - 0.36) * 2.3) + r2 * 0.18);
      const metal = 1 - rust;
      return [
        clamp255(150 * metal + 138 * rust + r2 * 24),
        clamp255(154 * metal + 68 * rust + r2 * 16),
        clamp255(158 * metal + 36 * rust + r2 * 10),
        r1 * 0.35 + r2 * 0.2, 0.36 + rust * 0.58,
      ];
    });
  },

  chrome(size, o) {
    const seed = o.seed ?? 8;
    return new Field(size).fill((u, v) => {
      const n = tileFbm(u * 80, v * 80, { octaves: 3, period: 80, seed });
      const c = clamp255(216 + n * 34);
      return [c, c, clamp255(c * 1.02), n * 0.06, 0.08 + n * 0.06];
    });
  },

  sand(size, o) {
    const seed = o.seed ?? 9;
    const tint = hexRgb(o.color ?? 0xa08e6b);
    return new Field(size).fill((u, v) => {
      const grain = tileFbm(u * 90, v * 90, { octaves: 3, period: 90, seed });
      const ripple = Math.sin((u * 9 + tileFbm(u * 4, v * 4, { octaves: 2, period: 4, seed: seed + 5 }) * 5) * Math.PI * 2) * 0.5 + 0.5;
      const shell = tileWorley(u * 34, v * 34, 34, seed + 8) < 0.04 ? 1 : 0;
      const k = 0.86 + grain * 0.18 + ripple * 0.08;
      return [
        clamp255(mixByte(tint[0] * k, 245, shell * 0.6)),
        clamp255(mixByte(tint[1] * k, 240, shell * 0.6)),
        clamp255(mixByte(tint[2] * k, 228, shell * 0.6)),
        grain * 0.3 + ripple * 0.22, 0.97,
      ];
    });
  },

  grass(size, o) {
    const seed = o.seed ?? 10;
    return new Field(size).fill((u, v) => {
      const blade = tileFbm(u * 110, v * 110, { octaves: 3, period: 110, seed });
      const patch = tileFbm(u * 7, v * 7, { octaves: 4, period: 7, seed: seed + 2 });
      const dry = Math.max(0, patch - 0.56) * 1.8;
      const k = 0.72 + blade * 0.4 + patch * 0.22;
      return [
        clamp255(mixByte(56 * k, 148 * k, dry)),
        clamp255(mixByte(96 * k, 134 * k, dry)),
        clamp255(mixByte(38 * k, 68 * k, dry)),
        blade * 0.4, 0.95,
      ];
    });
  },

  dirt(size, o) {
    const seed = o.seed ?? 11;
    return new Field(size).fill((u, v) => {
      const grain = tileFbm(u * 60, v * 60, { octaves: 4, period: 60, seed });
      const clod = tileWorley(u * 20, v * 20, 20, seed + 3);
      const k = 0.72 + grain * 0.3 + clod * 0.2;
      return [clamp255(126 * k), clamp255(96 * k), clamp255(64 * k), grain * 0.3 + clod * 0.35, 0.96];
    });
  },

  gravel(size, o) {
    const seed = o.seed ?? 13;
    return new Field(size).fill((u, v) => {
      const stones = tileWorley(u * 30, v * 30, 30, seed);
      const grain = tileFbm(u * 70, v * 70, { octaves: 3, period: 70, seed: seed + 1 });
      const id = hash2i(Math.floor(u * 30), Math.floor(v * 30), seed);
      const k = 0.55 + stones * 0.9 + grain * 0.2 + id * 0.24;
      const c = clamp255(84 * k);
      return [c, clamp255(c * 0.98), clamp255(c * 0.94), stones * 0.75, 0.9];
    });
  },

  mud(size, o) {
    const f = GEN.dirt(size, { ...o, seed: (o.seed ?? 11) + 60 });
    for (let i = 0; i < size * size; i++) {
      const k = i * 4;
      f.rgb[k] *= 0.62; f.rgb[k + 1] *= 0.58; f.rgb[k + 2] *= 0.5;
      f.rough[i] = 0.52;
    }
    return f;
  },

  marble(size, o) {
    const seed = o.seed ?? 15;
    const tint = hexRgb(o.color ?? 0xe8e6e0);
    return new Field(size).fill((u, v) => {
      const warp = tileFbm(u * 4, v * 4, { octaves: 4, period: 4, seed });
      const vein = Math.abs(Math.sin((u * 3 + warp * 3.4) * Math.PI * 2));
      const veinK = Math.pow(1 - vein, 12);
      const grain = tileFbm(u * 40, v * 40, { octaves: 3, period: 40, seed: seed + 2 });
      const k = 0.92 + grain * 0.1 - veinK * 0.42;
      return [clamp255(tint[0] * k), clamp255(tint[1] * k), clamp255(tint[2] * k), grain * 0.06, 0.18 + veinK * 0.2];
    });
  },

  woodPlank(size, o) {
    const seed = o.seed ?? 16;
    const tint = hexRgb(o.color ?? 0x80613b);
    const planks = 6;
    return new Field(size).fill((u, v) => {
      const row = Math.floor(v * planks);
      const py = (v * planks) % 1;
      const off = hash2i(row, 0, seed) * 0.6;
      const rings = Math.sin((u * 7 + off + tileFbm(u * 5, v * 20, { octaves: 3, period: 20, seed: seed + row }) * 2.2) * Math.PI * 2);
      const grain = tileFbm(u * 90, v * 14, { octaves: 3, period: 90, seed: seed + 3 });
      const joint = py < 0.03 || py > 0.97 ? 1 : 0;
      const vary = 0.85 + hash2i(row, 1, seed) * 0.3;
      const k = (0.78 + rings * 0.14 + grain * 0.16) * vary - joint * 0.4;
      return [clamp255(tint[0] * k), clamp255(tint[1] * k), clamp255(tint[2] * k),
        rings * 0.12 + grain * 0.2 - joint * 0.7, 0.82 - rings * 0.06];
    });
  },
  woodOld(size, o) { return GEN.woodPlank(size, { ...o, color: 0x7a6448, seed: (o.seed ?? 16) + 31 }); },

  tile(size, o) {
    const seed = o.seed ?? 17;
    const tint = hexRgb(o.color ?? 0xd8d5cd);
    const n = 6;
    return new Field(size).fill((u, v) => {
      const tx = (u * n) % 1, ty = (v * n) % 1;
      const joint = Math.min(tx, 1 - tx, ty, 1 - ty) < 0.035 ? 1 : 0;
      const id = hash2i(Math.floor(u * n), Math.floor(v * n), seed);
      const grain = tileFbm(u * 50, v * 50, { octaves: 3, period: 50, seed: seed + 1 });
      const k = (0.9 + id * 0.16 + grain * 0.08) * (joint ? 0.68 : 1);
      return [clamp255(tint[0] * k), clamp255(tint[1] * k), clamp255(tint[2] * k),
        joint ? -0.6 : 0.05 + grain * 0.05, joint ? 0.92 : 0.30 + id * 0.1];
    });
  },

  roofShingle(size, o) {
    const seed = o.seed ?? 18;
    const tint = hexRgb(o.color ?? 0x6b5548);
    const rows = 14;
    return new Field(size).fill((u, v) => {
      const row = Math.floor(v * rows);
      const ry = (v * rows) % 1;
      const off = (row % 2) * 0.5;
      const col = Math.floor((u + off) * 10);
      const cx = ((u + off) * 10) % 1;
      const id = hash2i(col, row, seed);
      const edge = ry > 0.86 ? 1 : 0;
      const side = cx < 0.04 ? 1 : 0;
      const grain = tileFbm(u * 44, v * 44, { octaves: 3, period: 44, seed: seed + 2 });
      const k = 0.78 + id * 0.28 + grain * 0.14 - edge * 0.32 - side * 0.2;
      return [clamp255(tint[0] * k), clamp255(tint[1] * k), clamp255(tint[2] * k),
        (1 - ry) * 0.3 - edge * 0.5, 0.9];
    });
  },
  roofTar(size, o) {
    const seed = (o.seed ?? 19);
    const f = GEN.asphalt(size, { seed: seed + 90 });
    for (let i = 0; i < size * size; i++) {
      const k = i * 4;
      f.rgb[k] *= 0.72; f.rgb[k + 1] *= 0.72; f.rgb[k + 2] *= 0.74;
      f.rough[i] = 0.97;
    }
    return f;
  },

  water(size, o) {
    const seed = o.seed ?? 20;
    return new Field(size).fill((u, v) => {
      const a = tileFbm(u * 12, v * 12, { octaves: 4, period: 12, seed });
      const b = tileFbm(u * 26 + 3, v * 26, { octaves: 3, period: 26, seed: seed + 5 });
      const h = a * 0.6 + b * 0.4;
      return [clamp255(22 + h * 40), clamp255(70 + h * 60), clamp255(96 + h * 66), h, 0.06];
    });
  },
  waterNormal(size, o) { return GEN.water(size, o); },
  ripple(size, o) { return GEN.water(size, { ...o, seed: (o.seed ?? 20) + 44 }); },

  carbonFibre(size, o) {
    const seed = o.seed ?? 21;
    const n = 16;
    return new Field(size).fill((u, v) => {
      const cx = Math.floor(u * n), cy = Math.floor(v * n);
      const diag = (cx + cy) % 2;
      const fx = (u * n) % 1, fy = (v * n) % 1;
      const weave = diag ? Math.sin(fx * Math.PI) : Math.sin(fy * Math.PI);
      const grain = tileFbm(u * 120, v * 120, { octaves: 2, period: 120, seed });
      const k = 0.18 + weave * 0.30 + grain * 0.1;
      const c = clamp255(255 * k);
      return [c, c, clamp255(c * 1.08), weave * 0.25, 0.26 + (1 - weave) * 0.18];
    });
  },

  leather(size, o) {
    const seed = o.seed ?? 22;
    const tint = hexRgb(o.color ?? 0x3c2f2a);
    return new Field(size).fill((u, v) => {
      const cell = tileWorley(u * 36, v * 36, 36, seed);
      const grain = tileFbm(u * 90, v * 90, { octaves: 3, period: 90, seed: seed + 1 });
      const k = 0.78 + cell * 0.4 + grain * 0.14;
      return [clamp255(tint[0] * k), clamp255(tint[1] * k), clamp255(tint[2] * k), cell * 0.4 + grain * 0.15, 0.72 - cell * 0.12];
    });
  },

  denim(size, o) {
    const seed = o.seed ?? 23;
    const tint = hexRgb(o.color ?? 0x3a4d70);
    return new Field(size).fill((u, v) => {
      const warp = Math.sin(u * Math.PI * 2 * 64) * 0.5 + 0.5;
      const weft = Math.sin(v * Math.PI * 2 * 64) * 0.5 + 0.5;
      const grain = tileFbm(u * 50, v * 50, { octaves: 3, period: 50, seed });
      const k = 0.74 + warp * 0.16 + weft * 0.1 + grain * 0.2;
      return [clamp255(tint[0] * k), clamp255(tint[1] * k), clamp255(tint[2] * k), (warp + weft) * 0.12, 0.94];
    });
  },
  cloth(size, o) { return GEN.denim(size, { ...o, color: o.color ?? 0x8a8a92, seed: (o.seed ?? 23) + 12 }); },

  skin(size, o) {
    const seed = o.seed ?? 24;
    const tint = hexRgb(o.color ?? 0xd7a984);
    return new Field(size).fill((u, v) => {
      const pores = tileWorley(u * 80, v * 80, 80, seed);
      const blotch = tileFbm(u * 10, v * 10, { octaves: 3, period: 10, seed: seed + 3 });
      const k = 0.9 + pores * 0.1 + blotch * 0.12;
      return [clamp255(tint[0] * k), clamp255(tint[1] * k * 0.98), clamp255(tint[2] * k * 0.97), pores * 0.1, 0.68];
    });
  },
  hair(size, o) {
    const seed = o.seed ?? 25;
    const tint = hexRgb(o.color ?? 0x24170f);
    return new Field(size).fill((u, v) => {
      const strand = tileFbm(u * 160, v * 10, { octaves: 3, period: 160, seed });
      const k = 0.7 + strand * 0.5;
      return [clamp255(tint[0] * k), clamp255(tint[1] * k), clamp255(tint[2] * k), strand * 0.2, 0.56];
    });
  },

  palmBark(size, o) {
    const seed = o.seed ?? 26;
    return new Field(size).fill((u, v) => {
      const rings = Math.abs(((v * 22) % 1) - 0.5) * 2;
      const fibre = tileFbm(u * 70, v * 30, { octaves: 3, period: 70, seed });
      const k = 0.62 + rings * 0.3 + fibre * 0.26;
      return [clamp255(126 * k), clamp255(106 * k), clamp255(78 * k), rings * 0.5 + fibre * 0.2, 0.93];
    });
  },

  palmFrond(size, o) {
    const seed = o.seed ?? 27;
    const f = new Field(size);
    f.fill((u, v) => {
      // A frond: central rib along v = 0.5, leaflets angled outward, transparent elsewhere.
      const d = Math.abs(v - 0.5);
      const taper = Math.sin(u * Math.PI) * 0.44 + 0.02;
      const leaf = Math.abs(((u * 46) % 1) - 0.5) < 0.34 ? 1 : 0;
      const inside = d < taper && (leaf || d < 0.035);
      if (!inside) return [0, 0, 0, 0, 1];
      const shade = 0.55 + (1 - d / Math.max(taper, 1e-3)) * 0.5 + tileFbm(u * 30, v * 30, { octaves: 2, period: 30, seed }) * 0.2;
      return [clamp255(58 * shade), clamp255(110 * shade), clamp255(44 * shade), 0.2, 0.8];
    });
    // alpha
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = y * size + x, k = i * 4;
        f.rgb[k + 3] = (f.rgb[k] + f.rgb[k + 1] + f.rgb[k + 2]) > 4 ? 255 : 0;
      }
    }
    return f;
  },

  foliage(size, o) {
    const seed = o.seed ?? 28;
    const f = new Field(size);
    f.fill((u, v) => {
      const cx = u - 0.5, cy = v - 0.5;
      const r = Math.hypot(cx, cy);
      const lobes = 0.30 + tileFbm(u * 6, v * 6, { octaves: 3, period: 6, seed }) * 0.22;
      const leafNoise = tileWorley(u * 16, v * 16, 16, seed + 3);
      if (r > lobes || leafNoise > 0.62) return [0, 0, 0, 0, 1];
      const shade = 0.5 + (1 - r / lobes) * 0.55 + leafNoise * 0.5;
      return [clamp255(44 * shade), clamp255(96 * shade), clamp255(40 * shade), leafNoise * 0.3, 0.88];
    });
    for (let i = 0; i < size * size; i++) {
      const k = i * 4;
      f.rgb[k + 3] = (f.rgb[k] + f.rgb[k + 1] + f.rgb[k + 2]) > 4 ? 255 : 0;
    }
    return f;
  },

  hedge(size, o) {
    const seed = o.seed ?? 29;
    return new Field(size).fill((u, v) => {
      const clump = tileWorley(u * 26, v * 26, 26, seed);
      const fine = tileFbm(u * 90, v * 90, { octaves: 3, period: 90, seed: seed + 1 });
      const k = 0.5 + clump * 0.85 + fine * 0.24;
      return [clamp255(40 * k), clamp255(86 * k), clamp255(36 * k), clump * 0.6 + fine * 0.2, 0.95];
    });
  },

  chainlink(size, o) {
    const seed = o.seed ?? 30;
    const f = new Field(size);
    const n = 12;
    f.fill((u, v) => {
      const a = Math.abs(((u * n + v * n) % 1) - 0.5);
      const b = Math.abs(((u * n - v * n) % 1) - 0.5);
      const wire = a < 0.075 || b < 0.075;
      if (!wire) return [0, 0, 0, 0, 1];
      const shade = 0.62 + tileFbm(u * 60, v * 60, { octaves: 2, period: 60, seed }) * 0.4;
      const c = clamp255(168 * shade);
      return [c, c, clamp255(c * 1.04), 0.4, 0.42];
    });
    for (let i = 0; i < size * size; i++) {
      const k = i * 4;
      f.rgb[k + 3] = (f.rgb[k] + f.rgb[k + 1] + f.rgb[k + 2]) > 4 ? 255 : 0;
    }
    return f;
  },
  fence(size, o) { return GEN.chainlink(size, o); },

  tarp(size, o) {
    const seed = o.seed ?? 31;
    const tint = hexRgb(o.color ?? 0x2d5f8a);
    return new Field(size).fill((u, v) => {
      const weave = (Math.sin(u * Math.PI * 2 * 40) + Math.sin(v * Math.PI * 2 * 40)) * 0.25 + 0.5;
      const fold = tileFbm(u * 5, v * 5, { octaves: 3, period: 5, seed });
      const k = 0.72 + weave * 0.2 + fold * 0.26;
      return [clamp255(tint[0] * k), clamp255(tint[1] * k), clamp255(tint[2] * k), fold * 0.4 + weave * 0.08, 0.86];
    });
  },
  canvasAwning(size, o) {
    const seed = o.seed ?? 32;
    const a = hexRgb(o.color ?? 0xc8342f), b = hexRgb(o.color2 ?? 0xf0ece0);
    return new Field(size).fill((u, v) => {
      const stripe = Math.floor(u * 8) % 2;
      const c = stripe ? a : b;
      const weave = tileFbm(u * 80, v * 80, { octaves: 2, period: 80, seed });
      const k = 0.86 + weave * 0.2;
      return [clamp255(c[0] * k), clamp255(c[1] * k), clamp255(c[2] * k), weave * 0.1, 0.88];
    });
  },

  carPaintFlake(size, o) {
    const seed = o.seed ?? 33;
    return new Field(size).fill((u, v) => {
      const n = tileFbm(u * 140, v * 140, { octaves: 2, period: 140, seed });
      const c = clamp255(120 + n * 60);
      return [c, c, c, n * 0.12, 0.2];
    });
  },

  tireTread(size, o) {
    const seed = o.seed ?? 34;
    return new Field(size).fill((u, v) => {
      const block = Math.abs(((v * 16 + Math.sin(u * 6) * 0.4) % 1) - 0.5) < 0.32 ? 1 : 0;
      const groove = Math.abs(u - 0.5) < 0.06 ? 0 : 1;
      const grain = tileFbm(u * 60, v * 60, { octaves: 2, period: 60, seed });
      const k = 0.12 + block * groove * 0.16 + grain * 0.08;
      const c = clamp255(255 * k);
      return [c, c, clamp255(c * 1.05), block * groove * 0.55, 0.95];
    });
  },

  smoke(size, o) {
    const seed = o.seed ?? 35;
    const f = new Field(size);
    f.fill((u, v) => {
      const cx = u - 0.5, cy = v - 0.5;
      const r = Math.hypot(cx, cy) * 2;
      const puff = tileFbm(u * 5, v * 5, { octaves: 4, period: 5, seed });
      const a = Math.max(0, 1 - r) * (0.55 + puff * 0.75);
      const c = clamp255(255 * (0.8 + puff * 0.25));
      return [c, c, c, a, 1];
    });
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = y * size + x, k = i * 4;
        f.rgb[k + 3] = clamp255(f.height[i] * 255);
      }
    }
    return f;
  },

  spark(size, o) {
    const f = new Field(size);
    f.fill((u, v) => {
      const cx = u - 0.5, cy = v - 0.5;
      const r = Math.hypot(cx, cy) * 2;
      const a = Math.pow(Math.max(0, 1 - r), 2.4);
      return [255, clamp255(210 + a * 45), clamp255(150 + a * 100), a, 1];
    });
    for (let i = 0; i < size * size; i++) f.rgb[i * 4 + 3] = clamp255(f.height[i] * 255);
    return f;
  },

  bulletHole(size, o) {
    const seed = o.seed ?? 36;
    const f = new Field(size);
    f.fill((u, v) => {
      const cx = u - 0.5, cy = v - 0.5;
      const r = Math.hypot(cx, cy) * 2;
      const crack = tileFbm(u * 9, v * 9, { octaves: 3, period: 9, seed });
      const hole = r < 0.22 ? 1 : 0;
      const ring = Math.max(0, 1 - Math.abs(r - 0.3) * 6) * 0.8;
      const spall = Math.max(0, 1 - r * 1.5) * crack * 0.75;
      const a = Math.min(1, hole + ring * 0.8 + spall);
      const lum = hole ? 14 : clamp255(120 - ring * 70 + crack * 40);
      return [lum, lum, lum, a, 1];
    });
    for (let i = 0; i < size * size; i++) f.rgb[i * 4 + 3] = clamp255(f.height[i] * 255);
    return f;
  },

  bloodSplat(size, o) {
    const seed = o.seed ?? 37;
    const f = new Field(size);
    f.fill((u, v) => {
      const cx = u - 0.5, cy = v - 0.5;
      const ang = Math.atan2(cy, cx);
      const r = Math.hypot(cx, cy) * 2;
      const edge = 0.55 + tileFbm(Math.cos(ang) * 2 + 2, Math.sin(ang) * 2 + 2, { octaves: 4, period: 4, seed }) * 0.5;
      const blob = r < edge ? 1 : 0;
      const drop = tileWorley(u * 7, v * 7, 7, seed + 4) < 0.10 && r < 1.0 ? 1 : 0;
      const a = Math.min(1, blob + drop * 0.85);
      const dark = 0.55 + (1 - r) * 0.4;
      return [clamp255(128 * dark), clamp255(12 * dark), clamp255(14 * dark), a, 1];
    });
    for (let i = 0; i < size * size; i++) f.rgb[i * 4 + 3] = clamp255(f.height[i] * 255);
    return f;
  },

  tireMark(size, o) {
    const f = new Field(size);
    const seed = o.seed ?? 38;
    f.fill((u, v) => {
      const across = Math.abs(v - 0.5) * 2;
      const edge = Math.pow(Math.max(0, 1 - across), 0.55);
      const tread = 0.72 + tileFbm(u * 26, v * 8, { octaves: 2, period: 26, seed }) * 0.5;
      const a = edge * tread;
      return [18, 17, 19, a, 1];
    });
    for (let i = 0; i < size * size; i++) f.rgb[i * 4 + 3] = clamp255(f.height[i] * 210);
    return f;
  },

  scorch(size, o) {
    const seed = o.seed ?? 39;
    const f = new Field(size);
    f.fill((u, v) => {
      const r = Math.hypot(u - 0.5, v - 0.5) * 2;
      const n = tileFbm(u * 7, v * 7, { octaves: 4, period: 7, seed });
      const a = Math.max(0, 1 - r / (0.72 + n * 0.4));
      const c = clamp255(30 + n * 30);
      return [c, clamp255(c * 0.92), clamp255(c * 0.86), Math.pow(a, 1.4), 1];
    });
    for (let i = 0; i < size * size; i++) f.rgb[i * 4 + 3] = clamp255(f.height[i] * 235);
    return f;
  },

  glassCrack(size, o) {
    const seed = o.seed ?? 40;
    const f = new Field(size);
    f.fill((u, v) => {
      const cx = u - 0.5, cy = v - 0.5;
      const ang = Math.atan2(cy, cx);
      const r = Math.hypot(cx, cy) * 2;
      const spokes = Math.abs(Math.sin(ang * 7 + tileFbm(u * 4, v * 4, { octaves: 2, period: 4, seed }) * 4));
      const rad = spokes > 0.93 && r < 0.95 ? 1 : 0;
      const rings = Math.abs(Math.sin(r * 11)) > 0.96 && r < 0.8 ? 1 : 0;
      const a = Math.min(1, rad + rings) * Math.max(0, 1 - r * 0.8);
      return [235, 245, 255, a, 1];
    });
    for (let i = 0; i < size * size; i++) f.rgb[i * 4 + 3] = clamp255(f.height[i] * 255);
    return f;
  },

  groundDetail(size, o) {
    const seed = o.seed ?? 41;
    // This multiplies the terrain's per-district tint, and at a mean of 180 it
    // was washing every surface in the city out to near-white. Real ground --
    // dirt, worn concrete, packed sand -- sits near 0.45 in sRGB, and it is not
    // uniform: there are patches, and there is grit.
    return new Field(size).fill((u, v) => {
      const grit = tileFbm(u * 64, v * 64, { octaves: 4, period: 64, seed });
      const patch = tileFbm(u * 5, v * 5, { octaves: 3, period: 5, seed: seed + 17 });
      const c = clamp255(78 + grit * 46 + patch * 34);
      return [c, c * 0.99, c * 0.96, grit * 0.42 + patch * 0.18, 0.92 - grit * 0.05];
    });
  },

  licensePlate(size, o) {
    const seed = o.seed ?? 42;
    return new Field(size).fill((u, v) => {
      const border = (u < 0.04 || u > 0.96 || v < 0.09 || v > 0.91) ? 1 : 0;
      const n = tileFbm(u * 40, v * 40, { octaves: 2, period: 40, seed });
      const k = 0.94 + n * 0.1;
      if (border) return [clamp255(40 * k), clamp255(70 * k), clamp255(140 * k), 0, 0.4];
      return [clamp255(238 * k), clamp255(238 * k), clamp255(226 * k), 0, 0.42];
    });
  },

  cloud(size, o) {
    const seed = o.seed ?? 43;
    const f = new Field(size);
    f.fill((u, v) => {
      const n = tileFbm(u * 4, v * 4, { octaves: 5, period: 4, seed });
      const a = Math.max(0, n - 0.42) * 2.1;
      const c = clamp255(230 + n * 25);
      return [c, c, c, Math.min(1, a), 1];
    });
    for (let i = 0; i < size * size; i++) f.rgb[i * 4 + 3] = clamp255(f.height[i] * 255);
    return f;
  },

  star(size, o) {
    const f = new Field(size);
    f.fill((u, v) => {
      const r = Math.hypot(u - 0.5, v - 0.5) * 2;
      const a = Math.pow(Math.max(0, 1 - r), 5);
      return [255, 255, 255, a, 1];
    });
    for (let i = 0; i < size * size; i++) f.rgb[i * 4 + 3] = clamp255(f.height[i] * 255);
    return f;
  },
  moon(size, o) { return GEN.star(size, o); },
  sunFlare(size, o) { return GEN.spark(size, o); },
  muzzleFlash(size, o) { return GEN.spark(size, o); },
  lightFalloff(size, o) { return GEN.spark(size, o); },
  rain(size, o) {
    const seed = o.seed ?? 44;
    const f = new Field(size);
    f.fill((u, v) => {
      const streak = Math.abs(u - 0.5) < 0.06 ? 1 : 0;
      const a = streak * Math.pow(Math.sin(v * Math.PI), 0.6) * (0.5 + hash2i(0, Math.floor(v * 30), seed) * 0.5);
      return [220, 236, 255, a, 1];
    });
    for (let i = 0; i < size * size; i++) f.rgb[i * 4 + 3] = clamp255(f.height[i] * 255);
    return f;
  },

  manhole(size, o) {
    const seed = o.seed ?? 45;
    return new Field(size).fill((u, v) => {
      const r = Math.hypot(u - 0.5, v - 0.5) * 2;
      if (r > 0.92) return [70, 70, 72, -0.2, 0.95];
      const rings = Math.abs(Math.sin(r * 22)) > 0.6 ? 1 : 0;
      const n = tileFbm(u * 30, v * 30, { octaves: 2, period: 30, seed });
      const k = 0.42 + rings * 0.22 + n * 0.2;
      const c = clamp255(150 * k);
      return [c, clamp255(c * 0.96), clamp255(c * 0.9), rings * 0.4, 0.62];
    });
  },
  grate(size, o) {
    const seed = o.seed ?? 46;
    return new Field(size).fill((u, v) => {
      const bar = Math.abs(((v * 12) % 1) - 0.5) < 0.28 ? 1 : 0;
      const n = tileFbm(u * 40, v * 40, { octaves: 2, period: 40, seed });
      const c = clamp255((bar ? 120 : 26) * (0.85 + n * 0.3));
      return [c, c, clamp255(c * 1.03), bar * 0.5, bar ? 0.5 : 0.95];
    });
  },
  trash(size, o) {
    const seed = o.seed ?? 47;
    return new Field(size).fill((u, v) => {
      const n = tileFbm(u * 22, v * 22, { octaves: 4, period: 22, seed });
      const c = clamp255(90 + n * 110);
      return [c, clamp255(c * 0.95), clamp255(c * 0.88), n * 0.3, 0.9];
    });
  },
  pipe(size, o) { return GEN.metalPanel(size, { ...o, color: 0x8f9298 }); },
  vent(size, o) { return GEN.grate(size, o); },
  ac(size, o) { return GEN.metalPanel(size, { ...o, color: 0xa8aaa8 }); },
  solarPanel(size, o) {
    const seed = o.seed ?? 48;
    return new Field(size).fill((u, v) => {
      const cellX = Math.abs(((u * 8) % 1) - 0.5) > 0.46 ? 1 : 0;
      const cellY = Math.abs(((v * 8) % 1) - 0.5) > 0.46 ? 1 : 0;
      const n = tileFbm(u * 40, v * 40, { octaves: 2, period: 40, seed });
      const grid = cellX || cellY;
      const k = grid ? 0.7 : 0.28 + n * 0.12;
      return [clamp255(30 * k * 3), clamp255(44 * k * 3), clamp255(96 * k * 3), grid * 0.2, grid ? 0.6 : 0.16];
    });
  },
};

// --- Facade generators (drawn with Canvas2D for crisp windows) ------------------
function facadeCanvas(size, opts, style) {
  const { canvas, g } = makeCanvas(size, size);
  const seed = opts.seed ?? 1;
  const lit = !!opts.lit;

  // Height and roughness alongside the colour. Without these a facade is pure
  // flat albedo: the windows are painted on, they catch the light exactly like
  // the wall does, and the whole building reads as a coloured slab no matter
  // how much detail is drawn into the texture. Recessed glass, proud sills and
  // frames, and glass that is smooth where the wall is rough are what make a
  // facade look built.
  const H = lit ? null : new Float32Array(size * size).fill(0.55);
  const R = lit ? null : new Float32Array(size * size).fill(0.90);
  const paint = (arr, val, x0, y0, w0, h0) => {
    if (!arr) return;
    const xs = Math.max(0, Math.round(x0)), xe = Math.min(size, Math.round(x0 + w0));
    const ys = Math.max(0, Math.round(y0)), ye = Math.min(size, Math.round(y0 + h0));
    for (let yy = ys; yy < ye; yy++) {
      const o = yy * size;
      for (let xx = xs; xx < xe; xx++) arr[o + xx] = val;
    }
  };
  const cols = style.cols, rows = style.rows;
  const wallCol = opts.color !== undefined ? opts.color : style.wall;
  const [wr, wg, wb] = hexRgb(wallCol);

  // wall base with vertical grain
  const grad = g.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, `rgb(${clamp255(wr * 1.06)},${clamp255(wg * 1.06)},${clamp255(wb * 1.06)})`);
  grad.addColorStop(1, `rgb(${clamp255(wr * 0.86)},${clamp255(wg * 0.86)},${clamp255(wb * 0.86)})`);
  g.fillStyle = lit ? '#000' : grad;
  g.fillRect(0, 0, size, size);

  if (!lit) {
    // concrete speckle
    const img = g.getImageData(0, 0, size, size);
    const d = img.data;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const n = tileFbm(x / size * 30, y / size * 30, { octaves: 3, period: 30, seed });
        const k = 0.92 + n * 0.18;
        const i = (y * size + x) * 4;
        d[i] = clamp255(d[i] * k); d[i + 1] = clamp255(d[i + 1] * k); d[i + 2] = clamp255(d[i + 2] * k);
      }
    }
    g.putImageData(img, 0, 0);
  }

  const cw = size / cols, ch = size / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * cw, y = r * ch;
      const pad = style.pad;
      const wx = x + cw * pad, wy = y + ch * pad;
      const ww = cw * (1 - pad * 2), wh = ch * (1 - pad * 2 - style.sill);
      const h = hash2i(c, r, seed);
      if (lit) {
        // Emissive pass: only some windows are on, warm, varied, and brightest in the middle
        // so they read as rooms rather than solid slabs of light.
        const on = h > (style.litChance ?? 0.55);
        if (!on) continue;
        const warm = hash2i(c, r, seed + 9);
        const col = `rgb(${clamp255(190 + warm * 60)},${clamp255(138 + warm * 72)},${clamp255(72 + warm * 86)})`;
        g.fillStyle = col;
        g.globalAlpha = (0.18 + warm * 0.26) * (style.litScale ?? 1);
        g.fillRect(wx, wy, ww, wh);
        g.globalAlpha = (0.34 + warm * 0.42) * (style.litScale ?? 1);
        g.fillRect(wx + ww * 0.16, wy + wh * 0.12, ww * 0.68, wh * 0.62);
        g.globalAlpha = 1;
        continue;
      }
      // glass — recessed into the wall, and smooth where the wall is rough
      const tintK = 0.7 + h * 0.5;
      g.fillStyle = style.glass(tintK, h);
      g.fillRect(wx, wy, ww, wh);
      paint(H, 0.24, wx, wy, ww, wh);
      paint(R, 0.08, wx, wy, ww, wh);

      // Reveal shadow: the head and one jamb of a real opening are always in
      // shadow, and that shading is most of what tells you it is a hole.
      const revealH = Math.max(1, wh * 0.16), revealW = Math.max(1, ww * 0.12);
      const head = g.createLinearGradient(0, wy, 0, wy + revealH);
      head.addColorStop(0, 'rgba(0,0,0,0.55)');
      head.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = head;
      g.fillRect(wx, wy, ww, revealH);
      const jamb = g.createLinearGradient(wx, 0, wx + revealW, 0);
      jamb.addColorStop(0, 'rgba(0,0,0,0.40)');
      jamb.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = jamb;
      g.fillRect(wx, wy, revealW, wh);
      // reflection highlight
      g.fillStyle = `rgba(255,255,255,${0.05 + h * 0.12})`;
      g.beginPath();
      g.moveTo(wx, wy + wh);
      g.lineTo(wx + ww * 0.55, wy);
      g.lineTo(wx + ww, wy);
      g.lineTo(wx + ww, wy + wh * 0.3);
      g.closePath();
      g.fill();
      // frame — stands proud of the glass
      g.strokeStyle = style.frame;
      const fw = Math.max(1, size / 260);
      g.lineWidth = fw;
      g.strokeRect(wx, wy, ww, wh);
      paint(H, 0.64, wx - fw, wy - fw, ww + fw * 2, fw * 2);
      paint(H, 0.64, wx - fw, wy + wh - fw, ww + fw * 2, fw * 2);
      paint(H, 0.64, wx - fw, wy - fw, fw * 2, wh + fw * 2);
      paint(H, 0.64, wx + ww - fw, wy - fw, fw * 2, wh + fw * 2);
      paint(R, 0.55, wx - fw, wy - fw, ww + fw * 2, wh + fw * 2);
      paint(H, 0.24, wx + fw, wy + fw, ww - fw * 2, wh - fw * 2);
      paint(R, 0.08, wx + fw, wy + fw, ww - fw * 2, wh - fw * 2);
      if (style.mullion) {
        g.beginPath();
        g.moveTo(wx + ww * 0.5, wy); g.lineTo(wx + ww * 0.5, wy + wh);
        g.moveTo(wx, wy + wh * 0.5); g.lineTo(wx + ww, wy + wh * 0.5);
        g.stroke();
      }
      // sill / balcony — proud of the wall, and the dirt that runs off it is
      // what stops a facade looking freshly extruded.
      if (style.sill > 0) {
        const sx = x + cw * pad * 0.5, sw = ww + cw * pad, sh = ch * style.sill * 0.55;
        g.fillStyle = style.sillColor;
        g.fillRect(sx, wy + wh, sw, sh);
        paint(H, 0.80, sx, wy + wh, sw, sh);
        paint(R, 0.92, sx, wy + wh, sw, sh);
        const runoff = g.createLinearGradient(0, wy + wh + sh, 0, wy + wh + sh + ch * 0.30);
        runoff.addColorStop(0, `rgba(28,26,24,${0.20 + h * 0.14})`);
        runoff.addColorStop(1, 'rgba(28,26,24,0)');
        g.fillStyle = runoff;
        g.fillRect(sx + sw * 0.1, wy + wh + sh, sw * 0.8, ch * 0.30);
      }
      if (style.ac && hash2i(c, r, seed + 3) > 0.78) {
        g.fillStyle = '#8e9296';
        g.fillRect(wx + ww * 0.55, wy + wh * 0.62, ww * 0.36, wh * 0.3);
        paint(H, 0.95, wx + ww * 0.55, wy + wh * 0.62, ww * 0.36, wh * 0.3);
        paint(R, 0.70, wx + ww * 0.55, wy + wh * 0.62, ww * 0.36, wh * 0.3);
      }
    }
  }
  // floor separator lines — a real spandrel band, not just a dark line
  if (style.bands) {
    const bh = Math.max(2, ch * 0.05);
    for (let r = 0; r <= rows; r++) {
      const by = r * ch - bh * 0.5;
      g.fillStyle = 'rgba(0,0,0,0.16)';
      g.fillRect(0, by, size, bh);
      paint(H, 0.72, 0, by, size, bh);
      paint(R, 0.92, 0, by, size, bh);
    }
  }
  return { canvas, field: H ? { height: H, rough: R } : null };
}

const FACADES = {
  glassFacade: { cols: 8, rows: 10, pad: 0.045, sill: 0, mullion: true, bands: false, ac: false, litChance: 0.70, litScale: 0.9,
    wall: 0x6d7d88, frame: 'rgba(84,96,108,0.9)',
    glass: (k, h) => `rgb(${clamp255(62 * k + h * 34)},${clamp255(104 * k + h * 40)},${clamp255(134 * k + h * 44)})` },
  officeFacade: { cols: 6, rows: 8, pad: 0.10, sill: 0.06, mullion: true, bands: true, ac: false, litChance: 0.66, litScale: 0.85,
    wall: 0xb4b1a8, frame: 'rgba(78,78,84,0.85)', sillColor: 'rgba(168,165,158,0.9)',
    glass: (k, h) => `rgb(${clamp255(58 * k + h * 26)},${clamp255(76 * k + h * 28)},${clamp255(94 * k + h * 32)})` },
  apartmentFacade: { cols: 5, rows: 7, pad: 0.14, sill: 0.12, mullion: false, bands: true, ac: true, litChance: 0.58, litScale: 0.8,
    wall: 0xc9b89b, frame: 'rgba(70,64,56,0.85)', sillColor: 'rgba(190,180,162,0.95)',
    glass: (k, h) => `rgb(${clamp255(64 * k + h * 26)},${clamp255(70 * k + h * 26)},${clamp255(80 * k + h * 28)})` },
  artdeco: { cols: 4, rows: 6, pad: 0.16, sill: 0.10, mullion: true, bands: true, ac: false, litChance: 0.6, litScale: 0.9,
    wall: 0xf0dfc4, frame: 'rgba(180,120,80,0.9)', sillColor: 'rgba(226,206,178,0.95)',
    glass: (k, h) => `rgb(${clamp255(48 * k + h * 16)},${clamp255(56 * k + h * 18)},${clamp255(70 * k + h * 20)})` },
  shopFront: { cols: 3, rows: 2, pad: 0.08, sill: 0.05, mullion: true, bands: false, ac: false, litChance: 0.4, litScale: 1.0,
    wall: 0xb0a898, frame: 'rgba(40,40,44,0.9)', sillColor: 'rgba(150,144,132,0.9)',
    glass: (k, h) => `rgb(${clamp255(26 * k + h * 30)},${clamp255(32 * k + h * 34)},${clamp255(40 * k + h * 38)})` },
};

// --- Road markings, signs, misc drawn textures ---------------------------------
function roadLineCanvas(size, opts) {
  const { canvas, g } = makeCanvas(size, size);
  g.fillStyle = 'rgba(0,0,0,0)';
  g.clearRect(0, 0, size, size);
  const q = size / 2;
  // Quadrant atlas: TL dashed white, TR double yellow, BL solid white, BR crosswalk white
  g.fillStyle = '#eceff2';
  g.fillRect(q * 0.04, q * 0.04, q * 0.42, q * 0.92);      // 0.02..0.23 in u
  g.fillStyle = '#f2c53d';
  g.fillRect(q + q * 0.04, q * 0.04, q * 0.42, q * 0.92);  // 0.52..0.73
  g.fillStyle = '#eceff2';
  g.fillRect(q * 0.04, q + q * 0.04, q * 0.42, q * 0.92);  // v 0.52..0.98
  const img = g.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < size * size; i++) {
    if (d[i * 4 + 3] > 0) {
      const n = tileFbm((i % size) / size * 40, Math.floor(i / size) / size * 40, { octaves: 2, period: 40, seed: 7 });
      const k = 0.82 + n * 0.3;
      d[i * 4] = clamp255(d[i * 4] * k);
      d[i * 4 + 1] = clamp255(d[i * 4 + 1] * k);
      d[i * 4 + 2] = clamp255(d[i * 4 + 2] * k);
      d[i * 4 + 3] = clamp255(210 + n * 60);
    }
  }
  g.putImageData(img, 0, 0);
  return canvas;
}

function neonCanvas(size, opts) {
  const { canvas, g } = makeCanvas(size, size);
  g.fillStyle = '#050308';
  g.fillRect(0, 0, size, size);
  const col = opts.color !== undefined ? `#${opts.color.toString(16).padStart(6, '0')}` : '#ff2d95';
  g.strokeStyle = col;
  g.lineWidth = size / 26;
  g.shadowColor = col;
  g.shadowBlur = size / 10;
  g.beginPath();
  g.roundRect ? g.roundRect(size * 0.1, size * 0.2, size * 0.8, size * 0.6, size * 0.12)
              : g.rect(size * 0.1, size * 0.2, size * 0.8, size * 0.6);
  g.stroke();
  g.beginPath();
  g.moveTo(size * 0.2, size * 0.5); g.lineTo(size * 0.8, size * 0.5);
  g.stroke();
  return canvas;
}

function graffitiCanvas(size, opts) {
  const { canvas, g } = makeCanvas(size, size);
  g.clearRect(0, 0, size, size);
  const seed = opts.seed ?? 1;
  const cols = ['#ff2d95', '#22e3ff', '#ffc93c', '#4dff9e', '#8a5cff', '#ff7a29'];
  for (let s = 0; s < 5; s++) {
    g.strokeStyle = cols[Math.floor(hash2i(s, 1, seed) * cols.length)];
    g.lineWidth = size * (0.03 + hash2i(s, 2, seed) * 0.05);
    g.lineCap = 'round';
    g.beginPath();
    let x = size * (0.1 + hash2i(s, 3, seed) * 0.2);
    let y = size * (0.3 + hash2i(s, 4, seed) * 0.4);
    g.moveTo(x, y);
    for (let i = 0; i < 6; i++) {
      x += size * (0.08 + hash2i(s, 10 + i, seed) * 0.14);
      y += size * (hash2i(s, 30 + i, seed) - 0.5) * 0.3;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  return canvas;
}

function billboardCanvas(size, opts) {
  const { canvas, g } = makeCanvas(size, Math.floor(size / 2));
  const h = Math.floor(size / 2);
  const seed = opts.seed ?? 1;
  const palettes = [
    ['#ff2d95', '#2a0b3a', '#ffc93c'], ['#22e3ff', '#04202c', '#ffffff'],
    ['#ff7a29', '#2b1206', '#ffe08a'], ['#4dff9e', '#04241a', '#ffffff'],
    ['#8a5cff', '#160a2e', '#ff2d95'],
  ];
  const p = palettes[Math.floor(hash2i(3, 5, seed) * palettes.length)];
  const grad = g.createLinearGradient(0, 0, size, h);
  grad.addColorStop(0, p[1]);
  grad.addColorStop(1, p[0]);
  g.fillStyle = grad;
  g.fillRect(0, 0, size, h);
  g.fillStyle = p[2];
  g.globalAlpha = 0.25;
  for (let i = 0; i < 5; i++) {
    const r = h * (0.2 + hash2i(i, 7, seed) * 0.5);
    g.beginPath();
    g.arc(size * hash2i(i, 8, seed), h * hash2i(i, 9, seed), r, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
  const words = ['ATOMIC', 'VELOCE', 'SUNSPLIT', 'CANDID', 'VORTEX', 'GLIMMER', 'NOVA', 'RAPTURE', 'ZENITH'];
  const taglines = ['now in leonida', 'feel the heat', 'drive it like you stole it', 'live loud', 'pure vice'];
  g.fillStyle = p[2];
  g.font = `bold ${Math.floor(h * 0.30)}px sans-serif`;
  g.textBaseline = 'middle';
  g.fillText(words[Math.floor(hash2i(1, 2, seed) * words.length)], size * 0.06, h * 0.40);
  g.font = `${Math.floor(h * 0.13)}px sans-serif`;
  g.globalAlpha = 0.85;
  g.fillText(taglines[Math.floor(hash2i(2, 3, seed) * taglines.length)], size * 0.06, h * 0.68);
  return canvas;
}

function dashboardCanvas(size) {
  const { canvas, g } = makeCanvas(size, size);
  g.fillStyle = '#14161b';
  g.fillRect(0, 0, size, size);
  g.strokeStyle = '#2a2e36';
  g.lineWidth = size / 90;
  for (let i = 0; i < 3; i++) {
    g.beginPath();
    g.arc(size * (0.28 + i * 0.22), size * 0.5, size * 0.11, 0, Math.PI * 2);
    g.stroke();
  }
  return canvas;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export const TEX_NAMES = [
  ...Object.keys(GEN),
  ...Object.keys(FACADES),
  ...Object.keys(FACADES).map((k) => k + 'Lit'),
  'roadLineWhite', 'roadLineYellow', 'crosswalk', 'neon', 'graffiti', 'billboard', 'dashboard',
];

const NORMAL_ROUGH = new Set([
  'asphalt', 'asphaltCracked', 'concrete', 'sidewalk', 'kerb', 'brick', 'stucco', 'warehouseWall',
  'metalPanel', 'corrugated', 'rustMetal', 'sand', 'grass', 'dirt', 'gravel', 'mud', 'woodPlank',
  'woodOld', 'tile', 'roofShingle', 'roofTar', 'marble', 'water', 'waterNormal', 'chainlink', 'fence',
  'carbonFibre', 'leather', 'denim', 'cloth', 'skin', 'hair', 'palmBark', 'hedge', 'tarp',
  'canvasAwning', 'tireTread', 'manhole', 'grate', 'solarPanel', 'pipe', 'vent', 'ac', 'trash',
  'carPaintFlake', 'groundDetail', 'licensePlate', 'ripple',
]);

function keyFor(name, opts) {
  const o = opts || {};
  return name + '|' + (o.size ?? '') + '|' + (o.seed ?? '') + '|' + (o.color ?? '') + '|' + (o.color2 ?? '') + '|' + (o.lit ? 1 : 0);
}

function buildField(name, size, opts) {
  if (GEN[name]) return GEN[name](size, opts);
  return null;
}

/** Cached albedo texture for a named material. */
export function tex(name, opts = {}) {
  if (!THREE) throw new Error('proctex: initProcTex(THREE) must be called first');
  const key = 'a:' + keyFor(name, opts);
  const hit = cache.get(key);
  if (hit) return hit;

  const size = opts.size ?? defaultSize(name);
  let t = null;

  if (FACADES[name]) {
    const built = facadeCanvas(size, opts, FACADES[name]);
    // Stash the relief so texSet can turn it into normal and roughness maps
    // without drawing the whole facade a second time.
    if (built.field) cache.set('f:' + keyFor(name, opts), built.field);
    t = canvasToTexture(built.canvas, true, opts.anisotropy);
  } else if (name.endsWith('Lit') && FACADES[name.slice(0, -3)]) {
    t = canvasToTexture(facadeCanvas(size, { ...opts, lit: true }, FACADES[name.slice(0, -3)]).canvas, true, opts.anisotropy);
  } else if (name === 'roadLineWhite' || name === 'roadLineYellow' || name === 'crosswalk') {
    t = canvasToTexture(roadLineCanvas(size, opts), true, opts.anisotropy);
  } else if (name === 'neon') {
    t = canvasToTexture(neonCanvas(size, opts), true, opts.anisotropy);
  } else if (name === 'graffiti') {
    t = canvasToTexture(graffitiCanvas(size, opts), true, opts.anisotropy);
  } else if (name === 'billboard') {
    t = canvasToTexture(billboardCanvas(size, opts), true, opts.anisotropy);
  } else if (name === 'dashboard') {
    t = canvasToTexture(dashboardCanvas(size), true, opts.anisotropy);
  } else {
    const f = buildField(name, size, opts);
    if (!f) {
      // Unknown name: a neutral grey so the game never crashes on a typo.
      const fallback = new Field(size).fill(() => [160, 160, 160, 0, 0.8]);
      t = dataToTexture(fallback.rgb, size, true, opts.anisotropy);
    } else {
      t = dataToTexture(f.rgb, size, true, opts.anisotropy);
      cache.set('f:' + keyFor(name, opts), f);
    }
  }
  cache.set(key, t);
  return t;
}

/** Albedo + normal + roughness for a material that has them. */
export function texSet(name, opts = {}) {
  if (!THREE) throw new Error('proctex: initProcTex(THREE) must be called first');
  const key = 's:' + keyFor(name, opts);
  const hit = cache.get(key);
  if (hit) return hit;

  const size = opts.size ?? defaultSize(name);
  const map = tex(name, opts);
  let normalMap = null, roughnessMap = null;

  const isFacade = !!FACADES[name];
  if (NORMAL_ROUGH.has(name) || isFacade) {
    // `tex` above has already run for this key, so a facade's relief is waiting
    // in the cache; everything else builds its field from GEN.
    let f = cache.get('f:' + keyFor(name, opts));
    if (!f && GEN[name]) { f = GEN[name](size, opts); cache.set('f:' + keyFor(name, opts), f); }
    if (f) {
      normalMap = dataToTexture(heightToNormal(f.height, size, opts.normalStrength ?? 2.4), size, false, opts.anisotropy);
      roughnessMap = dataToTexture(roughToBytes(f.rough, size), size, false, opts.anisotropy);
    }
  }
  const set = { map, normalMap, roughnessMap };
  cache.set(key, set);
  return set;
}

function defaultSize(name) {
  const hero = ['asphalt', 'concrete', 'sand', 'grass', 'water', 'glassFacade', 'officeFacade',
    'apartmentFacade', 'artdeco', 'brick', 'sidewalk'];
  return hero.includes(name) ? 512 : 256;
}

/** Rendered sign text, with optional neon glow and up to two lines. */
export function signTexture(text, opts = {}) {
  if (!THREE) throw new Error('proctex: initProcTex(THREE) must be called first');
  const w = opts.width ?? 512;
  const h = opts.height ?? 128;
  const key = `sign:${text}|${w}|${h}|${opts.color ?? ''}|${opts.bg ?? ''}|${opts.neon ? 1 : 0}|${opts.font ?? ''}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const { canvas, g } = makeCanvas(w, h);
  if (opts.bg !== undefined && opts.bg !== null) {
    g.fillStyle = typeof opts.bg === 'number' ? `#${opts.bg.toString(16).padStart(6, '0')}` : opts.bg;
    g.fillRect(0, 0, w, h);
  } else {
    g.clearRect(0, 0, w, h);
  }
  const lines = String(text).split('\n').slice(0, 2);
  const color = opts.color !== undefined
    ? (typeof opts.color === 'number' ? `#${opts.color.toString(16).padStart(6, '0')}` : opts.color)
    : '#ffffff';
  g.fillStyle = color;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  if (opts.neon) { g.shadowColor = color; g.shadowBlur = h * 0.22; }

  const family = opts.font || 'bold sans-serif';
  for (let i = 0; i < lines.length; i++) {
    let fs = opts.fontSize ?? Math.floor(h / (lines.length === 1 ? 1.6 : 2.6));
    g.font = `${fs}px ${family}`;
    // shrink to fit
    let guard = 0;
    while (g.measureText(lines[i]).width > w * 0.9 && fs > 8 && guard++ < 40) {
      fs -= Math.max(1, Math.floor(fs * 0.08));
      g.font = `${fs}px ${family}`;
    }
    const y = lines.length === 1 ? h * 0.52 : h * (0.32 + i * 0.38);
    g.fillText(lines[i], w * 0.5, y);
  }
  if (opts.border) {
    g.shadowBlur = 0;
    g.strokeStyle = color;
    g.lineWidth = Math.max(2, h * 0.035);
    g.strokeRect(g.lineWidth, g.lineWidth, w - g.lineWidth * 2, h - g.lineWidth * 2);
  }
  const t = canvasToTexture(canvas, true, opts.anisotropy);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  cache.set(key, t);
  return t;
}

export function gradientTexture(stops, opts = {}) {
  if (!THREE) throw new Error('proctex: initProcTex(THREE) must be called first');
  const w = opts.width ?? 4, h = opts.height ?? 256;
  const { canvas, g } = makeCanvas(w, h);
  const grad = g.createLinearGradient(0, 0, opts.horizontal ? w : 0, opts.horizontal ? 0 : h);
  for (const [t, c] of stops) grad.addColorStop(Math.max(0, Math.min(1, t)), c);
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  const t = canvasToTexture(canvas, true, opts.anisotropy);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

export function noiseTexture(opts = {}) {
  const size = opts.size ?? 256;
  const f = new Field(size).fill((u, v) => {
    const n = tileFbm(u * (opts.freq ?? 16), v * (opts.freq ?? 16), { octaves: opts.octaves ?? 4, period: opts.freq ?? 16, seed: opts.seed ?? 0 });
    const c = clamp255(n * 255);
    return [c, c, c, n, 0.8];
  });
  return dataToTexture(f.rgb, size, false, opts.anisotropy);
}

export function clearTexCache() {
  for (const v of cache.values()) if (v && v.isTexture) v.dispose();
  cache.clear();
}

export function texCacheSize() { return cache.size; }
