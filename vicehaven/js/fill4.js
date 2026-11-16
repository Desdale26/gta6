/*
 * fill4.js — the generic fill of the VICEHAVEN 4.0 districts' country
 * blocks (world.js hands them over from _buildBlock3).
 *
 *   fields    crop fields in strips of colour across the block: wheat,
 *             barley, oilseed, lettuce and cabbage rows, ploughed furrows,
 *             corn and sunflowers taller than Jay, hay meadows with round
 *             bales; a hedge round the edge with field gates on the lanes,
 *             hedgerow trees
 *   farms     a farm block (cells4 arch 'farm'): its lots are farmhouses,
 *             barns, silos and dirt yards (buildings.js); here the grass
 *             verge it stands on and a post-and-rail fence round it
 *   greens    a 4.0 'park' block: a lawn with a path down the middle,
 *             trees both sides, benches and lamps
 *   paddocks  a farm block's inner lots: fenced grass with cows, sheep or
 *             horses grazing and a water trough
 *   allotments  rows of little plots either side of a gravel path: veg
 *             beds, bean canes, sheds and water butts
 *
 * A block's `low` z range (the runway's line) gets no trees and no lamps.
 * VH.Data.open4 is ground left open on purpose (declared with
 * VH.Districts.open for tools/emptiness.mjs, from this file's builder).
 *
 * Country blocks stand on a raised grass verge instead of a concrete
 * pavement, and get lamps only every 60 m, on the sides that face a road.
 * Everything is merged into the chunk builders or instanced (trees, lamps);
 * the small things (fences, gates, animals, bales, troughs, sheds, veg
 * beds) go on the chunks' detail surfaces, hidden beyond 320 m. Crops are
 * walk-through (you can push through corn) and marked for the collision
 * audit; hedges, fences, gateposts and bales are solid.
 *
 *   VH.Fill4.block(world, block) -> true if it built the block
 */
