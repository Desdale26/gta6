// props.js — street furniture and scenery.
//
// Everything the city is dressed with: lamps, palms, benches, bins, signs, fences, containers,
// billboards. Each prop returns merged geometry plus collider and light descriptors, and any
// prop that repeats hundreds of times can be driven through propInstancer for one draw call.

let THREE = null;
let DEPS = {};
let mergeFn = null;
const matCache = new Map();

export const PROP_KINDS = ['streetlight', 'trafficLight', 'palm', 'tree', 'bush', 'hedge', 'bench',
  'bin', 'hydrant', 'postbox', 'phonebox', 'busStop', 'signStop', 'signSpeed', 'signDirection',
  'billboard', 'neonSign', 'awning', 'barrier', 'cone', 'planter', 'fence', 'chainlink', 'dumpster',
  'pallet', 'crate', 'barrel', 'ac', 'vent', 'antenna', 'watertower', 'powerpole', 'parkingMeter',
  'atm', 'newsstand', 'umbrella', 'deckchair', 'surfRack', 'lifeguard', 'buoy', 'bollard', 'statue',
  'fountain', 'playground', 'basketballHoop', 'trashbag', 'cardboard', 'tyreStack', 'sandbag',
  'jetty', 'boatDock', 'crane', 'container', 'forklift', 'scaffolding', 'roadwork', 'manhole',
  'grate', 'flagpole', 'clock', 'kiosk', 'foodcart', 'tables', 'parasol', 'streetart', 'ramp'];

export function initProps(three, deps = {}) {
  THREE = three;
  DEPS = deps;
  mergeFn = deps.mergeGeometries || null;
  matCache.clear();
  return true;
}

function merge(list) {
  if (!list.length) return null;
  if (list.length === 1) return list[0];
  if (mergeFn) {
    try { const g = mergeFn(list, false); if (g) { for (const x of list) x.dispose?.(); return g; } }
    catch (e) { /* fall back */ }
  }
  return list[0];
}

// Props tint by vertex colour rather than by cloning a material, so the whole city's street
// furniture merges into a handful of draw calls. `mat()` records the requested colour and the
// mesh builders below paint it into the geometry.
let _pendingTint = 0xffffff;

function mat(name, colorHex) {
  _pendingTint = colorHex === undefined ? 0xffffff : colorHex;
  const lib = DEPS.materials;
  if (!lib || !lib.tintable) {
    let m = matCache.get(name);
    if (!m) { m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, vertexColors: true }); matCache.set(name, m); }
    return m;
  }
  return lib.tintable(name);
}

