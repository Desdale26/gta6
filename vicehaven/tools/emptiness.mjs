/*
 * tools/emptiness.mjs — developer audit: where is the world still empty?
 * NOT needed to play.
 *
 * Boots the game headless (like smoke.mjs and solidity.mjs) and looks down
 * on the world through a grid of cells (24 m by default). Every static thing
 * that is drawn (the chunk meshes, builders' own meshes, instanced props)
 * is laid onto a 4 m sub-grid, except the plain ground grass, the bare
 * pavement slab under a block and the trees (scattered trees on grass are
 * exactly what "empty" looks like). Each cell is then one of:
 *
 *   EMPTY  land with less than a quarter of it covered by anything
 *   OPEN   empty, but inside ground a builder declared deliberate open space
 *          (VH.Districts.open(x0, z0, x1, z1, label): a runway's grass
 *          strips, a sports pitch, a golf fairway that isn't drawn ...)
 *   PLOT   a reserved landmark plot nobody has claimed yet (the placeholder)
 *   BUILT  covered: buildings, yards, fields, car parks, lawns, paths ...
 *   ROAD   the cell's centre is on a carriageway
 *   WATER  the cell's centre is in the bay and nothing is built over it
 *
 *   node vicehaven/tools/emptiness.mjs                    the whole world
 *   node vicehaven/tools/emptiness.mjs haverly redwater   district ids ('new' = the six 4.0 ones)
 *   node vicehaven/tools/emptiness.mjs --region -1600,-1800,-1100,-1100
 *   options: --cell 24 (cell size, m)  --cover 0.25 (share of a cell that must be covered)
 *            --png out.png (default emptiness.png in the current folder; --png none to skip)
 *            --json out.json   --top 15 (largest empty rectangles to list)  --min 4 (their least cells)
 *
 * Prints a summary, a table per district (land cells, empty, open, plot,
 * built, % empty) and the largest empty rectangles in world metres
 * (x0, z0 .. x1, z1), largest first. The PNG: red = empty, green = open,
 * orange = unclaimed plot, grey = built, dark = road, blue = water, with
 * district outlines and names, and the listed rectangles numbered in yellow.
 * Exit code 0 always (it is a report, not a test).
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
const opt = { cell: 24, cover: 0.25, png: 'emptiness.png', json: null, top: 15, min: 4, region: null };
const ids = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a.startsWith('--')) {
    const k = a.slice(2);
    const v = argv[++i];
    opt[k] = ['cell', 'cover', 'top', 'min'].includes(k) ? Number(v) : v;
  } else ids.push(a);
}
if (opt.region) {
  const r = opt.region.split(',').map(Number);
  if (r.length !== 4 || r.some((v) => !Number.isFinite(v))) {
    console.log('--region wants x0,z0,x1,z1');
    process.exit(0);
  }
  opt.region = { minX: Math.min(r[0], r[2]), minZ: Math.min(r[1], r[3]), maxX: Math.max(r[0], r[2]), maxZ: Math.max(r[1], r[3]) };
}

// --------------------------------------------------------------- page hooks
// Runs before any game script: remembers which draws are the plain ground
// (World._buildGround) and the bare pavement slabs (sidewalk tops), so the
// scan can look past them.
function installHooks() {
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
  let ground = 0;
  trap(window, 'VH', (vh) => {
    trap(vh, 'GeometryBuilder', (GB) => {
      const P = GB.prototype;
      for (const m of Object.getOwnPropertyNames(P)) {
        if (['constructor', 'vertex', 'append', 'build'].includes(m)) continue;
        const d = Object.getOwnPropertyDescriptor(P, m);
        if (typeof d.value !== 'function') continue;
        const orig = d.value;
        P[m] = function () {
          // 1 = plain ground, 2 = a bare pavement top, 0 = anything else.
          const f = ground ? 1 : this._surf === 'sidewalk' && m === 'topRect' ? 2 : 0;
          const r = this._baseRuns || (this._baseRuns = []);
          if (!r.length || r[r.length - 1] !== f) r.push(this.idx.length, f);
          return orig.apply(this, arguments);
        };
      }
      const append = P.append;
      P.append = function (other) {
        const base = this.idx.length;
        const r = this._baseRuns || (this._baseRuns = []);
        const o = other._baseRuns || [];
        for (let i = 0; i < o.length; i += 2) r.push(base + o[i], o[i + 1]);
        r.push(base + other.idx.length, 0);
        return append.call(this, other);
      };
      const build = P.build;
      P.build = function () {
        const g = build.call(this);
        if (this._baseRuns) g.userData.baseRuns = Int32Array.from(this._baseRuns);
        return g;
      };
    });
    trap(vh, 'World', (W) => {
      const P = W.prototype;
      const bg = P._buildGround;
      P._buildGround = function () {
        ground = 1;
        try {
          return bg.apply(this, arguments);
        } finally {
          ground = 0;
        }
      };
      const builder = P.builder;
      P.builder = function (chunk, surface) {
        const b = builder.call(this, chunk, surface);
        b._surf = surface;
        return b;
      };
    });
  });
}

// --------------------------------------------------------------- the scan
function scan(a) {
  const g = VH.game;
  const W = g.world;
  const L = g.layout;
  const B = L.bounds || L.config.bounds;
  const SUB = 4;
  const C = a.cell;
  const R = a.rect;
  const nx = Math.max(1, Math.ceil((R.maxX - R.minX) / C));
  const nz = Math.max(1, Math.ceil((R.maxZ - R.minZ) / C));
  const per = Math.max(1, Math.round(C / SUB));
  const sx = nx * per;
  const sz = nz * per;
  const sub = new Uint8Array(sx * sz);
  const sub0x = R.minX;
  const sub0z = R.minZ;
  const subW = C / per;
  const markCell = (ix, iz) => {
    if (ix >= 0 && iz >= 0 && ix < sx && iz < sz) sub[iz * sx + ix] = 1;
  };

  // ---- everything drawn and static
  const matKey = new Map();
  for (const k of Object.keys(W.materials)) matKey.set(W.materials[k], k);
  const SKIP_MAT = new Set(['lampGlow', 'signalLamp', 'beacon', 'water', 'fountainWater', 'foliageDepth']);
  const TREES = /^(tree|treeB|palm|palmTall|pine|bush|shrub)/;
  const propType = new Map();
  if (W.props && W.props.batches) for (const [k, list] of W.props.batches) for (const m of [].concat(list)) propType.set(m, k.split('|')[1]);
  const SKIP_NAME = /^(car-|bike-|boat-|plane-|heli|stash-|crowd|humanoid|fx |sky|mission|lamp pools|car light|floodlight pools|skid|blood|tracers|bullet|club beam|airliner|water|sea|ocean|lantern )/i;
  const vehicleRoots = new Set();
  for (const v of (g.vehicles && g.vehicles.list) || []) if (v.model && v.model.root) vehicleRoots.add(v.model.root);
  const meshes = [];
  const walk = (o, inWorld) => {
    inWorld = inWorld || o === W.root;
    if (!o.visible && !inWorld) return;
    if (SKIP_NAME.test(o.name || '')) return;
    if (o === g.player.model.root || vehicleRoots.has(o)) return;
    if (o.isMesh && !o.isSkinnedMesh && o.geometry && o.geometry.attributes && o.geometry.attributes.position) meshes.push(o);
    for (const c of o.children) walk(c, inWorld);
  };
  for (const c of g.scene.children) walk(c, false);
  g.scene.updateMatrixWorld(true);

  const M = new THREE.Matrix4();
  const IM = new THREE.Matrix4();
  const box = new THREE.Box3();
  const pad = 2;
  let tris = 0;
  for (const mesh of meshes) {
    const mats = [].concat(mesh.material);
    const mk = matKey.get(mats[0]);
    if (mk && SKIP_MAT.has(mk)) continue;
    const m0 = mats[0];
    if (m0 && m0.transparent && m0.opacity < 0.3) continue;
    if (m0 && m0.blending === THREE.AdditiveBlending) continue;
    const pt = propType.get(mesh);
    if (pt && TREES.test(pt)) continue;
    const geo = mesh.geometry;
    const pos = geo.attributes.position;
    if (!geo.boundingBox) geo.computeBoundingBox();
    const runs = geo.userData.baseRuns || null;
    const idx = geo.index ? geo.index.array : null;
    const nTri = idx ? idx.length / 3 : pos.count / 3;
    const count = mesh.isInstancedMesh ? mesh.count : 1;
    const P = pos.array;
    for (let inst = 0; inst < count; inst++) {
      if (mesh.isInstancedMesh) {
        mesh.getMatrixAt(inst, IM);
        M.multiplyMatrices(mesh.matrixWorld, IM);
      } else M.copy(mesh.matrixWorld);
      box.copy(geo.boundingBox).applyMatrix4(M);
      if (box.max.x < R.minX - pad || box.min.x > R.maxX + pad || box.max.z < R.minZ - pad || box.min.z > R.maxZ + pad) continue;
      if (box.max.y < -0.6) continue; // under the water
      const e = M.elements;
      let run = 0;
      for (let t = 0; t < nTri; t++) {
        if (runs) {
          while (run + 2 < runs.length && runs[run + 2] <= t * 3) run += 2;
          if (runs[run + 1] !== 0) continue; // plain ground or a bare pavement top
        }
        const v = [];
        let ylo = Infinity, yhi = -Infinity;
        for (let k = 0; k < 3; k++) {
          const vi = idx ? idx[t * 3 + k] : t * 3 + k;
          const px = P[vi * 3], py = P[vi * 3 + 1], pz = P[vi * 3 + 2];
          const wx = e[0] * px + e[4] * py + e[8] * pz + e[12];
          const wy = e[1] * px + e[5] * py + e[9] * pz + e[13];
          const wz = e[2] * px + e[6] * py + e[10] * pz + e[14];
          v.push(wx, wz);
          if (wy < ylo) ylo = wy;
          if (wy > yhi) yhi = wy;
        }
        if (yhi < -0.6) continue;
        // Kerb faces, slab edges and other low uprights don't fill anything.
        if (yhi - ylo > 0.05 && yhi < 0.3) continue;
        tris++;
        const [x0, z0, x1, z1, x2, z2] = v;
        const mnx = Math.min(x0, x1, x2), mxx = Math.max(x0, x1, x2), mnz = Math.min(z0, z1, z2), mxz = Math.max(z0, z1, z2);
        if (mxx < R.minX || mnx > R.maxX || mxz < R.minZ || mnz > R.maxZ) continue;
        const area2 = (x1 - x0) * (z2 - z0) - (x2 - x0) * (z1 - z0);
        const ix0 = Math.floor((mnx - sub0x) / subW), ix1 = Math.floor((mxx - sub0x) / subW);
        const iz0 = Math.floor((mnz - sub0z) / subW), iz1 = Math.floor((mxz - sub0z) / subW);
        if (Math.abs(area2) < 1) {
          // An upright (a wall, a post): the sub-cells along it.
          if ((ix1 - ix0 + 1) * (iz1 - iz0 + 1) > 4000) continue;
          for (let iz = iz0; iz <= iz1; iz++) for (let ix = ix0; ix <= ix1; ix++) markCell(ix, iz);
          continue;
        }
        // A surface: the sub-cells whose centres it covers (or the one under its middle).
        let hit = false;
        const inv = 1 / area2;
        for (let iz = Math.max(0, iz0); iz <= Math.min(sz - 1, iz1); iz++) {
          const cz = sub0z + (iz + 0.5) * subW;
          for (let ix = Math.max(0, ix0); ix <= Math.min(sx - 1, ix1); ix++) {
            const cx = sub0x + (ix + 0.5) * subW;
            const w1 = ((cx - x0) * (z2 - z0) - (x2 - x0) * (cz - z0)) * inv;
            const w2 = ((x1 - x0) * (cz - z0) - (cx - x0) * (z1 - z0)) * inv;
            if (w1 >= 0 && w2 >= 0 && w1 + w2 <= 1) {
              sub[iz * sx + ix] = 1;
              hit = true;
            }
          }
        }
        if (!hit) markCell(Math.floor(((x0 + x1 + x2) / 3 - sub0x) / subW), Math.floor(((z0 + z1 + z2) / 3 - sub0z) / subW));
      }
    }
  }

  // ---- classify the cells: 0 empty, 1 water, 2 road, 3 built, 4 plot, 5 open
  const isLand = (x, z) => (VH.CityGen && VH.CityGen.isLand ? VH.CityGen.isLand(x, z) : x <= 424);
  const plots = Object.values(L.plots || {});
  const owner = (id) => VH.Districts && VH.Districts.owner && VH.Districts.owner(id);
  const unclaimed = plots.filter((p) => !owner(p.plot));
  const open = (VH.Districts && VH.Districts.openGround) || [];
  const inR = (x, z, r) => x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ;
  const need = Math.max(1, Math.ceil(a.cover * per * per));
  const cls = new Uint8Array(nx * nz);
  for (let iz = 0; iz < nz; iz++) {
    for (let ix = 0; ix < nx; ix++) {
      const cx = R.minX + (ix + 0.5) * C, cz = R.minZ + (iz + 0.5) * C;
      let covered = 0;
      for (let j = 0; j < per; j++) for (let i = 0; i < per; i++) covered += sub[(iz * per + j) * sx + ix * per + i];
      let c;
      if (cx < B.minX || cx > B.maxX || cz < B.minZ || cz > B.maxZ) c = 1;
      else if (W.onRoad(cx, cz, 0)) c = 2;
      else if (!isLand(cx, cz)) c = covered >= need ? 3 : 1;
      else if (unclaimed.some((p) => inR(cx, cz, p))) c = 4;
      else if (covered >= need) c = 3;
      else if (open.some((o) => inR(cx, cz, o))) c = 5;
      else c = 0;
      cls[iz * nx + ix] = c;
    }
  }

  // ---- per district
  const dists = VH.Data.districts;
  const table = {};
  for (let iz = 0; iz < nz; iz++) {
    for (let ix = 0; ix < nx; ix++) {
      const c = cls[iz * nx + ix];
      if (c === 1) continue;
      const cx = R.minX + (ix + 0.5) * C, cz = R.minZ + (iz + 0.5) * C;
      const d = VH.CityGen.districtAt(cx, cz);
      const t = table[d.id] || (table[d.id] = { id: d.id, name: d.name, land: 0, empty: 0, open: 0, plot: 0, built: 0, road: 0 });
      t.land++;
      t[['empty', 'water', 'road', 'built', 'plot', 'open'][c]]++;
    }
  }

  // ---- the largest empty rectangles (greedy: largest first, then the next in what is left)
  const free = new Uint8Array(nx * nz);
  for (let i = 0; i < free.length; i++) free[i] = cls[i] === 0 ? 1 : 0;
  const rects = [];
  const hgt = new Int32Array(nx);
  for (let k = 0; k < a.top; k++) {
    hgt.fill(0);
    let best = null;
    for (let iz = 0; iz < nz; iz++) {
      for (let ix = 0; ix < nx; ix++) hgt[ix] = free[iz * nx + ix] ? hgt[ix] + 1 : 0;
      const st = [];
      for (let ix = 0; ix <= nx; ix++) {
        const hh = ix < nx ? hgt[ix] : 0;
        let start = ix;
        while (st.length && st[st.length - 1][1] >= hh) {
          const [s0, h0] = st.pop();
          const area = h0 * (ix - s0);
          if (h0 > 0 && (!best || area > best.area)) best = { area, ix0: s0, ix1: ix - 1, iz0: iz - h0 + 1, iz1: iz };
          start = s0;
        }
        st.push([start, hh]);
      }
    }
    if (!best || best.area < a.min) break;
    for (let iz = best.iz0; iz <= best.iz1; iz++) for (let ix = best.ix0; ix <= best.ix1; ix++) free[iz * nx + ix] = 0;
    const r = { minX: R.minX + best.ix0 * C, maxX: R.minX + (best.ix1 + 1) * C, minZ: R.minZ + best.iz0 * C, maxZ: R.minZ + (best.iz1 + 1) * C, cells: best.area };
    r.district = VH.CityGen.districtAt((r.minX + r.maxX) / 2, (r.minZ + r.maxZ) / 2).id;
    rects.push(r);
  }

  // ---- the picture
  let png = null;
  if (a.png) {
    const S = Math.max(2, Math.min(8, Math.floor(1400 / Math.max(nx, nz))));
    const cv = document.createElement('canvas');
    cv.width = nx * S;
    cv.height = nz * S;
    const x = cv.getContext('2d');
    const COL = ['#e62828', '#285aaa', '#323237', '#969696', '#f5a028', '#3cb45a'];
    for (let i = 0; i < cls.length; i++) {
      x.fillStyle = COL[cls[i]];
      x.fillRect((i % nx) * S, Math.floor(i / nx) * S, S, S);
    }
    const px = (wx) => ((wx - R.minX) / C) * S;
    const pz = (wz) => ((wz - R.minZ) / C) * S;
    const outline = (r, col, width, label, dash) => {
      x.save();
      x.strokeStyle = col;
      x.lineWidth = width;
      if (dash) x.setLineDash(dash);
      const ax = px(Math.max(r.minX, R.minX)), az = pz(Math.max(r.minZ, R.minZ));
      const bx = px(Math.min(r.maxX, R.maxX)), bz = pz(Math.min(r.maxZ, R.maxZ));
      if (bx > ax && bz > az) {
        x.strokeRect(ax, az, bx - ax, bz - az);
        if (label) {
          x.fillStyle = col;
          x.font = 'bold 12px sans-serif';
          x.fillText(label, ax + 3, az + 13);
        }
      }
      x.restore();
    };
    for (const o of open) outline(o, '#9ef0a8', 1, null, [3, 3]);
    for (const p of plots) outline(p, '#ffd36b', 1, null, [2, 2]);
    for (const d of dists) {
      if (d.id === 'outskirts' || d.id === 'bay') continue;
      const list = d.rects || [d.rect];
      list.forEach((r, i) => outline(r, '#ffffff', 1.5, i === 0 ? d.id : null));
    }
    rects.forEach((r, i) => {
      outline(r, '#ffef3a', 2, null);
      x.fillStyle = '#ffef3a';
      x.font = 'bold 13px sans-serif';
      x.fillText(String(i + 1), px(r.minX) + 3, pz(r.maxZ) - 4);
    });
    x.fillStyle = '#ffff66';
    x.font = '11px sans-serif';
    for (let gx = Math.ceil(R.minX / 400) * 400; gx < R.maxX; gx += 400) x.fillText('x' + gx, px(gx) + 2, cv.height - 4);
    for (let gz = Math.ceil(R.minZ / 400) * 400; gz < R.maxZ; gz += 400) x.fillText('z' + gz, 2, pz(gz) - 2);
    png = cv.toDataURL('image/png');
  }
  const totals = [0, 0, 0, 0, 0, 0];
  for (const c of cls) totals[c]++;
  return {
    cell: C, nx, nz, rect: R, totals, table: Object.values(table), rects, png, tris,
    cls: a.wantCells ? Array.from(cls) : null,
    plotsUnclaimed: unclaimed.map((p) => p.plot), openGround: open.map((o) => o.label || ''),
  };
}

// ------------------------------------------------------------------- run
const browser = await playwright.chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 640, height: 400 } });
const errs = [];
page.on('pageerror', (e) => errs.push('PAGE ' + e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errs.push(m.text());
});
await page.addInitScript(() => {
  try {
    localStorage.clear();
    localStorage.setItem('vicehaven.settings.v1', JSON.stringify({ version: 1, graphics: { quality: 'low' } }));
  } catch (e) {}
});
await page.addInitScript(installHooks);
const t0 = Date.now();
await page.goto(pathToFileURL(path.join(here, '..', 'index.html')).href);
await page.waitForFunction(() => (window.VH && VH.game && VH.game.state === 'title') || (window.VHBoot && VHBoot.fatalShown), null, { timeout: 400000 });
const bootMs = Date.now() - t0;
const ok = await page.evaluate(() => {
  const g = VH.game;
  if (!g || !g.world) return false;
  g.freeze(true);
  g.noAutoStory = true;
  g.noAutoSave = true;
  g.newGame();
  g.advance(0.5);
  return true;
});
if (!ok) {
  console.log('the game did not boot:', errs.slice(0, 5).join(' | '));
  await browser.close();
  process.exit(0);
}

// Which rectangles: --region, district ids (or 'new'), else the whole world.
const areas = await page.evaluate(({ ids, region }) => {
  const L = VH.game.layout;
  const B = L.bounds || L.config.bounds;
  if (region) return [{ name: 'region', rect: region }];
  if (!ids.length) return [{ name: 'world', rect: { minX: B.minX, maxX: B.maxX, minZ: B.minZ, maxZ: B.maxZ } }];
  const out = [];
  for (const id of ids) {
    const list = id === 'new' ? VH.Data.districts.filter((d) => d.v4) : VH.Data.districts.filter((d) => d.id === id);
    if (!list.length) out.push({ name: id, missing: true });
    for (const d of list) {
      for (const r of d.rects || [d.rect]) {
        out.push({ name: d.id, rect: { minX: Math.max(B.minX, r.minX), maxX: Math.min(B.maxX, r.maxX), minZ: Math.max(B.minZ, r.minZ), maxZ: Math.min(B.maxZ, r.maxZ) } });
      }
    }
  }
  return out;
}, { ids, region: opt.region });

const pad = (s, n) => String(s).padEnd(n);
const lpad = (s, n) => String(s).padStart(n);
const json = [];
let n = 0;
for (const area of areas) {
  if (area.missing) {
    console.log('no district called', area.name);
    continue;
  }
  // A district's rectangle: snap the grid to whole cells so the picture lines up with the world grid.
  const r = area.rect;
  const res = await page.evaluate(scan, { rect: r, cell: opt.cell, cover: opt.cover, top: opt.top, min: opt.min, png: opt.png !== 'none', wantCells: !!opt.json });
  const tot = res.totals;
  const m2 = (cells) => ((cells * res.cell * res.cell) / 1e6).toFixed(2);
  console.log(`== ${area.name}  x ${r.minX}..${r.maxX}, z ${r.minZ}..${r.maxZ}  (${res.nx} x ${res.nz} cells of ${res.cell} m, ${res.tris} triangles looked at)`);
  console.log(`   empty ${tot[0]} (${m2(tot[0])} km²)  open ${tot[5]}  plot ${tot[4]}  built ${tot[3]}  road ${tot[2]}  water ${tot[1]}`);
  console.log('   ' + pad('district', 16) + lpad('land', 6) + lpad('empty', 7) + lpad('open', 6) + lpad('plot', 6) + lpad('built', 7) + lpad('road', 6) + lpad('% empty', 9));
  for (const t of res.table.sort((p, q) => q.empty - p.empty)) {
    console.log('   ' + pad(t.id, 16) + lpad(t.land, 6) + lpad(t.empty, 7) + lpad(t.open, 6) + lpad(t.plot, 6) + lpad(t.built, 7) + lpad(t.road, 6) + lpad(((100 * t.empty) / Math.max(1, t.land)).toFixed(1), 9));
  }
  if (res.rects.length) {
    console.log('   largest empty rectangles (x0, z0 .. x1, z1, cells, district):');
    res.rects.forEach((q, i) => console.log(`   ${lpad(i + 1, 3)}. ${q.minX}, ${q.minZ} .. ${q.maxX}, ${q.maxZ}  ${q.maxX - q.minX} x ${q.maxZ - q.minZ} m  ${q.cells} cells  ${q.district}`));
  }
  if (res.plotsUnclaimed.length) console.log('   unclaimed plots (placeholders):', res.plotsUnclaimed.join(' '));
  if (res.png && opt.png !== 'none') {
    const file = areas.length > 1 ? opt.png.replace(/\.png$/, '') + '_' + area.name + (n ? '_' + n : '') + '.png' : opt.png;
    fs.writeFileSync(file, Buffer.from(res.png.split(',')[1], 'base64'));
    console.log('   picture:', path.resolve(file));
  }
  n++;
  delete res.png;
  json.push(Object.assign({ name: area.name }, res));
}
if (opt.json) fs.writeFileSync(opt.json, JSON.stringify({ bootMs, cover: opt.cover, areas: json }, null, 0));
const all = json.reduce((s, r) => s + r.totals[0], 0);
console.log(`emptiness: ${all} empty cells of ${opt.cell} m in ${json.length} area(s); boot ${(bootMs / 1000).toFixed(1)} s${errs.length ? '; page errors: ' + errs.slice(0, 3).join(' | ') : ''}`);
await browser.close();
