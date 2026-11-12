/*
 * tools/solidity.mjs — developer audit: finds things you can see but walk
 * through, and things that stop you but can't be seen. NOT needed to play.
 *
 * Boots the game headless (like smoke.mjs), records which source line drew
 * every triangle and added every collider, then, for every point of a grid
 * over the area (on the street, the pavement, a plaza or a bridge deck),
 * casts horizontal rays in eight directions at 0.4, 1.0 and 1.6 m above the
 * ground, both against what is drawn (the static scene) and against the
 * physics world (`physics.raycast`, solid colliders). It reports:
 *
 *   GHOST      something drawn with nothing solid behind it (Jay walks
 *              through it). Leaves, flat paint, water and anything wholly
 *              above 2.3 m are never tested.
 *   INVISIBLE  something solid where nothing is drawn, on a road, a
 *              pavement or a plaza (an invisible wall). The `boundary`
 *              walls at the edge of the world and the bay are left out.
 *
 * Findings are clustered into objects: centre, size, hit count, and the
 * source lines that most likely built them (file:line < caller < caller).
 *
 *   node vicehaven/tools/solidity.mjs neonstrand palomafield    district ids
 *   node vicehaven/tools/solidity.mjs 800,-60,980,150           a rectangle x0,z0,x1,z1
 *   node vicehaven/tools/solidity.mjs new                       the twelve 3.0 districts + the bridges
 *   options: --step 1.5 (grid spacing, m)  --range 2.6 (ray length, m)
 *            --min 3 (smallest cluster, in hits, worth listing)  --json out.json
 *            --only ghost|invisible  --file neonstrand.js (only clusters whose source names it)
 *
 * Exit code 0 always (it is a report, not a test); the last line is a summary.
 */
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
let playwright;
try {
  playwright = require('playwright');
} catch {
  playwright = require(path.join(execSync('npm root -g').toString().trim(), 'playwright'));
}

const here = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const opt = { step: 1.5, range: 2.6, min: 3, json: null, only: null, file: null };
const areas = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a.startsWith('--')) {
    const k = a.slice(2);
    const v = argv[++i];
    opt[k] = ['step', 'range', 'min'].includes(k) ? Number(v) : v;
  } else areas.push(a);
}
if (!areas.length) {
  console.log('usage: node vicehaven/tools/solidity.mjs <district id | x0,z0,x1,z1 | new> [...] [--step m] [--range m] [--min hits] [--json file] [--only ghost|invisible] [--file name.js]');
  process.exit(0);
}
const NEW = ['sandpiper', 'vistaverde', 'ironside', 'thebowl', 'sunreel', 'cindercreek', 'halcyon', 'coralmarina', 'neonstrand', 'oldpaloma', 'palomaheights', 'palomafield'];