function srgbToLinear(c) { return c < 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
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
/** Six shared traffic-light lens materials: red/amber/green, lit and unlit. */
let LENS_MATS = null;
export function trafficLightMaterials() {
  if (LENS_MATS) return LENS_MATS;
  const cols = [0xff2020, 0xffc020, 0x30ff50];
  LENS_MATS = { off: [], on: [] };
  for (let i = 0; i < 3; i++) {
    LENS_MATS.off.push(new THREE.MeshStandardMaterial({ color: 0x0a0a0a, emissive: cols[i], emissiveIntensity: 0.06, roughness: 0.4 }));
    LENS_MATS.on.push(new THREE.MeshStandardMaterial({ color: 0x0a0a0a, emissive: cols[i], emissiveIntensity: 4.5, roughness: 0.4 }));
  }
  return LENS_MATS;
}

/** Mesh whose geometry carries the tint recorded by the most recent mat() call. */
function tintedMesh(geo, material) {
  if (material && material.vertexColors) paint(geo, _pendingTint);
  return new THREE.Mesh(geo, material);
}

function box(w, h, d, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (rx) g.rotateX(rx); if (ry) g.rotateY(ry); if (rz) g.rotateZ(rz);
  g.translate(x, y + h / 2, z);
  return g;
}
function cyl(r1, r2, h, seg, x = 0, y = 0, z = 0, rx = 0, rz = 0) {
  const g = new THREE.CylinderGeometry(r1, r2, h, seg);
  // `y` is the BASE of an upright cylinder, which is what the half-height is
  // for. Lay the geometry over and there is no base under it any more, and that
  // same half-height becomes a pure vertical lift of half the cylinder's
  // LENGTH -- which is how every horizontal mast arm and fence rail in the city
  // came to float above the thing it was meant to join. A 2.4 m traffic-light
  // arm hung 1.2 m over its pole; a 6 m chain-link top rail sat 3 m above the
  // posts. For a laid-over cylinder `y` is simply its centre.
  const upright = !rx && !rz;
  if (rx) g.rotateX(rx); if (rz) g.rotateZ(rz);
  g.translate(x, upright ? y + h / 2 : y, z);
  return g;
}
function plane(w, h, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const g = new THREE.PlaneGeometry(w, h);
  if (rx) g.rotateX(rx); if (ry) g.rotateY(ry); if (rz) g.rotateZ(rz);
  g.translate(x, y, z);
  return g;
}

/** A curved, tapered palm trunk built from stacked segments. */
function palmTrunk(height, lean, rng) {
  const segs = 9;
  const parts = [];
  let x = 0, z = 0, y = 0;
  const dir = rng.range(0, Math.PI * 2);
  for (let i = 0; i < segs; i++) {
    const t = i / segs;
    const sh = height / segs;
    const r = 0.25 * (1 - t * 0.5);
    const bend = lean * (t * t) * 0.9;
    const nx = Math.cos(dir) * bend, nz = Math.sin(dir) * bend;
    const g = new THREE.CylinderGeometry(r * 0.93, r, sh * 1.06, 7);
    g.translate(x + nx * 0.5, y + sh / 2, z + nz * 0.5);
    parts.push(g);
    x += nx; z += nz; y += sh;
  }
  return { parts, topX: x, topY: y, topZ: z, dir };
}

/**
 * Build a prop.
 * @returns {{ group: THREE.Group, colliders: Array, lights: Array, breakable: object|null }}
 */
export function makeProp(kind, opts = {}, rng) {
  if (!THREE) throw new Error('props: initProps(THREE, deps) must be called first');
  const group = new THREE.Group();
  group.name = 'prop:' + kind;
  const colliders = [];
  const lights = [];
  let breakable = null;
  const R = rng || { float: () => 0.5, range: (a, b) => (a + b) / 2, int: (a, b) => a, bool: () => false, pick: (a) => a[0] };

  const add = (geoList, material, shadow = true) => {
    const g = merge(geoList);
    if (!g) return null;
    const m = tintedMesh(g, material);
    m.castShadow = shadow;
    m.receiveShadow = shadow;
    group.add(m);
    return m;
  };

  switch (kind) {
    case 'streetlight': {
      const h = opts.height ?? 7.2;
      const arm = opts.arm ?? 2.0;
      const metal = [];
      metal.push(cyl(0.09, 0.14, h, 8));
      metal.push(cyl(0.07, 0.08, arm, 6, arm * 0.5, h - 0.35, 0, 0, Math.PI / 2));
      metal.push(box(0.5, 0.16, 0.28, arm, h - 0.42, 0));
      metal.push(box(0.34, 0.1, 0.1, 0, 0.06, 0));
      add(metal, mat('metalPanel', 0x3a3f45));
      const lens = new THREE.Mesh(box(0.42, 0.06, 0.22, arm, h - 0.5, 0),
        DEPS.materials ? DEPS.materials.streetlightLens : mat('metalPanel', 0xffd9a0));
      lens.castShadow = false;
      group.add(lens);
      lights.push({ x: arm, y: h - 0.55, z: 0, color: 0xffd9a0, intensity: 9.5, distance: 34, kind: 'street' });
      colliders.push({ type: 'box', x: 0, y: h / 2, z: 0, hw: 0.16, hh: h / 2, hd: 0.16, yaw: 0 });
      breakable = { hp: 260, debris: 'metal' };
      break;
    }
    case 'trafficLight': {
      const h = opts.height ?? 5.6;
      const heads = opts.heads ?? 2;
      const metal = [];
      metal.push(cyl(0.10, 0.14, h, 8));
      metal.push(cyl(0.07, 0.07, 2.4, 6, 1.2, h - 0.3, 0, 0, Math.PI / 2));
      const lensMeshes = [];
      const lensMats = trafficLightMaterials();
      const lensGeo = new THREE.CylinderGeometry(0.10, 0.10, 0.06, 8).rotateX(Math.PI / 2);
      for (let i = 0; i < heads; i++) {
        const a = (i / heads) * Math.PI * 2;
        const px = Math.cos(a) * (i === 0 ? 2.2 : 0.35);
        const pz = Math.sin(a) * (i === 0 ? 0 : 0.35);
        metal.push(box(0.36, 1.05, 0.3, px, h - 1.25, pz));
        for (let l = 0; l < 3; l++) {
          const m = new THREE.Mesh(lensGeo, lensMats.off[l]);
          m.position.set(px, h - 0.85 - l * 0.3, pz + 0.17);
          m.userData.lamp = l;   // 0 red, 1 amber, 2 green
          m.userData.head = i;
          // The lens is the only part of a traffic light that changes at runtime,
          // so it is the only part that has to stay out of the world merge.
          m.userData.noMerge = true;
          group.add(m);
          lensMeshes.push(m);
        }
      }
      add(metal, mat('metalPanel', 0x2f3339));
      group.userData.lenses = lensMeshes;
      colliders.push({ type: 'box', x: 0, y: h / 2, z: 0, hw: 0.18, hh: h / 2, hd: 0.18, yaw: 0 });
      break;
    }
    case 'palm': {
      const h = opts.height ?? R.range(6, 13);
      const t = palmTrunk(h, R.range(0.08, 0.3), R);
      add(t.parts, mat('bark', 0x8a7250));
      const fronds = R.int(8, 13);
      const frondGeo = [];
      for (let i = 0; i < fronds; i++) {
        const a = (i / fronds) * Math.PI * 2 + R.range(-0.2, 0.2);
        const droop = R.range(0.35, 0.85);
        const len = R.range(2.4, 3.8);
        const g = new THREE.PlaneGeometry(len, 0.85, 3, 1);
        // bend the frond downward along its length
        const pos = g.attributes.position;
        for (let v = 0; v < pos.count; v++) {
          const u = (pos.getX(v) + len / 2) / len;
          pos.setY(v, pos.getY(v));
          pos.setZ(v, -droop * u * u * len * 0.45);
        }
        pos.needsUpdate = true;
        g.rotateX(-Math.PI / 2);
        g.rotateZ(-0.25);
        g.rotateY(a);
        g.translate(t.topX, t.topY + 0.1, t.topZ);
        frondGeo.push(g);
      }
      add(frondGeo, DEPS.materials ? DEPS.materials.palmFrond : mat('foliage', 0x3e7a34), true);
      // coconuts
      if (R.bool(0.4)) {
        const nuts = [];
        for (let i = 0; i < 3; i++) {
          nuts.push(new THREE.SphereGeometry(0.14, 6, 5).translate(
            t.topX + R.range(-0.25, 0.25), t.topY - 0.15, t.topZ + R.range(-0.25, 0.25)));
        }
        add(nuts, mat('bark', 0x6a5436));
      }
      colliders.push({ type: 'box', x: t.topX * 0.4, y: h / 2, z: t.topZ * 0.4, hw: 0.28, hh: h / 2, hd: 0.28, yaw: 0 });
      break;
    }
    case 'tree': {
      const h = opts.height ?? R.range(5, 11);
      const trunk = [cyl(0.16, 0.34, h * 0.52, 7)];
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        trunk.push(cyl(0.08, 0.13, h * 0.3, 5, Math.cos(a) * 0.5, h * 0.45, Math.sin(a) * 0.5, 0, Math.cos(a) * 0.5));
      }
      add(trunk, mat('bark', 0x6b5238));
      // cross-quad canopy clusters
      const foliage = [];
      const clusters = R.int(3, 5);
      for (let c = 0; c < clusters; c++) {
        const cx = R.range(-1.2, 1.2), cz = R.range(-1.2, 1.2);
        const cy = h * R.range(0.6, 0.92);
        const s = R.range(2.2, 3.6);
        for (let k = 0; k < 3; k++) {
          foliage.push(plane(s, s, cx, cy, cz, 0, (k / 3) * Math.PI, 0));
        }
      }
      add(foliage, DEPS.materials ? DEPS.materials.foliage : mat('foliage', 0x3e7a34), true);
      colliders.push({ type: 'box', x: 0, y: h * 0.26, z: 0, hw: 0.36, hh: h * 0.26, hd: 0.36, yaw: 0 });
      break;
    }
    case 'bush': {
      const s = opts.size ?? R.range(1.0, 1.9);
      const foliage = [];
      for (let k = 0; k < 3; k++) foliage.push(plane(s * 1.6, s * 1.3, 0, s * 0.6, 0, 0, (k / 3) * Math.PI, 0));
      add(foliage, DEPS.materials ? DEPS.materials.foliage : mat('foliage', 0x3e7a34), true);
      colliders.push({ type: 'box', x: 0, y: s * 0.4, z: 0, hw: s * 0.5, hh: s * 0.4, hd: s * 0.5, yaw: 0 });
      breakable = { hp: 30, debris: 'wood' };
      break;
    }
    case 'hedge': {
      const w = opts.width ?? 4, h = opts.height ?? 1.3, d = opts.depth ?? 0.9;
      add([box(w, h, d)], mat('hedge', 0x3f7a34));
      colliders.push({ type: 'box', x: 0, y: h / 2, z: 0, hw: w / 2, hh: h / 2, hd: d / 2, yaw: 0 });
      break;
    }
    case 'bench': {
      const wood = [box(1.9, 0.08, 0.48, 0, 0.44), box(1.9, 0.52, 0.08, 0, 0.52, -0.22, -0.16)];
      const metal = [];
      for (const sx of [-0.8, 0.8]) {
        metal.push(box(0.08, 0.44, 0.5, sx, 0, 0));
        metal.push(box(0.08, 0.06, 0.5, sx, 0.44, 0));
      }
      add(wood, mat('wood', 0x9a6f42));
      add(metal, mat('metalPanel', 0x2a2e33));
      colliders.push({ type: 'box', x: 0, y: 0.35, z: 0, hw: 1.0, hh: 0.35, hd: 0.28, yaw: 0 });
      break;
    }
    case 'bin': {
      add([cyl(0.32, 0.28, 0.95, 10), cyl(0.35, 0.35, 0.06, 10, 0, 0.95)], mat('metalPanel', 0x2c4a33));
      colliders.push({ type: 'box', x: 0, y: 0.5, z: 0, hw: 0.34, hh: 0.5, hd: 0.34, yaw: 0 });
      breakable = { hp: 60, debris: 'metal' };
      break;
    }
    case 'trashbag': {
      const bags = [];
      for (let i = 0; i < R.int(2, 4); i++) {
        bags.push(new THREE.SphereGeometry(R.range(0.3, 0.45), 6, 5)
          .translate(R.range(-0.4, 0.4), R.range(0.3, 0.4), R.range(-0.4, 0.4)));
      }
      add(bags, mat('tarp', 0x22242a));
      colliders.push({ type: 'box', x: 0, y: 0.3, z: 0, hw: 0.6, hh: 0.3, hd: 0.6, yaw: 0 });
      breakable = { hp: 10, debris: 'plastic' };
      break;
    }
    case 'cardboard': {
      const g = [];
      for (let i = 0; i < R.int(2, 5); i++) {
        g.push(box(R.range(0.4, 0.8), R.range(0.3, 0.6), R.range(0.4, 0.7),
          R.range(-0.4, 0.4), i * 0.32, R.range(-0.4, 0.4), 0, R.range(0, 1.5), 0));
      }
      add(g, mat('wood', 0xa98a5e));
      colliders.push({ type: 'box', x: 0, y: 0.4, z: 0, hw: 0.7, hh: 0.4, hd: 0.7, yaw: 0 });
      breakable = { hp: 15, debris: 'wood' };
      break;
    }
    case 'hydrant': {
      add([cyl(0.13, 0.16, 0.62, 8), cyl(0.17, 0.17, 0.09, 8, 0, 0.62),
        cyl(0.07, 0.07, 0.2, 6, 0.16, 0.38, 0, 0, Math.PI / 2),
        cyl(0.07, 0.07, 0.2, 6, -0.16, 0.38, 0, 0, Math.PI / 2)], mat('metalPanel', 0xd02b1f));
      colliders.push({ type: 'box', x: 0, y: 0.36, z: 0, hw: 0.2, hh: 0.36, hd: 0.2, yaw: 0 });
      breakable = { hp: 120, debris: 'metal' };
      break;
    }
    case 'postbox': {
      add([box(0.52, 1.1, 0.44, 0, 0.18), cyl(0.26, 0.26, 0.44, 8, 0, 1.28, 0, Math.PI / 2),
        box(0.12, 0.18, 0.12, 0, 0, 0)], mat('metalPanel', 0x2244aa));
      colliders.push({ type: 'box', x: 0, y: 0.7, z: 0, hw: 0.3, hh: 0.7, hd: 0.26, yaw: 0 });
      breakable = { hp: 150, debris: 'metal' };
      break;
    }
    case 'phonebox': {
      add([box(1.0, 2.4, 1.0)], mat('metalPanel', 0x1a4a2a));
      add([box(0.86, 1.6, 0.05, 0, 0.6, 0.49), box(0.86, 1.6, 0.05, 0, 0.6, -0.49)],
        DEPS.materials ? DEPS.materials.glass : mat('metalPanel', 0x88aacc), false);
      colliders.push({ type: 'box', x: 0, y: 1.2, z: 0, hw: 0.52, hh: 1.2, hd: 0.52, yaw: 0 });
      lights.push({ x: 0, y: 2.2, z: 0, color: 0xd8ffe0, intensity: 1.2, distance: 8, kind: 'window' });
      break;
    }
    case 'busStop': {
      const metal = [];
      for (const sx of [-1.6, 1.6]) metal.push(box(0.1, 2.5, 0.1, sx, 0, -0.6));
      metal.push(box(3.6, 0.1, 1.5, 0, 2.5, 0));
      metal.push(box(3.4, 1.6, 0.06, 0, 0.5, -0.62));
      add(metal, mat('metalPanel', 0x3a4048));
      add([box(1.8, 0.08, 0.42, 0, 0.44), box(0.08, 0.44, 0.42, -0.9), box(0.08, 0.44, 0.42, 0.9)],
        mat('metalPanel', 0x606870));
      lights.push({ x: 0, y: 2.4, z: 0, color: 0xe0f0ff, intensity: 1.6, distance: 10, kind: 'window' });
      colliders.push({ type: 'box', x: 0, y: 1.25, z: -0.6, hw: 1.8, hh: 1.25, hd: 0.2, yaw: 0 });
      break;
    }
    case 'signStop': case 'signSpeed': case 'signDirection': {
      const metal = [cyl(0.05, 0.05, 2.4, 6)];
      add(metal, mat('metalPanel', 0x9aa0a6));
      const isStop = kind === 'signStop';
      const face = isStop
        ? new THREE.CircleGeometry(0.42, 8).translate(0, 2.35, 0.03)
        : kind === 'signSpeed'
          ? new THREE.PlaneGeometry(0.62, 0.8).translate(0, 2.3, 0.03)
          : new THREE.PlaneGeometry(1.4, 0.42).translate(0, 2.4, 0.03);
      const col = isStop ? 0xcc2020 : kind === 'signSpeed' ? 0xf0f0f0 : 0x1f6a3a;
      const m = tintedMesh(face, mat('metalPanel', col));
      m.castShadow = false;
      group.add(m);
      colliders.push({ type: 'box', x: 0, y: 1.2, z: 0, hw: 0.09, hh: 1.2, hd: 0.09, yaw: 0 });
      breakable = { hp: 80, debris: 'metal' };
      break;
    }
    case 'billboard': {
      const w = opts.width ?? 9, h = opts.height ?? 4.4, standH = opts.standHeight ?? 5.5;
      const metal = [];
      for (const sx of [-w * 0.3, w * 0.3]) metal.push(box(0.24, standH, 0.24, sx, 0, 0));
      metal.push(box(w + 0.5, 0.2, 0.3, 0, standH, 0));
      metal.push(box(w + 0.4, h + 0.4, 0.18, 0, standH, -0.2));
      add(metal, mat('metalPanel', 0x4a4f55));
      const art = DEPS.tex ? DEPS.tex('billboard', { seed: opts.seed ?? R.int(1, 9999), size: 512 }) : null;
      const face = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h).translate(0, standH + h / 2, -0.08),
        new THREE.MeshStandardMaterial({ map: art, roughness: 0.75, metalness: 0,
          emissive: 0xffffff, emissiveMap: art, emissiveIntensity: 0 }),
      );
      if (DEPS.materials) DEPS.materials.registerEmissive(face.material, 0.9, 0.05);
      group.add(face);
      lights.push({ x: 0, y: standH + h + 0.6, z: 1.2, color: 0xfff0d0, intensity: 2.0, distance: 16, kind: 'sign' });
      colliders.push({ type: 'box', x: 0, y: standH / 2, z: 0, hw: w * 0.35, hh: standH / 2, hd: 0.3, yaw: 0 });
      break;
    }
    case 'neonSign': {
      const w = opts.width ?? 2.4, h = opts.height ?? 1.2;
      const col = opts.color ?? 0xff2d95;
      const m = tintedMesh(new THREE.PlaneGeometry(w, h).translate(0, h / 2, 0),
        DEPS.materials
          ? DEPS.materials.sign(opts.text || 'OPEN', { color: col, neon: true, neonColor: col, transparent: true, intensity: 3 })
          : mat('metalPanel', col));
      m.castShadow = false;
      group.add(m);
      lights.push({ x: 0, y: h / 2, z: 0.3, color: col, intensity: 2.4, distance: 12, kind: 'neon' });
      break;
    }
    case 'awning': {
      const w = opts.width ?? 4, d = opts.depth ?? 1.6;
      const g = new THREE.BoxGeometry(w, 0.1, d);
      g.rotateX(-0.2);
      g.translate(0, 3.0, d / 2);
      add([g], mat('tarp', opts.color ?? 0xc8342f), true);
      break;
    }
    case 'barrier': {
      add([box(2.0, 0.12, 0.5, 0, 0.9), box(2.0, 0.12, 0.5, 0, 0.5),
        box(0.1, 1.0, 0.6, -0.95), box(0.1, 1.0, 0.6, 0.95)], mat('metalPanel', 0xd8d8d8));
      colliders.push({ type: 'box', x: 0, y: 0.5, z: 0, hw: 1.0, hh: 0.5, hd: 0.3, yaw: 0 });
      breakable = { hp: 40, debris: 'metal' };
      break;
    }
    case 'cone': {
      const c = new THREE.ConeGeometry(0.26, 0.7, 8).translate(0, 0.35, 0);
      add([c, box(0.5, 0.05, 0.5, 0, 0)], mat('metalPanel', 0xff5a1f));
      colliders.push({ type: 'box', x: 0, y: 0.3, z: 0, hw: 0.25, hh: 0.3, hd: 0.25, yaw: 0 });
      breakable = { hp: 5, debris: 'plastic' };
      break;
    }
    case 'planter': {
      add([box(1.4, 0.7, 1.4)], mat('concrete', 0xa8a49a));
      const foliage = [];
      for (let k = 0; k < 3; k++) foliage.push(plane(1.5, 1.2, 0, 1.2, 0, 0, (k / 3) * Math.PI, 0));
      add(foliage, DEPS.materials ? DEPS.materials.foliage : mat('foliage', 0x3e7a34));
      colliders.push({ type: 'box', x: 0, y: 0.35, z: 0, hw: 0.7, hh: 0.35, hd: 0.7, yaw: 0 });
      break;
    }
    case 'fence': {
      const w = opts.width ?? 4, h = opts.height ?? 1.4;
      const wood = [];
      for (let i = 0; i <= Math.floor(w / 0.5); i++) wood.push(box(0.1, h, 0.05, -w / 2 + i * 0.5, 0));
      wood.push(box(w, 0.1, 0.06, 0, h * 0.75));
      wood.push(box(w, 0.1, 0.06, 0, h * 0.3));
      add(wood, mat('wood', 0xb0a184));
      colliders.push({ type: 'box', x: 0, y: h / 2, z: 0, hw: w / 2, hh: h / 2, hd: 0.08, yaw: 0 });
      breakable = { hp: 45, debris: 'wood' };
      break;
    }
    case 'chainlink': {
      const w = opts.width ?? 6, h = opts.height ?? 2.4;
      const metal = [];
      for (let i = 0; i <= Math.ceil(w / 3); i++) metal.push(cyl(0.05, 0.05, h, 6, -w / 2 + i * (w / Math.ceil(w / 3)), 0));
      metal.push(cyl(0.04, 0.04, w, 6, 0, h, 0, 0, Math.PI / 2));
      add(metal, mat('metalPanel', 0x8f959b));
      const mesh = tintedMesh(new THREE.PlaneGeometry(w, h).translate(0, h / 2, 0),
        DEPS.materials ? DEPS.materials.fence : mat('metalPanel', 0x999999));
      mesh.castShadow = false;
      // Tile the chainlink texture at a fixed real-world size.
      if (mesh.material.map) { mesh.material = mesh.material.clone(); mesh.material.map = mesh.material.map.clone(); mesh.material.map.repeat.set(w / 2, h / 2); mesh.material.map.needsUpdate = true; }
      group.add(mesh);
      colliders.push({ type: 'box', x: 0, y: h / 2, z: 0, hw: w / 2, hh: h / 2, hd: 0.06, yaw: 0 });
      break;
    }
    case 'dumpster': {
      add([box(2.2, 1.2, 1.3, 0, 0.15), box(2.24, 0.12, 1.34, 0, 1.35, 0, 0.06)], mat('metalPanel', 0x2c5a3a));
      add([cyl(0.13, 0.13, 0.1, 8, -0.9, 0, 0.55, 0, Math.PI / 2), cyl(0.13, 0.13, 0.1, 8, 0.9, 0, 0.55, 0, Math.PI / 2)],
        mat('metalPanel', 0x1a1a1a));
      colliders.push({ type: 'box', x: 0, y: 0.75, z: 0, hw: 1.15, hh: 0.75, hd: 0.7, yaw: 0 });
      breakable = { hp: 400, debris: 'metal' };
      break;
    }
    case 'pallet': {
      const wood = [];
      for (let i = 0; i < 5; i++) wood.push(box(1.2, 0.04, 0.14, 0, 0.12, -0.5 + i * 0.25));
      for (const sx of [-0.5, 0, 0.5]) wood.push(box(0.12, 0.12, 1.2, sx, 0));
      add(wood, mat('wood', 0xa98a5e));
      colliders.push({ type: 'box', x: 0, y: 0.09, z: 0, hw: 0.6, hh: 0.09, hd: 0.6, yaw: 0 });
      breakable = { hp: 25, debris: 'wood' };
      break;
    }
    case 'crate': {
      const s = opts.size ?? R.range(0.8, 1.4);
      add([box(s, s, s)], mat('wood', 0xa98a5e));
      colliders.push({ type: 'box', x: 0, y: s / 2, z: 0, hw: s / 2, hh: s / 2, hd: s / 2, yaw: 0 });
      breakable = { hp: 35, debris: 'wood' };
      break;
    }
    case 'barrel': {
      add([cyl(0.32, 0.32, 0.95, 12), cyl(0.34, 0.34, 0.06, 12, 0, 0.2), cyl(0.34, 0.34, 0.06, 12, 0, 0.7)],
        mat('rustMetal', opts.color ?? 0xc03a20));
      colliders.push({ type: 'box', x: 0, y: 0.5, z: 0, hw: 0.34, hh: 0.5, hd: 0.34, yaw: 0 });
      breakable = { hp: 55, debris: 'metal', explosive: true };
      break;
    }
    case 'tyreStack': {
      const g = [];
      for (let i = 0; i < R.int(3, 6); i++) {
        const t = new THREE.TorusGeometry(0.36, 0.14, 6, 12);
        t.rotateX(Math.PI / 2);
        t.translate(R.range(-0.06, 0.06), 0.16 + i * 0.24, R.range(-0.06, 0.06));
        g.push(t);
      }
      add(g, mat('tire', 0x17171c));
      colliders.push({ type: 'box', x: 0, y: 0.5, z: 0, hw: 0.5, hh: 0.5, hd: 0.5, yaw: 0 });
      breakable = { hp: 70, debris: 'plastic' };
      break;
    }
    case 'sandbag': {
      const g = [];
      for (let r = 0; r < 3; r++) for (let i = 0; i < 4 - r; i++) {
        g.push(new THREE.SphereGeometry(0.3, 6, 4).scale(1, 0.55, 0.7)
          .translate(-0.6 + (i + r * 0.5) * 0.42, 0.18 + r * 0.26, 0));
      }
      add(g, mat('tarp', 0xa89670));
      colliders.push({ type: 'box', x: 0, y: 0.4, z: 0, hw: 0.9, hh: 0.4, hd: 0.3, yaw: 0 });
      break;
    }
    case 'ac': {
      add([box(0.9, 0.7, 0.9), box(0.8, 0.06, 0.8, 0, 0.72)], mat('metalPanel', 0xa8acb0));
      colliders.push({ type: 'box', x: 0, y: 0.35, z: 0, hw: 0.45, hh: 0.35, hd: 0.45, yaw: 0 });
      break;
    }
    case 'vent': {
      add([cyl(0.35, 0.35, 0.8, 10), cyl(0.45, 0.35, 0.2, 10, 0, 0.8)], mat('metalPanel', 0x9aa0a4));
      colliders.push({ type: 'box', x: 0, y: 0.5, z: 0, hw: 0.4, hh: 0.5, hd: 0.4, yaw: 0 });
      break;
    }
    case 'antenna': {
      const h = opts.height ?? R.range(3, 8);
      const metal = [cyl(0.05, 0.09, h, 6)];
      for (let i = 0; i < 4; i++) metal.push(box(0.9, 0.04, 0.04, 0, h * (0.5 + i * 0.12), 0, 0, i * 0.6, 0));
      add(metal, mat('metalPanel', 0x808890));
      lights.push({ x: 0, y: h, z: 0, color: 0xff3030, intensity: 1.2, distance: 14, kind: 'beacon' });
      colliders.push({ type: 'box', x: 0, y: h / 2, z: 0, hw: 0.12, hh: h / 2, hd: 0.12, yaw: 0 });
      break;
    }
    case 'watertower': {
      const legH = opts.legHeight ?? 7, r = opts.radius ?? 2.4;
      const metal = [];
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + 0.78;
        metal.push(box(0.18, legH, 0.18, Math.cos(a) * r * 0.8, 0, Math.sin(a) * r * 0.8));
      }
      metal.push(cyl(r, r, r * 1.3, 12, 0, legH));
      const cone = new THREE.ConeGeometry(r * 1.05, r * 0.7, 12).translate(0, legH + r * 1.3 + r * 0.35, 0);
      metal.push(cone);
      add(metal, mat('metalPanel', 0x9aa4a8));
      colliders.push({ type: 'box', x: 0, y: (legH + r * 1.3) / 2, z: 0, hw: r, hh: (legH + r * 1.3) / 2, hd: r, yaw: 0 });
      break;
    }
    case 'powerpole': {
      const h = opts.height ?? 9;
      const wood = [cyl(0.16, 0.22, h, 7)];
      wood.push(box(2.6, 0.14, 0.14, 0, h - 0.7, 0));
      wood.push(box(2.0, 0.14, 0.14, 0, h - 1.5, 0));
      add(wood, mat('wood', 0x6b5238));
      colliders.push({ type: 'box', x: 0, y: h / 2, z: 0, hw: 0.24, hh: h / 2, hd: 0.24, yaw: 0 });
      break;
    }
    case 'parkingMeter': {
      add([cyl(0.05, 0.06, 1.1, 6), box(0.18, 0.34, 0.14, 0, 1.1)], mat('metalPanel', 0x5a6068));
      colliders.push({ type: 'box', x: 0, y: 0.6, z: 0, hw: 0.1, hh: 0.6, hd: 0.1, yaw: 0 });
      breakable = { hp: 35, debris: 'metal' };
      break;
    }
    case 'atm': {
      add([box(0.8, 1.7, 0.5)], mat('metalPanel', 0x2a3a4a));
      const screen = new THREE.Mesh(box(0.5, 0.4, 0.04, 0, 1.0, 0.26),
        new THREE.MeshStandardMaterial({ color: 0x081018, emissive: 0x2288cc, emissiveIntensity: 1.4, roughness: 0.3 }));
      group.add(screen);
      lights.push({ x: 0, y: 1.2, z: 0.4, color: 0x3399dd, intensity: 0.8, distance: 5, kind: 'window' });
      colliders.push({ type: 'box', x: 0, y: 0.85, z: 0, hw: 0.4, hh: 0.85, hd: 0.26, yaw: 0 });
      break;
    }
    case 'newsstand': case 'kiosk': {
      add([box(1.8, 2.2, 1.2, 0, 0)], mat('metalPanel', 0x3a4a5a));
      add([box(2.1, 0.1, 1.6, 0, 2.2, 0.2)], mat('tarp', 0xc8342f));
      lights.push({ x: 0, y: 2.0, z: 0.6, color: 0xffe0a0, intensity: 1.4, distance: 8, kind: 'sign' });
      colliders.push({ type: 'box', x: 0, y: 1.1, z: 0, hw: 0.9, hh: 1.1, hd: 0.6, yaw: 0 });
      break;
    }
    case 'foodcart': {
      add([box(1.8, 0.9, 1.0, 0, 0.55)], mat('metalPanel', 0xd8d4c8));
      add([box(2.0, 0.08, 1.4, 0, 2.0, 0)], mat('tarp', 0xffc93c));
      for (const sx of [-0.85, 0.85]) add([cyl(0.04, 0.04, 1.1, 5, sx, 0.9, 0)], mat('metalPanel', 0x9aa0a6));
      add([cyl(0.28, 0.28, 0.1, 10, -0.8, 0.1, 0.5, 0, Math.PI / 2), cyl(0.28, 0.28, 0.1, 10, 0.8, 0.1, 0.5, 0, Math.PI / 2)],
        mat('tire', 0x1a1a1e));
      lights.push({ x: 0, y: 1.8, z: 0, color: 0xffe0a0, intensity: 1.6, distance: 8, kind: 'sign' });
      colliders.push({ type: 'box', x: 0, y: 0.75, z: 0, hw: 0.95, hh: 0.75, hd: 0.55, yaw: 0 });
      break;
    }
    case 'umbrella': case 'parasol': {
      const cone = new THREE.ConeGeometry(1.5, 0.55, 10).translate(0, 2.2, 0);
      add([cyl(0.04, 0.04, 2.2, 6), cone], mat('tarp', opts.color ?? 0xf0f0e8));
      colliders.push({ type: 'box', x: 0, y: 1.1, z: 0, hw: 0.1, hh: 1.1, hd: 0.1, yaw: 0 });
      break;
    }
    case 'deckchair': {
      const g = new THREE.BoxGeometry(0.6, 0.05, 1.5);
      g.rotateX(-0.35);
      g.translate(0, 0.42, 0);
      add([g, box(0.06, 0.4, 0.06, -0.25, 0, 0.6), box(0.06, 0.4, 0.06, 0.25, 0, 0.6),
        box(0.06, 0.25, 0.06, -0.25, 0, -0.5), box(0.06, 0.25, 0.06, 0.25, 0, -0.5)],
        mat('tarp', opts.color ?? 0x22a0c0));
      colliders.push({ type: 'box', x: 0, y: 0.3, z: 0, hw: 0.35, hh: 0.3, hd: 0.8, yaw: 0 });
      break;
    }
    case 'surfRack': {
      const metal = [box(0.08, 1.4, 0.08, -0.9, 0), box(0.08, 1.4, 0.08, 0.9, 0), box(1.9, 0.06, 0.06, 0, 1.2)];
      add(metal, mat('metalPanel', 0x8a9098));
      const boards = [];
      for (let i = 0; i < 4; i++) {
        const b = new THREE.BoxGeometry(0.4, 2.0, 0.07);
        b.rotateZ(0.16);
        b.translate(-0.7 + i * 0.45, 1.0, 0);
        boards.push(b);
      }
      add(boards, mat('tarp', 0xf0e8d8));
      colliders.push({ type: 'box', x: 0, y: 0.9, z: 0, hw: 1.0, hh: 0.9, hd: 0.2, yaw: 0 });
      break;
    }
    case 'lifeguard': {
      add([box(0.14, 3.2, 0.14, -1.1, 0, -1.1), box(0.14, 3.2, 0.14, 1.1, 0, -1.1),
        box(0.14, 3.2, 0.14, -1.1, 0, 1.1), box(0.14, 3.2, 0.14, 1.1, 0, 1.1),
        box(2.6, 0.12, 2.6, 0, 3.2), box(2.6, 1.0, 0.1, 0, 3.32, -1.3)], mat('wood', 0xe8e0cc));
      const roof = new THREE.ConeGeometry(2.2, 0.9, 4).rotateY(Math.PI / 4).translate(0, 4.9, 0);
      add([roof], mat('tarp', 0xd03a2a));
      colliders.push({ type: 'box', x: 0, y: 1.7, z: 0, hw: 1.3, hh: 1.7, hd: 1.3, yaw: 0 });
      break;
    }
    case 'buoy': {
      add([new THREE.SphereGeometry(0.4, 8, 6).scale(1, 1.3, 1).translate(0, 0.4, 0),
        cyl(0.05, 0.05, 0.8, 5, 0, 0.9)], mat('metalPanel', 0xff5a1f));
      lights.push({ x: 0, y: 1.6, z: 0, color: 0xff6020, intensity: 1.0, distance: 12, kind: 'beacon' });
      break;
    }
    case 'bollard': {
      add([cyl(0.11, 0.13, 0.85, 8), new THREE.SphereGeometry(0.12, 8, 6).translate(0, 0.85, 0)],
        mat('metalPanel', 0x2a2e33));
      colliders.push({ type: 'box', x: 0, y: 0.45, z: 0, hw: 0.14, hh: 0.45, hd: 0.14, yaw: 0 });
      breakable = { hp: 200, debris: 'metal' };
      break;
    }
    case 'statue': {
      add([box(2.0, 0.8, 2.0), box(1.4, 0.5, 1.4, 0, 0.8)], mat('marble', 0xcfcabc));
      add([cyl(0.28, 0.36, 2.2, 8, 0, 1.3), new THREE.SphereGeometry(0.3, 8, 7).translate(0, 3.7, 0),
        box(0.2, 1.0, 0.2, 0.5, 2.4, 0, 0, 0, -0.6)], mat('marble', 0xb8b2a4));
      colliders.push({ type: 'box', x: 0, y: 1.8, z: 0, hw: 1.0, hh: 1.8, hd: 1.0, yaw: 0 });
      break;
    }
    case 'fountain': {
      const r = opts.radius ?? 3.2;
      add([cyl(r, r, 0.7, 16), cyl(r * 0.28, r * 0.36, 1.6, 10, 0, 0.7),
        cyl(r * 0.55, r * 0.1, 0.25, 12, 0, 2.3)], mat('marble', 0xc8c2b4));
      const water = tintedMesh(new THREE.CircleGeometry(r - 0.25, 16).rotateX(-Math.PI / 2).translate(0, 0.6, 0),
        DEPS.materials ? DEPS.materials.glass : mat('marble', 0x4488aa));
      water.castShadow = false;
      group.add(water);
      colliders.push({ type: 'box', x: 0, y: 0.35, z: 0, hw: r, hh: 0.35, hd: r, yaw: 0 });
      break;
    }
    case 'playground': {
      add([box(0.12, 2.4, 0.12, -1.5, 0, 0), box(0.12, 2.4, 0.12, 1.5, 0, 0), box(3.2, 0.12, 0.12, 0, 2.4)],
        mat('metalPanel', 0xd04a2a));
      const slide = new THREE.BoxGeometry(0.9, 0.08, 3.2);
      slide.rotateX(0.5);
      slide.translate(0, 1.1, 1.6);
      add([slide], mat('metalPanel', 0x2aa0d0));
      colliders.push({ type: 'box', x: 0, y: 1.2, z: 0, hw: 1.7, hh: 1.2, hd: 1.7, yaw: 0 });
      break;
    }
    case 'basketballHoop': {
      add([box(0.14, 3.2, 0.14, 0, 0), box(1.2, 0.8, 0.06, 0, 2.9, 0.35)], mat('metalPanel', 0x707880));
      const ring = new THREE.TorusGeometry(0.25, 0.03, 5, 10).rotateX(Math.PI / 2).translate(0, 2.9, 0.62);
      add([ring], mat('metalPanel', 0xff6a20));
      colliders.push({ type: 'box', x: 0, y: 1.6, z: 0, hw: 0.16, hh: 1.6, hd: 0.16, yaw: 0 });
      break;
    }
    case 'jetty': case 'boatDock': {
      const len = opts.length ?? 14, w = opts.width ?? 3;
      const wood = [box(w, 0.16, len, 0, 0.6)];
      const posts = Math.max(2, Math.floor(len / 3));
      for (let i = 0; i < posts; i++) {
        const pz = -len / 2 + (i + 0.5) * (len / posts);
        for (const sx of [-1, 1]) wood.push(cyl(0.14, 0.14, 1.6, 6, sx * (w / 2 - 0.2), -1.0, pz));
      }
      add(wood, mat('wood', 0x8a7050));
      colliders.push({ type: 'box', x: 0, y: 0.68, z: 0, hw: w / 2, hh: 0.1, hd: len / 2, yaw: 0, drivable: true });
      break;
    }
    case 'crane': {
      const h = opts.height ?? 22;
      const metal = [];
      for (const sx of [-1.4, 1.4]) for (const sz of [-1.4, 1.4]) metal.push(box(0.24, h, 0.24, sx, 0, sz));
      for (let i = 1; i < 6; i++) metal.push(box(3.1, 0.14, 3.1, 0, h * (i / 6), 0));
      metal.push(box(2.0, 1.4, 16, 0, h, 4));
      metal.push(cyl(0.06, 0.06, 8, 5, 0, h - 8, 11));
      metal.push(box(1.0, 1.0, 1.0, 0, h - 9, 11));
      add(metal, mat('metalPanel', opts.color ?? 0xe08a20));
      colliders.push({ type: 'box', x: 0, y: h / 2, z: 0, hw: 1.7, hh: h / 2, hd: 1.7, yaw: 0 });
      lights.push({ x: 0, y: h + 1, z: 0, color: 0xff3030, intensity: 1.4, distance: 20, kind: 'beacon' });
      break;
    }
    case 'container': {
      const len = opts.length ?? 12, h = opts.height ?? 2.6, w = opts.width ?? 2.4;
      add([box(w, h, len)], mat('corrugated', opts.color ?? 0xc0562a));
      colliders.push({ type: 'box', x: 0, y: h / 2, z: 0, hw: w / 2, hh: h / 2, hd: len / 2, yaw: 0 });
      break;
    }
    case 'forklift': {
      add([box(1.3, 1.1, 2.2, 0, 0.35)], mat('metalPanel', 0xe0a020));
      add([box(0.1, 2.6, 0.1, -0.5, 0.3, 1.2), box(0.1, 2.6, 0.1, 0.5, 0.3, 1.2),
        box(0.2, 0.08, 1.0, -0.4, 0.32, 1.7), box(0.2, 0.08, 1.0, 0.4, 0.32, 1.7)], mat('metalPanel', 0x707880));
      add([cyl(0.35, 0.35, 0.25, 10, -0.6, 0.35, 0.7, 0, Math.PI / 2), cyl(0.35, 0.35, 0.25, 10, 0.6, 0.35, 0.7, 0, Math.PI / 2),
        cyl(0.28, 0.28, 0.2, 10, -0.55, 0.28, -0.8, 0, Math.PI / 2), cyl(0.28, 0.28, 0.2, 10, 0.55, 0.28, -0.8, 0, Math.PI / 2)],
        mat('tire', 0x1a1a1e));
      colliders.push({ type: 'box', x: 0, y: 0.8, z: 0, hw: 0.8, hh: 0.8, hd: 1.3, yaw: 0 });
      break;
    }
    case 'scaffolding': {
      const w = opts.width ?? 6, h = opts.height ?? 8;
      const metal = [];
      const bays = Math.max(1, Math.round(w / 2));
      for (let i = 0; i <= bays; i++) {
        const px = -w / 2 + i * (w / bays);
        for (const pz of [-0.9, 0.9]) metal.push(cyl(0.05, 0.05, h, 5, px, 0, pz));
      }
      for (let l = 1; l * 2 <= h; l++) {
        metal.push(box(w, 0.06, 1.9, 0, l * 2, 0));
        metal.push(box(w, 0.05, 0.05, 0, l * 2 + 1.0, 0.9));
      }
      add(metal, mat('metalPanel', 0x9aa0a6));
      colliders.push({ type: 'box', x: 0, y: h / 2, z: 0, hw: w / 2, hh: h / 2, hd: 1.0, yaw: 0 });
      break;
    }
    case 'roadwork': {
      add([box(1.4, 1.0, 0.08, 0, 0.6, 0, 0, 0, 0)], mat('metalPanel', 0xff8a20));
      add([box(0.08, 0.6, 0.08, -0.4, 0), box(0.08, 0.6, 0.08, 0.4, 0)], mat('metalPanel', 0x606060));
      colliders.push({ type: 'box', x: 0, y: 0.5, z: 0, hw: 0.7, hh: 0.5, hd: 0.2, yaw: 0 });
      breakable = { hp: 20, debris: 'plastic' };
      break;
    }
    case 'manhole': case 'grate': {
      const g = kind === 'manhole'
        ? new THREE.CircleGeometry(0.42, 12).rotateX(-Math.PI / 2).translate(0, 0.02, 0)
        : new THREE.PlaneGeometry(0.9, 0.5).rotateX(-Math.PI / 2).translate(0, 0.02, 0);
      const m = tintedMesh(g, mat('metalPanel', 0x4a4e52));
      m.castShadow = false;
      m.receiveShadow = true;
      group.add(m);
      break;
    }
    case 'flagpole': {
      const h = opts.height ?? 8;
      add([cyl(0.06, 0.09, h, 6), box(0.5, 0.1, 0.5, 0, 0)], mat('metalPanel', 0xd8dce0));
      const flag = tintedMesh(new THREE.PlaneGeometry(1.6, 1.0).translate(0.85, h - 0.8, 0),
        mat('tarp', opts.color ?? 0xd03a2a));
      flag.castShadow = false;
      group.add(flag);
      colliders.push({ type: 'box', x: 0, y: h / 2, z: 0, hw: 0.12, hh: h / 2, hd: 0.12, yaw: 0 });
      break;
    }
    case 'clock': {
      add([cyl(0.09, 0.12, 3.4, 8)], mat('metalPanel', 0x2a2e33));
      const face = tintedMesh(new THREE.CylinderGeometry(0.45, 0.45, 0.14, 14).rotateX(Math.PI / 2).translate(0, 3.6, 0),
        mat('marble', 0xf0ece0));
      group.add(face);
      lights.push({ x: 0, y: 3.6, z: 0, color: 0xfff0d0, intensity: 0.8, distance: 6, kind: 'window' });
      colliders.push({ type: 'box', x: 0, y: 1.7, z: 0, hw: 0.14, hh: 1.7, hd: 0.14, yaw: 0 });
      break;
    }
    case 'tables': {
      add([cyl(0.55, 0.5, 0.06, 10, 0, 0.72), cyl(0.06, 0.08, 0.72, 6), cyl(0.3, 0.3, 0.04, 8, 0, 0)],
        mat('metalPanel', 0x50565c));
      for (let i = 0; i < 2; i++) {
        const a = i * Math.PI;
        const cx = Math.cos(a) * 0.95, cz = Math.sin(a) * 0.95;
        add([box(0.42, 0.05, 0.42, cx, 0.45, cz), box(0.42, 0.45, 0.05, cx, 0.5, cz + Math.sign(cz || 1) * 0.2)],
          mat('metalPanel', 0x707880));
      }
      colliders.push({ type: 'box', x: 0, y: 0.4, z: 0, hw: 0.7, hh: 0.4, hd: 0.7, yaw: 0 });
      break;
    }
    case 'streetart': {
      const w = opts.width ?? 4, h = opts.height ?? 3;
      const art = DEPS.tex ? DEPS.tex('graffiti', { seed: opts.seed ?? R.int(1, 9999), size: 256 }) : null;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h).translate(0, h / 2 + 0.4, 0),
        new THREE.MeshStandardMaterial({ map: art, transparent: true, alphaTest: 0.2, roughness: 0.95,
          polygonOffset: true, polygonOffsetFactor: -2 }));
      m.castShadow = false;
      group.add(m);
      break;
    }
    case 'ramp': {
      const w = opts.width ?? 6, len = opts.length ?? 10, h = opts.height ?? 2.4;
      const angle = Math.atan2(h, len);
      const g = new THREE.BoxGeometry(w, 0.35, Math.hypot(len, h));
      g.rotateX(-angle);
      g.translate(0, h / 2, 0);
      add([g], mat('concrete', opts.color ?? 0xb0b0a8));
      colliders.push({ type: 'box', x: 0, y: h / 2, z: 0, hw: w / 2, hh: 0.18, hd: Math.hypot(len, h) / 2,
        yaw: 0, pitch: -angle, drivable: true });
      break;
    }
    default: {
      add([box(1, 1, 1)], mat('concrete', 0x909090));
      colliders.push({ type: 'box', x: 0, y: 0.5, z: 0, hw: 0.5, hh: 0.5, hd: 0.5, yaw: 0 });
    }
  }

  return { group, colliders, lights, breakable };
}

