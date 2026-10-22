/*
 * gunshops.js — Bayline Arms: gun shops where Jay buys weapons, ammo and
 * body armour.
 *
 *   VH.GunShops.plan(layout)              picks car parks for the shops
 *                                         (after stores.js and sprayshops.js)
 *   VH.GunShops.buildLot(world, ctx, lot) builds one: a shop with a glass
 *                                         front, a long display counter and
 *                                         a wall of guns behind it
 *   new VH.GunShops(game)                 the clerks, the gun wall and the
 *                                         shop card
 *
 * Walk up to the counter and press E: the shop card lists ammo for every
 * gun Jay carries (a box at a time, or fill up), body armour, and the guns
 * on sale. New guns come into stock as the story goes on (weapons-data.js
 * shopAfter) and the shop says so. Nobody serves Jay while the police are
 * after him, and pulling a gun on the clerk is a bad idea: he keeps a
 * shotgun under the counter, and if he goes down the shop shuts for a while.
 *
 * Each shop is laid out in its car park's frame (stores.js): u runs along
 * the street front, v runs in from the front edge of the lot.
 */
(function () {
  'use strict';

  const VH = window.VH;
  const { clamp, dampAngle } = VH.math;
  const SALT = 'bayline-2'; // the plan's shuffle (none of these car parks is a story place)
  const QUOTA = { oldmarket: 1, palmcrescent: 1, harborpoint: 1 };
  const SPACING = 250;
  // The car parks the story's places use (places.js picks them: the Grand
  // Parkade, Pelican's repo yard, Southside Division). A shop there would move them.
  const STORY_LOTS = new Set(['b4_0_l3', 'b0_7_l1', 'b5_7_l2']);
  const WALL_H = 4.2;
  const CEIL = 3.6;
  const GLASS_H = 2.9;
  const REOPEN = 480; //   seconds of play before a shop whose clerk was killed opens again
  const ARMOR_PRICE = 5; // dollars per point of armour
  const BRAND = { name: 'Bayline Arms', sign: ['BAYLINE ARMS', 'GUNS · AMMO · ARMOUR'], bg: ['#2a3442', '#151b24'], fg: '#ffd27a', band: 0x2b3746, trim: 0xd9a84e, shirt: 0x3d4a35 };

  let K = null;

  function kit() {
    if (!K) K = VH.Stores && VH.Stores.kit;
    return K;
  }

  function def(id) {
    return VH.Data && VH.Data.weaponsById ? VH.Data.weaponsById[id] : null;
  }

  function pool(id) {
    return VH.Data && VH.Data.ammoTypes ? VH.Data.ammoTypes[id] : null;
  }

  function fit(lot) {
    for (const side of ['s', 'n', 'e', 'w']) {
      if (!lot.front[side]) continue;
      const f = kit().frameFor(lot, side);
      if (f.W >= 15 && f.D >= 17) return side;
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
    const a1 = s.a + s.SW;
    const v0 = s.vb0;
    const v1 = s.vb1;
    const y0 = KERB;
    const yTop = KERB + WALL_H;
    const band = VH.col(BRAND.band);
    const trim = VH.col(BRAND.trim);
    const wallCol = VH.col(rng.pick([0x8f8a80, 0x7d7a74, 0x9a9184]));
    const seed = rng.range(0, 100);
    const shopF = { ww: 0.9, wh: 0.82, style: 4, bay: 2.6, seed };
    const blankF = { style: 0, bay: 4, seed };
    const lot = s.lot;
    const metal = VH.col(0x2b2f35);

    // Forecourt: asphalt round the shop, a few parking bays.
    const W = f.W;
    for (const [u0, q0, u1, q1] of [[0, 0, W, v0], [0, v1, W, f.D], [0, v0, a0, v1], [a1, v0, W, v1]]) {
      if (u1 - u0 < 0.05 || q1 - q0 < 0.05) continue;
      const r = rect(f, u0, q0, u1, q1);
      ctx.asphaltTop.topRect(r[0], r[1], r[2], r[3], KERB, VH.col(0xd4d4d4), 6);
    }
    const white = VH.col(0xe8e8e0);
    if (v0 >= 6) {
      for (let u = a0 + 0.4; u <= a1 + 0.01; u += 2.7) {
        if (u > s.d0 - 2.2 && u < s.d1 + 2.2) continue;
        const r = rect(f, u - 0.06, v0 - 5.6, u + 0.06, v0 - 0.9);
        ctx.marks.box(r[0], KERB, r[1], r[2], KERB + 0.001, r[3], white, { skip: { n: true, s: true, e: true, w: true } });
      }
    }

    // --- shell (the same construction as a corner shop)
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
    const DOOR_H = 2.45;
    wallBox(a0 + T, v0, s.d0, v0 + T, y0, y0 + GLASS_H, ['front', 'back']);
    wallBox(s.d1, v0, a1 - T, v0 + T, y0, y0 + GLASS_H, ['front', 'back']);
    D.facade(a0, v0, s.d0, v0, y0, GLASS_H, 0, -1, wallCol, shopF);
    D.facade(s.d1, v0, a1, v0, y0, GLASS_H, 0, -1, wallCol, shopF);
    wallBox(s.d0, v0, s.d1, v0 + T, y0 + DOOR_H, y0 + GLASS_H, ['back'], true);
    wallBox(a0 + T, v0, a1 - T, v0 + T, y0 + GLASS_H, yTop, ['back']);
    D.box('b', a0 - 0.15, y0 + GLASS_H, v0 - 0.22, a1 + 0.15, yTop + 0.15, v0, band, { bottom: true });
    D.box('prop', a0 - 0.16, y0 + GLASS_H - 0.12, v0 - 0.24, a1 + 0.16, y0 + GLASS_H, v0, trim, { bottom: true });
    D.box('prop', s.d0, y0, v0 - 0.02, s.d0 + 0.08, y0 + DOOR_H, v0 + T + 0.02, metal);
    D.box('prop', s.d1 - 0.08, y0, v0 - 0.02, s.d1, y0 + DOOR_H, v0 + T + 0.02, metal);
    // Security bars across the windows.
    for (let u = a0 + 0.5; u < a1 - 0.3; u += 0.32) {
      if (u > s.d0 - 0.1 && u < s.d1 + 0.1) continue;
      D.box('prop', u, y0 + 0.3, v0 - 0.08, u + 0.035, y0 + GLASS_H - 0.1, v0 - 0.04, metal);
    }
    const r = rect(f, a0, v0 - 0.22, a1, v1);
    ctx.b.quad([r[0], yTop, r[3]], [r[2], yTop, r[3]], [r[2], yTop, r[1]], [r[0], yTop, r[1]], [0, 1, 0], VH.col(0x8f8c86), null, null, [0, 0, -1, seed]);
    const par = VH.colMul(wallCol, 0.9);
    D.box('b', a0, yTop, v1 - 0.25, a1, yTop + 0.5, v1, par);
    D.box('b', a0, yTop, v0 + T - 0.25, a0 + 0.25, yTop + 0.5, v1 - 0.25, par);
    D.box('b', a1 - 0.25, yTop, v0 + T - 0.25, a1, yTop + 0.5, v1 - 0.25, par);
    D.box('prop', a0 + 2, yTop, v0 + s.SD * 0.55, a0 + 3.6, yTop + 1.0, v0 + s.SD * 0.55 + 1.2, VH.col(0xb9bcbf));

    const FLAGS = VH.COLLIDE.ALL;
    D.collide(a0, 0, v1 - T, a1, yTop + 0.5, v1, 'building', FLAGS);
    D.collide(a0, 0, v0, a0 + T, yTop + 0.5, v1, 'building', FLAGS);
    D.collide(a1 - T, 0, v0, a1, yTop + 0.5, v1, 'building', FLAGS);
    D.collide(a0, 0, v0 - 0.2, s.d0, yTop + 0.5, v0 + T, 'building', FLAGS);
    D.collide(s.d1, 0, v0 - 0.2, a1, yTop + 0.5, v0 + T, 'building', FLAGS);
    D.collide(s.d0, y0 + DOOR_H, v0 - 0.2, s.d1, yTop + 0.5, v0 + T, 'building', FLAGS);
    D.collide(a0, y0 + CEIL, v0, a1, yTop + 0.5, v1, 'building', FLAGS);

    // --- inside: dark green walls, a concrete floor, a long glass counter, the gun wall
    const i0 = a0 + T;
    const i1 = a1 - T;
    const q0 = v0 + T;
    const q1 = v1 - T;
    const yc = y0 + CEIL;
    const dado = VH.col(0x2f3a2c);
    const paint = VH.col(0x4e5d48);
    const two = (u0, w0, u1, w1, nu, nv) => {
      D.vquad('interior', u0, w0, u1, w1, y0, y0 + 1.0, nu, nv, dado);
      D.vquad('interior', u0, w0, u1, w1, y0 + 1.0, yc, nu, nv, paint);
    };
    two(i0, q1, i1, q1, 0, -1);
    two(i0, q0, i0, q1, 1, 0);
    two(i1, q0, i1, q1, -1, 0);
    two(i0, q0, s.d0, q0, 0, 1);
    two(s.d1, q0, i1, q0, 0, 1);
    D.vquad('interior', s.d0, q0, s.d1, q0, y0 + DOOR_H, yc, 0, 1, paint);
    const sky = VH.col(0xcfe4f2, 1.05);
    D.vquad('screen', i0 + 0.4, q0 + 0.01, s.d0 - 0.3, q0 + 0.01, y0 + 1.05, y0 + 2.6, 0, 1, sky);
    if (s.d1 + 0.3 < i1 - 0.4) D.vquad('screen', s.d1 + 0.3, q0 + 0.01, i1 - 0.4, q0 + 0.01, y0 + 1.05, y0 + 2.6, 0, 1, sky);
    D.hquad('interior', i0, q0, i1, q1, y0 + 0.012, 1, VH.col(0x8a8a86));
    for (let u = i0 + 1.0; u < i1 - 0.5; u += 2.0) D.hquad('interior', u, q0, Math.min(u + 0.05, i1), q1, y0 + 0.018, 1, VH.col(0x6e6e6a));
    D.hquad('interior', i0, q0, i1, q1, yc, -1, VH.col(0x3c3f3a));
    const lamp = VH.col(0xfff2dc, 1.5);
    for (let u = i0 + 1.4; u < i1 - 1.0; u += 2.8) D.hquad('screen', u, q0 + 1.2, u + 1.4, q0 + 1.5, yc - 0.01, -1, lamp);
    for (let u = i0 + 1.4; u < i1 - 1.0; u += 2.8) D.hquad('screen', u, s.cv - 0.6, u + 1.4, s.cv - 0.3, yc - 0.01, -1, lamp);
    D.hquad('interior', s.d0, q0, s.d1, q0 + 1.4, y0 + 0.028, 1, VH.col(0x2a2c30));

    // The counter: a dark base, a lit glass case on top, a wood rail.
    const cu0 = i0 + 0.9;
    const cu1 = i1 - 0.9;
    const cv0 = s.cv - 0.35;
    const cv1 = s.cv + 0.35;
    D.box('interior', cu0, y0, cv0, cu1, y0 + 0.75, cv1, VH.col(0x23262b));
    D.vquad('screen', cu0 + 0.05, cv0 - 0.006, cu1 - 0.05, cv0 - 0.006, y0 + 0.78, y0 + 1.05, 0, -1, VH.col(0xbfd8ff, 0.95));
    D.box('interior', cu0, y0 + 1.05, cv0, cu1, y0 + 1.1, cv1, VH.col(0x5a3a22));
    for (let u = cu0 + 0.6; u < cu1 - 0.4; u += 0.9) {
      // Pistols in the case (dark shapes behind the lit glass).
      D.box('interior', u, y0 + 0.85, cv0 + 0.1, u + 0.38, y0 + 0.88, cv0 + 0.32, VH.col(rng.pick([0x1d1f23, 0x3a3f46, 0x8f969d])));
    }
    D.collide(cu0, 0, cv0, cu1, y0 + 1.1, cv1, 'counter', FLAGS);
    // The gun wall: a pegboard panel behind the counter (the guns themselves are added at runtime).
    D.box('interior', i0 + 0.6, y0 + 1.0, q1 - 0.06, i1 - 0.6, y0 + 3.1, q1, VH.col(0x8a6b4a));
    for (let y = y0 + 1.15; y < y0 + 3.05; y += 0.2) D.box('interior', i0 + 0.62, y, q1 - 0.07, i1 - 0.62, y + 0.012, q1 - 0.06, VH.col(0x6d5238));
    // Ammo shelves down the left wall.
    const sv0 = q0 + 1.0;
    const sv1 = s.cv - 1.4;
    if (sv1 - sv0 > 1.2) {
      D.box('interior', i0, y0, sv0, i0 + 0.45, y0 + 2.0, sv1, VH.col(0x2f3338));
      const boxes = [0x6b7340, 0x7c6a3a, 0x8a3b2c, 0x3d5a3a, 0x2f4a6b, 0xd9a84e];
      for (let lvl = 0; lvl < 4; lvl++) {
        const y = y0 + 0.25 + lvl * 0.45;
        for (let v = sv0 + 0.1; v < sv1 - 0.3; v += 0.36) {
          if (rng.chance(0.15)) continue;
          D.box('interior', i0 + 0.12, y, v, i0 + 0.45, y + 0.22, v + 0.3, VH.col(rng.pick(boxes)));
        }
      }
      D.collide(i0, 0, sv0, i0 + 0.5, y0 + 2.0, sv1, 'shelf', FLAGS);
    }
    // A paper target on the right wall.
    const tv = (q0 + s.cv) / 2;
    D.vquad('interior', i1 - 0.02, tv - 0.45, i1 - 0.02, tv + 0.45, y0 + 1.3, y0 + 2.4, -1, 0, VH.col(0xf1ede2));
    for (const [rr, c] of [[0.36, 0x1d1f23], [0.26, 0xf1ede2], [0.16, 0x1d1f23], [0.07, 0xc8102e]]) D.vquad('interior', i1 - 0.03 - rr * 0.001, tv - rr, i1 - 0.03 - rr * 0.001, tv + rr, y0 + 1.85 - rr, y0 + 1.85 + rr, -1, 0, VH.col(c));

    // --- signs and light
    const yawOut = Math.atan2(-f.vx, -f.vz);
    const [sx, sz] = P(f, (a0 + a1) / 2, v0 - 0.25);
    const signs = world.signs || (world.signs = []);
    signs.push({ x: sx, y: y0 + GLASS_H + (WALL_H - GLASS_H) / 2 + 0.05, z: sz, yaw: yawOut, w: Math.min(s.SW - 2, 9), h: 0.95, lines: BRAND.sign, style: 'brand', colors: { bg: BRAND.bg, fg: BRAND.fg }, frame: BRAND.band });
    const [ox, oz] = P(f, s.d0 - 1.0, v0 - 0.02);
    signs.push({ x: ox, y: y0 + 2.2, z: oz, yaw: yawOut, w: 0.9, h: 0.35, lines: ['OPEN'], style: 'neon' });
    const pools = world.floodlights || (world.floodlights = []);
    const [cx, cz] = P(f, (a0 + a1) / 2, (v0 + v1) / 2);
    pools.push({ x: cx, z: cz, r: Math.min(s.SW, s.SD) * 0.55, y: KERB + 0.03 });
    const [fx, fz] = P(f, (a0 + a1) / 2, v0 - 3);
    pools.push({ x: fx, z: fz, r: 5, y: KERB + 0.03 });
    return yTop + 0.5;
  }

  // ------------------------------------------------------------ the clerk
  /** Stands behind the counter, watches Jay while he's in the shop. */
  class GunClerkBrain {
    constructor(shops, s) {
      this.shops = shops;
      this.s = s;
      this.hostile = false;
      this.watch = false;
    }

    update(a, dt) {
      if (a.dead) return;
      const post = this.s.clerk;
      a.moveSpeed = 0;
      a.anim.aim = 0;
      const dx = post.x - a.pos.x;
      const dz = post.z - a.pos.z;
      if (Math.hypot(dx, dz) > 0.4) {
        a.heading = dampAngle(a.heading, Math.atan2(dx, dz), 8, dt);
        a.moveSpeed = 1.1;
        return;
      }
      const p = this.shops.game.player;
      const want = this.watch ? Math.atan2(p.pos.x - a.pos.x, p.pos.z - a.pos.z) : post.heading;
      a.heading = dampAngle(a.heading, want, 5, dt);
    }
  }

  // ================================================================ shops
  class GunShops {
    static plan(layout) {
      const k = kit();
      if (!k) return [];
      const lots = [];
      for (const b of layout.blocks) {
        if (b.kind !== 'buildings' || k.AVOID_BLOCKS.has(b.id)) continue;
        for (const l of b.lots) if (l.kind === 'parking' && !l.store && !l.spray && !STORY_LOTS.has(l.id)) lots.push(l);
      }
      lots.sort((p, q) => k.hashString(p.id + SALT) - k.hashString(q.id + SALT));
      const others = [].concat(layout.stores || [], layout.sprays || []);
      const chosen = [];
      const count = {};
      const clear = (l) => chosen.every((c) => Math.hypot(c.lot.cx - l.cx, c.lot.cz - l.cz) > SPACING) && others.every((s) => Math.hypot(s.lot.cx - l.cx, s.lot.cz - l.cz) > 45);
      for (const l of lots) {
        const d = l.district.id;
        if (!QUOTA[d] || (count[d] || 0) >= QUOTA[d]) continue;
        const side = fit(l);
        if (!side || !clear(l)) continue;
        chosen.push({ lot: l, side });
        count[d] = (count[d] || 0) + 1;
      }
      chosen.sort((p, q) => p.lot.cx - q.lot.cx || p.lot.cz - q.lot.cz);
      layout.gunshops = chosen.map((c, i) => GunShops._describe(layout, c, i));
      for (const s of layout.gunshops) s.lot.gun = s;
      return layout.gunshops;
    }

    static _describe(layout, c, i) {
      const k = kit();
      const lot = c.lot;
      const f = k.frameFor(lot, c.side);
      const SW = clamp(Math.floor(f.W - 3), 12, 16);
      const SD = clamp(Math.floor(f.D - 6.5), 10, 13);
      const a = (f.W - SW) / 2;
      const vb1 = f.D - 0.6;
      const vb0 = vb1 - SD;
      const d1 = a + SW - 1.8;
      const d0 = d1 - 2.0;
      const cv = vb1 - 2.3; // the counter's centre line
      const at = (u, v) => {
        const [x, z] = k.P(f, u, v);
        return { x, z };
      };
      const clerk = at(a + SW / 2, vb1 - 1.35);
      clerk.heading = Math.atan2(-f.vx, -f.vz);
      const front = at((d0 + d1) / 2, -3);
      const road = VH.CityGen.roadNameAt(layout, front.x, front.z);
      return {
        id: 'gunshop_' + (i + 1),
        name: BRAND.name + (road ? ', ' + road : ''),
        lot,
        district: lot.district.id,
        f, a, SW, SD, vb0, vb1, d0, d1, cv,
        clerk,
        stand: at(a + SW / 2, cv - 1.0),
        door: at((d0 + d1) / 2, vb0 - 1.2),
        centre: at(a + SW / 2, (vb0 + vb1) / 2),
        yawIn: Math.atan2(f.vx, f.vz),
        seed: k.hashString(lot.id + SALT),
      };
    }

    static buildLot(world, ctx, lot) {
      return buildShop(world, ctx, lot.gun);
    }

    static registerPlaces(world, places) {
      for (const s of places.layout.gunshops || []) {
        places.add(s.id, { name: s.name, x: s.door.x, z: s.door.z, yaw: s.yawIn, kind: 'gunshop', district: s.district });
      }
    }

    // ------------------------------------------------------------ runtime
    constructor(game) {
      this.game = game;
      this.list = game.layout.gunshops || [];
      this.ok = this.list.length > 0 && !!kit();
      this.saveKey = 'gunshops';
      this.until = {}; //  shop id → playTime it opens again
      this.spent = 0;
      this.bought = 0;
      this.seen = {}; //   weapons already announced as new in stock
      this.clerks = new Map();
      this.racks = new Map();
      this.open = null; // the shop whose card is up
      this.sel = 0;
      this.rows = [];
      this.mode = {}; //   row key → 'box' | 'fill'
      this._stick = { x: 0, y: 0 };
      if (!this.ok) return;
      for (const s of this.list) {
        game.interaction.register({ id: s.id + '_counter', kind: 'gunCounter', shop: s.id, x: s.stand.x, y: game.physics.groundHeight(s.stand.x, s.stand.z, 2) + 1, z: s.stand.z, radius: 1.8, label: 'Browse ' + BRAND.name });
        s.item = game.interaction.items[game.interaction.items.length - 1];
      }
      game.interaction.on('gunCounter', (item) => {
        this._openCard(this.list.find((s) => s.id === item.shop));
        return 0.4;
      });
      this._buildCard();
      VH.events.on('mission:pass', (e) => this._newStock(e.m));
      VH.events.on('agent:hurt', (e) => this._clerkHurt(e));
      VH.events.on('agent:died', (e) => this._clerkHurt(e));
    }

    isOpen(s) {
      return this.game.playTime >= (this.until[s.id] || 0);
    }

    _clerkOf(s) {
      const a = this.clerks.get(s.id);
      return a && !a.removed ? a : null;
    }

    // ---------------------------------------------------------- clerks
    _spawnClerk(s) {
      const g = this.game;
      const look = Object.assign({}, VH.Crowd.randomLook(), { top: BRAND.shirt, shirt: BRAND.shirt });
      const a = g.crowd.spawn(s.clerk.x, s.clerk.z, { look, faction: 'civilian', role: 'clerk', persistent: true, heading: s.clerk.heading, name: 'Clerk', health: 90 });
      a.brain = new GunClerkBrain(this, s);
      a.dropWeapon = 'shotgun';
      this.clerks.set(s.id, a);
      return a;
    }

    _removeClerk(s) {
      const a = this.clerks.get(s.id);
      if (a && !a.removed) this.game.crowd.remove(a);
      this.clerks.delete(s.id);
    }

    /** The clerk under fire, or covered by a gun, reaches under the counter. */
    _fight(s, a) {
      const g = this.game;
      if (!a || a.dead || !(a.brain instanceof GunClerkBrain)) return;
      if (this.open === s) this._closeCard();
      a.weapon = 'shotgun';
      const brain = new VH.CombatBrain(g.combat, { weapon: 'shotgun', alert: true, hostile: true, accuracy: 0.45, aggression: 0.3, guard: { x: s.clerk.x, z: s.clerk.z, r: 2.5 } });
      brain.expired = () => false;
      a.brain = brain;
      g.police.crime('shots', s.centre.x, s.centre.z);
      if (g.police.level < 2) g.police.setLevel(2, 'gunshop');
      g.hud.notify({ title: BRAND.name, text: "Bad idea. The clerk keeps a shotgun under the counter, and he's called it in.", icon: '⚠', tone: 'bad' });
    }

    _clerkHurt(e) {
      if (!this.ok || e.source !== 'player') return;
      for (const s of this.list) {
        const a = this.clerks.get(s.id);
        if (a !== e.agent) continue;
        if (e.agent.dead) {
          this.until[s.id] = this.game.playTime + REOPEN;
          if (this.open === s) this._closeCard();
        } else this._fight(s, a);
      }
    }

    // ---------------------------------------------------------- update
    update(dt) {
      if (!this.ok) return;
      const g = this.game;
      const p = g.player;
      for (const s of this.list) {
        const d = Math.hypot(p.pos.x - s.centre.x, p.pos.z - s.centre.z);
        let a = this.clerks.get(s.id);
        if (a && a.removed) {
          this.clerks.delete(s.id);
          a = null;
        }
        if (!a && d < 75 && this.isOpen(s)) a = this._spawnClerk(s);
        else if (a && d > 110) this._removeClerk(s);
        // Covering the clerk with a gun from inside the shop: he fights.
        if (a && !a.dead && a.brain instanceof GunClerkBrain) {
          a.brain.watch = d < 9;
          if (d < 9 && p.aiming && g.combat.playerArmed && this._covered(a)) this._fight(s, a);
        }
        const ready = !!(a && !a.dead && a.brain instanceof GunClerkBrain) && this.isOpen(s);
        if (s.item) s.item.enabled = ready;
        this._rack(s, d);
      }
      if (this.open) this._cardInput(dt);
    }

    /** Is Jay pointing a gun at this person? */
    _covered(a) {
      const g = this.game;
      const cam = g.renderer.camera;
      const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(g.cameraRig.aimQuaternion || cam.quaternion);
      const h = g.crowd.raycast(cam.position.x, cam.position.y, cam.position.z, dir.x, dir.y, dir.z, 30);
      return !!(h && h.agent === a);
    }

    // --------------------------------------------------- the gun wall
    /** The guns on sale, hung on the wall behind the counter (built when Jay is near). */
    _rack(s, d) {
      const near = d < 28;
      let r = this.racks.get(s.id);
      if (!near) {
        if (r) r.group.visible = false;
        return;
      }
      const key = this._stockKey();
      if (r && r.key === key) {
        r.group.visible = true;
        return;
      }
      if (r) this.game.scene.remove(r.group);
      const g = new THREE.Group();
      g.name = 'gun wall ' + s.id;
      const k = kit();
      const guns = this._stock().filter((w) => w.kind !== 'melee' && w.kind !== 'thrown').slice(0, 12);
      const cols = 4;
      const u0 = s.a + 1.2;
      const span = s.SW - 2.4;
      guns.forEach((w, i) => {
        let m;
        try {
          m = VH.WeaponModels.build(w.id);
        } catch (e) {
          return;
        }
        const col = i % cols;
        const row = Math.floor(i / cols);
        const u = u0 + (col + 0.5) * (span / cols);
        const y = KERB() + 2.75 - row * 0.62;
        const [x, z] = k.P(s.f, u, s.vb1 - 0.36);
        m.position.set(x, y, z);
        // Hung sideways on the wall, barrel to the right as you face it.
        const right = Math.atan2(s.f.ux, s.f.uz);
        m.rotation.set(0, right, 0);
        m.traverse((o) => {
          if (o.isMesh) o.castShadow = false;
        });
        g.add(m);
      });
      this.game.scene.add(g);
      this.racks.set(s.id, { group: g, key });
    }

    /** Guns the shops sell now. */
    _stock() {
      const done = (this.game.missions && this.game.missions.completed) || {};
      return (VH.Data.weapons || []).filter((w) => w.price > 0 && VH.Data.weaponUnlocked(w, done));
    }

    _stockKey() {
      return this._stock().map((w) => w.id).join(',');
    }

    /** A job done: anything that has just come into stock gets a mention. */
    _newStock(m) {
      if (!m) return;
      const fresh = (VH.Data.weapons || []).filter((w) => {
        if (!w.shopAfter || this.seen[w.id]) return false;
        const need = Array.isArray(w.shopAfter) ? w.shopAfter : [w.shopAfter];
        return need.includes(m.id);
      });
      if (!fresh.length) return;
      for (const w of fresh) this.seen[w.id] = true;
      setTimeout(() => {
        const g = this.game;
        if (g.state !== 'playing' && g.state !== 'dialog') return;
        g.hud.notify({ title: 'New at ' + BRAND.name, text: fresh.map((w) => w.name).join(', ') + (fresh.length === 1 ? ' is' : ' are') + ' in stock. Look for the gun on the map.', icon: '🔫', duration: 7000 });
      }, 7000);
    }

    // ---------------------------------------------------------- the card
    _buildCard() {
      const el = (tag, cls, text) => {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text !== undefined) e.textContent = text;
        return e;
      };
      const card = el('div', 'gun-card');
      const head = el('div', 'gun-head');
      head.append(el('b', '', 'BAYLINE ARMS'), el('span', 'gun-cash'));
      this.cashEl = head.querySelector('.gun-cash');
      this.listEl = el('div', 'gun-list');
      this.infoEl = el('div', 'gun-info');
      this.warnEl = el('div', 'gun-warn');
      this.keysEl = el('div', 'gun-keys');
      card.append(head, this.listEl, this.infoEl, this.warnEl, this.keysEl);
      this.game.hud.root.appendChild(card);
      this.cardEl = card;
      this._el = el;
    }

    _openCard(s) {
      const g = this.game;
      if (!s || this.open) return;
      if (g.police && g.police.level > 0) {
        g.hud.showToast("The clerk won't serve you with the police after you.");
        return;
      }
      const a = this._clerkOf(s);
      if (!a || a.dead || !(a.brain instanceof GunClerkBrain)) {
        g.hud.showToast("Nobody's serving.");
        return;
      }
      this.open = s;
      g.player.frozen = true;
      g.player.keepPresses = true; // Space / C close the card
      g.interaction.enabled = false; // E buys while the card is up
      const inp = g.input;
      for (const k of ['interact', 'moveForward', 'moveBack', 'moveLeft', 'moveRight', 'jump', 'crouch']) inp.discard(k);
      inp.takeWheel();
      this.sel = 0;
      this._rows();
      // Start on a gun Jay is short of ammo for, else the first row.
      this.cardEl.classList.add('visible');
      document.body.classList.add('shop-open'); // the checklist and weapon panel step aside
      this._refresh();
      if (!this._greeted) {
        this._greeted = true;
        g.hud.showToast('Welcome to Bayline Arms');
      }
    }

    _closeCard() {
      const g = this.game;
      if (!this.open) return;
      this.open = null;
      g.player.frozen = false;
      g.player.keepPresses = false;
      g.interaction.enabled = true;
      g.input.discard('interact');
      this.cardEl.classList.remove('visible');
      document.body.classList.remove('shop-open');
    }

    /** Everything on the card: ammo for Jay's guns, armour, then the guns by slot. */
    _rows() {
      const g = this.game;
      const c = g.combat;
      const done = (g.missions && g.missions.completed) || {};
      const rows = [];
      // Ammo for every pool Jay can use.
      const pools = [];
      for (const w of VH.Data.weapons) if (w.ammoType && c.has(w.id) && !pools.includes(w.ammoType)) pools.push(w.ammoType);
      for (const k of pools) {
        const t = pool(k);
        const own = VH.Data.weapons.filter((w) => w.ammoType === k && c.has(w.id));
        const users = own.map((w) => w.name);
        rows.push({ type: 'ammo', key: 'ammo:' + k, pool: k, name: t.name, users, icon: own[0].id });
      }
      rows.push({ type: 'armor', key: 'armor', name: 'Body armour' });
      for (const slot of VH.Data.weaponSlots) {
        if (slot.id === 'unarmed') continue;
        for (const w of VH.Data.weaponsInSlot(slot.id)) {
          if (!w.price) continue;
          const unlocked = VH.Data.weaponUnlocked(w, done);
          const need = w.shopAfter ? (Array.isArray(w.shopAfter) ? w.shopAfter : [w.shopAfter])[0] : null;
          const job = need && g.missions && g.missions.all ? g.missions.all.get(need) : null;
          rows.push({ type: 'weapon', key: 'w:' + w.id, id: w.id, name: w.name, slot: slot.name, unlocked, after: job ? job.title : null });
        }
      }
      this.rows = rows;
      this.sel = clamp(this.sel, 0, rows.length - 1);
    }

    /** What a row costs and gives right now, and why not if it can't be bought. */
    quote(row) {
      const g = this.game;
      const c = g.combat;
      const p = g.player;
      if (row.type === 'ammo') {
        const t = pool(row.pool);
        const room = c.ammoRoom(row.pool);
        const fill = this.mode[row.key] === 'fill';
        const n = fill ? room : Math.min(t.box, room);
        const price = Math.max(5, Math.ceil(((n / t.box) * t.price) / 5) * 5);
        return { n, price: n ? price : 0, note: (c.ammo[row.pool] || 0) + ' / ' + t.max, why: !n ? 'Full' : null, label: fill ? 'Fill up' : '+' + n };
      }
      if (row.type === 'armor') {
        const room = Math.round(p.maxArmor - p.armor);
        const fill = this.mode[row.key] === 'fill';
        const n = fill ? room : Math.min(50, room);
        return { n, price: n * ARMOR_PRICE, note: Math.round(p.armor) + ' / ' + p.maxArmor, why: !n ? 'Full' : null, label: fill ? 'Full set' : '+' + n };
      }
      const w = def(row.id);
      if (!row.unlocked) return { n: 0, price: w.price, note: row.after ? "After '" + row.after + "'" : 'Later', why: 'Not in stock yet', label: 'Locked' };
      if (w.kind === 'thrown') {
        const room = c.ammoRoom(w.ammoType);
        return { n: Math.min(1, room), price: pool(w.ammoType).price, note: c.has(w.id) ? c.reserve(w.id) + c.ammoView(w.id).mag + ' carried' : '', why: !room ? 'Full' : null, label: '+1' };
      }
      if (c.has(w.id)) return { n: 0, price: 0, note: 'Owned', why: 'You have one', label: 'Owned' };
      return { n: 1, price: w.price, note: '', why: null, label: 'Buy' };
    }

    _cardInput() {
      const g = this.game;
      const inp = g.input;
      if (g.state !== 'playing' || (g.police && g.police.level > 0)) {
        this._closeCard();
        return;
      }
      let step = 0;
      if (inp.consume('moveForward')) step--;
      if (inp.consume('moveBack')) step++;
      const wheel = inp.takeWheel();
      if (wheel) step += Math.sign(wheel);
      let side = 0;
      if (inp.consume('moveLeft')) side--;
      if (inp.consume('moveRight')) side++;
      const pad = inp.pad;
      if (pad && pad.connected) {
        const y = pad.move.y;
        const x = pad.move.x;
        if (Math.abs(y) > 0.6 && Math.abs(this._stick.y) <= 0.6) step += Math.sign(y);
        if (Math.abs(x) > 0.6 && Math.abs(this._stick.x) <= 0.6) side += Math.sign(x);
        this._stick.x = x;
        this._stick.y = y;
      }
      if (step) {
        this.sel = (this.sel + step + this.rows.length) % this.rows.length;
        if (g.audio.click) g.audio.click();
        this._refresh();
      }
      if (side) {
        const row = this.rows[this.sel];
        if (row && (row.type === 'ammo' || row.type === 'armor')) {
          this.mode[row.key] = this.mode[row.key] === 'fill' ? 'box' : 'fill';
          if (g.audio.click) g.audio.click();
          this._refresh();
        }
      }
      if (inp.consume('interact')) this._buy();
      if (inp.consume('jump') || inp.consume('crouch')) this._closeCard();
    }

    _buy() {
      const g = this.game;
      const c = g.combat;
      const p = g.player;
      const row = this.rows[this.sel];
      if (!row) return;
      const q = this.quote(row);
      if (q.why) {
        g.hud.showToast(q.why);
        return;
      }
      if (p.money < q.price) {
        g.hud.showToast('You need ' + VH.util.formatMoney(q.price) + '.');
        if (g.audio.fail) g.audio.fail();
        return;
      }
      g.giveMoney(-q.price, 'gun shop');
      this.spent += q.price;
      this.bought++;
      const a = g.audio;
      if (row.type === 'ammo') {
        c.addAmmo(row.pool, q.n);
        if (a.ammoPickup) a.ammoPickup();
      } else if (row.type === 'armor') {
        p.armor = Math.min(p.maxArmor, p.armor + q.n);
        if (a.armorPickup) a.armorPickup();
      } else {
        const w = def(row.id);
        if (w.kind === 'thrown') c.giveWeapon(w.id, 1, c.has(w.id));
        else {
          c.giveWeapon(w.id);
          c.select(w.id);
          this._rows(); // its ammo gets a row now
        }
        if (a.purchase) a.purchase();
      }
      VH.events.emit('gunshop:buy', { row: row.key, price: q.price });
      this._refresh();
    }

    _refresh() {
      const g = this.game;
      const el = this._el;
      const money = VH.util.formatMoney;
      this.cashEl.textContent = money(g.player.money);
      const list = this.listEl;
      list.replaceChildren();
      let lastGroup = null;
      this.rows.forEach((row, i) => {
        const group = row.type === 'ammo' ? 'Ammo' : row.type === 'armor' ? 'Armour' : row.slot;
        if (group !== lastGroup) {
          lastGroup = group;
          list.append(el('div', 'gun-group', group));
        }
        const q = this.quote(row);
        const r = el('div', 'gun-row' + (i === this.sel ? ' on' : '') + (q.why ? ' dim' : ''));
        const icon = el('i', 'gun-icon');
        if ((row.type === 'weapon' || row.icon) && VH.WeaponWheel && VH.WeaponWheel.icon) {
          const ic = VH.WeaponWheel.icon(row.type === 'weapon' ? row.id : row.icon);
          if (typeof ic === 'string') icon.innerHTML = ic;
          else if (ic && ic.nodeType) icon.append(ic);
        } else icon.textContent = row.type === 'armor' ? '🛡' : '▮';
        const name = el('span', 'gun-name', row.name);
        const note = el('em', 'gun-note', q.note);
        const price = el('b', 'gun-price', q.why && row.type === 'weapon' && !row.unlocked ? '' : q.price ? money(q.price) : '');
        const act = el('u', 'gun-act', q.why || q.label);
        r.append(icon, name, note, act, price);
        list.append(r);
      });
      // Keep the selected row in view.
      const on = list.querySelector('.gun-row.on');
      if (on) {
        const top = on.offsetTop - list.offsetTop;
        if (top < list.scrollTop + 30) list.scrollTop = Math.max(0, top - 30);
        else if (top + on.offsetHeight > list.scrollTop + list.clientHeight - 10) list.scrollTop = top + on.offsetHeight - list.clientHeight + 10;
      }
      this._info();
      const inp = g.input;
      const pad = inp.lastDevice === 'gamepad';
      this.keysEl.replaceChildren();
      const keys = pad ? [['Stick', 'choose'], ['Y', 'buy'], ['B', 'leave']] : [[inp.labelFor('moveForward') + ' ' + inp.labelFor('moveBack'), 'choose'], [inp.labelFor('moveLeft') + ' ' + inp.labelFor('moveRight'), 'box / fill'], [inp.labelFor('interact'), 'buy'], [inp.labelFor('jump'), 'leave']];
      for (const [k, t] of keys) {
        const sp = el('span');
        const b = el('kbd', '', k);
        sp.append(b, ' ' + t);
        this.keysEl.append(sp);
      }
    }

    /** The selected row in more detail: a gun's description and stats, which guns take an ammo. */
    _info() {
      const el = this._el;
      const info = this.infoEl;
      info.replaceChildren();
      const row = this.rows[this.sel];
      if (!row) return;
      if (row.type === 'ammo') {
        info.append(el('p', '', 'For: ' + row.users.join(', ')));
        return;
      }
      if (row.type === 'armor') {
        info.append(el('p', '', 'Soaks up gunfire before it reaches you. ' + VH.util.formatMoney(ARMOR_PRICE * 10) + ' for every 10 points.'));
        return;
      }
      const w = def(row.id);
      info.append(el('p', '', w.desc));
      const bars = this._statBars(w);
      if (!bars) return;
      const grid = el('div', 'gun-stats');
      for (const b of bars) {
        const line = el('div', 'gun-stat');
        const fill = el('i');
        fill.style.width = Math.round(clamp(b.value, 0, 1) * 100) + '%';
        const bar = el('span', 'gun-bar');
        bar.append(fill);
        line.append(el('em', '', b.label), bar);
        grid.append(line);
      }
      info.append(grid);
      if (w.ammoType) info.append(el('p', 'gun-ammo', 'Takes ' + pool(w.ammoType).name + (w.magSize > 1 ? ' · ' + w.magSize + ' in a magazine' : '')));
    }

    _statBars(w) {
      if (VH.WeaponWheel && VH.WeaponWheel.statBars) {
        const b = VH.WeaponWheel.statBars(w);
        if (Array.isArray(b)) return b;
        if (b && typeof b === 'object') return Object.keys(b).filter((k) => typeof b[k] === 'number').map((k) => ({ label: k.charAt(0).toUpperCase() + k.slice(1), value: b[k] }));
      }
      if (w.kind === 'melee') return [{ label: 'Damage', value: w.damage / 50 }, { label: 'Speed', value: w.fireRate / 2.5 }, { label: 'Reach', value: w.range / 2.2 }];
      const dmg = (w.damage * (w.pellets || 1)) / (w.kind === 'projectile' ? 400 : 140);
      return [
        { label: 'Damage', value: dmg },
        { label: 'Fire rate', value: w.fireRate / 15 },
        { label: 'Range', value: Math.log(1 + (w.range || 40)) / Math.log(451) },
        { label: 'Magazine', value: Math.log(1 + (w.magSize || 1)) / Math.log(301) },
      ];
    }

    // ---------------------------------------------------------- contract
    blips(out) {
      if (!this.ok) return;
      for (const s of this.list) {
        if (!this.isOpen(s)) continue;
        out.push({ x: s.door.x, z: s.door.z, type: 'gunshop', label: s.name, noRim: true });
      }
    }

    stats() {
      if (!this.ok) return [];
      return [['Spent at Bayline Arms', VH.util.formatMoney(this.spent)]];
    }

    serialize() {
      const until = {};
      for (const k of Object.keys(this.until)) if (this.until[k] > this.game.playTime) until[k] = Math.round(this.until[k]);
      return { until, spent: this.spent, bought: this.bought, seen: Object.keys(this.seen) };
    }

    load(d) {
      d = d || {};
      this.until = Object.assign({}, d.until || {});
      this.spent = d.spent || 0;
      this.bought = d.bought || 0;
      this.seen = {};
      for (const id of d.seen || []) this.seen[id] = true;
      // Everything already unlocked by the save counts as announced.
      const done = (this.game.missions && this.game.missions.completed) || {};
      for (const w of VH.Data.weapons || []) if (w.shopAfter && VH.Data.weaponUnlocked(w, done)) this.seen[w.id] = true;
    }

    stop() {
      if (this.open) this._closeCard();
    }

    reset() {
      if (!this.ok) return;
      this.stop();
      for (const s of this.list) this._removeClerk(s);
      this.until = {};
      this.spent = 0;
      this.bought = 0;
      this.seen = {};
    }
  }

  function KERB() {
    return kit().KERB;
  }

  // ------------------------------------------------------------------ map
  VH.MapPainters = VH.MapPainters || [];
  VH.MapPainters.push((g, layout, o) => {
    const k = kit();
    if (!k) return;
    for (const s of layout.gunshops || []) {
      const r = k.rect(s.f, s.a, s.vb0, s.a + s.SW, s.vb1);
      g.fillStyle = 'rgba(0, 0, 0, 0.3)';
      o.R(r[0] + 1, r[1] + 1, r[2] + 1, r[3] + 1);
      g.fillStyle = '#56624a';
      o.R(r[0], r[1], r[2], r[3]);
    }
  });

  VH.GunShops = GunShops;
})();
