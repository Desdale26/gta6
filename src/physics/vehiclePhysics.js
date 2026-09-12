// vehiclePhysics.js — rigid-body car simulation.
//
// Raycast suspension + a simplified Pacejka tyre model + a real engine/gearbox/differential,
// integrated semi-implicitly at a fixed 120 Hz. Everything a driver can feel is in here:
// weight transfer, understeer on entry, throttle-on oversteer, engine braking, ABS, traction
// control, aero, a friction circle, and a body that actually deforms when you hit something.
import * as THREE from 'three';
import { clamp, lerp, sign, damp } from '../core/mathx.js';
import { BoxCollider, LAYER, MASK_SOLID, SURFACE, SURFACE_PROPS, obbVsObb } from './world.js';

const AIR_DENSITY = 1.225;
const RPM_TO_RADS = Math.PI / 30;
const RADS_TO_RPM = 30 / Math.PI;

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _v4 = new THREE.Vector3();
const _q1 = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _sat = { depth: 0, nx: 0, ny: 0, nz: 0 };
const _scratch = [];

/** Magic-formula-ish tyre curve. Returns normalised force in [-1, 1]. */
function pacejka(slip, B, C, D, E) {
  const Bs = B * slip;
  return D * Math.sin(C * Math.atan(Bs - E * (Bs - Math.atan(Bs))));
}

export class Wheel {
  constructor(cfg) {
    this.lx = cfg.lx; this.ly = cfg.ly; this.lz = cfg.lz;   // mount point, local space
    this.radius = cfg.radius;
    this.width = cfg.width;
    this.steered = !!cfg.steered;
    this.driven = !!cfg.driven;
    this.brakeBias = cfg.brakeBias ?? 0.5;
    this.handbrake = !!cfg.handbrake;
    this.restLength = cfg.restLength ?? 0.32;
    this.travel = cfg.travel ?? 0.22;
    this.stiffness = cfg.stiffness ?? 42000;
    this.damping = cfg.damping ?? 3600;
    this.inertia = Math.max(0.6, cfg.radius * cfg.radius * 18);

    // runtime state
    this.compression = 0;          // 0 = fully extended, 1 = bottomed out
    this.prevLen = this.restLength;
    this.contact = false;
    this.contactPoint = new THREE.Vector3();
    this.contactNormal = new THREE.Vector3(0, 1, 0);
    this.contactSurface = SURFACE.ROAD;
    this.load = 0;                 // N
    this.spin = 0;                 // rad, visual
    this.angularVel = 0;           // rad/s
    this.steerAngle = 0;
    this.slipRatio = 0;
    this.slipAngle = 0;
    this.skid = 0;                 // 0..1 how much it is sliding
    this.forceLong = 0;
    this.forceLat = 0;
    this.worldPos = new THREE.Vector3();
    this.suspensionLength = this.restLength;
    this.onGroundTime = 0;
    this.grounded = false;
    this.burnout = 0;
    this.flat = false;             // blown tyre
  }
  get maxLength() { return this.restLength + this.travel; }
}


/**
 * Suspension geometry and rates for a vehicle definition.
 *
 * Spring rates are authored per vehicle, but several of them left the car sitting
 * on its bump stops before it had even moved, and the dampers ranged from barely
 * damped to badly over-damped. Both wreck the tyre model, so the authored values
 * are kept only inside sane bounds: at rest a wheel uses between 14% and 42% of
 * its travel, and the damper stays between 0.34 and 0.85 of critical.
 */
export function suspensionFor(def) {
  const s = def.handling.suspension || {};
  const radius = def.wheels.radius;
  const mountY = -def.height * 0.5 + radius * 0.55;
  const restLength = s.restLength ?? 0.30;
  const travel = s.travel ?? 0.22;
  const nWheels = def.body.kind === 'bike' ? 2 : (def.wheels.count === 6 ? 6 : 4);
  const staticLoad = (def.mass * 9.81) / nWheels;

  let stiffness = s.stiffness ?? (staticLoad / (travel * 0.30));
  const used = staticLoad / (stiffness * travel);
  if (used > 0.42) stiffness = staticLoad / (travel * 0.42);
  else if (used < 0.14) stiffness = staticLoad / (travel * 0.14);

  const critical = 2 * Math.sqrt(stiffness * (def.mass / nWheels));
  const damping = clamp(s.damping ?? critical * 0.45, critical * 0.34, critical * 0.85);

  // How far the spring compresses under the vehicle's own weight, and therefore
  // how high the body origin sits above the ground when it is simply parked.
  const sag = Math.min(staticLoad / stiffness, travel * 0.92);
  const restingLength = Math.max(0, restLength + travel - sag);
  const rideHeight = -mountY + restingLength + radius;

  return { radius, mountY, restLength, travel, stiffness, damping, nWheels, staticLoad, sag, rideHeight };
}

/** Height of a vehicle's body origin above the ground when parked, in metres. */
export function rideHeightFor(def) { return suspensionFor(def).rideHeight; }