(function () {
  'use strict';

  const VH = window.VH;
  const KERB = 0.15;
  const PIECE = 96; // longest piece drawn through one chunk's builder
  const F = () => VH.COLLIDE;

  // Crops: colour, height (m), row spacing and row width (m), and which surface.
  const CROPS = {
    wheat: { w: 5, top: 0xd9b44a, side: 0xb8923a, h: 0.85, rows: 1.6, rowW: 1.6, surf: 'concrete' },
    barley: { w: 3, top: 0xc9b26a, side: 0xa8904e, h: 0.75, rows: 1.6, rowW: 1.6, surf: 'concrete' },
    oilseed: { w: 2, top: 0xf0d820, side: 0x8aa83a, h: 1.0, rows: 1.6, rowW: 1.6, surf: 'concrete' },
    lettuce: { w: 2, top: 0x86c84e, side: 0x5e9a36, h: 0.28, rows: 0.9, rowW: 0.5, surf: 'concrete', soil: true },
    cabbage: { w: 1, top: 0x6aa878, side: 0x4e8a5a, h: 0.4, rows: 1.0, rowW: 0.6, surf: 'concrete', soil: true },
    plough: { w: 2, top: 0xb08a60, side: 0x94704c, h: 0.16, rows: 1.0, rowW: 0.55, surf: 'concrete', soil: true },
    corn: { w: 2, top: 0x8ab84a, side: 0x6a9a3a, h: 2.2, rows: 1.1, rowW: 0.7, surf: 'hedge', soil: true },
    sunflower: { w: 2, top: 0xf2c318, side: 0x5e8a2e, h: 1.7, rows: 1.2, rowW: 0.6, surf: 'hedge', soil: true, head: true },
    hay: { w: 2, top: 0xc8c070, side: 0xa8a050, h: 0.35, rows: 2.0, rowW: 2.0, surf: 'concrete', bales: true },
    lavender: { w: 1, top: 0x9a7ac8, side: 0x6a8a5a, h: 0.6, rows: 1.3, rowW: 0.8, surf: 'hedge', soil: true },
  };
  const CROP_LIST = Object.keys(CROPS).map((k) => ({ k, weight: CROPS[k].w }));

  function isCountry(block) {
    return block.v4 && (block.kind === 'fields' || block.kind === 'allotments' || block.arch === 'farm' || (block.kind !== 'plot' && block.kind !== 'park' && block.district && block.district.id === 'haverly'));
  }

  /** Is z inside the block's low band (the runway's line: no trees, no lamps)? */
  function lowAt(block, z) {
    return !!block.low && z > block.low[0] && z < block.low[1];
  }

  /** Call fn(a0, a1) for each piece of [a0, a1] no longer than PIECE. */
  function pieces(a0, a1, fn) {
    const n = Math.max(1, Math.ceil((a1 - a0) / PIECE - 1e-6));
    for (let i = 0; i < n; i++) fn(a0 + ((a1 - a0) * i) / n, a0 + ((a1 - a0) * (i + 1)) / n);
  }

  /** The block's roads: which sides face one (a lane, not open ground). */
  function roadSides(world, block) {
    const L = world.layout;
    const near = (axis, edge, out, along) => L.roads.some((r) => r.axis === axis && Math.abs(r.coord - (r.width / 2) * out - edge) < 0.6 && along > r.from && along < r.to);
    return {
      n: near('x', block.minZ, -1, block.cx), s: near('x', block.maxZ, 1, block.cx),
      w: near('z', block.minX, -1, block.cz), e: near('z', block.maxX, 1, block.cz),
    };
  }

  /** The raised grass verge a country block stands on (kerbed like a pavement, grass on top). */
  function verge(world, block) {
    const { minX, maxX, minZ, maxZ } = block;
    pieces(minX, maxX, (x0, x1) => pieces(minZ, maxZ, (z0, z1) => {
      const ctx = world.ctxAt((x0 + x1) / 2, (z0 + z1) / 2);
      ctx.concrete.box(x0, 0, z0, x1, KERB, z1, VH.col(0xc9c4b8), { skip: { top: true, n: z0 > minZ, s: z1 < maxZ, w: x0 > minX, e: x1 < maxX } });
      ctx.grass.topRect(x0, z0, x1, z1, KERB, VH.col(0xf0f4e0), 6);
    }));
    world.physics.addBox(minX, -0.5, minZ, maxX, KERB, maxZ, 'kerb');
    world.addLawn(minX, minZ, maxX, maxZ);
  }

  /**
   * A line of hedge (or a post-and-rail fence) round the inside of a block,
   * `inset` in from its edge, with gaps (gates) at the given spots on the
   * road sides. kind 'hedge' | 'fence'.
   */
  function boundary(world, block, inset, kind, sides, rng) {
    const r = { x0: block.minX + inset, x1: block.maxX - inset, z0: block.minZ + inset, z1: block.maxZ - inset };
    const runs = [
      { s: 'n', alongX: true, c: r.z0, a0: r.x0, a1: r.x1 },
      { s: 's', alongX: true, c: r.z1, a0: r.x0, a1: r.x1 },
      { s: 'w', alongX: false, c: r.x0, a0: r.z0, a1: r.z1 },
      { s: 'e', alongX: false, c: r.x1, a0: r.z0, a1: r.z1 },
    ];
    const green = VH.col(0x3f6a30);
    const post = VH.col(0x8a6a48);
    for (const run of runs) {
      // Gates every ~110 m on a side that faces a lane; the rest is closed.
      const gates = [];
      if (sides[run.s]) {
        const n = Math.max(1, Math.round((run.a1 - run.a0) / 110));
        for (let i = 0; i < n; i++) gates.push(run.a0 + ((run.a1 - run.a0) * (i + 0.5)) / n + rng.range(-8, 8));
      }
      let cuts = [[run.a0, run.a1]];
      for (const g of gates) {
        const next = [];
        for (const [p, q] of cuts) {
          if (g - 2.5 > p && g + 2.5 < q) next.push([p, g - 2.5], [g + 2.5, q]);
          else next.push([p, q]);
        }
        cuts = next;
      }
      for (const [p0, p1] of cuts) {
        if (p1 - p0 < 0.5) continue;
        pieces(p0, p1, (a, b) => {
          const x0 = run.alongX ? a : run.c - 0.45, x1 = run.alongX ? b : run.c + 0.45;
          const z0 = run.alongX ? run.c - 0.45 : a, z1 = run.alongX ? run.c + 0.45 : b;
          const ctx = world.ctxAt((x0 + x1) / 2, (z0 + z1) / 2);
          if (kind === 'hedge') {
            ctx.hedge.box(x0, KERB, z0, x1, KERB + 1.4, z1, VH.colMul(green, 0.9 + rng.range(0, 0.2)));
            world.physics.addBox(x0, 0, z0, x1, KERB + 1.4, z1, 'hedge', F().SOLID | F().SHOTS);
          } else {
            // Post and rail: posts every 2.5 m, two rails.
            const ax0 = run.alongX ? a : run.c - 0.06, ax1 = run.alongX ? b : run.c + 0.06;
            const az0 = run.alongX ? run.c - 0.06 : a, az1 = run.alongX ? run.c + 0.06 : b;
            for (const y of [0.55, 1.0]) ctx.detailWood.box(ax0, KERB + y, az0, ax1, KERB + y + 0.12, az1, post);
            for (let p = a; p <= b + 0.01; p += 2.5) {
              const px = run.alongX ? p : run.c, pz = run.alongX ? run.c : p;
              ctx.detailWood.box(px - 0.08, KERB, pz - 0.08, px + 0.08, KERB + 1.25, pz + 0.08, post);
            }
            world.physics.addBox(ax0, 0, az0, ax1, KERB + 1.25, az1, 'fence', F().SOLID);
          }
        });
      }
      // Gateposts (and an open field gate swung back) at each gap.
      for (const g of gates) {
        if (g - 2.5 < run.a0 || g + 2.5 > run.a1) continue;
        (block.gates || (block.gates = [])).push({ side: run.s, at: g });
        const ctx = world.ctxAt(run.alongX ? g : run.c, run.alongX ? run.c : g);
        for (const s of [-1, 1]) {
          const p = g + s * 2.6;
          const px = run.alongX ? p : run.c, pz = run.alongX ? run.c : p;
          ctx.detailWood.box(px - 0.15, KERB, pz - 0.15, px + 0.15, KERB + 1.5, pz + 0.15, post);
          world.physics.addBox(px - 0.16, 0, pz - 0.16, px + 0.16, KERB + 1.5, pz + 0.16, 'pole', F().SOLID | F().SHOTS);
        }
        // The gate stands open, flat against the hedge line on one side.
        const p0 = g + 2.6, p1 = g + 5.4;
        const gx0 = run.alongX ? p0 : run.c - 0.05, gx1 = run.alongX ? p1 : run.c + 0.05;
        const gz0 = run.alongX ? run.c + 0.5 : p0, gz1 = run.alongX ? run.c + 0.6 : p1;
        const steel = VH.col(0x9aa0a6);
        for (const y of [0.3, 0.7, 1.1]) ctx.detail.box(gx0, KERB + y, gz0, gx1, KERB + y + 0.06, gz1, steel);
        world.physics.addBox(gx0, 0, gz0, gx1, KERB + 1.16, gz1, 'metal', F().SOLID);
      }
    }
  }

  /** Hedgerow trees and the odd lamp along a country block's road sides. */
  function countryFurniture(world, block, sides, rng) {
    const T = block.district.trees || {};
    const type = T.type || 'tree';
    const edges = [
      { s: 'n', alongX: true, c: block.minZ + 0.7, a0: block.minX, a1: block.maxX, yaw: Math.PI },
      { s: 's', alongX: true, c: block.maxZ - 0.7, a0: block.minX, a1: block.maxX, yaw: 0 },
      { s: 'w', alongX: false, c: block.minX + 0.7, a0: block.minZ, a1: block.maxZ, yaw: -Math.PI / 2 },
      { s: 'e', alongX: false, c: block.maxX - 0.7, a0: block.minZ, a1: block.maxZ, yaw: Math.PI / 2 },
    ];
    for (const e of edges) {
      const at = (p, inset) => (e.alongX ? [p, e.c + (e.s === 'n' ? inset : -inset)] : [e.c + (e.s === 'w' ? inset : -inset), p]);
      if (sides[e.s]) {
        for (let p = e.a0 + 20; p < e.a1 - 10; p += 60) {
          const [x, z] = at(p, 0);
          if (lowAt(block, z)) continue;
          world.addProp('streetlight', x, KERB, z, e.yaw, 1);
        }
      }
      // Hedgerow trees, more on the lanes than on open ground.
      for (let p = e.a0 + 12 + rng.range(0, 10); p < e.a1 - 8; p += rng.range(26, 44)) {
        if (!rng.chance(sides[e.s] ? 0.65 : 0.35)) continue;
        const [x, z] = at(p, 3.1); // in the hedge (or fence) line
        const kind = type === 'tree' && rng.chance(0.5) ? 'treeB' : type;
        const scale = rng.range(0.9, 1.35);
        if (lowAt(block, z)) continue;
        world.addProp(kind, x, KERB, z, rng.range(0, 6.28), scale);
      }
    }
  }

  /** Crop strips across a fields block. */
  function fields(world, block, rng) {
    const ix0 = block.minX + 4.2, ix1 = block.maxX - 4.2, iz0 = block.minZ + 4.2, iz1 = block.maxZ - 4.2;
    // Strips run across the shorter side, laid one after another along the longer one.
    const alongX = ix1 - ix0 >= iz1 - iz0;
    const L0 = alongX ? ix0 : iz0, L1 = alongX ? ix1 : iz1;
    const C0 = alongX ? iz0 : ix0, C1 = alongX ? iz1 : ix1;
    const rect = (a0, a1, c0, c1) => (alongX ? [a0, c0, a1, c1] : [c0, a0, c1, a1]);
    let a = L0;
    let last = null;
    while (a < L1 - 6) {
      const w = Math.min(L1 - a, rng.range(14, 24));
      let k = rng.weighted(CROP_LIST).k;
      if (k === last) k = rng.weighted(CROP_LIST).k;
      last = k;
      strip(world, CROPS[k], a, a + w - 1.4, C0, C1, rect, rng, alongX);
      // A grass tractor track between strips.
      a += w;
    }
    world.addLawn(ix0, iz0, ix1, iz1);
  }

  /** One strip of a crop: soil, then rows (or a sward) along the strip, then bales. */
  function strip(world, c, a0, a1, c0, c1, rect, rng, alongX) {
    const top = VH.col(c.top);
    const side = VH.col(c.side);
    // Bare earth under row crops.
    if (c.soil) {
      pieces(c0, c1, (q0, q1) => {
        const [x0, z0, x1, z1] = rect(a0, a1, q0, q1);
        world.ctxAt((x0 + x1) / 2, (z0 + z1) / 2).asphaltTop.topRect(x0, z0, x1, z1, KERB, VH.col(0x6b4f35, 4.5), 6); // the asphalt grain, browned: tilled earth
      });
    }
    // Rows run along the strip (across the block), one every c.rows metres.
    for (let p = a0 + c.rows / 2; p < a1 - c.rowW / 2; p += c.rows) {
      const r0 = p - c.rowW / 2, r1 = Math.min(a1, p + c.rowW / 2);
      const h = c.h * (0.9 + rng.range(0, 0.2));
      pieces(c0, c1, (q0, q1) => {
        const [x0, z0, x1, z1] = rect(r0, r1, q0, q1);
        const ctx = world.ctxAt((x0 + x1) / 2, (z0 + z1) / 2);
        const surf = ctx[c.surf];
        if (c.head) {
          surf.box(x0, KERB, z0, x1, KERB + h - 0.3, z1, side, { skip: { top: true }, bottom: false }); // solidity: passable
          surf.box(x0 - 0.1, KERB + h - 0.3, z0 - 0.1, x1 + 0.1, KERB + h, z1 + 0.1, top, { bottom: false }); // solidity: passable
        } else {
          surf.box(x0, KERB, z0, x1, KERB + h, z1, side, { skip: { top: true }, bottom: false }); // solidity: passable
          surf.box(x0, KERB + h - 0.02, z0, x1, KERB + h, z1, top, { bottom: false }); // solidity: passable
        }
      });
    }
    if (c.bales) {
      const n = Math.floor(((a1 - a0) * (c1 - c0)) / 300);
      for (let i = 0; i < n; i++) {
        const [x, z] = alongX ? [rng.range(a0 + 2, a1 - 2), rng.range(c0 + 2, c1 - 2)] : [rng.range(c0 + 2, c1 - 2), rng.range(a0 + 2, a1 - 2)];
        VH.Buildings.hayBale(world.ctxAt(x, z), x, z, KERB + 0.3, rng.range(0.9, 1.1));
      }
    }
  }

  /** A 4.0 green: lawn, a gravel path down the middle, trees both sides, benches and lamps. */
  function green(world, block, rng) {
    const { minX, maxX, minZ, maxZ } = block;
    const alongX = maxX - minX >= maxZ - minZ;
    const mid = alongX ? (minZ + maxZ) / 2 : (minX + maxX) / 2;
    const a0 = alongX ? minX : minZ, a1 = alongX ? maxX : maxZ;
    const half = (alongX ? maxZ - minZ : maxX - minX) / 2;
    pieces(a0, a1, (p, q) => {
      const ctx = world.ctxAt(alongX ? (p + q) / 2 : mid, alongX ? mid : (p + q) / 2);
      const lawn = alongX ? [p, minZ + 1, q, maxZ - 1] : [minX + 1, p, maxX - 1, q];
      ctx.grassTop.topRect(lawn[0], lawn[1], lawn[2], lawn[3], KERB, VH.col(0xffffff), 6);
      const path = alongX ? [p, mid - 1.4, q, mid + 1.4] : [mid - 1.4, p, mid + 1.4, q];
      ctx.plazaTop.topRect(path[0], path[1], path[2], path[3], KERB + 0.02, VH.col(0xd8ccb0), 4);
    });
    world.addLawn(alongX ? minX : minX + 1, alongX ? minZ + 1 : minZ, alongX ? maxX : maxX - 1, alongX ? maxZ - 1 : maxZ);
    const at = (p, off) => (alongX ? [p, mid + off] : [mid + off, p]);
    const treeOff = Math.max(2.4, half * 0.55);
    for (let p = a0 + 8; p < a1 - 6; p += 13) {
      for (const s of [-1, 1]) {
        if (!rng.chance(0.85)) continue;
        const [x, z] = at(p + s * 3, s * treeOff);
        const kind = rng.chance(0.5) ? 'tree' : 'treeB';
        const yaw = rng.range(0, 6.28), scale = rng.range(0.8, 1.15);
        if (lowAt(block, z)) continue;
        world.addProp(kind, x, KERB, z, yaw, scale);
      }
    }
    for (let p = a0 + 20; p < a1 - 10; p += 45) {
      const [x, z] = at(p, 2.1);
      world.addProp('bench', x, KERB, z, alongX ? Math.PI : -Math.PI / 2, 1);
      const [bx, bz] = at(p + 1.8, 2.1);
      world.addProp('bin', bx, KERB, bz, 0, 1);
    }
    for (let p = a0 + 10; p < a1 - 5; p += 32) {
      const [x, z] = at(p, -2.0);
      if (lowAt(block, z)) continue;
      world.addProp('streetlight', x, KERB, z, alongX ? 0 : Math.PI / 2, 1);
    }
  }

  // ------------------------------------------------------------ paddocks
  const ANIMALS = {
    // body half-width, half-length, body y0..y1, leg height, colours
    cow: { hw: 0.42, hl: 1.0, y0: 0.75, y1: 1.55, colors: [0x2b2b2b, 0x8a5a3a, 0xf2efe8, 0x6b4a32], patch: 0xf2efe8, head: 1.2 },
    sheep: { hw: 0.36, hl: 0.6, y0: 0.45, y1: 1.05, colors: [0xf2eee4, 0xe8e2d4, 0xdcd6c8], headCol: 0x2b2b2b, head: 0.75 },
    horse: { hw: 0.36, hl: 1.05, y0: 0.95, y1: 1.65, colors: [0x6b4228, 0x3a2a20, 0x9a6a42, 0xd8cdb8], head: 1.25, neck: true },
  };

  /** A grazing animal: merged boxes (legs, body, head) and a collider round it. */
  function animal(world, kind, x, z, yaw, rng) {
    const A = ANIMALS[kind];
    const ctx = world.ctxAt(x, z);
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const at = (f, r) => [x + r * c + f * s, z - r * s + f * c];
    const body = VH.col(rng.pick(A.colors), rng.range(0.92, 1.06));
    const leg = kind === 'sheep' ? VH.col(0x2b2b2b) : VH.colMul(body, 0.8);
    const y = KERB;
    for (const f of [-A.hl * 0.72, A.hl * 0.72]) {
      for (const r of [-A.hw * 0.62, A.hw * 0.62]) {
        const [lx, lz] = at(f, r);
        ctx.detailMatte.orientedBox(lx, lz, 0.08, 0.08, yaw, y, y + A.y0 + 0.05, leg); // solidity: passable (inside the body's collider)
      }
    }
    ctx.detailMatte.orientedBox(x, z, A.hw, A.hl, yaw, y + A.y0, y + A.y1, body);
    if (kind === 'cow' && body !== A.patch && rng.chance(0.6)) {
      const [px, pz] = at(rng.range(-0.4, 0.4), 0);
      ctx.detailMatte.orientedBox(px, pz, A.hw + 0.02, 0.32, yaw, y + A.y0 + 0.25, y + A.y1 + 0.02, VH.col(A.patch));
    }
    // Head down grazing, or up.
    const grazing = rng.chance(0.6);
    const [hx, hz] = at(A.hl + 0.25, 0);
    const headCol = A.headCol ? VH.col(A.headCol) : body;
    if (grazing) ctx.detailMatte.orientedBox(hx, hz, A.hw * 0.5, 0.3, yaw, y + 0.15, y + A.y0 + 0.2, headCol);
    else ctx.detailMatte.orientedBox(hx, hz, A.hw * 0.5, 0.3, yaw, y + A.y1 - 0.25, y + A.y1 + 0.25, headCol);
    if (A.neck) {
      const [nx, nz] = at(A.hl, 0);
      ctx.detailMatte.orientedBox(nx, nz, 0.14, 0.3, yaw, y + (grazing ? 0.5 : A.y1 - 0.2), y + A.y1 + (grazing ? -0.2 : 0.3), body);
    }
    // From the tail (-hl) to the nose (hl + 0.55).
    world.physics.addOrientedBox(x + 0.275 * s, z + 0.275 * c, A.hw + 0.05, A.hl + 0.275, yaw, 0, y + A.y1 + (grazing ? 0 : 0.25), 'animal', F().SOLID | F().SHOTS);
  }

  /** A farm block's inner lot as a paddock: grass, a post-and-rail fence, animals grazing and a trough. */
  function paddock(world, lot, rng) {
    const ctx = world.ctxAt(lot.cx, lot.cz);
    ctx.grassTop.topRect(lot.minX, lot.minZ, lot.maxX, lot.maxZ, KERB, VH.col(0xf0f6dc), 6);
    world.addLawn(lot.minX, lot.minZ, lot.maxX, lot.maxZ);
    boundary(world, lot, 0.6, 'fence', { n: false, s: false, w: false, e: false }, rng);
    const kind = rng.weighted([{ k: 'cow', weight: 4 }, { k: 'sheep', weight: 4 }, { k: 'horse', weight: 2 }]).k;
    const area = (lot.maxX - lot.minX) * (lot.maxZ - lot.minZ);
    const n = Math.max(2, Math.min(kind === 'sheep' ? 14 : 8, Math.round(area / (kind === 'sheep' ? 140 : 260))));
    const placed = [];
    for (let i = 0, tries = 0; i < n && tries < n * 6; tries++) {
      const x = rng.range(lot.minX + 3.5, lot.maxX - 3.5), z = rng.range(lot.minZ + 3.5, lot.maxZ - 3.5);
      if (placed.some(([px, pz]) => Math.hypot(px - x, pz - z) < 3.5)) continue;
      placed.push([x, z]);
      animal(world, kind, x, z, rng.range(0, Math.PI * 2), rng);
      i++;
    }
    // A galvanised water trough by the fence.
    const tx = lot.minX + 2, tz = rng.range(lot.minZ + 3, lot.maxZ - 5);
    if (!placed.some(([px, pz]) => Math.abs(px - tx) < 3 && Math.abs(pz - tz - 1.2) < 3)) {
      ctx.detail.box(tx - 0.4, KERB, tz, tx + 0.4, KERB + 0.6, tz + 2.4, VH.col(0x9aa0a6), { skip: { top: true } });
      ctx.detail.box(tx - 0.32, KERB + 0.6 - 0.12, tz + 0.08, tx + 0.32, KERB + 0.6 - 0.1, tz + 2.32, VH.col(0x5a7f8a)); // the water, just under the rim
      world.physics.addBox(tx - 0.4, 0, tz, tx + 0.4, KERB + 0.6, tz + 2.4, 'metal');
    }
  }

  // ---------------------------------------------------------- allotments
  const VEG = [
    { top: 0x6aa878, side: 0x4e8a5a, h: 0.35, rows: 0.7 }, // cabbages
    { top: 0x86c84e, side: 0x5e9a36, h: 0.25, rows: 0.6 }, // lettuces
    { top: 0x4f8a3a, side: 0x3e6e2e, h: 0.45, rows: 0.8 }, // potatoes
    { top: 0x9ac85a, side: 0x6e9a3a, h: 0.3, rows: 0.5 }, //  onions and carrots
  ];

  /** Allotments: little plots either side of a gravel path, a fence round them, a gate on each lane. */
  function allotments(world, block, rng, sides) {
    const { minX, maxX, minZ, maxZ } = block;
    const alongX = maxX - minX >= maxZ - minZ;
    const a0 = (alongX ? minX : minZ) + 4.2, a1 = (alongX ? maxX : maxZ) - 4.2;
    const c0 = (alongX ? minZ : minX) + 4.2, c1 = (alongX ? maxZ : maxX) - 4.2;
    const mid = (c0 + c1) / 2;
    const rect = (p0, p1, q0, q1) => (alongX ? [p0, q0, p1, q1] : [q0, p0, q1, p1]);
    pieces(a0 - 1.2, a1 + 1.2, (p, q) => {
      const [x0, z0, x1, z1] = rect(p, q, mid - 1.4, mid + 1.4);
      world.ctxAt((x0 + x1) / 2, (z0 + z1) / 2).plazaTop.topRect(x0, z0, x1, z1, KERB + 0.02, VH.col(0xcfc2a4), 4);
    });
    for (const side of [-1, 1]) {
      const q0 = side < 0 ? c0 : mid + 2.2, q1 = side < 0 ? mid - 2.2 : c1;
      if (q1 - q0 < 6) continue;
      for (let p = a0; p + 7.5 <= a1; p += 9.5) {
        const [x0, z0, x1, z1] = rect(p, p + 8.5, q0, q1);
        allotmentPlot(world, { x0, z0, x1, z1 }, alongX, side, rng);
      }
    }
  }

  /** One allotment: tilled beds in rows, maybe bean canes, a shed and a water butt at the path end. */
  function allotmentPlot(world, r, alongX, side, rng) {
    const ctx = world.ctxAt((r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2);
    // Timber edging round the bed (knee-low), then the earth.
    ctx.detailWood.box(r.x0, KERB, r.z0, r.x1, KERB + 0.16, r.z1, VH.col(0x8a6a48), { skip: { top: true } });
    ctx.asphaltTop.topRect(r.x0 + 0.1, r.z0 + 0.1, r.x1 - 0.1, r.z1 - 0.1, KERB + 0.16, VH.col(0x6b4f35, 4.5), 6); // the asphalt grain, browned: tilled earth
    world.physics.addBox(r.x0, 0, r.z0, r.x1, KERB + 0.16, r.z1, 'dirt', F().SOLID);
    const y = KERB + 0.16;
    // The shed end is the one by the path.
    const pathEnd = side < 0 ? (alongX ? r.z1 : r.x1) : alongX ? r.z0 : r.x0;
    const inward = side < 0 ? -1 : 1;
    const hasShed = rng.chance(0.55);
    const keep = hasShed ? 3.2 : 0.8; // metres kept clear at the path end
    const along0 = alongX ? r.x0 + 0.5 : r.z0 + 0.5, along1 = alongX ? r.x1 - 0.5 : r.z1 - 0.5;
    const deep0 = pathEnd + inward * keep, deep1 = (side < 0 ? (alongX ? r.z0 : r.x0) : alongX ? r.z1 : r.x1) - inward * 0.5;
    const lo = Math.min(deep0, deep1), hi = Math.max(deep0, deep1);
    const box = (a0, a1, d0, d1, y0, y1, col, surf) => (alongX ? (surf || ctx.detailMatte).box(a0, y0, d0, a1, y1, d1, col, { bottom: false }) : (surf || ctx.detailMatte).box(d0, y0, a0, d1, y1, a1, col, { bottom: false }));
    if (rng.chance(0.3)) {
      // Runner beans up a row of canes (tied in an A).
      const a = (along0 + along1) / 2;
      for (let d = lo + 0.3; d < hi - 0.2; d += 0.5) box(a - 0.03, a + 0.03, d - 0.03, d + 0.03, y, y + 2.0, VH.col(0xb8a070), ctx.detailWood);
      box(a - 0.25, a + 0.25, lo + 0.2, hi - 0.1, y + 0.3, y + 1.8, VH.col(0x4f8a3a));
      if (alongX) world.physics.addBox(a - 0.3, 0, lo + 0.2, a + 0.3, y + 2.0, hi - 0.1, 'hedge', F().SOLID);
      else world.physics.addBox(lo + 0.2, 0, a - 0.3, hi - 0.1, y + 2.0, a + 0.3, 'hedge', F().SOLID);
    } else {
      const v = VEG[rng.int(0, VEG.length - 1)];
      for (let a = along0 + 0.3; a < along1 - 0.2; a += v.rows + 0.35) {
        box(a, Math.min(along1, a + v.rows * 0.7), lo, hi, y, y + v.h, VH.col(v.side)); // solidity: passable
        box(a, Math.min(along1, a + v.rows * 0.7), lo, hi, y + v.h - 0.02, y + v.h, VH.col(v.top)); // solidity: passable
      }
    }
    if (hasShed) {
      // A little timber shed with a pent roof, its door on the path.
      const a = rng.chance(0.5) ? along0 + 0.2 : along1 - 2.4;
      const d0 = side < 0 ? pathEnd - 2.6 : pathEnd + 0.4, d1 = d0 + 2.2;
      const wall = VH.col(rng.pick([0x6a8a5a, 0x8a6a48, 0x5a7a8a, 0xa8432f, 0x7a7a6a]));
      box(a, a + 2.2, d0, d1, y, y + 2.1, wall, ctx.detailWood);
      box(a - 0.15, a + 2.35, d0 - 0.15, d1 + 0.15, y + 2.1, y + 2.25, VH.col(0x3a3a3a));
      const df = side < 0 ? d1 : d0 - 0.04;
      box(a + 0.7, a + 1.5, df, df + 0.04, y, y + 1.9, VH.colMul(wall, 0.7), ctx.detailWood);
      if (alongX) world.physics.addBox(a - 0.15, 0, d0 - 0.15, a + 2.35, y + 2.25, d1 + 0.15, 'crate');
      else world.physics.addBox(d0 - 0.15, 0, a - 0.15, d1 + 0.15, y + 2.25, a + 2.35, 'crate');
      // The water butt beside it.
      const wa = a < (along0 + along1) / 2 ? a + 2.8 : a - 0.6, wd = (d0 + d1) / 2;
      const [wx, wz] = alongX ? [wa, wd] : [wd, wa];
      ctx.detailMatte.cylinder(wx, y, wz, 0.38, 0.38, 1.0, 10, VH.col(0x2e5a3a), true, VH.col(0x24482e));
      world.physics.addOrientedBox(wx, wz, 0.38, 0.38, Math.PI / 4, 0, y + 1.0, 'prop');
    }
  }

  /** The ground left open on purpose (VH.Data.open4): declared for the emptiness scan; a farm track along it. */
  function openGround(world) {
    for (const o of VH.Data.open4 || []) {
      VH.Districts.open(o.minX, o.minZ, o.maxX, o.maxZ, o.label);
      if (!o.track) continue;
      // A grass-and-gravel farm track down the long side, clear of whatever stands in the middle.
      const alongX = o.maxX - o.minX >= o.maxZ - o.minZ;
      const c = alongX ? o.minZ + 6 : o.minX + 6;
      pieces(alongX ? o.minX : o.minZ, alongX ? o.maxX : o.maxZ, (p, q) => {
        for (const [t0, t1] of [[-1.6, -0.6], [0.6, 1.6]]) {
          const r = alongX ? [p, c + t0, q, c + t1] : [c + t0, p, c + t1, q];
          world.ctxAt((r[0] + r[2]) / 2, (r[1] + r[3]) / 2).decal.topRect(r[0], r[1], r[2], r[3], 0.03, VH.col(0xa48a64));
        }
      });
    }
  }

  // ------------------------------------------------------------- places
  // Story places in the 4.0 districts (places.extra[district]) for the kinds
  // the generic fill makes: field gates, farmhouses, barns, warehouses,
  // terraces, greens. The landmark plots' builders add their own.
  const LOT_KINDS = {
    farmhouse: ['farmhouse', 'farm', 'house', 'front_door'],
    barn: ['barn', 'farm', 'garage', 'storage'],
    silo: ['farm', 'yard', 'silo'],
    warehouse: ['warehouse', 'loading_bay', 'cargo', 'depot'],
    depot: ['depot', 'yard', 'truckstop', 'garage'],
    terrace: ['house', 'front_door', 'terrace'],
    house: ['house', 'front_door'],
    bigbox: ['retail', 'storefront', 'superstore'],
    hotel: ['hotel', 'motel'],
    apartment: ['flats', 'apartment', 'front_door'],
    office: ['office', 'front_door'],
    shophouse: ['shop', 'storefront', 'cafe'],
    lowrise: ['shop', 'storefront', 'cafe'],
  };
  const LOT_NAMES = { farmhouse: 'Farmhouse', barn: 'Barn', silo: 'Grain silos', warehouse: 'Warehouse', depot: 'Lorry depot', terrace: 'Terraced houses', house: 'House', bigbox: 'Superstore', hotel: 'Hotel', apartment: 'Flats', office: 'Offices', shophouse: 'Shops', lowrise: 'Shops' };

  /** A spot on the verge or pavement `out` metres off side s of r, facing into r. */
  function sideSpot(r, s, along, out) {
    if (s === 'n') return { x: along, z: r.minZ - out, yaw: 0 };
    if (s === 's') return { x: along, z: r.maxZ + out, yaw: Math.PI };
    if (s === 'w') return { x: r.minX - out, z: along, yaw: Math.PI / 2 };
    return { x: r.maxX + out, z: along, yaw: -Math.PI / 2 };
  }

  function registerPlaces(world, places) {
    const road = (x, z) => world.roadNameAt(x, z) || (world.districtAt(x, z) || {}).name || 'the lane';
    for (const b of world.layout.blocks3 || []) {
      if (!b.v4 || b.kind === 'plot') continue;
      const list = places.extra[b.district.id];
      if (!list) continue;
      const add = (p, kinds, name) => list.push({ x: p.x, z: p.z, y: KERB, yaw: p.yaw, kinds, name: name + ', ' + road(p.x + Math.sin(p.yaw) * -6, p.z + Math.cos(p.yaw) * -6) });
      if (b.kind === 'fields' || b.kind === 'allotments') {
        const kinds = b.kind === 'fields' ? ['fields', 'field', 'farm', 'lane'] : ['allotments', 'garden', 'park'];
        for (const g of b.gates || []) add(sideSpot(b, g.side, g.at, -1.5), kinds, b.kind === 'fields' ? 'A field gate' : 'The allotments gate');
        continue;
      }
      if (b.kind === 'park') {
        const alongX = b.maxX - b.minX >= b.maxZ - b.minZ;
        add(alongX ? sideSpot(b, 'w', b.cz, -1.5) : sideSpot(b, 'n', b.cx, -1.5), ['park', 'garden', 'bench'], 'The end of the green');
        continue;
      }
      for (const lot of b.lots) {
        const kinds = lot.kind === 'building' && !lot.interior && LOT_KINDS[lot.archetype];
        if (!kinds) continue;
        const f = lot.front;
        const s = f.s ? 's' : f.n ? 'n' : f.e ? 'e' : f.w ? 'w' : null;
        if (!s) continue;
        add(sideSpot(lot, s, s === 'n' || s === 's' ? lot.cx : lot.cz, 2.2), kinds, LOT_NAMES[lot.archetype]);
      }
    }
  }

  // The fill's own builder (after the generic fill, like a district's).
  if (VH.Districts) {
    VH.Districts.register({
      id: 'fill4',
      name: 'the countryside',
      plots: [],
      build(world) {
        openGround(world);
      },
      registerPlaces,
    });
  }

  const Fill4 = {
    isCountry,

    /** Build a 4.0 block if it is country or a green; false leaves it to world.js (towns, plots). */
    block(world, block) {
      if (!block.v4 || block.kind === 'plot') return false;
      const rng = new VH.RNG(block.id + 'fill4');
      if (block.kind === 'park') {
        const ctx = world.ctxAt(block.cx, block.cz);
        ctx.concrete.box(block.minX, 0, block.minZ, block.maxX, KERB, block.maxZ, VH.col(0xcfcac0), { skip: { top: true } });
        ctx.sidewalk.topRect(block.minX, block.minZ, block.maxX, block.maxZ, KERB, VH.col(0xffffff), 3);
        world.physics.addBox(block.minX, -0.5, block.minZ, block.maxX, KERB, block.maxZ, 'kerb');
        green(world, block, rng);
        return true;
      }
      if (!isCountry(block)) return false;
      verge(world, block);
      const sides = roadSides(world, block);
      if (block.kind === 'fields') {
        fields(world, block, rng);
        boundary(world, block, 3.2, 'hedge', sides, rng); // (outside it, a grass verge people walk along)
      } else if (block.kind === 'allotments') {
        allotments(world, block, rng, sides);
        boundary(world, block, 3.0, 'fence', sides, rng);
      } else {
        for (const lot of block.lots) {
          if (lot.kind === 'courtyard') {
            paddock(world, lot, new VH.RNG(lot.seed));
            continue;
          }
          const top = VH.Buildings.buildLot(world.ctxAt(lot.cx, lot.cz), lot);
          lot.top = top || 0;
          if (top > 0) world.stats.buildings++;
          world.stats.tallest = Math.max(world.stats.tallest, top || 0);
        }
        world.stats.lots += block.lots.length;
        boundary(world, block, 3.0, 'fence', sides, rng); // (the lots start 4 m in)
      }
      countryFurniture(world, block, sides, rng);
      return true;
    },
  };

  VH.Fill4 = Fill4;
})();
