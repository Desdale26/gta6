// weapons.js — the player's arsenal: inventory, models, ballistics and recoil.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { clamp, lerp, damp } from '../core/mathx.js';
import { LAYER, MASK_BULLET, SURFACE } from '../physics/world.js';
import { WEAPONS, getWeapon, WEAPON_SLOTS } from '../content/weaponCatalog.js';
import { stdMat, physMat } from '../render/matmode.js';

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _hitList = [];

const DEG = Math.PI / 180;

// ---------------------------------------------------------------------------
// Weapon models — parametric, built once per weapon id.
// ---------------------------------------------------------------------------
const modelCache = new Map();

function box(w, h, d, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (rx) g.rotateX(rx); if (ry) g.rotateY(ry); if (rz) g.rotateZ(rz);
  g.translate(x, y, z);
  return g;
}
function cyl(r1, r2, h, seg, x = 0, y = 0, z = 0, rx = 0, rz = 0) {
  const g = new THREE.CylinderGeometry(r1, r2, h, seg);
  if (rx) g.rotateX(rx); if (rz) g.rotateZ(rz);
  g.translate(x, y, z);
  return g;
}

/** Build a weapon mesh from its `model` spec. Returns { group, muzzle:Vector3 }. */
export function buildWeaponModel(def, materials) {
  const key = def.id;
  if (modelCache.has(key)) {
    const c = modelCache.get(key);
    return { group: c.group.clone(true), muzzle: c.muzzle.clone() };
  }
  const m = def.model || { kind: 'pistol', length: 0.22, bodyColor: 0x2a2e34, gripColor: 0x1a1a1e, accentColor: 0x8a8f96 };
  const group = new THREE.Group();
  group.name = 'weapon:' + def.id;
  const bodyParts = [], gripParts = [], accentParts = [];
  const L = m.length || 0.3;
  let muzzleZ = L * 0.6;

  const kind = m.kind;
  switch (kind) {
    case 'fists': break;
    case 'knife': case 'katana': case 'machete': {
      const bl = kind === 'katana' ? 0.85 : kind === 'machete' ? 0.5 : 0.22;
      accentParts.push(box(0.006, 0.032, bl, 0, 0, bl * 0.5 + 0.05));
      gripParts.push(box(0.028, 0.028, 0.11, 0, 0, 0));
      accentParts.push(box(0.07, 0.012, 0.016, 0, 0, 0.056));
      muzzleZ = bl + 0.1;
      break;
    }
    case 'bat': case 'crowbar': case 'hammer': {
      gripParts.push(cyl(0.018, 0.022, 0.22, 7, 0, 0, 0.11, Math.PI / 2));
      if (kind === 'bat') bodyParts.push(cyl(0.028, 0.036, 0.48, 8, 0, 0, 0.46, Math.PI / 2));
      else if (kind === 'hammer') { bodyParts.push(cyl(0.018, 0.018, 0.4, 6, 0, 0, 0.4, Math.PI / 2)); accentParts.push(box(0.07, 0.07, 0.12, 0, 0, 0.6)); }
      else { bodyParts.push(cyl(0.012, 0.012, 0.52, 6, 0, 0, 0.42, Math.PI / 2)); accentParts.push(box(0.03, 0.012, 0.08, 0, 0.02, 0.68, 0.5)); }
      muzzleZ = 0.7;
      break;
    }
    case 'chainsaw': {
      bodyParts.push(box(0.1, 0.16, 0.22, 0, 0, 0.06));
      accentParts.push(box(0.03, 0.08, 0.42, 0, 0.01, 0.36));
      gripParts.push(box(0.09, 0.03, 0.1, 0, 0.09, 0.02));
      muzzleZ = 0.58;
      break;
    }
    case 'grenade': case 'molotov': {
      bodyParts.push(new THREE.SphereGeometry(0.045, 8, 6).scale(1, 1.2, 1));
      accentParts.push(cyl(0.014, 0.014, 0.04, 6, 0, 0.06, 0));
      muzzleZ = 0.06;
      break;
    }
    case 'taser': {
      bodyParts.push(box(0.045, 0.08, 0.12, 0, 0, 0.03));
      gripParts.push(box(0.035, 0.1, 0.045, 0, -0.07, -0.02, 0.22));
      accentParts.push(box(0.03, 0.02, 0.05, 0, 0.01, 0.11));
      muzzleZ = 0.14;
      break;
    }
    case 'minigun': {
      bodyParts.push(box(0.13, 0.14, 0.3, 0, 0, 0.02));
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        accentParts.push(cyl(0.014, 0.014, 0.56, 5, Math.cos(a) * 0.035, Math.sin(a) * 0.035, 0.42, Math.PI / 2));
      }
      gripParts.push(box(0.04, 0.12, 0.05, 0, -0.11, -0.03, 0.14));
      bodyParts.push(box(0.14, 0.14, 0.14, 0, -0.02, -0.16));
      muzzleZ = 0.72;
      break;
    }
    case 'rocket': {
      bodyParts.push(cyl(0.042, 0.042, 0.86, 10, 0, 0, 0.28, Math.PI / 2));
      accentParts.push(cyl(0.056, 0.042, 0.14, 10, 0, 0, -0.2, Math.PI / 2));
      gripParts.push(box(0.035, 0.11, 0.05, 0, -0.09, 0.06, 0.18));
      accentParts.push(box(0.02, 0.05, 0.1, 0, 0.06, 0.18));
      muzzleZ = 0.72;
      break;
    }
    default: {
      // Firearms share a chassis: receiver, barrel, grip, plus optional stock/mag/scope.
      const barrel = m.barrel ?? L * 0.55;
      bodyParts.push(box(0.045, 0.075, L * 0.62, 0, 0, L * 0.06));
      accentParts.push(cyl(0.011, 0.011, barrel, 7, 0, 0.012, L * 0.34 + barrel * 0.5, Math.PI / 2));
      gripParts.push(box(0.034, 0.11, 0.05, 0, -0.085, -L * 0.13, 0.22));
      if (m.mag !== false) gripParts.push(box(0.03, m.drum ? 0.1 : 0.12, m.drum ? 0.1 : 0.042, 0, -0.085, L * 0.02));
      if (m.drum) gripParts.push(cyl(0.06, 0.06, 0.04, 10, 0, -0.11, L * 0.02, 0, Math.PI / 2));
      if (m.stock) bodyParts.push(box(0.038, 0.075, L * 0.42, 0, -0.012, -L * 0.42));
      if (m.supp) accentParts.push(cyl(0.02, 0.02, 0.16, 8, 0, 0.012, L * 0.34 + barrel + 0.08, Math.PI / 2));
      if (m.scopeLen) {
        accentParts.push(cyl(0.019, 0.019, m.scopeLen, 8, 0, 0.055, L * 0.1, Math.PI / 2));
        accentParts.push(box(0.012, 0.03, 0.02, 0, 0.038, L * 0.1 - m.scopeLen * 0.3));
        accentParts.push(box(0.012, 0.03, 0.02, 0, 0.038, L * 0.1 + m.scopeLen * 0.3));
      } else {
        accentParts.push(box(0.008, 0.014, 0.01, 0, 0.048, L * 0.32));
        accentParts.push(box(0.018, 0.012, 0.012, 0, 0.048, -L * 0.12));
      }
      muzzleZ = L * 0.34 + barrel + (m.supp ? 0.16 : 0) + 0.02;
      break;
    }
  }

  const mk = (parts, color, rough, metal) => {
    if (!parts.length) return;
    const g = parts.length === 1 ? parts[0] : (mergeGeometries(parts, false) || parts[0]);
    const mat = stdMat({ color, roughness: rough, metalness: metal });
    const mesh = new THREE.Mesh(g, mat);
    mesh.castShadow = true;
    group.add(mesh);
  };
  mk(bodyParts, m.bodyColor ?? 0x2a2e34, 0.48, 0.7);
  mk(gripParts, m.gripColor ?? 0x17181c, 0.82, 0.1);
  mk(accentParts, m.accentColor ?? 0x8f959c, 0.32, 0.9);

  const muzzle = new THREE.Vector3(0, 0.012, muzzleZ);
  modelCache.set(key, { group, muzzle });
  return { group: group.clone(true), muzzle: muzzle.clone() };
}

