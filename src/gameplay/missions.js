// missions.js — the mission interpreter.
//
// Missions are data (content/missionCatalog.js); this runs them: spawns what each objective
// needs, watches for completion, enforces fail conditions, and pays out.
import * as THREE from 'three';
import { clamp, formatMoney, formatTime } from '../core/mathx.js';
import { ACTS, MISSIONS, getMission, availableMissions } from '../content/missionCatalog.js';
import { getVehicle, randomVehicleId } from '../content/vehicleCatalog.js';
import { DRIVER_MODE, VehicleAI } from '../entities/traffic.js';
import { CRIME } from './police.js';

// Objective kinds whose completion is counted off `objectiveState.targets`.
// 'kill' is deliberately absent: an open rampage counts any kill and keeps
// `targets` empty on purpose.
const TARGET_KINDS = new Set(['killAll', 'destroy', 'chase', 'protect']);

const _v1 = new THREE.Vector3();


// ---------------------------------------------------------------------------
// Mission coronas
//
// A plain translucent cylinder reads as a solid slab of colour dropped in the
// road. These are meant to look like a column of light, so they fade out with
// height, glow brighter at the silhouette edges, breathe slowly, and add to the
// scene rather than tinting it — which also lets the bloom pass catch them.
// ---------------------------------------------------------------------------
const MARKER_VERT = `
varying vec2 vUv;
varying vec3 vView;
varying vec3 vNormalW;
void main() {
  vUv = uv;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vView = normalize(cameraPosition - world.xyz);
  vNormalW = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * world;
}`;

const MARKER_FRAG = `
uniform vec3 uColor;
uniform float uOpacity;
uniform float uTime;
varying vec2 vUv;
varying vec3 vView;
varying vec3 vNormalW;
void main() {
  // Solid at the base, gone by the top.
  float height = pow(clamp(1.0 - vUv.y, 0.0, 1.0), 1.7);
  // Brighter where the wall of the cylinder turns away from the camera, which
  // puts the light at the edges of the silhouette the way a real beam does.
  float rim = 1.0 - abs(dot(normalize(vNormalW), normalize(vView)));
  rim = 0.35 + 0.65 * pow(clamp(rim, 0.0, 1.0), 1.6);
  // A slow breath, plus a band travelling up the column.
  float pulse = 0.86 + 0.14 * sin(uTime * 1.8);
  float band = 0.12 * smoothstep(0.35, 0.0, abs(fract(vUv.y - uTime * 0.22) - 0.5) - 0.34);
  // Everything, the travelling band included, scales with the opacity — a band
  // that ignored it kept painting the screen after the column had faded out.
  float a = (height * rim * pulse + band * height) * uOpacity;
  gl_FragColor = vec4(uColor * (1.0 + band * 3.0), a);
}`;

function markerMaterial(color, opacity) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: opacity },
      uTime: { value: 0 },
    },
    vertexShader: MARKER_VERT,
    fragmentShader: MARKER_FRAG,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
}

export class MissionSystem {
  constructor(ctx) {
    this.ctx = ctx;
    this.completed = new Set();
    this.active = null;
    this.objectiveIndex = 0;
    this.objectiveState = null;
    this.markers = [];
    this.startMarkers = [];
    this.timer = 0;
    this.rng = ctx.rng.fork('missions');
    this.spawned = { peds: [], vehicles: [], pickups: [] };
    this.lastFailReason = '';
    this.replayCooldown = 0;
    this._markerGroup = new THREE.Group();
    this._markerGroup.name = 'missionMarkers';
    ctx.scene.add(this._markerGroup);
    this._buildStartMarkers();

    ctx.bus.on('ped:killed', (e) => this._onPedKilled(e));
    ctx.bus.on('vehicle:explode', (e) => this._onVehicleDestroyed(e));
    // `rob` used to complete the moment ctx.shops.robbery went back to null,
    // which happens when a robbery is ABANDONED as well as finished, and at
    // any shop in the city rather than the one the objective named.
    ctx.bus.on('robbery:finished', (e) => {
      if (!this.active || !this.objectiveState) return;
      this.objectiveState.lastRobbery = { shop: e.shop, take: e.take };
    });
  }

