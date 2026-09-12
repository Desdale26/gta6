// input.js — keyboard / mouse / gamepad input with named actions and edge detection.
import { clamp } from './mathx.js';

export const DEFAULT_BINDINGS = {
  forward: ['KeyW', 'ArrowUp'],
  back: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  sprint: ['ShiftLeft', 'ShiftRight'],
  jump: ['Space'],
  crouch: ['KeyC'],
  enter: ['KeyF'],
  interact: ['KeyE'],
  reload: ['KeyR'],
  handbrake: ['Space'],
  horn: ['KeyH'],
  lookBehind: ['KeyB'],
  cameraToggle: ['KeyV'],
  nextWeapon: ['KeyQ'],
  prevWeapon: ['KeyZ'],
  wheel: ['Tab'],
  pause: ['Escape'],
  map: ['KeyM'],
  phone: ['KeyP'],
  radioNext: ['BracketRight'],
  radioPrev: ['BracketLeft'],
  headlights: ['KeyL'],
  slowmo: ['KeyT'],
  nitro: ['ShiftLeft'],
  debug: ['F3'],
  screenshot: ['F2'],
  respawn: ['KeyK'],
  cinematic: ['KeyO'],
};

const WEAPON_SLOT_CODES = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0'];

export class Input {
  constructor(domElement, settings) {
    this.el = domElement;
    this.settings = settings;
    this.bindings = JSON.parse(JSON.stringify(DEFAULT_BINDINGS));
    this.keys = new Set();
    this.keysDownEdge = new Set();
    this.keysUpEdge = new Set();
    this.mouse = { x: 0, y: 0, dx: 0, dy: 0, wheel: 0, left: false, right: false, middle: false,
                   leftEdge: false, rightEdge: false, leftUpEdge: false };
    this.pointerLocked = false;
    // Some embedders (an iframe without allow="pointer-lock") refuse to capture
    // the cursor. Mouse look has to keep working there, so fall back to reading
    // raw movement without capture once a request has actually been refused.
    this.pointerLockAvailable = true;
    this.gamepadIndex = null;
    this.gp = { lx: 0, ly: 0, rx: 0, ry: 0, lt: 0, rt: 0, buttons: [], prevButtons: [] };
    this.enabled = true;
    this.uiCaptured = false;   // true while a DOM UI panel wants the keyboard
    this.lastInputDevice = 'keyboard';
    this.weaponSlot = -1;      // set on the frame a number key is pressed
    this._bound = {};
    this._install();
  }

