// pedestrians.js — streams pedestrians in and out around the player.
import * as THREE from 'three';
import { clamp } from '../core/mathx.js';
import { Ped, PED_STATE } from './ped.js';
import { randomSidewalkPoint } from '../world/roads.js';
import { districtAt } from '../content/districtCatalog.js';
import { PED_ARCHETYPES, getPed } from '../content/pedCatalog.js';

const _pt = { x: 0, z: 0, edge: null, t: 0, side: 1 };

export class PedestrianManager {
  constructor(ctx) {
    this.ctx = ctx;
    this.peds = [];
    this.corpses = [];
    this.rng = ctx.rng.fork('peds');
    this.spawnTimer = 0;
    this.budget = ctx.settings.preset.pedBudget;
    this.spawnRadius = { min: 24, max: 85 };
    this.despawnRadius = 130;
    this.enabled = true;
    this.panicRadius = 0;
    this.panicUntil = 0;
  }

  get count() { return this.peds.length; }

  update(dt) {
    if (!this.enabled) return;
    const ctx = this.ctx;
    const player = ctx.player;
    if (!player) return;
    const px = player.position.x, pz = player.position.z;

    for (let i = this.peds.length - 1; i >= 0; i--) {
      const p = this.peds[i];
      const dx = p.body.position.x - px, dz = p.body.position.z - pz;
      const dist2 = dx * dx + dz * dz;

      if (p.dead) {
        p.update(dt);
        // Bodies linger, then fade out.
        if (p.despawnTimer > 26 || dist2 > 190 * 190) {
          p.dispose();
          this.peds.splice(i, 1);
        }
        continue;
      }
      if (dist2 > this.despawnRadius * this.despawnRadius) {
        p.dispose();
        this.peds.splice(i, 1);
        continue;
      }
      // Cull updates for peds behind the camera and far away. Occupants of a
      // vehicle stay hidden regardless — they are represented by the car.
      p.setVisible(!p.inVehicle && dist2 < 160 * 160);
      p.update(dt);
    }

    this.budget = ctx.settings.preset.pedBudget;
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.peds.length < this.budget) {
      this.spawnTimer = 0.12;
      this._trySpawn(px, pz);
    }
  }

  _trySpawn(px, pz) {
    const ctx = this.ctx;
    const rng = this.rng;
    const hour = ctx.time.hour;
    for (let attempt = 0; attempt < 5; attempt++) {
      const a = rng.range(0, Math.PI * 2);
      const r = rng.range(this.spawnRadius.min, this.spawnRadius.max);
      const sx = px + Math.cos(a) * r;
      const sz = pz + Math.sin(a) * r;
      const near = ctx.world.roads.nearestEdge(sx, sz, 40);
      if (!near || near.edge.sidewalkWidth < 1) continue;
      const e = near.edge;
      const d = e.district || districtAt(e.a.x, e.a.z);
      if (!d) continue;

      // Fewer people about at night, more at lunchtime.
      let density = d.pedDensity;
      if (hour < 6 || hour > 23) density *= 0.28;
      else if (hour < 8) density *= 0.6;
      else if (hour > 20) density *= 0.7;
      if (rng.float() > density) continue;

      const side = rng.bool() ? 1 : -1;
      const t = clamp(near.t + rng.range(-0.15, 0.15), 0.05, 0.95);
      const off = e.halfWidth + Math.max(1.2, e.sidewalkWidth * rng.range(0.3, 0.8));
      const x = e.a.x + (e.b.x - e.a.x) * t + e.nx * off * side;
      const z = e.a.z + (e.b.z - e.a.z) * t + e.nz * off * side;
      const camD = Math.hypot(x - ctx.camera.position.x, z - ctx.camera.position.z);
      if (camD < 14) continue;
      if (this._occupied(x, z, 1.4)) continue;

      const id = this._pickArchetype(d, hour, rng);
      const y = ctx.physics.groundHeight(x, z);
      const yaw = Math.atan2(e.dx, e.dz) * (rng.bool() ? 1 : -1);
      const ped = new Ped(ctx, id, { rng, x, y, z, yaw, edge: e, side, t });
      ped.edgeDir = rng.bool() ? 1 : -1;
      this.peds.push(ped);
      return ped;
    }
    return null;
  }

  _pickArchetype(district, hour, rng) {
    const mix = district.pedMix;
    for (let i = 0; i < 8; i++) {
      const pick = rng.weighted(mix, (o) => o.w);
      const def = getPed(pick.id);
      if (!def) continue;
      // Respect each archetype's spawn window (which may wrap past midnight).
      const [h0, h1] = def.hours || [0, 24];
      const ok = h0 <= h1 ? (hour >= h0 && hour <= h1) : (hour >= h0 || hour <= h1);
      if (ok) return pick.id;
    }
    return mix.length ? mix[0].id : PED_ARCHETYPES[0].id;
  }

  _occupied(x, z, r) {
    const r2 = r * r;
    for (const p of this.peds) {
      const dx = p.body.position.x - x, dz = p.body.position.z - z;
      if (dx * dx + dz * dz < r2) return true;
    }
    return false;
  }

  /** Everyone within radius drops what they're doing and runs. */
  panic(x, z, radius, threat, intensity = 1) {
    const r2 = radius * radius;
    for (const p of this.peds) {
      if (p.dead) continue;
      const dx = p.body.position.x - x, dz = p.body.position.z - z;
      const d2 = dx * dx + dz * dz;
      if (d2 > r2) continue;
      const falloff = 1 - Math.sqrt(d2) / radius;
      p.fear = Math.min(1.7, p.fear + intensity * falloff * 1.4);
      if (threat) p.threat = threat;
      if (p.fear > 0.5) {
        if (p.stats.bravery > 0.72 && (p.armed || p.isCop)) p._setState(PED_STATE.COMBAT);
        else p._setState(p.fear > 1.1 ? PED_STATE.PANIC : PED_STATE.FLEE);
      }
    }
  }

  /** Peds near an explosion or a car get physically thrown. */
  shockwave(x, y, z, radius, force, source) {
    for (const p of this.peds) {
      const dx = p.body.position.x - x, dz = p.body.position.z - z;
      const dy = p.body.position.y - y;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d > radius) continue;
      const k = (1 - d / radius) * force;
      const inv = 1 / Math.max(d, 0.4);
      p.shove(dx * inv * k, Math.abs(dy) * inv * k + k * 0.6, dz * inv * k);
    }
  }

  nearest(x, z, maxR = 20, filter) {
    let best = null, bestD = maxR * maxR;
    for (const p of this.peds) {
      if (p.dead || (filter && !filter(p))) continue;
      const dx = p.body.position.x - x, dz = p.body.position.z - z;
      const d = dx * dx + dz * dz;
      if (d < bestD) { bestD = d; best = p; }
    }
    return best;
  }

  /** Spawn a specific ped (mission targets, shop clerks, cops). */
  spawn(archetypeId, x, z, yaw, opts = {}) {
    const ctx = this.ctx;
    const y = opts.y ?? ctx.physics.groundHeight(x, z);
    const ped = new Ped(ctx, archetypeId, { rng: this.rng, x, y, z, yaw: yaw || 0, ...opts });
    this.peds.push(ped);
    return ped;
  }

  inRadius(x, z, r, out) {
    out.length = 0;
    const r2 = r * r;
    for (const p of this.peds) {
      const dx = p.body.position.x - x, dz = p.body.position.z - z;
      if (dx * dx + dz * dz <= r2) out.push(p);
    }
    return out;
  }

  clear() {
    for (const p of this.peds) p.dispose();
    this.peds.length = 0;
  }
}