// --------------------------------------------------------------- page hooks
// Runs before any game script: wraps GeometryBuilder and CollisionWorld as
// they are defined, so every triangle run and collider remembers its caller.
function installHooks() {
  const SRC = (window.__solidSrc = { names: [''], ids: new Map([['', 0]]) });
  const intern = (s) => {
    let i = SRC.ids.get(s);
    if (i === undefined) {
      i = SRC.names.length;
      SRC.names.push(s);
      SRC.ids.set(s, i);
    }
    return i;
  };
  const prep = (e, cs) => cs;
  function where() {
    const prev = Error.prepareStackTrace;
    const lim = Error.stackTraceLimit;
    Error.stackTraceLimit = 14;
    Error.prepareStackTrace = prep;
    const o = {};
    Error.captureStackTrace(o, where);
    const cs = o.stack;
    Error.prepareStackTrace = prev;
    Error.stackTraceLimit = lim;
    const out = [];
    for (const c of cs || []) {
      const m = /\/js\/(.+?\.js)$/.exec(c.getFileName() || '');
      if (!m || m[1] === 'geometry.js' || m[1] === 'physics.js' || m[1].startsWith('lib/')) continue;
      const s = m[1] + ':' + c.getLineNumber();
      if (out[out.length - 1] !== s) out.push(s);
      if (out.length >= 3) break;
    }
    return intern(out.join(' < '));
  }
  let depth = 0;
  function hookBuilder(GB) {
    const P = GB.prototype;
    for (const m of Object.getOwnPropertyNames(P)) {
      if (['constructor', 'vertex', 'append', 'build'].includes(m)) continue;
      const d = Object.getOwnPropertyDescriptor(P, m);
      if (typeof d.value !== 'function') continue;
      const orig = d.value;
      P[m] = function () {
        if (depth++ === 0) {
          const id = where();
          const r = this._srcRuns || (this._srcRuns = []);
          if (!r.length || r[r.length - 1] !== id || r[r.length - 2] > this.idx.length) r.push(this.idx.length, id);
        }
        try {
          return orig.apply(this, arguments);
        } finally {
          depth--;
        }
      };
    }
    const append = P.append;
    P.append = function (other) {
      const base = this.idx.length;
      const r = this._srcRuns || (this._srcRuns = []);
      const o = other._srcRuns || [];
      for (let i = 0; i < o.length; i += 2) r.push(base + o[i], o[i + 1]);
      r.push(base + other.idx.length, -1); // the next call starts a fresh run
      return append.call(this, other);
    };
    const build = P.build;
    P.build = function () {
      const g = build.call(this);
      if (this._srcRuns) g.userData.srcRuns = Int32Array.from(this._srcRuns);
      return g;
    };
  }
  function hookPhysics(CW) {
    const make = CW.prototype._make;
    CW.prototype._make = function () {
      const col = make.apply(this, arguments);
      col.src = where();
      return col;
    };
  }
  function trap(obj, key, hook) {
    let val = obj[key];
    if (val) hook(val);
    Object.defineProperty(obj, key, {
      configurable: true,
      get() {
        return val;
      },
      set(v) {
        val = v;
        if (v) hook(v);
      },
    });
  }
  // Meshes made outside the chunk builders: remember who added them to the scene.
  let hookedAdd = false;
  function hookAdd() {
    if (hookedAdd || !window.THREE || !THREE.Object3D) return;
    hookedAdd = true;
    const add = THREE.Object3D.prototype.add;
    THREE.Object3D.prototype.add = function () {
      for (let i = 0; i < arguments.length; i++) {
        const o = arguments[i];
        if (o && o.userData && o.userData.solidSrc === undefined) o.userData.solidSrc = where();
      }
      return add.apply(this, arguments);
    };
  }
  trap(window, 'VH', (vh) => {
    hookAdd();
    trap(vh, 'GeometryBuilder', hookBuilder);
    trap(vh, 'CollisionWorld', hookPhysics);
  });
}

