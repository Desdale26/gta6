/*
 * districts/haverly.js — Haverly Farms' landmarks (VICEHAVEN 4.0): the
 * farmland north and west of the airport.
 *
 *   haverly_farm_shop  the Haverly Farm Shop on Airport Road: a timber shop
 *                      with a veranda of produce stands, the Hayloft Café
 *                      and its picnic lawn, polytunnels behind, a gravel car
 *                      park, the egg stand's honesty box at the gate, a
 *                      straw-bale fort and a goat pen for the children, and
 *                      across the farm track the pick-your-own pumpkin patch
 *                      (the giant pumpkin, scarecrows, wheelbarrows, a hay
 *                      ride parked, jack-o'-lanterns that glow after dark)
 *
 * Static parts are merged into the chunk builders (VH.WNKit, VH.CountryKit);
 * nothing makes a mesh of its own apart from the signs.
 */
(function () {
  'use strict';

  const VH = window.VH;
  const KERB = 0.15;
  const F = () => VH.COLLIDE;
  const W = () => VH.WNKit;
  const C = () => VH.CountryKit;
  const D = 'haverly';

  // ---------------------------------------------------------------- plan
  // The farm shop plot (-1582..-1306, -1315..-1189): Airport Road south,
  // Westfield Road west, Mill Lane east, Hayrick Lane north.
  const FS = {
    x0: -1582, x1: -1306, z0: -1315, z1: -1189,
    edge: 1.6, // the pavement left round the edge
    gate: { x0: -1530, x1: -1510 }, // the car park's way in from Airport Road
    park: { x0: -1570, x1: -1462, z0: -1237, z1: -1194 },
    rows: [-1236, -1219.5, -1214.5, -1203], // bay rows: [z where the bay starts, nose direction]
    shop: { x0: -1556, x1: -1504, z0: -1286, z1: -1266, h: 4.6 },
    veranda: { x0: -1553, x1: -1507, z0: -1266, z1: -1262 },
    path: { x0: -1534, x1: -1526 },
    cafe: { x0: -1577, x1: -1561, z0: -1286, z1: -1272, h: 3.6 },
    tunnels: { x0: -1574, x1: -1504, cz: [-1306.5, -1296.5], w: 8 },
    fort: { x0: -1498, x1: -1482, z0: -1290, z1: -1274 },
    goats: { x0: -1477, x1: -1455, z0: -1292, z1: -1268 },
    eggs: { x: -1543, z: -1196.5 },
    track: { x0: -1452, x1: -1441 },
    patch: { x0: -1435, x1: -1311, z0: -1307, z1: -1197, gateZ0: -1240, gateZ1: -1233, midX: -1373, midZ: -1252 },
  };

  // ------------------------------------------------------------ farm shop
  function buildFarmShop(world) {
    const K = C(), WN = W();
    const P = FS;
    const e = P.edge;
    // The ground: meadow grass over the whole plot inside the pavement edge.
    WN.pave(world, P.x0 + e, P.z0 + e, P.x1 - e, P.z1 - e, 0xf0f4e0, 'grassTop', KERB + 0.004);
    world.addLawn(P.x0 + e, P.z0 + e, P.x1 - e, P.z1 - e);
    // Hedges along the lanes, open at the car park, the farm track and the patch's field gate.
    const hz0 = P.z0 + e + 0.6, hz1 = P.z1 - e - 0.6, hx0 = P.x0 + e + 0.6, hx1 = P.x1 - e - 0.6;
    K.hedge(world, hx0, hz1, hx1, hz1, [[P.gate.x0, P.gate.x1], [P.track.x0, P.track.x1]], 1.25, 1.0);
    K.hedge(world, hx0, hz0, hx1, hz0, [[P.track.x0, P.track.x1]], 1.25, 1.0);
    K.hedge(world, hx0, hz0 + 0.5, hx0, hz1 - 0.5, [], 1.25, 1.0);
    K.hedge(world, hx1, hz0 + 0.5, hx1, hz1 - 0.5, [[-1248, -1243]], 1.25, 1.0);
    // Hedgerow trees (not over the gates).
    for (let x = P.x0 + 14; x < P.x1 - 10; x += 31) {
      if (x > P.gate.x0 - 6 && x < P.gate.x1 + 6) continue;
      if (x > P.track.x0 - 6 && x < P.track.x1 + 6) continue;
      world.addProp(x % 2 ? 'tree' : 'treeB', x, KERB, hz0 + 1.6, x, 1.1);
    }
    for (let z = P.z0 + 30; z < P.z1 - 20; z += 36) world.addProp('treeB', hx0 + 1.6, KERB, z, z, 1.15);

    buildCarPark(world);
    buildShop(world);
    buildCafe(world);
    for (const cz of P.tunnels.cz) K.polytunnel(world, P.tunnels.x0, P.tunnels.x1, cz, P.tunnels.w);
    buildYard(world);
    buildEggStand(world);
    buildTrack(world);
    buildPatch(world);
  }

  /** The gravel car park: bays with timber sleepers at their heads, lamps on the islands. */
  function buildCarPark(world) {
    const WN = W();
    const p = FS.park;
    C().ground(world, p.x0, p.z0, p.x1, p.z1, 'gravel', KERB + 0.012);
    // The way in from Airport Road.
    C().ground(world, FS.gate.x0, p.z1, FS.gate.x1, FS.z1, 'gravel', KERB + 0.012);
    // Bay rows: sleepers along the bay heads, one every bay.
    const sleeper = VH.col(0x6b5038);
    const rows = [
      { z: -1236, dir: 1 }, // bays -1236..-1231, noses north
      { z: -1219.5, dir: -1 }, // bays -1224.5..-1219.5, noses south (back to back with the next)
      { z: -1219.5, dir: 1 }, // -1219.5..-1214.5
      { z: -1203, dir: -1 }, // -1208..-1203
    ];
    for (const r of rows) {
      const zHead = r.z;
      for (let x = p.x0 + 3; x < p.x1 - 3; x += 2.7) {
        const ctx = world.ctxAt(x, zHead);
        ctx.detailWood.box(x - 0.9, KERB, zHead + r.dir * 0.25 - 0.12, x + 0.9, KERB + 0.12, zHead + r.dir * 0.25 + 0.12, sleeper);
      }
    }
    // Islands down the middle double row: a lamp and a planter every 40 m.
    for (const x of [-1556, -1516, -1476]) {
      world.addProp('streetlight', x, KERB, -1219.5, 0, 1);
      world.addProp('planter', x + 2.2, KERB, -1219.5, 0, 1);
    }
    for (const x of [-1566, -1466]) world.addProp('streetlight', x, KERB, -1196, Math.PI, 1);
    world.addProp('streetlight', -1540, KERB, -1240, Math.PI, 1);
    world.addProp('streetlight', -1500, KERB, -1240, Math.PI, 1);
    // Trolley-ish wheelbarrow park and a bin by the shop path.
    world.addProp('bin', FS.path.x0 - 1, KERB, -1239, 0, 1);
    world.addProp('bench', FS.path.x1 + 1.5, KERB, -1240, Math.PI, 1);
  }

  /** The shop: timber barn walls, a veranda of produce stands, the counter. */
  function buildShop(world) {
    const K = C(), WN = W();
    const s = FS.shop, v = FS.veranda;
    const ctx = K.shed(world, s, { h: s.h, rise: 4.2, wall: 0x3e3a34, roof: 0x5a2e26, axis: 'x', bay: 3.8, ww: 0.5, wh: 0.52, floorH: s.h - 0.4, sides: { s: 'win', n: 'blank', e: 'win', w: 'blank' }, seed: 12.7 });
    // White barge boards on the gables and a white band at the eaves.
    for (const x of [s.x0 - 0.05, s.x1 + 0.05]) ctx.prop.box(x - 0.08, KERB + s.h - 0.2, s.z0 - 0.3, x + 0.08, KERB + s.h, s.z1 + 0.3, VH.col(0xf2efe8));
    ctx.prop.box(s.x0 - 0.3, KERB + s.h - 0.25, s.z1 - 0.02, s.x1 + 0.3, KERB + s.h, s.z1 + 0.12, VH.col(0xf2efe8));
    // The path from the car park, and the veranda's timber deck.
    WN.pave(world, FS.path.x0, v.z1, FS.path.x1, FS.park.z0, 0xd8ccb0, 'plazaTop', KERB + 0.02, 3);
    ctx.wood.topRect(v.x0, v.z0, v.x1, v.z1, KERB + 0.03, VH.col(0xb08a62), 2);
    // Flower beds either side of the path.
    for (const [x0, x1] of [[FS.path.x0 - 6, FS.path.x0 - 0.8], [FS.path.x1 + 0.8, FS.path.x1 + 6]]) {
      K.ground(world, x0, v.z1 + 2, x1, FS.park.z0 - 2, 'earth', KERB + 0.018);
      // Rows of bedding plants: a leafy cushion with a band of flowers on it.
      let k = 0;
      for (let z = v.z1 + 2.7; z < FS.park.z0 - 2.4; z += 0.9, k++) {
        const c = [0xe84a6a, 0xf2c318, 0xf2efe8, 0x9a7ac8, 0xff7a3a][k % 5];
        ctx.detailMatte.box(x0 + 0.4, KERB + 0.02, z - 0.3, x1 - 0.4, KERB + 0.24, z + 0.3, VH.col(0x4f7a2e), { bottom: false }); // solidity: passable (knee-low)
        for (let x = x0 + 0.6; x < x1 - 0.5; x += 0.55) ctx.detailMatte.box(x, KERB + 0.22, z - 0.2, x + 0.3, KERB + 0.32, z + 0.2, VH.col(c)); // solidity: passable
      }
    }
    // The veranda roof: a lean-to on posts.
    const roofC = VH.col(0x5a2e26);
    WN.tiltBox(ctx.prop, (v.x0 + v.x1) / 2, KERB + 3.35, (v.z0 + v.z1) / 2 + 0.1, v.x1 - v.x0 + 0.6, 0.16, v.z1 - v.z0 + 0.6, 0, 0.16, roofC);
    for (let x = v.x0 + 0.2; x <= v.x1 - 0.1; x += (v.x1 - v.x0 - 0.4) / 6) {
      ctx.wood.box(x - 0.11, KERB, v.z1 - 0.3, x + 0.11, KERB + 3.05, v.z1 - 0.08, VH.col(0xd8cbb0));
      world.physics.addBox(x - 0.13, 0, v.z1 - 0.32, x + 0.13, KERB + 3.05, v.z1 - 0.06, 'pole', F().SOLID | F().SHOTS);
    }
    // A festoon of bulbs along the veranda (glows at night).
    WN.festoon(world, v.x0 + 0.2, KERB + 2.95, v.z1 - 0.2, v.x1 - 0.2, KERB + 2.95, v.z1 - 0.2, 0.25, [0xffe2a0, 0xffd080], 1.5);
    // The door (in the middle), the counter beside it, produce stands along the front.
    const dx = (FS.path.x0 + FS.path.x1) / 2;
    ctx.prop.box(dx - 1.1, KERB, s.z1 - 0.02, dx + 1.1, KERB + 2.5, s.z1 + 0.08, VH.col(0x2f4a3a));
    ctx.screen.box(dx - 0.8, KERB + 1.2, s.z1 + 0.08, dx + 0.8, KERB + 2.2, s.z1 + 0.1, VH.col(0xffe0a8, 0.9)); // the lit glass in the door
    // Shop windows either side (the lights are on inside), white frames.
    for (const off of [-15, -9.5, -4, 9.5, 15]) {
      const wx = dx + off;
      if (wx - 1.7 < s.x0 + 1 || wx + 1.7 > s.x1 - 1) continue;
      ctx.prop.box(wx - 1.75, KERB + 0.75, s.z1 - 0.02, wx + 1.75, KERB + 2.75, s.z1 + 0.06, VH.col(0xf2efe8));
      ctx.screen.box(wx - 1.6, KERB + 0.9, s.z1 + 0.06, wx + 1.6, KERB + 2.6, s.z1 + 0.08, VH.col(0xffe2b0, 0.75));
      ctx.prop.box(wx - 0.04, KERB + 0.9, s.z1 + 0.08, wx + 0.04, KERB + 2.6, s.z1 + 0.1, VH.col(0xf2efe8));
    }
    world.floodlights = world.floodlights || [];
    world.floodlights.push({ x: dx, z: v.z0 + 2, r: 7, y: KERB + 0.03, strength: 0.8 });
    world.floodlights.push({ x: dx - 12, z: v.z0 + 2, r: 6, y: KERB + 0.03, strength: 0.6 });
    world.floodlights.push({ x: dx + 12, z: v.z0 + 2, r: 6, y: KERB + 0.03, strength: 0.6 });
    // The counter: a timber stall with an awning, where the shop sells over the veranda.
    const cx = dx + 4.5;
    WN.solid(world, ctx.wood, cx - 1.6, KERB, v.z0 + 0.2, cx + 1.6, KERB + 1.0, v.z0 + 1.1, 0x9a7448, null, 'crate', F().SOLID | F().SHOTS);
    ctx.wood.box(cx - 1.7, KERB + 1.0, v.z0 + 0.1, cx + 1.7, KERB + 1.06, v.z0 + 1.2, VH.col(0xc8a878));
    produce(ctx, cx - 1.3, KERB + 1.06, v.z0 + 0.3, cx + 1.3, v.z0 + 1.0, 3);
    world.physics.addBox(cx - 1.7, KERB + 1.0, v.z0 + 0.1, cx + 1.7, KERB + 1.34, v.z0 + 1.2, 'crate', F().SOLID | F().SHOTS);
    world.interactables.push({ id: 'haverly_shop_counter', kind: 'haverlyBuy', x: cx, y: KERB + 1.0, z: v.z0 + 2.0, radius: 1.8, label: 'Buy a punnet of strawberries', price: 3, heal: 25, what: 'strawberries' });
    // Produce stands: trestle tables of crates.
    for (const [a0, a1] of [[v.x0 + 1, v.x0 + 7], [v.x0 + 9, v.x0 + 15], [dx + 8, dx + 14], [dx + 16, v.x1 - 1]]) {
      WN.solid(world, ctx.wood, a0, KERB, v.z0 + 0.6, a1, KERB + 0.82, v.z0 + 1.8, 0x8a6a48, null, 'crate', F().SOLID | F().SHOTS);
      produce(ctx, a0 + 0.1, KERB + 0.82, v.z0 + 0.7, a1 - 0.1, v.z0 + 1.7, (a0 * 13) | 0);
      world.physics.addBox(a0, KERB + 0.8, v.z0 + 0.6, a1, KERB + 1.1, v.z0 + 1.8, 'crate', F().SOLID | F().SHOTS); // the crates on top
    }
    // A pile of pumpkins and buckets of flowers by the door.
    for (let i = 0; i < 9; i++) K.pumpkin(ctx, dx - 3 + (i % 3) * 0.7, v.z0 + 1 + Math.floor(i / 3) * 0.7, 1.1, false);
    world.physics.addBox(dx - 3.5, 0, v.z0 + 0.6, dx - 1.3, KERB + 0.5, v.z0 + 2.9, 'crate', F().SOLID);
    // The name over the veranda.
    VH.Landmarks.sign(world, { x: dx, y: KERB + 4.45, z: v.z1 + 0.45, yaw: 0, w: 15, h: 1.9, lines: ['HAVERLY FARM SHOP', 'Grown here · Picked this morning'], style: 'brand', colors: { bg: ['#2f4a3a', '#24392d'], fg: '#f4ead2' }, frame: 0xf2efe8 });
    // Chalkboard on the path.
    WN.solid(world, ctx.wood, FS.path.x1 + 0.4, KERB, -1250.3, FS.path.x1 + 1.3, KERB + 1.1, -1249.9, 0x2a2d2a, null, 'sign', F().SOLID | F().SHOTS);
  }

  /** Crates of fruit and veg on a table top: rows of coloured heaps. */
  function produce(ctx, x0, y, z0, x1, z1, seed) {
    const cols = [0xc8302c, 0x8ab84a, 0xf2c318, 0xe8761e, 0x6a3a8a, 0xd8d0b0, 0x4f8a3a, 0xe84a6a];
    let k = Math.abs(seed | 0);
    for (let x = x0; x < x1 - 0.5; x += 0.62) {
      const c = cols[k++ % cols.length];
      ctx.detailWood.box(x, y, z0, x + 0.56, y + 0.18, z1, VH.col(0xb89a6a));
      ctx.detailMatte.box(x + 0.04, y + 0.18, z0 + 0.04, x + 0.52, y + 0.26, z1 - 0.04, VH.col(c));
    }
  }

  /** The Hayloft Café: a little timber tea room with a serving hatch, picnic tables on the lawn. */
  function buildCafe(world) {
    const K = C(), WN = W();
    const c = FS.cafe;
    const ctx = K.shed(world, c, { h: c.h, rise: 2.6, wall: 0xe8dcc0, roof: 0x3f5a48, axis: 'z', bay: 3, ww: 0.5, wh: 0.5, sides: { e: 'win', s: 'win', w: 'blank', n: 'blank' }, seed: 3.3 });
    // The hatch on the east side, with a striped awning.
    const hz = (c.z0 + c.z1) / 2;
    ctx.screen.box(c.x1 + 0.02, KERB + 1.0, hz - 1.4, c.x1 + 0.06, KERB + 2.2, hz + 1.4, VH.col(0xffe8b8, 0.85));
    WN.solid(world, ctx.wood, c.x1, KERB, hz - 1.6, c.x1 + 0.7, KERB + 1.05, hz + 1.6, 0x9a7448, null, 'crate', F().SOLID | F().SHOTS);
    for (let z = hz - 1.8, k = 0; z < hz + 1.8; z += 0.6, k++) WN.tiltBox(ctx.prop, c.x1 + 0.8, KERB + 2.6, z + 0.3, 1.6, 0.06, 0.6, Math.PI / 2, 0.3, k % 2 ? 0xf4efe2 : 0x3f8f6f);
    world.physics.addBox(c.x1, KERB + 2.3, hz - 1.8, c.x1 + 1.65, KERB + 2.95, hz + 1.8, 'awning', F().SOLID | F().SHOTS);
    world.interactables.push({ id: 'haverly_cafe', kind: 'haverlyBuy', x: c.x1 + 1.8, y: KERB + 1.0, z: hz, radius: 1.8, label: 'Buy a cream tea', price: 5, heal: 40, what: 'tea' });
    VH.Landmarks.sign(world, { x: c.x1 + 0.08, y: KERB + 3.0, z: hz, yaw: Math.PI / 2, w: 4.2, h: 0.7, lines: ['THE HAYLOFT CAFÉ'], style: 'plaque' });
    // The picnic lawn between the café and the path: tables, parasols, a few apple trees.
    let k = 0;
    for (const z of [-1258, -1250, -1242]) {
      for (const x of [-1574, -1566, -1558, -1550, -1542]) {
        if (x > FS.path.x0 - 7.5 && z < -1252) continue; // the flower beds
        K.picnicTable(world, x, z, (k % 2) * 0.12);
        if (k % 2 === 0) K.parasol(world, x + 1.6, z + 0.9, [0xc8402c, 0x2f6f9a, 0xe0b12e][k % 3], 2.5);
        k++;
      }
    }
    for (const [x, z] of [[-1578, -1263], [-1578, -1246], [-1561, -1268]]) world.addProp('tree', x, KERB, z, x + z, 0.85);
    world.floodlights = world.floodlights || [];
    world.floodlights.push({ x: c.x1 + 2, z: hz, r: 6, y: KERB + 0.03, strength: 0.7 });
  }

  /** Behind the café and the shop: the yard, the straw-bale fort and the goat pen. */
  function buildYard(world) {
    const K = C(), WN = W();
    // A gravel yard between the shop and the polytunnels.
    K.ground(world, FS.tunnels.x0 - 2, FS.shop.z0 - 6, FS.shop.x1 + 4, FS.shop.z0, 'gravel', KERB + 0.01);
    // The straw-bale fort: four tiers of bales, a stepped pyramid to climb.
    const f = FS.fort;
    const ctx = world.ctxAt((f.x0 + f.x1) / 2, (f.z0 + f.z1) / 2);
    for (let t = 0; t < 4; t++) {
      const i = t * 2;
      const x0 = f.x0 + i, x1 = f.x1 - i, z0 = f.z0 + i, z1 = f.z1 - i;
      const y0 = KERB + t * 0.5, y1 = y0 + 0.5;
      ctx.detailMatte.box(x0, y0, z0, x1, y1, z1, VH.col(0xdcc47a), { bottom: false });
      // The joints between bales.
      for (let x = x0 + 1.1; x < x1 - 0.2; x += 1.1) ctx.detailMatte.box(x - 0.025, y0, z0 - 0.01, x + 0.025, y1 + 0.005, z1 + 0.01, VH.col(0xb89a52));
      for (let z = z0 + 2.0; z < z1 - 0.2; z += 2.0) ctx.detailMatte.box(x0 - 0.01, y0, z - 0.025, x1 + 0.01, y1 + 0.005, z + 0.025, VH.col(0xb89a52));
      world.physics.addBox(x0, 0, z0, x1, y1, z1, 'crate', F().SOLID | F().SHOTS);
    }
    K.scarecrow(world, (f.x0 + f.x1) / 2, (f.z0 + f.z1) / 2, 0, 0xc8402c, KERB + 2.0);
    // The goat pen: a fence, a little goat house, a hay rack, goats.
    const g = FS.goats;
    K.postRail(world, g.x0, g.z0, g.x1, g.z0, []);
    K.postRail(world, g.x0, g.z1, g.x1, g.z1, [[g.x0 + 3, g.x0 + 5]]);
    K.postRail(world, g.x0, g.z0, g.x0, g.z1, []);
    K.postRail(world, g.x1, g.z0, g.x1, g.z1, []);
    // A latched gate in the gap.
    const gc = world.ctxAt(g.x0 + 4, g.z1);
    for (const y of [0.4, 0.8, 1.15]) gc.detailWood.box(g.x0 + 3, KERB + y, g.z1 - 0.05, g.x0 + 5, KERB + y + 0.1, g.z1 + 0.05, VH.col(0xa8885c));
    world.physics.addBox(g.x0 + 3, 0, g.z1 - 0.1, g.x0 + 5, KERB + 1.3, g.z1 + 0.1, 'fence', F().SOLID);
    K.ground(world, g.x0 + 0.2, g.z0 + 0.2, g.x1 - 0.2, g.z1 - 0.2, 'dirt', KERB + 0.014);
    const hut = { x0: g.x1 - 6, x1: g.x1 - 1, z0: g.z0 + 1, z1: g.z0 + 5 };
    K.shed(world, hut, { h: 1.8, rise: 1.0, wall: 0x8a6a48, roof: 0x3a3a3a, axis: 'x', style: 0, sides: { s: 'blank' } });
    gc.prop.box(hut.x0 + 1.8, KERB, hut.z1 + 0.01, hut.x0 + 3.0, KERB + 1.2, hut.z1 + 0.04, VH.col(0x2a2018)); // the doorway (dark)
    const goatCols = [0xf2eee4, 0x8a6a48, 0x3a3430, 0xd8cdb8, 0xf2eee4];
    const spots = [[-1470, -1280, 0.6], [-1465, -1284, 2.2], [-1460, -1276, 4.0], [-1471, -1272, 1.4], [-1462, -1271, 5.2]];
    spots.forEach(([x, z, yaw], i) => K.animal(world, 'goat', x, z, yaw, { color: goatCols[i], grazing: i % 2 === 1 }));
    // A hay rack and a trough.
    gc.detailWood.box(g.x0 + 1, KERB, g.z0 + 2, g.x0 + 1.8, KERB + 1.1, g.z0 + 6, VH.col(0x8a6a48));
    gc.detailMatte.box(g.x0 + 1.05, KERB + 0.6, g.z0 + 2.1, g.x0 + 1.75, KERB + 1.2, g.z0 + 5.9, VH.col(0xdcc47a));
    world.physics.addBox(g.x0 + 1, 0, g.z0 + 2, g.x0 + 1.8, KERB + 1.2, g.z0 + 6, 'crate', F().SOLID);
    VH.Landmarks.sign(world, { x: g.x0 + 9, y: KERB + 1.75, z: g.z1 + 0.2, yaw: 0, w: 2.4, h: 0.6, lines: ['MEET THE GOATS', 'Please don\'t feed them crisps'], style: 'plaque' });
  }

  /** The egg stand at the gate: a little hut with an honesty box. */
  function buildEggStand(world) {
    const K = C(), WN = W();
    const { x, z } = FS.eggs;
    const ctx = world.ctxAt(x, z);
    const r = { x0: x - 1.2, x1: x + 1.2, z0: z - 0.8, z1: z + 0.8 };
    // Three closed sides and a shelf front with a pent roof.
    for (const [a, b, c2, d] of [[r.x0, r.z0, r.x1, r.z0 + 0.08], [r.x0, r.z0, r.x0 + 0.08, r.z1], [r.x1 - 0.08, r.z0, r.x1, r.z1]]) ctx.wood.box(a, KERB, b, c2, KERB + 2.0, d, VH.col(0xe8dcc0));
    ctx.wood.box(r.x0, KERB, r.z1 - 0.5, r.x1, KERB + 0.95, r.z1, VH.col(0xd8cbb0));
    WN.tiltBox(ctx.prop, x, KERB + 2.15, z + 0.1, 2.8, 0.1, 2.0, 0, -0.2, 0x3f5a48);
    // Egg boxes on the shelf, and the box itself.
    for (let i = 0; i < 6; i++) ctx.detailMatte.box(r.x0 + 0.2 + i * 0.32, KERB + 0.95, r.z1 - 0.42, r.x0 + 0.48 + i * 0.32, KERB + 1.05, r.z1 - 0.12, VH.col(0xc8b89a));
    ctx.prop.box(x + 0.6, KERB + 0.95, z - 0.6, x + 1.0, KERB + 1.25, z - 0.3, VH.col(0x2f4a3a));
    world.physics.addBox(r.x0, 0, r.z0, r.x1, KERB + 2.2, r.z1, 'crate', F().ALL);
    WN.lamp(world, x, r.z1 - 0.2, 0xffe2a0, 2.2, 0.15, KERB + 2.05);
    VH.Landmarks.sign(world, { x, y: KERB + 1.55, z: r.z1 + 0.02, yaw: 0, w: 2.1, h: 0.55, lines: ['FRESH EGGS', 'Honesty box · $2 a box'], style: 'plaque' });
    world.interactables.push({ id: 'haverly_eggs', kind: 'haverlyBuy', x, y: KERB + 1.0, z: r.z1 + 1.2, radius: 1.6, label: 'Leave $2 for a box of eggs', price: 2, heal: 10, what: 'eggs' });
  }

  /** The farm track between the shop and the patch: gravel ruts, a tractor and the hay ride parked. */
  function buildTrack(world) {
    const K = C(), WN = W();
    const t = FS.track;
    K.ground(world, t.x0, FS.z0, t.x1, FS.z1, 'track', KERB + 0.012);
    // A grass crown down the middle between the wheel ruts.
    WN.pave(world, (t.x0 + t.x1) / 2 - 1.2, FS.z0 + 3, (t.x0 + t.x1) / 2 + 1.2, FS.z1 - 3, 0xe0e8c8, 'grassTop', KERB + 0.018);
    // Field gates (open) at both lanes.
    for (const z of [FS.z0 + 2.2, FS.z1 - 2.2]) {
      const ctx = world.ctxAt((t.x0 + t.x1) / 2, z);
      for (const x of [t.x0 + 0.2, t.x1 - 0.2]) {
        ctx.detailWood.box(x - 0.15, KERB, z - 0.15, x + 0.15, KERB + 1.5, z + 0.15, VH.col(0x8a6a48));
        world.physics.addBox(x - 0.16, 0, z - 0.16, x + 0.16, KERB + 1.5, z + 0.16, 'pole', F().SOLID | F().SHOTS);
      }
    }
    K.tractor(world, (t.x0 + t.x1) / 2, -1286, 0, 0x3f7a3a);
    K.trailer(world, (t.x0 + t.x1) / 2, -1292.6, 0, { bales: true, hex: 0xb8402c, len: 5 });
    VH.Landmarks.sign(world, { x: t.x0 - 0.6, y: KERB + 1.6, z: -1296, yaw: -Math.PI / 2, w: 2.2, h: 0.8, lines: ['HAY RIDES', 'Weekends · 2 till 5'], style: 'plaque', posts: true });
  }

  /** The pick-your-own pumpkin patch: vine rows, straw paths, the giant pumpkin, scarecrows, lanterns. */
  function buildPatch(world) {
    const K = C(), WN = W();
    const p = FS.patch;
    const rng = new VH.RNG('haverly-pumpkins');
    // A fence round it, open at the field gate on the track side and on Mill Lane.
    K.postRail(world, p.x0, p.z0, p.x1, p.z0, []);
    K.postRail(world, p.x0, p.z1, p.x1, p.z1, []);
    K.postRail(world, p.x0, p.z0, p.x0, p.z1, [[p.gateZ0, p.gateZ1]]);
    K.postRail(world, p.x1, p.z0, p.x1, p.z1, [[-1248, -1243]]);
    // The gate arch.
    const gz = (p.gateZ0 + p.gateZ1) / 2;
    const ga = world.ctxAt(p.x0, gz);
    for (const z of [p.gateZ0 - 0.2, p.gateZ1 + 0.2]) {
      ga.wood.box(p.x0 - 0.2, KERB, z - 0.2, p.x0 + 0.2, KERB + 4.0, z + 0.2, VH.col(0x8a6a48));
      world.physics.addBox(p.x0 - 0.22, 0, z - 0.22, p.x0 + 0.22, KERB + 4.0, z + 0.22, 'pole', F().SOLID | F().SHOTS);
    }
    ga.wood.box(p.x0 - 0.25, KERB + 4.0, p.gateZ0 - 0.6, p.x0 + 0.25, KERB + 4.3, p.gateZ1 + 0.6, VH.col(0x8a6a48));
    VH.Landmarks.sign(world, { x: p.x0 - 0.3, y: KERB + 3.35, z: gz, yaw: -Math.PI / 2, w: 6.4, h: 1.0, lines: ['PICK YOUR OWN PUMPKINS', 'Wheelbarrows inside · Pay at the shed'], style: 'brand', colors: { bg: ['#e8761e', '#c85a12'], fg: '#2a1a0a' }, frame: 0x6b5038 });
    // The ground: tilled earth, straw paths across it.
    K.ground(world, p.x0 + 0.3, p.z0 + 0.3, p.x1 - 0.3, p.z1 - 0.3, 'earth', KERB + 0.01);
    const pathW = 3;
    const straw = 'straw';
    K.ground(world, p.x0 + 0.3, p.midZ - pathW / 2, p.x1 - 0.3, p.midZ + pathW / 2, straw, KERB + 0.02);
    K.ground(world, p.midX - pathW / 2, p.z0 + 0.3, p.midX + pathW / 2, p.z1 - 0.3, straw, KERB + 0.02);
    K.ground(world, p.x0 + 0.3, p.gateZ0, p.x0 + 8, p.gateZ1, straw, KERB + 0.021);
    // Vine rows north-south, a straw walk between each pair; pumpkins along the vines.
    const vine = VH.col(0x4f7a2e);
    const leaf = VH.col(0x4a7a2a);
    for (let x = p.x0 + 2.2; x < p.x1 - 1.5; x += 2.6) {
      if (Math.abs(x - p.midX) < pathW / 2 + 0.8) continue;
      for (const [z0, z1] of [[p.z0 + 1.5, p.midZ - pathW / 2 - 0.6], [p.midZ + pathW / 2 + 0.6, p.z1 - 1.5]]) {
        K.pieces(z0, z1, 40, (a, b) => {
          const ctx = world.ctxAt(x, (a + b) / 2);
          ctx.detailMatte.box(x - 0.45, KERB, a, x + 0.45, KERB + 0.1, b, vine, { bottom: false });
          // Leaves: low clumps along the vine.
          for (let z = a + 0.6; z < b - 0.4; z += 1.3) {
            const w = 0.35 + ((z * 13.7) % 0.3);
            ctx.detailMatte.box(x - w, KERB + 0.06, z - 0.4, x + w, KERB + 0.18 + ((z * 7.1) % 0.08), z + 0.4, leaf, { bottom: false }); // solidity: passable (knee-low)
          }
          for (let z = a + rng.range(0.5, 2.5); z < b - 0.5; z += rng.range(1.6, 3.6)) {
            const off = rng.range(-0.5, 0.5);
            const hex = rng.chance(0.08) ? 0xf2efe0 : rng.chance(0.1) ? 0xd8a020 : 0xe8761e;
            K.pumpkin(ctx, x + off, z, rng.range(0.7, 1.2), false, hex);
          }
        });
      }
      // The straw walk between this row and the next.
      K.ground(world, x + 0.75, p.z0 + 1.5, x + 1.85, p.z1 - 1.5, straw, KERB + 0.015);
    }
    // The centre: the giant pumpkin on a pallet, bales to sit on.
    const ctx = world.ctxAt(p.midX, p.midZ);
    K.ground(world, p.midX - 6, p.midZ - 6, p.midX + 6, p.midZ + 6, straw, KERB + 0.025);
    WN.solid(world, ctx.wood, p.midX - 1.4, KERB, p.midZ - 1.4, p.midX + 1.4, KERB + 0.2, p.midZ + 1.4, 0xa8885c, null, 'plank', F().SOLID);
    K.blob(ctx.prop, p.midX, KERB + 1.0, p.midZ, 1.3, 0.85, 1.15, VH.col(0xe8761e));
    ctx.prop.box(p.midX - 0.08, KERB + 1.8, p.midZ - 0.08, p.midX + 0.08, KERB + 2.2, p.midZ + 0.08, VH.col(0x5a6a2a));
    world.physics.addBox(p.midX - 1.3, 0, p.midZ - 1.15, p.midX + 1.3, KERB + 1.85, p.midZ + 1.15, 'crate', F().SOLID | F().SHOTS);
    VH.Landmarks.sign(world, { x: p.midX - 3.2, y: KERB + 1.0, z: p.midZ, yaw: -Math.PI / 2, w: 1.8, h: 0.7, lines: ['BIG BERTHA', '412 kg · a Haverly record'], style: 'plaque', posts: true });
    for (const [x0, z0, x1, z1] of [[p.midX + 3.5, p.midZ - 4, p.midX + 4.7, p.midZ - 1.6], [p.midX + 3.5, p.midZ + 1.6, p.midX + 4.7, p.midZ + 4], [p.midX - 4, p.midZ + 3.5, p.midX - 1.6, p.midZ + 4.7], [p.midX + 1.6, p.midZ - 4.7, p.midX + 4, p.midZ - 3.5]]) K.bale(world, x0, KERB, z0, x1, KERB + 0.55, z1);
    // Scarecrows over the rows.
    K.scarecrow(world, p.x0 + 30, p.z0 + 20, Math.PI / 2, 0x3f5a8a);
    K.scarecrow(world, p.x1 - 26, p.z1 - 24, -Math.PI / 2, 0x8a5a3a);
    K.scarecrow(world, p.x1 - 32, p.z0 + 26, Math.PI, 0x3f7a3a);
    // The pay shed by the gate and the wheelbarrow line.
    const sh = { x0: p.x0 + 3, x1: p.x0 + 7, z0: p.gateZ1 + 3, z1: p.gateZ1 + 6.5 };
    K.shed(world, sh, { h: 2.4, rise: 1.0, wall: 0xa8432f, roof: 0x3a3a3a, axis: 'z', style: 0 });
    const shc = world.ctxAt(sh.x0, sh.z0);
    shc.screen.box(sh.x0 + 0.8, KERB + 1.0, sh.z0 - 0.04, sh.x1 - 0.8, KERB + 1.9, sh.z0 - 0.01, VH.col(0xffe0a8, 0.85));
    WN.lamp(world, sh.x1 + 0.4, sh.z0 - 0.4, 0xffe2a0, 2.4, 0.2, KERB + 2.5);
    world.interactables.push({ id: 'haverly_pumpkin', kind: 'haverlyBuy', x: (sh.x0 + sh.x1) / 2, y: KERB + 1.0, z: sh.z0 - 1.2, radius: 1.8, label: 'Buy a pumpkin to carve', price: 4, heal: 0, what: 'pumpkin' });
    for (let i = 0; i < 5; i++) wheelbarrow(world, p.x0 + 2.2 + i * 1.3, p.gateZ0 - 3.5, Math.PI, [0x2f6f9a, 0x3f7a3a, 0xc8402c][i % 3]);
    // Jack-o'-lanterns along the main paths (they glow at night), and festoon poles over the cross path.
    for (let x = p.x0 + 6; x < p.x1 - 3; x += 9) {
      if (Math.abs(x - p.midX) < 7) continue;
      for (const s of [-1, 1]) K.pumpkin(world.ctxAt(x, p.midZ), x, p.midZ + s * (pathW / 2 + 0.25), 1.05, s > 0 ? Math.PI : 0);
    }
    for (let z = p.z0 + 5; z < p.z1 - 3; z += 9) {
      if (Math.abs(z - p.midZ) < 7) continue;
      for (const s of [-1, 1]) K.pumpkin(world.ctxAt(p.midX, z), p.midX + s * (pathW / 2 + 0.25), z, 1.05, s > 0 ? -Math.PI / 2 : Math.PI / 2);
    }
    const poles = [];
    for (let x = p.x0 + 4; x <= p.x1 - 3; x += (p.x1 - p.x0 - 7) / 5) poles.push(x);
    for (const x of poles) {
      const c = world.ctxAt(x, p.midZ);
      c.wood.box(x - 0.1, KERB, p.midZ - pathW / 2 - 0.3, x + 0.1, KERB + 3.6, p.midZ - pathW / 2 - 0.1, VH.col(0x7a5a38));
      world.physics.addBox(x - 0.12, 0, p.midZ - pathW / 2 - 0.32, x + 0.12, KERB + 3.6, p.midZ - pathW / 2 - 0.08, 'pole', F().SOLID | F().SHOTS);
    }
    for (let i = 0; i < poles.length - 1; i++) WN.festoon(world, poles[i], KERB + 3.5, p.midZ - pathW / 2 - 0.2, poles[i + 1], KERB + 3.5, p.midZ - pathW / 2 - 0.2, 0.5, [0xffb040, 0xffe2a0, 0xff7a2a], 1.6);
    world.floodlights = world.floodlights || [];
    world.floodlights.push({ x: p.midX, z: p.midZ, r: 9, y: KERB + 0.03, strength: 0.6, tint: [1.3, 0.8, 0.4] });
    // A heap of picked pumpkins by the shed for those who don't want to pick.
    for (let i = 0; i < 14; i++) K.pumpkin(world.ctxAt(sh.x1 + 1.5, sh.z1), sh.x1 + 1 + (i % 4) * 0.7, sh.z0 + 0.4 + Math.floor(i / 4) * 0.7, 1.15, false);
    world.physics.addBox(sh.x1 + 0.6, 0, sh.z0, sh.x1 + 3.45, KERB + 0.6, sh.z0 + 2.95, 'crate', F().SOLID);
  }

  /** A wheelbarrow (solid, knee-high). */
  function wheelbarrow(world, x, z, yaw, hex) {
    const ctx = world.ctxAt(x, z);
    const K = C();
    const P = K.frame(x, z, yaw);
    const [tx, tz] = P(0.1, 0);
    ctx.detail.orientedBox(tx, tz, 0.35, 0.5, yaw, KERB + 0.35, KERB + 0.7, VH.col(hex));
    const [wx, wz] = P(0.65, 0);
    K.wheel(ctx.detail, wx, KERB + 0.22, wz, 0.22, 0.08, yaw, VH.col(0x2b2d30));
    for (const r of [-0.28, 0.28]) {
      const [hx, hz] = P(-0.6, r);
      ctx.detail.orientedBox(hx, hz, 0.03, 0.3, yaw, KERB + 0.55, KERB + 0.6, VH.col(0x6b5038));
      const [lx, lz] = P(-0.2, r);
      ctx.detail.orientedBox(lx, lz, 0.03, 0.03, yaw, KERB, KERB + 0.4, VH.col(0x2b2d30));
    }
    const [cx, cz] = P(0, 0);
    world.physics.addOrientedBox(cx, cz, 0.4, 0.92, yaw, 0, KERB + 0.72, 'metal', F().SOLID | F().SHOTS);
  }

  // ------------------------------------------------------------ corn maze
  // The maze plot (-1582..-1306, -1422..-1325): Hayrick Lane south,
  // Westfield Road west, Mill Lane east, the approach-light strip north.
  // Runway 09's approach band (z < -1395) takes nothing taller than 3 m.
  const MZ = {
    x0: -1582, x1: -1306, z0: -1422, z1: -1325,
    low: -1395,
    cell: 4.4, wall: 1.4, cols: 48, rows: 20,
    mx0: -1521.5, mz0: -1417.5, // the maze grid's north-west corner
    centre: { c0: 22, c1: 25, r0: 8, r1: 11 },
    entryRow: 10, exitRow: 3,
    yard: { x0: -1580.4, x1: -1524 },
    hut: { x0: -1548, x1: -1541, z0: -1356, z1: -1351 },
    tower: { x0: -1538, x1: -1531, z0: -1350, z1: -1343, y: KERB + 4.5 },
  };
  MZ.mx1 = MZ.mx0 + MZ.cols * MZ.cell;
  MZ.mz1 = MZ.mz0 + MZ.rows * MZ.cell;
  MZ.cx0 = MZ.mx0 + MZ.centre.c0 * MZ.cell;
  MZ.cx1 = MZ.mx0 + (MZ.centre.c1 + 1) * MZ.cell;
  MZ.cz0 = MZ.mz0 + MZ.centre.r0 * MZ.cell;
  MZ.cz1 = MZ.mz0 + (MZ.centre.r1 + 1) * MZ.cell;
  MZ.ccx = (MZ.cx0 + MZ.cx1) / 2;
  MZ.ccz = (MZ.cz0 + MZ.cz1) / 2;
  MZ.entryZ = MZ.mz0 + (MZ.entryRow + 0.5) * MZ.cell;
  MZ.exitZ = MZ.mz0 + (MZ.exitRow + 0.5) * MZ.cell;

  /**
   * The maze's walls: a depth-first maze over the grid (the centre clearing
   * counts as one cell, so it is reached), then a few extra gaps so there is
   * more than one way round. h[r][c]: the wall along the north edge of row r
   * (r = rows is the south edge); v[r][c]: the wall along the west edge of
   * column c. true = corn.
   */
  function mazeWalls() {
    const { cols, rows, centre: K } = MZ;
    const rng = new VH.RNG('haverly-corn-maze');
    const h = [], v = [];
    for (let r = 0; r <= rows; r++) h.push(new Array(cols).fill(true));
    for (let r = 0; r < rows; r++) v.push(new Array(cols + 1).fill(true));
    const inC = (c, r) => c >= K.c0 && c <= K.c1 && r >= K.r0 && r <= K.r1;
    const node = (c, r) => (inC(c, r) ? -1 : r * cols + c);
    // The clearing: no walls inside it.
    for (let r = K.r0; r <= K.r1; r++) for (let c = K.c0; c <= K.c1; c++) {
      if (r > K.r0) h[r][c] = false;
      if (c > K.c0) v[r][c] = false;
    }
    const cellsOf = (n) => {
      if (n !== -1) return [[n % cols, Math.floor(n / cols)]];
      const out = [];
      for (let r = K.r0; r <= K.r1; r++) for (let c = K.c0; c <= K.c1; c++) out.push([c, r]);
      return out;
    };
    const seen = new Set();
    const start = node(0, MZ.entryRow);
    const stack = [start];
    seen.add(start);
    while (stack.length) {
      const n = stack[stack.length - 1];
      const opts = [];
      for (const [c, r] of cellsOf(n)) {
        for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const c2 = c + dc, r2 = r + dr;
          if (c2 < 0 || r2 < 0 || c2 >= cols || r2 >= rows) continue;
          const n2 = node(c2, r2);
          if (n2 === n || seen.has(n2)) continue;
          opts.push([c, r, c2, r2, n2]);
        }
      }
      if (!opts.length) {
        stack.pop();
        continue;
      }
      const [c, r, c2, r2, n2] = opts[rng.int(0, opts.length - 1)];
      if (c2 !== c) v[r][Math.max(c, c2)] = false;
      else h[Math.max(r, r2)][c] = false;
      seen.add(n2);
      stack.push(n2);
    }
    // A few loops (never through the clearing's edge, so it keeps its own ways in).
    for (let i = 0; i < 46; i++) {
      const c = rng.int(1, cols - 1), r = rng.int(1, rows - 1);
      if (rng.chance(0.5)) {
        if (!inC(c, r) && !inC(c - 1, r)) v[r][c] = false;
      } else if (!inC(c, r) && !inC(c, r - 1)) h[r][c] = false;
    }
    // The way in (west) and the way out (east).
    v[MZ.entryRow][0] = false;
    v[MZ.exitRow][cols] = false;
    return { h, v };
  }

  const STALK_LIGHT = VH.col(0x8ab84e), STALK_DARK = VH.col(0x3e6424), STALK_MID = VH.col(0xa8b860), STALK_FOOT = VH.col(0x3a4a22);

  /** A wall of standing corn from (x0, z0) to (x1, z1) (an axis-aligned box), with tasselled tops. Solid. */
  function cornWall(world, x0, z0, x1, z1, rng) {
    const alongX = x1 - x0 >= z1 - z0;
    const stalk = VH.col(0x5e8a34);
    const tassel = VH.col(0xc8b85a);
    C().pieces(alongX ? x0 : z0, alongX ? x1 : z1, 60, (a, b) => {
      const bx = alongX ? [a, z0, b, z1] : [x0, a, x1, b];
      const ctx = world.ctxAt((bx[0] + bx[2]) / 2, (bx[1] + bx[3]) / 2);
      const H = 2.25 + rng.range(0, 0.2);
      ctx.hedge.box(bx[0], KERB, bx[1], bx[2], KERB + H, bx[3], VH.colMul(stalk, 0.92 + rng.range(0, 0.14)));
      // Stalks: thin light and dark stripes up both long faces, and a dark band of shade at the foot.
      const y0 = KERB, y1 = KERB + H - 0.08, o = 0.012;
      const S = ctx.detailMatte;
      for (let p = a + 0.15, k = 0; p < b - 0.12; p += 0.38, k++) {
        const col = k % 3 === 0 ? STALK_LIGHT : k % 3 === 1 ? STALK_DARK : STALK_MID;
        const w = 0.07 + (k % 2) * 0.04;
        if (alongX) {
          S.quad([p, y0, bx[3] + o], [p + w, y0, bx[3] + o], [p + w, y1, bx[3] + o], [p, y1, bx[3] + o], [0, 0, 1], col); // solidity: passable (on the wall's face)
          S.quad([p + w, y0, bx[1] - o], [p, y0, bx[1] - o], [p, y1, bx[1] - o], [p + w, y1, bx[1] - o], [0, 0, -1], col); // solidity: passable
        } else {
          S.quad([bx[2] + o, y0, p + w], [bx[2] + o, y0, p], [bx[2] + o, y1, p], [bx[2] + o, y1, p + w], [1, 0, 0], col); // solidity: passable
          S.quad([bx[0] - o, y0, p], [bx[0] - o, y0, p + w], [bx[0] - o, y1, p + w], [bx[0] - o, y1, p], [-1, 0, 0], col); // solidity: passable
        }
      }
      S.box(bx[0] - 0.015, KERB, bx[1] - 0.015, bx[2] + 0.015, KERB + 0.35, bx[3] + 0.015, STALK_FOOT, { skip: { top: true } }); // solidity: passable (on the wall's face)
      // Tassels: a ragged band along the top in steps of about 2 m.
      for (let p = a; p < b - 0.05; p += 2.1) {
        const q = Math.min(b, p + 2.1);
        const t = alongX ? [p, z0 + 0.12, q, z1 - 0.12] : [x0 + 0.12, p, x1 - 0.12, q];
        ctx.detailMatte.box(t[0], KERB + H - 0.05, t[1], t[2], KERB + H + 0.18 + rng.range(0, 0.22), t[3], tassel, { bottom: false });
      }
      world.physics.addBox(bx[0], 0, bx[1], bx[2], KERB + H + 0.4, bx[3], 'hedge', F().SOLID | F().SHOTS | F().CAMERA);
    });
  }

  function buildCornMaze(world) {
    const K = C(), WN = W();
    const M = MZ, s = M.cell, t = M.wall / 2;
    const rng = new VH.RNG('haverly-maze-dress');
    // The ground: trodden straw over the maze, gravel in the yard, the pavement edge kept.
    K.ground(world, M.mx0 - 2, M.z0 + 1.6, M.x1 - 1.6, M.z1 - 1.6, 'straw', KERB + 0.01);
    K.ground(world, M.yard.x0, M.z0 + 1.6, M.mx0 - 2, M.z1 - 1.6, 'meadow', KERB + 0.008);
    world.addLawn(M.yard.x0, M.z0 + 1.6, M.mx0 - 2, M.z1 - 1.6);
    K.ground(world, M.hut.x0 - 4, M.hut.z0 - 3, M.tower.x1 + 3, M.z1 - 1.6, 'gravel', KERB + 0.012);
    K.ground(world, -1562, M.z1 - 12, -1548, M.z1 - 1.6, 'gravel', KERB + 0.012);
    world.addLawn(M.mx0, M.mz0, M.mx1, M.mz1);
    // The walls, joined into runs along each grid line.
    const { h, v } = mazeWalls();
    for (let r = 0; r <= M.rows; r++) {
      const z = M.mz0 + r * s;
      for (let c = 0; c < M.cols; c++) {
        if (!h[r][c]) continue;
        let c1 = c;
        while (c1 + 1 < M.cols && h[r][c1 + 1]) c1++;
        cornWall(world, M.mx0 + c * s - t, z - t, M.mx0 + (c1 + 1) * s + t, z + t, rng);
        c = c1;
      }
    }
    for (let c = 0; c <= M.cols; c++) {
      const x = M.mx0 + c * s;
      for (let r = 0; r < M.rows; r++) {
        if (!v[r][c]) continue;
        let r1 = r;
        while (r1 + 1 < M.rows && v[r1 + 1][c]) r1++;
        cornWall(world, x - t, M.mz0 + r * s + t, x + t, M.mz0 + (r1 + 1) * s - t, rng);
        r = r1;
      }
    }
    // Standing corn between the maze and the lanes (north, east and south), open at the way out.
    const e = 1.6;
    cornWall(world, M.mx0 - t, M.z0 + e + 0.6, M.x1 - e - 0.6, M.mz0 - t, rng);
    cornWall(world, M.mx1 + t, M.mz0 - t, M.x1 - e - 0.6, M.exitZ - s / 2 + t, rng);
    cornWall(world, M.mx1 + t, M.exitZ + s / 2 - t, M.x1 - e - 0.6, M.mz1 + t, rng);
    cornWall(world, M.mx0 - t, M.mz1 + t, M.x1 - e - 0.6, M.z1 - e - 0.6, rng);
    // The way out onto Mill Lane: a trodden path through the standing corn, a low sign (the approach band).
    K.ground(world, M.mx1, M.exitZ - s / 2 + t, M.x1, M.exitZ + s / 2 - t, 'track', KERB + 0.016);
    VH.Landmarks.sign(world, { x: M.x1 - 2.2, y: KERB + 1.7, z: M.exitZ - s / 2 - 0.4, yaw: Math.PI / 2, w: 1.6, h: 0.6, lines: ['MAZE EXIT', 'Well done!'], style: 'plaque', posts: true });

    buildMazeYard(world);
    buildMazeCentre(world);
  }

  /** The yard: the ticket hut, the lookout tower, the way in, bales and benches, the big sign. */
  function buildMazeYard(world) {
    const K = C(), WN = W();
    const M = MZ;
    // A hedge along Westfield Road with a gap for people (and one for a farm gate).
    const hx = M.x0 + 2.2;
    K.hedge(world, hx, M.z0 + 2.2, hx, M.z1 - 2.2, [[-1362, -1354]], 1.25, 1.0);
    K.hedge(world, M.x0 + 2.7, M.z1 - 2.2, M.mx0 - 2.2, M.z1 - 2.2, [[-1560, -1550]], 1.25, 1.0);
    K.hedge(world, M.x0 + 2.7, M.z0 + 2.2, M.mx0 - 2.2, M.z0 + 2.2, [], 1.25, 1.0);
    // The ticket hut.
    const hut = M.hut;
    const ctx = K.shed(world, hut, { h: 2.6, rise: 1.2, wall: 0xa8432f, roof: 0x3a3a3a, axis: 'x', style: 0 });
    ctx.screen.box(hut.x0 + 1.5, KERB + 1.0, hut.z1 + 0.01, hut.x1 - 1.5, KERB + 1.9, hut.z1 + 0.04, VH.col(0xffe0a8, 0.85));
    WN.solid(world, ctx.wood, hut.x0 + 1, KERB, hut.z1, hut.x1 - 1, KERB + 1.0, hut.z1 + 0.6, 0x9a7448, null, 'crate', F().SOLID | F().SHOTS);
    VH.Landmarks.sign(world, { x: (hut.x0 + hut.x1) / 2, y: KERB + 2.35, z: hut.z1 + 0.06, yaw: 0, w: 3.6, h: 0.55, lines: ['MAZE TICKETS · FREE TODAY'], style: 'plaque' });
    WN.lamp(world, hut.x1 + 0.5, hut.z1 + 0.5, 0xffe2a0, 2.4, 0.2, KERB + 2.7);
    // The lookout: a timber platform on posts with a stair, railings round the top.
    const T = M.tower;
    const tc = world.ctxAt((T.x0 + T.x1) / 2, (T.z0 + T.z1) / 2);
    for (const [x, z] of [[T.x0, T.z0], [T.x1, T.z0], [T.x0, T.z1], [T.x1, T.z1]]) {
      tc.wood.box(x - 0.18, 0, z - 0.18, x + 0.18, T.y + 1.1, z + 0.18, VH.col(0xb08a62));
      world.physics.addBox(x - 0.2, 0, z - 0.2, x + 0.2, T.y + 1.1, z + 0.2, 'pole', F().SOLID | F().SHOTS);
    }
    WN.deck(world, tc.wood, T.x0 - 0.2, T.z0 - 0.2, T.x1 + 0.2, T.z1 + 0.2, T.y, 0xc8a070, 'plank', 0.25);
    WN.deckRails(world, T.x0 - 0.2, T.z0 - 0.2, T.x1 + 0.2, T.z1 + 0.2, T.y, [{ side: 's', a0: T.x0 - 0.2, a1: T.x0 + 1.4 }], 0x8a6a48);
    // Its roof (a little hat so it reads as a lookout).
    WN.gable(tc.prop, T.x0 - 0.5, T.z0 - 0.5, T.x1 + 0.5, T.z1 + 0.5, T.y + 2.6, 1.3, 'x', 0x3a3a3a, 0x8a6a48);
    for (const [x, z] of [[T.x0, T.z0], [T.x1, T.z0], [T.x0, T.z1], [T.x1, T.z1]]) tc.wood.box(x - 0.1, T.y + 1.1, z - 0.1, x + 0.1, T.y + 2.6, z + 0.1, VH.col(0xb08a62));
    // The stair runs up the west side from the south, to the gap in the railing.
    WN.stairs(world, tc.wood, T.x0 + 0.6, T.z1 + 8.6, 'n', 8.4, 1.4, KERB, T.y, 0xb08a62, { railHex: 0x8a6a48 });
    world.addProp('streetlight', T.x1 + 1.5, KERB, T.z1 + 1.5, 0, 1);
    // The way in: a path from the yard to the maze's west door, under an arch of corn sheaves.
    const ez = M.entryZ;
    K.ground(world, M.yard.x0 + 6, ez - 1.5, M.mx0, ez + 1.5, 'straw', KERB + 0.016);
    const ax = M.mx0 - 3;
    for (const z of [ez - 2.1, ez + 2.1]) {
      tc.hedge.box(ax - 0.5, KERB, z - 0.5, ax + 0.5, KERB + 3.6, z + 0.5, VH.col(0xc8b060));
      world.physics.addBox(ax - 0.5, 0, z - 0.5, ax + 0.5, KERB + 3.6, z + 0.5, 'hedge', F().SOLID | F().SHOTS);
    }
    tc.wood.box(ax - 0.4, KERB + 3.6, ez - 2.7, ax + 0.4, KERB + 3.9, ez + 2.7, VH.col(0x8a6a48));
    VH.Landmarks.sign(world, { x: ax - 0.45, y: KERB + 3.05, z: ez, yaw: -Math.PI / 2, w: 3.4, h: 0.8, lines: ['IN YOU GO', 'Find the scarecrow · ring the bell'], style: 'plaque' });
    // Bales to sit on, picnic tables, a rules board, a hay trailer parked in the low corner.
    for (const [x, z] of [[-1572, -1372], [-1572, -1364], [-1564, -1340], [-1556, -1340]]) K.picnicTable(world, x, z, 0);
    for (let i = 0; i < 6; i++) {
      const x = -1556 + (i % 3) * 3.2, z = -1384 + Math.floor(i / 3) * 6;
      K.bale(world, x, KERB, z, x + 2.2, KERB + 0.55, z + 1.1);
    }
    // A stack of round bales and the trailer (the approach band: under 3 m).
    for (let i = 0; i < 5; i++) VH.Buildings.hayBale(world.ctxAt(-1570, -1410), -1574 + i * 1.8, -1412, KERB, 1);
    K.trailer(world, -1558, -1408, Math.PI / 2, { bales: true, hex: 0x2f6f9a });
    VH.Landmarks.sign(world, { x: -1560, y: KERB + 1.5, z: -1361, yaw: 0, w: 2.6, h: 1.2, lines: ['MAZE RULES', 'Stay on the paths · No shortcuts', 'Lost? Wave at the lookout'], style: 'info', posts: true });
    // The name, on Westfield Road and on Hayrick Lane.
    VH.Landmarks.sign(world, { x: M.x0 + 4.4, y: KERB + 2.6, z: -1366, yaw: -Math.PI / 2, w: 7, h: 1.6, lines: ['HAVERLY CORN MAZE', 'Four acres of corn · Can you find the middle?'], style: 'brand', posts: true, colors: { bg: ['#e0b12e', '#c8961c'], fg: '#2a1a0a' }, frame: 0x6b5038 });
    VH.Landmarks.sign(world, { x: -1555, y: KERB + 2.2, z: M.z1 - 3.8, yaw: 0, w: 5, h: 1.2, lines: ['HAVERLY CORN MAZE', 'Way in · Lookout'], style: 'brand', posts: true, colors: { bg: ['#e0b12e', '#c8961c'], fg: '#2a1a0a' }, frame: 0x6b5038 });
    for (const [x, z] of [[-1576, -1350], [-1576, -1385], [-1532, -1366]]) world.addProp('streetlight', x, KERB, z, Math.PI / 2, 1);
    // Corn shocks (stooks of cut stalks tied at the waist) round the yard.
    for (const [x, z] of [[-1566, -1352], [-1569, -1380], [-1548, -1392], [-1534, -1380], [-1530, -1356], [-1574, -1336]]) {
      const c = world.ctxAt(x, z);
      c.hedge.cylinder(x, KERB, z, 0.75, 0.32, 1.3, 8, VH.col(0xc8b060), false);
      c.hedge.cylinder(x, KERB + 1.3, z, 0.32, 0.05, 1.0, 8, VH.col(0xd8c070), true);
      c.detailMatte.cylinder(x, KERB + 1.2, z, 0.36, 0.36, 0.12, 8, VH.col(0x8a6a3a), false);
      C().pumpkin(c, x + 0.9, z + 0.4, 1.1, false);
      world.physics.addOrientedBox(x, z, 0.62, 0.62, Math.PI / 8, 0, KERB + 1.9, 'hedge', F().SOLID | F().SHOTS);
    }
  }

  /** The middle: a straw clearing, the scarecrow on his platform, the bell, the golden cob. */
  function buildMazeCentre(world) {
    const K = C(), WN = W();
    const M = MZ;
    const cx = M.ccx, cz = M.ccz;
    const ctx = world.ctxAt(cx, cz);
    K.ground(world, M.cx0 + 0.7, M.cz0 + 0.7, M.cx1 - 0.7, M.cz1 - 0.7, 'dirt', KERB + 0.016);
    // The platform (Jay steps up onto it) and the scarecrow.
    WN.solid(world, ctx.wood, cx - 3, KERB, cz - 3, cx + 3, KERB + 0.45, cz + 3, 0xc8a070, null, 'plank', F().SOLID | F().SHOTS);
    K.scarecrow(world, cx, cz - 1.2, 0, 0xc8402c, KERB + 0.45);
    // The bell on a gallows post.
    const bx = cx + 2, bz = cz + 1.6;
    ctx.wood.box(bx - 0.1, KERB + 0.45, bz - 0.1, bx + 0.1, KERB + 3.0, bz + 0.1, VH.col(0x8a6a48));
    ctx.wood.box(bx - 0.1, KERB + 2.85, bz - 0.1, bx - 1.0, KERB + 3.0, bz + 0.1, VH.col(0x8a6a48));
    ctx.prop.cylinder(bx - 0.8, KERB + 2.35, bz, 0.26, 0.14, 0.5, 10, VH.col(0xc8a038), true);
    world.physics.addBox(bx - 0.12, 0, bz - 0.12, bx + 0.12, KERB + 3.0, bz + 0.12, 'pole', F().SOLID | F().SHOTS);
    world.interactables.push({ id: 'haverly_maze_bell', kind: 'haverlyMaze', x: bx - 0.8, y: KERB + 1.2, z: bz + 0.9, radius: 2.2, label: 'Ring the bell' });
    // The golden cob on a plinth (it glows).
    const gx = cx - 2, gz = cz + 1.6;
    WN.solid(world, ctx.wood, gx - 0.35, KERB + 0.45, gz - 0.35, gx + 0.35, KERB + 1.35, gz + 0.35, 0x6b5038, null, 'crate', F().SOLID | F().SHOTS);
    K.blob(ctx.screen, gx, KERB + 1.75, gz, 0.16, 0.42, 0.16, VH.col(0xffc838, 1.5));
    for (const s of [-1, 1]) ctx.detailMatte.orientedBox(gx + s * 0.12, gz, 0.04, 0.12, s * 0.5, KERB + 1.35, KERB + 1.95, VH.col(0x6a9a3a));
    world.physics.addBox(gx - 0.2, KERB + 1.35, gz - 0.2, gx + 0.2, KERB + 2.2, gz + 0.2, 'crate', F().SOLID | F().SHOTS);
    VH.Landmarks.sign(world, { x: cx, y: KERB + 1.3, z: cz + 3.05, yaw: 0, w: 2.6, h: 0.7, lines: ['YOU FOUND THE MIDDLE!', 'Ring the bell'], style: 'plaque' });
    // Bales round the clearing, a lamp.
    for (const [x0, z0, x1, z1] of [[M.cx0 + 1.5, cz - 4, M.cx0 + 2.6, cz - 1.5], [M.cx0 + 1.5, cz + 1.5, M.cx0 + 2.6, cz + 4], [M.cx1 - 2.6, cz - 4, M.cx1 - 1.5, cz - 1.5], [M.cx1 - 2.6, cz + 1.5, M.cx1 - 1.5, cz + 4]]) K.bale(world, x0, KERB, z0, x1, KERB + 0.55, z1);
    world.addProp('streetlight', M.cx0 + 1.5, KERB, M.cz0 + 1.5, Math.PI / 4, 1);
    world.floodlights = world.floodlights || [];
    world.floodlights.push({ x: cx, z: cz, r: 8, y: KERB + 0.03, strength: 0.8 });
  }

  // ------------------------------------------------------------ wind farm
  // The wind farm plot (-1067..381, -1797..-1705): Haverly Lane south, the
  // world's edge hedge north. Eleven turbines in a line, 65 m to the blade
  // tips (the airport wants them under 70), all facing the south-west wind.
  const WF = {
    x0: -1067, x1: 381, z0: -1797, z1: -1705,
    tz: -1760, // the turbines' line
    xs: [-990, -864, -738, -612, -486, -360, -234, -108, 18, 144, 270],
    hub: 45, blade: 20,
    yaw: -1.18, // the rotors face west-south-west
    track: { z0: -1741, z1: -1736.5 },
    spurs: [-864, -360, 144],
    sub: { x0: 300, x1: 372, z0: -1790, z1: -1748 },
    view: { x0: -1062, x1: -1012, z0: -1745, z1: -1709 },
  };
  WF.hubY = KERB + 0.6 + WF.hub;

  /** The rotor (hub, spinner and three blades, red tips) in its own frame: the axis is +Z, blades in the XY plane. */
  function rotorGeometry() {
    const b = new VH.GeometryBuilder();
    const white = VH.col(0xf2f4f4), red = VH.col(0xc8302c);
    b.cylinder(0, -0.9, 0, 1.25, 0.15, 2.8, 12, white, true); // the spinner (along Y for now)
    b.cylinder(0, -1.5, 0, 1.25, 1.25, 0.6, 12, white, false);
    const L = WF.blade;
    for (let k = 0; k < 3; k++) {
      const a = (k * Math.PI * 2) / 3;
      const seg = (r0, r1, half, thick, col) => {
        const rm = (r0 + r1) / 2;
        b.orientedBox(Math.sin(a) * rm, Math.cos(a) * rm, half, (r1 - r0) / 2, a, -thick, thick, col);
      };
      seg(0.8, 5, 0.75, 0.32, white);
      seg(5, 11, 0.6, 0.22, white);
      seg(11, L - 2.2, 0.42, 0.14, white);
      seg(L - 2.2, L, 0.28, 0.1, red);
    }
    const g = b.build();
    g.rotateX(Math.PI / 2); // Y (the axis) becomes Z
    return g;
  }

  /** Three small lights at the blade tips (the blinking aircraft-warning material). */
  function tipGeometry() {
    const parts = [];
    for (let k = 0; k < 3; k++) {
      const a = (k * Math.PI * 2) / 3;
      const g = new THREE.SphereGeometry(0.42, 6, 4);
      g.translate(Math.sin(a) * (WF.blade - 0.1), Math.cos(a) * (WF.blade - 0.1), 0);
      parts.push(g);
    }
    const out = THREE.BufferGeometryUtils ? THREE.BufferGeometryUtils.mergeBufferGeometries(parts) : null;
    if (out) return out;
    // No utils: build by hand.
    const pos = [], idx = [];
    for (const g of parts) {
      const base = pos.length / 3;
      const p = g.attributes.position.array;
      for (let i = 0; i < p.length; i++) pos.push(p[i]);
      const ix = g.index.array;
      for (let i = 0; i < ix.length; i++) idx.push(base + ix[i]);
    }
    const m = new THREE.BufferGeometry();
    m.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    m.setIndex(idx);
    m.computeVertexNormals();
    return m;
  }

  function buildWindFarm(world) {
    const K = C(), WN = W();
    const P = WF;
    const e = 1.6;
    // Sheep pasture under the turbines, a fence along the lane, the access track and its spurs.
    K.ground(world, P.x0, P.z0, P.x1, P.z1 - e, 'meadow', KERB + 0.006);
    world.addLawn(P.x0, P.z0, P.x1, P.z1 - e);
    const fz = P.z1 - e - 0.4;
    const gaps = P.spurs.map((x) => [x - 3.5, x + 3.5]).concat([[P.view.x0 + 14, P.view.x0 + 24]]);
    K.postRail(world, P.x0 + 0.5, fz, P.x1 - 0.5, fz, gaps);
    K.ground(world, P.view.x1, P.track.z0, P.sub.x0, P.track.z1, 'gravel', KERB + 0.014);
    for (const x of P.spurs) {
      K.ground(world, x - 3, P.track.z1, x + 3, P.z1, 'gravel', KERB + 0.014);
      // A cattle grid and gateposts where each spur meets the lane.
      const c = world.ctxAt(x, fz);
      for (let k = -2.6; k <= 2.6; k += 0.4) c.detail.box(x + k - 0.05, KERB + 0.02, fz - 1.2, x + k + 0.05, KERB + 0.06, fz + 1.2, VH.col(0x6a6e72));
      for (const s of [-1, 1]) {
        c.detailWood.box(x + s * 3.5 - 0.15, KERB, fz - 0.15, x + s * 3.5 + 0.15, KERB + 1.5, fz + 0.15, VH.col(0xa8885c));
        world.physics.addBox(x + s * 3.5 - 0.16, 0, fz - 0.16, x + s * 3.5 + 0.16, KERB + 1.5, fz + 0.16, 'pole', F().SOLID | F().SHOTS);
      }
    }
    // The turbines: a gravel pad, a plinth, a tapering white tower, the nacelle (the rotors spin in WindFarmLife).
    const white = VH.col(0xeef0f0);
    const fx = Math.sin(P.yaw), fzv = Math.cos(P.yaw);
    for (const x of P.xs) {
      const z = P.tz;
      const ctx = world.ctxAt(x, z);
      K.ground(world, x - 9, z - 9, x + 9, P.track.z0, 'gravel', KERB + 0.012);
      ctx.concrete.cylinder(x, KERB, z, 3.4, 3.4, 0.6, 16, VH.col(0xc8c4bc), true);
      ctx.prop.cylinder(x, KERB + 0.6, z, 2.2, 1.35, P.hub - 1.4, 16, white, true);
      // A green band at the foot, the door and its steps on the track side.
      ctx.prop.cylinder(x, KERB + 0.6, z, 2.22, 2.16, 1.6, 16, VH.col(0x5a8a6a), false);
      ctx.prop.box(x - 0.55, KERB + 0.9, z + 2.05, x + 0.55, KERB + 3.0, z + 2.3, VH.col(0x6a7078));
      ctx.concrete.box(x - 0.9, KERB, z + 3.4, x + 0.9, KERB + 0.6, z + 4.6, VH.col(0xc8c4bc));
      world.physics.addBox(x - 0.9, 0, z + 3.4, x + 0.9, KERB + 0.6, z + 4.6, 'kerb', F().SOLID);
      ctx.concrete.box(x - 0.9, KERB, z + 4.6, x + 0.9, KERB + 0.3, z + 5.2, VH.col(0xc8c4bc));
      world.physics.addBox(x - 0.9, 0, z + 4.6, x + 0.9, KERB + 0.3, z + 5.2, 'kerb', F().SOLID);
      // The plinth and the tower (round colliders, all the way up).
      for (let k = 0; k < 8; k++) world.physics.addOrientedBox(x, z, 3.4 * 0.991, 3.4 * 0.197, (k * Math.PI) / 8, 0, KERB + 0.6, 'kerb', F().ALL);
      for (let k = 0; k < 8; k++) world.physics.addOrientedBox(x, z, 2.2 * 0.991, 2.2 * 0.197, (k * Math.PI) / 8, KERB + 0.6, KERB + 0.6 + P.hub - 1.4, 'building', F().ALL);
      // The transformer kiosk beside it.
      WN.solid(world, ctx.prop, x + 5, KERB, z + 1, x + 7.4, KERB + 2.1, z + 3.2, 0x4f7a5a, null, 'metal');
      ctx.prop.box(x + 4.98, KERB + 1.2, z + 1.6, x + 5, KERB + 1.6, z + 2.6, VH.col(0xe0b12e));
      // The nacelle: a long box behind the hub, facing the wind.
      const ny = P.hubY;
      const nx = x - fx * 3.4, nz = z - fzv * 3.4;
      ctx.prop.orientedBox(nx, nz, 1.5, 4.4, P.yaw, ny - 1.6, ny + 1.6, white);
      ctx.prop.orientedBox(nx - fx * 0.6, nz - fzv * 0.6, 1.3, 3.2, P.yaw, ny + 1.6, ny + 1.85, VH.col(0xd8dcdc));
      world.physics.addOrientedBox(nx, nz, 1.5, 4.4, P.yaw, ny - 1.6, ny + 1.85, 'metal', F().ALL);
      // The aircraft-warning light on top (blinks red, day and night).
      world.beacons.push({ x: nx - fx * 2.5, y: ny + 2.2, z: nz - fzv * 2.5 });
    }
    // Sheep: little flocks between the towers.
    const rng = new VH.RNG('haverly-windfarm-sheep');
    for (let i = 0; i < P.xs.length - 1; i += 2) {
      const cx = (P.xs[i] + P.xs[i + 1]) / 2;
      const n = rng.int(6, 10);
      for (let k = 0; k < n; k++) {
        const x = cx + rng.range(-34, 34), z = rng.range(P.z0 + 8, P.track.z0 - 6);
        K.animal(world, 'sheep', x, z, rng.range(0, Math.PI * 2), { color: rng.pick([0xf2eee4, 0xe8e2d4, 0xf6f2ea]), grazing: rng.chance(0.65) });
      }
      // A trough and a round feeder of hay.
      VH.Buildings.hayBale(world.ctxAt(cx, P.z0 + 20), cx + rng.range(-10, 10), P.z0 + 20, KERB, 1);
    }
    buildSubstation(world);
    buildViewpoint(world);
  }

  /** The substation at the east end: a palisade, transformers, gantries, the control building. */
  function buildSubstation(world) {
    const K = C(), WN = W();
    const S = WF.sub;
    K.ground(world, S.x0, S.z0, S.x1, S.z1, 'gravel', KERB + 0.014);
    K.ground(world, S.x0 + 20, S.z1, S.x0 + 28, WF.z1, 'gravel', KERB + 0.014);
    const gate = [[S.x0 + 20, S.x0 + 28]];
    WN.fence(world, S.x0, S.z0, S.x1, S.z0, [], 'chain', 2.4);
    WN.fence(world, S.x0, S.z1, S.x1, S.z1, gate, 'chain', 2.4);
    WN.fence(world, S.x0, S.z0, S.x0, S.z1, [], 'chain', 2.4);
    WN.fence(world, S.x1, S.z0, S.x1, S.z1, [], 'chain', 2.4);
    // A sliding gate (closed, the substation is not for visitors).
    const gc = world.ctxAt(S.x0 + 24, S.z1);
    gc.prop.box(S.x0 + 20, KERB + 0.1, S.z1 - 0.06, S.x0 + 28, KERB + 2.2, S.z1 + 0.06, VH.col(0x7d838a));
    world.physics.addBox(S.x0 + 20, 0, S.z1 - 0.12, S.x0 + 28, KERB + 2.3, S.z1 + 0.12, 'fence', F().SOLID | F().CAMERA);
    VH.Landmarks.sign(world, { x: S.x0 + 14, y: KERB + 1.7, z: S.z1 + 0.15, yaw: 0, w: 3.2, h: 0.9, lines: ['DANGER OF DEATH', 'Keep out · Haverly Wind Farm substation'], style: 'brand', colors: { bg: ['#f2d22e', '#e0c018'], fg: '#1a1a1a' }, frame: 0x2b2f35 });
    // The control building.
    const cb = { x0: S.x1 - 22, x1: S.x1 - 4, z0: S.z1 - 12, z1: S.z1 - 4 };
    WN.building(world, cb.x0, cb.z0, cb.x1, cb.z1, 3.6, { wall: 0xc8c0b0, roof: 0x6b6e72, style: 1, bay: 3.6, floorH: 3.6, ww: 0.35, wh: 0.4, parapet: 0.4 });
    WN.lamp(world, (cb.x0 + cb.x1) / 2, cb.z1 + 0.3, 0xfff1c8, 2.4, 0.2, KERB + 3.0);
    // Transformers (finned boxes with bushings) and the steel gantries over them.
    for (let i = 0; i < 2; i++) {
      const tx = S.x0 + 10 + i * 18, tz = S.z0 + 12;
      const c = world.ctxAt(tx, tz);
      WN.solid(world, c.prop, tx - 3, KERB, tz - 2.2, tx + 3, KERB + 3.4, tz + 2.2, 0x6a7a6a, null, 'metal');
      for (let k = -2.6; k <= 2.6; k += 0.5) c.prop.box(tx + k - 0.06, KERB + 0.3, tz + 2.2, tx + k + 0.06, KERB + 3.0, tz + 2.9, VH.col(0x5a6a5a));
      world.physics.addBox(tx - 3, 0, tz + 2.2, tx + 3, KERB + 3.0, tz + 2.9, 'metal');
      for (const k of [-1.5, 0, 1.5]) {
        c.prop.cylinder(tx + k, KERB + 3.4, tz, 0.22, 0.12, 1.6, 8, VH.col(0x8a5a3a), true);
      }
    }
    for (const gx of [S.x0 + 4, S.x0 + 34]) {
      const c = world.ctxAt(gx, S.z0 + 12);
      for (const gz of [S.z0 + 5, S.z0 + 19]) {
        c.prop.box(gx - 0.25, KERB, gz - 0.25, gx + 0.25, KERB + 9, gz + 0.25, VH.col(0x9aa0a6));
        world.physics.addBox(gx - 0.27, 0, gz - 0.27, gx + 0.27, KERB + 9, gz + 0.27, 'pole', F().SOLID | F().SHOTS);
      }
      c.prop.box(gx - 0.2, KERB + 8.6, S.z0 + 5, gx + 0.2, KERB + 9, S.z0 + 19, VH.col(0x9aa0a6));
      for (let gz = S.z0 + 7; gz < S.z0 + 18; gz += 3.5) c.prop.cylinder(gx, KERB + 7.2, gz, 0.15, 0.15, 1.4, 6, VH.col(0x8a5a3a), false);
    }
    // The cables out: a line of poles along the lane edge.
    world.addProp('streetlight', S.x0 + 30, KERB, S.z1 + 3, 0, 1);
  }

  /** The viewpoint at the west end: a little car park off the lane, a blade on display, benches and the board. */
  function buildViewpoint(world) {
    const K = C(), WN = W();
    const V = WF.view;
    K.ground(world, V.x0 + 14, V.z1 - 12, V.x0 + 40, WF.z1, 'gravel', KERB + 0.014);
    for (let x = V.x0 + 16; x < V.x0 + 39; x += 2.8) world.ctxAt(x, V.z1 - 11).detailWood.box(x - 0.8, KERB, V.z1 - 11.4, x + 0.8, KERB + 0.12, V.z1 - 11.1, VH.col(0x6b5038));
    // The blade: twenty metres of it lying on two cradles, root end bolted to a hub ring.
    const bz = V.z0 + 9;
    const ctx = world.ctxAt((V.x0 + V.x1) / 2, bz);
    const bx0 = V.x0 + 6, bx1 = V.x0 + 6 + WF.blade;
    ctx.prop.cylinder(bx0 - 0.3, KERB, bz, 1.6, 1.6, 0.4, 12, VH.col(0x6a7078), true);
    const segs = [[0, 0.25, 0.9, 0.55], [0.25, 0.55, 0.75, 0.42], [0.55, 0.89, 0.55, 0.3], [0.89, 1, 0.38, 0.22]];
    for (const [t0, t1, half, thick] of segs) {
      const a = bx0 + (bx1 - bx0) * t0, b = bx0 + (bx1 - bx0) * t1;
      ctx.prop.box(a, KERB + 1.4 - thick, bz - half, b, KERB + 1.4 + thick, bz + half, t0 >= 0.89 ? VH.col(0xc8302c) : VH.col(0xf2f4f4));
    }
    for (const t of [0.15, 0.7]) {
      const x = bx0 + (bx1 - bx0) * t;
      WN.solid(world, ctx.prop, x - 0.4, KERB, bz - 1.1, x + 0.4, KERB + 0.9, bz + 1.1, 0xe0b12e, null, 'metal');
    }
    world.physics.addBox(bx0, 0, bz - 0.95, bx1, KERB + 1.95, bz + 0.95, 'metal', F().ALL);
    VH.Landmarks.sign(world, { x: bx0 + 4, y: KERB + 1.0, z: bz + 2.2, yaw: 0, w: 2.6, h: 0.9, lines: ['ONE BLADE', '20 m long · 6 tonnes · turns 15 times a minute'], style: 'plaque', posts: true });
    // The board, benches, a lamp.
    VH.Landmarks.sign(world, { x: V.x0 + 30, y: KERB + 1.8, z: V.z1 - 13.5, yaw: 0, w: 4.2, h: 1.7, lines: ['HAVERLY WIND FARM', 'Eleven turbines · power for 9,000 homes', 'Please keep dogs on leads: sheep about'], style: 'info', posts: true });
    for (const x of [V.x0 + 18, V.x0 + 24]) world.addProp('bench', x, KERB, V.z0 + 16, Math.PI, 1);
    world.addProp('streetlight', V.x0 + 40, KERB, V.z1 - 2, 0, 1);
    VH.Landmarks.sign(world, { x: V.x0 + 20, y: KERB + 2.4, z: WF.z1 - 2.2, yaw: 0, w: 6, h: 1.3, lines: ['HAVERLY WIND FARM', 'Viewpoint and parking'], style: 'brand', posts: true, colors: { bg: ['#2f6f9a', '#245a80'], fg: '#ffffff' }, frame: 0xf2f4f4 });
  }

  /** The rotors as two instanced meshes (blades, tip lights) spun by HaverlyLife. */
  function buildRotors(world) {
    const n = WF.xs.length;
    const rotors = new THREE.InstancedMesh(rotorGeometry(), world.materials.prop, n);
    const tips = new THREE.InstancedMesh(tipGeometry(), world.materials.beacon, n);
    rotors.name = 'wind turbine rotors';
    tips.name = 'wind turbine tip lights';
    for (const m of [rotors, tips]) {
      m.frustumCulled = false; // one mesh along 1.3 km; it is hidden when far instead
      m.castShadow = false;
      m.receiveShadow = false;
      world.root.add(m);
    }
    const fx = Math.sin(WF.yaw), fz = Math.cos(WF.yaw);
    const R = { rotors, tips, t: 0, pos: [], phase: [], speed: [] };
    WF.xs.forEach((x, i) => {
      R.pos.push(new THREE.Vector3(x + fx * 2.5, WF.hubY, WF.tz + fz * 2.5));
      R.phase.push(i * 0.83);
      R.speed.push(-(1.45 + ((i * 37) % 10) / 45)); // about 15 turns a minute, clockwise from the front
    });
    world.haverlyRotors = R;
    spinRotors(R, 0);
  }

  const _rq = new THREE.Quaternion(), _rq2 = new THREE.Quaternion(), _rm = new THREE.Matrix4();
  const _ry = new THREE.Vector3(0, 1, 0), _rz = new THREE.Vector3(0, 0, 1), _r1 = new THREE.Vector3(1, 1, 1);
  /** Turn every rotor on by dt seconds (no allocation). */
  function spinRotors(R, dt) {
    R.t += dt;
    for (let i = 0; i < R.pos.length; i++) {
      _rq.setFromAxisAngle(_ry, WF.yaw);
      _rq2.setFromAxisAngle(_rz, R.phase[i] + R.t * R.speed[i]);
      _rq.multiply(_rq2);
      _rm.compose(R.pos[i], _rq, _r1);
      R.rotors.setMatrixAt(i, _rm);
      R.tips.setMatrixAt(i, _rm);
    }
    R.rotors.instanceMatrix.needsUpdate = true;
    R.tips.instanceMatrix.needsUpdate = true;
  }

  // -------------------------------------------------------------- the map
  if (VH.MapPainters) {
    VH.MapPainters.push((g, layout, o) => {
      if (!layout.plots || !layout.plots.haverly_farm_shop) return;
      const R = o.R;
      const box = (x0, z0, x1, z1, col, sh) => W().mapBox(g, R, x0, z0, x1, z1, col, sh);
      const P = FS;
      box(P.x0 + 1.6, P.z0 + 1.6, P.x1 - 1.6, P.z1 - 1.6, '#7da35a', false);
      box(P.park.x0, P.park.z0, P.park.x1, P.park.z1, '#b4aa92', false);
      box(P.gate.x0, P.park.z1, P.gate.x1, P.z1, '#b4aa92', false);
      box(P.track.x0, P.z0, P.track.x1, P.z1, '#a8987a', false);
      box(P.patch.x0, P.patch.z0, P.patch.x1, P.patch.z1, '#8a6a44', false);
      g.fillStyle = 'rgba(232, 118, 30, 0.75)';
      for (let x = P.patch.x0 + 2; x < P.patch.x1 - 1; x += 5.2) R(x, P.patch.z0 + 2, x + 1.6, P.patch.z1 - 2);
      g.fillStyle = '#d8c890';
      R(P.patch.x0, P.patch.midZ - 1.5, P.patch.x1, P.patch.midZ + 1.5);
      R(P.patch.midX - 1.5, P.patch.z0, P.patch.midX + 1.5, P.patch.z1);
      for (const cz of P.tunnels.cz) box(P.tunnels.x0, cz - 4, P.tunnels.x1, cz + 4, '#eef0e6');
      box(P.shop.x0, P.shop.z0, P.shop.x1, P.shop.z1, '#5a2e26');
      box(P.cafe.x0, P.cafe.z0, P.cafe.x1, P.cafe.z1, '#3f5a48');
      box(P.fort.x0, P.fort.z0, P.fort.x1, P.fort.z1, '#dcc47a');
      box(P.goats.x0, P.goats.z0, P.goats.x1, P.goats.z1, '#a4865c', false);
      // The corn maze: a block of corn with its straw paths hinted, the yard and the clearing.
      box(MZ.yard.x0, MZ.z0 + 1.6, MZ.mx0 - 2, MZ.z1 - 1.6, '#b4aa92', false);
      box(MZ.mx0 - 2, MZ.z0 + 1.6, MZ.x1 - 1.6, MZ.z1 - 1.6, '#6e9a3a', false);
      g.fillStyle = 'rgba(216, 200, 144, 0.55)';
      for (let z = MZ.mz0 + MZ.cell; z < MZ.mz1 - 1; z += MZ.cell * 2) R(MZ.mx0 + 2, z - 0.8, MZ.mx1 - 2, z + 0.8);
      box(MZ.cx0, MZ.cz0, MZ.cx1, MZ.cz1, '#e0c878', false);
      box(MZ.tower.x0, MZ.tower.z0, MZ.tower.x1, MZ.tower.z1, '#8a6a48');
      // The wind farm: pasture, the track, the pads and the turbines (white dots with their rotor line).
      box(WF.x0, WF.z0, WF.x1, WF.z1 - 1.6, '#86ad5e', false);
      g.fillStyle = '#b4aa92';
      R(WF.view.x1, WF.track.z0, WF.sub.x0, WF.track.z1);
      for (const x of WF.spurs) R(x - 3, WF.track.z1, x + 3, WF.z1);
      box(WF.sub.x0, WF.sub.z0, WF.sub.x1, WF.sub.z1, '#9a968e', false);
      for (const x of WF.xs) {
        box(x - 9, WF.tz - 9, x + 9, WF.track.z0, '#b4aa92', false);
        g.fillStyle = '#f2f4f4';
        if (o.circle) o.circle(x, WF.tz, 3.4);
        else R(x - 3, WF.tz - 3, x + 3, WF.tz + 3);
        g.fillStyle = 'rgba(242, 244, 244, 0.8)';
        const ax = Math.cos(WF.yaw) * WF.blade, az = -Math.sin(WF.yaw) * WF.blade;
        g.beginPath();
        g.moveTo(x - ax, WF.tz - az);
        g.lineTo(x + ax, WF.tz + az);
        g.lineWidth = 1.6;
        g.strokeStyle = 'rgba(242, 244, 244, 0.85)';
        g.stroke();
      }
    });
  }

  // --------------------------------------------------------- moving parts
  /** The shop's counters (strawberries, cream teas, eggs, pumpkins) and the cars in the car park. */
  class HaverlyLife {
    constructor(game) {
      this.game = game;
      const WN = W();
      if (game.interaction && game.interaction.on) {
        game.interaction.on('haverlyBuy', (item, player) => {
          if (player.money < item.price) {
            VH.events.emit('notify', { title: 'Not enough cash', text: VH.util.formatMoney(item.price) + ' at the Haverly Farm Shop.', icon: '✕', tone: 'bad' });
            return 1;
          }
          player.money -= item.price;
          const before = player.health;
          if (item.heal) player.heal(item.heal);
          VH.events.emit('money:changed', { delta: -item.price, reason: 'Haverly Farm Shop' });
          const gained = Math.round(player.health - before);
          const LINES = {
            strawberries: ['Strawberries', 'Picked this morning. '],
            tea: ['Cream tea', 'Jam first, then cream. '],
            eggs: ['Free-range eggs', 'The hens say thank you. '],
            pumpkin: ['A pumpkin', 'A good one for carving. It goes in the boot.'],
          };
          const [title, text] = LINES[item.what] || ['Haverly Farm Shop', ''];
          VH.events.emit('notify', { title, text: text + (item.heal ? (gained > 0 ? '+' + gained + ' health' : 'You were already feeling fine.') : ''), icon: item.what === 'pumpkin' ? '🎃' : item.what === 'eggs' ? '🥚' : item.what === 'tea' ? '☕' : '🍓' });
          return 1.5;
        });
      }
      // Cars in the car park (the parked-car streamer brings them in and out).
      const list = [];
      let seed = 911;
      const rows = [{ z: -1233.5, h: Math.PI }, { z: -1222, h: 0 }, { z: -1217, h: Math.PI }, { z: -1205.5, h: 0 }];
      for (const r of rows) {
        for (let x = FS.park.x0 + 3 + 1.35; x < FS.park.x1 - 3; x += 2.7) {
          if ((seed * 7) % 5 < 3) { seed++; continue; }
          list.push(WN.parkedSpot(x, r.z, r.h, seed++));
        }
      }
      WN.addParkedSpots(game, list);
      WN.clearSpots(game, [[FS.gate.x0 - 3, -1192, FS.gate.x1 + 3, -1168], [FS.track.x0 - 3, -1330, FS.track.x1 + 3, -1300], [FS.track.x0 - 3, -1192, FS.track.x1 + 3, -1168]]);
      // The corn maze: a clock starts when Jay walks into the maze and stops when he rings the bell in the middle.
      this.saveKey = 'haverly';
      this.t = 0;
      this.maze = { running: false, t0: 0, done: false, best: 0 };
      if (game.interaction && game.interaction.on) game.interaction.on('haverlyMaze', () => this._ringBell());
    }

    _ringBell() {
      const g = this.game, M = this.maze;
      if (g.audio && g.audio.purchase) g.audio.purchase();
      if (!M.running) {
        VH.events.emit('notify', { title: 'Ding!', text: 'The scarecrow looks impressed. Walk in from the start to go against the clock.', icon: '🔔' });
        return 2;
      }
      M.running = false;
      M.out = true;
      const secs = Math.max(1, this.t - M.t0);
      const time = Math.floor(secs / 60) + ':' + String(Math.floor(secs % 60)).padStart(2, '0');
      const best = !M.best || secs < M.best;
      if (!M.done) {
        M.done = true;
        M.best = secs;
        g.giveMoney(500, 'Haverly Corn Maze');
        VH.events.emit('notify', { title: 'You found the middle!', text: 'The Haverly Corn Maze in ' + time + '. The farm gives you $500.', icon: '🌽', tone: 'good' });
      } else if (best) {
        M.best = secs;
        g.giveMoney(100, 'Haverly Corn Maze');
        VH.events.emit('notify', { title: 'New best time!', text: 'The corn maze in ' + time + '. +$100', icon: '🌽', tone: 'good' });
      } else {
        const b = Math.floor(M.best / 60) + ':' + String(Math.floor(M.best % 60)).padStart(2, '0');
        VH.events.emit('notify', { title: 'Ding!', text: 'The corn maze in ' + time + '. Your best is ' + b + '.', icon: '🔔' });
      }
      return 2;
    }

    update(dt) {
      this.t += dt;
      // The wind farm turns while it can be seen (it sleeps from 1.8 km away).
      const R = this.game.world && this.game.world.haverlyRotors;
      if (R) {
        const cam = this.game.renderer.camera.position;
        const dx = cam.x < WF.x0 ? WF.x0 - cam.x : cam.x > WF.x1 ? cam.x - WF.x1 : 0;
        const dz = cam.z - WF.tz;
        const near = dx * dx + dz * dz < 1800 * 1800;
        if (R.rotors.visible !== near) R.rotors.visible = R.tips.visible = near;
        if (near) spinRotors(R, dt);
      }
      const p = this.game.player;
      if (!p) return;
      const pos = p.inVehicle && p.vehicle ? p.vehicle.pos : p.pos;
      const inMaze = pos.x > MZ.mx0 && pos.x < MZ.mx1 && pos.z > MZ.mz0 && pos.z < MZ.mz1;
      const M = this.maze;
      // Walking out stops the clock; it starts again on the way back in (not straight after the bell).
      if (!inMaze) {
        M.running = false;
        M.out = false;
      } else if (!M.running && !M.out) {
        M.running = true;
        M.t0 = this.t;
      }
    }
    serialize() {
      return { mazeDone: this.maze.done, mazeBest: this.maze.best };
    }
    load(d) {
      this.maze.done = !!(d && d.mazeDone);
      this.maze.best = (d && +d.mazeBest) || 0;
      this.maze.running = false;
    }
    stop() {}
    reset() {
      this.maze.running = false;
    }
  }

  // -------------------------------------------------------------- register
  VH.Districts.register({
    id: D,
    name: 'Haverly Farms',
    plots: ['haverly_farm_shop', 'corn_maze', 'haverly_windfarm'],
    build(world, layout) {
      const t0 = performance.now();
      if (!layout.plots || !layout.plots.haverly_farm_shop || !VH.WNKit || !VH.CountryKit) return;
      buildFarmShop(world);
      buildCornMaze(world);
      buildWindFarm(world);
      buildRotors(world);
      world.haverly = true;
      this.buildMs = Math.round(performance.now() - t0);
    },
    registerPlaces(world, places) {
      if (!world.haverly) return;
      const add = (id, p) => {
        const def = places.defs && places.defs[id];
        places.add(id, Object.assign({ district: D, desc: def && def.desc }, p));
      };
      const dx = (FS.path.x0 + FS.path.x1) / 2;
      add('haverly_farm_shop', { name: 'Haverly Farm Shop', x: dx, z: FS.park.z0 - 3, yaw: Math.PI, kind: 'storefront', landmark: true });
      add('corn_maze', { name: 'Haverly Corn Maze', x: MZ.yard.x0 + 8, z: MZ.entryZ, yaw: Math.PI / 2, kind: 'maze', landmark: true });
      add('haverly_windfarm', { name: 'Haverly Wind Farm', x: WF.view.x0 + 30, z: WF.view.z1 - 10, yaw: Math.PI, kind: 'windfarm', landmark: true });
      const extra = places.extra[D];
      if (extra) {
        extra.push(
          { x: dx + 4.5, z: FS.veranda.z0 + 2.4, yaw: Math.PI, kinds: ['farmshop', 'shop', 'storefront', 'market'], name: 'The counter, Haverly Farm Shop' },
          { x: FS.cafe.x1 + 3, z: (FS.cafe.z0 + FS.cafe.z1) / 2, yaw: -Math.PI / 2, kinds: ['cafe', 'diner', 'restaurant'], name: 'The Hayloft Café, Haverly Farm Shop' },
          { x: -1554, z: -1246, yaw: Math.PI, kinds: ['park', 'cafe', 'bench'], name: 'The picnic lawn, Haverly Farm Shop' },
          { x: -1500, z: -1228, yaw: Math.PI, kinds: ['parking', 'street'], name: 'The car park, Haverly Farm Shop' },
          { x: FS.eggs.x, z: FS.eggs.z + 2, yaw: Math.PI, kinds: ['farm', 'lane', 'street'], name: 'The egg stand, Airport Road' },
          { x: FS.patch.x0 - 2.5, z: (FS.patch.gateZ0 + FS.patch.gateZ1) / 2, yaw: Math.PI / 2, kinds: ['pumpkins', 'field', 'farm', 'fields'], name: 'The pumpkin patch gate' },
          { x: FS.patch.midX - 4.5, z: FS.patch.midZ + 1, yaw: Math.PI / 2, kinds: ['pumpkins', 'field', 'farm'], name: 'Big Bertha, the pumpkin patch' },
          { x: (FS.track.x0 + FS.track.x1) / 2 + 3.5, z: -1300, yaw: -Math.PI / 2, kinds: ['farm', 'yard', 'barn'], name: 'The hay ride, Haverly Farm Shop' },
          { x: FS.goats.x0 + 4, z: FS.goats.z1 + 2, yaw: Math.PI, kinds: ['farm', 'park'], name: 'The goat pen, Haverly Farm Shop' },
          { x: -1540, z: FS.shop.z0 - 3, yaw: 0, kinds: ['yard', 'alley', 'farm'], name: 'Behind the farm shop' },
          { x: MZ.ccx, z: MZ.ccz + 4.5, yaw: Math.PI, kinds: ['maze', 'field', 'farm'], name: 'The middle of the corn maze' },
          { x: MZ.mx0 - 7, z: MZ.entryZ, yaw: Math.PI / 2, kinds: ['maze', 'farm', 'park'], name: 'The way into the corn maze' },
          { x: (MZ.tower.x0 + MZ.tower.x1) / 2, z: (MZ.tower.z0 + MZ.tower.z1) / 2, y: MZ.tower.y, yaw: Math.PI / 2, kinds: ['overlook', 'maze', 'rooftop'], name: 'The corn maze lookout' },
          { x: (MZ.hut.x0 + MZ.hut.x1) / 2, z: MZ.hut.z1 + 2, yaw: Math.PI, kinds: ['maze', 'farm', 'storefront'], name: 'The maze ticket hut' },
          { x: MZ.x1 - 3, z: MZ.exitZ, yaw: -Math.PI / 2, kinds: ['maze', 'lane', 'fields'], name: 'The corn maze exit, Mill Lane' },
          { x: WF.view.x0 + 12, z: WF.view.z0 + 12, yaw: Math.PI / 2, kinds: ['windfarm', 'overlook', 'park'], name: 'The blade on show, Haverly Wind Farm' },
          { x: WF.xs[3], z: WF.tz + 7, yaw: Math.PI, kinds: ['windfarm', 'field', 'farm'], name: 'Turbine 4, Haverly Wind Farm' },
          { x: WF.xs[8], z: WF.tz + 7, yaw: Math.PI, kinds: ['windfarm', 'field', 'farm'], name: 'Turbine 9, Haverly Wind Farm' },
          { x: WF.sub.x0 + 14, z: WF.sub.z1 + 3, yaw: Math.PI, kinds: ['windfarm', 'yard', 'warehouse'], name: 'The wind farm substation gate' },
          { x: WF.spurs[1], z: WF.z1 - 4, yaw: Math.PI, kinds: ['windfarm', 'lane', 'fields'], name: 'The wind farm track, Haverly Lane' },
        );
      }
    },
    System: HaverlyLife,
  });
})();
