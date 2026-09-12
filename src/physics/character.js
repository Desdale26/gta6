// character.js — capsule character controller + a Verlet ragdoll for bodies in flight.
import * as THREE from 'three';
import { clamp, damp, wrapAngle, angleDelta } from '../core/mathx.js';
import { LAYER, MASK_SOLID, SURFACE } from './world.js';

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _push = { x: 0, y: 0, z: 0, wall: false, wallNx: 0, wallNz: 0 };

export const MOVE_STATE = {
  IDLE: 'idle', WALK: 'walk', JOG: 'jog', RUN: 'run', CROUCH: 'crouch',
  JUMP: 'jump', FALL: 'fall', SWIM: 'swim', LAND: 'land', RAGDOLL: 'ragdoll', DEAD: 'dead',
};

export class CharacterController {
  constructor(phys, opts = {}) {
    this.phys = phys;
    this.radius = opts.radius ?? 0.34;
    this.height = opts.height ?? 1.78;
    this.crouchHeight = this.height * 0.62;
    this.mass = opts.mass ?? 78;
    this.stepHeight = opts.stepHeight ?? 0.46;
    this.slopeLimit = Math.cos((opts.slopeLimitDeg ?? 52) * Math.PI / 180);

    this.position = new THREE.Vector3();   // feet
    this.velocity = new THREE.Vector3();
    this.yaw = 0;
    this.grounded = false;
    this.groundNormal = new THREE.Vector3(0, 1, 0);
    this.groundSurface = SURFACE.CONCRETE;
    this.groundY = 0;
    this.state = MOVE_STATE.IDLE;
    this.crouching = false;
    this.inWater = false;
    this.submersion = 0;
    this.coyote = 0;
    this.airTime = 0;
    this.fallStart = 0;
    this.lastLandImpact = 0;
    this.wallContact = false;
    this.wallNormal = new THREE.Vector3();
    this.speedScale = 1;
    this.externalVelocity = new THREE.Vector3();
    this.enabled = true;
    this.dead = false;
    this.gravityScale = 1;
    this.stepTimer = 0;
    this.distanceWalked = 0;
    this.collider = null;
  }

  get eyeHeight() { return (this.crouching ? this.crouchHeight : this.height) - 0.16; }
  get currentHeight() { return this.crouching ? this.crouchHeight : this.height; }

  teleport(x, y, z, yaw) {
    this.position.set(x, y, z);
    if (yaw !== undefined) this.yaw = yaw;
    this.velocity.set(0, 0, 0);
    this.grounded = false;
  }

  /**
   * @param dt seconds
   * @param wishDir world-space desired direction (normalised or zero)
   * @param speed desired speed m/s
   * @param jump boolean
   */
  update(dt, wishDir, speed, jump) {
    if (!this.enabled) return;
    const phys = this.phys;

    // ---- water ----
    const waterY = phys.waterLevel;
    const inWaterColumn = phys.terrain ? phys.terrain.isWater(this.position.x, this.position.z) : false;
    const depth = inWaterColumn ? waterY - this.position.y : -1;
    this.submersion = clamp(depth / this.height, 0, 1.4);
    this.inWater = this.submersion > 0.32;

    // ---- ground probe ----
    const probeStart = this.position.y + this.currentHeight * 0.5;
    const probeLen = this.currentHeight * 0.5 + (this.grounded ? this.stepHeight : 0.12) + Math.max(0, -this.velocity.y * dt);
    const hit = phys.raycast(this.position.x, probeStart, this.position.z, 0, -1, 0,
      probeLen, MASK_SOLID | LAYER.VEHICLE, { ignore: this.ignore });
    const wasGrounded = this.grounded;
    let groundY = -Infinity;
    if (hit.hit) {
      groundY = hit.py;
      this.groundNormal.set(hit.nx, hit.ny, hit.nz);
      this.groundSurface = hit.surface;
    } else {
      this.groundNormal.set(0, 1, 0);
    }
    this.groundY = groundY;

    const standingOn = hit.hit && this.groundNormal.y >= this.slopeLimit;
    const snapDist = this.position.y - groundY;

    if (this.inWater) {
      this._swim(dt, wishDir, speed, jump);
    } else {
      this._walk(dt, wishDir, speed, jump, standingOn, groundY, snapDist, wasGrounded);
    }

    // ---- horizontal collision resolve ----
    phys.resolveCapsule(this.position, this.radius, this.currentHeight, _push);
    if (_push.x || _push.z) {
      this.position.x += _push.x;
      this.position.z += _push.z;
      this.wallContact = _push.wall;
      this.wallNormal.set(_push.wallNx, 0, _push.wallNz);
      // kill velocity into the wall
      const vn = this.velocity.x * _push.wallNx + this.velocity.z * _push.wallNz;
      if (vn < 0) { this.velocity.x -= _push.wallNx * vn; this.velocity.z -= _push.wallNz * vn; }
    } else {
      this.wallContact = false;
    }

    // ---- external shove (explosions, cars) ----
    if (this.externalVelocity.lengthSq() > 1e-4) {
      this.position.addScaledVector(this.externalVelocity, dt);
      this.externalVelocity.multiplyScalar(Math.max(0, 1 - 5 * dt));
    }

    // ---- bookkeeping ----
    const hSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    this.distanceWalked += hSpeed * dt;
    this._updateState(hSpeed, speed);
    if (!Number.isFinite(this.position.x + this.position.y + this.position.z)) {
      this.position.set(0, 6, 0); this.velocity.set(0, 0, 0);
    }
  }

