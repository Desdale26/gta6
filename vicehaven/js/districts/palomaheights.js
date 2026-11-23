/*
 * districts/palomaheights.js — Paloma Heights, the walled hill of villas at
 * the north end of Isla Paloma (VICEHAVEN 3.0).
 *
 *   paloma_estate       VILLA CASTELLANE, the hotelier's estate and the
 *                       biggest house on the island: a walled park with its
 *                       gates on Mirador Road, a gravel forecourt and
 *                       fountain, the portico, THE STUDY at the east end of
 *                       the ground floor (an open French window onto the east
 *                       terrace, a green desk lamp, a room you can walk into),
 *                       the terraces and steps down to the back lawn, the
 *                       pool and pool house, and the party (lights strung
 *                       over the lawn, the quartet's stage, the buffet and its
 *                       ice swan, Dash Lockwood's camera crane). A garden
 *                       gate in the east wall faces the botanical gardens.
 *   paloma_gardens      THE PALOMA BOTANICAL GARDENS: an iron-and-glass palm
 *                       house you can walk through, clipped hedge parterres
 *                       round a lily pond, the west gate on Paloma Way.
 *   paloma_observatory  THE OBSERVATORY: a stone drum you can walk into (the
 *                       telescope under the dome), outside stairs up to the
 *                       terrace round the dome, the dome itself (stepped
 *                       underneath, so a parachutist can stand on it), the
 *                       flat lawn beside it. South of it on the same plot,
 *                       THE PALOMA CLINIC with its rooftop helipad.
 *
 * Everything static draws into the chunk builders (VH.WNKit / VH.SouthKit
 * helpers); the palm house glass is one shared transparent mesh.
 */
