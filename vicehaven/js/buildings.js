/*
 * buildings.js — procedural building generator.
 *
 * Given a lot from citygen.js, emits merged geometry (walls with window
 * grids, roofs, cornices, balconies, awnings, rooftop machinery) into the
 * chunk's builders, registers collision boxes, and asks for props (garden
 * palms, dumpsters) through ctx.addProp.
 *
 * Window grids: every wall gets integer bay counts so windows are centred
 * and whole; v counts floors from the bottom of each mass. The shader in
 * materials.js turns (grid, facade) into actual windows.
 */
(function () {
  'use strict';

  const VH = window.VH;
  const KERB = 0.15;

  // --------------------------------------------------------------- helpers
  function shade(color, rng, amount) {
    const m = 1 + rng.range(-amount, amount);
    return [color[0] * m, color[1] * m, color[2] * m];
  }

  function pick(rng, list, amount) {
    return shade(VH.col(rng.pick(list)), rng, amount === undefined ? 0.06 : amount);
  }

  function facadeVec(F, blank) {
    return blank ? [0, 0, 0, F.seed] : [F.ww, F.wh, F.style, F.seed];
  }

  /**
   * Walls of a box with window grids. `sides` maps n/s/e/w to 'win',
   * 'blank' (no windows) or 'skip' (not drawn). Missing entries mean 'win'.
   */
  function facadeWalls(b, x0, y0, z0, x1, y1, z1, F, sides) {
    const h = y1 - y0;
    const v0 = F.vStart || 0;
    const v1 = v0 + h / F.floorH;
    const faces = [
      ['s', [x0, y0, z1], 1, 0, x1 - x0],
      ['n', [x1, y0, z0], -1, 0, x1 - x0],
      ['e', [x1, y0, z1], 0, -1, z1 - z0],
      ['w', [x0, y0, z0], 0, 1, z1 - z0],
    ];
    for (const [side, o, ux, uz, len] of faces) {
      const mode = (sides && sides[side]) || 'win';
      if (mode === 'skip' || len <= 0.01) continue;
      const blank = mode === 'blank' || F.style === 0;
      const bays = Math.max(1, Math.round(len / F.bay));
      b.wall(o, ux, uz, len, h, F.wall, null, [0, bays, v0, v1], facadeVec(F, blank));
    }
  }

  function roof(b, x0, z0, x1, z1, y, color, seed, gravel) {
    b.quad([x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], [0, 1, 0], color, null, null,
      [0, 0, gravel === false ? 0 : -1, seed]);
  }

  function parapet(b, x0, z0, x1, z1, y, h, t, color) {
    b.box(x0, y, z0, x1, y + h, z0 + t, color);
    b.box(x0, y, z1 - t, x1, y + h, z1, color);
    b.box(x0, y, z0 + t, x0 + t, y + h, z1 - t, color);
    b.box(x1 - t, y, z0 + t, x1, y + h, z1 - t, color);
  }

  function cornice(b, x0, z0, x1, z1, y, h, out, color) {
    b.box(x0 - out, y, z0 - out, x1 + out, y + h, z1 + out, color, { bottom: true });
  }

  function waterTank(b, cx, cz, y, rng) {
    const wood = VH.col(0x6b4f3a, rng.range(0.85, 1.1));
    const legs = VH.col(0x3a3a3a);
    const r = rng.range(1.2, 1.7);
    const legH = 2.2;
    for (const [dx, dz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const lx = cx + dx * r * 0.6;
      const lz = cz + dz * r * 0.6;
      b.box(lx - 0.1, y, lz - 0.1, lx + 0.1, y + legH, lz + 0.1, legs);
    }
    b.cylinder(cx, y + legH, cz, r, r, r * 2.1, 10, wood, false);
    b.cylinder(cx, y + legH + r * 2.1, cz, r * 1.05, 0.15, r * 0.9, 10, VH.col(0x4a4038), false);
  }

  /** Air-conditioning units, vents and a stair bulkhead scattered on a flat roof. */
  function rooftopClutter(b, rng, x0, z0, x1, z1, y, opts) {
    const w = x1 - x0;
    const d = z1 - z0;
    if (w < 6 || d < 6) return;
    const metal = VH.col(0x9aa0a6);
    const dark = VH.col(0x5d6166);
    const n = Math.min(8, Math.floor((w * d) / 120) + rng.int(0, 2));
    for (let i = 0; i < n; i++) {
      const sx = rng.range(1.4, 3.2);
      const sz = rng.range(1.2, 2.4);
      const px = rng.range(x0 + 1.5, x1 - 1.5 - sx);
      const pz = rng.range(z0 + 1.5, z1 - 1.5 - sz);
      const h = rng.range(0.9, 1.8);
      b.box(px, y, pz, px + sx, y + h, pz + sz, rng.chance(0.5) ? metal : dark);
    }
    if (rng.chance(0.7)) {
      // Stair and lift bulkhead.
      const bw = Math.min(6, w * 0.3);
      const bd = Math.min(5, d * 0.3);
      const px = rng.range(x0 + 2, x1 - 2 - bw);
      const pz = rng.range(z0 + 2, z1 - 2 - bd);
      const col = opts && opts.wall ? opts.wall : VH.col(0xb0aca4);
      b.box(px, y, pz, px + bw, y + 3.2, pz + bd, col);
    }
    if (opts && opts.tanks && rng.chance(opts.tanks)) {
      waterTank(b, rng.range(x0 + 3, x1 - 3), rng.range(z0 + 3, z1 - 3), y, rng);
    }
  }

  /** Which way each side of a lot faces: street ('win'), alley ('win') or neighbour ('blank'). */
  function sideModes(lot, inset) {
    const out = {};
    for (const s of ['n', 's', 'e', 'w']) {
      if (lot.front[s] || lot.back[s]) out[s] = 'win';
      else out[s] = inset[s] > 1.5 ? 'win' : 'blank';
    }
    return out;
  }

  function insetRect(lot, inset) {
    return {
      x0: lot.minX + inset.w,
      x1: lot.maxX - inset.e,
      z0: lot.minZ + inset.n,
      z1: lot.maxZ - inset.s,
    };
  }

  /** Ground-floor storefronts on street sides, blank on the others. */
  function groundFloor(b, r, y0, h, lot, wall, seed, rng) {
    const F = { wall, style: 4, ww: rng.range(0.78, 0.9), wh: 0.8, bay: rng.range(4.5, 6.5), floorH: h, seed };
    const sides = {};
    for (const s of ['n', 's', 'e', 'w']) sides[s] = lot.front[s] ? 'win' : 'blank';
    facadeWalls(b, r.x0, y0, r.z0, r.x1, y0 + h, r.z1, F, sides);
  }

  function frontFaces(lot) {
    return ['n', 's', 'e', 'w'].filter((s) => lot.front[s]);
  }

  /** Run fn(x0, z0, x1, z1, outX, outZ) for the strip just outside a face. */
  function alongFace(r, side, depth, fn) {
    if (side === 's') fn(r.x0, r.z1, r.x1, r.z1 + depth, 0, 1);
    else if (side === 'n') fn(r.x0, r.z0 - depth, r.x1, r.z0, 0, -1);
    else if (side === 'e') fn(r.x1, r.z0, r.x1 + depth, r.z1, 1, 0);
    else fn(r.x0 - depth, r.z0, r.x0, r.z1, -1, 0);
  }

  function addCollider(ctx, x0, z0, x1, z1, top) {
    ctx.physics.addBox(x0, 0, z0, x1, top, z1, 'building');
  }

  // ------------------------------------------------------------ archetypes
  function tower(ctx, lot, rng) {
    const b = ctx.b;
    const pal = lot.district.palette;
    const seed = rng.range(0, 100);
    const focus = lot.district.heightFocus;
    let f = 0;
    if (focus) {
      const dist = Math.hypot(lot.cx - focus.x, lot.cz - focus.z);
      f = Math.max(0, 1 - dist / focus.radius) * focus.boost;
    }
    const [fMin, fMax] = lot.floorRange;
    let floors = Math.round(VH.math.lerp(fMin, fMax, Math.pow(rng.next(), 1.2)) * (0.55 + 0.85 * f));
    floors = VH.math.clamp(floors, Math.round(fMin * 0.6), Math.round(fMax * 1.25));

    const inset = { n: 0.5, s: 0.5, e: 0.5, w: 0.5 };
    const podium = insetRect(lot, inset);
    const pw = podium.x1 - podium.x0;
    const pd = podium.z1 - podium.z0;
    const frame = pick(rng, pal.walls, 0.08);
    const podiumFloors = rng.int(2, 4);
    const groundH = 5.6;
    const podH = groundH + (podiumFloors - 1) * 4.2;
    groundFloor(b, podium, KERB, groundH, lot, frame, seed, rng);
    const podF = { wall: frame, style: rng.chance(0.5) ? 3 : 2, ww: 1, wh: rng.range(0.5, 0.62), bay: 3.2, floorH: 4.2, seed };
    if (podF.style === 2) podF.ww = 0.9;
    if (podiumFloors > 1) facadeWalls(b, podium.x0, KERB + groundH, podium.z0, podium.x1, KERB + podH, podium.z1, podF, sideModes(lot, inset));
    roof(b, podium.x0, podium.z0, podium.x1, podium.z1, KERB + podH, pick(rng, pal.roofs), seed);
    addCollider(ctx, podium.x0, podium.z0, podium.x1, podium.z1, KERB + podH);

    // Shaft: set back from the podium when the lot is big enough.
    const set = Math.min(pw, pd) > 30 ? rng.range(3, 6) : Math.min(pw, pd) > 22 ? rng.range(1.5, 3) : 0;
    let sx0 = podium.x0 + set;
    let sx1 = podium.x1 - set;
    let sz0 = podium.z0 + set;
    let sz1 = podium.z1 - set;
    const style = rng.weighted([2, 1, 3], [6, 2, 2]);
    const F = {
      wall: frame, style,
      ww: style === 2 ? rng.range(0.9, 0.96) : style === 3 ? 1 : rng.range(0.5, 0.68),
      wh: style === 2 ? rng.range(0.7, 0.82) : style === 3 ? rng.range(0.5, 0.62) : rng.range(0.55, 0.68),
      bay: style === 1 ? rng.range(2.4, 3.2) : rng.range(3.0, 3.8),
      floorH: 3.9, seed,
    };
    const shaftFloors = Math.max(4, floors - podiumFloors);
    let tiers = 1;
    if (shaftFloors > 22 && rng.chance(0.65)) tiers = shaftFloors > 34 ? 3 : 2;
    let y = KERB + podH;
    let remaining = shaftFloors;
    for (let t = 0; t < tiers; t++) {
      const tf = t === tiers - 1 ? remaining : Math.round(remaining * rng.range(0.45, 0.6));
      remaining -= tf;
      const h = tf * F.floorH;
      F.vStart = 0;
      facadeWalls(b, sx0, y, sz0, sx1, y + h, sz1, F);
      y += h;
      // A slim spandrel band at each setback.
      cornice(b, sx0, sz0, sx1, sz1, y, 0.8, 0.25, VH.colMul(frame, 0.8));
      roof(b, sx0 - 0.25, sz0 - 0.25, sx1 + 0.25, sz1 + 0.25, y + 0.8, pick(rng, pal.roofs), seed);
      addCollider(ctx, sx0, sz0, sx1, sz1, y + 0.8);
      y += 0.8;
      if (t < tiers - 1) {
        const step = Math.min(sx1 - sx0, sz1 - sz0) * rng.range(0.08, 0.15);
        sx0 += step;
        sx1 -= step;
        sz0 += step;
        sz1 -= step;
      }
    }

    // Crown: a mechanical penthouse, sometimes a mast.
    const cw = (sx1 - sx0) * 0.55;
    const cd = (sz1 - sz0) * 0.55;
    const ccx = (sx0 + sx1) / 2;
    const ccz = (sz0 + sz1) / 2;
    const crownH = rng.range(4, 7);
    const crownF = { wall: VH.colMul(frame, 0.75), style: 3, ww: 1, wh: 0.35, bay: 2, floorH: crownH, seed };
    facadeWalls(b, ccx - cw / 2, y, ccz - cd / 2, ccx + cw / 2, y + crownH, ccz + cd / 2, crownF);
    roof(b, ccx - cw / 2, ccz - cd / 2, ccx + cw / 2, ccz + cd / 2, y + crownH, pick(rng, pal.roofs), seed);
    rooftopClutter(b, rng, sx0, sz0, ccx - cw / 2, sz1, y, {});
    if (rng.chance(0.45)) {
      const mastH = rng.range(10, 28);
      b.cylinder(ccx, y + crownH, ccz, 0.5, 0.18, mastH, 6, VH.col(0xb8bcc2), false);
      ctx.addBeacon(ccx, y + crownH + mastH + 0.3, ccz);
    }
    return y + crownH;
  }

  function office(ctx, lot, rng) {
    const b = ctx.b;
    const pal = lot.district.palette;
    const seed = rng.range(0, 100);
    const floors = rng.int(lot.floorRange[0], lot.floorRange[1]);
    const inset = {
      n: lot.front.n ? 0 : lot.back.n ? rng.range(0.5, 2) : 0,
      s: lot.front.s ? 0 : lot.back.s ? rng.range(0.5, 2) : 0,
      e: lot.front.e ? 0 : lot.back.e ? rng.range(0.5, 2) : 0,
      w: lot.front.w ? 0 : lot.back.w ? rng.range(0.5, 2) : 0,
    };
    const r = insetRect(lot, inset);
    const wall = pick(rng, pal.walls, 0.07);
    const groundH = 4.8;
    groundFloor(b, r, KERB, groundH, lot, VH.colMul(wall, 0.85), seed, rng);
    const style = rng.chance(0.3) ? 3 : 1;
    const F = {
      wall, style,
      ww: style === 3 ? 1 : rng.range(0.45, 0.66),
      wh: style === 3 ? rng.range(0.42, 0.55) : rng.range(0.5, 0.64),
      bay: rng.range(2.6, 3.6), floorH: 3.6, seed,
    };
    const top = KERB + groundH + (floors - 1) * F.floorH;
    facadeWalls(b, r.x0, KERB + groundH, r.z0, r.x1, top, r.z1, F, sideModes(lot, inset));
    const accent = pick(rng, pal.accents, 0.05);
    // A band between shops and offices, and a cornice at the top.
    cornice(b, r.x0, r.z0, r.x1, r.z1, KERB + groundH - 0.1, 0.45, 0.2, accent);
    cornice(b, r.x0, r.z0, r.x1, r.z1, top, 0.7, 0.35, accent);
    roof(b, r.x0, r.z0, r.x1, r.z1, top + 0.7, pick(rng, pal.roofs), seed);
    parapet(b, r.x0, r.z0, r.x1, r.z1, top + 0.7, 0.8, 0.3, VH.colMul(wall, 0.9));
    rooftopClutter(b, rng, r.x0, r.z0, r.x1, r.z1, top + 0.7, { tanks: lot.district.id === 'oldmarket' ? 0.4 : 0.1 });
    addCollider(ctx, r.x0, r.z0, r.x1, r.z1, top + 1.5);
    shopSigns(ctx, lot, r, rng, KERB + groundH - 1.3);
    return top;
  }

  function shophouse(ctx, lot, rng) {
    const b = ctx.b;
    const pal = lot.district.palette;
    const seed = rng.range(0, 100);
    const floors = rng.int(lot.floorRange[0], lot.floorRange[1]);
    const inset = { n: 0, s: 0, e: 0, w: 0 };
    for (const s of ['n', 's', 'e', 'w']) if (lot.back[s]) inset[s] = rng.range(0.5, 2.5);
    const r = insetRect(lot, inset);
    const wall = pick(rng, pal.walls, 0.1);
    const groundH = 4.2;
    groundFloor(b, r, KERB, groundH, lot, VH.colMul(wall, 0.8), seed, rng);
    const F = { wall, style: 1, ww: rng.range(0.38, 0.52), wh: rng.range(0.55, 0.66), bay: rng.range(2.4, 3.2), floorH: 3.4, seed };
    const top = KERB + groundH + (floors - 1) * F.floorH;
    if (floors > 1) facadeWalls(b, r.x0, KERB + groundH, r.z0, r.x1, top, r.z1, F, sideModes(lot, inset));
    const trim = pick(rng, pal.accents, 0.05);
    cornice(b, r.x0, r.z0, r.x1, r.z1, top, 0.6, 0.3, trim);
    roof(b, r.x0, r.z0, r.x1, r.z1, top + 0.6, pick(rng, pal.roofs), seed);
    parapet(b, r.x0, r.z0, r.x1, r.z1, top + 0.6, 0.9, 0.3, VH.colMul(wall, 0.92));
    rooftopClutter(b, rng, r.x0, r.z0, r.x1, r.z1, top + 0.6, { tanks: 0.55 });
    addCollider(ctx, r.x0, r.z0, r.x1, r.z1, top + 1.5);

    // Striped canvas awnings over the shopfronts.
    for (const side of frontFaces(lot)) {
      const awning = pick(rng, pal.accents, 0.05);
      alongFace(r, side, 1.5, (x0, z0, x1, z1, ox, oz) => {
        const inX = ox === 0;
        const a0 = inX ? x0 + 1 : x0;
        const a1 = inX ? x1 - 1 : x1;
        const b0 = inX ? z0 : z0 + 1;
        const b1 = inX ? z1 : z1 - 1;
        b.box(a0, 3.25, b0, a1, 3.38, b1, awning, { bottom: true });
        // Valance along the outer edge.
        if (ox === 1) b.box(x1 - 0.06, 2.95, b0, x1, 3.38, b1, awning);
        if (ox === -1) b.box(x0, 2.95, b0, x0 + 0.06, 3.38, b1, awning);
        if (oz === 1) b.box(a0, 2.95, z1 - 0.06, a1, 3.38, z1, awning);
        if (oz === -1) b.box(a0, 2.95, z0, a1, 3.38, z0 + 0.06, awning);
      });
    }
    shopSigns(ctx, lot, r, rng, 3.5);
    return top;
  }

  function apartment(ctx, lot, rng) {
    const b = ctx.b;
    const pal = lot.district.palette;
    const seed = rng.range(0, 100);
    const floors = rng.int(lot.floorRange[0], lot.floorRange[1]);
    const setback = lot.district.id === 'palmcrescent' ? rng.range(1.5, 4) : 0;
    const inset = {
      n: lot.front.n ? setback : 0.5, s: lot.front.s ? setback : 0.5,
      e: lot.front.e ? setback : 0.5, w: lot.front.w ? setback : 0.5,
    };
    const r = insetRect(lot, inset);
    if (r.x1 - r.x0 < 8 || r.z1 - r.z0 < 8) return villa(ctx, lot, rng);
    const wall = pick(rng, pal.walls, 0.06);
    const groundH = 4.0;
    const commercial = setback < 1;
    if (commercial) groundFloor(b, r, KERB, groundH, lot, VH.colMul(wall, 0.86), seed, rng);
    else {
      const G = { wall: VH.colMul(wall, 0.92), style: 1, ww: 0.5, wh: 0.55, bay: 3.2, floorH: groundH, seed };
      facadeWalls(b, r.x0, KERB, r.z0, r.x1, KERB + groundH, r.z1, G, sideModes(lot, inset));
    }
    const F = { wall, style: 1, ww: rng.range(0.42, 0.58), wh: rng.range(0.5, 0.62), bay: rng.range(3.0, 3.8), floorH: 3.1, seed };
    const top = KERB + groundH + (floors - 1) * F.floorH;
    facadeWalls(b, r.x0, KERB + groundH, r.z0, r.x1, top, r.z1, F, sideModes(lot, inset));
    const trim = pick(rng, pal.accents, 0.04);
    cornice(b, r.x0, r.z0, r.x1, r.z1, top, 0.5, 0.25, trim);
    roof(b, r.x0, r.z0, r.x1, r.z1, top + 0.5, pick(rng, pal.roofs), seed);
    parapet(b, r.x0, r.z0, r.x1, r.z1, top + 0.5, 1.0, 0.25, VH.colMul(wall, 0.95));
    rooftopClutter(b, rng, r.x0, r.z0, r.x1, r.z1, top + 0.5, { tanks: 0.3 });
    addCollider(ctx, r.x0, r.z0, r.x1, r.z1, top + 1.5);

    // Continuous balconies on the street faces: a slab and a glass-look rail per floor.
    const slabCol = VH.colMul(wall, 1.05);
    const railCol = rng.chance(0.5) ? VH.col(0x9fb7c2) : trim;
    for (const side of frontFaces(lot)) {
      for (let fl = 1; fl < floors; fl++) {
        const y = KERB + groundH + (fl - 1) * F.floorH;
        alongFace(r, side, 1.2, (x0, z0, x1, z1, ox, oz) => {
          const inX = ox === 0;
          const a0 = inX ? x0 + 1.2 : x0;
          const a1 = inX ? x1 - 1.2 : x1;
          const c0 = inX ? z0 : z0 + 1.2;
          const c1 = inX ? z1 : z1 - 1.2;
          if (a1 - a0 < 2 || c1 - c0 < 0.5) return;
          b.box(a0, y, c0, a1, y + 0.18, c1, slabCol, { bottom: true });
          if (ox === 1) b.box(x1 - 0.06, y + 0.18, c0, x1, y + 1.1, c1, railCol);
          if (ox === -1) b.box(x0, y + 0.18, c0, x0 + 0.06, y + 1.1, c1, railCol);
          if (oz === 1) b.box(a0, y + 0.18, z1 - 0.06, a1, y + 1.1, z1, railCol);
          if (oz === -1) b.box(a0, y + 0.18, z0, a1, y + 1.1, z0 + 0.06, railCol);
        });
      }
    }
    if (setback > 1.2) frontGarden(ctx, lot, r, rng);
    return top;
  }

  function hotel(ctx, lot, rng) {
    const b = ctx.b;
    const pal = lot.district.palette;
    const seed = rng.range(0, 100);
    const floors = rng.int(lot.floorRange[0], lot.floorRange[1]);
    const inset = {
      n: lot.front.n ? rng.range(0, 2) : 0.5, s: lot.front.s ? rng.range(0, 2) : 0.5,
      e: lot.front.e ? rng.range(0, 2) : 0.5, w: lot.front.w ? rng.range(0, 2) : 0.5,
    };
    const r = insetRect(lot, inset);
    const wall = pick(rng, pal.walls, 0.04);
    const groundH = 5.2;
    groundFloor(b, r, KERB, groundH, lot, VH.colMul(wall, 0.9), seed, rng);
    const F = { wall, style: rng.chance(0.4) ? 3 : 1, ww: 0.62, wh: 0.58, bay: rng.range(3.2, 4.0), floorH: 3.2, seed };
    if (F.style === 3) {
      F.ww = 1;
      F.wh = 0.5;
    }
    const top = KERB + groundH + (floors - 1) * F.floorH;
    facadeWalls(b, r.x0, KERB + groundH, r.z0, r.x1, top, r.z1, F, sideModes(lot, inset));
    const accent = pick(rng, pal.accents, 0.03);
    // Art-deco style vertical fins up the street faces.
    for (const side of frontFaces(lot)) {
      const len = side === 'n' || side === 's' ? r.x1 - r.x0 : r.z1 - r.z0;
      const bays = Math.max(1, Math.round(len / F.bay));
      const bw = len / bays;
      const every = bays > 8 ? 3 : 2;
      for (let i = 0; i <= bays; i += every) {
        const p = i * bw;
        const t = 0.35;
        const dp = 0.7;
        if (side === 's') b.box(r.x0 + p - t / 2, KERB + groundH, r.z1, r.x0 + p + t / 2, top + 1.6, r.z1 + dp, accent);
        else if (side === 'n') b.box(r.x0 + p - t / 2, KERB + groundH, r.z0 - dp, r.x0 + p + t / 2, top + 1.6, r.z0, accent);
        else if (side === 'e') b.box(r.x1, KERB + groundH, r.z0 + p - t / 2, r.x1 + dp, top + 1.6, r.z0 + p + t / 2, accent);
        else b.box(r.x0 - dp, KERB + groundH, r.z0 + p - t / 2, r.x0, top + 1.6, r.z0 + p + t / 2, accent);
      }
    }
    cornice(b, r.x0, r.z0, r.x1, r.z1, KERB + groundH - 0.2, 0.5, 0.6, accent);
    cornice(b, r.x0, r.z0, r.x1, r.z1, top, 0.9, 0.3, accent);
    roof(b, r.x0, r.z0, r.x1, r.z1, top + 0.9, pick(rng, pal.roofs), seed);
    // Stepped crown.
    const cw = (r.x1 - r.x0) * 0.4;
    const cd = (r.z1 - r.z0) * 0.4;
    const cx = (r.x0 + r.x1) / 2;
    const cz = (r.z0 + r.z1) / 2;
    const ch = rng.range(3, 5);
    b.box(cx - cw / 2, top + 0.9, cz - cd / 2, cx + cw / 2, top + 0.9 + ch, cz + cd / 2, wall, { top: VH.colMul(wall, 0.8) });
    b.box(cx - cw / 4, top + 0.9 + ch, cz - cd / 4, cx + cw / 4, top + 0.9 + ch + 2, cz + cd / 4, accent);
    parapet(b, r.x0, r.z0, r.x1, r.z1, top + 0.9, 0.8, 0.25, wall);
    addCollider(ctx, r.x0, r.z0, r.x1, r.z1, top + 1.7);
    return top;
  }

  function villa(ctx, lot, rng) {
    const b = ctx.b;
    const pal = lot.district.palette;
    const seed = rng.range(0, 100);
    const inset = {
      n: lot.front.n ? rng.range(4, 6) : 2.5, s: lot.front.s ? rng.range(4, 6) : 2.5,
      e: lot.front.e ? rng.range(4, 6) : 2.5, w: lot.front.w ? rng.range(4, 6) : 2.5,
    };
    const r = insetRect(lot, inset);
    if (r.x1 - r.x0 < 6 || r.z1 - r.z0 < 6) return 0;
    const wall = pick(rng, pal.walls, 0.05);
    const F = { wall, style: 1, ww: 0.55, wh: 0.6, bay: rng.range(3.2, 4.2), floorH: 3.2, seed };
    const top = KERB + 2 * F.floorH;
    facadeWalls(b, r.x0, KERB, r.z0, r.x1, top, r.z1, F);
    // Gable roof along the longer side, with a small overhang.
    const tile = pick(rng, pal.roofs, 0.06);
    const o = 0.5;
    const x0 = r.x0 - o, x1 = r.x1 + o, z0 = r.z0 - o, z1 = r.z1 + o;
    const alongX = r.x1 - r.x0 >= r.z1 - r.z0;
    const rise = Math.min(3.2, (alongX ? r.z1 - r.z0 : r.x1 - r.x0) * 0.32);
    const yr = top + rise;
    // Eaves trim, standing just proud of the walls so the two never z-fight.
    b.box(r.x0 - 0.08, top - 0.3, r.z0 - 0.08, r.x1 + 0.08, top, r.z1 + 0.08, VH.colMul(wall, 0.9), { skip: { top: true }, bottom: true });
    if (alongX) {
      const zm = (z0 + z1) / 2;
      b.polygon([[x0, top, z1], [x1, top, z1], [x1, yr, zm], [x0, yr, zm]], tile);
      b.polygon([[x1, top, z0], [x0, top, z0], [x0, yr, zm], [x1, yr, zm]], tile);
      b.polygon([[r.x1, top, r.z1], [r.x1, top, r.z0], [r.x1, yr, zm]], wall, [0, 0, 0, seed]);
      b.polygon([[r.x0, top, r.z0], [r.x0, top, r.z1], [r.x0, yr, zm]], wall, [0, 0, 0, seed]);
    } else {
      const xm = (x0 + x1) / 2;
      b.polygon([[x1, top, z1], [x1, top, z0], [xm, yr, z0], [xm, yr, z1]], tile);
      b.polygon([[x0, top, z0], [x0, top, z1], [xm, yr, z1], [xm, yr, z0]], tile);
      b.polygon([[r.x0, top, r.z1], [r.x1, top, r.z1], [xm, yr, r.z1]], wall, [0, 0, 0, seed]);
      b.polygon([[r.x1, top, r.z0], [r.x0, top, r.z0], [xm, yr, r.z0]], wall, [0, 0, 0, seed]);
    }
    addCollider(ctx, r.x0, r.z0, r.x1, r.z1, top + rise * 0.6);
    frontGarden(ctx, lot, r, rng);
    return yr;
  }

  /** Grass between the building and the pavement, a low wall with a gate, and palms. */
  function frontGarden(ctx, lot, r, rng) {
    const wallCol = VH.col(rng.pick([0xe9e1d0, 0xd8cdb8, 0xf2efe8, 0xc9b79c]));
    const h = rng.range(0.7, 1.1);
    const t = 0.3;
    for (const side of frontFaces(lot)) {
      // Garden strip.
      let gx0, gx1, gz0, gz1;
      if (side === 'n') { gx0 = lot.minX; gx1 = lot.maxX; gz0 = lot.minZ; gz1 = r.z0; }
      else if (side === 's') { gx0 = lot.minX; gx1 = lot.maxX; gz0 = r.z1; gz1 = lot.maxZ; }
      else if (side === 'w') { gx0 = lot.minX; gx1 = r.x0; gz0 = lot.minZ; gz1 = lot.maxZ; }
      else { gx0 = r.x1; gx1 = lot.maxX; gz0 = lot.minZ; gz1 = lot.maxZ; }
      if (gx1 - gx0 < 1 || gz1 - gz0 < 1) continue;
      ctx.grassTop.topRect(gx0, gz0, gx1, gz1, KERB, VH.col(0xffffff), 6);
      if (ctx.addLawn) ctx.addLawn(gx0, gz0, gx1, gz1);
      // Wall along the lot edge with a gate gap in the middle.
      const horizontal = side === 'n' || side === 's';
      const edge = side === 'n' ? lot.minZ : side === 's' ? lot.maxZ - t : side === 'w' ? lot.minX : lot.maxX - t;
      const a = horizontal ? lot.minX : lot.minZ;
      const bEnd = horizontal ? lot.maxX : lot.maxZ;
      const mid = (a + bEnd) / 2;
      const gap = 1.8;
      for (const [s0, s1] of [[a, mid - gap], [mid + gap, bEnd]]) {
        if (s1 - s0 < 0.5) continue;
        if (horizontal) {
          ctx.b.box(s0, KERB, edge, s1, KERB + h, edge + t, wallCol);
          ctx.physics.addBox(s0, 0, edge, s1, KERB + h, edge + t, 'wall');
        } else {
          ctx.b.box(edge, KERB, s0, edge + t, KERB + h, s1, wallCol);
          ctx.physics.addBox(edge, 0, s0, edge + t, KERB + h, s1, 'wall');
        }
      }
      // A palm or two in the garden.
      const gw = gx1 - gx0;
      const gd = gz1 - gz0;
      if (Math.min(gw, gd) > 2.5) {
        const n = rng.int(1, 2);
        for (let i = 0; i < n; i++) {
          const px = horizontal ? VH.math.lerp(gx0 + 2, gx1 - 2, rng.next()) : (gx0 + gx1) / 2;
          const pz = horizontal ? (gz0 + gz1) / 2 : VH.math.lerp(gz0 + 2, gz1 - 2, rng.next());
          if (Math.abs((horizontal ? px : pz) - mid) < 3) continue;
          ctx.addProp('palm', px, pz, rng.range(0, Math.PI * 2), rng.range(0.7, 1.0), KERB);
        }
      }
    }
  }

  /** Coloured sign panels over shopfronts (lettering arrives with the shops in Phase 10). */
  function shopSigns(ctx, lot, r, rng, y) {
    const b = ctx.b;
    const colours = [0xd93b48, 0x2a7de1, 0x1faa6b, 0xf2b01e, 0x8a3fd1, 0xef6c2f, 0x16a3a3, 0x222222];
    for (const side of frontFaces(lot)) {
      const len = side === 'n' || side === 's' ? r.x1 - r.x0 : r.z1 - r.z0;
      const n = Math.max(1, Math.floor(len / 9));
      for (let i = 0; i < n; i++) {
        if (!rng.chance(0.75)) continue;
        const col = VH.col(rng.pick(colours));
        const w = rng.range(3, 6);
        const c = (i + 0.5) * (len / n);
        const p0 = c - w / 2;
        const p1 = c + w / 2;
        const d = 0.18;
        const h = 0.9;
        if (side === 's') b.box(r.x0 + p0, y, r.z1, r.x0 + p1, y + h, r.z1 + d, col);
        else if (side === 'n') b.box(r.x0 + p0, y, r.z0 - d, r.x0 + p1, y + h, r.z0, col);
        else if (side === 'e') b.box(r.x1, y, r.z0 + p0, r.x1 + d, y + h, r.z0 + p1, col);
        else b.box(r.x0 - d, y, r.z0 + p0, r.x0, y + h, r.z0 + p1, col);
      }
    }
  }

  /** Surface car park with painted bays and a few bollards. */
  function parking(ctx, lot) {
    const x0 = lot.minX, x1 = lot.maxX, z0 = lot.minZ, z1 = lot.maxZ;
    ctx.asphaltTop.topRect(x0, z0, x1, z1, KERB, VH.col(0xd8d8d8), 6);
    const white = VH.col(0xe8e8e0);
    const y = KERB;
    const alongX = x1 - x0 >= z1 - z0;
    const bay = 2.7;
    const depth = 5.2;
    if (alongX) {
      for (const [r0, r1] of [[z0 + 1, z0 + 1 + depth], [z1 - 1 - depth, z1 - 1]]) {
        for (let x = x0 + 2; x <= x1 - 2; x += bay) {
          ctx.marks.box(x - 0.06, y, r0, x + 0.06, y + 0.001, r1, white, { skip: { n: true, s: true, e: true, w: true } });
        }
      }
    } else {
      for (const [r0, r1] of [[x0 + 1, x0 + 1 + depth], [x1 - 1 - depth, x1 - 1]]) {
        for (let z = z0 + 2; z <= z1 - 2; z += bay) {
          ctx.marks.box(r0, y, z - 0.06, r1, y + 0.001, z + 0.06, white, { skip: { n: true, s: true, e: true, w: true } });
        }
      }
    }
    // Bollards along the street edges.
    for (const side of frontFaces(lot)) {
      const horizontal = side === 'n' || side === 's';
      const a = horizontal ? x0 + 1 : z0 + 1;
      const bEnd = horizontal ? x1 - 1 : z1 - 1;
      for (let p = a; p <= bEnd; p += 3.2) {
        if (Math.abs(p - (a + bEnd) / 2) < 3.5) continue; // entrance
        const bx = horizontal ? p : side === 'w' ? x0 + 0.3 : x1 - 0.3;
        const bz = horizontal ? (side === 'n' ? z0 + 0.3 : z1 - 0.3) : p;
        ctx.addProp('bollard', bx, bz, 0, 1);
      }
    }
  }

  function courtyard(ctx, lot, rng) {
    ctx.grassTop.topRect(lot.minX, lot.minZ, lot.maxX, lot.maxZ, KERB, VH.col(0xffffff), 6);
    if (ctx.addLawn) ctx.addLawn(lot.minX, lot.minZ, lot.maxX, lot.maxZ);
    const n = rng.int(1, 3);
    for (let i = 0; i < n; i++) {
      ctx.addProp('tree', rng.range(lot.minX + 3, lot.maxX - 3), rng.range(lot.minZ + 3, lot.maxZ - 3),
        rng.range(0, 6.28), rng.range(0.8, 1.2), KERB);
    }
  }

  // ---------------------------------------------- 3.0: the new districts
  /** The side of a lot that faces a street (the first, or 's'). */
  function mainFront(lot) {
    const f = frontFaces(lot);
    return f.length ? f[0] : 's';
  }

  /** Single-storey suburban house: a lawn, a driveway to a garage door, a pitched roof. */
  function house(ctx, lot, rng) {
    const b = ctx.b;
    const pal = lot.district.palette;
    const seed = rng.range(0, 100);
    const side = mainFront(lot);
    const front = rng.range(6, 8.5);
    const inset = { n: 2, s: 2, e: 2, w: 2 };
    inset[side] = front;
    const r = insetRect(lot, inset);
    if (r.x1 - r.x0 < 7 || r.z1 - r.z0 < 7) return courtyard(ctx, lot, rng) || 0;
    const wall = pick(rng, pal.walls, 0.05);
    const F = { wall, style: 1, ww: 0.5, wh: 0.55, bay: rng.range(3, 3.8), floorH: 3.1, seed };
    const top = KERB + 3.1;
    facadeWalls(b, r.x0, KERB, r.z0, r.x1, top, r.z1, F);
    // Hipped-ish roof: two slopes along the longer side, gables at the ends.
    const tile = pick(rng, pal.roofs, 0.06);
    const o = 0.6;
    const x0 = r.x0 - o, x1 = r.x1 + o, z0 = r.z0 - o, z1 = r.z1 + o;
    const alongX = r.x1 - r.x0 >= r.z1 - r.z0;
    const rise = Math.min(2.6, (alongX ? r.z1 - r.z0 : r.x1 - r.x0) * 0.28);
    const yr = top + rise;
    b.box(r.x0 - 0.08, top - 0.25, r.z0 - 0.08, r.x1 + 0.08, top, r.z1 + 0.08, VH.colMul(wall, 0.88), { skip: { top: true }, bottom: true });
    if (alongX) {
      const zm = (z0 + z1) / 2;
      b.polygon([[x0, top, z1], [x1, top, z1], [x1, yr, zm], [x0, yr, zm]], tile);
      b.polygon([[x1, top, z0], [x0, top, z0], [x0, yr, zm], [x1, yr, zm]], tile);
      b.polygon([[r.x1, top, r.z1], [r.x1, top, r.z0], [r.x1, yr, zm]], wall, [0, 0, 0, seed]);
      b.polygon([[r.x0, top, r.z0], [r.x0, top, r.z1], [r.x0, yr, zm]], wall, [0, 0, 0, seed]);
    } else {
      const xm = (x0 + x1) / 2;
      b.polygon([[x1, top, z1], [x1, top, z0], [xm, yr, z0], [xm, yr, z1]], tile);
      b.polygon([[x0, top, z0], [x0, top, z1], [xm, yr, z1], [xm, yr, z0]], tile);
      b.polygon([[r.x0, top, r.z1], [r.x1, top, r.z1], [xm, yr, r.z1]], wall, [0, 0, 0, seed]);
      b.polygon([[r.x1, top, r.z0], [r.x0, top, r.z0], [xm, yr, r.z0]], wall, [0, 0, 0, seed]);
    }
    addCollider(ctx, r.x0, r.z0, r.x1, r.z1, top + rise * 0.6);
    // Front lawn and a driveway from the pavement to a garage door at one end.
    const horiz = side === 'n' || side === 's';
    let gx0, gx1, gz0, gz1;
    if (side === 'n') { gx0 = lot.minX; gx1 = lot.maxX; gz0 = lot.minZ; gz1 = r.z0; }
    else if (side === 's') { gx0 = lot.minX; gx1 = lot.maxX; gz0 = r.z1; gz1 = lot.maxZ; }
    else if (side === 'w') { gx0 = lot.minX; gx1 = r.x0; gz0 = lot.minZ; gz1 = lot.maxZ; }
    else { gx0 = r.x1; gx1 = lot.maxX; gz0 = lot.minZ; gz1 = lot.maxZ; }
    const dw = 3.4; // driveway width
    const atStart = rng.chance(0.5);
    const a0 = horiz ? r.x0 : r.z0;
    const a1 = horiz ? r.x1 : r.z1;
    const d0 = atStart ? a0 + 0.6 : a1 - 0.6 - dw;
    const d1 = d0 + dw;
    const drive = horiz ? [d0, gz0, d1, gz1] : [gx0, d0, gx1, d1];
    ctx.asphaltTop.topRect(drive[0], drive[1], drive[2], drive[3], KERB, VH.col(0xc8c4bc), 4);
    for (const g of horiz ? [[gx0, gz0, d0, gz1], [d1, gz0, gx1, gz1]] : [[gx0, gz0, gx1, d0], [gx0, d1, gx1, gz1]]) {
      if (g[2] - g[0] < 0.5 || g[3] - g[1] < 0.5) continue;
      ctx.grassTop.topRect(g[0], g[1], g[2], g[3], KERB, VH.col(0xffffff), 6);
      if (ctx.addLawn) ctx.addLawn(g[0], g[1], g[2], g[3]);
    }
    // Garage door and front door on the street face.
    const door = VH.col(rng.pick([0xe8e4dc, 0xd8cdb8, 0x9a968e, 0x6b5848]));
    const fd = pick(rng, pal.accents, 0.05);
    const doorAt = atStart ? a1 - 3 : a0 + 2;
    if (side === 's') { b.box(d0 + 0.2, KERB, r.z1, d1 - 0.2, KERB + 2.3, r.z1 + 0.08, door); b.box(doorAt, KERB, r.z1, doorAt + 1, KERB + 2.1, r.z1 + 0.08, fd); }
    else if (side === 'n') { b.box(d0 + 0.2, KERB, r.z0 - 0.08, d1 - 0.2, KERB + 2.3, r.z0, door); b.box(doorAt, KERB, r.z0 - 0.08, doorAt + 1, KERB + 2.1, r.z0, fd); }
    else if (side === 'e') { b.box(r.x1, KERB, d0 + 0.2, r.x1 + 0.08, KERB + 2.3, d1 - 0.2, door); b.box(r.x1, KERB, doorAt, r.x1 + 0.08, KERB + 2.1, doorAt + 1, fd); }
    else { b.box(r.x0 - 0.08, KERB, d0 + 0.2, r.x0, KERB + 2.3, d1 - 0.2, door); b.box(r.x0 - 0.08, KERB, doorAt, r.x0, KERB + 2.1, doorAt + 1, fd); }
    // A tree or a palm in the lawn, and a low fence round the back.
    if (rng.chance(0.7)) {
      const tx = horiz ? (atStart ? (d1 + gx1) / 2 : (gx0 + d0) / 2) : (gx0 + gx1) / 2;
      const tz = horiz ? (gz0 + gz1) / 2 : atStart ? (d1 + gz1) / 2 : (gz0 + d0) / 2;
      ctx.addProp(rng.chance(0.6) ? 'tree' : 'palm', tx, tz, rng.range(0, 6.28), rng.range(0.6, 0.85), KERB);
    }
    return yr;
  }

  /** Industrial shed or warehouse: a big box, a shallow roof, roller doors and a yard. */
  function shed(ctx, lot, rng) {
    const b = ctx.b;
    const pal = lot.district.palette;
    const seed = rng.range(0, 100);
    const side = mainFront(lot);
    const inset = { n: 2, s: 2, e: 2, w: 2 };
    inset[side] = rng.range(6, 10); // a forecourt for the lorries
    const r = insetRect(lot, inset);
    if (r.x1 - r.x0 < 8 || r.z1 - r.z0 < 8) return parking(ctx, lot) || 0;
    const floors = rng.int(lot.floorRange[0], lot.floorRange[1]);
    const h = 4.5 + floors * 2.6;
    const top = KERB + h;
    const wall = pick(rng, pal.walls, 0.06);
    const F = { wall, style: 3, ww: 0.9, wh: 0.18, bay: rng.range(5, 7), floorH: h, seed, vStart: 0.72 };
    facadeWalls(b, r.x0, KERB, r.z0, r.x1, top, r.z1, F);
    // Ribbed low-pitch roof.
    const roofCol = pick(rng, pal.roofs, 0.05);
    roof(b, r.x0, r.z0, r.x1, r.z1, top, roofCol, seed);
    const alongX = r.x1 - r.x0 >= r.z1 - r.z0;
    for (let p = (alongX ? r.x0 : r.z0) + 3; p < (alongX ? r.x1 : r.z1) - 1; p += 3) {
      if (alongX) b.box(p - 0.12, top, r.z0, p + 0.12, top + 0.25, r.z1, VH.colMul(roofCol, 0.85), { bottom: false });
      else b.box(r.x0, top, p - 0.12, r.x1, top + 0.25, p + 0.12, VH.colMul(roofCol, 0.85), { bottom: false });
    }
    addCollider(ctx, r.x0, r.z0, r.x1, r.z1, top + 0.3);
    // Forecourt and roller doors on the street face.
    const accent = pick(rng, pal.accents, 0.05);
    const doors = VH.col(0x8a8f96);
    alongFace(r, side, inset[side] - 0.2, (x0, z0, x1, z1) => {
      ctx.asphaltTop.topRect(x0, z0, x1, z1, KERB, VH.col(0xc4c4c4), 6);
    });
    const len = side === 'n' || side === 's' ? r.x1 - r.x0 : r.z1 - r.z0;
    const n = Math.max(1, Math.floor(len / 12));
    for (let i = 0; i < n; i++) {
      const c = (i + 0.5) * (len / n);
      const w = 4.2;
      if (side === 's') b.box(r.x0 + c - w / 2, KERB, r.z1, r.x0 + c + w / 2, KERB + 4.6, r.z1 + 0.1, doors);
      else if (side === 'n') b.box(r.x0 + c - w / 2, KERB, r.z0 - 0.1, r.x0 + c + w / 2, KERB + 4.6, r.z0, doors);
      else if (side === 'e') b.box(r.x1, KERB, r.z0 + c - w / 2, r.x1 + 0.1, KERB + 4.6, r.z0 + c + w / 2, doors);
      else b.box(r.x0 - 0.1, KERB, r.z0 + c - w / 2, r.x0, KERB + 4.6, r.z0 + c + w / 2, doors);
    }
    // A stripe of company colour under the eaves.
    if (side === 's') b.box(r.x0, top - 1.2, r.z1, r.x1, top - 0.4, r.z1 + 0.06, accent);
    else if (side === 'n') b.box(r.x0, top - 1.2, r.z0 - 0.06, r.x1, top - 0.4, r.z0, accent);
    else if (side === 'e') b.box(r.x1, top - 1.2, r.z0, r.x1 + 0.06, top - 0.4, r.z1, accent);
    else b.box(r.x0 - 0.06, top - 1.2, r.z0, r.x0, top - 0.4, r.z1, accent);
    if (rng.chance(0.5)) {
      const px = rng.range(r.x0 + 2, r.x1 - 2);
      const pz = rng.range(r.z0 + 2, r.z1 - 2);
      ctx.addProp('dumpster', side === 'e' || side === 'w' ? (side === 'e' ? r.x1 + 1.5 : r.x0 - 1.5) : px, side === 'n' || side === 's' ? (side === 's' ? r.z1 + 1.5 : r.z0 - 1.5) : pz, side === 'e' || side === 'w' ? Math.PI / 2 : 0, 1);
    }
    return top + 0.3;
  }

  /**
   * Low-rise strip (a motel, beach shops, a diner row): one or two storeys,
   * a walkway along the front under a canopy, doors and windows in a row.
   */
  function lowrise(ctx, lot, rng) {
    const b = ctx.b;
    const pal = lot.district.palette;
    const seed = rng.range(0, 100);
    const side = mainFront(lot);
    const floors = rng.int(lot.floorRange[0], lot.floorRange[1]);
    const inset = { n: 1.5, s: 1.5, e: 1.5, w: 1.5 };
    inset[side] = rng.range(3.5, 6);
    for (const s of ['n', 's', 'e', 'w']) if (s !== side && lot.front[s]) inset[s] = 1;
    const r = insetRect(lot, inset);
    if (r.x1 - r.x0 < 6 || r.z1 - r.z0 < 6) return courtyard(ctx, lot, rng) || 0;
    const wall = pick(rng, pal.walls, 0.06);
    const floorH = 3.3;
    const top = KERB + floors * floorH;
    const F = { wall, style: 4, ww: rng.range(0.55, 0.75), wh: 0.62, bay: rng.range(3.4, 4.4), floorH, seed };
    facadeWalls(b, r.x0, KERB, r.z0, r.x1, top, r.z1, F);
    const trim = pick(rng, pal.accents, 0.05);
    cornice(b, r.x0, r.z0, r.x1, r.z1, top, 0.5, 0.25, trim);
    roof(b, r.x0, r.z0, r.x1, r.z1, top + 0.5, pick(rng, pal.roofs), seed);
    parapet(b, r.x0, r.z0, r.x1, r.z1, top + 0.5, 0.6, 0.25, VH.colMul(wall, 0.92));
    if (rng.chance(0.4)) rooftopClutter(b, rng, r.x0, r.z0, r.x1, r.z1, top + 0.5, { tanks: 0.2 });
    addCollider(ctx, r.x0, r.z0, r.x1, r.z1, top + 1.1);
    // Canopy over the front walkway on slim posts (and a balcony walk on the upper floor).
    const canopy = pick(rng, pal.accents, 0.05);
    const depth = Math.min(2.6, inset[side] - 0.6);
    alongFace(r, side, depth, (x0, z0, x1, z1, ox, oz) => {
      b.box(x0, KERB + floorH - 0.25, z0, x1, KERB + floorH, z1, canopy, { bottom: true });
      const alongX = oz !== 0;
      const a0 = alongX ? x0 : z0;
      const a1 = alongX ? x1 : z1;
      const post = VH.colMul(canopy, 0.8);
      for (let p = a0 + 0.3; p <= a1 - 0.2; p += Math.max(3, (a1 - a0) / Math.max(1, Math.round((a1 - a0) / 4.5)))) {
        const px = alongX ? p : ox > 0 ? x1 - 0.2 : x0 + 0.1;
        const pz = alongX ? (oz > 0 ? z1 - 0.2 : z0 + 0.1) : p;
        b.box(px, KERB, pz, px + 0.12, KERB + floorH - 0.25, pz + 0.12, post);
        ctx.physics.addBox(px - 0.04, 0, pz - 0.04, px + 0.16, KERB + floorH - 0.25, pz + 0.16, 'pole', VH.COLLIDE.SOLID | VH.COLLIDE.SHOTS);
      }
      if (floors > 1) b.box(x0, KERB + floorH + 0.9, z0, x1, KERB + floorH + 1.0, z1, VH.col(0xe8e4dc), { bottom: true });
    });
    shopSigns(ctx, lot, r, rng, KERB + floorH + 0.05);
    return top + 1.1;
  }

  // ---------------------------------------------- 4.0: the fill districts
  /** A footprint w along the lot's front face and d deep, standing at that face of r. */
  function atFront(r, side, w, d, along) {
    const horiz = side === 'n' || side === 's';
    const len = horiz ? r.x1 - r.x0 : r.z1 - r.z0;
    w = Math.min(w, len);
    const a0 = (horiz ? r.x0 : r.z0) + (len - w) * (along === undefined ? 0.5 : along);
    if (side === 's') return { x0: a0, x1: a0 + w, z0: Math.max(r.z0, r.z1 - d), z1: r.z1 };
    if (side === 'n') return { x0: a0, x1: a0 + w, z0: r.z0, z1: Math.min(r.z1, r.z0 + d) };
    if (side === 'e') return { x0: Math.max(r.x0, r.x1 - d), x1: r.x1, z0: a0, z1: a0 + w };
    return { x0: r.x0, x1: Math.min(r.x1, r.x0 + d), z0: a0, z1: a0 + w };
  }

  /** A pitched roof over r (ridge along the longer side, gable ends in the wall colour). Returns the ridge height. */
  function gableRoof(b, r, top, rise, o, tile, wall, seed) {
    const x0 = r.x0 - o, x1 = r.x1 + o, z0 = r.z0 - o, z1 = r.z1 + o;
    const yr = top + rise;
    if (r.x1 - r.x0 >= r.z1 - r.z0) {
      const zm = (z0 + z1) / 2;
      b.polygon([[x0, top, z1], [x1, top, z1], [x1, yr, zm], [x0, yr, zm]], tile);
      b.polygon([[x1, top, z0], [x0, top, z0], [x0, yr, zm], [x1, yr, zm]], tile);
      b.polygon([[r.x1, top, r.z1], [r.x1, top, r.z0], [r.x1, yr, zm]], wall, [0, 0, 0, seed]);
      b.polygon([[r.x0, top, r.z0], [r.x0, top, r.z1], [r.x0, yr, zm]], wall, [0, 0, 0, seed]);
    } else {
      const xm = (x0 + x1) / 2;
      b.polygon([[x1, top, z1], [x1, top, z0], [xm, yr, z0], [xm, yr, z1]], tile);
      b.polygon([[x0, top, z0], [x0, top, z1], [xm, yr, z1], [xm, yr, z0]], tile);
      b.polygon([[r.x0, top, r.z1], [r.x1, top, r.z1], [xm, yr, r.z1]], wall, [0, 0, 0, seed]);
      b.polygon([[r.x1, top, r.z0], [r.x0, top, r.z0], [xm, yr, r.z0]], wall, [0, 0, 0, seed]);
    }
    return yr;
  }

  /** A round collider: eight thin boxes round the circle (a 16-sided shape within 1% of the drawn edge). */
  function roundCollider(physics, x, z, r, y0, y1, tag) {
    for (let k = 0; k < 8; k++) physics.addOrientedBox(x, z, r * 0.991, r * 0.197, (k * Math.PI) / 8, y0, y1, tag);
  }

  /** A round hay bale standing on end (solid: Jay climbs it, cars stop). */
  function hayBale(ctx, x, z, y, s) {
    const r = 0.8 * (s || 1);
    ctx.detailMatte.cylinder(x, y, z, r, r, 1.2, 10, VH.col(0xd8be6a), true, VH.col(0xc9a94e)); // (matte paint: the wood grain needs UVs a cylinder has not got; hidden far off)
    roundCollider(ctx.physics, x, z, r, y - 0.1, y + 1.2, 'crate');
  }

  /** Farmhouse: one or two storeys under a pitched roof, a porch on the front, a lawn and a white fence. */
  function farmhouse(ctx, lot, rng) {
    const b = ctx.b;
    const pal = lot.district.palette;
    const seed = rng.range(0, 100);
    const side = mainFront(lot);
    const inset = { n: 3, s: 3, e: 3, w: 3 };
    inset[side] = rng.range(7, 10);
    const yard = insetRect(lot, inset);
    if (yard.x1 - yard.x0 < 9 || yard.z1 - yard.z0 < 9) return courtyard(ctx, lot, rng) || 0;
    const r = atFront(yard, side, rng.range(11, 16), rng.range(9, 12), rng.range(0.2, 0.8));
    const floors = rng.int(lot.floorRange[0], lot.floorRange[1]);
    const wall = pick(rng, pal.walls.filter((c) => c > 0xc00000) .length ? pal.walls.filter((c) => c > 0xc00000) : pal.walls, 0.05);
    const top = KERB + 0.5 + floors * 3.0;
    b.box(r.x0, 0, r.z0, r.x1, KERB + 0.5, r.z1, VH.col(0x9a8f80), { skip: { top: true } });
    facadeWalls(b, r.x0, KERB + 0.5, r.z0, r.x1, top, r.z1, { wall, style: 1, ww: 0.45, wh: 0.55, bay: rng.range(2.8, 3.4), floorH: 3.0, seed });
    const tile = pick(rng, pal.roofs, 0.06);
    const yr = gableRoof(b, r, top, Math.min(3.4, Math.min(r.x1 - r.x0, r.z1 - r.z0) * 0.32), 0.5, tile, wall, seed);
    // A brick chimney at one end of the ridge.
    const cx = r.x1 - r.x0 >= r.z1 - r.z0 ? r.x0 + 1.6 : (r.x0 + r.x1) / 2;
    const cz = r.x1 - r.x0 >= r.z1 - r.z0 ? (r.z0 + r.z1) / 2 : r.z0 + 1.6;
    b.box(cx - 0.5, top, cz - 0.5, cx + 0.5, yr + 1.2, cz + 0.5, VH.col(0x8a4b3a));
    addCollider(ctx, r.x0, r.z0, r.x1, r.z1, top + (yr - top) * 0.6);
    // The porch: a deck along the front, a roof on four posts, a door.
    const porchCol = VH.col(0xe8e2d6);
    alongFace(r, side, 2.4, (x0, z0, x1, z1, ox, oz) => {
      ctx.wood.box(x0, 0, z0, x1, KERB + 0.45, z1, VH.col(0xb08a62), { uvScale: 2 });
      ctx.physics.addBox(x0, 0, z0, x1, KERB + 0.45, z1, 'plank');
      b.box(x0 - 0.2, KERB + 3.2, z0 - 0.2, x1 + 0.2, KERB + 3.4, z1 + 0.2, tile, { bottom: true });
      const alongX = oz !== 0;
      const a0 = alongX ? x0 : z0, a1 = alongX ? x1 : z1;
      for (const t of [0.02, 0.35, 0.65, 0.98]) {
        const p = a0 + (a1 - a0) * t;
        const px = alongX ? p : ox > 0 ? x1 - 0.15 : x0 + 0.15;
        const pz = alongX ? (oz > 0 ? z1 - 0.15 : z0 + 0.15) : p;
        b.box(px - 0.1, KERB + 0.45, pz - 0.1, px + 0.1, KERB + 3.2, pz + 0.1, porchCol);
        ctx.physics.addBox(px - 0.12, 0, pz - 0.12, px + 0.12, KERB + 3.2, pz + 0.12, 'pole', VH.COLLIDE.SOLID | VH.COLLIDE.SHOTS);
      }
    });
    // Lawn round the house, and a white picket fence along the street with a gate.
    ctx.grassTop.topRect(yard.x0, yard.z0, yard.x1, yard.z1, KERB, VH.col(0xf4f8e8), 6);
    if (ctx.addLawn) ctx.addLawn(yard.x0, yard.z0, yard.x1, yard.z1);
    picket(ctx, lot, side, rng);
    if (rng.chance(0.8)) ctx.addProp('tree', rng.range(yard.x0 + 2, yard.x1 - 2), rng.range(yard.z0 + 2, yard.z1 - 2), rng.range(0, 6.28), rng.range(0.9, 1.3), KERB);
    return yr + 1.2;
  }

  /** A low white picket fence just inside a lot's street face, open in the middle for a gate. */
  function picket(ctx, lot, side, rng) {
    const white = VH.col(0xf2efe8);
    const horiz = side === 'n' || side === 's';
    const a0 = (horiz ? lot.minX : lot.minZ) + 0.6, a1 = (horiz ? lot.maxX : lot.maxZ) - 0.6;
    const c = side === 'n' ? lot.minZ + 0.4 : side === 's' ? lot.maxZ - 0.4 : side === 'w' ? lot.minX + 0.4 : lot.maxX - 0.4;
    const gate = a0 + (a1 - a0) * (rng ? rng.range(0.3, 0.7) : 0.5);
    for (const [p0, p1] of [[a0, gate - 1.6], [gate + 1.6, a1]]) {
      if (p1 - p0 < 1) continue;
      if (horiz) {
        ctx.detailWood.box(p0, KERB + 0.35, c - 0.04, p1, KERB + 0.45, c + 0.04, white);
        ctx.detailWood.box(p0, KERB + 0.75, c - 0.04, p1, KERB + 0.85, c + 0.04, white);
        for (let p = p0; p <= p1; p += 0.6) ctx.detailWood.box(p - 0.05, KERB, c - 0.05, p + 0.05, KERB + 0.95, c + 0.05, white);
        ctx.physics.addBox(p0, 0, c - 0.1, p1, KERB + 0.95, c + 0.1, 'fence', VH.COLLIDE.SOLID);
      } else {
        ctx.detailWood.box(c - 0.04, KERB + 0.35, p0, c + 0.04, KERB + 0.45, p1, white);
        ctx.detailWood.box(c - 0.04, KERB + 0.75, p0, c + 0.04, KERB + 0.85, p1, white);
        for (let p = p0; p <= p1; p += 0.6) ctx.detailWood.box(c - 0.05, KERB, p - 0.05, c + 0.05, KERB + 0.95, p + 0.05, white);
        ctx.physics.addBox(c - 0.1, 0, p0, c + 0.1, KERB + 0.95, p1, 'fence', VH.COLLIDE.SOLID);
      }
    }
  }

  /** Barn: a big gambrel-roofed shed (red, or weathered grey), white trim, the great doors on a gable end, hay bales. */
  function barn(ctx, lot, rng) {
    const b = ctx.b;
    const seed = rng.range(0, 100);
    const side = mainFront(lot);
    const yard = insetRect(lot, { n: 3, s: 3, e: 3, w: 3 });
    if (yard.x1 - yard.x0 < 14 || yard.z1 - yard.z0 < 14) return farmyard(ctx, lot, rng) || 0;
    const long = rng.range(22, 30);
    const wide = rng.range(13, 17);
    // The ridge runs away from the street, so the doors face it.
    const r = atFront(yard, side, wide, long, rng.range(0.2, 0.8));
    const wall = VH.col(rng.pick([0xa8432f, 0x9b3b2b, 0xb04a32, 0x8a7a66, 0xa8432f]), rng.range(0.92, 1.05));
    const trim = VH.col(0xf2efe8);
    const eave = KERB + rng.range(5, 6.5);
    facadeWalls(b, r.x0, 0, r.z0, r.x1, eave, r.z1, { wall, style: 1, ww: 0.25, wh: 0.3, bay: 7, floorH: eave, seed, vStart: 0.45 });
    // Gambrel roof: a steep lower slope and a shallow upper one each side.
    const roofCol = VH.col(rng.pick([0x5c5f63, 0x4a4d50, 0x3f5a48]));
    const alongX = r.x1 - r.x0 >= r.z1 - r.z0;
    const span = alongX ? r.z1 - r.z0 : r.x1 - r.x0;
    const e = span * 0.2, y1 = eave + span * 0.22, y2 = y1 + span * 0.16;
    if (alongX) {
      const zA = r.z1 - e, zB = r.z0 + e, zm = (r.z0 + r.z1) / 2;
      b.polygon([[r.x0, eave, r.z1], [r.x1, eave, r.z1], [r.x1, y1, zA], [r.x0, y1, zA]], roofCol);
      b.polygon([[r.x0, y1, zA], [r.x1, y1, zA], [r.x1, y2, zm], [r.x0, y2, zm]], roofCol);
      b.polygon([[r.x1, eave, r.z0], [r.x0, eave, r.z0], [r.x0, y1, zB], [r.x1, y1, zB]], roofCol);
      b.polygon([[r.x1, y1, zB], [r.x0, y1, zB], [r.x0, y2, zm], [r.x1, y2, zm]], roofCol);
      b.polygon([[r.x1, eave, r.z1], [r.x1, eave, r.z0], [r.x1, y1, zB], [r.x1, y2, zm], [r.x1, y1, zA]], wall, [0, 0, 0, seed]);
      b.polygon([[r.x0, eave, r.z0], [r.x0, eave, r.z1], [r.x0, y1, zA], [r.x0, y2, zm], [r.x0, y1, zB]], wall, [0, 0, 0, seed]);
    } else {
      const xA = r.x1 - e, xB = r.x0 + e, xm = (r.x0 + r.x1) / 2;
      b.polygon([[r.x1, eave, r.z1], [r.x1, eave, r.z0], [xA, y1, r.z0], [xA, y1, r.z1]], roofCol);
      b.polygon([[xA, y1, r.z1], [xA, y1, r.z0], [xm, y2, r.z0], [xm, y2, r.z1]], roofCol);
      b.polygon([[r.x0, eave, r.z0], [r.x0, eave, r.z1], [xB, y1, r.z1], [xB, y1, r.z0]], roofCol);
      b.polygon([[xB, y1, r.z0], [xB, y1, r.z1], [xm, y2, r.z1], [xm, y2, r.z0]], roofCol);
      b.polygon([[r.x0, eave, r.z1], [r.x1, eave, r.z1], [xA, y1, r.z1], [xm, y2, r.z1], [xB, y1, r.z1]], wall, [0, 0, 0, seed]);
      b.polygon([[r.x1, eave, r.z0], [r.x0, eave, r.z0], [xB, y1, r.z0], [xm, y2, r.z0], [xA, y1, r.z0]], wall, [0, 0, 0, seed]);
    }
    // White corner boards, the great doors (white frame, X braces) and the hay loft door.
    for (const [x, z] of [[r.x0, r.z0], [r.x1, r.z0], [r.x0, r.z1], [r.x1, r.z1]]) b.box(x - 0.2, 0, z - 0.2, x + 0.2, eave, z + 0.2, trim);
    alongFace(r, side, 0.12, (x0, z0, x1, z1, ox, oz) => {
      const hx = oz !== 0;
      const mid = hx ? (x0 + x1) / 2 : (z0 + z1) / 2;
      const dw = Math.min(5, (hx ? x1 - x0 : z1 - z0) * 0.32);
      const box = (a0, a1, y0, y3, col) => (hx ? b.box(a0, y0, z0, a1, y3, z1, col) : b.box(x0, y0, a0, x1, y3, a1, col));
      box(mid - dw - 0.25, mid + dw + 0.25, KERB, KERB + 4.6, trim);
      box(mid - dw, mid + dw, KERB, KERB + 4.35, VH.colMul(wall, 0.8));
      for (const [a, c] of [[mid - dw, mid], [mid, mid + dw]]) {
        box(a + 0.1, c - 0.1, KERB + 2.1, KERB + 2.35, trim);
        box(a + 0.1, a + 0.35, KERB, KERB + 4.35, trim);
      }
      box(mid - 1.1, mid + 1.1, eave - 0.6, eave + 1.4, trim);
      box(mid - 0.9, mid + 0.9, eave - 0.4, eave + 1.2, VH.col(0x3a2a20));
    });
    addCollider(ctx, r.x0 - 0.2, r.z0 - 0.2, r.x1 + 0.2, r.z1 + 0.2, y1); // (the corner boards and the doors stand proud of the walls)
    farmyard(ctx, { minX: yard.x0, maxX: yard.x1, minZ: yard.z0, maxZ: yard.z1, front: lot.front, district: lot.district }, rng, r);
    return y2;
  }

  /** A dirt farmyard (the rest of a farm lot): packed earth, a few hay bales, a water trough. */
  function farmyard(ctx, lot, rng, avoid) {
    const x0 = lot.minX, x1 = lot.maxX, z0 = lot.minZ, z1 = lot.maxZ;
    ctx.asphaltTop.topRect(x0, z0, x1, z1, KERB, VH.col(0xa4865c, 4.5), 6); // the asphalt grain, browned: packed earth
    const n = rng.int(2, 6);
    const clear = (x, z) => !avoid || x < avoid.x0 - 2 || x > avoid.x1 + 2 || z < avoid.z0 - 2 || z > avoid.z1 + 2;
    for (let i = 0; i < n; i++) {
      const x = rng.range(x0 + 2, x1 - 2), z = rng.range(z0 + 2, z1 - 2);
      if (clear(x, z)) hayBale(ctx, x, z, KERB, rng.range(0.9, 1.1));
    }
    if (rng.chance(0.5)) {
      const x = rng.range(x0 + 3, x1 - 4), z = rng.range(z0 + 3, z1 - 3);
      if (clear(x, z)) {
        ctx.detail.box(x, KERB, z - 0.4, x + 2.4, KERB + 0.6, z + 0.4, VH.col(0x8a9096));
        ctx.physics.addBox(x, 0, z - 0.4, x + 2.4, KERB + 0.6, z + 0.4, 'metal');
      }
    }
    return 0;
  }

  /** Silos: one to three tall round bins with domed caps on a concrete pad, and a machine shed. */
  function silo(ctx, lot, rng) {
    const yard = insetRect(lot, { n: 3, s: 3, e: 3, w: 3 });
    if (yard.x1 - yard.x0 < 12 || yard.z1 - yard.z0 < 12) return farmyard(ctx, lot, rng) || 0;
    const side = mainFront(lot);
    ctx.concrete.topRect(yard.x0, yard.z0, yard.x1, yard.z1, KERB + 0.01, VH.col(0xc4c0b8), 4);
    const n = rng.int(1, 3);
    const rad = rng.range(3, 4);
    const h = rng.range(15, 22);
    const steel = VH.col(rng.pick([0xd8dcdf, 0xc9cfd4, 0xb8c0c6]));
    // In a row along the back of the lot.
    const back = { n: 's', s: 'n', e: 'w', w: 'e' }[side];
    const row = atFront(yard, back, n * (rad * 2 + 1.5), rad * 2 + 1, 0.5);
    const horiz = side === 'n' || side === 's';
    let top = 0;
    for (let i = 0; i < n; i++) {
      const cx = horiz ? row.x0 + rad + 0.75 + i * (rad * 2 + 1.5) : (row.x0 + row.x1) / 2;
      const cz = horiz ? (row.z0 + row.z1) / 2 : row.z0 + rad + 0.75 + i * (rad * 2 + 1.5);
      ctx.prop.cylinder(cx, KERB, cz, rad, rad, h, 14, steel, false);
      ctx.prop.cylinder(cx, KERB + h, cz, rad * 1.02, 0.4, rad * 0.7, 14, VH.colMul(steel, 0.9), true);
      for (let y = KERB + 3; y < h; y += 3) ctx.prop.cylinder(cx, y, cz, rad + 0.06, rad + 0.06, 0.18, 14, VH.colMul(steel, 0.8), false);
      // The caged ladder up its side.
      const lad = horiz ? [cx - 0.3, cz - rad - 0.35, cx + 0.3, cz - rad - 0.05] : [cx - rad - 0.35, cz - 0.3, cx - rad - 0.05, cz + 0.3];
      ctx.prop.box(lad[0], KERB, lad[1], lad[2], KERB + h, lad[3], VH.col(0x6b6e72));
      ctx.physics.addBox(lad[0], 0, lad[1], lad[2], KERB + h, lad[3], 'metal');
      roundCollider(ctx.physics, cx, cz, rad + 0.06, 0, KERB + h + rad * 0.7, 'metal'); // (to the hoops' edge)
      top = Math.max(top, KERB + h + rad * 0.7);
    }
    // A machine shed by the street.
    const shedR = atFront(yard, side, rng.range(10, 14), rng.range(7, 9), rng.chance(0.5) ? 0.15 : 0.85);
    const shedTop = KERB + rng.range(4, 5);
    const wall = VH.col(rng.pick([0x8a8f96, 0xa8432f, 0x9a968e]));
    facadeWalls(ctx.b, shedR.x0, KERB, shedR.z0, shedR.x1, shedTop, shedR.z1, { wall, style: 3, ww: 0.9, wh: 0.15, bay: 5, floorH: shedTop - KERB, seed: rng.range(0, 100), vStart: 0.7 });
    roof(ctx.b, shedR.x0, shedR.z0, shedR.x1, shedR.z1, shedTop, VH.col(0x5a5f66), 3);
    addCollider(ctx, shedR.x0, shedR.z0, shedR.x1, shedR.z1, shedTop);
    return top;
  }

  /** Warehouse: a tall blank box with a raised loading dock and dock doors along the front, a lorry yard. */
  function warehouse(ctx, lot, rng) {
    const b = ctx.b;
    const pal = lot.district.palette;
    const seed = rng.range(0, 100);
    const side = mainFront(lot);
    const inset = { n: 2, s: 2, e: 2, w: 2 };
    inset[side] = rng.range(12, 16); // room for a lorry to back up
    const r = insetRect(lot, inset);
    if (r.x1 - r.x0 < 12 || r.z1 - r.z0 < 12) return parking(ctx, lot) || 0;
    const floors = rng.int(lot.floorRange[0], lot.floorRange[1]);
    const top = KERB + 7 + floors * 2.5;
    const wall = pick(rng, pal.walls, 0.05);
    facadeWalls(b, r.x0, KERB, r.z0, r.x1, top, r.z1, { wall, style: 3, ww: 0.95, wh: 0.12, bay: rng.range(6, 8), floorH: top - KERB, seed, vStart: 0.85 });
    const roofCol = pick(rng, pal.roofs, 0.05);
    roof(b, r.x0, r.z0, r.x1, r.z1, top, roofCol, seed);
    parapet(b, r.x0, r.z0, r.x1, r.z1, top, 0.8, 0.3, VH.colMul(wall, 0.9));
    // Roof lights in rows.
    for (let x = r.x0 + 4; x < r.x1 - 4; x += 8) for (let z = r.z0 + 4; z < r.z1 - 4; z += 10) b.box(x, top, z, x + 2.2, top + 0.5, z + 3, VH.col(0xcfe0ea));
    addCollider(ctx, r.x0, r.z0, r.x1, r.z1, top + 0.8);
    // The loading dock: a 1.2 m concrete platform along the front with dock doors and black bumpers.
    const accent = pick(rng, pal.accents, 0.05);
    alongFace(r, side, 3, (x0, z0, x1, z1, ox, oz) => {
      ctx.concrete.box(x0, 0, z0, x1, KERB + 1.05, z1, VH.col(0xb8b4ac), { uvScale: 4 });
      ctx.physics.addBox(x0, 0, z0, x1, KERB + 1.05, z1, 'concrete');
    });
    alongFace(r, side, inset[side] - 3.2, (x0, z0, x1, z1) => {
      ctx.asphaltTop.topRect(x0, z0, x1, z1, KERB, VH.col(0xbcbcbc), 6);
    });
    const len = side === 'n' || side === 's' ? r.x1 - r.x0 : r.z1 - r.z0;
    const n = Math.max(1, Math.floor(len / 7));
    for (let i = 0; i < n; i++) {
      const c = (i + 0.5) * (len / n);
      const w = 3;
      const y0 = KERB + 1.05, y1 = KERB + 4.3;
      if (side === 's') { b.box(r.x0 + c - w / 2, y0, r.z1, r.x0 + c + w / 2, y1, r.z1 + 0.1, VH.col(0x8a8f96)); b.box(r.x0 + c - w / 2 - 0.3, y1, r.z1, r.x0 + c + w / 2 + 0.3, y1 + 0.4, r.z1 + 0.15, accent); }
      else if (side === 'n') { b.box(r.x0 + c - w / 2, y0, r.z0 - 0.1, r.x0 + c + w / 2, y1, r.z0, VH.col(0x8a8f96)); b.box(r.x0 + c - w / 2 - 0.3, y1, r.z0 - 0.15, r.x0 + c + w / 2 + 0.3, y1 + 0.4, r.z0, accent); }
      else if (side === 'e') { b.box(r.x1, y0, r.z0 + c - w / 2, r.x1 + 0.1, y1, r.z0 + c + w / 2, VH.col(0x8a8f96)); b.box(r.x1, y1, r.z0 + c - w / 2 - 0.3, r.x1 + 0.15, y1 + 0.4, r.z0 + c + w / 2 + 0.3, accent); }
      else { b.box(r.x0 - 0.1, y0, r.z0 + c - w / 2, r.x0, y1, r.z0 + c + w / 2, VH.col(0x8a8f96)); b.box(r.x0 - 0.15, y1, r.z0 + c - w / 2 - 0.3, r.x0, y1 + 0.4, r.z0 + c + w / 2 + 0.3, accent); }
    }
    return top + 0.8;
  }

  /** Depot: a yard under a big open canopy on steel columns (lorries, buses), with an office cabin at one end. */
  function depot(ctx, lot, rng) {
    const b = ctx.b;
    const pal = lot.district.palette;
    const side = mainFront(lot);
    const yard = insetRect(lot, { n: 1.5, s: 1.5, e: 1.5, w: 1.5 });
    if (yard.x1 - yard.x0 < 14 || yard.z1 - yard.z0 < 14) return parking(ctx, lot) || 0;
    ctx.asphaltTop.topRect(yard.x0, yard.z0, yard.x1, yard.z1, KERB, VH.col(0xb4b4b4), 6);
    const back = { n: 's', s: 'n', e: 'w', w: 'e' }[side];
    const horiz = side === 'n' || side === 's';
    const deep = horiz ? yard.z1 - yard.z0 : yard.x1 - yard.x0;
    const c = atFront(yard, back, 999, Math.max(8, deep * 0.6), 0.5);
    const h = KERB + rng.range(6.5, 7.5);
    const steel = VH.col(0x6b6e72);
    const roofCol = pick(rng, pal.roofs, 0.05);
    b.box(c.x0 - 0.5, h, c.z0 - 0.5, c.x1 + 0.5, h + 0.6, c.z1 + 0.5, roofCol, { bottom: true });
    b.box(c.x0 - 0.5, h - 0.8, c.z0 - 0.5, c.x1 + 0.5, h, c.z1 + 0.5, pick(rng, pal.accents, 0.05), { skip: { top: true, bottom: true } });
    for (let x = c.x0 + 0.5; x <= c.x1 - 0.4; x += Math.max(6, (c.x1 - c.x0 - 1) / Math.max(1, Math.round((c.x1 - c.x0) / 9)))) {
      for (const z of [c.z0 + 0.5, c.z1 - 0.5]) {
        b.box(x - 0.2, KERB, z - 0.2, x + 0.2, h - 0.8, z + 0.2, steel);
        ctx.physics.addBox(x - 0.22, 0, z - 0.22, x + 0.22, h - 0.8, z + 0.22, 'metal');
      }
    }
    // The office: a two-storey cabin at the street end.
    const o = atFront(yard, side, rng.range(8, 12), rng.range(5, 7), rng.chance(0.5) ? 0.08 : 0.92);
    const wall = pick(rng, pal.walls, 0.05);
    const oTop = KERB + 6.2;
    facadeWalls(b, o.x0, KERB, o.z0, o.x1, oTop, o.z1, { wall, style: 1, ww: 0.6, wh: 0.5, bay: 2.6, floorH: 3.1, seed: rng.range(0, 100) });
    roof(b, o.x0, o.z0, o.x1, o.z1, oTop, VH.col(0x5a5f66), 7);
    addCollider(ctx, o.x0, o.z0, o.x1, o.z1, oTop);
    return h + 0.6;
  }

  /** Terraced houses: a row of narrow two- or three-storey houses along the street, each its own colour and door. */
  function terrace(ctx, lot, rng) {
    const b = ctx.b;
    const pal = lot.district.palette;
    const side = mainFront(lot);
    const inset = { n: 1, s: 1, e: 1, w: 1 };
    inset[side] = rng.range(1.5, 3);
    const yard = insetRect(lot, inset);
    const horiz = side === 'n' || side === 's';
    const len = horiz ? yard.x1 - yard.x0 : yard.z1 - yard.z0;
    const deep = Math.min(horiz ? yard.z1 - yard.z0 : yard.x1 - yard.x0, rng.range(9, 11));
    if (len < 6 || deep < 6) return courtyard(ctx, lot, rng) || 0;
    const r = atFront(yard, side, len, deep, 0.5);
    const floors = rng.int(lot.floorRange[0], lot.floorRange[1]);
    const floorH = 3.0;
    const top = KERB + 0.4 + floors * floorH;
    const units = Math.max(1, Math.round(len / rng.range(5, 6.5)));
    const uw = len / units;
    const brick = rng.chance(0.6);
    const base = pick(rng, pal.walls, 0.04);
    const door = pick(rng, pal.accents, 0.05);
    b.box(r.x0, 0, r.z0, r.x1, KERB + 0.4, r.z1, VH.col(0x8a8580), { skip: { top: true } });
    for (let i = 0; i < units; i++) {
      const wall = brick ? shade(base, rng, 0.06) : pick(rng, pal.walls, 0.05);
      const u = horiz ? { x0: r.x0 + i * uw, x1: r.x0 + (i + 1) * uw, z0: r.z0, z1: r.z1 } : { x0: r.x0, x1: r.x1, z0: r.z0 + i * uw, z1: r.z0 + (i + 1) * uw };
      const sides = horiz ? { e: i < units - 1 ? 'skip' : 'win', w: i > 0 ? 'skip' : 'win' } : { s: i < units - 1 ? 'skip' : 'win', n: i > 0 ? 'skip' : 'win' };
      facadeWalls(b, u.x0, KERB + 0.4, u.z0, u.x1, top, u.z1, { wall, style: 1, ww: 0.5, wh: 0.58, bay: uw / 2, floorH, seed: rng.range(0, 100) }, sides);
      // The front door, up a step.
      alongFace(u, side, 0.1, (x0, z0, x1, z1, ox, oz) => {
        const a = oz !== 0 ? (x0 + x1) / 2 : (z0 + z1) / 2;
        if (oz !== 0) b.box(a - 0.5, KERB + 0.4, z0, a + 0.5, KERB + 2.5, z1, i % 3 === 0 ? door : VH.colMul(door, 0.85));
        else b.box(x0, KERB + 0.4, a - 0.5, x1, KERB + 2.5, a + 0.5, i % 3 === 0 ? door : VH.colMul(door, 0.85));
      });
      // A chimney stack on every other party wall.
      if (i % 2 === 0) {
        const cx = horiz ? u.x0 + 0.1 : (u.x0 + u.x1) / 2, cz = horiz ? (u.z0 + u.z1) / 2 : u.z0 + 0.1;
        b.box(cx - 0.45, top, cz - 0.6, cx + 0.45, top + Math.min(3, deep * 0.3) + 1.2, cz + 0.6, VH.col(0x7a3f33));
      }
    }
    const yr = gableRoof(b, r, top, Math.min(3, deep * 0.3), 0.35, pick(rng, pal.roofs, 0.05), base, rng.range(0, 100));
    addCollider(ctx, r.x0, r.z0, r.x1, r.z1, top + (yr - top) * 0.6);
    // Back gardens.
    const backSide = { n: 's', s: 'n', e: 'w', w: 'e' }[side];
    alongFace(r, backSide, (horiz ? yard.z1 - yard.z0 : yard.x1 - yard.x0) - deep, (x0, z0, x1, z1) => {
      if (x1 - x0 < 1 || z1 - z0 < 1) return;
      ctx.grassTop.topRect(x0, z0, x1, z1, KERB, VH.col(0xffffff), 6);
      if (ctx.addLawn) ctx.addLawn(x0, z0, x1, z1);
    });
    return yr + 1.2;
  }

  /** Big-box store: a long, plain, tall box with a coloured fascia, a glazed entrance and a car park in front. */
  function bigbox(ctx, lot, rng) {
    const b = ctx.b;
    const pal = lot.district.palette;
    const side = mainFront(lot);
    const inset = { n: 2, s: 2, e: 2, w: 2 };
    inset[side] = Math.min(28, ((side === 'n' || side === 's' ? lot.maxZ - lot.minZ : lot.maxX - lot.minX) - 4) * 0.4);
    const r = insetRect(lot, inset);
    if (r.x1 - r.x0 < 16 || r.z1 - r.z0 < 14) return parking(ctx, lot) || 0;
    const top = KERB + rng.range(7.5, 9.5);
    const wall = VH.col(rng.pick([0xd8d4cc, 0xc9c2b2, 0xe4e0d8, 0xb8bcc2]));
    facadeWalls(b, r.x0, KERB, r.z0, r.x1, top, r.z1, { wall, style: 0, ww: 0, wh: 0, bay: 8, floorH: top - KERB, seed: 1 });
    roof(b, r.x0, r.z0, r.x1, r.z1, top, VH.col(0x8a8f94), 5);
    addCollider(ctx, r.x0, r.z0, r.x1, r.z1, top + 0.4);
    const fascia = pick(rng, pal.accents, 0.03);
    alongFace(r, side, 0.25, (x0, z0, x1, z1, ox, oz) => {
      // The fascia band along the top, and a glazed entrance in the middle under a canopy.
      b.box(x0, top - 2, z0, x1, top + 0.4, z1, fascia);
      const hx = oz !== 0;
      const mid = hx ? (x0 + x1) / 2 : (z0 + z1) / 2;
      if (hx) {
        b.wall([mid - 6, KERB, oz > 0 ? z1 : z0], 1, 0, 12, 4, VH.col(0x2e3a45), null, [0, 4, 0, 1], [0.95, 0.85, 2, 3]);
        b.box(mid - 7, KERB + 4.2, oz > 0 ? z1 : z0 - 3, mid + 7, KERB + 4.6, oz > 0 ? z1 + 3 : z0, fascia, { bottom: true });
      } else {
        b.wall([ox > 0 ? x1 : x0, KERB, mid + 6], 0, -1, 12, 4, VH.col(0x2e3a45), null, [0, 4, 0, 1], [0.95, 0.85, 2, 3]);
        b.box(ox > 0 ? x1 : x0 - 3, KERB + 4.2, mid - 7, ox > 0 ? x1 + 3 : x0, KERB + 4.6, mid + 7, fascia, { bottom: true });
      }
    });
    // The car park in front.
    alongFace(r, side, inset[side] - 0.5, (x0, z0, x1, z1) => {
      parking(ctx, { minX: x0, maxX: x1, minZ: z0, maxZ: z1, front: { n: false, s: false, e: false, w: false } });
    });
    return top + 0.4;
  }

  const ARCHETYPES = { tower, office, shophouse, apartment, hotel, villa, house, shed, lowrise, farmhouse, barn, silo, warehouse, depot, terrace, bigbox };

  const Buildings = {
    /** Build one lot. Returns the height of the tallest point. */
    buildLot(ctx, lot) {
      const rng = new VH.RNG(lot.seed);
      if (lot.kind === 'parking') {
        if (lot.district && lot.district.yard === 'dirt') farmyard(ctx, lot, rng); // 4.0: a farm's empty lot is its yard
        else parking(ctx, lot);
        return 0;
      }
      if (lot.kind === 'courtyard') {
        courtyard(ctx, lot, rng);
        return 0;
      }
      const fn = ARCHETYPES[lot.archetype] || office;
      // Downtown interior lots stay lower so street walls read clearly.
      if (lot.interior && lot.archetype === 'tower') return office(ctx, lot, rng);
      return fn(ctx, lot, rng);
    },

    /** The landmark tower: three glass tiers, a lit crown band and a spire. */
    buildVicehavenTower(ctx, block) {
      const b = ctx.b;
      const rng = new VH.RNG('vicehaven-tower');
      const cx = block.cx;
      const cz = block.cz;
      const seed = 42.5;
      const frame = VH.col(0x3c4a57);
      const roofCol = VH.col(0x4a4f55);
      // Podium with a colonnade of storefronts.
      const pw = 30;
      const podH = 16;
      const lot = { front: { n: true, s: true, e: true, w: true } };
      groundFloor(b, { x0: cx - pw, x1: cx + pw, z0: cz - pw, z1: cz + pw }, KERB, 6, lot, VH.col(0x2e3a45), seed, rng);
      facadeWalls(b, cx - pw, KERB + 6, cz - pw, cx + pw, KERB + podH, cz + pw,
        { wall: frame, style: 3, ww: 1, wh: 0.55, bay: 3.2, floorH: 5, seed });
      roof(b, cx - pw, cz - pw, cx + pw, cz + pw, KERB + podH, roofCol, seed);
      ctx.physics.addBox(cx - pw, 0, cz - pw, cx + pw, KERB + podH, cz + pw, 'building');

      const F = { wall: frame, style: 2, ww: 0.94, wh: 0.8, bay: 3.2, floorH: 4, seed };
      const tiers = [[21, 118], [17, 64], [13, 40]];
      let y = KERB + podH;
      for (const [half, h] of tiers) {
        facadeWalls(b, cx - half, y, cz - half, cx + half, y + h, cz + half, F);
        // Lit band at each setback.
        const band = { wall: VH.col(0x1b2630), style: 3, ww: 1, wh: 0.7, bay: 1.6, floorH: 1.6, seed: 91.3 };
        facadeWalls(b, cx - half - 0.3, y + h, cz - half - 0.3, cx + half + 0.3, y + h + 1.6, cz + half + 0.3, band);
        roof(b, cx - half - 0.3, cz - half - 0.3, cx + half + 0.3, cz + half + 0.3, y + h + 1.6, roofCol, seed);
        ctx.physics.addBox(cx - half, 0, cz - half, cx + half, y + h + 1.6, cz + half, 'building');
        y += h + 1.6;
      }
      // Crown and spire.
      facadeWalls(b, cx - 8, y, cz - 8, cx + 8, y + 10, cz + 8, { wall: VH.col(0x26313b), style: 3, ww: 1, wh: 0.8, bay: 2, floorH: 2.5, seed: 17.7 });
      roof(b, cx - 8, cz - 8, cx + 8, cz + 8, y + 10, roofCol, seed, false);
      b.cylinder(cx, y + 10, cz, 2.2, 0.35, 48, 8, VH.col(0xc9ced4), false);
      ctx.addBeacon(cx, y + 58.5, cz);
      return y + 58;
    },
  };

  /** 4.0: the archetypes themselves, for district builders: VH.Buildings.archetypes.barn(ctx, lot, rng). */
  Buildings.archetypes = ARCHETYPES;
  Buildings.hayBale = hayBale;

  VH.Buildings = Buildings;
})();
