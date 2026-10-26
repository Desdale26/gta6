/*
 * holdup-models.js — the props a shop hold-up puts in the scene.
 *
 *   VH.HoldupModels.cashBag()     canvas bank bag the clerk stuffs the notes in
 *   VH.HoldupModels.tillDrawer()  the till's cash drawer
 *   VH.HoldupModels.safe()        a heavy floor safe for the back corner
 *   VH.HoldupModels.cctv()        a box camera on an angled wall bracket
 *   VH.HoldupModels.notes()       a small wad of banknotes
 *   VH.HoldupModels.preload()     builds all the shared geometry up front
 *
 * Every call returns a new THREE.Group. The geometry and materials behind it
 * are built the first time they are needed and shared by every copy after
 * that, so only transforms, visibility and morph weights belong to one prop.
 * Metres, +Y up, and where a prop has a front it faces +Z. Origins:
 *
 *   cashBag     bottom centre (a full bag stands on its flat base)
 *   tillDrawer  centre of the back edge, on the drawer's base: closed it
 *               fills x -0.19..0.19, y 0..0.08, z 0..0.32 and opens along +Z
 *   safe        on the floor, centre of the back face: the body fills
 *               x -0.31..0.31, y 0..0.72, z 0..0.56 (the door and its fittings
 *               stand a few centimetres proud of that)
 *   cctv        centre of the wall plate, on the wall (z = 0): the arm
 *               reaches out along +Z and the camera looks along +Z, pitched down
 *   notes       centred on the wad
 *
 * The hooks that change a prop's state live on group.userData (listed with
 * each prop below), next to { id, tris, drawCalls }. Parts are drawn with
 * the weapons' Kit (VH.WeaponModels.Kit), merged into one geometry per
 * material and coloured with vertex colours, so each prop is a handful of
 * draw calls. The money bag's skin is the exception: it carries a morph
 * target (flat → stuffed) so one shared geometry can bulge per copy.
 *
 * Solid parts cast shadows but none receive them: these props live inside
 * the shops, whose rooms are lit like the street and never sit in the
 * roof's shadow (world.js 'interior'), and a prop that took the roof's
 * shadow would go dark in a bright room.
 */
