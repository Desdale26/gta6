// camera.js — third-person follow rig with collision, aim modes, cinematic and photo cameras.
import * as THREE from 'three';
import { clamp, lerp, damp, angleDamp, angleDelta, smoothstep } from '../core/mathx.js';
import { MASK_CAMERA } from '../physics/world.js';

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _v4 = new THREE.Vector3();
const _v5 = new THREE.Vector3();
const _e = new THREE.Euler(0, 0, 0, 'YXZ');

export const CAM_MODE = { FOLLOW: 'follow', AIM: 'aim', FIRST: 'first', CINEMATIC: 'cinematic', FREE: 'free' };

export class CameraRig {
  constructor(ctx) {
    this.ctx = ctx;
    this.camera = ctx.camera;
    this.mode = CAM_MODE.FOLLOW;
    this.target = new THREE.Vector3();
    this.position = new THREE.Vector3(0, 8, -12);
    this.lookAt = new THREE.Vector3();
    this.smoothPos = new THREE.Vector3(0, 8, -12);
    this.yaw = 0;
    this.pitch = -0.18;
    this.distance = 6.2;
    this.targetDistance = 6.2;
    this.shakeAmount = 0;
    this.shakeTime = 0;
    this.shakeSeed = Math.random() * 1000;
    this.fovBase = ctx.settings.get('fov');
    this.fov = this.fovBase;
    this.lookBehind = false;
    this.cinematicTimer = 0;
    this.cinematicShot = 0;
    this.speedFov = 0;
    this.recoilKick = new THREE.Vector2();
    this._prevTargetPos = new THREE.Vector3();
    this._hidPlayer = false;
    this.enabled = true;
  }

  shake(amount, duration = 0.3) {
    this.shakeAmount = Math.max(this.shakeAmount, amount * this.ctx.settings.get('cameraShake'));
    this.shakeTime = Math.max(this.shakeTime, duration);
  }

  cycleMode() {
    const order = [CAM_MODE.FOLLOW, CAM_MODE.FIRST, CAM_MODE.CINEMATIC];
    const i = order.indexOf(this.mode);
    this.setMode(order[(i + 1) % order.length]);
  }
  setMode(m) {
    if (this.mode === m) return;
    this.mode = m;
    this.cinematicTimer = 0;
    this.ctx.bus.emit('camera:mode', { mode: m });
  }

  update(dt) {
    const ctx = this.ctx;
    const player = ctx.player;
    if (!player || !this.enabled) return;

    const input = ctx.input;
    if (!ctx.game?.uiCapture) {
      if (input.pressed('cameraToggle')) this.cycleMode();
      this.lookBehind = input.down('lookBehind') && player.inVehicle;
    }

    const aiming = player.weapons.aiming && !player.inVehicle;
    const effectiveMode = aiming ? CAM_MODE.AIM
      : (this.mode === CAM_MODE.CINEMATIC && !player.inVehicle) ? CAM_MODE.FOLLOW : this.mode;

    switch (effectiveMode) {
      case CAM_MODE.FIRST: this._firstPerson(dt, player); break;
      case CAM_MODE.AIM: this._aim(dt, player); break;
      case CAM_MODE.CINEMATIC: this._cinematic(dt, player); break;
      default: this._follow(dt, player); break;
    }

    // The body is hidden exactly when the camera is inside it, decided from the
    // camera that actually ran rather than from the mode the player selected.
    // Aiming from first person runs the AIM camera while `this.mode` is still
    // FIRST, and the old restore test asked about `this.mode`: the result was an
    // over-the-shoulder view of an invisible character. A scoped weapon puts the
    // camera 5 cm from the eye, which is inside the head, so that hides it too.
    const inside = effectiveMode === CAM_MODE.FIRST
      || (effectiveMode === CAM_MODE.AIM && !!player.weapons.def.scope);
    if (this._hidPlayer !== inside) {
      player.setVisible(!inside);
      this._hidPlayer = inside;
    }

    this._applyShake(dt);
    this._applyFov(dt, player);
  }

  _targetPoint(player, out) {
    if (player.inVehicle) {
      const v = player.vehicle;
      out.copy(v.sim.position);
      out.y += v.def.height * 0.35;
    } else {
      out.copy(player.body.position);
      out.y += 1.42;
    }
    return out;
  }

