/*
 * combat.js — weapons, shooting and fighting.
 *
 *   Jay        an inventory of weapons (weapons-data.js) with magazines, and
 *              shared ammo pools (all 9 mm guns draw on the same 9 mm, every
 *              shotgun on the same 12 gauge); the model in his hand; aim
 *              (right mouse) and fire (left mouse), reload (R), the weapon
 *              wheel (hold Tab: time slows), 1–9 for slots, drive-bys from
 *              the car window, melee, thrown grenades, molotovs and limpet
 *              charges (R sets them off), launched rockets and 40 mm grenades,
 *              the stun gun, and the minigun's spin-up
 *   bullets    hitscan from the camera through the crosshair; single shots
 *              go dead centre when aimed and wander a little from the hip,
 *              automatics bloom; people (headshots, flinches, stuns), cars
 *              and the city all react, and every shot kicks the view
 *   NPCs       npcFire() for police and gangs: accuracy falls off with range,
 *              target speed and whether they have just been hit; misses fly
 *              past with a whizz; the shot leaves their gun's muzzle
 *   brains     CombatBrain: enemies who notice you, keep their distance,
 *              find cover, peek, strafe and shoot. Missions set them up
 *   pickups    weapons, ammo, armour, health and cash lying around (dropped by
 *              enemies, or placed: worldpickups.js), collected on foot or by
 *              driving slowly over them; police cars and army trucks carry a
 *              little ammo the first time Jay gets in
 */
