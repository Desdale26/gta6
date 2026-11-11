/*
 * citygen.js — lays out the city as pure data: roads, intersections,
 * blocks, lots and the waterfront. Nothing here touches three.js, so the
 * same layout later feeds traffic lanes, pedestrian paths, the minimap and
 * mission placement.
 *
 * Phase 1 builds the downtown core of Vicehaven: a 9 × 9 grid of avenues
 * (north–south) and streets (east–west) 96 m apart, with Grand Avenue and
 * Meridian Boulevard as wider boulevards, and the bay along the east side.
 * Phase 3 extends this layout with more districts, highways and bridges.
 */
(function () {
  'use strict';

  const VH = window.VH;

  const LINES = [-384, -288, -192, -96, 0, 96, 192, 288, 384];
  const SIDEWALK = 4;
  const LANE = 3.5;

  /** Roads outside the downtown grid (the docks, the estates, the airport, Northgate). */
  const EXTRA_ROADS = [
    { id: 'airport_rd', kind: 'street', axis: 'x', coord: -1180, width: 18, median: 2, name: 'Airport Road', from: -760, to: 340, isNew: true },
    { id: 'skyline_dr', kind: 'street', axis: 'x', coord: -512, width: 14, name: 'Skyline Drive', from: -96, to: 288, isNew: true },
    { id: 'crestline', kind: 'avenue', axis: 'z', coord: -510, width: 14, name: 'Crestline Drive', from: -380, to: 380 },
    { id: 'harbor_rd', kind: 'street', axis: 'x', coord: 470, width: 16, name: 'Harbor Road', from: 0, to: 410 },
    { id: 'quay_st', kind: 'street', axis: 'x', coord: 580, width: 14, name: 'Quay Street', from: 0, to: 410 },
  ];

  const CONFIG = {
    lines: LINES,
    sidewalk: SIDEWALK,
    kerbHeight: 0.15,
    laneWidth: LANE,
    avenueWidth: (x) => (x === 0 ? 26 : 14),
    avenueMedian: (x) => (x === 0 ? 4 : 0),
    streetWidth: (z) => (z === 0 ? 18 : 14),
    streetMedian: (z) => (z === 0 ? 3 : 0),
    seawallX: 424,
    waterLevel: -1.1,
    // The playable world: the city, the airport to the north, Fort Breakwater
    // to the west, the new districts south, west and north, and Isla Paloma
    // across the bay (VICEHAVEN 3.0).
    bounds: { minX: -1600, maxX: 1560, minZ: -1800, maxZ: 1800 },
    // The world as it was before 3.0: the outskirts trees are drawn in it, so
    // they stay exactly where they were.
    v2Bounds: { minX: -1600, maxX: 424, minZ: -1800, maxZ: 640 },
    // The old city limits (its outskirts trees and road-end barriers were laid out in these).
    cityBounds: { minX: -640, maxX: 424, minZ: -640, maxZ: 640 },
    // Ground kept clear of trees for the big new places (airfield.js, skyline.js, fort.js).
    zones: {
      northgate: { minX: -96, maxX: 300, minZ: -650, maxZ: -391 },
      airport: { minX: -1080, maxX: 380, minZ: -1560, maxZ: -1090 },
      fort: { minX: -1520, maxX: -1080, minZ: -420, maxZ: 420 },
      // The two stunt ramps north of Northgate Heights (activities.js).
      pasture: { minX: 30, maxX: 185, minZ: -840, maxZ: -765 },
    },
    // Isla Paloma and its bridges (data/districts.js).
    island: null,
    pier: { x0: 424, x1: 588, z0: -7, z1: 7 },
  };

  function districtAt(x, z) {
    const list = VH.Data.districts;
    for (let i = 0; i < list.length; i++) {
      const r = list[i].rect;
      if (x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ) return list[i];
    }
    return list[list.length - 1];
  }

  function landmarkForBlock(bx, bz) {
    return VH.Data.landmarks.find((l) => l.block && l.block[0] === bx && l.block[1] === bz) || null;
  }

  /** Recursively split a rectangle into lots between min and max size. */
  function splitLots(rng, rect, lotCfg, out, depth) {
    const w = rect.maxX - rect.minX;
    const d = rect.maxZ - rect.minZ;
    const canSplitX = w >= lotCfg.min * 2;
    const canSplitZ = d >= lotCfg.min * 2;
    const tooBig = w > lotCfg.max || d > lotCfg.max;
    if (depth > 7 || !tooBig || (!canSplitX && !canSplitZ)) {
      out.push(rect);
      return;
    }
    const alongX = canSplitX && (!canSplitZ || w > d || (w === d && rng.chance(0.5)));
    if (alongX) {
      const lo = rect.minX + lotCfg.min;
      const hi = rect.maxX - lotCfg.min;
      const cut = Math.round(VH.math.lerp(lo, hi, rng.range(0.3, 0.7)));
      splitLots(rng, { minX: rect.minX, maxX: cut, minZ: rect.minZ, maxZ: rect.maxZ }, lotCfg, out, depth + 1);
      splitLots(rng, { minX: cut, maxX: rect.maxX, minZ: rect.minZ, maxZ: rect.maxZ }, lotCfg, out, depth + 1);
    } else {
      const lo = rect.minZ + lotCfg.min;
      const hi = rect.maxZ - lotCfg.min;
      const cut = Math.round(VH.math.lerp(lo, hi, rng.range(0.3, 0.7)));
      splitLots(rng, { minX: rect.minX, maxX: rect.maxX, minZ: rect.minZ, maxZ: cut }, lotCfg, out, depth + 1);
      splitLots(rng, { minX: rect.minX, maxX: rect.maxX, minZ: cut, maxZ: rect.maxZ }, lotCfg, out, depth + 1);
    }
  }

  function generate(seed) {
    const rng = new VH.RNG(seed || 'vicehaven');
    const names = VH.Data.streetNames;
    const layout = {
      seed,
      config: CONFIG,
      roads: [],
      segments: [],
      intersections: [],
      blocks: [],
      lots: [],
      bounds: CONFIG.bounds,
    };

    // ------------------------------------------------------------ roads
    const minLine = LINES[0];
    const maxLine = LINES[LINES.length - 1];
    for (const x of LINES) {
      const w = CONFIG.avenueWidth(x);
      const road = {
        id: 'ave' + x, kind: 'avenue', axis: 'z', coord: x, width: w, median: CONFIG.avenueMedian(x),
        name: names.avenues[String(x)] || 'Avenue', from: minLine, to: maxLine,
      };
      // Grand Avenue carries on out of the grid: south to the docks, north
      // through Northgate Heights to the airport.
      if (x === 0) {
        road.cityFrom = -620;
        road.from = -1180;
        road.to = 620;
      }
      // Coral and Pelican Avenues run north to Skyline Drive.
      if (x === -96 || x === 288) {
        road.cityFrom = road.from;
        road.from = -512;
      }
      // 3.0: Grand Avenue runs on south to the South Coast Highway; Coral
      // and Pelican Avenues and Seawall Drive run north to Halcyon University
      // and Coral Marina. v2From / v2To keep the old ends (the old trees and
      // lamps are judged against those).
      if (x === 0) extendRoad(road, road.from, 1760);
      if (x === -96 || x === 288) extendRoad(road, -1070, road.to);
      if (x === 384) extendRoad(road, -1070, road.to);
      layout.roads.push(road);
    }
    for (const z of LINES) {
      const w = CONFIG.streetWidth(z);
      const road = {
        id: 'st' + z, kind: 'street', axis: 'x', coord: z, width: w, median: CONFIG.streetMedian(z),
        name: names.streets[String(z)] || 'Street', from: minLine, to: maxLine,
      };
      if (z === 0) {
        // Meridian Boulevard leads west out of town, to the gate of Fort Breakwater.
        road.cityFrom = -620;
        road.from = -1100;
        road.openStart = true; // the fort's gate, not a row of barriers
      }
      // Anchor and Heron Streets run west to Crestline Estates.
      if (z === -288 || z === 288) road.from = -620;
      // 3.0: both carry on to Westgate Parkway, and Anchor Street crosses the
      // Paloma Bridge to Isla Paloma.
      if (z === -288 || z === 288) extendRoad(road, -636, road.to);
      if (z === -288) {
        extendRoad(road, road.from, 1300);
        road.spans = [[391, 780, 'Paloma Bridge'], [780, 1300, 'Bridge Street']];
      }
      layout.roads.push(road);
    }
    // Pelican Avenue carries on south into Saltmarsh Docks.
    const pelican = layout.roads.find((r) => r.axis === 'z' && r.coord === 288);
    if (pelican) pelican.to = 620;
    if (pelican) extendRoad(pelican, pelican.from, 660); // 3.0: on to Southbay Road
    // Crestline Drive, through the estates; Harbor Road and Quay Street across the port.
    for (const extra of EXTRA_ROADS) {
      layout.roads.push(Object.assign({ median: 0 }, extra));
    }
    // 3.0: the new districts' roads.
    for (const r of VH.Data.roads3 || []) {
      layout.roads.push(Object.assign({ median: 0, kind: r.axis === 'z' ? 'avenue' : 'street' }, r, { v3: true }));
    }
    CONFIG.island = VH.Data.island || null;
    layout.zones = CONFIG.zones;
    for (const r of layout.roads) {
      const perDir = Math.max(1, Math.floor((r.width - r.median - 1) / 2 / LANE));
      r.lanesPerDirection = perDir;
    }
    const avenues = layout.roads.filter((r) => r.axis === 'z');
    const streets = layout.roads.filter((r) => r.axis === 'x');

    // ---------------------------------------------------- intersections
    for (const a of avenues) {
      for (const s of streets) {
        if (s.coord < a.from || s.coord > a.to || a.coord < s.from || a.coord > s.to) continue;
        const corner = (a.coord === minLine || a.coord === maxLine) && (s.coord === minLine || s.coord === maxLine);
        const inGrid = a.coord >= minLine && a.coord <= maxLine && s.coord >= minLine && s.coord <= maxLine;
        // 3.0: the new crossroads (four legs, a new road through them) get lights too.
        const legs4 = s.coord > a.from && s.coord < a.to && a.coord > s.from && a.coord < s.to;
        const span = (r) => [r.v2From !== undefined ? r.v2From : r.from, r.v2To !== undefined ? r.v2To : r.to];
        const [af, at] = span(a);
        const [sf, st] = span(s);
        const v3 = !!(a.v3 || s.v3) || s.coord < af || s.coord > at || a.coord < sf || a.coord > st;
        layout.intersections.push({
          id: 'x' + a.coord + '_' + s.coord,
          x: a.coord, z: s.coord,
          halfX: a.width / 2, halfZ: s.width / 2,
          avenue: a, street: s,
          signal: (!corner && inGrid) || (v3 && legs4),
          v3,
          // Cross-walks on every leg that has road beyond the junction.
          legs: {
            n: s.coord > a.from, s: s.coord < a.to,
            w: a.coord > s.from, e: a.coord < s.to,
          },
        });
      }
    }

    /** A road's stretches between junctions as they were before 3.0: [from, to, startsAtJunction, endsAtJunction]. */
    const v2Span = (q) => [q.v2From !== undefined ? q.v2From : q.from, q.v2To !== undefined ? q.v2To : q.to];
    function v2Stops(r) {
      if (r.v3) return [];
      const [rf, rt] = v2Span(r);
      const cr = (r.axis === 'z' ? streets : avenues)
        .filter((c) => !c.v3)
        .filter((c) => { const [cf, ct] = v2Span(c); return c.coord >= rf && c.coord <= rt && r.coord >= cf && r.coord <= ct; })
        .sort((p, q) => p.coord - q.coord);
      const out = [];
      let cursor = rf;
      let sj = false;
      for (const c of cr) {
        const edge0 = c.coord - c.width / 2;
        if (edge0 > cursor + 0.01) out.push([cursor, edge0, sj, true]);
        cursor = c.coord + c.width / 2;
        sj = true;
      }
      if (rt > cursor + 0.01) out.push([cursor, rt, sj, false]);
      return out;
    }

    // --------------------------------------------------------- segments
    // The stretches of road between junctions (junction squares are drawn separately).
    for (const r of layout.roads) {
      const crossers = (r.axis === 'z' ? streets : avenues)
        .filter((c) => c.coord >= r.from && c.coord <= r.to && r.coord >= c.from && r.coord <= c.to)
        .sort((p, q) => p.coord - q.coord);
      const stops = [];
      let cursor = r.from;
      for (const c of crossers) {
        const edge0 = c.coord - c.width / 2;
        if (edge0 > cursor + 0.01) stops.push([cursor, edge0]);
        cursor = c.coord + c.width / 2;
      }
      if (r.to > cursor + 0.01) stops.push([cursor, r.to]);
      for (const [a, b] of stops) {
        const seg = { road: r, axis: r.axis, from: a, to: b };
        if (r.axis === 'z') {
          seg.minX = r.coord - r.width / 2;
          seg.maxX = r.coord + r.width / 2;
          seg.minZ = a;
          seg.maxZ = b;
        } else {
          seg.minZ = r.coord - r.width / 2;
          seg.maxZ = r.coord + r.width / 2;
          seg.minX = a;
          seg.maxX = b;
        }
        // Does this segment end at a junction (so it needs a stop line and crossing)?
        seg.startsAtJunction = crossers.some((c) => Math.abs(c.coord + c.width / 2 - a) < 0.01);
        seg.endsAtJunction = crossers.some((c) => Math.abs(c.coord - c.width / 2 - b) < 0.01);
        // 3.0: the stretch this was before the new roads cut it (median palms keep their spots).
        const old = v2Stops(r).find(([oa, ob]) => (a + b) / 2 > oa && (a + b) / 2 < ob);
        if (old && (old[0] !== a || old[1] !== b)) seg.v2 = { from: old[0], to: old[1], sj: old[2], ej: old[3] };
        layout.segments.push(seg);
      }
    }

    // ----------------------------------------------------------- blocks
    for (let bx = 0; bx < LINES.length - 1; bx++) {
      for (let bz = 0; bz < LINES.length - 1; bz++) {
        const x0 = LINES[bx] + CONFIG.avenueWidth(LINES[bx]) / 2;
        const x1 = LINES[bx + 1] - CONFIG.avenueWidth(LINES[bx + 1]) / 2;
        const z0 = LINES[bz] + CONFIG.streetWidth(LINES[bz]) / 2;
        const z1 = LINES[bz + 1] - CONFIG.streetWidth(LINES[bz + 1]) / 2;
        const cx = (x0 + x1) / 2;
        const cz = (z0 + z1) / 2;
        const district = districtAt(cx, cz);
        const landmark = landmarkForBlock(bx, bz);
        const block = {
          id: 'b' + bx + '_' + bz, bx, bz,
          minX: x0, maxX: x1, minZ: z0, maxZ: z1, cx, cz,
          district,
          kind: landmark ? landmark.kind : 'buildings',
          landmark,
          alley: null,
          lots: [],
        };
        if (block.kind === 'buildings') planBlock(block, rng.fork(block.id));
        layout.blocks.push(block);
        for (const lot of block.lots) layout.lots.push(lot);
      }
    }

    // -------------------------------------------- 3.0: the new blocks
    // Kept out of layout.blocks (story places, the corner-shop plan and the
    // crowd index the old 8x8 grid there) like the roadside strips.
    layout.blocks3 = planBlocks3(layout);
    for (const block of layout.blocks3) for (const lot of block.lots) layout.lots.push(lot);
    layout.plots = {};
    for (const block of layout.blocks3) if (block.plot) layout.plots[block.plot] = block;

    // ------------------------------------------------------- waterfront
    const east = maxLine + CONFIG.avenueWidth(maxLine) / 2;
    layout.waterfront = {
      promenade: { minX: east, maxX: CONFIG.seawallX, minZ: CONFIG.bounds.minZ, maxZ: CONFIG.bounds.maxZ },
      boardwalk: { minX: east + SIDEWALK, maxX: CONFIG.seawallX, minZ: minLine - 7, maxZ: maxLine + 7 },
      seawallX: CONFIG.seawallX,
      waterLevel: CONFIG.waterLevel,
      pier: CONFIG.pier,
    };

    // ------------------------------------------------------------ spawn
    const plaza = layout.blocks.find((b) => b.kind === 'plaza');
    layout.spawn = plaza
      ? { x: plaza.cx, y: CONFIG.kerbHeight, z: plaza.maxZ - 10, yaw: Math.PI }
      : { x: 0, y: 0.2, z: 40, yaw: Math.PI };
    layout.plazaBlock = plaza || null;

    layout.districtAt = districtAt;
    layout.isLand = isLand;
    return layout;
  }

  /** Lengthen an old road, remembering where it used to end. */
  function extendRoad(road, from, to) {
    if (from !== road.from && road.v2From === undefined) road.v2From = road.from;
    if (to !== road.to && road.v2To === undefined) road.v2To = road.to;
    road.from = from;
    road.to = to;
  }

  /** Is (x, z) dry land (the mainland west of the seawall, or Isla Paloma)? */
  function isLand(x, z) {
    if (x <= CONFIG.seawallX) return true;
    const isl = CONFIG.island;
    if (!isl) return false;
    for (const r of isl.land) if (x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ) return true;
    return false;
  }

  /**
   * 3.0: blocks for the new districts from VH.Data.cells3. A cell edge on a
   * road is kerbed back to that road's edge; any other edge comes in 3 m.
   * Each block's lots come from its own RNG stream (rng.fork(block.id)),
   * like the old grid's, so nothing here moves anything there.
   */
  function planBlocks3(layout) {
    const rng = new VH.RNG('vicehaven-3');
    const out = [];
    const cells = VH.Data.cells3 || [];
    const byId = new Map(VH.Data.districts.map((d) => [d.id, d]));
    const roadAt = (axis, coord, along) => layout.roads.find((r) => r.axis === axis && r.coord === coord && along >= r.from - 0.01 && along <= r.to + 0.01);
    const inset = (axis, coord, along) => {
      const r = roadAt(axis, coord, along);
      return r ? r.width / 2 : 3;
    };
    cells.forEach((c, i) => {
      const [x0, x1, z0, z1] = c.r;
      const mx = (x0 + x1) / 2;
      const mz = (z0 + z1) / 2;
      const block = {
        id: 'n_' + c.d + '_' + i, v3: true,
        minX: x0 + inset('z', x0, mz), maxX: x1 - inset('z', x1, mz),
        minZ: z0 + inset('x', z0, mx), maxZ: z1 - inset('x', z1, mx),
        district: byId.get(c.d),
        kind: c.plot ? 'plot' : c.kind || 'buildings',
        plot: c.plot || null,
        landmark: null,
        alley: null,
        lots: [],
      };
      block.cx = (block.minX + block.maxX) / 2;
      block.cz = (block.minZ + block.maxZ) / 2;
      if (block.kind === 'buildings' && block.district.archetypes.length) planBlock(block, rng.fork(block.id));
      out.push(block);
    });
    // Neighbours across each road (block.nb.E/W/N/S), for the walkers in crowd.js:
    // the next block over whose facing edges line up within 14 m.
    for (const a of out) {
      a.nb = {};
      for (const b of out) {
        if (a === b) continue;
        const alignZ = Math.abs(a.minZ - b.minZ) < 14 && Math.abs(a.maxZ - b.maxZ) < 14;
        const alignX = Math.abs(a.minX - b.minX) < 14 && Math.abs(a.maxX - b.maxX) < 14;
        if (alignZ && b.minX > a.maxX && b.minX - a.maxX < 30) a.nb.E = b;
        if (alignZ && a.minX > b.maxX && a.minX - b.maxX < 30) a.nb.W = b;
        if (alignX && b.minZ > a.maxZ && b.minZ - a.maxZ < 30) a.nb.S = b;
        if (alignX && a.minZ > b.maxZ && a.minZ - b.maxZ < 30) a.nb.N = b;
      }
    }
    return out;
  }

  /** Divide a building block into lots (and maybe a service alley). */
  function planBlock(block, rng) {
    const d = block.district;
    const inner = {
      minX: block.minX + SIDEWALK, maxX: block.maxX - SIDEWALK,
      minZ: block.minZ + SIDEWALK, maxZ: block.maxZ - SIDEWALK,
    };
    const areas = [];
    if (rng.chance(d.alleyChance)) {
      const w = 6;
      const alongX = rng.chance(0.5);
      if (alongX) {
        const mid = Math.round((inner.minZ + inner.maxZ) / 2 + rng.range(-6, 6));
        block.alley = { minX: block.minX, maxX: block.maxX, minZ: mid - w / 2, maxZ: mid + w / 2, axis: 'x' };
        areas.push({ minX: inner.minX, maxX: inner.maxX, minZ: inner.minZ, maxZ: mid - w / 2, alleySide: 's' });
        areas.push({ minX: inner.minX, maxX: inner.maxX, minZ: mid + w / 2, maxZ: inner.maxZ, alleySide: 'n' });
      } else {
        const mid = Math.round((inner.minX + inner.maxX) / 2 + rng.range(-6, 6));
        block.alley = { minX: mid - w / 2, maxX: mid + w / 2, minZ: block.minZ, maxZ: block.maxZ, axis: 'z' };
        areas.push({ minX: inner.minX, maxX: mid - w / 2, minZ: inner.minZ, maxZ: inner.maxZ, alleySide: 'e' });
        areas.push({ minX: mid + w / 2, maxX: inner.maxX, minZ: inner.minZ, maxZ: inner.maxZ, alleySide: 'w' });
      }
    } else {
      areas.push(Object.assign({ alleySide: null }, inner));
    }

    for (const area of areas) {
      const rects = [];
      splitLots(rng, area, d.lot, rects, 0);
      for (const r of rects) {
        const eps = 0.01;
        // Which sides face the street (touch the inner edge of the pavement)?
        const front = {
          n: Math.abs(r.minZ - inner.minZ) < eps,
          s: Math.abs(r.maxZ - inner.maxZ) < eps,
          w: Math.abs(r.minX - inner.minX) < eps,
          e: Math.abs(r.maxX - inner.maxX) < eps,
        };
        const back = {
          n: area.alleySide === 'n' && Math.abs(r.minZ - area.minZ) < eps,
          s: area.alleySide === 's' && Math.abs(r.maxZ - area.maxZ) < eps,
          w: area.alleySide === 'w' && Math.abs(r.minX - area.minX) < eps,
          e: area.alleySide === 'e' && Math.abs(r.maxX - area.maxX) < eps,
        };
        const interior = !front.n && !front.s && !front.w && !front.e;
        let kind = 'building';
        if (rng.chance(d.emptyLotChance)) kind = 'parking';
        if (interior) kind = rng.chance(0.5) ? 'building' : 'courtyard';
        const arche = d.archetypes.length ? rng.weighted(d.archetypes) : null;
        block.lots.push({
          id: block.id + '_l' + block.lots.length,
          minX: r.minX, maxX: r.maxX, minZ: r.minZ, maxZ: r.maxZ,
          cx: (r.minX + r.maxX) / 2, cz: (r.minZ + r.maxZ) / 2,
          district: d, block, kind, interior, front, back,
          archetype: arche ? arche.type : null,
          floorRange: arche ? arche.floors : [2, 3],
          seed: rng.int(1, 1e9),
        });
      }
    }
  }

  /** The name a road goes by at `along` (a bridge has its own). */
  function roadName(r, along) {
    if (r.spans) for (const [a, b, name] of r.spans) if (along >= a && along <= b) return name;
    return r.name;
  }

  /** Name of the road at a point, or null (used by the HUD location readout). */
  function roadNameAt(layout, x, z) {
    let best = null;
    let bestScore = Infinity;
    for (const r of layout.roads) {
      const along = r.axis === 'z' ? z : x;
      const across = r.axis === 'z' ? x - r.coord : z - r.coord;
      if (along < r.from - 8 || along > r.to + 8) continue;
      const half = r.width / 2 + SIDEWALK + 1;
      const score = Math.abs(across) / half;
      if (score < 1 && score < bestScore) {
        bestScore = score;
        best = r;
      }
    }
    return best ? roadName(best, best.axis === 'z' ? z : x) : null;
  }

  VH.CityGen = { CONFIG, EXTRA_ROADS, generate, districtAt, roadNameAt, roadName, isLand };

  /**
   * 3.0: the district builders (js/districts/<id>.js) register here.
   *   VH.Districts.register({ id, plots: ['plot id', ...], build(world, layout) })
   * world.js calls each build() once the new blocks stand, and leaves out its
   * own placeholder on every plot a builder claims. See docs/WORLD.md.
   */
  VH.Districts = VH.Districts || {
    builders: [],
    register(def) {
      this.builders.push(def);
      return def;
    },
    /** The builder that claims a plot, if any. */
    owner(plotId) {
      return this.builders.find((b) => (b.plots || []).includes(plotId)) || null;
    },
  };
})();