(function () {
  'use strict';

  const VH = window.VH;
  const KERB = 0.15;
  const D = 'palomaheights';
  const PI = Math.PI;
  const F = () => VH.COLLIDE;
  const K = () => VH.WNKit;
  const S = () => VH.SouthKit;
  const col = (h) => (Array.isArray(h) ? h : VH.col(h));
  const sc = (h) => (Array.isArray(h) ? h : VH.col(h, 1.6)); // stone on the mid-grey concrete texture
  const colFor = (surf, h) => (surf === 'concrete' ? sc(h) : col(h));

  // ---------------------------------------------------------------- plan
  const EST = {
    // plot 807..973 x -463..-295; Mirador Road north (z -470), Paloma Way east (x 980)
    wall: { x0: 809, x1: 971, z0: -461, z1: -297, t: 0.5, h: 2.6 },
    gate: { x: 890, w: 10 },
    side: { z: -352, w: 3.2 }, // the garden gate in the east wall (opposite the gardens' west gate)
    house: { x0: 836, x1: 944, z0: -424, z1: -392, h: 11.4 },
    study: { x0: 930, z0: -416, z1: -398, win: -408, ww: 1.7 }, // ground floor room at the east end (to house.x1)
    terr: 0.9, // the terraces' height above the slab
    terrE: { x0: 944, x1: 958, z0: -420, z1: -384 },
    terrS: { x0: 836, x1: 944, z0: -392, z1: -384 },
    pool: { x0: 866, x1: 914, z0: -352, z1: -336 },
    fountain: { x: 890, z: -446, r: 4.2 },
  };
  const STUCCO = 0xf3e6cc;
  const CREAM = 0xf1e1c4;
  const TERRACOTTA = 0xa4553c;
  const STONE = 0xe2d4b4;
  const IRON = 0x24272b;

  // ----------------------------------------------------------- helpers
  const CH = 192, OR = -768;
  function cuts(a0, a1) {
    const out = [];
    let a = a0;
    while (a < a1 - 1e-6) {
      const edge = OR + (Math.floor((a - OR) / CH) + 1) * CH;
      const b = Math.min(a1, edge);
      out.push([a, b]);
      a = b;
    }
    return out;
  }
  /** A box drawn into `surf` of the chunk(s) it stands in (cut on the grid), no collider. */
  function draw(world, surf, x0, y0, z0, x1, y1, z1, hex, opts) {
    const c = colFor(surf, hex);
    for (const [xa, xb] of cuts(x0, x1)) for (const [za, zb] of cuts(z0, z1)) world.ctxAt((xa + xb) / 2, (za + zb) / 2)[surf].box(xa, y0, za, xb, y1, zb, c, opts);
  }
  /** A box drawn and solid; the collider starts at the ground for anything standing on the slab. */
  function sbox(world, surf, x0, y0, z0, x1, y1, z1, hex, tag, opts, flags) {
    draw(world, surf, x0, y0, z0, x1, y1, z1, hex, opts);
    return world.physics.addBox(x0, y0 <= KERB + 0.01 ? 0 : y0, z0, x1, y1, z1, tag || 'wall', flags === undefined ? F().ALL : flags);
  }
  function cbox(world, x0, y0, z0, x1, y1, z1, tag, flags) {
    return world.physics.addBox(Math.min(x0, x1), y0, Math.min(z0, z1), Math.max(x0, x1), y1, Math.max(z0, z1), tag || 'wall', flags === undefined ? F().ALL : flags);
  }
  function sobox(world, surf, cx, cz, hx, hz, yaw, y0, y1, hex, tag, flags) {
    world.ctxAt(cx, cz)[surf].orientedBox(cx, cz, hx, hz, yaw, y0, y1, colFor(surf, hex));
    return world.physics.addOrientedBox(cx, cz, hx, hz, yaw, y0 <= KERB + 0.01 ? 0 : y0, y1, tag || 'wall', flags === undefined ? F().ALL : flags);
  }
  function pave(world, x0, z0, x1, z1, hex, surf, y, uv) {
    K().pave(world, x0, z0, x1, z1, hex, surf || 'plazaTop', y, uv);
  }
  function lawn(world, x0, z0, x1, z1) {
    pave(world, x0, z0, x1, z1, 0xffffff, 'grassTop', KERB + 0.02, 6);
    world.addLawn(x0, z0, x1, z1);
  }
  /** A glowing box (lamps, lit windows): bright at night. */
  function glow(world, x0, y0, z0, x1, y1, z1, hex, mul) {
    world.ctxAt((x0 + x1) / 2, (z0 + z1) / 2).screen.box(x0, y0, z0, x1, y1, z1, VH.col(hex, mul || 2), { bottom: true });
  }
  /** A lantern on a wall bracket facing (nx, nz). */
  function wallLantern(world, x, y, z, nx, nz) {
    const ctx = world.ctxAt(x, z);
    const bx = x + nx * 0.35, bz = z + nz * 0.35;
    ctx.prop.box(Math.min(x, bx) - 0.04, y + 0.45, Math.min(z, bz) - 0.04, Math.max(x, bx) + 0.04, y + 0.52, Math.max(z, bz) + 0.04, VH.col(0x2a2a2a), { bottom: true });
    ctx.prop.box(bx - 0.16, y + 0.42, bz - 0.16, bx + 0.16, y + 0.5, bz + 0.16, VH.col(0x2a2a2a), { bottom: true });
    glow(world, bx - 0.12, y - 0.05, bz - 0.12, bx + 0.12, y + 0.42, bz + 0.12, 0xffd890, 2.4);
  }
  /** A stucco garden wall with a terracotta coping along an axis line, gaps [[a0, a1]], solid. */
  function gardenWall(world, x0, z0, x1, z1, gaps, h, t, hex) {
    const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
    const a0 = alongX ? Math.min(x0, x1) : Math.min(z0, z1);
    const a1 = alongX ? Math.max(x0, x1) : Math.max(z0, z1);
    const c = alongX ? z0 : x0;
    let cur = a0;
    const segs = [];
    for (const [g0, g1] of (gaps || []).slice().sort((p, q) => p[0] - q[0])) {
      if (g0 > cur) segs.push([cur, g0]);
      cur = Math.max(cur, g1);
    }
    if (cur < a1) segs.push([cur, a1]);
    for (const [s0, s1] of segs) {
      if (alongX) {
        sbox(world, 'b', s0, KERB, c - t / 2, s1, KERB + h, c + t / 2, hex || STUCCO, 'wall');
        draw(world, 'prop', s0, KERB + h, c - t / 2 - 0.08, s1, KERB + h + 0.14, c + t / 2 + 0.08, TERRACOTTA, { bottom: true });
      } else {
        sbox(world, 'b', c - t / 2, KERB, s0, c + t / 2, KERB + h, s1, hex || STUCCO, 'wall');
        draw(world, 'prop', c - t / 2 - 0.08, KERB + h, s0, c + t / 2 + 0.08, KERB + h + 0.14, s1, TERRACOTTA, { bottom: true });
      }
    }
  }
  /** A square gate pier with a cap and a lantern on top, solid. */
  function pier(world, x, z, s, h) {
    sbox(world, 'concrete', x - s, KERB, z - s, x + s, KERB + h, z + s, STONE, 'wall');
    draw(world, 'concrete', x - s - 0.1, KERB + h, z - s - 0.1, x + s + 0.1, KERB + h + 0.2, z + s + 0.1, 0xcdbd98, { bottom: true });
    const ctx = world.ctxAt(x, z);
    ctx.concrete.cylinder(x, KERB + h + 0.2, z, s * 0.5, s * 0.35, 0.4, 8, sc(0xcdbd98), true);
    glow(world, x - 0.18, KERB + h + 0.6, z - 0.18, x + 0.18, KERB + h + 1.1, z + 0.18, 0xffd890, 2.2);
    ctx.prop.box(x - 0.22, KERB + h + 1.1, z - 0.22, x + 0.22, KERB + h + 1.18, z + 0.22, VH.col(IRON), { bottom: true });
    cbox(world, x - s * 0.5, KERB + h, z - s * 0.5, x + s * 0.5, KERB + h + 1.2, z + s * 0.5, 'wall');
  }
  /** A wrought-iron gate leaf (bars, two rails, finials) from (ax, az) to (bx, bz), solid. */
  function gateLeaf(world, ax, az, bx, bz, h) {
    const len = Math.hypot(bx - ax, bz - az);
    const ux = (bx - ax) / len, uz = (bz - az) / len;
    const yaw = Math.atan2(-uz, ux);
    const cx = (ax + bx) / 2, cz = (az + bz) / 2;
    const ctx = world.ctxAt(cx, cz);
    const c = VH.col(IRON);
    for (const y of [KERB + 0.15, KERB + h * 0.5, KERB + h - 0.1]) ctx.prop.orientedBox(cx, cz, len / 2, 0.04, yaw, y, y + 0.08, c);
    const n = Math.max(2, Math.round(len / 0.14));
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t;
      const top = KERB + h + 0.25 * Math.sin(t * PI);
      ctx.prop.box(x - 0.02, KERB + 0.15, z - 0.02, x + 0.02, top, z + 0.02, c);
      if (i % 3 === 0) ctx.prop.box(x - 0.045, top, z - 0.045, x + 0.045, top + 0.12, z + 0.045, VH.col(0xc9a227));
    }
    world.physics.addOrientedBox(cx, cz, len / 2, 0.08, yaw, 0, KERB + h + 0.25, 'railing', F().SOLID | F().CAMERA);
  }
  /** A stone balustrade (rail, plinth, balusters) along an axis line, solid. */
  function balustrade(world, x0, z0, x1, z1, y, hex) {
    const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
    const a0 = alongX ? Math.min(x0, x1) : Math.min(z0, z1), a1 = alongX ? Math.max(x0, x1) : Math.max(z0, z1);
    const c = alongX ? z0 : x0;
    const B = (p0, p1, c0, c1, ya, yb) => (alongX ? [p0, ya, c0, p1, yb, c1] : [c0, ya, p0, c1, yb, p1]);
    const hx = hex || STONE;
    draw(world, 'concrete', ...B(a0, a1, c - 0.2, c + 0.2, y, y + 0.15), hx);
    draw(world, 'concrete', ...B(a0, a1, c - 0.22, c + 0.22, y + 0.82, y + 0.95), hx, { bottom: true });
    const ctx = alongX ? world.ctxAt((a0 + a1) / 2, c) : world.ctxAt(c, (a0 + a1) / 2);
    for (let a = a0 + 0.2; a < a1 - 0.1; a += 0.42) {
      const p = alongX ? [a, c] : [c, a];
      ctx.concrete.cylinder(p[0], y + 0.15, p[1], 0.09, 0.12, 0.67, 6, sc(hx), false);
    }
    cbox(world, ...B(a0, a1, c - 0.22, c + 0.22, y <= KERB + 0.01 ? 0 : y, y + 0.95), 'railing', F().SOLID | F().SHOTS);
  }
  /** A clipped box hedge (solid). */
  function hedge(world, x0, z0, x1, z1, h, hex) {
    for (const [xa, xb] of cuts(x0, x1)) for (const [za, zb] of cuts(z0, z1)) world.ctxAt((xa + xb) / 2, (za + zb) / 2).hedge.box(xa, KERB, za, xb, KERB + h, zb, VH.col(hex || 0x3c6e32));
    cbox(world, x0, 0, z0, x1, KERB + h, z1, 'hedge', F().SOLID | F().SHOTS | F().CAMERA);
  }
  /** A clipped cone of yew in a stone pot (solid). */
  function topiary(world, x, z, h) {
    const ctx = world.ctxAt(x, z);
    S().drum(world, ctx.concrete, x, KERB, z, 0.55, 0.6, 8, 0xd8cbb0, 'wall');
    ctx.hedge.cylinder(x, KERB + 0.6, z, 0.6, 0.05, h, 8, VH.col(0x2f5e2a), false);
    S().disc(world, x, z, 0.45, KERB + 0.6, KERB + 0.6 + h * 0.6, 'hedge');
  }
  /** A round table with a white cloth and two chairs (solid). */
  function partyTable(world, x, z) {
    const ctx = world.ctxAt(x, z);
    S().drum(world, ctx.prop, x, KERB, z, 0.75, 0.76, 12, 0xf6f4ee, 'crate');
    ctx.prop.cylinder(x, KERB + 0.76, z, 0.08, 0.08, 0.25, 6, VH.col(0xd8eef4), true); // a carafe
    for (const a of [0.4, 0.4 + PI]) {
      const cx = x + Math.cos(a) * 1.15, cz = z + Math.sin(a) * 1.15;
      sbox(world, 'prop', cx - 0.22, KERB, cz - 0.22, cx + 0.22, KERB + 0.95, cz + 0.22, 0xd8c08a, 'crate');
    }
  }
  /** A parasol over a lounger pair. */
  function parasol(world, x, z, hex) {
    const ctx = world.ctxAt(x, z);
    ctx.prop.box(x - 0.04, KERB, z - 0.04, x + 0.04, KERB + 2.35, z + 0.04, VH.col(0xdcd6c8));
    K().block(world, x - 0.06, 0, z - 0.06, x + 0.06, KERB + 2.35, z + 0.06, 'pole');
    ctx.prop.cylinder(x, KERB + 2.05, z, 0.06, 1.6, 0.45, 8, VH.col(hex), false);
    S().capUnder(ctx.prop, x, KERB + 2.05, z, 1.6, 8, VH.colMul(VH.col(hex), 0.75));
    S().disc(world, x, z, 1.61, KERB + 2.05, KERB + 2.5, 'crate', F().SOLID | F().SHOTS);
  }

  // ---------------------------------------------------------- the estate
  function buildEstate(world) {
    const E = EST, W = E.wall, H = E.house, St = E.study;
    const yT = KERB + E.terr; // the terraces' (and the study's) floor
    // --- the walls round the park, the gates on Mirador Road, the garden gate on the east side
    gardenWall(world, W.x0, W.z0, W.x1, W.z0, [[E.gate.x - E.gate.w / 2 - 0.8, E.gate.x + E.gate.w / 2 + 0.8]], W.h, W.t);
    gardenWall(world, W.x0, W.z1, W.x1, W.z1, [], W.h, W.t);
    gardenWall(world, W.x0, W.z0, W.x0, W.z1, [], W.h, W.t);
    gardenWall(world, W.x1, W.z0, W.x1, W.z1, [[E.side.z - E.side.w / 2 - 0.5, E.side.z + E.side.w / 2 + 0.5]], W.h, W.t);
    const gx0 = E.gate.x - E.gate.w / 2, gx1 = E.gate.x + E.gate.w / 2;
    pier(world, gx0 - 0.55, W.z0, 0.6, 3.4);
    pier(world, gx1 + 0.55, W.z0, 0.6, 3.4);
    // The gates stand open, folded back inside the wall.
    gateLeaf(world, gx0, W.z0 + 0.4, gx0 + 0.2, W.z0 + 5.2, 2.6);
    gateLeaf(world, gx1, W.z0 + 0.4, gx1 - 0.2, W.z0 + 5.2, 2.6);
    K().sign(world, { x: gx0 - 0.55, y: KERB + 2.2, z: W.z0 - 0.62, yaw: PI, w: 1.15, h: 0.7, lines: ['VILLA', 'CASTELLANE'], style: 'plaque' });
    // The garden gate in the east wall (open, a leaf swung in) between two small piers.
    const sz0 = E.side.z - E.side.w / 2, sz1 = E.side.z + E.side.w / 2;
    pier(world, W.x1, sz0 - 0.4, 0.4, 2.9);
    pier(world, W.x1, sz1 + 0.4, 0.4, 2.9);
    gateLeaf(world, W.x1 - 0.3, sz0, W.x1 - 3.2, sz0 - 0.3, 2.2);
    // Cypresses and palms along the inside of the walls.
    for (let x = W.x0 + 6; x < W.x1 - 4; x += 11) {
      if (Math.abs(x - E.gate.x) < 12) continue;
      world.addProp('palmTall', x, KERB, W.z0 + 4.5, (x * 3) % 6, 0.95);
    }
    for (let z = W.z0 + 12; z < W.z1 - 6; z += 13) world.addProp('treeB', W.x0 + 5, KERB, z, (z * 7) % 6, 1.1);
    for (let x = W.x0 + 14; x < W.x1 - 10; x += 14) world.addProp('tree', x, KERB, W.z1 - 5, (x * 5) % 6, 1.15);

    // --- the drive and the forecourt: pale gravel, the fountain, lawns with clipped yews
    pave(world, W.x0 + 0.3, W.z0 + 0.3, W.x1 - 0.3, W.z1 - 0.3, 0xffffff, 'grassTop', KERB + 0.015, 6);
    world.addLawn(W.x0 + 0.3, W.z0 + 0.3, W.x1 - 0.3, W.z1 - 0.3);
    pave(world, E.gate.x - 5, W.z0 - 7, E.gate.x + 5, W.z0 + 0.3, 0xe8dcc0, 'plazaTop', KERB + 0.03, 3); // across the pavement
    pave(world, E.gate.x - 5, W.z0, E.gate.x + 5, H.z0 - 14, 0xeadfc6, 'plazaTop', KERB + 0.03, 3);
    pave(world, 852, H.z0 - 30, 928, H.z0 - 1, 0xeadfc6, 'plazaTop', KERB + 0.035, 3);
    const Fn = E.fountain;
    const fctx = world.ctxAt(Fn.x, Fn.z);
    const fst = VH.col(0xe8dcc0);
    fctx.propMatte.cylinder(Fn.x, KERB, Fn.z, Fn.r + 0.2, Fn.r, 0.6, 20, fst, true, VH.colMul(fst, 0.8));
    fctx.screen.cylinder(Fn.x, KERB + 0.45, Fn.z, Fn.r - 0.25, Fn.r - 0.25, 0.08, 20, VH.col(0x5fb8c8, 0.9), true);
    fctx.propMatte.cylinder(Fn.x, KERB + 0.6, Fn.z, 0.5, 0.4, 1.4, 10, fst, true);
    fctx.propMatte.cylinder(Fn.x, KERB + 2.0, Fn.z, 0.8, 1.3, 0.3, 14, fst, true);
    fctx.propMatte.cylinder(Fn.x, KERB + 2.3, Fn.z, 0.25, 0.18, 0.8, 8, fst, true);
    world.fountains = world.fountains || [];
    world.fountains.push({ x: Fn.x, y: KERB + 0.55, z: Fn.z, r: Fn.r - 0.3 });
    S().disc(world, Fn.x, Fn.z, Fn.r + 0.21, 0, KERB + 0.6, 'fountain');
    world.physics.addBox(Fn.x - 0.5, 0, Fn.z - 0.5, Fn.x + 0.5, KERB + 3.2, Fn.z + 0.5, 'fountain');
    S().disc(world, Fn.x, Fn.z, 1.3, KERB + 2.0, KERB + 2.3, 'fountain');
    for (const [tx, tz] of [[858, -452], [858, -436], [922, -452], [922, -436], [E.gate.x - 7, W.z0 + 6], [E.gate.x + 7, W.z0 + 6]]) topiary(world, tx, tz, 2.4);
    for (const [lx, lz] of [[853.5, -452], [926.5, -452], [853.5, -438], [926.5, -438]]) world.addProp('streetlight', lx, KERB, lz, lx < E.gate.x ? PI / 2 : -PI / 2, 0.8);
    // A Sovereign and an estate car parked on the forecourt (drawn: they never move).
    parkedCar(world, 866, H.z0 - 8, 0, 0xf2efe6);
    parkedCar(world, 914, H.z0 - 8, 0, 0x1d2a3a);

    // --- the house: three storeys of cream stucco under a terracotta roof
    const mainX1 = St.x0;
    K().building(world, H.x0, H.z0, mainX1, H.z1, H.h, { wall: CREAM, roof: 0xb8a890, style: 1, ww: 0.5, wh: 0.62, bay: 3.6, floorH: 3.8, seed: 0.41, parapet: false });
    // The east end: the study on the ground floor (a room), solid above and either side of it.
    const ceil = yT + 3.4;
    K().building(world, mainX1, H.z0, H.x1, H.z1, KERB + H.h - ceil, { y0: ceil, wall: CREAM, roof: 0xb8a890, style: 1, ww: 0.5, wh: 0.62, bay: 3.6, floorH: 3.8, seed: 0.47, parapet: false, solid: false, sides: { w: 'skip' } });
    cbox(world, mainX1, ceil, H.z0, H.x1, KERB + H.h, H.z1, 'building');
    sbox(world, 'b', mainX1, KERB, H.z0, H.x1, ceil, St.z0, CREAM, 'building'); // north of the study
    sbox(world, 'b', mainX1, KERB, St.z1, H.x1, ceil, H.z1, CREAM, 'building'); // south of it
    // The study's east wall: the open French window in the middle, a tall window either side.
    const wz0 = St.win - St.ww / 2, wz1 = St.win + St.ww / 2, ex = H.x1;
    sbox(world, 'b', ex - 0.4, KERB, St.z0, ex, ceil, wz0, CREAM, 'building');
    sbox(world, 'b', ex - 0.4, KERB, wz1, ex, ceil, St.z1, CREAM, 'building');
    sbox(world, 'b', ex - 0.4, yT + 2.7, wz0, ex, ceil, wz1, CREAM, 'building', { bottom: true });
    const sctx = world.ctxAt(ex - 5, St.win);
    // Window glass on the closed windows (dark by day, warm at night), white frames.
    for (const wz of [St.win - 5, St.win + 5]) {
      glow(world, ex + 0.01, yT + 0.3, wz - 0.75, ex + 0.04, yT + 2.6, wz + 0.75, 0xffd9a0, 0.9);
      sctx.prop.box(ex, yT + 0.2, wz - 0.85, ex + 0.08, yT + 0.3, wz + 0.85, VH.col(0xf6f4ee));
      sctx.prop.box(ex, yT + 2.6, wz - 0.85, ex + 0.08, yT + 2.7, wz + 0.85, VH.col(0xf6f4ee), { bottom: true });
      sctx.prop.box(ex, yT + 0.3, wz - 0.04, ex + 0.08, yT + 2.6, wz + 0.04, VH.col(0xf6f4ee));
      // Shutters folded back.
      for (const s2 of [-1, 1]) sctx.prop.box(ex, yT + 0.2, wz + s2 * 0.85 - (s2 > 0 ? 0 : 0.7), ex + 0.06, yT + 2.7, wz + s2 * 0.85 + (s2 > 0 ? 0.7 : 0), VH.col(0x4f7a62));
    }
    // The French window: frame, and its two glazed leaves swung open into the room (solid, thin).
    sctx.prop.box(ex - 0.42, yT + 2.62, wz0 - 0.08, ex + 0.04, yT + 2.75, wz1 + 0.08, VH.col(0xf6f4ee), { bottom: true });
    for (const [z0, s2] of [[wz0, 1], [wz1, -1]]) {
      const lz = z0 + s2 * 0.06;
      sctx.prop.box(ex - 0.4 - 0.8, yT, Math.min(lz, lz + s2 * 0.05), ex - 0.4, yT + 2.6, Math.max(lz, lz + s2 * 0.05), VH.col(0xf6f4ee));
      glow(world, ex - 1.15, yT + 0.25, Math.min(lz, lz + s2 * 0.06) - 0.005, ex - 0.45, yT + 2.45, Math.max(lz, lz + s2 * 0.06) + 0.005, 0xbcd6e0, 0.6);
      cbox(world, ex - 1.22, yT, Math.min(lz, lz + s2 * 0.07), ex - 0.4, yT + 2.6, Math.max(lz, lz + s2 * 0.07), 'wall', F().SOLID | F().SHOTS);
    }
    // Inside the study: the floor (at terrace height), the ceiling, bookcases, the desk and its green lamp.
    const ix0 = mainX1, ix1 = ex - 0.4, iz0 = St.z0, iz1 = St.z1;
    sbox(world, 'wood', ix0, KERB, iz0, ix1, yT, iz1, 0x7a5a3c, 'plank');
    draw(world, 'interior', ix0, ceil - 0.15, iz0, ix1, ceil, iz1, 0xf2ead8, { bottom: true });
    pave(world, ix0 + 3, iz0 + 4, ix1 - 2, iz1 - 4, 0x7a2a2a, 'decal', yT + 0.01, 1); // the rug
    const ictx = world.ctxAt((ix0 + ix1) / 2, (iz0 + iz1) / 2);
    ictx.interior.box(ix0 + 0.01, yT, iz0 + 0.01, ix1 - 0.01, ceil - 0.15, iz0 + 0.02, VH.col(0x2f4a3a)); // green walls
    ictx.interior.box(ix0 + 0.01, yT, iz1 - 0.02, ix1 - 0.01, ceil - 0.15, iz1 - 0.01, VH.col(0x2f4a3a));
    ictx.interior.box(ix0 + 0.01, yT, iz0, ix0 + 0.02, ceil - 0.15, iz1, VH.col(0x2f4a3a));
    const books = [0x8a2a2a, 0x2a4a7a, 0x2f5a3a, 0xc9a227, 0x5a3a22, 0xe8dcc0];
    for (const [bz0, bz1] of [[iz0 + 0.02, iz0 + 0.5], [iz1 - 0.5, iz1 - 0.02]]) {
      sbox(world, 'wood', ix0 + 1.0, yT, bz0, ix1 - 1.6, yT + 2.6, bz1, 0x4a3020, 'crate');
      for (let sh = 0; sh < 5; sh++) {
        const y = yT + 0.15 + sh * 0.5;
        for (let x = ix0 + 1.1, i = 0; x < ix1 - 1.8; x += 0.32, i++) {
          const zf = bz0 < iz0 + 1 ? bz1 : bz0;
          const zo = bz0 < iz0 + 1 ? 0.012 : -0.012;
          ictx.interior.box(x, y, Math.min(zf, zf + zo), x + 0.26, y + 0.36 + ((i * 7) % 3) * 0.03, Math.max(zf, zf + zo), VH.col(books[(i + sh) % books.length]));
        }
      }
    }
    // The desk, side-on to the window so the lamp shows from the terrace.
    const dx = ix0 + 6.2, dz = St.win;
    sbox(world, 'wood', dx - 0.5, yT, dz - 1.1, dx + 0.5, yT + 0.78, dz + 1.1, 0x5a3a22, 'crate');
    ictx.interior.box(dx - 0.45, yT + 0.78, dz - 1.0, dx + 0.45, yT + 0.8, dz + 1.0, VH.col(0x2f5a3a)); // the leather top
    // The green banker's lamp: a brass stem, a green glass shade that glows.
    ictx.prop.box(dx - 0.03, yT + 0.8, dz + 0.55, dx + 0.03, yT + 1.15, dz + 0.61, VH.col(0xc9a227));
    glow(world, dx - 0.12, yT + 1.12, dz + 0.4, dx + 0.12, yT + 1.24, dz + 0.76, 0x2fd06a, 2.6);
    glow(world, dx - 0.4, yT + 0.8, dz + 0.2, dx + 0.4, yT + 0.805, dz + 0.95, 0xfff1b0, 1.2); // its pool of light on the desk
    // Papers, a photograph on the wall: a racing car and a man with a cup.
    ictx.prop.box(dx - 0.3, yT + 0.8, dz - 0.6, dx + 0.2, yT + 0.83, dz - 0.2, VH.col(0xf4f1e6));
    ictx.interior.box(ix0 + 0.03, yT + 1.4, dz - 0.7, ix0 + 0.06, yT + 2.3, dz + 0.7, VH.col(0xc9a227));
    ictx.interior.box(ix0 + 0.06, yT + 1.5, dz - 0.6, ix0 + 0.07, yT + 2.2, dz + 0.6, VH.col(0x3a3a3a));
    ictx.interior.box(ix0 + 0.07, yT + 1.6, dz - 0.4, ix0 + 0.08, yT + 1.8, dz + 0.3, VH.col(0xc0392b));
    // The desk chair and two leather armchairs by the window.
    sbox(world, 'prop', dx - 1.3, yT, dz - 0.35, dx - 0.7, yT + 1.05, dz + 0.35, 0x4a2a1a, 'crate');
    for (const az of [dz - 2.6, dz + 2.6]) sbox(world, 'prop', ex - 2.8, yT, az - 0.5, ex - 1.8, yT + 0.95, az + 0.5, 0x6a3a22, 'crate');
    // The ceiling light (warm at night).
    glow(world, (ix0 + ix1) / 2 - 0.3, ceil - 0.4, dz - 0.3, (ix0 + ix1) / 2 + 0.3, ceil - 0.15, dz + 0.3, 0xffe2a8, 1.6);

    // --- the portico on the forecourt: six columns, a pediment, the front door and steps
    const pz = H.z0, pc0 = 872, pc1 = 908;
    for (let k = 0; k <= 5; k++) {
      const cx = pc0 + ((pc1 - pc0) * k) / 5;
      S().drum(world, world.ctxAt(cx, pz - 4).concrete, cx, KERB + 0.6, pz - 4, 0.42, 6.8, 12, 0xf2ead8, 'wall');
      draw(world, 'concrete', cx - 0.55, KERB + 0.6, pz - 4.55, cx + 0.55, KERB + 0.9, pz - 3.45, 0xe2d4b4);
      draw(world, 'concrete', cx - 0.55, KERB + 7.1, pz - 4.55, cx + 0.55, KERB + 7.4, pz - 3.45, 0xe2d4b4, { bottom: true });
    }
    for (let k = 0; k < 3; k++) sbox(world, 'concrete', pc0 - 2 + k * 0.4, KERB, pz - 6.4 + k * 0.6, pc1 + 2 - k * 0.4, KERB + 0.2 * (k + 1), pz, 0xe2d4b4, 'stairs');
    sbox(world, 'concrete', pc0 - 1.2, KERB + 7.4, pz - 5.2, pc1 + 1.2, KERB + 8.2, pz, 0xf2ead8, 'wall', { bottom: true });
    const pctx = world.ctxAt(890, pz - 3);
    pctx.concrete.polygon([[pc0 - 1.2, KERB + 8.2, pz - 5.2], [890, KERB + 11.4, pz - 5.2], [pc1 + 1.2, KERB + 8.2, pz - 5.2]], sc(0xf2ead8));
    K().gable(pctx.prop, pc0 - 1.4, pz - 5.4, pc1 + 1.4, pz + 0.2, KERB + 8.2, 3.2, 'x', TERRACOTTA, 0xf2ead8);
    draw(world, 'wood', 888.4, KERB + 0.6, pz - 0.08, 891.6, KERB + 4.6, pz, 0x3a2416);
    glow(world, 888.6, KERB + 4.7, pz - 0.1, 891.4, KERB + 5.4, pz - 0.06, 0xffe2a8, 1.4); // the fanlight
    for (const x of [886.6, 893.4]) wallLantern(world, x, KERB + 3.0, pz, 0, -1);
    // The roof: terracotta, hipped by a gable each end; chimneys.
    const rctx = world.ctxAt(890, (H.z0 + H.z1) / 2);
    K().gable(rctx.prop, H.x0 - 0.6, H.z0 - 0.6, H.x1 + 0.6, H.z1 + 0.6, KERB + H.h, 5.2, 'x', TERRACOTTA, CREAM);
    for (const cx of [852, 884, 916, 936]) draw(world, 'b', cx - 0.8, KERB + H.h + 2.5, H.z0 + 12, cx + 0.8, KERB + H.h + 6.4, H.z0 + 14, CREAM);
    // A cornice under the eaves, and balconies on the first floor of the garden front.
    draw(world, 'concrete', H.x0 - 0.3, KERB + H.h - 0.4, H.z0 - 0.3, H.x1 + 0.3, KERB + H.h, H.z1 + 0.3, 0xe2d4b4, { bottom: true });
    for (let x = H.x0 + 8; x < H.x1 - 8; x += 18) {
      draw(world, 'concrete', x - 2.2, KERB + 4.6, H.z1, x + 2.2, KERB + 4.8, H.z1 + 1.1, 0xe2d4b4, { bottom: true });
      balustrade(world, x - 2.2, H.z1 + 1.0, x + 2.2, H.z1 + 1.0, KERB + 4.8);
    }

    // --- the terraces: the garden terrace along the back, the east terrace outside the study
    const TS = E.terrS, TE = E.terrE;
    sbox(world, 'concrete', TS.x0, KERB, TS.z0, TS.x1, yT, TS.z1, STONE, 'wall');
    sbox(world, 'concrete', TE.x0, KERB, TE.z0, TE.x1, yT, TE.z1, STONE, 'wall');
    pave(world, TS.x0, TS.z0, TS.x1, TS.z1, 0xd8c8a6, 'plazaTop', yT + 0.01, 2);
    pave(world, TE.x0, TE.z0, TE.x1, TE.z1, 0xd8c8a6, 'plazaTop', yT + 0.01, 2);
    // Steps: the grand flight down to the lawn, and the east terrace's own flight.
    const gs = { x: 890, w: 12 };
    K().stairs(world, world.ctxAt(gs.x, TS.z1 + 2).concrete, gs.x, TS.z1 + 4.2, 'n', 4.2, gs.w, KERB, yT, sc(STONE), { rails: false, tag: 'stairs' });
    K().stairs(world, world.ctxAt(TE.x1 + 2, -400).concrete, TE.x1 + 4.2, -401, 'w', 4.2, 5, KERB, yT, sc(STONE), { rails: false, tag: 'stairs' });
    // Balustrades round the edges (open at the steps and against the house).
    balustrade(world, TS.x0, TS.z1, gs.x - gs.w / 2, TS.z1, yT);
    balustrade(world, gs.x + gs.w / 2, TS.z1, TE.x0, TS.z1, yT);
    balustrade(world, TE.x0, TE.z1, TE.x1, TE.z1, yT);
    balustrade(world, TE.x1, TE.z0, TE.x1, -403.5, yT);
    balustrade(world, TE.x1, -398.5, TE.x1, TE.z1, yT);
    balustrade(world, H.x1, TE.z0, TE.x1, TE.z0, yT);
    balustrade(world, TS.x0, H.z1, TS.x0, TS.z1, yT);
    // Cheek walls beside the grand flight (solid).
    for (const s2 of [-1, 1]) {
      const x = gs.x + s2 * (gs.w / 2 + 0.25);
      sbox(world, 'concrete', x - 0.25, KERB, TS.z1, x + 0.25, yT + 0.3, TS.z1 + 4.4, STONE, 'wall');
      topiary(world, x, TS.z1 + 5.2, 1.8);
    }
    // On the east terrace: potted lemon trees, a table and two chairs, a lantern by the window.
    for (const [lx, lz] of [[TE.x1 - 1.2, TE.z0 + 1.2], [TE.x1 - 1.2, TE.z1 - 1.2], [H.x1 + 1.0, St.win - 3.2], [H.x1 + 1.0, St.win + 3.2]]) {
      const lc = world.ctxAt(lx, lz);
      S().drum(world, lc.concrete, lx, yT, lz, 0.45, 0.6, 8, 0xc9a07a, 'wall');
      lc.hedge.cylinder(lx, yT + 1.0, lz, 0.7, 0.5, 1.0, 8, VH.col(0x3f7a34), true);
      lc.prop.box(lx - 0.04, yT + 0.6, lz - 0.04, lx + 0.04, yT + 1.0, lz + 0.04, VH.col(0x6b4e33));
      for (let k = 0; k < 4; k++) lc.prop.box(lx + Math.cos(k * 1.6) * 0.5 - 0.06, yT + 1.4 + (k % 2) * 0.3, lz + Math.sin(k * 1.6) * 0.5 - 0.06, lx + Math.cos(k * 1.6) * 0.5 + 0.06, yT + 1.52 + (k % 2) * 0.3, lz + Math.sin(k * 1.6) * 0.5 + 0.06, VH.col(0xf0d040));
      S().disc(world, lx, lz, 0.7, yT + 0.6, yT + 2.0, 'hedge', F().SOLID | F().SHOTS);
    }
    partyTable(world, TE.x0 + 8, TE.z0 + 5);
    wallLantern(world, H.x1, yT + 2.4, St.win - 1.6, 1, 0);

    // --- the back lawn and the party
    const P = E.pool;
    const pctx2 = world.ctxAt((P.x0 + P.x1) / 2, (P.z0 + P.z1) / 2);
    // The pool: stone coping (solid, knee-high), turquoise water lit from below at night.
    for (const [x0, z0, x1, z1] of [[P.x0 - 0.8, P.z0 - 0.8, P.x1 + 0.8, P.z0], [P.x0 - 0.8, P.z1, P.x1 + 0.8, P.z1 + 0.8], [P.x0 - 0.8, P.z0, P.x0, P.z1], [P.x1, P.z0, P.x1 + 0.8, P.z1]]) sbox(world, 'concrete', x0, KERB, z0, x1, KERB + 0.4, z1, 0xf2ead8, 'wall');
    pctx2.screen.box(P.x0, KERB - 0.1, P.z0, P.x1, KERB + 0.22, P.z1, VH.col(0x1f9ab8, 0.62));
    // A band of dark blue mosaic just inside the coping, and the steps at the shallow end.
    for (const [x0, z0, x1, z1] of [[P.x0, P.z0, P.x1, P.z0 + 0.5], [P.x0, P.z1 - 0.5, P.x1, P.z1], [P.x0, P.z0, P.x0 + 0.5, P.z1], [P.x1 - 0.5, P.z0, P.x1, P.z1]]) K().mark(world, x0, z0, x1, z1, 0x16466a, KERB + 0.23);
    for (let k = 0; k < 3; k++) K().mark(world, P.x0 + 0.5 + k * 0.6, P.z0 + 4, P.x0 + 0.6 + k * 0.6, P.z1 - 4, 0xbfe8f0, KERB + 0.23);
    world.physics.addBox(P.x0, 0, P.z0, P.x1, KERB + 0.22, P.z1, 'water', F().SOLID);
    pave(world, P.x0 - 4, P.z0 - 4, P.x1 + 4, P.z1 + 4, 0xe8dcc0, 'plazaTop', KERB + 0.03, 2);
    for (let x = P.x0 + 3; x < P.x1 - 2; x += 6) {
      sbox(world, 'prop', x - 0.4, KERB, P.z1 + 1.6, x + 0.4, KERB + 0.45, P.z1 + 3.6, 0xf6f4ee, 'crate');
      draw(world, 'prop', x - 0.4, KERB + 0.45, P.z1 + 3.0, x + 0.4, KERB + 0.95, P.z1 + 3.6, 0xf6f4ee);
      cbox(world, x - 0.4, KERB + 0.45, P.z1 + 3.0, x + 0.4, KERB + 0.95, P.z1 + 3.6, 'crate');
      if ((x - P.x0) % 12 < 6) parasol(world, x + 3, P.z1 + 2.6, [0xf6f1e4, 0x2f7f86, 0xe8c9a0][Math.round(x) % 3]);
    }
    // The pool house at the east end: a white cabana, a pergola in front.
    const phx0 = P.x1 + 8, phx1 = P.x1 + 22, phz0 = P.z0 - 2, phz1 = P.z1 + 2;
    K().building(world, phx0, phz0, phx1, phz1, 3.4, { wall: 0xf6f1e4, roof: 0xb8a890, style: 1, ww: 0.55, wh: 0.55, bay: 3.2, floorH: 3.4, seed: 0.6, parapet: 0.5 });
    for (let z = phz0 + 1; z <= phz1 - 1; z += 3) {
      S().drum(world, world.ctxAt(phx0 - 3.6, z).prop, phx0 - 3.6, KERB, z, 0.12, 2.8, 6, 0xf6f4ee, 'pole');
      draw(world, 'wood', phx0 - 4.0, KERB + 2.8, z - 0.08, phx0, KERB + 2.95, z + 0.08, 0xd8c8a6, { bottom: true });
    }
    draw(world, 'wood', phx0 - 3.75, KERB + 2.95, phz0 + 0.8, phx0 - 3.45, KERB + 3.1, phz1 - 0.8, 0xd8c8a6, { bottom: true });

    // The quartet's stage: a low white platform under a canvas canopy, four chairs and music stands.
    const qs = { x0: 834, x1: 846, z0: -368, z1: -358 };
    sbox(world, 'wood', qs.x0, KERB, qs.z0, qs.x1, KERB + 0.4, qs.z1, 0xf6f4ee, 'plank');
    K().stairs(world, world.ctxAt(qs.x1 + 1, -363).wood, qs.x1 + 1.4, -363, 'w', 1.4, 2.0, KERB, KERB + 0.4, 0xf6f4ee, { rails: false, tag: 'stairs' });
    const qctx = world.ctxAt((qs.x0 + qs.x1) / 2, (qs.z0 + qs.z1) / 2);
    for (const [x, z] of [[qs.x0 + 0.3, qs.z0 + 0.3], [qs.x1 - 0.3, qs.z0 + 0.3], [qs.x0 + 0.3, qs.z1 - 0.3], [qs.x1 - 0.3, qs.z1 - 0.3]]) {
      qctx.prop.box(x - 0.06, KERB + 0.4, z - 0.06, x + 0.06, KERB + 3.4, z + 0.06, VH.col(0xf6f4ee));
      K().block(world, x - 0.08, 0, z - 0.08, x + 0.08, KERB + 3.4, z + 0.08, 'pole');
    }
    qctx.prop.box(qs.x0 - 0.3, KERB + 3.4, qs.z0 - 0.3, qs.x1 + 0.3, KERB + 3.55, qs.z1 + 0.3, VH.col(0xf6f1e4), { bottom: true });
    for (let k = 0; k < 4; k++) {
      const cx = qs.x0 + 2.5 + k * 2.4, cz = (qs.z0 + qs.z1) / 2 + (k % 2 ? 0.8 : -0.4);
      sbox(world, 'prop', cx - 0.22, KERB + 0.4, cz - 0.22, cx + 0.22, KERB + 1.3, cz + 0.22, 0x2a2d33, 'crate');
      qctx.prop.box(cx + 0.6 - 0.02, KERB + 0.4, cz - 0.02, cx + 0.6 + 0.02, KERB + 1.5, cz + 0.02, VH.col(0x2a2d33));
      qctx.prop.box(cx + 0.6 - 0.22, KERB + 1.2, cz - 0.02, cx + 0.6 + 0.22, KERB + 1.5, cz + 0.02, VH.col(0x2a2d33));
      K().block(world, cx + 0.38, KERB + 0.4, cz - 0.08, cx + 0.82, KERB + 1.5, cz + 0.08, 'pole');
    }
    // The cello (a brown body on its spike) beside the first chair.
    qctx.prop.cylinder(qs.x0 + 2.0, KERB + 0.4, (qs.z0 + qs.z1) / 2 - 0.4, 0.3, 0.22, 1.1, 8, VH.col(0x8a4a1e), true);
    S().disc(world, qs.x0 + 2.0, (qs.z0 + qs.z1) / 2 - 0.4, 0.31, KERB + 0.4, KERB + 1.5, 'crate');

    // The buffet: white-clothed tables along the terrace foot, the ice swan losing its head.
    const bz = TS.z1 + 7;
    sbox(world, 'prop', 900, KERB, bz - 0.6, 918, KERB + 0.9, bz + 0.6, 0xf6f4ee, 'crate');
    const bctx = world.ctxAt(909, bz);
    for (let x = 901; x < 917; x += 1.4) bctx.prop.box(x, KERB + 0.9, bz - 0.35, x + 0.9, KERB + 0.96, bz + 0.35, VH.col(0xd8d8d8));
    for (let x = 901.5; x < 917; x += 2.8) bctx.prop.box(x, KERB + 0.96, bz - 0.25, x + 0.5, KERB + 1.08, bz + 0.25, VH.col([0xe8a050, 0xc0392b, 0x7ac04a, 0xf0d050][Math.round(x) % 4]));
    // The swan: ice-blue, faintly lit.
    glow(world, 908.3, KERB + 0.96, bz - 0.3, 909.7, KERB + 1.4, bz + 0.3, 0xd8f4ff, 0.75);
    glow(world, 909.4, KERB + 1.4, bz - 0.08, 909.6, KERB + 2.0, bz + 0.08, 0xd8f4ff, 0.75);
    glow(world, 909.4, KERB + 1.95, bz - 0.06, 909.75, KERB + 2.05, bz + 0.06, 0xd8f4ff, 0.75);
    cbox(world, 908.3, KERB + 0.9, bz - 0.3, 909.75, KERB + 2.05, bz + 0.3, 'crate', F().SOLID | F().SHOTS);
    // Round tables on the lawn.
    for (const [tx, tz] of [[860, -372], [868, -366], [876, -372], [906, -368], [916, -374], [924, -366], [852, -346], [946, -350]]) partyTable(world, tx, tz);
    // Dash Lockwood's camera crane: a dolly, a mast, a long arm with the camera out over the lawn.
    const cr = { x: 848, z: -380 };
    const crc = world.ctxAt(cr.x, cr.z);
    sbox(world, 'prop', cr.x - 1.2, KERB, cr.z - 0.8, cr.x + 1.2, KERB + 0.6, cr.z + 0.8, 0x3b1558, 'metal');
    for (const [wx, wz] of [[-1, -0.8], [1, -0.8], [-1, 0.8], [1, 0.8]]) crc.prop.cylinder(cr.x + wx, KERB, cr.z + wz, 0.22, 0.22, 0.3, 8, VH.col(0x1a1a1a), true);
    sbox(world, 'prop', cr.x - 0.25, KERB + 0.6, cr.z - 0.25, cr.x + 0.25, KERB + 2.6, cr.z + 0.25, 0x2a2d33, 'metal');
    K().beam(crc.prop, cr.x - 2.4, KERB + 2.0, cr.z + 1.6, cr.x + 5.2, KERB + 5.4, cr.z - 3.4, 0.18, VH.col(0xd29a1c));
    sbox(world, 'prop', cr.x - 2.9, KERB + 1.5, cr.z + 1.2, cr.x - 2.0, KERB + 2.2, cr.z + 2.0, 0x2a2d33, 'metal'); // counterweights
    crc.prop.box(cr.x + 4.9, KERB + 4.7, cr.z - 3.7, cr.x + 5.6, KERB + 5.3, cr.z - 3.1, VH.col(0x1a1a1a), { bottom: true });
    glow(world, cr.x + 5.6, KERB + 5.0, cr.z - 3.5, cr.x + 5.66, KERB + 5.1, cr.z - 3.4, 0xff3030, 2.4); // the tally light
    cbox(world, cr.x - 2.4, KERB + 1.6, cr.z + 1.0, cr.x - 1.0, KERB + 2.6, cr.z + 2.0, 'metal');
    // Party lights: strings of bulbs criss-crossing the lawn between poles (solid poles).
    const poles = [[828, -378], [870, -380], [912, -380], [954, -378], [828, -330], [870, -326], [912, -326], [954, -330]];
    for (const [x, z] of poles) {
      S().drum(world, world.ctxAt(x, z).prop, x, KERB, z, 0.1, 5.2, 6, 0x2a2d33, 'pole');
    }
    const bulbs = [0xfff1c8, 0xffd24a, 0xff9a7a, 0xfff1c8];
    for (let i = 0; i < 4; i++) {
      K().festoon(world, poles[i][0], KERB + 5.0, poles[i][1], poles[i + 4][0], KERB + 5.0, poles[i + 4][1], 1.2, bulbs, 1.5);
      if (i < 3) {
        K().festoon(world, poles[i][0], KERB + 5.0, poles[i][1], poles[i + 5][0], KERB + 5.0, poles[i + 5][1], 1.4, bulbs, 1.5);
        K().festoon(world, poles[i + 4][0], KERB + 5.0, poles[i + 4][1], poles[i + 1][0], KERB + 5.0, poles[i + 1][1], 1.4, bulbs, 1.5);
      }
    }
    // The rose garden in the south-east corner: hedged beds round a sundial; tree clumps to the west.
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
      const bx0 = 930 + i * 9, bz0 = -324 + j * 11;
      hedge(world, bx0, bz0, bx0 + 7, bz0 + 0.5, 0.6);
      hedge(world, bx0, bz0 + 7.5, bx0 + 7, bz0 + 8, 0.6);
      hedge(world, bx0, bz0 + 0.5, bx0 + 0.5, bz0 + 7.5, 0.6);
      hedge(world, bx0 + 6.5, bz0 + 0.5, bx0 + 7, bz0 + 7.5, 0.6);
      const rc = world.ctxAt(bx0 + 3.5, bz0 + 4);
      for (let k = 0; k < 12; k++) {
        const fx = bx0 + 1 + (k % 4) * 1.6, fz = bz0 + 1.4 + Math.floor(k / 4) * 2.2;
        rc.hedge.box(fx, KERB, fz, fx + 0.9, KERB + 0.7, fz + 0.9, VH.col(0x3f7a34));
        rc.hedge.box(fx + 0.15, KERB + 0.7, fz + 0.15, fx + 0.75, KERB + 0.86, fz + 0.75, VH.col([0xd8344a, 0xf2f0e8, 0xf08ab0, 0xe8c040][(k + i + j) % 4]));
      }
      cbox(world, bx0 + 0.5, 0, bz0 + 0.5, bx0 + 6.5, KERB + 0.86, bz0 + 7.5, 'hedge', F().SOLID | F().SHOTS);
    }
    S().drum(world, world.ctxAt(944, -314).concrete, 943.5, KERB, -313.5, 0.5, 1.0, 8, 0xe2d4b4, 'wall'); // the sundial
    world.ctxAt(944, -314).prop.box(943.3, KERB + 1.0, -313.7, 943.7, KERB + 1.3, -313.3, VH.col(0xa8742a));
    cbox(world, 943.3, KERB + 1.0, -313.7, 943.7, KERB + 1.3, -313.3, 'metal');
    for (const [cx, cz] of [[822, -318], [830, -326], [818, -332], [826, -306], [838, -312], [864, -308], [872, -314], [858, -316]]) world.addProp('treeB', cx, KERB, cz, (cx * cz) % 6, 1.15);
    // The hedge along the east wall where a man can keep his head down (gap at the garden gate).
    hedge(world, W.x1 - 4.6, TE.z1 + 6, W.x1 - 2.8, E.side.z - E.side.w / 2 - 2.6, 1.7);
    hedge(world, W.x1 - 4.6, E.side.z + E.side.w / 2 + 2.6, W.x1 - 2.8, W.z1 - 3, 1.7);
    // Lanterns on the lawn paths, palms round the pool.
    for (const [px, pz] of [[P.x0 - 6, P.z0 - 6], [P.x1 + 6, P.z0 - 6], [P.x0 - 6, P.z1 + 6], [P.x1 + 6, P.z1 + 6]]) world.addProp('palmTall', px, KERB, pz, (px * 3) % 6, 1.0);
    for (const [lx, lz] of [[884, -376], [896, -376], [P.x0 - 2, P.z1 + 6], [P.x1 + 2, P.z1 + 6]]) {
      S().drum(world, world.ctxAt(lx, lz).prop, lx, KERB, lz, 0.08, 1.0, 6, 0x2a2d33, 'pole');
      glow(world, lx - 0.15, KERB + 1.0, lz - 0.15, lx + 0.15, KERB + 1.35, lz + 0.15, 0xffe2a8, 2.2);
      cbox(world, lx - 0.15, KERB + 1.0, lz - 0.15, lx + 0.15, KERB + 1.35, lz + 0.15, 'pole');
    }

    return { yT, study: { x: H.x1 + 1.3, z: St.win, y: yT }, garden: { x: 890, z: -366 }, gate: { x: E.gate.x, z: W.z0 + 4 } };
  }

  // ------------------------------------------------- the observatory
  // plot 1167..1293 x -463..-295 (Mirador Road north, Lantana Avenue west, Airfield Road east, Bridge Street south)
  const OBS = { x: 1250, z: -414, rIn: 7.0, rOut: 10, h: 7.25, dome: 7.2, seg: 12 };
  const LAWN = { x0: 1172, x1: 1230, z0: -458, z1: -374 };
  const CLINIC = { x0: 1188, x1: 1272, z0: -362, z1: -322, h: 11 };

  function flipped(g) {
    const idx = g.index.array;
    for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
    const n = g.attributes.normal;
    for (let i = 0; i < n.count; i++) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i));
    return g;
  }

  function buildObservatory(world) {
    const O = OBS;
    const yTop = KERB + O.h; // the terrace round the dome
    const ctx = world.ctxAt(O.x, O.z);
    const N = O.seg, Ao = O.rOut * Math.cos(PI / N), hl = O.rOut * Math.sin(PI / N);
    const Ai = O.rIn, hr = (Ao - Ai) / 2, rc = (Ao + Ai) / 2;
    const WALL = 0xf2ede2;
    // --- grounds: a gravel path from Mirador Road, the forecourt round the drum, the lawn to the west
    pave(world, 1170, -461, 1290, -298, 0xffffff, 'grassTop', KERB + 0.015, 6);
    world.addLawn(1170, -461, 1290, -370);
    pave(world, O.x - 2.5, -461, O.x + 2.5, O.z - O.rOut - 2, 0xe6dcc4, 'plazaTop', KERB + 0.03, 3);
    pave(world, O.x - 15, O.z - 15, O.x + 15, O.z + 22, 0xe6dcc4, 'plazaTop', KERB + 0.03, 3);
    K().sign(world, { x: O.x + 6, y: KERB + 1.4, z: -458, yaw: PI, w: 5.2, h: 1.6, lines: ['PALOMA OBSERVATORY', 'Est. 1902 · Open Nights'], style: 'monolith' });
    // --- the drum: twelve thick masonry segments (the terrace is their top), a door on the west side
    const seg = (a, t0, t1, y0, y1) => {
      // a piece of the segment at angle a between tangent offsets t0..t1 (metres from its centre)
      const ux = -Math.sin(a), uz = Math.cos(a);
      const mid = (t0 + t1) / 2;
      const cx = O.x + Math.cos(a) * rc + ux * mid, cz = O.z + Math.sin(a) * rc + uz * mid;
      sobox(world, 'b', cx, cz, (t1 - t0) / 2, hr, Math.atan2(-Math.cos(a), -Math.sin(a)), y0, y1, WALL, 'building');
    };
    const doorW = 1.0;
    for (let k = 0; k < N; k++) {
      const a = (k / N) * PI * 2;
      if (k === N / 2) {
        // West: the doorway.
        seg(a, -hl, -doorW, KERB, yTop);
        seg(a, doorW, hl, KERB, yTop);
        seg(a, -doorW, doorW, KERB + 3.0, yTop);
      } else seg(a, -hl, hl, KERB, yTop);
      // A tall lit window on every other face, a pilaster strip at each corner.
      const fx = O.x + Math.cos(a) * (Ao + 0.02), fz = O.z + Math.sin(a) * (Ao + 0.02);
      const yaw = Math.atan2(-Math.cos(a), -Math.sin(a));
      if (k % 2 === 1) ctx.screen.orientedBox(fx, fz, 0.5, 0.03, yaw, KERB + 2.2, KERB + 5.2, VH.col(0xffd9a0, 0.9));
      const va = a + PI / N, vx = O.x + Math.cos(va) * O.rOut, vz = O.z + Math.sin(va) * O.rOut;
      ctx.concrete.box(vx - 0.18, KERB, vz - 0.18, vx + 0.18, yTop + 0.05, vz + 0.18, sc(0xe2d4b4));
    }
    // (the pilasters stand on the drum's corners: one collider ring for them)
    for (let k = 0; k < N; k++) {
      const va = ((k + 0.5) / N) * PI * 2, vx = O.x + Math.cos(va) * O.rOut, vz = O.z + Math.sin(va) * O.rOut;
      cbox(world, vx - 0.18, 0, vz - 0.18, vx + 0.18, yTop + 0.05, vz + 0.18, 'building');
    }
    // A cornice band round the top; the door frame and a lamp over it.
    for (let k = 0; k < N; k++) {
      const a = (k / N) * PI * 2;
      const cx = O.x + Math.cos(a) * (Ao + 0.1), cz = O.z + Math.sin(a) * (Ao + 0.1);
      ctx.concrete.orientedBox(cx, cz, hl + 0.1, 0.22, Math.atan2(-Math.cos(a), -Math.sin(a)), yTop - 0.45, yTop - 0.15, sc(0xe2d4b4));
    }
    const dX = O.x - Ao;
    ctx.prop.box(dX - 0.12, KERB + 3.0, O.z - doorW - 0.15, dX + 0.02, KERB + 3.25, O.z + doorW + 0.15, VH.col(0x2a2d33), { bottom: true });
    wallLantern(world, dX, KERB + 3.5, O.z, -1, 0);
    // --- the terrace railing (open where the stair comes up on the south side)
    const railY = yTop;
    for (let k = 0; k < N; k++) {
      const a = (k / N) * PI * 2;
      const yaw = Math.atan2(-Math.cos(a), -Math.sin(a));
      const pieces = k === N / 4 ? [[-hl, -1.7], [1.7, hl]] : [[-hl, hl]];
      for (const [t0, t1] of pieces) {
        const ux = -Math.sin(a), uz = Math.cos(a), mid = (t0 + t1) / 2;
        const cx = O.x + Math.cos(a) * (Ao - 0.1) + ux * mid, cz = O.z + Math.sin(a) * (Ao - 0.1) + uz * mid;
        ctx.prop.orientedBox(cx, cz, (t1 - t0) / 2, 0.05, yaw, railY + 0.95, railY + 1.05, VH.col(0x2a2d33));
        ctx.prop.orientedBox(cx, cz, (t1 - t0) / 2, 0.015, yaw, railY + 0.1, railY + 0.95, VH.col(0x5a6068));
        world.physics.addOrientedBox(cx, cz, (t1 - t0) / 2, 0.08, yaw, railY, railY + 1.05, 'railing', F().SOLID | F().SHOTS);
      }
    }
    // --- the outside stair up to the terrace (south side), with rails
    const sTop = O.z + Ao, sLen = 9.9;
    K().stairs(world, ctx.concrete, O.x, sTop + sLen, 'n', sLen, 3.0, KERB, yTop, sc(0xe2d4b4), { tag: 'stairs', railHex: 0x2a2d33 });
    // --- the dome: silver, a dark observing slit with a warm glow in it; stepped underneath so it can be stood on
    const R = O.dome;
    const m4 = new THREE.Matrix4();
    const outer = new THREE.SphereGeometry(R, 28, 10, 0, PI * 2, 0, PI / 2);
    ctx.prop.merge(outer, m4.makeTranslation(O.x, yTop, O.z), VH.col(0xdfe3e8));
    const inner = flipped(new THREE.SphereGeometry(R - 0.12, 20, 8, 0, PI * 2, 0, PI / 2));
    ctx.interior.merge(inner, m4.makeTranslation(O.x, yTop, O.z), VH.col(0x7d858f));
    outer.dispose(); inner.dispose();
    ctx.prop.cylinder(O.x, yTop, O.z, R + 0.25, R + 0.25, 0.45, 28, VH.col(0xb9c0c8), true);
    const az = -PI * 0.75; // the slit faces south-west, over the lawn
    for (let i = 0; i < 9; i++) {
      const e = ((i + 0.5) / 9) * (PI / 2) * 0.96;
      const rr = R + 0.03;
      const px = O.x + Math.cos(az) * rr * Math.cos(e), py = yTop + rr * Math.sin(e), pz = O.z + Math.sin(az) * rr * Math.cos(e);
      const yawS = Math.atan2(Math.cos(az), Math.sin(az));
      K().tiltBox(ctx.prop, px, py, pz, 1.5, (R * PI) / 2 / 9 + 0.05, 0.06, yawS, -e, VH.col(0x1e2430));
      if (i > 0 && i < 8) K().tiltBox(ctx.screen, px + Math.cos(az) * 0.02, py, pz + Math.sin(az) * 0.02, 0.35, (R * PI) / 2 / 9, 0.05, yawS, -e, VH.col(0xffcf80, 0.55));
    }
    // A lightning rod and a weather vane at the top.
    ctx.prop.box(O.x - 0.04, yTop + R, O.z - 0.04, O.x + 0.04, yTop + R + 1.6, O.z + 0.04, VH.col(0x2a2d33));
    for (let k = 0; k < 7; k++) S().disc(world, O.x, O.z, Math.sqrt(R * R - (k + 1) * (k + 1)), yTop + k, yTop + k + 1, 'metal');
    S().disc(world, O.x, O.z, R + 0.25, yTop, yTop + 0.45, 'metal');
    // --- inside: the floor, the great telescope on its pier, the desk and its screens
    pave(world, O.x - Ai, O.z - Ai, O.x + Ai, O.z + Ai, 0x8a6a48, 'plazaTop', KERB + 0.04, 2);
    const pierC = 0x9aa0a8;
    S().drum(world, ctx.prop, O.x, KERB, O.z, 0.9, 1.4, 12, pierC, 'metal');
    ctx.prop.box(O.x - 0.7, KERB + 1.4, O.z - 0.25, O.x + 0.7, KERB + 2.6, O.z + 0.25, VH.col(0x3a5a8a)); // the fork
    cbox(world, O.x - 0.7, KERB + 1.4, O.z - 0.25, O.x + 0.7, KERB + 2.6, O.z + 0.25, 'metal');
    const tx = Math.cos(az), tz = Math.sin(az);
    K().beam(ctx.prop, O.x - tx * 1.6, KERB + 1.9, O.z - tz * 1.6, O.x + tx * 3.0, KERB + 5.4, O.z + tz * 3.0, 0.62, VH.col(0xeef0f2));
    K().beam(ctx.prop, O.x + tx * 2.9, KERB + 5.32, O.z + tz * 2.9, O.x + tx * 3.1, KERB + 5.48, O.z + tz * 3.1, 0.7, VH.col(0x2a2d33));
    K().beam(ctx.prop, O.x - tx * 0.8, KERB + 2.5, O.z - tz * 0.8, O.x - tx * 0.4, KERB + 3.6, O.z - tz * 0.4, 0.16, VH.col(0x2a2d33)); // the eyepiece
    // (the tube's low end is over head height only beyond the pier: a collider for the part people could walk into)
    cbox(world, O.x - tx * 1.9 - 0.4, KERB + 1.4, O.z - tz * 1.9 - 0.4, O.x - tx * 1.1 + 0.4, KERB + 2.6, O.z - tz * 1.1 + 0.4, 'metal');
    // The desk against the wall to the north-east, two glowing screens, a chair; a star chart on the wall.
    const dkx = O.x + 4.2, dkz = O.z - 3.0;
    sobox(world, 'wood', dkx, dkz, 1.2, 0.45, PI / 4, KERB, KERB + 0.78, 0x6b4e33, 'crate');
    ctx.screen.orientedBox(dkx + 0.15, dkz - 0.15, 0.35, 0.03, PI / 4, KERB + 0.82, KERB + 1.2, VH.col(0x6ab0ff, 1.4));
    ctx.screen.orientedBox(dkx - 0.45, dkz + 0.45, 0.3, 0.03, PI / 4, KERB + 0.82, KERB + 1.15, VH.col(0xff8a5a, 1.2));
    sobox(world, 'prop', dkx - 0.7, dkz + 0.7, 0.25, 0.25, PI / 4, KERB, KERB + 0.95, 0x2a2d33, 'crate');
    // A ring of little lamps under the dome's rim.
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * PI * 2 + 0.2, lx = O.x + Math.cos(a) * (Ai - 0.15), lz = O.z + Math.sin(a) * (Ai - 0.15);
      ctx.screen.box(lx - 0.12, yTop - 1.0, lz - 0.12, lx + 0.12, yTop - 0.8, lz + 0.12, VH.col(0xffe2a8, 1.8), { bottom: true });
    }
    // Benches round the forecourt; lamps on the path; the lawn's flower bed (Gerald's) by the hedge.
    for (const [bx, bz, a] of [[O.x - 13, O.z + 6, PI / 2], [O.x + 13, O.z + 6, -PI / 2], [O.x - 13, O.z - 6, PI / 2], [O.x + 13, O.z - 6, -PI / 2]]) world.addProp('bench', bx, KERB, bz, a, 1);
    for (let z = -452; z < O.z - O.rOut - 4; z += 10) for (const x of [O.x - 3.4, O.x + 3.4]) world.addProp('streetlight', x, KERB, z, x < O.x ? PI / 2 : -PI / 2, 0.75);
    const gx = LAWN.x0 + 6, gz = LAWN.z0 + 5;
    const gctx = world.ctxAt(gx, gz);
    gctx.concrete.cylinder(gx, KERB, gz, 2.6, 2.6, 0.3, 14, sc(0xd8cbb0), true);
    for (let k = 0; k < 18; k++) {
      const a = (k / 18) * PI * 2, rr = 0.6 + (k % 3) * 0.6;
      const fx = gx + Math.cos(a) * rr, fz = gz + Math.sin(a) * rr;
      gctx.hedge.box(fx - 0.25, KERB + 0.3, fz - 0.25, fx + 0.25, KERB + 0.65, fz + 0.25, VH.col([0xe8483a, 0xf0d050, 0xe86ab0, 0xffffff][k % 4]));
    }
    S().disc(world, gx, gz, 2.6, 0, KERB + 0.65, 'hedge', F().SOLID | F().SHOTS);
    // The lawn's edges: a clipped hedge along Lantana Avenue and the clinic side, trees only at the corners.
    hedge(world, LAWN.x0 - 2.5, LAWN.z0, LAWN.x0 - 1.5, LAWN.z1, 1.2);
    hedge(world, LAWN.x0 - 1.5, LAWN.z1 + 1, LAWN.x1, LAWN.z1 + 2, 1.2);
    for (const [cx, cz] of [[1174, -300], [1286, -300], [1286, -456], [1270, -456]]) world.addProp('treeB', cx, KERB, cz, cx % 6, 1.1);
    return { yTop, terrace: { x: O.x, z: O.z + Ao - 1.3 } };
  }

  // ------------------------------------------------------- the clinic
  function buildClinic(world) {
    const C = CLINIC;
    const yR = KERB + C.h;
    K().building(world, C.x0, C.z0, C.x1, C.z1, C.h, { wall: 0xf4f6f6, roof: 0x9aa0a4, style: 3, ww: 0.7, wh: 0.5, bay: 3.6, floorH: 3.65, seed: 0.33, parapet: 0.9 });
    const ctx = world.ctxAt((C.x0 + C.x1) / 2, (C.z0 + C.z1) / 2);
    // A teal band at each floor line, a glass entrance, the porte-cochère over the drop-off.
    for (const y of [KERB + 3.65, KERB + 7.3]) draw(world, 'prop', C.x0 - 0.05, y - 0.2, C.z1, C.x1 + 0.05, y + 0.1, C.z1 + 0.06, 0x2f9a9a, { bottom: true });
    const ex = (C.x0 + C.x1) / 2;
    glow(world, ex - 4, KERB + 0.1, C.z1 + 0.02, ex + 4, KERB + 3.2, C.z1 + 0.06, 0xd8f0f0, 1.1);
    for (let x = ex - 4; x <= ex + 4; x += 2) ctx.prop.box(x - 0.05, KERB, C.z1 + 0.04, x + 0.05, KERB + 3.3, C.z1 + 0.1, VH.col(0x8a9298));
    const cz0 = C.z1, cz1 = C.z1 + 9;
    sbox(world, 'prop', ex - 8, KERB + 4.2, cz0, ex + 8, KERB + 4.7, cz1, 0xf4f6f6, 'building', { bottom: true });
    for (const [px, pz] of [[ex - 7.4, cz1 - 0.6], [ex + 7.4, cz1 - 0.6]]) S().drum(world, ctx.prop, px, KERB, pz, 0.3, 4.2, 10, 0xc8ced2, 'pole');
    for (let x = ex - 6; x <= ex + 6; x += 3) glow(world, x - 0.4, KERB + 4.12, cz0 + 2, x + 0.4, KERB + 4.2, cz1 - 2, 0xffffff, 1.6);
    K().sign(world, { x: ex, y: KERB + 5.3, z: cz1 + 0.05, yaw: 0, w: 8, h: 1.0, lines: ['PALOMA CLINIC'], style: 'neon' });
    // The drop-off loop from Bridge Street, an ambulance at the bay.
    pave(world, ex - 14, cz0, ex + 14, -296, 0x5b5f64, 'asphaltTop', KERB + 0.03, 6);
    pave(world, ex - 9, cz0, ex + 9, cz0 + 2, 0xe6e8ea, 'plazaTop', KERB + 0.04, 2);
    sbox(world, 'prop', C.x1 - 16, KERB + 0.4, cz0 + 2, C.x1 - 13.6, KERB + 2.9, cz0 + 8, 0xf6f6f2, 'metal');
    draw(world, 'prop', C.x1 - 16.02, KERB + 1.4, cz0 + 2, C.x1 - 13.58, KERB + 1.8, cz0 + 8, 0xd03030);
    glow(world, C.x1 - 15.6, KERB + 2.9, cz0 + 7.2, C.x1 - 14.0, KERB + 3.1, cz0 + 7.6, 0x3a7aff, 2.2);
    cbox(world, C.x1 - 16, 0, cz0 + 2, C.x1 - 13.6, KERB + 0.4, cz0 + 8, 'metal');
    for (const [wx, wz] of [[C.x1 - 16.05, cz0 + 3.2], [C.x1 - 13.75, cz0 + 3.2], [C.x1 - 16.05, cz0 + 6.8], [C.x1 - 13.75, cz0 + 6.8]]) ctx.prop.box(wx - 0.1, KERB, wz - 0.35, wx + 0.1, KERB + 0.7, wz + 0.35, VH.col(0x1a1a1a));
    for (const [px, pz] of [[C.x0 + 4, cz0 + 6], [C.x0 + 16, cz0 + 6], [C.x1 - 4, cz0 + 12]]) world.addProp('palmTall', px, KERB, pz, px % 6, 0.9);
    // --- the helipad on the roof: a raised deck, the H in its circle, edge lights, a windsock
    const hx = ex, hz = (C.z0 + C.z1) / 2, hs = 11;
    sbox(world, 'prop', hx - hs, yR, hz - hs + 2, hx + hs, yR + 0.4, hz + hs - 2, 0x4a5258, 'metal');
    const yH = yR + 0.4;
    const hc = world.ctxAt(hx, hz);
    hc.marks.cylinder(hx, yH + 0.01, hz, 7, 7, 0.01, 32, VH.col(0xf0c040), true);
    hc.prop.cylinder(hx, yH + 0.012, hz, 6.4, 6.4, 0.01, 32, VH.col(0x4a5258), true);
    for (const [x0, z0, x1, z1] of [[hx - 2.4, hz - 3.2, hx - 1.4, hz + 3.2], [hx + 1.4, hz - 3.2, hx + 2.4, hz + 3.2], [hx - 1.4, hz - 0.5, hx + 1.4, hz + 0.5]]) hc.marks.topRect(x0, z0, x1, z1, yH + 0.02, VH.col(0xf6f6f2));
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * PI * 2, lx = hx + Math.cos(a) * 7.6, lz = hz + Math.sin(a) * 7.6;
      hc.screen.box(lx - 0.12, yH, lz - 0.12, lx + 0.12, yH + 0.14, lz + 0.12, VH.col(0x40ff70, 2.2)); // solidity: passable (flush pad lights)
    }
    hc.prop.box(C.x1 - 3.1, yR, C.z0 + 2.9, C.x1 - 2.9, yR + 4, C.z0 + 3.1, VH.col(0xdddddd));
    K().tiltBox(hc.prop, C.x1 - 3.0, yR + 3.7, C.z0 + 4.0, 0.5, 0.5, 1.8, 0, 0.15, VH.col(0xff7a2a));
    cbox(world, C.x1 - 3.15, yR, C.z0 + 2.85, C.x1 - 2.85, yR + 4, C.z0 + 3.15, 'pole');
    // The stair head and lift room on the roof.
    sbox(world, 'b', C.x0 + 4, yR, C.z0 + 4, C.x0 + 12, yR + 3.2, C.z0 + 12, 0xe8ecec, 'building');
    world.ctxAt(C.x0 + 8, C.z0 + 8).prop.box(C.x0 + 3.8, yR + 3.2, C.z0 + 3.8, C.x0 + 12.2, yR + 3.4, C.z0 + 12.2, VH.col(0x9aa0a4));
    // A red light on each roof corner (lit).
    for (const [lx, lz] of [[C.x0 + 0.6, C.z0 + 0.6], [C.x1 - 0.6, C.z0 + 0.6], [C.x0 + 0.6, C.z1 - 0.6], [C.x1 - 0.6, C.z1 - 0.6]]) glow(world, lx - 0.15, yR + 0.9, lz - 0.15, lx + 0.15, yR + 1.2, lz + 0.15, 0xff2a2a, 2.4);
    return { yH, pad: { x: hx, z: hz }, front: { x: ex, z: cz1 + 3 } };
  }

  // --------------------------------------------- the botanical gardens
  // plot 987..1153 x -463..-295 (Mirador Road north, Paloma Way west, Lantana Avenue east, Bridge Street south)
  const GDN = {
    x0: 989, x1: 1151, z0: -461, z1: -297,
    house: { x0: 1040, x1: 1100, z0: -452, z1: -426, cx0: 1060, cx1: 1080, cz0: -455, cz1: -423, hW: 6.5, hC: 9, dome: 10 },
    pond: { x: 1070, z: -352, r: 8.5 },
    axis: 1070, cross: -352, // the main paths
  };

  function buildGardens(world) {
    const G = GDN, Hs = G.house, Pd = G.pond;
    const glass = new VH.GeometryBuilder({});
    const white = VH.col(0xf6f4ee);
    const gcol = VH.col(0xffffff);
    // --- ground: lawn everywhere, gravel paths on the two axes and round the pond
    pave(world, G.x0, G.z0, G.x1, G.z1, 0xffffff, 'grassTop', KERB + 0.015, 6);
    world.addLawn(G.x0, G.z0, G.x1, G.z1);
    const gravel = 0xe8dcc0;
    pave(world, G.axis - 4, G.z0, G.axis + 4, G.z1, gravel, 'plazaTop', KERB + 0.03, 3);
    pave(world, G.x0, G.cross - 4, G.x1, G.cross + 4, gravel, 'plazaTop', KERB + 0.03, 3);
    pave(world, Pd.x - 14, Pd.z - 14, Pd.x + 14, Pd.z + 14, gravel, 'plazaTop', KERB + 0.032, 3);
    pave(world, Hs.x0 - 4, Hs.z1, Hs.x1 + 4, Hs.z1 + 8, gravel, 'plazaTop', KERB + 0.031, 3);
    // --- the railings round the gardens (a stone plinth and iron bars, solid), gates N, W, S
    const rail = (x0, z0, x1, z1, gaps) => {
      const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
      const a0 = alongX ? Math.min(x0, x1) : Math.min(z0, z1), a1 = alongX ? Math.max(x0, x1) : Math.max(z0, z1);
      const c = alongX ? z0 : x0;
      let cur = a0;
      const segs = [];
      for (const [g0, g1] of gaps) { if (g0 > cur) segs.push([cur, g0]); cur = Math.max(cur, g1); }
      if (cur < a1) segs.push([cur, a1]);
      for (const [s0, s1] of segs) {
        for (const [p0, p1] of cuts(s0, s1)) {
          const B = (q0, q1, c0, c1, y0, y1) => (alongX ? [q0, y0, c0, q1, y1, c1] : [c0, y0, q0, c1, y1, q1]);
          const ctx = alongX ? world.ctxAt((p0 + p1) / 2, c) : world.ctxAt(c, (p0 + p1) / 2);
          ctx.concrete.box(...B(p0, p1, c - 0.25, c + 0.25, KERB, KERB + 0.6), sc(0xd8cbb0));
          ctx.prop.box(...B(p0, p1, c - 0.03, c + 0.03, KERB + 1.75, KERB + 1.82), VH.col(IRON));
          for (let a = p0 + 0.1; a < p1; a += 0.16) {
            const q = alongX ? [a, c] : [c, a];
            ctx.prop.box(q[0] - 0.015, KERB + 0.6, q[1] - 0.015, q[0] + 0.015, KERB + 1.95, q[1] + 0.015, VH.col(IRON));
          }
          for (let a = p0 + 3; a < p1 - 1; a += 6) {
            const q = alongX ? [a, c] : [c, a];
            ctx.concrete.box(q[0] - 0.3, KERB, q[1] - 0.3, q[0] + 0.3, KERB + 2.1, q[1] + 0.3, sc(0xd8cbb0));
          }
        }
        cbox(world, ...(alongX ? [s0, 0, c - 0.3, s1, KERB + 2.1, c + 0.3] : [c - 0.3, 0, s0, c + 0.3, KERB + 2.1, s1]), 'fence', F().SOLID | F().SHOTS);
      }
    };
    rail(G.x0, G.z0, G.x1, G.z0, [[G.axis - 4, G.axis + 4]]);
    rail(G.x0, G.z1, G.x1, G.z1, [[G.axis - 3, G.axis + 3]]);
    rail(G.x0, G.z0, G.x0, G.z1, [[G.cross - 3, G.cross + 3]]);
    rail(G.x1, G.z0, G.x1, G.z1, [[G.cross - 3, G.cross + 3]]);
    for (const [px, pz] of [[G.axis - 4.6, G.z0], [G.axis + 4.6, G.z0], [G.axis - 3.6, G.z1], [G.axis + 3.6, G.z1], [G.x0, G.cross - 3.6], [G.x0, G.cross + 3.6], [G.x1, G.cross - 3.6], [G.x1, G.cross + 3.6]]) pier(world, px, pz, 0.55, 2.9);
    K().sign(world, { x: G.axis, y: KERB + 4.6, z: G.z0 - 0.1, yaw: PI, w: 8.5, h: 1.1, lines: ['PALOMA BOTANICAL GARDENS'], style: 'park' });
    // The arch over the main gate that carries the sign (iron, solid posts).
    for (const x of [G.axis - 4.3, G.axis + 4.3]) sbox(world, 'prop', x - 0.12, KERB, G.z0 - 0.12, x + 0.12, KERB + 5.4, G.z0 + 0.12, IRON, 'pole');
    draw(world, 'prop', G.axis - 4.4, KERB + 5.2, G.z0 - 0.1, G.axis + 4.4, KERB + 5.4, G.z0 + 0.1, IRON, { bottom: true });

    // --- the palm house: white iron and glass, two wings and a domed centre, doors north and south
    const pane = (x0, y0, z0, x1, y1, z1) => glass.box(x0, y0, z0, x1, y1, z1, gcol, { bottom: true });
    const frameV = (x0, z0, x1, z1, y0, y1, step) => {
      // mullions along a wall line every `step` m, plus rails at the base, middle and top
      const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
      const a0 = alongX ? x0 : z0, a1 = alongX ? x1 : z1, c = alongX ? z0 : x0;
      const ctx = world.ctxAt((x0 + x1) / 2, (z0 + z1) / 2);
      for (let a = a0; a <= a1 + 1e-6; a += step) {
        if (alongX) ctx.prop.box(a - 0.07, y0, c - 0.09, a + 0.07, y1, c + 0.09, white);
        else ctx.prop.box(c - 0.09, y0, a - 0.07, c + 0.09, y1, a + 0.07, white);
      }
      for (const y of [y0 + 0.5, (y0 + y1) / 2, y1 - 0.12]) {
        if (alongX) ctx.prop.box(a0, y, c - 0.08, a1, y + 0.12, c + 0.08, white, { bottom: true });
        else ctx.prop.box(c - 0.08, y, a0, c + 0.08, y + 0.12, a1, white, { bottom: true });
      }
    };
    const wallG = (x0, z0, x1, z1, y0, y1, gap) => {
      // a glass wall on a low white plinth, solid, with an optional door gap [a0, a1] (3 m high)
      const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
      const a0 = alongX ? x0 : z0, a1 = alongX ? x1 : z1, c = alongX ? z0 : x0;
      const parts = gap ? [[a0, gap[0]], [gap[1], a1]] : [[a0, a1]];
      for (const [p0, p1] of parts) {
        if (alongX) { sbox(world, 'prop', p0, KERB, c - 0.12, p1, KERB + 0.5, c + 0.12, 0xf6f4ee, 'wall'); pane(p0, KERB + 0.5, c - 0.04, p1, y1, c + 0.04); cbox(world, p0, KERB + 0.5, c - 0.12, p1, y1, c + 0.12, 'glass', F().SOLID | F().SHOTS | F().CAMERA); }
        else { sbox(world, 'prop', c - 0.12, KERB, p0, c + 0.12, KERB + 0.5, p1, 0xf6f4ee, 'wall'); pane(c - 0.04, KERB + 0.5, p0, c + 0.04, y1, p1); cbox(world, c - 0.12, KERB + 0.5, p0, c + 0.12, y1, p1, 'glass', F().SOLID | F().SHOTS | F().CAMERA); }
      }
      if (gap) {
        if (alongX) { pane(gap[0], KERB + 3.2, c - 0.04, gap[1], y1, c + 0.04); cbox(world, gap[0], KERB + 3.2, c - 0.12, gap[1], y1, c + 0.12, 'glass'); }
        else { pane(c - 0.04, KERB + 3.2, gap[0], c + 0.04, y1, gap[1]); cbox(world, c - 0.12, KERB + 3.2, gap[0], c + 0.12, y1, gap[1], 'glass'); }
      }
      frameV(x0, z0, x1, z1, KERB + 0.5, y1, 2.4);
    };
    const yW = KERB + Hs.hW, yC = KERB + Hs.hC;
    // Wings.
    for (const [x0, x1] of [[Hs.x0, Hs.cx0], [Hs.cx1, Hs.x1]]) {
      wallG(x0, Hs.z0, x1, Hs.z0, KERB, yW);
      wallG(x0, Hs.z1, x1, Hs.z1, KERB, yW);
      // A barrel roof: four glass facets each side of the ridge, white ribs.
      const w = (Hs.z1 - Hs.z0) / 2, mz = (Hs.z0 + Hs.z1) / 2;
      for (let k = 0; k < 8; k++) {
        const a0 = (k / 8) * PI, a1 = ((k + 1) / 8) * PI;
        const za = mz - Math.cos(a0) * w, ya = yW + Math.sin(a0) * w * 0.45;
        const zb = mz - Math.cos(a1) * w, yb = yW + Math.sin(a1) * w * 0.45;
        const len = Math.hypot(zb - za, yb - ya), roll = Math.atan2(yb - ya, zb - za);
        const m = new THREE.Matrix4().compose(new THREE.Vector3((x0 + x1) / 2, (ya + yb) / 2, (za + zb) / 2), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -roll), new THREE.Vector3(x1 - x0, 0.06, len));
        glass.merge(new THREE.BoxGeometry(1, 1, 1), m, gcol);
        for (let x = x0; x <= x1 + 1e-6; x += 2.4) K().beam(world.ctxAt(x, mz).prop, x, ya + 0.05, za, x, yb + 0.05, zb, 0.12, white);
      }
      const roofTop = yW + w * 0.45;
      cbox(world, x0, yW, Hs.z0, x1, roofTop, Hs.z1, 'glass');
      // The wing's outer end wall.
      const ex = x0 === Hs.x0 ? Hs.x0 : Hs.x1;
      wallG(ex, Hs.z0, ex, Hs.z1, KERB, yW);
      // (the gable above the end wall: glass)
      const gpts = [];
      for (let k = 0; k <= 8; k++) { const a = (k / 8) * PI; gpts.push([mz - Math.cos(a) * w, yW + Math.sin(a) * w * 0.45]); }
      for (let k = 0; k < 8; k++) glass.polygon([[ex, yW, gpts[k][0]], [ex, gpts[k][1], gpts[k][0]], [ex, gpts[k + 1][1], gpts[k + 1][0]], [ex, yW, gpts[k + 1][0]]], gcol);
    }
    // The centre: taller, doors on the main axis, a glass dome and a lantern on top.
    wallG(Hs.cx0, Hs.cz0, Hs.cx1, Hs.cz0, KERB, yC, [G.axis - 1.6, G.axis + 1.6]);
    wallG(Hs.cx0, Hs.cz1, Hs.cx1, Hs.cz1, KERB, yC, [G.axis - 1.6, G.axis + 1.6]);
    wallG(Hs.cx0, Hs.cz0, Hs.cx0, Hs.z0, KERB, yC);
    wallG(Hs.cx0, Hs.z1, Hs.cx0, Hs.cz1, KERB, yC);
    wallG(Hs.cx1, Hs.cz0, Hs.cx1, Hs.z0, KERB, yC);
    wallG(Hs.cx1, Hs.z1, Hs.cx1, Hs.cz1, KERB, yC);
    // (where the wings meet the centre, above the wings' roofs: glass)
    for (const x of [Hs.cx0, Hs.cx1]) { pane(x - 0.04, yW, Hs.z0, x + 0.04, yC, Hs.z1); cbox(world, x - 0.12, yW, Hs.z0, x + 0.12, yC, Hs.z1, 'glass'); }
    glass.box(Hs.cx0, yC - 0.05, Hs.cz0, Hs.cx1, yC + 0.05, Hs.cz1, gcol, { bottom: true });
    const dm = new THREE.SphereGeometry(Hs.dome * 0.98, 20, 8, 0, PI * 2, 0, PI / 2);
    const m4 = new THREE.Matrix4();
    glass.merge(dm, m4.makeTranslation(G.axis, yC, (Hs.cz0 + Hs.cz1) / 2), gcol);
    dm.dispose();
    const hctx = world.ctxAt(G.axis, (Hs.z0 + Hs.z1) / 2);
    for (let k = 0; k < 12; k++) {
      // the dome's white ribs
      const a = (k / 12) * PI * 2;
      let px = G.axis + Math.cos(a) * Hs.dome, py = yC, pz = (Hs.cz0 + Hs.cz1) / 2 + Math.sin(a) * Hs.dome;
      for (let i = 1; i <= 6; i++) {
        const e = (i / 6) * (PI / 2) * 0.97;
        const nx = G.axis + Math.cos(a) * Hs.dome * Math.cos(e), ny = yC + Hs.dome * Math.sin(e), nz = (Hs.cz0 + Hs.cz1) / 2 + Math.sin(a) * Hs.dome * Math.cos(e);
        K().beam(hctx.prop, px, py, pz, nx, ny, nz, 0.14, white);
        px = nx; py = ny; pz = nz;
      }
    }
    hctx.prop.cylinder(G.axis, yC + Hs.dome - 0.2, (Hs.cz0 + Hs.cz1) / 2, 1.2, 1.2, 1.4, 10, white, true);
    hctx.prop.cylinder(G.axis, yC + Hs.dome + 1.2, (Hs.cz0 + Hs.cz1) / 2, 1.3, 0.1, 1.2, 10, VH.col(0x2f6a4a), false);
    hctx.prop.box(G.axis - 0.05, yC + Hs.dome + 2.4, (Hs.cz0 + Hs.cz1) / 2 - 0.05, G.axis + 0.05, yC + Hs.dome + 3.6, (Hs.cz0 + Hs.cz1) / 2 + 0.05, VH.col(0xc9a227));
    cbox(world, Hs.cx0, yC, Hs.cz0, Hs.cx1, yC + 0.12, Hs.cz1, 'glass');
    for (let k = 0; k < 5; k++) S().disc(world, G.axis, (Hs.cz0 + Hs.cz1) / 2, Math.sqrt(Math.max(0.5, Hs.dome * Hs.dome - (k * 2 + 2) * (k * 2 + 2))), yC + k * 2, yC + k * 2 + 2, 'glass');
    // Inside: a tiled path, beds of tropical planting, tall palms under the dome, a little pool, benches, lamps.
    pave(world, Hs.x0 + 0.2, Hs.z0 + 0.2, Hs.x1 - 0.2, Hs.z1 - 0.2, 0xc9b48e, 'plazaTop', KERB + 0.035, 2);
    pave(world, G.axis - 1.6, Hs.cz0, G.axis + 1.6, Hs.cz1, 0xe8dcc0, 'plazaTop', KERB + 0.04, 2);
    pave(world, Hs.x0 + 1, (Hs.z0 + Hs.z1) / 2 - 1.3, Hs.x1 - 1, (Hs.z0 + Hs.z1) / 2 + 1.3, 0xe8dcc0, 'plazaTop', KERB + 0.04, 2);
    for (const [bx0, bz0, bx1, bz1] of [[Hs.x0 + 1.5, Hs.z0 + 1.5, Hs.cx0 - 1.5, (Hs.z0 + Hs.z1) / 2 - 2.2], [Hs.x0 + 1.5, (Hs.z0 + Hs.z1) / 2 + 2.2, Hs.cx0 - 1.5, Hs.z1 - 1.5], [Hs.cx1 + 1.5, Hs.z0 + 1.5, Hs.x1 - 1.5, (Hs.z0 + Hs.z1) / 2 - 2.2], [Hs.cx1 + 1.5, (Hs.z0 + Hs.z1) / 2 + 2.2, Hs.x1 - 1.5, Hs.z1 - 1.5]]) {
      sbox(world, 'concrete', bx0, KERB, bz0, bx1, KERB + 0.45, bz1, 0xcdbd98, 'wall');
      pave(world, bx0 + 0.2, bz0 + 0.2, bx1 - 0.2, bz1 - 0.2, 0x4a3a28, 'decal', KERB + 0.46, 1);
      const bc = world.ctxAt((bx0 + bx1) / 2, (bz0 + bz1) / 2);
      for (let x = bx0 + 1.5; x < bx1 - 1; x += 3.2) for (let z = bz0 + 1.4; z < bz1 - 1; z += 3) {
        // ferns and banana plants: clusters of green fronds (solid round their stems)
        const h = 1.2 + ((x * 7 + z * 3) % 10) / 10;
        bc.hedge.cylinder(x, KERB + 0.45, z, 0.25, 1.1, h, 7, VH.col((x + z) % 2 > 1 ? 0x3f8a3a : 0x2f6e2c), true);
        bc.hedge.cylinder(x + 0.5, KERB + 0.45 + h * 0.6, z - 0.4, 0.1, 0.8, 0.6, 5, VH.col(0x5aa040), true);
      }
      cbox(world, bx0, 0, bz0, bx1, KERB + 2.4, bz1, 'hedge', F().SOLID | F().SHOTS);
    }
    for (const [px, pz] of [[G.axis - 6, Hs.cz0 + 5], [G.axis + 6, Hs.cz0 + 5], [G.axis - 6, Hs.cz1 - 5], [G.axis + 6, Hs.cz1 - 5]]) {
      S().drum(world, hctx.concrete, px, KERB, pz, 1.4, 0.5, 10, 0xcdbd98, 'wall');
      world.addProp('palmTall', px, KERB + 0.5, pz, (px * 3) % 6, 1.15);
    }
    hctx.propMatte.cylinder(G.axis, KERB, (Hs.cz0 + Hs.cz1) / 2, 2.0, 2.0, 0.45, 16, VH.col(0xe2d4b4), true);
    hctx.screen.cylinder(G.axis, KERB + 0.3, (Hs.cz0 + Hs.cz1) / 2, 1.75, 1.75, 0.1, 16, VH.col(0x2a8a9a, 0.6), true);
    S().disc(world, G.axis, (Hs.cz0 + Hs.cz1) / 2, 2.02, 0, KERB + 0.45, 'fountain');
    for (const x of [Hs.x0 + 4, Hs.x0 + 12, Hs.x1 - 4, Hs.x1 - 12]) glow(world, x - 0.3, yW - 0.4, (Hs.z0 + Hs.z1) / 2 - 0.3, x + 0.3, yW - 0.2, (Hs.z0 + Hs.z1) / 2 + 0.3, 0xffe8b8, 1.8);
    for (const [lx, lz] of [[G.axis - 8, (Hs.cz0 + Hs.cz1) / 2], [G.axis + 8, (Hs.cz0 + Hs.cz1) / 2]]) glow(world, lx - 0.3, yC - 0.6, lz - 0.3, lx + 0.3, yC - 0.35, lz + 0.3, 0xffe8b8, 1.8);
    // The glass, all of it, as one transparent mesh.
    const gGeo = glass.build();
    const gMat = new THREE.MeshStandardMaterial({ color: 0xcfe9ee, transparent: true, opacity: 0.26, roughness: 0.08, metalness: 0.1, depthWrite: false, side: THREE.DoubleSide });
    const gMesh = new THREE.Mesh(gGeo, gMat);
    gMesh.name = 'palm house glass';
    gMesh.renderOrder = 2;
    world.scene.add(gMesh);

    // --- the lily pond on the crossing: a stone rim, dark water, lily pads, a jet in the middle
    const pctx = world.ctxAt(Pd.x, Pd.z);
    const rimC = VH.col(0xe2d4b4);
    pctx.propMatte.cylinder(Pd.x, KERB, Pd.z, Pd.r + 0.4, Pd.r + 0.4, 0.5, 28, rimC, true);
    pctx.screen.cylinder(Pd.x, KERB + 0.42, Pd.z, Pd.r - 0.1, Pd.r - 0.1, 0.1, 28, VH.col(0x24606a, 0.55), true);
    for (let k = 0; k < 16; k++) {
      const a = k * 2.4, rr = 2.2 + (k * 1.7) % (Pd.r - 3);
      const lx = Pd.x + Math.cos(a) * rr, lz = Pd.z + Math.sin(a) * rr;
      pctx.hedge.cylinder(lx, KERB + 0.53, lz, 0.55, 0.55, 0.03, 8, VH.col(0x4f9a3a), true);
      if (k % 3 === 0) pctx.hedge.cylinder(lx + 0.15, KERB + 0.56, lz, 0.12, 0.05, 0.12, 5, VH.col(0xf6c8d8), true);
    }
    pctx.propMatte.cylinder(Pd.x, KERB + 0.5, Pd.z, 0.6, 0.45, 1.3, 10, rimC, true);
    world.fountains = world.fountains || [];
    world.fountains.push({ x: Pd.x, y: KERB + 0.5, z: Pd.z, r: Pd.r - 0.5 });
    S().disc(world, Pd.x, Pd.z, Pd.r + 0.42, 0, KERB + 0.5, 'fountain');
    world.physics.addBox(Pd.x - 0.6, 0, Pd.z - 0.6, Pd.x + 0.6, KERB + 1.8, Pd.z + 0.6, 'fountain');
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * PI * 2 + PI / 8;
      world.addProp('bench', Pd.x + Math.cos(a) * 12.4, KERB, Pd.z + Math.sin(a) * 12.4, -a - PI / 2, 1);
    }

    // --- the hedged rooms: four quarters of clipped yew rooms off the gravel walks, beds of flowers in them
    const flowers = [[0xe8483a, 0xf0d050], [0xe86ab0, 0xffffff], [0x8a5aa0, 0xf0a030], [0xf0d050, 0x3d6b8f]];
    const quarters = [
      [G.x0 + 3, -418, G.axis - 6, G.cross - 6], [G.axis + 6, -418, G.x1 - 3, G.cross - 6],
      [G.x0 + 3, G.cross + 6, G.axis - 6, G.z1 - 3], [G.axis + 6, G.cross + 6, G.x1 - 3, G.z1 - 3],
    ];
    let ri = 0;
    for (const [qx0, qz0, qx1, qz1] of quarters) {
      const nx = Math.max(1, Math.floor((qx1 - qx0 + 3) / 17)), nz = Math.max(1, Math.floor((qz1 - qz0 + 3) / 17));
      const rw = (qx1 - qx0 - 3 * (nx - 1)) / nx, rd = (qz1 - qz0 - 3 * (nz - 1)) / nz;
      for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
        const x0 = qx0 + i * (rw + 3), x1 = x0 + rw, z0 = qz0 + j * (rd + 3), z1 = z0 + rd;
        // Skip rooms that would sit on the pond's gravel ring.
        if (x1 > Pd.x - 15 && x0 < Pd.x + 15 && z1 > Pd.z - 15 && z0 < Pd.z + 15) continue;
        const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2, t = 0.9, gw = 1.4;
        hedge(world, x0, z0, mx - gw, z0 + t, 1.5);
        hedge(world, mx + gw, z0, x1, z0 + t, 1.5);
        hedge(world, x0, z1 - t, mx - gw, z1, 1.5);
        hedge(world, mx + gw, z1 - t, x1, z1, 1.5);
        hedge(world, x0, z0 + t, x0 + t, z1 - t, 1.5);
        hedge(world, x1 - t, z0 + t, x1, z1 - t, 1.5);
        const fl = flowers[ri++ % flowers.length];
        const bctx = world.ctxAt(mx, mz);
        if (ri % 4 === 0) {
          world.addProp('treeB', mx, KERB, mz, ri % 6, 1.0);
          world.addProp('bench', mx, KERB, z0 + 2.2, 0, 1);
        } else {
          // Four low beds round a sundial-like urn.
          for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
            const bx0 = mx + sx * 1.6 - (sx < 0 ? rw / 2 - 3.4 : 0), bx1 = mx + sx * 1.6 + (sx > 0 ? rw / 2 - 3.4 : 0);
            const bz0 = mz + sz * 1.6 - (sz < 0 ? rd / 2 - 3.4 : 0), bz1 = mz + sz * 1.6 + (sz > 0 ? rd / 2 - 3.4 : 0);
            const lo = Math.min(bx0, bx1), hi = Math.max(bx0, bx1), lz = Math.min(bz0, bz1), hz = Math.max(bz0, bz1);
            if (hi - lo < 1 || hz - lz < 1) continue;
            bctx.hedge.box(lo, KERB, lz, hi, KERB + 0.35, hz, VH.col(0x3f7a34));
            for (let x = lo + 0.4; x < hi - 0.3; x += 0.8) for (let z = lz + 0.4; z < hz - 0.3; z += 0.8) bctx.hedge.box(x - 0.22, KERB + 0.35, z - 0.22, x + 0.22, KERB + 0.55, z + 0.22, VH.col(fl[Math.round(x + z) % 2]));
            cbox(world, lo, 0, lz, hi, KERB + 0.55, hz, 'hedge', F().SOLID | F().SHOTS);
          }
          S().drum(world, bctx.concrete, mx, KERB, mz, 0.45, 1.0, 8, 0xe2d4b4, 'wall');
        }
      }
    }
    // Trees along the railings, palms along the main walk, lamps on the walks.
    for (let x = G.x0 + 8; x < G.x1 - 4; x += 12) {
      if (Math.abs(x - G.axis) < 8) continue;
      world.addProp('tree', x, KERB, G.z1 + 1.8, (x * 3) % 6, 1.1);
      if (x < Hs.x0 - 6 || x > Hs.x1 + 6) world.addProp('treeB', x, KERB, G.z0 + 2.2, (x * 7) % 6, 1.1);
    }
    for (let z = G.z0 + 10; z < G.z1 - 4; z += 12) {
      if (Math.abs(z - G.cross) < 8) continue;
      world.addProp('tree', G.x0 + 1.8, KERB, z, (z * 3) % 6, 1.05);
      world.addProp('tree', G.x1 - 1.8, KERB, z, (z * 5) % 6, 1.05);
    }
    for (let z = -418; z < G.z1 - 3; z += 10) {
      if (Math.abs(z - Pd.z) < 16) continue;
      for (const x of [G.axis - 5.2, G.axis + 5.2]) world.addProp('palmTall', x, KERB, z, (z * 7) % 6, 0.9);
    }
    for (let x = G.x0 + 10; x < G.x1 - 6; x += 16) {
      if (Math.abs(x - G.axis) < 18) continue;
      world.addProp('streetlight', x, KERB, G.cross - 4.6, 0, 0.7);
    }
    return { westGate: { x: G.x0 + 8, z: G.cross }, house: { x: G.axis, z: Hs.cz1 + 4 } };
  }

  /** A parked car drawn into the chunk (body, cabin, wheels), solid. */
  function parkedCar(world, x, z, yaw, hex) {
    const ctx = world.ctxAt(x, z);
    const body = VH.col(hex);
    S().obox(world, ctx.prop, x, z, 1.0, 2.4, yaw, KERB + 0.3, KERB + 1.0, hex, 'metal');
    ctx.prop.orientedBox(x, z + 0.2, 0.9, 1.2, yaw, KERB + 1.0, KERB + 1.55, VH.col(0x2a3a4a));
    ctx.prop.orientedBox(x, z + 0.2, 0.82, 1.1, yaw, KERB + 1.55, KERB + 1.62, body);
    cbox(world, x - 0.9, KERB + 1.0, z - 1.0, x + 0.9, KERB + 1.62, z + 1.4, 'metal');
    for (const [wx, wz] of [[-0.95, -1.5], [0.95, -1.5], [-0.95, 1.5], [0.95, 1.5]]) ctx.prop.box(x + wx - 0.12, KERB, z + wz - 0.35, x + wx + 0.12, KERB + 0.62, z + wz + 0.35, VH.col(0x1a1a1a));
    cbox(world, x - 1.08, 0, z - 1.86, x + 1.08, KERB + 0.62, z + 1.86, 'metal');
  }

  // -------------------------------------------------------------- the map
  if (VH.MapPainters) {
    VH.MapPainters.push((g, layout, o) => {
      const p = layout.plots;
      if (!p || !p.paloma_estate || !VH.Districts.owner('paloma_estate')) return;
      const R = o.R;
      const E = EST, W = E.wall, H = E.house;
      g.fillStyle = '#86b46e';
      R(W.x0, W.z0, W.x1, W.z1);
      g.fillStyle = '#e6dcc4';
      R(E.gate.x - 5, W.z0, E.gate.x + 5, H.z0 - 14);
      R(852, H.z0 - 30, 928, H.z0);
      g.fillStyle = '#c9744e';
      R(H.x0, H.z0, H.x1, H.z1);
      g.fillStyle = '#e2d4b4';
      R(E.terrS.x0, E.terrS.z0, E.terrS.x1, E.terrS.z1);
      R(E.terrE.x0, E.terrE.z0, E.terrE.x1, E.terrE.z1);
      g.fillStyle = '#4cc4d4';
      R(E.pool.x0, E.pool.z0, E.pool.x1, E.pool.z1);
      g.fillStyle = '#f2ead8';
      R(W.x0, W.z0, W.x1, W.z0 + 0.8);
      R(W.x0, W.z1 - 0.8, W.x1, W.z1);
      R(W.x0, W.z0, W.x0 + 0.8, W.z1);
      R(W.x1 - 0.8, W.z0, W.x1, W.z1);
    });
  }

  // -------------------------------------------------------------- register
  VH.Districts.register({
    id: D,
    name: 'Paloma Heights',
    plots: ['paloma_estate', 'paloma_observatory', 'paloma_gardens'],
    build(world, layout) {
      const t0 = performance.now();
      if (!layout.plots || !layout.plots.paloma_estate || !VH.WNKit || !VH.SouthKit) return;
      S().withUndersides(() => {
        const estate = buildEstate(world);
        const observatory = buildObservatory(world);
        const clinic = buildClinic(world);
        const gardens = buildGardens(world);
        world.palomaHeights = { estate, observatory, clinic, gardens };
      });
      this.buildMs = Math.round(performance.now() - t0);
    },
    registerPlaces(world, places) {
      const ph = world.palomaHeights;
      if (!ph) return;
      const add = (id, p) => {
        const def = places.defs && places.defs[id];
        places.add(id, Object.assign({ district: D, desc: def && def.desc }, p));
      };
      const es = ph.estate;
      // The landmark, on the forecourt by the fountain.
      add('paloma_estate', { name: 'Villa Castellane', x: EST.fountain.x + 8, z: EST.fountain.z, yaw: PI, kind: 'mansion', landmark: true });
      // The story's spots (docs/DLC_BIBLE.md 6.2, js/data/dlc.js), exactly where their descriptions say.
      add('estate_study', { name: "Leo Castellane's study, the east terrace", x: es.study.x, z: es.study.z, y: es.study.y, yaw: -PI / 2, kind: 'mansion' });
      add('estate_garden', { name: 'The back lawn, Villa Castellane', x: es.garden.x, z: es.garden.z, yaw: PI, kind: 'mansion' });
      add('estate_gate', { name: 'The gates of Villa Castellane', x: es.gate.x, z: es.gate.z, yaw: PI, kind: 'street' });
      // The observatory: on the terrace round the dome (a parachutist lands on the dome and steps down to it).
      const ob = ph.observatory, cl = ph.clinic;
      add('paloma_observatory', { name: 'Paloma Observatory, the dome terrace', x: ob.terrace.x, z: ob.terrace.z, y: ob.yTop, yaw: 0, kind: 'overlook', landmark: true });
      add('observatory_lawn', { name: 'The observatory lawn', x: (LAWN.x0 + LAWN.x1) / 2, z: (LAWN.z0 + LAWN.z1) / 2, yaw: 0, kind: 'park' });
      add('paloma_clinic', { name: 'The Paloma Clinic', x: cl.front.x, z: cl.front.z, yaw: PI, kind: 'hospital_front' });
      add('clinic_helipad', { name: 'The Paloma Clinic helipad', x: cl.pad.x, z: cl.pad.z, y: cl.yH, yaw: 0, kind: 'rooftop', roof: true });
      // The gardens: inside the west gate on the cross walk (Paloma Way and the estate's garden gate opposite).
      const gd = ph.gardens;
      add('paloma_gardens', { name: 'Paloma Botanical Gardens', x: gd.westGate.x, z: gd.westGate.z, yaw: -PI / 2, kind: 'park', landmark: true });
      const extra = places.extra[D];
      if (extra) {
        extra.push(
          { x: gd.house.x, z: gd.house.z, yaw: PI, kinds: ['park', 'storefront'], name: 'The palm house' },
          { x: GDN.pond.x + 12.5, z: GDN.pond.z, yaw: -PI / 2, kinds: ['park', 'plaza'], name: 'The lily pond' },
          { x: OBS.x - 14, z: OBS.z + 14, yaw: 0, kinds: ['park', 'overlook'], name: 'The observatory forecourt' },
        );
        extra.push(
          { x: EST.gate.x, z: EST.house.z0 - 9, yaw: PI, kinds: ['mansion', 'parking'], name: 'The forecourt, Villa Castellane' },
          { x: EST.pool.x0 - 3, z: EST.pool.z1 + 5, yaw: PI, kinds: ['mansion', 'park'], name: 'The pool, Villa Castellane' },
        );
      }
    },
  });
})();
