/*
 * weapons-models-4.js — world pickup models that are not weapons.
 *
 *   VH.WeaponModels.ammoBox(slot)            olive ammo can, a colour band for
 *                                            the slot and a few rounds on the lid
 *   VH.WeaponModels.armorVest()              navy plate carrier
 *   VH.WeaponModels.medkit()                 white first-aid case, green cross
 *   VH.WeaponModels.cashBundle()             banded bundle of banknotes
 *   VH.WeaponModels.pickupColor(kind, slot)  HDR colour for the glowing ring
 *
 * Each model returns a new THREE.Group, centred on its bounding box at the
 * origin, roughly 0.45 m across (they hover and spin over the ring), with
 * userData { id, kind, radius, size, tris, drawCalls }. They are drawn with
 * the weapons' Kit, palette and shared materials, so geometry is built once
 * per model (once per slot for the ammo cans) and shared by every copy.
 * `slot` may also be a weapon id; anything unknown gets the pistol can.
 */
(function () {
  'use strict';

  const VH = window.VH;
  const WM = VH.WeaponModels;
  if (!WM) return;
  const C = WM.C;
  const MAT_ORDER = ['metal', 'poly', 'chrome', 'lacquer', 'glass'];

  // sRGB hex, on top of the weapon palette.
  const P = {
    can: 0x55603a,
    canDark: 0x3a4229,
    stencil: 0xd9d2a8,
    copper: 0xb06a3c,
    shellRed: 0xb3221f,
    shellDark: 0x7a1513,
    grenade: 0x3e4b2d,
    navy: 0x2a3e6c,
    navy2: 0x34497c,
    navyDark: 0x1b2745,
    badge: 0x3d7ad6,
    white: 0xeff1ec,
    seam: 0x9aa3a8,
    cross: 0x1aa556,
    note: 0x84b078,
    note2: 0x6e9a63,
    noteDark: 0x3f6a3e,
    notePrint: 0xb9d6a6,
    paper: 0xeee5c8,
    paperStripe: 0xb98a2e,
  };

  // Ammo can colour band per slot.
  const BAND = {
    pistol: 0xf2cf36,
    smg: 0xf09a1a,
    shotgun: 0xd02c28,
    rifle: 0x3aa848,
    sniper: 0x2c70d4,
    heavy: 0xe8561a,
    thrown: 0x9aa0a6,
  };

  // Ring colours (linear, HDR): ammo by slot, then the other kinds.
  const RING_SLOT = {
    pistol: [2.4, 2.0, 0.35],
    smg: [2.4, 1.35, 0.2],
    shotgun: [2.4, 0.45, 0.4],
    rifle: [0.55, 2.3, 0.55],
    sniper: [0.4, 1.2, 2.5],
    heavy: [2.5, 0.8, 0.18],
    thrown: [1.5, 1.6, 1.75],
  };
  const RING = {
    weapon: [2.5, 1.7, 0.4],
    armor: [0.45, 0.95, 2.5],
    health: [0.35, 2.3, 0.75],
    cash: [1.35, 2.3, 0.45],
  };

  // ------------------------------------------------------------ builder
  const cache = new Map();

  /** Draw once with a Kit, centre on the bounds, cache under `key`. */
  function prepare(key, draw) {
    let e = cache.get(key);
    if (e) return e;
    const kit = new WM.Kit();
    draw(kit);
    const geos = kit.finish();
    const box = new THREE.Box3();
    for (const k in geos) {
      geos[k].computeBoundingBox();
      box.union(geos[k].boundingBox);
    }
    const c = box.getCenter(new THREE.Vector3());
    let tris = 0;
    for (const k in geos) {
      geos[k].translate(-c.x, -c.y, -c.z);
      tris += geos[k].index.count / 3;
    }
    const size = box.getSize(new THREE.Vector3());
    e = { geos, size, radius: size.length() / 2, tris };
    cache.set(key, e);
    return e;
  }

  function make(key, kind, draw) {
    const e = prepare(key, draw);
    const M = WM.materials();
    const g = new THREE.Group();
    g.name = 'pickup:' + key;
    for (const k of MAT_ORDER) {
      if (!e.geos[k]) continue;
      const mesh = new THREE.Mesh(e.geos[k], M[k]);
      mesh.name = key + ':' + k;
      mesh.castShadow = k !== 'glass';
      mesh.receiveShadow = true;
      g.add(mesh);
    }
    g.userData = { id: key, kind, radius: e.radius, size: e.size.clone(), tris: e.tris, drawCalls: g.children.length };
    return g;
  }

  /**
   * Run draw() with every part it puts into `k` moved afterwards by matrix
   * `m`: lets the rounds be drawn at the origin and scaled up onto the lid,
   * and the cash be drawn flat and then tipped.
   */
  function transformed(k, m, draw) {
    const own = Object.prototype.hasOwnProperty.call(k, 'put');
    const put = k.put;
    const local = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const p = new THREE.Vector3();
    const s = new THREE.Vector3();
    k.put = function (mat, geo, hex, pos, rot, scale) {
      e.set(rot ? rot[0] : 0, rot ? rot[1] : 0, rot ? rot[2] : 0);
      q.setFromEuler(e);
      p.set(pos ? pos[0] : 0, pos ? pos[1] : 0, pos ? pos[2] : 0);
      if (typeof scale === 'number') s.set(scale, scale, scale);
      else s.set(scale ? scale[0] : 1, scale ? scale[1] : 1, scale ? scale[2] : 1);
      geo.applyMatrix4(local.compose(p, q, s).premultiply(m));
      return put.call(k, mat, geo, hex);
    };
    try {
      draw();
    } finally {
      if (own) k.put = put;
      else delete k.put;
    }
  }

  /** Matrix that moves to `pos` and scales by `s` (rotation `rx` about X, optional). */
  function placeAt(pos, s, rx) {
    return new THREE.Matrix4().compose(
      new THREE.Vector3(pos[0], pos[1], pos[2]),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rx || 0, 0, 0)),
      new THREE.Vector3(s, s, s));
  }

  // ---------------------------------------------------------- the rounds
  // Each stands upright with its base at (x, 0, z), true to life in size;
  // drawAmmo scales them up so they read from across the street.

  // Pistol round: straight brass case, round-nosed copper bullet.
  function pistolRound(k, x, z) {
    k.cylY('chrome', C.gold, x, z, 0, 0.046, 0.0128, 0.0128, 10);
    k.latheY('chrome', P.copper, [[0.0124, 0], [0.0126, 0.008], [0.0106, 0.02], [0.0062, 0.0285], [0.0, 0.031]], 10, [x, 0.046, z]);
  }

  /** Bottlenecked rifle-type round. o: { r, len, neck, nose, tip } (tip: hex for a painted tip). */
  function bottleRound(k, x, z, o) {
    const shoulder = o.len + o.r * 0.9;
    const top = shoulder + o.r * 1.1;
    k.latheY('chrome', C.gold, [[0.0, 0], [o.r * 0.96, 0], [o.r, o.r * 0.5], [o.r, o.len], [o.neck, shoulder], [o.neck, top]], 10, [x, 0, z]);
    const n = o.nose;
    const cut = o.tip ? 0.72 : 1;
    const nose = [[o.neck, 0], [o.neck * 0.98, n * 0.22], [o.neck * 0.72, n * 0.56], [o.neck * 0.34, n * 0.86], [0.0, n]];
    k.latheY('chrome', P.copper, nose.filter((p) => p[1] <= n * cut + 1e-6).concat(o.tip ? [[o.neck * 0.52, n * cut], [0.0, n * cut]] : []), 10, [x, top, z]);
    if (o.tip) k.latheY('poly', o.tip, [[o.neck * 0.52, n * cut], [o.neck * 0.34, n * 0.86], [0.0, n]], 10, [x, top, z]);
  }

  // Shotgun shell: brass head and rim, red hull, folded crimp.
  function shell(k, x, z) {
    k.cylY('chrome', C.gold, x, z, 0, 0.0045, 0.0198, 0.0198, 12);
    k.cylY('chrome', C.gold, x, z, 0.0045, 0.022, 0.0184, 0.0184, 12, true);
    k.cylY('lacquer', P.shellRed, x, z, 0.02, 0.08, 0.0176, 0.0176, 12, true);
    k.latheY('lacquer', P.shellDark, [[0.0176, 0], [0.0168, 0.003], [0.0105, 0.0058], [0.0, 0.0066]], 12, [x, 0.08, z]);
  }

  // Rocket nose: olive ogive warhead with a yellow band and a steel fuze.
  function rocketNose(k, x, z) {
    k.latheY('poly', C.olive, [[0.0, 0], [0.04, 0], [0.042, 0.004], [0.042, 0.03], [0.039, 0.066], [0.031, 0.1], [0.019, 0.128], [0.0085, 0.142]], 14, [x, 0, z]);
    k.cylY('poly', C.amber, x, z, 0.034, 0.046, 0.0425, 0.0423, 14, true);
    k.latheY('metal', C.steel, [[0.0085, 0], [0.0085, 0.012], [0.0055, 0.019], [0.0, 0.021]], 10, [x, 0.142, z]);
  }

  // 40 mm grenade round: stubby brass case, olive nose with a yellow band.
  function glRound(k, x, z) {
    k.cylY('chrome', C.gold, x, z, 0, 0.038, 0.0215, 0.0205, 14);
    k.latheY('poly', C.olive, [[0.0198, 0], [0.0198, 0.012], [0.017, 0.026], [0.0105, 0.035], [0.0, 0.037]], 14, [x, 0.038, z]);
    k.cylY('poly', C.amber, x, z, 0.042, 0.046, 0.0199, 0.0199, 14, true);
  }

  // Frag grenade: ribbed olive egg, steel fuse, spoon hugging +X, ring on -Z.
  function grenade(k, x, z) {
    const prof = [[0.0, 0.0]];
    const rows = 8;
    for (let i = 0; i <= rows; i++) {
      const a = -1.3 + (i / rows) * 2.45;
      prof.push([Math.cos(a) * 0.036 * (i % 2 ? 1 : 0.93), 0.041 + Math.sin(a) * 0.041]);
    }
    prof.push([0.0, 0.08]);
    k.latheY('poly', P.grenade, prof, 12, [x, 0, z]);
    k.cylY('metal', C.steel, x, z, 0.074, 0.096, 0.013, 0.0115, 10);
    k.cylY('metal', C.darkSteel, x, z, 0.095, 0.104, 0.0098, 0.0088, 10);
    k.plate('metal', C.steel, [
      [x + 0.006, 0.104], [x + 0.03, 0.1], [x + 0.043, 0.07], [x + 0.043, 0.045], [x + 0.038, 0.02],
      [x + 0.034, 0.021], [x + 0.039, 0.045], [x + 0.039, 0.069], [x + 0.027, 0.096], [x + 0.006, 0.1],
    ], 0.014, 0.0008, null, z, 1);
    k.put('metal', new THREE.TorusGeometry(0.0125, 0.0022, 5, 12), C.stainless, [x - 0.004, 0.088, z - 0.024], [0.3, 0, 0.2]);
  }

  // What each slot's can shows on the lid: draw(k) at the origin, and the
  // scale that makes it read at a distance.
  const LOADS = {
    pistol: { s: 1.4, draw: (k) => { for (let i = 0; i < 3; i++) pistolRound(k, 0, (i - 1) * 0.034); } },
    smg: { s: 1.35, draw: (k) => { for (let i = 0; i < 3; i++) bottleRound(k, 0, (i - 1) * 0.033, { r: 0.0105, len: 0.04, neck: 0.0072, nose: 0.03 }); } },
    shotgun: { s: 1.15, draw: (k) => { for (let i = 0; i < 3; i++) shell(k, i === 1 ? 0.01 : 0, (i - 1) * 0.041); } },
    rifle: { s: 1.2, draw: (k) => { for (let i = 0; i < 3; i++) bottleRound(k, 0, (i - 1) * 0.033, { r: 0.0115, len: 0.064, neck: 0.0072, nose: 0.034 }); } },
    sniper: { s: 1.1, draw: (k) => { for (let i = 0; i < 3; i++) bottleRound(k, 0, (i - 1) * 0.036, { r: 0.0135, len: 0.08, neck: 0.0082, nose: 0.042, tip: C.lens }); } },
    heavy: { s: 1, draw: (k) => { rocketNose(k, 0.002, -0.03); glRound(k, -0.004, 0.062); } },
    thrown: { s: 1.2, draw: (k) => grenade(k, 0, 0) },
  };

  // ------------------------------------------------------------ ammo can
  // 0.44 m olive can: rounded body, painted band, lipped lid with a pressed
  // panel, carry handle folded flat, latch on the +X end, hinges on -X, and
  // the slot's rounds standing on the -X end of the lid.
  function drawAmmo(k, slot) {
    const band = BAND[slot] || BAND.pistol;
    const L = 0.22;
    const W = 0.1;
    const top = 0.242; // lid panel top, where the rounds stand
    // Body, foot and the colour band.
    k.box('poly', P.can, [-L, 0.008, -W], [L, 0.206, W], 0.014, { seg: 1 });
    k.box('poly', P.canDark, [-L + 0.008, 0, -W + 0.008], [L - 0.008, 0.012, W - 0.008], 0);
    k.box('poly', band, [-L - 0.0025, 0.118, -W - 0.0025], [L + 0.0025, 0.166, W + 0.0025], 0.016, { seg: 1 });
    // Stencilled labels on both long sides.
    for (const s of [-1, 1]) {
      k.box('poly', P.stencil, [-0.09, 0.05, s * W - 0.0006], [0.09, 0.088, s * W + 0.0006], 0);
      k.box('poly', P.canDark, [-0.075, 0.064, s * W - 0.0009], [0.035, 0.074, s * W + 0.0009], 0);
    }
    // Lid with an overhanging lip and a pressed panel.
    k.box('poly', P.can, [-L - 0.006, 0.2, -W - 0.006], [L + 0.006, 0.236, W + 0.006], 0.012, { seg: 1 });
    k.box('poly', P.can, [-L + 0.03, 0.226, -W + 0.024], [L - 0.03, top, W - 0.024], 0);
    // Carry handle folded toward +Z: hinge brackets, wire arms, rubber grip.
    for (const s of [-1, 1]) {
      k.box('metal', C.darkSteel, [s * 0.085 - 0.009, top - 0.002, -0.012], [s * 0.085 + 0.009, top + 0.012, 0.008], 0);
      k.rod('metal', C.darkSteel, [s * 0.085, top + 0.006, -0.002], [s * 0.07, top + 0.007, 0.05], 0.0042, 6);
    }
    k.cylX('poly', C.polymer2, top + 0.008, 0.052, -0.074, 0.074, 0.0095, 10);
    // Latch lever on the +X end, hooked over the lid.
    k.box('metal', C.darkSteel, [L - 0.004, 0.135, -0.032], [L + 0.012, 0.226, 0.032], 0, { rot: [0, 0, 0.06] });
    k.cylZ('metal', C.steel, L + 0.008, 0.142, -0.036, 0.036, 0.0065, 0.0065, 6);
    k.box('metal', C.darkSteel, [L - 0.022, 0.226, -0.022], [L + 0.012, 0.24, 0.022], 0);
    // Lid hinges on the -X end.
    for (const s of [-1, 1]) k.cylZ('metal', C.darkSteel, -L - 0.009, 0.205, s * 0.04, s * 0.078, 0.0085, 0.0085, 6);
    // What is inside, standing on the lid.
    const load = LOADS[slot] || LOADS.pistol;
    transformed(k, placeAt([-0.158, top, 0], load.s), () => load.draw(k));
  }

  function ammoBox(slot) {
    if (!BAND[slot]) {
      const def = VH.Data && VH.Data.weaponsById ? VH.Data.weaponsById[slot] : null;
      slot = def && BAND[def.slot] ? def.slot : 'pistol';
    }
    return make('ammo_' + slot, 'ammo', (k) => drawAmmo(k, slot));
  }

  // ---------------------------------------------------------- armour vest
  // Navy plate carrier facing +Z: padded front and back panels, arched
  // shoulder straps, side cummerbund, three magazine pouches and webbing on
  // the front, a silver shield badge on the chest, a pouch and a drag handle
  // on the back.
  function panelOutline(neckY) {
    return [
      [-0.165, -0.235], [0.165, -0.235], [0.185, -0.235, 0.185, -0.215],
      [0.185, 0.06], [0.175, 0.1, 0.13, 0.14], [0.115, 0.205], [0.07, 0.205],
      [0.065, neckY + 0.03, 0.04, neckY, 0.0, neckY], [-0.04, neckY, -0.065, neckY + 0.03, -0.07, 0.205],
      [-0.115, 0.205], [-0.13, 0.14], [-0.175, 0.1, -0.185, 0.06],
      [-0.185, -0.215], [-0.185, -0.235, -0.165, -0.235],
    ];
  }

  function shieldOutline(s) {
    return [
      [-0.037 * s, 0.04 * s], [-0.012 * s, 0.04 * s], [0.0, 0.047 * s], [0.012 * s, 0.04 * s], [0.037 * s, 0.04 * s],
      [0.037 * s, 0.0], [0.035 * s, -0.028 * s, 0.0, -0.046 * s], [-0.035 * s, -0.028 * s, -0.037 * s, 0.0],
    ];
  }

  function drawVest(k) {
    const H = WM._helpers;
    const zf = 0.07;
    const d = 0.045;
    const face = zf + d / 2;
    k.plate('poly', P.navy, panelOutline(0.125), d, 0.011, null, zf, 6);
    k.plate('poly', P.navy, panelOutline(0.165), d, 0.011, null, -zf, 6);
    // Shoulder straps arched over the top, with buckles.
    const arch = [];
    const steps = 8;
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI;
      arch.push([Math.cos(a) * 0.097, 0.19 + Math.sin(a) * 0.06]);
    }
    arch.push([-0.097, 0.17], [-0.056, 0.17]);
    for (let i = steps; i >= 0; i--) {
      const a = (i / steps) * Math.PI;
      arch.push([Math.cos(a) * 0.056, 0.19 + Math.sin(a) * 0.028]);
    }
    arch.push([0.056, 0.17], [0.097, 0.17]);
    for (const s of [-1, 1]) {
      k.side('poly', P.navyDark, arch, 0.046, 0.006, null, s * 0.0925);
      k.box('poly', C.polymer, [s * 0.0925 - 0.02, 0.165, face - 0.002], [s * 0.0925 + 0.02, 0.19, face + 0.008], 0);
    }
    // Cummerbund round the sides, with a buckle each side.
    for (const s of [-1, 1]) {
      k.box('poly', P.navyDark, [s > 0 ? 0.158 : -0.191, -0.205, -0.068], [s > 0 ? 0.191 : -0.158, -0.035, 0.068], 0.009, { seg: 1 });
      k.box('poly', C.polymer, [s > 0 ? 0.187 : -0.195, -0.135, -0.022], [s > 0 ? 0.195 : -0.187, -0.105, 0.022], 0);
    }
    // Front: three magazine pouches with flaps and pull tabs.
    for (let i = 0; i < 3; i++) {
      const x = (i - 1) * 0.106;
      k.box('poly', P.navy2, [x - 0.045, -0.218, face - 0.004], [x + 0.045, -0.088, face + 0.038], 0.01, { seg: 1 });
      k.box('poly', P.navyDark, [x - 0.047, -0.12, face - 0.002], [x + 0.047, -0.082, face + 0.043], 0.009, { seg: 1 });
      k.box('poly', C.polymer, [x - 0.011, -0.132, face + 0.036], [x + 0.011, -0.11, face + 0.046], 0);
    }
    // Webbing rows and the chest patch.
    for (let i = 0; i < 3; i++) {
      const y = -0.07 + i * 0.026;
      k.box('poly', P.navyDark, [-0.165, y, face - 0.002], [0.165, y + 0.013, face + 0.004], 0);
    }
    k.box('poly', P.navyDark, [-0.07, 0.008, face - 0.002], [0.07, 0.105, face + 0.003], 0.004, { seg: 1 });
    // Badge: silver shield, blue field, gold star.
    k.put('chrome', H.frontPlate(shieldOutline(1), 0.008, 0.002, null, 6), C.stainless, [0, 0.058, face + 0.006]);
    k.put('poly', H.frontPlate(shieldOutline(0.76), 0.006, 0.0015, null, 6), P.badge, [0, 0.059, face + 0.0095]);
    const star = [];
    for (let i = 0; i < 10; i++) {
      const a = Math.PI / 2 + (i / 10) * Math.PI * 2;
      const r = i % 2 ? 0.0085 : 0.02;
      star.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    k.put('chrome', H.frontPlate(star, 0.005, 0.001, null, 1), C.gold, [0, 0.06, face + 0.0125]);
    // Back: a flat pouch and a drag handle at the top.
    k.box('poly', P.navy2, [-0.12, -0.205, -face - 0.03], [0.12, -0.04, -face + 0.004], 0.012, { seg: 1 });
    k.box('poly', P.navyDark, [-0.122, -0.07, -face - 0.034], [0.122, -0.035, -face + 0.002], 0.009, { seg: 1 });
    k.plate('poly', P.navyDark, [[-0.045, 0.1], [-0.03, 0.1], [-0.03, 0.128], [0.03, 0.128], [0.03, 0.1], [0.045, 0.1],
      [0.045, 0.135, 0.03, 0.143], [-0.03, 0.143], [-0.045, 0.135, -0.045, 0.1]], 0.012, 0.003, null, -face - 0.004, 4);
  }

  function armorVest() {
    return make('armor', 'armor', drawVest);
  }

  // --------------------------------------------------------------- medkit
  // White clamshell case standing on its edge: grey seam and latches, a
  // handle on top, rubber feet, and a big green cross on both faces.
  function drawMedkit(k) {
    const H = WM._helpers;
    const w = 0.21, h = 0.15, d = 0.072;
    k.box('lacquer', P.white, [-w, -h, -d], [w, h, d], 0.03, { seg: 2 });
    k.box('poly', P.seam, [-w - 0.003, -h - 0.003, -0.007], [w + 0.003, h + 0.003, 0.007], 0.033, { seg: 2 });
    // Latches across the seam on top, hinges below.
    for (const s of [-1, 1]) {
      k.box('poly', C.polymer2, [s * 0.15 - 0.022, h - 0.004, -0.024], [s * 0.15 + 0.022, h + 0.009, 0.024], 0.004, { seg: 1 });
      k.box('poly', C.polymer2, [s * 0.1 - 0.03, -h - 0.007, -0.016], [s * 0.1 + 0.03, -h + 0.004, 0.016], 0);
      for (const t of [-1, 1]) k.box('poly', C.rubber, [s * 0.17 - 0.016, -h - 0.012, t * 0.045 - 0.014], [s * 0.17 + 0.016, -h + 0.004, t * 0.045 + 0.014], 0);
    }
    // Handle: two posts and a moulded grip.
    for (const s of [-1, 1]) k.box('poly', C.polymer2, [s * 0.075 - 0.014, h - 0.004, -0.016], [s * 0.075 + 0.014, h + 0.03, 0.016], 0.005, { seg: 1 });
    k.plate('poly', C.polymer2, [
      [-0.09, h + 0.018], [-0.09, h + 0.04, -0.07, h + 0.054], [0.07, h + 0.054], [0.09, h + 0.054, 0.09, h + 0.018],
      [0.065, h + 0.018], [0.065, h + 0.034], [-0.065, h + 0.034], [-0.065, h + 0.018],
    ], 0.028, 0.008, null, 0, 6);
    // Green cross on both faces.
    const a = 0.034, b = 0.105;
    const cross = [[-a, -b], [a, -b], [a, -a], [b, -a], [b, a], [a, a], [a, b], [-a, b], [-a, a], [-b, a], [-b, -a], [-a, -a]];
    for (const s of [-1, 1]) {
      k.put('poly', H.frontPlate(cross, 0.01, 0.0025, null, 1), P.cross, [0, 0, s * (d + 0.001)], s > 0 ? null : [0, Math.PI, 0]);
    }
  }

  function medkit() {
    return make('health', 'health', drawMedkit);
  }

  // ---------------------------------------------------------- cash bundle
  // A brick of green banknotes (a few loose layers, slightly askew), the top
  // note printed with a border, a medallion and corner marks, and a paper
  // band with a stripe round the middle. Tilted a little so the top reads.
  function drawCash(k) {
    const w = 0.205, d = 0.09;
    const layers = 6;
    const lh = 0.0185;
    for (let i = 0; i < layers; i++) {
      const ox = (VH.math.hash2(i, 3) - 0.5) * 0.012;
      const oz = (VH.math.hash2(i, 7) - 0.5) * 0.006;
      const ry = (VH.math.hash2(i, 11) - 0.5) * 0.035;
      k.boxC('poly', i % 2 ? P.note : P.note2, [ox, i * lh + lh / 2, oz], [w * 2, lh, d * 2], 0.0025, [0, ry, 0], 1);
    }
    // Paper edges: thin pale lines between the layers.
    for (let i = 1; i < layers; i++) {
      k.box('poly', P.notePrint, [-w + 0.004, i * lh - 0.0012, -d + 0.003], [w - 0.004, i * lh + 0.0012, d - 0.003], 0, { rot: [0, (VH.math.hash2(i, 5) - 0.5) * 0.02, 0] });
    }
    const top = layers * lh;
    const ry = (VH.math.hash2(layers - 1, 11) - 0.5) * 0.035;
    const ox = (VH.math.hash2(layers - 1, 3) - 0.5) * 0.012;
    // Printing on the top note (follows the top layer's skew).
    const print = (min, max, hex) => {
      const cx = (min[0] + max[0]) / 2, cz = (min[1] + max[1]) / 2;
      const px = ox + cx * Math.cos(ry) + cz * Math.sin(ry);
      const pz = -cx * Math.sin(ry) + cz * Math.cos(ry);
      k.boxC('poly', hex, [px, top + 0.0006, pz], [max[0] - min[0], 0.0014, max[1] - min[1]], 0, [0, ry, 0]);
    };
    print([-0.19, -0.078], [0.19, -0.068], P.noteDark);
    print([-0.19, 0.068], [0.19, 0.078], P.noteDark);
    print([-0.19, -0.068], [-0.18, 0.068], P.noteDark);
    print([0.18, -0.068], [0.19, 0.068], P.noteDark);
    print([-0.165, 0.035], [-0.135, 0.055], P.noteDark);
    print([0.135, -0.055], [0.165, -0.035], P.noteDark);
    print([0.1, 0.03], [0.17, 0.042], P.notePrint);
    print([-0.17, -0.042], [-0.1, -0.03], P.notePrint);
    const med = new THREE.CylinderGeometry(0.034, 0.034, 0.0016, 18);
    k.put('poly', med, P.notePrint, [ox, top + 0.0006, 0], [0, ry, 0]);
    k.put('poly', new THREE.CylinderGeometry(0.024, 0.024, 0.0022, 18), P.noteDark, [ox, top + 0.0008, 0], [0, ry, 0]);
    // Paper band and its stripe.
    k.box('poly', P.paper, [-0.036, -0.003, -d - 0.006], [0.036, top + 0.003, d + 0.006], 0.003, { seg: 1 });
    k.box('poly', P.paperStripe, [-0.01, -0.0035, -d - 0.0065], [0.01, top + 0.0035, d + 0.0065], 0.002, { seg: 1 });
  }

  function cashBundle() {
    // Drawn flat, then tipped 28 degrees about its long axis.
    return make('cash', 'cash', (k) => transformed(k, placeAt([0, 0, 0], 1, -0.5), () => drawCash(k)));
  }

  // ----------------------------------------------------------- ring colour
  /** HDR ring colour: weapon gold, ammo by slot, armour blue, health green, cash green-gold. */
  function pickupColor(kind, slot) {
    let c = RING[kind] || RING.weapon;
    if (kind === 'ammo') {
      if (!RING_SLOT[slot]) {
        const def = VH.Data && VH.Data.weaponsById ? VH.Data.weaponsById[slot] : null;
        slot = def ? def.slot : 'pistol';
      }
      c = RING_SLOT[slot] || RING_SLOT.pistol;
    }
    return new THREE.Color(c[0], c[1], c[2]);
  }

  Object.assign(WM, {
    ammoBox,
    armorVest,
    medkit,
    cashBundle,
    pickupColor,
    /** Ammo can band colours (sRGB hex) by slot, e.g. for the HUD. */
    ammoBandColors: BAND,
  });
})();
