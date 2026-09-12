// worldgen.js — builds Leonida.
//
// Order matters: districts decide character, terrain gives the ground, roads stamp themselves
// flat into that ground, blocks are filled with lots, lots get buildings and props, and
// everything that a car can hit becomes a collider along the way.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { clamp, lerp, SpatialHash } from '../core/mathx.js';
import { RNG, valueNoise2D } from '../core/rng.js';
import { LAYER, SURFACE } from '../physics/world.js';
import { Terrain, WORLD, SURF } from './terrain.js';
import { generateRoads, stampRoadsIntoTerrain, buildRoadMeshes, ROAD_TYPE, randomSidewalkPoint } from './roads.js';
import { initBuildings, buildBuilding, pickBuildingKind } from './buildings.js';
import { initProps, makeProp, propInstancer } from './props.js';
import { tex } from '../render/proctex.js';
import * as Districts from '../content/districtCatalog.js';
import { SHOP_TYPES, getShopType, generateShopName } from '../content/shopCatalog.js';
import { STUNT_SPOTS } from '../content/stuntCatalog.js';
import { buildStuntSpot } from './stunts.js';

const _v = new THREE.Vector3();

export class World {
  constructor(ctx) {
    this.ctx = ctx;
    this.seed = 0;
    this.districts = Districts;
    this.terrain = null;
    this.roads = null;
    this.group = new THREE.Group();
    this.group.name = 'world';
    this.buildings = [];
    this.shops = [];
    this.lights = [];            // light descriptors, instanced lazily by the lighting system
    this.stuntSpots = [];
    this.propHash = new SpatialHash(32);
    this.interiors = [];
    this.spawnPoints = [];
    this.parkedSlots = [];
    this.stats = {};
  }

  async generate(seedString, onProgress) {
    const t0 = performance.now();
    const rng = new RNG(seedString);
    this.seed = rng.seed;
    const ctx = this.ctx;
    const p = (frac, label) => { if (onProgress) onProgress(frac, label); };

    initBuildings(THREE, {
      materials: ctx.materials, tex, signTexture: ctx.materials?.sign?.bind(ctx.materials),
      mergeGeometries,
    });
    initProps(THREE, { materials: ctx.materials, tex, mergeGeometries });

    p(0.05, 'Raising the land');
    this.terrain = new Terrain(ctx, Districts);
    this.terrain.generate(this.seed);
    ctx.physics.setTerrain(this.terrain);
    await yieldFrame();

    p(0.16, 'Laying the roads');
    this.roads = generateRoads(ctx, this.terrain, Districts, rng.fork('roads'));
    stampRoadsIntoTerrain(this.roads, this.terrain);
    await yieldFrame();

    p(0.30, 'Paving');
    const terrainMesh = this.terrain.buildMesh(ctx.materials, 200, 5);
    this.group.add(terrainMesh);
    const roadMeshes = buildRoadMeshes(this.roads, this.terrain, ctx.materials, ctx.physics);
    this.group.add(roadMeshes);
    await yieldFrame();

    p(0.42, 'Building the city');
    await this._buildBlocks(rng.fork('blocks'), p);

    p(0.78, 'Dressing the streets');
    await this._placeProps(rng.fork('props'));

    p(0.88, 'Opening the shops');
    this._finaliseShops();

    p(0.92, 'Welding the ramps');
    this._buildStunts(rng.fork('stunts'));

    p(0.96, 'Filling the sea');
    this._buildWater();

    ctx.scene.add(this.group);
    ctx.physics.rebuildIndex();
    this.terrain.finalize();

    this.stats = {
      buildings: this.buildings.length,
      shops: this.shops.length,
      roadNodes: this.roads.nodes.length,
      roadEdges: this.roads.edges.length,
      blocks: this.roads.blocks.length,
      lights: this.lights.length,
      colliders: ctx.physics.statics.length,
      genMs: Math.round(performance.now() - t0),
    };
    p(1, 'Ready');
    return this;
  }

