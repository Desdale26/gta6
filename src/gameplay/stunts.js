// stunts.js — trick detection and combo scoring.
//
// Watches the player's vehicle for airtime, rotation about each axis, drifts, wheelies and
// near misses, banks them into a combo, and cashes out when you land clean.
import * as THREE from 'three';
import { clamp, lerp, TAU, wrapAngle, formatMoney } from '../core/mathx.js';
import { TRICKS, STUNT_SPOTS, getSpot } from '../content/stuntCatalog.js';

const _v1 = new THREE.Vector3();
const _e = new THREE.Euler(0, 0, 0, 'YXZ');

const trickById = new Map(TRICKS.map((t) => [t.id, t]));

export class StuntSystem {
  constructor(ctx) {
    this.ctx = ctx;
    this.airTime = 0;
    this.maxAirTime = 0;
    this.airStartPos = new THREE.Vector3();
    this.airDistance = 0;
    this.flipAccum = 0;
    this.spinAccum = 0;
    this.rollAccum = 0;
    this.wasAirborne = false;
    this.combo = [];
    this.comboScore = 0;
    this.comboTimer = 0;
    this.multiplier = 1;
    this.totalScore = 0;
    this.bestCombo = 0;
    this.driftTime = 0;
    this.wheelieTime = 0;
    this.twoWheelTime = 0;
    this.nearMissCooldown = 0;
    this.lastYaw = 0;
    this.challenges = new Map();   // spotId -> { best, medal }
    this.activeSpot = null;
    this.spotTimer = 0;
    for (const s of STUNT_SPOTS) this.challenges.set(s.id, { best: 0, medal: 'none' });
  }

  update(dt) {
    const ctx = this.ctx;
    const player = ctx.player;
    if (!player || player.dead) { this._cashOut(false); return; }
    const v = player.vehicle;

    this.comboTimer = Math.max(0, this.comboTimer - dt);
    this.nearMissCooldown = Math.max(0, this.nearMissCooldown - dt);
    if (this.comboTimer <= 0 && this.combo.length) this._cashOut(true);

    if (!v || !player.isDriving) {
      this.wasAirborne = false;
      this.airTime = 0;
      return;
    }
    const sim = v.sim;
    const airborne = sim.wheelsOnGround === 0 && !sim.inWater;

    // --- rotation tracking, in the car's own frame ---
    const w = sim.angularVelocity;
    const pitchRate = w.dot(sim.right);
    const yawRate = w.dot(sim.up);
    const rollRate = w.dot(sim.forward);

    if (airborne) {
      if (!this.wasAirborne) {
        this.airStartPos.copy(sim.position);
        this.flipAccum = 0; this.spinAccum = 0; this.rollAccum = 0;
        this.airTime = 0;
      }
      this.airTime += dt;
      this.flipAccum += pitchRate * dt;
      this.spinAccum += yawRate * dt;
      this.rollAccum += rollRate * dt;
      this.airDistance = sim.position.distanceTo(this.airStartPos);
      this.maxAirTime = Math.max(this.maxAirTime, this.airTime);
      this._trackSpot(sim);
    } else {
      if (this.wasAirborne && this.airTime > 0.35) this._landed(sim);
      this.airTime = 0;

      // --- ground tricks ---
      const drift = Math.abs(sim.driftAngle);
      if (drift > 0.22 && sim.speed > 9) {
        this.driftTime += dt;
        if (this.driftTime > 1 && this.comboTimer <= 0) this._addTrick('drift', this.driftTime);
        else if (this.driftTime > 2.5) this._addTrick('bigdrift', this.driftTime, true);
      } else if (this.driftTime > 0) {
        if (this.driftTime > 0.8) this._addTrick(this.driftTime > 2.4 ? 'bigdrift' : 'drift', this.driftTime);
        this.driftTime = 0;
      }

      // wheelie / stoppie / two wheels
      const front = sim.wheels.filter((wl) => wl.lz > 0);
      const rear = sim.wheels.filter((wl) => wl.lz <= 0);
      const frontUp = front.length && front.every((wl) => !wl.contact);
      const rearUp = rear.length && rear.every((wl) => !wl.contact);
      const left = sim.wheels.filter((wl) => wl.lx < 0);
      const right = sim.wheels.filter((wl) => wl.lx > 0);
      const sideUp = (left.length && left.every((wl) => !wl.contact)) || (right.length && right.every((wl) => !wl.contact));

      if (frontUp && !rearUp && sim.speed > 4) { this.wheelieTime += dt; }
      else if (this.wheelieTime > 0.6) { this._addTrick('wheelie', this.wheelieTime); this.wheelieTime = 0; }
      else this.wheelieTime = 0;

      if (rearUp && !frontUp && sim.speed > 4) { this.stoppieTime = (this.stoppieTime || 0) + dt; }
      else if (this.stoppieTime > 0.5) { this._addTrick('stoppie', this.stoppieTime); this.stoppieTime = 0; }
      else this.stoppieTime = 0;

      if (sideUp && sim.speed > 6) { this.twoWheelTime += dt; }
      else if (this.twoWheelTime > 0.7) { this._addTrick('twowheel', this.twoWheelTime); this.twoWheelTime = 0; }
      else this.twoWheelTime = 0;
    }
    this.wasAirborne = airborne;

    this._nearMiss(dt, v);
  }

