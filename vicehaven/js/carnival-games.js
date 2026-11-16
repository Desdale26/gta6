/*
 * carnival-games.js — Wonder Wharf's stall games, each a game of skill on
 * the midway framework (js/carnival-midway.js: VH.Carnival.stall, whose
 * header documents the hooks and the kit):
 *
 *   grabber   the Golden Grabber: steer the claw, drop it, carry a teddy to
 *             the chute (three tries; the claw swings, a loose grip slips)
 *   shoot     Sharpshooter Alley: a cork rifle, two rows of ducks going by
 *             and bullseyes popping up (25 corks; the corks take a moment
 *             to get there, so lead the ducks)
 *   hoopla    Ring Fling: eight rings at pegs on a stepped table; aim left or
 *             right, hold to swing the power, let go when the marker is on a
 *             peg (a ringer scores in full, a leaner half)
 *   cans      Tin Can Tumble: three balls at a pyramid of six tins, three
 *             pyramids a go; the tins fly, bounce and fall (a small physics
 *             sim: a tin counts when it's off the shelf)
 *
 * Every game: a fixed price, 30–60 seconds, tickets by the score (a go played
 * to the end always wins at least one), and "challenge a friend" (two players
 * take turns on the same go).
 */
(function () {
  'use strict';

  const VH = window.VH;
  const Carnival = VH.Carnival;
  if (!Carnival || !Carnival.stall) return;
  const KERB = 0.15;
  const PI = Math.PI;
  const TAU = PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const _q = new THREE.Quaternion();
  const _e = new THREE.Euler(0, 0, 0, 'YXZ');
  const PLUSH = Carnival.Midway.PLUSH;

  /** A cheap random that is the same every time for a seed. */
  const hash = (n) => {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  };

  /**
   * Static dressing inside a booth (backdrops, shelves, rails), merged into
   * the chunk like the booth itself: deco(world, K, key) gives put(surface,
   * u0, y0, v0, u1, y1, v1, colour) in the booth's frame.
   */
  function deco(world, K, key) {
    const B = K.BOOTHS[key] || K.STANDS[key];
    const F = K.frame(B);
    const ctx = world.ctxAt(B.x, B.z);
    const r = [0, 0, 0, 0];
    const put = (surf, u0, y0, v0, u1, y1, v1, col, opts) => {
      F.box(u0, v0, u1, v1, r);
      ctx[surf].box(r[0], y0, r[1], r[2], y1, r[3], VH.col(col), opts);
    };
    put.F = F;
    put.ctx = ctx;
    return put;
  }
  const decorate = (f) => Carnival.Midway.builders.push(f);

  /** A teddy bear sitting up, `s` tall, white (the instance colour tints it), dark eyes and nose. */
  function teddyGeometry(s) {
    const g = new VH.GeometryBuilder({});
    const W = VH.col(0xffffff), M = VH.col(0xf3e6d2), K = VH.col(0x1a1414);
    const k = s / 0.24;
    const b = (x0, y0, z0, x1, y1, z1, c) => g.box(x0 * k, y0 * k, z0 * k, x1 * k, y1 * k, z1 * k, c);
    b(-0.075, 0, -0.06, 0.075, 0.13, 0.06, W); //  body
    b(-0.045, 0.02, 0.06, 0.045, 0.1, 0.07, M); // tummy
    b(-0.09, 0.0, 0.0, -0.045, 0.04, 0.11, W); //   legs out in front
    b(0.045, 0.0, 0.0, 0.09, 0.04, 0.11, W);
    b(-0.105, 0.06, -0.03, -0.075, 0.12, 0.03, W); // arms
    b(0.075, 0.06, -0.03, 0.105, 0.12, 0.03, W);
    b(-0.065, 0.13, -0.055, 0.065, 0.235, 0.055, W); // head
    b(-0.03, 0.15, 0.055, 0.03, 0.19, 0.08, M); //  muzzle
    b(-0.012, 0.175, 0.08, 0.012, 0.19, 0.085, K); // nose
    b(-0.04, 0.2, 0.055, -0.024, 0.214, 0.058, K); // eyes
    b(0.024, 0.2, 0.055, 0.04, 0.214, 0.058, K);
    b(-0.07, 0.22, -0.02, -0.035, 0.255, 0.02, W); // ears
    b(0.035, 0.22, -0.02, 0.07, 0.255, 0.02, W);
    return g.build();
  }

  // ========================================================== GOLDEN GRABBER
  // The machine (neonstrand.js GRABBER): a 1.7 m glass case on a gold base, the front facing the midway.
  const GB = {
    floor: KERB + 1.1, //  the prizes' floor
    top: KERB + 2.24, //   the gantry
    half: 0.78, //         inside the glass
    chute: 0.4, //         the chute: u and v both above this (the front right corner)
    home: [-0.55, 0.55],
    speed: 0.45, //        the claw's top speed (m/s)
    reach: 0.13, //        the fingers' reach from the head's middle
    steer: 12, //          seconds to line up a drop
    carry: 10, //          seconds to carry a prize to the chute
    tries: 3,
  };
  const BEAR_H = 0.24;
  const BEARS = 14;
  // Where the teddies sit at the start of a go: [u, v, layer].
  const PILE = [
    [-0.6, -0.6, 0], [-0.2, -0.62, 0], [0.2, -0.6, 0], [0.6, -0.58, 0], [-0.62, -0.2, 0], [-0.22, -0.18, 0], [0.18, -0.22, 0],
    [0.6, -0.2, 0], [-0.58, 0.2, 0], [-0.2, 0.22, 0], [0.2, 0.18, 0], [-0.4, -0.4, 1], [0.0, -0.4, 1], [0.4, -0.4, 1],
  ];
  const BEAR_TINTS = [0xff7ab0, 0x5ab8e8, 0xffd24a, 0x7dcf6a, 0xb45cff, 0xff8a3c, 0xf6f1e4, 0xe0403a, 0x2fb7b0, 0xc89a6a, 0xff7ab0, 0x5ab8e8, 0xffd24a, 0xd4a017];

  Carnival.stall({
    id: 'grabber',
    name: 'the Golden Grabber',
    tagline: 'Steer the claw, drop it, carry a teddy to the chute.',
    price: 2,
    unit: 'teddies',
    radius: 2.0,
    stand: [-0.42, 1.45],
    promptV: 1.0,
    cam: [0.62, 2.28, 2.65, -0.02, 1.55, -0.12, 46],
    seconds: null,
    holder: false,
    howto: [
      'Three tries. Steer the claw over a teddy and drop it.',
      'Wait for the claw to stop swinging: drop it dead centre and it grips tight; off-centre it lets go.',
      'Carry the teddy to the chute in the front corner and drop it in. Go gently: a loose grip slips.',
    ],
    keys: 'W A S D / mouse / left stick  move the claw   ·   Space / click / A  drop',
    prize: '8 for each teddy (and you keep the teddy)',
    barks: ['The Golden Grabber! Nobody leaves empty-handed... well, hardly anybody!', 'Two dollars, three tries! Grab yourself a teddy!', 'Steady hands win teddies! Step up to the Grabber!'],
    statKeys: { tries: 1 },

    tickets(score) {
      return 1 + score * 8;
    },

    verdict(g) {
      return g.score === 1 ? '1 teddy' : g.score + ' teddies';
    },

    build(kit) {
      const B = (this.parts = kit.boxes(24));
      const chrome = 0xc9ced4, gold = 0xd4a017;
      const T = GB.top, F0 = GB.floor, h = GB.half;
      // The gantry's rails along each side; the bridge and the carriage run on them (place()).
      B.box(0, -0.84, T + 0.03, -0.82, -0.78, T + 0.08, 0.82, chrome);
      B.box(1, 0.78, T + 0.03, -0.82, 0.84, T + 0.08, 0.82, chrome);
      // The floor: red velvet; the chute's walls and its dark mouth; the backdrop; the prize flap at the front.
      B.box(20, -0.84, F0 - 0.02, -0.84, 0.84, F0, -0.0 + 0.84, 0x8a1c2c);
      const c0 = GB.chute;
      B.box(10, c0, F0, c0, 0.84, F0 + 0.3, c0 + 0.02, 0xbfefff);
      B.box(11, c0, F0, c0, c0 + 0.02, F0 + 0.3, 0.84, 0xbfefff);
      B.box(12, c0 + 0.02, F0 + 0.001, c0 + 0.02, 0.84, F0 + 0.004, 0.84, 0x0d0a12);
      B.box(15, -0.84, F0, -0.86, 0.84, T, -0.83, 0x3a1460);
      B.box(19, 0.42, KERB + 0.35, 0.9, 0.8, KERB + 0.72, 0.92, 0x16121c);
      // The famous gear stick, on its plinth in the back corner under its own cover: not a prize.
      B.box(16, -0.8, F0, -0.8, -0.56, F0 + 0.32, -0.56, 0x2a1d3a);
      B.box(17, -0.695, F0 + 0.32, -0.695, -0.665, F0 + 0.62, -0.665, chrome);
      B.part(18, -0.68, F0 + 0.66, -0.68, 0.085, 0.085, 0.085, 0.4, 0.6, 0.2, gold);
      for (let k = 0; k < 3; k++) B.part(6 + k, 0, T, 0, 0.022, 0.15, 0.035, 0, 0, 0, chrome); // the fingers' colour (placed by place())
      B.box(21, -0.82, F0 + 0.32, -0.82, -0.54, F0 + 0.8, -0.81, 0xbfefff);
      B.box(22, -0.55, F0 + 0.32, -0.82, -0.54, F0 + 0.8, -0.54, 0xbfefff);
      B.done();
      // The teddies.
      this.bearMesh = kit.mesh(teddyGeometry(BEAR_H), BEARS);
      const col = new THREE.Color();
      for (let i = 0; i < BEARS; i++) this.bearMesh.setColorAt(i, col.set(BEAR_TINTS[i]));
      this.bears = [];
      for (let i = 0; i < BEARS; i++) this.bears.push({ i, u: 0, v: 0, y: F0, yaw: 0, vy: 0, state: 'rest', layer: 0, t: 0 });
      // The glass: four see-through panes.
      const glass = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.2, 1.7), new THREE.MeshBasicMaterial({ color: 0xc8f2ff, transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide }));
      glass.position.set(0, KERB + 1.7, 0);
      glass.renderOrder = 2;
      kit.group.add(glass);
      // The claw's own state (drawn by place()).
      this.claw = { u: GB.home[0], v: GB.home[1], vu: 0, vv: 0, su: 0, sv: 0, svu: 0, svv: 0, y: T - 0.22, open: 0.55, hu: GB.home[0], hv: GB.home[1] };
      this.reset();
    },

    /** Put the teddies back in the pile (a little different each go) and the claw home. */
    reset(n) {
      const k = (n || 0) * 3.7 + (this._goes = (this._goes || 0) + 1) * 1.3;
      this.bears.forEach((b, i) => {
        const [u, v, layer] = PILE[i];
        b.u = u + (hash(i + k) - 0.5) * 0.08;
        b.v = v + (hash(i * 3 + k) - 0.5) * 0.08;
        b.layer = layer;
        b.y = GB.floor + layer * 0.17;
        b.yaw = (hash(i * 7 + k) - 0.5) * 1.2;
        b.state = 'rest';
        b.vy = 0;
      });
      const C = this.claw;
      C.u = C.hu = GB.home[0];
      C.v = C.hv = GB.home[1];
      C.vu = C.vv = C.su = C.sv = C.svu = C.svv = 0;
      C.y = GB.top - 0.22;
      C.open = 0.55;
      this.held = null;
      this.place();
    },

    begin(g, s) {
      g.tries = GB.tries;
      g.stage = 'steer';
      g.st = 0;
      g.cx = GB.home[0];
      g.cy = -GB.home[1];
      g.grip = 0;
      s.ui.stat('tries', 'Tries left', g.tries);
    },

    pose(g) {
      // A hand on the stick, a hand by the button.
      const C = this.claw;
      return { w: 1, shoulderL: 1.0 + C.vv * 0.3, shoulderR: 0.95, elbowL: 1.1, elbowR: 1.2, lean: 0.18, twist: C.vu * 0.4, splayL: 0.15, splayR: 0.1 };
    },

    /** The claw's carriage moves towards the cursor; its head swings on the cable. */
    steer(dt, g, s, free) {
      const C = this.claw;
      const h = GB.half - 0.08;
      if (free) this.kit.cursor(g, dt, GB.speed, -h, h, -h, h, 0.55);
      const tu = free ? g.cx : C.u, tv = free ? -g.cy : C.v;
      const want = (d) => clamp(d * 5, -GB.speed, GB.speed);
      const wu = want(tu - C.u), wv = want(tv - C.v);
      const acc = 1.6 * dt;
      const au = clamp(wu - C.vu, -acc, acc), av = clamp(wv - C.vv, -acc, acc);
      C.vu += au;
      C.vv += av;
      C.u = clamp(C.u + C.vu * dt, -h, h);
      C.v = clamp(C.v + C.vv * dt, -h, h);
      // The swing: a pendulum the carriage drags about, slowly dying away.
      const w2 = 9.8 / Math.max(0.15, GB.top - C.y);
      C.svu += (-w2 * C.su - au / Math.max(dt, 1e-4)) * dt;
      C.svv += (-w2 * C.sv - av / Math.max(dt, 1e-4)) * dt;
      const damp = Math.exp(-1.4 * dt);
      C.svu *= damp;
      C.svv *= damp;
      C.su = clamp(C.su + C.svu * dt, -0.12, 0.12);
      C.sv = clamp(C.sv + C.svv * dt, -0.12, 0.12);
      C.hu = C.u + C.su;
      C.hv = C.v + C.sv;
      const moving = Math.hypot(C.vu, C.vv);
      if (this.c.audio) this.c.audio.ride(moving > 0.02 ? 0.12 + moving * 0.3 : 0, 0);
      return moving;
    },

    /** The highest teddy under the claw's head (or null). */
    under(hu, hv) {
      let best = null;
      for (const b of this.bears) {
        if (b.state !== 'rest') continue;
        if (Math.hypot(b.u - hu, b.v - hv) > 0.12) continue;
        if (!best || b.y > best.y) best = b;
      }
      return best;
    },

    play(dt, g, s) {
      const C = this.claw;
      g.st += dt;
      const press = s.pressed('fire') || s.pressed('jump') || s.pressed('interact');
      switch (g.stage) {
        case 'steer': {
          this.steer(dt, g, s, true);
          const left = GB.steer - g.st;
          s.ui.timer(left);
          if (press || left <= 0) {
            g.stage = 'drop';
            g.st = 0;
            s.ui.timer(null);
            // The head drops from wherever its swing has it.
            C.hu = clamp(C.hu, -GB.half + 0.05, GB.half - 0.05);
            C.hv = clamp(C.hv, -GB.half + 0.05, GB.half - 0.05);
            const b = this.under(C.hu, C.hv);
            g.stopY = b ? b.y + BEAR_H - 0.07 : GB.floor + 0.03;
            s.sound('clank', { gain: 0.7 });
          }
          break;
        }
        case 'drop':
          C.y -= dt * 0.55;
          C.open = Math.min(0.75, C.open + dt);
          if (C.y <= g.stopY) {
            C.y = g.stopY;
            g.stage = 'close';
            g.st = 0;
          }
          break;
        case 'close':
          C.open = Math.max(0.06, C.open - dt * 1.6);
          if (g.st > 0.45) {
            // Which teddy, and how well: the head's distance from its middle.
            let pick = null, pd = GB.reach;
            for (const b of this.bears) {
              if (b.state !== 'rest') continue;
              const top = b.y + BEAR_H;
              if (top < C.y - 0.02 || top > C.y + 0.16) continue;
              const d = Math.hypot(b.u - C.hu, b.v - C.hv);
              if (d < pd) {
                pd = d;
                pick = b;
              }
            }
            g.grip = pick ? 1 - pd / GB.reach : 0;
            if (pick) {
              pick.state = 'held';
              pick.ou = pick.u - C.hu;
              pick.ov = pick.v - C.hv;
              this.held = pick;
              s.sound('clank', { gain: 0.5 });
              // Anything sat on it slides off.
              for (const o of this.bears) if (o.state === 'rest' && o.y > pick.y + 0.05 && Math.hypot(o.u - pick.u, o.v - pick.v) < 0.2) this.fall(o);
            }
            s.ui.caption(!pick ? 'Missed!' : g.grip > 0.6 ? 'Got it! A good tight grip.' : g.grip > 0.3 ? 'Got it... a loose grip. Go gently.' : 'It\'s only got an ear...', 1800);
            g.stage = 'lift';
            g.st = 0;
          }
          break;
        case 'lift':
          C.y = Math.min(GB.top - 0.22, C.y + dt * 0.5);
          if (C.y >= GB.top - 0.22) {
            g.stage = this.held ? 'carry' : 'home';
            g.st = 0;
            if (this.held && g.grip < 0.3) {
              // Touches it, thinks about it, lets go.
              this.let(s, 'It let go!');
              g.stage = 'home';
            }
          }
          break;
        case 'carry': {
          this.steer(dt, g, s, true);
          const left = GB.carry - g.st;
          s.ui.timer(left);
          // A loose grip slips if the claw swings about.
          const sw = Math.hypot(C.su, C.sv);
          if (this.held && g.grip < 0.6 && sw > 0.015 + 0.1 * g.grip) {
            this.let(s, 'It slipped out!');
            g.stage = 'home';
            g.st = 0;
            s.ui.timer(null);
          } else if (press || left <= 0) {
            this.let(s, null);
            g.stage = 'home';
            g.st = 0;
            s.ui.timer(null);
          }
          break;
        }
        case 'home':
          // Back to the corner, then the next try (once anything dropped has landed).
          g.cx = GB.home[0];
          g.cy = -GB.home[1];
          C.open = Math.min(0.55, C.open + dt);
          this.steer(dt, g, s, false);
          C.u += clamp(GB.home[0] - C.u, -dt * 0.5, dt * 0.5);
          C.v += clamp(GB.home[1] - C.v, -dt * 0.5, dt * 0.5);
          if (g.st > 1.4 && !this.bears.some((b) => b.state === 'fall' || b.state === 'chute')) {
            g.tries--;
            s.ui.stat('tries', 'Tries left', g.tries);
            if (g.tries <= 0) g.over = g.score ? 'DONE!' : 'NO LUCK!';
            else {
              g.stage = 'steer';
              g.st = 0;
            }
          }
          break;
      }
      this.fallers(dt, g, s);
      this.place();
    },

    after(dt, g, s) {
      this.fallers(dt, g, s);
      this.place();
    },

    /** The claw opens: the teddy it held drops (into the chute, if it's over it). */
    let(s, why) {
      const b = this.held;
      this.held = null;
      this.claw.open = 0.55;
      if (!b) return;
      this.fall(b);
      if (why) s.ui.caption(why, 1600);
      s.sound('clank', { gain: 0.4 });
    },

    fall(b) {
      b.state = 'fall';
      b.vy = 0;
    },

    /** Teddies falling: into the chute (won), or onto the pile. */
    fallers(dt, g, s) {
      for (const b of this.bears) {
        if (b.state === 'held') {
          const C = this.claw;
          b.u = C.hu + b.ou;
          b.v = C.hv + b.ov;
          b.y = C.y - BEAR_H + 0.05;
          continue;
        }
        if (b.state === 'chute') {
          b.y -= dt * 1.5;
          b.t += dt;
          if (b.t > 0.4) b.state = 'won';
          continue;
        }
        if (b.state !== 'fall') continue;
        b.vy -= 9.8 * dt;
        b.y += b.vy * dt;
        const inChute = b.u > GB.chute + 0.03 && b.v > GB.chute + 0.03;
        if (inChute) {
          if (b.y < GB.floor + 0.05) {
            b.state = 'chute';
            b.t = 0;
            g.score++;
            s.ui.big('WINNER!', 1100);
            s.sound('win');
            s.sound('cheer', { gain: 0.6 });
            this.kit.burst(0.6, KERB + 0.6, 1.0, 0xffd24a, 22);
            s.carnival.prizes.teddy = (s.carnival.prizes.teddy || 0) + 1;
          }
          continue;
        }
        // Onto the floor, or onto another teddy.
        let land = GB.floor;
        for (const o of this.bears) {
          if (o === b || o.state !== 'rest') continue;
          if (Math.hypot(o.u - b.u, o.v - b.v) < 0.15) land = Math.max(land, o.y + 0.17);
        }
        b.u = clamp(b.u, -GB.half + 0.06, GB.half - 0.06);
        b.v = clamp(b.v, -GB.half + 0.06, GB.half - 0.06);
        if (b.y <= land) {
          b.y = land;
          b.state = 'rest';
          s.sound('thud', { gain: 0.3 });
        }
      }
    },

    /** Draw the claw and the teddies. */
    place() {
      const kit = this.kit, B = this.parts, C = this.claw, T = GB.top;
      B.box(2, -0.82, T - 0.02, C.v - 0.04, 0.82, T + 0.04, C.v + 0.04, 0xc9ced4);
      B.part(3, C.u, T - 0.04, C.v, 0.12, 0.07, 0.12, 0, 0, 0, 0xffd24a);
      const headY = C.y + 0.16;
      // The cable from the carriage to the head (leaning with the swing).
      const dx = C.hu - C.u, dz = C.hv - C.v, dy = T - 0.07 - (headY + 0.04);
      const len = Math.hypot(dx, dy, dz);
      B.part(4, (C.u + C.hu) / 2, (T - 0.07 + headY + 0.04) / 2, (C.v + C.hv) / 2, 0.012, len, 0.012, Math.atan2(dz, dy), 0, -Math.atan2(dx, dy), 0x2a2a2a);
      B.part(5, C.hu, headY, C.hv, 0.11, 0.08, 0.11, 0, 0, 0, 0xd4a017);
      for (let k = 0; k < 3; k++) {
        const th = (k / 3) * TAU + 0.3;
        const ox = Math.cos(th), oz = Math.sin(th);
        const L = 0.15;
        _q.setFromEuler(_e.set(-C.open, PI / 2 - th, 0));
        const r = 0.04 + Math.sin(C.open) * L * 0.5;
        B.partQ(6 + k, C.hu + ox * r, headY - 0.04 - Math.cos(C.open) * L * 0.5, C.hv + oz * r, 0.022, L, 0.035, _q);
      }
      // A spot on whatever is under the head: where it will land.
      const b = this.under(C.hu, C.hv);
      const sy = b && b !== this.held ? b.y + BEAR_H + 0.004 : GB.floor + 0.004;
      B.part(9, C.hu, sy, C.hv, 0.07, 0.004, 0.07, 0, 0, 0, 0x9fff6a);
      B.done();
      const m = this.bearMesh;
      for (const t of this.bears) {
        if (t.state === 'won' || (t.state === 'chute' && t.y < GB.floor - 0.3)) kit.hide(m, t.i);
        else kit.set(m, t.i, t.u, t.y, t.v, t.state === 'held' ? 0.25 : 0, t.yaw + PI, 0);
      }
      m.instanceMatrix.needsUpdate = true;
    },

    idleGame(dt) {
      // The claw sways a little where it's parked.
      const C = this.claw;
      if (this.held) return;
      this._idleT = (this._idleT || 0) + dt;
      C.su = Math.sin(this._idleT * 1.3) * 0.006;
      C.hu = C.u + C.su;
      C.hv = C.v;
      this.place();
    },
  });

  // ====================================================== SHARPSHOOTER ALLEY
  // In the booth's frame (12 m wide, 6 deep; the back wall's inside at v = -2.8).
  const SH = {
    corks: 25,
    seconds: 45,
    speed: 24, //      a cork's speed (m/s)
    reload: 0.7, //    seconds to push the next cork in
    back: -2.78, //    the backboard: where the aim point sits
    rows: [
      // v, the ducks' feet, speed (+u is to Jay's right), spacing, count, points
      { v: -1.45, y: KERB + 1.0, speed: 0.5, gap: 1.25, n: 9, pts: 10 },
      { v: -2.05, y: KERB + 1.62, speed: -0.8, gap: 1.4, n: 8, pts: 15 },
    ],
    popV: -2.5, //     the bullseyes' row
    popUp: KERB + 2.52,
    popDown: KERB + 1.9,
    popU: [-4.2, -2.5, -0.85, 0.85, 2.5, 4.2],
    span: 5.6, //      the ducks run from -span to +span
  };
  const DUCKS = SH.rows[0].n + SH.rows[1].n;

  function duckGeometry() {
    const g = new VH.GeometryBuilder({});
    const W = VH.col(0xffffff), O = VH.col(0xff8a1f), K = VH.col(0x111111), S = VH.col(0x6b4a32);
    g.box(-0.16, 0.06, -0.05, 0.12, 0.2, 0.05, W); //  body (faces +u)
    g.box(-0.2, 0.14, -0.04, -0.14, 0.24, 0.04, W); // tail
    g.box(0.04, 0.2, -0.045, 0.15, 0.31, 0.045, W); // head
    g.box(0.15, 0.24, -0.025, 0.22, 0.27, 0.025, O); // beak
    g.box(0.1, 0.27, -0.048, 0.125, 0.29, 0.048, K); // eyes
    g.box(-0.02, 0, -0.015, 0.02, 0.06, 0.015, S); //   the peg it rides on
    return g.build();
  }

  function bullseyeGeometry() {
    // Built lying along +y (the face up), then stood up to face +v: y → v, v → -y.
    const g = new VH.GeometryBuilder({});
    const R = VH.col(0xe0403a), W = VH.col(0xffffff), S = VH.col(0x6b4a32);
    g.cylinder(0, 0, 0, 0.22, 0.22, 0.03, 16, R, true);
    g.cylinder(0, 0.03, 0, 0.15, 0.15, 0.006, 16, W, true);
    g.cylinder(0, 0.036, 0, 0.075, 0.075, 0.006, 16, R, true);
    g.box(-0.02, -0.03, 0.2, 0.02, 0, 0.7, S); // the stick (down, once stood up)
    const geo = g.build();
    geo.applyMatrix4(new THREE.Matrix4().makeRotationX(PI / 2));
    return geo;
  }

  decorate((world, K) => {
    const put = deco(world, K, 'shoot');
    const blue = 0x1f4f9a, dark = 0x13274d, crest = 0xe8f6ff, wood = 0x8a5a32;
    // The backboard: night blue with stars, a painted moon.
    put('prop', -5.85, KERB + 0.9, -2.8, 5.85, KERB + 3.2, -2.76, dark);
    for (let i = 0; i < 18; i++) {
      const u = -5.4 + hash(i * 3.1) * 10.8, y = KERB + 2.2 + hash(i * 5.7) * 0.9;
      put('screen', u - 0.03, y - 0.03, -2.76, u + 0.03, y + 0.03, -2.75, 0xfff6c8);
    }
    put('screen', 4.3, KERB + 2.6, -2.76, 4.8, KERB + 3.05, -2.75, 0xfff1a8);
    // The bullseyes' shelf, and the two rows of water the ducks ride along (waves on the boards in front).
    put('prop', -5.85, KERB + 1.6, SH.popV + 0.12, 5.85, KERB + 2.22, SH.popV + 0.16, wood);
    for (const R of SH.rows) {
      put('prop', -5.85, R.y - 0.35, R.v + 0.14, 5.85, R.y + 0.02, R.v + 0.18, blue);
      for (let u = -5.7; u < 5.6; u += 0.6) put('prop', u, R.y + 0.02, R.v + 0.15, u + 0.3, R.y + 0.09, R.v + 0.18, crest);
      put('prop', -5.85, R.y - 0.37, R.v - 0.1, 5.85, R.y - 0.35, R.v + 0.18, dark);
    }
    // Rifles chained along the counter (the one Jay uses is drawn in his hands).
    for (const u of [-4.5, -2.5, 2.5, 4.5]) {
      put('prop', u - 0.4, KERB + 1.05, 2.62, u + 0.15, KERB + 1.11, 2.68, 0x2a2a2a);
      put('prop', u + 0.15, KERB + 1.04, 2.6, u + 0.5, KERB + 1.12, 2.7, wood);
    }
  });

  Carnival.stall({
    id: 'shoot',
    name: 'Sharpshooter Alley',
    booth: 'shoot',
    tagline: 'Twenty-five corks. Ducks, gold ducks and bullseyes.',
    price: 3,
    unit: 'points',
    stand: [0, 3.7],
    cam: [0.75, 2.35, 6.1, 0, 1.85, -2.6, 46],
    seconds: SH.seconds,
    holder: [-5.0, 1.6],
    tint: 1,
    howto: [
      'Twenty-five corks, forty-five seconds. Aim with the mouse and click to fire.',
      'Ducks: 10 on the bottom row, 15 on the top row, 40 for a gold duck.',
      'Bullseyes pop up on the shelf: 25, or 50 dead centre.',
      'The cork takes a moment to get there: aim a little ahead of a duck.',
    ],
    keys: 'Mouse / right stick / W A S D  aim   ·   Click / RT / Space  fire',
    prize: 'One for every 25 points',
    barks: ['Step right up! Knock down a duck, win a prize!', 'Three dollars, twenty-five corks! Sharpshooters wanted!', 'Gold ducks pay forty! Who\'s got a steady hand?'],
    statKeys: { corks: 1 },

    tickets(score) {
      return score / 25;
    },

    verdict(g) {
      const n = SH.corks - g.corks;
      return g.score + ' points (' + g.hits + (g.hits === 1 ? ' hit' : ' hits') + ' from ' + n + (n === 1 ? ' cork)' : ' corks)');
    },

    build(kit) {
      this.duckMesh = kit.mesh(duckGeometry(), DUCKS);
      this.popMesh = kit.mesh(bullseyeGeometry(), SH.popU.length);
      this.parts = kit.boxes(12); // 0-2 the rifle, 3-6 corks in flight
      const col = new THREE.Color();
      this.ducks = [];
      let i = 0;
      SH.rows.forEach((R, r) => {
        for (let k = 0; k < R.n; k++, i++) {
          const gold = r === 1 && k % 4 === 2;
          this.duckMesh.setColorAt(i, col.set(gold ? 0xffc21a : r ? 0xfff07a : 0xffe14d));
          this.ducks.push({ i, r, k, gold, s: k * R.gap, down: 0, hit: false });
        }
      });
      this.pops = SH.popU.map((u, j) => ({ j, u, up: 0, want: 0, t: 0, hit: false }));
      this.corks = [];
      for (let j = 0; j < 4; j++) this.corks.push({ on: false, t: 0, T: 0, pu: 0, py: 0, pv: 0, au: 0, ay: 0, av: 0, rows: [] });
      // The rifle (barrel, stock, the cork in its muzzle) and the corks in flight: their colours, out of sight.
      const B = this.parts;
      B.part(0, 0, -5, 0, 0.05, 0.05, 0.6, 0, 0, 0, 0x2a2a2a);
      B.part(1, 0, -5, 0, 0.07, 0.11, 0.38, 0, 0, 0, 0x8a5a32);
      B.part(2, 0, -5, 0, 0.035, 0.035, 0.035, 0, 0, 0, 0xc89a6a);
      for (let j = 3; j < 7; j++) B.part(j, 0, -5, 0, 0.04, 0.04, 0.05, 0, 0, 0, 0xc89a6a);
      this.SH = SH;
      this.reset();
    },

    reset() {
      for (const d of this.ducks) {
        d.down = 0;
        d.hit = false;
      }
      for (const p of this.pops) {
        p.up = 0;
        p.want = 0;
        p.hit = false;
      }
      for (const c of this.corks) c.on = false;
      this.popT = 0;
      this.popN = 0;
      this.aimU = 0;
      this.aimY = KERB + 1.6;
      if (this.parts) {
        for (let j = 0; j < 7; j++) this.parts.hide(j);
        this.parts.done();
      }
      this.place(0);
    },

    begin(g, s) {
      g.corks = SH.corks;
      g.hits = 0;
      g.cool = 0;
      g.cx = 0;
      g.cy = KERB + 1.6;
      s.ui.stat('corks', 'Corks', g.corks);
    },

    pose(g) {
      // The rifle up at the shoulder, pointing where he aims.
      const up = clamp((g.cy - 1.7) * 0.25, -0.2, 0.25);
      return { w: 1, shoulderR: 0.75 + up, elbowR: 1.75, shoulderL: 1.3 + up, elbowL: 0.4, twist: -0.3 + g.cx * 0.03, lean: 0.15, splayL: -0.3, splayR: 0.5, headPitch: -up };
    },

    /** The ducks go round, the bullseyes pop up and down. */
    tick(dt, live, g) {
      const L = SH.span * 2;
      for (const d of this.ducks) {
        const R = SH.rows[d.r];
        const loop = R.n * R.gap;
        const before = d.s;
        d.s = (d.s + Math.abs(R.speed) * dt) % loop;
        if (d.s < before) {
          // Round the back and up again.
          d.hit = false;
          d.down = 0;
        }
        if (d.hit) d.down = Math.min(1, d.down + dt * 7);
      }
      // One bullseye up at a time (two later on), each for a little less time as the go goes on.
      this.popT -= dt;
      if (this.popT <= 0) {
        const late = live && g ? clamp(g.t / SH.seconds, 0, 1) : 0;
        const want = live ? (late > 0.45 ? 2 : 1) : 1;
        const up = this.pops.filter((p) => p.want).length;
        if (up < want) {
          const j = Math.floor(hash(++this.popN * 1.7 + (g ? g.n : 0)) * this.pops.length);
          const p = this.pops[j];
          if (!p.want) {
            p.want = 1;
            p.t = live ? 1.7 - 0.6 * late : 2.5;
            p.hit = false;
          }
        }
        this.popT = live ? 0.35 : 1.2;
      }
      for (const p of this.pops) {
        if (p.want) {
          p.t -= dt;
          if (p.t <= 0 || p.hit) p.want = 0;
        }
        const k = p.want && !p.hit ? 1 : 0;
        p.up += clamp(k - p.up, -dt * (p.hit ? 4 : 6), dt * 6);
      }
    },

    /** Where duck d is: u (or null when it's round the back). */
    duckU(d) {
      const R = SH.rows[d.r];
      const loop = R.n * R.gap;
      const x = d.s - (loop - SH.span * 2) / 2; // (part of the loop is behind the side walls)
      if (x < 0 || x > SH.span * 2) return null;
      return R.speed > 0 ? -SH.span + x : SH.span - x;
    },

    play(dt, g, s) {
      const kit = this.kit;
      kit.cursor(g, dt, 2.6, -5.3, 5.3, KERB + 0.95, KERB + 2.95, 2.6);
      this.tick(dt, true, g);
      g.cool -= dt;
      const fire = s.down('fire') || s.down('jump') || s.pressed('interact');
      if (fire && g.cool <= 0 && g.corks > 0) this.fire(g, s);
      this.flight(dt, g, s);
      kit.reticle(g.cx, g.cy, SH.back);
      if (g.corks <= 0 && !this.corks.some((c) => c.on)) g.over = 'OUT OF CORKS';
      this.place(dt, g);
    },

    after(dt, g, s) {
      this.tick(dt, false, g);
      this.flight(dt, g, s);
      this.place(dt, g);
    },

    idleGame(dt) {
      this.tick(dt, false, null);
      this.place(dt, null);
    },

    /** A cork: from the rifle's muzzle along the line through the reticle (as the camera sees it). */
    fire(g, s) {
      const c = this.corks.find((k) => !k.on);
      if (!c) return;
      g.cool = SH.reload;
      g.corks--;
      s.ui.stat('corks', 'Corks', g.corks);
      s.sound('pop', { gain: 1.2 });
      // The camera's line through the aim point, in the frame.
      const cam = s._cam;
      const L = this.kit.local(cam.x, cam.z, this._lc || (this._lc = { u: 0, v: 0 }));
      const cu = L.u, cy = cam.y, cv = L.v;
      const au = g.cx, ay = g.cy, av = SH.back;
      c.on = true;
      c.t = 0;
      c.pu = 0.12;
      c.py = KERB + 1.5;
      c.pv = 3.2;
      c.au = au;
      c.ay = ay;
      c.av = av;
      // When it reaches each row's depth, and where on the camera's line that is.
      c.rows.length = 0;
      const depths = [[SH.rows[0].v, 0], [SH.rows[1].v, 1], [SH.popV, 2], [av, 3]];
      for (const [v, what] of depths) {
        const k = (cv - v) / (cv - av);
        const u = cu + (au - cu) * k, y = cy + (ay - cy) * k;
        const d = Math.hypot(u - c.pu, y - c.py, v - c.pv);
        c.rows.push({ what, u, y, v, at: d / SH.speed, done: false });
      }
      c.T = c.rows[3].at;
    },

    flight(dt, g, s) {
      for (const c of this.corks) {
        if (!c.on) continue;
        c.t += dt;
        for (const R of c.rows) {
          if (R.done || c.t < R.at) continue;
          R.done = true;
          if (R.what === 3) {
            c.on = false;
            s.sound('thud', { gain: 0.15 });
            break;
          }
          if (this.hitAt(R, g, s)) {
            c.on = false;
            break;
          }
        }
      }
    },

    /** Did a cork crossing this row at (u, y) hit something? */
    hitAt(R, g, s) {
      if (R.what === 2) {
        for (const p of this.pops) {
          if (p.up < 0.6 || p.hit) continue;
          const cy = SH.popDown + (SH.popUp - SH.popDown) * p.up;
          const d = Math.hypot(R.u - p.u, R.y - cy);
          if (d > 0.23) continue;
          p.hit = true;
          const bull = d < 0.075;
          const pts = bull ? 50 : 25;
          g.score += pts;
          g.hits++;
          this.kit.pop(p.u, cy + 0.15, SH.popV, '+' + pts, bull ? 'gold' : '');
          s.sound(bull ? 'bell' : 'ding', { gain: bull ? 0.6 : 0.8 });
          if (bull) this.kit.burst(p.u, cy, SH.popV + 0.1, 0xffd24a, 12);
          return true;
        }
        return false;
      }
      const row = SH.rows[R.what];
      for (const d of this.ducks) {
        if (d.r !== R.what || d.hit) continue;
        const u = this.duckU(d);
        if (u === null) continue;
        if (Math.abs(R.u - u) > 0.19 || R.y < row.y + 0.02 || R.y > row.y + 0.38) continue;
        d.hit = true;
        const pts = d.gold ? 40 : row.pts;
        g.score += pts;
        g.hits++;
        this.kit.pop(u, row.y + 0.4, row.v, '+' + pts, d.gold ? 'gold' : '');
        s.sound('clank', { gain: 1.1 });
        if (d.gold) {
          s.sound('ding');
          this.kit.burst(u, row.y + 0.2, row.v + 0.1, 0xffd24a, 14);
        }
        return true;
      }
      return false;
    },

    place(dt, g) {
      const kit = this.kit;
      for (const d of this.ducks) {
        const R = SH.rows[d.r];
        const u = this.duckU(d);
        if (u === null) kit.hide(this.duckMesh, d.i);
        else kit.set(this.duckMesh, d.i, u, R.y, R.v, -d.down * 1.45, R.speed > 0 ? 0 : PI, 0);
      }
      this.duckMesh.instanceMatrix.needsUpdate = true;
      for (const p of this.pops) {
        const y = SH.popDown + (SH.popUp - SH.popDown) * p.up;
        kit.set(this.popMesh, p.j, p.u, y, SH.popV, p.hit ? -0.5 * p.up : 0, 0, 0);
      }
      this.popMesh.instanceMatrix.needsUpdate = true;
      const B = this.parts;
      if (g) {
        // The rifle: from Jay's shoulder towards the aim point.
        const su = 0.24, sy = KERB + 1.38, sv = 3.4;
        const dx = g.cx - su, dy = g.cy - sy, dz = SH.back - sv;
        const yaw = Math.atan2(dx, dz), pitch = Math.atan2(dy, Math.hypot(dx, dz));
        const fx = Math.sin(yaw) * Math.cos(pitch), fy = Math.sin(pitch), fz = Math.cos(yaw) * Math.cos(pitch);
        B.part(1, su + fx * 0.12, sy + fy * 0.12 - 0.02, sv + fz * 0.12, 0.07, 0.11, 0.38, -pitch, yaw, 0);
        B.part(0, su + fx * 0.5, sy + fy * 0.5, sv + fz * 0.5, 0.05, 0.05, 0.6, -pitch, yaw, 0);
        B.part(2, su + fx * 0.81, sy + fy * 0.81, sv + fz * 0.81, 0.035, 0.035, 0.035, -pitch, yaw, 0);
        // Corks in flight: from the muzzle, curving onto the camera's line.
        this.corks.forEach((c, j) => {
          if (!c.on) return B.hide(3 + j);
          const k = clamp(c.t / c.T, 0, 1);
          const ex = c.rows[3];
          B.part(3 + j, c.pu + (ex.u - c.pu) * k, c.py + (ex.y - c.py) * k, c.pv + (ex.v - c.pv) * k, 0.04, 0.04, 0.05, 0, 0, 0);
        });
      } else for (let j = 0; j < 7; j++) B.hide(j);
      B.done();
    },
  });

  // ============================================================= RING FLING
  // Pegs on a stepped table in the booth (8 wide, 6 deep): four tiers, nearer is lower.
  const HP = {
    rings: 8,
    seconds: 45,
    rowV: [1.2, 0.3, -0.6, -1.5],
    tier: (r) => KERB + 0.85 + 0.15 * r,
    cols: [-2.4, -1.2, 0, 1.2, 2.4],
    pts: [10, 20, 30, 50],
    pegH: 0.28,
    ringer: 0.09, //   the ring's middle this close to a peg: over it
    leaner: 0.15, //   this close: leaning on it (half points)
    near: 1.75, //     the power meter's ends: the nearest and the farthest throw (v)
    far: -1.95,
    sweep: 1.25, //    seconds for the power to swing from one end to the other
    hand: [0.3, KERB + 1.45, 3.45],
  };
  const PEGS = [];
  HP.rowV.forEach((v, r) => HP.cols.forEach((u) => PEGS.push({ u, v, r, top: HP.tier(r) + HP.pegH, pts: r === 3 && u === 0 ? 100 : HP.pts[r] })));
  const RING_TINTS = [0xe0403a, 0xffd24a, 0x37b8ff, 0x7dcf6a, 0xff5c95, 0xb45cff, 0xff8a3c, 0xf6f1e4];

  function ringGeometry(r, t) {
    const g = new VH.GeometryBuilder({});
    const box = new THREE.BoxGeometry(1, 1, 1);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3();
    const n = 14;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      p.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -a);
      sc.set(t, t, ((TAU * r) / n) * 1.08);
      m.compose(p, q, sc);
      g.merge(box, m, VH.col(0xffffff));
    }
    return g.build();
  }

  decorate((world, K) => {
    const put = deco(world, K, 'hoopla');
    const baize = 0x2e8b4f, edge = 0xf6f1e4, wood = 0xb8874f;
    HP.rowV.forEach((v, r) => {
      const top = HP.tier(r);
      put('prop', -3.75, KERB, v - 0.45, 3.75, top, v + 0.45, r % 2 ? 0x27784a : baize);
      put('prop', -3.75, top - 0.04, v + 0.43, 3.75, top + 0.01, v + 0.47, edge);
    });
    // The pegs, each with a prize on top; the gold one at the back is worth a hundred.
    for (const P of PEGS) {
      const gold = P.pts === 100;
      put('prop', P.u - 0.045, P.top - HP.pegH, P.v - 0.045, P.u + 0.045, P.top, P.v + 0.045, gold ? 0xd4a017 : wood);
      put(gold ? 'screen' : 'prop', P.u - 0.07, P.top, P.v - 0.07, P.u + 0.07, P.top + 0.09, P.v + 0.07, gold ? 0xffd96a : RING_TINTS[(PEGS.indexOf(P) * 3) % RING_TINTS.length]);
    }
    // The points painted along each tier's edge: a coloured tab per row.
    HP.rowV.forEach((v, r) => {
      for (const u of [-3.4, 3.4]) put('prop', u - 0.18, HP.tier(r) - 0.12, v + 0.44, u + 0.18, HP.tier(r) - 0.02, v + 0.48, [0xffffff, 0xffd24a, 0xff8a3c, 0xe0403a][r]);
    });
  });

  Carnival.stall({
    id: 'hoopla',
    name: 'Ring Fling',
    booth: 'hoopla',
    tagline: 'Eight rings. Ring a peg, win the points.',
    price: 3,
    unit: 'points',
    stand: [0, 3.7],
    cam: [0.55, 2.75, 6.2, 0, 1.0, -0.7, 48],
    seconds: HP.seconds,
    holder: [-3.2, 1.9],
    tint: 2,
    howto: [
      'Eight rings. Move the marker left or right over a peg.',
      'Hold to swing the power: the marker runs out to the back and comes back. Let go when it\'s on a peg.',
      'Front row 10, then 20, 30, 50; the gold peg at the back 100. A ring leaning on a peg scores half.',
    ],
    keys: 'Mouse / A D / left stick  aim   ·   Hold click / Space / RT  power, let go to throw',
    prize: 'One for every 15 points',
    barks: ['Ring a peg, win a prize! Ring Fling!', 'Eight rings for three dollars! Gold peg pays a hundred!', 'Nice and gentle, ring the peg! Everyone\'s a winner!'],
    statKeys: { rings: 1 },

    tickets(score) {
      return score / 15;
    },

    verdict(g) {
      return g.score + ' points (' + g.ringers + (g.ringers === 1 ? ' ringer' : ' ringers') + ')';
    },

    build(kit) {
      this.ringMesh = kit.mesh(ringGeometry(0.13, 0.024), HP.rings);
      const col = new THREE.Color();
      for (let i = 0; i < HP.rings; i++) this.ringMesh.setColorAt(i, col.set(RING_TINTS[i]));
      this.rings = [];
      for (let i = 0; i < HP.rings; i++) this.rings.push({ i, state: 'hand', t: 0, T: 1, u0: 0, y0: 0, v0: 0, u: 0, y: 0, v: 0, tu: 0, ty: 0, tv: 0, tilt: 0, spin: 0, peg: null });
      this.marker = kit.boxes(3);
      this.marker.part(0, 0, -5, 0, 0.2, 0.012, 0.2, 0, 0, 0, 0xd8ff3a);
      this.marker.part(1, 0, -5, 0, 0.012, 0.01, 0.6, 0, 0, 0, 0xd8ff3a);
      this.HP = HP;
      this.PEGS = PEGS;
      this.reset();
    },

    reset() {
      for (const r of this.rings) {
        r.state = 'hand';
        r.peg = null;
      }
      if (this.marker) {
        this.marker.hide(0);
        this.marker.hide(1);
        this.marker.done();
      }
      this.place(null);
    },

    begin(g, s) {
      g.left = HP.rings;
      g.ringers = 0;
      g.cx = 0;
      g.cy = 0;
      g.power = 0;
      g.charging = false;
      g.dir = 1;
      g.throwT = 9;
      s.ui.stat('rings', 'Rings left', g.left);
    },

    pose(g) {
      // Winding up while the power swings; the arm follows through after a throw.
      const k = g.charging ? 1 : 0, f = clamp(1 - g.throwT / 0.35, 0, 1);
      return { w: 1, shoulderR: 0.6 + k * 1.4 + f * 0.9, elbowR: 0.8 + k * 0.7 - f * 0.6, shoulderL: 0.5, elbowL: 0.6, twist: -0.15 * k + 0.2 * f + g.cx * 0.04, lean: 0.12 + 0.1 * f, splayR: 0.2 };
    },

    /** Where a throw at this power lands (v). */
    reach(p) {
      return HP.near + (HP.far - HP.near) * p;
    },

    /** The table's height at v (the tier it lands on). */
    tableAt(v) {
      for (let r = 0; r < HP.rowV.length; r++) if (Math.abs(v - HP.rowV[r]) <= 0.45) return HP.tier(r);
      return KERB + 0.02;
    },

    play(dt, g, s) {
      this.kit.cursor(g, dt, 2.2, -3.1, 3.1, -1, 1, 2.0);
      g.throwT += dt;
      const hold = s.down('fire') || s.down('jump');
      if (g.left > 0 && g.throwT > 0.45) {
        if (hold) {
          if (!g.charging) {
            g.charging = true;
            g.power = 0;
            g.dir = 1;
          }
          // The power swings out and back.
          g.power += (g.dir * dt) / HP.sweep;
          if (g.power >= 1) {
            g.power = 2 - g.power;
            g.dir = -1;
          } else if (g.power <= 0) {
            g.power = -g.power;
            g.dir = 1;
          }
          s.ui.meter(g.power, 'Power');
        } else if (g.charging) {
          g.charging = false;
          s.ui.meter(null);
          this.toss(g, s);
        }
      }
      this.flight(dt, g, s);
      if (g.left <= 0 && !this.rings.some((r) => r.state === 'fly')) g.over = 'DONE!';
      this.place(g);
    },

    after(dt, g, s) {
      s.ui.meter(null);
      this.flight(dt, g, s);
      this.place(null);
    },

    toss(g, s) {
      const r = this.rings[HP.rings - g.left];
      g.left--;
      g.throwT = 0;
      s.ui.stat('rings', 'Rings left', g.left);
      const tv = this.reach(g.power), tu = g.cx;
      r.state = 'fly';
      r.t = 0;
      [r.u0, r.y0, r.v0] = HP.hand;
      r.tu = tu;
      r.tv = tv;
      // Over a peg, leaning on one, or onto the table.
      let best = null, bd = 1e9;
      for (const P of PEGS) {
        const d = Math.hypot(P.u - tu, P.v - tv);
        if (d < bd) {
          bd = d;
          best = P;
        }
      }
      r.peg = null;
      r.result = 'miss';
      if (best && bd < HP.ringer) {
        r.peg = best;
        r.result = 'ringer';
        r.ty = best.top - HP.pegH + 0.03;
        r.tu = best.u;
        r.tv = best.v;
      } else if (best && bd < HP.leaner) {
        r.peg = best;
        r.result = 'leaner';
        r.ty = best.top - 0.06;
        // It leans from the side it came down on.
        const a = Math.atan2(tv - best.v, tu - best.u);
        r.tu = best.u + Math.cos(a) * 0.1;
        r.tv = best.v + Math.sin(a) * 0.1;
        r.lean = a;
      } else r.ty = this.tableAt(tv) + 0.015;
      r.T = 0.5 + Math.hypot(r.tu - r.u0, r.tv - r.v0) * 0.07;
      r.spin = 0;
      s.sound('whoosh', { gain: 0.5 });
    },

    flight(dt, g, s) {
      for (const r of this.rings) {
        if (r.state !== 'fly') continue;
        r.t += dt;
        const k = clamp(r.t / r.T, 0, 1);
        r.u = r.u0 + (r.tu - r.u0) * k;
        r.v = r.v0 + (r.tv - r.v0) * k;
        r.y = r.y0 + (r.ty - r.y0) * k + Math.sin(k * PI) * (0.55 + r.T * 0.4);
        r.spin += dt * 9;
        if (k < 1) continue;
        r.state = r.result;
        const P = r.peg;
        if (r.result === 'ringer') {
          g.score += P.pts;
          g.ringers++;
          this.kit.pop(P.u, P.top + 0.25, P.v, '+' + P.pts, P.pts >= 50 ? 'gold' : '');
          s.sound(P.pts >= 50 ? 'bell' : 'ding', { gain: 0.8 });
          this.kit.burst(P.u, P.top + 0.1, P.v, P.pts === 100 ? 0xffd24a : RING_TINTS[r.i], P.pts >= 50 ? 18 : 10);
          if (P.pts === 100) s.ui.big('GOLD PEG!', 1100);
        } else if (r.result === 'leaner') {
          const pts = Math.round(P.pts / 2);
          g.score += pts;
          this.kit.pop(P.u, P.top + 0.25, P.v, 'Leaner +' + pts, '');
          s.sound('clank', { gain: 0.7 });
        } else {
          s.sound('thud', { gain: 0.25 });
          this.kit.pop(r.u, r.y + 0.2, r.v, 'Miss', 'bad');
        }
      }
    },

    place(g) {
      const kit = this.kit, m = this.ringMesh;
      for (const r of this.rings) {
        if (r.state === 'hand') {
          // The rings not thrown yet, in a stack on the counter by Jay.
          const k = r.i - (g ? HP.rings - g.left : 0);
          if (!g || k < 0) kit.set(m, r.i, -1.2 + (r.i % 2) * 0.05, KERB + 1.06 + r.i * 0.026, 2.75, 0, 0, 0);
          else kit.set(m, r.i, 0.75, KERB + 1.06 + k * 0.026, 2.72, 0, 0, 0);
        } else if (r.state === 'fly') kit.set(m, r.i, r.u, r.y, r.v, 0.35 * Math.sin(r.spin * 0.3), r.spin, 0);
        else if (r.state === 'leaner') kit.set(m, r.i, r.u, r.ty, r.v, Math.sin(r.lean) * 0.5, 0, -Math.cos(r.lean) * 0.5);
        else kit.set(m, r.i, r.tu, r.ty, r.tv, 0, r.i, 0);
      }
      m.instanceMatrix.needsUpdate = true;
      // The marker on the table: where the throw will land.
      const M = this.marker;
      if (g && g.left > 0) {
        const v = g.charging ? this.reach(g.power) : HP.near;
        const y = this.tableAt(v) + 0.02;
        M.part(0, g.cx, y, v, 0.28, 0.014, 0.28);
        M.part(1, g.cx, y, v + 0.46, 0.02, 0.012, 0.64);
      } else {
        M.hide(0);
        M.hide(1);
      }
      M.done();
    },

    idleGame() {},
  });

  // ========================================================= TIN CAN TUMBLE
  const CN = {
    rounds: 3,
    balls: 3,
    seconds: 60,
    shelf: { v: -0.8, top: KERB + 1.05, hu: 0.9, hv: 0.2 }, // the shelf: middle v, top, half sizes
    floor: KERB + 0.02,
    back: -2.75, //   the curtain at the back
    side: 3.8,
    R: 0.1, //        a tin's radius (and its collision sphere)
    H: 0.24, //       a tin's height
    rb: 0.055, //     the ball
    speed: 8.5, //    the ball's speed
    mb: 1.6, //       the ball's mass (a tin is 1)
    hand: [0.3, KERB + 1.55, 3.35],
  };
  const TINS = 6;
  // The pyramid: [u, layer], and the two tins each upper one stands on.
  const PYR = [[-0.21, 0], [0, 0], [0.21, 0], [-0.105, 1], [0.105, 1], [0, 2]];
  const PYR_ON = [null, null, null, [0, 1], [1, 2], [3, 4]];
  const TIN_TINTS = [0xe0403a, 0x37b8ff, 0x3fae5a, 0xffd24a, 0xff5c95, 0xff8a3c];

  function tinGeometry() {
    const geo = new THREE.CylinderGeometry(CN.R * 0.96, CN.R * 0.96, CN.H, 12, 3);
    const pos = geo.attributes.position;
    const cols = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const rim = Math.abs(y) > CN.H / 2 - 0.03;
      const k = rim ? 0.72 : 1;
      cols[i * 3] = cols[i * 3 + 1] = cols[i * 3 + 2] = k;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    return geo;
  }

  function ballGeometry(r, hex) {
    const geo = new THREE.IcosahedronGeometry(r, 1);
    const c = new THREE.Color(hex);
    const n = geo.attributes.position.count;
    const cols = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      cols[i * 3] = c.r;
      cols[i * 3 + 1] = c.g;
      cols[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    return geo;
  }

  decorate((world, K) => {
    const put = deco(world, K, 'cans');
    const S = CN.shelf;
    // The shelf on its post, a red curtain behind, sacking on the floor.
    put('wood', -S.hu, S.top - 0.06, S.v - S.hv, S.hu, S.top, S.v + S.hv, 0xb8874f);
    put('prop', -0.08, KERB, S.v - 0.08, 0.08, S.top - 0.06, S.v + 0.08, 0x6b4a32);
    put('prop', -0.5, KERB, S.v - 0.3, 0.5, KERB + 0.06, S.v + 0.3, 0x6b4a32);
    put('prop', -3.85, KERB + 0.04, CN.back - 0.03, 3.85, KERB + 3.2, CN.back, 0x8a1c2c);
    for (let u = -3.6; u < 3.7; u += 0.5) put('prop', u, KERB + 0.04, CN.back, u + 0.08, KERB + 3.2, CN.back + 0.03, 0x6e1422);
    put('prop', -3.85, KERB + 0.02, CN.back, 3.85, KERB + 0.05, 1.8, 0xa08a62);
    // A rack of balls on the counter.
    for (let i = 0; i < 4; i++) put('prop', 1.6 + i * 0.13 - 0.05, KERB + 1.04, 2.7 - 0.05, 1.6 + i * 0.13 + 0.05, KERB + 1.13, 2.7 + 0.05, 0xf6f1e4);
  });

  const _cv = new THREE.Vector3();
  const _cq = new THREE.Quaternion();
  const _ca = new THREE.Vector3();

  Carnival.stall({
    id: 'cans',
    name: 'Tin Can Tumble',
    booth: 'cans',
    tagline: 'Three balls, six tins. Knock them all off the shelf.',
    price: 3,
    unit: 'points',
    stand: [0, 3.7],
    cam: [0.45, 1.95, 5.0, 0, 1.3, -0.8, 40],
    seconds: CN.seconds,
    holder: [3.0, 1.9],
    tint: 3,
    howto: [
      'Three pyramids, three balls each. Aim with the mouse and click to throw.',
      'A tin counts when it\'s off the shelf: 10 each. Clear the whole pyramid for 30 more.',
      'Your hand wobbles a little: let go as the ring crosses the spot you want. Hit low and the tins above come down too.',
    ],
    keys: 'Mouse / right stick / W A S D  aim   ·   Click / Space / RT  throw',
    prize: 'One for every 10 points',
    barks: ['Knock \'em flat! Three balls, three dollars!', 'Tin Can Tumble! Clear the shelf, win a prize!', 'Aim low, they all come down! Step up!'],
    statKeys: { round: 1, balls: 1 },

    tickets(score) {
      return score / 10;
    },

    verdict(g) {
      return g.tins + (g.tins === 1 ? ' tin' : ' tins') + ' down, ' + g.clears + (g.clears === 1 ? ' pyramid' : ' pyramids') + ' cleared';
    },

    build(kit) {
      this.tinMesh = kit.mesh(tinGeometry(), TINS);
      const col = new THREE.Color();
      for (let i = 0; i < TINS; i++) this.tinMesh.setColorAt(i, col.set(TIN_TINTS[i]));
      this.ballMesh = kit.mesh(ballGeometry(CN.rb, 0xf6f1e4), CN.balls);
      this.tins = [];
      for (let i = 0; i < TINS; i++) this.tins.push({ i, p: new THREE.Vector3(), v: new THREE.Vector3(), w: new THREE.Vector3(), q: new THREE.Quaternion(), state: 'stand', down: false });
      this.balls = [];
      for (let i = 0; i < CN.balls; i++) this.balls.push({ i, p: new THREE.Vector3(), v: new THREE.Vector3(), on: false, t: 0 });
      this.CN = CN;
      this.reset();
    },

    /** Stack the pyramid again; the balls back in the rack. */
    stack() {
      const S = CN.shelf;
      this.tins.forEach((t, i) => {
        const [u, layer] = PYR[i];
        t.p.set(u, S.top + CN.H / 2 + layer * CN.H + 0.001, S.v);
        t.v.set(0, 0, 0);
        t.w.set(0, 0, 0);
        t.q.identity();
        t.state = 'stand';
        t.down = false;
      });
      for (const b of this.balls) b.on = false;
    },

    reset() {
      this.stack();
      if (this.tinMesh) this.place();
    },

    begin(g, s) {
      g.round = 1;
      g.balls = CN.balls;
      g.tins = 0;
      g.clears = 0;
      g.wait = 0;
      g.throwT = 9;
      g.cx = 0;
      g.cy = CN.shelf.top + 0.25;
      g.sway = 0;
      s.ui.stat('round', 'Pyramid', '1 of ' + CN.rounds);
      s.ui.stat('balls', 'Balls', g.balls);
    },

    pose(g) {
      const f = clamp(1 - g.throwT / 0.4, 0, 1);
      return { w: 1, shoulderR: 0.5 + Math.sin(f * PI) * 2.0, elbowR: 0.9 - f * 0.6, shoulderL: 0.7, elbowL: 0.7, twist: 0.25 * Math.sin(f * PI) + g.cx * 0.05, lean: 0.1 + 0.15 * f };
    },

    /** Where the ball would go: the cursor plus the hand's wobble. */
    aim(g, out) {
      out.u = g.cx + Math.sin(g.sway * 1.9) * 0.06;
      out.y = g.cy + Math.sin(g.sway * 2.7 + 1) * 0.045;
      return out;
    },

    play(dt, g, s) {
      this.kit.cursor(g, dt, 1.2, -1.5, 1.5, KERB + 0.85, KERB + 2.1, 1.3);
      g.sway += dt;
      g.throwT += dt;
      const A = this.aim(g, this._aim || (this._aim = { u: 0, y: 0 }));
      const ready = g.balls > 0 && g.wait <= 0 && g.throwT > 0.5;
      if (ready && (s.pressed('fire') || s.pressed('jump') || s.pressed('interact'))) this.throw(g, s, A);
      this.sim(dt, g, s);
      // A round ends when all six are down, or the balls are gone and everything has settled.
      if (g.wait > 0) {
        g.wait -= dt;
        if (g.wait <= 0) {
          if (g.round >= CN.rounds) g.over = 'DONE!';
          else {
            g.round++;
            g.balls = CN.balls;
            this.stack();
            s.ui.stat('round', 'Pyramid', g.round + ' of ' + CN.rounds);
            s.ui.stat('balls', 'Balls', g.balls);
            s.sound('clank', { gain: 0.5 });
          }
        }
      } else if (this.tins.every((t) => t.down)) {
        g.clears++;
        g.score += 30;
        g.wait = 1.6;
        s.ui.big('ALL DOWN!', 1100);
        s.sound('cheer');
        s.sound('win', { gain: 0.6 });
        this.kit.pop(0, CN.shelf.top + 0.6, CN.shelf.v, '+30', 'gold');
        this.kit.burst(0, CN.shelf.top + 0.3, CN.shelf.v, 0xffd24a, 20);
      } else if (g.balls <= 0 && !this.balls.some((b) => b.on && b.t < 2.2) && !this.tins.some((t) => t.state === 'loose' && t.v.lengthSq() > 0.05)) g.wait = 1.0;
      this.kit.reticle(A.u, A.y, CN.shelf.v);
      this.place();
    },

    after(dt, g, s) {
      this.sim(dt, g, s);
      this.place();
    },

    throw(g, s, A) {
      const b = this.balls[CN.balls - g.balls];
      g.balls--;
      g.throwT = 0;
      s.ui.stat('balls', 'Balls', g.balls);
      const [hu, hy, hv] = CN.hand;
      const dx = A.u - hu, dy = A.y - hy, dz = CN.shelf.v - hv;
      const T = Math.hypot(dx, dz) / CN.speed;
      b.p.set(hu, hy, hv);
      b.v.set(dx / T, (dy + 0.5 * 9.8 * T * T) / T, dz / T);
      b.on = true;
      b.t = 0;
      s.sound('whoosh', { gain: 0.4 });
    },

    /** The tins and the balls: gravity, the shelf, the floor, the curtain, and knocking into each other. */
    sim(dt, g, s) {
      const N = 4, h = dt / N, S = CN.shelf, R = CN.R, rb = CN.rb;
      for (let k = 0; k < N; k++) {
        for (const b of this.balls) {
          if (!b.on) continue;
          b.t += h;
          b.v.y -= 9.8 * h;
          b.p.addScaledVector(b.v, h);
          this.bounce(b.p, b.v, rb, 0.35, null);
        }
        for (const t of this.tins) {
          if (t.state !== 'loose') continue;
          t.v.y -= 9.8 * h;
          t.p.addScaledVector(t.v, h);
          const wl = t.w.length();
          if (wl > 1e-4) {
            _cq.setFromAxisAngle(_ca.copy(t.w).multiplyScalar(1 / wl), wl * h);
            t.q.premultiply(_cq);
          }
          this.bounce(t.p, t.v, R, 0.25, t);
          if (!t.down && t.p.y < S.top - 0.02 && !(Math.abs(t.p.x) < S.hu && Math.abs(t.p.z - S.v) < S.hv && t.p.y > S.top - R)) {
            t.down = true;
            g.tins++;
            g.score += 10;
            this.kit.pop(t.p.x, S.top + 0.4, S.v, '+10', '');
            s.sound('clank', { gain: 0.6 });
          }
        }
        // A tin standing on one that has gone falls too.
        for (let i = 3; i < TINS; i++) {
          const t = this.tins[i];
          if (t.state !== 'stand') continue;
          const [a, c] = PYR_ON[i];
          if (this.tins[a].state !== 'stand' || this.tins[c].state !== 'stand') {
            t.state = 'loose';
            const side = this.tins[a].state !== 'stand' ? -1 : 1;
            t.v.set(side * 0.15, 0, -0.05);
          }
        }
        // Balls into tins, tins into tins.
        for (const b of this.balls) {
          if (!b.on) continue;
          for (const t of this.tins) this.hit(b.p, b.v, CN.mb, rb, t, s);
        }
        for (let i = 0; i < TINS; i++) for (let j = i + 1; j < TINS; j++) this.knock(this.tins[i], this.tins[j], s);
      }
    },

    /** Off the shelf top, the floor, the curtain and the side walls. */
    bounce(p, v, r, e, tin) {
      const S = CN.shelf;
      const onShelf = Math.abs(p.x) < S.hu && Math.abs(p.z - S.v) < S.hv;
      const ground = onShelf && p.y > S.top - r ? S.top : CN.floor;
      let hitGround = false;
      if (p.y - r < ground) {
        p.y = ground + r;
        if (v.y < 0) v.y = -v.y * e;
        v.x *= 0.985;
        v.z *= 0.985;
        hitGround = true;
      }
      if (p.z - r < CN.back) {
        p.z = CN.back + r;
        if (v.z < 0) v.z = -v.z * 0.2;
      }
      if (p.z + r > 2.3) {
        p.z = 2.3 - r;
        if (v.z > 0) v.z = -v.z * 0.3;
      }
      if (Math.abs(p.x) + r > CN.side) {
        p.x = Math.sign(p.x) * (CN.side - r);
        v.x = -v.x * 0.3;
      }
      if (tin && hitGround) {
        // Rolling and scraping to a stop.
        tin.w.multiplyScalar(0.985);
        if (v.lengthSq() < 0.01) {
          v.set(0, 0, 0);
          tin.w.multiplyScalar(0.8);
        }
      }
    },

    /** A ball meets a tin. */
    hit(bp, bv, mb, rb, t, s) {
      const d = _cv.subVectors(t.p, bp);
      const dist = d.length(), min = rb + CN.R;
      if (dist >= min || dist < 1e-5) return;
      d.multiplyScalar(1 / dist);
      const rel = (bv.x - t.v.x) * d.x + (bv.y - t.v.y) * d.y + (bv.z - t.v.z) * d.z;
      // Apart first.
      bp.addScaledVector(d, -(min - dist) * 0.5);
      if (t.state !== 'stand') t.p.addScaledVector(d, (min - dist) * 0.5);
      if (rel <= 0) return;
      const J = ((1 + 0.3) * rel) / (1 / mb + 1);
      bv.addScaledVector(d, -J / mb);
      if (t.state === 'stand') t.state = 'loose';
      t.v.addScaledVector(d, J);
      // Spin from where it was struck.
      t.w.x += d.z * J * 6;
      t.w.z -= d.x * J * 6;
      t.w.y += d.x * J * 2;
      s.sound('clank', { gain: clamp(J / 4, 0.3, 1.2) });
    },

    /** Two tins knock together (a standing one is knocked loose by a hard enough knock). */
    knock(a, b, s) {
      if (a.state === 'stand' && b.state === 'stand') return;
      const d = _cv.subVectors(b.p, a.p);
      const dist = d.length(), min = CN.R * 2 - 0.004;
      if (dist >= min || dist < 1e-5) return;
      d.multiplyScalar(1 / dist);
      const rel = (a.v.x - b.v.x) * d.x + (a.v.y - b.v.y) * d.y + (a.v.z - b.v.z) * d.z;
      const push = min - dist;
      const fa = a.state === 'stand' ? 0 : b.state === 'stand' ? 1 : 0.5;
      a.p.addScaledVector(d, -push * fa);
      b.p.addScaledVector(d, push * (1 - fa));
      if (rel <= 0) return;
      const J = ((1 + 0.25) * rel) / 2;
      if (a.state === 'stand' && J > 0.25) a.state = 'loose';
      if (b.state === 'stand' && J > 0.25) b.state = 'loose';
      if (a.state !== 'stand') a.v.addScaledVector(d, -J);
      if (b.state !== 'stand') b.v.addScaledVector(d, J);
      if (J > 0.4) s.sound('clank', { gain: clamp(J / 5, 0.2, 0.8) });
    },

    place() {
      const kit = this.kit;
      for (const t of this.tins) kit.setQ(this.tinMesh, t.i, t.p.x, t.p.y, t.p.z, t.q);
      this.tinMesh.instanceMatrix.needsUpdate = true;
      for (const b of this.balls) {
        if (b.on) kit.set(this.ballMesh, b.i, b.p.x, b.p.y, b.p.z, 0, 0, 0);
        else kit.set(this.ballMesh, b.i, 1.55 + b.i * 0.13, KERB + 1.1, 2.62, 0, 0, 0);
      }
      this.ballMesh.instanceMatrix.needsUpdate = true;
    },

    idleGame() {},
  });
})();
