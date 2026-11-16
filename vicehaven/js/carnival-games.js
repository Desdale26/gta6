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
 *   striker   the Bell Ringer: seven swings of the mallet; hold to lift (the
 *             power runs up and back), let go at the top, press again as the
 *             head lands; the puck flies up the scale and maybe rings the bell
 *   crab      Crab Bonkers: nine holes, crabs popping up (gold ones quick),
 *             and gulls you mustn't bonk; pick a hole, bonk
 *   duck      Hook-a-Duck: ducks float round a pool with a loop on each head;
 *             hold the hook over a duck's path (it swings on its line) and
 *             dip as the loop comes under it; gold ducks are quick
 *   hoops     Boardwalk Hoops: a basketball at a hoop sliding along a rail;
 *             aim across, hold for the power (let go in the middle); the
 *             ball bounces off the ring and the board for real
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
    shelf: { v: -0.8, top: KERB + 1.05, hu: 0.9, hv: 0.14 }, // the shelf: middle v, top, half sizes
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
    // A tray for the balls on the counter.
    put('prop', 1.45, KERB + 1.0, 2.52, 1.92, KERB + 1.045, 2.72, 0x6b4a32);
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
    cam: [0.85, 2.2, 5.5, 0, 1.35, -0.8, 38],
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
      this.kit.reticle(A.u, A.y, CN.shelf.v + CN.R);
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
      const dx = A.u - hu, dy = A.y - hy, dz = CN.shelf.v + CN.R - hv;
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
            t.v.set(side * 0.3, 0, -0.45);
            t.w.set(-3, 0, -side * 2);
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
      if (p.z + r > 2.3 && v.z > 0) {
        // The counter's inside (a ball on its way out from Jay's hand passes).
        p.z = 2.3 - r;
        v.z = -v.z * 0.3;
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

    /** A ball meets a tin: the ball against the tin's real shape (a cylinder, however it lies). */
    hit(bp, bv, mb, rb, t, s) {
      const d = _cv.subVectors(bp, t.p);
      if (d.lengthSq() > 0.09) return;
      // Into the tin's own frame, to the nearest point of the cylinder, and back.
      _cq.copy(t.q).invert();
      d.applyQuaternion(_cq);
      const hz = Math.hypot(d.x, d.z), hh = CN.H / 2;
      const k = hz > CN.R ? CN.R / hz : 1;
      const inside = hz < CN.R && Math.abs(d.y) < hh;
      _ca.set(d.x * k, clamp(d.y, -hh, hh), d.z * k);
      if (inside) _ca.set(d.x * (CN.R / Math.max(hz, 1e-4)), d.y, d.z * (CN.R / Math.max(hz, 1e-4)));
      d.sub(_ca); // the nearest point → the ball
      let dist = d.length();
      if (!inside && (dist >= rb || dist < 1e-5)) return;
      if (inside) { d.set(_ca.x, 0, _ca.z).normalize(); dist = -0.01; } else d.multiplyScalar(1 / dist);
      d.applyQuaternion(t.q).negate(); // now the normal from the ball into the tin
      const rel = (bv.x - t.v.x) * d.x + (bv.y - t.v.y) * d.y + (bv.z - t.v.z) * d.z;
      // Apart first.
      bp.addScaledVector(d, -(rb - dist) * 0.6);
      if (t.state !== 'stand') t.p.addScaledVector(d, (rb - dist) * 0.4);
      if (rel <= 0) return;
      const J = ((1 + 0.3) * rel) / (1 / mb + 1);
      bv.addScaledVector(d, -J / mb);
      if (t.state === 'stand') t.state = 'loose';
      t.v.addScaledVector(d, J);
      // Spin from where it was struck: high up tips it over, off-centre turns it.
      const up = bp.y - t.p.y;
      t.w.x += d.z * J * (3 + up * 30);
      t.w.z -= d.x * J * (3 + up * 30);
      t.w.y += (bp.x - t.p.x) * J * 20;
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

  // ======================================================= THE BELL RINGER
  // The strongman's tower (STANDS.striker, open air): a 4.6 m scale with a bell on top, a puck on a
  // rail, and the pad Jay hits with the mallet. In the frame Jay faces -v; the tower is behind the pad.
  const ST = {
    swings: 7,
    seconds: 60,
    pivot: [0, KERB + 1.42, 1.15], // Jay's shoulders: the mallet swings about here
    grip: 0.55, //                    his hands along it
    reach: 1.38, //                   the head's middle
    aRest: -0.4, //                   the mallet over his shoulder (radians from straight up, + forwards)
    aWind: -1.0, //                   lifted right back
    padV: 0.25,
    padTop: KERB + 0.3,
    railV: -0.4,
    y0: KERB + 0.42, //               the puck at rest, and the scale's foot
    y1: KERB + 4.75, //               the bell's rim: the top of the scale
    sweep: 0.7, //                    the power runs up (and back down) in this long
    fall: 0.42, //                    the mallet's swing down
    hitAt: 0.8, //                    where on the timing gauge the head meets the pad
    zone: 0.09, //                    half the green zone either side of it
    perfect: 0.045, //                inside this, a clean strike
    boost: 1.12, //                   full power, clean strike: over the top (rings at 1)
    grav: 15,
    bands: [['TIDDLER', '#2fb7b0'], ['WEAKLING', '#3fae5a'], ['NOT BAD', '#e8b820'], ['STRONG', '#ff8a3c'], ['MIGHTY', '#e0403a']],
  };
  ST.aHit = Math.acos((ST.padTop + 0.08 - ST.pivot[1]) / ST.reach);
  const BULBS = 13;

  /** The scale painted up the board (an upright slot of the sign atlas). */
  function paintScale(g, x, y, w, h) {
    // Board pixels: X across (70 = the board's width), Y down from the top (w = the scale's height).
    const BW = 70, k = h / BW;
    g.setTransform(0, k, -1, 0, x + w, y);
    const n = ST.bands.length, bh = w / n;
    ST.bands.forEach(([name, col], i) => {
      const top = w - (i + 1) * bh;
      g.fillStyle = col;
      g.fillRect(0, top, BW, bh);
      g.fillStyle = 'rgba(255,255,255,0.18)';
      g.fillRect(0, top, BW, bh * 0.4);
      g.fillStyle = '#ffffff';
      g.fillRect(0, top, BW, 2);
      // Little ticks up both edges.
      for (let t = 1; t < 4; t++) {
        g.fillRect(0, top + (t * bh) / 4, 9, 1.5);
        g.fillRect(BW - 9, top + (t * bh) / 4, 9, 1.5);
      }
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      let size = 17;
      do {
        g.font = '900 ' + size + 'px "Arial Black", Impact, sans-serif';
        size--;
      } while (g.measureText(name).width > BW - 12 && size > 8);
      g.lineWidth = 3;
      g.strokeStyle = 'rgba(26,15,46,0.85)';
      g.strokeText(name, BW / 2, top + bh / 2);
      g.fillStyle = '#ffffff';
      g.fillText(name, BW / 2, top + bh / 2);
    });
    g.fillStyle = '#ffd24a';
    g.fillRect(0, 0, BW, 4);
  }

  decorate((world, K) => {
    const put = deco(world, K, 'striker');
    const F = put.F;
    const B = K.STANDS.striker;
    const C = VH.COLLIDE;
    const red = 0xe0403a, dark = 0x2a1d33, steel = 0xc8ccd2;
    // A rubber mat, the board on its posts, the rail, the lever, the crossbar the sign hangs on.
    put('wood', -1.0, KERB, -0.95, 1.0, KERB + 0.03, 0.75, 0x6b4a32);
    put('prop', -0.32, KERB, -0.64, 0.32, ST.y1 + 0.25, -0.5, 0xf6f1e4);
    for (const s of [-1, 1]) {
      put('prop', s * 0.32 - 0.06, KERB, -0.66, s * 0.32 + 0.06, ST.y1 + 0.5, -0.48, red);
      put('prop', s * 0.32 - 0.2, KERB, -0.8, s * 0.32 + 0.2, KERB + 0.12, -0.34, dark);
    }
    put('prop', -0.016, ST.y0 - 0.1, ST.railV - 0.03, 0.016, ST.y1, ST.railV, steel);
    put('prop', -0.07, KERB + 0.03, -0.5, 0.07, KERB + 0.16, ST.padV, dark);
    put('prop', -0.16, KERB + 0.03, ST.padV - 0.14, 0.16, KERB + 0.18, ST.padV + 0.14, dark);
    put('prop', -0.05, ST.y1 + 0.18, -0.52, 0.05, ST.y1 + 0.55, -0.42, dark);
    put('prop', -1.05, ST.y1 + 0.55, -0.66, 1.05, ST.y1 + 1.15, -0.54, dark);
    // A strip light under the crossbar for the night.
    put('screen', -0.9, ST.y1 + 0.52, -0.6, 0.9, ST.y1 + 0.55, -0.5, 0xfff4dc);
    // The board's face: the painted scale (up the board) and the name across the top.
    K.wantSign('striker_scale', paintScale);
    K.QUADS.push(['striker_scale', F.wx(0, -0.495), (ST.y0 + ST.y1) / 2, F.wz(0, -0.495), B.yaw, 0.56, ST.y1 - ST.y0, true]);
    K.wantSign('striker', B.sign, B.a, B.b);
    K.QUADS.push(['striker', F.wx(0, -0.535), ST.y1 + 0.85, F.wz(0, -0.535), B.yaw, 2.2, 0.55]);
    // Solid: the tower and its feet (the mat and the pad Jay can stand by).
    const r = [0, 0, 0, 0];
    F.box(-0.52, -0.82, 0.52, -0.32, r);
    world.physics.addBox(r[0], 0, r[1], r[2], ST.y1 + 1.15, r[3], 'pole', C.SOLID | C.SHOTS | C.CAMERA);
  });

  const _sq = new THREE.Quaternion();

  Carnival.stall({
    id: 'striker',
    name: 'The Bell Ringer',
    tagline: 'Seven swings of the mallet. Ring the bell!',
    price: 3,
    unit: 'points',
    stand: [0, ST.pivot[2]],
    promptV: 1.6,
    cam: [-3.5, 2.3, 4.7, 0.25, 2.9, -0.3, 57],
    seconds: ST.seconds,
    holder: [-1.5, -0.6, 0.6],
    tint: 4,
    howto: [
      'Hold to lift the mallet: the power runs up and back down. Let go at the top.',
      'Then, as the mallet comes down, press again when the needle crosses the green: a clean strike.',
      'Full power and a clean strike rings the bell: 100 points. Seven swings.',
    ],
    keys: 'Hold click / Space / RT  lift, let go to swing   ·   Press again on the green  strike',
    prize: 'One for every 20 points',
    barks: ['Ring the bell, win a prize! Test your strength!', 'Step up, step up! Who\'s the strongest on the wharf?', 'The Bell Ringer! Seven swings, three dollars!'],
    statKeys: { swings: 1 },
    countIdle: false,

    tickets(score) {
      return score / 20;
    },

    verdict(g) {
      return g.bells + (g.bells === 1 ? ' bell' : ' bells') + ' in ' + ST.swings + ' swings';
    },

    build(kit) {
      // Mallet handle, mallet head, the pad, the puck (one draw call).
      this.parts = kit.boxes(4);
      this.parts.part(0, 0, 0, 0, 0.045, ST.reach - ST.grip + 0.12, 0.045, 0, 0, 0, 0x9b6a3c);
      this.parts.part(1, 0, 0, 0, 0.34, 0.17, 0.17, 0, 0, 0, 0x5a3a8a);
      this.parts.part(2, 0, 0, 0, 0.3, 0.08, 0.3, 0, 0, 0, 0xe0403a);
      this.parts.part(3, 0, 0, 0, 0.16, 0.11, 0.09, 0, 0, 0, 0xffd24a);
      // The bell: a brass dome that glows when it rings.
      const bell = new THREE.SphereGeometry(0.21, 14, 6, 0, TAU, 0, PI / 2);
      this.bellMat = new THREE.MeshStandardMaterial({ color: 0xd4a017, metalness: 0.7, roughness: 0.3, emissive: 0xffd24a, emissiveIntensity: 0 });
      this.bell = kit.single(bell, this.bellMat);
      this.bell.position.set(0, ST.y1, -0.38);
      // Bulbs up both posts: they light up to where the puck is.
      this.bulbs = kit.mesh(new THREE.SphereGeometry(0.06, 6, 4), BULBS * 2, new THREE.MeshBasicMaterial({ color: 0xffffff }));
      for (let i = 0; i < BULBS * 2; i++) {
        const side = i < BULBS ? -1 : 1, j = i % BULBS;
        kit.set(this.bulbs, i, side * 0.32, ST.y0 + ((ST.y1 + 0.3 - ST.y0) * j) / (BULBS - 1), -0.45, 0, 0, 0);
      }
      this.bulbs.instanceMatrix.needsUpdate = true;
      this._lit = -1;
      this._col = new THREE.Color();
      this.ST = ST;
      this.reset();
    },

    reset() {
      this.puckY = ST.y0;
      this.puckV = 0;
      this.dip = 0;
      this.ringT = 0;
      this.mallet(null);
      this.lights(-1);
      if (this.bellMat) this.bellMat.emissiveIntensity = 0;
    },

    /** The mallet at angle a (from straight up, + towards the tower; null: leant on the tower), the pad and the puck. */
    mallet(a) {
      if (!this.parts) return;
      if (a === null) {
        // Head down on the mat, handle against the post.
        this.parts.part(0, 0.62, KERB + 0.5, -0.4, 0.045, 0.95, 0.045, 0, 0, 0.32);
        this.parts.part(1, 0.79, KERB + 0.12, -0.4, 0.17, 0.17, 0.34, 0, 0, 0);
      } else {
        const [pu, py, pv] = ST.pivot;
        const dy = Math.cos(a), dv = -Math.sin(a);
        const mid = (ST.grip + ST.reach) / 2 - 0.02;
        this.parts.part(0, pu, py + dy * mid, pv + dv * mid, 0.045, ST.reach - ST.grip + 0.12, 0.045, -a, 0, 0);
        this.parts.part(1, pu, py + dy * ST.reach, pv + dv * ST.reach, 0.34, 0.17, 0.17, -a, 0, 0);
      }
      this.parts.part(2, 0, ST.padTop - 0.04 - this.dip, ST.padV, 0.3, 0.08, 0.3, 0, 0, 0);
      this.parts.part(3, 0, this.puckY, ST.railV + 0.055, 0.16, 0.11, 0.09, 0, 0, 0);
      this.parts.done();
      this.malletA = a === null ? ST.aRest : a;
    },

    /** Light the bulbs up to height fraction h (-1: all dim; 2: all bright, the bell rang). */
    lights(h) {
      if (!this.bulbs) return;
      const n = h < 0 ? 0 : Math.min(BULBS, Math.ceil(h * (BULBS - 1) + 0.01));
      const key = h >= 2 ? 99 : n;
      if (key === this._lit) return;
      this._lit = key;
      const c = this._col;
      for (let i = 0; i < BULBS * 2; i++) {
        const j = i % BULBS;
        if (key === 99) c.set(0xfff6c8);
        else if (j < n) c.setHSL(0.33 - (0.33 * j) / (BULBS - 1), 1, 0.6);
        else c.set(0x4a3a2a);
        this.bulbs.setColorAt(i, c);
      }
      this.bulbs.instanceColor.needsUpdate = true;
    },

    begin(g, s) {
      g.left = ST.swings;
      g.bells = 0;
      g.st = 'ready';
      g.cool = 0.4;
      g.power = 0;
      g.dir = 1;
      g.p = 0;
      g.k = 0;
      g.press = null;
      g.a0 = ST.aRest;
      g.h = 0;
      g.gaugeT = 0;
      s.ui.stat('swings', 'Swings left', g.left);
      s.ui.caption('Hold to lift the mallet', 2200);
      this.mallet(ST.aRest);
    },

    pose(g) {
      const a = this.malletA === undefined ? ST.aRest : this.malletA;
      const sh = clamp(PI - a, 0.55, PI + 0.7);
      const bend = a < 0 ? 0.3 : clamp(0.5 - a * 0.25, 0.05, 0.5);
      return { w: 1, shoulderL: sh, shoulderR: sh, elbowL: bend, elbowR: bend, splayL: 0.05, splayR: 0.05, lean: a > 1.6 ? 0.3 : a < -0.6 ? -0.12 : 0.05, kneeL: a > 2 ? 0.25 : 0.05, kneeR: a > 2 ? 0.25 : 0.05 };
    },

    play(dt, g, s) {
      const ui = Carnival.Midway.ui;
      const hold = s.down('fire') || s.down('jump');
      const tap = s.pressed('fire') || s.pressed('jump') || s.pressed('interact');
      g.cool -= dt;
      switch (g.st) {
        case 'ready':
          this.mallet(ST.aRest);
          if (g.left > 0 && g.cool <= 0 && hold) {
            g.st = 'lift';
            g.power = 0;
            g.dir = 1;
          }
          break;
        case 'lift': {
          g.power += (g.dir * dt) / ST.sweep;
          if (g.power >= 1) {
            g.power = 2 - g.power;
            g.dir = -1;
          } else if (g.power <= 0) {
            g.power = -g.power;
            g.dir = 1;
          }
          const k = g.power * g.power * (3 - 2 * g.power);
          this.mallet(ST.aRest + (ST.aWind - ST.aRest) * k);
          ui.gauge(g.power, 0.9, 1, 'Power');
          if (!hold) {
            g.st = 'swing';
            g.p = g.power;
            g.k = 0;
            g.press = null;
            g.a0 = this.malletA;
            s.sound('whoosh', { gain: 0.3 + 0.4 * g.p });
          }
          break;
        }
        case 'swing': {
          g.k += dt;
          const n = (g.k / ST.fall) * ST.hitAt;
          const f = Math.min(1, g.k / ST.fall);
          this.mallet(g.a0 + (ST.aHit - g.a0) * f * f);
          if (tap && g.press === null) g.press = n;
          const hit = g.press !== null && Math.abs(g.press - ST.hitAt) <= ST.zone;
          ui.gauge(g.press === null ? n : g.press, ST.hitAt - ST.zone, ST.hitAt + ST.zone, 'Strike!', g.press === null ? '' : hit ? 'hit' : 'miss');
          if (f >= 1) this.strike(g, s);
          break;
        }
        case 'fly':
          this.fly(dt, g, s);
          break;
        case 'rest':
          // The mallet back up on his shoulder.
          this.mallet(this.malletA + (ST.aRest - this.malletA) * Math.min(1, dt * 7));
          if (g.cool <= 0) {
            if (g.left <= 0) g.over = 'DONE!';
            else {
              g.st = 'ready';
              this.lights(-1);
            }
          }
          break;
      }
      if (g.st !== 'lift' && g.st !== 'swing') {
        g.gaugeT -= dt;
        if (g.gaugeT <= 0) ui.gauge(null);
      }
      this.dip = Math.max(0, this.dip - dt * 0.25);
      this.bellGlow(dt);
    },

    after(dt, g, s) {
      if (g.st === 'fly') this.fly(dt, g, s);
      Carnival.Midway.ui.gauge(null);
      this.bellGlow(dt);
    },

    bellGlow(dt) {
      if (this.ringT > 0) {
        this.ringT -= dt;
        this.bellMat.emissiveIntensity = Math.max(0, this.ringT) * 2.2 * (0.6 + 0.4 * Math.sin(this.ringT * 40));
        this.bell.rotation.z = Math.sin(this.ringT * 32) * 0.08 * this.ringT;
        if (this.ringT <= 0) this.bell.rotation.z = 0;
      }
    },

    /** The head meets the pad: how clean, how hard, and up goes the puck. */
    strike(g, s) {
      const d = g.press === null ? 1 : Math.abs(g.press - ST.hitAt);
      const acc = d <= ST.perfect ? 1 : clamp(1 - (d - ST.perfect) * 3, 0.4, 1);
      g.h = g.p * acc * ST.boost;
      g.left--;
      s.ui.stat('swings', 'Swings left', g.left);
      g.st = 'fly';
      g.gaugeT = 0.5;
      g.top = false;
      this.dip = 0.05;
      const rise = Math.min(1, g.h) * (ST.y1 - ST.y0);
      this.puckV = Math.sqrt(2 * ST.grav * Math.max(0.02, rise + (g.h >= 1 ? 0.3 : 0)));
      s.sound('thud', { gain: 0.5 + 0.6 * g.p });
      s.sound('clank', { gain: 0.4 + 0.6 * g.p });
      s.sound('slide', { k: Math.min(1, g.h) });
      if (d <= ST.perfect) s.ui.caption('Clean strike!', 1200);
      else if (g.press === null) s.ui.caption('Press again as the mallet lands!', 1800);
      else s.ui.caption(g.press < ST.hitAt ? 'A touch early' : 'A touch late', 1200);
    },

    /** The puck up the rail and down again; the bell if it gets there. */
    fly(dt, g, s) {
      this.puckY += this.puckV * dt;
      this.puckV -= ST.grav * dt;
      const top = ST.y1 - 0.06;
      if (this.puckY >= top) {
        this.puckY = top;
        if (!g.top) this.peak(g, s, true);
        this.puckV = -1.5;
      } else if (this.puckV <= 0 && !g.top) this.peak(g, s, false);
      this.lights(g.top && g.h >= 1 ? 2 : (this.puckY - ST.y0) / (ST.y1 - ST.y0));
      if (this.puckY <= ST.y0) {
        this.puckY = ST.y0;
        this.puckV = 0;
        s.sound('clank', { gain: 0.35 });
        g.st = 'rest';
        g.cool = g.h >= 1 ? 1.1 : 0.6;
      }
      this.mallet(this.malletA);
    },

    peak(g, s, rang) {
      g.top = true;
      const u = 0, v = ST.railV + 0.1;
      if (rang) {
        g.bells++;
        g.score += 100;
        this.ringT = 1.4;
        s.sound('bell', { gain: 1.2 });
        s.sound('cheer');
        s.ui.big('DING!', 1000);
        this.kit.pop(u, ST.y1 + 0.3, v, '+100', 'gold');
        this.kit.burst(u, ST.y1 + 0.1, v, 0xffd24a, 26);
        return;
      }
      const h = Math.max(0, (this.puckY - ST.y0) / (ST.y1 - ST.y0));
      const pts = Math.max(5, Math.min(65, Math.round(h * 14) * 5));
      g.score += pts;
      const band = ST.bands[Math.min(ST.bands.length - 1, Math.floor(h * ST.bands.length))][0];
      this.kit.pop(u, this.puckY + 0.25, v, (h > 0.93 ? 'SO CLOSE! ' : band + '  ') + '+' + pts, h > 0.6 ? 'gold' : '');
      s.sound(h > 0.6 ? 'ding' : 'tick', { gain: 0.6 });
    },

    idleGame(dt) {
      // The bulbs chase up the posts while nobody's playing.
      this._chase = ((this._chase || 0) + dt * 0.9) % 1.4;
      this.lights(this._chase > 1 ? -1 : this._chase);
    },
  });

  // ========================================================== CRAB BONKERS
  // A sandy table of nine holes behind the counter (booth 'crab', 7 wide, 6 deep). Crabs pop up; so do gulls.
  const CB = {
    seconds: 40,
    top: KERB + 1.06, //               the table's sand (level with the counter)
    cols: [-0.7, 0, 0.7],
    rows: [1.3, 1.78, 2.22], //        far to near
    r: 0.155, //                       a hole
    hands: [0.18, KERB + 1.32, 3.0], // where Jay holds the bonker
    hover: 0.34, //                    the bonker's head over a hole
    swing: 0.09, //                    down onto it
    back: 0.16, //                     and up again
    pts: { crab: 10, gold: 25, gull: -20, quick: 5 },
    quick: 0.25, //                    a bonk this soon after one's fully up is quick (+5)
  };
  const HOLES = [];
  CB.rows.forEach((v, r) => CB.cols.forEach((u, c) => HOLES.push({ u, v, r, c })));

  function crabGeometry() {
    // Facing +v (Jay), white so the instance colour tints it (red, or gold); black eyes.
    const g = new VH.GeometryBuilder({});
    const W = VH.col(0xffffff), L = VH.col(0xffe0d0), K = VH.col(0x111111);
    g.box(-0.13, 0.0, -0.08, 0.13, 0.085, 0.08, W); //   the shell
    g.box(-0.1, 0.085, -0.06, 0.1, 0.11, 0.06, W);
    g.box(-0.08, 0.005, 0.08, 0.08, 0.05, 0.095, L); //  mouth parts
    for (const s of [-1, 1]) {
      // Claws up and open, legs out to the side, eyes on stalks.
      g.box(s * 0.13, 0.03, 0.02, s * 0.2, 0.06, 0.06, W);
      g.box(s * 0.16, 0.06, 0.04, s * 0.24, 0.14, 0.1, W);
      g.box(s * 0.17, 0.14, 0.06, s * 0.2, 0.18, 0.1, W);
      g.box(s * 0.21, 0.14, 0.06, s * 0.24, 0.2, 0.1, W);
      for (let i = 0; i < 3; i++) g.box(s * 0.12, 0.0 + i * 0.002, -0.06 + i * 0.045, s * 0.19, 0.025, -0.04 + i * 0.045, W);
      g.box(s * 0.045 - 0.008, 0.11, 0.02, s * 0.045 + 0.008, 0.17, 0.035, W);
      g.box(s * 0.045 - 0.02, 0.165, 0.015, s * 0.045 + 0.02, 0.2, 0.05, L);
      g.box(s * 0.045 - 0.012, 0.172, 0.05, s * 0.045 + 0.012, 0.195, 0.056, K);
    }
    return g.build();
  }

  function gullGeometry() {
    // The top half of a gull sticking out of a hole: white, grey wings, a yellow beak with the red spot.
    const g = new VH.GeometryBuilder({});
    const W = VH.col(0xf6f4ee), G = VH.col(0x9aa3ad), Y = VH.col(0xf3c13a), R = VH.col(0xd8342c), K = VH.col(0x111111);
    g.box(-0.08, 0.0, -0.1, 0.08, 0.17, 0.08, W); //   the body
    g.box(-0.1, 0.06, -0.12, -0.07, 0.16, 0.05, G); // wings folded
    g.box(0.07, 0.06, -0.12, 0.1, 0.16, 0.05, G);
    g.box(-0.06, 0.17, -0.05, 0.06, 0.28, 0.07, W); // the head
    g.box(-0.02, 0.21, 0.07, 0.02, 0.24, 0.16, Y); //  the beak
    g.box(-0.021, 0.205, 0.12, 0.021, 0.218, 0.14, R);
    g.box(-0.062, 0.24, 0.02, -0.055, 0.258, 0.04, K); // eyes
    g.box(0.055, 0.24, 0.02, 0.062, 0.258, 0.04, K);
    return g.build();
  }

  decorate((world, K) => {
    const put = deco(world, K, 'crab');
    const F = put.F, ctx = put.ctx;
    // Sand on the floor; the table: wooden sides, sand on top; a painted beach behind.
    put('prop', -3.3, KERB + 0.02, -2.7, 3.3, KERB + 0.05, 2.42, 0xf2d48a);
    put('prop', -1.2, KERB + 0.02, 0.98, 1.2, CB.top - 0.04, 2.45, 0x8a5a3a);
    put('prop', -1.24, CB.top - 0.06, 0.94, 1.24, CB.top, 2.45, 0xf6dc96);
    for (const s of [-1, 1]) put('wood', s * 1.24 - 0.04, CB.top - 0.06, 0.94, s * 1.24 + 0.04, CB.top + 0.06, 2.45, 0xb8874f);
    put('wood', -1.24, CB.top - 0.06, 0.9, 1.24, CB.top + 0.06, 0.98, 0xb8874f);
    put('prop', -3.3, KERB + 0.04, -2.74, 3.3, KERB + 1.2, -2.71, 0xe8d29a);
    put('prop', -3.3, KERB + 1.2, -2.74, 3.3, KERB + 2.1, -2.71, 0x2fb7b0);
    put('prop', -3.3, KERB + 2.1, -2.74, 3.3, KERB + 3.2, -2.71, 0x9fdcf5);
    put('prop', -3.3, KERB + 1.18, -2.71, 3.3, KERB + 1.24, -2.69, 0xffffff);
    // Cut-out crabs on the beach behind.
    for (const [u, y, sz] of [[-2.2, 0.55, 0.5], [2.3, 0.75, 0.4], [-0.6, 0.3, 0.3]]) {
      put('prop', u - sz, KERB + y, -2.71, u + sz, KERB + y + sz * 0.5, -2.68, 0xff5a3c);
      put('prop', u - sz * 1.25, KERB + y + sz * 0.3, -2.71, u - sz * 0.85, KERB + y + sz * 0.75, -2.68, 0xff5a3c);
      put('prop', u + sz * 0.85, KERB + y + sz * 0.3, -2.71, u + sz * 1.25, KERB + y + sz * 0.75, -2.68, 0xff5a3c);
    }
    // The holes: a yellow rim, black inside.
    for (const H of HOLES) {
      const x = F.wx(H.u, H.v), z = F.wz(H.u, H.v);
      ctx.prop.cylinder(x, CB.top, z, CB.r + 0.035, CB.r + 0.035, 0.012, 16, VH.col(0xffd24a), true);
      ctx.prop.cylinder(x, CB.top + 0.004, z, CB.r, CB.r, 0.012, 16, VH.col(0x140e18), true);
    }
  });

  const _cbCol = new THREE.Color();
  const _cbM = new THREE.Matrix4();
  const _cbS = new THREE.Vector3();

  Carnival.stall({
    id: 'crab',
    name: 'Crab Bonkers',
    booth: 'crab',
    tagline: 'Forty seconds. Bonk the crabs, spare the gulls.',
    price: 3,
    unit: 'points',
    stand: [0, 3.3],
    cam: [0.62, 3.0, 4.3, 0.05, KERB + 0.95, 1.62, 54],
    seconds: CB.seconds,
    holder: [-2.9, -0.4, 0.6],
    tint: 5,
    howto: [
      'Crabs pop out of the holes. Bonk them before they hide again: 10 points.',
      'A gold crab is quick: 25 points. Bonk one the moment it pops up for 5 more.',
      'Gulls pop up too: leave them alone, a bonked gull costs 20.',
      'Point at a hole and click, or step between the holes with W A S D and bonk with Space.',
    ],
    keys: 'Mouse / W A S D / left stick  pick a hole   ·   Click / Space / A  bonk',
    prize: 'One for every 30 points',
    barks: ['Crab Bonkers! Bonk a crab, spare the gulls!', 'They\'re quick, these crabs! Three dollars a go!', 'Gold crab pays twenty-five! Step up and bonk!'],
    statKeys: { crabs: 1 },
    countIdle: false,

    tickets(score) {
      return score / 30;
    },

    verdict(g) {
      return g.crabs + (g.crabs === 1 ? ' crab' : ' crabs') + ' bonked' + (g.gulls ? ', ' + g.gulls + (g.gulls === 1 ? ' gull' : ' gulls') + ' upset' : '');
    },

    build(kit) {
      this.crabMesh = kit.mesh(crabGeometry(), HOLES.length);
      this.gullMesh = kit.mesh(gullGeometry(), HOLES.length);
      this.bonker = kit.boxes(2);
      this.bonker.part(0, 0, 0, 0, 0.04, 1, 0.04, 0, 0, 0, 0xffd24a);
      this.bonker.part(1, 0, 0, 0, 0.27, 0.15, 0.15, 0, 0, 0, 0xe0403a);
      const col = new THREE.Color(0xff5a3c);
      for (let i = 0; i < HOLES.length; i++) this.crabMesh.setColorAt(i, col);
      this.holes = HOLES.map((H, i) => ({ i, H, kind: null, h: 0, t: 0, up: 0, state: 'down', squash: 0 }));
      this._hp = new THREE.Vector3();
      this._hd = new THREE.Vector3();
      this._hq = new THREE.Quaternion();
      this._y = new THREE.Vector3(0, 1, 0);
      this.CB = CB;
      this.HOLES = HOLES;
      this.reset();
    },

    reset() {
      for (const o of this.holes) {
        o.kind = null;
        o.state = 'down';
        o.h = 0;
      }
      this.bonkT = 9;
      this.sel = 4;
      this.place();
    },

    begin(g, s) {
      g.crabs = 0;
      g.gulls = 0;
      g.quick = 0;
      g.missed = 0;
      g.next = 0.6;
      g.cx = 0;
      g.cy = 0.5;
      g.last = -1;
      g.cool = 0;
      this.sel = 4;
      s.ui.stat('crabs', 'Crabs', 0);
    },

    pose(g) {
      const H = HOLES[this.sel];
      const k = this.bonkT < CB.swing ? this.bonkT / CB.swing : this.bonkT < CB.swing + CB.back ? 1 - (this.bonkT - CB.swing) / CB.back : 0;
      const far = (2.4 - H.v) / 1.1;
      return { w: 1, shoulderL: 1.0 + far * 0.4, shoulderR: 1.15 + far * 0.45 - k * 0.35, elbowL: 0.45, elbowR: 0.3, lean: 0.25 + far * 0.15 + k * 0.1, twist: -H.u * 0.18, splayR: 0.1 };
    },

    /** Pop something up in an empty hole. */
    spawn(g, idle) {
      let pick = -1;
      for (let tries = 0; tries < 12 && pick < 0; tries++) {
        const i = Math.floor(Math.random() * HOLES.length);
        if (this.holes[i].state === 'down' && i !== g.last) pick = i;
      }
      if (pick < 0) return;
      const o = this.holes[pick];
      const k = idle ? 0 : clamp(g.t / CB.seconds, 0, 1);
      const roll = Math.random();
      o.kind = roll < (idle ? 0.25 : 0.17) ? 'gull' : roll < 0.25 && !idle ? 'gold' : 'crab';
      o.state = 'rise';
      o.t = 0;
      o.up = o.kind === 'gull' ? 1.35 : o.kind === 'gold' ? 0.55 : 1.15 - 0.45 * k;
      o.squash = 0;
      this.crabMesh.setColorAt(pick, _cbCol.set(o.kind === 'gold' ? 0xffc21a : 0xff5a3c));
      this.crabMesh.instanceColor.needsUpdate = true;
      g.last = pick;
    },

    /** The holes' life: up, wait, down; a bonked one squashes and drops; a bonked gull flies off. */
    holesStep(dt) {
      for (const o of this.holes) {
        if (o.state === 'down') continue;
        o.t += dt;
        if (o.state === 'rise') {
          o.h = Math.min(1, o.t / 0.12);
          if (o.h >= 1) {
            o.state = 'up';
            o.t = 0;
          }
        } else if (o.state === 'up') {
          if (o.t >= o.up) {
            o.state = 'sink';
            o.t = 0;
          }
        } else if (o.state === 'sink' || o.state === 'bonked') {
          o.h = Math.max(0, o.h - dt / (o.state === 'bonked' ? 0.22 : 0.15));
          if (o.state === 'bonked') o.squash = Math.min(1, o.squash + dt * 12);
          if (o.h <= 0) {
            o.state = 'down';
            o.kind = null;
          }
        } else if (o.state === 'flee' && o.t > 0.8) {
          o.state = 'down';
          o.kind = null;
        }
      }
    },

    play(dt, g, s) {
      // Pick a hole: the mouse moves a point over the table (the nearest hole is picked), the keys step.
      this.kit.cursor(g, dt, 0, -1.05, 1.05, 0, 1.1, 1.6);
      const inp = s.game.input, pad = inp.pad;
      let H = HOLES[this.sel];
      let c = H.c, r = H.r;
      if (s.pressed('moveLeft')) c = Math.max(0, c - 1);
      if (s.pressed('moveRight')) c = Math.min(2, c + 1);
      if (s.pressed('moveForward')) r = Math.max(0, r - 1);
      if (s.pressed('moveBack')) r = Math.min(2, r + 1);
      if (pad && pad.connected && Math.hypot(pad.move.x, pad.move.y) > 0.55) {
        c = pad.move.x < -0.4 ? 0 : pad.move.x > 0.4 ? 2 : 1;
        r = pad.move.y > 0.4 ? 0 : pad.move.y < -0.4 ? 2 : 1;
      }
      if (c !== H.c || r !== H.r) {
        this.sel = r * 3 + c;
        H = HOLES[this.sel];
        g.cx = H.u;
        g.cy = (2.42 - H.v) / 0.95 - 0.06;
      } else {
        // The point under the mouse: nearest hole.
        const pv = 2.42 - (g.cy + 0.06) * 0.95;
        let best = this.sel, bd = 1e9;
        for (let i = 0; i < HOLES.length; i++) {
          const d = (HOLES[i].u - g.cx) ** 2 + ((HOLES[i].v - pv) * 1.3) ** 2;
          if (d < bd) {
            bd = d;
            best = i;
          }
        }
        if (this.bonkT > CB.swing) this.sel = best;
      }
      // Spawning: quicker and busier as the clock runs down.
      const k = clamp(g.t / CB.seconds, 0, 1);
      g.next -= dt;
      let upNow = 0;
      for (const o of this.holes) if (o.state === 'rise' || o.state === 'up') upNow++;
      if (g.next <= 0 && upNow < (g.t < 8 ? 2 : g.t < 25 ? 3 : 4)) {
        this.spawn(g, false);
        g.next = (0.78 - 0.4 * k) * (0.75 + Math.random() * 0.5);
      }
      this.holesStep(dt);
      // The bonk: a press swings the bonker down onto the picked hole; it lands a beat later.
      this.bonkT += dt;
      g.cool -= dt;
      if (g.cool <= 0 && (s.pressed('fire') || s.pressed('jump') || s.pressed('interact'))) {
        this.bonkT = 0;
        g.cool = CB.swing + CB.back * 0.8;
        g.hitDone = false;
        s.sound('whoosh', { gain: 0.25 });
      }
      if (!g.hitDone && this.bonkT >= CB.swing) {
        g.hitDone = true;
        this.bonk(g, s);
      }
      const P = HOLES[this.sel];
      this.kit.reticle(P.u, CB.top + 0.03, P.v, 'hole');
      this.place();
    },

    after(dt, g, s) {
      this.bonkT += dt;
      this.holesStep(dt);
      this.place();
    },

    bonk(g, s) {
      const o = this.holes[this.sel], H = HOLES[this.sel];
      if (!o.kind || o.state === 'bonked' || o.state === 'flee' || o.h < 0.45) {
        s.sound('thud', { gain: 0.35 });
        return;
      }
      if (o.kind === 'gull') {
        g.gulls++;
        g.score = Math.max(0, g.score + CB.pts.gull);
        o.state = 'flee';
        o.t = 0;
        this.kit.pop(H.u, CB.top + 0.45, H.v, CB.pts.gull + ' not the gulls!', 'bad');
        s.sound('buzz', { gain: 0.7 });
        s.ui.caption('Squawk! Leave the gulls be!', 1400);
        return;
      }
      const quick = o.state === 'rise' || o.t < CB.quick;
      const pts = CB.pts[o.kind] + (quick ? CB.pts.quick : 0);
      if (quick) g.quick++;
      g.crabs++;
      g.score += pts;
      o.state = 'bonked';
      o.t = 0;
      s.ui.stat('crabs', 'Crabs', g.crabs);
      this.kit.pop(H.u, CB.top + 0.4, H.v, '+' + pts + (quick ? ' quick!' : ''), o.kind === 'gold' ? 'gold' : '');
      this.kit.burst(H.u, CB.top + 0.15, H.v, o.kind === 'gold' ? 0xffd24a : 0xfff1a8, o.kind === 'gold' ? 18 : 8);
      s.sound('bump', { gain: 0.7 });
      s.sound(o.kind === 'gold' ? 'ding' : 'pop', { gain: 0.6 });
    },

    place() {
      const kit = this.kit;
      for (const o of this.holes) {
        const H = o.H;
        const showCrab = o.kind === 'crab' || o.kind === 'gold';
        if (!showCrab || o.state === 'down') kit.hide(this.crabMesh, o.i);
        else {
          const sq = 1 - o.squash * 0.55;
          kit.set(this.crabMesh, o.i, H.u, CB.top - 0.22 + o.h * 0.23, H.v, 0, 0, 0, 1);
          if (o.squash) {
            this.crabMesh.getMatrixAt(o.i, _cbM);
            _cbM.scale(_cbS.set(1 + o.squash * 0.25, sq, 1 + o.squash * 0.25));
            this.crabMesh.setMatrixAt(o.i, _cbM);
          }
        }
        if (o.kind !== 'gull' || o.state === 'down') kit.hide(this.gullMesh, o.i);
        else if (o.state === 'flee') {
          // Up and away over the back of the stall.
          const f = o.t / 0.8;
          kit.set(this.gullMesh, o.i, H.u + f * 0.6, CB.top + 0.05 + f * 2.2, H.v - f * 2.5, -0.5 * f, f * 2, 0.3 * Math.sin(o.t * 30));
        } else kit.set(this.gullMesh, o.i, H.u, CB.top - 0.3 + o.h * 0.3, H.v, 0, Math.sin(o.t * 5) * 0.4, 0);
      }
      this.crabMesh.instanceMatrix.needsUpdate = true;
      this.gullMesh.instanceMatrix.needsUpdate = true;
      // The bonker: the head over the picked hole (down onto it mid-bonk), the handle back to Jay's hands.
      const H = HOLES[this.sel];
      const t = this.bonkT;
      const k = t < CB.swing ? t / CB.swing : t < CB.swing + CB.back ? 1 - (t - CB.swing) / CB.back : 0;
      const o = this.holes[this.sel];
      const low = o.kind && o.state !== 'down' && o.state !== 'flee' ? 0.08 + o.h * 0.18 : 0.08;
      const hp = this._hp.set(H.u, CB.top + CB.hover + (low - CB.hover) * k, H.v);
      const [hu, hy, hv] = CB.hands;
      const d = this._hd.set(hu - hp.x, hy - hp.y, hv - hp.z);
      const len = d.length();
      d.multiplyScalar(1 / len);
      this._hq.setFromUnitVectors(this._y, d);
      this.bonker.partQ(1, hp.x, hp.y, hp.z, 0.27, 0.15, 0.15, this._hq);
      this.bonker.partQ(0, (hp.x + hu) / 2, (hp.y + hy) / 2, (hp.z + hv) / 2, 0.04, len, 0.04, this._hq);
      this.bonker.done();
    },

    idleGame(dt) {
      // The crabs (and the odd gull) keep popping up while nobody plays.
      const g = this._idle || (this._idle = { t: 0, next: 1, last: -1 });
      g.next -= dt;
      if (g.next <= 0) {
        this.spawn(g, true);
        g.next = 0.9 + Math.random() * 1.2;
      }
      this.holesStep(dt);
      this.bonkT = 9;
      this.place();
    },
  });

  // ============================================================ HOOK-A-DUCK
  // A pool round an island in the booth ('duck', 9 wide, 6 deep). Yellow ducks drift round on the current;
  // gold ones swim the inside lane more than twice as fast. Each wears a red loop: dip the hook into it.
  const HD = {
    seconds: 45,
    water: KERB + 0.86, //      the water's surface
    rim: KERB + 0.97, //        the tank's edge
    vc: 1.3, //                 the island's middle line (v); its straight runs u -sl..sl
    sl: 2.7,
    lane: { duck: 0.74, gold: 0.52 }, // each kind's lane, out from the middle line
    speed: { duck: 0.36, gold: 0.75 },
    count: { duck: 16, gold: 3 },
    pts: { duck: 10, gold: 30 },
    loop: { duck: 0.06, gold: 0.05 }, // the hook this close to a loop at the bottom of a dip: hooked
    reach: [-3.3, 3.3, 2.2, 1.2], //    where the hook can go: u from, u to, v near, v far
    tip: KERB + 1.5, //         the cane's tip, over the hook
    hang: 0.34, //              the hook over the water, waiting
    dip: 0.13, //               seconds down into the water
    hands: [0.24, KERB + 1.28, 3.12],
    bucket: [1.75, 2.74], //    the bucket on the counter
    omega2: 19, //              the line's swing (gravity / length) and its damping
    damp: 5.5,
  };
  const POOL_DUCKS = [];
  for (const kind of ['duck', 'gold']) {
    const n = HD.count[kind], r = HD.lane[kind], L = 4 * HD.sl + TAU * r;
    for (let k = 0; k < n; k++) POOL_DUCKS.push({ kind, r, speed: HD.speed[kind], s0: (L * (k + (kind === 'gold' ? 0.3 : 0) + hash(k + 7) * 0.35)) / n });
  }

  /** A point round the pool, distance s along a lane r out from the middle line: into out { u, v, yaw }. */
  function poolAt(s, r, out) {
    const sl = HD.sl, L = 4 * sl + TAU * r;
    s = ((s % L) + L) % L;
    if (s < 2 * sl) {
      out.u = -sl + s;
      out.v = HD.vc + r;
      out.yaw = PI / 2;
      return out;
    }
    s -= 2 * sl;
    if (s < PI * r) {
      const a = s / r;
      out.u = sl + Math.sin(a) * r;
      out.v = HD.vc + Math.cos(a) * r;
      out.yaw = PI / 2 + a;
      return out;
    }
    s -= PI * r;
    if (s < 2 * sl) {
      out.u = sl - s;
      out.v = HD.vc - r;
      out.yaw = -PI / 2;
      return out;
    }
    s -= 2 * sl;
    const a = s / r;
    out.u = -sl - Math.sin(a) * r;
    out.v = HD.vc - Math.cos(a) * r;
    out.yaw = -PI / 2 + a;
    return out;
  }

  function poolDuckGeometry() {
    // Facing +v, white (the instance colour makes it yellow or gold), an orange beak, a red loop on its head.
    const g = new VH.GeometryBuilder({});
    const W = VH.col(0xffffff), O = VH.col(0xff7a1c), K = VH.col(0x111111), R = VH.col(0xd8342c);
    g.box(-0.065, -0.03, -0.1, 0.065, 0.07, 0.07, W); //   the body, a little under the water
    g.box(-0.07, 0.01, -0.07, 0.07, 0.06, 0.04, W); //     wings
    g.box(-0.04, 0.05, -0.13, 0.04, 0.11, -0.08, W); //    the tail, up
    g.box(-0.045, 0.07, 0.0, 0.045, 0.155, 0.08, W); //    the head
    g.box(-0.028, 0.095, 0.08, 0.028, 0.115, 0.13, O); //  the beak
    g.box(-0.049, 0.118, 0.04, -0.044, 0.134, 0.058, K); // eyes
    g.box(0.044, 0.118, 0.04, 0.049, 0.134, 0.058, K);
    // The loop: a short stalk and a square ring standing up across the head.
    g.box(-0.006, 0.155, 0.034, 0.006, 0.172, 0.046, R);
    g.box(-0.032, 0.17, 0.034, 0.032, 0.182, 0.046, R);
    g.box(-0.032, 0.228, 0.034, 0.032, 0.24, 0.046, R);
    g.box(-0.032, 0.17, 0.034, -0.02, 0.24, 0.046, R);
    g.box(0.02, 0.17, 0.034, 0.032, 0.24, 0.046, R);
    return g.build();
  }

  decorate((world, K) => {
    const put = deco(world, K, 'duck');
    const F = put.F, ctx = put.ctx;
    const sl = HD.sl, vc = HD.vc, wood = 0x9b6a3c, rim = 0xe8c48a;
    // The tank: water to the brim, wooden sides with a pale rim.
    put('prop', -3.95, KERB, 0.2, 3.95, HD.water, 2.4, 0x2b86c8);
    put('wood', -4.02, KERB, 2.4, 4.02, HD.rim, 2.46, wood);
    put('wood', -4.02, KERB, 0.14, 4.02, HD.rim, 0.2, wood);
    for (const s of [-1, 1]) put('wood', s * 3.95 - (s < 0 ? 0.07 : 0), KERB, 0.14, s * 3.95 + (s > 0 ? 0.07 : 0), HD.rim, 2.46, wood);
    put('prop', -4.04, HD.rim, 2.38, 4.04, HD.rim + 0.025, 2.48, rim);
    put('prop', -4.04, HD.rim, 0.12, 4.04, HD.rim + 0.025, 0.22, rim);
    for (const s of [-1, 1]) put('prop', s * 3.98 - 0.06, HD.rim, 0.12, s * 3.98 + 0.06, HD.rim + 0.025, 2.48, rim);
    // The island: grass, rounded ends, reeds, and a little duck house in the middle.
    put('prop', -sl, KERB, vc - 0.3, sl, HD.water + 0.06, vc + 0.3, 0x5aa85a);
    for (const s of [-1, 1]) ctx.prop.cylinder(F.wx(s * sl, vc), KERB, F.wz(s * sl, vc), 0.3, 0.3, HD.water + 0.06 - KERB, 12, VH.col(0x5aa85a), true);
    for (let i = 0; i < 9; i++) {
      const u = -sl + 0.2 + (i * (2 * sl - 0.4)) / 8 + (hash(i) - 0.5) * 0.2, v = vc + (hash(i + 3) - 0.5) * 0.36;
      if (Math.abs(u) < 0.5) continue;
      put('prop', u - 0.015, HD.water + 0.06, v - 0.015, u + 0.015, HD.water + 0.3 + hash(i + 9) * 0.15, v + 0.015, 0x3f8a3a);
      put('prop', u - 0.022, HD.water + 0.22 + hash(i + 9) * 0.15, v - 0.022, u + 0.022, HD.water + 0.3 + hash(i + 9) * 0.15, v + 0.022, 0x6b4a32);
    }
    put('prop', -0.3, HD.water + 0.06, vc - 0.2, 0.3, HD.water + 0.36, vc + 0.2, 0xf6f1e4);
    put('prop', -0.36, HD.water + 0.36, vc - 0.25, 0.36, HD.water + 0.42, vc + 0.25, 0xe0403a);
    put('prop', -0.24, HD.water + 0.42, vc - 0.16, 0.24, HD.water + 0.48, vc + 0.16, 0xe0403a);
    put('prop', -0.08, HD.water + 0.08, vc + 0.2, 0.08, HD.water + 0.24, vc + 0.21, 0x2a1a12);
    // The bucket on the counter, where the hooked ducks go.
    const [bu, bv] = HD.bucket;
    ctx.prop.cylinder(F.wx(bu, bv), KERB + 1.04, F.wz(bu, bv), 0.13, 0.16, 0.2, 14, VH.col(0x37b8ff), true, VH.col(0x1b3e6e));
    // A pond painted on the back wall: sky, hills, reeds; the prize board over it.
    put('prop', -4.3, KERB + 0.9, -2.74, 4.3, KERB + 3.2, -2.71, 0x9fdcf5);
    put('prop', -4.3, KERB + 0.9, -2.71, 4.3, KERB + 1.5, -2.69, 0x6cbf62);
    put('prop', -2.6, KERB + 1.5, -2.71, -0.6, KERB + 1.85, -2.69, 0x6cbf62);
    put('prop', 1.2, KERB + 1.5, -2.71, 3.6, KERB + 1.75, -2.69, 0x6cbf62);
    put('prop', -4.3, KERB + 0.9, -2.69, 4.3, KERB + 1.1, -2.67, 0x2b86c8);
    for (let i = 0; i < 12; i++) {
      const u = -4.1 + i * 0.72 + hash(i + 20) * 0.3;
      put('prop', u - 0.03, KERB + 1.0, -2.67, u + 0.03, KERB + 1.35 + hash(i + 30) * 0.3, -2.66, 0x3f8a3a);
    }
    K.wantSign('duck_board', ['YELLOW 10 · GOLD 30', 'Dip the hook in the loop'], 0x2fb7b0, 0xffd24a);
    K.QUADS.push(['duck_board', F.wx(0, -2.64), KERB + 2.2, F.wz(0, -2.64), F.yaw, 3.2, 0.8]);
  });

  const _hdP = { u: 0, v: 0, yaw: 0 };
  const _hdD = new THREE.Vector3();
  const _hdQ = new THREE.Quaternion();
  const _hdY = new THREE.Vector3(0, 1, 0);

  Carnival.stall({
    id: 'duck',
    name: 'Hook-a-Duck',
    booth: 'duck',
    tagline: 'Forty-five seconds. Hook a duck by its loop.',
    price: 3,
    unit: 'points',
    stand: [0, 3.35],
    cam: [1.0, KERB + 3.0, 6.0, 0, HD.water + 0.3, 1.35, 52],
    seconds: HD.seconds,
    holder: [-3.2, -1.1, 0.3],
    tint: 3,
    howto: [
      'Ducks float round the pool, each with a red loop on its head. Hold the hook over a duck\'s path.',
      'Dip just as the loop comes under it: hooked! It goes in your bucket. Yellow ducks 10, gold ones 30.',
      'The hook swings on its line when you move it: let it settle before you dip.',
    ],
    keys: 'Mouse / W A S D / left stick  move the hook   ·   Click / Space / A  dip',
    prize: 'One for every 12 points',
    barks: ['Hook-a-Duck! Everyone\'s a winner!', 'Hook a duck, win a prize! Three dollars!', 'Gold ducks pay thirty! Quick, mind, they\'re quick!'],
    statKeys: { ducks: 1 },

    tickets(score) {
      return score / 12;
    },

    verdict(g) {
      return g.ducks + (g.ducks === 1 ? ' duck' : ' ducks') + (g.golds ? ', ' + g.golds + ' gold' : '');
    },

    build(kit) {
      this.duckMesh = kit.mesh(poolDuckGeometry(), POOL_DUCKS.length);
      const col = new THREE.Color();
      POOL_DUCKS.forEach((D, i) => this.duckMesh.setColorAt(i, col.set(D.kind === 'gold' ? 0xffb81a : 0xffe85a)));
      this.ducks = POOL_DUCKS.map((D, i) => Object.assign({ i, state: 'swim', t: 9, u: 0, v: 0, yaw: 0, lu: 0, lv: 0 }, D));
      this.cane = kit.boxes(4); // the cane, the line, the hook's shank and its point
      this.cane.part(0, 0, -5, 0, 0.03, 1, 0.03, 0, 0, 0, 0xd9b26a);
      this.cane.part(1, 0, -5, 0, 0.006, 1, 0.006, 0, 0, 0, 0xf6f1e4);
      this.cane.part(2, 0, -5, 0, 0.012, 0.07, 0.012, 0, 0, 0, 0xc0c8d0);
      this.cane.part(3, 0, -5, 0, 0.05, 0.012, 0.012, 0, 0, 0, 0xc0c8d0);
      this.poolT = 0;
      this.HD = HD;
      this.poolAt = poolAt;
      this.reset();
    },

    reset() {
      for (const d of this.ducks) if (d.state !== 'swim') {
        d.state = 'swim';
        d.t = 9;
      }
      this.caneOn = false;
      for (let i = 0; i < 4; i++) this.cane.hide(i);
      this.cane.done();
    },

    begin(g, s) {
      g.ducks = 0;
      g.golds = 0;
      g.cx = 0;
      g.cy = 0.3;
      g.hu = 0;
      g.hv = HD.reach[2] - 0.3;
      g.vu = 0;
      g.vv = 0;
      g.hy = HD.water + HD.hang;
      g.st = 'aim';
      g.k = 0;
      g.duck = null;
      this.caneOn = true;
      s.ui.stat('ducks', 'Ducks', 0);
    },

    pose(g) {
      const [hu, , hv] = HD.hands;
      const tu = g.tu === undefined ? 0 : g.tu, tv = g.tv === undefined ? 2 : g.tv;
      const reach = clamp(Math.hypot(tu - hu, tv - hv) / 3, 0, 1);
      return { w: 1, shoulderL: 0.95 + reach * 0.35, shoulderR: 1.05 + reach * 0.3, elbowL: 0.55 - reach * 0.3, elbowR: 0.45 - reach * 0.25, lean: 0.18 + reach * 0.15, twist: -Math.atan2(tu - hu, hv - tv) * 0.45, splayL: 0.05, splayR: 0.05 };
    },

    /** The ducks drift round; one that went in the bucket comes back a little later with a plop. */
    pool(dt) {
      this.poolT += dt;
      for (const d of this.ducks) {
        d.t += dt;
        if (d.state === 'gone' && d.t > 2.5) {
          d.state = 'swim';
          d.t = 0;
        }
        if (d.state !== 'swim') continue;
        poolAt(d.s0 + d.speed * this.poolT, d.r, _hdP);
        const sway = Math.sin(this.poolT * 1.3 + d.i * 1.7) * 0.018;
        d.u = _hdP.u + Math.cos(_hdP.yaw) * sway;
        d.v = _hdP.v - Math.sin(_hdP.yaw) * sway;
        d.yaw = _hdP.yaw + Math.sin(this.poolT * 0.9 + d.i) * 0.12;
        // The loop sits a little forward on the head.
        d.lu = d.u + Math.sin(d.yaw) * 0.04;
        d.lv = d.v + Math.cos(d.yaw) * 0.04;
      }
    },

    play(dt, g, s) {
      const R = HD.reach;
      this.kit.cursor(g, dt, 2.2, R[0], R[1], 0, R[2] - R[3], 2.6);
      this.pool(dt);
      this.move(dt, g, s, true);
      if (g.st === 'aim' || g.st === 'dip') this.kit.reticle(g.hu, HD.water, g.hv, 'hole');
      else this.kit.reticle(null);
      this.place(g);
    },

    /** The cane, the line and the hook; live: the player can dip (not after the whistle). */
    move(dt, g, s, live) {
      const R = HD.reach;
      g.k += dt;
      // The cane's tip: over the cursor, or carrying a duck to the bucket and back.
      let tu = g.cx, tv = R[2] - g.cy;
      if (g.st === 'haul') {
        const f = clamp((g.k - 0.25) / 0.45, 0, 1), e = f * f * (3 - 2 * f);
        tu = g.tu0 + (HD.bucket[0] - g.tu0) * e;
        tv = g.tv0 + (HD.bucket[1] - g.tv0) * e;
      } else if (g.st === 'back') {
        const e = clamp(g.k / 0.25, 0, 1);
        tu = HD.bucket[0] + (tu - HD.bucket[0]) * e;
        tv = HD.bucket[1] + (tv - HD.bucket[1]) * e;
      }
      g.tu = tu;
      g.tv = tv;
      // The hook swings on its line under the tip (held still while it hauls a duck).
      if (g.st === 'haul' || g.st === 'back') {
        g.hu += (tu - g.hu) * Math.min(1, dt * 12);
        g.hv += (tv - g.hv) * Math.min(1, dt * 12);
        g.vu = 0;
        g.vv = 0;
      } else {
        const n = dt > 0.02 ? 2 : 1, h = dt / n;
        for (let i = 0; i < n; i++) {
          g.vu += (HD.omega2 * (tu - g.hu) - HD.damp * g.vu) * h;
          g.vv += (HD.omega2 * (tv - g.hv) - HD.damp * g.vv) * h;
          g.hu += g.vu * h;
          g.hv += g.vv * h;
        }
      }
      const top = HD.water + HD.hang;
      switch (g.st) {
        case 'aim':
          g.hy = top;
          if (live && (s.pressed('fire') || s.pressed('jump') || s.pressed('interact'))) {
            g.st = 'dip';
            g.k = 0;
            s.sound('whoosh', { gain: 0.15 });
          }
          break;
        case 'dip':
          g.hy = top - (top - HD.water - 0.02) * clamp(g.k / HD.dip, 0, 1);
          if (g.k >= HD.dip) this.dipped(g, s);
          break;
        case 'up':
          g.hy = HD.water + 0.02 + (top - HD.water - 0.02) * clamp(g.k / 0.25, 0, 1);
          if (g.k >= 0.35) {
            g.st = 'aim';
            g.k = 0;
          }
          break;
        case 'haul': {
          // Up out of the water, across to the bucket, and in.
          const lift = clamp(g.k / 0.25, 0, 1);
          g.hy = HD.water + 0.02 + (KERB + 1.62 - HD.water) * lift * (2 - lift);
          if (g.k >= 0.75) this.bucketed(g, s);
          break;
        }
        case 'back':
          g.hy = KERB + 1.62 + (top - KERB - 1.62) * clamp(g.k / 0.25, 0, 1);
          if (g.k >= 0.25) {
            g.st = 'aim';
            g.k = 0;
          }
          break;
      }
    },

    /** The hook's in the water: is a loop on it? */
    dipped(g, s) {
      let best = null, bd = 1e9;
      for (const d of this.ducks) {
        if (d.state !== 'swim' || d.t < 0.3) continue;
        const dd = Math.hypot(d.lu - g.hu, d.lv - g.hv);
        if (dd < bd) {
          bd = dd;
          best = d;
        }
      }
      if (best && bd < HD.loop[best.kind]) {
        best.state = 'hooked';
        best.t = 0;
        g.duck = best;
        g.st = 'haul';
        g.k = 0;
        g.tu0 = g.tu;
        g.tv0 = g.tv;
        s.sound('splash', { gain: 0.35 });
        s.sound('pop', { gain: 0.5 });
        this.kit.pop(best.u, HD.water + 0.35, best.v, 'Hooked!', best.kind === 'gold' ? 'gold' : '');
      } else {
        g.st = 'up';
        g.k = 0;
        s.sound('splash', { gain: 0.3 });
        this.kit.burst(g.hu, HD.water + 0.02, g.hv, 0x9fdcf5, 6);
        if (best && bd < 0.16) this.kit.pop(g.hu, HD.water + 0.3, g.hv, 'So close!', 'bad');
      }
    },

    /** The hooked duck drops in the bucket: points. */
    bucketed(g, s) {
      const d = g.duck;
      g.duck = null;
      g.st = 'back';
      g.k = 0;
      if (!d) return;
      d.state = 'gone';
      d.t = 0;
      const pts = HD.pts[d.kind];
      g.score += pts;
      g.ducks++;
      if (d.kind === 'gold') g.golds++;
      s.ui.stat('ducks', 'Ducks', g.ducks);
      const [bu, bv] = HD.bucket;
      this.kit.pop(bu, KERB + 1.5, bv, '+' + pts, d.kind === 'gold' ? 'gold' : '');
      this.kit.burst(bu, KERB + 1.3, bv, d.kind === 'gold' ? 0xffd24a : 0xfff1a8, d.kind === 'gold' ? 16 : 7);
      s.sound(d.kind === 'gold' ? 'win' : 'ding', { gain: 0.55 });
    },

    after(dt, g, s) {
      // A duck on the hook at the whistle still goes in the bucket (and counts).
      this.pool(dt);
      this.move(dt, g, s, false);
      this.place(g);
    },

    place(g) {
      const kit = this.kit;
      for (const d of this.ducks) {
        if (d.state === 'gone') {
          kit.hide(this.duckMesh, d.i);
          continue;
        }
        if (d.state === 'hooked' && g) {
          // Hanging by its loop from the hook, swinging a little.
          kit.set(this.duckMesh, d.i, g.hu, g.hy - 0.21, g.hv, Math.sin(d.t * 9) * 0.25, d.yaw + d.t * 2, 0);
          continue;
        }
        const plop = d.t < 0.3 ? (1 - d.t / 0.3) * 0.5 : 0;
        const bob = Math.sin(this.poolT * 2.3 + d.i * 2.1) * 0.006;
        kit.set(this.duckMesh, d.i, d.u, HD.water + bob + plop, d.v, Math.sin(this.poolT * 1.7 + d.i) * 0.05, d.yaw, Math.sin(this.poolT * 2.1 + d.i * 0.7) * 0.06);
      }
      this.duckMesh.instanceMatrix.needsUpdate = true;
      if (!this.caneOn || !g) return;
      // The cane from Jay's hands to the tip over the hook; the line down to the hook.
      const [hu, hy, hv] = HD.hands;
      const tu = g.tu, tv = g.tv, ty = Math.max(HD.tip, g.hy + 0.2);
      this.rod(0, hu, hy, hv, tu, ty, tv, 0.03);
      this.rod(1, tu, ty, tv, g.hu, g.hy + 0.07, g.hv, 0.006);
      this.cane.part(2, g.hu, g.hy + 0.035, g.hv, 0.012, 0.07, 0.012, 0, 0, 0);
      this.cane.part(3, g.hu + 0.018, g.hy + 0.004, g.hv, 0.045, 0.012, 0.012, 0, 0, 0.5);
      this.cane.done();
    },

    /** Box i of the cane set as a rod from a to b. */
    rod(i, au, ay, av, bu, by, bv, w) {
      const d = _hdD.set(bu - au, by - ay, bv - av);
      const len = Math.max(0.001, d.length());
      _hdQ.setFromUnitVectors(_hdY, d.multiplyScalar(1 / len));
      this.cane.partQ(i, (au + bu) / 2, (ay + by) / 2, (av + bv) / 2, w, len, w, _hdQ);
    },

    idleGame(dt) {
      this.pool(dt);
      this.place(null);
    },
  });

  // ======================================================== BOARDWALK HOOPS
  // A hoop on a backboard sliding along a rail at the back of the booth ('hoops', 8 wide, 6 deep). Every throw
  // tops out just under the canopy; the power sets how deep it goes, the aim where across. The hoop keeps still
  // for the first few seconds, then slides, faster and faster.
  const HO = {
    seconds: 45,
    ring: { y: KERB + 2.05, v: -1.95, R: 0.23, tube: 0.016 },
    board: { v: -2.3, hw: 0.56, y0: KERB + 1.88, y1: KERB + 2.72 }, // the backboard's face and its size
    rail: 2.2, //              the hoop slides u -rail..rail
    still: 6, //               seconds before it starts to slide
    rb: 0.115, //              the ball
    hand: [0.16, KERB + 1.6, 2.95], // where a throw leaves Jay's hands
    peak: KERB + 3.05, //      every throw's top (just under the canopy)
    depth: 0.8, //             metres deeper per unit of power (0.5 is a throw to the ring)
    sweep: 1.3, //             seconds for the power to run from one end to the other
    pts: 20, //                a basket (a swish, touching nothing, 10 more)
    swish: 10,
    balls: 6,
    g: 9.81,
    back: -2.74, //            the back wall, the side walls, the floor
    side: 3.8,
    floor: KERB + 0.02,
  };

  /** The hoop's place across the rail at go time t (still, then sliding faster). */
  function hoopAt(t) {
    if (t < HO.still) return 0;
    const x = t - HO.still;
    // The phase: a slow start, then up to about 1.3 m/s along the rail.
    const ph = 0.35 * x + 0.0045 * x * x;
    return Math.sin(ph) * HO.rail;
  }

  function basketballGeometry() {
    // Orange, with dark seams round the middle and over the top.
    const r = HO.rb;
    const geo = new THREE.IcosahedronGeometry(r, 2);
    const n = geo.attributes.position.count;
    const p = geo.attributes.position.array;
    const cols = new Float32Array(n * 3);
    const o = new THREE.Color(0xe8661c), k = new THREE.Color(0x3a1a0a);
    for (let i = 0; i < n; i++) {
      const seam = Math.abs(p[i * 3]) < r * 0.12 || Math.abs(p[i * 3 + 1]) < r * 0.12;
      const c = seam ? k : o;
      cols[i * 3] = c.r;
      cols[i * 3 + 1] = c.g;
      cols[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    return geo;
  }

  function hoopGeometry() {
    // At u = 0 (the mesh slides): the backboard, the bracket, the ring and the net; an arm back to the rail.
    const g = new VH.GeometryBuilder({});
    const R = HO.ring, B = HO.board;
    const W = VH.col(0xffffff), Rd = VH.col(0xe0403a), O = VH.col(0xff7a1c), N = VH.col(0xf6f1e4), M = VH.col(0x8a96a3);
    g.box(-B.hw, B.y0, B.v - 0.04, B.hw, B.y1, B.v, W);
    // A red frame round the board, and the small square over the ring.
    g.box(-B.hw, B.y1 - 0.04, B.v, B.hw, B.y1, B.v + 0.005, Rd);
    g.box(-B.hw, B.y0, B.v, B.hw, B.y0 + 0.04, B.v + 0.005, Rd);
    g.box(-B.hw, B.y0, B.v, -B.hw + 0.04, B.y1, B.v + 0.005, Rd);
    g.box(B.hw - 0.04, B.y0, B.v, B.hw, B.y1, B.v + 0.005, Rd);
    g.box(-0.2, R.y + 0.02, B.v, 0.2, R.y + 0.05, B.v + 0.006, Rd);
    g.box(-0.2, R.y + 0.32, B.v, 0.2, R.y + 0.35, B.v + 0.006, Rd);
    g.box(-0.2, R.y + 0.02, B.v, -0.17, R.y + 0.35, B.v + 0.006, Rd);
    g.box(0.17, R.y + 0.02, B.v, 0.2, R.y + 0.35, B.v + 0.006, Rd);
    g.box(-0.05, R.y - 0.03, B.v, 0.05, R.y + 0.01, R.v - R.R + 0.01, O); // the bracket
    // The ring: short boxes round a circle.
    const n = 20;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * TAU, a1 = ((i + 1) / n) * TAU;
      const x0 = Math.cos(a0) * R.R, z0 = Math.sin(a0) * R.R, x1 = Math.cos(a1) * R.R, z1 = Math.sin(a1) * R.R;
      g.box(Math.min(x0, x1) - R.tube, R.y - R.tube, R.v + Math.min(z0, z1) - R.tube, Math.max(x0, x1) + R.tube, R.y + R.tube, R.v + Math.max(z0, z1) + R.tube, O);
    }
    // The net: strands from the ring down to a narrower loop, and two hoops of cord.
    const m = 12;
    for (let i = 0; i < m; i++) {
      const a = (i / m) * TAU;
      for (let k = 0; k < 4; k++) {
        const f0 = k / 4, f1 = (k + 1) / 4;
        const r0 = R.R * (1 - 0.35 * f0), r1 = R.R * (1 - 0.35 * f1);
        const xm = Math.cos(a) * (r0 + r1) / 2, zm = Math.sin(a) * (r0 + r1) / 2;
        g.box(xm - 0.006, R.y - 0.4 * f1, R.v + zm - 0.006, xm + 0.006, R.y - 0.4 * f0, R.v + zm + 0.006, N);
      }
    }
    for (const f of [0.45, 0.95]) {
      const r = R.R * (1 - 0.35 * f), y = R.y - 0.4 * f;
      for (let i = 0; i < m; i++) {
        const a0 = (i / m) * TAU, a1 = ((i + 1) / m) * TAU;
        const x0 = Math.cos(a0) * r, z0 = Math.sin(a0) * r, x1 = Math.cos(a1) * r, z1 = Math.sin(a1) * r;
        g.box(Math.min(x0, x1) - 0.005, y - 0.005, R.v + Math.min(z0, z1) - 0.005, Math.max(x0, x1) + 0.005, y + 0.005, R.v + Math.max(z0, z1) + 0.005, N);
      }
    }
    // The carriage on the rail behind.
    g.box(-0.3, KERB + 2.2, HO.back + 0.02, 0.3, KERB + 2.38, B.v - 0.04, M);
    return g.build();
  }

  decorate((world, K) => {
    const put = deco(world, K, 'hoops');
    // A court: wooden floor with a painted key; a night-blue wall with stars; the rail the hoop runs on.
    put('wood', -3.8, KERB + 0.02, -2.74, 3.8, KERB + 0.04, 2.4, 0xc8955a);
    put('prop', -1.0, KERB + 0.04, -2.74, -0.94, KERB + 0.045, 0.2, 0xffffff);
    put('prop', 0.94, KERB + 0.04, -2.74, 1.0, KERB + 0.045, 0.2, 0xffffff);
    put('prop', -1.0, KERB + 0.04, 0.14, 1.0, KERB + 0.045, 0.2, 0xffffff);
    put('prop', -3.85, KERB + 0.04, -2.75, 3.85, KERB + 3.2, -2.71, 0x1b2a5e);
    for (let i = 0; i < 26; i++) {
      const u = -3.6 + hash(i + 40) * 7.2, y = KERB + 0.6 + hash(i + 60) * 2.5, sz = 0.03 + hash(i + 80) * 0.04;
      put('screen', u - sz, y - sz, -2.71, u + sz, y + sz, -2.7, i % 3 ? 0xfff1a8 : 0xffffff);
    }
    put('prop', -3.8, KERB + 2.24, -2.71, 3.8, KERB + 2.34, -2.62, 0x8a96a3);
    for (const u of [-3.0, 0, 3.0]) put('prop', u - 0.05, KERB + 2.18, -2.71, u + 0.05, KERB + 2.4, -2.6, 0x5a6470);
    // The ball rack on the counter, by Jay's left hand.
    put('wood', -1.3, KERB + 1.04, 2.5, -0.5, KERB + 1.1, 2.95, 0x6b4a32);
    K.wantSign('hoops_board', ['BASKET 20 · SWISH 30', 'The hoop moves after 6 seconds'], 0xff8a3c, 0xffffff);
    K.QUADS.push(['hoops_board', put.F.wx(-2.4, -2.68), KERB + 1.2, put.F.wz(-2.4, -2.68), put.F.yaw, 2.2, 0.55]);
  });

  const _hoN = new THREE.Vector3();

  Carnival.stall({
    id: 'hoops',
    name: 'Boardwalk Hoops',
    booth: 'hoops',
    tagline: 'Forty-five seconds. Sink as many as you can.',
    price: 3,
    unit: 'points',
    stand: [0, 3.35],
    cam: [0.75, KERB + 2.45, 6.4, 0, KERB + 1.85, -1.9, 50],
    seconds: HO.seconds,
    holder: [-3.0, 1.6, 0.4],
    tint: 4,
    howto: [
      'Move the ring marker over the hoop. Hold to swing the power; let go in the middle for a throw that reaches the ring.',
      'A basket is 20 points; a swish that touches nothing is 30.',
      'The hoop starts to slide after six seconds, faster and faster: aim where it will be, not where it is.',
    ],
    keys: 'Mouse / A D / left stick  aim   ·   Hold click / Space / RT  power, let go to throw',
    prize: 'One for every 15 points',
    barks: ['Boardwalk Hoops! Sink it, win it!', 'Three dollars, all the balls you can throw!', 'Swish pays thirty! Step up, shooter!'],
    statKeys: { baskets: 1 },

    tickets(score) {
      return score / 15;
    },

    verdict(g) {
      return g.baskets + (g.baskets === 1 ? ' basket' : ' baskets') + ' from ' + g.shots + (g.swishes ? ', ' + g.swishes + (g.swishes === 1 ? ' swish' : ' swishes') : '');
    },

    build(kit) {
      this.hoop = kit.single(hoopGeometry());
      this.ballMesh = kit.mesh(basketballGeometry(), HO.balls + 1);
      this.balls = [];
      for (let i = 0; i < HO.balls; i++) this.balls.push({ i, state: 'off', u: 0, y: 0, v: 0, vu: 0, vy: 0, vv: 0, t: 0, rx: 0, ry: 0, touched: false, scored: false });
      this.hu = 0;
      this.idleT = 0;
      this.HO = HO;
      this.hoopAt = hoopAt;
      this.reset();
    },

    reset() {
      for (const b of this.balls) b.state = 'off';
      this.hu = 0;
      this.next = 0;
      this.place(null);
    },

    begin(g, s) {
      g.cx = 0;
      g.power = 0;
      g.dir = 1;
      g.charging = false;
      g.ready = 0.3;
      g.last = null;
      g.shots = 0;
      g.baskets = 0;
      g.swishes = 0;
      g.streak = 0;
      s.ui.stat('baskets', 'Baskets', 0);
    },

    pose(g) {
      // The ball up in both hands; drawn back over the head while the power runs; arms up after a throw.
      const k = g.charging ? 0.6 + 0.4 * g.power : 0, f = clamp(1 - (g.since || 9) / 0.35, 0, 1);
      return { w: 1, shoulderL: 1.5 + k * 0.9 + f * 0.6, shoulderR: 1.5 + k * 0.9 + f * 0.6, elbowL: 1.3 + k * 0.5 - f * 1.0, elbowR: 1.3 + k * 0.5 - f * 1.0, lean: 0.05 - k * 0.12 + f * 0.1, twist: g.cx * 0.06, splayL: 0.18, splayR: 0.18 };
    },

    play(dt, g, s) {
      this.kit.cursor(g, dt, 2.4, -3.2, 3.2, -1, 1, 2.2);
      this.hu = hoopAt(g.t);
      g.ready -= dt;
      g.since = (g.since || 9) + dt;
      const hold = s.down('fire') || s.down('jump');
      if (g.ready <= 0) {
        if (hold) {
          if (!g.charging) {
            g.charging = true;
            g.power = 0;
            g.dir = 1;
          }
          // The power runs out and back.
          g.power += (g.dir * dt) / HO.sweep;
          if (g.power >= 1) {
            g.power = 2 - g.power;
            g.dir = -1;
          } else if (g.power <= 0) {
            g.power = -g.power;
            g.dir = 1;
          }
        } else if (g.charging) {
          g.charging = false;
          this.shoot(g, s);
        }
      }
      // The gauge: the power, with a tick where the last throw was.
      const ui = Carnival.Midway.ui;
      if (g.charging) ui.gauge(g.power, g.last === null ? -1 : g.last - 0.008, g.last === null ? -1 : g.last + 0.008, 'Power');
      else ui.gauge(null);
      this.flight(dt, g, s);
      this.kit.reticle(g.cx, HO.ring.y, HO.ring.v, 'hole');
      this.place(g);
    },

    after(dt, g, s) {
      Carnival.Midway.ui.gauge(null);
      this.hu = hoopAt(g.t);
      this.flight(dt, g, s);
      this.place(g);
    },

    /** Let go: a ball from Jay's hands to the top of the arc and down to the depth the power says. */
    shoot(g, s) {
      const b = this.balls.find((x) => x.state === 'off') || this.balls.reduce((a, x) => (x.t > a.t ? x : a), this.balls[0]);
      const [u0, y0, v0] = HO.hand;
      const tu = g.cx, tv = HO.ring.v - (g.power - 0.5) * HO.depth;
      const up = Math.sqrt(2 * HO.g * (HO.peak - y0)), tUp = up / HO.g, tDown = Math.sqrt((2 * (HO.peak - HO.ring.y)) / HO.g), T = tUp + tDown;
      b.state = 'fly';
      b.t = 0;
      b.u = u0;
      b.y = y0;
      b.v = v0;
      b.vu = (tu - u0) / T;
      b.vy = up;
      b.vv = (tv - v0) / T;
      b.touched = false;
      b.scored = false;
      b.rest = 0;
      g.last = g.power;
      g.shots++;
      g.ready = 0.45;
      g.since = 0;
      s.sound('whoosh', { gain: 0.3 });
    },

    /** The balls in the air: gravity, the ring, the board, the walls and the floor; a basket when one drops through. */
    flight(dt, g, s) {
      const R = HO.ring, B = HO.board, rb = HO.rb, n = 6, h = dt / n;
      for (const b of this.balls) {
        if (b.state === 'off') continue;
        b.t += dt;
        b.rx += dt * 9;
        if (b.state === 'rest') {
          b.rest += dt;
          if (b.rest > 1.2) b.state = 'off';
          continue;
        }
        for (let k = 0; k < n; k++) {
          const py = b.y;
          b.vy -= HO.g * h;
          b.u += b.vu * h;
          b.y += b.vy * h;
          b.v += b.vv * h;
          // Through the ring, going down: a basket.
          const du = b.u - this.hu, dv = b.v - R.v, rho = Math.hypot(du, dv);
          if (!b.scored && py > R.y && b.y <= R.y && rho < R.R) {
            b.scored = true;
            b.vu *= 0.25;
            b.vv *= 0.25;
            b.vy *= 0.5;
            if (g) this.basket(g, s, b);
          }
          // The ring: the nearest point on its circle.
          if (rho > 1e-4 && Math.abs(b.y - R.y) < rb + R.tube + 0.02) {
            const cu = this.hu + (du / rho) * R.R, cv = R.v + (dv / rho) * R.R;
            const nu = b.u - cu, ny = b.y - R.y, nv = b.v - cv, d = Math.hypot(nu, ny, nv), min = rb + R.tube;
            if (d < min && d > 1e-5) {
              const ku = nu / d, ky = ny / d, kv = nv / d;
              b.u = cu + ku * min;
              b.y = R.y + ky * min;
              b.v = cv + kv * min;
              const vn = b.vu * ku + b.vy * ky + b.vv * kv;
              if (vn < 0) {
                b.vu -= 1.55 * vn * ku;
                b.vy -= 1.55 * vn * ky;
                b.vv -= 1.55 * vn * kv;
                if (!b.touched && s && -vn > 0.8) s.sound('clank', { gain: 0.25 });
              }
              b.touched = true;
            }
          }
          // The backboard.
          if (b.v - rb < B.v && b.vv < 0 && b.v > B.v - 0.3 && Math.abs(b.u - this.hu) < B.hw + rb * 0.5 && b.y > B.y0 - rb * 0.5 && b.y < B.y1 + rb * 0.5) {
            b.v = B.v + rb;
            b.vv = -b.vv * 0.6;
            b.touched = true;
            if (s) s.sound('thud', { gain: 0.3 });
          }
          // The back wall, the sides, the floor.
          if (b.v - rb < HO.back && b.vv < 0) {
            b.v = HO.back + rb;
            b.vv = -b.vv * 0.5;
          }
          if (Math.abs(b.u) + rb > HO.side && b.u * b.vu > 0) b.vu = -b.vu * 0.5;
          if (b.y - rb < HO.floor && b.vy < 0) {
            b.y = HO.floor + rb;
            b.vy = -b.vy * 0.55;
            b.vu *= 0.8;
            b.vv *= 0.8;
            if (b.vy < 0.6) {
              b.state = 'rest';
              b.rest = 0;
              break;
            }
          }
          // Back towards the counter: it stops there.
          if (b.v > 2.3 && b.vv > 0) b.vv = -b.vv * 0.3;
        }
      }
    },

    basket(g, s, b) {
      const swish = !b.touched;
      const pts = HO.pts + (swish ? HO.swish : 0);
      g.score += pts;
      g.baskets++;
      if (swish) g.swishes++;
      s.ui.stat('baskets', 'Baskets', g.baskets);
      this.kit.pop(this.hu, HO.ring.y + 0.35, HO.ring.v, swish ? '+' + pts + ' swish!' : '+' + pts, swish ? 'gold' : '');
      this.kit.burst(this.hu, HO.ring.y - 0.1, HO.ring.v, swish ? 0xffd24a : 0xfff1a8, swish ? 16 : 8);
      s.sound('ding', { gain: 0.5 });
      if (swish) s.sound('cheer', { gain: 0.3 });
    },

    place(g) {
      const kit = this.kit;
      this.hoop.position.x = this.hu;
      for (const b of this.balls) {
        if (b.state === 'off') kit.hide(this.ballMesh, b.i);
        else kit.set(this.ballMesh, b.i, b.u, b.y, b.v, b.rx, b.rx * 0.3, 0, b.state === 'rest' ? Math.max(0.01, 1 - Math.max(0, b.rest - 0.8) / 0.4) : 1);
      }
      // The next ball, in Jay's hands (drawn back over his head while the power runs).
      const H = HO.balls;
      if (!g || g.ready > 0) kit.hide(this.ballMesh, H);
      else {
        const k = g.charging ? 0.5 + 0.5 * g.power : 0;
        kit.set(this.ballMesh, H, HO.hand[0] - 0.1, HO.hand[1] - 0.05 + k * 0.32, HO.hand[2] + 0.12 + k * 0.12, 0, 0, 0);
      }
      this.ballMesh.instanceMatrix.needsUpdate = true;
    },

    idleGame(dt) {
      // The hoop glides to and fro while nobody plays.
      this.idleT += dt;
      this.hu = Math.sin(this.idleT * 0.3) * HO.rail * 0.6;
      this.hoop.position.x = this.hu;
    },
  });
})();
