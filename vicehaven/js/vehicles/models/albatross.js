/*
 * models/albatross.js — the Albatross 300, a twin-jet airliner (the one you
 * can steal at Vicehaven International, and the ones flying over the city).
 *
 * Built with the aircraft model kit (aircraft.js): a lofted fuselage with a
 * painted cheatline, belly and tail cone, rows of cabin windows and doors as
 * decals, swept airfoil wings with winglets, two turbofans on pylons, and
 * proper gear. The colour is the airline's: the cheatline, the engines and
 * the fin. Sizes and pivots match SPECS.albatross (38 m long, 34 m span).
 */
(function () {
  'use strict';

  const VH = window.VH;

  const WHITE = 0xf3f4f2;
  const SKIN = 0xd9dde1; //    wings and tailplane (painted grey)
  const BELLY = 0xb7bcc2;
  const DARK = 0x23262b;
  const WINDOW = 0x18202a;
  const DOOR = 0xe2e5e8;
  const METAL = 0xb4b9bf;
  const RUBBER = 0x17181a;
  const SUN = [0xffb347, 0xff7a59, 0xff4f8b]; // the Vicehaven sunset on the tail

  function shade(hex, k) {
    const r = Math.min(255, Math.round(((hex >> 16) & 255) * k));
    const g = Math.min(255, Math.round(((hex >> 8) & 255) * k));
    const b = Math.min(255, Math.round((hex & 255) * k));
    return (r << 16) | (g << 8) | b;
  }

  VH.AircraftDefs = VH.AircraftDefs || {};
  VH.AircraftDefs.albatross = function (c, Kit) {
    const k = new Kit(); //  paint
    const m = new Kit(); //  bare metal
    const r = new Kit(); //  rubber and matte black
    const gl = new Kit(); // glass
    const lit = new Kit(); // cabin windows (lit at night)
    const deep = shade(c, 0.72);

    // ---------------------------------------------------------- fuselage
    const body = k.loft([
      { z: 19.05, w: 0.04, h: 0.04, y: 3.22 },
      { z: 18.7, w: 0.6, h: 0.68, y: 3.28 },
      { z: 18.0, w: 1.14, h: 1.28, y: 3.4 },
      { z: 17.0, w: 1.58, h: 1.74, y: 3.5 },
      { z: 15.5, w: 1.94, h: 2.04, y: 3.57 },
      { z: 13.5, w: 2.08, h: 2.15, y: 3.6 },
      { z: -9.0, w: 2.08, h: 2.15, y: 3.6 },
      { z: -12.0, w: 1.98, h: 1.94, y: 3.76 },
      { z: -14.5, w: 1.6, h: 1.48, y: 4.16 },
      { z: -16.6, w: 1.06, h: 0.94, y: 4.56 },
      { z: -18.3, w: 0.5, h: 0.44, y: 4.86 },
      { z: -19.0, w: 0.24, h: 0.22, y: 4.96 },
    ], WHITE, {
      seg: 36,
      steps: 4,
      bands: [[1.6, 1.79, c], [1.79, 1.86, deep], [2.12, Math.PI + 0.01, BELLY]],
      zBands: [[-19.1, -16.9, c]],
      caps: { back: DARK },
    });

    // Cabin windows, both sides, with gaps at the doors and the overwing exits.
    for (const side of [1, -1]) {
      for (let z = 13.7; z > -11.3; z -= 0.53) {
        if ((z < 1.45 && z > 0.05) || z > 14.1) continue;
        lit.decal(body, z, 1.3, side, 0.25, 0.36, WINDOW, { round: 1, lift: 0.014 });
      }
      // Doors: an outline, the panel (curved to the skin) and its window.
      for (const [z, wdt, hgt, s] of [[15.0, 0.84, 1.8, 1.42], [-11.9, 0.84, 1.8, 1.42], [0.75, 0.52, 0.95, 1.3]]) {
        const ds = hgt / 2 / 2.1;
        const os = (hgt + 0.08) / 2 / 2.1;
        k.patch(body, z - wdt / 2 - 0.04, z + wdt / 2 + 0.04, [s - os, s + os], [s - os, s + os], side, shade(WHITE, 0.8), { lift: 0.006, ns: 6 });
        k.patch(body, z - wdt / 2, z + wdt / 2, [s - ds, s + ds], [s - ds, s + ds], side, DOOR, { lift: 0.01, ns: 6 });
        lit.decal(body, z, 1.3, side, 0.24, 0.34, WINDOW, { round: 1, lift: 0.016 });
      }
      // Cockpit glazing: the windscreen and two side panes, with frames between.
      gl.patch(body, 17.78, 18.36, [0.1, 0.84], [0.1, 0.62], side, WINDOW, { lift: 0.016 });
      gl.patch(body, 17.18, 17.66, [0.58, 1.0], [0.52, 0.95], side, WINDOW, { lift: 0.016 });
      gl.patch(body, 16.62, 17.06, [0.7, 1.06], [0.64, 1.04], side, WINDOW, { lift: 0.016 });
    }
    // Antennas on the crown and under the belly.
    k.slab([[8.6, 5.7], [8.0, 5.7], [7.85, 6.15], [8.05, 6.15]], -0.025, 0.025, DARK, 'zy');
    k.slab([[-4.0, 5.7], [-4.6, 5.7], [-4.75, 6.05], [-4.55, 6.05]], -0.025, 0.025, DARK, 'zy');
    // The belly fairing where the wings meet the body.
    k.loft([
      { z: 7.6, w: 0.5, h: 0.3, y: 2.05 },
      { z: 5.6, w: 1.85, h: 0.66, y: 1.88 },
      { z: -2.6, w: 1.98, h: 0.72, y: 1.86 },
      { z: -5.6, w: 1.2, h: 0.42, y: 2.06 },
      { z: -6.6, w: 0.3, h: 0.2, y: 2.25 },
    ], BELLY, { seg: 22, steps: 3 });

    // ------------------------------------------------------------- wings
    k.wing([
      { x: 1.5, y: 2.25, z: 5.2, c: 8.4, t: 0.14 },
      { x: 6.6, y: 2.6, z: 2.4, c: 5.6, t: 0.12 },
      { x: 17.0, y: 3.55, z: -6.2, c: 2.0, t: 0.1 },
    ], SKIN, { mirror: true, camber: 0.012 });
    // Winglets in the airline's colour.
    k.wing([
      { x: 16.95, y: 3.5, z: -6.1, c: 2.05, t: 0.08 },
      { x: 17.25, y: 5.35, z: -7.75, c: 0.85, t: 0.08 },
    ], c, { axis: 'y' });
    k.wing([
      { x: -16.95, y: 3.5, z: -6.1, c: 2.05, t: 0.08 },
      { x: -17.25, y: 5.35, z: -7.75, c: 0.85, t: 0.08 },
    ], c, { axis: 'y' });
    // Flap-track fairings under the trailing edge.
    for (const s of [1, -1]) {
      for (const [x, z, y] of [[4.0, -3.6, 2.3], [9.2, -4.5, 2.7], [12.7, -5.8, 3.0]]) k.sphere(1, 0.17, 0.2, 1.15, s * x, y, z, SKIN, 8, 6);
    }

    // ----------------------------------------------------------- engines
    for (const s of [1, -1]) {
      const x = s * 6.6;
      k.loft([
        { z: 6.05, w: 1.06, y: 1.45 },
        { z: 5.75, w: 1.22, y: 1.45 },
        { z: 4.7, w: 1.28, y: 1.45 },
        { z: 2.9, w: 1.12, y: 1.45 },
        { z: 1.6, w: 0.84, y: 1.45 },
        { z: 1.0, w: 0.62, y: 1.45 },
      ], c, { x, seg: 24, steps: 3, zBands: [[5.7, 6.1, METAL], [1.0, 1.75, shade(METAL, 0.8)]], caps: { front: DARK, back: DARK } });
      // Fan face: a spinner and a ring of blades suggested by a darker disc.
      m.sphere(0.34, 1, 1, 1.35, x, 1.45, 6.02, 0x9aa1a8, 12, 8);
      r.cyl(0.98, 0.98, 0.02, 24, x, 1.45, 5.98, 0x2c3036);
      m.cyl(0.46, 0.14, 0.95, 14, x, 1.45, 0.55, 0x707680); // exhaust cone
      // Pylon up to the wing.
      k.slab([[5.1, 2.55], [1.0, 2.68], [0.7, 2.25], [4.7, 2.25]], x - 0.17, x + 0.17, SKIN, 'zy');
    }

    // -------------------------------------------------------------- tail
    k.wing([
      { x: 0.8, y: 4.75, z: -14.3, c: 4.0, t: 0.1 },
      { x: 6.6, y: 5.25, z: -18.35, c: 1.5, t: 0.09 },
    ], SKIN, { mirror: true });
    k.wing([
      { x: 0, y: 4.9, z: -12.4, c: 6.8, t: 0.11 },
      { x: 0, y: 8.0, z: -15.8, c: 4.0, t: 0.1 },
      { x: 0, y: 11.4, z: -18.2, c: 2.0, t: 0.09 },
    ], c, { axis: 'y', bands: [[0, 0.1, WHITE], [0.56, 0.62, SUN[0]], [0.62, 0.68, SUN[1]], [0.68, 0.74, SUN[2]]] });

    // -------------------------------------------------------------- gear
    m.strut([0, 1.75, 15.2], [0, 0.55, 15.2], 0.11, METAL);
    m.box(0.7, 0.1, 0.12, 0, 0.55, 15.2, METAL);
    for (const s of [1, -1]) {
      r.tyre(0.55, 0.3, s * 0.32, 0.55, 15.2, RUBBER, 16);
      m.cyl(0.22, 0.22, 0.05, 12, s * 0.48, 0.55, 15.2, 0xd5d8db, 0, Math.PI / 2);
      // Main legs, each with a four-wheel bogie.
      m.strut([s * 3.0, 2.05, -0.2], [s * 3.0, 0.65, -0.2], 0.17, METAL);
      m.box(0.24, 0.2, 1.75, s * 3.0, 0.62, -0.2, METAL);
      m.box(0.9, 0.12, 0.12, s * 3.0, 0.62, -0.85, METAL);
      m.box(0.9, 0.12, 0.12, s * 3.0, 0.62, 0.45, METAL);
      for (const z of [-0.85, 0.45]) {
        for (const dx of [-0.34, 0.34]) {
          r.tyre(0.62, 0.34, s * 3.0 + dx, 0.62, z, RUBBER, 16);
          m.cyl(0.25, 0.25, 0.05, 12, s * 3.0 + dx * 1.5, 0.62, z, 0xd5d8db, 0, Math.PI / 2);
        }
      }
      // Gear doors.
      k.slab([[0.8, 2.0], [-1.2, 2.0], [-1.2, 1.2], [0.8, 1.2]], s * 2.62 - 0.03, s * 2.62 + 0.03, BELLY, 'zy');
    }
    k.slab([[16.0, 1.75], [14.6, 1.75], [14.6, 1.2], [16.0, 1.2]], 0.42, 0.47, BELLY, 'zy');
    k.slab([[16.0, 1.75], [14.6, 1.75], [14.6, 1.2], [16.0, 1.2]], -0.47, -0.42, BELLY, 'zy');

    return {
      kit: k, metal: m, matte: r, glass: gl, lit,
      lights: [['red', 17.15, 3.62, -7.3, 0.16], ['green', -17.15, 3.62, -7.3, 0.16], ['white', 0, 4.96, -19.1, 0.14]],
      strobe: [0, 5.82, 0],
      beaconLow: [0, 1.1, 0.5],
    };
  };
})();
