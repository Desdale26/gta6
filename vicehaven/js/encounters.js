/*
 * encounters.js — random street encounters: there's always something going
 * on somewhere near Jay. Every couple of minutes of free roam one starts a
 * block or two away (80–250 m): a flashing "!" on the radar, a note in the
 * corner, and a card on the HUD that says what to do and how long is left.
 *
 *   cashvan    an armoured cash van doing its rounds: ram it or shoot it
 *              until the back doors burst and the cash bags spill out. The
 *              first hit brings two stars, and the guards jump out
 *   mugging    a bag snatch: catch the mugger (knock him down, hit him, stun
 *              him) and the bag drops; hand it back, or walk off with it
 *   lift       a driver whose car has given up waves Jay down: pull up beside
 *              them and get them somewhere before the clock runs out
 *   race       a street racer at the kerb: pull up, honk, and race him to a
 *              landmark across town for his stake (losing costs nothing)
 *   wallet     a wallet glinting on the pavement: give it back to its owner
 *              (the worried one nearby), or keep the cash
 *   carthief   someone breaking into a parked car: stop them before they're
 *              in, or chase the car down and bring it back to its owner
 *   tourist    a tourist who'd like their photo taken
 *
 * They only happen in free roam: no story job, cutscene, hold-up, cab fare,
 * odd-job shift or challenge under way, and not with more than one star.
 * One that is ignored runs out after two or three minutes (or as soon as
 * Jay is far away); a story job starting stands it down at once. Whoever an
 * encounter put in the street walks (or drives) off when it's over and is
 * gone once out of sight: the people through their brain's expired(), the
 * cars through the traffic system.
 *
 * A world system (main.js WORLD_SYSTEMS). Pays through
 * game.giveMoney(x, 'street'). Emits encounter:start { kind },
 * encounter:done { kind, pay, good } (good: Jay helped somebody),
 * encounter:fail { kind, reason } (Jay got involved and it went wrong) and
 * encounter:end { kind, how } after every one. Saves lifetime stats only.
 *
 *   current()     { kind, label, x, z } of the one under way, or null
 *   force(kind)   start one close to Jay right now (debug and tests)
 */
