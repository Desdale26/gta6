// police.js — the wanted system and the response it summons.
//
// Heat rises with what you do and where you do it, decays when nobody can see you, and
// drives escalating waves: patrol cars, then interceptors, then roadblocks and a helicopter.
import * as THREE from 'three';
import { clamp, lerp, damp, angleDamp } from '../core/mathx.js';
import { VehicleAI, DRIVER_MODE } from '../entities/traffic.js';
import { LAYER, MASK_SOLID } from '../physics/world.js';
import { getVehicle, VEHICLES } from '../content/vehicleCatalog.js';
import { districtAt } from '../content/districtCatalog.js';

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();

export const CRIME = {
  trespass: 4, vandalism: 8, carTheft: 22, assault: 30, shotFired: 18, shopRobbery: 45,
  killCivilian: 65, killCop: 130, explosion: 70, vehicleDestroyed: 26, hitAndRun: 24,
  recklessDriving: 3, resistingArrest: 40, bankRobbery: 160,
};

const STAR_THRESHOLDS = [0, 40, 120, 260, 470, 760];

const WAVE = [
  { cars: 0, peds: 0, helis: 0, weapon: null, aggression: 0 },
  { cars: 1, peds: 1, helis: 0, weapon: 'nightstick', aggression: 0.25 },
  { cars: 2, peds: 2, helis: 0, weapon: 'pistol-9', aggression: 0.45 },
  { cars: 3, peds: 3, helis: 1, weapon: 'combat-pistol', aggression: 0.65 },
  { cars: 4, peds: 4, helis: 1, weapon: 'smg', aggression: 0.85 },
  { cars: 6, peds: 6, helis: 2, weapon: 'carbine-rifle', aggression: 1.0 },
];

export class PoliceSystem {
  constructor(ctx) {
    this.ctx = ctx;
    this.heat = 0;
    this.stars = 0;
    this.maxStarsSeen = 0;
    this.units = [];           // police vehicles
    this.officers = [];        // on-foot cops
    this.helis = [];
    this.lastSeen = { x: 0, z: 0, time: -99 };
    this.searching = false;
    this.searchTimer = 0;
    this.spawnTimer = 0;
    this.decayGrace = 0;
    this.rng = ctx.rng.fork('police');
    this.bustTimer = 0;
    this.bustRadius = 3.2;
    this.enabled = true;
    this.totalCrimes = 0;
    this._sirenWail = null;

    ctx.bus.on('combat:hit', (e) => this._onHit(e));
    ctx.bus.on('weapon:fired', () => this.report(CRIME.shotFired, { quiet: true }));
    ctx.bus.on('explosion', (e) => {
      if (e.source === ctx.player || e.source?.isPlayer) this.report(CRIME.explosion);
    });
    ctx.bus.on('player:enteredVehicle', (e) => { if (e.stolen) this.report(CRIME.carTheft); });
    ctx.bus.on('vehicle:explode', (e) => {
      if (e.source === ctx.player || e.source?.isPlayer) this.report(CRIME.vehicleDestroyed);
    });
    // Running someone over. Gunfire kills arrive on 'combat:hit' and explosion
    // kills are charged once at the blast, so this handles only the case neither
    // of those sees: a body under the player's own wheels. Without it
    // CRIME.hitAndRun and CRIME.killCivilian were unreachable from a car and you
    // could drive through a crowd without ever earning a star.
    ctx.bus.on('ped:killed', (e) => this._onPedRunOver(e));
  }

  _onPedRunOver(e) {
    const killer = e.source;
    if (!killer || !killer.isVehicle) return;
    if (killer !== this.ctx.player?.vehicle) return;   // an AI car's mess is not yours
    this.report(e.ped?.isCop ? CRIME.killCop : CRIME.killCivilian);
    this.report(CRIME.hitAndRun);
  }

  get wanted() { return this.stars; }

  /** Add heat. Witnesses and district policing scale the result. */
  report(amount, opts = {}) {
    if (!this.enabled) return;
    const ctx = this.ctx;
    const player = ctx.player;
    if (!player || player.dead) return;

    // Nobody saw it, nobody cares — mostly.
    const witnesses = this._witnessCount(opts.quiet ? 22 : 45);
    const district = districtAt(player.position.x, player.position.z);
    const policing = district ? district.policePresence : 0.5;
    let scale = (0.25 + Math.min(1, witnesses * 0.35)) * (0.55 + policing * 0.9);
    if (opts.quiet && witnesses === 0) scale *= 0.12;
    if (this.stars > 0) scale *= 1.35;             // already being hunted

    this.heat = Math.min(STAR_THRESHOLDS[5] + 420, this.heat + amount * scale);
    this.totalCrimes++;
    this.decayGrace = 6;
    this._see(player.position.x, player.position.z);
    this._recalcStars();
  }

