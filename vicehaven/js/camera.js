/*
 * camera.js — the player camera.
 *
 * Modes (V cycles): close third-person, far third-person, first-person.
 * Holding Aim tightens to an over-the-shoulder view; the mouse wheel
 * adjusts distance; B looks behind.
 *
 * Collision: the camera sits at the end of a short arm from Jay's head to
 * the shoulder, then back from the shoulder along the view direction. Both
 * legs are ray-cast against the collision world with a fattened ray (a
 * cheap sphere cast), so the camera slides in front of walls instead of
 * through them. It pulls in instantly and eases back out, so it never
 * clips but also never jitters.
 */
(function () {
  'use strict';

  const VH = window.VH;
  const { clamp, damp, lerp } = VH.math;

  const MODES = [
    { id: 'near', label: 'Close', distance: 3.5, height: 0.2 },
    { id: 'far', label: 'Far', distance: 5.8, height: 0.45 },
    { id: 'first', label: 'First person', distance: 0, height: 0 },
  ];

  class CameraRig {
    constructor(camera, physics, settings, input) {
      this.camera = camera;
      this.physics = physics;
      this.settings = settings;
      this.input = input;
      this.yaw = Math.PI;
      this.pitch = -0.12;
      this.modeIndex = 0;
      this.zoom = 0;
      this.pivot = new THREE.Vector3();
      this.curDist = 3.5;
      this.fov = settings.get('graphics.fov');
      this._behind = 0;
      this._dip = 0;
      this._shake = 0;
      this._initialised = false;
      this._fwd = new THREE.Vector3();
      this._right = new THREE.Vector3();
      this._shoulder = new THREE.Vector3();
      this._eye = new THREE.Vector3();
      this._tmp = new THREE.Vector3();
      this.position = camera.position;

      VH.events.on('player:land', (e) => {
        this._dip = Math.min(0.3, Math.max(0, e.impact - 3) * 0.02);
        if (e.impact > 13) this.addShake(Math.min(1, (e.impact - 13) / 12));
      });
    }

    get mode() {
      return MODES[this.modeIndex];
    }

    get isFirstPerson() {
      return this.mode.id === 'first';
    }

    addShake(amount) {
      if (!this.settings.get('gameplay.cameraShake')) return;
      this._shake = Math.min(1, this._shake + amount);
    }

    /** Point the camera the way the player faces (after spawning or respawning). */
    snapBehind(player) {
      this.yaw = player.heading;
      this.pitch = -0.12;
      this._initialised = false;
    }

    cycleMode() {
      this.modeIndex = (this.modeIndex + 1) % MODES.length;
      this.zoom = 0;
      VH.events.emit('camera:mode', { mode: this.mode });
    }

    /** Read mouse/stick look input. Called once per frame while playing. */
    handleInput(dt, aiming) {
      const inp = this.input;
      const md = inp.takeMouseDelta();
      const sens = 0.0022 * this.settings.get('gameplay.mouseSensitivity') * (aiming ? 0.62 : 1);
      const invert = this.settings.get('gameplay.invertY') ? -1 : 1;
      this.yaw -= md.x * sens;
      this.pitch -= md.y * sens * invert;
      const look = inp.lookVector();
      if (look.x || look.y) {
        const ps = this.settings.get('gameplay.gamepadSensitivity') * (aiming ? 0.55 : 1);
        this.yaw -= look.x * Math.abs(look.x) * 3.4 * ps * dt;
        this.pitch -= look.y * Math.abs(look.y) * 2.3 * ps * dt * invert;
      }
      this.yaw = VH.math.wrapAngle(this.yaw);
      const first = this.isFirstPerson;
      this.pitch = clamp(this.pitch, first ? -1.45 : -1.2, first ? 1.45 : 0.95);

      const wheel = inp.takeWheel();
      if (wheel && !first) this.zoom = clamp(this.zoom + wheel * 0.55, -1.6, 3.5);
      if (inp.consume('camera')) this.cycleMode();
    }

    /** Place the camera for this frame. `player` is drawn at player.renderPos. */
    update(dt, player) {
      const cam = this.camera;
      const settings = this.settings;
      const first = this.isFirstPerson;
      const aim = player.aimAmount;

      // Look-behind is a smoothed 180° turn of the view only.
      const behind = this.input.down('lookBehind') ? 1 : 0;
      this._behind = damp(this._behind, behind, 12, dt);
      const yaw = this.yaw + Math.PI * this._behind;
      const pitch = this.pitch * (1 - this._behind);

      // Pivot: head height above the interpolated feet, smoothed a little
      // vertically so steps and jumps don't jolt the view.
      const eye = this._eye.copy(player.renderPos);
      eye.y += player.eyeHeight() + player._stepOffset * 0.3;
      if (!this._initialised) {
        this.pivot.copy(eye);
        this.curDist = this.mode.distance;
        this._initialised = true;
      }
      this.pivot.x = damp(this.pivot.x, eye.x, 30, dt);
      this.pivot.z = damp(this.pivot.z, eye.z, 30, dt);
      this.pivot.y = damp(this.pivot.y, eye.y, player.state === 'climb' ? 7 : 11, dt);
      this._dip = damp(this._dip, 0, 5, dt);

      const cp = Math.cos(pitch);
      const fwd = this._fwd.set(Math.sin(yaw) * cp, Math.sin(pitch), Math.cos(yaw) * cp);
      const right = this._right.set(-Math.cos(yaw), 0, Math.sin(yaw));

      let targetFov = settings.get('graphics.fov');
      const sprintFactor = player.sprinting ? clamp((player.speed - 4.6) / 2.8, 0, 1) : 0;
      targetFov += sprintFactor * 7 - aim * 16;

      if (first) {
        player.model.setVisible(true);
        player.model.setHeadVisible(false);
        cam.near = 0.05;
        cam.position.set(eye.x + Math.sin(yaw) * 0.14, eye.y + 0.02, eye.z + Math.cos(yaw) * 0.14);
      } else {
        player.model.setHeadVisible(true);
        cam.near = 0.1;
        const m = this.mode;
        const baseDist = Math.max(1.4, m.distance + this.zoom);
        const dist = lerp(baseDist + sprintFactor * 0.5, 1.75, aim);
        let side = lerp(0.42, 0.62, aim);
        const up = lerp(m.height, 0.08, aim) - this._dip;

        // Leg 1: head → shoulder (the shoulder offset must not poke into a wall).
        const hitSide = this.physics.raycast(this.pivot.x, this.pivot.y, this.pivot.z, right.x, 0, right.z, side + 0.25,
          { inflate: 0.12, flags: VH.COLLIDE.CAMERA, ground: false, ignoreInside: true });
        if (hitSide) side = Math.max(0, hitSide.t - 0.25);
        const shoulder = this._shoulder.copy(this.pivot).addScaledVector(right, side);
        shoulder.y += up;

        // Leg 2: shoulder → back along the view direction.
        const hit = this.physics.raycast(shoulder.x, shoulder.y, shoulder.z, -fwd.x, -fwd.y, -fwd.z, dist + 0.3,
          { inflate: 0.2, flags: VH.COLLIDE.CAMERA, ground: true, ignoreInside: true });
        const allowed = hit ? Math.max(0.3, hit.t - 0.15) : dist;
        if (allowed < this.curDist) this.curDist = allowed;
        else this.curDist = damp(this.curDist, allowed, 4.5, dt);

        cam.position.copy(shoulder).addScaledVector(fwd, -this.curDist);
        // Too close to the head: hide Jay rather than show the inside of his skull.
        player.model.setVisible(this.curDist > 0.7);
      }

      // Camera shake (landings now; explosions and gunfire later).
      if (this._shake > 0.001) {
        const t = performance.now() / 1000;
        const s = this._shake * 0.08;
        cam.position.x += Math.sin(t * 37.1) * s;
        cam.position.y += Math.sin(t * 43.7 + 1.3) * s;
        cam.position.z += Math.sin(t * 29.3 + 2.1) * s;
        this._shake = damp(this._shake, 0, 6, dt);
      }

      this.fov = damp(this.fov, targetFov, 8, dt);
      if (Math.abs(cam.fov - this.fov) > 0.01 || cam.near !== this._lastNear) {
        cam.fov = this.fov;
        cam.updateProjectionMatrix();
        this._lastNear = cam.near;
      }
      cam.rotation.set(pitch, yaw + Math.PI, 0, 'YXZ');
      cam.updateMatrixWorld();
    }

    /**
     * Title-screen shot: a slow orbit around downtown, with the ocean
     * swinging through the frame.
     */
    titleShot(t, center) {
      const cam = this.camera;
      const a = t * 0.035 + 2.2;
      const r = 430;
      cam.near = 0.5;
      cam.fov = 50;
      cam.updateProjectionMatrix();
      cam.position.set(center.x + Math.cos(a) * r, 95 + Math.sin(t * 0.05) * 20, center.z + Math.sin(a) * r);
      cam.lookAt(center.x, 55, center.z);
      cam.updateMatrixWorld();
      this._lastNear = cam.near;
    }

    /** Forward direction on the ground plane (for the player's movement). */
    get flatYaw() {
      return this.yaw;
    }
  }

  CameraRig.MODES = MODES;
  VH.CameraRig = CameraRig;
})();
