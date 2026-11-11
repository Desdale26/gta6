/*
 * models/albatross.js — the Albatross 300, a twin-jet airliner (the one you
 * can steal at Vicehaven International, and the ones flying over the city).
 *
 * Built with the aircraft model kit (aircraft.js): a lofted fuselage with a
 * painted cheatline, belly and tail cone, rows of cabin windows and doors as
 * decals, swept airfoil wings with winglets, two turbofans on pylons, and
 * proper gear. The colour is the airline's: the cheatline, the engines and
 * the fin. Sizes and pivots match SPECS.albatross (38 m long, 34 m span).
 *
 * VH.AircraftDefs.albatrossFreighter is the cargo version the freighters on
 * the airport's remote stands fly (scenery only: AircraftModels.build): no
 * cabin windows, a big main-deck cargo door ahead of the wing on the left,
 * and a broad band of the airline's colour along the side.
 *
 * VH.PlugDoor is the front port door (model z 15.0, the +x side) as a real
 * plug door, and a narrow airstair with handrails that folds down from under
 * it, on any Albatross model (the scripted airliners, js/airside.js, and the
 * flyable one, js/vehicles/aircraft.js). The door moves out of its frame,
 * then swings forward on its arm to lie against the skin ahead of the
 * opening (and back); behind it, the dark doorway with the cabin's light.
 *
 *   const rig = VH.PlugDoor.rig(model)   the model's rig (made the first time it's
 *                                        asked for; null if it isn't an Albatross)
 *   rig.want(key, door, stair)           ask for the door (0 shut .. 1 open) and the stair
 *                                        (0 up .. 1 down), one key per asker ('airside',
 *                                        'cabin', 'entry', 'steal' ...): whatever anyone
 *                                        wants open is open. The door opens first (~1.7 s),
 *                                        then the stair unfolds (~1 s); the stair folds up
 *                                        before the door shuts.
 *   rig.drop(key)                        forget that asker
 *   rig.step(dt)                         animate: the model's owner calls it every frame
 *                                        (airside.js for its airliners, entry.js for the
 *                                        flyable ones); with a soft clunk and hiss
 *   rig.set(door, stair)                 pose at once (a model swapped in takes over the state)
 *   rig.door, rig.stair                  where they are now, 0..1
 *   rig.ready                            the door wide open and the stair all the way down
 *   rig.cut                              set by cabin.js while it has the skin round the
 *                                        door cut away (the painted doorway is hidden then)
 *   VH.PlugDoor.reset(model)             back to shut, every asker forgotten (a pooled model)
 *   VH.PlugDoor.stairPoint(k, out)       where Jay's feet go on the stair, model frame: k 0 the
 *                                        foot (on the ground), 1 the top (the sill), 1.25 a
 *                                        step inside the door → out {x, y, z}
 *   VH.PlugDoor.FOOT                     the stair's foot {x, z} (model frame), where to stand
 *   VH.PlugDoor.SILL                     the door's sill {x, y, z} (model frame)
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

  // The fuselage's cross-sections (the front door and its stair below are fitted to it).
  const FUSELAGE = [
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
  ];

  VH.AircraftDefs = VH.AircraftDefs || {};
  function albatross(c, Kit, freighter) {
    const k = new Kit(); //  paint
    const m = new Kit(); //  bare metal
    const r = new Kit(); //  rubber and matte black
    const gl = new Kit(); // glass
    const lit = new Kit(); // cabin windows (lit at night)
    const deep = shade(c, 0.72);

    // ---------------------------------------------------------- fuselage
    const body = k.loft(FUSELAGE, WHITE, {
      seg: 36,
      steps: 4,
      bands: freighter
        ? [[0.98, 1.52, c], [1.6, 1.72, deep], [2.12, Math.PI + 0.01, BELLY]]
        : [[1.6, 1.79, c], [1.79, 1.86, deep], [2.12, Math.PI + 0.01, BELLY]],
      zBands: [[-19.1, -16.9, c]],
      caps: { back: DARK },
    });

    // Cabin windows, both sides, with gaps at the doors and the overwing exits (a freighter
    // has none: only the crew door's).
    for (const side of [1, -1]) {
      for (let z = 13.7; z > -11.3 && !freighter; z -= 0.53) {
        if ((z < 1.45 && z > 0.05) || z > 14.1) continue;
        lit.decal(body, z, 1.3, side, 0.25, 0.36, WINDOW, { round: 1, lift: 0.014 });
      }
      // Doors: an outline, the panel (curved to the skin) and its window.
      const doors = freighter ? [[15.0, 0.84, 1.8, 1.42], [-11.9, 0.84, 1.8, 1.42]] : [[15.0, 0.84, 1.8, 1.42], [-11.9, 0.84, 1.8, 1.42], [0.75, 0.52, 0.95, 1.3]];
      // The freighter's main-deck cargo door, left side ahead of the wing, sill at the floor.
      if (freighter && side === 1) doors.push([9.15, 3.5, 2.44, 1.28]);
      for (const [z, wdt, hgt, s] of doors) {
        const ds = hgt / 2 / 2.1;
        const os = (hgt + 0.08) / 2 / 2.1;
        if (wdt > 2) {
          // The cargo door is painted over, livery and all: just its seams (a frame), the hinge
          // line along the top and two latches along the sill.
          const seam = 0x4a4f56;
          const fs = 0.03;
          const fz = 0.07;
          const o = { lift: 0.012, ns: 1, nz: 8 };
          k.patch(body, z - wdt / 2, z + wdt / 2, [s - ds, s - ds + fs], [s - ds, s - ds + fs], side, seam, o);
          k.patch(body, z - wdt / 2, z + wdt / 2, [s - ds + 0.07, s - ds + 0.07 + fs * 0.6], [s - ds + 0.07, s - ds + 0.07 + fs * 0.6], side, seam, o);
          k.patch(body, z - wdt / 2, z + wdt / 2, [s + ds - fs, s + ds], [s + ds - fs, s + ds], side, seam, o);
          for (const zz of [z - wdt / 2, z + wdt / 2 - fz]) k.patch(body, zz, zz + fz, [s - ds, s + ds], [s - ds, s + ds], side, seam, { lift: 0.012, ns: 10, nz: 1 });
          for (const dz of [-0.9, 0.9]) k.patch(body, z + dz - 0.18, z + dz + 0.18, [s + ds - 0.15, s + ds - 0.06], [s + ds - 0.15, s + ds - 0.06], side, DARK, { lift: 0.013, ns: 1, nz: 1 });
          continue;
        }
        k.patch(body, z - wdt / 2 - 0.04, z + wdt / 2 + 0.04, [s - os, s + os], [s - os, s + os], side, shade(WHITE, 0.8), { lift: 0.006, ns: 6 });
        k.patch(body, z - wdt / 2, z + wdt / 2, [s - ds, s + ds], [s - ds, s + ds], side, DOOR, { lift: 0.01, ns: 6 });
        if (!freighter || z > 14) lit.decal(body, z, 1.3, side, 0.24, 0.34, WINDOW, { round: 1, lift: 0.016 });
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
  }
  VH.AircraftDefs.albatross = (c, Kit) => albatross(c, Kit, false);
  VH.AircraftDefs.albatrossFreighter = (c, Kit) => albatross(c, Kit, true);

  // ================================================== the front door and its stair
  const PD = { z: 15.0, half: 0.42, s: 1.42, ds: 0.9 / 2.1 }; // as the door decal above: z, half width, s (round from the crown), half height
  const OUT_FACE = 0.04; // the door's outer face off the skin (over the painted panel and its window) ...
  const IN_FACE = -0.075; // ... and its inner face
  const OPEN_T = 1.7; //    seconds to open, to shut, and for the stair either way
  const SHUT_T = 1.5;
  const STAIR_T = 1.0;
  const ST = { w: 0.82, up: 2.15, low: 2.1, ang: 0.84, stow: 2.76, nest: 0.075, rise: 0.205 }; // the stair: width, its two flights, its slope, stowed in the belly
  const DOOR_COL = 0xe2e5e8;
  const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const ease = (a, b, x) => {
    const t = clamp01((x - a) / (b - a));
    return t * t * (3 - 2 * t);
  };
  const mix = (a, b, t) => {
    const ca = new THREE.Color(a);
    return ca.lerp(new THREE.Color(b), t).getHex();
  };

  /** A patch of the door's area of skin, `lift` off it (inside if negative), coloured by col(u, v), each 0..1 along and round. */
  function skinGrid(k, S, z0, z1, s0, s1, lift, col, flip, nz, ns) {
    const G = [];
    for (let i = 0; i <= nz; i++) {
      const row = [];
      for (let j = 0; j <= ns; j++) {
        const f = S.at(z0 + ((z1 - z0) * i) / nz, s0 + ((s1 - s0) * j) / ns, 1);
        const q = f.p.clone().addScaledVector(f.n, lift);
        row.push({ p: [q.x, q.y, q.z], n: flip ? [-f.n.x, -f.n.y, -f.n.z] : [f.n.x, f.n.y, f.n.z], c: VH.col(col(i / nz, j / ns)) });
      }
      G.push(row);
    }
    for (let i = 0; i < nz; i++) {
      for (let j = 0; j < ns; j++) {
        const a = G[i][j], b = G[i][j + 1], d = G[i + 1][j], e = G[i + 1][j + 1];
        k.tri(a.p, b.p, d.p, a.n, b.n, d.n, a.c, b.c, d.c);
        k.tri(b.p, e.p, d.p, b.n, e.n, d.n, b.c, e.c, d.c);
      }
    }
  }

  let PG = null;
  /** The door, the doorway and the stair's two flights (geometry, made once), and where things are. */
  function plugGeometry() {
    if (PG) return PG;
    const K = VH.AircraftKit;
    if (!K) return null;
    const S = new K().loft(FUSELAGE, 0xffffff, { seg: 36, steps: 4 });
    const z0 = PD.z - PD.half;
    const z1 = PD.z + PD.half;
    const s0 = PD.s - PD.ds;
    const s1 = PD.s + PD.ds;
    const C = S.at(PD.z, PD.s, 1);
    const c0 = C.p.clone();
    // The door: the painted outside, the lining inside, the edges between, its window and a handle.
    const d = new K();
    skinGrid(d, S, z0, z1, s0, s1, OUT_FACE, () => DOOR_COL, false, 3, 8);
    skinGrid(d, S, z0, z1, s0, s1, IN_FACE, () => 0xb9bec4, true, 2, 6);
    const edge = (pts, nf) => {
      const rim = VH.col(0xc3c7cc);
      for (let i = 0; i < pts.length - 1; i++) {
        const a = S.at(pts[i][0], pts[i][1], 1);
        const b = S.at(pts[i + 1][0], pts[i + 1][1], 1);
        const P = (f, l) => {
          const q = f.p.clone().addScaledVector(f.n, l);
          return [q.x, q.y, q.z];
        };
        const na = nf(a);
        const nb = nf(b);
        d.tri(P(a, OUT_FACE), P(b, OUT_FACE), P(b, IN_FACE), na, nb, nb, rim, rim, rim);
        d.tri(P(a, OUT_FACE), P(b, IN_FACE), P(a, IN_FACE), na, nb, na, rim, rim, rim);
      }
    };
    const along = (s) => [0, 1, 2, 3, 4].map((i) => [z0 + ((z1 - z0) * i) / 4, s]);
    const round = (z) => [0, 1, 2, 3, 4, 5, 6].map((i) => [z, s0 + ((s1 - s0) * i) / 6]);
    const v3 = (v, k) => [v.x * k, v.y * k, v.z * k];
    edge(round(z0), (f) => v3(f.tz, -1));
    edge(round(z1), (f) => v3(f.tz, 1));
    edge(along(s0), (f) => v3(f.ts, -1));
    edge(along(s1), (f) => v3(f.ts, 1));
    d.decal(S, PD.z, 1.3, 1, 0.24, 0.34, 0x18202a, { round: 1, lift: OUT_FACE + 0.004 });
    d.decal(S, PD.z - 0.22, 1.6, 1, 0.16, 0.05, 0x3a3f46, { lift: OUT_FACE + 0.004 });
    const door = d.geometry();
    door.translate(-c0.x, -c0.y, -c0.z);
    door.computeBoundingSphere();
    // The doorway behind it: a dark frame, the lit galley wall beyond, the sill plate.
    const h = new K();
    skinGrid(h, S, z0, z1, s0, s1, 0.03, () => 0x07080a, false, 3, 12);
    skinGrid(h, S, z0 + 0.045, z1 - 0.045, s0 + 0.03, s1 - 0.07, 0.031, (u, v) => (v < 0.55 ? mix(0x8a8170, 0x4a443b, v / 0.55) : mix(0x4a443b, 0x15130f, (v - 0.55) / 0.45)), false, 3, 12);
    skinGrid(h, S, z0, z1, s1 - 0.05, s1, 0.032, () => 0x777c83, false, 2, 1);
    const hole = h.geometry();
    // Where the door ends up, open: on the skin ahead of the opening, turned to lie along it.
    const fa = S.at(z1 + 0.08, PD.s, 1).p;
    const fb = S.at(z1 + 0.08 + 2 * PD.half, PD.s, 1).p;
    const E = S.at(PD.z + 2 * PD.half + 0.08, PD.s, 1);
    const end = E.p.clone().addScaledVector(E.n, -IN_FACE + 0.025);
    const yawEnd = Math.atan2(fb.x - fa.x, fb.z - fa.z);
    // The stair: hinged under the sill, two flights (the lower slides out of the upper).
    const sill = S.at(PD.z, s1 + 0.012, 1).p;
    const hinge = new THREE.Vector3(sill.x - 0.02, sill.y - 0.03, PD.z);
    const sin = Math.sin(ST.ang);
    const cos = Math.cos(ST.ang);
    // The lower flight's foot rests on the ground: how far it slides out.
    const slide = (hinge.y - 0.1 - ST.nest * cos) / sin - ST.low;
    const flight = (len, foot) => {
      const k = new K();
      const grey = 0xa9aeb5;
      const tread = 0x3b3e43;
      const rail = 0xc9ced4;
      for (const sd of [-1, 1]) k.box(len, 0.2, 0.04, len / 2, 0, sd * (ST.w / 2 - 0.02), grey);
      const pitch = ST.rise / sin;
      for (let x = foot ? 0.2 : 0.16; x < len - 0.1; x += pitch) k.box(0.25, 0.035, ST.w - 0.06, x, 0.06, 0, tread, 0, 0, ST.ang);
      // Handrails: posts upright when it's down, a rail along their tops.
      const posts = foot ? [0.35, 1.15, 1.95] : [0.35, 1.25, 2.05];
      const ph = 0.88;
      for (const sd of [-1, 1]) {
        for (const x of posts) k.box(0.035, ph, 0.035, x - (ph / 2) * sin, 0.1 + (ph / 2) * cos, sd * ST.w / 2, rail, 0, 0, ST.ang);
        const a = posts[0] - ph * sin;
        const b = posts[posts.length - 1] - ph * sin;
        k.box(b - a + 0.06, 0.045, 0.045, (a + b) / 2, 0.1 + ph * cos, sd * ST.w / 2, rail);
      }
      if (foot) {
        // A yellow and black kick plate at the bottom, and its feet.
        k.box(0.06, 0.24, ST.w, len - 0.03, -0.02, 0, 0xe0b12e);
        for (const sd of [-1, 1]) k.box(0.18, 0.06, 0.12, len - 0.06, -0.09, sd * (ST.w / 2 - 0.06), 0x222428, 0, 0, ST.ang);
      }
      return k.geometry();
    };
    const run = (slide + ST.low) * cos;
    PG = {
      door, hole, c0, n0: C.n.clone(), end, yawEnd, hinge, slide,
      upper: flight(ST.up, false),
      lower: flight(ST.low, true),
      sill: { x: sill.x, y: sill.y, z: PD.z },
      foot: { x: hinge.x + run + 0.55, z: PD.z },
      run,
    };
    return PG;
  }

  let PM = null;
  function plugMats() {
    if (PM) return PM;
    PM = {
      hole: new THREE.MeshBasicMaterial({ vertexColors: true }),
      stair: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.45 }),
    };
    return PM;
  }

  const _v = new THREE.Vector3();
  const _p1 = new THREE.Vector3();
  const _q = new THREE.Vector3();

  /** A soft clunk, hiss or clack from the door at (x, z), as loud as the camera is near. */
  function doorSound(kind, x, z) {
    const g = VH.game;
    const a = g && g.audio;
    if (!a || !a.ready || !a._hit || !a.ctx || !g.renderer) return;
    const cam = g.renderer.camera;
    const dx = x - cam.position.x;
    const dz = z - cam.position.z;
    const k = clamp01(1 - Math.hypot(dx, dz) / 48);
    if (k < 0.04) return;
    const v = k * k;
    // Left or right of the view.
    cam.getWorldDirection(_v);
    const pan = Math.max(-1, Math.min(1, ((-_v.z * dx + _v.x * dz) / (Math.hypot(dx, dz) || 1)) * 0.7)); // (along the view's right)
    const t = a.ctx.currentTime;
    if (kind === 'unlatch' || kind === 'shut') {
      // The latch: a low thunk with a little metal in it.
      a._tone({ t, freq: kind === 'shut' ? 92 : 120, freqEnd: 55, peak: 0.32 * v, decay: 0.16, pan });
      a._hit({ t, type: 'lowpass', freq: 620, q: 0.7, peak: 0.45 * v, decay: 0.11, brown: true, pan });
      a._hit({ t: t + 0.015, freq: 1900, q: 2.2, peak: 0.09 * v, decay: 0.03, pan });
    }
    if (kind === 'unlatch' || kind === 'swing') {
      // The air in the arm's damper.
      a._hit({ t: t + (kind === 'unlatch' ? 0.12 : 0), type: 'bandpass', freq: 3400, freqEnd: 2200, q: 0.9, attack: 0.12, peak: 0.07 * v, decay: 0.55, pan });
    }
    if (kind === 'stair') a._tone({ t, freq: 150, freqEnd: 105, wave: 'triangle', attack: 0.08, peak: 0.05 * v, decay: 0.8, lowpass: 700, pan });
    if (kind === 'clack') {
      a._hit({ t, freq: 2600, q: 3, peak: 0.12 * v, decay: 0.04, pan });
      a._tone({ t, freq: 210, freqEnd: 140, wave: 'triangle', peak: 0.08 * v, decay: 0.09, pan });
    }
  }

  class PlugRig {
    constructor(model) {
      const G = plugGeometry();
      const M = plugMats();
      this.model = model;
      this.req = {};
      this.door = 0;
      this.stair = 0;
      this.cut = false;
      this._shown = -1;
      this._stairShown = -1;
      this._cutShown = null;
      // The door wears the plane's own paint (a damaged one's tint and all).
      this.panel = new THREE.Mesh(G.door, model.paint || M.stair);
      this.panel.castShadow = true;
      this.panel.visible = false;
      this.hole = new THREE.Mesh(G.hole, M.hole);
      this.hole.visible = false;
      this.upper = new THREE.Group();
      this.upper.position.copy(G.hinge);
      this.lower = new THREE.Group();
      const up = new THREE.Mesh(G.upper, M.stair);
      const low = new THREE.Mesh(G.lower, M.stair);
      for (const m of [up, low]) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
      this.upper.add(up);
      this.lower.add(low);
      this.upper.add(this.lower);
      this.upper.visible = false;
      const body = model.body || model.root;
      body.add(this.panel, this.hole, this.upper);
      this._pose();
    }

    want(key, door, stair) {
      const r = this.req[key] || (this.req[key] = [0, 0]);
      r[0] = door ? clamp01(+door) : 0;
      r[1] = stair ? clamp01(+stair) : 0;
    }

    drop(key) {
      delete this.req[key];
    }

    get ready() {
      return this.door >= 1 && this.stair >= 1;
    }

    set(door, stair) {
      this.door = clamp01(door || 0);
      this.stair = this.door >= 0.92 ? clamp01(stair || 0) : 0;
      this._pose();
    }

    reset() {
      this.req = {};
      this.cut = false;
      this.set(0, 0);
    }

    step(dt) {
      let D = 0;
      let Sd = 0;
      for (const k in this.req) {
        const r = this.req[k];
        if (r[0] > D) D = r[0];
        if (r[1] > Sd) Sd = r[1];
      }
      if (Sd > 0) D = 1;
      const d0 = this.door;
      const s0 = this.stair;
      if (D > this.door) this.door = Math.min(D, this.door + dt / OPEN_T);
      else if (D < this.door && this.stair <= 0) this.door = Math.max(D, this.door - dt / SHUT_T);
      if (Sd > this.stair && this.door >= 0.92) this.stair = Math.min(Sd, this.stair + dt / STAIR_T);
      else if (Sd < this.stair) this.stair = Math.max(Sd, this.stair - dt / STAIR_T);
      if (this.door !== d0 || this.stair !== s0) {
        const p = this.model.root.position;
        if (d0 === 0 && this.door > 0) doorSound('unlatch', p.x, p.z);
        else if (d0 === 1 && this.door < 1) doorSound('swing', p.x, p.z);
        else if (d0 > 0 && this.door === 0) doorSound('shut', p.x, p.z);
        if ((s0 === 0 && this.stair > 0) || (s0 === 1 && this.stair < 1)) doorSound('stair', p.x, p.z);
        else if (this.stair === 1 && s0 < 1) doorSound('clack', p.x, p.z);
      }
      this._pose();
    }

    /** Pose the door and the stair (only when something changed). */
    _pose() {
      const u = this.door;
      const cut = this.cut;
      if (u === this._shown && this.stair === this._stairShown && cut === this._cutShown) return;
      const G = PG;
      if (u !== this._shown || cut !== this._cutShown) {
        this._shown = u;
        this._cutShown = cut;
        const pn = this.panel;
        // Shut, the skin's own painted door shows (or, with the skin cut away, this one, in place).
        pn.visible = u > 0 || cut;
        this.hole.visible = u > 0 && !cut;
        if (pn.visible) {
          // Out of the frame first (a plug door sits inside its frame) ...
          const e1 = ease(0, 0.3, u);
          _p1.copy(G.c0).addScaledVector(G.n0, 0.11 * e1);
          _p1.y += 0.025 * e1;
          // ... then forward on its arm, the back edge swinging out a little, to lie on the skin ahead.
          const v = ease(0.24, 1, u);
          _q.copy(_p1).lerp(G.end, 0.5).addScaledVector(G.n0, 0.07);
          const a = (1 - v) * (1 - v);
          const b = 2 * v * (1 - v);
          const c = v * v;
          pn.position.set(a * _p1.x + b * _q.x + c * G.end.x, a * _p1.y + b * _q.y + c * G.end.y, a * _p1.z + b * _q.z + c * G.end.z);
          pn.rotation.set(0, G.yawEnd * v - 0.12 * Math.sin(Math.PI * v), 0);
        }
      }
      if (this.stair !== this._stairShown) {
        const sg = this.stair;
        this._stairShown = sg;
        this.upper.visible = sg > 0;
        if (sg > 0) {
          // Swung down out of the belly, then the lower flight slides out to the ground.
          this.upper.rotation.set(0, 0, -(ST.stow + (ST.ang - ST.stow) * ease(0, 0.62, sg)));
          this.lower.position.set(0.05 + (G.slide - 0.05) * ease(0.5, 1, sg), -ST.nest, 0);
        }
      }
    }

    dispose() {
      for (const m of [this.panel, this.hole, this.upper]) m.removeFromParent();
    }
  }

  VH.PlugDoor = {
    /** The rig on an Albatross model (made the first time), or null. */
    rig(model) {
      if (!model || !model.root) return null;
      if (model._plug) return model._plug;
      if (model.type !== 'albatross' && model.type !== 'albatrossFreighter') return null;
      if (!plugGeometry()) return null;
      model._plug = new PlugRig(model);
      return model._plug;
    },
    /** A pooled model going back on the shelf (or out again): shut, nobody asking. */
    reset(model) {
      if (model && model._plug) model._plug.reset();
    },
    /** Where Jay's feet go on the stair (model frame): k 0 the foot .. 1 the sill .. 1.25 a step inside. */
    stairPoint(k, out) {
      const G = plugGeometry();
      out = out || {};
      out.z = PD.z;
      if (k >= 1) {
        out.x = G.sill.x - (k - 1) * 2.4;
        out.y = G.sill.y;
        return out;
      }
      // Up the treads' nosings (a hand above the stair's middle line), from the ground beyond its foot.
      const x0 = G.hinge.x + G.run + 0.25;
      const x1 = G.sill.x - 0.04;
      out.x = x0 + (x1 - x0) * clamp01(k);
      const y = G.hinge.y + 0.15 - (out.x - G.hinge.x) * Math.tan(ST.ang);
      out.y = y < 0 ? 0 : y > G.sill.y ? G.sill.y : y;
      return out;
    },
    get FOOT() {
      return plugGeometry().foot;
    },
    get SILL() {
      return plugGeometry().sill;
    },
    T: { open: OPEN_T, shut: SHUT_T, stair: STAIR_T },
  };
})();