  // -------------------------------------------------------------------------
  get available() { return availableMissions(this.completed, { rep: this.ctx.economy.rep }); }

  _buildStartMarkers() {
    const ctx = this.ctx;
    const geo = new THREE.CylinderGeometry(1.5, 1.5, 6, 20, 1, true);
    for (const m of MISSIONS) {
      const color = m.type === 'story' ? 0xffc93c : m.type === 'heist' ? 0x4dff9e
        : m.type === 'race' ? 0x22e3ff : m.type === 'rampage' ? 0xff3b30 : 0xff2d95;
      const mesh = new THREE.Mesh(geo, markerMaterial(color, 0.3));
      mesh.userData.baseOpacity = 0.3;
      const y = ctx.physics ? ctx.physics.groundHeight(m.start.x, m.start.z) : 0;
      mesh.position.set(m.start.x, y + 3, m.start.z);
      mesh.visible = false;
      mesh.renderOrder = 2;
      this._markerGroup.add(mesh);
      this.startMarkers.push({ mission: m, mesh, color });
    }
  }

  refreshStartMarkers() {
    const ctx = this.ctx;
    for (const s of this.startMarkers) {
      const y = ctx.physics.groundHeight(s.mission.start.x, s.mission.start.z);
      s.mesh.position.y = y + 3;
    }
  }

  update(dt) {
    const ctx = this.ctx;
    const player = ctx.player;
    if (!player) return;
    this.replayCooldown = Math.max(0, this.replayCooldown - dt);

    // --- marker visibility + pulse ---
    const availableIds = new Set(this.available.map((m) => m.id));
    const t = ctx.time.elapsed;
    // One clock drives every corona's fade, breath and travelling band.
    const cam = ctx.camera.position;
    this._markerGroup.traverse((o) => {
      const u = o.material && o.material.uniforms;
      if (!u || !u.uTime) return;
      u.uTime.value = t;
      // Fade the column out as you walk into it — standing inside a corona
      // otherwise paints the whole screen its colour.
      const d = Math.hypot(o.position.x - cam.x, o.position.z - cam.z);
      const near = clamp((d - 2.5) / 7, 0, 1);
      u.uOpacity.value = (o.userData.baseOpacity ?? 0.3) * near;
    });
    for (const s of this.startMarkers) {
      const show = !this.active && availableIds.has(s.mission.id);
      if (s.mesh.visible !== show) s.mesh.visible = show;
      if (show) {
        const d = Math.hypot(s.mesh.position.x - player.position.x, s.mesh.position.z - player.position.z);
        s.mesh.visible = d < 220;
        s.mesh.rotation.y = t * 0.35;
      }
    }

    if (this.active) { this._updateActive(dt); return; }

    // --- start a mission by standing in its marker ---
    if (this.replayCooldown > 0) return;
    for (const s of this.startMarkers) {
      if (!s.mesh.visible) continue;
      const m = s.mission;
      const d = Math.hypot(m.start.x - player.position.x, m.start.z - player.position.z);
      if (d < (m.start.radius || 6)) {
        if (ctx.input.pressed('interact')) this.start(m.id);
        else this._nearMission = m;
        return;
      }
    }
    this._nearMission = null;
  }

  get promptText() {
    if (this.active || !this._nearMission) return null;
    const m = this._nearMission;
    return `<b>E</b> start &ldquo;${m.name}&rdquo; &middot; ${formatMoney(m.reward)}`;
  }

