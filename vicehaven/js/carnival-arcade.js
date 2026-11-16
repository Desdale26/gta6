/*
 * carnival-arcade.js — Arcade Row's playable cabinets. Each is an original
 * little 2D game drawn on its own 320 × 240 canvas: shown large while Jay
 * plays, and live on the cabinet's own screen (a title page with the table
 * of high scores, then the game playing itself) while he's nearby.
 *
 *   dash     Boardwalk Dash: run the length of the pier in 90 seconds; jump
 *            the crates and the gaps in the planks, duck the gulls, grab the
 *            doughnuts (three hearts)
 *   sprint   Seafront Sprint: a top-down time trial, four laps of a seafront
 *            circuit (the sand slows you, cones scatter, yellow arrows boost)
 *   sub      Bubble Sub: a little submarine on the sea bed blowing bubbles at
 *            shoals of sardines, jellyfish and puffers, then the Big Angler
 *
 * They run on the stall framework (VH.Carnival.stall, js/carnival-midway.js):
 * the rules card, one player or two, the countdown, the results and the
 * tickets. A score good enough for the cabinet's table of five asks for
 * initials. The cabinets are neonstrand.js's (the west row of Arcade Row,
 * facing the aisle); this file gives three of them a live screen, a marquee
 * and a control panel.
 *
 * A game here is a class with reset(seed), step(dt, IN) (IN: the controls
 * this frame, below), draw(c) (a 2D context), demo(IN) (the attract mode's
 * own player), score, over (null, or the word the go ends on) and line()
 * (a few words for the results card).
 */