// --------------------------------------------------------------- the audit
// Runs in the page. Returns raw findings (clustered) for one rectangle.
function audit(a) {
  const g = VH.game;
  const W = g.world;
  const phys = W.physics;
  const SRC = window.__solidSrc;
  const COL = VH.COLLIDE;
  const R = a.range;
  const LEVELS = [0.4, 1.0, 1.6];
  const MARGIN = 0.6;
  const rect = a.rect;
  const pad = R + 1;
  const bx0 = rect.minX - pad, bx1 = rect.maxX + pad, bz0 = rect.minZ - pad, bz1 = rect.maxZ + pad;
  const WALK_TAGS = /^(road|kerb|plaza|pier|boardwalk|plank|bridge|deck|pavement|sidewalk)/;
  const DECK_TAGS = /^(road|kerb|plaza|pier|boardwalk|plank|bridge|deck|pavement|sidewalk|metal)/;

  // ---- the points: on the ground (or a deck over the water), not inside anything solid
  // Points cover the area plus a margin, so Jay's way in from the street can be traced.
  const PADR = 24;
  const st = a.step;
  const pts = [];
  const grid = new Map();
  const levelSet = new Set();
  for (let iz = Math.floor((rect.minZ - PADR) / st); (iz + 0.5) * st < rect.maxZ + PADR; iz++) {
    for (let ix = Math.floor((rect.minX - PADR) / st); (ix + 0.5) * st < rect.maxX + PADR; ix++) {
      const x = (ix + 0.5) * st, z = (iz + 0.5) * st;
      let y = phys.groundHeight(x, z, 1.2); // the street, or a platform or stage Jay can step or climb onto
      let col = phys.lastGround;
      if (!VH.CityGen.isLand(x, z)) {
        y = phys.groundHeight(x, z, 1.5); // decks, quays and jetties sit at street level
        col = phys.lastGround;
        if (!col || !DECK_TAGS.test(col.tag)) continue; // water
      }
      if (col && col.tag === 'boundary') continue;
      // Standing room: no solid collider overlapping Jay's body here.
      if (phys.overlaps(x, z, 0.12, y + 0.3, y + 1.7)) continue;
      const inside = x >= rect.minX && x < rect.maxX && z >= rect.minZ && z < rect.maxZ;
      const p = { x, z, y, ix, iz, inside, walk: !!col && WALK_TAGS.test(col.tag), road: !!col && (col.tag === 'road' || (col.tag === 'kerb' && y < 0.2)), reach: false };
      grid.set(ix + ':' + iz, p);
      pts.push(p);
      if (inside) for (const L of LEVELS) levelSet.add(Math.round((y + L) * 20) / 20);
    }
  }
  // Reachable on foot from a road or a pavement: neighbours join when the climb
  // between them is at most 1.7 m and nothing taller than a vault (1.15 m) is in
  // the way. Places behind a fence too tall to vault (ride machinery) drop out.
  const queue = [];
  for (const p of pts) if (p.road) { p.reach = true; queue.push(p); }
  const fopts = { flags: COL.SOLID, ground: false };
  while (queue.length) {
    const p = queue.pop();
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const q = grid.get(p.ix + dx + ':' + (p.iz + dz));
      if (!q || q.reach || Math.abs(q.y - p.y) > 1.7) continue;
      if (phys.raycast(p.x, Math.max(p.y, q.y) + 1.2, p.z, dx, 0, dz, st, fopts)) continue;
      q.reach = true;
      queue.push(q);
    }
  }
  const levels = Array.from(levelSet);
  const yLo = Math.min(...levels) - 0.01, yHi = Math.max(...levels) + 0.01;

  // ---- what is drawn: every static triangle in the area that could cut a level
  const matKey = new Map();
  for (const k of Object.keys(W.materials)) matKey.set(W.materials[k], k);
  const SKIP_MAT = new Set(['decal', 'markings', 'lampGlow', 'signalLamp', 'beacon', 'water', 'fountainWater', 'foliageDepth']);
  const propType = new Map();
  if (W.props && W.props.batches) {
    for (const [k, list] of W.props.batches) for (const m of [].concat(list)) propType.set(m, k.split('|')[1]);
  }
  const SKIP_NAME = /^(car-|bike-|boat-|plane-|heli|stash-|crowd|humanoid|fx |sky|mission|lamp pools|car light|floodlight pools|skid|blood|tracers|bullet|club beam|airliner bullet|lantern )/; // lanterns are collectibles, walked into on purpose
  const meshes = [];
  const vehicleRoots = new Set();
  for (const veh of (g.vehicles && g.vehicles.list) || []) if (veh.model && veh.model.root) vehicleRoots.add(veh.model.root);
  // Chunks and props far from the camera are hidden (world.update, props.update): count them anyway.
  const walk = (o, inWorld) => {
    inWorld = inWorld || o === W.root;
    if (!o.visible && !inWorld) return;
    if (SKIP_NAME.test(o.name || '')) return;
    if (o === g.player.model.root || vehicleRoots.has(o)) return; // vehicles bump Jay themselves
    if ((o.isMesh || o.isInstancedMesh) && !o.isSkinnedMesh && o.geometry && o.geometry.index !== undefined) meshes.push(o);
    for (const c of o.children) walk(c, inWorld);
  };
  for (const c of g.scene.children) walk(c, false);
  g.scene.updateMatrixWorld(true);

  const tri = []; // x0 y0 z0 x1 y1 z1 x2 y2 z2
  const triSrc = [];
  const triFol = [];
  const srcName = (s) => SRC.names[s] || '';
  const extraSrc = new Map();
  const nameSrc = (s) => {
    let i = extraSrc.get(s);
    if (i === undefined) {
      i = SRC.names.length;
      SRC.names.push(s);
      extraSrc.set(s, i);
    }
    return i;
  };
  const M = new THREE.Matrix4();
  const IM = new THREE.Matrix4();
  const v = new THREE.Vector3();
  const box = new THREE.Box3();
  for (const mesh of meshes) {
    const mats = [].concat(mesh.material);
    const mk = matKey.get(mats[0]);
    if (mk && SKIP_MAT.has(mk)) continue;
    const m0 = mats[0];
    if (m0 && m0.transparent && m0.opacity < 0.5) continue;
    if (m0 && m0.blending === THREE.AdditiveBlending) continue;
    const fol = mk === 'foliage' || (m0 && /foliage|leaf|canopy/i.test(m0.name || ''));
    const geo = mesh.geometry;
    const pos = geo.attributes.position;
    if (!pos) continue;
    if (!geo.boundingBox) geo.computeBoundingBox();
    const runs = geo.userData.srcRuns || null;
    const pt = propType.get(mesh);
    let added = mesh;
    while (added && added.userData.solidSrc === undefined) added = added.parent;
    const by = added && added.userData.solidSrc ? ' added at ' + srcName(added.userData.solidSrc) : '';
    const fallback = nameSrc(pt ? 'props.js (' + pt + ')' : 'mesh "' + (mesh.name || '') + '"' + by);
    const idx = geo.index ? geo.index.array : null;
    const nTri = idx ? idx.length / 3 : pos.count / 3;
    const count = mesh.isInstancedMesh ? mesh.count : 1;
    for (let inst = 0; inst < count; inst++) {
      if (mesh.isInstancedMesh) {
        mesh.getMatrixAt(inst, IM);
        M.multiplyMatrices(mesh.matrixWorld, IM);
      } else M.copy(mesh.matrixWorld);
      box.copy(geo.boundingBox).applyMatrix4(M);
      if (box.max.x < bx0 || box.min.x > bx1 || box.max.z < bz0 || box.min.z > bz1) continue;
      if (box.max.y < yLo || box.min.y > yHi) continue;
      const e = M.elements;
      const P = pos.array;
      let run = 0;
      for (let t = 0; t < nTri; t++) {
        let src = fallback;
        if (runs) {
          while (run + 2 < runs.length && runs[run + 2] <= t * 3) run += 2;
          if (runs[run + 1] > 0) src = runs[run + 1];
        }
        const base = tri.length;
        let mnx = Infinity, mxx = -Infinity, mny = Infinity, mxy = -Infinity, mnz = Infinity, mxz = -Infinity;
        for (let k = 0; k < 3; k++) {
          const vi = idx ? idx[t * 3 + k] : t * 3 + k;
          const px = P[vi * 3], py = P[vi * 3 + 1], pz = P[vi * 3 + 2];
          const wx = e[0] * px + e[4] * py + e[8] * pz + e[12];
          const wy = e[1] * px + e[5] * py + e[9] * pz + e[13];
          const wz = e[2] * px + e[6] * py + e[10] * pz + e[14];
          tri.push(wx, wy, wz);
          if (wx < mnx) mnx = wx; if (wx > mxx) mxx = wx;
          if (wy < mny) mny = wy; if (wy > mxy) mxy = wy;
          if (wz < mnz) mnz = wz; if (wz > mxz) mxz = wz;
        }
        // Keep it only if it is in the area, cuts a level and is not flat.
        if (mxx < bx0 || mnx > bx1 || mxz < bz0 || mnz > bz1 || mxy < yLo || mny > yHi || mxy - mny < 0.05) {
          tri.length = base;
          continue;
        }
        triSrc.push(src);
        triFol.push(fol ? 1 : 0);
      }
    }
  }
  const nT = triSrc.length;

  // ---- slice the triangles at each level into 2D segments, binned in 1 m cells
  const CELL = 1;
  const gx0 = Math.floor(bx0), gz0 = Math.floor(bz0);
  const GW = Math.ceil(bx1 - gx0) + 1, GH = Math.ceil(bz1 - gz0) + 1;
  const slices = new Map();
  function slice(y) {
    let s = slices.get(y);
    if (s) return s;
    const seg = [];
    const segT = [];
    const cells = new Map();
    for (let t = 0; t < nT; t++) {
      const o = t * 9;
      let n = 0;
      let ax = 0, az = 0, bxx = 0, bzz = 0;
      for (let k = 0; k < 3; k++) {
        const p = o + k * 3, q = o + ((k + 1) % 3) * 3;
        const y0 = tri[p + 1] - y, y1 = tri[q + 1] - y;
        if ((y0 < 0) === (y1 < 0)) continue;
        const f = y0 / (y0 - y1);
        const x = tri[p] + (tri[q] - tri[p]) * f, z = tri[p + 2] + (tri[q + 2] - tri[p + 2]) * f;
        if (n === 0) { ax = x; az = z; } else { bxx = x; bzz = z; }
        n++;
      }
      if (n < 2) continue;
      const si = segT.length;
      seg.push(ax, az, bxx, bzz);
      segT.push(t);
      const cx0 = Math.floor((Math.min(ax, bxx) - gx0) / CELL), cx1 = Math.floor((Math.max(ax, bxx) - gx0) / CELL);
      const cz0 = Math.floor((Math.min(az, bzz) - gz0) / CELL), cz1 = Math.floor((Math.max(az, bzz) - gz0) / CELL);
      for (let cx = Math.max(0, cx0); cx <= Math.min(GW - 1, cx1); cx++) {
        for (let cz = Math.max(0, cz0); cz <= Math.min(GH - 1, cz1); cz++) {
          const key = cz * GW + cx;
          let l = cells.get(key);
          if (!l) cells.set(key, (l = []));
          l.push(si);
        }
      }
    }
    s = { seg, segT, cells, stamp: new Int32Array(segT.length), st: 0 };
    slices.set(y, s);
    return s;
  }
  // Nearest drawn surface along a horizontal ray; solidOnly skips foliage.
  const hitOut = { t: Infinity, tri: -1 };
  function visRay(s, ox, oz, dx, dz, maxT, solidOnly) {
    hitOut.t = Infinity;
    hitOut.tri = -1;
    const st = ++s.st;
    const ex = ox + dx * maxT, ez = oz + dz * maxT;
    const cx0 = Math.max(0, Math.floor((Math.min(ox, ex) - gx0) / CELL)), cx1 = Math.min(GW - 1, Math.floor((Math.max(ox, ex) - gx0) / CELL));
    const cz0 = Math.max(0, Math.floor((Math.min(oz, ez) - gz0) / CELL)), cz1 = Math.min(GH - 1, Math.floor((Math.max(oz, ez) - gz0) / CELL));
    for (let cx = cx0; cx <= cx1; cx++) {
      for (let cz = cz0; cz <= cz1; cz++) {
        const l = s.cells.get(cz * GW + cx);
        if (!l) continue;
        for (const si of l) {
          if (s.stamp[si] === st) continue;
          s.stamp[si] = st;
          const t = s.segT[si];
          if (solidOnly && triFol[t]) continue;
          const o = si * 4;
          const ax = s.seg[o], az = s.seg[o + 1], qx = s.seg[o + 2] - ax, qz = s.seg[o + 3] - az;
          const den = dx * qz - dz * qx;
          if (Math.abs(den) < 1e-9) continue;
          const wx = ax - ox, wz = az - oz;
          const tr = (wx * qz - wz * qx) / den;
          const u = (wx * dz - wz * dx) / den;
          if (tr < 0 || tr > maxT || u < 0 || u > 1) continue;
          if (tr < hitOut.t) {
            hitOut.t = tr;
            hitOut.tri = t;
          }
        }
      }
    }
    return hitOut;
  }

  // Every kept triangle's footprint, binned in the same 1 m cells (for drawnNear).
  const triCells = new Map();
  const tb = new Float32Array(nT * 6);
  for (let t = 0; t < nT; t++) {
    const o = t * 9;
    const x0 = Math.min(tri[o], tri[o + 3], tri[o + 6]), x1 = Math.max(tri[o], tri[o + 3], tri[o + 6]);
    const z0 = Math.min(tri[o + 2], tri[o + 5], tri[o + 8]), z1 = Math.max(tri[o + 2], tri[o + 5], tri[o + 8]);
    tb.set([x0, z0, x1, z1, Math.min(tri[o + 1], tri[o + 4], tri[o + 7]), Math.max(tri[o + 1], tri[o + 4], tri[o + 7])], t * 6);
    const cx0 = Math.max(0, Math.floor(x0 - gx0)), cx1 = Math.min(GW - 1, Math.floor(x1 - gx0));
    const cz0 = Math.max(0, Math.floor(z0 - gz0)), cz1 = Math.min(GH - 1, Math.floor(z1 - gz0));
    if ((cx1 - cx0 + 1) * (cz1 - cz0 + 1) > 400) continue; // huge (ground sheets): never what bounds a wall
    for (let cx = cx0; cx <= cx1; cx++) {
      for (let cz = cz0; cz <= cz1; cz++) {
        const key = cz * GW + cx;
        let l = triCells.get(key);
        if (!l) triCells.set(key, (l = []));
        l.push(t);
      }
    }
  }
  function drawnNear(x, z, r, y0, y1) {
    const cx0 = Math.max(0, Math.floor(x - r - gx0)), cx1 = Math.min(GW - 1, Math.floor(x + r - gx0));
    const cz0 = Math.max(0, Math.floor(z - r - gz0)), cz1 = Math.min(GH - 1, Math.floor(z + r - gz0));
    for (let cx = cx0; cx <= cx1; cx++) {
      for (let cz = cz0; cz <= cz1; cz++) {
        const l = triCells.get(cz * GW + cx);
        if (!l) continue;
        for (const t of l) {
          const o = t * 6;
          if (tb[o] > x + r || tb[o + 2] < x - r || tb[o + 1] > z + r || tb[o + 3] < z - r) continue;
          if (tb[o + 4] > y1 || tb[o + 5] < y0) continue;
          return true;
        }
      }
    }
    return false;
  }

  // ---- cast
  const DIRS = [];
  for (let k = 0; k < 8; k++) DIRS.push([Math.sin((k * Math.PI) / 4), Math.cos((k * Math.PI) / 4)]);
  const finds = []; // kind, x, y, z, src, h (height above ground)
  const ropts = { flags: COL.SOLID, ground: false, inflate: 0.05 }; // a hair fat, so rays grazing a face along its plane still count
  let rays = 0;
  function blockedAt(p, dx, dz, t) {
    const h = phys.raycast(p.x, p.y + 1.0, p.z, dx, 0, dz, t, ropts);
    return !!h && h.t < t - 0.05;
  }
  let unreachable = 0;
  for (const p of pts) {
    if (!p.inside) continue;
    if (!p.reach) {
      unreachable++;
      continue;
    }
    for (const L of LEVELS) {
      const y = Math.round((p.y + L) * 20) / 20;
      const s = slice(y);
      for (const [dx, dz] of DIRS) {
        rays++;
        const ph = phys.raycast(p.x, y, p.z, dx, 0, dz, R + MARGIN + 0.2, ropts);
        const dp = ph ? ph.t : Infinity;
        const vh = visRay(s, p.x, p.z, dx, dz, R + MARGIN + 0.2, true);
        // Behind a barrier Jay can't get past (a ride's fence), a ghost can't be walked into.
        // A visual within 0.15 m of a collider (a door proud of its wall) can't be walked into: Jay is 0.3 m round.
        if (vh.t < R && dp > vh.t + MARGIN && !(L > 1.2 && blockedAt(p, dx, dz, vh.t)) &&
            !phys.overlaps(p.x + dx * vh.t, p.z + dz * vh.t, 0.15, y - 0.05, y + 0.05)) {
          finds.push(0, p.x + dx * vh.t, y, p.z + dz * vh.t, triSrc[vh.tri], L);
        } else if (p.walk && ph && dp < R && ph.collider && ph.collider.tag !== 'boundary' && ph.collider.tag !== 'prop') {
          // A railing or a fence is mostly air: it only counts as invisible if
          // nothing at all is drawn near the face Jay bumps into, at any body height.
          const va = visRay(s, p.x, p.z, dx, dz, R + MARGIN + 0.2, false);
          if (va.t > dp + MARGIN && !drawnNear(ph.x, ph.z, 0.5, p.y, p.y + 2.3)) finds.push(1, ph.x, y, ph.z, ph.collider.src || 0, L);
        }
      }
    }
  }

  // ---- cluster: 1 m cells, 8-connected, per kind
  const cellOf = new Map();
  const n = finds.length / 6;
  for (let i = 0; i < n; i++) {
    const o = i * 6;
    const key = finds[o] + ':' + Math.floor(finds[o + 1]) + ':' + Math.floor(finds[o + 3]);
    let l = cellOf.get(key);
    if (!l) cellOf.set(key, (l = []));
    l.push(i);
  }
  const seen = new Set();
  const clusters = [];
  for (const key of cellOf.keys()) {
    if (seen.has(key)) continue;
    const [kind] = key.split(':').map(Number);
    const stack = [key];
    seen.add(key);
    const members = [];
    while (stack.length) {
      const k = stack.pop();
      members.push(...cellOf.get(k));
      const [, cx, cz] = k.split(':').map(Number);
      for (let ddx = -1; ddx <= 1; ddx++) {
        for (let ddz = -1; ddz <= 1; ddz++) {
          const nk = kind + ':' + (cx + ddx) + ':' + (cz + ddz);
          if (!seen.has(nk) && cellOf.has(nk)) {
            seen.add(nk);
            stack.push(nk);
          }
        }
      }
    }
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    const srcCount = new Map();
    const hs = new Set();
    for (const i of members) {
      const o = i * 6;
      x0 = Math.min(x0, finds[o + 1]); x1 = Math.max(x1, finds[o + 1]);
      y0 = Math.min(y0, finds[o + 2]); y1 = Math.max(y1, finds[o + 2]);
      z0 = Math.min(z0, finds[o + 3]); z1 = Math.max(z1, finds[o + 3]);
      srcCount.set(finds[o + 4], (srcCount.get(finds[o + 4]) || 0) + 1);
      hs.add(finds[o + 5]);
    }
    const src = Array.from(srcCount.entries()).sort((p, q) => q[1] - p[1]).slice(0, 3).map(([s, c]) => [srcName(s), c]);
    clusters.push({
      kind: kind ? 'INVISIBLE' : 'GHOST',
      hits: members.length,
      x: +((x0 + x1) / 2).toFixed(1), z: +((z0 + z1) / 2).toFixed(1),
      sx: +(x1 - x0).toFixed(1), sz: +(z1 - z0).toFixed(1),
      y0: +y0.toFixed(2), y1: +y1.toFixed(2),
      levels: Array.from(hs).sort(),
      src,
    });
  }
  clusters.sort((p, q) => q.hits - p.hits);
  return { name: a.name, points: pts.length, unreachable, tris: nT, rays, clusters };
}

