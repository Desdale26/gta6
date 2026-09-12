// world.js — the collision world.
//
// Static geometry is a soup of oriented boxes (buildings, kerbs, props, ramps, road decks)
// indexed in an XZ spatial hash. Dynamic actors (vehicles, peds, debris) register an oriented
// box each frame. Everything else — wheels, bullets, cameras, explosions — talks to this
// module through raycasts and overlap queries.
import * as THREE from 'three';
import { SpatialHash, clamp } from '../core/mathx.js';

export const LAYER = {
  GROUND: 1 << 0,
  BUILDING: 1 << 1,
  PROP: 1 << 2,
  VEHICLE: 1 << 3,
  PED: 1 << 4,
  WATER: 1 << 5,
  RAMP: 1 << 6,
  DEBRIS: 1 << 7,
  PLAYER: 1 << 8,
  GLASS: 1 << 9,
};
export const MASK_ALL = 0xffff;
export const MASK_SOLID = LAYER.GROUND | LAYER.BUILDING | LAYER.PROP | LAYER.RAMP;
export const MASK_WHEEL = LAYER.GROUND | LAYER.BUILDING | LAYER.PROP | LAYER.RAMP | LAYER.VEHICLE;
export const MASK_BULLET = LAYER.GROUND | LAYER.BUILDING | LAYER.PROP | LAYER.RAMP | LAYER.VEHICLE | LAYER.PED | LAYER.GLASS;
export const MASK_CAMERA = LAYER.GROUND | LAYER.BUILDING | LAYER.PROP | LAYER.RAMP;

export const SURFACE = {
  ROAD: 'road', CONCRETE: 'concrete', SAND: 'sand', GRASS: 'grass', DIRT: 'dirt',
  WATER: 'water', METAL: 'metal', WOOD: 'wood', GLASS: 'glass', FLESH: 'flesh', RUBBER: 'rubber',
};

/** Grip / rolling-resistance / particle behaviour per surface. */
export const SURFACE_PROPS = {
  road:     { grip: 1.00, roll: 0.014, dustColor: 0x8b8b90, dust: 0.05, screech: 1.0, bumpy: 0.02 },
  concrete: { grip: 0.97, roll: 0.015, dustColor: 0x9b9b9e, dust: 0.08, screech: 0.9, bumpy: 0.03 },
  sand:     { grip: 0.52, roll: 0.075, dustColor: 0xd9c08a, dust: 1.00, screech: 0.0, bumpy: 0.22 },
  grass:    { grip: 0.63, roll: 0.048, dustColor: 0x6f8a4a, dust: 0.55, screech: 0.0, bumpy: 0.16 },
  dirt:     { grip: 0.66, roll: 0.055, dustColor: 0x9c7a4e, dust: 0.85, screech: 0.1, bumpy: 0.20 },
  water:    { grip: 0.18, roll: 0.30,  dustColor: 0x9fd8e8, dust: 0.9,  screech: 0.0, bumpy: 0.10 },
  metal:    { grip: 0.88, roll: 0.012, dustColor: 0xaaaaaa, dust: 0.02, screech: 1.2, bumpy: 0.01 },
  wood:     { grip: 0.82, roll: 0.020, dustColor: 0xa98352, dust: 0.20, screech: 0.4, bumpy: 0.06 },
  glass:    { grip: 0.70, roll: 0.012, dustColor: 0xcfe8f0, dust: 0.10, screech: 0.6, bumpy: 0.0 },
  rubber:   { grip: 1.15, roll: 0.020, dustColor: 0x333333, dust: 0.0,  screech: 0.3, bumpy: 0.02 },
  flesh:    { grip: 0.70, roll: 0.10,  dustColor: 0x8a2222, dust: 0.0,  screech: 0.0, bumpy: 0.0 },
};

let _sid = 1;

