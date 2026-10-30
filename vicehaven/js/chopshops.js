/*
 * chopshops.js — Busted Spanner: breakers' garages that buy any car Jay can
 * drive in, cash on the spot and no questions asked.
 *
 *   VH.ChopShops.plan(layout)              picks car parks for the garages
 *                                          (after stores.js, sprayshops.js
 *                                          and gunshops.js have had theirs)
 *   VH.ChopShops.buildLot(world, ctx, lot) builds one: a tin-sided garage
 *                                          with a wide roller door, a marked
 *                                          drop-off bay inside, parts racks,
 *                                          a half-stripped car on stands and
 *                                          a scruffy forecourt
 *   new VH.ChopShops(game)                 the mechanics, the sale, the
 *                                          daily hot list and the save
 *
 * Drive a car into the bay and stop: the mechanic names his price. Sit
 * still for a moment (or press E) and the screen goes dark while the crew
 * strip it; Jay is back out by the door with the cash. What a car fetches:
 * its class (a Pipit is worth less than a Zephyr), less for damage (a wreck
 * still fetches 30%), the Rep perk, two and a half times as much for the
 * first of each model on today's hot list, and half for the sixth and later
 * car of the same model in one day (the market's flooded). Clear the whole
 * hot list for a bonus. A police car pays well, but its tracker brings two
 * stars. Job cars, cars with a name of their own (Lulu, the gold King of the
 * Road prize), aircraft and the tank are turned away, and nobody opens the
 * door with the police watching or a passenger in the back.
 *
 * The hot list changes every in-game day (at 06:00, or every 24 minutes of
 * play when the clock stands still) and the mechanic texts it to Jay.
 *
 * Each garage is laid out in its car park's frame (stores.js): u runs along
 * the street front, v runs in from the front edge of the lot.
 */