  // -------------------------------------------------------------------------
  start(id) {
    const ctx = this.ctx;
    const m = getMission(id);
    if (!m || this.active) return false;
    for (const r of m.requires) if (!this.completed.has(r)) return false;

    this.active = m;
    this.objectiveIndex = 0;
    this.timer = m.fail.timeLimit || 0;
    this.lastFailReason = '';
    this._clearSpawned();

    if (m.wantedOnStart) ctx.police.setStars(m.wantedOnStart);
    if (m.music) ctx.radio?.setStationById(m.music);
    if (m.vehicleHint) {
      const v = ctx.traffic.spawnAt(m.vehicleHint, m.start.x + 5, m.start.z + 5, 0, { ai: false });
      if (v) this.spawned.vehicles.push(v);
    }

    ctx.bus.emit('mission:started', { mission: m });
    ctx.notify?.big(m.name, m.act ? `${ACTS[m.act]} \u00b7 ${m.giver}` : m.giver);
    ctx.dialogs?.play(m.briefing);
    this._beginObjective();
    return true;
  }

  get objective() { return this.active ? this.active.objectives[this.objectiveIndex] : null; }

  _beginObjective() {
    const o = this.objective;
    if (!o) return;
    const ctx = this.ctx;
    this.objectiveState = { time: 0, count: 0, need: o.count || 1, checkpoint: 0, lap: 1, targets: [], collected: 0 };
    this._clearMarkers();

    switch (o.kind) {
      case 'goto': case 'deliver': case 'rob': case 'wait': case 'photo': case 'stunt':
        if (o.x !== undefined) this._addMarker(o.x, o.z, o.radius || 8, o.marker || 'goto');
        break;
      case 'race':
        if (o.checkpoints && o.checkpoints.length) {
          this._addMarker(o.checkpoints[0][0], o.checkpoints[0][1], 9, 'checkpoint');
        }
        break;
      case 'steal':
        this._spawnMissionVehicle(o);
        break;
      case 'kill': case 'killAll':
        this._spawnEnemies(o);
        break;
      case 'chase':
        this._spawnChaseTarget(o);
        break;
      case 'destroy':
        this._spawnDestroyTargets(o);
        break;
      case 'collect':
        this._spawnPickups(o);
        break;
      case 'protect':
        this._spawnProtectee(o);
        break;
      case 'survive':
        if (o.x !== undefined) this._addMarker(o.x, o.z, o.radius || 25, 'goto');
        this._spawnEnemies({ ...o, count: 4 });
        break;
      default: break;
    }
    // Mid-mission dialogue: each objective can carry its own lines, so the story
    // keeps talking while you drive instead of front-loading everything into the
    // briefing and then going silent for eight minutes.
    // An objective whose completion is counted off `targets` can never finish if
    // nothing was put in there. That is exactly how 'destroy' went thirteen
    // missions without a spawner: nothing threw, nothing warned, the objective
    // simply never completed and the mission timed out or the player gave up.
    if (TARGET_KINDS.has(o.kind) && !this.objectiveState.targets.length) {
      const msg = `objective "${o.kind}" in ${this.active.id} spawned no targets, so it can never complete`;
      console.error('[missions]', msg);
      ctx.game?.errors.push(msg);
    }
    if (o.say && o.say.length) ctx.dialogs?.play(o.say);
    ctx.bus.emit('mission:objective', { mission: this.active, objective: o, index: this.objectiveIndex });
  }

