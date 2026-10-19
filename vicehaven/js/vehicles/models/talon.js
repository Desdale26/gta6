/*
 * models/talon.js — the Talon F-9, Breakwater Arsenal's single-seat
 * twin-tail fighter (the jets on the flight line at the fort).
 *
 * Built with the aircraft model kit (aircraft.js): a lofted fuselage with a
 * pointed radome and gun blisters, a bubble canopy running into a dorsal
 * spine, side intakes under leading-edge root extensions, a trapezoid wing
 * with a little anhedral, twin canted fins on tail booms, all-moving
 * tailplanes and one engine nozzle (the afterburner's cone sits in it).
 * The paint is a two-tone splinter camouflage in the colour given over a
 * light belly, with panel and control-surface lines, low-visibility
 * markings and formation light strips. Missiles hang on the wing pylons
 * where the rockets leave; the gear kit (legs, doors, wheels) retracts in
 * flight. Sizes, mounts and lights match SPECS.talon (16 m long, 10 m span,
 * 4.6 m tall).
 */
(function () {
  'use strict';

  const VH = window.VH;
  const PI = Math.PI;

  const DARK = 0x24282d; //     intake mouths, gun ports, antennas
  const GEAR = 0xc3c7ca; //     gear legs and doors' insides (painted light grey)
  const RUBBER = 0x17181a;
  const HUB = 0x9ea4a9;
  const TITANIUM = 0x8d9297; // the nozzle
  const BURNT = 0x6a5c52; //    heat-stained petals at the exit
  const SOOT = 0x16171a; //     inside the nozzle
  const MISSILE = 0xe1e3e0;
  const SEEKER = 0x4a5056;
  const AMBER = 0xc99a2e; //    live warhead band
  const MOTOR = 0x8a5f33; //    rocket motor band
  const FORMATION = 0xc6d97e; // formation light strips (unlit)
  const RED = 0xb3322c; //      warning triangles
  const YELLOW = 0xd8b02a;

  function shade(hex, k) {
    const r = Math.min(255, Math.round(((hex >> 16) & 255) * k));
    const g = Math.min(255, Math.round(((hex >> 8) & 255) * k));
    const b = Math.min(255, Math.round((hex & 255) * k));
    return (r << 16) | (g << 8) | b;
  }
  function mix(a, b, t) {
    const ch = (sh) => Math.round(((a >> sh) & 255) + (((b >> sh) & 255) - ((a >> sh) & 255)) * t);
    return (ch(16) << 16) | (ch(8) << 8) | ch(0);
  }
  const clamp01 = (v) => Math.min(1, Math.max(0, v));

  /** Half-thickness of a NACA four-digit airfoil (as the kit's wings use). */
  function naca(x, t) {
    return 5 * t * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x * x * x - 0.1036 * x * x * x * x);
  }
  const FOIL = [0, 0.016, 0.05, 0.11, 0.21, 0.34, 0.5, 0.68, 0.86, 1];

  /**
   * The skin of a kit wing (same sections and options), for paint that lies
   * on it. Positions are (u, z) with u the span (|x| on a wing, y on a fin);
   * side 1 is the top (+X face of a fin), -1 underneath.
   *   paint(kit, outline, color, side, lift)  a convex outline of [u, z]
   *   fill(kit, u0, u1, x0, x1, color, side)  a span × chord-fraction area
   */
  function skin(sections, opts) {
    opts = opts || {};
    const fin = opts.axis === 'y';
    const camber = fin ? 0 : opts.camber || 0;
    const span = (q) => (fin ? q.y : Math.abs(q.x));
    const sec = (u) => {
      let i = 0;
      while (i < sections.length - 2 && u > span(sections[i + 1])) i++;
      const a = sections[i];
      const b = sections[i + 1];
      const f = clamp01((u - span(a)) / (span(b) - span(a)));
      const L = (key) => a[key] + (b[key] - a[key]) * f;
      return { x: L('x'), y: L('y'), z: L('z'), c: L('c'), tc: a.t * a.c + (b.t * b.c - a.t * a.c) * f };
    };
    const onChord = (u, x, side) => {
      const q = sec(u);
      const th = naca(x, 1) * q.tc * side + camber * q.c * 4 * x * (1 - x);
      return fin ? [q.x + th, q.y, q.z - x * q.c] : [q.x, q.y + th, q.z - x * q.c];
    };
    const chordAt = (u, z) => {
      const q = sec(u);
      return clamp01((q.z - z) / q.c);
    };
    const vert = (u, x, side, lift) => {
      const e = 0.004;
      const xa = Math.max(0.002, x - e);
      const xb = Math.min(1, Math.max(xa + 0.001, x + e));
      const p = onChord(u, x, side);
      const du = onChord(u + 0.01, x, side).map((v, i) => v - onChord(u - 0.01, x, side)[i]);
      const dx = onChord(u, xb, side).map((v, i) => v - onChord(u, xa, side)[i]);
      let n = [du[1] * dx[2] - du[2] * dx[1], du[2] * dx[0] - du[0] * dx[2], du[0] * dx[1] - du[1] * dx[0]];
      const ref = fin ? [side, 0, x < 0.05 ? 0.5 : 0] : [0, side, x < 0.05 ? 0.5 : 0];
      const l = Math.hypot(n[0], n[1], n[2]) || 1;
      const sg = n[0] * ref[0] + n[1] * ref[1] + n[2] * ref[2] < 0 ? -1 / l : 1 / l;
      n = n.map((v) => v * sg);
      return { p: [p[0] + n[0] * lift, p[1] + n[1] * lift, p[2] + n[2] * lift], n };
    };
    const tri = (kit, a, b, c, col) => kit.tri(a.p, b.p, c.p, a.n, b.n, c.n, col, col, col);
    return {
      paint(kit, outline, color, side, lift, sub) {
        lift = lift === undefined ? 0.008 : lift;
        sub = sub || 3;
        const col = VH.col(color);
        let cu = 0;
        let cz = 0;
        for (const [u, z] of outline) {
          cu += u / outline.length;
          cz += z / outline.length;
        }
        const V = (u, z) => vert(u, chordAt(u, z), side, lift);
        for (let e = 0; e < outline.length; e++) {
          const A = outline[e];
          const B = outline[(e + 1) % outline.length];
          // The fan triangle (centre, A, B), cut into sub² pieces so it bends with the skin.
          const P = (i, j) => V(cu + (A[0] - cu) * (i / sub) + (B[0] - A[0]) * (j / sub), cz + (A[1] - cz) * (i / sub) + (B[1] - A[1]) * (j / sub));
          const rows = [];
          for (let i = 0; i <= sub; i++) {
            const row = [];
            for (let j = 0; j <= i; j++) row.push(P(i, j));
            rows.push(row);
          }
          for (let i = 0; i < sub; i++) {
            for (let j = 0; j <= i; j++) {
              tri(kit, rows[i][j], rows[i + 1][j], rows[i + 1][j + 1], col);
              if (j < i) tri(kit, rows[i][j], rows[i + 1][j + 1], rows[i][j + 1], col);
            }
          }
        }
        return kit;
      },
      fill(kit, u0, u1, x0, x1, color, side, lift, nu) {
        lift = lift === undefined ? 0.006 : lift;
        nu = nu || 4;
        const col = VH.col(color);
        const xs = [x0, ...FOIL.filter((x) => x > x0 + 1e-4 && x < x1 - 1e-4), x1];
        const G = [];
        for (let i = 0; i <= nu; i++) G.push(xs.map((x) => vert(u0 + ((u1 - u0) * i) / nu, x, side, lift)));
        for (let i = 0; i < nu; i++) {
          for (let j = 0; j < xs.length - 1; j++) {
            tri(kit, G[i][j], G[i + 1][j], G[i][j + 1], col);
            tri(kit, G[i][j + 1], G[i + 1][j], G[i + 1][j + 1], col);
          }
        }
        return kit;
      },
    };
  }

  // Seven-segment strokes in a 0.6 × 1 cell, [u0, v0, u1, v1], for codes and numbers.
  const SEG = {
    a: [0, 0.88, 0.6, 1], b: [0.48, 0.5, 0.6, 1], c: [0.48, 0, 0.6, 0.5], d: [0, 0, 0.6, 0.12],
    e: [0, 0, 0.12, 0.5], f: [0, 0.5, 0.12, 1], g: [0, 0.44, 0.6, 0.56],
  };
  const GLYPH = { 0: 'abcdef', 1: 'bc', 2: 'abdeg', 3: 'abcdg', 4: 'bcfg', 5: 'acdfg', 6: 'acdefg', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg', '-': 'g' };
  /** Lays a code out as strokes, h tall: rect(u0, v0, u1, v1) in metres from its left foot. Returns its width. */
  function lettering(str, h, rect) {
    let u = 0;
    for (const ch of str) {
      for (const sg of GLYPH[ch] || '') {
        const q = SEG[sg];
        rect(u + q[0] * h, q[1] * h, u + q[2] * h, q[3] * h);
      }
      u += 0.85 * h;
    }
    return u - 0.25 * h;
  }

  VH.AircraftDefs = VH.AircraftDefs || {};
  VH.AircraftDefs.talon = function (c, Kit) {
    const k = new Kit(); //    paint
    const m = new Kit(); //    bare metal
    const r = new Kit(); //    matte black
    const gl = new Kit(); //   glass
    const gear = new Kit(); // retracts in flight (painted)
    const CAMO = shade(c, 0.74); //               the second tone
    const BELLY = mix(c, 0xc6cbce, 0.55); //      light underside
    const LINE = shade(c, 0.8); //                panel lines
    const BLINE = shade(BELLY, 0.82);
    const RADOME = mix(c, 0x454b51, 0.6);
    const MARK = mix(c, 0x2c3035, 0.62); //       low-visibility markings
    const FRAME = shade(c, 0.82);

    // ---------------------------------------------------------- fuselage
    const body = k.loft([
      { z: 8.05, w: 0.015, h: 0.015, y: 1.88 },
      { z: 7.75, w: 0.13, h: 0.12, y: 1.88 },
      { z: 7.2, w: 0.27, h: 0.25, y: 1.89 },
      { z: 6.3, w: 0.43, h: 0.4, y: 1.92 },
      { z: 5.3, w: 0.55, h: 0.5, y: 1.95, n: 2.3 },
      { z: 4.3, w: 0.64, h: 0.56, y: 1.97, n: 2.7 },
      { z: 3.0, w: 0.73, h: 0.6, y: 1.96, n: 3 },
      { z: 1.6, w: 0.82, h: 0.62, y: 1.9, n: 3.2 },
      { z: -0.2, w: 1.0, h: 0.62, y: 1.85, n: 3.4 },
      { z: -2.4, w: 1.12, h: 0.6, y: 1.83, n: 3.6 },
      { z: -4.6, w: 1.1, h: 0.56, y: 1.82, n: 3.4 },
      { z: -6.2, w: 0.9, h: 0.56, y: 1.81, n: 2.8 },
      { z: -7.2, w: 0.74, h: 0.66, y: 1.8, n: 2.2 },
      { z: -7.5, w: 0.71, h: 0.69, y: 1.8, n: 2 },
    ], c, {
      seg: 32,
      steps: 4,
      bands: [[2.0, PI + 0.01, BELLY]],
      zBands: [[6.3, 8.1, RADOME], [6.27, 6.3, LINE], [4.76, 4.78, LINE], [-2.62, -2.6, LINE], [-5.32, -5.3, LINE]],
      caps: { back: DARK },
    });
    // The canopy: one bubble, its bottom half buried in the nose.
    const canopy = gl.loft([
      { z: 4.78, w: 0.06, h: 0.05, y: 2.47 },
      { z: 4.35, w: 0.33, h: 0.29, y: 2.46 },
      { z: 3.65, w: 0.47, h: 0.47, y: 2.45 },
      { z: 2.75, w: 0.49, h: 0.52, y: 2.44 },
      { z: 1.85, w: 0.44, h: 0.45, y: 2.42 },
      { z: 1.15, w: 0.25, h: 0.26, y: 2.42 },
      { z: 0.75, w: 0.05, h: 0.05, y: 2.42 },
    ], 0x000000, { seg: 28, steps: 4 });
    // The dorsal spine behind it, running back between the fins.
    const spine = k.loft([
      { z: 1.75, w: 0.08, h: 0.06, y: 2.5 },
      { z: 1.2, w: 0.38, h: 0.24, y: 2.45 },
      { z: -0.5, w: 0.52, h: 0.3, y: 2.4 },
      { z: -3.5, w: 0.56, h: 0.3, y: 2.33 },
      { z: -5.8, w: 0.42, h: 0.22, y: 2.28 },
      { z: -7.0, w: 0.16, h: 0.08, y: 2.3 },
    ], c, { seg: 22, steps: 3, zBands: [[-1.42, -1.4, LINE]] });
    // Side intakes, under the root extensions, fading into the body aft.
    const intake = {};
    for (const s of [1, -1]) {
      intake[s] = k.loft([
        { z: 2.55, w: 0.34, h: 0.4, y: 1.52, n: 4.5 },
        { z: 2.2, w: 0.37, h: 0.42, y: 1.52, n: 4.5 },
        { z: 0.5, w: 0.38, h: 0.42, y: 1.53, n: 4 },
        { z: -1.6, w: 0.35, h: 0.4, y: 1.57, n: 3.5 },
        { z: -3.0, w: 0.2, h: 0.32, y: 1.63, n: 3 },
        { z: -3.9, w: 0.05, h: 0.18, y: 1.66 },
      ], c, { x: s * 1.0, seg: 24, steps: 3, bands: [[1.75, PI + 0.01, BELLY]], zBands: [[2.42, 2.6, LINE]], caps: { front: DARK } });
      // Splitter plate between the mouth and the fuselage.
      k.slab([[2.8, 1.9], [2.25, 1.92], [2.25, 1.13], [2.8, 1.22]], s * 0.665, s * 0.665 + s * 0.025, c, 'zy');
    }
    // Gun blisters on the chines, a port at the front of each.
    for (const s of [1, -1]) {
      k.loft([
        { z: 5.66, w: 0.09, h: 0.08, y: 1.9 },
        { z: 5.5, w: 0.12, h: 0.1, y: 1.9 },
        { z: 5.0, w: 0.11, h: 0.09, y: 1.91 },
        { z: 4.25, w: 0.02, h: 0.03, y: 1.93 },
      ], c, { x: s * 0.62, seg: 14, steps: 3, caps: { front: DARK } });
      m.cyl(0.03, 0.03, 0.22, 8, s * 0.64, 1.9, 5.66, 0x55595e);
    }
    // Tail booms beside the engine, carrying the fins and tailplanes.
    const boom = {};
    for (const s of [1, -1]) {
      boom[s] = k.loft([
        { z: -3.6, w: 0.05, h: 0.1, y: 1.86 },
        { z: -4.6, w: 0.2, h: 0.24, y: 1.86 },
        { z: -7.4, w: 0.25, h: 0.26, y: 1.86, n: 2.4 },
        { z: -8.05, w: 0.14, h: 0.15, y: 1.86 },
        { z: -8.25, w: 0.03, h: 0.04, y: 1.86 },
      ], c, { x: s * 0.96, seg: 16, steps: 3, bands: [[2.0, PI + 0.01, BELLY]] });
    }

    // ------------------------------------------------------------ nozzle
    m.lathe([[0.52, -8.45], [0.585, -8.47], [0.615, -8.2]], 24, 0, 1.8, 0, BURNT);
    m.lathe([[0.615, -8.2], [0.66, -7.8], [0.69, -7.35]], 24, 0, 1.8, 0, TITANIUM);
    r.lathe([[0.01, -7.92], [0.47, -7.94], [0.5, -8.2], [0.52, -8.45]], 24, 0, 1.8, 0, SOOT);
    m.cyl(0.17, 0.05, 0.24, 12, 0, 1.8, -8.06, 0x4c4743); // the flame holder's cone

    // ------------------------------------------------------------- wings
    const WING = [
      { x: 0.9, y: 1.9, z: 2.0, c: 6.8, t: 0.045 },
      { x: 5.0, y: 1.65, z: -3.1, c: 1.6, t: 0.04 },
    ];
    const WOPT = { mirror: true, camber: 0.006 };
    k.wing(WING, c, WOPT);
    const LERX = [
      { x: 0.5, y: 1.96, z: 4.5, c: 4.8, t: 0.02 },
      { x: 1.62, y: 1.9, z: 1.05, c: 2.2, t: 0.028 },
    ];
    k.wing(LERX, c, { mirror: true });
    const TAILPLANE = [
      { x: 0.85, y: 1.8, z: -5.6, c: 2.55, t: 0.04 },
      { x: 3.1, y: 1.74, z: -7.05, c: 0.95, t: 0.04 },
    ];
    k.wing(TAILPLANE, c, { mirror: true });
    const wingSkin = skin(WING, WOPT);
    const lerxSkin = skin(LERX);
    const tailSkin = skin(TAILPLANE);

    // Paint on one side (the +X), mirrored after.
    const k0 = k.count;
    // Light undersides.
    wingSkin.fill(k, 0, 5.0, 0, 1, BELLY, -1, 0.006, 5);
    lerxSkin.fill(k, 0.5, 1.62, 0, 1, BELLY, -1, 0.006, 3);
    tailSkin.fill(k, 0.85, 3.1, 0, 1, BELLY, -1, 0.006, 3);
    // Splinter camouflage on top.
    for (const o of [
      [[1.4, 1.15], [2.3, 0.1], [2.9, -1.5], [1.4, -0.7]],
      [[2.6, -1.9], [4.1, -2.25], [4.5, -3.7], [2.4, -3.3]],
      [[4.35, -2.45], [4.92, -3.18], [4.92, -4.6], [4.6, -4.62]],
      [[1.4, -2.6], [2.0, -2.4], [2.25, -4.72], [1.4, -4.74]],
    ]) wingSkin.paint(k, o, CAMO, 1, 0.008, 4);
    lerxSkin.paint(k, [[0.75, 3.55], [1.35, 1.75], [1.35, 1.1], [0.75, 2.2]], CAMO, 1, 0.008, 3);
    tailSkin.paint(k, [[1.2, -5.95], [2.3, -6.6], [2.6, -7.9], [1.2, -8.1]], CAMO, 1, 0.008, 3);
    // Control surfaces: flaperons, leading-edge flaps and the tailplane's pivot.
    const strip = (skn, a, b, wdt, color, side) => {
      // A thin band from a to b (in u, z), wdt wide.
      const du = b[0] - a[0];
      const dz = b[1] - a[1];
      const l = Math.hypot(du, dz) || 1;
      const nu = (-dz / l) * (wdt / 2);
      const nz = (du / l) * (wdt / 2);
      skn.paint(k, [[a[0] + nu, a[1] + nz], [b[0] + nu, b[1] + nz], [b[0] - nu, b[1] - nz], [a[0] - nu, a[1] - nz]], color, side, 0.011, 2);
    };
    for (const side of [1, -1]) {
      const col = side > 0 ? LINE : BLINE;
      strip(wingSkin, [1.45, -4.17], [4.55, -4.07], 0.025, col, side);
      for (const x of [1.45, 3.05, 4.55]) strip(wingSkin, [x, -4.17 + (x - 1.45) * 0.032], [x, -4.76 + (x - 0.9) * 0.024], 0.025, col, side);
      strip(wingSkin, [1.6, 1.13 - 0.42], [4.8, -2.85 - 0.3], 0.025, col, side);
      strip(wingSkin, [4.8, -2.85 - 0.3], [4.8, -2.85 + 0.04], 0.025, col, side);
      strip(tailSkin, [1.3, -6.05], [1.3, -8.12], 0.022, side > 0 ? LINE : BLINE, side);
    }
    // Formation light strip near the tip, and the low-vis roundel on top.
    strip(wingSkin, [4.6, -3.0], [4.6, -3.45], 0.07, FORMATION, 1);
    const ring = (cu, cz, rad, n) => {
      const o = [];
      for (let i = 0; i < n; i++) o.push([cu + Math.cos((i / n) * PI * 2) * rad, cz + Math.sin((i / n) * PI * 2) * rad]);
      return o;
    };
    wingSkin.paint(k, ring(3.55, -2.75, 0.42, 16), MARK, 1, 0.012, 2);
    wingSkin.paint(k, ring(3.55, -2.75, 0.32, 16), c, 1, 0.014, 2);
    wingSkin.paint(k, [[3.55, -2.5], [3.75, -2.95], [3.55, -2.85], [3.35, -2.95]], MARK, 1, 0.016, 2);
    // Pylon and its missile under the wing (the rockets leave from here).
    k.slab([[-2.6, 1.75], [-0.95, 1.75], [-0.35, 1.47], [-2.35, 1.47]], 2.95, 3.05, BELLY, 'zy');
    k.box(0.07, 0.08, 1.7, 3.0, 1.43, -1.15, shade(BELLY, 0.85));
    k.loft([
      { z: 0.88, w: 0.012 },
      { z: 0.74, w: 0.056 },
      { z: 0.52, w: 0.088 },
      { z: 0.36, w: 0.09 },
      { z: -2.0, w: 0.09 },
      { z: -2.08, w: 0.08 },
    ].map((q) => Object.assign({ y: 1.3 }, q)), MISSILE, {
      x: 3.0,
      seg: 14,
      steps: 2,
      zBands: [[0.5, 1.0, SEEKER], [0.18, 0.25, AMBER], [-0.42, -0.37, MOTOR]],
      caps: { back: DARK },
    });
    for (const a of [PI / 4, -PI / 4]) {
      k.box(0.42, 0.012, 0.26, 3.0, 1.3, -0.25, MISSILE, 0, 0, a);
      k.box(0.46, 0.012, 0.2, 3.0, 1.3, -1.9, MISSILE, 0, 0, a);
    }
    // Wingtip fairing with the navigation light.
    k.loft([
      { z: -2.9, w: 0.01, h: 0.01, y: 1.65 },
      { z: -3.1, w: 0.05, h: 0.05, y: 1.65 },
      { z: -4.6, w: 0.055, h: 0.055, y: 1.65 },
      { z: -4.85, w: 0.02, h: 0.02, y: 1.65 },
    ], c, { x: 5.0, seg: 10, steps: 2 });
    // Ventral strakes under the booms.
    k.slab([[-4.7, 1.36], [-6.7, 1.36], [-6.6, 1.02], [-5.6, 1.02]], 0.73, 0.76, BELLY, 'zy');
    k.mirrorFrom(k0);

    // -------------------------------------------------------------- fins
    for (const s of [1, -1]) {
      const FIN = [
        { x: s * 0.98, y: 2.05, z: -4.5, c: 3.1, t: 0.05 },
        { x: s * 1.5, y: 4.55, z: -6.55, c: 1.25, t: 0.045 },
      ];
      k.wing(FIN, c, { axis: 'y', bands: [[0.86, 0.89, YELLOW], [0.89, 1.01, MARK]] });
      const fs = skin(FIN, { axis: 'y' });
      for (const side of [1, -1]) {
        fs.paint(k, [[2.25, -4.85], [3.15, -5.55], [2.85, -7.6], [2.25, -7.58]], CAMO, side, 0.008, 3);
        fs.paint(k, [[3.75, -6.45], [4.3, -6.9], [4.3, -7.75], [3.55, -7.7]], CAMO, side, 0.008, 3);
        // Rudder hinge line.
        fs.paint(k, [[2.2, -6.85], [4.15, -7.2], [4.15, -7.225], [2.2, -6.875]], LINE, side, 0.011, 2);
      }
      // The serial on the outer face, reading nose to tail.
      const fw = lettering('2609', 0.2, () => {});
      lettering('2609', 0.2, (u0, v0, u1, v1) => {
        const z0 = -6.15 + s * (fw / 2 - u0);
        const z1 = -6.15 + s * (fw / 2 - u1);
        fs.paint(k, [[2.9 + v0, z0], [2.9 + v0, z1], [2.9 + v1, z1], [2.9 + v1, z0]], MARK, s, 0.012, 1);
      });
      fs.paint(k, [[4.1, -6.62], [3.85, -6.32], [3.6, -6.62], [3.85, -6.92]], MARK, s, 0.012, 2);
      // Formation strip.
      fs.paint(k, [[2.5, -6.0], [2.55, -6.0], [2.55, -6.6], [2.5, -6.6]], FORMATION, s, 0.012, 1);
    }

    // ------------------------------------------------- paint on the body
    const b0 = k.count;
    // Splinter camouflage over the top and sides.
    k.patch(body, 6.1, 5.45, [1.0, 1.75], [0.55, 1.5], 1, CAMO, { lift: 0.006 });
    k.patch(body, 1.5, 0.2, [1.0, 1.55], [0.7, 1.5], 1, CAMO, { lift: 0.006 });
    k.patch(body, -0.8, -2.2, [0.5, 1.2], [0.9, 1.5], 1, CAMO, { lift: 0.006 });
    k.patch(body, -2.8, -4.6, [0.9, 1.5], [0.4, 1.1], 1, CAMO, { lift: 0.006 });
    k.patch(body, -5.4, -7.2, [0.5, 1.4], [0.9, 1.5], 1, CAMO, { lift: 0.006 });
    k.patch(spine, 0.9, -1.6, [0.15, 1.1], [0.0, 1.3], 1, CAMO, { lift: 0.006 });
    k.patch(spine, -3.0, -5.4, [0.0, 0.9], [0.25, 1.3], 1, CAMO, { lift: 0.006 });
    k.patch(intake[1], 1.9, -0.2, [0.2, 0.9], [0.4, 1.4], 1, CAMO, { lift: 0.006 });
    k.patch(boom[1], -5.2, -7.6, [0.2, 1.4], [0.3, 1.5], 1, CAMO, { lift: 0.006 });
    // Panel lines along the body.
    k.patch(body, 6.2, 3.2, [1.38, 1.4], [1.43, 1.45], 1, LINE, { lift: 0.01, ns: 1, nz: 8 });
    k.patch(body, -2.6, -7.2, [1.02, 1.04], [1.12, 1.14], 1, LINE, { lift: 0.01, ns: 1, nz: 8 });
    k.patch(spine, 1.3, -6.2, [0.72, 0.74], [0.72, 0.74], 1, LINE, { lift: 0.01, ns: 1, nz: 10 });
    // Formation strip on the nose and the boom.
    k.decal(body, 5.95, 1.35, 1, 0.4, 0.05, FORMATION, { lift: 0.012 });
    k.decal(boom[1], -6.3, 1.2, 1, 0.5, 0.06, FORMATION, { lift: 0.012 });
    // Warning triangle by the intake, and the canopy's rescue arrow.
    k.patch(intake[1], 2.25, 1.95, [0.95, 1.35], [1.15, 1.15], 1, RED, { lift: 0.012, nz: 2, ns: 2 });
    k.patch(body, 3.6, 3.35, [1.25, 1.4], [1.32, 1.33], 1, YELLOW, { lift: 0.012, nz: 2, ns: 2 });
    k.mirrorFrom(b0);
    // Roundels on the intakes (round, so mirrored is fine) and the nose numbers per side.
    for (const s of [1, -1]) {
      k.decal(intake[s], -0.6, PI / 2, s, 0.62, 0.62, MARK, { round: 1, lift: 0.01 });
      k.decal(intake[s], -0.6, PI / 2, s, 0.48, 0.48, c, { round: 1, lift: 0.014 });
      k.patch(intake[s], -0.42, -0.78, [1.25, 1.9], [1.5, 1.5], s, MARK, { lift: 0.018, nz: 2, ns: 2 });
      const R = 0.6;
      const W = lettering('09', 0.26, () => {});
      lettering('09', 0.26, (u0, v0, u1, v1) => {
        const z0 = 5.15 + s * (W / 2 - u0);
        const z1 = 5.15 + s * (W / 2 - u1);
        k.patch(body, z0, z1, [1.05 - (v1 - 0.13) / R, 1.05 - (v0 - 0.13) / R], [1.05 - (v1 - 0.13) / R, 1.05 - (v0 - 0.13) / R], s, MARK, { lift: 0.012, nz: 1, ns: 2 });
      });
    }

    // ------------------------------------------------------------ canopy
    for (const s of [1, -1]) {
      k.patch(canopy, 3.9, 4.0, [0, 1.62], [0, 1.62], s, FRAME, { lift: 0.008, nz: 1, ns: 8 });
      k.patch(canopy, 4.0, 1.2, [1.42, 1.62], [1.42, 1.62], s, FRAME, { lift: 0.008, nz: 10, ns: 1 });
    }
    gl.sphere(0.085, 1, 1, 1, -0.2, 2.5, 4.98, 0x000000, 10, 8); // infrared sensor ball
    m.cyl(0.09, 0.1, 0.06, 10, -0.2, 2.46, 4.98, 0x50555a, PI / 2);

    // ---------------------------------------------------------- details
    m.strut([0, 1.88, 7.95], [0, 1.88, 8.28], 0.014, 0x9aa0a6); // pitot
    for (const s of [1, -1]) {
      k.slab([[6.62, 1.86], [6.5, 1.86], [6.46, 1.8], [6.56, 1.8]], s * 0.37, s * 0.37 + s * 0.01, DARK, 'zy'); // angle-of-attack vane
    }
    // Blade antennas on the spine and under the belly.
    r.slab([[-2.0, 2.6], [-2.45, 2.6], [-2.55, 2.85], [-2.35, 2.85]], -0.012, 0.012, DARK, 'zy');
    r.slab([[0.6, 1.26], [0.2, 1.26], [0.1, 1.05], [0.3, 1.05]], -0.012, 0.012, DARK, 'zy');
    // Air-refuelling door on the spine, and engine bay vents.
    k.decal(spine, -0.6, 0, 1, 0.42, 0.3, LINE, { lift: 0.008 });
    for (const s of [1, -1]) {
      for (const z of [-5.6, -5.9, -6.2]) k.decal(body, z, 0.62, s, 0.18, 0.05, DARK, { lift: 0.008 });
    }
    // Arrestor hook.
    m.strut([0, 1.16, -5.7], [0, 1.1, -7.25], 0.03, 0x3a3d41);

    // -------------------------------------------------------------- gear
    // Nose leg (wheel at z 5.0) with its doors.
    gear.strut([0, 1.47, 5.1], [0, 0.8, 5.06], 0.06, GEAR);
    gear.strut([0, 0.82, 5.06], [0, 0.42, 5.0], 0.042, 0xdde0e2);
    gear.strut([0, 1.45, 5.85], [0, 1.0, 5.08], 0.03, GEAR);
    gear.box(0.3, 0.05, 0.12, 0, 0.66, 5.02, GEAR);
    for (const s of [1, -1]) gear.box(0.025, 0.36, 0.1, s * 0.135, 0.5, 5.0, GEAR);
    gear.tyre(0.35, 0.2, 0, 0.35, 5.0, RUBBER, 16);
    gear.cyl(0.22, 0.22, 0.18, 12, 0, 0.35, 5.0, HUB, 0, PI / 2);
    gear.cyl(0.07, 0.07, 0.24, 8, 0, 0.35, 5.0, 0x5d6267, 0, PI / 2);
    gear.cyl(0.055, 0.065, 0.08, 10, 0, 0.98, 5.17, 0xf2f2ea); // taxi light
    for (const s of [1, -1]) gear.slab([[5.55, 1.48], [4.55, 1.45], [4.62, 1.14], [5.48, 1.16]], s * 0.19, s * 0.19 + s * 0.012, BELLY, 'zy');
    gear.patch(body, 5.55, 4.55, [PI - 0.4, PI], [PI - 0.4, PI], 1, DARK, { lift: 0.004, ns: 2, nz: 2 });
    gear.patch(body, 5.55, 4.55, [PI - 0.4, PI], [PI - 0.4, PI], -1, DARK, { lift: 0.004, ns: 2, nz: 2 });
    // Main legs under the intakes (wheels at x ±1.42, z -1.5).
    for (const s of [1, -1]) {
      gear.strut([s * 1.16, 1.12, -1.42], [s * 1.18, 0.74, -1.48], 0.07, GEAR);
      gear.strut([s * 1.18, 0.76, -1.48], [s * 1.2, 0.42, -1.5], 0.05, 0xdde0e2);
      gear.strut([s * 1.12, 1.12, -0.55], [s * 1.17, 0.82, -1.42], 0.035, GEAR);
      gear.strut([s * 1.17, 0.42, -1.5], [s * 1.32, 0.42, -1.5], 0.045, GEAR);
      gear.tyre(0.42, 0.24, s * 1.42, 0.42, -1.5, RUBBER, 18);
      gear.cyl(0.26, 0.26, 0.2, 14, s * 1.42, 0.42, -1.5, HUB, 0, PI / 2);
      gear.cyl(0.1, 0.1, 0.24, 10, s * 1.42, 0.42, -1.5, 0x5d6267, 0, PI / 2);
      // Doors: the big one inboard, a small one on the leg.
      gear.slab([[-0.75, 1.14], [-2.3, 1.14], [-2.1, 0.64], [-0.95, 0.64]], s * 0.86, s * 0.86 + s * 0.025, BELLY, 'zy');
      gear.slab([[-1.12, 1.1], [-1.72, 1.1], [-1.72, 0.72], [-1.12, 0.72]], s * 1.07, s * 1.07 - s * 0.02, BELLY, 'zy');
      gear.patch(intake[s], -0.75, -2.3, [2.35, PI], [2.35, PI], 1, DARK, { lift: 0.004, ns: 3, nz: 3 });
      gear.patch(intake[s], -0.75, -2.3, [2.35, PI], [2.35, PI], -1, DARK, { lift: 0.004, ns: 3, nz: 3 });
    }

    return {
      kit: k, metal: m, matte: r, glass: gl, gear,
      lights: [['red', 5.0, 1.65, -4.0, 0.08], ['green', -5.0, 1.65, -4.0, 0.08]],
      burner: [0, 1.8, -8.45],
    };
  };
})();