  _walk(dt, wishDir, speed, jump, standingOn, groundY, snapDist, wasGrounded) {
    const g = this.phys.gravity * this.gravityScale;

    if (standingOn && this.velocity.y <= 0.6 && snapDist <= this.stepHeight + 0.12) {
      if (!wasGrounded) {
        this.lastLandImpact = Math.max(0, -this.velocity.y);
        this.airTime = 0;
      }
      this.grounded = true;
      this.coyote = 0.14;
      this.position.y = groundY;
      if (this.velocity.y < 0) this.velocity.y = 0;
    } else {
      this.grounded = false;
      this.coyote = Math.max(0, this.coyote - dt);
      this.airTime += dt;
      this.velocity.y += g * dt;
      if (this.velocity.y < -62) this.velocity.y = -62;
    }

    // Acceleration model: crisp on the ground, floaty in the air.
    const accel = this.grounded ? 46 : 9;
    const targetX = wishDir.x * speed * this.speedScale;
    const targetZ = wishDir.z * speed * this.speedScale;
    this.velocity.x = damp(this.velocity.x, targetX, accel * 0.35, dt);
    this.velocity.z = damp(this.velocity.z, targetZ, accel * 0.35, dt);
    if (this.grounded && wishDir.lengthSq() < 0.01) {
      const f = Math.max(0, 1 - 14 * dt);
      this.velocity.x *= f; this.velocity.z *= f;
    }

    // Slide down slopes that are too steep to stand on.
    if (!standingOn && this.groundY > -Infinity && snapDist < 0.4) {
      const n = this.groundNormal;
      const slideK = (1 - n.y) * 26;
      this.velocity.x += n.x * slideK * dt;
      this.velocity.z += n.z * slideK * dt;
    }

    if (jump && (this.grounded || this.coyote > 0)) {
      this.velocity.y = 6.35;
      this.grounded = false;
      this.coyote = 0;
      this.airTime = 0.001;
    }

    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
    this.position.z += this.velocity.z * dt;

    // Step up small obstacles: if a wall blocks us but there is floor just above, climb it.
    if (this.grounded && this.wallContact) {
      const fx = this.position.x + this.velocity.x * dt * 2;
      const fz = this.position.z + this.velocity.z * dt * 2;
      const up = this.phys.raycast(fx, this.position.y + this.stepHeight + 0.05, fz, 0, -1, 0,
        this.stepHeight + 0.1, MASK_SOLID);
      if (up.hit && up.py > this.position.y + 0.04 && up.py - this.position.y <= this.stepHeight && up.ny > this.slopeLimit) {
        this.position.y = up.py;
      }
    }
  }

  _swim(dt, wishDir, speed, jump) {
    this.grounded = false;
    const waterY = this.phys.waterLevel;
    const target = waterY - this.height * 0.42;
    // buoyancy toward floating height
    this.velocity.y = damp(this.velocity.y, (target - this.position.y) * 2.6 + (jump ? 2.4 : 0), 6, dt);
    const sw = speed * 0.52;
    this.velocity.x = damp(this.velocity.x, wishDir.x * sw, 3.2, dt);
    this.velocity.z = damp(this.velocity.z, wishDir.z * sw, 3.2, dt);
    this.position.addScaledVector(this.velocity, dt);
    if (this.position.y > waterY - this.height * 0.2) this.position.y = waterY - this.height * 0.2;
  }

  _updateState(hSpeed, wishSpeed) {
    if (this.dead) { this.state = MOVE_STATE.DEAD; return; }
    if (this.inWater) { this.state = MOVE_STATE.SWIM; return; }
    if (!this.grounded) { this.state = this.velocity.y > 0.8 ? MOVE_STATE.JUMP : MOVE_STATE.FALL; return; }
    if (this.crouching) { this.state = MOVE_STATE.CROUCH; return; }
    if (hSpeed < 0.28) this.state = MOVE_STATE.IDLE;
    else if (hSpeed < 2.1) this.state = MOVE_STATE.WALK;
    else if (hSpeed < 4.6) this.state = MOVE_STATE.JOG;
    else this.state = MOVE_STATE.RUN;
  }
}

