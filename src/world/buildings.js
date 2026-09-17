// buildings.js — procedural architecture.
//
// Every building is a massing recipe plus facade UVs sized to real floor heights, so a
// 40-storey tower and a two-storey shophouse read at the right scale from the same texture.
// Geometry is merged per material: a full-detail building is at most a handful of draw calls.

import { stdMat, physMat } from '../render/matmode.js';
let THREE = null;
let DEPS = {};
let mergeFn = null;
const materialCache = new Map();

export const BUILDING_KINDS = ['tower', 'office', 'apartment', 'shophouse', 'warehouse', 'house',
  'villa', 'motel', 'artdeco', 'hotel', 'mall', 'parking', 'church', 'stadium', 'trailer',
  'shack', 'hangar', 'silo'];

const FLOOR_H = 3.4;
const BAY_W = 3.6;

export function initBuildings(three, deps = {}) {
  THREE = three;
  DEPS = deps;
  mergeFn = deps.mergeGeometries || null;
  materialCache.clear();
  return true;
}

function merge(list) {
  if (!list.length) return null;
  if (list.length === 1) return list[0];
  if (mergeFn) {
    try {
      const g = mergeFn(list, false);
      if (g) { for (const x of list) x.dispose?.(); return g; }
    } catch (e) { /* fall through to the first geometry */ }
  }
  return list[0];
}

/** The shared vertex-coloured material for a library surface. */
function mat(name) {
  const lib = DEPS.materials;
  if (!lib || !lib.tintable) {
    let m = materialCache.get(name);
    if (!m) { m = stdMat({ color: 0xffffff, roughness: 0.9, vertexColors: true }); materialCache.set(name, m); }
    return m;
  }
  return lib.tintable(name);
}

const _tintColor = { r: 1, g: 1, b: 1 };
/** Write a flat colour into a geometry's vertex colour attribute (sRGB → linear). */
function paint(geo, colorHex) {
  const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 3);
  const r = srgbToLinear(((colorHex >> 16) & 255) / 255);
  const g = srgbToLinear(((colorHex >> 8) & 255) / 255);
  const b = srgbToLinear((colorHex & 255) / 255);
  for (let i = 0; i < n; i++) { arr[i * 3] = r; arr[i * 3 + 1] = g; arr[i * 3 + 2] = b; }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}
function srgbToLinear(c) { return c < 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }

function facadeMaterialFor(facade) {
  switch (facade) {
    case 'glass': return mat('glassFacade');
    case 'office': return mat('officeFacade');
    case 'apartment': return mat('apartmentFacade');
    case 'artdeco': return mat('artdeco');
    case 'shopfront': return mat('shopFront');
    case 'brick': return mat('brick');
    case 'stucco': return mat('stucco');
    case 'warehouse': return mat('warehouse');
    default: return mat('concrete');
  }
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------
function box(w, h, d, x = 0, y = 0, z = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y + h / 2, z);
  return g;
}

/**
 * A box whose side UVs tile at real-world scale: `bays` across, `floors` up.
 * Keeps window size constant no matter how big the building is.
 */
function facadeBox(w, h, d, x = 0, y = 0, z = 0, bayW = BAY_W, floorH = FLOOR_H) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  const uW = Math.max(1, Math.round(w / bayW));
  const uD = Math.max(1, Math.round(d / bayW));
  const vH = Math.max(1, Math.round(h / floorH));
  const scale = (face, su, sv) => {
    for (let i = face * 4; i < face * 4 + 4; i++) {
      uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
    }
  };
  scale(0, uD, vH); scale(1, uD, vH);          // +X, -X
  scale(2, uW / 2, uD / 2); scale(3, uW / 2, uD / 2); // +Y, -Y
  scale(4, uW, vH); scale(5, uW, vH);          // +Z, -Z
  uv.needsUpdate = true;
  g.translate(x, y + h / 2, z);
  return g;
}


/**
 * Geometric relief for a plain box facade.
 *
 * A painted texture cannot fix a flat silhouette: every edge of a bare box
 * catches the light identically, so a street of them reads as coloured slabs
 * however much detail is drawn on. A base course, floor bands, corner
 * pilasters and a cornice give a building real horizontal and vertical
 * structure, and that structure is most of what makes a city look built rather
 * than blocked out. Costs about a dozen boxes, all of which merge into the
 * chunk its building already belongs to, so it adds triangles and no draw
 * calls.
 */
