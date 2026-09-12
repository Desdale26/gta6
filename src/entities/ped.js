// ped.js — a pedestrian: procedural body, procedural animation, and a small brain.
//
// Bodies are built from a shared set of primitive geometries so thousands of peds cost a
// handful of materials. Animation is entirely procedural — no clips, no skeleton data, just
// sine-driven joint angles that respond to actual walk speed.
import * as THREE from 'three';
import { clamp, lerp, damp, wrapAngle, angleDelta, TAU } from '../core/mathx.js';
import { CharacterController, Ragdoll, MOVE_STATE } from '../physics/character.js';
import { BoxCollider, LAYER, SURFACE, MASK_SOLID } from '../physics/world.js';
import { getPed, PED_ARCHETYPES, FIRST_NAMES, LAST_NAMES } from '../content/pedCatalog.js';

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _pv = new THREE.Vector3();

let _pid = 1;

export const PED_STATE = {
  WANDER: 'wander', IDLE: 'idle', FLEE: 'flee', PANIC: 'panic', COMBAT: 'combat',
  COWER: 'cower', CHASE: 'chase', DRIVE: 'drive', DEAD: 'dead', TALK: 'talk', WATCH: 'watch',
};

// ---------------------------------------------------------------------------
// Shared geometry — built once, reused by every ped.
// ---------------------------------------------------------------------------
let GEO = null;
function buildGeometry() {
  if (GEO) return GEO;
  const cap = (r, h, seg = 7) => {
    const g = new THREE.CapsuleGeometry(r, Math.max(0.01, h - r * 2), 2, seg);
    return g;
  };
  GEO = {
    head: new THREE.SphereGeometry(0.115, 10, 8),
    jaw: new THREE.BoxGeometry(0.15, 0.1, 0.14),
    hair: new THREE.SphereGeometry(0.122, 10, 7, 0, Math.PI * 2, 0, Math.PI * 0.62),
    torso: cap(0.135, 0.5),
    hips: cap(0.13, 0.22),
    upperArm: cap(0.052, 0.28),
    lowerArm: cap(0.046, 0.26),
    hand: new THREE.SphereGeometry(0.052, 6, 5),
    thigh: cap(0.075, 0.4),
    shin: cap(0.062, 0.4),
    foot: new THREE.BoxGeometry(0.1, 0.07, 0.24),
    cap_: new THREE.CylinderGeometry(0.125, 0.125, 0.06, 10),
    bagGeo: new THREE.BoxGeometry(0.22, 0.26, 0.1),
    phoneGeo: new THREE.BoxGeometry(0.07, 0.13, 0.012),
  };
  GEO.foot.translate(0, 0, 0.05);
  // Accessories used to be allocated per ped, so every despawn leaked a handful
  // of buffers; they are fixed-size, so they belong in the shared table too.
  GEO.capPeak = new THREE.BoxGeometry(0.17, 0.02, 0.1);
  GEO.coffee = new THREE.CylinderGeometry(0.035, 0.03, 0.11, 7);
  GEO.camera = new THREE.BoxGeometry(0.1, 0.07, 0.07);
  GEO.umbrella = new THREE.CylinderGeometry(0.015, 0.015, 0.7, 5);
  GEO.skateboard = new THREE.BoxGeometry(0.18, 0.03, 0.72);
  GEO.surfboard = new THREE.BoxGeometry(0.36, 0.06, 1.9);
  return GEO;
}

/** Cached per-colour materials so 150 peds don't mean 1500 materials. */
const matCache = new Map();
function bodyMat(base, colorHex) {
  const key = (base.name || 'm') + ':' + colorHex;
  let m = matCache.get(key);
  if (m) return m;
  m = base.clone();
  m.color.setHex(colorHex);
  matCache.set(key, m);
  return m;
}

export function clearPedMaterialCache() { matCache.clear(); }

