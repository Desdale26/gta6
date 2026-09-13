// roads.js — the road graph and everything built from it.
//
// The city is a warped lattice: regular enough that intersections are exact and traffic AI
// is trivial, irregular enough that it never reads as graph paper. The same graph drives
// the road meshes, the lane centres traffic drives down, the sidewalks pedestrians walk on,
// the blocks buildings fill, and the navigation used by police and missions.
import * as THREE from 'three';
import { clamp, lerp, wrapAngle, SpatialHash, pointSegment2D } from '../core/mathx.js';
import { fbm2D } from '../core/rng.js';
import { LAYER, SURFACE } from '../physics/world.js';
import { WORLD, SURF } from './terrain.js';

export const ROAD_TYPE = {
  HIGHWAY: 'highway', ARTERIAL: 'arterial', STREET: 'street', ALLEY: 'alley', DIRT: 'dirt',
};
export const ROAD_SPEC = {
  highway: { lanesPerDir: 3, laneWidth: 3.8, speed: 34, sidewalk: 0, marking: 'highway' },
  arterial: { lanesPerDir: 2, laneWidth: 3.5, speed: 22, sidewalk: 3.2, marking: 'arterial' },
  street: { lanesPerDir: 1, laneWidth: 3.4, speed: 15, sidewalk: 2.6, marking: 'street' },
  alley: { lanesPerDir: 1, laneWidth: 2.6, speed: 9, sidewalk: 0, marking: 'none' },
  dirt: { lanesPerDir: 1, laneWidth: 3.0, speed: 12, sidewalk: 0, marking: 'none' },
};

let _nid = 0, _eid = 0;

export class RoadNode {
  constructor(x, z) {
    this.id = _nid++;
    this.x = x; this.z = z; this.y = 0;
    this.edges = [];
    this.district = null;
    this.light = null;              // TrafficLight when this is a signalled junction
    this.isIntersection = false;
    this.maxType = ROAD_TYPE.STREET;
    this.radius = 5;
    this._gScore = 0; this._fScore = 0; this._came = null; this._open = 0;
  }
  get degree() { return this.edges.length; }
  other(edge) { return edge.a === this ? edge.b : edge.a; }
}

export class RoadEdge {
  constructor(a, b, type, district) {
    this.id = _eid++;
    this.a = a; this.b = b;
    this.type = type;
    this.district = district;
    const spec = ROAD_SPEC[type];
    this.lanesPerDir = spec.lanesPerDir;
    this.laneWidth = spec.laneWidth;
    this.speedLimit = spec.speed;
    this.sidewalkWidth = spec.sidewalk;
    this.halfWidth = spec.lanesPerDir * spec.laneWidth;
    const dx = b.x - a.x, dz = b.z - a.z;
    this.length = Math.hypot(dx, dz) || 1e-4;
    this.dx = dx / this.length; this.dz = dz / this.length;
    // (-dz, dx) is the RIGHT of travel, not the left: facing (dx, dz), the
    // driver's right is (-dz, dx), because a three.js camera looks down its own
    // -Z. Labelled the other way round, the lane offsets below were negated to
    // compensate and the whole city ended up driving on the left.
    this.nx = -this.dz; this.nz = this.dx;           // right-hand normal
    this.angle = Math.atan2(this.dx, this.dz);
    this.oneWay = false;
    this.bridge = false;
    this.tunnel = false;
    a.edges.push(this); b.edges.push(this);
  }
  /** World position of a lane centre. dir: +1 = a→b, -1 = b→a. t in [0,1] along a→b. */
  lanePoint(dir, laneIndex, t, out) {
    const off = (laneIndex + 0.5) * this.laneWidth * (dir > 0 ? 1 : -1);
    // Right-hand traffic: travelling a→b puts you on the +normal side.
    const px = lerp(this.a.x, this.b.x, t) + this.nx * off;
    const pz = lerp(this.a.z, this.b.z, t) + this.nz * off;
    out.set(px, 0, pz);
    return out;
  }
  laneOffsetVec(dir, laneIndex) {
    const off = (laneIndex + 0.5) * this.laneWidth * (dir > 0 ? 1 : -1);
    return { x: this.nx * off, z: this.nz * off };
  }
  pointAt(t, out) { out.set(lerp(this.a.x, this.b.x, t), 0, lerp(this.a.z, this.b.z, t)); return out; }
  /** Closest parameter t on this edge to a world point. */
  project(x, z) {
    const r = pointSegment2D(x, z, this.a.x, this.a.z, this.b.x, this.b.z);
    return r;
  }
}