(function () {
  'use strict';

  const VH = window.VH;
  const { clamp, hash2 } = VH.math;

  // Kit material keys. The Kit only keeps the weapon material names; the
  // part after '@' splits one off into its own mesh, so it gets our material.
  const CLOTH = 'poly@cloth';
  const PLASTIC = 'poly@plastic';
  const PAINT = 'lacquer@paint';
  const METAL = 'metal';
  const CHROME = 'chrome';
  const GLASS = 'glass';
  const MAT_OF = {};
  MAT_OF[CLOTH] = 'cloth';
  MAT_OF[PLASTIC] = 'plastic';
  MAT_OF[PAINT] = 'paint';
  MAT_OF[METAL] = 'metal';
  MAT_OF[CHROME] = 'chrome';
  MAT_OF[GLASS] = 'glass';

  // sRGB hex palette.
  const P = {
    canvas: 0xd3c39b,
    canvasDark: 0xa08c63,
    binding: 0x5f5441,
    mouth: 0x241c14,
    print: 0x2e5a3c,
    brass: 0xc9a14a,
    brassDark: 0x8a6a2a,
    zipPull: 0xc8ccd1,
    note: 0x84b078,
    note2: 0x6e9a63,
    note3: 0x9cbf84,
    note4: 0x6aa58f,
    noteDark: 0x3f6a3e,
    notePrint: 0xb9d6a6,
    paper: 0xeee5c8,
    paperStripe: 0xb98a2e,
    black: 0x1b1c1f,
    black2: 0x26282c,
    groove: 0x0c0d0e,
    tray: 0x80858c,
    trayDark: 0x5f646b,
    silver: 0xbfc3c8,
    gold: 0xd2a64a,
    copper: 0xb87a4b,
    steel: 0x585e66,
    steel2: 0x656b73,
    steelDark: 0x222428,
    liner: 0x858a90,
    shelf: 0x989ea4,
    hinge: 0x2c2f33,
    chrome: 0xd4d7db,
    white: 0xe8eae7,
    white2: 0xf2f3f0,
    grey: 0x9aa0a6,
    greyDark: 0x666b71,
    bezel: 0x2a2d31,
    hood: 0x16171a,
    lens: 0x1b2a3c,
    lensGlint: 0x3c5878,
    hole: 0x060708,
    shard: 0x6a7c90,
  };

  // ------------------------------------------------------------ materials
  let MATS = null;

  function materials() {
    if (MATS) return MATS;
    const std = (o) => new THREE.MeshStandardMaterial(Object.assign({ vertexColors: true }, o));
    MATS = {
      // Canvas, binding tape and paper money.
      cloth: std({ metalness: 0, roughness: 0.92 }),
      // The till drawer's moulding, the camera housing and bracket.
      plastic: std({ metalness: 0, roughness: 0.5 }),
      // The safe's painted steel.
      paint: std({ metalness: 0.3, roughness: 0.5 }),
      // Brass, coins, the zip and hinges.
      metal: std({ metalness: 0.85, roughness: 0.34 }),
      // Polished handles, bolts and the lock barrel.
      chrome: std({ metalness: 1, roughness: 0.16 }),
      // The camera lens.
      glass: std({ metalness: 0.3, roughness: 0.06 }),
      // The camera's tally light (swapped per camera, never edited).
      ledOn: new THREE.MeshStandardMaterial({ color: 0xa00800, emissive: 0xff1200, emissiveIntensity: 1.8, roughness: 0.3 }),
      ledOff: new THREE.MeshStandardMaterial({ color: 0x3a0f0c, roughness: 0.35 }),
    };
    for (const k in MATS) MATS[k].name = 'holdup-' + k;
    return MATS;
  }

  // ------------------------------------------------------- shared parts
  const parts = new Map();

  /**
   * Draw a part once with a Kit and cache it: { geos: {kitKey: geometry}, tris }.
   * centre: move it so its bounding box is centred on the origin.
   */
  function part(key, draw, centre) {
    let e = parts.get(key);
    if (e) return e;
    if (!VH.WeaponModels || !VH.WeaponModels.Kit) throw new Error('holdup-models.js needs weapons-models.js loaded first');
    const kit = new VH.WeaponModels.Kit();
    draw(kit);
    const geos = kit.finish();
    if (centre) {
      const box = new THREE.Box3();
      for (const k in geos) box.union(geos[k].boundingBox);
      const c = box.getCenter(new THREE.Vector3());
      for (const k in geos) {
        geos[k].translate(-c.x, -c.y, -c.z);
        geos[k].computeBoundingBox();
        geos[k].computeBoundingSphere();
      }
    }
    let tris = 0;
    for (const k in geos) tris += geos[k].index.count / 3;
    e = { geos, tris };
    parts.set(key, e);
    return e;
  }

  function meshFor(key, kitKey, geo) {
    const mat = MAT_OF[kitKey] || 'plastic';
    const mesh = new THREE.Mesh(geo, materials()[mat]);
    mesh.name = key + ':' + mat;
    mesh.castShadow = mat !== 'glass';
    mesh.receiveShadow = false; // see the header: they live indoors
    return mesh;
  }

  /** Add one mesh per material of a cached part to `parent`. */
  function addPart(parent, key, draw, centre) {
    const e = part(key, draw, centre);
    for (const k in e.geos) parent.add(meshFor(key, k, e.geos[k]));
    return parent;
  }

  /** A cached part as a single object: its one mesh, or a group of them. */
  function partObject(key, draw, centre) {
    const e = part(key, draw, centre);
    const keys = Object.keys(e.geos);
    if (keys.length === 1) {
      const mesh = meshFor(key, keys[0], e.geos[keys[0]]);
      mesh.name = key;
      return mesh;
    }
    const g = new THREE.Group();
    g.name = key;
    for (const k of keys) g.add(meshFor(key, k, e.geos[k]));
    return g;
  }

  function newGroup(id) {
    const g = new THREE.Group();
    g.name = 'holdup:' + id;
    g.userData.id = id;
    return g;
  }

  /** Count the triangles and meshes in `g` (hidden ones too) into its userData. */
  function tally(g) {
    let tris = 0;
    let draws = 0;
    g.traverse((o) => {
      if (!o.isMesh) return;
      const geo = o.geometry;
      tris += (geo.index ? geo.index.count : geo.attributes.position.count) / 3;
      draws++;
    });
    g.userData.tris = tris;
    g.userData.drawCalls = draws;
    return g;
  }

  // ------------------------------------------------------------ cash bag
  // A natural canvas bank bag with bound top edge and a brass zip, printed
  // on both faces with a green "$" in a ring. Its skin is one geometry with
  // two shapes: flat and empty (0.285 m tall, a few soft creases) and
  // stuffed (0.32 m tall, a pillowy belly on a flat oval base, gathered in
  // toward the zip, a touch lumpy). The zip is open toward one end, where
  // notes poke out once the bag is nearly full.
  //
  //   userData.setFill(0..1)   bulge it (the notes show above ~0.62)
  //   userData.fill            the last fill set
  //   userData.height          how tall it is now (the top of the zip)

  const BAG_H = [0.285, 0.32];
  const BAG_COLS = 12;
  const BAG_ROWS = [0, 0.035, 0.09, 0.18, 0.3, 0.44, 0.58, 0.71, 0.82, 0.91, 0.97, 1];
  const BAG_SLUMP = [0, 0.008]; // a full bag leans a little to one side at the top
  const ZIP_OPEN = 0.2; // the zip runs closed from the left end to here (in u)

  /** Half the bag's width at height v (0..1) for shape f (0 flat, 1 full). */
  function bagHalfWidth(f, v) {
    if (!f) return 0.15 * (v < 0.1 ? 0.95 + 0.05 * Math.sin((v / 0.1) * Math.PI / 2) : 1);
    return 0.126 + 0.02 * Math.sin(Math.PI * v * 0.95) - 0.034 * v * v * v;
  }

  /** Half its thickness at (u, v): nothing at the side seams, next to nothing under the zip. */
  function bagHalfThick(f, u, v) {
    const e = 1 - u * u;
    if (!f) return 0.0045 * Math.sqrt(e) * (1 - v * v * v * v);
    const prof = v < 0.3
      ? 0.78 + 0.22 * Math.sin((v / 0.3) * Math.PI / 2)
      : Math.pow(Math.cos(((v - 0.3) / 0.7) * Math.PI / 2), 0.55);
    const lumps = 1 + 0.06 * Math.sin(u * 5.3 + 1) * Math.sin(v * 7.9 + 0.5);
    // A narrow gusset under the zip, so the top is not a knife edge.
    const gusset = 0.007 * Math.sqrt(e) * clamp((v - 0.6) / 0.4, 0, 1);
    return 0.098 * prof * Math.pow(e, 0.42) * lumps + gusset;
  }

  /** A point on the skin: side +1 the front (+Z) panel, -1 the back; u -1..1 across, v 0..1 up. */
  function bagPoint(f, side, u, v, out) {
    let x = u * bagHalfWidth(f, v) + BAG_SLUMP[f] * v * v;
    let z = side * bagHalfThick(f, u, v);
    // An empty bag hangs with a few soft creases (both panels together).
    if (!f) z += 0.004 * (1 - u * u) * (1 - v) * Math.sin(u * 5.1 + v * 3.7 + 0.6) * Math.sin(v * 8.3 - u * 2.2);
    return out.set(x, v * BAG_H[f], z);
  }

  /** Collects triangles in both shapes at once and builds a morphing geometry. */
  class Skin {
    constructor() {
      this.p0 = [];
      this.p1 = [];
      this.col = [];
      this.idx = [];
      this.n = 0;
    }

    vert(a, b, c) {
      this.p0.push(a.x, a.y, a.z);
      this.p1.push(b.x, b.y, b.z);
      this.col.push(c[0], c[1], c[2]);
      return this.n++;
    }

    /** Merge `geo` (disposed), placed in each shape by place(vertex, f). */
    merge(geo, hex, place) {
      const pos = geo.attributes.position;
      const c = VH.col(hex);
      const a = new THREE.Vector3();
      const b = new THREE.Vector3();
      const base = this.n;
      for (let i = 0; i < pos.count; i++) {
        a.fromBufferAttribute(pos, i);
        b.copy(a);
        place(a, 0);
        place(b, 1);
        this.vert(a, b, c);
      }
      const ix = geo.index.array;
      for (let i = 0; i < ix.length; i++) this.idx.push(base + ix[i]);
      geo.dispose();
    }

    build() {
      const shape = (p) => {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
        g.setIndex(this.idx);
        g.computeVertexNormals();
        return g;
      };
      const g = shape(this.p0);
      const full = shape(this.p1);
      g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
      g.morphAttributes.position = [full.attributes.position];
      g.morphAttributes.normal = [full.attributes.normal];
      g.computeBoundingBox();
      g.computeBoundingSphere();
      return g;
    }
  }

  // The print, as quads in print space (metres, the middle of the ring at
  // the origin, x to the right as you read it, corners counter-clockwise).
  function printQuads() {
    const quads = [];
    // The ring.
    const seg = 28;
    const r0 = 0.062;
    const r1 = 0.071;
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2;
      const a1 = ((i + 1) / seg) * Math.PI * 2;
      quads.push([
        [Math.cos(a0) * r0, Math.sin(a0) * r0], [Math.cos(a0) * r1, Math.sin(a0) * r1],
        [Math.cos(a1) * r1, Math.sin(a1) * r1], [Math.cos(a1) * r0, Math.sin(a1) * r0],
      ]);
    }
    // The S: over the top arc anticlockwise, then round the bottom arc clockwise.
    const a = 0.0205;
    const w = 0.0105;
    const line = [];
    const steps = 13;
    for (let i = 0; i <= steps; i++) {
      const t = 0.3 + (i / steps) * (Math.PI * 1.5 - 0.3);
      line.push([Math.cos(t) * a, a + Math.sin(t) * a]);
    }
    for (let i = 1; i <= steps; i++) {
      const t = Math.PI / 2 - (i / steps) * (Math.PI * 1.5 - 0.3);
      line.push([Math.cos(t) * a, -a + Math.sin(t) * a]);
    }
    const side = line.map((p, i) => {
      const q0 = line[Math.max(0, i - 1)];
      const q1 = line[Math.min(line.length - 1, i + 1)];
      let tx = q1[0] - q0[0];
      let ty = q1[1] - q0[1];
      const len = Math.hypot(tx, ty) || 1;
      tx /= len;
      ty /= len;
      // [left, right] of the direction of travel.
      return [[p[0] - ty * w / 2, p[1] + tx * w / 2], [p[0] + ty * w / 2, p[1] - tx * w / 2]];
    });
    for (let i = 0; i < line.length - 1; i++) quads.push([side[i][1], side[i + 1][1], side[i + 1][0], side[i][0]]);
    // The bar through it.
    const bx = 0.0036;
    const by = 2 * a + 0.012;
    for (let i = 0; i < 6; i++) {
      const y0 = -by + (i / 6) * 2 * by;
      const y1 = -by + ((i + 1) / 6) * 2 * by;
      quads.push([[-bx, y0], [bx, y0], [bx, y1], [-bx, y1]]);
    }
    return quads;
  }

  let bagGeos = null;

  function buildBag() {
    if (bagGeos) return bagGeos;
    const skin = new Skin();
    const canvas = VH.col(P.canvas);
    const dark = VH.col(P.canvasDark);
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const nx = BAG_COLS;
    const ny = BAG_ROWS.length - 1;
    const us = [];
    for (let i = 0; i <= nx; i++) us.push(-Math.cos((i / nx) * Math.PI)); // closer together near the seams
    // Front and back panels.
    const bottom = { 1: [], '-1': [] };
    for (const side of [1, -1]) {
      const base = skin.n;
      for (let j = 0; j <= ny; j++) {
        const v = BAG_ROWS[j];
        for (let i = 0; i <= nx; i++) {
          const u = us[i];
          bagPoint(0, side, u, v, a);
          bagPoint(1, side, u, v, b);
          const grime = clamp(0.32 * Math.pow(1 - v, 4) + 0.22 * Math.pow(u, 6), 0, 1);
          skin.vert(a, b, VH.colMix(canvas, dark, grime));
          if (j === 0) bottom[side].push([a.clone(), b.clone()]);
        }
      }
      for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) {
          const p00 = base + j * (nx + 1) + i;
          const p10 = p00 + 1;
          const p01 = p00 + nx + 1;
          const p11 = p01 + 1;
          if (side > 0) skin.idx.push(p00, p10, p11, p00, p11, p01);
          else skin.idx.push(p00, p11, p10, p00, p01, p11);
        }
      }
    }
    // The flat base between the panels' bottom rows (faces down).
    const baseCol = VH.colMix(canvas, dark, 0.4);
    for (let i = 0; i < nx; i++) {
      const f0 = bottom[1][i];
      const f1 = bottom[1][i + 1];
      const k0 = bottom[-1][i];
      const k1 = bottom[-1][i + 1];
      const iF0 = skin.vert(f0[0], f0[1], baseCol);
      const iF1 = skin.vert(f1[0], f1[1], baseCol);
      const iB0 = skin.vert(k0[0], k0[1], baseCol);
      const iB1 = skin.vert(k1[0], k1[1], baseCol);
      skin.idx.push(iF0, iB1, iF1, iF0, iB0, iB1);
    }
    // The print on both faces, lifted off the skin along its normal. Read
    // from behind, the back one is mirrored in x, which also keeps its
    // triangles facing out.
    const quads = printQuads();
    const ink = VH.col(P.print);
    const pu = new THREE.Vector3();
    const pv = new THREE.Vector3();
    const q = new THREE.Vector3();
    const lift = [0.0012, 0.0018];
    const onSkin = (f, side, px, py, out) => {
      const u = (side * px) / 0.142;
      const v = (py + 0.14) / 0.3;
      bagPoint(f, side, u, v, out);
      bagPoint(f, side, u + 0.01, v, pu).sub(bagPoint(f, side, u - 0.01, v, q));
      bagPoint(f, side, u, v + 0.01, pv).sub(bagPoint(f, side, u, v - 0.01, q));
      const n = pu.cross(pv).normalize().multiplyScalar(side);
      return out.addScaledVector(n, lift[f]);
    };
    for (const side of [1, -1]) {
      for (const quad of quads) {
        const ids = quad.map((p) => skin.vert(onSkin(0, side, p[0], p[1], a), onSkin(1, side, p[0], p[1], b), ink));
        skin.idx.push(ids[0], ids[1], ids[2], ids[0], ids[2], ids[3]);
      }
    }
    // The zip, riding the top seam. along: x in units of the top half-width;
    // at(u0): a fixed-size part centred at u0 along the zip.
    const topW = [bagHalfWidth(0, 1), bagHalfWidth(1, 1)];
    const along = (v, f) => v.set(v.x * topW[f] + BAG_SLUMP[f], v.y + BAG_H[f], v.z);
    const at = (u0) => (v, f) => v.set(v.x + u0 * topW[f] + BAG_SLUMP[f], v.y + BAG_H[f], v.z);
    const box = (x0, y0, z0, x1, y1, z1) => {
      const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
      return g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    };
    const O = ZIP_OPEN;
    // Binding tape: whole where the zip is shut, two edges either side of
    // the dark mouth where it is open.
    skin.merge(box(-0.975, -0.003, -0.0105, O, 0.008, 0.0105), P.binding, along);
    for (const s of [-1, 1]) skin.merge(box(O, -0.003, s > 0 ? 0.0045 : -0.0105, 0.975, 0.008, s > 0 ? 0.0105 : -0.0045), P.binding, along);
    skin.merge(box(O, -0.006, -0.0045, 0.96, 0.005, 0.0045), P.mouth, along);

    const zip = new Skin();
    zip.merge(box(-0.95, 0.007, -0.0032, O, 0.0105, 0.0032), P.brass, along);
    for (const s of [-1, 1]) zip.merge(box(O, 0.007, s > 0 ? 0.0045 : -0.0068, 0.94, 0.0102, s > 0 ? 0.0068 : -0.0045), P.brass, along);
    // The slider and its pull, lying flat along the shut part.
    zip.merge(box(-0.008, 0.007, -0.012, 0.008, 0.0155, 0.012), P.zipPull, at(O));
    zip.merge(box(-0.036, 0.0145, -0.0045, -0.004, 0.0175, 0.0045), P.zipPull, at(O));
    zip.merge(box(-0.043, 0.0135, -0.0065, -0.034, 0.0185, 0.0065), P.zipPull, at(O));
    bagGeos = { skin: skin.build(), zip: zip.build(), topW };
    return bagGeos;
  }

  // Notes poking out of the open end of the zip: drawn standing on y = 0
  // (the seam), their bottoms hidden in the bag.
  function drawBagNotes(k) {
    // h: how far each sticks up above the seam.
    const notes = [
      { x: -0.014, rz: 0.26, rx: 0.1, h: 0.04, hex: P.note },
      { x: 0.002, rz: -0.05, rx: -0.12, h: 0.05, hex: P.note3 },
      { x: 0.016, rz: -0.28, rx: 0.06, h: 0.042, hex: P.note2 },
      { x: -0.002, rz: 0.1, rx: 0.2, h: 0.034, hex: P.note4 },
    ];
    for (const n of notes) {
      const cy = n.h - 0.03;
      k.boxC(CLOTH, n.hex, [n.x, cy, 0], [0.074, 0.06, 0.0016], 0, [n.rx, 0, n.rz]);
      k.boxC(CLOTH, P.notePrint, [n.x, cy + 0.008, 0], [0.026, 0.026, 0.0022], 0, [n.rx, 0, n.rz]);
    }
  }

  function cashBag() {
    const geos = buildBag();
    const M = materials();
    const g = newGroup('cashBag');
    const body = new THREE.Mesh(geos.skin, M.cloth);
    body.name = 'cashBag:skin';
    const zip = new THREE.Mesh(geos.zip, M.metal);
    zip.name = 'cashBag:zip';
    for (const m of [body, zip]) {
      m.castShadow = true;
      g.add(m);
    }
    const tuft = partObject('cashBagNotes', drawBagNotes);
    tuft.name = 'cashBag:notes';
    g.add(tuft);
    const ud = g.userData;
    ud.setFill = (fill) => {
      fill = clamp(+fill || 0, 0, 1);
      const m = fill + 0.3 * fill * (1 - fill); // rounds out early, then fills
      body.morphTargetInfluences[0] = m;
      zip.morphTargetInfluences[0] = m;
      const h = BAG_H[0] + (BAG_H[1] - BAG_H[0]) * m;
      const s = clamp((fill - 0.62) / 0.38, 0, 1);
      tuft.visible = s > 0;
      tuft.scale.set(1, Math.max(0.001, s), 1);
      tuft.position.set(0.52 * (geos.topW[0] + (geos.topW[1] - geos.topW[0]) * m) + BAG_SLUMP[1] * m, h, 0);
      ud.fill = fill;
      ud.height = h;
    };
    ud.setFill(0);
    return tally(g);
  }

  // ---------------------------------------------------------- till drawer
  // Black moulded drawer with a rounded front, a finger groove and a lock;
  // inside a grey insert with five note bins at the back (each with a
  // spring clip) and five coin cups at the front.
  //
  //   userData.setOpen(0..1)   slide it out (0.24 m at 1)
  //   userData.setCash(0..1)   how full it is (0 hides the money)
  //   userData.tray            the sliding part

  const DRAWER = { w: 0.19, h: 0.08, d: 0.32, slide: 0.24, floor: 0.012 };
  const BIN_W = (2 * 0.182) / 5;
  const binX = (i) => -0.182 + BIN_W * (i + 0.5);

  function drawDrawerTray(k) {
    const W = DRAWER.w;
    // The moulding: floor, sides, back and the front.
    k.box(PLASTIC, P.black, [-W, 0, 0], [W, 0.008, 0.3], 0);
    for (const s of [-1, 1]) k.box(PLASTIC, P.black, [s > 0 ? W - 0.008 : -W, 0.008, 0], [s > 0 ? W : -W + 0.008, 0.07, 0.3], 0);
    k.box(PLASTIC, P.black, [-W + 0.008, 0.008, 0], [W - 0.008, 0.07, 0.008], 0);
    k.box(PLASTIC, P.black2, [-W, 0, 0.298], [W, DRAWER.h, DRAWER.d], 0.005, { seg: 1 });
    k.box(PLASTIC, P.groove, [-0.085, 0.009, DRAWER.d - 0.0004], [0.085, 0.021, DRAWER.d + 0.0006], 0);
    // The grey insert: floor, bin dividers, the cross wall and cup dividers.
    k.box(PLASTIC, P.trayDark, [-0.182, 0.008, 0.008], [0.182, DRAWER.floor, 0.298], 0);
    for (let i = 1; i < 5; i++) {
      const x = -0.182 + BIN_W * i;
      k.box(PLASTIC, P.tray, [x - 0.002, DRAWER.floor, 0.008], [x + 0.002, 0.06, 0.186], 0);
      k.box(PLASTIC, P.tray, [x - 0.002, DRAWER.floor, 0.19], [x + 0.002, 0.038, 0.298], 0);
    }
    k.box(PLASTIC, P.tray, [-0.182, DRAWER.floor, 0.186], [0.182, 0.046, 0.192], 0);
    // Note clips: a hinge bar along the back, a wire arm and a roller per bin.
    k.cylX(PLASTIC, P.trayDark, 0.064, 0.014, -0.18, 0.18, 0.0042, 6);
    for (let i = 0; i < 5; i++) {
      const x = binX(i);
      k.rod(PLASTIC, P.tray, [x, 0.064, 0.014], [x, 0.059, 0.148], 0.0026, 5);
      k.cylX(PLASTIC, P.tray, 0.058, 0.15, x - 0.02, x + 0.02, 0.0052, 6);
    }
  }

  // A chrome lock barrel on the drawer front (its own part: chrome).
  function drawDrawerLock(k) {
    k.cylZ(CHROME, P.chrome, 0.148, 0.05, DRAWER.d - 0.001, DRAWER.d + 0.004, 0.0085, 0.0085, 10);
    k.box(CHROME, P.groove, [0.1465, 0.045, DRAWER.d + 0.0035], [0.1495, 0.055, DRAWER.d + 0.0046], 0);
  }

  // Stacks of notes in the bins, standing on y = 0 (the insert's floor), so
  // scaling y empties them.
  function drawDrawerNotes(k) {
    const h = [0.042, 0.036, 0.04, 0.03, 0.026];
    const hex = [P.note, P.note4, P.note3, P.note2, P.note];
    for (let i = 0; i < 5; i++) {
      const x = binX(i);
      const ox = (hash2(i, 3) - 0.5) * 0.004;
      k.box(CLOTH, hex[i], [x - 0.031 + ox, 0, 0.016], [x + 0.031 + ox, h[i] - 0.003, 0.178], 0);
      // The top few notes sit a little askew.
      k.boxC(CLOTH, hex[i], [x + ox, h[i] - 0.0015, 0.097], [0.062, 0.003, 0.162], 0, [0, (hash2(i, 7) - 0.5) * 0.06, 0]);
      k.boxC(CLOTH, P.notePrint, [x + ox, h[i] + 0.0002, 0.097], [0.03, 0.0012, 0.05], 0, [0, (hash2(i, 7) - 0.5) * 0.06, 0]);
    }
  }

  // Coins in the cups: a short pile each and a loose coin or two on top.
  function drawDrawerCoins(k) {
    const kinds = [
      { r: 0.0125, h: 0.008, hex: P.silver },
      { r: 0.011, h: 0.012, hex: P.gold },
      { r: 0.0135, h: 0.006, hex: P.silver },
      { r: 0.0098, h: 0.01, hex: P.copper },
      { r: 0.012, h: 0.007, hex: P.gold },
    ];
    for (let i = 0; i < 5; i++) {
      const c = kinds[i];
      const x = binX(i) + (hash2(i, 13) - 0.5) * 0.012;
      const z = 0.235 + (hash2(i, 17) - 0.5) * 0.02;
      k.cylY(METAL, c.hex, x, z, 0, c.h, c.r, c.r, 9);
      const lx = binX(i) + (hash2(i, 19) - 0.5) * 0.03;
      const lz = 0.268 + (hash2(i, 23) - 0.5) * 0.016;
      k.put(METAL, new THREE.CylinderGeometry(c.r, c.r, 0.0022, 9), c.hex, [lx, c.h * 0.6, lz], [0.35 * (hash2(i, 29) - 0.5), 0, 0.5 * (hash2(i, 31) - 0.5)]);
      if (i % 2 === 0) k.put(METAL, new THREE.CylinderGeometry(c.r, c.r, 0.0022, 9), c.hex, [x + 0.006, c.h + 0.0012, z - 0.004], [0.08, 0, -0.06]);
    }
  }

  function tillDrawer() {
    const g = newGroup('tillDrawer');
    const tray = new THREE.Group();
    tray.name = 'tray';
    g.add(tray);
    addPart(tray, 'drawerTray', drawDrawerTray);
    addPart(tray, 'drawerLock', drawDrawerLock);
    const notes = partObject('drawerNotes', drawDrawerNotes);
    const coins = partObject('drawerCoins', drawDrawerCoins);
    notes.position.y = DRAWER.floor;
    coins.position.y = DRAWER.floor;
    tray.add(notes, coins);
    const ud = g.userData;
    ud.tray = tray;
    ud.setOpen = (t) => {
      ud.open = clamp(+t || 0, 0, 1);
      tray.position.z = DRAWER.slide * ud.open;
    };
    ud.setCash = (c) => {
      c = clamp(+c || 0, 0, 1);
      ud.cash = c;
      notes.visible = coins.visible = c > 0.01;
      notes.scale.y = Math.max(0.05, c);
      coins.scale.y = 0.4 + 0.6 * c;
    };
    ud.setOpen(0);
    ud.setCash(1);
    return tally(g);
  }

  // ----------------------------------------------------------------- safe
  // A squat dark-grey floor safe on a recessed plinth. The door hangs on two
  // barrel hinges on the left (seen from the front) and carries a brass
  // combination dial in a dark bezel, a chrome three-spoke handle below it,
  // a blank brass plate, and three chrome bolts on its inside edge. Inside:
  // a pale lining, one shelf and banded bundles of cash.
  //
  //   userData.setOpen(0..1)   swing the door open (to 100 degrees at 1)
  //   userData.setCash(bool)   show or hide the cash inside
  //   userData.dial            the dial mesh: spin it with dial.rotation.z
  //   userData.handle          the handle mesh: turn it with handle.rotation.z
  //   userData.door            the door's pivot (rotation.y)

  const SAFE = { w: 0.31, h: 0.72, d: 0.56, t: 0.055, open: (100 * Math.PI) / 180 };
  const SAFE_IN = { x: 0.255, y0: 0.095, y1: 0.665 }; // the opening
  const SAFE_DOOR = { x: -0.25, z: 0.575, w: 0.5, y0: 0.1, y1: 0.66, t: 0.07 }; // pivot and slab
  const SAFE_DIAL = [0.25, 0.47, 0.006]; // door frame
  const SAFE_HANDLE = [0.25, 0.27, 0.006];

  function drawSafeBody(k) {
    const W = SAFE.w;
    const D = SAFE.d;
    const I = SAFE_IN;
    // Plinth, sides, top, bottom and back.
    k.box(PAINT, P.steelDark, [-W + 0.02, 0, 0.02], [W - 0.02, 0.04, D - 0.02], 0);
    for (const s of [-1, 1]) k.box(PAINT, P.steel, [s > 0 ? I.x : -W, 0.04, 0], [s > 0 ? W : -I.x, SAFE.h, D], 0);
    k.box(PAINT, P.steel, [-I.x, I.y1, 0], [I.x, SAFE.h, D], 0);
    k.box(PAINT, P.steel, [-I.x, 0.04, 0], [I.x, I.y0, D], 0);
    k.box(PAINT, P.steel, [-I.x, I.y0, 0], [I.x, I.y1, SAFE.t], 0);
    // The lining, stopping short of the door.
    const L = 0.004;
    const z1 = 0.5;
    k.box(PAINT, P.liner, [-I.x, I.y0, SAFE.t], [I.x, I.y1, SAFE.t + L], 0);
    for (const s of [-1, 1]) k.box(PAINT, P.liner, [s > 0 ? I.x - L : -I.x, I.y0, SAFE.t], [s > 0 ? I.x : -I.x + L, I.y1, z1], 0);
    k.box(PAINT, P.liner, [-I.x, I.y1 - L, SAFE.t], [I.x, I.y1, z1], 0);
    k.box(PAINT, P.liner, [-I.x, I.y0, SAFE.t], [I.x, I.y0 + L, z1], 0);
    // The shelf.
    k.box(PAINT, P.shelf, [-I.x + L, 0.37, SAFE.t + L], [I.x - L, 0.385, 0.48], 0);
    // Barrel hinges on the door's pivot line.
    for (const y of [0.15, 0.53]) k.cylY(METAL, P.hinge, SAFE_DOOR.x, SAFE_DOOR.z, y, y + 0.08, 0.016, 0.016, 10);
  }

  // The door, drawn in its pivot's frame: x 0..0.5 from the hinge line,
  // z -0.07..0 behind the front face.
  function drawSafeDoor(k) {
    const D = SAFE_DOOR;
    k.box(PAINT, P.steel, [0, D.y0, -D.t], [D.w, D.y1, 0], 0.008, { seg: 1 });
    // A raised front panel and the pale plate on the inside face.
    k.box(PAINT, P.steel2, [0.035, D.y0 + 0.035, -0.01], [D.w - 0.035, D.y1 - 0.035, 0.006], 0);
    k.box(PAINT, P.liner, [0.04, D.y0 + 0.04, -D.t - 0.004], [D.w - 0.04, D.y1 - 0.04, -D.t + 0.002], 0);
    // The dial's bezel with its index mark, and a blank brass plate.
    const [dx, dy, dz] = SAFE_DIAL;
    k.latheZ(METAL, P.bezel, [[0.051, dz], [0.061, dz], [0.061, dz + 0.005], [0.053, dz + 0.009], [0.051, dz + 0.009]], 16, dx, dy);
    k.box(METAL, P.brass, [dx - 0.004, dy + 0.053, dz + 0.007], [dx + 0.004, dy + 0.062, dz + 0.011], 0);
    k.box(METAL, P.brass, [D.w / 2 - 0.065, 0.585, 0.004], [D.w / 2 + 0.065, 0.612, 0.009], 0);
    k.box(METAL, P.brassDark, [D.w / 2 - 0.05, 0.596, 0.0088], [D.w / 2 + 0.05, 0.601, 0.0094], 0);
    // The handle's hub plate.
    k.cylZ(METAL, P.bezel, SAFE_HANDLE[0], SAFE_HANDLE[1], 0.004, 0.01, 0.03, 0.03, 12);
  }

  // Bolts out of the door's latch edge: a part of their own, shown only
  // once the door is open (shut, they would glint through the gap).
  function drawSafeBolts(k) {
    for (const y of [0.2, 0.38, 0.56]) k.cylX(CHROME, P.chrome, y, -0.04, SAFE_DOOR.w - 0.02, SAFE_DOOR.w + 0.022, 0.011, 8);
  }

  // The dial, centred on its spindle and facing +Z: a brass skirt, a knurled
  // grip and tick marks that turn with it.
  function drawSafeDial(k) {
    k.cylZ(METAL, P.brass, 0, 0, 0, 0.012, 0.05, 0.047, 16);
    k.cylZ(METAL, P.brassDark, 0, 0, 0.012, 0.016, 0.03, 0.028, 12);
    k.cylZ(METAL, P.brass, 0, 0, 0.016, 0.032, 0.022, 0.02, 12);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const big = i % 3 === 0;
      const r = big ? 0.038 : 0.04;
      k.boxC(METAL, P.steelDark, [Math.sin(a) * r, Math.cos(a) * r, 0.0122], [0.003, big ? 0.014 : 0.009, 0.0016], 0, [0, 0, -a]);
    }
  }

  // The three-spoke handle, centred on its spindle and facing +Z.
  function drawSafeHandle(k) {
    k.cylZ(CHROME, P.chrome, 0, 0, 0, 0.028, 0.019, 0.016, 12);
    for (let i = 0; i < 3; i++) {
      const a = Math.PI / 2 + (i / 3) * Math.PI * 2;
      const x = Math.cos(a) * 0.072;
      const y = Math.sin(a) * 0.072;
      k.rod(CHROME, P.chrome, [Math.cos(a) * 0.012, Math.sin(a) * 0.012, 0.02], [x, y, 0.026], 0.0065, 6);
      k.put(CHROME, new THREE.SphereGeometry(0.0125, 6, 4), P.chrome, [x, y, 0.026]);
    }
  }

  // Bundles of cash on the floor of the safe and on the shelf.
  function drawSafeCash(k) {
    const bundle = (x, y, z, ry, hex) => {
      k.boxC(CLOTH, hex, [x, y + 0.015, z], [0.15, 0.03, 0.068], 0, [0, ry, 0]);
      k.boxC(CLOTH, P.paper, [x, y + 0.015, z], [0.032, 0.0312, 0.0696], 0, [0, ry, 0]);
    };
    const stack = (x, y, z, n, seed) => {
      for (let i = 0; i < n; i++) {
        const ry = (hash2(seed, i) - 0.5) * 0.16;
        const ox = (hash2(seed + 7, i) - 0.5) * 0.008;
        bundle(x + ox, y + i * 0.03, z, ry, i % 2 ? P.note2 : P.note);
      }
    };
    const floor = SAFE_IN.y0 + 0.004;
    stack(-0.085, floor, 0.33, 3, 1);
    stack(0.088, floor, 0.35, 2, 2);
    stack(0.02, floor, 0.2, 2, 3);
    stack(-0.08, 0.385, 0.3, 2, 4);
    stack(0.09, 0.385, 0.27, 1, 5);
  }

  function safe() {
    const g = newGroup('safe');
    addPart(g, 'safeBody', drawSafeBody);
    const cash = partObject('safeCash', drawSafeCash);
    g.add(cash);
    const door = new THREE.Group();
    door.name = 'door';
    door.position.set(SAFE_DOOR.x, 0, SAFE_DOOR.z);
    g.add(door);
    addPart(door, 'safeDoor', drawSafeDoor);
    const bolts = partObject('safeBolts', drawSafeBolts);
    door.add(bolts);
    const dial = partObject('safeDial', drawSafeDial);
    dial.position.fromArray(SAFE_DIAL);
    const handle = partObject('safeHandle', drawSafeHandle);
    handle.position.fromArray(SAFE_HANDLE);
    door.add(dial, handle);
    const ud = g.userData;
    ud.door = door;
    ud.dial = dial;
    ud.handle = handle;
    ud.setOpen = (t) => {
      ud.open = clamp(+t || 0, 0, 1);
      door.rotation.y = -SAFE.open * ud.open;
      bolts.visible = ud.open > 0.01;
    };
    ud.setCash = (on) => {
      ud.cash = !!on;
      cash.visible = ud.cash;
    };
    ud.setOpen(0);
    ud.setCash(true);
    return tally(g);
  }

  // ----------------------------------------------------------------- cctv
  // A white box camera with a sun hood, a dark lens hood and a red tally
  // light, hung under the end of an angled grey arm on a wall plate. The
  // arm swivels on the plate (yaw) and the camera tilts on the arm's knuckle
  // (pitch, down is positive). Drawn life size, then the whole rig is scaled
  // up a little: about 0.3 m from the wall and 0.2 m deep below the plate.
  //
  //   userData.aim(yaw, pitch)   point it (defaults 0 and 0.35 rad down)
  //   userData.setBroken(bool)   droop, shattered lens, light out
  //   userData.update(dt)        blink the light
  //   userData.lens              the lens mesh (also the child named 'lens'):
  //                              getWorldPosition() for hit tests
  //   userData.head, .swivel     the tilt and swivel pivots

  const CCTV_JOINT = [0, -0.035, 0.135]; // the knuckle, in the swivel's frame
  const CCTV_LENS = [0, -0.052, 0.093]; // the lens, in the head's frame
  const CCTV_PITCH = 0.35;
  const CCTV_SCALE = 1.3; // a touch over life size, so it reads from across the shop
  let cctvCount = 0;
  let ledGeo = null;

  function drawCctvPlate(k) {
    k.box(PLASTIC, P.grey, [-0.04, -0.05, 0], [0.04, 0.05, 0.012], 0.004, { seg: 1 });
    for (const y of [-0.037, 0.037]) k.cylZ(PLASTIC, P.greyDark, 0, y, 0.011, 0.0145, 0.0045, 0.0045, 6);
  }

  function drawCctvArm(k) {
    const [jx, jy, jz] = CCTV_JOINT;
    k.cylZ(PLASTIC, P.greyDark, 0, 0, 0.011, 0.026, 0.017, 0.017, 10);
    const len = Math.hypot(jy, jz - 0.018);
    const tilt = Math.atan2(-jy, jz - 0.018);
    k.boxC(PLASTIC, P.grey, [jx, jy / 2, (jz + 0.018) / 2], [0.02, 0.016, len], 0, [tilt, 0, 0]);
    k.cylX(PLASTIC, P.greyDark, jy, jz, -0.016, 0.016, 0.0135, 10);
  }

  // The camera in the head's frame: the knuckle at the origin, the housing
  // hanging below it, looking along +Z.
  function drawCctvHead(k) {
    k.box(PLASTIC, P.grey, [-0.009, -0.024, -0.012], [0.009, 0.004, 0.012], 0);
    k.boxC(PLASTIC, P.white, [0, -0.052, 0], [0.084, 0.058, 0.17], 0.008, null, 1);
    // Sun hood: a top plate running out past the face, with side lips.
    k.box(PLASTIC, P.white2, [-0.051, -0.0235, -0.075], [0.051, -0.0175, 0.118], 0);
    for (const s of [-1, 1]) k.box(PLASTIC, P.white2, [s > 0 ? 0.047 : -0.051, -0.04, 0.025], [s > 0 ? 0.051 : -0.047, -0.0235, 0.118], 0);
    // Dark front panel, lens hood and the back cap.
    k.box(PLASTIC, P.bezel, [-0.039, -0.078, 0.083], [0.039, -0.026, 0.088], 0);
    const z = 0.086;
    k.latheZ(PLASTIC, P.hood, [[0.0262, z], [0.0268, z + 0.026], [0.0215, z + 0.026], [0.0205, z + 0.006]], 14, CCTV_LENS[0], CCTV_LENS[1]);
    k.box(PLASTIC, P.greyDark, [-0.036, -0.076, -0.09], [0.036, -0.028, -0.083], 0);
  }

  function lensPart(k, broken) {
    // Faces +Z at the origin.
    if (!broken) {
      k.disc(GLASS, P.lens, 0, 0, 0, 0.0208, 14);
      k.disc(GLASS, P.lensGlint, 0.004, 0.004, 0.0008, 0.0075, 10);
      return;
    }
    k.disc(GLASS, P.hole, 0, 0, 0, 0.0208, 14);
    // Shards of glass still stuck round the rim.
    const n = 8;
    const pos = [];
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2 + 0.2;
      const a1 = a0 + (Math.PI * 2) / n * (0.55 + 0.4 * hash2(i, 41));
      const am = (a0 + a1) / 2 + (hash2(i, 43) - 0.5) * 0.3;
      const r = 0.0205;
      const rin = r * (0.25 + 0.5 * hash2(i, 47));
      pos.push(Math.cos(a0) * r, Math.sin(a0) * r, 0.0008, Math.cos(a1) * r, Math.sin(a1) * r, 0.0008, Math.cos(am) * rin, Math.sin(am) * rin, 0.0008);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    k.put(GLASS, g, P.shard);
  }

  function cctv() {
    const g = newGroup('cctv');
    const M = materials();
    const rig = new THREE.Group();
    rig.name = 'rig';
    rig.scale.setScalar(CCTV_SCALE);
    g.add(rig);
    addPart(rig, 'cctvPlate', drawCctvPlate);
    const swivel = new THREE.Group();
    swivel.name = 'swivel';
    rig.add(swivel);
    addPart(swivel, 'cctvArm', drawCctvArm);
    const head = new THREE.Group();
    head.name = 'head';
    head.position.fromArray(CCTV_JOINT);
    swivel.add(head);
    addPart(head, 'cctvHead', drawCctvHead);
    const whole = part('cctvLens', (k) => lensPart(k, false)).geos[GLASS];
    const smashed = part('cctvLensBroken', (k) => lensPart(k, true)).geos[GLASS];
    const lens = new THREE.Mesh(whole, M.glass);
    lens.name = 'lens';
    lens.position.fromArray(CCTV_LENS);
    if (!ledGeo) ledGeo = new THREE.BoxGeometry(0.0075, 0.0075, 0.004);
    const led = new THREE.Mesh(ledGeo, M.ledOn);
    led.name = 'led';
    led.position.set(-0.0345, -0.071, 0.089); // bottom corner of the face, clear of the lens hood
    head.add(lens, led);

    const ud = g.userData;
    ud.lens = lens;
    ud.head = head;
    ud.swivel = swivel;
    ud.broken = false;
    let pitch = CCTV_PITCH;
    let t = (cctvCount++ * 0.37) % 1.3;
    let lit = true;
    const light = (on) => {
      if (on === lit) return;
      lit = on;
      led.material = on ? M.ledOn : M.ledOff;
    };
    ud.aim = (yaw, p) => {
      swivel.rotation.y = yaw || 0;
      pitch = p === undefined ? CCTV_PITCH : p;
      if (!ud.broken) head.rotation.set(pitch, 0, 0);
    };
    ud.setBroken = (b) => {
      ud.broken = !!b;
      if (ud.broken) {
        // Hanging off its knuckle, twisted, the lens smashed and the light out.
        head.rotation.set(1.25, 0, 0.35);
        lens.geometry = smashed;
        light(false);
      } else {
        head.rotation.set(pitch, 0, 0);
        lens.geometry = whole;
        light(true);
      }
    };
    ud.update = (dt) => {
      if (ud.broken) return;
      t = (t + (dt || 0)) % 1.3;
      light(t < 0.75);
    };
    ud.aim(0, CCTV_PITCH);
    return tally(g);
  }

  // ---------------------------------------------------------------- notes
  // Four notes, a little fanned, the top one printed, with a paper band.
  function drawWad(k) {
    const L = 0.166;
    const W = 0.072;
    const t = 0.0024;
    const n = 4;
    let ry = 0;
    let ox = 0;
    for (let i = 0; i < n; i++) {
      ry = (hash2(i, 5) - 0.5) * 0.16;
      ox = (hash2(i, 9) - 0.5) * 0.01;
      k.boxC(CLOTH, i % 2 ? P.note : P.note2, [ox, i * t + t / 2, 0], [L, t, W], 0, [0, ry, 0]);
    }
    // Printing on the top note follows its skew.
    const top = n * t;
    const print = (cx, cz, sx, sz, hex) => {
      const px = ox + cx * Math.cos(ry) + cz * Math.sin(ry);
      const pz = -cx * Math.sin(ry) + cz * Math.cos(ry);
      k.boxC(CLOTH, hex, [px, top + 0.0005, pz], [sx, 0.001, sz], 0, [0, ry, 0]);
    };
    print(0, -0.03, 0.15, 0.004, P.noteDark);
    print(0, 0.03, 0.15, 0.004, P.noteDark);
    print(-0.05, 0, 0.03, 0.03, P.notePrint);
    print(0.055, 0.012, 0.03, 0.008, P.notePrint);
    k.put(CLOTH, new THREE.CylinderGeometry(0.014, 0.014, 0.0014, 12), P.noteDark, [ox + 0.03 * Math.cos(ry), top + 0.0007, -0.03 * Math.sin(ry)]);
    k.box(CLOTH, P.paper, [-0.018, -0.0012, -W / 2 - 0.006], [0.018, top + 0.0012, W / 2 + 0.006], 0);
    k.box(CLOTH, P.paperStripe, [-0.005, -0.0016, -W / 2 - 0.0064], [0.005, top + 0.0016, W / 2 + 0.0064], 0);
  }

  function notes() {
    const g = newGroup('notes');
    addPart(g, 'notes', drawWad, true);
    return tally(g);
  }

  VH.HoldupModels = {
    cashBag,
    tillDrawer,
    safe,
    cctv,
    notes,
    /** Build every shared geometry and material now (e.g. behind a loading screen). */
    preload() {
      materials();
      cashBag();
      tillDrawer();
      safe();
      cctv();
      notes();
    },
    /** Shared materials, created on first use. */
    materials,
  };
})();
