// vehicle.js — a drivable vehicle: simulation + mesh + lights + audio + effects.
import * as THREE from 'three';
import { clamp, lerp, damp, formatMoney } from '../core/mathx.js';
import { VehicleSim } from '../physics/vehiclePhysics.js';
import { buildVehicleMesh, applyDeformation } from './vehicleBody.js';
import { LAYER, SURFACE, SURFACE_PROPS } from '../physics/world.js';

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();

let _vid = 1;

export class Vehicle {
  constructor(ctx, def, opts = {}) {
    this.ctx = ctx;
    this.def = def;
    this.id = _vid++;
    this.dead = false;
    this.isVehicle = true;
    this.persistent = !!opts.persistent;
    this.plate = opts.plate || randomPlate(ctx.rng);

    this.sim = new VehicleSim(def, ctx.physics, { owner: this, assist: ctx.settings.get('drivingAssist') });
    this.sim.owner = this;
    this.collider = this.sim.collider;
    this.collider.owner = this;

    const built = buildVehicleMesh(def, ctx.materials, opts.rng || ctx.rng, opts);
    this.group = built.group;
    this.bodyMesh = built.bodyMesh;
    this.wheelMeshes = built.wheelMeshes;
    this.restPositions = built.restPositions;
    this.lights = built.lights;
    this.headMaterial = built.headMaterial;
    this.tailMaterial = built.tailMaterial;
    this.sirenMeshes = built.sirenMeshes;
    this.colorHex = built.colorHex;
    this.cabinTop = built.cabinTop;
    this.group.userData.entity = this;

    ctx.scene.add(this.group);
    ctx.physics.addDynamic(this);

    // occupants
    this.driver = null;
    this.passengers = new Array(Math.max(0, (def.seats || 2) - 1)).fill(null);
    this.locked = false;
    this.doorsOpen = 0;

    // state
    this.headlightsOn = false;
    this.headlightAuto = true;
    this.sirenOn = false;
    this.sirenTime = 0;
    this.indicator = 0;             // -1 left, 1 right, 0 off
    this.hornTime = 0;
    this.alarmTime = 0;
    this.radioStation = null;
    this.lastUsed = 0;
    this.spawnTime = ctx.time ? ctx.time.elapsed : 0;
    this.despawnTimer = 0;
    this.isPlayerVehicle = false;
    this.aiDriver = null;
    this.stuckTimer = 0;
    this.wanted = false;
    this.blip = null;
    this.value = def.price || 5000;

    // spot lights for headlights — only attached for the important cars
    this.headSpots = [];
    this.hasSpots = false;
    this._deformVersion = 0;
    this._skidTimers = new Float32Array(this.sim.nWheels);
    this._lastSkidMark = new Array(this.sim.nWheels).fill(null);
    this._engineSound = null;
    this._lastSurface = SURFACE.ROAD;
    this._lightsDirty = true;
    this._distToCam = 0;
    this._visible = true;

    if (opts.x !== undefined) this.setTransform(opts.x, opts.y, opts.z, opts.yaw || 0);
  }

  setTransform(x, y, z, yaw) {
    this.sim.setTransform(x, y, z, yaw);
    this.syncMesh(0);
  }

  get position() { return this.sim.position; }
  get speed() { return this.sim.speed; }
  get mph() { return this.sim.mph; }
  get exploded() { return this.sim.exploded; }
  get health() { return this.sim.health; }
  get seatsFree() { return (this.driver ? 0 : 1) + this.passengers.filter((p) => !p).length; }
  get name() { return this.def.name; }

  // -------------------------------------------------------------------------
  attachHeadlightSpots() {
    if (this.hasSpots || this.def.body.kind === 'boat') return;
    const cfg = this.def.lights || {};
    const hY = (cfg.headlightY ?? 0.58) * this.def.height - this.def.height * 0.5;
    const spread = (cfg.headlightSpread ?? 0.72) * this.def.width * 0.42;
    for (const sx of [-1, 1]) {
      const s = new THREE.SpotLight(0xfff0d0, 0, 62, 0.60, 0.45, 1.4);
      s.position.set(sx * spread, hY, this.def.length * 0.46);
      s.target.position.set(sx * spread * 1.6, hY - 5, this.def.length * 0.46 + 26);
      s.castShadow = false;
      this.group.add(s, s.target);
      this.headSpots.push(s);
    }
    this.hasSpots = true;
  }
  detachHeadlightSpots() {
    for (const s of this.headSpots) { this.group.remove(s, s.target); s.dispose?.(); }
    this.headSpots.length = 0;
    this.hasSpots = false;
  }

