// traffic.js — AI drivers and the ambient traffic that keeps the streets alive.
//
// Every AI car runs the same driver: pick a lane, aim a look-ahead point down it, and use
// the same throttle/brake/steer inputs the player has. Traffic obeys lights and queues;
// chasing cops use the identical controller with a different target.
import * as THREE from 'three';
import { clamp, lerp, damp, angleDelta, wrapAngle } from '../core/mathx.js';
import { Vehicle } from './vehicle.js';
import { LAYER, MASK_SOLID } from '../physics/world.js';
import { rideHeightFor } from '../physics/vehiclePhysics.js';
import { ROAD_TYPE } from '../world/roads.js';
import { VEHICLES, getVehicle, vehiclesByClass } from '../content/vehicleCatalog.js';
import { districtAt } from '../content/districtCatalog.js';

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _lane = new THREE.Vector3();
const _scratch = [];

export const DRIVER_MODE = {
  TRAFFIC: 'traffic', CHASE: 'chase', FLEE: 'flee', PATROL: 'patrol',
  GOTO: 'goto', PARKED: 'parked', RACE: 'race',
};

export class VehicleAI {
  constructor(vehicle, graph, rng, mode = DRIVER_MODE.TRAFFIC) {
    this.v = vehicle;
    this.graph = graph;
    this.rng = rng;
    this.mode = mode;
    this.edge = null;
    this.dir = 1;
    this.lane = 0;
    this.t = 0;
    this.targetPoint = new THREE.Vector3();
    this.chaseTarget = null;
    this.goal = null;
    this.path = null;
    this.pathIndex = 0;
    this.stuckTime = 0;
    this.reverseTime = 0;
    this.blockedTime = 0;
    this.honkCooldown = 0;
    this.speedTarget = 10;
    this.aggression = rng.range(0.25, 0.85);
    this.patience = rng.range(2.5, 7);
    this.repathTimer = 0;
    this.lastNode = null;
    this.waitingAtLight = false;
  }

  /** Snap onto the nearest lane and start driving. */
  attachToNearestEdge(x, z) {
    const near = this.graph.nearestEdge(x, z, 160);
    if (!near) return false;
    this.edge = near.edge;
    this.t = clamp(near.t, 0.05, 0.95);
    // Drive the direction that best matches the car's current heading.
    const fwd = this.v.sim.forward;
    this.dir = (fwd.x * this.edge.dx + fwd.z * this.edge.dz) >= 0 ? 1 : -1;
    this.lane = this.rng.int(0, Math.max(0, this.edge.lanesPerDir - 1));
    return true;
  }

  _advanceEdge() {
    const e = this.edge;
    if (!e) return;
    const node = this.dir > 0 ? e.b : e.a;
    this.lastNode = node;
    // Prefer continuing roughly straight, weighted by road class.
    const options = node.edges.filter((o) => o !== e);
    if (!options.length) {
      this.dir *= -1;
      this.t = this.dir > 0 ? 0.02 : 0.98;
      return;
    }
    let best = null, bestScore = -Infinity;
    const curAngle = Math.atan2(e.dx * this.dir, e.dz * this.dir);
    for (const o of options) {
      const odir = o.a === node ? 1 : -1;
      const oAngle = Math.atan2(o.dx * odir, o.dz * odir);
      const turn = Math.abs(angleDelta(curAngle, oAngle));
      let score = (Math.PI - turn) * 1.4 + (o.type === ROAD_TYPE.HIGHWAY ? 1.2 : o.type === ROAD_TYPE.ARTERIAL ? 0.6 : 0);
      score += this.rng.float() * 1.3;
      if (score > bestScore) { bestScore = score; best = { edge: o, dir: odir }; }
    }
    this.edge = best.edge;
    this.dir = best.dir;
    this.t = this.dir > 0 ? 0.02 : 0.98;
    this.lane = Math.min(this.lane, Math.max(0, this.edge.lanesPerDir - 1));
  }