  _updateActive(dt) {
    const ctx = this.ctx;
    const player = ctx.player;
    const m = this.active;
    const o = this.objective;
    if (!o) { this._complete(); return; }
    const st = this.objectiveState;
    st.time += dt;

    // --- fail conditions ---
    if (m.fail.onDeath && player.dead) { this._fail('You died'); return; }
    if (m.fail.timeLimit) {
      this.timer -= dt;
      if (this.timer <= 0) { this._fail('Out of time'); return; }
    }
    if (m.fail.onWanted && ctx.police.stars >= m.fail.onWanted) { this._fail('Too much heat'); return; }
    if (m.fail.onVehicleDestroyed && this.spawned.vehicles.some((v) => v.dead || v.sim.exploded)) {
      this._fail('The vehicle was destroyed'); return;
    }

    let done = false;
    const p = player.position;

    switch (o.kind) {
      case 'goto':
        done = dist2D(p, o) < (o.radius || 8);
        break;
      case 'deliver':
        done = dist2D(p, o) < (o.radius || 10) && (!o.inVehicle || player.inVehicle);
        break;
      case 'steal':
        // st.targets is this objective's car; spawned.vehicles accumulates over
        // the whole mission, so a second 'steal' completed the instant it began
        // if the player was still sitting in the first one.
        done = !!player.vehicle && st.targets.includes(player.vehicle);
        break;
      case 'rob': {
        if (ctx.shops.robbery && ctx.shops.robbery.shop) st.robbing = true;
        // A robbery that paid out, at the shop the objective points at if it
        // names one. Watching ctx.shops.robbery go back to null counted an
        // abandoned hold-up, and counted one at a shop on the other side of town.
        const r = st.lastRobbery;
        const rightShop = !r ? false
          : (o.x === undefined || dist2D({ x: r.shop.x, z: r.shop.z }, o) < (o.radius || 25));
        done = !!r && r.take > 0 && rightShop;
        if (r && !done) st.lastRobbery = null;      // wrong shop, or nothing taken
        if (!done && !st.robbing && dist2D(p, o) < (o.radius || 12) && ctx.shops.nearby) {
          // Nudge the player toward the right verb.
          st.hint = true;
        }
        break;
      }
      case 'kill': case 'killAll':
        done = st.count >= st.need;
        if (o.seconds && st.time > o.seconds) { this._fail('Ran out of time'); return; }
        break;
      case 'destroy':
        done = st.count >= st.need;
        break;
      case 'collect':
        this._updatePickups();
        done = st.collected >= st.need;
        break;
      case 'survive':
        // "Hold the yard for ninety seconds" has to mean holding the yard. The
        // bare timer was satisfied by driving away and waiting it out.
        if (o.x !== undefined && dist2D(p, o) > (o.radius || 30) * 1.6) st.time = Math.max(0, st.time - dt * 2);
        done = st.time >= (o.seconds || 60);
        this._maintainEnemies(o, dt);
        break;
      case 'wait':
        done = st.time >= (o.seconds || 30)
          && (o.x === undefined || dist2D(p, o) < (o.radius || 20));
        break;
      case 'escape': {
        const from = _v1.set(o.x ?? m.start.x, 0, o.z ?? m.start.z);
        done = st.time >= (o.seconds || 60) || Math.hypot(p.x - from.x, p.z - from.z) > 220;
        break;
      }
      case 'losewanted':
        done = ctx.police.stars === 0;
        if (o.seconds && st.time > o.seconds * 3) { this._fail('Could not shake them'); return; }
        break;
      case 'race':
        done = this._updateRace(o, st, dt);
        break;
      case 'chase': {
        const target = st.targets[0];
        // A wrecked target counts as caught. A target that is simply gone does
        // not -- that used to complete the objective, which meant the surest way
        // to finish a chase was to let the car get away.
        if (!target) { this._fail('Lost the target'); return; }
        if (target.dead) { done = true; break; }
        const d = Math.hypot(target.sim ? target.sim.position.x - p.x : target.body.position.x - p.x,
          target.sim ? target.sim.position.z - p.z : target.body.position.z - p.z);
        this._moveMarker(0, target.sim ? target.sim.position : target.body.position);
        if (d > 320) { this._fail('Target escaped'); return; }
        done = d < (o.radius || 14);
        break;
      }
      case 'protect': {
        const ally = st.targets[0];
        if (!ally) { done = true; break; }
        if (ally.dead) { this._fail('Your passenger died'); return; }
        this._moveMarker(0, ally.body ? ally.body.position : ally.sim.position);
        done = st.time >= (o.seconds || 60);
        break;
      }
      case 'photo':
        done = dist2D(p, o) < (o.radius || 18) && ctx.input.pressed('interact');
        if (done) ctx.audio?.play('cameraShutter', { ui: true });
        break;
      case 'stunt':
        // ctx.stunts.maxAirTime is a lifetime best and is restored from the save,
        // so reading it meant the objective was already complete before it
        // started for anyone who had ever landed a big jump. Track the peak
        // reached during THIS objective instead.
        st.airPeak = Math.max(st.airPeak || 0, ctx.stunts.airTime);
        if (o.seconds) done = st.airPeak >= o.seconds;
        else done = dist2D(p, o) < (o.radius || 40) && ctx.stunts.airTime > 0.9;
        break;
      default:
        done = true;
    }

    if (done) this._advance();
  }