// ---------------------------------------------------------------------------
export class WeaponSlotState {
  constructor(def) {
    this.def = def;
    this.ammoInMag = def.magazine;
    this.reserve = Math.min(def.magazine * 3, def.reserveMax);
    this.reloading = 0;
    this.shellsLoaded = 0;
  }
  get total() { return this.ammoInMag + this.reserve; }
}

/**
 * Inventory + firing logic. Shared by the player; NPCs use `Combat.npcFire` instead.
 */
export class WeaponSystem {
  constructor(ctx, owner) {
    this.ctx = ctx;
    this.owner = owner;
    this.slots = new Map();          // weaponId -> WeaponSlotState
    this.order = [];                 // weaponIds in wheel order
    this.currentId = 'fists';
    this.fireTimer = 0;
    this.burstLeft = 0;
    this.recoil = new THREE.Vector2();
    this.recoilVel = new THREE.Vector2();
    this.spreadBloom = 0;
    this.aiming = false;
    this.aimBlend = 0;
    this.lastShotTime = -99;
    this.shotsThisBurst = 0;
    this.model = null;
    this.modelGroup = new THREE.Group();
    this.muzzleLocal = new THREE.Vector3();
    this.meleeSwing = 0;
    this.meleeHitDone = false;
    this.add('fists');
  }

