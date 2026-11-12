/*
 * districts/neonstrand.js — the Neon Strand, Isla Paloma's resort strip
 * (VICEHAVEN 3.0), and the dressing of the two bridges that reach it.
 *
 *   Wonder Wharf          the funfair on the bay (plot wonder_wharf): a gate
 *                         arch, a midway under festoon lights, the Wonder
 *                         Wheel (it turns), the Riptide roller coaster (its
 *                         train runs), a carousel, food stalls and Arcade
 *                         Row with the Golden Grabber claw machine
 *   Paloma Convention     the hall, its glass front and canopy, a forecourt
 *   Centre                with a fountain and flags, the loading dock on
 *                         Bridge Street behind it (plot paloma_convention)
 *   The Strand            neon up the corners and round the crowns of the
 *                         generic hotels, two night clubs, the gateway arch,
 *                         and the Castellane Palace (a generic hotel on the
 *                         Strand at Lantana Avenue, dressed in gold neon,
 *                         with a porte-cochère, a doorman's stand and a
 *                         fountain)
 *   The bridges           lights strung along the Paloma Bridge's cables,
 *                         flags on its towers, welcome gantries where both
 *                         bridges reach the island
 *
 * Everything static goes into the chunk builders (one merged mesh per
 * material per chunk). The moving parts (the wheel, its gondolas and
 * bulbs, the coaster train) are four meshes, hidden when far away.
 */