export class TrafficLight {
  constructor(node) {
    this.node = node;
    this.phase = 0;                 // 0 = axis A green, 1 = A amber, 2 = B green, 3 = B amber
    this.timer = 0;
    this.greenTime = 11 + (node.id % 5);
    this.amberTime = 2.6;
    this.axisA = [];                // edges on the primary axis
    this.axisB = [];
    this._classify();
  }
  _classify() {
    const n = this.node;
    if (!n.edges.length) return;
    const base = n.edges[0].angle;
    for (const e of n.edges) {
      const d = Math.abs(wrapAngle(e.angle - base));
      const alignedA = d < Math.PI / 4 || d > Math.PI * 0.75;
      (alignedA ? this.axisA : this.axisB).push(e);
    }
    if (!this.axisB.length) { this.axisB = this.axisA.slice(Math.ceil(this.axisA.length / 2)); this.axisA = this.axisA.slice(0, Math.ceil(this.axisA.length / 2)); }
  }
  update(dt) {
    this.timer += dt;
    const dur = (this.phase === 1 || this.phase === 3) ? this.amberTime : this.greenTime;
    if (this.timer >= dur) { this.timer = 0; this.phase = (this.phase + 1) % 4; }
  }
  /** 'green' | 'amber' | 'red' for an edge approaching this node. */
  stateFor(edge) {
    const inA = this.axisA.includes(edge);
    if (this.phase === 0) return inA ? 'green' : 'red';
    if (this.phase === 1) return inA ? 'amber' : 'red';
    if (this.phase === 2) return inA ? 'red' : 'green';
    return inA ? 'red' : 'amber';
  }
}

export class RoadGraph {
  constructor() {
    this.nodes = [];
    this.edges = [];
    this.lights = [];
    this.edgeHash = new SpatialHash(40);
    this.nodeHash = new SpatialHash(40);
    this.blocks = [];
    this._q = [];
    this._searchId = 0;
  }
  addNode(x, z) { const n = new RoadNode(x, z); this.nodes.push(n); return n; }
  addEdge(a, b, type, district) {
    if (a === b) return null;
    for (const e of a.edges) if (e.a === b || e.b === b) return e;
    const e = new RoadEdge(a, b, type, district);
    this.edges.push(e);
    return e;
  }
  buildIndex() {
    this.edgeHash.clear();
    for (const e of this.edges) {
      this.edgeHash.insert(e, Math.min(e.a.x, e.b.x) - 6, Math.min(e.a.z, e.b.z) - 6,
        Math.max(e.a.x, e.b.x) + 6, Math.max(e.a.z, e.b.z) + 6);
    }
    this.nodeHash.clear();
    for (const n of this.nodes) this.nodeHash.insertPoint(n, n.x, n.z);
  }