  _landed(sim) {
    // Did the car land on its wheels?
    const upright = sim.up.y > 0.55;
    const flips = Math.abs(this.flipAccum) / TAU;
    const spins = Math.abs(this.spinAccum) / TAU;
    const rolls = Math.abs(this.rollAccum) / TAU;

    if (this.airTime > 3.0) this._addTrick('air-insane', this.airTime);
    else if (this.airTime > 2.0) this._addTrick('air-huge', this.airTime);
    else if (this.airTime > 1.2) this._addTrick('air-big', this.airTime);
    else if (this.airTime > 0.55) this._addTrick('air-small', this.airTime);

    if (flips >= 2.7) this._addTrick('tripleflip', flips);
    else if (flips >= 1.7) this._addTrick('doubleflip', flips);
    else if (flips >= 0.75) this._addTrick(this.flipAccum > 0 ? 'backflip' : 'frontflip', flips);

    if (spins >= 2.4) this._addTrick('spin900', spins);
    else if (spins >= 1.9) this._addTrick('spin720', spins);
    else if (spins >= 1.4) this._addTrick('spin540', spins);
    else if (spins >= 0.9) this._addTrick('spin360', spins);
    else if (spins >= 0.44) this._addTrick('spin180', spins);

    if (rolls >= 1.7) this._addTrick('doubleroll', rolls);
    else if (rolls >= 0.8) this._addTrick('roll', rolls);

    if (upright && this.combo.length) {
      this._addTrick('precision', 1);
      this.comboTimer = 3.2;
    } else if (!upright) {
      // Landing on your roof loses the combo.
      this._cashOut(false);
      return;
    }

    if (this.activeSpot) this._scoreChallenge(this.activeSpot, sim);
  }

  _addTrick(id, magnitude, replaceLast = false) {
    const t = trickById.get(id);
    if (!t) return;
    if (replaceLast && this.combo.length && this.combo[this.combo.length - 1].id === 'drift') this.combo.pop();
    // Magnitude comes from air time, drop height and rotations, so a single
    // freak launch could otherwise pay out more than the whole story does.
    const points = Math.round(t.base + t.per * clamp(magnitude - 1, 0, 8));
    this.combo.push({ id, text: t.text, points });
    this.comboScore += points;
    this.multiplier = 1 + (this.combo.length - 1) * 0.35;
    this.comboTimer = Math.max(this.comboTimer, 3.0);
    this.ctx.audio?.play('comboUp', { ui: true, volume: 0.28, pitch: clamp(0.9 + this.combo.length * 0.08, 0.9, 1.9) });
    this.ctx.bus.emit('stunt:trick', { id, text: t.text, points, combo: this.combo.length });
  }

  _cashOut(success) {
    if (!this.combo.length) { this.comboScore = 0; this.multiplier = 1; return; }
    const total = Math.round(this.comboScore * this.multiplier);
    const combo = this.combo.slice();
    this.combo.length = 0;
    this.comboScore = 0;
    this.multiplier = 1;
    this.comboTimer = 0;
    if (!success) {
      this.ctx.bus.emit('stunt:bailed', { lost: total });
      this.ctx.notify?.toast('Bailed', 'Combo lost', 'bad');
      return;
    }
    this.totalScore += total;
    this.bestCombo = Math.max(this.bestCombo, total);
    const cash = Math.round(total * 0.12);
    if (cash > 0) this.ctx.economy.earn(cash, 'Stunt bonus');
    this.ctx.economy.addRep(Math.round(total / 400));
    this.ctx.bus.emit('stunt:landed', { score: total, cash, combo });
    this.ctx.notify?.toast(`${total.toLocaleString()} pts`, combo.map((c) => c.text).join(' + '), 'good');
  }

