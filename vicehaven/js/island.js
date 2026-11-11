/*
 * island.js — Isla Paloma's land, its shore, and the two road links across
 * the bay (VICEHAVEN 3.0).
 *
 *   land      each rectangle of VH.Data.island.land is a block of ground
 *             (y = 0 on top) standing out of the bay: grass where no road
 *             or block covers it, a stone seawall face down to the sea floor
 *   shore     a coping and a railing all round, with an invisible wall just
 *             outside it, open only where the bridges land
 *   bridges   the Paloma Bridge (Anchor Street, z = -288) and the Southbay
 *             Causeway (Seabreeze Street, z = 790): a deck under the road,
 *             walkways, parapets and railings that cars can't jump, piers
 *             down to the sea floor and, on the Paloma Bridge, two
 *             suspension towers with cables (scenery)
 *
 * The roads themselves (the asphalt, its markings and the 'road' collider
 * the cars drive on) are ordinary road segments from citygen.js, at y = 0
 * like every other road. physics.terrain says land is at 0 here (world.js).
 *
 *   VH.Island.build(world, layout) -> { land, bridges, shore }
 *   VH.Island.bridgeAt(x, z)       -> the bridge under (x, z), or null
 */
(function () {
  'use strict';

  const VH = window.VH;
  const KERB = 0.15;
  const SEA_FLOOR = -8;
  const WALK = 2.2; // walkway on each side of a bridge's carriageway

  const rectsOverlap = (a, b) => a.minX < b.maxX && a.maxX > b.minX && a.minZ < b.maxZ && a.maxZ > b.minZ;

  /** The island's land, less the roads and blocks drawn over it (no z-fighting). */
  function buildLand(world, layout, isl) {
    const sub = VH.World.subtractRect;
    const covers = [];
    for (const s of layout.segments) covers.push(s);
    for (const j of layout.intersections) covers.push({ minX: j.x - j.halfX, maxX: j.x + j.halfX, minZ: j.z - j.halfZ, maxZ: j.z + j.halfZ });
    const stone = VH.col(0xa9a39a);
    for (const land of isl.land) {
      // Grass on top, split into 96 m tiles so each lands in its chunk.
      let rects = [land];
      for (const c of covers) if (rectsOverlap(c, land)) rects = sub(rects, c);
      for (const r of rects) {
        for (let x = r.minX; x < r.maxX; x += 96) {
          for (let z = r.minZ; z < r.maxZ; z += 96) {
            const x1 = Math.min(r.maxX, x + 96);
            const z1 = Math.min(r.maxZ, z + 96);
            const ctx = world.ctxAt((x + x1) / 2, (z + z1) / 2);
            ctx.grass.topRect(x, z, x1, z1, 0, VH.col(0xffffff), 6);
          }
        }
      }
    }
    // The seawall faces: one box per 96 m of shore, down to the sea floor.
    for (const e of shoreEdges(isl)) {
      const alongX = e.axis === 'x';
      for (let a = e.from; a < e.to; a += 96) {
        const b = Math.min(e.to, a + 96);
        const cx = alongX ? (a + b) / 2 : e.coord;
        const cz = alongX ? e.coord : (a + b) / 2;
        const ctx = world.ctxAt(cx, cz);
        const t = 0.6;
        if (alongX) ctx.concrete.box(a, SEA_FLOOR, e.coord - (e.out < 0 ? t : 0), b, -0.02, e.coord + (e.out > 0 ? t : 0), stone, { uvScale: 4, skip: { top: true } });
        else ctx.concrete.box(e.coord - (e.out < 0 ? t : 0), SEA_FLOOR, a, e.coord + (e.out > 0 ? t : 0), -0.02, b, stone, { uvScale: 4, skip: { top: true } });
      }
    }
  }

  /**
   * The outline of the land as axis-aligned edges: { axis ('x' runs
   * east-west), coord, from, to, out (+1/-1: which way the sea is) }.
   * Edges shared by two land rectangles are left out.
   */
  function shoreEdges(isl) {
    const out = [];
    const L = isl.land;
    const covered = (x, z) => L.some((r) => x > r.minX - 0.01 && x < r.maxX + 0.01 && z > r.minZ - 0.01 && z < r.maxZ + 0.01);
    for (const r of L) {
      const sides = [
        { axis: 'x', coord: r.minZ, from: r.minX, to: r.maxX, out: -1 },
        { axis: 'x', coord: r.maxZ, from: r.minX, to: r.maxX, out: 1 },
        { axis: 'z', coord: r.minX, from: r.minZ, to: r.maxZ, out: -1 },
        { axis: 'z', coord: r.maxX, from: r.minZ, to: r.maxZ, out: 1 },
      ];
      for (const s of sides) {
        // Walk the side in 4 m steps, keeping the runs with sea beyond them.
        let run = null;
        for (let a = s.from; a <= s.to + 0.01; a += 4) {
          const p = Math.min(a, s.to);
          const sx = s.axis === 'x' ? p : s.coord + s.out * 1;
          const sz = s.axis === 'x' ? s.coord + s.out * 1 : p;
          const sea = !covered(sx, sz);
          if (sea && !run) run = { axis: s.axis, coord: s.coord, from: p, to: p, out: s.out };
          if (sea && run) run.to = p;
          if ((!sea || p >= s.to) && run) {
            if (run.to - run.from > 1) out.push(run);
            run = null;
          }
        }
      }
    }
    return out;
  }

  /** Coping, railing and an invisible wall along the shore, open where roads cross it. */
  function buildShore(world, isl, gaps) {
    const L = VH.Landmarks;
    for (const e of shoreEdges(isl)) {
      const alongX = e.axis === 'x';
      let pieces = [[e.from, e.to]];
      for (const g of gaps) {
        if (g.axis !== e.axis || Math.abs(g.at - e.coord) > 0.5) continue; // a gap in this edge (same axis, same line)
        const next = [];
        for (const [pa, pb] of pieces) {
          if (pb <= g.a0 || pa >= g.a1) next.push([pa, pb]);
          else {
            if (pa < g.a0) next.push([pa, g.a0]);
            if (pb > g.a1) next.push([g.a1, pb]);
          }
        }
        pieces = next;
      }
      for (const [pa, pb] of pieces) {
        for (let a = pa; a < pb - 0.01; a += 48) {
          const b = Math.min(pb, a + 48);
          const c = e.coord - e.out * 0.4; // just inside the edge
          const ctx = world.ctxAt(alongX ? (a + b) / 2 : c, alongX ? c : (a + b) / 2);
          if (alongX) {
            ctx.concrete.box(a, 0, c - 0.45, b, KERB + 0.14, c + 0.45, VH.col(0xd8d2c6), { uvScale: 4 });
            L.railing(world, ctx, a, c, b, c, KERB + 0.14, { height: 1.0 });
            L.invisibleWall(world, a, e.coord + (e.out > 0 ? 0.1 : -0.8), b, e.coord + (e.out > 0 ? 0.8 : -0.1));
          } else {
            ctx.concrete.box(c - 0.45, 0, a, c + 0.45, KERB + 0.14, b, VH.col(0xd8d2c6), { uvScale: 4 });
            L.railing(world, ctx, c, a, c, b, KERB + 0.14, { height: 1.0 });
            L.invisibleWall(world, e.coord + (e.out > 0 ? 0.1 : -0.8), a, e.coord + (e.out > 0 ? 0.8 : -0.1), b);
          }
        }
        // Lamps along the shore every 40 m.
        for (let a = pa + 12; a < pb - 6; a += 40) {
          const c = e.coord - e.out * 1.6;
          const yaw = alongX ? (e.out > 0 ? 0 : Math.PI) : e.out > 0 ? Math.PI / 2 : -Math.PI / 2;
          if (alongX) world.addProp('streetlight', a, 0, c, yaw + Math.PI, 1);
          else world.addProp('streetlight', c, 0, a, yaw + Math.PI, 1);
        }
      }
    }
  }

  /** A bridge (or causeway) along an x-running road between the seawall and the island. */
  function buildBridge(world, br) {
    const L = VH.Landmarks;
    const half = br.width / 2;
    const z = br.coord;
    const deck = VH.col(0xbab4aa);
    const walkCol = VH.col(0xcfcac0);
    const steel = VH.col(0xe8e4dc);
    const zIn0 = z - half - WALK;
    const zIn1 = z + half + WALK;
    for (let a = br.from; a < br.to - 0.01; a += 48) {
      const b = Math.min(br.to, a + 48);
      const ctx = world.ctxAt((a + b) / 2, z);
      // The deck slab under the road and the walkways.
      ctx.concrete.box(a, -1.6, zIn0 - 0.3, b, -0.02, zIn1 + 0.3, deck, { uvScale: 4, bottom: true, skip: { top: true, w: a > br.from, e: b < br.to } });
      for (const [w0, w1] of [[zIn0, z - half], [z + half, zIn1]]) {
        ctx.concrete.box(a, -0.02, w0, b, KERB, w1, walkCol, { uvScale: 4, skip: { w: a > br.from, e: b < br.to } });
        world.physics.addBox(a, -1.6, w0, b, KERB, w1, 'kerb');
      }
      // Parapets: a low concrete wall and a railing on top, cars and Jay stay on.
      for (const [p0, p1] of [[zIn0 - 0.3, zIn0], [zIn1, zIn1 + 0.3]]) {
        ctx.concrete.box(a, KERB, p0, b, KERB + 0.55, p1, deck, { uvScale: 4, skip: { w: a > br.from, e: b < br.to } });
        world.physics.addBox(a, -1.6, p0, b, 2.2, p1, 'railing', VH.COLLIDE.SOLID | VH.COLLIDE.SHOTS);
      }
      L.railing(world, ctx, a, zIn0 - 0.15, b, zIn0 - 0.15, KERB + 0.55, { height: 0.6, color: 0xe8e4dc });
      L.railing(world, ctx, a, zIn1 + 0.15, b, zIn1 + 0.15, KERB + 0.55, { height: 0.6, color: 0xe8e4dc });
    }
    // Piers every 36 m.
    for (let x = br.from + 30; x < br.to - 10; x += 36) {
      const ctx = world.ctxAt(x, z);
      ctx.concrete.box(x - 1.4, SEA_FLOOR, zIn0 + 1, x + 1.4, -1.6, zIn1 - 1, deck, { uvScale: 4 });
      world.physics.addBox(x - 1.4, SEA_FLOOR, zIn0 + 1, x + 1.4, -1.6, zIn1 - 1, 'pier');
    }
    // Lamps on the walkways.
    for (let x = br.from + 14; x < br.to - 8; x += 28) {
      world.addProp('streetlight', x, KERB, zIn0 + 0.6, 0, 1);
      world.addProp('streetlight', x + 14, KERB, zIn1 - 0.6, Math.PI, 1);
    }
    // Suspension towers and cables (scenery: the deck carries the cars).
    const TOP = 52;
    const box = new THREE.BoxGeometry(1, 1, 1);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const v = new THREE.Vector3();
    const sc = new THREE.Vector3();
    const towers = br.towers || [];
    for (const tx of towers) {
      const ctx = world.ctxAt(tx, z);
      for (const zz of [zIn0 - 1.4, zIn1 + 1.4]) {
        ctx.concrete.box(tx - 1.6, SEA_FLOOR, zz - 1.1, tx + 1.6, TOP, zz + 1.1, steel, { uvScale: 4 });
        world.physics.addBox(tx - 1.6, SEA_FLOOR, zz - 1.1, tx + 1.6, TOP, zz + 1.1, 'pier', VH.COLLIDE.ALL);
      }
      // Cross beams.
      for (const y of [TOP - 3, 24]) ctx.concrete.box(tx - 1.2, y, zIn0 - 2.5, tx + 1.2, y + 2.4, zIn1 + 2.5, steel, { uvScale: 4, bottom: true });
      ctx.prop.box(tx - 0.4, TOP, zIn0 - 1.6, tx + 0.4, TOP + 1.2, zIn0 - 1.2, VH.col(0xd23a2a));
      world.beacons.push({ x: tx, y: TOP + 1.5, z: zIn0 - 1.4 });
    }
    if (towers.length) {
      // The main cables: a sagging chain of straight pieces from shore to tower to tower to shore,
      // with hangers down to the deck every 12 m.
      const anchors = [br.from + 4, ...towers, br.to - 4];
      for (const zz of [zIn0 - 1.4, zIn1 + 1.4]) {
        for (let i = 0; i < anchors.length - 1; i++) {
          const x0 = anchors[i];
          const x1 = anchors[i + 1];
          const y0 = i === 0 ? KERB + 2 : TOP - 1;
          const y1 = i === anchors.length - 2 ? KERB + 2 : TOP - 1;
          const sag = i === 0 || i === anchors.length - 2 ? 0 : 22;
          const N = 8;
          const yAt = (t) => y0 + (y1 - y0) * t - sag * 4 * t * (1 - t) * (y0 === y1 ? 1 : 0.3);
          for (let k = 0; k < N; k++) {
            const ta = k / N;
            const tb = (k + 1) / N;
            const xa = x0 + (x1 - x0) * ta;
            const xb = x0 + (x1 - x0) * tb;
            const ya = yAt(ta);
            const yb = yAt(tb);
            const len = Math.hypot(xb - xa, yb - ya);
            const ctx = world.ctxAt((xa + xb) / 2, z);
            v.set((xa + xb) / 2, (ya + yb) / 2, zz);
            q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.atan2(yb - ya, xb - xa));
            sc.set(len + 0.1, 0.35, 0.35);
            m.compose(v, q, sc);
            ctx.prop.merge(box, m, steel);
          }
          for (let x = x0 + 6; x < x1 - 3; x += 12) {
            const y = yAt((x - x0) / (x1 - x0));
            if (y < KERB + 3) continue;
            const ctx = world.ctxAt(x, z);
            ctx.prop.box(x - 0.06, KERB + 0.55, zz - 0.06, x + 0.06, y, zz + 0.06, steel);
          }
        }
      }
    }
    if (VH.Landmarks.sign) {
      VH.Landmarks.sign(world, { x: br.from + 6, y: KERB + 4.6, z: zIn0 - 0.6, yaw: Math.PI, w: 7, h: 1.2, lines: [br.name.toUpperCase()], style: 'info', posts: false, twoSided: true });
    }
  }

  const Island = {
    build(world, layout) {
      const isl = layout.config.island;
      if (!isl) return null;
      buildLand(world, layout, isl);
      // Gaps in the shore railing where the bridges land, and in the mainland seawall where they start.
      const gaps = [];
      for (const br of isl.bridges) {
        const w = br.width / 2 + WALK + 0.4;
        gaps.push({ axis: 'z', at: br.to, a0: br.coord - w, a1: br.coord + w });
      }
      buildShore(world, isl, gaps);
      for (const br of isl.bridges) buildBridge(world, br);
      this.bridges = isl.bridges;
      return { land: isl.land, bridges: isl.bridges };
    },

    /** The bridge at (x, z), if any. */
    bridgeAt(x, z) {
      for (const br of this.bridges || []) {
        if (x >= br.from && x <= br.to && Math.abs(z - br.coord) <= br.width / 2 + WALK + 0.4) return br;
      }
      return null;
    },

    shoreEdges,
  };

  VH.Island = Island;
})();
