/*
 * models/warden.js — the Warden AH, Breakwater Arsenal's attack helicopter
 * (on the pad at Fort Breakwater).
 *
 * Built with the aircraft model kit (aircraft.js): a narrow, slab-sided
 * lofted fuselage with a stepped tandem cockpit (two glass canopies with
 * frames), a nose sensor turret and the chin cannon, two engine pods with
 * exhausts, stub wings carrying the rocket pods and wingtip missiles, a
 * lofted tail boom with fin, tailplane and tail wheel, a four-blade main
 * rotor and a four-blade tail rotor. Military paint in the colour given,
 * with a darker belly, panel lines and markings. Sizes, guns, rocket pods
 * and pivots match SPECS.warden (rotor at 0, 3.65, 0.5, 7 m radius; tail
 * rotor at 0.25, 2.6, -7.25).
 */
(function () {
  'use strict';

  const VH = window.VH;
  const PI = Math.PI;

  const DARK = 0x1f2226;
  const FRAME = 0x2a2e33;
  const WINDOW = 0x152029;
  const METAL = 0x8f959b;
  const GUN = 0x3a3e43;
  const RUBBER = 0x17181a;
  const BLADE = 0x2b2e2a;
  const MARK = 0xd9dccf; // low-visibility markings
  const MISSILE = 0xc9ccc4;

  function shade(hex, k) {
    const r = Math.min(255, Math.round(((hex >> 16) & 255) * k));
    const g = Math.min(255, Math.round(((hex >> 8) & 255) * k));
    const b = Math.min(255, Math.round((hex & 255) * k));
    return (r << 16) | (g << 8) | b;
  }

  VH.AircraftDefs = VH.AircraftDefs || {};
  VH.AircraftDefs.warden = function (c, Kit) {
    const k = new Kit();
    const m = new Kit();
    const r = new Kit();
    const gl = new Kit();
    const dark = shade(c, 0.72);
    const line = shade(c, 0.55);

    // ---------------------------------------------------------- fuselage
    const body = k.loft([
      { z: 4.95, w: 0.06, h: 0.07, y: 1.36, n: 2.2 },
      { z: 4.62, w: 0.36, h: 0.4, y: 1.38, n: 2.6 },
      { z: 3.8, w: 0.55, h: 0.6, y: 1.48, n: 3 },
      { z: 2.6, w: 0.62, h: 0.76, y: 1.62, n: 3.2 },
      { z: 1.2, w: 0.74, h: 0.92, y: 1.76, n: 3.2 },
      { z: -0.4, w: 0.76, h: 0.95, y: 1.86, n: 3.2 },
      { z: -1.6, w: 0.62, h: 0.8, y: 1.96, n: 3 },
      { z: -2.7, w: 0.38, h: 0.48, y: 2.04, n: 2.6 },
      { z: -3.6, w: 0.3, h: 0.36, y: 2.0, n: 2.4 },
      { z: -6.8, w: 0.17, h: 0.21, y: 1.72, n: 2.2 },
      { z: -7.5, w: 0.12, h: 0.15, y: 1.7, n: 2 },
    ], c, { seg: 30, steps: 4, bands: [[2.25, PI + 0.01, dark]], caps: { back: dark } });
    // Panel lines and access doors.
    for (const side of [1, -1]) {
      for (const z of [3.0, 0.05, -1.25, -3.5]) k.patch(body, z - 0.015, z + 0.015, [0.5, 2.3], [0.5, 2.3], side, line, { lift: 0.007, nz: 1, ns: 6 });
      k.patch(body, -0.9, 0.0, [1.25, 1.75], [1.25, 1.75], side, shade(c, 0.86), { lift: 0.008, nz: 2, ns: 2 });
      // Markings: a roundel on the boom, a number block on the nose.
      k.decal(body, -4.6, 1.45, side, 0.42, 0.42, MARK, { round: 1, lift: 0.012 });
      k.decal(body, -4.6, 1.45, side, 0.22, 0.22, line, { round: 1, lift: 0.016 });
      k.decal(body, 3.55, 1.5, side, 0.5, 0.14, MARK, { lift: 0.012 });
      k.decal(body, -6.2, 1.5, side, 0.32, 0.1, 0xd4b13a, { lift: 0.012 }); // "no step" band by the tail rotor
    }

    // The stepped tandem canopies: the gunner in front and low, the pilot behind and high.
    const front = gl.loft([
      { z: 4.25, w: 0.04, h: 0.04, y: 1.98 },
      { z: 3.85, w: 0.4, h: 0.34, y: 2.0 },
      { z: 3.05, w: 0.5, h: 0.46, y: 2.08 },
      { z: 2.62, w: 0.25, h: 0.24, y: 2.16 },
    ], WINDOW, { seg: 20, steps: 3 });
    const rear = gl.loft([
      { z: 2.75, w: 0.04, h: 0.04, y: 2.42 },
      { z: 2.3, w: 0.5, h: 0.44, y: 2.46 },
      { z: 1.2, w: 0.56, h: 0.56, y: 2.55 },
      { z: 0.5, w: 0.46, h: 0.44, y: 2.56 },
      { z: 0.15, w: 0.12, h: 0.1, y: 2.52 },
    ], WINDOW, { seg: 20, steps: 3 });
    // Frames over the glass.
    for (const side of [1, -1]) {
      for (const z of [3.85, 3.05]) k.patch(front, z - 0.025, z + 0.025, [0, 1.6], [0, 1.6], side, FRAME, { lift: 0.008, nz: 1, ns: 5 });
      for (const z of [2.3, 1.55, 0.75]) k.patch(rear, z - 0.025, z + 0.025, [0, 1.6], [0, 1.6], side, FRAME, { lift: 0.008, nz: 1, ns: 5 });
      k.patch(front, 2.62, 4.2, [0, 0.05], [0, 0.05], side, FRAME, { lift: 0.008, nz: 5, ns: 1 });
      k.patch(rear, 0.15, 2.72, [0, 0.05], [0, 0.05], side, FRAME, { lift: 0.008, nz: 5, ns: 1 });
    }

    // Nose sensor turret and the chin cannon.
    m.sphere(0.24, 1, 1, 1, 0, 1.24, 4.82, GUN, 14, 10);
    gl.sphere(0.11, 1, 1, 0.6, 0, 1.24, 5.03, 0x3a5a7a, 10, 8);
    m.sphere(0.26, 1, 0.9, 1, 0, 0.92, 3.75, GUN, 12, 8);
    for (const a of [0, 2.1, 4.2]) m.cyl(0.035, 0.035, 1.1, 8, Math.cos(a) * 0.06, 0.82 + Math.sin(a) * 0.06, 4.35, DARK);
    m.cyl(0.08, 0.08, 0.3, 10, 0, 0.82, 3.95, GUN);

    // Engine pods with intakes and exhausts, and the rotor mast fairing.
    for (const s of [1, -1]) {
      const x = s * 0.56;
      k.loft([
        { z: 0.7, w: 0.12, y: 2.75 },
        { z: 0.45, w: 0.32, h: 0.3, y: 2.75 },
        { z: -1.55, w: 0.34, h: 0.32, y: 2.76 },
        { z: -2.25, w: 0.22, h: 0.2, y: 2.72 },
      ], c, { x, seg: 18, steps: 3, caps: { front: DARK } });
      r.cyl(0.24, 0.24, 0.02, 14, x, 2.75, 0.62, DARK);
      m.cyl(0.13, 0.17, 0.55, 12, x + s * 0.1, 2.78, -2.35, 0x4a4e52, 0, s * 0.45);
      k.patch(body, -1.9, 0.6, [0.15, 0.55], [0.15, 0.55], s, dark, { lift: 0.006, nz: 3, ns: 2 });
    }
    m.cyl(0.16, 0.22, 0.5, 12, 0, 3.32, 0.5, METAL, PI / 2);
    k.loft([
      { z: 1.4, w: 0.06, h: 0.05, y: 2.95 },
      { z: 1.0, w: 0.34, h: 0.22, y: 3.0 },
      { z: 0.0, w: 0.36, h: 0.24, y: 3.0 },
      { z: -0.6, w: 0.14, h: 0.1, y: 2.95 },
    ], c, { seg: 16, steps: 3 });

    // ------------------------------------------------- stub wings and stores
    k.wing([
      { x: 0.6, y: 1.74, z: 1.25, c: 1.45, t: 0.15 },
      { x: 2.65, y: 1.64, z: 0.98, c: 1.0, t: 0.12 },
    ], c, { mirror: true });
    for (const s of [1, -1]) {
      const x = s * 2.25;
      // Rocket pod on a pylon: the tubes show as dark rings in the front face.
      k.slab([[1.15, 1.66], [0.35, 1.66], [0.45, 1.5], [1.0, 1.5]], x - 0.05, x + 0.05, dark, 'zy');
      k.loft([
        { z: 1.85, w: 0.2, y: 1.35 },
        { z: 1.68, w: 0.27, y: 1.35 },
        { z: -0.05, w: 0.27, y: 1.35 },
        { z: -0.3, w: 0.16, y: 1.35 },
      ], dark, { x, seg: 18, steps: 2, caps: { front: DARK } });
      for (const [dx, dy] of [[0, 0], [0.13, 0.08], [-0.13, 0.08], [0.13, -0.08], [-0.13, -0.08], [0, 0.16], [0, -0.16]]) r.cyl(0.045, 0.045, 0.02, 8, x + dx, 1.35 + dy, 1.86, 0x0c0d0e);
      // Wingtip missiles.
      m.box(0.06, 0.08, 1.0, s * 2.62, 1.55, 0.6, GUN);
      k.loft([
        { z: 1.45, w: 0.02, y: 1.46 },
        { z: 1.25, w: 0.08, y: 1.46 },
        { z: -0.25, w: 0.08, y: 1.46 },
      ], MISSILE, { x: s * 2.62, seg: 10, steps: 2, caps: { back: DARK } });
      for (const a of [0, PI / 2, PI, PI * 1.5]) {
        k.box(0.12, 0.012, 0.2, s * 2.62 + Math.cos(a) * 0.12, 1.46 + Math.sin(a) * 0.12, -0.12, MISSILE, 0, 0, a);
      }
    }

    // --------------------------------------------------------------- tail
    k.wing([
      { x: 0, y: 1.72, z: -6.25, c: 1.4, t: 0.14 },
      { x: 0, y: 3.78, z: -7.3, c: 0.75, t: 0.12 },
    ], c, { axis: 'y', bands: [[0.82, 1.01, dark]] });
    k.wing([
      { x: 0.1, y: 1.84, z: -5.75, c: 0.75, t: 0.12 },
      { x: 1.45, y: 1.86, z: -5.95, c: 0.56, t: 0.11 },
    ], c, { mirror: true });
    for (const s of [1, -1]) k.wing([{ x: s * 1.45, y: 1.62, z: -5.9, c: 0.58, t: 0.1 }, { x: s * 1.45, y: 2.12, z: -6.0, c: 0.42, t: 0.1 }], dark, { axis: 'y' });
    m.sphere(0.16, 1, 1, 1.3, 0.14, 2.6, -7.25, METAL, 10, 8); // tail rotor gearbox

    // -------------------------------------------------------------- wheels
    for (const s of [1, -1]) {
      m.strut([s * 0.6, 1.15, 1.75], [s * 1.12, 0.36, 1.5], 0.07, GUN);
      m.strut([s * 0.62, 1.05, 0.95], [s * 1.12, 0.38, 1.5], 0.05, GUN);
      r.tyre(0.35, 0.22, s * 1.17, 0.35, 1.5, RUBBER, 16);
      m.cyl(0.17, 0.17, 0.1, 12, s * 1.24, 0.35, 1.5, METAL, 0, PI / 2);
    }
    m.strut([0, 1.55, -6.5], [0, 0.5, -6.6], 0.06, GUN);
    m.box(0.16, 0.12, 0.3, 0, 0.5, -6.6, GUN);
    r.tyre(0.28, 0.14, 0, 0.28, -6.6, RUBBER, 14);

    // ---------------------------------------------------------- the rotors
    const blade = new Kit();
    blade.wing([
      { x: 0.55, y: 0, z: 0.26, c: 0.52, t: 0.13 },
      { x: 6.95, y: 0, z: 0.22, c: 0.46, t: 0.1 },
    ], BLADE, { bands: [[0.95, 1.01, 0xc9b23a]] });
    const rotor = new Kit();
    for (let i = 0; i < 4; i++) rotor.place(blade, new THREE.Matrix4().makeRotationY((i * PI) / 2));
    rotor.cyl(0.32, 0.34, 0.26, 14, 0, 0, 0, METAL, PI / 2);
    for (let i = 0; i < 4; i++) rotor.box(0.7, 0.1, 0.2, Math.cos((i * PI) / 2) * 0.45, 0, -Math.sin((i * PI) / 2) * 0.45, 0x5f656b, 0, (i * PI) / 2);
    rotor.cyl(0.1, 0.12, 0.3, 10, 0, 0.26, 0, DARK, PI / 2);
    const tail = new Kit();
    for (let i = 0; i < 4; i++) {
      const b = new Kit();
      b.slab([[0.09, 0.1], [-0.09, 0.1], [-0.07, 1.08], [0.07, 1.08]], -0.018, 0.018, BLADE, 'zy');
      tail.place(b, new THREE.Matrix4().makeRotationX((i * PI) / 2 + 0.3));
    }
    tail.cyl(0.09, 0.09, 0.16, 10, 0, 0, 0, METAL, 0, PI / 2);

    return {
      kit: k, metal: m, matte: r, glass: gl,
      lights: [['red', 2.66, 1.64, 0.5, 0.06], ['green', -2.66, 1.64, 0.5, 0.06]],
      strobe: [0, 3.82, -7.3],
      rotor: { kit: rotor, at: [0, 3.65, 0.5], r: 7 },
      tailRotor: { kit: tail, at: [0.25, 2.6, -7.25] },
    };
  };
})();
