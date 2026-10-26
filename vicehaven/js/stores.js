/*
 * stores.js — corner shops and petrol stations Jay can walk into, buy a
 * snack in, or hold up.
 *
 *   VH.Stores.plan(layout)              picks car parks across the city for
 *                                       the shops (right after CityGen)
 *   VH.Stores.buildLot(world, ctx, lot) builds one: a single-storey shop at
 *                                       the back of the lot with a real
 *                                       interior (counter, shelves, fridges),
 *                                       a forecourt in front, and for the
 *                                       petrol stations a canopy and pumps
 *   new VH.Stores(game)                 the clerks, the snacks, the blips and
 *                                       the save; the hold-ups themselves run
 *                                       in holdup.js (this.holdup)
 *
 * A hold-up: aim a gun at the clerk from inside the shop (holdup.js has the
 * whole story: the clerk's personality, the cash bag, the safe, the silent
 * alarm, the CCTV camera, the shoppers and the guard). An emptied till takes
 * eight minutes of play to fill up again.
 *
 * Every shop is laid out in its own frame: u runs along the street front
 * (left to right seen from the street) and v runs inwards from the front
 * edge of the lot. The frames are mirror images of the world axes, so the
 * helpers below always convert to world coordinates before drawing.
 */
(function () {
  'use strict';

  const VH = window.VH;
  const { clamp, dampAngle } = VH.math;
  const KERB = 0.15;
  const WALL_H = 4.0; // top of the walls above the kerb
  const CEIL = 3.4; // inside ceiling above the kerb
  const GLASS_H = 2.9; // shop windows below the brand fascia
  const T = 0.3; // wall thickness
  const REFILL = 480; // seconds of play before a till is worth robbing again
  // The plan's shuffle. This one leaves alone the car parks the story already
  // uses (places.js steps past a shop lot anyway, but then a place would move).
  const SALT = 'shops-60';

  // Original brands only.
  const BRANDS = {
    sunrise: { name: 'Sunrise 24/7', sign: ['SUNRISE', 'OPEN 24/7'], bg: ['#ff8a1f', '#e2471b'], fg: '#ffffff', band: 0xe8641e, trim: 0xffd27a, shirt: 0xe8641e },
    gullmart: { name: 'Gull Mart', sign: ['GULL MART', 'GROCERIES · SNACKS'], bg: ['#1aa6a6', '#0d6f80'], fg: '#ffffff', band: 0x138c94, trim: 0xe9f7f5, shirt: 0x138c94 },
    hilo: { name: 'Hi-Lo Market', sign: ['HI-LO MARKET'], bg: ['#2fa84f', '#1c6e33'], fg: '#fff6d8', band: 0x23843f, trim: 0xfff2c4, shirt: 0x23843f },
    kwikpik: { name: 'Kwik Pik', sign: ['KWIK PIK', 'COLD DRINKS'], bg: ['#2457d6', '#16348c'], fg: '#ffd84a', band: 0x2050c0, trim: 0xffd84a, shirt: 0x2050c0 },
    tidal: { name: 'Tidal Fuel', sign: ['TIDAL FUEL', 'FOOD MART'], bg: ['#0f8fd6', '#0a4f8c'], fg: '#ffffff', band: 0x0f7fc4, trim: 0xf5c400, shirt: 0x0f6fb0, gas: true },
  };
  const MARTS = ['sunrise', 'gullmart', 'hilo', 'kwikpik'];
  // Shops per district (the docks and estates have their own builders).
  const QUOTA = { oldmarket: 5, harborpoint: 4, palmcrescent: 3, downtown: 2 };
  const GAS_MAX = 3;
  const AVOID_BLOCKS = new Set(['b2_3']); // the smoke test climbs this block's walls
  const SPACING = 105;

  function hashString(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  // ------------------------------------------------------------ frames
  /** The shop's frame on a lot whose street front is `side`. */
  function frameFor(lot, side) {
    const X = lot.maxX - lot.minX;
    const Z = lot.maxZ - lot.minZ;
    if (side === 's') return { side, W: X, D: Z, ox: lot.minX, oz: lot.maxZ, ux: 1, uz: 0, vx: 0, vz: -1 };
    if (side === 'n') return { side, W: X, D: Z, ox: lot.maxX, oz: lot.minZ, ux: -1, uz: 0, vx: 0, vz: 1 };
    if (side === 'e') return { side, W: Z, D: X, ox: lot.maxX, oz: lot.maxZ, ux: 0, uz: -1, vx: -1, vz: 0 };
    return { side, W: Z, D: X, ox: lot.minX, oz: lot.minZ, ux: 0, uz: 1, vx: 1, vz: 0 };
  }

  function P(f, u, v) {
    return [f.ox + f.ux * u + f.vx * v, f.oz + f.uz * u + f.vz * v];
  }

  /** Local coordinates of a world point. */
  function local(f, x, z) {
    const dx = x - f.ox;
    const dz = z - f.oz;
    return [dx * f.ux + dz * f.uz, dx * f.vx + dz * f.vz];
  }

  function sideOf(dx, dz) {
    if (dx > 0.5) return 'e';
    if (dx < -0.5) return 'w';
    return dz > 0 ? 's' : 'n';
  }

  /** World rectangle of a local one. */
  function rect(f, u0, v0, u1, v1) {
    const a = P(f, u0, v0);
    const b = P(f, u1, v1);
    return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])];
  }

  /** Which shop lots fit, and facing which street. */
  function fit(lot, gas) {
    for (const side of ['s', 'n', 'e', 'w']) {
      if (!lot.front[side]) continue;
      const f = frameFor(lot, side);
      if (gas ? f.W >= 30 && f.D >= 27 : f.W >= 13 && f.D >= 14) return side;
    }
    return null;
  }

  // ------------------------------------------------------------ drawing
  /**
   * A builder that draws in a shop's frame. Boxes are axis-aligned in the
   * world, so a local box is just its world rectangle; faces named in the
   * frame (front/back/left/right) are mapped to world sides for `skip`.
   */
  function drawer(ctx, f) {
    const sides = {
      front: sideOf(-f.vx, -f.vz),
      back: sideOf(f.vx, f.vz),
      left: sideOf(-f.ux, -f.uz),
      right: sideOf(f.ux, f.uz),
    };
    const box = (surf, u0, y0, v0, u1, y1, v1, col, opts) => {
      const r = rect(f, u0, v0, u1, v1);
      let o = opts;
      if (opts && opts.skipLocal) {
        const skip = Object.assign({}, opts.skip || {});
        for (const k of opts.skipLocal) skip[sides[k]] = true;
        o = Object.assign({}, opts, { skip });
      }
      ctx[surf].box(r[0], y0, r[1], r[2], y1, r[3], col, o);
    };
    const collide = (u0, y0, v0, u1, y1, v1, tag, flags) => {
      const r = rect(f, u0, v0, u1, v1);
      ctx.physics.addBox(r[0], y0, r[1], r[2], y1, r[3], tag, flags);
    };
    /** A vertical quad from (u0, v0) to (u1, v1), facing local normal (nu, nv). */
    const vquad = (surf, u0, v0, u1, v1, y0, y1, nu, nv, col) => {
      let a = P(f, u0, v0);
      let b = P(f, u1, v1);
      const nx = nu * f.ux + nv * f.vx;
      const nz = nu * f.uz + nv * f.vz;
      let dx = b[0] - a[0];
      let dz = b[1] - a[1];
      if (-dz * nx + dx * nz < 0) {
        [a, b] = [b, a];
        dx = -dx;
        dz = -dz;
      }
      ctx[surf].quad([a[0], y0, a[1]], [b[0], y0, b[1]], [b[0], y1, b[1]], [a[0], y1, a[1]], [nx, 0, nz], col);
    };
    /** A horizontal quad at height y facing up (dir 1) or down (dir -1). */
    const hquad = (surf, u0, v0, u1, v1, y, dir, col) => {
      const r = rect(f, u0, v0, u1, v1);
      if (dir > 0) ctx[surf].topRect(r[0], r[1], r[2], r[3], y, col);
      else ctx[surf].quad([r[0], y, r[1]], [r[2], y, r[1]], [r[2], y, r[3]], [r[0], y, r[3]], [0, -1, 0], col);
    };
    /** A storefront facade on the building surface along a local wall line. */
    const facade = (u0, v0, u1, v1, y0, h, nu, nv, col, F) => {
      let a = P(f, u0, v0);
      let b = P(f, u1, v1);
      const nx = nu * f.ux + nv * f.vx;
      const nz = nu * f.uz + nv * f.vz;
      let dx = b[0] - a[0];
      let dz = b[1] - a[1];
      if (-dz * nx + dx * nz < 0) {
        [a, b] = [b, a];
        dx = -dx;
        dz = -dz;
      }
      const len = Math.hypot(dx, dz);
      if (len < 0.05) return;
      const bays = Math.max(1, Math.round(len / F.bay));
      ctx.b.wall([a[0], y0, a[1]], dx / len, dz / len, len, h, col, null, [0, bays, 0, 1], F.style ? [F.ww, F.wh, F.style, F.seed] : [0, 0, 0, F.seed]);
    };
    return { box, collide, vquad, hquad, facade, sides };
  }

  // ------------------------------------------------------------ the shop
  function buildShop(world, ctx, s) {
    const f = s.f;
    const D = drawer(ctx, f);
    const brand = BRANDS[s.brand];
    const rng = new VH.RNG(s.seed);
    const a0 = s.a;
    const a1 = s.a + s.SW;
    const v0 = s.vb0;
    const v1 = s.vb1;
    const y0 = KERB;
    const yTop = KERB + WALL_H;
    const band = VH.col(brand.band);
    const trim = VH.col(brand.trim);
    const wallCol = VH.col(rng.pick([0xe7e1d3, 0xd9d2c3, 0xefe8dc, 0xcfc8ba]));
    const seed = rng.range(0, 100);
    const shopF = { ww: 0.9, wh: 0.82, style: 4, bay: 2.6, seed };
    const blankF = { style: 0, bay: 4, seed };
    const lot = s.lot;

    // Forecourt: asphalt round the shop, painted bays.
    const W = f.W;
    const asphaltPieces = [[0, 0, W, v0], [0, v1, W, f.D], [0, v0, a0, v1], [a1, v0, W, v1]];
    for (const [u0, q0, u1, q1] of asphaltPieces) {
      if (u1 - u0 < 0.05 || q1 - q0 < 0.05) continue;
      const r = rect(f, u0, q0, u1, q1);
      ctx.asphaltTop.topRect(r[0], r[1], r[2], r[3], KERB, VH.col(0xd8d8d8), 6);
    }
    const white = VH.col(0xe8e8e0);
    const line = (u, q0, q1) => {
      const r = rect(f, u - 0.06, q0, u + 0.06, q1);
      ctx.marks.box(r[0], KERB, r[1], r[2], KERB + 0.001, r[3], white, { skip: { n: true, s: true, e: true, w: true } });
    };
    if (!s.gas && v0 >= 6) {
      // Nose-in bays along the shop front, leaving the door clear.
      for (let u = a0 + 0.4; u <= a1 + 0.01; u += 2.7) {
        if (u > s.d0 - 2.2 && u < s.d1 + 2.2) continue;
        line(u, v0 - 5.6, v0 - 0.9);
      }
      // A wheel stop strip and bollards keep cars out of the glass.
      for (let u = a0 + 0.6; u < a1 - 0.3; u += 2.2) {
        if (u > s.d0 - 0.8 && u < s.d1 + 0.8) continue;
        const [bx, bz] = P(f, u, v0 - 0.45);
        ctx.addProp('bollard', bx, bz, 0, 1);
      }
    }

    // --- shell: walls (building surface), storefront glass on street sides
    // Faces that a facade quad or the lit interior covers are left out (no z-fighting).
    const wallBox = (u0, q0, u1, q1, h0, h1, skipLocal, bottom) =>
      D.box('b', u0, h0, q0, u1, h1, q1, wallCol, { skipLocal, bottom, skip: { top: true } });
    const leftStreet = !!lot.front[D.sides.left];
    const rightStreet = !!lot.front[D.sides.right];
    const backStreet = !!lot.front[D.sides.back];
    // Back and side walls, full height.
    const backSkip = ['front'];
    if (backStreet) backSkip.push('back');
    if (leftStreet) backSkip.push('left');
    if (rightStreet) backSkip.push('right');
    wallBox(a0, v1 - T, a1, v1, y0, yTop, backSkip);
    wallBox(a0, v0, a0 + T, v1 - T, y0, yTop, leftStreet ? ['left', 'right', 'front'] : ['right', 'front']);
    wallBox(a1 - T, v0, a1, v1 - T, y0, yTop, rightStreet ? ['right', 'left', 'front'] : ['left', 'front']);
    if (leftStreet) {
      D.facade(a0, v1, a0, v0, y0, GLASS_H, -1, 0, wallCol, shopF);
      D.facade(a0, v1, a0, v0, y0 + GLASS_H, WALL_H - GLASS_H, -1, 0, wallCol, blankF);
    }
    if (rightStreet) {
      D.facade(a1, v0, a1, v1, y0, GLASS_H, 1, 0, wallCol, shopF);
      D.facade(a1, v0, a1, v1, y0 + GLASS_H, WALL_H - GLASS_H, 1, 0, wallCol, blankF);
    }
    if (backStreet) D.facade(a1, v1, a0, v1, y0, WALL_H, 0, 1, wallCol, blankF);
    // Front wall: glass either side of the door, a lintel, the fascia above.
    const DOOR_H = 2.45;
    wallBox(a0 + T, v0, s.d0, v0 + T, y0, y0 + GLASS_H, ['front', 'back']);
    wallBox(s.d1, v0, a1 - T, v0 + T, y0, y0 + GLASS_H, ['front', 'back']);
    D.facade(a0, v0, s.d0, v0, y0, GLASS_H, 0, -1, wallCol, shopF);
    D.facade(s.d1, v0, a1, v0, y0, GLASS_H, 0, -1, wallCol, shopF);
    wallBox(s.d0, v0, s.d1, v0 + T, y0 + DOOR_H, y0 + GLASS_H, ['back'], true);
    wallBox(a0 + T, v0, a1 - T, v0 + T, y0 + GLASS_H, yTop, ['back']);
    // The brand fascia stands proud of the wall, with a trim line under it.
    D.box('b', a0 - 0.15, y0 + GLASS_H, v0 - 0.2, a1 + 0.15, yTop + 0.15, v0, band, { bottom: true });
    D.box('prop', a0 - 0.16, y0 + GLASS_H - 0.12, v0 - 0.22, a1 + 0.16, y0 + GLASS_H, v0, trim, { bottom: true });
    // Door frame: dark metal posts and a glass door standing open inwards.
    const metal = VH.col(0x2b2f35);
    D.box('prop', s.d0, y0, v0 - 0.02, s.d0 + 0.08, y0 + DOOR_H, v0 + T + 0.02, metal);
    D.box('prop', s.d1 - 0.08, y0, v0 - 0.02, s.d1, y0 + DOOR_H, v0 + T + 0.02, metal);
    // Roof: gravel, parapet, a couple of AC units.
    const r = rect(f, a0, v0 - 0.2, a1, v1);
    ctx.b.quad([r[0], yTop, r[3]], [r[2], yTop, r[3]], [r[2], yTop, r[1]], [r[0], yTop, r[1]], [0, 1, 0], VH.col(0x8f8c86), null, null, [0, 0, -1, seed]);
    const par = VH.colMul(wallCol, 0.9);
    D.box('b', a0, yTop, v1 - 0.25, a1, yTop + 0.5, v1, par);
    D.box('b', a0, yTop, v0 + T - 0.25, a0 + 0.25, yTop + 0.5, v1 - 0.25, par);
    D.box('b', a1 - 0.25, yTop, v0 + T - 0.25, a1, yTop + 0.5, v1 - 0.25, par);
    for (let i = 0; i < 2; i++) {
      const cu = a0 + 2.5 + i * (s.SW - 5);
      const cv = v0 + s.SD * 0.6;
      D.box('prop', cu - 0.8, yTop, cv - 0.6, cu + 0.8, yTop + 1.0, cv + 0.6, VH.col(0xb9bcbf));
    }

    // Colliders: walls, the lintel, and the roof over the room.
    const FLAGS = VH.COLLIDE.ALL;
    D.collide(a0, 0, v1 - T, a1, yTop + 0.5, v1, 'building', FLAGS);
    D.collide(a0, 0, v0, a0 + T, yTop + 0.5, v1, 'building', FLAGS);
    D.collide(a1 - T, 0, v0, a1, yTop + 0.5, v1, 'building', FLAGS);
    D.collide(a0, 0, v0 - 0.2, s.d0, yTop + 0.5, v0 + T, 'building', FLAGS);
    D.collide(s.d1, 0, v0 - 0.2, a1, yTop + 0.5, v0 + T, 'building', FLAGS);
    D.collide(s.d0, y0 + DOOR_H, v0 - 0.2, s.d1, yTop + 0.5, v0 + T, 'building', FLAGS);
    D.collide(a0, y0 + CEIL, v0, a1, yTop + 0.5, v1, 'building', FLAGS);

    // --- interior (lit surface, never in the roof's shadow)
    const i0 = a0 + T;
    const i1 = a1 - T;
    const q0 = v0 + T;
    const q1 = v1 - T;
    const yc = y0 + CEIL;
    const dado = VH.colMix(band, VH.col(0xffffff), 0.35);
    const paint = VH.col(0xf1ede4);
    const two = (u0, v0_, u1, v1_, nu, nv) => {
      D.vquad('interior', u0, v0_, u1, v1_, y0, y0 + 1.0, nu, nv, dado);
      D.vquad('interior', u0, v0_, u1, v1_, y0 + 1.0, yc, nu, nv, paint);
    };
    two(i0, q1, i1, q1, 0, -1); // back
    two(i0, q0, i0, q1, 1, 0); // left
    two(i1, q0, i1, q1, -1, 0); // right
    two(i0, q0, s.d0, q0, 0, 1); // front, left of the door
    two(s.d1, q0, i1, q0, 0, 1); // front, right of the door
    D.vquad('interior', s.d0, q0, s.d1, q0, y0 + DOOR_H, yc, 0, 1, paint);
    // Daylight through the windows (seen from inside).
    const sky = VH.col(0xcfe4f2, 1.05);
    D.vquad('screen', i0 + 0.4, q0 + 0.01, s.d0 - 0.3, q0 + 0.01, y0 + 1.05, y0 + 2.6, 0, 1, sky);
    if (s.d1 + 0.3 < i1 - 0.4) D.vquad('screen', s.d1 + 0.3, q0 + 0.01, i1 - 0.4, q0 + 0.01, y0 + 1.05, y0 + 2.6, 0, 1, sky);
    // Floor tiles in two tones, the ceiling and its light panels.
    D.hquad('interior', i0, q0, i1, q1, y0 + 0.012, 1, VH.col(0xd9d4c8));
    const tile = VH.col(0xc4beb1);
    for (let u = i0 + 1.2; u < i1 - 0.6; u += 2.4) D.hquad('interior', u, q0, Math.min(u + 0.6, i1), q1, y0 + 0.02, 1, tile);
    D.hquad('interior', i0, q0, i1, q1, yc, -1, VH.col(0xe8e6e1));
    const lamp = VH.col(0xfff6e6, 1.4);
    for (let u = i0 + 1.6; u < i1 - 1.0; u += 3.2) {
      for (let v = q0 + 1.6; v < q1 - 1.0; v += 2.8) D.hquad('screen', u, v, u + 1.3, v + 0.45, yc - 0.01, -1, lamp);
    }
    // An entrance mat.
    D.hquad('interior', s.d0, q0, s.d1, q0 + 1.4, y0 + 0.028, 1, VH.col(0x3a3d42));

    // Counter along the left wall, the clerk behind it, a rack behind him.
    const c0 = a0 + 1.8;
    const c1 = a0 + 2.6;
    const cv0 = v0 + 1.6;
    const cv1 = v0 + 5.0;
    D.box('interior', c0, y0, cv0, c1, y0 + 1.0, cv1, VH.colMix(band, VH.col(0x2a2a2a), 0.35));
    D.box('interior', c0 - 0.06, y0 + 1.0, cv0 - 0.06, c1 + 0.08, y0 + 1.06, cv1 + 0.06, VH.col(0x3b342d));
    D.collide(c0, 0, cv0, c1, y0 + 1.06, cv1, 'counter', FLAGS);
    // Till and card reader.
    const tv = v0 + 2.4;
    D.box('interior', c0 + 0.15, y0 + 1.06, tv - 0.25, c0 + 0.55, y0 + 1.18, tv + 0.25, VH.col(0x2a2c30));
    D.box('interior', c0 + 0.25, y0 + 1.18, tv - 0.18, c0 + 0.32, y0 + 1.48, tv + 0.18, VH.col(0x2a2c30));
    D.vquad('screen', c0 + 0.325, tv - 0.15, c0 + 0.325, tv + 0.15, y0 + 1.22, y0 + 1.45, 1, 0, VH.col(0x6fe0c8, 1.2));
    // Sweets on the counter front, facing the customers.
    for (let v = cv0 + 0.2; v < cv1 - 0.3; v += 0.5) {
      const col = VH.col(rng.pick([0xe24a3b, 0xf2b01e, 0x2a7de1, 0x1faa6b, 0x8a3fd1, 0xf06292]));
      D.box('interior', c1, y0 + 0.5, v, c1 + 0.12, y0 + 0.85, v + 0.38, col);
    }
    // The rack behind the counter.
    D.box('interior', i0, y0, cv0, i0 + 0.45, y0 + 2.2, cv1, VH.col(0x5a4a3c));
    for (let lvl = 0; lvl < 4; lvl++) {
      const y = y0 + 0.9 + lvl * 0.32;
      for (let v = cv0 + 0.1; v < cv1 - 0.2; v += 0.34) {
        const col = VH.col(rng.pick([0xd93b48, 0xf2c94c, 0x3d7be0, 0x27ae60, 0xffffff, 0xef6c2f, 0x16a3a3]));
        D.box('interior', i0 + 0.45, y, v, i0 + 0.5, y + 0.24, v + 0.26, col);
      }
    }
    D.collide(i0, 0, cv0, i0 + 0.5, y0 + 2.2, cv1, 'shelf', FLAGS);

    // Fridges along the back wall: glowing doors with drinks behind them.
    const fu0 = a0 + 3.2;
    const fu1 = i1;
    const fv = q1 - 0.8;
    D.box('interior', fu0, y0, fv, fu1, y0 + 2.2, q1, VH.col(0x34383e));
    D.vquad('screen', fu0 + 0.05, fv - 0.005, fu1 - 0.05, fv - 0.005, y0 + 0.2, y0 + 2.0, 0, -1, VH.col(0xd8ecff, 1.15));
    const drinks = [0xd93b48, 0xf2b01e, 0x2a7de1, 0x1faa6b, 0xffffff, 0x8a3fd1, 0xef6c2f];
    for (let lvl = 0; lvl < 4; lvl++) {
      const y = y0 + 0.3 + lvl * 0.43;
      for (let u = fu0 + 0.15; u < fu1 - 0.25; u += 0.55) {
        D.vquad('screen', u, fv - 0.012, u + 0.42, fv - 0.012, y, y + 0.28, 0, -1, VH.col(rng.pick(drinks), 0.9));
      }
    }
    for (let u = fu0; u <= fu1 + 0.01; u += 1.0) D.box('interior', u - 0.03, y0 + 0.15, fv - 0.04, u + 0.03, y0 + 2.05, fv, metal);
    D.collide(fu0, 0, fv, fu1, y0 + 2.2, q1, 'fridge', FLAGS);

    // A wall shelf down the right-hand side.
    const wv0 = q0 + 2.0;
    const wv1 = fv - 1.2;
    if (wv1 - wv0 > 1.5) {
      D.box('interior', i1 - 0.55, y0, wv0, i1, y0 + 1.9, wv1, VH.col(0xe2e0da));
      for (let lvl = 0; lvl < 4; lvl++) {
        const y = y0 + 0.25 + lvl * 0.42;
        for (let v = wv0 + 0.1; v < wv1 - 0.3; v += 0.4) {
          D.box('interior', i1 - 0.62, y, v, i1 - 0.55, y + rng.range(0.2, 0.32), v + 0.32, VH.col(rng.pick(drinks)));
        }
      }
      D.collide(i1 - 0.6, 0, wv0, i1, y0 + 1.9, wv1, 'shelf', FLAGS);
    }

    // Gondolas down the middle.
    const gu0 = a0 + 4.4;
    const gu1 = i1 - 0.6 - 1.3;
    const gv0 = q0 + 2.2;
    const gv1 = fv - 1.4;
    const n = Math.floor((gu1 - gu0 + 1.4) / 2.3);
    const goods = [0xd93b48, 0xf2c94c, 0x3d7be0, 0x27ae60, 0xf5f0e6, 0xef6c2f, 0x16a3a3, 0x8e5a3c, 0xb03a8c];
    for (let k = 0; k < n && gv1 - gv0 > 1.5; k++) {
      const gu = gu0 + k * 2.3;
      D.box('interior', gu, y0, gv0, gu + 0.9, y0 + 1.5, gv1, VH.col(0xdedcd6));
      for (const [su, out] of [[gu, -1], [gu + 0.9, 1]]) {
        for (let lvl = 0; lvl < 3; lvl++) {
          const y = y0 + 0.2 + lvl * 0.42;
          for (let v = gv0 + 0.08; v < gv1 - 0.3; v += 0.4) {
            const col = VH.col(rng.pick(goods));
            const top = y + rng.range(0.18, 0.3);
            if (out < 0) D.box('interior', su - 0.07, y, v, su, top, v + 0.32, col);
            else D.box('interior', su, y, v, su + 0.07, top, v + 0.32, col);
          }
        }
      }
      // A price card on the end facing the door.
      D.box('interior', gu + 0.15, y0 + 1.5, gv0 - 0.02, gu + 0.75, y0 + 1.9, gv0 + 0.02, band);
      D.collide(gu - 0.06, 0, gv0, gu + 0.96, y0 + 1.5, gv1, 'shelf', FLAGS);
    }

    // The brand sign on the fascia.
    const yawOut = Math.atan2(-f.vx, -f.vz);
    const [sx, sz] = P(f, (a0 + a1) / 2, v0 - 0.28);
    const signs = world.signs || (world.signs = []);
    signs.push({ x: sx, y: y0 + GLASS_H + (WALL_H - GLASS_H) / 2 + 0.05, z: sz, yaw: yawOut, w: Math.min(s.SW - 2.5, 9), h: 0.85, lines: brand.sign, style: 'brand', colors: { bg: brand.bg, fg: brand.fg }, frame: brand.band });
    // An OPEN sign in the window and a glow on the pavement at night.
    const [ox, oz] = P(f, s.d0 - 1.0, v0 - 0.02);
    signs.push({ x: ox, y: y0 + 2.2, z: oz, yaw: yawOut, w: 0.9, h: 0.35, lines: ['OPEN'], style: 'neon' });
    const [cx, cz] = P(f, (a0 + a1) / 2, (v0 + v1) / 2);
    const pools = world.floodlights || (world.floodlights = []);
    pools.push({ x: cx, z: cz, r: Math.min(s.SW, s.SD) * 0.55, y: KERB + 0.03 });
    const [fx, fz] = P(f, (a0 + a1) / 2, v0 - 3);
    pools.push({ x: fx, z: fz, r: 5, y: KERB + 0.03 });

    // Snacks at the counter (interaction.js picks this up).
    const [bx, bz] = P(f, c1 + 0.55, (cv0 + cv1) / 2);
    ctx.addInteractable({ id: s.id + '_buy', kind: 'storeBuy', store: s.id, x: bx, y: y0 + 1.0, z: bz, radius: 1.7, label: 'Buy snacks', price: 6, heal: 35 });
    if (s.gas) buildForecourt(world, ctx, s, D);
    return yTop + 1.0;
  }

  /** Petrol station extras: the canopy, two pump islands and a price pylon. */
  function buildForecourt(world, ctx, s, D) {
    const f = s.f;
    const brand = BRANDS[s.brand];
    const band = VH.col(brand.band);
    const trim = VH.col(brand.trim);
    const cu = f.W / 2;
    const hw = Math.min(11, f.W / 2 - 4);
    const cv0 = 3;
    const cv1 = s.vb0 - 3.5;
    const y0 = KERB;
    const yu = KERB + 5.0;
    const steel = VH.col(0xd9dcdf);
    // The canopy: white underside full of lights, brand fascia round the edge.
    D.box('prop', cu - hw, yu, cv0, cu + hw, yu + 0.25, cv1, steel, { bottom: true });
    D.box('prop', cu - hw - 0.1, yu + 0.25, cv0 - 0.1, cu + hw + 0.1, yu + 1.05, cv1 + 0.1, band);
    D.box('prop', cu - hw - 0.12, yu + 0.2, cv0 - 0.12, cu + hw + 0.12, yu + 0.32, cv1 + 0.12, trim);
    const lamp = VH.col(0xffffff, 1.5);
    for (let u = cu - hw + 1.5; u < cu + hw - 1.5; u += 3.2) {
      for (let v = cv0 + 1.5; v < cv1 - 1.0; v += 3.0) D.hquad('screen', u, v, u + 1.6, v + 0.5, yu - 0.01, -1, lamp);
    }
    // Columns and pump islands.
    const islands = [cu - hw * 0.45, cu + hw * 0.45];
    for (const iu of islands) {
      for (const cv of [cv0 + 1.6, cv1 - 1.6]) {
        D.box('prop', iu - 0.25, y0, cv - 0.25, iu + 0.25, yu, cv + 0.25, steel);
        D.collide(iu - 0.3, 0, cv - 0.3, iu + 0.3, yu, cv + 0.3, 'pole', VH.COLLIDE.ALL);
      }
      D.box('concrete', iu - 0.7, y0, cv0 + 2.2, iu + 0.7, y0 + 0.2, cv1 - 2.2, VH.col(0xc9c4b8));
      D.collide(iu - 0.7, 0, cv0 + 2.2, iu + 0.7, y0 + 0.2, cv1 - 2.2, 'kerb', VH.COLLIDE.SOLID);
      for (const pv of [cv0 + 3.4, cv1 - 3.4]) {
        D.box('prop', iu - 0.35, y0 + 0.2, pv - 0.5, iu + 0.35, y0 + 1.75, pv + 0.5, VH.col(0xeeeeea));
        D.box('prop', iu - 0.36, y0 + 1.75, pv - 0.52, iu + 0.36, y0 + 2.05, pv + 0.52, band);
        D.vquad('screen', iu - 0.36, pv - 0.3, iu - 0.36, pv + 0.3, y0 + 1.25, y0 + 1.6, -1, 0, VH.col(0x7ff0d0, 1.1));
        D.vquad('screen', iu + 0.36, pv - 0.3, iu + 0.36, pv + 0.3, y0 + 1.25, y0 + 1.6, 1, 0, VH.col(0x7ff0d0, 1.1));
        D.collide(iu - 0.4, 0, pv - 0.55, iu + 0.4, y0 + 2.05, pv + 0.55, 'pump', VH.COLLIDE.ALL);
      }
    }
    D.collide(cu - hw, yu, cv0, cu + hw, yu + 1.05, cv1, 'building', VH.COLLIDE.ALL);
    // Price pylon at the front corner.
    const [px, pz] = P(f, 1.6, 1.4);
    (world.signs || (world.signs = [])).push({ x: px, y: 4.2, z: pz, yaw: Math.atan2(-f.vx, -f.vz), w: 2.6, h: 2.2, lines: ['TIDAL', 'UNLEADED 1.89', 'DIESEL 1.97'], style: 'brand', colors: { bg: brand.bg, fg: brand.fg }, posts: true, frame: brand.band });
    const [fx, fz] = P(f, cu, (cv0 + cv1) / 2);
    (world.floodlights || (world.floodlights = [])).push({ x: fx, z: fz, r: hw + 2, y: KERB + 0.03 });
  }

  // ------------------------------------------------------------ the clerk
  // How he holds himself in each mode: hands up, cowering, crouched, arms out
  // in front (working the till or the dial) and how far he looks down.
  const POSES = {
    idle: { hands: 0, cower: 0, crouch: 0, aim: 0, look: 0 },
    nervous: { hands: 0.3, cower: 0, crouch: 0, aim: 0, look: 0 },
    hands: { hands: 1, cower: 0, crouch: 0, aim: 0, look: 0 },
    till: { hands: 0, cower: 0, crouch: 0, aim: 0.72, look: -0.9 },
    hold: { hands: 0.55, cower: 0, crouch: 0, aim: 0, look: 0 },
    throw: { hands: 0.15, cower: 0, crouch: 0, aim: 0.95, look: 0 },
    walk: { hands: 0.5, cower: 0, crouch: 0, aim: 0, look: 0 },
    kneel: { hands: 0, cower: 0, crouch: 1, aim: 0.6, look: -0.6 },
    kneelHands: { hands: 0.8, cower: 0, crouch: 1, aim: 0, look: 0 },
    tell: { hands: 0.06, cower: 0, crouch: 0.25, aim: 0.3, look: -2.2 },
    panic: { hands: 1, cower: 0, crouch: 0.15, aim: 0, look: 0 },
    cower: { hands: 0, cower: 1, crouch: 0, aim: 0, look: 0 },
  };
  const FACE_JAY = { nervous: true, hands: true, hold: true, throw: true, tell: true, panic: true, kneelHands: false };

  /**
   * The clerk's body: where he stands, which way he faces and how he holds
   * himself. A hold-up (holdup.js) directs him through `mode` and `goal`:
   *   idle        serves at his post (watching Jay while he's in the shop)
   *   nervous     watches Jay, hands half raised
   *   hands       hands up, facing Jay
   *   till        at the till, working the drawer
   *   hold        holding the bag, hands half up
   *   throw       tossing the bag onto the counter
   *   walk        walking to `goal` with his hands half up
   *   kneel       kneeling at `goal` working the safe's dial (kneelHands: done)
   *   tell        hands dropping, eyes down: reaching under the counter
   *   panic       frozen with his hands high
   *   cower       arms over his head
   * `tremble` (0..1, more when panicking) shakes his heading a little.
   */
  class ClerkBrain {
    constructor(stores, s) {
      this.stores = stores;
      this.s = s;
      this.mode = 'idle';
      this.goal = null; //    { x, z, heading } instead of his post
      this.watch = false; //  Jay's in the shop: keep an eye on him
      this.busy = false; //   held up: gunfire and hits leave the mode to holdup.js
      this.tremble = 0;
      this.voice = 'clerk_m'; // dialogue cast id (holdup.js)
      this.hostile = false;
      this._scared = 0;
      this._t = Math.random() * 10;
      this._jit = 0;
      this._look = 0;
    }

    update(a, dt) {
      if (a.dead) return;
      const g = this.stores.game;
      const p = g.player;
      const an = a.anim;
      this._t += dt;
      a.moveSpeed = 0;
      if (this._scared > 0 && !this.busy) {
        this._scared -= dt;
        if (this._scared <= 0 && (this.mode === 'cower' || this.mode === 'hands' || this.mode === 'panic')) this.mode = 'idle';
      }
      const m = this.mode;
      const to = this.goal || this.s.clerk;
      const dx = to.x - a.pos.x;
      const dz = to.z - a.pos.z;
      const walks = m === 'idle' || m === 'walk' || m === 'till' || m === 'kneel' || m === 'kneelHands';
      // Remove last frame's tremble before steering, add this frame's after.
      a.heading -= this._jit;
      if (walks && Math.hypot(dx, dz) > (m === 'idle' ? 0.45 : 0.25)) {
        a.heading = dampAngle(a.heading, Math.atan2(dx, dz), 8, dt);
        a.moveSpeed = m === 'walk' ? 1.0 : 1.15;
      } else {
        let want = to.heading === undefined ? a.heading : to.heading;
        if (FACE_JAY[m] || (m === 'idle' && this.watch)) want = Math.atan2(p.pos.x - a.pos.x, p.pos.z - a.pos.z);
        if (m !== 'cower') a.heading = dampAngle(a.heading, want, m === 'till' ? 7 : 5, dt);
      }
      const shake = m === 'panic' ? Math.max(1.5, this.tremble) : this.tremble;
      this._jit = shake > 0 ? (Math.sin(this._t * 31) * 0.6 + Math.sin(this._t * 17.3 + 1) * 0.4) * 0.05 * shake : 0;
      a.heading += this._jit;
      // The pose.
      const P = POSES[m] || POSES.idle;
      const k = Math.min(1, dt * 8);
      let aim = P.aim;
      if (m === 'till') aim += 0.12 * Math.sin(this._t * 9); // stuffing notes into the bag
      if (m === 'kneel') aim += 0.08 * Math.sin(this._t * 5); // turning the dial
      an.handsUp += (P.hands - an.handsUp) * k;
      an.cower += (P.cower - an.cower) * Math.min(1, dt * 6);
      an.crouch += (P.crouch - an.crouch) * Math.min(1, dt * 5);
      an.aim += (aim - an.aim) * k;
      this._look += (P.look - this._look) * k;
      an.lookPitch = this._look;
      an.talk = m === 'cower' || !g.dialogue ? 0 : g.dialogue.talkLevel(this.voice) * 0.8;
      an.talkEnergy = an.talk > 0 ? g.dialogue.talkEnergy(this.voice) : 0;
    }

    scare(seconds) {
      if (this.busy) return;
      if (this.mode !== 'hands') this.mode = 'cower';
      this.goal = null;
      this._scared = Math.max(this._scared, seconds);
    }

    /** Shot at or hit (combat.js). A hold-up deals with it itself. */
    setAlert() {
      this.scare(8);
    }

    expired() {
      return false; // the shop keeps its own clerk
    }
  }

  // ================================================================ stores
  class Stores {
    /** Choose the car parks that become shops. Runs once, before the world is built. */
    static plan(layout) {
      const lots = [];
      for (const b of layout.blocks) {
        if (b.kind !== 'buildings' || AVOID_BLOCKS.has(b.id)) continue;
        for (const l of b.lots) if (l.kind === 'parking') lots.push(l);
      }
      lots.sort((p, q) => hashString(p.id + SALT) - hashString(q.id + SALT));
      const chosen = [];
      const far = (l) => chosen.every((c) => Math.hypot(c.lot.cx - l.cx, c.lot.cz - l.cz) > SPACING);
      const count = {};
      // Petrol stations first, one per district at most, on the big lots.
      for (const l of lots) {
        if (chosen.length >= GAS_MAX) break;
        const d = l.district.id;
        if (!QUOTA[d] || count[d]) continue;
        const side = fit(l, true);
        if (!side || !far(l)) continue;
        chosen.push({ lot: l, side, brand: 'tidal' });
        count[d] = 1;
      }
      for (const l of lots) {
        const d = l.district.id;
        if (!QUOTA[d] || (count[d] || 0) >= QUOTA[d] || chosen.some((c) => c.lot === l)) continue;
        const side = fit(l, false);
        if (!side || !far(l)) continue;
        chosen.push({ lot: l, side, brand: null });
        count[d] = (count[d] || 0) + 1;
      }
      // A fixed order (west to east, north to south) so ids are stable.
      chosen.sort((p, q) => p.lot.cx - q.lot.cx || p.lot.cz - q.lot.cz);
      // Deal the corner-shop chains out in turn so neighbours differ.
      let m = 0;
      for (const c of chosen) if (!c.brand) c.brand = MARTS[m++ % MARTS.length];
      layout.stores = chosen.map((c, i) => Stores._describe(layout, c, i));
      for (const s of layout.stores) s.lot.store = s;
      return layout.stores;
    }

    static _describe(layout, c, i) {
      const lot = c.lot;
      const f = frameFor(lot, c.side);
      const gas = !!BRANDS[c.brand].gas;
      const SW = gas ? 14 : clamp(Math.floor(f.W - 3), 11, 18);
      const SD = gas ? 10 : clamp(Math.floor(f.D - 8.5), 9, 13);
      const a = (f.W - SW) / 2;
      const vb1 = f.D - 0.6;
      const vb0 = vb1 - SD;
      const d1 = a + SW - 1.8;
      const d0 = d1 - 2.0;
      const at = (u, v) => {
        const [x, z] = P(f, u, v);
        return { x, z };
      };
      const clerk = at(a + 1.15, vb0 + 3.3);
      clerk.heading = Math.atan2(f.ux, f.uz);
      const front = at((d0 + d1) / 2, -3);
      const road = VH.CityGen.roadNameAt(layout, front.x, front.z);
      const brand = BRANDS[c.brand];
      const hold = Stores._holdPoints(f, gas, a, SW, vb0, vb1, d0, d1);
      return {
        id: 'store_' + (i + 1),
        brand: c.brand,
        name: brand.name + (road ? ', ' + road : ''),
        gas,
        lot,
        district: lot.district.id,
        f, a, SW, SD, vb0, vb1, d0, d1,
        clerk,
        door: at((d0 + d1) / 2, vb0 - 1.2),
        centre: at(a + SW / 2, (vb0 + vb1) / 2),
        yawIn: Math.atan2(f.vx, f.vz),
        seed: hashString(lot.id + SALT),
        hold,
      };
    }

    /**
     * Where things are inside the shop for a hold-up (holdup.js), worked out
     * from the same measurements buildShop draws with. Points are world
     * { x, z } (some with a y or a heading); the frame is mirrored, so a
     * heading is always turned from a local direction (du, dv).
     */
    static _holdPoints(f, gas, a, SW, vb0, vb1, d0, d1) {
      const at = (u, v, du, dv) => {
        const [x, z] = P(f, u, v);
        const o = { x, z };
        if (du !== undefined) o.heading = Math.atan2(du * f.ux + dv * f.vx, du * f.uz + dv * f.vz);
        return o;
      };
      const c0 = a + 1.8; // the counter, along the left wall (buildShop)
      const c1 = a + 2.6;
      const i1 = a + SW - T;
      const q0 = vb0 + T;
      const q1 = vb1 - T;
      const fv = q1 - 0.8; // front of the fridges along the back wall
      const yTop = KERB + 1.06; // counter top
      const hold = {
        hasSafe: gas || SW >= 14,
        // The till's cash drawer: its back edge, sliding out towards the clerk.
        till: Object.assign(at(c0 + 0.5, vb0 + 2.4, -1, 0), { y: yTop + 0.005 }),
        tillStand: at(a + 1.2, vb0 + 2.4, 1, 0), // where the clerk works the till
        bag: Object.assign(at(c1 - 0.2, vb0 + 3.0), { y: yTop }), // tossed onto the counter, Jay's side
        corner: at(a + 1.25, vb0 + 5.6), // past the end of the counter, on the way to the safe
        // The safe: back face against the back wall in the open back-left
        // corner, door facing into the room (the clerk's kneel is below).
        safe: at(a + 1.05, q1, 0, -1),
        guard: at(d0 - 0.75, vb0 + 1.0, 0, 1), // inside, beside the door
        doorIn: at((d0 + d1) / 2, vb0 + 1.0),
        out: at((d0 + d1) / 2 + 3, vb0 - 6),
        shoppers: [],
      };
      // The clerk kneels in front of the safe a little to the latch side, so
      // the door (hinged on the left as you face it, holdup-models.js) swings
      // open clear of him, and faces the dial. Worked out from the safe's
      // heading: its +x is (cos h, -sin h), whichever way the frame is mirrored.
      const S = hold.safe;
      const sx = Math.sin(S.heading);
      const sz = Math.cos(S.heading);
      const kx = S.x + sx * 1.05 + sz * 0.25;
      const kz = S.z + sz * 1.05 - sx * 0.25;
      hold.kneel = { x: kx, z: kz, heading: Math.atan2(S.x + sx * 0.58 - kx, S.z + sz * 0.58 - kz) };
      // The CCTV camera: up in the corner above the door, its plate on the
      // inside of the front wall, looking at the till.
      const cu = d0 + 0.3;
      const cv = q0 + 0.005;
      const cy = KERB + CEIL - 0.22;
      const tu = c0 + 0.35 - cu;
      const tv = vb0 + 2.6 - cv;
      const cam = at(cu, cv, tu, tv);
      cam.y = cy;
      cam.pitch = Math.atan2(cy - (KERB + 1.2), Math.hypot(tu, tv));
      hold.cam = cam;
      // Shoppers browse the aisles (same gondola layout as buildShop) and
      // the fridges. Each spot knows its way out to the cross aisle in front
      // of the gondolas, so they walk round the shelves, not into them.
      const gu0 = a + 4.4;
      const gu1 = i1 - 0.6 - 1.3;
      const gv0 = q0 + 2.2;
      const gv1 = fv - 1.4;
      const n = gv1 - gv0 > 1.5 ? Math.floor((gu1 - gu0 + 1.4) / 2.3) : 0;
      const aisleV = n ? gv0 - 0.75 : (q0 + fv) / 2;
      const wall = fv - 1.2 - (q0 + 2.0) > 1.5; // the wall shelf down the right
      const aisles = []; // [centre u, shelf on the left?, shelf on the right?]
      if (n) {
        aisles.push([(c1 + gu0) / 2, false, true]);
        for (let k = 0; k < n - 1; k++) aisles.push([gu0 + k * 2.3 + 1.6, true, true]);
        const end = gu0 + (n - 1) * 2.3 + 0.9;
        const right = wall ? i1 - 0.6 : i1;
        if (right - end > 1.0) aisles.push([(end + right) / 2, true, wall]);
      } else {
        for (let u = a + 3.8; u < i1 - 0.6; u += 1.6) aisles.push([u, false, false]);
      }
      const spots = hold.shoppers;
      for (const [uc, left, right] of aisles) {
        const lane = at(uc, aisleV);
        if (n) {
          for (let v = gv0 + 0.55; v < gv1 - 0.3; v += 1.3) {
            if (left) spots.push(Object.assign(at(uc - 0.2, v, -1, 0), { lane }));
            if (right) spots.push(Object.assign(at(uc + 0.2, v, 1, 0), { lane }));
          }
        }
        if (uc > a + 3.5) spots.push(Object.assign(at(uc, fv - 0.55, 0, 1), { lane }));
      }
      return hold;
    }

    /** World build: the shop on a planned lot. Returns the roof height. */
    static buildLot(world, ctx, lot) {
      return buildShop(world, ctx, lot.store);
    }

    static registerPlaces(world, places) {
      for (const s of places.layout.stores || []) {
        places.add(s.id, { name: s.name, x: s.door.x, z: s.door.z, yaw: s.yawIn, kind: 'store', district: s.district });
      }
    }

    // ------------------------------------------------------------ runtime
    constructor(game) {
      this.game = game;
      this.list = game.layout.stores || [];
      this.ok = this.list.length > 0;
      this.saveKey = 'stores';
      this.byId = new Map(this.list.map((s) => [s.id, s]));
      this.until = {}; // store id -> playTime when the till is full again
      this.robbed = 0;
      this.cash = 0;
      this.clerks = new Map(); // store id -> agent
      this.killed = new Set(); // shops whose clerk was killed: shut until the till refills
      this._tipShown = false;
      this._lastInside = null;
      this._v = new THREE.Vector3();
      if (!this.ok) return;
      this.holdup = VH.HoldUp ? new VH.HoldUp(this) : null;
      this._bind();
    }

    _bind() {
      const g = this.game;
      g.interaction.on('storeBuy', (item, player) => this._buy(item, player));
      VH.events.on('agent:died', (e) => {
        const s = this._storeOfClerk(e.agent);
        if (!s) return;
        this.until[s.id] = Math.max(this.until[s.id] || 0, g.playTime + REFILL);
        this.killed.add(s.id);
        if (this.holdup) this.holdup.clerkDied(s);
      });
      VH.events.on('gunshot', (e) => {
        if (!e.byPlayer) return;
        for (const s of this.list) {
          const a = this.clerks.get(s.id);
          if (!a || a.dead || !(a.brain instanceof ClerkBrain)) continue;
          if (Math.hypot(e.x - s.centre.x, e.z - s.centre.z) < 30) a.brain.scare(10);
        }
      });
    }

    _storeOfClerk(agent) {
      if (!agent) return null;
      for (const [id, a] of this.clerks) if (a === agent) return this.byId.get(id);
      return null;
    }

    /** The shop whose room contains (x, z), if any. */
    storeAt(x, z) {
      for (const s of this.list) {
        if (Math.abs(x - s.centre.x) > 14 || Math.abs(z - s.centre.z) > 14) continue;
        const [u, v] = local(s.f, x, z);
        if (u > s.a + T && u < s.a + s.SW - T && v > s.vb0 + T * 0.5 && v < s.vb1 - T) return s;
      }
      return null;
    }

    isOpen(s) {
      return this.game.playTime >= (this.until[s.id] || 0);
    }

    // ---------------------------------------------------------- clerks
    _spawnClerk(s) {
      const g = this.game;
      const look = Object.assign({}, VH.Crowd.randomLook(), { top: BRANDS[s.brand].shirt, shirt: BRANDS[s.brand].shirt });
      const a = g.crowd.spawn(s.clerk.x, s.clerk.z, { look, faction: 'civilian', role: 'clerk', persistent: true, heading: s.clerk.heading, name: 'Clerk', health: 60 });
      a.brain = new ClerkBrain(this, s);
      if (this.holdup) a.brain.voice = this.holdup.voiceFor(s);
      this.clerks.set(s.id, a);
      return a;
    }

    _removeClerk(s) {
      const a = this.clerks.get(s.id);
      if (a && !a.removed) this.game.crowd.remove(a);
      this.clerks.delete(s.id);
    }

    _clearClerks() {
      for (const s of this.list) this._removeClerk(s);
    }

    // ---------------------------------------------------------- update
    update(dt) {
      if (!this.ok) return;
      const g = this.game;
      const p = g.player;
      const px = p.pos.x;
      const pz = p.pos.z;
      const ho = this.holdup;
      for (const s of this.list) {
        const d = Math.hypot(px - s.centre.x, pz - s.centre.z);
        let a = this.clerks.get(s.id);
        if (a && a.removed) {
          this.clerks.delete(s.id);
          a = null;
        }
        if (this.killed.has(s.id) && this.isOpen(s) && !a) this.killed.delete(s.id);
        if (!a && d < 75 && !this.killed.has(s.id)) a = this._spawnClerk(s);
        else if (a && d > 110 && !(ho && ho.busy(s))) this._removeClerk(s);
      }
      const inside = p.inVehicle || p.isDead ? null : this.storeAt(px, pz);
      for (const s of this.list) {
        const a = this.clerks.get(s.id);
        if (a && a.brain instanceof ClerkBrain) a.brain.watch = inside === s;
      }
      if (inside !== this._lastInside) {
        this._lastInside = inside;
        if (inside && !this._tipShown && g.combat.playerArmed && this.robbed === 0 && this.isOpen(inside) && !(g.missions && g.missions.run)) {
          this._tipShown = true;
          g.hud.showToast('Aim a gun at the clerk to hold the shop up');
        }
      }
      if (ho) ho.update(dt, inside);
    }

    /**
     * Is Jay covering this person with a gun? Any real gun (a launcher too),
     * not the stun gun, aimed at their chest from within 22 m.
     */
    _covering(a) {
      const g = this.game;
      const p = g.player;
      const w = g.combat.weapon;
      if (!w || (w.kind !== 'hitscan' && w.kind !== 'pellets' && w.kind !== 'projectile') || w.stun) return false;
      if (!p.aiming || p.aimAmount < 0.5 || a.dead) return false;
      const cam = g.renderer.camera;
      const dir = this._v.set(0, 0, -1).applyQuaternion(cam.quaternion);
      const tx = a.pos.x - cam.position.x;
      const ty = a.pos.y + 1.2 * (1 - 0.4 * Math.min(1, a.anim.crouch || 0)) - cam.position.y;
      const tz = a.pos.z - cam.position.z;
      const dist = Math.hypot(tx, ty, tz);
      if (dist > 22 || dist < 0.01) return false;
      const cos = (tx * dir.x + ty * dir.y + tz * dir.z) / dist;
      return cos > Math.cos(clamp(1.1 / dist, 0.13, 0.4));
    }

    // ---------------------------------------------------------- snacks
    _buy(item, player) {
      const g = this.game;
      const s = this.byId.get(item.store);
      const a = s && this.clerks.get(s.id);
      if (!a || a.dead || !(a.brain instanceof ClerkBrain) || (a.brain.mode !== 'idle' && a.brain.mode !== 'nervous') || (this.holdup && this.holdup.busy(s))) {
        g.hud.showToast("Nobody's serving.");
        return 1;
      }
      if (player.money < item.price) {
        VH.events.emit('notify', { title: 'Not enough cash', text: 'Snacks cost ' + VH.util.formatMoney(item.price) + '.', icon: '✕', tone: 'bad' });
        return 1;
      }
      player.money -= item.price;
      const before = player.health;
      player.heal(item.heal);
      VH.events.emit('money:changed', { delta: -item.price, reason: 'snacks' });
      const lines = ['A meat pie and an iced coffee.', 'Two-for-one chocolate bars.', 'Hot chips and a Sunfizz.', 'A sausage roll, still warm.', 'Beef jerky and a lemon squash.'];
      const line = lines[Math.floor(Math.random() * lines.length)];
      VH.events.emit('notify', { title: BRANDS[s.brand].name, text: line + (player.health > before ? ' +' + Math.round(player.health - before) + ' health' : ''), icon: '🛒' });
      return 1.5;
    }

    /** The shop's brand name ("Gull Mart"). */
    brandName(s) {
      return BRANDS[s.brand].name;
    }

    // ---------------------------------------------------------- contract
    blips(out, missionRunning) {
      if (!this.ok) return; // shown during jobs too: they're places, not distractions
      for (const s of this.list) {
        if (!this.isOpen(s)) continue;
        out.push({ x: s.door.x, z: s.door.z, type: 'store', label: BRANDS[s.brand].name, noRim: true });
      }
    }

    stats() {
      if (!this.ok) return [];
      return [['Shops held up', String(this.robbed)], ['Cash from hold-ups', VH.util.formatMoney(this.cash)]];
    }

    serialize() {
      const until = {};
      for (const k of Object.keys(this.until)) if (this.until[k] > this.game.playTime) until[k] = Math.round(this.until[k]);
      const out = { until, robbed: this.robbed, cash: this.cash };
      if (this.holdup) Object.assign(out, this.holdup.serialize());
      return out;
    }

    load(data) {
      data = data || {};
      if (this.holdup) this.holdup.stop();
      this.until = Object.assign({}, data.until || {});
      this.robbed = data.robbed || 0;
      this.cash = data.cash || 0;
      if (this.holdup) this.holdup.load(data);
    }

    stop() {
      if (!this.ok) return;
      if (this.holdup) this.holdup.stop();
    }

    reset() {
      if (!this.ok) return;
      if (this.holdup) this.holdup.reset();
      this._clearClerks();
      this.until = {};
      this.killed.clear();
      this.robbed = 0;
      this.cash = 0;
      this._tipShown = false;
      this._lastInside = null;
    }
  }

  // ------------------------------------------------------------------ map
  VH.MapPainters = VH.MapPainters || [];
  VH.MapPainters.push((g, layout, o) => {
    for (const s of layout.stores || []) {
      const r = rect(s.f, s.a, s.vb0, s.a + s.SW, s.vb1);
      g.fillStyle = 'rgba(0, 0, 0, 0.3)';
      o.R(r[0] + 1, r[1] + 1, r[2] + 1, r[3] + 1);
      g.fillStyle = '#' + BRANDS[s.brand].band.toString(16).padStart(6, '0');
      o.R(r[0], r[1], r[2], r[3]);
      if (s.gas) {
        const hw = Math.min(11, s.f.W / 2 - 4);
        const c = rect(s.f, s.f.W / 2 - hw, 3, s.f.W / 2 + hw, s.vb0 - 3.5);
        g.fillStyle = 'rgba(235, 238, 240, 0.85)';
        o.R(c[0], c[1], c[2], c[3]);
      }
    }
  });

  // The lot frames and the frame drawer, for the other buildings on car parks (sprayshops.js).
  Stores.kit = { KERB, T, frameFor, P, local, rect, drawer, hashString, AVOID_BLOCKS };
  Stores.REFILL = REFILL;
  Stores.ClerkBrain = ClerkBrain;
  VH.Stores = Stores;
})();