  update(dt) {
    const v = this.v;
    const sim = v.sim;
    if (sim.exploded) { v.setControls(0, 1, 0, 1, 0); return; }
    this.honkCooldown = Math.max(0, this.honkCooldown - dt);

    if (this.mode === DRIVER_MODE.PARKED) { v.setControls(0, 1, 0, 1, 0); return; }

    let aim = null;
    let desiredSpeed = 12;

    if (this.mode === DRIVER_MODE.CHASE && this.chaseTarget && !this.chaseTarget.dead) {
      aim = this._chaseAim(dt);
      desiredSpeed = 34;
    } else if (this.mode === DRIVER_MODE.FLEE && this.chaseTarget) {
      aim = this._fleeAim(dt);
      desiredSpeed = 26;
    } else if (this.mode === DRIVER_MODE.GOTO && this.goal) {
      aim = this._goalAim(dt);
      desiredSpeed = 20;
    } else {
      aim = this._laneAim(dt);
      desiredSpeed = this.edge ? this.edge.speedLimit * lerp(0.72, 1.12, this.aggression) : 10;
    }
    if (!aim) { v.setControls(0, 0.6, 0, 0, 0); return; }

    this.targetPoint.copy(aim);

    // ---- steering ----
    _v1.copy(aim).sub(sim.position);
    _v1.y = 0;
    const distToAim = _v1.length();
    const desiredYaw = Math.atan2(_v1.x, _v1.z);
    const curYaw = Math.atan2(sim.forward.x, sim.forward.z);
    let steer = angleDelta(curYaw, desiredYaw);
    // Reverse out of a corner rather than grinding forward into it.
    const reversing = this.reverseTime > 0;
    if (reversing) steer = -steer;
    steer = clamp(steer * 1.7, -1, 1);

    // ---- speed governor ----
    const corner = Math.abs(steer);
    const cornerLimit = lerp(38, 9, Math.min(1, corner * 1.4));
    let target = Math.min(desiredSpeed, cornerLimit);

    // obstacle ahead
    const ahead = this._probeAhead(sim.speed);
    if (ahead.dist < ahead.safe) {
      const k = clamp(ahead.dist / Math.max(ahead.safe, 0.1), 0, 1);
      target = Math.min(target, ahead.otherSpeed * 0.92 + k * 4);
      if (ahead.dist < ahead.safe * 0.45) target = 0;
      if (ahead.blocked) this.blockedTime += dt; else this.blockedTime = 0;
      if (this.blockedTime > this.patience && this.honkCooldown <= 0) {
        v.honk();
        this.honkCooldown = 3.5;
      }
    } else {
      this.blockedTime = 0;
    }

    // traffic lights
    if (this.mode === DRIVER_MODE.TRAFFIC || this.mode === DRIVER_MODE.GOTO) {
      const stop = this._lightCheck();
      if (stop !== null) {
        this.waitingAtLight = stop < 12;
        if (stop < 14) target = Math.min(target, Math.max(0, (stop - 3) * 1.6));
      } else {
        this.waitingAtLight = false;
      }
    }

    // ---- pedals ----
    const speed = sim.forwardSpeed;
    let throttle = 0, brake = 0;
    if (reversing) {
      throttle = 0.6;
      this.reverseTime -= dt;
      v.setControls(throttle, 0, steer, 0, 1);
      return;
    }
    // Rolling backwards without meaning to: stop, then set off again. Without
    // this the error term reads a car doing -8 m/s as eight metres per second
    // short of its target and answers with full throttle, which is exactly the
    // wrong pedal — it is already going the wrong way.
    if (speed < -0.6) {
      v.setControls(0, clamp(-speed * 0.5, 0.35, 1), steer, 0, 0);
      return;
    }
    const err = target - speed;
    if (err > 0.4) throttle = clamp(err * 0.38, 0, 1);
    else if (err < -0.6) brake = clamp(-err * 0.34, 0, 1);
    if (target <= 0.05 && speed < 1.2) { brake = 1; throttle = 0; }

    // ---- stuck detection ----
    if (sim.speed < 0.8 && (throttle > 0.2 || this.blockedTime > 0.5)) this.stuckTime += dt;
    else this.stuckTime = Math.max(0, this.stuckTime - dt * 2);
    if (this.stuckTime > 3.2) {
      this.reverseTime = 1.3;
      this.stuckTime = 0;
    }

    const handbrake = this.mode === DRIVER_MODE.CHASE && corner > 0.85 && sim.speed > 20 ? 0.5 : 0;
    v.setControls(throttle, brake, steer, handbrake, 0);
    v.indicator = Math.abs(steer) > 0.35 && sim.speed < 16 ? Math.sign(steer) : 0;
  }