  // -------------------------------------------------------------------------
  async _buildBlocks(rng, p) {
    const ctx = this.ctx;
    const blocks = this.roads.blocks;
    let done = 0;
    const shopQuota = new Map();

    for (const block of blocks) {
      const d = block.district || Districts.districtAt(block.cx, block.cz);
      if (!d) continue;
      // Skip blocks that fall in water or are too small to hold anything.
      const h = this.terrain.heightAt(block.cx, block.cz);
      if (h < this.terrain.waterLevel + 0.6) continue;
      const inset = (d.roadWidth || 9) * 0.5 + (d.sidewalkWidth || 3) + 1.2;
      const bw = block.w - inset * 2;
      const bd = block.d - inset * 2;
      if (bw < 8 || bd < 8) continue;

      if (rng.float() > d.density + 0.12) {
        this._fillOpenLot(block, d, rng, bw, bd, inset);
      } else {
        this._fillBuiltLot(block, d, rng, bw, bd, shopQuota);
      }
      if (++done % 40 === 0) {
        p(0.42 + 0.36 * (done / blocks.length), 'Building the city');
        await yieldFrame();
      }
    }
  }

  /** A block of buildings arranged around the block perimeter, facing the streets. */
  _fillBuiltLot(block, d, rng, bw, bd, shopQuota) {
    const ctx = this.ctx;
    const cx = block.cx, cz = block.cz;
    const yaw = block.angle;
    const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
    const toWorld = (lx, lz) => ({ x: cx + lx * cosY + lz * sinY, z: cz - lx * sinY + lz * cosY });

    // Lay lots along each of the four edges.
    const edges = [
      { along: bw, depth: bd, nx: 0, nz: 1 },
      { along: bw, depth: bd, nx: 0, nz: -1 },
      { along: bd, depth: bw, nx: 1, nz: 0 },
      { along: bd, depth: bw, nx: -1, nz: 0 },
    ];
    const lotW = clamp(lerp(d.blockSize[0], d.blockSize[1], rng.float()) * 0.28, 9, 28);
    const lotDepth = clamp(Math.min(bw, bd) * 0.42, 8, 26);

    for (const e of edges) {
      const n = Math.max(1, Math.floor(e.along / lotW));
      const step = e.along / n;
      for (let i = 0; i < n; i++) {
        if (rng.float() > d.density * 1.05) continue;
        const t = -e.along / 2 + (i + 0.5) * step;
        const offset = e.depth / 2 - lotDepth / 2;
        const lx = e.nx === 0 ? t : e.nx * offset;
        const lz = e.nz === 0 ? t : e.nz * offset;
        const w = toWorld(lx, lz);
        const gy = this.terrain.heightAt(w.x, w.z);
        if (gy < this.terrain.waterLevel + 0.5) continue;

        const facingYaw = yaw + Math.atan2(e.nx, e.nz);
        const hMin = d.heightRange[0], hMax = d.heightRange[1];
        // Taller toward the district centre; noise keeps the skyline from being a dome.
        const centreT = clamp(1 - Math.hypot(w.x - d.center[0], w.z - d.center[1]) / (d.radius * 1.25), 0, 1);
        const noise = valueNoise2D(w.x * 0.006, w.z * 0.006, this.seed + 71);
        const height = lerp(hMin, hMax, clamp(centreT * 0.65 + noise * 0.55, 0, 1) * rng.range(0.7, 1.15));

        const bwLot = step * rng.range(0.72, 0.94);
        const bdLot = lotDepth * rng.range(0.62, 0.9);
        const kind = pickBuildingKind(d.style, bwLot * bdLot, rng, height);
        const facade = rng.pick(d.facade);

        // Does this lot get a shop front?
        let shopFront = null;
        if ((kind === 'shophouse' || kind === 'mall') && d.shopTypes.length) {
          const key = d.id;
          const used = shopQuota.get(key) || 0;
          if (used < 14 && rng.bool(0.72)) {
            const pick = rng.weighted(d.shopTypes, (o) => o.w);
            const st = getShopType(pick.type);
            if (st) {
              shopQuota.set(key, used + 1);
              const name = generateShopName(rng, pick.type);
              shopFront = { type: pick.type, name, signColor: st.signColor, neonColor: st.neonColor };
            }
          }
        }

        const spec = {
          kind, w: bwLot, d: bdLot, h: height, floors: Math.max(1, Math.round(height / 3.4)),
          palette: {
            wall: rng.pick(d.palette.wall), roof: rng.pick(d.palette.roof),
            accent: rng.pick(d.palette.accent), neon: rng.pick(d.palette.neon),
          },
          facade, seed: rng.int(1, 1e9), district: d.id, shopFront, lod: 0,
        };
        this._placeBuilding(spec, w.x, gy, w.z, facingYaw, rng, d, shopFront);
      }
    }
  }