  nearestEdge(x, z, maxR = 90) {
    let best = null, bestD = maxR;
    const list = this.edgeHash.queryRadius(x, z, maxR, this._q);
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      const r = e.project(x, z);
      if (r.d < bestD) { bestD = r.d; best = { edge: e, t: r.t, d: r.d, x: r.x, z: r.z }; }
    }
    return best;
  }
  nearestNode(x, z, maxR = 200) {
    let best = null, bestD = maxR * maxR;
    const list = this.nodeHash.queryRadius(x, z, maxR, this._q);
    for (let i = 0; i < list.length; i++) {
      const n = list[i];
      const d = (n.x - x) * (n.x - x) + (n.z - z) * (n.z - z);
      if (d < bestD) { bestD = d; best = n; }
    }
    return best;
  }

  /** A* over the node graph. Returns an array of nodes, or null. */
  findPath(start, goal, opts = {}) {
    if (!start || !goal) return null;
    if (start === goal) return [start];
    const avoidHighway = !!opts.avoidHighway;
    const open = [start];
    const sid = ++this._searchId;
    start._search = sid; start._gScore = 0; start._came = null;
    start._fScore = Math.hypot(goal.x - start.x, goal.z - start.z);
    let guard = 0;
    while (open.length && guard++ < 20000) {
      // linear scan is fine at this graph size
      let bi = 0;
      for (let i = 1; i < open.length; i++) if (open[i]._fScore < open[bi]._fScore) bi = i;
      const cur = open.splice(bi, 1)[0];
      if (cur === goal) {
        const path = [cur];
        let c = cur;
        while (c._came) { c = c._came; path.push(c); }
        return path.reverse();
      }
      for (const e of cur.edges) {
        const nb = cur.other(e);
        if (avoidHighway && e.type === ROAD_TYPE.HIGHWAY) continue;
        const cost = e.length / Math.max(4, e.speedLimit);
        const g = cur._gScore + cost;
        if (nb._search !== sid || g < nb._gScore) {
          nb._search = sid;
          nb._gScore = g;
          nb._came = cur;
          nb._fScore = g + Math.hypot(goal.x - nb.x, goal.z - nb.z) / 30;
          if (!open.includes(nb)) open.push(nb);
        }
      }
    }
    return null;
  }

  update(dt) { for (let i = 0; i < this.lights.length; i++) this.lights[i].update(dt); }

  randomEdge(rng, filter) {
    for (let i = 0; i < 40; i++) {
      const e = this.edges[rng.int(0, this.edges.length - 1)];
      if (!filter || filter(e)) return e;
    }
    return this.edges[0];
  }
}

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------
/**
 * Build the lattice, cull it against water and the map edge, promote some rows and columns
 * to arterials and a highway ring, then subdivide dense districts with local streets.
 */