export class VehicleSim {
  /**
   * @param {object} def a VehicleDef from content/vehicleCatalog.js
   * @param {PhysicsWorld} phys
   */
  constructor(def, phys, opts = {}) {
    this.def = def;
    this.phys = phys;
    this.owner = opts.owner || null;
    this.dead = false;

    const h = def.handling;
    this.mass = def.mass;
    this.invMass = 1 / def.mass;

    // Inertia tensor of an equivalent box, tuned: yaw inertia is reduced so cars rotate
    // like game cars rather than like fridges.
    const w = def.width, l = def.length, ht = def.height;
    const k = 1 / 12 * def.mass;
    this.inertia = new THREE.Vector3(
      k * (ht * ht + l * l) * 1.05,   // pitch (about X)
      k * (w * w + l * l) * 0.72,     // yaw   (about Y)
      k * (w * w + ht * ht) * 1.15,   // roll  (about Z)
    );
    this.invInertia = new THREE.Vector3(1 / this.inertia.x, 1 / this.inertia.y, 1 / this.inertia.z);

    this.position = new THREE.Vector3();
    this.quaternion = new THREE.Quaternion();
    this.velocity = new THREE.Vector3();
    this.angularVelocity = new THREE.Vector3();

    this.forward = new THREE.Vector3(0, 0, 1);
    this.right = new THREE.Vector3(1, 0, 0);
    this.up = new THREE.Vector3(0, 1, 0);

    // ---- controls ----
    this.throttle = 0; this.brake = 0; this.steerInput = 0; this.handbrake = 0;
    this.clutch = 1; this.boost = 0; this.airPitch = 0; this.airRoll = 0; this.airYaw = 0;
    this.reverseHeld = 0;

    // ---- drivetrain state ----
    this.engineRpm = def.engine.idleRpm;
    this.gear = 1;                  // -1 reverse, 0 neutral, 1..n
    this.shiftTimer = 0;
    this.shiftDir = 0;
    this.engineOn = true;
    this.stalled = false;
    this.rpmSmoothed = def.engine.idleRpm;
    this.wheelSpeed = 0;
    this.speed = 0;                 // scalar m/s
    this.forwardSpeed = 0;          // signed along +Z
    this.lateralSpeed = 0;
    this.driftAngle = 0;
    this.gForce = new THREE.Vector3();
    this._prevVel = new THREE.Vector3();

    // ---- condition ----
    this.health = 1000 * (def.durability || 1);
    this.maxHealth = this.health;
    this.engineHealth = 1;
    this.fuel = 1;
    this.onFire = 0;
    this.exploded = false;
    this.deformation = new Float32Array(8);   // per-corner crumple, metres
    this.lastImpactSpeed = 0;
    this.impactCooldown = 0;
    this.wheelsOnGround = 0;
    this.airTime = 0;
    this.flipTimer = 0;
    this.submersion = 0;
    this.inWater = false;

    // ---- steering ----
    this.steerAngle = 0;
    this.maxSteer = (h.steerMaxDeg || 34) * Math.PI / 180;

    // ---- assists ----
    this.abs = opts.abs ?? true;
    this.tcs = opts.tcs ?? (def.tags?.includes('exotic') ? false : true);
    this.assist = opts.assist ?? 0.3;

    this.wheels = this._buildWheels();
    this.nWheels = this.wheels.length;
    this.staticWheelLoad = (this.mass * 9.81) / this.nWheels;
    this.rideHeight = suspensionFor(def).rideHeight;
    this.isBike = def.body.kind === 'bike';
    this.isBoat = def.body.kind === 'boat';

    // Collider registered with the physics world.
    this.collider = new BoxCollider(0, 0, 0, def.width * 0.5, def.height * 0.5, def.length * 0.5, 0, {
      layer: LAYER.VEHICLE, surface: SURFACE.METAL, owner: opts.owner || this, restitution: 0.16,
    });

    this.events = { impact: null, wheelImpact: null, shift: null, splash: null };
    this._accum = 0;
    this._impacts = [];
  }

  _buildWheels() {
    const d = this.def;
    const halfTrack = d.track * 0.5;
    const frontZ = (d.wheels.frontT - 0.5) * d.length;
    const rearZ = (d.wheels.rearT - 0.5) * d.length;
    const sp = suspensionFor(d);
    const r = sp.radius, mountY = sp.mountY;
    const common = {
      radius: r, width: d.wheels.width, restLength: sp.restLength,
      travel: sp.travel, stiffness: sp.stiffness, damping: sp.damping,
    };

    if (d.body.kind === 'bike') {
      return [
        new Wheel({ ...common, lx: 0, ly: mountY, lz: frontZ, steered: true, driven: d.drivetrain !== 'rwd', brakeBias: 0.62 }),
        new Wheel({ ...common, lx: 0, ly: mountY, lz: rearZ, steered: false, driven: true, brakeBias: 0.38, handbrake: true }),
      ];
    }
    const fwd = d.drivetrain === 'fwd' || d.drivetrain === 'awd';
    const rwd = d.drivetrain === 'rwd' || d.drivetrain === 'awd';
    const bias = clamp(d.weightBiasFront ?? 0.52, 0.3, 0.75);
    const fBrake = lerp(0.52, 0.72, bias);
    const wheels = [
      new Wheel({ ...common, lx: -halfTrack, ly: mountY, lz: frontZ, steered: true, driven: fwd, brakeBias: fBrake }),
      new Wheel({ ...common, lx: halfTrack, ly: mountY, lz: frontZ, steered: true, driven: fwd, brakeBias: fBrake }),
      new Wheel({ ...common, lx: -halfTrack, ly: mountY, lz: rearZ, steered: false, driven: rwd, brakeBias: 1 - fBrake, handbrake: true }),
      new Wheel({ ...common, lx: halfTrack, ly: mountY, lz: rearZ, steered: false, driven: rwd, brakeBias: 1 - fBrake, handbrake: true }),
    ];
    // Six-wheelers (trucks) get a second rear axle for stability and looks.
    if (d.wheels.count === 6) {
      const z2 = rearZ + d.wheels.radius * 2.4;
      wheels.push(new Wheel({ ...common, lx: -halfTrack, ly: mountY, lz: z2, steered: false, driven: rwd, brakeBias: 1 - fBrake, handbrake: true }));
      wheels.push(new Wheel({ ...common, lx: halfTrack, ly: mountY, lz: z2, steered: false, driven: rwd, brakeBias: 1 - fBrake, handbrake: true }));
    }
    return wheels;
  }

  // -------------------------------------------------------------------------
  setTransform(x, y, z, yaw) {
    this.position.set(x, y, z);
    this.quaternion.setFromAxisAngle(UP, yaw);
    this.velocity.set(0, 0, 0);
    this.angularVelocity.set(0, 0, 0);
    this._syncBasis();
    this._syncCollider();
  }

  _syncBasis() {
    this.right.set(1, 0, 0).applyQuaternion(this.quaternion);
    this.up.set(0, 1, 0).applyQuaternion(this.quaternion);
    this.forward.set(0, 0, 1).applyQuaternion(this.quaternion);
  }
  _syncCollider() {
    const c = this.collider;
    c.x = this.position.x; c.y = this.position.y; c.z = this.position.z;
    c.setQuaternion(this.quaternion);
  }

