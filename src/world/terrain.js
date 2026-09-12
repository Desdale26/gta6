// terrain.js — the heightfield the whole city sits on.
//
// Height and surface type are baked into coarse grids at generation time so that runtime
// queries (every wheel, every footstep, every raycast) are two array lookups and a lerp.
// Roads are rasterised into the same grid, which is what makes them genuinely flat and
// drivable rather than merely painted on.
import * as THREE from 'three';
import { clamp, lerp, smoothstep } from '../core/mathx.js';
import { fbm2D, ridged2D, valueNoise2D } from '../core/rng.js';
import { SURFACE } from '../physics/world.js';

export const WORLD = {
  minX: -1600, maxX: 1600, minZ: -1600, maxZ: 1600,
  cell: 4,                 // metres per height-grid cell
  shoreX: 1120,            // east of this the land drops into the ocean
  waterLevel: 0,
};

const SURF_CODE = [SURFACE.CONCRETE, SURFACE.ROAD, SURFACE.SAND, SURFACE.GRASS, SURFACE.DIRT, SURFACE.WATER, SURFACE.WOOD, SURFACE.METAL];
export const SURF = { CONCRETE: 0, ROAD: 1, SAND: 2, GRASS: 3, DIRT: 4, WATER: 5, WOOD: 6, METAL: 7 };

export class Terrain {
  constructor(ctx, districts) {
    this.ctx = ctx;
    this.districts = districts;
    this.cell = WORLD.cell;
    this.minX = WORLD.minX; this.minZ = WORLD.minZ;
    this.nx = Math.floor((WORLD.maxX - WORLD.minX) / this.cell) + 1;
    this.nz = Math.floor((WORLD.maxZ - WORLD.minZ) / this.cell) + 1;
    this.height = new Float32Array(this.nx * this.nz);
    this.surface = new Uint8Array(this.nx * this.nz);
    this.roadMask = new Uint8Array(this.nx * this.nz);   // 0..255 road-ness for blending
    this.waterLevel = WORLD.waterLevel;
    this.maxHeight = 0;
    this.seed = 1;
    this.meshes = [];
    this._n = { x: 0, y: 1, z: 0 };
  }

  // ---------------------------------------------------------------------
  // Generation
  // ---------------------------------------------------------------------
  /** Base natural elevation before roads flatten anything. */
  baseHeight(x, z) {
    const s = this.seed;
    // Ocean shelf to the east.
    const shore = WORLD.shoreX + fbm2D(x * 0.0016, z * 0.0016, { octaves: 3, seed: s + 91 }) * 120;
    const seaT = smoothstep(shore - 130, shore + 210, x);
    const seaDepth = -2.5 - 26 * seaT * seaT;

    // Land: gentle rolling ground, rising to hills in the west/north-west.
    const rolling = fbm2D(x * 0.00085, z * 0.00085, { octaves: 4, seed: s }) * 7.5;
    const hillMask = smoothstep(-400, -1250, x) * smoothstep(400, -300, z * 0.4);
    const hills = ridged2D(x * 0.0012, z * 0.0012, { octaves: 4, seed: s + 17 }) * 62 * hillMask;
    const detail = fbm2D(x * 0.0065, z * 0.0065, { octaves: 3, seed: s + 33 }) * 1.15;

    // District elevation preference, smoothly blended.
    let distElev = 3;
    if (this.districts && this.districts.districtAt) {
      const d = this.districts.districtAt(x, z);
      if (d) distElev = d.elevation ?? 3;
    }

    let land = distElev * 0.62 + rolling + hills + detail;

    // Beach: flatten and slope into the water near the shoreline.
    const beachT = smoothstep(shore - 190, shore + 20, x);
    land = lerp(land, 1.35, beachT * 0.9);

    // The canal cuts north–south through the middle of the map.
    const canalX = -140 + Math.sin(z * 0.0022) * 95 + fbm2D(z * 0.002, 3.3, { octaves: 2, seed: s + 5 }) * 60;
    const canalD = Math.abs(x - canalX);
    const canalMask = 1 - smoothstep(18, 54, canalD);
    if (canalMask > 0 && z > -1250 && z < 1250) {
      const fade = smoothstep(-1250, -1150, z) * (1 - smoothstep(1150, 1250, z));
      land = lerp(land, -4.2, canalMask * fade);
    }

    return seaT > 0.02 ? lerp(land, seaDepth, smoothstep(0.0, 0.75, seaT)) : land;
  }

