/*
 * models/skylark.js — the Skylark S2 (Ardea), a light high-wing four-seater:
 * the trainer and runabout parked on the general aviation apron.
 *
 * Built with the aircraft model kit (aircraft.js): a lofted fuselage with a
 * cowling, spinner and intakes, a framed wraparound windscreen, doors with
 * windows, a rear roof window, a high airfoil wing with flaps, ailerons and
 * streamlined struts, a swept fin with a dorsal fillet and rudder, a
 * tailplane with elevators, fixed tricycle gear in wheel spats, and a
 * two-blade propeller. The colour is the livery: the swoosh along the
 * sides, the spinner, wing tips, fin band and spats. Sizes and pivots match
 * SPECS.skylark (8.5 m long, 11 m span, prop at z 4.32, wheels on y = 0).
 */
(function () {
  'use strict';

  const VH = window.VH;

  const WHITE = 0xf3f4f2;
  const SEAM = 0xc4c8cc; //   panel lines
  const LINE = 0x9a9ea3; //   door and hatch outlines
  const FRAME = 0x2a2f35; //  window seals
  const WINDOW = 0x18202a;
  const DARK = 0x24272b;
  const METAL = 0xb9bec4;
  const RUBBER = 0x161718;
  const TIP = 0xf2c500; //    propeller tip warning paint
  const REG = 'S2-HAL'; //    the registration on the tail cone

  // Seven-segment strokes for the registration letters.
  const FONT = { S: 'afgcd', 2: 'abged', '-': 'g', H: 'bcefg', A: 'abcefg', L: 'def' };

  function shade(hex, k) {
    const r = Math.min(255, Math.round(((hex >> 16) & 255) * k));
    const g = Math.min(255, Math.round(((hex >> 8) & 255) * k));
    const b = Math.min(255, Math.round((hex & 255) * k));
    return (r << 16) | (g << 8) | b;
  }
  const lerp = (a, b, t) => a + (b - a) * t;
  const ss = (a, b, x) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };

  /** Copy a kit's triangles into another, moved by a matrix (the propeller blades). */
  function place(dst, src, mtx) {
    const nm = new THREE.Matrix3().getNormalMatrix(mtx);
    const v = new THREE.Vector3();
    const P = src.pos, N = src.nor, C = src.col;
    const pt = (i) => (v.set(P[i], P[i + 1], P[i + 2]).applyMatrix4(mtx), [v.x, v.y, v.z]);
    const nr = (i) => (v.set(N[i], N[i + 1], N[i + 2]).applyMatrix3(nm).normalize(), [v.x, v.y, v.z]);
    const cl = (i) => [C[i], C[i + 1], C[i + 2]];
    for (let i = 0; i < P.length; i += 9) dst.tri(pt(i), pt(i + 3), pt(i + 6), nr(i), nr(i + 3), nr(i + 6), cl(i), cl(i + 3), cl(i + 6));
  }

  VH.AircraftDefs = VH.AircraftDefs || {};
  VH.AircraftDefs.skylark = function (c, Kit) {
    const k = new Kit(); //  paint
    const m = new Kit(); //  bare metal
    const r = new Kit(); //  rubber and matte black
    const gl = new Kit(); // glass
    const deep = shade(c, 0.62);

    // ---------------------------------------------------------- fuselage
    // Stations by the top and bottom lines: cowling, windscreen, the cabin
    // under the wing, then the tail cone sweeping up to the fin.
    const st = (z, top, bot, w, n) => ({ z, y: (top + bot) / 2, h: (top - bot) / 2, w, n });
    const body = k.loft([
      st(4.256, 1.475, 0.935, 0.27, 2.2), // the nose bowl round the spinner
      st(4.25, 1.6, 0.8, 0.42, 2.4),
      st(4.2, 1.665, 0.74, 0.5, 2.6),
      st(4.05, 1.715, 0.71, 0.56, 2.8),
      st(3.5, 1.77, 0.7, 0.605, 2.9),
      st(2.7, 1.83, 0.7, 0.625, 3),
      st(2.3, 1.88, 0.705, 0.635, 3),
      st(1.85, 2.1, 0.71, 0.64, 3),
      st(1.4, 2.27, 0.715, 0.64, 3),
      st(0.9, 2.3, 0.72, 0.64, 3),
      st(-0.1, 2.29, 0.75, 0.635, 3),
      st(-0.6, 2.18, 0.8, 0.6, 2.9),
      st(-1.3, 1.97, 0.9, 0.52, 2.8),
      st(-2.2, 1.82, 1.06, 0.4, 2.6),
      st(-3.2, 1.71, 1.24, 0.25, 2.4),
      st(-3.9, 1.64, 1.36, 0.13, 2.2),
      st(-4.15, 1.585, 1.455, 0.05, 2),
    ], WHITE, {
      seg: 32,
      steps: 4,
      zBands: [[2.42, 2.435, SEAM], [-1.435, -1.42, SEAM], [-2.865, -2.85, SEAM]],
      caps: { front: DARK },
    });
    const roof = (z) => body.centre(z) + body.height(z);

    // s (the angle round the body from the top) where the skin is at height y.
    const sAt = (z, y) => {
      let a = 0, b = Math.PI;
      for (let i = 0; i < 22; i++) {
        const mid = (a + b) / 2;
        if (body.at(z, mid, 1).p.y > y) a = mid;
        else b = mid;
      }
      return (a + b) / 2;
    };
    const val = (f, z) => (typeof f === 'function' ? f(z) : f);
    // Paint or glass on the side between heights bot(z) and top(z) (numbers or functions), in n strips.
    const area = (kit, z0, z1, top, bot, side, color, lift, n, ns) => {
      n = n || 1;
      for (let i = 0; i < n; i++) {
        const za = lerp(z0, z1, i / n), zb = lerp(z0, z1, (i + 1) / n);
        kit.patch(body, za, zb, [sAt(za, val(top, za)), sAt(za, val(bot, za))], [sAt(zb, val(top, zb)), sAt(zb, val(bot, zb))], side, color, { lift, nz: 2, ns: ns || 3 });
      }
    };
    // A window: a dark seal round the glass.
    const pane = (z0, z1, top, bot, side, n) => {
      const e = 0.03;
      area(k, z0 + e, z1 - e, (z) => val(top, z) + e, (z) => val(bot, z) - e, side, FRAME, 0.007, n, 4);
      area(gl, z0, z1, top, bot, side, WINDOW, 0.013, n, 4);
    };

    // The windscreen wraps down to the A-pillar; the door window's front follows it.
    const pillar = (z) => 1.64 + (2.36 - z) * 0.62;
    const doorTop = (z) => Math.min(2.18, pillar(z + 0.2));
    const rearTop = (z) => Math.min(2.14, roof(z) - 0.17);
    for (const side of [1, -1]) {
      // Windscreen (from the centre line down to the pillar), its seal.
      area(k, 2.39, 1.38, Infinity, (z) => pillar(z) - 0.03, side, FRAME, 0.007, 4, 6);
      area(gl, 2.36, 1.4, Infinity, pillar, side, WINDOW, 0.013, 4, 6);
      // Door window, rear side window, the roof window behind the wing.
      pane(2.14, 0.5, doorTop, 1.6, side, 4);
      pane(0.36, -0.62, rearTop, 1.6, side, 3);
      area(k, -0.13, -0.95, Infinity, (z) => roof(z) - 0.11, side, FRAME, 0.007, 3, 4);
      area(gl, -0.16, -0.92, Infinity, (z) => roof(z) - 0.08, side, WINDOW, 0.013, 3, 4);
      // Door outline: front (straight, then along the pillar), back, bottom.
      area(k, 2.266, 2.254, 1.642, 0.9, side, LINE, 0.009);
      area(k, 2.26, 1.31, (z) => pillar(z) - 0.054, (z) => pillar(z) - 0.066, side, LINE, 0.009, 3, 1);
      area(k, 0.432, 0.42, 2.2, 0.9, side, LINE, 0.009);
      area(k, 2.26, 0.42, 0.906, 0.894, side, LINE, 0.009, 2, 1);
      m.decal(body, 0.56, sAt(0.56, 1.42), side, 0.14, 0.03, METAL, { lift: 0.02 }); // handle
    }
    // Baggage door on the left, behind the cabin.
    area(k, -0.95, -0.962, 1.36, 0.95, 1, LINE, 0.009);
    area(k, -1.35, -1.362, 1.36, 0.95, 1, LINE, 0.009);
    area(k, -0.95, -1.362, 1.366, 1.354, 1, LINE, 0.009, 1, 1);
    area(k, -0.95, -1.362, 0.956, 0.944, 1, LINE, 0.009, 1, 1);

    // The livery: a swoosh along each side that sweeps up the tail cone, with a pinstripe.
    const mid = (z) => 1.12 + 0.36 * ss(0, -3.4, z);
    const half = (z) => 0.075 - 0.035 * ss(-0.5, -3.8, z);
    for (const side of [1, -1]) {
      area(k, 4.06, -3.95, (z) => mid(z) + half(z), (z) => mid(z) - half(z), side, c, 0.006, 32, 2);
      area(k, 4.0, -3.92, (z) => mid(z) + half(z) + 0.06, (z) => mid(z) + half(z) + 0.035, side, deep, 0.006, 32, 1);
    }

    // Registration, seven-segment letters on both sides of the tail cone.
    const SEG = (cw, ch, sw) => ({
      a: [0, ch / 2 - sw / 2, cw, sw], g: [0, 0, cw, sw], d: [0, -ch / 2 + sw / 2, cw, sw],
      b: [cw / 2 - sw / 2, ch / 4, sw, ch / 2], c: [cw / 2 - sw / 2, -ch / 4, sw, ch / 2],
      f: [-cw / 2 + sw / 2, ch / 4, sw, ch / 2], e: [-cw / 2 + sw / 2, -ch / 4, sw, ch / 2],
    });
    const seg = SEG(0.1, 0.17, 0.024);
    for (const side of [1, -1]) {
      const dir = side > 0 ? -1 : 1; // reads left to right from either side
      const zA = side > 0 ? -1.18 : -1.18 - 0.145 * (REG.length - 1);
      for (let i = 0; i < REG.length; i++) {
        const zc = zA + dir * 0.145 * i;
        for (const sg of FONT[REG[i]] || '') {
          const [u, v, w, h] = seg[sg];
          const z = zc + dir * u;
          k.decal(body, z, sAt(z, 1.64 + v), side, w, h, DARK, { lift: 0.008 });
        }
      }
    }

    // ------------------------------------------------------------- nose
    // Spinner (it doesn't change as it turns, so it stays on the body).
    k.lathe([[0.255, 0], [0.255, 0.08], [0.245, 0.15], [0.215, 0.22], [0.165, 0.28], [0.095, 0.325], [0.035, 0.34], [0.001, 0.348]], 20, 0, 1.2, 4.21, c);
    // Round cooling intakes in the nose bowl either side of the spinner, the air exit under the cowl.
    const faceZ = (w) => {
      let a = 4.25, b = 4.256;
      for (let i = 0; i < 20; i++) {
        const zm = (a + b) / 2;
        if (body.width(zm) > w) a = zm;
        else b = zm;
      }
      return (a + b) / 2;
    };
    for (const side of [1, -1]) r.decal(body, faceZ(0.35), Math.PI / 2 + 0.12, side, 0.11, 0.12, DARK, { round: 1, lift: 0.004 });
    for (const side of [1, -1]) k.patch(body, 2.46, 2.66, [Math.PI - 0.55, Math.PI], [Math.PI - 0.55, Math.PI], side, DARK, { lift: 0.006 });
    // Cowling split line and the oil door.
    for (const side of [1, -1]) area(k, 4.05, 2.44, 1.392, 1.38, side, SEAM, 0.005, 6, 1);
    k.patch(body, 3.18, 3.56, [0.14, 0.58], [0.14, 0.58], -1, LINE, { lift: 0.005, ns: 4 });
    k.patch(body, 3.2, 3.54, [0.16, 0.56], [0.16, 0.56], -1, WHITE, { lift: 0.008, ns: 4 });
    // Exhaust stub under the cowl on the right, the air filter scoop.
    m.cyl(0.035, 0.042, 0.24, 8, -0.27, 0.66, 2.56, 0x6e655c, -0.5);
    r.sphere(0.07, 1.3, 0.5, 1.2, 0, 0.74, 3.95, DARK, 10, 6);

    // ------------------------------------------------------------- wings
    // A constant-chord inner panel and a tapered outer one with a touch of
    // dihedral; flaps and ailerons are separate surfaces behind a gap.
    const Y = (x) => 2.3 + 0.06 * (Math.abs(x) / 5.5);
    const LE = (x) => (x < 2.7 ? 1.36 : 1.36 - (0.06 * (x - 2.7)) / 2.6);
    const TE = (x) => (x < 2.7 ? -0.06 : -0.06 + (0.24 * (x - 2.7)) / 2.6);
    const CS = 0.34; // control surface chord
    const fixed = (x, t) => ({ x, y: Y(x), z: LE(x), c: LE(x) - TE(x) - CS - 0.02, t });
    const surf = (x) => ({ x, y: Y(x), z: TE(x) + CS, c: CS, t: 0.16 });
    const fr = (x, x0, x1) => (x - x0) / (x1 - x0);
    // Centre section over the cabin.
    k.wing([{ x: 0, y: Y(0), z: 1.36, c: 1.42, t: 0.13 }, { x: 0.66, y: Y(0.66), z: 1.36, c: 1.42, t: 0.13 }], WHITE, { mirror: true, camber: 0.02 });
    k.wing([fixed(0.62, 0.175), fixed(2.7, 0.175), fixed(5.29, 0.16)], WHITE, { mirror: true, camber: 0.02, bands: [[fr(5.1, 0.62, 5.29), 1.01, c]] });
    k.wing([surf(0.68), surf(2.74)], WHITE, { mirror: true }); // flaps
    k.wing([surf(2.8), surf(5.24)], WHITE, { mirror: true, bands: [[fr(5.1, 2.8, 5.24), 1.01, c]] }); // ailerons
    // Rounded tips in the livery colour, carrying the nav lights.
    k.wing([
      { x: 5.26, y: Y(5.26), z: LE(5.26), c: LE(5.26) - TE(5.26), t: 0.115 },
      { x: 5.42, y: Y(5.42) - 0.005, z: LE(5.42) - 0.02, c: LE(5.42) - TE(5.42) - 0.08, t: 0.09 },
      { x: 5.5, y: Y(5.5) - 0.01, z: 1.16, c: 0.72, t: 0.06 },
    ], c, { mirror: true, camber: 0.01 });
    for (const s of [1, -1]) gl.sphere(0.055, 0.8, 0.8, 1.5, s * 5.5, 2.36, 0.6, WINDOW, 10, 6);
    // Streamlined struts from the lower fuselage to the wing.
    k.wing([{ x: 0.5, y: 0.97, z: 0.82, c: 0.2, t: 0.28 }, { x: 2.62, y: 2.27, z: 0.84, c: 0.2, t: 0.28 }], WHITE, { mirror: true });
    // Fuel caps, the landing light in the left wing, the pitot tube under it.
    for (const s of [1, -1]) m.cyl(0.04, 0.04, 0.014, 10, s * 1.1, 2.424, 0.95, 0x8d939a, Math.PI / 2);
    gl.sphere(0.065, 1.4, 0.7, 0.55, 2.25, Y(2.25) - 0.005, 1.36, WINDOW, 10, 6);
    m.strut([3.3, 2.28, 1.12], [3.3, 2.17, 1.17], 0.012, METAL);
    m.strut([3.3, 2.17, 1.0], [3.3, 2.17, 1.48], 0.014, METAL);

    // -------------------------------------------------------------- tail
    // Dorsal fillet, fin, rudder and a fin cap; the livery band runs across fin and rudder.
    const finBands = (y0, y1) => [[fr(1.98, y0, y1), fr(2.34, y0, y1), c], [fr(2.4, y0, y1), fr(2.45, y0, y1), deep]];
    k.wing([{ x: 0, y: 1.75, z: -1.6, c: 1.25, t: 0.06 }, { x: 0, y: 1.95, z: -2.875, c: 0.35, t: 0.1 }], WHITE, { axis: 'y' });
    k.wing([{ x: 0, y: 1.55, z: -2.55, c: 1.29, t: 0.1 }, { x: 0, y: 2.68, z: -3.48, c: 0.38, t: 0.15 }], WHITE, { axis: 'y', bands: finBands(1.55, 2.68) });
    k.wing([{ x: 0, y: 1.45, z: -3.87, c: 0.36, t: 0.13 }, { x: 0, y: 2.66, z: -3.88, c: 0.31, t: 0.15 }], WHITE, { axis: 'y', bands: finBands(1.45, 2.66) });
    k.wing([
      { x: 0, y: 2.66, z: -3.47, c: 0.73, t: 0.085 },
      { x: 0, y: 2.73, z: -3.5, c: 0.7, t: 0.075 },
      { x: 0, y: 2.77, z: -3.58, c: 0.58, t: 0.05 },
    ], WHITE, { axis: 'y' });
    // Beacon on top (the strobe flashes on it).
    m.cyl(0.03, 0.04, 0.07, 10, 0, 2.8, -3.9, DARK, Math.PI / 2);
    gl.sphere(0.035, 1, 0.9, 1, 0, 2.84, -3.9, WINDOW, 8, 6);
    // Tailplane and elevators.
    k.wing([{ x: 0, y: 1.42, z: -3.0, c: 0.8, t: 0.1 }, { x: 1.72, y: 1.44, z: -3.2, c: 0.6, t: 0.1 }], WHITE, { mirror: true, bands: [[fr(1.52, 0, 1.72), 1.01, c]] });
    k.wing([{ x: 0.07, y: 1.42, z: -3.82, c: 0.4, t: 0.08 }, { x: 1.6, y: 1.44, z: -3.82, c: 0.38, t: 0.08 }, { x: 1.72, y: 1.44, z: -3.82, c: 0.3, t: 0.08 }], WHITE, { mirror: true, bands: [[fr(1.52, 0.07, 1.72), 1.01, c]] });
    // Antennas: a blade and a whip on the tail cone, one under the belly.
    r.slab([[-1.45, 1.9], [-1.62, 1.9], [-1.74, 2.13], [-1.66, 2.13]], -0.012, 0.012, DARK, 'zy');
    r.strut([0, 1.78, -2.45], [0, 2.08, -2.78], 0.01, DARK);
    r.slab([[-0.75, 0.84], [-0.88, 0.84], [-0.93, 0.64], [-0.87, 0.64]], -0.012, 0.012, DARK, 'zy');

    // -------------------------------------------------------------- gear
    // Spring-steel main legs into wheel spats; the nose leg is an oleo strut.
    k.wing([{ x: 0.28, y: 0.8, z: 0.6, c: 0.14, t: 0.22 }, { x: 1.0, y: 0.36, z: 0.57, c: 0.12, t: 0.22 }], WHITE, { mirror: true });
    // Teardrop wheel spats: round nose, pointed tail, the tyre showing underneath.
    const spat = (x, z, len, w, hgt, y) => k.loft([
      { z: z + len * 0.5, w: 0.02, h: 0.02, y },
      { z: z + len * 0.42, w: w * 0.7, h: hgt * 0.68, y },
      { z: z + len * 0.28, w: w * 0.94, h: hgt * 0.95, y },
      { z: z + len * 0.06, w, h: hgt, y },
      { z: z - len * 0.2, w: w * 0.86, h: hgt * 0.82, y: y + 0.015 },
      { z: z - len * 0.42, w: w * 0.45, h: hgt * 0.45, y: y + 0.05 },
      { z: z - len * 0.58, w: 0.015, h: 0.02, y: y + 0.08 },
    ], WHITE, { x, seg: 18, steps: 3, bands: [[1.32, 1.6, c]] });
    for (const s of [1, -1]) {
      const x = s * 1.12;
      r.tyre(0.3, 0.17, x, 0.3, 0.5, RUBBER, 18);
      m.cyl(0.13, 0.13, 0.18, 14, x, 0.3, 0.5, METAL, 0, Math.PI / 2);
      spat(x, 0.5, 1.0, 0.145, 0.215, 0.43);
    }
    r.tyre(0.25, 0.14, 0, 0.25, 2.95, RUBBER, 16);
    m.cyl(0.1, 0.1, 0.15, 12, 0, 0.25, 2.95, METAL, 0, Math.PI / 2);
    spat(0, 2.95, 0.82, 0.12, 0.185, 0.37);
    m.cyl(0.032, 0.032, 0.3, 8, 0, 0.6, 2.97, METAL, Math.PI / 2);
    m.cyl(0.05, 0.05, 0.16, 10, 0, 0.74, 2.99, 0x7d838a, Math.PI / 2);
    m.box(0.02, 0.12, 0.05, 0.05, 0.62, 2.92, 0x7d838a);

    // --------------------------------------------------------- propeller
    // Two blades round the pivot, at a fixed pitch, with warning-yellow tips.
    const blade = new Kit();
    blade.wing([
      { x: 0, y: 0.12, z: 0.035, c: 0.1, t: 0.3 },
      { x: 0, y: 0.3, z: 0.05, c: 0.15, t: 0.18 },
      { x: 0, y: 0.55, z: 0.055, c: 0.16, t: 0.13 },
      { x: 0, y: 0.82, z: 0.045, c: 0.13, t: 0.11 },
      { x: 0, y: 0.95, z: 0.035, c: 0.1, t: 0.1 },
      { x: 0, y: 1.0, z: 0.02, c: 0.05, t: 0.1 },
    ], DARK, { axis: 'y', bands: [[0.9, 1.01, TIP]] });
    const prop = new Kit();
    const pitch = new THREE.Matrix4().makeRotationY(-(Math.PI / 2 - 0.38));
    for (const a of [0, Math.PI]) place(prop, blade, new THREE.Matrix4().makeRotationZ(a).multiply(pitch));

    return {
      kit: k, metal: m, matte: r, glass: gl,
      lights: [['red', 5.5, 2.36, 0.6, 0.07], ['green', -5.5, 2.36, 0.6, 0.07], ['white', 0, 2.78, -4.0, 0.06]],
      strobe: [0, 2.9, -3.9],
      prop: { kit: prop, at: [0, 1.2, 4.32], disc: 1.0 },
    };
  };
})();