// --------------------------------------------------------------- run
const browser = await playwright.chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--allow-file-access-from-files'],
});
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
await page.addInitScript(() => { try { localStorage.clear(); localStorage.setItem('vicehaven.settings.v1', JSON.stringify({ version: 1, graphics: { quality: 'low' } })); } catch (e) {} });
await page.addInitScript(installHooks);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const t0 = Date.now();
await page.goto(pathToFileURL(path.join(here, '..', 'index.html')).href);
await page.waitForFunction(() => window.VH && VH.game && VH.game.state === 'title', null, { timeout: 400000 });
await page.evaluate(() => { const g = VH.game; g.freeze(true); g.noAutoStory = true; g.noAutoSave = true; g.newGame(); g.advance(1); });
console.log('[solidity] booted in ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s' + (errors.length ? '; page errors: ' + errors.join(' | ') : ''));

const rects = await page.evaluate((list) => {
  const out = [];
  const ds = VH.Data.districts;
  const all = Array.isArray(ds) ? ds : Object.values(ds);
  for (const name of list) {
    const m = /^(-?[\d.]+),(-?[\d.]+),(-?[\d.]+),(-?[\d.]+)$/.exec(name);
    if (m) {
      const [x0, z0, x1, z1] = m.slice(1).map(Number);
      out.push({ name, rect: { minX: Math.min(x0, x1), maxX: Math.max(x0, x1), minZ: Math.min(z0, z1), maxZ: Math.max(z0, z1) } });
      continue;
    }
    if (name === 'bridges') {
      for (const br of (VH.Island && VH.Island.bridges) || []) {
        out.push({ name: 'bridge ' + (br.name || br.coord), rect: { minX: br.from - 4, maxX: br.to + 4, minZ: br.coord - br.width / 2 - 6, maxZ: br.coord + br.width / 2 + 6 } });
      }
      continue;
    }
    const d = all.find((q) => q.id === name);
    if (!d) {
      out.push({ name, error: 'unknown district or rectangle' });
      continue;
    }
    const r = d.rect;
    // Districts are cut at the plot/road lines; keep each rectangle to the playable area.
    out.push({ name, rect: { minX: Math.max(r.minX, -1600), maxX: Math.min(r.maxX, 1700), minZ: Math.max(r.minZ, -1800), maxZ: Math.min(r.maxZ, 1800) } });
  }
  return out;
}, areas.flatMap((a) => (a === 'new' ? [...NEW, 'bridges'] : [a])));

