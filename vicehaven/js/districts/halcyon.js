/*
 * districts/halcyon.js — Halcyon University, the campus north-west of the
 * city between Northgate and the airport (VICEHAVEN 3.0).
 *
 *   halcyon_quad        the Quad: a lawn with cross paths, the History
 *                       building (Professor Quill's study window over its
 *                       steps), the Hall of Science, two lecture halls, two
 *                       dorm blocks and the Quills' faculty house; the main
 *                       gate on College Road
 *   halcyon_clocktower  the clock tower in the middle of the Quad, four lit
 *                       clock faces, a belfry and spire; the repairers'
 *                       scaffold up its south face (a stair to a deck
 *                       behind the clock, a hatch into the works)
 *   halcyon_library     the library on Westgate Parkway (columns, a
 *                       pediment, a dome) and the sports field beside it:
 *                       a running track round a football pitch, a stand,
 *                       floodlights, the field house
 *   campus_strip        bunting, café tables and bike racks along Varsity
 *                       Road by the student strip of cafés and bookshops
 *
 * Static parts are merged into the chunk builders (VH.WNKit).
 */
(function () {
  'use strict';

  const VH = window.VH;
  const K = () => VH.WNKit;
  const KERB = 0.15;
  const F = () => VH.COLLIDE;
  const D = 'halcyon';

  // ---------------------------------------------------------------- plan
  const Q = {
    x0: -353, x1: -103, z0: -1063, z1: -767,
    lawn: { x0: -300, x1: -156, z0: -1010, z1: -824 },
    path: { x: -228, w: 4, z: -915 },
    history: { x0: -340, x1: -252, z0: -1052, z1: -1024, h: 15 },
    science: { x0: -204, x1: -116, z0: -1052, z1: -1024, h: 15 },
    lectW: { x0: -345, x1: -312, z0: -1004, z1: -834, h: 13 },
    lectE: { x0: -144, x1: -111, z0: -1004, z1: -834, h: 13 },
    dorms: [{ x0: -345, x1: -275, z0: -815, z1: -779, h: 18 }, { x0: -262, x1: -192, z0: -815, z1: -779, h: 18 }],
    house: { x0: -152, x1: -128, z0: -806, z1: -784, h: 5.5 },
  };
  const TOWER = { x: -228, z: -915, half: 5, shaft: 26, stage: 34, belfry: 41, spire: 54, faceY: 30, faceR: 3.4 };
  const LIB = {
    plot: { x0: -625, x1: -367, z0: -1063, z1: -767 },
    b: { x0: -612, x1: -548, z0: -955, z1: -875, h: 16 },
    track: { cx: -455, z0: -975, z1: -855, rIn: 32, rOut: 40 },
    stand: { x0: -515, x1: -500, z0: -960, z1: -870 },
    fieldHouse: { x0: -472, x1: -438, z0: -1050, z1: -1032, h: 6 },
  };
  const STRIP = { x0: -357, x1: -103, z: -753 };

  const BRICK = 0x9a4a3a;
  const STONE = 0xe2d6bc;
  const SLATE = 0x4f565e;

  // --------------------------------------------------------------- pieces
  /** A brick college building: windows, stone bands, a slate roof. */
  function hall(world, r, o) {
    o = o || {};
    const W = K();
    const ctx = W.building(world, r.x0, r.z0, r.x1, r.z1, r.h, { wall: o.wall || BRICK, roof: 0x7d7a74, style: 1, ww: 0.42, wh: 0.62, bay: 3.2, floorH: 3.8, parapet: false });
    const st = VH.col(STONE);
    for (const y of [KERB + 0.9, KERB + 3.8]) ctx.prop.box(r.x0 - 0.12, y, r.z0 - 0.12, r.x1 + 0.12, y + 0.35, r.z1 + 0.12, st);
    ctx.prop.box(r.x0 - 0.2, KERB + r.h - 0.6, r.z0 - 0.2, r.x1 + 0.2, KERB + r.h, r.z1 + 0.2, st);
    const alongX = r.x1 - r.x0 >= r.z1 - r.z0;
    if (!o.flat) W.gable(ctx.prop, r.x0 - 0.3, r.z0 - 0.3, r.x1 + 0.3, r.z1 + 0.3, KERB + r.h, Math.min(r.x1 - r.x0, r.z1 - r.z0) * 0.32, alongX ? 'x' : 'z', SLATE, o.wall || BRICK);
    // Corner quoins.
    for (const x of [r.x0, r.x1]) for (const z of [r.z0, r.z1]) ctx.prop.box(x - 0.5, KERB, z - 0.5, x + 0.5, KERB + r.h, z + 0.5, st);
    return ctx;
  }

  /** A clock face (a lit disc with hands) on one side of the tower. n = outward normal (dx, dz). */
  let DISC = null;
  function clockFace(ctx, x, y, z, nx, nz, r) {
    if (!DISC) {
      DISC = new THREE.CylinderGeometry(1, 1, 1, 24);
      DISC.rotateX(Math.PI / 2);
    }
    const m = new THREE.Matrix4();
    const yaw = Math.atan2(nx, nz);
    m.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw), new THREE.Vector3(r + 0.35, r + 0.35, 0.12));
    ctx.prop.merge(DISC, m, VH.col(0x2b2f35));
    m.compose(new THREE.Vector3(x + nx * 0.08, y, z + nz * 0.08), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw), new THREE.Vector3(r, r, 0.08));
    ctx.screen.merge(DISC, m, VH.col(0xfff4dc, 1.25));
    // Hands at ten past ten; hour marks. u = the viewer's right on this face.
    const ux = nz, uz = -nx;
    const yawN = Math.atan2(-nz, nx); // turns the box's local X onto the normal
    const hand = (len, w, th) => {
      const px = x + nx * 0.2 + ux * Math.sin(th) * len * 0.5;
      const pz = z + nz * 0.2 + uz * Math.sin(th) * len * 0.5;
      K().tiltBox(ctx.prop, px, y + Math.cos(th) * len * 0.5, pz, 0.1, len, w, yawN, -th, 0x1b1d20);
    };
    hand(r * 0.85, 0.18, (2 / 12) * Math.PI * 2);
    hand(r * 0.6, 0.26, (10.17 / 12) * Math.PI * 2);
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      const px = x + nx * 0.14 + ux * Math.sin(a) * r * 0.86;
      const pz = z + nz * 0.14 + uz * Math.sin(a) * r * 0.86;
      const py = y + Math.cos(a) * r * 0.86;
      ctx.prop.box(px - 0.12, py - 0.12, pz - 0.12, px + 0.12, py + 0.12, pz + 0.12, VH.col(0x1b1d20));
    }
  }

  /** A quad (four corners, any order) lying flat at height y on a surface, facing up. */
  function flatQuad(surf, pts, y, col) {
    let area = 0;
    for (let i = 0; i < 4; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[(i + 1) % 4];
      area += ax * bz - bx * az;
    }
    const p = area > 0 ? pts.slice().reverse() : pts;
    surf.quad([p[0][0], y, p[0][1]], [p[1][0], y, p[1][1]], [p[2][0], y, p[2][1]], [p[3][0], y, p[3][1]], [0, 1, 0], col);
  }

  // ------------------------------------------------------------ the quad
  function buildQuad(world) {
    const W = K();
    W.pave(world, Q.x0, Q.z0, Q.x1, Q.z1, 0xd6cfbf, 'plazaTop');
    const L = Q.lawn;
    W.pave(world, L.x0, L.z0, L.x1, L.z1, 0xffffff, 'grassTop', KERB + 0.015);
    world.ctxAt(-228, -915).addLawn(L.x0, L.z0, L.x1, L.z1);
    // Cross paths (gravel) and a ring round the tower.
    const P = Q.path;
    W.pave(world, P.x - P.w / 2, Q.z0, P.x + P.w / 2, Q.z1, 0xe8dcc0, 'plazaTop', KERB + 0.02);
    W.pave(world, L.x0, P.z - P.w / 2, L.x1, P.z + P.w / 2, 0xe8dcc0, 'plazaTop', KERB + 0.02);
    W.pave(world, TOWER.x - 14, TOWER.z - 14, TOWER.x + 14, TOWER.z + 14, 0xe8dcc0, 'plazaTop', KERB + 0.022);
    // Buildings round it.
    hall(world, Q.history);
    hall(world, Q.science, { wall: 0xa85a42 });
    hall(world, Q.lectW, { wall: 0x8f4636 });
    hall(world, Q.lectE, { wall: 0x8f4636 });
    for (const d of Q.dorms) {
      const ctx = W.building(world, d.x0, d.z0, d.x1, d.z1, d.h, { wall: 0xc9a27a, roof: 0x7d7a74, style: 1, ww: 0.5, wh: 0.55, bay: 3.0, floorH: 3.4 });
      ctx.prop.box(d.x0 - 0.1, KERB + 3.4, d.z0 - 0.1, d.x1 + 0.1, KERB + 3.7, d.z1 + 0.1, VH.col(STONE));
      // A canopy over the door on the quad side.
      const mx = (d.x0 + d.x1) / 2;
      ctx.prop.box(mx - 4, KERB + 3.0, d.z0 - 2.4, mx + 4, KERB + 3.25, d.z0, VH.col(0x2f4f6f), { bottom: true });
      W.lamp(world, mx, d.z0 - 0.2, 0xfff1c8, 2.2, 0.2, KERB + 2.7);
    }
    // History building: wide stone steps up to the door on the quad side,
    // Professor Quill's open study window above, books on the sill.
    {
      const H = Q.history;
      const ctx = world.ctxAt((H.x0 + H.x1) / 2, H.z1);
      const sx = -296;
      W.stairs(world, ctx.prop, sx, H.z1 + 4.2, 'n', 4.2, 9, KERB, KERB + 1.2, STONE, { rails: false, tag: 'stone' });
      W.deck(world, ctx.prop, sx - 4.5, H.z1, sx + 4.5, H.z1 + 0.01, KERB + 1.2, STONE, 'stone', 1.2);
      ctx.prop.box(sx - 1.6, KERB + 1.2, H.z1 - 0.05, sx + 1.6, KERB + 4.6, H.z1 + 0.06, VH.col(0x3a2416));
      for (const x of [sx - 3.2, sx + 3.2]) {
        ctx.prop.cylinder(x, KERB + 1.2, H.z1 + 1.2, 0.4, 0.36, 5.4, 10, VH.col(STONE), true);
        world.physics.addBox(x - 0.4, 0, H.z1 + 0.8, x + 0.4, KERB + 6.6, H.z1 + 1.6, 'building');
      }
      ctx.prop.box(sx - 4.5, KERB + 6.6, H.z1, sx + 4.5, KERB + 7.3, H.z1 + 2, VH.col(STONE), { bottom: true });
      // The study window (first floor, to the left of the door), its sash up.
      const wx = sx - 8, wy = KERB + 7.6;
      ctx.screen.box(wx - 1.0, wy, H.z1 + 0.02, wx + 1.0, wy + 2.0, H.z1 + 0.06, VH.col(0xffd9a0, 1.0));
      ctx.prop.box(wx - 1.1, wy + 1.0, H.z1 + 0.06, wx + 1.1, wy + 2.1, H.z1 + 0.12, VH.col(0xf4f0e6));
      ctx.prop.box(wx - 1.3, wy - 0.15, H.z1, wx + 1.3, wy, H.z1 + 0.5, VH.col(STONE));
      const bookCols = [0xc8302c, 0x2f6f4f, 0x2f4f8f, 0xd9a12b, 0x6a3a6a, 0x3a3a3a];
      for (let k = 0; k < 7; k++) {
        const bx = wx - 0.95 + k * 0.27;
        const bh = 0.25 + ((k * 3) % 4) * 0.06;
        ctx.prop.box(bx, wy, H.z1 + 0.12, bx + 0.22, wy + bh, H.z1 + 0.42, VH.col(bookCols[k % bookCols.length]));
      }
      ctx.prop.box(wx + 0.2, wy + 0.4, H.z1 + 0.1, wx + 0.9, wy + 0.5, H.z1 + 0.45, VH.col(0x8a2a1a));
    }
    // The main gate on College Road: stone piers, an iron arch, the name.
    {
      const gx = P.x, gz = Q.z0 + 3;
      const ctx = world.ctxAt(gx, gz);
      for (const x of [gx - 7, gx + 7]) W.solid(world, ctx.prop, x - 1, KERB, gz - 1, x + 1, KERB + 4.5, gz + 1, STONE, null, 'wall');
      for (const x of [gx - 7, gx + 7]) ctx.screen.box(x - 0.35, KERB + 4.5, gz - 0.35, x + 0.35, KERB + 5.2, gz + 0.35, VH.col(0xfff1c8, 1.8));
      const iron = 0x22262b;
      for (let k = 0; k <= 8; k++) {
        const a0 = (k / 8) * Math.PI, a1 = ((k + 1) / 8) * Math.PI;
        if (k < 8) W.beam(ctx.prop, gx - Math.cos(a0) * 6, KERB + 5 + Math.sin(a0) * 2.5, gz, gx - Math.cos(a1) * 6, KERB + 5 + Math.sin(a1) * 2.5, gz, 0.14, iron);
      }
      W.sign(world, { x: gx, y: KERB + 6.0, z: gz - 0.12, yaw: Math.PI, w: 9, h: 1.0, lines: ['HALCYON UNIVERSITY'], style: 'plaque', oneSided: true, frame: iron });
      // Railings along College Road either side of the gate.
      VH.Landmarks.railing(world, ctx, Q.x0 + 2, gz, gx - 8, gz, KERB, { color: iron, height: 1.6 });
      VH.Landmarks.railing(world, ctx, gx + 8, gz, Q.x1 - 2, gz, KERB, { color: iron, height: 1.6 });
    }
    // The Quills' faculty house: white weatherboard, a gable, Milo's window with his poster.
    {
      const Hs = Q.house;
      const ctx = world.ctxAt(Hs.x0, Hs.z0);
      W.solid(world, ctx.b, Hs.x0, KERB, Hs.z0, Hs.x1, KERB + Hs.h, Hs.z1, 0xf1ece0, null, 'building');
      W.gable(ctx.prop, Hs.x0 - 0.5, Hs.z0, Hs.x1 + 0.5, Hs.z1, KERB + Hs.h, 3.2, 'z', 0x5a4a40, 0xf1ece0);
      for (let y = KERB + 0.5; y < KERB + Hs.h; y += 0.4) ctx.prop.box(Hs.x0 - 0.04, y, Hs.z0 - 0.04, Hs.x1 + 0.04, y + 0.04, Hs.z1 + 0.04, VH.col(0xdcd6c8));
      ctx.prop.box(Hs.x0 + 10, KERB, Hs.z0 - 0.06, Hs.x0 + 11.4, KERB + 2.3, Hs.z0, VH.col(0x2f6f4f));
      for (const wx of [Hs.x0 + 4, Hs.x0 + 18]) ctx.screen.box(wx - 1, KERB + 1.0, Hs.z0 - 0.06, wx + 1, KERB + 2.3, Hs.z0 - 0.02, VH.col(0xffd9a0, 0.6));
      // Milo's window upstairs in the gable: the Firecrest poster, red on cream.
      const mx = (Hs.x0 + Hs.x1) / 2, my = KERB + Hs.h + 1.0;
      ctx.screen.box(mx - 1, my - 0.6, Hs.z0 - 0.08, mx + 1, my + 0.7, Hs.z0 - 0.02, VH.col(0xffe8c0, 0.7));
      ctx.prop.box(mx - 0.7, my - 0.4, Hs.z0 - 0.12, mx + 0.7, my + 0.4, Hs.z0 - 0.09, VH.col(0xf4efe2));
      ctx.prop.box(mx - 0.55, my - 0.2, Hs.z0 - 0.15, mx + 0.55, my + 0.05, Hs.z0 - 0.12, VH.col(0xe0481c));
      ctx.prop.box(mx - 0.3, my + 0.05, Hs.z0 - 0.15, mx + 0.25, my + 0.2, Hs.z0 - 0.12, VH.col(0xe0481c));
      W.fence(world, Hs.x0 - 2, Hs.z0 - 6, Hs.x1 + 2, Hs.z0 - 6, [[Hs.x0 + 9, Hs.x0 + 12.4]], 'picket', 1.0);
      ctx.prop.cylinder(Hs.x1 + 1, KERB, Hs.z0 - 2, 0.25, 0.25, 1.1, 8, VH.col(0x2f4f8f), true);
    }
    // The clock tower.
    buildTower(world);
    // Trees, benches and lamps round the lawn.
    for (const [x, z] of [[-290, -1000], [-166, -1000], [-290, -834], [-166, -834], [-290, -950], [-166, -950], [-290, -880], [-166, -880]]) world.addProp(x % 2 ? 'tree' : 'treeB', x, KERB, z, 0, 1.2);
    for (const z of [-990, -960, -870, -840]) {
      world.addProp('streetlight', P.x - 3.2, KERB, z, Math.PI / 2, 0.8);
      world.addProp('bench', P.x + 3.4, KERB, z + 6, -Math.PI / 2, 1);
    }
    for (const x of [-290, -260, -196, -166]) world.addProp('streetlight', x, KERB, P.z - 3.2, 0, 0.8);
    for (const x of [-270, -186]) world.addProp('bench', x, KERB, P.z + 3.6, Math.PI, 1);
  }

  function buildTower(world) {
    const W = K();
    const T = TOWER;
    const ctx = world.ctxAt(T.x, T.z);
    const h = T.half;
    const st = VH.col(STONE);
    // Plinth, shaft (brick with stone corners), clock stage, belfry, spire.
    ctx.prop.box(T.x - h - 1, KERB, T.z - h - 1, T.x + h + 1, KERB + 1.2, T.z + h + 1, st);
    ctx.b.box(T.x - h, KERB + 1.2, T.z - h, T.x + h, KERB + T.shaft, T.z + h, VH.col(BRICK));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) ctx.prop.box(T.x + sx * h - 0.5, KERB + 1.2, T.z + sz * h - 0.5, T.x + sx * h + 0.5, KERB + T.shaft, T.z + sz * h + 0.5, st);
    for (let y = 8; y < T.shaft; y += 6) ctx.prop.box(T.x - h - 0.15, KERB + y, T.z - h - 0.15, T.x + h + 0.15, KERB + y + 0.4, T.z + h + 0.15, st);
    // Tall slit windows up the shaft.
    for (const [nx, nz] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      for (const y of [6, 13, 20]) {
        const fx = T.x + nx * (h + 0.02), fz = T.z + nz * (h + 0.02);
        ctx.prop.box(fx - (nz ? 0.5 : 0.03), KERB + y, fz - (nx ? 0.5 : 0.03), fx + (nz ? 0.5 : 0.03), KERB + y + 2.4, fz + (nx ? 0.5 : 0.03), VH.col(0x2a2f36));
      }
    }
    const H2 = h + 0.6;
    ctx.prop.box(T.x - H2, KERB + T.shaft, T.z - H2, T.x + H2, KERB + T.stage, T.z + H2, st);
    ctx.prop.box(T.x - H2 - 0.3, KERB + T.stage, T.z - H2 - 0.3, T.x + H2 + 0.3, KERB + T.stage + 0.6, T.z + H2 + 0.3, VH.col(0xcfc3a8));
    for (const [nx, nz] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) clockFace(ctx, T.x + nx * (H2 + 0.05), KERB + T.faceY, T.z + nz * (H2 + 0.05), nx, nz, T.faceR);
    // Belfry: four corner piers and openings, a bell inside.
    const bh = h - 0.4;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) ctx.prop.box(T.x + sx * bh - 1.2 * (sx > 0), KERB + T.stage + 0.6, T.z + sz * bh - 1.2 * (sz > 0), T.x + sx * bh + 1.2 * (sx < 0), KERB + T.belfry, T.z + sz * bh + 1.2 * (sz < 0), st);
    ctx.prop.box(T.x - bh, KERB + T.belfry - 1.2, T.z - bh, T.x + bh, KERB + T.belfry, T.z + bh, st);
    ctx.prop.cylinder(T.x, KERB + T.stage + 2.6, T.z, 1.5, 0.7, 2.4, 12, VH.col(0xb8902e), true);
    ctx.screen.box(T.x - 0.3, KERB + T.stage + 1.0, T.z - 0.3, T.x + 0.3, KERB + T.stage + 1.6, T.z + 0.3, VH.col(0xffe0a0, 1.4));
    ctx.prop.cylinder(T.x, KERB + T.belfry, T.z, h * 1.38, 0.15, T.spire - T.belfry, 4, VH.col(0x3f6a5a), true);
    ctx.prop.cylinder(T.x, KERB + T.spire, T.z, 0.12, 0.05, 2.2, 6, VH.col(0xd8c070), true);
    world.physics.addBox(T.x - h - 1, 0, T.z - h - 1, T.x + h + 1, KERB + 1.2, T.z + h + 1, 'building');
    world.physics.addBox(T.x - h, 0, T.z - h, T.x + h, KERB + T.stage, T.z + h, 'building');
    world.physics.addBox(T.x - H2, KERB + T.shaft, T.z - H2, T.x + H2, KERB + T.stage + 0.6, T.z + H2, 'building');
    world.beacons.push({ x: T.x, y: KERB + T.spire + 2.6, z: T.z });
    // Floodlights on the plinth corners light the tower at night.
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) ctx.screen.box(T.x + sx * (h + 0.7) - 0.25, KERB + 1.2, T.z + sz * (h + 0.7) - 0.25, T.x + sx * (h + 0.7) + 0.25, KERB + 1.6, T.z + sz * (h + 0.7) + 0.25, VH.col(0xfff4dc, 2));

    // The repairers' scaffold up the south face: a zig-zag stair in a frame,
    // planks, a deck under the clock and a hatch into the works.
    const topY = KERB + T.faceY - T.faceR - 1.0;
    const z0 = T.z + h + 1.1;
    const sf = W.stairFrame(world, ctx, T.x, z0, topY, 0x9aa0a6);
    W.deck(world, ctx.prop, sf.fx0, T.z + h, sf.fx1, z0 + 0.2, topY, 0xb8925a, 'plank', 0.15);
    W.deckRails(world, sf.fx0, T.z + h + 0.05, sf.fx1, sf.fz1, topY, [{ side: 's', a0: sf.fx0, a1: sf.fx1 }, { side: 'n', a0: sf.fx0, a1: sf.fx1 }], 0x9aa0a6);
    ctx.prop.box(T.x - 0.8, topY, T.z + h - 0.02, T.x + 0.8, topY + 1.6, T.z + h + 0.06, VH.col(0x3a2416));
    ctx.screen.box(T.x - 0.1, topY + 1.8, T.z + h + 0.06, T.x + 0.1, topY + 2.0, T.z + h + 0.2, VH.col(0xffe2a0, 2.5));
    // Scaffold tubes up the tower's south face beside the frame, and boards on the ground.
    for (const x of [sf.fx0 - 0.4, sf.fx1 + 0.4]) ctx.prop.box(x - 0.06, KERB, T.z + h + 0.4, x + 0.06, topY + 3, T.z + h + 0.52, VH.col(0x9aa0a6));
    for (let k = 0; k < 4; k++) ctx.prop.box(T.x + 7 + k * 0.05, KERB + k * 0.12, sf.fz1 + 2, T.x + 11, KERB + (k + 1) * 0.12, sf.fz1 + 2.3 + k * 0.05, VH.col(0xb8925a));
    world.towerScaffold = { foot: sf.foot, topY, x: T.x, z: (T.z + h + z0) / 2 };
    // Barriers round the foot and the NO ENTRY sign.
    const bz = sf.fz1 + 1.4;
    for (let x = sf.fx0; x < sf.fx1; x += 2.2) {
      if (Math.abs(x + 1.1 - sf.foot.x) < 1.3) continue;
      ctx.prop.box(x + 0.1, KERB + 0.4, bz - 0.04, x + 2.0, KERB + 0.9, bz + 0.04, VH.col(0xd23a3a));
      ctx.prop.box(x + 0.1, KERB, bz - 0.04, x + 0.2, KERB + 0.9, bz + 0.04, VH.col(0xd8d8d8));
    }
    W.sign(world, { x: T.x + 3, y: KERB + 1.6, z: bz + 0.1, yaw: 0, w: 1.6, h: 0.9, lines: ['NO ENTRY', 'Clock repairs'], style: 'info', oneSided: true, colors: { bg: ['#d23a3a', '#b82a2a'], fg: '#ffffff', bar: '#ffffff' } });
  }

  // ------------------------------------------------ library and the field
  function buildLibrary(world) {
    const W = K();
    const P = LIB.plot;
    W.pave(world, P.x0, P.z0, P.x1, P.z1, 0xd6cfbf, 'plazaTop');
    // Lawns round the library.
    W.pave(world, P.x0 + 4, P.z0 + 4, -530, LIB.b.z0 - 8, 0xffffff, 'grassTop', KERB + 0.015);
    W.pave(world, P.x0 + 4, LIB.b.z1 + 8, -530, P.z1 - 4, 0xffffff, 'grassTop', KERB + 0.015);
    const B = LIB.b;
    const ctx = hall(world, B, { wall: 0xd8ccb0, flat: true });
    // Portico on the west front: steps, columns, pediment.
    const px = B.x0, cz = (B.z0 + B.z1) / 2;
    W.stairs(world, ctx.prop, px - 6, cz, 'e', 5, 30, KERB, KERB + 1.5, STONE, { rails: false, tag: 'stone' });
    W.deck(world, ctx.prop, px - 1, cz - 15, px, cz + 15, KERB + 1.5, STONE, 'stone', 1.5);
    for (let z = cz - 13; z <= cz + 13.01; z += 3.7) {
      ctx.prop.cylinder(px - 0.8, KERB + 1.5, z, 0.7, 0.62, 10, 12, VH.col(0xf1ead8), true);
      world.physics.addBox(px - 1.5, 0, z - 0.7, px - 0.1, KERB + 11.5, z + 0.7, 'building');
    }
    ctx.prop.box(px - 1.8, KERB + 11.5, cz - 15, px, KERB + 13.2, cz + 15, VH.col(0xf1ead8), { bottom: true });
    W.gable(ctx.prop, px - 1.8, cz - 15, px, cz + 15, KERB + 13.2, 3.4, 'x', 0xf1ead8, 0xf1ead8);
    for (const z of [cz - 6, cz, cz + 6]) ctx.screen.box(px - 0.04, KERB + 2, z - 1.1, px - 0.01, KERB + 8, z + 1.1, VH.col(0xffd9a0, 0.6));
    W.sign(world, { x: px - 1.85, y: KERB + 12.35, z: cz, yaw: -Math.PI / 2, w: 22, h: 1.2, lines: ['HALCYON UNIVERSITY LIBRARY'], style: 'plaque', oneSided: true, colors: { bg: ['#f1ead8', '#e8e0cc'], fg: '#4a3a24', border: '#c8b890' } });
    // The dome on a drum.
    const dx = (B.x0 + B.x1) / 2 + 4, dz = cz;
    ctx.prop.cylinder(dx, KERB + B.h, dz, 11, 11, 5, 16, VH.col(0xf1ead8), true);
    ctx.prop.cylinder(dx, KERB + B.h + 5, dz, 11.4, 8.5, 3, 16, VH.col(0x6a9a8a), true);
    ctx.prop.cylinder(dx, KERB + B.h + 8, dz, 8.5, 4, 3.5, 16, VH.col(0x6a9a8a), true);
    ctx.prop.cylinder(dx, KERB + B.h + 11.5, dz, 4, 1.2, 1.5, 16, VH.col(0x6a9a8a), true);
    ctx.prop.cylinder(dx, KERB + B.h + 13, dz, 1.0, 1.0, 2.2, 8, VH.col(0xf1ead8), true);
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      ctx.screen.box(dx + Math.cos(a) * 11.02 - 0.5, KERB + B.h + 1.2, dz + Math.sin(a) * 11.02 - 0.5, dx + Math.cos(a) * 11.02 + 0.5, KERB + B.h + 3.8, dz + Math.sin(a) * 11.02 + 0.5, VH.col(0xffd9a0, 0.45));
    }
    for (const z of [cz - 20, cz + 20]) world.addProp('streetlight', px - 8, KERB, z, -Math.PI / 2, 1);
    for (const z of [P.z0 + 30, P.z0 + 70, P.z1 - 30, P.z1 - 70]) world.addProp('treeB', P.x0 + 20, KERB, z, 0, 1.3);

    // The sports field: a track round a pitch.
    const T = LIB.track;
    const fctx = world.ctxAt(T.cx, (T.z0 + T.z1) / 2);
    const red = VH.col(0xb8583e);
    W.pave(world, T.cx - T.rOut - 6, T.z0 - T.rOut - 6, T.cx + T.rOut + 6, T.z1 + T.rOut + 6, 0xffffff, 'grassTop', KERB + 0.016);
    world.ctxAt(T.cx, -915).addLawn(T.cx - T.rIn, T.z0, T.cx + T.rIn, T.z1);
    W.pave(world, T.cx - T.rOut, T.z0, T.cx - T.rIn, T.z1, 0xb8583e, 'plazaTop', KERB + 0.03);
    W.pave(world, T.cx + T.rIn, T.z0, T.cx + T.rOut, T.z1, 0xb8583e, 'plazaTop', KERB + 0.03);
    const N = 16;
    for (const [zc, s] of [[T.z0, -1], [T.z1, 1]]) {
      const ectx = world.ctxAt(T.cx, zc + s * 20);
      for (let k = 0; k < N; k++) {
        const a0 = (k / N) * Math.PI, a1 = ((k + 1) / N) * Math.PI;
        const P2 = (r, a) => [T.cx - Math.cos(a) * r, zc + s * Math.sin(a) * r];
        flatQuad(ectx.plazaTop, [P2(T.rOut, a0), P2(T.rOut, a1), P2(T.rIn, a1), P2(T.rIn, a0)], KERB + 0.03, red);
        // Lane lines.
        for (let l = 1; l < 4; l++) {
          const r = T.rIn + (l * (T.rOut - T.rIn)) / 4;
          flatQuad(ectx.marks, [P2(r - 0.06, a0), P2(r - 0.06, a1), P2(r + 0.06, a1), P2(r + 0.06, a0)], KERB + 0.04, VH.col(0xf4f4ef));
        }
      }
    }
    for (let l = 1; l < 4; l++) {
      const d = (l * (T.rOut - T.rIn)) / 4;
      W.mark(world, T.cx - T.rIn - d - 0.06, T.z0, T.cx - T.rIn - d + 0.06, T.z1, 0xf4f4ef, KERB + 0.04);
      W.mark(world, T.cx + T.rIn + d - 0.06, T.z0, T.cx + T.rIn + d + 0.06, T.z1, 0xf4f4ef, KERB + 0.04);
    }
    W.mark(world, T.cx + T.rIn, (T.z0 + T.z1) / 2 - 0.15, T.cx + T.rOut, (T.z0 + T.z1) / 2 + 0.15, 0xf4f4ef, KERB + 0.04);
    // The pitch: touchlines, halfway line, centre circle, goals.
    const px0 = T.cx - 26, px1 = T.cx + 26, pz0 = T.z0 - 24, pz1 = T.z1 + 24;
    for (const [a, b, c, d] of [[px0, pz0, px1, pz0 + 0.15], [px0, pz1 - 0.15, px1, pz1], [px0, pz0, px0 + 0.15, pz1], [px1 - 0.15, pz0, px1, pz1], [px0, -915.08, px1, -914.92]]) W.mark(world, a, b, c, d, 0xf4f4ef, KERB + 0.04);
    for (let k = 0; k < 24; k++) {
      const a0 = (k / 24) * Math.PI * 2, a1 = ((k + 1) / 24) * Math.PI * 2;
      const P2 = (r, a) => [T.cx + Math.cos(a) * r, -915 + Math.sin(a) * r];
      flatQuad(fctx.marks, [P2(9.0, a0), P2(9.0, a1), P2(9.15, a1), P2(9.15, a0)], KERB + 0.04, VH.col(0xf4f4ef));
    }
    for (const [gz, s] of [[pz0, 1], [pz1, -1]]) {
      const gctx = world.ctxAt(T.cx, gz);
      W.mark(world, T.cx - 20, gz + s * 16 - 0.08, T.cx + 20, gz + s * 16 + 0.08, 0xf4f4ef, KERB + 0.04);
      W.mark(world, T.cx - 20.08, Math.min(gz, gz + s * 16), T.cx - 19.92, Math.max(gz, gz + s * 16), 0xf4f4ef, KERB + 0.04);
      W.mark(world, T.cx + 19.92, Math.min(gz, gz + s * 16), T.cx + 20.08, Math.max(gz, gz + s * 16), 0xf4f4ef, KERB + 0.04);
      const w = VH.col(0xf4f4ef);
      for (const x of [T.cx - 3.66, T.cx + 3.66]) {
        gctx.prop.box(x - 0.06, KERB, gz - 0.06, x + 0.06, KERB + 2.44, gz + 0.06, w);
        world.physics.addBox(x - 0.08, 0, gz - 0.08, x + 0.08, KERB + 2.44, gz + 0.08, 'pole', F().SOLID | F().SHOTS);
      }
      gctx.prop.box(T.cx - 3.72, KERB + 2.38, gz - 0.06, T.cx + 3.72, KERB + 2.5, gz + 0.06, w);
      gctx.prop.box(T.cx - 3.66, KERB + 0.1, Math.min(gz, gz - s * 1.6), T.cx + 3.66, KERB + 2.4, Math.max(gz, gz - s * 1.6), VH.col(0xdcdcdc));
    }
    // The stand on the west straight: stepped seating people can climb.
    {
      const S = LIB.stand;
      const sctx = world.ctxAt(S.x1, (S.z0 + S.z1) / 2);
      const steps = 8;
      for (let i = 0; i < steps; i++) {
        const xa = S.x1 - (i + 1) * ((S.x1 - S.x0) / steps);
        const top = KERB + 0.4 * (i + 1);
        sctx.concrete.box(xa, KERB, S.z0, S.x1 - i * ((S.x1 - S.x0) / steps), top, S.z1, VH.col(0xc8c2b4));
        world.physics.addBox(xa, 0, S.z0, S.x1 - i * ((S.x1 - S.x0) / steps), top, S.z1, 'stone', F().SOLID | F().SHOTS);
        sctx.prop.box(xa + 0.3, top, S.z0 + 1, xa + 0.7, top + 0.12, S.z1 - 1, VH.col(i % 2 ? 0x2f4f8f : 0xd9a12b));
      }
      // A roof on posts.
      for (let z = S.z0; z <= S.z1 + 0.1; z += 15) sctx.prop.box(S.x0 + 0.2, KERB + 3.2, z - 0.15, S.x0 + 0.5, KERB + 7.6, z + 0.15, VH.col(0x5a5f66));
      K().tiltBox(sctx.prop, (S.x0 + S.x1) / 2 + 1, KERB + 7.2, (S.z0 + S.z1) / 2, S.x1 - S.x0 + 3, 0.2, S.z1 - S.z0 + 1, 0, 0, 0x2f4f8f);
      world.physics.addBox(S.x0 - 0.3, 0, S.z0, S.x0, KERB + 7.6, S.z1, 'wall');
    }
    // Floodlights at the four corners.
    for (const [x, z] of [[T.cx - T.rOut - 4, T.z0 - 20], [T.cx + T.rOut + 4, T.z0 - 20], [T.cx - T.rOut - 4, T.z1 + 20], [T.cx + T.rOut + 4, T.z1 + 20]]) {
      const lctx = world.ctxAt(x, z);
      lctx.prop.cylinder(x, KERB, z, 0.45, 0.3, 24, 8, VH.col(0x8f969c), true);
      const sx = x < T.cx ? 1 : -1;
      lctx.prop.box(x - 2.4, KERB + 24, z - 0.3 + 0.0, x + 2.4, KERB + 26.4, z + 0.3, VH.col(0x5a5f66));
      lctx.screen.box(x - 2.2 + sx * 0.0, KERB + 24.2, z - 0.36, x + 2.2, KERB + 26.2, z + 0.36, VH.col(0xf4f7ff, 2.4));
      world.physics.addBox(x - 0.45, 0, z - 0.45, x + 0.45, KERB + 24, z + 0.45, 'pole');
    }
    // The field house.
    const FH = LIB.fieldHouse;
    W.building(world, FH.x0, FH.z0, FH.x1, FH.z1, FH.h, { wall: BRICK, roof: 0x7d7a74, style: 1, ww: 0.5, wh: 0.4, bay: 3.2, floorH: FH.h });
    world.addProp('streetlight', FH.x1 + 3, KERB, FH.z1 + 3, 0, 1);
  }

  // -------------------------------------------------- the student strip
  function buildStrip(world) {
    const W = K();
    // Bunting across Varsity Road between the quad's kerb and the strip's.
    for (let x = STRIP.x0 + 20; x < STRIP.x1 - 10; x += 42) {
      const ctx = world.ctxAt(x, STRIP.z - 7);
      for (const z of [Q.z1 + 0.6, STRIP.z + 0.6]) ctx.prop.box(x - 0.08, KERB, z - 0.08, x + 0.08, KERB + 6.2, z + 0.08, VH.col(0x2f4f6f));
      W.festoon(world, x, KERB + 6, Q.z1 + 0.6, x, KERB + 6, STRIP.z + 0.6, 0.8, [0xffd24a, 0xff6a5a, 0x7ad7ff, 0x8ae06a], 1.2);
    }
    // Café tables with parasols and bike racks on the strip's pavement edge.
    for (let x = STRIP.x0 + 14, k = 0; x < STRIP.x1 - 8; x += 21, k++) {
      const z = STRIP.z + 1.6;
      const ctx = world.ctxAt(x, z);
      if (k % 2 === 0) {
        ctx.prop.cylinder(x, KERB, z, 0.4, 0.4, 0.72, 10, VH.col(0xf4f4ef), true);
        ctx.prop.box(x - 0.03, KERB + 0.72, z - 0.03, x + 0.03, KERB + 2.3, z + 0.03, VH.col(0xd8d8d8));
        ctx.prop.cylinder(x, KERB + 2.0, z, 1.3, 0.05, 0.5, 8, VH.col(k % 4 ? 0x2f6f4f : 0xc8302c), false);
        for (const dx of [-0.8, 0.8]) ctx.prop.box(x + dx - 0.2, KERB + 0.45, z - 0.2, x + dx + 0.2, KERB + 0.5, z + 0.2, VH.col(0x5a5f66));
        world.physics.addBox(x - 0.4, 0, z - 0.4, x + 0.4, KERB + 0.72, z + 0.4, 'metal', F().SOLID);
      } else {
        for (let i = 0; i < 4; i++) W.beam(ctx.prop, x - 1.5 + i, KERB, z, x - 1.5 + i, KERB + 0.8, z, 0.05, 0x8f969c);
        W.beam(ctx.prop, x - 1.6, KERB + 0.8, z, x + 1.6, KERB + 0.8, z, 0.05, 0x8f969c);
      }
    }
  }

  // -------------------------------------------------------------- the map
  if (VH.MapPainters) {
    VH.MapPainters.push((g, layout, o) => {
      const p = layout.plots;
      if (!p || !p.halcyon_quad) return;
      const R = o.R;
      const box = (r, col, sh) => K().mapBox(g, R, r.x0, r.z0, r.x1, r.z1, col, sh);
      box(Q, '#d6cfbf', false);
      box(Q.lawn, '#7fae6a', false);
      g.fillStyle = '#e8dcc0';
      R(Q.path.x - 2, Q.z0, Q.path.x + 2, Q.z1);
      R(Q.lawn.x0, Q.path.z - 2, Q.lawn.x1, Q.path.z + 2);
      for (const r of [Q.history, Q.science, Q.lectW, Q.lectE]) box(r, '#a85a42');
      for (const r of Q.dorms) box(r, '#c9a27a');
      box(Q.house, '#f1ece0');
      box({ x0: TOWER.x - 6, z0: TOWER.z - 6, x1: TOWER.x + 6, z1: TOWER.z + 6 }, '#e2d6bc');
      box(LIB.plot, '#d6cfbf', false);
      box(LIB.b, '#e8dcc0');
      g.fillStyle = '#6a9a8a';
      if (o.circle) o.circle(LIB.b.x0 + 36, (LIB.b.z0 + LIB.b.z1) / 2, 11);
      const T = LIB.track;
      g.fillStyle = '#b8583e';
      R(T.cx - T.rOut, T.z0, T.cx + T.rOut, T.z1);
      if (o.circle) { o.circle(T.cx, T.z0, T.rOut); o.circle(T.cx, T.z1, T.rOut); }
      g.fillStyle = '#7fae6a';
      R(T.cx - T.rIn, T.z0, T.cx + T.rIn, T.z1);
      if (o.circle) { o.circle(T.cx, T.z0, T.rIn); o.circle(T.cx, T.z1, T.rIn); }
      box(LIB.stand, '#2f4f8f');
    });
  }

  // -------------------------------------------------------------- register
  VH.Districts.register({
    id: D,
    name: 'Halcyon University',
    plots: ['halcyon_quad', 'halcyon_library'],
    build(world, layout) {
      const t0 = performance.now();
      if (!layout.plots || !layout.plots.halcyon_quad || !VH.WNKit) return;
      buildQuad(world);
      buildLibrary(world);
      buildStrip(world);
      world.halcyon = true;
      this.buildMs = Math.round(performance.now() - t0);
    },
    registerPlaces(world, places) {
      if (!world.halcyon) return;
      const add = (id, p) => {
        const def = places.defs && places.defs[id];
        places.add(id, Object.assign({ district: D, desc: def && def.desc }, p));
      };
      const H = Q.history;
      const S = world.towerScaffold;
      add('halcyon_quad', { name: 'The Quad, Halcyon University', x: Q.path.x - 6, z: Q.lawn.z0 + 12, yaw: 0, kind: 'park', landmark: true });
      add('halcyon_clocktower', { name: 'Halcyon Clock Tower', x: TOWER.x + 9, z: TOWER.z - 9, yaw: -Math.PI / 4, kind: 'park', landmark: true });
      add('halcyon_library', { name: 'Halcyon Library', x: LIB.b.x0 - 9, z: (LIB.b.z0 + LIB.b.z1) / 2, yaw: Math.PI / 2, kind: 'storefront', landmark: true });
      add('quill_study', { name: 'The History building steps', x: -296, z: H.z1 + 6, yaw: Math.PI, kind: 'storefront' });
      add('quill_house', { name: "The Quills' house", x: (Q.house.x0 + Q.house.x1) / 2, z: Q.house.z0 - 8, yaw: 0, kind: 'apartment_front' });
      add('campus_strip', { name: 'The student strip, Varsity Road', x: -230, z: STRIP.z + 2.5, yaw: 0, kind: 'street' });
      add('halcyon_field', { name: 'The university sports field', x: LIB.track.cx - LIB.track.rOut - 3, z: -915, yaw: Math.PI / 2, kind: 'park' });
      if (S) {
        add('clocktower_scaffold', { name: 'The clock tower scaffold', x: S.foot.x - 1, z: S.foot.z + 3, yaw: Math.PI, kind: 'construction' });
        add('clocktower_ledge', { name: 'The top of the scaffold, behind the clock face', x: S.x + 1.5, z: S.z, y: S.topY, yaw: Math.PI, kind: 'rooftop' });
      }
      const extra = places.extra[D];
      if (extra) {
        extra.push(
          { x: (Q.dorms[0].x0 + Q.dorms[0].x1) / 2, z: Q.dorms[0].z0 - 5, yaw: 0, kinds: ['apartment_front', 'street'], name: 'Founders Hall dorm' },
          { x: (Q.dorms[1].x0 + Q.dorms[1].x1) / 2, z: Q.dorms[1].z0 - 5, yaw: 0, kinds: ['apartment_front', 'motel'], name: 'Meridian Hall dorm' },
          { x: Q.lectE.x0 - 4, z: -950, yaw: Math.PI / 2, kinds: ['office', 'storefront'], name: 'The east lecture hall' },
          { x: Q.lectW.x1 + 4, z: -880, yaw: -Math.PI / 2, kinds: ['office', 'storefront'], name: 'The west lecture hall' },
          { x: Q.path.x, z: Q.z0 + 8, yaw: Math.PI, kinds: ['corner', 'street'], name: 'The university gate' },
          { x: -260, z: -930, yaw: 0, kinds: ['park', 'overlook'], name: 'On the Quad lawn' },
          { x: LIB.fieldHouse.x1 + 4, z: LIB.fieldHouse.z1 + 4, yaw: 0, kinds: ['garage', 'warehouse', 'parking'], name: 'The field house' },
          { x: LIB.stand.x0 + 4, z: -915, y: KERB + 1.6, yaw: Math.PI / 2, kinds: ['park', 'overlook'], name: 'The stand' },
          { x: -150, z: STRIP.z + 2.5, yaw: 0, kinds: ['street', 'diner', 'bar'], name: 'Varsity Road cafés' },
        );
      }
    },
  });
})();
