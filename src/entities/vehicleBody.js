// vehicleBody.js — turns a VehicleDef into a mesh.
//
// The body is lofted from the def's cross-sections, so a wedge supercar, a boxy van and a
// slab-sided bus all come out of the same code with genuinely different silhouettes. Every
// extra (arches, bumpers, lights, spoilers, lightbars, ladders) is generated from the
// def's feature flags, and the hull keeps its rest positions so collisions can crumple it.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { clamp, lerp, smoothstep } from '../core/mathx.js';

const RING = 8;

/** One cross-section ring: a rounded rectangle in the XY plane at a given z. */
function ringPoints(hw, bottom, top, chamfer, out) {
  const h = top - bottom;
  const c = Math.min(chamfer, hw * 0.48, h * 0.48);
  const cx = Math.max(c, 0.001);
  out[0] = -hw + cx; out[1] = bottom;
  out[2] = hw - cx; out[3] = bottom;
  out[4] = hw; out[5] = bottom + cx;
  out[6] = hw; out[7] = top - cx;
  out[8] = hw - cx; out[9] = top;
  out[10] = -hw + cx; out[11] = top;
  out[12] = -hw; out[13] = top - cx;
  out[14] = -hw; out[15] = bottom + cx;
  return out;
}

/** Loft a closed tube through a list of {z, hw, bottom, top, chamfer} stations. */
function loft(stations, opts = {}) {
  const n = stations.length;
  const pos = [], nrm = [], uv = [], idx = [];
  const pts = new Float32Array(RING * 2);
  const rings = [];
  for (let s = 0; s < n; s++) {
    const st = stations[s];
    ringPoints(st.hw, st.bottom, st.top, st.chamfer ?? 0.1, pts);
    const ring = new Float32Array(RING * 3);
    for (let i = 0; i < RING; i++) {
      ring[i * 3] = pts[i * 2];
      ring[i * 3 + 1] = pts[i * 2 + 1];
      ring[i * 3 + 2] = st.z;
    }
    rings.push(ring);
  }
  for (let s = 0; s < n; s++) {
    const ring = rings[s];
    const v = s / (n - 1);
    for (let i = 0; i < RING; i++) {
      pos.push(ring[i * 3], ring[i * 3 + 1], ring[i * 3 + 2]);
      uv.push(i / RING, v);
      nrm.push(0, 0, 0);
    }
  }
  for (let s = 0; s < n - 1; s++) {
    for (let i = 0; i < RING; i++) {
      const a = s * RING + i;
      const b = s * RING + ((i + 1) % RING);
      const c = (s + 1) * RING + ((i + 1) % RING);
      const d = (s + 1) * RING + i;
      idx.push(a, b, c, a, c, d);
    }
  }
  // caps
  if (opts.capStart !== false) {
    const base = pos.length / 3;
    const st = stations[0];
    const cxz = (st.bottom + st.top) * 0.5;
    pos.push(0, cxz, st.z); uv.push(0.5, 0); nrm.push(0, 0, 0);
    for (let i = 0; i < RING; i++) {
      pos.push(rings[0][i * 3], rings[0][i * 3 + 1], rings[0][i * 3 + 2]);
      uv.push(0.5 + Math.cos(i / RING * Math.PI * 2) * 0.4, 0.5 + Math.sin(i / RING * Math.PI * 2) * 0.4);
      nrm.push(0, 0, 0);
    }
    for (let i = 0; i < RING; i++) idx.push(base, base + 1 + ((i + 1) % RING), base + 1 + i);
  }
  if (opts.capEnd !== false) {
    const base = pos.length / 3;
    const st = stations[n - 1];
    const cxz = (st.bottom + st.top) * 0.5;
    pos.push(0, cxz, st.z); uv.push(0.5, 1); nrm.push(0, 0, 0);
    for (let i = 0; i < RING; i++) {
      pos.push(rings[n - 1][i * 3], rings[n - 1][i * 3 + 1], rings[n - 1][i * 3 + 2]);
      uv.push(0.5 + Math.cos(i / RING * Math.PI * 2) * 0.4, 0.5 + Math.sin(i / RING * Math.PI * 2) * 0.4);
      nrm.push(0, 0, 0);
    }
    for (let i = 0; i < RING; i++) idx.push(base, base + 1 + i, base + 1 + ((i + 1) % RING));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function box(w, h, d, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (rx || ry || rz) g.rotateX(rx), g.rotateY(ry), g.rotateZ(rz);
  g.translate(x, y, z);
  return g;
}
function cyl(rt, rb, h, seg, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  if (rx) g.rotateX(rx); if (ry) g.rotateY(ry); if (rz) g.rotateZ(rz);
  g.translate(x, y, z);
  return g;
}

/** A half-tube fender flare over a wheel. */
function archGeometry(radius, width, thickness, segments = 9) {
  const pos = [], idx = [], uv = [];
  for (let i = 0; i <= segments; i++) {
    const a = Math.PI * (i / segments);
    const cx = Math.cos(a), cy = Math.sin(a);
    for (let s = 0; s < 2; s++) {
      const x = (s === 0 ? -1 : 1) * width * 0.5;
      pos.push(x, cy * (radius + thickness), cx * (radius + thickness));
      uv.push(s, i / segments);
    }
  }
  for (let i = 0; i < segments; i++) {
    const a = i * 2, b = i * 2 + 1, c = i * 2 + 3, d = i * 2 + 2;
    idx.push(a, b, c, a, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Rim + tyre for one wheel. Returns a Group so rims and tyres keep their materials. */
export function buildWheel(def, materials, rng) {
  const r = def.wheels.radius;
  const w = def.wheels.width;
  const style = def.wheels.rimStyle || 'sport5';
  const group = new THREE.Group();

  const tyreProfile = clamp(def.wheels.tireProfile ?? 0.4, 0, 1);
  const rimR = r * lerp(0.78, 0.55, tyreProfile);

  const tyreGeo = new THREE.CylinderGeometry(r, r, w, 20, 1, true);
  tyreGeo.rotateZ(Math.PI / 2);
  const sidewallA = new THREE.RingGeometry(rimR * 0.98, r, 20);
  sidewallA.rotateY(Math.PI / 2); sidewallA.translate(w * 0.5, 0, 0);
  const sidewallB = sidewallA.clone(); sidewallB.rotateY(Math.PI);
  const tyre = new THREE.Mesh(mergeGeometries([tyreGeo, sidewallA, sidewallB], false) || tyreGeo, materials.tire);
  tyre.castShadow = true;
  group.add(tyre);

  const rimParts = [];
  const hubR = rimR * 0.24;
  rimParts.push(cyl(hubR, hubR, w * 0.72, 10, 0, 0, 0, 0, 0, Math.PI / 2));
  rimParts.push(cyl(rimR, rimR, w * 0.80, 22, 0, 0, 0, 0, 0, Math.PI / 2));
  const lip = new THREE.TorusGeometry(rimR, w * 0.06, 6, 22);
  lip.rotateY(Math.PI / 2); lip.translate(w * 0.40, 0, 0);
  rimParts.push(lip);

  const spokes = style === 'sport5' ? 5 : style === 'mesh' ? 10 : style === 'spoke' ? 16
    : style === 'blade' ? 6 : style === 'offroad' ? 6 : style === 'steel' ? 5 : 8;
  const spokeW = style === 'spoke' ? 0.018 : style === 'mesh' ? 0.03 : 0.062;
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2;
    const g = box(w * 0.34, rimR * 0.92, spokeW, 0, rimR * 0.46, 0);
    g.rotateX(a);
    rimParts.push(g);
  }
  if (style === 'dish' || style === 'steel' || style === 'chrome') {
    const dish = new THREE.CircleGeometry(rimR * 0.92, 22);
    dish.rotateY(Math.PI / 2); dish.translate(w * 0.18, 0, 0);
    rimParts.push(dish);
  }
  const rimGeo = mergeGeometries(rimParts, false);
  const rimMat = style === 'chrome' || style === 'dish' ? materials.rimChrome
    : def.wheels.rimColor !== undefined ? materials.rimDark : (rng && rng.bool(0.45) ? materials.rimChrome : materials.rimDark);
  if (rimGeo) {
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.castShadow = true;
    group.add(rim);
  }
  // brake disc + caliper
  const disc = new THREE.Mesh(cyl(rimR * 0.66, rimR * 0.66, w * 0.10, 14, -w * 0.10, 0, 0, 0, 0, Math.PI / 2), materials.plasticGrey);
  group.add(disc);
  return group;
}

/**
 * Build the complete vehicle. Returns
 * { group, bodyMesh, wheelMeshes, lights:{head[],tail[],brake[],reverse[],indicator[]},
 *   restPositions, sirenMeshes, extras }
 */
export function buildVehicleMesh(def, materials, rng, opts = {}) {
  const group = new THREE.Group();
  group.name = 'vehicle:' + def.id;
  const paletteIdx = opts.colorIndex !== undefined ? opts.colorIndex : rng.int(0, def.paint.palette.length - 1);
  const colorHex = opts.color !== undefined ? opts.color : def.paint.palette[paletteIdx % def.paint.palette.length];
  const paint = materials.carPaint(colorHex, {
    metallic: def.paint.metallic, roughness: def.paint.roughness, matte: def.paint.matte,
  });
  const secondHex = def.paint.twoTone ? def.paint.palette[(paletteIdx + 2) % def.paint.palette.length] : colorHex;
  const paint2 = def.paint.twoTone ? materials.carPaint(secondHex, { metallic: def.paint.metallic, roughness: def.paint.roughness }) : paint;

  const L = def.length, W = def.width, H = def.height;
  const kind = def.body.kind;

  // ------- hull -------
  const stations = def.body.sections.map((s) => ({
    z: (s.t - 0.5) * L,
    hw: Math.min(s.hw, W * 0.5),
    bottom: s.bottom - H * 0.5,
    top: Math.min(s.top, H) - H * 0.5,
    chamfer: s.chamfer ?? Math.min(0.14, s.hw * 0.3),
  }));
  const hullGeo = loft(stations);
  const bodyMesh = new THREE.Mesh(hullGeo, paint);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  bodyMesh.name = 'hull';
  group.add(bodyMesh);
  const restPositions = new Float32Array(hullGeo.attributes.position.array);

  const paintParts = [];
  const darkParts = [];
  const chromeParts = [];
  const glassParts = [];

  const sectionAt = (t) => {
    const secs = def.body.sections;
    for (let i = 0; i < secs.length - 1; i++) {
      if (t >= secs[i].t && t <= secs[i + 1].t) {
        const k = (t - secs[i].t) / Math.max(secs[i + 1].t - secs[i].t, 1e-4);
        return {
          hw: lerp(secs[i].hw, secs[i + 1].hw, k),
          top: lerp(secs[i].top, secs[i + 1].top, k) - H * 0.5,
          bottom: lerp(secs[i].bottom, secs[i + 1].bottom, k) - H * 0.5,
        };
      }
    }
    const s = secs[secs.length - 1];
    return { hw: s.hw, top: s.top - H * 0.5, bottom: s.bottom - H * 0.5 };
  };

  // ------- greenhouse -------
  const cab = def.body.cabin;
  let cabinTop = -H * 0.5;
  if (cab && kind !== 'bike' && kind !== 'kart' && kind !== 'quad') {
    const cs = cab.start, ce = cab.end;
    const clen = Math.max(ce - cs, 0.05);
    const rear = cs + clen * clamp(cab.rearRake ?? 0.28, 0.02, 0.45);
    const front = ce - clen * clamp(cab.frontRake ?? 0.3, 0.02, 0.45);
    const inset = clamp(cab.inset ?? 0.88, 0.4, 1);
    cabinTop = Math.min(cab.top, H) - H * 0.5;
    const mk = (t, hwScale, topY) => {
      const s = sectionAt(t);
      return { z: (t - 0.5) * L, hw: Math.max(0.05, s.hw * inset * hwScale), bottom: s.top - 0.03, top: topY, chamfer: 0.09 };
    };
    const cabStations = [
      mk(cs, 0.52, sectionAt(cs).top + 0.02),
      mk(rear, 0.95, cabinTop),
      mk(front, 1.0, cabinTop),
      mk(ce, 0.56, sectionAt(ce).top + 0.02),
    ];
    if (!def.features.convertible) {
      const cabGeo = loft(cabStations, { capStart: false, capEnd: false });
      const cabMesh = new THREE.Mesh(cabGeo, materials.carGlass);
      cabMesh.castShadow = false;
      cabMesh.renderOrder = 2;
      cabMesh.name = 'greenhouse';
      group.add(cabMesh);

      // roof panel + pillars in body colour
      const roofW = sectionAt((rear + front) * 0.5).hw * inset * 1.92;
      const roofZ = ((rear + front) * 0.5 - 0.5) * L;
      const roofLen = (front - rear) * L;
      paintParts.push(box(roofW, 0.05, Math.max(roofLen, 0.12), 0, cabinTop - 0.012, roofZ));
      const pillar = (t, scale) => {
        const s = sectionAt(t);
        const hw = s.hw * inset * scale;
        for (const sx of [-1, 1]) {
          paintParts.push(box(0.055, cabinTop - s.top, 0.075, sx * (hw - 0.02), (cabinTop + s.top) * 0.5, (t - 0.5) * L));
        }
      };
      pillar(rear, 0.93); pillar(front, 0.98);
      if (ce - cs > 0.3) pillar((rear + front) * 0.5, 0.96);
    } else {
      // Convertible: windscreen frame only.
      const s = sectionAt(front);
      chromeParts.push(box(s.hw * inset * 1.9, 0.05, 0.06, 0, cabinTop, (front - 0.5) * L));
      const wsGeo = loft([mk(front - 0.02, 0.98, sectionAt(front).top + 0.02), mk(front + 0.02, 0.98, cabinTop)], { capStart: false, capEnd: false });
      const ws = new THREE.Mesh(wsGeo, materials.carGlass);
      ws.renderOrder = 2;
      group.add(ws);
      // seats
      darkParts.push(box(0.44, 0.5, 0.16, -0.32, sectionAt(0.45).top + 0.2, ((cs + ce) * 0.5 - 0.5) * L));
      darkParts.push(box(0.44, 0.5, 0.16, 0.32, sectionAt(0.45).top + 0.2, ((cs + ce) * 0.5 - 0.5) * L));
    }
  }

  // ------- wheel arches -------
  const wr = def.wheels.radius, ww = def.wheels.width;
  const axleZ = [(def.wheels.frontT - 0.5) * L, (def.wheels.rearT - 0.5) * L];
  const halfTrack = def.track * 0.5;
  const wheelPositions = [];
  if (kind === 'bike') {
    wheelPositions.push({ x: 0, z: axleZ[0] }, { x: 0, z: axleZ[1] });
  } else {
    for (const z of axleZ) for (const sx of [-1, 1]) wheelPositions.push({ x: sx * halfTrack, z });
    if (def.wheels.count === 6) for (const sx of [-1, 1]) wheelPositions.push({ x: sx * halfTrack, z: axleZ[1] + wr * 2.4 });
  }
  if (kind !== 'bike' && kind !== 'kart') {
    for (const wp of wheelPositions) {
      const s = sectionAt(clamp(wp.z / L + 0.5, 0, 1));
      const arch = archGeometry(wr * 1.14, ww * 1.35, 0.035);
      arch.translate(wp.x, s.bottom + wr * 0.02, wp.z);
      paintParts.push(arch);
    }
  }

  // ------- nose & tail furniture -------
  const noseS = sectionAt(0.98), tailS = sectionAt(0.02);
  const noseZ = L * 0.48, tailZ = -L * 0.48;
  const lightsCfg = def.lights || {};
  const hY = (lightsCfg.headlightY ?? 0.58) * H - H * 0.5;
  const tY = (lightsCfg.taillightY ?? 0.6) * H - H * 0.5;
  const hSpread = (lightsCfg.headlightSpread ?? 0.72) * noseS.hw;
  const tSpread = (lightsCfg.taillightSpread ?? 0.78) * tailS.hw;
  const lightStyle = lightsCfg.style || 'strip';

  const headLights = [], tailLights = [], brakeLights = [], reverseLights = [], indicators = [];
  const headMat = materials.headlightGlass.clone();
  headMat.emissiveIntensity = 0;
  const tailMat = materials.taillightGlass.clone();

  if (kind !== 'boat') {
    for (const sx of [-1, 1]) {
      let hg;
      if (lightStyle === 'round') hg = new THREE.SphereGeometry(Math.min(0.14, noseS.hw * 0.3), 10, 8);
      else if (lightStyle === 'quad') hg = box(0.30, 0.11, 0.07);
      else hg = box(Math.min(0.42, noseS.hw * 0.85), 0.10, 0.06);
      hg.translate(sx * hSpread, hY, noseZ);
      const m = new THREE.Mesh(hg, headMat);
      m.name = 'headlight';
      group.add(m);
      headLights.push(m);

      const tg = box(Math.min(0.40, tailS.hw * 0.8), 0.10, 0.055, sx * tSpread, tY, tailZ);
      const tm = new THREE.Mesh(tg, tailMat);
      tm.name = 'taillight';
      group.add(tm);
      tailLights.push(tm);

      // indicator + reverse strips
      const ig = box(0.11, 0.07, 0.05, sx * (tSpread + 0.20), tY, tailZ);
      const im = new THREE.Mesh(ig, new THREE.MeshStandardMaterial({ color: 0x30200a, emissive: 0xff8a10, emissiveIntensity: 0, roughness: 0.4 }));
      group.add(im); indicators.push(im);
      const rg = box(0.10, 0.06, 0.05, sx * (tSpread - 0.20), tY - 0.02, tailZ);
      const rm = new THREE.Mesh(rg, new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xffffff, emissiveIntensity: 0, roughness: 0.4 }));
      group.add(rm); reverseLights.push(rm);
    }
    brakeLights.push(...tailLights);

    // grille + bumpers
    darkParts.push(box(noseS.hw * 1.5, Math.min(0.22, H * 0.16), 0.05, 0, hY - 0.16, noseZ + 0.005));
    const bumperMat = def.features.bullbar ? chromeParts : darkParts;
    bumperMat.push(box(noseS.hw * 1.92, 0.14, 0.16, 0, noseS.bottom + 0.20, noseZ - 0.04));
    darkParts.push(box(tailS.hw * 1.92, 0.14, 0.16, 0, tailS.bottom + 0.20, tailZ + 0.04));
    // number plates
    const plate = box(0.34, 0.10, 0.02, 0, Math.max(noseS.bottom + 0.30, hY - 0.28), noseZ + 0.03);
    chromeParts.push(plate);
    chromeParts.push(box(0.34, 0.10, 0.02, 0, Math.max(tailS.bottom + 0.30, tY - 0.28), tailZ - 0.03));
  }

  // ------- mirrors -------
  if (kind !== 'bike' && kind !== 'kart' && cab) {
    const mz = (cab.end - 0.02 - 0.5) * L;
    const ms = sectionAt(cab.end - 0.02);
    for (const sx of [-1, 1]) {
      darkParts.push(box(0.035, 0.03, 0.12, sx * (ms.hw + 0.06), ms.top + 0.06, mz));
      paintParts.push(box(0.14, 0.09, 0.05, sx * (ms.hw + 0.16), ms.top + 0.07, mz));
    }
  }

  // ------- exhausts -------
  const exhausts = def.features.exhausts ?? (kind === 'bike' ? 1 : 2);
  for (let i = 0; i < exhausts; i++) {
    const sx = exhausts === 1 ? 0.0 : (i % 2 === 0 ? -1 : 1) * (tailS.hw * 0.55 - (i >> 1) * 0.1);
    chromeParts.push(cyl(0.052, 0.052, 0.16, 8, sx, tailS.bottom + 0.13, tailZ - 0.04, Math.PI / 2));
  }

  // ------- feature extras -------
  const f = def.features || {};
  if (f.spoiler && f.spoiler !== 'none') {
    const s = sectionAt(0.10);
    if (f.spoiler === 'lip') {
      paintParts.push(box(s.hw * 1.8, 0.045, 0.20, 0, s.top + 0.03, tailZ + 0.18, -0.16));
    } else {
      const hgt = f.spoiler === 'gtwing' ? 0.34 : 0.20;
      paintParts.push(box(s.hw * 1.85, 0.05, 0.30, 0, s.top + hgt, tailZ + 0.28, -0.12));
      for (const sx of [-1, 1]) darkParts.push(box(0.05, hgt, 0.12, sx * s.hw * 0.72, s.top + hgt * 0.5, tailZ + 0.28));
    }
  }
  if (f.rollcage) {
    const s = sectionAt(0.5);
    for (const sx of [-1, 1]) {
      chromeParts.push(cyl(0.032, 0.032, (cabinTop - s.top) || 0.6, 6, sx * s.hw * 0.85, (cabinTop + s.top) * 0.5, 0));
    }
    chromeParts.push(cyl(0.032, 0.032, s.hw * 1.7, 6, 0, cabinTop, 0, 0, 0, Math.PI / 2));
  }
  if (f.bullbar) {
    chromeParts.push(box(noseS.hw * 1.8, 0.06, 0.05, 0, noseS.bottom + 0.42, noseZ + 0.12));
    for (const sx of [-1, 0, 1]) chromeParts.push(box(0.05, 0.52, 0.05, sx * noseS.hw * 0.8, noseS.bottom + 0.30, noseZ + 0.12));
  }
  if (f.snorkel) darkParts.push(box(0.08, H * 0.72, 0.08, sectionAt(0.72).hw - 0.02, 0.1, (0.72 - 0.5) * L));
  if (f.roofRack) {
    const s = sectionAt(0.5);
    chromeParts.push(box(s.hw * 1.7, 0.04, (cab ? (cab.end - cab.start) * L * 0.8 : L * 0.3), 0, cabinTop + 0.07, 0));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) chromeParts.push(box(0.03, 0.09, 0.03, sx * s.hw * 0.8, cabinTop + 0.045, sz * L * 0.12));
  }
  if (f.ladder) {
    chromeParts.push(box(0.10, 0.10, L * 0.86, 0, cabinTop + 0.16, -L * 0.02));
    for (let i = 0; i < 9; i++) chromeParts.push(box(0.44, 0.03, 0.03, 0, cabinTop + 0.16, -L * 0.42 + i * (L * 0.86 / 8)));
  }
  if (f.cementMixer) {
    const drum = new THREE.CylinderGeometry(W * 0.42, W * 0.30, L * 0.42, 14);
    drum.rotateX(Math.PI * 0.42);
    drum.translate(0, H * 0.12, -L * 0.18);
    paintParts.push(drum);
  }
  if (f.plow) {
    darkParts.push(box(W * 1.25, 0.6, 0.08, 0, -H * 0.26, noseZ + 0.3, -0.4));
  }
  if (f.turret) {
    chromeParts.push(cyl(0.22, 0.26, 0.34, 10, 0, cabinTop + 0.16, -L * 0.05));
    chromeParts.push(cyl(0.06, 0.06, L * 0.5, 8, 0, cabinTop + 0.26, L * 0.16, Math.PI / 2));
  }
  if (def.body.bedStart !== undefined && (kind === 'pickup' || kind === 'truck')) {
    // tray walls
    const bz0 = (def.body.bedStart - 0.5) * L, bz1 = tailZ;
    const s = sectionAt(def.body.bedStart + 0.02);
    const bedLen = Math.abs(bz1 - bz0);
    const wallH = Math.max(0.22, H * 0.22);
    for (const sx of [-1, 1]) paintParts.push(box(0.05, wallH, bedLen, sx * (s.hw - 0.03), s.top + wallH * 0.5, (bz0 + bz1) * 0.5));
    paintParts.push(box(s.hw * 2, wallH, 0.05, 0, s.top + wallH * 0.5, bz1 + 0.03));
    darkParts.push(box(s.hw * 1.94, 0.03, bedLen, 0, s.top + 0.01, (bz0 + bz1) * 0.5));
  }
  if (f.taxiSign) {
    const sign = box(0.52, 0.15, 0.20, 0, cabinTop + 0.09, 0.1);
    const signMesh = new THREE.Mesh(sign, materials.registerEmissive(
      new THREE.MeshStandardMaterial({ color: 0x201800, emissive: 0xffc93c, emissiveIntensity: 0.4, roughness: 0.5 }), 2.4, 0.4));
    group.add(signMesh);
  }
  // police / emergency lightbar
  const sirenMeshes = [];
  if (f.lightbar) {
    const s = sectionAt(0.52);
    const barY = cabinTop + 0.08;
    darkParts.push(box(s.hw * 1.5, 0.05, 0.20, 0, barY - 0.03, 0.05));
    const segs = 6;
    for (let i = 0; i < segs; i++) {
      const isRed = i < segs / 2;
      const lx = (i - (segs - 1) / 2) * (s.hw * 1.36 / segs);
      const m = new THREE.Mesh(box(s.hw * 1.2 / segs, 0.085, 0.16, lx, barY + 0.04, 0.05),
        new THREE.MeshStandardMaterial({
          color: 0x0a0a0a, emissive: isRed ? 0xff1414 : 0x2244ff,
          emissiveIntensity: 0.3, roughness: 0.35,
        }));
      m.userData.sirenSide = isRed ? 0 : 1;
      group.add(m);
      sirenMeshes.push(m);
    }
  }

  // ------- livery stripes -------
  if (def.paint.livery && def.paint.livery !== 'none') {
    const liveryColor = def.paint.livery === 'police' ? 0xf2f4f8
      : def.paint.livery === 'taxi' ? 0x101014
      : def.paint.livery === 'ambulance' ? 0xff3322
      : def.paint.livery === 'fire' ? 0xf8f8f8
      : def.paint.livery === 'military' ? 0x4a5136
      : def.paint.livery === 'checker' ? 0x101014 : 0xffffff;
    const lm = materials.carPaint(liveryColor, { metallic: 0.2, roughness: 0.42 });
    const s = sectionAt(0.5);
    const stripeGeo = [];
    if (def.paint.livery === 'racing' || def.paint.livery === 'stripe') {
      stripeGeo.push(box(0.16, 0.012, L * 0.94, -0.14, s.top + 0.005, 0));
      stripeGeo.push(box(0.16, 0.012, L * 0.94, 0.14, s.top + 0.005, 0));
    } else if (def.paint.livery === 'checker') {
      for (let i = 0; i < 10; i++) {
        stripeGeo.push(box(0.02 + s.hw * 0.04, 0.20, L * 0.09, (i % 2 ? 1 : -1) * (s.hw + 0.005), s.top - 0.16, -L * 0.42 + i * L * 0.09));
      }
    } else {
      for (const sx of [-1, 1]) stripeGeo.push(box(0.018, H * 0.2, L * 0.62, sx * (s.hw + 0.004), s.top - H * 0.16, -L * 0.02));
      stripeGeo.push(box(s.hw * 1.5, 0.014, L * 0.2, 0, s.top + 0.004, L * 0.22));
    }
    const g = mergeGeometries(stripeGeo, false);
    if (g) { const m = new THREE.Mesh(g, lm); m.castShadow = false; group.add(m); }
  }

  // ------- interior (visible through the glass) -------
  if (kind !== 'bike' && kind !== 'boat' && cab) {
    const s = sectionAt((cab.start + cab.end) * 0.5);
    const seatZ = ((cab.start + cab.end) * 0.5 - 0.5) * L;
    darkParts.push(box(s.hw * 1.7, 0.04, (cab.end - cab.start) * L * 0.9, 0, s.top - 0.02, seatZ));
    for (const sx of [-1, 1]) {
      darkParts.push(box(0.40, 0.09, 0.42, sx * s.hw * 0.45, s.top + 0.08, seatZ - 0.1));
      darkParts.push(box(0.40, 0.44, 0.09, sx * s.hw * 0.45, s.top + 0.30, seatZ - 0.30));
    }
    darkParts.push(box(s.hw * 1.6, 0.16, 0.28, 0, s.top + 0.20, (cab.end - 0.5) * L - 0.1));
    chromeParts.push(cyl(0.14, 0.14, 0.03, 12, -s.hw * 0.45, s.top + 0.30, (cab.end - 0.5) * L - 0.22, Math.PI * 0.42));
  }

  // ------- merge the static extras -------
  const addMerged = (parts, mat, name, shadow = true) => {
    if (!parts.length) return null;
    const g = mergeGeometries(parts, false);
    if (!g) return null;
    const m = new THREE.Mesh(g, mat);
    m.name = name;
    m.castShadow = shadow;
    m.receiveShadow = shadow;
    group.add(m);
    return m;
  };
  addMerged(paintParts, def.paint.twoTone ? paint2 : paint, 'paintParts');
  addMerged(darkParts, materials.plasticBlack, 'darkParts');
  addMerged(chromeParts, materials.chrome, 'chromeParts');

  // ------- wheels -------
  const wheelMeshes = [];
  const protoWheel = buildWheel(def, materials, rng);
  for (let i = 0; i < wheelPositions.length; i++) {
    const w = protoWheel.clone(true);
    const wp = wheelPositions[i];
    const s = sectionAt(clamp(wp.z / L + 0.5, 0, 1));
    w.position.set(wp.x, s.bottom + wr * 0.1, wp.z);
    if (wp.x > 0) w.rotation.y = Math.PI;
    w.name = 'wheel' + i;
    group.add(w);
    wheelMeshes.push(w);
  }

  // ------- boats & bikes get their own flourishes -------
  if (kind === 'boat') {
    const deck = box(W * 0.9, 0.05, L * 0.6, 0, H * 0.1, -L * 0.05);
    const m = new THREE.Mesh(deck, materials.wood);
    group.add(m);
    const windscreen = new THREE.Mesh(box(W * 0.6, 0.28, 0.04, 0, H * 0.26, L * 0.12, -0.32), materials.carGlass);
    group.add(windscreen);
  }
  if (kind === 'bike') {
    const s = sectionAt(0.5);
    chromeParts.length = 0;
    const bars = box(0.62, 0.04, 0.04, 0, s.top + 0.28, axleZ[0] - 0.1);
    const fork = box(0.07, 0.55, 0.07, 0, s.top + 0.02, axleZ[0] - 0.03, 0.22);
    const seat = box(0.26, 0.10, 0.52, 0, s.top + 0.10, -L * 0.1);
    const bm = mergeGeometries([bars, fork], false);
    if (bm) group.add(new THREE.Mesh(bm, materials.chrome));
    group.add(new THREE.Mesh(seat, materials.leather));
  }

  group.userData.def = def;
  return {
    group, bodyMesh, wheelMeshes, restPositions,
    lights: { head: headLights, tail: tailLights, brake: brakeLights, reverse: reverseLights, indicator: indicators },
    headMaterial: headMat, tailMaterial: tailMat,
    sirenMeshes, paint, colorHex,
    cabinTop, wheelPositions,
  };
}

/** Push the hull vertices inward where the car has been hit. */
export function applyDeformation(bodyMesh, restPositions, deformation, def) {
  const pos = bodyMesh.geometry.attributes.position;
  const arr = pos.array;
  const L = def.length, W = def.width, H = def.height;
  let changed = false;
  for (let i = 0; i < arr.length; i += 3) {
    const rx = restPositions[i], ry = restPositions[i + 1], rz = restPositions[i + 2];
    const idx = (rz > 0 ? 4 : 0) + (rx > 0 ? 2 : 0) + (ry > 0 ? 1 : 0);
    const d = deformation[idx];
    if (d < 0.002) {
      if (arr[i] !== rx || arr[i + 1] !== ry || arr[i + 2] !== rz) { arr[i] = rx; arr[i + 1] = ry; arr[i + 2] = rz; changed = true; }
      continue;
    }
    // Crumple toward the centre, with a deterministic wobble so panels buckle rather than shrink.
    const wob = Math.sin(rx * 31.7 + ry * 17.3 + rz * 23.1) * 0.5 + 0.5;
    const k = d * (0.55 + wob * 0.9);
    arr[i] = rx - (rx / (W * 0.5)) * k * 0.42;
    arr[i + 1] = ry - (ry / (H * 0.5)) * k * 0.30;
    arr[i + 2] = rz - (rz / (L * 0.5)) * k;
    changed = true;
  }
  if (changed) {
    pos.needsUpdate = true;
    bodyMesh.geometry.computeVertexNormals();
  }
}
