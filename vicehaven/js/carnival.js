/*
 * carnival.js — Wonder Wharf as a game system: every ride, stall game and
 * food stall at the fair is an "attraction" registered here, and this file
 * runs the parts they share (VH.Carnival → game.carnival).
 *
 * ----------------------------------------------------------------- the API
 * Register an attraction from any file loaded before main.js starts the game
 * (js/carnival-rides.js does the rides; the stall games go the same way):
 *
 *   VH.Carnival.define({
 *     id: 'hoopla',              unique; also its save key for best scores
 *     name: 'Hoopla',            shown in prompts, the overlay and results
 *     kind: 'game',              'ride' | 'game' | 'food' (food: see FOOD below)
 *     verb: 'Play',              the prompt reads "<verb> <name>" ("Ride the
 *                                Wonder Wheel"); or give label: 'Have a go at Hoopla'
 *     x, z, y,                   where the prompt is (y defaults to the plaza, 0.15)
 *     radius: 1.8,               how close Jay must be for the prompt
 *     prompts: [{ x, z, y, radius, label }],   more spots with the same handler
 *     price: 3,                  dollars, paid when it starts (0 = free)
 *     scored: true,              keep a best score (carnival.best[id])
 *     unit: 'points',            what the score counts, for the results card
 *     sleep: 140,                beyond this many metres from Jay, idle() isn't called
 *     setup(carnival) {},        once, after the game is built: meshes, colliders, state
 *     idle(dt, carnival) {},     every frame Jay is near and it isn't being played: fair
 *                                life (other riders, the claw swaying). Allocate nothing.
 *     available(carnival) {},    optional: return a reason string to refuse ('Full', ...)
 *     start(s) {},               Jay has paid: begin. `s` is the session (below)
 *     update(dt, s) {},          every frame while it runs
 *     escape(s) {},              Esc / B / pad Menu: return true if handled; by default
 *                                s.leaving is set and the attraction should end at its
 *                                next safe point (a ride) or at once (a game: s.finish())
 *     stop(s, why) {},           forced end (Jay died or was arrested, a mission took
 *                                over, game reset): put props back; Jay is stood up for you
 *     serialize() {}, load(d) {} optional extra saved state of its own
 *   });
 *
 * The session `s` (one at a time; carnival.session):
 *   s.id, s.def, s.t (seconds), s.opts (from play()), s.game, s.carnival, s.data ({} scratch)
 *   s.score, s.tickets           set them as you go; s.finish() reads them
 *   s.leaving                    true once the player asked to get off
 *   s.emergency                  true when the fair was alarmed (gunfire, a blast, a car
 *                                driven in, the police): end at the next safe point, quickly
 *   s.player2                    true on the second player's go (two-player turns are the
 *                                attraction's own business: s.opts.players === 2)
 *   s.seat(x, y, z, yaw, pose)   hold Jay at a seat (y = where his hips go); pose: 'sit',
 *                                'astride', 'stand', 'armsUp' or a joint-target object.
 *                                Call it every frame for a moving seat. s.seat(null) frees him.
 *   s.tilt(quaternion)           after s.seat: tip Jay's whole body (a coaster car on a slope)
 *   s.walk(x, z, y, seconds)     a short scripted walk to a point (boarding); returns true
 *                                when he is there. Call every frame until it does.
 *   s.eye(x, y, z, yaw, o)       first-person camera at an eye point, facing yaw, free look
 *                                (mouse / right stick); o: { yawLimit, pitchMin, pitchMax,
 *                                fov, shake (0..1), roll, pitch (base pitch) }
 *   s.chase(x, y, z, yaw, dist, o)  camera orbiting a point (free look), o: { height, fov }
 *   s.shot(px, py, pz, tx, ty, tz, fov)  a fixed camera looking at a point (a stall game)
 *   s.view                       'eye' or 'chase': V (or RB) swaps it; rides choose which
 *                                camera to call from it
 *   s.pressed(action)            true on the frame an action ('fire', 'jump', 'interact',
 *                                'aim', 'reload', 'moveLeft' ...) goes down; works while
 *                                Jay is held (the game's own handlers drop presses then)
 *   s.down(action), s.move()     held, and the move stick/keys { x, y }
 *   s.ui.title(name, hint)       the overlay's top strip: name and a line of controls
 *   s.ui.stat(key, label, value) a live figure on the overlay ('Bumps', 3); null removes it
 *   s.ui.timer(seconds|null)     a countdown clock
 *   s.ui.big(text, ms)           a big centred word ("3", "GO!", "BUMP!")
 *   s.ui.caption(text, ms)       a line along the bottom ("Hold on to your hat!")
 *   s.ui.meter(0..1|null, label) a power/timing bar
 *   s.sound(name, o)             carnival-audio.js cues: 'klaxon', 'bump', 'ding', 'clank',
 *                                'whoosh', 'cheer', 'buzz', 'win', 'lose', 'tick' ...
 *   s.finish(o)                  done: { score, tickets, completed, text } → the results
 *                                card (score, best, tickets), tickets added, 'carnival:end'
 *                                emitted, play() resolves; Jay is stood up where he is
 *   s.end(why)                   done without a results card (getting off a ride)
 *
 * The system (game.carnival):
 *   carnival.play(id, opts)      start an attraction from code (a story mission): opts
 *                                { free: true (no charge), quiet: true (no results card),
 *                                players: 2 }. Returns a Promise of
 *                                { id, score, tickets, completed, why }.
 *   carnival.tickets             the ticket balance; carnival.award(n, why), carnival.spend(n)
 *   carnival.best[id], carnival.counts[id] (times played), carnival.prizes[id] (count)
 *   carnival.atFair              Jay is inside the fair's fence (the ticket counter shows)
 *   carnival.closedFor           seconds the rides stay shut after an alarm
 *   carnival.figures             instanced riders: begin() / add(kind, x, y, z, yaw, tint) /
 *                                end(); kinds 'sit', 'up' (arms up), 'stand'
 *   carnival.life                the Neon Strand's moving parts (the wheel, the train, the
 *                                Skyhook), from districts/neonstrand.js
 *   Events: 'carnival:start' { id }, 'carnival:end' { id, score, tickets, completed, why },
 *   'carnival:tickets' { tickets, delta }.
 *
 * Rules every attraction keeps: Jay can't start one while wanted, in a car or
 * on a job; gunfire or a blast near the fair, a car driven in among the
 * rides or the police turning up alarms it: the session's s.emergency is set,
 * and the rides close for a minute. Nothing at the fair runs when Jay is more
 * than about 400 m away.
 *
 * FOOD: the four food stalls by the west fence sell candy floss, hot dogs,
 * ice cream and doughnuts: money for health, like the vending machines.
 */