  get def() { return getWeapon(this.currentId) || getWeapon('fists'); }
  get state() { return this.slots.get(this.currentId); }
  get isMelee() { return this.def.projectile === 'melee'; }
  get isThrown() { return this.def.projectile === 'grenade' || this.def.projectile === 'molotov'; }

  add(weaponId, ammo) {
    const def = getWeapon(weaponId);
    if (!def) return false;
    let s = this.slots.get(weaponId);
    if (!s) {
      s = new WeaponSlotState(def);
      this.slots.set(weaponId, s);
      this.order = [...this.slots.keys()].sort((a, b) => {
        const A = getWeapon(a), B = getWeapon(b);
        const sa = WEAPON_SLOTS.indexOf(A.slot), sb = WEAPON_SLOTS.indexOf(B.slot);
        return sa - sb || A.order - B.order;
      });
      this.ctx.bus.emit('weapon:acquired', { id: weaponId, def });
    }
    if (ammo) this.addAmmo(weaponId, ammo);
    return true;
  }
  addAmmo(weaponId, amount) {
    const s = this.slots.get(weaponId);
    if (!s) return 0;
    if (amount < 0) { const filled = s.def.reserveMax - s.reserve; s.reserve = s.def.reserveMax; return filled; }
    const before = s.reserve;
    s.reserve = Math.min(s.def.reserveMax, s.reserve + amount);
    return s.reserve - before;
  }
  has(weaponId) { return this.slots.has(weaponId); }

  select(weaponId) {
    if (!this.slots.has(weaponId) || weaponId === this.currentId) return false;
    this.currentId = weaponId;
    const s = this.state;
    if (s) s.reloading = 0;
    this.spreadBloom = 0;
    this.fireTimer = 0.28;
    this._buildModel();
    this.ctx.audio?.play('weaponSwitch', { volume: 0.5, ui: false });
    this.ctx.bus.emit('weapon:changed', { id: weaponId, def: this.def });
    return true;
  }
  cycle(delta) {
    if (this.order.length < 2) return;
    const i = this.order.indexOf(this.currentId);
    const n = this.order.length;
    this.select(this.order[(i + delta + n) % n]);
  }
  selectSlotIndex(i) {
    const slotName = WEAPON_SLOTS[i];
    if (!slotName) return;
    // Cycle within the slot if we already have one from it selected.
    const inSlot = this.order.filter((id) => getWeapon(id).slot === slotName);
    if (!inSlot.length) return;
    const cur = inSlot.indexOf(this.currentId);
    this.select(inSlot[(cur + 1) % inSlot.length]);
  }

  _buildModel() {
    this.modelGroup.clear();
    const def = this.def;
    if (def.model && def.model.kind === 'fists') { this.model = null; return; }
    const built = buildWeaponModel(def, this.ctx.materials);
    this.model = built.group;
    this.muzzleLocal.copy(built.muzzle);
    this.modelGroup.add(this.model);
  }

  /** World-space muzzle position given the weapon's world transform. */
  muzzleWorld(out) {
    this.modelGroup.updateMatrixWorld();
    out.copy(this.muzzleLocal).applyMatrix4(this.modelGroup.matrixWorld);
    return out;
  }

  canFire() {
    const def = this.def;
    const s = this.state;
    if (this.fireTimer > 0) return false;
    if (this.isMelee) return this.meleeSwing <= 0;
    if (!s) return false;
    if (s.reloading > 0) return false;
    if (def.magazine > 0 && s.ammoInMag <= 0) return false;
    return true;
  }

  /** Current cone half-angle in radians, including movement and bloom. */
  currentSpread(movingSpeed, airborne) {
    const def = this.def;
    const sp = def.spread;
    let deg = this.aiming ? sp.aim : sp.hip;
    deg = lerp(deg, sp.moving, clamp(movingSpeed / 6, 0, 1));
    if (airborne) deg = Math.max(deg, sp.jump);
    deg += this.spreadBloom;
    return deg * DEG;
  }