  localToWorld(lx, ly, lz, out) {
    out.set(lx, ly, lz).applyQuaternion(this.quaternion).add(this.position);
    return out;
  }
  /** Velocity of a world point rigidly attached to the body. */
  pointVelocity(wx, wy, wz, out) {
    const rx = wx - this.position.x, ry = wy - this.position.y, rz = wz - this.position.z;
    const w = this.angularVelocity;
    out.set(
      this.velocity.x + w.y * rz - w.z * ry,
      this.velocity.y + w.z * rx - w.x * rz,
      this.velocity.z + w.x * ry - w.y * rx,
    );
    return out;
  }
  /** Apply a world-space force at a world point for this substep. */
  applyForceAt(fx, fy, fz, wx, wy, wz) {
    this._fx += fx; this._fy += fy; this._fz += fz;
    const rx = wx - this.position.x, ry = wy - this.position.y, rz = wz - this.position.z;
    this._tx += ry * fz - rz * fy;
    this._ty += rz * fx - rx * fz;
    this._tz += rx * fy - ry * fx;
  }
  /**
   * @param spin how much of the impulse's rotation to keep, 0..1. A rigid body
   *   hitting a wall at 20 m/s is entitled, on paper, to cartwheel — the contact
   *   point is a whole car length from the centre of mass and the impulse is
   *   enormous. Real cars crumple and absorb most of that instead of pivoting
   *   about the corner, and a car that flips every time it clips a building is
   *   no fun to drive, so collisions keep their full linear punch and only a
   *   share of the rotation.
   */
  applyImpulseAt(ix, iy, iz, wx, wy, wz, spin = 1) {
    this.velocity.x += ix * this.invMass;
    this.velocity.y += iy * this.invMass;
    this.velocity.z += iz * this.invMass;
    if (spin <= 0) return;
    const rx = wx - this.position.x, ry = wy - this.position.y, rz = wz - this.position.z;
    // torque impulse in world → body space → scaled by inverse inertia → back to world
    _v1.set(ry * iz - rz * iy, rz * ix - rx * iz, rx * iy - ry * ix);
    _q1.copy(this.quaternion).invert();
    _v1.applyQuaternion(_q1);
    _v1.x *= this.invInertia.x; _v1.y *= this.invInertia.y; _v1.z *= this.invInertia.z;
    _v1.applyQuaternion(this.quaternion);
    this.angularVelocity.addScaledVector(_v1, spin);
  }

  // -------------------------------------------------------------------------
  // Engine & gearbox
  // -------------------------------------------------------------------------
  /** Engine torque (Nm) at a given rpm and throttle, from the def's power/torque peaks. */
  engineTorque(rpm, throttle) {
    const e = this.def.engine;
    const t = clamp(rpm / e.redlineRpm, 0, 1.12);
    const peakT = e.peakTorqueRpm / e.redlineRpm;
    // A broad torque plateau that falls away at both ends.
    let curve;
    if (t < peakT) {
      const u = t / Math.max(peakT, 0.05);
      curve = 0.42 + 0.58 * Math.sin(u * Math.PI * 0.5);
    } else {
      const u = (t - peakT) / Math.max(1 - peakT, 0.05);
      curve = 1 - 0.42 * u * u;
    }
    if (t > 1.0) curve *= Math.max(0, 1 - (t - 1) * 7);       // rev limiter
    let torque = e.peakTorqueNm * curve;
    if (e.turbo) {
      const spool = clamp((rpm - e.idleRpm) / Math.max(1, e.peakTorqueRpm - e.idleRpm), 0, 1);
      torque *= 1 + e.turbo * 0.42 * spool * throttle;
    }
    const engineBrake = -e.peakTorqueNm * 0.11 * clamp(rpm / e.redlineRpm, 0, 1);
    return torque * throttle + engineBrake * (1 - throttle);
  }

  gearRatio(g) {
    const e = this.def.engine;
    if (g === 0) return 0;
    if (g < 0) return -e.reverseRatio;
    return e.gears[Math.min(g, e.gears.length) - 1];
  }
  get topGear() { return this.def.engine.gears.length; }

  _updateGearbox(dt) {
    const e = this.def.engine;
    if (this.shiftTimer > 0) {
      this.shiftTimer -= dt;
      this.clutch = clamp(1 - this.shiftTimer / (e.shiftTime || 0.22), 0, 1) * 0.35;
      if (this.shiftTimer <= 0) { this.gear += this.shiftDir; this.shiftDir = 0; this.clutch = 1; }
      return;
    }
    this.clutch = this.speed < 1.2 && this.gear !== 0 ? clamp(this.speed / 1.2, 0.12, 1) : 1;

    const wantReverse = this.reverseHeld > 0.4 && this.forwardSpeed < 1.4;
    if (wantReverse && this.gear >= 0) { this.gear = -1; return; }
    if (this.gear === -1 && this.throttle > 0.1 && this.forwardSpeed > -0.4 && this.reverseHeld < 0.2) { this.gear = 1; return; }
    if (this.gear <= 0) { if (!wantReverse && this.gear === 0) this.gear = 1; return; }

    const upRpm = e.redlineRpm * (this.throttle > 0.75 ? 0.955 : 0.80);
    const downRpm = e.redlineRpm * 0.40;
    if (this.engineRpm > upRpm && this.gear < this.topGear) { this._shift(1); return; }
    if (this.gear > 1) {
      // Predict the rpm one gear down; only drop if it stays below the limiter.
      const nextRpm = this.engineRpm * (this.gearRatio(this.gear - 1) / this.gearRatio(this.gear));
      if (this.engineRpm < downRpm && nextRpm < e.redlineRpm * 0.93) this._shift(-1);
    }
  }
  _shift(dir) {
    this.shiftDir = dir;
    this.shiftTimer = this.def.engine.shiftTime || 0.22;
    if (this.events.shift) this.events.shift(dir, this.gear + dir);
  }

  // -------------------------------------------------------------------------
  // Main step
  // -------------------------------------------------------------------------
  update(dt) {
    if (this.exploded) return;
    // An impact reported here has to survive until the next frame's readers. The
    // occupant's crash damage and the camera shake are read from the game loop
    // *before* vehicles step, so clearing it at the end of the step (as the
    // bodywork code used to) meant nobody outside this class ever saw a crash.
    this.lastImpactSpeed = 0;
    // Fixed 120 Hz substeps keep the tyre model stable at any frame rate.
    const H = 1 / 120;
    this._accum += Math.min(dt, 0.1);
    let iter = 0;
    while (this._accum >= H && iter < 14) { this._substep(H); this._accum -= H; iter++; }
    if (iter === 14) this._accum = 0;
    this._postStep(dt);
  }