  _nearMiss(dt, v) {
    if (this.nearMissCooldown > 0 || v.sim.speed < 14) return;
    const ctx = this.ctx;
    if (!ctx.traffic) return;
    const p = v.sim.position;
    for (const other of ctx.traffic.all()) {
      if (other === v || other.dead) continue;
      const d = Math.hypot(other.sim.position.x - p.x, other.sim.position.z - p.z);
      if (d < 2.6 && d > 0.1) {
        this.nearMissCooldown = 0.8;
        this._addTrick('nearmiss', 1 + v.sim.speed / 22);
        return;
      }
    }
  }

  /** Note which stunt spot the player is airborne over, for challenge scoring. */
  _trackSpot(sim) {
    let best = null, bestD = 60 * 60;
    for (const s of this.ctx.world.stuntSpots) {
      const d = (s.x - sim.position.x) ** 2 + (s.z - sim.position.z) ** 2;
      if (d < bestD) { bestD = d; best = s; }
    }
    this.activeSpot = best;
  }

  _scoreChallenge(spot, sim) {
    const def = spot.def;
    if (!def.challenge) return;
    const c = def.challenge;
    let value = 0;
    switch (c.metric) {
      case 'distance': value = this.airDistance; break;
      case 'airtime': value = this.airTime; break;
      case 'flips': value = Math.abs(this.flipAccum) / TAU; break;
      case 'spins': value = Math.abs(this.spinAccum) / TAU; break;
      case 'speed': value = sim.speed; break;
      case 'score': value = this.comboScore * this.multiplier; break;
      default: value = 0;
    }
    const rec = this.challenges.get(def.id);
    if (!rec || value <= rec.best) return;
    rec.best = value;
    const medal = value >= c.gold ? 'gold' : value >= c.silver ? 'silver' : value >= c.bronze ? 'bronze' : 'none';
    const improved = medalRank(medal) > medalRank(rec.medal);
    rec.medal = medal;
    if (improved && medal !== 'none') {
      const reward = Math.round(c.reward * (medal === 'gold' ? 1 : medal === 'silver' ? 0.6 : 0.3));
      this.ctx.economy.earn(reward, `${c.name} (${medal})`);
      this.ctx.economy.addRep(medal === 'gold' ? 12 : medal === 'silver' ? 7 : 3);
      this.ctx.notify?.toast(`${medal.toUpperCase()} — ${c.name}`,
        `${formatValue(c.metric, value)} · ${formatMoney(reward)}`, 'good');
      this.ctx.audio?.play('missionPass', { ui: true, volume: 0.5 });
      this.ctx.bus.emit('stunt:challenge', { spot: def, medal, value, reward });
    }
  }

  get medalsWon() {
    let n = 0;
    for (const r of this.challenges.values()) if (r.medal !== 'none') n++;
    return n;
  }

  serialize() {
    const out = {};
    for (const [k, v] of this.challenges) if (v.medal !== 'none') out[k] = { best: v.best, medal: v.medal };
    return { challenges: out, totalScore: this.totalScore, bestCombo: this.bestCombo, maxAirTime: this.maxAirTime };
  }
  deserialize(d) {
    if (!d) return;
    this.totalScore = d.totalScore ?? 0;
    this.bestCombo = d.bestCombo ?? 0;
    this.maxAirTime = d.maxAirTime ?? 0;
    for (const [k, v] of Object.entries(d.challenges || {})) {
      if (this.challenges.has(k)) this.challenges.set(k, { best: v.best, medal: v.medal });
    }
  }
}

function medalRank(m) { return m === 'gold' ? 3 : m === 'silver' ? 2 : m === 'bronze' ? 1 : 0; }
function formatValue(metric, v) {
  if (metric === 'distance') return `${v.toFixed(1)} m`;
  if (metric === 'airtime') return `${v.toFixed(2)} s`;
  if (metric === 'speed') return `${(v * 2.23694).toFixed(0)} mph`;
  if (metric === 'score') return Math.round(v).toLocaleString();
  return v.toFixed(1);
}