  update(dt, ctxState = {}) {
    const def = this.def;
    const s = this.state;
    this.fireTimer = Math.max(0, this.fireTimer - dt);
    this.aimBlend = damp(this.aimBlend, this.aiming ? 1 : 0, 12, dt);

    // recoil spring
    this.recoilVel.multiplyScalar(Math.max(0, 1 - def.recoil.recovery * dt));
    this.recoil.x = damp(this.recoil.x, 0, def.recoil.recovery, dt);
    this.recoil.y = damp(this.recoil.y, 0, def.recoil.recovery, dt);
    this.spreadBloom = Math.max(0, this.spreadBloom - dt * 9);

    if (s && s.reloading > 0) {
      s.reloading -= dt;
      if (s.reloading <= 0) this._finishReload();
    }
    if (this.meleeSwing > 0) {
      this.meleeSwing -= dt;
      if (!this.meleeHitDone && this.meleeSwing < def.melee?.swingTime * 0.45) {
        this.meleeHitDone = true;
        this._meleeHit();
      }
    }
    // burst fire continues on its own
    if (this.burstLeft > 0 && this.fireTimer <= 0) {
      this.burstLeft--;
      this._fireOnce(ctxState);
    }
  }

  startReload() {
    const def = this.def;
    const s = this.state;
    if (!s || def.reloadType === 'none' || s.reloading > 0) return false;
    if (s.ammoInMag >= def.magazine || s.reserve <= 0) return false;
    s.reloading = def.reloadTime;
    s.shellsLoaded = 0;
    this.ctx.audio?.play(def.reloadType === 'shell' ? 'reloadShotgun' : 'reload', { volume: 0.65 });
    this.ctx.bus.emit('weapon:reload', { id: this.currentId });
    return true;
  }
  _finishReload() {
    const def = this.def;
    const s = this.state;
    if (!s) return;
    const need = def.magazine - s.ammoInMag;
    const take = Math.min(need, s.reserve);
    s.ammoInMag += take;
    s.reserve -= take;
  }

  /** @returns true if a shot actually left the barrel. */
  tryFire(state) {
    const def = this.def;
    if (!this.canFire()) {
      if (this.fireTimer <= 0 && !this.isMelee) {
        const s = this.state;
        if (s && s.ammoInMag <= 0 && s.reserve > 0) this.startReload();
        else if (s && s.total <= 0) {
          this.ctx.audio?.play('dryFire', { volume: 0.5 });
          this.fireTimer = 0.4;
        }
      }
      return false;
    }
    if (def.burst > 0) {
      this.burstLeft = def.burst - 1;
    }
    return this._fireOnce(state);
  }

  _fireOnce(state) {
    const def = this.def;
    const ctx = this.ctx;
    if (this.isMelee) {
      this.meleeSwing = def.melee.swingTime;
      this.meleeHitDone = false;
      this.fireTimer = def.melee.swingTime * 1.1;
      ctx.audio?.playAt('swing', this.owner.position, { volume: 0.55 });
      return true;
    }
    const s = this.state;
    if (!s || (def.magazine > 0 && s.ammoInMag <= 0)) return false;
    s.ammoInMag--;
    this.fireTimer = 60 / Math.max(1, def.fireRateRpm);
    this.lastShotTime = ctx.time.elapsed;

    // --- recoil kick ---
    const r = def.recoil;
    this.recoil.y += r.vert * (this.aiming ? 0.72 : 1);
    this.recoil.x += (Math.random() - 0.5) * 2 * r.horiz * (this.aiming ? 0.7 : 1);
    this.spreadBloom = Math.min(def.spread.hip * 2.2, this.spreadBloom + r.kick * 0.8);

    const origin = state.origin;
    const dir = state.direction;
    const spread = this.currentSpread(state.speed || 0, state.airborne);

    if (this.isThrown) {
      ctx.combat.throwProjectile(this.owner, def, origin, dir, state.charge ?? 1);
      if (s.ammoInMag <= 0 && s.reserve > 0) { s.ammoInMag = Math.min(def.magazine, s.reserve); s.reserve -= s.ammoInMag; }
      return true;
    }

    const muzzle = state.muzzle || origin;
    ctx.particles?.spawnMuzzleFlash(muzzle.x, muzzle.y, muzzle.z, dir.x, dir.y, dir.z,
      def.silenced ? 0.45 : clamp(def.damage / 40, 0.6, 2.0));
    ctx.audio?.playAt(soundFor(def), muzzle, {
      volume: def.silenced ? 0.5 : clamp(0.6 + def.damage / 120, 0.6, 1.0),
      pitch: def.sound.pitch * (0.97 + Math.random() * 0.06),
      reverb: 0.8, maxDistance: def.silenced ? 60 : 320,
    });
    if (def.shell) {
      ctx.audio?.playAt('shellDrop', muzzle, { volume: 0.22, maxDistance: 25 });
    }

    for (let p = 0; p < Math.max(1, def.pellets); p++) {
      _v1.copy(dir);
      applySpread(_v1, spread);
      if (def.projectile === 'rocket') {
        ctx.combat.fireRocket(this.owner, def, muzzle, _v1);
      } else if (def.projectile === 'flame') {
        ctx.combat.fireFlame(this.owner, def, muzzle, _v1);
      } else {
        ctx.combat.fireBullet(this.owner, def, muzzle, _v1, { tracer: def.tracer && p === 0 });
      }
    }
    ctx.bus.emit('weapon:fired', { id: this.currentId, def, muzzle });
    return true;
  }

