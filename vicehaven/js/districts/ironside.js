/*
 * districts/ironside.js — Ironside (VICEHAVEN 3.0): heavy industry in the far
 * south-west.
 *
 *   Ironside Scrapyard   behind a patchwork wall of old sheeting on the South
 *                        Coast Highway: the main gate and the back gate onto
 *                        Foundry Road, the weighbridge office, aisles between
 *                        stacks of flattened cars ten high, hulks and tyre
 *                        piles, a scrap crane swinging a car on its magnet,
 *                        and THE CRUSHER: drive a car into its bay, get out,
 *                        and the press comes down and folds it into a bale
 *                        (or hit the big red button on the control panel).
 *                        Its feed conveyor climbs to the jaws with a catwalk
 *                        beside it.
 *
 * Everything static draws into the chunk builders through VH.WNKit and
 * VH.SouthKit; the moving parts (the press, the crane, the conveyor's cleats,
 * the bales) are a handful of meshes in IronLife.
 */
(function () {
  'use strict';

  const VH = window.VH;
  const KERB = 0.15;
  const D = 'ironside';
  const PI = Math.PI;
  const F = () => VH.COLLIDE;
  const K = () => VH.WNKit;
  const S = () => VH.SouthKit;
  const col = (h) => (Array.isArray(h) ? h : VH.col(h));
  const hash = (a, b) => VH.math.hash2(a, b);

  /** A painted box, solid (its collider starts where it is drawn when that is off the ground). */
  function box(world, surf, x0, y0, z0, x1, y1, z1, hex, tag, flags) {
    S().air(world, world.ctxAt((x0 + x1) / 2, (z0 + z1) / 2)[surf], x0, y0, z0, x1, y1, z1, hex, tag, flags);
  }

  // A unit box for tilted slabs (merged into a chunk surface with a matrix).
  let UNIT = null;
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
  const Z1 = new THREE.Vector3(0, 0, 1);
  /** A slab tilted along x: from (x0, y0) to (x1, y1) (top surface), centred on z, w wide, t thick. */
  function slabX(surf, x0, y0, x1, y1, z, w, t, hex) {
    if (!UNIT) UNIT = new THREE.BoxGeometry(1, 1, 1);
    const len = Math.hypot(x1 - x0, y1 - y0);
    const ang = Math.atan2(y1 - y0, x1 - x0);
    _q.setFromAxisAngle(Z1, ang);
    // Centre of the slab: half its thickness below the top line's midpoint.
    _v.set((x0 + x1) / 2 + Math.sin(ang) * t / 2, (y0 + y1) / 2 - Math.cos(ang) * t / 2, z);
    _s.set(len, t, w);
    _m.compose(_v, _q, _s);
    surf.merge(UNIT, _m, col(hex));
  }

  // Crushed-car colours (faded paint).
  const PAINT = [0xa8322c, 0x2f5f9f, 0xd8d4cc, 0x3f7f4a, 0x2a2c30, 0xc9a227, 0x7a7f86, 0x6a2a5a, 0x2a8a8a, 0xb86a2a, 0x4a4f56, 0xe8e6e0, 0x8a2a2a, 0x5a7a9a];
  const paint = (s) => PAINT[Math.floor(hash(s, 17) * PAINT.length) % PAINT.length];

  // ------------------------------------------------------------ the scrapyard
  // Plot -625..-327 x 1477..1749, front south on the South Coast Highway.
  const SY = {
    x0: -625, x1: -327, z0: 1477, z1: 1749,
    wall: { x0: -623, x1: -329, z0: 1479, z1: 1747, h: 3.2 },
    gate: [-483, -469], // the main gate (south wall)
    back: [-405, -393], // the back gate (north wall, onto Foundry Road)
    road: { x0: -481, x1: -471, z0: 1596 }, // the access road, gate to apron
    lane: { x0: -404, x1: -394, z1: 1562 }, // the back lane, back gate to apron
    apron: { x0: -562, x1: -390, z0: 1562, z1: 1600 },
    office: { x0: -499, x1: -487, z0: 1712, z1: 1727 },
    crane: { x: -468, z: 1542, r: 15 },
  };
  // The crusher: a press with a drive-in bay (open to the south), its feed
  // conveyor climbing from the west to the hopper, a catwalk beside it.
  const CR = {
    x0: -521, x1: -511, z0: 1548, z1: 1559,
    bay: { x0: -519, x1: -513, z0: 1550, z1: 1559 },
    wallH: 4.6, top: 6.8,
    up: 4.4, low: KERB + 0.5, // the platen's underside, raised and fully down
    belt: { x0: -551, x1: -522, z: 1552, w: 2.0, y0: 0.9, y1: 9.8 },
    walk: { x0: -549, x1: -524.5, z: 1549.6, w: 1.2, y1: 9.0 },
    plat: { x0: -524.5, x1: -521.5, z0: 1546.4, z1: 1550.2, y: 9.0 },
    booth: { x0: -509.5, x1: -505.5, z0: 1559.5, z1: 1563.5 },
    panel: { x: -507.5, z: 1564.3 },
    bales: { x0: -504.8, x1: -500.4, z: 1546.5, pitch: 2.05, n: 6 },
  };

  /** A patchwork wall of corrugated sheets along an axis-aligned line, with gaps. */
  function sheetWall(world, x0, z0, x1, z1, gaps, h) {
    const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
    const lo = alongX ? Math.min(x0, x1) : Math.min(z0, z1), hi = alongX ? Math.max(x0, x1) : Math.max(z0, z1);
    const c = alongX ? z0 : x0;
    const segs = [];
    let cur = lo;
    for (const [g0, g1] of gaps || []) { if (g0 > cur) segs.push([cur, g0]); cur = Math.max(cur, g1); }
    if (cur < hi) segs.push([cur, hi]);
    const R = (a, b, c0, c1, y0, y1) => (alongX ? [a, y0, c0, b, y1, c1] : [c0, y0, a, c1, y1, b]);
    const sheets = [0x8a5a3a, 0x8f969c, 0x6a8094, 0x9a8a5a, 0x7a4a32, 0xa0a4a8];
    for (const [s0, s1] of segs) {
      for (let p = s0; p < s1 - 1e-6; p += 3) {
        const p1 = Math.min(s1, p + 3);
        const ctx = alongX ? world.ctxAt((p + p1) / 2, c) : world.ctxAt(c, (p + p1) / 2);
        const k = Math.floor(hash(Math.round(p * 7), Math.round(c)) * sheets.length) % sheets.length;
        const hh = h - (hash(Math.round(p), 3) < 0.2 ? 0.35 : 0);
        ctx.prop.box(...R(p, p1, c - 0.05, c + 0.05, KERB, KERB + hh), col(sheets[k]));
        // Corrugations both faces, a post at each joint.
        const rib = VH.colMul(col(sheets[k]), 0.82);
        for (let q = p + 0.25; q < p1 - 0.1; q += 0.5) {
          ctx.prop.box(...R(q, q + 0.12, c - 0.09, c - 0.05, KERB, KERB + hh), rib);
          ctx.prop.box(...R(q, q + 0.12, c + 0.05, c + 0.09, KERB, KERB + hh), rib);
        }
        ctx.prop.box(...R(p - 0.07, p + 0.07, c - 0.12, c + 0.12, KERB, KERB + h + 0.15), col(0x4a4f56));
      }
      const b = R(s0, s1, c - 0.13, c + 0.13, 0, KERB + h);
      world.physics.addBox(b[0], b[1], b[2], b[3], b[4], b[5], 'metal', F().ALL);
    }
  }

  /** A quad turned to face along n (whatever order its corners come in). */
  function quadOut(surf, A, B, C, Dd, n, c) {
    const ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2];
    const vx = C[0] - A[0], vy = C[1] - A[1], vz = C[2] - A[2];
    const dot = (uy * vz - uz * vy) * n[0] + (uz * vx - ux * vz) * n[1] + (ux * vy - uy * vx) * n[2];
    if (dot >= 0) surf.quad(A, B, C, Dd, n, c);
    else surf.quad(Dd, C, B, A, n, c);
  }

  /**
   * A double row of crushed-car stacks: columns 1.9 m wide back to back
   * (two columns 4.4 m deep, 8.8 m in all), along x or z from a0 to a1,
   * the row's near edge on c0. Only the faces that show are drawn: each
   * column a dark core with every car's flattened side on its aisle face,
   * the cars' noses on the row's two ends.
   */
  function stackRow(world, a0, a1, c0, alongX, seed) {
    const P = (a, cc, y) => (alongX ? [a, y, cc] : [cc, y, a]);
    const carH = 0.48;
    const nCols = Math.floor((a1 - a0) / 1.9 + 1e-6);
    const heights = [];
    for (let i = 0; i < nCols; i++) heights.push([5 + Math.floor(hash(seed + i * 3, 41) * 6), 5 + Math.floor(hash(seed + i * 3 + 1, 41) * 6)]);
    for (let i = 0; i < nCols; i++) {
      const a = a0 + i * 1.9;
      for (let s = 0; s < 2; s++) {
        const cA = c0 + s * 4.4, cB = cA + 4.4;
        const face = s === 0 ? cA : cB; // the aisle face
        const n = heights[i][s];
        const top = KERB + n * carH;
        const ctx = alongX ? world.ctxAt(a + 0.95, (cA + cB) / 2) : world.ctxAt((cA + cB) / 2, a + 0.95);
        // The core: a dark block (its hidden faces skipped).
        const skip = alongX ? { [s === 0 ? 's' : 'n']: true } : { [s === 0 ? 'e' : 'w']: true };
        if (alongX) ctx.propMatte.box(a + 0.03, KERB, cA + 0.06 * (s === 0 ? 1 : 0), a + 1.87, top, cB - 0.06 * (s === 1 ? 1 : 0), col(0x4a443e), { skip });
        else ctx.propMatte.box(cA + 0.06 * (s === 0 ? 1 : 0), KERB, a + 0.03, cB - 0.06 * (s === 1 ? 1 : 0), top, a + 1.87, col(0x4a443e), { skip });
        // Each car's side on the aisle face: a body band and a darker window line.
        const out = s === 0 ? -1 : 1;
        const nrm = alongX ? [0, 0, out] : [out, 0, 0];
        const f = face + out * 0.01;
        for (let k = 0; k < n; k++) {
          const y0 = KERB + k * carH + 0.04, y1 = y0 + carH - 0.08;
          quadOut(ctx.prop, P(a + 0.08, f, y0), P(a + 1.82, f, y0), P(a + 1.82, f, y1), P(a + 0.08, f, y1), nrm, col(paint(seed * 31 + i * 17 + s * 7 + k)));
          const g = f + out * 0.005;
          quadOut(ctx.prop, P(a + 0.45, g, y1 - 0.17), P(a + 1.45, g, y1 - 0.17), P(a + 1.45, g, y1 - 0.06), P(a + 0.45, g, y1 - 0.06), nrm, col(0x15181c));
        }
        // The top car's roof.
        const rc = col(paint(seed + i * 5 + s));
        if (alongX) ctx.prop.topRect(a + 0.08, cA + 0.1, a + 1.82, cB - 0.1, top + 0.005, rc, 0);
        else ctx.prop.topRect(cA + 0.1, a + 0.08, cB - 0.1, a + 1.82, top + 0.005, rc, 0);
        // Solid to the top.
        if (alongX) world.physics.addBox(a + 0.03, 0, cA, a + 1.87, top, cB, 'metal', F().ALL);
        else world.physics.addBox(cA, 0, a + 0.03, cB, top, a + 1.87, 'metal', F().ALL);
      }
    }
    // The row's two ends: the cars' noses (a band per car).
    for (const [i, e, out] of [[0, a0 + 0.02, -1], [nCols - 1, a0 + nCols * 1.9 - 0.02, 1]]) {
      const nrm = alongX ? [out, 0, 0] : [0, 0, out];
      const ctx = alongX ? world.ctxAt(e, c0 + 4.4) : world.ctxAt(c0 + 4.4, e);
      for (let s = 0; s < 2; s++) {
        const cA = c0 + s * 4.4 + 0.15, cB = cA + 4.1;
        for (let k = 0; k < heights[i][s]; k++) {
          const y0 = KERB + k * carH + 0.04, y1 = y0 + carH - 0.08;
          quadOut(ctx.prop, P(e, cA, y0), P(e, cB, y0), P(e, cB, y1), P(e, cA, y1), nrm, col(paint(seed * 13 + k * 7 + s + i)));
        }
      }
    }
  }

  /** A wrecked car body on blocks (no wheels), solid. */
  function hulk(world, x, z, yaw, hex, seed) {
    const c = world.ctxAt(x, z);
    const dark = VH.colMul(col(hex), 0.7);
    const fx = Math.sin(yaw), fz = Math.cos(yaw);
    for (const [u, v] of [[-0.7, -1.5], [0.7, -1.5], [-0.7, 1.4], [0.7, 1.4]]) {
      const bx = x + fz * u + fx * v, bz = z - fx * u + fz * v;
      c.propMatte.orientedBox(bx, bz, 0.2, 0.25, yaw, KERB, KERB + 0.3, col(0x6a6a66)); // solidity: passable
    }
    S().obox(world, c.prop, x, z, 0.92, 2.15, yaw, KERB + 0.3, KERB + 1.05, hex, 'metal');
    const cx = x - fx * 0.25, cz = z - fz * 0.25;
    S().obox(world, c.prop, cx, cz, 0.8, 1.05, yaw, KERB + 1.05, KERB + 1.6, VH.colMul(col(hex), 0.9), 'metal');
    c.prop.orientedBox(cx, cz, 0.82, 0.85, yaw, KERB + 1.12, KERB + 1.48, col(0x1a1d22));
    // Dents and rust.
    if (hash(seed, 5) < 0.5) c.prop.orientedBox(x + fx * 1.4, z + fz * 1.4, 0.94, 0.35, yaw, KERB + 0.5, KERB + 0.95, dark);
    if (hash(seed, 6) < 0.4) c.propMatte.orientedBox(x - fx * 1.6, z - fz * 1.6, 0.93, 0.3, yaw, KERB + 0.35, KERB + 1.0, col(0x7a4a2a));
  }

  /** A stack of old tyres (round collider). */
  function tyres(world, x, z, n) {
    const c = world.ctxAt(x, z);
    const h = n * 0.24;
    S().drum(world, c.propMatte, x, KERB, z, 0.38, h, 12, 0x1c1c1e, 'rubber');
    for (let k = 1; k < n; k++) c.propMatte.cylinder(x, KERB + k * 0.24 - 0.015, z, 0.385, 0.385, 0.03, 12, col(0x3a3a3c), false); // solidity: passable
    c.propMatte.cylinder(x, KERB + h, z, 0.2, 0.2, 0.01, 10, col(0x0c0c0c), true); // solidity: passable
  }

  /** A floodlight mast: a pole, a head of lamps, and a pool on the ground at night. */
  function mast(world, x, z, h, aimX, aimZ, r) {
    const c = world.ctxAt(x, z);
    S().drum(world, c.prop, x, KERB, z, 0.2, h, 8, 0x8a9097, 'pole');
    c.prop.box(x - 1.2, KERB + h, z - 0.35, x + 1.2, KERB + h + 0.9, z + 0.35, col(0x3f454c));
    c.screen.box(x - 1.1, KERB + h - 0.02, z - 0.3, x + 1.1, KERB + h + 0.02, z + 0.3, VH.col(0xf6f2e0, 2.4));
    (world.floodlights || (world.floodlights = [])).push({ x: aimX, z: aimZ, r: r || 26, y: KERB + 0.03, strength: 0.55, tint: [1.08, 1.02, 0.9] });
  }

  function buildScrapyard(world) {
    const W = K(), Sk = S();
    const Wl = SY.wall;
    // The ground: packed dirt inside the wall, darker tracks where the wheels go.
    W.pave(world, Wl.x0, Wl.z0, Wl.x1, Wl.z1, 0x9a8b72, 'decal', KERB + 0.006, 8);
    W.pave(world, SY.road.x0, SY.road.z0, SY.road.x1, SY.z1, 0xd8d0c4, 'asphaltTop', KERB + 0.014, 6);
    W.pave(world, SY.apron.x0, SY.apron.z0, SY.apron.x1, SY.apron.z1, 0xd8d0c4, 'asphaltTop', KERB + 0.014, 6);
    W.pave(world, SY.lane.x0, Wl.z0 - 2, SY.lane.x1, SY.lane.z1, 0xd8d0c4, 'asphaltTop', KERB + 0.014, 6);
    // The wall, the gates.
    sheetWall(world, Wl.x0, Wl.z1, Wl.x1, Wl.z1, [SY.gate], Wl.h);
    sheetWall(world, Wl.x0, Wl.z0, Wl.x1, Wl.z0, [SY.back], Wl.h);
    sheetWall(world, Wl.x0, Wl.z0, Wl.x0, Wl.z1, [], Wl.h);
    sheetWall(world, Wl.x1, Wl.z0, Wl.x1, Wl.z1, [], Wl.h);
    for (const [g0, g1, z, inward, main] of [[SY.gate[0], SY.gate[1], Wl.z1, -1, true], [SY.back[0], SY.back[1], Wl.z0, 1, false]]) {
      // Gate posts (steel), the two mesh leaves swung right back against the inside of the wall.
      const ph = main ? 7.2 : 3.6;
      for (const x of [g0 - 0.25, g1 + 0.25]) box(world, 'prop', x - 0.25, KERB, z - 0.25, x + 0.25, KERB + ph, z + 0.25, 0x3a3f45, 'metal');
      const lw = (g1 - g0) / 2;
      for (const [xa, xb] of [[g0 - lw, g0], [g1, g1 + lw]]) {
        const lz = z + inward * 0.35, c = world.ctxAt((xa + xb) / 2, lz);
        c.prop.box(xa, KERB + 0.1, lz - 0.04, xb, KERB + 0.2, lz + 0.04, col(0x3a3f45));
        c.prop.box(xa, KERB + 2.5, lz - 0.04, xb, KERB + 2.6, lz + 0.04, col(0x3a3f45));
        for (const x of [xa + 0.05, xb - 0.05, (xa + xb) / 2]) c.prop.box(x - 0.04, KERB + 0.1, lz - 0.04, x + 0.04, KERB + 2.6, lz + 0.04, col(0x3a3f45));
        c.prop.box(xa, KERB + 0.2, lz - 0.01, xb, KERB + 2.5, lz + 0.01, col(0x5a5f66));
        world.physics.addBox(xa, 0, lz - 0.08, xb, KERB + 2.6, lz + 0.08, 'fence', F().SOLID | F().CAMERA);
      }
      if (main) {
        // A gantry over the gate with the yard's name, lit at night.
        const c = world.ctxAt((g0 + g1) / 2, z);
        Sk.air(world, c.prop, g0 - 0.5, KERB + 6.6, z - 0.3, g1 + 0.5, KERB + 7.2, z + 0.3, 0x3a3f45, 'metal');
        W.sign(world, { x: (g0 + g1) / 2, y: KERB + 5.4, z: z + 0.32, yaw: 0, w: 13, h: 2.2, lines: ['IRONSIDE SALVAGE CO.', 'SCRAP · SPARES · CRUSHING WHILE YOU WAIT'], style: 'info', oneSided: true, colors: { bg: ['#d8a520', '#c08f18'], fg: '#1c1c1e', bar: '#1c1c1e' } });
        for (const x of [g0 + 1, g1 - 1]) c.screen.box(x - 0.25, KERB + 6.45, z + 0.25, x + 0.25, KERB + 6.6, z + 0.45, VH.col(0xfff0c8, 2.2));
        W.sign(world, { x: g1 + 4.5, y: KERB + 1.8, z: z + 0.16, yaw: 0, w: 4.4, h: 1.5, lines: ['CARS BOUGHT FOR CASH', 'ANY CONDITION · NO QUESTIONS*'], style: 'info', oneSided: true, colors: { bg: ['#f4f2ec', '#e8e4dc'], fg: '#a8322c', bar: '#1c1c1e' } });
        W.sign(world, { x: g0 - 4.5, y: KERB + 1.8, z: z + 0.16, yaw: 0, w: 3.6, h: 1.3, lines: ['*SOME QUESTIONS', 'MIND THE CRANE'], style: 'info', oneSided: true, colors: { bg: ['#f4f2ec', '#e8e4dc'], fg: '#1c1c1e', bar: '#d8a520' } });
      }
    }
    // The weighbridge in the access road, the office cabin beside it.
    {
      const O = SY.office;
      const c = world.ctxAt((O.x0 + O.x1) / 2, (O.z0 + O.z1) / 2);
      W.pave(world, SY.road.x0 + 0.8, O.z0, SY.road.x1 - 0.8, O.z1, 0x4a4f56, 'marks', KERB + 0.02, 0);
      for (const x of [SY.road.x0 + 0.8, SY.road.x1 - 1.0]) W.mark(world, x, O.z0, x + 0.2, O.z1, 0xf2c230, KERB + 0.025);
      // The cabin up on blocks: a green box with windows, a door and steps on the road side.
      box(world, 'prop', O.x0, KERB, O.z0, O.x1, KERB + 0.55, O.z1, 0x6a6a66, 'concrete');
      box(world, 'prop', O.x0, KERB + 0.55, O.z0, O.x1, KERB + 3.3, O.z1, 0x3f6a4a, 'metal');
      c.prop.box(O.x0 - 0.1, KERB + 3.3, O.z0 - 0.1, O.x1 + 0.1, KERB + 3.45, O.z1 + 0.1, col(0x2a3a2e));
      for (let z = O.z0 + 1.5; z < O.z1 - 2; z += 3.4) c.screen.box(O.x1 + 0.01, KERB + 1.5, z, O.x1 + 0.05, KERB + 2.6, z + 2.2, VH.col(0xffe7b0, 1.15));
      c.prop.box(O.x1 + 0.01, KERB + 0.55, O.z1 - 2.2, O.x1 + 0.06, KERB + 2.6, O.z1 - 1.2, col(0x2a3a2e));
      W.stairs(world, c.prop, O.x1 + 1.6, O.z1 - 1.7, 'w', 1.6, 1.2, KERB, KERB + 0.55, 0x8f969c, { rails: false });
      W.sign(world, { x: O.x1 + 0.08, y: KERB + 3.0, z: (O.z0 + O.z1) / 2 - 1, yaw: PI / 2, w: 5, h: 0.6, lines: ['OFFICE · WEIGHBRIDGE · ALL VISITORS REPORT HERE'], style: 'info', oneSided: true, colors: { bg: ['#f4f2ec', '#e8e4dc'], fg: '#1c1c1e', bar: '#3f6a4a' } });
      // A guard dog's kennel (no dog: he's on his break).
      const kx = O.x0 + 2, kz = O.z1 + 2.2;
      box(world, 'wood', kx - 0.6, KERB, kz - 0.7, kx + 0.6, KERB + 0.8, kz + 0.7, 0x8a6a48, 'wood');
      W.gable(c.wood, kx - 0.7, kz - 0.8, kx + 0.7, kz + 0.8, KERB + 0.8, 0.45, 'z', col(0xa8322c), col(0x8a6a48));
      world.physics.addBox(kx - 0.9, KERB + 0.7, kz - 1.1, kx + 0.9, KERB + 1.25, kz + 1.1, 'wood', F().SOLID | F().SHOTS); // the roof, eaves and all
      c.propMatte.box(kx + 0.61, KERB + 0.05, kz - 0.25, kx + 0.62, KERB + 0.55, kz + 0.25, col(0x1c1c1e));
    }

    // Stacks of flattened cars: double rows with aisles you can drive down.
    let seed = 900;
    for (const x0 of [-603, -583, -563, -543]) { stackRow(world, 1612, 1666, x0, false, seed += 37); stackRow(world, 1678, 1738, x0, false, seed += 37); }
    for (const x0 of [-460, -440, -420]) { stackRow(world, 1612, 1666, x0, false, seed += 37); stackRow(world, 1678, 1738, x0, false, seed += 37); }
    for (const z0 of [1494, 1516]) stackRow(world, -616, -568, z0, true, seed += 37);
    for (const z0 of [1494, 1516]) { stackRow(world, -452, -414, z0, true, seed += 37); stackRow(world, -386, -336, z0, true, seed += 37); }
    // Hulks waiting their turn, tyre piles.
    const hulks = [[-372, 1625, 0.4], [-362, 1638, 2.1], [-350, 1622, 1.2], [-376, 1652, 2.9], [-355, 1660, 0.2], [-342, 1648, 1.7],
      [-370, 1690, 0.9], [-352, 1702, 2.6], [-365, 1720, 1.4], [-345, 1728, 0.6], [-378, 1735, 2.2], [-548, 1590, 0.3], [-432, 1585, 1.9], [-420, 1548, 0.8]];
    hulks.forEach(([x, z, yaw], i) => hulk(world, x, z, yaw, paint(i * 11 + 3), i));
    for (const [x, z, n] of [[-339, 1676, 6], [-340.2, 1677.4, 4], [-338.6, 1678.6, 5], [-386, 1676, 6], [-384.6, 1677, 3], [-612, 1590, 6], [-610.6, 1591.2, 5], [-611.8, 1592.6, 4],
      [-500, 1570, 5], [-498.8, 1571, 6], [-388, 1580, 6], [-386.8, 1581.4, 4], [-560, 1546, 5], [-561.4, 1547, 6]]) tyres(world, x, z, n);
    // Floodlight masts.
    mast(world, -526, 1604, 16, -516, 1580, 26);
    mast(world, -488, 1660, 16, -476, 1660, 24);
    mast(world, -575, 1672, 16, -575, 1672, 24);
    mast(world, -432, 1672, 16, -432, 1672, 24);
    mast(world, -400, 1604, 16, -420, 1585, 26);
    mast(world, -488, 1740, 14, -476, 1730, 20);

    buildCrusher(world);
    buildCrane(world);
  }

  function buildCrusher(world) {
    const W = K(), Sk = S();
    const c = world.ctxAt((CR.x0 + CR.x1) / 2, (CR.z0 + CR.z1) / 2);
    const yel = 0xd8a520, steel = 0x5a5e63;
    // A concrete pad, the steel floor of the bay with yellow-and-black edges.
    W.pave(world, CR.x0 - 6, CR.z0 - 4, CR.booth.x1 + 3, CR.booth.z1 + 3, 0xb8b4ac, 'plazaTop', KERB + 0.018, 3);
    W.pave(world, CR.bay.x0, CR.bay.z0, CR.bay.x1, CR.bay.z1 + 1.5, 0x6a6e73, 'marks', KERB + 0.022, 0);
    for (let x = CR.bay.x0; x < CR.bay.x1 - 0.1; x += 0.8) W.mark(world, x, CR.bay.z1 + 1.1, x + 0.4, CR.bay.z1 + 1.5, 0xf2c230, KERB + 0.026);
    // Side walls and back wall (solid steel), the housing over the bay, the rams on top.
    box(world, 'prop', CR.x0, KERB, CR.z0, CR.bay.x0, KERB + CR.wallH, CR.z1, yel, 'metal');
    box(world, 'prop', CR.bay.x1, KERB, CR.z0, CR.x1, KERB + CR.wallH, CR.z1, yel, 'metal');
    box(world, 'prop', CR.bay.x0, KERB, CR.z0, CR.bay.x1, KERB + CR.wallH, CR.bay.z0, steel, 'metal');
    Sk.air(world, c.prop, CR.x0 - 0.5, KERB + CR.wallH, CR.z0 - 0.5, CR.x1 + 0.5, CR.top, CR.z1 + 0.5, yel, 'metal');
    // Hazard chevrons up the two front edges, a black band round the housing.
    for (const x of [CR.x0, CR.bay.x1]) for (let y = KERB + 0.2; y < KERB + CR.wallH - 0.3; y += 0.7) c.prop.box(x + 0.05, y, CR.z1 + 0.01, x + 1.95, y + 0.35, CR.z1 + 0.04, col(0x1c1c1e));
    c.prop.box(CR.x0 - 0.52, CR.top - 0.5, CR.z1 + 0.5, CR.x1 + 0.52, CR.top - 0.3, CR.z1 + 0.53, col(0x1c1c1e));
    for (const [x, z] of [[-518, 1551.5], [-514, 1551.5], [-518, 1557.5], [-514, 1557.5]]) {
      Sk.drum(world, c.prop, x, CR.top, z, 0.4, 2.0, 10, 0x8a9097, 'metal');
      c.prop.cylinder(x, CR.top + 2.0, z, 0.5, 0.5, 0.25, 10, col(0x3a3f45), true);
    }
    W.sign(world, { x: (CR.x0 + CR.x1) / 2, y: CR.top - 1.2, z: CR.z1 + 0.58, yaw: 0, w: 9.4, h: 1.2, lines: ['CRUSHER · DRIVE IN · GET OUT · STAND CLEAR'], style: 'info', oneSided: true, colors: { bg: ['#1c1c1e', '#1c1c1e'], fg: '#f2c230', bar: '#f2c230' } });
    // Work lights under the housing's front lip, a pool in the bay.
    for (const x of [CR.bay.x0 + 0.6, CR.bay.x1 - 0.6]) c.screen.box(x - 0.3, KERB + CR.wallH - 0.08, CR.z1 + 0.3, x + 0.3, KERB + CR.wallH, CR.z1 + 0.5, VH.col(0xfff0c8, 2.2));
    (world.floodlights || (world.floodlights = [])).push({ x: (CR.bay.x0 + CR.bay.x1) / 2, z: CR.bay.z1 + 1, r: 9, y: KERB + 0.03, strength: 0.5, tint: [1.1, 1.0, 0.85] });
    // The hopper (the jaws) on the housing's west half: four flared steel walls.
    const hx0 = CR.x0 - 0.3, hx1 = CR.x0 + 5.4, hz0 = CR.z0 + 0.6, hz1 = CR.z1 - 0.6, hy0 = CR.top, hy1 = CR.top + 2.8;
    Sk.air(world, c.prop, hx0, hy0, hz0, hx1, hy1, hz0 + 0.2, steel, 'metal');
    Sk.air(world, c.prop, hx0, hy0, hz1 - 0.2, hx1, hy1, hz1, steel, 'metal');
    Sk.air(world, c.prop, hx1 - 0.2, hy0, hz0, hx1, hy1, hz1, steel, 'metal');
    Sk.air(world, c.prop, hx0, hy0, hz0, hx0 + 0.2, hy1 - 0.4, hz1, steel, 'metal');
    c.propMatte.box(hx0 + 0.2, hy0 + 0.02, hz0 + 0.2, hx1 - 0.2, hy0 + 0.06, hz1 - 0.2, col(0x1c1c1e));
    for (let x = hx0 + 0.6; x < hx1 - 0.4; x += 0.9) c.prop.box(x, hy1 - 0.25, hz0 + 0.2, x + 0.3, hy1 - 0.05, hz0 + 0.5, col(0xc9cdd1)); // the teeth

    // --- the feed conveyor: legs, side girders, the belt (its cleats move: IronLife), rollers
    const B = CR.belt;
    const yAt = (x) => B.y0 + ((x - B.x0) / (B.x1 - B.x0)) * (B.y1 - B.y0);
    const ctxB = world.ctxAt((B.x0 + B.x1) / 2, B.z);
    slabX(ctxB.prop, B.x0, B.y0, B.x1, B.y1, B.z, B.w, 0.18, 0x2a2c30);
    for (const s of [-1, 1]) {
      const z = B.z + s * (B.w / 2 + 0.08);
      slabX(ctxB.prop, B.x0, B.y0 + 0.35, B.x1, B.y1 + 0.35, z, 0.12, 0.6, yel);
    }
    // Low end closed in down to the ground (a loading skirt) as far as the
    // first collider segment that ends above head height; higher up it stands on legs.
    const NB = 12, LB = B.x1 - B.x0;
    let skirtX = B.x0;
    for (let k = 0; k < NB; k++) { const xb = B.x0 + (LB * (k + 1)) / NB; if (yAt(xb) > 2.6) break; skirtX = xb; }
    for (const s of [-1, 1]) {
      const z = B.z + s * (B.w / 2 + 0.14);
      Sk.face(ctxB.prop, [[B.x0, KERB, z], [skirtX, KERB, z], [skirtX, yAt(skirtX) - 0.18, z], [B.x0, B.y0 - 0.18, z]], col(0x4a4f56), [B.x0 + 1, 0.5, B.z]);
    }
    ctxB.prop.box(B.x0 - 0.05, KERB, B.z - B.w / 2 - 0.14, B.x0, B.y0, B.z + B.w / 2 + 0.14, col(0x4a4f56));
    for (let x = skirtX + 2; x < B.x1 - 1; x += 4) {
      const y = yAt(x) - 0.2;
      for (const s of [-1, 1]) {
        const z = B.z + s * (B.w / 2 + 0.1);
        box(world, 'prop', x - 0.12, KERB, z - 0.12, x + 0.12, y, z + 0.12, 0x4a4f56, 'metal');
      }
      ctxB.prop.box(x - 0.1, y - 0.5, B.z - B.w / 2, x + 0.1, y - 0.35, B.z + B.w / 2, col(0x4a4f56));
    }
    // The belt is solid (you could walk up it, it's a bad idea): ramp segments,
    // closed beneath the skirt (with a box core there that cars can't drive through).
    for (let k = 0; k < NB; k++) {
      const xa = B.x0 + (LB * k) / NB, xb = B.x0 + (LB * (k + 1)) / NB;
      const ya = yAt(xa), yb = yAt(xb);
      const closed = xb <= skirtX + 1e-6;
      const base = closed ? 0 : ya - 0.25;
      world.physics.addRamp((xa + xb) / 2, B.z, B.w / 2, (xb - xa) / 2, PI / 2, base, ya, yb, 'metal', F().ALL);
      if (closed && ya > 0.45) world.physics.addBox(xa, 0, B.z - B.w / 2 - 0.2, xb, ya - 0.03, B.z + B.w / 2 + 0.2, 'metal', F().SOLID | F().SHOTS);
      // The side girders (their tops follow the slope) keep feet on the belt or off it.
      for (const sd of [-1, 1]) world.physics.addRamp((xa + xb) / 2, B.z + sd * (B.w / 2 + 0.08), 0.1, (xb - xa) / 2, PI / 2, base, ya + 0.35, yb + 0.35, 'railing', F().SOLID | F().SHOTS);
    }
    W.sign(world, { x: B.x0 + 4, y: 1.9, z: B.z + B.w / 2 + 0.26, yaw: 0, w: 2.6, h: 0.8, lines: ['FEED BELT', 'DO NOT RIDE THE BELT'], style: 'info', oneSided: true, colors: { bg: ['#f2c230', '#e0b020'], fg: '#1c1c1e', bar: '#1c1c1e' } });

    // --- the catwalk beside the belt (north side) up to the platform at the jaws
    const Wk = CR.walk, Pf = CR.plat;
    const wyAt = (x) => KERB + ((x - Wk.x0) / (Wk.x1 - Wk.x0)) * (Wk.y1 - KERB);
    const ctxW = world.ctxAt((Wk.x0 + Wk.x1) / 2, Wk.z);
    slabX(ctxW.prop, Wk.x0, KERB + 0.02, Wk.x1, Wk.y1, Wk.z, Wk.w, 0.12, 0x8f969c);
    for (let x = Wk.x0 + 0.4; x < Wk.x1; x += 0.45) {
      const y = wyAt(x);
      ctxW.prop.box(x, y, Wk.z - Wk.w / 2 + 0.05, x + 0.05, y + 0.03, Wk.z + Wk.w / 2 - 0.05, col(0x6a7076)); // grip bars
    }
    const NW = 16, LW = Wk.x1 - Wk.x0;
    let walkSkirt = Wk.x0;
    for (let k = 0; k < NW; k++) { const xb = Wk.x0 + (LW * (k + 1)) / NW; if (wyAt(xb) > 2.4) break; walkSkirt = xb; }
    for (const s of [-1, 1]) {
      const z = Wk.z + s * Wk.w / 2;
      Sk.face(ctxW.prop, [[Wk.x0, KERB, z], [walkSkirt, KERB, z], [walkSkirt, wyAt(walkSkirt) - 0.1, z]], col(0x6a7076), [Wk.x0 + 2, 0.4, Wk.z]);
      // Handrail and mid rail, posts.
      const zr = Wk.z + s * (Wk.w / 2 - 0.04);
      K().beam(ctxW.prop, Wk.x0, KERB + 1.05, zr, Wk.x1, Wk.y1 + 1.05, zr, 0.06, col(yel));
      K().beam(ctxW.prop, Wk.x0, KERB + 0.55, zr, Wk.x1, Wk.y1 + 0.55, zr, 0.04, col(yel));
      for (let x = Wk.x0; x <= Wk.x1 + 0.01; x += (Wk.x1 - Wk.x0) / 8) ctxW.prop.box(x - 0.04, wyAt(x), zr - 0.04, x + 0.04, wyAt(x) + 1.05, zr + 0.04, col(yel));
    }
    {
      for (let k = 0; k < NW; k++) {
        const xa = Wk.x0 + (LW * k) / NW, xb = Wk.x0 + (LW * (k + 1)) / NW;
        const ya = wyAt(xa), yb = wyAt(xb);
        const closed = xb <= walkSkirt + 1e-6;
        const base = closed ? 0 : ya - 0.2;
        world.physics.addRamp((xa + xb) / 2, Wk.z, Wk.w / 2, (xb - xa) / 2, PI / 2, base, ya, yb, 'metal', F().SOLID | F().SHOTS);
        if (closed && ya > 0.45) world.physics.addBox(xa, 0, Wk.z - Wk.w / 2, xb, ya - 0.03, Wk.z + Wk.w / 2, 'metal', F().SOLID | F().SHOTS);
        // Handrails: thin ramps whose tops follow the rail.
        for (const sd of [-1, 1]) world.physics.addRamp((xa + xb) / 2, Wk.z + sd * (Wk.w / 2 - 0.02), 0.07, (xb - xa) / 2, PI / 2, base, ya + 1.05, yb + 1.05, 'railing', F().SOLID);
      }
      for (let x = walkSkirt + 2; x < Wk.x1 - 0.5; x += 4) {
        const y = wyAt(x) - 0.12;
        for (const s of [-1, 1]) box(world, 'prop', x - 0.08, KERB, Wk.z + s * (Wk.w / 2 - 0.1) - 0.08, x + 0.08, y, Wk.z + s * (Wk.w / 2 - 0.1) + 0.08, 0x6a7076, 'metal');
      }
    }
    // The platform at the jaws: a steel deck on four legs, railed round (open to the catwalk).
    const ctxP = world.ctxAt((Pf.x0 + Pf.x1) / 2, (Pf.z0 + Pf.z1) / 2);
    W.deck(world, ctxP.prop, Pf.x0, Pf.z0, Pf.x1, Pf.z1, Pf.y, 0x8f969c, 'metal', 0.18);
    for (const x of [Pf.x0 + 0.15, Pf.x1 - 0.15]) for (const z of [Pf.z0 + 0.15, Pf.z1 - 0.15]) box(world, 'prop', x - 0.1, KERB, z - 0.1, x + 0.1, Pf.y - 0.18, z + 0.1, 0x6a7076, 'metal');
    K().deckRails(world, Pf.x0, Pf.z0, Pf.x1, Pf.z1, Pf.y, [{ side: 'w', a0: Wk.z - Wk.w / 2, a1: Wk.z + Wk.w / 2 }], yel);
    W.sign(world, { x: Pf.x0 + 0.02, y: Pf.y + 1.6, z: (Pf.z0 + Pf.z1) / 2 - 0.6, yaw: -PI / 2, w: 1.6, h: 0.6, lines: ['JAWS · NO ENTRY', 'WHILE BELT RUNS'], style: 'info', oneSided: true, colors: { bg: ['#d8342c', '#b82a24'], fg: '#ffffff', bar: '#ffffff' } });

    // --- the control booth and its panel with the big red button
    const Bo = CR.booth;
    const cb = world.ctxAt((Bo.x0 + Bo.x1) / 2, (Bo.z0 + Bo.z1) / 2);
    box(world, 'prop', Bo.x0, KERB, Bo.z0, Bo.x1, KERB + 2.7, Bo.z1, 0xd8a520, 'metal');
    cb.prop.box(Bo.x0 - 0.15, KERB + 2.7, Bo.z0 - 0.15, Bo.x1 + 0.15, KERB + 2.85, Bo.z1 + 0.15, col(0x3a3f45));
    cb.screen.box(Bo.x0 - 0.04, KERB + 1.2, Bo.z0 + 0.5, Bo.x0, KERB + 2.3, Bo.z1 - 0.5, VH.col(0xcfe6ff, 1.1));
    cb.screen.box(Bo.x0 + 0.4, KERB + 1.2, Bo.z1, Bo.x1 - 1.6, KERB + 2.3, Bo.z1 + 0.04, VH.col(0xcfe6ff, 1.1));
    cb.prop.box(Bo.x1 - 1.3, KERB, Bo.z1, Bo.x1 - 0.4, KERB + 2.1, Bo.z1 + 0.05, col(0x3a3f45));
    {
      const P = CR.panel;
      box(world, 'prop', P.x - 0.35, KERB, P.z - 0.25, P.x + 0.35, KERB + 1.0, P.z + 0.25, 0x3a3f45, 'metal');
      cb.prop.box(P.x - 0.4, KERB + 1.0, P.z - 0.32, P.x + 0.4, KERB + 1.12, P.z + 0.32, col(0xd8a520));
      cb.prop.cylinder(P.x, KERB + 1.12, P.z, 0.17, 0.17, 0.05, 12, col(0xf2c230), true);
      cb.screen.cylinder(P.x, KERB + 1.17, P.z, 0.13, 0.12, 0.09, 12, VH.col(0xe02a20, 1.5), true);
      for (const dx of [-0.27, 0.27]) cb.screen.box(P.x + dx - 0.04, KERB + 1.12, P.z - 0.2, P.x + dx + 0.04, KERB + 1.16, P.z - 0.12, VH.col(dx < 0 ? 0x40e060 : 0xf0a020, 1.4));
    }
  }

  /** The scrap crane's base (static): a tracked undercarriage and the slewing ring; the rest turns in IronLife. */
  function buildCrane(world) {
    const Cn = SY.crane;
    const c = world.ctxAt(Cn.x, Cn.z);
    for (const s of [-1, 1]) {
      box(world, 'propMatte', Cn.x - 3.2, KERB, Cn.z + s * 1.6 - 0.6, Cn.x + 3.2, KERB + 1.1, Cn.z + s * 1.6 + 0.6, 0x2a2c30, 'metal');
      for (let x = Cn.x - 3; x < Cn.x + 3; x += 0.45) c.propMatte.box(x, KERB + 1.1, Cn.z + s * 1.6 - 0.62, x + 0.2, KERB + 1.16, Cn.z + s * 1.6 + 0.62, col(0x1c1c1e));
    }
    box(world, 'prop', Cn.x - 1.4, KERB, Cn.z - 1.0, Cn.x + 1.4, KERB + 1.2, Cn.z + 1.0, 0x3a3f45, 'metal');
    S().drum(world, c.prop, Cn.x, KERB + 1.2, Cn.z, 1.5, 0.5, 14, 0x4a4f56, 'metal');
  }

  // ---------------------------------------------------- the power station
  // Plot -313..-13 x 1477..1749, front east on Grand Avenue. The refinery's
  // tank farm on the west side, its pipe racks over a service road from
  // Foundry Road to the South Coast Highway, then the power station: a ring
  // road round the two big chimneys, the boiler house and turbine hall, the
  // switchyard, and the forecourt on Grand Avenue.
  const PW = {
    x0: -313, x1: -13, z0: 1477, z1: 1749,
    fence: { x0: -311.5, x1: -14.5, z0: 1478.5, z1: 1747.5 },
    gate: [1597, 1611], // on Grand Avenue
    pipe: { x0: -232, x1: -222, colW: -233.6, colE: -220.4, z0: 1486, z1: 1740, y1: 6.4, y2: 8.6 },
    ring: { x0: -213, x1: -145, z0: 1556, z1: 1683, w: 8 },
    link: { z0: 1610, z1: 1624 }, // the pipe road to the ring
    fore: { x0: -42, x1: -16, z0: 1556, z1: 1683 },
    boiler: { x0: -142, x1: -118, z0: 1578, z1: 1655, h: 44 },
    hall: { x0: -118, x1: -48, z0: 1580, z1: 1638, h: 26 },
    yard: { x0: -110, x1: -48, z0: 1690, z1: 1740 },
    chimneys: [
      { x: -179, z: 1590, r0: 5.4, r1: 3.6, h: 96 },
      { x: -179, z: 1648, r0: 5.4, r1: 3.6, h: 96 },
      { x: -190, z: 1718, r0: 4.2, r1: 2.8, h: 74 }, // the third one, built in Hob's way
    ],
    tanks: [[-290, 1500, 10, 12], [-262, 1502, 9, 14], [-288, 1540, 11, 13], [-258, 1545, 9, 11], [-290, 1590, 10, 15], [-260, 1592, 9, 12],
      [-288, 1638, 11, 13], [-258, 1648, 9, 12], [-282, 1700, 13, 14], [-252, 1714, 8, 10]],
    flare: { x: -300, z: 1734, h: 46 },
  };

  let PIPE = null;
  /** A round pipe along z from z0 to z1 at (x, y), radius r, drawn in pieces (one per chunk). */
  function pipeZ(world, surf, x, y, z0, z1, r, hex) {
    if (!PIPE) PIPE = new THREE.CylinderGeometry(1, 1, 1, 10, 1, true).rotateX(PI / 2);
    for (let z = z0; z < z1 - 1e-6; z += 40) {
      const za = z, zb = Math.min(z1, z + 40);
      const sf = world.ctxAt(x, (za + zb) / 2)[surf];
      _v.set(x, y, (za + zb) / 2);
      _q.identity();
      _s.set(r, r, zb - za);
      _m.compose(_v, _q, _s);
      sf.merge(PIPE, _m, col(hex));
    }
  }
  /** A round pipe along x. */
  function pipeX(world, surf, x0, x1, y, z, r, hex) {
    if (!PIPE) PIPE = new THREE.CylinderGeometry(1, 1, 1, 10, 1, true).rotateX(PI / 2);
    for (let x = x0; x < x1 - 1e-6; x += 40) {
      const xa = x, xb = Math.min(x1, x + 40);
      const sf = world.ctxAt((xa + xb) / 2, z)[surf];
      _v.set((xa + xb) / 2, y, z);
      _q.setFromAxisAngle(_Y, PI / 2);
      _s.set(r, r, xb - xa);
      _m.compose(_v, _q, _s);
      sf.merge(PIPE, _m, col(hex));
    }
  }

  /** A tapering chimney with red and white bands at the top, warning lights, a stack of round colliders. */
  function chimney(world, c) {
    const ctx = world.ctxAt(c.x, c.z);
    const rAt = (y) => c.r0 + (c.r1 - c.r0) * (y / c.h);
    // A square plinth.
    box(world, 'concrete', c.x - c.r0 - 2, KERB, c.z - c.r0 - 2, c.x + c.r0 + 2, KERB + 1.2, c.z + c.r0 + 2, 0xb8b4ac, 'concrete');
    ctx.concrete.cylinder(c.x, KERB + 1.2, c.z, c.r0, rAt(c.h - 8), c.h - 8, 20, col(0xc8c2b6), false);
    ctx.concrete.cylinder(c.x, KERB + 1.2 + c.h - 8, c.z, rAt(c.h - 8), c.r1, 8, 20, col(0xd8342c), false);
    ctx.prop.cylinder(c.x, KERB + 1.2 + c.h - 5.5, c.z, rAt(c.h - 5.5) + 0.03, rAt(c.h - 3) + 0.03, 2.5, 20, col(0xf2f2ee), false);
    ctx.propMatte.cylinder(c.x, KERB + 1.2 + c.h - 0.6, c.z, c.r1 + 0.15, c.r1 + 0.15, 0.6, 20, col(0x2a2c30), false);
    ctx.propMatte.cylinder(c.x, KERB + 1.2 + c.h - 0.4, c.z, c.r1 - 0.3, c.r1 - 0.3, 0.05, 16, col(0x0c0c0c), true);
    // Aviation lights on four sides near the top and halfway.
    for (const yy of [c.h - 1.0, c.h * 0.5]) {
      const r = rAt(yy) + 0.12;
      for (let k = 0; k < 4; k++) {
        const a = (k * PI) / 2 + PI / 4, lx = c.x + Math.cos(a) * r, lz = c.z + Math.sin(a) * r;
        ctx.screen.box(lx - 0.25, KERB + 1.2 + yy, lz - 0.25, lx + 0.25, KERB + 1.2 + yy + 0.5, lz + 0.25, VH.col(0xff2a1a, 2.6));
      }
    }
    // A ladder cage up one side (drawn), and a door at the foot.
    const lx = c.x + c.r0 + 0.25;
    ctx.prop.box(lx - 0.05, KERB + 1.2, c.z - 0.35, lx + 0.05, KERB + 1.2 + c.h * 0.95, c.z - 0.3, col(0x5a5e63));
    ctx.prop.box(lx - 0.05, KERB + 1.2, c.z + 0.3, lx + 0.05, KERB + 1.2 + c.h * 0.95, c.z + 0.35, col(0x5a5e63));
    ctx.prop.box(c.x - 1, KERB + 1.2, c.z + c.r0 - 0.05, c.x + 1, KERB + 3.6, c.z + c.r0 + 0.2, col(0x3a3f45));
    // Solid: stacked discs following the taper.
    const n = 6;
    for (let k = 0; k < n; k++) {
      const ya = (c.h * k) / n, yb = (c.h * (k + 1)) / n;
      S().disc(world, c.x, c.z, rAt(ya), k === 0 ? 0 : KERB + 1.2 + ya, KERB + 1.2 + yb, 'concrete', F().ALL);
    }
  }

  /** A refinery tank: a squat drum with a shallow cone roof, a stair band, a lamp. */
  function tank(world, x, z, r, h, i) {
    const ctx = world.ctxAt(x, z);
    const shell = i % 3 === 0 ? 0xe8e6e0 : i % 3 === 1 ? 0xd8d4cc : 0xcfd3d6;
    S().drum(world, ctx.prop, x, KERB, z, r, h, 24, shell, 'metal');
    ctx.prop.cylinder(x, KERB + h, z, r + 0.1, r * 0.25, r * 0.18, 24, col(0xb8bcc0), true);
    for (const yy of [h * 0.33, h * 0.66]) ctx.prop.cylinder(x, KERB + yy, z, r + 0.04, r + 0.04, 0.15, 24, col(0x9aa0a6), false);
    ctx.prop.cylinder(x, KERB + 0.4, z, r + 0.05, r + 0.05, 0.5, 24, col(i % 2 ? 0x2f7f6f : 0xd8a520), false);
    // A stair wound up the side to the roof: treads (the low ones blocks down to the
    // ground), a handrail on posts. You can climb it: a ramp per flight under the
    // treads, a rail along the outside, and you come out on the rim.
    const steps = 18, da = 1.6 / steps;
    const at = (a, rr) => [x + Math.cos(a) * rr, z + Math.sin(a) * rr];
    let prevPost = null;
    for (let k = 0; k < steps; k++) {
      const a0 = -PI / 2 + k * da, yy = KERB + (h * (k + 1)) / steps, yPrev = KERB + (h * k) / steps;
      const [sx, sz] = at(a0, r + 0.5);
      if (yy < 2.6) ctx.prop.orientedBox(sx, sz, 0.5, 0.38, -a0, KERB, yy, col(0x8f969c));
      else ctx.prop.orientedBox(sx, sz, 0.5, 0.35, -a0, yy - 0.08, yy, col(0x8f969c));
      const [px, pz] = at(a0, r + 0.97);
      ctx.prop.orientedBox(px, pz, 0.03, 0.03, -a0, yy, yy + 1.0, col(0xd8a520));
      if (prevPost) K().beam(ctx.prop, prevPost[0], prevPost[1] + 1.0, prevPost[2], px, yy + 1.0, pz, 0.05, 0xd8a520);
      prevPost = [px, yy, pz];
      // The flight up to this tread: from the last tread's centre (the ground before the first).
      const [ax, az] = at(a0 - da, r + 0.5), dx = sx - ax, dz = sz - az, len = Math.hypot(dx, dz), yaw = Math.atan2(dx, dz);
      const low = yPrev < 2.6; // a flight over a block tread: solid to the ground
      world.physics.addRamp((ax + sx) / 2, (az + sz) / 2, 0.5, len / 2 + 0.05, yaw, low ? 0 : yPrev - 0.4, yPrev, yy, 'metal', F().SOLID | F().SHOTS);
      const [rx0, rz0] = at(a0 - da, r + 1.0), [rx1, rz1] = at(a0, r + 1.0);
      world.physics.addRamp((rx0 + rx1) / 2, (rz0 + rz1) / 2, 0.05, len / 2 + 0.06, yaw, low ? 0 : yPrev - 0.4, yPrev + 1.0, yy + 1.0, 'metal', F().ALL); // its top follows the handrail
      // The balustrade: a mesh panel under the handrail (what the rail collider is).
      const yb0 = low ? KERB : yPrev - 0.1, yb1 = low ? KERB : yy - 0.1; // over the block treads the panel skirts down to the ground, like its collider
      const pan = [[rx0, yb0, rz0], [rx1, yb1, rz1], [rx1, yy + 1.0, rz1], [rx0, yPrev + 1.0, rz0]];
      S().face(ctx.prop, pan, col(0x5a5e63), [x, yy, z]);
      S().face(ctx.prop, pan, col(0x5a5e63), [2 * rx1 - x, yy, 2 * rz1 - z]);
    }
    // The roof: solid in steps a stride high, so you can walk up it to the lamp at the top.
    const H = r * 0.18, R0 = r + 0.1, R1 = r * 0.25, n = Math.ceil(H / 0.42);
    for (let k = 1; k <= n; k++) {
      const ym = H * (k - 0.5) / n;
      S().disc(world, x, z, R0 - (R0 - R1) * ym / H, KERB + h + H * (k - 1) / n, KERB + h + H * k / n, 'metal', F().ALL);
    }
    ctx.screen.box(x - 0.3, KERB + h + H, z - 0.3, x + 0.3, KERB + h + H + 0.4, z + 0.3, VH.col(0xfff0c8, 2.2));
    world.physics.addBox(x - 0.3, KERB + h + H, z - 0.3, x + 0.3, KERB + h + H + 0.4, z + 0.3, 'metal', F().ALL);
  }

  function buildPower(world) {
    const W = K(), Sk = S();
    const Fn = PW.fence;
    // Ground: gravel over the slab, asphalt for the roads, concrete under the buildings.
    W.pave(world, Fn.x0, Fn.z0, Fn.x1, Fn.z1, 0x9a968c, 'decal', KERB + 0.006, 8);
    const road = (x0, z0, x1, z1) => W.pave(world, x0, z0, x1, z1, 0xd8d4cc, 'asphaltTop', KERB + 0.014, 6);
    const P = PW.pipe, Rg = PW.ring, Fo = PW.fore;
    road(P.x0, PW.z0, P.x1, PW.z1);
    road(Rg.x0, Rg.z0, Rg.x1, Rg.z0 + Rg.w); road(Rg.x0, Rg.z1 - Rg.w, Rg.x1, Rg.z1);
    road(Rg.x0, Rg.z0 + Rg.w, Rg.x0 + Rg.w, Rg.z1 - Rg.w); road(Rg.x1 - Rg.w, Rg.z0 + Rg.w, Rg.x1, Rg.z1 - Rg.w);
    road(Rg.x1, Rg.z0, Fo.x0, Rg.z0 + Rg.w); road(Rg.x1, Rg.z1 - Rg.w, Fo.x0, Rg.z1);
    road(P.x1, PW.link.z0, Rg.x0, PW.link.z1);
    road(Fo.x0, Fo.z0, Fo.x1, Fo.z1);
    road(Fo.x1, PW.gate[0], PW.x1, PW.gate[1]);
    for (const [x0, z0, x1, z1] of [[P.x0, PW.z0, P.x1, PW.z1]]) for (let z = z0 + 4; z < z1 - 4; z += 9) W.mark(world, (x0 + x1) / 2 - 0.08, z, (x0 + x1) / 2 + 0.08, z + 4.5, 0xf4f4ef);
    // The fence: chain-link round the plot, gates on Grand Avenue and at both ends of the pipe road.
    W.fence(world, Fn.x0, Fn.z0, Fn.x1, Fn.z0, [[P.x0, P.x1]], 'chain', 2.6);
    W.fence(world, Fn.x0, Fn.z1, Fn.x1, Fn.z1, [[P.x0, P.x1]], 'chain', 2.6);
    W.fence(world, Fn.x0, Fn.z0, Fn.x0, Fn.z1, [], 'chain', 2.6);
    W.fence(world, Fn.x1, Fn.z0, Fn.x1, Fn.z1, [PW.gate], 'chain', 2.6);
    // The gatehouse and its barrier (up), the name on a board by the gate.
    {
      const gx0 = -22, gx1 = -17, gz0 = PW.gate[1] + 1.5, gz1 = gz0 + 4;
      const c = world.ctxAt((gx0 + gx1) / 2, (gz0 + gz1) / 2);
      box(world, 'prop', gx0, KERB, gz0, gx1, KERB + 2.8, gz1, 0xe8e6e0, 'building');
      c.prop.box(gx0 - 0.3, KERB + 2.8, gz0 - 0.3, gx1 + 0.3, KERB + 3.0, gz1 + 0.3, col(0x2f5f9f));
      c.screen.box(gx0 - 0.03, KERB + 1.1, gz0 + 0.5, gx0, KERB + 2.2, gz1 - 0.5, VH.col(0xffe7b0, 1.2));
      c.screen.box(gx0 + 0.5, KERB + 1.1, gz0 - 0.03, gx1 - 0.5, KERB + 2.2, gz0, VH.col(0xffe7b0, 1.2));
      box(world, 'prop', -20.3, KERB, PW.gate[1] - 0.4, -19.5, KERB + 1.1, PW.gate[1] + 0.4, 0xd8342c, 'metal');
      c.prop.box(-20.0, KERB + 1.0, PW.gate[1] - 0.06, -19.8, KERB + 6.5, PW.gate[1] + 0.06, col(0xf2f2ee)); // the boom, raised
      for (let y = KERB + 1.6; y < KERB + 6.4; y += 1.2) c.prop.box(-20.02, y, PW.gate[1] - 0.07, -19.78, y + 0.5, PW.gate[1] + 0.07, col(0xd8342c));
      W.sign(world, { x: PW.x1 - 4, y: KERB + 3.2, z: PW.gate[0] - 5, yaw: PI / 2, w: 9, h: 2.6, lines: ['IRONSIDE POWER STATION', 'SOUTHBAY ELECTRIC CO. · VISITORS REPORT TO THE GATEHOUSE'], style: 'info', posts: true, colors: { bg: ['#2f5f9f', '#1f4f8f'], fg: '#ffffff', bar: '#f2c230' } });
    }

    // --- the refinery: tanks in bunds, risers up to the racks, the flare stack
    PW.tanks.forEach(([x, z, r, h], i) => tank(world, x, z, r, h, i));
    for (const [z0, z1, gz] of [[1486, 1562, 1524], [1574, 1666, 1620], [1680, 1738, 1708]]) {
      const x0 = -305, x1 = -240;
      const wall = (a0, a1, c, alongX) => {
        if (alongX) box(world, 'concrete', a0, KERB, c - 0.2, a1, KERB + 1.0, c + 0.2, 0xb8b4ac, 'concrete');
        else box(world, 'concrete', c - 0.2, KERB, a0, c + 0.2, KERB + 1.0, a1, 0xb8b4ac, 'concrete');
      };
      wall(x0, x1, z0, true); wall(x0, x1, z1, true); wall(z0, z1, x0, false);
      wall(z0, gz - 3, x1, false); wall(gz + 3, z1, x1, false);
    }
    // A line from each tank's side to the racks, where nothing's in the way.
    for (const [x, z, r] of PW.tanks) {
      const blocked = PW.tanks.some(([x2, z2, r2]) => x2 > x && Math.abs(z2 - z) < r2 + 0.6);
      if (!blocked) pipeX(world, 'prop', x + r - 0.2, P.colW, KERB + P.y1 + 0.55, z, 0.25, 0x9aa0a6);
    }
    {
      const Fl = PW.flare;
      const c = world.ctxAt(Fl.x, Fl.z);
      box(world, 'concrete', Fl.x - 2, KERB, Fl.z - 2, Fl.x + 2, KERB + 0.8, Fl.z + 2, 0xb8b4ac, 'concrete');
      Sk.drum(world, c.prop, Fl.x, KERB + 0.8, Fl.z, 0.7, Fl.h, 10, 0xb8bcc0, 'metal');
      c.prop.cylinder(Fl.x, KERB + Fl.h - 6, Fl.z, 0.75, 0.75, 1.0, 10, col(0xd8342c), false);
      c.screen.cylinder(Fl.x, KERB + Fl.h + 0.8, Fl.z, 0.5, 0.9, 1.6, 10, VH.col(0xff9a2a, 3.0), true);
      W.sign(world, { x: -275, y: KERB + 3.0, z: 1483.4, yaw: PI, w: 12, h: 1.6, lines: ['IRONSIDE REFINING · TANK FARM'], style: 'info', posts: true, oneSided: true, colors: { bg: ['#e8e6e0', '#d8d4cc'], fg: '#2f5f9f', bar: '#d8342c' } });
    }

    // --- the pipe racks over the service road
    {
      const ys = [P.y1, P.y2];
      for (let z = P.z0; z <= P.z1 + 1e-6; z += 8) {
        if (z > PW.link.z0 - 1 && z < PW.link.z1 + 1) continue; // the pipes span the mouth of the link road
        const c = world.ctxAt((P.colW + P.colE) / 2, z);
        for (const x of [P.colW, P.colE]) box(world, 'prop', x - 0.25, KERB, z - 0.25, x + 0.25, KERB + P.y2 + 0.4, z + 0.25, 0x6a7076, 'metal');
        for (const y of ys) c.prop.box(P.colW - 0.4, KERB + y - 0.35, z - 0.2, P.colE + 0.4, KERB + y, z + 0.2, col(0x6a7076));
      }
      for (const z of [P.z0, P.z1]) world.physics.addBox(P.colW - 0.4, KERB + P.y1 - 0.35, z - 0.2, P.colE + 0.4, KERB + P.y2, z + 0.2, 'metal', F().ALL);
      const runs = [
        [P.y1, -233.0, 0.45, 0xb8bcc0], [P.y1, -231.8, 0.3, 0xd8a520], [P.y1, -230.8, 0.5, 0x9aa0a6], [P.y1, -229.4, 0.3, 0xd8342c], [P.y1, -228.4, 0.35, 0xb8bcc0],
        [P.y1, -227.2, 0.6, 0xc8c2b6], [P.y1, -225.6, 0.3, 0x2f7f6f], [P.y1, -224.6, 0.4, 0xb8bcc0], [P.y1, -223.4, 0.3, 0xd8a520], [P.y1, -222.2, 0.45, 0x9aa0a6],
        [P.y2, -232.6, 0.6, 0x9aa0a6], [P.y2, -230.8, 0.4, 0xb8bcc0], [P.y2, -229.2, 0.7, 0xc8c2b6], [P.y2, -227.2, 0.3, 0xd8342c], [P.y2, -225.8, 0.5, 0xb8bcc0], [P.y2, -224.0, 0.35, 0x2f7f6f], [P.y2, -222.6, 0.55, 0x9aa0a6],
      ];
      for (const [y, x, r, hex] of runs) pipeZ(world, 'prop', x, KERB + y + r, P.z0 - 2, P.z1 + 2, r, hex);
      // Labels on the biggest lines (brave enough to read), and lamps under the racks.
      for (let z = P.z0 + 12; z < P.z1; z += 48) {
        W.sign(world, { x: -227.2, y: KERB + P.y1 + 0.6, z: z, yaw: PI / 2, w: 1.6, h: 0.35, lines: ['CRUDE · NO. 3'], style: 'info', oneSided: false, twoSided: true, colors: { bg: ['#f2c230', '#f2c230'], fg: '#1c1c1e', bar: '#1c1c1e' } });
      }
      for (let z = P.z0 + 4; z < P.z1; z += 16) {
        const c = world.ctxAt(-227, z);
        c.screen.box(-227.6, KERB + P.y1 - 0.5, z - 0.3, -226.4, KERB + P.y1 - 0.38, z + 0.3, VH.col(0xfff0c8, 2.4));
      }
      for (let z = P.z0 + 12; z < P.z1; z += 32) (world.floodlights || (world.floodlights = [])).push({ x: -227, z, r: 14, y: KERB + 0.03, strength: 0.5, tint: [1.1, 1.0, 0.85] });
      // The pipe bridge east to the boiler house, over the ring road.
      for (const r of [[0.5, 0xb8bcc0, -0.6], [0.4, 0xd8a520, 0.5], [0.35, 0x9aa0a6, 1.4]]) pipeX(world, 'prop', P.colE, PW.boiler.x0, KERB + 10 + r[0], 1600 + r[2], r[0], r[1]);
      for (const x of [-200, -165]) {
        box(world, 'prop', x - 0.25, KERB, 1599 - 0.25, x + 0.25, KERB + 10, 1599 + 0.25, 0x6a7076, 'metal');
        box(world, 'prop', x - 0.25, KERB, 1601.5 - 0.25, x + 0.25, KERB + 10, 1601.5 + 0.25, 0x6a7076, 'metal');
        world.ctxAt(x, 1600).prop.box(x - 0.4, KERB + 9.7, 1598.4, x + 0.4, KERB + 10, 1602.2, col(0x6a7076));
      }
      W.sign(world, { x: P.x0 - 4.5, y: KERB + 3.2, z: P.z0 - 3.5, yaw: PI, w: 6, h: 1.1, lines: ['PIPE ROAD · HEADROOM 6 M · NO PARKING'], style: 'info', posts: true, colors: { bg: ['#f2c230', '#f2c230'], fg: '#1c1c1e', bar: '#1c1c1e' } });
    }

    // --- the chimneys and the power station buildings
    for (const c of PW.chimneys) chimney(world, c);
    const Bo = PW.boiler, Hl = PW.hall;
    const ctxB = W.building(world, Bo.x0, Bo.z0, Bo.x1, Bo.z1, Bo.h, { wall: 0x9a6a52, roof: 0x5a5e63, style: 2, ww: 0.35, wh: 0.7, bay: 4.2, floorH: 7, seed: 0.61, parapet: 1.0 });
    const ctxH = W.building(world, Hl.x0, Hl.z0, Hl.x1, Hl.z1, Hl.h, { wall: 0xb07a5a, roof: 0x6a6e73, style: 2, ww: 0.42, wh: 0.78, bay: 5.0, floorH: 8.5, seed: 0.33, parapet: 0.8 });
    // A shallow pitched roof over the turbine hall, the name across its front.
    W.gable(ctxH.prop, Hl.x0, Hl.z0, Hl.x1, Hl.z1, KERB + Hl.h + 0.8, 3.2, 'x', col(0x6a6e73), col(0xb07a5a));
    world.physics.addBox(Hl.x0, KERB + Hl.h, Hl.z0, Hl.x1, KERB + Hl.h + 4, Hl.z1, 'building', F().ALL);
    W.sign(world, { x: Hl.x1 + 0.12, y: KERB + Hl.h - 4, z: (Hl.z0 + Hl.z1) / 2, yaw: PI / 2, w: 40, h: 3.6, lines: ['IRONSIDE POWER STATION'], style: 'neon', oneSided: true, colors: { bg: ['#1c2a3a', '#1c2a3a'], fg: '#f4f2ec', glow: '#9fd0ff', outline: '#f4f2ec' } });
    W.sign(world, { x: Hl.x1 + 0.12, y: KERB + Hl.h - 8.4, z: (Hl.z0 + Hl.z1) / 2, yaw: PI / 2, w: 22, h: 1.6, lines: ['SOUTHBAY ELECTRIC CO. · EST. 1958'], style: 'info', oneSided: true, colors: { bg: ['#2f5f9f', '#1f4f8f'], fg: '#ffffff', bar: '#f2c230' } });
    // A roller door and a personnel door on the front, lamps over them.
    ctxH.prop.box(Hl.x1 + 0.01, KERB, 1596, Hl.x1 + 0.08, KERB + 7, 1606, col(0x8a9097));
    for (let y = KERB + 0.6; y < KERB + 7; y += 0.6) ctxH.prop.box(Hl.x1 + 0.08, y, 1596, Hl.x1 + 0.1, y + 0.05, 1606, col(0x6a7076));
    ctxH.prop.box(Hl.x1 + 0.01, KERB, 1612, Hl.x1 + 0.08, KERB + 2.3, 1613.4, col(0x2f5f9f));
    for (const z of [1601, 1612.7]) ctxH.screen.box(Hl.x1 + 0.05, KERB + 7.6, z - 0.4, Hl.x1 + 0.4, KERB + 7.8, z + 0.4, VH.col(0xfff0c8, 2.2));
    // Flue ducts from the boiler house to the two big chimneys, high over the ring road.
    for (const c of PW.chimneys.slice(0, 2)) {
      box(world, 'prop', c.x + c.r0 - 1, KERB + 20, c.z - 3, Bo.x0, KERB + 26, c.z + 3, 0x8a8f96, 'metal');
      const cd = world.ctxAt((c.x + Bo.x0) / 2, c.z);
      for (let x = c.x + c.r0 + 2; x < Bo.x0 - 1; x += 5) cd.prop.box(x, KERB + 19.8, c.z - 3.1, x + 0.4, KERB + 26.2, c.z + 3.1, col(0x6a7076));
    }
    // The boiler house's stair tower and a few roof vents.
    for (const [x, z] of [[-136, 1590], [-126, 1620], [-134, 1645]]) Sk.drum(world, ctxB.prop, x, KERB + Bo.h, z, 1.2, 4, 10, 0x8a8f96, 'metal');
    // The forecourt: staff bays along the hall, lamps.
    for (let z = Fo.z0 + 12; z < Fo.z1 - 10; z += 2.6) if (z < PW.gate[0] - 6 || z > PW.gate[1] + 8) W.mark(world, Fo.x0, z - 0.06, Fo.x0 + 5, z + 0.06, 0xf4f4ef);
    for (let z = Fo.z0 + 8; z < Fo.z1; z += 24) world.addProp('streetlight', Fo.x1 - 0.5, KERB, z, -PI / 2, 1);
    for (let x = Rg.x0 + 6; x < Fo.x0; x += 26) { world.addProp('streetlight', x, KERB, Rg.z0 - 0.6, 0, 1); world.addProp('streetlight', x, KERB, Rg.z1 + 0.6, PI, 1); }
    for (let z = Rg.z0 + 20; z < Rg.z1; z += 26) world.addProp('streetlight', Rg.x0 - 0.6, KERB, z, PI / 2, 1);
    for (let z = PW.z0 + 10; z < PW.z1; z += 30) world.addProp('streetlight', P.x1 + 0.9, KERB, z, -PI / 2, 1);
    // Steam vents on the racks (IronLife puffs them).
    PW.vents = [[-227, 1530], [-227, 1650], [-224, 1700]];

    // --- the switchyard: transformers and lattice gantries behind a fence
    {
      const Y = PW.yard;
      W.fence(world, Y.x0, Y.z0, Y.x1, Y.z0, [], 'chain', 2.6);
      W.fence(world, Y.x0, Y.z0, Y.x0, Y.z1, [], 'chain', 2.6);
      W.fence(world, Y.x1, Y.z0, Y.x1, Y.z1, [], 'chain', 2.6);
      W.pave(world, Y.x0, Y.z0, Y.x1, Fn.z1, 0x8a8a84, 'decal', KERB + 0.01, 6);
      W.sign(world, { x: (Y.x0 + Y.x1) / 2, y: KERB + 1.6, z: Y.z0 - 0.16, yaw: PI, w: 3.4, h: 1.2, lines: ['DANGER', 'HIGH VOLTAGE · KEEP OUT'], style: 'info', oneSided: true, colors: { bg: ['#f2c230', '#f2c230'], fg: '#1c1c1e', bar: '#d8342c' } });
      for (let i = 0; i < 4; i++) {
        const x = Y.x0 + 9 + i * 14, z = Y.z0 + 12;
        const c = world.ctxAt(x, z);
        box(world, 'prop', x - 2.2, KERB, z - 1.6, x + 2.2, KERB + 3.2, z + 1.6, 0x6a7a6a, 'metal');
        for (let k = -1.8; k <= 1.8; k += 0.45) c.prop.box(x + k - 0.05, KERB + 0.4, z + 1.6, x + k + 0.05, KERB + 2.8, z + 2.1, col(0x5a6a5a));
        world.physics.addBox(x - 1.85, 0, z + 1.6, x + 1.85, KERB + 2.8, z + 2.1, 'metal', F().ALL); // the radiator fins
        for (const dx of [-1.2, 0, 1.2]) { c.prop.cylinder(x + dx, KERB + 3.2, z, 0.18, 0.12, 1.6, 8, col(0xa8603a), false); c.prop.cylinder(x + dx, KERB + 4.0, z, 0.3, 0.3, 0.12, 8, col(0xa8603a), false); }
      }
      // Lattice gantries carrying the lines out.
      for (const z of [Y.z0 + 26, Y.z0 + 42]) {
        for (const x of [Y.x0 + 4, Y.x1 - 4]) {
          const c = world.ctxAt(x, z);
          for (const [dx, dz] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) c.prop.box(x + dx - 0.08, KERB, z + dz - 0.08, x + dx + 0.08, KERB + 14, z + dz + 0.08, col(0x8a9097));
          for (let y = KERB + 2; y < KERB + 14; y += 2.4) { K().beam(c.prop, x - 0.6, y, z - 0.6, x + 0.6, y + 2.4, z + 0.6, 0.05, col(0x8a9097)); K().beam(c.prop, x + 0.6, y, z - 0.6, x - 0.6, y + 2.4, z + 0.6, 0.05, col(0x8a9097)); }
          world.physics.addBox(x - 0.7, 0, z - 0.7, x + 0.7, KERB + 14, z + 0.7, 'metal', F().ALL);
        }
        const cz = world.ctxAt((Y.x0 + Y.x1) / 2, z);
        cz.prop.box(Y.x0 + 4, KERB + 13.6, z - 0.15, Y.x1 - 4, KERB + 14.0, z + 0.15, col(0x8a9097));
        for (let x = Y.x0 + 10; x < Y.x1 - 6; x += 8) cz.prop.cylinder(x, KERB + 12.4, z, 0.14, 0.14, 1.2, 8, col(0xa8603a), false);
      }
      mast(world, Y.x1 - 2, Y.z1 - 2, 14, (Y.x0 + Y.x1) / 2, (Y.z0 + Y.z1) / 2, 28);
    }
    mast(world, -150, 1690, 16, -179, 1620, 30);
    mast(world, -205, 1550, 16, -179, 1600, 30);
  }

  // ------------------------------------------------------- the rail yard
  // Plot -625..-327 x 1199..1463, front west on Westgate Parkway. Two fans of
  // sidings either side of the yard road (west gate to east gate), two
  // level-crossing roads north to south with gates onto Mariner Way and
  // Foundry Road, strings of freight wagons with car-wide gaps, the gantry
  // crane over the south fan, containers, the engine shed, the signal box.
  const RY = {
    x0: -625, x1: -327, z0: 1199, z1: 1463,
    fence: { x0: -623.5, x1: -328.5, z0: 1200.5, z1: 1461.5 },
    road: { z0: 1318, z1: 1332 },
    cross: [[-568, -552], [-428, -412]],
    tracksN: [1222, 1228.5, 1235, 1241.5, 1248, 1254.5, 1261, 1267.5, 1274, 1280.5],
    tracksS: [1350, 1356.5, 1363, 1369.5, 1376, 1382.5, 1389, 1395.5],
    tx0: -612, tx1: -346, shedX: -376,
    shed: { x0: -372, x1: -336, z0: 1215, z1: 1252, h: 11 },
    gantry: { x0: -462, x1: -446, z0: 1342.5, z1: 1403, h: 15 },
    box: { x0: -505, x1: -497, z0: 1294, z1: 1302 },
  };
  const GAUGE = 0.72;

  /** Ballast, sleepers and two rails along x from x0 to x1 on track z, a buffer stop at each end. */
  function track(world, x0, x1, z) {
    const W = K();
    W.pave(world, x0 - 1, z - 1.7, x1 + 1, z + 1.7, 0x8a8276, 'decal', KERB + 0.008, 4);
    for (let x = x0; x < x1 - 1e-6; x += 40) {
      const xb = Math.min(x1, x + 40);
      const c = world.ctxAt((x + xb) / 2, z);
      for (let sx = x + 0.3; sx < xb; sx += 0.7) c.marks.topRect(sx, z - 1.25, sx + 0.24, z + 1.25, KERB + 0.02, col(0x4a3a2c));
      for (const s of [-1, 1]) {
        c.prop.box(x, KERB + 0.02, z + s * GAUGE - 0.07, xb, KERB + 0.13, z + s * GAUGE + 0.07, col(0x5a5048));
        c.prop.box(x, KERB + 0.13, z + s * GAUGE - 0.04, xb, KERB + 0.17, z + s * GAUGE + 0.04, col(0xb8bcc0));
      }
    }
    for (const [x, sg] of [[x0 - 0.6, -1], [x1 + 0.6, 1]]) {
      const c = world.ctxAt(x, z);
      box(world, 'prop', x - 0.5, KERB, z - 1.5, x + 0.5, KERB + 1.2, z + 1.5, 0xd8342c, 'metal');
      for (const dz of [-0.9, 0.9]) c.prop.box(x - sg * 0.52, KERB + 0.5, z + dz - 0.3, x - sg * 0.6, KERB + 1.0, z + dz + 0.3, col(0xf2f2ee));
    }
  }

  /** One wagon on track z from x (its west end), len long, of a kind; returns its length. */
  function wagon(world, x, z, kind, len, seed) {
    const c = world.ctxAt(x + len / 2, z);
    const hw = 1.5, deck = KERB + 1.15;
    const x1 = x + len;
    // Underframe and bogies (drawn full width, dark, so the collider below the body is honest).
    c.propMatte.box(x + 0.2, KERB, z - hw, x1 - 0.2, deck, z + hw, col(0x1f1f21));
    for (const bx of [x + 1.8, x1 - 1.8]) for (const s of [-1, 1]) c.propMatte.cylinder(bx + s * 0.9, KERB + 0.45, z + hw + 0.01, 0.42, 0.42, 0.06, 10, col(0x3a3a3c), true);
    for (const ex of [x, x1]) c.prop.box(ex - 0.2, KERB + 0.75, z - 0.15, ex + 0.2, KERB + 1.0, z + 0.15, col(0x3a3a3c)); // couplers
    let top = deck;
    const tint = (list) => list[Math.floor(hash(seed, 9) * list.length) % list.length];
    if (kind === 'box') {
      const hex = tint([0x8a3a2a, 0x2f5f9f, 0x3f6a4a, 0x8a8f96, 0xa8602a, 0x6a2a2a]);
      top = KERB + 4.3;
      c.prop.box(x + 0.1, deck, z - hw, x1 - 0.1, top, z + hw, col(hex));
      c.prop.box(x, top, z - hw - 0.05, x1, top + 0.15, z + hw + 0.05, VH.colMul(col(hex), 0.8));
      for (const s of [-1, 1]) {
        const f = z + s * (hw + 0.01);
        c.prop.box(x + len / 2 - 1.6, deck + 0.2, Math.min(f, f + s * 0.06), x + len / 2 + 1.6, top - 0.3, Math.max(f, f + s * 0.06), VH.colMul(col(hex), 0.85));
        for (let rx = x + 1.2; rx < x1 - 1; rx += 1.4) c.prop.box(rx, deck, Math.min(f, f + s * 0.04), rx + 0.1, top, Math.max(f, f + s * 0.04), VH.colMul(col(hex), 0.75));
      }
      top += 0.15;
    } else if (kind === 'tank') {
      const hex = tint([0x1c1c1e, 0xe8e6e0, 0xb8bcc0, 0x2a2c30]);
      c.prop.box(x + 0.2, deck, z - hw, x1 - 0.2, deck + 0.25, z + hw, col(0x2a2a2a));
      drumX(c.prop, x + 0.5, x1 - 0.5, deck + 1.6, z, 1.38, hex);
      c.prop.box(x + len / 2 - 0.6, deck + 2.9, z - 0.6, x + len / 2 + 0.6, deck + 3.25, z + 0.6, col(0x5a5e63));
      top = deck + 3.25;
    } else if (kind === 'hopper') {
      const hex = tint([0x6a6e73, 0x8a5a3a, 0x4a5a6a]);
      top = KERB + 3.8;
      c.prop.box(x + 0.2, deck, z - hw, x1 - 0.2, top, z + hw, col(hex), { skip: { top: true } });
      c.propMatte.topRect(x + 0.4, z - hw + 0.2, x1 - 0.4, z + hw - 0.2, top - 0.35, col(0x1c1a18), 2); // the load
      for (let rx = x + 1.5; rx < x1 - 1; rx += 2.2) for (const s of [-1, 1]) c.prop.box(rx, deck, z + s * hw - 0.05, rx + 0.15, top, z + s * hw + 0.05, VH.colMul(col(hex), 0.8));
    } else if (kind === 'flat') {
      c.prop.box(x + 0.1, deck, z - hw, x1 - 0.1, deck + 0.3, z + hw, col(0x5a4a3a));
      top = deck + 0.3;
      // One or two containers.
      const n = len > 15 ? 2 : 1, cl = (len - 0.6) / n;
      for (let k = 0; k < n; k++) {
        const cx0 = x + 0.3 + k * cl + 0.15, cx1 = cx0 + cl - 0.3;
        const hex = PAINT[Math.floor(hash(seed + k, 21) * 6 + 5) % PAINT.length];
        container(world, c, cx0, cx1, z, top, hex);
      }
      top += 2.6;
    } else if (kind === 'loco') {
      const body = 0xf2c230, band = 0x1f4f8f;
      c.prop.box(x + 0.3, deck, z - hw, x1 - 0.3, deck + 0.5, z + hw, col(band));
      c.prop.box(x + 4.2, deck + 0.5, z - hw + 0.3, x1 - 0.6, KERB + 3.9, z + hw - 0.3, col(body)); // the hood
      c.prop.box(x + 0.6, deck + 0.5, z - hw, x + 4.2, KERB + 4.3, z + hw, col(body)); // the cab
      c.prop.box(x + 0.5, KERB + 4.3, z - hw - 0.05, x + 4.3, KERB + 4.45, z + hw + 0.05, col(0x2a2c30));
      for (const s of [-1, 1]) c.screen.box(x + 1.2, KERB + 3.0, Math.min(z + s * hw, z + s * (hw + 0.03)), x + 3.6, KERB + 3.9, Math.max(z + s * hw, z + s * (hw + 0.03)), VH.col(0xffe7b0, 1.1));
      c.screen.box(x + 0.57, KERB + 3.0, z - 1.1, x + 0.6, KERB + 3.9, z + 1.1, VH.col(0xcfe6ff, 1.1));
      c.screen.box(x + 0.55, KERB + 2.0, z - 0.25, x + 0.6, KERB + 2.4, z + 0.25, VH.col(0xfff6d0, 2.4)); // headlight
      for (let rx = x + 5; rx < x1 - 1; rx += 2.6) for (const s of [-1, 1]) c.prop.box(rx, KERB + 2.4, z + s * (hw - 0.3) - 0.04, rx + 1.4, KERB + 3.4, z + s * (hw - 0.3) + 0.04, col(0x9a8a2a));
      top = KERB + 4.45;
    }
    world.physics.addBox(x, 0, z - hw - 0.05, x1, top, z + hw + 0.05, 'metal', F().ALL);
    return len;
  }

  let DRUM = null;
  /** A closed cylinder lying along x (a tank wagon's barrel). */
  function drumX(surf, x0, x1, y, z, r, hex) {
    if (!DRUM) DRUM = new THREE.CylinderGeometry(1, 1, 1, 14, 1, false).rotateZ(PI / 2);
    _v.set((x0 + x1) / 2, y, z);
    _q.identity();
    _s.set(x1 - x0, r, r);
    _m.compose(_v, _q, _s);
    surf.merge(DRUM, _m, col(hex));
  }

  /** A shipping container (drawn with ribs, ends and doors) sitting at y. */
  function container(world, c, x0, x1, z, y, hex) {
    const hw = 1.22, h = 2.6;
    c.prop.box(x0, y, z - hw, x1, y + h, z + hw, col(hex), y > KERB + 0.3 ? { bottom: true } : undefined);
    const rib = VH.colMul(col(hex), 0.8);
    for (let rx = x0 + 0.3; rx < x1 - 0.2; rx += 0.6) for (const s of [-1, 1]) c.prop.box(rx, y + 0.1, Math.min(z + s * hw, z + s * (hw + 0.04)), rx + 0.12, y + h - 0.1, Math.max(z + s * hw, z + s * (hw + 0.04)), rib);
    c.prop.box(x1, y + 0.1, z - hw + 0.1, x1 + 0.04, y + h - 0.1, z + hw - 0.1, rib);
    c.prop.box(x1 + 0.04, y + 0.3, z - 0.03, x1 + 0.06, y + h - 0.3, z + 0.03, col(0x2a2c30));
  }

  function buildRailyard(world) {
    const W = K(), Sk = S();
    const Fn = RY.fence;
    W.pave(world, Fn.x0, Fn.z0, Fn.x1, Fn.z1, 0x9a948a, 'decal', KERB + 0.004, 8);
    const road = (x0, z0, x1, z1) => W.pave(world, x0, z0, x1, z1, 0xd8d4cc, 'asphaltTop', KERB + 0.014, 6);
    road(RY.x0, RY.road.z0, RY.x1, RY.road.z1);
    for (const [x0, x1] of RY.cross) road(x0, RY.z0, x1, RY.z1);
    for (let x = RY.x0 + 4; x < RY.x1 - 4; x += 9) W.mark(world, x, (RY.road.z0 + RY.road.z1) / 2 - 0.08, x + 4.5, (RY.road.z0 + RY.road.z1) / 2 + 0.08, 0xf4f4ef);
    // The fence and its gates: west and east on the yard road, north and south at each crossing.
    const cr = RY.cross;
    W.fence(world, Fn.x0, Fn.z0, Fn.x1, Fn.z0, cr, 'chain', 2.6);
    W.fence(world, Fn.x0, Fn.z1, Fn.x1, Fn.z1, cr, 'chain', 2.6);
    W.fence(world, Fn.x0, Fn.z0, Fn.x0, Fn.z1, [[RY.road.z0, RY.road.z1]], 'chain', 2.6);
    W.fence(world, Fn.x1, Fn.z0, Fn.x1, Fn.z1, [[RY.road.z0, RY.road.z1]], 'chain', 2.6);
    W.sign(world, { x: Fn.x0 - 0.5, y: KERB + 3.4, z: RY.road.z0 - 6, yaw: -PI / 2, w: 9, h: 2.4, lines: ['IRONSIDE RAIL YARD', 'SOUTHBAY FREIGHT LINES · AUTHORISED VEHICLES ONLY'], style: 'info', posts: true, colors: { bg: ['#1f4f8f', '#163e72'], fg: '#ffffff', bar: '#f2c230' } });

    // --- the tracks and the wagons on them
    const strings = [[RY.tx0 + 4, cr[0][0] - 3], [cr[0][1] + 3, cr[1][0] - 3], [cr[1][1] + 3, RY.tx1 - 3]];
    let seed = 4100;
    const kinds = ['box', 'box', 'tank', 'hopper', 'flat', 'flat', 'box', 'tank'];
    const lens = { box: 14, tank: 12.5, hopper: 11, flat: 13.4, loco: 18 };
    const laneTrack = (z, xEnd, ti) => {
      track(world, RY.tx0, xEnd, z);
      for (let si = 0; si < strings.length; si++) {
        const [a0, a1raw] = strings[si];
        const a1 = Math.min(a1raw, xEnd - 2);
        if (hash(seed++, 3) < 0.18) continue; // an empty stretch
        let x = a0 + hash(seed++, 5) * 6;
        let first = true;
        while (true) {
          const kind = first && hash(seed, 7) < 0.22 ? 'loco' : kinds[Math.floor(hash(seed++, 11) * kinds.length) % kinds.length];
          const L = lens[kind] + (kind === 'flat' && hash(seed, 13) < 0.4 ? 6 : 0);
          if (x + L > a1) break;
          wagon(world, x, z, kind, L, seed++);
          x += L;
          first = false;
          // Couplings, and now and then a gap one car wide (or one car wide minus a wing mirror).
          const r = hash(seed++, 17);
          x += r < 0.22 ? 3.4 : r < 0.3 ? 2.5 : r < 0.42 ? 8 : 0.5;
        }
      }
      void ti;
    };
    RY.tracksN.forEach((z, i) => laneTrack(z, i < 5 ? RY.shedX : RY.tx1, i));
    RY.tracksS.forEach((z, i) => laneTrack(z, RY.tx1, i + 10));
    // The crossings: rails flush, white boards and lights each side.
    for (const [x0, x1] of cr) {
      for (const z of RY.tracksN.concat(RY.tracksS)) W.pave(world, x0, z - 1.4, x1, z + 1.4, 0x6a6660, 'marks', KERB + 0.03, 0);
      for (const z of [RY.tracksN[RY.tracksN.length - 1] + 4, RY.tracksS[0] - 4]) {
        for (const x of [x0 - 1.2, x1 + 1.2]) {
          const c = world.ctxAt(x, z);
          Sk.drum(world, c.prop, x, KERB, z, 0.1, 3.4, 8, 0xf2f2ee, 'pole');
          c.prop.box(x - 0.06, KERB + 2.6, z - 0.7, x + 0.06, KERB + 2.85, z + 0.7, col(0xd8342c));
          c.screen.cylinder(x, KERB + 3.0, z - 0.35, 0.16, 0.16, 0.3, 8, VH.col(0xff2a1a, 1.6), true);
          c.screen.cylinder(x, KERB + 3.0, z + 0.35, 0.16, 0.16, 0.3, 8, VH.col(0xff2a1a, 1.6), true);
        }
      }
    }

    // --- the engine shed over the north fan's first five roads
    {
      const Sh = RY.shed;
      const ctx = W.building(world, Sh.x0, Sh.z0, Sh.x1, Sh.z1, Sh.h, { wall: 0x8a4a3a, roof: 0x4a4f56, style: 1, ww: 0.5, wh: 0.45, bay: 4, floorH: 5.5, seed: 0.71, parapet: false, sides: { w: 'blank' } });
      W.gable(ctx.prop, Sh.x0 - 0.4, Sh.z0 - 0.4, Sh.x1 + 0.4, Sh.z1 + 0.4, KERB + Sh.h, 4, 'x', col(0x4a4f56), col(0x8a4a3a));
      world.physics.addBox(Sh.x0 - 0.4, KERB + Sh.h, Sh.z0 - 0.4, Sh.x1 + 0.4, KERB + Sh.h + 4, Sh.z1 + 0.4, 'building', F().ALL);
      for (let i = 0; i < 5; i++) {
        const z = RY.tracksN[i];
        ctx.prop.box(Sh.x0 - 0.06, KERB, z - 2.4, Sh.x0, KERB + 6.2, z + 2.4, col(0x3f5a4a));
        for (let y = KERB + 0.6; y < KERB + 6.2; y += 0.6) ctx.prop.box(Sh.x0 - 0.09, y, z - 2.4, Sh.x0 - 0.06, y + 0.05, z + 2.4, col(0x2f4a3a));
        ctx.screen.box(Sh.x0 - 0.3, KERB + 6.6, z - 0.3, Sh.x0 - 0.06, KERB + 6.8, z + 0.3, VH.col(0xfff0c8, 2.2));
      }
      W.sign(world, { x: Sh.x0 - 0.1, y: KERB + 8.6, z: (Sh.z0 + Sh.z1) / 2, yaw: -PI / 2, w: 16, h: 1.6, lines: ['SOUTHBAY FREIGHT LINES · LOCO SHED'], style: 'info', oneSided: true, colors: { bg: ['#1f4f8f', '#163e72'], fg: '#ffffff', bar: '#f2c230' } });
    }

    // --- the signal box, the yard office and the staff car park between the fans
    {
      const B = RY.box;
      const c = world.ctxAt((B.x0 + B.x1) / 2, (B.z0 + B.z1) / 2);
      box(world, 'concrete', B.x0, KERB, B.z0, B.x1, KERB + 3.6, B.z1, 0x8a4a3a, 'brick');
      box(world, 'prop', B.x0 - 0.3, KERB + 3.6, B.z0 - 0.3, B.x1 + 0.3, KERB + 3.8, B.z1 + 0.3, 0xe8e6e0, 'building');
      c.prop.box(B.x0, KERB + 3.8, B.z0, B.x1, KERB + 4.3, B.z1, col(0xe8e6e0));
      c.screen.box(B.x0 - 0.04, KERB + 4.3, B.z0 + 0.2, B.x1 + 0.04, KERB + 6.0, B.z1 - 0.2, VH.col(0xcfe6ff, 1.15));
      Sk.air(world, c.prop, B.x0 + 0.2, KERB + 4.3, B.z0 + 0.2, B.x1 - 0.2, KERB + 6.0, B.z1 - 0.2, 0xe8e6e0, 'building');
      W.gable(c.prop, B.x0 - 0.5, B.z0 - 0.5, B.x1 + 0.5, B.z1 + 0.5, KERB + 6.0, 1.4, 'x', col(0x4a4f56), col(0xe8e6e0));
      world.physics.addBox(B.x0 - 0.5, KERB + 6.0, B.z0 - 0.5, B.x1 + 0.5, KERB + 7.4, B.z1 + 0.5, 'building', F().ALL);
      W.sign(world, { x: (B.x0 + B.x1) / 2, y: KERB + 3.0, z: B.z1 + 0.08, yaw: 0, w: 6, h: 0.6, lines: ['IRONSIDE YARD SIGNAL BOX'], style: 'info', oneSided: true, colors: { bg: ['#f4f2ec', '#e8e4dc'], fg: '#1c1c1e', bar: '#1f4f8f' } });
      // The yard office (a long cabin) and the staff car park.
      box(world, 'prop', -604, KERB, 1294, -584, KERB + 3.2, 1304, 0x2f5f9f, 'building');
      const co = world.ctxAt(-594, 1299);
      co.prop.box(-604.2, KERB + 3.2, 1293.8, -583.8, KERB + 3.4, 1304.2, col(0x1f3f6f));
      for (let x = -602; x < -586; x += 3.5) co.screen.box(x, KERB + 1.3, 1304.01, x + 2.2, KERB + 2.4, 1304.05, VH.col(0xffe7b0, 1.15));
      co.prop.box(-588.5, KERB, 1304.01, -587.3, KERB + 2.2, 1304.06, col(0x1f3f6f));
      W.sign(world, { x: -594, y: KERB + 2.8, z: 1304.1, yaw: 0, w: 5, h: 0.5, lines: ['YARD OFFICE'], style: 'info', oneSided: true, colors: { bg: ['#f4f2ec', '#e8e4dc'], fg: '#1c1c1e', bar: '#2f5f9f' } });
      for (let x = -546; x <= -522; x += 2.6) W.mark(world, x - 0.06, 1300, x + 0.06, 1305, 0xf4f4ef);
      RY.parkBays = { x0: -546, x1: -522, z: 1302.5 };
    }

    // --- the gantry crane over the south fan, a container on its spreader
    {
      const G = RY.gantry;
      const c = world.ctxAt((G.x0 + G.x1) / 2, (G.z0 + G.z1) / 2);
      const yel = 0xd8a520;
      for (const x of [G.x0, G.x1]) {
        for (const z of [G.z0, G.z1]) {
          box(world, 'prop', x - 0.45, KERB, z - 0.45, x + 0.45, KERB + G.h, z + 0.45, yel, 'metal');
          c.propMatte.box(x - 2.0, KERB, z - 0.6, x + 2.0, KERB + 0.9, z + 0.6, col(0x2a2c30));
          world.physics.addBox(x - 2.0, 0, z - 0.6, x + 2.0, KERB + 0.9, z + 0.6, 'metal', F().ALL);
        }
        Sk.air(world, c.prop, x - 0.6, KERB + G.h, G.z0 - 2, x + 0.6, KERB + G.h + 1.6, G.z1 + 2, yel, 'metal');
        for (let z = G.z0 + 3; z < G.z1 - 2; z += 4) K().beam(c.prop, x, KERB + G.h, z, x, KERB + G.h + 1.6, z + 4, 0.08, col(0xb88a18));
      }
      for (const z of [G.z0 - 1.4, G.z1 + 1.4]) Sk.air(world, c.prop, G.x0 - 0.6, KERB + G.h + 0.2, z - 0.5, G.x1 + 0.6, KERB + G.h + 1.6, z + 0.5, yel, 'metal');
      // The trolley over the middle road, its cables, the spreader and a box coming up off a flatcar.
      const tz = RY.tracksS[3], tx = (G.x0 + G.x1) / 2;
      Sk.air(world, c.prop, G.x0 - 0.2, KERB + G.h + 1.6, tz - 1.6, G.x1 + 0.2, KERB + G.h + 3.4, tz + 1.6, 0xc9cdd1, 'metal');
      for (const dx of [-5, 5]) c.prop.box(tx + dx - 0.03, KERB + 9.4, tz - 0.03, tx + dx + 0.03, KERB + G.h + 1.6, tz + 0.03, col(0x2a2c30));
      c.prop.box(tx - 6.3, KERB + 9.0, tz - 1.25, tx + 6.3, KERB + 9.4, tz + 1.25, col(0xd8a520));
      container(world, c, tx - 6.1, tx + 6.1, tz, KERB + 6.4, 0x2a8a8a);
      world.physics.addBox(tx - 6.3, KERB + 6.4, tz - 1.25, tx + 6.3, KERB + 9.4, tz + 1.25, 'metal', F().ALL); // hangs in the air: solid to aircraft and shots
      W.sign(world, { x: G.x0 - 0.62, y: KERB + G.h + 0.8, z: (G.z0 + G.z1) / 2, yaw: -PI / 2, w: 18, h: 1.2, lines: ['SOUTHBAY FREIGHT · SWL 40 T'], style: 'info', oneSided: true, colors: { bg: ['#d8a520', '#c08f18'], fg: '#1c1c1e', bar: '#1c1c1e' } });
    }

    // --- containers stacked in the south-west, two and three high
    {
      let k = 0;
      for (let z = 1408; z < 1454; z += 3.2) {
        for (let x = -606; x < -486; x += 13) {
          if (x > cr[0][0] - 13.5 && x < cr[0][1] + 0.5) continue;
          if (hash(k++, 31) < 0.15) continue;
          const n = 1 + Math.floor(hash(k, 33) * 3);
          const c = world.ctxAt(x + 6, z + 1.22);
          for (let j = 0; j < n; j++) container(world, c, x, x + 12.2, z + 1.22, KERB + j * 2.62, PAINT[Math.floor(hash(k * 7 + j, 35) * PAINT.length) % PAINT.length]);
          world.physics.addBox(x, 0, z, x + 12.3, KERB + n * 2.62, z + 2.44, 'metal', F().ALL);
        }
      }
    }

    // --- floodlight towers
    for (const [x, z, ax, az] of [[-575, 1311, -575, 1260], [-432, 1311, -432, 1260], [-575, 1339, -575, 1380], [-432, 1339, -432, 1380], [-480, 1311, -490, 1300]]) mast(world, x, z, 22, ax, az, 32);
  }

  // ------------------------------------------------------------- the map
  if (VH.MapPainters) {
    VH.MapPainters.push((g, layout, o) => {
      if (!layout.plots) return;
      const R = o.R;
      const bx = (x0, z0, x1, z1, c, sh) => K().mapBox(g, R, x0, z0, x1, z1, c, sh);
      if (layout.plots.ironside_scrapyard) {
        bx(SY.wall.x0, SY.wall.z0, SY.wall.x1, SY.wall.z1, '#8a7f6a', false);
        bx(SY.road.x0, SY.road.z0, SY.road.x1, SY.z1, '#5f5a54', false);
        bx(SY.apron.x0, SY.apron.z0, SY.apron.x1, SY.apron.z1, '#6a645c', false);
        for (const x0 of [-603, -583, -563, -543, -460, -440, -420]) { bx(x0, 1612, x0 + 8.8, 1666, '#4a4440'); bx(x0, 1678, x0 + 8.8, 1738, '#4a4440'); }
        for (const z0 of [1494, 1516]) { bx(-616, z0, -568, z0 + 8.8, '#4a4440'); bx(-452, z0, -414, z0 + 8.8, '#4a4440'); bx(-386, z0, -336, z0 + 8.8, '#4a4440'); }
        bx(CR.x0, CR.z0, CR.x1, CR.z1, '#d8a520');
        bx(CR.belt.x0, CR.belt.z - 1, CR.belt.x1, CR.belt.z + 1, '#2a2c30');
      }
    });
  }

  // --------------------------------------------------------- moving parts
  const _box = new THREE.Box3();
  class IronLife {
    constructor(game) {
      this.game = game;
      this.t = 0;
      const w = game.world;
      if (!w) return;
      if (w.ironScrap) this._initScrap(game);
      if (w.ironPower) this.puffT = 0;
    }

    _mat(o) {
      return new THREE.MeshStandardMaterial(Object.assign({ vertexColors: true, roughness: 0.55, metalness: 0.35 }, o || {}));
    }

    _initScrap(game) {
      const gbP = new VH.GeometryBuilder({});
      const hx = (CR.bay.x1 - CR.bay.x0) / 2 - 0.12, hz = (CR.bay.z1 - CR.bay.z0) / 2 - 0.12;
      // The platen: a heavy slab with ribs on top, the four ram rods up into the housing.
      gbP.box(-hx, 0, -hz, hx, 0.75, hz, col(0x4a4f56));
      for (let x = -hx + 0.4; x < hx; x += 1.1) gbP.box(x, 0.75, -hz, x + 0.18, 1.1, hz, col(0x3a3f45));
      for (const [x, z] of [[-1, -3], [1, -3], [-1, 3], [1, 3]]) gbP.cylinder(x * (hx - 1.0), 0.75, z * (hz / 4), 0.22, 0.22, 4.4, 10, col(0xd8dcdf), false);
      gbP.box(-hx, 0, hz - 0.02, hx, 0.75, hz + 0.01, col(0x1c1c1e));
      this.platen = new THREE.Mesh(gbP.build(), this._mat({ metalness: 0.5 }));
      this.platen.name = 'crusher platen';
      this.platenY = CR.up;
      this.platen.position.set((CR.bay.x0 + CR.bay.x1) / 2, this.platenY, (CR.bay.z0 + CR.bay.z1) / 2);
      game.scene.add(this.platen);
      // The amber beacon on the housing, lit while the press runs.
      const bg = new THREE.CylinderGeometry(0.22, 0.25, 0.4, 10);
      this.beacon = new THREE.Mesh(bg, new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.4, 0.2) }));
      this.beacon.position.set(CR.x1 - 0.8, CR.top + 0.2, CR.z1 - 0.6);
      this.beacon.visible = false;
      game.scene.add(this.beacon);
      // The conveyor's cleats, riding up the belt.
      const B = CR.belt;
      this.beltLen = Math.hypot(B.x1 - B.x0, B.y1 - B.y0);
      this.beltAng = Math.atan2(B.y1 - B.y0, B.x1 - B.x0);
      const cg = new THREE.BoxGeometry(0.12, 0.14, B.w - 0.1);
      this.cleats = new THREE.InstancedMesh(cg, new THREE.MeshStandardMaterial({ color: 0x1a1b1e, roughness: 0.8 }), 28);
      this.cleats.name = 'crusher belt cleats';
      this.cleats.frustumCulled = false;
      game.scene.add(this.cleats);
      this._q = new THREE.Quaternion().setFromAxisAngle(Z1, this.beltAng);
      this._p = new THREE.Vector3();
      this._sc = new THREE.Vector3(1, 1, 1);
      this._m4 = new THREE.Matrix4();
      // Bales: the cars the press has done, slid out onto the pile beside it.
      const ug = new THREE.BoxGeometry(1, 1, 1);
      this.baleMesh = new THREE.InstancedMesh(ug, new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0.3 }), CR.bales.n + 1);
      this.baleMesh.name = 'crusher bales';
      this.baleMesh.count = 0;
      this.baleMesh.frustumCulled = false;
      game.scene.add(this.baleMesh);
      this.bales = []; // { x, z, y, yaw, l, w, color, path: [[x, z]...], t }
      this.nextSlot = 0;
      // The crane: the house, boom, cable and magnet with a car on it turn as one.
      const Cn = SY.crane;
      const gb = new VH.GeometryBuilder({});
      const yel = col(0xd8a520), dark = col(0x2a2c30);
      gb.box(-2.2, 0, -1.6, 2.4, 2.6, 1.6, yel); // the house
      gb.box(1.0, 0.8, -1.5, 2.4, 2.5, -0.2, col(0x9fd0e8)); // cab glass
      gb.box(-3.6, 0, -1.4, -2.2, 1.8, 1.4, dark); // counterweight
      // The boom: a lattice drawn as two chords and a few braces, out along +x.
      const tipX = Cn.r, tipY = 16;
      for (const s of [-1, 1]) K().beam(gb, 1.6, 1.5, s * 0.6, tipX, tipY, s * 0.35, 0.22, yel);
      for (let k = 1; k < 8; k++) {
        const t = k / 8, x = 1.6 + (tipX - 1.6) * t, y = 1.5 + (tipY - 1.5) * t;
        K().beam(gb, x, y, -0.55, x, y, 0.55, 0.08, yel);
      }
      K().beam(gb, -1.5, 2.6, 0, -0.5, 7.5, 0, 0.18, yel); // the A-frame
      K().beam(gb, -0.5, 7.5, 0, tipX, tipY + 0.2, 0, 0.05, dark); // the pendant line
      this.craneTop = { x: tipX, y: tipY };
      this.crane = new THREE.Group();
      this.crane.position.set(Cn.x, KERB + 1.7, Cn.z);
      this.craneBody = new THREE.Mesh(gb.build(), this._mat());
      this.craneBody.name = 'scrap crane';
      this.crane.add(this.craneBody);
      // The hanging part (cable, magnet, car) swings a little under the tip.
      const hg = new VH.GeometryBuilder({});
      const drop = 7.5;
      hg.box(-0.04, -drop, -0.04, 0.04, 0, 0.04, dark);
      hg.cylinder(0, -drop - 0.7, 0, 1.0, 1.0, 0.7, 14, col(0x3a3f45), true);
      hg.box(-2.1, -drop - 1.95, -0.9, 2.1, -drop - 0.75, 0.9, col(0x2f5f9f)); // the car on the magnet
      hg.box(-1.1, -drop - 0.95, -0.82, 1.0, -drop - 0.7, 0.82, col(0x1a1d22));
      hg.box(-2.15, -drop - 1.7, -0.92, -1.95, -drop - 1.2, 0.92, col(0x8a2a2a));
      this.hang = new THREE.Mesh(hg.build(), this._mat());
      this.hang.name = 'scrap crane magnet';
      this.hang.position.set(tipX, tipY, 0);
      this.crane.add(this.hang);
      game.scene.add(this.crane);
      // The press's state.
      this.state = 'idle';
      this.stateT = 0;
      this.waitT = 0;
      this.target = null;
      this.hintT = 0;
      this.paused = false;
      this.sndT = 0;
      this.scrapNear = false;
      // The big red button.
      if (game.interaction) {
        const P = CR.panel;
        game.interaction.register({ id: 'ironside_crusher_button', kind: 'ironCrusher', x: P.x, y: KERB + 1.0, z: P.z + 0.1, radius: 1.7, label: 'Press the big red button' });
        game.interaction.on('ironCrusher', () => {
          this.press(true);
          return 2;
        });
      }
    }

    /** Is this vehicle parked in the press bay? */
    _inBay(v) {
      const b = CR.bay;
      return v.pos.x > b.x0 + 0.3 && v.pos.x < b.x1 - 0.3 && v.pos.z > b.z0 + 0.5 && v.pos.z < b.z1 - 0.4 && v.pos.y < 2;
    }

    _jayInBay() {
      const p = this.game.player;
      if (!p || p.vehicle) return false;
      const b = CR.bay;
      return p.pos.x > b.x0 - 0.2 && p.pos.x < b.x1 + 0.2 && p.pos.z > b.z0 - 0.2 && p.pos.z < b.z1 + 0.3 && p.pos.y < 3;
    }

    /** Start a cycle (the button, or an empty car left in the bay). */
    press(button) {
      if (this.state !== 'idle') return false;
      const g = this.game;
      let car = null;
      for (const v of g.vehicles.list) if (!v.removed && v.kind !== 'plane' && v.kind !== 'heli' && this._inBay(v)) { car = v; break; }
      if (car && car.driver) {
        if (button) g.hud.notify({ title: 'Crusher', text: 'Not with anyone in the car. The press won\'t run until the driver\'s out.', icon: '⚠', tone: 'bad' });
        return false;
      }
      this.target = car;
      this.state = 'warn';
      this.stateT = 0;
      VH.events.emit('ironside:crusher', { car: !!car });
      return true;
    }

    update(dt) {
      this.t += dt;
      if (this.platen) this._updateScrap(dt);
      if (this.puffT !== undefined) this._updatePower(dt);
    }

    /** Smoke trailing from the chimneys, steam off the pipe racks, the flare flickering. */
    _updatePower(dt) {
      const g = this.game, fx = g.fx;
      if (!fx || !fx.soft) return;
      const P = g.player.pos;
      if (Math.hypot(P.x + 160, P.z - 1620) > 900) return;
      this.puffT -= dt;
      if (this.puffT > 0) return;
      this.puffT = 0.22;
      const wind = 1.6;
      for (const c of PW.chimneys) {
        fx.soft.emit({
          x: c.x + (Math.random() - 0.5) * c.r1, y: KERB + 1.2 + c.h + 0.5, z: c.z + (Math.random() - 0.5) * c.r1,
          vx: wind + Math.random() * 0.6, vy: 2.2 + Math.random(), vz: -0.4 + Math.random() * 0.4,
          life: 9 + Math.random() * 4, size: c.r1 * 1.4, size1: c.r1 * 6, r: 0.78, g: 0.78, b: 0.8, a: 0.32, drag: 0.15, grav: -0.05,
        });
      }
      if (Math.hypot(P.x + 227, P.z - 1620) < 260) {
        for (const [x, z] of PW.vents) {
          fx.soft.emit({
            x, y: KERB + PW.pipe.y2 + 1.4, z, vx: (Math.random() - 0.5) * 0.6, vy: 1.8 + Math.random(), vz: (Math.random() - 0.5) * 0.6,
            life: 2.5 + Math.random(), size: 0.6, size1: 3.2, r: 0.95, g: 0.95, b: 0.97, a: 0.38, drag: 0.6, grav: -0.2,
          });
        }
      }
      if (fx.flame) for (let k = 0; k < 3; k++) fx.flame(PW.flare.x, KERB + PW.flare.h + 1.6, PW.flare.z, 1.4);
    }

    _updateScrap(dt) {
      const g = this.game;
      const P = g.player.pos;
      const near = Math.hypot(P.x - (CR.x0 + CR.x1) / 2, P.z - (CR.z0 + CR.z1) / 2) < 260;
      // The crane and the belt run whenever anyone's near enough to see them.
      if (near) {
        const sw = Math.sin(this.t * 0.32);
        this.crane.rotation.y = 0.9 + sw * 1.15;
        this.hang.rotation.x = Math.sin(this.t * 1.2) * 0.06;
        this.hang.rotation.z = Math.cos(this.t * 0.32) * 0.08;
        const B = CR.belt, n = this.cleats.count, L = this.beltLen;
        const ca = Math.cos(this.beltAng), sa = Math.sin(this.beltAng);
        for (let i = 0; i < n; i++) {
          const u = (this.t * 0.9 + (i * L) / n) % L;
          this._p.set(B.x0 + ca * u, B.y0 + sa * u + 0.08, B.z);
          this._m4.compose(this._p, this._q, this._sc);
          this.cleats.setMatrixAt(i, this._m4);
        }
        this.cleats.instanceMatrix.needsUpdate = true;
      }
      this.cleats.visible = this.crane.visible = near;
      this._updateBales(dt);
      if (!near && this.state === 'idle') return;
      // --- the press
      const jayIn = this._jayInBay();
      this.stateT += dt;
      if (this.state === 'idle') {
        let car = null;
        for (const v of g.vehicles.list) if (!v.removed && !v.wrecked && v.kind !== 'plane' && v.kind !== 'heli' && this._inBay(v)) { car = v; break; }
        if (car && car.speed < 1) {
          if (car.driver === 'player') {
            this.hintT += dt;
            if (this.hintT > 1.2 && this.hintT < 1.2 + dt * 1.5) g.hud.notify({ title: 'Crusher', text: 'Get out and stand clear and the press does the rest. (Or there\'s a big red button.)', icon: '⚠' });
            this.waitT = 0;
          } else if (!car.driver && !jayIn) {
            this.waitT += dt;
            if (this.waitT > 1.6) this.press(false);
          }
        } else {
          this.waitT = 0;
          if (!car) this.hintT = 0;
        }
      } else if (this.state === 'warn') {
        if (this.stateT > 1.4) this._setState('down');
      } else if (this.state === 'down') {
        if (jayIn) {
          if (!this.paused) g.hud.notify({ title: 'Crusher', text: 'The light curtain stops the press while anyone is in the bay.', icon: '⚠' });
          this.paused = true;
        } else {
          this.paused = false;
          this.platenY = Math.max(CR.low, this.platenY - 1.25 * dt);
          this._squash(dt);
          if (this.platenY <= CR.low + 1e-4) this._setState('hold');
        }
      } else if (this.state === 'hold') {
        if (this.stateT > 0.9) {
          this._finish();
          this._setState('up');
        }
      } else if (this.state === 'up') {
        this.platenY = Math.min(CR.up, this.platenY + 0.9 * dt);
        if (this.platenY >= CR.up - 1e-4) {
          this._ejectBale();
          this._setState('idle');
          this.waitT = 0;
          this.hintT = 0;
        }
      }
      this.platen.position.y = this.platenY;
      this.beacon.visible = this.state !== 'idle' && ((this.t * 3) % 1) < 0.55;
    }

    _setState(s) {
      this.state = s;
      this.stateT = 0;
    }

    /** As the platen comes down onto the car: squash it, crunch, sparks. */
    _squash(dt) {
      const v = this.target;
      if (!v || v.removed) return;
      if (!this.carTop) {
        _box.setFromObject(v.model.root);
        this.carBase = v.pos.y;
        this.carTop = Math.max(0.8, _box.max.y - v.pos.y);
      }
      const h = this.platenY - this.carBase;
      if (h >= this.carTop) return;
      const k = Math.max(0.22, h / this.carTop);
      v.model.root.scale.y = k;
      v.vel.set(0, 0, 0);
      v.omega = 0;
      if (!v.wrecked) {
        v.wrecked = true;
        v.health = 0;
        v.burning = 0;
        v.model.setDamage(1);
        v.model.setHeadlights(false);
      }
      this.sndT -= dt;
      if (this.sndT <= 0) {
        this.sndT = 0.32;
        VH.events.emit('vehicle:impact', { v, other: null, speed: 9, slide: 0, x: v.pos.x, y: v.pos.y + h, z: v.pos.z, nx: 0, nz: 1 });
        if (this.game.fx) {
          this.game.fx.sparks(v.pos.x + (Math.random() - 0.5) * 3, v.pos.y + h, CR.bay.z1 - 0.3, 0, 1, 6, 4);
          this.game.fx.glass(v.pos.x, v.pos.y + h * 0.8, v.pos.z, 3);
        }
      }
    }

    /** The press is down: a crushed car becomes a bale (a mission's car stays, flattened, for the story to see). */
    _finish() {
      const v = this.target;
      this.target = null;
      this.carTop = 0;
      if (!v || v.removed) return;
      v.model.root.scale.y = 0.22;
      // A job's car stays where it is, flattened (the job sees it wrecked); anything else is baled.
      const run = this.game.missions && this.game.missions.run;
      if (v.role === 'mission') return;
      if (run && run.cars) for (const c of run.cars.values()) if (c === v) return;
      const color = v.model && v.model.color !== undefined ? v.model.color : 0x8a8f96;
      const b = { x: v.pos.x, z: v.pos.z, yaw: v.yaw, l: v.hz * 2 * 0.95, w: v.hx * 2 * 0.95, color, path: null, t: 0 };
      this.game.vehicles.remove(v);
      if (this.bales.length > CR.bales.n) this.bales.shift();
      this.bales.push(b);
      this._writeBales();
    }

    /** Slide the newest bale out of the bay onto the pile beside the press. */
    _ejectBale() {
      const b = this.bales[this.bales.length - 1];
      if (!b || b.path) return;
      const Bl = CR.bales;
      const slot = this.nextSlot++ % Bl.n;
      const sx = (Bl.x0 + Bl.x1) / 2, sz = Bl.z + slot * Bl.pitch;
      // Any older bale in that slot goes (it's been taken away on a lorry).
      for (let i = this.bales.length - 2; i >= 0; i--) if (this.bales[i].slot === slot) this.bales.splice(i, 1);
      b.slot = slot;
      b.path = [[b.x, b.z], [b.x, CR.booth.z1 + 2.2], [sx, CR.booth.z1 + 2.2], [sx, sz]];
      b.yaw0 = b.yaw;
      b.t = 0;
    }

    _updateBales(dt) {
      let moving = false;
      for (const b of this.bales) {
        if (!b.path || b.t >= 1) continue;
        b.t = Math.min(1, b.t + dt / 3.2);
        const seg = b.path.length - 1, f = b.t * seg, i = Math.min(seg - 1, Math.floor(f)), u = f - i;
        b.x = b.path[i][0] + (b.path[i + 1][0] - b.path[i][0]) * u;
        b.z = b.path[i][1] + (b.path[i + 1][1] - b.path[i][1]) * u;
        b.yaw = b.yaw0 + (PI / 2 - b.yaw0) * Math.min(1, b.t * 2);
        moving = true;
      }
      if (moving) this._writeBales();
    }

    _writeBales() {
      const m = this.baleMesh;
      const c = new THREE.Color();
      for (let i = 0; i < this.bales.length; i++) {
        const b = this.bales[i];
        this._p.set(b.x, KERB + 0.22, b.z);
        _q.setFromAxisAngle(_Y, b.yaw);
        this._sc.set(b.w, 0.42, b.l);
        this._m4.compose(this._p, _q, this._sc);
        m.setMatrixAt(i, this._m4);
        m.setColorAt(i, c.setHex(b.color).multiplyScalar(0.8));
      }
      this._sc.set(1, 1, 1);
      m.count = this.bales.length;
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }

    reset() {
      if (!this.platen) return;
      this.state = 'idle';
      this.platenY = CR.up;
      this.platen.position.y = CR.up;
      this.target = null;
      this.carTop = 0;
      this.beacon.visible = false;
    }

    stop() {}
  }
  const _Y = new THREE.Vector3(0, 1, 0);

  // -------------------------------------------------------------- register
  VH.Districts.register({
    id: D,
    name: 'Ironside',
    plots: ['ironside_scrapyard', 'ironside_power', 'ironside_railyard'],
    build(world, layout) {
      return VH.SouthKit.withUndersides(() => this._build(world, layout)); // canopies, ceilings and lamps show from below
    },
    _build(world, layout) {
      const t0 = performance.now();
      if (!layout.plots || !VH.WNKit || !VH.SouthKit) return;
      const part = (k, fn) => { const t = performance.now(); fn(world); (this.partMs || (this.partMs = {}))[k] = Math.round(performance.now() - t); };
      if (layout.plots.ironside_scrapyard) {
        part('scrapyard', buildScrapyard);
        world.ironScrap = true;
      }
      if (layout.plots.ironside_power) {
        part('power', buildPower);
        world.ironPower = true;
      }
      if (layout.plots.ironside_railyard) {
        part('railyard', buildRailyard);
        world.ironRail = true;
      }
      this.buildMs = Math.round(performance.now() - t0);
    },
    registerPlaces(world, places) {
      const add = (id, p) => {
        const def = places.defs && places.defs[id];
        places.add(id, Object.assign({ district: D, desc: def && def.desc }, p));
      };
      const extra = places.extra[D];
      if (world.ironScrap) {
        const gx = (SY.gate[0] + SY.gate[1]) / 2;
        add('ironside_scrapyard', { name: 'Ironside Scrapyard', x: gx, z: SY.z1 - 14, yaw: PI, kind: 'warehouse', landmark: true });
        add('scrapyard_gate', { name: 'The scrapyard gate', x: gx, z: SY.z1 - 0.9, yaw: PI, kind: 'street' });
        add('crusher_belt', { name: 'The crusher and its conveyor', x: -534, z: 1560.5, yaw: PI, kind: 'warehouse' });
        add('crusher_belt_foot', { name: 'The foot of the crusher conveyor', x: CR.belt.x0 - 2.2, z: CR.belt.z + 2.6, yaw: PI / 2, kind: 'warehouse' });
        add('crusher_belt_top', { name: 'The catwalk at the crusher\'s jaws', x: (CR.plat.x0 + CR.plat.x1) / 2, z: (CR.plat.z0 + CR.plat.z1) / 2, y: CR.plat.y, yaw: PI / 2, kind: 'warehouse' });
        if (extra) {
          extra.push(
            { x: -476, z: 1640, yaw: PI, kinds: ['warehouse', 'street'], name: 'The scrapyard access road' },
            { x: -553, z: 1700, yaw: PI, kinds: ['alley', 'warehouse'], name: 'Between the car stacks, Ironside Scrapyard' },
            { x: -430, z: 1620, yaw: 0, kinds: ['alley'], name: 'An aisle of crushed cars' },
            { x: -506, z: 1720, yaw: -PI / 2, kinds: ['parking', 'warehouse'], name: 'By the weighbridge office' },
            { x: -399, z: 1474, yaw: 0, kinds: ['street', 'corner'], name: 'The scrapyard\'s back gate, Foundry Road' },
          );
        }
      }
      if (world.ironPower) {
        const C1 = PW.chimneys[0], C2 = PW.chimneys[1];
        add('ironside_power', { name: 'Ironside Power Station', x: -30, z: (PW.gate[0] + PW.gate[1]) / 2, yaw: -PI / 2, kind: 'power', landmark: true });
        add('power_chimney_gap', { name: 'Between the two big chimneys', x: (C1.x + C2.x) / 2, z: (C1.z + C2.z) / 2, yaw: PI / 2, kind: 'overlook' });
        add('ironside_pipes', { name: 'Under the refinery pipe racks', x: (PW.pipe.x0 + PW.pipe.x1) / 2, z: 1640, yaw: PI, kind: 'construction' });
        if (extra) {
          extra.push(
            { x: -149, z: 1620, yaw: PI, kinds: ['street'], name: 'The ring road round the chimneys' },
            { x: -30, z: 1650, yaw: -PI / 2, kinds: ['parking'], name: 'The power station forecourt' },
            { x: -227, z: 1520, yaw: PI, kinds: ['construction', 'alley'], name: 'The pipe road, under the racks' },
            { x: -244, z: 1620, yaw: -PI / 2, kinds: ['warehouse', 'construction'], name: 'By the refinery tanks' },
          );
        }
      }
      if (world.ironRail) {
        add('ironside_railyard', { name: 'Ironside Rail Yard', x: RY.fence.x0 + 18, z: (RY.road.z0 + RY.road.z1) / 2, yaw: PI / 2, kind: 'railyard', landmark: true });
        if (extra) {
          extra.push(
            { x: -560, z: 1300, yaw: 0, kinds: ['street', 'corner'], name: 'The level crossing, Ironside Rail Yard' },
            { x: -420, z: 1340, yaw: PI, kinds: ['street'], name: 'The east crossing, Ironside Rail Yard' },
            { x: -534, z: 1302, yaw: PI, kinds: ['parking'], name: 'The rail yard staff car park' },
            { x: -540, z: 1430, yaw: 0, kinds: ['warehouse', 'alley', 'dock'], name: 'Among the containers' },
            { x: -360, z: 1325, yaw: -PI / 2, kinds: ['warehouse'], name: 'By the loco shed' },
          );
        }
      }
    },
    System: IronLife,
  });
})();