  _laneAim(dt) {
    if (!this.edge && !this.attachToNearestEdge(this.v.sim.position.x, this.v.sim.position.z)) return null;
    const e = this.edge;
    const speed = Math.max(4, this.v.sim.speed);
    const lookahead = clamp(speed * 0.62 + 5, 6, 34);
    let t = this.t + (this.dir * lookahead) / e.length;

    // Progress along the current edge from the actual position, not dead reckoning.
    const proj = e.project(this.v.sim.position.x, this.v.sim.position.z);
    this.t = proj.t;
    t = this.t + (this.dir * lookahead) / e.length;

    if (t > 1 || t < 0) {
      // Aim into the next edge so corners are taken smoothly.
      const overshoot = t > 1 ? (t - 1) * e.length : -t * e.length;
      const node = this.dir > 0 ? e.b : e.a;
      if ((this.dir > 0 && this.t > 0.94) || (this.dir < 0 && this.t < 0.06)) this._advanceEdge();
      const ne = this.edge;
      const nt = clamp((this.dir > 0 ? overshoot : ne.length - overshoot) / ne.length, 0, 1);
      ne.lanePoint(this.dir, this.lane, nt, _lane);
    } else {
      e.lanePoint(this.dir, this.lane, clamp(t, 0, 1), _lane);
    }
    _lane.y = this.ctxHeight(_lane.x, _lane.z);
    return _lane;
  }

  _chaseAim(dt) {
    const target = this.chaseTarget;
    const tp = target.position;
    const d = this.v.sim.position.distanceTo(tp);
    // Close in directly; at range, use the road network so they don't drive into walls.
    if (d < 45) {
      _v2.copy(tp);
      // lead the target
      if (target.sim) _v2.addScaledVector(target.sim.velocity, 0.5);
      else if (target.body) _v2.addScaledVector(target.body.velocity, 0.4);
      _v2.y = this.ctxHeight(_v2.x, _v2.z);
      return _v2;
    }
    this.goal = tp;
    return this._goalAim(dt);
  }

  _fleeAim(dt) {
    const t = this.chaseTarget;
    _v2.copy(this.v.sim.position).sub(t.position);
    _v2.y = 0;
    if (_v2.lengthSq() < 0.01) _v2.set(1, 0, 0);
    _v2.normalize().multiplyScalar(50).add(this.v.sim.position);
    this.goal = _v2.clone();
    return this._goalAim(dt) || _v2;
  }

  _goalAim(dt) {
    this.repathTimer -= dt;
    const pos = this.v.sim.position;
    if (!this.path || this.repathTimer <= 0) {
      this.repathTimer = 2.5;
      const from = this.graph.nearestNode(pos.x, pos.z, 260);
      const to = this.graph.nearestNode(this.goal.x, this.goal.z, 260);
      this.path = from && to ? this.graph.findPath(from, to) : null;
      this.pathIndex = 0;
    }
    if (!this.path || this.pathIndex >= this.path.length) {
      _v2.copy(this.goal);
      _v2.y = this.ctxHeight(_v2.x, _v2.z);
      return _v2;
    }
    let node = this.path[this.pathIndex];
    while (this.pathIndex < this.path.length - 1
           && Math.hypot(node.x - pos.x, node.z - pos.z) < 12) {
      this.pathIndex++;
      node = this.path[this.pathIndex];
    }
    // Offset to the right-hand lane of the segment we're on so we don't drive
    // down the middle. Facing (dx, dz), the driver's right is (-dz, dx) — the
    // same normal RoadEdge builds its lanes from. This had the opposite sign,
    // so anything steering by the path graph rather than by lane — a police car
    // closing from range, a fleeing driver, anyone sent somewhere — aimed at the
    // oncoming lane and met the traffic head on.
    _v2.set(node.x, 0, node.z);
    const next = this.path[this.pathIndex + 1];
    if (next) {
      const dx = next.x - node.x, dz = next.z - node.z;
      const l = Math.hypot(dx, dz) || 1;
      _v2.x += (-dz / l) * 2.4;
      _v2.z += (dx / l) * 2.4;
    }
    _v2.y = this.ctxHeight(_v2.x, _v2.z);
    return _v2;
  }

