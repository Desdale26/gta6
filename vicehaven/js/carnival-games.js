/*
 * carnival-games.js — Wonder Wharf's stall games, each a game of skill on
 * the midway framework (js/carnival-midway.js: VH.Carnival.stall, whose
 * header documents the hooks and the kit):
 *
 *   grabber   the Golden Grabber: steer the claw, drop it, carry a teddy to
 *             the chute (three tries; the claw swings, a loose grip slips)
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
})();
