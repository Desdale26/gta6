/*
 * districts/oldpaloma.js — Old Paloma, the old town at the south end of Isla
 * Paloma (VICEHAVEN 3.0).
 *
 *   paloma_fort      Fort San Paloma on the tip of the spur: limestone
 *                    curtain walls with a walkable rampart (stone stairs up
 *                    from the courtyard, merlons, sentry boxes on the four
 *                    bastions, cannons), the landward gate and its cobbled
 *                    ramp off Harbour Street, the museum in the old barracks,
 *                    THE LIGHTHOUSE (a spiral stair up the tower to the
 *                    gallery; the lamp turns at night) with the keeper's
 *                    cottage and its blue door, and THE POWDER STORE: an arch
 *                    in the seaward wall, bricked up until the story blows it
 *                    open (OldPalomaLife). Outside the walls, the old fort
 *                    quay on the point.
 *
 * Everything static draws into the chunk builders (VH.WNKit / VH.SouthKit
 * helpers); the moving parts (the lamp, the bricks) are a few meshes in
 * OldPalomaLife.
 */
(function () {
  'use strict';

  const VH = window.VH;
  const KERB = 0.15;
  const D = 'oldpaloma';
  const PI = Math.PI;
  const F = () => VH.COLLIDE;
  const K = () => VH.WNKit;
  const S = () => VH.SouthKit;
  const col = (h) => (Array.isArray(h) ? h : VH.col(h));
  // The concrete texture is mid-grey: stone drawn on it gets its colour lifted to read as pale limestone.
  const sc = (h) => (Array.isArray(h) ? h : VH.col(h, 1.6));
  const colFor = (surf, h) => (surf === 'concrete' ? sc(h) : col(h));

  // ---------------------------------------------------------------- plan
  // Fort San Paloma: plot 987..1157 x 427..837 (the shore is z 840 and x 1160).
  const FORT = {
    x0: 1012, x1: 1132, z0: 590, z1: 770, // the curtain wall's outer line
    t: 6, tS: 10, // wall thickness; the seaward (south) wall holds the casemates
    h: 8,
    bast: 12, // bastion half size (a diamond on each corner)
    gate: { x: 1072, w: 7, h: 5 },
    light: { x: 1112, z: 744, r: 3.6, gallery: 20, shaft: 22.6 },
    cottage: { x0: 1092, x1: 1109, z0: 738, z1: 750, h: 3.6, door: 1100, win: 1095.5 },
    powder: { x: 1060, w: 4.4, spring: 2.4, depth: 8, brick: 2.4 },
    museum: { x0: 1018, x1: 1034, z0: 622, z1: 704, h: 6.6 },
  };
  const TOP = KERB + FORT.h;
  const STONE = 0xd8c8a6;
  const STONE_DK = 0xb9a682;
  const STONE_LT = 0xe8dcc0;
  const COBBLE = 0xc9b48e;
  const TERRACOTTA = 0xa4553c;
  const WHITEWASH = 0xf3eee2;
  const BLUE_DOOR = 0x2a62b8;

  // ----------------------------------------------------------- helpers
  const CH = 192, OR = -768;
  /** Split [a0, a1] on the chunk grid. */
  function cuts(a0, a1) {
    const out = [];
    let a = a0;
    while (a < a1 - 1e-6) {
      const edge = OR + (Math.floor((a - OR) / CH) + 1) * CH;
      const b = Math.min(a1, edge);
      out.push([a, b]);
      a = b;
    }
    return out;
  }
  /** A box drawn into `surf` of the chunk(s) it stands in (cut on the grid), no collider. */
  function draw(world, surf, x0, y0, z0, x1, y1, z1, hex, opts) {
    const c = colFor(surf, hex);
    for (const [xa, xb] of cuts(x0, x1)) for (const [za, zb] of cuts(z0, z1)) world.ctxAt((xa + xb) / 2, (za + zb) / 2)[surf].box(xa, y0, za, xb, y1, zb, c, opts);
  }
  /** A box drawn and solid; the collider starts at the ground for anything standing on the slab. */
  function sbox(world, surf, x0, y0, z0, x1, y1, z1, hex, tag, opts, flags) {
    draw(world, surf, x0, y0, z0, x1, y1, z1, hex, opts);
    return world.physics.addBox(x0, y0 <= KERB + 0.01 ? 0 : y0, z0, x1, y1, z1, tag || 'wall', flags === undefined ? F().ALL : flags);
  }
  /** A collider only. */
  function cbox(world, x0, y0, z0, x1, y1, z1, tag, flags) {
    return world.physics.addBox(Math.min(x0, x1), y0, Math.min(z0, z1), Math.max(x0, x1), y1, Math.max(z0, z1), tag || 'wall', flags === undefined ? F().ALL : flags);
  }
  /** An oriented box drawn and solid. */
  function sobox(world, surf, cx, cz, hx, hz, yaw, y0, y1, hex, tag, flags) {
    world.ctxAt(cx, cz)[surf].orientedBox(cx, cz, hx, hz, yaw, y0, y1, colFor(surf, hex));
    return world.physics.addOrientedBox(cx, cz, hx, hz, yaw, y0 <= KERB + 0.01 ? 0 : y0, y1, tag || 'wall', flags === undefined ? F().ALL : flags);
  }
  /** A flat surface on the slab, cut on the chunk grid. */
  function pave(world, x0, z0, x1, z1, hex, surf, y, uv) {
    K().pave(world, x0, z0, x1, z1, hex, surf || 'plazaTop', y, uv);
  }
  /** A glowing box (lamps, lit windows): bright at night. */
  function glow(world, x0, y0, z0, x1, y1, z1, hex, mul) {
    world.ctxAt((x0 + x1) / 2, (z0 + z1) / 2).screen.box(x0, y0, z0, x1, y1, z1, VH.col(hex, mul || 2), { bottom: true });
  }
  /** A lantern on a wall bracket facing (nx, nz), at height y. */
  function wallLantern(world, x, y, z, nx, nz) {
    const ctx = world.ctxAt(x, z);
    const bx = x + nx * 0.35, bz = z + nz * 0.35;
    ctx.prop.box(Math.min(x, bx) - 0.04, y + 0.45, Math.min(z, bz) - 0.04, Math.max(x, bx) + 0.04, y + 0.52, Math.max(z, bz) + 0.04, VH.col(0x2a2a2a), { bottom: true });
    ctx.prop.box(bx - 0.16, y + 0.42, bz - 0.16, bx + 0.16, y + 0.5, bz + 0.16, VH.col(0x2a2a2a), { bottom: true });
    glow(world, bx - 0.12, y - 0.05, bz - 0.12, bx + 0.12, y + 0.42, bz + 0.12, 0xffd890, 2.4);
  }
  /** A row of merlons along a parapet top from (ax, az) to (bx, bz): teeth `w` wide every `step`. */
  function merlons(world, ax, az, bx, bz, y, th, hex) {
    const len = Math.hypot(bx - ax, bz - az);
    const n = Math.max(1, Math.floor(len / 2.4));
    const ux = (bx - ax) / len, uz = (bz - az) / len;
    const yaw = Math.atan2(-uz, ux); // local x along the line
    const c = sc(hex);
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) * (len / n);
      const mx = ax + ux * t, mz = az + uz * t;
      world.ctxAt(mx, mz).concrete.orientedBox(mx, mz, 0.7, th / 2, yaw, y, y + 0.8, c);
    }
    // One collider for the row (the gaps between teeth are too narrow to step through).
    const mx = (ax + bx) / 2, mz = (az + bz) / 2;
    world.physics.addOrientedBox(mx, mz, len / 2, th / 2, yaw, y, y + 0.8, 'wall', F().ALL);
  }
  /** A parapet (solid) along a line, `th` thick, its outer face on the line, plus merlons. */
  function parapet(world, ax, az, bx, bz, y, h, th, hex, teeth) {
    const len = Math.hypot(bx - ax, bz - az);
    const ux = (bx - ax) / len, uz = (bz - az) / len;
    const yaw = Math.atan2(-uz, ux);
    const cx = (ax + bx) / 2, cz = (az + bz) / 2;
    world.ctxAt(cx, cz).concrete.orientedBox(cx, cz, len / 2, th / 2, yaw, y, y + h, sc(hex));
    world.physics.addOrientedBox(cx, cz, len / 2, th / 2, yaw, y, y + h, 'wall', F().ALL);
    if (teeth) merlons(world, ax, az, bx, bz, y + h, th, hex);
  }

  /**
   * A straight stone stair against a wall (WNKit.stairs: a ramp collider under
   * drawn steps), with a stepped parapet on its open side drawn exactly as its
   * colliders, and a parapet across its top end.
   */
  function wallStair(world, x, z, dir, len, w, y0, y1, openSide) {
    const ctx = world.ctxAt(x, z);
    K().stairs(world, ctx.concrete, x, z, dir, len, w, y0, y1, sc(STONE_LT), { rails: false, tag: 'stairs' });
    const dx = dir === 'e' ? 1 : dir === 'w' ? -1 : 0;
    const dz = dir === 's' ? 1 : dir === 'n' ? -1 : 0;
    // The open side: +1 = right of the direction of travel... given as the offset sign across the stair.
    const ox = dx ? 0 : openSide, oz = dz ? 0 : openSide;
    const seg = 1.0;
    const n = Math.ceil(len / seg);
    for (let i = 0; i < n; i++) {
      const a0 = i * seg, a1 = Math.min(len, (i + 1) * seg);
      const yTop = y0 + ((y1 - y0) * a1) / len + 1.0;
      const px0 = x + dx * a0 + ox * (w / 2), pz0 = z + dz * a0 + oz * (w / 2);
      const px1 = x + dx * a1 + ox * (w / 2 + 0.35), pz1 = z + dz * a1 + oz * (w / 2 + 0.35);
      sbox(world, 'concrete', Math.min(px0, px1), KERB, Math.min(pz0, pz1), Math.max(px0, px1), yTop, Math.max(pz0, pz1), STONE, 'wall');
    }
    // Across the top end, so nobody walks off it.
    const ex = x + dx * len, ez = z + dz * len;
    if (dx) sbox(world, 'concrete', Math.min(ex, ex + dx * 0.35), KERB, Math.min(z - w / 2, z + oz * (w / 2 + 0.35)), Math.max(ex, ex + dx * 0.35), y1 + 1.0, Math.max(z + w / 2, z + oz * (w / 2 + 0.35)), STONE, 'wall');
    else sbox(world, 'concrete', Math.min(x - w / 2, x + ox * (w / 2 + 0.35)), KERB, Math.min(ez, ez + dz * 0.35), Math.max(x + w / 2, x + ox * (w / 2 + 0.35)), y1 + 1.0, Math.max(ez, ez + dz * 0.35), STONE, 'wall');
  }

  /** A cannon on its carriage pointing along yaw (a = sin, cos), solid. */
  function cannon(world, x, y, z, yaw) {
    const ctx = world.ctxAt(x, z);
    const fx = Math.sin(yaw), fz = Math.cos(yaw);
    ctx.wood.orientedBox(x, z, 0.55, 0.9, -yaw, y, y + 0.55, VH.col(0x6b4a2e));
    for (const s of [-1, 1]) {
      // Wheels (short cylinders lying on their side would cost more: a pair of discs as boxes).
      const wx = x + Math.cos(yaw) * s * 0.62, wz = z - Math.sin(yaw) * s * 0.62;
      ctx.wood.orientedBox(wx, wz, 0.07, 0.38, -yaw, y, y + 0.7, VH.col(0x4a3220));
    }
    const len = 2.4;
    const bx = x + fx * len * 0.55, bz = z + fz * len * 0.55;
    K().beam(ctx.prop, x - fx * 0.6, y + 0.75, z - fz * 0.6, bx, y + 0.78, bz, 0.42, VH.col(0x2b2d2f));
    ctx.prop.cylinder(x - fx * 0.75, y + 0.55, z - fz * 0.75, 0.24, 0.24, 0.4, 6, VH.col(0x2b2d2f), true);
    world.physics.addOrientedBox(x + fx * 0.16, z + fz * 0.16, 0.69, 1.16, -yaw, y, y + 1.0, 'metal', F().ALL);
  }

  /** A sentry box (garita): a little stone drum with a dome, lookout slits. */
  function garita(world, x, y, z) {
    const ctx = world.ctxAt(x, z);
    ctx.concrete.cylinder(x, y, z, 1.05, 1.05, 2.3, 10, sc(STONE_LT), false);
    ctx.concrete.cylinder(x, y + 2.3, z, 1.25, 1.25, 0.25, 10, sc(STONE), true);
    ctx.concrete.cylinder(x, y + 2.55, z, 1.1, 0.15, 1.1, 10, sc(STONE_LT), false);
    ctx.concrete.cylinder(x, y + 3.65, z, 0.18, 0.02, 0.5, 6, sc(STONE), false);
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * PI * 2 + PI / 4;
      const sx = x + Math.cos(a) * 1.06, sz = z + Math.sin(a) * 1.06;
      ctx.prop.box(sx - 0.08, y + 1.5, sz - 0.08, sx + 0.08, y + 2.0, sz + 0.08, VH.col(0x1d1a16));
    }
    S().disc(world, x, z, 1.05, y, y + 2.55, 'wall');
  }

  // ---------------------------------------------------------- the fort
  function buildFort(world) {
    const Fo = FORT;
    const g = Fo.gate;
    const ctxF = world.ctxAt(1072, 680);

    // --- the forecourt: cobbles, the approach, a car park, lawns
    pave(world, 990, 430, 1154, 586, COBBLE, 'plazaTop', KERB + 0.012, 3);
    // The cobbled ramp (the approach): darker setts in a broad band from Harbour Street to the gate.
    pave(world, g.x - 7, 430, g.x + 7, 586, 0x9a8462, 'plazaTop', KERB + 0.03, 2);
    for (let z = 434; z < 584; z += 6) K().mark(world, g.x - 7, z, g.x + 7, z + 0.25, 0xd8c8a6, KERB + 0.04);
    // Car park, west of the approach.
    pave(world, 994, 438, 1052, 520, 0x55585c, 'asphaltTop', KERB + 0.03, 6);
    for (let x = 998; x <= 1048; x += 3) {
      K().mark(world, x, 444, x + 0.12, 449, 0xf4f4ef, KERB + 0.04);
      K().mark(world, x, 509, x + 0.12, 514, 0xf4f4ef, KERB + 0.04);
    }
    // Lawns east of the approach and round the walls, palms on them.
    pave(world, 1092, 440, 1150, 520, 0xffffff, 'grassTop', KERB + 0.02, 6);
    world.addLawn(1092, 440, 1150, 520);
    for (const [px, pz] of [[1098, 446], [1144, 446], [1098, 514], [1144, 514], [1121, 480]]) world.addProp('palmTall', px, KERB + 0.02, pz, (px * 7) % 6, 1);
    for (const [px, pz] of [[1060, 440], [1084, 440], [1060, 470], [1084, 470], [1060, 500], [1084, 500], [1060, 530], [1084, 530], [1060, 560], [1084, 560]]) world.addProp('streetlight', px, KERB, pz, px < g.x ? PI / 2 : -PI / 2, 1);
    // Stone bollards along the approach (props: instanced, solid).
    for (let z = 446; z < 580; z += 8) for (const x of [g.x - 7.6, g.x + 7.6]) world.addProp('bollard', x, KERB, z, 0, 1);
    // A display of old guns on the lawn.
    for (const [cx, cz, a] of [[1112, 492, PI], [1124, 492, PI], [1136, 492, PI]]) {
      sbox(world, 'concrete', cx - 1.2, KERB, cz - 1.6, cx + 1.2, KERB + 0.45, cz + 1.6, STONE_DK, 'wall');
      cannon(world, cx, KERB + 0.45, cz, a);
    }
    // The ticket kiosk by the entrance, and the name board on Harbour Street.
    sbox(world, 'concrete', g.x + 10, KERB, 432, g.x + 15, KERB + 2.9, 437, WHITEWASH, 'building');
    sbox(world, 'prop', g.x + 9.6, KERB + 2.9, 431.6, g.x + 15.4, KERB + 3.15, 437.4, TERRACOTTA, 'building');
    glow(world, g.x + 9.98, KERB + 1.1, 433, g.x + 10.02, KERB + 2.1, 436, 0xfff0c8, 1.6);
    K().sign(world, { x: g.x - 12, y: KERB + 2.1, z: 433, yaw: 0, w: 7, h: 2.2, posts: true, lines: ['FORT SAN PALOMA', 'Built 1714 · Museum · Lighthouse'], style: 'welcome' });

    // --- the curtain walls (stone, a plinth course, a walkable rampart)
    const wallBox = (x0, z0, x1, z1) => {
      sbox(world, 'concrete', x0, KERB, z0, x1, TOP, z1, STONE, 'wall', { uvScale: 4 });
    };
    // North wall with the gate: two runs and the lintel over the passage.
    wallBox(Fo.x0, Fo.z0, g.x - g.w / 2, Fo.z0 + Fo.t);
    wallBox(g.x + g.w / 2, Fo.z0, Fo.x1, Fo.z0 + Fo.t);
    sbox(world, 'concrete', g.x - g.w / 2, KERB + g.h, Fo.z0, g.x + g.w / 2, TOP, Fo.z0 + Fo.t, STONE, 'wall', { bottom: true });
    // A plinth course along the foot of the outer faces (solid) and a cordon (a rounded band) under the parapet.
    const r0 = Fo.bast * Math.SQRT2;
    const course = (x0, z0, x1, z1, y0, y1, hex, solid) => (solid ? sbox(world, 'concrete', x0, y0, z0, x1, y1, z1, hex, 'wall') : draw(world, 'concrete', x0, y0, z0, x1, y1, z1, hex, { bottom: true }));
    for (const [y0, y1, out, solid] of [[KERB, KERB + 1.2, 0.35, true], [TOP - 1.0, TOP - 0.7, 0.22, false]]) {
      course(Fo.x0 + r0, Fo.z0 - out, g.x - 11, Fo.z0, y0, y1, STONE_DK, solid);
      course(g.x + 11, Fo.z0 - out, Fo.x1 - r0, Fo.z0, y0, y1, STONE_DK, solid);
      course(Fo.x0 - out, Fo.z0 + r0, Fo.x0, Fo.z1 - r0, y0, y1, STONE_DK, solid);
      course(Fo.x1, Fo.z0 + r0, Fo.x1 + out, Fo.z1 - r0, y0, y1, STONE_DK, solid);
      course(Fo.x0 + r0, Fo.z1, Fo.x1 - r0, Fo.z1 + out, y0, y1, STONE_DK, solid);
    }
    // West and east walls.
    wallBox(Fo.x0, Fo.z0 + Fo.t, Fo.x0 + Fo.t, Fo.z1 - Fo.tS);
    wallBox(Fo.x1 - Fo.t, Fo.z0 + Fo.t, Fo.x1, Fo.z1 - Fo.tS);
    // South wall, with the powder store's vault in it.
    const P = Fo.powder;
    const pz0 = Fo.z1 - Fo.tS; // inner face
    const px0 = P.x - P.w / 2, px1 = P.x + P.w / 2;
    const vaultTop = KERB + P.spring + P.w / 2; // crown of the arch
    wallBox(Fo.x0, pz0, px0, Fo.z1);
    wallBox(px1, pz0, Fo.x1, Fo.z1);
    sbox(world, 'concrete', px0, KERB, pz0 + P.depth, px1, TOP, Fo.z1, STONE, 'wall'); // the vault's back wall
    sbox(world, 'concrete', px0, vaultTop, pz0, px1, TOP, pz0 + P.depth, STONE, 'wall', { bottom: true }); // over the vault
    // Inside the vault: a dark plastered barrel, a stone floor.
    const ctxP = world.ctxAt(P.x, pz0 + 4);
    ctxP.interior.box(px0 + 0.02, KERB, pz0 + 0.5, px0 + 0.1, vaultTop - 0.02, pz0 + P.depth - 0.02, VH.col(0x4a4238));
    ctxP.interior.box(px1 - 0.1, KERB, pz0 + 0.5, px1 - 0.02, vaultTop - 0.02, pz0 + P.depth - 0.02, VH.col(0x4a4238));
    ctxP.interior.box(px0 + 0.02, KERB, pz0 + P.depth - 0.1, px1 - 0.02, vaultTop - 0.02, pz0 + P.depth - 0.02, VH.col(0x3d362e));
    ctxP.interior.box(px0, vaultTop - 0.12, pz0 + 0.02, px1, vaultTop - 0.02, pz0 + P.depth, VH.col(0x3d362e), { bottom: true });
    ctxP.plazaTop.topRect(px0, pz0, px1, pz0 + P.depth, KERB + 0.01, VH.col(0x8d826c), 2);
    // The arch on the wall face: voussoirs round a semicircle, the spandrels filled.
    const ar = P.w / 2, ay = KERB + P.spring;
    for (let k = 0; k < 9; k++) {
      const a0 = (k / 9) * PI, a1 = ((k + 1) / 9) * PI;
      const am = (a0 + a1) / 2;
      const vx = P.x + Math.cos(am) * (ar + 0.25), vy = ay + Math.sin(am) * (ar + 0.25);
      K().tiltBox(ctxP.concrete, vx, vy, pz0 - 0.1, 0.62, 0.5, 0.3, 0, 0, sc(STONE_LT));
      // Spandrel: from the arch's curve up to the crown height, on the face.
      const sx = P.x + Math.cos(am) * ar;
      const sy = ay + Math.sin(am) * ar;
      const sw = (Math.cos(a0) - Math.cos(a1)) * ar;
      if (sy < vaultTop - 0.05) ctxP.concrete.box(Math.min(sx - sw / 2, sx + sw / 2), sy, pz0 - 0.02, Math.max(sx - sw / 2, sx + sw / 2), vaultTop, pz0 + 0.3, sc(STONE), { bottom: true });
    }
    // Jambs (a lighter dressed stone each side of the opening).
    ctxP.concrete.box(px0 - 0.4, KERB, pz0 - 0.08, px0, ay, pz0 + 0.02, sc(STONE_LT));
    ctxP.concrete.box(px1, KERB, pz0 - 0.08, px1 + 0.4, ay, pz0 + 0.02, sc(STONE_LT));
    world.ctxAt(P.x, pz0).prop.box(P.x - 1.4, vaultTop + 0.5, pz0 - 0.06, P.x + 1.4, vaultTop + 1.1, pz0 - 0.02, VH.col(0x8a7a5e)); // carved date panel
    // The bricks (a mesh of their own, so the story can take them away) and their collider.
    const bz0 = pz0 + P.brick, bz1 = bz0 + 0.5;
    const bricks = new VH.GeometryBuilder({});
    const brickC = [0xa0563e, 0x8f4a35, 0xb06246];
    for (let r = 0, y = KERB; y < vaultTop - 0.01; r++, y += 0.3) {
      // The courses get shorter up the arch (it's round): row width from the arch at that height.
      const yy = Math.min(vaultTop, y + 0.3);
      const hy = Math.max(0, yy - ay);
      const half = yy <= ay ? ar : Math.sqrt(Math.max(0, ar * ar - hy * hy));
      const off = r % 2 ? 0.35 : 0;
      for (let x = P.x - half - off; x < P.x + half; x += 0.7) {
        const xa = Math.max(P.x - half, x), xb = Math.min(P.x + half, x + 0.68);
        if (xb - xa < 0.05) continue;
        bricks.box(xa, y, bz0, xb, yy - 0.02, bz1, VH.col(brickC[(r * 7 + Math.round(x * 3)) % 3]));
      }
    }
    const brickMesh = new THREE.Mesh(bricks.build(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }));
    brickMesh.name = 'powder store bricks';
    brickMesh.castShadow = true;
    brickMesh.receiveShadow = true;
    ctxP.chunk.group.add(brickMesh);
    const brickCol = world.physics.addBox(px0, 0, bz0, px1, vaultTop, bz1, 'wall', F().ALL);
    // Lanterns either side of the arch.
    wallLantern(world, px0 - 1.2, KERB + 3.0, pz0 - 0.02, 0, -1);
    wallLantern(world, px1 + 1.2, KERB + 3.0, pz0 - 0.02, 0, -1);
    // A plaque over the arch.
    K().sign(world, { x: P.x, y: vaultTop + 1.9, z: pz0 - 0.12, yaw: PI, w: 3.4, h: 0.8, lines: ['POWDER STORE', 'Polvorín · 1714'], style: 'plaque' });

    // --- the bastions: a stone diamond on each corner, sentry boxes, parapets
    const b = Fo.bast;
    const r = b * Math.SQRT2;
    for (const [cx, cz, sx, sz] of [[Fo.x0, Fo.z0, -1, -1], [Fo.x1, Fo.z0, 1, -1], [Fo.x0, Fo.z1, -1, 1], [Fo.x1, Fo.z1, 1, 1]]) {
      sobox(world, 'concrete', cx, cz, b, b, PI / 4, KERB, TOP, STONE, 'wall');
      sobox(world, 'concrete', cx, cz, b + 0.35, b + 0.35, PI / 4, KERB, KERB + 1.2, STONE_DK, 'wall'); // plinth course
      // The diamond's vertices, and its three outer edges get parapets.
      const E = [cx + sx * r, cz], N = [cx, cz + sz * r], Wv = [cx - sx * r, cz], Sv = [cx, cz - sz * r];
      // E-N is the salient face; Wv-N runs outside the wall along it; Sv-E likewise.
      const inset = (p, q, k) => [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k];
      const ctr = [cx, cz];
      const pin = (p) => inset(p, ctr, 0.6 / r);
      parapet(world, ...pin(E), ...pin(N), TOP, 1.1, 0.7, STONE, true);
      parapet(world, ...pin(N), ...pin(Wv), TOP, 1.1, 0.7, STONE, true);
      parapet(world, ...pin(Sv), ...pin(E), TOP, 1.1, 0.7, STONE, true);
      // The sentry box on the salient (the middle of the E-N face, set in a little).
      const mx = (E[0] + N[0]) / 2, mz = (E[1] + N[1]) / 2;
      garita(world, mx - sx * 1.6, TOP, mz - sz * 1.6);
      // Two guns on each bastion, looking out over the salient's faces.
      cannon(world, cx + sx * 4, TOP, cz + sz * 4, Math.atan2(sx, sz));
    }

    // --- the rampart: parapets with merlons on the outer edges, a lip on the inner edges
    const outer = (ax, az, bx, bz) => parapet(world, ax, az, bx, bz, TOP, 1.1, 0.7, STONE, true);
    const lip = (x0, z0, x1, z1) => sbox(world, 'concrete', x0, TOP, z0, x1, TOP + 0.6, z1, STONE_LT, 'wall', { bottom: false });
    // North (outer face z0), leaving the bastions' ends; the gate towers stand over the passage.
    outer(Fo.x0 + r, Fo.z0 + 0.35, g.x - 11, Fo.z0 + 0.35);
    outer(g.x + 11, Fo.z0 + 0.35, Fo.x1 - r, Fo.z0 + 0.35);
    outer(Fo.x0 + 0.35, Fo.z0 + r, Fo.x0 + 0.35, Fo.z1 - r);
    outer(Fo.x1 - 0.35, Fo.z0 + r, Fo.x1 - 0.35, Fo.z1 - r);
    outer(Fo.x0 + r, Fo.z1 - 0.35, Fo.x1 - r, Fo.z1 - 0.35);
    // Inner lips, open where the stairs come up.
    const st = { nw: [g.x - 26, g.x - 20], ne: [g.x + 20, g.x + 26], s: [1084, 1090] };
    const zi = Fo.z0 + Fo.t;
    lip(Fo.x0 + Fo.t + 6, zi - 0.4, st.nw[0], zi);
    lip(st.nw[1], zi - 0.4, st.ne[0], zi);
    lip(st.ne[1], zi - 0.4, Fo.x1 - Fo.t - 6, zi);
    lip(Fo.x0 + Fo.t - 0.4, Fo.z0 + Fo.t + 6, Fo.x0 + Fo.t, Fo.z1 - Fo.tS - 6);
    lip(Fo.x1 - Fo.t, Fo.z0 + Fo.t + 6, Fo.x1 - Fo.t + 0.4, Fo.z1 - Fo.tS - 6);
    lip(Fo.x0 + Fo.t + 6, pz0, st.s[0], pz0 + 0.4);
    lip(st.s[1], pz0, Fo.x1 - Fo.t - 6, pz0 + 0.4);

    // --- the gatehouse: two towers flanking the passage, a lantern each side, the arms over the arch
    const gx0 = g.x - g.w / 2, gx1 = g.x + g.w / 2;
    for (const [tx0, tx1] of [[gx0 - 7, gx0], [gx1, gx1 + 7]]) {
      sbox(world, 'concrete', tx0, KERB, Fo.z0 - 6, tx1, TOP + 2.6, Fo.z0 + 0.5, STONE_LT, 'wall', { uvScale: 4 });
      sbox(world, 'concrete', tx0 - 0.3, KERB, Fo.z0 - 6.3, tx1 + 0.3, KERB + 1.2, Fo.z0, STONE_DK, 'wall');
      merlons(world, tx0 + 0.35, Fo.z0 - 5.65, tx1 - 0.35, Fo.z0 - 5.65, TOP + 2.6, 0.7, STONE_LT);
      merlons(world, tx0 + 0.35, Fo.z0 - 5.65, tx0 + 0.35, Fo.z0 + 0.15, TOP + 2.6, 0.7, STONE_LT);
      merlons(world, tx1 - 0.35, Fo.z0 - 5.65, tx1 - 0.35, Fo.z0 + 0.15, TOP + 2.6, 0.7, STONE_LT);
      // Arrow slits.
      for (const y of [3.2, 6.4]) world.ctxAt(tx0, Fo.z0).prop.box((tx0 + tx1) / 2 - 0.12, KERB + y, Fo.z0 - 6.04, (tx0 + tx1) / 2 + 0.12, KERB + y + 1.1, Fo.z0 - 6.0, VH.col(0x1d1a16));
    }
    // The passage between the towers (they stand 6 m out from the wall): its own lintel.
    sbox(world, 'concrete', gx0, KERB + g.h, Fo.z0 - 6, gx1, TOP + 1.2, Fo.z0, STONE_LT, 'wall', { bottom: true });
    merlons(world, gx0, Fo.z0 - 5.65, gx1, Fo.z0 - 5.65, TOP + 1.2, 0.7, STONE_LT);
    world.ctxAt(g.x, Fo.z0).concrete.box(gx0 - 0.5, KERB + g.h - 0.2, Fo.z0 - 6.15, gx1 + 0.5, KERB + g.h + 0.5, Fo.z0 - 6.0, sc(STONE_DK), { bottom: true });
    // The arms: a shield on a panel over the arch.
    const ctxG = world.ctxAt(g.x, Fo.z0);
    ctxG.concrete.box(g.x - 1.3, KERB + g.h + 1.0, Fo.z0 - 6.12, g.x + 1.3, KERB + g.h + 3.4, Fo.z0 - 6.0, sc(STONE_LT), { bottom: true });
    ctxG.prop.box(g.x - 0.8, KERB + g.h + 1.3, Fo.z0 - 6.2, g.x + 0.8, KERB + g.h + 3.0, Fo.z0 - 6.1, VH.col(0x2f5f9a), { bottom: true });
    ctxG.prop.box(g.x - 0.25, KERB + g.h + 1.5, Fo.z0 - 6.25, g.x + 0.25, KERB + g.h + 2.8, Fo.z0 - 6.18, VH.col(0xd9b45a), { bottom: true });
    // The gates themselves, swung open against the passage walls (solid).
    sbox(world, 'wood', gx0, KERB, Fo.z0 + 0.5, gx0 + 0.25, KERB + g.h - 0.3, Fo.z0 + 3.9, 0x5a3a22, 'wall');
    sbox(world, 'wood', gx1 - 0.25, KERB, Fo.z0 + 0.5, gx1, KERB + g.h - 0.3, Fo.z0 + 3.9, 0x5a3a22, 'wall');
    wallLantern(world, gx0 - 7.05, KERB + 3.6, Fo.z0 - 3, -1, 0);
    wallLantern(world, gx1 + 7.05, KERB + 3.6, Fo.z0 - 3, 1, 0);
    wallLantern(world, g.x, KERB + g.h - 0.6, Fo.z0 + 0.5, 0, 1);
    K().sign(world, { x: g.x, y: KERB + g.h + 4.3, z: Fo.z0 - 6.2, yaw: PI, w: 6.4, h: 0.9, lines: ['FORT SAN PALOMA'], style: 'plaque' });

    // --- the courtyard: cobbles, a parterre, the well, the flag
    const cx0 = Fo.x0 + Fo.t, cx1 = Fo.x1 - Fo.t, cz0 = Fo.z0 + Fo.t, cz1 = pz0;
    pave(world, cx0, cz0, cx1, cz1, COBBLE, 'plazaTop', KERB + 0.012, 3);
    pave(world, g.x - 4, Fo.z0 - 6, g.x + 4, cz0, 0x9a8462, 'plazaTop', KERB + 0.03, 2);
    // The fort road: setts from the gate to the lighthouse.
    pave(world, g.x - 4, cz0, g.x + 4, 700, 0x9a8462, 'plazaTop', KERB + 0.03, 2);
    pave(world, g.x - 4, 696, 1104, 704, 0x9a8462, 'plazaTop', KERB + 0.03, 2);
    pave(world, 1096, 700, 1104, Fo.cottage.z0 - 2, 0x9a8462, 'plazaTop', KERB + 0.03, 2);
    // A lawn parterre with a low clipped hedge (solid, knee-high) east of the road.
    const L = { x0: 1086, x1: 1118, z0: 616, z1: 680 };
    pave(world, L.x0, L.z0, L.x1, L.z1, 0xffffff, 'grassTop', KERB + 0.02, 6);
    world.addLawn(L.x0, L.z0, L.x1, L.z1);
    for (const [x0, z0, x1, z1] of [[L.x0, L.z0, L.x1, L.z0 + 0.6], [L.x0, L.z1 - 0.6, L.x1, L.z1], [L.x0, L.z0, L.x0 + 0.6, L.z1], [L.x1 - 0.6, L.z0, L.x1, L.z1]]) {
      const gap = x1 - x0 > 5 ? [(x0 + x1) / 2 - 1.2, (x0 + x1) / 2 + 1.2] : null;
      if (gap) {
        sbox(world, 'hedge', x0, KERB, z0, gap[0], KERB + 0.7, z1, 0x4f7a3a, 'hedge', undefined, F().SOLID | F().CAMERA);
        sbox(world, 'hedge', gap[1], KERB, z0, x1, KERB + 0.7, z1, 0x4f7a3a, 'hedge', undefined, F().SOLID | F().CAMERA);
      } else sbox(world, 'hedge', x0, KERB, z0, x1, KERB + 0.7, z1, 0x4f7a3a, 'hedge', undefined, F().SOLID | F().CAMERA);
    }
    for (const [px, pz] of [[1094, 626], [1110, 626], [1094, 670], [1110, 670]]) world.addProp('palm', px, KERB + 0.02, pz, px % 6, 1);
    // The well, in the middle of the parterre: a stone drum, an iron hoop with a pulley.
    const wx = 1102, wz = 648;
    S().drum(world, ctxF.prop, wx, KERB, wz, 1.5, 0.95, 12, STONE_LT, 'wall');
    ctxF.prop.cylinder(wx, KERB + 0.95, wz, 1.25, 1.25, 0.02, 12, VH.col(0x1f2a33), true);
    for (const s of [-1, 1]) {
      sbox(world, 'prop', wx + s * 1.35 - 0.06, KERB + 0.95, wz - 0.06, wx + s * 1.35 + 0.06, KERB + 3.0, wz + 0.06, 0x2a2a2a, 'pole');
    }
    K().beam(ctxF.prop, wx - 1.35, KERB + 3.0, wz, wx + 1.35, KERB + 3.0, wz, 0.08, VH.col(0x2a2a2a));
    ctxF.prop.box(wx - 0.15, KERB + 2.6, wz - 0.15, wx + 0.15, KERB + 2.95, wz + 0.15, VH.col(0x6b4a2e), { bottom: true });
    // The flagpole by the museum.
    const fx = 1046, fz = 640;
    sbox(world, 'concrete', fx - 1.2, KERB, fz - 1.2, fx + 1.2, KERB + 0.6, fz + 1.2, STONE_DK, 'wall');
    sbox(world, 'prop', fx - 0.09, KERB + 0.6, fz - 0.09, fx + 0.09, KERB + 14, fz + 0.09, 0xe8e8e8, 'pole');
    ctxF.prop.box(fx + 0.1, KERB + 11.6, fz - 0.02, fx + 2.9, KERB + 13.4, fz + 0.02, VH.col(0x2f5f9a), { bottom: true });
    ctxF.prop.box(fx + 0.1, KERB + 12.3, fz - 0.03, fx + 2.9, KERB + 12.7, fz + 0.03, VH.col(0xf2d36b), { bottom: true });
    // Pyramids of shot by the guns, a cart, benches, lamps.
    for (const [sx, sz] of [[1040, 610], [1104, 610], [1040, 742]]) {
      sbox(world, 'prop', sx - 0.9, KERB, sz - 0.9, sx + 0.9, KERB + 0.35, sz + 0.9, 0x2b2d2f, 'metal');
      sbox(world, 'prop', sx - 0.6, KERB + 0.35, sz - 0.6, sx + 0.6, KERB + 0.65, sz + 0.6, 0x2b2d2f, 'metal');
      sbox(world, 'prop', sx - 0.3, KERB + 0.65, sz - 0.3, sx + 0.3, KERB + 0.95, sz + 0.3, 0x2b2d2f, 'metal');
    }
    for (const [lx, lz] of [[1062, 620], [1082, 620], [1062, 690], [1082, 712], [1050, 740], [1088, 728]]) world.addProp('streetlight', lx, KERB, lz, 0, 1);
    for (const [bx, bz, a] of [[1084, 646, -PI / 2], [1084, 660, -PI / 2], [1120, 648, PI / 2]]) world.addProp('bench', bx, KERB, bz, a, 1);
    // A handcart of old cannon balls parked by the museum.
    sbox(world, 'wood', 1038, KERB + 0.45, 714, 1040.2, KERB + 1.1, 717.6, 0x7a5532, 'crate');
    for (const s of [-1, 1]) world.ctxAt(1039, 716).wood.box(1038.9 + s * 1.15 - 0.06, KERB, 715.2, 1038.9 + s * 1.15 + 0.06, KERB + 0.9, 716.4, VH.col(0x4a3220));
    cbox(world, 1037.7, 0, 714, 1040.5, KERB + 1.1, 717.6, 'crate', F().ALL);

    // --- the rampart stairs: either side of the gate (the fort steps) and one up the seaward wall
    // Each ends (its top step) at the near side of its opening in the rampart's lip.
    wallStair(world, st.nw[0] + 14, zi + 1.5, 'w', 14, 3, KERB, TOP, 1);
    wallStair(world, st.ne[1] - 14, zi + 1.5, 'e', 14, 3, KERB, TOP, 1);
    wallStair(world, st.s[1] - 14, pz0 - 1.5, 'e', 14, 3, KERB, TOP, -1);

    // Lanterns along the courtyard's inner faces.
    for (let x = cx0 + 20; x < cx1 - 10; x += 24) if (Math.abs(x - g.x) > 8) wallLantern(world, x, KERB + 3.6, cz0 + 0.02, 0, 1);
    for (let x = cx0 + 14; x < cx1 - 10; x += 24) if (Math.abs(x - P.x) > 6) wallLantern(world, x, KERB + 3.6, cz1 - 0.02, 0, -1);
    for (let z = cz0 + 30; z < cz1 - 10; z += 26) wallLantern(world, cx1 - 0.02, KERB + 3.6, z, -1, 0);

    // --- the museum in the old barracks along the west wall, an arcade in front
    const Mu = Fo.museum;
    K().building(world, Mu.x0, Mu.z0, Mu.x1, Mu.z1, Mu.h, { wall: 0xefe4cc, roof: 0x9a8e7a, style: 1, ww: 0.45, wh: 0.6, bay: 4, floorH: 3.3, seed: 0.41, sides: { w: 'skip' } });
    // The arcade: piers and a roof slab.
    const ax0 = Mu.x1, ax1 = Mu.x1 + 3.6;
    for (let z = Mu.z0; z <= Mu.z1 + 0.01; z += 4.1) sbox(world, 'concrete', ax1 - 0.6, KERB, z - 0.3, ax1, KERB + 3.6, z + 0.3, STONE_LT, 'wall');
    sbox(world, 'concrete', ax0, KERB + 3.6, Mu.z0 - 0.3, ax1, KERB + 4.2, Mu.z1 + 0.3, STONE_LT, 'wall', { bottom: true });
    pave(world, ax0, Mu.z0, ax1, Mu.z1, 0xb9a682, 'plazaTop', KERB + 0.02, 2);
    for (let z = Mu.z0 + 6; z < Mu.z1; z += 12) wallLantern(world, ax0 + 0.02, KERB + 2.6, z, 1, 0);
    K().sign(world, { x: Mu.x1 + 0.08, y: KERB + 5.1, z: (Mu.z0 + Mu.z1) / 2, yaw: PI / 2, w: 7, h: 0.9, lines: ['MUSEUM OF THE FORT'], style: 'plaque' });
    // Museum guns lined up under the arcade's end.
    cannon(world, 1040, KERB, 616, PI);

    // --- the lighthouse and the keeper's cottage
    buildLighthouse(world);

    // --- the point outside the seaward wall: rocks, the old quay, benches
    const qz0 = Fo.z1 + 20, qz1 = 836.5;
    pave(world, 990, Fo.z1 + 2, 1154, 836.8, 0xffffff, 'grassTop', KERB + 0.015, 6);
    world.addLawn(990, Fo.z1 + 2, 1154, 836.8);
    pave(world, 990, qz0 + 4, 1154, qz0 + 8, 0xc9b48e, 'plazaTop', KERB + 0.02, 3); // the path along the point
    pave(world, 1040, qz0 + 8, 1100, qz1, 0xb9a682, 'plazaTop', KERB + 0.02, 3); // the quay's stones
    for (let x = 1044; x <= 1096; x += 8) S().drum(world, world.ctxAt(x, qz1 - 0.9).prop, x, KERB, qz1 - 0.9, 0.28, 0.55, 8, 0x2b2d2f, 'metal');
    // Rocks along the shore either side of the quay.
    const rng = new VH.RNG('paloma-point');
    for (let x = 992; x < 1152; x += rng.range(3, 6)) {
      if (x > 1036 && x < 1104) continue;
      const rs = rng.range(0.9, 1.8), rz = qz1 - rs - rng.range(0, 2);
      sobox(world, 'concrete', x, rz, rs, rs * 0.8, rng.range(0, 3), KERB, KERB + rs * rng.range(0.6, 1.1), rng.chance(0.5) ? 0x8d8573 : 0x9f9784, 'wall');
    }
    for (const [bx, bz] of [[1012, qz0 + 9.5], [1124, qz0 + 9.5], [1070, qz0 + 9.5]]) world.addProp('bench', bx, KERB, bz, 0, 1);
    for (const [lx, lz] of [[1000, qz0 + 3], [1040, qz0 + 3], [1100, qz0 + 3], [1140, qz0 + 3]]) world.addProp('streetlight', lx, KERB, lz, 0, 1);
    // Lobster pots stacked on the quay (solid), a coil of rope.
    for (const [lx, lz] of [[1050, qz1 - 4], [1052.2, qz1 - 4], [1051.1, qz1 - 4]]) {
      const y = lx === 1051.1 ? KERB + 0.8 : KERB;
      sbox(world, 'wood', lx - 1, y, lz - 0.7, lx + 1, y + 0.8, lz + 0.7, 0x7a6a4a, 'crate');
    }
    K().sign(world, { x: 1070, y: KERB + 1.7, z: qz0 + 8.6, yaw: 0, w: 3.2, h: 0.9, posts: true, lines: ['THE OLD FORT QUAY', 'Mind the edge'], style: 'plaque' });

    // The glacis: grass between the walls and the plot's edges (the bastions stand on it).
    for (const [x0, z0, x1, z1] of [[990, 586, 1012, Fo.z1 + 2], [Fo.x1, 586, 1154, Fo.z1 + 2], [1012, 586, g.x - 13, Fo.z0], [g.x + 13, 586, Fo.x1, Fo.z0]]) {
      pave(world, x0, z0, x1, z1, 0xffffff, 'grassTop', KERB + 0.02, 6);
      world.addLawn(x0, z0, x1, z1);
    }

    // Street lamps on the plot's own frontage (Harbour Street, Paloma Way).
    for (let x = 1000; x < 1150; x += 28) if (Math.abs(x - g.x) > 10) world.addProp('streetlight', x, KERB, 429, PI, 1);
    for (let z = 600; z < 790; z += 30) world.addProp('streetlight', 989, KERB, z, -PI / 2, 1);

    return { brickMesh, brickCol };
  }

  // ---------------------------------------------------------- the lighthouse
  function buildLighthouse(world) {
    const Lh = FORT.light;
    const { x, z, r } = Lh;
    const ctx = world.ctxAt(x, z);
    const yG = KERB + Lh.gallery; // the gallery floor
    const yT = KERB + Lh.shaft; // top of the stone shaft
    const N = 16, T = 0.4, rw = r - T / 2, half = r * Math.sin(PI / N) + 0.04;
    const doorA = ((12 + 0.5) / N) * PI * 2; // the door (one panel) faces north (-z)
    const exitA = ((5 + 0.5) / N) * PI * 2; // the gallery door faces the courtyard and the sea
    const near = (a, b2) => Math.abs(Math.atan2(Math.sin(a - b2), Math.cos(a - b2))) < 0.02;
    // The shaft: sixteen panels, white with a terracotta band under the gallery; holes for the doors.
    for (let i = 0; i < N; i++) {
      const a = ((i + 0.5) / N) * PI * 2;
      const px = x + Math.cos(a) * rw, pz = z + Math.sin(a) * rw;
      const spans = [];
      if (near(a, doorA)) spans.push([KERB + 2.3, yT]);
      else if (near(a, exitA)) { spans.push([KERB, yG]); spans.push([yG + 2.25, yT]); }
      else spans.push([KERB, yT]);
      for (const [y0, y1] of spans) {
        // Stone base course, white shaft, terracotta band just under the gallery.
        const parts = [[y0, Math.min(y1, KERB + 1.2), 0xcfc4ae], [Math.max(y0, KERB + 1.2), Math.min(y1, yG - 1.6), 0xf4f1ea], [Math.max(y0, yG - 1.6), Math.min(y1, yG), 0xb8583e], [Math.max(y0, yG), y1, 0xf4f1ea]];
        for (const [a0, a1, hex] of parts) if (a1 - a0 > 0.01) ctx.concrete.orientedBox(px, pz, T / 2, half, -a, a0, a1, sc(hex));
        world.physics.addOrientedBox(px, pz, T / 2, half, -a, y0 <= KERB + 0.01 ? 0 : y0, y1, 'wall', F().ALL);
      }
    }
    // The door's frame and a lamp over it; a step.
    const dx = x + Math.cos(doorA) * (r + 0.05), dz = z + Math.sin(doorA) * (r + 0.05);
    ctx.prop.box(dx - 0.8, KERB + 2.3, dz - 0.12, dx + 0.8, KERB + 2.55, dz + 0.12, VH.col(0x2a62b8), { bottom: true });
    wallLantern(world, dx, KERB + 2.9, dz - 0.05, 0, -1);
    // Inside: the newel, the spiral stair (treads 0.25 m apart, sixteen a turn), a lamp every turn.
    ctx.concrete.cylinder(x, KERB, z, 0.32, 0.32, yG - KERB, 8, sc(0xe8e2d4), false);
    world.physics.addBox(x - 0.3, 0, z - 0.3, x + 0.3, yG, z + 0.3, 'pole', F().SOLID | F().SHOTS);
    const rise = 0.25;
    const steps = Math.round((yG - KERB) / rise);
    const perTurn = 16;
    const dA = (PI * 2) / perTurn;
    const a0 = doorA + PI / 2 + 0.2; // the first tread is round to the right of the door
    const ri = 0.32, ro = r - T - 0.02;
    const rm = (ri + ro) / 2, hr = (ro - ri) / 2, ht = ro * Math.tan(dA / 2) + 0.05;
    const tread = (a, top, hex) => {
      const cx = x + Math.cos(a) * rm, cz = z + Math.sin(a) * rm;
      ctx.interior.orientedBox(cx, cz, hr, ht, -a, top - 0.14, top, VH.col(hex), VH.col(0xd8cbb0));
      world.physics.addOrientedBox(cx, cz, hr, ht, -a, top - 0.3, top, 'stairs', F().SOLID | F().SHOTS);
    };
    for (let i = 0; i < steps; i++) tread(a0 + dA * (i + 0.5), KERB + rise * (i + 1), i % 2 ? 0xc9bca2 : 0xbcae92);
    const aEnd = a0 + dA * steps;
    // The landing: level treads on round from the top step to the gallery door and past it.
    let aExit = exitA;
    while (aExit < aEnd + 0.5) aExit += PI * 2;
    for (let a = aEnd + dA * 0.5; a < aExit + dA * 1.5; a += dA) tread(a, yG, 0xc9bca2);
    // A sill through the gallery doorway (across the wall's thickness).
    {
      const sx = x + Math.cos(aExit) * (r - T / 2), sz = z + Math.sin(aExit) * (r - T / 2);
      ctx.concrete.orientedBox(sx, sz, T / 2 + 0.25, half, -aExit, yG - 0.3, yG, sc(0xd8cbb0));
      world.physics.addOrientedBox(sx, sz, T / 2 + 0.25, half, -aExit, yG - 0.3, yG, 'stone', F().SOLID | F().SHOTS);
    }
    for (let y = KERB + 2.4, k = 0; y < yG; y += 4, k++) {
      const a = a0 + ((y - KERB) / rise) * dA - 0.6;
      const lx = x + Math.cos(a) * (r - T - 0.06), lz = z + Math.sin(a) * (r - T - 0.06);
      ctx.screen.box(lx - 0.1, y + 1.2, lz - 0.1, lx + 0.1, y + 1.5, lz + 0.1, VH.col(0xfff1c8, 1.8), { bottom: true });
    }
    // The ceiling over the landing (the lantern room's floor), seen from the stair.
    ctx.interior.cylinder(x, yT - 0.1, z, r - T, r - T, 0.1, N, VH.col(0xe8e2d4), false);
    world.physics.addBox(x - (r - T) * 0.7, yT - 0.1, z - (r - T) * 0.7, x + (r - T) * 0.7, yT, z + (r - T) * 0.7, 'wall', F().SHOTS | F().CAMERA);
    // The gallery outside: a ring deck on brackets, with a railing all round.
    const gr0 = r, gr1 = r + 1.3;
    for (let i = 0; i < N; i++) {
      const a = ((i + 0.5) / N) * PI * 2;
      const gm = (gr0 + gr1) / 2;
      const px = x + Math.cos(a) * gm, pz = z + Math.sin(a) * gm;
      const gh = gr1 * Math.sin(PI / N) + 0.05;
      ctx.concrete.orientedBox(px, pz, (gr1 - gr0) / 2 + 0.05, gh, -a, yG - 0.3, yG, sc(0xe8e2d4), sc(0xc9bca2));
      world.physics.addOrientedBox(px, pz, (gr1 - gr0) / 2 + 0.05, gh, -a, yG - 0.3, yG, 'stone', F().SOLID | F().SHOTS);
      // Bracket under it.
      const bx = x + Math.cos(a) * (r + 0.35), bz = z + Math.sin(a) * (r + 0.35);
      ctx.concrete.orientedBox(bx, bz, 0.35, 0.12, -a, yG - 1.1, yG - 0.3, sc(0xd8cbb0));
      // The railing segment at the rim.
      const rx = x + Math.cos(a) * (gr1 - 0.05), rz = z + Math.sin(a) * (gr1 - 0.05);
      ctx.prop.orientedBox(rx, rz, 0.04, gh, -a, yG + 1.0, yG + 1.08, VH.col(0x2a2d33));
      ctx.prop.orientedBox(rx, rz, 0.03, gh, -a, yG + 0.5, yG + 0.55, VH.col(0x2a2d33));
      ctx.prop.box(rx - 0.04, yG, rz - 0.04, rx + 0.04, yG + 1.08, rz + 0.04, VH.col(0x2a2d33));
      world.physics.addOrientedBox(rx, rz, 0.08, gh, -a, yG, yG + 1.08, 'railing', F().SOLID | F().SHOTS);
    }
    // The lantern room: a ring of stone at the shaft top, glazing (lit at night: a mesh of its own
    // in OldPalomaLife), a copper dome and a vane.
    ctx.concrete.cylinder(x, yT, z, r, r, 0.5, N, sc(0xf4f1ea), true);
    ctx.prop.cylinder(x, yT + 0.5, z, 2.5, 2.5, 0.15, N, VH.col(0x2a2d33), true);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * PI * 2;
      const mx = x + Math.cos(a) * 2.45, mz = z + Math.sin(a) * 2.45;
      ctx.prop.box(mx - 0.06, yT + 0.6, mz - 0.06, mx + 0.06, yT + 3.4, mz + 0.06, VH.col(0x2a2d33));
    }
    ctx.prop.cylinder(x, yT + 3.4, z, 2.75, 2.75, 0.2, N, VH.col(0x2a2d33), true);
    ctx.prop.cylinder(x, yT + 3.6, z, 2.6, 0.3, 2.0, N, VH.col(0x4f8f7a), false);
    ctx.prop.cylinder(x, yT + 5.6, z, 0.25, 0.25, 0.4, 6, VH.col(0x2a2d33), true);
    ctx.prop.box(x - 0.03, yT + 6.0, z - 0.03, x + 0.03, yT + 7.4, z + 0.03, VH.col(0x2a2d33));
    ctx.prop.box(x - 0.6, yT + 6.9, z - 0.02, x + 0.6, yT + 7.1, z + 0.02, VH.col(0x2a2d33));
    // The keeper's cottage: whitewash, a terracotta roof, the blue door and a lit window beside it.
    const C = FORT.cottage;
    K().building(world, C.x0, C.z0, C.x1, C.z1, C.h, { wall: WHITEWASH, roof: 0x9a8e7a, style: 0, parapet: false, sides: { n: 'blank', s: 'blank', w: 'blank', e: 'blank' } });
    K().gable(world.ctxAt((C.x0 + C.x1) / 2, (C.z0 + C.z1) / 2).prop, C.x0 - 0.4, C.z0 - 0.5, C.x1, C.z1 + 0.5, KERB + C.h, 2.0, 'x', TERRACOTTA, WHITEWASH);
    const cc = world.ctxAt(C.door, C.z0);
    cc.prop.box(C.door - 0.6, KERB, C.z0 - 0.08, C.door + 0.6, KERB + 2.2, C.z0 + 0.02, VH.col(BLUE_DOOR));
    cc.prop.box(C.door - 0.75, KERB + 2.2, C.z0 - 0.1, C.door + 0.75, KERB + 2.38, C.z0 + 0.02, VH.col(0xd8cbb0));
    cc.prop.box(C.door + 0.32, KERB + 1.0, C.z0 - 0.12, C.door + 0.42, KERB + 1.1, C.z0 - 0.06, VH.col(0xd9b45a));
    glow(world, C.win - 0.7, KERB + 0.95, C.z0 - 0.06, C.win + 0.7, KERB + 2.05, C.z0 - 0.02, 0xffd890, 1.8);
    cc.prop.box(C.win - 0.85, KERB + 0.85, C.z0 - 0.14, C.win + 0.85, KERB + 0.95, C.z0, VH.col(0xd8cbb0));
    for (const s of [-1, 1]) cc.prop.box(C.win + s * 1.05 - 0.22, KERB + 0.95, C.z0 - 0.1, C.win + s * 1.05 + 0.22, KERB + 2.05, C.z0 - 0.02, VH.col(0x2f7f86));
    wallLantern(world, C.door + 1.2, KERB + 2.3, C.z0 - 0.02, 0, -1);
    // Pots of geraniums by the door (solid), a bench, a bicycle-less rack of oars.
    for (const px of [C.door - 1.4, C.door + 2.2]) {
      S().drum(world, cc.prop, px, KERB, C.z0 - 0.7, 0.35, 0.55, 8, 0xb8583e, 'wall');
      cc.hedge.cylinder(px, KERB + 0.55, C.z0 - 0.7, 0.4, 0.3, 0.35, 8, VH.col(0xd23a4a), true);
    }
    world.addProp('bench', C.x0 + 1.8, KERB, C.z0 - 0.9, PI, 1);
    return { yG, exitA };
  }

  // ---------------------------------------------------------- the plaza
  // Plaza Paloma: plot 987..1153 x 187..413 (Mission Street north, Harbour Street south).
  const PLAZA = {
    sq: { x0: 1012, x1: 1128, z0: 189, z1: 328 }, // the square's paving
    west: [[194, 214, 8.4, 0xf1e3b3], [214, 240, 10.2, 0xd8795e], [240, 262, 9.0, 0xe6efe9], [262, 290, 11.2, 0xf4d9c6], [290, 328, 8.6, 0xb8d4c8]],
    east: [[190, 216, 9.6, 0xe8c9a0], [216, 244, 11.0, 0xf2e6d0], [244, 270, 8.8, 0xc9a26a], [270, 300, 10.4, 0xf1e3b3], [300, 328, 9.2, 0xd8795e]],
    wx0: 990, wx1: 1010, ex0: 1130, ex1: 1150,
    church: { x0: 1059, x1: 1081, z0: 336, z1: 392, h: 12.5, rise: 6.5 },
    tower: { x0: 1081, x1: 1089, z0: 328, z1: 336, wall: 0.7, belfry: 17, top: 21.6 },
    fountain: { x: 1070, z: 262, r: 4.2 },
    band: { x: 1036, z: 296, r: 4.6, h: 1.05 },
    market: { x0: 1094, x1: 1150, z0: 342, z1: 408 },
    cafe: { x0: 990, x1: 1010, z0: 194, z1: 214 },
  };
  const CHURCH = 0xf1e3c0;

  /** A town house on the plaza: windows with teal shutters, a flat roof with a parapet, a balcony or two. */
  function townHouse(world, x0, z0, x1, z1, h, wall, front, seed) {
    K().building(world, x0, z0, x1, z1, h, { wall, roof: 0xb8a890, style: 1, ww: 0.42, wh: 0.62, bay: 3.2, floorH: 3.3, seed, parapet: 0.8 });
    // Shutters and balconies on the front face (+x 'e' or -x 'w').
    const ctx = world.ctxAt((x0 + x1) / 2, (z0 + z1) / 2);
    const fx = front === 'e' ? x1 : x0, s = front === 'e' ? 1 : -1;
    const shutter = VH.col(seed > 0.5 ? 0x2f7f86 : 0x3d6b8f);
    for (let z = z0 + 2.2; z < z1 - 1.5; z += 3.2) {
      for (let f = 1; f * 3.3 + 1.0 < h; f++) {
        const y = KERB + f * 3.3 + 0.6;
        for (const dz of [-0.95, 0.95]) ctx.prop.box(Math.min(fx, fx + s * 0.08), y, z + dz - 0.32, Math.max(fx, fx + s * 0.08), y + 1.9, z + dz + 0.32, shutter);
      }
    }
    // A wrought-iron balcony on the first floor in the middle.
    const bz = (z0 + z1) / 2, by = KERB + 3.3;
    ctx.prop.box(Math.min(fx, fx + s * 1.0), by - 0.15, bz - 2.2, Math.max(fx, fx + s * 1.0), by, bz + 2.2, VH.col(0xd8cbb0), { bottom: true });
    ctx.prop.box(Math.min(fx + s * 0.95, fx + s * 1.0), by, bz - 2.2, Math.max(fx + s * 0.95, fx + s * 1.0), by + 1.0, bz + 2.2, VH.col(0x2a2d33));
    // Pot plants on the parapet's corner; a washing line on the roof.
    ctx.hedge.box(Math.min(fx, fx - s * 0.6), KERB + h + 0.8, z0 + 0.4, Math.max(fx, fx - s * 0.6), KERB + h + 1.2, z0 + 1.4, VH.col(0x4f8a3a));
    const ry = KERB + h + 1.6;
    const lx = (x0 + x1) / 2;
    ctx.prop.box(lx - 0.04, KERB + h, z0 + 2, lx + 0.04, ry, z0 + 2.08, VH.col(0x5a5f66));
    ctx.prop.box(lx - 0.04, KERB + h, z1 - 2.08, lx + 0.04, ry, z1 - 2, VH.col(0x5a5f66));
    K().block(world, lx - 0.08, KERB + h, z0 + 1.96, lx + 0.08, ry, z0 + 2.12, 'pole');
    K().block(world, lx - 0.08, KERB + h, z1 - 2.12, lx + 0.08, ry, z1 - 1.96, 'pole');
    const laundry = [0xffffff, 0xe86a6a, 0x7ab0e0, 0xf0c040, 0xffffff, 0x9ad08a];
    for (let z = z0 + 2.6, i = 0; z < z1 - 2.6; z += 1.3, i++) ctx.prop.box(lx - 0.02, ry - 0.9, z, lx + 0.02, ry - 0.05, z + 0.9, VH.col(laundry[(i + Math.round(seed * 10)) % laundry.length]), { bottom: true });
    K().beam(ctx.prop, lx, ry, z0 + 2.04, lx, ry, z1 - 2.04, 0.02, VH.col(0xdddddd));
  }

  /** A market stall: a counter, four posts, a striped awning, produce. Solid where it stands. */
  function stall(world, x, z, yaw, stripe, goods) {
    const ctx = world.ctxAt(x, z);
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const P = (u, v) => [x + u * c + v * s, z - u * s + v * c];
    const hw = 1.8, hd = 1.1;
    // Counter along the front (+v), crates behind.
    const [cx, cz] = P(0, hd - 0.35);
    ctx.wood.orientedBox(cx, cz, hw, 0.35, yaw, KERB, KERB + 0.95, VH.col(0x8a6a48), VH.col(0xa07a52));
    world.physics.addOrientedBox(cx, cz, hw, 0.35, yaw, 0, KERB + 0.95, 'crate', F().ALL);
    // Produce on the counter in three trays.
    for (let k = -1; k <= 1; k++) {
      const [gx, gz] = P(k * 1.15, hd - 0.35);
      ctx.prop.orientedBox(gx, gz, 0.5, 0.28, yaw, KERB + 0.95, KERB + 1.12, VH.col(goods[(k + 1) % goods.length]));
    }
    // Posts and the awning.
    for (const u of [-hw, hw]) for (const v of [-hd, hd]) {
      const [px, pz] = P(u * 0.97, v * 0.97);
      ctx.prop.box(px - 0.05, KERB, pz - 0.05, px + 0.05, KERB + 2.5, pz + 0.05, VH.col(0x5a5f66));
      K().block(world, px - 0.07, 0, pz - 0.07, px + 0.07, KERB + 2.5, pz + 0.07, 'pole');
    }
    for (let i = 0; i < 6; i++) {
      const u0 = -hw - 0.15 + ((2 * hw + 0.3) * i) / 6, u1 = -hw - 0.15 + ((2 * hw + 0.3) * (i + 1)) / 6;
      const [ax, az] = P((u0 + u1) / 2, 0);
      ctx.prop.orientedBox(ax, az, (u1 - u0) / 2, hd + 0.35, yaw, KERB + 2.5, KERB + 2.62, VH.col(i % 2 ? 0xf6f1e4 : stripe), null);
    }
    // A crate or two behind the counter (solid).
    const [bx, bz] = P(-0.9, -hd + 0.45);
    ctx.wood.orientedBox(bx, bz, 0.4, 0.3, yaw, KERB, KERB + 0.55, VH.col(0x9a7650));
    world.physics.addOrientedBox(bx, bz, 0.4, 0.3, yaw, 0, KERB + 0.55, 'crate', F().ALL);
  }

  /** The bell tower: a stone shaft round a solid newel pier, a square stair up its four sides to the belfry. */
  function bellTower(world) {
    const T = PLAZA.tower;
    const { x0, x1, z0, z1 } = T;
    const w = T.wall;
    const ctx = world.ctxAt((x0 + x1) / 2, (z0 + z1) / 2);
    const yB = KERB + T.belfry, yTop = KERB + T.top;
    const ix0 = x0 + w, ix1 = x1 - w, iz0 = z0 + w, iz1 = z1 - w; // inside
    const cxm = (x0 + x1) / 2, czm = (z0 + z1) / 2;
    const pier = 1.3; // half the newel pier
    const px0 = cxm - pier, px1 = cxm + pier, pz0 = czm - pier, pz1 = czm + pier;
    const ring = ix1 - px1; // corridor width (2.0)
    const stoneC = 0xe4d6b6;
    // The shaft's walls: solid, with the door (north face, at the NW corner) and the belfry's arches.
    const door = { x0: ix0 + 0.15, x1: ix0 + ring - 0.15, h: KERB + 2.6 };
    const op = 1.7; // belfry corner piers
    const archY0 = yB + 1.0, archY1 = yB + 3.45; // a balustrade below, the opening above
    const face = (side) => {
      // Each face as boxes: below the belfry (with the door on the north face), the belfry piers, the sill, the band above.
      const along = side === 'n' || side === 's';
      const a0 = along ? x0 : z0, a1 = along ? x1 : z1;
      const c0 = side === 'n' ? z0 : side === 's' ? z1 - w : side === 'w' ? x0 : x1 - w;
      const c1 = c0 + w;
      const B = (p0, p1, y0, y1, hex, opts) => (along ? sbox(world, 'concrete', p0, y0, c0, p1, y1, c1, hex, 'wall', opts) : sbox(world, 'concrete', c0, y0, p0, c1, y1, p1, hex, 'wall', opts));
      if (side === 'n') {
        B(a0, door.x0, KERB, yB, stoneC);
        B(door.x1, a1, KERB, yB, stoneC);
        B(door.x0, door.x1, door.h, yB, stoneC, { bottom: true });
      } else B(a0, a1, KERB, yB, stoneC);
      B(a0, a0 + op, yB, yTop, stoneC);
      B(a1 - op, a1, yB, yTop, stoneC);
      B(a0 + op, a1 - op, yB, archY0, stoneC, { bottom: false });
      B(a0 + op, a1 - op, archY1, yTop, stoneC, { bottom: true });
    };
    for (const sd of ['n', 's', 'e', 'w']) face(sd);
    // Dressed quoins at the corners, a string course at the belfry floor, a cornice on top.
    for (const [qx, qz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) draw(world, 'concrete', qx - 0.12, KERB, qz - 0.12, qx + 0.12, yTop, qz + 0.12, 0xcdbd98);
    draw(world, 'concrete', x0 - 0.2, yB - 0.25, z0 - 0.2, x1 + 0.2, yB + 0.05, z1 + 0.2, 0xcdbd98, { bottom: true });
    sbox(world, 'concrete', x0 - 0.35, yTop, z0 - 0.35, x1 + 0.35, yTop + 0.45, z1 + 0.35, 0xcdbd98, 'wall', { bottom: true });
    // Plinth (solid, knee-high).
    for (const [a, b2, c, d] of [[x0 - 0.3, z0 - 0.3, door.x0, z0], [door.x1, z0 - 0.3, x1 + 0.3, z0], [x1, z0, x1 + 0.3, z1 + 0.3], [x0 - 0.3, z0, x0, z1 + 0.3]]) sbox(world, 'concrete', a, KERB, b2, c, KERB + 0.9, d, 0xcdbd98, 'wall');
    // The door's frame and a lantern over it.
    ctx.concrete.box(door.x0 - 0.3, door.h, z0 - 0.08, door.x1 + 0.3, door.h + 0.35, z0 + 0.02, sc(0xcdbd98), { bottom: true });
    wallLantern(world, (door.x0 + door.x1) / 2, door.h + 0.6, z0 - 0.02, 0, -1);
    // The spire: a stone pyramid, a ball and an iron cross.
    ctx.concrete.cylinder(cxm, yTop + 0.45, czm, (x1 - x0) * 0.66, 0.15, 7.5, 4, sc(0xd8c8a6), false);
    ctx.prop.cylinder(cxm, yTop + 7.9, czm, 0.28, 0.28, 0.5, 6, VH.col(0xc9a227), true);
    ctx.prop.box(cxm - 0.06, yTop + 8.4, czm - 0.06, cxm + 0.06, yTop + 10.2, czm + 0.06, VH.col(0x2a2d33));
    ctx.prop.box(cxm - 0.55, yTop + 9.4, czm - 0.05, cxm + 0.55, yTop + 9.55, czm + 0.05, VH.col(0x2a2d33));
    // The clock on the north face, lit at night.
    const cy = yB - 3.2;
    ctx.concrete.box(cxm - 1.3, cy - 1.3, z0 - 0.12, cxm + 1.3, cy + 1.3, z0, sc(0xcdbd98), { bottom: true });
    glow(world, cxm - 1.0, cy - 1.0, z0 - 0.16, cxm + 1.0, cy + 1.0, z0 - 0.12, 0xfff4d8, 1.4);
    ctx.prop.box(cxm - 0.04, cy, z0 - 0.2, cxm + 0.04, cy + 0.8, z0 - 0.16, VH.col(0x1a1a1a), { bottom: true });
    ctx.prop.box(cxm, cy - 0.04, z0 - 0.2, cxm + 0.6, cy + 0.04, z0 - 0.16, VH.col(0x1a1a1a), { bottom: true });
    // Inside: the newel pier (solid to the belfry floor).
    sbox(world, 'interior', px0, KERB, pz0, px1, yB, pz1, 0xd8cbb0, 'wall');
    // The stair: ten flights round the pier (N east-bound, E south-bound, S west-bound, W north-bound),
    // a landing in each corner; the first flight is closed underneath, the rest float.
    const R = (yB - KERB) / 10;
    const lanes = {
      n: { x: px0, z: (iz0 + pz0) / 2, dir: 'e' },
      e: { x: (px1 + ix1) / 2, z: pz0, dir: 's' },
      s: { x: px1, z: (pz1 + iz1) / 2, dir: 'w' },
      w: { x: (ix0 + px0) / 2, z: pz1, dir: 'n' },
    };
    const corners = { n: [px1, iz0, ix1, pz0], e: [px1, pz1, ix1, iz1], s: [ix0, pz1, px0, iz1], w: [ix0, iz0, px0, pz0] }; // the landing after each side
    const order = ['n', 'e', 's', 'w'];
    const tread = 0xc9bca2;
    for (let f = 0; f < 10; f++) {
      const sd = order[f % 4];
      const L = lanes[sd];
      const ya = KERB + f * R, yb = ya + R;
      K().stairs(world, ctx.interior, L.x, L.z, L.dir, pier * 2, ring - 0.02, ya, yb, tread, { open: f > 0, rails: false, base: f > 0 ? ya - 0.35 : undefined, tag: 'stairs' });
      const [lx0, lz0, lx1, lz1] = corners[sd];
      if (f < 9) K().deck(world, ctx.interior, lx0, lz0, lx1, lz1, yb, 0xbcae92, 'stone', 0.3);
      // A lamp on the wall each flight.
      if (f % 2 === 0) {
        const lxw = sd === 'n' ? cxm : sd === 'e' ? ix1 - 0.06 : sd === 's' ? cxm : ix0 + 0.06;
        const lzw = sd === 'n' ? iz0 + 0.06 : sd === 'e' ? czm : sd === 's' ? iz1 - 0.06 : czm;
        ctx.screen.box(lxw - 0.1, yb + 1.2, lzw - 0.1, lxw + 0.1, yb + 1.45, lzw + 0.1, VH.col(0xfff1c8, 1.8), { bottom: true });
      }
    }
    // The belfry floor: everywhere but the hole the last flights come up through (the NE corner,
    // the east side and the east half of the north side).
    const holeX = px0 + 0.9;
    for (const [a, b2, c, d] of [[ix0, iz0, holeX, pz0], [ix0, pz0, px1, iz1], [px1, pz1, ix1, iz1]]) K().deck(world, ctx.interior, a, b2, c, d, yB, 0xb9a682, 'stone', 0.3);
    // A rail round the hole (solid, waist-high).
    // (Not across the top of the last flight: that is the way off it, onto the floor in the SE corner.)
    for (const [a, b2, c, d] of [[holeX, pz0 - 0.06, px1, pz0 + 0.06], [px1 - 0.06, pz0, px1 + 0.06, pz1 - 0.02]]) {
      ctx.prop.box(a, yB + 0.95, b2, c, yB + 1.02, d, VH.col(0x2a2d33));
      ctx.prop.box(a, yB, b2, Math.min(c, a + 0.08), yB + 1.02, d, VH.col(0x2a2d33));
      world.physics.addBox(a, yB, b2, c, yB + 1.02, d, 'railing', F().SOLID | F().SHOTS);
    }
    ctx.prop.box(holeX - 0.06, yB, pz0 - 0.08, holeX + 0.06, yB + 1.02, pz0 + 0.08, VH.col(0x2a2d33));
    world.physics.addBox(holeX - 0.06, yB, iz0, holeX + 0.06, yB + 1.02, pz0, 'railing', F().SOLID | F().SHOTS);
    ctx.prop.box(holeX - 0.04, yB + 0.95, iz0, holeX + 0.04, yB + 1.02, pz0, VH.col(0x2a2d33));
    // The bell: a bronze bell on a timber yoke across the tower, its rope hanging to the floor.
    const bx = cxm - 0.2, bzc = czm + 0.5;
    ctx.wood.box(ix0, yTop - 0.9, bzc - 0.2, ix1, yTop - 0.5, bzc + 0.2, VH.col(0x5a3a22), { bottom: true });
    const bronze = VH.col(0xa8742a);
    ctx.prop.cylinder(bx, yB + 2.05, bzc, 0.95, 0.75, 0.3, 12, bronze, false);
    ctx.prop.cylinder(bx, yB + 2.35, bzc, 0.75, 0.5, 1.3, 12, bronze, false);
    ctx.prop.cylinder(bx, yB + 3.65, bzc, 0.5, 0.25, 0.35, 12, bronze, true);
    S().capUnder(ctx.prop, bx, yB + 2.05, bzc, 0.95, 12, VH.col(0x3a2a14));
    ctx.prop.box(bx - 0.08, yB + 4.0, bzc - 0.08, bx + 0.08, yTop - 0.9, bzc + 0.08, VH.col(0x2a2d33));
    S().disc(world, bx, bzc, 0.95, yB + 2.05, yB + 4.0, 'metal');
    ctx.prop.box(bx + 0.55, yB + 0.9, bzc - 0.03, bx + 0.61, yB + 2.1, bzc + 0.03, VH.col(0xd8c8a0)); // solidity: passable (the rope)
    ctx.screen.box(cxm - 0.12, yTop - 0.5, czm - 0.12, cxm + 0.12, yTop - 0.3, czm + 0.12, VH.col(0xfff1c8, 1.6), { bottom: true });
    return { yB, bell: { x: bx, z: bzc } };
  }

  function buildPlaza(world) {
    const Pz = PLAZA;
    const sq = Pz.sq;
    // --- the square's paving: a pale field inside a warm border, the church steps' forecourt
    pave(world, 990, 187.5, 1152, 412.5, 0xc8b28a, 'plazaTop', KERB + 0.012, 3);
    pave(world, sq.x0 + 6, sq.z0 + 8, sq.x1 - 6, sq.z1 - 6, 0xe0d2b4, 'plazaTop', KERB + 0.03, 4);
    pave(world, Pz.fountain.x - 10, Pz.fountain.z - 10, Pz.fountain.x + 10, Pz.fountain.z + 10, 0xb89a72, 'plazaTop', KERB + 0.045, 2);
    // --- the houses round the square (the plaza roofs)
    Pz.west.forEach(([z0, z1, h, wall], i) => townHouse(world, Pz.wx0, z0, Pz.wx1, z1, h, wall, 'e', 0.31 + i * 0.13));
    Pz.east.forEach(([z0, z1, h, wall], i) => townHouse(world, Pz.ex0, z0, Pz.ex1, z1, h, wall, 'w', 0.37 + i * 0.11));
    // Café Inés on the corner: an awning over three tables, the counter with its glass cake dome.
    const C = Pz.cafe;
    const cctx = world.ctxAt(1000, 200);
    for (let i = 0; i < 8; i++) {
      const x0 = C.x0 + (i * (C.x1 - C.x0)) / 8, x1 = C.x0 + ((i + 1) * (C.x1 - C.x0)) / 8;
      cctx.prop.box(x0, KERB + 2.9, C.z0 - 3.2, x1, KERB + 3.05, C.z0, VH.col(i % 2 ? 0xf6f1e4 : 0x2f7f86), { bottom: true });
    }
    cctx.prop.box(C.x0, KERB + 2.6, C.z0 - 3.3, C.x1, KERB + 2.9, C.z0 - 3.2, VH.col(0x2f7f86), { bottom: true });
    for (const x of [C.x0 + 0.2, C.x1 - 0.2]) sbox(world, 'prop', x - 0.06, KERB, C.z0 - 3.2, x + 0.06, KERB + 2.9, C.z0 - 3.08, 0x2a2d33, 'pole');
    glow(world, C.x0 + 1, KERB + 0.6, C.z0 - 0.06, C.x1 - 1, KERB + 2.4, C.z0 - 0.02, 0xffe2a8, 1.3); // the lit shop window
    // The counter at the hatch, the doughnuts under glass.
    sbox(world, 'wood', C.x0 + 1.0, KERB, C.z0 - 0.9, C.x0 + 4.2, KERB + 1.05, C.z0, 0x8a5a3a, 'crate');
    cctx.prop.cylinder(C.x0 + 2.6, KERB + 1.05, C.z0 - 0.45, 0.32, 0.3, 0.32, 10, VH.col(0xd8eef4), true);
    cctx.prop.box(C.x0 + 2.3, KERB + 1.05, C.z0 - 0.6, C.x0 + 2.9, KERB + 1.12, C.z0 - 0.3, VH.col(0xd9a05a));
    for (const [tx, tz] of [[C.x0 + 6.5, C.z0 - 1.7], [C.x0 + 10.5, C.z0 - 1.7], [C.x0 + 14.5, C.z0 - 1.7]]) {
      S().drum(world, cctx.prop, tx, KERB, tz, 0.45, 0.74, 10, 0xf2efe6, 'crate');
      for (const s2 of [-1, 1]) sbox(world, 'prop', tx + s2 * 0.85 - 0.22, KERB, tz - 0.22, tx + s2 * 0.85 + 0.22, KERB + 0.88, tz + 0.22, 0x2f7f86, 'crate');
    }
    K().sign(world, { x: (C.x0 + C.x1) / 2, y: KERB + 3.75, z: C.z0 - 0.15, yaw: PI, w: 6.5, h: 1.0, lines: ['CAFÉ INÉS'], style: 'neon' });

    // --- the fountain in the middle
    const Fn = Pz.fountain;
    const fctx = world.ctxAt(Fn.x, Fn.z);
    const fst = VH.col(0xd8cbb0);
    fctx.propMatte.cylinder(Fn.x, KERB, Fn.z, Fn.r + 0.2, Fn.r, 0.65, 20, fst, true, VH.colMul(fst, 0.8));
    fctx.propMatte.cylinder(Fn.x, KERB + 0.65, Fn.z, 0.55, 0.45, 1.6, 10, fst, true);
    fctx.propMatte.cylinder(Fn.x, KERB + 2.25, Fn.z, 0.9, 1.5, 0.35, 14, fst, true);
    fctx.propMatte.cylinder(Fn.x, KERB + 2.6, Fn.z, 0.3, 0.2, 0.9, 8, fst, true);
    world.fountains = world.fountains || [];
    world.fountains.push({ x: Fn.x, y: KERB + 0.6, z: Fn.z, r: Fn.r - 0.3 });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * PI * 2;
      const yaw = -a - PI / 2;
      world.physics.addOrientedBox(Fn.x + Math.cos(a) * (Fn.r - 0.2), Fn.z + Math.sin(a) * (Fn.r - 0.2), Fn.r * 0.42, 0.3, yaw, 0, KERB + 0.65, 'fountain');
      world.physics.addOrientedBox(Fn.x + Math.cos(a) * (Fn.r * 0.48), Fn.z + Math.sin(a) * (Fn.r * 0.48), Fn.r * 0.4, Fn.r * 0.48, yaw, 0, KERB + 0.2, 'fountain');
    }
    world.physics.addBox(Fn.x - 0.55, 0, Fn.z - 0.55, Fn.x + 0.55, KERB + 3.5, Fn.z + 0.55, 'fountain');
    S().disc(world, Fn.x, Fn.z, 1.5, KERB + 2.25, KERB + 2.6, 'fountain');
    // Palms in planters at the corners of the pale field, benches facing the fountain.
    for (const [px, pz] of [[sq.x0 + 12, sq.z0 + 14], [sq.x1 - 12, sq.z0 + 14], [sq.x0 + 12, sq.z1 - 12], [sq.x1 - 12, sq.z1 - 12], [Fn.x - 26, Fn.z], [Fn.x + 26, Fn.z]]) {
      world.addProp('planter', px, KERB, pz, 0, 1.2);
      world.addProp('palmTall', px, KERB + 0.7, pz, (px * 3) % 6, 0.9);
    }
    for (const [bx, bz, a] of [[Fn.x, Fn.z - 9, 0], [Fn.x, Fn.z + 9, PI], [Fn.x - 9, Fn.z, PI / 2], [Fn.x + 9, Fn.z, -PI / 2]]) world.addProp('bench', bx, KERB, bz, a, 1);
    // Street lamps round the square; bollards across its open front on Mission Street.
    for (let x = sq.x0 + 4; x <= sq.x1 - 4; x += 22) { world.addProp('streetlight', x, KERB, sq.z0 + 3, PI, 1); world.addProp('streetlight', x, KERB, sq.z1 - 3, 0, 1); }
    for (let z = sq.z0 + 26; z < sq.z1 - 10; z += 26) { world.addProp('streetlight', sq.x0 + 3, KERB, z, PI / 2, 1); world.addProp('streetlight', sq.x1 - 3, KERB, z, -PI / 2, 1); }
    for (let x = sq.x0 + 2; x <= sq.x1 - 2; x += 3) if (Math.abs(x - 1070) > 5) world.addProp('bollard', x, KERB, 189.6, 0, 1);

    // --- the bandstand: an octagonal platform on steps, eight columns, a tiled roof
    const Bd = Pz.band;
    const bctx = world.ctxAt(Bd.x, Bd.z);
    bctx.concrete.cylinder(Bd.x, KERB, Bd.z, Bd.r, Bd.r, Bd.h, 8, sc(0xe8dcc0), true, sc(0xd8cbb0));
    S().disc(world, Bd.x, Bd.z, Bd.r * 0.96, 0, KERB + Bd.h, 'stone');
    K().stairs(world, bctx.concrete, Bd.x + Bd.r - 0.4 + 2.4, Bd.z, 'w', 2.4, 2.4, KERB, KERB + Bd.h, sc(0xe8dcc0), { rails: false, tag: 'stairs' });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * PI * 2 + PI / 8;
      const cx = Bd.x + Math.cos(a) * (Bd.r - 0.4), cz = Bd.z + Math.sin(a) * (Bd.r - 0.4);
      S().drum(world, bctx.prop, cx, KERB + Bd.h, cz, 0.14, 3.0, 8, 0xf2efe6, 'pole');
      // A railing between the columns, except over the steps (east).
      const a2 = a + PI / 4;
      if (Math.abs(Math.atan2(Math.sin(a + PI / 8), Math.cos(a + PI / 8))) < 0.3) continue;
      const qx = Bd.x + Math.cos(a2) * (Bd.r - 0.4), qz = Bd.z + Math.sin(a2) * (Bd.r - 0.4);
      const mx = (cx + qx) / 2, mz = (cz + qz) / 2, len = Math.hypot(qx - cx, qz - cz);
      const ry = Math.atan2(-(qz - cz), qx - cx);
      bctx.prop.orientedBox(mx, mz, len / 2, 0.04, ry, KERB + Bd.h + 0.9, KERB + Bd.h + 0.98, VH.col(0xf2efe6));
      bctx.prop.orientedBox(mx, mz, len / 2, 0.02, ry, KERB + Bd.h + 0.1, KERB + Bd.h + 0.9, VH.col(0xc9a227));
      world.physics.addOrientedBox(mx, mz, len / 2, 0.1, ry, KERB + Bd.h, KERB + Bd.h + 0.98, 'railing', F().SOLID | F().SHOTS);
    }
    bctx.prop.cylinder(Bd.x, KERB + Bd.h + 3.0, Bd.z, Bd.r + 0.5, Bd.r + 0.5, 0.25, 8, VH.col(0xf2efe6), true);
    bctx.prop.cylinder(Bd.x, KERB + Bd.h + 3.25, Bd.z, Bd.r + 0.4, 0.2, 2.2, 8, VH.col(TERRACOTTA), false);
    bctx.screen.box(Bd.x - 0.15, KERB + Bd.h + 2.6, Bd.z - 0.15, Bd.x + 0.15, KERB + Bd.h + 2.95, Bd.z + 0.15, VH.col(0xfff1c8, 2), { bottom: true });
    // Music stands on the stage (solid little things).
    for (let k = 0; k < 4; k++) {
      const a = PI * 0.65 + k * 0.42, sx = Bd.x + Math.cos(a) * 2.4, sz = Bd.z + Math.sin(a) * 2.4;
      bctx.prop.box(sx - 0.03, KERB + Bd.h, sz - 0.03, sx + 0.03, KERB + Bd.h + 1.1, sz + 0.03, VH.col(0x2a2d33));
      bctx.prop.box(sx - 0.25, KERB + Bd.h + 1.1, sz - 0.03, sx + 0.25, KERB + Bd.h + 1.4, sz + 0.03, VH.col(0x2a2d33));
      K().block(world, sx - 0.25, KERB + Bd.h, sz - 0.1, sx + 0.25, KERB + Bd.h + 1.4, sz + 0.1, 'pole');
    }

    // --- festival bunting across the square, roof to roof, and strings of bulbs that light at night
    const flagC = [0xe8483a, 0xf0c040, 0x2f7f86, 0xffffff, 0x3d6b8f, 0xe86ab0];
    const bunting = (ax, ay, az, bx, by, bz, sag) => {
      const len = Math.hypot(bx - ax, bz - az), n = Math.round(len / 0.9);
      for (let i = 1; i < n; i++) {
        const t = i / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t, y = ay + (by - ay) * t - sag * 4 * t * (1 - t);
        const c2 = world.ctxAt(x, z);
        const yaw = Math.atan2(-(bz - az), bx - ax);
        c2.prop.orientedBox(x, z, 0.28, 0.01, yaw, y - 0.55, y - 0.05, VH.col(flagC[i % flagC.length]));
      }
      K().festoon(world, ax, ay + 0.05, az, bx, by + 0.05, bz, sag, [0xfff1c8, 0xffd890], 2.6);
    };
    for (const [z1, z2] of [[205, 225], [236, 256], [266, 286], [296, 314]]) bunting(Pz.wx1, KERB + 8.0, z1, Pz.ex0, KERB + 8.0, z2, 1.6);
    for (const [z1, z2] of [[205, 296], [296, 205]]) bunting(Pz.wx1, KERB + 8.6, z1, Pz.ex0, KERB + 8.6, z2, 2.2);

    // --- the church of San Albero and its bell tower
    const Ch = Pz.church;
    K().building(world, Ch.x0, Ch.z0, Ch.x1, Ch.z1, Ch.h, { wall: CHURCH, roof: 0x9a8e7a, style: 0, parapet: false, sides: { n: 'blank' } });
    const chctx = world.ctxAt((Ch.x0 + Ch.x1) / 2, (Ch.z0 + Ch.z1) / 2);
    K().gable(chctx.prop, Ch.x0 - 0.4, Ch.z0 + 0.4, Ch.x1 + 0.4, Ch.z1 + 0.4, KERB + Ch.h, Ch.rise, 'z', TERRACOTTA, CHURCH);
    // Tall arched windows down the sides (dark glass, lit warm at night).
    for (let z = Ch.z0 + 7; z < Ch.z1 - 4; z += 8) for (const x of [Ch.x0 - 0.04, Ch.x1]) glow(world, x, KERB + 4, z - 0.9, x + 0.04, KERB + 9.5, z + 0.9, 0xd8a050, 0.9);
    // The façade: a raised gable with scrolls, pilasters, the door, the rose window, a niche.
    const fz = Ch.z0;
    const mx = (Ch.x0 + Ch.x1) / 2;
    chctx.concrete.polygon([[Ch.x0, KERB + Ch.h, fz - 0.05], [mx, KERB + Ch.h + Ch.rise + 2.2, fz - 0.05], [Ch.x1, KERB + Ch.h, fz - 0.05]], sc(CHURCH));
    for (const [x0, x1] of [[Ch.x0 - 0.5, Ch.x0 + 0.9], [mx - 5.6, mx - 4.6], [mx + 4.6, mx + 5.6], [Ch.x1 - 0.9, Ch.x1 + 0.1]]) sbox(world, 'concrete', x0, KERB, fz - 0.6, x1, KERB + Ch.h + 0.6, fz, 0xe2d2a8, 'wall');
    draw(world, 'concrete', Ch.x0 - 0.6, KERB + Ch.h, fz - 0.7, Ch.x1 + 0.2, KERB + Ch.h + 0.6, fz, 0xe2d2a8, { bottom: true });
    chctx.prop.cylinder(mx, KERB + Ch.h + Ch.rise + 2.2, fz - 0.3, 0.12, 0.12, 1.4, 6, VH.col(0x2a2d33), true);
    chctx.prop.box(mx - 0.5, KERB + Ch.h + Ch.rise + 3.0, fz - 0.36, mx + 0.5, KERB + Ch.h + Ch.rise + 3.14, fz - 0.24, VH.col(0x2a2d33));
    // The door: two leaves under a round arch, and the steps up to it (solid).
    sbox(world, 'wood', mx - 1.8, KERB + 0.45, fz - 0.1, mx + 1.8, KERB + 5.0, fz, 0x5a3520, 'wall');
    for (let k = 0; k < 7; k++) {
      const a0 = (k / 7) * PI, am = ((k + 0.5) / 7) * PI;
      K().tiltBox(chctx.concrete, mx + Math.cos(am) * 2.1, KERB + 5.0 + Math.sin(am) * 2.0, fz - 0.2, 0.9, 0.5, 0.25, 0, 0, sc(0xe2d2a8));
      void a0;
    }
    for (let k = 0; k < 3; k++) sbox(world, 'concrete', mx - 4.2 + k * 0.3, KERB, fz - 2.4 + k * 0.7, mx + 4.2 - k * 0.3, KERB + 0.15 * (k + 1), fz, 0xd8cbb0, 'stairs');
    // The rose window (a glowing disc in a stone ring) and a niche with a statue above the door.
    const ry = KERB + 9.2;
    const rose = new THREE.CylinderGeometry(1.8, 1.8, 0.08, 16);
    rose.rotateX(PI / 2);
    const m4 = new THREE.Matrix4();
    chctx.screen.merge(rose, m4.makeTranslation(mx, ry, fz - 0.12), VH.col(0xffc870, 1.1));
    const ringG = new THREE.TorusGeometry(1.95, 0.22, 4, 16);
    chctx.concrete.merge(ringG, m4.makeTranslation(mx, ry, fz - 0.16), sc(0xe2d2a8));
    chctx.concrete.box(mx - 0.7, KERB + 12.6, fz - 0.4, mx + 0.7, KERB + 15.4, fz - 0.05, sc(0xcdbd98), { bottom: true });
    chctx.concrete.cylinder(mx, KERB + 12.7, fz - 0.55, 0.32, 0.25, 2.2, 8, sc(0xf4f1ea), true);
    K().sign(world, { x: mx, y: KERB + 6.0, z: fz - 0.22, yaw: PI, w: 4.6, h: 0.7, lines: ['IGLESIA DE SAN ALBERO'], style: 'plaque' });
    for (const x of [mx - 6.6, mx + 6.6]) wallLantern(world, x, KERB + 3.4, fz - 0.62, 0, -1);
    const tower = bellTower(world);

    // --- the market: three rows of striped stalls behind the church, bulbs strung over the aisles
    const Mk = Pz.market;
    const goodsSets = [[0xe8483a, 0xf0a030, 0x7ac04a], [0xd9e8f0, 0xb8c8d0, 0x9ab0c0], [0xf0d050, 0xe86a3a, 0x8a5aa0], [0x6a9a4a, 0xe8d0a0, 0xc04a3a]];
    const stripes = [0xe8483a, 0x2f7f86, 0xf0a030, 0x3d6b8f];
    let si = 0;
    for (const z of [350, 368, 386, 402]) {
      for (let x = Mk.x0 + 5; x < Mk.x1 - 3; x += 9) {
        stall(world, x, z, z === 402 ? PI : 0, stripes[si % 4], goodsSets[si % 4]);
        si++;
      }
    }
    for (const z of [359, 377, 394]) K().festoon(world, Mk.x0 + 1, KERB + 4.2, z, Mk.x1 - 1, KERB + 4.2, z, 0.5, [0xfff1c8, 0xffd24a, 0xff8a6a], 1.6);
    for (const [px, pz] of [[Mk.x0 + 0.5, 359], [Mk.x1 - 0.5, 359], [Mk.x0 + 0.5, 377], [Mk.x1 - 0.5, 377], [Mk.x0 + 0.5, 394], [Mk.x1 - 0.5, 394]]) {
      sbox(world, 'prop', px - 0.07, KERB, pz - 0.07, px + 0.07, KERB + 4.4, pz + 0.07, 0x5a5f66, 'pole');
    }
    K().sign(world, { x: (Mk.x0 + Mk.x1) / 2, y: KERB + 3.4, z: Mk.z0 - 2.5, yaw: PI, w: 7, h: 1.2, posts: true, lines: ['MERCADO DE PALOMA', 'Fish · Fruit · Flowers'], style: 'info' });

    // --- south-west of the church: two old houses and the lane between them with an arch
    townHouse(world, 990, 344, 1028, 410, 10.4, 0xe8c9a0, 'e', 0.52);
    townHouse(world, 1033, 344, 1055, 410, 8.2, 0xf4d9c6, 'w', 0.66);
    sbox(world, 'concrete', 1028, KERB + 4.2, 368, 1033, KERB + 6.0, 371, 0xd8c8a6, 'wall', { bottom: true });
    K().festoon(world, 1028, KERB + 6.4, 380, 1033, KERB + 6.4, 380, 0.2, [0xfff1c8], 1.0);
    for (let z = 350; z < 408; z += 14) world.addProp('streetlight', 1092, KERB, z, -PI / 2, 1);
    for (const z of [348, 380, 406]) world.addProp('streetlight', 1057, KERB, z, PI / 2, 1);

    return { yB: tower.yB, bell: tower.bell };
  }

  // -------------------------------------------------------------- the map
  if (VH.MapPainters) {
    VH.MapPainters.push((g, layout, o) => {
      const p = layout.plots;
      if (!p || !p.paloma_fort || !VH.Districts.owner('paloma_fort')) return;
      const R = o.R;
      const Fo = FORT;
      g.fillStyle = '#d8cdb4';
      R(990, 430, 1154, 586);
      g.fillStyle = '#7fae6a';
      R(1092, 440, 1150, 520);
      R(990, Fo.z1 + 2, 1154, 836);
      g.fillStyle = '#6a6d72';
      R(994, 438, 1052, 520);
      // Walls and bastions.
      g.fillStyle = '#bfae88';
      R(Fo.x0, Fo.z0, Fo.x1, Fo.z1);
      for (const [cx, cz] of [[Fo.x0, Fo.z0], [Fo.x1, Fo.z0], [Fo.x0, Fo.z1], [Fo.x1, Fo.z1]]) {
        // (the map canvas is in world metres)
        const r = Fo.bast * Math.SQRT2;
        if (!o.on || o.on(cx - r, cz - r, cx + r, cz + r)) {
          g.beginPath();
          g.moveTo(cx + r, cz);
          g.lineTo(cx, cz + r);
          g.lineTo(cx - r, cz);
          g.lineTo(cx, cz - r);
          g.closePath();
          g.fill();
        }
      }
      g.fillStyle = '#e2d4b0';
      R(Fo.x0 + Fo.t, Fo.z0 + Fo.t, Fo.x1 - Fo.t, Fo.z1 - Fo.tS);
      g.fillStyle = '#7fae6a';
      R(1086, 616, 1118, 680);
      g.fillStyle = '#efe4cc';
      R(FORT.museum.x0, FORT.museum.z0, FORT.museum.x1, FORT.museum.z1);
      g.fillStyle = '#f4f1ea';
      if (o.circle) o.circle(FORT.light.x, FORT.light.z, 4.5);
    });
  }

  // --------------------------------------------------------- moving parts
  /**
   * The lighthouse lamp (it turns, and at night its beams sweep the bay:
   * three flashes and a pause) and the powder store's bricks (there until
   * the story blows them out).
   */
  class OldPalomaLife {
    constructor(game) {
      this.game = game;
      const op = game.world && game.world.oldPaloma;
      this.ok = !!op;
      if (!this.ok) return;
      this.op = op;
      const Lh = FORT.light;
      const yT = KERB + Lh.shaft;
      // The lamp: a glowing glass drum and the lens inside it.
      const lampGeo = new THREE.CylinderGeometry(2.38, 2.38, 2.8, 16, 1, true);
      this.glassMat = new THREE.MeshBasicMaterial({ color: 0xfff1c0, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false });
      this.glass = new THREE.Mesh(lampGeo, this.glassMat);
      this.glass.position.set(Lh.x, yT + 2.0, Lh.z);
      this.glass.name = 'fort lighthouse glass';
      // The beams: two long soft cones back to back, turning about the tower.
      // (narrow at the lamp, wide out over the water; merged into one geometry)
      const cone = new THREE.CylinderGeometry(7, 0.4, 90, 12, 1, true);
      cone.translate(0, 45, 0);
      const gb = new VH.GeometryBuilder({});
      const m4 = new THREE.Matrix4();
      const white = VH.col(0xffffff);
      gb.merge(cone, m4.makeRotationZ(PI / 2), white);
      gb.merge(cone, m4.makeRotationZ(-PI / 2), white);
      const beamGeo = gb.build();
      // Bright at the lamp, fading to nothing out over the water (additive: dark adds nothing).
      const bp = beamGeo.attributes.position, bc = beamGeo.attributes.color;
      if (bc) for (let i = 0; i < bp.count; i++) { const k = Math.pow(Math.max(0, 1 - Math.abs(bp.getX(i)) / 90), 1.6); bc.setXYZ(i, k, k, k * 0.92); }
      this.beamMat = new THREE.MeshBasicMaterial({ color: 0xfff3c8, vertexColors: true, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
      this.beam = new THREE.Group();
      this.beam.position.set(Lh.x, yT + 2.0, Lh.z);
      this.beam.name = 'fort lighthouse beams';
      this.beam.add(new THREE.Mesh(beamGeo, this.beamMat));
      this.beam.visible = false;
      game.scene.add(this.glass, this.beam);
      this.t = 0;
      this._chk = 0;
      this._open = null;
      this._blastIdx = undefined;
      this._setBricks(false);
    }

    /** Are the powder store's bricks gone? From the blast in d27 on. */
    _bricksOpen() {
      const M = this.game.missions;
      if (!M) return false;
      const id = 'd27_the_powder_store';
      if (M.completed && M.completed[id]) return true;
      const run = M.run;
      if (!run || !run.m || run.m.id !== id) return false;
      if (this._blastIdx === undefined) {
        const st = run.m.steps || [];
        let fi = st.findIndex((s) => s && s.spawnCar === 'firecrest');
        if (fi < 0) fi = st.length;
        // The thump (a slowmo step just before the car) is when they go.
        if (fi > 0 && st[fi - 1] && st[fi - 1].slowmo !== undefined) fi -= 1;
        this._blastIdx = fi;
      }
      return Math.max(run.stepIndex || 0, run.checkpoint || 0) >= this._blastIdx;
    }

    _setBricks(open) {
      if (this._open === open) return;
      this._open = open;
      this.op.brickMesh.visible = !open;
      this.op.brickCol.flags = open ? 0 : F().ALL;
    }

    update(dt) {
      if (!this.ok) return;
      this.t += dt;
      this._chk -= dt;
      if (this._chk <= 0) {
        this._chk = 0.25;
        this._setBricks(this._bricksOpen());
      }
      const env = this.game.environment;
      const night = env ? env.nightFactor || 0 : 0;
      // A turn every 9 s; the lamp brightens in three quick pulses as the beams pass.
      this.beam.rotation.y = -this.t * ((PI * 2) / 9);
      const ph = (this.t % 9) / 9;
      const pulse = ph < 0.3 ? Math.max(0, Math.sin((ph / 0.3) * PI * 3)) : 0;
      this.glassMat.opacity = 0.25 + night * (0.35 + pulse * 0.4);
      this.beam.visible = night > 0.05;
      this.beamMat.opacity = night * (0.12 + pulse * 0.16);
    }

    reset() {
      this._open = null;
      this._blastIdx = undefined;
      if (this.ok) this._setBricks(this._bricksOpen());
    }
  }

  // -------------------------------------------------------------- register
  VH.Districts.register({
    id: D,
    name: 'Old Paloma',
    plots: ['paloma_fort', 'paloma_plaza'],
    build(world, layout) {
      const t0 = performance.now();
      if (!layout.plots || !layout.plots.paloma_fort || !VH.WNKit || !VH.SouthKit) return;
      S().withUndersides(() => {
        const fort = buildFort(world);
        const plaza = buildPlaza(world);
        world.oldPaloma = Object.assign({ plaza }, fort);
      });
      this.buildMs = Math.round(performance.now() - t0);
    },
    registerPlaces(world, places) {
      if (!world.oldPaloma) return;
      const add = (id, p) => {
        const def = places.defs && places.defs[id];
        places.add(id, Object.assign({ district: D, desc: def && def.desc }, p));
      };
      const Fo = FORT;
      const C = Fo.cottage;
      const P = Fo.powder;
      // The landmark: in the courtyard, where the crash tender parks.
      add('paloma_fort', { name: 'Fort San Paloma', x: Fo.gate.x + 10, z: 668, yaw: PI, kind: 'fort', landmark: true });
      // The story's spots (docs/DLC_BIBLE.md 6.2, js/data/dlc.js), exactly where their descriptions say.
      add('paloma_fort_gate', { name: 'Fort San Paloma, the landward gate', x: Fo.gate.x, z: Fo.z0 - 14, yaw: PI, kind: 'street' });
      add('fort_light', { name: 'The fort lighthouse, the blue door', x: C.door, z: C.z0 - 3.4, y: KERB, yaw: 0, kind: 'overlook' });
      add('powder_store', { name: 'The powder store', x: P.x, z: Fo.z1 - Fo.tS - 0.5, y: KERB, yaw: PI, kind: 'warehouse' });
      // Plaza Paloma.
      const Pz = PLAZA, Tw = Pz.tower, op = world.oldPaloma.plaza;
      add('paloma_plaza', { name: 'Plaza Paloma', x: 1070, z: 236, yaw: PI, kind: 'plaza', landmark: true });
      add('plaza_cafe', { name: 'Café Inés, Plaza Paloma', x: Pz.cafe.x0 + 4, z: 189.2, yaw: 0, kind: 'diner' });
      // In the belfry by the bell (the stair comes up in the corner beside it).
      add('bell_tower', { name: 'The bell tower of San Albero', x: (Tw.x0 + Tw.x1) / 2, z: (Tw.z0 + Tw.z1) / 2 + 2.0, y: op.yB, yaw: PI, kind: 'church' });
      // The flat roofs on the square's east side (they look straight across at the belfry).
      const er = Pz.east[3];
      add('plaza_roofs', { name: 'The roofs round Plaza Paloma', x: (Pz.ex0 + Pz.ex1) / 2, z: (er[0] + er[1]) / 2, y: KERB + er[2], yaw: -PI / 2, kind: 'rooftop', roof: true });
      const extra = places.extra[D];
      if (extra) {
        extra.push(
          { x: (Pz.church.x0 + Pz.church.x1) / 2, z: Pz.church.z0 - 4, yaw: 0, kinds: ['church', 'plaza', 'street'], name: 'The steps of San Albero' },
          { x: (Pz.market.x0 + Pz.market.x1) / 2, z: 359, yaw: 0, kinds: ['market', 'storefront', 'street'], name: 'Mercado de Paloma' },
          { x: Pz.band.x + 6.5, z: Pz.band.z + 4, yaw: -PI / 2, kinds: ['park', 'plaza'], name: 'The bandstand' },
          { x: Pz.fountain.x + 6, z: Pz.fountain.z - 7, yaw: PI, kinds: ['plaza', 'park', 'corner'], name: 'The fountain, Plaza Paloma' },
          { x: (Pz.wx0 + Pz.wx1) / 2, z: (Pz.west[3][0] + Pz.west[3][1]) / 2, y: KERB + Pz.west[3][2], yaw: PI / 2, kinds: ['rooftop'], name: 'A roof on Plaza Paloma', roof: true },
          { x: Fo.gate.x + 24, z: Fo.z0 + 3, y: TOP, yaw: PI, kinds: ['rooftop', 'overlook'], name: 'On the fort rampart', roof: true },
          { x: 1046, z: Fo.z0 - 70, yaw: PI / 2, kinds: ['parking', 'street'], name: 'The fort car park' },
          { x: 1070, z: Fo.z1 + 32, yaw: 0, kinds: ['pier', 'dock', 'overlook'], name: 'The old fort quay' },
          { x: Fo.museum.x1 + 2, z: 660, yaw: -PI / 2, kinds: ['storefront', 'museum'], name: 'The fort museum' },
        );
      }
    },
    System: OldPalomaLife,
  });
})();