  ctxHeight(x, z) {
    const phys = this.v.ctx.physics;
    return phys.groundHeight(x, z);
  }

  /** Distance to whatever is in our lane ahead. */
  _probeAhead(speed) {
    const sim = this.v.sim;
    const phys = this.v.ctx.physics;
    const safe = clamp(speed * 1.25 + this.v.def.length * 0.6 + 3.5, 6, 40);
    const ox = sim.position.x + sim.forward.x * (this.v.def.length * 0.5 + 0.4);
    const oy = sim.position.y + 0.1;
    const oz = sim.position.z + sim.forward.z * (this.v.def.length * 0.5 + 0.4);
    const hit = phys.raycast(ox, oy, oz, sim.forward.x, 0, sim.forward.z, safe + 4,
      LAYER.VEHICLE | LAYER.PED | LAYER.BUILDING | LAYER.PROP, { ignore: this.v });
    if (!hit.hit) return { dist: Infinity, safe, otherSpeed: 99, blocked: false };
    let otherSpeed = 0;
    const ent = hit.entity;
    if (ent && ent.sim) otherSpeed = Math.max(0, ent.sim.velocity.dot(sim.forward));
    else if (ent && ent.body) otherSpeed = 0;
    return { dist: hit.dist, safe, otherSpeed, blocked: otherSpeed < 1.2 };
  }

  /** Distance to a red light ahead, or null. */
  _lightCheck() {
    const e = this.edge;
    if (!e) return null;
    const node = this.dir > 0 ? e.b : e.a;
    if (!node.light) return null;
    const state = node.light.stateFor(e);
    if (state === 'green') return null;
    const pos = this.v.sim.position;
    const d = Math.hypot(node.x - pos.x, node.z - pos.z) - node.radius - this.v.def.length * 0.5;
    if (state === 'amber' && d < 6) return null;   // already committed
    return Math.max(0, d);
  }
}

// ---------------------------------------------------------------------------
export class TrafficManager {
  constructor(ctx) {
    this.ctx = ctx;
    this.vehicles = [];
    this.parked = [];
    this.budget = ctx.settings.preset.trafficBudget;
    this.spawnTimer = 0;
    this.rng = ctx.rng.fork('traffic');
    this.enabled = true;
    this.spawnRadius = { min: 70, max: 190 };
    this.despawnRadius = 260;
    this._stats = { spawned: 0, despawned: 0 };
  }

  get count() { return this.vehicles.length; }