/** An oriented box. `basis` is a column-major 3x3 (right, up, forward) stored flat. */
export class BoxCollider {
  constructor(x, y, z, hw, hh, hd, yaw = 0, opts = {}) {
    this.id = _sid++;
    this.x = x; this.y = y; this.z = z;
    this.hw = hw; this.hh = hh; this.hd = hd;
    this.yaw = yaw;
    this.layer = opts.layer ?? LAYER.BUILDING;
    this.surface = opts.surface ?? SURFACE.CONCRETE;
    this.drivable = opts.drivable ?? false;
    this.owner = opts.owner ?? null;
    this.breakable = opts.breakable ?? null;   // { hp, debris }
    this.hp = opts.breakable ? opts.breakable.hp : Infinity;
    this.dead = false;
    this.restitution = opts.restitution ?? 0.12;
    this.friction = opts.friction ?? 0.9;
    // rotation basis
    this.rx = 1; this.ry = 0; this.rz = 0;   // right
    this.ux = 0; this.uy = 1; this.uz = 0;   // up
    this.fx = 0; this.fy = 0; this.fz = 1;   // forward
    if (opts.quaternion) this.setQuaternion(opts.quaternion);
    else this.setYawPitchRoll(yaw, opts.pitch || 0, opts.roll || 0);
    this._computeAabb();
  }

  setYawPitchRoll(yaw, pitch, roll) {
    this.yaw = yaw;
    _e.set(pitch, yaw, roll, 'YXZ');
    _q.setFromEuler(_e);
    this.setQuaternion(_q);
  }
  setQuaternion(q) {
    _m3.makeRotationFromQuaternion(q);
    const e = _m3.elements;
    this.rx = e[0]; this.ry = e[1]; this.rz = e[2];
    this.ux = e[4]; this.uy = e[5]; this.uz = e[6];
    this.fx = e[8]; this.fy = e[9]; this.fz = e[10];
    this._computeAabb();
  }
  _computeAabb() {
    const ex = Math.abs(this.rx) * this.hw + Math.abs(this.ux) * this.hh + Math.abs(this.fx) * this.hd;
    const ey = Math.abs(this.ry) * this.hw + Math.abs(this.uy) * this.hh + Math.abs(this.fy) * this.hd;
    const ez = Math.abs(this.rz) * this.hw + Math.abs(this.uz) * this.hh + Math.abs(this.fz) * this.hd;
    this.minX = this.x - ex; this.maxX = this.x + ex;
    this.minY = this.y - ey; this.maxY = this.y + ey;
    this.minZ = this.z - ez; this.maxZ = this.z + ez;
  }
  /** World point → local box space. Writes into `out` {x,y,z}. */
  toLocal(px, py, pz, out) {
    const dx = px - this.x, dy = py - this.y, dz = pz - this.z;
    out.x = dx * this.rx + dy * this.ry + dz * this.rz;
    out.y = dx * this.ux + dy * this.uy + dz * this.uz;
    out.z = dx * this.fx + dy * this.fy + dz * this.fz;
    return out;
  }
  /** Local direction/point → world. */
  toWorldDir(lx, ly, lz, out) {
    out.x = lx * this.rx + ly * this.ux + lz * this.fx;
    out.y = lx * this.ry + ly * this.uy + lz * this.fy;
    out.z = lx * this.rz + ly * this.uz + lz * this.fz;
    return out;
  }
  containsPoint(px, py, pz) {
    this.toLocal(px, py, pz, _lp);
    return Math.abs(_lp.x) <= this.hw && Math.abs(_lp.y) <= this.hh && Math.abs(_lp.z) <= this.hd;
  }
  /** Closest point on the box to p, in world space. */
  closestPoint(px, py, pz, out) {
    this.toLocal(px, py, pz, _lp);
    const cx = clamp(_lp.x, -this.hw, this.hw);
    const cy = clamp(_lp.y, -this.hh, this.hh);
    const cz = clamp(_lp.z, -this.hd, this.hd);
    this.toWorldDir(cx, cy, cz, out);
    out.x += this.x; out.y += this.y; out.z += this.z;
    return out;
  }
}

const _e = new THREE.Euler();
const _q = new THREE.Quaternion();
const _m3 = new THREE.Matrix4();
const _lp = { x: 0, y: 0, z: 0 };
const _lp2 = { x: 0, y: 0, z: 0 };
const _wd = { x: 0, y: 0, z: 0 };
const _tmpArr = [];
const _tmpArr2 = [];

export class RayHit {
  constructor() { this.reset(); }
  reset() {
    this.hit = false; this.dist = Infinity;
    this.px = 0; this.py = 0; this.pz = 0;
    this.nx = 0; this.ny = 1; this.nz = 0;
    this.collider = null; this.object = null; this.surface = SURFACE.CONCRETE;
    this.layer = 0; this.entity = null;
  }
}

