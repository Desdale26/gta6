/*
 * districts/cindercreek.js — Cinder Creek, the dusty edge of town west of
 * the city, north of Meridian West (VICEHAVEN 3.0).
 *
 *   starview_drivein   the Starview Drive-In: a big screen (showing a
 *                      sunset western after dark), seven rows of speaker
 *                      posts for parked cars, the projection booth and
 *                      snack bar in the middle, a ticket hut at the gate
 *   cinder_storage     Cinder Creek Self Storage: four rows of roll-up
 *                      units behind a chain-link fence, the auction yard,
 *                      and lot 17 (the hunt's HQ: open, a bulb, a table);
 *                      south of it the Tumbleweed Acres trailer park with
 *                      Chet's silver trailer and the old water tower (a
 *                      stair up to the catwalk and its valve wheels)
 *   cinder_truckstop   the truck stop on Westgate Parkway: a diesel
 *                      canopy, the Ember Diner, a truck park with parked
 *                      trailers; behind it a row of lock-ups and the
 *                      Creekside Salvage junk yard with stacked wrecks
 *
 * Static parts are merged into the chunk builders (VH.WNKit); no meshes of
 * their own apart from the signs.
 */
(function () {
  'use strict';

  const VH = window.VH;
  const K = () => VH.WNKit;
  const KERB = 0.15;
  const F = () => VH.COLLIDE;
  const D = 'cindercreek';

  // ---------------------------------------------------------------- plan
  // The drive-in (plot -1043..-857, -653..-447; gate on Cinder Road, north).
  const DI = {
    x0: -1043, x1: -857, z0: -653, z1: -447,
    gate: { x0: -966, x1: -934 },
    screen: { x0: -978, x1: -922, z: -462, y0: 5, y1: 24 },
    rows: [-632, -614, -596, -578, -538, -520, -502],
    booth: { x0: -963, x1: -937, z0: -566, z1: -550, h: 4.4 },
    rowX0: -1030, rowX1: -870,
  };
  // Self storage (north part of the storage plot) and the trailer park (south).
  const ST = {
    x0: -1043, x1: -857, z0: -433, z1: -322,
    gate: { x0: -910, x1: -886 },
    office: { x0: -880, x1: -861, z0: -428, z1: -413 },
    unitW: 5, ux0: -1032, ux1: -907,
    rows: [
      { z0: -419, z1: -412, doors: ['s'] },
      { z0: -400, z1: -386, doors: ['n', 's'] },
      { z0: -374, z1: -360, doors: ['n', 's'] },
      { z0: -348, z1: -341, doors: ['n'] },
    ],
    lot17: { x0: -952, x1: -947, z0: -393, z1: -386 }, // south side of row B, door on z -386
    auction: { x0: -1036, x1: -985, z0: -337, z1: -325 },
  };
  const TP = {
    x0: -1043, x1: -857, z0: -318, z1: -207,
    laneZ: -262, laneX: -948,
    tower: { x: -1018, z: -302 },
    chet: { x: -896, z: -230, len: 13 },
  };
  // The truck stop (plot -843..-647, -433..-207; front on Westgate Parkway, east).
  const TS = {
    canopy: { x0: -736, x1: -676, z0: -418, z1: -374, h: 6.6 },
    diner: { x0: -722, x1: -668, z0: -306, z1: -280, h: 4.6 },
    truckPark: { x0: -840, x1: -748, z0: -431, z1: -338 },
    lockups: { x0: -838, x1: -770, z0: -330, z1: -321, n: 8, open: 5 },
    junk: { x0: -840, x1: -748, z0: -306, z1: -211 },
    pole: { x: -654, z: -350 },
  };

  // --------------------------------------------------------------- pieces
  /** A trailer home: a long box with a window band, a door, an awning and a little deck. */
  function trailer(world, x, z, len, hex, o) {
    o = o || {};
    const ctx = world.ctxAt(x, z);
    const w = 3.8;
    const x0 = x - len / 2, x1 = x + len / 2;
    const z0 = z - w / 2, z1 = z + w / 2;
    const y0 = KERB + 0.6, y1 = y0 + 3.0;
    const body = VH.col(hex);
    ctx.prop.box(x0, y0, z0, x1, y1, z1, body);
    // Rounded-ish ends: a narrower cap at each end.
    ctx.prop.box(x0 - 0.35, y0 + 0.25, z0 + 0.35, x0, y1 - 0.25, z1 - 0.35, body);
    ctx.prop.box(x1, y0 + 0.25, z0 + 0.35, x1 + 0.35, y1 - 0.25, z1 - 0.35, body);
    // Skirt, roof strip, trim band.
    ctx.propMatte.box(x0 + 0.2, KERB, z0 + 0.2, x1 - 0.2, y0, z1 - 0.2, VH.col(0x7d7466));
    ctx.prop.box(x0 + 0.3, y1, z0 + 0.4, x1 - 0.3, y1 + 0.18, z1 - 0.4, VH.colMul(body, 0.85));
    ctx.prop.box(x0 - 0.02, y0 + 0.75, z0 - 0.02, x1 + 0.02, y0 + 0.95, z1 + 0.02, VH.col(o.trim || 0x2f4f6f));
    // Windows (both long sides), one of them lit at night.
    const glass = VH.col(0x26323e);
    for (let a = x0 + 1.2; a < x1 - 1.6; a += 2.6) {
      const lit = o.lit && Math.abs(a - x) < 2;
      for (const s of [-1, 1]) {
        const zz = s < 0 ? z0 - 0.04 : z1 + 0.04;
        (lit ? ctx.screen : ctx.prop).box(a, y0 + 1.25, Math.min(zz, zz + s * 0.02), a + 1.4, y0 + 2.25, Math.max(zz, zz + s * 0.02), lit ? VH.col(0xffd9a0, 0.9) : glass);
      }
    }
    // Door on the lane side (dz: which side faces the lane) with steps.
    const s = o.side || 1;
    const dz = s > 0 ? z1 : z0;
    const dx = x + len * 0.2;
    ctx.prop.box(dx - 0.5, y0, dz - 0.06, dx + 0.5, y0 + 2.1, dz + 0.06, VH.col(o.door || 0xe9e4d8));
    ctx.wood.box(dx - 0.9, KERB, Math.min(dz, dz + s * 1.6), dx + 0.9, KERB + 0.3, Math.max(dz, dz + s * 1.6), VH.col(0x8b6a45));
    ctx.wood.box(dx - 0.9, KERB, Math.min(dz + s * 1.6, dz + s * 2.3), dx + 0.9, KERB + 0.15, Math.max(dz + s * 1.6, dz + s * 2.3), VH.col(0x8b6a45));
    // Striped awning over the door side.
    const aw0 = x - len * 0.35, aw1 = x + len * 0.42;
    for (let a = aw0, k = 0; a < aw1; a += 1.0, k++) {
      K().tiltBox(ctx.propMatte, a + 0.5, y1 - 0.45, dz + s * 1.1, 1.0, 0.08, 2.2, 0, s * 0.22, k % 2 ? 0xf4efe2 : o.awning || 0x3f8f6f);
    }
    for (const ax of [aw0 + 0.2, aw1 - 0.2]) ctx.prop.box(ax - 0.04, KERB, dz + s * 2.1 - 0.04, ax + 0.04, y1 - 0.7, dz + s * 2.1 + 0.04, VH.col(0xcfd3d6));
    world.physics.addBox(x0 - 0.35, 0, z0, x1 + 0.35, y1 + 0.2, z1, 'metal');
    // The door steps.
    world.physics.addBox(dx - 0.9, 0, Math.min(dz, dz + s * 1.6), dx + 0.9, KERB + 0.3, Math.max(dz, dz + s * 1.6), 'plank', F().SOLID);
  }

  /** A wrecked car body (a squashed box with a cabin), for stacks in the junk yard. */
  function wreck(ctx, x, y, z, yaw, hex) {
    const c = VH.col(hex);
    ctx.propMatte.orientedBox(x, z, 2.1, 0.95, yaw, y, y + 0.75, c);
    ctx.propMatte.orientedBox(x - Math.cos(yaw) * 0.2, z + Math.sin(yaw) * 0.2, 1.0, 0.85, yaw, y + 0.75, y + 1.15, VH.colMul(c, 0.8));
  }

  /** A roll-up door (painted box) on a unit face. side: 'n' or 's'. */
  function rollDoor(ctx, x0, x1, z, side, hex, h) {
    const s = side === 's' ? 1 : -1;
    const zz = z + s * 0.05;
    ctx.prop.box(x0 + 0.5, KERB, Math.min(z, zz), x1 - 0.5, KERB + (h || 2.6), Math.max(z, zz), VH.col(hex));
    // Ribs.
    for (let y = KERB + 0.4; y < KERB + (h || 2.6); y += 0.45) ctx.prop.box(x0 + 0.5, y, Math.min(z, zz + s * 0.03), x1 - 0.5, y + 0.05, Math.max(z, zz + s * 0.03), VH.colMul(VH.col(hex), 0.8));
  }

  // ------------------------------------------------------------ drive-in
  function buildDriveIn(world) {
    const W = K();
    const c = DI;
    W.pave(world, c.x0, c.z0, c.x1, c.z1, 0x8c8577);
    // The entry lane, darker tarmac from the gate to the first row.
    W.pave(world, c.gate.x0, c.z0, c.gate.x1, c.rows[0] - 4, 0x55524c, 'asphaltTop', KERB + 0.016);
    W.mark(world, -950.15, c.z0 + 2, -949.85, c.rows[0] - 6, 0xf2d34a);
    // Ticket hut on an island between the in and out lanes.
    {
      const ctx = world.ctxAt(-950, -642);
      ctx.concrete.box(-951.6, KERB, -647, -948.4, KERB + 0.25, -636, VH.col(0xe8e2d4));
      W.solid(world, ctx.b, -951.2, KERB + 0.25, -644.5, -948.8, KERB + 2.9, -640.5, 0xf2ead8, null, 'building');
      ctx.screen.box(-951.25, KERB + 1.3, -644, -948.75, KERB + 2.3, -641, VH.col(0xfff0c8, 0.7));
      ctx.prop.box(-952, KERB + 2.9, -645.3, -948, KERB + 3.15, -639.7, VH.col(0xd23a3a));
      // Barrier arms.
      ctx.prop.box(-962, KERB + 0.95, -640.15, -951.6, KERB + 1.08, -639.85, VH.col(0xf4f4ef));
      ctx.prop.box(-948.4, KERB + 0.95, -646.15, -938, KERB + 1.08, -645.85, VH.col(0xf4f4ef));
    }
    // Fence all round, open at the gate.
    W.fence(world, c.x0 + 1, c.z0 + 1, c.x1 - 1, c.z0 + 1, [[c.gate.x0, c.gate.x1]], 'wood', 2.2);
    W.fence(world, c.x0 + 1, c.z1 - 1, c.x1 - 1, c.z1 - 1, [], 'wood', 2.2);
    W.fence(world, c.x0 + 1, c.z0 + 1, c.x0 + 1, c.z1 - 1, [], 'wood', 2.2);
    W.fence(world, c.x1 - 1, c.z0 + 1, c.x1 - 1, c.z1 - 1, [], 'wood', 2.2);

    // The screen: a white face on a steel frame, a picture painted on in
    // emissive colours (a desert sunset and a rider), lit after dark.
    const S = c.screen;
    const sc = world.ctxAt((S.x0 + S.x1) / 2, S.z);
    const steel = VH.col(0x5e646b);
    sc.b.box(S.x0 - 1, KERB, S.z, S.x1 + 1, S.y1 + 1, S.z + 1.2, VH.col(0xd9d4c8), { skip: { n: true } });
    sc.b.box(S.x0 - 1, S.y0 - 1, S.z - 0.2, S.x1 + 1, S.y0, S.z, VH.col(0x2b2f35));
    sc.b.box(S.x0 - 1, S.y1, S.z - 0.2, S.x1 + 1, S.y1 + 1, S.z, VH.col(0x2b2f35));
    const scr = (x0, y0, x1, y1, hex, k) => sc.screen.box(x0, y0, S.z - 0.12, x1, y1, S.z - 0.02, VH.col(hex, k || 0.9));
    const sy = S.y1 - S.y0;
    scr(S.x0, S.y0 + sy * 0.55, S.x1, S.y1, 0xf0a65a, 0.85);
    scr(S.x0, S.y0 + sy * 0.4, S.x1, S.y0 + sy * 0.55, 0xe9784a, 0.85);
    scr(S.x0, S.y0, S.x1, S.y0 + sy * 0.4, 0x8a5a3a, 0.7);
    // The sun, mesas and a rider on a horse.
    sc.screen.box(-944, S.y0 + sy * 0.5, S.z - 0.16, -936, S.y0 + sy * 0.72, S.z - 0.1, VH.col(0xffe9a8, 1.2));
    sc.screen.box(-976, S.y0 + sy * 0.4, S.z - 0.16, -962, S.y0 + sy * 0.62, S.z - 0.1, VH.col(0x5a3428, 0.6));
    sc.screen.box(-930, S.y0 + sy * 0.4, S.z - 0.16, -924, S.y0 + sy * 0.55, S.z - 0.1, VH.col(0x5a3428, 0.6));
    for (const [x0, y0, x1, y1] of [[-955, 0.18, -948, 0.3], [-954, 0.08, -953, 0.18], [-950, 0.08, -949, 0.18], [-951.5, 0.3, -950, 0.42], [-948, 0.27, -946.5, 0.36]]) {
      sc.screen.box(x0, S.y0 + sy * y0, S.z - 0.18, x1, S.y0 + sy * y1, S.z - 0.12, VH.col(0x1b1410, 0.5));
    }
    // The frame behind: posts and braces.
    for (let x = S.x0; x <= S.x1 + 0.1; x += (S.x1 - S.x0) / 4) {
      sc.prop.box(x - 0.3, KERB, S.z + 1.2, x + 0.3, S.y1 + 1, S.z + 1.8, steel);
      W.beam(sc.prop, x, KERB, S.z + 9, x, S.y1 - 3, S.z + 1.8, 0.35, steel);
      sc.concrete.box(x - 0.8, 0, S.z + 8.4, x + 0.8, KERB + 0.4, S.z + 9.6, VH.col(0xb8b2a6));
    }
    world.physics.addBox(S.x0 - 1, 0, S.z - 0.2, S.x1 + 1, S.y1 + 1, S.z + 1.8, 'building');
    // A low grass bank under the screen, a playground swing set in front.
    W.pave(world, S.x0 - 8, S.z - 12, S.x1 + 8, c.z1 - 2, 0xffffff, 'grassTop', KERB + 0.02);
    for (const x of [-990, -912]) {
      const ctx = world.ctxAt(x, -470);
      for (const dx of [-2.2, 2.2]) {
        W.beam(ctx.prop, x + dx, KERB, -471, x + dx, KERB + 2.6, -470, 0.1, 0xd84a3a);
        W.beam(ctx.prop, x + dx, KERB, -469, x + dx, KERB + 2.6, -470, 0.1, 0xd84a3a);
      }
      ctx.prop.box(x - 2.3, KERB + 2.55, -470.08, x + 2.3, KERB + 2.7, -469.92, VH.col(0xd84a3a));
      for (const dx of [-1, 1]) ctx.propMatte.box(x + dx - 0.3, KERB + 0.5, -470.15, x + dx + 0.3, KERB + 0.56, -469.85, VH.col(0x2b2f35));
    }

    // The rows: a painted line, speaker posts (glowing heads after dark) and
    // a lamp at each end.
    for (const z of c.rows) {
      W.mark(world, c.rowX0, z - 0.1, c.rowX1, z + 0.1, 0xe8e2d0);
      for (let x = c.rowX0 + 4; x <= c.rowX1 - 4; x += 7) {
        if (z > c.booth.z0 - 12 && z < c.booth.z1 + 12 && x > c.booth.x0 - 3 && x < c.booth.x1 + 3) continue;
        if (x > c.gate.x0 && x < c.gate.x1 && z === c.rows[0]) continue;
        const ctx = world.ctxAt(x, z);
        ctx.prop.box(x - 0.07, KERB, z - 0.07, x + 0.07, KERB + 1.25, z + 0.07, VH.col(0x6e747a));
        ctx.prop.box(x - 0.42, KERB + 1.0, z - 0.14, x + 0.42, KERB + 1.32, z + 0.14, VH.col(0x8f969c));
        ctx.screen.box(x - 0.06, KERB + 1.38, z - 0.06, x + 0.06, KERB + 1.5, z + 0.06, VH.col(0x7dffb2, 1.6));
      }
      for (const x of [c.rowX0 - 4, c.rowX1 + 4]) world.addProp('streetlight', x, KERB, z, x < -950 ? Math.PI / 2 : -Math.PI / 2, 1);
    }

    // Projection booth and snack bar: a concrete hut, the projector port
    // facing the screen, a striped awning over the counter, a festoon.
    {
      const B = c.booth;
      const ctx = world.ctxAt((B.x0 + B.x1) / 2, (B.z0 + B.z1) / 2);
      W.building(world, B.x0, B.z0, B.x1, B.z1, B.h, { wall: 0xe9e1cf, roof: 0x8d8a84, style: 0, parapet: 0.5 });
      // Upper box (the projection room) and its port.
      W.solid(world, ctx.b, B.x0 + 8, KERB + B.h, B.z0 + 3, B.x1 - 8, KERB + B.h + 2.6, B.z1 - 2, 0xd6cdb8, null, 'building');
      ctx.prop.box(-951.2, KERB + B.h + 1.0, B.z1 - 2.06, -948.8, KERB + B.h + 2.0, B.z1 - 1.96, VH.col(0x111418));
      ctx.screen.box(-950.4, KERB + B.h + 1.3, B.z1 - 2.12, -949.6, KERB + B.h + 1.7, B.z1 - 2.06, VH.col(0xfff6d8, 2.5));
      // Snack counter on the north side (facing the cars coming in).
      ctx.screen.box(B.x0 + 4, KERB + 1.1, B.z0 - 0.08, B.x1 - 4, KERB + 2.5, B.z0 - 0.02, VH.col(0xfff0c8, 0.85));
      ctx.prop.box(B.x0 + 3.6, KERB + 0.95, B.z0 - 0.7, B.x1 - 3.6, KERB + 1.1, B.z0, VH.col(0xb02b2b));
      for (let x = B.x0 + 3, k = 0; x < B.x1 - 3; x += 1.2, k++) W.tiltBox(ctx.propMatte, x + 0.6, KERB + 3.2, B.z0 - 1.2, 1.2, 0.08, 2.6, 0, 0.3, k % 2 ? 0xf4efe2 : 0xc8302c);
      W.festoon(world, B.x0 - 6, KERB + 4, B.z0 - 6, B.x1 + 6, KERB + 4, B.z0 - 6, 0.6, [0xffd24a, 0xff6a5a, 0x7ad7ff], 1.8);
      for (const x of [B.x0 - 6, B.x1 + 6]) ctx.prop.box(x - 0.08, KERB, B.z0 - 6.08, x + 0.08, KERB + 4.1, B.z0 - 5.92, VH.col(0x6e747a));
      // Picnic tables.
      for (const x of [B.x0 - 2, B.x1 + 2]) {
        ctx.wood.box(x - 1.2, KERB + 0.72, B.z0 - 4.6, x + 1.2, KERB + 0.8, B.z0 - 3.6, VH.col(0x9a7650));
        for (const dz of [-5.1, -3.1]) ctx.wood.box(x - 1.2, KERB + 0.42, B.z0 + dz - 0.2, x + 1.2, KERB + 0.48, B.z0 + dz + 0.2, VH.col(0x9a7650));
        ctx.wood.box(x - 0.1, KERB, B.z0 - 4.6, x + 0.1, KERB + 0.72, B.z0 - 3.6, VH.col(0x6b4e33));
      }
    }
    // The marquee by the gate (two-sided: Cinder Road both ways).
    W.sign(world, { x: -920, y: 7.2, z: -650, yaw: Math.PI, w: 14, h: 4.2, lines: ['STARVIEW DRIVE-IN', 'TONIGHT: SADDLE OF THE SUN'], style: 'neon', posts: true });
    // The back of the screen faces Starview Road.
    W.sign(world, { x: (S.x0 + S.x1) / 2, y: 15, z: S.z + 1.32, yaw: 0, w: 30, h: 5, lines: ['STARVIEW', 'Drive-In Cinema · Since 1958'], style: 'welcome', oneSided: true });
  }

  // ------------------------------------------------------- self storage
  function buildStorage(world) {
    const W = K();
    const s = ST;
    W.pave(world, s.x0, s.z0, s.x1, s.z1, 0x77746e);
    W.fence(world, s.x0 + 1, s.z0 + 2, s.x1 - 22, s.z0 + 2, [[s.gate.x0, s.gate.x1]], 'chain', 2.4);
    W.fence(world, s.x0 + 1, s.z1, s.x1 - 1, s.z1, [], 'chain', 2.4);
    W.fence(world, s.x0 + 1, s.z0 + 2, s.x0 + 1, s.z1, [], 'chain', 2.4);
    W.fence(world, s.x1 - 1, s.office.z1 + 0.5, s.x1 - 1, s.z1, [], 'chain', 2.4);
    // The office at the gate, its keypad post.
    W.building(world, s.office.x0, s.office.z0, s.office.x1, s.office.z1, 3.8, { wall: 0xe6dccb, roof: 0x8d8a84, style: 4, ww: 0.75, wh: 0.55, bay: 3.2, floorH: 3.8, sides: { e: 'blank', s: 'blank' } });
    {
      const ctx = world.ctxAt(s.gate.x0, s.z0);
      ctx.prop.box(s.gate.x1 + 0.8, KERB, s.z0 + 6, s.gate.x1 + 1.1, KERB + 1.3, s.z0 + 6.3, VH.col(0x5a5f66));
      ctx.screen.box(s.gate.x1 + 0.75, KERB + 1.0, s.z0 + 6.05, s.gate.x1 + 0.8, KERB + 1.25, s.z0 + 6.25, VH.col(0x7dffb2, 1.4));
      ctx.prop.box(s.gate.x0, KERB + 0.95, s.z0 + 1.9, s.gate.x1 - 6, KERB + 1.08, s.z0 + 2.1, VH.col(0xf2c500));
    }
    W.sign(world, { x: -870, y: 4.4, z: s.z0 - 1.5, yaw: Math.PI, w: 12, h: 2.6, lines: ['CINDER CREEK', 'SELF STORAGE · 24 HR ACCESS'], style: 'info', posts: true, colors: { bg: ['#d9772b', '#b85e22'], fg: '#ffffff', bar: '#2b2f35' } });

    // The unit rows: orange roll-up doors, a lamp over every fourth door.
    const doorHex = [0xd9772b, 0xd9772b, 0xd9772b, 0xc76a24];
    let row = 0;
    for (const r of s.rows) {
      const mid = r.z0 + (r.z1 - r.z0) / 2;
      for (let x = s.ux0; x < s.ux1 - 1e-6; x += 60) {
        const xa = x, xb = Math.min(s.ux1, x + 60);
        const ctx = world.ctxAt((xa + xb) / 2, mid);
        // Walls and roof (around lot 17's cavity on row B).
        const cut = row === 1 && s.lot17.x0 >= xa && s.lot17.x1 <= xb;
        const body = (a, b, z0, z1) => {
          ctx.b.box(a, KERB, z0, b, KERB + 3.2, z1, VH.col(0xe4ded2), { bottom: false });
          ctx.prop.box(a - 0.2, KERB + 3.2, z0 - 0.4, b + 0.2, KERB + 3.45, z1 + 0.4, VH.col(0x9aa0a6));
          world.physics.addBox(a, 0, z0, b, KERB + 3.45, z1, 'building');
        };
        if (cut) {
          body(xa, s.lot17.x0, r.z0, r.z1);
          body(s.lot17.x1, xb, r.z0, r.z1);
          body(s.lot17.x0, s.lot17.x1, r.z0, s.lot17.z0);
        } else body(xa, xb, r.z0, r.z1);
        for (let u = xa; u < xb - 1e-6; u += s.unitW) {
          for (const side of r.doors) {
            const zf = side === 's' ? r.z1 : r.z0;
            if (cut && side === 's' && u >= s.lot17.x0 - 0.1 && u < s.lot17.x1 - 0.1) continue;
            const k = Math.round((u - s.ux0) / s.unitW);
            rollDoor(ctx, u, u + s.unitW, zf, side, doorHex[(k + row) % 4]);
            if (k % 4 === 1) W.lamp(world, u + s.unitW / 2, zf + (side === 's' ? 0.25 : -0.25), 0xfff1c8, 2.2, 0.2, KERB + 3.0);
          }
        }
      }
      row++;
    }
    // Lot 17: open, a bare bulb, a folding table and two chairs, a pin board.
    {
      const L = s.lot17;
      const ctx = world.ctxAt(L.x0, L.z0);
      ctx.interior.topRect(L.x0, L.z0, L.x1, L.z1, KERB + 0.01, VH.col(0x8c8880));
      ctx.interior.box(L.x0, KERB, L.z0, L.x0 + 0.15, KERB + 3.2, L.z1, VH.col(0xcfc8ba));
      ctx.interior.box(L.x1 - 0.15, KERB, L.z0, L.x1, KERB + 3.2, L.z1, VH.col(0xcfc8ba));
      ctx.interior.box(L.x0, KERB + 3.1, L.z0, L.x1, KERB + 3.2, L.z1, VH.col(0xbfb8aa), { bottom: true });
      // The door, rolled up, its dent, the stencil.
      ctx.prop.box(L.x0 + 0.5, KERB + 2.55, L.z1 - 0.4, L.x1 - 0.5, KERB + 2.95, L.z1, VH.col(0xd9772b));
      ctx.prop.box(L.x0 + 0.2, KERB + 2.95, L.z1 - 0.05, L.x1 - 0.2, KERB + 3.2, L.z1 + 0.05, VH.col(0x9aa0a6));
      ctx.screen.box((L.x0 + L.x1) / 2 - 0.1, KERB + 2.7, (L.z0 + L.z1) / 2 - 0.1, (L.x0 + L.x1) / 2 + 0.1, KERB + 2.95, (L.z0 + L.z1) / 2 + 0.1, VH.col(0xffe2a0, 3));
      const tx = (L.x0 + L.x1) / 2, tz = L.z0 + 2.6;
      ctx.prop.box(tx - 1.0, KERB + 0.74, tz - 0.4, tx + 1.0, KERB + 0.78, tz + 0.4, VH.col(0xd8d4c8));
      for (const [ax, az] of [[-0.9, -0.3], [0.9, -0.3], [-0.9, 0.3], [0.9, 0.3]]) ctx.prop.box(tx + ax - 0.02, KERB, tz + az - 0.02, tx + ax + 0.02, KERB + 0.74, tz + az + 0.02, VH.col(0x5a5f66));
      for (const dx of [-0.7, 0.7]) {
        ctx.prop.box(tx + dx - 0.22, KERB + 0.45, tz + 0.75, tx + dx + 0.22, KERB + 0.5, tz + 1.15, VH.col(0x3a5f8a));
        ctx.prop.box(tx + dx - 0.22, KERB + 0.5, tz + 1.1, tx + dx + 0.22, KERB + 0.95, tz + 1.15, VH.col(0x3a5f8a));
      }
      ctx.propMatte.box(L.x0 + 0.16, KERB + 1.2, L.z0 + 1.2, L.x0 + 0.2, KERB + 2.3, L.z0 + 3.4, VH.col(0xb88a5a));
      for (const [y, z0] of [[1.5, 1.5], [1.9, 2.4], [1.4, 2.8]]) ctx.propMatte.box(L.x0 + 0.2, KERB + y, L.z0 + z0, L.x0 + 0.22, KERB + y + 0.3, L.z0 + z0 + 0.25, VH.col(0xf4f0e6));
      // Boxes stacked at the back.
      for (const [bx, by, h] of [[L.x0 + 0.9, 0, 0.6], [L.x0 + 0.9, 0.6, 0.5], [L.x1 - 1.1, 0, 0.7]]) ctx.propMatte.box(bx - 0.4, KERB + by, L.z0 + 0.3, bx + 0.4, KERB + by + h, L.z0 + 1.0, VH.col(0xb88a5a));
      W.sign(world, { x: (L.x0 + L.x1) / 2, y: KERB + 3.6, z: L.z1 + 0.42, yaw: 0, w: 2.6, h: 0.7, lines: ['17  BRASK'], style: 'info', oneSided: true, colors: { bg: ['#9aa0a6', '#8a9096'], fg: '#1a1a1a', bar: '#d9772b' } });
    }
    // The auction yard: an open corner with a trestle table, crates and a gazebo.
    {
      const A = s.auction;
      const ctx = world.ctxAt((A.x0 + A.x1) / 2, (A.z0 + A.z1) / 2);
      W.pave(world, A.x0, A.z0, A.x1, A.z1, 0x9a9282, 'asphaltTop', KERB + 0.016);
      const gx = A.x0 + 10, gz = (A.z0 + A.z1) / 2;
      for (const [dx, dz] of [[-3, -3], [3, -3], [3, 3], [-3, 3]]) ctx.prop.box(gx + dx - 0.05, KERB, gz + dz - 0.05, gx + dx + 0.05, KERB + 2.5, gz + dz + 0.05, VH.col(0xcfd3d6));
      W.gable(ctx.propMatte, gx - 3.3, gz - 3.3, gx + 3.3, gz + 3.3, KERB + 2.5, 0.9, 'x', 0x2f6f9f);
      ctx.wood.box(gx - 2, KERB + 0.8, gz - 0.5, gx + 2, KERB + 0.86, gz + 0.5, VH.col(0x9a7650));
      for (let i = 0; i < 9; i++) {
        const cx = A.x0 + 20 + (i % 5) * 5.5, cz = A.z0 + 2 + Math.floor(i / 5) * 5;
        const h = 0.8 + (i % 3) * 0.4;
        W.solid(world, ctx.wood, cx - 1, KERB, cz - 1, cx + 1, KERB + h, cz + 1, i % 2 ? 0x9a7650 : 0x7d6040, null, 'crate', F().SOLID | F().SHOTS);
      }
    }
    // Lamps down the aisles.
    for (const z of [-405.5, -380, -354.5]) for (const x of [-1020, -965, -912]) world.addProp('streetlight', x, KERB, z, 0, 0.85);
  }

  // -------------------------------------------------------- trailer park
  function buildTrailerPark(world) {
    const W = K();
    const t = TP;
    W.pave(world, t.x0, t.z0, t.x1, t.z1, 0xb3a68c, 'asphaltTop', KERB + 0.01);
    // The lanes (tarmac) and little lawns.
    W.pave(world, t.x0 + 2, t.laneZ - 4, t.x1 - 2, t.laneZ + 4, 0x5a5751, 'asphaltTop', KERB + 0.016);
    W.pave(world, t.laneX - 4, t.laneZ, t.laneX + 4, t.z1, 0x5a5751, 'asphaltTop', KERB + 0.016);
    W.fence(world, t.x0 + 1, t.z1 - 1, t.x1 - 1, t.z1 - 1, [[t.laneX - 6, t.laneX + 6]], 'picket', 1.1);
    W.fence(world, t.x0 + 1, t.z0, t.x0 + 1, t.z1 - 1, [], 'picket', 1.1);
    W.fence(world, t.x1 - 1, t.z0, t.x1 - 1, t.z1 - 1, [], 'picket', 1.1);
    W.sign(world, { x: t.laneX + 10, y: 2.6, z: t.z1 - 2.5, yaw: 0, w: 7, h: 2.2, lines: ['TUMBLEWEED ACRES', 'Trailer park · Slow, kids at play'], style: 'park', posts: true, colors: { bg: ['#7a5a32', '#8d6c3c'] } });
    const cols = [0xe9e1cf, 0xb8d4cf, 0xf0d9a8, 0xd9b8b0, 0xcfd8e0, 0xe8e0a8, 0xc9d9b8];
    const awn = [0x3f8f6f, 0xc8302c, 0x2f6f9f, 0xd9772b];
    let k = 0;
    // North row (door side south, facing the lane) and south row (door side north).
    for (let x = t.x0 + 34; x < t.x1 - 10; x += 19) {
      if (Math.abs(x - t.laneX) < 9) continue;
      trailer(world, x, t.laneZ - 12, 13, cols[k % cols.length], { side: 1, awning: awn[k % 4], lit: k % 3 === 0 });
      k++;
    }
    for (let x = t.x0 + 12; x < t.x1 - 10; x += 19) {
      if (Math.abs(x - t.laneX) < 9 || Math.abs(x - t.chet.x) < 12) continue;
      trailer(world, x, t.laneZ + 14, 13, cols[k % cols.length], { side: -1, awning: awn[k % 4], lit: k % 2 === 0 });
      k++;
    }
    // Chet Valiant's silver trailer: a gold star on the door, a deckchair, his cardboard self.
    {
      const C = t.chet;
      trailer(world, C.x, C.z, C.len, 0xc9ced3, { side: -1, trim: 0xb8962e, awning: 0xb8962e, lit: true, door: 0xc9ced3 });
      const ctx = world.ctxAt(C.x, C.z);
      const dx = C.x + C.len * 0.2, dz = C.z - 1.9 - 0.07;
      // The star: two crossed diamonds.
      for (const r of [0, Math.PI / 4]) {
        _rot(ctx.prop, dx, KERB + 2.3, dz - 0.02, 0.5, r, 0xf2c500);
      }
      // Deckchair.
      const cx = C.x - 2, cz = C.z - 5;
      W.tiltBox(ctx.propMatte, cx, KERB + 0.55, cz, 0.6, 0.05, 1.1, 0, -0.9, 0xc8302c);
      W.tiltBox(ctx.propMatte, cx, KERB + 0.3, cz + 0.4, 0.6, 0.05, 0.8, 0, 0.2, 0xf4efe2);
      // The cut-out: a flat painted man with a big grin.
      const ox = C.x + 4.5, oz = C.z - 4.6;
      ctx.propMatte.box(ox - 0.3, KERB, oz - 0.02, ox + 0.3, KERB + 1.2, oz + 0.02, VH.col(0x2b3b5a));
      ctx.propMatte.box(ox - 0.35, KERB + 1.2, oz - 0.02, ox + 0.35, KERB + 1.65, oz + 0.02, VH.col(0xf2f0ea));
      ctx.propMatte.box(ox - 0.17, KERB + 1.65, oz - 0.02, ox + 0.17, KERB + 2.0, oz + 0.02, VH.col(0xe0b090));
      ctx.propMatte.box(ox - 0.2, KERB + 2.0, oz - 0.02, ox + 0.2, KERB + 2.12, oz + 0.02, VH.col(0x5a3a1a));
      ctx.propMatte.box(ox - 0.12, KERB, oz + 0.02, ox + 0.12, KERB + 1.0, oz + 0.25, VH.col(0x8a6a48));
      // A barbecue and a flamingo.
      ctx.prop.cylinder(C.x - 4.5, KERB + 0.7, cz, 0.4, 0.35, 0.35, 10, VH.col(0x1b1d20), true);
      for (const [a, b] of [[-0.25, -0.2], [0.25, -0.2], [0, 0.25]]) ctx.prop.box(C.x - 4.5 + a - 0.02, KERB, cz + b - 0.02, C.x - 4.5 + a + 0.02, KERB + 0.72, cz + b + 0.02, VH.col(0x1b1d20));
      ctx.propMatte.box(C.x + 7, KERB, C.z - 4.02, C.x + 7.04, KERB + 0.7, C.z - 3.98, VH.col(0xff7fae));
      ctx.propMatte.box(C.x + 6.8, KERB + 0.7, C.z - 4.1, C.x + 7.2, KERB + 0.95, C.z - 3.9, VH.col(0xff7fae));
    }
    // Washing lines, bins and a few lamps along the lane.
    for (let x = t.x0 + 20; x < t.x1 - 10; x += 38) {
      W.festoon(world, x, KERB + 2.0, t.laneZ - 21, x + 9, KERB + 2.0, t.laneZ - 21, 0.25, [0xf4f4ef, 0x7ab0e0, 0xf0c040, 0xe86a6a], 0.9);
      const ctx = world.ctxAt(x, t.laneZ - 21);
      for (const xx of [x, x + 9]) ctx.prop.box(xx - 0.05, KERB, t.laneZ - 21.05, xx + 0.05, KERB + 2.1, t.laneZ - 20.95, VH.col(0x9aa0a6));
    }
    for (let x = t.x0 + 8; x < t.x1; x += 40) world.addProp('streetlight', x, KERB, t.laneZ - 5, 0, 0.85);
    world.addProp('streetlight', t.laneX + 5, KERB, t.z1 - 20, -Math.PI / 2, 0.85);

    // The water tower, silver, with a stair up to the catwalk; two valve
    // wheels on the catwalk (the old brass one and a new red one).
    const T = t.tower;
    const wt = K().waterTower(world, T.x, T.z, { h: 20, r: 5.5, th: 8, tank: 0xc9ced3, cap: 0xaab0b6, stair: true });
    world.cinderTower = { x: T.x, z: T.z, catwalkY: wt.catwalkY, stairFoot: wt.stairFoot, r: 5.5 + 1.4 };
    {
      const ctx = world.ctxAt(T.x, T.z);
      const y = wt.catwalkY;
      const vz = T.z + 5.5 + 0.1;
      for (const [vx, hex] of [[T.x - 2.2, 0xc9a040], [T.x + 2.2, 0xd23a3a]]) {
        ctx.prop.box(vx - 0.1, y, vz - 0.1, vx + 0.1, y + 0.9, vz + 0.35, VH.col(0x5a5f66));
        ctx.prop.cylinder(vx, y + 0.9, vz + 0.42, 0.42, 0.42, 0.08, 12, VH.col(hex), true);
        ctx.prop.box(vx - 0.42, y + 0.92, vz + 0.4, vx + 0.42, y + 0.98, vz + 0.46, VH.col(hex));
      }
      // The town's name painted on the tank (a band of letters is one sign).
      W.sign(world, { x: T.x, y: y + 4.6, z: T.z + 5.62, yaw: 0, w: 8, h: 1.6, lines: ['CINDER CREEK'], style: 'info', oneSided: true, colors: { bg: ['#c9ced3', '#c9ced3'], fg: '#2f4f6f', bar: '#c9ced3' } });
    }
  }

  /** A flat square turned by r about the Z axis (for the star). */
  function _rot(surf, x, y, z, size, r, hex) {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), r), new THREE.Vector3(size, size, 0.04));
    surf.merge(new THREE.BoxGeometry(1, 1, 1), m, VH.col(hex));
  }

  // ---------------------------------------------------------- truck stop
  function buildTruckStop(world) {
    const W = K();
    const P = { x0: -843, x1: -647, z0: -433, z1: -207 };
    W.pave(world, P.x0, P.z0, P.x1, P.z1, 0x5c5a55);
    // Fuel canopy over three islands of diesel pumps.
    const C = TS.canopy;
    {
      const ctx = world.ctxAt((C.x0 + C.x1) / 2, (C.z0 + C.z1) / 2);
      const red = VH.col(0xc8302c);
      ctx.b.box(C.x0, KERB + C.h, C.z0, C.x1, KERB + C.h + 1.3, C.z1, red, { bottom: true });
      ctx.prop.box(C.x0 - 0.05, KERB + C.h + 0.85, C.z0 - 0.05, C.x1 + 0.05, KERB + C.h + 1.05, C.z1 + 0.05, VH.col(0xf4f4ef));
      for (let x = C.x0 + 6; x < C.x1 - 2; x += 12) for (let z = C.z0 + 5; z < C.z1 - 2; z += 8.5) ctx.screen.box(x - 1.6, KERB + C.h - 0.06, z - 0.5, x + 1.6, KERB + C.h, z + 0.5, VH.col(0xf4f7ff, 1.8));
      for (const z of [C.z0 + 8, (C.z0 + C.z1) / 2, C.z1 - 8]) {
        ctx.concrete.box(C.x0 + 6, KERB, z - 1, C.x1 - 6, KERB + 0.25, z + 1, VH.col(0xe8e2d4));
        world.physics.addBox(C.x0 + 6, 0, z - 1, C.x1 - 6, KERB + 0.25, z + 1, 'kerb', F().SOLID);
        for (const x of [C.x0 + 12, C.x0 + 30, C.x1 - 12]) {
          ctx.prop.box(x - 0.15, KERB, z - 0.12, x + 0.15, KERB + C.h, z + 0.12, VH.col(0xd9d9d9));
          W.solid(world, ctx.prop, x - 0.7, KERB + 0.25, z - 0.45, x + 0.7, KERB + 2.0, z + 0.45, 0xf4f4ef, null, 'metal');
          ctx.prop.box(x - 0.72, KERB + 1.3, z - 0.47, x + 0.72, KERB + 1.75, z + 0.47, red);
          ctx.screen.box(x - 0.4, KERB + 1.0, z - 0.48, x + 0.4, KERB + 1.25, z + 0.48, VH.col(0x7dffb2, 1.2));
        }
      }
      W.sign(world, { x: C.x1 + 0.05, y: KERB + C.h + 0.55, z: (C.z0 + C.z1) / 2, yaw: Math.PI / 2, w: 22, h: 0.9, lines: ['DIESEL · OPEN ALL NIGHT'], style: 'info', oneSided: true, colors: { bg: ['#c8302c', '#a8231f'], fg: '#ffffff', bar: '#f4f4ef' } });
    }
    // The Ember Diner: a streamlined box with a chrome band, big windows,
    // red trim, a neon name on the roof edge.
    const Dn = TS.diner;
    {
      const ctx = W.building(world, Dn.x0, Dn.z0, Dn.x1, Dn.z1, Dn.h, { wall: 0xf1ead8, roof: 0x8d8a84, style: 4, ww: 0.86, wh: 0.5, bay: 2.6, floorH: Dn.h, sides: { n: 'blank', w: 'blank' } });
      ctx.prop.box(Dn.x0 - 0.06, KERB + 0.9, Dn.z0 - 0.06, Dn.x1 + 0.06, KERB + 1.15, Dn.z1 + 0.06, VH.col(0xc8302c));
      ctx.prop.box(Dn.x0 - 0.08, KERB + Dn.h - 0.6, Dn.z0 - 0.08, Dn.x1 + 0.08, KERB + Dn.h - 0.2, Dn.z1 + 0.08, VH.col(0xd8dde2));
      // Warm light in the windows after dark.
      ctx.screen.box(Dn.x0 + 1, KERB + 1.3, Dn.z1 + 0.02, Dn.x1 - 1, KERB + 3.0, Dn.z1 + 0.05, VH.col(0xffd9a0, 0.5));
      ctx.screen.box(Dn.x1 + 0.02, KERB + 1.3, Dn.z0 + 1, Dn.x1 + 0.05, KERB + 3.0, Dn.z1 - 1, VH.col(0xffd9a0, 0.5));
      // Entrance porch on the east end.
      ctx.prop.box(Dn.x1, KERB + 3.0, Dn.z0 + 8, Dn.x1 + 3, KERB + 3.25, Dn.z1 - 8, VH.col(0xc8302c), { bottom: true });
      W.sign(world, { x: (Dn.x0 + Dn.x1) / 2, y: KERB + Dn.h + 1.3, z: Dn.z1 - 1, yaw: 0, w: 18, h: 2.0, lines: ['THE EMBER DINER'], style: 'neon', oneSided: true, colors: { fg: '#ffb04a', glow: '#ff6a1a' } });
      for (const x of [Dn.x0 + 3, (Dn.x0 + Dn.x1) / 2, Dn.x1 - 3]) ctx.prop.box(x - 0.1, KERB + Dn.h, Dn.z1 - 1.1, x + 0.1, KERB + Dn.h + 0.4, Dn.z1 - 0.9, VH.col(0x2b2f35));
      // The car park in front of it.
      for (let x = Dn.x0 + 2; x <= Dn.x1; x += 3.2) W.mark(world, x - 0.07, Dn.z1 + 4, x + 0.07, Dn.z1 + 10, 0xf4f4ef);
    }
    // The pole sign on the parkway.
    W.sign(world, { x: TS.pole.x, y: 15, z: TS.pole.z, yaw: Math.PI / 2, w: 9, h: 5, lines: ['CINDER CREEK', 'TRUCK STOP', 'DIESEL · DINER · SHOWERS'], style: 'brand', posts: true, colors: { bg: ['#c8302c', '#8f1f1b'] } });

    // The truck park: diagonal bays and some parked trailers.
    const TPk = TS.truckPark;
    for (let z = TPk.z0 + 6; z < TPk.z1 - 4; z += 6) W.mark(world, TPk.x0 + 4, z - 0.08, TPk.x0 + 26, z + 0.08, 0xf4f4ef);
    for (let z = TPk.z0 + 6; z < TPk.z1 - 4; z += 6) W.mark(world, TPk.x1 - 26, z - 0.08, TPk.x1 - 4, z + 0.08, 0xf4f4ef);
    const trailerCols = [0xf4f4ef, 0x2f6f9f, 0xc8302c, 0xe8e0c8, 0x3f7a5a];
    let i = 0;
    for (const [xa, xb] of [[TPk.x0 + 5, TPk.x0 + 21], [TPk.x1 - 21, TPk.x1 - 5]]) {
      for (let z = TPk.z0 + 9; z < TPk.z1 - 4; z += 12) {
        if ((i * 7) % 3 === 0) { i++; continue; }
        const ctx = world.ctxAt((xa + xb) / 2, z);
        const col = trailerCols[i % trailerCols.length];
        W.solid(world, ctx.prop, xa, KERB + 1.2, z - 1.3, xb, KERB + 4.1, z + 1.3, col, { bottom: true }, 'metal');
        ctx.prop.box(xa + 0.4, KERB + 1.0, z - 1.25, xa + 0.6, KERB + 1.25, z + 1.25, VH.col(0x2b2f35));
        for (const xw of [xb - 3.5, xb - 2.2]) for (const s of [-1, 1]) ctx.prop.cylinder(xw, KERB + 0.55, z + s * 1.0, 0.55, 0.55, 0.35, 10, VH.col(0x1b1d20), true);
        // Landing legs at the front.
        ctx.prop.box(xa + 2.6, KERB, z - 0.9, xa + 2.8, KERB + 1.2, z + 0.9, VH.col(0x5a5f66));
        i++;
      }
    }
    for (const z of [-420, -385, -350]) world.addProp('streetlight', (TPk.x0 + TPk.x1) / 2, KERB, z, 0, 1);
    for (const z of [-400, -300, -230]) world.addProp('streetlight', -652, KERB, z, -Math.PI / 2, 1);

    // The lock-ups: a brick row facing the truck park, one door half up.
    const L = TS.lockups;
    {
      const ctx = world.ctxAt((L.x0 + L.x1) / 2, L.z0);
      const w = (L.x1 - L.x0) / L.n;
      const ox0 = L.x0 + L.open * w, ox1 = ox0 + w;
      for (const [a, b] of [[L.x0, ox0], [ox1, L.x1]]) {
        ctx.b.box(a, KERB, L.z0, b, KERB + 3.4, L.z1, VH.col(0x9a5a44));
        world.physics.addBox(a, 0, L.z0, b, KERB + 3.4, L.z1, 'building');
      }
      // The open one: walls, a roof, a gold car on axle stands inside.
      ctx.interior.box(ox0, KERB, L.z0, ox1, KERB + 3.4, L.z0 + 0.2, VH.col(0x8a5040));
      ctx.b.box(ox0, KERB + 3.2, L.z0, ox1, KERB + 3.4, L.z1, VH.col(0x9a5a44), { bottom: true });
      world.physics.addBox(ox0, 0, L.z0, ox1, KERB + 3.4, L.z0 + 0.2, 'building');
      world.physics.addBox(ox0, KERB + 3.2, L.z0, ox1, KERB + 3.4, L.z1, 'building');
      ctx.interior.topRect(ox0, L.z0, ox1, L.z1, KERB + 0.01, VH.col(0x6e6a64));
      ctx.prop.box(ox0 + 0.4, KERB + 1.6, L.z1 - 0.1, ox1 - 0.4, KERB + 3.2, L.z1, VH.col(0x8f969c));
      ctx.screen.box((ox0 + ox1) / 2 - 0.1, KERB + 2.9, L.z0 + 3, (ox0 + ox1) / 2 + 0.1, KERB + 3.15, L.z0 + 3.2, VH.col(0xffe2a0, 3));
      for (const s of [-1, 1]) for (const dz of [1.6, 6]) ctx.prop.box((ox0 + ox1) / 2 + s * 0.8 - 0.1, KERB, L.z0 + dz - 0.1, (ox0 + ox1) / 2 + s * 0.8 + 0.1, KERB + 0.5, L.z0 + dz + 0.1, VH.col(0xc8302c));
      const gx = (ox0 + ox1) / 2;
      ctx.prop.box(gx - 0.95, KERB + 0.5, L.z0 + 1.1, gx + 0.95, KERB + 1.2, L.z0 + 6.5, VH.col(0xd29a1c));
      ctx.prop.box(gx - 0.8, KERB + 1.2, L.z0 + 2.6, gx + 0.8, KERB + 1.65, L.z0 + 4.8, VH.col(0xd29a1c));
      ctx.prop.box(gx - 0.82, KERB + 1.25, L.z0 + 2.7, gx + 0.82, KERB + 1.6, L.z0 + 2.9, VH.col(0x26323e));
      for (let k = 0; k < L.n; k++) {
        if (k === L.open) continue;
        rollDoor(ctx, L.x0 + k * w, L.x0 + (k + 1) * w, L.z1, 's', k % 3 ? 0x7d838a : 0x5f7a8a, 2.8);
        if (k % 2) W.lamp(world, L.x0 + (k + 0.5) * w, L.z1 + 0.25, 0xfff1c8, 2.2, 0.2, KERB + 3.1);
      }
      W.lamp(world, gx, L.z1 + 0.25, 0xfff1c8, 2.4, 0.2, KERB + 3.25);
    }

    // Creekside Salvage: a corrugated fence, stacks of wrecks, tyre piles, a crane.
    const J = TS.junk;
    W.fence(world, J.x0 + 1, J.z0 + 1, J.x1, J.z0 + 1, [[J.x1 - 20, J.x1 - 8]], 'wood', 2.8);
    W.fence(world, J.x1, J.z0 + 1, J.x1, J.z1 - 1, [], 'wood', 2.8);
    W.fence(world, J.x0 + 1, J.z1 - 1, J.x1, J.z1 - 1, [], 'wood', 2.8);
    W.fence(world, J.x0 + 1, J.z0 + 1, J.x0 + 1, J.z1 - 1, [], 'wood', 2.8);
    W.pave(world, J.x0 + 1, J.z0 + 1, J.x1, J.z1 - 1, 0x7a6a55, 'asphaltTop', KERB + 0.016);
    W.sign(world, { x: J.x1 - 14, y: 5, z: J.z0 - 0.2, yaw: Math.PI, w: 10, h: 1.8, lines: ['CREEKSIDE SALVAGE', 'We buy wrecks · Parts sold'], style: 'brand', posts: true, colors: { bg: ['#d9a12b', '#b8801c'], fg: '#1a1a1a' } });
    const rust = [0x8a4a2a, 0x6e5a48, 0x4f6a7a, 0x9a3a2a, 0x7a7a6a, 0x5a6a3a, 0xa86a3a];
    let n = 0;
    for (let x = J.x0 + 8; x < J.x1 - 24; x += 7) {
      for (let z = J.z0 + 10; z < J.z1 - 6; z += 14) {
        const ctx = world.ctxAt(x, z);
        const h = 1 + ((n * 5) % 3);
        for (let k = 0; k < h; k++) wreck(ctx, x + (k % 2) * 0.3, KERB + k * 1.15, z, Math.PI / 2 + ((n + k) % 3 - 1) * 0.08, rust[(n + k) % rust.length]);
        world.physics.addBox(x - 1.2, 0, z - 2.3, x + 1.2, KERB + h * 1.15, z + 2.3, 'metal');
        n++;
      }
    }
    {
      // Tyre piles and the crane by the gate.
      const ctx = world.ctxAt(J.x1 - 14, J.z1 - 30);
      for (const [x, z] of [[J.x1 - 10, J.z0 + 30], [J.x1 - 16, J.z0 + 50], [J.x1 - 9, J.z1 - 14]]) {
        for (let k = 0; k < 6; k++) ctx.propMatte.cylinder(x + (k % 2) * 0.3, KERB + k * 0.32, z, 0.6, 0.6, 0.3, 10, VH.col(0x1b1d20), true);
        world.physics.addBox(x - 0.7, 0, z - 0.7, x + 0.7, KERB + 1.9, z + 0.7, 'metal', F().SOLID | F().SHOTS);
      }
      const cx = J.x1 - 16, cz = J.z1 - 32;
      W.solid(world, ctx.prop, cx - 2, KERB, cz - 3, cx + 2, KERB + 2.6, cz + 3, 0xd9a12b, null, 'metal');
      W.beam(ctx.prop, cx, KERB + 2.6, cz, cx - 12, KERB + 14, cz, 0.6, 0xd9a12b);
      ctx.prop.box(cx - 12.1, KERB + 7, cz - 0.03, cx - 11.9, KERB + 14, cz + 0.03, VH.col(0x2b2f35));
      ctx.prop.cylinder(cx - 12, KERB + 6.2, cz, 1.2, 1.2, 0.8, 10, VH.col(0x2b2f35), true);
      wreck(ctx, cx - 12, KERB + 4.6, cz, 0.4, 0x4f6a7a);
      world.addProp('streetlight', J.x1 - 6, KERB, J.z0 + 12, -Math.PI / 2, 1);
    }
  }

  // -------------------------------------------------------------- the map
  if (VH.MapPainters) {
    VH.MapPainters.push((g, layout, o) => {
      const p = layout.plots;
      if (!p || !p.starview_drivein) return;
      const R = o.R;
      const box = (x0, z0, x1, z1, col, sh) => K().mapBox(g, R, x0, z0, x1, z1, col, sh);
      // Drive-in: dusty lot, rows, the screen and the booth.
      box(DI.x0, DI.z0, DI.x1, DI.z1, '#a49c8a', false);
      g.fillStyle = 'rgba(244, 240, 228, 0.7)';
      for (const z of DI.rows) R(DI.rowX0, z - 0.6, DI.rowX1, z + 0.6);
      box(DI.screen.x0 - 1, DI.screen.z - 1, DI.screen.x1 + 1, DI.screen.z + 2, '#f4f0e4');
      box(DI.booth.x0, DI.booth.z0, DI.booth.x1, DI.booth.z1, '#c8302c');
      // Storage rows and the trailer park.
      box(ST.x0, ST.z0, ST.x1, ST.z1, '#8a8780', false);
      for (const r of ST.rows) box(ST.ux0, r.z0, ST.ux1, r.z1, '#d9772b');
      box(TP.x0, TP.z0, TP.x1, TP.z1, '#c2b494', false);
      g.fillStyle = '#6a6760';
      R(TP.x0 + 2, TP.laneZ - 4, TP.x1 - 2, TP.laneZ + 4);
      R(TP.laneX - 4, TP.laneZ, TP.laneX + 4, TP.z1);
      g.fillStyle = '#c9ced3';
      if (o.circle) o.circle(TP.tower.x, TP.tower.z, 6);
      // Truck stop.
      box(-843, -433, -647, -207, '#6c6a65', false);
      box(TS.canopy.x0, TS.canopy.z0, TS.canopy.x1, TS.canopy.z1, '#c8302c');
      box(TS.diner.x0, TS.diner.z0, TS.diner.x1, TS.diner.z1, '#e8e0c8');
      box(TS.lockups.x0, TS.lockups.z0, TS.lockups.x1, TS.lockups.z1, '#9a5a44');
      box(TS.junk.x0, TS.junk.z0, TS.junk.x1, TS.junk.z1, '#8a7860', false);
    });
  }

  // --------------------------------------------------------- moving parts
  /** Parked cars in the drive-in's back rows, the diner car park and the trailer park. */
  class CinderCreekLife {
    constructor(game) {
      this.game = game;
      const W = K();
      const list = [];
      let seed = 401;
      for (const z of [DI.rows[0], DI.rows[1], DI.rows[4]]) {
        for (let x = DI.rowX0 + 7.5; x < DI.rowX1 - 4; x += 7) {
          if ((seed * 13) % 5 < 2 || (x > DI.gate.x0 - 3 && x < DI.gate.x1 + 3)) { seed++; continue; }
          list.push(W.parkedSpot(x, z + 2.6, 0, seed++));
        }
      }
      for (let x = TS.diner.x0 + 3.6; x < TS.diner.x1 - 2; x += 3.2) if ((seed++ * 7) % 3) list.push(W.parkedSpot(x, TS.diner.z1 + 7, Math.PI, seed));
      for (let x = TP.x0 + 26; x < TP.x1 - 10; x += 19) if ((seed++ * 11) % 3 === 0 && Math.abs(x - TP.laneX) > 9) list.push(W.parkedSpot(x + 8, TP.laneZ - 6.5, Math.PI / 2, seed));
      W.addParkedSpots(game, list);
    }
    update() {}
    stop() {}
    reset() {}
  }

  // -------------------------------------------------------------- register
  VH.Districts.register({
    id: D,
    name: 'Cinder Creek',
    plots: ['starview_drivein', 'cinder_storage', 'cinder_truckstop'],
    build(world, layout) {
      const t0 = performance.now();
      if (!layout.plots || !layout.plots.starview_drivein || !VH.WNKit) return;
      buildDriveIn(world);
      buildStorage(world);
      buildTrailerPark(world);
      buildTruckStop(world);
      world.cinderCreek = true;
      this.buildMs = Math.round(performance.now() - t0);
    },
    registerPlaces(world, places) {
      if (!world.cinderCreek) return;
      const add = (id, p) => {
        const def = places.defs && places.defs[id];
        places.add(id, Object.assign({ district: D, desc: def && def.desc }, p));
      };
      const B = DI.booth;
      const T = world.cinderTower;
      add('starview_drivein', { name: 'Starview Drive-In', x: -950, z: -628, yaw: 0, kind: 'parking', landmark: true });
      add('cinder_storage', { name: 'Cinder Creek Self Storage', x: (ST.gate.x0 + ST.gate.x1) / 2, z: -424, yaw: 0, kind: 'garage', landmark: true });
      add('cinder_truckstop', { name: 'Cinder Creek Truck Stop', x: TS.diner.x1 + 6, z: (TS.diner.z0 + TS.diner.z1) / 2, yaw: -Math.PI / 2, kind: 'diner', landmark: true });
      // The DLC's spots (dlc.js resolves them late; these are exact).
      add('lot_17', { name: 'Lot 17, Cinder Creek Storage', x: (ST.lot17.x0 + ST.lot17.x1) / 2, z: ST.lot17.z1 + 3, yaw: Math.PI, kind: 'garage' });
      add('drivein_rows', { name: 'The back rows, Starview Drive-In', x: -1000, z: DI.rows[0] + 6, yaw: 0, kind: 'parking' });
      add('projection_booth', { name: 'The projection booth, Starview Drive-In', x: -950, z: B.z0 - 3, yaw: 0, kind: 'storefront' });
      add('truckstop_lockup', { name: 'The lock-ups behind the truck stop', x: TS.lockups.x0 + (TS.lockups.open + 0.5) * ((TS.lockups.x1 - TS.lockups.x0) / TS.lockups.n), z: TS.lockups.z1 + 4, yaw: Math.PI, kind: 'garage' });
      add('chet_trailer', { name: "Chet Valiant's trailer", x: TP.chet.x, z: TP.chet.z - 5.5, yaw: 0, kind: 'parking' });
      if (T) {
        add('cinder_water_tower', { name: 'Cinder Creek water tower', x: T.stairFoot.x - 1.5, z: T.stairFoot.z, yaw: Math.PI / 2, kind: 'overlook' });
        add('water_tower_top', { name: 'The water tower catwalk', x: T.x, z: T.z + T.r - 0.7, y: T.catwalkY, yaw: Math.PI, kind: 'rooftop' });
      }
      const extra = places.extra[D];
      if (extra) {
        extra.push(
          { x: TS.diner.x1 + 8, z: TS.diner.z1 + 6, yaw: -Math.PI / 2, kinds: ['diner', 'storefront', 'bar'], name: 'The Ember Diner' },
          { x: (TS.canopy.x0 + TS.canopy.x1) / 2, z: TS.canopy.z1 + 5, yaw: Math.PI, kinds: ['gas_station', 'garage', 'parking'], name: 'The diesel canopy' },
          { x: TS.truckPark.x0 + 34, z: -380, yaw: Math.PI / 2, kinds: ['parking', 'warehouse'], name: 'The truck park' },
          { x: TS.junk.x1 - 14, z: TS.junk.z0 + 8, yaw: Math.PI, kinds: ['warehouse', 'garage', 'alley'], name: 'Creekside Salvage' },
          { x: -1000, z: -560, yaw: 0, kinds: ['parking', 'street'], name: 'The middle rows, Starview Drive-In' },
          { x: ST.auction.x0 + 14, z: ST.auction.z0 - 2, yaw: 0, kinds: ['warehouse', 'garage', 'parking'], name: 'The auction yard, Cinder Creek Storage' },
          { x: -1005, z: -380, yaw: 0, kinds: ['alley', 'garage'], name: 'Between the storage rows' },
          { x: TP.laneX + 3, z: TP.laneZ, yaw: Math.PI / 2, kinds: ['street', 'motel', 'parking'], name: 'Tumbleweed Acres trailer park' },
          { x: -880, z: -262, yaw: -Math.PI / 2, kinds: ['corner', 'street'], name: 'The trailer park lane' },
        );
      }
    },
    System: CinderCreekLife,
  });
})();
