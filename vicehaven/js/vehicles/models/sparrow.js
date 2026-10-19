/*
 * models/sparrow.js — the Sparrow, Ardea's light civil helicopter (the one
 * on the airport helipad, and the pink coast-tour helicopter over the bay).
 *
 * Built with the aircraft model kit (aircraft.js): a lofted cabin with a
 * big glass nose and door windows, an engine fairing on the roof, a lofted
 * tail boom with a fin, ventral fin and tailplane, a two-blade main rotor
 * with a proper hub and airfoil blades, a two-blade tail rotor, and skids
 * on bent cross tubes. The colour paints the cabin, boom and fin; the belly
 * and a stripe contrast with it. Sizes and pivots match SPECS.sparrow
 * (rotor at 0, 3.1, 0.4 with a 5.25 m radius; tail rotor at 0.22, 2.0, -6.0).
 */
(function () {
  'use strict';

  const VH = window.VH;
  const PI = Math.PI;

  const WHITE = 0xf3f4f2;
  const DARK = 0x24272c;
  const FRAME = 0x2f3338;
  const WINDOW = 0x16202a;
  const METAL = 0xb3b8be;
  const SKID = 0x9aa0a7;
  const BLADE = 0x2a2d31;
  const TIP = 0xf2c500;

  function shade(hex, k) {
    const r = Math.min(255, Math.round(((hex >> 16) & 255) * k));
    const g = Math.min(255, Math.round(((hex >> 8) & 255) * k));
    const b = Math.min(255, Math.round((hex & 255) * k));
    return (r << 16) | (g << 8) | b;
  }

  function pale(hex) {
    return ((hex >> 16) & 255) + ((hex >> 8) & 255) + (hex & 255) > 600;
  }

  VH.AircraftDefs = VH.AircraftDefs || {};
  VH.AircraftDefs.sparrow = function (c, Kit) {
    const k = new Kit();
    const m = new Kit();
    const r = new Kit();
    const gl = new Kit();
    const belly = pale(c) ? 0x2b4f8f : WHITE; // a white helicopter gets a blue belly
    const stripe = pale(c) ? 0xd8262e : shade(c, 0.6);

    // ------------------------------------------------------------- cabin
    const cabin = k.loft([
      { z: 2.47, w: 0.05, h: 0.06, y: 1.42, n: 2 },
      { z: 2.32, w: 0.5, h: 0.6, y: 1.45, n: 2.1 },
      { z: 1.95, w: 0.82, h: 0.88, y: 1.5, n: 2.3 },
      { z: 1.2, w: 0.95, h: 0.98, y: 1.54, n: 2.5 },
      { z: 0.2, w: 0.96, h: 0.99, y: 1.56, n: 2.5 },
      { z: -0.7, w: 0.9, h: 0.92, y: 1.62, n: 2.4 },
      { z: -1.45, w: 0.6, h: 0.64, y: 1.83, n: 2.2 },
      { z: -1.95, w: 0.32, h: 0.36, y: 1.96, n: 2 },
    ], c, { seg: 32, steps: 5, bands: [[1.62, 1.74, stripe], [1.98, PI + 0.01, belly]] });

    // The glass nose (one big bubble, a frame down the middle) and the windows.
    for (const side of [1, -1]) {
      gl.patch(cabin, 1.15, 2.42, [0.12, 1.7], [0.07, 2.0], side, WINDOW, { lift: 0.012, nz: 8, ns: 8 });
      gl.patch(cabin, -0.15, 0.95, [0.55, 1.42], [0.5, 1.42], side, WINDOW, { lift: 0.012, nz: 4, ns: 4 });
      gl.patch(cabin, -1.05, -0.35, [0.62, 1.32], [0.55, 1.36], side, WINDOW, { lift: 0.012, nz: 3, ns: 3 });
      // Door shut lines and handles.
      for (const z of [1.02, -0.22, -1.12]) k.patch(cabin, z - 0.018, z + 0.018, [0.42, 1.95], [0.42, 1.95], side, shade(c, 0.55), { lift: 0.008, nz: 1, ns: 6 });
      k.decal(cabin, 0.3, 1.5, side, 0.16, 0.035, METAL, { lift: 0.014 });
      k.decal(cabin, -0.95, 1.48, side, 0.16, 0.035, METAL, { lift: 0.014 });
    }
    k.patch(cabin, 1.15, 2.44, [0, 0.07], [0, 0.07], 1, FRAME, { lift: 0.016, nz: 6, ns: 1 });
    k.patch(cabin, 1.15, 2.44, [0, 0.07], [0, 0.07], -1, FRAME, { lift: 0.016, nz: 6, ns: 1 });

    // Engine fairing on the roof, its intake, exhaust and the rotor mast.
    k.loft([
      { z: 1.0, w: 0.08, h: 0.06, y: 2.42 },
      { z: 0.6, w: 0.44, h: 0.3, y: 2.5 },
      { z: -0.6, w: 0.46, h: 0.33, y: 2.52 },
      { z: -1.5, w: 0.3, h: 0.22, y: 2.42 },
      { z: -1.95, w: 0.12, h: 0.1, y: 2.32 },
    ], c, { seg: 20, steps: 3 });
    for (const s of [1, -1]) r.box(0.03, 0.16, 0.42, s * 0.44, 2.55, 0.05, DARK);
    m.cyl(0.11, 0.13, 0.42, 12, 0, 2.55, -1.85, 0x5c6168, -0.35);
    m.cyl(0.09, 0.11, 0.42, 10, 0, 2.95, 0.4, METAL, PI / 2);

    // --------------------------------------------------------------- tail
    k.loft([
      { z: -1.75, w: 0.3, h: 0.34, y: 1.96 },
      { z: -3.5, w: 0.2, h: 0.22, y: 2.0 },
      { z: -6.15, w: 0.1, h: 0.12, y: 2.05 },
    ], c, { seg: 16, steps: 4, bands: [[1.5, 1.68, stripe]] });
    k.wing([
      { x: 0, y: 2.0, z: -5.45, c: 1.0, t: 0.13 },
      { x: 0, y: 3.02, z: -6.0, c: 0.55, t: 0.12 },
    ], c, { axis: 'y', bands: [[0.72, 1.01, stripe]] });
    k.wing([
      { x: 0, y: 2.0, z: -5.6, c: 0.75, t: 0.12 },
      { x: 0, y: 1.5, z: -5.95, c: 0.45, t: 0.12 },
    ], c, { axis: 'y' });
    k.wing([
      { x: 0.08, y: 2.0, z: -4.6, c: 0.58, t: 0.12 },
      { x: 1.0, y: 2.02, z: -4.72, c: 0.45, t: 0.12 },
    ], c, { mirror: true });
    for (const s of [1, -1]) k.wing([{ x: s * 1.0, y: 1.86, z: -4.66, c: 0.48, t: 0.1 }, { x: s * 1.0, y: 2.2, z: -4.72, c: 0.36, t: 0.1 }], stripe, { axis: 'y' });
    m.sphere(0.13, 1, 1, 1.3, 0.1, 2.0, -6.0, METAL, 10, 8); // tail rotor gearbox

    // -------------------------------------------------------------- skids
    for (const s of [1, -1]) {
      const x = s * 0.9;
      m.cyl(0.05, 0.05, 3.1, 10, x, 0.07, 0.42, SKID);
      m.strut([x, 0.07, 1.96], [x, 0.16, 2.2], 0.05, SKID);
      m.strut([x, 0.16, 2.2], [x, 0.34, 2.36], 0.05, SKID);
      for (const z of [1.35, -0.45]) {
        m.strut([s * 0.5, 0.82, z], [s * 0.78, 0.5, z], 0.045, SKID);
        m.strut([s * 0.78, 0.5, z], [x, 0.09, z], 0.045, SKID);
      }
      r.box(0.06, 0.05, 0.2, x, 0.12, 1.35, DARK);
      r.box(0.06, 0.05, 0.2, x, 0.12, -0.45, DARK);
    }

    // ---------------------------------------------------------- the rotors
    // Main rotor (spins about its mast): a hub, grips and two airfoil blades.
    const blade = new Kit();
    blade.wing([
      { x: 0.42, y: 0, z: 0.16, c: 0.3, t: 0.14 },
      { x: 5.22, y: 0, z: 0.14, c: 0.27, t: 0.11 },
    ], BLADE, { bands: [[0.93, 1.01, TIP]] });
    const rotor = new Kit();
    rotor.place(blade, new THREE.Matrix4());
    rotor.place(blade, new THREE.Matrix4().makeRotationY(PI));
    rotor.cyl(0.18, 0.2, 0.2, 12, 0, 0, 0, METAL, PI / 2);
    rotor.box(0.95, 0.09, 0.2, 0, 0.0, 0, 0x6f757c);
    rotor.cyl(0.07, 0.07, 0.24, 8, 0, 0.18, 0, DARK, PI / 2);
    // Tail rotor (spins about X): two blades in the Y-Z plane.
    const tail = new Kit();
    tail.slab([[0.07, 0.08], [-0.07, 0.08], [-0.05, 0.8], [0.05, 0.8]], -0.015, 0.015, BLADE, 'zy');
    tail.slab([[0.07, -0.08], [-0.07, -0.08], [-0.05, -0.8], [0.05, -0.8]], -0.015, 0.015, BLADE, 'zy');
    tail.slab([[0.05, 0.7], [-0.05, 0.7], [-0.05, 0.8], [0.05, 0.8]], 0.016, 0.02, TIP, 'zy');
    tail.slab([[0.05, -0.7], [-0.05, -0.7], [-0.05, -0.8], [0.05, -0.8]], 0.016, 0.02, TIP, 'zy');
    tail.cyl(0.06, 0.06, 0.12, 10, 0, 0, 0, METAL, 0, PI / 2);

    return {
      kit: k, metal: m, matte: r, glass: gl,
      lights: [['red', 0.98, 1.36, 0.8, 0.06], ['green', -0.98, 1.36, 0.8, 0.06], ['white', 0, 2.06, -6.18, 0.06]],
      strobe: [0, 3.06, -6.05],
      rotor: { kit: rotor, at: [0, 3.1, 0.4], r: 5.25 },
      tailRotor: { kit: tail, at: [0.22, 2.0, -6.0] },
    };
  };
})();