export function generateRoads(ctx, terrain, districts, rng) {
  const graph = new RoadGraph();
  const SP = 96;                                     // primary lattice spacing
  const x0 = -1480, x1 = 1090, z0 = -1480, z1 = 1480;
  const cols = Math.floor((x1 - x0) / SP) + 1;
  const rows = Math.floor((z1 - z0) / SP) + 1;
  const grid = new Array(cols * rows).fill(null);
  const seed = rng.seed;

  const warpAt = (x, z) => {
    const wx = fbm2D(x * 0.0022, z * 0.0022, { octaves: 3, seed }) * 26;
    const wz = fbm2D(x * 0.0022 + 11.3, z * 0.0022 - 7.1, { octaves: 3, seed: seed + 5 }) * 26;
    return [wx, wz];
  };

  // --- nodes ---
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      let x = x0 + i * SP, z = z0 + j * SP;
      const [wx, wz] = warpAt(x, z);
      const d = districts.districtAt(x, z);
      const warpScale = d && (d.style === 'oldtown' || d.style === 'hills' || d.style === 'barrio') ? 1.5
        : d && (d.style === 'downtown' || d.style === 'financial' || d.style === 'airport') ? 0.22 : 0.8;
      x += wx * warpScale; z += wz * warpScale;
      const h = terrain.baseHeight(x, z);
      if (h < terrain.waterLevel + 0.9) continue;         // no nodes in water
      const n = graph.addNode(x, z);
      n.y = h;
      n.district = d;
      grid[j * cols + i] = n;
    }
  }

  // --- primary edges ---
  const highwayRow = Math.round(rows * 0.30);
  const highwayRow2 = Math.round(rows * 0.72);
  const highwayCol = Math.round(cols * 0.28);
  const at = (i, j) => (i >= 0 && j >= 0 && i < cols && j < rows ? grid[j * cols + i] : null);

  const typeFor = (i, j, horizontal) => {
    if (horizontal && (j === highwayRow || j === highwayRow2)) return ROAD_TYPE.HIGHWAY;
    if (!horizontal && i === highwayCol) return ROAD_TYPE.HIGHWAY;
    if (horizontal ? j % 3 === 0 : i % 3 === 0) return ROAD_TYPE.ARTERIAL;
    return ROAD_TYPE.STREET;
  };

  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const n = at(i, j);
      if (!n) continue;
      const d = n.district;
      const density = d ? clamp(d.density + 0.35, 0.25, 1) : 0.6;
      const e1 = at(i + 1, j), e2 = at(i, j + 1);
      for (const [nb, horizontal] of [[e1, true], [e2, false]]) {
        if (!nb) continue;
        const t = typeFor(i, j, horizontal);
        // Streets get culled in low-density areas to create irregular blocks and dead ends.
        if (t === ROAD_TYPE.STREET && rng.float() > density * 0.94) continue;
        // Don't bridge huge gaps created by culled nodes.
        if (Math.hypot(nb.x - n.x, nb.z - n.z) > SP * 1.8) continue;
        // Water crossings become bridges only on arterials and highways.
        const midX = (n.x + nb.x) * 0.5, midZ = (n.z + nb.z) * 0.5;
        const midH = terrain.baseHeight(midX, midZ);
        if (midH < terrain.waterLevel + 0.4 && t === ROAD_TYPE.STREET) continue;
        const edge = graph.addEdge(n, nb, t, d);
        if (edge && midH < terrain.waterLevel + 0.4) edge.bridge = true;
      }
    }
  }

  // --- drop orphan nodes ---
  graph.nodes = graph.nodes.filter((n) => n.edges.length > 0);

  // --- secondary streets inside big blocks of dense districts ---
  const extraNodes = [];
  for (let j = 0; j + 1 < rows; j++) {
    for (let i = 0; i + 1 < cols; i++) {
      const a = at(i, j), b = at(i + 1, j), c = at(i, j + 1), d2 = at(i + 1, j + 1);
      if (!a || !b || !c || !d2) continue;
      const dist = a.district;
      if (!dist) continue;
      const wantSplit = dist.density > 0.55 && (dist.blockSize ? dist.blockSize[0] < 70 : true);
      if (!wantSplit || rng.float() > 0.72) continue;
      // Add a mid-block street in the shorter direction.
      const horizontal = rng.bool(0.5);
      if (horizontal) {
        const m1 = graph.addNode((a.x + c.x) * 0.5 + rng.range(-4, 4), (a.z + c.z) * 0.5 + rng.range(-4, 4));
        const m2 = graph.addNode((b.x + d2.x) * 0.5 + rng.range(-4, 4), (b.z + d2.z) * 0.5 + rng.range(-4, 4));
        m1.y = terrain.baseHeight(m1.x, m1.z); m2.y = terrain.baseHeight(m2.x, m2.z);
        m1.district = dist; m2.district = dist;
        if (m1.y > terrain.waterLevel + 0.9 && m2.y > terrain.waterLevel + 0.9) {
          graph.addEdge(m1, m2, rng.bool(0.3) ? ROAD_TYPE.ALLEY : ROAD_TYPE.STREET, dist);
          _splitInto(graph, a, c, m1, dist);
          _splitInto(graph, b, d2, m2, dist);
          extraNodes.push(m1, m2);
        }
      } else {
        const m1 = graph.addNode((a.x + b.x) * 0.5 + rng.range(-4, 4), (a.z + b.z) * 0.5 + rng.range(-4, 4));
        const m2 = graph.addNode((c.x + d2.x) * 0.5 + rng.range(-4, 4), (c.z + d2.z) * 0.5 + rng.range(-4, 4));
        m1.y = terrain.baseHeight(m1.x, m1.z); m2.y = terrain.baseHeight(m2.x, m2.z);
        m1.district = dist; m2.district = dist;
        if (m1.y > terrain.waterLevel + 0.9 && m2.y > terrain.waterLevel + 0.9) {
          graph.addEdge(m1, m2, rng.bool(0.3) ? ROAD_TYPE.ALLEY : ROAD_TYPE.STREET, dist);
          _splitInto(graph, a, b, m1, dist);
          _splitInto(graph, c, d2, m2, dist);
          extraNodes.push(m1, m2);
        }
      }
    }
  }
  graph.nodes = graph.nodes.filter((n) => n.edges.length > 0);

  // --- coastal boulevard: chain the easternmost node of each row ---
  const coastChain = [];
  for (let j = 0; j < rows; j++) {
    let best = null;
    for (let i = cols - 1; i >= 0; i--) {
      const n = at(i, j);
      if (n && n.edges.length) { best = n; break; }
    }
    if (best) coastChain.push(best);
  }
  for (let i = 0; i + 1 < coastChain.length; i++) {
    const a = coastChain[i], b = coastChain[i + 1];
    if (Math.hypot(b.x - a.x, b.z - a.z) < SP * 2.4) graph.addEdge(a, b, ROAD_TYPE.ARTERIAL, a.district);
  }

  // --- classify nodes, place traffic lights ---
  for (const n of graph.nodes) {
    n.isIntersection = n.edges.length >= 3;
    let maxW = 0;
    for (const e of n.edges) {
      maxW = Math.max(maxW, e.halfWidth);
      if (e.type === ROAD_TYPE.HIGHWAY) n.maxType = ROAD_TYPE.HIGHWAY;
      else if (e.type === ROAD_TYPE.ARTERIAL && n.maxType !== ROAD_TYPE.HIGHWAY) n.maxType = ROAD_TYPE.ARTERIAL;
    }
    n.radius = maxW + 1.2;
    if (n.isIntersection && n.maxType !== ROAD_TYPE.HIGHWAY) {
      const arterials = n.edges.filter((e) => e.type === ROAD_TYPE.ARTERIAL).length;
      if (arterials >= 1 || (n.edges.length >= 4 && rng.bool(0.55))) {
        n.light = new TrafficLight(n);
        graph.lights.push(n.light);
      }
    }
  }

  graph.buildIndex();
  graph.blocks = findBlocks(graph, grid, cols, rows, at);
  return graph;
}