// ---------------------------------------------------------------------------
export class Ped {
  constructor(ctx, archetypeId, opts = {}) {
    this.ctx = ctx;
    this.id = _pid++;
    this.isPed = true;
    this.dead = false;
    const def = getPed(archetypeId) || PED_ARCHETYPES[0];
    this.def = def;
    const rng = opts.rng || ctx.rng;
    this.rng = rng;

    this.height = rng.range(def.height[0], def.height[1]);
    this.build = rng.range(def.build[0], def.build[1]);
    this.name = `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;
    this.colors = {
      skin: rng.pick(def.palette.skin),
      hair: rng.pick(def.palette.hair),
      top: rng.pick(def.palette.top),
      bottom: rng.pick(def.palette.bottom),
      shoes: rng.pick(def.palette.shoes),
      accent: rng.pick(def.palette.accent),
    };
    this.hasHat = def.outfit === 'cop' || def.outfit === 'worker' || def.outfit === 'chef' || rng.bool(0.16);
    this.prop = def.props && def.props.length && rng.bool(0.45) ? rng.pick(def.props) : null;

    this.health = def.health ?? 100;
    this.maxHealth = this.health;
    this.armed = def.armed && rng.float() < def.armed.chance ? def.armed.weaponId : null;
    this.stats = def.stats;
    this.isCop = def.outfit === 'cop';
    this.isGang = !!def.gang;

    // --- physics ---
    this.body = new CharacterController(ctx.physics, {
      radius: 0.3 * this.build, height: this.height, mass: 60 * this.build,
    });
    this.body.ignore = this;
    this.collider = new BoxCollider(0, 0, 0, 0.32 * this.build, this.height * 0.5, 0.26 * this.build, 0, {
      layer: LAYER.PED, surface: SURFACE.FLESH, owner: this,
    });
    ctx.physics.addDynamic(this);
    this.ragdoll = null;

    // --- visuals ---
    this.group = new THREE.Group();
    this.group.name = 'ped:' + def.id;
    this.group.userData.entity = this;
    this._buildMesh();
    ctx.scene.add(this.group);

    // --- brain ---
    this.state = PED_STATE.WANDER;
    this.stateTime = 0;
    this.target = new THREE.Vector3();
    this.hasTarget = false;
    this.path = null;
    this.pathIndex = 0;
    this.wishDir = new THREE.Vector3();
    this.speed = def.speed.walk;
    this.yaw = opts.yaw ?? rng.range(0, TAU);
    this.lookYaw = this.yaw;
    this.fear = 0;
    this.anger = 0;
    this.alertness = 0;
    this.threat = null;
    this.inVehicle = null;      // set while riding in a car; the vehicle carries us
    this.vehicleSeat = 0;
    this.lastBark = -99;
    this.barkText = null;
    this.edge = opts.edge || null;
    this.edgeSide = opts.side || 1;
    this.edgeT = opts.t ?? rng.float();
    this.edgeDir = rng.bool() ? 1 : -1;
    this.vehicle = null;
    this.seat = -1;
    this.despawnTimer = 0;
    this.animPhase = rng.range(0, TAU);
    this.blinkTimer = rng.range(1, 5);
    this.distToCam = 0;
    this.visible = true;
    this.lodLevel = 0;
    this.money = Math.round(rng.range(4, 60) * (1 + (def.stats.wealth || 0.3) * 14));

    if (opts.x !== undefined) this.teleport(opts.x, opts.y, opts.z, this.yaw);
  }

  _buildMesh() {
    const g = buildGeometry();
    const mats = this.ctx.materials;
    const skinM = bodyMat(mats.skin, this.colors.skin);
    const topM = bodyMat(mats.cloth, this.colors.top);
    const botM = bodyMat(mats.cloth, this.colors.bottom);
    const shoeM = bodyMat(mats.cloth, this.colors.shoes);
    const hairM = bodyMat(mats.hairMat, this.colors.hair);
    const accM = bodyMat(mats.cloth, this.colors.accent);

    const s = this.height / 1.78;
    const b = this.build;
    const root = new THREE.Group();
    root.scale.set(b * 0.95, 1, b * 0.95);
    this.group.add(root);
    this.root = root;

    const mk = (geo, mat, x, y, z) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      m.receiveShadow = false;
      return m;
    };

    // torso + hips
    this.torso = mk(g.torso, topM, 0, 1.16 * s, 0);
    this.torso.scale.set(1.05, 1, 0.78);
    root.add(this.torso);
    this.hips = mk(g.hips, botM, 0, 0.94 * s, 0);
    this.hips.scale.set(1.05, 1, 0.82);
    root.add(this.hips);

    // head
    this.neck = new THREE.Group();
    this.neck.position.set(0, 1.42 * s, 0);
    root.add(this.neck);
    this.head = mk(g.head, skinM, 0, 0.06, 0);
    this.head.scale.set(0.94, 1.06, 1);
    this.neck.add(this.head);
    const hair = mk(g.hair, hairM, 0, 0.075, 0);
    hair.scale.setScalar(1.02);
    this.neck.add(hair);
    if (this.hasHat) {
      const cap = mk(g.cap_, accM, 0, 0.16, 0);
      this.neck.add(cap);
      const peak = mk(g.capPeak, accM, 0, 0.15, 0.11);
      this.neck.add(peak);
    }

    // arms
    this.arms = [];
    for (const side of [-1, 1]) {
      const shoulder = new THREE.Group();
      shoulder.position.set(side * 0.19, 1.36 * s, 0);
      root.add(shoulder);
      const upper = mk(g.upperArm, topM, 0, -0.14, 0);
      shoulder.add(upper);
      const elbow = new THREE.Group();
      elbow.position.set(0, -0.28, 0);
      shoulder.add(elbow);
      const lower = mk(g.lowerArm, skinM, 0, -0.13, 0);
      elbow.add(lower);
      const hand = mk(g.hand, skinM, 0, -0.27, 0);
      elbow.add(hand);
      this.arms.push({ shoulder, elbow, hand, side });
    }

    // legs
    this.legs = [];
    for (const side of [-1, 1]) {
      const hip = new THREE.Group();
      hip.position.set(side * 0.10, 0.88 * s, 0);
      root.add(hip);
      const thigh = mk(g.thigh, botM, 0, -0.2, 0);
      hip.add(thigh);
      const knee = new THREE.Group();
      knee.position.set(0, -0.4, 0);
      hip.add(knee);
      const shin = mk(g.shin, botM, 0, -0.2, 0);
      knee.add(shin);
      const foot = mk(g.foot, shoeM, 0, -0.4, 0.02);
      knee.add(foot);
      this.legs.push({ hip, knee, foot, side });
    }

    // carried prop
    if (this.prop) {
      const p = this.prop;
      let mesh = null;
      if (p === 'phone') mesh = mk(g.phoneGeo, bodyMat(mats.plasticBlack, 0x20242c), 0, -0.3, 0.05);
      else if (p === 'bag' || p === 'briefcase') mesh = mk(g.bagGeo, accM, 0, -0.34, 0);
      else if (p === 'coffee') mesh = mk(g.coffee, bodyMat(mats.cloth, 0xf0ece0), 0, -0.32, 0.03);
      else if (p === 'camera') mesh = mk(g.camera, bodyMat(mats.plasticBlack, 0x1a1a1e), 0, -0.3, 0.04);
      else if (p === 'umbrella') mesh = mk(g.umbrella, bodyMat(mats.cloth, 0x22242a), 0, -0.5, 0);
      else if (p === 'skateboard') mesh = mk(g.skateboard, bodyMat(mats.wood, 0x6b4a2a), 0, -0.36, 0);
      else if (p === 'surfboard') mesh = mk(g.surfboard, bodyMat(mats.cloth, 0xf0e8d8), 0.2, -0.3, 0);
      if (mesh) { this.arms[1].elbow.add(mesh); this.propMesh = mesh; }
    }

    this.group.scale.setScalar(1);
    this._meshParts = [this.torso, this.hips, this.head];
  }

  // -------------------------------------------------------------------------
  teleport(x, y, z, yaw) {
    this.body.teleport(x, y, z, yaw);
    this.yaw = yaw ?? this.yaw;
    this.group.position.set(x, y, z);
    this.group.rotation.y = this.yaw;
    this._syncCollider();
  }

  get position() { return this.body.position; }

  _syncCollider() {
    const c = this.collider;
    const p = this.body.position;
    c.x = p.x; c.y = p.y + this.height * 0.5; c.z = p.z;
    c.setYawPitchRoll(this.yaw, 0, 0);
  }

  // -------------------------------------------------------------------------
  update(dt) {
    if (this.dead && this.ragdoll) {
      this.ragdoll.update(dt);
      this._poseFromRagdoll();
      this.despawnTimer += dt;
      return;
    }
    if (this.dead) { this.despawnTimer += dt; return; }

    // Riding in a car: the vehicle carries us, so skip the walking AI entirely.
    // Without this the occupant kept wandering off on foot while invisible, and
    // then popped back into view standing in the road wherever it had got to.
    if (this.inVehicle) {
      const v = this.inVehicle;
      if (v.dead) { this.inVehicle = null; }
      else {
        v.seatPoint(this.vehicleSeat || 0, _pv);
        const yaw = Math.atan2(v.sim.forward.x, v.sim.forward.z);
        this.body.teleport(_pv.x, _pv.y, _pv.z, yaw);
        this.yaw = yaw;
        this._syncCollider();
        this.group.position.copy(this.body.position);
        this.group.rotation.y = yaw;
        this.setVisible(false);
        return;
      }
    }

    const cam = this.ctx.camera.position;
    const dx = this.body.position.x - cam.x, dz = this.body.position.z - cam.z;
    this.distToCam = Math.sqrt(dx * dx + dz * dz);

    // Distant peds get a cheaper update — still moving, just not animated per-joint.
    this.lodLevel = this.distToCam > 95 ? 2 : this.distToCam > 42 ? 1 : 0;

    this.stateTime += dt;
    this._think(dt);
    this._move(dt);
    this._syncCollider();

    this.group.position.copy(this.body.position);
    this.group.rotation.y = this.yaw;
    if (this.lodLevel < 2) this._animate(dt);
  }

  // ---- brain --------------------------------------------------------------
  _think(dt) {
    const ctx = this.ctx;
    const player = ctx.player;
    this.fear = Math.max(0, this.fear - dt * 0.28);
    this.anger = Math.max(0, this.anger - dt * 0.2);

    // React to nearby danger: gunfire, a car on the pavement, a drawn weapon.
    if (player && !player.dead) {
      const pd = this.body.position.distanceTo(player.position);
      if (pd < 26) {
        const threat = player.threatLevel;
        if (threat > 0) {
          const scared = threat * (1.25 - this.stats.bravery) * (1 - pd / 30);
          this.fear = Math.min(1.6, this.fear + scared * dt * 3.2);
          if (this.fear > 0.5) this.threat = player;
        }
      }
    }

    switch (this.state) {
      case PED_STATE.WANDER: {
        if (this.fear > 0.55) { this._setState(PED_STATE.FLEE); break; }
        if (!this.hasTarget || this.body.position.distanceToSquared(this.target) < 2.6) this._pickWanderTarget();
        this.speed = this.def.speed.walk * (this.stats.fitness * 0.3 + 0.85);
        break;
      }
      case PED_STATE.IDLE: {
        this.speed = 0;
        if (this.stateTime > 3 + this.rng.float() * 5) this._setState(PED_STATE.WANDER);
        if (this.fear > 0.55) this._setState(PED_STATE.FLEE);
        break;
      }
      case PED_STATE.FLEE: {
        this.speed = this.def.speed.run;
        if (this.threat) {
          _v1.copy(this.body.position).sub(this.threat.position);
          _v1.y = 0;
          if (_v1.lengthSq() < 0.01) _v1.set(1, 0, 0);
          _v1.normalize();
          this.target.copy(this.body.position).addScaledVector(_v1, 24);
          this.hasTarget = true;
        }
        if (this.fear < 0.18) this._setState(PED_STATE.WANDER);
        this._bark('panic', 5);
        break;
      }
      case PED_STATE.PANIC: {
        this.speed = this.def.speed.run;
        if (this.stateTime > 1.2) this._pickWanderTarget(true);
        if (this.fear < 0.2) this._setState(PED_STATE.WANDER);
        break;
      }
      case PED_STATE.COWER: {
        this.speed = 0;
        this.body.crouching = true;
        if (this.fear < 0.25) { this.body.crouching = false; this._setState(PED_STATE.WANDER); }
        break;
      }
      case PED_STATE.COMBAT: {
        const t = this.threat;
        if (!t || t.dead) { this._setState(PED_STATE.WANDER); break; }
        const d = this.body.position.distanceTo(t.position);
        this.speed = d > 12 ? this.def.speed.run : d < 4 ? 0 : this.def.speed.jog;
        this.target.copy(t.position);
        this.hasTarget = true;
        this.lookYaw = Math.atan2(t.position.x - this.body.position.x, t.position.z - this.body.position.z);
        this._bark('angry', 6);
        if (this.armed && d < 34 && this.stateTime > 0.6) this._shootAt(t, d);
        break;
      }
      case PED_STATE.CHASE: {
        const t = this.threat;
        if (!t || t.dead) { this._setState(PED_STATE.WANDER); break; }
        this.speed = this.def.speed.run;
        this.target.copy(t.position);
        this.hasTarget = true;
        break;
      }
      default: break;
    }

    // Anyone brave and angry enough fights back instead of running.
    if (this.state === PED_STATE.FLEE && this.anger > 0.7 && this.stats.bravery > 0.6) {
      this._setState(PED_STATE.COMBAT);
    }
  }

  _setState(s) {
    if (this.state === s) return;
    this.state = s;
    this.stateTime = 0;
    if (s === PED_STATE.FLEE || s === PED_STATE.PANIC) this.hasTarget = false;
  }

  _pickWanderTarget(random = false) {
    const world = this.ctx.world;
    const rng = this.rng;
    if (!random && this.edge) {
      // Walk along the sidewalk, turning at junctions.
      this.edgeT += this.edgeDir * 0.45;
      if (this.edgeT > 1 || this.edgeT < 0) {
        const node = this.edgeT > 1 ? this.edge.b : this.edge.a;
        const options = node.edges.filter((e) => e !== this.edge && e.sidewalkWidth > 0.5);
        if (options.length) {
          this.edge = rng.pick(options);
          this.edgeDir = this.edge.a === node ? 1 : -1;
          this.edgeT = this.edgeDir > 0 ? 0.05 : 0.95;
          if (rng.bool(0.35)) this.edgeSide = -this.edgeSide;
        } else {
          this.edgeDir *= -1;
          this.edgeT = clamp(this.edgeT, 0.05, 0.95);
        }
      }
      const e = this.edge;
      const off = e.halfWidth + Math.max(1.2, e.sidewalkWidth * 0.55);
      this.target.set(
        lerp(e.a.x, e.b.x, clamp(this.edgeT, 0, 1)) + e.nx * off * this.edgeSide,
        0,
        lerp(e.a.z, e.b.z, clamp(this.edgeT, 0, 1)) + e.nz * off * this.edgeSide,
      );
      this.target.y = this.ctx.physics.groundHeight(this.target.x, this.target.z);
      this.hasTarget = true;
      return;
    }
    const a = rng.range(0, TAU);
    const r = rng.range(8, 26);
    this.target.set(
      this.body.position.x + Math.cos(a) * r, 0,
      this.body.position.z + Math.sin(a) * r,
    );
    this.target.y = this.ctx.physics.groundHeight(this.target.x, this.target.z);
    this.hasTarget = true;
  }

  _shootAt(target, dist) {
    if (!this.ctx.combat || this._fireCooldown > 0) return;
    this._fireCooldown = 0.9 + this.rng.float() * 0.8;
    this.ctx.combat.npcFire(this, target, this.armed);
  }

  _bark(kind, cooldown) {
    const now = this.ctx.time.elapsed;
    if (now - this.lastBark < cooldown) return;
    if (this.distToCam > 22) return;
    const lines = this.def.barks && this.def.barks[kind];
    if (!lines || !lines.length) return;
    this.lastBark = now;
    this.barkText = this.rng.pick(lines);
    this.ctx.bus.emit('ped:bark', { ped: this, text: this.barkText, kind });
  }

  // ---- movement -----------------------------------------------------------
  _move(dt) {
    if (this._fireCooldown > 0) this._fireCooldown -= dt;
    const body = this.body;
    if (this.hasTarget && this.speed > 0.05) {
      _v1.copy(this.target).sub(body.position);
      _v1.y = 0;
      const dist = _v1.length();
      if (dist > 0.3) {
        _v1.divideScalar(dist);
        // Steer around whatever is directly ahead.
        this._avoid(_v1, dt);
        this.wishDir.copy(_v1);
        const targetYaw = Math.atan2(_v1.x, _v1.z);
        this.yaw += angleDelta(this.yaw, targetYaw) * Math.min(1, dt * 7);
      } else {
        this.wishDir.set(0, 0, 0);
        if (this.state === PED_STATE.WANDER && this.rng.bool(0.25)) this._setState(PED_STATE.IDLE);
      }
    } else {
      this.wishDir.set(0, 0, 0);
    }
    body.update(dt, this.wishDir, this.speed, false);
    if (this.state !== PED_STATE.COMBAT) this.lookYaw = damp(this.lookYaw, this.yaw, 6, dt);
  }

  _avoid(dir, dt) {
    const phys = this.ctx.physics;
    const p = this.body.position;
    const probe = 2.2;
    const hit = phys.raycast(p.x, p.y + 0.9, p.z, dir.x, 0, dir.z, probe,
      MASK_SOLID | LAYER.VEHICLE | LAYER.PED, { ignore: this });
    if (!hit.hit) return;
    // Slide along the obstacle rather than grinding into it.
    const nx = hit.nx, nz = hit.nz;
    const d = dir.x * nx + dir.z * nz;
    dir.x -= nx * d * 1.6;
    dir.z -= nz * d * 1.6;
    const l = Math.hypot(dir.x, dir.z) || 1;
    dir.x /= l; dir.z /= l;
    if (hit.layer === LAYER.VEHICLE && hit.dist < 1.6) {
      this.fear = Math.min(1.5, this.fear + dt * 3);
      this._setState(PED_STATE.FLEE);
    }
  }

  // ---- animation ----------------------------------------------------------
  _animate(dt) {
    const hSpeed = Math.hypot(this.body.velocity.x, this.body.velocity.z);
    const stride = clamp(hSpeed / 1.6, 0, 2.4);
    this.animPhase += dt * (3.4 + stride * 3.6);
    const ph = this.animPhase;
    const swing = Math.sin(ph) * clamp(stride * 0.55, 0.06, 0.95);
    const swing2 = Math.sin(ph + Math.PI) * clamp(stride * 0.55, 0.06, 0.95);
    const bob = Math.abs(Math.sin(ph)) * 0.035 * stride;
    const airborne = !this.body.grounded;

    this.root.position.y = bob;
    this.torso.rotation.x = -0.04 - stride * 0.06;
    this.torso.rotation.z = Math.sin(ph) * 0.03 * stride;

    // legs
    for (let i = 0; i < this.legs.length; i++) {
      const leg = this.legs[i];
      const s = i === 0 ? swing : swing2;
      if (airborne) {
        leg.hip.rotation.x = 0.35;
        leg.knee.rotation.x = -0.6;
      } else if (this.body.crouching) {
        leg.hip.rotation.x = 0.85;
        leg.knee.rotation.x = -1.5;
      } else {
        leg.hip.rotation.x = s * 0.8;
        leg.knee.rotation.x = -Math.max(0, -s * 1.2 + 0.1) - 0.05;
      }
      leg.foot.rotation.x = -leg.knee.rotation.x * 0.4;
    }

    // arms
    const combat = this.state === PED_STATE.COMBAT && this.armed;
    for (let i = 0; i < this.arms.length; i++) {
      const arm = this.arms[i];
      const s = i === 0 ? swing2 : swing;
      if (combat) {
        arm.shoulder.rotation.x = -1.45;
        arm.shoulder.rotation.z = arm.side * 0.16;
        arm.elbow.rotation.x = -0.28;
      } else if (this.state === PED_STATE.FLEE || this.state === PED_STATE.PANIC) {
        arm.shoulder.rotation.x = -2.2 + Math.sin(ph * 1.4 + i) * 0.35;
        arm.shoulder.rotation.z = arm.side * 0.5;
        arm.elbow.rotation.x = -0.7;
      } else if (this.prop === 'phone' && i === 1) {
        arm.shoulder.rotation.x = -1.1;
        arm.shoulder.rotation.z = arm.side * 0.2;
        arm.elbow.rotation.x = -1.2;
      } else {
        arm.shoulder.rotation.x = s * 0.62;
        arm.shoulder.rotation.z = arm.side * (0.1 + stride * 0.03);
        arm.elbow.rotation.x = -Math.max(0, s * 0.5) - 0.12;
      }
    }

    // head look + blink
    this.neck.rotation.y = clamp(angleDelta(this.yaw, this.lookYaw), -0.9, 0.9);
    this.neck.rotation.x = Math.sin(ph * 0.5) * 0.03;
    this.blinkTimer -= dt;
    if (this.blinkTimer < 0) {
      this.blinkTimer = 2 + this.rng.float() * 4;
      this.head.scale.y = 0.86;
      setTimeout(() => { if (this.head) this.head.scale.y = 1.06; }, 90);
    }
  }

  _poseFromRagdoll() {
    const r = this.ragdoll;
    if (!r) return;
    r.center(_v1);
    this.group.position.copy(_v1);
    this.group.position.y -= this.height * 0.42;
    // Align the torso with the hips→chest axis.
    r.get('hips', _v1); r.get('chest', _v2);
    _v3.copy(_v2).sub(_v1);
    const yaw = Math.atan2(_v3.x, _v3.z);
    const pitch = Math.atan2(Math.hypot(_v3.x, _v3.z), _v3.y);
    this.group.rotation.set(0, yaw, 0);
    this.root.rotation.x = pitch - Math.PI / 2;
    // Splay limbs so it reads as a body and not a mannequin.
    for (let i = 0; i < this.legs.length; i++) {
      this.legs[i].hip.rotation.x = 0.6 + i * 0.3;
      this.legs[i].knee.rotation.x = -0.9 - i * 0.25;
    }
    for (let i = 0; i < this.arms.length; i++) {
      this.arms[i].shoulder.rotation.x = -0.4 - i * 0.5;
      this.arms[i].shoulder.rotation.z = this.arms[i].side * 1.2;
      this.arms[i].elbow.rotation.x = -0.5;
    }
  }

  // ---- damage -------------------------------------------------------------
  damage(amount, opts = {}) {
    if (this.dead) return false;
    this.health -= amount;
    this.anger = Math.min(1.5, this.anger + 0.5);
    this.fear = Math.min(1.6, this.fear + 0.8);
    if (opts.source) this.threat = opts.source;
    this._bark('hurt', 2);
    this.ctx.bus.emit('ped:damaged', { ped: this, amount, source: opts.source });
    if (this.health <= 0) { this.kill(opts); return true; }
    if (this.stats.bravery > 0.65 && (this.armed || this.isCop)) this._setState(PED_STATE.COMBAT);
    else this._setState(PED_STATE.FLEE);
    return false;
  }

  kill(opts = {}) {
    if (this.dead) return;
    this.dead = true;
    this.state = PED_STATE.DEAD;
    this.body.enabled = false;
    this.body.dead = true;
    this.despawnTimer = 0;
    this.ragdoll = new Ragdoll(this.ctx.physics, this.height, this.build);
    const v = opts.velocity || { x: 0, y: 0, z: 0 };
    this.ragdoll.activate(this.body.position.x, this.body.position.y, this.body.position.z, this.yaw,
      v.x, v.y + 1.2, v.z);
    this.collider.layer = LAYER.DEBRIS;
    this.ctx.audio?.playAt('bodyFall', this.body.position, { volume: 0.7 });
    if (this.ctx.settings.get('bloodFx') && this.ctx.decals) {
      this.ctx.decals.addBlood(this.body.position.x, this.body.position.y + 0.05, this.body.position.z, 1.4);
    }
    this.ctx.bus.emit('ped:killed', { ped: this, source: opts.source });
  }

  /** Shove from an explosion or a car. */
  shove(vx, vy, vz) {
    if (this.dead && this.ragdoll) { this.ragdoll.impulse(vx, vy, vz); return; }
    this.body.externalVelocity.set(vx, vy, vz);
    this.fear = 1.4;
    this._setState(PED_STATE.FLEE);
  }

  setVisible(v) {
    if (this.visible === v) return;
    this.visible = v;
    this.group.visible = v;
  }

  dispose() {
    this.ctx.physics.removeDynamic(this);
    this.ctx.scene.remove(this.group);
    this.dead = true;
  }
}