  update(dt) {
    if (!this.enabled) return;
    const ctx = this.ctx;
    const player = ctx.player;
    if (!player) return;
    const px = player.position.x, pz = player.position.z;

    // --- a parked car somebody has got into is not parked any more ---
    //
    // This is the bug behind "the cars don't work". Vehicle.update(dt) is the only
    // thing in the codebase that calls sim.update(dt), and it is called from
    // exactly one place: the loop immediately below, over `this.vehicles`.
    // Kerbside cars live in `this.parked`, and _updateParked only ever spawns and
    // despawns them — it never steps one. But `all()` returns vehicles.concat(
    // parked), so findNearbyVehicle offers parked cars to the player like any
    // other: the prompt appears, the door opens, they are in the driver's seat,
    // and then Player._updateInVehicle writes throttle and steering into a sim
    // that nothing integrates. The car sits there for ever.
    //
    // Measured: a parked car held at full throttle for six seconds moved 0.00 m;
    // the same vehicle spawned into `this.vehicles` instead moved 11.1 m in five.
    // The only difference was which array it was in. Every check missed it
    // because the 'drive' scenario spawns with traffic.spawnAt(), which pushes to
    // `this.vehicles` unless opts.parked is set — so the suite only ever drove
    // cars from the list that gets stepped.
    //
    // Promoting is better than stepping `this.parked` in place: a car nobody is
    // in does not need integrating, and once it has a driver it is ordinary
    // traffic — it despawns by distance, rights itself, takes damage and is
    // exempt from streaming while the player is in it, all for free.
    for (let i = this.parked.length - 1; i >= 0; i--) {
      const v = this.parked[i];
      if (!v.driver && v !== player.vehicle) continue;
      this.parked.splice(i, 1);
      this.vehicles.push(v);
    }

    // --- drive ---
    for (let i = this.vehicles.length - 1; i >= 0; i--) {
      const v = this.vehicles[i];
      if (v.dead) { this.vehicles.splice(i, 1); continue; }
      const dx = v.sim.position.x - px, dz = v.sim.position.z - pz;
      const dist2 = dx * dx + dz * dz;

      // Despawn far-away traffic that the player is not looking at.
      // A mission vehicle is the mission. Streaming one out deleted the car a
      // 'steal' objective was pointing at before the player could walk to it,
      // and made a 'chase' target that simply outran the radius read as caught.
      if (dist2 > this.despawnRadius * this.despawnRadius && v !== player.vehicle && !v.missionVehicle) {
        v.dispose();
        this.vehicles.splice(i, 1);
        this._stats.despawned++;
        continue;
      }
      // An ambient car that has come to rest on its roof is scenery now, and it
      // never rights itself. Once it has been like that for a few seconds and is
      // far enough back not to vanish in front of anyone, let it go — otherwise
      // wrecks accumulate until a third of the traffic in the city is upside
      // down. The player's own car is never touched.
      if (v !== player.vehicle && v.sim.flipTimer > 5 && dist2 > 55 * 55) {
        v.dispose();
        this.vehicles.splice(i, 1);
        this._stats.despawned++;
        continue;
      }
      if (v.aiDriver && v !== player.vehicle) v.aiDriver.update(dt);
      v.update(dt);
    }

    // --- spawn ---
    this.budget = ctx.settings.preset.trafficBudget;
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.vehicles.length < this.budget) {
      this.spawnTimer = 0.22;
      this._trySpawn(px, pz);
    }

