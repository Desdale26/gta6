// lighting.js — streams the city's thousands of light descriptors into a small pool of
// real PointLights around the camera, and drives the emissive glow of everything else.
import * as THREE from 'three';
import { clamp, SpatialHash } from '../core/mathx.js';

const MAX_POOL = 30;

export class LightManager {
  constructor(ctx) {
    this.ctx = ctx;
    this.descriptors = [];
    this.hash = new SpatialHash(40);
    this.pool = [];
    this.active = new Map();      // descriptor -> light
    this.free = [];
    this.radius = 85;
    this.nightFactor = 0;
    this._query = [];
    this._timer = 0;
    this.enabled = true;
    this.budget = 0;
  }

  /** Register the light descriptors produced by world generation. */
  setDescriptors(list) {
    this.descriptors = list;
    this.hash.clear();
    for (const d of list) this.hash.insertPoint(d, d.x, d.z);
  }

  _ensurePool(n) {
    while (this.pool.length < n) {
      const l = new THREE.PointLight(0xffffff, 0, 30, 1.8);
      l.castShadow = false;
      l.visible = false;
      this.ctx.scene.add(l);
      this.pool.push(l);
      this.free.push(l);
    }
  }

  update(dt, nightFactor) {
    if (!this.enabled) return;
    this.nightFactor = nightFactor;
    this._timer -= dt;
    if (this._timer > 0) {
      // Between refreshes just fade intensities with the time of day.
      for (const [d, l] of this.active) l.intensity = this._intensityFor(d);
      return;
    }
    this._timer = 0.25;

    const preset = this.ctx.settings.preset;
    const want = nightFactor > 0.12
      ? clamp(Math.round(MAX_POOL * (preset.pixelRatio >= 1 ? 1 : 0.6)), 6, MAX_POOL)
      : 4;
    this.budget = want;
    this._ensurePool(want);

    const cam = this.ctx.camera.position;
    const list = this.hash.queryRadius(cam.x, cam.z, this.radius, this._query);

    // Rank by "is it on" times "how close", then keep the best `want`.
    const scored = [];
    for (let i = 0; i < list.length; i++) {
      const d = list[i];
      const inten = this._intensityFor(d);
      if (inten <= 0.02) continue;
      const dx = d.x - cam.x, dy = d.y - cam.y, dz = d.z - cam.z;
      const dist2 = dx * dx + dy * dy + dz * dz;
      if (dist2 > this.radius * this.radius) continue;
      scored.push({ d, score: inten * 400 / (dist2 + 25) });
    }
    scored.sort((a, b) => b.score - a.score);
    const keep = new Set();
    for (let i = 0; i < Math.min(want, scored.length); i++) keep.add(scored[i].d);

    // release lights that dropped out
    for (const [d, l] of [...this.active]) {
      if (keep.has(d)) continue;
      l.visible = false;
      l.intensity = 0;
      this.active.delete(d);
      this.free.push(l);
    }
    // assign lights to newly relevant descriptors
    for (const d of keep) {
      if (this.active.has(d)) continue;
      const l = this.free.pop();
      if (!l) break;
      l.position.set(d.x, d.y, d.z);
      l.color.setHex(d.color);
      l.distance = d.distance || 26;
      l.decay = 1.9;
      l.intensity = this._intensityFor(d);
      l.visible = true;
      this.active.set(d, l);
    }
  }

  _intensityFor(d) {
    const n = this.nightFactor;
    switch (d.kind) {
      case 'street': return d.intensity * n;
      case 'neon': case 'sign': return d.intensity * (0.18 + n * 0.82);
      case 'window': return d.intensity * n * 0.8;
      case 'beacon': return d.intensity * (0.4 + n * 0.6);
      default: return d.intensity * n;
    }
  }

  get activeCount() { return this.active.size; }

  dispose() {
    for (const l of this.pool) this.ctx.scene.remove(l);
    this.pool.length = 0;
    this.free.length = 0;
    this.active.clear();
  }
}