  /** Which natural surface covers a spot before roads are painted on. */
  baseSurface(x, z, h) {
    if (h < this.waterLevel - 0.05) return SURF.WATER;
    const s = this.seed;
    const shore = WORLD.shoreX + fbm2D(x * 0.0016, z * 0.0016, { octaves: 3, seed: s + 91 }) * 120;
    if (x > shore - 165) return SURF.SAND;
    const d = this.districts && this.districts.districtAt ? this.districts.districtAt(x, z) : null;
    const style = d ? d.style : 'suburb';
    if (style === 'park') return SURF.GRASS;
    if (style === 'beach' || style === 'marina') return valueNoise2D(x * 0.02, z * 0.02, s) > 0.55 ? SURF.SAND : SURF.CONCRETE;
    if (style === 'hills') return valueNoise2D(x * 0.012, z * 0.012, s + 7) > 0.42 ? SURF.GRASS : SURF.DIRT;
    if (style === 'trailer' || style === 'swamp') return SURF.DIRT;
    if (style === 'suburb') return valueNoise2D(x * 0.018, z * 0.018, s + 3) > 0.55 ? SURF.GRASS : SURF.CONCRETE;
    return SURF.CONCRETE;
  }

  generate(seed) {
    this.seed = seed >>> 0;
    const { nx, nz, cell, minX, minZ } = this;
    let maxH = -Infinity;
    for (let j = 0; j < nz; j++) {
      const z = minZ + j * cell;
      const row = j * nx;
      for (let i = 0; i < nx; i++) {
        const x = minX + i * cell;
        const h = this.baseHeight(x, z);
        this.height[row + i] = h;
        this.surface[row + i] = this.baseSurface(x, z, h);
        if (h > maxH) maxH = h;
      }
    }
    this.maxHeight = maxH + 2;
  }

  idx(i, j) { return j * this.nx + i; }
  inBounds(i, j) { return i >= 0 && j >= 0 && i < this.nx && j < this.nz; }

  /**
   * Stamp a flat road corridor into the grid between two points. Called by the road
   * builder before any geometry exists, so the ground itself becomes the driving surface.
   */
  stampRoad(x0, z0, y0, x1, z1, y1, halfWidth, surfCode = SURF.ROAD, shoulder = 2.2) {
    const cell = this.cell;
    const pad = halfWidth + shoulder + cell;
    const minI = Math.max(0, Math.floor((Math.min(x0, x1) - pad - this.minX) / cell));
    const maxI = Math.min(this.nx - 1, Math.ceil((Math.max(x0, x1) + pad - this.minX) / cell));
    const minJ = Math.max(0, Math.floor((Math.min(z0, z1) - pad - this.minZ) / cell));
    const maxJ = Math.min(this.nz - 1, Math.ceil((Math.max(z0, z1) + pad - this.minZ) / cell));
    const dx = x1 - x0, dz = z1 - z0;
    const len2 = dx * dx + dz * dz || 1e-6;
    for (let j = minJ; j <= maxJ; j++) {
      const z = this.minZ + j * cell;
      for (let i = minI; i <= maxI; i++) {
        const x = this.minX + i * cell;
        let t = ((x - x0) * dx + (z - z0) * dz) / len2;
        t = clamp(t, 0, 1);
        const cx = x0 + dx * t, cz = z0 + dz * t;
        const d = Math.hypot(x - cx, z - cz);
        if (d > pad) continue;
        const k = this.idx(i, j);
        const target = lerp(y0, y1, t);
        if (d <= halfWidth) {
          this.height[k] = target;
          this.surface[k] = surfCode;
          this.roadMask[k] = 255;
        } else {
          // Blend the verge so kerbs and grass meet the road cleanly.
          const w = 1 - smoothstep(halfWidth, halfWidth + shoulder, d);
          this.height[k] = lerp(this.height[k], target, w);
          if (w > 0.5 && this.surface[k] !== SURF.ROAD) this.surface[k] = SURF.CONCRETE;
          this.roadMask[k] = Math.max(this.roadMask[k], Math.round(w * 200));
        }
      }
    }
  }