export class PhysicsWorld {
  constructor(ctx) {
    this.ctx = ctx;
    this.gravity = -19.6;               // 2 g — arcade-weighted but stable, matches the car model
    this.statics = [];
    this.hash = new SpatialHash(24);
    this.dynamics = new Set();          // objects exposing {collider, ...}
    this.dynHash = new SpatialHash(16);
    this.terrain = null;                // { heightAt(x,z), normalAt(x,z,out), surfaceAt(x,z), waterLevel }
    this.waterLevel = 0;
    // Wind in m/s, world space. The weather system writes it every frame; every
    // aerodynamic body in the world reads it from here.
    this.wind = new THREE.Vector3();
    this._hit = new RayHit();
    this._hit2 = new RayHit();
    this.stats = { statics: 0, dynamics: 0, rayTests: 0 };
    this._rebuildQueued = false;
  }

  setTerrain(t) { this.terrain = t; this.waterLevel = t.waterLevel ?? 0; }

  addStatic(c) {
    this.statics.push(c);
    this.hash.insert(c, c.minX, c.minZ, c.maxX, c.maxZ);
    this.stats.statics = this.statics.length;
    return c;
  }
  addBox(x, y, z, hw, hh, hd, yaw, opts) { return this.addStatic(new BoxCollider(x, y, z, hw, hh, hd, yaw, opts)); }

  removeStatic(c) {
    c.dead = true;
    const i = this.statics.indexOf(c);
    if (i >= 0) this.statics.splice(i, 1);
    this._rebuildQueued = true;
  }
  rebuildIndex() {
    this.hash.clear();
    for (const c of this.statics) { if (!c.dead) this.hash.insert(c, c.minX, c.minZ, c.maxX, c.maxZ); }
    this._rebuildQueued = false;
    this.stats.statics = this.statics.length;
  }

  addDynamic(obj) { this.dynamics.add(obj); }
  removeDynamic(obj) { this.dynamics.delete(obj); }

  /** Rebuild the dynamic index — call once per frame before queries. */
  refreshDynamics() {
    this.dynHash.clear();
    let n = 0;
    for (const o of this.dynamics) {
      const c = o.collider;
      if (!c || o.dead) continue;
      this.dynHash.insert(o, c.minX, c.minZ, c.maxX, c.maxZ);
      n++;
    }
    this.stats.dynamics = n;
    if (this._rebuildQueued) this.rebuildIndex();
  }

  groundHeight(x, z) { return this.terrain ? this.terrain.heightAt(x, z) : 0; }
  surfaceAt(x, z) { return this.terrain ? this.terrain.surfaceAt(x, z) : SURFACE.CONCRETE; }

