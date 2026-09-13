// player.js — the character you control, on foot and behind the wheel.
import * as THREE from 'three';
import { clamp, lerp, damp, angleDamp, angleDelta, TAU } from '../core/mathx.js';
import { CharacterController, MOVE_STATE } from '../physics/character.js';
import { BoxCollider, LAYER, SURFACE, SURFACE_PROPS, MASK_SOLID } from '../physics/world.js';
import { WeaponSystem } from '../combat/weapons.js';
import { getWeapon } from '../content/weaponCatalog.js';
import { EngineSound } from '../audio/engineSound.js';

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler(0, 0, 0, 'YXZ');

export class Player {
  constructor(ctx) {
    this.ctx = ctx;
    this.isPlayer = true;
    this.dead = false;
    this.name = 'Rey Delgado';

    this.body = new CharacterController(ctx.physics, { radius: 0.34, height: 1.82, mass: 82 });
    this.body.ignore = this;
    this.collider = new BoxCollider(0, 0, 0, 0.36, 0.91, 0.3, 0, {
      layer: LAYER.PLAYER, surface: SURFACE.FLESH, owner: this,
    });
    ctx.physics.addDynamic(this);

    this.health = 100;
    this.maxHealth = 100;
    this.armor = 0;
    this.maxArmor = 100;
    this.stamina = 1;
    this.yaw = 0;
    this.pitch = 0;
    this.aimDirection = new THREE.Vector3(0, 0, 1);
    this.weapons = new WeaponSystem(ctx, this);
    this.vehicle = null;
    this.seat = -1;
    this.enterCooldown = 0;
    this.lastDamageTime = -99;
    this.regenDelay = 7;
    this.wanted = 0;
    this.money = 850;
    this.threatLevel = 0;      // how alarming the player currently looks to peds
    this.sprinting = false;
    this.crouching = false;
    this.swimTime = 0;
    this.airTime = 0;
    this.fallStartY = 0;
    this.stepTimer = 0;
    this.deathTimer = 0;
    this.busted = false;
    this.invulnUntil = 0;
    this.lastSafePoint = new THREE.Vector3();
    this.kills = 0;
    this.distanceDriven = 0;
    this.distanceWalked = 0;

    this._buildMesh();
    this.engineSound = new EngineSound(ctx);
    this._prevVehiclePos = new THREE.Vector3();
  }

  // -------------------------------------------------------------------------
  _buildMesh() {
    const ctx = this.ctx;
    this.group = new THREE.Group();
    this.group.name = 'player';
    this.group.userData.entity = this;

    const mats = ctx.materials;
    const skin = mats.skin.clone(); skin.color.setHex(0xc8996f);
    const shirt = mats.cloth.clone(); shirt.color.setHex(0x2b3a52);
    const pants = mats.denim ? mats.denim.clone() : mats.cloth.clone();
    if (pants.color) pants.color.setHex(0x33405c);
    const shoes = mats.cloth.clone(); shoes.color.setHex(0x1b1b20);

    const cap = (r, h) => new THREE.CapsuleGeometry(r, Math.max(0.01, h - r * 2), 3, 8);
    const mk = (geo, mat, x, y, z) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      return m;
    };
    const root = new THREE.Group();
    this.group.add(root);
    this.root = root;

    this.torso = mk(cap(0.145, 0.54), shirt, 0, 1.18, 0);
    this.torso.scale.set(1.06, 1, 0.8);
    root.add(this.torso);
    this.hips = mk(cap(0.135, 0.24), pants, 0, 0.95, 0);
    root.add(this.hips);

    this.neck = new THREE.Group();
    this.neck.position.set(0, 1.46, 0);
    root.add(this.neck);
    this.head = mk(new THREE.SphereGeometry(0.118, 12, 10), skin, 0, 0.06, 0);
    this.head.scale.set(0.95, 1.06, 1);
    this.neck.add(this.head);
    const hair = mk(new THREE.SphereGeometry(0.125, 12, 8, 0, TAU, 0, Math.PI * 0.6), mats.hairMat.clone(), 0, 0.075, 0);
    hair.material.color.setHex(0x1c130d);
    this.neck.add(hair);