  /** Flatten a rectangular pad (building plot, car park, plaza). */
  stampPad(cx, cz, hw, hd, yaw, y, surfCode = SURF.CONCRETE, blend = 2.5) {
    const cell = this.cell;
    const r = Math.hypot(hw, hd) + blend + cell;
    const minI = Math.max(0, Math.floor((cx - r - this.minX) / cell));
    const maxI = Math.min(this.nx - 1, Math.ceil((cx + r - this.minX) / cell));
    const minJ = Math.max(0, Math.floor((cz - r - this.minZ) / cell));
    const maxJ = Math.min(this.nz - 1, Math.ceil((cz + r - this.minZ) / cell));
    const c = Math.cos(-yaw), s = Math.sin(-yaw);
    for (let j = minJ; j <= maxJ; j++) {
      const z = this.minZ + j * cell;
      for (let i = minI; i <= maxI; i++) {
        const x = this.minX + i * cell;
        const dx = x - cx, dz = z - cz;
        const lx = dx * c - dz * s, lz = dx * s + dz * c;
        const ox = Math.abs(lx) - hw, oz = Math.abs(lz) - hd;
        const outside = Math.hypot(Math.max(ox, 0), Math.max(oz, 0));
        if (outside > blend) continue;
        const k = this.idx(i, j);
        const w = 1 - smoothstep(0, blend, outside);
        this.height[k] = lerp(this.height[k], y, w);
        if (w > 0.75 && this.surface[k] !== SURF.ROAD) this.surface[k] = surfCode;
      }
    }
  }

  /** Raise the grid's maxHeight cache after all stamping. */
  finalize() {
    let maxH = -Infinity;
    for (let i = 0; i < this.height.length; i++) if (this.height[i] > maxH) maxH = this.height[i];
    this.maxHeight = maxH + 2;
  }

  // ---------------------------------------------------------------------
  // Runtime queries
  // ---------------------------------------------------------------------
  heightAt(x, z) {
    const fx = (x - this.minX) / this.cell;
    const fz = (z - this.minZ) / this.cell;
    let i = Math.floor(fx), j = Math.floor(fz);
    if (i < 0) i = 0; else if (i > this.nx - 2) i = this.nx - 2;
    if (j < 0) j = 0; else if (j > this.nz - 2) j = this.nz - 2;
    const tx = clamp(fx - i, 0, 1), tz = clamp(fz - j, 0, 1);
    const k = j * this.nx + i;
    const h00 = this.height[k], h10 = this.height[k + 1];
    const h01 = this.height[k + this.nx], h11 = this.height[k + this.nx + 1];
    return (h00 * (1 - tx) + h10 * tx) * (1 - tz) + (h01 * (1 - tx) + h11 * tx) * tz;
  }

  normalAt(x, z, out) {
    const e = this.cell;
    const hL = this.heightAt(x - e, z), hR = this.heightAt(x + e, z);
    const hD = this.heightAt(x, z - e), hU = this.heightAt(x, z + e);
    out.x = (hL - hR); out.y = 2 * e; out.z = (hD - hU);
    const l = Math.hypot(out.x, out.y, out.z) || 1;
    out.x /= l; out.y /= l; out.z /= l;
    return out;
  }

  surfaceCodeAt(x, z) {
    let i = Math.round((x - this.minX) / this.cell);
    let j = Math.round((z - this.minZ) / this.cell);
    i = clamp(i, 0, this.nx - 1); j = clamp(j, 0, this.nz - 1);
    return this.surface[j * this.nx + i];
  }
  surfaceAt(x, z) {
    const h = this.heightAt(x, z);
    if (h < this.waterLevel - 0.08) return SURFACE.WATER;
    return SURF_CODE[this.surfaceCodeAt(x, z)] || SURFACE.CONCRETE;
  }
  isRoad(x, z) { return this.surfaceCodeAt(x, z) === SURF.ROAD; }
  isWater(x, z) { return this.heightAt(x, z) < this.waterLevel - 0.08; }
  slopeAt(x, z) { this.normalAt(x, z, this._n); return Math.acos(clamp(this._n.y, -1, 1)); }

