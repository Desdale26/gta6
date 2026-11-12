/*
 * districts/coralmarina.js — Coral Marina, the yacht harbour on the north
 * coast between Northgate and the airport (VICEHAVEN 3.0).
 *
 *   coral_marina       a timber promenade along the seawall (the
 *                      harbourmaster's hut, benches, the marina sign) and
 *                      four jetties out over the bay with finger pontoons
 *                      and moored boats (scenery); T-heads with lamps
 *   marina_lighthouse  a rubble breakwater with a walkway out to the
 *                      lighthouse (red and white, a lit lantern room) and
 *                      the keeper's store
 *   yacht_club         the Coral Yacht Club (clubhouse, terrace, flags, a
 *                      pool), its jetty with Leo Castellane's yacht Day One
 *                      at the end; the Coral Point condo tower and its car
 *                      park; two seafood restaurants on Marina Boulevard
 *
 * Asks the waterfront for openings in the seawall railing where the
 * jetties and the breakwater start (world.seawallGaps, landmarks.js).
 * Static parts are merged into the chunk builders (VH.WNKit).
 */
(function () {
  'use strict';

  const VH = window.VH;
  const K = () => VH.WNKit;
  const KERB = 0.15;
  const F = () => VH.COLLIDE;
  const D = 'coralmarina';

  // ---------------------------------------------------------------- plan
  const SEA = 424;
  const STRIP = { x0: 391, x1: 421, z0: -1067, z1: -753 };
  const JETTY = { w: 4, x1: 572, head: { len: 16, half: 10 }, finger: { every: 12, len: 10, w: 1.6 } };
  const JETTIES = [
    { z: -1028, club: true }, // the yacht club's jetty (Day One at its head)
    { z: -958 },
    { z: -888 },
    { z: -818 },
  ];
  const BREAK = { z: -1060, w: 8, walk: 4, x1: 588, light: { x: 590, z: -1060, r: 3.4, h: 22 } };
  const CLUB = {
    house: { x0: 305, x1: 367, z0: -1050, z1: -1004, h: 9 },
    pool: { x0: 315, x1: 355, z0: -994, z1: -974 },
    condo: { x0: 305, x1: 367, z0: -952, z1: -906, h: 48 },
    park: { x0: 300, x1: 372, z0: -896, z1: -840 },
    pelican: { x0: 304, x1: 336, z0: -826, z1: -792, h: 6 },
    crab: { x0: 346, x1: 372, z0: -822, z1: -796, h: 5 },
  };

  const DECK = 0xa8865a;

  // --------------------------------------------------------------- pieces
  /** A timber deck over the water on piles, with a collider; edges kept by invisible walls. */
  function waterDeck(world, x0, z0, x1, z1, y, o) {
    o = o || {};
    K().tiles(world, x0, z0, x1, z1, (a, b, c, d, ctx) => {
      ctx.wood.box(a, y - 0.35, b, c, y, d, VH.col(o.hex || DECK), { bottom: true, uvScale: 2 });
      for (let x = a + 1; x < c; x += 4) for (const z of [b + 0.3, d - 0.3]) ctx.wood.box(x - 0.18, -3, z - 0.18, x + 0.18, y - 0.35, z + 0.18, VH.col(0x5a4a3a));
    });
    world.physics.addBox(x0, y - 0.5, z0, x1, y, z1, o.tag || 'pier', F().SOLID | F().SHOTS);
  }

  /** An invisible wall along one side of a deck over the water, plus a low timber kerb you can see. */
  function edge(world, x0, z0, x1, z1, y) {
    VH.Landmarks.invisibleWall(world, Math.min(x0, x1) - 0.15, Math.min(z0, z1) - 0.15, Math.max(x0, x1) + 0.15, Math.max(z0, z1) + 0.15);
    K().tiles(world, Math.min(x0, x1) - 0.1, Math.min(z0, z1) - 0.1, Math.max(x0, x1) + 0.1, Math.max(z0, z1) + 0.1, (a, b, c, d, ctx) => ctx.wood.box(a, y, b, c, y + 0.18, d, VH.col(0x6b5a44)));
  }

  // ---------------------------------------------------------- the jetties
  function buildJetties(world) {
    const W = K();
    const J = JETTY;
    const y = KERB;
    const hullCols = [0xf4f2ec, 0xf4f2ec, 0xe8eef4, 0x1f3a5a, 0xf2ead8, 0xc8302c, 0xf4f2ec, 0x2f6f4f];
    const trimCols = [0x1f4f7a, 0x3f8f9f, 0xc8302c, 0xf4f2ec, 0x2f6f4f, 0xf4f2ec, 0x1b1d20];
    let n = 0;
    for (const jt of JETTIES) {
      const z0 = jt.z - J.w / 2, z1 = jt.z + J.w / 2;
      waterDeck(world, SEA - 0.3, z0, J.x1, z1, y);
      const hx0 = J.x1, hx1 = J.x1 + J.head.len;
      waterDeck(world, hx0, jt.z - J.head.half, hx1, jt.z + J.head.half, y);
      // Edges: the jetty's sides (open where it meets the head), the head all round.
      edge(world, SEA + 0.6, z0, hx0, z0, y);
      edge(world, SEA + 0.6, z1, hx0, z1, y);
      edge(world, hx0, jt.z - J.head.half, hx0, z0, y);
      edge(world, hx0, z1, hx0, jt.z + J.head.half, y);
      edge(world, hx0, jt.z - J.head.half, hx1, jt.z - J.head.half, y);
      edge(world, hx0, jt.z + J.head.half, hx1, jt.z + J.head.half, y);
      edge(world, hx1, jt.z - J.head.half, hx1, jt.z + J.head.half, y);
      // Lamps on the head, little bollard lights down the jetty, a sign at its root.
      const hctx = world.ctxAt(hx0 + 8, jt.z);
      VH.Landmarks.railing(world, hctx, hx1 - 0.2, jt.z - J.head.half + 0.2, hx1 - 0.2, jt.z + J.head.half - 0.2, y + 0.18, { color: 0xe8e8e8 });
      for (const s of [-1, 1]) world.addProp('streetlight', hx0 + 4, y, jt.z + s * (J.head.half - 1), s > 0 ? Math.PI : 0, 0.8);
      for (let x = SEA + 8; x < J.x1; x += 12) W.lamp(world, x, z1 - 0.3, 0xfff1c8, 2.2, 0.55, y);
      // Fingers (floating pontoons, a step lower) and boats in the slips.
      for (let x = SEA + 14; x < J.x1 - 4; x += J.finger.every) {
        for (const s of [-1, 1]) {
          const fz0 = s < 0 ? z0 - J.finger.len : z1;
          const fz1 = s < 0 ? z0 : z1 + J.finger.len;
          const ctx = world.ctxAt(x, (fz0 + fz1) / 2);
          ctx.wood.box(x - J.finger.w / 2, -0.75, fz0, x + J.finger.w / 2, -0.45, fz1, VH.col(0xb89670), { bottom: true });
          ctx.prop.box(x - J.finger.w / 2 - 0.05, -0.95, fz0, x + J.finger.w / 2 + 0.05, -0.75, fz1, VH.col(0x8f969c));
          // Cleats and a water point at the finger's root.
          ctx.prop.box(x - 0.2, y, (s < 0 ? z0 : z1) - 0.2 * s - 0.1, x + 0.2, y + 0.25, (s < 0 ? z0 : z1) - 0.2 * s + 0.1, VH.col(0x2b2f35));
          // A boat in the slip to the east of this finger (most slips are full).
          if (((n * 7 + (s > 0 ? 3 : 0)) % 10) < 7 && x + J.finger.every < J.x1 - 2) {
            const bx = x + J.finger.every / 2;
            const len = 8 + ((n * 5) % 6);
            const bz = s < 0 ? z0 - 1.2 - len / 2 : z1 + 1.2 + len / 2;
            const sail = n % 3 === 0;
            W.boat(world, bx, bz, len, 'z', -s, {
              hull: hullCols[n % hullCols.length], trim: trimCols[n % trimCols.length], w: Math.min(J.finger.every - 4.2, len * 0.36),
              cabin: sail ? 0.35 : 0.5, flybridge: !sail && len > 11, mast: sail ? len * 1.3 : 0, sail: [0x2f5f8f, 0xc8302c, 0x2f6f4f][n % 3],
            });
          }
          n++;
        }
      }
      // Bigger boats moored along the T-head.
      if (!jt.club) {
        W.boat(world, hx1 + 3.8, jt.z, 16, 'z', 1, { hull: 0xf4f2ec, trim: 0x1f4f7a, w: 5, cabin: 0.6, flybridge: true });
      }
    }
    // Day One: Leo Castellane's white yacht along the yacht club jetty's head.
    const club = JETTIES[0];
    W.boat(world, J.x1 + J.head.len + 5.4, club.z, 30, 'z', 1, { hull: 0xfafaf6, trim: 0x8a8f96, w: 7.5, fh: 2.4, cabin: 0.8, flybridge: true, cabinHex: 0xfafaf6 });
    world.dayOne = { x: J.x1 + J.head.len - 2, z: club.z };
    {
      const ctx = world.ctxAt(SEA + 4, club.z);
      // The club's gate at the root of its jetty.
      for (const s of [-1, 1]) W.solid(world, ctx.prop, SEA + 2, KERB, club.z + s * (J.w / 2 + 0.2) - 0.25, SEA + 2.5, KERB + 2.6, club.z + s * (J.w / 2 + 0.2) + 0.25, 0xf4f2ec, null, 'wall');
      ctx.prop.box(SEA + 2, KERB + 2.6, club.z - J.w / 2 - 0.5, SEA + 2.5, KERB + 3.0, club.z + J.w / 2 + 0.5, VH.col(0x1f3a5a));
      W.sign(world, { x: SEA + 1.95, y: KERB + 3.6, z: club.z, yaw: -Math.PI / 2, w: 4.6, h: 0.9, lines: ['CORAL YACHT CLUB', 'Members and guests'], style: 'info', oneSided: true, colors: { bg: ['#1f3a5a', '#1f3a5a'], fg: '#ffffff', bar: '#d9a12b' } });
    }
    world.seawallGaps = (world.seawallGaps || []).concat(JETTIES.map((j) => [j.z - J.w / 2 - 0.3, j.z + J.w / 2 + 0.3]));
  }

  // ------------------------------------------------- breakwater, lighthouse
  function buildBreakwater(world) {
    const W = K();
    const B = BREAK;
    const z0 = B.z - B.w / 2, z1 = B.z + B.w / 2;
    // Rubble: tumbled grey blocks down to the water either side of a concrete walk.
    K().tiles(world, SEA, z0 - 3, B.x1 + 8, z1 + 3, (a, b, c, d, ctx) => {
      ctx.concrete.box(a, -8, z0, c, KERB, z1, VH.col(0xb8b2a6), { uvScale: 4 });
      for (let x = a + 1.5; x < c; x += 3.1) {
        for (const s of [-1, 1]) {
          const zz = s < 0 ? z0 - 1.3 : z1 + 1.3;
          const k = Math.floor(x * 1.7) % 3;
          ctx.concrete.orientedBox(x, zz, 1.4, 1.6, k * 0.4, -2.5, -0.6 + k * 0.35, VH.col([0x8a8780, 0x9a968e, 0x7a776f][k]));
        }
      }
    });
    world.physics.addBox(SEA, -8, z0, B.x1 + 8, KERB, z1, 'stone');
    // A painted walkway line and low posts with a chain.
    W.pave(world, SEA + 1, B.z - B.walk / 2, B.x1 - 6, B.z + B.walk / 2, 0xd0ccc2, 'plazaTop', KERB + 0.012);
    edge(world, SEA + 0.6, z0, B.x1 + 8, z0, KERB);
    edge(world, SEA + 0.6, z1, B.x1 + 8, z1, KERB);
    edge(world, B.x1 + 8, z0, B.x1 + 8, z1, KERB);
    for (let x = SEA + 10; x < B.x1 - 8; x += 20) W.lamp(world, x, z0 + 0.4, 0xffe2a0, 2.2, 0.9, KERB);
    // The lighthouse: a white tower with red bands on a round base, a gallery, the lantern.
    const L = B.light;
    const ctx = world.ctxAt(L.x, L.z);
    ctx.concrete.cylinder(L.x, -8, L.z, L.r + 2.6, L.r + 2.6, 8 + KERB + 0.6, 16, VH.col(0xb8b2a6), true);
    world.physics.addBox(L.x - L.r - 2.6, -8, L.z - L.r - 2.6, L.x + L.r + 2.6, KERB + 0.6, L.z + L.r + 2.6, 'stone');
    const y0 = KERB + 0.6;
    for (let k = 0; k < 5; k++) {
      const ya = y0 + (k * L.h) / 5, yb = y0 + ((k + 1) * L.h) / 5;
      const r0 = L.r - (k * 0.9) / 5, r1 = L.r - ((k + 1) * 0.9) / 5;
      ctx.b.cylinder(L.x, ya, L.z, r0, r1, yb - ya, 16, VH.col(k % 2 ? 0xc8302c : 0xf4f2ec), false);
    }
    world.physics.addBox(L.x - L.r * 0.8, 0, L.z - L.r * 0.8, L.x + L.r * 0.8, y0 + L.h, L.z + L.r * 0.8, 'building');
    const top = y0 + L.h;
    ctx.prop.cylinder(L.x, top, L.z, L.r + 0.6, L.r + 0.6, 0.35, 16, VH.col(0x2b2f35), true);
    ctx.prop.cylinder(L.x, top + 0.35, L.z, L.r + 0.55, L.r + 0.55, 1.0, 16, VH.col(0x2b2f35), false);
    ctx.screen.cylinder(L.x, top + 0.35, L.z, 1.7, 1.7, 2.8, 12, VH.col(0xfff4c8, 2.6), false);
    ctx.prop.cylinder(L.x, top + 3.15, L.z, 2.1, 0.3, 1.6, 12, VH.col(0xc8302c), true);
    ctx.prop.cylinder(L.x, top + 4.75, L.z, 0.15, 0.08, 1.2, 6, VH.col(0x2b2f35), true);
    world.beacons.push({ x: L.x, y: top + 6.2, z: L.z });
    // Door and portholes, the keeper's store beside it.
    ctx.prop.box(L.x - L.r - 0.05, y0, L.z - 0.7, L.x - L.r + 0.2, y0 + 2.2, L.z + 0.7, VH.col(0x1f3a26));
    for (const yy of [8, 14, 19]) ctx.screen.box(L.x - L.r + 0.6 - 0.05, y0 + yy, L.z - 0.35, L.x - L.r + 0.75, y0 + yy + 0.7, L.z + 0.35, VH.col(0xffe2a0, 0.6));
    W.solid(world, ctx.b, L.x - 14, KERB, B.z - 1.9, L.x - 8, KERB + 2.6, B.z + 1.9, 0xf4f2ec, null, 'building');
    W.gable(ctx.prop, L.x - 14.3, B.z - 2.1, L.x - 7.7, B.z + 2.1, KERB + 2.6, 1.0, 'x', 0xc8302c, 0xf4f2ec);
    world.seawallGaps = (world.seawallGaps || []).concat([[z0 - 0.3, z1 + 0.3]]);
  }

  // ------------------------------------------------------- the promenade
  function buildPromenade(world) {
    const W = K();
    const S = STRIP;
    K().tiles(world, S.x0, S.z0, S.x1, S.z1, (a, b, c, d, ctx) => ctx.wood.topRect(a, b, c, d, KERB + 0.012, VH.col(DECK), 2));
    // Lamps and benches along it; planters.
    for (let z = S.z0 + 14; z < S.z1 - 6; z += 24) {
      world.addProp('streetlight', S.x0 + 1.2, KERB, z, Math.PI / 2, 1);
      world.addProp('bench', S.x1 - 2.4, KERB, z + 12, -Math.PI / 2, 1);
      world.addProp('planter', S.x0 + 2, KERB, z + 6, 0, 1);
    }
    // The harbourmaster's hut and a chandlery kiosk.
    {
      const ctx = world.ctxAt(406, -925);
      W.solid(world, ctx.b, 398, KERB, -930, 412, KERB + 3.4, -920, 0xf4f2ec, null, 'building');
      ctx.screen.box(411.98, KERB + 1.2, -928.5, 412.04, KERB + 2.6, -921.5, VH.col(0xfff0c8, 0.6));
      W.gable(ctx.prop, 397.6, -930.4, 412.4, -919.6, KERB + 3.4, 1.4, 'x', 0x1f3a5a, 0xf4f2ec);
      ctx.prop.box(404.8, KERB + 4.6, -925.1, 405.2, KERB + 9, -924.9, VH.col(0xe8e8e8));
      ctx.prop.box(405.2, KERB + 8.0, -925.05, 406.6, KERB + 8.9, -924.95, VH.col(0x1f3a5a));
      W.solid(world, ctx.prop, 398, KERB, -860, 404, KERB + 2.8, -852, 0x2f6f9f, null, 'building');
      ctx.prop.box(397.4, KERB + 2.8, -860.6, 404.6, KERB + 3.1, -851.4, VH.col(0xf4f2ec));
      ctx.screen.box(403.98, KERB + 1.0, -859, 404.04, KERB + 2.3, -853, VH.col(0xfff0c8, 0.6));
      // Life rings on posts by the seawall.
      for (const z of [-990, -920, -850, -780]) {
        ctx.prop.box(S.x1 - 0.1, KERB, z - 0.06, S.x1 + 0.02, KERB + 1.6, z + 0.06, VH.col(0x8f969c));
        ctx.prop.cylinder(S.x1 + 0.08, KERB + 1.1, z, 0.42, 0.42, 0.1, 10, VH.col(0xd9772b), false);
      }
    }
    W.sign(world, { x: S.x0 + 1, y: 4.2, z: -770, yaw: -Math.PI / 2, w: 9, h: 2.4, lines: ['CORAL MARINA', 'Berths · Fuel · Harbourmaster'], style: 'welcome', posts: true, colors: { bg: ['#3f8f9f', '#1f5f7a', '#1f3a5a'] } });
  }

  // ------------------------------------------------------- the club plot
  function buildClub(world) {
    const W = K();
    const P = { x0: 295, x1: 377, z0: -1063, z1: -758 };
    W.pave(world, P.x0, P.z0, P.x1, P.z1, 0xe6e0d2, 'plazaTop');
    // The clubhouse: white, glass, a navy band; the terrace on the bay side.
    const Hh = CLUB.house;
    {
      const ctx = W.building(world, Hh.x0, Hh.z0, Hh.x1, Hh.z1, Hh.h, { wall: 0xf6f4ee, roof: 0x9a958c, style: 4, ww: 0.8, wh: 0.6, bay: 3.6, floorH: 4.5 });
      ctx.prop.box(Hh.x0 - 0.1, KERB + 4.3, Hh.z0 - 0.1, Hh.x1 + 0.1, KERB + 4.7, Hh.z1 + 0.1, VH.col(0x1f3a5a));
      ctx.prop.box(Hh.x0 - 1.5, KERB + Hh.h, Hh.z0 - 1.5, Hh.x1 + 1.5, KERB + Hh.h + 0.4, Hh.z1 + 1.5, VH.col(0xf6f4ee), { bottom: true });
      W.deck(world, ctx.wood, Hh.x1, Hh.z0 + 2, Hh.x1 + 8, Hh.z1 - 2, KERB + 0.45, DECK, 'boardwalk', 0.45);
      W.deckRails(world, Hh.x1, Hh.z0 + 2, Hh.x1 + 8, Hh.z1 - 2, KERB + 0.45, [{ side: 'n', a0: Hh.x1, a1: Hh.x1 + 8 }, { side: 'w', a0: Hh.z0, a1: Hh.z1 }, { side: 'e', a0: -1028.5, a1: -1024 }], 0xe8e8e8);
      W.stairs(world, ctx.wood, Hh.x1 + 9.5, -1026.2, 'w', 1.5, 2.6, KERB, KERB + 0.45, DECK, { rails: false, tag: 'plank' });
      // Parasols and tables on the terrace.
      for (let z = Hh.z0 + 6; z < Hh.z1 - 4; z += 7) {
        const x = Hh.x1 + 4.5, yy = KERB + 0.45;
        ctx.prop.cylinder(x, yy, z, 0.45, 0.45, 0.72, 10, VH.col(0xf4f4ef), true);
        ctx.prop.box(x - 0.03, yy + 0.72, z - 0.03, x + 0.03, yy + 2.4, z + 0.03, VH.col(0xd8d8d8));
        ctx.prop.cylinder(x, yy + 2.1, z, 1.5, 0.05, 0.5, 8, VH.col(0x1f3a5a), false);
      }
      // Flagpoles with pennants.
      for (let k = 0; k < 3; k++) {
        const fx = Hh.x1 + 10, fz = Hh.z1 + 3 + k * 4;
        ctx.prop.cylinder(fx, KERB, fz, 0.1, 0.06, 11, 6, VH.col(0xe8e8e8), true);
        ctx.prop.box(fx, KERB + 9.4, fz - 0.02, fx + 2.2, KERB + 10.8, fz + 0.02, VH.col([0x1f3a5a, 0xc8302c, 0xd9a12b][k]));
        world.physics.addBox(fx - 0.12, 0, fz - 0.12, fx + 0.12, KERB + 11, fz + 0.12, 'pole', F().SOLID | F().SHOTS);
      }
      W.sign(world, { x: (Hh.x0 + Hh.x1) / 2, y: KERB + Hh.h + 1.5, z: Hh.z1 - 3, yaw: 0, w: 22, h: 2.0, lines: ['CORAL YACHT CLUB'], style: 'neon', oneSided: true, colors: { fg: '#ffffff', glow: '#4ab0ff', outline: '#d9a12b', bg: ['#1f3a5a', '#1f3a5a'] } });
      for (const x of [Hh.x0 + 6, Hh.x1 - 6]) ctx.prop.box(x - 0.1, KERB + Hh.h + 0.4, Hh.z1 - 3.1, x + 0.1, KERB + Hh.h + 0.6, Hh.z1 - 2.9, VH.col(0x2b2f35));
    }
    // The pool: glows after dark; loungers round it.
    {
      const Pl = CLUB.pool;
      const ctx = world.ctxAt((Pl.x0 + Pl.x1) / 2, (Pl.z0 + Pl.z1) / 2);
      ctx.concrete.box(Pl.x0 - 2, KERB, Pl.z0 - 2, Pl.x1 + 2, KERB + 0.2, Pl.z1 + 2, VH.col(0xf4f0e6));
      ctx.screen.topRect(Pl.x0, Pl.z0, Pl.x1, Pl.z1, KERB + 0.21, VH.col(0x5fc8e0, 0.55));
      world.physics.addBox(Pl.x0 - 2, 0, Pl.z0 - 2, Pl.x1 + 2, KERB + 0.2, Pl.z1 + 2, 'stone', F().SOLID);
      for (let x = Pl.x0; x < Pl.x1; x += 4) {
        K().tiltBox(ctx.prop, x + 1, KERB + 0.55, Pl.z1 + 4.2, 0.7, 0.08, 1.9, 0, -0.25, 0xf4f4ef);
      }
      W.fence(world, Pl.x0 - 4, Pl.z0 - 4, Pl.x1 + 4, Pl.z0 - 4, [], 'picket', 1.1);
    }
    // Coral Point condos: a glass tower with balcony bands, its car park.
    {
      const C = CLUB.condo;
      const ctx = W.building(world, C.x0, C.z0, C.x1, C.z1, C.h, { wall: 0xe8f0f4, roof: 0x8d8a84, style: 4, ww: 0.86, wh: 0.66, bay: 3.2, floorH: 3.4 });
      for (let y = KERB + 3.4; y < KERB + C.h - 1; y += 3.4) ctx.prop.box(C.x1, y - 0.15, C.z0 + 2, C.x1 + 1.6, y, C.z1 - 2, VH.col(0xf4f4ef), { bottom: true });
      for (let y = KERB + 3.4; y < KERB + C.h - 1; y += 3.4) ctx.prop.box(C.x1 + 1.5, y, C.z0 + 2, C.x1 + 1.6, y + 1.0, C.z1 - 2, VH.col(0x9fc8d8));
      ctx.prop.box(C.x0 + 20, KERB + 3.6, C.z1, C.x1 - 20, KERB + 3.9, C.z1 + 5, VH.col(0x3f8f9f), { bottom: true });
      W.sign(world, { x: C.x1 + 0.05, y: KERB + C.h - 2, z: (C.z0 + C.z1) / 2, yaw: Math.PI / 2, w: 14, h: 2.2, lines: ['CORAL POINT'], style: 'monolith', oneSided: true });
      const Pk = CLUB.park;
      W.pave(world, Pk.x0, Pk.z0, Pk.x1, Pk.z1, 0xbcbcbc, 'asphaltTop', KERB + 0.016);
      for (let x = Pk.x0 + 2; x <= Pk.x1 - 2; x += 3) {
        W.mark(world, x - 0.07, Pk.z0 + 2, x + 0.07, Pk.z0 + 7.5);
        W.mark(world, x - 0.07, Pk.z1 - 7.5, x + 0.07, Pk.z1 - 2);
      }
      for (const x of [Pk.x0 + 10, Pk.x1 - 10]) world.addProp('streetlight', x, KERB, (Pk.z0 + Pk.z1) / 2, 0, 1);
    }
    // The seafood restaurants on Marina Boulevard.
    {
      const P1 = CLUB.pelican;
      const ctx = W.building(world, P1.x0, P1.z0, P1.x1, P1.z1, P1.h, { wall: 0x5f8fa8, roof: 0x8d8a84, style: 4, ww: 0.8, wh: 0.55, bay: 3, floorH: P1.h, sides: { n: 'blank' } });
      W.gable(ctx.prop, P1.x0 - 0.4, P1.z0 - 0.4, P1.x1 + 0.4, P1.z1 + 0.4, KERB + P1.h, 2.6, 'x', 0x3a3a3a, 0x5f8fa8);
      ctx.screen.box(P1.x0 + 1, KERB + 1.2, P1.z1 + 0.02, P1.x1 - 1, KERB + 3.6, P1.z1 + 0.06, VH.col(0xffd9a0, 0.5));
      W.deck(world, ctx.wood, P1.x0, P1.z1, P1.x1, P1.z1 + 7, KERB + 0.3, DECK, 'boardwalk', 0.3);
      W.festoon(world, P1.x0, KERB + 3.6, P1.z1 + 6.6, P1.x1, KERB + 3.6, P1.z1 + 6.6, 0.5, [0xffd24a, 0xfff4dc], 1.6);
      for (const x of [P1.x0, P1.x1]) ctx.prop.box(x - 0.08, KERB, P1.z1 + 6.5, x + 0.08, KERB + 3.7, P1.z1 + 6.7, VH.col(0x5a4a3a));
      for (let x = P1.x0 + 3; x < P1.x1 - 2; x += 5) {
        ctx.wood.box(x - 0.8, KERB + 1.0, P1.z1 + 2.8, x + 0.8, KERB + 1.08, P1.z1 + 4.2, VH.col(0x8b6a45));
        ctx.wood.box(x - 0.08, KERB + 0.3, P1.z1 + 3.4, x + 0.08, KERB + 1.0, P1.z1 + 3.6, VH.col(0x5a4a3a));
      }
      W.sign(world, { x: (P1.x0 + P1.x1) / 2, y: KERB + P1.h + 1.6, z: P1.z1 + 0.2, yaw: 0, w: 14, h: 1.8, lines: ['THE SALTY PELICAN'], style: 'neon', oneSided: true, colors: { fg: '#7ad7ff', glow: '#2aa8ff', outline: '#ffd24a' } });
      // The crab shack: red boards, nets, a giant crab on the roof.
      const C2 = CLUB.crab;
      const c2 = world.ctxAt(C2.x0, C2.z0);
      c2.wood.box(C2.x0, KERB, C2.z0, C2.x1, KERB + C2.h, C2.z1, VH.col(0xb8402e));
      W.gable(c2.prop, C2.x0 - 0.4, C2.z0 - 0.4, C2.x1 + 0.4, C2.z1 + 0.4, KERB + C2.h, 2.2, 'x', 0x5a4a3a, 0xb8402e);
      world.physics.addBox(C2.x0, 0, C2.z0, C2.x1, KERB + C2.h, C2.z1, 'building');
      c2.screen.box(C2.x0 + 2, KERB + 1.2, C2.z1 + 0.02, C2.x1 - 2, KERB + 3.2, C2.z1 + 0.06, VH.col(0xffd9a0, 0.5));
      c2.prop.box(C2.x0 + 1, KERB + 0.5, C2.z1 + 0.06, C2.x0 + 6, KERB + 4, C2.z1 + 0.1, VH.col(0x8a7a5a));
      const cx = (C2.x0 + C2.x1) / 2, cy = KERB + C2.h + 2.4, cz = (C2.z0 + C2.z1) / 2;
      c2.prop.cylinder(cx, cy - 0.6, cz, 2.0, 2.2, 1.2, 12, VH.col(0xe0482c), true);
      for (const s of [-1, 1]) {
        for (let k = 0; k < 3; k++) K().beam(c2.prop, cx + s * 1.8, cy - 0.3, cz - 0.8 + k * 0.8, cx + s * 3.2, cy - 1.6, cz - 1.2 + k * 1.2, 0.18, 0xe0482c);
        K().beam(c2.prop, cx + s * 1.0, cy, cz + 1.8, cx + s * 1.6, cy + 0.6, cz + 3.2, 0.3, 0xe0482c);
        c2.prop.box(cx + s * 1.6 - 0.5, cy + 0.3, cz + 3.0, cx + s * 1.6 + 0.5, cy + 1.0, cz + 3.8, VH.col(0xe0482c));
      }
      W.sign(world, { x: (C2.x0 + C2.x1) / 2, y: KERB + C2.h + 0.0, z: C2.z1 + 0.15, yaw: 0, w: 12, h: 1.2, lines: ['CORAL CRAB SHACK'], style: 'brand', oneSided: true, colors: { bg: ['#f2c500', '#d9a12b'], fg: '#7a1a10' } });
    }
    // Palms and lamps round the plot.
    for (let z = P.z0 + 8; z < P.z1 - 4; z += 30) world.addProp('palmTall', P.x1 - 2, KERB, z, 0, 1);
    for (let z = P.z0 + 20; z < P.z1 - 4; z += 40) world.addProp('streetlight', P.x0 + 1.5, KERB, z, Math.PI / 2, 1);
  }

  // -------------------------------------------------------------- the map
  if (VH.MapPainters) {
    VH.MapPainters.push((g, layout, o) => {
      const p = layout.plots;
      if (!p || !p.yacht_club) return;
      const R = o.R;
      const box = (r, col, sh) => K().mapBox(g, R, r.x0, r.z0, r.x1, r.z1, col, sh);
      box(STRIP, '#b89670', false);
      g.fillStyle = '#b89670';
      for (const j of JETTIES) {
        R(SEA, j.z - JETTY.w / 2, JETTY.x1, j.z + JETTY.w / 2);
        R(JETTY.x1, j.z - JETTY.head.half, JETTY.x1 + JETTY.head.len, j.z + JETTY.head.half);
        for (let x = SEA + 14; x < JETTY.x1 - 4; x += JETTY.finger.every) R(x - 0.8, j.z - JETTY.w / 2 - JETTY.finger.len, x + 0.8, j.z + JETTY.w / 2 + JETTY.finger.len);
      }
      g.fillStyle = '#9a968e';
      R(SEA, BREAK.z - BREAK.w / 2 - 2, BREAK.x1 + 8, BREAK.z + BREAK.w / 2 + 2);
      g.fillStyle = '#f4f2ec';
      if (o.circle) o.circle(BREAK.light.x, BREAK.light.z, 5);
      box({ x0: 295, z0: -1063, x1: 377, z1: -758 }, '#e6e0d2', false);
      box(CLUB.house, '#f6f4ee');
      box(CLUB.pool, '#5fc8e0', false);
      box(CLUB.condo, '#c8dce4');
      box(CLUB.park, '#9a9a9a', false);
      box(CLUB.pelican, '#5f8fa8');
      box(CLUB.crab, '#b8402e');
    });
  }

  // -------------------------------------------------------------- register
  VH.Districts.register({
    id: D,
    name: 'Coral Marina',
    plots: ['coral_marina', 'yacht_club'],
    build(world, layout) {
      const t0 = performance.now();
      if (!layout.plots || !layout.plots.yacht_club || !VH.WNKit) return;
      buildPromenade(world);
      buildJetties(world);
      buildBreakwater(world);
      buildClub(world);
      world.coralMarina = true;
      this.buildMs = Math.round(performance.now() - t0);
    },
    registerPlaces(world, places) {
      if (!world.coralMarina) return;
      const add = (id, p) => {
        const def = places.defs && places.defs[id];
        places.add(id, Object.assign({ district: D, desc: def && def.desc }, p));
      };
      const B = BREAK;
      add('coral_marina', { name: 'Coral Marina', x: 410, z: JETTIES[2].z + 6, yaw: Math.PI / 2, kind: 'dock', landmark: true });
      add('marina_lighthouse', { name: 'Marina Lighthouse', x: B.light.x - 18, z: B.z, yaw: Math.PI / 2, kind: 'pier', landmark: true });
      add('yacht_club', { name: 'Coral Yacht Club', x: CLUB.house.x1 + 4, z: (CLUB.house.z0 + CLUB.house.z1) / 2, y: KERB + 0.45, yaw: -Math.PI / 2, kind: 'bar', landmark: true });
      add('toby_breakwater', { name: 'The breakwater, Coral Marina', x: 408, z: B.z + B.w / 2 + 4, yaw: Math.PI / 2, kind: 'pier' });
      if (world.dayOne) add('day_one_jetty', { name: 'The yacht club jetty', x: world.dayOne.x, z: world.dayOne.z, yaw: Math.PI / 2, kind: 'dock' });
      add('marina_condos', { name: 'Coral Point condos', x: (CLUB.park.x0 + CLUB.park.x1) / 2, z: CLUB.park.z0 - 3, yaw: Math.PI, kind: 'apartment_front' });
      const extra = places.extra[D];
      if (extra) {
        extra.push(
          { x: 500, z: JETTIES[1].z, yaw: Math.PI / 2, kinds: ['dock', 'pier', 'boardwalk'], name: 'Jetty B' },
          { x: 470, z: JETTIES[3].z, yaw: Math.PI / 2, kinds: ['pier', 'dock', 'boardwalk'], name: 'Jetty D' },
          { x: JETTY.x1 + 8, z: JETTIES[2].z, yaw: Math.PI / 2, kinds: ['dock', 'pier', 'overlook'], name: 'The end of Jetty C' },
          { x: 406, z: -915, yaw: Math.PI / 2, kinds: ['boardwalk', 'dock', 'street'], name: "The harbourmaster's hut" },
          { x: (CLUB.pelican.x0 + CLUB.pelican.x1) / 2, z: CLUB.pelican.z1 + 9, yaw: Math.PI, kinds: ['diner', 'bar', 'storefront'], name: 'The Salty Pelican' },
          { x: (CLUB.crab.x0 + CLUB.crab.x1) / 2, z: CLUB.crab.z1 + 4, yaw: Math.PI, kinds: ['diner', 'storefront'], name: 'Coral Crab Shack' },
          { x: CLUB.park.x0 + 10, z: -868, yaw: Math.PI / 2, kinds: ['parking', 'apartment_front'], name: 'The Coral Point car park' },
          { x: (CLUB.pool.x0 + CLUB.pool.x1) / 2, z: CLUB.pool.z1 + 6, yaw: Math.PI, kinds: ['park', 'mansion', 'bar'], name: 'The yacht club pool' },
          { x: B.light.x - 6, z: B.z, yaw: Math.PI / 2, kinds: ['overlook', 'pier'], name: 'The foot of the lighthouse' },
        );
      }
    },
  });
})();