function facadeRelief(w, h, d, parts, rng, lod = 0, opts = {}) {
  const x = opts.x ?? 0, y = opts.y ?? 0, z = opts.z ?? 0;
  const out = opts.relief ?? Math.min(0.22, 0.006 * Math.max(w, d) + 0.10);
  const floors = Math.max(1, Math.round(h / FLOOR_H));
  const bucket = opts.bucket ?? parts.concrete;

  // Base course: shops and lobbies sit in a plinth that is proud of the wall.
  // A house wants a skirting, not a two-storey podium, so the height is an
  // option rather than a fraction of whatever the building happens to be.
  const plinth = opts.plinth ?? Math.min(FLOOR_H * 1.1, h * 0.45);
  bucket.push(box(w + out * 2.2, plinth, d + out * 2.2, x, y, z));

  // Cornice and parapet, so the roofline is not a bare cut edge. A building with
  // a pitched roof has neither: it has eaves, and a parapet box under a pitch
  // pokes straight out through the tiles.
  if (opts.crown !== false) {
    bucket.push(box(w + out * 3.0, 0.5, d + out * 3.0, x, y + h - 0.5, z));
    bucket.push(box(w - 0.4, 0.85, d - 0.4, x, y + h, z));
  } else {
    // Eaves: a thin overhanging band right at the wall head.
    bucket.push(box(w + out * 4.0, 0.22, d + out * 4.0, x, y + h - 0.22, z));
  }

  if (lod === 2 || floors < 3) return;

  // A band every few storeys. Tall towers get them further apart so they do
  // not turn into stripes.
  const every = opts.bandEvery ?? (floors > 26 ? 5 : floors > 12 ? 4 : floors > 6 ? 3 : 2);
  for (let f = every; f < floors; f += every) {
    const by = y + f * FLOOR_H;
    if (by > y + h - 1.6) break;
    bucket.push(box(w + out * 1.7, 0.26, d + out * 1.7, x, by, z));
  }

  if (lod !== 0) return;

  // Corner pilasters running the height of the shaft.
  const pil = Math.min(0.85, Math.max(0.32, Math.max(w, d) * 0.035));
  const shaft = h - plinth - 0.6;
  if (shaft > 2) {
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        bucket.push(box(pil, shaft, pil,
          x + sx * (w / 2 - pil * 0.25), y + plinth, z + sz * (d / 2 - pil * 0.25)));
      }
    }
  }

  // Mullion fins up the two longer faces. Capped, because a wide building
  // would otherwise contribute more geometry than the rest of its block.
  const fins = Math.min(opts.maxFins ?? 4, Math.max(0, Math.floor(w / (BAY_W * 2)) - 1));
  for (let i = 1; i <= fins; i++) {
    const fx = x - w / 2 + (w * i) / (fins + 1);
    for (const sz of [-1, 1]) {
      bucket.push(box(0.26, shaft, 0.18, fx, y + plinth, z + sz * (d / 2 + 0.05)));
    }
  }
}

function cyl(r1, r2, h, seg, x = 0, y = 0, z = 0) {
  const g = new THREE.CylinderGeometry(r1, r2, h, seg);
  g.translate(x, y + h / 2, z);
  return g;
}

function pitchedRoof(w, d, h, x = 0, y = 0, z = 0, yaw = 0) {
  // A simple gable built from two slanted slabs plus triangular ends.
  const g = new THREE.BufferGeometry();
  const hw = w / 2, hd = d / 2;
  const v = [
    -hw, 0, -hd, hw, 0, -hd, hw, 0, hd, -hw, 0, hd,   // eaves 0..3
    0, h, -hd, 0, h, hd,                               // ridge 4,5
  ];
  const idx = [
    0, 4, 5, 0, 5, 3,       // left slope
    1, 2, 5, 1, 5, 4,       // right slope
    0, 1, 4,                // front gable
    3, 5, 2,                // back gable
  ];
  const uvs = [0, 0, 1, 0, 1, 1, 0, 1, 0.5, 0, 0.5, 1];
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  if (yaw) g.rotateY(yaw);
  g.translate(x, y, z);
  return g;
}

/** Roof furniture: units, vents, tanks, bulkheads, antennas. Deterministic from rng. */
function roofClutter(w, d, topY, rng, out) {
  const n = Math.max(1, Math.floor((w * d) / 90));
  for (let i = 0; i < n; i++) {
    const bw = rng.range(1.1, 2.4), bd = rng.range(1.1, 2.2), bh = rng.range(0.7, 1.5);
    const px = rng.range(-w / 2 + bw, w / 2 - bw);
    const pz = rng.range(-d / 2 + bd, d / 2 - bd);
    out.metal.push(box(bw, bh, bd, px, topY, pz));
    if (rng.bool(0.4)) out.metal.push(cyl(0.22, 0.22, 0.5, 8, px, topY + bh, pz));
  }
  // stair bulkhead
  out.concrete.push(box(rng.range(2.4, 3.6), rng.range(2.2, 3.0), rng.range(2.2, 3.2),
    rng.range(-w / 4, w / 4), topY, rng.range(-d / 4, d / 4)));
  // water tank on a frame
  if (rng.bool(0.45) && Math.min(w, d) > 8) {
    const r = rng.range(1.0, 1.8);
    const px = rng.range(-w / 2 + r * 2, w / 2 - r * 2), pz = rng.range(-d / 2 + r * 2, d / 2 - r * 2);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      out.metal.push(box(0.14, 1.6, 0.14, px + sx * r * 0.7, topY, pz + sz * r * 0.7));
    }
    out.metal.push(cyl(r, r, r * 1.5, 12, px, topY + 1.6, pz));
  }
  // parapet
  const pw = 0.28;
  out.concrete.push(box(w, 0.85, pw, 0, topY, d / 2 - pw / 2));
  out.concrete.push(box(w, 0.85, pw, 0, topY, -d / 2 + pw / 2));
  out.concrete.push(box(pw, 0.85, d - pw * 2, w / 2 - pw / 2, topY, 0));
  out.concrete.push(box(pw, 0.85, d - pw * 2, -w / 2 + pw / 2, topY, 0));
}