const fileCache = new Map();
function fileLines(f) {
  if (!fileCache.has(f)) fileCache.set(f, fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n') : []);
  return fileCache.get(f);
}
const all = [];
let ghosts = 0;
let invis = 0;
for (const r of rects) {
  if (r.error) {
    console.log('[solidity] ' + r.name + ': ' + r.error);
    continue;
  }
  // Big districts go in tiles, so one page call never holds too much.
  const T = 160;
  const tiles = [];
  for (let x = r.rect.minX; x < r.rect.maxX; x += T) {
    for (let z = r.rect.minZ; z < r.rect.maxZ; z += T) tiles.push({ minX: x, maxX: Math.min(r.rect.maxX, x + T), minZ: z, maxZ: Math.min(r.rect.maxZ, z + T) });
  }
  const t1 = Date.now();
  let res = { points: 0, unreachable: 0, tris: 0, rays: 0, clusters: [] };
  for (const tile of tiles) {
    const q = await page.evaluate(`(${audit.toString()})(${JSON.stringify({ name: r.name, rect: tile, step: opt.step, range: opt.range })})`);
    res.points += q.points;
    res.unreachable += q.unreachable;
    res.tris += q.tris;
    res.rays += q.rays;
    res.clusters.push(...q.clusters);
  }
  // A source line marked `// solidity: passable` (spray, a bead curtain) is meant to be walked through.
  const passable = (c) => c.src.every(([sname]) => {
    const m = /^([\w/.-]+\.js):(\d+)/.exec(sname || '');
    if (!m) return false;
    const lines = fileLines(path.join(here, '..', 'js', m[1]));
    return /solidity:\s*passable/.test(lines[Number(m[2]) - 1] || '');
  });
  const skipped = res.clusters.filter((c) => c.hits >= opt.min && passable(c)).length;
  let list = res.clusters.filter((c) => c.hits >= opt.min && !passable(c));
  if (opt.only) list = list.filter((c) => c.kind.toLowerCase() === opt.only.toLowerCase());
  if (opt.file) list = list.filter((c) => c.src.some(([s]) => s.includes(opt.file)));
  list.sort((p, q) => q.hits - p.hits);
  const g = list.filter((c) => c.kind === 'GHOST').length;
  const iv = list.length - g;
  ghosts += g;
  invis += iv;
  console.log('\n== ' + r.name + '  x ' + r.rect.minX + '..' + r.rect.maxX + ', z ' + r.rect.minZ + '..' + r.rect.maxZ +
    '  (' + res.points + ' points, ' + res.unreachable + ' out of reach, ' + res.rays + ' rays, ' + ((Date.now() - t1) / 1000).toFixed(1) + ' s): ' + g + ' ghost, ' + iv + ' invisible' +
    (skipped ? ' (' + skipped + ' marked passable)' : ''));
  for (const c of list) {
    console.log(`  ${c.kind.padEnd(9)} at ${c.x}, ${c.z}  size ${c.sx} x ${c.sz}  y ${c.y0}..${c.y1}  hits ${c.hits}  levels ${c.levels.join('/')}`);
    for (const [s, n] of c.src) console.log(`      ${String(n).padStart(4)}  ${s || '(unknown)'}`);
  }
  all.push({ name: r.name, rect: r.rect, clusters: list });
}
if (opt.json) fs.writeFileSync(opt.json, JSON.stringify(all, null, 1));
if (errors.length) console.log('[solidity] page errors: ' + errors.join(' | '));
console.log(`\n[solidity] ${ghosts} ghost, ${invis} invisible cluster(s) of ${opt.min}+ hits`);
await browser.close();