  // -------------------------------------------------------------------------
  // Ray casting
  // -------------------------------------------------------------------------
  /**
   * Cast a ray. Direction must be normalised. Returns a shared RayHit — copy what you
   * need before the next call. `opts.ignore` may be an entity or a Set of entities.
   */
  raycast(ox, oy, oz, dx, dy, dz, maxDist = 500, mask = MASK_SOLID, opts = null) {
    const hit = opts && opts.into ? opts.into : this._hit;
    hit.reset();
    hit.dist = maxDist;
    this.stats.rayTests++;

    const ignore = opts && opts.ignore;
    const ignoreSet = ignore instanceof Set ? ignore : null;

    // --- terrain ---
    if ((mask & LAYER.GROUND) && this.terrain) {
      const t = this._rayTerrain(ox, oy, oz, dx, dy, dz, maxDist);
      if (t >= 0 && t < hit.dist) {
        const px = ox + dx * t, py = oy + dy * t, pz = oz + dz * t;
        hit.hit = true; hit.dist = t; hit.px = px; hit.py = py; hit.pz = pz;
        this.terrain.normalAt(px, pz, _wd);
        hit.nx = _wd.x; hit.ny = _wd.y; hit.nz = _wd.z;
        hit.surface = this.terrain.surfaceAt(px, pz);
        hit.layer = LAYER.GROUND; hit.collider = null; hit.entity = null;
      }
    }

    // --- water plane ---
    if ((mask & LAYER.WATER) && this.terrain && dy !== 0) {
      const t = (this.waterLevel - oy) / dy;
      if (t > 0 && t < hit.dist) {
        const px = ox + dx * t, pz = oz + dz * t;
        if (this.terrain.isWater(px, pz)) {
          hit.hit = true; hit.dist = t; hit.px = px; hit.py = this.waterLevel; hit.pz = pz;
          hit.nx = 0; hit.ny = 1; hit.nz = 0; hit.surface = SURFACE.WATER;
          hit.layer = LAYER.WATER; hit.collider = null; hit.entity = null;
        }
      }
    }

    // --- statics ---
    const minX = Math.min(ox, ox + dx * maxDist), maxX = Math.max(ox, ox + dx * maxDist);
    const minZ = Math.min(oz, oz + dz * maxDist), maxZ = Math.max(oz, oz + dz * maxDist);
    const list = this.hash.query(minX, minZ, maxX, maxZ, _tmpArr);
    for (let i = 0; i < list.length; i++) {
      const c = list[i];
      if (c.dead || !(c.layer & mask)) continue;
      const t = rayBox(ox, oy, oz, dx, dy, dz, c, hit.dist);
      if (t >= 0 && t < hit.dist) {
        hit.hit = true; hit.dist = t;
        hit.px = ox + dx * t; hit.py = oy + dy * t; hit.pz = oz + dz * t;
        boxNormalAt(c, hit.px, hit.py, hit.pz, _wd);
        hit.nx = _wd.x; hit.ny = _wd.y; hit.nz = _wd.z;
        hit.collider = c; hit.surface = c.surface; hit.layer = c.layer; hit.entity = c.owner;
      }
    }

    // --- dynamics ---
    if (mask & (LAYER.VEHICLE | LAYER.PED | LAYER.DEBRIS | LAYER.PLAYER)) {
      const dl = this.dynHash.query(minX, minZ, maxX, maxZ, _tmpArr2);
      for (let i = 0; i < dl.length; i++) {
        const o = dl[i];
        const c = o.collider;
        if (!c || o.dead || !(c.layer & mask)) continue;
        if (o === ignore || (ignoreSet && ignoreSet.has(o))) continue;
        const t = rayBox(ox, oy, oz, dx, dy, dz, c, hit.dist);
        if (t >= 0 && t < hit.dist) {
          hit.hit = true; hit.dist = t;
          hit.px = ox + dx * t; hit.py = oy + dy * t; hit.pz = oz + dz * t;
          boxNormalAt(c, hit.px, hit.py, hit.pz, _wd);
          hit.nx = _wd.x; hit.ny = _wd.y; hit.nz = _wd.z;
          hit.collider = c; hit.surface = c.surface; hit.layer = c.layer; hit.entity = o;
        }
      }
    }
    return hit;
  }

  /** Secondary hit buffer so callers can hold two results at once. */
  raycast2(ox, oy, oz, dx, dy, dz, maxDist, mask, opts) {
    const o = opts ? { ...opts, into: this._hit2 } : { into: this._hit2 };
    return this.raycast(ox, oy, oz, dx, dy, dz, maxDist, mask, o);
  }

  /** March along the ray sampling terrain height — robust for gentle heightfields. */
  _rayTerrain(ox, oy, oz, dx, dy, dz, maxDist) {
    const terr = this.terrain;
    // Straight down is by far the most common case (wheels, foot placement).
    if (dy < -0.999) {
      const h = terr.heightAt(ox, oz);
      const t = oy - h;
      // Origin already inside the ground: report a hit at once so whatever is
      // buried gets pushed back out instead of falling forever. (The marching
      // path below does the same with its `prevD <= 0` early-out.)
      if (t <= 0) return 0;
      return t <= maxDist ? t : -1;
    }
    if (Math.abs(dy) < 1e-5 && oy > terr.maxHeight) return -1;
    let prevT = 0;
    let prevD = oy - terr.heightAt(ox, oz);
    if (prevD <= 0) return 0;
    const horiz = Math.hypot(dx, dz);
    const coarse = Math.max(1.2, horiz > 0.01 ? 2.2 : 6);
    // Divide the ray instead of stepping a fixed distance along it. A fixed step
    // skipped the loop entirely for any ray shorter than one step — which is every
    // wheel probe — so a car tilted more than a couple of degrees off the vertical
    // fast path below saw nothing but clean air and fell through the world.
    const steps = Math.max(2, Math.ceil(maxDist / coarse));
    const step = maxDist / steps;
    for (let i = 1; i <= steps; i++) {
      const t = step * i;
      const px = ox + dx * t, py = oy + dy * t, pz = oz + dz * t;
      const d = py - terr.heightAt(px, pz);
      if (d <= 0) {
        // binary refine
        let lo = prevT, hi = t;
        for (let i = 0; i < 8; i++) {
          const mid = (lo + hi) * 0.5;
          const mx = ox + dx * mid, my = oy + dy * mid, mz = oz + dz * mid;
          if (my - terr.heightAt(mx, mz) > 0) lo = mid; else hi = mid;
        }
        return hi;
      }
      prevT = t; prevD = d;
    }
    return -1;
  }