// ---------------------------------------------------------------------------
// Verlet ragdoll — 11 particles, distance constraints, ground + box collision.
// Cheap, stable, and it flops convincingly when a car sends someone flying.
// ---------------------------------------------------------------------------
const BONE_NAMES = ['head', 'neck', 'chest', 'hips', 'lShoulder', 'rShoulder', 'lHand', 'rHand',
  'lKnee', 'rKnee', 'lFoot', 'rFoot'];

export class Ragdoll {
  constructor(phys, height = 1.78, build = 1) {
    this.phys = phys;
    this.h = height;
    this.n = BONE_NAMES.length;
    this.pos = new Float32Array(this.n * 3);
    this.prev = new Float32Array(this.n * 3);
    this.pinned = new Uint8Array(this.n);
    this.constraints = [];
    this.active = false;
    this.settled = 0;
    this.radius = 0.16 * build;
    this.build = build;
    this.index = {};
    BONE_NAMES.forEach((b, i) => { this.index[b] = i; });
    this._layout(0, 0, 0, 0);
    this._makeConstraints();
  }

  _layout(x, y, z, yaw) {
    const h = this.h;
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const shoulderW = 0.20 * this.build, hipW = 0.14 * this.build;
    const set = (name, lx, ly, lz) => {
      const i = this.index[name] * 3;
      this.pos[i] = x + lx * c + lz * s;
      this.pos[i + 1] = y + ly;
      this.pos[i + 2] = z + (-lx * s + lz * c);
    };
    set('head', 0, h * 0.95, 0.02);
    set('neck', 0, h * 0.84, 0);
    set('chest', 0, h * 0.70, 0);
    set('hips', 0, h * 0.50, 0);
    set('lShoulder', -shoulderW, h * 0.79, 0);
    set('rShoulder', shoulderW, h * 0.79, 0);
    set('lHand', -shoulderW * 1.5, h * 0.50, 0.04);
    set('rHand', shoulderW * 1.5, h * 0.50, 0.04);
    set('lKnee', -hipW, h * 0.27, 0.01);
    set('rKnee', hipW, h * 0.27, 0.01);
    set('lFoot', -hipW, 0.06, 0.05);
    set('rFoot', hipW, 0.06, 0.05);
    this.prev.set(this.pos);
  }

  _makeConstraints() {
    const link = (a, b, stiff = 1) => {
      const ia = this.index[a] * 3, ib = this.index[b] * 3;
      const d = Math.hypot(this.pos[ia] - this.pos[ib], this.pos[ia + 1] - this.pos[ib + 1], this.pos[ia + 2] - this.pos[ib + 2]);
      this.constraints.push({ a: this.index[a], b: this.index[b], len: d, stiff });
    };
    link('head', 'neck'); link('neck', 'chest'); link('chest', 'hips');
    link('neck', 'lShoulder'); link('neck', 'rShoulder');
    link('lShoulder', 'chest', 0.8); link('rShoulder', 'chest', 0.8);
    link('lShoulder', 'lHand', 0.62); link('rShoulder', 'rHand', 0.62);
    link('hips', 'lKnee'); link('hips', 'rKnee');
    link('lKnee', 'lFoot'); link('rKnee', 'rFoot');
    // stabilisers keep the torso from folding in half
    link('head', 'chest', 0.35); link('chest', 'lKnee', 0.22); link('chest', 'rKnee', 0.22);
    link('lShoulder', 'rShoulder', 0.9); link('lKnee', 'rKnee', 0.22);
    link('hips', 'lHand', 0.10); link('hips', 'rHand', 0.10);
  }

  /** Start ragdolling from a standing pose with an initial impulse. */
  activate(x, y, z, yaw, vx = 0, vy = 0, vz = 0) {
    this._layout(x, y, z, yaw);
    const dt = 1 / 60;
    for (let i = 0; i < this.n; i++) {
      const j = i * 3;
      const spread = 1 + (i % 3) * 0.1;
      this.prev[j] = this.pos[j] - vx * dt * spread;
      this.prev[j + 1] = this.pos[j + 1] - vy * dt * spread;
      this.prev[j + 2] = this.pos[j + 2] - vz * dt * spread;
    }
    this.active = true;
    this.settled = 0;
  }