// ---------------------------------------------------------------------------
// Kind recipes
// ---------------------------------------------------------------------------
/**
 * @param {object} spec { kind, w, d, h, floors, palette, facade, seed, district, shopFront, lod }
 * @param {RNG} rng
 * @returns {{ group: THREE.Group, colliders: Array, lights: Array }}
 */
export function buildBuilding(spec, rng) {
  if (!THREE) throw new Error('buildings: initBuildings(THREE, deps) must be called first');
  const kind = BUILDING_KINDS.includes(spec.kind) ? spec.kind : 'office';
  const lod = spec.lod ?? 0;
  const w = Math.max(3, spec.w), d = Math.max(3, spec.d);
  const h = Math.max(2.6, spec.h);
  const pal = spec.palette || { wall: 0xa0a09a, roof: 0x555555, accent: 0xffc93c, neon: 0xff2d95 };

  const parts = { facade: [], concrete: [], metal: [], roof: [], glass: [], accent: [], wood: [] };
  const colliders = [];
  const lights = [];
  const group = new THREE.Group();
  group.name = 'building:' + kind;

  const facadeMat = facadeMaterialFor(spec.facade || 'concrete');
  const recipe = RECIPES[kind] || RECIPES.office;
  recipe({ w, d, h, spec, pal, rng, parts, colliders, lights, lod, group });

  // Assemble one mesh per material bucket.
  const glassMat = DEPS.materials ? DEPS.materials.tintable('glass') : mat('concrete');
  const buckets = [
    [parts.facade, facadeMat, spec.facade === 'glass' ? 0xffffff : pal.wall, true],
    [parts.concrete, mat('concrete'), pal.wall, true],
    [parts.metal, mat('metalPanel'), 0xb0b4ba, true],
    [parts.roof, mat(kind === 'house' || kind === 'villa' || kind === 'motel' ? 'roofShingle' : 'roofTar'), pal.roof, true],
    [parts.glass, glassMat, 0x9fc8d8, false],
    [parts.accent, mat('stucco'), pal.accent, true],
    [parts.wood, mat('wood'), 0xa9814f, true],
  ];
  for (const [list, material, tint, shadow] of buckets) {
    const g = merge(list);
    if (!g || !material) continue;
    paint(g, tint);
    const m = new THREE.Mesh(g, material);
    m.castShadow = shadow && lod === 0;
    m.receiveShadow = shadow;
    m.matrixAutoUpdate = false;
    m.updateMatrix();
    group.add(m);
  }

  // The whole building is one collider unless a recipe added its own.
  if (!colliders.length) {
    colliders.push({ type: 'box', x: 0, y: h / 2, z: 0, hw: w / 2, hh: h / 2, hd: d / 2, yaw: 0 });
  }
  return { group, colliders, lights };
}

/** Cheap footprint query used by the lot planner before any geometry exists. */
export function buildingFootprintFor(spec) {
  const k = spec.kind;
  if (k === 'stadium') return { w: spec.w * 1.35, d: spec.d * 1.35 };
  if (k === 'house' || k === 'villa') return { w: spec.w, d: spec.d };
  if (k === 'trailer' || k === 'shack') return { w: Math.min(spec.w, 9), d: Math.min(spec.d, 6) };
  return { w: spec.w, d: spec.d };
}