  _advance() {
    this.objectiveIndex++;
    this.ctx.audio?.play('checkpoint', { ui: true, volume: 0.45 });
    if (this.objectiveIndex >= this.active.objectives.length) this._complete();
    else this._beginObjective();
  }

  _complete() {
    const ctx = this.ctx;
    const m = this.active;
    this.completed.add(m.id);
    ctx.economy.earn(m.reward, `Mission: ${m.name}`);
    ctx.economy.addRep(m.rewardRep || 10);
    if (m.wantedOnEnd !== undefined) ctx.police.setStars(m.wantedOnEnd);
    ctx.notify?.big('MISSION PASSED', formatMoney(m.reward));
    ctx.audio?.play('missionPass', { ui: true, volume: 0.7 });
    ctx.bus.emit('mission:completed', { mission: m, reward: m.reward });
    if (m.debrief && m.debrief.length) ctx.dialogs?.play(m.debrief);
    this._cleanup();
    ctx.game?.save();
  }

  _fail(reason) {
    const ctx = this.ctx;
    const m = this.active;
    this.lastFailReason = reason;
    ctx.notify?.big('MISSION FAILED', reason);
    ctx.audio?.play('missionFail', { ui: true, volume: 0.7 });
    ctx.bus.emit('mission:failed', { mission: m, reason });
    this._cleanup();
    this.replayCooldown = 4;
  }

  abandon() {
    if (!this.active) return;
    this._fail('Abandoned');
  }

  _cleanup() {
    this.active = null;
    this.objectiveIndex = 0;
    this.objectiveState = null;
    this.timer = 0;
    this._clearMarkers();
    this._clearSpawned();
  }

  // -------------------------------------------------------------------------
  // Spawning helpers
  // -------------------------------------------------------------------------
  _spawnMissionVehicle(o) {
    const ctx = this.ctx;
    const id = o.targetVehicle || randomVehicleId(this.rng, { classes: ['sports', 'coupe', 'sedan', 'muscle'] });
    const spot = ctx.world.safeRoadPoint(o.x, o.z);
    const v = ctx.traffic.spawnAt(id, spot.x, spot.z, spot.yaw, { ai: false });
    if (v) {
      this.spawned.vehicles.push(v);
      this._addMarker(spot.x, spot.z, 5, 'pickup');
      v.missionVehicle = true;
    }
  }