(function () {
  'use strict';

  const VH = window.VH;
  const { clamp, lerp, smoothstep, dampAngle } = VH.math;

  function weaponList() {
    return (VH.Data && VH.Data.weapons) || [];
  }

  function def(id) {
    return (VH.Data && VH.Data.weaponsById && VH.Data.weaponsById[id]) || null;
  }

  function pool(id) {
    return (VH.Data && VH.Data.ammoTypes && VH.Data.ammoTypes[id]) || null;
  }

  /** The wheel's slots in order (digit keys 1–9 follow it). */
  function slotOrder() {
    const s = VH.Data && VH.Data.weaponSlots;
    return s && s.length ? s.map((x) => x.id) : ['unarmed', 'melee', 'pistol', 'smg', 'shotgun', 'rifle', 'sniper', 'thrown', 'heavy'];
  }

  // Blasts Jay sets off count as his (vehicle feedback and the crowd credit a source with driver 'player').
  const PLAYER_SOURCE = { driver: 'player', id: -1 };
  // What the police and the army keep in their vehicles: [pool or weapon, amount].
  const LOOT = {
    interceptor: [['12g', 12, 'shotgun'], ['9mm', 30, 'pistol']],
    unmarked: [['9mm', 45, 'pistol'], ['9mm', 64, 'smg']],
    bulwark: [['556', 60, 'rifle'], ['9mm', 96, 'smg'], ['armor', 50]],
    scout: [['556', 90, 'rifle'], ['armor', 100], ['grenade', 2, 'grenade']],
    bastion: [['armor', 100]],
  };
  // The best weapon to fire out of a car window, best first.
  const DRIVEBY = ['smg', 'sawnoff', 'revolver', 'pistol'];

  // --------------------------------------------------------- projectile
  /**
   * Anything that flies: a thrown grenade, molotov or limpet charge, a
   * rocket, a 40 mm grenade. What it does comes from the weapon's data:
   *   projectile   launched: straight (rocket) or arcing and bouncing (GL);
   *                bursts on anyone or any car it touches once armed
   *   sticky       a limpet: sticks to the first thing it hits (cars carry
   *                it along) and waits for R
   *   fuse 0       bursts on impact (a molotov: a pool of fire)
   *   otherwise    bounces until its fuse runs out (a frag grenade)
   */
  class Thrown {
    constructor(combat, weapon, x, y, z, vx, vy, vz, owner) {
      this.combat = combat;
      this.w = weapon;
      this.pos = new THREE.Vector3(x, y, z);
      this.vel = new THREE.Vector3(vx, vy, vz);
      this.start = this.pos.clone();
      this.t = 0;
      this.owner = owner;
      const P = weapon.projectile;
      this.kind = P ? 'launched' : weapon.sticky ? 'sticky' : weapon.fuse ? 'grenade' : 'burst';
      this.gravity = P ? P.gravity : 14;
      this.fuse = P ? P.fuse : weapon.fuse || 2.6;
      const WM = VH.WeaponModels;
      this.mesh = WM ? WM.build(P && P.model ? P.model : weapon.id) : new THREE.Mesh(new THREE.SphereGeometry(0.06), new THREE.MeshStandardMaterial({ color: 0x334422 }));
      if (!P && WM) {
        // Spin about its own middle, not the hand's grip point.
        const box = new THREE.Box3().setFromObject(this.mesh);
        const c = box.getCenter(new THREE.Vector3());
        for (const ch of this.mesh.children) ch.position.sub(c);
      }
      this.mesh.position.copy(this.pos);
      combat.game.scene.add(this.mesh);
      this.done = false;
      this.stuck = null; // { v, lx, ly, lz } on a car, or { v: null } in the world
      this.voice = P && P.model === 'rocket' && combat.game.audio.createRocket ? combat.game.audio.createRocket() : null;
      this._fwd = new THREE.Vector3(0, 0, 1);
    }

    update(dt) {
      const c = this.combat;
      const g = c.game;
      this.t += dt;
      if (this.stuck) {
        this._ride();
        if (this.blowIn !== undefined) {
          this.blowIn -= dt;
          if (this.blowIn <= 0) this._explode();
        } else if (this.t > 600) this._remove();
        return;
      }
      this.vel.y -= this.gravity * dt;
      const next = this.pos.clone().addScaledVector(this.vel, dt);
      const d = next.clone().sub(this.pos);
      const len = d.length();
      const armed = this.kind !== 'launched' || this.pos.distanceTo(this.start) > 2;
      if (len > 1e-5) {
        const dx = d.x / len;
        const dy = d.y / len;
        const dz = d.z / len;
        // People and cars first (launched rounds and limpets care; grenades bounce off).
        if (armed && this.kind !== 'grenade') {
          const ha = this.kind === 'sticky' ? null : g.crowd.raycast(this.pos.x, this.pos.y, this.pos.z, dx, dy, dz, len + 0.05);
          let hv = null;
          let ht = len + 0.05;
          for (const v of g.vehicles.list) {
            if (v === g.player.vehicle && this.owner === 'player' && this.t < 0.3) continue;
            const t = Combat.rayCar(v, this.pos.x, this.pos.y, this.pos.z, dx, dy, dz, ht);
            if (t >= 0 && t < ht) {
              ht = t;
              hv = v;
            }
          }
          if (ha && (!hv || ha.t < ht)) {
            this.pos.addScaledVector(d, ha.t / len);
            this._contact(null);
            return;
          }
          if (hv) {
            this.pos.set(this.pos.x + dx * ht, this.pos.y + dy * ht, this.pos.z + dz * ht);
            this._contact(hv);
            return;
          }
        }
        const hit = g.physics.raycast(this.pos.x, this.pos.y, this.pos.z, dx, dy, dz, len + 0.05, { flags: VH.COLLIDE.SOLID | VH.COLLIDE.SHOTS, ground: true });
        if (hit) {
          if (this.kind === 'burst' || (this.kind === 'launched' && !this.w.projectile.bounce && armed)) {
            this.pos.set(hit.x, hit.y, hit.z);
            this._contact(null, hit);
            return;
          }
          if (this.kind === 'sticky') {
            this.pos.set(hit.x + hit.nx * 0.03, hit.y + hit.ny * 0.03, hit.z + hit.nz * 0.03);
            this._stick(null, hit);
            return;
          }
          const n = new THREE.Vector3(hit.nx, hit.ny, hit.nz);
          this.vel.reflect(n).multiplyScalar(0.42);
          next.set(hit.x + n.x * 0.05, hit.y + n.y * 0.05, hit.z + n.z * 0.05);
          if (g.audio.grenadeBounce && this.vel.length() > 1.5) g.audio.grenadeBounce(c.pan(hit.x, hit.z), c.gain(hit.x, hit.z, 10));
        }
      }
      this.pos.copy(next);
      this.mesh.position.copy(this.pos);
      if (this.kind === 'launched') {
        // Point along the flight path.
        if (this.vel.lengthSq() > 0.01) this.mesh.quaternion.setFromUnitVectors(this._fwd.set(0, 0, 1), this.vel.clone().normalize());
        if (this.w.projectile.model === 'rocket') g.fx.rocketTrail(this.pos.x, this.pos.y, this.pos.z, this.vel.x, this.vel.y, this.vel.z);
        if (this.voice) this.voice.update({ gain: c.gain(this.pos.x, this.pos.z, 25), pan: c.pan(this.pos.x, this.pos.z) });
      } else {
        this.mesh.rotation.x += dt * 9;
        this.mesh.rotation.z += dt * 5;
      }
      if ((this.kind === 'grenade' || this.kind === 'launched') && this.t > this.fuse) this._explode();
      if (this.kind !== 'sticky' && this.t > 8) this._remove();
    }

    /** Touched a person or a car (or, for a molotov or a rocket, anything). */
    _contact(v, hit) {
      if (this.kind === 'sticky') {
        this._stick(v, hit);
        return;
      }
      if (this.kind === 'burst') {
        this._burst(this.pos.x, this.pos.y, this.pos.z);
        return;
      }
      this._explode();
    }

    _stick(v, hit) {
      const g = this.combat.game;
      if (v) {
        // Ride along in the car's own frame.
        const c = Math.cos(v.yaw);
        const s = Math.sin(v.yaw);
        const rx = this.pos.x - v.pos.x;
        const rz = this.pos.z - v.pos.z;
        this.stuck = { v, lx: rx * c - rz * s, ly: this.pos.y - v.pos.y, lz: rx * s + rz * c };
      } else this.stuck = { v: null };
      this.vel.set(0, 0, 0);
      if (hit) this.mesh.quaternion.setFromUnitVectors(this._fwd.set(0, 1, 0), new THREE.Vector3(hit.nx, hit.ny, hit.nz));
      this.mesh.position.copy(this.pos);
      if (g.audio.limpetStick) g.audio.limpetStick(this.combat.pan(this.pos.x, this.pos.z), this.combat.gain(this.pos.x, this.pos.z, 10));
      VH.events.emit('limpet:stuck', { x: this.pos.x, z: this.pos.z });
    }

    /** A charge on a car goes where the car goes. */
    _ride() {
      const s = this.stuck;
      if (!s.v) return;
      const v = s.v;
      if (v.removed) {
        s.v = null;
        return;
      }
      const c = Math.cos(v.yaw);
      const sn = Math.sin(v.yaw);
      this.pos.set(v.renderPos.x + s.lx * c + s.lz * sn, v.renderPos.y + s.ly, v.renderPos.z - s.lx * sn + s.lz * c);
      this.mesh.position.copy(this.pos);
    }

    _explode() {
      if (this.done) return;
      const g = this.combat.game;
      const w = this.w;
      const r = w.blastRadius || 7;
      const src = this.owner === 'player' ? PLAYER_SOURCE : this.owner;
      g.vehicleFeedback.explosion(this.pos.x, this.pos.y, this.pos.z, r / 8, src, w.damage);
      // Rockets and charges are made for cars: one is enough.
      if (w.id === 'rpg' || w.sticky) {
        for (const v of g.vehicles.list) {
          const d = Math.hypot(v.pos.x - this.pos.x, v.pos.z - this.pos.z);
          if (d < r * 0.7 && !v.wrecked) {
            v.damage(1400 * (1 - d / (r * 0.7)), this.owner === 'player' ? 'player' : null, 'blast');
            if (v.wrecked && w.id === 'rpg' && this.owner === 'player') VH.events.emit('combat:rocketCar', { v });
          }
        }
      }
      this.combat.blastDamage(this.pos.x, this.pos.y, this.pos.z, r, w.damage || 180, this.owner);
      this._remove();
    }

    _burst(x, y, z) {
      const g = this.combat.game;
      const w = this.w;
      const dur = w.fireDuration || 8;
      g.fx.fireAt(x, y + 0.1, z, dur, 1.2);
      for (let i = 0; i < 5; i++) g.fx.fireAt(x + (Math.random() - 0.5) * 3, y + 0.1, z + (Math.random() - 0.5) * 3, dur * (0.6 + Math.random() * 0.4), 0.8);
      g.fx.glass(x, y + 0.2, z, 10);
      if (g.audio.molotovBurst) g.audio.molotovBurst(this.combat.pan(x, z), this.combat.gain(x, z, 12));
      const voice = g.audio.createFire ? g.audio.createFire() : null;
      this.combat.fires.push({ x, z, r: w.blastRadius || 3.2, dps: w.burnDps || 22, t: dur, owner: this.owner, voice });
      VH.events.emit('gunshot', { x, z, byPlayer: this.owner === 'player', loud: true });
      this._remove();
    }

    _remove() {
      if (this.done) return;
      this.done = true;
      if (this.voice && this.voice.stop) this.voice.stop();
      this.combat.game.scene.remove(this.mesh);
    }
  }

  // ------------------------------------------------------------- pickups
  const FALLBACK = {};

  /** A plain glowing box for a pickup with no model (built once per kind). */
  function fallbackModel(kind) {
    let f = FALLBACK[kind];
    if (!f) {
      const color = kind === 'health' ? new THREE.Color(0.3, 2.2, 0.7) : kind === 'armor' ? new THREE.Color(0.4, 1.0, 3) : kind === 'cash' ? new THREE.Color(0.4, 2.4, 0.8) : new THREE.Color(2.5, 1.7, 0.4);
      f = FALLBACK[kind] = {
        geo: kind === 'armor' ? new THREE.BoxGeometry(0.34, 0.42, 0.12) : kind === 'health' ? new THREE.BoxGeometry(0.36, 0.26, 0.2) : new THREE.BoxGeometry(0.3, 0.2, 0.2),
        mat: new THREE.MeshStandardMaterial({ color: 0x222222, emissive: color, roughness: 0.4 }),
      };
    }
    return new THREE.Mesh(f.geo, f.mat);
  }

  const RING_MATS = new Map();

  class Pickup {
    constructor(combat, kind, id, amount, x, y, z, respawn) {
      this.combat = combat;
      this.kind = kind; // 'weapon' | 'ammo' | 'health' | 'armor' | 'cash'
      this.id = id;
      this.amount = amount;
      this.pos = new THREE.Vector3(x, y, z);
      this.respawn = respawn || 0;
      this.hiddenT = 0;
      this.enabled = true;
      this.t = Math.random() * 6;
      const g = new THREE.Group();
      const WM = VH.WeaponModels;
      const w = def(id);
      let model = null;
      try {
        if (WM && kind === 'weapon') model = (WM.pickup || WM.build)(id);
        else if (WM && kind === 'ammo' && WM.ammoBox) model = WM.ammoBox(w ? w.slot : 'pistol');
        else if (WM && kind === 'armor' && WM.armorVest) model = WM.armorVest();
        else if (WM && kind === 'health' && WM.medkit) model = WM.medkit();
        else if (WM && kind === 'cash' && WM.cashBundle) model = WM.cashBundle();
      } catch (e) {
        model = null;
      }
      if (!model) model = fallbackModel(kind);
      g.add(model);
      // A glowing ring on the ground in the pickup's colour.
      const col = WM && WM.pickupColor ? WM.pickupColor(kind, w ? w.slot : null) : new THREE.Color(1.8, 1.1, 0.3);
      const key = col.getHexString() + Math.round(col.r * 10) + Math.round(col.g * 10) + Math.round(col.b * 10);
      let ringMat = RING_MATS.get(key);
      if (!ringMat) {
        ringMat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false });
        RING_MATS.set(key, ringMat);
      }
      const ring = new THREE.Mesh(Pickup._ringGeo || (Pickup._ringGeo = new THREE.RingGeometry(0.42, 0.5, 32).rotateX(-Math.PI / 2)), ringMat);
      ring.position.y = -0.55;
      g.add(ring);
      g.position.copy(this.pos);
      this.group = g;
      this.model = model;
      combat.game.scene.add(g);
    }

    update(dt, player) {
      if (this.enabled === false || this.missionItem) return;
      if (this.hiddenT > 0) {
        this.hiddenT -= dt;
        if (this.hiddenT <= 0) this.group.visible = true;
        return;
      }
      this.t += dt;
      this.model.rotation.y += dt * 1.6;
      this.model.position.y = 0.1 + Math.sin(this.t * 2.2) * 0.08;
      if (player.state === 'dead') return;
      // On foot, walk over it; in a car (not a plane or the tank), drive over it slowly.
      let reach = 1.4;
      let base = player.pos;
      if (player.inVehicle) {
        const v = player.vehicle;
        if (v.kind !== 'car' || Math.abs(v.speed) > 10) return;
        reach = 2.4;
        base = v.pos;
      }
      const d = Math.hypot(base.x - this.pos.x, base.z - this.pos.z);
      if (d < reach && Math.abs(base.y + 0.7 - this.pos.y) < 1.8) {
        if (this.combat.collect(this)) {
          VH.events.emit('pickup:collected', { p: this });
          if (this.respawn) {
            this.hiddenT = this.respawn;
            this.group.visible = false;
          } else this.dispose();
        }
      }
    }

    dispose() {
      this.gone = true;
      this.combat.game.scene.remove(this.group);
    }
  }

  // ---------------------------------------------------------- AI brain
  /**
   * An armed enemy. opts: { faction, weapon, alert (bool), guard: {x, z, r},
   * accuracy (0..1), aggression (0..1), target: 'player' | agent }
   */
  class CombatBrain {
    constructor(combat, opts) {
      opts = opts || {};
      this.combat = combat;
      this.weapon = opts.weapon || 'pistol';
      this.alert = !!opts.alert;
      this.guard = opts.guard || null;
      this.accuracy = opts.accuracy === undefined ? 0.5 : opts.accuracy;
      this.aggression = opts.aggression === undefined ? 0.5 : opts.aggression;
      this.state = this.alert ? 'fight' : 'idle';
      this._fireT = 0.6 + Math.random();
      this._burst = 0;
      this._think = Math.random() * 0.3;
      this._cover = null;
      this._peek = 0;
      this._strafe = Math.random() < 0.5 ? 1 : -1;
      this._strafeT = 0;
      this._mag = 0;
      this._reloadT = 0;
      this.onAlert = opts.onAlert || null;
      this.hostile = opts.hostile !== false;
      this.persistentMission = true;
    }

    expired(a) {
      return a.dead && a.deadTime > 40;
    }

    _target() {
      const p = this.combat.game.player;
      return p.inVehicle ? p.vehicle : p;
    }

    update(a, dt) {
      if (a.dead) return;
      const c = this.combat;
      const game = c.game;
      const t = this._target();
      const dx = t.pos.x - a.pos.x;
      const dz = t.pos.z - a.pos.z;
      const d = Math.hypot(dx, dz);
      const w = def(this.weapon) || def('pistol') || { range: 40, fireRate: 3, magSize: 12, reloadTime: 1.5, kind: 'hitscan' };
      if (this.state === 'idle') {
        a.moveSpeed = 0;
        a.anim.aim = 0;
        a.anim.talk = this.chatting ? 1 : 0;
        // Notice Jay: close, in view, or after gunfire / being hurt.
        if ((d < 16 || (d < 32 && c.game.police.canSee(a.pos.x, a.pos.y + 1.6, a.pos.z))) && this.hostile) this.setAlert(a);
        if (game.time - a.hitTime < 0.5) this.setAlert(a);
        return;
      }
      a.anim.talk = 0;
      a.anim.weaponPose = Combat.poseFor(w);
      const face = Math.atan2(dx, dz);
      this._think -= dt;
      if (this._think <= 0) {
        this._think = 0.4 + Math.random() * 0.4;
        this._los = c.game.police.canSee(a.pos.x, a.pos.y + 1.5, a.pos.z);
        this._chooseMove(a, d, w);
      }
      // Hit: a moment to recover before the next shot.
      if (a.flinchT > 0) this._fireT = Math.max(this._fireT, 0.3);
      // Melee fighters just close in.
      if (w.kind === 'melee') {
        a.heading = dampAngle(a.heading, face, 8, dt);
        a.moveSpeed = d > 1.4 ? 4.8 * (a.flinchT > 0 ? 0.3 : 1) : 0;
        a.anim.sprint = d > 4;
        a.anim.aim = 0;
        this._fireT -= dt;
        if (d < 1.6 && this._fireT <= 0) {
          this._fireT = 0.9 + Math.random() * 0.5;
          c.npcMelee(a, t, w);
        }
        return;
      }
      // Move toward the chosen spot (cover, or a firing position).
      let moving = false;
      if (this._goal) {
        const gx = this._goal.x - a.pos.x;
        const gz = this._goal.z - a.pos.z;
        const gd = Math.hypot(gx, gz);
        if (gd > 0.5) {
          moving = true;
          a.heading = dampAngle(a.heading, Math.atan2(gx, gz), 9, dt);
          a.moveSpeed = (gd > 4 ? 4.6 : 2.4) * (a.flinchT > 0 ? 0.3 : 1);
          a.anim.sprint = gd > 4;
        } else {
          a.moveSpeed = 0;
          this._goal = null;
        }
      } else a.moveSpeed = 0;
      // In cover: crouch, pop up to shoot.
      const inCover = this._cover && !moving && Math.hypot(this._cover.x - a.pos.x, this._cover.z - a.pos.z) < 0.8;
      this._peek -= dt;
      if (inCover && this._peek < -2.2) this._peek = 1.4 + Math.random() * 1.2;
      const exposed = !inCover || this._peek > 0;
      a.anim.crouch = inCover && !exposed ? 0.9 : 0;
      if (!moving) a.heading = dampAngle(a.heading, face, 10, dt);
      a.anim.aim = moving && d > 10 ? 0.3 : 1;
      // Reloading.
      if (this._reloadT > 0) {
        this._reloadT -= dt;
        a.anim.aim = 0.2;
        if (this._reloadT <= 0) this._mag = w.magSize || 12;
        return;
      }
      if (this._mag <= 0 && !this._reloadInit) {
        this._reloadInit = true;
        this._mag = w.magSize || 12;
      }
      this._fireT -= dt;
      if (this._fireT <= 0 && exposed && this._los && d < (w.range || 40) * 1.1 && Math.abs(VH.math.angleDelta(a.heading, face)) < 0.5) {
        const auto = w.auto;
        if (auto) {
          if (this._burst <= 0) this._burst = 3 + Math.floor(Math.random() * 4);
          this._burst--;
          this._fireT = this._burst > 0 ? 1 / Math.min(w.fireRate || 8, 12) : 0.7 + Math.random() * 0.9;
        } else this._fireT = Math.max(1 / (w.fireRate || 2), 0.45) + Math.random() * 0.7;
        c.npcFire(a, t, this.weapon, this.accuracy);
        this._mag--;
        if (this._mag <= 0) {
          this._reloadT = w.reloadTime || 1.8;
          this._goal = this._cover ? { x: this._cover.x, z: this._cover.z } : null;
        }
      }
    }

    setAlert(a) {
      if (this.state === 'fight') return;
      this.state = 'fight';
      this._mag = (def(this.weapon) || {}).magSize || 12;
      if (this.onAlert) this.onAlert(a);
      VH.events.emit('combat:alert', { agent: a });
    }

    /** Pick where to be: cover near a good range, or a flank. */
    _chooseMove(a, d, w) {
      const c = this.combat;
      const t = this._target();
      const want = w.slot === 'shotgun' ? 7 : w.slot === 'sniper' ? 40 : w.slot === 'smg' ? 12 : 16;
      if (this._goal && Math.random() < 0.7) return;
      if (this.guard && Math.hypot(a.pos.x - this.guard.x, a.pos.z - this.guard.z) > this.guard.r) {
        this._goal = { x: this.guard.x, z: this.guard.z };
        return;
      }
      // Look for cover: a spot near us where a wall blocks the line to Jay.
      const ph = c.game.physics;
      let best = null;
      let bestScore = Infinity;
      for (let i = 0; i < 10; i++) {
        const ang = (i / 10) * Math.PI * 2 + Math.random() * 0.4;
        const r = 2 + Math.random() * 6;
        const x = a.pos.x + Math.cos(ang) * r;
        const z = a.pos.z + Math.sin(ang) * r;
        if (ph.overlaps(x, z, 0.35, a.pos.y + 0.2, a.pos.y + 1.6)) continue;
        const g = ph.groundHeight(x, z, a.pos.y + 0.5);
        if (Math.abs(g - a.pos.y) > 0.6) continue;
        const dd = Math.hypot(t.pos.x - x, t.pos.z - z);
        const dx = t.pos.x - x;
        const dz = t.pos.z - z;
        const hit = ph.raycast(x, g + 0.8, z, dx / dd, 0, dz / dd, Math.min(dd, 4), { flags: VH.COLLIDE.SHOTS | VH.COLLIDE.SOLID, ground: false });
        const covered = hit && hit.t < 1.6;
        const score = Math.abs(dd - want) * 0.3 + (covered ? 0 : 6) + r * 0.2 + (dd < 4 ? 8 : 0);
        if (score < bestScore) {
          bestScore = score;
          best = { x, z, covered };
        }
      }
      if (best) {
        this._goal = best;
        this._cover = best.covered ? best : null;
      }
    }
  }

  // ------------------------------------------------------------ combat
  class Combat {
    constructor(game) {
      this.game = game;
      this.inventory = {}; // weapon id → { mag }
      this.ammo = {}; //      ammo pool → spare rounds (VH.Data.ammoTypes)
      this.current = 'fists';
      this.lastBySlot = {};
      this.thrown = [];
      this.pickups = [];
      this.fires = []; // burning ground: { x, z, r, dps, t, voice }
      this._cool = 0;
      this._bloom = 0;
      this._reloadT = 0;
      this._reloadFor = null;
      this._reloadLen = 0;
      this._reloadSnd = null;
      this._autoReloadT = 0;
      this._meleeT = 0;
      this._spin = 0; //       minigun barrels, 0..1
      this._spinVoice = null;
      this._kick = 0;
      this._recoil = 0;
      this._gunshotT = 0;
      this._dryToldT = -Infinity;
      this._wasScoped = false;
      this._wheelPad = { lights: false, daytime: false };
      this.playerArmed = false;
      this.hitEvent = null; // 'hit' | 'head' | 'kill' since the HUD last looked
      this.crosshair = { spread: 0, hostile: false, armed: false, pellets: false };
      this._tmp = new THREE.Vector3();
      this._dir = new THREE.Vector3();
      this._muzzleV = new THREE.Vector3();
      this.giveWeapon('fists', 0, true);
      this._attachModel();
      this.wheel = VH.WeaponWheel ? new VH.WeaponWheel(game.hud.root) : null;
      this._bindEvents();
    }

    /** The stance for a weapon: a pistol held out, a long gun at the shoulder, a minigun at the hip. */
    static poseFor(w) {
      if (!w || w.slot === 'unarmed') return null;
      if (w.kind === 'melee') return 'melee';
      if (w.kind === 'thrown') return 'thrown';
      if (w.hold === 'heavy') return 'hip';
      return w.hold === 'pistol' ? 'pistol' : 'rifle';
    }

    _bindEvents() {
      VH.events.on('agent:died', (e) => this._drop(e));
      VH.events.on('vehicle:enter', (e) => this._loot(e.v));
      VH.events.on('vehicle:exit', () => {
        // Back to what Jay was holding before the drive-by.
        if (this._preDriveby && this.inventory[this._preDriveby]) this.select(this._preDriveby);
        this._preDriveby = null;
      });
    }

    // ----------------------------------------------------------- drops
    /** What a fallen enemy leaves behind: their weapon (if Jay hasn't one), ammo, maybe armour or cash. */
    _drop(e) {
      const a = e.agent;
      const wid = a.dropWeapon || (a.faction !== 'civilian' ? a.weapon : null);
      const w = wid && wid !== 'fists' && !a.noDrop ? def(wid) : null;
      const x = a.pos.x;
      const y = a.pos.y + 0.6;
      const z = a.pos.z;
      if (w) {
        if (!this.inventory[w.id] && !(w.ammoType && this._ownsPool(w.ammoType))) {
          // Something new: the weapon itself.
          this.addPickup('weapon', w.id, w.kind === 'melee' ? 0 : Math.max(w.magSize || 1, Math.round((w.startAmmo || 0) * 0.5)), x, y, z, 0, true);
        } else if (w.ammoType) {
          const low = (this.ammo[w.ammoType] || 0) < (w.magSize || 10);
          if (low || Math.random() < 0.85) this.addPickup('ammo', w.id, w.magSize || 10, x, y, z, 0, true);
        }
      }
      if (a.maxArmor > 0 && a.faction !== 'civilian' && Math.random() < 0.3) this.addPickup('armor', null, 25, x - 0.5, y, z + 0.4, 0, true);
      if (a.faction !== 'civilian' && e.source === 'player' && Math.random() < 0.35) this.addPickup('cash', null, 20 + Math.floor(Math.random() * 60), x + 0.5, y, z, 0, true);
    }

    _ownsPool(p) {
      for (const id of Object.keys(this.inventory)) {
        const w = def(id);
        if (w && w.ammoType === p) return true;
      }
      return false;
    }

    /** The first time Jay gets into a police car or an army truck, there's something in the back. */
    _loot(v) {
      const g = this.game;
      if (!v || v._looted || v.missionOwned || g.state !== 'playing') return;
      const list = LOOT[v.type];
      if (!list || !(v.isPolice || v.military)) return;
      v._looted = true;
      if ((this._lootT || -99) > g.playTime - 30) return;
      this._lootT = g.playTime;
      const done = (g.missions && g.missions.completed) || {};
      // Ammo for a gun Jay has, else a gun the shops already sell, else armour.
      for (const [what, n, gun] of list) {
        if (what === 'armor') {
          const p = g.player;
          if (p.armor >= p.maxArmor) continue;
          p.armor = Math.min(p.maxArmor, p.armor + n);
          if (g.audio.armorPickup) g.audio.armorPickup();
          g.hud.showToast('Found in the back: body armour');
          return;
        }
        if (this._ownsPool(what)) {
          const added = this.addAmmo(what, n);
          if (!added) continue;
          if (g.audio.ammoPickup) g.audio.ammoPickup();
          g.hud.showToast('Found in the back: +' + added + ' ' + ((pool(what) || {}).name || 'rounds'));
          return;
        }
      }
      for (const [what, n, gun] of list) {
        const w = gun && def(gun);
        if (!w || this.inventory[gun] || !(VH.Data.weaponUnlocked ? VH.Data.weaponUnlocked(w, done) : true)) continue;
        this.giveWeapon(gun, n);
        g.hud.showToast('Found in the back: ' + w.name);
        return;
      }
    }

    // ------------------------------------------------------- inventory
    /** Spare rounds for a weapon (its ammo pool). */
    reserve(id) {
      const w = def(id);
      return w && w.ammoType ? this.ammo[w.ammoType] || 0 : 0;
    }

    /** { mag, ammo } for the HUD and the wheel. */
    ammoView(id) {
      const inv = this.inventory[id];
      return { mag: inv ? inv.mag : 0, ammo: this.reserve(id) };
    }

    /** Add spare rounds to a pool; returns how many actually fitted. */
    addAmmo(p, n) {
      const t = pool(p);
      if (!t || !(n > 0)) return 0;
      const before = this.ammo[p] || 0;
      this.ammo[p] = Math.min(t.max, before + Math.round(n));
      return this.ammo[p] - before;
    }

    /** Room left in a pool. */
    ammoRoom(p) {
      const t = pool(p);
      return t ? Math.max(0, t.max - (this.ammo[p] || 0)) : 0;
    }

    /**
     * Give a weapon (with `ammo` rounds, or its usual starting amount). A
     * weapon Jay already has just restocks its pool. Returns the rounds added.
     */
    giveWeapon(id, ammo, silent) {
      const w = def(id);
      if (!w && id !== 'fists') return 0;
      const isNew = !this.inventory[id];
      if (isNew) this.inventory[id] = { mag: 0 };
      const inv = this.inventory[id];
      const n = ammo === undefined ? (w && w.startAmmo) || 0 : ammo;
      let added = 0;
      if (w && w.ammoType) {
        added = this.addAmmo(w.ammoType, n);
        if (isNew && w.magSize) {
          const take = Math.min(w.magSize, this.ammo[w.ammoType] || 0);
          inv.mag = take;
          this.ammo[w.ammoType] -= take;
        }
      }
      this.lastAdded = added;
      this.lastNew = isNew;
      if (isNew && !silent && w) this.game.hud.notify({ title: w.name, text: 'Added to your weapon wheel (hold ' + this.game.input.labelFor('weaponWheel') + ').', icon: '✦' });
      if (!silent && this.game.audio.weaponPickup) this.game.audio.weaponPickup();
      else if (!silent && this.game.audio.pickup) this.game.audio.pickup();
      return added;
    }

    has(id) {
      return !!this.inventory[id];
    }

    select(id) {
      if (!this.inventory[id]) return;
      if (this.current === id) return;
      this._cancelReload();
      this.current = id;
      const w = def(id);
      if (w) this.lastBySlot[w.slot] = id;
      // A new weapon is ready almost at once (not after the rocket's long cycle).
      this._cool = clamp(this._cool, 0, 0.25);
      this._bloom = 0;
      this._spin = 0;
      this._attachModel();
      if (this.game.audio.weaponSwitch) this.game.audio.weaponSwitch(id);
      VH.events.emit('weapon:changed', { id });
    }

    _cancelReload() {
      this._reloadT = 0;
      this._reloadFor = null;
      this._autoReloadT = 0;
      this.game.player.reloadPhase = 0;
      if (this._reloadSnd && this._reloadSnd.stop) this._reloadSnd.stop();
      this._reloadSnd = null;
    }

    get weapon() {
      return def(this.current) || { id: 'fists', name: 'Fists', slot: 'unarmed', kind: 'melee', damage: 10, range: 1.4, fireRate: 2.2 };
    }

    _attachModel() {
      const p = this.game.player;
      const hand = p.model.joints.elbowR;
      if (this._model) {
        this._model.parent && this._model.parent.remove(this._model);
        this._model = null;
      }
      this._flash = null;
      this._round = [];
      const w = this.weapon;
      // The stun gun doesn't count as armed (the police don't open fire over it).
      this.playerArmed = w.kind !== 'melee' && w.slot !== 'unarmed' && !w.stun;
      if (w.slot === 'unarmed' || !VH.WeaponModels) return;
      const m = VH.WeaponModels.build(w.id);
      if (!m) return;
      // The hand sits at the end of the forearm (y ≈ -0.3), fingers toward +Z.
      // Barrel (+Z) along the forearm (-Y of the hand), top of the gun facing forward.
      m.position.set(0, -0.31, 0.03);
      m.rotation.set(Math.PI / 2, 0, 0);
      m.traverse((o) => {
        if (o.isMesh) o.castShadow = !(o.material && o.material.name === 'weapon-glass');
      });
      hand.add(m);
      this._model = m;
      this._rest = { y: m.position.y, z: m.position.z, rx: m.rotation.x };
      // Long guns are carried muzzle down and forward, and come up to aim.
      this._carry = w.kind !== 'melee' && w.kind !== 'thrown' && w.hold !== 'pistol' ? -1.05 : 0;
      // The minigun's barrel cluster (its chrome mesh) spins round its own axis.
      this._spinPivot = null;
      const barrels = w.spinUp ? m.getObjectByName(w.id + ':chrome') : null;
      if (barrels) {
        const c = m.userData.barrels || m.userData.muzzle;
        const pivot = new THREE.Group();
        pivot.position.set(c.x, c.y, 0);
        m.remove(barrels);
        barrels.position.set(-c.x, -c.y, 0);
        pivot.add(barrels);
        m.add(pivot);
        this._spinPivot = pivot;
      }
      // A launcher's loaded round (meshes named '<id>:<material>@round').
      for (const o of m.children) if (o.isMesh && o.name.endsWith('@round')) this._round.push(o);
      this._flash = VH.WeaponModels.muzzleFlash ? VH.WeaponModels.muzzleFlash() : null;
      if (this._flash) {
        this._flash.visible = false;
        this._flash.position.copy(m.userData.muzzle || new THREE.Vector3(0, 0.05, 0.25));
        m.add(this._flash);
      }
    }

    /** Wheel state for the UI (see ui-wheel.js for the shape). */
    wheelState() {
      const g = this.game;
      const done = (g.missions && g.missions.completed) || {};
      const p = g.player;
      const slots = [];
      const order = slotOrder();
      for (const slot of order) {
        const weapons = weaponList().filter((w) => w.slot === slot).map((w) => {
          const inv = this.inventory[w.id];
          const unlocked = VH.Data.weaponUnlocked ? VH.Data.weaponUnlocked(w, done) : true;
          const need = w.shopAfter ? (Array.isArray(w.shopAfter) ? w.shopAfter[0] : w.shopAfter) : null;
          const job = need && g.missions && g.missions.all && g.missions.all.get(need);
          return {
            id: w.id,
            name: w.name,
            ammo: inv ? this.reserve(w.id) : 0,
            mag: inv ? inv.mag : 0,
            owned: !!inv,
            price: w.price || 0,
            locked: !inv,
            unlock: inv ? '' : unlocked ? (w.price ? 'Bayline Arms · ' + VH.util.formatMoney(w.price) : '') : job ? "After '" + job.title + "'" : 'Later in the story',
            driveby: !!w.drivebyAllowed,
          };
        });
        if (slot === 'unarmed' && !weapons.length) weapons.push({ id: 'fists', name: 'Fists', ammo: 0, mag: 0, owned: true });
        const owned = weapons.filter((w) => w.owned);
        const want = (def(this.current) || {}).slot === slot ? this.current : this.lastBySlot[slot];
        const cur = Math.max(0, owned.findIndex((w) => w.id === want));
        slots.push({ slot, weapons: owned.length ? owned.concat(weapons.filter((w) => !w.owned)) : weapons, current: cur });
      }
      const keys = order.map((s, i) => g.input.labelFor('weapon' + (i + 1)) || String(i + 1));
      return { slots, selected: this.weapon.slot, keys, gamepad: g.input.lastDevice === 'gamepad', inVehicle: !!p.inVehicle };
    }

    addPickup(kind, id, amount, x, y, z, respawn, dropped) {
      const p = new Pickup(this, kind, id, amount, x, y, z, respawn);
      if (dropped) p.expires = 45;
      this.pickups.push(p);
      return p;
    }

    /** Jay touches a pickup: false leaves it there (full up, or nothing to put it in). */
    collect(p) {
      const g = this.game;
      const pl = g.player;
      const a = g.audio;
      if (p.kind === 'health') {
        if (pl.health >= pl.maxHealth) return false;
        pl.heal(p.amount || 50);
        if (a.healthPickup) a.healthPickup();
        else if (a.pickup) a.pickup();
        return true;
      }
      if (p.kind === 'armor') {
        if (pl.armor >= pl.maxArmor) return false;
        pl.armor = Math.min(pl.maxArmor, pl.armor + (p.amount || 50));
        if (a.armorPickup) a.armorPickup();
        else if (a.pickup) a.pickup();
        g.hud.showToast('+' + (p.amount || 50) + ' armour');
        return true;
      }
      if (p.kind === 'cash') {
        g.giveMoney(p.amount || 50, 'pickup');
        if (a.cash) a.cash();
        return true;
      }
      const w = def(p.id);
      if (!w) return false;
      if (p.kind === 'weapon') {
        if (this.inventory[w.id] && (!w.ammoType || !this.ammoRoom(w.ammoType))) return false;
        const isNew = !this.inventory[w.id];
        const added = this.giveWeapon(w.id, p.amount === undefined ? undefined : p.amount, !isNew);
        if (!isNew) {
          if (a.ammoPickup) a.ammoPickup();
          g.hud.showToast('+' + added + ' ' + ((pool(w.ammoType) || {}).name || 'rounds'));
        }
        return true;
      }
      if (p.kind === 'ammo') {
        if (!w.ammoType) return false;
        // Ammo for a gun Jay hasn't got: it comes with the gun.
        if (!this._ownsPool(w.ammoType)) {
          this.giveWeapon(w.id, p.amount);
          return true;
        }
        const added = this.addAmmo(w.ammoType, p.amount || w.magSize || 10);
        if (!added) return false;
        if (a.ammoPickup) a.ammoPickup();
        else if (a.pickup) a.pickup();
        g.hud.showToast('+' + added + ' ' + ((pool(w.ammoType) || {}).name || 'rounds'));
        return true;
      }
      return false;
    }

    // ------------------------------------------------------------ helpers
    pan(x, z) {
      return this.game.vehicleFeedback._pan(x, z);
    }

    gain(x, z, ref) {
      return this.game.vehicleFeedback._gain(x, z, ref);
    }

    _surface(col) {
      if (!col) return 'concrete';
      const t = col.tag;
      if (t === 'prop' || t === 'container' || t === 'metal' || t === 'beam' || t === 'sign') return 'metal';
      if (t === 'crate' || t === 'boardwalk' || t === 'pier' || t === 'plank' || t === 'scaffold') return 'wood';
      if (t === 'glass' || t === 'window') return 'glass';
      return 'concrete';
    }

    /** Area damage (grenades, explosions) to Jay (people and cars: vehicleFeedback.explosion). */
    blastDamage(x, y, z, radius, damage, owner) {
      const g = this.game;
      const p = g.player;
      if (!p.inVehicle) {
        const d = Math.hypot(p.pos.x - x, p.pos.y + 0.9 - y, p.pos.z - z);
        if (d < radius) {
          const k = 1 - d / radius;
          p.vel.x += ((p.pos.x - x) / (d || 1)) * 8 * k;
          p.vel.z += ((p.pos.z - z) / (d || 1)) * 8 * k;
          p.vel.y = 4 * k;
          let dmg = damage * k * 0.7;
          // Jay's own rocket at his feet hurts but (below Hard) doesn't kill him outright.
          if (owner === 'player' && g.settings.get('gameplay.difficulty') !== 'hard') dmg = Math.min(dmg, 90);
          p.knock(dmg, 'blast');
        }
      }
    }

    // ------------------------------------------------------------ frame
    update(dt) {
      const g = this.game;
      const inp = g.input;
      const p = g.player;
      this._cool -= dt;
      this._gunshotT -= dt;
      this._bloom = Math.max(0, this._bloom - dt * 2.2);
      const w = this.weapon;
      const firingHeld = inp.down('fire');
      // Aim recoil settles back at the weapon's own pace (slower while the trigger is held: an automatic climbs).
      if (this._kick > 0) {
        const rate = (w.recoilRecover || 0.12) * (firingHeld && w.auto ? 0.35 : 1) + this._kick * 6;
        const back = Math.min(this._kick, dt * rate);
        g.cameraRig.pitch -= back;
        this._kick -= back;
      }

      this._updateWheel(dt);

      // Thrown things, fires, pickups.
      for (const t of this.thrown) t.update(dt);
      this.thrown = this.thrown.filter((t) => !t.done);
      this._updateFires(dt);
      for (const pk of this.pickups) {
        pk.update(dt, p);
        if (pk.expires !== undefined) {
          pk.expires -= dt;
          if (pk.expires <= 0) pk.dispose();
        }
      }
      this.pickups = this.pickups.filter((pk) => !pk.gone);

      if (this._flash && this._flash.userData.update) this._flash.userData.update(dt);
      else if (this._flash && this._flashT > 0) {
        this._flashT -= dt;
        this._flash.visible = this._flashT > 0;
      }
      if (this._recoil > 0) this._recoil = Math.max(0, this._recoil - dt * 12);
      this._poseModel(dt);

      // Reloading.
      if (this._autoReloadT > 0) {
        this._autoReloadT -= dt;
        if (this._autoReloadT <= 0) this.reload();
      }
      if (this._reloadT > 0) {
        this._reloadT -= dt;
        p.reloadPhase = this._reloadLen ? 1 - Math.max(0, this._reloadT) / this._reloadLen : 0;
        if (this._reloadT <= 0) this._finishReload();
      } else p.reloadPhase = 0;
      if (this._round && this._round.length) {
        const loaded = (this.inventory[w.id] || {}).mag > 0 || (this._reloadT > 0 && p.reloadPhase > 0.45);
        for (const o of this._round) o.visible = loaded;
      }

      // The minigun's barrels: spin up while the trigger is held, run down after.
      if (w.spinUp) {
        const want = firingHeld && g.state === 'playing' && !p.inVehicle && (this.inventory[w.id] || {}).mag > 0;
        this._spin = clamp(this._spin + (want ? dt / w.spinUp : -dt / (w.spinUp * 1.8)), 0, 1);
        if (this._spinPivot) this._spinPivot.rotation.z += dt * this._spin * 40;
        if (g.audio.minigun && !this._spinVoice && this._spin > 0) this._spinVoice = g.audio.minigun();
      } else this._spin = 0;
      if (this._spinVoice) {
        this._spinVoice.update({ spin: this._spin, firing: this._spin >= 1 && firingHeld && this._minigunFiring, gain: 1, pan: 0 });
        if (this._spin <= 0) {
          this._spinVoice.stop();
          this._spinVoice = null;
        }
      }
      this._minigunFiring = false;

      // Heavy weapons slow Jay down; the minigun more so while it runs.
      p.carrySlow = clamp(1 - (w.moveMult || 1) + (w.spinUp && this._spin > 0.2 ? 0.2 : 0), 0, 0.7);

      // Aim zoom and the scope (camera.js reads these).
      p.aimZoom = w.zoom && w.zoom < 1 ? w.zoom : 0.85;
      const scoped = !p.inVehicle && w.zoom < 0.5 && p.aiming && p.aimAmount > 0.8 && !!this.inventory[w.id];
      if (scoped !== this._wasScoped) {
        this._wasScoped = scoped;
        if (g.audio.scope) g.audio.scope(scoped);
      }
      p.scoped = scoped;
      this._updateCrosshair(w, p);

      if (g.state !== 'playing' || p.state === 'dead' || p.state === 'knocked' || p.frozen || (this.wheel && this.wheel.isOpen)) {
        inp.discard('fire');
        if (this._cool < 0) this._cool = 0;
        return;
      }
      // Weapon in hand is hidden while driving; the pose follows the weapon.
      if (this._model) this._model.visible = !p.inVehicle || p.aiming;
      p.weaponPose = Combat.poseFor(w);

      // R: reload, or set off the limpet charges.
      const charges = this.thrown.filter((t) => t.stuck);
      if (inp.consume('reload')) {
        const canReload = w.magSize && (this.inventory[w.id] || {}).mag < w.magSize && this.reserve(w.id) > 0;
        if (charges.length && (w.sticky || !canReload || (p.inVehicle && !p.aiming))) this.detonate();
        else if (!p.inVehicle || p.aiming) this.reload();
      }
      const pressed = inp.consume('fire');
      if (p.inVehicle) {
        const v = p.vehicle;
        g.cameraRig._driveby = false;
        // A tank's cannon, a jet's guns: the vehicle has its own weapons.
        if (v.fireWeapon) {
          p.aiming = false;
          if (this._cool < 0) this._cool = 0;
          v.fireWeapon(this, inp, firingHeld, pressed, dt);
          return;
        }
        // Drive-by: aim with the right mouse button. Holding something that
        // can't go out of a window swaps to the best gun that can.
        if (inp.down('aim') && !w.drivebyAllowed) this._drivebySwap();
        const dw = this.weapon;
        p.aiming = inp.down('aim') && dw.drivebyAllowed;
        g.cameraRig._driveby = p.aiming;
        if (p.aiming) this._fireLoop(dw, pressed, firingHeld, true);
        else if (this._cool < 0) this._cool = 0;
        return;
      }
      if (w.kind === 'thrown') {
        if (pressed && this._cool <= 0) this._throw(w);
        if (this._cool < 0) this._cool = 0;
        return;
      }
      if (w.kind === 'melee' || w.slot === 'unarmed') {
        if (pressed && this._meleeT <= 0) this._melee(w);
        this._meleeT -= dt;
        if (this._cool < 0) this._cool = 0;
        return;
      }
      if (w.spinUp && this._spin < 1) {
        if (this._cool < 0) this._cool = 0;
        if (pressed || firingHeld) p._fireFaceT = 0.6;
        // Empty: click and reload rather than sit there with nothing happening.
        if (pressed && !((this.inventory[w.id] || {}).mag > 0)) this._dry(w);
        return;
      }
      this._fireLoop(w, pressed, firingHeld, false);
    }

    /**
     * Fire as the weapon allows. The cooldown carries over between frames
     * (an automatic fires at its real rate at any frame rate, up to three
     * rounds in one frame); a semi-automatic fires once per press.
     */
    _fireLoop(w, pressed, held, driveby) {
      if (!(pressed || (held && w.auto))) {
        if (this._cool < 0) this._cool = 0;
        return;
      }
      if (this._cool > 0) return;
      if (!w.auto) this._cool = 0;
      let n = 0;
      while (this._cool <= 0 && n < (w.auto ? 3 : 1)) {
        if (!this._fire(w, driveby)) break;
        n++;
      }
    }

    /** One shot of whatever is in hand. False if it couldn't fire (empty, reloading). */
    _fire(w, driveby) {
      if (w.kind === 'projectile') return this._fireProjectile(w);
      return this._fireHitscan(w, driveby);
    }

    /** Wheel input: hold to open, mouse or stick to point, wheel or D-pad to cycle, release to pick; digits pick slots. */
    _updateWheel() {
      const g = this.game;
      const inp = g.input;
      const p = g.player;
      if (this.wheel) {
        const holding = inp.down('weaponWheel') && g.state === 'playing' && p.state !== 'dead';
        if (holding && !this.wheel.isOpen) {
          this.wheel.open(this.wheelState());
          g.slowmo(9999, 0.25);
          this._wheelSlow = true;
          this._wheelPad.lights = this._wheelPad.daytime = true; // ignore a press already held
        } else if (this.wheel.isOpen) {
          if (holding) {
            // The camera ignores the mouse while the wheel is open; the wheel gets it.
            const md = inp.takeMouseDelta();
            if (md.x || md.y) this.wheel.move(md.x, md.y);
            const wheelNotches = inp.takeWheel();
            if (wheelNotches) this.wheel.cycle(Math.sign(wheelNotches));
            const pad = inp.pad;
            if (pad && pad.connected) {
              if (Math.abs(pad.look.x) > 0.3 || Math.abs(pad.look.y) > 0.3) this.wheel.stick(pad.look.x, pad.look.y);
              // D-pad left / right: the previous / next weapon in the slot.
              for (const [act, dir] of [['lights', -1], ['daytime', 1]]) {
                const down = pad.down.has(act);
                if (down && !this._wheelPad[act]) this.wheel.cycle(dir);
                this._wheelPad[act] = down;
              }
              inp.discard('lights');
              inp.discard('daytime');
            }
          } else {
            const pick = this.wheel.close();
            if (this._wheelSlow) {
              g._slowT = 0;
              this._wheelSlow = false;
            }
            inp.discard('lights');
            inp.discard('daytime');
            if (pick && pick.weaponId) this.select(pick.weaponId);
          }
        }
      }
      const order = slotOrder();
      for (let i = 1; i <= order.length; i++) {
        if (inp.consume('weapon' + i)) {
          const slot = order[i - 1];
          const owned = weaponList().filter((w) => w.slot === slot && this.inventory[w.id]);
          if (slot === 'unarmed') this.select('fists');
          else if (owned.length) {
            const curIdx = owned.findIndex((w) => w.id === this.current);
            this.select(owned[(curIdx + 1) % owned.length].id);
          }
        }
      }
    }

    /** The gun in Jay's hand: carried low, up to aim, kicking back on each shot. */
    _poseModel() {
      const m = this._model;
      if (!m || !this._rest) return;
      const p = this.game.player;
      const up = Math.max(p.aimAmount, p._fireFaceT > 0 ? 0.9 : 0, p.inVehicle ? 1 : 0);
      const r = this._recoil;
      m.rotation.x = this._rest.rx + this._carry * (1 - up) - r * 0.18;
      m.position.y = this._rest.y + r * 0.045;
      m.position.z = this._rest.z;
    }

    /** What the crosshair should show (hud.js): spread in radians, an enemy under it. */
    _updateCrosshair(w, p) {
      const g = this.game;
      const c = this.crosshair;
      c.armed = this.playerArmed || !!w.stun || w.kind === 'projectile';
      c.pellets = (w.pellets || 1) > 1;
      c.spread = this._spreadFor(w, p.aiming, false);
      c.scoped = !!p.scoped;
      c.reload = this._reloadT > 0 && this._reloadLen ? 1 - this._reloadT / this._reloadLen : 0;
      c.charges = this.thrown.filter((t) => t.stuck).length;
      c.spin = w.spinUp ? this._spin : 0;
      // Red over a hostile: one ray a frame while armed.
      c.hostile = false;
      if (c.armed && !p.inVehicle && (p.aimAmount > 0.5 || p._fireFaceT > 0)) {
        const cam = g.renderer.camera;
        const d = this._dir.set(0, 0, -1).applyQuaternion(g.cameraRig.aimQuaternion || cam.quaternion);
        const h = g.crowd.raycast(cam.position.x, cam.position.y, cam.position.z, d.x, d.y, d.z, w.range || 60);
        c.hostile = !!(h && !h.agent.dead && ((h.agent.brain && h.agent.brain.hostile) || h.agent.faction === 'vpd' || h.agent.faction === 'army'));
      }
    }

    /** The cone a shot may stray within (radians). */
    _spreadFor(w, aiming, driveby) {
      if ((w.pellets || 1) > 1) return (aiming ? 0.04 : 0.055) * (w.id === 'sawnoff' ? 1.6 : 1) + (driveby ? 0.01 : 0);
      if (w.auto) return (aiming ? 0.005 : 0.01) + this._bloom * (aiming ? 0.008 : 0.014) + (driveby ? 0.008 : 0) + (w.spinUp ? 0.02 : 0);
      const p = this.game.player;
      let s = aiming ? 0 : w.hipSpread || 0;
      if (!aiming && (p.sprinting || !p.grounded)) s += 0.01;
      return s + (driveby ? 0.006 : 0);
    }

    reload() {
      const w = this.weapon;
      const inv = this.inventory[w.id];
      this._autoReloadT = 0;
      if (!inv || !w.magSize || inv.mag >= w.magSize || this.reserve(w.id) <= 0 || this._reloadT > 0) return;
      // A pump shotgun loads shell by shell (and firing stops it); the rest swap a magazine.
      const shells = w.shellReload && w.shellTime;
      this._reloadShell = !!shells;
      this._reloadT = shells ? w.shellTime + 0.25 : w.reloadTime || 1.5;
      this._reloadLen = this._reloadT;
      this._reloadFor = w.id;
      const a = this.game.audio;
      if (shells && a.shellIn) a.shellIn(w.id);
      else if (a.reload) this._reloadSnd = a.reload(w.id);
    }

    _finishReload() {
      const w = def(this._reloadFor);
      const inv = w && this.inventory[w.id];
      this._reloadSnd = null;
      if (!inv || !w.ammoType) return;
      const spare = this.ammo[w.ammoType] || 0;
      const take = Math.min(this._reloadShell ? 1 : w.magSize - inv.mag, spare, w.magSize - inv.mag);
      inv.mag += take;
      this.ammo[w.ammoType] = spare - take;
      // Another shell, until it's full.
      if (this._reloadShell && inv.mag < w.magSize && this.ammo[w.ammoType] > 0 && this.current === w.id) {
        this._reloadT = w.shellTime;
        this._reloadLen = w.shellTime;
        if (this.game.audio.shellIn) this.game.audio.shellIn(w.id);
      } else if (this._reloadShell && this.game.audio.rack) this.game.audio.rack(w.id);
    }

    get wheelOpen() {
      return !!(this.wheel && this.wheel.isOpen);
    }

    get reloading() {
      return this._reloadT > 0;
    }

    /** 0..1 through the current reload (0 when not reloading). */
    get reloadProgress() {
      return this._reloadT > 0 && this._reloadLen ? 1 - this._reloadT / this._reloadLen : 0;
    }

    /** The aim ray: from the camera through the crosshair (without the gun's visual kick). */
    _aimRay(spread, noAssist) {
      const cam = this.game.renderer.camera;
      const q = this.game.cameraRig.aimQuaternion || cam.quaternion;
      const dir = this._dir.set(0, 0, -1).applyQuaternion(q);
      if (!noAssist) this._aimAssist(dir, cam.position);
      if (spread > 0) {
        const r = Math.sqrt(Math.random()) * spread;
        const a = Math.random() * Math.PI * 2;
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(q);
        dir.addScaledVector(right, Math.cos(a) * r).addScaledVector(up, Math.sin(a) * r).normalize();
      }
      return { o: cam.position, d: dir };
    }

    /**
     * Aim assist (Settings → Gameplay): a shot that only just misses a hostile
     * is bent onto their chest. The cone is wider on a controller.
     */
    _aimAssist(dir, origin) {
      const g = this.game;
      if (!g.settings.get('gameplay.aimAssist')) return;
      // Already on someone: shoot exactly there (a head stays a headshot).
      if (g.crowd.raycast(origin.x, origin.y, origin.z, dir.x, dir.y, dir.z, 90)) return;
      const pad = g.input.lastDevice === 'gamepad';
      let cone = (pad ? 0.1 : 0.04) * (g.player.inVehicle ? 1.5 : 1);
      let best = null;
      for (const a of g.crowd.agents) {
        if (a.dead || a.hidden || !a.brain || !a.brain.hostile) continue;
        const tx = a.pos.x - origin.x;
        const ty = a.pos.y + 1.2 - origin.y;
        const tz = a.pos.z - origin.z;
        const d = Math.hypot(tx, ty, tz);
        if (d < 2 || d > 70) continue;
        const ang = Math.acos(clamp((tx * dir.x + ty * dir.y + tz * dir.z) / d, -1, 1));
        if (ang < cone) {
          cone = ang;
          best = [tx / d, ty / d, tz / d];
        }
      }
      if (best) {
        const k = pad ? 0.85 : 0.6;
        dir.set(dir.x + (best[0] - dir.x) * k, dir.y + (best[1] - dir.y) * k, dir.z + (best[2] - dir.z) * k).normalize();
      }
    }

    /** First thing a ray hits: a person, a car, or the city. */
    trace(ox, oy, oz, dx, dy, dz, range, ignoreAgent, ignoreVehicle) {
      const g = this.game;
      let best = { t: range, type: 'none' };
      const hw = g.physics.raycast(ox, oy, oz, dx, dy, dz, range, { flags: VH.COLLIDE.SHOTS | VH.COLLIDE.CAMERA, ground: true });
      if (hw) best = { t: hw.t, type: 'world', hit: hw };
      const ha = g.crowd.raycast(ox, oy, oz, dx, dy, dz, best.t, ignoreAgent);
      if (ha) best = { t: ha.t, type: 'agent', agent: ha.agent, head: ha.head };
      for (const v of g.vehicles.list) {
        if (v === ignoreVehicle) continue;
        const t = Combat.rayCar(v, ox, oy, oz, dx, dy, dz, best.t);
        if (t >= 0 && t < best.t) best = { t, type: 'car', v };
      }
      return best;
    }

    static rayCar(v, ox, oy, oz, dx, dy, dz, maxT) {
      // Ray vs the car's oriented box.
      const c = Math.cos(v.yaw);
      const s = Math.sin(v.yaw);
      const rx = ox - v.pos.x;
      const rz = oz - v.pos.z;
      const lox = rx * c - rz * s;
      const loz = rx * s + rz * c;
      const ldx = dx * c - dz * s;
      const ldz = dx * s + dz * c;
      let t0 = 0;
      let t1 = maxT;
      const slab = (o, d, lo, hi) => {
        if (Math.abs(d) < 1e-9) return o >= lo && o <= hi;
        let a = (lo - o) / d;
        let b = (hi - o) / d;
        if (a > b) [a, b] = [b, a];
        t0 = Math.max(t0, a);
        t1 = Math.min(t1, b);
        return t0 <= t1;
      };
      if (!slab(lox, ldx, -v.hx, v.hx)) return -1;
      if (!slab(oy, dy, v.pos.y + 0.2, v.pos.y + v.height)) return -1;
      if (!slab(loz, ldz, -v.hz, v.hz)) return -1;
      return t0;
    }

    /** Empty magazine: reload, or say so and change to something with ammo. */
    _dry(w) {
      const g = this.game;
      if (this.reserve(w.id) > 0) {
        this.reload();
        return;
      }
      if (g.audio.dryFire) g.audio.dryFire();
      this._cool = 0.3;
      if (g.playTime - this._dryToldT > 20) {
        this._dryToldT = g.playTime;
        g.hud.showToast('Out of ' + ((pool(w.ammoType) || {}).name || 'ammo') + ': Bayline Arms sells more (gun on the map)');
      }
      this._switchToLoaded();
    }

    /** The next weapon down the wheel that has rounds in it (or fists). */
    _switchToLoaded() {
      const order = slotOrder();
      const from = order.indexOf(this.weapon.slot);
      for (let k = 1; k <= order.length; k++) {
        const slot = order[(from - k + order.length * 2) % order.length];
        for (const w of weaponList()) {
          if (w.slot !== slot || !this.inventory[w.id] || w.kind === 'thrown') continue;
          if (w.kind === 'melee' || this.inventory[w.id].mag > 0 || this.reserve(w.id) > 0) {
            this.select(w.id);
            return;
          }
        }
      }
      this.select('fists');
    }

    /** In a car with a gun that can't fire out of the window: take the best one that can. */
    _drivebySwap() {
      for (const id of DRIVEBY) {
        const w = def(id);
        if (!w || !this.inventory[id] || !w.drivebyAllowed) continue;
        if (this.inventory[id].mag + this.reserve(id) <= 0) continue;
        if (!this._preDriveby) this._preDriveby = this.current;
        this.select(id);
        return;
      }
      if (!this._toldDriveby) {
        this._toldDriveby = true;
        this.game.hud.showToast('Pistols, the Wasp and the sawn-off fire out of a car window');
      }
    }

    /** The shot's sound, the gunshot event (heard by people and the police, a few times a second at most), the kick. */
    _afterShot(w, muzzle) {
      const g = this.game;
      const p = g.player;
      if (this._flash && this._flash.userData.pop) this._flash.userData.pop(this._model ? this._model.userData.flashScale : w.flash || 1, 0.05);
      else if (this._flash) {
        this._flash.visible = true;
        this._flashT = 0.045;
      }
      g.fx.muzzle(muzzle.x, muzzle.y, muzzle.z, (w.pellets || 1) > 1 || w.slot === 'rifle' || w.slot === 'sniper' || w.slot === 'heavy', w.flash || 1);
      if (w.spinUp) {
        this._minigunFiring = true;
        this._spinShots = (this._spinShots || 0) + 1;
        if (this._spinShots % 6 === 0 && g.audio.gunshot) g.audio.gunshot(w.id, 0, 0.45, false, { noMech: true });
      } else if (w.stun) {
        if (g.audio.taser) g.audio.taser(0, 1);
      } else if (w.kind === 'projectile') {
        if (w.projectile && w.projectile.model === 'rocket' && g.audio.rocketLaunch) g.audio.rocketLaunch(0, 1);
        else if (g.audio.glLaunch) g.audio.glLaunch(0, 1);
        else if (g.audio.gunshot) g.audio.gunshot(w.id, 0, 1, false);
      } else if (g.audio.gunshot) g.audio.gunshot(w.id, 0, 1, false);
      // The aim climbs a little (and settles back); the view kicks harder but only for the eyes.
      const rec = (w.recoil || 0.02) * (p.aiming ? 0.5 : 0.7) * (w.auto ? 0.6 : 1);
      g.cameraRig.pitch += rec;
      this._kick += rec;
      if (w.auto) g.cameraRig.yaw += (Math.random() - 0.5) * rec * 0.5;
      const kv = w.kickVis || 0.02;
      g.cameraRig.kick(kv, (Math.random() - 0.5) * kv * 0.6, w.fovPunch || 0);
      g.cameraRig.addShake((w.shake || 0.08) * 0.9);
      this._recoil = 1;
      p._recoil = 1;
      if (!p.aiming && !p.inVehicle) p._fireFaceT = 0.8;
      // Spent cases out of the right side.
      const eject = this._model && this._model.userData.eject;
      if (eject && !p.inVehicle) {
        const e = this._muzzleV.copy(eject);
        this._model.localToWorld(e);
        const yaw = p.heading;
        const rx = -Math.cos(yaw);
        const rz = Math.sin(yaw);
        g.fx.casing(e.x, e.y, e.z, rx * 2 + (Math.random() - 0.5), 1.6 + Math.random(), rz * 2 + (Math.random() - 0.5), (w.pellets || 1) > 1);
      }
      // Heard by everyone round about, but only a few times a second (a minigun is not a riot of reports).
      if (!w.stun && this._gunshotT <= 0) {
        this._gunshotT = 0.25;
        VH.events.emit('gunshot', { x: p.pos.x, z: p.pos.z, byPlayer: true, loud: w.slot !== 'pistol' || w.id === 'revolver' });
      }
    }

    /** Hit feedback for the HUD: the strongest of a hit, a headshot and a kill. */
    /** A hit marker: 'hit' | 'head' | 'kill' (head: it was a headshot, even one that killed). */
    _hit(kind, head) {
      const rank = { hit: 1, head: 2, kill: 3 };
      if (!this.hitEvent || rank[kind] > rank[this.hitEvent]) this.hitEvent = kind;
      VH.events.emit('combat:hit', { kind, head: !!head || kind === 'head' });
    }

    _fireHitscan(w, driveby) {
      const g = this.game;
      const inv = this.inventory[w.id];
      if (!inv) return false;
      if (this._reloadT > 0) {
        // A shell-by-shell reload stops as soon as there's one in to fire.
        if (this._reloadShell && inv.mag > 0) this._cancelReload();
        else return false;
      }
      if (inv.mag <= 0) {
        this._dry(w);
        return false;
      }
      inv.mag--;
      this._cool += 1 / (w.fireRate || 3);
      const p = g.player;
      // Where the bullets go: dead centre when aimed, a little off from the hip
      // or on the run, the automatics bloom, a shotgun's pellets spread round.
      const spread = this._spreadFor(w, p.aiming, driveby);
      if (w.auto) this._bloom = Math.min(1, this._bloom + 0.2);
      const pellets = w.pellets || 1;
      const muzzle = this._muzzleWorld().clone();
      // Damage is totalled per person, so a shotgun blast is one hit, not nine.
      const struck = new Map();
      const cars = new Map();
      for (let i = 0; i < pellets; i++) {
        const ray = this._aimRay(spread);
        // Skip past Jay himself: start the trace near him along the camera ray.
        const cam = ray.o;
        const tStart = Math.max(0, (new THREE.Vector3().subVectors(p.renderPos, cam)).dot(ray.d) - 0.2);
        const ox = cam.x + ray.d.x * tStart;
        const oy = cam.y + ray.d.y * tStart;
        const oz = cam.z + ray.d.z * tStart;
        const range = w.range || 60;
        const hit = this.trace(ox, oy, oz, ray.d.x, ray.d.y, ray.d.z, range, null, p.vehicle);
        VH.events.emit('combat:ray', { ox, oy, oz, dx: ray.d.x, dy: ray.d.y, dz: ray.d.z, dist: hit.t }); // what the bullet passed (holdup.js: the shop camera)
        const hx = ox + ray.d.x * hit.t;
        const hy = oy + ray.d.y * hit.t;
        const hz = oz + ray.d.z * hit.t;
        if (w.stun) g.fx.tracer(muzzle.x, muzzle.y, muzzle.z, hx, hy, hz, { width: 0.006, color: [1.2, 2.2, 6], speed: 90, tail: 30 });
        else if (w.tracer !== false && (i === 0 || (pellets > 1 && Math.random() < 0.3))) g.fx.tracer(muzzle.x, muzzle.y, muzzle.z, hx, hy, hz, { width: w.slot === 'sniper' ? 0.05 : w.spinUp || w.slot === 'rifle' ? 0.035 : 0.028 });
        const dmgAt = (head) => (VH.Data.weaponDamage ? VH.Data.weaponDamage(w, hit.t, head) : (w.damage || 25) * (head ? w.headshotMult || 2.5 : 1));
        if (hit.type === 'agent') {
          const a = hit.agent;
          let s = struck.get(a);
          if (!s) struck.set(a, (s = { dmg: 0, head: false, n: 0, x: hx, y: hy, z: hz, d: ray.d.clone(), t: hit.t }));
          s.dmg += dmgAt(hit.head);
          s.head = s.head || hit.head;
          s.n++;
        } else if (hit.type === 'car') {
          let s = cars.get(hit.v);
          if (!s) cars.set(hit.v, (s = { dmg: 0, x: hx, y: hy, z: hz, d: ray.d.clone() }));
          s.dmg += dmgAt(false) * 0.45;
        } else if (hit.type === 'world') {
          const surf = this._surface(hit.hit.collider);
          g.fx.impact(hx, hy, hz, hit.hit.nx, hit.hit.ny, hit.hit.nz, surf);
          if (!w.stun && (i === 0 || Math.random() < 0.35)) g.fx.bulletHole(hx, hy, hz, hit.hit.nx, hit.hit.ny, hit.hit.nz, pellets > 1 ? 0.07 : w.slot === 'sniper' || w.slot === 'heavy' ? 0.16 : 0.11);
          if (g.audio.bulletImpact && i === 0) g.audio.bulletImpact(surf, this.pan(hx, hz), this.gain(hx, hz, 10));
          if (i === 0 && (surf === 'metal' || surf === 'concrete') && Math.random() < 0.15 && g.audio.ricochet) g.audio.ricochet(this.pan(hx, hz), this.gain(hx, hz, 10));
        }
      }
      for (const [a, s] of struck) {
        const d = s.d;
        if (w.stun) this._stun(a, w, s, d);
        else {
          // How hard the hit throws them if it kills: the weapon's punch, more up close.
          const power = (w.knockback || 3.5) * (pellets > 1 ? clamp(1.4 - s.t / (w.range || 30), 0.4, 1.3) : 1) * (s.head ? 1.25 : 1);
          a.damage(s.dmg, 'player', 'bullet', { x: s.x, y: s.y, z: s.z, dx: d.x, dy: d.y, dz: d.z, head: s.head, power });
          if (a.brain && a.brain.setAlert) a.brain.setAlert(a);
          g.fx.impact(s.x, s.y, s.z, -d.x, -d.y, -d.z, 'flesh');
          if (g.audio.bulletImpact) g.audio.bulletImpact('flesh', this.pan(s.x, s.z), this.gain(s.x, s.z, 8) * Math.min(1.3, 0.8 + 0.12 * s.n));
          this._hit(a.dead ? 'kill' : s.head ? 'head' : 'hit', s.head);
        }
      }
      for (const [v, s] of cars) {
        v.damage(s.dmg, 'player', 'bullet');
        v.wake();
        const glass = s.y > v.pos.y + v.height * 0.62 && Math.random() < 0.6;
        g.fx.impact(s.x, s.y, s.z, -s.d.x, 0, -s.d.z, glass ? 'glass' : 'car');
        if (g.audio.bulletImpact) g.audio.bulletImpact(glass ? 'glass' : 'car', this.pan(s.x, s.z), this.gain(s.x, s.z, 8));
        if (v.driver === 'ai' && v.controller && v.controller.onBump) v.controller.onBump(v, { driver: 'player' }, 6);
        this._hit('hit');
      }
      this._afterShot(w, muzzle);
      if (w.magSize >= 6 && inv.mag > 0 && inv.mag <= Math.ceil(w.magSize * 0.2) && g.audio.lowAmmo) g.audio.lowAmmo(inv.mag);
      if (inv.mag === 0) {
        if (this.reserve(w.id) > 0) this._autoReloadT = 0.18;
        else this._dry(w);
      }
      return true;
    }

    /** The stun gun: down for a few seconds, no blood, nobody hurt. */
    _stun(a, w, s, d) {
      const g = this.game;
      if (a.dead) return;
      a.knock(d.x * 1.2, 0.6, d.z * 1.2, 0, 'player', w.stun);
      if (a.brain && a.brain.setAlert) a.brain.setAlert(a);
      this._hit('hit');
      if (g.audio.stunCrackle) g.audio.stunCrackle(this.pan(a.pos.x, a.pos.z), this.gain(a.pos.x, a.pos.z, 8));
      // Tasing people is still assault; tasing an officer is worse.
      if (a.faction === 'vpd') g.police.crime('hitCop', a.pos.x, a.pos.z);
      else if (a.faction === 'civilian' && !a.brain) g.police.crime('hitPed', a.pos.x, a.pos.z);
      VH.events.emit('agent:stunned', { agent: a, source: 'player' });
    }

    /** A rocket or a 40 mm grenade, launched from the muzzle at whatever the crosshair is on. */
    _fireProjectile(w) {
      const g = this.game;
      const inv = this.inventory[w.id];
      if (!inv) return false;
      if (this._reloadT > 0) return false;
      if (inv.mag <= 0) {
        this._dry(w);
        return false;
      }
      inv.mag--;
      this._cool += 1 / (w.fireRate || 1);
      const p = g.player;
      const P = w.projectile;
      const muzzle = this._muzzleWorld().clone();
      // Aim through the crosshair: find what it's on, then fly from the muzzle to there.
      const ray = this._aimRay(p.aiming ? 0 : 0.02, true);
      const cam = ray.o;
      const tStart = Math.max(0, (new THREE.Vector3().subVectors(p.renderPos, cam)).dot(ray.d) - 0.2);
      const hit = this.trace(cam.x + ray.d.x * tStart, cam.y + ray.d.y * tStart, cam.z + ray.d.z * tStart, ray.d.x, ray.d.y, ray.d.z, w.range || 200, null, p.vehicle);
      const tx = cam.x + ray.d.x * (tStart + hit.t);
      const ty = cam.y + ray.d.y * (tStart + hit.t);
      const tz = cam.z + ray.d.z * (tStart + hit.t);
      const dir = new THREE.Vector3(tx - muzzle.x, ty - muzzle.y, tz - muzzle.z).normalize();
      // A lobbed grenade gets a little lift so it carries to the crosshair at short range.
      if (P.gravity > 0) {
        const dist = Math.hypot(tx - muzzle.x, tz - muzzle.z);
        dir.y += clamp((P.gravity * dist) / (2 * P.speed * P.speed), 0, 0.5);
        dir.normalize();
      }
      const start = muzzle.clone().addScaledVector(dir, 0.4);
      const pr = new Thrown(this, w, start.x, start.y, start.z, dir.x * P.speed, dir.y * P.speed, dir.z * P.speed, 'player');
      this.thrown.push(pr);
      this._afterShot(w, muzzle);
      // The back-blast.
      if (P.model === 'rocket') {
        const bx = muzzle.x - dir.x * 1.6;
        const bz = muzzle.z - dir.z * 1.6;
        for (let i = 0; i < 6; i++) g.fx.rocketTrail(bx + (Math.random() - 0.5) * 0.6, muzzle.y, bz + (Math.random() - 0.5) * 0.6, -dir.x * 8, 0, -dir.z * 8);
      }
      if (inv.mag === 0 && this.reserve(w.id) > 0) this._autoReloadT = 0.25;
      return true;
    }

    _muzzleWorld() {
      const out = this._tmp;
      const p = this.game.player;
      if (this._model && this._model.visible !== false && !p.inVehicle) {
        const m = this._model.userData.muzzle || new THREE.Vector3(0, 0.05, 0.25);
        out.copy(m);
        this._model.localToWorld(out);
        return out;
      }
      if (p.inVehicle) {
        // Out of the window on the side Jay is aiming at.
        const v = p.vehicle;
        const cam = this.game.renderer.camera;
        const d = this._dir.set(0, 0, -1).applyQuaternion(cam.quaternion);
        const rx = Math.cos(v.yaw);
        const rz = -Math.sin(v.yaw);
        const side = Math.sign(d.x * rx + d.z * rz) || 1;
        out.set(v.renderPos.x + rx * side * (v.hx + 0.2), v.renderPos.y + v.height * 0.72, v.renderPos.z + rz * side * (v.hx + 0.2));
        return out;
      }
      out.set(p.renderPos.x + Math.sin(p.heading) * 0.5, p.renderPos.y + 1.35, p.renderPos.z + Math.cos(p.heading) * 0.5);
      return out;
    }

    _melee(w) {
      const g = this.game;
      const p = g.player;
      this._meleeT = 1 / (w.fireRate || 2);
      p._meleeSwing = 1;
      const kind = w.id === 'knife' ? 'blade' : w.id === 'crowbar' || w.id === 'golfclub' ? 'metal' : w.slot === 'melee' ? 'blunt' : 'fist';
      if (g.audio.meleeSwing) g.audio.meleeSwing(kind);
      // A generous reach and a wide arc: a punch that looks like it lands, lands.
      const range = (w.range || 1.5) + 1.3;
      const fx = Math.sin(p.heading);
      const fz = Math.cos(p.heading);
      let target = null;
      let best = Infinity;
      for (const a of g.crowd.agents) {
        if (a.dead || a.hidden) continue;
        const dx = a.pos.x - p.pos.x;
        const dz = a.pos.z - p.pos.z;
        const d = Math.hypot(dx, dz);
        if (d > range || Math.abs(a.pos.y - p.pos.y) > 1.6) continue;
        const facing = (dx * fx + dz * fz) / (d || 1);
        if (facing < (d < 1.2 ? -0.2 : 0.15)) continue; // right up close, almost anything around Jay counts
        // Prefer whoever is nearest to straight ahead; fighters before bystanders.
        const score = d * (1.6 - facing) * (a.brain && a.brain.hostile ? 0.6 : 1);
        if (score < best) {
          best = score;
          target = a;
        }
      }
      if (!target) return;
      // Turn into the punch.
      p.heading = Math.atan2(target.pos.x - p.pos.x, target.pos.z - p.pos.z);
      this._meleeHit = { target, w, kind, t: 0.14 };
    }

    /** The swing lands a beat after it starts (game time, so slow motion and pauses keep it in step). */
    _meleeLand() {
      const g = this.game;
      const p = g.player;
      const { target, w, kind } = this._meleeHit;
      this._meleeHit = null;
      if (target.dead || target.removed) return;
      const dmg = w.damage || 12;
      const heavy = w.slot === 'melee';
      const l = Math.hypot(target.pos.x - p.pos.x, target.pos.z - p.pos.z) || 1;
      const hx = (target.pos.x - p.pos.x) / l;
      const hz = (target.pos.z - p.pos.z) / l;
      target.damage(dmg, 'player', 'melee', { x: target.pos.x - hx * 0.2, y: target.pos.y + 1.45, z: target.pos.z - hz * 0.2, dx: hx, dy: 0.1, dz: hz, head: heavy, power: (w.knockback || 2.5) * 0.8 });
      if (target.brain && target.brain.setAlert) target.brain.setAlert(target);
      const push = heavy ? (w.knockback || 4) : 2.5;
      if (heavy || target.dead || Math.random() < 0.25) target.knock(hx * push, 1.5, hz * push, 0, 'player');
      if (g.audio.meleeHit) g.audio.meleeHit(kind);
      g.cameraRig.addShake(0.15);
      g.cameraRig.kick(0.015, hx * 0.01, 0.6);
      this._hit(target.dead ? 'kill' : 'hit');
      VH.events.emit('combat:melee', { agent: target });
      if (!target.brain && target.faction === 'civilian') g.police.crime('hitPed', target.pos.x, target.pos.z);
    }

    _throw(w) {
      const g = this.game;
      const inv = this.inventory[w.id];
      if (!inv) return;
      const spare = this.reserve(w.id);
      if (inv.mag + spare <= 0) return;
      if (w.sticky && this.thrown.filter((t) => t.stuck || (t.w && t.w.sticky)).length >= (pool(w.ammoType) || { max: 8 }).max) {
        g.hud.showToast('Set the charges off first (' + g.input.labelFor('reload') + ')');
        return;
      }
      if (inv.mag > 0) inv.mag--;
      else this.ammo[w.ammoType] = spare - 1;
      if (inv.mag === 0 && this.reserve(w.id) > 0) {
        inv.mag = 1;
        this.ammo[w.ammoType]--;
      }
      this._cool = 0.9;
      const p = g.player;
      // Throws go where the crosshair is (no aim assist bending them).
      const ray = this._aimRay(0, true);
      const speed = w.throwSpeed || 17;
      const start = this._muzzleWorld();
      const d = ray.d.clone();
      d.y += 0.28;
      d.normalize();
      this.thrown.push(new Thrown(this, w, start.x, start.y + 0.2, start.z, d.x * speed + p.vel.x * 0.5, d.y * speed, d.z * speed + p.vel.z * 0.5, 'player'));
      p._meleeSwing = 1;
      p._fireFaceT = 0.6;
      const a = g.audio;
      if (w.id === 'grenade' && a.grenadePin) a.grenadePin();
      else if (w.id === 'molotov' && a.molotovLight) a.molotovLight();
      if (a.meleeSwing) a.meleeSwing('throw');
      // The last one gone: put it away (a limpet stays while charges are set, to set them off).
      if (inv.mag + this.reserve(w.id) <= 0 && !w.sticky) {
        delete this.inventory[w.id];
        this.select('fists');
      }
      if (w.sticky && !this._toldDetonate) {
        this._toldDetonate = true;
        g.hud.showToast('Press ' + g.input.labelFor('reload') + ' to set off your charges');
      }
    }

    /** R with limpets out: every planted charge goes off. */
    detonate() {
      const g = this.game;
      const list = this.thrown.filter((t) => t.stuck && t.blowIn === undefined);
      if (!list.length) return;
      if (g.audio.detonatorClick) g.audio.detonatorClick();
      // One after another, a beat apart (game time: a pause holds them).
      list.forEach((t, i) => {
        t.blowIn = 0.06 + i * 0.09;
      });
      // An empty limpet slot goes back in the bag once they're all used.
      const inv = this.inventory.limpet;
      if (inv && inv.mag + this.reserve('limpet') <= 0) {
        delete this.inventory.limpet;
        if (this.current === 'limpet') this.select('fists');
      }
    }

    _updateFires(dt) {
      const g = this.game;
      const p = g.player;
      for (const f of this.fires) {
        f.t -= dt;
        const dps = f.dps || 22;
        // Burn people and set cars alight.
        g.crowd.near(f.x, f.z, f.r, (a) => {
          if (!a.dead) {
            a.damage(dps * dt, f.owner === 'player' ? 'player' : f.owner, 'fire');
            if (!a.brain && a.state !== 'down') g.crowd._flee(a, f.x, f.z, 4);
          }
        });
        if (!p.inVehicle && Math.hypot(p.pos.x - f.x, p.pos.z - f.z) < f.r * 0.8) p.damage(dps * 0.64 * dt, 'fire');
        for (const v of g.vehicles.list) {
          if (!v.wrecked && Math.hypot(v.pos.x - f.x, v.pos.z - f.z) < f.r + v.hx) {
            v.damage(45 * dt, f.owner === 'player' ? 'player' : null, 'fire');
            if (v.burning === 0 && Math.random() < dt * 0.4) v.burning = 0.001;
          }
        }
        if (f.voice && f.voice.update) f.voice.update({ gain: Math.min(1, f.t / 1.5) * this.gain(f.x, f.z, 8) * 0.8, pan: this.pan(f.x, f.z) });
        if (f.t <= 0 && f.voice && f.voice.stop) f.voice.stop();
      }
      this.fires = this.fires.filter((f) => f.t > 0);
      if (this._meleeHit) {
        this._meleeHit.t -= dt;
        if (this._meleeHit.t <= 0) this._meleeLand();
      }
    }

    // ------------------------------------------------------------ NPCs
    /** An NPC shoots at a target (Jay or his car). */
    npcFire(a, target, weaponId, accuracy) {
      const g = this.game;
      const w = def(weaponId) || def('pistol') || { damage: 20, range: 40, id: 'pistol' };
      const p = g.player;
      // From the gun in their hand when it's showing, else from about where it would be.
      const mv = g.crowd.muzzleOf ? g.crowd.muzzleOf(a, this._muzzleV) : null;
      const mx = mv ? mv.x : a.pos.x + Math.sin(a.heading) * 0.45;
      const my = mv ? mv.y : a.pos.y + 1.35 * (a.look.height || 1) - (a.anim.crouch > 0.5 ? 0.45 : 0);
      const mz = mv ? mv.z : a.pos.z + Math.cos(a.heading) * 0.45;
      const tx = target.pos.x;
      const ty = target.pos.y + (target === p ? 1.1 : 0.9);
      const tz = target.pos.z;
      const d = Math.hypot(tx - mx, tz - mz);
      // Chance to hit: range, target speed, difficulty, cover, and whether they've just been hit.
      const diff = { easy: 0.6, normal: 1, hard: 1.35 }[g.settings.get('gameplay.difficulty')] || 1;
      const tSpeed = target.vel ? Math.hypot(target.vel.x, target.vel.z) : 0;
      let chance = (accuracy === undefined ? 0.45 : accuracy) * diff * clamp(1.25 - d / ((w.range || 40) * 1.1), 0.08, 1) * clamp(1.2 - tSpeed / 18, 0.25, 1);
      if (p.crouched && !p.inVehicle) chance *= 0.7;
      if (a.flinchT > 0) chance *= 0.3;
      const hit = Math.random() < chance;
      let ex = tx;
      let ey = ty;
      let ez = tz;
      if (!hit) {
        ex += (Math.random() - 0.5) * 3;
        ey += (Math.random() - 0.3) * 1.5;
        ez += (Math.random() - 0.5) * 3;
      }
      const dx = ex - mx;
      const dy = ey - my;
      const dz = ez - mz;
      const len = Math.hypot(dx, dy, dz) || 1;
      const tr = this.trace(mx, my, mz, dx / len, dy / len, dz / len, Math.min(len + 12, (w.range || 40) * 1.4), a, null);
      let endT = tr.t;
      // Did the shot reach Jay (not a wall in between)?
      if (hit && (tr.type === 'none' || tr.t >= len - 0.6 || (tr.type === 'car' && target.driver === 'player' && tr.v === target))) {
        endT = len;
        const base = VH.Data.weaponDamage ? VH.Data.weaponDamage(w, len, false) : w.damage || 20;
        // Enemies hit for about 0.3 of the weapon's damage (a shotgun up to four pellets' worth):
        // the game is balanced round these numbers.
        const dmg = base * 0.55 * (w.pellets > 1 ? Math.min(w.pellets, 4) * 0.55 : 0.55);
        if (target === p) {
          p.damage(dmg, 'bullet');
          if (g.audio.playerHit) g.audio.playerHit(this.pan(mx, mz), p.armor > 0);
          VH.events.emit('player:shot', { from: a, x: mx, z: mz, damage: dmg });
        } else if (target.damage) {
          target.damage(dmg * 0.6, a, 'bullet', { x: mx + (dx / len) * endT, y: my + (dy / len) * endT, z: mz + (dz / len) * endT, dx: dx / len, dy: dy / len, dz: dz / len });
        }
      } else if (tr.type === 'agent') {
        tr.agent.damage((w.damage || 20) * 0.5, a, 'bullet', { x: mx + (dx / len) * tr.t, y: my + (dy / len) * tr.t, z: mz + (dz / len) * tr.t, dx: dx / len, dy: dy / len, dz: dz / len, head: tr.head });
      } else if (tr.type === 'car') {
        tr.v.damage((w.damage || 20) * 0.35, a, 'bullet');
      }
      const hx = mx + (dx / len) * endT;
      const hy = my + (dy / len) * endT;
      const hz = mz + (dz / len) * endT;
      g.fx.tracer(mx, my, mz, hx, hy, hz, { width: 0.024, color: [6, 3.4, 1.6] });
      g.fx.muzzle(mx, my, mz, false, w.flash || 1);
      const ig = this.gain(hx, hz, 8);
      if (tr.type === 'world') {
        const s = this._surface(tr.hit.collider);
        g.fx.impact(hx, hy, hz, tr.hit.nx, tr.hit.ny, tr.hit.nz, s);
        if (Math.random() < 0.5) g.fx.bulletHole(hx, hy, hz, tr.hit.nx, tr.hit.ny, tr.hit.nz, 0.1);
        if (ig > 0.05 && g.audio.bulletImpact) g.audio.bulletImpact(s, this.pan(hx, hz), ig);
        if (!hit && ig > 0.05 && (s === 'metal' || s === 'concrete') && Math.random() < 0.15 && g.audio.ricochet) g.audio.ricochet(this.pan(hx, hz), ig);
      } else if (tr.type === 'car' && ig > 0.05 && g.audio.bulletImpact) g.audio.bulletImpact('car', this.pan(hx, hz), ig);
      const pan = this.pan(mx, mz);
      const gain = this.gain(mx, mz, 14);
      if (g.audio.gunshot) g.audio.gunshot(w.id, pan, gain, clamp((0.5 - gain) / 0.35, 0, 1));
      // A near miss whizzes past.
      if (!hit && target === p && g.audio.whizz && d < 50) g.audio.whizz(this.pan(ex, ez));
      a._recoilT = 1;
      VH.events.emit('gunshot', { x: mx, z: mz, byPlayer: false, loud: true });
    }

    npcMelee(a, target, w) {
      const g = this.game;
      const p = g.player;
      if (target !== p || p.inVehicle) return;
      const d = Math.hypot(p.pos.x - a.pos.x, p.pos.z - a.pos.z);
      if (d > (w.range || 1.5) + 0.4) return;
      p.damage((w.damage || 10) * 0.6, 'melee');
      if (g.audio.meleeHit) g.audio.meleeHit(w.id === 'knife' ? 'blade' : w.slot === 'melee' ? 'blunt' : 'fist');
      if (g.audio.playerHit) g.audio.playerHit(this.pan(a.pos.x, a.pos.z), p.armor > 0);
      g.cameraRig.addShake(0.2);
      VH.events.emit('player:shot', { from: a, x: a.pos.x, z: a.pos.z, damage: w.damage });
    }

    /** Make an armed enemy at a place. */
    spawnEnemy(x, z, opts) {
      opts = opts || {};
      // NPCs fire bullets: launchers, thrown weapons and the stun gun become a rifle in their hands.
      let weapon = opts.weapon || 'pistol';
      const wd = def(weapon);
      if (wd && (wd.kind === 'projectile' || wd.kind === 'thrown' || wd.stun)) weapon = 'rifle';
      opts = Object.assign({}, opts, { weapon });
      const a = this.game.crowd.spawn(x, z, {
        look: opts.look, faction: opts.faction || 'gang', role: 'enemy', persistent: true,
        health: opts.health || 100, armor: opts.armor || 0, heading: opts.heading || 0, name: opts.name,
      });
      a.weapon = weapon;
      a.brain = new CombatBrain(this, opts);
      return a;
    }

    // ------------------------------------------------------- penalties
    _stopNoise() {
      this._cancelReload();
      if (this._spinVoice) {
        this._spinVoice.stop();
        this._spinVoice = null;
      }
      this._spin = 0;
    }

    onArrested() {
      // The police keep a few of your toys.
      this._stopNoise();
      for (const k of Object.keys(this.ammo)) this.ammo[k] = Math.floor(this.ammo[k] * 0.6);
      this._clearCharges();
    }

    onHospital() {
      this._stopNoise();
      for (const k of Object.keys(this.ammo)) this.ammo[k] = Math.floor(this.ammo[k] * 0.8);
      this._clearCharges();
    }

    _clearCharges() {
      for (const t of this.thrown) {
        if (t._remove) t._remove();
        else t.done = true; // a tank shell or a jet's rocket (VH.Rocket)
      }
      this.thrown = [];
    }

    /** Back to the title: silence everything still going (the minigun, fires, rockets). */
    stop() {
      this._stopNoise();
      this._clearCharges();
      for (const f of this.fires) if (f.voice && f.voice.stop) f.voice.stop();
      this.fires = [];
      this.game.player.scoped = false;
    }

    /**
     * After a retry: never less than Jay walked into the job with (a failed
     * job doesn't cost the ammo it burned).
     */
    topUp(snapshot) {
      if (!snapshot) return;
      const s = Combat.normalise(snapshot);
      for (const id of Object.keys(s.inventory)) {
        const inv = this.inventory[id];
        if (inv) inv.mag = Math.max(inv.mag, s.inventory[id].mag || 0);
        else if (def(id)) this.inventory[id] = { mag: s.inventory[id].mag || 0 }; // the last grenade, thrown
      }
      for (const k of Object.keys(s.ammo)) this.ammo[k] = Math.max(this.ammo[k] || 0, s.ammo[k] || 0);
    }

    /** For saving. */
    serialize() {
      return { v: 2, inventory: JSON.parse(JSON.stringify(this.inventory)), ammo: Object.assign({}, this.ammo), current: this.current };
    }

    /** A save of either shape as { inventory: { id: { mag } }, ammo: { pool: n } } (old saves kept spares per weapon). */
    static normalise(data) {
      const out = { inventory: {}, ammo: {} };
      if (!data || !data.inventory) return out;
      for (const id of Object.keys(data.inventory)) {
        const e = data.inventory[id] || {};
        out.inventory[id] = { mag: e.mag || 0 };
        const w = def(id);
        if (data.v !== 2 && w && w.ammoType && e.ammo > 0) {
          const t = pool(w.ammoType);
          out.ammo[w.ammoType] = Math.min(t ? t.max : 9999, (out.ammo[w.ammoType] || 0) + e.ammo);
        }
      }
      if (data.v === 2 && data.ammo) Object.assign(out.ammo, data.ammo);
      return out;
    }

    load(data) {
      this._stopNoise();
      this._clearCharges();
      for (const pk of this.pickups) if (pk.expires !== undefined) pk.dispose();
      this.pickups = this.pickups.filter((pk) => !pk.gone);
      for (const f of this.fires) if (f.voice && f.voice.stop) f.voice.stop();
      this.fires = [];
      this._cool = 0;
      this._kick = 0;
      this._preDriveby = null;
      // Timers against playTime, which a new game or another save winds back.
      this._lootT = undefined;
      this._dryToldT = -Infinity;
      const s = Combat.normalise(data);
      this.inventory = {};
      this.ammo = {};
      this.giveWeapon('fists', 0, true);
      for (const id of Object.keys(s.inventory)) if (def(id) || id === 'fists') this.inventory[id] = s.inventory[id];
      for (const k of Object.keys(s.ammo)) if (pool(k)) this.ammo[k] = Math.min(pool(k).max, s.ammo[k]);
      this.current = data && data.current && this.inventory[data.current] ? data.current : 'fists';
      this.lastBySlot = {};
      const cw = def(this.current);
      if (cw) this.lastBySlot[cw.slot] = cw.id;
      this._attachModel();
    }
  }

  Object.defineProperty(Combat, 'SLOT_ORDER', { get: slotOrder });
  Combat.def = def;
  Combat.Thrown = Thrown;
  VH.Combat = Combat;
  VH.CombatBrain = CombatBrain;
})();