  _substep(dt) {
    const def = this.def, h = def.handling;
    this._syncBasis();

    this._fx = 0; this._fy = 0; this._fz = 0;
    this._tx = 0; this._ty = 0; this._tz = 0;

    // ---- frame-local velocity ----
    this.speed = this.velocity.length();
    this.forwardSpeed = this.velocity.dot(this.forward);
    this.lateralSpeed = this.velocity.dot(this.right);
    const absFwd = Math.abs(this.forwardSpeed);

    // ---- steering: speed-sensitive limit + rate limiting ----
    const speedFactor = 1 / (1 + Math.max(0, absFwd) * 0.035);
    const targetSteer = this.steerInput * this.maxSteer * lerp(0.42, 1, speedFactor);
    const rate = (h.steerSpeed || 4.2) * dt * (1 + speedFactor * 0.4);
    this.steerAngle += clamp(targetSteer - this.steerAngle, -rate, rate);

    // Countersteer assist: nudge the rack toward the slide so the car is catchable.
    if (this.assist > 0 && absFwd > 5 && this.wheelsOnGround >= 3) {
      const drift = Math.atan2(this.lateralSpeed, absFwd);
      const help = clamp(-drift * this.assist * 0.9, -this.maxSteer * 0.5, this.maxSteer * 0.5);
      this.steerAngle = clamp(this.steerAngle + help * dt * 6, -this.maxSteer, this.maxSteer);
    }

    // ---- gravity ----
    this._fy += this.mass * this.phys.gravity;

    // ---- suspension + tyres ----
    let grounded = 0;
    let totalLoad = 0;
    for (let i = 0; i < this.nWheels; i++) totalLoad += this._suspension(this.wheels[i], dt);
    for (let i = 0; i < this.nWheels; i++) if (this.wheels[i].contact) grounded++;
    this.wheelsOnGround = grounded;
    this._antiRoll();
    const driveTorque = this._drivetrain(dt, totalLoad);
    for (let i = 0; i < this.nWheels; i++) this._tyre(this.wheels[i], dt, driveTorque);
    if (this.isBike) this._bikeBalance(dt);

    // ---- aerodynamics ----
    const v2 = this.speed * this.speed;
    if (this.speed > 0.2) {
      const dragMag = 0.5 * AIR_DENSITY * (h.dragCd || 0.34) * (h.frontalArea || 2.2) * v2;
      _v1.copy(this.velocity).normalize().multiplyScalar(-dragMag);
      this._fx += _v1.x; this._fy += _v1.y; this._fz += _v1.z;
      if (h.downforce) {
        // Authored downforce grows without bound with v², which at top speed pushed
        // the fastest cars straight through their own suspension and into the road.
        // Real road cars peak around one to two times their own weight.
        const df = Math.min(h.downforce * (v2 / 900), this.mass * 9.81 * 1.6);
        this._fx -= this.up.x * df; this._fy -= this.up.y * df; this._fz -= this.up.z * df;
      }
    }

    // ---- water ----
    this._water(dt);

    // ---- airborne attitude control (stunts) ----
    if (grounded === 0 && !this.inWater) {
      const auth = this.isBike ? 9 : 5.2;
      _v1.copy(this.right).multiplyScalar(this.airPitch * auth);
      _v2.copy(this.forward).multiplyScalar(-this.airRoll * auth);
      _v3.copy(this.up).multiplyScalar(this.airYaw * auth * 0.6);
      this.angularVelocity.addScaledVector(_v1, dt);
      this.angularVelocity.addScaledVector(_v2, dt);
      this.angularVelocity.addScaledVector(_v3, dt);
    }

    // ---- boost ----
    if (this.boost > 0 && this.fuel > 0) {
      const bf = this.mass * 9.5 * this.boost;
      this._fx += this.forward.x * bf; this._fy += this.forward.y * bf; this._fz += this.forward.z * bf;
    }

    // ---- integrate ----
    this.velocity.x += this._fx * this.invMass * dt;
    this.velocity.y += this._fy * this.invMass * dt;
    this.velocity.z += this._fz * this.invMass * dt;

    // torque → body space → angular acceleration → world
    _v1.set(this._tx, this._ty, this._tz);
    _q1.copy(this.quaternion).invert();
    _v1.applyQuaternion(_q1);
    _v1.x *= this.invInertia.x; _v1.y *= this.invInertia.y; _v1.z *= this.invInertia.z;
    _v1.applyQuaternion(this.quaternion);
    this.angularVelocity.addScaledVector(_v1, dt);

    // angular damping (tyre scrub + body damping keeps it from spinning forever)
    const angDamp = grounded > 0 ? 1 - 2.4 * dt : 1 - 0.55 * dt;
    this.angularVelocity.multiplyScalar(Math.max(0, angDamp));
    const maxSpin = 9;
    if (this.angularVelocity.lengthSq() > maxSpin * maxSpin) this.angularVelocity.setLength(maxSpin);

    this.position.addScaledVector(this.velocity, dt);
    const w = this.angularVelocity;
    _q2.set(w.x * dt * 0.5, w.y * dt * 0.5, w.z * dt * 0.5, 0).multiply(this.quaternion);
    this.quaternion.x += _q2.x; this.quaternion.y += _q2.y;
    this.quaternion.z += _q2.z; this.quaternion.w += _q2.w;
    this.quaternion.normalize();

    this._syncBasis();
    this._syncCollider();
    this._collide(dt);
    // Collision impulses land after the integrator's own spin limit, and a hard
    // corner impact could hand the body sixty radians a second — ten full
    // rotations — so cap it again once the impulses are in.
    const postSpin = 12;
    if (this.angularVelocity.lengthSq() > postSpin * postSpin) this.angularVelocity.setLength(postSpin);
    if (this.speed > 0) {
      const v = this.velocity.length();
      if (v > 140) this.velocity.multiplyScalar(140 / v);
    }
    this._unbury();
  }

  /**
   * Last-resort recovery. A hard enough landing can move the body further in one
   * substep than the wheel rays are long, which used to drop the car through the
   * terrain and leave it falling forever. If the whole hull ends up under the
   * ground, lift it back out and kill the downward velocity.
   */
  _unbury() {
    const terr = this.phys.terrain;
    if (!Number.isFinite(this.position.x + this.position.y + this.position.z)) {
      this.position.set(0, 8, 0);
      this.velocity.set(0, 0, 0);
      this.angularVelocity.set(0, 0, 0);
      return;
    }
    if (!terr) return;
    const gy = terr.heightAt(this.position.x, this.position.z);
    const half = this.def.height * 0.5;
    // `position` is the hull centre, so `+half` is its roof: if even that is
    // below the ground the car cannot possibly be driving on anything.
    if (this.position.y + half < gy) {
      this.position.y = gy + half * 1.2;
      if (this.velocity.y < 0) this.velocity.y = 0;
      this.velocity.multiplyScalar(0.4);
      this.angularVelocity.multiplyScalar(0.3);
      this._syncBasis();
      this._syncCollider();
    }
  }