  _follow(dt, player) {
    const v = player.vehicle;
    const target = this._targetPoint(player, _v1);

    let desiredYaw = player.yaw;
    let dist = v ? clamp(v.def.length * 1.35 + 3.2, 5.5, 12) : 4.6;
    let height = v ? v.def.height * 0.85 + 1.1 : 1.0;
    let pitch = player.pitch * 0.62 - 0.12;

    if (v) {
      // Behind a car, the camera drifts toward the direction of travel.
      const travelYaw = v.sim.speed > 3
        ? Math.atan2(v.sim.velocity.x, v.sim.velocity.z)
        : Math.atan2(v.sim.forward.x, v.sim.forward.z);
      const carYaw = Math.atan2(v.sim.forward.x, v.sim.forward.z);
      const blend = clamp(v.sim.speed / 14, 0, 1) * (v.sim.forwardSpeed < -0.5 ? 0 : 1);
      const auto = carYaw + angleDelta(carYaw, travelYaw) * 0.45 * blend;
      // Looking around takes over; otherwise it eases back behind the car. This
      // has to count the gamepad's right stick as well: reading mouse.dx alone
      // meant the auto-follow fought the stick every frame a pad player turned
      // the camera.
      const manual = this.ctx.input.looking;
      if (manual) this.yawFree = player.yaw;
      desiredYaw = manual ? player.yaw : auto;
      player.yaw = angleDamp(player.yaw, desiredYaw, manual ? 20 : 2.4, dt);
      desiredYaw = player.yaw;
      if (this.lookBehind) desiredYaw += Math.PI;
      dist += clamp(v.sim.speed * 0.08, 0, 3.2);
      pitch = clamp(player.pitch * 0.55 - 0.1 - clamp(v.sim.speed * 0.004, 0, 0.1), -1.1, 0.7);
    }

    // angleDamp, not damp: yaw wraps at +/-PI and a plain exponential lerp takes
    // the long way round that seam. Measured: a 3 degree turn past it swung the
    // camera 342 degrees, which is the whole screen spinning as you turn.
    this.yaw = angleDamp(this.yaw, desiredYaw, v ? 9 : 16, dt);
    this.pitch = damp(this.pitch, pitch, 12, dt);
    this.targetDistance = dist;
    this.distance = damp(this.distance, this.targetDistance, 7, dt);

    // Orbit position.
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    _v2.set(
      target.x - Math.sin(this.yaw) * cp * this.distance,
      target.y + height - sp * this.distance,
      target.z - Math.cos(this.yaw) * cp * this.distance,
    );
    this._collide(target, _v2);
    this.smoothPos.copy(_v2);
    this.camera.position.copy(this.smoothPos);

    // Look slightly ahead of where the player is going.
    _v3.copy(target);
    if (v && v.sim.speed > 5) _v3.addScaledVector(v.sim.velocity, 0.08);
    _v3.y += 0.25;
    this.camera.lookAt(_v3);
    this.lookAt.copy(_v3);
  }

  /**
   * The gun fires along `player.aimDirection`. Building the camera's rotation
   * from an Euler instead — which is what this used to do — points it down the
   * camera's local -Z, which is the opposite of that vector in yaw and upside
   * down in pitch, so aiming looked behind you and the crosshair never agreed
   * with the bullet. Both aimed views now come from the same vector the weapon
   * does, so what is under the crosshair is what gets hit.
   */
  _aim(dt, player) {
    const target = this._targetPoint(player, _v1);
    const scoped = player.weapons.def.scope;
    this.yaw = angleDamp(this.yaw, player.yaw, 26, dt);
    this.pitch = damp(this.pitch, player.pitch, 26, dt);
    const dist = scoped ? 0.05 : 1.9;
    const side = scoped ? 0 : 0.55;

    const dir = _v4.copy(player.aimDirection).normalize();
    // Screen-right of the aim, so the camera sits over the player's RIGHT
    // shoulder as the genre expects. For a flattened direction (sin y, 0, cos y)
    // the camera's own local +X is (-cos y, 0, sin y), i.e. (-dir.z, 0, dir.x) --
    // the NEGATIVE of cross(up, dir). It was written the other way round, which
    // put the camera over the left shoulder and the player on the right of the
    // screen, contradicting the comment that sat here.
    _v5.set(-dir.z, 0, dir.x);
    if (_v5.lengthSq() < 1e-6) _v5.set(1, 0, 0); else _v5.normalize();

    _v2.copy(target).addScaledVector(dir, -dist).addScaledVector(_v5, side);
    _v2.y += 0.42;
    this._collide(target, _v2);
    this.camera.position.copy(_v2);
    this.smoothPos.copy(_v2);

    _v3.copy(_v2).add(dir);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(_v3);
    this.lookAt.copy(_v3);
    this.distance = dist;
  }

  _firstPerson(dt, player) {
    const eye = player.eyePosition;
    this.camera.position.copy(eye);
    if (player.inVehicle) {
      const v = player.vehicle;
      this.camera.position.copy(v.localPoint(-v.def.width * 0.22, v.def.height * 0.22, v.def.length * 0.06, _v1));
    }
    this.yaw = player.yaw;
    this.pitch = player.pitch;
    // Same rule as the aim camera: look along what the weapon is pointing at.
    _v3.copy(this.camera.position).add(player.aimDirection);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(_v3);
    this.lookAt.copy(_v3);
    this.smoothPos.copy(this.camera.position);
    this.distance = 0;
    // Visibility is decided once, in update(), from the camera that actually ran.
  }

