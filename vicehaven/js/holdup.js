/*
 * holdup.js — holding up a corner shop or a petrol station (stores.js).
 *
 *   new VH.HoldUp(stores)   made by VH.Stores (game.stores.holdup) and driven
 *                           from its update, stop, reset, load and serialize
 *
 * Aim a real gun at the clerk from inside the shop and his hands go up. He
 * turns to the till and stuffs the notes into a cash bag while Jay keeps him
 * covered, then tosses the bag onto the counter: the money is Jay's when he
 * picks it up (or grabs it early with what's in it). Every clerk is someone
 * (nervous, steady, stubborn or a would-be hero, rolled per hold-up and
 * seeded so a reload can't change him). E with nothing to pick up shouts at
 * him to hurry (sprayshops.js's 'interaction:idle' trick; holding E grabs
 * the bag early instead), a warning shot hurries him more, and a hero
 * caught reaching under the counter backs down. Bigger shops have a safe he
 * can be made to open, slowly.
 *
 * The heat: a silent alarm or a shopper who gets out of the door means two
 * stars; otherwise the CCTV camera over the door means one star once Jay has
 * gone; shoot the camera out as well and it's a clean job: no stars and a
 * bonus. A shop robbed twice hires a security guard.
 *
 * Runtime props (cash bag, till drawer, safe, camera) come from
 * holdup-models.js when it's loaded, plain boxes otherwise, and only exist
 * near Jay. Lines come from data/holdup-lines.js, sounds from audio-holdup.js
 * (every call checks the method is there first).
 *
 * Events: holdup:start { s, personality }  holdup:bag { s, amount, partial,
 * clean }  holdup:safe { s, amount }  holdup:hero { s, backedDown }
 * holdup:end { s, robbed, amount, alarm, camera (still recording), witnessesOut,
 * clean }  holdup:getaway { s }  holdup:wallet { amount }  holdup:camera { s }
 */