  /** Raycast one wheel and apply its spring force. Returns the vertical load (N). */
  _suspension(wheel, dt) {
    const phys = this.phys;
    this.localToWorld(wheel.lx, wheel.ly, wheel.lz, _v1);
    wheel.worldPos.copy(_v1);
    const maxLen = wheel.maxLength + wheel.radius;
    const hit = phys.raycast(
      _v1.x, _v1.y, _v1.z,
      -this.up.x, -this.up.y, -this.up.z,
      maxLen, MASK_SOLID | LAYER.VEHICLE, { ignore: this.owner || this },
    );

    if (!hit.hit) {
      wheel.contact = false; wheel.grounded = false;
      wheel.suspensionLength = wheel.maxLength;
      wheel.compression = 0; wheel.load = 0;
      wheel.forceLong = 0; wheel.forceLat = 0;
      wheel.onGroundTime = 0;
      wheel.skid *= 0.9;
      // Track the extended length while airborne. Leaving this stale made the
      // damper see a huge closing speed on the very first frame back on the
      // ground, which launched the car again — a pogo stick that never settled.
      wheel.prevLen = wheel.maxLength;
      return 0;
    }

    const len = clamp(hit.dist - wheel.radius, 0, wheel.maxLength);
    // 0 at full droop, 1 when the shaft is fully collapsed. Measuring this over
    // `travel` instead used to report a bump-stop hit during ordinary cornering,
    // because the shaft has far more room than one spring travel.
    wheel.compression = clamp((wheel.maxLength - len) / Math.max(wheel.maxLength, 0.01), 0, 1);
    wheel.contact = true; wheel.grounded = true;
    wheel.onGroundTime += dt;
    wheel.contactPoint.set(hit.px, hit.py, hit.pz);
    wheel.contactNormal.set(hit.nx, hit.ny, hit.nz);
    wheel.contactSurface = hit.surface;
    wheel.suspensionLength = len;

    // spring + damper along the wheel's travel axis
    const springDisp = wheel.maxLength - len;
    // A damper can only ever move as fast as the travel it has; clamping keeps
    // one deep frame from turning into an impulse the size of a small rocket.
    const vel = clamp((wheel.prevLen - len) / Math.max(dt, 1e-5), -9, 9);
    wheel.prevLen = len;
    let force = wheel.stiffness * springDisp + wheel.damping * vel;
    // Bump stop: a much stiffer rubber in the last stretch of shaft travel, damped
    // so it absorbs a landing instead of bouncing the car back into the air.
    const bumpZone = wheel.travel * 0.35;
    if (len < bumpZone) {
      const into = bumpZone - len;
      force += wheel.stiffness * 6 * into * (vel > 0 ? 1 : 0.3);
    }
    // Cap at roughly 6 g of each wheel's static share, so a hard landing is
    // punchy but bounded — and so two-wheelers are not held to a car's budget.
    force = clamp(force, 0, this.staticWheelLoad * 6);
    wheel.load = force;

    // Apply along the contact normal, damped by how tilted the surface is.
    const nDotUp = Math.max(0.18, wheel.contactNormal.dot(this.up));
    const f = force * nDotUp;
    this.applyForceAt(
      wheel.contactNormal.x * f, wheel.contactNormal.y * f, wheel.contactNormal.z * f,
      wheel.worldPos.x - this.up.x * len, wheel.worldPos.y - this.up.y * len, wheel.worldPos.z - this.up.z * len,
    );
    return force;
  }

  /**
   * Rider balance for two-wheelers. A motorcycle is an inverted pendulum: with
   * nothing holding it up it falls over the moment anything disturbs it, which
   * is exactly what happened before this existed. Steer the roll rate toward an
   * upright reference that leans into the corner, at the velocity level so the
   * response does not depend on the bike's roll inertia.
   */
  _bikeBalance(dt) {
    const groundedFrac = this.wheelsOnGround / this.nWheels;
    // Deliberate stunt tumbling: keep authority low while airborne and inverted
    // so a backflip still reads, but never give up entirely.
    const authority = groundedFrac > 0 ? lerp(4.5, 11, groundedFrac)
      : (this.up.y > 0 ? 2.2 : 0.7);

    // Lean target from the corner the bike is actually turning.
    const speed = Math.abs(this.forwardSpeed);
    const yawRate = this.angularVelocity.dot(this.up);
    const lean = speed > 1.5
      ? clamp(Math.atan2(yawRate * speed, 9.81), -0.62, 0.62)
      : 0;

    // Upright reference: world up with the forward component projected out, then
    // rolled by the lean angle about the bike's own forward axis.
    _v1.set(0, 1, 0).addScaledVector(this.forward, -this.forward.y);
    if (_v1.lengthSq() < 1e-6) return;      // pointing straight up or down
    _v1.normalize();
    if (lean !== 0) {
      _q1.setFromAxisAngle(this.forward, -lean);
      _v1.applyQuaternion(_q1);
    }

    // Signed roll error about `forward`: positive torque about forward swings
    // `up` toward `-right`, so that is the direction the sine term measures.
    const err = Math.atan2(-_v1.dot(this.right), clamp(this.up.dot(_v1), -1, 1));
    const rollRate = this.angularVelocity.dot(this.forward);
    const desired = clamp(err * 6, -7, 7);
    const blend = clamp(authority * dt, 0, 1);
    this.angularVelocity.addScaledVector(this.forward, (desired - rollRate) * blend);
  }

  /** Anti-roll bars: transfer load across each axle so the car leans less in corners. */
  _antiRoll() {
    // A two-wheeler has no axle pairs — pairing its front and rear wheels here
    // would pitch the bike rather than resist roll.
    if (this.isBike) return;
    // Scaled against the shaft length now that `compression` spans the whole shaft.
    const stiff = (this.def.handling.rollStiffness ?? 0.45) * this.mass * 48;
    for (let i = 0; i + 1 < this.nWheels; i += 2) {
      const a = this.wheels[i], b = this.wheels[i + 1];
      // A real bar only transfers load between two loaded wheels; with one in
      // the air it just droops. Applying its force to the grounded wheel alone
      // is a net lift with a lever arm, which quietly rolled stopped cars over.
      if (!a.contact || !b.contact) continue;
      const diff = (a.compression - b.compression);
      if (Math.abs(diff) < 1e-4) continue;
      // The bar must lift the body on the side that is compressed further and
      // pull it down on the side that has extended — the other way round this is
      // a *pro*-roll bar, and the car rolls itself over pulling away from a kerb.
      // The bar must lift the body on the side that is compressed further and
      // pull it down on the side that has extended — the other way round this is
      // a *pro*-roll bar, and the car rolls itself over pulling away from a kerb.
      // Bounded so it can never overpower the springs it is helping.
      const f = clamp(diff * stiff, -this.staticWheelLoad * 2.5, this.staticWheelLoad * 2.5);
      this.applyForceAt(this.up.x * f, this.up.y * f, this.up.z * f, a.worldPos.x, a.worldPos.y, a.worldPos.z);
      this.applyForceAt(-this.up.x * f, -this.up.y * f, -this.up.z * f, b.worldPos.x, b.worldPos.y, b.worldPos.z);
    }
  }