    // --- parked cars stream in and out with the player ---
    this._updateParked(px, pz, dt);
  }

  _trySpawn(px, pz) {
    const ctx = this.ctx;
    const graph = ctx.world.roads;
    const rng = this.rng;
    for (let attempt = 0; attempt < 6; attempt++) {
      const a = rng.range(0, Math.PI * 2);
      const r = rng.range(this.spawnRadius.min, this.spawnRadius.max);
      const x = px + Math.cos(a) * r;
      const z = pz + Math.sin(a) * r;
      const near = graph.nearestEdge(x, z, 40);
      if (!near) continue;
      const e = near.edge;
      const d = e.district || districtAt(e.a.x, e.a.z);
      if (!d) continue;
      if (rng.float() > d.trafficDensity) continue;
      const t = clamp(near.t, 0.1, 0.9);
      const dir = rng.bool() ? 1 : -1;
      const lane = rng.int(0, Math.max(0, e.lanesPerDir - 1));
      e.lanePoint(dir, lane, t, _v1);
      const y = ctx.physics.groundHeight(_v1.x, _v1.z);
      // Keep clear of the camera and of anything already there.
      const camD = Math.hypot(_v1.x - ctx.camera.position.x, _v1.z - ctx.camera.position.z);
      if (camD < 45) continue;
      if (this._occupied(_v1.x, _v1.z, 7)) continue;

      const id = this._pickVehicle(d, rng);
      const def = getVehicle(id);
      if (!def) continue;
      const yaw = Math.atan2(e.dx * dir, e.dz * dir);
      const v = new Vehicle(ctx, def, { rng, x: _v1.x, y: y + rideHeightFor(def), z: _v1.z, yaw });
      const ai = new VehicleAI(v, graph, rng, DRIVER_MODE.TRAFFIC);
      ai.edge = e; ai.dir = dir; ai.lane = lane; ai.t = t;
      v.aiDriver = ai;
      v.sim.velocity.set(e.dx * dir * 8, 0, e.dz * dir * 8);
      this.vehicles.push(v);
      this._stats.spawned++;
      return v;
    }
    return null;
  }

  _pickVehicle(district, rng) {
    const mix = district.vehicleMix;
    for (let i = 0; i < 6; i++) {
      const pick = rng.weighted(mix, (o) => o.w);
      const pool = vehiclesByClass(pick.cls).filter((v) => v.spawnWeight > 0 && !v.tags.includes('police'));
      if (pool.length) return rng.weighted(pool, (v) => v.spawnWeight).id;
    }
    const any = VEHICLES.filter((v) => v.spawnWeight > 0 && !v.tags.includes('police'));
    return rng.weighted(any, (v) => v.spawnWeight).id;
  }

  _occupied(x, z, r) {
    for (const v of this.vehicles) {
      const dx = v.sim.position.x - x, dz = v.sim.position.z - z;
      if (dx * dx + dz * dz < r * r) return true;
    }
    const p = this.ctx.player;
    if (p && Math.hypot(p.position.x - x, p.position.z - z) < r) return true;
    return false;
  }

  /** Parked cars fill out the streets without costing a driver. */
  _updateParked(px, pz, dt) {
    const ctx = this.ctx;
    const slots = ctx.world.parkedSlots;
    if (!slots || !slots.length) return;
    const wanted = Math.min(28, Math.floor(this.budget * 0.4));
    // remove distant
    for (let i = this.parked.length - 1; i >= 0; i--) {
      const v = this.parked[i];
      if (v.dead) { this.parked.splice(i, 1); continue; }
      const dx = v.sim.position.x - px, dz = v.sim.position.z - pz;
      if (dx * dx + dz * dz > 230 * 230 && !v.driver && v !== ctx.player?.vehicle) {
        v.dispose();
        this.parked.splice(i, 1);
      }
    }
    if (this.parked.length >= wanted) return;
    const rng = this.rng;
    for (let attempt = 0; attempt < 4; attempt++) {
      const slot = slots[rng.int(0, slots.length - 1)];
      const dx = slot.x - px, dz = slot.z - pz;
      const d2 = dx * dx + dz * dz;
      if (d2 > 160 * 160 || d2 < 25 * 25) continue;
      if (this._occupied(slot.x, slot.z, 4) || this.parked.some((v) => Math.hypot(v.sim.position.x - slot.x, v.sim.position.z - slot.z) < 4)) continue;
      const d = districtAt(slot.x, slot.z);
      const id = this._pickVehicle(d, rng);
      const def = getVehicle(id);
      if (!def) continue;
      const y = ctx.physics.groundHeight(slot.x, slot.z);
      const v = new Vehicle(ctx, def, { rng, x: slot.x, y: y + rideHeightFor(def), z: slot.z, yaw: slot.yaw });
      v.aiDriver = new VehicleAI(v, ctx.world.roads, rng, DRIVER_MODE.PARKED);
      v.locked = rng.bool(0.25);
      this.parked.push(v);
      return;
    }
  }

  /** Spawn a specific vehicle for missions or the player. */
  spawnAt(defOrId, x, z, yaw, opts = {}) {
    const ctx = this.ctx;
    const def = typeof defOrId === 'string' ? getVehicle(defOrId) : defOrId;
    if (!def) return null;
    const y = ctx.physics.groundHeight(x, z) + rideHeightFor(def);
    const v = new Vehicle(ctx, def, { rng: this.rng, x, y, z, yaw: yaw || 0, ...opts });
    if (opts.ai !== false) {
      v.aiDriver = new VehicleAI(v, ctx.world.roads, this.rng, opts.mode || DRIVER_MODE.PARKED);
      if (opts.mode && opts.mode !== DRIVER_MODE.PARKED) v.aiDriver.attachToNearestEdge(x, z);
    }
    (opts.parked ? this.parked : this.vehicles).push(v);
    return v;
  }

  nearestVehicle(x, z, maxR = 12, filter) {
    let best = null, bestD = maxR * maxR;
    const check = (v) => {
      if (v.dead || (filter && !filter(v))) return;
      const dx = v.sim.position.x - x, dz = v.sim.position.z - z;
      const d = dx * dx + dz * dz;
      if (d < bestD) { bestD = d; best = v; }
    };
    for (const v of this.vehicles) check(v);
    for (const v of this.parked) check(v);
    return best;
  }

  all() { return this.vehicles.concat(this.parked); }

  clear() {
    for (const v of this.vehicles) v.dispose();
    for (const v of this.parked) v.dispose();
    this.vehicles.length = 0;
    this.parked.length = 0;
  }
}