  update(dt) {
    if (!this.active) return;
    const steps = 2;
    const h = Math.min(dt, 1 / 30) / steps;
    for (let s = 0; s < steps; s++) this._step(h);
    // Settle detection so we can stop simulating corpses.
    let motion = 0;
    for (let i = 0; i < this.n; i++) {
      const j = i * 3;
      motion += Math.abs(this.pos[j] - this.prev[j]) + Math.abs(this.pos[j + 1] - this.prev[j + 1]) + Math.abs(this.pos[j + 2] - this.prev[j + 2]);
    }
    this.settled = motion < 0.012 ? this.settled + dt : 0;
  }

  _step(dt) {
    const g = this.phys.gravity;
    const damping = 0.992;
    // integrate
    for (let i = 0; i < this.n; i++) {
      if (this.pinned[i]) continue;
      const j = i * 3;
      const px = this.pos[j], py = this.pos[j + 1], pz = this.pos[j + 2];
      let vx = (px - this.prev[j]) * damping;
      let vy = (py - this.prev[j + 1]) * damping;
      let vz = (pz - this.prev[j + 2]) * damping;
      // terminal velocity
      const vl = Math.hypot(vx, vy, vz);
      const maxV = 2.4;
      if (vl > maxV) { const k = maxV / vl; vx *= k; vy *= k; vz *= k; }
      this.prev[j] = px; this.prev[j + 1] = py; this.prev[j + 2] = pz;
      this.pos[j] = px + vx;
      this.pos[j + 1] = py + vy + g * dt * dt;
      this.pos[j + 2] = pz + vz;
    }
    // constraints
    for (let iter = 0; iter < 6; iter++) {
      for (let k = 0; k < this.constraints.length; k++) {
        const c = this.constraints[k];
        const ia = c.a * 3, ib = c.b * 3;
        let dx = this.pos[ib] - this.pos[ia];
        let dy = this.pos[ib + 1] - this.pos[ia + 1];
        let dz = this.pos[ib + 2] - this.pos[ia + 2];
        const d = Math.hypot(dx, dy, dz) || 1e-5;
        const diff = ((d - c.len) / d) * 0.5 * c.stiff;
        dx *= diff; dy *= diff; dz *= diff;
        if (!this.pinned[c.a]) { this.pos[ia] += dx; this.pos[ia + 1] += dy; this.pos[ia + 2] += dz; }
        if (!this.pinned[c.b]) { this.pos[ib] -= dx; this.pos[ib + 1] -= dy; this.pos[ib + 2] -= dz; }
      }
      this._collide();
    }
  }

  _collide() {
    const phys = this.phys;
    for (let i = 0; i < this.n; i++) {
      const j = i * 3;
      const x = this.pos[j], y = this.pos[j + 1], z = this.pos[j + 2];
      const gy = phys.groundHeight(x, z) + this.radius * 0.5;
      if (y < gy) {
        this.pos[j + 1] = gy;
        // friction against the ground
        this.prev[j] += (x - this.prev[j]) * 0.42;
        this.prev[j + 2] += (z - this.prev[j + 2]) * 0.42;
      }
      // static boxes — only the torso points, for speed
      if (i <= 3) {
        const list = phys.overlapSphereStatic(x, y, z, this.radius, _ragScratch);
        for (let k = 0; k < list.length; k++) {
          const c = list[k];
          c.closestPoint(x, y, z, _v1);
          const dx = x - _v1.x, dy = y - _v1.y, dz = z - _v1.z;
          const d = Math.hypot(dx, dy, dz);
          if (d < this.radius && d > 1e-5) {
            const k2 = (this.radius - d) / d;
            this.pos[j] += dx * k2; this.pos[j + 1] += dy * k2; this.pos[j + 2] += dz * k2;
          }
        }
      }
    }
  }

  get(name, out) {
    const i = this.index[name] * 3;
    out.set(this.pos[i], this.pos[i + 1], this.pos[i + 2]);
    return out;
  }
  center(out) {
    const i = this.index.hips * 3, k = this.index.chest * 3;
    out.set((this.pos[i] + this.pos[k]) * 0.5, (this.pos[i + 1] + this.pos[k + 1]) * 0.5, (this.pos[i + 2] + this.pos[k + 2]) * 0.5);
    return out;
  }
  /** Apply an impulse (e.g. a bullet or a blast) to the whole body. */
  impulse(ix, iy, iz, cx, cz, radius = 3) {
    for (let i = 0; i < this.n; i++) {
      const j = i * 3;
      let k = 1;
      if (cx !== undefined) {
        const d = Math.hypot(this.pos[j] - cx, this.pos[j + 2] - cz);
        k = clamp(1 - d / radius, 0, 1);
      }
      this.prev[j] -= ix * k * 0.016;
      this.prev[j + 1] -= iy * k * 0.016;
      this.prev[j + 2] -= iz * k * 0.016;
    }
    this.settled = 0;
  }
}
const _ragScratch = [];
export { BONE_NAMES };
