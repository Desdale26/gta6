/*
 * districts/sandpiper.js — Sandpiper Beach (VICEHAVEN 3.0): the beach town
 * on the bay, south-east of downtown.
 *
 *   Sandpiper Beach      the long sand along the bay, running down into the
 *                        shallows (the seawall railing opens along it), ten
 *                        lifeguard towers you can climb (7 and 8 matter to
 *                        the story), the promenade with its palms, lamps and
 *                        benches, the Seaspray Motel, the surf shop, the
 *                        Kwik Pik (the old Brask & Marlow Speed Shop: a real
 *                        shop with a floor safe), the prawn shack, the Salty
 *                        Pelican beach bar, the beach car park and the
 *                        Castellane Beach Club's private stretch behind its
 *                        teal fence.
 *   Sandpiper Skate Park the ramps, half-pipe, funbox and rails (solid, for
 *                        feet and cars) and the Launch Lane: a run-up and a
 *                        big kicker that throws a car over Sandpiper Drive
 *                        and the club fence onto the sand.
 *
 * Everything draws into the chunk builders through VH.WNKit and VH.SouthKit.
 */
(function () {
  'use strict';

  const VH = window.VH;
  const KERB = 0.15;
  const D = 'sandpiper';
  const PI = Math.PI;
  const F = () => VH.COLLIDE;
  const K = () => VH.WNKit;
  const S = () => VH.SouthKit;
  const col = (h) => (Array.isArray(h) ? h : VH.col(h));

  // ------------------------------------------------------------ the beach
  // Plot 339..421 x 797..1187 (front west on Sandpiper Drive). The promenade
  // runs down its west edge; east of it everything is sand, carried on past
  // the seawall (x 424) as a slope down into the water.
  const BE = {
    x0: 339, x1: 421, z0: 797, z1: 1187,
    prom: { x0: 340, x1: 349 }, low: 349.4, // the low wall between the promenade and the sand
    sea: 424, wet: 438, shore: 446, yShore: -1.3, // sand slopes from the seawall to the end of the shallows
    gap: [801, 1186], // where the seawall railing opens (world.seawallGaps)
  };
  const SAND = 0xdcbf88;
  const TX = 404; // the lifeguard towers' x
  const TOWERS = [[1, 822], [2, 860], [3, 898], [4, 936], [5, 970], [6, 994], [7, 1062], [8, 1095], [9, 1135], [10, 1172]];
  const TW = { half: 2.5, y: KERB + 3.45, stairLen: 9.5 }; // platform half size, deck height
  const CLUB = { x: 350.6, z0: 1012, z1: 1110, gate: [1057.1, 1058.9] };
  const KWIK = { x0: 339, x1: 357, z0: 964, z1: 986 };
  const MOTEL = { x0: 351.2, x1: 365, z0: 806, z1: 856, h: 6.6, walkY: KERB + 3.3 };
  const PARK = { x0: 351, x1: 398, z0: 1154, z1: 1184, in0: 1162, in1: 1172 };
  const BAR = { x0: 351.5, x1: 375, z0: 1127, z1: 1149, y: KERB + 0.6 };

  /** Plain painted box, solid (collider from the ground when it stands on it). */
  function box(world, surf, x0, y0, z0, x1, y1, z1, hex, tag, flags) {
    S().air(world, world.ctxAt((x0 + x1) / 2, (z0 + z1) / 2)[surf], x0, y0, z0, x1, y1, z1, hex, tag, flags);
  }

  /**
   * A shack you can walk into: three walls, a roof slab with an overhang,
   * the fourth side (`open`: 'w' or 'e') open under an awning, a counter
   * across the inside. o = { wall, roof, awning, counter }.
   */
  function shack(world, x0, z0, x1, z1, h, open, o) {
    const W = K();
    const ctx = world.ctxAt((x0 + x1) / 2, (z0 + z1) / 2);
    const t = 0.25;
    const wall = o.wall || 0xf2e6d0;
    const y1 = KERB + h;
    // Floor, walls.
    ctx.interior.topRect(x0, z0, x1, z1, KERB + 0.02, col(o.floor || 0xb89a72), 2);
    box(world, 'prop', x0, KERB, z0, x1, y1, z0 + t, wall, 'building');
    box(world, 'prop', x0, KERB, z1 - t, x1, y1, z1, wall, 'building');
    if (open === 'w') box(world, 'prop', x1 - t, KERB, z0, x1, y1, z1, wall, 'building');
    else box(world, 'prop', x0, KERB, z0, x0 + t, y1, z1, wall, 'building');
    // Corner posts on the open side and a header beam over it.
    const xo = open === 'w' ? x0 : x1;
    box(world, 'prop', xo - 0.12, y1 - 0.5, z0, xo + 0.12, y1, z1, wall, 'building');
    // Roof slab with an overhang; a striped awning on the open side.
    ctx.prop.box(x0 - 0.4, y1, z0 - 0.4, x1 + 0.4, y1 + 0.25, z1 + 0.4, col(o.roof || 0x2f6f8f), { bottom: true });
    world.physics.addBox(x0 - 0.4, y1, z0 - 0.4, x1 + 0.4, y1 + 0.25, z1 + 0.4, 'building', F().ALL);
    const s = open === 'w' ? -1 : 1;
    for (let z = z0, k = 0; z < z1 - 0.5; z += 1, k++) {
      W.tiltBox(ctx.prop, xo + s * 1.0, y1 - 0.3, z + 0.5, 1.0, 0.06, 2.0, PI / 2, -s * 0.3, k % 2 ? 0xf4efe2 : o.awning || 0xe0574f);
    }
    // The counter, parallel to the open side, 1.6 m in.
    const cx = open === 'w' ? x0 + 1.6 : x1 - 1.6;
    box(world, 'prop', cx - 0.3, KERB, z0 + t + 0.9, cx + 0.3, KERB + 1.05, z1 - t, o.counter || 0x8b6a45, 'wood');
    // A light under the awning (glows at night).
    ctx.screen.box(xo + s * 0.2 - 0.05, y1 - 0.62, (z0 + z1) / 2 - 1.2, xo + s * 0.2 + 0.05, y1 - 0.52, (z0 + z1) / 2 + 1.2, VH.col(0xfff2d0, 2.2));
    return ctx;
  }

  /** A lifeguard tower: a hut on stilts, a deck round it with a rail, the big lamp, stairs up the south side. */
  function lifeguardTower(world, n, x, z) {
    const W = K();
    const ctx = world.ctxAt(x, z);
    const h = TW.half;
    const y = TW.y;
    const red = 0xd8342c, white = 0xf4f2ec, wood = 0xb58a5a;
    // Stilts and braces.
    for (const [px, pz] of [[x - h + 0.2, z - h + 0.2], [x + h - 0.2, z - h + 0.2], [x - h + 0.2, z + h - 0.2], [x + h - 0.2, z + h - 0.2]]) {
      box(world, 'prop', px - 0.15, KERB, pz - 0.15, px + 0.15, y - 0.2, pz + 0.15, white, 'plank');
    }
    for (const s of [-1, 1]) {
      W.beam(ctx.prop, x - h + 0.2, KERB + 0.4, z + s * (h - 0.2), x + h - 0.2, y - 0.5, z + s * (h - 0.2), 0.1, col(white));
      W.beam(ctx.prop, x + s * (h - 0.2), KERB + 0.4, z - h + 0.2, x + s * (h - 0.2), y - 0.5, z + h - 0.2, 0.1, col(white));
      // The braced sides are solid (the space under the hut is boxed in by them).
      world.physics.addBox(x - h + 0.2, 0, z + s * (h - 0.2) - 0.08, x + h - 0.2, y - 0.2, z + s * (h - 0.2) + 0.08, 'plank', F().SOLID | F().CAMERA);
      world.physics.addBox(x + s * (h - 0.2) - 0.08, 0, z - h + 0.2, x + s * (h - 0.2) + 0.08, y - 0.2, z + h - 0.2, 'plank', F().SOLID | F().CAMERA);
    }
    // The deck.
    W.deck(world, ctx.wood, x - h, z - h, x + h, z + h, y, wood, 'plank', 0.2);
    // The hut on the landward (west) part: red and white, a window band to the sea, a pitched roof.
    const hx0 = x - h + 0.2, hx1 = x + 0.3, hz0 = z - 1.6, hz1 = z + 1.6;
    box(world, 'prop', hx0, y, hz0, hx1, y + 2.3, hz1, white, 'building');
    ctx.prop.box(hx0 - 0.02, y + 0.9, hz0 - 0.02, hx1 + 0.02, y + 1.15, hz1 + 0.02, col(red));
    ctx.screen.box(hx1 + 0.01, y + 1.3, hz0 + 0.3, hx1 + 0.04, y + 2.0, hz1 - 0.3, VH.col(0x9fd0e8, 1.0));
    ctx.prop.box(hx1 + 0.01, y, z - 0.45, hx1 + 0.05, y + 2.0, z + 0.45, col(red)); // the door (shut)
    W.gable(ctx.prop, hx0 - 0.3, hz0 - 0.3, hx1 + 0.3, hz1 + 0.3, y + 2.3, 0.9, 'z', col(red), col(white));
    world.physics.addBox(hx0 - 0.3, y + 2.3, hz0 - 0.3, hx1 + 0.3, y + 3.2, hz1 + 0.3, 'building', F().ALL);
    // A flag on the roof.
    ctx.prop.box(x - 0.95, y + 3.1, z - 0.04, x - 0.87, y + 5.2, z + 0.04, col(0xcfd3d6));
    ctx.prop.box(x - 0.87, y + 4.4, z - 0.02, x + 0.3, y + 5.1, z + 0.02, col(0xf2c230));
    ctx.prop.box(x - 0.87, y + 4.4, z - 0.025, x - 0.3, y + 4.75, z + 0.025, col(red));
    // Rails round the deck, open where the stairs arrive (south side, east half).
    W.deckRails(world, x - h, z - h, x + h, z + h, y, [{ side: 's', a0: x + 0.4, a1: x + 2.2 }], white);
    // The big lamp on the front rail: a drum housing on a bracket, its lens glowing at night.
    const lx = x + h - 0.1;
    ctx.prop.box(lx - 0.08, y + 1.0, z - 0.08, lx + 0.08, y + 1.35, z + 0.08, col(0x3f454c));
    ctx.prop.cylinder(lx, y + 1.35, z, 0.36, 0.36, 0.62, 12, col(0x2a2d33), true);
    ctx.screen.box(lx + 0.3, y + 1.42, z - 0.27, lx + 0.4, y + 1.9, z + 0.27, VH.col(0xfff6d8, 2.6));
    world.physics.addBox(lx - 0.38, y + 1.0, z - 0.38, lx + 0.42, y + 1.97, z + 0.38, 'metal', F().ALL);
    // The stairs, up from the sand to the deck's south edge.
    W.stairs(world, ctx.wood, x + 1.3, z + h + TW.stairLen, 'n', TW.stairLen, 1.6, KERB, y, wood, { railHex: white, tag: 'plank' });
    // The tower's number on the hut's landward side (towards the promenade).
    W.sign(world, { x: hx0 - 0.03, y: y + 1.7, z, yaw: -PI / 2, w: 1.0, h: 1.0, lines: [String(n)], style: 'plaque', oneSided: true, flat: true, colors: { bg: ['#d8342c', '#d8342c'], fg: '#ffffff', border: '#ffffff' } });
    // A pool of lamp light on the sand in front.
    (world.floodlights || (world.floodlights = [])).push({ x: x + 9, z, r: 8, y: KERB + 0.02, strength: 0.55, tint: [1.15, 1.1, 0.95] });
  }

  /** Sand, the shore slope into the bay, the promenade and its furniture. */
  function buildShore(world) {
    const W = K();
    // Sand over the plot east of the promenade (the Kwik Pik's lot draws its own forecourt), and over the seawall strip.
    for (const [x0, z0, x1, z1] of [
      [BE.low, BE.z0, BE.x1, KWIK.z0], [KWIK.x1, KWIK.z0, BE.x1, KWIK.z1], [BE.low, KWIK.z1, BE.x1, PARK.z0],
      [BE.low, PARK.z0, PARK.x0, PARK.z1], [PARK.x1, PARK.z0, BE.x1, PARK.z1], [BE.low, PARK.z1, BE.x1, BE.z1],
    ]) W.pave(world, x0, z0, x1, z1, SAND, 'decal', KERB, 4);
    W.pave(world, BE.x1, BE.z0 + 4, BE.sea + 0.5, BE.z1, SAND, 'decal', KERB + 0.03, 4);
    world.physics.addBox(BE.x1, -0.5, BE.z0 + 4, BE.sea + 0.5, KERB + 0.03, BE.z1, 'sand', F().SOLID);
    // The slope down into the water (beyond the seawall), in pieces along z; wet sand darker at the bottom.
    const zA = BE.gap[0], zB = BE.gap[1];
    const yTop = KERB + 0.03;
    for (let z = zA; z < zB - 1e-6; z += 48) {
      const zb = Math.min(zB, z + 48);
      const ctx = world.ctxAt(BE.sea + 10, (z + zb) / 2);
      const kWet = (BE.wet - BE.sea - 0.5) / (BE.shore - BE.sea - 0.5);
      const yWet = yTop + (BE.yShore - yTop) * kWet;
      S().face(ctx.decal, [[BE.sea + 0.5, yTop, z], [BE.sea + 0.5, yTop, zb], [BE.wet, yWet, zb], [BE.wet, yWet, z]], col(SAND), [BE.sea + 5, -50, (z + zb) / 2]);
      S().face(ctx.decal, [[BE.wet, yWet, z], [BE.wet, yWet, zb], [BE.shore, BE.yShore, zb], [BE.shore, BE.yShore, z]], col(0xb39a6c), [BE.sea + 5, -50, (z + zb) / 2]);
      S().face(ctx.decal, [[BE.shore, BE.yShore, z], [BE.shore, BE.yShore, zb], [BE.shore + 6, -4, zb], [BE.shore + 6, -4, z]], col(0x8f7a55), [BE.sea + 5, -50, (z + zb) / 2]);
      // A line of surf on the water where the sand goes under.
      const xFoam = BE.sea + 0.5 + ((-1.1 - yTop) / (BE.yShore - yTop)) * (BE.shore - BE.sea - 0.5);
      ctx.screen.box(xFoam - 0.6, -1.08, z, xFoam + 0.6, -1.05, zb, VH.col(0xf4f8fa, 0.95));
    }
    const len = BE.shore - BE.sea - 0.5;
    world.physics.addRamp(BE.sea + 0.5 + len / 2, (zA + zB) / 2, (zB - zA) / 2, len / 2, -PI / 2, -4, BE.yShore, yTop, 'sand', F().SOLID);
    world.seawallGaps = (world.seawallGaps || []).concat([[zA, zB]]);

    // The promenade: pastel tiles, a low sitting wall on the sand side (open at the beach paths).
    const segs = [[BE.z0 + 1, KWIK.z0], [KWIK.z1, PARK.in0], [PARK.in1, BE.z1 - 1]];
    for (const [a, b] of segs) W.pave(world, BE.prom.x0, a, BE.prom.x1, b, 0xe8c4a8, 'plazaTop', KERB, 2.5);
    for (const [a, b] of segs) for (let z = a + 6; z < b - 2; z += 12) W.mark(world, BE.prom.x0 + 0.4, z, BE.prom.x1 - 0.4, z + 0.5, 0x6fb7b0);
    const paths = [[858, 866], [893, 900], [926, 932], [944, 956], [1000, 1008], [1112, 1114], [1150, 1153]];
    const wallRuns = [];
    for (const [a, b] of segs) {
      let cur = a;
      for (const [p0, p1] of paths) if (p0 > a && p1 < b) { if (p0 > cur) wallRuns.push([cur, p0]); cur = p1; }
      if (b > cur) wallRuns.push([cur, b]);
    }
    for (const [a, b] of wallRuns) {
      if (b - a < 1) continue;
      for (let z = a; z < b - 1e-6; z += 48) {
        const zb = Math.min(b, z + 48);
        box(world, 'concrete', BE.prom.x1, KERB, z, BE.low, KERB + 0.45, zb, 0xf2ede0, 'wall', F().SOLID | F().SHOTS);
        world.ctxAt(BE.low, (z + zb) / 2).prop.box(BE.prom.x1 - 0.05, KERB + 0.45, z, BE.low + 0.05, KERB + 0.5, zb, col(0x6fb7b0));
      }
    }
    // Palms along the street side, lamps and benches on the sand side.
    for (let z = BE.z0 + 10; z < BE.z1 - 4; z += 24) {
      if (z > KWIK.z0 - 2 && z < KWIK.z1 + 2) continue;
      if (z > PARK.in0 - 3 && z < PARK.in1 + 3) continue;
      world.addProp('palmTall', 341.4, KERB, z, (z * 0.37) % (2 * PI), 1);
    }
    for (let z = BE.z0 + 22; z < BE.z1 - 4; z += 30) {
      if (z > KWIK.z0 - 2 && z < KWIK.z1 + 2) continue;
      if (z > PARK.in0 - 3 && z < PARK.in1 + 3) continue;
      world.addProp('streetlight', 348.3, KERB, z, -PI / 2, 1);
      if (z + 12 < BE.z1 - 4 && !(z + 12 > KWIK.z0 - 3 && z + 12 < KWIK.z1 + 3) && !(z + 12 > PARK.in0 - 3 && z + 12 < PARK.in1 + 3)) world.addProp('bench', 347.6, KERB, z + 12, PI / 2, 1);
      if (z + 4 < BE.z1 - 4 && !(z + 4 > KWIK.z0 - 3 && z + 4 < KWIK.z1 + 3) && !(z + 4 > PARK.in0 - 2 && z + 4 < PARK.in1 + 2)) world.addProp('bin', 348.4, KERB, z + 4, 0, 1);
    }
  }

  /** The ten lifeguard towers, plus umbrellas, towels and a volleyball net on the open sand. */
  function buildSandLife(world) {
    const W = K();
    for (const [n, z] of TOWERS) lifeguardTower(world, n, TX, z);
    // Beach umbrellas (a pole you bump into, a striped canopy overhead) and towels.
    const rng = new VH.RNG(9137);
    const spots = [];
    for (let z = 812; z < 1182; z += 9) {
      if (z > CLUB.z0 - 4 && z < CLUB.z1 + 4) continue;
      if (z > 938 && z < 960) continue; // the volleyball court
      if (z > PARK.z0 - 3) continue;
      for (const x of [372, 386]) {
        if (rng.next() >= 0.45) continue;
        const px = x + rng.range(-3, 3), pz = z + rng.range(-2, 2);
        if (px < BAR.x1 + 6 && pz > BAR.z0 - 6 && pz < BAR.z1 + 4) continue; // clear of the beach bar and its steps
        spots.push([px, pz]);
      }
    }
    const um = [0xe0574f, 0x2f8fbf, 0xf2c230, 0x3fae7a, 0xf08a3c];
    for (const [x, z] of spots) {
      if (TOWERS.some(([, tz]) => Math.abs(tz - z) < 4 && Math.abs(TX - x) < 6)) continue;
      const ctx = world.ctxAt(x, z);
      const c = um[Math.floor(rng.next() * um.length)];
      ctx.prop.box(x - 0.04, KERB, z - 0.04, x + 0.04, KERB + 2.5, z + 0.04, col(0xeeeeee));
      world.physics.addBox(x - 0.1, 0, z - 0.1, x + 0.1, KERB + 2.3, z + 0.1, 'pole', F().SOLID | F().SHOTS);
      ctx.prop.cylinder(x, KERB + 2.2, z, 1.4, 0.08, 0.45, 8, col(c), false);
      for (const s of [-1, 1]) ctx.marks.topRect(x + s * 1.2 - 0.45, z - 0.9, x + s * 1.2 + 0.45, z + 0.9, KERB + 0.025, col(um[(um.indexOf(c) + 2 + (s > 0 ? 1 : 0)) % um.length]));
    }
    // Volleyball: posts, a net, the court lines.
    const vz0 = 941, vz1 = 957, vx = 379;
    for (const z of [vz0, vz1]) box(world, 'prop', vx - 0.08, KERB, z - 0.08, vx + 0.08, KERB + 2.6, z + 0.08, 0xeeeeee, 'pole');
    world.ctxAt(vx, 949).prop.box(vx - 0.02, KERB + 1.6, vz0, vx + 0.02, KERB + 2.45, vz1, col(0x2a2d33));
    world.physics.addBox(vx - 0.05, KERB + 1.5, vz0, vx + 0.05, KERB + 2.45, vz1, 'fence', F().SOLID | F().CAMERA);
    for (const [x0, z0, x1, z1] of [[370, 943, 388, 943.12], [370, 954.88, 388, 955], [370, 943, 370.12, 955], [387.88, 943, 388, 955]]) W.mark(world, x0, z0, x1, z1, 0x3f7fbf, KERB + 0.02);
  }

  /** The Seaspray Motel: two pastel floors, an outside walkway and stairs, its sign on a pole. */
  function buildMotel(world) {
    const W = K();
    const M = MOTEL;
    const ctx = W.building(world, M.x0, M.z0, M.x1, M.z1, M.h, { wall: 0xf3b7c3, roof: 0x8d8a84, style: 1, ww: 0.45, wh: 0.5, bay: 4.2, floorH: 3.3, seed: 0.41, sides: { w: 'blank' } });
    // Room doors and windows along the front (west), both floors.
    for (let z = M.z0 + 2.2; z < M.z1 - 2; z += 4.2) {
      for (const fy of [KERB, M.walkY]) {
        ctx.prop.box(M.x0 - 0.04, fy, z - 0.45, M.x0, fy + 2.1, z + 0.45, col(0x2f8fbf));
        ctx.screen.box(M.x0 - 0.05, fy + 1.0, z + 0.9, M.x0, fy + 1.9, z + 2.1, VH.col(0xffe7b0, 1.1));
      }
    }
    // The walkway along the front at the first floor, railed, carried on posts, stairs up at the south end.
    const wx0 = BE.low + 0.15;
    W.deck(world, ctx.concrete, wx0, M.z0, M.x0, M.z1, M.walkY, 0xe8e2d6, 'concrete', 0.25);
    VH.Landmarks.railing(world, ctx, wx0 + 0.05, M.z0, wx0 + 0.05, M.z1, M.walkY, { color: 0xf4f2ec });
    VH.Landmarks.railing(world, ctx, wx0, M.z0 + 0.05, M.x0, M.z0 + 0.05, M.walkY, { color: 0xf4f2ec });
    for (let z = M.z0 + 0.3; z < M.z1; z += 8.3) box(world, 'prop', wx0, KERB, z - 0.12, wx0 + 0.24, M.walkY - 0.25, z + 0.12, 0xf4f2ec, 'pole');
    W.stairs(world, ctx.concrete, (wx0 + M.x0) / 2 - 0.05, M.z1 + 6, 'n', 6, 1.5, KERB, M.walkY, 0xe8e2d6, { railHex: 0xf4f2ec });
    // Ice machine and a drinks machine under the walkway.
    box(world, 'prop', M.x0 - 1.1, KERB, 830, M.x0, KERB + 1.8, 831.4, 0xdfe6ea, 'metal');
    ctx.screen.box(M.x0 - 1.12, KERB + 1.0, 832, M.x0 - 1.08, KERB + 1.7, 832.9, VH.col(0x4fc3f7, 1.4));
    box(world, 'prop', M.x0 - 1.1, KERB, 831.8, M.x0, KERB + 1.9, 833.1, 0xc0392b, 'metal');
    // The sign by the street: a tall pole, a neon board.
    box(world, 'prop', 342.6, KERB, 829.8, 343.0, KERB + 6.2, 830.2, 0xcfd3d6, 'pole');
    W.sign(world, { x: 342.8, y: KERB + 7.4, z: 830, yaw: -PI / 2, w: 5.4, h: 2.2, lines: ['SEASPRAY MOTEL', 'VACANCY · POOL · TV'], style: 'neon', twoSided: true, colors: { bg: ['#f3b7c3', '#e07a95'], fg: '#ffffff', glow: '#ff9ec0', outline: '#ffffff' } });
  }

  /** The surf shop, the ice-cream kiosk, the toilets and showers, the prawn shack. */
  function buildShops(world) {
    const W = K();
    // Swell & Sons Surf Co.: a shack open to the promenade, boards racked outside.
    const sx0 = 351, sx1 = 363, sz0 = 903, sz1 = 919;
    const ctx = shack(world, sx0, sz0, sx1, sz1, 3.6, 'w', { wall: 0x9fd8d0, roof: 0x1f5f7a, awning: 0x2f8fbf });
    const boardC = [0xf2c230, 0xe0574f, 0x2f8fbf, 0xf4f2ec, 0x3fae7a, 0xf08a3c];
    for (let i = 0; i < 6; i++) {
      const z = sz0 + 1.2 + i * 0.5;
      W.tiltBox(ctx.prop, sx0 - 0.7, KERB + 1.2, z, 0.08, 2.3, 0.55, 0, -0.12, boardC[i]);
    }
    world.physics.addBox(sx0 - 1.0, 0, sz0 + 0.8, sx0 - 0.3, KERB + 2.4, sz0 + 4.2, 'plank', F().SOLID | F().CAMERA);
    for (let i = 0; i < 5; i++) W.tiltBox(ctx.prop, sx1 - 0.4, KERB + 1.5, sz0 + 2 + i * 2.6, 0.08, 2.3, 0.55, 0, 0, boardC[(i + 3) % 6]);
    world.physics.addBox(sx1 - 0.55, 0, sz0 + 1.6, sx1 - 0.25, KERB + 2.7, sz1 - 1.6, 'plank', F().SOLID | F().CAMERA);
    W.sign(world, { x: sx0 - 0.45, y: KERB + 4.3, z: (sz0 + sz1) / 2, yaw: -PI / 2, w: 9, h: 1.3, lines: ['SWELL & SONS SURF CO.'], style: 'brand', oneSided: true, colors: { bg: ['#1f5f7a', '#2f8fbf'], fg: '#f2c230' } });

    // Two Scoops: an ice-cream kiosk with a giant cone on its roof.
    const kx0 = 351.2, kx1 = 355.4, kz0 = 935, kz1 = 939.5;
    const kc = world.ctxAt(kx0, kz0);
    box(world, 'prop', kx0, KERB, kz0, kx1, KERB + 2.8, kz1, 0xfbe3ec, 'building');
    kc.screen.box(kx0 - 0.04, KERB + 1.1, kz0 + 0.6, kx0, KERB + 2.2, kz1 - 0.6, VH.col(0xfff2d0, 1.4));
    box(world, 'prop', kx0 - 0.5, KERB + 1.0, kz0 + 0.4, kx0, KERB + 1.1, kz1 - 0.4, 0xf4f2ec, 'building');
    kc.prop.cylinder(kx0 + 2.1, KERB + 2.8, kz0 + 2.25, 0.08, 0.7, 1.6, 10, col(0xd9a35a), true);
    kc.prop.cylinder(kx0 + 2.1, KERB + 4.4, kz0 + 2.25, 0.82, 0.5, 0.7, 10, col(0xf6c1d4), true);
    world.physics.addBox(kx0 + 1.3, KERB + 2.8, kz0 + 1.45, kx0 + 2.9, KERB + 5.1, kz0 + 3.05, 'building', F().ALL);
    W.sign(world, { x: kx0 - 0.04, y: KERB + 2.5, z: (kz0 + kz1) / 2, yaw: -PI / 2, w: 3.6, h: 0.5, lines: ['TWO SCOOPS'], style: 'plaque', oneSided: true, flat: true, colors: { bg: ['#f6c1d4', '#f6c1d4'], fg: '#7a2f4f', border: '#ffffff' } });

    // Toilets and showers: a block with two doorways, showers on posts on the sand side.
    const tx0 = 351.2, tx1 = 359, tz0 = 945, tz1 = 955;
    const tc = world.ctxAt(tx0, tz0);
    box(world, 'prop', tx0, KERB, tz0, tx1, KERB + 3.0, tz1, 0xd8eef0, 'building');
    tc.prop.box(tx0, KERB + 3.0, tz0, tx1, KERB + 3.25, tz1, col(0x1f5f7a));
    for (const z of [tz0 + 2.5, tz1 - 2.5]) tc.prop.box(tx0 - 0.04, KERB, z - 0.5, tx0, KERB + 2.1, z + 0.5, col(0x5a6670));
    for (let z = tz0 + 1.5; z < tz1; z += 3.5) {
      box(world, 'prop', tx1 + 1.4, KERB, z - 0.06, tx1 + 1.52, KERB + 2.4, z + 0.06, 0xcfd3d6, 'pole');
      tc.prop.box(tx1 + 1.0, KERB + 2.3, z - 0.15, tx1 + 1.52, KERB + 2.4, z + 0.15, col(0xcfd3d6));
      tc.marks.topRect(tx1 + 0.5, z - 0.8, tx1 + 2.3, z + 0.8, KERB + 0.025, col(0x9a8a6a));
    }
    W.sign(world, { x: tx0 - 0.04, y: KERB + 2.6, z: (tz0 + tz1) / 2, yaw: -PI / 2, w: 3.4, h: 0.5, lines: ['TOILETS · SHOWERS'], style: 'plaque', oneSided: true, flat: true, colors: { bg: ['#1f5f7a', '#1f5f7a'], fg: '#ffffff', border: '#ffffff' } });

    // Sandpiper Prawn Shack: "NOW WITH FEWER BONES".
    const px0 = 351, px1 = 361, pz0 = 1114.5, pz1 = 1124.5;
    const pc = shack(world, px0, pz0, px1, pz1, 3.2, 'w', { wall: 0xf7d9a8, roof: 0xc0392b, awning: 0xe0574f });
    for (const z of [pz0 + 2, pz1 - 2]) {
      box(world, 'wood', px0 - 3.2, KERB, z - 0.6, px0 - 2.0, KERB + 0.75, z + 0.6, 0x8b6a45, 'wood');
    }
    pc.prop.box(px0 - 0.3, KERB + 3.2, pz0 + 1, px0 - 0.1, KERB + 4.4, pz1 - 1, col(0xf4efe2));
    W.sign(world, { x: px0 - 0.32, y: KERB + 3.8, z: (pz0 + pz1) / 2, yaw: -PI / 2, w: 7.6, h: 1.1, lines: ['SANDPIPER PRAWN SHACK', 'NOW WITH FEWER BONES'], style: 'plaque', oneSided: true, flat: true, colors: { bg: ['#f4efe2', '#f4efe2'], fg: '#c0392b', border: '#c0392b' } });
  }

  /** The Salty Pelican: a beach bar on a deck, a thatched roof on posts, stools and festoon lights. */
  function buildBar(world) {
    const W = K();
    const B = BAR;
    const ctx = world.ctxAt((B.x0 + B.x1) / 2, (B.z0 + B.z1) / 2);
    W.deck(world, ctx.wood, B.x0, B.z0, B.x1, B.z1, B.y, 0x9a7650, 'plank', B.y);
    // Steps up from the promenade's beach path (north), and from the sand (east).
    W.stairs(world, ctx.wood, B.x0 + 3, B.z0 - 2.4, 's', 2.4, 3, KERB, B.y, 0x9a7650, { rails: false });
    W.stairs(world, ctx.wood, B.x1 + 2.4, (B.z0 + B.z1) / 2, 'w', 2.4, 4, KERB, B.y, 0x9a7650, { rails: false });
    W.deckRails(world, B.x0, B.z0, B.x1, B.z1, B.y, [{ side: 'n', a0: B.x0 + 1.4, a1: B.x0 + 4.6 }, { side: 'e', a0: (B.z0 + B.z1) / 2 - 2.1, a1: (B.z0 + B.z1) / 2 + 2.1 }], 0x6b4e33);
    // The bar: a counter in an L, a back bar with bottles (screen strip), the thatch on six posts.
    const bx0 = B.x0 + 1.5, bx1 = B.x0 + 9, bz0 = B.z0 + 4, bz1 = B.z1 - 4;
    box(world, 'wood', bx1 - 0.6, B.y, bz0, bx1, B.y + 1.1, bz1, 0x6b4e33, 'wood');
    box(world, 'wood', bx0, B.y, bz0, bx1, B.y + 1.1, bz0 + 0.6, 0x6b4e33, 'wood');
    box(world, 'wood', bx0, B.y, bz1 - 0.6, bx1, B.y + 1.1, bz1, 0x6b4e33, 'wood');
    box(world, 'prop', bx0, B.y, bz0, bx0 + 0.5, B.y + 2.2, bz1, 0x5a4636, 'wood');
    ctx.screen.box(bx0 + 0.5, B.y + 1.3, bz0 + 1, bx0 + 0.56, B.y + 1.9, bz1 - 1, VH.col(0xffc070, 1.5));
    for (const x of [bx0 - 0.2, bx1 + 0.2]) for (const z of [bz0 - 0.2, (bz0 + bz1) / 2, bz1 + 0.2]) box(world, 'wood', x - 0.12, B.y, z - 0.12, x + 0.12, B.y + 3.2, z + 0.12, 0x6b4e33, 'wood');
    W.gable(ctx.hedge, bx0 - 1.2, bz0 - 1.2, bx1 + 1.2, bz1 + 1.2, B.y + 3.2, 1.6, 'z', col(0xc8a464), col(0xb08a4a));
    world.physics.addBox(bx0 - 1.2, B.y + 3.2, bz0 - 1.2, bx1 + 1.2, B.y + 4.8, bz1 + 1.2, 'building', F().ALL);
    // Stools along the counter, tables with umbrellas on the rest of the deck.
    for (let z = bz0 + 1; z < bz1 - 0.6; z += 1.3) box(world, 'prop', bx1 + 0.45, B.y, z - 0.2, bx1 + 0.85, B.y + 0.75, z + 0.2, 0xd8342c, 'metal');
    for (const [x, z] of [[B.x1 - 5, B.z0 + 4], [B.x1 - 5, B.z1 - 4], [B.x1 - 11, B.z0 + 3.5], [B.x1 - 11, B.z1 - 3.5], [B.x1 - 3, (B.z0 + B.z1) / 2 + 5]]) {
      box(world, 'wood', x - 0.6, B.y, z - 0.6, x + 0.6, B.y + 0.75, z + 0.6, 0xf4efe2, 'wood');
      ctx.prop.cylinder(x, B.y + 2.45, z, 1.5, 0.1, 0.4, 8, col(0x2f8fbf), false);
      ctx.prop.box(x - 0.03, B.y + 0.75, z - 0.03, x + 0.03, B.y + 2.6, z + 0.03, col(0xeeeeee));
      world.physics.addBox(x - 0.1, B.y + 0.75, z - 0.1, x + 0.1, B.y + 2.45, z + 0.1, 'pole', F().SOLID | F().SHOTS);
    }
    // Festoon lights round the deck.
    W.festoon(world, B.x0 + 0.2, B.y + 2.6, B.z0 + 0.2, B.x1 - 0.2, B.y + 2.6, B.z0 + 0.2, 0.4, [0xffd27a, 0xff8a5c, 0x8fd3ff]);
    W.festoon(world, B.x0 + 0.2, B.y + 2.6, B.z1 - 0.2, B.x1 - 0.2, B.y + 2.6, B.z1 - 0.2, 0.4, [0xffd27a, 0xff8a5c, 0x8fd3ff]);
    for (const [x, z] of [[B.x0 + 0.2, B.z0 + 0.2], [B.x1 - 0.2, B.z0 + 0.2], [B.x0 + 0.2, B.z1 - 0.2], [B.x1 - 0.2, B.z1 - 0.2]]) box(world, 'wood', x - 0.08, B.y, z - 0.08, x + 0.08, B.y + 2.7, z + 0.08, 0x6b4e33, 'pole');
    W.sign(world, { x: B.x0 + 0.5, y: B.y + 3.6, z: (B.z0 + B.z1) / 2, yaw: -PI / 2, w: 7, h: 1.6, lines: ['THE SALTY PELICAN', 'BEACH BAR'], style: 'neon', oneSided: true, colors: { bg: ['#1f5f7a', '#0f3f5a'], fg: '#ffd27a', glow: '#ffb050', outline: '#ffd27a' } });
    (world.floodlights || (world.floodlights = [])).push({ x: (B.x0 + B.x1) / 2, z: (B.z0 + B.z1) / 2, r: 14, y: B.y + 0.02, strength: 0.5, tint: [1.2, 1.0, 0.8] });
  }

  /** The beach car park at the south end, its way in across the promenade, a sign. */
  function buildCarPark(world) {
    const W = K();
    const P = PARK;
    W.pave(world, P.x0, P.z0, P.x1, P.z1, 0x9a9a9c, 'asphaltTop', KERB + 0.01, 6);
    W.pave(world, BE.prom.x0 - 1, P.in0, P.x0, P.in1, 0x9a9a9c, 'asphaltTop', KERB + 0.012, 6);
    for (const zr of [P.z0 + 0.3, P.z1 - 5.3]) for (let x = P.x0 + 6; x <= P.x1 - 1; x += 2.7) W.mark(world, x - 0.06, zr, x + 0.06, zr + 5, 0xf4f4ef);
    for (let x = P.x0 + 1; x < P.x1; x += 4) world.addProp('bollard', x, KERB, P.z0 - 0.5, 0, 1);
    for (let z = P.z0; z <= P.z1; z += 3.5) world.addProp('bollard', P.x1 + 0.5, KERB, z, 0, 1);
    W.sign(world, { x: 345, y: KERB + 2.6, z: P.in0 - 1.6, yaw: -PI / 2, w: 3.6, h: 1.4, lines: ['BEACH PARKING', 'P  ·  ALL DAY'], style: 'road', posts: true, colors: { bg: ['#1f5fbf', '#1f5fbf'], fg: '#ffffff', border: '#ffffff' } });
  }

  /** The Castellane Beach Club: a teal fence round a stretch of sand, a gate, a marquee, loungers, flags. */
  function buildClub(world) {
    const W = K();
    const C = CLUB;
    const teal = 0x13b5b1, white = 0xf2f2ee;
    const H = 2.5;
    // Fence panels: white posts, teal windbreak cloth. Runs: along the promenade (gate in it), across the sand at each end into the shallows.
    // Each run is drawn in pieces of up to 24 m; past the seawall the panels reach down into the sloping sand.
    const run = (x0, z0, x1, z1, gap) => {
      const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
      const a0 = alongX ? Math.min(x0, x1) : Math.min(z0, z1);
      const a1 = alongX ? Math.max(x0, x1) : Math.max(z0, z1);
      const c = alongX ? z0 : x0;
      let pieces = gap ? [[a0, gap[0]], [gap[1], a1]] : [[a0, a1]];
      if (alongX) pieces = [[a0, BE.sea + 0.5], [BE.sea + 0.5, a1]];
      for (const [p0, p1] of pieces) {
        const wet = alongX && p0 >= BE.sea + 0.5 - 1e-6;
        const yb = wet ? BE.yShore - 0.2 : KERB;
        for (let p = p0; p < p1 - 1e-6; p += 24) {
          const q = Math.min(p1, p + 24);
          const ctx = alongX ? world.ctxAt((p + q) / 2, c) : world.ctxAt(c, (p + q) / 2);
          if (alongX) ctx.prop.box(p, yb + 0.1, c - 0.03, q, KERB + H, c + 0.03, col(teal));
          else ctx.prop.box(c - 0.03, KERB + 0.1, p, c + 0.03, KERB + H, q, col(teal));
          for (let a = p; a <= q + 1e-6; a += 3) {
            if (alongX) ctx.prop.box(a - 0.07, yb, c - 0.07, a + 0.07, KERB + H + 0.15, c + 0.07, col(white));
            else ctx.prop.box(c - 0.07, KERB, a - 0.07, c + 0.07, KERB + H + 0.15, a + 0.07, col(white));
          }
        }
        if (alongX) world.physics.addBox(p0, wet ? -3 : 0, c - 0.12, p1, KERB + H, c + 0.12, 'fence', F().SOLID | F().CAMERA);
        else world.physics.addBox(c - 0.12, 0, p0, c + 0.12, KERB + H, p1, 'fence', F().SOLID | F().CAMERA);
      }
    };
    run(C.x, C.z0, C.x, C.z1, C.gate);
    run(C.x, C.z0, BE.shore + 1, C.z0);
    run(C.x, C.z1, BE.shore + 1, C.z1);
    // The gate: a white arch over the opening with the club's sign, a rope barrier folded back, a lectern for the list.
    const gz = (C.gate[0] + C.gate[1]) / 2;
    const gctx = world.ctxAt(C.x, gz);
    for (const z of [C.gate[0] - 0.2, C.gate[1] + 0.2]) box(world, 'prop', C.x - 0.2, KERB, z - 0.2, C.x + 0.2, KERB + 3.4, z + 0.2, white, 'pole');
    gctx.prop.box(C.x - 0.25, KERB + 3.4, C.gate[0] - 0.4, C.x + 0.25, KERB + 3.8, C.gate[1] + 0.4, col(white));
    W.sign(world, { x: C.x - 0.3, y: KERB + 4.6, z: gz, yaw: -PI / 2, w: 6.4, h: 1.4, lines: ['CASTELLANE BEACH CLUB', 'PRIVATE EVENT · GUESTS ONLY'], style: 'brand', oneSided: true, colors: { bg: ['#13b5b1', '#0e8c89'], fg: '#ffffff' } });
    box(world, 'prop', C.x - 1.6, KERB, gz - 2.8, C.x - 1.0, KERB + 1.15, gz - 2.2, 0x1c1c1e, 'wood');
    // Flags on tall poles along the fence.
    for (let z = C.z0 + 6; z < C.z1 - 3; z += 12) {
      if (Math.abs(z - gz) < 3) continue;
      const ctx = world.ctxAt(C.x, z);
      ctx.prop.box(C.x + 0.15, KERB, z - 0.05, C.x + 0.25, KERB + 6, z + 0.05, col(white));
      world.physics.addBox(C.x + 0.1, 0, z - 0.1, C.x + 0.3, KERB + 6, z + 0.1, 'pole', F().SOLID | F().SHOTS);
      ctx.prop.box(C.x + 0.25, KERB + 4.6, z - 0.02, C.x + 1.6, KERB + 5.8, z + 0.02, col(teal));
    }
    // The marquee: white roof on poles, the teal-and-white buffet underneath.
    const mx0 = 358, mx1 = 376, mz0 = 1072, mz1 = 1090;
    const mctx = world.ctxAt((mx0 + mx1) / 2, (mz0 + mz1) / 2);
    for (const x of [mx0, (mx0 + mx1) / 2, mx1]) for (const z of [mz0, mz1]) box(world, 'prop', x - 0.08, KERB, z - 0.08, x + 0.08, KERB + 3.2, z + 0.08, white, 'pole');
    W.gable(mctx.prop, mx0 - 0.2, mz0 - 0.2, mx1 + 0.2, mz1 + 0.2, KERB + 3.2, 1.8, 'x', col(white), col(teal));
    world.physics.addBox(mx0 - 0.2, KERB + 3.2, mz0 - 0.2, mx1 + 0.2, KERB + 5.0, mz1 + 0.2, 'building', F().CAMERA | F().SHOTS);
    for (const z of [mz0 + 4, mz1 - 4]) {
      box(world, 'prop', mx0 + 2, KERB, z - 0.5, mx1 - 2, KERB + 0.9, z + 0.5, white, 'wood');
      world.physics.addBox(mx0 + 2, KERB + 0.9, z - 0.5, mx1 - 2, KERB + 1.05, z + 0.5, 'wood', F().SOLID | F().SHOTS);
      for (let x = mx0 + 3; x < mx1 - 2; x += 2.2) mctx.prop.box(x - 0.4, KERB + 0.9, z - 0.3, x + 0.4, KERB + 1.05, z + 0.3, col(x % 4.4 < 2.2 ? teal : 0xf2c230));
    }
    // A DJ booth, sun loungers in rows (kept out of the landing run), teal umbrellas.
    box(world, 'prop', 360, KERB, 1100, 365, KERB + 1.2, 1105, 0x1c1c1e, 'metal');
    world.ctxAt(362, 1102).screen.box(359.96, KERB + 0.4, 1100.5, 360, KERB + 1.0, 1104.5, VH.col(0x13b5b1, 1.8));
    for (const zr of [1047, 1052]) for (let x = 380; x < 398; x += 3) {
      box(world, 'prop', x - 0.4, KERB, zr - 1, x + 0.4, KERB + 0.4, zr + 1, white, 'wood');
      world.ctxAt(x, zr).prop.box(x - 0.4, KERB + 0.4, zr - 1, x + 0.4, KERB + 0.42, zr + 0.2, col(teal));
    }
    for (const [x, z] of [[384, 1044], [392, 1044], [384, 1056], [392, 1056], [385, 1104], [393, 1104]]) {
      const ctx = world.ctxAt(x, z);
      ctx.prop.box(x - 0.04, KERB, z - 0.04, x + 0.04, KERB + 2.5, z + 0.04, col(white));
      world.physics.addBox(x - 0.1, 0, z - 0.1, x + 0.1, KERB + 2.3, z + 0.1, 'pole', F().SOLID | F().SHOTS);
      ctx.prop.cylinder(x, KERB + 2.2, z, 1.4, 0.08, 0.45, 8, col(teal), false);
    }
    // Festoons from the marquee to the fence; the club's own lights.
    W.festoon(world, mx0, KERB + 3.2, mz0, C.x + 0.3, KERB + 5.5, mz0 - 12, 0.6, [0xffffff, 0x7fe0dc]);
    W.festoon(world, mx1, KERB + 3.2, mz1, mx1 + 14, KERB + 3.0, mz1 + 12, 0.6, [0xffffff, 0x7fe0dc]);
    (world.floodlights || (world.floodlights = [])).push({ x: (mx0 + mx1) / 2, z: (mz0 + mz1) / 2, r: 16, y: KERB + 0.02, strength: 0.55, tint: [0.9, 1.15, 1.15] });
  }

  /**
   * The Kwik Pik on the promenade: a real shop (stores.js draws it, its
   * clerk works it, it can be held up, and its floor safe opens) on a lot of
   * its own, with the old speed shop's name still showing above the sign.
   */
  function buildKwikPik(world, layout) {
    if (!VH.Stores || !VH.Stores._describe || !VH.Stores.buildLot) return null;
    const L = KWIK;
    const lot = {
      id: 'sandpiper_promenade_shop', kind: 'parking',
      minX: L.x0, maxX: L.x1, minZ: L.z0, maxZ: L.z1, cx: (L.x0 + L.x1) / 2, cz: (L.z0 + L.z1) / 2,
      district: { id: D }, front: { w: true },
    };
    layout.stores = layout.stores || [];
    const s = VH.Stores._describe(layout, { lot, side: 'w', brand: 'kwikpik' }, layout.stores.length);
    s.name = 'Kwik Pik, The Promenade';
    lot.store = s;
    layout.stores.push(s);
    VH.Stores.buildLot(world, world.ctxAt(lot.cx, lot.cz), lot);
    // The speed shop's name, faded, on a board along the top of the front wall.
    const fx = L.x0 + s.vb0;
    const ctx = world.ctxAt(fx, lot.cz);
    ctx.prop.box(fx - 0.25, KERB + 4.0, L.z0 + s.a + 0.2, fx + 0.1, KERB + 5.5, L.z0 + s.a + s.SW - 0.2, col(0xd8d0c0));
    world.physics.addBox(fx - 0.25, KERB + 4.0, L.z0 + s.a + 0.2, fx + 0.1, KERB + 5.5, L.z0 + s.a + s.SW - 0.2, 'building', F().ALL);
    K().sign(world, { x: fx - 0.27, y: KERB + 4.75, z: lot.cz, yaw: -PI / 2, w: s.SW - 1.2, h: 1.2, lines: ['BRASK & MARLOW SPEED SHOP'], style: 'plaque', oneSided: true, flat: true, colors: { bg: ['#d8d0c0', '#d2c9b8'], fg: '#b9ad97', border: '#d8d0c0' } });
    return s;
  }

  // ------------------------------------------------------- the skate park
  // Plot 167..321 x 927..1043 (front east on Sandpiper Drive). Every ramp is
  // solid and drivable. The Launch Lane runs the length of the south side from
  // the west gate (Surfrider Avenue) to the big kicker, whose lip throws a car
  // east over the fence, Sandpiper Drive and the Beach Club fence onto the sand.
  const SK = {
    x0: 167, x1: 321, z0: 927, z1: 1043,
    lane: { z0: 1026, z1: 1038 }, kick: { x0: 290, lip: 318, h: 5.0 },
    gateE: [958, 972], gateW: [1023, 1041],
    hp: { x0: 182, x1: 206, zf0: 941.5, zf1: 945.5, r: 4, h: 3, deck: 2.5 },
    box: { cx: 240, cz: 950, half: 4, h: 1.2, run: 5 },
  };

  function buildSkatePark(world) {
    const W = K(), Sk = S();
    const G = KERB; // the slab
    const conc = 0xe4e2da, concDark = 0xcfcdc4;
    const paint = [0xe0574f, 0x2f8fbf, 0xf2c230, 0x3fae7a, 0x8e5bd6, 0xf08a3c];
    // Concrete everywhere but the lane and the bowl's floor (they are painted, and must not share a depth with it).
    for (const [x0, z0, x1, z1] of [
      [SK.x0 + 1, SK.z0 + 1, SK.x1 - 1, 958], [SK.x0 + 1, 958, 260.39, 1026], [276.39, 958, SK.x1 - 1, 1026], [260.39, 974.39, 276.39, 1026], [260.39, 958, 276.39, 962.39],
      [SK.kick.x0, 1026, SK.x1 - 1, SK.z1 - 1], [SK.x0 + 1, 1038, SK.kick.x0, SK.z1 - 1],
    ]) W.pave(world, x0, z0, x1, z1, conc, 'plazaTop', KERB, 8);
    // Fences: closed except the east gate (pedestrians and cars from Sandpiper Drive) and the west gate onto the lane.
    W.fence(world, SK.x0 + 1, SK.z0 + 1, SK.x1 - 1, SK.z0 + 1, [], 'chain', 2.0);
    W.fence(world, SK.x0 + 1, SK.z1 - 1, SK.x1 - 1, SK.z1 - 1, [], 'chain', 2.0);
    W.fence(world, SK.x0 + 1, SK.z0 + 1, SK.x0 + 1, SK.z1 - 1, [SK.gateW], 'chain', 2.0);
    W.fence(world, SK.x1 - 1, SK.z0 + 1, SK.x1 - 1, SK.z1 - 1, [SK.gateE], 'chain', 2.0);

    // --- the Launch Lane and the big kicker
    const L = SK.lane, Kk = SK.kick;
    const lz = (L.z0 + L.z1) / 2, lw = L.z1 - L.z0;
    W.pave(world, SK.x0 + 1, L.z0, Kk.x0, L.z1, 0xc0503f, 'decal', KERB, 6);
    for (const z of [L.z0 + 0.2, L.z1 - 0.35]) W.mark(world, SK.x0 + 2, z, Kk.x0, z + 0.15, 0xf2c230);
    for (let x = 200; x < Kk.x0 - 6; x += 14) {
      // Chevrons pointing east.
      W.tiltBox(world.ctxAt(x, lz).marks, x, KERB + 0.023, lz - 2, 0.4, 0.002, 4.6, PI / 2 - 0.6, 0, 0xf4f4ef);
      W.tiltBox(world.ctxAt(x, lz).marks, x, KERB + 0.023, lz + 2, 0.4, 0.002, 4.6, PI / 2 + 0.6, 0, 0xf4f4ef);
    }
    const kpts = [[0, G], [12, G + 1.0], [22, G + 2.8], [Kk.lip - Kk.x0, G + Kk.h]];
    Sk.profileRamp(world, world.ctxAt(Kk.x0 + 14, lz).concrete, Kk.x0, lz, PI / 2, lw, kpts, concDark, { side: 0xe0574f });
    // Graffiti bands down the kicker's sides; a yellow lip line.
    for (const sz of [L.z0 - 0.02, L.z1 + 0.02]) {
      const ctx = world.ctxAt(Kk.x0 + 20, sz);
      for (let i = 0; i < 4; i++) ctx.prop.box(Kk.x0 + 13 + i * 3.5, KERB + 0.3, sz - 0.01, Kk.x0 + 15.5 + i * 3.5, KERB + Math.min(2.6, 0.6 + i * 0.6), sz + 0.01, col(paint[(i + 1) % paint.length]));
    }
    world.ctxAt(Kk.lip - 0.4, lz).marks.box(Kk.lip - 0.6, KERB + Kk.h - 0.04, L.z0, Kk.lip - 0.05, KERB + Kk.h + 0.005, L.z1, col(0xf2c230));
    W.sign(world, { x: Kk.x0 - 6, y: KERB + 3.4, z: L.z1 + 2.6, yaw: -PI / 2, w: 4.6, h: 1.6, lines: ['LAUNCH LANE', 'RIDERS & DRIVERS · ONE AT A TIME'], style: 'plaque', posts: true, colors: { bg: ['#1c1c1e', '#2a2d33'], fg: '#f2c230', border: '#f2c230' } });

    // --- the half-pipe (along x, walls north and south), decks on top, stairs up the west end
    const H = SK.hp;
    const hpx = (H.x0 + H.x1) / 2, hw = H.x1 - H.x0;
    const qp = Sk.quarterProfile(H.r, H.h, H.deck, 7).map(([u, y]) => [u, y + G]);
    const qEnd = qp[qp.length - 1][0];
    const ctxH = world.ctxAt(hpx, (H.zf0 + H.zf1) / 2);
    Sk.profileRamp(world, ctxH.concrete, hpx, H.zf0, PI, hw, qp, conc, { side: 0x2f8fbf });
    Sk.profileRamp(world, ctxH.concrete, hpx, H.zf1, 0, hw, qp, conc, { side: 0x8e5bd6 });
    for (const [zBack, zDeck0, s] of [[H.zf0 - qEnd, H.zf0 - qEnd, 1], [H.zf1 + qEnd, H.zf1 + qEnd - H.deck, -1]]) {
      const zc = s > 0 ? zBack + H.deck / 2 : zDeck0 + H.deck / 2;
      // Rails along the back edge and the east end; the stairs come up at the west end.
      VH.Landmarks.railing(world, ctxH, H.x0, zBack + s * 0.1, H.x1, zBack + s * 0.1, G + H.h, { color: 0xf2c230 });
      VH.Landmarks.railing(world, ctxH, H.x1 - 0.1, Math.min(zc - H.deck / 2, zc + H.deck / 2), H.x1 - 0.1, Math.max(zc - H.deck / 2, zc + H.deck / 2), G + H.h, { color: 0xf2c230 });
      W.stairs(world, ctxH.concrete, H.x0 - 7, zc, 'e', 7, H.deck - 0.4, KERB, G + H.h, concDark, { railHex: 0xf2c230 });
    }
    // Coloured lip lines along each wall's top.
    for (const z of [H.zf0 - qp[qp.length - 2][0], H.zf1 + qp[qp.length - 2][0]]) world.ctxAt(hpx, z).marks.box(H.x0, G + H.h - 0.01, z - 0.15, H.x1, G + H.h + 0.004, z + 0.15, col(0xf2c230));

    // --- the funbox: a flat top with a ramp down each side, ledge blocks in the corners, a rail across the top
    const B = SK.box;
    const bctx = world.ctxAt(B.cx, B.cz);
    const bt = G + B.h;
    // The top: drawn as a block, solid as a flat ramp (cars ride on from the ramps without catching an edge) over a low core.
    bctx.concrete.box(B.cx - B.half, KERB, B.cz - B.half, B.cx + B.half, bt, B.cz + B.half, col(conc));
    world.physics.addRamp(B.cx, B.cz, B.half, B.half, 0, 0, bt, bt, 'concrete', F().ALL);
    world.physics.addBox(B.cx - B.half, 0, B.cz - B.half, B.cx + B.half, bt - 0.8, B.cz + B.half, 'concrete', F().SOLID | F().SHOTS);
    for (const [hd, sx, sz] of [[0, 0, -1], [PI, 0, 1], [PI / 2, -1, 0], [-PI / 2, 1, 0]]) {
      const x = B.cx + sx * (B.half + B.run), z = B.cz + sz * (B.half + B.run);
      Sk.profileRamp(world, bctx.concrete, x, z, hd, 2 * B.half, [[0, G], [B.run, bt]], concDark, { side: paint[(Math.round(hd * 10) + 20) % paint.length] });
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const x0 = B.cx + sx * B.half, x1 = B.cx + sx * (B.half + B.run), z0 = B.cz + sz * B.half, z1 = B.cz + sz * (B.half + B.run);
      box(world, 'concrete', Math.min(x0, x1), KERB, Math.min(z0, z1), Math.max(x0, x1), KERB + 0.45, Math.max(z0, z1), concDark, 'concrete');
    }
    box(world, 'prop', B.cx - 3.2, bt, B.cz - B.half + 0.6, B.cx + 3.2, bt + 0.42, B.cz - B.half + 0.7, 0xf2c230, 'metal'); // a grind rail along the north edge of the top

    // --- the north bank: a long quarter pipe facing the middle, deck and rail on top
    const nq = Sk.quarterProfile(3.5, 2.6, 1.6, 6).map(([u, y]) => [u, y + G]);
    const nEnd = nq[nq.length - 1][0];
    const nz = SK.z0 + 2 + nEnd;
    for (const [x0, x1, c] of [[252, 278, 0x3fae7a], [278, 304, 0xf08a3c]]) {
      const ctx = world.ctxAt((x0 + x1) / 2, nz);
      Sk.profileRamp(world, ctx.concrete, (x0 + x1) / 2, nz, PI, x1 - x0, nq, conc, { side: c });
      VH.Landmarks.railing(world, ctx, x0, nz - nEnd + 0.1, x1, nz - nEnd + 0.1, G + 2.6, { color: 0xf2c230 });
    }
    VH.Landmarks.railing(world, world.ctxAt(304, nz), 303.9, nz - nEnd, 303.9, nz - nEnd + 1.6, G + 2.6, { color: 0xf2c230 });
    W.stairs(world, world.ctxAt(248, nz).concrete, 245, nz - nEnd + 0.8, 'e', 7, 1.4, KERB, G + 2.6, concDark, { railHex: 0xf2c230 });

    // --- the spine: two ramps back to back
    const spz = 1007, spx0 = 184, spx1 = 204;
    for (const [z, hd] of [[spz - 7, 0], [spz + 7, PI]]) Sk.profileRamp(world, world.ctxAt((spx0 + spx1) / 2, spz).concrete, (spx0 + spx1) / 2, z, hd, spx1 - spx0, [[0, G], [4, G + 0.9], [7, G + 1.8]], conc, { side: 0xf2c230 });

    // --- rails, a ledge, a stair set with a handrail
    const rail = (x0, x1, z, h) => {
      const ctx = world.ctxAt((x0 + x1) / 2, z);
      for (let x = x0 + 0.3; x <= x1 - 0.3 + 1e-6; x += (x1 - x0 - 0.6) / 3) ctx.prop.box(x - 0.05, KERB, z - 0.05, x + 0.05, KERB + h, z + 0.05, col(0x5a6670));
      ctx.prop.box(x0, KERB + h - 0.06, z - 0.05, x1, KERB + h, z + 0.05, col(0xcfd3d6));
      world.physics.addBox(x0, 0, z - 0.12, x1, KERB + h, z + 0.12, 'railing', F().SOLID | F().SHOTS);
    };
    rail(222, 238, 1000, 0.45);
    rail(222, 238, 1012, 0.65);
    box(world, 'concrete', 246, KERB, 998, 262, KERB + 0.5, 1001, concDark, 'concrete');
    world.ctxAt(254, 999.5).prop.box(246, KERB + 0.5, 997.95, 262, KERB + 0.56, 998.1, col(0xcfd3d6));
    world.physics.addBox(246, KERB + 0.5, 997.95, 262, KERB + 0.56, 998.1, 'metal', F().SOLID | F().SHOTS);
    box(world, 'concrete', 274, KERB, 996, 282, KERB + 0.9, 1008, conc, 'concrete');
    W.stairs(world, world.ctxAt(272, 1002).concrete, 270, 1002, 'e', 4, 12, KERB, KERB + 0.9, concDark, { rails: false });
    Sk.profileRamp(world, world.ctxAt(285, 1002).concrete, 288, 1002, -PI / 2, 12, [[0, G], [6, KERB + 0.9]], concDark, {});
    rail(270, 274, 1002, 1.0);

    // --- the bowl: four quarter pipes round a flat floor, solid corner blocks, a deck all round, stairs on the south side
    {
      const bx0 = 256, bz0 = 958, fl = { w: 16, d: 12 };
      const bq = Sk.quarterProfile(3, 2.2, 1.5, 5).map(([u, y]) => [u, y + G]);
      const dep = bq[bq.length - 1][0];
      const fx0 = bx0 + dep, fx1 = fx0 + fl.w, fz0 = bz0 + dep, fz1 = fz0 + fl.d;
      const ctx = world.ctxAt(fx0 + fl.w / 2, fz0 + fl.d / 2);
      W.pave(world, fx0, fz0, fx1, fz1, 0x6fb7d8, 'decal', KERB, 4);
      Sk.profileRamp(world, ctx.concrete, (fx0 + fx1) / 2, fz0, PI, fl.w, bq, conc, { side: 0x2f8fbf });
      Sk.profileRamp(world, ctx.concrete, (fx0 + fx1) / 2, fz1, 0, fl.w, bq, conc, { side: 0x2f8fbf });
      Sk.profileRamp(world, ctx.concrete, fx0, (fz0 + fz1) / 2, -PI / 2, fl.d, bq, conc, { side: 0x2f8fbf });
      Sk.profileRamp(world, ctx.concrete, fx1, (fz0 + fz1) / 2, PI / 2, fl.d, bq, conc, { side: 0x2f8fbf });
      const top = G + 2.2;
      for (const [x0, z0] of [[bx0, bz0], [fx1, bz0], [bx0, fz1], [fx1, fz1]]) box(world, 'concrete', x0, KERB, z0, x0 + dep, top, z0 + dep, concDark, 'concrete');
      const ox1 = fx1 + dep, oz1 = fz1 + dep;
      for (const [ax, az, bx, bz] of [[bx0, bz0 + 0.1, ox1, bz0 + 0.1], [bx0 + 0.1, bz0, bx0 + 0.1, oz1], [ox1 - 0.1, bz0, ox1 - 0.1, oz1], [bx0, oz1 - 0.1, fx0 + 2, oz1 - 0.1], [fx0 + 4.6, oz1 - 0.1, ox1, oz1 - 0.1]]) VH.Landmarks.railing(world, ctx, ax, az, bx, bz, top, { color: 0xf2c230 });
      W.stairs(world, ctx.concrete, fx0 + 3.3, oz1 + 6, 'n', 6, 2.4, KERB, top, concDark, { railHex: 0xf2c230 });
      for (const [x, z] of [[bx0 + dep / 2, bz0 + dep / 2], [fx1 + dep / 2, bz0 + dep / 2]]) world.ctxAt(x, z).marks.box(x - 1.2, top, z - 1.2, x + 1.2, top + 0.003, z + 1.2, col(0xe0574f));
    }
    // --- a graffiti wall (both faces painted) between the rails and the funbox
    {
      const gz0 = 984, gz1 = 984.5, gx0 = 212, gx1 = 246;
      const ctx = world.ctxAt((gx0 + gx1) / 2, gz0);
      box(world, 'concrete', gx0, KERB, gz0, gx1, KERB + 2.6, gz1, 0xdedcd4, 'wall');
      for (let x = gx0 + 0.5, i = 0; x < gx1 - 2; x += 2.6, i++) {
        const h = 0.8 + ((i * 7) % 5) * 0.35;
        for (const [z, sgn] of [[gz0, -1], [gz1, 1]]) ctx.prop.box(x, KERB + 0.3 + (i % 2) * 0.4, z + sgn * 0.01, x + 2.2, KERB + 0.3 + (i % 2) * 0.4 + h, z + sgn * 0.02, col(paint[(i + (sgn > 0 ? 3 : 0)) % paint.length]));
      }
    }
    // Palms in planters round the inside of the fence.
    for (const [x, z] of [[176, 932], [210, 932], [240, 932], [176, 1012], [316, 990], [316, 940], [200, 1021.5], [270, 1021.5]]) {
      box(world, 'concrete', x - 1, KERB, z - 1, x + 1, KERB + 0.5, z + 1, 0xdedcd4, 'concrete');
      world.ctxAt(x, z).hedge.box(x - 0.9, KERB + 0.5, z - 0.9, x + 0.9, KERB + 0.6, z + 0.9, col(0x4f7f3a));
      world.addProp('palmTall', x, KERB + 0.5, z, (x + z) % 6, 0.9);
    }

    // --- bleachers on the west side, the Deck & Wheel shop, benches and bins
    for (let i = 0; i < 3; i++) box(world, 'concrete', SK.x0 + 2 + i * 1.2, KERB, 960, SK.x0 + 3.2 + i * 1.2, KERB + 0.45 * (3 - i), 1000, i % 2 ? 0x7d8a96 : 0x9aa6b2, 'concrete');
    const sh = shack(world, 296, 944, 309, 955, 3.2, 'w', { wall: 0x2a2d33, roof: 0xe0574f, awning: 0xf2c230, floor: 0x8f9096 });
    for (let i = 0; i < 5; i++) sh.prop.box(308.6, KERB + 0.9 + i * 0.35, 946 + i * 1.6, 308.75, KERB + 1.1 + i * 0.35, 947.2 + i * 1.6, col(paint[i]));
    world.physics.addBox(308.5, 0, 945.8, 308.75, KERB + 2.6, 954, 'wall', F().SOLID | F().SHOTS);
    W.sign(world, { x: 295.6, y: KERB + 3.75, z: 949.5, yaw: -PI / 2, w: 7, h: 0.9, lines: ['DECK & WHEEL · SKATE SHOP'], style: 'plaque', oneSided: true, flat: true, colors: { bg: ['#1c1c1e', '#1c1c1e'], fg: '#f2c230', border: '#e0574f' } });
    for (const [x, z, yaw] of [[220, 975, 0], [260, 975, 0], [300, 975, 0], [215, 1020, PI], [255, 1020, PI]]) world.addProp('bench', x, KERB, z, yaw, 1);
    for (const [x, z] of [[230, 975], [290, 975], [312, 965]]) world.addProp('bin', x, KERB, z, 0, 1);

    // --- floodlights, the gate arch with the park's name
    for (const [x, z] of [[172, 932], [316, 932], [172, 1018], [230, 1041.2], [312, 1017]]) {
      const ctx = world.ctxAt(x, z);
      Sk.drum(world, ctx.prop, x, KERB, z, 0.16, 11, 8, 0x8a9097, 'pole');
      ctx.prop.box(x - 0.7, KERB + 11, z - 0.3, x + 0.7, KERB + 11.6, z + 0.3, col(0x3f454c));
      ctx.screen.box(x - 0.6, KERB + 10.9, z - 0.25, x + 0.6, KERB + 11.0, z + 0.25, VH.col(0xf6f8ff, 2.4));
    }
    const pools = world.floodlights || (world.floodlights = []);
    for (const [x, z] of [[194, 945], [240, 950], [278, 940], [194, 1007], [250, 1004], [230, lz], [300, lz]]) pools.push({ x, z, r: 16, y: KERB + 0.03, strength: 0.5, tint: [1, 1.05, 1.12] });
    const gz = (SK.gateE[0] + SK.gateE[1]) / 2;
    for (const z of [SK.gateE[0] - 0.3, SK.gateE[1] + 0.3]) Sk.drum(world, world.ctxAt(SK.x1 - 1, z).prop, SK.x1 - 1, KERB, z, 0.25, 5.2, 10, 0xe0574f, 'pole');
    S().air(world, world.ctxAt(SK.x1 - 1, gz).prop, SK.x1 - 1.3, KERB + 5.2, SK.gateE[0] - 0.6, SK.x1 - 0.7, KERB + 5.8, SK.gateE[1] + 0.6, 0xe0574f, 'metal');
    W.sign(world, { x: SK.x1 - 0.65, y: KERB + 6.7, z: gz, yaw: PI / 2, w: 13, h: 1.8, lines: ['SANDPIPER SKATE PARK', 'Ride it · Drive it · Wear a helmet'], style: 'welcome', oneSided: false, colors: { bg: ['#e0574f', '#f08a3c', '#f2c230'] } });
  }

  function buildBeach(world, layout) {
    buildShore(world);
    buildSandLife(world);
    buildMotel(world);
    buildShops(world);
    buildBar(world);
    buildCarPark(world);
    buildClub(world);
    world.sandpiperShop = buildKwikPik(world, layout);
  }

  // ------------------------------------------------------------- the map
  if (VH.MapPainters) {
    VH.MapPainters.push((g, layout, o) => {
      if (!layout.plots || !layout.plots.sandpiper_beach) return;
      const R = o.R;
      const box2 = (x0, z0, x1, z1, c, sh) => K().mapBox(g, R, x0, z0, x1, z1, c, sh);
      if (layout.plots.skate_park) {
        box2(SK.x0, SK.z0, SK.x1, SK.z1, '#c8c8c2', false);
        box2(SK.x0 + 1, SK.lane.z0, SK.kick.x0, SK.lane.z1, '#8f9096', false);
        box2(SK.kick.x0, SK.lane.z0, SK.kick.lip, SK.lane.z1, '#e0574f');
        box2(SK.hp.x0, SK.hp.zf0 - 6.4, SK.hp.x1, SK.hp.zf1 + 6.4, '#2f8fbf');
        box2(SK.box.cx - 9, SK.box.cz - 9, SK.box.cx + 9, SK.box.cz + 9, '#a9a9a3');
        box2(252, SK.z0 + 2, 304, SK.z0 + 7, '#3fae7a');
      }
      box2(BE.x0, BE.z0, BE.prom.x1, BE.z1, '#e8c4a8', false);
      box2(BE.low, BE.z0, BE.sea + 0.5, BE.z1, '#ead6a6', false);
      box2(BE.sea + 0.5, BE.gap[0], BE.shore, BE.gap[1], '#d8c08a', false);
      box2(MOTEL.x0, MOTEL.z0, MOTEL.x1, MOTEL.z1, '#f3b7c3');
      box2(PARK.x0, PARK.z0, PARK.x1, PARK.z1, '#9a9a9c', false);
      box2(BAR.x0, BAR.z0, BAR.x1, BAR.z1, '#9a7650');
      g.fillStyle = '#13b5b1';
      R(CLUB.x - 0.6, CLUB.z0, CLUB.x + 0.6, CLUB.z1);
      R(CLUB.x, CLUB.z0 - 0.6, BE.shore, CLUB.z0 + 0.6);
      R(CLUB.x, CLUB.z1 - 0.6, BE.shore, CLUB.z1 + 0.6);
      g.fillStyle = '#d8342c';
      for (const [, z] of TOWERS) R(TX - 2.5, z - 2.5, TX + 2.5, z + 2.5);
    });
  }

  // --------------------------------------------------------- moving parts
  class SandpiperLife {
    constructor(game) {
      this.game = game;
      const Wk = K();
      if (!Wk || !game.world || !game.world.sandpiperBeach) return;
      // Cars in the beach car park, about one bay in two.
      const list = [];
      let seed = 7301;
      for (const [zr, heading] of [[PARK.z0 + 2.8, PI], [PARK.z1 - 2.8, 0]]) {
        for (let x = PARK.x0 + 7.35; x < PARK.x1 - 1; x += 2.7) {
          seed++;
          if (VH.math.hash2(seed, 3) < 0.5) continue;
          list.push(Wk.parkedSpot(x, zr, heading, seed));
        }
      }
      Wk.addParkedSpots(game, list);
    }
    update() {}
    stop() {}
    reset() {}
  }

  // -------------------------------------------------------------- register
  VH.Districts.register({
    id: D,
    name: 'Sandpiper Beach',
    plots: ['sandpiper_beach', 'skate_park'],
    build(world, layout) {
      const t0 = performance.now();
      if (!layout.plots || !VH.WNKit || !VH.SouthKit) return;
      if (layout.plots.sandpiper_beach) {
        buildBeach(world, layout);
        world.sandpiperBeach = true;
      }
      if (layout.plots.skate_park) {
        buildSkatePark(world);
        world.sandpiperSkate = true;
      }
      this.buildMs = Math.round(performance.now() - t0);
    },
    registerPlaces(world, places) {
      const add = (id, p) => {
        const def = places.defs && places.defs[id];
        places.add(id, Object.assign({ district: D, desc: def && def.desc }, p));
      };
      const extra = places.extra[D];
      if (world.sandpiperSkate) {
        add('skate_park', { name: 'Sandpiper Skate Park', x: SK.x1 - 6, z: (SK.gateE[0] + SK.gateE[1]) / 2, yaw: -PI / 2, kind: 'park', landmark: true });
        if (extra) {
          extra.push(
            { x: SK.hp.x0 + 3, z: SK.hp.zf0 - 5.2, y: KERB + SK.hp.h, yaw: 0, kinds: ['overlook', 'park'], name: 'The top of the half-pipe' },
            { x: 250, z: 985, yaw: 0, kinds: ['park', 'corner'], name: 'The middle of the skate park' },
            { x: 180, z: (SK.lane.z0 + SK.lane.z1) / 2, yaw: PI / 2, kinds: ['parking', 'street'], name: 'The Launch Lane run-up' },
          );
        }
      }
      if (world.sandpiperBeach) {
        const tower = (n) => TOWERS.find((t) => t[0] === n)[1];
        add('sandpiper_beach', { name: 'Sandpiper Beach', x: 388, z: 925, yaw: PI / 2, kind: 'beach', landmark: true });
        add('sandpiper_promenade', { name: 'Sandpiper Promenade', x: 345, z: 930, yaw: 0, kind: 'boardwalk', landmark: true });
        add('lifeguard_tower_7', { name: 'Lifeguard tower 7', x: TX + 1.4, z: tower(7), y: TW.y, yaw: PI / 2, kind: 'beach' });
        add('lifeguard_tower_8', { name: 'Lifeguard tower 8', x: TX + 1.4, z: tower(8), y: TW.y, yaw: PI / 2, kind: 'beach' });
        add('beach_club_fence', { name: 'The Castellane Beach Club gate', x: CLUB.x - 4, z: (CLUB.gate[0] + CLUB.gate[1]) / 2, yaw: PI / 2, kind: 'beach' });
        add('beach_club_sand', { name: 'Inside the Beach Club fence', x: 382, z: 1032, yaw: PI / 2, kind: 'beach' });
        add('coast_road', { name: 'Sandpiper Drive, the coast road', x: 334.5, z: 900, yaw: 0, kind: 'street' });
        add('causeway_south', { name: 'The Sandpiper end of the Southbay Causeway', x: 405, z: 790, yaw: PI / 2, kind: 'street' });
        const s = world.sandpiperShop;
        if (s) add('promenade_kwikpik', { name: s.name, x: s.door.x, z: s.door.z, yaw: s.yawIn, kind: 'storefront', storeId: s.id });
        if (extra) {
          extra.push(
            { x: 388, z: 880, yaw: PI / 2, kinds: ['beach'], name: 'The sand by tower 2' },
            { x: 392, z: 1150, yaw: PI / 2, kinds: ['beach'], name: 'The south end of the beach' },
            { x: 432, z: 960, yaw: PI / 2, kinds: ['beach', 'overlook'], name: 'The water\'s edge' },
            { x: 345, z: 1010, yaw: 0, kinds: ['boardwalk', 'street'], name: 'The promenade by the beach club' },
            { x: 345, z: 1100, yaw: PI, kinds: ['boardwalk', 'corner'], name: 'The promenade, south' },
            { x: 345, z: 868, yaw: 0, kinds: ['motel', 'boardwalk'], name: 'Outside the Seaspray Motel' },
            { x: 349, z: 911, yaw: PI / 2, kinds: ['storefront', 'boardwalk'], name: 'Swell & Sons Surf Co.' },
            { x: 348, z: 1119.5, yaw: PI / 2, kinds: ['diner', 'storefront'], name: 'The Sandpiper Prawn Shack' },
            { x: 363, z: 1138, y: BAR.y, yaw: PI / 2, kinds: ['bar'], name: 'The Salty Pelican' },
            { x: 374, z: 1169, yaw: PI, kinds: ['parking'], name: 'The beach car park' },
          );
        }
      }
    },
    System: SandpiperLife,
  });
})();