  _witnessCount(radius) {
    const ctx = this.ctx;
    let n = 0;
    if (ctx.peds) {
      for (const p of ctx.peds.peds) {
        if (p.dead) continue;
        const d = Math.hypot(p.body.position.x - ctx.player.position.x, p.body.position.z - ctx.player.position.z);
        if (d < radius) n += p.isCop ? 3 : 1;
        if (n > 8) break;
      }
    }
    for (const u of this.units) {
      if (u.dead) continue;
      const d = Math.hypot(u.sim.position.x - ctx.player.position.x, u.sim.position.z - ctx.player.position.z);
      if (d < radius * 1.6) n += 3;
    }
    return n;
  }

  _recalcStars() {
    let s = 0;
    for (let i = 5; i >= 1; i--) {
      if (this.heat >= STAR_THRESHOLDS[i]) { s = i; break; }
    }
    if (s !== this.stars) {
      const up = s > this.stars;
      this.stars = s;
      this.maxStarsSeen = Math.max(this.maxStarsSeen, s);
      this.ctx.player.wanted = s;
      this.ctx.bus.emit('wanted:changed', { stars: s, up });
      if (up) this.ctx.audio?.play('uiWanted', { volume: 0.6, ui: true });
    }
  }

  _see(x, z) {
    this.lastSeen.x = x;
    this.lastSeen.z = z;
    this.lastSeen.time = this.ctx.time.elapsed;
    this.searching = false;
    this.searchTimer = 0;
  }

  clear() {
    this.heat = 0;
    this._recalcStars();
    this._dismissAll();
    this.ctx.bus.emit('wanted:cleared', {});
  }
  setStars(n) {
    this.heat = STAR_THRESHOLDS[clamp(n, 0, 5)] + 5;
    this._recalcStars();
  }

  _onHit(e) {
    const ctx = this.ctx;
    if (e.source !== ctx.player) return;
    if (e.target && e.target.isPed) {
      if (e.killed) this.report(e.target.isCop ? CRIME.killCop : CRIME.killCivilian);
      else this.report(CRIME.assault * 0.5);
    }
  }

  // -------------------------------------------------------------------------
  update(dt) {
    if (!this.enabled) return;
    const ctx = this.ctx;
    const player = ctx.player;
    if (!player) return;

    // --- visibility / search ---
    const visible = this._policeCanSee();
    if (visible) this._see(player.position.x, player.position.z);
    else if (this.stars > 0) {
      this.searchTimer += dt;
      if (this.searchTimer > 3) this.searching = true;
    }

    // --- heat decay ---
    this.decayGrace = Math.max(0, this.decayGrace - dt);
    if (this.stars > 0 && this.decayGrace <= 0 && !visible) {
      // Higher stars take longer to shake.
      const rate = lerp(12, 4.5, (this.stars - 1) / 4);
      this.heat = Math.max(0, this.heat - rate * dt);
      this._recalcStars();
      if (this.stars === 0) this._dismissAll();
    } else if (this.stars > 0 && visible) {
      this.heat = Math.min(STAR_THRESHOLDS[5] + 420, this.heat + dt * 1.4);
    }

    // --- spawn / manage units ---
    const wave = WAVE[this.stars];
    this.spawnTimer -= dt;
    this._prune();
    if (this.stars > 0 && this.spawnTimer <= 0) {
      this.spawnTimer = lerp(4.5, 1.6, (this.stars - 1) / 4);
      if (this.units.length < wave.cars) this._spawnCar(wave);
      else if (this.officers.length < wave.peds && this.rng.bool(0.5)) this._spawnOfficer(wave);
      if (this.helis.length < wave.helis) this._spawnHeli();
    }

    this._updateUnits(dt, wave);
    this._updateHelis(dt);
    this._updateBust(dt);
  }

  _policeCanSee() {
    const ctx = this.ctx;
    const p = ctx.player.position;
    for (const u of this.units) {
      if (u.dead) continue;
      const d = Math.hypot(u.sim.position.x - p.x, u.sim.position.z - p.z);
      if (d < 70 && !this._blocked(u.sim.position, p)) return true;
    }
    for (const o of this.officers) {
      if (o.dead) continue;
      const d = Math.hypot(o.body.position.x - p.x, o.body.position.z - p.z);
      if (d < 45 && !this._blocked(o.body.position, p)) return true;
    }
    for (const h of this.helis) {
      const d = Math.hypot(h.position.x - p.x, h.position.z - p.z);
      if (d < 90) return true;
    }
    // Cop pedestrians count as eyes too.
    if (ctx.peds) {
      for (const ped of ctx.peds.peds) {
        if (!ped.isCop || ped.dead) continue;
        const d = Math.hypot(ped.body.position.x - p.x, ped.body.position.z - p.z);
        if (d < 40 && !this._blocked(ped.body.position, p)) return true;
      }
    }
    return false;
  }