  // -------------------------------------------------------------------------
  // Overlap queries
  // -------------------------------------------------------------------------
  /** Collect static colliders overlapping a sphere. */
  overlapSphereStatic(x, y, z, r, out) {
    out.length = 0;
    const list = this.hash.query(x - r, z - r, x + r, z + r, _tmpArr);
    for (let i = 0; i < list.length; i++) {
      const c = list[i];
      if (c.dead) continue;
      if (y - r > c.maxY || y + r < c.minY) continue;
      c.closestPoint(x, y, z, _wd);
      const dx = _wd.x - x, dy = _wd.y - y, dz = _wd.z - z;
      if (dx * dx + dy * dy + dz * dz <= r * r) out.push(c);
    }
    return out;
  }
  /** Collect dynamic entities overlapping a sphere. */
  overlapSphereDynamic(x, y, z, r, out, mask = MASK_ALL) {
    out.length = 0;
    const list = this.dynHash.query(x - r, z - r, x + r, z + r, _tmpArr2);
    for (let i = 0; i < list.length; i++) {
      const o = list[i];
      const c = o.collider;
      if (!c || o.dead || !(c.layer & mask)) continue;
      if (y - r > c.maxY || y + r < c.minY) continue;
      c.closestPoint(x, y, z, _wd);
      const dx = _wd.x - x, dy = _wd.y - y, dz = _wd.z - z;
      if (dx * dx + dy * dy + dz * dz <= r * r) out.push(o);
    }
    return out;
  }

  /**
   * Push a vertical capsule out of the static world. Returns the accumulated push and
   * whether a wall was touched. `pos` is the capsule *base* (feet).
   */
  resolveCapsule(pos, radius, height, out) {
    out.x = 0; out.y = 0; out.z = 0;
    out.wall = false; out.wallNx = 0; out.wallNz = 0;
    const cy = pos.y + height * 0.5;
    const list = this.hash.query(pos.x - radius - 0.6, pos.z - radius - 0.6, pos.x + radius + 0.6, pos.z + radius + 0.6, _tmpArr);
    for (let iter = 0; iter < 3; iter++) {
      let moved = false;
      for (let i = 0; i < list.length; i++) {
        const c = list[i];
        if (c.dead || !(c.layer & MASK_SOLID)) continue;
        if (pos.y + height < c.minY || pos.y > c.maxY) continue;
        // Test the capsule axis against the box using its closest point.
        const ay = clamp(cy, pos.y + radius, pos.y + height - radius);
        c.closestPoint(pos.x + out.x, ay + out.y, pos.z + out.z, _wd);
        let dx = (pos.x + out.x) - _wd.x;
        let dz = (pos.z + out.z) - _wd.z;
        let dy = ay + out.y - _wd.y;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 >= radius * radius) continue;
        let d = Math.sqrt(d2);
        if (d < 1e-4) {
          // Deeply embedded — push along the shallowest box axis.
          c.toLocal(pos.x + out.x, ay + out.y, pos.z + out.z, _lp);
          const ox = c.hw - Math.abs(_lp.x), oyv = c.hh - Math.abs(_lp.y), oz = c.hd - Math.abs(_lp.z);
          if (ox <= oyv && ox <= oz) c.toWorldDir(Math.sign(_lp.x) || 1, 0, 0, _wd);
          else if (oyv <= oz) c.toWorldDir(0, Math.sign(_lp.y) || 1, 0, _wd);
          else c.toWorldDir(0, 0, Math.sign(_lp.z) || 1, _wd);
          dx = _wd.x; dy = _wd.y; dz = _wd.z; d = 0.0001;
        }
        const inv = 1 / d;
        const nx = dx * inv, ny = dy * inv, nz = dz * inv;
        const pen = radius - d;
        // Never push vertically here — the ground probe owns Y.
        const hLen = Math.hypot(nx, nz);
        if (hLen > 0.15) {
          const k = pen / hLen;
          out.x += nx * k; out.z += nz * k;
          out.wall = true; out.wallNx = nx / hLen; out.wallNz = nz / hLen;
          moved = true;
        }
      }
      if (!moved) break;
    }
    return out;
  }

  /** Highest drivable/solid surface under a point, including static decks. */
  supportHeight(x, z, fromY, maxDrop = 6) {
    const hit = this.raycast(x, fromY, z, 0, -1, 0, maxDrop, MASK_SOLID, { into: this._hit2 });
    return hit.hit ? hit.py : -Infinity;
  }

  update() { this.refreshDynamics(); }
}

