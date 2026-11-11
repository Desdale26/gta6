/*
 * districts/palomafield.js — Paloma Field, the little airfield on the east
 * side of Isla Paloma (VICEHAVEN 3.0).
 *
 *   runway 18/36   1,090 m north-south, 36 m wide, edge and threshold
 *                  lights, piano keys and numbers: the Skylarks use it, and
 *                  an airliner can (just) land on it
 *   taxiway        parallel, west of the runway, with three links
 *   apron          in front of the buildings: parked Skylarks Jay can take,
 *                  a helipad with the club's Sparrow
 *   landside       a gate off Airfield Road, the flying club's car park
 *   buildings      Hangar 1 (the Paloma Flying Club: Hob's hangar, a
 *                  workbench, doughnut boxes, a kettle), Hangar 2, the
 *                  clubhouse with its veranda, a little watch tower, the
 *                  fuel shed and its pumps
 *   windsock       by the runway (it swings in PalomaFieldLife)
 *
 * Static parts are merged into the chunk builders; the only separate mesh
 * is the windsock.
 */
(function () {
  'use strict';

  const VH = window.VH;
  const KERB = 0.15;
  const F = () => VH.COLLIDE;
  const CHUNK = 192;
  const ORIGIN = -768;

  // ---------------------------------------------------------------- plan
  const RWY = { x: 1470, w: 36, z0: -545, z1: 545 };
  const TWY = { x: 1420, w: 18, z0: -530, z1: 530, links: [-522, 0, 522] };
  const APRON = { x0: 1336, x1: 1411, z0: -210, z1: 130 };
  const FENCE_X = 1334;
  const GATE = { z0: -50, z1: -30 }; // the gate in the fence, on the drive from Airfield Road
  const HANGARS = [
    { x0: 1340, x1: 1384, z0: -160, z1: -116, name: 'HANGAR 1  ·  PALOMA FLYING CLUB', col: 0x3f7a5a },
    { x0: 1340, x1: 1384, z0: -104, z1: -66, name: 'HANGAR 2', col: 0x8e959c },
  ];
  const CLUB = { x0: 1340, x1: 1372, z0: -14, z1: 12, h: 4.2 };
  const TOWER = { x: 1360, z: 34 };
  const FUEL = { x0: 1342, x1: 1362, z0: 70, z1: 86 };
  const HELIPAD = { x: 1394, z: 104 };
  const WINDSOCK = { x: 1500, z: -60 };
  // Parked aircraft (fixed vehicle spots): nose to the taxiway.
  const PARKED = [
    { type: 'skylark', x: 1398, z: -190, yaw: Math.PI / 2, color: 0xf2f2ee },
    { type: 'skylark', x: 1398, z: -40, yaw: Math.PI / 2, color: 0xd8262e },
    { type: 'skylark', x: 1398, z: 40, yaw: Math.PI / 2, color: 0x2f6fb7 },
    { type: 'sparrow', x: HELIPAD.x, z: HELIPAD.z, yaw: Math.PI / 2, color: 0xf2f2ee },
  ];

  // ------------------------------------------------------------- helpers
  /** Call fn(x0, z0, x1, z1, ctx) for each piece of a rectangle cut on the chunk grid. */
  function tiles(world, x0, z0, x1, z1, fn) {
    const cut = (a0, a1) => {
      const out = [];
      let a = a0;
      while (a < a1 - 1e-6) {
        const edge = ORIGIN + (Math.floor((a - ORIGIN) / CHUNK) + 1) * CHUNK;
        const b = Math.min(a1, edge);
        out.push([a, b]);
        a = b;
      }
      return out;
    };
    for (const [xa, xb] of cut(x0, x1)) for (const [za, zb] of cut(z0, z1)) fn(xa, za, xb, zb, world.ctxAt((xa + xb) / 2, (za + zb) / 2));
  }

  const Y_PAVE = KERB + 0.012;
  const Y_MARK = KERB + 0.022;

  function pave(world, x0, z0, x1, z1, hex, surf) {
    tiles(world, x0, z0, x1, z1, (a, b, c, d, ctx) => ctx[surf || 'asphaltTop'].topRect(a, b, c, d, Y_PAVE, VH.col(hex), 6));
  }
  function mark(world, x0, z0, x1, z1, hex) {
    tiles(world, Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1), (a, b, c, d, ctx) => ctx.marks.topRect(a, b, c, d, Y_MARK, VH.col(hex)));
  }
  /** A little light on a stalk (runway and taxiway edges). */
  function lamp(world, x, z, hex, mul, h) {
    const ctx = world.ctxAt(x, z);
    const top = KERB + (h || 0.35);
    ctx.prop.box(x - 0.05, KERB, z - 0.05, x + 0.05, top - 0.08, z + 0.05, VH.col(0x5a5f66));
    ctx.screen.box(x - 0.16, top - 0.1, z - 0.16, x + 0.16, top + 0.08, z + 0.16, VH.col(hex, mul || 2.4));
  }
  function solid(world, surf, x0, y0, z0, x1, y1, z1, hex, opts, tag, flags) {
    surf.box(x0, y0, z0, x1, y1, z1, VH.col(hex), opts);
    world.physics.addBox(x0, Math.min(y0, 0), z0, x1, y1, z1, tag || 'building', flags === undefined ? F().ALL : flags);
  }
  const sign = (world, spec) => VH.Landmarks.sign(world, spec);

  /** Chain-link fence along x = const, with gaps [[z0, z1], ...]. */
  function fenceZ(world, x, z0, z1, gaps) {
    const segs = [];
    let cur = z0;
    for (const [g0, g1] of gaps || []) {
      if (g0 > cur) segs.push([cur, g0]);
      cur = Math.max(cur, g1);
    }
    if (cur < z1) segs.push([cur, z1]);
    const post = VH.col(0x7d838a);
    const mesh = VH.col(0x3a3f45);
    for (const [s0, s1] of segs) {
      tiles(world, x - 0.1, s0, x + 0.1, s1, (a, c0, b, c1, ctx) => {
        for (let z = Math.ceil(c0 / 3) * 3; z <= c1; z += 3) ctx.prop.box(x - 0.05, KERB, z - 0.05, x + 0.05, KERB + 2.4, z + 0.05, post);
        for (const y of [0.3, 1.25, 2.3]) ctx.prop.box(x - 0.03, KERB + y, c0, x + 0.03, KERB + y + 0.05, c1, post);
        ctx.propMatte.box(x - 0.01, KERB + 0.3, c0, x + 0.01, KERB + 2.3, c1, mesh);
      });
      world.physics.addBox(x - 0.1, 0, s0, x + 0.1, KERB + 2.4, s1, 'fence', F().SOLID | F().CAMERA);
    }
  }

  /** Runway numbers from 3 x 5 cells; facing -1 is read by a plane rolling north, +1 south. */
  const DIGITS = {
    1: ['010', '110', '010', '010', '111'], 3: ['111', '001', '111', '001', '111'],
    6: ['111', '100', '111', '101', '111'], 8: ['111', '101', '111', '101', '111'],
  };
  function designator(world, text, cx, cz, facing) {
    const cell = 3;
    const digitW = cell * 3;
    const gap = 3;
    const total = text.length * digitW + (text.length - 1) * gap;
    for (let i = 0; i < text.length; i++) {
      const rows = DIGITS[text[i]];
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 3; c++) {
          if (rows[r][c] !== '1') continue;
          const along = cz + facing * (2.5 - r) * cell * 1.6;
          const across = cx - facing * (-total / 2 + i * (digitW + gap) + c * cell + cell / 2);
          mark(world, across - cell / 2, along - cell * 0.8, across + cell / 2, along + cell * 0.8, 0xf4f4ef);
        }
      }
    }
  }

  // ------------------------------------------------------------- build
  function build(world, b) {
    const x0 = b.minX, x1 = b.maxX, z0 = b.minZ, z1 = b.maxZ;
    // Grass wherever there is no paving (no surface lies on another: no z-fighting).
    let grass = [{ minX: x0, maxX: x1, minZ: z0, maxZ: z1 }];
    for (const r of pavedRects(b)) grass = VH.World.subtractRect(grass, { minX: r[0], minZ: r[1], maxX: r[2], maxZ: r[3] });
    for (const r of grass) {
      tiles(world, r.minX, r.minZ, r.maxX, r.maxZ, (a, c, bb, d, ctx) => ctx.grassTop.topRect(a, c, bb, d, KERB, VH.col(0xffffff), 6));
    }
    world.addLawn(x0, z0, FENCE_X - 1, GATE.z0);
    world.addLawn(x0, GATE.z1, FENCE_X - 1, z1);
    world.addLawn(APRON.x1, z0, x1, z1);
    buildRunway(world);
    buildTaxiway(world);
    buildApron(world);
    buildLandside(world, b);
    for (const h of HANGARS) buildHangar(world, h);
    hobsHangar(world, HANGARS[0]);
    buildClub(world);
    buildTower(world);
    buildFuel(world);
    buildHelipad(world);
    // The windsock's mast and its ring of lights; the sock itself swings in PalomaFieldLife.
    const W = WINDSOCK;
    const ctx = world.ctxAt(W.x, W.z);
    ctx.prop.cylinder(W.x, KERB, W.z, 0.12, 0.08, 7, 6, VH.col(0xe8e8e8), true);
    ctx.concrete.cylinder(W.x, KERB, W.z, 2.4, 2.4, 0.05, 12, VH.col(0xf4f4ef), true);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      lamp(world, W.x + Math.cos(a) * 2.6, W.z + Math.sin(a) * 2.6, 0xffd24a, 2, 0.3);
    }
    world.physics.addBox(W.x - 0.15, 0, W.z - 0.15, W.x + 0.15, KERB + 7, W.z + 0.15, 'pole', F().SOLID | F().SHOTS);
    world.palomaWindsock = { x: W.x, y: KERB + 6.9, z: W.z };
  }

  /** Every paved rectangle on the field, [x0, z0, x1, z1] (the grass goes round them). */
  function pavedRects(b) {
    const rx0 = RWY.x - RWY.w / 2, rx1 = RWY.x + RWY.w / 2;
    const tx0 = TWY.x - TWY.w / 2, tx1 = TWY.x + TWY.w / 2;
    const out = [
      [rx0 - 4, RWY.z0 - 20, rx1 + 4, RWY.z1 + 20],
      [tx0, TWY.z0, tx1, TWY.z1],
      [APRON.x0, APRON.z0, APRON.x1, APRON.z1],
      [b.minX, GATE.z0 + 2, APRON.x0, GATE.z1 - 2],
      [b.minX + 2, -28, FENCE_X - 2, 26],
    ];
    for (const z of TWY.links) out.push([tx1, Math.max(TWY.z0, z - 9), rx0 - 4, Math.min(TWY.z1, z + 9)]);
    return out;
  }

  function buildRunway(world) {
    const R = RWY;
    const rx0 = R.x - R.w / 2, rx1 = R.x + R.w / 2;
    pave(world, rx0 - 4, R.z0 - 20, rx1 + 4, R.z1 + 20, 0x8e8e8e);
    // Edge lines, centreline dashes, piano keys, numbers, aiming points.
    mark(world, rx0 + 0.6, R.z0, rx0 + 1.4, R.z1, 0xf4f4ef);
    mark(world, rx1 - 1.4, R.z0, rx1 - 0.6, R.z1, 0xf4f4ef);
    for (let z = R.z0 + 70; z < R.z1 - 70; z += 50) mark(world, R.x - 0.45, z, R.x + 0.45, z + 30, 0xf4f4ef);
    for (const [zEdge, d] of [[R.z0, 1], [R.z1, -1]]) {
      for (let i = 0; i < 8; i++) {
        const x = rx0 + 3 + i * 4.1 + (i >= 4 ? 1.4 : 0);
        mark(world, x, zEdge + d * 4, x + 1.8, zEdge + d * 34, 0xf4f4ef);
      }
      mark(world, rx0 + 0.6, zEdge + d * 0.5, rx1 - 0.6, zEdge + d * 1.6, 0xf4f4ef);
      for (const s of [-1, 1]) mark(world, R.x + s * 6 - 2, zEdge + d * 150, R.x + s * 6 + 2, zEdge + d * 195, 0xf4f4ef);
      // Threshold lights: a green row, and the red end lights just beyond.
      for (let x = rx0; x <= rx1 + 0.01; x += 3) {
        lamp(world, x, zEdge - d * 1.2, 0x5dff7a, 2.6);
        lamp(world, x, zEdge - d * 2.6, 0xff3d3d, 2.6);
      }
      // Approach lights out beyond the end.
      for (let k = 1; k <= 4; k++) for (const s of [-6, -3, 0, 3, 6]) lamp(world, R.x + s, zEdge - d * (k * 7 + 2), 0xfff2c8, 2.4, 0.6);
    }
    designator(world, '36', R.x, R.z1 - 52, -1);
    designator(world, '18', R.x, R.z0 + 52, 1);
    // Edge lights every 60 m.
    for (let z = R.z0 + 30; z < R.z1; z += 60) for (const x of [rx0 - 1.5, rx1 + 1.5]) lamp(world, x, z, 0xfff6dc, 2.4);
  }

  function buildTaxiway(world) {
    const T = TWY;
    const tx0 = T.x - T.w / 2, tx1 = T.x + T.w / 2;
    pave(world, tx0, T.z0, tx1, T.z1, 0x969696);
    mark(world, T.x - 0.2, T.z0 + 4, T.x + 0.2, T.z1 - 4, 0xf2c21b);
    const rx0 = RWY.x - RWY.w / 2;
    for (const z of T.links) {
      const zl0 = Math.max(T.z0, z - 9), zl1 = Math.min(T.z1, z + 9);
      pave(world, tx1, zl0, rx0 - 4, zl1, 0x969696);
      mark(world, tx1, z - 0.2, rx0 - 4, z + 0.2, 0xf2c21b);
      // Hold-short bars.
      for (let k = 0; k < 4; k++) mark(world, rx0 - 14 - k * 0.7, zl0 + 1, rx0 - 13.7 - k * 0.7, zl1 - 1, 0xf2c21b);
      for (const zz of [zl0 - 0.8, zl1 + 0.8]) for (let x = tx1 + 4; x < rx0 - 5; x += 8) lamp(world, x, zz, 0x3d7dff, 2.4);
    }
    for (let z = T.z0 + 20; z < T.z1; z += 50) {
      if (T.links.some((l) => Math.abs(l - z) < 12)) continue;
      lamp(world, tx1 + 0.9, z, 0x3d7dff, 2.4);
      if (z < APRON.z0 - 5 || z > APRON.z1 + 5) lamp(world, tx0 - 0.9, z, 0x3d7dff, 2.4);
    }
  }

  function buildApron(world) {
    const A = APRON;
    pave(world, A.x0, A.z0, A.x1, A.z1, 0xc9c6bd, 'plazaTop');
    // Parking boxes for the light aircraft, a yellow lead-in line to each.
    for (const p of PARKED) {
      if (p.type !== 'skylark') continue;
      for (const [a0, b0, a1, b1] of [[p.x - 7, p.z - 7.5, p.x + 7, p.z - 7.2], [p.x - 7, p.z + 7.2, p.x + 7, p.z + 7.5], [p.x - 7, p.z - 7.5, p.x - 6.7, p.z + 7.5]]) mark(world, a0, b0, a1, b1, 0xf2c21b);
      mark(world, p.x, p.z - 0.15, A.x1, p.z + 0.15, 0xf2c21b);
    }
    // Floodlight masts along the back of the apron.
    for (let z = A.z0 + 20; z < A.z1; z += 60) world.addProp('streetlight', A.x1 - 2, KERB, z, -Math.PI / 2, 1.3);
    for (const z of [-180, -30, 50, 118]) world.addProp('streetlight', 1388, KERB, z, Math.PI / 2, 1.2);
  }

  function buildLandside(world, b) {
    // The drive from Airfield Road through the gate onto the apron.
    pave(world, b.minX, GATE.z0 + 2, APRON.x0, GATE.z1 - 2, 0x8a8a8a);
    // The club car park beside it.
    pave(world, b.minX + 2, -28, FENCE_X - 2, 26, 0x8f8f8f);
    for (let z = -25; z < 24; z += 2.8) {
      mark(world, b.minX + 3, z, b.minX + 8, z + 0.12, 0xf4f4ef);
      mark(world, FENCE_X - 8, z, FENCE_X - 3, z + 0.12, 0xf4f4ef);
    }
    fenceZ(world, FENCE_X, b.minZ + 0.5, b.maxZ - 0.5, [[GATE.z0, GATE.z1]]);
    // The gate: a hut and a barrier arm, up.
    const gz = GATE.z0;
    const ctx = world.ctxAt(FENCE_X, gz);
    solid(world, ctx.prop, FENCE_X - 4.5, KERB, gz - 4, FENCE_X - 1, KERB + 2.8, gz - 0.8, 0xe8e2d6);
    ctx.prop.box(FENCE_X - 4.8, KERB + 2.8, gz - 4.3, FENCE_X - 0.7, KERB + 3.1, gz - 0.5, VH.col(0x3f7a5a));
    ctx.screen.box(FENCE_X - 1.02, KERB + 1.2, gz - 3.5, FENCE_X - 0.98, KERB + 2.2, gz - 1.3, VH.col(0xfff1d8, 1.0));
    ctx.prop.box(FENCE_X - 0.3, KERB, gz - 0.3, FENCE_X + 0.3, KERB + 1.1, gz + 0.3, VH.col(0xe0b12e));
    ctx.prop.box(FENCE_X - 0.08, KERB + 1.0, gz - 0.08, FENCE_X + 0.08, KERB + 7.5, gz + 0.08, VH.col(0xd8262e));
    world.physics.addBox(FENCE_X - 0.3, 0, gz - 0.3, FENCE_X + 0.3, KERB + 1.1, gz + 0.3, 'pole');
    sign(world, { x: b.minX + 4, y: KERB + 3.2, z: GATE.z0 - 3, yaw: -Math.PI / 2, w: 8, h: 3, lines: ['PALOMA FIELD', 'Paloma Flying Club · Lessons · Pleasure flights'], style: 'park', posts: true });
    // Lamps along the Airfield Road frontage and in the car park.
    for (let z = b.minZ + 30; z < b.maxZ - 10; z += 40) world.addProp('streetlight', b.minX + 1.2, KERB, z, -Math.PI / 2, 1);
    for (let z = b.minZ + 20; z < b.maxZ; z += 70) world.addProp('palmTall', b.minX + 6, KERB, z, z, 1);
  }

  /** A hangar: steel walls, a curved roof, a wide door open to the apron (east). */
  function buildHangar(world, hg) {
    const ctx = world.ctxAt((hg.x0 + hg.x1) / 2, (hg.z0 + hg.z1) / 2);
    const H = 11;
    const wall = hg.col;
    const trim = VH.colMul(VH.col(wall), 0.72);
    solid(world, ctx.prop, hg.x0, KERB, hg.z0, hg.x1, KERB + H, hg.z0 + 0.5, wall);
    solid(world, ctx.prop, hg.x0, KERB, hg.z1 - 0.5, hg.x1, KERB + H, hg.z1, wall);
    solid(world, ctx.prop, hg.x0, KERB, hg.z0, hg.x0 + 0.5, KERB + H, hg.z1, wall);
    solid(world, ctx.prop, hg.x1 - 0.6, KERB + 8, hg.z0, hg.x1, KERB + H, hg.z1, wall, { bottom: true });
    for (let k = 0; k < 4; k++) {
      const inset = k * 3.2;
      ctx.prop.box(hg.x0 - 0.3 + inset, KERB + H + k * 0.8, hg.z0 - 0.3, hg.x1 + 0.3 - inset, KERB + H + (k + 1) * 0.8, hg.z1 + 0.3, k % 2 ? trim : VH.col(wall), { bottom: k === 0 });
    }
    world.physics.addBox(hg.x0, KERB + H, hg.z0, hg.x1, KERB + H + 3.2, hg.z1, 'building', F().ALL);
    for (let x = hg.x0 + 4; x < hg.x1 - 2; x += 6) for (const z of [hg.z0 - 0.15, hg.z1]) ctx.prop.box(x - 0.1, KERB, z, x + 0.1, KERB + H, z + 0.15, trim);
    for (let z = hg.z0 + 8; z < hg.z1 - 4; z += 12) ctx.screen.box((hg.x0 + hg.x1) / 2 - 8, KERB + H - 0.25, z - 0.4, (hg.x0 + hg.x1) / 2 + 8, KERB + H - 0.1, z + 0.4, VH.col(0xf4f7ff, 1.8));
    // Door rails and a lamp over the opening.
    ctx.prop.box(hg.x1 - 0.2, KERB, hg.z0 - 6, hg.x1 + 0.2, KERB + 8.2, hg.z0 - 5.6, trim);
    ctx.screen.box(hg.x1 + 0.02, KERB + 7.4, (hg.z0 + hg.z1) / 2 - 2, hg.x1 + 0.2, KERB + 7.8, (hg.z0 + hg.z1) / 2 + 2, VH.col(0xfff4dc, 1.8));
    sign(world, { x: hg.x1 + 0.1, y: KERB + 9.5, z: (hg.z0 + hg.z1) / 2, yaw: Math.PI / 2, w: 22, h: 1.8, lines: [hg.name], style: 'info', posts: false });
  }

  /** Hob's hangar: a workbench, a kettle, doughnut boxes, a sofa, the parts shelves. */
  function hobsHangar(world, hg) {
    const ctx = world.ctxAt(hg.x0 + 6, (hg.z0 + hg.z1) / 2);
    const bx = hg.x0 + 0.6;
    solid(world, ctx.wood, bx, KERB, hg.z0 + 6, bx + 1.2, KERB + 0.95, hg.z0 + 14, 0x8a6a45, null, 'wall', F().SOLID | F().SHOTS);
    ctx.prop.box(bx + 0.4, KERB + 0.95, hg.z0 + 7, bx + 0.7, KERB + 1.25, hg.z0 + 7.3, VH.col(0xdedede)); // the kettle
    ctx.prop.box(bx + 0.48, KERB + 1.25, hg.z0 + 7.12, bx + 0.62, KERB + 1.3, hg.z0 + 7.18, VH.col(0x1b1d21));
    for (let k = 0; k < 5; k++) {
      const z = hg.z0 + 9 + k * 0.62;
      const y = KERB + 0.95 + (k % 2) * 0.12;
      ctx.prop.box(bx + 0.2, y, z, bx + 0.95, y + 0.12, z + 0.55, VH.col(k % 2 ? 0xf2a6c0 : 0xf6f1e4)); // doughnut boxes
    }
    // Shelves of parts against the back wall, a tool board, an old sofa and a rug.
    for (const y of [0.9, 1.8, 2.7]) ctx.prop.box(bx, KERB + y, hg.z0 + 18, bx + 0.8, KERB + y + 0.08, hg.z1 - 8, VH.col(0x6a7078));
    for (let z = hg.z0 + 18.5; z < hg.z1 - 8.5; z += 1.3) ctx.prop.box(bx + 0.1, KERB + 0.98, z, bx + 0.7, KERB + 1.4 + (z % 3) * 0.15, z + 0.9, VH.col(z % 2.6 < 1.3 ? 0x2f6fb7 : 0xd8262e));
    world.physics.addBox(bx, 0, hg.z0 + 18, bx + 0.8, KERB + 2.8, hg.z1 - 8, 'wall', F().SOLID | F().SHOTS);
    ctx.prop.box(hg.x0 + 0.52, KERB + 1.4, hg.z1 - 7, hg.x0 + 0.6, KERB + 3.2, hg.z1 - 2, VH.col(0x3a3f45));
    ctx.prop.box(hg.x0 + 3, KERB, hg.z1 - 5, hg.x0 + 6, KERB + 0.5, hg.z1 - 1.2, VH.col(0x7a3b2e));
    ctx.prop.box(hg.x0 + 3, KERB + 0.5, hg.z1 - 1.6, hg.x0 + 6, KERB + 1.2, hg.z1 - 1.2, VH.col(0x7a3b2e));
    ctx.decal.topRect(hg.x0 + 2, hg.z1 - 9, hg.x0 + 7, hg.z1 - 4, KERB + 0.03, VH.col(0x9a3f2a));
    world.physics.addBox(hg.x0 + 3, 0, hg.z1 - 5, hg.x0 + 6, KERB + 0.5, hg.z1 - 1.2, 'wall', F().SOLID);
    // A blackboard: today's flying, and the doughnut run.
    sign(world, { x: hg.x0 + 0.56, y: KERB + 2.4, z: hg.z0 + 4, yaw: Math.PI / 2, w: 3, h: 1.6, lines: ['TODAY', 'Lessons 9-5 · Doughnuts Tuesday'], style: 'park', posts: false });
  }

  function buildClub(world) {
    const C = CLUB;
    const ctx = world.ctxAt((C.x0 + C.x1) / 2, (C.z0 + C.z1) / 2);
    const wall = 0xf2ead6;
    solid(world, ctx.b, C.x0, KERB, C.z0, C.x1, KERB + C.h, C.z1, wall, { top: VH.col(0x8a5a3a) });
    ctx.b.wall([C.x1 + 0.03, KERB + 0.8, C.z1], 0, -1, C.z1 - C.z0, C.h - 1.4, VH.col(0x5d87a6), null, [0, 7, 0, 1], [0.8, 0.8, 2, 7]);
    // A pitched roof and the veranda facing the apron, with its bunting.
    const roof = new THREE.BoxGeometry(1, 1, 1);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    for (const s of [-1, 1]) {
      q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -s * 0.38);
      m.compose(new THREE.Vector3((C.x0 + C.x1) / 2 + s * ((C.x1 - C.x0) / 4), KERB + C.h + 1.55, (C.z0 + C.z1) / 2), q, new THREE.Vector3((C.x1 - C.x0) / 2 / Math.cos(0.38) + 0.8, 0.3, C.z1 - C.z0 + 1));
      ctx.prop.merge(roof, m, VH.col(0x9a3f2a));
    }
    ctx.prop.box(C.x0, KERB + C.h, C.z0 - 0.1, C.x1, KERB + C.h + 0.4, C.z0, VH.col(wall));
    ctx.wood.box(C.x1, KERB, C.z0, C.x1 + 6, KERB + 0.35, C.z1, VH.col(0xa07a52));
    world.physics.addBox(C.x1, 0, C.z0, C.x1 + 6, KERB + 0.35, C.z1, 'plank', F().SOLID);
    ctx.prop.box(C.x1, KERB + 3.4, C.z0, C.x1 + 6.4, KERB + 3.6, C.z1, VH.col(0x3f7a5a), { bottom: true });
    for (const z of [C.z0 + 0.3, (C.z0 + C.z1) / 2, C.z1 - 0.3]) {
      ctx.wood.box(C.x1 + 5.8, KERB + 0.35, z - 0.12, C.x1 + 6.1, KERB + 3.4, z + 0.12, VH.col(0xf2ead6));
      world.physics.addBox(C.x1 + 5.8, 0, z - 0.15, C.x1 + 6.1, KERB + 3.4, z + 0.15, 'pole');
    }
    for (let z = C.z0 + 1; z < C.z1; z += 1.1) ctx.screen.box(C.x1 + 6.2, KERB + 3.1, z - 0.1, C.x1 + 6.4, KERB + 3.35, z + 0.1, VH.col(z % 2.2 < 1.1 ? 0xffd24a : 0xfff4dc, 2));
    for (let k = 0; k < 3; k++) {
      const z = C.z0 + 4 + k * 8;
      ctx.wood.box(C.x1 + 2, KERB + 0.35, z - 0.8, C.x1 + 3.6, KERB + 1.1, z + 0.8, VH.col(0xf2ead6));
      ctx.prop.cylinder(C.x1 + 2.8, KERB + 1.1, z, 0.06, 0.06, 1.6, 6, VH.col(0xdddddd), false);
      ctx.prop.cylinder(C.x1 + 2.8, KERB + 2.6, z, 1.3, 0.1, 0.5, 8, VH.col(k % 2 ? 0x3f7a5a : 0xf2ead6), false);
    }
    sign(world, { x: C.x1 + 0.05, y: KERB + C.h + 1.4, z: (C.z0 + C.z1) / 2, yaw: Math.PI / 2, w: 12, h: 1.8, lines: ['PALOMA FLYING CLUB', 'Est. 1961 · Visitors welcome · Mind the props'], style: 'park', posts: false });
    world.beacons.push({ x: C.x0 + 1, y: KERB + C.h + 3.2, z: C.z0 + 1 });
  }

  /** The watch tower: a little two-storey box with a glass cab and a beacon. */
  function buildTower(world) {
    const T = TOWER;
    const ctx = world.ctxAt(T.x, T.z);
    solid(world, ctx.b, T.x - 3, KERB, T.z - 3, T.x + 3, KERB + 7, T.z + 3, 0xf2ead6);
    ctx.b.box(T.x - 3.6, KERB + 7, T.z - 3.6, T.x + 3.6, KERB + 7.3, T.z + 3.6, VH.col(0x3f7a5a), { bottom: true });
    ctx.screen.box(T.x - 3.2, KERB + 7.3, T.z - 3.2, T.x + 3.2, KERB + 9.6, T.z + 3.2, VH.col(0x9fd8ff, 0.45));
    ctx.b.box(T.x - 3.8, KERB + 9.6, T.z - 3.8, T.x + 3.8, KERB + 10.1, T.z + 3.8, VH.col(0x3f7a5a), { bottom: true });
    world.physics.addBox(T.x - 3.6, KERB + 7, T.z - 3.6, T.x + 3.6, KERB + 10.1, T.z + 3.6, 'building');
    ctx.prop.box(T.x - 0.06, KERB + 10.1, T.z - 0.06, T.x + 0.06, KERB + 13, T.z + 0.06, VH.col(0x8a9099));
    world.beacons.push({ x: T.x, y: KERB + 13.2, z: T.z });
  }

  function buildFuel(world) {
    const Fu = FUEL;
    const ctx = world.ctxAt((Fu.x0 + Fu.x1) / 2, (Fu.z0 + Fu.z1) / 2);
    solid(world, ctx.prop, Fu.x0, KERB, Fu.z0, Fu.x1, KERB + 4.2, Fu.z1, 0xd8d4c8);
    ctx.prop.box(Fu.x0 - 0.5, KERB + 4.2, Fu.z0 - 0.5, Fu.x1 + 0.5, KERB + 4.6, Fu.z1 + 0.5, VH.col(0xd8262e), { bottom: true });
    ctx.prop.box(Fu.x1 - 0.05, KERB, Fu.z0 + 3, Fu.x1 + 0.03, KERB + 3.4, Fu.z0 + 7, VH.col(0x8f969c));
    // Two tanks on cradles and the pumps by the apron.
    const tx = Fu.x0 + 6;
    for (const z of [Fu.z1 + 3.5, Fu.z1 + 7.5]) {
      const tank = new THREE.CylinderGeometry(1.4, 1.4, 9, 12);
      tank.rotateZ(Math.PI / 2);
      ctx.prop.merge(tank, new THREE.Matrix4().makeTranslation(tx, KERB + 2, z), VH.col(0xf2efe6));
      for (const dx of [-3, 3]) ctx.prop.box(tx + dx - 0.3, KERB, z - 1, tx + dx + 0.3, KERB + 1, z + 1, VH.col(0x5a5f66));
      world.physics.addBox(tx - 4.5, 0, z - 1.4, tx + 4.5, KERB + 3.4, z + 1.4, 'metal');
    }
    for (const z of [Fu.z0 + 2, Fu.z1 - 2]) {
      const x = 1376;
      ctx.prop.box(x - 0.5, KERB, z - 0.4, x + 0.5, KERB + 1.8, z + 0.4, VH.col(0xd8262e));
      ctx.screen.box(x + 0.51, KERB + 1.1, z - 0.25, x + 0.53, KERB + 1.5, z + 0.25, VH.col(0xfff4dc, 1.2));
      world.physics.addBox(x - 0.5, 0, z - 0.4, x + 0.5, KERB + 1.8, z + 0.4, 'metal');
    }
    sign(world, { x: Fu.x1 + 0.06, y: KERB + 3.5, z: (Fu.z0 + Fu.z1) / 2, yaw: Math.PI / 2, w: 8, h: 1.2, lines: ['FUEL · AVGAS 100LL · NO SMOKING'], style: 'info', posts: false });
  }

  function buildHelipad(world) {
    const H = HELIPAD;
    const ctx = world.ctxAt(H.x, H.z);
    ctx.marks.cylinder(H.x, KERB + 0.018, H.z, 9, 9, 0.004, 24, VH.col(0x5a5f66), true);
    ctx.marks.cylinder(H.x, KERB + 0.022, H.z, 7.5, 7.5, 0.004, 24, VH.col(0xf4f4ef), true);
    ctx.marks.cylinder(H.x, KERB + 0.026, H.z, 7.0, 7.0, 0.004, 24, VH.col(0x5a5f66), true);
    for (const [a0, b0, a1, b1] of [[-3.4, -4.5, -2.2, 4.5], [2.2, -4.5, 3.4, 4.5], [-2.2, -0.6, 2.2, 0.6]]) ctx.marks.topRect(H.x + a0, H.z + b0, H.x + a1, H.z + b1, KERB + 0.032, VH.col(0xf4f4ef));
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      lamp(world, H.x + Math.cos(a) * 9.6, H.z + Math.sin(a) * 9.6, 0x5dff7a, 2.4, 0.25);
    }
  }

  // -------------------------------------------------------------- the map
  if (VH.MapPainters) {
    VH.MapPainters.push((g, layout, o) => {
      const b = layout.plots && layout.plots.paloma_field;
      if (!b) return;
      const R = o.R;
      g.fillStyle = '#7fae6a';
      R(b.minX, b.minZ, b.maxX, b.maxZ);
      g.fillStyle = '#8e8e8e';
      R(RWY.x - RWY.w / 2, RWY.z0, RWY.x + RWY.w / 2, RWY.z1);
      R(TWY.x - TWY.w / 2, TWY.z0, TWY.x + TWY.w / 2, TWY.z1);
      for (const z of TWY.links) R(TWY.x, z - 9, RWY.x, z + 9);
      g.fillStyle = '#b4b1a9';
      R(APRON.x0, APRON.z0, APRON.x1, APRON.z1);
      g.fillStyle = 'rgba(244, 244, 239, 0.9)';
      for (let z = RWY.z0 + 70; z < RWY.z1 - 70; z += 50) R(RWY.x - 0.6, z, RWY.x + 0.6, z + 30);
      const bld = (x0, z0, x1, z1, col) => {
        g.fillStyle = 'rgba(0, 0, 0, 0.3)';
        R(x0 + 2, z0 + 2, x1 + 2, z1 + 2);
        g.fillStyle = col;
        R(x0, z0, x1, z1);
      };
      for (const h of HANGARS) bld(h.x0, h.z0, h.x1, h.z1, h === HANGARS[0] ? '#5a9a76' : '#9aa1a8');
      bld(CLUB.x0, CLUB.z0, CLUB.x1, CLUB.z1, '#c26a4a');
      bld(FUEL.x0, FUEL.z0, FUEL.x1, FUEL.z1, '#d8262e');
      bld(TOWER.x - 3, TOWER.z - 3, TOWER.x + 3, TOWER.z + 3, '#e6e3dc');
      if (o.circle) {
        g.fillStyle = '#9b9f9c';
        o.circle(HELIPAD.x, HELIPAD.z, 9);
      }
    });
  }

  // --------------------------------------------------------- moving parts
  /** The parked aircraft (fixed vehicle spots) and the windsock. */
  class PalomaFieldLife {
    constructor(game) {
      this.game = game;
      this.ok = !!(game.world && game.world.palomaWindsock);
      if (!this.ok) return;
      this.spots = [];
      const V = game.vehicles;
      for (const p of PARKED) {
        if (!VH.Vehicle || !VH.Vehicle.typeSpec || !VH.Vehicle.typeSpec(p.type)) continue;
        this.spots.push(V.addFixedSpot({ type: p.type, x: p.x, z: p.z, yaw: p.yaw, color: p.color, r: 9 }));
      }
      const ws = game.world.palomaWindsock;
      const geo = new THREE.CylinderGeometry(0.42, 0.18, 3.2, 10, 1, true);
      geo.rotateZ(-Math.PI / 2);
      geo.translate(1.6, 0, 0);
      // Orange and white hoops.
      const cols = [];
      const pos = geo.attributes.position;
      const c1 = new THREE.Color(0xff6a1a), c2 = new THREE.Color(0xf6f1e4);
      for (let i = 0; i < pos.count; i++) {
        const c = Math.floor((pos.getX(i) / 3.2) * 5 - 0.001) % 2 ? c2 : c1;
        cols.push(c.r, c.g, c.b);
      }
      geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
      this.sock = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, side: THREE.DoubleSide }));
      this.sock.position.set(ws.x, ws.y, ws.z);
      game.scene.add(this.sock);
      this._t = 0;
    }

    update(dt) {
      if (!this.ok) return;
      this._t += dt;
      const gust = Math.sin(this._t * 0.7) * 0.15 + Math.sin(this._t * 2.3) * 0.05;
      // The same east-south-easterly the airport's sock shows.
      this.sock.rotation.set(0, Math.PI * 0.9 + gust, -0.18 + gust * 0.6);
    }

    stop() {}
    reset() {}
  }

  // -------------------------------------------------------------- register
  VH.Districts.register({
    id: 'palomafield',
    name: 'Paloma Field',
    plots: ['paloma_field'],
    build(world, layout) {
      const t0 = performance.now();
      const b = layout.plots && layout.plots.paloma_field;
      if (b) {
        build(world, b);
        world.palomaField = { runway: RWY, taxiway: TWY, apron: APRON, hangars: HANGARS, helipad: HELIPAD };
      }
      this.buildMs = Math.round(performance.now() - t0);
    },
    registerPlaces(world, places) {
      if (!world.palomaField) return;
      const D = 'palomafield';
      const add = (id, p) => {
        const def = places.defs && places.defs[id];
        places.add(id, Object.assign({ district: D, desc: def && def.desc }, p));
      };
      // The airfield itself: the middle of the runway (where `land` steps aim), facing north.
      add('paloma_field', { name: 'Paloma Field', x: RWY.x, z: 0, yaw: Math.PI, kind: 'airfield', landmark: true });
      const h1 = HANGARS[0];
      add('hob_hangar', { name: "Hob's hangar, Paloma Field", x: h1.x1 + 3, z: (h1.z0 + h1.z1) / 2, yaw: -Math.PI / 2, kind: 'garage' });
      add('field_apron', { name: 'The apron, Paloma Field', x: 1392, z: -112, yaw: Math.PI / 2, kind: 'parking' });
      const extra = places.extra[D];
      if (extra) {
        extra.push(
          { x: CLUB.x1 + 3, z: (CLUB.z0 + CLUB.z1) / 2, y: KERB + 0.35, yaw: -Math.PI / 2, kinds: ['bar', 'diner', 'storefront'], name: 'The Flying Club veranda' },
          { x: HANGARS[1].x1 + 3, z: (HANGARS[1].z0 + HANGARS[1].z1) / 2, yaw: -Math.PI / 2, kinds: ['garage', 'warehouse'], name: 'Hangar 2' },
          { x: FUEL.x1 + 4, z: (FUEL.z0 + FUEL.z1) / 2, yaw: -Math.PI / 2, kinds: ['garage', 'gas_station', 'warehouse'], name: 'The fuel shed' },
          { x: HELIPAD.x - 12, z: HELIPAD.z, yaw: Math.PI / 2, kinds: ['airport', 'helipad', 'parking'], name: 'The helipad, Paloma Field' },
          { x: 1318, z: 0, yaw: Math.PI / 2, kinds: ['parking', 'street'], name: 'The Flying Club car park' },
          { x: 1312, z: -40, yaw: Math.PI / 2, kinds: ['street', 'corner'], name: 'Paloma Field gate' },
          { x: WINDSOCK.x - 4, z: WINDSOCK.z, yaw: Math.PI / 2, kinds: ['overlook', 'park'], name: 'The windsock' },
        );
      }
    },
    System: PalomaFieldLife,
  });
})();
