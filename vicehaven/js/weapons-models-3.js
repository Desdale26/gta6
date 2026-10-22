/*
 * weapons-models-3.js — more weapon models (see weapons-models.js, VH.WeaponModels.define).
 *
 *   lmg         Rhino LMG: belt-fed, 100-round box on the left, finned barrel
 *   dmr         Osprey DMR: tan marksman rifle with a 3x scope
 *   rpg         Thunderhead RPG: olive launch tube with a rocket loaded
 *   glauncher   Boomer GL: six-shot revolving 40 mm launcher
 *   minigun     Buzzsaw Minigun: six rotating barrels, carried at the hip
 *   limpet      Limpet Charge: magnetic puck with a keypad and an antenna
 *   rocket      the RPG's rocket in flight (projectile, centred, +Z forward)
 *   gl_grenade  a 40 mm grenade round in flight (projectile, centred, +Z forward)
 *
 * Same frame as weapons-models.js: metres, the grip where the hand closes at
 * the origin, +Z out of the barrel, +Y up, -X the right (ejection) side.
 * The minigun also returns meta.barrels, a point on the barrel cluster's
 * axis: the cluster is round about that axis, so it can be spun around it.
 * The cluster (spindle, barrels, clamps, bores) is the minigun's only
 * 'chrome' part, so it comes out as its own mesh (minigun:chrome) that can
 * spin on its own while the housing, grip and handles stay put.
 */