  _placeBuilding(spec, x, y, z, yaw, rng, district, shopFront) {
    const ctx = this.ctx;
    let built;
    try { built = buildBuilding(spec, rng); }
    catch (err) { console.warn('[worldgen] building failed', spec.kind, err); return null; }
    const { group, colliders, lights } = built;
    group.position.set(x, y, z);
    group.rotation.y = yaw;
    group.updateMatrix();
    group.matrixAutoUpdate = false;
    group.updateMatrixWorld(true);
    this.group.add(group);

    // Flatten the pad the building sits on so it never floats or sinks.
    this.terrain.stampPad(x, z, spec.w * 0.5 + 1.0, spec.d * 0.5 + 1.0, yaw, y, SURF.CONCRETE, 2.0);

    const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
    for (const c of colliders) {
      const wx = x + c.x * cosY + c.z * sinY;
      const wz = z - c.x * sinY + c.z * cosY;
      ctx.physics.addBox(wx, y + c.y, wz, c.hw, c.hh, c.hd, yaw + (c.yaw || 0), {
        layer: LAYER.BUILDING, surface: SURFACE.CONCRETE, drivable: !!c.drivable,
      });
    }
    for (const l of lights) {
      const lx = x + l.x * cosY + l.z * sinY;
      const lz = z - l.x * sinY + l.z * cosY;
      this.lights.push({ x: lx, y: y + l.y, z: lz, color: l.color, intensity: l.intensity, distance: l.distance, kind: l.kind });
    }

    const record = { spec, x, y, z, yaw, group, district: district ? district.id : null };
    this.buildings.push(record);

    if (shopFront) {
      const st = getShopType(shopFront.type);
      // Door is on the +Z face of the building, pushed just outside the wall.
      const doorLocalZ = spec.d * 0.5 + 1.6;
      const dx = x + 0 * cosY + doorLocalZ * sinY;
      const dz = z - 0 * sinY + doorLocalZ * cosY;
      this.shops.push({
        id: `shop_${this.shops.length}`,
        type: shopFront.type, typeDef: st, name: shopFront.name,
        x: dx, y: this.terrain.heightAt(dx, dz), z: dz, yaw,
        building: record, district: district ? district.id : null,
        robbed: 0, robbedAt: -1e9, open: true,
      });
    }
    return record;
  }