  /** Update engine rpm from wheel speed, and return drive torque per driven wheel. */
  _drivetrain(dt, totalLoad) {
    const e = this.def.engine;
    this._updateGearbox(dt);

    let drivenCount = 0, drivenSpin = 0;
    for (const w of this.wheels) if (w.driven) { drivenCount++; drivenSpin += w.angularVel; }
    const avgSpin = drivenCount ? drivenSpin / drivenCount : 0;
    this.wheelSpeed = avgSpin * this.def.wheels.radius;

    const ratio = this.gearRatio(this.gear) * e.finalDrive;
    let targetRpm = e.idleRpm;
    if (ratio !== 0 && this.clutch > 0.05) {
      targetRpm = Math.abs(avgSpin * ratio) * RADS_TO_RPM;
    } else {
      targetRpm = lerp(e.idleRpm, e.redlineRpm * 0.92, this.throttle);
    }
    targetRpm = clamp(targetRpm, e.idleRpm * 0.85, e.redlineRpm * 1.06);
    const blend = this.clutch > 0.5 ? 14 : 7;
    this.engineRpm = damp(this.engineRpm, targetRpm, blend, dt);

    if (!this.engineOn || this.fuel <= 0 || this.engineHealth <= 0.02 || this.submersion > 0.6) {
      this.engineRpm = damp(this.engineRpm, 0, 4, dt);
      return 0;
    }

    let throttle = this.throttle;
    // Traction control: cut power when the driven wheels spin up faster than the car.
    if (this.tcs && this.speed > 1.5) {
      let worst = 0;
      for (const w of this.wheels) if (w.driven) worst = Math.max(worst, Math.abs(w.slipRatio));
      if (worst > 0.22) throttle *= clamp(1 - (worst - 0.22) * 2.4, 0.18, 1);
    }
    const torque = this.engineTorque(this.engineRpm, throttle) * this.engineHealth;
    const wheelTorque = torque * ratio * this.clutch;
    return drivenCount ? wheelTorque / drivenCount : 0;
  }

  /** Longitudinal + lateral tyre forces for one wheel. */
  _tyre(wheel, dt, driveTorque) {
    const def = this.def, h = def.handling;
    // Wheel angular dynamics run even in the air so the visual spin looks right.
    let torque = wheel.driven ? driveTorque : 0;
    const surf = SURFACE_PROPS[wheel.contactSurface] || SURFACE_PROPS.road;

    if (!wheel.contact) {
      wheel.angularVel = clamp(wheel.angularVel + (torque / wheel.inertia) * dt, -420, 420);
      wheel.angularVel *= 1 - 0.6 * dt;
      // brakes still bite in the air
      const bt = this.brake * h.brakeTorque * wheel.brakeBias;
      wheel.angularVel -= sign(wheel.angularVel) * Math.min(Math.abs(wheel.angularVel), (bt / wheel.inertia) * dt);
      wheel.spin += wheel.angularVel * dt;
      wheel.slipRatio = 0; wheel.slipAngle = 0;
      return;
    }

    // Wheel frame: steered forward / right projected onto the contact plane.
    const steer = wheel.steered ? wheel.steerAngle : 0;
    _q1.setFromAxisAngle(this.up, steer);
    _v1.copy(this.forward).applyQuaternion(_q1);          // wheel forward
    _v2.copy(this.right).applyQuaternion(_q1);            // wheel right
    const n = wheel.contactNormal;
    _v1.addScaledVector(n, -_v1.dot(n)).normalize();
    _v2.addScaledVector(n, -_v2.dot(n)).normalize();

    this.pointVelocity(wheel.contactPoint.x, wheel.contactPoint.y, wheel.contactPoint.z, _v3);
    const vLong = _v3.dot(_v1);
    const vLat = _v3.dot(_v2);
    const absVLong = Math.abs(vLong);

    // --- slip ratio ---
    const wheelV = wheel.angularVel * wheel.radius;
    const denom = Math.max(absVLong, 1.6);
    let slipRatio = (wheelV - vLong) / denom;
    slipRatio = clamp(slipRatio, -4, 4);
    wheel.slipRatio = slipRatio;

    // --- slip angle ---
    const slipAngle = Math.atan2(-vLat, Math.max(absVLong, 0.9));
    wheel.slipAngle = slipAngle;

    // --- friction limit ---
    const gripBase = (h.tireGrip || 1.0) * surf.grip * (wheel.flat ? 0.45 : 1);
    const load = wheel.load;
    // Load sensitivity: tyres lose relative grip as they are loaded up.
    const nominal = (this.mass * 9.81) / this.nWheels;
    const loadFactor = load > 0 ? Math.pow(clamp(load / Math.max(nominal, 1), 0.05, 3), -0.16) : 0;
    const mu = gripBase * loadFactor;
    // Real tyres saturate: past a few times static load they stop giving proportionally more.
    const gripLoad = Math.min(load, nominal * 3.2);
    const maxForce = mu * gripLoad;

    // --- Pacejka curves (normalised) ---
    const B_long = 11, C_long = 1.62, E_long = 0.32;
    const B_lat = this.isBike ? 9.5 : 8.4, C_lat = 1.38, E_lat = 0.96;
    let fLongN = pacejka(slipRatio, B_long, C_long, 1, E_long);
    let fLatN = pacejka(slipAngle, B_lat, C_lat, 1, E_lat);

    // Handbrake locks the rear.
    if (wheel.handbrake && this.handbrake > 0.05) {
      const hb = this.handbrake * (h.handbrakeBias ?? 0.9);
      wheel.angularVel *= 1 - hb * 0.92;
      fLatN *= 1 - hb * 0.72;
      fLongN = -sign(vLong) * Math.min(1, hb * 1.1);
    }

    // --- friction circle ---
    const drift = h.driftFactor ?? 0.25;
    let combined = Math.hypot(fLongN, fLatN * (1 - drift * 0.25));
    if (combined > 1) { fLongN /= combined; fLatN /= combined; }

    let fLong = fLongN * maxForce;
    let fLat = fLatN * maxForce;

    // --- braking ---
    let brakeTorque = this.brake * h.brakeTorque * wheel.brakeBias;
    if (this.abs && brakeTorque > 0 && absVLong > 2.2) {
      // Release when the wheel is about to lock.
      const lockRatio = Math.abs(wheelV) / Math.max(absVLong, 0.1);
      if (lockRatio < 0.72) brakeTorque *= clamp(lockRatio / 0.72, 0.25, 1);
    }
    // rolling resistance
    const roll = surf.roll * load * sign(wheelV || vLong);

    // --- integrate wheel spin ---
    const reaction = -fLong * wheel.radius;
    let netTorque = torque + reaction - roll * wheel.radius;
    wheel.angularVel = clamp(wheel.angularVel + (netTorque / wheel.inertia) * dt, -420, 420);
    if (brakeTorque > 0) {
      const dv = (brakeTorque / wheel.inertia) * dt;
      if (Math.abs(wheel.angularVel) <= dv) wheel.angularVel = absVLong < 0.6 ? 0 : wheel.angularVel * 0.1;
      else wheel.angularVel -= sign(wheel.angularVel) * dv;
    }
    // Stop creeping when stationary with no throttle.
    if (this.throttle < 0.02 && absVLong < 0.35 && this.brake > 0.05) wheel.angularVel *= 0.72;
    wheel.spin += wheel.angularVel * dt;

    // --- apply to body ---
    const cp = wheel.contactPoint;
    this.applyForceAt(_v1.x * fLong, _v1.y * fLong, _v1.z * fLong, cp.x, cp.y, cp.z);
    this.applyForceAt(_v2.x * fLat, _v2.y * fLat, _v2.z * fLat, cp.x, cp.y, cp.z);
    wheel.forceLong = fLong; wheel.forceLat = fLat;

    // --- skid amount drives smoke, marks and sound ---
    const slipSpeed = Math.hypot(wheelV - vLong, vLat);
    const target = clamp((slipSpeed - 1.8) / 11, 0, 1) * (surf.screech > 0 ? 1 : 0.45);
    wheel.skid = damp(wheel.skid, target, 12, dt);
    wheel.burnout = wheel.driven && this.throttle > 0.6 && Math.abs(slipRatio) > 0.5 && absVLong < 9
      ? clamp(Math.abs(slipRatio) * 0.5, 0, 1) : wheel.burnout * 0.9;
  }