(function () {
  'use strict';

  const VH = window.VH;
  const WM = VH.WeaponModels;
  const V = (x, y, z) => ({ x, y, z });

  // ------------------------------------------------------ geometry helpers
  /** Trigger-guard outline open at the top: `outer` and `inner` run rear-top → bottom → front-top. */
  function uShape(outer, inner) {
    return outer.concat(inner.slice().reverse());
  }

  /** Circle outline (x, y) of `steps` points round (cx, cy). */
  function circle(r, steps, cx, cy) {
    const pts = [];
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      pts.push([(cx || 0) + Math.cos(a) * r, (cy || 0) + Math.sin(a) * r]);
    }
    return pts;
  }

  /** Circle outline with `lobes` scallops centred on the angles phase + k * 2PI / lobes. */
  function fluted(r, lobes, depth, phase, steps, cx, cy) {
    const pts = [];
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const f = Math.pow(Math.max(0, Math.cos(lobes * (a - phase))), 6);
      const rr = r - depth * f;
      pts.push([(cx || 0) + Math.cos(a) * rr, (cy || 0) + Math.sin(a) * rr]);
    }
    return pts;
  }

  /** Euler [x, y, z] that turns +Y along `dir` and +Z as near to `up` as it can. */
  function alongRot(dir, up) {
    const Y = new THREE.Vector3(dir[0], dir[1], dir[2]).normalize();
    const Z = new THREE.Vector3(up[0], up[1], up[2]);
    Z.addScaledVector(Y, -Z.dot(Y)).normalize();
    const X = new THREE.Vector3().crossVectors(Y, Z);
    const e = new THREE.Euler().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
    return [e.x, e.y, e.z];
  }

  /**
   * Draw parts as usual, then scale them all about the origin by `s` ([x, y, z]).
   * Lets a small model be drawn at a comfortable size and grown into place.
   */
  function scaled(k, s, draw) {
    const own = Object.prototype.hasOwnProperty.call(k, 'put');
    const put = k.put;
    const S = new THREE.Matrix4().makeScale(s[0], s[1], s[2]);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const p = new THREE.Vector3();
    const sc = new THREE.Vector3();
    k.put = function (mat, geo, hex, pos, rot, scale) {
      e.set(rot ? rot[0] : 0, rot ? rot[1] : 0, rot ? rot[2] : 0);
      p.set(pos ? pos[0] : 0, pos ? pos[1] : 0, pos ? pos[2] : 0);
      if (typeof scale === 'number') sc.set(scale, scale, scale);
      else sc.set(scale ? scale[0] : 1, scale ? scale[1] : 1, scale ? scale[2] : 1);
      geo.applyMatrix4(m.compose(p, q.setFromEuler(e), sc).premultiply(S));
      return put.call(this, mat, geo, hex);
    };
    try {
      draw(k);
    } finally {
      if (own) k.put = put;
      else delete k.put;
    }
  }

  /** Point on a cubic Bezier through four [x, y, z] points. */
  function bezier(p0, p1, p2, p3, t) {
    const u = 1 - t;
    const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
    return [0, 1, 2].map((i) => a * p0[i] + b * p1[i] + c * p2[i] + d * p3[i]);
  }

  // ------------------------------------------------------- shared parts
  /** The carbine-style pistol grip (as on the Mantis) and its stippled panels. */
  function pistolGrip(k, hex, panel) {
    k.side('poly', hex, [
      [0.0275, 0.036], [0.023, 0.018], [0.0185, 0.004], [0.0165, -0.012], [0.0115, -0.03], [0.008, -0.058],
      [-0.03, -0.062], [-0.03, -0.05], [-0.0225, -0.02], [-0.017, 0.012], [-0.012, 0.036],
    ], 0.027, 0.0042);
    if (panel !== undefined) {
      for (const s of [-1, 1]) k.boxC('poly', panel, [s * 0.0132, -0.012, -0.007], [0.0022, 0.056, 0.024], 0, [0.24, 0, 0]);
    }
  }

  /** Trigger guard and trigger under a receiver whose bottom is at y = 0.038. */
  function triggerGroup(k, C, guard) {
    k.side('metal', guard, uShape(
      [[0.0215, 0.04], [0.022, 0.009], [0.052, 0.008], [0.053, 0.04]],
      [[0.0295, 0.04], [0.0298, 0.0145], [0.0455, 0.0145], [0.0458, 0.04]]), 0.011, 0.0018);
    k.side('metal', C.blued, [[0.037, 0.037], [0.0398, 0.026], [0.0388, 0.018], [0.0362, 0.0165], [0.034, 0.022], [0.0337, 0.037]], 0.005, 0.0012);
  }

  /**
   * The Thunderhead's warhead on the axis (0, y), its neck starting at z0:
   * over-calibre tan body, amber band, ogive nose and a steel fuze. 0.256 m long.
   */
  function warhead(k, C, y, z0, part) {
    const poly = part ? 'poly@' + part : 'poly';
    const metal = part ? 'metal@' + part : 'metal';
    const p = [[0.0, 0.0], [0.0235, 0.0], [0.0235, 0.03], [0.03, 0.04], [0.046, 0.072], [0.048, 0.08], [0.048, 0.118],
      [0.046, 0.128], [0.04, 0.158], [0.031, 0.19], [0.02, 0.214], [0.012, 0.228], [0.0, 0.228]];
    k.latheZ(poly, C.tan, p.map((q) => [q[0], z0 + q[1]]), 28, 0, y);
    k.cylZ(poly, C.amber, 0, y, z0 + 0.09, z0 + 0.102, 0.0484, 0.0484, 28);
    k.cylZ(metal, C.darkSteel, 0, y, z0 + 0.222, z0 + 0.247, 0.0095, 0.0062, 14);
    k.latheZ(metal, C.steel, [[0.0062, z0 + 0.247], [0.0055, z0 + 0.253], [0.003, z0 + 0.256], [0.0, z0 + 0.2565]], 12, 0, y);
  }

  /** A 40 mm round's nose (olive ogive, gold fuze tip) on the axis (x, y), its base at z0. 0.032 m long. */
  function grenadeNose(k, C, x, y, z0, r, seg) {
    const s = r / 0.0195;
    k.latheZ('poly', C.olive, [[0.0195 * s, z0], [0.0185 * s, z0 + 0.004], [0.016 * s, z0 + 0.013], [0.012 * s, z0 + 0.021], [0.0095 * s, z0 + 0.024]], seg || 18, x, y);
    k.latheZ('chrome', C.gold, [[0.0095 * s, z0 + 0.0238], [0.007 * s, z0 + 0.029], [0.0035 * s, z0 + 0.0318], [0.0, z0 + 0.0322]], seg || 18, x, y);
  }

  // ------------------------------------------------------------- the guns
  // Rhino LMG: gunmetal receiver with a hinged feed cover, olive 100-round
  // box on the left feeding a short brass belt into the tray, finned barrel
  // under a carry handle, bipod folded forward, skeleton stock.
  WM.define('lmg', function (k, C) {
    const bore = 0.078;
    // Receiver, feed cover with its latch, rail and rear sight.
    k.box('metal', C.gunmetal, [-0.021, 0.036, -0.085], [0.021, 0.104, 0.192], 0.005);
    k.side('metal', C.gunmetal2, [[-0.03, 0.1], [-0.03, 0.117], [-0.023, 0.124], [0.128, 0.124], [0.168, 0.106], [0.168, 0.1]], 0.045, 0.004);
    k.box('metal', C.blued, [-0.012, 0.102, -0.045], [0.012, 0.121, -0.029], 0.003, { seg: 1 });
    k.box('metal', C.blued, [-0.0095, 0.123, -0.004], [0.0095, 0.1275, 0.118], 0);
    for (let i = 0; i < 9; i++) {
      const z = 0.0 + i * 0.0134;
      k.box('metal', C.blued, [-0.0102, 0.127, z], [0.0102, 0.131, z + 0.0066], 0);
    }
    k.plate('metal', C.blued, [[-0.009, 0.123], [0.009, 0.123], [0.009, 0.141], [0.0032, 0.141], [0.0032, 0.134], [-0.0032, 0.134], [-0.0032, 0.141], [-0.009, 0.141]], 0.006, 0.0008, null, -0.016);
    // Feed tray on the left, ejection port and charging handle on the right.
    k.box('metal', C.blued, [0.018, 0.074, 0.028], [0.034, 0.1, 0.104], 0.003, { seg: 1 });
    k.box('metal', C.hole, [-0.0218, 0.048, 0.008], [-0.0185, 0.07, 0.076], 0);
    k.box('metal', C.blued, [-0.032, 0.074, 0.13], [-0.019, 0.088, 0.16], 0.003, { seg: 1 });
    k.cylX('metal', C.gunmetal2, 0.081, 0.145, -0.044, -0.03, 0.0062, 12);
    // Trigger housing, pistol grip, trigger guard.
    k.box('poly', C.polymer2, [-0.0165, 0.03, -0.052], [0.0165, 0.042, 0.058], 0.004, { seg: 1 });
    pistolGrip(k, C.polymer, C.polymer2);
    triggerGroup(k, C, C.gunmetal2);
    // 100-round box on the left, hung from a shelf, with ribs and a latch.
    k.box('metal', C.blued, [0.0, 0.028, 0.06], [0.05, 0.04, 0.166], 0.003, { seg: 1 });
    k.box('poly', C.olive, [0.022, -0.072, 0.062], [0.076, 0.03, 0.166], 0.006);
    for (let i = 0; i < 3; i++) {
      const y = -0.054 + i * 0.026;
      k.box('poly', C.oliveDark, [0.0745, y, 0.07], [0.0782, y + 0.007, 0.158], 0);
    }
    k.box('poly', C.oliveDark, [0.03, -0.004, 0.164], [0.068, 0.018, 0.171], 0.002, { seg: 1 });
    k.box('poly', C.polymer3, [0.05, 0.026, 0.07], [0.072, 0.032, 0.158], 0);
    // The belt: five rounds rising from the box into the tray, linked.
    const belt = [];
    for (let i = 0; i < 5; i++) {
      const t = i / 4;
      const u = 1 - t;
      belt.push([u * u * 0.061 + 2 * u * t * 0.061 + t * t * 0.039, u * u * 0.035 + 2 * u * t * 0.079 + t * t * 0.088]);
    }
    for (const [x, y] of belt) {
      k.cylZ('chrome', C.gold, x, y, 0.036, 0.08, 0.0056, 0.0056, 8);
      k.cylZ('chrome', 0xb06a3c, x, y, 0.08, 0.098, 0.0046, 0.0014, 8);
      for (const z of [0.046, 0.066]) k.cylZ('metal', C.blued, x, y, z, z + 0.007, 0.0064, 0.0064, 6);
    }
    for (let i = 0; i < 4; i++) {
      for (const z of [0.0495, 0.0695]) k.rod('metal', C.blued, [belt[i][0], belt[i][1], z], [belt[i + 1][0], belt[i + 1][1], z], 0.0024, 6);
    }
    // Barrel trunnion, finned barrel, carry handle.
    k.box('metal', C.blued, [-0.019, 0.052, 0.186], [0.019, 0.104, 0.224], 0.005, { seg: 1 });
    k.cylZ('metal', C.darkSteel, 0, bore, 0.22, 0.636, 0.0118, 0.0106, 16);
    for (let i = 0; i < 10; i++) {
      const z = 0.23 + i * 0.0127;
      k.cylZ('metal', C.gunmetal, 0, bore, z, z + 0.0052, 0.0178, 0.0178, 12);
    }
    k.side('poly', C.polymer, [[0.226, 0.094], [0.234, 0.146, 0.258, 0.152], [0.334, 0.152], [0.358, 0.146, 0.366, 0.094]], 0.016, 0.003,
      [[[0.246, 0.099], [0.252, 0.132, 0.27, 0.136], [0.322, 0.136], [0.34, 0.132, 0.346, 0.099]]], 0, 6);
    // Handguard under the barrel with grooves.
    k.box('poly', C.polymer, [-0.022, 0.024, 0.204], [0.022, 0.058, 0.372], 0.008, { seg: 1 });
    for (let i = 0; i < 4; i++) {
      const z = 0.218 + i * 0.038;
      for (const s of [-1, 1]) k.box('poly', C.polymer3, [s * 0.022 - 0.0007, 0.035, z], [s * 0.022 + 0.0007, 0.047, z + 0.026], 0);
    }
    // Gas tube and block, bipod folded forward under the barrel.
    k.cylZ('metal', C.blued, 0, 0.05, 0.37, 0.48, 0.0062, 0.0062, 12);
    k.box('metal', C.gunmetal2, [-0.012, 0.04, 0.464], [0.012, 0.09, 0.494], 0.003, { seg: 1 });
    k.box('metal', C.blued, [-0.017, 0.026, 0.47], [0.017, 0.046, 0.49], 0.004, { seg: 1 });
    for (const s of [-1, 1]) {
      k.cylZ('metal', C.darkSteel, s * 0.0108, 0.034, 0.484, 0.6, 0.0046, 0.0046, 10);
      k.cylZ('metal', C.steel, s * 0.0108, 0.034, 0.6, 0.64, 0.0034, 0.0034, 10);
      k.box('poly', C.rubber, [s * 0.0108 - 0.0055, 0.027, 0.636], [s * 0.0108 + 0.0055, 0.041, 0.652], 0);
    }
    // Hooded front sight, slotted flash hider.
    k.plate('metal', C.blued, [[-0.0095, 0.088], [0.0095, 0.088], [0.0095, 0.108], [0.006, 0.114], [-0.006, 0.114], [-0.0095, 0.108]], 0.009, 0.001,
      [[[-0.006, 0.094], [0.006, 0.094], [0.006, 0.107], [0.003, 0.11], [-0.003, 0.11], [-0.006, 0.107]]], 0.596);
    k.box('metal', C.blued, [-0.0018, 0.09, 0.593], [0.0018, 0.106, 0.599], 0);
    k.cylZ('metal', C.gunmetal, 0, bore, 0.632, 0.706, 0.0128, 0.0124, 16);
    for (const a of [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4]) {
      k.boxC('metal', C.hole, [Math.cos(a) * 0.0124, bore + Math.sin(a) * 0.0124, 0.674], [0.0024, 0.0042, 0.046], 0, [0, 0, a], 1);
    }
    k.disc('poly', C.hole, 0, bore, 0.7062, 0.0075, 14);
    // Skeleton stock and butt pad.
    k.side('poly', C.polymer, [
      [-0.08, 0.1], [-0.33, 0.098], [-0.348, 0.094], [-0.352, 0.08], [-0.352, -0.012], [-0.345, -0.02], [-0.33, -0.022],
      [-0.19, 0.028], [-0.1, 0.038], [-0.08, 0.04],
    ], 0.03, 0.004, [
      [[-0.318, 0.084], [-0.212, 0.084], [-0.212, 0.04], [-0.318, 0.003]],
      [[-0.196, 0.084], [-0.104, 0.084], [-0.104, 0.053], [-0.196, 0.044]],
    ]);
    k.box('poly', C.rubber, [-0.017, -0.027, -0.368], [0.017, 0.102, -0.35], 0.005, { seg: 1 });
    return {
      muzzle: V(0, bore, 0.7065),
      offHand: V(0, 0.026, 0.29),
      eject: V(-0.022, 0.059, 0.042),
      sight: V(0, 0.138, -0.04),
      flashScale: 1.2,
      twoHanded: true,
    };
  });

  // Osprey DMR: tan receivers, long octagonal free-float handguard, olive
  // adjustable stock with a cheek riser, 10-round box, 3x scope on the rail.
  WM.define('dmr', function (k, C) {
    const bore = 0.075;
    const sy = 0.132; // scope axis
    // Upper receiver and a full-length rail.
    k.box('poly', C.tan, [-0.0155, 0.062, -0.08], [0.0155, 0.1, 0.168], 0.0045);
    k.box('metal', C.blued, [-0.0105, 0.0995, -0.074], [0.0105, 0.1045, 0.5], 0.0012, { seg: 1 });
    for (let i = 0; i < 41; i++) {
      const z = -0.07 + i * 0.0138;
      k.box('metal', C.blued, [-0.011, 0.1035, z], [0.011, 0.1095, z + 0.0068], 0);
    }
    // Ejection port cover (right), forward assist, charging handle.
    k.box('metal', C.blued, [-0.0165, 0.07, 0.0], [-0.0148, 0.092, 0.07], 0.0006, { seg: 1 });
    k.cylZ('metal', C.gunmetal2, -0.0155, 0.086, -0.035, -0.012, 0.0055, 0.0055, 12);
    k.box('metal', C.blued, [-0.018, 0.089, -0.092], [0.018, 0.0985, -0.078], 0.002, { seg: 1 });
    // Lower receiver and magazine well.
    k.box('poly', C.tan, [-0.0142, 0.034, -0.072], [0.0142, 0.0655, 0.108], 0.004);
    k.box('poly', C.tan, [-0.0152, 0.012, 0.045], [0.0152, 0.042, 0.104], 0.004);
    // Octagonal free-float handguard with dark slots.
    const hc = 0.077;
    k.plate('poly', C.tan, [
      [-0.0085, hc - 0.023], [0.0085, hc - 0.023], [0.0195, hc - 0.012], [0.0195, hc + 0.012],
      [0.0085, hc + 0.023], [-0.0085, hc + 0.023], [-0.0195, hc + 0.012], [-0.0195, hc - 0.012],
    ], 0.335, 0.003, null, 0.3355);
    for (let i = 0; i < 6; i++) {
      const z = 0.19 + i * 0.05;
      for (const s of [-1, 1]) k.box('poly', C.polymer3, [s * 0.0195 - 0.0007, hc - 0.006, z], [s * 0.0195 + 0.0007, hc + 0.006, z + 0.03], 0);
      k.box('poly', C.polymer3, [-0.0045, hc - 0.0237, z], [0.0045, hc - 0.0223, z + 0.03], 0);
    }
    // Heavy barrel and a ported brake.
    k.cylZ('metal', C.darkSteel, 0, bore, 0.5, 0.66, 0.0098, 0.009, 18);
    k.cylZ('metal', C.gunmetal2, 0, bore, 0.655, 0.715, 0.0125, 0.0125, 18);
    for (let i = 0; i < 3; i++) {
      for (const s of [-1, 1]) k.box('metal', C.hole, [s * 0.0122 - 0.0014, bore - 0.0052, 0.664 + i * 0.015], [s * 0.0122 + 0.0014, bore + 0.0052, 0.672 + i * 0.015], 0);
    }
    k.disc('poly', C.hole, 0, bore, 0.7152, 0.0062, 14);
    // 3x scope: rings, tube, objective and eyepiece bells, turrets, a tan
    // magnification ring, lenses.
    for (const z of [-0.012, 0.098]) k.box('metal', C.blued, [-0.0128, 0.1, z - 0.007], [0.0128, sy, z + 0.007], 0.003, { seg: 1 });
    k.cylZ('metal', C.polymer3, 0, sy, -0.062, 0.14, 0.0127, 0.0127, 22);
    k.latheZ('metal', C.polymer3, [[0.0127, 0.136], [0.0135, 0.148], [0.0205, 0.172], [0.0212, 0.176], [0.0212, 0.198], [0.02, 0.2], [0.0, 0.2]], 24, 0, sy);
    k.latheZ('metal', C.polymer3, [[0.0, -0.112], [0.0176, -0.112], [0.0183, -0.108], [0.0183, -0.08], [0.0135, -0.066], [0.0127, -0.06]], 24, 0, sy);
    k.cylZ('poly', C.tan, 0, sy, -0.099, -0.09, 0.0187, 0.0187, 24);
    k.cylY('metal', C.polymer3, 0, 0.044, sy + 0.01, sy + 0.025, 0.0095, 0.0095, 18);
    k.cylY('metal', C.darkSteel, 0, 0.044, sy + 0.0245, sy + 0.0265, 0.0088, 0.0082, 18);
    k.cylX('metal', C.polymer3, sy, 0.044, -0.026, -0.01, 0.0088, 18);
    k.disc('chrome', C.lens, 0, sy, 0.2002, 0.0186, 24);
    k.disc('chrome', C.lens, 0, sy, -0.1122, 0.0152, 20, true);
    // Olive pistol grip, trigger guard and trigger.
    pistolGrip(k, C.olive, C.oliveDark);
    triggerGroup(k, C, C.blued);
    // 10-round box with a base plate.
    k.side('poly', C.polymer, [[0.1, 0.038], [0.1, -0.028], [0.0965, -0.034], [0.0535, -0.034], [0.05, -0.028], [0.05, 0.038]], 0.022, 0.003);
    k.box('poly', C.polymer2, [-0.0128, -0.042, 0.047], [0.0128, -0.032, 0.103], 0.003, { seg: 1 });
    for (const s of [-1, 1]) k.box('poly', C.polymer2, [s * 0.011 - 0.0012, -0.026, 0.06], [s * 0.011 + 0.0012, 0.008, 0.064], 0);
    // Buffer tube, adjustable stock, cheek riser on two posts, butt pad.
    k.cylZ('metal', C.blued, 0, 0.081, -0.25, -0.074, 0.0138, 0.0138, 18);
    k.side('poly', C.olive, [
      [-0.15, 0.098], [-0.298, 0.1], [-0.304, 0.096], [-0.304, -0.004], [-0.29, -0.01], [-0.235, 0.016], [-0.175, 0.05], [-0.15, 0.064],
    ], 0.036, 0.0055);
    for (const z of [-0.258, -0.2]) k.cylY('metal', C.blued, 0, z, 0.096, 0.114, 0.0038, 0.0038, 10);
    k.box('poly', C.oliveDark, [-0.0148, 0.11, -0.288], [0.0148, 0.128, -0.168], 0.006);
    k.box('poly', C.rubber, [-0.0182, -0.012, -0.318], [0.0182, 0.103, -0.303], 0.004);
    return {
      muzzle: V(0, bore, 0.7155),
      offHand: V(0, 0.052, 0.34),
      sight: V(0, sy, -0.115),
      eject: V(-0.0168, 0.081, 0.035),
      scope: true,
      flashScale: 1.1,
      twoHanded: true,
    };
  });

  // Thunderhead RPG: olive launch tube over the shoulder, ribbed shoulder
  // sleeve behind the grip, flared back-blast end at -Z, flip-up sights, a
  // front grip, and a rocket loaded with its warhead out of the front.
  WM.define('rpg', function (k, C) {
    const ty = 0.098; // tube axis
    // Tube, muzzle collar and its dark mouth.
    k.cylZ('poly', C.olive, 0, ty, -0.405, 0.51, 0.04, 0.04, 28);
    k.latheZ('poly', C.oliveDark, [[0.04, 0.505], [0.0445, 0.509], [0.0445, 0.548], [0.0425, 0.552], [0.036, 0.552], [0.036, 0.53]], 28, 0, ty);
    k.disc('poly', C.hole, 0, ty, 0.531, 0.0362, 24);
    // Back-blast flare: dark inside, olive outside.
    k.latheZ('poly', C.polymer3, [[0.0, -0.44], [0.0446, -0.44], [0.058, -0.495], [0.0625, -0.5025]], 28, 0, ty);
    k.latheZ('poly', C.oliveDark, [[0.0625, -0.5025], [0.066, -0.4985], [0.062, -0.485], [0.045, -0.41], [0.04, -0.398]], 28, 0, ty);
    // Ribbed shoulder sleeve and two clamp bands.
    k.latheZ('poly', C.polymer2, [[0.04, -0.335], [0.0465, -0.33], [0.0478, -0.32], [0.0478, -0.075], [0.0465, -0.065], [0.04, -0.06]], 28, 0, ty);
    for (let i = 0; i < 5; i++) {
      const z = -0.29 + i * 0.046;
      k.cylZ('poly', C.polymer3, 0, ty, z, z + 0.006, 0.0484, 0.0484, 28);
    }
    for (const z of [0.105, 0.37]) k.cylZ('metal', C.darkSteel, 0, ty, z, z + 0.014, 0.0422, 0.0422, 28);
    // Trigger housing, pistol grip, trigger guard.
    k.box('poly', C.polymer2, [-0.0165, 0.032, -0.058], [0.0165, 0.068, 0.088], 0.005);
    pistolGrip(k, C.polymer, C.polymer3);
    triggerGroup(k, C, C.blued);
    // Front grip.
    k.box('poly', C.polymer2, [-0.0145, 0.04, 0.17], [0.0145, 0.068, 0.244], 0.004, { seg: 1 });
    k.side('poly', C.polymer, [
      [0.182, 0.046], [0.236, 0.046], [0.232, 0.022], [0.229, -0.008], [0.232, -0.038], [0.226, -0.054],
      [0.19, -0.054], [0.184, -0.04], [0.188, -0.01], [0.184, 0.02],
    ], 0.027, 0.0045);
    // Flip-up sights: an aperture leaf at the rear, a post between ears at the front.
    const leaf = WM._helpers.frontPlate([[-0.014, 0.0], [0.014, 0.0], [0.014, 0.032], [0.009, 0.042], [-0.009, 0.042], [-0.014, 0.032]], 0.004, 0.0008,
      [circle(0.0055, 14, 0, 0.03)], 12);
    k.box('metal', C.blued, [-0.011, 0.132, 0.046], [0.011, 0.146, 0.086], 0.003, { seg: 1 });
    k.put('metal', leaf, C.blued, [0, 0.144, 0.068], [-0.1, 0, 0]);
    k.cylX('metal', C.darkSteel, 0.146, 0.068, -0.0135, 0.0135, 0.0036, 10);
    k.box('metal', C.blued, [-0.01, 0.132, 0.42], [0.01, 0.146, 0.452], 0.003, { seg: 1 });
    k.plate('metal', C.blued, [[-0.013, 0.144], [0.013, 0.144], [0.013, 0.18], [0.008, 0.18], [0.008, 0.156], [-0.008, 0.156], [-0.008, 0.18], [-0.013, 0.18]], 0.004, 0.0008, null, 0.436);
    k.box('poly', C.orange, [-0.0018, 0.154, 0.434], [0.0018, 0.176, 0.438], 0.0006, { seg: 1 });
    // The loaded rocket (its own meshes: it goes when fired, back on reload).
    warhead(k, C, ty, 0.52, 'round');
    return {
      muzzle: V(0, ty, 0.552),
      offHand: V(0, -0.004, 0.209),
      sight: V(0, 0.174, 0.0),
      flashScale: 2,
      twoHanded: true,
    };
  });

  // Boomer GL: fat six-chamber cylinder (40 mm noses showing in the
  // chambers) between a recoil shield and a front frame, short wide barrel,
  // top strap with a ladder sight, front grip, folding stock.
  WM.define('glauncher', function (k, C) {
    const yc = 0.058; // cylinder axis
    const pitch = 0.047; // chamber circle radius
    const yb = yc + pitch; // the top chamber lines up with the barrel
    const R = 0.075;
    const z0 = 0.092, z1 = 0.238;
    // Cylinder: fluted between the chambers, chambers bored through.
    const holes = [];
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 2 + (i * Math.PI) / 3;
      holes.push(circle(0.0215, 12, Math.cos(a) * pitch, yc + Math.sin(a) * pitch));
      grenadeNose(k, C, Math.cos(a) * pitch, yc + Math.sin(a) * pitch, z1 - 0.04, 0.0195, 10);
    }
    k.plate('metal', C.gunmetal2, fluted(R, 6, 0.008, Math.PI / 2 + Math.PI / 6, 30, 0, yc), z1 - z0, 0.003, holes, (z0 + z1) / 2);
    k.cylZ('metal', C.blued, 0, yc, z0 - 0.02, z1 + 0.03, 0.011, 0.011, 14);
    // Recoil shield, rear frame, top strap with rail teeth, front frame.
    k.cylZ('metal', C.gunmetal, 0, yc, z0 - 0.015, z0, 0.0745, 0.0745, 32);
    k.box('metal', C.gunmetal, [-0.021, 0.032, -0.078], [0.021, 0.13, z0 - 0.008], 0.006, { seg: 1 });
    k.box('metal', C.blued, [-0.0125, 0.131, -0.065], [0.0125, 0.145, 0.33], 0.003, { seg: 1 });
    for (let i = 0; i < 27; i++) {
      const z = -0.058 + i * 0.0138;
      k.box('metal', C.blued, [-0.0132, 0.144, z], [0.0132, 0.149, z + 0.0068], 0);
    }
    k.box('metal', C.gunmetal, [-0.03, 0.034, z1 - 0.002], [0.03, 0.14, z1 + 0.024], 0.008, { seg: 1 });
    // Short wide barrel: muzzle ring, bore, an under rail.
    k.latheZ('metal', C.blued, [[0.029, z1 + 0.012], [0.029, 0.372], [0.0315, 0.375], [0.0315, 0.392], [0.029, 0.395],
      [0.0225, 0.395], [0.0215, 0.392], [0.0215, 0.37], [0.0, 0.37]], 24, 0, yb);
    k.disc('poly', C.hole, 0, yb, 0.3702, 0.0214, 20);
    k.box('metal', C.blued, [-0.012, 0.064, z1 + 0.02], [0.012, 0.08, 0.372], 0.002, { seg: 1 });
    // Front grip.
    k.side('poly', C.olive, [
      [0.288, 0.068], [0.336, 0.068], [0.333, 0.048], [0.33, 0.0], [0.333, -0.034], [0.328, -0.05],
      [0.294, -0.05], [0.289, -0.036], [0.292, 0.0], [0.289, 0.048],
    ], 0.028, 0.0045);
    // Ladder sight (leaning back on its hinge) and a front post.
    const ladder = WM._helpers.frontPlate([[-0.014, 0.0], [0.014, 0.0], [0.014, 0.07], [0.01, 0.075], [-0.01, 0.075], [-0.014, 0.07]], 0.0035, 0.0007, [
      [[-0.009, 0.009], [0.009, 0.009], [0.009, 0.023], [-0.009, 0.023]],
      [[-0.009, 0.029], [0.009, 0.029], [0.009, 0.043], [-0.009, 0.043]],
      [[-0.009, 0.049], [0.009, 0.049], [0.009, 0.062], [0.002, 0.066], [-0.002, 0.066], [-0.009, 0.062]],
    ], 8);
    k.box('metal', C.blued, [-0.0125, 0.146, 0.188], [0.0125, 0.155, 0.222], 0.002, { seg: 1 });
    k.put('metal', ladder, C.blued, [0, 0.151, 0.205], [-0.35, 0, 0]);
    k.cylX('metal', C.darkSteel, 0.153, 0.205, -0.0145, 0.0145, 0.0036, 10);
    k.plate('metal', C.blued, [[-0.009, 0.147], [0.009, 0.147], [0.009, 0.166], [0.0055, 0.166], [0.0055, 0.153], [-0.0055, 0.153], [-0.0055, 0.166], [-0.009, 0.166]], 0.008, 0.0008, null, 0.318);
    k.box('poly', C.orange, [-0.0017, 0.149, 0.316], [0.0017, 0.164, 0.32], 0.0006, { seg: 1 });
    // Olive pistol grip, trigger guard and trigger.
    pistolGrip(k, C.olive, C.oliveDark);
    triggerGroup(k, C, C.blued);
    // Folding stock (open): hinge knuckle, skeleton frame, butt pad.
    k.cylY('metal', C.blued, 0, -0.083, 0.06, 0.126, 0.0095, 0.0095, 14);
    k.side('poly', C.olive, [
      [-0.085, 0.124], [-0.33, 0.112], [-0.345, 0.106], [-0.35, 0.09], [-0.35, -0.01], [-0.342, -0.018], [-0.33, -0.018],
      [-0.24, 0.025], [-0.1, 0.06], [-0.085, 0.062],
    ], 0.024, 0.004, [
      [[-0.105, 0.108], [-0.322, 0.098], [-0.322, 0.003], [-0.24, 0.041], [-0.105, 0.073]],
    ]);
    k.box('poly', C.rubber, [-0.0165, -0.024, -0.366], [0.0165, 0.114, -0.348], 0.005, { seg: 1 });
    return {
      muzzle: V(0, yb, 0.3955),
      offHand: V(0, 0.01, 0.311),
      sight: V(0, 0.2, 0.12),
      flashScale: 1.2,
      twoHanded: true,
    };
  });

  // Buzzsaw Minigun: round housing with the motor on top-right, six barrels
  // in three scalloped clamps round a spindle (the cluster is round about its
  // axis, meta.barrels), D-handle grip at the rear, carry handle on top, a
  // segmented feed chute off the left side.
  WM.define('minigun', function (k, C) {
    const yb = 0.1; // barrel cluster axis
    const pitch = 0.026; // barrel circle radius
    // Housing with two raised bands and a rear boss.
    k.latheZ('metal', C.gunmetal, [[0.0, -0.176], [0.03, -0.174], [0.048, -0.165], [0.057, -0.152], [0.06, -0.136], [0.06, 0.088], [0.057, 0.096], [0.0, 0.096]], 28, 0, yb);
    for (const z of [-0.105, 0.035]) k.cylZ('metal', C.gunmetal2, 0, yb, z, z + 0.01, 0.0625, 0.0625, 28);
    k.cylZ('metal', C.darkSteel, 0, yb, -0.186, -0.172, 0.015, 0.015, 16);
    // Rotor housing in front.
    k.latheZ('metal', C.darkSteel, [[0.0, 0.095], [0.053, 0.095], [0.053, 0.166], [0.049, 0.176], [0.0, 0.176]], 28, 0, yb);
    // Barrel cluster: spindle, six barrels, three clamps, the bores. All of it
    // 'chrome' and nothing else is, so it is one mesh that can spin by itself.
    k.cylZ('chrome', C.darkSteel, 0, yb, 0.17, 0.722, 0.0095, 0.0095, 12);
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 6 + (i * Math.PI) / 3;
      const x = Math.cos(a) * pitch, y = yb + Math.sin(a) * pitch;
      k.cylZ('chrome', C.blued, x, y, 0.17, 0.744, 0.0082, 0.0082, 12);
      k.disc('chrome', C.hole, x, y, 0.7442, 0.0048, 10);
    }
    for (const [z, d] of [[0.2, 0.024], [0.452, 0.02], [0.69, 0.026]]) {
      k.plate('chrome', C.gunmetal, fluted(0.041, 6, 0.0065, 0, 36, 0, yb), d, 0.0025, null, z + d / 2);
    }
    // Motor on the top right: ribbed can, domed caps, an amber band, saddle.
    const mx = -0.05, my = yb + 0.05;
    k.boxC('metal', C.gunmetal2, [-0.034, yb + 0.034, -0.03], [0.026, 0.03, 0.16], 0.004, [0, 0, Math.PI / 4], 1);
    k.cylZ('metal', C.blued, mx, my, -0.12, 0.06, 0.025, 0.025, 20);
    for (let i = 0; i < 5; i++) {
      const z = -0.104 + i * 0.03;
      k.cylZ('metal', C.gunmetal2, mx, my, z, z + 0.007, 0.0268, 0.0268, 20);
    }
    k.latheZ('metal', C.blued, [[0.0, -0.136], [0.015, -0.134], [0.022, -0.127], [0.025, -0.12]], 20, mx, my);
    k.latheZ('metal', C.blued, [[0.025, 0.06], [0.021, 0.068], [0.012, 0.072], [0.0, 0.0725]], 20, mx, my);
    k.cylZ('poly', C.amber, mx, my, 0.044, 0.052, 0.0262, 0.0262, 20);
    // Rear handle: grip mount, pistol grip, a D-guard bow down to the grip cap.
    k.box('poly', C.polymer2, [-0.016, 0.026, -0.056], [0.016, 0.052, 0.094], 0.005);
    pistolGrip(k, C.polymer, C.polymer2);
    k.box('metal', C.blued, [-0.0145, -0.075, -0.034], [0.0145, -0.06, 0.012], 0.003, { seg: 1 });
    k.side('metal', C.blued, [
      [0.074, 0.04], [0.09, 0.04], [0.09, -0.01], [0.084, -0.046, 0.052, -0.07], [0.02, -0.075], [0.0, -0.075],
      [0.0, -0.062], [0.02, -0.062], [0.048, -0.058, 0.066, -0.04], [0.075, -0.01],
    ], 0.012, 0.002, null, 0, 8);
    k.side('metal', C.darkSteel, [[0.037, 0.037], [0.0398, 0.026], [0.0388, 0.018], [0.0362, 0.0165], [0.034, 0.022], [0.0337, 0.037]], 0.006, 0.0012);
    // Carry handle on top with a rubber grip for the support hand.
    k.side('poly', C.polymer, [
      [-0.05, 0.152], [-0.042, 0.236, -0.02, 0.244], [0.15, 0.244], [0.172, 0.236, 0.178, 0.148], [0.156, 0.148],
      [0.152, 0.222, 0.138, 0.226], [-0.008, 0.226], [-0.024, 0.222, -0.028, 0.155],
    ], 0.02, 0.003, null, 0, 8);
    k.box('poly', C.rubber, [-0.0135, 0.222, 0.02], [0.0135, 0.248, 0.12], 0.007);
    // Feed port on the left and the segmented ammo chute curving back.
    k.box('metal', C.gunmetal2, [0.048, 0.068, -0.09], [0.078, 0.13, 0.02], 0.006);
    const P = [[0.075, 0.1, -0.035], [0.135, 0.1, -0.05], [0.15, 0.065, -0.17], [0.118, 0.012, -0.29]];
    const n = 9;
    for (let i = 0; i < n; i++) {
      const a = bezier(P[0], P[1], P[2], P[3], i / n);
      const b = bezier(P[0], P[1], P[2], P[3], (i + 1) / n);
      const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const len = Math.hypot(d[0], d[1], d[2]);
      const c = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
      k.boxC('poly', i % 2 ? C.polymer2 : C.polymer, c, [0.03, len * 0.88, 0.058], 0.005, alongRot(d, [0, 1, 0]), 1);
    }
    const end = bezier(P[0], P[1], P[2], P[3], 1);
    const tail = [P[3][0] - P[2][0], P[3][1] - P[2][1], P[3][2] - P[2][2]];
    k.boxC('metal', C.darkSteel, end, [0.036, 0.012, 0.066], 0.003, alongRot(tail, [0, 1, 0]), 1);
    // Casing chute under the right side.
    k.box('metal', C.blued, [-0.052, 0.028, 0.0], [-0.024, 0.05, 0.07], 0.004, { seg: 1 });
    k.box('metal', C.hole, [-0.048, 0.0265, 0.006], [-0.028, 0.03, 0.064], 0.001, { seg: 1 });
    return {
      muzzle: V(0, yb, 0.7445),
      barrels: V(0, yb, 0.457),
      offHand: V(0, 0.235, 0.07),
      eject: V(-0.038, 0.027, 0.035),
      flashScale: 1.1,
      twoHanded: true,
    };
  });

  // ------------------------------------------------------------ thrown
  // Limpet charge: a dark puck 0.2 m across, magnetic steel base forward (+Z,
  // the side that sticks), keypad face toward the thrower (-Z) with a screen,
  // a red LED and a hazard ring, and a stub antenna. Laid flat as a pickup.
  WM.define('limpet', function (k, C) {
    // Drawn at 11 cm across, then grown to about 20 cm (a little less in depth).
    scaled(k, [1.8, 1.8, 1.4], () => {
      const body = 0x30352d;
      k.latheZ('poly', body, [[0.0, -0.0185], [0.047, -0.0185], [0.0525, -0.014], [0.0545, -0.007], [0.0545, 0.003], [0.052, 0.009], [0.047, 0.0125], [0.0, 0.0125]], 32);
      // Grip notches round the rim.
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        k.boxC('poly', C.polymer3, [Math.cos(a) * 0.0546, Math.sin(a) * 0.0546, -0.002], [0.0024, 0.0065, 0.011], 0, [0, 0, a], 1);
      }
      // Magnetic base: steel plate and three pads.
      k.latheZ('metal', C.darkSteel, [[0.0, 0.011], [0.0455, 0.011], [0.047, 0.0128], [0.047, 0.0178], [0.0455, 0.0195], [0.0, 0.0195]], 32);
      for (let i = 0; i < 3; i++) {
        const a = Math.PI / 2 + (i * Math.PI * 2) / 3;
        k.cylZ('chrome', C.stainless2, Math.cos(a) * 0.026, Math.sin(a) * 0.026, 0.019, 0.0225, 0.0115, 0.0115, 18);
      }
      // Hazard ring: eight amber dashes on the face.
      for (let i = 0; i < 8; i++) {
        const g = new THREE.RingGeometry(0.0405, 0.0465, 4, 1, (i / 8) * Math.PI * 2, Math.PI / 8);
        k.put('poly', g, C.amber, [0, 0, -0.0187], [0, Math.PI, 0]);
      }
      // Console: screen, two rows of keys, the LED in its bezel.
      k.box('poly', C.polymer, [-0.022, -0.021, -0.0262], [0.022, 0.017, -0.016], 0.004, { seg: 1 });
      k.box('chrome', 0x2f7a58, [-0.016, 0.004, -0.0268], [0.016, 0.0125, -0.0255], 0.0008, { seg: 1 });
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 3; c++) {
          const x = -0.011 + c * 0.011, y = -0.0055 - r * 0.0085;
          k.box('poly', 0x8a9099, [x - 0.0038, y - 0.0028, -0.0285], [x + 0.0038, y + 0.0028, -0.0255], 0.001, { seg: 1 });
        }
      }
      k.cylZ('metal', C.darkSteel, 0, 0.03, -0.0215, -0.017, 0.0064, 0.0064, 14);
      k.put('poly', new THREE.SphereGeometry(0.0046, 14, 8), 0xff2a2a, [0, 0.03, -0.0215]);
      // Antenna: a stub at the rim with a whip and an orange tip.
      k.rod('metal', C.darkSteel, [-0.031, 0.037, -0.011], [-0.04, 0.048, -0.016], 0.0042, 10);
      k.rod('metal', C.polymer3, [-0.038, 0.045, -0.015], [-0.058, 0.082, -0.03], 0.0018, 8);
      k.put('poly', new THREE.SphereGeometry(0.0034, 10, 6), C.orange, [-0.058, 0.082, -0.03]);
    });
    return {
      muzzle: V(0, 0, 0),
      layFlat: true,
      twoHanded: false,
    };
  });

  // -------------------------------------------------------- projectiles
  // Rocket in flight: the Thunderhead warhead on an olive motor, four swept
  // fins and a nozzle at the back. Centred on the origin, nose to +Z.
  WM.define('rocket', function (k, C) {
    warhead(k, C, 0, 0.018);
    k.cylZ('poly', C.olive, 0, 0, -0.238, 0.032, 0.0225, 0.0225, 18);
    k.cylZ('metal', C.gunmetal2, 0, 0, -0.012, 0.004, 0.0236, 0.0236, 18);
    k.latheZ('metal', C.darkSteel, [[0.0, -0.25], [0.012, -0.25], [0.0165, -0.271], [0.0195, -0.275], [0.0222, -0.27], [0.0226, -0.236]], 18);
    for (let i = 0; i < 4; i++) {
      const fin = WM._helpers.sideProfile([[-0.268, 0.018], [-0.262, 0.056], [-0.25, 0.058], [-0.2, 0.024], [-0.188, 0.018]], 0.0035, 0.0009);
      k.put('poly', fin, C.oliveDark, [0, 0, 0], [0, 0, Math.PI / 4 + (i * Math.PI) / 2]);
    }
    return { muzzle: V(0, 0, 0) };
  });

  // 40 mm grenade in flight: brass case and primer, olive projectile with a
  // copper driving band and an amber stripe, gold fuze tip. Centred, nose to +Z.
  WM.define('gl_grenade', function (k, C) {
    k.latheZ('chrome', C.gold, [[0.0, -0.05], [0.0205, -0.05], [0.0215, -0.0488], [0.0215, -0.0455], [0.0188, -0.0445],
      [0.0188, -0.0415], [0.0202, -0.0405], [0.0202, -0.005], [0.019, -0.0035]], 24);
    k.disc('chrome', C.stainless, 0, 0, -0.0502, 0.0052, 14, true);
    k.latheZ('poly', C.olive, [[0.0, -0.006], [0.0192, -0.006], [0.0195, -0.003], [0.0195, 0.017]], 24);
    k.cylZ('chrome', 0xb06a3c, 0, 0, 0.0, 0.006, 0.0199, 0.0199, 24);
    k.cylZ('poly', C.amber, 0, 0, 0.009, 0.0125, 0.0197, 0.0197, 24);
    grenadeNose(k, C, 0, 0, 0.017, 0.0195);
    return { muzzle: V(0, 0, 0) };
  });
})();