  _install() {
    const b = this._bound;
    b.keydown = (e) => {
      if (e.repeat) { return; }
      // Never swallow devtools / reload shortcuts.
      if (e.ctrlKey || e.metaKey) return;
      this.lastInputDevice = 'keyboard';
      if (!this.keys.has(e.code)) this.keysDownEdge.add(e.code);
      this.keys.add(e.code);
      const slot = WEAPON_SLOT_CODES.indexOf(e.code);
      if (slot >= 0) this.weaponSlot = slot === 9 ? 9 : slot;
      if (PREVENT_DEFAULT.has(e.code) && !this.uiCaptured) e.preventDefault();
    };
    b.keyup = (e) => {
      this.keys.delete(e.code);
      this.keysUpEdge.add(e.code);
    };
    b.blur = () => { this.keys.clear(); this.mouse.left = this.mouse.right = this.mouse.middle = false; };
    b.mousedown = (e) => {
      this.lastInputDevice = 'keyboard';
      if (e.button === 0) { if (!this.mouse.left) this.mouse.leftEdge = true; this.mouse.left = true; }
      if (e.button === 1) this.mouse.middle = true;
      if (e.button === 2) { if (!this.mouse.right) this.mouse.rightEdge = true; this.mouse.right = true; }
    };
    b.mouseup = (e) => {
      if (e.button === 0) { this.mouse.left = false; this.mouse.leftUpEdge = true; }
      if (e.button === 1) this.mouse.middle = false;
      if (e.button === 2) this.mouse.right = false;
    };
    b.mousemove = (e) => {
      if (this.pointerLocked || !this.pointerLockAvailable) {
        this.mouse.dx += e.movementX || 0;
        this.mouse.dy += e.movementY || 0;
      }
      this.mouse.x = e.clientX; this.mouse.y = e.clientY;
    };
    b.wheel = (e) => { this.mouse.wheel += Math.sign(e.deltaY); if (this.pointerLocked) e.preventDefault(); };
    b.contextmenu = (e) => { e.preventDefault(); };
    b.plock = () => { this.pointerLocked = document.pointerLockElement === this.el; };
    b.plockerr = () => { this.pointerLockAvailable = false; this.pointerLocked = false; };
    b.gpconnect = (e) => { this.gamepadIndex = e.gamepad.index; };
    b.gpdisconnect = () => { this.gamepadIndex = null; };

    window.addEventListener('keydown', b.keydown, { passive: false });
    window.addEventListener('keyup', b.keyup);
    window.addEventListener('blur', b.blur);
    window.addEventListener('mousedown', b.mousedown);
    window.addEventListener('mouseup', b.mouseup);
    window.addEventListener('mousemove', b.mousemove);
    window.addEventListener('wheel', b.wheel, { passive: false });
    this.el.addEventListener('contextmenu', b.contextmenu);
    document.addEventListener('pointerlockchange', b.plock);
    document.addEventListener('pointerlockerror', b.plockerr);
    window.addEventListener('gamepadconnected', b.gpconnect);
    window.addEventListener('gamepaddisconnected', b.gpdisconnect);
  }

  dispose() {
    const b = this._bound;
    window.removeEventListener('keydown', b.keydown);
    window.removeEventListener('keyup', b.keyup);
    window.removeEventListener('blur', b.blur);
    window.removeEventListener('mousedown', b.mousedown);
    window.removeEventListener('mouseup', b.mouseup);
    window.removeEventListener('mousemove', b.mousemove);
    window.removeEventListener('wheel', b.wheel);
    this.el.removeEventListener('contextmenu', b.contextmenu);
    document.removeEventListener('pointerlockchange', b.plock);
    document.removeEventListener('pointerlockerror', b.plockerr);
    window.removeEventListener('gamepadconnected', b.gpconnect);
    window.removeEventListener('gamepaddisconnected', b.gpdisconnect);
  }

  lockPointer() {
    if (this.pointerLocked || !this.pointerLockAvailable) return;
    // Second refusal: stop asking and read movement uncaptured instead.
    const denied = () => { this.pointerLockAvailable = false; };
    let p;
    try { p = this.el.requestPointerLock?.({ unadjustedMovement: true }); }
    catch (e) { denied(); return; }
    if (p && typeof p.catch === 'function') {
      p.catch(() => {
        try {
          const q = this.el.requestPointerLock();
          if (q && typeof q.catch === 'function') q.catch(denied);
        } catch (e) { denied(); }
      });
    }
  }
  unlockPointer() { if (document.pointerLockElement) document.exitPointerLock(); }

  _codes(action) { return this.bindings[action] || []; }
  down(action) {
    if (!this.enabled) return false;
    const c = this._codes(action);
    for (let i = 0; i < c.length; i++) if (this.keys.has(c[i])) return true;
    return false;
  }
  pressed(action) {
    if (!this.enabled) return false;
    const c = this._codes(action);
    for (let i = 0; i < c.length; i++) if (this.keysDownEdge.has(c[i])) return true;
    return false;
  }
  released(action) {
    const c = this._codes(action);
    for (let i = 0; i < c.length; i++) if (this.keysUpEdge.has(c[i])) return true;
    return false;
  }
  keyPressed(code) { return this.keysDownEdge.has(code); }
  keyDown(code) { return this.keys.has(code); }

