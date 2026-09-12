// stunts.js — geometry for trick spots.
//
// Every spot is built from drivable slabs so the vehicle's suspension raycasts find a real
// surface: ramps are one tilted box, loops and pipes are a ring of them, bowls are a dish of
// them. Nothing here is decoration — if you can see it, you can ride it.

/** @returns {{ group, colliders }} colliders are local-space boxes with optional pitch/roll. */
export function buildStuntSpot(THREE, spot, materials, rng, mergeGeometries) {
  const group = new THREE.Group();
  group.name = 'stunt:' + spot.id;
  const colliders = [];
  const slabs = [];
  const accents = [];
  const p = spot.params || {};

  const mainMat = tintClone(materials?.concrete, spot.color ?? 0xb4b0a8)
    || new THREE.MeshStandardMaterial({ color: spot.color ?? 0xb4b0a8, roughness: 0.85 });
  const accentMat = new THREE.MeshStandardMaterial({
    color: 0x101018, emissive: spot.accent ?? 0x22e3ff, emissiveIntensity: 1.6, roughness: 0.4,
  });
  if (materials?.registerEmissive) materials.registerEmissive(accentMat, 2.6, 0.9);

  const slab = (w, t, l, x, y, z, pitch = 0, yaw = 0, roll = 0) => {
    const g = new THREE.BoxGeometry(w, t, l);
    if (roll) g.rotateZ(roll);
    if (pitch) g.rotateX(pitch);
    if (yaw) g.rotateY(yaw);
    g.translate(x, y, z);
    slabs.push(g);
    colliders.push({ x, y, z, hw: w / 2, hh: t / 2, hd: l / 2, pitch, yaw, roll });
  };

  const stripe = (w, l, x, y, z, pitch = 0, yaw = 0) => {
    const g = new THREE.BoxGeometry(w, 0.06, l);
    if (pitch) g.rotateX(pitch);
    if (yaw) g.rotateY(yaw);
    g.translate(x, y + 0.2, z);
    accents.push(g);
  };

  switch (spot.kind) {
    case 'ramp':
    case 'megaramp':
    case 'jumppad': {
      const w = p.width ?? 9, len = p.length ?? 22, h = p.height ?? 6;
      const angle = p.angleDeg !== undefined ? (p.angleDeg * Math.PI) / 180 : Math.atan2(h, len);
      const run = Math.hypot(len, h);
      slab(w, 0.5, run, 0, h / 2, 0, -angle);
      // side rails + lit edge
      for (const sx of [-1, 1]) {
        const g = new THREE.BoxGeometry(0.3, 0.7, run);
        g.rotateX(-angle);
        g.translate(sx * (w / 2 + 0.1), h / 2 + 0.4, 0);
        slabs.push(g);
      }
      stripe(w * 0.14, run * 0.96, 0, h / 2 + 0.22, 0, -angle);
      if (spot.kind === 'megaramp') {
        // A landing ramp on the far side gives you something to aim at.
        const gap = (p.gapLength ?? len * 1.4);
        const la = ((p.landingAngle ?? 16) * Math.PI) / 180;
        const lh = Math.tan(la) * len * 0.6;
        slab(w * 1.3, 0.5, run, 0, lh / 2, len / 2 + gap + run / 2, la);
      }
      break;
    }

    case 'loop': {
      const r = p.radius ?? 12;
      const w = p.width ?? 9;
      const segs = p.segments ?? 24;
      const segLen = (2 * Math.PI * r) / segs * 1.06;
      for (let i = 0; i < segs; i++) {
        const a = (i / segs) * Math.PI * 2 - Math.PI / 2;
        const cy = r + Math.sin(a) * r;
        const cz = Math.cos(a) * r;
        slab(w, 0.45, segLen, 0, cy, cz, -a + Math.PI / 2);
      }
      // approach ramp so you can actually enter it
      slab(w, 0.45, 14, 0, 0.3, -r - 8, -0.06);
      for (const sx of [-1, 1]) {
        for (let i = 0; i < segs; i += 2) {
          const a = (i / segs) * Math.PI * 2 - Math.PI / 2;
          const g = new THREE.BoxGeometry(0.25, 0.6, segLen);
          g.rotateX(-a + Math.PI / 2);
          g.translate(sx * (w / 2 + 0.2), r + Math.sin(a) * r, Math.cos(a) * r);
          accents.push(g);
        }
      }
      break;
    }

    case 'corkscrew': {
      const len = p.length ?? 34, w = p.width ?? 9, turns = p.turns ?? 1;
      const segs = 22;
      for (let i = 0; i < segs; i++) {
        const t = i / (segs - 1);
        const roll = t * Math.PI * 2 * turns;
        slab(w, 0.4, len / segs * 1.1, 0, 1.2 + Math.sin(roll) * 0.4, -len / 2 + t * len, 0, 0, roll);
      }
      break;
    }

    case 'spiral': {
      const r = p.radius ?? 16, turns = p.turns ?? 3, h = p.height ?? 22, w = p.width ?? 7;
      const segs = p.segments ?? 60;
      const segLen = (2 * Math.PI * r * turns) / segs * 1.08;
      for (let i = 0; i < segs; i++) {
        const t = i / segs;
        const a = t * Math.PI * 2 * turns;
        slab(w, 0.4, segLen, Math.cos(a) * r, h * (1 - t), Math.sin(a) * r, 0, -a + Math.PI / 2);
        if (i % 4 === 0) {
          const g = new THREE.BoxGeometry(0.25, 0.9, segLen);
          g.rotateY(-a + Math.PI / 2);
          g.translate(Math.cos(a) * (r + w / 2), h * (1 - t) + 0.5, Math.sin(a) * (r + w / 2));
          accents.push(g);
        }
      }
      break;
    }

    case 'halfpipe':
    case 'pipe': {
      const r = p.radius ?? 7.5;
      const len = p.length ?? 30;
      const segs = p.segments ?? 16;
      const full = spot.kind === 'pipe';
      const sweep = full ? Math.PI * 2 : Math.PI;
      const segW = (sweep * r) / segs * 1.08;
      for (let i = 0; i < segs; i++) {
        const a = Math.PI + (i / (segs - 1)) * sweep;
        slab(segW, 0.4, len, Math.cos(a) * r, r + Math.sin(a) * r, 0, 0, 0, -a - Math.PI / 2);
      }
      break;
    }

    case 'quarterpipe': {
      const r = p.radius ?? 9, w = p.width ?? 16, segs = p.segments ?? 14;
      const segLen = (Math.PI * 0.5 * r) / segs * 1.1;
      for (let i = 0; i < segs; i++) {
        const a = (i / (segs - 1)) * Math.PI * 0.5;
        slab(w, 0.4, segLen, 0, r - Math.cos(a) * r, -Math.sin(a) * r, a);
      }
      break;
    }

    case 'bowl': {
      const r = p.radius ?? 16, h = p.height ?? 4.4, segs = p.segments ?? 20;
      const rings = 4;
      for (let ring = 0; ring < rings; ring++) {
        const rt = (ring + 1) / rings;
        const rr = r * rt;
        const ry = h * rt * rt;
        const segLen = (2 * Math.PI * rr) / segs * 1.12;
        const pitch = Math.atan2(h * 2 * rt / rings, r / rings);
        for (let i = 0; i < segs; i++) {
          const a = (i / segs) * Math.PI * 2;
          slab(r / rings * 1.15, 0.35, segLen, Math.cos(a) * rr, ry, Math.sin(a) * rr, 0, -a, pitch);
        }
      }
      slab(r * 0.5, 0.35, r * 0.5, 0, 0, 0);
      break;
    }

    case 'gap': {
      const gl = p.gapLength ?? 20, w = p.width ?? 10, h = p.height ?? 4;
      const angle = ((p.angleDeg ?? 20) * Math.PI) / 180;
      const run = 12;
      slab(w, 0.5, run, 0, h / 2, -gl / 2 - run / 2, -angle);
      const la = ((p.landingAngle ?? 12) * Math.PI) / 180;
      slab(w * 1.2, 0.5, run * 1.3, 0, h / 2, gl / 2 + run * 0.65, la);
      stripe(w * 0.9, 0.5, 0, 0.1, -gl / 2);
      stripe(w * 0.9, 0.5, 0, 0.1, gl / 2);
      break;
    }

    case 'wallride': {
      const len = p.length ?? 28, h = p.height ?? 6, w = p.width ?? 5;
      const angle = ((p.angleDeg ?? 70) * Math.PI) / 180;
      // A steeply banked wall you can carry speed along.
      slab(w, 0.5, len, Math.cos(angle) * h * 0.5, h * 0.5, 0, 0, 0, -(Math.PI / 2 - angle));
      slab(6, 0.4, 10, 0, 0.2, -len / 2 - 5, -0.12);
      break;
    }

    case 'seesaw': {
      const len = p.length ?? 18, w = p.width ?? 6, h = p.height ?? 2.4;
      const a = Math.atan2(h, len / 2);
      slab(w, 0.4, len / 2 * 1.05, 0, h / 2, -len / 4, -a);
      slab(w, 0.4, len / 2 * 1.05, 0, h / 2, len / 4, a);
      break;
    }

    case 'hoop': {
      const r = p.radius ?? 5.5, tiers = p.tiers ?? 3, gap = p.gapLength ?? 22, h = p.height ?? 7;
      for (let i = 0; i < tiers; i++) {
        const z = -gap / 2 + (i / Math.max(1, tiers - 1)) * gap;
        const torus = new THREE.TorusGeometry(r, 0.28, 6, 18);
        torus.translate(0, h, z);
        accents.push(torus);
      }
      slab(8, 0.5, 16, 0, 2.4, -gap / 2 - 14, -0.3);
      break;
    }

    default: {
      slab(p.width ?? 8, 0.5, p.length ?? 16, 0, 1, 0, -0.25);
    }
  }

  const merged = mergeGeometries ? safeMerge(mergeGeometries, slabs) : slabs[0];
  if (merged) {
    const m = new THREE.Mesh(merged, mainMat);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
  }
  const mergedAccent = mergeGeometries ? safeMerge(mergeGeometries, accents) : accents[0];
  if (mergedAccent) {
    const m = new THREE.Mesh(mergedAccent, accentMat);
    m.castShadow = false;
    group.add(m);
  }
  return { group, colliders };
}

function safeMerge(mergeGeometries, list) {
  if (!list.length) return null;
  if (list.length === 1) return list[0];
  try { return mergeGeometries(list, false) || list[0]; }
  catch (e) { return list[0]; }
}

function tintClone(base, colorHex) {
  if (!base) return null;
  const m = base.clone();
  m.color.setHex(colorHex);
  return m;
}