/** Replace edge (a,b) with (a,m) + (m,b) when it exists; otherwise just link m to both. */
function _splitInto(graph, a, b, m, district) {
  const existing = a.edges.find((e) => e.a === b || e.b === b);
  const type = existing ? existing.type : ROAD_TYPE.STREET;
  if (existing) {
    const i = graph.edges.indexOf(existing);
    if (i >= 0) graph.edges.splice(i, 1);
    a.edges.splice(a.edges.indexOf(existing), 1);
    b.edges.splice(b.edges.indexOf(existing), 1);
  }
  graph.addEdge(a, m, type, district);
  graph.addEdge(m, b, type, district);
}

/** City blocks = lattice cells with all four corners present. Used to place buildings. */
export function findBlocks(graph, grid, cols, rows, at) {
  const blocks = [];
  for (let j = 0; j + 1 < rows; j++) {
    for (let i = 0; i + 1 < cols; i++) {
      const a = at(i, j), b = at(i + 1, j), c = at(i + 1, j + 1), d = at(i, j + 1);
      if (!a || !b || !c || !d) continue;
      if (!a.edges.length || !b.edges.length || !c.edges.length || !d.edges.length) continue;
      const cx = (a.x + b.x + c.x + d.x) / 4;
      const cz = (a.z + b.z + c.z + d.z) / 4;
      blocks.push({
        corners: [a, b, c, d],
        cx, cz,
        district: a.district,
        w: Math.hypot(b.x - a.x, b.z - a.z),
        d: Math.hypot(d.x - a.x, d.z - a.z),
        angle: Math.atan2(b.x - a.x, b.z - a.z),
        used: false,
      });
    }
  }
  return blocks;
}

// ---------------------------------------------------------------------------
// Terrain stamping + geometry
// ---------------------------------------------------------------------------
export function stampRoadsIntoTerrain(graph, terrain) {
  for (const e of graph.edges) {
    const sw = e.sidewalkWidth;
    // Flatten the whole corridor, including where the sidewalk slabs will sit.
    terrain.stampRoad(e.a.x, e.a.z, e.a.y, e.b.x, e.b.z, e.b.y, e.halfWidth + sw, SURF.ROAD, 3.2);
  }
  // Re-stamp the carriageway so the verge blend doesn't eat the road surface.
  for (const e of graph.edges) {
    terrain.stampRoad(e.a.x, e.a.z, e.a.y, e.b.x, e.b.z, e.b.y, e.halfWidth, SURF.ROAD, 0.8);
  }
  // Junction pads.
  for (const n of graph.nodes) {
    terrain.stampPad(n.x, n.z, n.radius + 1.5, n.radius + 1.5, 0, n.y, SURF.ROAD, 2.0);
  }
  terrain.finalize();
}