(function () {
  'use strict';

  const VH = window.VH;
  const KERB = 0.15;
  const F = () => VH.COLLIDE;
  const CHUNK = 192;
  const ORIGIN = -768;

  // ---------------------------------------------------------------- plan
  // The Wonder Wheel: hub, radius, the axle's heading (it faces the Strand and the bay at once).
  const WHEEL = { x: 846, z: 38, hub: 31, r: 26, yaw: Math.PI / 4, cars: 18, speed: 0.045 };
  // The Riptide: control points (x, z, y) of a closed loop, station on the west leg.
  const COASTER = [
    [912, 150, 0.6], [912, 128, 0.6], [912, 104, 8], [912, 74, 22], [912, 46, 32], [916, 24, 31], [928, 7, 20],
    [946, 3, 6], [960, 15, 12], [964, 40, 22], [958, 64, 8], [946, 82, 15], [958, 100, 6], [964, 122, 14],
    [958, 146, 7], [946, 164, 4], [930, 166, 2], [918, 163, 1], [913, 158, 0.6],
  ];
  const ARCADE = { x0: 815, x1: 870, z0: 76, z1: 116, h: 8 };
  const GRABBER = { x: 874.6, z: 88 };
  const MIDWAY = { x0: 880, x1: 900 };
  const CONV = { x0: 1000, x1: 1140, z0: -242, z1: -140, h: 18 };
  const TOWER = { x: 832, z: -18, h: 54 }; // the Skyhook drop tower
  const NEON = [0xff3d8b, 0x37e8ff, 0xb45cff, 0xffb92e, 0x7dff6a, 0xff6a2e];

  // ------------------------------------------------------------- helpers
  const _m = new THREE.Matrix4();
  const _q = new THREE.Quaternion();
  const _v = new THREE.Vector3();
  const _s = new THREE.Vector3();
  const _d = new THREE.Vector3();
  const X1 = new THREE.Vector3(1, 0, 0);
  let UNIT = null; // a unit box, merged in stretched and turned
  const unit = () => UNIT || (UNIT = new THREE.BoxGeometry(1, 1, 1));

  /** A beam of square section t from a to b, merged into a builder surface. */
  function beam(surf, ax, ay, az, bx, by, bz, t, color) {
    _d.set(bx - ax, by - ay, bz - az);
    const len = _d.length();
    if (len < 1e-3) return;
    _q.setFromUnitVectors(X1, _d.multiplyScalar(1 / len));
    _v.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
    _s.set(len, t, t);
    _m.compose(_v, _q, _s);
    surf.merge(unit(), _m, color);
  }

  /** A box drawn into a surface and made solid. */
  function solid(world, surf, x0, y0, z0, x1, y1, z1, hex, opts, tag, flags) {
    surf.box(x0, y0, z0, x1, y1, z1, VH.col(hex), opts);
    world.physics.addBox(x0, Math.min(y0, 0), z0, x1, y1, z1, tag || 'building', flags === undefined ? F().ALL : flags);
  }

  /** Make a round thing of radius r solid: eight thin boxes fanned round its centre (within 2% of the circle). */
  function solidRound(world, cx, cz, r, y0, y1, tag, flags) {
    for (let k = 0; k < 8; k++) world.physics.addOrientedBox(cx, cz, r * 0.981, r * 0.195, (k * Math.PI) / 8, y0, y1, tag, flags === undefined ? F().ALL : flags);
  }

  /** Make a beam from a to b (thickness t) solid where it comes below head height: boxes along it, from the ground up. */
  function solidBeam(world, ax, ay, az, bx, by, bz, t, top) {
    const lowest = Math.min(ay, by);
    if (lowest > (top || 2.3)) return;
    const len = Math.hypot(bx - ax, bz - az);
    const n = Math.max(1, Math.ceil(len / 2));
    for (let i = 0; i < n; i++) {
      const f0 = i / n, f1 = (i + 1) / n;
      const y = Math.max(ay + (by - ay) * f0, ay + (by - ay) * f1);
      if (Math.min(ay + (by - ay) * f0, ay + (by - ay) * f1) > (top || 2.3)) continue;
      const x0 = ax + (bx - ax) * f0, z0 = az + (bz - az) * f0, x1 = ax + (bx - ax) * f1, z1 = az + (bz - az) * f1;
      world.physics.addOrientedBox((x0 + x1) / 2, (z0 + z1) / 2, t / 2, Math.max(len / n / 2, t / 2), Math.atan2(x1 - x0, z1 - z0), 0, y + t / 2, 'pole', F().SOLID | F().SHOTS);
    }
  }

  /** A railing on any heading (VH.Landmarks.railing only runs along x or z): posts, two rails, solid. */
  function fenceLine(world, ctx, x0, z0, x1, z1, y, h, hex) {
    const col = VH.col(hex || 0xf2efe6);
    const len = Math.hypot(x1 - x0, z1 - z0);
    const n = Math.max(1, Math.round(len / 2.2));
    for (let i = 0; i <= n; i++) {
      const px = x0 + ((x1 - x0) * i) / n, pz = z0 + ((z1 - z0) * i) / n;
      ctx.prop.box(px - 0.04, y, pz - 0.04, px + 0.04, y + h, pz + 0.04, col);
    }
    beam(ctx.prop, x0, y + h - 0.03, z0, x1, y + h - 0.03, z1, 0.06, col);
    beam(ctx.prop, x0, y + h * 0.5, z0, x1, y + h * 0.5, z1, 0.05, col);
    world.physics.addOrientedBox((x0 + x1) / 2, (z0 + z1) / 2, 0.1, len / 2 + 0.05, Math.atan2(x1 - x0, z1 - z0), y - 0.3, y + h, 'railing', F().SOLID | F().SHOTS);
  }

  /** A ramp drawn to match physics.addRamp(cx, cz, hx, hz, yaw, 0, yLow, yHigh): top rising from local -Z to +Z. */
  function wedge(surf, cx, cz, hx, hz, yaw, yLow, yHigh, color, base) {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const P = (lx, lz, y) => [cx + lx * c + lz * s, y, cz - lx * s + lz * c];
    const b = base === undefined ? KERB : base;
    const a = P(-hx, -hz, yLow), bb = P(hx, -hz, yLow), cc = P(hx, hz, yHigh), d = P(-hx, hz, yHigh);
    const a0 = P(-hx, -hz, b), b0 = P(hx, -hz, b), c0 = P(hx, hz, b), d0 = P(-hx, hz, b);
    surf.polygon([a, d, cc, bb], color); // the slope
    surf.polygon([d0, c0, cc, d], color); // the high end
    surf.polygon([b0, a0, a, bb], color); // the low lip
    surf.polygon([a0, d0, d, a], VH.colMul(color, 0.85)); // the sides
    surf.polygon([c0, b0, bb, cc], VH.colMul(color, 0.85));
  }

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

  /** A string of bulbs sagging between two points (screen boxes: they glow). */
  function festoon(world, ax, ay, az, bx, by, bz, sag, hex, step) {
    const len = Math.hypot(bx - ax, bz - az);
    const n = Math.max(2, Math.round(len / (step || 1.6)));
    const wire = VH.col(0x2a2d33);
    let px = ax, py = ay, pz = az;
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      const x = ax + (bx - ax) * t;
      const z = az + (bz - az) * t;
      const y = ay + (by - ay) * t - sag * 4 * t * (1 - t);
      const ctx = world.ctxAt(x, z);
      beam(ctx.prop, px, py, pz, x, y, z, 0.03, wire);
      if (i < n) {
        const c = Array.isArray(hex) ? hex[i % hex.length] : hex;
        ctx.screen.box(x - 0.14, y - 0.3, z - 0.14, x + 0.14, y - 0.04, z + 0.14, VH.col(c, 2));
      }
      px = x; py = y; pz = z;
    }
  }

  const sign = (world, spec) => VH.Landmarks.sign(world, spec);
  const GOLD = { fg: '#ffd96a', glow: '#ffb000', outline: '#fff0b8' };
  const CYAN = { fg: '#7af4ff', glow: '#00c8ff', outline: '#ff5cc8' };

  // ------------------------------------------------------- Wonder Wharf
  function buildWharf(world, b) {
    const ix0 = b.minX + 4, ix1 = b.maxX - 4, iz0 = b.minZ + 4, iz1 = b.maxZ - 4;
    // Ground: a sandy fairground, the midway in terracotta down the middle.
    tiles(world, ix0, iz0, MIDWAY.x0, iz1, (x0, z0, x1, z1, ctx) => ctx.plazaTop.topRect(x0, z0, x1, z1, KERB, VH.col(0xeadbc0), 4));
    tiles(world, MIDWAY.x0, iz0, MIDWAY.x1, iz1, (x0, z0, x1, z1, ctx) => ctx.plazaTop.topRect(x0, z0, x1, z1, KERB, VH.col(0xc8805e), 3));
    tiles(world, MIDWAY.x1, iz0, ix1, iz1, (x0, z0, x1, z1, ctx) => ctx.plazaTop.topRect(x0, z0, x1, z1, KERB, VH.col(0xeadbc0), 4));
    // A low white fence round it, open at the gates (north and south ends of the midway, Paloma Way, Bayfront Drive).
    const fence = (x0, z0, x1, z1) => VH.Landmarks.railing(world, world.ctxAt((x0 + x1) / 2, (z0 + z1) / 2), x0, z0, x1, z1, KERB, { height: 1.0, color: 0xf2efe6 });
    const fy = 0.5;
    for (const [z, gaps] of [[iz0 + fy, [[868, 912]]], [iz1 - fy, [[868, 912]]]]) {
      let a = ix0 + fy;
      for (const [g0, g1] of gaps) {
        fence(a, z, g0, z);
        a = g1;
      }
      fence(a, z, ix1 - fy, z);
    }
    fence(ix0 + fy, iz0 + fy, ix0 + fy, 120);
    fence(ix0 + fy, 136, ix0 + fy, iz1 - fy);
    fence(ix1 - fy, iz0 + fy, ix1 - fy, -12);
    fence(ix1 - fy, 6, ix1 - fy, iz1 - fy);

    // The gate: two striped towers, a beam with bulbs and the big neon name.
    const gz = iz0 + 1;
    for (const gx of [866, 914]) {
      const ctx = world.ctxAt(gx, gz);
      for (let k = 0; k < 6; k++) ctx.prop.box(gx - 1.3, KERB + k * 2, gz - 1.3, gx + 1.3, KERB + (k + 1) * 2, gz + 1.3, VH.col(k % 2 ? 0xf6f1e4 : 0xe0403a));
      ctx.prop.cylinder(gx, KERB + 12, gz, 1.8, 0, 3.2, 8, VH.col(0x2fb7b0), false);
      ctx.prop.cylinder(gx, KERB + 15.2, gz, 0.06, 0.06, 1.6, 4, VH.col(0xdddddd), false);
      ctx.screen.box(gx - 0.2, KERB + 16.6, gz - 0.2, gx + 0.2, KERB + 17, gz + 0.2, VH.col(0xffd24a, 2));
      world.physics.addBox(gx - 1.3, 0, gz - 1.3, gx + 1.3, KERB + 12, gz + 1.3, 'wall');
    }
    const gctx = world.ctxAt(890, gz);
    gctx.prop.box(867.3, KERB + 9.4, gz - 0.7, 912.7, KERB + 11.6, gz + 0.7, VH.col(0x2fb7b0), { bottom: true });
    for (let x = 868; x <= 912; x += 1.25) gctx.screen.box(x - 0.12, KERB + 9.1, gz - 0.82, x + 0.12, KERB + 9.35, gz - 0.7, VH.col(x % 2.5 < 1 ? 0xffd24a : 0xff5c95, 2));
    sign(world, { x: 890, y: KERB + 13.6, z: gz - 0.1, yaw: Math.PI, w: 26, h: 4.2, lines: ['WONDER WHARF', 'Rides · Arcade · Candyfloss · Since 1958'], style: 'neon', posts: false, twoSided: true });
    // Ticket booths inside the gate.
    for (const [x, col] of [[872, 0xff5c95], [908, 0x37b8ff]]) {
      const ctx = world.ctxAt(x, gz + 6);
      solid(world, ctx.prop, x - 2, KERB, gz + 4.5, x + 2, KERB + 2.8, gz + 7.5, 0xf6f1e4);
      ctx.prop.box(x - 2.4, KERB + 2.8, gz + 4.1, x + 2.4, KERB + 3.2, gz + 7.9, VH.col(col), { bottom: true });
      ctx.screen.box(x - 1.6, KERB + 1.2, gz + 4.46, x + 1.6, KERB + 2.3, gz + 4.5, VH.col(0xfff1c8, 1.2));
    }

    // The midway: festoon lights across it every 14 m, lamps, benches and bins.
    for (let z = iz0 + 12; z < iz1 - 6; z += 14) {
      for (const x of [MIDWAY.x0 - 1, MIDWAY.x1 + 1]) {
        const ctx = world.ctxAt(x, z);
        ctx.prop.box(x - 0.1, KERB, z - 0.1, x + 0.1, KERB + 6.5, z + 0.1, VH.col(0xf2efe6));
        world.physics.addBox(x - 0.15, 0, z - 0.15, x + 0.15, KERB + 6.5, z + 0.15, 'pole', F().SOLID | F().SHOTS);
      }
      festoon(world, MIDWAY.x0 - 1, KERB + 6.3, z, MIDWAY.x1 + 1, KERB + 6.3, z, 1.2, [0xffd24a, 0xff5c95, 0x37e8ff, 0x7dff6a]);
      festoon(world, MIDWAY.x0 - 1, KERB + 6.3, z, MIDWAY.x0 - 1, KERB + 6.3, Math.min(z + 14, iz1 - 6), 0.8, [0xffd24a, 0xff9a3c]);
      festoon(world, MIDWAY.x1 + 1, KERB + 6.3, z, MIDWAY.x1 + 1, KERB + 6.3, Math.min(z + 14, iz1 - 6), 0.8, [0xffd24a, 0xff9a3c]);
      if (z % 28 < 14) {
        world.addProp('bench', MIDWAY.x0 + 1.2, KERB, z + 7, Math.PI / 2, 1);
        world.addProp('bin', MIDWAY.x1 - 1.0, KERB, z + 7, 0, 1);
      }
    }
    // Street lights round the outside, on the pavement.
    for (let x = b.minX + 10; x < b.maxX - 6; x += 30) {
      if (x > 860 && x < 920) continue;
      world.addProp('streetlight', x, KERB, b.minZ + 1.2, Math.PI, 1);
      world.addProp('streetlight', x, KERB, b.maxZ - 1.2, 0, 1);
    }
    for (let z = b.minZ + 22; z < b.maxZ - 10; z += 32) {
      world.addProp('streetlight', b.minX + 1.2, KERB, z, -Math.PI / 2, 1);
      world.addProp('streetlight', b.maxX - 1.2, KERB, z, Math.PI / 2, 1);
    }
    for (let z = b.minZ + 30; z < b.maxZ - 10; z += 32) world.addProp('palmTall', b.minX + 2, KERB, z, z * 0.37, 1);
    // Lamps inside the fair too, down both sides of the midway and by the rides.
    for (let z = iz0 + 33; z < iz1 - 6; z += 28) {
      world.addProp('streetlight', MIDWAY.x0 - 6, KERB, z, -Math.PI / 2, 1);
      world.addProp('streetlight', MIDWAY.x1 + 6, KERB, z, Math.PI / 2, 1);
    }
    for (const [x, z, yaw] of [[850, -32, 0], [820, 30, Math.PI / 2], [872, 72, 0], [925, 2, 0], [945, -42, Math.PI], [935, 110, 0]]) world.addProp('streetlight', x, KERB, z, yaw, 1);

    buildWheelBase(world);
    buildArcade(world);
    buildCoaster(world);
    buildCarousel(world, 935, -20);
    buildDropTower(world);
    buildDodgems(world, 830, 126, 872, 162);
    buildHelter(world, 957, -33);
    // Palms in pairs down the midway, and round the wheel.
    for (let z = iz0 + 19; z < iz1 - 6; z += 28) for (const x of [MIDWAY.x0 - 3.5, MIDWAY.x1 + 3.5]) world.addProp('palmTall', x, KERB, z, z, 1);
    for (const [x, z] of [[818, 0], [874, 18], [818, 66], [874, 66], [904, -36], [904, 118]]) world.addProp('palmTall', x, KERB, z, x, 1.1);
    // Food stalls along the west fence, south of the arcade.
    const stalls = [[0xff5c95, 0xffffff], [0x37b8ff, 0xffffff], [0xffd24a, 0xe0403a], [0x7dcf6a, 0xffffff]];
    stalls.forEach(([a, c], i) => {
      const z = 128 + i * 11;
      const x0 = ix0 + 2;
      const x1 = x0 + 6;
      const ctx = world.ctxAt(x0 + 3, z);
      solid(world, ctx.prop, x0, KERB, z - 3.5, x1 - 1.2, KERB + 2.6, z + 3.5, 0xf6f1e4);
      ctx.prop.box(x1 - 1.2, KERB, z - 3.5, x1 - 1.0, KERB + 1.1, z + 3.5, VH.col(a));
      world.physics.addBox(x1 - 1.2, 0, z - 3.5, x1 - 1.0, KERB + 1.1, z + 3.5, 'wall', F().SOLID | F().SHOTS);
      for (let k = 0; k < 7; k++) ctx.prop.box(x0 - 0.2, KERB + 2.6, z - 3.7 + k, x1 + 0.6, KERB + 2.9, z - 2.7 + k, VH.col(k % 2 ? c : a), { bottom: true });
      ctx.screen.box(x1 - 1.22, KERB + 1.3, z - 3, x1 - 1.18, KERB + 2.3, z + 3, VH.col(0xfff1c8, 1.1));
    });
  }

  /** The wheel's static parts: A-frame legs, the axle, a boarding deck and its ticket box. */
  function buildWheelBase(world) {
    const W = WHEEL;
    const ax = Math.sin(W.yaw), az = Math.cos(W.yaw); // the axle's direction
    const px = Math.cos(W.yaw), pz = -Math.sin(W.yaw); // across the wheel, on the ground
    const white = VH.col(0xf2efe6);
    const ctx = world.ctxAt(W.x, W.z);
    for (const side of [-1, 1]) {
      const hx = W.x + ax * side * 2.6, hz = W.z + az * side * 2.6;
      for (const foot of [-1, 1]) {
        const fx = hx + ax * side * 3 + px * foot * 15, fz = hz + az * side * 3 + pz * foot * 15;
        beam(ctx.prop, fx, KERB, fz, hx, W.hub, hz, 1.1, white);
        solidBeam(world, fx, KERB, fz, hx, W.hub, hz, 1.1, 3);
        world.physics.addOrientedBox(fx, fz, 1.2, 1.2, W.yaw, 0, KERB + 4, 'wall');
        ctx.concrete.box(fx - 1.4, 0, fz - 1.4, fx + 1.4, KERB + 0.6, fz + 1.4, VH.col(0xbdb6aa));
        world.physics.addBox(fx - 1.4, 0, fz - 1.4, fx + 1.4, KERB + 0.6, fz + 1.4, 'wall', F().SOLID | F().SHOTS);
      }
      // Bracing between the legs.
      beam(ctx.prop, hx + px * 9.5 + ax * side * 1.9, 11, hz + pz * 9.5 + az * side * 1.9, hx - px * 9.5 + ax * side * 1.9, 11, hz - pz * 9.5 + az * side * 1.9, 0.5, white);
    }
    beam(ctx.prop, W.x - ax * 3.4, W.hub, W.z - az * 3.4, W.x + ax * 3.4, W.hub, W.z + az * 3.4, 1.0, VH.col(0x9aa1a8));
    // Boarding deck under the lowest gondola, with a ramp up from the midway side.
    const dx = W.x, dz = W.z;
    ctx.prop.orientedBox(dx, dz, 6, 3.4, W.yaw, KERB, KERB + 0.9, VH.col(0x2fb7b0), VH.col(0xd9d2c4));
    world.physics.addOrientedBox(dx, dz, 6, 3.4, W.yaw, 0, KERB + 0.9, 'boardwalk', F().ALL);
    // The gondolas sweep through the middle of the deck: a railed lane keeps people out of their way.
    const at = (u, v) => [dx + px * u + ax * v, dz + pz * u + az * v];
    for (const [u0, v0, u1, v1] of [[-5.9, -1.45, 5.9, -1.45], [-5.9, 1.45, 5.9, 1.45], [-5.9, -1.45, -5.9, 1.45], [5.9, -1.45, 5.9, 1.45]]) {
      const [x0, z0] = at(u0, v0), [x1, z1] = at(u1, v1);
      fenceLine(world, ctx, x0, z0, x1, z1, KERB + 0.9, 1.25, 0xffd24a); // too tall to vault
    }
    const rx = dx + ax * 5.6, rz = dz + az * 5.6;
    world.physics.addRamp(rx, rz, 1.6, 2.2, W.yaw + Math.PI, 0, KERB, KERB + 0.9, 'boardwalk');
    wedge(ctx.prop, rx, rz, 1.6, 2.2, W.yaw + Math.PI, KERB, KERB + 0.9, VH.col(0xd9d2c4));
    // The ticket box.
    const tx = dx - ax * 9, tz = dz - az * 9;
    ctx.prop.orientedBox(tx, tz, 1.6, 1.6, W.yaw, KERB, KERB + 2.6, VH.col(0xe0403a));
    ctx.prop.orientedBox(tx, tz, 2, 2, W.yaw, KERB + 2.6, KERB + 3.0, VH.col(0xf6f1e4));
    world.physics.addOrientedBox(tx, tz, 1.6, 1.6, W.yaw, 0, KERB + 3, 'building');
    sign(world, { x: W.x - px * 0.1 + 0, y: W.hub + 1.6, z: W.z - pz * 0.1, yaw: W.yaw, w: 7, h: 1.6, lines: ['THE WONDER WHEEL'], style: 'neon', colors: CYAN, posts: false, twoSided: true });
    world.beacons.push({ x: W.x, y: W.hub + W.r + 1.5, z: W.z });
  }

  /** Arcade Row: a long hall open to the midway, cabinets glowing inside, the Golden Grabber outside. */
  function buildArcade(world) {
    const A = ARCADE;
    const ctx = world.ctxAt((A.x0 + A.x1) / 2, (A.z0 + A.z1) / 2);
    const wall = 0x6a3fa0;
    const t = 0.5;
    solid(world, ctx.prop, A.x0, KERB, A.z0, A.x1, KERB + A.h, A.z0 + t, wall);
    solid(world, ctx.prop, A.x0, KERB, A.z1 - t, A.x1, KERB + A.h, A.z1, wall);
    solid(world, ctx.prop, A.x0, KERB, A.z0, A.x0 + t, KERB + A.h, A.z1, wall);
    // The front: piers between three wide openings, a fascia above.
    const piers = [[A.z0, A.z0 + 3], [A.z0 + 12, A.z0 + 15], [A.z0 + 25, A.z0 + 28], [A.z1 - 3, A.z1]];
    for (const [z0, z1] of piers) solid(world, ctx.prop, A.x1 - t, KERB, z0, A.x1, KERB + A.h, z1, wall);
    ctx.prop.box(A.x1 - t, KERB + 4.2, A.z0, A.x1, KERB + A.h, A.z1, VH.col(wall), { bottom: true });
    world.physics.addBox(A.x1 - t, KERB + 4.2, A.z0, A.x1, KERB + A.h, A.z1, 'building', F().ALL);
    ctx.prop.box(A.x0 - 0.2, KERB + A.h, A.z0 - 0.2, A.x1 + 0.4, KERB + A.h + 0.5, A.z1 + 0.2, VH.col(0x3a2360), { bottom: true });
    world.physics.addBox(A.x0, KERB + A.h, A.z0, A.x1, KERB + A.h + 0.5, A.z1, 'building', F().ALL);
    ctx.interior.topRect(A.x0 + t, A.z0 + t, A.x1 - t, A.z1 - t, KERB + 0.02, VH.col(0x2a2340));
    ctx.interior.box(A.x0 + t, KERB + A.h - 0.6, A.z0 + t, A.x1 - t, KERB + A.h - 0.5, A.z1 - t, VH.col(0x1a1626), { bottom: true });
    // Neon trim: a pink band along the fascia, cyan up the piers.
    ctx.screen.box(A.x1 + 0.02, KERB + 4.3, A.z0 + 0.3, A.x1 + 0.12, KERB + 4.55, A.z1 - 0.3, VH.col(0xff3d8b, 2.2));
    ctx.screen.box(A.x1 + 0.02, KERB + A.h - 0.35, A.z0 + 0.3, A.x1 + 0.12, KERB + A.h - 0.15, A.z1 - 0.3, VH.col(0x37e8ff, 2.2));
    for (const [z0, z1] of piers) for (const z of [z0 + 0.4, z1 - 0.4]) ctx.screen.box(A.x1 + 0.02, KERB + 0.3, z - 0.1, A.x1 + 0.12, KERB + 4.3, z + 0.1, VH.col(0x37e8ff, 2));
    // Cabinets in rows, their screens and marquees lit.
    const cab = [0x1d1f2a, 0x2a1d3a, 0x3a1d22];
    let i = 0;
    for (let x = A.x0 + 3; x < A.x1 - 6; x += 5) {
      for (let z = A.z0 + 2; z < A.z1 - 2; z += 2.1) {
        if (x > A.x0 + 15 && x < A.x0 + 22) continue; // the aisle
        const face = x < A.x0 + 15 ? 1 : -1;
        ctx.prop.box(x - 0.45, KERB, z - 0.5, x + 0.45, KERB + 1.9, z + 0.5, VH.col(cab[i++ % 3]));
        world.physics.addBox(x - 0.45, 0, z - 0.5, x + 0.45, KERB + 1.9, z + 0.5, 'metal', F().SOLID | F().SHOTS);
        ctx.screen.box(x + face * 0.46 - 0.02, KERB + 1.1, z - 0.36, x + face * 0.46 + 0.02, KERB + 1.6, z + 0.36, VH.col(NEON[i % NEON.length], 1.3));
        ctx.screen.box(x - 0.45, KERB + 1.9, z - 0.5, x + 0.45, KERB + 2.15, z + 0.5, VH.col(NEON[(i + 2) % NEON.length], 1.6));
      }
    }
    sign(world, { x: A.x1 + 0.2, y: KERB + 6.2, z: (A.z0 + A.z1) / 2, yaw: Math.PI / 2, w: 16, h: 2.6, lines: ['ARCADE ROW', 'Prizes every time*'], style: 'neon', posts: false });
    // The Golden Grabber: a gold claw machine under a glass dome, by the arcade's north door.
    const G = GRABBER;
    const gctx = world.ctxAt(G.x, G.z);
    gctx.prop.box(G.x - 0.9, KERB, G.z - 0.9, G.x + 0.9, KERB + 1.1, G.z + 0.9, VH.col(0xd4a017));
    gctx.screen.box(G.x - 0.92, KERB + 0.9, G.z - 0.92, G.x + 0.92, KERB + 1.02, G.z + 0.92, VH.col(0xffd96a, 1.8));
    gctx.screen.box(G.x - 0.85, KERB + 1.1, G.z - 0.85, G.x + 0.85, KERB + 2.3, G.z + 0.85, VH.col(0x9fe6ff, 0.55));
    for (const [cx, cz] of [[-0.85, -0.85], [0.85, -0.85], [-0.85, 0.85], [0.85, 0.85]]) gctx.prop.box(G.x + cx - 0.06, KERB + 1.1, G.z + cz - 0.06, G.x + cx + 0.06, KERB + 2.3, G.z + cz + 0.06, VH.col(0xd4a017));
    gctx.prop.box(G.x - 0.95, KERB + 2.3, G.z - 0.95, G.x + 0.95, KERB + 2.55, G.z + 0.95, VH.col(0xd4a017));
    gctx.screen.cylinder(G.x, KERB + 2.55, G.z, 0.8, 0.15, 0.75, 10, VH.col(0x9fe6ff, 0.6), true);
    gctx.prop.box(G.x - 0.03, KERB + 1.8, G.z - 0.03, G.x + 0.03, KERB + 2.3, G.z + 0.03, VH.col(0x9aa1a8));
    gctx.prop.box(G.x - 0.18, KERB + 1.6, G.z - 0.18, G.x + 0.18, KERB + 1.8, G.z + 0.18, VH.col(0x9aa1a8));
    gctx.prop.cylinder(G.x, KERB + 3.3, G.z, 0.12, 0.12, 0.18, 8, VH.col(0xffd24a), true);
    world.physics.addBox(G.x - 0.95, 0, G.z - 0.95, G.x + 0.95, KERB + 3.3, G.z + 0.95, 'metal', F().ALL);
    sign(world, { x: G.x + 0.96, y: KERB + 0.55, z: G.z, yaw: Math.PI / 2, w: 1.7, h: 0.5, lines: ['GOLDEN GRABBER'], style: 'neon', colors: GOLD, posts: false });
  }

  /** The Skyhook: a tall drop tower (its ring of seats rides up and falls in WharfLife). */
  function buildDropTower(world) {
    const T = TOWER;
    const ctx = world.ctxAt(T.x, T.z);
    ctx.concrete.cylinder(T.x, 0, T.z, 6.5, 6.5, KERB + 0.4, 12, VH.col(0xd9d2c4), true);
    ctx.prop.box(T.x - 1.3, KERB, T.z - 1.3, T.x + 1.3, T.h, T.z + 1.3, VH.col(0xf2efe6));
    for (let y = 4; y < T.h - 2; y += 4) ctx.prop.box(T.x - 1.35, y, T.z - 1.35, T.x + 1.35, y + 0.4, T.z + 1.35, VH.col(0xe0403a));
    ctx.prop.cylinder(T.x, T.h, T.z, 2.6, 2.6, 2.4, 10, VH.col(0x2fb7b0), true);
    ctx.prop.cylinder(T.x, T.h + 2.4, T.z, 2.6, 0.2, 3, 10, VH.col(0xffd24a), false);
    for (let y = 6; y < T.h - 2; y += 3) for (const [dx, dz] of [[-1.36, 0], [1.36, 0], [0, -1.36], [0, 1.36]]) ctx.screen.box(T.x + dx - 0.08, y, T.z + dz - 0.08, T.x + dx + 0.08, y + 0.6, T.z + dz + 0.08, VH.col(y % 6 < 3 ? 0xff3d8b : 0x37e8ff, 2.2));
    world.physics.addBox(T.x - 1.4, 0, T.z - 1.4, T.x + 1.4, T.h + 5.4, T.z + 1.4, 'metal');
    solidRound(world, T.x, T.z, 6.5, 0, KERB + 0.4, 'kerb', F().SOLID);
    // A ring of railings on the base: the seats come down to the ground here.
    for (let k = 0; k < 8; k++) {
      const a0 = ((k + 0.5) * Math.PI) / 4, a1 = ((k + 1.5) * Math.PI) / 4;
      fenceLine(world, ctx, T.x + Math.cos(a0) * 5.2, T.z + Math.sin(a0) * 5.2, T.x + Math.cos(a1) * 5.2, T.z + Math.sin(a1) * 5.2, KERB + 0.4, 1.25, 0xffd24a);
    }
    world.beacons.push({ x: T.x, y: T.h + 5.6, z: T.z });
    sign(world, { x: T.x, y: T.h - 3, z: T.z + 1.4, yaw: 0, w: 2.4, h: 9, lines: ['SKYHOOK'], style: 'neon', posts: false });
  }

  /** The dodgems: a dark floor under a lit roof, the cars parked where they stopped. */
  function buildDodgems(world, x0, z0, x1, z1) {
    const ctx = world.ctxAt((x0 + x1) / 2, (z0 + z1) / 2);
    ctx.prop.box(x0, KERB, z0, x1, KERB + 0.2, z1, VH.col(0x3a3d44), { top: VH.col(0x2a2c31) });
    for (const [a0, b0, a1, b1] of [[x0, z0, x1, z0 + 0.4], [x0, z1 - 0.4, x1, z1], [x0, z0, x0 + 0.4, z1], [x1 - 0.4, z0, x1, z1 - 8]]) {
      ctx.prop.box(a0, KERB + 0.2, b0, a1, KERB + 0.8, b1, VH.col(0xffd24a));
      world.physics.addBox(a0, 0, b0, a1, KERB + 0.8, b1, 'railing', F().SOLID | F().SHOTS);
    }
    for (const x of [x0 + 0.3, (x0 + x1) / 2, x1 - 0.3]) for (const z of [z0 + 0.3, z1 - 0.3]) {
      ctx.prop.box(x - 0.2, KERB, z - 0.2, x + 0.2, KERB + 6, z + 0.2, VH.col(0xe0403a));
      world.physics.addBox(x - 0.25, 0, z - 0.25, x + 0.25, KERB + 6, z + 0.25, 'pole', F().SOLID | F().SHOTS);
    }
    ctx.prop.box(x0 - 0.5, KERB + 6, z0 - 0.5, x1 + 0.5, KERB + 6.6, z1 + 0.5, VH.col(0x6a3fa0), { bottom: true });
    ctx.propMatte.box(x0 + 1, KERB + 5.9, z0 + 1, x1 - 1, KERB + 6.0, z1 - 1, VH.col(0x5a5f66), { bottom: true });
    world.physics.addBox(x0 - 0.5, KERB + 6, z0 - 0.5, x1 + 0.5, KERB + 6.6, z1 + 0.5, 'building', F().SOLID | F().CAMERA);
    for (let x = x0; x <= x1; x += 1.4) for (const z of [z0 - 0.55, z1 + 0.55]) ctx.screen.box(x - 0.1, KERB + 6.05, z - 0.05, x + 0.1, KERB + 6.4, z + 0.05, VH.col(Math.round(x) % 2 ? 0xffd24a : 0xff5c95, 2));
    const cols = [0xe0403a, 0x37b8ff, 0xffd24a, 0x7dcf6a, 0xff5c95, 0xb45cff];
    for (let k = 0; k < 9; k++) {
      const cx = x0 + 5 + ((k * 13.7) % (x1 - x0 - 10)), cz = z0 + 5 + ((k * 7.3) % (z1 - z0 - 10));
      const yaw = k * 1.9;
      ctx.prop.orientedBox(cx, cz, 0.85, 1.2, yaw, KERB + 0.2, KERB + 0.75, VH.col(cols[k % cols.length]));
      ctx.prop.orientedBox(cx, cz, 0.95, 1.35, yaw, KERB + 0.25, KERB + 0.45, VH.col(0x1b1d21));
      world.physics.addOrientedBox(cx, cz, 0.95, 1.35, yaw, 0, KERB + 0.75, 'metal', F().SOLID | F().SHOTS);
      ctx.prop.box(cx - 0.03, KERB + 0.75, cz - 0.03, cx + 0.03, KERB + 5.9, cz + 0.03, VH.col(0x9aa1a8));
      world.physics.addBox(cx - 0.08, KERB + 0.75, cz - 0.08, cx + 0.08, KERB + 5.9, cz + 0.08, 'pole', F().SOLID | F().SHOTS);
    }
    sign(world, { x: x1 + 0.6, y: KERB + 7.6, z: (z0 + z1) / 2, yaw: Math.PI / 2, w: 10, h: 1.8, lines: ['DODGEMS'], style: 'neon', colors: CYAN, posts: false });
  }

  /** A helter-skelter: a striped tower and a slide spiralling round it. */
  function buildHelter(world, x, z) {
    const ctx = world.ctxAt(x, z);
    for (let k = 0; k < 7; k++) ctx.prop.cylinder(x, KERB + k * 2, z, 3, 2.7, 2, 12, VH.col(k % 2 ? 0xf6f1e4 : 0xe0403a), false);
    ctx.prop.cylinder(x, KERB + 14, z, 3.6, 0, 4, 12, VH.col(0x2fb7b0), false);
    ctx.prop.cylinder(x, KERB + 18, z, 0.05, 0.05, 1.6, 4, VH.col(0xdddddd), false);
    const turns = 3.25, top = KERB + 13, n = 52;
    let pa = null;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const a = t * turns * Math.PI * 2;
      const p = [x + Math.cos(a) * 4.4, top - t * (top - KERB - 0.6), z + Math.sin(a) * 4.4];
      if (pa) {
        beam(ctx.prop, pa[0], pa[1], pa[2], p[0], p[1], p[2], 1.2, VH.col(0xffd24a));
        solidBeam(world, pa[0], pa[1], pa[2], p[0], p[1], p[2], 1.2);
      }
      pa = p;
    }
    world.physics.addBox(x - 3, 0, z - 3, x + 3, KERB + 18, z + 3, 'building');
  }

  /** The Riptide's track, supports and station (the train runs in WharfLife). */
  function buildCoaster(world) {
    const path = coasterPath();
    const red = VH.col(0xd8262e);
    const white = VH.col(0xf2efe6);
    const n = path.length;
    for (let i = 0; i < n; i++) {
      const a = path[i];
      const b = path[(i + 1) % n];
      const dx = b.x - a.x, dz = b.z - a.z;
      const l = Math.hypot(dx, dz) || 1;
      const lx = -dz / l, lz = dx / l; // sideways
      const ctx = world.ctxAt((a.x + b.x) / 2, (a.z + b.z) / 2);
      for (const s of [-0.6, 0.6]) beam(ctx.prop, a.x + lx * s, a.y + 0.5, a.z + lz * s, b.x + lx * s, b.y + 0.5, b.z + lz * s, 0.16, red);
      beam(ctx.prop, a.x, a.y + 0.2, a.z, b.x, b.y + 0.2, b.z, 0.32, red);
      // Where the track runs low, fence it (track and train) so nobody stands in the train's way.
      solidBeam(world, a.x, a.y + 0.85, a.z, b.x, b.y + 0.85, b.z, 1.7, 2.85);
      if (i % 2 === 0) beam(ctx.prop, a.x - lx * 0.7, a.y + 0.38, a.z - lz * 0.7, a.x + lx * 0.7, a.y + 0.38, a.z + lz * 0.7, 0.12, VH.col(0x5a5f66));
      if (i % 5 === 0) {
        ctx.prop.box(a.x - 0.22, KERB, a.z - 0.22, a.x + 0.22, a.y + 0.1, a.z + 0.22, white);
        world.physics.addBox(a.x - 0.3, 0, a.z - 0.3, a.x + 0.3, a.y + 0.1, a.z + 0.3, 'pole', F().SOLID | F().SHOTS);
        if (a.y > 9) {
          beam(ctx.prop, a.x - lx * 2.5, KERB, a.z - lz * 2.5, a.x, a.y * 0.6, a.z, 0.16, white);
          solidBeam(world, a.x - lx * 2.5, KERB, a.z - lz * 2.5, a.x, a.y * 0.6, a.z, 0.3);
        }
        // A bulb under the track every few metres: the ride reads at night.
        ctx.screen.box(a.x - 0.1, a.y - 0.05, a.z - 0.1, a.x + 0.1, a.y + 0.1, a.z + 0.1, VH.col(0xffd24a, 2));
      }
    }
    // The station: a platform on the east side of the track's flat west leg, a roof and the name.
    const sx0 = 913.4, sx1 = 918, sz0 = 126, sz1 = 152;
    const ctx = world.ctxAt(916, 139);
    solid(world, ctx.prop, sx0, KERB, sz0, sx1, KERB + 1.0, sz1, 0xd9d2c4, null, 'boardwalk');
    fenceLine(world, ctx, sx0 + 0.12, sz0 + 0.3, sx0 + 0.12, sz1 - 0.3, KERB + 1.0, 1.25, 0xffd24a); // the track side
    world.physics.addRamp(sx1 + 2, 139, 1.6, 2, -Math.PI / 2, 0, KERB, KERB + 1.0, 'boardwalk');
    wedge(ctx.prop, sx1 + 2, 139, 1.6, 2, -Math.PI / 2, KERB, KERB + 1.0, VH.col(0xd9d2c4));
    for (const z of [sz0 + 0.5, sz1 - 0.5]) for (const x of [910, sx1 - 0.4]) {
      ctx.prop.box(x - 0.15, KERB, z - 0.15, x + 0.15, KERB + 5, z + 0.15, white);
      world.physics.addBox(x - 0.2, 0, z - 0.2, x + 0.2, KERB + 5, z + 0.2, 'pole', F().SOLID | F().SHOTS);
    }
    ctx.prop.box(909.4, KERB + 5, sz0, sx1 + 0.2, KERB + 5.4, sz1, VH.col(0x2fb7b0), { bottom: true });
    ctx.screen.box(909.3, KERB + 5.05, sz0 - 0.05, sx1 + 0.3, KERB + 5.25, sz0 + 0.05, VH.col(0xff3d8b, 2));
    sign(world, { x: sx1 + 0.3, y: KERB + 6.6, z: 139, yaw: Math.PI / 2, w: 9, h: 2, lines: ['THE RIPTIDE', 'Hold on to your hat'], style: 'neon', colors: CYAN, posts: false, twoSided: true });
  }

  /** Arc-length samples (about 1 m apart) of the Riptide's loop: [{ x, y, z }]. */
  let PATH = null;
  function coasterPath() {
    if (PATH) return PATH;
    const curve = new THREE.CatmullRomCurve3(COASTER.map(([x, z, y]) => new THREE.Vector3(x, KERB + y, z)), true, 'centripetal');
    const n = Math.round(curve.getLength());
    PATH = curve.getSpacedPoints(n).slice(0, n).map((p) => ({ x: p.x, y: p.y, z: p.z }));
    return PATH;
  }

  function buildCarousel(world, cx, cz) {
    const ctx = world.ctxAt(cx, cz);
    ctx.prop.cylinder(cx, KERB, cz, 8.2, 8.2, 0.5, 16, VH.col(0xf6f1e4), true, VH.col(0xc9a477));
    ctx.prop.cylinder(cx, KERB + 0.5, cz, 1.6, 1.6, 5.5, 12, VH.col(0xe0403a), false);
    ctx.prop.cylinder(cx, KERB + 6, cz, 8.8, 8.8, 0.8, 16, VH.col(0xffd24a), false);
    ctx.prop.cylinder(cx, KERB + 6.8, cz, 8.8, 0.6, 3, 16, VH.col(0xf6f1e4), false);
    ctx.prop.cylinder(cx, KERB + 9.8, cz, 0.4, 0.05, 1.2, 6, VH.col(0xffd24a), false);
    const horse = [0xf6f1e4, 0x37b8ff, 0xff5c95, 0xffd24a];
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      const r = k % 2 ? 6.4 : 4.6;
      const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
      ctx.prop.box(x - 0.04, KERB + 0.5, z - 0.04, x + 0.04, KERB + 6, z + 0.04, VH.col(0xd4a017));
      const y = KERB + 1.3 + (k % 3) * 0.3;
      ctx.prop.orientedBox(x, z, 0.22, 0.75, -a, y, y + 0.55, VH.col(horse[k % 4]));
      world.physics.addOrientedBox(x, z, 0.25, 0.8, -a, KERB + 0.5, y + 1.0, 'metal', F().SOLID | F().SHOTS);
      ctx.prop.orientedBox(x + Math.cos(a + Math.PI / 2) * 0.6, z + Math.sin(a + Math.PI / 2) * 0.6, 0.15, 0.2, -a, y + 0.4, y + 1.0, VH.col(horse[k % 4]));
    }
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * Math.PI * 2;
      const x = cx + Math.cos(a) * 8.85, z = cz + Math.sin(a) * 8.85;
      ctx.screen.box(x - 0.12, KERB + 6.25, z - 0.12, x + 0.12, KERB + 6.55, z + 0.12, VH.col(k % 2 ? 0xffd24a : 0xfff4d6, 2));
    }
    world.physics.addBox(cx - 1.6, 0, cz - 1.6, cx + 1.6, KERB + 10, cz + 1.6, 'wall');
    solidRound(world, cx, cz, 8.2, -0.5, KERB + 0.5, 'plank', F().SOLID);
    world.physics.addBox(cx - 8.8, KERB + 6, cz - 8.8, cx + 8.8, KERB + 9, cz + 8.8, 'building', F().SOLID | F().CAMERA);
  }

  // ------------------------------------------------ the convention centre
  function buildConvention(world, b) {
    const C = CONV;
    const ix0 = b.minX + 4, ix1 = b.maxX - 4, iz0 = b.minZ + 4, iz1 = b.maxZ - 4;
    // The loading yard behind (north, on Bridge Street) and the forecourt in front.
    tiles(world, ix0, iz0, ix1, C.z0 - 4, (x0, z0, x1, z1, ctx) => ctx.asphaltTop.topRect(x0, z0, x1, z1, KERB, VH.col(0x9a9a9a), 6));
    tiles(world, ix0, C.z1, ix1, iz1, (x0, z0, x1, z1, ctx) => ctx.plazaTop.topRect(x0, z0, x1, z1, KERB, VH.col(0xe8e2d4), 4));
    tiles(world, ix0, C.z0 - 4, C.x0, C.z1, (x0, z0, x1, z1, ctx) => { ctx.grassTop.topRect(x0, z0, x1, z1, KERB, VH.col(0xffffff), 6); world.addLawn(x0, z0, x1, z1); });
    tiles(world, C.x1, C.z0 - 4, ix1, C.z1, (x0, z0, x1, z1, ctx) => { ctx.grassTop.topRect(x0, z0, x1, z1, KERB, VH.col(0xffffff), 6); world.addLawn(x0, z0, x1, z1); });
    // The hall: pale walls in two chunks' builders, a glass front, a band of colour, a stepped roof.
    const wallCol = VH.col(0xe9e4da);
    const glass = VH.col(0x5d87a6);
    tiles(world, C.x0, C.z0, C.x1, C.z1, (x0, z0, x1, z1, ctx) => {
      if (z0 === C.z0) ctx.b.box(x0, KERB, C.z0, x1, KERB + C.h, C.z0 + 0.4, wallCol, { skip: { top: true, w: x0 > C.x0, e: x1 < C.x1 } });
      if (x0 === C.x0) ctx.b.box(C.x0, KERB, z0, C.x0 + 0.4, KERB + C.h, z1, wallCol, { skip: { top: true, n: true, s: true } });
      if (x1 === C.x1) ctx.b.box(C.x1 - 0.4, KERB, z0, C.x1, KERB + C.h, z1, wallCol, { skip: { top: true, n: true, s: true } });
      if (z1 === C.z1) {
        ctx.b.wall([x0, KERB, C.z1], 1, 0, x1 - x0, C.h - 4, glass, null, [0, (x1 - x0) / 4, 0, 4], [0.94, 0.9, 2, 31]);
        ctx.b.box(x0, KERB + C.h - 4, C.z1 - 0.4, x1, KERB + C.h, C.z1, VH.col(0x2fb7b0), { skip: { top: true, w: x0 > C.x0, e: x1 < C.x1 } });
      }
      ctx.b.topRect(x0, z0, x1, z1, KERB + C.h, VH.col(0xbfc3c6), 8);
    });
    world.physics.addBox(C.x0, 0, C.z0, C.x1, KERB + C.h, C.z1, 'building', F().ALL);
    // The roof: two long waves of white sail, end to end across the hall (the convention centre's look from the bay).
    const wave = (z) => KERB + C.h + 1.5 + 5.5 * (0.5 - 0.5 * Math.cos(((z - C.z0) / (C.z1 - C.z0)) * Math.PI * 4));
    const roofCol = VH.col(0xf4f1ea);
    for (let z = C.z0 - 2; z < C.z1 + 2 - 0.01; z += 4) {
      const za = z, zb = Math.min(C.z1 + 2, z + 4);
      const ya = wave(za), yb = wave(zb);
      const ctx = world.ctxAt((C.x0 + C.x1) / 2, (za + zb) / 2);
      _d.set(0, yb - ya, zb - za);
      const len = _d.length();
      _q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), _d.multiplyScalar(1 / len));
      _v.set((C.x0 + C.x1) / 2, (ya + yb) / 2, (za + zb) / 2);
      _s.set(C.x1 - C.x0 + 4, 0.5, len + 0.05);
      _m.compose(_v, _q, _s);
      ctx.prop.merge(unit(), _m, roofCol);
      // Struts down to the flat roof.
      if (Math.round(z) % 8 === 0) for (let x = C.x0 + 6; x < C.x1; x += 32) ctx.prop.box(x - 0.2, KERB + C.h, za - 0.2, x + 0.2, ya, za + 0.2, VH.col(0x9aa1a8));
      world.physics.addBox(C.x0, KERB + C.h, za, C.x1, Math.max(ya, yb), zb, 'building', F().SOLID | F().CAMERA);
    }
    // A teal neon line along the wave's front edge.
    const fctx0 = world.ctxAt(1070, C.z1);
    fctx0.screen.box(C.x0 - 2, wave(C.z1 + 2) - 0.35, C.z1 + 1.9, C.x1 + 2, wave(C.z1 + 2) - 0.1, C.z1 + 2.1, VH.col(0x37e8ff, 2));
    // The canopy over the entrance, on columns, lit underneath.
    const cz0 = C.z1, cz1 = C.z1 + 20, cx0 = 1020, cx1 = 1120;
    tiles(world, cx0, cz0, cx1, cz1, (x0, z0, x1, z1, ctx) => {
      ctx.prop.box(x0, KERB + 10, z0, x1, KERB + 11, z1, VH.col(0xf4f1ea), { bottom: true, skip: { w: x0 > cx0, e: x1 < cx1, n: true } });
      for (let x = x0 + 5; x < x1; x += 12.5) ctx.screen.box(x - 1.5, KERB + 9.95, z0 + 6, x + 1.5, KERB + 10, z1 - 4, VH.col(0xfff4dc, 1.4));
    });
    world.physics.addBox(cx0, KERB + 10, cz0, cx1, KERB + 11, cz1, 'building', F().SOLID | F().SHOTS | F().CAMERA);
    for (let x = cx0 + 2; x <= cx1 - 2; x += 24) {
      const ctx = world.ctxAt(x, cz1 - 1.5);
      ctx.prop.cylinder(x, KERB, cz1 - 1.5, 0.5, 0.5, 10, 10, VH.col(0xd9d4ca), false);
      world.physics.addBox(x - 0.5, 0, cz1 - 2, x + 0.5, KERB + 10, cz1 - 1, 'pole');
    }
    // A screen over the doors: what's on.
    const sctx = world.ctxAt(1070, C.z1);
    sctx.screen.box(1050, KERB + 4.2, C.z1 + 0.02, 1090, KERB + 8.6, C.z1 + 0.12, VH.col(0x10141c, 1));
    sign(world, { x: 1070, y: KERB + 6.4, z: C.z1 + 0.16, yaw: 0, w: 38, h: 4, lines: ['ISLA PALOMA BOAT & LEISURE SHOW', 'This weekend · Halls A-C · Doors 10 am'], style: 'info' });
    sign(world, { x: 1070, y: KERB + 12.8, z: C.z1 + 20.2, yaw: 0, w: 44, h: 3.2, lines: ['PALOMA CONVENTION CENTRE'], style: 'monolith', posts: false });
    world.ctxAt(1070, C.z1 + 20).prop.box(1046, KERB + 11, C.z1 + 19.6, 1094, KERB + 11.2, C.z1 + 20, VH.col(0x2a2d3a));
    // The forecourt: a fountain, flags, planters, lamps.
    const fx = 1070, fz = -105;
    const fctx = world.ctxAt(fx, fz);
    fctx.concrete.cylinder(fx, KERB, fz, 7, 7, 0.6, 20, VH.col(0xd6cfc2), true, VH.col(0xd6cfc2));
    fctx.screen.cylinder(fx, KERB + 0.4, fz, 6.4, 6.4, 0.25, 20, VH.col(0x3fa8c8, 0.75), true);
    fctx.concrete.cylinder(fx, KERB + 0.6, fz, 1.6, 1.2, 1.4, 12, VH.col(0xd6cfc2), true);
    fctx.screen.cylinder(fx, KERB + 2, fz, 0.5, 0.15, 3.4, 8, VH.col(0xcfefff, 1.1), true);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      fctx.screen.cylinder(fx + Math.cos(a) * 4.5, KERB + 0.6, fz + Math.sin(a) * 4.5, 0.12, 0.05, 1.6, 6, VH.col(0xcfefff, 1.1), true); // solidity: passable (water jets)
    }
    solidRound(world, fx, fz, 7, 0, KERB + 0.6, 'wall', F().SOLID | F().SHOTS);
    world.physics.addBox(fx - 1.6, 0, fz - 1.6, fx + 1.6, KERB + 5.4, fz + 1.6, 'wall');
    const flags = [0x2fb7b0, 0xffd24a, 0xff5c95, 0x37b8ff, 0xf6f1e4, 0xe0403a, 0x7dcf6a];
    flags.forEach((c, i) => {
      const x = 1020 + i * (100 / 6);
      const z = -80;
      const ctx = world.ctxAt(x, z);
      ctx.prop.cylinder(x, KERB, z, 0.1, 0.07, 12, 6, VH.col(0xe8e8e8), true);
      ctx.prop.box(x + 0.1, KERB + 9.2, z - 0.04, x + 3.3, KERB + 11.4, z + 0.04, VH.col(c));
      world.physics.addBox(x - 0.15, 0, z - 0.15, x + 0.15, KERB + 12, z + 0.15, 'pole', F().SOLID | F().SHOTS);
    });
    for (let x = ix0 + 6; x < ix1; x += 24) {
      world.addProp('streetlight', x, KERB, b.maxZ - 1.2, 0, 1);
      world.addProp('streetlight', x + 12, KERB, b.minZ + 1.2, Math.PI, 1);
    }
    for (let z = b.minZ + 20; z < b.maxZ - 10; z += 32) {
      world.addProp('streetlight', b.minX + 1.2, KERB, z, -Math.PI / 2, 1);
      world.addProp('streetlight', b.maxX - 1.2, KERB, z, Math.PI / 2, 1);
    }
    for (const x of [1004, 1136]) for (const z of [-128, -96]) world.addProp('palmTall', x, KERB, z, x + z, 1.1);
    for (let x = 1028; x < 1115; x += 14) if (Math.abs(x - fx) > 9) world.addProp('planter', x, KERB, -90, 0, 1);
    // The loading dock: a raised platform along the back wall, four roller doors, bumpers, bays.
    const dz1 = C.z0, dz0 = C.z0 - 4;
    const dctx = world.ctxAt(1070, dz0);
    solid(world, dctx.concrete, 1015, KERB, dz0, 1125, KERB + 1.2, dz1, 0xbdb6aa, { uvScale: 4 }, 'kerb');
    for (const x of [1030, 1055, 1080, 1105]) {
      dctx.prop.box(x - 3.2, KERB + 1.2, C.z0 - 0.08, x + 3.2, KERB + 6.2, C.z0, VH.col(0x8f969c));
      for (let y = KERB + 1.6; y < KERB + 6.2; y += 0.5) dctx.prop.box(x - 3.2, y, C.z0 - 0.12, x + 3.2, y + 0.06, C.z0 - 0.08, VH.col(0x6f767c));
      dctx.prop.box(x - 3.6, KERB + 6.2, C.z0 - 0.4, x + 3.6, KERB + 6.6, C.z0, VH.col(0x2fb7b0));
      dctx.screen.box(x - 0.4, KERB + 6.7, C.z0 - 0.3, x + 0.4, KERB + 6.9, C.z0 - 0.1, VH.col(0xfff4dc, 1.6));
      for (const s of [-2.4, 2.4]) dctx.prop.box(x + s - 0.25, KERB + 0.2, dz0 - 0.25, x + s + 0.25, KERB + 1.1, dz0, VH.col(0x1b1d21));
      for (const s of [-3.5, 3.5]) dctx.marks.topRect(x + s - 0.08, dz0 - 18, x + s + 0.08, dz0, KERB + 0.01, VH.col(0xf2c21b));
    }
    sign(world, { x: 1070, y: KERB + 8.6, z: C.z0 - 0.1, yaw: Math.PI, w: 14, h: 1.6, lines: ['DELIVERIES · LOADING DOCK', 'Paloma Convention Centre'], style: 'info', posts: false });
    world.addProp('dumpster', 1135, KERB, -270, 0, 1);
    world.addProp('dumpster', 1135, KERB, -262, 0, 1);
  }

  // ------------------------------------------------------------ the Strand
  /** The built footprint of a lot (from its building collider), or null. */
  function footprint(world, lot) {
    let best = null;
    world.physics.query(lot.minX + 0.5, lot.minZ + 0.5, lot.maxX - 0.5, lot.maxZ - 0.5, (c) => {
      if (c.tag !== 'building') return;
      if (c.cx < lot.minX || c.cx > lot.maxX || c.cz < lot.minZ || c.cz > lot.maxZ) return;
      if (!best || c.maxY > best.maxY) best = c;
    });
    if (!best) return null;
    return { x0: best.cx - best.hx, x1: best.cx + best.hx, z0: best.cz - best.hz, z1: best.cz + best.hz, top: best.maxY };
  }

  /** Neon up the street corners and round the crown of a generic hotel. */
  function neonHotel(world, lot, r, k) {
    const ctx = world.ctxAt(lot.cx, lot.cz);
    const c1 = VH.col(NEON[k % NEON.length], 2.2);
    const c2 = VH.col(NEON[(k + 3) % NEON.length], 2.2);
    const top = r.top - 1.6;
    const y0 = KERB + 5.4;
    const o = 0.12; // proud of the wall
    const fronts = Object.keys(lot.front).filter((s) => lot.front[s]);
    const corners = new Set();
    for (const s of fronts) {
      if (s === 'n') { corners.add('nw'); corners.add('ne'); }
      if (s === 's') { corners.add('sw'); corners.add('se'); }
      if (s === 'e') { corners.add('ne'); corners.add('se'); }
      if (s === 'w') { corners.add('nw'); corners.add('sw'); }
    }
    for (const c of corners) {
      const x = c[1] === 'w' ? r.x0 : r.x1;
      const z = c[0] === 'n' ? r.z0 : r.z1;
      const sx = c[1] === 'w' ? -1 : 1;
      const sz = c[0] === 'n' ? -1 : 1;
      const cx = x + sx * o, cz = z + sz * o;
      ctx.screen.box(cx - 0.18, y0, cz - 0.18, cx + 0.18, top, cz + 0.18, c1);
    }
    // Bands round the top on the street sides.
    for (const s of fronts) {
      for (const y of [top - 0.6, top - 2.2]) {
        const col = y > top - 1 ? c2 : c1;
        if (s === 'n') ctx.screen.box(r.x0, y, r.z0 - 0.75, r.x1, y + 0.3, r.z0 - 0.62, col);
        if (s === 's') ctx.screen.box(r.x0, y, r.z1 + 0.62, r.x1, y + 0.3, r.z1 + 0.75, col);
        if (s === 'w') ctx.screen.box(r.x0 - 0.75, y, r.z0, r.x0 - 0.62, y + 0.3, r.z1, col);
        if (s === 'e') ctx.screen.box(r.x1 + 0.62, y, r.z0, r.x1 + 0.75, y + 0.3, r.z1, col);
      }
      // A lit canopy over the entrance.
      const mid = s === 'n' || s === 's' ? (r.x0 + r.x1) / 2 : (r.z0 + r.z1) / 2;
      const canopy = VH.col(0x1b1d24);
      if (s === 'n') { ctx.prop.box(mid - 4, KERB + 3.6, r.z0 - 3, mid + 4, KERB + 4.0, r.z0, canopy, { bottom: true }); ctx.screen.box(mid - 4, KERB + 3.6, r.z0 - 3.05, mid + 4, KERB + 4.0, r.z0 - 3, c2); }
      if (s === 's') { ctx.prop.box(mid - 4, KERB + 3.6, r.z1, mid + 4, KERB + 4.0, r.z1 + 3, canopy, { bottom: true }); ctx.screen.box(mid - 4, KERB + 3.6, r.z1 + 3, mid + 4, KERB + 4.0, r.z1 + 3.05, c2); }
      if (s === 'w') { ctx.prop.box(r.x0 - 3, KERB + 3.6, mid - 4, r.x0, KERB + 4.0, mid + 4, canopy, { bottom: true }); ctx.screen.box(r.x0 - 3.05, KERB + 3.6, mid - 4, r.x0 - 3, KERB + 4.0, mid + 4, c2); }
      if (s === 'e') { ctx.prop.box(r.x1, KERB + 3.6, mid - 4, r.x1 + 3, KERB + 4.0, mid + 4, canopy, { bottom: true }); ctx.screen.box(r.x1 + 3, KERB + 3.6, mid - 4, r.x1 + 3.05, KERB + 4.0, mid + 4, c2); }
    }
  }

  function buildStrand(world, layout) {
    const blocks = (layout.blocks3 || []).filter((bl) => bl.district.id === 'neonstrand' && bl.kind === 'buildings');
    let k = 0;
    let palace = null;
    for (const bl of blocks) {
      for (const lot of bl.lots) {
        if (lot.archetype !== 'hotel') continue;
        const r = footprint(world, lot);
        if (!r) continue;
        if (Math.abs(lot.minX - 1101) < 2 && Math.abs(lot.minZ - 12) < 2) {
          palace = { lot, r, bl };
          continue;
        }
        if (Object.values(lot.front).some(Boolean)) neonHotel(world, lot, r, k++);
      }
    }
    if (palace) {
      // Its forecourt: the car park on the corner of the Strand in front of it.
      const court = palace.bl.lots.find((l) => l.kind === 'parking' && Math.abs(l.maxZ - palace.lot.minZ) < 1 && Math.abs(l.minX - palace.lot.minX) < 1);
      buildPalace(world, palace.lot, palace.r, court || null);
    }
    // The gateway arch over the Strand at Bayfront Drive.
    const ax = 830;
    const actx = world.ctxAt(ax, -60);
    for (const z of [-71.2, -48.8]) {
      solid(world, actx.prop, ax - 0.7, KERB, z - 0.7, ax + 0.7, KERB + 9.5, z + 0.7, 0x2a2d3a, null, 'pole');
      actx.screen.box(ax - 0.75, KERB + 0.5, z - 0.75, ax - 0.7, KERB + 9.3, z + 0.75, VH.col(0xff3d8b, 2.2));
      actx.screen.box(ax + 0.7, KERB + 0.5, z - 0.75, ax + 0.75, KERB + 9.3, z + 0.75, VH.col(0x37e8ff, 2.2));
    }
    actx.prop.box(ax - 0.8, KERB + 9.5, -72, ax + 0.8, KERB + 10.4, -48, VH.col(0x2a2d3a), { bottom: true });
    world.physics.addBox(ax - 0.8, KERB + 9.5, -72, ax + 0.8, KERB + 10.4, -48, 'building', F().SOLID | F().SHOTS);
    sign(world, { x: ax, y: KERB + 12, z: -60, yaw: Math.PI / 2, w: 20, h: 3.2, lines: ['THE NEON STRAND', 'Isla Paloma'], style: 'neon', posts: false, twoSided: true });
    // Two night clubs on the Strand: blade signs and lit doors.
    const club = (x, z, yaw, lines, colors) => {
      const ctx = world.ctxAt(x, z);
      const out = yaw === Math.PI ? -1 : 1; // north face (-z) or south face (+z)
      ctx.prop.box(x - 0.15, KERB + 3, z + out * 0.2, x + 0.15, KERB + 11, z + out * 2.4, VH.col(0x14161c));
      sign(world, { x: x + 0.17, y: KERB + 7, z: z + out * 1.3, yaw: Math.PI / 2, w: 2, h: 7.6, lines, style: 'neon', colors, posts: false, twoSided: true });
      ctx.screen.box(x - 2.2, KERB + 2.7, z + out * 0.15 - 0.03, x + 2.2, KERB + 3.0, z + out * 0.15 + 0.03, VH.col(colors ? 0x37e8ff : 0xff3d8b, 2.2));
      for (const s of [-3, 3]) world.addProp('bollard', x + s, KERB, z + out * 2.2, 0, 1);
    };
    club(1040, -47, Math.PI, ['SOLSTICE'], null);
    club(1218, -73, 0, ['MOONWAVE'], CYAN);
    // Palms down the Strand's pavements where the plots have none.
    for (let x = 1003; x < 1150; x += 20) world.addProp('palmTall', x, KERB, -70.6, x, 1);
  }

  /**
   * The Castellane Palace: the generic hotel on Lantana Avenue just south of
   * the Strand, in gold neon with a crown, its porte-cochère facing the
   * Strand across its own forecourt (the car park lot on the corner) with a
   * three-tier fountain in the middle.
   */
  function buildPalace(world, lot, r, court) {
    const ctx = world.ctxAt(lot.cx, lot.cz);
    const gold = VH.col(0xffc93a, 2.4);
    const top = r.top - 1.6;
    // Cream cladding with its own windows over the generic walls: the palace stands apart from its turquoise neighbours.
    const fy0 = KERB + 5.2;
    const fh = r.top - 1.7 - fy0;
    const floors = Math.max(1, Math.round(fh / 3.2));
    const cream = VH.col(0xf1e7cf);
    const fac = [0.6, 0.62, 1, 17];
    const bays = (len) => Math.max(1, Math.round(len / 3.6));
    ctx.b.wall([r.x1, fy0, r.z0 - 0.06], -1, 0, r.x1 - r.x0, fh, cream, null, [0, bays(r.x1 - r.x0), 0, floors], fac);
    ctx.b.wall([r.x0, fy0, r.z1 + 0.06], 1, 0, r.x1 - r.x0, fh, cream, null, [0, bays(r.x1 - r.x0), 0, floors], fac);
    ctx.b.wall([r.x1 + 0.06, fy0, r.z1], 0, -1, r.z1 - r.z0, fh, cream, null, [0, bays(r.z1 - r.z0), 0, floors], fac);
    ctx.b.wall([r.x0 - 0.06, fy0, r.z0], 0, 1, r.z1 - r.z0, fh, cream, null, [0, bays(r.z1 - r.z0), 0, floors], fac);
    // Gold neon up all four corners and two bands round the top (north and east faces).
    for (const [x, z] of [[r.x0, r.z0], [r.x1, r.z0], [r.x0, r.z1], [r.x1, r.z1]]) ctx.screen.box(x - 0.25, KERB + 5.4, z - 0.25, x + 0.25, top, z + 0.25, gold);
    for (const y of [top - 0.6, top - 2.4, KERB + 5.3]) {
      ctx.screen.box(r.x0, y, r.z0 - 0.2, r.x1, y + 0.3, r.z0 - 0.05, gold);
      ctx.screen.box(r.x1 + 0.62, y, r.z0, r.x1 + 0.75, y + 0.3, r.z1, gold);
    }
    // A gold crown on the roof: a lit band and spikes, the island's brightest thing at night.
    const cx0 = r.x0 + 3, cx1 = r.x1 - 3, cz0 = r.z0 + 3, cz1 = r.z1 - 3;
    const cy = r.top + 0.2;
    const bronze = VH.col(0x8a6a1a);
    ctx.prop.box(cx0, cy, cz0, cx1, cy + 1.6, cz0 + 0.3, bronze);
    ctx.prop.box(cx0, cy, cz1 - 0.3, cx1, cy + 1.6, cz1, bronze);
    ctx.prop.box(cx0, cy, cz0, cx0 + 0.3, cy + 1.6, cz1, bronze);
    ctx.prop.box(cx1 - 0.3, cy, cz0, cx1, cy + 1.6, cz1, bronze);
    ctx.screen.box(cx0 - 0.05, cy + 1.6, cz0 - 0.05, cx1 + 0.05, cy + 2.1, cz0 + 0.35, gold);
    ctx.screen.box(cx0 - 0.05, cy + 1.6, cz1 - 0.35, cx1 + 0.05, cy + 2.1, cz1 + 0.05, gold);
    ctx.screen.box(cx0 - 0.05, cy + 1.6, cz0, cx0 + 0.35, cy + 2.1, cz1, gold);
    ctx.screen.box(cx1 - 0.35, cy + 1.6, cz0, cx1 + 0.05, cy + 2.1, cz1, gold);
    const spikes = [];
    for (let k = 0; k <= 4; k++) {
      const x = cx0 + ((cx1 - cx0) * k) / 4;
      spikes.push([x, cz0], [x, cz1]);
    }
    for (let k = 1; k < 4; k++) {
      const z = cz0 + ((cz1 - cz0) * k) / 4;
      spikes.push([cx0, z], [cx1, z]);
    }
    spikes.forEach(([x, z], k) => {
      const h = k % 2 ? 5 : 7.5;
      ctx.screen.cylinder(x, cy + 2.1, z, 0.35, 0.05, h, 4, gold, false);
      ctx.screen.box(x - 0.45, cy + 2.1 + h, z - 0.45, x + 0.45, cy + 3 + h, z + 0.45, VH.col(0xfff4c8, 2.6));
    });
    // The name over the crown, to the Strand and to Lantana Avenue.
    sign(world, { x: (r.x0 + r.x1) / 2, y: cy + 12.5, z: cz0, yaw: Math.PI, w: 34, h: 7, lines: ['CASTELLANE PALACE', 'CHAMPIONS SINCE DAY ONE'], style: 'neon', colors: GOLD, posts: false, twoSided: true });
    sign(world, { x: r.x1 + 0.8, y: KERB + 9, z: (r.z0 + r.z1) / 2, yaw: Math.PI / 2, w: Math.min(30, r.z1 - r.z0 - 8), h: 4.2, lines: ['CASTELLANE PALACE'], style: 'neon', colors: GOLD, posts: false });
    for (const x of [cx0 + 2, cx1 - 2]) {
      ctx.prop.box(x - 0.15, cy + 2.1, cz0 - 0.15, x + 0.15, cy + 9, cz0 + 0.15, bronze);
    }
    // The porte-cochère on the north face, over the drive: a gold-edged slab on columns.
    const mx = (r.x0 + r.x1) / 2;
    const px0 = mx - 10, px1 = mx + 10, pz0 = r.z0 - 9, pz1 = r.z0;
    ctx.prop.box(px0, KERB + 5, pz0, px1, KERB + 5.9, pz1, VH.col(0xf4efe2), { bottom: true });
    ctx.screen.box(px0 - 0.05, KERB + 5.9, pz0 - 0.05, px1 + 0.05, KERB + 6.3, pz1, gold);
    ctx.screen.box(px0 + 1, KERB + 4.98, pz0 + 1, px1 - 1, KERB + 5.0, pz1 - 0.5, VH.col(0xfff1c8, 1.5));
    for (const x of [px0 + 0.7, px1 - 0.7]) {
      ctx.prop.cylinder(x, KERB, pz0 + 0.7, 0.4, 0.4, 5, 10, VH.col(0xf4efe2), false);
      ctx.screen.box(x - 0.42, KERB + 4.4, pz0 + 0.28, x + 0.42, KERB + 4.6, pz0 + 1.12, gold);
      world.physics.addBox(x - 0.4, 0, pz0 + 0.3, x + 0.4, KERB + 5, pz0 + 1.1, 'pole');
    }
    world.physics.addBox(px0, KERB + 5, pz0, px1, KERB + 5.9, pz1, 'building', F().SOLID | F().SHOTS | F().CAMERA);
    // Gold doors, a red carpet, the doorman's stand, two potted palms.
    ctx.screen.box(mx - 3.2, KERB + 0.1, r.z0 - 0.06, mx + 3.2, KERB + 3.6, r.z0 - 0.02, VH.col(0xffd96a, 1.3));
    ctx.decal.topRect(mx - 1.6, pz0 + 1, mx + 1.6, r.z0 - 0.1, KERB + 0.012, VH.col(0xa8231f));
    ctx.prop.box(mx + 3.6, KERB, r.z0 - 2.4, mx + 4.3, KERB + 1.25, r.z0 - 1.7, VH.col(0x5a3b1e));
    world.physics.addBox(mx + 3.6, 0, r.z0 - 2.4, mx + 4.3, KERB + 1.25, r.z0 - 1.7, 'wall', F().SOLID | F().SHOTS);
    for (const x of [mx - 5, mx + 6]) world.addProp('planter', x, KERB, r.z0 - 1.2, 0, 1);
    // The forecourt's fountain: a wide basin, three gold tiers, lit water.
    let qx = mx, qz = r.z0 - 26;
    if (court) {
      qx = (court.minX + court.maxX) / 2;
      qz = Math.min((court.minZ + court.maxZ) / 2, r.z0 - 22);
    }
    const fctx = world.ctxAt(qx, qz);
    fctx.concrete.cylinder(qx, KERB, qz, 4.6, 4.6, 0.6, 18, VH.col(0xe2d9c6), true, VH.col(0xe2d9c6));
    fctx.screen.cylinder(qx, KERB + 0.45, qz, 4.2, 4.2, 0.2, 18, VH.col(0x3fa8c8, 0.8), true);
    fctx.prop.cylinder(qx, KERB + 0.6, qz, 0.5, 0.35, 1.6, 8, VH.col(0xd4a017), false);
    fctx.prop.cylinder(qx, KERB + 2.2, qz, 1.9, 1.6, 0.25, 14, VH.col(0xd4a017), true);
    solidRound(world, qx, qz, 1.9, KERB + 2.2, KERB + 2.45, 'metal', F().SOLID | F().SHOTS);
    fctx.prop.cylinder(qx, KERB + 2.45, qz, 0.25, 0.2, 1.2, 8, VH.col(0xd4a017), false);
    fctx.prop.cylinder(qx, KERB + 3.65, qz, 1.0, 0.8, 0.2, 12, VH.col(0xd4a017), true);
    fctx.screen.cylinder(qx, KERB + 3.85, qz, 0.18, 0.04, 1.6, 6, VH.col(0xcfefff, 1.3), true);
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      fctx.screen.cylinder(qx + Math.cos(a) * 3.3, KERB + 0.6, qz + Math.sin(a) * 3.3, 0.1, 0.04, 1.3, 5, VH.col(0xcfefff, 1.2), true); // solidity: passable (water jets)
      fctx.screen.box(qx + Math.cos(a) * 4.45 - 0.12, KERB + 0.6, qz + Math.sin(a) * 4.45 - 0.12, qx + Math.cos(a) * 4.45 + 0.12, KERB + 0.75, qz + Math.sin(a) * 4.45 + 0.12, gold);
    }
    solidRound(world, qx, qz, 4.6, 0, KERB + 0.6, 'wall', F().SOLID | F().SHOTS);
    world.physics.addBox(qx - 0.6, 0, qz - 0.6, qx + 0.6, KERB + 5.4, qz + 0.6, 'wall');
    if (court) {
      for (const [x, z] of [[court.minX + 1.2, court.minZ + 1.2], [court.maxX - 1.2, court.minZ + 1.2], [court.minX + 1.2, court.maxZ - 6], [court.maxX - 1.2, court.maxZ - 6]]) world.addProp('streetlight', x, KERB, z, 0, 1);
    }
    world.castellanePalace = { door: { x: mx, z: r.z0 - 2.4 }, fountain: { x: qx, z: qz }, rect: r, court: court ? court.id : null };
  }

  // ---------------------------------------------------------- the bridges
  function buildBridges(world) {
    const isl = world.island;
    if (!isl) return;
    for (const br of isl.bridges) {
      const half = br.width / 2;
      const z = br.coord;
      const zIn0 = z - half - 2.2, zIn1 = z + half + 2.2;
      // A welcome gantry where the bridge reaches the island.
      const gx = br.to - 10;
      const ctx = world.ctxAt(gx, z);
      for (const zz of [zIn0 - 0.9, zIn1 + 0.9]) {
        ctx.prop.box(gx - 0.5, -1.6, zz - 0.5, gx + 0.5, KERB + 8.4, zz + 0.5, VH.col(0x2a2d3a));
        world.physics.addBox(gx - 0.5, -1.6, zz - 0.5, gx + 0.5, KERB + 8.4, zz + 0.5, 'pole');
      }
      ctx.prop.box(gx - 0.6, KERB + 7.4, zIn0 - 1.4, gx + 0.6, KERB + 8.4, zIn1 + 1.4, VH.col(0x2a2d3a), { bottom: true });
      for (let zz = zIn0 - 1; zz <= zIn1 + 1; zz += 1.2) ctx.screen.box(gx - 0.65, KERB + 7.2, zz - 0.1, gx - 0.6, KERB + 7.4, zz + 0.1, VH.col(zz % 2.4 < 1.2 ? 0xffd24a : 0x37e8ff, 2));
      sign(world, { x: gx - 0.7, y: KERB + 9.9, z, yaw: -Math.PI / 2, w: 14, h: 2.6, lines: ['WELCOME TO ISLA PALOMA', br.towers && br.towers.length ? 'The Neon Strand · Old Paloma · Paloma Field' : 'Old Paloma · The Harbour · The Fort'], style: 'welcome', posts: false, twoSided: true });
      if (!br.towers || !br.towers.length) {
        // The causeway: a string of coloured lights along both parapets.
        for (let a = br.from + 4; a < br.to - 4; a += 36) {
          for (const zz of [zIn0 - 0.15, zIn1 + 0.15]) festoon(world, a, KERB + 1.6, zz, Math.min(br.to - 4, a + 36), KERB + 1.6, zz, 0.6, [0xffd24a, 0xff5c95, 0x37e8ff], 2.4);
        }
        continue;
      }
      // Lights along the main cables and flags on the towers.
      const TOP = 52;
      const anchors = [br.from + 4, ...br.towers, br.to - 4];
      for (const zz of [zIn0 - 1.4, zIn1 + 1.4]) {
        for (let i = 0; i < anchors.length - 1; i++) {
          const x0 = anchors[i], x1 = anchors[i + 1];
          const y0 = i === 0 ? KERB + 2 : TOP - 1;
          const y1 = i === anchors.length - 2 ? KERB + 2 : TOP - 1;
          const sag = i === 0 || i === anchors.length - 2 ? 0 : 22;
          const yAt = (t) => y0 + (y1 - y0) * t - sag * 4 * t * (1 - t) * (y0 === y1 ? 1 : 0.3);
          for (let x = x0 + 3; x < x1 - 1; x += 3) {
            const y = yAt((x - x0) / (x1 - x0));
            const c = world.ctxAt(x, z);
            c.screen.box(x - 0.16, y + 0.12, zz - 0.16, x + 0.16, y + 0.44, zz + 0.16, VH.col(0xfff2c8, 2.4));
          }
        }
      }
      for (const tx of br.towers) {
        const c = world.ctxAt(tx, z);
        const fz = zIn1 + 1.4;
        c.prop.box(tx - 0.08, TOP, fz - 0.08, tx + 0.08, TOP + 7, fz + 0.08, VH.col(0xe8e4dc));
        c.prop.box(tx + 0.08, TOP + 4.4, fz - 0.03, tx + 4.4, TOP + 6.9, fz + 0.03, VH.col(0x2fb7b0));
        c.prop.box(tx + 0.08, TOP + 5.2, fz - 0.035, tx + 4.4, TOP + 6.1, fz + 0.035, VH.col(0xffd24a));
        // Floodlights up the tower faces.
        for (const zz of [zIn0 - 1.4, zIn1 + 1.4]) c.screen.box(tx - 1.65, 10, zz - 0.3, tx - 1.6, TOP - 2, zz + 0.3, VH.col(0xfff2c8, 1.1));
      }
    }
  }

  // -------------------------------------------------------------- the map
  if (VH.MapPainters) {
    VH.MapPainters.push((g, layout, o) => {
      const R = o.R;
      const wb = layout.plots && layout.plots.wonder_wharf;
      if (wb) {
        g.fillStyle = '#e8d6b4';
        R(wb.minX + 4, wb.minZ + 4, wb.maxX - 4, wb.maxZ - 4);
        g.fillStyle = '#c8805e';
        R(MIDWAY.x0, wb.minZ + 4, MIDWAY.x1, wb.maxZ - 4);
        g.fillStyle = '#6a3fa0';
        R(ARCADE.x0, ARCADE.z0, ARCADE.x1, ARCADE.z1);
        g.fillStyle = '#d8262e';
        for (const p of coasterPath()) R(p.x - 0.8, p.z - 0.8, p.x + 0.8, p.z + 0.8);
        g.fillStyle = 'rgba(47, 183, 176, 0.9)';
        if (o.circle) o.circle(WHEEL.x, WHEEL.z, 7);
        if (o.circle) o.circle(935, -20, 8.5);
      }
      const cb = layout.plots && layout.plots.paloma_convention;
      if (cb) {
        g.fillStyle = '#e8e2d4';
        R(cb.minX + 4, CONV.z1, cb.maxX - 4, cb.maxZ - 4);
        g.fillStyle = '#9a9a9a';
        R(cb.minX + 4, cb.minZ + 4, cb.maxX - 4, CONV.z0);
        g.fillStyle = 'rgba(0, 0, 0, 0.3)';
        R(CONV.x0 + 2, CONV.z0 + 2, CONV.x1 + 2, CONV.z1 + 2);
        g.fillStyle = '#d9d6cf';
        R(CONV.x0, CONV.z0, CONV.x1, CONV.z1);
        g.fillStyle = '#2fb7b0';
        R(CONV.x0, CONV.z1 - 3, CONV.x1, CONV.z1);
      }
    });
  }

  // --------------------------------------------------------- moving parts
  /** The wheel turning, its gondolas hanging level, the coaster's train. */
  class WharfLife {
    constructor(game) {
      this.game = game;
      this.ok = !!(game.world && game.world.wonderWharf);
      if (!this.ok) return;
      const W = WHEEL;
      // The wheel: rim, spokes and hub turn as one mesh, the bulbs as another.
      const rim = new VH.GeometryBuilder({});
      const bulbs = new VH.GeometryBuilder({});
      const steel = VH.col(0xf2efe6);
      const N = 36;
      const tmp = { merge: (geo, m, c) => rim.merge(geo, m, c) };
      for (const z of [-1.4, 1.4]) {
        for (let i = 0; i < N; i++) {
          const a0 = (i / N) * Math.PI * 2, a1 = ((i + 1) / N) * Math.PI * 2;
          beam(tmp, Math.cos(a0) * W.r, Math.sin(a0) * W.r, z, Math.cos(a1) * W.r, Math.sin(a1) * W.r, z, 0.45, steel);
          beam(tmp, Math.cos(a0) * (W.r - 2), Math.sin(a0) * (W.r - 2), z, Math.cos(a1) * (W.r - 2), Math.sin(a1) * (W.r - 2), z, 0.25, steel);
          if (i % 2 === 0) beam(tmp, 0, 0, z * 1.6, Math.cos(a0) * W.r, Math.sin(a0) * W.r, z, 0.18, steel);
          const bc = VH.col(i % 3 === 0 ? 0xff5c95 : i % 3 === 1 ? 0xffd24a : 0x37e8ff, 2.2);
          // A neon ring round the rim, in coloured thirds.
          const ring = { merge: (geo, m, c) => bulbs.merge(geo, m, c) };
          const ro = W.r + 0.3;
          beam(ring, Math.cos(a0) * ro, Math.sin(a0) * ro, z * 1.05, Math.cos(a1) * ro, Math.sin(a1) * ro, z * 1.05, 0.22, VH.col(i < N / 3 ? 0xff3d8b : i < (2 * N) / 3 ? 0x37e8ff : 0xffd24a, 2));
          const bx = Math.cos(a0 + 0.08) * W.r, by = Math.sin(a0 + 0.08) * W.r;
          bulbs.box(bx - 0.2, by - 0.2, z + Math.sign(z) * 0.2, bx + 0.2, by + 0.2, z + Math.sign(z) * 0.5, bc);
          const sx = Math.cos(a0) * W.r * 0.55, sy = Math.sin(a0) * W.r * 0.55;
          if (i % 2 === 0) bulbs.box(sx - 0.15, sy - 0.15, z * 1.25 - 0.15, sx + 0.15, sy + 0.15, z * 1.25 + 0.15, VH.col(0xfff2c8, 2));
        }
      }
      for (let i = 0; i < W.cars; i++) {
        const a = (i / W.cars) * Math.PI * 2;
        beam(tmp, Math.cos(a) * W.r, Math.sin(a) * W.r, -1.4, Math.cos(a) * W.r, Math.sin(a) * W.r, 1.4, 0.3, steel);
      }
      rim.cylinder(0, -2.6, 0, 1.6, 1.6, 0.1, 8, steel); // (an end cap, cheap)
      const hub = new THREE.CylinderGeometry(1.8, 1.8, 4.4, 12);
      hub.rotateX(Math.PI / 2);
      rim.merge(hub, new THREE.Matrix4(), VH.col(0xe0403a));
      this.group = new THREE.Group();
      this.group.position.set(W.x, W.hub, W.z);
      this.group.rotation.y = W.yaw;
      this.spin = new THREE.Group();
      this.group.add(this.spin);
      this.rimMesh = new THREE.Mesh(rim.build(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.2 }));
      this.bulbMesh = new THREE.Mesh(bulbs.build(), new THREE.MeshBasicMaterial({ vertexColors: true }));
      this.spin.add(this.rimMesh, this.bulbMesh);
      game.scene.add(this.group);
      // Gondolas: one instanced mesh, kept level.
      const gb = new VH.GeometryBuilder({});
      const white = VH.col(0xffffff);
      gb.box(-1.3, -3.4, -1.1, 1.3, -2.3, 1.1, white);
      gb.box(-1.3, -2.3, -1.1, -1.2, -0.9, 1.1, white);
      gb.box(1.2, -2.3, -1.1, 1.3, -0.9, 1.1, white);
      gb.box(-1.45, -0.9, -1.25, 1.45, -0.6, 1.25, VH.col(0xf2efe6));
      gb.box(-0.06, -0.6, -0.06, 0.06, 0, 0.06, VH.col(0x9aa1a8));
      this.cars = new THREE.InstancedMesh(gb.build(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }), W.cars);
      this.cars.frustumCulled = false;
      const pal = [0xff5c95, 0x37b8ff, 0xffd24a, 0x2fb7b0, 0xe0403a, 0xb45cff];
      const tc = new THREE.Color();
      for (let i = 0; i < W.cars; i++) this.cars.setColorAt(i, tc.set(pal[i % pal.length]));
      game.scene.add(this.cars);
      // The Riptide's train: four cars.
      const path = coasterPath();
      this.n = path.length;
      this.px = new Float32Array(this.n);
      this.py = new Float32Array(this.n);
      this.pz = new Float32Array(this.n);
      let top = 0;
      path.forEach((p, i) => {
        this.px[i] = p.x;
        this.py[i] = p.y;
        this.pz[i] = p.z;
        if (p.y > top) {
          top = p.y;
          this.topIndex = i;
        }
      });
      this.top = top;
      const tb = new VH.GeometryBuilder({});
      tb.box(-0.75, 0.55, -1.3, 0.75, 1.15, 1.3, white);
      tb.box(-0.75, 1.15, -1.3, 0.75, 1.6, -1.0, white);
      tb.box(-0.75, 1.15, 0.0, 0.75, 1.5, 0.25, white);
      tb.box(-0.8, 0.45, -1.35, 0.8, 0.6, 1.35, VH.col(0x2a2d33));
      this.train = new THREE.InstancedMesh(tb.build(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 }), 4);
      this.train.frustumCulled = false;
      for (let i = 0; i < 4; i++) this.train.setColorAt(i, tc.set(i % 2 ? 0xffd24a : 0x2fb7b0));
      game.scene.add(this.train);
      // The Skyhook's ring of seats.
      const rb = new VH.GeometryBuilder({});
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        const cx = Math.cos(a) * 2.6, cz = Math.sin(a) * 2.6;
        rb.box(cx - 0.45, 0, cz - 0.45, cx + 0.45, 0.5, cz + 0.45, VH.col(k % 2 ? 0xffd24a : 0x2fb7b0));
        rb.box(cx * 1.25 - 0.4, 0.5, cz * 1.25 - 0.4, cx * 1.25 + 0.4, 1.6, cz * 1.25 + 0.4, VH.col(0x2a2d33));
      }
      rb.box(-1.6, -0.2, -1.6, 1.6, 0.6, 1.6, VH.col(0x9aa1a8));
      this.ring = new THREE.Mesh(rb.build(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }));
      this.ring.position.set(TOWER.x, KERB + 1, TOWER.z);
      game.scene.add(this.ring);
      this.dropT = 0;
      this.s = 0;
      this.v = 3;
      this.angle = 0;
      this._m = new THREE.Matrix4();
      this._p = new THREE.Vector3();
      this._t = new THREE.Vector3();
      this._q = new THREE.Quaternion();
      this._e = new THREE.Euler(0, W.yaw, 0);
      this._one = new THREE.Vector3(1, 1, 1);
      this._up = new THREE.Vector3(0, 1, 0);
      this._q.setFromEuler(this._e);
      this.visible = true;
      this.update(0);
    }

    update(dt) {
      if (!this.ok) return;
      const cam = this.game.renderer.camera.position;
      const far = Math.hypot(cam.x - WHEEL.x, cam.z - WHEEL.z) > 1500;
      if (far === this.visible) {
        this.visible = !far;
        this.group.visible = this.cars.visible = this.train.visible = this.ring.visible = this.visible;
      }
      if (!this.visible) return;
      const W = WHEEL;
      this.angle = (this.angle + dt * W.speed) % (Math.PI * 2);
      this.spin.rotation.z = this.angle;
      const ca = Math.cos(W.yaw), sa = Math.sin(W.yaw);
      for (let i = 0; i < W.cars; i++) {
        const a = this.angle + (i / W.cars) * Math.PI * 2;
        const lx = Math.cos(a) * W.r, ly = Math.sin(a) * W.r;
        this._p.set(W.x + lx * ca, W.hub + ly, W.z - lx * sa);
        this._m.compose(this._p, this._q, this._one);
        this.cars.setMatrixAt(i, this._m);
      }
      this.cars.instanceMatrix.needsUpdate = true;
      // The train: slow up the lift hill, then it runs on what height it has left.
      const n = this.n;
      const i0 = Math.floor(this.s) % n;
      const lift = i0 > 12 && i0 < this.topIndex;
      const target = lift ? 3.2 : Math.max(4, Math.sqrt(2 * 9.8 * Math.max(0, this.top + 1.5 - this.py[i0])));
      this.v += (target - this.v) * Math.min(1, dt * 2.5);
      this.s = (this.s + this.v * dt) % n;
      for (let c = 0; c < 4; c++) {
        let s = this.s - c * 3;
        if (s < 0) s += n;
        const a = Math.floor(s) % n, b = (a + 1) % n, f = s - Math.floor(s);
        const nb = (a + 3) % n;
        this._p.set(this.px[a] + (this.px[b] - this.px[a]) * f, this.py[a] + (this.py[b] - this.py[a]) * f, this.pz[a] + (this.pz[b] - this.pz[a]) * f);
        this._t.set(this.px[nb], this.py[nb], this.pz[nb]);
        this._m.lookAt(this._t, this._p, this._up);
        this._m.setPosition(this._p);
        this.train.setMatrixAt(c, this._m);
      }
      this.train.instanceMatrix.needsUpdate = true;
      // The Skyhook: 14 s up, 3 s at the top, a 2 s fall, 5 s to load.
      this.dropT = (this.dropT + dt) % 24;
      const t = this.dropT, lo = KERB + 1, hi = TOWER.h - 7;
      let y = lo;
      if (t < 14) y = lo + (hi - lo) * (0.5 - 0.5 * Math.cos((t / 14) * Math.PI));
      else if (t < 17) y = hi;
      else if (t < 19) y = Math.max(lo, hi - 0.5 * 26 * (t - 17) * (t - 17));
      this.ring.position.y = y;
    }

    stop() {}
    reset() {}
  }

  // -------------------------------------------------------------- register
  VH.Districts.register({
    id: 'neonstrand',
    name: 'the Neon Strand',
    plots: ['wonder_wharf', 'paloma_convention'],
    build(world, layout) {
      const t0 = performance.now();
      const P = layout.plots || {};
      if (P.wonder_wharf) {
        buildWharf(world, P.wonder_wharf);
        world.wonderWharf = { wheel: WHEEL, grabber: GRABBER };
      }
      if (P.paloma_convention) buildConvention(world, P.paloma_convention);
      buildStrand(world, layout);
      buildBridges(world);
      this.buildMs = Math.round(performance.now() - t0);
    },
    registerPlaces(world, places) {
      const D = 'neonstrand';
      const add = (id, p) => {
        const def = places.defs && places.defs[id];
        places.add(id, Object.assign({ district: D, desc: def && def.desc }, p));
      };
      // The landmarks, somewhere better than the middle of a pavement.
      add('wonder_wharf', { name: 'Wonder Wharf', x: 890, z: -38, yaw: 0, kind: 'funfair', landmark: true });
      add('paloma_convention', { name: 'Paloma Convention Centre', x: 1086, z: -84, yaw: Math.PI, kind: 'hall', landmark: true });
      // The story's own spots here (docs/DLC_BIBLE.md 6.2): exactly where their descriptions say.
      add('golden_grabber', { name: 'The Golden Grabber, Arcade Row', x: GRABBER.x + 2.6, z: GRABBER.z, yaw: -Math.PI / 2, kind: 'storefront' });
      add('convention_dock', { name: 'Convention Centre loading dock', x: 1067.5, z: -262, yaw: 0, kind: 'warehouse' });
      add('strand_checkpoint', { name: 'The Neon Strand', x: 1236, z: -70.6, yaw: 0, kind: 'street' });
      add('bridge_island_end', { name: 'Paloma Bridge, island end', x: 786, z: -279.6, yaw: -Math.PI / 2, kind: 'street' });
      const pal = world.castellanePalace;
      if (pal) {
        add('castellane_palace', { name: 'The Castellane Palace', x: pal.door.x - 3, z: pal.door.z - 2, yaw: 0, kind: 'storefront' });
        if (pal.court && places.usedLots) places.usedLots.add(pal.court); // its forecourt is not a car park for story scenes
      }
      // Spots for the other kinds a story may ask for on the Strand.
      const extra = places.extra[D];
      if (extra) {
        extra.push(
          { x: 849, z: 102, yaw: Math.PI / 2, kinds: ['arcade', 'storefront', 'club'], name: 'Arcade Row' },
          { x: 920, z: 140, yaw: -Math.PI / 2, kinds: ['park', 'fair', 'boardwalk'], name: 'The Riptide' },
          { x: 862, z: 40, yaw: -Math.PI / 2, kinds: ['park', 'overlook', 'fair'], name: 'The Wonder Wheel' },
          { x: 813, z: 128, yaw: Math.PI / 2, kinds: ['diner', 'storefront'], name: 'Wonder Wharf food stalls' },
          { x: 786, z: 60, yaw: -Math.PI / 2, kinds: ['boardwalk', 'pier', 'overlook'], name: 'Bayfront Drive seawall' },
          { x: 1040, z: -49, yaw: 0, kinds: ['club', 'bar'], name: 'Solstice' },
          { x: 1218, z: -71, yaw: Math.PI, kinds: ['club', 'bar'], name: 'Moonwave' },
          { x: 1112, z: -128, yaw: Math.PI, kinds: ['plaza', 'street', 'corner'], name: 'Convention Centre forecourt' },
          { x: 1128, z: -256, yaw: 0, kinds: ['parking', 'alley', 'warehouse'], name: 'Behind the Convention Centre' },
          { x: 840, z: -49, yaw: Math.PI / 2, kinds: ['corner', 'street'], name: 'The Strand at Bayfront Drive' },
        );
      }
    },
    System: WharfLife,
  });
})();
