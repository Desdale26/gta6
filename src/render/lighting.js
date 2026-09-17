// lighting.js — owns every dynamic light in the game.
//
// Not "manages": OWNS. Nothing else may add a light to the scene, remove one, or
// hide one, and the reason is the single largest cause of stutter this game had.
//
// three.js compiles a separate shader program per material per *lighting shape*.
// The number of visible point lights and the number of visible spot lights are
// both part of the program cache key (three.module.js r180, line 7097 builds
// `numPointLights: lights.point.length` and line 7229 pushes it into the key),
// and a material whose key changes is recompiled from source, linked, and
// uploaded — a stall of several frames, on the main thread, mid-play.
//
// The old code changed those counts constantly. This pool toggled `visible` on
// up to thirty point lights as the camera moved, every quarter second. Every car
// the player got into attached two spot lights and every one they left detached
// them; every police unit that spawned did the same; every explosion added a
// point light to the scene and removed it 450 ms later. Measured on the shipped
// build, a minute of ordinary play — walk, nightfall, drive, back to midday —
// compiled 176 shader programs after boot, and was still compiling at the end.
// The game spent that minute glitching, which is exactly what it was reported as.
//
// So: the pools are built once, at construction, every light in them is added to
// the scene exactly once and left `visible` forever, and the counts never change
// again for the life of the session. A light that is not being used sits at
// intensity 0 — which costs a little arithmetic per fragment and nothing at all
// in compiles. Borrowers set position, colour and intensity, which are uniform
// writes and free.
//
// The pools are small on purpose. Every visible light, lit or not, is evaluated
// by every fragment of every lit material, so the cost is (pool size) x (pixels)
// whatever the time of day. Eight points and four spots is a city at night that
// reads correctly; thirty was a bill nobody was getting value from.
import * as THREE from 'three';
import { SpatialHash } from '../core/mathx.js';

