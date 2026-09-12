// mathx.js — small, allocation-free math helpers used everywhere.
export const TAU = Math.PI * 2;
export const HALF_PI = Math.PI * 0.5;
export const DEG2RAD = Math.PI / 180;
export const RAD2DEG = 180 / Math.PI;
export const EPS = 1e-6;

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, v) => (b - a === 0 ? 0 : (v - a) / (b - a));
export const remap = (v, a, b, c, d) => lerp(c, d, clamp01(invLerp(a, b, v)));
export const sign = (v) => (v > 0 ? 1 : v < 0 ? -1 : 0);

/** Frame-rate independent exponential smoothing. lambda ~ "speed". */
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));

export function smoothstep(e0, e1, x) {
  const t = clamp01((x - e0) / (e1 - e0 || EPS));
  return t * t * (3 - 2 * t);
}
export function smootherstep(e0, e1, x) {
  const t = clamp01((x - e0) / (e1 - e0 || EPS));
  return t * t * t * (t * (t * 6 - 15) + 10);
}

export function moveTowards(a, b, maxDelta) {
  const d = b - a;
  if (Math.abs(d) <= maxDelta) return b;
  return a + Math.sign(d) * maxDelta;
}

/** Wrap angle into (-PI, PI]. */
export function wrapAngle(a) {
  a = (a + Math.PI) % TAU;
  if (a < 0) a += TAU;
  return a - Math.PI;
}
export function angleDelta(from, to) { return wrapAngle(to - from); }
export function angleLerp(a, b, t) { return a + angleDelta(a, b) * t; }
export function angleDamp(a, b, lambda, dt) { return a + angleDelta(a, b) * (1 - Math.exp(-lambda * dt)); }
export function angleMoveTowards(a, b, maxDelta) {
  const d = angleDelta(a, b);
  if (Math.abs(d) <= maxDelta) return b;
  return wrapAngle(a + Math.sign(d) * maxDelta);
}

export const dist2D = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
export const distSq2D = (ax, az, bx, bz) => { const dx = ax - bx, dz = az - bz; return dx * dx + dz * dz; };

/** Shortest distance from point p to segment ab (2D, XZ). Returns {d, t, x, z}. */
export function pointSegment2D(px, pz, ax, az, bx, bz) {
  const abx = bx - ax, abz = bz - az;
  const len2 = abx * abx + abz * abz;
  let t = len2 < EPS ? 0 : ((px - ax) * abx + (pz - az) * abz) / len2;
  t = clamp01(t);
  const cx = ax + abx * t, cz = az + abz * t;
  return { d: Math.hypot(px - cx, pz - cz), t, x: cx, z: cz };
}

/** Deterministic-ish exponential approach toward a target vector (in place). */
export function dampVec3(v, tx, ty, tz, lambda, dt) {
  const k = 1 - Math.exp(-lambda * dt);
  v.x += (tx - v.x) * k; v.y += (ty - v.y) * k; v.z += (tz - v.z) * k;
  return v;
}

/** Uniform-grid spatial hash for 2D (XZ) broadphase. Stores arbitrary items. */
export class SpatialHash {
  constructor(cellSize = 16) {
    this.cell = cellSize;
    this.map = new Map();
    this._stamp = 0;
    this._seen = new Map();
  }
  _key(cx, cz) { return cx * 73856093 ^ cz * 19349663; }
  clear() { this.map.clear(); }
  insert(item, minX, minZ, maxX, maxZ) {
    const c = this.cell;
    const x0 = Math.floor(minX / c), x1 = Math.floor(maxX / c);
    const z0 = Math.floor(minZ / c), z1 = Math.floor(maxZ / c);
    for (let x = x0; x <= x1; x++) {
      for (let z = z0; z <= z1; z++) {
        const k = this._key(x, z);
        let arr = this.map.get(k);
        if (!arr) { arr = []; this.map.set(k, arr); }
        arr.push(item);
      }
    }
  }
  insertPoint(item, x, z) { this.insert(item, x, z, x, z); }
  /** Collect unique items whose cells overlap the AABB into `out`. */
  query(minX, minZ, maxX, maxZ, out) {
    out.length = 0;
    const c = this.cell;
    const stamp = ++this._stamp;
    const seen = this._seen;
    const x0 = Math.floor(minX / c), x1 = Math.floor(maxX / c);
    const z0 = Math.floor(minZ / c), z1 = Math.floor(maxZ / c);
    for (let x = x0; x <= x1; x++) {
      for (let z = z0; z <= z1; z++) {
        const arr = this.map.get(this._key(x, z));
        if (!arr) continue;
        for (let i = 0; i < arr.length; i++) {
          const it = arr[i];
          if (seen.get(it) === stamp) continue;
          seen.set(it, stamp);
          out.push(it);
        }
      }
    }
    return out;
  }
  queryRadius(x, z, r, out) { return this.query(x - r, z - r, x + r, z + r, out); }
}

/** Running average used for perf metrics. */
export class RollingAverage {
  constructor(n = 60) { this.n = n; this.buf = new Float32Array(n); this.i = 0; this.count = 0; this.sum = 0; }
  push(v) {
    if (this.count === this.n) this.sum -= this.buf[this.i];
    else this.count++;
    this.buf[this.i] = v; this.sum += v;
    this.i = (this.i + 1) % this.n;
    return this.avg;
  }
  get avg() { return this.count ? this.sum / this.count : 0; }
}

/** 2D convex polygon (XZ) point test — points in CCW or CW order. */
export function pointInPoly2D(px, pz, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 2; i < pts.length; j = i, i += 2) {
    const xi = pts[i], zi = pts[i + 1], xj = pts[j], zj = pts[j + 1];
    if ((zi > pz) !== (zj > pz) && px < ((xj - xi) * (pz - zi)) / (zj - zi || EPS) + xi) inside = !inside;
  }
  return inside;
}

/** Separating-axis test between two oriented rectangles in XZ. */
export function obbOverlap2D(ax, az, ahw, ahl, aYaw, bx, bz, bhw, bhl, bYaw) {
  const ca = Math.cos(aYaw), sa = Math.sin(aYaw);
  const cb = Math.cos(bYaw), sb = Math.sin(bYaw);
  const axes = [ca, sa, -sa, ca, cb, sb, -sb, cb];
  const dx = bx - ax, dz = bz - az;
  for (let i = 0; i < 8; i += 2) {
    const nx = axes[i], nz = axes[i + 1];
    const projA = Math.abs(ahw * (ca * nx + sa * nz)) + Math.abs(ahl * (-sa * nx + ca * nz));
    const projB = Math.abs(bhw * (cb * nx + sb * nz)) + Math.abs(bhl * (-sb * nx + cb * nz));
    if (Math.abs(dx * nx + dz * nz) > projA + projB) return false;
  }
  return true;
}

export function formatMoney(n) {
  const neg = n < 0;
  const s = Math.abs(Math.round(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (neg ? '-$' : '$') + s;
}
export function formatTime(mins) {
  const h = Math.floor(mins / 60) % 24;
  const m = Math.floor(mins % 60);
  const ampm = h < 12 ? 'AM' : 'PM';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${m.toString().padStart(2, '0')} ${ampm}`;
}
