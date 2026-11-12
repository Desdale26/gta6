/*
 * districts/sunreel.js — Sunreel Studios, the film lot west of the city,
 * south of Meridian West (VICEHAVEN 3.0).
 *
 *   sunreel_gate         the studio gate on Westgate Parkway (an arch, a
 *                        guard hut and barrier), the studio street through
 *                        to Premiere Avenue, four sound stages (Stage 9's
 *                        big doors open on the film's base camp: a catering
 *                        truck, trailers, chairs), the admin block and the
 *                        Sunreel water tower
 *   sunreel_backlot      the fake big-city street set you can drive
 *                        through from Studio Road to Klieg Street: fronts
 *                        with plywood and scaffolding behind, Miller's Fine
 *                        Hats (a sugar-glass window, a ramp aimed at it), a
 *                        fake bank with a breakaway window, a fake subway
 *                        entrance with a ramp over its railings, a cross
 *                        street with the camera crane and Chet's chair; the
 *                        prop yard behind the west fronts
 *   sunreel_western_set  a frontier street (saloon, sheriff's office with a
 *                        stair to its roof and a weathervane, general store,
 *                        bank, hotel, livery, church), boardwalks, wagons,
 *                        cacti; drivable end to end
 *
 * Static parts are merged into the chunk builders (VH.WNKit).
 */
