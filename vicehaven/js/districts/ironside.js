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
    bales: { x0: -506, x1: -501.6, z: 1546.5, pitch: 2.05, n: 6 },
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
        if (alongX) ctx.propMatte.box(a + 0.03, KERB, cA + 0.06 * (s === 0 ? 1 : 0), a + 1.87, top, cB - 0.06 * (s === 1 ? 1 : 0), col(0x2a2826), { skip });
        else ctx.propMatte.box(cA + 0.06 * (s === 0 ? 1 : 0), KERB, a + 0.03, cB - 0.06 * (s === 1 ? 1 : 0), top, a + 1.87, col(0x2a2826), { skip });
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
    W.pave(world, Wl.x0, Wl.z0, Wl.x1, Wl.z1, 0x8a7f6a, 'asphaltTop', KERB + 0.01, 8);
    W.pave(world, SY.road.x0, SY.road.z0, SY.road.x1, SY.z1, 0x5f5a54, 'asphaltTop', KERB + 0.014, 6);
    W.pave(world, SY.apron.x0, SY.apron.z0, SY.apron.x1, SY.apron.z1, 0x6a645c, 'asphaltTop', KERB + 0.014, 6);
    W.pave(world, SY.lane.x0, Wl.z0 - 2, SY.lane.x1, SY.lane.z1, 0x6a645c, 'asphaltTop', KERB + 0.014, 6);
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
        W.sign(world, { x: g1 + 4.5, y: KERB + 1.8, z: z + 0.16, yaw: 0, w: 4.4, h: 1.5, lines: ['CARS BOUGHT FOR CASH', 'ANY CONDITION · NO QUESTIONS*'], style: 'info', oneSided: true, flat: true, colors: { bg: ['#f4f2ec', '#e8e4dc'], fg: '#a8322c', bar: '#1c1c1e' } });
        W.sign(world, { x: g0 - 4.5, y: KERB + 1.8, z: z + 0.16, yaw: 0, w: 3.6, h: 1.3, lines: ['*SOME QUESTIONS', 'MIND THE CRANE'], style: 'info', oneSided: true, flat: true, colors: { bg: ['#f4f2ec', '#e8e4dc'], fg: '#1c1c1e', bar: '#d8a520' } });
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
      W.sign(world, { x: O.x1 + 0.08, y: KERB + 3.0, z: (O.z0 + O.z1) / 2 - 1, yaw: PI / 2, w: 5, h: 0.6, lines: ['OFFICE · WEIGHBRIDGE · ALL VISITORS REPORT HERE'], style: 'info', oneSided: true, flat: true, colors: { bg: ['#f4f2ec', '#e8e4dc'], fg: '#1c1c1e', bar: '#3f6a4a' } });
      // A guard dog's kennel (no dog: he's on his break).
      const kx = O.x0 + 2, kz = O.z1 + 2.2;
      box(world, 'wood', kx - 0.6, KERB, kz - 0.7, kx + 0.6, KERB + 0.8, kz + 0.7, 0x8a6a48, 'wood');
      W.gable(c.wood, kx - 0.7, kz - 0.8, kx + 0.7, kz + 0.8, KERB + 0.8, 0.45, 'z', col(0xa8322c), col(0x8a6a48));
      world.physics.addBox(kx - 0.7, KERB + 0.8, kz - 0.8, kx + 0.7, KERB + 1.25, kz + 0.8, 'wood', F().SOLID | F().SHOTS);
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
    W.sign(world, { x: (CR.x0 + CR.x1) / 2, y: CR.top - 1.2, z: CR.z1 + 0.54, yaw: 0, w: 9.4, h: 1.2, lines: ['CRUSHER · DRIVE IN · GET OUT · STAND CLEAR'], style: 'info', oneSided: true, flat: true, colors: { bg: ['#1c1c1e', '#1c1c1e'], fg: '#f2c230', bar: '#f2c230' } });
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
    // Low end closed in down to the ground (a loading skirt); higher up it stands on legs.
    const skirtX = B.x0 + ((2.1 - B.y0) / (B.y1 - B.y0)) * (B.x1 - B.x0);
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
    // The belt is solid (you could walk up it, it's a bad idea): ramp segments, closed beneath the skirt.
    {
      const n = 6, L = B.x1 - B.x0;
      for (let k = 0; k < n; k++) {
        const xa = B.x0 + (L * k) / n, xb = B.x0 + (L * (k + 1)) / n;
        const ya = yAt(xa), yb = yAt(xb);
        const base = xb <= skirtX + 0.5 ? 0 : ya - 0.6;
        world.physics.addRamp((xa + xb) / 2, B.z, B.w / 2 + 0.2, (xb - xa) / 2, PI / 2, base, ya, yb, 'metal', F().ALL);
        // The side girders (to the girder tops) keep feet on the belt or off it.
        for (const s of [-1, 1]) world.physics.addBox(xa, base, B.z + s * (B.w / 2 + 0.08) - 0.08, xb, yb + 0.4, B.z + s * (B.w / 2 + 0.08) + 0.08, 'railing', F().SOLID | F().SHOTS);
      }
    }
    W.sign(world, { x: B.x0 + 4, y: 1.9, z: B.z + B.w / 2 + 0.26, yaw: 0, w: 2.6, h: 0.8, lines: ['FEED BELT', 'DO NOT RIDE THE BELT'], style: 'info', oneSided: true, flat: true, colors: { bg: ['#f2c230', '#e0b020'], fg: '#1c1c1e', bar: '#1c1c1e' } });

    // --- the catwalk beside the belt (north side) up to the platform at the jaws
    const Wk = CR.walk, Pf = CR.plat;
    const wyAt = (x) => KERB + ((x - Wk.x0) / (Wk.x1 - Wk.x0)) * (Wk.y1 - KERB);
    const ctxW = world.ctxAt((Wk.x0 + Wk.x1) / 2, Wk.z);
    slabX(ctxW.prop, Wk.x0, KERB + 0.02, Wk.x1, Wk.y1, Wk.z, Wk.w, 0.12, 0x8f969c);
    for (let x = Wk.x0 + 0.4; x < Wk.x1; x += 0.45) {
      const y = wyAt(x);
      ctxW.prop.box(x, y, Wk.z - Wk.w / 2 + 0.05, x + 0.05, y + 0.03, Wk.z + Wk.w / 2 - 0.05, col(0x6a7076)); // grip bars
    }
    const walkSkirt = Wk.x0 + ((2.0 - KERB) / (Wk.y1 - KERB)) * (Wk.x1 - Wk.x0);
    for (const s of [-1, 1]) {
      const z = Wk.z + s * Wk.w / 2;
      Sk.face(ctxW.prop, [[Wk.x0, KERB, z], [walkSkirt, KERB, z], [walkSkirt, wyAt(walkSkirt) - 0.12, z]], col(0x6a7076), [Wk.x0 + 2, 0.4, Wk.z]);
      // Handrail and mid rail, posts.
      const zr = Wk.z + s * (Wk.w / 2 - 0.04);
      K().beam(ctxW.prop, Wk.x0, KERB + 1.05, zr, Wk.x1, Wk.y1 + 1.05, zr, 0.06, col(yel));
      K().beam(ctxW.prop, Wk.x0, KERB + 0.55, zr, Wk.x1, Wk.y1 + 0.55, zr, 0.04, col(yel));
      for (let x = Wk.x0; x <= Wk.x1 + 0.01; x += (Wk.x1 - Wk.x0) / 8) ctxW.prop.box(x - 0.04, wyAt(x), zr - 0.04, x + 0.04, wyAt(x) + 1.05, zr + 0.04, col(yel));
    }
    {
      const n = 8, L = Wk.x1 - Wk.x0;
      for (let k = 0; k < n; k++) {
        const xa = Wk.x0 + (L * k) / n, xb = Wk.x0 + (L * (k + 1)) / n;
        const ya = wyAt(xa), yb = wyAt(xb);
        const base = xb <= walkSkirt + 0.4 ? 0 : ya - 0.5;
        world.physics.addRamp((xa + xb) / 2, Wk.z, Wk.w / 2, (xb - xa) / 2, PI / 2, base, ya, yb, 'metal', F().SOLID | F().SHOTS);
        for (const s of [-1, 1]) world.physics.addBox(xa, base, Wk.z + s * Wk.w / 2 - 0.07, xb, yb + 1.05, Wk.z + s * Wk.w / 2 + 0.07, 'railing', F().SOLID);
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
    K().deckRails(world, Pf.x0, Pf.z0, Pf.x1, Pf.z1, Pf.y, [{ side: 'w', a0: Wk.z - Wk.w / 2, a1: Wk.z + Wk.w / 2 }, { side: 'e', a0: Pf.z0, a1: Pf.z1 }], yel);
    W.sign(world, { x: Pf.x0 + 0.02, y: Pf.y + 1.6, z: (Pf.z0 + Pf.z1) / 2 - 0.6, yaw: -PI / 2, w: 1.6, h: 0.6, lines: ['JAWS · NO ENTRY', 'WHILE BELT RUNS'], style: 'info', oneSided: true, flat: true, colors: { bg: ['#d8342c', '#b82a24'], fg: '#ffffff', bar: '#ffffff' } });

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
      if (v.role === 'mission' || v === this.game.player.lastVehicle && v.persistent && v.role === 'mission') return;
      const color = v.model && v.model.color !== undefined ? v.model.color : 0x8a8f96;
      const b = { x: v.pos.x, z: v.pos.z, yaw: v.yaw, l: v.hz * 2 * 0.95, w: v.hx * 2 * 0.95, color, path: null, t: 0 };
      this.game.vehicles.remove(v);
      if (this.bales.length > CR.bales.n) this.bales.shift();
      this.bales.push(b);
      this._writeBales();
      this.game.stats && this.game.stats.add && this.game.stats.add('carsCrushed', 1);
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
      b.path = [[b.x, b.z], [b.x, CR.bay.z1 + 2.2], [sx, CR.bay.z1 + 2.2], [sx, sz]];
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
    plots: ['ironside_scrapyard'],
    build(world, layout) {
      const t0 = performance.now();
      if (!layout.plots || !VH.WNKit || !VH.SouthKit) return;
      if (layout.plots.ironside_scrapyard) {
        buildScrapyard(world);
        world.ironScrap = true;
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
    },
    System: IronLife,
  });
})();
