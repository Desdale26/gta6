/*
 * sprayshops.js — Fresh Coat body shops: drive in, pick a colour, and the
 * car comes back out repainted and repaired. If the police didn't see you
 * go in, they've lost you.
 *
 *   VH.SprayShops.plan(layout)              picks car parks for the shops
 *                                           (after stores.js has had its pick)
 *   VH.SprayShops.buildLot(world, ctx, lot) builds one: a body shop with a
 *                                           wide roller door, a paint booth
 *                                           inside and a forecourt in front
 *   new VH.SprayShops(game)                 the colour card and the respray
 *
 * Drive in and stop: a colour card comes up (A / D or the stick to choose,
 * E to spray, drive off to leave). Spraying brings the roller door down for
 * a few seconds and costs the paint, the repairs and a fee per wanted star.
 * With the police watching, the shop won't touch the car. Cars only, and
 * not the ones in a fleet livery (police, taxi, bus), whose colours are
 * part of the body.
 *
 * Each shop is laid out in its car park's frame (stores.js): u runs along
 * the street front, v runs in from the front edge of the lot.
 */
(function () {
  'use strict';

  const VH = window.VH;
  const { clamp } = VH.math;
  const SALT = 'fresh-coat-3'; // the plan's shuffle (none of these car parks is a story place)
  const QUOTA = { oldmarket: 1, harborpoint: 1, palmcrescent: 1, downtown: 1 };
  const SPACING = 260; //  metres between body shops
  const WALL_H = 6.2; //   top of the walls above the kerb
  const CEIL = 5.6; //     inside ceiling above the kerb
  const DOOR_W = 5.6;
  const DOOR_H = 4.3;
  const PAINT = 150; //    the paint job
  const REPAIR = 0.6; //   dollars per point of damage (a wreck-to-new repair is $600)
  const HEAT = 200; //     per wanted star
  // The card's colours: [name, hex].
  const PAINTS = [
    ['Candy Red', 0xc8102e],
    ['Sunset Orange', 0xff6a1f],
    ['Vice Pink', 0xff4f8b],
    ['Lemon Zest', 0xf2c500],
    ['Lime Fizz', 0x7ccf2a],
    ['Lagoon Teal', 0x14a3a0],
    ['Ocean Blue', 0x1f6fd1],
    ['Midnight Blue', 0x16224a],
    ['Royal Purple', 0x6a2fa0],
    ['Pearl White', 0xf0efe9],
    ['Silver Mist', 0xb7bcc3],
    ['Gunmetal', 0x4a4f57],
    ['Gloss Black', 0x101113],
  ];
  const BRAND = { sign: ['FRESH COAT', 'RESPRAY · REPAIR'], bg: ['#ff4f8b', '#7a2bd0'], fg: '#ffffff', band: 0xd23a7f, trim: 0xffd27a };
  // The roller door's timing (seconds): down, sprayed, up.
  const CLOSE = 1.3;
  const HOLD = 2.4;
  const OPEN = 1.3;

  let K = null; // the frame helpers from stores.js

  function kit() {
    if (!K) K = VH.Stores && VH.Stores.kit;
    return K;
  }

  function smooth(t) {
    t = clamp(t, 0, 1);
    return t * t * (3 - 2 * t);
  }

  /** Which way the lot can face a street with room for the shop and a forecourt. */
  function fit(lot) {
    for (const side of ['s', 'n', 'e', 'w']) {
      if (!lot.front[side]) continue;
      const f = kit().frameFor(lot, side);
      if (f.W >= 15 && f.D >= 18) return side;
    }
    return null;
  }

  // ------------------------------------------------------------ the shop
  function buildShop(world, ctx, s) {
    const { KERB, T, P, rect } = kit();
    const f = s.f;
    const D = kit().drawer(ctx, f);
    const rng = new VH.RNG(s.seed);
    const a0 = s.a;
    const a1 = s.a + s.GW;
    const v0 = s.vb0;
    const v1 = s.vb1;
    const y0 = KERB;
    const yTop = KERB + WALL_H;
    const d0 = s.d0;
    const d1 = s.d1;
    const band = VH.col(BRAND.band);
    const trim = VH.col(BRAND.trim);
    const wallCol = VH.col(rng.pick([0xe4e0d8, 0xd8dade, 0xe9e2d6]));
    const seed = rng.range(0, 100);
    const blankF = { style: 0, bay: 4, seed };
    const lot = s.lot;
    const metal = VH.col(0x2b2f35);
    const steel = VH.col(0x8a9097);

    // --- forecourt: asphalt round the shop, guide lines to the door, a hazard strip at it
    const W = f.W;
    for (const [u0, q0, u1, q1] of [[0, 0, W, v0], [0, v1, W, f.D], [0, v0, a0, v1], [a1, v0, W, v1]]) {
      if (u1 - u0 < 0.05 || q1 - q0 < 0.05) continue;
      const r = rect(f, u0, q0, u1, q1);
      ctx.asphaltTop.topRect(r[0], r[1], r[2], r[3], KERB, VH.col(0xd0d0d0), 6);
    }
    const flat = { skip: { n: true, s: true, e: true, w: true } };
    const mark = (u0, q0, u1, q1, col) => {
      const r = rect(f, u0, q0, u1, q1);
      ctx.marks.box(r[0], KERB, r[1], r[2], KERB + 0.001, r[3], col, flat);
    };
    const yellow = VH.col(0xf2c500);
    mark(d0 + 0.2, 0.8, d0 + 0.34, v0 - 0.6, yellow);
    mark(d1 - 0.34, 0.8, d1 - 0.2, v0 - 0.6, yellow);
    for (let u = d0, i = 0; u < d1 - 0.01; u += 0.5, i++) mark(u, v0 - 0.5, Math.min(u + 0.5, d1), v0 - 0.05, i % 2 ? VH.col(0x1b1b1b) : yellow);
    // An arrow painted on the way in.
    const uc = (d0 + d1) / 2;
    const white = VH.col(0xe8e8e0);
    mark(uc - 0.12, v0 - 4.2, uc + 0.12, v0 - 2.0, white);
    for (let i = 0; i < 6; i++) {
      const w = 0.8 - i * 0.13;
      mark(uc - w, v0 - 2.0 + i * 0.13, uc + w, v0 - 1.87 + i * 0.13, white);
    }

    // --- shell
    const wallBox = (u0, q0, u1, q1, h0, h1, skipLocal, bottom) =>
      D.box('b', u0, h0, q0, u1, h1, q1, wallCol, { skipLocal, bottom, skip: { top: true } });
    const leftStreet = !!lot.front[D.sides.left];
    const rightStreet = !!lot.front[D.sides.right];
    const backStreet = !!lot.front[D.sides.back];
    const backSkip = ['front'];
    if (backStreet) backSkip.push('back');
    if (leftStreet) backSkip.push('left');
    if (rightStreet) backSkip.push('right');
    wallBox(a0, v1 - T, a1, v1, y0, yTop, backSkip);
    wallBox(a0, v0, a0 + T, v1 - T, y0, yTop, leftStreet ? ['left', 'right', 'front'] : ['right', 'front']);
    wallBox(a1 - T, v0, a1, v1 - T, y0, yTop, rightStreet ? ['right', 'left', 'front'] : ['left', 'front']);
    if (leftStreet) D.facade(a0, v1, a0, v0, y0, WALL_H, -1, 0, wallCol, blankF);
    if (rightStreet) D.facade(a1, v0, a1, v1, y0, WALL_H, 1, 0, wallCol, blankF);
    if (backStreet) D.facade(a1, v1, a0, v1, y0, WALL_H, 0, 1, wallCol, blankF);
    // The front: wall either side of the door, the lintel over it, the fascia above.
    wallBox(a0 + T, v0, d0, v0 + T, y0, yTop, ['front', 'back']);
    wallBox(d1, v0, a1 - T, v0 + T, y0, yTop, ['front', 'back']);
    D.facade(a0, v0, d0, v0, y0, WALL_H, 0, -1, wallCol, blankF);
    D.facade(d1, v0, a1, v0, y0, WALL_H, 0, -1, wallCol, blankF);
    wallBox(d0, v0, d1, v0 + T, y0 + DOOR_H, yTop, ['back'], true);
    D.box('b', a0 - 0.15, y0 + DOOR_H + 0.35, v0 - 0.25, a1 + 0.15, yTop + 0.2, v0, band, { bottom: true });
    D.box('prop', a0 - 0.16, y0 + DOOR_H + 0.23, v0 - 0.27, a1 + 0.16, y0 + DOOR_H + 0.35, v0, trim, { bottom: true });
    // Door guides, the bottom of the rolled-up door and its drum inside.
    D.box('prop', d0 - 0.14, y0, v0 - 0.08, d0, y0 + DOOR_H, v0 + T, metal);
    D.box('prop', d1, y0, v0 - 0.08, d1 + 0.14, y0 + DOOR_H, v0 + T, metal);
    D.box('prop', d0, y0 + DOOR_H - 0.32, v0 + 0.04, d1, y0 + DOOR_H, v0 + 0.12, steel, { bottom: true });
    D.box('prop', d0, y0 + DOOR_H - 0.36, v0 + 0.03, d1, y0 + DOOR_H - 0.32, v0 + 0.13, metal, { bottom: true });
    D.box('interior', d0 - 0.1, y0 + DOOR_H, v0 + T, d1 + 0.1, y0 + DOOR_H + 0.6, v0 + T + 0.6, VH.col(0x5d636a), { bottom: true });
    // Roof: gravel, parapet, the booth's extraction stack.
    const r = rect(f, a0, v0 - 0.25, a1, v1);
    ctx.b.quad([r[0], yTop, r[3]], [r[2], yTop, r[3]], [r[2], yTop, r[1]], [r[0], yTop, r[1]], [0, 1, 0], VH.col(0x8f8c86), null, null, [0, 0, -1, seed]);
    const par = VH.colMul(wallCol, 0.9);
    D.box('b', a0, yTop, v1 - 0.25, a1, yTop + 0.5, v1, par);
    D.box('b', a0, yTop, v0 + T - 0.25, a0 + 0.25, yTop + 0.5, v1 - 0.25, par);
    D.box('b', a1 - 0.25, yTop, v0 + T - 0.25, a1, yTop + 0.5, v1 - 0.25, par);
    const su = a0 + s.GW * 0.7;
    const sv = v1 - 2.2;
    D.box('prop', su - 0.7, yTop, sv - 0.7, su + 0.7, yTop + 1.8, sv + 0.7, VH.col(0xa9afb5));
    D.box('prop', su - 0.9, yTop + 1.8, sv - 0.9, su + 0.9, yTop + 1.95, sv + 0.9, VH.col(0x6d737a));
    D.box('prop', a0 + 2, yTop, v0 + 3, a0 + 3.4, yTop + 1.0, v0 + 4.2, VH.col(0xb9bcbf));

    // Colliders: walls, the lintel, the roof.
    const FLAGS = VH.COLLIDE.ALL;
    D.collide(a0, 0, v1 - T, a1, yTop + 0.5, v1, 'building', FLAGS);
    D.collide(a0, 0, v0, a0 + T, yTop + 0.5, v1, 'building', FLAGS);
    D.collide(a1 - T, 0, v0, a1, yTop + 0.5, v1, 'building', FLAGS);
    D.collide(a0, 0, v0 - 0.25, d0, yTop + 0.5, v0 + T, 'building', FLAGS);
    D.collide(d1, 0, v0 - 0.25, a1, yTop + 0.5, v0 + T, 'building', FLAGS);
    D.collide(d0, y0 + DOOR_H, v0 - 0.25, d1, yTop + 0.5, v0 + T, 'building', FLAGS);
    D.collide(a0, y0 + CEIL, v0, a1, yTop + 0.5, v1, 'building', FLAGS);

    // --- inside: a white paint booth with a grated floor and strip lights
    const i0 = a0 + T;
    const i1 = a1 - T;
    const q0 = v0 + T;
    const q1 = v1 - T;
    const yc = y0 + CEIL;
    const dado = VH.col(0x474c53);
    const paint = VH.col(0xeef0f1);
    const two = (u0, w0, u1, w1, nu, nv) => {
      D.vquad('interior', u0, w0, u1, w1, y0, y0 + 1.2, nu, nv, dado);
      D.vquad('interior', u0, w0, u1, w1, y0 + 1.2, yc, nu, nv, paint);
    };
    two(i0, q1, i1, q1, 0, -1);
    two(i0, q0, i0, q1, 1, 0);
    two(i1, q0, i1, q1, -1, 0);
    two(i0, q0, d0, q0, 0, 1);
    two(d1, q0, i1, q0, 0, 1);
    D.vquad('interior', d0, q0, d1, q0, y0 + DOOR_H + 0.6, yc, 0, 1, paint);
    // Floor: grey epoxy, the booth's grate down the middle, yellow lines round it.
    D.hquad('interior', i0, q0, i1, q1, y0 + 0.012, 1, VH.col(0x80868d));
    const g0 = uc - 2.2;
    const g1 = uc + 2.2;
    const gq0 = q0 + 1.6;
    const gq1 = q1 - 1.2;
    D.hquad('interior', g0, gq0, g1, gq1, y0 + 0.02, 1, VH.col(0x9aa1a8));
    for (let q = gq0 + 0.4; q < gq1 - 0.1; q += 0.5) D.hquad('interior', g0, q, g1, q + 0.06, y0 + 0.025, 1, VH.col(0x4c5258));
    for (const [u, w] of [[g0 - 0.18, g0 - 0.06], [g1 + 0.06, g1 + 0.18]]) D.hquad('interior', u, gq0, w, gq1, y0 + 0.025, 1, yellow);
    // Ceiling and two long strip lights.
    D.hquad('interior', i0, q0, i1, q1, yc, -1, VH.col(0xe3e5e7));
    const lamp = VH.col(0xffffff, 1.6);
    for (const u of [uc - 2.3, uc + 2.0]) D.hquad('screen', u, q0 + 1.2, u + 0.3, q1 - 1.0, yc - 0.01, -1, lamp);
    // Filter panels on the back wall (the booth's extraction).
    for (let u = i0 + 1.0; u < i1 - 1.4; u += 1.6) {
      D.vquad('interior', u, q1 - 0.01, u + 1.3, q1 - 0.01, y0 + 2.0, y0 + 4.6, 0, -1, VH.col(0xc9ced2));
      for (let y = y0 + 2.25; y < y0 + 4.5; y += 0.3) D.vquad('interior', u + 0.05, q1 - 0.02, u + 1.25, q1 - 0.02, y, y + 0.04, 0, -1, VH.col(0x9fa6ad));
    }
    // Left wall: shelves of paint tins.
    const sv0 = q0 + 1.2;
    const sv1 = q1 - 2.6;
    const tins = [0xc8102e, 0xff6a1f, 0xff4f8b, 0xf2c500, 0x7ccf2a, 0x14a3a0, 0x1f6fd1, 0x6a2fa0, 0xf0efe9, 0xb7bcc3, 0x101113];
    D.box('interior', i0, y0, sv0, i0 + 0.5, y0 + 2.4, sv1, VH.col(0x3b4047));
    for (let lvl = 0; lvl < 4; lvl++) {
      const y = y0 + 0.35 + lvl * 0.55;
      D.box('interior', i0 + 0.5, y - 0.04, sv0, i0 + 0.56, y, sv1, steel);
      for (let q = sv0 + 0.12; q < sv1 - 0.3; q += 0.32) {
        if (rng.chance(0.15)) continue;
        D.box('interior', i0 + 0.22, y, q, i0 + 0.5, y + 0.3, q + 0.24, VH.col(rng.pick(tins)));
      }
    }
    D.collide(i0, 0, sv0, i0 + 0.56, y0 + 2.4, sv1, 'shelf', FLAGS);
    // Right wall: a bench, a red tool chest and the spray gun on its stand.
    const bv0 = q0 + 1.4;
    const bv1 = bv0 + 3.0;
    D.box('interior', i1 - 0.7, y0 + 0.85, bv0, i1, y0 + 0.95, bv1, VH.col(0x6b5a48));
    D.box('interior', i1 - 0.65, y0, bv0 + 0.1, i1 - 0.05, y0 + 0.85, bv0 + 0.2, metal);
    D.box('interior', i1 - 0.65, y0, bv1 - 0.2, i1 - 0.05, y0 + 0.85, bv1 - 0.1, metal);
    D.box('interior', i1 - 0.02, y0 + 1.2, bv0, i1, y0 + 2.3, bv1, VH.col(0x9a8466)); // pegboard
    for (let q = bv0 + 0.25; q < bv1 - 0.2; q += 0.35) D.box('interior', i1 - 0.1, y0 + 1.5 + rng.range(0, 0.5), q, i1 - 0.02, y0 + 1.75 + rng.range(0, 0.4), q + 0.06, metal);
    const tv0 = bv1 + 0.4;
    D.box('interior', i1 - 0.65, y0, tv0, i1 - 0.05, y0 + 1.1, tv0 + 1.1, VH.col(0xc0262d));
    for (let k = 0; k < 4; k++) D.box('interior', i1 - 0.67, y0 + 0.2 + k * 0.24, tv0 + 0.15, i1 - 0.64, y0 + 0.24 + k * 0.24, tv0 + 0.95, steel);
    D.collide(i1 - 0.7, 0, bv0, i1, y0 + 1.1, tv0 + 1.1, 'shelf', FLAGS);
    const gv = q1 - 1.4;
    D.box('interior', i1 - 0.55, y0, gv - 0.2, i1 - 0.15, y0 + 0.08, gv + 0.2, metal);
    D.box('interior', i1 - 0.38, y0, gv - 0.03, i1 - 0.32, y0 + 1.5, gv + 0.03, steel);
    D.box('interior', i1 - 0.44, y0 + 1.4, gv - 0.06, i1 - 0.26, y0 + 1.62, gv + 0.12, VH.col(0x2c6bd1));
    D.box('interior', i1 - 0.36, y0 + 1.62, gv + 0.0, i1 - 0.34, y0 + 1.85, gv + 0.02, steel);

    // --- signs and light
    const yawOut = Math.atan2(-f.vx, -f.vz);
    const [sx, sz] = P(f, (a0 + a1) / 2, v0 - 0.27);
    const signs = world.signs || (world.signs = []);
    signs.push({ x: sx, y: y0 + DOOR_H + 0.35 + (WALL_H - DOOR_H - 0.15) / 2, z: sz, yaw: yawOut, w: Math.min(s.GW - 1.2, 10), h: 1.25, lines: BRAND.sign, style: 'brand', colors: { bg: BRAND.bg, fg: BRAND.fg }, frame: BRAND.band });
    const [nx, nz] = P(f, (a0 + d0) / 2, v0 - 0.02);
    signs.push({ x: nx, y: y0 + 2.6, z: nz, yaw: yawOut, w: Math.min(d0 - a0 - 0.5, 2.2), h: 0.5, lines: ['OPEN'], style: 'neon' });
    const pools = world.floodlights || (world.floodlights = []);
    const [cx, cz] = P(f, uc, (v0 + v1) / 2);
    pools.push({ x: cx, z: cz, r: Math.min(s.GW, s.GD) * 0.5, y: KERB + 0.03 });
    const [fx, fz] = P(f, uc, v0 - 3);
    pools.push({ x: fx, z: fz, r: 5.5, y: KERB + 0.03 });
    return yTop + 0.5;
  }

  // ---------------------------------------------------- the roller door
  let doorTex = null;

  function shutterTexture() {
    if (doorTex) return doorTex;
    const c = document.createElement('canvas');
    c.width = 8;
    c.height = 32;
    const g = c.getContext('2d');
    g.fillStyle = '#c4c9ce';
    g.fillRect(0, 0, 8, 32);
    g.fillStyle = '#e6e9ec';
    g.fillRect(0, 4, 8, 10);
    g.fillStyle = '#7f868d';
    g.fillRect(0, 28, 8, 4);
    doorTex = new THREE.CanvasTexture(c);
    doorTex.wrapS = doorTex.wrapT = THREE.RepeatWrapping;
    return doorTex;
  }

  // ================================================================ shops
  class SprayShops {
    /** Choose the car parks that become body shops. Runs once, before the world is built. */
    static plan(layout) {
      const k = kit();
      if (!k) return [];
      const lots = [];
      for (const b of layout.blocks) {
        if (b.kind !== 'buildings' || k.AVOID_BLOCKS.has(b.id)) continue;
        for (const l of b.lots) if (l.kind === 'parking' && !l.store) lots.push(l);
      }
      lots.sort((p, q) => k.hashString(p.id + SALT) - k.hashString(q.id + SALT));
      const chosen = [];
      const count = {};
      const clear = (l) => chosen.every((c) => Math.hypot(c.lot.cx - l.cx, c.lot.cz - l.cz) > SPACING) && (layout.stores || []).every((s) => Math.hypot(s.lot.cx - l.cx, s.lot.cz - l.cz) > 40);
      for (const l of lots) {
        const d = l.district.id;
        if (!QUOTA[d] || (count[d] || 0) >= QUOTA[d]) continue;
        const side = fit(l);
        if (!side || !clear(l)) continue;
        chosen.push({ lot: l, side });
        count[d] = (count[d] || 0) + 1;
      }
      chosen.sort((p, q) => p.lot.cx - q.lot.cx || p.lot.cz - q.lot.cz);
      layout.sprays = chosen.map((c, i) => SprayShops._describe(layout, c, i));
      for (const s of layout.sprays) s.lot.spray = s;
      return layout.sprays;
    }

    static _describe(layout, c, i) {
      const k = kit();
      const lot = c.lot;
      const f = k.frameFor(lot, c.side);
      const GW = clamp(Math.floor(f.W - 4), 10, 12);
      const GD = clamp(Math.floor(f.D - 6), 12, 15);
      const a = (f.W - GW) / 2;
      const vb1 = f.D - 0.6;
      const vb0 = vb1 - GD;
      const d0 = a + GW / 2 - DOOR_W / 2;
      const d1 = d0 + DOOR_W;
      const at = (u, v) => {
        const [x, z] = k.P(f, u, v);
        return { x, z };
      };
      const front = at((d0 + d1) / 2, -3);
      const road = VH.CityGen.roadNameAt(layout, front.x, front.z);
      return {
        id: 'spray_' + (i + 1),
        name: 'Fresh Coat' + (road ? ', ' + road : ''),
        lot,
        district: lot.district.id,
        f, a, GW, GD, vb0, vb1, d0, d1,
        door: at((d0 + d1) / 2, vb0 - 1.5),
        centre: at(a + GW / 2, (vb0 + vb1) / 2),
        yawIn: Math.atan2(f.vx, f.vz),
        seed: k.hashString(lot.id + SALT),
      };
    }

    static buildLot(world, ctx, lot) {
      return buildShop(world, ctx, lot.spray);
    }

    static registerPlaces(world, places) {
      for (const s of places.layout.sprays || []) {
        places.add(s.id, { name: s.name, x: s.door.x, z: s.door.z, yaw: s.yawIn, kind: 'spray', district: s.district });
      }
    }

    static paints() {
      return PAINTS.slice();
    }

    // ------------------------------------------------------------ runtime
    constructor(game) {
      this.game = game;
      this.list = game.layout.sprays || [];
      this.ok = this.list.length > 0 && !!kit();
      this.saveKey = 'sprayshops';
      this.resprays = 0;
      this.spent = 0;
      this.here = null; //  the shop the player's car is in
      this.card = false; // the colour card is up
      this.pick = 0;
      this.job = null; //   a respray under way
      this._used = null; // the shop just used: no card until the car has left it
      this._told = null;
      this._stickX = 0;
      this._shown = '';
      if (!this.ok) return;
      this._buildHud();
      VH.events.on('interaction:idle', () => {
        if (this.card && !this.job && this.game.state === 'playing') this._confirm();
      });
    }

    /** The shop whose booth a vehicle is parked all the way inside, if any. */
    shopAt(v) {
      const { T, local } = kit();
      for (const s of this.list) {
        if (Math.abs(v.pos.x - s.centre.x) > 16 || Math.abs(v.pos.z - s.centre.z) > 16) continue;
        const [u, q] = local(s.f, v.pos.x, v.pos.z);
        const half = v.hz || 2.3;
        if (u > s.a + T + 0.3 && u < s.a + s.GW - T - 0.3 && q - half > s.vb0 - 0.2 && q + half < s.vb1 - T + 0.2) return s;
      }
      return null;
    }

    update(dt) {
      if (!this.ok) return;
      if (this.job) {
        this._runJob(dt);
        return;
      }
      const g = this.game;
      const p = g.player;
      const v = p.inVehicle ? p.vehicle : null;
      const s = v && !v.wrecked && v.driver === 'player' ? this.shopAt(v) : null;
      if (s !== this.here) {
        this.here = s;
        if (!s) {
          this._used = null;
          this._told = null;
        }
      }
      const busy = document.body.classList.contains('cutscene') || g.state !== 'playing';
      const want = !!s && this._used !== s && Math.abs(v.speed) < 1.5 && !busy && this._fits(v, s);
      if (want && !this.card) this._open(v);
      else if (!want && this.card) this._close();
      if (this.card) this._cardInput(v);
    }

    /** Cars only, and not a fleet livery: anything else gets a word from the shop (once). */
    _fits(v, s) {
      let no = null;
      if (v.kind !== 'car') no = 'Fresh Coat only paints cars.';
      else if (v.isPolice || (v.model && v.model.livery)) no = "Fresh Coat won't touch a fleet livery. Bring something civilian.";
      if (!no) return true;
      if (this._told !== s) {
        this._told = s;
        this.game.hud.showToast(no);
      }
      return false;
    }

    // ---------------------------------------------------------- the card
    _buildHud() {
      const el = document.createElement('div');
      el.className = 'spray-card';
      el.innerHTML =
        '<div class="spray-head"><b>FRESH COAT</b><span>Respray · Repair</span></div>' +
        '<div class="spray-swatches"></div>' +
        '<div class="spray-name"></div>' +
        '<div class="spray-lines"></div>' +
        '<div class="spray-warn"></div>' +
        '<div class="spray-keys"></div>';
      const sw = el.querySelector('.spray-swatches');
      this.swatches = PAINTS.map(([name, hex]) => {
        const i = document.createElement('i');
        i.style.background = '#' + hex.toString(16).padStart(6, '0');
        i.title = name;
        sw.appendChild(i);
        return i;
      });
      this.game.hud.root.appendChild(el);
      this.cardEl = el;
      this.nameEl = el.querySelector('.spray-name');
      this.linesEl = el.querySelector('.spray-lines');
      this.warnEl = el.querySelector('.spray-warn');
      this.keysEl = el.querySelector('.spray-keys');
    }

    _open(v) {
      const inp = this.game.input;
      for (const a of ['moveLeft', 'moveRight', 'interact']) inp.discard(a);
      // Start on the colour after the car's own (the nearest on the card).
      let best = 0;
      let bestD = Infinity;
      const c = new THREE.Color(v.model.color);
      PAINTS.forEach(([, hex], i) => {
        const o = new THREE.Color(hex);
        const d = (c.r - o.r) ** 2 + (c.g - o.g) ** 2 + (c.b - o.b) ** 2;
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      });
      this.pick = (best + 1) % PAINTS.length;
      this.card = true;
      this._shown = '';
      this.cardEl.classList.add('visible');
      this._refresh(v);
    }

    _close() {
      this.card = false;
      this.cardEl.classList.remove('visible');
    }

    _cardInput(v) {
      const inp = this.game.input;
      let step = 0;
      if (inp.consume('moveLeft')) step--;
      if (inp.consume('moveRight')) step++;
      const pad = inp.pad;
      const sx = pad && pad.connected ? pad.move.x : 0;
      if (Math.abs(sx) > 0.6 && Math.abs(this._stickX) <= 0.6) step += Math.sign(sx);
      this._stickX = sx;
      if (step) {
        this.pick = (this.pick + step + PAINTS.length) % PAINTS.length;
        if (this.game.audio.click) this.game.audio.click();
      }
      this._refresh(v);
    }

    /** What it costs: the paint, the repairs, and the heat. */
    quote(v) {
      const police = this.game.police;
      const stars = police ? police.level : 0;
      const repair = Math.round((clamp(1000 - v.health, 0, 1000) * REPAIR) / 10) * 10;
      return { paint: PAINT, repair, stars, heat: stars * HEAT, total: PAINT + repair + stars * HEAT };
    }

    /** Why the shop won't do it right now, if it won't. */
    _blocked(q) {
      const g = this.game;
      if (g.police && g.police.level > 0 && g.police.seen) return 'The police can see you. Lose them first.';
      if (g.player.money < q.total) return 'You need ' + VH.util.formatMoney(q.total) + '.';
      return null;
    }

    _refresh(v) {
      const q = this.quote(v);
      const why = this._blocked(q);
      const inp = this.game.input;
      const key = this.pick + '|' + q.total + '|' + (why || '') + '|' + inp.lastDevice;
      if (key === this._shown) return;
      this._shown = key;
      this.swatches.forEach((el, i) => el.classList.toggle('on', i === this.pick));
      this.nameEl.textContent = PAINTS[this.pick][0];
      const money = VH.util.formatMoney;
      const rows = [['Paint', money(q.paint)]];
      if (q.repair) rows.push(['Repairs', money(q.repair)]);
      if (q.stars) rows.push(['Lose the heat (' + '★'.repeat(q.stars) + ')', money(q.heat)]);
      rows.push(['Total', money(q.total)]);
      this.linesEl.replaceChildren(
        ...rows.map(([a, b], i) => {
          const row = document.createElement('div');
          if (i === rows.length - 1) row.className = 'total';
          const l = document.createElement('span');
          l.textContent = a;
          const r = document.createElement('em');
          r.textContent = b;
          row.append(l, r);
          return row;
        })
      );
      this.warnEl.textContent = why || '';
      this.cardEl.classList.toggle('blocked', !!why);
      const pad = inp.lastDevice === 'gamepad';
      const left = pad ? 'Stick' : inp.labelFor('moveLeft') + ' ' + inp.labelFor('moveRight');
      this.keysEl.innerHTML = '';
      for (const [k, t] of [[left, 'colour'], [inp.labelFor('interact'), 'spray'], [null, 'Drive off to leave']]) {
        const span = document.createElement('span');
        if (k) {
          const b = document.createElement('kbd');
          b.textContent = k;
          span.append(b, ' ' + t);
        } else span.textContent = t;
        this.keysEl.appendChild(span);
      }
    }

    _confirm() {
      const g = this.game;
      const v = g.player.inVehicle ? g.player.vehicle : null;
      const s = this.here;
      if (!v || !s) return;
      const q = this.quote(v);
      const why = this._blocked(q);
      if (why) {
        g.hud.showToast(why);
        if (g.audio.fail) g.audio.fail();
        return;
      }
      this._close();
      this.job = { s, v, t: 0, paint: PAINTS[this.pick], q, applied: false, cleared: false, cues: 0 };
      g.frozenControls = true;
      v.vel.x = 0;
      v.vel.z = 0;
      this._door(s);
      g.cameraShot = (dt, cam) => this._shot(cam);
    }

    // ---------------------------------------------------------- the job
    _runJob(dt) {
      const j = this.job;
      const g = this.game;
      j.t += dt;
      if (j.v.wrecked || j.v.removed || !g.player.inVehicle || g.player.vehicle !== j.v) {
        this._finish();
        return;
      }
      let k;
      if (j.t < CLOSE) k = smooth(j.t / CLOSE);
      else if (j.t < CLOSE + HOLD) k = 1;
      else k = 1 - smooth((j.t - CLOSE - HOLD) / OPEN);
      this._setDoor(j.s, k);
      this._sounds(j);
      if (!j.applied && j.t > CLOSE + HOLD * 0.5) this._apply(j);
      if (j.t >= CLOSE + HOLD + OPEN + 0.25) this._finish();
    }

    /** The rattle of the door, the hiss of the gun. */
    _sounds(j) {
      const a = this.game.audio;
      if (!a || !a.ready || !a._hit) return;
      const cues = [0, CLOSE + 0.25, CLOSE + 0.95, CLOSE + 1.6, CLOSE + HOLD];
      while (j.cues < cues.length && j.t >= cues[j.cues]) {
        const i = j.cues++;
        const t = a.ctx.currentTime;
        if (i === 0 || i === cues.length - 1) {
          for (let n = 0; n < 16; n++) a._hit({ t: t + n * 0.075, type: 'bandpass', freq: 700 + (n % 3) * 140, q: 2.5, peak: 0.07, attack: 0.003, decay: 0.05 });
          a._hit({ t: t + (i === 0 ? CLOSE - 0.05 : 1.25), type: 'lowpass', freq: 220, q: 0.8, peak: 0.22, attack: 0.004, decay: 0.18, brown: true });
        } else {
          a._hit({ t, type: 'highpass', freq: 3800, q: 0.5, peak: 0.12, attack: 0.08, decay: 0.55 });
        }
      }
    }

    _apply(j) {
      const g = this.game;
      const v = j.v;
      j.applied = true;
      v.model.setColor(j.paint[1]);
      v.repair();
      g.player.money = Math.max(0, g.player.money - j.q.total);
      this.resprays++;
      this.spent += j.q.total;
      j.cleared = !!(g.police && g.police.level > 0);
      if (j.cleared) {
        g.police.setLevel(0, 'respray');
        VH.events.emit('police:evaded', { respray: true });
      }
      VH.events.emit('respray:done', { v, color: j.paint[1], name: j.paint[0], cleared: j.cleared });
    }

    _finish() {
      const g = this.game;
      const j = this.job;
      this.job = null;
      g.frozenControls = false;
      g.cameraShot = null;
      this._setDoor(j.s, 0);
      this._used = j.s;
      const p = g.player;
      if (p.inVehicle && g.cameraRig.snapToCar) g.cameraRig.snapToCar(p.vehicle);
      if (!j.applied) return;
      const bits = [j.paint[0] + (j.q.repair ? ', and fixed up' : '') + '.'];
      if (j.cleared) bits.push('The police have lost you.');
      bits.push(VH.util.formatMoney(j.q.total) + '.');
      g.hud.notify({ title: 'Fresh Coat', text: bits.join(' '), icon: '🎨', duration: 5000 });
    }

    /** Out on the forecourt, looking at the door. */
    _shot(cam) {
      const j = this.job;
      if (!j) return false;
      const { KERB, P } = kit();
      const s = j.s;
      const uc = (s.d0 + s.d1) / 2;
      const [x, z] = P(s.f, uc + 3.2, s.vb0 - 10.5);
      const [lx, lz] = P(s.f, uc, s.vb0);
      cam.position.set(x, KERB + 2.6, z);
      cam.lookAt(lx, KERB + 2.4, lz);
      cam.updateMatrixWorld();
      return true;
    }

    _door(s) {
      if (s._doorMesh) return s._doorMesh;
      const { KERB, P } = kit();
      const tex = shutterTexture();
      const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: tex, metalness: 0.5, roughness: 0.45 });
      const m = new THREE.Mesh(new THREE.BoxGeometry(s.d1 - s.d0, 1, 0.06), mat);
      const [x, z] = P(s.f, (s.d0 + s.d1) / 2, s.vb0 + 0.08);
      m.position.set(x, KERB + DOOR_H / 2, z);
      m.rotation.y = Math.atan2(s.f.vx, s.f.vz);
      m.castShadow = true;
      m.visible = false;
      m.name = 'spray-door';
      this.game.scene.add(m);
      s._doorMesh = m;
      return m;
    }

    /** 0: rolled up, 1: down. */
    _setDoor(s, k) {
      const m = s._doorMesh;
      if (!m) return;
      const { KERB } = kit();
      const h = Math.max(0.001, DOOR_H * k);
      m.visible = k > 0.002;
      m.scale.y = h;
      m.position.y = KERB + DOOR_H - h / 2;
      m.material.map.repeat.set(1, h / 0.24);
    }

    // ---------------------------------------------------------- contract
    blips(out) {
      if (!this.ok) return;
      for (const s of this.list) out.push({ x: s.door.x, z: s.door.z, type: 'spray', label: s.name, noRim: true });
    }

    stats() {
      if (!this.ok) return [];
      return [['Resprays', String(this.resprays)], ['Spent at Fresh Coat', VH.util.formatMoney(this.spent)]];
    }

    serialize() {
      return { resprays: this.resprays, spent: this.spent };
    }

    load(d) {
      d = d || {};
      this.resprays = d.resprays || 0;
      this.spent = d.spent || 0;
    }

    stop() {
      if (!this.ok) return;
      if (this.job) {
        const j = this.job;
        this.job = null;
        this.game.frozenControls = false;
        this.game.cameraShot = null;
        this._setDoor(j.s, 0);
      }
      if (this.card) this._close();
    }

    reset() {
      if (!this.ok) return;
      this.stop();
      this.resprays = 0;
      this.spent = 0;
      this.here = null;
      this._used = null;
      this._told = null;
    }
  }

  // ------------------------------------------------------------------ map
  VH.MapPainters = VH.MapPainters || [];
  VH.MapPainters.push((g, layout, o) => {
    const k = kit();
    if (!k) return;
    for (const s of layout.sprays || []) {
      const r = k.rect(s.f, s.a, s.vb0, s.a + s.GW, s.vb1);
      g.fillStyle = 'rgba(0, 0, 0, 0.3)';
      o.R(r[0] + 1, r[1] + 1, r[2] + 1, r[3] + 1);
      g.fillStyle = '#d23a7f';
      o.R(r[0], r[1], r[2], r[3]);
    }
  });

  VH.SprayShops = SprayShops;
})();