  /** Open lots: car parks, courts, yards, vacant land. */
  _fillOpenLot(block, d, rng, bw, bd, inset) {
    const ctx = this.ctx;
    const roll = rng.float();
    const y = this.terrain.heightAt(block.cx, block.cz);
    if (roll < 0.42) {
      // parking lot — flatten, then mark slots for parked traffic
      this.terrain.stampPad(block.cx, block.cz, bw * 0.5, bd * 0.5, block.angle, y, SURF.CONCRETE, 3);
      const rows = Math.max(1, Math.floor(bd / 6));
      const cols = Math.max(1, Math.floor(bw / 3));
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (rng.float() > 0.55) continue;
          const lx = -bw / 2 + (c + 0.5) * (bw / cols);
          const lz = -bd / 2 + (r + 0.5) * (bd / rows);
          const cosY = Math.cos(block.angle), sinY = Math.sin(block.angle);
          this.parkedSlots.push({
            x: block.cx + lx * cosY + lz * sinY,
            z: block.cz - lx * sinY + lz * cosY,
            yaw: block.angle + (r % 2 ? Math.PI : 0),
          });
        }
      }
    } else if (roll < 0.66 && d.style !== 'industrial' && d.style !== 'docks') {
      // small green
      this.terrain.stampPad(block.cx, block.cz, bw * 0.5, bd * 0.5, block.angle, y, SURF.GRASS, 3);
    } else if (roll < 0.82) {
      // fenced yard with clutter
      const kinds = d.style === 'docks' || d.style === 'industrial'
        ? ['container', 'crate', 'barrel', 'pallet', 'tyreStack']
        : ['crate', 'bush', 'trashbag', 'cardboard'];
      const n = rng.int(3, 8);
      for (let i = 0; i < n; i++) {
        const lx = rng.range(-bw / 2 + 2, bw / 2 - 2);
        const lz = rng.range(-bd / 2 + 2, bd / 2 - 2);
        const cosY = Math.cos(block.angle), sinY = Math.sin(block.angle);
        const wx = block.cx + lx * cosY + lz * sinY;
        const wz = block.cz - lx * sinY + lz * cosY;
        this._spawnProp(rng.pick(kinds), wx, wz, rng.range(0, Math.PI * 2), rng, {});
      }
    }
  }

  // -------------------------------------------------------------------------
  _spawnProp(kind, x, z, yaw, rng, opts = {}) {
    const ctx = this.ctx;
    let prop;
    try { prop = makeProp(kind, opts, rng); }
    catch (err) { console.warn('[worldgen] prop failed', kind, err); return null; }
    const y = opts.y !== undefined ? opts.y : this.terrain.heightAt(x, z);
    prop.group.position.set(x, y, z);
    prop.group.rotation.y = yaw;
    prop.group.updateMatrix();
    prop.group.matrixAutoUpdate = false;
    prop.group.updateMatrixWorld(true);
    this.group.add(prop.group);

    const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
    for (const c of prop.colliders) {
      const wx = x + c.x * cosY + c.z * sinY;
      const wz = z - c.x * sinY + c.z * cosY;
      ctx.physics.addBox(wx, y + c.y, wz, c.hw, c.hh, c.hd, yaw + (c.yaw || 0), {
        layer: LAYER.PROP, surface: SURFACE.METAL, drivable: !!c.drivable,
        pitch: c.pitch || 0,
        breakable: prop.breakable,
      });
    }
    for (const l of prop.lights) {
      const lx = x + l.x * cosY + l.z * sinY;
      const lz = z - l.x * sinY + l.z * cosY;
      this.lights.push({ x: lx, y: y + l.y, z: lz, color: l.color, intensity: l.intensity, distance: l.distance, kind: l.kind });
    }
    if (kind === 'trafficLight') prop.group.userData.isTrafficLight = true;
    return prop;
  }

  async _placeProps(rng) {
    const ctx = this.ctx;
    const graph = this.roads;
    let count = 0;

    // --- along every road: lights, signs, palms, benches, bins ---
    for (const e of graph.edges) {
      const d = e.district || Districts.districtAt(e.a.x, e.a.z);
      if (!d) continue;
      const pr = d.props;
      const spacing = e.type === ROAD_TYPE.HIGHWAY ? 44 : e.type === ROAD_TYPE.ARTERIAL ? 30 : 38;
      const n = Math.floor(e.length / spacing);
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n;
        const side = i % 2 === 0 ? 1 : -1;
        const off = e.halfWidth + Math.max(1.2, e.sidewalkWidth * 0.55);
        const x = lerp(e.a.x, e.b.x, t) + e.nx * off * side;
        const z = lerp(e.a.z, e.b.z, t) + e.nz * off * side;
        if (this.terrain.heightAt(x, z) < this.terrain.waterLevel + 0.4) continue;
        const facing = e.angle + (side > 0 ? Math.PI / 2 : -Math.PI / 2);

        if (rng.bool(pr.streetlights * 0.8)) {
          this._spawnProp('streetlight', x, z, facing + Math.PI, rng, { y: this.terrain.heightAt(x, z) + 0.16 });
          count++;
        } else if (rng.bool(pr.palms * 0.55)) {
          this._spawnProp('palm', x, z, rng.range(0, 6.28), rng, { height: rng.range(6, 13) });
          count++;
        } else if (rng.bool(pr.trees * 0.5)) {
          this._spawnProp('tree', x, z, rng.range(0, 6.28), rng, { height: rng.range(5, 11) });
          count++;
        } else if (rng.bool(pr.benches * 0.25)) {
          this._spawnProp('bench', x, z, facing, rng, {});
          count++;
        } else if (rng.bool(pr.bins * 0.3)) {
          this._spawnProp('bin', x, z, rng.range(0, 6.28), rng, {});
          count++;
        } else if (rng.bool(pr.hydrants * 0.18)) {
          this._spawnProp('hydrant', x, z, rng.range(0, 6.28), rng, {});
          count++;
        } else if (rng.bool(pr.powerlines * 0.2)) {
          this._spawnProp('powerpole', x, z, facing, rng, { height: rng.range(8, 11) });
          count++;
        }

        if (count % 120 === 0) await yieldFrame();
      }

      // billboards on arterials and highways
      if (rng.bool((d.props.billboards || 0) * 0.22) && e.length > 50) {
        const side = rng.bool() ? 1 : -1;
        const off = e.halfWidth + e.sidewalkWidth + 4.5;
        const x = lerp(e.a.x, e.b.x, 0.5) + e.nx * off * side;
        const z = lerp(e.a.z, e.b.z, 0.5) + e.nz * off * side;
        if (this.terrain.heightAt(x, z) > this.terrain.waterLevel + 0.4) {
          this._spawnProp('billboard', x, z, e.angle + (side > 0 ? Math.PI / 2 : -Math.PI / 2), rng,
            { seed: rng.int(1, 9999) });
        }
      }
    }

    // --- traffic lights and stop signs at junctions ---
    for (const n of graph.nodes) {
      if (!n.isIntersection) continue;
      const r = n.radius + 1.4;
      if (n.light) {
        for (let i = 0; i < Math.min(n.edges.length, 4); i++) {
          const e = n.edges[i];
          const dir = e.a === n ? 1 : -1;
          const px = n.x + e.dx * dir * r + e.nx * r * 0.85;
          const pz = n.z + e.dz * dir * r + e.nz * r * 0.85;
          const prop = this._spawnProp('trafficLight', px, pz, Math.atan2(-e.dx * dir, -e.dz * dir), rng, { heads: 1 });
          if (prop) {
            prop.group.userData.light = n.light;
            prop.group.userData.edge = e;
            if (!n.lightMeshes) n.lightMeshes = [];
            n.lightMeshes.push(prop.group);
          }
        }
      } else if (n.edges.length >= 3 && rng.bool(0.35)) {
        const e = n.edges[0];
        const dir = e.a === n ? 1 : -1;
        this._spawnProp('signStop', n.x + e.dx * dir * r + e.nx * r, n.z + e.dz * dir * r + e.nz * r,
          Math.atan2(-e.dx * dir, -e.dz * dir), rng, {});
      }
    }
    await yieldFrame();

    // --- beach furniture ---
    const beachRng = rng.fork('beach');
    for (let i = 0; i < 240; i++) {
      const x = beachRng.range(970, 1130);
      const z = beachRng.range(-1200, 1200);
      const h = this.terrain.heightAt(x, z);
      if (h < this.terrain.waterLevel + 0.3 || h > 4) continue;
      const roll = beachRng.float();
      if (roll < 0.34) this._spawnProp('parasol', x, z, beachRng.range(0, 6.28), beachRng, { color: beachRng.pick([0xff5a6a, 0x22a0c0, 0xffc93c, 0xf0f0e8]) });
      else if (roll < 0.74) this._spawnProp('deckchair', x, z, beachRng.range(0, 6.28), beachRng, { color: beachRng.pick([0x22a0c0, 0xff8a4a, 0x4dff9e]) });
      else if (roll < 0.86) this._spawnProp('palm', x, z, beachRng.range(0, 6.28), beachRng, { height: beachRng.range(7, 12) });
      else if (roll < 0.94) this._spawnProp('bin', x, z, 0, beachRng, {});
      else this._spawnProp('lifeguard', x, z, Math.PI, beachRng, {});
    }
    // a pier out into the water
    for (let i = 0; i < 5; i++) {
      this._spawnProp('jetty', 1060 + i * 13, -180, Math.PI / 2, rng, { length: 14, width: 5, y: 1.4 });
    }
    await yieldFrame();

    // --- docks: containers, cranes ---
    const dockRng = rng.fork('docks');
    for (let i = 0; i < 90; i++) {
      const x = dockRng.range(470, 800);
      const z = dockRng.range(-1180, -860);
      const h = this.terrain.heightAt(x, z);
      if (h < this.terrain.waterLevel + 0.5) continue;
      if (this.terrain.isRoad(x, z)) continue;
      const roll = dockRng.float();
      if (roll < 0.6) {
        const stack = dockRng.int(1, 3);
        for (let s = 0; s < stack; s++) {
          this._spawnProp('container', x, z, dockRng.bool() ? 0 : Math.PI / 2, dockRng, {
            y: h + s * 2.6, color: dockRng.pick([0xc0562a, 0x2a6ac0, 0x2aa050, 0xc0a02a, 0x8a8a90]),
          });
        }
      } else if (roll < 0.72) this._spawnProp('crane', x, z, dockRng.range(0, 6.28), dockRng, { height: dockRng.range(16, 26) });
      else if (roll < 0.86) this._spawnProp('barrel', x, z, 0, dockRng, {});
      else this._spawnProp('forklift', x, z, dockRng.range(0, 6.28), dockRng, {});
    }
    await yieldFrame();

    // --- park furniture ---
    const parkRng = rng.fork('park');
    for (let i = 0; i < 200; i++) {
      const x = parkRng.range(-760, -400);
      const z = parkRng.range(340, 700);
      const h = this.terrain.heightAt(x, z);
      if (h < this.terrain.waterLevel + 0.5 || this.terrain.isRoad(x, z)) continue;
      const roll = parkRng.float();
      if (roll < 0.5) this._spawnProp('tree', x, z, parkRng.range(0, 6.28), parkRng, { height: parkRng.range(6, 12) });
      else if (roll < 0.7) this._spawnProp('bush', x, z, parkRng.range(0, 6.28), parkRng, {});
      else if (roll < 0.82) this._spawnProp('bench', x, z, parkRng.range(0, 6.28), parkRng, {});
      else if (roll < 0.88) this._spawnProp('playground', x, z, parkRng.range(0, 6.28), parkRng, {});
      else if (roll < 0.93) this._spawnProp('basketballHoop', x, z, parkRng.range(0, 6.28), parkRng, {});
      else this._spawnProp('fountain', x, z, 0, parkRng, {});
    }
    // a few landmarks
    this._spawnProp('watertower', -1080, -760, 0, rng, { legHeight: 9, radius: 3 });
    this._spawnProp('statue', 246, 160, 0, rng, {});
    this._spawnProp('flagpole', -420, -1060, 0, rng, {});
    await yieldFrame();
  }

  _finaliseShops() {
    // Shop markers double as interaction volumes and minimap blips.
    for (const s of this.shops) {
      s.marker = { x: s.x, y: s.y, z: s.z, radius: 3.2 };
      s.tillCash = 0;
      s.safeCash = 0;
    }
  }

  _buildStunts(rng) {
    for (const spot of STUNT_SPOTS) {
      try {
        const y = spot.y !== undefined ? spot.y : this.terrain.heightAt(spot.x, spot.z);
        const built = buildStuntSpot(THREE, spot, this.ctx.materials, rng, mergeGeometries);
        if (!built) continue;
        built.group.position.set(spot.x, y, spot.z);
        built.group.rotation.y = spot.yaw || 0;
        built.group.updateMatrix();
        built.group.matrixAutoUpdate = false;
        built.group.updateMatrixWorld(true);
        this.group.add(built.group);

        const cosY = Math.cos(spot.yaw || 0), sinY = Math.sin(spot.yaw || 0);
        for (const c of built.colliders) {
          const wx = spot.x + c.x * cosY + c.z * sinY;
          const wz = spot.z - c.x * sinY + c.z * cosY;
          this.ctx.physics.addBox(wx, y + c.y, wz, c.hw, c.hh, c.hd, (spot.yaw || 0) + (c.yaw || 0), {
            layer: LAYER.RAMP, surface: SURFACE.CONCRETE, drivable: true,
            pitch: c.pitch || 0, roll: c.roll || 0, friction: 0.98, restitution: 0.05,
          });
        }
        this.stuntSpots.push({ def: spot, x: spot.x, y, z: spot.z, group: built.group, best: 0 });
      } catch (err) {
        console.warn('[worldgen] stunt spot failed', spot.id, err);
      }
    }
  }

  _buildWater() {
    const size = (WORLD.maxX - WORLD.minX) * 1.4;
    const geo = new THREE.PlaneGeometry(size, size, 64, 64);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshPhysicalMaterial({
      color: 0x1c4a5e,
      roughness: 0.06,
      metalness: 0.0,
      transparent: true,
      opacity: 0.88,
      envMapIntensity: 2.0,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
    });
    try {
      const n = tex('water', { size: 512 });
      const nm = tex('waterNormal', { size: 512 });
      if (n) { n.wrapS = n.wrapT = THREE.RepeatWrapping; n.repeat.set(60, 60); mat.map = n; }
      if (nm) { nm.wrapS = nm.wrapT = THREE.RepeatWrapping; nm.repeat.set(80, 80); }
    } catch (e) { /* plain water is fine */ }
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(200, this.terrain.waterLevel, 0);
    mesh.receiveShadow = false;
    mesh.name = 'ocean';
    mesh.renderOrder = 1;
    this.water = mesh;
    this.waterMat = mat;
    this.group.add(mesh);
  }

  /** Animate the sea surface. */
  update(dt) {
    if (this.water) {
      const t = this.ctx.time.elapsed;
      const pos = this.water.geometry.attributes.position;
      // Cheap: shift UVs rather than vertices, plus a gentle bob.
      if (this.waterMat.map) {
        this.waterMat.map.offset.x = (t * 0.008) % 1;
        this.waterMat.map.offset.y = (t * 0.005) % 1;
      }
      this.water.position.y = this.terrain.waterLevel + Math.sin(t * 0.5) * 0.04;
      this.water.position.x = this.ctx.camera.position.x;
      this.water.position.z = this.ctx.camera.position.z;
    }
    if (this.roads) this.roads.update(dt);
  }

  /** Update traffic-light lens emissives near the camera. */
  updateTrafficLights(camX, camZ) {
    const graph = this.roads;
    if (!graph) return;
    for (const light of graph.lights) {
      const n = light.node;
      if (!n.lightMeshes) continue;
      const dx = n.x - camX, dz = n.z - camZ;
      if (dx * dx + dz * dz > 40000) continue;         // 200 m
      for (const g of n.lightMeshes) {
        const e = g.userData.edge;
        const state = light.stateFor(e);
        const lit = state === 'green' ? 2 : state === 'amber' ? 1 : 0;
        const lenses = g.userData.lenses;
        if (!lenses) continue;
        for (const m of lenses) {
          const on = m.userData.lamp === lit;
          const want = on ? 4.5 : 0.06;
          if (m.material.emissiveIntensity !== want) m.material.emissiveIntensity = want;
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  randomSpawn(rng, out) { return randomSidewalkPoint(this.roads, rng, out || {}); }

  /** A safe place to drop the player or a mission vehicle: on a road, above water. */
  safeRoadPoint(x, z, out = {}) {
    const near = this.roads.nearestEdge(x, z, 200);
    if (!near) { out.x = x; out.z = z; out.y = this.terrain.heightAt(x, z); out.yaw = 0; return out; }
    const e = near.edge;
    const t = clamp(near.t, 0.12, 0.88);
    const lane = e.laneOffsetVec(1, 0);
    out.x = lerp(e.a.x, e.b.x, t) + lane.x;
    out.z = lerp(e.a.z, e.b.z, t) + lane.z;
    out.y = this.terrain.heightAt(out.x, out.z);
    out.yaw = Math.atan2(e.dx, e.dz);
    out.edge = e;
    return out;
  }

  nearestShop(x, z, maxR = 6) {
    let best = null, bestD = maxR * maxR;
    for (const s of this.shops) {
      const d = (s.x - x) ** 2 + (s.z - z) ** 2;
      if (d < bestD) { bestD = d; best = s; }
    }
    return best;
  }

  dispose() {
    this.ctx.scene.remove(this.group);
    this.group.traverse((o) => { if (o.isMesh) o.geometry?.dispose?.(); });
  }
}

function yieldFrame() {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => resolve());
    else setTimeout(resolve, 0);
  });
}