// ---------------------------------------------------------------------------
// Ray / OBB intersection (slab test in box space). Returns t or -1.
// ---------------------------------------------------------------------------
export function rayBox(ox, oy, oz, dx, dy, dz, c, maxT) {
  // Broad reject against the world AABB first.
  if (!rayAabb(ox, oy, oz, dx, dy, dz, c.minX, c.minY, c.minZ, c.maxX, c.maxY, c.maxZ, maxT)) return -1;
  const px = ox - c.x, py = oy - c.y, pz = oz - c.z;
  const lox = px * c.rx + py * c.ry + pz * c.rz;
  const loy = px * c.ux + py * c.uy + pz * c.uz;
  const loz = px * c.fx + py * c.fy + pz * c.fz;
  const ldx = dx * c.rx + dy * c.ry + dz * c.rz;
  const ldy = dx * c.ux + dy * c.uy + dz * c.uz;
  const ldz = dx * c.fx + dy * c.fy + dz * c.fz;

  let tmin = -Infinity, tmax = Infinity;
  // X
  if (Math.abs(ldx) < 1e-8) { if (Math.abs(lox) > c.hw) return -1; }
  else {
    const inv = 1 / ldx;
    let t1 = (-c.hw - lox) * inv, t2 = (c.hw - lox) * inv;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    if (t1 > tmin) tmin = t1;
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) return -1;
  }
  // Y
  if (Math.abs(ldy) < 1e-8) { if (Math.abs(loy) > c.hh) return -1; }
  else {
    const inv = 1 / ldy;
    let t1 = (-c.hh - loy) * inv, t2 = (c.hh - loy) * inv;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    if (t1 > tmin) tmin = t1;
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) return -1;
  }
  // Z
  if (Math.abs(ldz) < 1e-8) { if (Math.abs(loz) > c.hd) return -1; }
  else {
    const inv = 1 / ldz;
    let t1 = (-c.hd - loz) * inv, t2 = (c.hd - loz) * inv;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    if (t1 > tmin) tmin = t1;
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) return -1;
  }
  if (tmax < 0) return -1;
  const t = tmin >= 0 ? tmin : 0;
  return t <= maxT ? t : -1;
}

export function rayAabb(ox, oy, oz, dx, dy, dz, minX, minY, minZ, maxX, maxY, maxZ, maxT) {
  let tmin = 0, tmax = maxT;
  for (let a = 0; a < 3; a++) {
    const o = a === 0 ? ox : a === 1 ? oy : oz;
    const d = a === 0 ? dx : a === 1 ? dy : dz;
    const lo = a === 0 ? minX : a === 1 ? minY : minZ;
    const hi = a === 0 ? maxX : a === 1 ? maxY : maxZ;
    if (Math.abs(d) < 1e-8) { if (o < lo || o > hi) return false; continue; }
    const inv = 1 / d;
    let t1 = (lo - o) * inv, t2 = (hi - o) * inv;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    if (t1 > tmin) tmin = t1;
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) return false;
  }
  return true;
}