  // -------------------------------------------------------------------------
  setControls(throttle, brake, steer, handbrake, reverse) {
    const s = this.sim;
    s.throttle = clamp(throttle, 0, 1);
    s.brake = clamp(brake, 0, 1);
    s.steerInput = clamp(steer, -1, 1);
    s.handbrake = clamp(handbrake, 0, 1);
    s.reverseHeld = clamp(reverse ?? 0, 0, 1);
  }

  update(dt) {
    if (this.dead) return;
    const ctx = this.ctx;
    const sim = this.sim;

    if (!sim.exploded) sim.update(dt);
    else {
      // Wreck: let it settle then burn.
      sim.velocity.multiplyScalar(Math.max(0, 1 - 1.6 * dt));
      sim.position.y = Math.max(sim.position.y, ctx.physics.groundHeight(sim.position.x, sim.position.z) + this.def.height * 0.35);
    }

    this._distToCam = this.group.position.distanceTo(ctx.camera.position);
    this.syncMesh(dt);
    this.updateLights(dt);
    this.updateEffects(dt);

    if (this.hornTime > 0) this.hornTime -= dt;
    if (this.alarmTime > 0) this.alarmTime -= dt;
    if (this.sirenOn) this.sirenTime += dt;

    if (sim.exploded && this.explodeTime === undefined) this.onExplode();
  }

  syncMesh(dt) {
    const sim = this.sim;
    this.group.position.copy(sim.position);
    this.group.quaternion.copy(sim.quaternion);

    // wheels
    const lod = this._distToCam > 120;
    for (let i = 0; i < this.wheelMeshes.length && i < sim.nWheels; i++) {
      const w = sim.wheels[i];
      const m = this.wheelMeshes[i];
      const drop = w.contact ? w.suspensionLength : w.maxLength;
      m.position.y = w.ly + (w.maxLength - drop) - (w.maxLength - w.restLength);
      m.rotation.order = 'YXZ';
      m.rotation.y = (w.steered ? w.steerAngle : 0) + (m.position.x > 0 ? Math.PI : 0);
      m.rotation.x = m.position.x > 0 ? -w.spin : w.spin;
      if (lod) m.rotation.x = 0;
    }
    // steer the front wheels' rack angle
    for (const w of sim.wheels) if (w.steered) w.steerAngle = sim.steerAngle;

    // Crumple the bodywork once per impact. The sim clears `lastImpactSpeed` at
    // the top of its own step, so this fires on the frame of the hit and not
    // again — and the reading survives for whoever looks at it next frame.
    if (dt > 0 && sim.lastImpactSpeed > 0 && sim.lastImpactSpeed !== this._deformedAt) {
      applyDeformation(this.bodyMesh, this.restPositions, sim.deformation, this.def);
      this._deformedAt = sim.lastImpactSpeed;
    }
  }

  updateLights(dt) {
    const ctx = this.ctx;
    const sim = this.sim;
    const night = ctx.sky ? ctx.sky.palette.night : 0;
    const wantHeads = this.headlightAuto
      ? (night > 0.35 || (ctx.weather && ctx.weather.rain > 0.35)) && !sim.exploded
      : this.headlightsOn && !sim.exploded;
    if (wantHeads !== this.headlightsOn || this._lightsDirty) {
      this.headlightsOn = wantHeads;
      this.headMaterial.emissiveIntensity = wantHeads ? 3.4 : 0;
      for (const s of this.headSpots) s.intensity = wantHeads ? 46 : 0;
      this._lightsDirty = false;
    }
    // brake / reverse
    const braking = sim.brake > 0.05 || (sim.handbrake > 0.1 && sim.speed > 0.4);
    this.tailMaterial.emissiveIntensity = braking ? 3.2 : (wantHeads ? 0.85 : 0.06);
    const rev = sim.gear === -1 && sim.throttle > 0.05;
    for (const m of this.lights.reverse) m.material.emissiveIntensity = rev ? 2.4 : 0;
    // indicators
    if (this.indicator !== 0) {
      const on = Math.floor(ctx.time.elapsed * 2.2) % 2 === 0;
      for (let i = 0; i < this.lights.indicator.length; i++) {
        const left = i % 2 === 0;
        const active = on && ((this.indicator < 0 && left) || (this.indicator > 0 && !left));
        this.lights.indicator[i].material.emissiveIntensity = active ? 3 : 0;
      }
    } else if (this.lights.indicator.length && this.lights.indicator[0].material.emissiveIntensity !== 0) {
      for (const m of this.lights.indicator) m.material.emissiveIntensity = 0;
    }
    // siren
    if (this.sirenMeshes.length) {
      if (this.sirenOn) {
        const phase = Math.floor(this.sirenTime * 7) % 2;
        for (const m of this.sirenMeshes) {
          m.material.emissiveIntensity = m.userData.sirenSide === phase ? 7 : 0.1;
        }
      } else if (this.sirenMeshes[0].material.emissiveIntensity !== 0.3) {
        for (const m of this.sirenMeshes) m.material.emissiveIntensity = 0.3;
      }
    }
  }