(function () {
  'use strict';

  const VH = window.VH;
  const KERB = 0.15;
  const DEFS = [];
  const SAVE_V = 1;
  const FAIR = { x0: 807, z0: -51, x1: 973, z1: 173, cx: 890, cz: 61 }; // the plot (updated from the layout)
  const WAKE = 420; //   metres from the fair's middle: closer than this and it runs
  const CLOSED = 60; //  seconds the rides stay shut after an alarm
  const ACTIONS = ['fire', 'aim', 'jump', 'interact', 'vehicle', 'reload', 'crouch', 'sprint', 'moveForward', 'moveBack', 'moveLeft', 'moveRight', 'camera'];

  // Poses (joint targets, humanoid.js): w blends them in.
  const POSES = {
    sit: { w: 1, hipL: 1.45, hipR: 1.45, kneeL: 1.5, kneeR: 1.5, ankleL: 0, ankleR: 0, shoulderL: 0.35, shoulderR: 0.35, elbowL: 0.9, elbowR: 0.9, splayL: 0.1, splayR: 0.1, lean: 0.05, twist: 0, pelvisY: 0.97, headPitch: 0, speed: 0, crouch: 0 },
    up: { w: 1, hipL: 1.45, hipR: 1.45, kneeL: 1.5, kneeR: 1.5, ankleL: 0, ankleR: 0, shoulderL: 2.9, shoulderR: 2.9, elbowL: 0.2, elbowR: 0.2, splayL: 0.35, splayR: 0.35, lean: -0.05, twist: 0, pelvisY: 0.97, headPitch: 0.15, speed: 0, crouch: 0 },
    astride: { w: 1, hipL: 1.0, hipR: 1.0, kneeL: 1.2, kneeR: 1.2, ankleL: -0.2, ankleR: -0.2, shoulderL: 0.9, shoulderR: 0.9, elbowL: 0.7, elbowR: 0.7, splayL: 0.15, splayR: 0.15, lean: 0.15, twist: 0, pelvisY: 0.97, headPitch: 0, speed: 0, crouch: 0 },
    hold: { w: 1, hipL: 1.45, hipR: 1.45, kneeL: 1.4, kneeR: 1.4, ankleL: 0, ankleR: 0, shoulderL: 1.25, shoulderR: 1.25, elbowL: 0.35, elbowR: 0.35, splayL: 0.12, splayR: 0.12, lean: 0.25, twist: 0, pelvisY: 0.97, headPitch: -0.1, speed: 0, crouch: 0 },
    slide: { w: 1, hipL: 1.5, hipR: 1.5, kneeL: 0.25, kneeR: 0.25, ankleL: 0.2, ankleR: 0.2, shoulderL: 2.6, shoulderR: 2.6, elbowL: 0.3, elbowR: 0.3, splayL: 0.5, splayR: 0.5, lean: -0.35, twist: 0, pelvisY: 0.97, headPitch: 0.3, speed: 0, crouch: 0 },
    stand: { w: 0 },
  };
  // How far below the hips the feet of a standing Jay are (his root is at his feet).
  const HIP = 0.97;

  // FOOD: [stall index (south from the arcade), name, price, health, icon, line]
  const FOOD = [
    ['candyfloss', 'Candy floss', 3, 25, '🍭', 'Pink, sticky and gone in four bites.'],
    ['hotdog', 'A hot dog', 5, 45, '🌭', 'Onions, mustard, the works.'],
    ['icecream', 'An ice cream', 4, 35, '🍦', 'Two scoops and a wafer.'],
    ['doughnuts', 'Hot doughnuts', 4, 35, '🍩', 'A paper bag of six, rolled in sugar.'],
  ];

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const el = (tag, cls, text) => VH.util.el(tag, cls, text);

  // ---------------------------------------------------------------- figures
  /** Cheap riders: three instanced meshes (seated, seated with arms up, standing), one draw call each. */
  class Figures {
    constructor(scene, max) {
      this.max = max;
      this.meshes = {};
      const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 });
      for (const kind of ['sit', 'up', 'stand']) {
        const m = new THREE.InstancedMesh(Figures.geometry(kind), mat, max);
        m.count = 0;
        m.frustumCulled = false;
        m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        const c = new THREE.Color(1, 1, 1);
        for (let i = 0; i < max; i++) m.setColorAt(i, c);
        scene.add(m);
        this.meshes[kind] = { mesh: m, n: 0 };
      }
      this._m = new THREE.Matrix4();
      this._p = new THREE.Vector3();
      this._q = new THREE.Quaternion();
      this._s = new THREE.Vector3(1, 1, 1);
      this._e = new THREE.Euler();
      this._c = new THREE.Color();
      this.tints = [0xff5c95, 0x37b8ff, 0xffd24a, 0x7dcf6a, 0xf6f1e4, 0xb45cff, 0xff8a3c, 0x2fb7b0].map((h) => new THREE.Color(h).lerp(new THREE.Color(1, 1, 1), 0.35));
    }

    /** A figure in the figure's own frame: feet (or seat) at y 0, facing +Z. */
    static geometry(kind) {
      const g = new VH.GeometryBuilder({});
      const skin = VH.col(0xd9a47c), hair = VH.col(0x3a2a20), top = VH.col(0xffffff), legs = VH.col(0x3c4a66), shoe = VH.col(0x222222);
      if (kind === 'stand') {
        g.box(-0.17, 0, -0.1, -0.03, 0.85, 0.1, legs);
        g.box(0.03, 0, -0.1, 0.17, 0.85, 0.1, legs);
        g.box(-0.2, 0.85, -0.12, 0.2, 1.45, 0.12, top);
        g.box(-0.29, 0.9, -0.07, -0.2, 1.42, 0.07, top);
        g.box(0.2, 0.9, -0.07, 0.29, 1.42, 0.07, top);
        g.box(-0.11, 1.47, -0.11, 0.11, 1.72, 0.11, skin);
        g.box(-0.12, 1.66, -0.12, 0.12, 1.76, 0.1, hair);
      } else {
        // Seated: hips at y 0, thighs forward, shins down.
        g.box(-0.18, -0.06, -0.08, -0.03, 0.08, 0.38, legs);
        g.box(0.03, -0.06, -0.08, 0.18, 0.08, 0.38, legs);
        g.box(-0.17, -0.5, 0.3, -0.04, -0.06, 0.42, legs);
        g.box(0.04, -0.5, 0.3, 0.17, -0.06, 0.42, legs);
        g.box(-0.17, -0.55, 0.3, -0.04, -0.47, 0.5, shoe);
        g.box(0.04, -0.55, 0.3, 0.17, -0.47, 0.5, shoe);
        g.box(-0.2, 0.05, -0.12, 0.2, 0.62, 0.1, top);
        if (kind === 'up') {
          g.box(-0.3, 0.5, -0.06, -0.2, 1.15, 0.06, top);
          g.box(0.2, 0.5, -0.06, 0.3, 1.15, 0.06, top);
          g.box(-0.3, 1.15, -0.06, -0.2, 1.27, 0.06, skin);
          g.box(0.2, 1.15, -0.06, 0.3, 1.27, 0.06, skin);
        } else {
          g.box(-0.29, 0.18, -0.06, -0.2, 0.58, 0.06, top);
          g.box(0.2, 0.18, -0.06, 0.29, 0.58, 0.06, top);
          g.box(-0.29, 0.14, 0.0, -0.2, 0.24, 0.3, skin);
          g.box(0.2, 0.14, 0.0, 0.29, 0.24, 0.3, skin);
        }
        g.box(-0.11, 0.64, -0.11, 0.11, 0.89, 0.11, skin);
        g.box(-0.12, 0.83, -0.12, 0.12, 0.93, 0.1, hair);
      }
      return g.build();
    }

    begin() {
      for (const k in this.meshes) this.meshes[k].n = 0;
    }

    /** One figure: kind 'sit' | 'up' | 'stand'; (x, y, z) the hips (seated) or the feet; yaw the way it faces; q an optional full rotation. */
    add(kind, x, y, z, yaw, tint, q) {
      const M = this.meshes[kind];
      if (!M || M.n >= this.max) return;
      this._p.set(x, y, z);
      if (q) this._q.copy(q);
      else this._q.setFromEuler(this._e.set(0, yaw, 0));
      this._m.compose(this._p, this._q, this._s);
      M.mesh.setMatrixAt(M.n, this._m);
      M.mesh.setColorAt(M.n, this.tints[(tint | 0) % this.tints.length]);
      M.n++;
    }

    end() {
      for (const k in this.meshes) {
        const M = this.meshes[k];
        if (M.mesh.count !== M.n || M.n) {
          M.mesh.count = M.n;
          M.mesh.instanceMatrix.needsUpdate = true;
          if (M.mesh.instanceColor) M.mesh.instanceColor.needsUpdate = true;
        }
      }
    }

    hide() {
      this.begin();
      this.end();
    }
  }

  // ---------------------------------------------------------------- overlay
  /** The fair's own screen layer: a title strip, live figures, a clock, big words, captions, a results card. */
  class Overlay {
    constructor(parent) {
      this.root = el('div', 'cv-overlay');
      this.top = el('div', 'cv-top');
      this.name = el('div', 'cv-name');
      this.hint = el('div', 'cv-hint');
      this.top.append(this.name, this.hint);
      this.stats = el('div', 'cv-stats');
      this.clock = el('div', 'cv-clock');
      this.bigEl = el('div', 'cv-big');
      this.cap = el('div', 'cv-caption');
      this.meterEl = el('div', 'cv-meter');
      this.meterFill = el('div', 'cv-meter-fill');
      this.meterLabel = el('div', 'cv-meter-label');
      this.meterEl.append(this.meterFill, this.meterLabel);
      this.card = el('div', 'cv-card');
      this.root.append(this.top, this.stats, this.clock, this.bigEl, this.cap, this.meterEl, this.card);
      parent.append(this.root);
      this._stats = {};
      this._clock = null;
      this._bigT = 0;
      this._capT = 0;
    }

    show(on) {
      this.root.classList.toggle('on', !!on);
      if (!on) this.clear();
    }

    clear() {
      this.stats.textContent = '';
      this._stats = {};
      this.timer(null);
      this.meter(null);
      this.bigEl.classList.remove('on');
      this.cap.classList.remove('on');
      this.card.classList.remove('on');
      this.card.textContent = '';
    }

    title(name, hint) {
      this.name.textContent = name || '';
      this.hint.textContent = hint || '';
    }

    stat(key, label, value) {
      let s = this._stats[key];
      if (value === null || value === undefined) {
        if (s) s.row.remove();
        delete this._stats[key];
        return;
      }
      if (!s) {
        const row = el('div', 'cv-stat');
        const l = el('span', 'cv-stat-label', label);
        const v = el('span', 'cv-stat-value', '');
        row.append(l, v);
        this.stats.append(row);
        s = this._stats[key] = { row, v, last: null };
      }
      if (s.last !== value) {
        s.last = value;
        s.v.textContent = String(value);
        s.row.classList.remove('pop');
        void s.row.offsetWidth;
        s.row.classList.add('pop');
      }
    }

    timer(sec) {
      if (sec === null || sec === undefined) {
        this.clock.classList.remove('on');
        this._clock = null;
        return;
      }
      const v = Math.max(0, Math.ceil(sec));
      if (v !== this._clock) {
        this._clock = v;
        this.clock.textContent = Math.floor(v / 60) + ':' + String(v % 60).padStart(2, '0');
        this.clock.classList.toggle('urgent', v <= 10);
      }
      this.clock.classList.add('on');
    }

    big(text, ms) {
      this.bigEl.textContent = text;
      this.bigEl.classList.remove('on');
      void this.bigEl.offsetWidth;
      this.bigEl.classList.add('on');
      this._bigT = (ms || 900) / 1000;
    }

    caption(text, ms) {
      this.cap.textContent = text;
      this.cap.classList.add('on');
      this._capT = (ms || 3200) / 1000;
    }

    meter(k, label) {
      if (k === null || k === undefined) {
        this.meterEl.classList.remove('on');
        return;
      }
      this.meterEl.classList.add('on');
      this.meterFill.style.width = (clamp(k, 0, 1) * 100).toFixed(1) + '%';
      this.meterLabel.textContent = label || '';
    }

    /** The results card. rows: [[label, value, cls]] */
    results(title, rows, foot) {
      this.card.textContent = '';
      this.card.append(el('div', 'cv-card-title', title));
      for (const [l, v, cls] of rows) {
        const r = el('div', 'cv-card-row' + (cls ? ' ' + cls : ''));
        r.append(el('span', '', l), el('b', '', String(v)));
        this.card.append(r);
      }
      if (foot) this.card.append(el('div', 'cv-card-foot', foot));
      this.card.classList.add('on');
    }

    tick(dt) {
      if (this._bigT > 0 && (this._bigT -= dt) <= 0) this.bigEl.classList.remove('on');
      if (this._capT > 0 && (this._capT -= dt) <= 0) this.cap.classList.remove('on');
    }
  }

  // ---------------------------------------------------------------- session
  class Session {
    constructor(carnival, def, opts) {
      this.carnival = carnival;
      this.game = carnival.game;
      this.def = def;
      this.id = def.id;
      this.opts = opts || {};
      this.t = 0;
      this.data = {};
      this.score = 0;
      this.tickets = 0;
      this.leaving = false;
      this.emergency = false;
      this.player2 = false;
      this.view = def.view || 'eye';
      this.ui = carnival.overlay;
      this.done = false;
      this._seated = false;
      this._cam = null; // { mode, ... } placed this frame
      this._look = 0; //   free-look yaw, relative to the seat
      this._rigPrev = 0;
      this._walk = null;
      this._held = {};
      this._prevHeld = {};
      this._shakeT = 0;
      this._q = new THREE.Quaternion();
      this._tilt = null;
    }

    // ---- input
    _poll() {
      const inp = this.game.input;
      for (const a of ACTIONS) {
        this._prevHeld[a] = this._held[a];
        this._held[a] = inp.down(a);
      }
    }
    pressed(a) {
      return !!this._held[a] && !this._prevHeld[a];
    }
    down(a) {
      return this.game.input.down(a);
    }
    move() {
      return this.game.input.moveVector();
    }
    sound(name, o) {
      const A = this.carnival.audio;
      if (A && A[name]) A[name](o);
    }

    // ---- Jay
    seat(x, y, z, yaw, pose) {
      const p = this.game.player;
      if (x === null || x === undefined) {
        this.carnival._unseat();
        this._seated = false;
        return;
      }
      if (!this._seated) {
        this._seated = true;
        this._rigPrev = this.game.cameraRig.yaw;
      }
      const P = typeof pose === 'object' ? pose : POSES[pose || 'sit'];
      p.frozen = true;
      p.keepPresses = true;
      p.enterPose = P && P.w > 0 ? P : null;
      p.enterLift = 0;
      const fy = P && P.w > 0 ? y - HIP : y;
      p.pos.set(x, fy, z);
      p.prevPos.copy(p.pos);
      p.renderPos.copy(p.pos);
      p.heading = p.prevHeading = yaw;
      p.vel.set(0, 0, 0);
      const root = p.model.root;
      root.position.set(x, fy, z);
      root.rotation.set(0, yaw, 0);
      this._tilt = null;
    }

    tilt(q) {
      const root = this.game.player.model.root;
      // Pivot about the hips: rotate the offset from hips to root.
      const p = this.game.player;
      const hx = p.pos.x, hy = p.pos.y + HIP, hz = p.pos.z;
      this._q.setFromAxisAngle(_Y, p.heading);
      root.quaternion.copy(q).multiply(this._q);
      _v1.set(0, -HIP, 0).applyQuaternion(q);
      root.position.set(hx + _v1.x, hy + _v1.y, hz + _v1.z);
    }

    walk(x, z, y, seconds) {
      const p = this.game.player;
      if (!this._walk || this._walk.x !== x || this._walk.z !== z) {
        this._walk = { x, z, y: y === undefined ? null : y, fx: p.pos.x, fz: p.pos.z, fy: p.pos.y, t: 0, T: Math.max(0.3, seconds || Math.hypot(x - p.pos.x, z - p.pos.z) / 1.6) };
      }
      const W = this._walk;
      W.t += this.carnival._dt;
      const k = clamp(W.t / W.T, 0, 1);
      const nx = W.fx + (W.x - W.fx) * k, nz = W.fz + (W.z - W.fz) * k;
      const ny = W.y === null ? this.game.physics.groundHeight(nx, nz, p.pos.y + 1.2) : W.fy + (W.y - W.fy) * k;
      const dx = W.x - W.fx, dz = W.z - W.fz;
      p.frozen = true;
      p.keepPresses = true;
      p.enterPose = k < 1 ? WALKING : null;
      p.pos.set(nx, ny, nz);
      p.prevPos.copy(p.pos);
      p.renderPos.copy(p.pos);
      if (Math.hypot(dx, dz) > 0.05) p.heading = p.prevHeading = Math.atan2(dx, dz);
      const root = p.model.root;
      root.position.set(nx, ny, nz);
      root.rotation.set(0, p.heading, 0);
      this._seated = false;
      if (k >= 1) {
        this._walk = null;
        return true;
      }
      return false;
    }

    // ---- cameras
    _freeLook(limit) {
      const rig = this.game.cameraRig;
      this._look = clamp(this._look + wrap(rig.yaw - this._rigPrev), -limit, limit);
      this._rigPrev = rig.yaw;
      return this._look;
    }

    eye(x, y, z, yaw, o) {
      o = o || NONE;
      const rig = this.game.cameraRig;
      const look = this._freeLook(o.yawLimit === undefined ? 2.9 : o.yawLimit);
      rig.pitch = clamp(rig.pitch, o.pitchMin === undefined ? -1.3 : o.pitchMin, o.pitchMax === undefined ? 1.2 : o.pitchMax);
      const C = this._camState();
      C.mode = 'eye';
      C.x = x; C.y = y; C.z = z;
      C.yaw = yaw + look;
      C.pitch = rig.pitch + (o.pitch || 0);
      C.roll = o.roll || 0;
      C.fov = o.fov || this.carnival._baseFov;
      C.shake = o.shake || 0;
      this.game.player.model.setHeadVisible(false);
      this.carnival._applyCam();
    }

    chase(x, y, z, yaw, dist, o) {
      o = o || NONE;
      const rig = this.game.cameraRig;
      const look = this._freeLook(Math.PI);
      rig.pitch = clamp(rig.pitch, -1.2, 0.6);
      const C = this._camState();
      C.mode = 'chase';
      C.x = x; C.y = y + (o.height === undefined ? 1.2 : o.height); C.z = z;
      C.yaw = yaw + look;
      C.pitch = rig.pitch - 0.12;
      C.dist = dist || 5;
      C.roll = 0;
      C.fov = o.fov || this.carnival._baseFov;
      C.shake = o.shake || 0;
      this.game.player.model.setHeadVisible(true);
      this.carnival._applyCam();
    }

    shot(px, py, pz, tx, ty, tz, fov) {
      const C = this._camState();
      C.mode = 'shot';
      C.x = px; C.y = py; C.z = pz;
      C.tx = tx; C.ty = ty; C.tz = tz;
      C.fov = fov || this.carnival._baseFov;
      C.shake = 0;
      this.game.player.model.setHeadVisible(true);
      this.carnival._applyCam();
    }

    shake(k) {
      this._shakeT = Math.max(this._shakeT, k);
    }

    _camState() {
      return this._cam || (this._cam = { mode: 'eye', x: 0, y: 0, z: 0, yaw: 0, pitch: 0, roll: 0, dist: 5, fov: 60, shake: 0, tx: 0, ty: 0, tz: 0 });
    }

    // ---- the end
    finish(o) {
      if (this.done) return;
      o = o || {};
      if (o.score !== undefined) this.score = o.score;
      if (o.tickets !== undefined) this.tickets = o.tickets;
      this.carnival._finish(this, o.completed !== false, o.text || null, !this.opts.quiet && o.card !== false, o.why || null);
    }

    end(why) {
      if (this.done) return;
      this.carnival._finish(this, why === undefined || why === 'done', null, false, why || 'done');
    }
  }
  const NONE = {};
  const _Y = new THREE.Vector3(0, 1, 0);
  const _v1 = new THREE.Vector3();
  const WALKING = { w: 0.0001, speed: 1.6 }; // (a near-zero blend: the walk cycle plays at this speed)

  // ----------------------------------------------------------------- system
  class Carnival {
    constructor(game) {
      this.game = game;
      this.tickets = 0;
      this.best = {};
      this.counts = {};
      this.prizes = {};
      this.earned = 0;
      this.session = null;
      this.atFair = false;
      this.awake = false;
      this.closedFor = 0;
      this.defs = DEFS;
      this.byId = {};
      this._dt = 0;
      this._card = null; // { t, resolve } the results card waiting to be closed
      this._escAt = 0;
      this._baseFov = (game.settings && game.settings.get('graphics.fov')) || 60;
      this._camQ = new THREE.Quaternion();
      this._e = new THREE.Euler(0, 0, 0, 'YXZ');
      this._dir = new THREE.Vector3();
      this._alarmCheck = 0;
      this._prevWeapon = null;
      this._promptItems = [];
      this._noise = 0;
      this._barkT = 6;
      const plot = game.layout && game.layout.plots && game.layout.plots.wonder_wharf;
      if (plot) Object.assign(FAIR, { x0: plot.minX, z0: plot.minZ, x1: plot.maxX, z1: plot.maxZ, cx: (plot.minX + plot.maxX) / 2, cz: (plot.minZ + plot.maxZ) / 2 });
      this.fair = FAIR;
      this.ok = !!(game.world && game.world.wonderWharf);
      // The screen: the overlay and the ticket counter by the money.
      const hudRoot = game.hud && game.hud.root ? game.hud.root : document.body;
      this.overlay = new Overlay(hudRoot);
      this.ticketEl = el('div', 'cv-tickets');
      this.ticketVal = el('span', 'cv-tickets-value', '0');
      this.ticketEl.append(el('span', 'cv-tickets-icon', '🎟'), this.ticketVal);
      const tr = game.hud && game.hud.moneyEl ? game.hud.moneyEl.parentNode : hudRoot;
      tr.append(this.ticketEl);
      this.audio = VH.CarnivalAudio ? new VH.CarnivalAudio(game) : null;
      this.figures = this.ok ? new Figures(game.scene, 160) : null;
      if (!this.ok) return;
      if (game.dialogue && game.dialogue.addCast) game.dialogue.addCast({ barker: { name: 'Barker', color: '#ffd24a', voice: { gender: 'male', pitch: 1.1, rate: 1.08 } }, attendant: { name: 'Attendant', color: '#7af4ff', voice: { gender: 'female', pitch: 1.05, rate: 1.02 } } });
      // The attractions: food first (they need nothing else), then everything defined.
      this._defineFood();
      for (const d of DEFS) {
        this.byId[d.id] = d;
        try {
          if (d.setup) d.setup(this);
        } catch (e) {
          console.error('[carnival] setup of ' + d.id + ' failed', e);
          d.broken = true;
        }
        if (!d.broken) this._registerPrompts(d);
      }
      game.interaction.on('carnival', (item) => {
        this._use(item.attraction, item);
        return 0.8;
      });
      // Alarms: shots, blasts, a car in among the rides, the police.
      VH.events.on('gunshot', (e) => this._near(e.x, e.z, 140) && this.alarm('gunfire'));
      VH.events.on('explosion', (e) => this._near(e.x, e.z, 180) && this.alarm('blast'));
      VH.events.on('police:level', (e) => {
        if (e.level > 0 && this.session) this.alarm('police');
      });
      VH.events.on('camera:mode', () => {
        const s = this.session;
        if (s && s.def.kind === 'ride') s.view = s.view === 'eye' ? 'chase' : 'eye';
      });
      VH.events.on('player:died', () => this._force('died'));
      VH.events.on('player:arrested', () => this._force('arrested'));
      VH.events.on('mission:start', () => this._force('mission'));
      this._shotFn = (dt, cam) => this._applyCam(cam);
      this._showTickets(false);
    }

    // ------------------------------------------------------------ registry
    static define(def) {
      const i = DEFS.findIndex((d) => d.id === def.id);
      if (i >= 0) DEFS[i] = def;
      else DEFS.push(def);
      return def;
    }

    get life() {
      return this.game.districtSystems ? this.game.districtSystems.neonstrand : null;
    }

    _defineFood() {
      const ix0 = FAIR.x0 + 4;
      FOOD.forEach(([id, name, price, heal, icon, line], i) => {
        const z = 128 + i * 11;
        const x = ix0 + 2 + 6 + 0.7; // in front of the counter
        if (DEFS.find((d) => d.id === 'food_' + id)) return;
        DEFS.push({ id: 'food_' + id, name, kind: 'food', label: 'Buy ' + name.replace(/^An? /, 'a ').replace(/^Hot/, 'hot').replace(/^Candy/, 'candy'), x, z, radius: 2.4, price, heal, icon, line, food: true, sleep: 0 });
      });
    }

    _registerPrompts(d) {
      const spots = [{ x: d.x, z: d.z, y: d.y, radius: d.radius, label: d.label }].concat(d.prompts || []);
      spots.forEach((sp, i) => {
        if (sp.x === undefined) return;
        const item = {
          id: 'carnival_' + d.id + '_' + i,
          kind: 'carnival',
          attraction: d.id,
          x: sp.x,
          y: (sp.y === undefined ? KERB : sp.y) + 1,
          z: sp.z,
          radius: sp.radius || d.radius || 2,
          label: sp.label || d.label || (d.verb || (d.kind === 'ride' ? 'Ride' : 'Play')) + ' ' + d.name,
          price: d.price || 0,
          baseLabel: null,
        };
        item.baseLabel = item.label;
        this.game.interaction.register(item);
        this._promptItems.push(item);
      });
    }

    // ------------------------------------------------------------ playing
    /** Start an attraction from code (a story mission, a test). Resolves with the result. */
    play(id, opts) {
      return new Promise((resolve) => {
        const d = this.byId[id];
        if (!d || d.broken) return resolve({ id, score: 0, tickets: 0, completed: false, why: 'unknown' });
        const why = this._refuse(d, opts || {});
        if (why) return resolve({ id, score: 0, tickets: 0, completed: false, why });
        this._begin(d, Object.assign({}, opts, { resolve }));
      });
    }

    _refuse(d, opts) {
      const g = this.game;
      const p = g.player;
      if (this.session) return 'busy';
      if (!this.ok) return 'closed';
      if (p.state === 'dead' || p.inVehicle || p.state === 'knocked') return 'Not now';
      if (g.challenges && g.challenges.active) return 'Not during a challenge';
      if (!opts.story && g.missions && g.missions.run) return 'Not while you\'re on a job';
      if (g.police && g.police.level > 0) return 'Not with the police after you';
      if (d.kind === 'ride' && this.closedFor > 0) return 'The rides are shut for a moment';
      if (d.available) {
        const r = d.available(this);
        if (r) return r;
      }
      if (!opts.free && (d.price || 0) > p.money) return 'Not enough cash: ' + VH.util.formatMoney(d.price);
      return null;
    }

    _use(id, item) {
      const d = this.byId[id];
      if (!d) return;
      const why = this._refuse(d, {});
      if (why) {
        this.game.hud.showToast(why);
        if (this.audio) this.audio.nope();
        return;
      }
      if (d.food) return this._eat(d);
      this._begin(d, { from: item });
    }

    _eat(d) {
      const p = this.game.player;
      p.money -= d.price;
      VH.events.emit('money:changed', { delta: -d.price, reason: d.name });
      const before = p.health;
      p.heal(d.heal);
      this.counts[d.id] = (this.counts[d.id] || 0) + 1;
      if (this.audio) this.audio.ding();
      this.game.hud.notify({ title: d.name.replace(/^An? /, ''), text: d.line + (p.health > before ? ' +' + Math.round(p.health - before) + ' health' : ''), icon: d.icon });
    }

    _begin(d, opts) {
      const g = this.game;
      const p = g.player;
      if (!opts.free && d.price) {
        p.money -= d.price;
        VH.events.emit('money:changed', { delta: -d.price, reason: d.name });
      }
      const s = (this.session = new Session(this, d, opts));
      if (opts.players === 2) s.data.players = 2;
      // Jay is held by the attraction: no gun, no prompts, no car keys.
      if (g.combat && g.combat.weapon && g.combat.weapon.slot !== 'unarmed') {
        this._prevWeapon = g.combat.current;
        if (g.combat.inventory.fists) g.combat.select('fists');
        else if (g.combat._model) g.combat._model.visible = false;
      }
      p.frozen = true;
      p.keepPresses = true;
      p.sprinting = false;
      p.aiming = false;
      g.interaction.enabled = false;
      this._rigMode = g.cameraRig.modeIndex;
      this.overlay.show(true);
      this.overlay.title(d.name, d.hint || (d.kind === 'ride' ? 'Mouse / right stick  look around   ·   V  change view   ·   Esc / B  get off at the next stop' : 'Esc / B  stop'));
      g.cameraShot = this._shotFn;
      s._poll();
      s._poll();
      this.counts[d.id] = (this.counts[d.id] || 0) + 1;
      VH.events.emit('carnival:start', { id: d.id });
      try {
        d.start(s);
      } catch (e) {
        console.error('[carnival] ' + d.id + ' start failed', e);
        this._finish(s, false, null, false, 'error');
      }
    }

    /** End a session: results, tickets, the event, Jay back on his feet. */
    _finish(s, completed, text, card, why) {
      if (s.done) return;
      s.done = true;
      const d = s.def;
      const g = this.game;
      const tickets = Math.max(0, Math.round(s.tickets || 0));
      const score = Math.round(s.score || 0);
      let newBest = false;
      if (d.scored && completed && score > 0 && score > (this.best[d.id] || 0)) {
        this.best[d.id] = score;
        newBest = true;
      }
      if (tickets) this.award(tickets, d.name);
      const result = { id: d.id, score, tickets, completed: !!completed, why: why || (completed ? 'done' : 'stopped') };
      VH.events.emit('carnival:end', result);
      this._release(s);
      if (card) {
        const rows = [];
        if (d.scored) rows.push([d.unit ? d.unit.charAt(0).toUpperCase() + d.unit.slice(1) : 'Score', score, 'big']);
        if (d.scored) rows.push(['Best', (this.best[d.id] || score) + (newBest ? '  new best!' : ''), newBest ? 'best' : '']);
        rows.push(['Tickets', '+' + tickets, 'tickets']);
        this.overlay.show(true);
        this.overlay.title('', '');
        this.overlay.results(text || d.name, rows, 'E / Space / A  carry on');
        this._card = { t: 0 };
        if (this.audio) (tickets > 0 ? this.audio.win() : this.audio.lose());
      }
      if (s.opts.resolve) s.opts.resolve(result);
    }

    /** Give Jay back to the player. */
    _release(s) {
      const g = this.game;
      const p = g.player;
      this._unseat();
      p.frozen = false;
      p.keepPresses = false;
      p.model.setHeadVisible(true);
      g.interaction.enabled = true;
      if (g.cameraShot === this._shotFn) g.cameraShot = null;
      const cam = g.renderer.camera;
      if (cam.fov !== g.cameraRig.fov) {
        cam.fov = g.cameraRig.fov;
        cam.updateProjectionMatrix();
      }
      if (this._rigMode !== undefined) g.cameraRig.modeIndex = this._rigMode;
      g.cameraRig.snapBehind(p);
      if (this._prevWeapon && g.combat) g.combat.select(this._prevWeapon);
      this._prevWeapon = null;
      this.overlay.show(false);
      if (this.audio) this.audio.rideStop();
      this.session = null;
    }

    _unseat() {
      const p = this.game.player;
      p.enterPose = null;
      p.enterLift = 0;
      p.model.root.quaternion.identity();
      p.model.root.rotation.set(0, p.heading, 0);
      // Feet on whatever is under him.
      const gy = this.game.physics.groundHeight(p.pos.x, p.pos.z, p.pos.y + 1.0);
      if (Math.abs(gy - p.pos.y) < 1.5) p.pos.y = gy;
      p.prevPos.copy(p.pos);
      p.vel.set(0, 0, 0);
      p.state = p.state === 'dead' ? 'dead' : 'ground';
      p.grounded = true;
    }

    _force(why) {
      const s = this.session;
      if (!s) return;
      try {
        if (s.def.stop) s.def.stop(s, why);
      } catch (e) {
        console.error(e);
      }
      this._finish(s, false, null, false, why);
    }

    /** Esc / pad Menu while something runs: get off at the next stop (or close the results). main.js asks first. */
    escape() {
      if (this._card) {
        this._closeCard();
        return true;
      }
      const s = this.session;
      if (!s) return false;
      const now = performance.now();
      if (now - this._escAt < 450) return true; // the key and the lost mouse lock arrive together
      this._escAt = now;
      let handled = false;
      if (s.def.escape) handled = !!s.def.escape(s);
      if (!handled && !s.leaving) {
        s.leaving = true;
        if (s.def.kind === 'ride') this.overlay.caption('Getting off at the next stop');
      }
      return true;
    }

    _closeCard() {
      this._card = null;
      this.overlay.show(false);
    }

    /** Something frightening near the fair: whoever's riding gets off, and the rides shut for a while. */
    alarm(why) {
      if (!this.ok) return;
      const first = this.closedFor <= 0;
      this.closedFor = CLOSED;
      const s = this.session;
      if (s && !s.emergency) {
        s.emergency = true;
        s.leaving = true;
        if (s.def.kind === 'ride') this.overlay.caption(why === 'car' ? 'Everybody off! There\'s a car on the fairground!' : 'Everybody off, please! The ride is stopping.', 4000);
      }
      if (first && this.atFair && this.game.dialogue) this.game.dialogue.play([['attendant', why === 'car' ? 'Get that car off the fairground! Rides are stopping!' : 'Rides are closing for a few minutes, folks. Stay calm.']], { mode: 'ambient' });
      VH.events.emit('carnival:alarm', { why });
    }

    _near(x, z, r) {
      return x > FAIR.x0 - r && x < FAIR.x1 + r && z > FAIR.z0 - r && z < FAIR.z1 + r;
    }

    award(n, why) {
      if (!n) return;
      this.tickets += n;
      this.earned += Math.max(0, n);
      this.ticketVal.textContent = String(this.tickets);
      this.ticketEl.classList.remove('pop');
      void this.ticketEl.offsetWidth;
      this.ticketEl.classList.add('pop');
      VH.events.emit('carnival:tickets', { tickets: this.tickets, delta: n, why });
    }

    spend(n) {
      if (n > this.tickets) return false;
      this.award(-n, 'spent');
      return true;
    }

    _showTickets(on) {
      this.ticketVal.textContent = String(this.tickets);
      this.ticketEl.classList.toggle('on', !!on);
    }

    // ------------------------------------------------------------- camera
    /** Place the camera from the session's latest shot (also main.js's cameraShot hook). */
    _applyCam(cam) {
      const s = this.session;
      const C = s && s._cam;
      if (!C) return false;
      cam = cam || this.game.renderer.camera;
      const t = this.game.time || 0;
      let shake = C.shake + s._shakeT;
      if (!(this.game.settings && this.game.settings.get('gameplay.cameraShake'))) shake *= 0.3;
      const sx = shake ? (Math.sin(t * 37.1) + Math.sin(t * 23.3)) * 0.012 * shake : 0;
      const sy = shake ? (Math.sin(t * 41.7) + Math.sin(t * 17.9)) * 0.012 * shake : 0;
      if (C.mode === 'eye') {
        cam.position.set(C.x, C.y, C.z);
        cam.rotation.set(clamp(C.pitch + sy, -1.5, 1.5), C.yaw + Math.PI + sx, C.roll, 'YXZ');
      } else if (C.mode === 'chase') {
        const cp = Math.cos(C.pitch);
        this._dir.set(Math.sin(C.yaw) * cp, Math.sin(C.pitch), Math.cos(C.yaw) * cp);
        let d = C.dist;
        // Keep the camera out of walls: the first solid thing between the target and the camera.
        const ph = this.game.physics;
        const hit = ph.raycast ? ph.raycast(C.x, C.y, C.z, -this._dir.x, -this._dir.y, -this._dir.z, d, { flags: VH.COLLIDE.CAMERA }) : null;
        if (hit) d = Math.max(1.2, hit.t - 0.3);
        cam.position.set(C.x - this._dir.x * d, Math.max(C.y - this._dir.y * d, 0.6), C.z - this._dir.z * d);
        cam.lookAt(C.x, C.y, C.z);
        if (sx) cam.rotation.z += sx;
      } else {
        cam.position.set(C.x, C.y, C.z);
        cam.lookAt(C.tx, C.ty, C.tz);
      }
      if (Math.abs(cam.fov - C.fov) > 0.05) {
        cam.fov = C.fov;
        cam.updateProjectionMatrix();
      }
      cam.updateMatrixWorld();
      return true;
    }

    // ------------------------------------------------------------- update
    update(dt) {
      if (!this.ok) return;
      this._dt = dt;
      const g = this.game;
      const p = g.player;
      const dx = p.pos.x - FAIR.cx, dz = p.pos.z - FAIR.cz;
      const awake = dx * dx + dz * dz < WAKE * WAKE || !!this.session;
      if (awake !== this.awake) {
        this.awake = awake;
        if (!awake) {
          this.figures.hide();
          for (const d of DEFS) if (d.sleepNow) d.sleepNow(this);
          if (this.audio) this.audio.fair(0, 0);
        }
      }
      if (this._card) {
        this._card.t += dt;
        this.overlay.tick(dt);
        if (g.input.consume('interact') || g.input.consume('jump') || this._card.t > 7) this._closeCard();
      }
      if (!awake) return;
      if (this.closedFor > 0) this.closedFor -= dt;
      const at = p.pos.x > FAIR.x0 && p.pos.x < FAIR.x1 && p.pos.z > FAIR.z0 && p.pos.z < FAIR.z1;
      if (at !== this.atFair) {
        this.atFair = at;
        this._showTickets(at || !!this.session);
      }
      // A car driven in among the rides (not on the roads round the fence).
      if ((this._alarmCheck -= dt) <= 0) {
        this._alarmCheck = 0.5;
        this._checkCars();
        this._prompts();
      }
      // Fair life: each attraction near Jay, then the riders drawn in one go.
      this.figures.begin();
      const s = this.session;
      for (const d of DEFS) {
        if (d.broken || !d.idle) continue;
        if (s && s.def === d) continue;
        if (d.sleep) {
          const ex = p.pos.x - d.x, ez = p.pos.z - d.z;
          if (ex * ex + ez * ez > d.sleep * d.sleep) continue;
        }
        d.idle(dt, this);
      }
      if (s) this._run(s, dt);
      this.figures.end();
      this.overlay.tick(dt);
      this._ambience(dt);
    }

    _run(s, dt) {
      const g = this.game;
      s._poll();
      s.t += dt;
      if (s._shakeT > 0) s._shakeT = Math.max(0, s._shakeT - dt * 2.5);
      // Pad: B (crouch) gets off too.
      if (s.pressed('crouch')) this.escape();
      // Anything that should never happen on a ride: stop at once.
      if (g.player.state === 'dead') return this._force('died');
      if (g.missions && g.missions.run && !s.opts.story) return this._force('mission');
      try {
        s.def.update(dt, s);
      } catch (e) {
        console.error('[carnival] ' + s.id + ' update failed', e);
        this._force('error');
        return;
      }
      if (!s.done && s._cam) this._applyCam();
    }

    _checkCars() {
      const list = this.game.vehicles && this.game.vehicles.list;
      if (!list) return;
      const x0 = FAIR.x0 + 3, x1 = FAIR.x1 - 3, z0 = FAIR.z0 + 3, z1 = FAIR.z1 - 3;
      for (const v of list) {
        if (!v || v.removed || !v.pos) continue;
        if (v.pos.x < x0 || v.pos.x > x1 || v.pos.z < z0 || v.pos.z > z1) continue;
        if (Math.abs(v.speed || 0) > 1.5 || v === this.game.player.vehicle) {
          this.alarm('car');
          return;
        }
      }
    }

    /** Prompts say when a ride is shut. */
    _prompts() {
      const closed = this.closedFor > 0;
      for (const it of this._promptItems) {
        const d = this.byId[it.attraction];
        const label = d && d.kind === 'ride' && closed ? d.name.replace(/^the /i, 'The ') + ': closed for a moment' : it.baseLabel;
        if (it.label !== label) {
          it.label = label;
          it.price = closed && d.kind === 'ride' ? 0 : d.price || 0;
          if (this.game.interaction.current === it) VH.events.emit('interaction:focus', { item: it });
        }
      }
    }

    /** The fairground's hum and music by where Jay stands; barkers calling now and then. */
    _ambience(dt) {
      const g = this.game;
      const p = g.player;
      const ex = clamp(p.pos.x, FAIR.x0, FAIR.x1) - p.pos.x, ez = clamp(p.pos.z, FAIR.z0, FAIR.z1) - p.pos.z;
      const out = Math.hypot(ex, ez);
      const k = clamp(1 - out / 160, 0, 1);
      if (this.audio) this.audio.fair(k, dt, p.pos, this.session);
      if (!this.atFair || this.session || !g.dialogue || g.dialogue.active) return;
      if ((this._barkT -= dt) > 0) return;
      this._barkT = 14 + Math.random() * 12;
      // The barker of the nearest attraction that has some lines.
      let best = null, bd = 30;
      for (const d of DEFS) {
        if (!d.barks || !d.barks.length) continue;
        const dd = Math.hypot(d.x - p.pos.x, d.z - p.pos.z);
        if (dd < bd) {
          bd = dd;
          best = d;
        }
      }
      if (best) g.dialogue.play([['barker', best.barks[Math.floor(Math.random() * best.barks.length)]]], { mode: 'ambient' });
    }

    // -------------------------------------------------------------- state
    stats() {
      const rides = DEFS.filter((d) => d.kind === 'ride').reduce((n, d) => n + (this.counts[d.id] || 0), 0);
      return [['Wonder Wharf rides', rides], ['Fair tickets', this.tickets + ' (' + this.earned + ' won)']];
    }

    get saveKey() {
      return 'carnival';
    }

    serialize() {
      const own = {};
      for (const d of DEFS) if (d.serialize) own[d.id] = d.serialize();
      return { v: SAVE_V, tickets: this.tickets, earned: this.earned, best: Object.assign({}, this.best), counts: Object.assign({}, this.counts), prizes: Object.assign({}, this.prizes), own };
    }

    load(d) {
      if (this.session) this._force('load');
      this.tickets = 0;
      this.earned = 0;
      this.best = {};
      this.counts = {};
      this.prizes = {};
      if (d && typeof d === 'object') {
        this.tickets = Math.max(0, d.tickets | 0);
        this.earned = Math.max(0, d.earned | 0);
        if (d.best) Object.assign(this.best, d.best);
        if (d.counts) Object.assign(this.counts, d.counts);
        if (d.prizes) Object.assign(this.prizes, d.prizes);
        for (const def of DEFS) if (def.load) def.load(d.own ? d.own[def.id] : undefined);
      } else for (const def of DEFS) if (def.load) def.load(undefined);
      this._showTickets(this.atFair);
    }

    reset() {
      this._force('reset');
      if (this._card) this._closeCard();
      this.closedFor = 0;
    }

    stop() {
      this._force('stop');
      if (this._card) this._closeCard();
      if (this.audio) this.audio.fair(0, 0);
    }
  }

  Carnival.define = Carnival.define.bind(Carnival);
  Carnival.POSES = POSES;
  Carnival.HIP = HIP;
  Carnival.FAIR = FAIR;
  Carnival.Figures = Figures;
  VH.Carnival = Carnival;
})();