(function () {
  'use strict';

  const VH = window.VH;
  const { clamp, dampAngle } = VH.math;

  const KERB = 0.15;
  const FILL_TIME = 7; //      seconds to fill the bag at a steady clerk's pace
  const DIAL_TIME = 6; //      seconds to open the safe
  const GRACE = 0.6; //        the bag keeps filling this long after the aim slips
  const GIVE_UP = 8; //        uncovered this long and he stops: Jay's lost him
  const ALARM_DELAY = 8; //    silent alarm to police report
  const PHONE_DELAY = 3; //    a shopper outside on the phone to the police
  const SAFE_REFILL = 1200; // seconds of play before a safe is worth opening again
  const FOOTAGE_DELAY = 20; // after Jay leaves a shop whose camera saw it all
  const GETAWAY_TIME = 180; // lose the heat this soon after a hold-up: a clean getaway
  const BELL_TIME = 45;
  const CLEAN_BONUS = 0.15;
  const SHOUT_COOLDOWN = 2.5;
  const HOLD_GRAB = 0.6; //    E held this long while he fills the bag: grab it now
  const SAFE_OFFER = 6; //     the bag's taken: this long to make him open the safe
  const TELL_TIME = 1.4;
  const PROPS_NEAR = 60;
  const PROPS_FAR = 80;
  const SHOPPERS_NEAR = 40;
  const SHOPPERS_FAR = 70;
  const FILLING = { hands: true, till: true, safeWalk: true, safeDial: true };
  // A hand, at the end of the forearm (crowd.js GRIP).
  const HAND = new THREE.Vector3(0, -0.31, 0.03);

  // Who the clerk is today. speed: how fast the bag fills; alarm: the chance
  // he trips the silent alarm at some point regardless; chatter: seconds
  // between muttered lines; tremble: how much he shakes.
  const PERSONALITIES = {
    nervous: { speed: 1.3, alarm: 0.25, chatter: [2.6, 4.2], tremble: 1 },
    steady: { speed: 1.0, alarm: 0.35, chatter: [6, 9], tremble: 0.25 },
    stubborn: { speed: 0.55, alarm: 0.45, chatter: [5, 8], tremble: 0.15 },
    hero: { speed: 1.0, alarm: 0, chatter: [7, 11], tremble: 0.1 },
  };

  // A line or two of our own in case data/holdup-lines.js isn't loaded.
  const FALLBACK = {
    clerk: {
      start: ['Okay! Okay! Take it easy!'], again: ['You again?!'], armedEntry: ['Easy with that thing...'], greet: ['Evening.'],
      filling: ['Going as fast as I can!'], stall: ["The drawer's stuck..."], hurried: ['Okay, okay!'], panic: ["I can't think! Stop yelling!"],
      warningShot: ['Okay! Okay!'], backDown: ["Alright! I'm not doing anything!"], heroDraw: ['Not today!'], throw: ['Take it! Just take it!'],
      handOver: ["Here! That's all there is!"], safeAgree: ['The safe? Alright...'], safeDial: ['My hands are shaking...'], safeOpen: ["It's open!"],
      emptyTill: ["I've got nothing left!"], abandoned: ['He... he just left.'], hurt: ['Argh! Okay!'], after: ['Please, just go.'],
    },
    jay: { start: ['Hands up! Fill the bag!'], shout: ['Faster!', 'Fill the bag!'], grab: ["I'll take that."], safe: ['Now the safe.'], takeSafe: ["I'll have that."], wallet: ['Wallet. Now.'], camera: ['Smile.'], leave: ['Pleasure doing business.'], guard: ['Easy, pal.'] },
    shopper: { plead: ["Please don't shoot!"], wallet: ['Here! Take it!'], bolt: ["I'm out of here!"], phone: ["Police? There's a robbery!"], browse: [] },
    guard: { challenge: ['Drop it!'], fight: ['Shots fired!'], down: ["Agh! I'm hit!"] },
  };

  // Voices for dialogue.js (Jay is already 'jay').
  const CAST = {
    clerk_m: { name: 'Clerk', voice: { gender: 'male', pitch: 1.05, rate: 1.1 } },
    clerk_f: { name: 'Clerk', voice: { gender: 'female', pitch: 1.08, rate: 1.1 } },
    shopper_m: { name: 'Shopper', voice: { gender: 'male', pitch: 0.95, rate: 1.05 } },
    shopper_f: { name: 'Shopper', voice: { gender: 'female', pitch: 1.12, rate: 1.08 } },
    guard: { name: 'Guard', voice: { gender: 'male', pitch: 0.85, rate: 1.0 } },
  };

  const rnd = (a, b) => a + Math.random() * (b - a);

  function realGun(w) {
    return !!w && (w.kind === 'hitscan' || w.kind === 'pellets' || w.kind === 'projectile') && !w.stun;
  }

  // ------------------------------------------------------------ props
  // Plain stand-ins for holdup-models.js, should it be missing.
  let FB = null;
  function fallbackKit() {
    if (FB) return FB;
    const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.7, metalness: 0 }, o || {}));
    FB = {
      box: new THREE.BoxGeometry(1, 1, 1),
      canvas: mat(0x8a7a55),
      steel: mat(0x3a3f46, { metalness: 0.5, roughness: 0.45 }),
      dark: mat(0x1c1e22),
      cash: mat(0x5c9a5a),
      white: mat(0xe8e6e0),
      led: new THREE.MeshBasicMaterial({ color: 0xff2a2a }),
      ledOff: new THREE.MeshBasicMaterial({ color: 0x331010 }),
    };
    return FB;
  }

  function part(mat, sx, sy, sz, x, y, z, parent) {
    const m = new THREE.Mesh(fallbackKit().box, mat);
    m.scale.set(sx, sy, sz);
    m.position.set(x, y, z);
    m.castShadow = true;
    parent.add(m);
    return m;
  }

  const FALLBACK_MODELS = {
    cashBag() {
      const K = fallbackKit();
      const g = new THREE.Group();
      const body = part(K.canvas, 0.24, 0.3, 0.16, 0, 0.15, 0, g);
      g.userData.setFill = (f) => {
        const k = 0.3 + 0.7 * clamp(f, 0, 1);
        body.scale.set(0.2 + 0.06 * k, 0.32 * k, 0.1 + 0.08 * k);
        body.position.y = 0.16 * k;
      };
      g.userData.setFill(0);
      return g;
    },
    tillDrawer() {
      const K = fallbackKit();
      const g = new THREE.Group();
      const tray = new THREE.Group();
      g.add(tray);
      part(K.dark, 0.38, 0.08, 0.32, 0, 0.04, 0.16, tray);
      const cash = part(K.cash, 0.3, 0.02, 0.2, 0, 0.085, 0.17, tray);
      g.userData.setOpen = (o) => {
        tray.position.z = 0.24 * clamp(o, 0, 1);
      };
      g.userData.setCash = (c) => {
        cash.visible = c > 0.05;
      };
      return g;
    },
    safe() {
      const K = fallbackKit();
      const g = new THREE.Group();
      part(K.steel, 0.62, 0.72, 0.5, 0, 0.36, 0.25, g);
      const cash = part(K.cash, 0.4, 0.14, 0.04, 0, 0.32, 0.5, g);
      const hinge = new THREE.Group();
      hinge.position.set(-0.31, 0, 0.5);
      g.add(hinge);
      part(K.dark, 0.62, 0.7, 0.06, 0.31, 0.36, 0.03, hinge);
      const dial = part(K.white, 0.1, 0.1, 0.03, 0.31, 0.46, 0.075, hinge);
      g.userData.dial = dial;
      g.userData.setOpen = (o) => {
        hinge.rotation.y = -1.75 * clamp(o, 0, 1);
      };
      g.userData.setCash = (b) => {
        cash.visible = !!b;
      };
      return g;
    },
    cctv() {
      const K = fallbackKit();
      const g = new THREE.Group();
      const swivel = new THREE.Group();
      g.add(swivel);
      part(K.white, 0.05, 0.05, 0.18, 0, -0.02, 0.08, swivel);
      const head = new THREE.Group();
      head.position.set(0, -0.06, 0.17);
      head.rotation.x = 0.45;
      swivel.add(head);
      part(K.white, 0.11, 0.1, 0.22, 0, 0, 0.06, head);
      const lens = part(K.dark, 0.07, 0.07, 0.02, 0, 0, 0.175, head);
      lens.name = 'lens';
      const led = part(K.led, 0.02, 0.02, 0.02, 0.035, 0.035, 0.172, head);
      let t = 0;
      let broken = false;
      let pitch = 0.45;
      g.userData.aim = (yaw, p) => {
        swivel.rotation.y = yaw || 0;
        pitch = p === undefined ? 0.45 : p;
        if (!broken) head.rotation.x = pitch;
      };
      g.userData.setBroken = (b) => {
        broken = !!b;
        head.rotation.x = broken ? 1.25 : pitch;
        head.rotation.z = broken ? 0.4 : 0;
        led.material = broken ? K.ledOff : K.led;
      };
      g.userData.update = (dt) => {
        t += dt;
        if (!broken) led.material = t % 1.2 < 0.25 ? K.led : K.ledOff;
      };
      return g;
    },
  };

  /** A prop from holdup-models.js, or the stand-in. */
  function model(name) {
    const M = VH.HoldupModels;
    if (M && typeof M[name] === 'function') {
      try {
        const g = M[name]();
        if (g && g.isObject3D) return g;
      } catch (e) {
        console.warn('[holdup] ' + name + '() failed, using a stand-in', e);
      }
    }
    return FALLBACK_MODELS[name] ? FALLBACK_MODELS[name]() : new THREE.Group();
  }

  function call(o, fn, a, b) {
    if (o && o.userData && typeof o.userData[fn] === 'function') o.userData[fn](a, b);
  }

  // ------------------------------------------------------------ shoppers
  /**
   * Someone browsing the aisles: stands at a shelf facing the goods, moves
   * to another shelf now and then (round the gondolas by the cross aisle).
   * When a hold-up starts they cower (hands up while Jay covers them); one
   * Jay isn't covering may make a run for the door and phone the police.
   *   browse  walk  cower  bolt  out (on the phone outside)  leave
   */
  class ShopperBrain {
    constructor(ho, s, spot, voice) {
      this.ho = ho;
      this.s = s;
      this.spot = spot;
      this.voice = voice;
      this.mode = 'browse';
      this.path = null;
      this.pi = 0;
      this.t = rnd(6, 15); //  until the next shelf
      this.boltT = Infinity; // uncovered seconds until they run for it
      this.calmT = 0; //      after a scare: until they leave the shop
      this.h = null; //       the hold-up they were caught in
      this.covered = false;
      this.robbed = false; // wallet handed over
      this.escaped = false;
      this.gone = false;
      this.hostile = false;
      this.phoneT = 0;
    }

    update(a, dt) {
      if (a.dead) return;
      const an = a.anim;
      const p = this.ho.game.player;
      a.moveSpeed = 0;
      let face;
      let hands = 0;
      let cower = 0;
      let phone = 0;
      switch (this.mode) {
        case 'browse':
          face = this.spot.heading;
          this.t -= dt;
          if (this.t <= 0) this.ho._shopperMove(this);
          break;
        case 'walk':
          if (this._follow(a, dt, 1.25)) {
            this.mode = 'browse';
            this.t = rnd(6, 15);
          }
          break;
        case 'cower':
          face = Math.atan2(p.pos.x - a.pos.x, p.pos.z - a.pos.z);
          if (this.covered) hands = 1;
          else cower = 1;
          if (!this.h || this.h !== this.ho.active) {
            this.calmT -= dt;
            if (this.calmT <= 0) this.ho._shopperLeave(this);
          }
          break;
        case 'bolt':
          if (!this.escaped) this._checkOut(a);
          if (this._follow(a, dt, 4.6)) {
            this.mode = 'out';
            this.phoneT = rnd(6, 9);
            this.ho._say(this.voice, 'shopper', 'phone', 1);
          }
          break;
        case 'out':
          phone = 1;
          face = Math.atan2(this.s.door.x - a.pos.x, this.s.door.z - a.pos.z);
          this.phoneT -= dt;
          if (this.phoneT <= 0) {
            this.mode = 'leave';
            this.path = [{ x: a.pos.x + (a.pos.x - this.s.door.x) * 3, z: a.pos.z + (a.pos.z - this.s.door.z) * 3 }];
            this.pi = 0;
          }
          break;
        case 'leave':
          if (this._follow(a, dt, 1.3)) this.gone = true;
          break;
      }
      an.sprint = this.mode === 'bolt';
      if (face !== undefined && a.moveSpeed === 0) a.heading = dampAngle(a.heading, face, 5, dt);
      const k = Math.min(1, dt * 7);
      an.handsUp += (hands - an.handsUp) * k;
      an.cower += (cower - an.cower) * k;
      an.phone += (phone - an.phone) * k;
      const d = this.ho.game.dialogue;
      an.talk = d && !cower ? d.talkLevel(this.voice) * 0.7 : 0;
    }

    /** Walk the path; true once at the end of it. */
    _follow(a, dt, speed) {
      if (!this.path || this.pi >= this.path.length) return true;
      const t = this.path[this.pi];
      const dx = t.x - a.pos.x;
      const dz = t.z - a.pos.z;
      if (Math.hypot(dx, dz) < (speed > 3 ? 0.6 : 0.3) || a.blocked > 1.5) {
        a.blocked = 0;
        this.pi++;
        return this.pi >= this.path.length;
      }
      a.heading = dampAngle(a.heading, Math.atan2(dx, dz), 9, dt);
      a.moveSpeed = speed;
      return false;
    }

    /** Out of the door: a witness got away. */
    _checkOut(a) {
      const K = VH.Stores.kit;
      const v = K.local(this.s.f, a.pos.x, a.pos.z)[1];
      if (v < this.s.vb0 - 0.3) {
        this.escaped = true;
        this.ho._escaped(this);
      }
    }

    /** Shot at or hit (combat.js): run for it (unless that shot killed them). */
    setAlert(a) {
      if (a.dead) return;
      if (this.mode !== 'bolt' && this.mode !== 'out' && this.mode !== 'leave') this.ho._bolt(a, this);
    }

    expired() {
      return this.gone;
    }
  }

  // ================================================================ hold-up
  class HoldUp {
    constructor(stores) {
      this.stores = stores;
      this.game = stores.game;
      this.perShop = {}; //       id -> { n (times robbed), guard, guardUntil, safeUntil, camUntil }
      this.salt = (Math.random() * 1e9) >>> 0; // per game: seeds the clerks
      this.active = null; //      the hold-up under way
      this.drops = []; //         cash bags lying on counters
      this.after = []; //         robbed shops whose camera footage may yet reach the police
      this.getaways = []; //      { s, t, hot }: lose the heat in time for a clean getaway
      this.bells = []; //         alarm bells ringing outside shops
      this.props = new Map(); //  id -> the runtime meshes of a shop near Jay
      this.shoppers = new Map(); // id -> [agents]
      this.guards = new Map(); // id -> agent
      this._inside = null;
      this._press = null; //      { h, t }: E going down while he fills the bag (tap or hold?)
      this._sayAt = 0;
      this._last = {};
      this._mine = new WeakSet();
      this._chat = new WeakSet(); // small talk (a greeting, browsing) that gives way to the rest
      this._cast = false;
      this._cache = {};
      this._v = new THREE.Vector3();
      this._w = new THREE.Vector3();
      this._buildHud();
      this._bind();
      this._safeColliders();
      if (VH.HoldupModels && VH.HoldupModels.preload) {
        try {
          VH.HoldupModels.preload();
        } catch (e) {
          console.warn('[holdup] preload failed', e);
        }
      }
    }

    _bind() {
      const g = this.game;
      g.interaction.on('holdupBag', (item) => {
        this._takeDrop(item.drop);
        return 0.5;
      });
      g.interaction.on('holdupSafe', () => {
        this._takeSafe();
        return 0.5;
      });
      VH.events.on('interaction:idle', () => this._pressE());
      VH.events.on('gunshot', (e) => {
        if (e.byPlayer) this._gunshot(e);
      });
      VH.events.on('agent:hurt', (e) => this._hurt(e));
      VH.events.on('agent:died', (e) => this._died(e));
      VH.events.on('combat:ray', (e) => this._ray(e));
      VH.events.on('explosion', (e) => this._explosion(e));
      VH.events.on('player:arrested', () => this._abort(true));
      VH.events.on('player:died', () => this._abort(true));
      VH.events.on('mission:start', () => this._abort(false));
    }

    /** The safes stand in the room for good, so they get a collider each once. */
    _safeColliders() {
      const ph = this.game.physics;
      if (!ph || !ph.addOrientedBox || !VH.COLLIDE) return;
      for (const s of this.stores.list) {
        const H = s.hold;
        if (!H || !H.hasSafe) continue;
        const fx = Math.sin(H.safe.heading);
        const fz = Math.cos(H.safe.heading);
        ph.addOrientedBox(H.safe.x + fx * 0.28, H.safe.z + fz * 0.28, 0.33, 0.3, H.safe.heading, 0, KERB + 0.74, 'safe', VH.COLLIDE.ALL);
      }
    }

    // ---------------------------------------------------------- queries
    /** Is this shop being held up right now? */
    busy(s) {
      return !!this.active && this.active.s === s;
    }

    /** The clerk's voice: seeded per shop and game. */
    voiceFor(s) {
      return new VH.RNG(s.id + '|voice|' + this.salt).next() < 0.5 ? 'clerk_m' : 'clerk_f';
    }

    _shop(id) {
      return this.perShop[id] || (this.perShop[id] = { n: 0, guard: false, guardUntil: 0, safeUntil: 0, camUntil: 0 });
    }

    _camBroken(s) {
      const ps = this.perShop[s.id];
      return !!ps && ps.camUntil > this.game.playTime;
    }

    _armed() {
      const c = this.game.combat;
      return !!c && realGun(c.weapon) && !this.game.player.inVehicle;
    }

    _clerk(s) {
      const a = this.stores.clerks.get(s.id);
      return a && !a.dead && !a.removed && a.brain instanceof VH.Stores.ClerkBrain ? a : null;
    }

    _pan(x, z) {
      const vf = this.game.vehicleFeedback;
      return vf && vf._pan ? vf._pan(x, z) : 0;
    }

    _gain(x, z, ref) {
      const vf = this.game.vehicleFeedback;
      if (vf && vf._gain) return vf._gain(x, z, ref);
      const c = this.game.player.pos;
      return 1 / (1 + Math.pow(Math.hypot(x - c.x, z - c.z) / (ref || 10), 1.5));
    }

    /** A sound from audio-holdup.js at a place in the world (if it's loaded). */
    _sfx(name, x, z, ref) {
      const au = this.game.audio;
      if (!au || typeof au[name] !== 'function') return null;
      return x === undefined ? au[name]() : au[name](this._pan(x, z), this._gain(x, z, ref || 8));
    }

    _sting(kind) {
      const au = this.game.audio;
      if (au && au.holdupSting) au.holdupSting(kind);
    }

    // ---------------------------------------------------------- update
    update(dt, inside) {
      if (inside !== this._inside) this._enter(inside);
      this._streamProps(dt);
      this._streamShoppers(inside);
      this._updateGuards(dt, inside);
      if (this.active) this._run(dt, inside);
      else if (inside) this._idle(inside);
      this._updateDrops(dt);
      this._updateAfter(dt, inside);
      this._updateBells(dt);
      this._hudUpdate();
    }

    /** Jay walks into a shop (or out of one). */
    _enter(inside) {
      const prev = this._inside;
      this._inside = inside;
      this._emptyTold = false;
      this._waryTold = false;
      const pa = prev && this._clerk(prev);
      if (pa && !pa.brain.busy && pa.brain.mode === 'nervous') {
        pa.brain.mode = 'idle';
        pa.brain.tremble = 0;
      }
      if (!inside) return;
      this._sfx('shopChime');
      const a = this._clerk(inside);
      const g = this.game;
      if (!a || this.active || (g.missions && g.missions.run) || a.brain.mode !== 'idle') return;
      if (this._armed()) {
        this._waryTold = true;
        a.brain.mode = 'nervous';
        this._say(a.brain.voice, 'clerk', 'armedEntry', 1);
      } else if (this.stores.isOpen(inside) && Math.random() < 0.6) this._say(a.brain.voice, 'clerk', 'greet');
    }

    /** Jay's in the shop and nobody's held it up yet. */
    _idle(s) {
      const g = this.game;
      if (g._arresting || g.player.isDead || g.state !== 'playing') return; // being taken away: no fresh hold-up
      const a = this._clerk(s);
      if (!a) return;
      const b = a.brain;
      // A gun out in his shop makes him nervous.
      if (b.mode === 'idle' || b.mode === 'nervous') {
        const armed = this._armed();
        b.mode = armed ? 'nervous' : 'idle';
        b.tremble = armed ? 0.4 : 0;
        if (armed && !this._waryTold) {
          this._waryTold = true;
          this._say(b.voice, 'clerk', 'armedEntry');
        }
      }
      if (!this.stores._covering(a)) return;
      if (g.missions && g.missions.run) {
        b.scare(4);
        return;
      }
      if (!this.stores.isOpen(s)) {
        b.mode = 'hands';
        b._scared = 2;
        b.tremble = 0.5;
        if (!this._emptyTold) {
          this._emptyTold = true;
          this._say(b.voice, 'clerk', 'emptyTill', 1);
          g.hud.showToast("The till's empty. Come back later.");
        }
        return;
      }
      this._start(s, a);
    }

    // ---------------------------------------------------------- starting
    _start(s, a) {
      const g = this.game;
      const ps = this._shop(s.id);
      const H = s.hold;
      // Who he is today: seeded by the shop, how often it's been robbed and
      // the game, so reloading a save doesn't roll him again.
      const rng = new VH.RNG(s.id + '|' + ps.n + '|' + this.salt);
      const heroP = Math.min(0.4, 0.15 + 0.1 * ps.n);
      const k = (1 - heroP) / 0.85;
      const r = rng.next();
      const pers = r < 0.35 * k ? 'nervous' : r < 0.65 * k ? 'steady' : r < 0.85 * k ? 'stubborn' : 'hero';
      const P = PERSONALITIES[pers];
      // The takings: more in the evening, less first thing in the morning.
      const hour = g.environment ? g.environment.hours : 12;
      const tod = hour >= 18 && hour < 23 ? 1.25 : hour >= 5 && hour < 9 ? 0.7 : 1;
      const total = Math.round((rng.range(s.gas ? 400 : 240, s.gas ? 760 : 520) * tod) / 5) * 5;
      const safeAmount = Math.round(rng.range(s.gas ? 700 : 500, s.gas ? 1600 : 1100) / 10) * 10;
      const alarmAt = rng.next() < P.alarm ? rng.range(1.5, 1 + FILL_TIME / P.speed) : Infinity;
      const h = {
        s, a, b: a.brain, pers, rng, ps,
        phase: 'hands', pt: 0, t: 0,
        fill: 0, total, partial: false,
        grace: GRACE, idle: 0, waver: 0, covered: true,
        boostT: 0, boostK: 1, pushT: 0,
        stallIn: rng.range(1.5, 3), stallT: 0, stalled: false,
        presses: [], shoutAt: -99, panicT: 0,
        heroAt: pers === 'hero' ? rng.range(0.3, 0.75) : 2, tellT: 0, heroDone: pers !== 'hero',
        alarmAt, alarm: null, reported: false,
        witOut: 0,
        bag: null, notes: null, flying: null, drop: null, bagTaken: false, paid: 0,
        safeAvail: !!H.hasSafe && (ps.safeUntil || 0) <= g.playTime, safeAmount, safeOrdered: false, safeP: 0, safeDone: false, safePaid: 0,
        offerT: SAFE_OFFER, path: null, pi: 0, tickT: 0,
        rustleT: 0.3, chatT: rng.range(P.chatter[0], P.chatter[1]),
        safeItem: null,
        recognised: ps.n > 0,
        tension: null,
      };
      this.active = h;
      h.b.busy = true;
      h.b.mode = 'hands';
      h.b.goal = null;
      h.b.tremble = P.tremble;
      this._snackItem(s, false);
      this._say('jay', 'jay', 'start', 1); // forced: cuts off any "Evening." still playing
      this._say(h.b.voice, 'clerk', h.recognised ? 'again' : 'start', 2, pers); // his line matters more than Jay's
      this._shoppersCower(s, h, false);
      this._sting('start');
      const au = g.audio;
      if (au && au.holdupTension) h.tension = au.holdupTension();
      VH.events.emit('holdup:start', { s, personality: pers });
    }

    // ---------------------------------------------------------- running
    _run(dt, inside) {
      const g = this.game;
      const h = this.active;
      const p = g.player;
      if (p.isDead || g._arresting || (g.missions && g.missions.run)) return this._end('abort');
      if (h.a.removed || h.a.dead) return this._end('clerk');
      if (inside !== h.s) return this._end('left');
      h.t += dt;
      h.pt += dt;
      h.covered = this.stores._covering(h.a);
      if (h.covered) {
        h.grace = GRACE;
        h.idle = 0;
        h.waver = 0;
      } else {
        h.grace -= dt;
        // Only while he's working: lowering the gun to go and pick the bag
        // up doesn't count against Jay once he orders the safe.
        if (FILLING[h.phase]) {
          h.idle += dt;
          h.waver += dt;
        }
      }
      const held = h.grace > 0;
      if (h.boostT > 0) h.boostT -= dt;
      if (h.pushT > 0) h.pushT -= dt;
      if (h.panicT > 0) h.panicT -= dt;
      // The silent alarm: his nerve, or Jay's aim slipping.
      if (h.alarm) h.alarm.t -= dt;
      else if (h.phase !== 'hands' && FILLING[h.phase] && (h.t >= h.alarmAt || (h.pers === 'steady' && h.waver > 1.2))) this._tripAlarm(h);
      // Lost him: nobody's covered him for a while.
      if (FILLING[h.phase] && h.idle > GIVE_UP) return this._end('idle');
      this._holdE(h, dt);
      if (this.active !== h) return;
      switch (h.phase) {
        case 'hands':
          h.b.mode = 'hands';
          if (h.pt > 0.8) this._phase(h, 'till');
          break;
        case 'till':
          this._till(h, dt, held);
          break;
        case 'throw':
          h.b.mode = 'throw';
          if (h.pt > 0.3 && !h.flying && h.bag) this._toss(h);
          break;
        case 'thrown':
        case 'safeTaken':
          h.b.mode = h.phase === 'safeTaken' ? 'kneelHands' : 'hands';
          // The bag's Jay's and there's a safe: he has a moment to ask for
          // it (gun in hand), or that's the job done.
          if (h.phase === 'thrown' && h.bagTaken) {
            h.offerT -= dt;
            if (h.offerT <= 0 || !this._armed()) return this._end('done');
          }
          break;
        case 'safeWalk':
          this._safeWalk(h);
          break;
        case 'safeDial':
          this._safeDial(h, dt, held);
          break;
        case 'safeOpen':
          h.b.mode = 'kneelHands';
          break;
      }
      if (this.active !== h) return; // the hero drew, or it's over
      this._updateBag(h, dt);
      this._shoppersHoldUp(h, dt);
      if (h.tension && h.tension.update) {
        const prog = h.phase === 'safeDial' || h.phase === 'safeWalk' ? h.safeP : h.fill;
        h.tension.update({ level: clamp(0.25 + 0.45 * prog + (h.alarm ? 0.2 : 0) + (h.tellT > 0 ? 0.4 : 0), 0, 1) });
      }
    }

    _phase(h, name) {
      const H = h.s.hold;
      const b = h.b;
      h.phase = name;
      h.pt = 0;
      if (name === 'till') {
        b.goal = H.tillStand;
        b.mode = 'till';
        h.bag = this._addMesh(model('cashBag'));
        call(h.bag, 'setFill', 0);
        // A wad of notes in his other hand, on its way into the bag.
        if (VH.HoldupModels && VH.HoldupModels.notes) h.notes = this._addMesh(model('notes'));
        this._sfx('tillOpen', H.till.x, H.till.z);
      } else if (name === 'throw') {
        this._press = null;
        this._removeMesh(h.notes);
        h.notes = null;
        b.mode = 'throw';
      } else if (name === 'thrown') {
        b.mode = 'hands';
      } else if (name === 'safeWalk') {
        h.path = [H.corner, H.kneel];
        h.pi = 0;
        b.mode = 'walk';
        b.goal = h.path[0];
      } else if (name === 'safeDial') {
        b.mode = 'kneel';
        b.goal = H.kneel;
        h.stallIn = h.rng.range(1, 2.5);
      } else if (name === 'safeOpen') {
        b.mode = 'kneelHands';
        this._sfx('safeOpen', H.safe.x, H.safe.z);
        this._say(b.voice, 'clerk', 'safeOpen', 2);
        const fx = Math.sin(H.safe.heading);
        const fz = Math.cos(H.safe.heading);
        h.safeItem = this._register({ id: 'holdup_safe', kind: 'holdupSafe', x: H.safe.x + fx * 0.6, y: KERB + 0.6, z: H.safe.z + fz * 0.6, radius: 1.6, label: 'Take the cash (' + VH.util.formatMoney(h.safeAmount) + ')' });
        const pr = this.props.get(h.s.id);
        if (pr) pr.safeLeftOpen = true;
      }
    }

    /** A stubborn clerk drags his feet now and then until Jay shouts. */
    _stall(h, dt, held) {
      if (h.pers !== 'stubborn' || h.pushT > 0) {
        h.stallT = 0;
        return false;
      }
      if (h.stallT > 0) {
        h.stallT -= dt;
        return true;
      }
      if (!held) return false;
      h.stallIn -= dt;
      if (h.stallIn > 0) return false;
      h.stallT = h.rng.range(2, 3.5);
      h.stallIn = h.rng.range(2.5, 5);
      this._say(h.b.voice, 'clerk', 'stall', 1);
      return true;
    }

    _till(h, dt, held) {
      const b = h.b;
      const P = PERSONALITIES[h.pers];
      b.goal = h.s.hold.tillStand;
      // A hero's tell: hands dropping, eyes down. Jay has a moment to catch it.
      if (h.tellT > 0) {
        h.tellT -= dt;
        b.mode = 'tell';
        if (h.tellT <= 0) this._heroDraw(h);
        return;
      }
      if (!h.heroDone && h.pt > 0.6 && (h.fill >= h.heroAt || h.waver > 0.8)) {
        h.heroDone = true;
        h.tellT = TELL_TIME;
        b.mode = 'tell';
        this._sting('tell');
        return;
      }
      if (h.panicT > 0) {
        b.mode = 'panic';
        return;
      }
      h.stalled = this._stall(h, dt, held);
      b.mode = h.stalled ? 'hold' : 'till';
      if (!held || h.stalled) return;
      const speed = h.pers === 'stubborn' && h.pushT > 0 ? 1 : P.speed;
      const boost = h.boostT > 0 ? h.boostK : 1;
      h.fill = Math.min(1, h.fill + (dt / FILL_TIME) * speed * boost);
      h.rustleT -= dt * boost;
      if (h.rustleT <= 0) {
        h.rustleT = rnd(0.45, 0.9);
        this._sfx('cashRustle', h.a.pos.x, h.a.pos.z, 6);
      }
      h.chatT -= dt;
      if (h.chatT <= 0) {
        h.chatT = h.rng.range(P.chatter[0], P.chatter[1]);
        this._say(b.voice, 'clerk', 'filling', 0, h.pers);
      }
      if (h.fill >= 1) this._phase(h, 'throw');
    }

    /** What's in the bag now (an early grab pays at least a fifth). The panel shows this too. */
    _bagValue(h) {
      return Math.round(h.total * Math.max(0.2, h.fill));
    }

    /**
     * E going down while he fills the bag (_pressE): let go quickly and it's
     * a shout, keep it held and he hands the bag over as it is. A tell that
     * starts meanwhile is caught at once.
     */
    _holdE(h, dt) {
      const k = this._press;
      if (!k) return;
      if (k.h !== h || h.phase !== 'till') {
        this._press = null;
        return;
      }
      if (h.tellT <= 0 && this.game.input.down('interact')) {
        k.t += dt;
        if (k.t >= HOLD_GRAB) {
          this._press = null;
          this._grabEarly();
        }
        return;
      }
      this._press = null;
      this._shout(h);
    }

    /** E held while he's still filling the bag: he hands it over now. */
    _grabEarly() {
      const h = this.active;
      if (!h || h.phase !== 'till' || h.tellT > 0) return;
      h.partial = h.fill < 1;
      this._say('jay', 'jay', 'grab', 1);
      this._say(h.b.voice, 'clerk', 'handOver', 1);
      this._phase(h, 'throw');
      h.pt = 0.3; // straight over
    }

    /** He tosses the bag onto the counter on Jay's side. */
    _toss(h) {
      const to = h.s.hold.bag;
      h.flying = { t: 0, x0: h.bag.position.x, y0: h.bag.position.y, z0: h.bag.position.z, x1: to.x, y1: to.y, z1: to.z };
      if (!h.partial) this._say(h.b.voice, 'clerk', 'throw', 2);
    }

    /** The bag: in his hand, then in the air, then on the counter. */
    _updateBag(h, dt) {
      const bag = h.bag;
      if (!bag) return;
      if (h.flying) {
        const f = h.flying;
        f.t = Math.min(1, f.t + dt / 0.45);
        const t = f.t;
        bag.position.set(f.x0 + (f.x1 - f.x0) * t, f.y0 + (f.y1 - f.y0) * t + 1.4 * t * (1 - t), f.z0 + (f.z1 - f.z0) * t);
        bag.rotation.y += dt * 5;
        bag.visible = true;
        if (t >= 1) this._land(h);
        return;
      }
      const a = h.a;
      call(bag, 'setFill', h.fill);
      bag.visible = a.visible !== false;
      if (h.notes) {
        // Only while he's actually stuffing the bag.
        h.notes.visible = bag.visible && a.brain === h.b && h.b.mode === 'till';
        if (h.notes.visible) {
          const lh = this._w.copy(HAND).applyMatrix4(a.rig.joints.elbowL.matrixWorld);
          h.notes.position.copy(lh);
          h.notes.rotation.set(0, a.heading + 1.2, 0.3);
        }
      }
      if (!bag.visible) return;
      // Held by the neck: it hangs from his hand.
      const hp = this._v.copy(HAND).applyMatrix4(a.rig.joints.elbowR.matrixWorld);
      const tall = typeof bag.userData.height === 'number' ? bag.userData.height : 0.12 + 0.2 * h.fill;
      bag.position.set(hp.x, Math.max(a.pos.y + 0.03, hp.y - tall * 0.9), hp.z);
      bag.rotation.set(0, a.heading, 0);
    }

    _land(h) {
      const s = h.s;
      const bag = h.bag;
      h.bag = null;
      h.flying = null;
      const amount = h.partial ? this._bagValue(h) : h.total;
      h.drop = this._addDrop(s, bag, amount, h, h.partial);
      this._sfx('bagThrow', s.hold.bag.x, s.hold.bag.z, 6);
      this._phase(h, 'thrown');
    }

    // ---------------------------------------------------------- the bag
    _addDrop(s, mesh, amount, h, partial) {
      const at = s.hold.bag;
      mesh.position.set(at.x, at.y, at.z);
      mesh.visible = true;
      call(mesh, 'setFill', Math.max(0.35, h ? (partial ? h.fill : 1) : 0.6));
      const drop = { s, mesh, amount, h, partial: !!partial, item: null, taken: false };
      drop.item = this._register({ id: 'holdup_bag', kind: 'holdupBag', x: at.x, y: at.y + 0.1, z: at.z, radius: 1.7, label: 'Take the bag (' + VH.util.formatMoney(amount) + ')', drop });
      this.drops.push(drop);
      return drop;
    }

    _removeDrop(drop) {
      const i = this.drops.indexOf(drop);
      if (i >= 0) this.drops.splice(i, 1);
      this._unregister(drop.item);
      drop.item = null;
      this._removeMesh(drop.mesh);
      drop.mesh = null;
    }

    _updateDrops() {
      const p = this.game.player;
      for (let i = this.drops.length - 1; i >= 0; i--) {
        const d = this.drops[i];
        const H = d.s.hold.bag;
        const dist = Math.hypot(p.pos.x - H.x, p.pos.z - H.z);
        // Walking up to it is enough.
        if (dist < 1.1 && Math.abs(p.pos.y + 1 - H.y) < 1.6 && !p.inVehicle && !p.isDead && this.game.state === 'playing') this._takeDrop(d);
        else if (dist > PROPS_FAR && !(d.h && d.h === this.active)) this._removeDrop(d);
      }
    }

    /** Jay takes a bag off the counter: the money is his now. */
    _takeDrop(drop) {
      if (!drop || drop.taken) return;
      const g = this.game;
      drop.taken = true;
      this._removeDrop(drop);
      const h = drop.h && drop.h === this.active ? drop.h : null;
      let amount = drop.amount;
      let clean = false;
      if (h) {
        clean = this._clean(h);
        if (clean) amount = Math.round(amount * (1 + CLEAN_BONUS));
        h.paid += amount;
        h.bagTaken = true;
        h.drop = null;
      }
      g.giveMoney(amount, 'hold-up');
      this._sfx('bagGrab');
      g.hud.popScore('HOLD-UP', amount);
      this._say('jay', 'jay', 'grab', 1);
      VH.events.emit('holdup:bag', { s: drop.s, amount, partial: drop.partial, clean });
      if (clean) {
        g.hud.showToast("Clean job: nobody's calling this in.");
        this._sting('clean');
      } else if (h && (h.reported || (g.police && g.police.level > 0))) {
        g.hud.showToast(g.police && g.police.level > 0 ? 'Get away!' : 'Get away: the police are on their way.');
        this._getaway(drop.s);
      }
      // The books change as soon as the money does (a save made now keeps it).
      if (!h) {
        this._robbed(drop.s, amount); // a bag left behind (a hero's): still a robbery
        return;
      }
      this._count(h, amount);
      if (!h.safeAvail || h.safeDone) this._end('done');
    }

    /** No alarm, nobody out of the door, the camera shot out and no call on its way. */
    _clean(h) {
      if (h.reported || !this._camBroken(h.s)) return false;
      const pol = this.game.police;
      if (!pol) return true;
      if (pol.level > 0) return false;
      for (const r of pol._reports || []) if (Math.hypot(r.x - h.s.centre.x, r.z - h.s.centre.z) < 40) return false;
      return true;
    }

    // ---------------------------------------------------------- the safe
    _orderSafe(h) {
      h.safeOrdered = true;
      // A fresh start: however long the gun was down while the bag sat there.
      h.idle = 0;
      h.waver = 0;
      h.grace = GRACE;
      this._say('jay', 'jay', 'safe', 1);
      this._say(h.b.voice, 'clerk', 'safeAgree', 1);
      this._phase(h, 'safeWalk');
    }

    _safeWalk(h) {
      const a = h.a;
      const b = h.b;
      b.mode = 'walk';
      const goal = h.path[h.pi];
      b.goal = goal;
      if (Math.hypot(goal.x - a.pos.x, goal.z - a.pos.z) < 0.35) {
        h.pi++;
        if (h.pi >= h.path.length) return this._phase(h, 'safeDial');
        b.goal = h.path[h.pi];
      }
      // Never stuck behind the counter for long.
      if (h.pt > 10) {
        const k = h.s.hold.kneel;
        a.pos.x = k.x;
        a.pos.z = k.z;
        this._phase(h, 'safeDial');
      }
    }

    _safeDial(h, dt, held) {
      const b = h.b;
      const P = PERSONALITIES[h.pers];
      b.goal = h.s.hold.kneel;
      if (h.panicT > 0) {
        b.mode = 'kneelHands';
        return;
      }
      h.stalled = this._stall(h, dt, held);
      b.mode = h.stalled ? 'kneelHands' : 'kneel';
      if (!held || h.stalled) return;
      const speed = h.pers === 'stubborn' && h.pushT <= 0 ? 0.55 : P.speed;
      const boost = h.boostT > 0 ? h.boostK : 1;
      h.safeP = Math.min(1, h.safeP + (dt / DIAL_TIME) * speed * boost);
      h.tickT -= dt * boost;
      if (h.tickT <= 0) {
        h.tickT = rnd(0.18, 0.42);
        const S = h.s.hold.safe;
        this._sfx('safeTick', S.x, S.z, 5);
        const pr = this.props.get(h.s.id);
        const dial = pr && pr.safe && pr.safe.userData.dial;
        if (dial) dial.rotation.z += (Math.random() < 0.3 ? -1 : 1) * rnd(0.3, 0.7);
      }
      h.chatT -= dt;
      if (h.chatT <= 0) {
        h.chatT = h.rng.range(P.chatter[0], P.chatter[1]) + 1;
        this._say(b.voice, 'clerk', 'safeDial');
      }
      if (h.safeP >= 1) this._phase(h, 'safeOpen');
    }

    _takeSafe() {
      const g = this.game;
      const h = this.active;
      if (!h || h.phase !== 'safeOpen') return;
      const amount = h.safeAmount;
      h.safePaid = amount;
      h.safeDone = true;
      h.ps.safeUntil = g.playTime + SAFE_REFILL;
      this._unregister(h.safeItem);
      h.safeItem = null;
      g.giveMoney(amount, 'hold-up');
      this._count(h, amount);
      this._sfx('bagGrab');
      g.hud.popScore('SAFE', amount);
      this._say('jay', 'jay', 'takeSafe', 1);
      VH.events.emit('holdup:safe', { s: h.s, amount });
      if (h.drop) this._phase(h, 'safeTaken'); // the bag's still on the counter
      else this._end('done');
    }

    // ---------------------------------------------------------- pressure
    /**
     * E with nothing to pick up (nothing of ours is an interactable while he
     * fills the bag, so this is every press then): a wallet, the safe, a
     * shout, or (held at the till) the bag now.
     */
    _pressE() {
      const g = this.game;
      if (g.state !== 'playing') return;
      if (this._wallet()) return;
      const h = this.active;
      if (!h) return;
      if (h.tellT > 0) this._shout(h);
      else if (this._canOrderSafe(h)) this._orderSafe(h);
      else if (h.phase === 'till') this._press = { h, t: 0 }; // a tap or a hold: _holdE
      else if (FILLING[h.phase]) this._shout(h);
    }

    /** The bag's thrown (or taken just now) and there's a safe: Jay can ask for it, gun in hand. */
    _canOrderSafe(h) {
      return h.phase === 'thrown' && h.safeAvail && !h.safeOrdered && this._armed();
    }

    _shout(h) {
      const now = this.game.time;
      // A hero caught reaching under the counter: that always counts.
      if (h.tellT > 0) {
        h.shoutAt = now;
        this._say('jay', 'jay', 'shout', 2);
        this._hurry(h, 1.6);
        this._backDown(h);
        return;
      }
      // Every press counts towards panicking a nervous clerk; the shout itself
      // (line and hurry) only every couple of seconds.
      h.presses.push(now);
      while (h.presses.length && now - h.presses[0] > 10) h.presses.shift();
      if (h.pers === 'nervous' && h.presses.length > 4 && h.panicT <= 0) {
        h.panicT = 1.5;
        h.presses.length = 0;
        this._say(h.b.voice, 'clerk', 'panic', 2);
        return;
      }
      if (now - h.shoutAt < SHOUT_COOLDOWN) return;
      h.shoutAt = now;
      this._say('jay', 'jay', 'shout', 2);
      this._hurry(h, 1.6);
      if (Math.random() < 0.6) this._say(h.b.voice, 'clerk', 'hurried', 1);
    }

    _hurry(h, k) {
      h.boostK = h.boostT > 0 ? Math.max(h.boostK, k) : k;
      h.boostT = 3;
      h.pushT = 4;
      h.stallT = 0;
    }

    /** A hero caught reaching under the counter thinks better of it. */
    _backDown(h) {
      if (h.tellT <= 0) return false;
      h.tellT = 0;
      h.pers = 'nervous';
      h.b.tremble = PERSONALITIES.nervous.tremble;
      this._say(h.b.voice, 'clerk', 'backDown', 2);
      VH.events.emit('holdup:hero', { s: h.s, backedDown: true });
      return true;
    }

    /** The tell ran out: he comes up with the shotgun. */
    _heroDraw(h) {
      const g = this.game;
      const s = h.s;
      const a = h.a;
      VH.events.emit('holdup:hero', { s, backedDown: false });
      this._tripAlarm(h);
      // He lets go of the bag: it lands on the counter for whoever wins.
      if (h.bag && h.fill >= 0.2) {
        const drop = this._addDrop(s, h.bag, Math.round(h.total * h.fill), null, true);
        drop.h = null;
      } else if (h.bag) this._removeMesh(h.bag);
      this._removeMesh(h.notes);
      h.bag = h.notes = null;
      this._say(h.b.voice, 'clerk', 'heroDraw', 2);
      h.b.busy = false;
      a.anim.handsUp = 0;
      a.anim.lookPitch = 0;
      a.anim.crouch = 0;
      a.weapon = 'shotgun';
      const brain = new VH.CombatBrain(g.combat, { weapon: 'shotgun', alert: true, hostile: true, accuracy: 0.4, aggression: 0.25, guard: { x: s.clerk.x, z: s.clerk.z, r: 2.5 } });
      brain.expired = () => false;
      a.brain = brain;
      this.stores.until[s.id] = Math.max(this.stores.until[s.id] || 0, g.playTime + VH.Stores.REFILL);
      g.hud.notify({ title: this.stores.brandName(s), text: 'The clerk had a shotgun under the counter!', icon: '⚠', tone: 'bad' });
      this._end('hero');
    }

    /** A shot that didn't hit him: a warning. */
    _gunshot(e) {
      const g = this.game;
      const s = this._inside;
      if (!s) return;
      // Walls muffle it: half the time nobody outside calls it in.
      const pol = g.police;
      if (pol && pol._reports && pol._reports.length && Math.random() < 0.5) {
        const r = pol._reports[pol._reports.length - 1];
        if (r.kind === 'shots' && Math.hypot(r.x - e.x, r.z - e.z) < 1) pol._reports.pop();
      }
      const h = this.active;
      if (!h || h.s !== s) {
        this._shoppersCower(s, null, true);
        return;
      }
      if (h.a.hitTime === g.time && h.a.lastAttacker === 'player') return; // that hit him: agent:hurt has it
      this._hurry(h, 2);
      this._shoppersCower(s, h, true);
      if (!this._backDown(h)) this._say(h.b.voice, 'clerk', 'warningShot', 1);
    }

    _hurt(e) {
      const h = this.active;
      if (h && e.agent === h.a && e.source === 'player') {
        if (h.phase === 'till' || h.phase === 'hands') h.fill = Math.min(0.99, h.fill + 0.15);
        this._hurry(h, 1.6);
        if (!this._backDown(h)) this._say(h.b.voice, 'clerk', 'hurt', 2);
        return;
      }
      const s = this._guardShop(e.agent);
      if (s && e.source === 'player') {
        const a = e.agent;
        if (a.brain && a.brain.setAlert) {
          a.brain.hostile = true;
          a.brain.setAlert(a);
        }
        if (!a._downSaid && a.health < a.maxHealth * 0.5) {
          a._downSaid = true;
          this._say('guard', 'guard', 'down', 1);
        }
      }
    }

    _died(e) {
      const s = this._guardShop(e.agent);
      if (s) this._shop(s.id).guardUntil = Math.max(this.game.playTime + VH.Stores.REFILL, this.stores.until[s.id] || 0); // back once the till's full (saved)
    }

    /** stores.js: the clerk of this shop was killed. The till locks. */
    clerkDied(s) {
      if (this.active && this.active.s === s) this._end('clerk');
    }

    // ---------------------------------------------------------- the alarm
    _report(s, heat, delay) {
      const g = this.game;
      const pol = g.police;
      if (!pol || !pol._reports || (g.missions && g.missions.suppressHeat)) return false;
      pol._reports.push({ t: delay, heat, x: s.centre.x, z: s.centre.z, kind: 'robbery' });
      return true;
    }

    _tripAlarm(h) {
      if (h.alarm) return;
      h.alarm = { t: ALARM_DELAY };
      if (!h.reported) {
        h.reported = true;
        this._report(h.s, 2, ALARM_DELAY);
      }
      this._startBell(h.s);
    }

    _startBell(s) {
      const old = this.bells.find((b) => b.s === s);
      if (old) {
        old.t = 0;
        return;
      }
      const au = this.game.audio;
      const voice = au && au.alarmBell ? au.alarmBell() : null;
      this.bells.push({ s, voice, t: 0 });
    }

    _updateBells(dt) {
      const p = this.game.player.pos;
      for (let i = this.bells.length - 1; i >= 0; i--) {
        const b = this.bells[i];
        b.t += dt;
        const d = Math.hypot(p.x - b.s.door.x, p.z - b.s.door.z);
        if (b.t > BELL_TIME || d > 120) {
          if (b.voice && b.voice.stop) b.voice.stop();
          this.bells.splice(i, 1);
        } else if (b.voice && b.voice.update) b.voice.update({ gain: this._gain(b.s.door.x, b.s.door.z, 14), pan: this._pan(b.s.door.x, b.s.door.z) });
      }
    }

    _stopBells() {
      for (const b of this.bells) if (b.voice && b.voice.stop) b.voice.stop();
      this.bells.length = 0;
    }

    // ---------------------------------------------------------- the camera
    /** A bullet's path (combat.js): did it go through a shop camera? */
    _ray(e) {
      for (const pr of this.props.values()) {
        if (pr.broken) continue;
        const c = pr.hit;
        const ox = c.x - e.ox;
        const oy = c.y - e.oy;
        const oz = c.z - e.oz;
        const t = ox * e.dx + oy * e.dy + oz * e.dz;
        if (t < 0 || t > e.dist + 0.35) continue;
        if (ox * ox + oy * oy + oz * oz - t * t > 0.09) continue;
        this._breakCam(pr.s, c.x, c.y, c.z, -e.dx, -e.dz);
      }
    }

    _explosion(e) {
      for (const s of this.stores.list) {
        const pr = this.props.get(s.id);
        const c = pr ? pr.hit : s.hold.cam;
        const d = Math.hypot(e.x - c.x, (e.y === undefined ? c.y : e.y) - c.y, e.z - c.z);
        if (d < 3) this._breakCam(s, c.x, c.y, c.z, 0, 0);
      }
    }

    _breakCam(s, x, y, z, nx, nz) {
      const g = this.game;
      if (this._camBroken(s)) return;
      const ps = this._shop(s.id);
      ps.camUntil = Math.max(g.playTime + VH.Stores.REFILL, this.stores.until[s.id] || 0);
      const pr = this.props.get(s.id);
      if (pr) {
        pr.broken = true;
        call(pr.cam, 'setBroken', true);
      }
      this._sfx('cameraSmash', x, z, 8);
      if (g.fx) {
        if (g.fx.sparks) g.fx.sparks(x, y, z, nx, nz, 14, 3);
        if (g.fx.glass) g.fx.glass(x, y, z, 8);
      }
      if (this._inside === s) {
        g.hud.showToast('Camera out.');
        if (this.active) this._say('jay', 'jay', 'camera');
      }
      VH.events.emit('holdup:camera', { s });
    }

    // ---------------------------------------------------------- props
    _addMesh(o) {
      o.traverse((m) => {
        if (m.isMesh) m.castShadow = true;
      });
      this.game.scene.add(o);
      return o;
    }

    _removeMesh(o) {
      if (o && o.parent) o.parent.remove(o);
    }

    _streamProps(dt) {
      const p = this.game.player.pos;
      for (const s of this.stores.list) {
        const d = Math.hypot(p.x - s.centre.x, p.z - s.centre.z);
        let pr = this.props.get(s.id);
        if (!pr && d < PROPS_NEAR) pr = this._buildProps(s);
        else if (pr && d > PROPS_FAR && !this.busy(s)) {
          this._dropProps(pr);
          continue;
        }
        if (pr) this._animateProps(pr, dt);
      }
    }

    _buildProps(s) {
      const H = s.hold;
      const pr = { s, cam: null, drawer: null, safe: null, hit: new THREE.Vector3(), broken: null, drawerOpen: 0, drawerCash: -1, safeOpen: 0, safeCash: null, safeLeftOpen: false };
      pr.cam = this._addMesh(model('cctv'));
      // Its plate flat on the front wall's inside face, the arm swung round
      // and the camera tilted down at the till.
      pr.cam.position.set(H.cam.x, H.cam.y, H.cam.z);
      pr.cam.rotation.set(0, s.yawIn, 0);
      const yaw = H.cam.heading - s.yawIn;
      call(pr.cam, 'aim', Math.atan2(Math.sin(yaw), Math.cos(yaw)), H.cam.pitch);
      pr.cam.updateMatrixWorld(true);
      // Where the lens is: the model says, or a little out from the mount.
      const lens = pr.cam.userData.lens || pr.cam.getObjectByName('lens');
      if (typeof lens === 'function') lens(pr.hit);
      else if (lens && lens.isObject3D) lens.getWorldPosition(pr.hit);
      else if (lens && lens.isVector3) pr.hit.copy(lens).applyMatrix4(pr.cam.matrixWorld);
      else pr.hit.set(H.cam.x + Math.sin(H.cam.heading) * 0.15, H.cam.y - 0.08, H.cam.z + Math.cos(H.cam.heading) * 0.15);
      pr.drawer = this._addMesh(model('tillDrawer'));
      pr.drawer.position.set(H.till.x, H.till.y, H.till.z);
      pr.drawer.rotation.set(0, H.till.heading, 0);
      call(pr.drawer, 'setOpen', 0);
      if (H.hasSafe) {
        pr.safe = this._addMesh(model('safe'));
        pr.safe.position.set(H.safe.x, KERB, H.safe.z);
        pr.safe.rotation.set(0, H.safe.heading, 0);
        call(pr.safe, 'setOpen', 0);
      }
      this.props.set(s.id, pr);
      return pr;
    }

    _dropProps(pr) {
      this._removeMesh(pr.cam);
      this._removeMesh(pr.drawer);
      this._removeMesh(pr.safe);
      this.props.delete(pr.s.id);
    }

    _animateProps(pr, dt) {
      const s = pr.s;
      const h = this.active && this.active.s === s ? this.active : null;
      const broken = this._camBroken(s);
      if (broken !== pr.broken) {
        pr.broken = broken;
        call(pr.cam, 'setBroken', broken);
      }
      call(pr.cam, 'update', dt);
      // The drawer slides out while he works the till.
      const working = !!h && (h.phase === 'till' || h.phase === 'throw' || h.phase === 'hands');
      const open = working && h.phase !== 'hands' ? 1 : 0;
      if (open !== pr.drawerOpen) {
        pr.drawerOpen = open > pr.drawerOpen ? Math.min(open, pr.drawerOpen + dt * 3) : Math.max(open, pr.drawerOpen - dt * 2);
        call(pr.drawer, 'setOpen', pr.drawerOpen);
      }
      const cash = h ? 1 - h.fill : this.stores.isOpen(s) ? 1 : 0;
      if (Math.abs(cash - pr.drawerCash) > 0.02 || (cash === 0) !== (pr.drawerCash === 0)) {
        pr.drawerCash = cash;
        call(pr.drawer, 'setCash', cash);
      }
      if (!pr.safe) return;
      const safeOpen = (h && (h.phase === 'safeOpen' || h.phase === 'safeTaken')) || pr.safeLeftOpen ? 1 : 0;
      if (safeOpen !== pr.safeOpen) {
        pr.safeOpen = safeOpen > pr.safeOpen ? Math.min(1, pr.safeOpen + dt / 1.2) : Math.max(0, pr.safeOpen - dt);
        call(pr.safe, 'setOpen', pr.safeOpen);
      }
      const full = !((this.perShop[s.id] && this.perShop[s.id].safeUntil) > this.game.playTime);
      if (full !== pr.safeCash) {
        pr.safeCash = full;
        call(pr.safe, 'setCash', full);
      }
    }

    _clearProps() {
      for (const pr of Array.from(this.props.values())) this._dropProps(pr);
    }

    // ---------------------------------------------------------- shoppers
    _streamShoppers(inside) {
      const g = this.game;
      const p = g.player.pos;
      for (const s of this.stores.list) {
        const d = Math.hypot(p.x - s.centre.x, p.z - s.centre.z);
        let list = this.shoppers.get(s.id);
        if (list) {
          for (let i = list.length - 1; i >= 0; i--) if (list[i].removed) list.splice(i, 1);
          if (d > SHOPPERS_FAR && !this.busy(s)) this._clearShoppers(s);
          continue;
        }
        if (d > SHOPPERS_NEAR || inside === s) continue;
        if (!this._clerk(s) || !this.stores.isOpen(s) || (g.missions && g.missions.run) || !s.hold.shoppers.length) continue;
        this._spawnShoppers(s);
      }
    }

    _spawnShoppers(s) {
      const g = this.game;
      const r = Math.random() * (1 + (g.environment.nightFactor || 0) * 0.6);
      const n = Math.min(s.hold.shoppers.length, r < 0.2 ? 0 : r < 0.55 ? 1 : r < 0.85 ? 2 : 3);
      const list = [];
      this.shoppers.set(s.id, list);
      for (let i = 0; i < n; i++) {
        const spot = this._freeSpot(s, null);
        if (!spot) break;
        const a = g.crowd.spawn(spot.x, spot.z, { faction: 'civilian', role: 'shopper', heading: spot.heading, name: 'Shopper' });
        a.brain = new ShopperBrain(this, s, spot, Math.random() < 0.5 ? 'shopper_m' : 'shopper_f');
        list.push(a);
      }
    }

    _freeSpot(s, except) {
      const list = this.shoppers.get(s.id) || [];
      const spots = s.hold.shoppers;
      for (let k = 0; k < 8; k++) {
        const spot = spots[Math.floor(Math.random() * spots.length)];
        if (spot === except) continue;
        if (list.some((a) => a.brain && a.brain.spot === spot)) continue;
        return spot;
      }
      return null;
    }

    /** Off to another shelf, round the gondolas by the cross aisle. */
    _shopperMove(b) {
      const spot = this._freeSpot(b.s, b.spot);
      if (!spot) {
        b.t = rnd(4, 8);
        return;
      }
      b.path = spot.lane === b.spot.lane ? [spot] : [b.spot.lane, spot.lane, spot];
      b.pi = 0;
      b.spot = spot;
      b.mode = 'walk';
      if (Math.random() < 0.15 && this._inside === b.s) this._say(b.voice, 'shopper', 'browse');
    }

    /** Down the aisle, out of the door and away. */
    _exitPath(b) {
      const H = b.s.hold;
      return [b.spot.lane, H.doorIn, b.s.door, H.out];
    }

    _bolt(a, b) {
      b.mode = 'bolt';
      b.path = this._exitPath(b);
      b.pi = 0;
      if (Math.hypot(a.pos.x - b.spot.lane.x, a.pos.z - b.spot.lane.z) < 0.6) b.pi = 1;
      this._say(b.voice, 'shopper', 'bolt', 1);
    }

    _shopperLeave(b) {
      b.mode = 'leave';
      b.path = this._exitPath(b);
      b.pi = 0;
    }

    /** A hold-up (or a shot) in the shop: everyone down. */
    _shoppersCower(s, h, warning) {
      const list = this.shoppers.get(s.id);
      if (!list) return;
      let said = false;
      for (const a of list) {
        const b = a.brain;
        if (a.dead || !(b instanceof ShopperBrain) || b.mode === 'out' || b.mode === 'leave' || b.escaped) continue;
        if (b.mode === 'bolt' && !warning) continue;
        if (b.mode !== 'cower' || warning) b.boltT = !b.robbed && Math.random() < 0.6 ? rnd(4, 10) : Infinity;
        b.mode = 'cower';
        b.h = h || b.h;
        b.calmT = rnd(5, 9);
        if (!said && Math.random() < 0.7) said = this._say(b.voice, 'shopper', 'plead');
      }
    }

    /** During a hold-up: the ones Jay isn't covering think about running. */
    _shoppersHoldUp(h, dt) {
      const list = this.shoppers.get(h.s.id);
      if (!list) return;
      for (const a of list) {
        const b = a.brain;
        if (a.dead || !(b instanceof ShopperBrain)) continue;
        b.covered = (b.mode === 'cower' || b.mode === 'bolt') && this.stores._covering(a);
        if (b.mode === 'cower') {
          b.h = h;
          if (!b.covered && !b.robbed) {
            b.boltT -= dt;
            if (b.boltT <= 0) this._bolt(a, b);
          }
        } else if (b.mode === 'bolt' && b.covered && !b.escaped) {
          // Covered as he runs: he freezes.
          b.mode = 'cower';
          b.boltT = rnd(4, 10);
        }
      }
    }

    /** A shopper got out of the door: they phone the police (once per hold-up). */
    _escaped(b) {
      const h = b.h;
      if (!h) return;
      h.witOut++;
      if (!h.reported) {
        h.reported = true;
        this._report(h.s, 2, PHONE_DELAY);
        if (this._inside === h.s) this.game.hud.showToast("Someone got out: they're calling the police!");
      }
    }

    _shoppersAfter(s) {
      const list = this.shoppers.get(s.id);
      if (!list) return;
      for (const a of list) {
        const b = a.brain;
        if (!(b instanceof ShopperBrain)) continue;
        b.covered = false;
        if (b.mode === 'cower') b.calmT = rnd(4, 9);
      }
    }

    /** Aiming at a cowering shopper close by, in the middle of holding up their shop: "Wallet. Now." */
    _walletTarget() {
      const s = this._inside;
      if (!s || !this.busy(s)) return null;
      const list = this.shoppers.get(s.id);
      if (!list) return null;
      const p = this.game.player.pos;
      for (const a of list) {
        const b = a.brain;
        if (a.dead || !(b instanceof ShopperBrain) || b.robbed || b.mode !== 'cower') continue;
        if (Math.hypot(a.pos.x - p.x, a.pos.z - p.z) > 3) continue;
        if (this.stores._covering(a)) return a;
      }
      return null;
    }

    _wallet() {
      const a = this._walletTarget();
      if (!a) return false;
      const g = this.game;
      const b = a.brain;
      b.robbed = true;
      b.boltT = Infinity;
      const amount = 15 + Math.floor(Math.random() * 66);
      this._say('jay', 'jay', 'wallet', 2);
      this._say(b.voice, 'shopper', 'wallet', 1);
      g.giveMoney(amount, 'wallet');
      g.hud.popScore('WALLET', amount);
      if (g.audio && g.audio.cash) g.audio.cash();
      VH.events.emit('holdup:wallet', { amount });
      return true;
    }

    _clearShoppers(s) {
      const crowd = this.game.crowd;
      for (const [id, list] of Array.from(this.shoppers)) {
        if (s && id !== s.id) continue;
        for (const a of list) if (!a.removed) crowd.remove(a);
        this.shoppers.delete(id);
      }
    }

    // ---------------------------------------------------------- the guard
    _guardShop(a) {
      if (!a) return null;
      for (const [id, g] of this.guards) if (g === a) return this.stores.byId.get(id);
      return null;
    }

    _updateGuards(dt, inside) {
      const g = this.game;
      const st = this.stores;
      for (const s of st.list) {
        const ps = this.perShop[s.id];
        let a = this.guards.get(s.id);
        if (a && a.removed) {
          this.guards.delete(s.id);
          a = null;
        }
        if (!ps || !ps.guard) {
          if (a) this._removeGuard(s);
          continue;
        }
        const clerk = st.clerks.get(s.id);
        const want = clerk && !clerk.removed && st.isOpen(s) && !(ps.guardUntil > g.playTime);
        if (!a && want && !this.busy(s) && inside !== s) a = this._spawnGuard(s);
        else if (a && (!clerk || clerk.removed)) {
          this._removeGuard(s);
          continue;
        }
        if (!a || a.dead) continue;
        const b = a.brain;
        // A gun drawn in his shop: a challenge, then a fight.
        if (b.state === 'idle' && !a._challenged && inside === s && this._armed()) {
          a._challenged = true;
          a._challengeT = 1.0;
          this._say('guard', 'guard', 'challenge', 2);
          this._say('jay', 'jay', 'guard', 1);
        }
        if (a._challengeT > 0) {
          a._challengeT -= dt;
          if (a._challengeT <= 0) {
            b.hostile = true;
            b.setAlert(a);
          }
        }
        if (b.state === 'fight' && inside) {
          a._lineT = (a._lineT || rnd(3, 6)) - dt;
          if (a._lineT <= 0) {
            a._lineT = rnd(6, 10);
            this._say('guard', 'guard', 'fight');
          }
        }
      }
    }

    _spawnGuard(s) {
      const g = this.game;
      const H = s.hold;
      const look = Object.assign({}, VH.Crowd.randomLook(), { top: 0x24304a, trim: 0x24304a, shirt: 0xdfe3ea, bottom: 0x1d2230, shoes: 0x151515, cap: true, longHair: false });
      const a = g.crowd.spawn(H.guard.x, H.guard.z, { look, faction: 'civilian', role: 'guard', persistent: true, heading: H.guard.heading, name: 'Guard', health: 110, armor: 30 });
      const b = new VH.CombatBrain(g.combat, { weapon: 'pistol', hostile: false, accuracy: 0.45, aggression: 0.3, guard: { x: H.guard.x, z: H.guard.z, r: 3 } });
      b.expired = () => false;
      a.brain = b;
      a.weapon = 'pistol';
      this.guards.set(s.id, a);
      return a;
    }

    _removeGuard(s) {
      const a = this.guards.get(s.id);
      if (a && !a.removed) this.game.crowd.remove(a);
      this.guards.delete(s.id);
    }

    _clearGuards() {
      for (const s of this.stores.list) this._removeGuard(s);
    }

    // ---------------------------------------------------------- the end
    /**
     * Finish (or abandon) the hold-up. why: 'done' (taken what there was),
     * 'left' (Jay walked out), 'idle' (stopped covering him), 'clerk' (shot
     * dead), 'hero' (he drew), 'abort' (death, arrest, a job, the title).
     */
    _end(why) {
      const g = this.game;
      const h = this.active;
      if (!h) return;
      this.active = null;
      const s = h.s;
      const b = h.b;
      const amount = h.paid + h.safePaid;
      const robbed = amount > 0;
      this._press = null;
      this._unregister(h.safeItem);
      h.safeItem = null;
      // A bag still in his hand goes back with him; one on the counter he
      // takes back too, unless he's dead (then it's anyone's).
      if (h.bag) this._removeMesh(h.bag);
      this._removeMesh(h.notes);
      h.bag = h.notes = null;
      h.flying = null;
      for (const d of this.drops.slice()) {
        if (d.h !== h) continue;
        if (why === 'clerk' && h.a.dead) d.h = null;
        else this._removeDrop(d);
      }
      if (b instanceof VH.Stores.ClerkBrain && h.a.brain === b && !h.a.dead) {
        b.busy = false;
        b.goal = null;
        b.tremble = 0.4;
        b.mode = 'cower';
        b._scared = 12;
      }
      this._snackItem(s, true);
      if (h.tension && h.tension.stop) h.tension.stop();
      h.tension = null;
      this._shoppersAfter(s);
      const clean = robbed && this._clean(h);
      if (robbed) {
        const hired = h.hired;
        if (!h.reported) this.after.push({ s, t: FOOTAGE_DELAY, left: false, rec: false });
        if (why !== 'abort') this._sting('done');
        const bits = [(h.safePaid && h.paid ? 'Bag and safe: ' : h.safePaid ? 'The safe: ' : h.partial ? 'Grabbed early: ' : 'Till emptied: ') + VH.util.formatMoney(amount) + '.'];
        if (h.alarm) bits.push('The alarm went off: police on the way.');
        else if (h.reported) bits.push('A witness called the police.');
        else if (clean) bits.push("Clean job: nobody's calling this in.");
        else if (!this._camBroken(s)) bits.push('The camera got a good look at you.');
        else bits.push(g.police && g.police.level > 0 ? 'The police are already on to you.' : 'Someone heard the shots: police are about.');
        if (hired) bits.push("They'll have a security guard next time.");
        g.hud.notify({ title: this.stores.brandName(s), text: bits.join(' '), icon: '$', tone: 'good' });
        if (why === 'left') this._say('jay', 'jay', 'leave');
        else if (why === 'done' && !h.a.dead) this._say(b.voice, 'clerk', 'after');
      } else if (why === 'left' || why === 'idle') {
        if (!h.a.dead) this._say(b.voice, 'clerk', 'abandoned', 1);
        g.hud.showToast(why === 'left' ? 'You walked out empty-handed.' : 'You lost him. He kept the bag.');
      }
      VH.events.emit('holdup:end', { s, robbed, amount, alarm: !!h.alarm, camera: !this._camBroken(s), witnessesOut: h.witOut, clean });
    }

    /** Money from this hold-up: the first of it makes it a robbery. */
    _count(h, amount) {
      if (h.counted) this.stores.cash += amount;
      else {
        h.counted = true;
        h.hired = this._robbed(h.s, amount);
      }
    }

    /** The books: a robbery of this shop. Returns true if it's now hiring a guard. */
    _robbed(s, amount) {
      const g = this.game;
      const st = this.stores;
      const ps = this._shop(s.id);
      st.until[s.id] = Math.max(st.until[s.id] || 0, g.playTime + VH.Stores.REFILL);
      st.robbed++;
      st.cash += amount;
      ps.n++;
      // A broken camera stays broken until the till's full again.
      if (ps.camUntil > g.playTime) ps.camUntil = Math.max(ps.camUntil, st.until[s.id]);
      if (ps.n >= 2 && !ps.guard) {
        ps.guard = true;
        return true;
      }
      return false;
    }

    /** Death, arrest, a job starting: drop everything. */
    _abort(hard) {
      if (this.active) this._end('abort');
      if (hard) {
        this.after.length = 0;
        this.getaways.length = 0;
        for (const d of this.drops.slice()) this._removeDrop(d);
      }
    }

    // ---------------------------------------------------------- the heat after
    _getaway(s) {
      const pol = this.game.police;
      this.getaways = this.getaways.filter((x) => x.s !== s);
      this.getaways.push({ s, t: GETAWAY_TIME, hot: !!pol && pol.level > 0 });
    }

    _updateAfter(dt, inside) {
      const g = this.game;
      for (let i = this.after.length - 1; i >= 0; i--) {
        const f = this.after[i];
        if (!f.left) {
          // The camera's state as Jay walks out decides it.
          if (inside !== f.s) {
            f.left = true;
            f.rec = !this._camBroken(f.s);
            if (!f.rec) this.after.splice(i, 1);
          }
          continue;
        }
        f.t -= dt;
        if (f.t > 0) continue;
        this.after.splice(i, 1);
        if (this._report(f.s, 1, 0)) {
          g.hud.notify({ title: 'CCTV', text: 'The ' + this.stores.brandName(f.s) + " camera footage is with the police. They know your face.", icon: '📷', tone: 'bad' });
          this._getaway(f.s);
        }
      }
      const pol = g.police;
      if (!pol) return;
      for (let i = this.getaways.length - 1; i >= 0; i--) {
        const w = this.getaways[i];
        w.t -= dt;
        if (pol.level > 0) w.hot = true;
        else if (w.hot) {
          this.getaways.splice(i, 1);
          g.hud.showToast('Clean getaway');
          VH.events.emit('holdup:getaway', { s: w.s });
          continue;
        }
        if (w.t <= 0) this.getaways.splice(i, 1);
      }
    }

    // ---------------------------------------------------------- interaction
    _register(def) {
      const I = this.game.interaction;
      I.register(def);
      return I.items[I.items.length - 1];
    }

    _unregister(item) {
      if (!item) return;
      const I = this.game.interaction;
      const i = I.items.indexOf(item);
      if (i >= 0) I.items.splice(i, 1);
      if (I.current === item) {
        I.current = null;
        VH.events.emit('interaction:focus', { item: null });
      }
    }

    /** The "Buy snacks" prompt steps aside during a hold-up. */
    _snackItem(s, on) {
      const id = s.id + '_buy';
      for (const it of this.game.interaction.items) {
        if (it.id !== id) continue;
        it.enabled = on;
        if (!on && this.game.interaction.current === it) {
          this.game.interaction.current = null;
          VH.events.emit('interaction:focus', { item: null });
        }
      }
    }

    // ---------------------------------------------------------- voices
    /**
     * Say a line from data/holdup-lines.js as an ambient line. force: 0 waits
     * its turn (a line every couple of seconds at most), 1 skips the wait, 2
     * also takes the place of a line of ours still waiting. Never more than
     * one line queued; nothing during a cutscene or a phone call. A forced
     * line cuts our small talk short (_hushChat).
     */
    _say(who, group, key, force, sub) {
      const g = this.game;
      const d = g.dialogue;
      if (!d || !d.play) return false;
      if (d.mode === 'scene' || d.mode === 'phone' || d.mode === 'blackout') return false;
      const now = g.time;
      if (!force && now < this._sayAt) return false;
      if (force) this._hushChat();
      if (d.queue && d.queue.length) {
        if (force !== 2) return false;
        d.queue = d.queue.filter((q) => {
          if (!q.lines || !this._mine.has(q.lines[0])) return true;
          q.resolve();
          return false;
        });
        if (d.queue.length) return false;
      }
      const text = this._pick(group, key, sub);
      if (!text) return false;
      if (!this._cast && d.addCast) {
        d.addCast(CAST);
        this._cast = true;
      }
      const line = [who, text];
      this._mine.add(line);
      if (key === 'greet' || key === 'browse') this._chat.add(line);
      d.play([line], { mode: 'ambient' });
      this._sayAt = now + rnd(1.5, 3);
      return true;
    }

    /** "Evening." or a shopper's mutter: dropped, or cut off, for anything that matters. */
    _hushChat() {
      const d = this.game.dialogue;
      if (!d || !d.queue) return;
      const chat = (q) => !!q && q.mode === 'ambient' && !!q.lines && this._chat.has(q.lines[0]);
      if (d.queue.some(chat)) d.queue = d.queue.filter((q) => !chat(q) || (q.resolve(), false));
      if (chat(d.current) && d._finishCurrent && d._next) {
        d._finishCurrent(true);
        d._next();
      }
    }

    _pick(group, key, sub) {
      const D = VH.Data && VH.Data.holdupLines;
      let pool = D && D[group] && D[group][key];
      if (pool && !Array.isArray(pool)) pool = pool[sub] || pool.any || null;
      if (!pool || !pool.length) pool = FALLBACK[group] && FALLBACK[group][key];
      if (!pool || !pool.length) return null;
      const lk = group + '.' + key + '.' + (sub || '');
      let i = Math.floor(Math.random() * pool.length);
      if (pool.length > 1 && i === this._last[lk]) i = (i + 1) % pool.length;
      this._last[lk] = i;
      let e = pool[i];
      if (Array.isArray(e)) e = e[1];
      if (e && typeof e === 'object') e = e.text;
      return typeof e === 'string' ? e : null;
    }

    // ---------------------------------------------------------- HUD
    _buildHud() {
      const el = document.createElement('div');
      el.className = 'vh-holdup';
      el.innerHTML =
        '<div class="hu-head"><b>HOLD-UP</b><span class="hu-shop"></span></div>' +
        '<div class="hu-state"></div>' +
        '<div class="hu-bar"><i></i><em></em></div>' +
        '<div class="hu-chips"><span class="hu-alarm"></span><span class="hu-cam"></span><span class="hu-wit"></span></div>' +
        '<div class="hu-key"><kbd></kbd><span></span></div>';
      this.game.hud.root.appendChild(el);
      const q = (c) => el.querySelector(c);
      this.hud = { el, shop: q('.hu-shop'), state: q('.hu-state'), bar: q('.hu-bar'), fill: q('.hu-bar i'), cash: q('.hu-bar em'), alarm: q('.hu-alarm'), cam: q('.hu-cam'), wit: q('.hu-wit'), key: q('.hu-key'), kbd: q('.hu-key kbd'), keyText: q('.hu-key span') };
    }

    _set(key, value, apply) {
      if (this._cache[key] === value) return;
      this._cache[key] = value;
      apply(value);
    }

    _hudUpdate() {
      const U = this.hud;
      if (!U) return;
      const h = this.active;
      this._set('on', !!h, (v) => U.el.classList.toggle('visible', v));
      if (!h) return;
      const g = this.game;
      this._set('shop', h.s.name, (v) => (U.shop.textContent = v));
      const [line, tone] = this._stateLine(h);
      this._set('state', line, (v) => (U.state.textContent = v));
      this._set('tone', tone, (v) => {
        U.el.classList.toggle('tell', v === 'tell');
        U.state.className = 'hu-state' + (v ? ' ' + v : '');
      });
      // The bar: the bag filling, or the safe's dial.
      const safe = h.phase === 'safeWalk' || h.phase === 'safeDial';
      let pct;
      let cash;
      if (safe) {
        pct = h.safeP;
        cash = 'SAFE';
      } else if (h.phase === 'safeOpen') {
        pct = 1;
        cash = VH.util.formatMoney(h.safeAmount);
      } else if (h.phase === 'hands' || h.phase === 'till' || h.phase === 'throw') {
        pct = h.fill;
        cash = VH.util.formatMoney(h.phase === 'hands' ? 0 : this._bagValue(h)); // what a grab would pay
      } else {
        pct = 1;
        cash = VH.util.formatMoney(h.drop ? h.drop.amount : h.paid);
      }
      this._set('pct', Math.round(pct * 100), (v) => (U.fill.style.width = v + '%'));
      this._set('cash', cash, (v) => (U.cash.textContent = v));
      this._set('safe', safe || h.phase === 'safeOpen', (v) => U.bar.classList.toggle('safe', v));
      // Chips: the alarm, the camera, the witnesses.
      const al = !h.alarm ? '🔔 Alarm quiet' : h.alarm.t > 0 ? '🔔 ALARM · police in 0:' + String(Math.ceil(h.alarm.t)).padStart(2, '0') : '🔔 ALARM · police called';
      this._set('alarm', al, (v) => (U.alarm.textContent = v));
      this._set('alarmOn', !!h.alarm, (v) => U.alarm.classList.toggle('bad', v));
      const out = this._camBroken(h.s);
      this._set('cam', out, (v) => {
        U.cam.textContent = v ? '📷 Camera out' : '📷 Camera recording';
        U.cam.classList.toggle('good', v);
        U.cam.classList.toggle('rec', !v);
      });
      const list = this.shoppers.get(h.s.id) || [];
      let n = 0;
      for (const a of list) if (!a.dead && !a.removed && a.brain instanceof ShopperBrain && !a.brain.escaped && a.brain.mode !== 'leave') n++;
      const wit = n || h.witOut ? '👥 ' + n + ' inside · ' + h.witOut + ' got away' : '👥 Nobody else here';
      this._set('wit', wit, (v) => (U.wit.textContent = v));
      this._set('witBad', h.witOut > 0, (v) => U.wit.classList.toggle('bad', v));
      // What E does right now (and how far a hold to grab the bag has got).
      const kbd = g.input.labelFor('interact');
      const it = g.interaction.current;
      let key = '';
      if (it && typeof it.kind === 'string' && it.kind.indexOf('holdup') === 0) key = it.label;
      else if (this._walletTarget()) key = 'Wallet. Now.';
      else if (h.tellT > 0) key = 'Shout';
      else if (this._canOrderSafe(h)) key = 'Open the safe';
      else if (h.phase === 'till') key = 'Shout · hold ' + kbd + ' Grab ' + cash;
      else if (FILLING[h.phase]) key = 'Shout';
      else if (h.safeItem) key = 'Take the cash';
      else if (h.drop) key = 'Take the bag';
      this._set('key', key, (v) => {
        U.key.classList.toggle('visible', !!v);
        U.keyText.textContent = v;
      });
      this._set('kbd', kbd, (v) => (U.kbd.textContent = v));
      const hold = this._press && this._press.h === h ? Math.min(1, this._press.t / HOLD_GRAB) : 0;
      this._set('hold', Math.round(hold * 20) / 20, (v) => U.key.style.setProperty('--hold', v));
    }

    _stateLine(h) {
      if (h.tellT > 0) return ["He's reaching under the counter!", 'tell'];
      if (h.panicT > 0) return ["He's panicking: ease off", 'warn'];
      switch (h.phase) {
        case 'hands':
          return ['Hands up', ''];
        case 'till':
          if (h.stalled) return ['Stalling...', 'warn'];
          return h.grace > 0 ? ['Filling the bag', ''] : ['Keep him covered', 'warn'];
        case 'throw':
          return ['Here comes the bag', ''];
        case 'thrown':
          if (!h.bagTaken) return ["Bag's on the counter", 'good'];
          return h.safeAvail && !h.safeOrdered ? ["There's a safe in the back", ''] : ['Done', 'good'];
        case 'safeWalk':
          return ['Going to the safe', ''];
        case 'safeDial':
          if (h.stalled) return ['Stalling...', 'warn'];
          return h.grace > 0 ? ['Opening the safe', ''] : ['Keep him covered', 'warn'];
        case 'safeOpen':
          return ["The safe's open: take the cash", 'good'];
        case 'safeTaken':
          return ["Bag's on the counter", 'good'];
      }
      return ['', ''];
    }

    // ---------------------------------------------------------- contract
    serialize() {
      const t = this.game.playTime;
      const perShop = {};
      for (const id of Object.keys(this.perShop)) {
        const r = this.perShop[id];
        const o = {};
        if (r.n) o.n = r.n;
        if (r.guard) o.guard = true;
        if (r.guardUntil > t) o.guardUntil = Math.round(r.guardUntil);
        if (r.safeUntil > t) o.safeUntil = Math.round(r.safeUntil);
        if (r.camUntil > t) o.camUntil = Math.round(r.camUntil);
        if (Object.keys(o).length) perShop[id] = o;
      }
      return { perShop, salt: this.salt };
    }

    load(data) {
      data = data || {};
      this.perShop = {};
      const src = data.perShop && typeof data.perShop === 'object' ? data.perShop : {};
      for (const id of Object.keys(src)) {
        const r = src[id] || {};
        this.perShop[id] = { n: Math.max(0, Math.floor(+r.n || 0)), guard: !!r.guard, guardUntil: +r.guardUntil || 0, safeUntil: +r.safeUntil || 0, camUntil: +r.camUntil || 0 };
      }
      this.salt = data.salt ? data.salt >>> 0 : (Math.random() * 1e9) >>> 0;
      this._clearGuards();
      for (const pr of this.props.values()) {
        pr.broken = null;
        pr.safeCash = null;
        pr.safeLeftOpen = false;
      }
    }

    /** Quit to the title (or a load): nothing left half done. */
    stop() {
      if (this.active) this._end('abort');
      for (const d of this.drops.slice()) this._removeDrop(d);
      this.after.length = 0;
      this.getaways.length = 0;
      this._stopBells();
      this._inside = null;
      this._hudUpdate();
    }

    reset() {
      this.stop();
      this._clearShoppers();
      this._clearGuards();
      this._clearProps();
      this.perShop = {};
      this.salt = (Math.random() * 1e9) >>> 0;
    }
  }

  HoldUp.ShopperBrain = ShopperBrain;
  HoldUp.PERSONALITIES = PERSONALITIES;
  VH.HoldUp = HoldUp;
})();