  _meleeHit() {
    const def = this.def;
    const ctx = this.ctx;
    const owner = this.owner;
    const reach = def.melee.reach;
    const arc = def.melee.arc * DEG;
    const origin = owner.position;
    const fwd = owner.aimDirection ? owner.aimDirection : _v2.set(Math.sin(owner.yaw), 0, Math.cos(owner.yaw));

    let hitSomething = false;
    const peds = ctx.peds ? ctx.peds.inRadius(origin.x, origin.z, reach + 0.6, _hitList) : [];
    for (const p of peds) {
      if (p === owner || p.dead) continue;
      _v1.copy(p.body.position).sub(origin);
      _v1.y = 0;
      const d = _v1.length();
      if (d > reach) continue;
      _v1.divideScalar(d || 1);
      if (_v1.dot(fwd) < Math.cos(arc * 0.5)) continue;
      const killed = p.damage(def.damage, { source: owner, melee: true });
      p.shove(fwd.x * def.melee.stagger, 1.2, fwd.z * def.melee.stagger);
      ctx.audio?.playAt(def.id.includes('knife') || def.id.includes('machete') || def.id.includes('katana') ? 'knifeStab' : 'punch',
        p.body.position, { volume: 0.7 });
      ctx.particles?.spawnBlood(p.body.position.x, p.body.position.y + 1.2, p.body.position.z, fwd.x, 0.4, fwd.z, 1);
      ctx.bus.emit('combat:hit', { target: p, source: owner, killed, melee: true, damage: def.damage });
      hitSomething = true;
    }
    // vehicles take a dent too
    if (ctx.traffic) {
      const v = ctx.traffic.nearestVehicle(origin.x + fwd.x * reach * 0.6, origin.z + fwd.z * reach * 0.6, reach);
      if (v) {
        v.damage(def.damage * 0.6, origin.x + fwd.x, origin.y + 1, origin.z + fwd.z, owner);
        ctx.audio?.playAt('impactMetal', v.sim.position, { volume: 0.6 });
        hitSomething = true;
      }
    }
    if (!hitSomething) return;
    ctx.bus.emit('melee:landed', { source: owner });
  }
}

function soundFor(def) {
  if (def.silenced) return 'gunSilenced';
  switch (def.sound.type) {
    case 'pistol': return 'gunPistol';
    case 'smg': return 'gunSmg';
    case 'shotgun': return 'gunShotgun';
    case 'rifle': return 'gunRifle';
    case 'sniper': return 'gunSniper';
    case 'mg': return 'gunMg';
    case 'rocket': return 'rocketLaunch';
    case 'flame': return 'fireLoop';
    case 'taser': return 'uiWanted';
    default: return 'gunPistol';
  }
}

/** Rotate a direction by a random offset inside a cone of half-angle `spread`. */
export function applySpread(dir, spread) {
  if (spread <= 0) return dir;
  // Build an orthonormal basis around dir.
  _v3.set(0, 1, 0);
  if (Math.abs(dir.y) > 0.95) _v3.set(1, 0, 0);
  const right = _v3.clone().cross(dir).normalize();
  const up = dir.clone().cross(right).normalize();
  const a = Math.random() * Math.PI * 2;
  const r = Math.sqrt(Math.random()) * spread;
  dir.addScaledVector(right, Math.tan(r) * Math.cos(a));
  dir.addScaledVector(up, Math.tan(r) * Math.sin(a));
  dir.normalize();
  return dir;
}

export { WEAPONS, getWeapon, WEAPON_SLOTS };