  // ---------------------------------------------------------------------
  // Mesh
  // ---------------------------------------------------------------------
  /**
   * Build the visible ground as a grid of chunk meshes with per-vertex colour blending
   * between road, kerb, sand and grass. Vertex colours keep the draw-call count low while
   * still giving the ground real material variety.
   */
  buildMesh(materials, chunkSize = 200, resolution = 4) {
    const group = new THREE.Group();
    group.name = 'terrain';
    const cx = Math.ceil((WORLD.maxX - WORLD.minX) / chunkSize);
    const cz = Math.ceil((WORLD.maxZ - WORLD.minZ) / chunkSize);
    const seg = Math.max(2, Math.round(chunkSize / resolution));
    const mat = materials.ground;
    const color = new THREE.Color();

    for (let czi = 0; czi < cz; czi++) {
      for (let cxi = 0; cxi < cx; cxi++) {
        const ox = WORLD.minX + cxi * chunkSize;
        const oz = WORLD.minZ + czi * chunkSize;
        const geo = new THREE.PlaneGeometry(chunkSize, chunkSize, seg, seg);
        geo.rotateX(-Math.PI / 2);
        const pos = geo.attributes.position;
        const colors = new Float32Array(pos.count * 3);
        let minY = Infinity, maxY = -Infinity;
        for (let v = 0; v < pos.count; v++) {
          const x = pos.getX(v) + ox + chunkSize * 0.5;
          const z = pos.getZ(v) + oz + chunkSize * 0.5;
          const h = this.heightAt(x, z);
          pos.setY(v, h);
          if (h < minY) minY = h;
          if (h > maxY) maxY = h;
          this._vertexColor(x, z, h, color);
          colors[v * 3] = color.r; colors[v * 3 + 1] = color.g; colors[v * 3 + 2] = color.b;
        }
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geo.computeVertexNormals();
        // UVs tile in world space so neighbouring chunks line up.
        const uv = geo.attributes.uv;
        for (let v = 0; v < uv.count; v++) {
          const x = pos.getX(v) + ox + chunkSize * 0.5;
          const z = pos.getZ(v) + oz + chunkSize * 0.5;
          uv.setXY(v, x / 8, z / 8);
        }
        geo.translate(ox + chunkSize * 0.5, 0, oz + chunkSize * 0.5);
        geo.computeBoundingSphere();
        const mesh = new THREE.Mesh(geo, mat);
        mesh.receiveShadow = true;
        mesh.castShadow = false;
        mesh.matrixAutoUpdate = false;
        mesh.updateMatrix();
        mesh.userData.chunk = { cxi, czi };
        group.add(mesh);
        this.meshes.push(mesh);
      }
    }
    return group;
  }

  _vertexColor(x, z, h, out) {
    const s = this.surfaceCodeAt(x, z);
    const n = valueNoise2D(x * 0.11, z * 0.11, this.seed + 41);
    switch (s) {
      case SURF.ROAD: out.setRGB(0.20 + n * 0.05, 0.20 + n * 0.05, 0.215 + n * 0.05); break;
      case SURF.SAND: out.setRGB(0.80 + n * 0.10, 0.71 + n * 0.09, 0.52 + n * 0.08); break;
      case SURF.GRASS: out.setRGB(0.20 + n * 0.10, 0.36 + n * 0.13, 0.15 + n * 0.07); break;
      case SURF.DIRT: out.setRGB(0.40 + n * 0.10, 0.31 + n * 0.08, 0.21 + n * 0.06); break;
      case SURF.WATER: out.setRGB(0.06, 0.15, 0.20); break;
      default: out.setRGB(0.44 + n * 0.08, 0.43 + n * 0.08, 0.44 + n * 0.08); break;
    }
    // darken below the waterline so the sea bed reads as wet
    if (h < this.waterLevel) out.multiplyScalar(clamp(0.45 + (h - this.waterLevel) * 0.02 + 0.4, 0.25, 1));
  }
}