const _v = new THREE.Vector3();

/**
 * Build road surface, lane markings and sidewalk geometry. Everything is merged into a
 * handful of meshes; sidewalks also become physics boxes so kerbs behave like kerbs.
 */
export function buildRoadMeshes(graph, terrain, materials, phys, opts = {}) {
  const group = new THREE.Group();
  group.name = 'roads';
  const roadPos = [], roadUv = [], roadNorm = [], roadIdx = [];
  const markPos = [], markUv = [], markIdx = [];
  const walkPos = [], walkUv = [], walkNorm = [], walkIdx = [];
  const Y = 0.035;                 // road surface lift above the heightfield
  const WALK_H = 0.16;

  const pushQuad = (posArr, uvArr, normArr, idxArr, p0, p1, p2, p3, uvScale, nrm) => {
    const base = posArr.length / 3;
    for (const p of [p0, p1, p2, p3]) posArr.push(p[0], p[1], p[2]);
    if (normArr) for (let i = 0; i < 4; i++) normArr.push(nrm ? nrm[0] : 0, nrm ? nrm[1] : 1, nrm ? nrm[2] : 0);
    const u = uvScale || [0, 0, 1, 1];
    uvArr.push(u[0], u[1], u[2], u[1], u[2], u[3], u[0], u[3]);
    idxArr.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };

  // ---- carriageways ----
  for (const e of graph.edges) {
    const steps = Math.max(1, Math.ceil(e.length / 18));
    const hw = e.halfWidth;
    for (let s = 0; s < steps; s++) {
      const t0 = s / steps, t1 = (s + 1) / steps;
      const ax = lerp(e.a.x, e.b.x, t0), az = lerp(e.a.z, e.b.z, t0);
      const bx = lerp(e.a.x, e.b.x, t1), bz = lerp(e.a.z, e.b.z, t1);
      const ay = terrain.heightAt(ax, az) + Y, by = terrain.heightAt(bx, bz) + Y;
      pushQuad(roadPos, roadUv, roadNorm, roadIdx,
        [ax - e.nx * hw, ay, az - e.nz * hw],
        [ax + e.nx * hw, ay, az + e.nz * hw],
        [bx + e.nx * hw, by, bz + e.nz * hw],
        [bx - e.nx * hw, by, bz - e.nz * hw],
        [0, (t0 * e.length) / 8, hw * 2 / 8, (t1 * e.length) / 8]);
    }

    // ---- markings ----
    const spec = ROAD_SPEC[e.type];
    if (spec.marking !== 'none') {
      const mY = Y + 0.012;
      // centre line (double yellow on arterials/highways, dashed white on streets)
      const dash = e.type === ROAD_TYPE.STREET;
      const segLen = dash ? 3.2 : e.length;
      const gap = dash ? 3.6 : 0;
      let d = 0;
      while (d < e.length) {
        const l = Math.min(segLen, e.length - d);
        const t0 = d / e.length, t1 = (d + l) / e.length;
        const ax = lerp(e.a.x, e.b.x, t0), az = lerp(e.a.z, e.b.z, t0);
        const bx = lerp(e.a.x, e.b.x, t1), bz = lerp(e.a.z, e.b.z, t1);
        const ay = terrain.heightAt(ax, az) + mY, by = terrain.heightAt(bx, bz) + mY;
        const w = 0.11;
        if (dash) {
          pushQuad(markPos, markUv, null, markIdx,
            [ax - e.nx * w, ay, az - e.nz * w], [ax + e.nx * w, ay, az + e.nz * w],
            [bx + e.nx * w, by, bz + e.nz * w], [bx - e.nx * w, by, bz - e.nz * w],
            [0.02, 0.02, 0.23, 0.48]);
        } else {
          for (const o of [-0.16, 0.16]) {
            pushQuad(markPos, markUv, null, markIdx,
              [ax + e.nx * (o - w), ay, az + e.nz * (o - w)], [ax + e.nx * (o + w), ay, az + e.nz * (o + w)],
              [bx + e.nx * (o + w), by, bz + e.nz * (o + w)], [bx + e.nx * (o - w), by, bz + e.nz * (o - w)],
              [0.52, 0.02, 0.73, 0.48]);
          }
        }
        d += l + gap;
      }
      // lane dividers + edge lines
      const lines = [];
      for (let li = 1; li < spec.lanesPerDir; li++) { lines.push(li * spec.laneWidth, -li * spec.laneWidth); }
      lines.push(hw - 0.28, -(hw - 0.28));
      for (const off of lines) {
        const edgeLine = Math.abs(Math.abs(off) - (hw - 0.28)) < 0.01;
        const seg = edgeLine ? e.length : 3.0, gp = edgeLine ? 0 : 4.4;
        let dd = 0;
        while (dd < e.length) {
          const l = Math.min(seg, e.length - dd);
          const t0 = dd / e.length, t1 = (dd + l) / e.length;
          const ax = lerp(e.a.x, e.b.x, t0), az = lerp(e.a.z, e.b.z, t0);
          const bx = lerp(e.a.x, e.b.x, t1), bz = lerp(e.a.z, e.b.z, t1);
          const ay = terrain.heightAt(ax, az) + mY, by = terrain.heightAt(bx, bz) + mY;
          const w = 0.09;
          pushQuad(markPos, markUv, null, markIdx,
            [ax + e.nx * (off - w), ay, az + e.nz * (off - w)], [ax + e.nx * (off + w), ay, az + e.nz * (off + w)],
            [bx + e.nx * (off + w), by, bz + e.nz * (off + w)], [bx + e.nx * (off - w), by, bz + e.nz * (off - w)],
            [0.02, 0.52, 0.23, 0.98]);
          dd += l + gp;
        }
      }
    }

    // ---- sidewalks ----
    if (e.sidewalkWidth > 0.5) {
      const sw = e.sidewalkWidth;
      for (const side of [-1, 1]) {
        const inner = hw, outer = hw + sw;
        const steps2 = Math.max(1, Math.ceil(e.length / 22));
        for (let s = 0; s < steps2; s++) {
          const t0 = s / steps2, t1 = (s + 1) / steps2;
          const ax = lerp(e.a.x, e.b.x, t0), az = lerp(e.a.z, e.b.z, t0);
          const bx = lerp(e.a.x, e.b.x, t1), bz = lerp(e.a.z, e.b.z, t1);
          const ay = terrain.heightAt(ax, az) + WALK_H, by = terrain.heightAt(bx, bz) + WALK_H;
          // top
          pushQuad(walkPos, walkUv, walkNorm, walkIdx,
            [ax + e.nx * inner * side, ay, az + e.nz * inner * side],
            [ax + e.nx * outer * side, ay, az + e.nz * outer * side],
            [bx + e.nx * outer * side, by, bz + e.nz * outer * side],
            [bx + e.nx * inner * side, by, bz + e.nz * inner * side],
            [0, (t0 * e.length) / 3, sw / 3, (t1 * e.length) / 3], [0, 1, 0]);
          // kerb face
          pushQuad(walkPos, walkUv, walkNorm, walkIdx,
            [ax + e.nx * inner * side, ay - WALK_H, az + e.nz * inner * side],
            [bx + e.nx * inner * side, by - WALK_H, bz + e.nz * inner * side],
            [bx + e.nx * inner * side, by, bz + e.nz * inner * side],
            [ax + e.nx * inner * side, ay, az + e.nz * inner * side],
            [0, 0, e.length / 3, 0.06], [e.nx * side, 0, e.nz * side]);
        }
        // physics: one low box per side, so kerbs bump but don't stop a car
        if (phys) {
          const midX = (e.a.x + e.b.x) * 0.5 + e.nx * (hw + sw * 0.5) * side;
          const midZ = (e.a.z + e.b.z) * 0.5 + e.nz * (hw + sw * 0.5) * side;
          const midY = terrain.heightAt(midX, midZ);
          phys.addBox(midX, midY + WALK_H * 0.5, midZ, sw * 0.5, WALK_H * 0.5 + 0.02, e.length * 0.5,
            e.angle, { layer: LAYER.PROP, surface: SURFACE.CONCRETE, drivable: true, restitution: 0.02, friction: 0.95 });
        }
      }
    }
  }

  // ---- junction pads + crosswalks ----
  for (const n of graph.nodes) {
    if (!n.isIntersection) continue;
    const r = n.radius;
    const y = terrain.heightAt(n.x, n.z) + Y + 0.004;
    const base = roadPos.length / 3;
    const SEG = 8;
    roadPos.push(n.x, y, n.z); roadUv.push(0.5, 0.5); roadNorm.push(0, 1, 0);
    for (let i = 0; i <= SEG; i++) {
      const a = (i / SEG) * Math.PI * 2;
      const px = n.x + Math.cos(a) * r, pz = n.z + Math.sin(a) * r;
      roadPos.push(px, terrain.heightAt(px, pz) + Y + 0.004, pz);
      roadUv.push(px / 8, pz / 8);
      roadNorm.push(0, 1, 0);
    }
    for (let i = 0; i < SEG; i++) roadIdx.push(base, base + 1 + i, base + 2 + i);

    // crosswalk stripes on each approach
    if (n.light) {
      for (const e of n.edges) {
        const toward = e.a === n ? 1 : -1;
        const dx = e.dx * toward, dz = e.dz * toward;
        const nx = -dz, nz = dx;
        const startD = r + 0.6;
        for (let s = 0; s < 6; s++) {
          const off = (s - 2.5) * 0.86;
          const cx = n.x + dx * (startD + 1.0) + nx * off;
          const cz = n.z + dz * (startD + 1.0) + nz * off;
          const cy = terrain.heightAt(cx, cz) + Y + 0.014;
          const hwS = 0.3, hdS = 1.5;
          pushQuad(markPos, markUv, null, markIdx,
            [cx - nx * hwS - dx * hdS, cy, cz - nz * hwS - dz * hdS],
            [cx + nx * hwS - dx * hdS, cy, cz + nz * hwS - dz * hdS],
            [cx + nx * hwS + dx * hdS, cy, cz + nz * hwS + dz * hdS],
            [cx - nx * hwS + dx * hdS, cy, cz - nz * hwS + dz * hdS],
            [0.02, 0.52, 0.23, 0.98]);
        }
      }
    }
  }

  group.add(makeMesh(roadPos, roadUv, roadNorm, roadIdx, materials.road, 'roadSurface', true));
  group.add(makeMesh(markPos, markUv, null, markIdx, materials.roadMarking, 'roadMarkings', false));
  if (walkPos.length) group.add(makeMesh(walkPos, walkUv, walkNorm, walkIdx, materials.sidewalk, 'sidewalks', true));
  return group;
}

