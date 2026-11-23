/*
 * districts/country-kit.js — shared helpers for the VICEHAVEN 4.0 country
 * landmarks (Haverly Farms and Redwater): post-and-rail fences, hedges,
 * bales, picnic tables, parked tractors and trailers, polytunnels, timber
 * buildings under pitched roofs, pumpkins, scarecrows, animals, ponds with
 * reed banks.
 *
 * Like VH.WNKit (which it uses), everything is merged into the chunk
 * builders (world.ctxAt) and given colliders; nothing here makes a mesh of
 * its own except a pond's water. Small things go on the detail surfaces
 * (hidden beyond 320 m). Exposed as VH.CountryKit.
 */
(function () {
  'use strict';

  const VH = window.VH;
  const KERB = 0.15;
  const F = () => VH.COLLIDE;
  const W = () => VH.WNKit;

  const _m = new THREE.Matrix4();
  const _q = new THREE.Quaternion();
  const _q2 = new THREE.Quaternion();
  const _v = new THREE.Vector3();
  const _s = new THREE.Vector3();
  const Y1 = new THREE.Vector3(0, 1, 0);
  const Z1 = new THREE.Vector3(0, 0, 1);
  let CYL = null;
  const cyl = () => CYL || (CYL = new THREE.CylinderGeometry(1, 1, 1, 12, 1, false));
  let SPH = null;
  const sph = () => SPH || (SPH = new THREE.SphereGeometry(1, 7, 4));

  /** Local frame at (x, z) turned yaw: f is forward (sin yaw, cos yaw), r is to the right. */
  function frame(x, z, yaw) {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    return (f, r) => [x + r * c + f * s, z - r * s + f * c];
  }

  /** A wheel (a short cylinder lying on its side, axle across yaw) merged into a surface. */
  function wheel(surf, x, y, z, r, w, yaw, hex) {
    _q.setFromAxisAngle(Y1, yaw);
    _q2.setFromAxisAngle(Z1, Math.PI / 2);
    _q.multiply(_q2);
    _v.set(x, y, z);
    _s.set(r, w, r);
    _m.compose(_v, _q, _s);
    surf.merge(cyl(), _m, Array.isArray(hex) ? hex : VH.col(hex));
  }

  /** A squashed sphere (a pumpkin, a bush, a hub) merged into a surface. */
  function blob(surf, x, y, z, rx, ry, rz, hex) {
    _q.identity();
    _v.set(x, y, z);
    _s.set(rx, ry, rz);
    _m.compose(_v, _q, _s);
    surf.merge(sph(), _m, Array.isArray(hex) ? hex : VH.col(hex));
  }

  /** Call fn(a0, a1) for each piece of [a0, a1] no longer than `max` metres. */
  function pieces(a0, a1, max, fn) {
    const n = Math.max(1, Math.ceil((a1 - a0) / max - 1e-6));
    for (let i = 0; i < n; i++) fn(a0 + ((a1 - a0) * i) / n, a0 + ((a1 - a0) * (i + 1)) / n);
  }

  /**
   * Bare ground on the slab: tilled earth, packed dirt and tracks (the
   * asphalt grain, browned), gravel and sand (flat paint), straw and dry
   * grass (the grass, yellowed). kind is one of GROUND's keys.
   */
  const GROUND = {
    earth: ['asphaltTop', 0x6b4f35, 4.5], dirt: ['asphaltTop', 0xa4865c, 4.5], track: ['asphaltTop', 0x9a8466, 4.4],
    // The flat ones paint on the road-marking surface: its stronger polygon offset keeps them over the grass from afar.
    gravel: ['marks', 0x9c9486, 1], sand: ['marks', 0xc9b07a, 1], chaff: ['marks', 0xcdb47c, 1], // chaff: a trodden path of earth and chopped straw
    soil: ['marks', 0x9a7c58, 1], arena: ['marks', 0xbe9c70, 1], // soil: a beaten dirt track; arena: a raked riding ring
    straw: ['grassTop', 0xffe6a0, 1.1], meadow: ['grassTop', 0xf0f4e0, 1],
  };
  function ground(world, x0, z0, x1, z1, kind, y) {
    const g = GROUND[kind] || GROUND.dirt;
    const col = VH.col(g[1], g[2]);
    // Layers lie a few millimetres apart (y); the gaps are tripled so they don't flicker seen from a few hundred metres up.
    const yy = KERB + ((y === undefined ? KERB + 0.01 : y) - KERB) * 3;
    W().tiles(world, x0, z0, x1, z1, (a, b, c, d, ctx) => ctx[g[0]].topRect(a, b, c, d, yy, col, 6));
  }

  /** Split [a0, a1] round the gaps [[g0, g1], ...]. */
  function cut(a0, a1, gaps) {
    let out = [[a0, a1]];
    for (const [g0, g1] of gaps || []) {
      const next = [];
      for (const [p, q] of out) {
        if (g1 <= p || g0 >= q) next.push([p, q]);
        else {
          if (g0 > p) next.push([p, g0]);
          if (g1 < q) next.push([g1, q]);
        }
      }
      out = next;
    }
    return out.filter(([p, q]) => q - p > 0.3);
  }

  /**
   * A post-and-rail fence along an axis-aligned line, with gaps. Solid to
   * 1.3 m (too tall to vault: a paddock keeps people in or out of it).
   * o = { h (top rail, default 1.25), hex, y (base, default KERB), rails }.
   */
  function postRail(world, x0, z0, x1, z1, gaps, o) {
    o = o || {};
    const alongX = Math.abs(x1 - x0) >= Math.abs(z1 - z0);
    const c = alongX ? z0 : x0;
    const a0 = alongX ? Math.min(x0, x1) : Math.min(z0, z1);
    const a1 = alongX ? Math.max(x0, x1) : Math.max(z0, z1);
    const y = o.y === undefined ? KERB : o.y;
    const H = o.h || 1.25;
    const col = VH.col(o.hex || 0xc8a47a);
    const rails = o.rails || [0.45, H - 0.12];
    for (const [p0, p1] of cut(a0, a1, gaps)) {
      pieces(p0, p1, 60, (a, b) => {
        const ctx = world.ctxAt(alongX ? (a + b) / 2 : c, alongX ? c : (a + b) / 2);
        const R = (q0, q1, cc0, cc1, ya, yb) => (alongX ? [q0, ya, cc0, q1, yb, cc1] : [cc0, ya, q0, cc1, yb, q1]);
        for (const ry of rails) ctx.detailWood.box(...R(a, b, c - 0.05, c + 0.05, y + ry, y + ry + 0.12), col);
        for (let p = a; p <= b + 0.01; p += 2.4) ctx.detailWood.box(...R(Math.min(p, b) - 0.07, Math.min(p, b) + 0.07, c - 0.07, c + 0.07, y - 0.05, y + H + 0.05), col);
      });
      const bx = alongX ? [p0, 0, c - 0.1, p1, y + H + 0.05, c + 0.1] : [c - 0.1, 0, p0, c + 0.1, y + H + 0.05, p1];
      world.physics.addBox(bx[0], bx[1], bx[2], bx[3], bx[4], bx[5], 'fence', F().SOLID | F().CAMERA);
    }
  }

  /** A clipped hedge along an axis-aligned line (solid), with gaps. */
  function hedge(world, x0, z0, x1, z1, gaps, h, t, hex) {
    const alongX = Math.abs(x1 - x0) >= Math.abs(z1 - z0);
    const c = alongX ? z0 : x0;
    const a0 = alongX ? Math.min(x0, x1) : Math.min(z0, z1);
    const a1 = alongX ? Math.max(x0, x1) : Math.max(z0, z1);
    const H = h || 1.3, T = (t || 1.0) / 2;
    const col = VH.col(hex || 0x3f6a30);
    for (const [p0, p1] of cut(a0, a1, gaps)) {
      pieces(p0, p1, 90, (a, b) => {
        const bx = alongX ? [a, KERB, c - T, b, KERB + H, c + T] : [c - T, KERB, a, c + T, KERB + H, b];
        world.ctxAt((bx[0] + bx[3]) / 2, (bx[2] + bx[5]) / 2).hedge.box(bx[0], bx[1], bx[2], bx[3], bx[4], bx[5], col);
        world.physics.addBox(bx[0], 0, bx[2], bx[3], bx[4], bx[5], 'hedge', F().SOLID | F().SHOTS);
      });
    }
  }

  /** A rectangular straw bale (or a stack face) as a solid box: Jay climbs bales. */
  function bale(world, x0, y0, z0, x1, y1, z1, hex) {
    const ctx = world.ctxAt((x0 + x1) / 2, (z0 + z1) / 2);
    const col = VH.col(hex || 0xdcc47a, 1);
    ctx.detailMatte.box(x0, y0, z0, x1, y1, z1, col, { bottom: false });
    // Twine bands.
    const alongX = x1 - x0 >= z1 - z0;
    for (const t of [0.3, 0.7]) {
      if (alongX) {
        const x = x0 + (x1 - x0) * t;
        ctx.detailMatte.box(x - 0.03, y0, z0 - 0.01, x + 0.03, y1 + 0.01, z1 + 0.01, VH.col(0xa8843a));
      } else {
        const z = z0 + (z1 - z0) * t;
        ctx.detailMatte.box(x0 - 0.01, y0, z - 0.03, x1 + 0.01, y1 + 0.01, z + 0.03, VH.col(0xa8843a));
      }
    }
    world.physics.addBox(x0, Math.min(0, y0), z0, x1, y1, z1, 'crate', F().SOLID | F().SHOTS);
  }

  /** A timber picnic table with its benches (one solid block: Jay climbs onto it). */
  function picnicTable(world, x, z, yaw, hex) {
    const ctx = world.ctxAt(x, z);
    const col = VH.col(hex || 0x9a7448);
    const P = frame(x, z, yaw);
    const ob = (f, r, hf, hr, y0, y1, c) => {
      const [px, pz] = P(f, r);
      ctx.detail.orientedBox(px, pz, hr, hf, yaw, y0, y1, c || col);
    };
    ob(0, 0, 0.4, 0.9, KERB + 0.72, KERB + 0.78); // the top
    for (const s of [-1, 1]) {
      ob(s * 0.7, 0, 0.14, 0.9, KERB + 0.42, KERB + 0.47); // benches
      ob(0, s * 0.7, 0.75, 0.05, KERB, KERB + 0.72); // A-frame legs (merged as slabs)
    }
    world.physics.addOrientedBox(x, z, 0.92, 0.86, yaw, 0, KERB + 0.78, 'bench', F().SOLID | F().SHOTS);
  }

  /** A market parasol on a pole. */
  function parasol(world, x, z, hex, h) {
    const ctx = world.ctxAt(x, z);
    const H = h || 2.4;
    ctx.detail.cylinder(x, KERB, z, 0.04, 0.04, H, 6, VH.col(0xd8d8d0), true);
    ctx.detail.cylinder(x, KERB + H - 0.5, z, 1.5, 0.05, 0.55, 8, VH.col(hex || 0xc8402c), true);
    world.physics.addBox(x - 0.08, 0, z - 0.08, x + 0.08, KERB + H, z + 0.08, 'pole', F().SOLID | F().SHOTS);
  }

  /** A parked farm tractor (static, solid). Faces yaw. */
  function tractor(world, x, z, yaw, hex) {
    const ctx = world.ctxAt(x, z);
    const s = ctx.detail;
    const body = VH.col(hex || 0x3f7a3a);
    const dark = VH.col(0x2b2d30);
    const P = frame(x, z, yaw);
    const ob = (f, r, hf, hr, y0, y1, c) => {
      const [px, pz] = P(f, r);
      s.orientedBox(px, pz, hr, hf, yaw, y0, y1, c);
    };
    ob(0.1, 0, 1.7, 0.45, KERB + 0.5, KERB + 1.0, dark); // chassis
    ob(1.1, 0, 0.9, 0.5, KERB + 0.9, KERB + 1.75, body); // bonnet
    ob(2.02, 0, 0.04, 0.42, KERB + 0.95, KERB + 1.65, VH.col(0x9aa0a6)); // grille
    ob(-0.65, 0, 0.85, 0.8, KERB + 1.0, KERB + 1.55, body); // fenders and cab floor
    ob(-0.65, 0, 0.8, 0.72, KERB + 1.55, KERB + 2.75, VH.col(0x2a3a44)); // glass cab
    for (const [f, r] of [[0.13, 0.7], [0.13, -0.7], [-1.43, 0.7], [-1.43, -0.7]]) ob(f, r, 0.04, 0.04, KERB + 1.55, KERB + 2.8, body); // cab pillars
    ob(-0.65, 0, 0.9, 0.82, KERB + 2.75, KERB + 2.92, body); // roof
    const [ex, ez] = P(1.5, 0.32);
    s.cylinder(ex, KERB + 1.75, ez, 0.06, 0.06, 1.15, 6, dark, true);
    const tyre = VH.col(0x1b1d20);
    const hub = VH.col(0xe0b12e);
    for (const r of [-1, 1]) {
      const [wx, wz] = P(-1.0, r * 1.0);
      wheel(s, wx, KERB + 0.85, wz, 0.85, 0.5, yaw, tyre);
      const [hx, hz] = P(-1.0, r * 1.26);
      wheel(s, hx, KERB + 0.85, hz, 0.42, 0.04, yaw, hub);
      const [fx, fz] = P(1.45, r * 0.82);
      wheel(s, fx, KERB + 0.5, fz, 0.5, 0.32, yaw, tyre);
      const [gx, gz] = P(1.45, r * 0.99);
      wheel(s, gx, KERB + 0.5, gz, 0.24, 0.04, yaw, hub);
    }
    const [cx, cz] = P(0.15, 0);
    world.physics.addOrientedBox(cx, cz, 1.3, 1.95, yaw, 0, KERB + 2.92, 'metal', F().ALL);
  }

  /** A farm trailer behind (or beside) a tractor: a flat bed with sides; o.bales loads it with straw bales (a hay ride). */
  function trailer(world, x, z, yaw, o) {
    o = o || {};
    const ctx = world.ctxAt(x, z);
    const s = ctx.detail;
    const P = frame(x, z, yaw);
    const L = o.len || 5, Wd = 2.3;
    const col = VH.col(o.hex || 0xb8402c);
    const ob = (f, r, hf, hr, y0, y1, c) => {
      const [px, pz] = P(f, r);
      s.orientedBox(px, pz, hr, hf, yaw, y0, y1, c);
    };
    ob(0, 0, L / 2, Wd / 2, KERB + 0.85, KERB + 1.05, col); // bed
    for (const r of [-1, 1]) ob(0, r * (Wd / 2 - 0.04), L / 2, 0.04, KERB + 1.05, KERB + 1.55, col); // sides
    ob(-L / 2 + 0.04, 0, 0.04, Wd / 2, KERB + 1.05, KERB + 1.55, col); // tailboard
    ob(L / 2 + 0.7, 0, 0.7, 0.06, KERB + 0.7, KERB + 0.82, VH.col(0x2b2d30)); // drawbar
    for (const r of [-1, 1]) {
      const [wx, wz] = P(0, r * (Wd / 2 - 0.15));
      wheel(s, wx, KERB + 0.5, wz, 0.5, 0.34, yaw, VH.col(0x1b1d20));
    }
    world.physics.addOrientedBox(x, z, Wd / 2, L / 2, yaw, 0, KERB + 1.55, 'metal', F().ALL);
    const [dx, dz] = P(L / 2 + 0.7, 0);
    world.physics.addOrientedBox(dx, dz, 0.12, 0.7, yaw, 0, KERB + 0.82, 'metal', F().SOLID);
    if (o.bales) {
      // Bales along both sides as seats (solid, people sit on hay rides).
      const by = KERB + 1.05;
      for (const r of [-1, 1]) {
        const [bx, bz] = P(0, r * 0.62);
        const hl = L / 2 - 0.25;
        s.orientedBox(bx, bz, 0.42, hl, yaw, by, by + 0.45, VH.col(0xdcc47a));
        world.physics.addOrientedBox(bx, bz, 0.42, hl, yaw, by, by + 0.45, 'crate', F().SOLID);
      }
    }
  }

  /**
   * A polytunnel: a half-round tunnel of white plastic over hoops, running
   * along X from x0 to x1, centred on z = cz, `w` wide. Closed ends with a
   * door. Solid (stepped colliders that hug the arch).
   */
  function polytunnel(world, x0, x1, cz, w, hex) {
    const R = w / 2, H = R * 0.9;
    const col = VH.col(hex || 0xeef0e6);
    const rib = VH.col(0x9aa0a6);
    const N = 8;
    const pt = (k, x) => {
      const a = (k / N) * Math.PI;
      return [x, KERB + Math.sin(a) * H, cz + Math.cos(a) * R];
    };
    pieces(x0, x1, 40, (a, b) => {
      const ctx = world.ctxAt((a + b) / 2, cz);
      for (let k = 0; k < N; k++) {
        const p0 = pt(k, a), p1 = pt(k + 1, a), q0 = pt(k, b), q1 = pt(k + 1, b);
        ctx.prop.polygon([p0, q0, q1, p1], col); // the outside
        ctx.prop.polygon([p1, q1, q0, p0], VH.colMul(col, 0.85)); // the inside (seen through the doorway)
      }
      for (let x = a + 1.5; x < b; x += 3) {
        for (let k = 0; k < N; k++) {
          const p0 = pt(k, x), p1 = pt(k + 1, x);
          W().beam(ctx.detail, p0[0], p0[1], p0[2] + (p0[2] - cz) * 0.01, p1[0], p1[1], p1[2] + (p1[2] - cz) * 0.01, 0.06, rib);
        }
      }
    });
    // The ends: a fan of the arch, with a timber door frame.
    for (const [x, out] of [[x0, -1], [x1, 1]]) {
      const ctx = world.ctxAt(x, cz);
      for (let k = 0; k < N; k++) {
        const p0 = pt(k, x), p1 = pt(k + 1, x), c = [x, KERB, cz];
        ctx.prop.polygon(out > 0 ? [c, p0, p1] : [c, p1, p0], col);
      }
      ctx.detailWood.box(x + out * 0.02 - 0.06, KERB, cz - 1.0, x + out * 0.02 + 0.06, KERB + 2.2, cz + 1.0, VH.col(0x8a6a48));
      ctx.detail.box(x + out * 0.07 - 0.02, KERB, cz - 0.9, x + out * 0.07 + 0.02, KERB + 2.1, cz + 0.9, VH.col(0xd8dcd0));
    }
    // Colliders: the arch in four steps (each covers the curve where it is lower).
    const steps = [[1.0, 0.3], [0.95, 0.48], [0.875, 0.72], [0.7, 1.0]];
    for (const [dk, yk] of steps) world.physics.addBox(x0 - 0.1, 0, cz - R * dk, x1 + 0.1, KERB + H * yk + 0.05, cz + R * dk, 'building', F().ALL);
  }

  /**
   * A timber-clad building with window grids (they light up at night) under
   * a pitched metal roof. r = { x0, z0, x1, z1 }, o = { h (eaves), rise,
   * wall, roof, axis ('x' | 'z': the ridge), sides, style }. Returns the ctx.
   */
  function shed(world, r, o) {
    o = o || {};
    const h = o.h || 4;
    const ctx = W().building(world, r.x0, r.z0, r.x1, r.z1, h, {
      wall: o.wall || 0x4a3a2c, roof: o.roof || 0x5c5f63, style: o.style === undefined ? 1 : o.style, parapet: false, gravel: false,
      bay: o.bay || 3.6, floorH: o.floorH || Math.min(h, 3.6), ww: o.ww || 0.42, wh: o.wh || 0.5, sides: o.sides, seed: o.seed,
    });
    const axis = o.axis || (r.x1 - r.x0 >= r.z1 - r.z0 ? 'x' : 'z');
    const span = axis === 'x' ? r.z1 - r.z0 : r.x1 - r.x0;
    const rise = o.rise === undefined ? span * 0.3 : o.rise;
    W().gable(ctx.prop, r.x0, r.z0, r.x1, r.z1, KERB + h, rise, axis, o.roof || 0x5c5f63, o.wall || 0x4a3a2c);
    // A low roof's eaves are within reach: solid out to the overhang.
    // (The roof slabs are 0.25 m thick and tilted, so their lower edge hangs about 0.3 m below the eaves.)
    if (KERB + h < 3.2) world.physics.addBox(r.x0 - 0.65, KERB + h - 0.35, r.z0 - 0.65, r.x1 + 0.65, KERB + h + rise * 0.6, r.z1 + 0.65, 'building', F().ALL);
    return ctx;
  }

  /**
   * A pumpkin lying in the patch (knee-low: walked through like the crops).
   * face: a yaw to carve a jack-o'-lantern face on that side (it glows at night).
   */
  function pumpkin(ctx, x, z, s, face, hex) {
    const r = 0.32 * s;
    const col = VH.col(hex || 0xe8761e, 0.95 + (Math.abs(x * 7.3 + z * 3.1) % 1) * 0.1);
    _q.identity();
    _v.set(x, KERB + r * 0.75, z);
    _s.set(r * 1.15, r * 0.78, r);
    _m.compose(_v, _q, _s);
    ctx.detailMatte.merge(sph(), _m, col); // solidity: passable (knee-low: Jay steps through the patch)
    ctx.detailMatte.box(x - 0.03, KERB + r * 1.45, z - 0.03, x + 0.03, KERB + r * 1.45 + 0.12 * s, z + 0.03, VH.col(0x5a6a2a)); // solidity: passable
    if (face === undefined || face === false || face === null) return;
    // Two eyes and a grin, just proud of the skin on the facing side.
    const glow = VH.col(0xffb238, 2.2);
    const fx = Math.sin(face), fz = Math.cos(face), rx = Math.cos(face), rz = -Math.sin(face);
    const d = r * 0.93;
    const y = KERB + r * 0.75;
    for (const [u, v, w, h] of [[-0.4, 0.24, 0.2, 0.17], [0.4, 0.24, 0.2, 0.17], [0, -0.24, 0.62, 0.14]]) {
      const px = x + fx * d + rx * u * r, pz = z + fz * d + rz * u * r;
      ctx.screen.orientedBox(px, pz, w * r, 0.03, face, y + (v - h) * r, y + (v + h) * r, glow); // solidity: passable
    }
  }

  /** A scarecrow on its pole: straw hat, patched coat, arms out. Faces yaw. */
  function scarecrow(world, x, z, yaw, hex, y) {
    const ctx = world.ctxAt(x, z);
    const s = ctx.detailMatte;
    const base = y === undefined ? KERB : y;
    const P = frame(x, z, yaw);
    const wood = VH.col(0x7a5a38);
    s.box(x - 0.06, base, z - 0.06, x + 0.06, base + 2.5, z + 0.06, wood);
    const [ax0, az0] = P(0, -1.0), [ax1, az1] = P(0, 1.0);
    W().beam(s, ax0, base + 1.75, az0, ax1, base + 1.75, az1, 0.08, wood);
    s.orientedBox(x, z, 0.32, 0.16, yaw, base + 1.05, base + 1.9, VH.col(hex || 0x3f5a8a)); // coat
    s.orientedBox(x, z, 0.85, 0.12, yaw, base + 1.6, base + 1.85, VH.col(hex || 0x3f5a8a)); // sleeves
    const [px, pz] = P(0.17, 0.12);
    s.orientedBox(px, pz, 0.1, 0.01, yaw, base + 1.25, base + 1.45, VH.col(0xc8402c)); // a patch
    blob(s, x, base + 2.15, z, 0.2, 0.24, 0.2, VH.col(0xe8d8a8)); // sack head
    s.cylinder(x, base + 2.32, z, 0.45, 0.45, 0.04, 10, VH.col(0xd8b860), true); // hat brim
    s.cylinder(x, base + 2.36, z, 0.2, 0.17, 0.3, 10, VH.col(0xd8b860), true); // crown
    for (const k of [-1, 1]) {
      const [hx, hz] = P(0, k * 1.05);
      s.box(hx - 0.07, base + 1.5, hz - 0.07, hx + 0.07, base + 1.68, hz + 0.07, VH.col(0xdcc47a)); // straw hands
    }
    world.physics.addOrientedBox(x, z, 0.35, 0.2, yaw, 0, base + 2.6, 'pole', F().SOLID | F().SHOTS);
    world.physics.addOrientedBox(x, z, 1.12, 0.15, yaw, base + 1.45, base + 1.9, 'pole', F().SOLID | F().SHOTS);
  }

  // Animals: body half-width, half-length, body y0..y1, colours (merged boxes, solid).
  const ANIMALS = {
    horse: { hw: 0.36, hl: 1.05, y0: 0.95, y1: 1.65, colors: [0x6b4228, 0x3a2a20, 0x9a6a42, 0xd8cdb8, 0x2a2420], head: true, neck: true, mane: 0x2a2018 },
    pony: { hw: 0.3, hl: 0.75, y0: 0.65, y1: 1.2, colors: [0x9a6a42, 0xd8cdb8, 0x6b4228, 0xe8e0d0], head: true, neck: true, mane: 0xe8e0c8 },
    goat: { hw: 0.2, hl: 0.45, y0: 0.42, y1: 0.85, colors: [0xf2eee4, 0x8a6a48, 0x3a3430, 0xd8cdb8], head: true, horns: true },
    sheep: { hw: 0.36, hl: 0.6, y0: 0.45, y1: 1.05, colors: [0xf2eee4, 0xe8e2d4], headCol: 0x2b2b2b, head: true },
    cow: { hw: 0.42, hl: 1.0, y0: 0.75, y1: 1.55, colors: [0x2b2b2b, 0x8a5a3a, 0xf2efe8, 0x6b4a32], head: true },
  };

  /** A standing animal (static), facing yaw; o = { color, grazing, y }. */
  function animal(world, kind, x, z, yaw, o) {
    o = o || {};
    const A = ANIMALS[kind];
    const ctx = world.ctxAt(x, z);
    const s = ctx.detailMatte;
    const P = frame(x, z, yaw);
    const y = o.y === undefined ? KERB : o.y;
    const body = VH.col(o.color || A.colors[0]);
    const leg = kind === 'sheep' ? VH.col(0x2b2b2b) : VH.colMul(body, 0.8);
    for (const f of [-A.hl * 0.72, A.hl * 0.72]) {
      for (const r of [-A.hw * 0.6, A.hw * 0.6]) {
        const [lx, lz] = P(f, r);
        s.orientedBox(lx, lz, 0.07, 0.07, yaw, y, y + A.y0 + 0.05, leg); // solidity: passable (inside the body's collider)
      }
    }
    s.orientedBox(x, z, A.hw, A.hl, yaw, y + A.y0, y + A.y1, body);
    const grazing = !!o.grazing;
    const headCol = A.headCol ? VH.col(A.headCol) : body;
    const hl = A.hl;
    if (A.neck) {
      const [nx, nz] = P(hl + 0.05, 0);
      if (grazing) s.orientedBox(nx, nz, A.hw * 0.4, 0.3, yaw, y + 0.5, y + A.y1 - 0.15, body);
      else s.orientedBox(nx, nz, A.hw * 0.4, 0.28, yaw, y + A.y1 - 0.2, y + A.y1 + 0.45, body);
      if (A.mane) {
        const [mx, mz] = P(hl - 0.05, 0);
        s.orientedBox(mx, mz, 0.05, 0.3, yaw, y + A.y1 - 0.05, y + A.y1 + (grazing ? 0.0 : 0.5), VH.col(A.mane));
      }
    }
    const [hx, hz] = P(hl + (A.neck ? 0.45 : 0.25), 0);
    if (grazing) s.orientedBox(hx, hz, A.hw * 0.45, 0.32, yaw, y + 0.12, y + 0.5, headCol);
    else s.orientedBox(hx, hz, A.hw * 0.45, 0.3, yaw, y + A.y1 + (A.neck ? 0.2 : -0.2), y + A.y1 + (A.neck ? 0.55 : 0.25), headCol);
    if (A.horns && !grazing) {
      const [tx, tz] = P(hl + 0.15, 0);
      s.orientedBox(tx, tz, 0.12, 0.04, yaw, y + A.y1 + 0.25, y + A.y1 + 0.42, VH.col(0x8a8070));
    }
    // A tail.
    const [tx, tz] = P(-hl - 0.05, 0);
    s.orientedBox(tx, tz, 0.05, 0.05, yaw, y + A.y0 + 0.1, y + A.y1 - 0.05, A.mane ? VH.col(A.mane) : VH.colMul(body, 0.7));
    const front = hl + (A.neck ? 0.75 : 0.55);
    const [cx, cz] = P((front - hl - 0.1) / 2, 0);
    world.physics.addOrientedBox(cx, cz, A.hw + 0.05, (front + hl + 0.1) / 2, yaw, 0, y + A.y1 + (A.neck && !grazing ? 0.55 : 0.1), 'animal', F().SOLID | F().SHOTS);
  }

  /**
   * A pond: an ellipse of water (its own mesh, the fountain water) over a
   * dark bed, ringed by a reed bank that keeps people out (solid, 1.4 m:
   * the water is for looking at). o = { gaps: [angle ranges in radians
   * left open for a jetty], reeds (default true), bank (stone edge colour) }.
   * Returns { water, cx, cz, rx, rz }.
   */
  function pond(world, cx, cz, rx, rz, o) {
    o = o || {};
    const N = Math.max(16, Math.round((rx + rz) * 0.9));
    const ctx = world.ctxAt(cx, cz);
    // The bed (counted as ground by the emptiness scan; the water is see-through).
    const bed = VH.col(0x2f4a3e);
    const pts = [];
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      pts.push([cx + Math.cos(a) * rx, cz + Math.sin(a) * rz]);
    }
    for (let i = 0; i < N; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[(i + 1) % N];
      // Each slice goes to the chunk its middle stands in.
      const mx = (cx + ax + bx) / 3, mz = (cz + az + bz) / 3;
      world.ctxAt(mx, mz).asphaltTop.polygon([[cx, KERB + 0.01, cz], [bx, KERB + 0.01, bz], [ax, KERB + 0.01, az]], bed);
    }
    // The water.
    const shape = new THREE.Shape();
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2;
      const x = Math.cos(a) * rx * 0.995, y = -Math.sin(a) * rz * 0.995;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    const mat = world.materials.fountainWater || world.materials.water;
    const water = new THREE.Mesh(new THREE.ShapeGeometry(shape), mat);
    water.rotation.x = -Math.PI / 2;
    water.position.set(cx, KERB + 0.06, cz);
    water.name = 'pond';
    water.receiveShadow = true;
    world.chunkAt(cx, cz).group.add(water);
    // Stones round the edge, and the reed bank just inside it.
    const gaps = o.gaps || [];
    const open = (a) => gaps.some(([g0, g1]) => {
      const t = ((a - g0) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      return t <= ((g1 - g0) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    });
    const stone = VH.col(o.bank || 0x8a857a);
    const reed = VH.col(0x6a8a3a);
    const reedTop = VH.col(0xa89a5a);
    for (let i = 0; i < N; i++) {
      const a0 = (i / N) * Math.PI * 2, a1 = ((i + 1) / N) * Math.PI * 2, am = (a0 + a1) / 2;
      const [ax, az] = pts[i], [bx, bz] = pts[(i + 1) % N];
      const mx = (ax + bx) / 2, mz = (az + bz) / 2;
      const len = Math.hypot(bx - ax, bz - az) / 2 + 0.3;
      const yaw = Math.atan2(bx - ax, bz - az); // along the edge
      const c = world.ctxAt(mx, mz);
      c.detailMatte.orientedBox(mx, mz, 0.45, len, yaw, KERB, KERB + 0.22, stone);
      if (o.reeds === false || open(am)) continue;
      // The reeds stand a metre in from the stones (in the water).
      const ix = cx + (mx - cx) * (1 - 1.1 / Math.max(rx, rz)), iz = cz + (mz - cz) * (1 - 1.1 / Math.max(rx, rz));
      c.hedge.orientedBox(ix, iz, 0.55, len, yaw, KERB, KERB + 1.35 + ((i * 37) % 5) * 0.06, reed, reedTop);
      world.physics.addOrientedBox(ix, iz, 0.7, len, yaw, 0, KERB + 1.4, 'hedge', F().SOLID | F().SHOTS);
    }
    return { water, cx, cz, rx, rz };
  }

  /** Paint an ellipse onto the minimap / full map (the canvas is in world metres). */
  function mapEllipse(g, cx, cz, rx, rz, col) {
    g.fillStyle = col;
    g.beginPath();
    g.ellipse(cx, cz, rx, rz, 0, 0, Math.PI * 2);
    g.fill();
  }

  VH.CountryKit = { KERB, frame, ground, wheel, blob, pieces, cut, postRail, hedge, bale, picnicTable, parasol, tractor, trailer, polytunnel, shed, pumpkin, scarecrow, animal, pond, mapEllipse, ANIMALS };
})();