    this.arms = [];
    for (const side of [-1, 1]) {
      const shoulder = new THREE.Group();
      shoulder.position.set(side * 0.2, 1.38, 0);
      root.add(shoulder);
      shoulder.add(mk(cap(0.055, 0.3), shirt, 0, -0.15, 0));
      const elbow = new THREE.Group();
      elbow.position.set(0, -0.3, 0);
      shoulder.add(elbow);
      elbow.add(mk(cap(0.048, 0.28), skin, 0, -0.14, 0));
      const hand = new THREE.Group();
      hand.position.set(0, -0.28, 0);
      elbow.add(hand);
      hand.add(mk(new THREE.SphereGeometry(0.055, 7, 6), skin, 0, 0, 0));
      this.arms.push({ shoulder, elbow, hand, side });
    }
    this.legs = [];
    for (const side of [-1, 1]) {
      const hip = new THREE.Group();
      hip.position.set(side * 0.105, 0.89, 0);
      root.add(hip);
      hip.add(mk(cap(0.08, 0.42), pants, 0, -0.21, 0));
      const knee = new THREE.Group();
      knee.position.set(0, -0.42, 0);
      hip.add(knee);
      knee.add(mk(cap(0.066, 0.42), pants, 0, -0.21, 0));
      const foot = mk(new THREE.BoxGeometry(0.1, 0.07, 0.25), shoes, 0, -0.42, 0.05);
      knee.add(foot);
      this.legs.push({ hip, knee, foot, side });
    }

    // The weapon hangs off the right hand.
    this.arms[1].hand.add(this.weapons.modelGroup);
    this.weapons.modelGroup.position.set(0, -0.03, 0.06);
    this.weapons.modelGroup.rotation.set(0, 0, 0);