(function () {
  'use strict';

  const VH = window.VH;
  const K = () => VH.WNKit;
  const KERB = 0.15;
  const F = () => VH.COLLIDE;
  const D = 'sunreel';

  // ---------------------------------------------------------------- plan
  const GATE = {
    x0: -843, x1: -647, z0: 207, z1: 433,
    street: { z0: 313, z1: 327 },
    stages: [
      { n: '6', x0: -830, x1: -786, z0: 216, z1: 300, door: 's' },
      { n: '7', x0: -774, x1: -730, z0: 216, z1: 300, door: 's' },
      { n: '8', x0: -836, x1: -792, z0: 348, z1: 425, door: 'n' },
      { n: '9', x0: -780, x1: -724, z0: 348, z1: 425, door: 'n', open: { x0: -762, x1: -742, h: 11 } },
    ],
    stageH: 16,
    admin: { x0: -716, x1: -664, z0: 222, z1: 292, h: 13 },
    tower: { x: -684, z: 398 },
    catering: { x: -706, z: 338 },
  };
  const LOT = {
    x0: -1043, x1: -857, z0: 207, z1: 433,
    st: { x0: -957, x1: -943 }, // the city street (north-south)
    xw: -963, xe: -937, // the fronts' faces
    cross: { z0: 313, z1: 327 }, // the cross street to Premiere Avenue
    plazaZ: 360, xePlaza: -928, // south of here the east pavement widens
    subway: { x0: -941, x1: -933, z0: 396, z1: 412 },
    miller: { z0: 311, z1: 329 },
    bank: { z0: 262, z1: 292, win: [271, 283] },
    yard: { x0: -1040, x1: -972, z0: 212, z1: 430 },
    crane: { x: -904, z: 333 },
    mark: { x: -900, z: 320 },
  };
  const WEST = {
    x0: -1043, x1: -857, z0: 447, z1: 651,
    st: { z0: 543, z1: 557 },
    app: { x0: -957, x1: -943 }, // the approach from Southbay Road
    nFront: 535, sFront: 565, porch: 3.2,
    sheriff: { x0: -935, x1: -921, z0: 518, h: 4.5 },
  };

  const plank = 0x8b6a45;

  // --------------------------------------------------------------- pieces
  /** A plain wall run (studio perimeter), split on the chunk grid, with gaps. */
  function wallRun(world, x0, z0, x1, z1, gaps, h, hex) {
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
      for (let p = s0; p < s1 - 1e-6; p += 60) {
        const q = Math.min(s1, p + 60);
        const ctx = alongX ? world.ctxAt((p + q) / 2, c) : world.ctxAt(c, (p + q) / 2);
        const B = alongX ? [p, 0, c - 0.25, q, KERB + h, c + 0.25] : [c - 0.25, 0, p, c + 0.25, KERB + h, q];
        ctx.concrete.box(B[0], B[1], B[2], B[3], B[4], B[5], VH.col(hex || 0xe6dccb));
        ctx.prop.box(B[0] - 0.08, B[4], B[2] - 0.08, B[3] + 0.08, B[4] + 0.2, B[5] + 0.08, VH.col(0xb8ae9c));
        world.physics.addBox(B[0], B[1], B[2], B[3], B[4] + 0.2, B[5], 'wall');
      }
    }
  }

  /**
   * A fake front on the city set: a facade on the street side, plywood and
   * scaffolding behind, a shopfront at street level. side 'w' (west of the
   * street, facing east) or 'e'. holes: [[z0, z1]] where the ground floor
   * is sugar glass (no collider).
   */
  function front(world, side, x, z0, z1, h, o) {
    o = o || {};
    const ctx = world.ctxAt(x, (z0 + z1) / 2);
    const s = side === 'w' ? 1 : -1; // +1: faces east
    const len = z1 - z0;
    const wall = VH.col(o.wall || 0xb8604a);
    const gf = 4.6;
    // Upper floors with windows.
    const start = s > 0 ? [x, KERB + gf, z1] : [x, KERB + gf, z0];
    const bays = Math.max(1, Math.round(len / (o.bay || 3.6)));
    ctx.b.wall(start, 0, -s, len, h - gf, wall, null, [0, bays, 0, (h - gf) / 3.4], [o.ww || 0.5, o.wh || 0.6, o.style === undefined ? 1 : o.style, o.seed || 0.41]);
    // Cornice.
    ctx.prop.box(Math.min(x, x + s * 0.6), KERB + h - 0.5, z0, Math.max(x, x + s * 0.6), KERB + h, z1, VH.colMul(wall, 0.8));
    // Ground floor: pilasters, a fascia, glass, an awning.
    const fas = VH.col(o.fascia || 0x2b3b4a);
    ctx.prop.box(Math.min(x, x + s * 0.3), KERB + gf - 1.0, z0, Math.max(x, x + s * 0.3), KERB + gf, z1, fas);
    ctx.prop.box(Math.min(x, x - s * 0.1), KERB, z0, Math.max(x, x - s * 0.1), KERB + gf - 1.0, z1, VH.col(o.glass || 0x26313c));
    for (let z = z0; z <= z1 + 1e-6; z += len / Math.max(1, Math.round(len / 5))) ctx.prop.box(Math.min(x, x + s * 0.35) - 0.0, KERB, z - 0.3, Math.max(x, x + s * 0.35), KERB + gf - 1.0, z + 0.3, VH.colMul(wall, 0.9));
    if (o.awning) for (let z = z0 + 0.5, k = 0; z < z1 - 0.5; z += 1.0, k++) K().tiltBox(ctx.prop, x + s * 1.1, KERB + gf - 1.3, z + 0.5, 2.2, 0.08, 1.0, Math.PI / 2, s * 0.3, k % 2 ? 0xf4efe2 : o.awning);
    // Warm light in the shop after dark.
    if (o.lit) ctx.screen.box(Math.min(x - s * 0.15, x - s * 0.12), KERB + 0.6, z0 + 1, Math.max(x - s * 0.15, x - s * 0.12), KERB + gf - 1.3, z1 - 1, VH.col(o.lit, 0.55));
    // Plywood behind and the scaffold that holds it up.
    const back = x - s * 0.4;
    ctx.wood.box(Math.min(back, back - s * 0.1), KERB, z0, Math.max(back, back - s * 0.1), KERB + h, z1, VH.col(0xc8b48a));
    const steel = VH.col(0x6e747a);
    for (let z = z0 + 1; z < z1; z += 6) {
      K().beam(ctx.prop, back, KERB + h - 1, z, back - s * 4.5, KERB, z, 0.18, steel);
      K().beam(ctx.prop, back, KERB + h * 0.45, z, back - s * 4.5, KERB, z, 0.14, steel);
      ctx.concrete.box(Math.min(back - s * 4.5, back - s * 5.3), 0, z - 0.4, Math.max(back - s * 4.5, back - s * 5.3), KERB + 0.4, z + 0.4, VH.col(0xa8a49a));
    }
    // Colliders: the whole front, minus the sugar-glass holes on the ground floor.
    const cx0 = Math.min(x, back - s * 0.1), cx1 = Math.max(x, back - s * 0.1);
    world.physics.addBox(cx0, KERB + gf, z0, cx1, KERB + h, z1, 'building');
    let cur = z0;
    for (const [a, b] of (o.holes || []).slice().sort((p, q) => p[0] - q[0])) {
      if (a > cur) world.physics.addBox(cx0, 0, cur, cx1, KERB + gf, a, 'building');
      cur = Math.max(cur, b);
    }
    if (cur < z1) world.physics.addBox(cx0, 0, cur, cx1, KERB + gf, z1, 'building');
    return ctx;
  }

  /** A sound stage: a tall blank box, a band, a huge door, a number. */
  function stage(world, st) {
    const W = K();
    const H = GATE.stageH;
    const cream = 0xe9e1cf;
    const ctx = world.ctxAt((st.x0 + st.x1) / 2, (st.z0 + st.z1) / 2);
    const doorZ = st.door === 'n' ? st.z0 : st.z1;
    const ds = st.door === 'n' ? -1 : 1;
    if (!st.open) {
      W.building(world, st.x0, st.z0, st.x1, st.z1, H, { wall: cream, roof: 0x9a958c, style: 0, parapet: 0.6 });
    } else {
      // Stage 9: walls drawn by hand round an open door, lined inside.
      W.building(world, st.x0, st.z0, st.x1, st.z1, H, { wall: cream, roof: 0x9a958c, style: 0, parapet: 0.6, sides: { n: 'skip' }, solid: false });
      const o = st.open;
      const body = VH.col(cream);
      ctx.b.box(st.x0, KERB, st.z0, o.x0, KERB + H, st.z0 + 0.4, body);
      ctx.b.box(o.x1, KERB, st.z0, st.x1, KERB + H, st.z0 + 0.4, body);
      ctx.b.box(o.x0, KERB + o.h, st.z0, o.x1, KERB + H, st.z0 + 0.4, body);
      const lin = VH.col(0x2a2d33);
      ctx.prop.box(st.x0 + 0.4, KERB, st.z0 + 0.4, st.x0 + 0.5, KERB + H, st.z1 - 0.4, lin);
      ctx.prop.box(st.x1 - 0.5, KERB, st.z0 + 0.4, st.x1 - 0.4, KERB + H, st.z1 - 0.4, lin);
      ctx.prop.box(st.x0 + 0.4, KERB, st.z1 - 0.5, st.x1 - 0.4, KERB + H, st.z1 - 0.4, lin);
      ctx.prop.box(st.x0 + 0.4, KERB + H - 0.3, st.z0 + 0.4, st.x1 - 0.4, KERB + H - 0.2, st.z1 - 0.4, lin, { bottom: true });
      ctx.prop.box(st.x0 + 0.5, KERB, st.z0 + 0.5, o.x0, KERB + H - 0.3, st.z0 + 0.6, lin);
      ctx.prop.box(o.x1, KERB, st.z0 + 0.5, st.x1 - 0.5, KERB + H - 0.3, st.z0 + 0.6, lin);
      ctx.prop.topRect(st.x0 + 0.5, st.z0 + 0.4, st.x1 - 0.5, st.z1 - 0.5, KERB + 0.02, VH.col(0x4a4c50));
      world.physics.addBox(st.x0, 0, st.z0, st.x0 + 0.5, KERB + H, st.z1, 'building');
      world.physics.addBox(st.x1 - 0.5, 0, st.z0, st.x1, KERB + H, st.z1, 'building');
      world.physics.addBox(st.x0, 0, st.z1 - 0.5, st.x1, KERB + H, st.z1, 'building');
      world.physics.addBox(st.x0, 0, st.z0, o.x0, KERB + H, st.z0 + 0.6, 'building');
      world.physics.addBox(o.x1, 0, st.z0, st.x1, KERB + H, st.z0 + 0.6, 'building');
      world.physics.addBox(o.x0, KERB + o.h, st.z0, o.x1, KERB + H, st.z0 + 0.6, 'building');
      world.physics.addBox(st.x0, KERB + H - 0.3, st.z0, st.x1, KERB + H + 0.6, st.z1, 'building');
      // The doors themselves, slid aside.
      ctx.prop.box(o.x0 - 10, KERB, st.z0 - 0.5, o.x0, KERB + o.h, st.z0 - 0.1, VH.col(0x8f969c));
      ctx.prop.box(o.x1, KERB, st.z0 - 0.5, o.x1 + 10, KERB + o.h, st.z0 - 0.1, VH.col(0x8f969c));
      world.physics.addBox(o.x0 - 10, 0, st.z0 - 0.5, o.x0, KERB + o.h, st.z0 - 0.1, 'metal');
      world.physics.addBox(o.x1, 0, st.z0 - 0.5, o.x1 + 10, KERB + o.h, st.z0 - 0.1, 'metal');
      // Inside: a lighting grid, lamps on stands, a half-built set (a diner booth).
      for (let x = st.x0 + 6; x < st.x1 - 4; x += 8) for (let z = st.z0 + 8; z < st.z1 - 4; z += 10) ctx.screen.box(x - 0.4, KERB + H - 1.4, z - 0.4, x + 0.4, KERB + H - 1.0, z + 0.4, VH.col(0xfff4dc, 1.6));
      const sx = (st.x0 + st.x1) / 2, sz = st.z0 + 40;
      ctx.wood.box(sx - 10, KERB, sz, sx + 10, KERB + 0.5, sz + 14, VH.col(0x9a7650));
      ctx.b.box(sx - 10, KERB + 0.5, sz + 13.6, sx + 10, KERB + 6, sz + 14, VH.col(0x7ab0a0));
      ctx.prop.box(sx - 6, KERB + 0.5, sz + 6, sx + 6, KERB + 1.6, sz + 8, VH.col(0xc8302c));
      world.physics.addBox(sx - 10, 0, sz, sx + 10, KERB + 0.5, sz + 14, 'plank', F().SOLID);
      for (const [lx, lz] of [[sx - 13, sz - 4], [sx + 13, sz - 4], [sx, sz - 9]]) {
        ctx.prop.box(lx - 0.05, KERB, lz - 0.05, lx + 0.05, KERB + 3.2, lz + 0.05, VH.col(0x2b2f35));
        ctx.screen.box(lx - 0.5, KERB + 3.0, lz - 0.4, lx + 0.5, KERB + 3.8, lz + 0.4, VH.col(0xfff8e8, 2));
      }
    }
    // A painted band and the big number by the door; a red light over the door.
    ctx.prop.box(st.x0 - 0.05, KERB + H - 2.2, st.z0 - 0.05, st.x1 + 0.05, KERB + H - 1.6, st.z1 + 0.05, VH.col(0x3a6f9a));
    const nx = st.x1 - 6;
    W.sign(world, { x: nx, y: KERB + H - 5, z: doorZ + ds * 0.08, yaw: ds > 0 ? 0 : Math.PI, w: 6, h: 6, lines: [st.n], style: 'monolith', oneSided: true, colors: { bg: ['#3a6f9a', '#2f5f86'], fg: '#ffffff' } });
    ctx.screen.box(nx - 0.3, KERB + 12.2, doorZ + ds * 0.05, nx + 0.3, KERB + 12.6, doorZ + ds * 0.3, VH.col(0xff3a2a, 2.4));
    if (!st.open) {
      const dx0 = st.x0 + 8, dx1 = st.x0 + 26;
      ctx.prop.box(dx0, KERB, Math.min(doorZ, doorZ + ds * 0.3), dx1, KERB + 11, Math.max(doorZ, doorZ + ds * 0.3), VH.col(0x8f969c));
      for (let x = dx0 + 2; x < dx1; x += 2) ctx.prop.box(x, KERB, Math.min(doorZ, doorZ + ds * 0.36), x + 0.15, KERB + 11, Math.max(doorZ, doorZ + ds * 0.36), VH.col(0x7d838a));
      // A person door and its lamp.
      ctx.prop.box(st.x1 - 14, KERB, Math.min(doorZ, doorZ + ds * 0.1), st.x1 - 12.8, KERB + 2.2, Math.max(doorZ, doorZ + ds * 0.1), VH.col(0x3a6f9a));
      W.lamp(world, st.x1 - 13.4, doorZ + ds * 0.3, 0xfff1c8, 2.2, 0.2, KERB + 2.6);
    }
  }

  // ------------------------------------------------------- the main lot
  function buildGate(world) {
    const W = K();
    const G = GATE;
    const S = G.street;
    W.pave(world, G.x0, G.z0, G.x1, G.z1, 0xd0ccc2, 'plazaTop');
    W.pave(world, G.x0, S.z0, G.x1, S.z1, 0xbcbcbc);
    W.mark(world, G.x0 + 2, (S.z0 + S.z1) / 2 - 0.08, G.x1 - 30, (S.z0 + S.z1) / 2 + 0.08, 0xf2d34a);
    // Lanes to the stages and the car park.
    W.pave(world, -784, S.z1, -726, 348, 0xbcbcbc, 'asphaltTop', KERB + 0.016);
    W.pave(world, -716, S.z1, G.x1 - 4, G.z1 - 4, 0xbcbcbc, 'asphaltTop', KERB + 0.016);
    for (let z = 344; z < 428; z += 3) W.mark(world, -716 + 0.5, z - 0.06, -706, z + 0.06);
    // The perimeter wall, gates at both ends of the studio street.
    wallRun(world, G.x0 + 1, G.z0 + 1, G.x1 - 1, G.z0 + 1, [], 3);
    wallRun(world, G.x0 + 1, G.z1 - 1, G.x1 - 1, G.z1 - 1, [], 3);
    wallRun(world, G.x1 - 1, G.z0 + 1, G.x1 - 1, G.z1 - 1, [[S.z0 - 2, S.z1 + 2]], 3);
    wallRun(world, G.x0 + 1, G.z0 + 1, G.x0 + 1, G.z1 - 1, [[S.z0 - 1, S.z1 + 1]], 3);
    for (const st of G.stages) stage(world, st);
    // Admin block: three floors of offices, glass, a canopy.
    {
      const A = G.admin;
      const ctx = W.building(world, A.x0, A.z0, A.x1, A.z1, A.h, { wall: 0xe8dcc0, roof: 0x8d8a84, style: 3, ww: 0.7, wh: 0.5, bay: 3.2, floorH: 4.2 });
      ctx.prop.box(A.x0 + 10, KERB + 3.6, A.z1, A.x1 - 10, KERB + 3.9, A.z1 + 4, VH.col(0x3a6f9a), { bottom: true });
      for (const x of [A.x0 + 11, A.x1 - 11]) ctx.prop.box(x - 0.1, KERB, A.z1 + 3.8, x + 0.1, KERB + 3.6, A.z1 + 4, VH.col(0xd8dde2));
      for (let x = A.x0 + 6; x < A.x1 - 4; x += 8) world.addProp('palm', x, KERB, A.z1 + 9, 0, 1);
    }
    // The gate: two pylons, an arch with the studio's name, a guard hut, barriers.
    {
      const gx = G.x1 - 6;
      const ctx = world.ctxAt(gx, (S.z0 + S.z1) / 2);
      for (const z of [S.z0 - 2.5, S.z1 + 2.5]) W.solid(world, ctx.b, gx - 1.5, KERB, z - 1.5, gx + 1.5, KERB + 10, z + 1.5, 0xe9c46a, null, 'wall');
      ctx.b.box(gx - 1.2, KERB + 8, S.z0 - 4, gx + 1.2, KERB + 10.6, S.z1 + 4, VH.col(0xe9c46a), { bottom: true });
      W.sign(world, { x: gx + 1.6, y: KERB + 9.3, z: (S.z0 + S.z1) / 2, yaw: Math.PI / 2, w: 14.5, h: 2.2, lines: ['SUNREEL STUDIOS'], style: 'neon', oneSided: true, colors: { bg: ['#1d2a44', '#2b3a5a'], fg: '#ffd56a', glow: '#ffb02a', outline: '#ffd56a' } });
      // Guard hut in the middle (in and out lanes either side).
      const hz = (S.z0 + S.z1) / 2;
      ctx.concrete.box(gx - 12, KERB, hz - 1.2, gx + 3, KERB + 0.25, hz + 1.2, VH.col(0xe8e2d4));
      W.solid(world, ctx.b, gx - 9, KERB + 0.25, hz - 1.0, gx - 5, KERB + 3.0, hz + 1.0, 0xf2ead8, null, 'building');
      ctx.screen.box(gx - 9.05, KERB + 1.3, hz - 0.9, gx - 4.95, KERB + 2.4, hz + 0.9, VH.col(0xfff0c8, 0.6));
      ctx.prop.box(gx - 9.5, KERB + 3.0, hz - 1.5, gx - 4.5, KERB + 3.3, hz + 1.5, VH.col(0x1d2a44));
      world.physics.addBox(gx - 12, 0, hz - 1.2, gx + 3, KERB + 0.25, hz + 1.2, 'kerb', F().SOLID);
      ctx.prop.box(gx - 4.5, KERB + 1.0, hz + 1.2, gx - 4.2, KERB + 1.12, S.z1, VH.col(0xf4f4ef));
      ctx.prop.box(gx - 4.5, KERB + 1.0, S.z0, gx - 4.2, KERB + 1.12, hz - 1.2, VH.col(0xf4f4ef));
      for (const z of [S.z0 - 6, S.z1 + 6]) world.addProp('streetlight', gx + 2, KERB, z, -Math.PI / 2, 1);
    }
    // The water tower with the studio's name.
    {
      const T = G.tower;
      W.waterTower(world, T.x, T.z, { h: 24, r: 6, th: 9, tank: 0xb8cfe0, cap: 0x8fa8bc, leg: 0x6e7a86 });
      W.sign(world, { x: T.x + 6.05, y: 24 + 4.5, z: T.z, yaw: Math.PI / 2, w: 9, h: 2.4, lines: ['SUNREEL'], style: 'info', oneSided: true, frame: 0xb8cfe0, colors: { bg: ['#b8cfe0', '#b8cfe0'], fg: '#1d2a44', bar: '#b8cfe0' } });
    }
    // Stage 9's base camp: the catering truck, two trailers, chairs, light stands.
    {
      const C = GATE.catering;
      const ctx = world.ctxAt(C.x, C.z);
      W.solid(world, ctx.prop, C.x - 5, KERB + 0.8, C.z - 1.3, C.x + 2, KERB + 3.8, C.z + 1.3, 0xf4f4ef, { bottom: true }, 'metal');
      W.solid(world, ctx.prop, C.x + 2, KERB + 0.6, C.z - 1.2, C.x + 4.4, KERB + 3.0, C.z + 1.2, 0xd9772b, null, 'metal');
      ctx.prop.box(C.x + 4.4, KERB + 1.8, C.z - 1.0, C.x + 4.45, KERB + 2.7, C.z + 1.0, VH.col(0x26323e));
      ctx.screen.box(C.x - 4, KERB + 2.0, C.z - 1.35, C.x + 1, KERB + 3.2, C.z - 1.3, VH.col(0xfff0c8, 0.9));
      ctx.prop.box(C.x - 4.2, KERB + 3.3, C.z - 2.6, C.x + 1.2, KERB + 3.4, C.z - 1.3, VH.col(0xd9772b));
      for (const [wx, ws] of [[C.x - 3.5, -1], [C.x - 3.5, 1], [C.x + 3.2, -1], [C.x + 3.2, 1]]) ctx.prop.cylinder(wx, KERB + 0.5, C.z + ws * 1.1, 0.5, 0.5, 0.3, 10, VH.col(0x1b1d20), true);
      W.trailer(world, -806, 337, 11, 0xf4f2ec, { side: -1, awning: 0x3a6f9a, lit: true });
      // Director's chairs and a light on a stand.
      for (let k = 0; k < 4; k++) {
        const x = -735 + k * 1.4, z = 343;
        ctx.prop.box(x - 0.3, KERB + 0.45, z - 0.25, x + 0.3, KERB + 0.5, z + 0.25, VH.col(0x1b1d20));
        ctx.prop.box(x - 0.3, KERB + 0.5, z + 0.2, x + 0.3, KERB + 1.0, z + 0.25, VH.col(0x1b1d20));
        for (const dx of [-0.28, 0.28]) ctx.prop.box(x + dx - 0.03, KERB, z - 0.25, x + dx + 0.03, KERB + 0.75, z + 0.25, VH.col(0x8b6a45));
      }
      ctx.prop.box(-726 - 0.05, KERB, 342 - 0.05, -726 + 0.05, KERB + 3.5, 342 + 0.05, VH.col(0x2b2f35));
      ctx.screen.box(-726.6, KERB + 3.3, 341.5, -725.4, KERB + 4.3, 342.4, VH.col(0xfff8e8, 2.2));
    }
    // Lamps along the studio street.
    for (let x = G.x0 + 14; x < G.x1 - 20; x += 32) {
      world.addProp('streetlight', x, KERB, S.z0 - 1.5, 0, 1);
      world.addProp('streetlight', x + 16, KERB, S.z1 + 1.5, Math.PI, 1);
    }
  }

  // --------------------------------------------------- the city street set
  function buildBacklot(world) {
    const W = K();
    const L = LOT;
    W.pave(world, L.x0, L.z0, L.x1, L.z1, 0xc9c3b3, 'plazaTop');
    // The street and its pavements (raised a kerb's height).
    W.pave(world, L.st.x0, L.z0, L.st.x1, L.z1, 0xbababa);
    W.pave(world, L.st.x1, L.cross.z0, L.x1, L.cross.z1, 0xbababa);
    W.mark(world, -950.1, L.z0 + 2, -949.9, L.cross.z0 - 14, 0xf2d34a);
    W.mark(world, -950.1, L.cross.z1 + 14, -949.9, L.z1 - 2, 0xf2d34a);
    for (let x = L.st.x0 + 0.5; x < L.st.x1; x += 1.4) {
      W.mark(world, x, L.cross.z0 - 4, x + 0.7, L.cross.z0 - 1);
      W.mark(world, x, L.cross.z1 + 1, x + 0.7, L.cross.z1 + 4);
    }
    const kerbed = (x0, z0, x1, z1) => {
      K().tiles(world, x0, z0, x1, z1, (a, b, c, d, ctx) => {
        ctx.concrete.box(a, KERB, b, c, KERB + 0.15, d, VH.col(0xcfcac0), { skip: { top: true } });
        ctx.sidewalk.topRect(a, b, c, d, KERB + 0.15, VH.col(0xffffff), 3);
      });
      world.physics.addBox(x0, 0, z0, x1, KERB + 0.15, z1, 'kerb', F().SOLID);
    };
    kerbed(L.xw, L.z0, L.st.x0, L.z1);
    kerbed(L.st.x1, L.z0, L.xe, L.cross.z0);
    kerbed(L.st.x1, L.cross.z1, L.xe, L.plazaZ);
    kerbed(L.st.x1, L.plazaZ, L.xePlaza, L.z1);
    const Y = KERB + 0.15;
    // West fronts (face east). Miller's and the bank have sugar-glass windows.
    const wf = [
      [L.z0 + 2, 238, 18, { wall: 0x9a4a3a, style: 1, awning: 0x2f6f4f, lit: 0xffd9a0 }],
      [238, 260, 12, { wall: 0xd8c8a0, style: 1, awning: 0xc8302c, lit: 0xffe8b0 }],
      [L.bank.z0, L.bank.z1, 14, { wall: 0xcfc6b4, style: 3, fascia: 0x3a3a3a, glass: 0x2a3a4a, holes: [L.bank.win] }],
      [292, L.miller.z0, 22, { wall: 0x7a6a5a, style: 1, lit: 0xffd9a0 }],
      [L.miller.z0, L.miller.z1, 9, { wall: 0x2f4f6f, style: 1, fascia: 0x1f2f3f, glass: 0x9fc8e0, holes: [[L.miller.z0 + 2, L.miller.z1 - 2]], lit: 0xfff0d0 }],
      [L.miller.z1, 352, 26, { wall: 0xa86a4a, style: 1, awning: 0x3a6f9a }],
      [352, 380, 16, { wall: 0xe0d0b0, style: 3, lit: 0xffe8b0 }],
      [380, 404, 30, { wall: 0x8a8f96, style: 4, ww: 0.8, wh: 0.7 }],
    ];
    for (const [z0, z1, h, o] of wf) front(world, 'w', L.xw, z0, z1, h, o);
    // East fronts (face west), broken by the cross street and the plaza.
    const ef = [
      [L.xe, L.z0 + 2, 250, 24, { wall: 0x5a6a7a, style: 4, ww: 0.8, wh: 0.7 }],
      [L.xe, 250, 280, 12, { wall: 0xb85a3a, style: 1, awning: 0xf2c500, lit: 0xffd9a0 }],
      [L.xe, 280, L.cross.z0 - 1, 15, { wall: 0xd8c8a0, style: 1, awning: 0x2f6f9f }],
      [L.xe, L.cross.z1 + 1, L.plazaZ, 20, { wall: 0x9a4a3a, style: 1, lit: 0xffe8b0 }],
      [L.xePlaza, L.plazaZ, L.z1 - 2, 18, { wall: 0xc8b090, style: 3, awning: 0xc8302c }],
    ];
    for (const [x, z0, z1, h, o] of ef) front(world, 'e', x, z0, z1, h, o);
    // The bank's columns and steps; Miller's window frame.
    {
      const ctx = world.ctxAt(L.xw, (L.bank.z0 + L.bank.z1) / 2);
      for (let z = L.bank.z0 + 2; z < L.bank.z1 - 1; z += 4) {
        if (z > L.bank.win[0] - 1 && z < L.bank.win[1] + 1) continue;
        ctx.prop.cylinder(L.xw + 1.2, Y, z, 0.55, 0.5, 9.5, 10, VH.col(0xeae4d6), true);
        world.physics.addBox(L.xw + 0.7, 0, z - 0.5, L.xw + 1.7, Y + 9.5, z + 0.5, 'building');
      }
      ctx.prop.box(L.xw, Y + 9.5, L.bank.z0, L.xw + 2, Y + 10.5, L.bank.z1, VH.col(0xeae4d6));
      ctx.prop.box(L.xw - 0.12, KERB + 0.3, L.bank.win[0], L.xw - 0.08, KERB + 3.4, L.bank.win[1], VH.col(0xbfe0f0));
      const m = L.miller;
      ctx.prop.box(L.xw - 0.1, KERB + 0.3, m.z0 + 2, L.xw - 0.06, KERB + 3.5, m.z1 - 2, VH.col(0xd8f0ff));
      // Hat stands in the window.
      for (let z = m.z0 + 4; z < m.z1 - 3; z += 3) {
        ctx.prop.box(L.xw - 1.2, KERB, z - 0.04, L.xw - 1.1, KERB + 1.4, z + 0.04, VH.col(0x2b2f35));
        ctx.prop.cylinder(L.xw - 1.15, KERB + 1.4, z, 0.35, 0.35, 0.06, 10, VH.col(0x3a2a1a), true);
        ctx.prop.cylinder(L.xw - 1.15, KERB + 1.46, z, 0.18, 0.16, 0.2, 10, VH.col(0x3a2a1a), true);
      }
    }
    W.sign(world, { x: L.xw + 0.35, y: KERB + 4.1, z: (L.miller.z0 + L.miller.z1) / 2, yaw: Math.PI / 2, w: 14, h: 1.0, lines: ["MILLER'S FINE HATS"], style: 'plaque', oneSided: true });
    W.sign(world, { x: L.xw + 2.05, y: KERB + 10, z: (L.bank.z0 + L.bank.z1) / 2, yaw: Math.PI / 2, w: 18, h: 0.9, lines: ['MERCHANTS & MARINERS BANK'], style: 'plaque', oneSided: true, colors: { bg: ['#eae4d6', '#e0d8c8'], fg: '#3a3020', border: '#b8a070' } });
    // The camera-department ramp on the cross street, aimed west at Miller's window.
    W.ramp(world, world.ctxAt(-934, 320).prop, -929, (L.cross.z0 + L.cross.z1) / 2, -Math.PI / 2, 5, 8, KERB, KERB + 1.5, 0xc8a050);
    // The subway entrance: railings round a hole, steps going down, a METRO globe; a ramp over it.
    {
      const S = L.subway;
      const ctx = world.ctxAt((S.x0 + S.x1) / 2, (S.z0 + S.z1) / 2);
      ctx.prop.topRect(S.x0, S.z0, S.x1, S.z1, Y + 0.01, VH.col(0x101214));
      for (let k = 0; k < 7; k++) ctx.prop.box(S.x0 + 0.4, Y + 0.012, S.z0 + 1 + k * 1.2, S.x1 - 0.4, Y + 0.02, S.z0 + 1.15 + k * 1.2, VH.col(0x3a3d42 + k * 0x020202));
      const rc = 0x2f5f3a;
      VH.Landmarks.railing(world, ctx, S.x0, S.z0, S.x1, S.z0, Y, { color: rc });
      VH.Landmarks.railing(world, ctx, S.x0, S.z0, S.x0, S.z1, Y, { color: rc });
      VH.Landmarks.railing(world, ctx, S.x1, S.z0, S.x1, S.z1, Y, { color: rc });
      // Walking into the hole: it's a painted floor; keep people out of it anyway.
      world.physics.addBox(S.x0, 0, S.z1 - 0.1, S.x1, Y + 1.05, S.z1 + 0.1, 'railing', F().SOLID);
      for (const x of [S.x0, S.x1]) {
        ctx.prop.box(x - 0.08, Y, S.z1 - 0.08, x + 0.08, Y + 2.6, S.z1 + 0.08, VH.col(rc));
        ctx.screen.cylinder(x, Y + 2.6, S.z1, 0.32, 0.32, 0.5, 10, VH.col(0xfff4dc, 1.6), true);
      }
      W.sign(world, { x: (S.x0 + S.x1) / 2, y: Y + 3.0, z: S.z1 + 0.15, yaw: 0, w: 5, h: 0.8, lines: ['METRO  ·  5TH STREET'], style: 'info', twoSided: true, colors: { bg: ['#2f5f3a', '#24502f'], fg: '#ffffff', bar: '#f2c500' } });
      W.ramp(world, ctx.prop, (S.x0 + S.x1) / 2, S.z0 - 22, 0, 5, 10, Y, Y + 1.7, 0xc8a050);
    }
    // Street furniture: lamps, hydrants, a newsstand, a fake yellow cab.
    for (let z = L.z0 + 10; z < L.z1 - 4; z += 28) {
      world.addProp('streetlight', L.st.x0 - 1, KERB + 0.15, z, Math.PI / 2, 1);
      if (z + 14 < L.cross.z0 - 3 || z + 14 > L.cross.z1 + 3) world.addProp('streetlight', L.st.x1 + 1, KERB + 0.15, z + 14, -Math.PI / 2, 1);
    }
    for (const z of [232, 300, 372]) world.addProp('hydrant', L.st.x0 - 0.8, KERB + 0.15, z, 0, 1);
    world.addProp('bin', L.st.x1 + 1, KERB + 0.15, 270, 0, 1);
    world.addProp('bin', L.st.x0 - 1, KERB + 0.15, 345, 0, 1);
    {
      const ctx = world.ctxAt(-940, 300);
      W.solid(world, ctx.prop, -941.5, Y, 296, -939.5, Y + 2.4, 300, 0x2f6f4f, null, 'metal', F().SOLID | F().SHOTS);
      ctx.prop.box(-941.6, Y + 2.4, 295.8, -939.4, Y + 2.6, 300.2, VH.col(0xc8302c));
      // The yellow cab parked at the kerb (a shell: hollow props never move).
      const cx = -954.6, cz = 240;
      ctx.prop.box(cx - 0.95, KERB + 0.35, cz - 2.4, cx + 0.95, KERB + 1.05, cz + 2.4, VH.col(0xf2c500));
      ctx.prop.box(cx - 0.85, KERB + 1.05, cz - 1.2, cx + 0.85, KERB + 1.6, cz + 1.0, VH.col(0xf2c500));
      ctx.prop.box(cx - 0.87, KERB + 1.12, cz - 1.1, cx + 0.87, KERB + 1.5, cz + 0.9, VH.col(0x26323e));
      for (const [dx, dz] of [[-0.9, -1.5], [0.9, -1.5], [-0.9, 1.5], [0.9, 1.5]]) ctx.prop.cylinder(cx + dx * 0.98, KERB, cz + dz, 0.36, 0.36, 0.35, 10, VH.col(0x1b1d20), true);
      world.physics.addBox(cx - 0.95, 0, cz - 2.4, cx + 0.95, KERB + 1.6, cz + 2.4, 'metal');
    }
    // The camera crane, Chet's deckchair and parasol, the chalked T.
    {
      const C = L.crane;
      const ctx = world.ctxAt(C.x, C.z);
      W.solid(world, ctx.prop, C.x - 1.5, KERB, C.z - 2, C.x + 1.5, KERB + 1.2, C.z + 2, 0x2b2f35, null, 'metal');
      for (const [dx, dz] of [[-1.4, -1.8], [1.4, -1.8], [-1.4, 1.8], [1.4, 1.8]]) ctx.prop.cylinder(C.x + dx, KERB, C.z + dz, 0.4, 0.4, 0.3, 10, VH.col(0x1b1d20), true);
      ctx.prop.cylinder(C.x, KERB + 1.2, C.z, 0.35, 0.3, 2.2, 8, VH.col(0x5a5f66), true);
      W.beam(ctx.prop, C.x + 3, KERB + 3.0, C.z + 0.6, C.x - 8, KERB + 5.5, C.z - 4, 0.3, 0x5a5f66);
      ctx.prop.box(C.x + 2.5, KERB + 2.4, C.z + 0.2, C.x + 3.6, KERB + 3.2, C.z + 1.2, VH.col(0x8f969c));
      ctx.prop.box(C.x - 8.5, KERB + 5.0, C.z - 4.5, C.x - 7.5, KERB + 5.8, C.z - 3.6, VH.col(0x1b1d20));
      ctx.prop.cylinder(C.x - 8, KERB + 5.4, C.z - 4.7, 0.2, 0.25, 0.4, 8, VH.col(0x1b1d20), true);
      const M = L.mark;
      W.mark(world, M.x - 0.9, M.z - 0.08, M.x + 0.9, M.z + 0.08, 0xffffff);
      W.mark(world, M.x - 0.08, M.z, M.x + 0.08, M.z + 1.4, 0xffffff);
      const dx = M.x + 6, dz = L.cross.z1 + 3.5;
      K().tiltBox(ctx.prop, dx, KERB + 0.55, dz, 0.6, 0.05, 1.1, Math.PI, -0.9, 0xc8302c);
      K().tiltBox(ctx.prop, dx, KERB + 0.3, dz - 0.4, 0.6, 0.05, 0.8, Math.PI, 0.2, 0xf4efe2);
      ctx.prop.box(dx + 1.2, KERB, dz - 0.04, dx + 1.26, KERB + 2.3, dz + 0.04, VH.col(0xe8e8e8));
      ctx.prop.cylinder(dx + 1.23, KERB + 2.3, dz, 1.4, 0.05, 0.6, 10, VH.col(0xf2c500), false);
      W.sign(world, { x: M.x + 9, y: KERB + 1.0, z: L.cross.z1 + 1.2, yaw: Math.PI, w: 1.2, h: 0.5, lines: ['C. VALIANT'], style: 'info', oneSided: true, colors: { bg: ['#1b1d20', '#1b1d20'], fg: '#ffffff', bar: '#f2c500' } });
    }
    // The prop yard: fibreglass statues, crates, a replica car under a sheet, a tank on a low-loader.
    {
      const Y0 = L.yard;
      const ctx = world.ctxAt(-1006, 320);
      // A giant head, a column, a rocket, a thumbs-up hand.
      ctx.prop.box(-1030, KERB, 228, -1022, KERB + 1.2, 236, VH.col(0xb8b2a6));
      ctx.prop.cylinder(-1026, KERB + 1.2, 232, 3.2, 2.6, 5.5, 12, VH.col(0xd8c8a8), true);
      ctx.prop.box(-1028.5, KERB + 4.2, 228.8, -1023.5, KERB + 5.0, 229.2, VH.col(0x6a5a4a));
      ctx.prop.box(-1026.4, KERB + 2.8, 228.6, -1025.6, KERB + 4.0, 229.4, VH.col(0xc8b898));
      world.physics.addBox(-1029.5, 0, 228.5, -1022.5, KERB + 6.7, 235.5, 'building');
      for (const z of [250, 262, 274]) {
        ctx.prop.cylinder(-1032, KERB, z, 0.9, 0.8, 7, 12, VH.col(0xeae4d6), true);
        ctx.prop.box(-1033.2, KERB + 7, z - 1.2, -1030.8, KERB + 7.6, z + 1.2, VH.col(0xeae4d6));
        world.physics.addBox(-1033, 0, z - 1, -1031, KERB + 7.6, z + 1, 'building');
      }
      ctx.prop.cylinder(-1000, KERB, 240, 1.6, 1.6, 12, 12, VH.col(0xe8e8e8), false);
      ctx.prop.cylinder(-1000, KERB + 12, 240, 1.6, 0.1, 4, 12, VH.col(0xc8302c), true);
      for (const a of [0, 1, 2]) {
        const ang = (a / 3) * Math.PI * 2;
        ctx.prop.orientedBox(-1000 + Math.sin(ang) * 2.0, 240 + Math.cos(ang) * 2.0, 0.12, 1.0, ang, KERB, KERB + 3, VH.col(0xc8302c));
      }
      world.physics.addBox(-1002, 0, 238, -998, KERB + 16, 242, 'metal');
      ctx.prop.box(-1012, KERB, 270, -1008, KERB + 3.5, 274, VH.col(0xf2c500));
      ctx.prop.box(-1011.2, KERB + 3.5, 271.2, -1009.6, KERB + 6.5, 272.8, VH.col(0xf2c500));
      world.physics.addBox(-1012, 0, 270, -1008, KERB + 6.5, 274, 'building');
      // Crates and flats.
      for (let i = 0; i < 14; i++) {
        const x = -1036 + (i % 7) * 4.2, z = 290 + Math.floor(i / 7) * 5;
        const h = 1 + ((i * 7) % 3) * 0.6;
        W.solid(world, ctx.wood, x - 1.5, KERB, z - 1.5, x + 1.5, KERB + h, z + 1.5, i % 2 ? 0x9a7650 : 0x7d6040, null, 'crate', F().SOLID | F().SHOTS);
      }
      for (let k = 0; k < 4; k++) ctx.wood.box(-1038, KERB, 360 + k * 0.6, -1022, KERB + 5, 360.2 + k * 0.6, VH.col([0xc8b48a, 0x7ab0a0, 0xd8c8a0, 0x9a4a3a][k]));
      world.physics.addBox(-1038, 0, 360, -1022, KERB + 5, 362.4, 'building');
      // A fibreglass dinosaur from a film nobody remembers.
      {
        const dx = -1012, dz = 330, g = 0x6a9a4a;
        ctx.prop.box(dx - 2.2, KERB + 2.2, dz - 4, dx + 2.2, KERB + 5.2, dz + 4, VH.col(g));
        for (const [lx, lz] of [[-1.5, -2.6], [1.5, -2.6], [-1.5, 2.6], [1.5, 2.6]]) ctx.prop.box(dx + lx - 0.6, KERB, dz + lz - 0.6, dx + lx + 0.6, KERB + 2.4, dz + lz + 0.6, VH.col(g));
        K().beam(ctx.prop, dx, KERB + 4.6, dz - 3.5, dx, KERB + 10.5, dz - 8, 1.1, g);
        ctx.prop.box(dx - 0.9, KERB + 10, dz - 9.8, dx + 0.9, KERB + 11.2, dz - 7.4, VH.col(g));
        K().beam(ctx.prop, dx, KERB + 3.8, dz + 3.8, dx, KERB + 1.2, dz + 11, 0.9, g);
        for (let k = 0; k < 5; k++) ctx.prop.box(dx - 0.1, KERB + 5.2, dz - 3 + k * 1.5, dx + 0.1, KERB + 6.2, dz - 2.4 + k * 1.5, VH.col(0xd9772b));
        world.physics.addBox(dx - 2.2, 0, dz - 4, dx + 2.2, KERB + 5.2, dz + 4, 'building');
      }
      for (let i = 0; i < 8; i++) {
        const x = -1036 + (i % 4) * 4.5, z = 418 + Math.floor(i / 4) * 0.01;
        ctx.prop.cylinder(x, KERB, z - (i >> 2) * 3, 0.45, 0.45, 1.0, 10, VH.col(i % 3 ? 0x2f6f9f : 0xc8302c), true);
        world.physics.addBox(x - 0.45, 0, z - (i >> 2) * 3 - 0.45, x + 0.45, KERB + 1, z - (i >> 2) * 3 + 0.45, 'barrel', F().SOLID | F().SHOTS);
      }
      // The replica under a sheet: a low car shape with a grey cover, its orange nose showing.
      const rx = -1008, rz = 392;
      ctx.prop.box(rx - 1.0, KERB + 0.3, rz - 2.3, rx + 1.0, KERB + 0.95, rz + 2.3, VH.col(0xe0481c));
      ctx.prop.box(rx - 1.08, KERB + 0.4, rz - 1.6, rx + 1.08, KERB + 1.1, rz + 2.4, VH.col(0x9aa0a6));
      ctx.prop.box(rx - 0.85, KERB + 1.1, rz - 0.6, rx + 0.85, KERB + 1.45, rz + 1.4, VH.col(0x9aa0a6));
      world.physics.addBox(rx - 1.1, 0, rz - 2.4, rx + 1.1, KERB + 1.45, rz + 2.4, 'metal');
      // The low-loader with the war film's "prop" tank.
      const lx = -1030, lz = 405;
      ctx.prop.box(lx - 1.4, KERB + 0.9, lz - 8, lx + 1.4, KERB + 1.2, lz + 6, VH.col(0x5a5f66));
      for (const z of [lz + 2.5, lz + 4, lz + 5.5]) for (const s of [-1, 1]) ctx.prop.cylinder(lx + s * 1.1, KERB + 0.45, z, 0.45, 0.45, 0.3, 10, VH.col(0x1b1d20), true);
      ctx.prop.box(lx - 1.3, KERB + 1.2, lz - 6, lx + 1.3, KERB + 2.4, lz + 4, VH.col(0x4f5a3a));
      ctx.prop.box(lx - 1.0, KERB + 2.4, lz - 3.5, lx + 1.0, KERB + 3.1, lz + 0.5, VH.col(0x4f5a3a));
      ctx.prop.cylinder(lx, KERB + 2.75, lz - 3.5, 0.14, 0.12, 4.5, 8, VH.col(0x3f4a2a), true);
      K().beam(ctx.prop, lx, KERB + 2.75, lz - 3.5, lx, KERB + 2.9, lz - 8, 0.24, 0x3f4a2a);
      world.physics.addBox(lx - 1.4, 0, lz - 8, lx + 1.4, KERB + 3.1, lz + 6, 'metal');
      // The yard's fence (west, north) with a gate onto Studio Road.
      W.fence(world, Y0.x0, L.z0 + 1, Y0.x0, L.z1 - 1, [], 'chain', 2.4);
      W.fence(world, Y0.x0, L.z0 + 1, L.xw - 0.5, L.z0 + 1, [[-1010, -995]], 'chain', 2.4);
      W.fence(world, Y0.x0, L.z1 - 1, L.xw - 0.5, L.z1 - 1, [], 'chain', 2.4);
      for (const z of [250, 330, 410]) world.addProp('streetlight', -1018, KERB, z, 0, 1);
    }
    // East of the fronts: the backlot's fence and lamps.
    W.fence(world, L.xe + 6, L.z0 + 1, L.x1 - 1, L.z0 + 1, [], 'chain', 2.4);
    W.fence(world, L.x1 - 1, L.z0 + 1, L.x1 - 1, L.z1 - 1, [[L.cross.z0 - 1, L.cross.z1 + 1]], 'chain', 2.4);
    W.fence(world, L.xePlaza + 6, L.z1 - 1, L.x1 - 1, L.z1 - 1, [], 'chain', 2.4);
    W.sign(world, { x: -935, y: 3.2, z: L.z0 - 1.4, yaw: Math.PI, w: 7, h: 2.0, lines: ['SUNREEL BACKLOT', 'Closed set · Crew only'], style: 'info', posts: true, colors: { bg: ['#1d2a44', '#2b3a5a'], fg: '#ffd56a', bar: '#ffd56a' } });
  }

  // ---------------------------------------------------- the western set
  /** A frontier building: a body, a taller false front with a name board, a porch. side 'n' or 's' of the street. */
  function frontier(world, side, x0, x1, depth, h, o) {
    const W = K();
    const s = side === 'n' ? 1 : -1; // +1: front faces south
    const zf = side === 'n' ? WEST.nFront : WEST.sFront;
    const zb = zf - s * depth;
    const z0 = Math.min(zf, zb), z1 = Math.max(zf, zb);
    const ctx = world.ctxAt((x0 + x1) / 2, (z0 + z1) / 2);
    const wall = VH.col(o.wall);
    // Body (clapboard: wood surface), a pitched roof behind the false front.
    ctx.wood.box(x0, KERB, z0, x1, KERB + h, z1, wall);
    if (!o.flatRoof) W.gable(ctx.prop, x0 - 0.2, z0, x1 + 0.2, z1, KERB + h, 1.6, 'z', 0x6a5a4a, VH.colMul(wall, 0.9));
    if (!o.open) world.physics.addBox(x0, 0, z0, x1, KERB + h, z1, 'building');
    // The false front, taller, with a stepped top.
    const fh = o.fh || h + 2.4;
    ctx.wood.box(x0, KERB, Math.min(zf, zf + s * 0.3), x1, KERB + fh, Math.max(zf, zf + s * 0.3), VH.colMul(wall, 1.05));
    ctx.wood.box(x0 + 1, KERB + fh, Math.min(zf, zf + s * 0.3), x1 - 1, KERB + fh + 0.8, Math.max(zf, zf + s * 0.3), VH.colMul(wall, 1.05));
    ctx.prop.box(x0 - 0.2, KERB + fh - 0.3, Math.min(zf, zf + s * 0.5), x1 + 0.2, KERB + fh, Math.max(zf, zf + s * 0.5), VH.col(0xf1e8cf));
    world.physics.addBox(x0, 0, Math.min(zf, zf + s * 0.3), x1, KERB + fh + 0.8, Math.max(zf, zf + s * 0.3), 'building');
    // Name board (a painted plank, no text unless a sign is given).
    ctx.prop.box(x0 + 1.2, KERB + h - 0.4, Math.min(zf + s * 0.3, zf + s * 0.35), x1 - 1.2, KERB + h + 1.1, Math.max(zf + s * 0.3, zf + s * 0.35), VH.col(o.board || 0xf1e8cf));
    // Door, windows (lit after dark).
    const mx = (x0 + x1) / 2;
    const dw = o.doors || 1.4;
    ctx.prop.box(mx - dw, KERB, Math.min(zf + s * 0.3, zf + s * 0.34), mx + dw, KERB + 2.6, Math.max(zf + s * 0.3, zf + s * 0.34), VH.col(o.door || 0x4a3220));
    for (const wx of [x0 + 2.2, x1 - 2.2]) {
      if (x1 - x0 < 9) break;
      ctx.screen.box(wx - 0.8, KERB + 1.0, Math.min(zf + s * 0.3, zf + s * 0.34), wx + 0.8, KERB + 2.4, Math.max(zf + s * 0.3, zf + s * 0.34), VH.col(0xffc878, 0.6));
    }
    if (o.upper) for (let wx = x0 + 2; wx < x1 - 1; wx += 3.2) ctx.screen.box(wx - 0.5, KERB + 4.2, Math.min(zf + s * 0.3, zf + s * 0.34), wx + 0.5, KERB + 5.6, Math.max(zf + s * 0.3, zf + s * 0.34), VH.col(0xffc878, 0.45));
    // Porch: a plank floor a step up, posts, a shed roof.
    const P = WEST.porch;
    const pz0 = Math.min(zf, zf + s * P), pz1 = Math.max(zf, zf + s * P);
    ctx.wood.box(x0, KERB, pz0, x1, KERB + 0.35, pz1, VH.col(plank));
    world.physics.addBox(x0, 0, pz0, x1, KERB + 0.35, pz1, 'boardwalk', F().SOLID);
    for (let x = x0 + 0.2; x <= x1; x += (x1 - x0 - 0.4) / Math.max(1, Math.round((x1 - x0) / 4))) {
      ctx.wood.box(x - 0.1, KERB + 0.35, zf + s * (P - 0.25) - 0.1, x + 0.1, KERB + 3.4, zf + s * (P - 0.25) + 0.1, VH.col(0x6b4e33));
    }
    K().tiltBox(ctx.wood, mx, KERB + 3.45, zf + s * P / 2, x1 - x0 + 0.2, 0.15, P + 0.4, 0, s * 0.12, 0x7a5a3a);
    if (o.balcony) {
      ctx.wood.box(x0, KERB + 3.4, pz0, x1, KERB + 3.6, pz1, VH.col(plank));
      VH.Landmarks.railing(world, ctx, x0, zf + s * (P - 0.1), x1, zf + s * (P - 0.1), KERB + 3.6, { color: 0x6b4e33, height: 0.9 });
    }
    // A hitching rail in front.
    const hz = zf + s * (P + 1.2);
    ctx.wood.box(mx - 2.5, KERB + 0.9, hz - 0.06, mx + 2.5, KERB + 1.0, hz + 0.06, VH.col(0x6b4e33));
    for (const x of [mx - 2.4, mx + 2.4]) ctx.wood.box(x - 0.08, KERB, hz - 0.08, x + 0.08, KERB + 1.0, hz + 0.08, VH.col(0x6b4e33));
    return { ctx, zf, s };
  }

  function buildWestern(world) {
    const W = K();
    const Wt = WEST;
    W.pave(world, Wt.x0, Wt.z0, Wt.x1, Wt.z1, 0xd8b884, 'plazaTop');
    // The street and the approach: packed dirt, wheel ruts.
    W.pave(world, Wt.x0, Wt.st.z0 - 2, Wt.x1, Wt.st.z1 + 2, 0xc89a62, 'plazaTop', KERB + 0.016);
    W.pave(world, Wt.app.x0, Wt.st.z1, Wt.app.x1, Wt.z1, 0xc89a62, 'plazaTop', KERB + 0.016);
    for (const dz of [-2.5, 2.5]) W.pave(world, Wt.x0, (Wt.st.z0 + Wt.st.z1) / 2 + dz - 0.3, Wt.x1, (Wt.st.z0 + Wt.st.z1) / 2 + dz + 0.3, 0xa87a4a, 'plazaTop', KERB + 0.02);
    // North side, west to east.
    const north = [
      [-1036, -1012, 16, 5.0, { wall: 0x8a5a3a, board: 0xe9d8b0, doors: 3.2, name: 'livery' }],
      [-1008, -992, 14, 5.0, { wall: 0xc8a878, board: 0xf1e8cf }],
      [-988, -962, 18, 7.0, { wall: 0xa8483a, board: 0xf1e8cf, upper: true, balcony: true, fh: 9.2 }],
      [Wt.sheriff.x0, Wt.sheriff.x1, Wt.nFront - Wt.sheriff.z0, Wt.sheriff.h, { wall: 0xb8a888, board: 0xf1e8cf, fh: 6.4, flatRoof: true }],
      [-916, -898, 14, 5.5, { wall: 0x7a8a7a, board: 0xf1e8cf }],
      [-894, -866, 16, 7.4, { wall: 0x9a7a5a, board: 0xe9d8b0, upper: true, balcony: true, fh: 9.6 }],
    ];
    for (const [x0, x1, d, h, o] of north) frontier(world, 'n', x0, x1, d, h, o);
    // South side (fronts face north), either side of the approach road.
    const south = [
      [-1036, -1016, 12, 4.6, { wall: 0x6a5a4a, board: 0xe9d8b0, doors: 2.6 }],
      [-1012, -996, 12, 5.0, { wall: 0xd8c8a0, board: 0xf1e8cf }],
      [-992, -962, 14, 5.4, { wall: 0xb88a5a, board: 0xf1e8cf, upper: false }],
      [-938, -918, 12, 5.0, { wall: 0x8a9aa8, board: 0xf1e8cf }],
      [-914, -896, 12, 4.8, { wall: 0xc8a878, board: 0xe9d8b0 }],
    ];
    for (const [x0, x1, d, h, o] of south) frontier(world, 's', x0, x1, d, h, o);
    // The church at the east end of the south side: white, a steeple.
    {
      const x0 = -890, x1 = -868, z0 = Wt.sFront, z1 = Wt.sFront + 26;
      const ctx = world.ctxAt((x0 + x1) / 2, (z0 + z1) / 2);
      ctx.wood.box(x0, KERB, z0 + 4, x1, KERB + 6, z1, VH.col(0xf4f0e6));
      W.gable(ctx.prop, x0 - 0.3, z0 + 4, x1 + 0.3, z1, KERB + 6, 4.5, 'z', 0x5a4a3a, 0xf4f0e6);
      world.physics.addBox(x0, 0, z0 + 4, x1, KERB + 6, z1, 'building');
      const sx = (x0 + x1) / 2;
      W.solid(world, ctx.wood, sx - 2.4, KERB, z0, sx + 2.4, KERB + 13, z0 + 4.8, 0xf4f0e6, null, 'building');
      ctx.prop.cylinder(sx, KERB + 13, z0 + 2.4, 2.9, 0.1, 7, 4, VH.col(0x5a4a3a), true);
      ctx.prop.box(sx - 0.8, KERB, z0 - 0.05, sx + 0.8, KERB + 3, z0, VH.col(0x6b4e33));
      ctx.screen.cylinder(sx, KERB + 9, z0 - 0.06, 0.9, 0.9, 0.05, 12, VH.col(0xffd9a0, 0.6), true);
      ctx.prop.box(sx - 0.08, KERB + 20, z0 + 2.32, sx + 0.08, KERB + 21.6, z0 + 2.48, VH.col(0xd8c070));
      ctx.prop.box(sx - 0.5, KERB + 21, z0 + 2.32, sx + 0.5, KERB + 21.16, z0 + 2.48, VH.col(0xd8c070));
    }
    // Signs that matter: the saloon, the sheriff, the way in.
    W.sign(world, { x: -975, y: KERB + 7.6, z: Wt.nFront + 0.6, yaw: 0, w: 12, h: 1.6, lines: ['THE GOLDEN SPUR SALOON'], style: 'plaque', oneSided: true, colors: { bg: ['#f1e8cf', '#e9d8b0'], fg: '#7a2a1a', border: '#7a2a1a' } });
    W.sign(world, { x: (Wt.sheriff.x0 + Wt.sheriff.x1) / 2, y: KERB + 4.95, z: Wt.nFront + 0.42, yaw: 0, w: 10, h: 1.2, lines: ['SHERIFF'], style: 'plaque', oneSided: true, colors: { bg: ['#f1e8cf', '#e9d8b0'], fg: '#2a2a2a', border: '#2a2a2a' } });
    W.sign(world, { x: (Wt.app.x0 + Wt.app.x1) / 2, y: 7.6, z: Wt.z1 - 6, yaw: 0, w: 16, h: 2.2, lines: ['THE WESTERN SET', 'Sunreel Studios · Dust Creek, 1881'], style: 'plaque', twoSided: true });
    {
      // The entrance arch: log posts and a crossbar for the sign.
      const ctx = world.ctxAt(-950, Wt.z1 - 6);
      for (const x of [Wt.app.x0 - 1.5, Wt.app.x1 + 1.5]) W.solid(world, ctx.wood, x - 0.45, KERB, Wt.z1 - 6.45, x + 0.45, KERB + 9, Wt.z1 - 5.55, 0x6b4e33, null, 'pole');
      ctx.wood.box(Wt.app.x0 - 2.5, KERB + 8.6, Wt.z1 - 6.3, Wt.app.x1 + 2.5, KERB + 9.2, Wt.z1 - 5.7, VH.col(0x6b4e33));
    }
    // The sheriff's office: a stair up the east side to the flat roof, a
    // water butt at its foot, the weathervane on top.
    {
      const S = Wt.sheriff;
      const ctx = world.ctxAt(S.x1, S.z0);
      const roofY = KERB + S.h;
      // A flat roof over the body (the gable is replaced by a flat deck).
      W.deck(world, ctx.wood, S.x0, S.z0, S.x1, Wt.nFront, roofY + 0.15, plank, 'plank', 0.2);
      W.stairs(world, ctx.wood, S.x1 + 1.0, Wt.nFront - 1, 'n', 9, 1.6, KERB, roofY + 0.15, plank, { open: true, railHex: 0x6b4e33, tag: 'plank' });
      W.deck(world, ctx.wood, S.x1, S.z0 - 0.5, S.x1 + 1.8, Wt.nFront - 9.5, roofY + 0.15, plank, 'plank', 0.2);
      ctx.wood.cylinder(S.x1 + 2.6, KERB, Wt.nFront - 1.2, 0.55, 0.5, 1.1, 10, VH.col(0x7a5a3a), true);
      world.physics.addBox(S.x1 + 2.05, 0, Wt.nFront - 1.75, S.x1 + 3.15, KERB + 1.1, Wt.nFront - 0.65, 'barrel', F().SOLID);
      // The weathervane: a post, the arrow, a rooster.
      const vx = (S.x0 + S.x1) / 2, vz = (S.z0 + Wt.nFront) / 2 - 2;
      ctx.prop.box(vx - 0.05, roofY + 0.15, vz - 0.05, vx + 0.05, roofY + 2.6, vz + 0.05, VH.col(0x2b2f35));
      ctx.prop.box(vx - 0.9, roofY + 2.3, vz - 0.03, vx + 0.9, roofY + 2.36, vz + 0.03, VH.col(0x2b2f35));
      ctx.prop.box(vx - 0.4, roofY + 2.4, vz - 0.04, vx + 0.3, roofY + 2.9, vz + 0.04, VH.col(0x2b2f35));
      ctx.prop.box(vx + 0.1, roofY + 2.85, vz - 0.04, vx + 0.4, roofY + 3.2, vz + 0.04, VH.col(0x2b2f35));
      for (const [ax, az] of [[0, -0.6], [0, 0.6], [-0.6, 0], [0.6, 0]]) ctx.prop.box(vx + ax - 0.04, roofY + 1.8, vz + az - 0.04, vx + ax + 0.04, roofY + 1.9, vz + az + 0.04, VH.col(0x2b2f35));
      world.westernVane = { x: vx, z: vz, y: roofY + 0.15 };
      W.deckRails(world, S.x0, S.z0, S.x1, Wt.nFront - 0.3, roofY + 0.15, [{ side: 'e', a0: S.z0 - 1, a1: Wt.nFront - 9.5 }], 0x6b4e33);
    }
    // Set dressing: wagons, barrels, a water trough, cacti, a windmill pump.
    {
      const ctx = world.ctxAt(-950, 550);
      for (const [x, z, yaw] of [[-1004, 574, 0.2], [-930, 527, -0.1]]) {
        ctx.wood.orientedBox(x, z, 1.1, 2.3, yaw, KERB + 0.8, KERB + 1.5, VH.col(0x8b6a45));
        for (const [dx, dz] of [[-1.2, -1.5], [1.2, -1.5], [-1.2, 1.5], [1.2, 1.5]]) {
          const c = Math.cos(yaw), sn = Math.sin(yaw);
          const px = x + dx * c + dz * sn, pz = z - dx * sn + dz * c;
          ctx.wood.orientedBox(px, pz, 0.06, 0.6, yaw, KERB, KERB + 1.3, VH.col(0x5a3a20));
        }
        // A canvas hoop top on one of them.
        if (yaw > 0) ctx.prop.cylinder(x, KERB + 1.5, z, 1.2, 1.2, 1.6, 10, VH.col(0xf1e8cf), true);
        world.physics.addOrientedBox(x, z, 1.3, 2.4, yaw, 0, KERB + 2.2, 'plank', F().SOLID | F().SHOTS);
      }
      for (const [x, z] of [[-990.5, 532], [-989.5, 533.2], [-910, 568], [-1015, 568], [-963, 568.5]]) {
        ctx.wood.cylinder(x, KERB, z, 0.45, 0.42, 1.0, 10, VH.col(0x7a5a3a), true);
        world.physics.addBox(x - 0.45, 0, z - 0.45, x + 0.45, KERB + 1.0, z + 0.45, 'barrel', F().SOLID | F().SHOTS);
      }
      ctx.wood.box(-944, KERB, 529.5, -940, KERB + 0.8, 530.5, VH.col(0x6b4e33));
      ctx.prop.topRect(-943.8, 529.6, -940.2, 530.4, KERB + 0.7, VH.col(0x4a7a9a));
      world.physics.addBox(-944, 0, 529.5, -940, KERB + 0.8, 530.5, 'plank', F().SOLID);
      let seed = 3;
      for (const [x, z] of [[-1030, 470], [-1000, 490], [-960, 462], [-920, 495], [-880, 470], [-1025, 610], [-1000, 630], [-925, 615], [-870, 640], [-985, 600]]) {
        W.cactus(world, x, z, 3 + (seed % 3) * 1.1, seed);
        seed++;
      }
      // A windmill pump behind the livery.
      const mx = -1024, mz = 500;
      for (const [dx, dz] of [[-1.5, -1.5], [1.5, -1.5], [1.5, 1.5], [-1.5, 1.5]]) W.beam(ctx.prop, mx + dx, KERB, mz + dz, mx + dx * 0.2, KERB + 11, mz + dz * 0.2, 0.15, 0x8a8f96);
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        W.beam(ctx.prop, mx, KERB + 11.3, mz + 0.4, mx + Math.cos(a) * 2.6, KERB + 11.3 + Math.sin(a) * 2.6, mz + 0.4, 0.12, 0xc8c8c0);
      }
      ctx.prop.box(mx - 0.2, KERB + 11, mz - 3, mx + 0.2, KERB + 11.6, mz, VH.col(0xc8302c));
      world.physics.addBox(mx - 1.6, 0, mz - 1.6, mx + 1.6, KERB + 11, mz + 1.6, 'metal', F().SOLID | F().SHOTS);
    }
    // A corral fence behind the north side and lamps (oil lanterns) along the street.
    W.fence(world, -1036, 452, -870, 452, [], 'wood', 1.4);
    W.fence(world, -1036, 646, -957, 646, [], 'wood', 1.4);
    W.fence(world, -943, 646, -870, 646, [], 'wood', 1.4);
    for (let x = Wt.x0 + 10; x < Wt.x1 - 4; x += 22) {
      for (const z of [Wt.nFront + Wt.porch + 0.3, Wt.sFront - Wt.porch - 0.3]) {
        const ctx = world.ctxAt(x, z);
        ctx.wood.box(x - 0.08, KERB, z - 0.08, x + 0.08, KERB + 3.0, z + 0.08, VH.col(0x5a3a20));
        ctx.screen.box(x - 0.2, KERB + 3.0, z - 0.2, x + 0.2, KERB + 3.5, z + 0.2, VH.col(0xffb050, 2.4));
      }
    }
    for (const x of [-1000, -900]) world.addProp('streetlight', x, KERB, Wt.z1 - 3, Math.PI, 0.9);
  }

  // -------------------------------------------------------------- the map
  if (VH.MapPainters) {
    VH.MapPainters.push((g, layout, o) => {
      const p = layout.plots;
      if (!p || !p.sunreel_gate) return;
      const R = o.R;
      const box = (x0, z0, x1, z1, col, sh) => K().mapBox(g, R, x0, z0, x1, z1, col, sh);
      box(GATE.x0, GATE.z0, GATE.x1, GATE.z1, '#cfc9bc', false);
      g.fillStyle = '#8e8e8e';
      R(GATE.x0, GATE.street.z0, GATE.x1, GATE.street.z1);
      for (const st of GATE.stages) box(st.x0, st.z0, st.x1, st.z1, '#e9e1cf');
      box(GATE.admin.x0, GATE.admin.z0, GATE.admin.x1, GATE.admin.z1, '#d8c8a0');
      g.fillStyle = '#b8cfe0';
      if (o.circle) o.circle(GATE.tower.x, GATE.tower.z, 6);
      // Backlot: the city street, the fronts, the prop yard.
      box(LOT.x0, LOT.z0, LOT.x1, LOT.z1, '#c9c3b3', false);
      g.fillStyle = '#8e8e8e';
      R(LOT.st.x0, LOT.z0, LOT.st.x1, LOT.z1);
      R(LOT.st.x1, LOT.cross.z0, LOT.x1, LOT.cross.z1);
      g.fillStyle = '#9a4a3a';
      R(LOT.xw - 1, LOT.z0 + 2, LOT.xw, 404);
      R(LOT.xe, LOT.z0 + 2, LOT.xe + 1, LOT.cross.z0);
      R(LOT.xe, LOT.cross.z1, LOT.xe + 1, LOT.plazaZ);
      box(LOT.yard.x0, LOT.yard.z0, LOT.yard.x1, LOT.yard.z1, '#b8aa8a', false);
      // Western set: dirt street and wooden buildings.
      box(WEST.x0, WEST.z0, WEST.x1, WEST.z1, '#d8b884', false);
      g.fillStyle = '#c89a62';
      R(WEST.x0, WEST.st.z0, WEST.x1, WEST.st.z1);
      R(WEST.app.x0, WEST.st.z1, WEST.app.x1, WEST.z1);
      g.fillStyle = '#8a5a3a';
      R(-1036, WEST.nFront - 16, -866, WEST.nFront);
      R(-1036, WEST.sFront, -962, WEST.sFront + 14);
      R(-938, WEST.sFront, -868, WEST.sFront + 14);
    });
  }

  // --------------------------------------------------------- moving parts
  /** Parked cars in the studio car park and along the studio street. */
  class SunreelLife {
    constructor(game) {
      const W = K();
      const list = [];
      let seed = 911;
      for (let z = 345.5; z < 426; z += 3) if ((seed++ * 7) % 3) list.push(W.parkedSpot(-711, z, Math.PI / 2, seed));
      for (let x = -830; x < -730; x += 7) if ((seed++ * 5) % 4 === 0) list.push(W.parkedSpot(x, GATE.street.z1 + 4, Math.PI / 2, seed));
      W.addParkedSpots(game, list);
      // No kerbside cars across the gates and the set streets' ends.
      W.clearSpots(game, [
        [-664, 305, -620, 335], [-860, 305, -836, 335], // studio gates
        [-962, 190, -938, 212], [-962, 428, -938, 450], [-862, 305, -840, 335], // city set ends, cross street
        [-1062, 538, -1036, 562], [-864, 538, -840, 562], [-962, 646, -938, 672], // western street ends, approach
        [-1014, 190, -990, 212], // prop yard gate
      ]);
    }
    update() {}
    stop() {}
    reset() {}
  }

  // -------------------------------------------------------------- register
  VH.Districts.register({
    id: D,
    name: 'Sunreel Studios',
    plots: ['sunreel_gate', 'sunreel_backlot', 'sunreel_western_set'],
    build(world, layout) {
      const t0 = performance.now();
      if (!layout.plots || !layout.plots.sunreel_gate || !VH.WNKit) return;
      buildGate(world);
      buildBacklot(world);
      buildWestern(world);
      world.sunreel = true;
      this.buildMs = Math.round(performance.now() - t0);
    },
    registerPlaces(world, places) {
      if (!world.sunreel) return;
      const add = (id, p) => {
        const def = places.defs && places.defs[id];
        places.add(id, Object.assign({ district: D, desc: def && def.desc }, p));
      };
      const S = GATE.street;
      const L = LOT;
      const st9 = GATE.stages[3];
      add('sunreel_gate', { name: 'Sunreel Studios gate', x: GATE.x1 + 4, z: S.z1 + 6, yaw: -Math.PI / 2, kind: 'street', landmark: true });
      add('sunreel_backlot', { name: 'Sunreel Backlot', x: -950, z: L.z0 + 8, yaw: 0, kind: 'street', landmark: true });
      add('sunreel_western_set', { name: 'The Western Set', x: -950, z: 550, yaw: Math.PI, kind: 'street', landmark: true });
      add('sunreel_city_set', { name: 'The city street set', x: -950, z: 280, yaw: 0, kind: 'street' });
      add('sunreel_prop_yard', { name: 'The prop yard', x: -1000, z: 388, yaw: -Math.PI / 2, kind: 'warehouse' });
      add('stage_nine', { name: 'Sound Stage 9', x: (st9.open.x0 + st9.open.x1) / 2, z: st9.z0 - 8, yaw: 0, kind: 'warehouse' });
      add('city_set_ramp', { name: "The ramp at Miller's Fine Hats", x: -912, z: (L.cross.z0 + L.cross.z1) / 2, yaw: -Math.PI / 2, kind: 'street' });
      add('subway_ramp', { name: 'The ramp over the subway entrance', x: (L.subway.x0 + L.subway.x1) / 2, z: L.subway.z0 - 34, y: KERB + 0.15, yaw: 0, kind: 'street' });
      add('fake_bank', { name: 'The fake bank', x: -953, z: (L.bank.win[0] + L.bank.win[1]) / 2, yaw: -Math.PI / 2, kind: 'bank' });
      add('camera_mark', { name: 'The chalk mark by the camera crane', x: L.mark.x, z: L.mark.z, yaw: -Math.PI / 2, kind: 'street' });
      const v = world.westernVane;
      if (v) add('sheriff_roof', { name: "The sheriff's office roof", x: v.x + 3, z: v.z + 1, y: v.y, yaw: -Math.PI / 2, kind: 'rooftop' });
      const extra = places.extra[D];
      if (extra) {
        extra.push(
          { x: -706, z: 346, yaw: Math.PI, kinds: ['parking', 'diner', 'street'], name: "Stage 9's base camp" },
          { x: -690, z: 300, yaw: 0, kinds: ['office', 'storefront', 'street'], name: 'The studio offices' },
          { x: -808, z: 330, yaw: Math.PI, kinds: ['warehouse', 'garage', 'alley'], name: 'Between the sound stages' },
          { x: -711, z: 410, yaw: Math.PI / 2, kinds: ['parking', 'garage'], name: 'The studio car park' },
          { x: -975, z: 540, yaw: Math.PI, kinds: ['bar', 'storefront', 'diner'], name: 'The Golden Spur Saloon' },
          { x: -1000, z: 558, yaw: 0, kinds: ['street', 'corner', 'alley'], name: 'The western street' },
          { x: -930, z: 560, yaw: Math.PI, kinds: ['corner', 'street'], name: 'By the water trough' },
          { x: -1010, z: 330, yaw: -Math.PI / 2, kinds: ['warehouse', 'alley', 'garage'], name: 'Behind the city fronts' },
          { x: -900, z: 400, yaw: 0, kinds: ['parking', 'construction'], name: 'The backlot lot' },
        );
      }
    },
    System: SunreelLife,
  });
})();