  /** Buoyancy, drag and engine drowning. */
  _water(dt) {
    const phys = this.phys;
    if (!phys.terrain || !phys.terrain.isWater(this.position.x, this.position.z)) {
      this.submersion = damp(this.submersion, 0, 4, dt);
      this.inWater = this.submersion > 0.05;
      return;
    }
    const waterY = phys.waterLevel;
    const bottom = this.position.y - this.def.height * 0.5;
    const depth = waterY - bottom;
    const sub = clamp(depth / Math.max(this.def.height, 0.4), 0, 1);
    this.submersion = sub;
    this.inWater = sub > 0.02;
    if (sub <= 0) return;

    const displaced = sub * this.def.length * this.def.width * this.def.height * 0.62;
    let buoy = 1000 * 9.81 * displaced;
    if (!this.isBoat) buoy *= 0.78;                    // cars sink
    this._fy += buoy;
    // heavy drag
    const dragK = sub * (this.isBoat ? 220 : 900);
    this._fx -= this.velocity.x * dragK;
    this._fy -= this.velocity.y * dragK * 1.6;
    this._fz -= this.velocity.z * dragK * (this.isBoat ? 0.12 : 1);
    this.angularVelocity.multiplyScalar(Math.max(0, 1 - sub * 3 * dt));
    if (this.isBoat) {
      // Boats get thrust from the prop when it is wet.
      const thrust = this.throttle * this.def.engine.peakPowerKw * 26 * sub;
      this._fx += this.forward.x * thrust;
      this._fz += this.forward.z * thrust;
      const steerTorque = -this.steerInput * this.speed * this.mass * 0.9;
      this._ty += steerTorque;
    } else if (sub > 0.55) {
      this.engineHealth = Math.max(0, this.engineHealth - dt * 0.55);
    }
  }

  /** Body-vs-world collision resolution with impulses and damage. */
  _collide(dt) {
    const phys = this.phys;
    const c = this.collider;
    const r = Math.hypot(c.hw, c.hh, c.hd);
    const statics = phys.overlapSphereStatic(c.x, c.y, c.z, r, _scratch);
    let biggest = 0;
    for (let i = 0; i < statics.length; i++) {
      const s = statics[i];
      if (s.dead) continue;
      const res = obbVsObb(c, s, _sat);
      if (!res) continue;
      // Separate gradually (the normal points from vehicle to static, so push
      // back along -n). Correcting the whole overlap every substep is a teleport
      // at 120 Hz, and teleporting a car wedged against a kerb threw it across
      // the street; a partial push still clears in a few milliseconds.
      const push = Math.min(res.depth * 0.55, 0.06);
      this.position.x -= res.nx * push;
      this.position.y -= res.ny * push;
      this.position.z -= res.nz * push;
      this._syncCollider();

      // Contact point ≈ deepest point of the vehicle along the axis, drawn in
      // toward the centre of mass so a corner graze cannot hand the body more
      // spin than the hit deserves.
      _v1.set(c.x + res.nx * c.hw * 0.55, c.y + res.ny * c.hh * 0.55, c.z + res.nz * c.hd * 0.55);
      this.pointVelocity(_v1.x, _v1.y, _v1.z, _v2);
      const vn = _v2.x * res.nx + _v2.y * res.ny + _v2.z * res.nz;
      // Ignore the millimetre-per-second chatter of a car simply resting
      // against something; only real closing speed earns an impulse.
      if (vn > 0.25) {
        const rest = s.restitution ?? 0.14;
        const j = -(1 + rest) * vn * this.mass * 0.82;
        this.applyImpulseAt(res.nx * j, res.ny * j, res.nz * j, _v1.x, _v1.y, _v1.z, COLLISION_SPIN);
        // tangential friction
        _v3.set(_v2.x - res.nx * vn, _v2.y - res.ny * vn, _v2.z - res.nz * vn);
        const tl = _v3.length();
        if (tl > 0.05) {
          const fr = Math.min(tl * this.mass * 0.32, Math.abs(j) * (s.friction ?? 0.8));
          _v3.multiplyScalar(-fr / tl);
          this.applyImpulseAt(_v3.x, _v3.y, _v3.z, _v1.x, _v1.y, _v1.z, COLLISION_SPIN);
        }
        biggest = Math.max(biggest, vn);
        if (s.breakable && vn > 2.4) this._impacts.push({ type: 'break', collider: s, speed: vn, x: _v1.x, y: _v1.y, z: _v1.z });
      }
    }

    // vehicle vs vehicle / ped
    const dyn = phys.overlapSphereDynamic(c.x, c.y, c.z, r + 3, _scratch, LAYER.VEHICLE);
    for (let i = 0; i < dyn.length; i++) {
      const o = dyn[i];
      if (o === this.owner || o === this || o.dead) continue;
      const oc = o.collider;
      if (!oc) continue;
      const res = obbVsObb(c, oc, _sat);
      if (!res) continue;
      const other = o.sim || (o.isVehicleSim ? o : null);
      const otherMass = other ? other.mass : 1e6;
      const total = this.mass + otherMass;
      const myShare = otherMass / total;
      const push = Math.min(res.depth * 0.55, 0.06);
      this.position.x -= res.nx * push * myShare;
      this.position.y -= res.ny * push * myShare * 0.4;
      this.position.z -= res.nz * push * myShare;
      this._syncCollider();

      _v1.set((c.x + oc.x) * 0.5, (c.y + oc.y) * 0.5, (c.z + oc.z) * 0.5);
      this.pointVelocity(_v1.x, _v1.y, _v1.z, _v2);
      if (other) { other.pointVelocity(_v1.x, _v1.y, _v1.z, _v4); _v2.sub(_v4); }
      const vn = _v2.x * res.nx + _v2.y * res.ny + _v2.z * res.nz;
      if (vn > 0.25) {
        const j = -(1 + 0.22) * vn * (this.mass * otherMass) / total;
        this.applyImpulseAt(res.nx * j, res.ny * j, res.nz * j, _v1.x, _v1.y, _v1.z, COLLISION_SPIN);
        if (other) other.applyImpulseAt(-res.nx * j, -res.ny * j, -res.nz * j, _v1.x, _v1.y, _v1.z, COLLISION_SPIN);
        biggest = Math.max(biggest, vn);
        if (vn > 2) this._impacts.push({ type: 'vehicle', other: o, speed: vn, x: _v1.x, y: _v1.y, z: _v1.z });
      }
    }

    if (biggest > 1.6 && this.impactCooldown <= 0) {
      this.lastImpactSpeed = biggest;
      this.impactCooldown = 0.08;
      this._impacts.push({ type: 'impact', speed: biggest, x: c.x, y: c.y, z: c.z });
    }
  }