    ctx.scene.add(this.group);
    this.animPhase = 0;
  }

  get position() { return this.vehicle ? this.vehicle.sim.position : this.body.position; }
  get speed() { return this.vehicle ? this.vehicle.sim.speed : Math.hypot(this.body.velocity.x, this.body.velocity.z); }
  get inVehicle() { return !!this.vehicle; }
  get isDriving() { return !!this.vehicle && this.vehicle.driver === this; }
  get eyePosition() {
    if (this.vehicle) {
      return this.vehicle.localPoint(0, this.vehicle.def.height * 0.18, this.vehicle.def.length * 0.08, _v3);
    }
    return _v3.set(this.body.position.x, this.body.position.y + this.body.eyeHeight, this.body.position.z);
  }

  spawn(x, y, z, yaw) {
    this.body.teleport(x, y, z, yaw);
    this.yaw = yaw ?? 0;
    this.dead = false;
    this.busted = false;
    this.health = this.maxHealth;
    this.lastSafePoint.set(x, y, z);
    this.group.visible = true;
  }

  // -------------------------------------------------------------------------
  update(dt) {
    const ctx = this.ctx;
    this.enterCooldown = Math.max(0, this.enterCooldown - dt);

    if (this.dead) {
      this.deathTimer += dt;
      this._syncCollider();
      return;
    }

    this._look(dt);
    if (this.vehicle) this._updateInVehicle(dt);
    else this._updateOnFoot(dt);

    this.weapons.update(dt, this._weaponState());
    this._updateHealth(dt);
    this._syncCollider();
    this._updateThreat(dt);
  }

  _weaponState() {
    const eye = this.eyePosition;
    return {
      origin: _v1.copy(eye),
      direction: this.aimDirection,
      speed: this.speed,
      airborne: !this.body.grounded && !this.vehicle,
    };
  }

  _look(dt) {
    const input = this.ctx.input;
    if (this.ctx.game && this.ctx.game.uiCapture) return;
    const d = input.lookDelta(dt);
    const sens = this.weapons.aiming ? 0.55 + 0.45 / Math.max(1, this.weapons.def.zoomFov ? 1.6 : 1) : 1;
    this.yaw += d.yaw * sens;
    this.pitch = clamp(this.pitch + d.pitch * sens, -1.32, 1.32);
    this.yaw = ((this.yaw + Math.PI) % TAU + TAU) % TAU - Math.PI;

    // Recoil pushes the actual aim, and the aim decays back down.
    //
    // Built explicitly rather than through an Euler: applyEuler(p, y, 0, 'YXZ')
    // on (0,0,1) gives y = -sin(p), so a positive pitch pointed the gun DOWN
    // while the third-person camera treats positive pitch as looking UP. The
    // result was that vertical look inverted the moment you aimed or went first
    // person, and a shot taken while aiming up went into the ground.
    const r = this.weapons.recoil;
    const ap = clamp(this.pitch + r.y * 0.016, -1.5, 1.5);
    const ay = this.yaw + r.x * 0.012;
    const acp = Math.cos(ap);
    this.aimDirection.set(acp * Math.sin(ay), Math.sin(ap), acp * Math.cos(ay)).normalize();
  }

  // ---- on foot ------------------------------------------------------------
  _updateOnFoot(dt) {
    const ctx = this.ctx;
    const input = ctx.input;
    const captured = ctx.game && ctx.game.uiCapture;

    const mx = captured ? 0 : input.moveX;
    const my = captured ? 0 : input.moveY;
    const aiming = !captured && input.aiming;
    this.weapons.aiming = aiming;
    this.crouching = !captured && input.down('crouch');
    this.body.crouching = this.crouching;

    // Movement basis from camera yaw.
    //
    // Forward is (sin y, 0, cos y), matching aimDirection and the chase camera.
    // Strafe is the part that is easy to get backwards: a three.js camera looks
    // down its own local -Z, so its screen-right axis is local +X, which works
    // out to (-cos y, 0, sin y) -- the NEGATIVE of cross(up, forward). Project a
    // point at world +X through the chase camera at yaw 0 and it lands at NDC
    // x = -0.67, i.e. on the left of the screen. Using cross(up, forward) here
    // sent D to screen-left and A to screen-right.
    const sinY = Math.sin(this.yaw), cosY = Math.cos(this.yaw);
    _v1.set(-mx * cosY + my * sinY, 0, mx * sinY + my * cosY);
    const mag = _v1.length();
    if (mag > 1) _v1.divideScalar(mag);

    this.sprinting = !captured && input.sprinting && my > 0.1 && !aiming && !this.crouching && this.stamina > 0.05;
    let speed = this.crouching ? 1.5 : aiming ? 2.1 : this.sprinting ? 6.4 : 3.6;
    if (this.body.inWater) speed = 3.0;
    if (this.sprinting) this.stamina = Math.max(0, this.stamina - dt * 0.14);
    else this.stamina = Math.min(1, this.stamina + dt * 0.22);
    if (this.stamina < 0.02) this.sprinting = false;

    const jump = !captured && input.pressed('jump');
    this.body.update(dt, _v1, speed, jump);
    if (jump && this.body.velocity.y > 3) ctx.audio?.play('jumpGrunt', { volume: 0.35 });

    // Face the direction of travel, or the aim when aiming.
    if (aiming || this.weapons.meleeSwing > 0) {
      // angleDamp for the same reason the walking branch below uses angleDelta:
      // yaw wraps at +/-PI, and a plain damp across that seam spins the model
      // (and the radar, which reads bodyYaw) most of the way round.
      this.bodyYaw = angleDamp(this.bodyYaw ?? this.yaw, this.yaw, 18, dt);
    } else if (mag > 0.05) {
      const moveYaw = Math.atan2(_v1.x, _v1.z);
      this.bodyYaw = (this.bodyYaw ?? moveYaw) + angleDelta(this.bodyYaw ?? moveYaw, moveYaw) * Math.min(1, dt * 12);
    }
    this.group.position.copy(this.body.position);
    this.group.rotation.y = this.bodyYaw ?? this.yaw;

    // ---- landing ----
    if (this.body.lastLandImpact > 9) {
      const fall = this.body.lastLandImpact;
      ctx.audio?.play('landThud', { volume: clamp(fall / 22, 0.2, 1) });
      ctx.cameraRig?.shake(clamp(fall / 60, 0, 0.5), 0.25);
      if (fall > 15) this.damage((fall - 15) * 6.5, { fall: true });
      this.body.lastLandImpact = 0;
    }

    // ---- footsteps ----
    const hSpeed = Math.hypot(this.body.velocity.x, this.body.velocity.z);
    this.distanceWalked += hSpeed * dt;
    if (this.body.grounded && hSpeed > 0.6) {
      this.stepTimer -= dt * hSpeed;
      if (this.stepTimer <= 0) {
        this.stepTimer = 2.3;
        const s = this.body.groundSurface;
        const name = s === SURFACE.SAND ? 'footstepSand'
          : s === SURFACE.GRASS ? 'footstepGrass'
          : s === SURFACE.WATER ? 'footstepWater' : 'footstepConcrete';
        ctx.audio?.play(name, { volume: clamp(hSpeed / 9, 0.12, 0.4), pitch: 0.92 + Math.random() * 0.16 });
      }
    }
    if (this.body.inWater) {
      this.swimTime += dt;
      if (this.swimTime > 0.6) { this.swimTime = 0; ctx.audio?.play('swim', { volume: 0.2 }); }
    }

    // ---- firing ----
    if (!captured) {
      if (input.firing) {
        // `firingEdge` covers the mouse button and the gamepad trigger alike.
        // Testing mouse.leftEdge alone meant a semi-automatic weapon could never
        // be fired with a pad: `firing` was true the whole time the trigger was
        // held, and the per-shot edge it was checked against never arrived.
        if (this.weapons.def.auto || input.firingEdge || this.weapons.isMelee) {
          const st = this._weaponState();
          st.muzzle = this.weapons.model ? this.weapons.muzzleWorld(_v2) : st.origin;
          this.weapons.tryFire(st);
        }
      }
      if (input.pressed('reload')) this.weapons.startReload();
      if (input.mouse.wheel) this.weapons.cycle(Math.sign(input.mouse.wheel));
      if (input.pressed('nextWeapon')) this.weapons.cycle(1);
      if (input.pressed('prevWeapon')) this.weapons.cycle(-1);
      if (input.weaponSlot >= 0) this.weapons.selectSlotIndex(input.weaponSlot);
    }

    this._animateOnFoot(dt, hSpeed);
    if (this.body.grounded && !this.body.inWater) this.lastSafePoint.copy(this.body.position);
  }

  _animateOnFoot(dt, hSpeed) {
    const stride = clamp(hSpeed / 2.4, 0, 2.6);
    this.animPhase += dt * (3.2 + stride * 3.8);
    const ph = this.animPhase;
    const swing = Math.sin(ph) * clamp(stride * 0.5, 0.05, 0.9);
    const swing2 = -swing;
    const airborne = !this.body.grounded;
    this.root.position.y = Math.abs(Math.sin(ph)) * 0.03 * stride;

    for (let i = 0; i < 2; i++) {
      const leg = this.legs[i];
      const s = i === 0 ? swing : swing2;
      if (this.body.inWater) { leg.hip.rotation.x = Math.sin(ph * 1.6 + i * 3) * 0.5; leg.knee.rotation.x = -0.5; }
      else if (airborne) { leg.hip.rotation.x = 0.4 - i * 0.6; leg.knee.rotation.x = -0.7; }
      else if (this.crouching) { leg.hip.rotation.x = 0.9 + s * 0.3; leg.knee.rotation.x = -1.6; }
      else { leg.hip.rotation.x = s * 0.85; leg.knee.rotation.x = -Math.max(0, -s * 1.3 + 0.1) - 0.06; }
      leg.foot.rotation.x = -leg.knee.rotation.x * 0.45;
    }

    const aiming = this.weapons.aiming;
    const melee = this.weapons.meleeSwing > 0;
    for (let i = 0; i < 2; i++) {
      const arm = this.arms[i];
      const s = i === 0 ? swing2 : swing;
      if (melee && i === 1) {
        const t = 1 - this.weapons.meleeSwing / Math.max(0.01, this.weapons.def.melee.swingTime);
        arm.shoulder.rotation.x = lerp(-2.3, 0.4, Math.sin(t * Math.PI));
        arm.shoulder.rotation.z = 0.3;
        arm.elbow.rotation.x = lerp(-1.4, -0.2, t);
      } else if (aiming || (this.weapons.currentId !== 'fists' && !this.weapons.isMelee)) {
        // Two-handed ready pose, with the off hand supporting.
        const lift = aiming ? 1 : 0.55;
        arm.shoulder.rotation.x = lerp(-0.2, -1.5, lift) - this.pitch * 0.7 * lift;
        arm.shoulder.rotation.z = arm.side * lerp(0.12, i === 1 ? 0.12 : 0.5, lift);
        arm.elbow.rotation.x = lerp(-0.2, i === 1 ? -0.25 : -1.0, lift);
      } else {
        arm.shoulder.rotation.x = s * 0.6;
        arm.shoulder.rotation.z = arm.side * 0.1;
        arm.elbow.rotation.x = -Math.max(0, s * 0.45) - 0.12;
      }
    }
    // Lean into the aim.
    this.torso.rotation.x = aiming ? -this.pitch * 0.28 : -0.05 - stride * 0.05;
    this.neck.rotation.x = clamp(-this.pitch * 0.55, -0.7, 0.7);
    this.neck.rotation.y = clamp(angleDelta(this.bodyYaw ?? this.yaw, this.yaw), -1.0, 1.0);
  }

  // ---- in a vehicle -------------------------------------------------------
  _updateInVehicle(dt) {
    const ctx = this.ctx;
    const input = ctx.input;
    const v = this.vehicle;
    const captured = ctx.game && ctx.game.uiCapture;
    if (v.dead) { this.exitVehicle(true); return; }

    if (this.isDriving && !captured) {
      const throttle = input.throttle;
      const brake = input.brakeAxis;
      // `steerInput` is positive toward the car's LOCAL +X, and with forward at
      // local +Z that axis is the driver's left: a three.js camera looks down its
      // own -Z, so local +X projects to the left of the screen. Mouse look already
      // allows for this (`yaw = -mouse.dx` in input.js) and the steering did not,
      // so holding D nosed the car toward the left of the screen. Measured in the
      // browser against the camera's own world matrix: holding D moved the car
      // -0.55 along screen-right, i.e. more than half its travel to the left.
      const steer = -input.moveX;
      const handbrake = input.down('handbrake') ? 1 : 0;
      // Holding "back" at a stop selects reverse. Once it is selected the back
      // axis has to become the throttle: input.throttle is max(0, moveY), so
      // holding S leaves it at zero, and passing brake as 0 too meant the car
      // shifted into reverse and then sat there with no drive force at all.
      const wantReverse = brake > 0.1 && v.sim.forwardSpeed < 1.2 ? 1 : 0;
      v.setControls(wantReverse ? brake : throttle, wantReverse ? 0 : brake, steer, handbrake, wantReverse);

      // Airborne stunt control.
      if (v.sim.wheelsOnGround === 0) {
        v.sim.airPitch = -input.moveY;
        // Negated for the same reason the steering is: a positive airRoll rolls
        // the car toward its local +X, which is the driver's left. Measured on
        // the real sim -- holding D banked the roof 0.99 toward screen-LEFT.
        v.sim.airRoll = -input.moveX;
        v.sim.airYaw = input.down('lookBehind') ? 1 : 0;
      } else {
        v.sim.airPitch = v.sim.airRoll = v.sim.airYaw = 0;
      }
      v.sim.boost = input.down('nitro') && input.throttle > 0.4 ? clamp(v.nitro ?? 0, 0, 1) : 0;
      if (input.pressed('horn')) v.honk();
      if (input.pressed('headlights')) { v.headlightAuto = false; v.headlightsOn = !v.headlightsOn; v._lightsDirty = true; }
      if (input.down('respawn') && v.sim.flipTimer > 0.6) v.sim.flipUpright();

      this.distanceDriven += v.sim.speed * dt;
    } else if (!this.isDriving) {
      // Passenger: nothing to do but hold on.
    }

    this.engineSound.update(dt, v);

    // Ride in the seat.
    v.seatPoint(this.seat, _v1);
    this.group.position.copy(_v1);
    this.group.position.y -= 0.62;
    this.group.rotation.y = Math.atan2(v.sim.forward.x, v.sim.forward.z);
    this._animateInVehicle(dt, v);

    // Crash damage to the occupant.
    if (v.sim.lastImpactSpeed > 9) {
      this.damage((v.sim.lastImpactSpeed - 9) * 2.4, { crash: true });
      ctx.cameraRig?.shake(clamp(v.sim.lastImpactSpeed / 40, 0.1, 1.1), 0.35);
    }

    if (!captured && input.pressed('enter') && this.enterCooldown <= 0) this.exitVehicle();
  }

  _animateInVehicle(dt, v) {
    const steer = v.sim.steerAngle / Math.max(0.01, v.sim.maxSteer);
    for (let i = 0; i < 2; i++) {
      const arm = this.arms[i];
      arm.shoulder.rotation.x = -1.15 + steer * arm.side * 0.35;
      arm.shoulder.rotation.z = arm.side * 0.42;
      arm.elbow.rotation.x = -0.55;
      arm.shoulder.rotation.y = -steer * 0.5;
    }
    for (let i = 0; i < 2; i++) {
      this.legs[i].hip.rotation.x = 1.25;
      this.legs[i].knee.rotation.x = -1.15;
      this.legs[i].foot.rotation.x = 0.5;
    }
    this.torso.rotation.x = -0.18;
    this.neck.rotation.x = 0;
    this.neck.rotation.y = 0;
  }

  // ---- entering / exiting -------------------------------------------------
  /** Nearest vehicle whose door the player could reach. */
  findNearbyVehicle(maxDist = 4.2) {
    const ctx = this.ctx;
    if (!ctx.traffic) return null;
    const p = this.body.position;
    let best = null, bestScore = Infinity;
    for (const v of ctx.traffic.all()) {
      if (v.dead || v.sim.exploded) continue;
      const d = Math.hypot(v.sim.position.x - p.x, v.sim.position.z - p.z);
      if (d > maxDist + v.def.length * 0.5) continue;
      const seat = v.nearestFreeSeat(p.x, p.z);
      if (seat < 0) continue;
      v.doorPoint(seat, _v1);
      const dd = Math.hypot(_v1.x - p.x, _v1.z - p.z);
      if (dd > maxDist) continue;
      if (dd < bestScore) { bestScore = dd; best = { vehicle: v, seat, dist: dd }; }
    }
    return best;
  }

  enterVehicle(v, seat = 0) {
    if (this.vehicle || v.dead) return false;
    if (!v.enter(this, seat)) return false;
    this.vehicle = v;
    this.seat = seat;
    this.enterCooldown = 0.55;
    this.body.enabled = false;
    v.isPlayerVehicle = true;
    v.attachHeadlightSpots();
    if (v.aiDriver) v.aiDriver.mode = 'parked';
    this.ctx.audio?.playAt('carDoorOpen', v.sim.position, { volume: 0.6 });
    setTimeout(() => this.ctx.audio?.playAt('carDoorClose', v.sim.position, { volume: 0.6 }), 380);
    this.engineSound.attach(v);
    this.ctx.bus.emit('player:enteredVehicle', { vehicle: v, seat, stolen: !!v.aiDriver && !v.wasPlayerOwned });
    return true;
  }

  exitVehicle(forced = false) {
    const v = this.vehicle;
    if (!v) return false;
    // Find a clear spot beside the car.
    v.doorPoint(this.seat, _v1);
    const ground = this.ctx.physics.groundHeight(_v1.x, _v1.z);
    let x = _v1.x, z = _v1.z;
    const blocked = this.ctx.physics.raycast(v.sim.position.x, v.sim.position.y, v.sim.position.z,
      (x - v.sim.position.x), 0, (z - v.sim.position.z), 2.4, MASK_SOLID, { ignore: v });
    if (blocked.hit) {
      // Try the other side.
      const other = this.seat % 2 === 0 ? this.seat + 1 : this.seat - 1;
      v.doorPoint(Math.max(0, other), _v2);
      x = _v2.x; z = _v2.z;
    }
    v.exit(this);
    v.isPlayerVehicle = false;
    this.vehicle = null;
    this.seat = -1;
    this.body.enabled = true;
    this.body.teleport(x, this.ctx.physics.groundHeight(x, z) + 0.1, z, this.yaw);
    // Carry some of the car's momentum out with you.
    this.body.velocity.copy(v.sim.velocity).multiplyScalar(forced ? 0.9 : 0.3);
    this.body.velocity.y = Math.max(0, this.body.velocity.y);
    this.enterCooldown = 0.5;
    this.engineSound.detach();
    this.ctx.audio?.playAt('carDoorOpen', v.sim.position, { volume: 0.6 });
    this.ctx.bus.emit('player:exitedVehicle', { vehicle: v, forced });
    return true;
  }

  // ---- health -------------------------------------------------------------
  _updateHealth(dt) {
    const now = this.ctx.time.elapsed;
    if (now - this.lastDamageTime > this.regenDelay && this.health < this.maxHealth && this.health > 0) {
      this.health = Math.min(this.maxHealth, this.health + dt * 6);
    }
    // Drowning.
    if (!this.vehicle && this.body.submersion > 1.05) {
      this.damage(dt * 16, { drown: true });
    }
  }

  damage(amount, opts = {}) {
    if (this.dead || amount <= 0) return false;
    if (this.ctx.time.elapsed < this.invulnUntil) return false;
    this.lastDamageTime = this.ctx.time.elapsed;
    let remaining = amount;
    if (this.armor > 0) {
      const absorbed = Math.min(this.armor, remaining * 0.72);
      this.armor -= absorbed;
      remaining -= absorbed;
    }
    this.health -= remaining;
    this.ctx.bus.emit('player:damaged', { amount, source: opts.source, opts });
    this.ctx.cameraRig?.shake(clamp(amount / 60, 0.04, 0.5), 0.2);
    if (this.health <= 0) { this.kill(opts); return true; }
    return false;
  }

  heal(amount) { this.health = Math.min(this.maxHealth, this.health + amount); }
  addArmor(amount) { this.armor = Math.min(this.maxArmor, this.armor + amount); }

  kill(opts = {}) {
    if (this.dead) return;
    this.dead = true;
    this.health = 0;
    this.deathTimer = 0;
    this.busted = !!opts.busted;
    if (this.vehicle) this.exitVehicle(true);
    this.body.dead = true;
    this.ctx.bus.emit('player:died', { source: opts.source, busted: this.busted, opts });
  }

  respawn(x, y, z, yaw) {
    this.dead = false;
    this.busted = false;
    this.health = this.maxHealth;
    this.armor = Math.max(0, this.armor * 0.4);
    this.body.dead = false;
    this.body.enabled = true;
    this.body.teleport(x, y, z, yaw ?? this.yaw);
    this.yaw = yaw ?? this.yaw;
    this.invulnUntil = this.ctx.time.elapsed + 3;
    this.deathTimer = 0;
    this.group.visible = true;
    this.ctx.bus.emit('player:respawned', {});
  }

  _syncCollider() {
    const c = this.collider;
    const p = this.vehicle ? this.vehicle.sim.position : this.body.position;
    c.x = p.x; c.y = p.y + (this.vehicle ? 0 : 0.91); c.z = p.z;
    c.setYawPitchRoll(this.bodyYaw ?? this.yaw, 0, 0);
    // Riding in a car means the character collider shouldn't block anything.
    c.layer = this.vehicle ? 0 : LAYER.PLAYER;
  }

  /** How threatening the player looks right now — drives ped panic. */
  _updateThreat(dt) {
    let t = 0;
    const def = this.weapons.def;
    if (def && def.slot !== 'fists' && def.slot !== 'melee') t += this.weapons.aiming ? 0.85 : 0.45;
    if (def && def.slot === 'melee') t += this.weapons.aiming ? 0.4 : 0.2;
    if (this.ctx.time.elapsed - this.weapons.lastShotTime < 3.5) t = 1.4;
    if (this.wanted > 0) t = Math.max(t, 0.5 + this.wanted * 0.2);
    if (this.vehicle && this.vehicle.sim.speed > 16 && !this.ctx.physics.terrain.isRoad(this.position.x, this.position.z)) {
      t = Math.max(t, 0.9);
    }
    this.threatLevel = damp(this.threatLevel, t, 6, dt);
  }

  setVisible(v) { this.group.visible = v; }

  dispose() {
    this.ctx.physics.removeDynamic(this);
    this.ctx.scene.remove(this.group);
    this.engineSound.dispose();
  }
}