// Fixed for the life of the session. Changing either of these at runtime would
// reintroduce the recompile storm this file exists to prevent, so they are not
// settings and not per-preset — but they ARE chosen once, at construction, before
// a single material has compiled, and that is safe for exactly the same reason
// the material type is: nothing has been built against them yet.
//
// The minimal mode takes the smaller pair. Every visible light, lit or not, is
// evaluated by every fragment of every lit material, so the pool is a per-pixel
// bill paid at all hours; an agent measuring this directly found it the largest
// remaining per-fragment lever once the PBR specular was gone. Four points and two
// spots still lights a night street — three street lights plus the reserved flash
// slot, and one car's pair of headlights, which is the player's own.
const POINT_POOL = 8;
const SPOT_POOL = 4;
const POINT_POOL_MIN = 4;
const SPOT_POOL_MIN = 2;

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
    // A flash (an explosion, a muzzle at night) takes the last point slot and
    // holds it for its lifetime, so it never competes with the street lights for
    // one and never has to create a light of its own.
    this._flash = { until: 0, intensity: 0, decay: 1 };
    this.spots = [];
    this._buildPools();
  }

  _buildPools() {
    const scene = this.ctx.scene;
    const minimal = !!this.ctx.settings?.minimal;
    const points = minimal ? POINT_POOL_MIN : POINT_POOL;
    const spots = minimal ? SPOT_POOL_MIN : SPOT_POOL;
    for (let i = 0; i < points; i++) {
      const l = new THREE.PointLight(0xffffff, 0, 30, 1.8);
      l.castShadow = false;
      l.visible = true;                     // never toggled — see the header
      l.position.set(0, -500, 0);
      scene.add(l);
      this.pool.push(l);
      if (i < points - 1) this.free.push(l);
    }
    // The last point slot belongs to flashes and is never handed to a street light.
    this.flashLight = this.pool[points - 1];

    for (let i = 0; i < spots; i++) {
      const s = new THREE.SpotLight(0xfff0d0, 0, 62, 0.60, 0.45, 1.4);
      s.castShadow = false;
      s.visible = true;                     // never toggled — see the header
      s.position.set(0, -500, 0);
      s.target.position.set(0, -520, 0);
      scene.add(s);
      scene.add(s.target);
      this.spots.push({ light: s, owner: null });
    }
  }

  /**
   * Borrow a spot light. The borrower positions it in WORLD space every frame
   * and sets its intensity; it must call releaseSpot when it is done, but
   * forgetting to is survivable — a released-by-death owner is reclaimed by
   * priority in acquireSpot.
   *
   * @param owner any object, used as the identity of the borrower
   * @param priority higher wins a slot off a lower-priority holder
   * @returns {THREE.SpotLight|null}
   */
  acquireSpots(owner, n = 1, priority = 0) {
    const held = this.spots.filter((s) => s.owner === owner);
    if (held.length >= n) return held.slice(0, n).map((s) => s.light);
    const out = held.map((s) => s.light);
    for (const s of this.spots) {
      if (out.length >= n) break;
      if (!s.owner) { s.owner = owner; s.priority = priority; out.push(s.light); }
    }
    // Everything is taken: evict the lowest-priority holder, but only for a
    // borrower that outranks it. Headlights on the player's own car matter more
    // than headlights on the fourth police car in the queue.
    while (out.length < n) {
      let worst = null;
      for (const s of this.spots) {
        if (s.owner === owner) continue;
        if (!worst || (s.priority ?? 0) < (worst.priority ?? 0)) worst = s;
      }
      if (!worst || (worst.priority ?? 0) >= priority) break;
      if (worst.owner && worst.owner.onSpotLightLost) worst.owner.onSpotLightLost();
      worst.light.intensity = 0;
      worst.owner = owner;
      worst.priority = priority;
      out.push(worst.light);
    }
    return out;
  }

  releaseSpot(owner) {
    for (const s of this.spots) {
      if (s.owner !== owner) continue;
      s.owner = null;
      s.priority = 0;
      s.light.intensity = 0;
      s.light.position.set(0, -500, 0);
      s.light.target.position.set(0, -520, 0);
    }
  }

  /**
   * A brief burst of light at a world point — a blast, a flash. Uses the
   * reserved point slot rather than creating a light, because creating one and
   * throwing it away costs two full shader recompiles of the entire scene.
   */
  flash(x, y, z, color, intensity, seconds, distance) {
    const l = this.flashLight;
    // Don't let a small pop stamp on a big one that is still burning.
    if (this.ctx.time.elapsed < this._flash.until && intensity < this._flash.intensity) return;
    l.position.set(x, y, z);
    l.color.setHex(color);
    l.distance = distance || 40;
    l.intensity = intensity;
    this._flash.until = this.ctx.time.elapsed + seconds;
    this._flash.intensity = intensity;
    this._flash.decay = intensity / Math.max(seconds, 0.01);
  }

  /** Register the light descriptors produced by world generation. */
  setDescriptors(list) {
    this.descriptors = list;
    this.hash.clear();
    for (const d of list) this.hash.insertPoint(d, d.x, d.z);
  }

  update(dt, nightFactor) {
    // The flash burns down on real time whatever else is going on, including
    // while the street-light refresh is between ticks.
    if (this.flashLight.intensity > 0) {
      this.flashLight.intensity = Math.max(0, this.flashLight.intensity - this._flash.decay * dt);
      if (this.flashLight.intensity <= 0) { this._flash.until = 0; this._flash.intensity = 0; }
    }
    if (!this.enabled) return;
    this.nightFactor = nightFactor;
    this._timer -= dt;
    if (this._timer > 0) {
      // Between refreshes just fade intensities with the time of day.
      for (const [d, l] of this.active) l.intensity = this._intensityFor(d);
      return;
    }
    this._timer = 0.25;

    // How many of the fixed pool are worth lighting. This decides brightness,
    // not the shader: the lights are all in the scene either way, so changing it
    // — even between quality presets — costs nothing and recompiles nothing.
    const usable = this.pool.length - 1;
    const want = nightFactor > 0.12 ? usable : Math.min(3, usable);
    this.budget = want;

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

    // Release the ones that dropped out. Note what does NOT happen here: the
    // light stays in the scene and stays visible, it is only turned down.
    for (const [d, l] of [...this.active]) {
      if (keep.has(d)) continue;
      l.intensity = 0;
      l.position.set(0, -500, 0);
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
  /** Lights actually in the scene. Constant for the session, and that is the point. */
  get sceneLightCount() { return this.pool.length + this.spots.length; }

  dispose() {
    for (const l of this.pool) this.ctx.scene.remove(l);
    for (const s of this.spots) { this.ctx.scene.remove(s.light); this.ctx.scene.remove(s.light.target); }
    this.pool.length = 0;
    this.spots.length = 0;
    this.free.length = 0;
    this.active.clear();
  }
}

export { POINT_POOL, SPOT_POOL };
