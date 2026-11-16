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
 *
 * Country blocks stand on a raised grass verge instead of a concrete
 * pavement, and get lamps only every 60 m, on the sides that face a road.
 * Everything is merged into the chunk builders or instanced (trees, lamps);
 * crops are walk-through (you can push through corn) and marked for the
 * collision audit; hedges, fences, gateposts and bales are solid.
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
    plough: { w: 2, top: 0x7a5a3a, side: 0x5e4430, h: 0.16, rows: 1.0, rowW: 0.55, surf: 'concrete', soil: true },
    corn: { w: 2, top: 0x8ab84a, side: 0x6a9a3a, h: 2.2, rows: 1.1, rowW: 0.7, surf: 'hedge', soil: true },
    sunflower: { w: 2, top: 0xf2c318, side: 0x5e8a2e, h: 1.7, rows: 1.2, rowW: 0.6, surf: 'hedge', soil: true, head: true },
    hay: { w: 2, top: 0xc8c070, side: 0xa8a050, h: 0.35, rows: 2.0, rowW: 2.0, surf: 'concrete', bales: true },
    lavender: { w: 1, top: 0x9a7ac8, side: 0x6a8a5a, h: 0.6, rows: 1.3, rowW: 0.8, surf: 'hedge', soil: true },
  };
  const CROP_LIST = Object.keys(CROPS).map((k) => ({ k, weight: CROPS[k].w }));

  function isCountry(block) {
    return block.v4 && (block.kind === 'fields' || block.arch === 'farm' || (block.kind !== 'plot' && block.district && block.district.id === 'haverly'));
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
            for (const y of [0.55, 1.0]) ctx.wood.box(ax0, KERB + y, az0, ax1, KERB + y + 0.12, az1, post);
            for (let p = a; p <= b + 0.01; p += 2.5) {
              const px = run.alongX ? p : run.c, pz = run.alongX ? run.c : p;
              ctx.wood.box(px - 0.08, KERB, pz - 0.08, px + 0.08, KERB + 1.25, pz + 0.08, post);
            }
            world.physics.addBox(ax0, 0, az0, ax1, KERB + 1.25, az1, 'fence', F().SOLID);
          }
        });
      }
      // Gateposts (and an open field gate swung back) at each gap.
      for (const g of gates) {
        if (g - 2.5 < run.a0 || g + 2.5 > run.a1) continue;
        const ctx = world.ctxAt(run.alongX ? g : run.c, run.alongX ? run.c : g);
        for (const s of [-1, 1]) {
          const p = g + s * 2.6;
          const px = run.alongX ? p : run.c, pz = run.alongX ? run.c : p;
          ctx.wood.box(px - 0.15, KERB, pz - 0.15, px + 0.15, KERB + 1.5, pz + 0.15, post);
          world.physics.addBox(px - 0.16, 0, pz - 0.16, px + 0.16, KERB + 1.5, pz + 0.16, 'pole', F().SOLID | F().SHOTS);
        }
        // The gate stands open, flat against the hedge line on one side.
        const p0 = g + 2.6, p1 = g + 5.4;
        const gx0 = run.alongX ? p0 : run.c - 0.05, gx1 = run.alongX ? p1 : run.c + 0.05;
        const gz0 = run.alongX ? run.c + 0.5 : p0, gz1 = run.alongX ? run.c + 0.6 : p1;
        const steel = VH.col(0x9aa0a6);
        for (const y of [0.3, 0.7, 1.1]) ctx.prop.box(gx0, KERB + y, gz0, gx1, KERB + y + 0.06, gz1, steel);
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
          world.addProp('streetlight', x, KERB, z, e.yaw, 1);
        }
      }
      // Hedgerow trees, more on the lanes than on open ground.
      for (let p = e.a0 + 12 + rng.range(0, 10); p < e.a1 - 8; p += rng.range(26, 44)) {
        if (!rng.chance(sides[e.s] ? 0.65 : 0.35)) continue;
        const [x, z] = at(p, 1.1);
        world.addProp(type === 'tree' && rng.chance(0.5) ? 'treeB' : type, x, KERB, z, rng.range(0, 6.28), rng.range(0.9, 1.35));
      }
    }
  }

  /** Crop strips across a fields block. */
  function fields(world, block, rng) {
    const ix0 = block.minX + 3, ix1 = block.maxX - 3, iz0 = block.minZ + 3, iz1 = block.maxZ - 3;
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
        world.addProp(rng.chance(0.5) ? 'tree' : 'treeB', x, KERB, z, rng.range(0, 6.28), rng.range(0.8, 1.15));
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
      world.addProp('streetlight', x, KERB, z, alongX ? 0 : Math.PI / 2, 1);
    }
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
        boundary(world, block, 1.6, 'hedge', sides, rng);
      } else {
        for (const lot of block.lots) {
          const top = VH.Buildings.buildLot(world.ctxAt(lot.cx, lot.cz), lot);
          lot.top = top || 0;
          if (top > 0) world.stats.buildings++;
          world.stats.tallest = Math.max(world.stats.tallest, top || 0);
        }
        world.stats.lots += block.lots.length;
        boundary(world, block, 1.2, 'fence', sides, rng);
      }
      countryFurniture(world, block, sides, rng);
      return true;
    },
  };

  VH.Fill4 = Fill4;
})();