  _blocked(a, b) {
    const dx = b.x - a.x, dy = (b.y + 1) - (a.y + 1), dz = b.z - a.z;
    const d = Math.hypot(dx, dy, dz);
    if (d < 1) return false;
    const hit = this.ctx.physics.raycast(a.x, a.y + 1.2, a.z, dx / d, dy / d, dz / d, d - 0.6,
      LAYER.BUILDING | LAYER.PROP);
    return hit.hit;
  }

  _prune() {
    for (let i = this.units.length - 1; i >= 0; i--) {
      const u = this.units[i];
      if (u.dead || u.sim.exploded) { if (!u.dead) u.dispose(); this.units.splice(i, 1); continue; }
      const d = Math.hypot(u.sim.position.x - this.ctx.player.position.x, u.sim.position.z - this.ctx.player.position.z);
      if (d > 340 || this.stars === 0) { u.dispose(); this.units.splice(i, 1); }
    }
    for (let i = this.officers.length - 1; i >= 0; i--) {
      const o = this.officers[i];
      if (o.dead && o.despawnTimer > 20) { this.officers.splice(i, 1); continue; }
      const d = Math.hypot(o.body.position.x - this.ctx.player.position.x, o.body.position.z - this.ctx.player.position.z);
      if (d > 200 || (this.stars === 0 && !o.dead)) { o.dispose(); this.officers.splice(i, 1); }
    }
  }

  _dismissAll() {
    for (const u of this.units) { u.sirenOn = false; if (u.aiDriver) u.aiDriver.mode = DRIVER_MODE.TRAFFIC; }
    for (const o of this.officers) { o.threat = null; o._setState('wander'); }
    // Let them drive off rather than vanishing.
    setTimeout(() => this._prune(), 4000);
    // The rotor loop has to be stopped here as well. Emptying this.helis was
    // the only teardown, and _updateHelis -- the one place that calls
    // h.sound.stop() -- iterates that same array: every wanted level that ended
    // left a helicopter droning over the city with nothing left to switch it off.
    for (const h of this.helis) {
      h.sound?.stop();
      h.sound = null;
      this.ctx.lights?.releaseSpot(h);
      h.spot = null;
      this.ctx.scene.remove(h.group);
    }
    this.helis.length = 0;
  }

  _spawnCar(wave) {
    const ctx = this.ctx;
    const player = ctx.player;
    const graph = ctx.world.roads;
    const rng = this.rng;
    const pool = VEHICLES.filter((v) => v.tags.includes('police') && v.cls === 'emergency');
    if (!pool.length) return;
    // Higher stars bring faster cars.
    const def = this.stars >= 4 ? rng.pick(pool) : pool[Math.min(this.stars - 1, pool.length - 1)] || pool[0];

    for (let attempt = 0; attempt < 8; attempt++) {
      const a = rng.range(0, Math.PI * 2);
      const r = rng.range(95, 175);
      const x = player.position.x + Math.cos(a) * r;
      const z = player.position.z + Math.sin(a) * r;
      const near = graph.nearestEdge(x, z, 45);
      if (!near) continue;
      const e = near.edge;
      const dir = rng.bool() ? 1 : -1;
      e.lanePoint(dir, 0, clamp(near.t, 0.1, 0.9), _v1);
      const y = ctx.physics.groundHeight(_v1.x, _v1.z);
      if (Math.hypot(_v1.x - ctx.camera.position.x, _v1.z - ctx.camera.position.z) < 60) continue;

      const v = ctx.traffic.spawnAt(def, _v1.x, _v1.z, Math.atan2(e.dx * dir, e.dz * dir), { ai: false });
      if (!v) continue;
      const ai = new VehicleAI(v, graph, rng, DRIVER_MODE.CHASE);
      ai.chaseTarget = player;
      ai.aggression = 0.65 + wave.aggression * 0.35;
      ai.attachToNearestEdge(_v1.x, _v1.z);
      v.aiDriver = ai;
      v.sirenOn = true;
      v.wanted = true;
      v.attachHeadlightSpots();
      // Put officers in it.
      const seats = Math.min(2, def.seats || 2);
      for (let s = 0; s < seats; s++) {
        const ped = ctx.peds.spawn(this.stars >= 4 ? 'cop-swat' : 'cop-patrol', _v1.x, _v1.z, 0, { y });
        ped.armed = wave.weapon;
        ped.threat = player;
        ped.copVehicle = v;
        ped.setVisible(false);
        ped.inVehicle = v;
        ped.vehicleSeat = s;
        v.enter(ped, s);
        this.officers.push(ped);
      }
      this.units.push(v);
      return v;
    }
    return null;
  }