  _postStep(dt) {
    this.impactCooldown = Math.max(0, this.impactCooldown - dt);
    this.speed = this.velocity.length();
    this.forwardSpeed = this.velocity.dot(this.forward);
    this.lateralSpeed = this.velocity.dot(this.right);
    this.driftAngle = Math.abs(this.forwardSpeed) > 2 ? Math.atan2(this.lateralSpeed, Math.abs(this.forwardSpeed)) : 0;
    this.rpmSmoothed = damp(this.rpmSmoothed, this.engineRpm, 12, dt);
    this.airTime = this.wheelsOnGround === 0 ? this.airTime + dt : 0;

    // g-force for camera shake and HUD
    _v1.copy(this.velocity).sub(this._prevVel).divideScalar(Math.max(dt, 1e-4));
    this.gForce.copy(_v1).divideScalar(9.81);
    this._prevVel.copy(this.velocity);

    // fuel burn
    if (this.engineOn) {
      this.fuel = Math.max(0, this.fuel - dt * (0.00019 + this.throttle * 0.00052 + (this.boost > 0 ? 0.0022 : 0)));
    }

    // damage from impacts
    for (const im of this._impacts) {
      if (im.type === 'impact') {
        const dmg = Math.max(0, (im.speed - 2.2)) * 26 * (1 / (this.def.durability || 1));
        if (dmg > 0) this.damage(dmg, im.x, im.y, im.z);
        if (this.events.impact) this.events.impact(im);
      } else if (this.events.impact) this.events.impact(im);
    }
    this._impacts.length = 0;

    // fire / explosion
    if (this.health <= this.maxHealth * 0.16 && !this.onFire && this.health > 0) this.onFire = 0.001;
    if (this.onFire > 0 && !this.exploded) {
      this.onFire += dt;
      this.health -= dt * 26;
      this.engineHealth = Math.max(0, this.engineHealth - dt * 0.12);
      if (this.health <= 0) this.explode();
    }

    // upside-down timer
    this.flipTimer = this.up.y < 0.18 && this.speed < 2 ? this.flipTimer + dt : 0;

    // sleep tiny jitter so parked cars stay put
    if (this.speed < 0.06 && this.throttle < 0.01 && this.wheelsOnGround >= this.nWheels - 1
        && this.angularVelocity.lengthSq() < 0.02) {
      this.velocity.multiplyScalar(0.55);
      this.angularVelocity.multiplyScalar(0.5);
    }
    // Safety net: nothing in this game should ever exceed ~500 km/h.
    const MAX_SPEED = 140;
    if (this.speed > MAX_SPEED) {
      this.velocity.multiplyScalar(MAX_SPEED / this.speed);
      this.speed = MAX_SPEED;
    }
    if (!Number.isFinite(this.position.x + this.position.y + this.position.z)) this._recover();
  }

  _recover() {
    console.warn('[vehicle] non-finite transform, recovering');
    this.position.set(0, 12, 0);
    this.velocity.set(0, 0, 0);
    this.angularVelocity.set(0, 0, 0);
    this.quaternion.identity();
  }

  damage(amount, x, y, z) {
    if (this.exploded) return;
    this.health = Math.max(0, this.health - amount);
    this.engineHealth = Math.max(0, this.engineHealth - amount / (this.maxHealth * 2.6));
    // record crumple at the nearest corner
    if (x !== undefined) {
      _v1.set(x - this.position.x, y - this.position.y, z - this.position.z);
      _q1.copy(this.quaternion).invert();
      _v1.applyQuaternion(_q1);
      const idx = (_v1.z > 0 ? 4 : 0) + (_v1.x > 0 ? 2 : 0) + (_v1.y > 0 ? 1 : 0);
      this.deformation[idx] = Math.min(0.4, this.deformation[idx] + amount / 3000);
    }
    if (this.health <= 0) this.explode();
  }

  explode() {
    if (this.exploded) return;
    this.exploded = true;
    this.engineOn = false;
    this.health = 0;
  }

  /** Flip an upside-down car back over. */
  flipUpright() {
    const yaw = Math.atan2(this.forward.x, this.forward.z);
    this.quaternion.setFromAxisAngle(UP, yaw);
    this.position.y += 0.9;
    this.angularVelocity.set(0, 0, 0);
    this.velocity.multiplyScalar(0.2);
    this.flipTimer = 0;
    this._syncBasis(); this._syncCollider();
  }

  get rpmNormalized() { return clamp(this.rpmSmoothed / this.def.engine.redlineRpm, 0, 1.1); }
  get kmh() { return this.speed * 3.6; }
  get mph() { return this.speed * 2.23694; }
  get averageSkid() {
    let s = 0;
    for (const w of this.wheels) s = Math.max(s, w.skid);
    return s;
  }
}

const UP = new THREE.Vector3(0, 1, 0);
// Share of a collision impulse's rotation that reaches the body (see applyImpulseAt).
const COLLISION_SPIN = 0.3;