(function () {
  'use strict';

  const VH = window.VH;
  const Carnival = VH.Carnival;
  if (!Carnival || !Carnival.stall) return;
  const KERB = 0.15;
  const PI = Math.PI;
  const TAU = PI * 2;
  const W = 320;
  const H = 240;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const ROW_X = 828; // the west row of cabinets: their screens face +x, the aisle

  /** A small random-number generator that gives the same run for the same seed. */
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /** Text with a dark drop shadow, so it reads on anything. */
  function label(c, s, x, y, size, col, align) {
    c.font = 'bold ' + size + 'px monospace';
    c.textAlign = align || 'left';
    c.textBaseline = 'alphabetic';
    c.fillStyle = 'rgba(0,0,0,0.75)';
    c.fillText(s, x + 1, y + 1);
    c.fillStyle = col;
    c.fillText(s, x, y);
  }

  function heart(c, x, y, col) {
    c.fillStyle = col;
    c.fillRect(x + 1, y, 3, 2);
    c.fillRect(x + 6, y, 3, 2);
    c.fillRect(x, y + 1, 10, 3);
    c.fillRect(x + 1, y + 4, 8, 2);
    c.fillRect(x + 3, y + 6, 4, 2);
  }

  // The controls this frame, the same for every game: the stick / keys (x right, y up), the main
  // button (Space, click, E, pad A or RT) held and just pressed, and the stick's taps (the initials).
  const IN = { x: 0, y: 0, a: false, aP: false, upP: false, downP: false, leftP: false, rightP: false };
  const _padPrev = { x: 0, y: 0 };
  function readIn(s) {
    const pad = s.game.input.pad;
    let x = (s.down('moveRight') ? 1 : 0) - (s.down('moveLeft') ? 1 : 0);
    let y = (s.down('moveForward') ? 1 : 0) - (s.down('moveBack') ? 1 : 0);
    let px = 0, py = 0;
    if (pad && pad.connected) {
      px = Math.abs(pad.move.x) > 0.25 ? pad.move.x : 0;
      py = Math.abs(pad.move.y) > 0.25 ? pad.move.y : 0;
      if (px || py) {
        x = px;
        y = py;
      }
    }
    IN.x = x;
    IN.y = y;
    IN.a = s.down('jump') || s.down('fire') || s.down('interact');
    IN.aP = s.pressed('jump') || s.pressed('fire') || s.pressed('interact');
    IN.upP = s.pressed('moveForward') || (py > 0.6 && _padPrev.y <= 0.6);
    IN.downP = s.pressed('moveBack') || (py < -0.6 && _padPrev.y >= -0.6);
    IN.leftP = s.pressed('moveLeft') || (px < -0.6 && _padPrev.x >= -0.6);
    IN.rightP = s.pressed('moveRight') || (px > 0.6 && _padPrev.x <= 0.6);
    _padPrev.x = px;
    _padPrev.y = py;
    return IN;
  }
  function clearIn() {
    IN.x = IN.y = 0;
    IN.a = IN.aP = IN.upP = IN.downP = IN.leftP = IN.rightP = false;
    return IN;
  }

  // ============================================================ BOARDWALK DASH
  // A side view of the pier: the runner keeps his place, the pier goes by faster and faster. Crates and
  // gaps in the planks to jump (hold the button for a higher jump), gulls at head height to duck, lobster
  // pots stacked high (a held jump), doughnuts to grab. Three hearts; reach the end of the pier in 90 s.
  const DASH = {
    secs: 90,
    deck: 196, //            the deck's top
    x: 64, //                the runner's place across the screen
    g: 1150, //              gravity (px/s²); a jump, how long holding the button lifts it, and how much
    jump: 370,
    holdT: 0.22,
    holdG: 0.4,
    dive: 1700, //           holding down in the air drops him faster
    v0: 125, //              the pier's speed (px/s) at the start, and what it gains a second
    dv: 1.35,
    tall: 26, //             the runner standing, ducking; half his width
    low: 14,
    half: 6,
    gullY: 168, //           a gull's middle (at head height)
    gullV: 45, //            gulls fly at him this much faster than the pier goes by
    px: 20, //               pier per point
  };

  let dashSky = null;
  /** The town on the far shore and the fair's wheel, painted once: a strip that scrolls slowly. */
  function dashSkyline() {
    if (dashSky) return dashSky;
    const cv = document.createElement('canvas');
    cv.width = 512;
    cv.height = 70;
    const c = cv.getContext('2d');
    const r = rng(7);
    c.fillStyle = '#b58fd6';
    for (let x = 0; x < 512; ) {
      const w = 14 + r() * 26, h = 14 + r() * 44;
      if (x < 300 || x > 400) c.fillRect(x, 70 - h, w, h);
      x += w + 2;
    }
    c.fillStyle = '#d7b8f0';
    for (let i = 0; i < 40; i++) c.fillRect((r() * 512) | 0, 30 + ((r() * 36) | 0), 2, 2);
    // The wheel.
    c.strokeStyle = '#9a6fc4';
    c.lineWidth = 2;
    c.beginPath();
    c.arc(350, 36, 26, 0, TAU);
    c.stroke();
    for (let k = 0; k < 8; k++) {
      c.beginPath();
      c.moveTo(350, 36);
      c.lineTo(350 + Math.cos((k * PI) / 4) * 26, 36 + Math.sin((k * PI) / 4) * 26);
      c.stroke();
    }
    c.fillStyle = '#9a6fc4';
    c.fillRect(340, 36, 3, 34);
    c.fillRect(357, 36, 3, 34);
    dashSky = cv;
    return cv;
  }

  class Dash {
    constructor() {
      this.title = 'BOARDWALK DASH';
      this.ink = '#ffd24a';
      this.obs = [];
      for (let i = 0; i < 16; i++) this.obs.push({ on: false, kind: '', x: 0, w: 0, h: 0, y: 0, hit: false, ht: 0 });
      this.picks = [];
      for (let i = 0; i < 28; i++) this.picks.push({ on: false, kind: '', x: 0, y: 0, got: false, gt: 0 });
      this.pops = [];
      for (let i = 0; i < 6; i++) this.pops.push({ t: 9, x: 0, y: 0, txt: '' });
      this._popI = 0;
      this.sfx = () => {};
      this._sky = null;
      this.reset(1);
    }

    reset(seed) {
      this.rnd = rng(seed);
      this.t = 0;
      this.dist = 0;
      this.speed = DASH.v0;
      this.score = 0;
      this.bonus = 0;
      this.over = null;
      this.hearts = 3;
      this.y = DASH.deck;
      this.vy = 0;
      this.ground = true;
      this.duck = false;
      this.held = 0; //    how long this jump has been held
      this.coyote = 0; //  a moment after running off an edge when a jump still works
      this.buffer = 0; //  a press just before landing jumps on landing
      this.hurt = 0;
      this.shake = 0;
      this.next = 150;
      this.donuts = 0;
      this.ticketsGot = 0;
      this.splashes = 0;
      this.knocks = 0;
      for (const o of this.obs) o.on = false;
      for (const p of this.picks) p.on = false;
      for (const p of this.pops) p.t = 9;
    }

    line() {
      const bits = [this.over === 'END OF THE PIER!' ? 'reached the end of the pier' : 'ran ' + Math.round(this.dist / DASH.px) + ' m'];
      bits.push(this.donuts + (this.donuts === 1 ? ' doughnut' : ' doughnuts'));
      if (this.ticketsGot) bits.push(this.ticketsGot + ' gold ' + (this.ticketsGot === 1 ? 'ticket' : 'tickets'));
      return bits.join(', ');
    }

    obstacle(kind, x, w, h, y) {
      const o = this.obs.find((q) => !q.on);
      if (!o) return null;
      o.on = true;
      o.kind = kind;
      o.x = x;
      o.w = w;
      o.h = h;
      o.y = y || 0;
      o.hit = false;
      o.ht = 0;
      return o;
    }

    pickup(kind, x, y) {
      const p = this.picks.find((q) => !q.on);
      if (!p) return;
      p.on = true;
      p.kind = kind;
      p.x = x;
      p.y = y;
      p.got = false;
      p.gt = 0;
    }

    /** The next stretch of pier: something to jump or duck, and doughnuts, at world x = this.next. */
    spawn() {
      const r = this.rnd, t = this.t, X = this.next, v = this.speed, D = DASH;
      const roll = r();
      let len = 40;
      if (t < 3) {
        for (let i = 0; i < 4; i++) this.pickup('donut', X + i * 22, D.deck - 12);
        len = 90;
      } else if (roll < 0.3) {
        this.obstacle('crate', X, 22, 22);
        for (let i = 0; i < 3; i++) this.pickup('donut', X - 18 + i * 29, D.deck - 40 - (i === 1 ? 18 : 0));
        len = 22;
      } else if (roll < 0.52) {
        const w = 40 + Math.min(30, t * 0.4) + r() * 10;
        this.obstacle('gap', X, w, 0);
        this.pickup('donut', X + w / 2, D.deck - 52);
        len = w;
      } else if (roll < 0.7 && t > 10) {
        this.obstacle('gull', X, 16, 14, D.gullY);
        for (let i = 0; i < 3; i++) this.pickup('donut', X + 40 + i * 20, D.deck - 8);
        len = 90;
      } else if (roll < 0.82 && t > 25) {
        this.obstacle('stack', X, 22, 42);
        this.pickup('ticket', X + 11, D.deck - 110);
        len = 22;
      } else if (roll < 0.92 && t > 40) {
        const gap2 = v * 0.8;
        this.obstacle('crate', X, 22, 22);
        if (t > 55 && r() < 0.5) this.obstacle('gull', X + gap2 + 30, 16, 14, D.gullY);
        else this.obstacle('crate', X + gap2, 22, 22);
        len = gap2 + 60;
      } else {
        for (let i = 0; i < 5; i++) this.pickup('donut', X + i * 22, D.deck - 12);
        if (r() < 0.4) this.pickup('ticket', X + 120, D.deck - 104);
        len = 110;
      }
      this.next = X + len + v * (0.95 + r() * 0.75 - Math.min(0.3, t / 300));
    }

    pop(x, y, txt) {
      const p = this.pops[this._popI++ % this.pops.length];
      p.t = 0;
      p.x = x;
      p.y = y;
      p.txt = txt;
    }

    /** The nearest gap under the runner (his middle well inside it), or null. */
    gapUnder(rx) {
      for (const o of this.obs) if (o.on && o.kind === 'gap' && rx > o.x + 3 && rx < o.x + o.w - 3) return o;
      return null;
    }

    hit(o) {
      if (this.over) return;
      if (o) {
        o.hit = true;
        o.ht = 0;
      }
      this.hearts--;
      this.hurt = 1.4;
      this.shake = 0.3;
      this.sfx('bump', { gain: 0.5 });
      if (this.hearts <= 0) this.end('GAME OVER');
    }

    end(word) {
      if (this.over) return;
      this.over = word;
      if (word === 'END OF THE PIER!') {
        this.bonus += 300 + this.hearts * 100;
        this.sfx('win', { gain: 0.6 });
      } else this.sfx('lose', { gain: 0.6 });
      this.score = Math.floor(this.dist / DASH.px) + this.bonus;
    }

    step(dt, I) {
      if (this.over) return;
      const D = DASH;
      this.t += dt;
      this.speed = D.v0 + D.dv * this.t;
      this.dist += this.speed * dt;
      if (this.t >= D.secs) return this.end('END OF THE PIER!');
      while (this.next < this.dist + W + 40) this.spawn();
      const rx = this.dist + D.x;
      this.hurt = Math.max(0, this.hurt - dt);
      this.shake = Math.max(0, this.shake - dt);
      // Jumping: a press on the ground (or just off it, or just before landing).
      if (I.aP) this.buffer = 0.12;
      else this.buffer = Math.max(0, this.buffer - dt);
      if (this.buffer > 0 && (this.ground || this.coyote > 0)) {
        this.vy = -D.jump;
        this.ground = false;
        this.coyote = 0;
        this.buffer = 0;
        this.held = 0;
        this.sfx('chip', { f: 520, f1: 900, len: 0.09 });
      }
      this.duck = this.ground && I.y < -0.5;
      // Over a gap the deck isn't there (unless he's still blinking from the last fall: then it's bridged).
      const gap = this.hurt > 0 ? null : this.gapUnder(rx);
      if (this.ground && gap) {
        this.ground = false;
        this.coyote = 0.07;
        this.vy = 0;
      }
      if (!this.ground) {
        this.coyote = Math.max(0, this.coyote - dt);
        let g = D.g;
        if (this.vy < 0 && I.a && this.held < D.holdT) {
          g *= D.holdG;
          this.held += dt;
        } else this.held = D.holdT;
        if (I.y < -0.5) g += D.dive;
        const y0 = this.y;
        this.vy += g * dt;
        this.y += this.vy * dt;
        if (this.vy >= 0 && y0 <= D.deck + 0.5 && this.y >= D.deck && !gap) {
          this.y = D.deck;
          this.vy = 0;
          this.ground = true;
        } else if (this.vy > 0 && this.hurt <= 0 && (this.y > D.deck + 30 || (this.y > D.deck + 2 && !gap))) {
          // Into the sea: a heart, and the lifeguard's spring flings him back up.
          this.splashes++;
          this.y = Math.min(this.y, D.deck + 30);
          this.vy = -560;
          this.sfx('splash', { gain: 0.5 });
          this.hit(null);
        }
      }
      // What's in his way.
      const top = this.y - (this.duck ? D.low : D.tall);
      for (const o of this.obs) {
        if (!o.on) continue;
        if (o.kind === 'gull' && !o.hit) o.x -= D.gullV * dt;
        if (o.hit) o.ht += dt;
        if (o.x + o.w < this.dist - 40 || o.ht > 1.2) {
          o.on = false;
          continue;
        }
        if (o.hit || this.hurt > 0 || o.kind === 'gap') continue;
        if (o.kind === 'gull') {
          if (Math.abs(o.x - rx) < 8 + D.half - 2 && o.y + 7 > top && o.y - 7 < this.y) this.hit(o);
        } else if (rx + D.half > o.x + 2 && rx - D.half < o.x + o.w - 2 && this.y > D.deck - o.h + 2) {
          this.knocks++;
          this.hit(o);
        }
      }
      for (const p of this.picks) {
        if (!p.on) continue;
        if (p.got) {
          p.gt += dt;
          if (p.gt > 0.4) p.on = false;
          continue;
        }
        if (p.x < this.dist - 20) {
          p.on = false;
          continue;
        }
        if (Math.abs(p.x - rx) < 10 && p.y > top - 6 && p.y < this.y + 4) {
          p.got = true;
          p.gt = 0;
          if (p.kind === 'ticket') {
            this.ticketsGot++;
            this.bonus += 50;
            this.pop(p.x - this.dist, p.y - 8, '+50');
            this.sfx('chip', { f: 880, f1: 1760, len: 0.18 });
          } else {
            this.donuts++;
            this.bonus += 5;
            this.pop(p.x - this.dist, p.y - 8, '+5');
            this.sfx('chip', { f: 1320, f1: 1600, len: 0.05 });
          }
        }
      }
      for (const p of this.pops) p.t += dt;
      this.score = Math.floor(this.dist / D.px) + this.bonus;
    }

    /** The attract mode's runner: jumps what's coming, ducks gulls. */
    demo(I) {
      clearIn();
      const rx = this.dist + DASH.x;
      let near = null, nd = 1e9;
      for (const o of this.obs) {
        if (!o.on || o.hit) continue;
        const dx = o.x - rx;
        if (dx > -o.w - 4 && dx < nd) {
          nd = dx;
          near = o;
        }
      }
      if (!near) return I;
      if (near.kind === 'gull') {
        if (nd < (this.speed + DASH.gullV) * 0.4 && nd > -14) I.y = -1;
      } else if (this.ground) {
        if (nd < this.speed * (near.kind === 'gap' ? 0.1 : 0.24) + 4 && nd > -4) {
          I.aP = true;
          I.a = true;
        }
      } else if (this.vy < 0) I.a = near.kind === 'stack' || near.kind === 'gap';
      return I;
    }

    draw(c) {
      const D = DASH, d = this.dist;
      c.save();
      if (this.shake > 0) c.translate(((this.t * 97) % 3) - 1, ((this.t * 61) % 3) - 1);
      if (!this._sky) {
        this._sky = c.createLinearGradient(0, 0, 0, 150);
        this._sky.addColorStop(0, '#6cc6ff');
        this._sky.addColorStop(1, '#ffe2b0');
      }
      c.fillStyle = this._sky;
      c.fillRect(-2, -2, W + 4, 154);
      c.fillStyle = '#fff3b0';
      c.beginPath();
      c.arc(262, 40, 15, 0, TAU);
      c.fill();
      const sky = dashSkyline(), sx = -((d * 0.12) % 512);
      c.drawImage(sky, sx, 82);
      c.drawImage(sky, sx + 512, 82);
      // The sea, glinting.
      c.fillStyle = '#2b8fd1';
      c.fillRect(-2, 150, W + 4, H - 150 + 2);
      c.fillStyle = '#bfe8ff';
      for (let i = 0; i < 16; i++) {
        const x = (((i * 53 - d * 0.35) % (W + 20)) + W + 20) % (W + 20) - 10;
        c.fillRect(x, 156 + ((i * 7) % 34), 6 + (i % 3) * 2, 1);
      }
      // The rail along the back of the deck.
      c.fillStyle = '#e9e2d0';
      c.fillRect(-2, D.deck - 16, W + 4, 2);
      for (let x = -(d % 48); x < W + 2; x += 48) c.fillRect(x, D.deck - 16, 2, 16);
      // The deck: planks going by.
      c.fillStyle = '#a8743f';
      c.fillRect(-2, D.deck, W + 4, H - D.deck + 2);
      c.fillStyle = '#c99358';
      c.fillRect(-2, D.deck, W + 4, 2);
      c.fillStyle = '#7a5029';
      for (let x = -(d % 18); x < W + 2; x += 18) c.fillRect(x, D.deck + 2, 1, H - D.deck);
      c.fillRect(-2, D.deck + 20, W + 4, 1);
      // The gaps: the sea through the planks.
      for (const o of this.obs) {
        if (!o.on || o.kind !== 'gap') continue;
        const x = o.x - d;
        c.fillStyle = '#1d6fa8';
        c.fillRect(x, D.deck, o.w, H - D.deck + 2);
        c.fillStyle = '#7fc8f0';
        for (let k = 0; k < o.w - 4; k += 8) c.fillRect(x + 2 + k, D.deck + 26 + (((k + this.t * 20) | 0) % 3), 5, 1);
        c.fillStyle = '#6b4a2a';
        c.fillRect(x - 2, D.deck, 2, 12);
        c.fillRect(x + o.w, D.deck, 2, 12);
      }
      // Crates, lobster pots, gulls (knocked ones tumble away).
      for (const o of this.obs) {
        if (!o.on || o.kind === 'gap') continue;
        const x = o.x - d + (o.hit ? o.ht * 160 : 0), lift = o.hit ? -o.ht * 120 + o.ht * o.ht * 400 : 0;
        if (o.kind === 'crate') {
          const y = D.deck - o.h + lift;
          c.fillStyle = '#c08a48';
          c.fillRect(x, y, o.w, o.h);
          c.fillStyle = '#8a5a28';
          c.fillRect(x, y, o.w, 2);
          c.fillRect(x, y + o.h - 2, o.w, 2);
          c.fillRect(x, y, 2, o.h);
          c.fillRect(x + o.w - 2, y, 2, o.h);
          for (let k = 0; k < o.w - 4; k += 2) {
            c.fillRect(x + 2 + k, y + 2 + k * ((o.h - 4) / (o.w - 4)), 2, 2);
            c.fillRect(x + o.w - 4 - k, y + 2 + k * ((o.h - 4) / (o.w - 4)), 2, 2);
          }
        } else if (o.kind === 'stack') {
          for (let k = 0; k < 2; k++) {
            const y = D.deck - (k + 1) * 21 + lift;
            c.fillStyle = '#e0503a';
            c.fillRect(x, y, o.w, 20);
            c.fillStyle = '#8a2a1c';
            for (let q = 3; q < o.w; q += 5) c.fillRect(x + q, y, 1, 20);
            c.fillRect(x, y + 9, o.w, 1);
            c.fillRect(x, y, o.w, 2);
          }
        } else if (o.kind === 'gull') {
          const y = o.y + lift, flap = Math.sin(this.t * 14 + o.x) > 0 ? -1 : 1;
          c.fillStyle = '#ffffff';
          c.fillRect(x - 8, y - 3, 14, 6);
          c.fillRect(x - 11, y - 4, 5, 5);
          c.fillStyle = '#ffa020';
          c.fillRect(x - 14, y - 2, 3, 2);
          c.fillStyle = '#111';
          c.fillRect(x - 9, y - 3, 1, 1);
          c.fillStyle = '#9aa4b0';
          c.beginPath();
          c.moveTo(x - 4, y - 1);
          c.lineTo(x + 2, y - 1);
          c.lineTo(x + 6, y + flap * 9 - 1);
          c.closePath();
          c.fill();
          c.fillRect(x + 6, y - 2, 4, 3);
        }
      }
      // Doughnuts and gold tickets.
      for (const p of this.picks) {
        if (!p.on) continue;
        const x = p.x - d, y = p.y - (p.got ? p.gt * 50 : 0);
        if (p.got && ((p.gt * 20) | 0) % 2) continue;
        if (p.kind === 'ticket') {
          c.fillStyle = '#ffd24a';
          c.fillRect(x - 7, y - 4, 14, 8);
          c.fillStyle = '#b8860b';
          c.fillRect(x - 5, y - 2, 10, 1);
          c.fillRect(x - 5, y + 1, 7, 1);
        } else {
          c.strokeStyle = '#ff7ab0';
          c.lineWidth = 3;
          c.beginPath();
          c.arc(x, y, 4, 0, TAU);
          c.stroke();
          c.fillStyle = '#fff';
          c.fillRect(x - 2, y - 5, 1, 1);
          c.fillRect(x + 3, y - 2, 1, 1);
        }
      }
      this.drawRunner(c);
      for (const p of this.pops) if (p.t < 0.7) label(c, p.txt, p.x, p.y - p.t * 30, 10, '#fff36a', 'center');
      c.restore();
      // Score, hearts, how far along the pier.
      label(c, 'SCORE ' + this.score, 8, 16, 12, '#ffffff');
      for (let i = 0; i < 3; i++) heart(c, W - 44 + i * 13, 7, i < this.hearts ? '#ff3d5c' : 'rgba(0,0,0,0.35)');
      c.fillStyle = 'rgba(0,0,0,0.35)';
      c.fillRect(110, 9, 100, 5);
      c.fillStyle = '#ffd24a';
      c.fillRect(110, 9, 100 * Math.min(1, this.t / D.secs), 5);
      c.fillStyle = '#fff';
      c.fillRect(208, 6, 2, 11);
    }

    drawRunner(c) {
      const D = DASH;
      if (this.hurt > 0 && ((this.hurt * 14) | 0) % 2) return;
      const x = D.x, y = this.y;
      const skin = '#f0c08a', cap = '#e0403a', shirt = '#37b8ff', shorts = '#24345a';
      if (this.duck) {
        // A slide: low and long.
        c.fillStyle = shorts;
        c.fillRect(x - 2, y - 6, 12, 5);
        c.fillStyle = shirt;
        c.fillRect(x - 9, y - 11, 11, 7);
        c.fillStyle = skin;
        c.fillRect(x - 14, y - 13, 6, 6);
        c.fillStyle = cap;
        c.fillRect(x - 15, y - 15, 7, 3);
        c.fillRect(x - 17, y - 13, 3, 1);
        c.fillStyle = '#fff';
        c.fillRect(x + 8, y - 3, 5, 3);
        return;
      }
      const run = this.ground ? Math.floor(this.dist / 14) % 2 : 2;
      c.fillStyle = shorts;
      if (run === 0) {
        c.fillRect(x - 4, y - 10, 3, 10);
        c.fillRect(x + 2, y - 10, 3, 6);
        c.fillRect(x + 4, y - 5, 4, 3);
      } else if (run === 1) {
        c.fillRect(x + 1, y - 10, 3, 10);
        c.fillRect(x - 4, y - 10, 3, 6);
        c.fillRect(x - 7, y - 5, 4, 3);
      } else {
        c.fillRect(x - 4, y - 10, 3, 6);
        c.fillRect(x + 2, y - 10, 3, 6);
      }
      c.fillStyle = '#fff';
      c.fillRect(x - 5, y - 2, 4, 2);
      c.fillRect(x + 2, y - 2, 4, 2);
      c.fillStyle = shirt;
      c.fillRect(x - 5, y - 19, 10, 10);
      c.fillStyle = skin;
      c.fillRect(x - 3, y - 26, 7, 7);
      c.fillRect(run === 2 ? x - 7 : x - 6, run === 2 ? y - 22 : y - 17, 2, 6);
      c.fillRect(x + 5, run === 2 ? y - 22 : y - 17, 2, 6);
      c.fillStyle = '#111';
      c.fillRect(x + 2, y - 24, 1, 2);
      c.fillStyle = cap;
      c.fillRect(x - 4, y - 28, 8, 3);
      c.fillRect(x + 3, y - 26, 4, 1);
    }
  }

  // =========================================================== SEAFRONT SPRINT
  // A top-down time trial: three laps of a seafront circuit on a 640 × 480 map, the screen following
  // the car. On the sand the car crawls; cones scatter (and slow it); the yellow arrows boost it.
  const SPRINT = {
    laps: 4,
    limit: 120, //         the flag comes down at two minutes whatever happens
    par: 120, //           seconds: every second under it is worth `perSec` at the finish
    perSec: 40,
    mapW: 800,
    mapH: 600,
    half: 20, //           the track's half width (px)
    accel: 170, //         px/s², and the rest of the car (px/s)
    brake: 320,
    vmax: 180,
    rev: 45,
    sand: 45,
    boost: 240,
    boostT: 1.1,
    turn: 2.6, //          rad/s at speed
    N: 360, //             centreline samples
    checks: 10, //         checkpoints a lap (20 points each), 150 a lap
  };
  // The circuit's corners (map px, drawn at 640 × 480 and scaled up), the start line between the last
  // and the first; built into a
  // smooth loop of N samples: TX, TY, and the way the track runs at each, TA.
  const SPRINT_PTS = [[480, 425], [300, 428], [150, 420], [80, 370], [70, 280], [95, 170], [160, 95], [260, 70], [330, 122], [400, 92], [500, 70], [575, 110], [588, 200], [520, 250], [430, 262], [402, 322], [470, 362], [572, 350], [598, 402]];
  const TX = new Float32Array(SPRINT.N), TY = new Float32Array(SPRINT.N), TA = new Float32Array(SPRINT.N);
  (function () {
    const P = SPRINT_PTS.map(([x, y]) => [x * 1.25, y * 1.25]), n = P.length, N = SPRINT.N;
    for (let i = 0; i < N; i++) {
      const f = (i / N) * n, k = Math.floor(f), t = f - k;
      const p0 = P[(k + n - 1) % n], p1 = P[k], p2 = P[(k + 1) % n], p3 = P[(k + 2) % n];
      const cr = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
      TX[i] = cr(p0[0], p1[0], p2[0], p3[0]);
      TY[i] = cr(p0[1], p1[1], p2[1], p3[1]);
    }
    for (let i = 0; i < N; i++) {
      const j = (i + 1) % N;
      TA[i] = Math.atan2(TY[j] - TY[i], TX[j] - TX[i]);
    }
  })();
  // Cones on the inside of the bends (sample, side: +1 right of the way the track runs), boost arrows.
  const CONES = [[44, 1], [50, 1], [70, -1], [76, -1], [118, 1], [124, 1], [160, -1], [166, -1], [214, 1], [222, 1], [262, -1], [268, -1], [300, 1], [306, 1]];
  const BOOSTS = [12, 136, 232];

  let sprintMap = null, sprintMini = null;
  /** The circuit, painted once: sand, the sea, the track with its kerbs, palms and beach huts. */
  function paintSprint() {
    if (sprintMap) return;
    const S = SPRINT;
    const cv = document.createElement('canvas');
    cv.width = S.mapW;
    cv.height = S.mapH;
    const c = cv.getContext('2d');
    const r = rng(11);
    c.fillStyle = '#ecd8a4';
    c.fillRect(0, 0, S.mapW, S.mapH);
    c.fillStyle = '#e2c98e';
    for (let i = 0; i < 900; i++) c.fillRect((r() * S.mapW) | 0, (r() * S.mapH) | 0, 2, 1);
    // The sea along the top and down the right, waves on it.
    c.fillStyle = '#3a9ad9';
    c.fillRect(0, 0, S.mapW, 44);
    c.fillRect(S.mapW - 22, 0, 22, S.mapH);
    c.fillStyle = '#bfe8ff';
    for (let i = 0; i < 80; i++) c.fillRect((r() * (S.mapW - 30)) | 0, 4 + ((r() * 32) | 0), 8, 1);
    c.fillStyle = '#fff6dc';
    c.fillRect(0, 44, S.mapW - 22, 3);
    // The infield's grass.
    c.fillStyle = '#8fcf6a';
    for (const [x, y, w, h] of [[190, 200, 150, 240], [360, 225, 110, 210], [550, 175, 125, 75], [575, 494, 88, 15]]) {
      c.beginPath();
      c.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, TAU);
      c.fill();
    }
    // The track: red and white kerbs, the tarmac, a dashed line down the middle.
    const path = () => {
      c.beginPath();
      c.moveTo(TX[0], TY[0]);
      for (let i = 1; i < S.N; i++) c.lineTo(TX[i], TY[i]);
      c.closePath();
    };
    c.lineJoin = 'round';
    path();
    c.lineWidth = S.half * 2 + 8;
    c.strokeStyle = '#e0403a';
    c.stroke();
    c.setLineDash([8, 8]);
    c.strokeStyle = '#ffffff';
    c.stroke();
    c.setLineDash([]);
    c.lineWidth = S.half * 2;
    c.strokeStyle = '#5c5a66';
    c.stroke();
    c.setLineDash([6, 10]);
    c.lineWidth = 1.5;
    c.strokeStyle = '#e8e8e8';
    c.stroke();
    c.setLineDash([]);
    // The start line: a chequered strip across the track at sample 0.
    c.save();
    c.translate(TX[0], TY[0]);
    c.rotate(TA[0]);
    for (let k = -5; k < 5; k++) for (let q = 0; q < 2; q++) {
      c.fillStyle = (k + q) % 2 ? '#111' : '#fff';
      c.fillRect(q * 4 - 4, k * 4, 4, 4);
    }
    c.restore();
    // Boost arrows.
    for (const i of BOOSTS) {
      c.save();
      c.translate(TX[i], TY[i]);
      c.rotate(TA[i]);
      c.fillStyle = '#ffd24a';
      for (let k = 0; k < 2; k++) {
        c.beginPath();
        c.moveTo(-6 + k * 7, -8);
        c.lineTo(1 + k * 7, 0);
        c.lineTo(-6 + k * 7, 8);
        c.lineTo(-3 + k * 7, 0);
        c.closePath();
        c.fill();
      }
      c.restore();
    }
    // Palms, beach huts, umbrellas, on the sand clear of the track.
    const clear = (x, y, m) => {
      for (let i = 0; i < S.N; i += 3) if (Math.hypot(TX[i] - x, TY[i] - y) < S.half + m) return false;
      return true;
    };
    for (let i = 0; i < 110; i++) {
      const x = 12 + r() * (S.mapW - 44), y = 56 + r() * (S.mapH - 68);
      if (!clear(x, y, 14)) continue;
      const k = r();
      if (k < 0.45) {
        c.fillStyle = '#7a5029';
        c.fillRect(x - 1, y - 1, 3, 3);
        c.fillStyle = '#2f9a48';
        for (let a = 0; a < 5; a++) {
          c.save();
          c.translate(x, y);
          c.rotate((a / 5) * TAU + k);
          c.fillRect(1, -1.5, 8, 3);
          c.restore();
        }
      } else if (k < 0.7) {
        const col = ['#ff7ab0', '#37b8ff', '#ffd24a', '#7dcf6a'][(r() * 4) | 0];
        c.fillStyle = col;
        c.fillRect(x - 6, y - 5, 12, 10);
        c.fillStyle = '#ffffff';
        c.fillRect(x - 6, y - 5, 12, 2);
        c.fillStyle = '#5a3a20';
        c.fillRect(x - 2, y + 1, 4, 4);
      } else {
        c.fillStyle = k < 0.85 ? '#e0403a' : '#37b8ff';
        c.beginPath();
        c.arc(x, y, 6, 0, TAU);
        c.fill();
        c.fillStyle = '#ffffff';
        c.beginPath();
        c.moveTo(x, y);
        c.arc(x, y, 6, 0, PI / 3);
        c.closePath();
        c.fill();
        c.beginPath();
        c.moveTo(x, y);
        c.arc(x, y, 6, PI, PI + PI / 3);
        c.closePath();
        c.fill();
      }
    }
    sprintMap = cv;
    // The little map in the corner.
    const m = document.createElement('canvas');
    m.width = 64;
    m.height = 48;
    const mc = m.getContext('2d');
    mc.fillStyle = 'rgba(10,6,24,0.6)';
    mc.fillRect(0, 0, 64, 48);
    mc.strokeStyle = '#ffffff';
    mc.lineWidth = 2;
    mc.beginPath();
    for (let i = 0; i <= S.N; i += 4) {
      const j = i % S.N;
      if (i === 0) mc.moveTo(TX[j] / 12.5, TY[j] / 12.5);
      else mc.lineTo(TX[j] / 12.5, TY[j] / 12.5);
    }
    mc.stroke();
    sprintMini = m;
  }

  class Sprint {
    constructor() {
      this.title = 'SEAFRONT SPRINT';
      this.ink = '#ff7ab0';
      this.cones = CONES.map(() => ({ x: 0, y: 0, vx: 0, vy: 0, spin: 0, hit: false }));
      this.dust = [];
      for (let i = 0; i < 24; i++) this.dust.push({ t: 9, x: 0, y: 0, vx: 0, vy: 0, sand: false });
      this._dustI = 0;
      this.lapTimes = [0, 0, 0];
      this.sfx = () => {};
      this.reset(1);
    }

    reset() {
      const S = SPRINT, N = S.N;
      // On the grid, just behind the line.
      const i0 = N - 3;
      this.x = TX[i0];
      this.y = TY[i0];
      this.a = TA[i0];
      this.v = 0;
      this.idx = i0;
      this.prog = i0 - N; // samples past the line (laps × N when they're done)
      this.best = 0; //      the furthest prog so far (checkpoints count once)
      this.off = 0;
      this.lost = false;
      this.boostT = 0;
      this.t = 0;
      this.lap = 0;
      this.lapStart = 0;
      this.lapTimes[0] = this.lapTimes[1] = this.lapTimes[2] = 0;
      this.checks = 0;
      this.coneHits = 0;
      this.bonus = 0;
      this.score = 0;
      this.over = null;
      this.flash = 0;
      this.flashTxt = '';
      this.camX = this.x;
      this.camY = this.y;
      CONES.forEach(([i, side], k) => {
        const C = this.cones[k], s = side * (S.half - 5);
        C.x = TX[i] - Math.sin(TA[i]) * s;
        C.y = TY[i] + Math.cos(TA[i]) * s;
        C.vx = C.vy = C.spin = 0;
        C.hit = false;
      });
      for (const d of this.dust) d.t = 9;
    }

    line() {
      if (this.over === 'FINISHED!') {
        const best = Math.min(this.lapTimes[0], this.lapTimes[1], this.lapTimes[2]);
        return 'finished in ' + this.t.toFixed(1) + ' s, best lap ' + best.toFixed(1) + ' s';
      }
      return this.lap + (this.lap === 1 ? ' lap' : ' laps') + ' of ' + SPRINT.laps;
    }

    say(txt) {
      this.flash = 1.6;
      this.flashTxt = txt;
    }

    puff(sand) {
      const d = this.dust[this._dustI++ % this.dust.length];
      d.t = 0;
      d.x = this.x - Math.cos(this.a) * 7;
      d.y = this.y - Math.sin(this.a) * 7;
      d.vx = -Math.cos(this.a) * 20 + (Math.random() - 0.5) * 20;
      d.vy = -Math.sin(this.a) * 20 + (Math.random() - 0.5) * 20;
      d.sand = sand;
    }

    step(dt, I) {
      if (this.over) return;
      const S = SPRINT, N = S.N;
      this.t += dt;
      this.flash = Math.max(0, this.flash - dt);
      if (this.t >= S.limit) return this.finish('TIME UP!');
      // Where the car is on the circuit (looking near where it was; further if it's lost).
      const win = this.lost ? 40 : 10;
      let bi = this.idx, bd = 1e12;
      for (let k = -win; k <= win; k++) {
        const i = (this.idx + k + N) % N, dx = TX[i] - this.x, dy = TY[i] - this.y, d2 = dx * dx + dy * dy;
        if (d2 < bd) {
          bd = d2;
          bi = i;
        }
      }
      const far = (S.half + 45) * (S.half + 45);
      if (bd < far) {
        let di = bi - this.idx;
        if (di > N / 2) di -= N;
        if (di < -N / 2) di += N;
        this.prog += di;
        this.idx = bi;
        this.lost = false;
      } else this.lost = true;
      this.off = Math.sqrt(bd);
      // Checkpoints and laps (each counts once, going forwards).
      if (this.prog > this.best) {
        const cp = N / S.checks;
        while (Math.floor(this.prog / cp) > Math.floor(this.best / cp) && this.prog > 0) {
          this.best = (Math.floor(this.best / cp) + 1) * cp;
          this.checks++;
          this.bonus += 20;
          if (this.best % N === 0) {
            this.lapTimes[this.lap] = this.t - this.lapStart;
            this.lap++;
            this.lapStart = this.t;
            this.bonus += 150;
            if (this.lap >= S.laps) return this.finish('FINISHED!');
            this.say(this.lap === S.laps - 1 ? 'FINAL LAP!' : 'LAP ' + (this.lap + 1));
            this.sfx('chip', { f: 660, f1: 1320, len: 0.25 });
          } else this.sfx('chip', { f: 990, len: 0.04, gain: 0.6 });
        }
        this.best = Math.max(this.best, this.prog);
      }
      // The car: throttle (up, or the button), brake / reverse (down), steering.
      const sand = this.off > S.half + 3;
      this.boostT = Math.max(0, this.boostT - dt);
      const vmax = this.boostT > 0 ? S.boost : sand ? S.sand : S.vmax;
      const thr = I.y > 0.3 || I.a, brk = I.y < -0.3;
      if (brk) this.v -= (this.v > 0 ? S.brake : S.accel * 0.6) * dt;
      else if (thr) this.v += S.accel * (this.boostT > 0 ? 2 : 1) * dt;
      else this.v -= Math.sign(this.v) * Math.min(Math.abs(this.v), 40 * dt);
      if (this.v > vmax) this.v = Math.max(vmax, this.v - (sand ? 260 : 120) * dt);
      if (this.v < -S.rev) this.v = -S.rev;
      const grip = clamp(Math.abs(this.v) / 50, 0, 1) * (this.v >= 0 ? 1 : -1);
      this.a += I.x * S.turn * grip * dt;
      this.x += Math.cos(this.a) * this.v * dt;
      this.y += Math.sin(this.a) * this.v * dt;
      if (this.x < 8 || this.x > S.mapW - 30 || this.y < 52 || this.y > S.mapH - 8) {
        this.x = clamp(this.x, 8, S.mapW - 30);
        this.y = clamp(this.y, 52, S.mapH - 8);
        this.v *= 0.5;
      }
      if ((sand && Math.abs(this.v) > 20 && Math.random() < 0.5) || (Math.abs(I.x) > 0.5 && this.v > 120 && Math.random() < 0.3)) this.puff(sand);
      // Boost arrows.
      for (const i of BOOSTS) {
        if (this.boostT < 0.9 && Math.abs(TX[i] - this.x) < 12 && Math.abs(TY[i] - this.y) < 12) {
          this.boostT = S.boostT;
          this.sfx('whoosh', { gain: 0.25 });
        }
      }
      // Cones.
      for (const C of this.cones) {
        if (C.hit) {
          C.x += C.vx * dt;
          C.y += C.vy * dt;
          C.vx *= 1 - 2.5 * dt;
          C.vy *= 1 - 2.5 * dt;
          C.spin += C.vx * dt * 0.2;
          continue;
        }
        if (Math.abs(C.x - this.x) < 7 && Math.abs(C.y - this.y) < 7) {
          C.hit = true;
          C.vx = Math.cos(this.a) * this.v * 1.3 + (Math.random() - 0.5) * 60;
          C.vy = Math.sin(this.a) * this.v * 1.3 + (Math.random() - 0.5) * 60;
          this.v *= 0.6;
          this.coneHits++;
          this.sfx('bump', { gain: 0.3 });
        }
      }
      for (const d of this.dust) if (d.t < 1) {
        d.t += dt;
        d.x += d.vx * dt;
        d.y += d.vy * dt;
      }
      this.score = this.bonus;
    }

    finish(word) {
      if (this.over) return;
      this.over = word;
      if (word === 'FINISHED!') {
        this.bonus += Math.max(0, Math.round((SPRINT.par - this.t) * SPRINT.perSec));
        this.sfx('win', { gain: 0.6 });
      } else this.sfx('lose', { gain: 0.6 });
      this.score = this.bonus;
    }

    /** A driver: aims at a point further round the circuit, lifts and brakes for the bends. */
    drive(I, look, care) {
      clearIn();
      const N = SPRINT.N;
      const j = (this.idx + Math.round(look + this.v / 14)) % N;
      let want = Math.atan2(TY[j] - this.y, TX[j] - this.x) - this.a;
      want = Math.atan2(Math.sin(want), Math.cos(want));
      I.x = clamp(want * 2.6, -1, 1);
      // How sharp the bend ahead is.
      const k = (this.idx + 16 + Math.round(this.v / 8)) % N;
      let bend = TA[k] - TA[this.idx];
      bend = Math.abs(Math.atan2(Math.sin(bend), Math.cos(bend)));
      const safe = SPRINT.vmax * (1 - care * clamp(bend - 0.35, 0, 1.6) / 1.6);
      if (this.v > safe + 15) I.y = -1;
      else if (this.v < safe) I.y = 1;
      return I;
    }

    demo(I) {
      return this.drive(I, 6, 0.4);
    }

    draw(c) {
      paintSprint();
      const S = SPRINT;
      // The camera runs a little ahead of the car.
      const lx = this.x + Math.cos(this.a) * this.v * 0.35, ly = this.y + Math.sin(this.a) * this.v * 0.35;
      this.camX += (lx - this.camX) * 0.12;
      this.camY += (ly - this.camY) * 0.12;
      const cx = Math.round(clamp(this.camX, W / 2, S.mapW - W / 2)), cy = Math.round(clamp(this.camY, H / 2, S.mapH - H / 2));
      const ox = cx - W / 2, oy = cy - H / 2;
      c.drawImage(sprintMap, ox, oy, W, H, 0, 0, W, H);
      for (const d of this.dust) {
        if (d.t >= 0.6) continue;
        c.globalAlpha = d.sand ? 0.8 - d.t : 0.6 - d.t;
        c.fillStyle = d.sand ? '#d6be82' : '#dcdce6';
        const s = 2 + d.t * 6;
        c.fillRect(d.x - ox - s / 2, d.y - oy - s / 2, s, s);
      }
      c.globalAlpha = 1;
      for (const C of this.cones) {
        const x = C.x - ox, y = C.y - oy;
        if (x < -8 || x > W + 8 || y < -8 || y > H + 8) continue;
        c.save();
        c.translate(x, y);
        c.rotate(C.spin);
        c.fillStyle = '#ff7a1c';
        c.fillRect(-3, -3, 6, 6);
        c.fillStyle = '#ffffff';
        c.fillRect(-3, -1, 6, 2);
        c.restore();
      }
      // The car.
      c.save();
      c.translate(this.x - ox, this.y - oy);
      c.rotate(this.a);
      c.fillStyle = 'rgba(0,0,0,0.3)';
      c.fillRect(-7, -3, 16, 9);
      c.fillStyle = '#111';
      c.fillRect(-6, -6, 4, 2);
      c.fillRect(3, -6, 4, 2);
      c.fillRect(-6, 4, 4, 2);
      c.fillRect(3, 4, 4, 2);
      c.fillStyle = this.boostT > 0 && ((this.t * 16) | 0) % 2 ? '#ffd24a' : '#e0403a';
      c.fillRect(-8, -4, 16, 8);
      c.fillStyle = '#ffffff';
      c.fillRect(-8, -1, 16, 2);
      c.fillStyle = '#9fe6ff';
      c.fillRect(1, -3, 3, 6);
      c.restore();
      // Lost: an arrow back to the track.
      if (this.lost && ((this.t * 3) | 0) % 2) {
        const a = Math.atan2(TY[this.idx] - this.y, TX[this.idx] - this.x);
        c.save();
        c.translate(this.x - ox + Math.cos(a) * 18, this.y - oy + Math.sin(a) * 18);
        c.rotate(a);
        c.fillStyle = '#ffd24a';
        c.beginPath();
        c.moveTo(6, 0);
        c.lineTo(-4, -5);
        c.lineTo(-4, 5);
        c.closePath();
        c.fill();
        c.restore();
        label(c, 'BACK TO THE TRACK!', W / 2, 200, 12, '#ffd24a', 'center');
      }
      // Lap, time, the little map.
      label(c, 'LAP ' + Math.min(S.laps, this.lap + 1) + '/' + S.laps, 8, 16, 12, '#ffffff');
      const m = Math.floor(this.t / 60), sec = this.t - m * 60;
      label(c, m + ':' + (sec < 10 ? '0' : '') + sec.toFixed(1), W - 8, 16, 12, '#ffffff', 'right');
      if (this.lap > 0) label(c, 'LAST ' + this.lapTimes[this.lap - 1].toFixed(1), W - 8, 30, 10, '#cfc6ff', 'right');
      c.drawImage(sprintMini, W - 70, H - 54);
      c.fillStyle = '#ff3d5c';
      c.fillRect(W - 70 + this.x / 12.5 - 2, H - 54 + this.y / 12.5 - 2, 4, 4);
      // Speed.
      c.fillStyle = 'rgba(0,0,0,0.4)';
      c.fillRect(8, H - 14, 60, 6);
      c.fillStyle = this.boostT > 0 ? '#ffd24a' : '#7dff9a';
      c.fillRect(8, H - 14, (60 * clamp(this.v, 0, S.boost)) / S.boost, 6);
      if (this.flash > 0) label(c, this.flashTxt, W / 2, 70, 18, this.ink, 'center');
      if (this.t < 1.2) label(c, 'GO!', W / 2, 70, 22, '#7dff9a', 'center');
    }
  }

  // =============================================================== BUBBLE SUB
  // A little yellow submarine along the sea bed, blowing bubbles up at what comes down: shoals of
  // sardines swaying past (10), jellyfish that hover and drop ink (25), puffers that swell with every
  // hit (40); a starfish now and then for a triple blower. At 68 s the Big Angler comes down for a
  // fight. Three subs; 100 seconds; beat the Angler for a bonus.
  const SUB = {
    secs: 100,
    boss: 68, //          when the Big Angler turns up
    y0: 170, //           the sub's top and bottom limits, its start
    y1: 222,
    speed: 150,
    fire: 0.16, //        seconds between bubbles
    bubbleV: 270,
    lives: 3,
    bossHp: 44,
  };

  class Sub {
    constructor() {
      this.title = 'BUBBLE SUB';
      this.ink = '#7dff9a';
      this.bubbles = [];
      for (let i = 0; i < 24; i++) this.bubbles.push({ on: false, x: 0, y: 0, vx: 0 });
      this.fish = [];
      for (let i = 0; i < 40; i++) this.fish.push({ on: false, kind: '', x: 0, y: 0, x0: 0, vx: 0, vy: 0, hp: 0, t: 0, ph: 0, amp: 0, stop: 0, shot: 0, flash: 0 });
      this.blobs = [];
      for (let i = 0; i < 30; i++) this.blobs.push({ on: false, x: 0, y: 0, vx: 0, vy: 0 });
      this.pops = [];
      for (let i = 0; i < 12; i++) this.pops.push({ t: 9, x: 0, y: 0, txt: '', big: false });
      this._popI = 0;
      this.events = []; // [t, kind, x, n] the run's script
      this.star = { on: false, x: 0, y: 0, t: 0 };
      this.boss = { on: false, x: 160, y: -40, hp: 0, t: 0, shot: 0, flash: 0, spawn: 0 };
      this.sfx = () => {};
      this._bg = null;
      this.reset(1);
    }

    reset(seed) {
      const r = (this.rnd = rng(seed));
      this.t = 0;
      this.x = W / 2;
      this.y = 212;
      this.lives = SUB.lives;
      this.hurt = 0;
      this.reload = 0;
      this.triple = 0;
      this.score = 0;
      this.over = null;
      this.kills = 0;
      this.shots = 0;
      this.beat = false;
      for (const b of this.bubbles) b.on = false;
      for (const f of this.fish) f.on = false;
      for (const b of this.blobs) b.on = false;
      for (const p of this.pops) p.t = 9;
      this.star.on = false;
      this.boss.on = false;
      this.boss.hp = 0;
      // The script: shoals all the way, jellyfish from 8 s, puffers from 20 s, closer together later.
      const E = (this.events.length = 0, this.events);
      let t = 1.2;
      while (t < SUB.boss - 2.5) {
        const k = t / SUB.boss, roll = r();
        if (t > 20 && roll < 0.22) E.push([t, 'puffer', 40 + r() * 240, 1]);
        else if (t > 8 && roll < 0.45) E.push([t, 'jelly', 40 + r() * 240, 1]);
        else E.push([t, 'shoal', 50 + r() * 220, 4 + Math.round(k * 2)]);
        t += 2.5 - 1.1 * k + r() * 0.7;
      }
      E.push([22, 'star', 60 + r() * 200, 1], [48, 'star', 60 + r() * 200, 1], [SUB.boss, 'boss', 160, 1]);
      E.sort((a, b) => a[0] - b[0]);
      this.ev = 0;
    }

    line() {
      const bits = [this.kills + (this.kills === 1 ? ' fish' : ' fish') + ' bubbled'];
      if (this.beat) bits.push('the Big Angler beaten');
      return bits.join(', ');
    }

    fishOf(kind, x, y) {
      const f = this.fish.find((q) => !q.on);
      if (!f) return null;
      f.on = true;
      f.kind = kind;
      f.x = f.x0 = x;
      f.y = y;
      f.vx = f.vy = 0;
      f.t = 0;
      f.ph = 0;
      f.amp = 0;
      f.flash = 0;
      f.shot = 1 + this.rnd() * 1.5;
      f.hp = kind === 'puffer' ? 3 : kind === 'jelly' ? 2 : 1;
      return f;
    }

    blob(x, y, vx, vy) {
      const b = this.blobs.find((q) => !q.on);
      if (!b) return;
      b.on = true;
      b.x = x;
      b.y = y;
      b.vx = vx;
      b.vy = vy;
    }

    pop(x, y, txt, big) {
      const p = this.pops[this._popI++ % this.pops.length];
      p.t = 0;
      p.x = x;
      p.y = y;
      p.txt = txt;
      p.big = !!big;
    }

    radius(f) {
      return f.kind === 'puffer' ? 8 + (3 - f.hp) * 3 : f.kind === 'jelly' ? 9 : 6;
    }

    hitSub() {
      if (this.hurt > 0 || this.over) return;
      this.lives--;
      this.hurt = 1.8;
      this.sfx('bump', { gain: 0.5 });
      if (this.lives <= 0) this.end('GAME OVER');
    }

    end(word) {
      if (this.over) return;
      this.over = word;
      if (word === 'YOU WIN!') {
        this.score += 500 + this.lives * 150 + Math.round((SUB.secs - this.t) * 5);
        this.sfx('win', { gain: 0.6 });
      } else this.sfx('lose', { gain: 0.6 });
    }

    step(dt, I) {
      if (this.over) return;
      const r = this.rnd;
      this.t += dt;
      if (this.t >= SUB.secs) return this.end('TIME UP!');
      // The script.
      while (this.ev < this.events.length && this.events[this.ev][0] <= this.t) {
        const [, kind, x, n] = this.events[this.ev++];
        const k = this.t / SUB.boss;
        if (kind === 'shoal') {
          for (let i = 0; i < n; i++) {
            const f = this.fishOf('sardine', x, -8 - i * 15);
            if (!f) break;
            f.vy = 44 + 22 * k;
            f.amp = 30 + r() * 30;
            f.ph = i * 0.55;
            f.stop = 110 + r() * 50 + k * 20;
            f.vx = x < W / 2 ? 60 : -60;
          }
        } else if (kind === 'jelly') {
          const f = this.fishOf('jelly', x, -14);
          if (f) {
            f.vy = 26;
            f.stop = 55 + r() * 55;
          }
        } else if (kind === 'puffer') {
          const f = this.fishOf('puffer', x, -12);
          if (f) {
            f.vy = 22 + 12 * k;
            f.vx = r() < 0.5 ? -40 : 40;
          }
        } else if (kind === 'star') {
          const S = this.star;
          S.on = true;
          S.x = x;
          S.y = -8;
          S.t = 0;
        } else if (kind === 'boss') {
          const B = this.boss;
          B.on = true;
          B.x = 160;
          B.y = -40;
          B.hp = SUB.bossHp;
          B.t = 0;
          B.shot = 2;
          B.flash = 0;
          B.spawn = 4;
          this.sfx('klaxon', { gain: 0.35 });
        }
      }
      // The sub.
      this.hurt = Math.max(0, this.hurt - dt);
      this.triple = Math.max(0, this.triple - dt);
      this.x = clamp(this.x + I.x * SUB.speed * dt, 14, W - 14);
      this.y = clamp(this.y - I.y * SUB.speed * 0.6 * dt, SUB.y0, SUB.y1);
      this.reload -= dt;
      if (I.a && this.reload <= 0) {
        this.reload = SUB.fire;
        for (let k = this.triple > 0 ? -1 : 0; k <= (this.triple > 0 ? 1 : 0); k++) {
          const b = this.bubbles.find((q) => !q.on);
          if (!b) break;
          b.on = true;
          b.x = this.x + 2;
          b.y = this.y - 12;
          b.vx = k * 70;
        }
        this.shots++;
        this.sfx('chip', { f: 300, f1: 700, len: 0.06, gain: 0.5 });
      }
      for (const b of this.bubbles) {
        if (!b.on) continue;
        b.y -= SUB.bubbleV * dt;
        b.x += b.vx * dt;
        if (b.y < -6 || b.x < -6 || b.x > W + 6) b.on = false;
      }
      // The fish.
      for (const f of this.fish) {
        if (!f.on) continue;
        f.t += dt;
        f.flash = Math.max(0, f.flash - dt);
        if (f.kind === 'sardine') {
          // Down to their turn, then away to the side, sinking slowly.
          if (f.y < f.stop) f.y += f.vy * dt;
          else {
            f.y += f.vy * 0.12 * dt;
            f.x0 += f.vx * dt;
          }
          f.x = f.x0 + Math.sin(f.t * 1.8 + f.ph) * f.amp;
          if (f.x < -24 || f.x > W + 24) f.on = false;
        } else if (f.kind === 'jelly') {
          if (f.t < 12) {
            if (f.y < f.stop) f.y += f.vy * dt;
            f.x = clamp(f.x0 + Math.sin(f.t * 0.9) * 50, 12, W - 12);
            f.shot -= dt;
            if (f.shot <= 0 && f.y > 20) {
              f.shot = 2.4;
              this.blob(f.x, f.y + 8, 0, 80);
            }
          } else f.y -= 30 * dt;
        } else if (f.kind === 'puffer') {
          f.y += f.vy * dt;
          f.x += f.vx * dt;
          if ((f.x < 16 && f.vx < 0) || (f.x > W - 16 && f.vx > 0)) f.vx = -f.vx;
        }
        if (!f.on || f.y > H + 16 || f.y < -60) {
          f.on = false;
          continue;
        }
        const R = this.radius(f);
        for (const b of this.bubbles) {
          if (!b.on || Math.abs(b.x - f.x) > R + 3 || Math.abs(b.y - f.y) > R + 3) continue;
          b.on = false;
          f.hp--;
          f.flash = 0.12;
          if (f.hp <= 0) {
            const pts = f.kind === 'puffer' ? 40 : f.kind === 'jelly' ? 25 : 10;
            this.score += pts;
            this.kills++;
            this.pop(f.x, f.y, '+' + pts);
            f.on = false;
            this.sfx('pop', { gain: 0.4 });
            break;
          } else this.sfx('chip', { f: 200, len: 0.05, gain: 0.5 });
        }
        if (f.on && Math.abs(f.x - this.x) < R + 9 && Math.abs(f.y - this.y) < R + 5) {
          this.hitSub();
          if (f.kind === 'sardine') f.on = false;
        }
      }
      // The Big Angler.
      const B = this.boss;
      if (B.on) {
        B.t += dt;
        B.flash = Math.max(0, B.flash - dt);
        B.y = Math.min(52, -40 + B.t * 46);
        B.x = 160 + Math.sin(B.t * 0.7) * 110;
        B.shot -= dt;
        if (B.shot <= 0 && B.y >= 52) {
          B.shot = 1.0 + 0.6 * (B.hp / SUB.bossHp);
          const a = Math.atan2(this.y - (B.y + 10), this.x - B.x);
          for (let k = -1; k <= 1; k++) this.blob(B.x, B.y + 10, Math.cos(a + k * 0.3) * 95, Math.sin(a + k * 0.3) * 95);
          this.sfx('chip', { f: 160, f1: 90, len: 0.15, gain: 0.6 });
        }
        B.spawn -= dt;
        if (B.spawn <= 0 && B.y >= 52) {
          B.spawn = 6;
          for (let i = 0; i < 3; i++) {
            const f = this.fishOf('sardine', B.x, B.y + 12 + i * 12);
            if (!f) break;
            f.vy = 60;
            f.amp = 30;
            f.ph = i;
            f.stop = 140;
            f.vx = B.x < W / 2 ? 60 : -60;
          }
        }
        for (const b of this.bubbles) {
          if (!b.on || Math.abs(b.x - B.x) > 32 || Math.abs(b.y - B.y) > 18) continue;
          b.on = false;
          B.hp--;
          B.flash = 0.1;
          this.score += 5;
          this.sfx('chip', { f: 240, len: 0.04, gain: 0.5 });
          if (B.hp <= 0) {
            B.on = false;
            this.beat = true;
            this.pop(B.x, B.y, '+500', true);
            this.sfx('cheer', { gain: 0.5 });
            return this.end('YOU WIN!');
          }
        }
        if (Math.abs(B.x - this.x) < 40 && Math.abs(B.y - this.y) < 26) this.hitSub();
      }
      // Ink.
      for (const b of this.blobs) {
        if (!b.on) continue;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        if (b.y > H + 6 || b.y < -6 || b.x < -6 || b.x > W + 6) {
          b.on = false;
          continue;
        }
        if (Math.abs(b.x - this.x) < 12 && Math.abs(b.y - this.y) < 7) {
          b.on = false;
          this.hitSub();
        }
      }
      // The starfish: a triple blower for nine seconds.
      const S = this.star;
      if (S.on) {
        S.t += dt;
        S.y += 40 * dt;
        S.x += Math.sin(S.t * 2) * 20 * dt;
        if (S.y > H + 10) S.on = false;
        else if (Math.abs(S.x - this.x) < 14 && Math.abs(S.y - this.y) < 12) {
          S.on = false;
          this.triple = 9;
          this.pop(this.x, this.y - 20, 'TRIPLE!', true);
          this.sfx('chip', { f: 660, f1: 1760, len: 0.3 });
        }
      }
      for (const p of this.pops) p.t += dt;
    }

    /** The attract mode's captain: under the lowest fish, out from under falling ink, always blowing. */
    demo(I) {
      clearIn();
      I.a = true;
      let tx = this.x, best = -1e9;
      for (const f of this.fish) if (f.on && f.y > best && f.y < this.y - 20) {
        best = f.y;
        tx = f.x;
      }
      if (this.boss.on) tx = this.boss.x;
      if (this.star.on) tx = this.star.x;
      for (const b of this.blobs) if (b.on && b.y > this.y - 60 && b.y < this.y + 4 && Math.abs(b.x - this.x) < 18) tx = this.x + (b.x > this.x ? -40 : 40);
      I.x = clamp((tx - this.x) / 12, -1, 1);
      return I;
    }

    draw(c) {
      if (!this._bg) {
        this._bg = c.createLinearGradient(0, 0, 0, H);
        this._bg.addColorStop(0, '#1e7fb8');
        this._bg.addColorStop(1, '#062a4a');
      }
      c.fillStyle = this._bg;
      c.fillRect(0, 0, W, H);
      // Sunbeams, sea-bed bubbles, the sand and the weed.
      c.fillStyle = 'rgba(255,255,255,0.06)';
      for (let k = 0; k < 3; k++) {
        const x = 50 + k * 110 + Math.sin(this.t * 0.4 + k) * 20;
        c.beginPath();
        c.moveTo(x, 0);
        c.lineTo(x + 30, 0);
        c.lineTo(x + 70, H);
        c.lineTo(x + 20, H);
        c.closePath();
        c.fill();
      }
      c.fillStyle = 'rgba(200,240,255,0.35)';
      for (let i = 0; i < 12; i++) {
        const y = H - ((this.t * (20 + i * 3) + i * 37) % (H + 10));
        c.fillRect((i * 29 + Math.sin(this.t + i) * 4) % W, y, 2, 2);
      }
      c.fillStyle = '#c9a96a';
      c.fillRect(0, H - 12, W, 12);
      c.fillStyle = '#a88a52';
      for (let x = 3; x < W; x += 11) c.fillRect(x, H - 8 + (x % 3), 2, 1);
      c.strokeStyle = '#2f9a48';
      c.lineWidth = 2;
      for (let k = 0; k < 7; k++) {
        const x = 18 + k * 46;
        c.beginPath();
        c.moveTo(x, H - 10);
        for (let s = 1; s <= 4; s++) c.lineTo(x + Math.sin(this.t * 1.5 + k + s) * 3 * s * 0.5, H - 10 - s * 7);
        c.stroke();
      }
      // The starfish.
      const S = this.star;
      if (S.on) {
        c.fillStyle = '#ff9a3c';
        for (let k = 0; k < 5; k++) {
          const a = S.t * 2 + (k * TAU) / 5;
          c.fillRect(S.x + Math.cos(a) * 5 - 2, S.y + Math.sin(a) * 5 - 2, 4, 4);
        }
        c.fillRect(S.x - 3, S.y - 3, 6, 6);
      }
      // Fish.
      for (const f of this.fish) {
        if (!f.on) continue;
        const R = this.radius(f), white = f.flash > 0;
        if (f.kind === 'sardine') {
          const dir = f.y >= f.stop ? (f.vx > 0 ? 1 : -1) : Math.cos(f.t * 1.8 + f.ph) >= 0 ? 1 : -1;
          c.fillStyle = white ? '#fff' : '#c9d6e3';
          c.fillRect(f.x - 5, f.y - 2, 10, 4);
          c.fillStyle = white ? '#fff' : '#8fa3b8';
          c.fillRect(f.x - dir * 8, f.y - 3, 3, 6);
          c.fillStyle = '#111';
          c.fillRect(f.x + dir * 3, f.y - 1, 1, 1);
        } else if (f.kind === 'jelly') {
          c.fillStyle = white ? '#fff' : '#ff7ab0';
          c.beginPath();
          c.arc(f.x, f.y, R, PI, TAU);
          c.fill();
          c.strokeStyle = white ? '#fff' : '#ffb3d1';
          c.lineWidth = 1;
          for (let k = -1.5; k <= 1.5; k++) {
            c.beginPath();
            c.moveTo(f.x + k * 4, f.y);
            c.lineTo(f.x + k * 4 + Math.sin(f.t * 4 + k) * 2, f.y + 6);
            c.lineTo(f.x + k * 4 - Math.sin(f.t * 4 + k) * 2, f.y + 12);
            c.stroke();
          }
          c.fillStyle = '#111';
          c.fillRect(f.x - 3, f.y - 4, 1, 2);
          c.fillRect(f.x + 2, f.y - 4, 1, 2);
        } else {
          c.fillStyle = white ? '#fff' : '#ffd24a';
          c.beginPath();
          c.arc(f.x, f.y, R, 0, TAU);
          c.fill();
          c.fillStyle = white ? '#fff' : '#c99a1c';
          for (let k = 0; k < 8; k++) {
            const a = (k * TAU) / 8 + f.t;
            c.fillRect(f.x + Math.cos(a) * (R + 2) - 1, f.y + Math.sin(a) * (R + 2) - 1, 2, 2);
          }
          c.fillStyle = '#111';
          c.fillRect(f.x - 3, f.y - 2, 2, 2);
          c.fillRect(f.x + 2, f.y - 2, 2, 2);
        }
      }
      // The Big Angler: a dark round fish with a glowing lure and a toothy grin (more silly than scary).
      const B = this.boss;
      if (B.on) {
        const white = B.flash > 0;
        c.fillStyle = white ? '#fff' : '#5a3a8a';
        c.beginPath();
        c.ellipse(B.x, B.y, 34, 20, 0, 0, TAU);
        c.fill();
        c.fillStyle = white ? '#fff' : '#3a2360';
        c.beginPath();
        c.moveTo(B.x + 30, B.y);
        c.lineTo(B.x + 44, B.y - 12);
        c.lineTo(B.x + 44, B.y + 12);
        c.closePath();
        c.fill();
        c.fillStyle = '#1a0f2e';
        c.fillRect(B.x - 30, B.y + 2, 26, 8);
        c.fillStyle = '#ffffff';
        for (let k = 0; k < 6; k++) c.fillRect(B.x - 29 + k * 4, B.y + 2, 2, 3);
        c.fillStyle = '#fff36a';
        c.fillRect(B.x - 14, B.y - 10, 6, 6);
        c.fillStyle = '#111';
        c.fillRect(B.x - 12, B.y - 8, 3, 3);
        c.strokeStyle = '#3a2360';
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(B.x - 6, B.y - 18);
        c.quadraticCurveTo(B.x - 20, B.y - 40, B.x - 34, B.y - 22);
        c.stroke();
        c.fillStyle = ((B.t * 6) | 0) % 2 ? '#fff36a' : '#ffffff';
        c.beginPath();
        c.arc(B.x - 34, B.y - 20, 4, 0, TAU);
        c.fill();
        c.fillStyle = 'rgba(0,0,0,0.5)';
        c.fillRect(80, 24, 160, 5);
        c.fillStyle = '#ff3d5c';
        c.fillRect(80, 24, (160 * B.hp) / SUB.bossHp, 5);
        label(c, 'THE BIG ANGLER', W / 2, 40, 9, '#ffffff', 'center');
      }
      // Ink, bubbles, the sub.
      c.fillStyle = '#2a0f3a';
      for (const b of this.blobs) if (b.on) c.fillRect(b.x - 3, b.y - 3, 6, 6);
      c.fillStyle = '#b45cff';
      for (const b of this.blobs) if (b.on) c.fillRect(b.x - 2, b.y - 2, 2, 2);
      c.strokeStyle = '#e8fbff';
      c.lineWidth = 1;
      for (const b of this.bubbles) {
        if (!b.on) continue;
        c.beginPath();
        c.arc(b.x, b.y, 3, 0, TAU);
        c.stroke();
      }
      if (!(this.hurt > 0 && ((this.hurt * 12) | 0) % 2)) {
        const x = this.x, y = this.y;
        c.fillStyle = '#ffd24a';
        c.beginPath();
        c.ellipse(x, y, 13, 6, 0, 0, TAU);
        c.fill();
        c.fillRect(x - 3, y - 11, 8, 6);
        c.fillStyle = '#c99a1c';
        c.fillRect(x + 1, y - 15, 2, 4);
        c.fillRect(x + 1, y - 15, 4, 2);
        c.fillStyle = '#9fe6ff';
        c.fillRect(x - 6, y - 2, 3, 3);
        c.fillRect(x, y - 2, 3, 3);
        c.fillRect(x + 6, y - 2, 3, 3);
        c.fillStyle = this.triple > 0 ? '#ff9a3c' : '#8a96a3';
        c.fillRect(x - 17, y - (((this.t * 20) | 0) % 2 ? 4 : 2), 3, ((this.t * 20) | 0) % 2 ? 8 : 4);
      }
      for (const p of this.pops) if (p.t < 0.7) label(c, p.txt, p.x, p.y - p.t * 30, p.big ? 14 : 10, p.big ? '#fff36a' : '#ffffff', 'center');
      // Score, subs left, the clock.
      label(c, 'SCORE ' + this.score, 8, 16, 12, '#ffffff');
      for (let i = 0; i < SUB.lives; i++) {
        c.fillStyle = i < this.lives ? '#ffd24a' : 'rgba(0,0,0,0.35)';
        c.fillRect(W - 50 + i * 15, 8, 11, 6);
        c.fillRect(W - 47 + i * 15, 5, 4, 3);
      }
      if (!B.on) {
        c.fillStyle = 'rgba(0,0,0,0.35)';
        c.fillRect(110, 9, 100, 5);
        c.fillStyle = '#7dff9a';
        c.fillRect(110, 9, 100 * Math.min(1, this.t / SUB.boss), 5);
      }
      if (this.triple > 0) label(c, 'TRIPLE ' + Math.ceil(this.triple), 8, 30, 9, '#ff9a3c');
    }
  }

  // ============================================================== the cabinets
  // Which cabinets (the west row's, along z), their games, and the tables of five they start with.
  const CABINETS = [];

  /** The big screen while Jay plays: the cabinet's own canvas, shown large over the scene. */
  let bigEl = null;
  function bigScreen(canvas, name) {
    const ui = Carnival.Midway.ui;
    if (!ui) return;
    if (!bigEl) {
      bigEl = VH.util.el('div', 'cv-arcade');
      ui.root.append(bigEl);
    }
    if (!canvas) {
      bigEl.classList.remove('on');
      return;
    }
    if (canvas.parentNode !== bigEl) {
      bigEl.textContent = '';
      bigEl.append(canvas);
    }
    bigEl.dataset.name = name || '';
    bigEl.classList.add('on');
  }

  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ';

  /**
   * One cabinet as a stall game: o = { id, name, z, game, table: [[initials, score] x5], tickets,
   * howto, keys, prize, barks, tagline, price }.
   */
  function cabinet(o) {
    const game = o.game;
    const def = {
      id: o.id,
      name: o.name,
      frame: { x: ROW_X, z: o.z, yaw: PI / 2, w: 1.0, d: 0.9 },
      price: o.price || 1,
      unit: 'points',
      radius: 1.5,
      sleep: 30,
      stand: [0, 1.15],
      promptV: 0.8,
      cam: [0.75, KERB + 2.05, 2.7, 0, KERB + 1.35, 0.2, 50],
      seconds: null,
      holder: false,
      tagline: o.tagline,
      howto: o.howto,
      keys: o.keys,
      prize: o.prize,
      barks: o.barks,
      tickets: o.tickets,
      marquee: o.marquee,
      colour: o.colour,
      game,

      verdict(g) {
        return g.line || '';
      },

      build(kit) {
        const cv = (this.canvas = document.createElement('canvas'));
        cv.width = W;
        cv.height = H;
        cv.className = 'cv-arcade-screen';
        this.ctx = cv.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;
        const tex = (this.tex = new THREE.CanvasTexture(cv));
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.NearestFilter;
        tex.generateMipmaps = false;
        const mat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
        this.screen = kit.single(new THREE.PlaneGeometry(0.68, 0.51), mat);
        this.screen.position.set(0, KERB + 1.35, 0.49);
        game.sfx = (name, opts) => {
          const A = this.c.audio;
          if (A && A[name] && this.c.session && this.c.session.def === this) A[name](opts);
        };
        this.table = o.table.map((r) => r.slice());
        this.lastIni = ['JAY', 'P2 '];
        this.att = 0; //  the attract mode's clock
        this.drawT = 0;
        this.demoOn = false;
        this.seed = 1;
        this.paint(0);
      },

      serialize() {
        return { table: this.table.map((r) => r.slice()), ini: this.lastIni.slice() };
      },

      load(d) {
        this.table = o.table.map((r) => r.slice());
        if (d && Array.isArray(d.table)) {
          const t = d.table.filter((r) => Array.isArray(r) && typeof r[0] === 'string' && typeof r[1] === 'number');
          if (t.length) this.table = t.slice(0, 5).map((r) => [r[0].slice(0, 3), Math.max(0, r[1] | 0)]);
        }
        if (d && Array.isArray(d.ini)) this.lastIni = [String(d.ini[0] || 'JAY').slice(0, 3), String(d.ini[1] || 'P2 ').slice(0, 3)];
      },

      reset() {
        bigScreen(null);
        this.demoOn = false;
        this.att = 0;
      },

      begin(g, s) {
        // Both players get the same run (the same seed) on a two-player go.
        if (g.n === 1) s.data.seed = 1 + ((Math.random() * 1e6) | 0);
        game.reset(s.data.seed);
        g.ini = null;
        g.line = '';
        bigScreen(this.canvas, this.name);
        this.paint(0);
      },

      play(dt, g, s) {
        if (!g.over) {
          readIn(s);
          if (g.ini) this.initials(dt, g);
          else {
            // Fixed steps: the same input gives the same run at any frame rate.
            const n = Math.max(1, Math.ceil(dt / (1 / 60) - 1e-6));
            for (let i = 0; i < n; i++) {
              game.step(dt / n, IN);
              IN.aP = IN.upP = IN.downP = IN.leftP = IN.rightP = false;
            }
            g.score = game.score;
            if (game.over) {
              g.line = game.line();
              if (this.rank(g.score) < 5) {
                const ini = this.lastIni[g.n - 1] || 'AAA';
                g.ini = { k: 0, t: 0, idle: 0, L: [0, 1, 2].map((i) => Math.max(0, LETTERS.indexOf(ini[i] || 'A'))), word: game.over };
                s.sound('win', { gain: 0.5 });
              } else g.over = game.over;
            }
          }
        }
        this.paint(dt, g);
      },

      after(dt, g) {
        this.paint(dt, g);
      },

      /** Where a score would go in the table (5: not in it). */
      rank(score) {
        if (score <= 0) return 5;
        let i = 0;
        while (i < this.table.length && this.table[i][1] >= score) i++;
        return i;
      },

      /** A new high score: three letters, up and down to change one, the button for the next. */
      initials(dt, g) {
        const I = g.ini;
        I.t += dt;
        I.idle += dt;
        if (IN.upP || IN.downP || IN.leftP || IN.rightP || IN.aP) I.idle = 0;
        if (IN.upP) I.L[I.k] = (I.L[I.k] + 1) % LETTERS.length;
        if (IN.downP) I.L[I.k] = (I.L[I.k] + LETTERS.length - 1) % LETTERS.length;
        if (IN.leftP) I.k = Math.max(0, I.k - 1);
        if (IN.rightP) I.k = Math.min(2, I.k + 1);
        if (IN.aP) I.k++;
        if (I.k > 2 || I.idle > 15) {
          const name = I.L.map((i) => LETTERS[i]).join('');
          const r = this.rank(g.score);
          this.table.splice(r, 0, [name, g.score]);
          this.table.length = 5;
          this.lastIni[g.n - 1] = name;
          g.rank = r;
          g.line = (g.line ? g.line + '; ' : '') + (r === 0 ? 'top of the table!' : 'number ' + (r + 1) + ' on the table');
          if (r === 0 && this.c.game.achievements) this.c.game.achievements.unlock('fair_arcade');
          g.ini = null;
          g.over = I.word;
        }
      },

      /** Draw the screen (the game, a new-score page, or the attract mode) and send it to the cabinet. */
      paint(dt, g) {
        const c = this.ctx;
        const live = this.c && this.c.session && this.c.session.def === this && this.c.session.data.go && (this.c.session.data.phase === 'play' || this.c.session.data.phase === 'whistle' || this.c.session.data.phase === 'count');
        if (live || !this.c) {
          game.draw(c);
          if (g && g.ini) this.drawInitials(c, g);
          const ph = this.c && this.c.session && this.c.session.data.phase;
          if (ph === 'count') {
            c.fillStyle = 'rgba(10,6,24,0.55)';
            c.fillRect(0, 96, W, 48);
            label(c, (this.c.session.data.players === 2 ? 'PLAYER ' + this.c.session.data.go.n + ' · ' : '') + 'GET READY!', W / 2, 126, 16, game.ink, 'center');
          }
        } else this.attract(c);
        // The cabinet's own screen: refreshed at about 15 a second while playing, 8 otherwise.
        this.drawT += dt;
        if (this.drawT >= (live ? 0.066 : 0.12) || dt === 0) {
          this.drawT = 0;
          this.tex.needsUpdate = true;
        }
      },

      drawInitials(c, g) {
        const I = g.ini;
        c.fillStyle = 'rgba(10,6,24,0.82)';
        c.fillRect(30, 50, W - 60, 140);
        c.strokeStyle = game.ink;
        c.lineWidth = 2;
        c.strokeRect(31, 51, W - 62, 138);
        label(c, 'NEW HIGH SCORE!', W / 2, 76, 18, game.ink, 'center');
        label(c, String(g.score), W / 2, 98, 14, '#ffffff', 'center');
        label(c, 'ENTER YOUR INITIALS', W / 2, 118, 10, '#cfc6ff', 'center');
        for (let i = 0; i < 3; i++) {
          const x = W / 2 - 36 + i * 36, on = i === I.k;
          if (on && ((I.t * 4) | 0) % 2) continue;
          label(c, LETTERS[I.L[i]] === ' ' ? '_' : LETTERS[I.L[i]], x, 152, 24, on ? '#ffffff' : game.ink, 'center');
          if (on) {
            c.fillStyle = '#ffffff';
            c.fillRect(x - 9, 158, 18, 2);
          }
        }
        label(c, 'UP/DOWN letter · RIGHT next · JUMP ok', W / 2, 180, 9, '#cfc6ff', 'center');
      },

      /** The attract mode: the title and the table, then the game playing itself. */
      attract(c) {
        const cyc = this.att % 22;
        if (cyc < 8) {
          if (this.demoOn) {
            this.demoOn = false;
            game.reset(++this.seed);
          }
          game.draw(c);
          c.fillStyle = 'rgba(10,6,24,0.78)';
          c.fillRect(0, 0, W, H);
          label(c, game.title, W / 2, 46, 22, game.ink, 'center');
          label(c, 'HIGH SCORES', W / 2, 78, 12, '#ffffff', 'center');
          this.table.forEach((r, i) => {
            const y = 102 + i * 20;
            label(c, i + 1 + '.', 88, y, 13, '#cfc6ff');
            label(c, r[0], 118, y, 13, i === 0 ? game.ink : '#ffffff');
            label(c, String(r[1]), 232, y, 13, i === 0 ? game.ink : '#ffffff', 'right');
          });
          if (((this.att * 2) | 0) % 2) label(c, 'PRESS E TO PLAY · $' + this.price, W / 2, 222, 12, '#7dff9a', 'center');
        } else {
          game.draw(c);
          label(c, 'DEMO', W / 2, 228, 10, 'rgba(255,255,255,0.8)', 'center');
        }
      },

      idleGame(dt) {
        const s = this.c.session;
        if (s && s.def === this && s.data.phase === 'count') {
          this.paint(dt, s.data.go);
          return;
        }
        this.att += dt;
        if (this.att % 22 >= 8) {
          if (!this.demoOn) {
            this.demoOn = true;
            game.reset(++this.seed);
          }
          // The demo plays itself (a few steps at a time; the screen only needs a dozen pictures a second).
          this.demoT = (this.demoT || 0) + dt;
          if (this.demoT >= 0.08) {
            const n = Math.ceil(this.demoT / (1 / 30));
            for (let i = 0; i < n; i++) game.step(this.demoT / n, game.demo(IN));
            this.demoT = 0;
            if (game.over) this.att = 22 * Math.ceil(this.att / 22); // back to the title
          }
        }
        this.drawT += dt;
        if (this.drawT >= 0.12) {
          this.attract(this.ctx);
          this.drawT = 0;
          this.tex.needsUpdate = true;
        }
      },
    };
    const d = Carnival.stall(def);
    CABINETS.push(d);
    return d;
  }

  // The cabinets' marquees (on the sign atlas: one draw call for all) and their control panels.
  Carnival.Midway.builders.push((world, K) => {
    for (const d of CABINETS) {
      const F = K.frame(d.frame);
      K.wantSign('arcade_' + d.id, [d.name.toUpperCase(), d.marquee || 'Arcade Row'], d.colour || 0x37e8ff, 0xffffff);
      K.QUADS.push(['arcade_' + d.id, F.wx(0, 0.46), KERB + 2.025, F.wz(0, 0.46), F.yaw, 0.98, 0.245]);
      const ctx = world.ctxAt(F.x, F.z);
      const r = [0, 0, 0, 0];
      const put = (surf, u0, y0, v0, u1, y1, v1, col) => {
        F.box(u0, v0, u1, v1, r);
        surf.box(r[0], y0, r[1], r[2], y1, r[3], VH.col(col));
      };
      // A control panel: a joystick and two buttons; a coin slot below.
      put(ctx.prop, -0.44, KERB + 0.92, 0.45, 0.44, KERB + 1.0, 0.74, 0x15131c);
      put(ctx.prop, -0.44, KERB + 0.6, 0.45, 0.44, KERB + 0.92, 0.5, 0x15131c);
      put(ctx.prop, -0.2, KERB + 1.0, 0.57, -0.18, KERB + 1.1, 0.59, 0x222222);
      put(ctx.screen, -0.23, KERB + 1.1, 0.55, -0.15, KERB + 1.15, 0.61, 0xe0403a);
      put(ctx.screen, 0.1, KERB + 1.0, 0.56, 0.16, KERB + 1.03, 0.62, 0xffd24a);
      put(ctx.screen, 0.22, KERB + 1.0, 0.56, 0.28, KERB + 1.03, 0.62, 0x37e8ff);
      put(ctx.screen, -0.03, KERB + 0.7, 0.5, 0.03, KERB + 0.78, 0.51, 0xff9a3c);
      F.box(-0.44, 0.45, 0.44, 0.74, r);
      world.physics.addBox(r[0], KERB + 0.6, r[1], r[2], KERB + 1.0, r[3], 'metal', VH.COLLIDE.SOLID | VH.COLLIDE.SHOTS);
    }
  });

  cabinet({
    id: 'dash',
    name: 'Boardwalk Dash',
    marquee: 'Run the pier!',
    colour: 0xffd24a,
    z: 90.6,
    game: new Dash(),
    price: 1,
    tagline: 'Ninety seconds to the end of the pier.',
    howto: [
      'Jump the crates and the gaps in the planks; duck under the gulls.',
      'Hold the button for a higher jump (the lobster pots are tall). Down in the air drops you quicker.',
      'Grab doughnuts (5) and gold tickets (50). Three hearts; reach the end of the pier for a bonus.',
    ],
    keys: 'Space / click / A  jump (hold: higher)   ·   S / Down / stick  duck',
    prize: 'One for every 70 points',
    barks: ['Boardwalk Dash! Can you make the end of the pier?', 'One dollar a run! Mind the gulls!'],
    tickets: (score) => score / 70,
    table: [['ACE', 2000], ['GUS', 1500], ['DOT', 1100], ['KIT', 800], ['BOB', 500]],
  });

  cabinet({
    id: 'sprint',
    name: 'Seafront Sprint',
    marquee: 'Four laps, flat out!',
    colour: 0xff7ab0,
    z: 94.8,
    game: new Sprint(),
    price: 1,
    tagline: 'Four laps of the seafront against the clock.',
    howto: [
      'Four laps of the circuit as fast as you can: the sooner you finish, the bigger the score.',
      'Stay on the tarmac: the sand slows you right down. Hit a cone and you lose speed; the yellow arrows give you a boost.',
      'Every checkpoint scores too, so keep going even if the clock wins (the flag drops at two minutes).',
    ],
    keys: 'W / Up / Space / RT  accelerate   ·   S / Down  brake   ·   A D / left stick  steer',
    prize: 'One for every 100 points',
    barks: ['Seafront Sprint! Four laps, one dollar, no speed limit!', 'Beat the clock round the seafront!'],
    tickets: (score) => score / 100,
    table: [['ACE', 3500], ['GUS', 3000], ['DOT', 2400], ['KIT', 1600], ['BOB', 900]],
  });

  cabinet({
    id: 'sub',
    name: 'Bubble Sub',
    marquee: 'Bubble the fish!',
    colour: 0x7dff9a,
    z: 99.0,
    game: new Sub(),
    price: 1,
    tagline: 'Three subs, a sea full of fish, and the Big Angler.',
    howto: [
      'Steer the sub along the sea bed and blow bubbles up at the fish: sardines 10, jellyfish 25 (two bubbles), puffers 40 (three).',
      'Keep clear of the jellyfish ink and anything that swims into you: you have three subs. Catch a starfish for a triple blower.',
      'At the end the Big Angler comes down: bubble it for 500, and a bonus for the time and the subs you have left.',
    ],
    keys: 'A D / arrows / left stick  move   ·   Hold Space / click / A  blow bubbles',
    prize: 'One for every 80 points',
    barks: ['Bubble Sub! Save the sea from the Big Angler!', 'One dollar, three subs! Who can beat the Angler?'],
    tickets: (score) => score / 80,
    table: [['ACE', 2200], ['GUS', 1700], ['DOT', 1200], ['KIT', 800], ['BOB', 400]],
  });

  Carnival.Arcade = { cabinets: CABINETS, Dash, DASH, Sprint, SPRINT, Sub, SUB, rng, IN, TX, TY, TA };
})();