const RECIPES = {
  // ---- high-rise with setbacks and a crown ----
  tower({ w, d, h, pal, rng, parts, colliders, lights, lod }) {
    const tiers = lod === 2 ? 1 : Math.max(2, Math.min(4, Math.round(h / 34)));
    let y = 0, cw = w, cd = d;
    for (let i = 0; i < tiers; i++) {
      const th = i === tiers - 1 ? h - y : (h / tiers) * rng.range(0.85, 1.15);
      parts.facade.push(facadeBox(cw, th, cd, 0, y));
      colliders.push({ type: 'box', x: 0, y: y + th / 2, z: 0, hw: cw / 2, hh: th / 2, hd: cd / 2, yaw: 0 });
      y += th;
      if (i < tiers - 1) {
        parts.concrete.push(box(cw + 0.5, 0.4, cd + 0.5, 0, y - 0.2));
        cw *= rng.range(0.74, 0.9);
        cd *= rng.range(0.74, 0.9);
      }
      if (y >= h) break;
    }
    facadeRelief(w, h, d, parts, rng, lod, { maxFins: 5 });
    if (lod === 0) {
      roofClutter(cw, cd, h, rng, parts);
      // crown + mast with an aircraft warning light
      parts.concrete.push(box(cw * 0.55, 2.6, cd * 0.55, 0, h));
      parts.metal.push(cyl(0.16, 0.1, h * 0.12, 6, 0, h + 2.6));
      lights.push({ x: 0, y: h + 2.6 + h * 0.12, z: 0, color: 0xff3030, intensity: 2.2, distance: 30, kind: 'beacon' });
      // vertical fin strips catch the light nicely at night
      for (const sx of [-1, 1]) parts.accent.push(box(0.34, h * 0.92, 0.34, sx * (w / 2 - 0.3), 0, d / 2 - 0.3));
    }
  },

  office({ w, d, h, pal, rng, parts, colliders, lights, lod }) {
    parts.facade.push(facadeBox(w, h, d));
    facadeRelief(w, h, d, parts, rng, lod);
    if (lod === 0) {
      roofClutter(w, d, h, rng, parts);
      // ground-floor canopy and lobby glazing
      parts.concrete.push(box(w + 1.2, 0.3, 2.2, 0, 3.6, d / 2 + 0.8));
      parts.glass.push(box(w * 0.6, 3.2, 0.12, 0, 0.1, d / 2 + 0.06));
      parts.concrete.push(box(w, 0.5, d, 0, h - 0.5));
    }
    colliders.push({ type: 'box', x: 0, y: h / 2, z: 0, hw: w / 2, hh: h / 2, hd: d / 2, yaw: 0 });
  },

  apartment({ w, d, h, pal, rng, parts, colliders, lights, lod }) {
    parts.facade.push(facadeBox(w, h, d));
    facadeRelief(w, h, d, parts, rng, lod, { bandEvery: 2, maxFins: 4 });
    const floors = Math.max(2, Math.round(h / FLOOR_H));
    if (lod === 0) {
      // balconies on the long faces
      for (let f = 1; f < floors; f++) {
        const y = f * FLOOR_H;
        const bays = Math.max(1, Math.floor(w / 4.2));
        for (let b = 0; b < bays; b++) {
          if (!rng.bool(0.78)) continue;
          const bx = -w / 2 + (b + 0.5) * (w / bays);
          parts.concrete.push(box(w / bays - 0.4, 0.16, 1.15, bx, y, d / 2 + 0.55));
          parts.metal.push(box(w / bays - 0.4, 0.9, 0.06, bx, y + 0.16, d / 2 + 1.1));
        }
      }
      roofClutter(w, d, h, rng, parts);
      // fire escape
      if (rng.bool(0.5)) {
        for (let f = 1; f < floors; f++) {
          parts.metal.push(box(1.4, 0.08, d * 0.5, -w / 2 - 0.7, f * FLOOR_H, 0));
          parts.metal.push(box(0.06, 1.0, d * 0.5, -w / 2 - 1.35, f * FLOOR_H, 0));
        }
      }
    }
    colliders.push({ type: 'box', x: 0, y: h / 2, z: 0, hw: w / 2, hh: h / 2, hd: d / 2, yaw: 0 });
  },

  // ---- glazed ground floor + sign, flats above ----
  shophouse({ w, d, h, spec, pal, rng, parts, colliders, lights, lod, group }) {
    const shopH = 4.2;
    const upper = Math.max(FLOOR_H, h - shopH);
    parts.facade.push(facadeBox(w, upper, d, 0, shopH));
    parts.concrete.push(box(w, shopH, d, 0, 0));
    colliders.push({ type: 'box', x: 0, y: h / 2, z: 0, hw: w / 2, hh: h / 2, hd: d / 2, yaw: 0 });
    facadeRelief(w, h, d, parts, rng, lod, { plinth: 0.4, bandEvery: 99, maxFins: 0, relief: 0.11 });
    // String course where the shop stops and the flat above starts. It is the
    // single line that makes a two-storey terrace read as a street rather than
    // a row of blocks.
    parts.concrete.push(box(w + 0.34, 0.3, d + 0.34, 0, shopH - 0.15));
    if (lod === 2) return;

    // shopfront glazing
    parts.glass.push(box(w * 0.82, shopH * 0.62, 0.1, 0, 0.7, d / 2 + 0.04));
    // awning
    const awn = spec.shopFront ? (spec.shopFront.signColor ?? pal.accent) : pal.accent;
    const aw = new THREE.BoxGeometry(w * 0.9, 0.1, 1.5);
    aw.rotateX(-0.22);
    aw.translate(0, shopH * 0.78, d / 2 + 0.75);
    parts.accent.push(aw);
    // sign board
    if (spec.shopFront && DEPS.signTexture && DEPS.materials) {
      const sw = Math.min(w * 0.9, 7.5);
      const geo = new THREE.PlaneGeometry(sw, 1.05);
      geo.translate(0, shopH - 0.55, d / 2 + 0.09);
      const signMat = DEPS.materials.sign(spec.shopFront.name || 'SHOP', {
        color: spec.shopFront.signColor ?? 0xffffff,
        bg: 0x101018, neon: true, neonColor: spec.shopFront.neonColor ?? pal.neon,
        width: 512, height: 96, intensity: 2.6,
      });
      const mesh = new THREE.Mesh(geo, signMat);
      mesh.name = 'shopSign';
      group.add(mesh);
      lights.push({ x: 0, y: shopH - 0.55, z: d / 2 + 0.6, color: spec.shopFront.neonColor ?? pal.neon,
        intensity: 1.6, distance: 12, kind: 'sign' });
    }
    if (lod === 0) roofClutter(w, d, h, rng, parts);
  },

  warehouse({ w, d, h, pal, rng, parts, colliders, lights, lod }) {
    parts.facade.push(facadeBox(w, h, d, 0, 0, 0, 6, 5));
    facadeRelief(w, h, d, parts, rng, lod, { bandEvery: 99, maxFins: 0 });
    colliders.push({ type: 'box', x: 0, y: h / 2, z: 0, hw: w / 2, hh: h / 2, hd: d / 2, yaw: 0 });
    if (lod === 2) return;
    // roller doors
    const doors = Math.max(1, Math.floor(w / 9));
    for (let i = 0; i < doors; i++) {
      const dx = -w / 2 + (i + 0.5) * (w / doors);
      parts.metal.push(box(Math.min(5.2, w / doors - 1), Math.min(4.6, h * 0.6), 0.16, dx, 0, d / 2 + 0.06));
    }
    // saw-tooth roof vents
    if (lod === 0) {
      const n = Math.max(2, Math.floor(d / 7));
      for (let i = 0; i < n; i++) {
        const pz = -d / 2 + (i + 0.5) * (d / n);
        parts.metal.push(box(w * 0.9, 0.7, 1.3, 0, h, pz));
      }
      parts.metal.push(box(w, 0.35, d, 0, h - 0.1));
    }
  },

  house({ w, d, h, pal, rng, parts, colliders, lights, lod }) {
    const wallH = Math.min(h, 6.2);
    parts.facade.push(facadeBox(w, wallH, d, 0, 0, 0, 3.2, 3.0));
    colliders.push({ type: 'box', x: 0, y: wallH / 2, z: 0, hw: w / 2, hh: wallH / 2, hd: d / 2, yaw: 0 });
    facadeRelief(w, wallH, d, parts, rng, lod, { plinth: 0.42, bandEvery: 99, maxFins: 0, relief: 0.09, crown: false });
    if (lod === 2) return;
    parts.roof.push(pitchedRoof(w + 0.9, d + 0.9, Math.max(1.6, h - wallH + 1.2), 0, wallH, 0));
    if (lod === 0) {
      // porch
      parts.wood.push(box(w * 0.6, 0.16, 1.8, 0, 0.12, d / 2 + 0.9));
      for (const sx of [-1, 1]) parts.wood.push(box(0.14, 2.6, 0.14, sx * w * 0.26, 0.28, d / 2 + 1.6));
      parts.roof.push(box(w * 0.66, 0.14, 2.0, 0, 2.88, d / 2 + 1.0));
      // chimney
      if (rng.bool(0.45)) parts.concrete.push(box(0.8, 2.0, 0.8, w * 0.28, wallH, -d * 0.18));
      // garage door
      if (w > 9 && rng.bool(0.6)) parts.metal.push(box(3.4, 2.4, 0.14, -w * 0.28, 0, d / 2 + 0.07));
    }
  },

  villa({ w, d, h, pal, rng, parts, colliders, lights, lod }) {
    const wallH = Math.min(h, 8);
    parts.facade.push(facadeBox(w, wallH * 0.62, d, 0, 0, 0, 4.0, 3.4));
    parts.facade.push(facadeBox(w * 0.72, wallH * 0.42, d * 0.72, 0, wallH * 0.62, 0, 4.0, 3.4));
    colliders.push({ type: 'box', x: 0, y: wallH / 2, z: 0, hw: w / 2, hh: wallH / 2, hd: d / 2, yaw: 0 });
    facadeRelief(w, wallH * 0.62, d, parts, rng, lod, { plinth: 0.5, bandEvery: 99, maxFins: 0, relief: 0.11 });
    if (lod === 2) return;
    // flat roof terrace + pergola
    parts.concrete.push(box(w + 0.6, 0.3, d + 0.6, 0, wallH * 0.62 - 0.15));
    if (lod === 0) {
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        parts.wood.push(box(0.16, 2.4, 0.16, sx * w * 0.3, wallH * 0.62, sz * d * 0.3));
      }
      parts.glass.push(box(w * 0.5, wallH * 0.42, 0.1, 0, 0.2, d / 2 + 0.04));
      // pool
      parts.glass.push(box(Math.min(7, w * 0.5), 0.18, Math.min(4, d * 0.35), 0, 0.02, d / 2 + 4.2));
    }
  },

  motel({ w, d, h, pal, rng, parts, colliders, lights, lod }) {
    const floors = Math.max(1, Math.min(3, Math.round(h / 3.2)));
    for (let f = 0; f < floors; f++) {
      parts.facade.push(facadeBox(w, 3.2, d, 0, f * 3.2, 0, 4.2, 3.2));
      if (f > 0 && lod === 0) {
        parts.concrete.push(box(w, 0.16, 1.7, 0, f * 3.2, d / 2 + 0.85));
        parts.metal.push(box(w, 0.9, 0.06, 0, f * 3.2 + 0.16, d / 2 + 1.65));
      }
    }
    colliders.push({ type: 'box', x: 0, y: (floors * 3.2) / 2, z: 0, hw: w / 2, hh: (floors * 3.2) / 2, hd: d / 2, yaw: 0 });
    facadeRelief(w, floors * 3.2, d, parts, rng, lod, { plinth: 0.38, bandEvery: 1, maxFins: 0, relief: 0.10 });
    if (lod === 0) {
      // big roadside sign
      parts.metal.push(box(0.3, 6.5, 0.3, -w / 2 - 1.5, 0, d / 2 - 1));
      parts.accent.push(box(2.6, 3.2, 0.25, -w / 2 - 1.5, 5.0, d / 2 - 1));
      lights.push({ x: -w / 2 - 1.5, y: 6.6, z: d / 2 - 1, color: pal.neon, intensity: 3, distance: 20, kind: 'sign' });
    }
  },

  artdeco({ w, d, h, pal, rng, parts, colliders, lights, lod }) {
    facadeRelief(w, h, d, parts, rng, lod, { bandEvery: 3, maxFins: 6 });
    const tiers = 3;
    let y = 0, cw = w, cd = d;
    for (let i = 0; i < tiers; i++) {
      const th = (h / tiers) * (i === 0 ? 1.25 : i === 1 ? 0.95 : 0.8);
      parts.facade.push(facadeBox(cw, th, cd, 0, y, 0, 4.2, 3.5));
      colliders.push({ type: 'box', x: 0, y: y + th / 2, z: 0, hw: cw / 2, hh: th / 2, hd: cd / 2, yaw: 0 });
      // banded cornice
      parts.accent.push(box(cw + 0.35, 0.3, cd + 0.35, 0, y + th - 0.3));
      y += th;
      cw *= 0.82; cd *= 0.86;
      if (y >= h) break;
    }
    if (lod === 0) {
      // vertical fins and a neon strip along the parapet
      for (let i = -1; i <= 1; i++) {
        parts.accent.push(box(0.4, h * 0.78, 0.4, i * w * 0.3, 0, d / 2 - 0.2));
      }
      lights.push({ x: 0, y: h * 0.55, z: d / 2 + 0.4, color: pal.neon, intensity: 2.4, distance: 18, kind: 'neon' });
      parts.accent.push(box(w * 0.94, 0.22, 0.22, 0, h * 0.55, d / 2 + 0.2));
    }
  },

  hotel({ w, d, h, pal, rng, parts, colliders, lights, lod }) {
    parts.facade.push(facadeBox(w, h, d));
    facadeRelief(w, h, d, parts, rng, lod, { bandEvery: 2 });
    colliders.push({ type: 'box', x: 0, y: h / 2, z: 0, hw: w / 2, hh: h / 2, hd: d / 2, yaw: 0 });
    if (lod === 2) return;
    // porte-cochère
    parts.concrete.push(box(w * 0.5, 0.35, 5.0, 0, 5.2, d / 2 + 2.5));
    for (const sx of [-1, 1]) parts.concrete.push(box(0.5, 5.2, 0.5, sx * w * 0.2, 0, d / 2 + 4.6));
    parts.glass.push(box(w * 0.45, 4.6, 0.1, 0, 0.2, d / 2 + 0.05));
    if (lod === 0) {
      roofClutter(w, d, h, rng, parts);
      lights.push({ x: 0, y: h - 2, z: d / 2 + 0.5, color: pal.neon, intensity: 3.2, distance: 24, kind: 'sign' });
    }
  },

  mall({ w, d, h, pal, rng, parts, colliders, lights, lod }) {
    parts.facade.push(facadeBox(w, h, d, 0, 0, 0, 6, 5));
    facadeRelief(w, h, d, parts, rng, lod, { bandEvery: 1, maxFins: 0 });
    colliders.push({ type: 'box', x: 0, y: h / 2, z: 0, hw: w / 2, hh: h / 2, hd: d / 2, yaw: 0 });
    if (lod === 2) return;
    // entrance canopies on the long faces
    for (const sz of [-1, 1]) {
      parts.concrete.push(box(w * 0.28, 0.4, 4.0, 0, h * 0.55, sz * (d / 2 + 2)));
      parts.glass.push(box(w * 0.24, h * 0.5, 0.1, 0, 0.2, sz * (d / 2 + 0.05)));
    }
    if (lod === 0) {
      // skylights
      const n = Math.max(2, Math.floor(w / 14));
      for (let i = 0; i < n; i++) {
        parts.glass.push(box(w / n - 3, 0.9, d * 0.42, -w / 2 + (i + 0.5) * (w / n), h, 0));
      }
      roofClutter(w, d, h, rng, parts);
      lights.push({ x: 0, y: h * 0.6, z: d / 2 + 1, color: pal.neon, intensity: 3, distance: 26, kind: 'sign' });
    }
  },

  // ---- open-deck parking garage, drivable ramp implied by the lot planner ----
  parking({ w, d, h, pal, rng, parts, colliders, lights, lod }) {
    const decks = Math.max(2, Math.round(h / 3.0));
    for (let i = 0; i < decks; i++) {
      const y = i * 3.0;
      parts.concrete.push(box(w, 0.34, d, 0, y));
      colliders.push({ type: 'box', x: 0, y: y + 0.17, z: 0, hw: w / 2, hh: 0.17, hd: d / 2, yaw: 0, drivable: true });
      if (lod !== 2) {
        // edge barriers
        for (const sz of [-1, 1]) parts.concrete.push(box(w, 0.95, 0.3, 0, y + 0.34, sz * (d / 2 - 0.15)));
        for (const sx of [-1, 1]) parts.concrete.push(box(0.3, 0.95, d, sx * (w / 2 - 0.15), y + 0.34, 0));
      }
      if (i > 0 && lod === 0) {
        lights.push({ x: 0, y: y + 2.6, z: 0, color: 0xd8e0ff, intensity: 1.4, distance: 22, kind: 'window' });
      }
    }
    // corner columns
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      parts.concrete.push(box(0.55, decks * 3.0, 0.55, sx * (w / 2 - 0.5), 0, sz * (d / 2 - 0.5)));
    }
  },

  church({ w, d, h, pal, rng, parts, colliders, lights, lod }) {
    const navH = Math.min(h, 10);
    parts.facade.push(facadeBox(w, navH, d, 0, 0, 0, 3.4, 5));
    parts.roof.push(pitchedRoof(w + 0.7, d + 0.7, 3.2, 0, navH, 0));
    colliders.push({ type: 'box', x: 0, y: navH / 2, z: 0, hw: w / 2, hh: navH / 2, hd: d / 2, yaw: 0 });
    if (lod === 2) return;
    // tower + spire
    const tw = Math.min(w * 0.34, 5);
    parts.facade.push(facadeBox(tw, navH + 7, tw, 0, 0, d / 2 - tw / 2, 3.4, 5));
    colliders.push({ type: 'box', x: 0, y: (navH + 7) / 2, z: d / 2 - tw / 2, hw: tw / 2, hh: (navH + 7) / 2, hd: tw / 2, yaw: 0 });
    const spire = new THREE.ConeGeometry(tw * 0.72, 5.5, 4);
    spire.rotateY(Math.PI / 4);
    spire.translate(0, navH + 7 + 2.75, d / 2 - tw / 2);
    parts.roof.push(spire);
    if (lod === 0) {
      parts.glass.push(box(w * 0.22, navH * 0.5, 0.1, 0, 2.5, -d / 2 - 0.04));
      lights.push({ x: 0, y: navH + 9, z: d / 2 - tw / 2, color: 0xffe0b0, intensity: 1.2, distance: 18, kind: 'window' });
    }
  },

  stadium({ w, d, h, pal, rng, parts, colliders, lights, lod }) {
    const ring = 10;
    const seg = lod === 0 ? 20 : 10;
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2;
      const cx = Math.cos(a0) * (w / 2 - ring / 2);
      const cz = Math.sin(a0) * (d / 2 - ring / 2);
      const g = new THREE.BoxGeometry(ring * 1.5, h, ring);
      g.rotateY(-a0);
      g.translate(cx, h / 2, cz);
      parts.concrete.push(g);
      colliders.push({ type: 'box', x: cx, y: h / 2, z: cz, hw: ring * 0.75, hh: h / 2, hd: ring / 2, yaw: -a0 });
    }
    if (lod === 0) {
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + 0.4;
        const px = Math.cos(a) * (w / 2 + 3), pz = Math.sin(a) * (d / 2 + 3);
        parts.metal.push(box(0.7, h + 12, 0.7, px, 0, pz));
        parts.metal.push(box(4.5, 2.2, 1.0, px, h + 12, pz));
        lights.push({ x: px, y: h + 13, z: pz, color: 0xf0f4ff, intensity: 6, distance: 90, kind: 'window' });
      }
    }
  },

  trailer({ w, d, h, pal, rng, parts, colliders, lights, lod }) {
    const tw = Math.min(w, 3.2), td = Math.min(d, 9), th = Math.min(h, 3.0);
    parts.metal.push(box(tw, th, td, 0, 0.55));
    parts.roof.push(box(tw + 0.3, 0.2, td + 0.3, 0, 0.55 + th));
    colliders.push({ type: 'box', x: 0, y: 0.55 + th / 2, z: 0, hw: tw / 2, hh: th / 2 + 0.3, hd: td / 2, yaw: 0 });
    if (lod === 2) return;
    // blocks + steps + awning
    for (const sz of [-1, 1]) parts.concrete.push(box(0.5, 0.55, 0.5, 0, 0, sz * td * 0.35));
    parts.wood.push(box(1.2, 0.12, 0.9, tw / 2 + 0.6, 0.5, 0));
    if (lod === 0) {
      const aw = new THREE.BoxGeometry(2.2, 0.08, td * 0.5);
      aw.rotateZ(0.12);
      aw.translate(tw / 2 + 1.1, 2.6, 0);
      parts.accent.push(aw);
    }
  },

  shack({ w, d, h, pal, rng, parts, colliders, lights, lod }) {
    const sw = Math.min(w, 6), sd = Math.min(d, 5), sh = Math.min(h, 3.2);
    parts.wood.push(box(sw, sh, sd));
    const roof = new THREE.BoxGeometry(sw + 0.5, 0.14, sd + 0.5);
    roof.rotateX(0.14);
    roof.translate(0, sh + 0.2, 0);
    parts.metal.push(roof);
    colliders.push({ type: 'box', x: 0, y: sh / 2, z: 0, hw: sw / 2, hh: sh / 2, hd: sd / 2, yaw: 0 });
  },

  hangar({ w, d, h, pal, rng, parts, colliders, lights, lod }) {
    // Barrel vault approximated by angled slabs.
    const segs = lod === 0 ? 9 : 5;
    const r = Math.min(w, h * 2) / 2;
    for (let i = 0; i < segs; i++) {
      const a = Math.PI * (i / segs) + Math.PI / (segs * 2);
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      const g = new THREE.BoxGeometry(r * Math.PI / segs * 1.1, 0.3, d);
      g.rotateZ(a + Math.PI / 2);
      g.translate(px, py + 0.3, 0);
      parts.metal.push(g);
    }
    parts.concrete.push(box(w, 0.3, d, 0, 0));
    colliders.push({ type: 'box', x: 0, y: r / 2, z: 0, hw: w / 2, hh: r / 2, hd: d / 2, yaw: 0 });
    if (lod !== 2) {
      parts.metal.push(box(w * 0.8, r * 0.8, 0.2, 0, 0.3, d / 2));
    }
  },

  silo({ w, d, h, pal, rng, parts, colliders, lights, lod }) {
    const r = Math.min(w, d) / 2;
    const n = Math.max(1, Math.min(3, Math.floor(w / (r * 2.2))));
    for (let i = 0; i < n; i++) {
      const px = (i - (n - 1) / 2) * r * 2.3;
      parts.metal.push(cyl(r, r, h, lod === 0 ? 14 : 8, px, 0));
      colliders.push({ type: 'box', x: px, y: h / 2, z: 0, hw: r, hh: h / 2, hd: r, yaw: 0 });
      if (lod === 0) {
        const cone = new THREE.ConeGeometry(r * 1.05, r * 0.8, 12);
        cone.translate(px, h + r * 0.4, 0);
        parts.metal.push(cone);
      }
    }
    if (lod === 0 && n > 1) {
      parts.metal.push(box((n - 1) * r * 2.3, 0.5, 1.0, 0, h * 0.82));
    }
  },
};