  _spawnOfficer(wave) {
    const ctx = this.ctx;
    const rng = this.rng;
    const player = ctx.player;
    const a = rng.range(0, Math.PI * 2);
    const r = rng.range(35, 70);
    const x = player.position.x + Math.cos(a) * r;
    const z = player.position.z + Math.sin(a) * r;
    if (ctx.physics.terrain.isWater(x, z)) return null;
    const ped = ctx.peds.spawn(this.stars >= 4 ? 'cop-swat' : 'cop-patrol', x, z, 0, {});
    ped.armed = wave.weapon;
    ped.threat = player;
    ped._setState('combat');
    this.officers.push(ped);
    return ped;
  }

  /** The helicopter is a simple flying spotlight that keeps you lit up. */
  _spawnHeli() {
    const ctx = this.ctx;
    const player = ctx.player;
    const group = new THREE.Group();
    const mats = ctx.materials;
    const bodyMat = mats.carPaint(0x1b2430, { metallic: 0.5, roughness: 0.4 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.9, 2.6, 3, 10), bodyMat);
    body.rotation.x = Math.PI / 2;
    group.add(body);
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.3, 4.4, 8), bodyMat);
    tail.rotation.x = Math.PI / 2;
    tail.position.z = -3.4;
    group.add(tail);
    const rotor = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 7.5), mats.plasticBlack);
      blade.rotation.y = (i / 4) * Math.PI * 2;
      rotor.add(blade);
    }
    rotor.position.y = 1.15;
    group.add(rotor);
    const tailRotor = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 1.6), mats.plasticBlack);
      blade.rotation.z = (i / 3) * Math.PI * 2;
      tailRotor.add(blade);
    }
    tailRotor.position.set(0.25, 0.4, -5.4);
    tailRotor.rotation.y = Math.PI / 2;
    group.add(tailRotor);

    // The searchlight is borrowed from the fixed light pool rather than built
    // here. A SpotLight added to the scene with the helicopter and removed with
    // it changes the scene's spot-light count, and that count is part of every
    // material's shader cache key — so the arrival of the police recompiled the
    // whole city, and so did their departure.

    const p = player.position;
    group.position.set(p.x + 60, 58, p.z + 60);
    ctx.scene.add(group);

    const heli = {
      group, rotor, tailRotor, spot: null, position: group.position,
      vel: new THREE.Vector3(), fireTimer: 2, sound: null,
    };
    heli.sound = ctx.audio?.startLoop('helicopterLoop', { volume: 0.5, position: group.position, maxDistance: 260, refDistance: 25 });
    this.helis.push(heli);
    return heli;
  }

  _updateUnits(dt, wave) {
    const ctx = this.ctx;
    const player = ctx.player;
    for (const u of this.units) {
      if (u.dead) continue;
      if (u.aiDriver) {
        u.aiDriver.chaseTarget = this.searching
          ? { position: _v1.set(this.lastSeen.x, 0, this.lastSeen.z), dead: false }
          : player;
        u.aiDriver.mode = DRIVER_MODE.CHASE;
      }
      u.sirenOn = this.stars > 0;
      // PIT manoeuvre: at speed and alongside, nudge the player.
      if (player.vehicle && this.stars >= 3) {
        const d = u.sim.position.distanceTo(player.vehicle.sim.position);
        if (d < 6.5 && u.sim.speed > 12) {
          _v2.copy(player.vehicle.sim.position).sub(u.sim.position).normalize();
          u.sim.applyImpulseAt(_v2.x * u.sim.mass * 2.4, 0, _v2.z * u.sim.mass * 2.4,
            u.sim.position.x, u.sim.position.y, u.sim.position.z);
        }
      }
    }
    // Officers riding along bail out when they're close enough to shoot.
    for (const o of this.officers) {
      if (o.dead || !o.inVehicle) continue;
      const v = o.inVehicle;
      if (v.dead || v.sim.exploded) { this._deployOfficer(o, v); continue; }
      const d = v.sim.position.distanceTo(player.position);
      if (d < 22 && v.sim.speed < 6) this._deployOfficer(o, v);
      else {
        o.body.teleport(v.sim.position.x, v.sim.position.y, v.sim.position.z, o.yaw);
      }
    }
  }

  _deployOfficer(officer, vehicle) {
    officer.inVehicle = null;
    vehicle.exit(officer);
    officer.setVisible(true);
    vehicle.doorPoint(1, _v1);
    officer.body.teleport(_v1.x, this.ctx.physics.groundHeight(_v1.x, _v1.z) + 0.1, _v1.z, officer.yaw);
    officer.threat = this.ctx.player;
    officer._setState('combat');
  }

  _updateHelis(dt) {
    const ctx = this.ctx;
    const player = ctx.player;
    for (let i = this.helis.length - 1; i >= 0; i--) {
      const h = this.helis[i];
      if (this.stars === 0) {
        h.sound?.stop();
        ctx.lights?.releaseSpot(h);
        h.spot = null;
        ctx.scene.remove(h.group);
        this.helis.splice(i, 1);
        continue;
      }
      const target = this.searching ? _v1.set(this.lastSeen.x, 0, this.lastSeen.z) : player.position;
      // Circle above the target.
      const t = ctx.time.elapsed * 0.28 + i * 2.1;
      const radius = 26;
      _v2.set(target.x + Math.cos(t) * radius, 0, target.z + Math.sin(t) * radius);
      const groundY = ctx.physics.groundHeight(_v2.x, _v2.z);
      const wantY = Math.max(groundY + 34, 42);
      h.vel.x = damp(h.vel.x, (_v2.x - h.position.x) * 0.6, 1.5, dt);
      h.vel.z = damp(h.vel.z, (_v2.z - h.position.z) * 0.6, 1.5, dt);
      h.vel.y = damp(h.vel.y, (wantY - h.position.y) * 0.8, 1.5, dt);
      h.position.addScaledVector(h.vel, dt);
      const heading = Math.atan2(h.vel.x, h.vel.z);
      // A heading, so angleDamp: damp across the +/-PI seam sends the helicopter
      // spinning on its axis instead of turning a few degrees.
      h.group.rotation.y = angleDamp(h.group.rotation.y, heading, 3, dt);
      h.group.rotation.z = clamp(-h.vel.x * 0.01, -0.35, 0.35);
      h.rotor.rotation.y += dt * 42;
      h.tailRotor.rotation.x += dt * 60;
      h.sound?.setPosition(h.position);

      // Searchlight tracks the player at night.
      const night = ctx.sky ? ctx.sky.palette.night : 0;
      if (night > 0.2) {
        if (!h.spot) h.spot = ctx.lights?.acquireSpots(h, 1, 8)[0] || null;
        if (h.spot) {
          h.spot.position.set(h.position.x, h.position.y - 0.6, h.position.z);
          h.spot.color.setHex(0xf0f6ff);
          h.spot.distance = 160;
          h.spot.angle = 0.22;
          h.spot.penumbra = 0.5;
          h.spot.intensity = 900;
          h.spot.target.position.copy(target);
          h.spot.target.updateMatrixWorld();
        }
      } else if (h.spot) {
        ctx.lights?.releaseSpot(h);
        h.spot = null;
      }

      // Snipers on board at 5 stars.
      if (this.stars >= 5 && !this.searching) {
        h.fireTimer -= dt;
        if (h.fireTimer <= 0 && h.position.distanceTo(player.position) < 90) {
          h.fireTimer = 1.4 + Math.random();
          ctx.combat?.npcFire({ position: h.position, body: { position: h.position }, stats: { awareness: 0.55 }, height: 0 },
            player, 'carbine-rifle');
        }
      }
    }
  }

  /** Standing still next to a cop at low heat gets you arrested instead of shot. */
  _updateBust(dt) {
    const ctx = this.ctx;
    const player = ctx.player;
    if (this.stars === 0 || player.dead || player.inVehicle) { this.bustTimer = 0; return; }
    let near = false;
    for (const o of this.officers) {
      if (o.dead) continue;
      if (o.body.position.distanceTo(player.position) < this.bustRadius) { near = true; break; }
    }
    if (near && player.speed < 1.4) {
      this.bustTimer += dt;
      if (this.bustTimer > 1.6) {
        this.bustTimer = 0;
        player.kill({ busted: true, source: 'police' });
      }
    } else {
      this.bustTimer = Math.max(0, this.bustTimer - dt * 2);
    }
  }

  stats() {
    return { stars: this.stars, heat: Math.round(this.heat), units: this.units.length,
      officers: this.officers.length, helis: this.helis.length, searching: this.searching };
  }
}