  updateEffects(dt) {
    const ctx = this.ctx;
    const sim = this.sim;
    if (!ctx.particles) return;
    const near = this._distToCam < 160;

    // tyre smoke + skid marks
    for (let i = 0; i < sim.nWheels; i++) {
      const w = sim.wheels[i];
      if (!w.contact) { this._lastSkidMark[i] = null; continue; }
      const surf = SURFACE_PROPS[w.contactSurface] || SURFACE_PROPS.road;
      const skid = w.skid;
      if (skid > 0.22 && near) {
        this._skidTimers[i] -= dt;
        if (this._skidTimers[i] <= 0) {
          this._skidTimers[i] = 0.02;
          if (surf.screech > 0.3) {
            ctx.particles.spawnSmoke(w.contactPoint.x, w.contactPoint.y + 0.1, w.contactPoint.z,
              0.5 + skid, 0xdddddd, 0.55 * skid);
          }
          if (surf.dust > 0.3) {
            ctx.particles.spawnDust(w.contactPoint.x, w.contactPoint.y + 0.08, w.contactPoint.z,
              surf.dustColor, 0.8 * skid * surf.dust);
          }
        }
      }
      if (ctx.decals && skid > 0.3 && surf.screech > 0.3 && near) {
        const p = this._lastSkidMark[i];
        if (!p) this._lastSkidMark[i] = w.contactPoint.clone();
        else if (p.distanceToSquared(w.contactPoint) > 0.55) {
          ctx.decals.addTireMark(p, w.contactPoint, w.width * 0.9, clamp(skid, 0, 1));
          p.copy(w.contactPoint);
        }
      }
    }

    // water spray
    if (sim.inWater && sim.speed > 2 && near) {
      ctx.particles.spawnSplash(sim.position.x, ctx.physics.waterLevel, sim.position.z, sim.speed * 0.2);
    }
    // engine fire and smoke
    if (sim.onFire > 0 && near) {
      this.localPoint(0, this.def.height * 0.15, this.def.length * 0.34, _v1);
      ctx.particles.spawnFire(_v1.x, _v1.y, _v1.z, 1);
      ctx.particles.spawnSmoke(_v1.x, _v1.y + 0.4, _v1.z, 1.4, 0x222222, 0.8);
    } else if (sim.engineHealth < 0.55 && near && Math.random() < 0.3) {
      this.localPoint(0, this.def.height * 0.18, this.def.length * 0.36, _v1);
      ctx.particles.spawnSmoke(_v1.x, _v1.y, _v1.z, 0.7, 0x3a3a3a, 0.32 * (1 - sim.engineHealth));
    }
    // exhaust puff on hard throttle
    if (near && sim.throttle > 0.7 && sim.rpmNormalized > 0.8 && Math.random() < 0.2) {
      this.localPoint(0, -this.def.height * 0.3, -this.def.length * 0.5, _v1);
      ctx.particles.spawnSmoke(_v1.x, _v1.y, _v1.z, 0.22, 0x666666, 0.16);
    }
  }

  localPoint(x, y, z, out) {
    out.set(x, y, z).applyQuaternion(this.sim.quaternion).add(this.sim.position);
    return out;
  }