  _spawnEnemies(o) {
    const ctx = this.ctx;
    const st = this.objectiveState;
    const n = o.count || 3;
    const cx = o.x ?? ctx.player.position.x;
    const cz = o.z ?? ctx.player.position.z;
    const radius = o.radius || 30;
    const archetypes = ['gang-viper', 'gang-saint', 'gang-king'];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + this.rng.range(-0.4, 0.4);
      const r = this.rng.range(radius * 0.35, radius);
      const x = cx + Math.cos(a) * r;
      const z = cz + Math.sin(a) * r;
      if (ctx.physics.terrain.isWater(x, z)) continue;
      const ped = ctx.peds.spawn(this.rng.pick(archetypes), x, z, 0, {});
      ped.armed = ped.armed || (this.rng.bool(0.6) ? 'pistol-9' : 'micro-smg');
      ped.threat = ctx.player;
      ped.isMissionTarget = true;
      ped.stats = { ...ped.stats, bravery: 0.95, aggression: 0.9 };
      ped._setState('combat');
      st.targets.push(ped);
      this.spawned.peds.push(ped);
      this._addMarker(x, z, 2, 'kill', ped);
    }
    st.need = st.targets.length || 1;
  }

  _maintainEnemies(o, dt) {
    const st = this.objectiveState;
    st.respawn = (st.respawn || 0) - dt;
    const alive = st.targets.filter((t) => !t.dead).length;
    if (alive < 3 && st.respawn <= 0) {
      st.respawn = 6;
      this._spawnEnemies({ ...o, count: 2 });
    }
  }

  _spawnChaseTarget(o) {
    const ctx = this.ctx;
    const st = this.objectiveState;
    const id = o.targetVehicle || 'sedan-standard';
    const spot = ctx.world.safeRoadPoint(o.x ?? ctx.player.position.x + 60, o.z ?? ctx.player.position.z + 60);
    const v = ctx.traffic.spawnAt(getVehicle(id) ? id : randomVehicleId(this.rng, {}), spot.x, spot.z, spot.yaw, { ai: false });
    if (!v) return;
    const ai = new VehicleAI(v, ctx.world.roads, this.rng, DRIVER_MODE.FLEE);
    ai.chaseTarget = ctx.player;
    ai.aggression = 0.95;
    ai.attachToNearestEdge(spot.x, spot.z);
    v.aiDriver = ai;
    v.missionVehicle = true;
    st.targets.push(v);
    this.spawned.vehicles.push(v);
    this._addMarker(spot.x, spot.z, 4, 'kill', v);
  }

  /**
   * Vehicles for a 'destroy' objective. Without this there was no case for
   * 'destroy' at all: nothing was ever spawned, nothing was ever pushed into
   * `targets`, and _onVehicleDestroyed only counts vehicles that are in there.
   * Thirteen objectives across the campaign could therefore never be completed.
   */
  _spawnDestroyTargets(o) {
    const ctx = this.ctx;
    const st = this.objectiveState;
    const n = Math.max(1, o.count || 1);
    const cx = o.x ?? ctx.player.position.x;
    const cz = o.z ?? ctx.player.position.z;
    const radius = o.radius || 55;
    const wantBoat = o.targetClass === 'boat';
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + this.rng.range(-0.5, 0.5);
      const r = this.rng.range(radius * 0.45, radius);
      let x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
      let id = o.targetVehicle;
      if (wantBoat) {
        if (!ctx.physics.terrain.isWater(x, z)) continue;
        if (!id) id = randomVehicleId(this.rng, { classes: ['boat'] });
      } else {
        const spot = ctx.world.safeRoadPoint(x, z);
        x = spot.x; z = spot.z;
        if (!id) id = randomVehicleId(this.rng, { classes: o.targetClass ? [o.targetClass] : undefined });
      }
      if (!id || !getVehicle(id)) id = randomVehicleId(this.rng, {});
      const yaw = wantBoat ? this.rng.range(0, Math.PI * 2) : ctx.world.safeRoadPoint(x, z).yaw;
      const v = ctx.traffic.spawnAt(id, x, z, yaw, { ai: false });
      if (!v) continue;
      // They run: every one of these objectives is written as a chase or an
      // ambush ("Stop the vans", "Break the convoy up"), not a car park.
      const ai = new VehicleAI(v, ctx.world.roads, this.rng, DRIVER_MODE.FLEE);
      ai.chaseTarget = ctx.player;
      ai.aggression = 0.9;
      if (!wantBoat) ai.attachToNearestEdge(x, z);
      v.aiDriver = ai;
      v.missionVehicle = true;
      st.targets.push(v);
      this.spawned.vehicles.push(v);
      this._addMarker(x, z, 4, 'kill', v);
    }
    st.need = st.targets.length || 1;
  }

  _spawnProtectee(o) {
    const ctx = this.ctx;
    const st = this.objectiveState;
    const p = ctx.player.position;
    const ped = ctx.peds.spawn('business-exec', p.x + 3, p.z + 3, 0, {});
    ped.isAlly = true;
    ped.stats = { ...ped.stats, bravery: 0.3 };
    st.targets.push(ped);
    this.spawned.peds.push(ped);
    this._addMarker(ped.body.position.x, ped.body.position.z, 2, 'goto', ped);
    // Something has to threaten them.
    this._spawnEnemies({ ...o, count: 3, radius: 40 });
  }

  _spawnPickups(o) {
    const ctx = this.ctx;
    const st = this.objectiveState;
    const n = o.count || 3;
    const cx = o.x ?? ctx.player.position.x;
    const cz = o.z ?? ctx.player.position.z;
    // The objective carries a radius; a count above five is not a licence to
    // scatter pickups seven hundred metres across the city. Widen with the
    // count, but stay in the neighbourhood the objective named.
    const spread = Math.min(240, (o.radius || 20) * (1 + Math.max(0, n - 3) * 0.35));
    const geo = new THREE.OctahedronGeometry(0.5);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x101018, emissive: 0xffc93c, emissiveIntensity: 2.4, roughness: 0.3,
    });
    for (let i = 0; i < n; i++) {
      const a = this.rng.range(0, Math.PI * 2);
      const r = this.rng.range(spread * 0.2, spread);
      let x = cx + Math.cos(a) * r;
      let z = cz + Math.sin(a) * r;
      if (ctx.physics.terrain.isWater(x, z)) { x = cx; z = cz; }
      const y = ctx.physics.groundHeight(x, z) + 1.1;
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      ctx.scene.add(mesh);
      const pickup = { mesh, x, y, z, taken: false };
      this.spawned.pickups.push(pickup);
      this._addMarker(x, z, 2, 'pickup');
    }
    st.need = n;
  }

  _updatePickups() {
    const ctx = this.ctx;
    const st = this.objectiveState;
    const p = ctx.player.position;
    const t = ctx.time.elapsed;
    for (const pk of this.spawned.pickups) {
      if (pk.taken) continue;
      pk.mesh.rotation.y = t * 1.6;
      pk.mesh.position.y = pk.y + Math.sin(t * 2.2) * 0.18;
      if (Math.hypot(pk.x - p.x, pk.z - p.z) < 2.6 && Math.abs(pk.y - p.y) < 4) {
        pk.taken = true;
        pk.mesh.visible = false;
        st.collected++;
        ctx.audio?.play('pickupCash', { ui: true, volume: 0.5 });
        ctx.particles?.spawnGlow(pk.x, pk.y, pk.z, 0xffc93c, 1.2, 0.3);
      }
    }
  }

  _updateRace(o, st, dt) {
    const ctx = this.ctx;
    const cps = o.checkpoints;
    if (!cps || !cps.length) return true;
    const p = ctx.player.position;
    const cp = cps[st.checkpoint];
    const laps = o.laps || 1;
    if (Math.hypot(cp[0] - p.x, cp[1] - p.z) < 11) {
      st.checkpoint++;
      ctx.audio?.play('checkpoint', { ui: true, volume: 0.6 });
      if (st.checkpoint >= cps.length) {
        // A multi-lap course wraps back to the first gate instead of ending, so
        // "three laps of the port" is three laps of the port.
        st.lap = (st.lap || 1) + 1;
        if (st.lap > laps) return true;
        st.checkpoint = 0;
        ctx.notify?.toast?.('Lap', `${st.lap} of ${laps}`, 'good');
      }
      this._clearMarkers();
      const next = cps[st.checkpoint];
      this._addMarker(next[0], next[1], 9, 'checkpoint');
    }
    return false;
  }

  // -------------------------------------------------------------------------
  // Markers
  // -------------------------------------------------------------------------
  _addMarker(x, z, radius, kind, follow) {
    const ctx = this.ctx;
    const color = kind === 'kill' ? 0xff3b30 : kind === 'pickup' ? 0xffc93c
      : kind === 'checkpoint' ? 0x22e3ff : kind === 'dropoff' ? 0x4dff9e : 0xff2d95;
    const geo = new THREE.CylinderGeometry(radius * 0.8, radius * 0.8, 8, 20, 1, true);
    const mesh = new THREE.Mesh(geo, markerMaterial(color, 0.26));
    mesh.userData.baseOpacity = 0.26;
    const y = ctx.physics.groundHeight(x, z);
    mesh.position.set(x, y + 4, z);
    mesh.renderOrder = 3;
    this._markerGroup.add(mesh);
    this.markers.push({ mesh, x, z, kind, color, follow });
  }
  _moveMarker(i, pos) {
    const m = this.markers[i];
    if (!m || !pos) return;
    m.x = pos.x; m.z = pos.z;
    m.mesh.position.set(pos.x, this.ctx.physics.groundHeight(pos.x, pos.z) + 4, pos.z);
  }
  _clearMarkers() {
    for (const m of this.markers) this._markerGroup.remove(m.mesh);
    this.markers.length = 0;
  }
  _clearSpawned() {
    for (const p of this.spawned.peds) if (!p.dead) p.dispose();
    for (const v of this.spawned.vehicles) if (!v.dead && v !== this.ctx.player.vehicle) v.dispose();
    for (const pk of this.spawned.pickups) this.ctx.scene.remove(pk.mesh);
    this.spawned.peds.length = 0;
    this.spawned.vehicles.length = 0;
    this.spawned.pickups.length = 0;
  }

  _onPedKilled(e) {
    if (!this.active || !this.objectiveState) return;
    const o = this.objective;
    if (!o) return;
    if ((o.kind === 'kill' || o.kind === 'killAll') && this.objectiveState.targets.includes(e.ped)) {
      this.objectiveState.count++;
    } else if (o.kind === 'kill' && e.source === this.ctx.player) {
      // Open rampages count any kill.
      if (!this.objectiveState.targets.length) this.objectiveState.count++;
    }
  }
  _onVehicleDestroyed(e) {
    if (!this.active || !this.objectiveState) return;
    const o = this.objective;
    if (o && o.kind === 'destroy' && this.objectiveState.targets.includes(e.vehicle)) {
      this.objectiveState.count++;
    }
  }

  /** HUD summary of the current objective. */
  hudState() {
    if (!this.active) return null;
    const o = this.objective;
    const st = this.objectiveState;
    let meta = '';
    if (this.active.fail.timeLimit) meta = `${Math.max(0, Math.ceil(this.timer))}s`;
    else if (o && (o.kind === 'kill' || o.kind === 'killAll' || o.kind === 'destroy')) meta = `${st.count}/${st.need}`;
    else if (o && o.kind === 'collect') meta = `${st.collected}/${st.need}`;
    else if (o && o.kind === 'race') {
      meta = `CP ${st.checkpoint + 1}/${o.checkpoints.length}`;
      if ((o.laps || 1) > 1) meta = `Lap ${st.lap || 1}/${o.laps} \u00b7 ${meta}`;
    }
    else if (o && (o.kind === 'survive' || o.kind === 'wait')) meta = `${Math.max(0, Math.ceil((o.seconds || 0) - st.time))}s`;
    return { name: this.active.name, text: o ? o.text : '', meta, markers: this.markers };
  }

  serialize() { return { completed: [...this.completed] }; }
  deserialize(d) { if (d && d.completed) this.completed = new Set(d.completed); }
}

function dist2D(p, o) { return Math.hypot(p.x - (o.x ?? 0), p.z - (o.z ?? 0)); }