(function () {
  'use strict';

  const VH = window.VH;
  const { clamp, dampAngle } = VH.math;

  const GAP = [90, 180]; //  seconds of free roam between one encounter and the next
  const LIFE = [120, 180]; // one Jay ignores runs out after this long
  const FAR = 360; //        ...or as soon as Jay is this far from it
  const KEEP = 85; //        walking this far from the owner with their bag or wallet keeps it
  const VAN_EVERY = 300; //  seconds of play between cash vans at least

  // Name, radar label, note, and how likely each is with Jay on foot / in a car.
  const KINDS = {
    cashvan: { name: 'Cash van', icon: '💰', w: [0.5, 1.2], note: 'An armoured cash van is doing its rounds nearby. Hit it hard enough and the back doors give.' },
    mugging: { name: 'Mugging', icon: '👜', w: [1.3, 0.8], note: 'There\'s trouble on the street nearby. Go and see.' },
    lift: { name: 'Stranded driver', icon: '🚗', w: [0.6, 1.2], note: 'A driver has broken down nearby and is waving for a lift.' },
    race: { name: 'Street race', icon: '🏁', w: [0.4, 1.3], note: 'A street racer nearby is looking for someone to race.' },
    wallet: { name: 'Lost wallet', icon: '👛', w: [1.2, 0.6], note: 'Somebody nearby has dropped their wallet.' },
    carthief: { name: 'Car thief', icon: '🔧', w: [1.0, 1.0], note: 'Someone is breaking into a parked car nearby.' },
    tourist: { name: 'Tourist', icon: '📷', w: [0.9, 0.4], note: 'A tourist nearby is looking for someone to take their photo.' },
  };
  // The methods that run each kind: _start<P>, _step<P>, _use<P>.
  const FLOW = { cashvan: 'Van', mugging: 'Mug', lift: 'Lift', race: 'Race', wallet: 'Wallet', carthief: 'Thief', tourist: 'Tourist' };

  // The people in them (dialogue.js cast: subtitle name, colour, voice).
  const CAST = {
    st_victim: { name: 'Passer-by', color: '#f78fb3', voice: { gender: 'female', pitch: 1.12, rate: 1.08 } },
    st_mugger: { name: 'Mugger', color: '#ff7a59', voice: { gender: 'male', pitch: 0.86, rate: 1.15 } },
    st_driver: { name: 'Driver', color: '#8fd3fe', voice: { gender: 'female', pitch: 1.02, rate: 1.05 } },
    st_racer: { name: 'Racer', color: '#d4ff1e', voice: { gender: 'male', pitch: 1.0, rate: 1.12 } },
    st_guard: { name: 'Guard', color: '#9ea9c7', voice: { gender: 'male', pitch: 0.82, rate: 1.0 } },
    st_owner: { name: 'Owner', color: '#7dffa8', voice: { gender: 'male', pitch: 1.05, rate: 1.0 } },
    st_thief: { name: 'Car thief', short: 'Car thief', color: '#ff9f1c', voice: { gender: 'male', pitch: 0.92, rate: 1.2 } },
    st_tourist: { name: 'Tourist', color: '#ffd166', voice: { gender: 'female', pitch: 1.15, rate: 0.98 } },
  };

  // What they say (ambient lines; {place} and {money} are filled in).
  const LINES = {
    snatch: [
      [['st_victim', 'Hey! My bag! Somebody stop him!']],
      [['st_victim', 'Thief! He\'s got my bag!']],
      [['st_victim', 'No, no, no! Come back here with that!']],
    ],
    caught: [
      [['st_mugger', 'Ow! All right, all right, have it!']],
      [['st_mugger', 'Fine! Take the stupid bag!']],
      [['jay', 'Not today, pal.']],
    ],
    bagBack: [
      [['st_victim', 'You got it back! Thank you, honestly. Here, take this.'], ['jay', 'Keep a tight grip on it.']],
      [['st_victim', 'My bag! Everything\'s still in it. You\'re a star.']],
    ],
    wave: [
      [['st_driver', 'Hey! Over here! My car\'s just given up on me.']],
      [['st_driver', 'Excuse me! Can you help? It won\'t start.']],
    ],
    lift: [
      [['st_driver', 'Can you get me to {place}? I\'m late as it is.'], ['jay', 'Buckle up.']],
      [['st_driver', '{place}, please. And if you could be quick about it...'], ['jay', 'Quick is what I do.']],
    ],
    liftDone: [
      [['st_driver', 'You\'re a lifesaver. That\'s for the petrol.']],
      [['st_driver', 'Made it! Here, you\'ve earned this.']],
    ],
    liftLate: [
      [['st_driver', 'Forget it, I\'ll get the bus from here.']],
      [['st_driver', 'Too late now. Let me out, I\'ll walk.']],
    ],
    challenge: [
      [['st_racer', 'Nice ride. First to {place} takes {money}. Honk if you\'re in.']],
      [['st_racer', 'Fancy a race? {place}. {money} says I beat you there. Give us a honk.']],
    ],
    raceWon: [
      [['st_racer', 'No way! Fine, fair\'s fair. Here.']],
      [['st_racer', 'You actually did it. Take the cash before I change my mind.']],
    ],
    raceLost: [
      [['st_racer', 'Too slow! Keep your money, mate. Practise a bit.']],
      [['st_racer', 'Ha! Better luck next time.']],
    ],
    guards: [
      [['st_guard', 'Hey! Back off the van!']],
      [['st_guard', 'We\'re under attack! Call it in!']],
    ],
    walletLost: [
      [['st_owner', 'Oh no. Where\'s my wallet? It was right here...']],
      [['st_owner', 'My wallet! I\'ve lost my wallet!']],
    ],
    walletBack: [
      [['st_owner', 'My wallet! I\'d be lost without it. Here, a little something.'], ['jay', 'Happens to everyone.']],
      [['st_owner', 'You found it! Thank you so much. Please, take this.']],
    ],
    thiefRuns: [
      [['st_thief', 'Rats! I\'m out of here!']],
      [['st_thief', 'Whoa, whoa! I was just leaving!']],
    ],
    carTaken: [
      [['st_owner', 'Hey! That\'s my car!']],
      [['st_owner', 'Stop! Somebody\'s nicking my car!']],
    ],
    ownerThanks: [
      [['st_owner', 'You stopped him! I owe you one. Take this.']],
      [['st_owner', 'That was my car he was in! Thank you. Here.']],
    ],
    carBack: [
      [['st_owner', 'My car! A few new scratches, but I don\'t care. Thank you!']],
      [['st_owner', 'You got it back! I can\'t believe it. Here, for your trouble.']],
    ],
    photoAsk: [
      [['st_tourist', 'Excuse me! Could you take my photo? Get the skyline in!']],
      [['st_tourist', 'Sorry to bother you! Would you take a picture of me?']],
    ],
    photoDone: [
      [['st_tourist', 'Perfect! Have a lovely day in Vicehaven!']],
      [['st_tourist', 'Oh, that\'s brilliant. Thank you! Here, for your help.']],
    ],
  };

  // Looks over a random one (crowd.js colours).
  const LOOKS = {
    mugger: { top: 0x23262b, trim: 0x23262b, shirt: 0x23262b, bottom: 0x2e3f5c, shoes: 0x202020, cap: true },
    thief: { top: 0x3b3d42, trim: 0x3b3d42, shirt: 0x1d2430, bottom: 0x1c1c1f, shoes: 0x202020, cap: true },
    guard: { top: 0x4a5560, trim: 0x2b3038, shirt: 0xd9d6cc, bottom: 0x2b3038, shoes: 0x202020, cap: true },
    tourist: { top: 0xff8a3d, trim: 0xff8a3d, shirt: 0xffffff, bottom: 0xd7cdb8, cap: true },
  };
  const VAN_COLOURS = [0x1f3a2a, 0x2a3550, 0x3a3f45];
  const RACERS = ['vireo', 'zephyr', 'drifter', 'ironclad', 'lowrider'];
  const BROKEN = ['pipit', 'halcyon', 'beater', 'mesa', 'tern', 'porter'];
  const TARGETS = ['halcyon', 'sovereign', 'tern', 'vireo', 'ironclad', 'mesa', 'pipit'];
  // Places nobody would ask a lift to or race to (interiors, the pier, rooftops,
  // private estates, the race starts' own markers).
  const NO_DRIVE = new Set(['club', 'pier', 'rooftop', 'interior', 'roof', 'mansion', 'fort']);
  const NO_DRIVE_ID = /^race_|_house$|^saltmarsh_docks$|^crestline_estates$/;
  const OFFS = [0, 0.5, -0.5, 1.0, -1.0, 1.5, -1.5, 2.1, -2.1];
  // Body classes that mean Jay's busy with something on screen (no new encounter then).
  const BUSY_BODY = ['cutscene', 'in-menu', 'map-open', 'phone-open', 'shop-open', 'photo-mode'];

  const rand = (lo, hi) => lo + Math.random() * (hi - lo);
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  const round = (x, to) => Math.round(x / to) * to;
  const money = (x) => VH.util.formatMoney(x);

  /** A random line set, with its {place} and {money} filled in. */
  function say(key, vars) {
    const set = pick(LINES[key]);
    return set.map(([who, text]) => [who, text.replace('{place}', (vars && vars.place) || 'there').replace('{money}', (vars && vars.money) || 'the money')]);
  }

  // ------------------------------------------------------------ models
  // Shared geometry and materials, made the first time anything needs them.
  let SHARED = null;
  function shared() {
    if (SHARED) return SHARED;
    const add = (col) => new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    // The glint on a dropped wallet: a soft star.
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const x = c.getContext('2d');
    const grad = x.createRadialGradient(32, 32, 0, 32, 32, 30);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.25, 'rgba(255,240,190,0.7)');
    grad.addColorStop(1, 'rgba(255,220,140,0)');
    x.fillStyle = grad;
    x.fillRect(0, 0, 64, 64);
    x.fillStyle = 'rgba(255,255,255,0.9)';
    x.fillRect(31, 2, 2, 60);
    x.fillRect(2, 31, 60, 2);
    const glintTex = new THREE.CanvasTexture(c);
    const paints = new Map();
    SHARED = {
      ring: new THREE.RingGeometry(0.4, 0.5, 28).rotateX(-Math.PI / 2),
      ringGold: add(new THREE.Color(1.8, 1.3, 0.35)),
      ringTeal: add(new THREE.Color(0.35, 1.6, 1.5)),
      beam: new THREE.CylinderGeometry(3.2, 3.2, 26, 24, 1, true).translate(0, 13, 0),
      beamMat: new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.62, 0.18), transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
      beamRing: new THREE.RingGeometry(2.9, 3.3, 40).rotateX(-Math.PI / 2),
      beamRingMat: add(new THREE.Color(1.6, 0.95, 0.3)),
      wallet: new THREE.BoxGeometry(0.12, 0.03, 0.095),
      walletMat: new THREE.MeshStandardMaterial({ color: 0x4a2e1c, roughness: 0.6 }),
      glint: new THREE.SpriteMaterial({ map: glintTex, color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
      handbag: new THREE.BoxGeometry(0.34, 0.24, 0.13).translate(0, 0.12, 0),
      handle: new THREE.TorusGeometry(0.1, 0.014, 6, 14, Math.PI).translate(0, 0.24, 0),
      bagMats: [0xb2224a, 0x1aa6a6, 0xd9a441, 0x5a3e8c].map((h) => new THREE.MeshStandardMaterial({ color: h, roughness: 0.55 })),
      sack: new THREE.BoxGeometry(0.36, 0.42, 0.24).translate(0, 0.21, 0),
      sackMat: new THREE.MeshStandardMaterial({ color: 0xb59a70, roughness: 0.9 }),
      // The cash van's back doors (hinged at their outer edges) and the dark hold behind them.
      doorL: new THREE.BoxGeometry(1.05, 1.86, 0.06).translate(-0.525, 0, -0.03),
      doorR: new THREE.BoxGeometry(1.05, 1.86, 0.06).translate(0.525, 0, -0.03),
      hole: new THREE.PlaneGeometry(2.06, 1.84),
      holeMat: new THREE.MeshBasicMaterial({ color: 0x050506 }),
      paint(hex) {
        let m = paints.get(hex);
        if (!m) paints.set(hex, (m = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.45, metalness: 0.35 })));
        return m;
      },
    };
    return SHARED;
  }

  /** A canvas bank bag (holdup-models.js) for the cash van, or a plain sack. */
  function cashSack() {
    const S = shared();
    const HM = VH.HoldupModels;
    try {
      if (HM && HM.cashBag) {
        const m = HM.cashBag();
        if (m.userData.setFill) m.userData.setFill(0.92);
        m.scale.setScalar(1.5);
        return m;
      }
    } catch (e) {
      // fall through to the sack
    }
    return new THREE.Mesh(S.sack, S.sackMat);
  }

  /** Something to pick up: a model over a glowing ring (spun and bobbed by _props). */
  function pickupProp(model, ringMat) {
    const S = shared();
    const g = new THREE.Group();
    const ring = new THREE.Mesh(S.ring, ringMat || S.ringGold);
    ring.position.y = 0.04;
    g.add(model, ring);
    return { group: g, model, ring };
  }

  // ------------------------------------------------------------ people
  /**
   * Everyone an encounter puts on the street. mode:
   *   stand    waits on the spot (wave, phone or fiddle with a lock); faces
   *            this.face, else Jay when he's close
   *   goto     walks (this.run: runs) to this.goal, then stands
   *   follow   comes up to Jay (an owner coming to say thanks)
   *   flee     runs from Jay (the mugger, the thief), round walls
   *   wander   strolls about this.home (someone looking for something)
   *   ride     sits in this.car, out of sight
   *   leave    walks off; removed once out of sight (expired)
   */
  class Person {
    constructor(game, mode, o) {
      this.game = game;
      this.mode = mode || 'stand';
      this.t = 0;
      this.home = null;
      this.goal = null;
      this.face = null;
      this.car = null;
      this.speed = 5.4;
      this.r = 6;
      this.wave = false;
      this.phone = false;
      this.fiddle = false;
      this.released = false;
      this._pick = 0;
      this._want = null;
      this._pause = 0;
      if (o) Object.assign(this, o);
    }

    set(mode, o) {
      this.mode = mode;
      this.t = 0;
      this._pick = 0;
      this._want = null;
      this.goal = null;
      if (o) Object.assign(this, o);
    }

    update(a, dt) {
      const g = this.game;
      this.t += dt;
      const an = a.anim;
      an.handsUp = 0;
      an.phone = 0;
      an.crouch = 0;
      an.cower = 0;
      an.aim = 0;
      an.sprint = false;
      if (g.dialogue && g.dialogue.talkLevel) {
        const tl = g.dialogue.talkLevel(a.charId);
        an.talk += (tl - an.talk) * Math.min(1, dt * 9);
        an.talkEnergy = g.dialogue.talkEnergy(a.charId);
      }
      const p = g.player;
      const jay = p.inVehicle && p.vehicle ? p.vehicle.pos : p.pos;
      const dj = Math.hypot(jay.x - a.pos.x, jay.z - a.pos.z);
      switch (this.mode) {
        case 'ride': {
          const v = this.car;
          a.moveSpeed = 0;
          a.hidden = true;
          a.inCar = true;
          if (v && !v.removed) a.pos.set(v.pos.x, v.pos.y, v.pos.z);
          return;
        }
        case 'goto': {
          const q = this.goal;
          if (!q || Math.hypot(q.x - a.pos.x, q.z - a.pos.z) < 0.8) {
            this.set('stand');
            a.moveSpeed = 0;
            return;
          }
          this._go(a, q.x, q.z, q.run ? 4.8 : 1.5, dt, false);
          return;
        }
        case 'follow': {
          const stop = p.inVehicle ? 4 : 1.8;
          if (dj > stop) this._go(a, jay.x, jay.z, dj > 6 ? 4.2 : 1.6, dt, false);
          else {
            a.moveSpeed = 0;
            a.heading = dampAngle(a.heading, Math.atan2(jay.x - a.pos.x, jay.z - a.pos.z), 5, dt);
          }
          return;
        }
        case 'flee':
          this._go(a, jay.x, jay.z, this.speed, dt, true);
          return;
        case 'leave':
          this._go(a, jay.x, jay.z, this.run ? 4.6 : 1.4, dt, true);
          return;
        case 'wander': {
          const h = this.home || a.pos;
          if (this._pause > 0) {
            this._pause -= dt;
            a.moveSpeed = 0;
            an.phone = this.phone ? 1 : 0;
            if (!this.goal) {
              const ang = Math.random() * Math.PI * 2;
              const r = Math.random() * this.r;
              this.goal = { x: h.x + Math.cos(ang) * r, z: h.z + Math.sin(ang) * r };
            }
            return;
          }
          const q = this.goal;
          if (!q || Math.hypot(q.x - a.pos.x, q.z - a.pos.z) < 0.8 || a.blocked > 0.8) {
            this.goal = null;
            this._pause = 1.5 + Math.random() * 3;
            a.moveSpeed = 0;
            return;
          }
          this._go(a, q.x, q.z, 1.25, dt, false);
          return;
        }
        default: {
          // stand
          a.moveSpeed = 0;
          const f = this.face || (dj < 14 ? jay : null);
          if (f) a.heading = dampAngle(a.heading, Math.atan2(f.x - a.pos.x, f.z - a.pos.z), 4, dt);
          if (this.wave && dj < 70) an.handsUp = 0.55 + 0.4 * Math.sin(this.t * 8);
          if (this.phone) an.phone = 1;
          if (this.fiddle) {
            an.crouch = 0.35;
            an.talk = Math.max(an.talk, 0.5 + 0.5 * Math.sin(this.t * 11));
          }
        }
      }
    }

    /**
     * Head for (tx, tz) (or away from it) round walls: every so often pick
     * the clearest heading close to the straight line.
     */
    _go(a, tx, tz, speed, dt, away) {
      const ph = this.game.physics;
      const dx = away ? a.pos.x - tx : tx - a.pos.x;
      const dz = away ? a.pos.z - tz : tz - a.pos.z;
      const want = Math.atan2(dx, dz);
      this._pick -= dt;
      if (this._pick <= 0 || this._want === null) {
        this._pick = 0.35;
        let best = want;
        let bestScore = -Infinity;
        for (const off of OFFS) {
          const h = want + off;
          let free = 0;
          for (let s = 1.5; s <= 6; s += 1.5) {
            if (ph.overlaps(a.pos.x + Math.sin(h) * s, a.pos.z + Math.cos(h) * s, 0.35, a.pos.y + 0.3, a.pos.y + 1.6)) break;
            free = s;
          }
          const score = free * 2 - Math.abs(off) * (away ? 1.2 : 2.2);
          if (score > bestScore) {
            bestScore = score;
            best = h;
          }
        }
        this._want = best;
      }
      a.heading = dampAngle(a.heading, this._want, 7, dt);
      a.moveSpeed = speed;
      a.anim.sprint = speed > 3;
    }

    /** Once an encounter is over: gone when out of sight (crowd.js asks every few frames). */
    expired(a, d) {
      if (!this.released) return false;
      if (a.dead) return a.deadTime > 30;
      return d > 110 || (d > 45 && !this.game.isVisible(a.pos.x, a.pos.y + 1, a.pos.z, 1.2));
    }
  }

  /** A car told to stop where it is (and stay stopped). */
  const HALT = {
    update(v) {
      v.input.accel = v.speed > 0.5 ? -1 : 0;
      v.input.steer = 0;
      v.input.boost = 0;
      v.input.handbrake = v.speed < 4 ? 1 : 0;
    },
    onBump() {},
  };

  // --------------------------------------------------------- the system
  class Encounters {
    constructor(game) {
      this.game = game;
      this.saveKey = 'encounters';
      this.ok = !!(game.crowd && game.vehicles && game.roadnet && game.hud && game.physics);
      this.cur = null;
      this.wait = rand(GAP[0], GAP[1]);
      this._fresh();
      this._freeT = 0;
      this._free = false;
      this._lastKind = null;
      this._vanAt = -Infinity;
      this._result = null;
      this._cache = {};
      if (!this.ok) return;
      if (game.dialogue && game.dialogue.addCast) {
        // addCast colours by its own palette unless told: these bring their own.
        game.dialogue.addCast(CAST);
      }
      this._buildCard();
      // One interaction item, moved to whoever Jay can talk to right now.
      const I = game.interaction;
      if (I) {
        I.register({ id: 'street_encounter', kind: 'streetEncounter', x: 0, y: -100, z: 0, radius: 2.2, label: '', enabled: false });
        this._item = I.items[I.items.length - 1]; // register() keeps its own copy
        I.on('streetEncounter', () => {
          if (this.cur) this._use(this.cur);
          return 1;
        });
      }
      VH.events.on('mission:start', () => {
        if (this.cur) this._finish(this.cur, 'stood down');
      });
      VH.events.on('player:died', () => {
        if (this.cur) this._bail(this.cur, 'Jay went down.');
      });
      VH.events.on('player:arrested', () => {
        if (this.cur) this._bail(this.cur, 'Jay was arrested.');
      });
      VH.events.on('vehicle:jack', (ev) => this._onJack(ev));
      VH.events.on('vehicle:enter', (ev) => this._onEnter(ev));
    }

    _fresh() {
      this.stat = { done: 0, helped: 0, failed: 0, earned: 0, best: 0, kinds: {} };
    }

    // ------------------------------------------------------- the HUD card
    _buildCard() {
      const el = (t, c, x) => VH.util.el(t, c, x);
      const card = (this.card = el('div', 'vh-street'));
      const head = el('div', 'st-head');
      this._cIcon = el('span', 'st-icon', '!');
      const names = el('div', 'st-names');
      this._cKicker = el('span', 'st-kicker', 'STREET');
      this._cTitle = el('b', 'st-title');
      names.append(this._cKicker, this._cTitle);
      this._cTimer = el('span', 'st-timer');
      head.append(this._cIcon, names, this._cTimer);
      this._cLine = el('div', 'st-line');
      this._cBar = el('div', 'st-bar');
      this._cFill = el('i');
      this._cBar.append(this._cFill);
      this._cHint = el('div', 'st-hint');
      card.append(head, this._cLine, this._cBar, this._cHint);
      this.game.hud.root.append(card);
    }

    _set(key, v, fn) {
      if (this._cache[key] === v) return;
      this._cache[key] = v;
      fn(v);
    }

    /** Draw the card for the encounter under way (or the result of the last one, for a moment). */
    _hud(dt) {
      const e = this.cur;
      let view = null;
      if (e) {
        let clock = e.clock;
        if (clock === null || clock === undefined) clock = e.engaged ? null : Math.max(0, e.life - e.age);
        view = { title: e.def.name, line: e.line || '', clock, bar: e.bar, hint: e.hint || '', tone: e.tone || '' };
      } else if (this._result) {
        this._result.t -= dt;
        if (this._result.t <= 0) this._result = null;
        else view = this._result.view;
      }
      this._set('show', !!view, (v) => {
        this.card.classList.toggle('visible', v);
        document.body.classList.toggle('street-on', v); // the checklist steps aside
      });
      if (!view) return;
      this._set('title', view.title, (v) => (this._cTitle.textContent = v));
      this._set('line', view.line, (v) => (this._cLine.textContent = v));
      const clock = typeof view.clock === 'number' ? Math.ceil(view.clock) : null;
      this._set('clock', clock, (v) => {
        this._cTimer.textContent = v === null ? '' : Math.floor(v / 60) + ':' + String(v % 60).padStart(2, '0');
        this._cTimer.classList.toggle('low', v !== null && v <= 15);
      });
      const bar = typeof view.bar === 'number' ? Math.round(clamp(view.bar, 0, 1) * 100) : -1;
      this._set('bar', bar, (v) => {
        this._cBar.classList.toggle('on', v >= 0);
        this._cFill.style.width = Math.max(0, v) + '%';
      });
      this._set('hint', view.hint, (v) => {
        this._cHint.innerHTML = '';
        this._cHint.classList.toggle('on', !!v);
        if (!v) return;
        // "[key] text": the key as a keycap.
        const m = /^\[([^\]]+)\]\s*(.*)$/.exec(v);
        if (m) this._cHint.append(VH.util.el('kbd', '', m[1]), document.createTextNode(' ' + m[2]));
        else this._cHint.textContent = v;
      });
      this._set('tone', view.tone, (v) => {
        this.card.className = 'vh-street visible' + (v ? ' ' + v : '');
      });
    }

    // ------------------------------------------------------------ helpers
    /** Where Jay is (his car, if he's in one). */
    _jay() {
      const p = this.game.player;
      return p.inVehicle && p.vehicle ? p.vehicle.pos : p.pos;
    }

    _key(action) {
      const k = this.game.input && this.game.input.labelFor ? this.game.input.labelFor(action) : '';
      return k && k !== '—' ? k : action === 'horn' ? 'H' : 'E';
    }

    /** Nowhere an encounter may be: the bay, inside the army base, airside at the airport, off the map. */
    _allowedAt(x, z, pad) {
      const L = this.game.layout;
      const m = pad || 0;
      const wf = L.waterfront;
      if (wf && x > wf.seawallX - 4 - m) return false;
      const fw = L.fort && L.fort.wall;
      if (fw && x > fw.x0 - 60 - m && x < fw.x1 + 60 + m && z > fw.z0 - 60 - m && z < fw.z1 + 60 + m) return false;
      const af = L.airport && L.airport.fence;
      if (af && x > af.minX - m && x < af.maxX + m && z > af.minZ - m && z < af.maxZ + m) return false;
      const b = L.config && L.config.bounds;
      if (b && (x < b.minX + 20 || x > b.maxX - 4 || z < b.minZ + 20 || z > b.maxZ - 20)) return false;
      return true;
    }

    /** Ground someone can stand on at (x, z) (street level, clear of walls), or null. */
    _standY(x, z) {
      const ph = this.game.physics;
      const y = ph.groundHeight(x, z, 3);
      if (y > 1.0 || y < -0.2) return null;
      if (ph.overlaps(x, z, 0.45, y + 0.3, y + 1.7)) return null;
      return y;
    }

    /** Can a car stand here: on the street, clear of walls and other cars? */
    _carFits(x, z, heading) {
      const g = this.game;
      const ph = g.physics;
      const y = ph.groundHeight(x, z, 50);
      if (y > 0.8 || y < -0.1) return false;
      const fx = Math.sin(heading);
      const fz = Math.cos(heading);
      for (const k of [-1.9, 0, 1.9]) if (ph.overlaps(x + fx * k, z + fz * k, 1.05, y + 0.35, y + 1.5)) return false;
      for (const o of g.vehicles.list) if (!o.removed && Math.hypot(o.pos.x - x, o.pos.z - z) < 7) return false;
      return true;
    }

    /** A point beside a road: `off` metres from its centre line on lane direction dir's side. */
    _side(road, dir, off, along) {
      return road.axis === 'z' ? { x: road.coord - dir * off, z: along } : { x: along, z: road.coord + dir * off };
    }

    /** A random lane point near[0]..near[1] from Jay, in the open city (out of his sight if `hidden`). */
    _lane(near, hidden) {
      const g = this.game;
      const j = this._jay();
      const lp = g.roadnet.randomLanePoint(Math.random, j.x, j.z, near[0], near[1]);
      if (!lp || !this._allowedAt(lp.x, lp.z, 12)) return null;
      const y = g.physics.groundHeight(lp.x, lp.z, 50);
      if (y > 0.8 || y < -0.1) return null;
      if (hidden && g.isVisible(lp.x, y + 1, lp.z, 4) && Math.hypot(lp.x - j.x, lp.z - j.z) < 170) return null;
      return lp;
    }

    /** A kerbside parking spot (and the pavement beside it), for a parked car. */
    _kerb(near, hidden) {
      const g = this.game;
      for (let i = 0; i < 60; i++) {
        const lp = this._lane(near, hidden && i < 45);
        if (!lp || !lp.road.parking) continue;
        const pk = g.roadnet.parkingPoint(lp.road, lp.dir, lp.along);
        if (!this._carFits(pk.x, pk.z, pk.heading)) continue;
        for (const da of [0, 2.5, -2.5]) {
          const w = this._side(lp.road, lp.dir, lp.road.width / 2 + 1.9, lp.along + da);
          const y = this._standY(w.x, w.z);
          if (y === null) continue;
          return { x: pk.x, z: pk.z, heading: pk.heading, road: lp.road, dir: lp.dir, along: lp.along, walk: { x: w.x, y, z: w.z } };
        }
      }
      return null;
    }

    /** A spot on the pavement (with a second one `apart` metres along it, if asked). */
    _pavement(near, hidden, apart) {
      for (let i = 0; i < 60; i++) {
        const lp = this._lane(near, hidden && i < 45);
        if (!lp) continue;
        const dir = Math.random() < 0.5 ? lp.dir : -lp.dir;
        const off = lp.road.width / 2 + 1.9;
        const w = this._side(lp.road, dir, off, lp.along);
        const y = this._standY(w.x, w.z);
        if (y === null) continue;
        const s = { x: w.x, y, z: w.z, road: lp.road, dir, along: lp.along, heading: lp.heading };
        if (!apart) return s;
        for (const sgn of [1, -1]) {
          const w2 = this._side(lp.road, dir, off, lp.along + sgn * apart);
          const y2 = this._standY(w2.x, w2.z);
          if (y2 !== null) {
            s.other = { x: w2.x, y: y2, z: w2.z };
            return s;
          }
        }
      }
      return null;
    }

    /** A named place minD..maxD from (fx, fz) a car can drive up to: { name, x, z } on its road. */
    _destination(fx, fz, minD, maxD) {
      const g = this.game;
      if (!g.places || !g.places.map) return null;
      const cand = [];
      for (const pl of g.places.map.values()) {
        if (!pl.name || !pl.kind || pl.roof || NO_DRIVE.has(pl.kind) || NO_DRIVE_ID.test(pl.id || '')) continue;
        const d = Math.hypot(pl.x - fx, pl.z - fz);
        if (d < minD || d > maxD || !this._allowedAt(pl.x, pl.z, 20)) continue;
        cand.push(pl);
      }
      while (cand.length) {
        const pl = cand.splice(Math.floor(Math.random() * cand.length), 1)[0];
        const lp = g.roadnet.nearestLane(pl.x, pl.z, undefined, 45);
        if (!lp || lp.dist > 45 || !this._allowedAt(lp.x, lp.z, 10)) continue;
        const y = g.physics.groundHeight(lp.x, lp.z, 50);
        if (y > 0.8 || y < -0.1) continue;
        return { name: pl.name, x: lp.x, z: lp.z, d: Math.hypot(lp.x - fx, lp.z - fz) };
      }
      return null;
    }

    /** Someone for an encounter (kept until it's over). */
    _person(e, x, z, who, mode, o, look) {
      const g = this.game;
      const L = Object.assign(VH.Crowd && VH.Crowd.randomLook ? VH.Crowd.randomLook() : {}, look || {});
      const a = g.crowd.spawn(x, z, { look: L, persistent: true, heading: (o && o.heading) || Math.random() * Math.PI * 2, health: (o && o.health) || 100 });
      a.charId = who;
      a.brain = new Person(g, mode, o);
      e.agents.push(a);
      return a;
    }

    /** A car for an encounter. */
    _car(e, type, x, z, heading, color) {
      const g = this.game;
      const spec = VH.Vehicle.typeSpec(type);
      if (!spec) return null;
      const col = color !== undefined ? color : pick(spec.palette || [0xb8bcc0]);
      const v = g.vehicles.spawn(type, x, z, heading, { role: 'encounter', persistent: true, color: col });
      v.role = 'encounter';
      v.persistent = true;
      v.encounter = e.kind;
      e.cars.push(v);
      return v;
    }

    /** Count damage Jay does to a car (its own health still goes down as usual). */
    _meter(e, v, fn) {
      const base = v.damage;
      v.damage = function (amount, source, kind) {
        if (source === 'player' && !this.wrecked && amount > 0) fn(amount, kind);
        return base.call(this, amount, source, kind);
      };
    }

    _addProp(e, prop, x, y, z) {
      prop.group.position.set(x, y, z);
      this.game.scene.add(prop.group);
      prop.x = x;
      prop.y = y;
      prop.z = z;
      prop.t = Math.random() * 6;
      e.props.push(prop);
      return prop;
    }

    _dropProp(e, prop) {
      if (!prop) return;
      if (prop.group.parent) prop.group.parent.remove(prop.group);
      if (prop.glint) prop.glint.material.dispose();
      const i = e.props.indexOf(prop);
      if (i >= 0) e.props.splice(i, 1);
    }

    /** A tall glowing marker on the street where Jay has to go. */
    _beam(e, x, z) {
      const S = shared();
      const g = new THREE.Group();
      const y = this.game.physics.groundHeight(x, z, 3);
      const col = new THREE.Mesh(S.beam, S.beamMat);
      const ring = new THREE.Mesh(S.beamRing, S.beamRingMat);
      ring.position.y = 0.06;
      g.add(col, ring);
      return this._addProp(e, { group: g, beam: true }, x, y, z);
    }

    /** Is Jay close enough to pick something up (on foot, or crawling over it in a car)? */
    _reach(x, z, y) {
      const p = this.game.player;
      if (p.state === 'dead') return false;
      if (p.inVehicle) {
        const v = p.vehicle;
        if (!v || v.kind !== 'car' || v.speed > 10) return false;
        return Math.hypot(v.pos.x - x, v.pos.z - z) < 2.6;
      }
      return Math.hypot(p.pos.x - x, p.pos.z - z) < 1.5 && Math.abs(p.pos.y - (y || p.pos.y)) < 1.8;
    }

    /** Did Jay hurt this person since the encounter began? */
    _hurtByJay(e, a) {
      if (!a || a.removed) return false;
      return a.lastAttacker === 'player' && a.hitTime >= e.t0;
    }

    /** Jay at the wheel of a car (any car but the ones in the encounter)? */
    _jayCar(e) {
      const p = this.game.player;
      const v = p.inVehicle ? p.vehicle : null;
      if (!v || v.kind !== 'car' || v.wrecked) return null;
      if (e && e.cars.includes(v) && v !== e.mine) return null;
      return v;
    }

    _line(lines) {
      const d = this.game.dialogue;
      if (d && d.play) d.play(lines, { mode: 'ambient' });
    }

    _audio(name, a, b) {
      const au = this.game.audio;
      if (au && au[name]) au[name](a, b);
    }

    _pan(x, z) {
      const c = this.game.combat;
      return c && c.pan ? c.pan(x, z) : 0;
    }

    // ------------------------------------------------------------- frame
    /** Free roam, with nothing else on: the countdown to the next encounter runs. */
    _freeRoam() {
      const g = this.game;
      const p = g.player;
      if (g.state !== 'playing') return false;
      if (g.missions && (g.missions.run || g.missions._retry)) return false;
      if (p.frozen || g.frozenControls) return false;
      // A cutscene, or a menu, the map, the phone, a shop counter or photo mode open.
      const body = document.body.classList;
      for (const c of BUSY_BODY) if (body.contains(c)) return false;
      if (p.state === 'dead' || g._arresting) return false;
      if (g.police && g.police.level > 1) return false;
      if (this._busyElsewhere()) return false;
      if (p.inVehicle && p.vehicle && p.vehicle.kind !== 'car') return false; // flying, or in the tank
      const j = this._jay();
      return this._allowedAt(j.x, j.z, 0);
    }

    /** Something else is using the HUD, the GPS or Jay's attention. */
    _busyElsewhere() {
      const g = this.game;
      if (g.challenges && g.challenges.run) return true;
      const taxi = g.activities && g.activities.taxi;
      if (taxi && (taxi.on || taxi.fare)) return true;
      const hu = g.stores && g.stores.holdup;
      if (hu && (hu.active || hu._inside)) return true;
      if (g.chopShops && g.chopShops.job) return true;
      const oj = g.oddJobs;
      if (oj && typeof oj.jobs === 'function') {
        try {
          if (oj.jobs().some((j) => j && j.active)) return true;
        } catch (err) {
          // odd jobs not ready yet
        }
      }
      return false;
    }

    update(dt) {
      if (!this.ok) return;
      this._freeT -= dt;
      if (this._freeT <= 0) {
        this._freeT = 0.5;
        this._free = this._freeRoam();
        // A story job, a cab fare or a shift taking over: this one stands down.
        if (this.cur && (this.game.missions && this.game.missions.run || this._busyElsewhere())) this._finish(this.cur, 'stood down');
      }
      const e = this.cur;
      if (e) this._step(e, dt);
      else if (this._free) {
        this.wait -= dt;
        if (this.wait <= 0) {
          // Still free this very moment? Then go (nowhere suitable just now: try again shortly).
          this._free = this._freeRoam();
          if (this._free && !this._start(this._pickKind())) this.wait = 6;
        }
      }
      this._props(dt);
      this._hud(dt);
    }

    _pickKind() {
      const g = this.game;
      const car = g.player.inVehicle ? 1 : 0;
      const list = [];
      let total = 0;
      for (const k of Object.keys(KINDS)) {
        if (k === this._lastKind) continue;
        if (k === 'cashvan' && g.playTime - this._vanAt < VAN_EVERY) continue;
        const w = KINDS[k].w[car];
        list.push([k, w]);
        total += w;
      }
      let r = Math.random() * total;
      for (const [k, w] of list) {
        r -= w;
        if (r <= 0) return k;
      }
      return list.length ? list[0][0] : 'wallet';
    }

    _start(kind, opts) {
      if (!KINDS[kind] || this.cur) return false;
      const g = this.game;
      const car = g.player.inVehicle;
      const o = Object.assign({ near: car ? [120, 250] : [80, 160], hidden: true }, opts || {});
      const e = {
        kind, def: KINDS[kind], phase: 'start', t: 0, age: 0, t0: g.time, life: rand(LIFE[0], LIFE[1]), engaged: false,
        x: 0, z: 0, agents: [], cars: [], props: [], line: '', bar: null, hint: '', clock: null, tone: '', goal: null, dest: null, paid: 0,
      };
      let ok = false;
      try {
        ok = this['_start' + FLOW[kind]](e, o);
      } catch (err) {
        console.warn('[Vicehaven] encounter ' + kind, err);
        ok = false;
      }
      if (!ok) {
        this._clear(e, true);
        return false;
      }
      this.cur = e;
      this._lastKind = kind;
      if (kind === 'cashvan') this._vanAt = g.playTime;
      if (!o.quiet) {
        g.hud.notify({ title: e.def.name, text: e.def.note, icon: e.def.icon, duration: 5200 });
        this._audio('click');
      }
      VH.events.emit('encounter:start', { kind });
      return true;
    }

    _step(e, dt) {
      const g = this.game;
      e.t += dt;
      e.age += dt;
      e.goal = null;
      e.clock = null;
      e.hint = '';
      e.tone = '';
      e.bar = null;
      e.talk = null;
      this['_step' + FLOW[e.kind]](e, dt);
      if (this.cur !== e) return; // finished this frame
      // The good people: Jay turning on one of them ends it.
      for (const a of e.agents) {
        if (a.good && (a.dead || this._hurtByJay(e, a))) {
          this._finish(e, 'fail', { reason: 'That\'s no way to help.' });
          return;
        }
      }
      // Ignored for too long, or Jay too far away.
      const j = this._jay();
      const far = !e.noFar && Math.hypot(j.x - e.x, j.z - e.z) > FAR;
      if (!e.engaged && (e.age > e.life || far)) {
        this._finish(e, 'expired');
        return;
      }
      if (e.engaged && far) {
        this._bail(e, 'Too far away. It\'s over.');
        return;
      }
      // The on-screen marker and the GPS line.
      if (e.goal) g.hud.trackObjective(e.goal, g.renderer.camera);
      else if (e._marked) g.hud.trackObjective(null);
      e._marked = !!e.goal;
      if (e.dest && VH.Minimap && VH.Minimap.route) {
        e.routeT = (e.routeT || 0) - dt;
        if (e.routeT <= 0) {
          e.routeT = 1;
          g.route = Math.hypot(e.dest.x - j.x, e.dest.z - j.z) > 30 ? VH.Minimap.route(g.layout, j.x, j.z, e.dest.x, e.dest.z) : null;
          e._routed = true;
        }
      }
      this._placeItem(e);
    }

    /** The E prompt goes to whoever Jay can talk to (e.talk = { a, label }). */
    _placeItem(e) {
      const it = this._item;
      if (!it) return;
      const t = e && e.talk;
      const on = !!(t && t.a && !t.a.dead && !t.a.removed && !t.a.hidden);
      if (on) {
        it.x = t.a.pos.x;
        it.y = t.a.pos.y + 1;
        it.z = t.a.pos.z;
        it.label = t.label;
      }
      if (it.enabled !== on) {
        it.enabled = on;
        const I = this.game.interaction;
        if (!on && I && I.current === it) {
          I.current = null;
          VH.events.emit('interaction:focus', { item: null });
        }
      }
    }

    _use(e) {
      const fn = this['_use' + FLOW[e.kind]];
      if (fn) fn.call(this, e);
    }

    /** Spin and bob what's lying in the street; glints twinkle. */
    _props(dt) {
      const e = this.cur;
      if (!e) return;
      for (const pr of e.props) {
        pr.t += dt;
        if (pr.beam) {
          pr.group.children[0].material.opacity = 0.12 + 0.06 * Math.sin(pr.t * 3);
          continue;
        }
        if (pr.fly) continue; // flying out of the van (_stepVan moves it)
        if (pr.model && pr.spin !== false) {
          pr.model.rotation.y += dt * 1.4;
          pr.model.position.y = 0.12 + Math.sin(pr.t * 2.2) * 0.06;
        }
        if (pr.glint) {
          const k = 0.5 + 0.5 * Math.sin(pr.t * 5.3) * Math.sin(pr.t * 1.7);
          pr.glint.scale.setScalar(0.45 + 0.75 * k);
          pr.glint.material.opacity = 0.5 + 0.5 * k;
        }
      }
    }

    // ------------------------------------------------------- endings
    /**
     * Wrap one up. how: 'done' (o.pay paid now, o.good), 'fail' (o.reason),
     * 'expired' (ignored) or 'stood down' (something else took over).
     */
    _finish(e, how, o) {
      if (this.cur !== e) return;
      o = o || {};
      const g = this.game;
      this.cur = null;
      const pay = Math.max(0, Math.round(o.pay || 0));
      if (pay > 0) {
        g.giveMoney(pay, 'street');
        g.hud.popScore(o.pop || e.def.name.toUpperCase(), pay);
        this._audio('cash');
      }
      const total = (e.paid || 0) + pay;
      const s = this.stat;
      let view = null;
      if (how === 'done') {
        s.done++;
        if (o.good) s.helped++;
        s.earned += total;
        s.best = Math.max(s.best, total);
        s.kinds[e.kind] = (s.kinds[e.kind] || 0) + 1;
        VH.events.emit('encounter:done', { kind: e.kind, pay: total, good: !!o.good });
        view = { title: e.def.name, line: (total > 0 ? '+' + money(total) + '  ·  ' : '') + (o.text || (o.good ? 'You did the right thing.' : 'Sorted.')), clock: null, bar: null, hint: '', tone: 'done' };
      } else if (how === 'fail') {
        s.failed++;
        VH.events.emit('encounter:fail', { kind: e.kind, reason: o.reason || '' });
        view = { title: e.def.name, line: o.reason || 'That didn\'t work out.', clock: null, bar: null, hint: '', tone: 'failed' };
        this._audio('fail');
      } else if (how === 'expired' && o.reason) {
        view = { title: e.def.name, line: o.reason, clock: null, bar: null, hint: '', tone: 'gone' };
      }
      this._result = view ? { view, t: 3.2 } : null;
      VH.events.emit('encounter:end', { kind: e.kind, how });
      this._clear(e, false);
      this.wait = rand(GAP[0], GAP[1]);
    }

    /** Over before it was finished: kept what was picked up (the van's bags), else failed (or just gone, if Jay never got involved). */
    _bail(e, reason) {
      if (e.paid > 0) this._finish(e, 'done', { good: false, text: 'Got away with ' + money(e.paid) + '.' });
      else this._finish(e, e.engaged ? 'fail' : 'expired', { reason });
    }

    /**
     * Clear the street. hard: remove everything now (a new game, a load,
     * quitting); otherwise the people walk off and the cars rejoin the
     * traffic, to go once Jay is out of sight of them.
     */
    _clear(e, hard) {
      const g = this.game;
      for (const a of e.agents) {
        if (a.removed) continue;
        if (hard) {
          g.crowd.remove(a);
          continue;
        }
        const b = a.brain;
        if (b && b.mode === 'ride') {
          // Out of the car first.
          const v = b.car;
          a.hidden = false;
          a.inCar = false;
          if (v && !v.removed) {
            const w = v.localToWorld(-(v.hx + 0.9), 0, {});
            a.pos.set(w.x, g.physics.groundHeight(w.x, w.z, v.pos.y + 1.5), w.z);
          }
        }
        if (b && b.released !== undefined) {
          b.released = true;
          if (b.mode !== 'flee') b.set('leave', { run: false });
        } else if (b) {
          // Guards and the like (combat brains): gone once out of sight.
          b.expired = (ag, d) => (ag.dead ? ag.deadTime > 30 : d > 120 || (d > 50 && !g.isVisible(ag.pos.x, ag.pos.y + 1, ag.pos.z, 1.2)));
        }
        a.persistent = false;
        a.good = false;
      }
      for (const v of e.cars) {
        if (v.removed) continue;
        // An ordinary car again (the chop shop turns encounter cars away while it runs).
        v.encounter = null;
        v.storyName = null;
        const mine = g.player.vehicle === v || (g.vehicles.entering && g.vehicles.entering.v === v);
        if (hard && !mine) {
          g.vehicles.remove(v);
          continue;
        }
        if (mine) continue; // Jay's now
        v.persistent = false;
        if (v.wrecked) v.role = 'wreck';
        else if (v.driver === 'ai' && g.traffic) {
          // Back into the traffic, at an ordinary pace.
          v.plow = false;
          v.role = 'traffic';
          const ctl = new VH.LaneDriver(g.traffic);
          if (ctl.reacquire(v, 30)) v.controller = ctl;
          else {
            v.driver = null;
            v.controller = null;
            v.role = 'abandoned';
          }
        } else v.role = 'abandoned';
      }
      for (const pr of e.props.slice()) this._dropProp(e, pr);
      e.agents = [];
      e.cars = [];
      e.talk = null;
      this._placeItem(null);
      if (e._marked) g.hud.trackObjective(null);
      if (e._routed && !(g.missions && g.missions.run)) g.route = null;
      if (!this.cur) document.body.classList.remove('street-on');
    }

    // ==================================================== the cash van
    _startVan(e, o) {
      const g = this.game;
      if (!VH.Vehicle.typeSpec('bulwark')) return false;
      let lp = null;
      for (let i = 0; i < 30 && !lp; i++) {
        const q = this._lane([Math.max(o.near[0], 60), Math.max(o.near[1], 140)], o.hidden && i < 22);
        if (q && !g.vehicles.list.some((v) => Math.hypot(v.pos.x - q.x, v.pos.z - q.z) < 12)) lp = q;
      }
      if (!lp) return false;
      const col = pick(VAN_COLOURS);
      const v = this._car(e, 'bulwark', lp.x, lp.z, lp.heading, col);
      if (!v) return false;
      v.driver = 'ai';
      v.storyName = 'the cash van';
      const ctl = new VH.LaneDriver(g.traffic, { speedMul: 0.8, gap: 2 });
      ctl.maxSpeed = 12;
      ctl.initAt(lp);
      ctl.destination = this._roundsStop(v);
      v.controller = ctl;
      v.setSpeed(7);
      e.van = v;
      e.x = v.pos.x;
      e.z = v.pos.z;
      e.color = col;
      e.meter = 0;
      e.need = 420;
      e.bags = [];
      e.total = round(rand(1500, 3000), 50);
      e.nBags = 4 + Math.floor(Math.random() * 3);
      e.phase = 'rounds';
      this._meter(e, v, (amount, kind) => this._vanHit(e, amount, kind));
      return true;
    }

    /** Somewhere a good way off for the van's next stop. */
    _roundsStop(v) {
      const g = this.game;
      for (let i = 0; i < 12; i++) {
        const lp = g.roadnet.randomLanePoint(Math.random, v.pos.x, v.pos.z, 200, 420);
        if (lp && this._allowedAt(lp.x, lp.z, 30)) return { x: lp.x, z: lp.z };
      }
      return null;
    }

    /** Jay hit the van: bullets count for more (it's armoured against a ram, not a magazine). */
    _vanHit(e, amount, kind) {
      if (this.cur !== e || e.phase === 'open') return;
      const g = this.game;
      e.meter += amount * (kind === 'bullet' ? 2.6 : 1);
      if (!e.hit) {
        e.hit = true;
        e.engaged = true;
        e.hitAt = e.t;
        if (g.police && g.police.setLevel && g.police.level < 2) g.police.setLevel(2, 'cashvan');
        // The driver puts his foot down.
        const v = e.van;
        const FD = VH.MissionBrains && VH.MissionBrains.FleeDriver;
        if (FD && !v.wrecked && v.driver === 'ai') {
          const f = new FD({ game: g }, v);
          f.lane.maxSpeed = 20;
          v.controller = f;
        }
        this._line(say('guards'));
      }
      if (e.meter >= e.need) this._vanOpen(e);
    }

    /** The back doors burst: the van stops, the bags spill out and the guards get out. */
    _vanOpen(e) {
      if (e.phase === 'open') return;
      const g = this.game;
      const v = e.van;
      e.phase = 'open';
      e.engaged = true;
      e.openAt = e.t;
      e.left = 90;
      if (g.police && g.police.setLevel && g.police.level < 2) g.police.setLevel(2, 'cashvan');
      // The doors.
      const S = shared();
      const mat = S.paint(e.color);
      const L = new THREE.Group();
      L.position.set(1.08, 1.6, -3.0);
      L.add(new THREE.Mesh(S.doorL, mat));
      const R = new THREE.Group();
      R.position.set(-1.08, 1.6, -3.0);
      R.add(new THREE.Mesh(S.doorR, mat));
      const hole = new THREE.Mesh(S.hole, S.holeMat);
      hole.position.set(0, 1.6, -3.012);
      hole.rotation.y = Math.PI;
      const parent = (v.model && (v.model.body || v.model.root)) || null;
      if (parent) parent.add(L, R, hole);
      e.doors = { L, R, k: 0 };
      if (!v.wrecked && v.driver === 'ai') {
        v.controller = HALT;
        v.plow = false;
      }
      const back = v.localToWorld(0, -v.hz - 0.4, {});
      if (g.fx && g.fx.sparks) g.fx.sparks(back.x, v.pos.y + 1.4, back.z, -Math.sin(v.yaw), -Math.cos(v.yaw), 18, 6);
      this._audio('crash', 0.7, this._pan(back.x, back.z));
      // The bags: the takings split unevenly between them.
      const n = e.nBags;
      const w = [];
      for (let i = 0; i < n; i++) w.push(0.6 + Math.random());
      const sum = w.reduce((s, x) => s + x, 0);
      let left = e.total;
      for (let i = 0; i < n; i++) {
        const value = i === n - 1 ? left : Math.max(150, round((e.total * w[i]) / sum, 10));
        left -= value;
        const pr = pickupProp(cashSack(), S.ringGold);
        const side = (i - (n - 1) / 2) * 0.55;
        const at = v.localToWorld(side, -v.hz + 0.3, {});
        this._addProp(e, pr, at.x, v.pos.y + 1.2, at.z);
        const out = 2.2 + Math.random() * 2.2;
        const bx = -Math.sin(v.yaw) * out + Math.cos(v.yaw) * side * 1.6;
        const bz = -Math.cos(v.yaw) * out - Math.sin(v.yaw) * side * 1.6;
        pr.fly = { vx: bx + v.vel.x * 0.5, vy: 2.5 + Math.random() * 2, vz: bz + v.vel.z * 0.5 };
        pr.ring.visible = false;
        pr.value = Math.max(50, value);
        e.bags.push(pr);
      }
      e.got = 0;
      // The guards come out of the cab.
      e.guardsDue = 1.1;
    }

    _vanGuards(e) {
      const g = this.game;
      const v = e.van;
      if (!g.combat || !g.combat.spawnEnemy) return;
      for (const side of [1, -1]) {
        const w = v.localToWorld(side * (v.hx + 1.0), v.hz * 0.45, {});
        if (g.physics.overlaps(w.x, w.z, 0.35, v.pos.y + 0.3, v.pos.y + 1.6)) continue;
        const look = Object.assign(VH.Crowd.randomLook(), LOOKS.guard);
        const a = g.combat.spawnEnemy(w.x, w.z, { faction: 'security', weapon: 'pistol', alert: true, accuracy: 0.22, aggression: 0.4, health: 90, armor: 25, look, heading: v.yaw + side * Math.PI / 2 });
        if (a) {
          a.charId = 'st_guard';
          e.agents.push(a);
        }
      }
    }

    _stepVan(e, dt) {
      const g = this.game;
      const v = e.van;
      if (!v || v.removed) {
        this._finish(e, e.paid > 0 ? 'done' : 'expired');
        return;
      }
      e.x = v.pos.x;
      e.z = v.pos.z;
      if (e.phase === 'rounds') {
        // Exploded before the doors gave: they blew off.
        if (v.wrecked) {
          this._vanOpen(e);
          return;
        }
        e.routeT2 = (e.routeT2 || 0) - dt;
        if (e.routeT2 <= 0 && v.controller instanceof VH.LaneDriver) {
          e.routeT2 = 2;
          const d = v.controller.destination;
          if (!d || Math.hypot(d.x - v.pos.x, d.z - v.pos.z) < 50) v.controller.destination = this._roundsStop(v);
        }
        e.line = e.hit ? 'Keep at it! The back doors are giving.' : 'Ram it or shoot it until the back doors give.';
        e.bar = e.hit ? e.meter / e.need : null;
        e.tone = e.hit ? 'hot' : '';
        e.goal = { x: v.renderPos.x, y: v.pos.y + 1.6, z: v.renderPos.z };
        // Got away: well ahead and out of sight for a while.
        if (e.hit && e.t - e.hitAt > 70) this._finish(e, 'fail', { reason: 'The van got away.' });
        return;
      }
      // Open: the doors swing, the bags land, Jay picks them up.
      if (e.doors && e.doors.k < 1) {
        e.doors.k = Math.min(1, e.doors.k + dt * 3);
        const k = 1 - Math.pow(1 - e.doors.k, 3);
        e.doors.L.rotation.y = -1.85 * k;
        e.doors.R.rotation.y = 1.85 * k;
      }
      if (e.guardsDue > 0) {
        e.guardsDue -= dt;
        if (e.guardsDue <= 0) this._vanGuards(e);
      }
      const ph = g.physics;
      for (const b of e.bags) {
        if (b.taken) continue;
        if (b.fly) {
          const f = b.fly;
          f.vy -= 14 * dt;
          b.x += f.vx * dt;
          b.y += f.vy * dt;
          b.z += f.vz * dt;
          const gy = ph.groundHeight(b.x, b.z, b.y + 0.5);
          if (b.y <= gy && f.vy < 0) {
            b.y = gy;
            if (f.vy < -3) {
              f.vy *= -0.3;
              f.vx *= 0.5;
              f.vz *= 0.5;
            } else b.fly = null;
          }
          b.group.position.set(b.x, b.y, b.z);
          b.model.rotation.x += dt * 6;
          b.ring.visible = !b.fly;
          if (!b.fly) b.model.rotation.x = 0;
          continue;
        }
        if (this._reach(b.x, b.z, b.y)) {
          b.taken = true;
          this._dropProp(e, b);
          e.got++;
          e.paid += b.value;
          g.giveMoney(b.value, 'street');
          g.hud.popScore('CASH BAG', b.value);
          this._audio('cash');
        }
      }
      e.left -= dt;
      e.clock = e.left;
      e.bar = e.got / e.bags.length;
      e.tone = 'hot';
      // Mark the nearest bag still lying there.
      const j = this._jay();
      let best = null;
      let bestD = Infinity;
      for (const b of e.bags) {
        if (b.taken) continue;
        const d = Math.hypot(b.x - j.x, b.z - j.z);
        if (d < bestD) {
          bestD = d;
          best = b;
        }
      }
      e.line = best ? 'Grab the cash bags! ' + e.got + ' of ' + e.bags.length + ' (' + money(e.paid) + ')' : '';
      if (best) {
        e.goal = { x: best.x, y: best.y - 0.6, z: best.z };
        e.x = best.x;
        e.z = best.z;
      }
      if (!best) this._finish(e, 'done', { good: false, text: 'Every bag. Now lose the police.' });
      else if (e.left <= 0) {
        if (e.paid > 0) this._finish(e, 'done', { good: false, text: 'The rest went with the van.' });
        else this._finish(e, 'fail', { reason: 'The cash went with the van.' });
      }
    }

    _useVan() {}

    // ======================================================== the mugging
    _startMug(e, o) {
      const s = this._pavement(o.near, o.hidden);
      if (!s) return false;
      const victim = this._person(e, s.x, s.z, 'st_victim', 'stand', null, { bag: true });
      victim.good = true;
      const mx = s.x + Math.sin(s.heading) * 1.3;
      const mz = s.z + Math.cos(s.heading) * 1.3;
      const mugger = this._person(e, mx, mz, 'st_mugger', 'stand', { speed: 5.7, health: 160 }, LOOKS.mugger);
      victim.brain.face = mugger.pos;
      mugger.brain.face = victim.pos;
      e.victim = victim;
      e.mugger = mugger;
      e.phase = 'wait';
      e.x = s.x;
      e.z = s.z;
      e.bagMat = pick(shared().bagMats);
      return true;
    }

    _stepMug(e, dt) {
      const g = this.game;
      const j = this._jay();
      const vic = e.victim;
      const mug = e.mugger;
      if (e.phase === 'wait') {
        e.line = 'Someone\'s in trouble nearby. Go and look.';
        e.x = vic.pos.x;
        e.z = vic.pos.z;
        // The snatch happens as Jay comes along (or anyway, after a while).
        if (Math.hypot(j.x - vic.pos.x, j.z - vic.pos.z) < 45 || e.t > 70) {
          e.phase = 'chase';
          e.t = 0;
          e.engaged = true;
          vic.look.bag = false;
          vic._paletteDirty = true;
          mug.look.bag = true;
          mug._paletteDirty = true;
          mug.brain.set('flee', { face: null });
          vic.brain.set('stand', { face: null, wave: true });
          this._line(say('snatch'));
          this._audio('click');
        }
        return;
      }
      if (e.phase === 'chase') {
        e.x = mug.pos.x;
        e.z = mug.pos.z;
        e.line = 'Catch the mugger! Knock him down to make him drop the bag.';
        e.tone = 'hot';
        e.goal = { x: mug.pos.x, y: mug.pos.y, z: mug.pos.z };
        if (e.t > 22) mug.brain.speed = 4.5; // out of breath
        const caught = mug.dead || mug.removed || mug.state === 'down' || mug.health < mug.maxHealth;
        if (caught) {
          const y = g.physics.groundHeight(mug.pos.x, mug.pos.z, mug.pos.y + 1);
          const S = shared();
          const bag = new THREE.Group();
          bag.add(new THREE.Mesh(S.handbag, e.bagMat), new THREE.Mesh(S.handle, e.bagMat));
          e.bag = this._addProp(e, pickupProp(bag, S.ringTeal), mug.pos.x + 0.6, y, mug.pos.z + 0.3);
          mug.look.bag = false;
          mug._paletteDirty = true;
          if (!mug.dead && !mug.removed) {
            mug.brain.set('flee', { speed: 4.6 });
            mug.brain.released = true;
          }
          if (!mug.dead) this._line(say('caught'));
          e.phase = 'bag';
          e.t = 0;
          return;
        }
        if (Math.hypot(j.x - mug.pos.x, j.z - mug.pos.z) > 130 || e.t > 100) {
          this._finish(e, 'fail', { reason: 'He got away with the bag.' });
        }
        return;
      }
      if (e.phase === 'bag') {
        const b = e.bag;
        e.x = b.x;
        e.z = b.z;
        e.line = 'He dropped the bag. Pick it up.';
        if (Math.hypot(j.x - b.x, j.z - b.z) > 5) e.goal = { x: b.x, y: b.y - 0.4, z: b.z };
        e.clock = 60 - e.t;
        if (this._reach(b.x, b.z, b.y)) {
          this._dropProp(e, b);
          e.bag = null;
          e.phase = 'return';
          e.t = 0;
          this._audio('click');
          vic.brain.set('stand', { wave: true });
        } else if (e.t > 60) this._finish(e, 'fail', { reason: 'Someone else picked the bag up.' });
        return;
      }
      // return: hand it back, or keep walking.
      e.x = vic.pos.x;
      e.z = vic.pos.z;
      e.line = 'Give the bag back to its owner. Or keep walking and keep it.';
      e.goal = { x: vic.pos.x, y: vic.pos.y, z: vic.pos.z };
      e.talk = { a: vic, label: 'Give the bag back' };
      if (Math.hypot(j.x - vic.pos.x, j.z - vic.pos.z) < 6 && g.player.inVehicle) e.hint = 'Get out to hand it over';
      else e.hint = '[' + this._key('interact') + '] Give it back';
      if (Math.hypot(j.x - vic.pos.x, j.z - vic.pos.z) > KEEP) {
        this._finish(e, 'done', { pay: round(rand(400, 800), 10), good: false, pop: 'KEPT THE BAG', text: 'Finders keepers. The bag\'s yours.' });
      }
    }

    _useMug(e) {
      if (e.phase !== 'return') return;
      e.victim.brain.set('stand', { wave: false });
      this._line(say('bagBack'));
      this._finish(e, 'done', { pay: round(rand(300, 600), 10), good: true, pop: 'BAG RETURNED', text: 'She got her bag back.' });
    }

    // ===================================================== the lift
    _startLift(e, o) {
      const k = this._kerb(o.near, o.hidden);
      if (!k) return false;
      const v = this._car(e, pick(BROKEN), k.x, k.z, k.heading);
      if (!v) return false;
      v.health = 420; // it's had it (it still drives, just)
      if (v.model && v.model.setDamage) v.model.setDamage(0.4);
      const d = this._person(e, k.walk.x, k.walk.z, 'st_driver', 'stand', { wave: true });
      d.good = true;
      e.broken = v;
      e.driver = d;
      e.phase = 'wait';
      e.x = d.pos.x;
      e.z = d.pos.z;
      return true;
    }

    _stepLift(e, dt) {
      const g = this.game;
      const p = g.player;
      const d = e.driver;
      const v = e.broken;
      if (e.phase === 'wait') {
        e.x = d.pos.x;
        e.z = d.pos.z;
        e.line = 'A driver\'s broken down. Pull up beside them in a car.';
        // Smoke from under the bonnet while anyone's near enough to see it.
        const j = this._jay();
        const dj = Math.hypot(j.x - d.pos.x, j.z - d.pos.z);
        if (v && !v.removed && dj < 90 && g.fx && g.fx.engineSmoke) {
          e.smokeT = (e.smokeT || 0) - dt;
          if (e.smokeT <= 0) {
            e.smokeT = 0.14;
            const f = v.localToWorld(0, v.hz - 0.5, {});
            g.fx.engineSmoke(f.x, v.pos.y + 1.0, f.z, 0.35, 0, 0);
          }
        }
        if (dj < 50 && !e.waved) {
          e.waved = true;
          this._line(say('wave'));
        }
        const car = this._jayCar(e);
        if (!car && dj < 25) e.hint = 'You\'ll need a car to give them a lift';
        if (car && car !== v && dj < 9 && car.speed < 2.5) {
          const dest = this._destination(d.pos.x, d.pos.z, 300, 800);
          if (!dest) {
            this._finish(e, 'expired');
            return;
          }
          e.dest = { x: dest.x, z: dest.z, label: dest.name };
          e.destName = dest.name;
          e.ride = car;
          const dist = dest.d * 1.3; // roads aren't straight lines
          e.timeLimit = Math.round(25 + dist / 9);
          e.left = e.timeLimit;
          e.payBase = clamp(round(300 + (dest.d - 300) * 1.0, 25), 300, 800);
          e.phase = 'ride';
          e.t = 0;
          e.engaged = true;
          e.noFar = true;
          d.brain.set('ride', { car });
          this._beam(e, dest.x, dest.z);
          this._audio('carDoor', false, 0);
          this._line(say('lift', { place: dest.name }));
        }
        return;
      }
      // ride
      e.x = e.dest.x;
      e.z = e.dest.z;
      e.left -= dt;
      e.clock = Math.max(0, e.left);
      e.line = 'Get them to ' + e.destName + '.';
      e.tone = e.left < 15 ? 'hot' : '';
      e.goal = { x: e.dest.x, y: 0.2, z: e.dest.z };
      const car = e.ride;
      if (!car || car.removed || car.wrecked) {
        this._finish(e, 'fail', { reason: 'That\'s the end of the lift.' });
        return;
      }
      // Jay out of the car (or in another one) for long: they give up.
      if (p.vehicle !== car) {
        e.outT = (e.outT || 0) + dt;
        e.hint = 'Get back in the car';
        if (e.outT > 8) {
          this._line(say('liftLate'));
          this._finish(e, 'fail', { reason: 'Your passenger got out and walked.' });
          return;
        }
      } else e.outT = 0;
      if (Math.hypot(car.pos.x - e.dest.x, car.pos.z - e.dest.z) < 12 && car.speed < 3) {
        const tip = Math.min(100, Math.round(Math.max(0, e.left) * 2));
        this._audio('carDoor', true, 0);
        this._line(say('liftDone'));
        this._finish(e, 'done', { pay: Math.min(900, round(e.payBase + tip, 10)), good: true, pop: 'LIFT', text: 'Dropped off, with ' + Math.ceil(Math.max(0, e.left)) + ' s to spare.' });
        return;
      }
      if (e.left <= 0) {
        this._line(say('liftLate'));
        this._finish(e, 'fail', { reason: 'Too late. They\'ll walk from here.' });
      }
    }

    _useLift() {}

    // ===================================================== the street race
    _startRace(e, o) {
      const k = this._kerb(o.near, o.hidden);
      if (!k) return false;
      const type = pick(RACERS.filter((t) => VH.Vehicle.typeSpec(t)));
      const v = this._car(e, type, k.x, k.z, k.heading);
      if (!v) return false;
      v.driver = 'ai';
      v.controller = HALT;
      v.lightsOn = true;
      v.storyName = 'the racer\'s ' + v.name;
      e.racer = v;
      e.phase = 'wait';
      e.x = v.pos.x;
      e.z = v.pos.z;
      return true;
    }

    _stepRace(e, dt) {
      const g = this.game;
      const p = g.player;
      const v = e.racer;
      if (!v || v.removed) {
        this._finish(e, e.engaged ? 'fail' : 'expired', { reason: 'The racer\'s gone.' });
        return;
      }
      const j = this._jay();
      if (e.phase === 'wait') {
        e.x = v.pos.x;
        e.z = v.pos.z;
        if (p.vehicle === v) {
          this._finish(e, 'fail', { reason: 'You took his car. No race, then.' });
          return;
        }
        const car = this._jayCar(e);
        const dj = Math.hypot(j.x - v.pos.x, j.z - v.pos.z);
        // A rev and a honk to call Jay over.
        v.horn = !!car && dj < 60 && dj > 15 && Math.sin(e.t * 2.6) > 0.82;
        e.line = car ? 'A racer wants a challenge. Pull up beside him.' : 'A racer wants a challenge. Bring a car.';
        if (car && dj < 16 && car.speed < 4) {
          if (!e.finish) {
            const dest = this._destination(v.pos.x, v.pos.z, 500, 1000);
            if (!dest) {
              this._finish(e, 'expired');
              return;
            }
            e.finish = dest;
            e.wager = clamp(round(500 + ((dest.d - 500) / 500) * 1000, 50), 500, 1500);
            this._line(say('challenge', { place: dest.name, money: money(e.wager) }));
          }
          e.line = 'Race him to ' + e.finish.name + ' for ' + money(e.wager) + '.';
          e.hint = '[' + this._key('horn') + '] Honk to race';
          if (g.input.down('horn')) {
            e.phase = 'count';
            e.t = 0;
            e.engaged = true;
            e.noFar = true;
            e.count = 4;
            v.horn = false;
            e.dest = { x: e.finish.x, z: e.finish.z, label: 'Finish: ' + e.finish.name };
            this._beam(e, e.finish.x, e.finish.z);
            this._line([['jay', 'You\'re on.']]);
          }
        }
        return;
      }
      e.x = e.finish.x;
      e.z = e.finish.z;
      e.goal = { x: e.finish.x, y: 0.2, z: e.finish.z };
      if (e.phase === 'count') {
        const n = 3 - Math.floor(e.t);
        e.line = 'Race to ' + e.finish.name + '. Get ready...';
        if (n !== e.count) {
          e.count = n;
          if (n > 0) {
            g.hud.bigText(String(n));
            this._audio('countdown', n);
          } else {
            g.hud.bigText('GO!', true);
            this._audio('countdown', 0);
            const RD = VH.MissionBrains && VH.MissionBrains.RaceDriver;
            const skill = rand(0.6, 0.8);
            if (RD) {
              const ctl = new RD({ game: g }, v, [{ x: e.finish.x, z: e.finish.z }], skill);
              ctl.go = true;
              v.controller = ctl;
            } else {
              const ctl = new VH.LaneDriver(g.traffic, { aggressive: true, speedMul: 1.3, ignoreRed: true });
              ctl.reacquire(v, 30);
              ctl.destination = { x: e.finish.x, z: e.finish.z };
              v.controller = ctl;
            }
            e.skill = skill;
            e.phase = 'race';
            e.t = 0;
          }
        }
        return;
      }
      // race
      const ctl = v.controller;
      const dJay = Math.hypot(j.x - e.finish.x, j.z - e.finish.z);
      const dHim = Math.hypot(v.pos.x - e.finish.x, v.pos.z - e.finish.z);
      e.clock = null;
      e.line = 'Race to ' + e.finish.name + ' · ' + (dJay <= dHim ? 'You\'re ahead' : 'He\'s ahead') + ' · ' + Math.round(dJay) + ' m';
      e.tone = dJay <= dHim ? '' : 'hot';
      e.bar = null;
      // Keep it close: he eases off when well ahead and pushes when well behind.
      if (ctl && ctl.lane) {
        const k = e.skill || 0.7;
        ctl.lane.speedMul = dHim + 120 < dJay ? 1.0 : dJay + 120 < dHim ? 1.9 : 1.5 * k;
      }
      if (p.vehicle !== this._jayCar(e) || !p.vehicle) {
        e.outT = (e.outT || 0) + dt;
        e.hint = 'Get back in a car';
      } else e.outT = 0;
      if (dJay < 18 && !(ctl && ctl.finished)) {
        this._line(say('raceWon'));
        this._finish(e, 'done', { pay: e.wager, good: false, pop: 'RACE WON', text: 'You beat him to ' + e.finish.name + '.' });
        return;
      }
      if ((ctl && ctl.finished) || dHim < 14) {
        this._line(say('raceLost'));
        this._finish(e, 'fail', { reason: 'He got there first. No money lost.' });
        return;
      }
      if (e.outT > 10) this._finish(e, 'fail', { reason: 'You left the race. No money lost.' });
      else if (e.t > 300) this._finish(e, 'fail', { reason: 'Out of time. No money lost.' });
    }

    _useRace() {}

    // ===================================================== the lost wallet
    _startWallet(e, o) {
      const s = this._pavement(o.near, o.hidden, 14 + Math.random() * 8);
      if (!s || !s.other) return false;
      const S = shared();
      const model = new THREE.Group();
      const w = new THREE.Mesh(S.wallet, S.walletMat);
      w.position.y = 0.016;
      const glint = new THREE.Sprite(S.glint.clone()); // its own copy: it twinkles
      glint.position.set(0.02, 0.16, 0);
      model.add(w, glint);
      const pr = this._addProp(e, { group: model, model: w, glint, spin: false }, s.x, s.y, s.z);
      w.rotation.y = Math.random() * Math.PI;
      const owner = this._person(e, s.other.x, s.other.z, 'st_owner', 'wander', { home: { x: s.other.x, z: s.other.z }, r: 5, phone: true });
      owner.good = true;
      e.wallet = pr;
      e.owner = owner;
      e.phase = 'find';
      e.x = s.x;
      e.z = s.z;
      return true;
    }

    _stepWallet(e) {
      const g = this.game;
      const own = e.owner;
      const j = this._jay();
      if (e.phase === 'find') {
        const w = e.wallet;
        e.x = w.x;
        e.z = w.z;
        e.line = 'Something\'s glinting on the pavement.';
        const dw = Math.hypot(j.x - w.x, j.z - w.z);
        if (dw < 30 && dw > 6) e.goal = { x: w.x, y: w.y - 0.5, z: w.z }; // the marker, not over the wallet itself
        if (dw < 6) e.line = 'Somebody\'s wallet. Pick it up.';
        if (this._reach(w.x, w.z, w.y)) {
          this._dropProp(e, w);
          e.wallet = null;
          e.phase = 'return';
          e.t = 0;
          e.engaged = true;
          this._audio('click');
          this._line(say('walletLost'));
        }
        return;
      }
      e.x = own.pos.x;
      e.z = own.pos.z;
      e.line = 'A wallet. Hand it back to its owner, or keep the cash.';
      e.goal = { x: own.pos.x, y: own.pos.y, z: own.pos.z };
      e.talk = { a: own, label: 'Hand back the wallet' };
      if (g.player.inVehicle) e.hint = 'Get out to hand it back';
      else e.hint = '[' + this._key('interact') + '] Hand it back';
      if (Math.hypot(j.x - own.pos.x, j.z - own.pos.z) > KEEP) {
        this._finish(e, 'done', { pay: round(rand(250, 550), 10), good: false, pop: 'WALLET', text: 'Finders keepers. The cash is yours.' });
      }
    }

    _useWallet(e) {
      if (e.phase !== 'return') return;
      e.owner.brain.set('stand');
      this._line(say('walletBack'));
      this._finish(e, 'done', { pay: round(rand(200, 450), 10), good: true, pop: 'WALLET RETURNED', text: 'Returned to its owner.' });
    }

    // ===================================================== the car thief
    _startThief(e, o) {
      const k = this._kerb(o.near, o.hidden);
      if (!k) return false;
      const v = this._car(e, pick(TARGETS.filter((t) => VH.Vehicle.typeSpec(t))), k.x, k.z, k.heading);
      if (!v) return false;
      // At the door on the pavement side.
      const ws = v.worldToLocal(k.walk.x, k.walk.z, {});
      const side = Math.sign(ws.x) || 1;
      const at = v.localToWorld(side * (v.hx + 0.55), 0.35, {});
      const thief = this._person(e, at.x, at.z, 'st_thief', 'stand', { fiddle: true, face: { x: v.pos.x, z: v.pos.z }, speed: 5.6, health: 140 }, LOOKS.thief);
      // The owner, further along: unaware for now.
      let ox = k.walk.x;
      let oz = k.walk.z;
      for (const da of [24, -24, 18, -18, 30, -30]) {
        const w = this._side(k.road, k.dir, k.road.width / 2 + 1.9, k.along + da);
        if (this._standY(w.x, w.z) !== null) {
          ox = w.x;
          oz = w.z;
          break;
        }
      }
      const owner = this._person(e, ox, oz, 'st_owner', 'stand', { phone: true });
      owner.good = true;
      e.target = v;
      e.thief = thief;
      e.owner = owner;
      e.home = { x: k.x, z: k.z };
      e.ownerSpot = { x: ox, z: oz };
      e.lock = 0;
      e.phase = 'breakin';
      e.x = v.pos.x;
      e.z = v.pos.z;
      return true;
    }

    _thiefRuns(e) {
      const th = e.thief;
      if (!th.dead && !th.removed) {
        th.brain.set('flee', { speed: 5.6, fiddle: false });
        th.brain.released = true;
        this._line(say('thiefRuns'));
      }
    }

    _stepThief(e, dt) {
      const g = this.game;
      const p = g.player;
      const v = e.target;
      const th = e.thief;
      const own = e.owner;
      const j = this._jay();
      if (!v || v.removed) {
        this._finish(e, e.engaged ? 'fail' : 'expired', { reason: 'The car\'s gone.' });
        return;
      }
      if (e.phase === 'breakin') {
        e.x = v.pos.x;
        e.z = v.pos.z;
        const dj = Math.hypot(j.x - th.pos.x, j.z - th.pos.z);
        e.line = 'Someone\'s breaking into a car. Stop them.';
        if (dj < 70) {
          e.lock += dt / 22;
          e.bar = e.lock;
          e.tone = 'hot';
          e.goal = { x: th.pos.x, y: th.pos.y, z: th.pos.z };
          e.engaged = e.engaged || dj < 45;
        }
        // Jay got there first: knocked down, hit, stunned, or just walked up to him.
        const stopped = th.dead || th.state === 'down' || th.health < th.maxHealth || (!p.inVehicle && dj < 5) || (p.inVehicle && dj < 8);
        if (stopped) {
          this._thiefRuns(e);
          this._line(say('carTaken'));
          own.brain.set('follow', { phone: false });
          e.phase = 'thanks';
          e.t = 0;
          e.engaged = true;
          return;
        }
        if (e.lock >= 1) {
          // He's in: off it goes.
          th.brain.set('ride', { car: v, fiddle: false });
          v.driver = 'ai';
          const FD = VH.MissionBrains && VH.MissionBrains.FleeDriver;
          if (FD) {
            const f = new FD({ game: g }, v);
            f.lane.maxSpeed = 22;
            v.controller = f;
          } else {
            const ctl = new VH.LaneDriver(g.traffic, { aggressive: true, speedMul: 1.3, ignoreRed: true, plow: true });
            ctl.reacquire(v, 30);
            v.controller = ctl;
          }
          v.wake();
          e.meter = 0;
          this._meter(e, v, (amount, kind) => {
            if (this.cur === e) e.meter += amount * (kind === 'bullet' ? 2.6 : 1);
          });
          this._line(say('carTaken'));
          own.brain.set('stand', { phone: false, wave: true, face: null });
          e.phase = 'chase';
          e.t = 0;
          e.engaged = true;
          e.slowT = 0;
        }
        return;
      }
      if (e.phase === 'thanks') {
        e.x = own.pos.x;
        e.z = own.pos.z;
        e.line = 'The owner\'s coming over to thank you.';
        e.goal = { x: own.pos.x, y: own.pos.y, z: own.pos.z };
        const d = Math.hypot(j.x - own.pos.x, j.z - own.pos.z);
        if (d < (p.inVehicle ? 5 : 2.6) || e.t > 25) {
          own.brain.set('stand');
          this._line(say('ownerThanks'));
          this._finish(e, 'done', { pay: round(rand(250, 500), 10), good: true, pop: 'THIEF STOPPED', text: 'The car\'s safe.' });
        }
        return;
      }
      if (e.phase === 'chase') {
        e.x = v.pos.x;
        e.z = v.pos.z;
        e.line = 'Stop the stolen car! Ram it or shoot at it.';
        e.tone = 'hot';
        e.bar = clamp(e.meter / 300, 0, 1);
        e.goal = { x: v.renderPos.x, y: v.pos.y + 1.4, z: v.renderPos.z };
        const near = Math.hypot(j.x - v.pos.x, j.z - v.pos.z) < 25;
        e.slowT = v.speed < 1.5 && near ? e.slowT + dt : 0;
        if (v.wrecked || e.meter >= 300 || e.slowT > 3 || p.vehicle === v) {
          // He bails out and runs (pulled out by Jay, he's out already).
          if (th.brain.mode === 'ride') {
            th.hidden = false;
            th.inCar = false;
            const w = v.localToWorld(v.hx + 0.9, 0, {});
            th.pos.set(w.x, g.physics.groundHeight(w.x, w.z, v.pos.y + 1.5), w.z);
            this._thiefRuns(e);
          }
          if (p.vehicle !== v) {
            v.driver = null;
            v.controller = null;
            v.plow = false;
          }
          if (v.wrecked) {
            this._finish(e, 'done', { pay: 200, good: true, pop: 'THIEF STOPPED', text: 'The car\'s a write-off, but he didn\'t get away with it.' });
            return;
          }
          own.brain.set('goto', { goal: { x: e.ownerSpot.x, z: e.ownerSpot.z }, wave: true });
          e.mine = v; // Jay may drive this one back
          e.phase = 'return';
          e.t = 0;
          e.noFar = true;
          e.dest = { x: e.ownerSpot.x, z: e.ownerSpot.z, label: 'The car\'s owner' };
          return;
        }
        if (Math.hypot(j.x - v.pos.x, j.z - v.pos.z) > 300) this._finish(e, 'fail', { reason: 'The thief got away with the car.' });
        return;
      }
      // return: the car back to its owner.
      e.x = own.pos.x;
      e.z = own.pos.z;
      e.line = 'Bring the car back to its owner.';
      e.goal = { x: own.pos.x, y: own.pos.y, z: own.pos.z };
      if (v.wrecked) {
        this._finish(e, 'done', { pay: 200, good: true, pop: 'THIEF STOPPED', text: 'The car\'s a write-off, but the thief\'s gone.' });
        return;
      }
      if (p.vehicle !== v) e.hint = 'Get in the car and drive it back';
      if (Math.hypot(v.pos.x - own.pos.x, v.pos.z - own.pos.z) < 12 && v.speed < 2) {
        this._line(say('carBack'));
        this._finish(e, 'done', { pay: round(rand(500, 900), 10), good: true, pop: 'CAR RETURNED', text: 'Back with its owner.' });
        return;
      }
      if (Math.hypot(v.pos.x - own.pos.x, v.pos.z - own.pos.z) > 420) {
        if (g.police && g.police.level < 1 && g.police.setLevel) g.police.setLevel(1, 'stolenCar');
        this._finish(e, 'fail', { reason: 'Keeping it? The owner\'s called the police.' });
      }
    }

    _useThief() {}

    // ===================================================== the tourist
    _startTourist(e, o) {
      const s = this._pavement(o.near, o.hidden);
      if (!s) return false;
      const t = this._person(e, s.x, s.z, 'st_tourist', 'stand', { phone: true }, LOOKS.tourist);
      t.good = true;
      e.tourist = t;
      e.phase = 'wait';
      e.x = s.x;
      e.z = s.z;
      return true;
    }

    _stepTourist(e) {
      const g = this.game;
      const t = e.tourist;
      const j = this._jay();
      const dj = Math.hypot(j.x - t.pos.x, j.z - t.pos.z);
      e.x = t.pos.x;
      e.z = t.pos.z;
      e.line = 'A tourist would like their photo taken.';
      t.brain.wave = dj < 30;
      t.brain.phone = dj >= 30;
      if (dj < 25) e.goal = { x: t.pos.x, y: t.pos.y, z: t.pos.z };
      if (dj < 14 && !e.asked) {
        e.asked = true;
        e.engaged = true;
        this._line(say('photoAsk'));
      }
      e.talk = { a: t, label: 'Take their photo' };
      if (dj < 8) e.hint = g.player.inVehicle ? 'Get out to take the photo' : '[' + this._key('interact') + '] Take the photo';
    }

    _useTourist(e) {
      const g = this.game;
      if (g.renderer.post && g.renderer.post.pulse) g.renderer.post.pulse(0.35, [1, 1, 1]);
      this._audio('click');
      e.tourist.brain.set('stand', { wave: false, phone: false });
      this._line(say('photoDone'));
      this._finish(e, 'done', { pay: round(rand(200, 350), 10), good: true, pop: 'SAY CHEESE', text: 'A lovely holiday snap.' });
    }

    // ------------------------------------------------------- jacking
    /** Jay pulls the "driver" out of an encounter car: the thief (ours) comes out, not a stranger. */
    _onJack(ev) {
      const e = this.cur;
      if (!e || !ev || !e.cars.includes(ev.v)) return;
      if (e.kind === 'carthief' && e.phase === 'chase' && Array.isArray(ev.agents) && !e.thief.removed) {
        for (const a of ev.agents) if (a && !a.removed && a !== e.thief) this.game.crowd.remove(a);
        const th = e.thief;
        th.hidden = false;
        th.inCar = false;
        th.brain.set('flee', { speed: 5.6 });
        th.brain.released = true;
        ev.agents = [th];
        this._line(say('thiefRuns'));
      }
    }

    _onEnter(ev) {
      const e = this.cur;
      if (!e || !ev || !ev.v) return;
      const v = ev.v;
      if (e.kind === 'cashvan' && v === e.van && e.phase !== 'open') {
        // Taken from the crew: the back doors are forced on the spot.
        e.hit = true;
        e.engaged = true;
        this._vanOpen(e);
      } else if (e.kind === 'carthief' && v === e.target && e.phase === 'breakin') {
        this._line(say('carTaken'));
        this._thiefRuns(e);
        this._finish(e, 'fail', { reason: 'That\'s not your car either.' });
      } else if (e.kind === 'lift' && v === e.broken && e.phase === 'wait') {
        this._finish(e, 'fail', { reason: 'You took their car. That\'s not a lift.' });
      }
    }

    // ---------------------------------------------------------- contract
    /** The encounter under way: { kind, label, x, z }, or null. */
    current() {
      const e = this.cur;
      if (!e) return null;
      return { kind: e.kind, label: e.def.name, x: e.x, z: e.z };
    }

    /** Start one close to Jay now, whatever's going on (debug and tests). opts: { near: [min, max], hidden } */
    force(kind, opts) {
      if (!this.ok) return null;
      if (this.cur) this._finish(this.cur, 'stood down');
      const k = KINDS[kind] ? kind : this._pickKind();
      for (const near of [[30, 70], [60, 140], [100, 250]]) {
        if (this._start(k, Object.assign({ near, hidden: false }, opts || {}))) return this.current();
      }
      return null;
    }

    blips(out, missionRunning) {
      const e = this.cur;
      if (!e || missionRunning) return;
      out.push({ x: e.x, z: e.z, type: 'encounter', label: e.def.name });
      if (e.dest && (e.dest.x !== e.x || e.dest.z !== e.z)) out.push({ x: e.dest.x, z: e.dest.z, type: 'hustle', label: e.dest.label });
    }

    stats() {
      const s = this.stat;
      const out = [['Street encounters dealt with', String(s.done)], ['People helped on the street', String(s.helped)], ['Earned on the street', money(s.earned)]];
      if (s.kinds.cashvan) out.push(['Cash vans cracked', String(s.kinds.cashvan)]);
      if (s.kinds.race) out.push(['Street races won', String(s.kinds.race)]);
      return out;
    }

    serialize() {
      const s = this.stat;
      return { done: s.done, helped: s.helped, failed: s.failed, earned: s.earned, best: s.best, kinds: Object.assign({}, s.kinds) };
    }

    load(d) {
      this._hardStop();
      this._fresh();
      this.wait = rand(GAP[0], GAP[1]);
      this._vanAt = -Infinity;
      this._lastKind = null;
      if (!d) return;
      const s = this.stat;
      s.done = d.done | 0;
      s.helped = d.helped | 0;
      s.failed = d.failed | 0;
      s.earned = +d.earned || 0;
      s.best = +d.best || 0;
      for (const k of Object.keys(d.kinds || {})) if (KINDS[k]) s.kinds[k] = d.kinds[k] | 0;
    }

    /** Everything off the street now (no events: nothing happened). */
    _hardStop() {
      if (!this.ok) return;
      const e = this.cur;
      this.cur = null;
      if (e) {
        VH.events.emit('encounter:end', { kind: e.kind, how: 'stood down' });
        this._clear(e, true);
      }
      this._result = null;
      this._cache = {};
      this.card.className = 'vh-street';
      document.body.classList.remove('street-on');
    }

    reset() {
      this.load(undefined);
    }

    stop() {
      this._hardStop();
    }
  }

  Encounters.KINDS = KINDS;
  VH.Encounters = Encounters;
})();
