/*
 * weapons-models-2.js — more weapon models (see weapons-models.js, VH.WeaponModels.define).
 *
 *   golfclub     Fairway 7-Iron: rubber grip, stepped chrome shaft, lofted iron head
 *   crowbar      Pry Bar: red hex bar, gooseneck claw on top, bent chisel below the fist
 *   taser        Jolt Stun Gun: yellow and black, square cartridge with two dart ports
 *   pdw          Hornet PDW: bullpup, flat top magazine with a smoky window, reflex sight
 *   sawnoff      Mule Sawn-off: side-by-side twelve, exposed hammers, walnut stub stock
 *   autoshotgun  Bull 12 Auto: boxy receiver, drum magazine, vented heat shield
 *
 * Same frame, Kit and palette as weapons-models.js: metres, the grip where
 * the hand closes at the origin, +Z out of the barrel, +Y up, -X the
 * ejection side; melee shafts run up +Y out of the top of the fist.
 */
(function () {
  'use strict';

  const VH = window.VH;
  const WM = VH.WeaponModels;
  const V = (x, y, z) => ({ x, y, z });

  // ------------------------------------------------------ local helpers
  /** Matrix for a local frame at `pos`, rotated by Euler XYZ `rot`. */
  function frameAt(pos, rot) {
    return new THREE.Matrix4().compose(
      new THREE.Vector3(pos[0], pos[1], pos[2]),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2])),
      new THREE.Vector3(1, 1, 1));
  }

  /**
   * Draw parts in a local frame: draw(k) places them as usual, then each one
   * is moved by matrix `m` (from frameAt). Lets a club head or a claw be
   * drawn square and then tilted into place.
   */
  function within(k, m, draw) {
    const own = Object.prototype.hasOwnProperty.call(k, 'put');
    const put = k.put;
    const local = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const p = new THREE.Vector3();
    const s = new THREE.Vector3();
    k.put = function (mat, geo, hex, pos, rot, scale) {
      e.set(rot ? rot[0] : 0, rot ? rot[1] : 0, rot ? rot[2] : 0);
      p.set(pos ? pos[0] : 0, pos ? pos[1] : 0, pos ? pos[2] : 0);
      if (typeof scale === 'number') s.set(scale, scale, scale);
      else s.set(scale ? scale[0] : 1, scale ? scale[1] : 1, scale ? scale[2] : 1);
      geo.applyMatrix4(local.compose(p, q.setFromEuler(e), s).premultiply(m));
      return put.call(this, mat, geo, hex);
    };
    try {
      draw(k);
    } finally {
      if (own) k.put = put;
      else delete k.put;
    }
  }

  /** A point in a local frame, as the { x, y, z } the meta wants. */
  function pointIn(m, x, y, z) {
    const v = new THREE.Vector3(x, y, z).applyMatrix4(m);
    return V(v.x, v.y, v.z);
  }

  /**
   * A bar with `sides` flat faces swept along a path in the YZ plane (points
   * [z, y]), ends capped. A corner lies in the bend plane, so a flat faces
   * each side (+-X). Returns a creased, non-indexed geometry.
   */
  function sweepBar(path, r, sides) {
    const rings = [];
    for (let i = 0; i < path.length; i++) {
      const a = path[Math.max(0, i - 1)];
      const b = path[Math.min(path.length - 1, i + 1)];
      let tz = b[0] - a[0], ty = b[1] - a[1];
      const len = Math.hypot(tz, ty) || 1;
      tz /= len;
      ty /= len;
      const ring = [];
      for (let j = 0; j < sides; j++) {
        const ang = (j / sides) * Math.PI * 2;
        const c = Math.cos(ang) * r, sn = Math.sin(ang) * r;
        // Offset = c * (in-plane normal (0, tz, -ty)) + sn * X.
        ring.push([sn, path[i][1] + tz * c, path[i][0] - ty * c]);
      }
      rings.push(ring);
    }
    const pos = [];
    const tri = (p, q, w) => pos.push(p[0], p[1], p[2], q[0], q[1], q[2], w[0], w[1], w[2]);
    for (let i = 0; i < rings.length - 1; i++) {
      for (let j = 0; j < sides; j++) {
        const j2 = (j + 1) % sides;
        tri(rings[i][j], rings[i + 1][j], rings[i + 1][j2]);
        tri(rings[i][j], rings[i + 1][j2], rings[i][j2]);
      }
    }
    const first = rings[0], last = rings[rings.length - 1];
    const c0 = [0, path[0][1], path[0][0]];
    const c1 = [0, path[path.length - 1][1], path[path.length - 1][0]];
    for (let j = 0; j < sides; j++) {
      const j2 = (j + 1) % sides;
      tri(c0, first[j], first[j2]);
      tri(c1, last[j2], last[j]);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    return WM._helpers.creaseNormals(g, 40);
  }

  /** Lathe around X: pts are [radius, x]. */
  function latheX(k, mat, hex, pts, seg, y, z) {
    const g = new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p[0], p[1])), seg || 24);
    g.rotateZ(-Math.PI / 2); // lathe axis +Y → +X
    return k.put(mat, g, hex, [0, y || 0, z || 0]);
  }

  /** Turn a surface inside out (an indexed geometry): reverse every triangle and its normals. */
  function insideOut(g) {
    const ix = g.index.array;
    for (let i = 0; i < ix.length; i += 3) {
      const t = ix[i + 1];
      ix[i + 1] = ix[i + 2];
      ix[i + 2] = t;
    }
    const n = g.attributes.normal;
    for (let i = 0; i < n.count; i++) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i));
    return g;
  }

  /** Trigger-guard outline open at the top: `outer` and `inner` run rear-top → bottom → front-top. */
  function uShape(outer, inner) {
    return outer.concat(inner.slice().reverse());
  }

  // ------------------------------------------------------------ melee
  // Fairway 7-Iron along +Y: rubber grip, stepped chrome shaft, and a lofted
  // blade head with its toe out to the right (-X) and the face toward +Z.
  WM.define('golfclub', function (k, C) {
    const green = 0x2e7d55;
    // Rubber grip: fattest at the butt cap under the fist, tapering toward the shaft.
    const gripR = (y) => 0.0142 - (y + 0.068) * 0.0129;
    k.latheY('poly', C.rubber, [
      [0.0, -0.079], [0.0112, -0.079], [0.0136, -0.0765], [0.0144, -0.072], [gripR(-0.064), -0.064],
      [gripR(0.19), 0.19], [0.0098, 0.2], [0.0078, 0.207],
    ], 20);
    // Club-colour band near the butt and a thin cream pinstripe.
    k.cylY('poly', green, 0, 0, -0.06, -0.034, gripR(-0.06) + 0.0003, gripR(-0.034) + 0.0003, 20, true);
    k.cylY('poly', C.label, 0, 0, -0.031, -0.0285, gripR(-0.031) + 0.0003, gripR(-0.0285) + 0.0003, 20, true);
    // Stepped chrome shaft: five step-downs, then a long taper to the hosel.
    const shaft = [[0.0074, 0.2]];
    let r = 0.0074;
    for (let i = 0; i < 5; i++) {
      const y = 0.33 + i * 0.07;
      shaft.push([r, y], [r - 0.0005, y + 0.005]);
      r -= 0.0005;
    }
    shaft.push([0.0047, 0.88]);
    k.latheY('chrome', C.stainless, shaft, 14);
    // Ferrule and hosel.
    k.cylY('poly', C.polymer3, 0, 0, 0.874, 0.89, 0.0051, 0.0064, 14);
    k.latheY('chrome', C.stainless2, [[0.0064, 0.888], [0.0069, 0.905], [0.0086, 0.94], [0.0094, 0.952], [0.0088, 0.958], [0.0, 0.96]], 16);
    // Head frame: X heel → toe along the sole, Y sole → top line, Z out of the
    // face. A 62 degree lie swings the toe out past the hosel; 29 degrees of loft.
    const m = frameAt([0, 0.955, 0], [0, 0, 2.653]).multiply(frameAt([0, 0, 0], [-0.5, 0, 0]));
    within(k, m, () => {
      // Blade.
      k.plate('chrome', C.stainless2, [
        [-0.006, 0.004], [0.006, -0.001], [0.058, -0.0015], [0.074, -0.001, 0.08, 0.012], [0.083, 0.03, 0.077, 0.045],
        [0.072, 0.0505, 0.064, 0.05], [0.036, 0.042], [0.014, 0.034], [0.002, 0.028], [-0.008, 0.016],
      ], 0.0085, 0.0022, null, -0.00425, 8);
      // Cavity back: a heavy sole bar and a green badge.
      k.plate('chrome', C.stainless2, [
        [-0.002, 0.003], [0.058, 0.0], [0.072, 0.002, 0.077, 0.012], [0.078, 0.019], [0.056, 0.016], [0.004, 0.013],
      ], 0.011, 0.003, null, -0.0125, 8);
      k.boxC('poly', green, [0.044, 0.027, -0.0089], [0.03, 0.0085, 0.0014], 0.0006, [0, 0, 0.22], 1);
      // Face grooves.
      for (let i = 0; i < 6; i++) {
        const y = 0.0065 + i * 0.0048;
        k.box('chrome', C.darkSteel, [0.012 + i * 0.002, y, -0.0002], [0.066 - i * 0.001, y + 0.0016, 0.0003], 0);
      }
    });
    const tip = pointIn(m, 0.045, 0.022, -0.006);
    return {
      muzzle: tip,
      tip,
      offHand: V(0, 0.095, 0),
      twoHanded: true,
      layFlat: true,
    };
  });

  // Pry Bar along +Y: red forged hex bar, a gooseneck curling over toward +Z
  // with a split claw, and a chisel end bent back below the fist.
  WM.define('crowbar', function (k, C) {
    const red = 0xb3241c;
    const R = 0.042; // gooseneck radius
    const hook = (160 * Math.PI) / 180;
    const path = [[-0.0101, -0.116]];
    for (let i = 6; i >= 0; i--) {
      const f = (i / 6) * 0.28;
      path.push([-0.08 + 0.08 * Math.cos(f), -0.07 - 0.08 * Math.sin(f)]);
    }
    for (let i = 0; i <= 20; i++) {
      const t = (i / 20) * hook;
      path.push([R - R * Math.cos(t), 0.39 + R * Math.sin(t)]);
    }
    k.put('lacquer', sweepBar(path, 0.0105, 6), red);
    // Tool label on both flats.
    for (const s of [-1, 1]) {
      k.box('lacquer', C.label, [s * 0.0091 - 0.0004, 0.12, -0.0046], [s * 0.0091 + 0.0004, 0.17, 0.0046], 0);
      k.box('lacquer', C.polymer3, [s * 0.0091 - 0.0005, 0.128, -0.0046], [s * 0.0091 + 0.0005, 0.136, 0.0046], 0);
    }
    // Claw: a ground wedge that splits into two prongs.
    const end = path[path.length - 1];
    const mc = frameAt([0, end[1], end[0]], [hook, 0, 0]);
    within(k, mc, () => {
      k.side('metal', C.steel, [[-0.0098, -0.004], [0.0094, -0.004], [0.0092, 0.018], [-0.0055, 0.018]], 0.022, 0.0016);
      for (const s of [-1, 1]) {
        k.side('metal', C.steel, [
          [-0.0068, 0.012], [0.0092, 0.012], [0.009, 0.03], [0.0062, 0.041], [0.0026, 0.0445], [-0.0026, 0.031],
        ], 0.0084, 0.0014, null, s * 0.0068);
      }
    });
    // Chisel end: flattened to an edge.
    const a = path[0], b = path[1];
    const db = Math.atan2(a[0] - b[0], a[1] - b[1]);
    within(k, frameAt([0, a[1], a[0]], [db, 0, 0]), () => {
      k.side('metal', C.steel, [
        [-0.0094, -0.004], [0.0094, -0.004], [0.0064, 0.02], [0.0018, 0.034], [-0.0018, 0.034], [-0.0064, 0.02],
      ], 0.0215, 0.0014);
    });
    const tip = V(0, 0.39 + (R + 0.0105) * Math.sin(1.92), R - (R + 0.0105) * Math.cos(1.92));
    return {
      muzzle: tip,
      tip,
      twoHanded: false,
      layFlat: true,
    };
  });

  // ------------------------------------------------------------ pistols
  // Jolt Stun Gun: chunky yellow shell over a black frame, a square cartridge
  // with two dart ports, a laser and light under the nose, a display at the back.
  WM.define('taser', function (k, C) {
    const yellow = 0xf3c614;
    // Upper housing with a sloped nose.
    k.side('poly', yellow, [
      [-0.04, 0.098], [-0.032, 0.112], [0.088, 0.112], [0.12, 0.104], [0.12, 0.047], [0.03, 0.044],
      [-0.006, 0.044], [-0.034, 0.052], [-0.04, 0.062],
    ], 0.038, 0.007);
    // Black lower frame and the laser / light module under the nose.
    k.box('poly', C.polymer, [-0.0198, 0.04, 0.022], [0.0198, 0.062, 0.121], 0.004);
    k.box('poly', C.polymer, [-0.0135, 0.026, 0.07], [0.0135, 0.046, 0.119], 0.004);
    k.disc('chrome', 0xff2a2a, 0.0062, 0.036, 0.1192, 0.0028, 14);
    k.disc('chrome', 0xe9eef3, -0.0048, 0.036, 0.1192, 0.0046, 16);
    // Cartridge: square bay, ports ringed in yellow, side release tabs.
    k.box('poly', C.polymer3, [-0.016, 0.05, 0.116], [0.016, 0.106, 0.124], 0.001, { seg: 1 });
    k.box('poly', C.polymer2, [-0.0205, 0.041, 0.1225], [0.0205, 0.1145, 0.166], 0.005);
    k.box('poly', C.polymer, [-0.0168, 0.0445, 0.163], [0.0168, 0.111, 0.1675], 0.002, { seg: 1 });
    for (const y of [0.0935, 0.062]) {
      k.cylZ('poly', yellow, 0, y, 0.166, 0.1695, 0.0088, 0.0088, 20);
      k.disc('poly', C.hole, 0, y, 0.1697, 0.0062, 16);
    }
    for (const s of [-1, 1]) k.box('poly', C.polymer, [s * 0.0205 - 0.0018, 0.06, 0.13], [s * 0.0205 + 0.0018, 0.096, 0.152], 0.0012, { seg: 1 });
    // Rear display in a black bezel, safety switches on both sides.
    k.box('poly', C.polymer3, [-0.0128, 0.068, -0.0425], [0.0128, 0.1, -0.038], 0.0015, { seg: 1 });
    k.box('poly', 0x46d6c6, [-0.0098, 0.072, -0.0432], [0.0098, 0.096, -0.0418], 0);
    for (const s of [-1, 1]) k.box('poly', C.polymer, [s * 0.019 - 0.002, 0.084, -0.022], [s * 0.019 + 0.002, 0.092, -0.008], 0.0015, { seg: 1 });
    // Sights.
    for (const s of [-1, 1]) k.box('poly', C.polymer, [s > 0 ? 0.004 : -0.01, 0.111, -0.03], [s > 0 ? 0.01 : -0.004, 0.118, -0.02], 0.001, { seg: 1 });
    k.box('poly', C.polymer, [-0.0022, 0.11, 0.074], [0.0022, 0.118, 0.084], 0.001, { seg: 1 });
    // Grip, stippled panels and the yellow battery pack in the base.
    k.side('poly', C.polymer, [
      [0.03, 0.05], [0.029, 0.034], [0.024, 0.02], [0.026, 0.006], [0.021, -0.008], [0.023, -0.022],
      [0.018, -0.036], [0.017, -0.056], [0.012, -0.068], [-0.036, -0.068], [-0.036, -0.056], [-0.03, -0.03],
      [-0.024, 0.0], [-0.02, 0.03], [-0.03, 0.05],
    ], 0.032, 0.005);
    for (const s of [-1, 1]) k.boxC('poly', C.polymer2, [s * 0.0156, -0.016, -0.005], [0.0022, 0.07, 0.03], 0.001, [0.2, 0, 0], 1);
    k.box('poly', yellow, [-0.0168, -0.079, -0.04], [0.0168, -0.066, 0.016], 0.003);
    // Trigger guard and trigger.
    k.side('poly', C.polymer, uShape(
      [[0.025, 0.045], [0.026, 0.008], [0.071, 0.003], [0.081, 0.012], [0.082, 0.045]],
      [[0.032, 0.045], [0.033, 0.0145], [0.067, 0.0105], [0.074, 0.017], [0.075, 0.045]]), 0.014, 0.0018);
    k.side('poly', C.polymer2, [[0.047, 0.043], [0.0505, 0.031], [0.0492, 0.02], [0.0462, 0.0172], [0.0428, 0.0235], [0.0425, 0.043]], 0.0065, 0.0013);
    return {
      muzzle: V(0, 0.078, 0.1698),
      sight: V(0, 0.118, -0.03),
      flashScale: 0.4,
      eject: null,
      twoHanded: false,
    };
  });

  // ------------------------------------------------------------- smg
  // Hornet PDW: slate bullpup, 45-round magazine lying on top with a smoky
  // window over the rounds, reflex sight on a bridge, folding foregrip.
  WM.define('pdw', function (k, C) {
    const bore = 0.072;
    const slate = 0x4d535b;
    // Body shell: nose, grip opening, bullpup stock.
    k.side('poly', slate, [
      [0.2, 0.106], [0.212, 0.1], [0.214, 0.052], [0.205, 0.036], [0.03, 0.034], [-0.034, 0.034],
      [-0.062, 0.03, -0.08, 0.004], [-0.12, -0.034], [-0.185, -0.046], [-0.205, -0.046], [-0.212, -0.04],
      [-0.212, 0.1], [-0.205, 0.106],
    ], 0.048, 0.008, null, 0, 10);
    // Side grooves and a black lower stock panel.
    for (const s of [-1, 1]) {
      k.box('poly', C.polymer3, [s * 0.024 - 0.0006, 0.083, -0.19], [s * 0.024 + 0.0006, 0.086, 0.19], 0);
      k.side('poly', C.polymer, [[-0.1, -0.01], [-0.12, -0.03], [-0.184, -0.042], [-0.2, -0.04], [-0.2, 0.05], [-0.1, 0.05]],
        0.004, 0.0012, null, s * 0.0232);
    }
    // Magazine: smoky window over a row of rounds, black end caps, side lips.
    k.box('glass', 0x3a3f48, [-0.021, 0.106, -0.164], [0.021, 0.134, 0.16], 0.004);
    for (let i = 0; i < 25; i++) k.cylX('metal', C.gold, 0.12, -0.15 + i * 0.012, -0.0165, 0.0165, 0.0043, 8);
    k.box('poly', C.polymer, [-0.0225, 0.104, 0.156], [0.0225, 0.137, 0.184], 0.004);
    k.box('poly', C.polymer, [-0.0225, 0.104, -0.18], [0.0225, 0.137, -0.158], 0.004);
    for (const s of [-1, 1]) k.box('poly', slate, [s > 0 ? 0.021 : -0.0262, 0.1, -0.17], [s > 0 ? 0.0262 : -0.021, 0.117, 0.17], 0.002, { seg: 1 });
    // Sight bridge over the magazine and an open reflex sight.
    for (const s of [-1, 1]) k.box('poly', C.polymer, [s > 0 ? 0.0225 : -0.0275, 0.1, 0.0], [s > 0 ? 0.0275 : -0.0225, 0.152, 0.076], 0.003, { seg: 1 });
    k.box('poly', C.polymer, [-0.0275, 0.142, 0.0], [0.0275, 0.154, 0.076], 0.003, { seg: 1 });
    k.plate('poly', C.polymer, [[-0.0165, 0.152], [0.0165, 0.152], [0.0165, 0.18], [0.0115, 0.188], [-0.0115, 0.188], [-0.0165, 0.18]], 0.03, 0.0012,
      [[[-0.0125, 0.1565], [0.0125, 0.1565], [0.0125, 0.178], [0.0085, 0.1835], [-0.0085, 0.1835], [-0.0125, 0.178]]], 0.05);
    k.box('metal', C.lensWarm, [-0.0128, 0.1555, 0.055], [0.0128, 0.184, 0.0565], 0);
    // Nose cap, barrel and slotted flash hider.
    k.cylZ('metal', C.blued, 0, bore, 0.205, 0.219, 0.0165, 0.0155, 18);
    k.cylZ('metal', C.darkSteel, 0, bore, 0.218, 0.25, 0.0078, 0.0078, 14);
    k.cylZ('metal', C.gunmetal, 0, bore, 0.246, 0.274, 0.0102, 0.0098, 16);
    for (let i = 0; i < 3; i++) k.cylZ('metal', C.blued, 0, bore, 0.252 + i * 0.007, 0.2548 + i * 0.007, 0.0106, 0.0106, 16);
    k.disc('metal', C.hole, 0, bore, 0.2742, 0.0055, 12);
    // Amber charging knobs and selector.
    for (const s of [-1, 1]) k.cylX('poly', C.amber, 0.093, 0.14, s > 0 ? 0.023 : -0.031, s > 0 ? 0.031 : -0.023, 0.005, 12);
    k.cylX('poly', C.amber, 0.062, 0.012, 0.0232, 0.027, 0.0052, 14);
    // Ejection port (right side, behind the grip).
    k.box('metal', C.hole, [-0.0248, 0.058, -0.105], [-0.0228, 0.08, -0.062], 0.0008, { seg: 1 });
    // Folding foregrip, deployed.
    k.box('poly', C.polymer, [-0.012, 0.024, 0.15], [0.012, 0.04, 0.19], 0.003, { seg: 1 });
    k.cylX('metal', C.darkSteel, 0.03, 0.17, -0.0135, 0.0135, 0.0035, 10);
    k.side('poly', C.polymer, [
      [0.158, 0.03], [0.182, 0.03], [0.18, -0.008], [0.184, -0.048], [0.178, -0.058], [0.161, -0.058], [0.156, -0.048], [0.159, -0.008],
    ], 0.024, 0.0065);
    for (let i = 0; i < 3; i++) k.box('poly', C.polymer3, [-0.009, 0.006 - i * 0.016, 0.1805 + i * 0.0006], [0.009, 0.0085 - i * 0.016, 0.1825 + i * 0.0006], 0);
    // Pistol grip and stippling.
    k.side('poly', C.polymer, [
      [0.03, 0.04], [0.026, 0.026], [0.0215, 0.014], [0.0235, 0.002], [0.019, -0.01], [0.0205, -0.022],
      [0.016, -0.036], [0.015, -0.058], [-0.03, -0.058], [-0.031, -0.034], [-0.025, -0.004], [-0.02, 0.026], [-0.022, 0.04],
    ], 0.03, 0.0045);
    for (const s of [-1, 1]) k.boxC('poly', C.polymer2, [s * 0.0146, -0.008, -0.005], [0.0022, 0.056, 0.03], 0.001, [0.2, 0, 0], 1);
    // Trigger guard and trigger.
    k.side('poly', C.polymer, uShape(
      [[0.024, 0.04], [0.0255, 0.008], [0.074, 0.008], [0.078, 0.04]],
      [[0.032, 0.04], [0.0325, 0.015], [0.066, 0.015], [0.07, 0.04]]), 0.012, 0.0018);
    k.side('metal', C.blued, [[0.046, 0.037], [0.049, 0.027], [0.0478, 0.018], [0.045, 0.016], [0.0425, 0.022], [0.0423, 0.037]], 0.0055, 0.0012);
    // Butt pad.
    k.box('poly', C.rubber, [-0.0232, -0.045, -0.222], [0.0232, 0.104, -0.208], 0.005);
    return {
      muzzle: V(0, bore, 0.2745),
      offHand: V(0, -0.012, 0.17),
      sight: V(0, 0.17, -0.02),
      eject: V(-0.026, 0.069, -0.083),
      flashScale: 0.8,
      twoHanded: true,
    };
  });

  // ----------------------------------------------------------- shotguns
  // Mule Sawn-off: side-by-side twelve with the barrels cut to a foot, bright
  // action, exposed hammers, double triggers, walnut forend and a sawn stub stock.
  WM.define('sawnoff', function (k, C) {
    const bore = 0.072;
    const bx = 0.0112; // barrel centres at +-bx
    const z0 = 0.008; // breech face
    const z1 = 0.395; // sawn muzzle
    // Action: bar under the barrels, standing breech, top tang.
    k.side('chrome', C.stainless2, [
      [-0.036, 0.091], [z0, 0.091], [z0, 0.061], [0.072, 0.061], [0.086, 0.061, 0.086, 0.048], [0.086, 0.036, 0.072, 0.036],
      [-0.024, 0.036], [-0.036, 0.05],
    ], 0.0445, 0.003, null, 0, 8);
    for (const s of [-1, 1]) k.cylX('chrome', C.steel, 0.048, 0.072, s > 0 ? 0.021 : -0.0232, s > 0 ? 0.0232 : -0.021, 0.0058, 14);
    // Barrels, ribs, and the bright sawn ends with their twin bores.
    for (const s of [-1, 1]) {
      k.cylZ('metal', C.blued, s * bx, bore, z0, z1, 0.0112, 0.0106, 22);
      k.disc('chrome', C.steel, s * bx, bore, z1 + 0.0002, 0.0106, 22);
      k.disc('metal', C.hole, s * bx, bore, z1 + 0.0005, 0.0086, 18);
    }
    k.box('metal', C.blued, [-0.0052, bore, z0], [0.0052, 0.0858, z1 - 0.002], 0.0015, { seg: 1 });
    k.box('metal', C.blued, [-0.0052, 0.06, 0.08], [0.0052, bore, z1 - 0.002], 0.0015, { seg: 1 });
    // Walnut forend with checkering, and the forend iron.
    k.box('chrome', C.stainless2, [-0.0195, 0.04, 0.084], [0.0195, 0.063, 0.1], 0.004, { seg: 1 });
    k.box('lacquer', C.walnut, [-0.0205, 0.039, 0.096], [0.0205, 0.064, 0.232], 0.008);
    for (const s of [-1, 1]) k.box('lacquer', C.walnutDark, [s * 0.0205 - 0.0006, 0.045, 0.118], [s * 0.0205 + 0.0006, 0.058, 0.21], 0);
    // Exposed hammers and the top lever between them.
    for (const s of [-1, 1]) {
      k.side('chrome', C.darkSteel, [
        [-0.006, 0.088], [-0.004, 0.097], [-0.012, 0.104], [-0.026, 0.112], [-0.04, 0.116], [-0.044, 0.111],
        [-0.032, 0.104], [-0.024, 0.094], [-0.022, 0.088],
      ], 0.0062, 0.0014, null, s * 0.0125);
    }
    k.boxC('chrome', C.steel, [0.0045, 0.0935, -0.032], [0.0065, 0.006, 0.034], 0.0018, [0, 0.32, 0], 1);
    // Trigger guard and double triggers.
    k.side('metal', C.blued, uShape(
      [[0.012, 0.037], [0.013, 0.006], [0.062, 0.002], [0.07, 0.011], [0.071, 0.037]],
      [[0.0205, 0.037], [0.021, 0.012], [0.059, 0.009], [0.063, 0.015], [0.064, 0.037]]), 0.011, 0.0018);
    for (const z of [0.033, 0.047]) {
      k.side('metal', C.steel, [[z, 0.036], [z + 0.0032, 0.026], [z + 0.002, 0.016], [z - 0.0006, 0.0145], [z - 0.0032, 0.02], [z - 0.0034, 0.036]], 0.005, 0.0012);
    }
    // Walnut stock sawn off just behind the pistol grip, end grain showing.
    k.side('lacquer', C.walnut, [
      [-0.036, 0.0905], [-0.08, 0.085], [-0.14, 0.076], [-0.14, 0.026], [-0.11, 0.018],
      [-0.066, 0.006, -0.055, -0.026], [-0.05, -0.058], [-0.044, -0.07], [-0.008, -0.067],
      [-0.002, -0.04], [0.006, -0.012, 0.0105, 0.012], [0.013, 0.036], [-0.024, 0.036], [-0.036, 0.05],
    ], 0.036, 0.0065, null, 0, 10);
    k.box('lacquer', 0xb98552, [-0.0118, 0.033, -0.1415], [0.0118, 0.069, -0.1396], 0.001, { seg: 1 });
    for (const s of [-1, 1]) k.boxC('lacquer', C.walnutDark, [s * 0.0172, -0.018, -0.024], [0.0022, 0.07, 0.026], 0.001, [0.2, 0, 0], 1);
    k.boxC('metal', C.blued, [0, -0.069, -0.026], [0.028, 0.005, 0.036], 0.002, [-0.06, 0, 0], 1);
    return {
      muzzle: V(0, bore, z1 + 0.0006),
      sight: V(0, 0.096, -0.08),
      flashScale: 1.7,
      eject: null,
      offHand: null,
      twoHanded: false,
    };
  });

  // Bull 12 Auto: boxy gunmetal receiver with a carry handle, a big olive drum
  // under it ahead of the grip, vented heat shield, skeleton folding stock.
  WM.define('autoshotgun', function (k, C) {
    const bore = 0.082;
    // Upper receiver, lower receiver and magazine neck.
    k.box('metal', C.gunmetal, [-0.0225, 0.046, -0.072], [0.0225, 0.12, 0.232], 0.006);
    k.box('poly', C.polymer, [-0.021, 0.026, -0.066], [0.021, 0.052, 0.19], 0.005);
    k.box('poly', C.polymer, [-0.02, 0.0, 0.098], [0.02, 0.034, 0.168], 0.004, { seg: 1 });
    // Ejection port (right) with the bolt face, charging handle (left).
    k.box('metal', C.hole, [-0.0232, 0.072, 0.04], [-0.0215, 0.102, 0.115], 0.001, { seg: 1 });
    k.box('metal', C.darkSteel, [-0.0228, 0.078, 0.046], [-0.021, 0.096, 0.07], 0.001, { seg: 1 });
    k.box('metal', C.blued, [0.0222, 0.094, 0.06], [0.0236, 0.1, 0.2], 0.0005, { seg: 1 });
    k.cylX('poly', C.orange, 0.097, 0.188, 0.022, 0.034, 0.0055, 12);
    // Carry handle with an aperture rear sight.
    k.side('metal', C.blued, [
      [-0.05, 0.112], [-0.05, 0.162], [-0.04, 0.17], [0.15, 0.17], [0.162, 0.16], [0.172, 0.112],
    ], 0.016, 0.003, [[[-0.026, 0.1215], [-0.026, 0.148], [-0.018, 0.155], [0.14, 0.155], [0.15, 0.146], [0.152, 0.1215]]], 0, 8);
    k.plate('metal', C.blued, [[-0.009, 0.168], [0.009, 0.168], [0.009, 0.18], [-0.009, 0.18]], 0.008, 0.0015,
      [[[-0.003, 0.172], [0.003, 0.172], [0.003, 0.177], [-0.003, 0.177]]], -0.038);
    // Barrel, handguard and the vented heat shield over the top half.
    k.cylZ('metal', C.darkSteel, 0, bore, 0.23, 0.48, 0.0118, 0.0118, 18);
    k.box('poly', C.olive, [-0.022, 0.044, 0.228], [0.022, 0.082, 0.392], 0.008);
    for (let i = 0; i < 4; i++) {
      for (const s of [-1, 1]) k.box('poly', C.oliveDark, [s * 0.022 - 0.0006, 0.054, 0.25 + i * 0.034], [s * 0.022 + 0.0006, 0.07, 0.272 + i * 0.034], 0);
    }
    for (const rr of [0.0195, 0.0189]) {
      const g = new THREE.CylinderGeometry(rr, rr, 0.21, 22, 1, true, -Math.PI * 0.12, Math.PI * 1.24);
      g.rotateX(Math.PI / 2);
      g.rotateZ(Math.PI / 2); // angle 0 at +X, PI/2 on top
      if (rr < 0.019) insideOut(g);
      k.put('metal', g, C.blued, [0, bore, 0.35]);
    }
    for (let i = 0; i < 7; i++) {
      const z = 0.262 + i * 0.026;
      for (const a of [0.55, 1.2, 1.94, 2.59]) {
        k.boxC('metal', C.hole, [Math.cos(a) * 0.0197, bore + Math.sin(a) * 0.0197, z], [0.0062, 0.0012, 0.014], 0, [0, 0, a - Math.PI / 2]);
      }
    }
    // Front sight block with a tall post, shield clamp, and a ported muzzle brake.
    k.box('metal', C.blued, [-0.013, 0.066, 0.452], [0.013, 0.104, 0.47], 0.003, { seg: 1 });
    k.side('metal', C.blued, [[0.434, 0.102], [0.474, 0.102], [0.468, 0.124], [0.4645, 0.16], [0.4575, 0.16], [0.454, 0.126]], 0.011, 0.002,
      [[[0.452, 0.108], [0.465, 0.108], [0.462, 0.122], [0.457, 0.124]]]);
    k.box('poly', C.orange, [-0.0016, 0.158, 0.4585], [0.0016, 0.166, 0.4635], 0.0006, { seg: 1 });
    k.cylZ('metal', C.gunmetal, 0, bore, 0.468, 0.508, 0.0158, 0.0155, 18);
    for (let i = 0; i < 3; i++) {
      for (const s of [-1, 1]) k.box('metal', C.hole, [s * 0.0152 - 0.0012, bore - 0.0055, 0.474 + i * 0.011], [s * 0.0152 + 0.0012, bore + 0.0055, 0.48 + i * 0.011], 0);
    }
    k.disc('metal', C.hole, 0, bore, 0.5082, 0.0098, 16);
    // Drum magazine: bevelled disc, raised ring, ribs and a winding key.
    const dz = 0.132, dy = -0.05;
    latheX(k, 'poly', C.olive, [[0.0, -0.036], [0.064, -0.036], [0.072, -0.032], [0.076, -0.024], [0.076, 0.024], [0.072, 0.032], [0.064, 0.036], [0.0, 0.036]], 32, dy, dz);
    for (const s of [-1, 1]) {
      const g = new THREE.TorusGeometry(0.054, 0.0032, 4, 32);
      g.rotateY(Math.PI / 2);
      k.put('poly', g, C.oliveDark, [s * 0.0362, dy, dz]);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.26;
        k.boxC('poly', C.oliveDark, [s * 0.0365, dy + Math.sin(a) * 0.034, dz + Math.cos(a) * 0.034], [0.003, 0.0052, 0.03], 0, [-a, 0, 0]);
      }
      k.cylX('poly', C.polymer, dy, dz, s > 0 ? 0.034 : -0.041, s > 0 ? 0.041 : -0.034, 0.016, 20);
    }
    k.box('metal', C.steel, [0.041, dy - 0.003, dz - 0.014], [0.045, dy + 0.003, dz + 0.014], 0.001, { seg: 1 });
    // Pistol grip.
    k.side('poly', C.polymer, [
      [0.0275, 0.036], [0.023, 0.018], [0.0185, 0.004], [0.0165, -0.012], [0.0115, -0.03], [0.008, -0.062],
      [-0.031, -0.066], [-0.031, -0.054], [-0.0235, -0.02], [-0.017, 0.012], [-0.012, 0.036],
    ], 0.029, 0.0045);
    // Trigger guard and trigger.
    k.side('poly', C.polymer, uShape(
      [[0.021, 0.03], [0.022, 0.002], [0.058, 0.0], [0.06, 0.03]],
      [[0.029, 0.03], [0.0295, 0.008], [0.051, 0.007], [0.052, 0.03]]), 0.012, 0.0018);
    k.side('metal', C.blued, [[0.037, 0.028], [0.0398, 0.019], [0.0388, 0.011], [0.0362, 0.0095], [0.034, 0.015], [0.0337, 0.028]], 0.005, 0.0012);
    // Folding stock (extended): hinge on the left, olive skeleton, rubber pad.
    k.box('metal', C.blued, [-0.02, 0.05, -0.088], [0.02, 0.112, -0.068], 0.004, { seg: 1 });
    k.cylY('metal', C.steel, 0.021, -0.078, 0.048, 0.114, 0.0048, 0.0048, 12);
    k.side('poly', C.olive, [
      [-0.086, 0.112], [-0.3, 0.114], [-0.31, 0.106], [-0.31, -0.026], [-0.298, -0.03], [-0.26, -0.024],
      [-0.12, 0.044], [-0.086, 0.052],
    ], 0.03, 0.0055, [[[-0.115, 0.096], [-0.282, 0.098], [-0.286, 0.0], [-0.258, -0.004], [-0.14, 0.058]]], 0, 8);
    k.box('poly', C.rubber, [-0.0175, -0.032, -0.324], [0.0175, 0.116, -0.308], 0.005);
    return {
      muzzle: V(0, bore, 0.509),
      offHand: V(0, 0.044, 0.31),
      sight: V(0, 0.175, -0.06),
      eject: V(-0.024, 0.088, 0.078),
      flashScale: 1.4,
      twoHanded: true,
    };
  });
})();
