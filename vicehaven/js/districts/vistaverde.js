/*
 * districts/vistaverde.js — Vista Verde (VICEHAVEN 3.0): the family suburb
 * in the south-west.
 *
 *   Verde Mall           a two-storey mall on Hollyhock Avenue: its entrance
 *                        court open to walk into (shopfronts, a fountain),
 *                        the anchor stores, a forecourt with trolley shelters
 *                        and the big car park on Grand Avenue (with the
 *                        driving-lesson corner: cones, a kerbed corner, a
 *                        parallel bay between two parked cars).
 *   Vista Verde School   the school on Dune Street with its playground, the
 *                        ball field behind it (diamond, dugouts, backstop,
 *                        bleachers, scoreboard, floodlights) and, on the west
 *                        side of the plot, Marigold Close: a cul-de-sac of
 *                        bungalows (June Marlow's, with Aunt Win's shed).
 *
 * Everything draws into the chunk builders through VH.WNKit and VH.SouthKit.
 */
(function () {
  'use strict';

  const VH = window.VH;
  const KERB = 0.15;
  const D = 'vistaverde';
  const PI = Math.PI;
  const F = () => VH.COLLIDE;
  const K = () => VH.WNKit;
  const S = () => VH.SouthKit;
  const col = (h) => (Array.isArray(h) ? h : VH.col(h));

  /** A painted box, solid. */
  function box(world, surf, x0, y0, z0, x1, y1, z1, hex, tag, flags) {
    S().air(world, world.ctxAt((x0 + x1) / 2, (z0 + z1) / 2)[surf], x0, y0, z0, x1, y1, z1, hex, tag, flags);
  }

  // ------------------------------------------------------------ the mall
  // Plot -153..-13 x 669..783 (front east on Grand Avenue).
  const MA = {
    x0: -153, x1: -13, z0: 669, z1: 783,
    b: { x0: -149, x1: -86, z0: 673, z1: 779, h: 10.5 },
    court: { x0: -108, z0: 711, z1: 741 }, // the entrance court, open to the forecourt
    doors: [[714.5, 718.5], [724, 728], [733.5, 737.5]],
    fore: { x0: -86, x1: -73 },
    park: { x0: -73, x1: -15, z0: 673, z1: 779 },
    inE: [[698, 708], [744, 754]], // ways in from Grand Avenue
    inN: [-40, -30], inS: [-40, -30],
  };
  // Bay rows in the car park: [x0, x1, heading of a parked car (nose in)], aisles between.
  const ROWS = [[-66, -61, PI / 2], [-54, -49, -PI / 2], [-49, -44, PI / 2], [-37, -32, -PI / 2], [-32, -27, PI / 2], [-20, -15, -PI / 2]];
  const PB = { x: -71.1, z0: 686, z1: 697.6 }; // the parallel bay's two parked cars (centres), the gap between

  function buildMall(world) {
    const W = K(), Sk = S();
    const B = MA.b, C = MA.court;
    const wall = 0xe9dcc6, trim = 0x2f7f6f, glass = VH.col(0x9fd0e8, 1.1);
    // --- the building: two blocks either side of the court, joined behind it
    const parts = [[B.x0, B.z0, B.x1, C.z0], [B.x0, C.z1, B.x1, B.z1], [B.x0, C.z0, C.x0, C.z1]];
    for (const [x0, z0, x1, z1] of parts) W.building(world, x0, z0, x1, z1, B.h, { wall, roof: 0x9a968f, style: 0, parapet: 0.9 });
    // Shop windows along the east front at ground level, a band of trim above them.
    for (const [z0, z1] of [[B.z0 + 3, C.z0 - 2], [C.z1 + 2, B.z1 - 3]]) {
      for (let z = z0; z < z1 - 6; z += 8) {
        const ctx = world.ctxAt(B.x1, z + 3);
        ctx.screen.box(B.x1 + 0.01, KERB + 0.4, z, B.x1 + 0.05, KERB + 3.2, z + 6.4, glass);
        ctx.prop.box(B.x1 + 0.01, KERB + 3.2, z - 0.4, B.x1 + 0.08, KERB + 3.5, z + 6.8, col(trim));
      }
    }
    // --- the court: a glass front with three open doorways, shopfronts inside, a fountain, a skylight
    const ctxC = world.ctxAt((C.x0 + B.x1) / 2, (C.z0 + C.z1) / 2);
    W.pave(world, C.x0, C.z0, B.x1, C.z1, 0xe8e4dc, 'interior', KERB + 0.012, 3);
    let zc = C.z0;
    for (const [d0, d1] of MA.doors.concat([[C.z1, C.z1]])) {
      if (d0 > zc + 0.05) {
        ctxC.screen.box(B.x1 - 0.1, KERB, zc, B.x1, KERB + 4.2, d0, glass);
        world.physics.addBox(B.x1 - 0.12, 0, zc, B.x1 + 0.02, KERB + 4.2, d0, 'glass', F().ALL);
      }
      for (const z of [d0, d1]) if (z > C.z0 && z < C.z1) box(world, 'prop', B.x1 - 0.15, KERB, z - 0.08, B.x1 + 0.05, KERB + 4.2, z + 0.08, 0x3a3f45, 'metal');
      zc = d1;
    }
    // Above the doors: a solid band to the roof (the court's two storeys).
    box(world, 'concrete', B.x1 - 0.3, KERB + 4.2, C.z0, B.x1, KERB + B.h, C.z1, wall, 'building');
    ctxC.screen.box(B.x1 + 0.01, KERB + 4.8, C.z0 + 1, B.x1 + 0.05, KERB + 9.4, C.z1 - 1, glass);
    // The court's roof (a skylight strip glowing) and its side walls lined with shopfronts.
    box(world, 'concrete', C.x0, KERB + B.h, C.z0, B.x1, KERB + B.h + 0.5, C.z1, 0xcfd3d6, 'building');
    ctxC.screen.box(C.x0 + 3, KERB + B.h - 0.05, C.z0 + 10, B.x1 - 3, KERB + B.h, C.z1 - 10, VH.col(0xf4f8ff, 1.6));
    const shops = [[0xe0574f, 0xfff2d0], [0x2f8fbf, 0xd8f0ff], [0xf2c230, 0xfff6d0], [0x8e5bd6, 0xf0e0ff], [0x3fae7a, 0xe0fff0], [0xf08a3c, 0xfff0e0]];
    let k = 0;
    for (const [z, sg] of [[C.z0, 1], [C.z1, -1]]) {
      for (let x = C.x0 + 2; x < B.x1 - 6; x += 7.5, k++) {
        const [band, win] = shops[k % shops.length];
        ctxC.interior.box(x, KERB + 3.0, z + sg * 0.01 - (sg < 0 ? 0.06 : 0), x + 6.5, KERB + 3.8, z + sg * 0.07, col(band));
        ctxC.screen.box(x + 0.3, KERB + 0.3, z + sg * 0.02 - (sg < 0 ? 0.05 : 0), x + 6.2, KERB + 2.8, z + sg * 0.07, VH.col(win, 1.25));
      }
    }
    ctxC.interior.box(C.x0 + 0.01, KERB, C.z0, C.x0 + 0.06, KERB + B.h, C.z1, col(0xf1ece2));
    for (let x = C.x0 + 4; x < B.x1 - 3; x += 7.5) ctxC.screen.box(C.x0 + 0.06, KERB + 0.3, C.z0 + 4 + ((x * 3) % 10), C.x0 + 0.1, KERB + 2.8, C.z0 + 10 + ((x * 3) % 10), VH.col(0xfff2d0, 1.2));
    // The fountain, benches round it, planters.
    const fx = (C.x0 + B.x1) / 2 - 1, fz = (C.z0 + C.z1) / 2;
    ctxC.prop.cylinder(fx, KERB, fz, 3.2, 3.2, 0.55, 18, col(0xd8d2c6), true);
    ctxC.screen.box(fx - 2.6, KERB + 0.5, fz - 2.6, fx + 2.6, KERB + 0.52, fz + 2.6, VH.col(0x6fc3e8, 0.9));
    ctxC.prop.cylinder(fx, KERB + 0.5, fz, 0.35, 0.25, 1.6, 10, col(0xd8d2c6), true);
    Sk.disc(world, fx, fz, 3.2, 0, KERB + 0.55, 'stone');
    Sk.disc(world, fx, fz, 0.4, 0, KERB + 2.1, 'stone');
    for (const [x, z, yaw] of [[fx, fz - 6, 0], [fx, fz + 6, PI], [fx - 6, fz, PI / 2]]) world.addProp('bench', x, KERB, z, yaw, 1);
    for (const z of [C.z0 + 3, C.z1 - 3]) world.addProp('planter', B.x1 - 4, KERB, z, 0, 1);
    (world.floodlights || (world.floodlights = [])).push({ x: fx, z: fz, r: 14, y: KERB + 0.03, strength: 0.6, tint: [1.1, 1.08, 1.0] });
    // The canopy over the entrance: a slab on four posts, the mall's name on top.
    const cz0 = C.z0 - 1, cz1 = C.z1 + 1, cx1 = B.x1 + 6;
    box(world, 'prop', B.x1, KERB + 4.6, cz0, cx1, KERB + 5.1, cz1, trim, 'building');
    for (const z of [cz0 + 0.4, cz1 - 0.4]) for (const x of [cx1 - 0.4]) box(world, 'prop', x - 0.2, KERB, z - 0.2, x + 0.2, KERB + 4.6, z + 0.2, 0xf2f2ee, 'pole');
    world.ctxAt(cx1, (cz0 + cz1) / 2).screen.box(B.x1 + 0.5, KERB + 4.58, cz0 + 1, cx1 - 0.5, KERB + 4.6, cz1 - 1, VH.col(0xfff2d0, 1.8));
    W.sign(world, { x: cx1 - 0.2, y: KERB + 6.6, z: (cz0 + cz1) / 2, yaw: PI / 2, w: 16, h: 2.8, lines: ['VERDE MALL'], style: 'neon', oneSided: true, colors: { bg: ['#2f7f6f', '#1f5f52'], fg: '#ffffff', glow: '#8fe8c8', outline: '#ffffff' } });
    // The anchors' names on the front, north and south.
    W.sign(world, { x: B.x1 + 0.1, y: KERB + 7.6, z: (B.z0 + C.z0) / 2, yaw: PI / 2, w: 18, h: 2.2, lines: ["BAXTER'S · DEPARTMENT STORE"], style: 'brand', oneSided: true, colors: { bg: ['#7a1f2b', '#5a1520'], fg: '#f4e2c0' } });
    W.sign(world, { x: B.x1 + 0.1, y: KERB + 7.6, z: (C.z1 + B.z1) / 2, yaw: PI / 2, w: 18, h: 2.2, lines: ['VERDE 6 · CINEMAS'], style: 'neon', oneSided: true, colors: { bg: ['#1c1c3a', '#2a2a5a'], fg: '#ffd27a', glow: '#ffb050', outline: '#ffd27a' } });

    // --- the forecourt: paving, planters, benches, bollards along its edge, two trolley shelters
    const Fc = MA.fore;
    W.pave(world, Fc.x0, MA.z0 + 2, Fc.x1, MA.z1 - 2, 0xd8cdb8, 'plazaTop', KERB, 3);
    for (let z = B.z0 + 4; z < B.z1 - 2; z += 3) {
      if (z > C.z0 - 6 && z < C.z1 + 6) continue;
      world.addProp('bollard', Fc.x1 + 0.4, KERB, z, 0, 1);
    }
    for (const z of [690, 760]) {
      world.addProp('planter', Fc.x0 + 6, KERB, z, 0, 1);
      world.addProp('bench', Fc.x0 + 6, KERB, z + 4, PI / 2, 1);
    }
    for (const z of [B.z0 + 6, B.z1 - 6]) trolleyShelter(world, Fc.x0 + 3.5, z);
    // Lamps along the forecourt.
    for (let z = B.z0 + 10; z < B.z1; z += 24) world.addProp('streetlight', Fc.x1 - 0.6, KERB, z, -PI / 2, 1);

    // Plant on the roof: air-handling units, ducts, a lift motor room.
    for (const [x, z, w, d, h] of [[-140, 684, 6, 4, 1.8], [-128, 690, 4, 4, 1.4], [-112, 680, 8, 3, 1.6], [-138, 760, 6, 5, 2.2], [-118, 768, 4, 4, 1.4], [-100, 756, 5, 3, 1.6], [-130, 724, 3, 8, 2.6]]) {
      box(world, 'prop', x - w / 2, KERB + B.h, z - d / 2, x + w / 2, KERB + B.h + h, z + d / 2, 0xb8bcc0, 'metal');
      world.ctxAt(x, z).propMatte.box(x - w / 2 + 0.3, KERB + B.h + h, z - d / 2 + 0.3, x + w / 2 - 0.3, KERB + B.h + h + 0.12, z + d / 2 - 0.3, col(0x5a5e63));
    }
    // A zebra crossing over the aisle from the car park to the court.
    for (let z = MA.court.z0 + 9; z < MA.court.z1 - 9; z += 1.2) W.mark(world, MA.park.x0, z, MA.park.x0 + 6.8, z + 0.6, 0xf4f4ef);

    // --- the car park
    buildMallCarPark(world);
  }

  /** A trolley shelter: a roof on posts, a rail, a row of trolleys. */
  function trolleyShelter(world, x, z) {
    const ctx = world.ctxAt(x, z);
    const hx = 1.4, hz = 4;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(world, 'prop', x + sx * hx - 0.06, KERB, z + sz * hz - 0.06, x + sx * hx + 0.06, KERB + 2.4, z + sz * hz + 0.06, 0x2f7f6f, 'pole');
    S().air(world, ctx.prop, x - hx - 0.2, KERB + 2.4, z - hz - 0.2, x + hx + 0.2, KERB + 2.55, z + hz + 0.2, 0x2f7f6f, 'metal');
    // The trolleys nest along the middle (one block, low): solid.
    ctx.prop.box(x - 0.45, KERB + 0.15, z - hz + 0.6, x + 0.45, KERB + 1.0, z + hz - 0.6, col(0xb8bec4));
    for (let zz = z - hz + 0.8; zz < z + hz - 0.6; zz += 0.5) ctx.prop.box(x - 0.47, KERB + 0.9, zz, x + 0.47, KERB + 1.02, zz + 0.04, col(0x2f7f6f));
    world.physics.addBox(x - 0.5, 0, z - hz + 0.6, x + 0.5, KERB + 1.05, z + hz - 0.6, 'metal', F().SOLID | F().SHOTS);
    ctx.prop.box(x + hx - 0.03, KERB + 0.9, z - hz, x + hx + 0.03, KERB + 1.0, z + hz, col(0x2f7f6f));
    world.physics.addBox(x + hx - 0.08, 0, z - hz, x + hx + 0.08, KERB + 1.0, z + hz, 'railing', F().SOLID | F().SHOTS);
  }

  function buildMallCarPark(world) {
    const W = K();
    const P = MA.park;
    W.pave(world, P.x0, P.z0, P.x1, P.z1, 0x9c9ca0, 'asphaltTop', KERB + 0.01, 6);
    // Ways in: across the plot's pavement from the three roads.
    for (const [z0, z1] of MA.inE) W.pave(world, P.x1, z0, MA.x1, z1, 0x9c9ca0, 'asphaltTop', KERB + 0.012, 6);
    W.pave(world, MA.inN[0], MA.z0, MA.inN[1], P.z0, 0x9c9ca0, 'asphaltTop', KERB + 0.012, 6);
    W.pave(world, MA.inS[0], P.z1, MA.inS[1], MA.z1, 0x9c9ca0, 'asphaltTop', KERB + 0.012, 6);
    // Bays: each row a run of 2.6 m bays between the cross aisles; a planted island at each end of the middle rows.
    const zA = P.z0 + 8, zB = P.z1 - 9;
    for (const [x0, x1] of ROWS) {
      for (let z = zA; z <= zB + 1e-6; z += 2.6) W.mark(world, x0, z - 0.06, x1, z + 0.06, 0xf4f4ef);
      const xe = Math.abs(x0 - P.x0) < Math.abs(x1 - P.x0) ? x0 : x1;
      void xe;
    }
    for (const [x0, x1] of [[-54, -44], [-37, -27]]) {
      W.mark(world, (x0 + x1) / 2 - 0.06, zA, (x0 + x1) / 2 + 0.06, zB, 0xf4f4ef);
      for (const z of [zA - 2.2, zB + 2.2]) {
        box(world, 'concrete', x0 + 0.5, KERB, z - 1.6, x1 - 0.5, KERB + 0.3, z + 1.6, 0xd0ccc4, 'kerb', F().SOLID);
        world.ctxAt((x0 + x1) / 2, z).grassTop.topRect(x0 + 0.7, z - 1.4, x1 - 0.7, z + 1.4, KERB + 0.31, col(0xffffff), 6);
        world.addProp('treeB', (x0 + x1) / 2, KERB + 0.3, z, 0, 0.8);
      }
      for (let z = zA + 16; z < zB; z += 26) world.addProp('streetlight', (x0 + x1) / 2, KERB, z, 0, 1);
    }
    // Aisle arrows.
    for (const x of [-57.5, -40.5, -23.5]) for (let z = zA + 10; z < zB; z += 30) W.mark(world, x - 0.15, z, x + 0.15, z + 3, 0xf4f4ef);
    // The edge along Grand Avenue: a low hedge with gaps at the ways in.
    let z = P.z0;
    for (const [g0, g1] of MA.inE.concat([[P.z1, P.z1]])) {
      if (g0 > z + 0.5) {
        const ctx = world.ctxAt(P.x1 + 0.8, (z + g0) / 2);
        ctx.hedge.box(P.x1 + 0.3, KERB, z, P.x1 + 1.4, KERB + 0.9, g0, col(0x4f7f3a));
        world.physics.addBox(P.x1 + 0.3, 0, z, P.x1 + 1.4, KERB + 0.9, g0, 'hedge', F().SOLID | F().CAMERA);
      }
      z = g1;
    }
    // The driving-lesson corner (south-west): a kerbed corner beside a trolley shelter, a line of cones.
    box(world, 'concrete', P.x0, KERB, P.z1 - 7, P.x0 + 4, KERB + 0.22, P.z1, 0xd0ccc4, 'kerb', F().SOLID);
    world.ctxAt(P.x0 + 2, P.z1 - 3.5).marks.box(P.x0 + 3.9, KERB + 0.22, P.z1 - 7, P.x0 + 4.02, KERB + 0.225, P.z1, col(0xf2c230));
    trolleyShelter(world, P.x0 + 7, P.z1 - 3.6);
    for (let x = -58; x <= -22; x += 6) cone(world, x, P.z1 - 3);
    W.sign(world, { x: -44, y: KERB + 2.0, z: P.z1 - 0.6, yaw: PI, w: 4.2, h: 0.9, lines: ['STAFF PARKING · LEARNERS WELCOME'], style: 'road', posts: true, colors: { bg: ['#ffffff', '#ffffff'], fg: '#1c1c1e', border: '#1f5fbf' } });
  }

  /** An orange traffic cone, knee high (cars brush them aside). */
  function cone(world, x, z) {
    const ctx = world.ctxAt(x, z);
    ctx.prop.box(x - 0.24, KERB, z - 0.24, x + 0.24, KERB + 0.04, z + 0.24, col(0x1c1c1e));
    ctx.prop.cylinder(x, KERB + 0.04, z, 0.16, 0.03, 0.42, 8, col(0xf06a1c), true); // solidity: passable
    ctx.prop.cylinder(x, KERB + 0.18, z, 0.115, 0.09, 0.08, 8, col(0xf4f4ef), false); // solidity: passable
  }

  // ------------------------------------------------------------ the school
  // Plot -473..-327 x 927..1043 (front north on Dune Street). West strip:
  // Marigold Close. North: the school. South-east: the ball field.
  const SC = {
    x0: -473, x1: -327, z0: 927, z1: 1043,
    b: { x0: -419, x1: -352, z0: 938, z1: 961, h: 8.2 },
    rail: 930, // the school's front railings (the pavement on Dune Street in front of them)
    play: { x0: -348, x1: -330, z0: 937, z1: 961 },
    staff: { x0: -442, x1: -425, z0: 997, z1: 1041, in: [-437, -430] }, // staff car park and bus bay, in from Orchard Street
    field: { x0: -421, x1: -330, z0: 965, z1: 1040, home: [-414, 1033] },
    close: { x0: -473, x1: -424, rz0: 980, rz1: 988, cx: -437, cz: 984, r: 11 },
  };
  // The bungalows round the close: lot rects and which way they face (s = towards +z, n = towards -z).
  const HOUSES = [
    { id: 'nw', x0: -472, x1: -458, z0: 932, z1: 979, face: 's', wall: 0xf2e6d0, roof: 0x9a4a3a },
    { id: 'ne', x0: -457, x1: -443, z0: 932, z1: 972, face: 's', wall: 0xd8e6ec, roof: 0x5a6f80 },
    { id: 'sw', x0: -472, x1: -458, z0: 989, z1: 1041, face: 'n', wall: 0xe8e0f0, roof: 0x7a5a8a },
    { id: 'se', x0: -457, x1: -443, z0: 996, z1: 1041, face: 'n', wall: 0xf4e8c8, roof: 0x9a4a3a, june: true },
    { id: 'e', x0: -442, x1: -425, z0: 932, z1: 972, face: 's', wall: 0xe0ecd8, roof: 0x4f6f4a },
  ];
  /** A bungalow's footprint: 8 m back from the close (front lawn and drive), a side passage on the east. */
  function houseRect(h) {
    const s = h.face === 's' ? 1 : -1;
    const hz0 = s > 0 ? h.z1 - 19 : h.z0 + 8;
    return { s, hx0: h.x0 + 1, hx1: h.x1 - 3, hz0, hz1: hz0 + 11 };
  }

  function bungalow(world, h) {
    const W = K();
    // The house 8 m back from the close, the front lawn and drive in front of it, the garden behind.
    const { s, hx0, hx1, hz0, hz1 } = houseRect(h);
    const frontZ = s > 0 ? hz1 : hz0;
    const roadZ = s > 0 ? h.z1 : h.z0;
    const ctx = W.building(world, hx0, hz0, hx1, hz1, 3.6, { wall: h.wall, style: 1, ww: 0.5, wh: 0.55, bay: 3.2, parapet: false, sides: { [s > 0 ? 's' : 'n']: 'blank' } });
    W.gable(ctx.prop, hx0 - 0.4, hz0 - 0.4, hx1 + 0.4, hz1 + 0.4, KERB + 3.6, 1.8, 'x', col(h.roof), col(h.wall));
    world.physics.addBox(hx0 - 0.4, KERB + 3.6, hz0 - 0.4, hx1 + 0.4, KERB + 5.4, hz1 + 0.4, 'building', F().ALL);
    // The front: a garage door, the front door with a step, two windows.
    const fz = frontZ + s * 0.02;
    const gx0 = hx1 - 4.2, gx1 = hx1 - 0.8;
    ctx.prop.box(gx0, KERB, Math.min(fz, fz + s * 0.06), gx1, KERB + 2.5, Math.max(fz, fz + s * 0.06), col(0xf4f2ec));
    for (let y = KERB + 0.5; y < KERB + 2.5; y += 0.5) ctx.prop.box(gx0, y, Math.min(fz, fz + s * 0.08), gx1, y + 0.04, Math.max(fz, fz + s * 0.08), col(0xd8d6d0));
    ctx.prop.box(hx0 + 2, KERB, Math.min(fz, fz + s * 0.06), hx0 + 3, KERB + 2.1, Math.max(fz, fz + s * 0.06), col(h.roof));
    ctx.screen.box(hx0 + 3.8, KERB + 1.0, Math.min(fz, fz + s * 0.05), hx0 + 5.6, KERB + 2.2, Math.max(fz, fz + s * 0.05), VH.col(0xffe7b0, 1.1));
    box(world, 'concrete', hx0 + 1.6, KERB, Math.min(frontZ, frontZ + s * 1.2), hx0 + 3.4, KERB + 0.18, Math.max(frontZ, frontZ + s * 1.2), 0xd0ccc4, 'kerb', F().SOLID);
    // Drive (concrete) from the garage to the road; path from the door; lawn either side.
    const dz0 = Math.min(frontZ, roadZ), dz1 = Math.max(frontZ, roadZ);
    W.pave(world, gx0 - 0.3, dz0, gx1 + 0.3, dz1, 0xd8d4cc, 'plazaTop', KERB, 3);
    W.pave(world, hx0 + 1.9, Math.min(frontZ + s * 1.2, roadZ), hx0 + 3.1, Math.max(frontZ + s * 1.2, roadZ), 0xd8d4cc, 'plazaTop', KERB, 3);
    for (const [x0, x1] of [[h.x0 + 0.2, hx0 + 1.9], [hx0 + 3.1, gx0 - 0.3], [gx1 + 0.3, h.x1 - 0.2]]) {
      if (x1 - x0 < 0.3) continue;
      world.ctxAt((x0 + x1) / 2, (dz0 + dz1) / 2).grassTop.topRect(x0, dz0, x1, dz1, KERB, col(0xffffff), 6);
      world.addLawn(x0, dz0, x1, dz1);
    }
    // Back garden lawn, the side passage's strip of lawn, a tree at the bottom of the garden.
    const bz0 = s > 0 ? h.z0 : hz1, bz1 = s > 0 ? hz0 : h.z1;
    if (bz1 - bz0 > 0.5) {
      world.ctxAt((h.x0 + h.x1) / 2, (bz0 + bz1) / 2).grassTop.topRect(h.x0 + 0.2, bz0, h.x1 - 0.2, bz1, KERB, col(0xffffff), 6);
      world.addLawn(h.x0 + 0.2, bz0, h.x1 - 0.2, bz1);
      world.addProp('treeB', h.x0 + 3 + (h.x1 - h.x0 - 6) * VH.math.hash2(h.x0, 3), KERB, s > 0 ? h.z0 + 5 : h.z1 - 5, 0, 0.75);
    }
    world.ctxAt(hx1 + 1, (hz0 + hz1) / 2).grassTop.topRect(hx1 + 0.4, hz0, h.x1 - 0.2, hz1, KERB, col(0xffffff), 6);
    world.addLawn(hx1 + 0.4, hz0, h.x1 - 0.2, hz1);
    // A sprinkler on the front lawn, a letterbox by the drive.
    const sx = hx0 + 0.9, sz = (frontZ + roadZ) / 2;
    ctx.prop.box(sx - 0.04, KERB, sz - 0.04, sx + 0.04, KERB + 0.25, sz + 0.04, col(0x3a3f45)); // solidity: passable
    ctx.screen.box(sx - 1.4, KERB + 0.24, sz - 0.02, sx + 1.4, KERB + 0.26, sz + 0.02, VH.col(0xcfefff, 0.7)); // solidity: passable
    const lx = gx0 - 0.9, lz = roadZ - s * 0.6;
    box(world, 'prop', lx - 0.05, KERB, lz - 0.05, lx + 0.05, KERB + 1.0, lz + 0.05, 0x3a3f45, 'pole');
    box(world, 'prop', lx - 0.22, KERB + 1.0, lz - 0.15, lx + 0.22, KERB + 1.32, lz + 0.15, h.roof, 'metal');
    return { hx0, hx1, hz0, hz1, gx0, gx1, frontZ, roadZ, s };
  }

  function buildClose(world) {
    const W = K();
    const C = SC.close;
    // The road in from Linden Avenue and the turning circle.
    W.pave(world, C.x0, C.rz0, C.cx, C.rz1, 0x8f9096, 'asphaltTop', KERB + 0.01, 6);
    const ctxC = world.ctxAt(C.cx, C.cz);
    const n = 20, pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 2 * PI;
      pts.push([C.cx + Math.cos(a) * C.r, KERB + 0.01, C.cz - Math.sin(a) * C.r]);
    }
    S().face(ctxC.asphaltTop, pts, col(0x8f9096), [C.cx, -10, C.cz]);
    // An island in the middle of the circle with a tree.
    ctxC.concrete.cylinder(C.cx, KERB, C.cz, 3, 3, 0.2, 14, col(0xd0ccc4), true);
    ctxC.grassTop.cylinder(C.cx, KERB + 0.2, C.cz, 2.8, 2.8, 0.01, 14, col(0xffffff), true);
    S().disc(world, C.cx, C.cz, 3, 0, KERB + 0.2, 'kerb', F().SOLID);
    world.addProp('tree', C.cx, KERB + 0.2, C.cz, 0, 1);
    // The name.
    W.sign(world, { x: C.x0 + 3, y: KERB + 2.4, z: C.rz0 - 1.2, yaw: -PI / 2, w: 2.6, h: 0.6, lines: ['MARIGOLD CLOSE'], style: 'road', posts: true, colors: { bg: ['#1f5f3a', '#1f5f3a'], fg: '#ffffff', border: '#ffffff' } });
    W.sign(world, { x: C.x0 + 3, y: KERB + 1.6, z: C.rz0 - 1.2, yaw: -PI / 2, w: 1.6, h: 0.5, lines: ['NO THROUGH ROAD'], style: 'road', colors: { bg: ['#ffffff', '#ffffff'], fg: '#1c1c1e', border: '#d8342c' } });
    // The houses, picket fences between the lots, a basketball hoop on one drive.
    const built = {};
    for (const h of HOUSES) built[h.id] = bungalow(world, h);
    for (const [x, z0, z1] of [[-457.5, 932, 979], [-457.5, 989, 1041], [-442.5, 932, 972]]) W.fence(world, x, z0 + 0.5, x, z1 - 0.5, [], 'picket', 1.1);
    W.fence(world, SC.close.x1 - 0.5, 932.5, SC.close.x1 - 0.5, 971, [], 'picket', 1.1);
    W.fence(world, SC.x0 + 1, 932.3, SC.close.x1, 932.3, [], 'picket', 1.1);
    W.fence(world, SC.x0 + 1, 1040.7, SC.staff.x0 - 0.5, 1040.7, [], 'picket', 1.1);
    buildStaffPark(world);
    {
      const b = built.nw;
      const x = b.gx1 + 0.6, z = b.roadZ - 1.4;
      const ctx = world.ctxAt(x, z);
      S().drum(world, ctx.prop, x, KERB, z, 0.08, 3.2, 8, 0x3a3f45, 'pole');
      ctx.prop.box(x - 0.9, KERB + 2.9, z - 0.62, x + 0.9, KERB + 3.95, z - 0.58, col(0xf4f2ec));
      ctx.prop.cylinder(x, KERB + 3.05, z - 0.85, 0.24, 0.24, 0.03, 10, col(0xf06a1c), false);
    }
    // June's: Aunt Win's shed at the side, the gnome guarding the key, a perfect lawn stripe.
    {
      const b = built.se;
      const sx0 = b.hx1 + 0.35, sx1 = sx0 + 2.3, sz0 = b.hz0 + 2, sz1 = sz0 + 3.0;
      const ctx = world.ctxAt(sx0, sz0);
      box(world, 'wood', sx0, KERB, sz0, sx1, KERB + 2.2, sz1, 0x8a6a48, 'plank');
      W.gable(ctx.wood, sx0 - 0.2, sz0 - 0.2, sx1 + 0.2, sz1 + 0.2, KERB + 2.2, 0.6, 'z', col(0x4a3a2a), col(0x8a6a48));
      world.physics.addBox(sx0 - 0.2, KERB + 2.2, sz0 - 0.2, sx1 + 0.2, KERB + 2.8, sz1 + 0.2, 'building', F().ALL);
      // The plank door on the drive side (north), a padlock.
      ctx.wood.box(sx0 + 0.6, KERB, sz0 - 0.06, sx1 - 0.6, KERB + 1.9, sz0, col(0x6b4e33));
      for (const y of [0.4, 1.5]) ctx.wood.box(sx0 + 0.6, KERB + y, sz0 - 0.09, sx1 - 0.6, KERB + y + 0.12, sz0 - 0.05, col(0x5a3f28));
      ctx.prop.box(sx1 - 0.85, KERB + 1.0, sz0 - 0.12, sx1 - 0.72, KERB + 1.15, sz0 - 0.08, col(0xb8a040));
      // The gnome: red hat, white beard, blue coat, on the lawn by the door.
      const gx = sx0 - 0.1, gz = sz0 - 1.0;
      ctx.prop.cylinder(gx, KERB, gz, 0.13, 0.11, 0.28, 8, col(0x2f5fbf), true);
      ctx.prop.cylinder(gx, KERB + 0.28, gz, 0.09, 0.09, 0.1, 8, col(0xf0d0b0), true);
      ctx.prop.cylinder(gx, KERB + 0.26, gz, 0.1, 0.02, 0.12, 8, col(0xf4f4ef), false);
      ctx.prop.cylinder(gx, KERB + 0.38, gz, 0.1, 0.0, 0.22, 8, col(0xd8342c), false);
      world.physics.addBox(gx - 0.14, 0, gz - 0.14, gx + 0.14, KERB + 0.6, gz + 0.14, 'stone', F().SOLID);
      // Mowing stripes on the front lawn.
      for (let x = b.hx0 - 0.8, i = 0; x < b.gx0 - 0.4; x += 1.0, i++) if (i % 2) world.ctxAt(x, b.roadZ + 3).marks.topRect(x, Math.min(b.frontZ, b.roadZ) + 1.3, x + 1.0, Math.max(b.frontZ, b.roadZ) - 0.2, KERB + 0.02, col(0x6f9f4a));
      SC.shed = { x: (sx0 + sx1) / 2, z: sz0 - 1.4, door: sz0 };
      SC.june = { x: (b.gx0 + b.gx1) / 2, z: b.roadZ + 3.5, frontZ: b.frontZ, roadZ: b.roadZ };
    }
    // Lamps round the close.
    for (const [x, z, yaw] of [[-466, 979.2, 0], [-447, 979.2, 0], [-461, 988.8, PI]]) world.addProp('streetlight', x, KERB, z, yaw, 1);
  }

  /**
   * The school's staff car park and bus bay, south-east of the turning circle,
   * in from Orchard Street: a row of bays, the school bus parked along the far
   * side, bollards across the close end (people walk through, cars can't),
   * a hedge along June's fence.
   */
  function buildStaffPark(world) {
    const W = K();
    const P = SC.staff;
    W.pave(world, P.x0, P.z0, P.x1, 1043, 0x8f9096, 'asphaltTop', KERB + 0.01, 6);
    for (let z = P.z0 + 4; z <= P.z1 - 5 + 1e-6; z += 2.6) W.mark(world, P.x1 - 5, z - 0.06, P.x1, z + 0.06, 0xf4f4ef);
    W.mark(world, P.x1 - 5.06, P.z0 + 4, P.x1 - 4.94, P.z1 - 5, 0xf4f4ef);
    // The bus bay: yellow hatching along the west side, BUS painted on it.
    W.mark(world, P.x0 + 3.9, P.z0 + 3, P.x0 + 4.05, P.z0 + 18, 0xf2c230);
    for (let z = P.z0 + 3.5; z < P.z0 + 18; z += 2.5) W.mark(world, P.x0 + 0.6, z, P.x0 + 3.8, z + 0.15, 0xf2c230);
    schoolBus(world, P.x0 + 2.2, P.z0 + 10.5);
    // Bollards across the close end (no rat run from the close to Orchard Street), the hedge on June's side.
    for (let x = P.x0 + 0.8; x < P.x1 - 0.3; x += 1.5) {
      const c = world.ctxAt(x, P.z0 - 0.4);
      S().drum(world, c.prop, x, KERB, P.z0 - 0.4, 0.13, 0.95, 8, 0x3a3f45, 'pole', F().SOLID | F().SHOTS);
      c.screen.box(x - 0.135, KERB + 0.75, P.z0 - 0.535, x + 0.135, KERB + 0.82, P.z0 - 0.265, VH.col(0xf2c230, 1.2));
    }
    world.ctxAt(P.x0, (P.z0 + P.z1) / 2).hedge.box(P.x0 - 0.7, KERB, P.z0, P.x0 - 0.1, KERB + 1.2, P.z1, col(0x4f7f3a));
    world.physics.addBox(P.x0 - 0.7, 0, P.z0, P.x0 - 0.1, KERB + 1.2, P.z1, 'hedge', F().SOLID | F().CAMERA);
    // The east side: the picket fence along the field path; the south: fence either side of the way in.
    W.fence(world, P.x1 + 0.5, P.z0, P.x1 + 0.5, P.z1, [], 'picket', 1.1);
    W.fence(world, P.x0, 1040.7, P.x1 + 0.5, 1040.7, [P.in], 'picket', 1.1);
    W.sign(world, { x: P.in[0] - 1.2, y: KERB + 2.1, z: 1041.6, yaw: 0, w: 3.6, h: 1.0, lines: ['VISTA VERDE SCHOOL', 'STAFF & BUSES ONLY'], style: 'road', posts: true, colors: { bg: ['#1f5fbf', '#1f5fbf'], fg: '#ffffff', border: '#ffffff' } });
    world.addProp('streetlight', P.x1 - 0.8, KERB, (P.z0 + P.z1) / 2, -PI / 2, 1);
  }

  /**
   * School railings: dark green bars on two rails, 1.9 m, solid; along x
   * (x0, x1, z, gaps along x) or, with four numbers, along z (x, z0, x, z1).
   */
  function palisade(world, a, b, c, d, e) {
    const alongZ = e !== undefined;
    const x0 = a, z0 = alongZ ? b : c, x1 = alongZ ? c : b, z1 = alongZ ? d : c;
    const gaps = (alongZ ? e : d) || [];
    const lo = alongZ ? Math.min(z0, z1) : Math.min(x0, x1), hi = alongZ ? Math.max(z0, z1) : Math.max(x0, x1);
    const k = alongZ ? x0 : z0;
    const segs = [];
    let cur = lo;
    for (const [g0, g1] of gaps) { if (g0 > cur) segs.push([cur, g0]); cur = Math.max(cur, g1); }
    if (cur < hi) segs.push([cur, hi]);
    const G = col(0x1f4f3a), H = 1.9;
    const R = (p0, p1, c0, c1, y0, y1) => (alongZ ? [c0, y0, p0, c1, y1, p1] : [p0, y0, c0, p1, y1, c1]);
    for (const [s0, s1] of segs) {
      for (let p = s0; p < s1 - 1e-6; p += 40) {
        const p1 = Math.min(s1, p + 40), mid = (p + p1) / 2;
        const ctx = alongZ ? world.ctxAt(k, mid) : world.ctxAt(mid, k);
        for (const y of [0.12, 1.7]) ctx.prop.box(...R(p, p1, k - 0.03, k + 0.03, KERB + y, KERB + y + 0.07), G);
        for (let q = p + 0.08; q < p1; q += 0.2) ctx.prop.box(...R(q, q + 0.035, k - 0.018, k + 0.018, KERB, KERB + H), G);
        for (let q = Math.ceil(p / 2.5) * 2.5; q <= p1; q += 2.5) ctx.prop.box(...R(q - 0.05, q + 0.05, k - 0.05, k + 0.05, KERB, KERB + H + 0.08), G);
      }
      const bx = R(s0, s1, k - 0.08, k + 0.08, 0, KERB + H);
      world.physics.addBox(bx[0], bx[1], bx[2], bx[3], bx[4], bx[5], 'railing', F().SOLID | F().CAMERA);
    }
  }

  /** A yellow school bus, parked along z with its nose to -z (drawn, solid). */
  function schoolBus(world, x, z) {
    const c = world.ctxAt(x, z);
    const hw = 1.25, hl = 5.8;
    c.prop.box(x - hw, KERB + 0.55, z - hl + 1.4, x + hw, KERB + 3.0, z + hl, col(0xf2b818));
    c.prop.box(x - hw, KERB + 0.55, z - hl, x + hw, KERB + 1.7, z - hl + 1.4, col(0xf2b818)); // the bonnet
    c.prop.box(x - hw - 0.02, KERB + 1.8, z - hl + 1.6, x + hw + 0.02, KERB + 2.6, z + hl - 0.5, col(0x1c2a33));
    c.prop.box(x - hw + 0.1, KERB + 1.8, z - hl + 1.36, x + hw - 0.1, KERB + 2.7, z - hl + 1.42, col(0x1c2a33));
    for (const y of [1.1, 1.65]) c.prop.box(x - hw - 0.03, KERB + y, z - hl + 1.4, x + hw + 0.03, KERB + y + 0.08, z + hl, col(0x1c1c1e));
    c.prop.box(x - hw - 0.04, KERB + 0.5, z - hl - 0.04, x + hw + 0.04, KERB + 0.75, z - hl + 0.2, col(0x2a2a2a));
    for (const sx of [-0.85, 0.85]) c.screen.box(x + sx - 0.2, KERB + 1.0, z - hl - 0.03, x + sx + 0.2, KERB + 1.25, z - hl, VH.col(0xfff2d0, 1.4));
    for (const zz of [z - hl + 1.0, z + hl - 2.2]) for (const sx of [-1, 1]) c.propMatte.box(x + sx * hw - 0.16, KERB, zz - 0.5, x + sx * hw + 0.16, KERB + 1.0, zz + 0.5, col(0x1c1c1e));
    world.physics.addBox(x - hw, 0, z - hl + 1.4, x + hw, KERB + 3.0, z + hl, 'metal', F().ALL);
    world.physics.addBox(x - hw, 0, z - hl, x + hw, KERB + 1.7, z - hl + 1.4, 'metal', F().ALL);
  }

  function buildSchool(world) {
    const W = K(), Sk = S();
    const B = SC.b;
    // Front lawn and the path to the doors.
    const doorX = (B.x0 + B.x1) / 2;
    W.pave(world, SC.close.x1 + 1, SC.z0 + 1, SC.x1 - 1, SC.play.z0, 0xd8d4cc, 'plazaTop', KERB, 3);
    W.pave(world, B.x0 - 1, SC.play.z0, B.x1 + 1, B.z0, 0xd8d4cc, 'plazaTop', KERB, 3);
    // The school: two storeys of brick with bands of windows, a flat roof.
    const ctx = W.building(world, B.x0, B.z0, B.x1, B.z1, B.h, { wall: 0xc98f6a, roof: 0x8d8a84, style: 3, ww: 0.6, wh: 0.5, bay: 3.4, floorH: 4.1, seed: 0.23, parapet: 0.6 });
    // The entrance: double glass doors (shut) under a canopy on posts; the name above.
    ctx.screen.box(doorX - 2.2, KERB, B.z0 - 0.06, doorX + 2.2, KERB + 2.6, B.z0, VH.col(0x9fd0e8, 1.1));
    ctx.prop.box(doorX - 0.06, KERB, B.z0 - 0.08, doorX + 0.06, KERB + 2.6, B.z0, col(0x3a3f45));
    S().air(world, ctx.prop, doorX - 4, KERB + 3.2, B.z0 - 4, doorX + 4, KERB + 3.5, B.z0, 0x1f5fbf, 'building');
    for (const x of [doorX - 3.7, doorX + 3.7]) box(world, 'prop', x - 0.15, KERB, B.z0 - 3.85, x + 0.15, KERB + 3.2, B.z0 - 3.55, 0xf4f2ec, 'pole');
    W.sign(world, { x: doorX, y: KERB + 5.4, z: B.z0 - 0.08, yaw: PI, w: 14, h: 1.6, lines: ['VISTA VERDE SCHOOL'], style: 'plaque', oneSided: true, colors: { bg: ['#1f5fbf', '#1f4f9f'], fg: '#ffffff', border: '#ffffff' } });
    // The front railings on Dune Street with the school gates (open) at the path to the doors.
    const R = SC.rail;
    palisade(world, SC.close.x1 - 0.5, SC.x1 - 3, R, [[doorX - 3, doorX + 3]]);
    palisade(world, SC.close.x1 - 0.5, R, SC.close.x1 - 0.5, 932.3, []);
    for (const sx of [-1, 1]) {
      const px = doorX + sx * 3.35;
      const c = world.ctxAt(px, R);
      box(world, 'concrete', px - 0.35, KERB, R - 0.35, px + 0.35, KERB + 2.3, R + 0.35, 0xb5664a, 'brick');
      c.prop.box(px - 0.42, KERB + 2.3, R - 0.42, px + 0.42, KERB + 2.45, R + 0.42, col(0xe8e2d6));
      c.screen.cylinder(px, KERB + 2.45, R, 0.16, 0.2, 0.3, 8, VH.col(0xfff0c8, 1.8), true);
      // The gate leaf, swung right back into the forecourt.
      const lx = doorX + sx * 2.9;
      c.prop.box(lx - 0.04, KERB + 0.1, R + 0.1, lx + 0.04, KERB + 0.18, R + 2.9, col(0x1f4f3a));
      c.prop.box(lx - 0.04, KERB + 1.62, R + 0.1, lx + 0.04, KERB + 1.72, R + 2.9, col(0x1f4f3a));
      for (let z = R + 0.15; z < R + 2.95; z += 0.2) c.prop.box(lx - 0.02, KERB + 0.1, z, lx + 0.02, KERB + 1.85, z + 0.04, col(0x1f4f3a));
      world.physics.addBox(lx - 0.08, 0, R + 0.1, lx + 0.08, KERB + 1.85, R + 2.95, 'railing', F().SOLID | F().CAMERA);
    }
    W.sign(world, { x: doorX + 3.35, y: KERB + 1.5, z: R - 0.37, yaw: PI, w: 0.62, h: 0.8, lines: ['VVS', 'GATE A'], style: 'plaque', oneSided: true, colors: { bg: ['#1f5fbf', '#1f4f9f'], fg: '#ffffff', border: '#ffffff' } });
    // The lawn on the close side with two trees.
    world.ctxAt(-421.5, 950).grassTop.topRect(SC.close.x1 - 0.3, B.z0, B.x0 - 1.2, B.z1, KERB, col(0xffffff), 6);
    world.addLawn(SC.close.x1 - 0.3, B.z0, B.x0 - 1.2, B.z1);
    for (const z of [941, 954]) world.addProp('tree', -421.6, KERB, z, 0, 0.9);
    // A welcome board inside the railings, a flagpole, bike racks.
    W.sign(world, { x: B.x0 + 8, y: KERB + 1.6, z: R + 2.5, yaw: PI, w: 5.6, h: 1.8, lines: ['VISTA VERDE SCHOOL', 'Home of the Verde Vipers'], style: 'welcome', posts: true, colors: { bg: ['#1f5fbf', '#2f8fbf', '#3fae7a'] } });
    Sk.drum(world, ctx.prop, B.x1 - 6, KERB, R + 3, 0.08, 9, 8, 0xcfd3d6, 'pole');
    ctx.prop.box(B.x1 - 5.95, KERB + 7.6, R + 2.98, B.x1 - 4.2, KERB + 8.8, R + 3.02, col(0x1f5fbf));
    for (let x = B.x1 - 14; x < B.x1 - 8; x += 0.8) ctx.prop.box(x - 0.03, KERB, B.z0 - 2.4, x + 0.03, KERB + 0.8, B.z0 - 1.6, col(0x8a9097)); // solidity: passable
    world.physics.addBox(B.x1 - 14.2, 0, B.z0 - 2.4, B.x1 - 7.8, KERB + 0.8, B.z0 - 1.6, 'railing', F().SOLID | F().SHOTS);
    // Lamps along the front.
    for (const x of [B.x0 + 4, doorX - 14, doorX + 14, B.x1 - 2]) world.addProp('streetlight', x, KERB, SC.z0 + 1.6, PI, 1);

    // --- the playground: a climbing frame with a slide, swings, safety surface, a low fence
    const Pl = SC.play;
    world.ctxAt((Pl.x0 + Pl.x1) / 2, (Pl.z0 + Pl.z1) / 2).decal.topRect(Pl.x0, Pl.z0, Pl.x1, Pl.z1, KERB + 0.005, col(0x3f8f6f));
    W.fence(world, Pl.x0, Pl.z0, Pl.x1, Pl.z0, [[Pl.x0 + 6, Pl.x0 + 8]], 'picket', 1.1);
    W.fence(world, Pl.x0, Pl.z0, Pl.x0, Pl.z1, [], 'picket', 1.1);
    W.fence(world, Pl.x0, Pl.z1, Pl.x1, Pl.z1, [], 'picket', 1.1);
    {
      const fx0 = Pl.x0 + 4.5, fx1 = fx0 + 4, fz0 = Pl.z0 + 6, fz1 = fz0 + 4, fy = KERB + 1.8;
      const c = world.ctxAt(fx0, fz0);
      for (const x of [fx0, fx1]) for (const z of [fz0, fz1]) box(world, 'prop', x - 0.08, KERB, z - 0.08, x + 0.08, fy + 1.4, z + 0.08, 0xf2c230, 'pole');
      W.deck(world, c.wood, fx0, fz0, fx1, fz1, fy, 0x8a6a48, 'plank', 0.15);
      S().air(world, c.prop, fx0 - 0.2, fy + 1.4, fz0 - 0.2, fx1 + 0.2, fy + 1.6, fz1 + 0.2, 0xe0574f, 'building');
      VH.Landmarks.railing(world, c, fx0, fz0, fx1, fz0, fy, { color: 0x2f8fbf });
      VH.Landmarks.railing(world, c, fx0, fz1, fx1, fz1, fy, { color: 0x2f8fbf });
      VH.Landmarks.railing(world, c, fx1, fz0, fx1, fz1, fy, { color: 0x2f8fbf });
      W.stairs(world, c.wood, fx0 - 3.2, (fz0 + fz1) / 2, 'e', 3.2, 1.2, KERB, fy, 0x8a6a48, { railHex: 0x2f8fbf });
      // The slide: down from the deck's south edge... drawn as a ramp you can walk.
      Sk.profileRamp(world, c.prop, (fx0 + fx1) / 2, fz1 + 4.2, PI, 1.0, [[0, KERB + 0.3], [4.2, fy]], 0x2f8fbf, { core: false, tag: 'metal' });
    }
    {
      // Swings: an A-frame each end, a top bar, two seats.
      const sx0 = Pl.x0 + 9, sx1 = Pl.x0 + 15, sz = Pl.z1 - 5;
      const c = world.ctxAt(sx0, sz);
      for (const x of [sx0, sx1]) for (const dz of [-1, 1]) K().beam(c.prop, x, KERB, sz + dz * 1.2, x, KERB + 2.6, sz, 0.12, col(0xe0574f));
      for (const x of [sx0, sx1]) world.physics.addBox(x - 0.1, 0, sz - 1.3, x + 0.1, KERB + 2.6, sz + 1.3, 'pole', F().SOLID | F().SHOTS);
      c.prop.box(sx0, KERB + 2.55, sz - 0.06, sx1, KERB + 2.7, sz + 0.06, col(0xe0574f));
      for (const x of [sx0 + 1.7, sx1 - 1.7]) {
        for (const dx of [-0.25, 0.25]) c.prop.box(x + dx - 0.015, KERB + 0.55, sz - 0.015, x + dx + 0.015, KERB + 2.55, sz + 0.015, col(0x8a9097));
        c.prop.box(x - 0.3, KERB + 0.5, sz - 0.12, x + 0.3, KERB + 0.56, sz + 0.12, col(0x1c1c1e));
        world.physics.addBox(x - 0.32, KERB + 0.45, sz - 0.15, x + 0.32, KERB + 2.6, sz + 0.15, 'metal', F().SOLID | F().SHOTS);
      }
    }

    // --- the ball field behind the school
    buildField(world);
  }

  function buildField(world) {
    const W = K(), Sk = S();
    const Fd = SC.field;
    const [hx, hz] = Fd.home;
    // Grass all over, then the infield dirt (a quarter disc out from home plate towards the north-east), bases and the mound.
    world.ctxAt((Fd.x0 + Fd.x1) / 2, (Fd.z0 + Fd.z1) / 2);
    for (let x = Fd.x0; x < Fd.x1 - 1e-6; x += 48) for (let z = Fd.z0; z < Fd.z1 - 1e-6; z += 48) {
      const x1 = Math.min(Fd.x1, x + 48), z1 = Math.min(Fd.z1, z + 48);
      world.ctxAt((x + x1) / 2, (z + z1) / 2).grassTop.topRect(x, z, x1, z1, KERB, col(0xffffff), 6);
    }
    world.addLawn(Fd.x0, Fd.z0, Fd.x1, Fd.z1);
    const ctx = world.ctxAt(hx + 15, hz - 15);
    const R = 30, pts = [[hx, KERB + 0.01, hz]];
    for (let i = 0; i <= 12; i++) {
      const a = (i / 12) * (PI / 2);
      pts.push([hx + Math.sin(a) * R, KERB + 0.01, hz - Math.cos(a) * R]);
    }
    S().face(ctx.decal, pts, col(0xb98a5a), [hx, -10, hz]);
    // The grass diamond inside the base paths.
    const bd = 18.3;
    const base = (a) => [hx + Math.sin(a) * bd * 1.0, hz - Math.cos(a) * bd];
    const b1 = [hx + bd, hz], b2 = [hx + bd, hz - bd], b3 = [hx, hz - bd];
    void base;
    S().face(ctx.grassTop, [[hx + 2, KERB + 0.02, hz - 2], [b1[0] - 2, KERB + 0.02, b1[1] - 2], [b2[0] - 2, KERB + 0.02, b2[1] + 2], [b3[0] + 2, KERB + 0.02, b3[1] + 2]], col(0xffffff), [hx, -10, hz]);
    for (const [x, z] of [b1, b2, b3]) ctx.marks.box(x - 0.4, KERB + 0.02, z - 0.4, x + 0.4, KERB + 0.1, z + 0.4, col(0xffffff)); // solidity: passable
    ctx.marks.polygon([[hx - 0.3, KERB + 0.03, hz + 0.3], [hx + 0.3, KERB + 0.03, hz + 0.3], [hx + 0.3, KERB + 0.03, hz - 0.3], [hx - 0.3, KERB + 0.03, hz - 0.3]], col(0xffffff));
    // Foul lines and the mound.
    W.mark(world, hx, hz - 0.06, Fd.x1 - 1, hz + 0.06, 0xffffff, KERB + 0.025);
    W.mark(world, hx - 0.06, Fd.z0 + 1, hx + 0.06, hz, 0xffffff, KERB + 0.025);
    const mx = hx + bd / 2, mz = hz - bd / 2;
    ctx.decal.cylinder(mx, KERB + 0.02, mz, 2.6, 2.4, 0.12, 14, col(0xb98a5a), true);
    SC.mound = { x: mx, z: mz };
    // Backstop behind home plate (chain, tall), dugouts along both lines, bleachers behind the backstop.
    W.fence(world, hx - 6, hz + 4, hx + 8, hz + 4, [], 'chain', 4.0);
    W.fence(world, hx - 4, hz - 8, hx - 4, hz + 4, [], 'chain', 4.0);
    for (const [x0, z0, x1, z1] of [[hx + 10, hz + 2, hx + 20, hz + 4.5], [hx - 4.5 - 2.5, hz - 22, hx - 4.5, hz - 12]]) {
      const c = world.ctxAt((x0 + x1) / 2, (z0 + z1) / 2);
      const alongX = x1 - x0 > z1 - z0;
      // A back wall, a roof, a bench.
      if (alongX) box(world, 'concrete', x0, KERB, z1 - 0.25, x1, KERB + 2.4, z1, 0x2f5f9f, 'wall');
      else box(world, 'concrete', x0, KERB, z0, x0 + 0.25, KERB + 2.4, z1, 0x2f5f9f, 'wall');
      S().air(world, c.prop, x0 - 0.2, KERB + 2.4, z0 - 0.2, x1 + 0.2, KERB + 2.6, z1 + 0.2, 0x1f3f6f, 'building');
      for (const [px, pz] of alongX ? [[x0 + 0.1, z0 + 0.1], [x1 - 0.1, z0 + 0.1]] : [[x1 - 0.1, z0 + 0.1], [x1 - 0.1, z1 - 0.1]]) box(world, 'prop', px - 0.08, KERB, pz - 0.08, px + 0.08, KERB + 2.4, pz + 0.08, 0xcfd3d6, 'pole');
      if (alongX) box(world, 'wood', x0 + 0.5, KERB, z1 - 0.8, x1 - 0.5, KERB + 0.45, z1 - 0.25, 0x8a6a48, 'wood');
      else box(world, 'wood', x0 + 0.25, KERB, z0 + 0.5, x0 + 0.8, KERB + 0.45, z1 - 0.5, 0x8a6a48, 'wood');
    }
    for (let i = 0; i < 4; i++) box(world, 'prop', Fd.x0 + 31, KERB, Fd.z1 - 1.2 - i * 0.9 - 0.9, Fd.x0 + 57, KERB + 0.45 * (4 - i), Fd.z1 - 1.2 - i * 0.9, i % 2 ? 0x9aa6b2 : 0xb8c2cc, 'metal');
    // The outfield fence (low chain) along the north and east, a gate at each end; the plot's west side is the close's fence.
    W.fence(world, Fd.x0, Fd.z0, Fd.x1, Fd.z0, [[Fd.x0 + 2, Fd.x0 + 6]], 'chain', 1.6);
    W.fence(world, Fd.x1, Fd.z0, Fd.x1, Fd.z1, [[Fd.z1 - 8, Fd.z1 - 3]], 'chain', 1.6);
    // The scoreboard in the far corner.
    {
      const sx = Fd.x1 - 6, sz = Fd.z0 + 3;
      const c = world.ctxAt(sx, sz);
      for (const x of [sx - 3, sx + 3]) Sk.drum(world, c.prop, x, KERB, sz, 0.15, 5, 8, 0x3a3f45, 'pole');
      S().air(world, c.prop, sx - 3.6, KERB + 5, sz - 0.2, sx + 3.6, KERB + 8, sz + 0.2, 0x1c3a1c, 'building');
      c.screen.box(sx - 3.0, KERB + 5.4, sz + 0.2, sx + 3.0, KERB + 6.6, sz + 0.24, VH.col(0xffc040, 1.6));
      W.sign(world, { x: sx, y: KERB + 7.3, z: sz + 0.22, yaw: 0, w: 6.8, h: 1.1, lines: ['VERDE VIPERS · HOME  GUEST'], style: 'plaque', oneSided: true, colors: { bg: ['#1c3a1c', '#1c3a1c'], fg: '#ffffff', border: '#f2c230' } });
    }
    // Floodlights on four masts, pools on the grass.
    const pools = world.floodlights || (world.floodlights = []);
    for (const [x, z] of [[Fd.x0 + 1, Fd.z0 + 1], [Fd.x1 - 1, Fd.z0 + 14], [Fd.x1 - 1, Fd.z1 - 1], [Fd.x0 + 1, Fd.z0 + 30]]) {
      const c = world.ctxAt(x, z);
      Sk.drum(world, c.prop, x, KERB, z, 0.18, 14, 8, 0x8a9097, 'pole');
      c.prop.box(x - 1.0, KERB + 14, z - 0.3, x + 1.0, KERB + 14.8, z + 0.3, col(0x3f454c));
      c.screen.box(x - 0.9, KERB + 13.9, z - 0.25, x + 0.9, KERB + 14.0, z + 0.25, VH.col(0xf6f8ff, 2.4));
    }
    for (const [x, z] of [[hx + 10, hz - 10], [hx + 34, hz - 34], [hx + 50, hz - 14], [hx + 20, hz - 50]]) pools.push({ x, z, r: 22, y: KERB + 0.03, strength: 0.45, tint: [1, 1.05, 1.1] });
  }

  // ------------------------------------------------------------- the map
  if (VH.MapPainters) {
    VH.MapPainters.push((g, layout, o) => {
      if (!layout.plots) return;
      const R = o.R;
      const bx = (x0, z0, x1, z1, c, sh) => K().mapBox(g, R, x0, z0, x1, z1, c, sh);
      if (layout.plots.verde_mall) {
        bx(MA.x0, MA.z0, MA.x1, MA.z1, '#9c9ca0', false);
        bx(MA.fore.x0, MA.z0 + 2, MA.fore.x1, MA.z1 - 2, '#d8cdb8', false);
        bx(MA.b.x0, MA.b.z0, MA.b.x1, MA.b.z1, '#e9dcc6');
        bx(MA.court.x0, MA.court.z0, MA.b.x1, MA.court.z1, '#2f7f6f');
      }
      if (layout.plots.vista_verde_school) {
        bx(SC.x0, SC.z0, SC.x1, SC.z1, '#cfc9bb', false);
        bx(SC.field.x0, SC.field.z0, SC.field.x1, SC.field.z1, '#8fbf6a', false);
        g.fillStyle = '#b98a5a';
        R(SC.field.home[0], SC.field.home[1] - 22, SC.field.home[0] + 22, SC.field.home[1]);
        bx(SC.b.x0, SC.b.z0, SC.b.x1, SC.b.z1, '#c98f6a');
        bx(SC.close.x0, SC.close.rz0, SC.close.cx, SC.close.rz1, '#8f9096', false);
        g.fillStyle = '#8f9096';
        R(SC.close.cx - SC.close.r, SC.close.cz - SC.close.r, SC.close.cx + SC.close.r, SC.close.cz + SC.close.r);
        for (const h of HOUSES) {
          const r = houseRect(h);
          bx(r.hx0, r.hz0, r.hx1, r.hz1, '#' + h.roof.toString(16).padStart(6, '0'));
        }
        bx(SC.staff.x0, SC.staff.z0, SC.staff.x1, SC.staff.z1, '#8f9096', false);
        bx(SC.staff.x0 + 1, SC.staff.z0 + 4.7, SC.staff.x0 + 3.5, SC.staff.z0 + 16.3, '#f2b818');
      }
    });
  }

  // --------------------------------------------------------- moving parts
  class VerdeLife {
    constructor(game) {
      this.game = game;
      const W = K();
      if (!W || !game.world || !game.world.verdeMall) return;
      // Shoppers' cars, about two bays in five (the lesson corner and the parallel bay left as they are;
      // fewer than half, since every parked car costs draw calls in a view that already has the mall in it).
      const list = [];
      let seed = 5501;
      const zA = MA.park.z0 + 8, zB = MA.park.z1 - 9;
      for (const [x0, x1, heading] of ROWS) {
        for (let z = zA + 1.3; z < zB; z += 2.6) {
          seed++;
          if (VH.math.hash2(seed, 7) < 0.6) continue;
          list.push(W.parkedSpot((x0 + x1) / 2, z, heading, seed));
        }
      }
      // Teachers' cars in the school's staff car park.
      if (game.world.verdeSchool) {
        const P = SC.staff;
        for (let z = P.z0 + 5.3; z < P.z1 - 5; z += 2.6) {
          seed++;
          if (VH.math.hash2(seed, 11) < 0.35) continue;
          list.push(W.parkedSpot(P.x1 - 2.5, z, PI / 2, seed));
        }
      }
      W.addParkedSpots(game, list);
      // The two cars either side of the parallel bay are always there.
      if (game.vehicles && game.vehicles.addFixedSpot) {
        game.vehicles.addFixedSpot({ type: 'halcyon', x: PB.x, z: PB.z0, yaw: PI, color: 0x8a9aa8, r: 4 });
        game.vehicles.addFixedSpot({ type: 'mesa', x: PB.x, z: PB.z1, yaw: PI, color: 0x6a2a2a, r: 4 });
      }
    }
    update() {}
    stop() {}
    reset() {}
  }

  // -------------------------------------------------------------- register
  VH.Districts.register({
    id: D,
    name: 'Vista Verde',
    plots: ['verde_mall', 'vista_verde_school'],
    build(world, layout) {
      return VH.SouthKit.withUndersides(() => this._build(world, layout)); // canopies, ceilings and lamps show from below
    },
    _build(world, layout) {
      const t0 = performance.now();
      if (!layout.plots || !VH.WNKit || !VH.SouthKit) return;
      if (layout.plots.verde_mall) {
        buildMall(world);
        world.verdeMall = true;
      }
      if (layout.plots.vista_verde_school) {
        buildClose(world);
        buildSchool(world);
        world.verdeSchool = true;
      }
      this.buildMs = Math.round(performance.now() - t0);
    },
    registerPlaces(world, places) {
      const add = (id, p) => {
        const def = places.defs && places.defs[id];
        places.add(id, Object.assign({ district: D, desc: def && def.desc }, p));
      };
      const extra = places.extra[D];
      if (world.verdeMall) {
        const P = MA.park;
        add('verde_mall', { name: 'Verde Mall', x: MA.fore.x0 + 4, z: (MA.court.z0 + MA.court.z1) / 2, yaw: -PI / 2, kind: 'storefront', landmark: true });
        add('mall_cone_slalom', { name: 'The cones, Verde Mall car park', x: -61, z: P.z1 - 3, yaw: PI / 2, kind: 'parking' });
        add('mall_reverse_corner', { name: 'The kerbed corner by the trolley shelter', x: P.x0 + 6, z: P.z1 - 10, yaw: 0, kind: 'parking' });
        add('mall_trolley_lane', { name: 'A lane between the parked rows', x: -40.5, z: 745, yaw: PI, kind: 'parking' });
        add('mall_trolley_stop', { name: 'Short of the trolley', x: -40.5, z: 731, yaw: PI, kind: 'parking' });
        add('mall_parallel_bay', { name: 'The parallel bay by the forecourt', x: PB.x, z: (PB.z0 + PB.z1) / 2, yaw: PI, kind: 'parking' });
        if (extra) {
          extra.push(
            { x: -57.5, z: 700, yaw: PI, kinds: ['parking'], name: 'Verde Mall car park, north' },
            { x: -23.5, z: 760, yaw: 0, kinds: ['parking', 'corner'], name: 'Verde Mall car park, by Grand Avenue' },
            { x: -96, z: 726, yaw: -PI / 2, kinds: ['storefront', 'diner'], name: 'Inside the Verde Mall court' },
            { x: -80, z: 700, yaw: -PI / 2, kinds: ['storefront', 'street'], name: "Outside Baxter's" },
          );
        }
      }
      if (world.verdeSchool) {
        const C = SC.close;
        add('vista_verde_school', { name: 'Vista Verde School', x: (SC.b.x0 + SC.b.x1) / 2, z: SC.rail - 1.4, yaw: 0, kind: 'street', landmark: true });
        add('verde_culdesac', { name: 'Marigold Close', x: C.cx - 6, z: C.cz, yaw: -PI / 2, kind: 'street' });
        add('verde_ballfield', { name: 'The ball field behind the school', x: SC.mound.x, z: SC.mound.z, yaw: PI / 4, kind: 'park' });
        if (SC.june) add('june_house', { name: "June Marlow's bungalow, 4 Marigold Close", x: SC.june.x, z: SC.june.z, yaw: 0, kind: 'garage' });
        if (SC.shed) add('win_shed', { name: "Aunt Win's shed", x: SC.shed.x, z: SC.shed.z, yaw: 0, kind: 'garage' });
        if (extra) {
          extra.push(
            { x: -460, z: 984, yaw: PI / 2, kinds: ['street', 'corner'], name: 'Marigold Close, by the corner' },
            { x: (SC.play.x0 + SC.play.x1) / 2, z: SC.play.z0 - 1.5, yaw: PI, kinds: ['park'], name: 'By the school playground' },
            { x: SC.field.x1 - 10, z: SC.field.z1 - 6, yaw: PI, kinds: ['park', 'overlook'], name: 'The outfield, Vista Verde School' },
          );
        }
      }
    },
    System: VerdeLife,
  });
})();