/**
 * One InstancedMesh per material for a repeated prop.
 * Returns { meshes, setAt(i, x, y, z, yaw, scale), finalize() }.
 */
export function propInstancer(kind, count, opts = {}, rng) {
  if (!THREE) throw new Error('props: initProps(THREE, deps) must be called first');
  const proto = makeProp(kind, opts, rng);
  const meshes = [];
  const dummy = new THREE.Object3D();
  proto.group.traverse((o) => {
    if (!o.isMesh) return;
    const im = new THREE.InstancedMesh(o.geometry, o.material, count);
    im.castShadow = o.castShadow;
    im.receiveShadow = o.receiveShadow;
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    im.frustumCulled = false;
    im.count = count;
    // Park everything at zero scale until it is placed.
    dummy.position.set(0, -9999, 0);
    dummy.scale.set(0, 0, 0);
    dummy.updateMatrix();
    for (let i = 0; i < count; i++) im.setMatrixAt(i, dummy.matrix);
    meshes.push(im);
  });
  return {
    meshes,
    colliders: proto.colliders,
    lights: proto.lights,
    breakable: proto.breakable,
    setAt(i, x, y, z, yaw = 0, scale = 1) {
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, yaw, 0);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      for (const m of meshes) m.setMatrixAt(i, dummy.matrix);
    },
    finalize() {
      for (const m of meshes) {
        m.instanceMatrix.needsUpdate = true;
        m.computeBoundingSphere?.();
      }
      return meshes;
    },
  };
}