/** A building kind appropriate to a district style and lot size. */
export function pickBuildingKind(districtStyle, lotArea, rng, height) {
  const tall = height > 40;
  switch (districtStyle) {
    case 'downtown': return tall ? 'tower' : rng.weighted([{ k: 'office', w: 4 }, { k: 'apartment', w: 3 }, { k: 'shophouse', w: 2 }, { k: 'parking', w: 1 }], (o) => o.w).k;
    case 'financial': return tall ? 'tower' : rng.weighted([{ k: 'office', w: 5 }, { k: 'parking', w: 2 }, { k: 'hotel', w: 1 }], (o) => o.w).k;
    case 'beach': return rng.weighted([{ k: 'artdeco', w: 4 }, { k: 'hotel', w: 2 }, { k: 'shophouse', w: 3 }, { k: 'motel', w: 2 }], (o) => o.w).k;
    case 'strip': return rng.weighted([{ k: 'artdeco', w: 4 }, { k: 'hotel', w: 3 }, { k: 'shophouse', w: 3 }, { k: 'apartment', w: 2 }], (o) => o.w).k;
    case 'marina': return rng.weighted([{ k: 'villa', w: 3 }, { k: 'apartment', w: 2 }, { k: 'shophouse', w: 2 }], (o) => o.w).k;
    case 'oldtown': return rng.weighted([{ k: 'shophouse', w: 5 }, { k: 'apartment', w: 3 }, { k: 'church', w: 1 }], (o) => o.w).k;
    case 'barrio': return rng.weighted([{ k: 'shophouse', w: 4 }, { k: 'apartment', w: 3 }, { k: 'house', w: 3 }, { k: 'church', w: 1 }], (o) => o.w).k;
    case 'suburb': return rng.weighted([{ k: 'house', w: 7 }, { k: 'shophouse', w: 1 }, { k: 'apartment', w: 1 }], (o) => o.w).k;
    case 'hills': return rng.weighted([{ k: 'villa', w: 6 }, { k: 'house', w: 3 }], (o) => o.w).k;
    case 'industrial': return rng.weighted([{ k: 'warehouse', w: 6 }, { k: 'silo', w: 2 }, { k: 'hangar', w: 1 }], (o) => o.w).k;
    case 'docks': return rng.weighted([{ k: 'warehouse', w: 7 }, { k: 'silo', w: 2 }, { k: 'hangar', w: 2 }], (o) => o.w).k;
    case 'airport': return rng.weighted([{ k: 'hangar', w: 4 }, { k: 'warehouse', w: 3 }, { k: 'office', w: 2 }, { k: 'parking', w: 1 }], (o) => o.w).k;
    case 'trailer': return rng.weighted([{ k: 'trailer', w: 6 }, { k: 'shack', w: 3 }, { k: 'warehouse', w: 1 }], (o) => o.w).k;
    case 'mall': return rng.weighted([{ k: 'mall', w: 4 }, { k: 'parking', w: 3 }, { k: 'shophouse', w: 2 }], (o) => o.w).k;
    case 'park': return rng.weighted([{ k: 'shack', w: 3 }, { k: 'house', w: 2 }, { k: 'church', w: 1 }], (o) => o.w).k;
    default: return 'office';
  }
}
