// ambience.js — the sound of the city when nothing in particular is happening.
//
// Engines, gunfire and the radio carry the action; this carries the place. Two
// continuous beds (wind, and the murmur of whoever is nearby) are cross-faded
// against the weather, the time of day and the crowd around the player, and a
// few one-shots — gulls over the water, a dog somewhere in the suburbs — fire
// on their own irregular schedules so the city never sounds like a loop.
import { clamp, damp } from '../core/mathx.js';
import { districtAt } from '../content/districtCatalog.js';

// Where a dog barking in a yard is plausible.
const RESIDENTIAL = new Set(['suburb', 'barrio', 'oldtown', 'trailer', 'hills']);

export class Ambience {
  constructor(ctx) {
    this.ctx = ctx;
    this.wind = null;
    this.crowd = null;
    this.windLevel = 0;
    this.crowdLevel = 0;
    this.gullTimer = 4;
    this.dogTimer = 20;
    this.enabled = true;
  }

  _ensureBeds() {
    const audio = this.ctx.audio;
    if (!audio || !audio.ready || !audio.enabled) return false;
    if (!this.wind) this.wind = audio.startLoop('wind', { volume: 0 });
    if (!this.crowd) this.crowd = audio.startLoop('crowdMurmur', { volume: 0 });
    return !!(this.wind && this.crowd);
  }

  update(dt) {
    if (!this.enabled || !this._ensureBeds()) return;
    const ctx = this.ctx;
    const hour = ctx.time.hour;
    const weather = ctx.weather;
    const player = ctx.player;
    if (!player) return;

    // --- wind: always there, louder in weather, louder out in the open ---
    const gust = 0.55 + 0.45 * Math.sin(ctx.time.elapsed * 0.21)
      * Math.sin(ctx.time.elapsed * 0.073 + 1.7);
    const speed = player.vehicle ? clamp(player.vehicle.sim.speed / 55, 0, 1) : 0;
    const wantWind = clamp(
      (0.05 + (weather ? weather.windSpeed * 0.20 : 0.04)) * gust + speed * 0.10,
      0, 0.4);
    this.windLevel = damp(this.windLevel, wantWind, 1.6, dt);
    this.wind.setVolume(this.windLevel);
    // A stronger wind is also a higher one.
    this.wind.setPitch(0.86 + (weather ? weather.windSpeed : 0.3) * 0.34);

    // --- crowd: however many people are actually within earshot ---
    let near = 0;
    const px = player.position.x, pz = player.position.z;
    for (const p of ctx.peds.peds) {
      if (p.dead || p.inVehicle) continue;
      const dx = p.body.position.x - px, dz = p.body.position.z - pz;
      if (dx * dx + dz * dz < 45 * 45) near++;
    }
    // Muffled from inside a car, and thinner in the small hours.
    const indoors = player.vehicle ? 0.30 : 1;
    const late = hour < 6 || hour > 23 ? 0.35 : 1;
    const wantCrowd = clamp(near / 14, 0, 1) * 0.26 * indoors * late;
    this.crowdLevel = damp(this.crowdLevel, wantCrowd, 2.2, dt);
    this.crowd.setVolume(this.crowdLevel);

    // --- gulls, over and near the water ---
    this.gullTimer -= dt;
    if (this.gullTimer <= 0) {
      this.gullTimer = 7 + Math.random() * 16;
      const overWater = ctx.physics.terrain
        && ctx.physics.groundHeight(px, pz) < (ctx.physics.waterLevel ?? 0) + 9;
      if (overWater && hour > 5.5 && hour < 20.5) {
        const a = Math.random() * Math.PI * 2, r = 18 + Math.random() * 45;
        ctx.audio.playAt('seagull', {
          x: px + Math.cos(a) * r,
          y: player.position.y + 9 + Math.random() * 12,
          z: pz + Math.sin(a) * r,
        }, { volume: 0.28 + Math.random() * 0.16, pitch: 0.9 + Math.random() * 0.28, maxDistance: 140 });
      }
    }

    // --- a dog, somewhere out in the houses ---
    this.dogTimer -= dt;
    if (this.dogTimer <= 0) {
      this.dogTimer = 22 + Math.random() * 50;
      const d = districtAt(px, pz);
      const residential = d && RESIDENTIAL.has(d.style);
      if (residential) {
        const a = Math.random() * Math.PI * 2, r = 22 + Math.random() * 38;
        ctx.audio.playAt('dogBark', {
          x: px + Math.cos(a) * r, y: player.position.y, z: pz + Math.sin(a) * r,
        }, { volume: 0.22 + Math.random() * 0.14, pitch: 0.85 + Math.random() * 0.4, maxDistance: 120 });
      }
    }
  }

  dispose() {
    this.wind?.stop(); this.crowd?.stop();
    this.wind = null; this.crowd = null;
  }
}