  damage(amount, x, y, z, source) {
    if (this.sim.exploded) return;
    this.sim.damage(amount, x, y, z);
    if (this.sim.health <= 0) this.onExplode(source);
  }

  onExplode(source) {
    if (this.explodeTime !== undefined) return;
    this.explodeTime = this.ctx.time.elapsed;
    this.sim.explode();
    const p = this.sim.position;
    this.ctx.bus.emit('vehicle:explode', { vehicle: this, source, x: p.x, y: p.y, z: p.z });
    if (this.ctx.explosions) this.ctx.explosions.spawn(p.x, p.y + 0.4, p.z, { radius: 9, damage: 180, force: 26000, source: source || this });
    // blacken the wreck
    const burnt = new THREE.MeshStandardMaterial({ color: 0x1a1614, roughness: 0.96, metalness: 0.25 });
    this.group.traverse((o) => {
      if (o.isMesh && o.material && o.material.name !== 'carGlass') o.material = burnt;
      if (o.isMesh && o.material && o.material.emissiveIntensity !== undefined) o.material.emissiveIntensity = 0;
    });
    this.detachHeadlightSpots();
    if (this.driver) this.driver.onVehicleExploded?.(this);
    for (const p2 of this.passengers) if (p2) p2.onVehicleExploded?.(this);
  }

  enter(actor, seat = 0) {
    if (seat === 0) {
      if (this.driver) return false;
      this.driver = actor;
    } else {
      const i = seat - 1;
      if (i < 0 || i >= this.passengers.length || this.passengers[i]) return false;
      this.passengers[i] = actor;
    }
    this.lastUsed = this.ctx.time.elapsed;
    return true;
  }
  exit(actor) {
    if (this.driver === actor) { this.driver = null; this.setControls(0, 0.35, 0, 0, 0); return true; }
    const i = this.passengers.indexOf(actor);
    if (i >= 0) { this.passengers[i] = null; return true; }
    return false;
  }
  /** World position of a door / seat, for entering and exiting. */
  seatPoint(seat, out) {
    const d = this.def;
    const side = seat % 2 === 0 ? -1 : 1;
    const row = Math.floor(seat / 2);
    const z = d.length * (0.10 - row * 0.26);
    return this.localPoint(side * d.width * 0.42, -d.height * 0.12, z, out);
  }
  doorPoint(seat, out) {
    const d = this.def;
    const side = seat % 2 === 0 ? -1 : 1;
    const row = Math.floor(seat / 2);
    return this.localPoint(side * (d.width * 0.5 + 0.85), -d.height * 0.34, d.length * (0.08 - row * 0.26), out);
  }
  nearestFreeSeat(x, z) {
    const total = this.def.seats || 2;
    let best = -1, bestD = Infinity;
    for (let s = 0; s < total; s++) {
      if (s === 0 ? this.driver : this.passengers[s - 1]) continue;
      this.doorPoint(s, _v1);
      const d = (_v1.x - x) ** 2 + (_v1.z - z) ** 2;
      if (d < bestD) { bestD = d; best = s; }
    }
    return best;
  }

  honk() {
    if (this.hornTime > 0) return;
    this.hornTime = 0.6;
    this.ctx.audio?.playAt(this.def.mass > 3000 ? 'carHornTruck' : 'carHorn', this.sim.position, { volume: 0.8 });
  }

  setVisible(v) {
    if (this._visible === v) return;
    this._visible = v;
    this.group.visible = v;
  }

  dispose() {
    this.dead = true;
    this.detachHeadlightSpots();
    this.ctx.physics.removeDynamic(this);
    this.ctx.scene.remove(this.group);
    this.group.traverse((o) => {
      // Geometry shared between cars of the same model (wheels) must outlive
      // any one of them.
      if (o.isMesh && !o.geometry?.userData?.shared) o.geometry?.dispose?.();
    });
    if (this._engineSound) { this._engineSound.stop(); this._engineSound = null; }
    if (this.blip && this.ctx.hud) this.ctx.hud.removeBlip(this.blip);
  }
}

const PLATE_LETTERS = 'ABCDEFGHJKLMNPRSTUVWXYZ';
export function randomPlate(rng) {
  let s = '';
  for (let i = 0; i < 3; i++) s += PLATE_LETTERS[rng.int(0, PLATE_LETTERS.length - 1)];
  s += ' ' + String(rng.int(100, 999));
  return s;
}