/** Outward normal of the box face nearest to a (surface) point. */
export function boxNormalAt(c, px, py, pz, out) {
  const dx = px - c.x, dy = py - c.y, dz = pz - c.z;
  const lx = dx * c.rx + dy * c.ry + dz * c.rz;
  const ly = dx * c.ux + dy * c.uy + dz * c.uz;
  const lz = dx * c.fx + dy * c.fy + dz * c.fz;
  const ax = Math.abs(Math.abs(lx) - c.hw);
  const ay = Math.abs(Math.abs(ly) - c.hh);
  const az = Math.abs(Math.abs(lz) - c.hd);
  let sx = 0, sy = 0, sz = 0;
  if (ax <= ay && ax <= az) sx = lx >= 0 ? 1 : -1;
  else if (ay <= az) sy = ly >= 0 ? 1 : -1;
  else sz = lz >= 0 ? 1 : -1;
  out.x = sx * c.rx + sy * c.ux + sz * c.fx;
  out.y = sx * c.ry + sy * c.uy + sz * c.fy;
  out.z = sx * c.rz + sy * c.uz + sz * c.fz;
  const l = Math.hypot(out.x, out.y, out.z) || 1;
  out.x /= l; out.y /= l; out.z /= l;
  return out;
}

/**
 * Separating-axis test between two oriented boxes. Returns penetration depth and axis
 * in `out` ({depth, nx, ny, nz}) or null when disjoint. Normal points from A to B.
 */
export function obbVsObb(a, b, out) {
  const axes = _satAxes;
  let n = 0;
  axes[n++] = a.rx; axes[n++] = a.ry; axes[n++] = a.rz;
  axes[n++] = a.ux; axes[n++] = a.uy; axes[n++] = a.uz;
  axes[n++] = a.fx; axes[n++] = a.fy; axes[n++] = a.fz;
  axes[n++] = b.rx; axes[n++] = b.ry; axes[n++] = b.rz;
  axes[n++] = b.ux; axes[n++] = b.uy; axes[n++] = b.uz;
  axes[n++] = b.fx; axes[n++] = b.fy; axes[n++] = b.fz;
  // cross products
  const av = [a.rx, a.ry, a.rz, a.ux, a.uy, a.uz, a.fx, a.fy, a.fz];
  const bv = [b.rx, b.ry, b.rz, b.ux, b.uy, b.uz, b.fx, b.fy, b.fz];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const ax = av[i * 3], ay = av[i * 3 + 1], az = av[i * 3 + 2];
      const bx = bv[j * 3], by = bv[j * 3 + 1], bz = bv[j * 3 + 2];
      const cx = ay * bz - az * by, cy = az * bx - ax * bz, cz = ax * by - ay * bx;
      const l = Math.hypot(cx, cy, cz);
      if (l < 1e-5) continue;
      axes[n++] = cx / l; axes[n++] = cy / l; axes[n++] = cz / l;
    }
  }
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
  let best = Infinity, bnx = 0, bny = 0, bnz = 0;
  for (let i = 0; i < n; i += 3) {
    const nx = axes[i], ny = axes[i + 1], nz = axes[i + 2];
    const ra = Math.abs(a.hw * (a.rx * nx + a.ry * ny + a.rz * nz))
             + Math.abs(a.hh * (a.ux * nx + a.uy * ny + a.uz * nz))
             + Math.abs(a.hd * (a.fx * nx + a.fy * ny + a.fz * nz));
    const rb = Math.abs(b.hw * (b.rx * nx + b.ry * ny + b.rz * nz))
             + Math.abs(b.hh * (b.ux * nx + b.uy * ny + b.uz * nz))
             + Math.abs(b.hd * (b.fx * nx + b.fy * ny + b.fz * nz));
    const dist = dx * nx + dy * ny + dz * nz;
    const overlap = ra + rb - Math.abs(dist);
    if (overlap <= 0) return null;
    if (overlap < best) {
      best = overlap;
      const s = dist < 0 ? -1 : 1;
      bnx = nx * s; bny = ny * s; bnz = nz * s;
    }
  }
  out.depth = best; out.nx = bnx; out.ny = bny; out.nz = bnz;
  return out;
}
const _satAxes = new Float64Array(3 * 15);