  /** -1..1 strafe axis (A/D + left stick X). */
  get moveX() {
    let v = (this.down('right') ? 1 : 0) - (this.down('left') ? 1 : 0);
    if (Math.abs(this.gp.lx) > 0.15) v = this.gp.lx;
    return clamp(v, -1, 1);
  }
  /** -1..1 forward axis (W/S + left stick Y); +1 is forward. */
  get moveY() {
    let v = (this.down('forward') ? 1 : 0) - (this.down('back') ? 1 : 0);
    if (Math.abs(this.gp.ly) > 0.15) v = -this.gp.ly;
    return clamp(v, -1, 1);
  }
  get throttle() { return Math.max(0, this.moveY) || this.gp.rt; }
  get brakeAxis() { return Math.max(0, -this.moveY) || this.gp.lt; }
  get aiming() { return this.mouse.right || this.gp.lt > 0.5; }
  get firing() { return this.mouse.left || this.gp.rt > 0.5; }
  get sprinting() { return this.down('sprint') || (this.gp.buttons[10] ?? false); }

  /** Mouse/stick look delta in radians for this frame. */
  lookDelta(dt) {
    const sens = 0.0022 * (this.settings?.get('mouseSensitivity') ?? 1);
    let yaw = -this.mouse.dx * sens;
    let pitch = -this.mouse.dy * sens * (this.settings?.get('invertY') ? -1 : 1);
    const gx = Math.abs(this.gp.rx) > 0.12 ? this.gp.rx : 0;
    const gy = Math.abs(this.gp.ry) > 0.12 ? this.gp.ry : 0;
    if (gx || gy) {
      const gs = 2.6 * dt * (this.settings?.get('mouseSensitivity') ?? 1);
      yaw -= gx * gs;
      pitch -= gy * gs * (this.settings?.get('invertY') ? -1 : 1);
      this.lastInputDevice = 'gamepad';
    }
    return { yaw, pitch };
  }

  _pollGamepad() {
    if (!navigator.getGamepads) return;
    const pads = navigator.getGamepads();
    let pad = this.gamepadIndex != null ? pads[this.gamepadIndex] : null;
    if (!pad) { for (const p of pads) if (p && p.connected) { pad = p; this.gamepadIndex = p.index; break; } }
    if (!pad) { this.gp.lx = this.gp.ly = this.gp.rx = this.gp.ry = this.gp.lt = this.gp.rt = 0; this.gp.buttons.length = 0; return; }
    const dz = (v) => (Math.abs(v) < 0.12 ? 0 : (v - Math.sign(v) * 0.12) / 0.88);
    this.gp.lx = dz(pad.axes[0] || 0); this.gp.ly = dz(pad.axes[1] || 0);
    this.gp.rx = dz(pad.axes[2] || 0); this.gp.ry = dz(pad.axes[3] || 0);
    this.gp.prevButtons = this.gp.buttons.slice();
    this.gp.buttons = pad.buttons.map((b) => b.pressed);
    this.gp.lt = pad.buttons[6]?.value || 0;
    this.gp.rt = pad.buttons[7]?.value || 0;
    if (this.gp.buttons.some(Boolean) || Math.abs(this.gp.lx) > 0.3) this.lastInputDevice = 'gamepad';
  }
  gpPressed(i) { return !!this.gp.buttons[i] && !this.gp.prevButtons[i]; }

  /** Call at the END of each frame — clears per-frame edges and deltas. */
  endFrame() {
    this.keysDownEdge.clear();
    this.keysUpEdge.clear();
    this.mouse.dx = 0; this.mouse.dy = 0; this.mouse.wheel = 0;
    this.mouse.leftEdge = false; this.mouse.rightEdge = false; this.mouse.leftUpEdge = false;
    this.weaponSlot = -1;
  }
  /** Call at the START of each frame. */
  beginFrame() { this._pollGamepad(); }
}

const PREVENT_DEFAULT = new Set([
  'Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'F3', 'F2',
  'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0',
]);