function makeMesh(pos, uv, norm, idx, material, name, receiveShadow) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  if (norm) g.setAttribute('normal', new THREE.Float32BufferAttribute(norm, 3));
  else g.computeVertexNormals();
  g.setIndex(idx);
  g.computeBoundingSphere();
  const m = new THREE.Mesh(g, material);
  m.name = name;
  m.receiveShadow = !!receiveShadow;
  m.castShadow = false;
  m.matrixAutoUpdate = false;
  m.updateMatrix();
  return m;
}

/** A random point on a sidewalk, for spawning pedestrians. */
export function randomSidewalkPoint(graph, rng, out, near) {
  for (let i = 0; i < 24; i++) {
    const e = near
      ? graph.nearestEdge(near.x + rng.range(-120, 120), near.z + rng.range(-120, 120), 120)?.edge
      : graph.edges[rng.int(0, graph.edges.length - 1)];
    if (!e || e.sidewalkWidth < 1) continue;
    const t = rng.range(0.12, 0.88);
    const side = rng.bool() ? 1 : -1;
    const off = e.halfWidth + e.sidewalkWidth * rng.range(0.25, 0.8);
    out.x = lerp(e.a.x, e.b.x, t) + e.nx * off * side;
    out.z = lerp(e.a.z, e.b.z, t) + e.nz * off * side;
    out.edge = e; out.t = t; out.side = side;
    return out;
  }
  out.x = 0; out.z = 0; out.edge = null;
  return out;
}