(function () {
  'use strict';

  const VH = window.VH;
  const { clamp, dampAngle } = VH.math;
  const SALT = 'busted-spanner-1'; // the plan's shuffle
  // Where the garages go: one in each rough end of town. The docks road and
  // the south side are the blocks along the road out to the Saltmarsh docks.
  const REGIONS = [
    { id: 'oldmarket', end: 'Old Market', test: (l) => l.district.id === 'oldmarket' },
    { id: 'docks', end: 'docks end', face: 's', test: (l) => l.district.id === 'harborpoint' && l.cz > 300 },
    { id: 'southside', end: 'west end', face: 's', test: (l) => l.district.id === 'palmcrescent' && l.cz > 300 },
  ];
  const SPACING = 200; //  metres between garages
  const CLEAR = 45; //     from a corner shop, a body shop or a gun shop
  // The car parks the story's places use (places.js picks them: the Grand
  // Parkade, Pelican's repo yard, Southside Division). A garage there would move them.
  const STORY_LOTS = new Set(['b4_0_l3', 'b0_7_l1', 'b5_7_l2']);
  // And the car parks whose garage door would be a place within 20 m of a
  // business's front (properties.js would move the business: b0_1_l15 is
  // next door to the Lucky Lantern).
  const NEAR_PROPERTY = new Set(['b0_1_l15']);
  const WALL_H = 6.0; //   top of the walls above the kerb
  const CEIL = 5.4; //     inside ceiling above the kerb
  const DOOR_W = 6.0;
  const DOOR_H = 4.3;
  const BAY_HW = 2.9; //   half the width of the drop-off bay
  const REOPEN = 480; //   seconds of play before a garage whose mechanic was attacked opens again
  const BRAND = { name: 'Busted Spanner', sign: ['BUSTED SPANNER', 'AUTO SALVAGE · CASH FOR CARS'], bg: ['#3b2f28', '#1c1612'], fg: '#ffb347', band: 0x4a3426, trim: 0xd9862a, overalls: 0x2f4a6b };
  const MECHANICS = ['Gus', 'Nadia', 'Pete'];
  const FROM = 'Gus · Busted Spanner'; // who the hot list texts come from

  // What a car fetches, undamaged: by class, with a few models priced on their own.
  const CLASS_VALUE = { compact: 400, sedan: 600, taxi: 550, suv: 700, van: 700, pickup: 700, muscle: 900, sports: 1500, police: 1200 };
  const MODEL_VALUE = { beater: 250, sovereign: 850, lowrider: 1000, hauler: 850, bulwark: 1200, scout: 1000, vireo: 2500, zephyr: 2500 };
  const WRECK = 0.3; //    what a wreck still fetches
  const HOT = 2.5; //      the hot list multiplier (the first of each model, each day)
  const GLUT = 5; //       cars of one model a day before the price halves
  const FULL_HOUSE = 1000; // the whole hot list in one day
  const HEAT = 2; //       stars for a police car
  // The hot list: one easy car, one harder one, one prize, each day.
  const HOT_POOLS = [
    ['halcyon', 'pipit', 'cab', 'mesa', 'porter', 'tern', 'beater'],
    ['ironclad', 'sovereign', 'lowrider', 'hauler', 'drifter'],
    ['vireo', 'zephyr', 'interceptor'],
  ];
  const DAWN = 6; //       the hot list changes at 06:00
  const STILL_DAY = 24 * 60; // seconds of play per day when the clock stands still
  const OFFER_WAIT = 3; // seconds stopped in the bay before the crew take it
  const STOP_SPEED = 1.0; // m/s: stopped, near enough
  // The sale (seconds): fade out, swap (car gone, Jay outside), fade in and
  // pay, the door rolls back up, done.
  const T_SWAP = 0.55;
  const T_PAY = 1.25;
  const T_UP = 2.6;
  const T_END = 4.1;

  let K = null; // the frame helpers from stores.js

  function kit() {
    if (!K) K = VH.Stores && VH.Stores.kit;
    return K;
  }

  function smooth(t) {
    t = clamp(t, 0, 1);
    return t * t * (3 - 2 * t);
  }

  function spec(type) {
    return (VH.Vehicle && VH.Vehicle.typeSpec && VH.Vehicle.typeSpec(type)) || null;
  }

  function carName(type) {
    const s = spec(type);
    return (s && s.name) || type;
  }

  /** What a model fetches, undamaged, before the hot list and the perk. */
  function baseValue(type) {
    if (MODEL_VALUE[type]) return MODEL_VALUE[type];
    const s = spec(type);
    return (s && CLASS_VALUE[s.cls]) || 500;
  }

  /** Which way the lot can face a street with room for the garage and a forecourt. */
  function fit(lot, face) {
    for (const side of face ? [face] : ['s', 'n', 'e', 'w']) {
      if (!lot.front[side]) continue;
      const f = kit().frameFor(lot, side);
      if (f.W >= 16 && f.D >= 19) return side;
    }
    return null;
  }

  // ------------------------------------------------------------ the garage
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
    const uc = s.uc;
    const band = VH.col(BRAND.band);
    const trim = VH.col(BRAND.trim);
    const wallCol = VH.col(rng.pick([0x8c8f88, 0x7f898d, 0x948a7a]));
    const seed = rng.range(0, 100);
    const blankF = { style: 0, bay: 4, seed };
    const lot = s.lot;
    const metal = VH.col(0x2b2f35);
    const steel = VH.col(0x8a9097);
    const rust = VH.col(0x8a4a24);
    const black = VH.col(0x18191b);
    const FLAGS = VH.COLLIDE.ALL;

    // --- forecourt: worn asphalt, guide lines to the door, a hazard strip, oil stains
    const W = f.W;
    for (const [u0, q0, u1, q1] of [[0, 0, W, v0], [0, v1, W, f.D], [0, v0, a0, v1], [a1, v0, W, v1]]) {
      if (u1 - u0 < 0.05 || q1 - q0 < 0.05) continue;
      const r = rect(f, u0, q0, u1, q1);
      ctx.asphaltTop.topRect(r[0], r[1], r[2], r[3], KERB, VH.col(0xbdbab4), 6);
    }
    const flat = { skip: { n: true, s: true, e: true, w: true } };
    const mark = (u0, q0, u1, q1, col) => {
      const r = rect(f, u0, q0, u1, q1);
      ctx.marks.box(r[0], KERB, r[1], r[2], KERB + 0.001, r[3], col, flat);
    };
    const yellow = VH.col(0xf2c500);
    mark(d0 + 0.2, 0.8, d0 + 0.34, v0 - 0.6, yellow);
    mark(d1 - 0.34, 0.8, d1 - 0.2, v0 - 0.6, yellow);
    for (let u = d0, i = 0; u < d1 - 0.01; u += 0.5, i++) mark(u, v0 - 0.5, Math.min(u + 0.5, d1), v0 - 0.05, i % 2 ? black : yellow);
    const oil = VH.col(0x3a3836);
    for (let i = 0; i < 5; i++) {
      const u = rng.range(d0 + 0.6, d1 - 1.4);
      const q = rng.range(1.5, Math.max(1.6, v0 - 1.5));
      const w = rng.range(0.5, 1.1);
      mark(u, q, u + w, q + w * rng.range(0.5, 0.9), oil);
    }

    // --- shell: tin walls on a block plinth
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
    // The front: wall either side of the door, the lintel over it.
    wallBox(a0 + T, v0, d0, v0 + T, y0, yTop, ['front', 'back']);
    wallBox(d1, v0, a1 - T, v0 + T, y0, yTop, ['front', 'back']);
    D.facade(a0, v0, d0, v0, y0, WALL_H, 0, -1, wallCol, blankF);
    D.facade(d1, v0, a1, v0, y0, WALL_H, 0, -1, wallCol, blankF);
    wallBox(d0, v0, d1, v0 + T, y0 + DOOR_H, yTop, ['back'], true);
    // Corrugated ribs and rust streaks down the front, a block plinth along the bottom.
    const rib = VH.colMul(wallCol, 1.12);
    for (let u = a0 + 0.25; u < a1 - 0.1; u += 0.42) {
      if (u > d0 - 0.2 && u < d1 + 0.05) {
        D.box('prop', u, y0 + DOOR_H + 0.05, v0 - 0.05, u + 0.07, y0 + DOOR_H + 0.3, v0, rib, { bottom: true });
        continue;
      }
      D.box('prop', u, y0 + 0.5, v0 - 0.05, u + 0.07, y0 + DOOR_H + 0.3, v0, rib);
    }
    for (let i = 0; i < 4; i++) {
      const u = rng.chance(0.5) ? rng.range(a0 + 0.4, d0 - 0.6) : rng.range(d1 + 0.3, a1 - 0.6);
      const top = y0 + rng.range(2.6, DOOR_H);
      D.vquad('prop', u, v0 - 0.06, u + rng.range(0.15, 0.35), v0 - 0.06, top - rng.range(1.2, 2.4), top, 0, -1, rust);
    }
    D.box('b', a0 - 0.05, y0, v0 - 0.08, d0, y0 + 0.5, v0, VH.col(0x9a968e), { bottom: true });
    D.box('b', d1, y0, v0 - 0.08, a1 + 0.05, y0 + 0.5, v0, VH.col(0x9a968e), { bottom: true });
    // The fascia for the sign, and its trim.
    D.box('b', a0 - 0.15, y0 + DOOR_H + 0.35, v0 - 0.25, a1 + 0.15, yTop + 0.2, v0, band, { bottom: true });
    D.box('prop', a0 - 0.16, y0 + DOOR_H + 0.23, v0 - 0.27, a1 + 0.16, y0 + DOOR_H + 0.35, v0, trim, { bottom: true });
    // Door guides, the bottom rail of the rolled-up door and its drum inside.
    D.box('prop', d0 - 0.14, y0, v0 - 0.08, d0, y0 + DOOR_H, v0 + T, metal);
    D.box('prop', d1, y0, v0 - 0.08, d1 + 0.14, y0 + DOOR_H, v0 + T, metal);
    D.box('prop', d0, y0 + DOOR_H - 0.32, v0 + 0.04, d1, y0 + DOOR_H, v0 + 0.12, steel, { bottom: true });
    D.box('prop', d0, y0 + DOOR_H - 0.36, v0 + 0.03, d1, y0 + DOOR_H - 0.32, v0 + 0.13, metal, { bottom: true });
    D.box('interior', d0 - 0.1, y0 + DOOR_H, v0 + T, d1 + 0.1, y0 + DOOR_H + 0.6, v0 + T + 0.6, VH.col(0x6a5f55), { bottom: true });
    // Roof: tarred felt, a low parapet, an extractor and a skylight.
    const r = rect(f, a0, v0 - 0.25, a1, v1);
    ctx.b.quad([r[0], yTop, r[3]], [r[2], yTop, r[3]], [r[2], yTop, r[1]], [r[0], yTop, r[1]], [0, 1, 0], VH.col(0x5d5b57), null, null, [0, 0, -1, seed]);
    const par = VH.colMul(wallCol, 0.85);
    D.box('b', a0, yTop, v1 - 0.25, a1, yTop + 0.45, v1, par);
    D.box('b', a0, yTop, v0 + T - 0.25, a0 + 0.25, yTop + 0.45, v1 - 0.25, par);
    D.box('b', a1 - 0.25, yTop, v0 + T - 0.25, a1, yTop + 0.45, v1 - 0.25, par);
    D.box('prop', a0 + 1.6, yTop, v1 - 3.2, a0 + 2.8, yTop + 1.1, v1 - 2.0, VH.col(0xa9afb5));
    D.box('prop', uc - 1.2, yTop, v0 + s.GD * 0.45, uc + 1.2, yTop + 0.25, v0 + s.GD * 0.45 + 2.4, VH.col(0xb8c6cf));

    // Colliders: walls, the lintel, the roof.
    D.collide(a0, 0, v1 - T, a1, yTop + 0.5, v1, 'building', FLAGS);
    D.collide(a0, 0, v0, a0 + T, yTop + 0.5, v1, 'building', FLAGS);
    D.collide(a1 - T, 0, v0, a1, yTop + 0.5, v1, 'building', FLAGS);
    D.collide(a0, 0, v0 - 0.25, d0, yTop + 0.5, v0 + T, 'building', FLAGS);
    D.collide(d1, 0, v0 - 0.25, a1, yTop + 0.5, v0 + T, 'building', FLAGS);
    D.collide(d0, y0 + DOOR_H, v0 - 0.25, d1, yTop + 0.5, v0 + T, 'building', FLAGS);
    D.collide(a0, y0 + CEIL, v0, a1, yTop + 0.5, v1, 'building', FLAGS);

    // --- inside: grimy block walls, a stained floor, the bay marked out
    const i0 = a0 + T;
    const i1 = a1 - T;
    const q0 = v0 + T;
    const q1 = v1 - T;
    const yc = y0 + CEIL;
    const dado = VH.col(0x4a4640);
    const paint = VH.col(0xb9b3a6);
    const two = (u0, w0, u1, w1, nu, nv) => {
      D.vquad('interior', u0, w0, u1, w1, y0, y0 + 1.3, nu, nv, dado);
      D.vquad('interior', u0, w0, u1, w1, y0 + 1.3, yc, nu, nv, paint);
    };
    two(i0, q1, i1, q1, 0, -1);
    two(i0, q0, i0, q1, 1, 0);
    two(i1, q0, i1, q1, -1, 0);
    two(i0, q0, d0, q0, 0, 1);
    two(d1, q0, i1, q0, 0, 1);
    D.vquad('interior', d0, q0, d1, q0, y0 + DOOR_H + 0.6, yc, 0, 1, paint);
    D.hquad('interior', i0, q0, i1, q1, y0 + 0.012, 1, VH.col(0x77736c));
    for (let i = 0; i < 7; i++) {
      const u = rng.range(i0 + 0.5, i1 - 1.5);
      const q = rng.range(q0 + 0.5, q1 - 1.5);
      const w = rng.range(0.6, 1.4);
      D.hquad('interior', u, q, u + w, q + w * rng.range(0.4, 0.8), y0 + 0.016, 1, VH.col(0x4b4843));
    }
    // The drop-off bay: hazard stripes down the sides and across the back, a stop bar.
    const b0 = uc - BAY_HW;
    const b1 = uc + BAY_HW;
    const bq0 = s.bay.q0;
    const bq1 = s.bay.q1;
    for (let q = bq0, i = 0; q < bq1 - 0.01; q += 0.5, i++) {
      const col = i % 2 ? black : yellow;
      D.hquad('interior', b0 - 0.16, q, b0, Math.min(q + 0.5, bq1), y0 + 0.025, 1, col);
      D.hquad('interior', b1, q, b1 + 0.16, Math.min(q + 0.5, bq1), y0 + 0.025, 1, col);
    }
    for (let u = b0 - 0.16, i = 0; u < b1 + 0.15; u += 0.5, i++) D.hquad('interior', u, bq1, Math.min(u + 0.5, b1 + 0.16), bq1 + 0.16, y0 + 0.025, 1, i % 2 ? black : yellow);
    D.hquad('interior', uc - 1.3, bq1 - 0.9, uc + 1.3, bq1 - 0.6, y0 + 0.025, 1, VH.col(0xe8e8e0));
    // Ceiling, strip lights, two lamps hanging over the bay.
    D.hquad('interior', i0, q0, i1, q1, yc, -1, VH.col(0x4e4b46));
    const lamp = VH.col(0xfff2dc, 1.6);
    for (const u of [uc - 2.0, uc + 1.7]) D.hquad('screen', u, q0 + 1.0, u + 0.3, q1 - 1.0, yc - 0.01, -1, lamp);
    for (const q of [bq0 + 2.5, bq1 - 2.5]) {
      D.box('interior', uc - 0.015, yc - 1.2, q - 0.015, uc + 0.015, yc, q + 0.015, metal);
      D.box('interior', uc - 0.3, yc - 1.35, q - 0.3, uc + 0.3, yc - 1.2, q + 0.3, VH.col(0x2f5a3a));
      D.hquad('screen', uc - 0.25, q - 0.25, uc + 0.25, q + 0.25, yc - 1.36, -1, lamp);
    }

    // Left wall: steel racking full of parts (doors, wheels, bumpers, boxes), a stack of tyres.
    const rv0 = q0 + 0.6;
    const rv1 = q1 - 2.4;
    if (rv1 - rv0 > 1.5) {
      for (let q = rv0; q <= rv1 + 0.01; q += (rv1 - rv0) / Math.max(1, Math.round((rv1 - rv0) / 2.4))) D.box('interior', i0, y0, q - 0.04, i0 + 0.7, y0 + 3.4, q + 0.04, VH.col(0x2f5a8a));
      const parts = [0x6e6a64, 0x8a8f96, 0x3a3d42, 0xa8161c, 0x1d4fb8, 0xd8d4c8, 0xb8862a, 0x1f1f21];
      for (let lvl = 0; lvl < 4; lvl++) {
        const y = y0 + 0.2 + lvl * 0.85;
        D.box('interior', i0, y - 0.05, rv0, i0 + 0.7, y, rv1, VH.col(0xd9862a));
        for (let q = rv0 + 0.1; q < rv1 - 0.4; ) {
          const w = rng.range(0.3, 0.9);
          if (!rng.chance(0.2)) D.box('interior', i0 + 0.08, y, q, i0 + 0.62, y + rng.range(0.2, 0.7), Math.min(q + w, rv1 - 0.1), VH.col(rng.pick(parts)));
          q += w + 0.08;
        }
      }
      D.collide(i0, 0, rv0, i0 + 0.75, y0 + 3.4, rv1, 'shelf', FLAGS);
    }
    const tyres = (u, q, n, surf) => {
      for (let k = 0; k < n; k++) {
        const [x, z] = P(f, u, q);
        ctx[surf].cylinder(x, y0 + k * 0.23, z, 0.37, 0.37, 0.22, 12, black, true, VH.col(0x3a3c40));
      }
    };
    const tu = Math.min(i0 + 1.0, b0 - 0.6);
    tyres(tu, q1 - 0.8, 5, 'interior');
    tyres(tu, q1 - 1.6, 3, 'interior');
    D.collide(tu - 0.4, 0, q1 - 2.0, tu + 0.4, y0 + 1.2, q1, 'shelf', FLAGS);

    // Right side: a half-stripped car on axle stands (no wheels, no bonnet, no doors).
    const cu0 = d1 + 0.55;
    const cu1 = Math.min(cu0 + 1.8, i1 - 0.4);
    const cq0 = q0 + 1.2;
    const cq1 = Math.min(cq0 + 4.3, q1 - 2.6);
    if (cq1 - cq0 > 3 && cu1 - cu0 > 1.3) {
      const body = VH.col(rng.pick([0x6e1a1a, 0x1d2e52, 0xb8bcc0, 0x3a5a3a, 0xc8a24a]));
      const dark = VH.col(0x121212);
      const yb = y0 + 0.55; // the sills, up on the stands
      const yw = yb + 0.5; //  the waistline
      const yr = yw + 0.48; // the roof
      const k0 = cq0 + 1.35; // foot of the windscreen
      const k1 = cq1 - 0.95; // foot of the rear window
      // Boot and sills, the front wings round an empty engine bay (the bonnet's gone).
      D.box('interior', cu0, yb, k0, cu1, yw, cq1, body);
      D.box('interior', cu0, yb, cq0, cu0 + 0.12, yw, k0, body);
      D.box('interior', cu1 - 0.12, yb, cq0, cu1, yw, k0, body);
      D.box('interior', cu0 + 0.12, yb, cq0, cu1 - 0.12, yb + 0.3, cq0 + 0.12, body);
      D.box('interior', cu0 + 0.12, yb, cq0 + 0.12, cu1 - 0.12, yb + 0.15, k0, dark);
      // Wheel arches with no wheels in them.
      for (const q of [cq0 + 0.45, cq1 - 1.15]) for (const u of [cu0 - 0.012, cu1 - 0.048]) D.box('interior', u, yb - 0.02, q, u + 0.06, yb + 0.32, q + 0.7, dark);
      // The cabin: pillars and a roof over a gutted inside (no doors, no glass, no seats).
      D.box('interior', cu0 + 0.14, yw, k0 + 0.1, cu1 - 0.14, yr - 0.05, k1 - 0.1, dark);
      for (const u of [cu0 + 0.06, cu1 - 0.14]) for (const q of [k0 + 0.1, k1 - 0.18]) D.box('interior', u, yw, q, u + 0.08, yr - 0.05, q + 0.08, body);
      D.box('interior', cu0 + 0.06, yr - 0.05, k0 + 0.1, cu1 - 0.06, yr, k1 - 0.1, body);
      // Up on axle stands.
      for (const [u, q] of [[cu0 + 0.3, cq0 + 0.72], [cu1 - 0.45, cq0 + 0.72], [cu0 + 0.3, cq1 - 0.88], [cu1 - 0.45, cq1 - 0.88]]) {
        D.box('interior', u, y0, q, u + 0.15, yb, q + 0.15, VH.col(0xc0262d));
      }
      D.collide(cu0, 0, cq0, cu1, yr, cq1, 'car', FLAGS);
    }
    // Back right: a bench, a pegboard of tools, a red tool chest, an engine on a stand.
    const bv0 = q1 - 0.75;
    const bu0 = d1 + 0.3;
    const bu1 = i1;
    if (bu1 - bu0 > 1.4) {
      D.box('interior', bu0, y0 + 0.85, bv0, bu1, y0 + 0.95, q1, VH.col(0x6b5a48));
      D.box('interior', bu0 + 0.1, y0, bv0 + 0.1, bu0 + 0.2, y0 + 0.85, q1 - 0.05, metal);
      D.box('interior', bu1 - 0.2, y0, bv0 + 0.1, bu1 - 0.1, y0 + 0.85, q1 - 0.05, metal);
      D.box('interior', bu0, y0 + 1.2, q1 - 0.02, bu1, y0 + 2.4, q1, VH.col(0x9a8466));
      for (let u = bu0 + 0.2; u < bu1 - 0.15; u += 0.3) D.box('interior', u, y0 + 1.5 + rng.range(0, 0.4), q1 - 0.1, u + 0.06, y0 + 1.75 + rng.range(0, 0.4), q1 - 0.02, metal);
      D.collide(bu0, 0, bv0, bu1, y0 + 0.95, q1, 'shelf', FLAGS);
    }
    const eu = (cu0 + cu1) / 2;
    const eq = cq1 + 0.9;
    if (eq + 0.4 < bv0 - 0.2) {
      D.box('interior', eu - 0.05, y0, eq - 0.05, eu + 0.05, y0 + 0.7, eq + 0.05, VH.col(0xc0262d));
      D.box('interior', eu - 0.35, y0 + 0.7, eq - 0.3, eu + 0.35, y0 + 1.25, eq + 0.3, VH.col(0x5e6166));
      D.box('interior', eu - 0.25, y0 + 1.25, eq - 0.2, eu + 0.25, y0 + 1.4, eq + 0.2, VH.col(0x3a3d42));
      D.collide(eu - 0.4, 0, eq - 0.35, eu + 0.4, y0 + 1.4, eq + 0.35, 'shelf', FLAGS);
    }

    // --- the forecourt's clutter, clear of the way in: tyre stacks, a skip
    tyres(a0 + 0.6, v0 - 0.7, 4, 'prop');
    tyres(a0 + 1.4, v0 - 0.7, 2, 'prop');
    D.collide(a0 + 0.2, 0, v0 - 1.1, a0 + 1.8, y0 + 0.95, v0 - 0.3, 'prop', FLAGS);
    tyres(a1 - 0.6, v0 - 0.7, 3, 'prop');
    D.collide(a1 - 1.0, 0, v0 - 1.1, a1 - 0.2, y0 + 0.75, v0 - 0.3, 'prop', FLAGS);
    if (a0 >= 2.4) {
      const [kx, kz] = P(f, a0 - 1.2, v0 + 2.2);
      ctx.addProp('dumpster', kx, kz, Math.atan2(f.ux, f.uz), 1);
    }

    // --- signs and light
    const yawOut = s.yawOut;
    const [sx, sz] = P(f, uc, v0 - 0.27);
    const signs = world.signs || (world.signs = []);
    signs.push({ x: sx, y: y0 + DOOR_H + 0.35 + (WALL_H - DOOR_H - 0.15) / 2, z: sz, yaw: yawOut, w: Math.min(s.GW - 1.2, 11), h: 1.25, lines: BRAND.sign, style: 'brand', colors: { bg: BRAND.bg, fg: BRAND.fg }, frame: BRAND.band });
    const [nx, nz] = P(f, (a0 + d0) / 2, v0 - 0.09); // proud of the ribs
    signs.push({ x: nx, y: y0 + 2.7, z: nz, yaw: yawOut, w: Math.min(d0 - a0 - 0.6, 2.6), h: 0.62, lines: ['WE BUY', 'ANY CAR'], style: 'neon' });
    const [bx, bz] = P(f, uc, q1 - 0.04);
    signs.push({ x: bx, y: y0 + 3.4, z: bz, yaw: yawOut, w: 3.6, h: 0.9, lines: ['DROP-OFF BAY', 'STOP HERE · ENGINE OFF'], style: 'info' });
    const pools = world.floodlights || (world.floodlights = []);
    const [cx, cz] = P(f, uc, (v0 + v1) / 2);
    pools.push({ x: cx, z: cz, r: Math.min(s.GW, s.GD) * 0.5, y: KERB + 0.03 });
    const [fx, fz] = P(f, uc, v0 - 3);
    pools.push({ x: fx, z: fz, r: 5.5, y: KERB + 0.03 });
    return yTop + 0.5;
  }

  // ---------------------------------------------------- the roller door
  let doorTex = null;

  /** A galvanised shutter gone dull with age. */
  function shutterTexture() {
    if (doorTex) return doorTex;
    const c = document.createElement('canvas');
    c.width = 8;
    c.height = 32;
    const g = c.getContext('2d');
    g.fillStyle = '#8f8c86';
    g.fillRect(0, 0, 8, 32);
    g.fillStyle = '#aeaaa2';
    g.fillRect(0, 4, 8, 10);
    g.fillStyle = '#5f5b55';
    g.fillRect(0, 28, 8, 4);
    g.fillStyle = 'rgba(138, 74, 36, 0.35)';
    g.fillRect(1, 15, 3, 12);
    doorTex = new THREE.CanvasTexture(c);
    doorTex.wrapS = doorTex.wrapT = THREE.RepeatWrapping;
    return doorTex;
  }

  // ------------------------------------------------------- the mechanic
  /** Stands by the door, keeps an eye on Jay (and whatever he drives in). */
  class MechanicBrain {
    constructor(shops, s) {
      this.shops = shops;
      this.s = s;
      this.watch = false;
      this.talkT = 0;
    }

    update(a, dt) {
      if (a.dead) return;
      const post = this.s.mech;
      a.moveSpeed = 0;
      a.anim.aim = 0;
      this.talkT = Math.max(0, this.talkT - dt);
      a.anim.talk = this.talkT > 0 ? 1 : 0;
      const dx = post.x - a.pos.x;
      const dz = post.z - a.pos.z;
      if (Math.hypot(dx, dz) > 0.4) {
        a.heading = dampAngle(a.heading, Math.atan2(dx, dz), 8, dt);
        a.moveSpeed = 1.1;
        return;
      }
      const p = this.shops.game.player;
      const t = p.inVehicle && p.vehicle ? p.vehicle.pos : p.pos;
      const want = this.watch ? Math.atan2(t.x - a.pos.x, t.z - a.pos.z) : post.heading;
      a.heading = dampAngle(a.heading, want, 5, dt);
    }
  }

  // ================================================================ shops
  class ChopShops {
    /** Choose the car parks that become garages. Runs once, before the world is built. */
    static plan(layout) {
      const k = kit();
      if (!k) return [];
      const lots = [];
      for (const b of layout.blocks) {
        if (b.kind !== 'buildings' || k.AVOID_BLOCKS.has(b.id)) continue;
        for (const l of b.lots) if (l.kind === 'parking' && !l.store && !l.spray && !l.gun && !STORY_LOTS.has(l.id) && !NEAR_PROPERTY.has(l.id)) lots.push(l);
      }
      lots.sort((p, q) => k.hashString(p.id + SALT) - k.hashString(q.id + SALT));
      const others = [].concat(layout.stores || [], layout.sprays || [], layout.gunshops || []);
      const chosen = [];
      const clear = (l) => chosen.every((c) => Math.hypot(c.lot.cx - l.cx, c.lot.cz - l.cz) > SPACING) && others.every((s) => Math.hypot(s.lot.cx - l.cx, s.lot.cz - l.cz) > CLEAR);
      for (const R of REGIONS) {
        for (const l of lots) {
          if (!R.test(l)) continue;
          const side = fit(l, R.face);
          if (!side || !clear(l)) continue;
          chosen.push({ lot: l, side, region: R });
          break;
        }
      }
      chosen.sort((p, q) => p.lot.cx - q.lot.cx || p.lot.cz - q.lot.cz);
      layout.chopshops = chosen.map((c, i) => ChopShops._describe(layout, c, i));
      // Two on the same road: say which end.
      for (const s of layout.chopshops) {
        if (layout.chopshops.some((o) => o !== s && o.road && o.road === s.road)) s.name += ' (' + s.end + ')';
      }
      for (const s of layout.chopshops) s.lot.chop = s;
      return layout.chopshops;
    }

    static _describe(layout, c, i) {
      const k = kit();
      const lot = c.lot;
      const f = k.frameFor(lot, c.side);
      const GW = clamp(Math.floor(f.W - 3), 13, 16);
      const GD = clamp(Math.floor(f.D - 6), 12, 15);
      const a = (f.W - GW) / 2;
      const vb1 = f.D - 0.6;
      const vb0 = vb1 - GD;
      const uc = a + GW / 2;
      const d0 = uc - DOOR_W / 2;
      const d1 = uc + DOOR_W / 2;
      const at = (u, v) => {
        const [x, z] = k.P(f, u, v);
        return { x, z };
      };
      const yawIn = Math.atan2(f.vx, f.vz);
      const yawOut = Math.atan2(-f.vx, -f.vz);
      const mech = at(d1 + 1.15, vb0 - 0.85);
      mech.heading = yawOut;
      const out = at(d0 - 1.6, vb0 - 2.0);
      out.heading = yawOut;
      const front = at(uc, -3);
      const road = VH.CityGen.roadNameAt(layout, front.x, front.z);
      return {
        id: 'chopshop_' + (i + 1),
        name: BRAND.name + (road ? ', ' + road : ''),
        mechanic: MECHANICS[i % MECHANICS.length],
        lot,
        district: lot.district.id,
        region: c.region.id,
        end: c.region.end,
        road,
        f, a, GW, GD, vb0, vb1, uc, d0, d1,
        bay: { q0: vb0 + k.T + 0.4, q1: vb1 - k.T - 1.7 },
        mech,
        out,
        ask: at(d1 + 1.15, vb0 - 2.1),
        door: at(uc, vb0 - 1.5),
        centre: at(uc, (vb0 + vb1) / 2),
        yawIn,
        yawOut,
        seed: k.hashString(lot.id + SALT),
      };
    }

    static buildLot(world, ctx, lot) {
      return buildShop(world, ctx, lot.chop);
    }

    static registerPlaces(world, places) {
      for (const s of places.layout.chopshops || []) {
        places.add(s.id, { name: s.name, x: s.door.x, z: s.door.z, yaw: s.yawIn, kind: 'chopshop', district: s.district });
      }
    }

    // ------------------------------------------------------------ runtime
    constructor(game) {
      this.game = game;
      this.list = game.layout.chopshops || [];
      this.ok = this.list.length > 0 && !!kit();
      this.saveKey = 'chopshops';
      this.mechs = new Map(); // shop id → the mechanic (a crowd agent)
      this.here = null; //   the garage whose bay the player's car is in
      this.offer = null; //  { s, v, q } while the mechanic's price is up
      this.job = null; //    a sale under way
      this._still = 0; //    seconds stopped in the bay
      this._told = null; //  the car a refusal was already given for
      this._hot = null; //   today's hot list (types), worked out once a day
      this._hotDay = 0;
      this._h = null; //     the clock last frame (for the 06:00 roll-over)
      this._pending = false; // the new hot list is waiting to be texted
      this._fresh();
      if (!this.ok) return;
      for (const s of this.list) {
        const label = 'Ask ' + s.mechanic + ' what ' + (s.mechanic === 'Nadia' ? 'she' : 'he') + ' wants today';
        game.interaction.register({ id: s.id + '_ask', kind: 'chopMechanic', shop: s.id, x: s.ask.x, y: game.physics.groundHeight(s.ask.x, s.ask.z, 2) + 1, z: s.ask.z, radius: 2.2, label, enabled: false });
        s.item = game.interaction.items[game.interaction.items.length - 1];
      }
      game.interaction.on('chopMechanic', (item) => {
        this._ask(this.list.find((s) => s.id === item.shop));
        return 1.5;
      });
      VH.events.on('interaction:idle', () => {
        if (this.offer && !this.job && this.game.state === 'playing') this._start();
      });
      VH.events.on('agent:hurt', (e) => this._mechHurt(e));
      VH.events.on('agent:died', (e) => this._mechHurt(e));
    }

    /** Everything a new game starts with (and an old save without this system). */
    _fresh() {
      this.day = 1;
      this.stillT = 0; //   seconds of play this day while the clock stood still
      this.today = { counts: {}, hot: {}, cars: 0, earned: 0, bonus: false };
      this.sold = {}; //    type → cars sold, all time
      this.cars = 0;
      this.earned = 0;
      this.best = 0;
      this.introduced = false;
      this.until = {}; //   shop id → playTime it opens again
      this._hot = null;
    }

    isOpen(s) {
      return this.game.playTime >= (this.until[s.id] || 0);
    }

    // ------------------------------------------------------- the prices
    /**
     * Today's hot list: three model ids. Each pool is dealt in a shuffled
     * order of its own, a card a day, so a model never comes up two days
     * running and every one of them comes round.
     */
    hotTypes() {
      if (this._hot && this._hotDay === this.day) return this._hot;
      this._hot = HOT_POOLS.map((pool, i) => {
        const deck = pool.slice();
        const rng = new VH.RNG('busted-spanner-hot-' + i);
        for (let k = deck.length - 1; k > 0; k--) {
          const j = Math.floor(rng.next() * (k + 1));
          [deck[k], deck[j]] = [deck[j], deck[k]];
        }
        return deck[(this.day - 1) % deck.length];
      });
      this._hotDay = this.day;
      return this._hot;
    }

    /** Today's hot list for the phone: [{ type, name, sold, price }]. */
    hotList() {
      return this.hotTypes().map((type) => ({ type, name: carName(type), sold: !!this.today.hot[type], price: this.priceFor(type) }));
    }

    /** The garages: [{ id, name, x, z }] (at the door). */
    shops() {
      return this.list.map((s) => ({ id: s.id, name: s.name, x: s.door.x, z: s.door.z, open: this.isOpen(s) }));
    }

    _perk() {
      const rep = this.game.rep;
      const k = rep && rep.perk ? rep.perk('chop') : 1;
      return typeof k === 'number' && k > 0 ? k : 1;
    }

    /** What a model fetches today, undamaged. */
    priceFor(type) {
      return this._price(type, 1).value;
    }

    /** The price of one car: `cond` 0..1 is how sound it is. */
    _price(type, cond) {
      const base = baseValue(type);
      const hot = this.hotTypes().includes(type) && !this.today.hot[type];
      const glut = (this.today.counts[type] || 0) >= GLUT;
      const wear = WRECK + (1 - WRECK) * clamp(cond, 0, 1);
      const value = Math.round((base * wear * this._perk() * (hot ? HOT : 1) * (glut ? 0.5 : 1)) / 10) * 10;
      const s = spec(type);
      return { value, base, wear, hot, glut, police: !!(s && s.cls === 'police') };
    }

    /** What this car fetches as it stands. */
    quote(v) {
      return this._price(v.type, v.health / 1000);
    }

    // ---------------------------------------------------------- the day
    /** A new day at 06:00 on the clock, or every 24 minutes of play while it stands still. */
    _tickDay(dt) {
      const env = this.game.environment;
      const h = env ? env.hours : 12;
      const always = !!(env && env.settings && env.settings.get && env.settings.get('gameplay.alwaysDay'));
      if (env && env.clockRunning && !always) {
        const was = this._h;
        // Past dawn going forward, or set from a late evening straight to a morning.
        if (was !== null && h >= DAWN && (was < DAWN || was - h > 12)) this._newDay();
      } else {
        this.stillT += dt;
        if (this.stillT >= STILL_DAY) this._newDay();
      }
      this._h = h;
    }

    _newDay() {
      this.day++;
      this.stillT = 0;
      this.today = { counts: {}, hot: {}, cars: 0, earned: 0, bonus: false };
      this._hot = null;
      if (this.introduced) this._pending = true;
    }

    /** Texts: the first one introduces the garages; then each new hot list. */
    _texts() {
      const g = this.game;
      if (this.introduced ? !this._pending : g.playTime < 120) return;
      if (g.state !== 'playing' || (g.missions && g.missions.run) || document.body.classList.contains('cutscene')) return;
      const names = this.hotTypes().map(carName);
      const list = names[0] + ', ' + names[1] + ' and ' + names[2];
      if (!this.introduced) {
        this.introduced = true;
        this._pending = false;
        g.dialogue.text(FROM, "Jay, it's Gus. I run the Busted Spanner garages (the spanner on your map). Drive any car into the bay and stop: cash on the spot. Today's hot list pays two and a half times: " + list + '.');
        return;
      }
      this._pending = false;
      g.dialogue.text(FROM, 'New hot list: ' + list + '. Two and a half times the money for the first of each, today only.');
    }

    // ------------------------------------------------------- mechanics
    _mechOf(s) {
      const a = this.mechs.get(s.id);
      return a && !a.removed ? a : null;
    }

    _spawnMech(s) {
      const g = this.game;
      const look = Object.assign({}, VH.Crowd.randomLook(), { top: BRAND.overalls, trim: BRAND.overalls, shirt: 0xd9d4c8, bottom: BRAND.overalls, cap: true, longHair: s.mechanic === 'Nadia' });
      const a = g.crowd.spawn(s.mech.x, s.mech.z, { look, faction: 'civilian', role: 'mechanic', persistent: true, heading: s.mech.heading, name: s.mechanic, health: 100 });
      a.brain = new MechanicBrain(this, s);
      this.mechs.set(s.id, a);
      return a;
    }

    _removeMech(s) {
      const a = this.mechs.get(s.id);
      if (a && !a.removed) this.game.crowd.remove(a);
      this.mechs.delete(s.id);
    }

    /**
     * Shooting or hitting the mechanic (a bump from a car only knocks him
     * over): he runs, and the garage shuts for a while.
     */
    _mechHurt(e) {
      if (!this.ok || e.source !== 'player') return;
      for (const s of this.list) {
        const a = this.mechs.get(s.id);
        if (a !== e.agent) continue;
        if (!e.agent.dead && e.kind === 'impact') return;
        const was = this.isOpen(s);
        this.until[s.id] = this.game.playTime + REOPEN;
        if (!e.agent.dead && a.brain instanceof MechanicBrain) {
          a.brain = null;
          a.state = 'flee';
          a.flee = { x: this.game.player.pos.x, z: this.game.player.pos.z, t: 8 };
          a.anim.sprint = true;
        }
        if (this.offer && this.offer.s === s) this._offerOff();
        if (was) this.game.hud.showToast(BRAND.name + " is shut. Nobody's selling to you there for a while.");
      }
    }

    /** On foot by the door, E: what the garage wants today. */
    _ask(s) {
      const g = this.game;
      const a = s && this._mechOf(s);
      if (!a || a.dead || !(a.brain instanceof MechanicBrain)) return;
      a.brain.talkT = 2.5;
      const rows = this.hotList().map((h) => (h.sold ? '✓ ' + h.name + ' (done)' : h.name + ' ' + VH.util.formatMoney(h.price)));
      g.dialogue.play([[s.mechanic, rows.some((r) => r[0] !== '✓') ? 'Bring me anything with wheels. These three pay best today.' : "You've cleared my list today. Anything else still pays."]], { mode: 'ambient' });
      g.hud.notify({ title: BRAND.name + ' hot list', text: rows.join(' · ') + '. Anything else pays by class and condition.', icon: '🔧', duration: 8000 });
    }

    // ---------------------------------------------------------- update
    update(dt) {
      if (!this.ok) return;
      const g = this.game;
      const p = g.player;
      this._tickDay(dt);
      this._texts();
      for (const s of this.list) this._mechUpdate(s, p);
      if (this.job) {
        this._runJob(dt);
        return;
      }
      const v = p.inVehicle ? p.vehicle : null;
      const s = v && !v.wrecked && v.driver === 'player' ? this.bayOf(v) : null;
      if (s !== this.here) {
        this.here = s;
        this._still = 0;
        this._told = null;
        this._offerOff();
      }
      if (!s) return;
      const busy = document.body.classList.contains('cutscene') || g.state !== 'playing';
      if (busy || Math.abs(v.speed) > STOP_SPEED) {
        this._still = 0;
        this._offerOff();
        return;
      }
      const why = this._refuse(v, s);
      if (why) {
        this._offerOff();
        if (this._told !== v) {
          this._told = v;
          g.hud.showToast(why);
          if (g.audio.fail) g.audio.fail();
        }
        return;
      }
      if (!this.offer || this.offer.v !== v) this._offerOn(s, v);
      this._still += dt;
      if (this._still >= OFFER_WAIT) this._start();
    }

    /** The mechanic comes and goes with Jay, and watches him when he's about. */
    _mechUpdate(s, p) {
      const d = Math.hypot(p.pos.x - s.centre.x, p.pos.z - s.centre.z);
      let a = this.mechs.get(s.id);
      if (a && a.removed) {
        this.mechs.delete(s.id);
        a = null;
      }
      // Caught in somebody else's crossfire: someone new is on the door once Jay has moved off.
      if (a && a.dead && (a.deadTime || 0) > 30 && d > 40) {
        this._removeMech(s);
        a = null;
      }
      if (!a && d < 75 && this.isOpen(s)) a = this._spawnMech(s);
      else if (a && d > 110) {
        this._removeMech(s);
        a = null;
      }
      const ready = !!(a && !a.dead && a.brain instanceof MechanicBrain);
      if (ready) a.brain.watch = d < 18;
      if (s.item) s.item.enabled = ready && !this.job && this.isOpen(s);
    }

    /** The garage whose drop-off bay a vehicle is parked in, if any. */
    bayOf(v) {
      const { KERB, local } = kit();
      for (const s of this.list) {
        if (Math.abs(v.pos.x - s.centre.x) > 18 || Math.abs(v.pos.z - s.centre.z) > 18) continue;
        if (v.pos.y > KERB + 1.5) continue; // on the roof, or hovering over it
        const [u, q] = local(s.f, v.pos.x, v.pos.z);
        const half = Math.min(v.hz || 2.3, 4);
        if (Math.abs(u - s.uc) < BAY_HW - 0.3 && q - half > s.vb0 - 0.8 && q + half < s.bay.q1 + 0.6) return s;
      }
      return null;
    }

    /** Why the garage won't take this car, if it won't. */
    _refuse(v, s) {
      const g = this.game;
      const who = s.mechanic + ': ';
      const a = this._mechOf(s);
      if (!this.isOpen(s) || !a || a.dead || !(a.brain instanceof MechanicBrain)) return "Nobody's here. Come back later.";
      if (g.missions && g.missions.run) return who + "Not while you're on a job, Jay.";
      if (v.kind !== 'car') return who + (v.kind === 'tank' ? 'A tank? Where would I even sell a tank?' : "That won't fit on the ramp. Cars only.");
      if (v.missionOwned || v.role === 'mission') return who + "That's a job car. Not touching it.";
      if (v.encounter) return who + (v.encounter === 'cashvan' ? "An armoured van? It's got more trackers than bolts. Not a chance." : "Half the street saw that one. Too hot, even for me.");
      if (v.keep || v.storyName) return who + "That one's yours to keep, Jay. I'm not stripping it.";
      if (g.police && g.police.level > 0 && g.police.seen) return who + 'Lose the police first. Nobody opens up with them watching.';
      const oj = g.oddJobs;
      const job = oj && oj.dutyFor ? oj.dutyFor(v) : null;
      if (job && oj.jobs && (oj.jobs() || []).some((j) => j.id === job && j.active)) return who + 'Finish your shift first.';
      if (g.crowd && g.crowd.agents.some((x) => x.inCar === v && !x.dead)) return who + 'Drop your passenger off first.';
      return null;
    }

    // -------------------------------------------------------- the offer
    _offerOn(s, v) {
      const g = this.game;
      const q = this.quote(v);
      this.offer = { s, v, q };
      const a = this._mechOf(s);
      if (a && a.brain instanceof MechanicBrain) a.brain.talkT = 2;
      const bits = [s.mechanic + ': ' + VH.util.formatMoney(q.value) + ' for the ' + v.name + '.'];
      if (q.hot) bits.push("It's on the hot list!");
      else if (q.glut) bits.push("Half price: I've had too many today.");
      if (q.police) bits.push('Cop cars have trackers, mind.');
      g.hud.showToast(bits.join(' '));
      VH.events.emit('interaction:focus', { item: { label: 'Sell the ' + v.name + (q.hot ? ' (hot list)' : ''), price: q.value } });
    }

    _offerOff() {
      if (!this.offer) return;
      this.offer = null;
      const I = this.game.interaction;
      VH.events.emit('interaction:focus', { item: I && I.current ? I.current : null });
    }

    // ---------------------------------------------------------- the sale
    _start() {
      const g = this.game;
      const o = this.offer;
      if (!o) return;
      const v = o.v;
      if (!g.player.inVehicle || g.player.vehicle !== v || this._refuse(v, o.s)) {
        this._offerOff();
        return;
      }
      this._offerOff();
      this.job = { s: o.s, v, q: this.quote(v), type: v.type, name: v.name, t: 0, swapped: false, paid: false, cues: 0 };
      g.frozenControls = true;
      v.vel.x = 0;
      v.vel.z = 0;
      g.hud.setFade(1, 450);
      this._door(o.s);
    }

    _runJob(dt) {
      const j = this.job;
      const g = this.game;
      j.t += dt;
      if (!j.swapped) {
        // Lost the car before the screen went dark (it blew up, a script took it): call it off.
        if (j.v.removed || j.v.wrecked || !g.player.inVehicle || g.player.vehicle !== j.v) {
          this._abort();
          return;
        }
        j.v.vel.x = 0;
        j.v.vel.z = 0;
        if (j.t >= T_SWAP) this._swap(j);
      }
      if (j.swapped && !j.paid && j.t >= T_PAY) this._pay(j);
      this._sounds(j);
      if (j.t < T_UP) this._setDoor(j.s, j.swapped ? 1 : 0);
      else this._setDoor(j.s, 1 - smooth((j.t - T_UP) / (T_END - T_UP - 0.2)));
      if (j.t >= T_END) {
        this._setDoor(j.s, 0);
        this.job = null;
      }
    }

    /** In the dark: the car goes, Jay is outside by the door, the door is down. */
    _swap(j) {
      const g = this.game;
      const p = g.player;
      const V = g.vehicles;
      const v = j.v;
      j.swapped = true;
      V.exitVehicle();
      if (V.lastPlayerCar === v) V.lastPlayerCar = null;
      V.remove(v);
      const o = j.s.out;
      p.teleport(o.x, o.z, o.heading, g.physics.groundHeight(o.x, o.z, 2));
      if (p.model && p.model.setVisible) p.model.setVisible(true);
      if (g.cameraRig && g.cameraRig.snapBehind) g.cameraRig.snapBehind(p);
      this._setDoor(j.s, 1);
    }

    /** The lights come up: the cash, the banner, and the heat for a police car. */
    _pay(j) {
      const g = this.game;
      const q = j.q;
      j.paid = true;
      g.frozenControls = false;
      g.hud.setFade(0, 800);
      const t = this.today;
      t.counts[j.type] = (t.counts[j.type] || 0) + 1;
      if (q.hot) t.hot[j.type] = true;
      t.cars++;
      t.earned += q.value;
      this.sold[j.type] = (this.sold[j.type] || 0) + 1;
      this.cars++;
      this.earned += q.value;
      this.best = Math.max(this.best, q.value);
      g.giveMoney(q.value, 'chop');
      g.hud.centerBanner('SOLD · ' + VH.util.formatMoney(q.value), 'The crew strip the ' + j.name + ' in minutes');
      g.hud.popScore(q.hot ? 'HOT LIST ×' + HOT : 'CHOPPED', q.value);
      const a = g.audio;
      if (a.cashRustle) a.cashRustle(0, 1);
      else if (a.purchase) a.purchase();
      VH.events.emit('chop:sold', { type: j.type, value: q.value, hot: q.hot, police: q.police, shop: j.s.id });
      const notes = [];
      if (q.wear < 0.95) notes.push('Knocked down ' + Math.round((1 - q.wear) * 100) + '% for the damage.');
      if (q.glut) notes.push("Half price: that's " + t.counts[j.type] + ' of those today.');
      if (q.hot) {
        const left = this.hotTypes().filter((type) => !t.hot[type]);
        if (left.length) notes.push('Still on the hot list: ' + left.map(carName).join(', ') + '.');
        else if (!t.bonus) {
          t.bonus = true;
          this.earned += FULL_HOUSE;
          g.giveMoney(FULL_HOUSE, 'chop');
          notes.push("That's the whole hot list! " + VH.util.formatMoney(FULL_HOUSE) + ' bonus.');
          if (a.success) a.success('gold');
        }
      }
      if (q.police) {
        const P = g.police;
        if (P && P.level < HEAT) P.setLevel(HEAT, 'chop');
        notes.push('The tracker in the patrol car was still on. The police are coming.');
      }
      if (notes.length) g.hud.notify({ title: BRAND.name, text: notes.join(' '), icon: '🔧', tone: q.police ? 'bad' : undefined, duration: 6000 });
    }

    _abort() {
      const g = this.game;
      const j = this.job;
      this.job = null;
      g.frozenControls = false;
      g.hud.setFade(0, 300);
      if (j) this._setDoor(j.s, 0);
    }

    /** The crew at work in the dark (air tools, a clank), then the door going up. */
    _sounds(j) {
      const a = this.game.audio;
      if (!a || !a.ready || !a._hit) return;
      const cues = [T_SWAP - 0.3, T_SWAP, T_SWAP + 0.2, T_SWAP + 0.45, T_UP];
      while (j.cues < cues.length && j.t >= cues[j.cues]) {
        const i = j.cues++;
        const t = a.ctx.currentTime;
        if (i === cues.length - 1) {
          for (let n = 0; n < 16; n++) a._hit({ t: t + n * 0.075, type: 'bandpass', freq: 650 + (n % 3) * 130, q: 2.5, peak: 0.07, attack: 0.003, decay: 0.05 });
        } else if (i === 2) {
          a._hit({ t, type: 'lowpass', freq: 260, q: 0.8, peak: 0.25, attack: 0.004, decay: 0.2, brown: true });
        } else {
          for (let n = 0; n < 6; n++) a._hit({ t: t + n * 0.03, type: 'bandpass', freq: 2400, q: 3, peak: 0.05, attack: 0.002, decay: 0.025 });
        }
      }
    }

    _door(s) {
      if (s._doorMesh) return s._doorMesh;
      const { KERB, P } = kit();
      const tex = shutterTexture();
      const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: tex, metalness: 0.45, roughness: 0.55 });
      const m = new THREE.Mesh(new THREE.BoxGeometry(s.d1 - s.d0, 1, 0.06), mat);
      const [x, z] = P(s.f, s.uc, s.vb0 + 0.08);
      m.position.set(x, KERB + DOOR_H / 2, z);
      m.rotation.y = s.yawIn;
      m.castShadow = true;
      m.visible = false;
      m.name = 'chop-door';
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
      for (const s of this.list) out.push({ x: s.door.x, z: s.door.z, type: 'chopshop', label: s.name + (this.isOpen(s) ? '' : ' (shut)'), noRim: true });
    }

    stats() {
      if (!this.ok) return [];
      return [['Cars chopped', String(this.cars)], ['Earned at Busted Spanner', VH.util.formatMoney(this.earned)], ['Best price for a car', VH.util.formatMoney(this.best)]];
    }

    serialize() {
      const until = {};
      for (const k of Object.keys(this.until)) if (this.until[k] > this.game.playTime) until[k] = Math.round(this.until[k]);
      const t = this.today;
      return {
        day: this.day, stillT: Math.round(this.stillT),
        today: { counts: Object.assign({}, t.counts), hot: Object.keys(t.hot), cars: t.cars, earned: t.earned, bonus: t.bonus },
        sold: Object.assign({}, this.sold), cars: this.cars, earned: this.earned, best: this.best,
        introduced: this.introduced, pending: this._pending, until,
      };
    }

    load(d) {
      this.stop();
      this._fresh();
      this._pending = false;
      this._h = null;
      if (!d) return;
      this.day = Math.max(1, d.day | 0);
      this.stillT = +d.stillT || 0;
      const t = d.today || {};
      this.today = { counts: Object.assign({}, t.counts || {}), hot: {}, cars: t.cars || 0, earned: t.earned || 0, bonus: !!t.bonus };
      for (const type of t.hot || []) this.today.hot[type] = true;
      this.sold = Object.assign({}, d.sold || {});
      this.cars = d.cars || 0;
      this.earned = d.earned || 0;
      this.best = d.best || 0;
      this.introduced = !!d.introduced;
      this._pending = !!d.pending;
      this.until = Object.assign({}, d.until || {});
    }

    stop() {
      if (!this.ok) return;
      if (this.job) this._abort();
      this._offerOff();
      this.here = null;
      this._still = 0;
    }

    reset() {
      if (!this.ok) return;
      this.stop();
      for (const s of this.list) this._removeMech(s);
      this._fresh();
      this._pending = false;
      this._h = null;
      this._told = null;
    }
  }

  // ------------------------------------------------------------------ map
  VH.MapPainters = VH.MapPainters || [];
  VH.MapPainters.push((g, layout, o) => {
    const k = kit();
    if (!k) return;
    for (const s of layout.chopshops || []) {
      const r = k.rect(s.f, s.a, s.vb0, s.a + s.GW, s.vb1);
      g.fillStyle = 'rgba(0, 0, 0, 0.3)';
      o.R(r[0] + 1, r[1] + 1, r[2] + 1, r[3] + 1);
      g.fillStyle = '#8a5a34';
      o.R(r[0], r[1], r[2], r[3]);
    }
  });

  VH.ChopShops = ChopShops;
})();