  _cinematic(dt, player) {
    const v = player.vehicle;
    const target = this._targetPoint(player, _v1);
    this.cinematicTimer -= dt;
    if (this.cinematicTimer <= 0) {
      this.cinematicTimer = 4 + Math.random() * 4;
      this.cinematicShot = Math.floor(Math.random() * 4);
      this._shotAngle = Math.random() * Math.PI * 2;
      this._shotHeight = 1 + Math.random() * 6;
      this._shotDist = 8 + Math.random() * 14;
    }
    const speedYaw = v && v.sim.speed > 2 ? Math.atan2(v.sim.velocity.x, v.sim.velocity.z) : player.yaw;
    switch (this.cinematicShot) {
      case 0: // low chase
        _v2.set(target.x - Math.sin(speedYaw) * this._shotDist, target.y + 0.6, target.z - Math.cos(speedYaw) * this._shotDist);
        break;
      case 1: // side pan
        _v2.set(target.x + Math.cos(speedYaw) * 8, target.y + 1.6, target.z - Math.sin(speedYaw) * 8);
        break;
      case 2: // high orbit
        this._shotAngle += dt * 0.25;
        _v2.set(target.x + Math.sin(this._shotAngle) * this._shotDist, target.y + this._shotHeight, target.z + Math.cos(this._shotAngle) * this._shotDist);
        break;
      default: // fixed point the car drives past
        if (!this._fixed || target.distanceTo(this._fixed) > 60) {
          this._fixed = target.clone().add(new THREE.Vector3(Math.cos(this._shotAngle) * 18, 6, Math.sin(this._shotAngle) * 18));
        }
        _v2.copy(this._fixed);
        break;
    }
    _v2.y = Math.max(_v2.y, this.ctx.physics.groundHeight(_v2.x, _v2.z) + 0.8);
    this.smoothPos.lerp(_v2, clamp(dt * 3.5, 0, 1));
    this.camera.position.copy(this.smoothPos);
    this.camera.lookAt(target);
    this.lookAt.copy(target);
  }

  /** Pull the camera in when something is between it and the player. */
  _collide(target, desired) {
    const phys = this.ctx.physics;
    _v3.copy(desired).sub(target);
    const dist = _v3.length();
    if (dist < 0.2) return;
    _v3.divideScalar(dist);
    const hit = phys.raycast(target.x, target.y, target.z, _v3.x, _v3.y, _v3.z, dist + 0.35, MASK_CAMERA);
    if (hit.hit) {
      const safe = Math.max(0.6, hit.dist - 0.35);
      desired.copy(target).addScaledVector(_v3, safe);
    }
    // Never let the camera sink below the ground.
    const gy = phys.groundHeight(desired.x, desired.z) + 0.45;
    if (desired.y < gy) desired.y = gy;
  }

  _applyShake(dt) {
    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      const k = this.shakeAmount * clamp(this.shakeTime / 0.3, 0, 1);
      const t = this.ctx.time.elapsed * 34 + this.shakeSeed;
      this.camera.position.x += Math.sin(t * 1.7) * k * 0.35;
      this.camera.position.y += Math.sin(t * 2.3 + 1.4) * k * 0.3;
      this.camera.position.z += Math.sin(t * 1.1 + 2.7) * k * 0.35;
      this.camera.rotateZ(Math.sin(t * 2.9) * k * 0.02);
      if (this.shakeTime <= 0) this.shakeAmount = 0;
    }
  }

  _applyFov(dt, player) {
    const base = this.ctx.settings.get('fov');
    let want = base;
    const v = player.vehicle;
    if (v) want += clamp(v.sim.speed * 0.42, 0, 18) + (v.sim.boost > 0 ? 6 : 0);
    if (player.weapons.aiming && !v) {
      const z = player.weapons.def.zoomFov;
      if (z > 0) want = z;
    }
    this.fov = damp(this.fov, want, 8, dt);
    if (Math.abs(this.camera.fov - this.fov) > 0.05) {
      this.camera.fov = this.fov;
      this.camera.updateProjectionMatrix();
    }
    // Motion blur scales with how fast the camera is actually moving.
    const moved = this.camera.position.distanceTo(this._prevTargetPos) / Math.max(dt, 1e-4);
    this._prevTargetPos.copy(this.camera.position);
    const blur = clamp((moved - 6) / 44, 0, 1) * 0.8;
    this.ctx.renderer?.setMotionBlur(blur);

    // Depth of field focuses on whatever is in the middle of the screen.
    if (this.ctx.renderer) {
      const g = this.ctx.renderer.grade;
      const focus = v ? clamp(14 + v.sim.speed * 0.8, 12, 60) : (player.weapons.aiming ? 40 : 14);
      g.uDofFocus.value = damp(g.uDofFocus.value, focus, 4, dt);
    }
  }
}
