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
 *   stack    Lighthouse Stack: drop the swinging floors into a tower
 *   catch    Catch of the Day: a bucket on the pier catching the fish the
 *            gulls drop (and not what else the gulls drop)
 *   serpent  Serpent Supper: grow a sea serpent on shrimp round the rocks
 *   reef     Reef Rebound: a clam-shell bat and a pearl breaking up coral
 *   rhythm   Crab Conga: press the arrows in time to the band's tune
 *
 * They run on the stall framework (VH.Carnival.stall, js/carnival-midway.js):
 * the rules card, one player or two, the countdown, the results and the
 * tickets. A score good enough for the cabinet's table of five asks for
 * initials. This file also fits out the hall (Arcade Row in neonstrand.js):
 * the eight cabinets themselves, the change desk, the carpet and the neon.
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
  // button (Space, click, E, pad A or RT) held and just pressed, the stick's taps (the initials), and
  // how far the mouse moved (mx, my: radians of the camera's turn, right and up +).
  const IN = { x: 0, y: 0, a: false, aP: false, upP: false, downP: false, leftP: false, rightP: false, mx: 0, my: 0 };
  const _padPrev = { x: 0, y: 0 };
  const _mouse = { yaw: null };
  function readIn(s) {
    // The mouse turns the camera rig while Jay is held: read the turn, then put it back.
    const rig = s.game.cameraRig;
    if (_mouse.yaw === null) _mouse.yaw = rig.yaw;
    let dyaw = rig.yaw - _mouse.yaw;
    dyaw = Math.atan2(Math.sin(dyaw), Math.cos(dyaw));
    _mouse.yaw = rig.yaw;
    IN.mx = -dyaw;
    IN.my = rig.pitch;
    rig.pitch = 0;
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
  function clearIn(o) {
    const I = o || IN;
    I.x = I.y = I.mx = I.my = 0;
    I.a = I.aP = I.upP = I.downP = I.leftP = I.rightP = false;
    return I;
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
      clearIn(I);
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
      clearIn(I);
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
      clearIn(I);
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

  // ========================================================== LIGHTHOUSE STACK
  // Build a lighthouse on the end of the pier: a block swings from the crane, the button drops it, and
  // whatever hangs over the floor below is sliced off and falls in the sea, so the tower gets narrower
  // unless the drops are true. A dead-centre drop is PERFECT (bonus, a run of them more, and the block
  // grows back a little). The swing quickens and the tower sways more the higher it gets. Three blocks
  // in the sea or 75 seconds, whichever is first; every tenth floor is a lamp room.
  const STACK = {
    secs: 75,
    w0: 84, //          the first floor's width (px) and the most a block can grow back to
    fh: 14, //          a floor's height
    base: 226, //       the pier's top on the screen, before the view rises
    hookUp: 64, //      how far above the tower's top the block swings
    g: 1100, //         a dropped block's fall
    swing: 70, //       the swing's half-width (px)
    period0: 3.0, //    the swing's period at the start, and what each floor takes off it (to the least)
    periodK: 0.03,
    periodMin: 1.4,
    perfect: 0.03, //   a perfect drop: within this many seconds of the swing of dead centre (4 px at the least)
    grow: 6, //         what a perfect drop gives back
    sway: 9, //         the tower's sway (px) at 30 floors up
    lives: 3,
  };

  class Stack {
    constructor() {
      this.title = 'LIGHTHOUSE STACK';
      this.ink = '#ff9a3c';
      this.blocks = []; //  [x (tower's own), w] per floor
      this.bits = []; //    sliced-off pieces falling in the sea
      for (let i = 0; i < 8; i++) this.bits.push({ on: false, x: 0, y: 0, w: 0, vy: 0, vx: 0, r: 0, lamp: false });
      this.pops = [];
      for (let i = 0; i < 5; i++) this.pops.push({ t: 9, x: 0, y: 0, txt: '', col: '' });
      this._popI = 0;
      this.stars = [];
      const R = rng(31);
      for (let i = 0; i < 40; i++) this.stars.push([R() * W, R() * 900, R()]);
      this.sfx = () => {};
      this.reset(1);
    }

    reset(seed) {
      this.rnd = rng(seed);
      this.t = 0;
      this.score = 0;
      this.over = null;
      this.blocks.length = 0;
      this.blocks.push([0, STACK.w0]);
      this.w = STACK.w0; //    the block on the hook
      this.ph = this.rnd() * TAU; // the swing's phase
      this.falling = false;
      this.fy = 0; //          a falling block's height above the tower's top (px) and speed
      this.fvy = 0;
      this.fx = 0; //          its x (screen)
      this.wait = 0.6; //      until the next block is on the hook
      this.lives = STACK.lives;
      this.run = 0; //         perfect drops in a row
      this.perfects = 0;
      this.best = 0;
      this.view = 0; //        how far the view has risen (px)
      this.shake = 0;
      this.flash = 0;
      for (const b of this.bits) b.on = false;
      for (const p of this.pops) p.t = 9;
    }

    get floors() {
      return this.blocks.length - 1;
    }

    line() {
      const bits = [this.floors + (this.floors === 1 ? ' floor' : ' floors')];
      if (this.perfects) bits.push(this.perfects + ' perfect');
      if (this.best > 1) bits.push('best run ' + this.best);
      return bits.join(', ');
    }

    /** The tower's sway (px) at the top, now. */
    swayAt(t) {
      const k = Math.min(1.4, this.floors / 30);
      return Math.sin(t * 1.1) * STACK.sway * k;
    }
    /** Where floor i is drawn across (screen x of its middle). */
    floorX(i, t) {
      const n = Math.max(1, this.floors);
      return W / 2 + this.blocks[i][0] + (this.swayAt(t) * i) / n;
    }
    /** The swing's period now. */
    get period() {
      return Math.max(STACK.periodMin, STACK.period0 - this.floors * STACK.periodK);
    }
    /** The hook: where the block on it is (screen x) at time t. */
    hookX(t) {
      return W / 2 + Math.sin(this.ph + (t * TAU) / this.period) * STACK.swing;
    }
    /** The tower's top on the screen (y), the view risen. */
    topY() {
      return STACK.base - this.floors * STACK.fh + this.view;
    }

    pop(txt, x, y, col) {
      const p = this.pops[this._popI++ % this.pops.length];
      p.t = 0;
      p.txt = txt;
      p.x = x;
      p.y = y;
      p.col = col || '#ffffff';
    }

    piece(x, y, w, vx, lamp) {
      let b = this.bits.find((q) => !q.on);
      if (!b) b = this.bits[0];
      b.on = true;
      b.x = x;
      b.y = y;
      b.w = w;
      b.vx = vx;
      b.vy = -40;
      b.r = 0;
      b.lamp = lamp;
    }

    step(dt, I) {
      if (this.over) return;
      this.t += dt;
      const S = STACK;
      for (const p of this.pops) p.t += dt;
      this.shake = Math.max(0, this.shake - dt * 3);
      this.flash = Math.max(0, this.flash - dt * 2);
      // The view rises with the tower (the top kept about a third of the way down).
      const want = Math.max(0, this.floors * S.fh - 120);
      this.view += (want - this.view) * Math.min(1, dt * 4);
      for (const b of this.bits) {
        if (!b.on) continue;
        b.vy += S.g * 0.6 * dt;
        b.y += b.vy * dt;
        b.x += b.vx * dt;
        b.r += b.vx * 0.02 * dt;
        if (b.y > H + 40) {
          b.on = false;
          this.sfx('splash', { gain: 0.25 });
        }
      }
      if (this.t >= S.secs) {
        this.over = 'TIME!';
        this.sfx('klaxon', { gain: 0.4 });
        return;
      }
      if (this.wait > 0) {
        this.wait -= dt;
        return;
      }
      if (!this.falling) {
        if (I.aP) {
          this.falling = true;
          this.fx = this.hookX(this.t);
          this.fy = S.hookUp;
          this.fvy = 0;
          this.sfx('chip', { f: 520, f1: 260, len: 0.12, gain: 0.7 });
        }
        return;
      }
      // A block on its way down.
      this.fvy += S.g * dt;
      this.fy -= this.fvy * dt;
      if (this.fy > 0) return;
      this.falling = false;
      this.wait = 0.35;
      const n = this.floors;
      const tx = this.floorX(n, this.t), tw = this.blocks[n][1];
      const dx = this.fx - tx;
      const left = Math.max(this.fx - this.w / 2, tx - tw / 2), right = Math.min(this.fx + this.w / 2, tx + tw / 2);
      const y = this.topY();
      if (right - left <= 1) {
        // Missed the tower altogether: into the sea.
        this.piece(this.fx, y - S.fh, this.w, dx > 0 ? 40 : -40, false);
        this.lives--;
        this.run = 0;
        this.shake = 0.6;
        this.sfx('buzz', { gain: 0.5 });
        this.pop('SPLASH!', this.fx, y - 30, '#37b8ff');
        if (this.lives <= 0) {
          this.over = 'GAME OVER';
          this.sfx('lose', { gain: 0.5 });
        }
        return;
      }
      let x, w;
      if (Math.abs(dx) <= Math.max(4, (S.perfect * S.swing * TAU) / this.period)) {
        // Dead centre: a perfect drop.
        w = Math.min(S.w0, tw + S.grow);
        x = tx;
        this.run++;
        this.perfects++;
        this.best = Math.max(this.best, this.run);
        const pts = 25 + 5 * (this.run - 1);
        this.score += pts;
        this.flash = 1;
        this.pop('PERFECT +' + pts, x, y - 34, '#ffd24a');
        this.sfx('ding', { gain: 0.45 });
      } else {
        w = right - left;
        x = (left + right) / 2;
        this.run = 0;
        this.score += 10;
        // The part that hung over the edge drops off.
        const cut = this.w - w;
        if (cut > 0.5) this.piece(dx > 0 ? right + cut / 2 : left - cut / 2, y - S.fh, cut, dx > 0 ? 50 : -50, false);
        this.sfx('thud', { gain: 0.5 });
        this.sfx('chip', { f: 330, len: 0.06, gain: 0.6 });
      }
      // Into the tower's own frame (the sway taken out).
      this.blocks.push([x - W / 2 - this.swayAt(this.t), w]);
      this.w = w;
      if (this.floors % 10 === 0) {
        // A lamp room: 100, and the next block is full width again.
        this.score += 100;
        this.w = S.w0;
        this.pop('LAMP ROOM +100', x, y - 50, '#7dff9a');
        this.sfx('win', { gain: 0.4 });
      }
    }

    draw(c) {
      const S = STACK;
      const v = this.view;
      const sh = this.shake > 0 ? Math.sin(this.t * 60) * this.shake * 3 : 0;
      // The sky darkens to night the higher the tower goes; stars come out.
      const k = clamp(v / 500, 0, 1);
      const top = k < 0.5 ? '#5ab8e8' : '#2a1650', mid = k < 0.5 ? '#ffb27a' : '#5a2e8a';
      const grd = c.createLinearGradient(0, 0, 0, H);
      grd.addColorStop(0, k < 0.25 ? '#7cc8f0' : top);
      grd.addColorStop(1, k < 0.25 ? '#ffe0b0' : mid);
      c.fillStyle = grd;
      c.fillRect(0, 0, W, H);
      if (k > 0.2) {
        c.fillStyle = 'rgba(255,255,255,' + ((k - 0.2) * 1.2).toFixed(2) + ')';
        for (const [x, y, s] of this.stars) {
          const yy = ((y + v * 0.3) % 900) - 300;
          if (yy > 0 && yy < H) c.fillRect(x, yy, s > 0.8 ? 2 : 1, s > 0.8 ? 2 : 1);
        }
      }
      c.save();
      c.translate(sh, 0);
      // The sea and the pier at the bottom (until the view rises past them).
      const seaY = S.base + 4 + v;
      if (seaY < H + 10) {
        c.fillStyle = '#1a6aa0';
        c.fillRect(-4, seaY, W + 8, H - seaY + 4);
        c.fillStyle = '#5ab8e8';
        for (let x = -10; x < W; x += 24) c.fillRect(x + ((this.t * 12) % 24), seaY + 4, 12, 2);
        c.fillStyle = '#8a5a32';
        c.fillRect(W / 2 - 70, S.base + v, 140, 6);
        for (const x of [-60, -20, 20, 60]) c.fillRect(W / 2 + x - 3, S.base + v, 6, 40);
      }
      // The tower: red and white rings, a gold lamp room every tenth floor.
      const n = this.floors;
      for (let i = 1; i <= n; i++) {
        const y = S.base - i * S.fh + v;
        if (y > H + 4 || y < -S.fh) continue;
        const x = this.floorX(i, this.t), w = this.blocks[i][1];
        this.ring(c, x, y, w, i);
      }
      // A floor-zero plinth.
      const by = S.base + v;
      if (by - 4 < H) {
        c.fillStyle = '#6b6f78';
        c.fillRect(W / 2 - S.w0 / 2 - 4, by - 4, S.w0 + 8, 4);
      }
      // The crane along the top, its trolley, the rope and the block on the hook (or falling).
      c.fillStyle = '#ffd24a';
      c.fillRect(0, 6, W, 6);
      c.fillStyle = '#c89a20';
      for (let x = 0; x < W; x += 12) c.fillRect(x, 6, 2, 6);
      const ty = this.topY();
      if (!this.over && this.wait <= 0) {
        const hx = this.falling ? this.fx : this.hookX(this.t);
        const hy = ty - (this.falling ? this.fy : S.hookUp) - S.fh;
        c.fillStyle = '#3a3d44';
        c.fillRect((this.falling ? this.hookX(this.t) : hx) - 7, 12, 14, 6);
        if (!this.falling) {
          c.fillStyle = '#20202a';
          c.fillRect(hx - 0.5, 18, 1, Math.max(0, hy - 18));
        }
        this.ring(c, hx, hy, this.w, n + 1);
        if (!this.falling) {
          // A guide: a faint line down from the block's middle.
          c.fillStyle = 'rgba(255,255,255,0.18)';
          c.fillRect(hx - 0.5, hy + S.fh, 1, ty - hy - S.fh);
        }
      }
      // Pieces falling off.
      for (const b of this.bits) {
        if (!b.on) continue;
        c.save();
        c.translate(b.x, b.y + S.fh / 2);
        c.rotate(b.r);
        c.fillStyle = '#e0403a';
        c.fillRect(-b.w / 2, -S.fh / 2, b.w, S.fh);
        c.fillStyle = '#f2efe6';
        c.fillRect(-b.w / 2, -S.fh / 2 + 4, b.w, 5);
        c.restore();
      }
      c.restore();
      if (this.flash > 0) {
        c.fillStyle = 'rgba(255,240,180,' + (this.flash * 0.25).toFixed(2) + ')';
        c.fillRect(0, 0, W, H);
      }
      for (const p of this.pops) {
        if (p.t > 1) continue;
        label(c, p.txt, p.x, p.y - p.t * 24, 11, p.col, 'center');
      }
      // The panel: score, floors, blocks left, time.
      label(c, String(this.score), 8, 30, 14, '#ffffff');
      label(c, this.floors + ' FLOORS', 8, 44, 9, '#ffd24a');
      for (let i = 0; i < S.lives; i++) {
        c.fillStyle = i < this.lives ? '#e0403a' : 'rgba(255,255,255,0.2)';
        c.fillRect(W - 60 + i * 18, 22, 14, 8);
        c.fillStyle = i < this.lives ? '#f2efe6' : 'rgba(255,255,255,0.1)';
        c.fillRect(W - 60 + i * 18, 25, 14, 2);
      }
      label(c, Math.max(0, Math.ceil(S.secs - this.t)) + 's', W - 8, 44, 10, '#ffffff', 'right');
      if (this.run > 1) label(c, 'RUN x' + this.run, W / 2, 34, 10, '#ffd24a', 'center');
    }

    /** One floor of the lighthouse: red with a white band; a lamp room every tenth. */
    ring(c, x, y, w, i) {
      const S = STACK;
      const l = x - w / 2;
      if (i % 10 === 0) {
        c.fillStyle = '#c89a20';
        c.fillRect(l, y, w, S.fh);
        c.fillStyle = '#fff6c8';
        c.fillRect(l + 3, y + 3, w - 6, S.fh - 6);
        c.fillStyle = '#c89a20';
        for (let k = l + 8; k < l + w - 4; k += 10) c.fillRect(k, y + 3, 2, S.fh - 6);
        return;
      }
      c.fillStyle = i % 2 ? '#e0403a' : '#f2efe6';
      c.fillRect(l, y, w, S.fh);
      c.fillStyle = i % 2 ? '#a82a26' : '#c8c2b6';
      c.fillRect(l, y + S.fh - 2, w, 2);
      c.fillStyle = 'rgba(255,255,255,0.25)';
      c.fillRect(l + 2, y + 1, Math.max(0, w * 0.2), S.fh - 3);
      if (i % 4 === 2 && w > 20) {
        c.fillStyle = '#20304a';
        c.fillRect(x - 3, y + 4, 6, 6);
      }
    }

    /** The attract mode's player: drops as the block crosses the middle, give or take a little. */
    demo(I) {
      clearIn(I);
      if (this.wait > 0 || this.falling || this.over) {
        this._dd = null;
        return I;
      }
      const fall = Math.sqrt((2 * STACK.hookUp) / STACK.g);
      const d = this.hookX(this.t) - this.floorX(this.floors, this.t + fall) - (((this.floors * 7.3) % 1) * 10 - 5);
      if (this._dd !== null && this._dd !== undefined && (d > 0) !== (this._dd > 0)) I.a = I.aP = true;
      this._dd = d;
      return I;
    }
  }

  // ========================================================== CATCH OF THE DAY
  // A bucket on the pier, gulls overhead: they drop the fish they've pinched (sardines, mackerel, now and
  // then a golden one that zigzags) and other things that are not fish (a splat in the bucket costs
  // points and leaves it slow and mucky for a moment). Catches in a row build a multiplier; a starfish
  // makes the bucket big for a while. 75 seconds, faster and busier as it goes.
  const CATCH = {
    secs: 75,
    deck: 204, //       the pier's top
    rim: 180, //        the bucket's rim (where a catch counts)
    half: 19, //        half the bucket's width (big: 31)
    halfBig: 31,
    big: 7, //          seconds the big bucket lasts
    speed: 300, //      the bucket's top speed (px/s) on the keys or the stick, and how quickly it gets there
    accel: 2600,
    mouse: 420, //      px per radian of mouse turn
    mucky: 2.2, //      seconds slowed by a splat (to this much of its speed)
    muckK: 0.55,
    gap0: 1.2, //       seconds between drops at the start, at the end
    gap1: 0.55,
    reach: 240, //      a drop is never further from the last one than the bucket could go in the time between
    // What falls: [kind, points, fall speed (px/s), chance at the start, at the end]
    kinds: [['sardine', 10, 92, 0.6, 0.42], ['mackerel', 20, 128, 0.2, 0.24], ['gold', 50, 105, 0.05, 0.06], ['splat', -20, 118, 0.12, 0.24], ['star', 0, 85, 0.03, 0.04]],
  };

  class Catch {
    constructor() {
      this.title = 'CATCH OF THE DAY';
      this.ink = '#37e8ff';
      this.items = [];
      for (let i = 0; i < 14; i++) this.items.push({ on: false, kind: '', pts: 0, x: 0, y: 0, vy: 0, x0: 0, ph: 0, flop: 0, gull: null });
      this.gulls = [];
      for (let i = 0; i < 4; i++) this.gulls.push({ on: false, x: 0, y: 0, dir: 1, v: 0, dropAt: 0, item: null, flap: 0 });
      this.pops = [];
      for (let i = 0; i < 6; i++) this.pops.push({ t: 9, x: 0, y: 0, txt: '', col: '' });
      this._popI = 0;
      this.sfx = () => {};
      this.reset(1);
    }

    reset(seed) {
      this.rnd = rng(seed);
      this.t = 0;
      this.score = 0;
      this.over = null;
      this.x = W / 2;
      this.vx = 0;
      this.combo = 0;
      this.best = 0;
      this.caught = 0;
      this.gold = 0;
      this.splats = 0;
      this.missed = 0;
      this.muck = 0;
      this.bigT = 0;
      this.next = 1.2;
      this.lastX = W / 2;
      this.lastT = 0;
      this.boatX = 40;
      for (const it of this.items) it.on = false;
      for (const g of this.gulls) g.on = false;
      for (const p of this.pops) p.t = 9;
    }

    get mult() {
      return Math.min(5, 1 + Math.floor(this.combo / 5));
    }
    get half() {
      return this.bigT > 0 ? CATCH.halfBig : CATCH.half;
    }

    line() {
      const bits = [this.caught + (this.caught === 1 ? ' fish' : ' fish') + ' in the bucket'];
      if (this.gold) bits.push(this.gold + ' golden');
      if (this.best >= 5) bits.push('best run ' + this.best);
      if (this.splats) bits.push(this.splats + (this.splats === 1 ? ' splat' : ' splats'));
      return bits.join(', ');
    }

    pop(txt, x, y, col) {
      const p = this.pops[this._popI++ % this.pops.length];
      p.t = 0;
      p.txt = txt;
      p.x = x;
      p.y = y;
      p.col = col || '#ffffff';
    }

    /** A gull flies over carrying something, and lets go of it somewhere along the way. */
    launch() {
      const C = CATCH, k = Math.min(1, this.t / C.secs);
      const g = this.gulls.find((q) => !q.on);
      const it = this.items.find((q) => !q.on);
      if (!g || !it) return;
      let r = this.rnd(), kind = C.kinds[0];
      let sum = 0;
      for (const K of C.kinds) sum += K[3] + (K[4] - K[3]) * k;
      r *= sum;
      for (const K of C.kinds) {
        r -= K[3] + (K[4] - K[3]) * k;
        if (r <= 0) {
          kind = K;
          break;
        }
      }
      g.on = true;
      g.dir = this.rnd() < 0.5 ? 1 : -1;
      g.x = g.dir > 0 ? -20 : W + 20;
      g.y = 34 + this.rnd() * 26;
      // When it lands, and where: never further from the last one than the bucket could get in the time
      // between (fair, however busy it gets). The gull flies at whatever speed gets it there.
      const vmax = kind[2] * (1 + k * 0.3), d = C.rim - (g.y + 9);
      const fall = vmax / 520 + Math.max(0, d - (vmax * vmax) / 520) / vmax;
      const gap = (C.gap0 + (C.gap1 - C.gap0) * k) * 0.7;
      const land = Math.max(this.t + 0.9 + fall, this.lastT + gap);
      const far = 40 + C.reach * (land - this.lastT);
      g.dropAt = clamp(this.lastX + (this.rnd() * 2 - 1) * far, 26, W - 26);
      g.v = clamp(Math.abs(g.dropAt - g.x) / Math.max(0.4, land - fall - this.t), 70, 330);
      this.lastX = g.dropAt;
      this.lastT = land;
      g.item = it;
      it.on = true;
      it.kind = kind[0];
      it.pts = kind[1];
      it.vy = 0;
      it.vmax = vmax;
      it.held = true;
      it.flop = 0;
      it.ph = this.rnd() * TAU;
      it.x = g.x;
      it.y = g.y + 8;
    }

    step(dt, I) {
      if (this.over) return;
      const C = CATCH;
      this.t += dt;
      for (const p of this.pops) p.t += dt;
      this.boatX = (this.boatX + dt * 6) % (W + 60);
      if (this.t >= C.secs) {
        this.over = 'TIME!';
        return;
      }
      // The bucket: keys and the stick push it, the mouse puts it where it's moved to.
      const slow = this.muck > 0 ? C.muckK : 1;
      this.muck = Math.max(0, this.muck - dt);
      this.bigT = Math.max(0, this.bigT - dt);
      const want = I.x * C.speed * slow;
      this.vx += clamp(want - this.vx, -C.accel * dt, C.accel * dt);
      this.x += this.vx * dt + I.mx * C.mouse * slow;
      const h = this.half;
      if (this.x < h + 2 || this.x > W - h - 2) {
        this.x = clamp(this.x, h + 2, W - h - 2);
        this.vx = 0;
      }
      // Gulls in; each drops its catch over the spot it picked.
      const k = Math.min(1, this.t / C.secs);
      this.next -= dt;
      if (this.next <= 0) {
        this.launch();
        this.next = (C.gap0 + (C.gap1 - C.gap0) * k) * (0.75 + this.rnd() * 0.5);
      }
      for (const g of this.gulls) {
        if (!g.on) continue;
        g.x += g.dir * g.v * dt;
        g.flap += dt * 9;
        if (g.item && g.item.held && (g.dir > 0 ? g.x >= g.dropAt : g.x <= g.dropAt)) {
          g.item.held = false;
          g.item.x0 = g.item.x = g.x;
          g.item = null;
          this.sfx('chip', { f: 900, f1: 1300, len: 0.05, gain: 0.25 });
        }
        if (g.x < -40 || g.x > W + 40) {
          g.on = false;
          if (g.item) g.item.on = false;
          g.item = null;
        }
      }
      for (const it of this.items) {
        if (!it.on) continue;
        if (it.held) {
          const g = this.gulls.find((q) => q.item === it);
          if (g) {
            it.x = g.x + g.dir * 6;
            it.y = g.y + 9;
          }
          continue;
        }
        if (it.flop > 0) {
          it.flop -= dt;
          if (it.flop <= 0) it.on = false;
          continue;
        }
        const was = it.y;
        it.vy = Math.min(it.vmax, it.vy + 260 * dt);
        it.y += it.vy * dt;
        it.ph += dt * 6;
        if (it.kind === 'gold') it.x = clamp(it.x0 + Math.sin(it.ph * 0.55) * 34, 8, W - 8);
        // Into the bucket?
        if (was < C.rim && it.y >= C.rim && Math.abs(it.x - this.x) < h - 2) {
          it.on = false;
          this.land(it);
          continue;
        }
        if (it.y >= C.deck - 4) {
          // On the planks.
          it.y = C.deck - 4;
          it.flop = 0.6;
          if (it.kind !== 'splat' && it.kind !== 'star') {
            this.missed++;
            if (this.combo >= 5) this.pop('MISSED!', it.x, C.deck - 20, '#ff8a8a');
            this.combo = 0;
            this.sfx('chip', { f: 180, f1: 120, len: 0.1, gain: 0.35 });
          }
        }
      }
    }

    /** Something landed in the bucket. */
    land(it) {
      const C = CATCH;
      if (it.kind === 'splat') {
        this.score = Math.max(0, this.score + it.pts);
        this.splats++;
        this.combo = 0;
        this.muck = C.mucky;
        this.pop('SPLAT! ' + it.pts, this.x, C.rim - 18, '#f2efe6');
        this.sfx('buzz', { gain: 0.45 });
        return;
      }
      if (it.kind === 'star') {
        this.bigT = C.big;
        this.pop('BIG BUCKET!', this.x, C.rim - 18, '#ff7ab0');
        this.sfx('win', { gain: 0.35 });
        return;
      }
      this.combo++;
      this.best = Math.max(this.best, this.combo);
      this.caught++;
      if (it.kind === 'gold') this.gold++;
      const pts = it.pts * this.mult;
      this.score += pts;
      this.pop('+' + pts, this.x, C.rim - 18, it.kind === 'gold' ? '#ffd24a' : '#ffffff');
      if (it.kind === 'gold') this.sfx('ding', { gain: 0.45 });
      else this.sfx('chip', { f: 700 + Math.min(10, this.combo) * 40, len: 0.06, gain: 0.6 });
      if (this.combo % 5 === 0 && this.mult <= 5) this.pop('x' + this.mult + '!', this.x, C.rim - 34, '#7dff9a');
    }

    draw(c) {
      const C = CATCH;
      // Morning sky, the sea, a trawler on the horizon.
      const grd = c.createLinearGradient(0, 0, 0, 80);
      grd.addColorStop(0, '#8fd3ff');
      grd.addColorStop(1, '#ffe9c7');
      c.fillStyle = grd;
      c.fillRect(0, 0, W, 80);
      c.fillStyle = '#fff3b0';
      c.beginPath();
      c.arc(262, 30, 14, 0, TAU);
      c.fill();
      c.fillStyle = '#2a7ab0';
      c.fillRect(0, 76, W, C.deck - 76);
      c.fillStyle = '#5ab8e8';
      for (let y = 84; y < C.deck - 6; y += 14) for (let x = ((y * 7 + this.t * 10) % 40) - 40; x < W; x += 40) c.fillRect(x, y, 14, 2);
      const bx = this.boatX - 30;
      c.fillStyle = '#e0403a';
      c.fillRect(bx, 68, 26, 7);
      c.fillStyle = '#f2efe6';
      c.fillRect(bx + 14, 60, 8, 8);
      c.fillRect(bx + 4, 52, 2, 16);
      // The pier.
      c.fillStyle = '#9b6a3c';
      c.fillRect(0, C.deck, W, H - C.deck);
      c.fillStyle = '#7a5230';
      for (let x = 0; x < W; x += 22) c.fillRect(x, C.deck, 2, H - C.deck);
      c.fillStyle = '#c8873a';
      c.fillRect(0, C.deck, W, 3);
      // Gulls.
      for (const g of this.gulls) {
        if (!g.on) continue;
        const f = Math.sin(g.flap) * 6;
        c.fillStyle = '#ffffff';
        c.beginPath();
        c.ellipse(g.x, g.y, 9, 5, 0, 0, TAU);
        c.fill();
        c.strokeStyle = '#ffffff';
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(g.x - 12, g.y - 4 - f);
        c.lineTo(g.x, g.y - 1);
        c.lineTo(g.x + 12, g.y - 4 - f);
        c.stroke();
        c.fillStyle = '#ffb000';
        c.fillRect(g.x + g.dir * 8, g.y - 1, g.dir * 4, 2);
        c.fillStyle = '#111';
        c.fillRect(g.x + g.dir * 5, g.y - 3, 2, 2);
      }
      // What's falling (or flopping on the planks).
      for (const it of this.items) {
        if (!it.on) continue;
        this.thing(c, it);
      }
      // The bucket: blue, a rim, a handle; fish tails poking out once it has a few.
      const h = this.half, x = this.x, top = C.rim, bot = C.deck;
      c.fillStyle = this.muck > 0 ? '#7a8a6a' : '#37b8ff';
      c.beginPath();
      c.moveTo(x - h, top);
      c.lineTo(x + h, top);
      c.lineTo(x + h - 5, bot);
      c.lineTo(x - h + 5, bot);
      c.fill();
      c.fillStyle = '#1a6aa0';
      c.fillRect(x - h - 2, top - 2, 2 * h + 4, 4);
      c.fillRect(x - h + 4, top + 10, 2 * h - 8, 2);
      c.strokeStyle = '#c8ccd4';
      c.lineWidth = 2;
      c.beginPath();
      c.arc(x, top, h - 2, PI, TAU);
      c.stroke();
      const tails = Math.min(5, Math.floor(this.caught / 4));
      c.fillStyle = '#c8d6e0';
      for (let i = 0; i < tails; i++) {
        const tx = x - h + 8 + ((i * 2 * (h - 8)) / Math.max(1, tails - 1 || 1)) * (tails > 1 ? 1 : 0.5);
        c.beginPath();
        c.moveTo(tx, top - 1);
        c.lineTo(tx - 4, top - 8);
        c.lineTo(tx + 4, top - 8);
        c.fill();
      }
      if (this.muck > 0) {
        c.fillStyle = '#f2efe6';
        c.fillRect(x - 8, top + 4, 7, 4);
        c.fillRect(x + 4, top + 12, 5, 3);
      }
      if (this.bigT > 0 && this.bigT < 2 && ((this.t * 8) | 0) % 2) {
        c.strokeStyle = '#ff7ab0';
        c.strokeRect(x - h - 3, top - 4, 2 * h + 6, bot - top + 4);
      }
      for (const p of this.pops) {
        if (p.t > 0.9) continue;
        label(c, p.txt, p.x, p.y - p.t * 26, 11, p.col, 'center');
      }
      label(c, String(this.score), 8, 18, 14, '#ffffff');
      if (this.mult > 1) label(c, 'x' + this.mult, 8, 32, 11, '#7dff9a');
      label(c, Math.max(0, Math.ceil(C.secs - this.t)) + 's', W - 8, 18, 11, '#ffffff', 'right');
    }

    thing(c, it) {
      const x = it.x, y = it.y;
      if (it.kind === 'splat') {
        c.fillStyle = '#f2efe6';
        c.beginPath();
        c.arc(x, y, 5, 0, TAU);
        c.fill();
        c.fillRect(x - 1, y - 9, 2, 5);
        c.fillStyle = '#9aa0a8';
        c.fillRect(x - 1, y - 1, 3, 2);
        return;
      }
      if (it.kind === 'star') {
        c.fillStyle = '#ff7ab0';
        c.beginPath();
        for (let i = 0; i <= 10; i++) {
          const a = it.ph * 0.5 + (i * PI) / 5, r = i % 2 ? 3 : 8;
          if (i === 0) c.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
          else c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
        }
        c.fill();
        return;
      }
      const col = it.kind === 'gold' ? '#ffd24a' : it.kind === 'mackerel' ? '#3a7ac8' : '#c8d6e0';
      const s = it.kind === 'mackerel' ? 1.2 : 1;
      c.save();
      c.translate(x, y);
      c.rotate(it.held ? 0 : it.flop > 0 ? Math.sin(it.flop * 30) * 0.4 : PI / 2 + Math.sin(it.ph) * 0.3);
      c.fillStyle = col;
      c.beginPath();
      c.ellipse(0, 0, 9 * s, 4 * s, 0, 0, TAU);
      c.moveTo(7 * s, 0);
      c.lineTo(13 * s, -5 * s);
      c.lineTo(13 * s, 5 * s);
      c.fill();
      if (it.kind === 'mackerel') {
        c.fillStyle = '#1a3a6a';
        for (const k of [-4, 0, 4]) c.fillRect(k, -4, 2, 3);
      }
      c.fillStyle = '#111';
      c.fillRect(-6 * s, -2, 2, 2);
      c.restore();
    }

    /** The attract mode's player: under the fish that will land soonest, out from under the splats. */
    demo(I) {
      clearIn(I);
      const C = CATCH;
      let best = null, bt = 1e9;
      for (const it of this.items) {
        if (!it.on || it.held || it.flop > 0 || it.kind === 'splat' || it.y > C.rim) continue;
        const tt = (C.rim - it.y) / Math.max(40, it.vy + 60);
        if (tt < bt) {
          bt = tt;
          best = it;
        }
      }
      let tx = best ? best.x : W / 2;
      for (const it of this.items) {
        if (!it.on || it.held || it.kind !== 'splat' || it.y > C.rim) continue;
        if (Math.abs(it.x - this.x) < this.half + 6 && C.rim - it.y < 60) tx = it.x + (this.x > it.x ? 1 : -1) * (this.half + 14);
      }
      const d = tx - this.x;
      I.x = Math.abs(d) < 4 ? 0 : clamp(d / 30, -1, 1);
      return I;
    }
  }

  // ============================================================ SERPENT SUPPER
  // A young sea serpent in a rocky lagoon: steer it to the shrimp and it grows a segment for each. A
  // golden pearl turns up now and then (grab it before it sinks). More rocks wash in as the tide turns,
  // and it swims faster as it goes. Bumping a rock, the lagoon's edge or its own tail costs one of
  // three lives (it shrinks to half and starts again in the middle). 75 seconds; every segment at the
  // end is worth 5 more.
  const SERP = {
    secs: 75,
    cols: 32, //       the lagoon's grid (10 px cells), below a 20 px strip for the score
    rows: 21,
    cell: 10,
    top: 22,
    rate0: 6.5, //     cells a second at the start, at the end
    rate1: 11,
    len0: 4,
    lives: 3,
    rocks0: 4, //      rocks to start, two more every rocksEvery seconds
    rocksEvery: 15,
    pearlEvery: 9, //  a pearl comes this often and stays this long
    pearlFor: 5.5,
    mouse: 0.04, //    a mouse flick this far (radians) turns the serpent
  };
  const SERP_MAX = SERP.cols * SERP.rows + 2;
  const SERP_D = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  class Serpent {
    constructor() {
      this.title = 'SERPENT SUPPER';
      this.ink = '#7dff6a';
      this.bx = new Int16Array(SERP_MAX); // the body's cells, head first (one more than its length: the cell just left)
      this.by = new Int16Array(SERP_MAX);
      this.grid = new Uint8Array(SERP.cols * SERP.rows); // 1 rock, 2 body
      this.rocks = [];
      this.food = [{ x: -1, y: 0 }, { x: -1, y: 0 }];
      this.pearl = { x: -1, y: 0, t: 0 };
      this.turns = [];
      this.pops = [];
      for (let i = 0; i < 5; i++) this.pops.push({ t: 9, x: 0, y: 0, txt: '', col: '' });
      this._popI = 0;
      this.sfx = () => {};
      this.reset(1);
    }

    reset(seed) {
      this.rnd = rng(seed);
      this.t = 0;
      this.score = 0;
      this.over = null;
      this.lives = SERP.lives;
      this.eaten = 0;
      this.pearls = 0;
      this.longest = SERP.len0;
      this.grid.fill(0);
      this.rocks.length = 0;
      for (let i = 0; i < SERP.rocks0; i++) this.addRock();
      this.spawn(SERP.len0);
      this.food[0].x = this.food[1].x = -1;
      this.place(this.food[0]);
      this.pearl.x = -1;
      this.pearlNext = SERP.pearlEvery;
      this.rockNext = SERP.rocksEvery;
      this.mxAcc = 0;
      this.myAcc = 0;
      for (const p of this.pops) p.t = 9;
    }

    /** The serpent, from the middle, heading right. */
    spawn(len) {
      const S = SERP;
      for (let i = 0; i < this.grid.length; i++) if (this.grid[i] === 2) this.grid[i] = 0;
      const y = (S.rows / 2) | 0, x0 = 10;
      // Clear its way.
      for (let x = x0 - len - 1; x < x0 + 8; x++) if (this.grid[y * S.cols + x] === 1) this.grid[y * S.cols + x] = 0;
      this.rocks = this.rocks.filter((r) => this.grid[r.y * S.cols + r.x] === 1);
      this.len = len;
      for (let i = 0; i <= len; i++) {
        this.bx[i] = x0 - i;
        this.by[i] = y;
        if (i < len) this.grid[y * S.cols + x0 - i] = 2;
      }
      this.dx = 1;
      this.dy = 0;
      this.turns.length = 0;
      this.p = 0; //       how far into the next step (0..1)
      this.ready = 1.0; // a moment to get going
      this.hurt = 0;
    }

    free(x, y) {
      return x >= 0 && y >= 0 && x < SERP.cols && y < SERP.rows && this.grid[y * SERP.cols + x] === 0;
    }

    /** A free cell for something to appear in, not right in front of the serpent. */
    place(o) {
      const S = SERP;
      for (let k = 0; k < 200; k++) {
        const x = 1 + ((this.rnd() * (S.cols - 2)) | 0), y = 1 + ((this.rnd() * (S.rows - 2)) | 0);
        if (!this.free(x, y)) continue;
        if (Math.abs(x - this.bx[0]) + Math.abs(y - this.by[0]) < 4) continue;
        if (this.food.some((f) => f !== o && f.x === x && f.y === y) || (this.pearl !== o && this.pearl.x === x && this.pearl.y === y)) continue;
        o.x = x;
        o.y = y;
        return true;
      }
      o.x = -1;
      return false;
    }

    addRock() {
      const S = SERP;
      for (let k = 0; k < 100; k++) {
        const x = 2 + ((this.rnd() * (S.cols - 4)) | 0), y = 2 + ((this.rnd() * (S.rows - 4)) | 0);
        if (!this.free(x, y) || y === ((S.rows / 2) | 0)) continue;
        if (this.food.some((f) => f.x === x && f.y === y)) continue;
        if (this.len && Math.abs(x - this.bx[0]) + Math.abs(y - this.by[0]) < 6) continue;
        this.grid[y * S.cols + x] = 1;
        this.rocks.push({ x, y, s: this.rnd() });
        return;
      }
    }

    get rate() {
      return SERP.rate0 + ((SERP.rate1 - SERP.rate0) * Math.min(1, this.t / SERP.secs));
    }

    line() {
      const bits = [this.eaten + ' shrimp', 'grew to ' + this.longest];
      if (this.pearls) bits.push(this.pearls + (this.pearls === 1 ? ' pearl' : ' pearls'));
      return bits.join(', ');
    }

    pop(txt, x, y, col) {
      const p = this.pops[this._popI++ % this.pops.length];
      p.t = 0;
      p.txt = txt;
      p.x = x;
      p.y = y;
      p.col = col || '#ffffff';
    }

    /** Ask to turn (queued: two quick taps make a U-turn round a corner). */
    turn(dx, dy) {
      const last = this.turns.length ? this.turns[this.turns.length - 1] : [this.dx, this.dy];
      if ((dx === last[0] && dy === last[1]) || (dx === -last[0] && dy === -last[1])) return;
      if (this.turns.length < 2) this.turns.push([dx, dy]);
    }

    step(dt, I) {
      if (this.over) return;
      const S = SERP;
      this.t += dt;
      for (const p of this.pops) p.t += dt;
      if (this.t >= S.secs) {
        const bonus = this.len * 5;
        this.score += bonus;
        this.pop('LENGTH ' + this.len + ' +' + bonus, W / 2, 120, '#7dff6a');
        this.over = 'TIME!';
        return;
      }
      // Steering: a tap on the keys or the stick, or a flick of the mouse.
      if (I.upP || (I.y > 0.6 && this._sy <= 0.6)) this.turn(0, -1);
      if (I.downP || (I.y < -0.6 && this._sy >= -0.6)) this.turn(0, 1);
      if (I.leftP || (I.x < -0.6 && this._sx >= -0.6)) this.turn(-1, 0);
      if (I.rightP || (I.x > 0.6 && this._sx <= 0.6)) this.turn(1, 0);
      this._sx = I.x;
      this._sy = I.y;
      this.mxAcc = this.mxAcc * 0.85 + I.mx;
      this.myAcc = this.myAcc * 0.85 + I.my;
      if (Math.abs(this.mxAcc) > S.mouse || Math.abs(this.myAcc) > S.mouse) {
        if (Math.abs(this.mxAcc) > Math.abs(this.myAcc)) this.turn(this.mxAcc > 0 ? 1 : -1, 0);
        else this.turn(0, this.myAcc > 0 ? -1 : 1);
        this.mxAcc = this.myAcc = 0;
      }
      // The tide: more rocks; a pearl now and then.
      if ((this.rockNext -= dt) <= 0) {
        this.rockNext = S.rocksEvery;
        this.addRock();
        this.addRock();
      }
      if (this.pearl.x >= 0) {
        if ((this.pearl.t -= dt) <= 0) this.pearl.x = -1;
      } else if ((this.pearlNext -= dt) <= 0) {
        this.pearlNext = S.pearlEvery;
        if (this.place(this.pearl)) this.pearl.t = S.pearlFor;
      }
      if (this.t > 30 && this.food[1].x < 0) this.place(this.food[1]);
      this.hurt = Math.max(0, this.hurt - dt);
      if (this.ready > 0) {
        this.ready -= dt;
        return;
      }
      this.p += dt * this.rate;
      while (this.p >= 1 && !this.over) {
        this.p -= 1;
        this.move();
      }
    }

    /** One cell on. */
    move() {
      const S = SERP;
      if (this.turns.length) {
        const [dx, dy] = this.turns.shift();
        this.dx = dx;
        this.dy = dy;
      }
      const hx = this.bx[0] + this.dx, hy = this.by[0] + this.dy;
      // The tail moves out of the way first (unless it is about to grow).
      const eats = this.food[0].x === hx && this.food[0].y === hy ? 0 : this.food[1].x === hx && this.food[1].y === hy ? 1 : -1;
      const tx = this.bx[this.len - 1], ty = this.by[this.len - 1];
      if (eats < 0) this.grid[ty * S.cols + tx] = 0;
      if (!this.free(hx, hy)) {
        if (eats < 0) this.grid[ty * S.cols + tx] = 2;
        this.crash(hx, hy);
        return;
      }
      if (eats >= 0) this.len = Math.min(SERP_MAX - 2, this.len + 1);
      for (let i = this.len; i > 0; i--) {
        this.bx[i] = this.bx[i - 1];
        this.by[i] = this.by[i - 1];
      }
      this.bx[0] = hx;
      this.by[0] = hy;
      this.grid[hy * S.cols + hx] = 2;
      const px = hx * S.cell + S.cell / 2, py = S.top + hy * S.cell;
      if (eats >= 0) {
        this.eaten++;
        this.longest = Math.max(this.longest, this.len);
        const pts = 10 + Math.floor(this.len / 8) * 5;
        this.score += pts;
        this.pop('+' + pts, px, py, '#ff9ac8');
        this.sfx('chip', { f: 600 + Math.min(20, this.len) * 25, len: 0.07, gain: 0.6 });
        this.food[eats].x = -1;
        this.place(this.food[eats]);
      }
      if (this.pearl.x === hx && this.pearl.y === hy) {
        this.pearls++;
        this.score += 50;
        this.pearl.x = -1;
        this.pop('PEARL +50', px, py, '#ffd24a');
        this.sfx('ding', { gain: 0.45 });
      }
    }

    crash(hx, hy) {
      this.lives--;
      this.hurt = 0.8;
      this.sfx('buzz', { gain: 0.5 });
      this.pop(hx < 0 || hy < 0 || hx >= SERP.cols || hy >= SERP.rows ? 'BONK!' : 'OUCH!', clamp(hx, 1, SERP.cols - 2) * SERP.cell, SERP.top + clamp(hy, 1, SERP.rows - 2) * SERP.cell, '#ff8a8a');
      if (this.lives <= 0) {
        const bonus = this.len * 5;
        this.score += bonus;
        this.over = 'GAME OVER';
        this.sfx('lose', { gain: 0.5 });
        return;
      }
      this.spawn(Math.max(SERP.len0, Math.floor(this.len / 2)));
    }

    draw(c) {
      const S = SERP, Z = S.cell;
      // The lagoon: sand all round, teal water, ripples.
      c.fillStyle = '#e8c87a';
      c.fillRect(0, 0, W, H);
      c.fillStyle = '#1f8a8a';
      c.fillRect(0, S.top, S.cols * Z, S.rows * Z);
      c.fillStyle = 'rgba(255,255,255,0.08)';
      for (let y = S.top + 6; y < S.top + S.rows * Z; y += 16) for (let x = ((y * 3 + this.t * 8) % 32) - 32; x < W; x += 32) c.fillRect(x, y, 12, 1);
      // Rocks with a little weed on them.
      for (const r of this.rocks) {
        const x = r.x * Z, y = S.top + r.y * Z;
        c.fillStyle = '#6b6f78';
        c.fillRect(x, y + 1, Z, Z - 1);
        c.fillStyle = '#8a8f99';
        c.fillRect(x + 1, y + 1, Z - 4, 3);
        c.fillStyle = '#3fae5a';
        c.fillRect(x + 2 + ((r.s * 5) | 0), y - 2, 2, 4);
      }
      // Shrimp and the pearl.
      for (const f of this.food) {
        if (f.x < 0) continue;
        const x = f.x * Z + Z / 2, y = S.top + f.y * Z + Z / 2;
        c.strokeStyle = '#ff9ac8';
        c.lineWidth = 3;
        c.beginPath();
        c.arc(x, y + Math.sin(this.t * 6 + f.x) * 0.8, 3.5, -0.3, PI + 0.6);
        c.stroke();
        c.fillStyle = '#111';
        c.fillRect(x + 2, y - 2, 1, 1);
      }
      if (this.pearl.x >= 0 && (this.pearl.t > 1.5 || ((this.t * 8) | 0) % 2)) {
        const x = this.pearl.x * Z + Z / 2, y = S.top + this.pearl.y * Z + Z / 2;
        c.fillStyle = '#fff6c8';
        c.beginPath();
        c.arc(x, y, 4.5, 0, TAU);
        c.fill();
        c.fillStyle = '#ffd24a';
        c.fillRect(x - 1, y - 3, 2, 2);
      }
      // The serpent: segments slide from cell to cell, the head with eyes and a fin.
      const p = this.ready > 0 ? 0 : clamp(this.p, 0, 1);
      if (this.hurt > 0 && ((this.t * 12) | 0) % 2) {
        // (blinking after a bump)
      } else {
        for (let i = this.len - 1; i >= 0; i--) {
          const x = (this.bx[i + 1] + (this.bx[i] - this.bx[i + 1]) * p) * Z + Z / 2;
          const y = S.top + (this.by[i + 1] + (this.by[i] - this.by[i + 1]) * p) * Z + Z / 2;
          const r = i === 0 ? 5.5 : Math.max(2.5, 5 - (i / this.len) * 2.5);
          c.fillStyle = i % 3 === 1 ? '#3fae5a' : '#5ad26a';
          c.beginPath();
          c.arc(x, y, r, 0, TAU);
          c.fill();
          if (i === 0) {
            c.fillStyle = '#ffffff';
            const ex = -this.dy * 2.5, ey = this.dx * 2.5;
            c.fillRect(x + ex + this.dx * 2 - 1, y + ey + this.dy * 2 - 1, 2, 2);
            c.fillRect(x - ex + this.dx * 2 - 1, y - ey + this.dy * 2 - 1, 2, 2);
            c.fillStyle = '#ff7ab0';
            c.fillRect(x - this.dx * 3 - 1, y - this.dy * 3 - 1, 3, 3);
          }
        }
      }
      for (const q of this.pops) {
        if (q.t > 0.9) continue;
        label(c, q.txt, q.x, q.y - q.t * 22, 10, q.col, 'center');
      }
      label(c, String(this.score), 6, 15, 13, '#1a1030');
      label(c, 'LENGTH ' + this.len, 92, 15, 10, '#1a6a2a');
      for (let i = 0; i < S.lives; i++) {
        c.fillStyle = i < this.lives ? '#3fae5a' : 'rgba(0,0,0,0.15)';
        c.beginPath();
        c.arc(210 + i * 14, 10, 5, 0, TAU);
        c.fill();
      }
      label(c, Math.max(0, Math.ceil(S.secs - this.t)) + 's', W - 6, 15, 11, '#1a1030', 'right');
      if (this.ready > 0 && this.t > 0.2) label(c, 'READY...', W / 2, 130, 14, '#ffffff', 'center');
    }

    /** The attract mode's player: heads for the nearest shrimp, turning away from what's in front. */
    demo(I) {
      clearIn(I);
      if (this.ready > 0 || this.turns.length) return I;
      const d = this.plan(1);
      if (d) {
        if (d[0] > 0) I.rightP = true;
        else if (d[0] < 0) I.leftP = true;
        else if (d[1] < 0) I.upP = true;
        else I.downP = true;
      }
      return I;
    }

    /**
     * Which way to go next ([dx, dy], or null to carry on): a breadth-first search from the head to the
     * nearest shrimp or pearl (look = 1), or just the free way with the most room if there is no path.
     */
    plan(look) {
      const S = SERP, N = S.cols * S.rows;
      if (!this._seen) {
        this._seen = new Int16Array(N);
        this._q = new Int16Array(N);
      }
      const seen = this._seen, q = this._q;
      seen.fill(-1);
      const hx = this.bx[0], hy = this.by[0];
      const D = SERP_D, F0 = this.food[0], F1 = this.food[1], P = this.pearl;
      let qh = 0, qt = 0;
      for (let k = 0; k < 4; k++) {
        const [dx, dy] = D[k];
        if (dx === -this.dx && dy === -this.dy) continue;
        const x = hx + dx, y = hy + dy;
        if (!this.free(x, y)) continue;
        seen[y * S.cols + x] = k;
        q[qt++] = y * S.cols + x;
      }
      while (qh < qt && look) {
        const i = q[qh++], x = i % S.cols, y = (i / S.cols) | 0;
        if ((F0.x === x && F0.y === y) || (F1.x === x && F1.y === y) || (P.x === x && P.y === y)) {
          const k = seen[i];
          return D[k][0] === this.dx && D[k][1] === this.dy ? null : D[k];
        }
        for (let k = 0; k < 4; k++) {
          const nx = x + D[k][0], ny = y + D[k][1];
          if (!this.free(nx, ny)) continue;
          const j = ny * S.cols + nx;
          if (seen[j] >= 0) continue;
          seen[j] = seen[i];
          q[qt++] = j;
        }
      }
      // No way to food: the move with the most room behind it.
      let best = null, room = -1;
      for (let k = 0; k < 4; k++) {
        const [dx, dy] = D[k];
        if (dx === -this.dx && dy === -this.dy) continue;
        if (!this.free(hx + dx, hy + dy)) continue;
        let n = 0;
        for (let i = 0; i < N; i++) if (seen[i] === k) n++;
        if (n > room) {
          room = n;
          best = D[k];
        }
      }
      return best && (best[0] !== this.dx || best[1] !== this.dy) ? best : null;
    }
  }

  // ============================================================== REEF REBOUND
  // Under the pier, a clam shell for a bat and a pearl for a ball: knock the pearl up into the coral and
  // break it (pale coral takes one knock, orange two, purple three), and the little fish hiding in it
  // swim off. Bubbles float down from broken coral now and then: catch one on the shell for a wider
  // shell, three pearls at once, or a slower tide. Three pearls to lose; clear a reef and the next one
  // grows. 90 seconds.
  const REEF = {
    secs: 90,
    cols: 10,
    rows: 6,
    bw: 30, //          a coral block, the gap round it, the reef's top
    bh: 11,
    gap: 2,
    top: 38,
    left: 1,
    shellY: 214, //     the shell's top
    half: 26, //        half the shell's width (wide: 38)
    halfWide: 38,
    speed: 330, //      the shell on the keys / stick (px/s), the mouse (px per radian)
    mouse: 450,
    v0: 155, //         the pearl's speed at the start of a reef, and what it gains each knock (to the most)
    vk: 2.2,
    vmax: 280,
    r: 3.5,
    lives: 3,
    dropChance: 0.13,
  };
  const REEF_PROBE = [[0, -1], [0, 1], [-1, 0], [1, 0]]; // the pearl's edge: top, bottom, left, right
  // The reefs, row by row (0 none, 1 pale, 2 orange, 3 purple), from the top.
  const REEFS = [
    ['0333333330', '2222222222', '1111111111', '1111111111', '0111111110', '0011111100'],
    ['3000330003', '2202222022', '1111111111', '1122112211', '1111111111', '0101111010'],
    ['3333333333', '2222002222', '2111111112', '1110000111', '1111111111', '1111111111'],
  ];

  class Reef {
    constructor() {
      this.title = 'REEF REBOUND';
      this.ink = '#ff7ab0';
      this.coral = new Uint8Array(REEF.cols * REEF.rows);
      this.balls = [];
      for (let i = 0; i < 3; i++) this.balls.push({ on: false, x: 0, y: 0, vx: 0, vy: 0, stuck: false });
      this.drops = [];
      for (let i = 0; i < 4; i++) this.drops.push({ on: false, x: 0, y: 0, kind: '' });
      this.fish = [];
      for (let i = 0; i < 10; i++) this.fish.push({ t: 9, x: 0, y: 0, dir: 1, col: '' });
      this._fishI = 0;
      this.pops = [];
      for (let i = 0; i < 5; i++) this.pops.push({ t: 9, x: 0, y: 0, txt: '', col: '' });
      this._popI = 0;
      this.sfx = () => {};
      this.reset(1);
    }

    reset(seed) {
      this.rnd = rng(seed);
      this.t = 0;
      this.score = 0;
      this.over = null;
      this.lives = REEF.lives;
      this.level = 0;
      this.broken = 0;
      this.reefs = 0;
      this.x = W / 2;
      this.vx = 0;
      this.wide = 0;
      this.slow = 0;
      this.hits = 0;
      this.grow(0);
      for (const f of this.fish) f.t = 9;
      for (const p of this.pops) p.t = 9;
    }

    /** A new reef (and the pearl back on the shell). */
    grow(n) {
      const L = REEFS[n % REEFS.length];
      for (let r = 0; r < REEF.rows; r++) for (let c = 0; c < REEF.cols; c++) this.coral[r * REEF.cols + c] = +L[r][c] + (n >= REEFS.length && L[r][c] === '1' ? 1 : 0);
      this.left = 0;
      for (let i = 0; i < this.coral.length; i++) if (this.coral[i]) this.left++;
      for (const d of this.drops) d.on = false;
      this.serve();
    }

    serve() {
      for (const b of this.balls) b.on = false;
      const b = this.balls[0];
      b.on = true;
      b.stuck = true;
      b.x = this.x;
      b.y = REEF.shellY - REEF.r - 1;
      this.hits = 0;
      this.run = 0;
      this.stuckT = 0;
    }

    get half() {
      return this.wide > 0 ? REEF.halfWide : REEF.half;
    }
    get v() {
      return Math.min(REEF.vmax, REEF.v0 + this.level * 12 + this.hits * REEF.vk) * (this.slow > 0 ? 0.7 : 1);
    }

    line() {
      const bits = [this.broken + ' coral broken'];
      if (this.reefs) bits.push(this.reefs + (this.reefs === 1 ? ' reef cleared' : ' reefs cleared'));
      return bits.join(', ');
    }

    pop(txt, x, y, col) {
      const p = this.pops[this._popI++ % this.pops.length];
      p.t = 0;
      p.txt = txt;
      p.x = x;
      p.y = y;
      p.col = col || '#ffffff';
    }

    /** Off a ball goes, at angle a from straight up (radians, + to the right). */
    launch(b, a) {
      const v = this.v;
      b.stuck = false;
      b.vx = Math.sin(a) * v;
      b.vy = -Math.cos(a) * v;
    }

    step(dt, I) {
      if (this.over) return;
      const R = REEF;
      this.t += dt;
      for (const p of this.pops) p.t += dt;
      for (const f of this.fish) {
        if (f.t > 2) continue;
        f.t += dt;
        f.x += f.dir * 60 * dt;
        f.y -= 8 * dt;
      }
      if (this.t >= R.secs) {
        this.over = 'TIME!';
        this.score += this.lives * 50;
        return;
      }
      this.wide = Math.max(0, this.wide - dt);
      this.slow = Math.max(0, this.slow - dt);
      // The shell.
      const want = I.x * R.speed;
      this.vx += clamp(want - this.vx, -3000 * dt, 3000 * dt);
      this.x += this.vx * dt + I.mx * R.mouse;
      const h = this.half;
      if (this.x < h || this.x > W - h) {
        this.x = clamp(this.x, h, W - h);
        this.vx = 0;
      }
      // Pearls.
      let live = 0;
      for (const b of this.balls) {
        if (!b.on) continue;
        if (b.stuck) {
          b.x = this.x + 6;
          b.y = R.shellY - R.r - 1;
          this.stuckT += dt;
          // The button lets it go (or it goes by itself after a few seconds).
          if (I.aP || this.stuckT > 3) {
            this.launch(b, 0.35 + this.rnd() * 0.15);
            this.sfx('chip', { f: 500, f1: 800, len: 0.08, gain: 0.5 });
          }
          live++;
          continue;
        }
        this.fly(b, dt);
        if (b.on) live++;
      }
      if (!live) {
        this.lives--;
        this.sfx('lose', { gain: 0.4 });
        if (this.lives <= 0) {
          this.over = 'GAME OVER';
          return;
        }
        this.pop('PEARL LOST', W / 2, 150, '#ff8a8a');
        this.serve();
      }
      // Bubbles drifting down.
      for (const d of this.drops) {
        if (!d.on) continue;
        d.y += 55 * dt;
        if (d.y >= R.shellY - 4 && d.y <= R.shellY + 6 && Math.abs(d.x - this.x) < this.half + 4) {
          d.on = false;
          this.score += 25;
          if (d.kind === 'wide') this.wide = 12;
          else if (d.kind === 'slow') this.slow = 10;
          else this.triple();
          this.pop(d.kind === 'wide' ? 'WIDE SHELL!' : d.kind === 'slow' ? 'SLOW TIDE!' : 'THREE PEARLS!', this.x, R.shellY - 14, '#7dff9a');
          this.sfx('win', { gain: 0.35 });
        } else if (d.y > H + 8) d.on = false;
      }
    }

    triple() {
      const src = this.balls.find((b) => b.on && !b.stuck) || this.balls.find((b) => b.on);
      if (!src) return;
      if (src.stuck) this.launch(src, 0.3);
      const sp = Math.hypot(src.vx, src.vy) || this.v;
      let k = 0;
      for (const b of this.balls) {
        if (b.on) continue;
        const a = Math.atan2(src.vx, -src.vy) + (k++ ? -0.5 : 0.5);
        b.on = true;
        b.stuck = false;
        b.x = src.x;
        b.y = src.y;
        b.vx = Math.sin(a) * sp;
        b.vy = -Math.cos(a) * sp;
      }
    }

    fly(b, dt) {
      const R = REEF;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      // Walls and the surface.
      if (b.x < R.r) {
        b.x = R.r;
        b.vx = Math.abs(b.vx);
        this.sfx('chip', { f: 300, len: 0.03, gain: 0.3 });
      } else if (b.x > W - R.r) {
        b.x = W - R.r;
        b.vx = -Math.abs(b.vx);
        this.sfx('chip', { f: 300, len: 0.03, gain: 0.3 });
      }
      if (b.y < 22 + R.r) {
        b.y = 22 + R.r;
        b.vy = Math.abs(b.vy);
      }
      // The shell: the further from its middle, the steeper it goes off.
      if (b.vy > 0 && b.y >= R.shellY - R.r && b.y <= R.shellY + 6 && Math.abs(b.x - this.x) <= this.half + R.r) {
        const off = clamp((b.x - this.x) / this.half, -1, 1);
        this.hits++;
        this.run = 0;
        this.launch(b, off * 1.05);
        b.y = R.shellY - R.r;
        this.sfx('chip', { f: 440, len: 0.05, gain: 0.5 });
      }
      if (b.y > H + 10) {
        b.on = false;
        return;
      }
      // Coral: the block the pearl's edge has gone into, bounced off the side it came in by.
      const top = R.top, cw = R.bw + R.gap, ch = R.bh + R.gap;
      if (b.y - R.r > top + R.rows * ch || b.y + R.r < top) return;
      for (let k = 0; k < 4; k++) {
        const ox = REEF_PROBE[k][0], oy = REEF_PROBE[k][1];
        const px = b.x + ox * R.r, py = b.y + oy * R.r;
        const c = Math.floor((px - R.left) / cw), r = Math.floor((py - top) / ch);
        if (c < 0 || r < 0 || c >= R.cols || r >= R.rows) continue;
        const i = r * R.cols + c;
        if (!this.coral[i]) continue;
        if (ox) b.vx = -ox * Math.abs(b.vx);
        else b.vy = -oy * Math.abs(b.vy);
        this.knock(i, c, r);
        return;
      }
    }

    knock(i, c, r) {
      const R = REEF;
      const hard = this.coral[i];
      this.coral[i]--;
      const x = R.left + c * (R.bw + R.gap) + R.bw / 2, y = R.top + r * (R.bh + R.gap) + R.bh / 2;
      if (this.coral[i]) {
        this.score += 5;
        this.sfx('chip', { f: 250, len: 0.05, gain: 0.5 });
        return;
      }
      // Coral broken on one flight (before the pearl is back on the shell) scores more and more.
      this.run = Math.min(5, (this.run || 0) + 1);
      const pts = (hard * 10 + this.level * 5) * this.run;
      this.score += pts;
      this.broken++;
      this.left--;
      this.pop('+' + pts, x, y, '#ffffff');
      this.sfx('chip', { f: 900 + r * 60, len: 0.07, gain: 0.55 });
      const f = this.fish[this._fishI++ % this.fish.length];
      f.t = 0;
      f.x = x;
      f.y = y;
      f.dir = this.rnd() < 0.5 ? -1 : 1;
      f.col = ['#ffd24a', '#37e8ff', '#ff9a3c'][(c + r) % 3];
      if (this.rnd() < REEF.dropChance) {
        const d = this.drops.find((q) => !q.on);
        if (d) {
          d.on = true;
          d.x = x;
          d.y = y;
          d.kind = ['wide', 'triple', 'slow'][(this.rnd() * 3) | 0];
        }
      }
      if (this.left <= 0) {
        this.reefs++;
        this.level++;
        this.score += 200;
        this.pop('REEF CLEARED! +200', W / 2, 120, '#7dff9a');
        this.sfx('win', { gain: 0.5 });
        this.grow(this.level);
      }
    }

    draw(c) {
      const R = REEF;
      const grd = c.createLinearGradient(0, 0, 0, H);
      grd.addColorStop(0, '#1a6aa0');
      grd.addColorStop(1, '#0a2a50');
      c.fillStyle = grd;
      c.fillRect(0, 0, W, H);
      // Light from above, the pier's posts, sand.
      c.fillStyle = 'rgba(255,255,255,0.06)';
      for (let k = 0; k < 4; k++) {
        const x = ((k * 97 + this.t * 6) % 360) - 20;
        c.beginPath();
        c.moveTo(x, 22);
        c.lineTo(x + 24, 22);
        c.lineTo(x - 30, H);
        c.lineTo(x - 60, H);
        c.fill();
      }
      c.fillStyle = '#e8c87a';
      c.fillRect(0, H - 8, W, 8);
      // The coral.
      const cols = ['', '#ffc8c0', '#ff9a3c', '#b45cff'];
      for (let r = 0; r < R.rows; r++) for (let k = 0; k < R.cols; k++) {
        const v = this.coral[r * R.cols + k];
        if (!v) continue;
        const x = R.left + k * (R.bw + R.gap), y = R.top + r * (R.bh + R.gap);
        c.fillStyle = cols[Math.min(3, v)];
        c.fillRect(x, y, R.bw, R.bh);
        c.fillStyle = 'rgba(255,255,255,0.35)';
        c.fillRect(x + 2, y + 1, R.bw - 6, 2);
        c.fillStyle = 'rgba(0,0,0,0.18)';
        for (let d = 5; d < R.bw; d += 8) c.fillRect(x + d, y + 4 + ((d + r) % 3), 2, 2);
      }
      // Fish that were hiding in it.
      for (const f of this.fish) {
        if (f.t > 2) continue;
        c.fillStyle = f.col;
        c.fillRect(f.x - 4, f.y - 2, 7, 4);
        c.fillRect(f.x - f.dir * 5, f.y - 3, 2, 6);
      }
      // Bubbles.
      for (const d of this.drops) {
        if (!d.on) continue;
        c.strokeStyle = '#dff8ff';
        c.lineWidth = 1.5;
        c.beginPath();
        c.arc(d.x, d.y, 7, 0, TAU);
        c.stroke();
        label(c, d.kind === 'wide' ? 'W' : d.kind === 'slow' ? 'S' : '3', d.x, d.y + 4, 9, '#7dff9a', 'center');
      }
      // The shell.
      const h = this.half;
      c.fillStyle = '#ff9ac8';
      c.beginPath();
      c.ellipse(this.x, R.shellY + 4, h, 6, 0, PI, TAU);
      c.fill();
      c.fillStyle = '#ffd0e6';
      for (let k = -h + 6; k < h - 3; k += 7) c.fillRect(this.x + k, R.shellY + 1, 2, 3);
      c.fillStyle = '#c85a8a';
      c.fillRect(this.x - h, R.shellY + 4, 2 * h, 2);
      // Pearls.
      for (const b of this.balls) {
        if (!b.on) continue;
        c.fillStyle = '#fff6f0';
        c.beginPath();
        c.arc(b.x, b.y, R.r, 0, TAU);
        c.fill();
        c.fillStyle = '#ffffff';
        c.fillRect(b.x - 2, b.y - 2, 1.5, 1.5);
      }
      for (const p of this.pops) {
        if (p.t > 0.9) continue;
        label(c, p.txt, p.x, p.y - p.t * 22, 10, p.col, 'center');
      }
      c.fillStyle = 'rgba(10,20,40,0.6)';
      c.fillRect(0, 0, W, 22);
      label(c, String(this.score), 6, 16, 13, '#ffffff');
      for (let i = 0; i < this.lives; i++) {
        c.fillStyle = '#fff6f0';
        c.beginPath();
        c.arc(140 + i * 12, 11, 4, 0, TAU);
        c.fill();
      }
      label(c, 'REEF ' + (this.level + 1), 196, 16, 10, '#ff9ac8');
      label(c, Math.max(0, Math.ceil(R.secs - this.t)) + 's', W - 6, 16, 11, '#ffffff', 'right');
      if (this.balls[0].on && this.balls[0].stuck && ((this.t * 3) | 0) % 2) label(c, 'PRESS TO LAUNCH', W / 2, 180, 10, '#ffffff', 'center');
    }

    /** Where a ball coming down will reach the shell's line (walls bounced off), or null. */
    landing(b) {
      if (!b.on || b.stuck || b.vy <= 0) return null;
      const t = (REEF.shellY - REEF.r - b.y) / b.vy;
      if (t < 0) return null;
      let x = b.x + b.vx * t;
      const span = W - 2 * REEF.r;
      x -= REEF.r;
      x = ((x % (2 * span)) + 2 * span) % (2 * span);
      if (x > span) x = 2 * span - x;
      return x + REEF.r;
    }

    /** The attract mode's player: under the lowest falling pearl, a little to one side to angle it. */
    demo(I) {
      clearIn(I);
      let tx = null, low = -1;
      for (const b of this.balls) {
        const x = this.landing(b);
        if (x !== null && b.y > low) {
          low = b.y;
          tx = x - this.half * 0.35 * Math.sign(W / 2 - x || 1);
        }
      }
      if (tx === null) {
        let b = null;
        for (const q of this.balls) if (q.on && !b) b = q;
        tx = b ? b.x : W / 2;
        if (b && b.stuck) I.a = I.aP = this.t % 2 < 0.05;
      }
      const d = tx - this.x;
      I.x = Math.abs(d) < 3 ? 0 : clamp(d / 25, -1, 1);
      return I;
    }
  }

  // ================================================================ CRAB CONGA
  // A dancing game on the bandstand at the end of the pier. Arrows drift down four lanes to the shells
  // at the bottom in time to the band's tune: press each one as it reaches its shell (the arrow keys,
  // the stick or a flick of the mouse) and the crab on the stage dances the step, and the tune plays
  // on (miss one and that note of the tune drops out). Gold bars across all four lanes are claps: the
  // button. Hits in a row raise the multiplier and grow the conga line of little crabs behind the
  // dancer; a miss, or a press with nothing there, sends the line scuttling off. One song, 75 seconds:
  // a new dance every go to the same tune (the same dance for both players on a two-player go).
  const CONGA = {
    secs: 75,
    beat: 0.5, //        seconds a beat (120 a minute), four to the bar
    lead: 1, //          the count-in before the first bar
    hitY: 200, //        the shells' line and where the arrows come in
    topY: 24,
    lane0: 12, //        the lanes' left edge and width
    laneW: 34,
    perfect: 0.05, //    how far off a press may be (s) for each grade, and how early one can be and still
    great: 0.1, //       count (as a miss) rather than be a press with nothing there
    good: 0.16,
    early: 0.25,
    pts: [10, 6, 3], //  points for perfect, great and good, times the multiplier
    mouse: 0.05, //      a flick of the mouse this far (radians) is an arrow
    max: 260, //         room for the notes and the band's own notes
    maxEv: 1600,
  };
  const CONGA_COLS = ['#ff7ab0', '#37e8ff', '#7dff6a', '#ffd24a', '#ffb92e']; // left, down, up, right; the claps
  const CONGA_ANG = [-PI / 2, PI, 0, PI / 2];
  const CONGA_GRADE = [['PERFECT', '#ffffff'], ['GREAT', '#7dff9a'], ['GOOD', '#37e8ff'], ['TOO EARLY', '#ff9a6a'], ['MISS', '#ff6a6a'], ['OOPS', '#ff6a6a']];
  // The band's tune (original): phrases of four bars, [semitones from middle C, beats]; the chords under them.
  const CONGA_CHORDS = {
    Am: { bass: -15, stab: [9, 12, 16] },
    F: { bass: -19, stab: [5, 9, 12] },
    C: { bass: -12, stab: [4, 7, 12] },
    G: { bass: -17, stab: [2, 7, 11] },
    Em: { bass: -20, stab: [4, 7, 11] },
  };
  const CONGA_PHRASES = {
    A: { chords: ['Am', 'F', 'C', 'G'], tune: [[9, 1], [12, 0.5], [9, 0.5], [7, 1], [4, 1], [5, 0.5], [9, 0.5], [12, 1], [9, 0.5], [5, 0.5], [7, 1], [7, 1], [12, 0.5], [11, 0.5], [12, 1], [16, 1], [14, 1.5], [12, 0.5], [11, 1], [7, 1]] },
    B: { chords: ['Am', 'F', 'C', 'G'], tune: [[16, 1], [14, 0.5], [12, 0.5], [9, 1], [12, 1], [17, 0.5], [16, 0.5], [14, 0.5], [12, 0.5], [9, 1], [5, 1], [7, 0.5], [9, 0.5], [12, 0.5], [14, 0.5], [16, 1], [12, 1], [11, 0.5], [12, 0.5], [14, 1], [11, 1], [7, 1]] },
    C: { chords: ['F', 'G', 'Em', 'Am'], tune: [[12, 1], [9, 1], [12, 1], [17, 1], [14, 1], [11, 1], [14, 1], [19, 1], [16, 0.5], [14, 0.5], [12, 0.5], [11, 0.5], [12, 1], [16, 1], [12, 0.5], [11, 0.5], [9, 1], [4, 1], [9, 1]] },
  };
  const CONGA_SONG = 'ABABCABCB'; // nine phrases (36 bars), then the last chord

  class Conga {
    constructor() {
      this.title = 'CRAB CONGA';
      this.ink = '#ff6a5c';
      const N = CONGA.max, E = CONGA.maxEv;
      // The notes to press: time, lane (0-3 arrows, 4 a clap), state (0 to come, 1 hit, 2 missed),
      // grade, the tune's pitch and length for the sound a hit makes, seconds on screen.
      this.nt = new Float32Array(N);
      this.nl = new Uint8Array(N);
      this.ns = new Uint8Array(N);
      this.np = new Int8Array(N);
      this.nlen = new Float32Array(N);
      this.nlead = new Float32Array(N);
      // The band: time, kind (0 tune, 1 bass, 2 kick, 3 snare, 4 hat, 5 chord), pitch, length.
      this.et = new Float32Array(E);
      this.ek = new Uint8Array(E);
      this.ep = new Int8Array(E);
      this.el = new Float32Array(E);
      this.press = [false, false, false, false, false];
      this.flash = new Float32Array(5); // a shell lit by a hit (+) or a stray press (-)
      this.pops = [];
      for (let i = 0; i < 4; i++) this.pops.push({ t: 9, x: 0, y: 0, txt: '', col: '' });
      this._popI = 0;
      this.sfx = () => {};
      this.reset(1);
    }

    reset(seed) {
      this.rnd = rng(seed);
      this.t = 0;
      this.score = 0;
      this.over = null;
      this.combo = 0;
      this.best = 0;
      this.hits = 0;
      this.perfects = 0;
      this.misses = 0;
      this.move = -1; //   the crab's step (a lane) and how long ago
      this.moveT = 9;
      this.gone = 0; //    crabs that left the conga line, and how long ago
      this.goneT = 9;
      this.cheer = -9;
      this.mxAcc = this.myAcc = 0;
      this._sx = this._sy = 0;
      this.flash.fill(0);
      for (const p of this.pops) p.t = 9;
      this.compose();
    }

    /** The song: the band's notes and the dance to it (the arrows), from the seed. */
    compose() {
      const C = CONGA, B = C.beat;
      const ev = [], mel = [];
      CONGA_SONG.split('').forEach((name, k) => {
        const P = CONGA_PHRASES[name], b0 = k * 16;
        let bt = 0;
        for (const [p, len] of P.tune) {
          const e = { t: C.lead + (b0 + bt) * B, k: 0, p, l: len * B * 0.85 };
          mel.push({ b: b0 + bt, p, len, e });
          ev.push(e);
          bt += len;
        }
        P.chords.forEach((ch, bar) => {
          const Q = CONGA_CHORDS[ch], bb = b0 + bar * 4;
          for (let e = 0; e < 8; e++) {
            const t = C.lead + (bb + e / 2) * B;
            ev.push({ t, k: 4, p: 0, l: 0 });
            if (e % 4 === 0) ev.push({ t, k: 2, p: 0, l: 0 });
            if (e % 4 === 2) ev.push({ t, k: 3, p: 0, l: 0 });
            if (e % 2 === 0) ev.push({ t, k: 1, p: Q.bass + (e % 4 === 2 ? 12 : 0), l: B * 0.4 });
            else for (const s of Q.stab) ev.push({ t, k: 5, p: s, l: 0.07 });
          }
        });
      });
      const end = CONGA_SONG.length * 16;
      ev.push({ t: C.lead + end * B, k: 2, p: 0, l: 0 });
      ev.push({ t: C.lead + end * B, k: 1, p: -15, l: 0.9 });
      for (const s of CONGA_CHORDS.Am.stab) ev.push({ t: C.lead + end * B, k: 5, p: s, l: 0.9 });
      // The count-in: four hats.
      for (let i = 0; i < 2; i++) ev.push({ t: i * B, k: 4, p: 0, l: 0 });
      // The dance: busier as the song goes on.
      //   bars 0-3: every other beat; 4-11: every beat; 12-19: every beat, a clap every other bar;
      //   20-27: the tune's notes, a clap every bar; 28-35: the tune's notes and every beat between.
      const marks = [];
      for (let bar = 0; bar < end / 4; bar++) {
        const lv = bar < 4 ? 0 : bar < 12 ? 1 : bar < 20 ? 2 : bar < 28 ? 3 : 4, b0 = bar * 4;
        const at = new Set();
        if (lv === 0) at.add(b0).add(b0 + 2);
        else if (lv <= 2) for (let i = 0; i < 4; i++) at.add(b0 + i);
        else {
          for (const m of mel) if (m.b >= b0 && m.b < b0 + 4) at.add(m.b);
          if (lv === 4) for (let i = 0; i < 4; i++) at.add(b0 + i);
        }
        let clapAt = -1;
        if ((lv === 2 && bar % 2 === 0) || lv >= 3) clapAt = b0;
        const extra = lv === 4 && bar % 4 === 3 ? b0 + 2 : -1; // a second clap closing each phrase
        for (const b of Array.from(at).sort((x, y) => x - y)) marks.push({ b, clap: b === clapAt || b === extra, lv });
      }
      marks.push({ b: end, clap: true, lv: 4 });
      // Arrows follow the tune: up or right as it rises, down or left as it falls, the same lane again
      // for the same note.
      let n = 0, mi = 0, prevP = null, prevL = (this.rnd() * 4) | 0, same = 0;
      for (const mk of marks) {
        if (n >= C.max) break;
        while (mi + 1 < mel.length && mel[mi + 1].b <= mk.b + 1e-6) mi++;
        const m = mel[Math.min(mi, mel.length - 1)];
        const onset = Math.abs(m.b - mk.b) < 1e-6;
        let lane;
        if (mk.clap) lane = 4;
        else if (prevP === null) lane = prevL;
        else if (m.p > prevP || (m.p === prevP && same >= 2 && this.rnd() < 0.5)) lane = this.rnd() < 0.5 ? 2 : 3;
        else if (m.p < prevP || same >= 2) lane = this.rnd() < 0.5 ? 1 : 0;
        else lane = prevL;
        if (lane < 4) {
          same = lane === prevL ? same + 1 : 0;
          prevL = lane;
          prevP = m.p;
        }
        this.nt[n] = C.lead + mk.b * B;
        this.nl[n] = lane;
        this.ns[n] = 0;
        this.np[n] = onset ? m.p : m.p + 12;
        this.nlen[n] = onset && lane < 4 ? m.len * B * 0.85 : -1; // -1: a woodblock tap, not a note of the tune
        this.nlead[n] = mk.lv <= 1 ? 1.6 : mk.lv === 2 ? 1.4 : 1.2;
        // That note of the tune is now the player's to play.
        if (onset && lane < 4) m.e.k = 9;
        n++;
      }
      this.n = n;
      this.ni = 0; // the first note still to come
      ev.sort((a, b) => a.t - b.t);
      this.ne = Math.min(C.maxEv, ev.length);
      for (let i = 0; i < this.ne; i++) {
        const e = ev[i];
        this.et[i] = e.t;
        this.ek[i] = e.k;
        this.ep[i] = e.p;
        this.el[i] = e.l;
      }
      this.ei = 0;
    }

    line() {
      const bits = [this.hits + ' of ' + this.n + ' steps in time'];
      if (this.best >= 5) bits.push('a conga of ' + this.best);
      return bits.join(', ');
    }

    get mult() {
      return Math.min(4, 1 + Math.floor(this.combo / 10));
    }

    pop(txt, col) {
      const p = this.pops[this._popI++ % this.pops.length];
      p.t = 0;
      p.txt = txt;
      p.col = col;
    }

    /** The band plays on: every note due in the next tenth of a second, sent ahead to the sound. */
    band() {
      while (this.ei < this.ne && this.et[this.ei] < this.t + 0.1) {
        const i = this.ei++, at = this.et[i] - this.t;
        if (at < -0.03) continue;
        const k = this.ek[i];
        if (k === 9) continue; // the player's note
        if (k === 0) this.sfx('note', { f: NOTE(this.ep[i]), len: this.el[i], at, gain: 0.8 });
        else if (k === 1) this.sfx('note', { f: NOTE(this.ep[i]), len: this.el[i], at, wave: 'triangle', gain: 2.6 });
        else if (k === 5) this.sfx('note', { f: NOTE(this.ep[i]), len: this.el[i], at, wave: 'triangle', gain: 0.55 });
        else this.sfx('drum', { kind: k === 2 ? 'kick' : k === 3 ? 'snare' : 'hat', at });
      }
    }

    step(dt, I) {
      if (this.over) return;
      const C = CONGA;
      this.t += dt;
      this.moveT += dt;
      this.goneT += dt;
      for (const p of this.pops) p.t += dt;
      for (let l = 0; l < 5; l++) this.flash[l] = this.flash[l] > 0 ? Math.max(0, this.flash[l] - dt) : Math.min(0, this.flash[l] + dt);
      this.band();
      // This step's presses: the keys, the stick, a flick of the mouse; the button claps.
      const P = this.press;
      P[0] = I.leftP || (I.x < -0.6 && this._sx >= -0.6);
      P[1] = I.downP || (I.y < -0.6 && this._sy >= -0.6);
      P[2] = I.upP || (I.y > 0.6 && this._sy <= 0.6);
      P[3] = I.rightP || (I.x > 0.6 && this._sx <= 0.6);
      P[4] = I.aP;
      this._sx = I.x;
      this._sy = I.y;
      this.mxAcc = this.mxAcc * 0.8 + I.mx;
      this.myAcc = this.myAcc * 0.8 + I.my;
      if (Math.abs(this.mxAcc) > C.mouse || Math.abs(this.myAcc) > C.mouse) {
        if (Math.abs(this.mxAcc) > Math.abs(this.myAcc)) P[this.mxAcc > 0 ? 3 : 0] = true;
        else P[this.myAcc > 0 ? 2 : 1] = true;
        this.mxAcc = this.myAcc = 0;
      }
      for (let l = 0; l < 5; l++) if (P[l]) this.hit(l);
      // Notes gone by unpressed.
      while (this.ni < this.n && (this.ns[this.ni] || this.nt[this.ni] < this.t - C.good)) {
        if (!this.ns[this.ni]) this.judge(this.ni, 4);
        this.ni++;
      }
      if (this.t >= C.secs) {
        const bonus = this.best * 5 + (this.misses ? 0 : 500);
        this.score += bonus;
        this.pop(this.misses ? 'BEST CONGA ' + this.best + ' +' + bonus : 'NOT ONE MISSED! +' + bonus, '#ffd24a');
        this.over = 'ENCORE!';
      }
    }

    /** A press in lane l: the next note there, if it's near enough. */
    hit(l) {
      const C = CONGA;
      for (let i = this.ni; i < this.n && this.nt[i] < this.t + C.early; i++) {
        if (this.ns[i] || this.nl[i] !== l || this.t > this.nt[i] + C.good) continue;
        const e = Math.abs(this.t - this.nt[i]);
        if (this.t < this.nt[i] - C.good) this.judge(i, 3);
        else this.judge(i, e <= C.perfect ? 0 : e <= C.great ? 1 : 2);
        return;
      }
      // Nothing there.
      this.flash[l] = -0.2;
      if (this.combo) this.breakLine();
      this.pop('OOPS', '#ff6a6a');
      this.sfx('chip', { f: 160, f1: 120, len: 0.06, gain: 0.5 });
    }

    /** Note i judged: 0 perfect, 1 great, 2 good, 3 too early, 4 missed. */
    judge(i, g) {
      const l = this.nl[i];
      this.ns[i] = g <= 2 ? 1 : 2;
      this.pop(CONGA_GRADE[g][0], CONGA_GRADE[g][1]);
      if (g > 2) {
        this.misses++;
        if (this.combo) this.breakLine();
        if (g === 3) this.sfx('chip', { f: 220, f1: 140, len: 0.08, gain: 0.5 });
        return;
      }
      this.score += CONGA.pts[g] * this.mult;
      this.combo++;
      this.best = Math.max(this.best, this.combo);
      this.hits++;
      if (g === 0) this.perfects++;
      this.flash[l] = 0.2;
      this.move = l;
      this.moveT = 0;
      if (l === 4) this.sfx('drum', { kind: 'clap' });
      else if (this.nlen[i] > 0) this.sfx('note', { f: NOTE(this.np[i]), len: this.nlen[i], gain: 1.1 });
      else this.sfx('drum', { kind: 'block', f: NOTE(this.np[i]) });
      if (this.combo === 25 || this.combo === 50 || this.combo === 100) {
        this.sfx('cheer', { gain: 0.5 });
        this.cheer = this.t;
      }
    }

    breakLine() {
      this.gone = Math.min(8, Math.floor(this.combo / 4));
      this.goneT = 0;
      this.combo = 0;
    }

    /** An arrow pointing in lane l's way, its tip r from the middle. */
    arrow(c, x, y, l, r, fill, edge) {
      c.save();
      c.translate(x, y);
      c.rotate(CONGA_ANG[l]);
      c.beginPath();
      c.moveTo(0, -r);
      c.lineTo(r, 0);
      c.lineTo(r * 0.42, 0);
      c.lineTo(r * 0.42, r);
      c.lineTo(-r * 0.42, r);
      c.lineTo(-r * 0.42, 0);
      c.lineTo(-r, 0);
      c.closePath();
      if (fill) {
        c.fillStyle = fill;
        c.fill();
      }
      if (edge) {
        c.strokeStyle = edge;
        c.lineWidth = 2;
        c.stroke();
      }
      c.restore();
    }

    /** A crab: at x, y (its feet), s its size, step its dance step (-1 none), bob 0..1. */
    crab(c, x, y, s, step, bob, col) {
      const lean = step === 0 ? -0.35 : step === 3 ? 0.35 : 0;
      const sq = step === 1 ? 0.25 : 0;
      const by = y - s * (0.55 - sq * 0.4) - bob * s * 0.12;
      const bx = x + lean * s * 0.5;
      // Legs.
      c.strokeStyle = col;
      c.lineWidth = Math.max(1, s * 0.1);
      c.beginPath();
      for (let k = -1; k <= 1; k += 2) for (let j = 0; j < 3; j++) {
        c.moveTo(bx + k * s * 0.3, by + s * 0.1);
        c.lineTo(x + k * s * (0.55 + j * 0.13), y - (j === 1 ? s * 0.08 : 0));
      }
      c.stroke();
      // Body and eyes on stalks.
      c.fillStyle = col;
      c.beginPath();
      c.ellipse(bx, by, s * 0.5, s * 0.3, lean * 0.4, 0, TAU);
      c.fill();
      c.fillRect(bx - s * 0.2, by - s * 0.5, s * 0.07, s * 0.25);
      c.fillRect(bx + s * 0.13, by - s * 0.5, s * 0.07, s * 0.25);
      c.fillStyle = '#ffffff';
      c.fillRect(bx - s * 0.24, by - s * 0.6, s * 0.15, s * 0.15);
      c.fillRect(bx + s * 0.09, by - s * 0.6, s * 0.15, s * 0.15);
      c.fillStyle = '#111';
      c.fillRect(bx - s * 0.19, by - s * 0.56, s * 0.07, s * 0.07);
      c.fillRect(bx + s * 0.14, by - s * 0.56, s * 0.07, s * 0.07);
      // Claws: out to the side, up, down by the knees, or clapped together over its head.
      const up = step === 2 || step === 4 ? 1 : step === 1 ? -0.4 : 0.35;
      for (let k = -1; k <= 1; k += 2) {
        const out = step === 4 ? 0.12 : (step === 0 && k < 0) || (step === 3 && k > 0) ? 0.95 : 0.7;
        const cx = bx + k * s * out, cy = by - s * (0.2 + up * 0.55);
        c.strokeStyle = col;
        c.lineWidth = Math.max(1, s * 0.12);
        c.beginPath();
        c.moveTo(bx + k * s * 0.4, by - s * 0.05);
        c.lineTo(cx, cy + s * 0.12);
        c.stroke();
        c.fillStyle = col;
        c.beginPath();
        c.arc(cx, cy, s * 0.16, 0, TAU);
        c.fill();
        c.fillStyle = 'rgba(0,0,0,0.35)';
        c.fillRect(cx - s * 0.02, cy - s * 0.16, s * 0.04, s * 0.14);
      }
    }

    draw(c) {
      const C = CONGA, t = this.t;
      const bp = Math.max(0, (t - C.lead) / C.beat), beat = bp % 1, bob = beat < 0.25 ? 1 - beat * 4 : 0;
      const grd = c.createLinearGradient(0, 0, 0, H);
      grd.addColorStop(0, '#2a1650');
      grd.addColorStop(0.7, '#5a2a78');
      grd.addColorStop(1, '#1a0c30');
      c.fillStyle = grd;
      c.fillRect(0, 0, W, H);
      // The bandstand: spotlights, a string of bulbs flashing on the beat, the boards.
      c.fillStyle = 'rgba(255,240,200,' + (0.05 + bob * 0.06).toFixed(3) + ')';
      for (let k = 0; k < 2; k++) {
        const x = 200 + k * 80 + Math.sin(t * 0.7 + k * 2) * 18;
        c.beginPath();
        c.moveTo(x - 6, 22);
        c.lineTo(x + 6, 22);
        c.lineTo(x + 40, 196);
        c.lineTo(x - 40, 196);
        c.fill();
      }
      for (let k = 0; k < 9; k++) {
        const x = 166 + k * 18, y = 34 + Math.sin(k * 0.9) * 3;
        const on = (k + Math.floor(bp)) % 2 === 0;
        c.fillStyle = on ? NEON_BULBS[k % NEON_BULBS.length] : '#3a2a50';
        c.fillRect(x - 2, y - 2, 5, 5);
      }
      c.fillStyle = '#8a5a32';
      c.fillRect(156, 196, W - 156, H - 196);
      c.fillStyle = '#6b4220';
      for (let y = 204; y < H; y += 9) c.fillRect(156, y, W - 156, 1);
      // The dancer, and the conga line behind it (more crabs the longer the run of hits).
      const conga = Math.min(8, Math.floor(this.combo / 4));
      for (let k = 0; k < conga; k++) {
        const hop = (k + Math.floor(bp)) % 2 ? bob : 0;
        this.crab(c, 172 + k * 19 + Math.sin(bp * PI) * 3, 234, 11, -1, hop, k % 2 ? '#ff8a6a' : '#ff6a5c');
      }
      if (this.goneT < 1.5) {
        for (let k = 0; k < this.gone; k++) {
          const x = 172 + k * 19 + this.goneT * (110 + k * 25);
          if (x < W + 12) this.crab(c, x, 234, 11, -1, (this.goneT * 8 + k) % 1, '#c85a4a');
        }
      }
      this.crab(c, 236, 200, 46, this.moveT < 0.3 ? this.move : -1, bob, '#e8483a');
      if (this.moveT < 0.25 && this.move === 4) label(c, 'CLAP!', 236, 112, 12, '#ffd24a', 'center');
      // The lanes, the arrows coming down and the shells they land on.
      const x0 = C.lane0, lw = C.laneW;
      c.fillStyle = 'rgba(10,6,24,0.55)';
      c.fillRect(x0 - 4, 22, lw * 4 + 8, H - 22);
      for (let l = 0; l < 4; l++) {
        c.fillStyle = l % 2 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)';
        c.fillRect(x0 + l * lw, 22, lw, H - 22);
      }
      for (let l = 0; l < 4; l++) {
        const f = this.flash[l], fc = this.flash[4];
        const x = x0 + l * lw + lw / 2;
        if (f > 0 || fc > 0) {
          c.fillStyle = 'rgba(255,255,255,' + (Math.max(f, fc) * 2.5).toFixed(3) + ')';
          c.beginPath();
          c.arc(x, C.hitY, 16, 0, TAU);
          c.fill();
        }
        this.arrow(c, x, C.hitY, l, 12, f < 0 ? 'rgba(255,80,80,0.5)' : 'rgba(0,0,0,0.35)', CONGA_COLS[l]);
      }
      for (let i = this.ni; i < this.n; i++) {
        const dtn = this.nt[i] - t;
        if (dtn > this.nlead[i]) {
          if (dtn > 1.7) break;
          continue;
        }
        if (this.ns[i]) continue;
        const y = C.hitY - (dtn / this.nlead[i]) * (C.hitY - C.topY);
        const l = this.nl[i];
        if (l === 4) {
          c.fillStyle = '#ffb92e';
          c.fillRect(x0, y - 5, lw * 4, 10);
          c.strokeStyle = '#fff2c0';
          c.lineWidth = 1.5;
          c.strokeRect(x0 + 0.5, y - 4.5, lw * 4 - 1, 9);
          label(c, 'CLAP', x0 + lw * 2, y + 4, 9, '#5a2a00', 'center');
        } else this.arrow(c, x0 + l * lw + lw / 2, y, l, 12, CONGA_COLS[l], '#ffffff');
      }
      // How it's going.
      for (const p of this.pops) {
        if (p.t > 0.5) continue;
        label(c, p.txt, x0 + lw * 2, 150 - p.t * 16, p.txt.length > 10 ? 10 : 14, p.col, 'center');
      }
      if (this.combo >= 5) {
        label(c, String(this.combo), x0 + lw * 2, 112, 22, this.t - this.cheer < 1 ? '#ffd24a' : '#ffffff', 'center');
        label(c, 'IN A ROW', x0 + lw * 2, 124, 8, '#cfc6ff', 'center');
      }
      c.fillStyle = 'rgba(10,6,24,0.7)';
      c.fillRect(0, 0, W, 22);
      label(c, String(this.score), 6, 16, 13, '#ffffff');
      label(c, 'x' + this.mult, 120, 16, 12, this.mult > 1 ? '#ffd24a' : '#8a80b0');
      label(c, Math.max(0, Math.ceil(C.secs - t)) + 's', W - 6, 16, 11, '#ffffff', 'right');
      // The song's progress along the top.
      c.fillStyle = '#3a2a50';
      c.fillRect(160, 9, 110, 4);
      c.fillStyle = '#ff6a5c';
      c.fillRect(160, 9, 110 * Math.min(1, t / C.secs), 4);
      if (t < C.lead + 1.5) label(c, t < C.lead ? 'READY...' : 'DANCE!', x0 + lw * 2, 90, 14, '#ffd24a', 'center');
    }

    /** The attract mode's player: every step right on the beat. */
    demo(I) {
      clearIn(I);
      for (let i = this.ni; i < this.n && this.nt[i] < this.t + 0.05; i++) {
        if (this.ns[i] || this.nt[i] - this.t > 0.012) continue;
        const l = this.nl[i];
        if (l === 0) (I.leftP = true), (I.x = -1);
        else if (l === 1) (I.downP = true), (I.y = -1);
        else if (l === 2) (I.upP = true), (I.y = 1);
        else if (l === 3) (I.rightP = true), (I.x = 1);
        else I.a = I.aP = true;
      }
      return I;
    }
  }
  const NEON_BULBS = ['#ff3d8b', '#37e8ff', '#ffb92e', '#7dff6a'];
  const NOTE = (n) => 261.63 * Math.pow(2, n / 12);

  // ============================================================== the hall
  // Arcade Row's fit-out. The hall itself is neonstrand.js's (x 815..870, z 76..116, open to the midway
  // on the east); a back wall at x 846 makes the front 23 m of it the arcade (the stock room behind is
  // shut). Eight cabinets, every one a game: three along the north wall, three along the south, and an
  // island facing the middle door (Boardwalk Dash, back to back with Seafront Sprint's sit-down racer).
  // On the back wall the change desk, a drinks machine and neon; benches by the doors; a carpet that
  // glows under the black lights at night. The shapes are merged into the chunk builders; the painted
  // art (side art, marquees, neon, signs) is one canvas on two meshes (lit, glowing), the carpet one
  // mesh, and each cabinet's live screen one more.
  const HALL = { x0: 846.25, x1: 869.5, z0: 76.5, z1: 115.5, ceil: KERB + 7.4 };
  // Where each cabinet stands: [x, z, yaw] (yaw: the way its screen faces).
  const SPOTS = {
    dash: [856.42, 96, PI / 2],
    sprint: [854.95, 96, -PI / 2],
    stack: [851.5, 115, PI],
    serpent: [856, 115, PI],
    catch: [860.5, 115, PI],
    reef: [851.5, 77, 0],
    rhythm: [856, 77, 0],
    sub: [860.5, 77, 0],
  };

  // The two cabinet shapes, in a cabinet's frame (u across, y up from the floor, v towards the player).
  // side: the side panels' outline [v, y]; body: the cabinet between them, set back so the screen sits
  // in a bezel; screen: its middle (y, v), size and tilt back; marquee: [y, v, w, h] of its lit face;
  // art: the side art's box [v0, y0, v1, y1]; hw: half the width over the side panels.
  const TILT = Math.atan2(0.12, 0.69);
  const MODELS = {
    upright: {
      hw: 0.39,
      panel: 0.025,
      side: [[-0.42, 0], [0.33, 0], [0.33, 0.84], [0.37, 1.02], [0.24, 1.7], [0.38, 1.73], [0.38, 2.05], [-0.42, 1.93]],
      body: [[-0.41, 0], [0.3, 0], [0.3, 0.84], [0.31, 1.0], [0.19, 1.69], [0.35, 1.72], [0.35, 2.03], [-0.41, 1.92]],
      screen: { y: 1.345, v: 0.25, w: 0.56, h: 0.42 },
      marquee: [1.875, 0.352, 0.7, 0.27],
      art: [-0.37, 0.2, 0.21, 1.72],
      stand: [0, 1.15],
      promptV: 0.8,
      cam: [0.75, KERB + 2.05, 2.7, 0, KERB + 1.35, 0.2, 50],
    },
    sitdown: {
      hw: 0.56,
      panel: 0.03,
      side: [[-1.05, 0.1], [-0.22, 0.1], [-0.22, 0.7], [-0.05, 0.86], [-0.05, 0.98], [-0.3, 1.05], [-0.42, 1.74], [-0.24, 1.78], [-0.24, 2.1], [-1.05, 1.98]],
      body: [[-1.04, 0.1], [-0.25, 0.1], [-0.25, 0.7], [-0.08, 0.85], [-0.08, 0.97], [-0.33, 1.04], [-0.45, 1.73], [-0.27, 1.77], [-0.27, 2.08], [-1.04, 1.97]],
      screen: { y: 1.385, v: -0.39, w: 0.72, h: 0.54 },
      marquee: [1.925, -0.262, 0.98, 0.29],
      art: [-0.98, 0.26, -0.34, 1.72],
      stand: [0.95, 0.6], //  where Jay walks to, beside the seat
      seat: [0, 0.62], //     where he sits (u, v); his hips at KERB + 0.6
      promptU: 0.9,
      promptV: 0.6,
      cam: [1.2, KERB + 1.95, 2.4, 0, KERB + 1.3, -0.5, 52],
    },
  };

  // ---------------------------------------------------- the painted art
  // One 2048 × 1024 canvas: [x, y, w, h] slots. Side art 256 × 680 and marquees 256 × 100 for each of
  // the eight cabinets (slot i by its place in CABINETS); the hall's neon and signs along the bottom.
  const ART = {
    w: 2048,
    h: 1024,
    slots: {
      title: [0, 788, 640, 236],
      fish: [640, 788, 300, 236],
      strip: [940, 788, 700, 110],
      desk: [940, 902, 700, 122],
      door: [1640, 788, 120, 236],
      vend: [1760, 788, 140, 236],
      change: [1900, 788, 148, 236],
    },
    lit: [], //  quads drawn in the hall's light: [slot, x, y, z, rx, rz, w, h]
    glow: [], // quads that light themselves (marquees, neon)
    tex: null,
    meshes: [],
  };
  const hexs = (n) => '#' + (n >>> 0).toString(16).padStart(6, '0');

  /** A neon line: a soft wide glow, then the bright tube. */
  function neon(g, col, width, draw) {
    g.save();
    g.lineCap = g.lineJoin = 'round';
    g.strokeStyle = col;
    g.globalAlpha = 0.35;
    g.lineWidth = width * 3.2;
    draw();
    g.stroke();
    g.globalAlpha = 1;
    g.lineWidth = width;
    draw();
    g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.85)';
    g.lineWidth = Math.max(1, width * 0.35);
    draw();
    g.stroke();
    g.restore();
  }

  /** Neon lettering. */
  function neonText(g, s, x, y, size, col, font) {
    g.save();
    g.font = font || 'bold ' + size + 'px "Arial Black", Impact, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineJoin = 'round';
    g.strokeStyle = col;
    g.globalAlpha = 0.35;
    g.lineWidth = size * 0.28;
    g.strokeText(s, x, y);
    g.globalAlpha = 1;
    g.lineWidth = size * 0.1;
    g.strokeText(s, x, y);
    g.fillStyle = '#ffffff';
    g.globalAlpha = 0.9;
    g.fillText(s, x, y);
    g.restore();
  }

  /** A cabinet's marquee: its name in lights on a dark board. */
  function paintMarquee(g, w, h, d) {
    const col = hexs(d.colour || 0x37e8ff);
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, '#120a24');
    grd.addColorStop(1, '#2a1250');
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = col;
    g.lineWidth = 4;
    g.strokeRect(5, 5, w - 10, h - 10);
    for (let x = 12; x < w - 6; x += 16) {
      g.fillStyle = (x / 16) % 2 < 1 ? '#fff6c8' : col;
      g.fillRect(x - 2, 1, 4, 3);
      g.fillRect(x - 2, h - 4, 4, 3);
    }
    const name = d.name.toUpperCase();
    let size = 34;
    g.font = 'bold ' + size + 'px "Arial Black", Impact, sans-serif';
    while (g.measureText(name).width > w - 26 && size > 14) g.font = 'bold ' + --size + 'px "Arial Black", Impact, sans-serif';
    neonText(g, name, w / 2, h * 0.43, size, col);
    g.font = 'bold 13px sans-serif';
    g.textAlign = 'center';
    g.fillStyle = '#ffffff';
    g.fillText((d.marquee || '').toUpperCase(), w / 2, h * 0.8);
  }

  /** The art down a cabinet's sides: the game's own picture, its name up the front edge. */
  function paintSide(g, w, h, d) {
    g.save();
    if (d.art) d.art(g, w, h);
    g.restore();
    // The name, in big letters reading up the side.
    g.save();
    g.translate(w - 34, h - 16);
    g.rotate(-PI / 2);
    const name = d.name.toUpperCase();
    let size = 40;
    g.font = 'bold ' + size + 'px "Arial Black", Impact, sans-serif';
    while (g.measureText(name).width > h - 40 && size > 16) g.font = 'bold ' + --size + 'px "Arial Black", Impact, sans-serif';
    g.textBaseline = 'middle';
    g.lineJoin = 'round';
    g.lineWidth = 7;
    g.strokeStyle = '#140a26';
    g.strokeText(name, 0, 0);
    g.fillStyle = hexs(d.colour || 0xffffff);
    g.fillText(name, 0, 0);
    g.restore();
    // A trim line round the edge.
    g.strokeStyle = 'rgba(255,255,255,0.55)';
    g.lineWidth = 3;
    g.strokeRect(4, 4, w - 8, h - 8);
  }

  /** The hall's own neon and signs. */
  const HALL_ART = {
    title(g, w, h) {
      neonText(g, 'ARCADE', w / 2, h * 0.3, 92, '#ff3d8b');
      neonText(g, 'ROW', w / 2, h * 0.72, 92, '#37e8ff');
      neon(g, '#ffd24a', 5, () => {
        g.beginPath();
        for (let i = 0; i < 4; i++) {
          const x = 40 + i * 14;
          g.moveTo(x, h * 0.5 - 20);
          g.lineTo(x + 30, h * 0.5);
          g.lineTo(x, h * 0.5 + 20);
        }
      });
      neon(g, '#ffd24a', 5, () => {
        g.beginPath();
        for (let i = 0; i < 4; i++) {
          const x = w - 40 - i * 14;
          g.moveTo(x, h * 0.5 - 20);
          g.lineTo(x - 30, h * 0.5);
          g.lineTo(x, h * 0.5 + 20);
        }
      });
    },
    fish(g, w, h) {
      neon(g, '#7dff9a', 6, () => {
        g.beginPath();
        g.ellipse(w * 0.45, h * 0.5, w * 0.27, h * 0.24, 0, 0, TAU);
        g.moveTo(w * 0.72, h * 0.5);
        g.lineTo(w * 0.9, h * 0.3);
        g.lineTo(w * 0.9, h * 0.7);
        g.closePath();
      });
      neon(g, '#ffffff', 4, () => {
        g.beginPath();
        g.arc(w * 0.3, h * 0.44, 7, 0, TAU);
      });
      neon(g, '#37e8ff', 3, () => {
        g.beginPath();
        g.arc(w * 0.13, h * 0.3, 8, 0, TAU);
        g.moveTo(w * 0.09 + 12, h * 0.16);
        g.arc(w * 0.09, h * 0.16, 12, 0, TAU);
      });
    },
    strip(g, w, h) {
      neon(g, '#ff3d8b', 5, () => {
        g.beginPath();
        g.moveTo(10, h * 0.7);
        for (let x = 10; x < w - 20; x += 44) {
          g.lineTo(x + 22, h * 0.3);
          g.lineTo(x + 44, h * 0.7);
        }
      });
      const star = (cx, cy, r, col) =>
        neon(g, col, 3, () => {
          g.beginPath();
          for (let i = 0; i <= 10; i++) {
            const a = -PI / 2 + (i * PI) / 5, rr = i % 2 ? r * 0.45 : r;
            if (i === 0) g.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
            else g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
          }
        });
      for (let x = 120; x < w; x += 230) star(x, h * 0.5, 26, '#ffd24a');
    },
    desk(g, w, h) {
      g.fillStyle = '#100820';
      g.fillRect(0, 0, w, h);
      neonText(g, 'CHANGE · TICKETS', w / 2, h * 0.42, 54, '#ffd24a');
      g.font = 'bold 20px sans-serif';
      g.textAlign = 'center';
      g.fillStyle = '#ffffff';
      g.fillText('Prizes at the Prize Shack, by the Skyhook', w / 2, h * 0.84);
    },
    door(g, w, h) {
      g.fillStyle = '#4a4458';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#5a546a';
      g.fillRect(8, 8, w - 16, h - 8);
      g.fillStyle = '#d8d2e4';
      g.fillRect(w - 26, h * 0.52, 14, 5);
      g.fillStyle = '#f2efe6';
      g.fillRect(18, h * 0.22, w - 36, 34);
      g.fillStyle = '#c0302c';
      g.font = 'bold 13px sans-serif';
      g.textAlign = 'center';
      g.fillText('STAFF', w / 2, h * 0.22 + 15);
      g.fillText('ONLY', w / 2, h * 0.22 + 29);
    },
    vend(g, w, h) {
      g.fillStyle = '#fff2d6';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#c9302c';
      g.fillRect(0, 0, w, 40);
      g.fillStyle = '#ffffff';
      g.font = 'bold 22px "Arial Black", sans-serif';
      g.textAlign = 'center';
      g.fillText('SUNFIZZ', w / 2, 28);
      const cols = ['#ff9a3c', '#e0403a', '#7dcf6a', '#37b8ff'];
      for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) {
        g.fillStyle = cols[(r + k) % 4];
        g.fillRect(12 + k * 31, 52 + r * 44, 20, 34);
        g.fillStyle = '#ffffff';
        g.fillRect(15 + k * 31, 58 + r * 44, 5, 20);
      }
    },
    change(g, w, h) {
      g.fillStyle = '#c8ccd4';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#1a1626';
      g.fillRect(14, 14, w - 28, 70);
      neonText(g, 'CHANGE', w / 2, 49, 26, '#ffd24a');
      g.fillStyle = '#3a3f48';
      g.fillRect(w / 2 - 30, 110, 60, 8);
      g.fillStyle = '#7dff9a';
      g.fillRect(w / 2 - 34, 132, 68, 16);
      g.fillStyle = '#1a1626';
      g.font = 'bold 11px sans-serif';
      g.textAlign = 'center';
      g.fillText('NOTES IN', w / 2, 144);
      g.fillStyle = '#2a2f38';
      g.fillRect(w / 2 - 40, h - 60, 80, 36);
    },
  };

  /** Paint the hall's canvas once (when the world is built), every cabinet's art and the neon on it. */
  function paintArt() {
    if (ART.tex) return ART.tex;
    const cv = document.createElement('canvas');
    cv.width = ART.w;
    cv.height = ART.h;
    const g = cv.getContext('2d'); // (clear: the neon tubes are drawn on nothing, so they hang on the wall)
    const clip = (r, f) => {
      g.save();
      g.beginPath();
      g.rect(r[0], r[1], r[2], r[3]);
      g.clip();
      g.translate(r[0], r[1]);
      f(g, r[2], r[3]);
      g.restore();
    };
    CABINETS.forEach((d) => {
      clip(ART.slots['side_' + d.id], (gg, w, h) => paintSide(gg, w, h, d));
      clip(ART.slots['marq_' + d.id], (gg, w, h) => paintMarquee(gg, w, h, d));
    });
    for (const k in HALL_ART) clip(ART.slots[k], HALL_ART[k]);
    const tex = (ART.tex = new THREE.CanvasTexture(cv));
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }

  /** A painted quad: slot, middle (x, y, z), the direction across it (rx, rz: to the right as you face it), size. */
  function artQuad(list, slot, x, y, z, rx, rz, w, h) {
    list.push([slot, x, y, z, rx, rz, w, h]);
  }

  /** The art's meshes: one lit by the hall, one that glows. */
  function buildArtMeshes(world) {
    const tex = paintArt();
    const make = (list, mat, name) => {
      if (!list.length) return null;
      const pos = [], uv = [], nrm = [], idx = [];
      for (const [slot, x, y, z, rx, rz, w, h] of list) {
        const r = ART.slots[slot];
        if (!r) continue;
        const u0 = r[0] / ART.w, u1 = (r[0] + r[2]) / ART.w, v1 = 1 - r[1] / ART.h, v0 = 1 - (r[1] + r[3]) / ART.h;
        const n = pos.length / 3;
        for (const [su, sv] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
          pos.push(x + (rx * su * w) / 2, y + (sv * h) / 2, z + (rz * su * w) / 2);
          uv.push(su < 0 ? u0 : u1, sv < 0 ? v0 : v1);
          nrm.push(-rz, 0, rx);
        }
        idx.push(n, n + 1, n + 2, n, n + 2, n + 3);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      geo.setIndex(idx);
      geo.computeBoundingSphere();
      const mesh = new THREE.Mesh(geo, mat);
      mesh.name = name;
      world.scene.add(mesh);
      ART.meshes.push(mesh);
      return mesh;
    };
    make(ART.lit, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, metalness: 0.05 }), 'arcade-art');
    make(ART.glow, new THREE.MeshBasicMaterial({ map: tex, transparent: true }), 'arcade-neon');
  }

  /** The carpet: dark, with neon squiggles and stars that glow under the black lights at night. */
  function buildCarpet(world) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 256;
    const g = cv.getContext('2d');
    g.fillStyle = '#141032';
    g.fillRect(0, 0, 256, 256);
    const R = rng(77);
    const cols = ['#ff3d8b', '#37e8ff', '#ffd24a', '#7dff9a', '#b45cff'];
    g.lineCap = 'round';
    for (let i = 0; i < 22; i++) {
      const x = R() * 256, y = R() * 256, col = cols[i % cols.length];
      g.strokeStyle = g.fillStyle = col;
      g.lineWidth = 3;
      const k = i % 4;
      for (const [ox, oy] of [[0, 0], [-256, 0], [0, -256], [-256, -256], [256, 0], [0, 256]]) {
        g.save();
        g.translate(x + ox, y + oy);
        g.rotate(R() * TAU);
        g.beginPath();
        if (k === 0) {
          g.moveTo(-14, 0);
          g.bezierCurveTo(-7, -10, 0, 10, 7, 0);
          g.bezierCurveTo(10, -5, 12, -5, 14, 0);
          g.stroke();
        } else if (k === 1) {
          g.arc(0, 0, 6, 0, TAU);
          g.stroke();
        } else if (k === 2) {
          g.moveTo(0, -8);
          g.lineTo(7, 6);
          g.lineTo(-7, 6);
          g.closePath();
          g.stroke();
        } else {
          g.moveTo(-10, -4);
          g.lineTo(-3, 4);
          g.lineTo(3, -4);
          g.lineTo(10, 4);
          g.stroke();
        }
        g.restore();
      }
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 4;
    const w = HALL.x1 - HALL.x0, d = HALL.z1 - HALL.z0;
    tex.repeat.set(w / 2.2, d / 2.2);
    const geo = new THREE.PlaneGeometry(w, d);
    geo.rotateX(-PI / 2);
    const mat = new THREE.MeshStandardMaterial({
      map: tex, roughness: 1, metalness: 0, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0,
      polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set((HALL.x0 + HALL.x1) / 2, KERB + 0.025, (HALL.z0 + HALL.z1) / 2);
    mesh.name = 'arcade-carpet';
    world.scene.add(mesh);
    ART.meshes.push(mesh);
    ART.carpet = mesh;
  }

  // ------------------------------------------------------- the shapes
  const _m4 = new THREE.Matrix4(), _q4 = new THREE.Quaternion(), _e4 = new THREE.Euler(), _p4 = new THREE.Vector3(), _s4 = new THREE.Vector3();
  const _ax = new THREE.Vector3(), _ay = new THREE.Vector3(), _az = new THREE.Vector3();
  const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);

  /** Any shape in a frame at (u, y, v), tipped about the frame's u axis by tilt (+: its top towards the player), scaled. */
  function placed(surf, F, geo, u, y, v, tilt, col, sx, sy, sz) {
    _p4.set(F.wx(u, v), y, F.wz(u, v));
    _q4.setFromEuler(_e4.set(tilt, F.yaw, 0, 'YXZ'));
    _s4.set(sx || 1, sy || 1, sz || 1);
    surf.merge(geo, _m4.compose(_p4, _q4, _s4), col);
  }
  /** A box in a frame: middle (u, y, v), size (across, up, along), tipped by tilt. */
  function tbox(surf, F, u, y, v, su, sy, sv, tilt, col) {
    placed(surf, F, UNIT_BOX, u, y, v, tilt, col, su, sy, sv);
  }
  /** An outline [v, y] in a frame, made solid from u0 to u1 (the cabinets' sides and bodies). */
  function profile(surf, F, pts, u0, u1, col) {
    const shape = new THREE.Shape(pts.map(([v, y]) => new THREE.Vector2(v, y)));
    const geo = new THREE.ExtrudeGeometry(shape, { depth: u1 - u0, bevelEnabled: false, steps: 1, curveSegments: 1 });
    // The outline's x runs along v, its y up; it is pushed out along -u (a right-handed set), from u1 down to u0.
    _m4.makeBasis(_ax.set(F.s, 0, F.c), _ay.set(0, 1, 0), _az.set(-F.c, 0, F.s));
    _m4.setPosition(F.wx(u1, 0), KERB, F.wz(u1, 0));
    surf.merge(geo, _m4, col);
    geo.dispose();
  }
  /** A box in a frame, on a surface and (optionally) solid: frame-aligned, so a plain world box. */
  const _rb = [0, 0, 0, 0];
  let WORLD = null; // the world being built (for fbox's colliders)
  function fbox(surf, F, u0, y0, v0, u1, y1, v1, col, solid) {
    F.box(u0, v0, u1, v1, _rb);
    if (surf) surf.box(_rb[0], KERB + y0, _rb[1], _rb[2], KERB + y1, _rb[3], col);
    if (solid) WORLD.physics.addBox(_rb[0], KERB + y0, _rb[1], _rb[2], KERB + y1, _rb[3], solid, VH.COLLIDE.SOLID | VH.COLLIDE.SHOTS);
  }

  const CYL = new THREE.CylinderGeometry(1, 1, 1, 12);
  const BALL = new THREE.SphereGeometry(1, 10, 8);
  const TORUS = new THREE.TorusGeometry(0.16, 0.022, 6, 18);

  /** One cabinet, modelled: the sides, the body, the bezel, the controls, the coin door; solid. */
  function buildCabinet(world, d) {
    const M = MODELS[d.model];
    const F = d.F;
    const ctx = world.ctxAt(F.x, F.z);
    const col = d.colour || 0x37e8ff;
    const side = VH.col(d.side || col, 0.8), body = VH.col(0x17151f), trim = VH.col(0x2b2936), metal = VH.col(0xa9aeb6);
    const hw = M.hw, pw = M.panel;
    // The side panels and the body between them.
    profile(ctx.prop, F, M.side, hw - pw, hw, side);
    profile(ctx.prop, F, M.side, -hw, -hw + pw, side);
    profile(ctx.prop, F, M.body, -hw + pw, hw - pw, body);
    // The bezel round the screen (the screen itself is the game's: build() below).
    const S = M.screen;
    const nY = Math.sin(TILT), nV = Math.cos(TILT);
    tbox(ctx.prop, F, 0, KERB + S.y + nY * 0.004, S.v + nV * 0.004, S.w + 0.07, S.h + 0.07, 0.01, -TILT, trim);
    // The marquee's lit face, and the side art.
    const c = F.c, s = F.s;
    const mq = M.marquee;
    artQuad(ART.glow, 'marq_' + d.id, F.wx(0, mq[1] + 0.003), KERB + mq[0], F.wz(0, mq[1] + 0.003), c, -s, mq[2], mq[3]);
    const A = M.art, av = (A[0] + A[2]) / 2, ay = KERB + (A[1] + A[3]) / 2;
    artQuad(ART.lit, 'side_' + d.id, F.wx(hw + 0.003, av), ay, F.wz(hw + 0.003, av), -s, -c, A[2] - A[0], A[3] - A[1]);
    artQuad(ART.lit, 'side_' + d.id, F.wx(-hw - 0.003, av), ay, F.wz(-hw - 0.003, av), s, c, A[2] - A[0], A[3] - A[1]);
    const btn = d.buttons || [0xe0403a, 0xffd24a, 0x37e8ff];
    if (d.model === 'upright') {
      // The control panel: sloping out over the coin door, a joystick, three buttons and the 1P / 2P starts.
      const pt = 0.2, pv = 0.47, py = KERB + 0.93;
      // A point on the panel: u across, w along it towards the player, h up off its middle.
      const on = (u, w, h) => [u, py + h * Math.cos(pt) - w * Math.sin(pt), pv + h * Math.sin(pt) + w * Math.cos(pt)];
      fbox(ctx.prop, F, -0.4, 0.8, 0.3, 0.4, 0.9, 0.6, body);
      tbox(ctx.prop, F, 0, py, pv, 0.82, 0.07, 0.38, pt, VH.col(0x23202e));
      let p = on(0, 0.193, 0);
      tbox(ctx.screen, F, 0, p[1], p[2], 0.82, 0.03, 0.01, pt, VH.col(col, 1.4));
      p = on(-0.2, 0.02, 0.04);
      placed(ctx.prop, F, CYL, p[0], p[1], p[2], pt, VH.col(0x101010), 0.045, 0.01, 0.045);
      p = on(-0.2, 0.02, 0.085);
      placed(ctx.prop, F, CYL, p[0], p[1], p[2], pt, VH.col(0x202020), 0.011, 0.09, 0.011);
      p = on(-0.2, 0.02, 0.135);
      placed(ctx.screen, F, BALL, p[0], p[1], p[2], pt, VH.col(btn[0], 1.2), 0.034, 0.034, 0.034);
      [[0.04, 0.03], [0.14, -0.01], [0.24, 0.03]].forEach(([u, w], i) => {
        const q = on(u, w, 0.042);
        placed(ctx.screen, F, CYL, q[0], q[1], q[2], pt, VH.col(btn[i % btn.length], 1.5), 0.027, 0.022, 0.027);
      });
      for (const u of [-0.05, 0.05]) {
        const q = on(u, -0.13, 0.04);
        placed(ctx.screen, F, CYL, q[0], q[1], q[2], pt, VH.col(0xf2efe6, 1.3), 0.014, 0.016, 0.014);
      }
      // The coin door (two lit slots, the return cup) and the kick plate.
      fbox(ctx.prop, F, -0.13, 0.28, 0.3, 0.13, 0.66, 0.318, VH.col(0x6f747d));
      fbox(ctx.screen, F, -0.075, 0.52, 0.318, -0.045, 0.6, 0.324, VH.col(0xff9a3c, 1.8));
      fbox(ctx.screen, F, 0.045, 0.52, 0.318, 0.075, 0.6, 0.324, VH.col(0xff9a3c, 1.8));
      fbox(ctx.prop, F, -0.04, 0.34, 0.318, 0.04, 0.4, 0.322, VH.col(0x111111));
      fbox(ctx.prop, F, -hw + pw, 0, 0.3, hw - pw, 0.12, 0.316, metal);
      // Solid: the body to its top, the panel at its height.
      fbox(null, F, -hw, 0, -0.42, hw, 2.05, 0.33, 0, 'metal');
      fbox(null, F, -0.41, 0.8, 0.33, 0.41, 0.98, 0.64, 0, 'metal');
    } else {
      // The sit-down racer: a plinth with a glow underneath, a wheel on the dash, pedals, a bucket seat.
      fbox(ctx.prop, F, -hw, 0, -1.05, hw, 0.1, 1.0, VH.col(0x1d1b26));
      fbox(ctx.screen, F, -hw - 0.006, 0.03, -1.02, -hw, 0.07, 0.97, VH.col(col, 1.6));
      fbox(ctx.screen, F, hw, 0.03, -1.02, hw + 0.006, 0.07, 0.97, VH.col(col, 1.6));
      // The leg well's low sides.
      fbox(ctx.prop, F, -hw, 0.1, -0.22, -hw + 0.05, 0.45, 0.3, side);
      fbox(ctx.prop, F, hw - 0.05, 0.1, -0.22, hw, 0.45, 0.3, side);
      // The wheel on its column, a gear knob, the pedals.
      tbox(ctx.prop, F, 0, KERB + 0.92, -0.02, 0.06, 0.06, 0.2, -0.6, VH.col(0x202020));
      placed(ctx.prop, F, TORUS, 0, KERB + 0.99, 0.08, -0.6, VH.col(0x3c3c48));
      placed(ctx.screen, F, CYL, 0, KERB + 0.99, 0.08, -0.6 + PI / 2, VH.col(col, 1.3), 0.04, 0.02, 0.04);
      tbox(ctx.prop, F, 0, KERB + 0.99, 0.08, 0.3, 0.02, 0.02, -0.6, VH.col(0x3c3c48));
      placed(ctx.prop, F, CYL, 0.3, KERB + 1.0, -0.12, 0, VH.col(0x202020), 0.012, 0.12, 0.012);
      placed(ctx.screen, F, BALL, 0.3, KERB + 1.07, -0.12, 0, VH.col(btn[0], 1.2), 0.03, 0.03, 0.03);
      for (const u of [-0.12, 0.12]) tbox(ctx.prop, F, u, KERB + 0.18, -0.12, 0.09, 0.015, 0.16, 0.7, metal);
      placed(ctx.screen, F, CYL, -0.3, KERB + 0.99, -0.14, 0.4, VH.col(0xf2efe6, 1.3), 0.02, 0.02, 0.02);
      // The seat: a base in the game's colour, a black cushion and a back that leans away from the screen.
      fbox(ctx.prop, F, -0.3, 0.1, 0.3, 0.3, 0.42, 0.95, side);
      fbox(ctx.prop, F, -0.28, 0.42, 0.33, 0.28, 0.52, 0.9, VH.col(0x15151a));
      tbox(ctx.prop, F, 0, KERB + 0.86, 0.95, 0.56, 0.78, 0.09, 0.22, VH.col(0x15151a));
      tbox(ctx.prop, F, 0, KERB + 0.86, 0.995, 0.6, 0.8, 0.02, 0.22, side);
      // Solid: the screen unit, the leg well's sides, the seat.
      fbox(null, F, -hw, 0, -1.05, hw, 2.1, -0.05, 0, 'metal');
      fbox(null, F, -hw, 0, -0.05, -hw + 0.05, 0.45, 0.3, 0, 'metal');
      fbox(null, F, hw - 0.05, 0, -0.05, hw, 0.45, 0.3, 0, 'metal');
      fbox(null, F, -0.32, 0, 0.3, 0.32, 1.2, 1.04, 0, 'metal');
      fbox(null, F, -hw, 0, -0.05, hw, 0.1, 1.0, 0, 'metal');
    }
  }

  /** The hall round the cabinets: the back wall, the change desk, a drinks machine, neon, benches, lights. */
  function buildHall(world) {
    const ctx = world.ctxAt(857, 96);
    const ph = world.physics;
    const C = VH.COLLIDE;
    const H = HALL;
    const zm = (H.z0 + H.z1) / 2;
    // The back wall (the stock room behind it is shut), with its staff door.
    ctx.prop.box(845.75, KERB, H.z0, 846.25, H.ceil, H.z1, VH.col(0x3a2466));
    ph.addBox(845.75, 0, H.z0, 846.25, H.ceil, H.z1, 'wall', C.ALL);
    artQuad(ART.lit, 'door', 846.27, KERB + 1.05, 111.5, 0, -1, 1.0, 2.1);
    // Neon on the back wall: the name over the desk, a fish, a strip of stars and zigzags round the sides.
    artQuad(ART.glow, 'title', 846.28, KERB + 4.7, zm, 0, -1, 6.2, 2.29);
    artQuad(ART.glow, 'fish', 846.28, KERB + 3.6, 84.5, 0, -1, 3.0, 2.36);
    artQuad(ART.glow, 'fish', 846.28, KERB + 3.9, 106.5, 0, -1, 2.4, 1.89);
    for (const x of [851, 858, 865]) {
      artQuad(ART.glow, 'strip', x, KERB + 3.7, H.z1 - 0.02, -1, 0, 6.4, 1.0);
      artQuad(ART.glow, 'strip', x, KERB + 3.7, H.z0 + 0.02, 1, 0, 6.4, 1.0);
    }
    // Strip lights across the ceiling, pink and cyan.
    for (let k = 0; k < 6; k++) {
      const z = H.z0 + 4 + k * 6.3;
      ctx.screen.box(848, H.ceil - 0.1, z - 0.08, 868, H.ceil - 0.02, z + 0.08, VH.col(k % 2 ? 0x37e8ff : 0xff3d8b, 1.6));
    }
    // The change desk: a counter, the till, a ticket roll, and shelves of prizes behind.
    const dz0 = 92.8, dz1 = 98.2;
    ctx.wood.box(847.0, KERB, dz0, 848.1, KERB + 1.02, dz1, VH.col(0x6a3fa0));
    ctx.prop.box(846.9, KERB + 1.02, dz0 - 0.1, 848.25, KERB + 1.08, dz1 + 0.1, VH.col(0x1d1b26));
    ctx.screen.box(848.1, KERB + 0.95, dz0, 848.13, KERB + 1.0, dz1, VH.col(0xffd24a, 1.8));
    ctx.screen.box(848.1, KERB + 0.1, dz0, 848.13, KERB + 0.15, dz1, VH.col(0xff3d8b, 1.8));
    ph.addBox(846.25, 0, dz0 - 0.1, 848.25, KERB + 1.08, dz1 + 0.1, 'wood', C.SOLID | C.SHOTS);
    ctx.prop.box(847.3, KERB + 1.08, 96.6, 847.75, KERB + 1.3, 97.1, VH.col(0x2b2936));
    ctx.screen.box(847.74, KERB + 1.2, 96.65, 847.76, KERB + 1.28, 97.05, VH.col(0x7dff9a, 1.5));
    ctx.prop.cylinder(847.6, KERB + 1.08, 94.2, 0.12, 0.12, 0.12, 10, VH.col(0xff9a3c), true);
    artQuad(ART.glow, 'desk', 846.28, KERB + 2.95, zm - 0.5, 0, -1, 4.6, 0.8);
    for (const y of [1.5, 2.0]) {
      ctx.prop.box(846.25, KERB + y, dz0, 846.7, KERB + y + 0.04, dz1, VH.col(0xd9d2c4));
      for (let z = dz0 + 0.3; z < dz1 - 0.2; z += 0.55) {
        const k = Math.round(z * 7 + y * 3);
        ctx.propMatte.box(846.32, KERB + y + 0.04, z - 0.15, 846.62, KERB + y + 0.3 + (k % 3) * 0.04, z + 0.15, VH.col(NEONS[k % NEONS.length]));
      }
    }
    // A change machine by the desk.
    ctx.prop.box(846.25, KERB, 89.8, 846.85, KERB + 1.65, 90.7, VH.col(0x8f949c));
    ph.addBox(846.25, 0, 89.8, 846.85, KERB + 1.65, 90.7, 'metal', C.SOLID | C.SHOTS);
    artQuad(ART.lit, 'change', 846.86, KERB + 1.05, 90.25, 0, -1, 0.6, 0.96);
    // A drinks machine (it works, like the ones in town).
    const vz = 104.6;
    ctx.propMatte.box(846.25, KERB, vz - 0.5, 847.1, KERB + 1.95, vz + 0.5, VH.col(0xc9302c), { top: VH.col(0x8f1f1c) });
    ph.addBox(846.25, 0, vz - 0.5, 847.1, KERB + 1.95, vz + 0.5, 'vending');
    artQuad(ART.glow, 'vend', 847.11, KERB + 1.25, vz + 0.08, 0, -1, 0.7, 1.18);
    world.interactables.push({ id: 'vending_arcade', kind: 'vending', x: 848.2, y: KERB + 1.0, z: vz, radius: 1.4, label: 'Buy a Sunfizz soda', price: 2, heal: 15 });
    // Benches by the doors, a bin by the drinks machine.
    world.addProp('bench', 866.5, KERB, H.z1 - 0.9, PI, 1);
    world.addProp('bench', 866.5, KERB, H.z0 + 0.9, 0, 1);
    world.addProp('bench', 848.2, KERB, 85.5, PI / 2, 1);
    world.addProp('bin', 847.0, KERB, 106.2, 0, 1);
  }
  const NEONS = [0xff3d8b, 0x37e8ff, 0xb45cff, 0xffb92e, 0x7dff6a, 0xff6a2e, 0xffffff];

  // ============================================================== the cabinets
  // The cabinets (in the order they were defined: each one's slots on the art canvas follow it).
  const CABINETS = [];
  // What the cabinets' attract modes cost: pictures drawn, and the milliseconds spent drawing them (a test reads it).
  const Arcade = { cost: 0, pictures: 0 };

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
  const ATTRACT = 22; // the attract mode's cycle: the title and the table for 8 s, then the game playing itself

  /**
   * One cabinet as a stall game: o = { id, name, model ('upright' | 'sitdown'), game, colour, side,
   * buttons, art(g, w, h), marquee, table: [[initials, score] x5], tickets, howto, keys, prize,
   * barks, tagline, price }. Where it stands is SPOTS[id].
   */
  function cabinet(o) {
    const game = o.game;
    const model = o.model || 'upright';
    const M = MODELS[model];
    const at = SPOTS[o.id];
    const F0 = { x: at[0], z: at[1], yaw: at[2], w: 2 * M.hw, d: 1 };
    const Fp = Carnival.Midway.frame(F0);
    const def = {
      id: o.id,
      name: o.name,
      cabinet: true,
      model,
      frame: F0,
      price: o.price || 1,
      unit: 'points',
      radius: 1.5,
      sleep: 45,
      stand: M.stand,
      promptV: M.promptV,
      x: Fp.wx(M.promptU || 0, M.promptV),
      z: Fp.wz(M.promptU || 0, M.promptV),
      cam: M.cam,
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
      side: o.side,
      buttons: o.buttons,
      art: o.art,
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
        // The screen, set back in its bezel and tilted up at the player.
        const S = M.screen, nY = Math.sin(TILT), nV = Math.cos(TILT);
        this.screen = kit.single(new THREE.PlaneGeometry(S.w, S.h), mat);
        this.screen.position.set(0, KERB + S.y + nY * 0.012, S.v + nV * 0.012);
        this.screen.rotation.x = -TILT;
        const F = this.F;
        this.sx = F.wx(0, S.v);
        this.sz = F.wz(0, S.v);
        this.sy = KERB + S.y;
        this.nx = F.s;
        this.nz = F.c;
        game.sfx = (name, opts) => {
          const A = this.c.audio;
          if (A && A[name] && this.c.session && this.c.session.def === this) A[name](opts);
        };
        this.table = o.table.map((r) => r.slice());
        this.lastIni = ['JAY', 'P2 '];
        this.att = (CABINETS.indexOf(this) * 5) % ATTRACT; // not all on the same page at once
        this.drawT = CABINETS.indexOf(this) * 0.013; //      nor redrawn in the same frame
        this.demoT = 0;
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
        // Off the racer's seat: stood beside it, so the go ends with him on the floor.
        const s = this.c && this.c.session;
        if (M.seat && s && s.def === this && s.data.stand) {
          const p = s.game.player;
          p.pos.set(s.data.stand.x, KERB, s.data.stand.z);
        }
      },

      /** Jay at the controls: stood at an upright, sat in the racer. */
      jay(s, g) {
        if (!M.seat) {
          const st = s.data.stand;
          s.seat(st.x, KERB + Carnival.HIP, st.z, st.yaw, (g && this.pose && this.pose(g, s)) || Carnival.ARMS_REST);
          return;
        }
        const F = this.F;
        s.seat(F.wx(M.seat[0], M.seat[1]), KERB + 0.6, F.wz(M.seat[0], M.seat[1]), F.yaw + PI, SEATED);
      },

      begin(g, s) {
        // Both players get the same run (the same seed) on a two-player go.
        if (g.n === 1) s.data.seed = 1 + ((Math.random() * 1e6) | 0);
        game.reset(s.data.seed);
        _mouse.yaw = null;
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
              IN.mx = IN.my = 0;
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
        const S = this.c && this.c.session;
        const live = S && S.def === this && S.data.go && (S.data.phase === 'play' || S.data.phase === 'whistle' || S.data.phase === 'count');
        if (live || !this.c) {
          game.draw(c);
          if (g && g.ini) this.drawInitials(c, g);
          if (S && S.data.phase === 'count') {
            c.fillStyle = 'rgba(10,6,24,0.55)';
            c.fillRect(0, 96, W, 48);
            label(c, (S.data.players === 2 ? 'PLAYER ' + S.data.go.n + ' · ' : '') + 'GET READY!', W / 2, 126, 16, game.ink, 'center');
          }
        } else this.attract(c);
        // The cabinet's own screen: refreshed about 15 times a second while playing, 8 otherwise.
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
        const cyc = this.att % ATTRACT;
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
          if (((this.att * 2) | 0) % 2) label(c, 'PRESS E TO PLAY · $' + this.price + ' · 1 OR 2 PLAYERS', W / 2, 222, 11, '#7dff9a', 'center');
        } else {
          game.draw(c);
          label(c, 'DEMO', W / 2, 228, 10, 'rgba(255,255,255,0.8)', 'center');
        }
      },

      /**
       * How often the attract mode should be redrawn (seconds), or 0 for not at all: Jay in or near
       * the hall, the screen in the camera's view and facing it, nobody playing another cabinet.
       */
      every() {
        const g = this.c.game, P = g.player.pos;
        if (P.x < HALL.x0 - 1 || P.x > HALL.x1 + 18 || P.z < HALL.z0 - 10 || P.z > HALL.z1 + 10) return 0;
        const s = this.c.session;
        if (s && s.def.cabinet && s.def !== this && s.data.phase !== 'walk') return 0;
        const cam = g.renderer.camera.position;
        const dx = cam.x - this.sx, dz = cam.z - this.sz;
        if (dx * this.nx + dz * this.nz < 0) return 0;
        if (!g.isVisible(this.sx, this.sy, this.sz, 0.45)) return 0;
        return dx * dx + dz * dz < 14 * 14 ? 0.1 : 0.2;
      },

      idleGame(dt) {
        const s = this.c.session;
        if (s && s.def === this && s.data.phase === 'count') {
          this.paint(dt, s.data.go);
          return;
        }
        this.att += dt;
        const every = this.every();
        if (!every) return;
        if (this.att % ATTRACT >= 8 && !this.demoOn) {
          this.demoOn = true;
          game.reset(++this.seed);
        }
        this.drawT += dt;
        if (this.drawT < every) return;
        // A new picture: the demo plays on by the time since the last one (it only needs this many pictures).
        if (this.demoOn) {
          const n = Math.min(12, Math.ceil(this.drawT / (1 / 30)));
          for (let i = 0; i < n; i++) game.step(this.drawT / n, game.demo(IN));
          if (game.over) this.att = ATTRACT * Math.ceil(this.att / ATTRACT); // back to the title
        }
        this.drawT = 0;
        const t0 = performance.now();
        this.attract(this.ctx);
        this.tex.needsUpdate = true;
        Arcade.cost += performance.now() - t0;
        Arcade.pictures++;
      },
    };
    const d = Carnival.stall(def);
    CABINETS.push(d);
    return d;
  }
  // Sat in the racer: hands on the wheel.
  const SEATED = { w: 1, hipL: 1.45, hipR: 1.45, kneeL: 1.25, kneeR: 1.25, ankleL: 0, ankleR: 0, shoulderL: 1.15, shoulderR: 1.15, elbowL: 0.45, elbowR: 0.45, splayL: 0.1, splayR: 0.1, lean: 0.08, twist: 0, pelvisY: 0.97, headPitch: 0, speed: 0, crouch: 0 };

  // The cabinets, the hall round them and its art: built with the world (the midway's builders).
  Carnival.Midway.builders.push((world) => {
    WORLD = world;
    CABINETS.forEach((d, i) => {
      ART.slots['side_' + d.id] = [i * 256, 0, 256, 680];
      ART.slots['marq_' + d.id] = [i * 256, 684, 256, 100];
      d.F = d.F || Carnival.Midway.frame(d.frame);
      buildCabinet(world, d);
    });
    buildHall(world);
    buildCarpet(world);
    buildArtMeshes(world);
    WORLD = null;
  });

  // The hall's housekeeping: its art and carpet hidden when Jay is far off, the carpet glowing at
  // night, the attendant at the change desk.
  Carnival.define({
    id: 'arcade_life',
    name: 'Arcade Row',
    kind: 'life',
    sleep: 0,
    setup(c) {
      this.c = c;
      this.shown = true;
    },
    idle() {
      const g = this.c.game, P = g.player.pos;
      const near = P.x > 780 && P.x < 940 && P.z > 30 && P.z < 170;
      if (near !== this.shown) {
        this.shown = near;
        for (const m of ART.meshes) m.visible = near;
      }
      if (!near) return;
      const env = g.environment;
      const night = (env && env.nightFactor) || 0;
      if (ART.carpet) ART.carpet.material.emissiveIntensity = 0.04 + 0.55 * night;
      this.c.figures.add('stand', 846.62, KERB, 95.6, PI / 2, 3);
    },
    sleepNow() {
      this.shown = false;
      for (const m of ART.meshes) m.visible = false;
    },
  });

  // ---------------------------------------------------- the eight games
  // Side art painters draw a 256 × 680 picture (the name goes up its right-hand edge on top).
  const sky = (g, w, h, stops) => {
    const grd = g.createLinearGradient(0, 0, 0, h);
    stops.forEach((c, i) => grd.addColorStop(i / (stops.length - 1), c));
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
  };
  const dots = (g, n, seed, x0, y0, x1, y1, r0, r1, col) => {
    const R = rng(seed);
    g.fillStyle = col;
    for (let i = 0; i < n; i++) {
      g.beginPath();
      g.arc(x0 + R() * (x1 - x0), y0 + R() * (y1 - y0), r0 + R() * (r1 - r0), 0, TAU);
      g.fill();
    }
  };

  cabinet({
    id: 'dash',
    name: 'Boardwalk Dash',
    marquee: 'Run the pier!',
    colour: 0xffd24a,
    side: 0xe0403a,
    buttons: [0xe0403a, 0xffd24a, 0x37e8ff],
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
    art(g, w, h) {
      sky(g, w, h, ['#ff8a3c', '#ff5c95', '#6a3fa0', '#2a1650']);
      g.fillStyle = '#ffd24a';
      g.beginPath();
      g.arc(w * 0.4, h * 0.3, 46, 0, TAU);
      g.fill();
      // The pier's planks, running away to the sunset.
      for (let i = 0; i < 9; i++) {
        g.fillStyle = i % 2 ? '#8a5a32' : '#a8703e';
        g.fillRect(0, h * 0.62 + i * 30, w, 30);
      }
      // A runner mid-leap over a crate, a gull, doughnuts.
      g.fillStyle = '#c8873a';
      g.fillRect(70, h * 0.62 - 54, 54, 54);
      g.strokeStyle = '#6b4220';
      g.lineWidth = 4;
      g.strokeRect(72, h * 0.62 - 52, 50, 50);
      g.fillStyle = '#1a1030';
      const rx = 90, ry = h * 0.42;
      g.beginPath();
      g.arc(rx, ry - 34, 14, 0, TAU);
      g.fill();
      g.lineWidth = 12;
      g.lineCap = 'round';
      g.strokeStyle = '#1a1030';
      g.beginPath();
      g.moveTo(rx, ry - 18);
      g.lineTo(rx - 6, ry + 26);
      g.moveTo(rx - 6, ry + 26);
      g.lineTo(rx - 40, ry + 34);
      g.moveTo(rx - 6, ry + 26);
      g.lineTo(rx + 26, ry + 50);
      g.moveTo(rx - 2, ry - 6);
      g.lineTo(rx + 34, ry - 22);
      g.moveTo(rx - 2, ry - 6);
      g.lineTo(rx - 36, ry + 6);
      g.stroke();
      g.strokeStyle = '#ffffff';
      g.lineWidth = 6;
      g.beginPath();
      g.moveTo(150, 120);
      g.quadraticCurveTo(165, 104, 180, 120);
      g.quadraticCurveTo(195, 104, 210, 120);
      g.stroke();
      for (const [x, y] of [[50, 170], [150, 230], [60, 600]]) {
        g.fillStyle = '#f2b0d0';
        g.beginPath();
        g.arc(x, y, 18, 0, TAU);
        g.fill();
        g.fillStyle = '#a8703e';
        g.beginPath();
        g.arc(x, y, 7, 0, TAU);
        g.fill();
      }
    },
  });

  cabinet({
    id: 'sprint',
    name: 'Seafront Sprint',
    model: 'sitdown',
    marquee: 'Four laps, flat out!',
    colour: 0xff7ab0,
    side: 0x37b8ff,
    buttons: [0xff7ab0, 0xffd24a],
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
    art(g, w, h) {
      sky(g, w, h, ['#2fb7b0', '#37b8ff', '#1a3a6a']);
      // A chequered band, a sweeping road with a car on it, palms.
      for (let r = 0; r < 2; r++) for (let k = 0; k < 8; k++) {
        g.fillStyle = (r + k) % 2 ? '#ffffff' : '#111111';
        g.fillRect(k * 32, 20 + r * 32, 32, 32);
      }
      g.strokeStyle = '#3a3d44';
      g.lineWidth = 70;
      g.beginPath();
      g.moveTo(-20, h * 0.9);
      g.bezierCurveTo(w * 1.1, h * 0.75, -w * 0.3, h * 0.4, w * 0.8, h * 0.15);
      g.stroke();
      g.strokeStyle = '#ffffff';
      g.lineWidth = 4;
      g.setLineDash([18, 16]);
      g.stroke();
      g.setLineDash([]);
      g.save();
      g.translate(w * 0.42, h * 0.55);
      g.rotate(-0.5);
      g.fillStyle = '#ff7ab0';
      g.fillRect(-22, -40, 44, 80);
      g.fillStyle = '#1a1030';
      g.fillRect(-16, -18, 32, 20);
      g.fillStyle = '#ffd24a';
      g.fillRect(-20, -40, 10, 6);
      g.fillRect(10, -40, 10, 6);
      g.restore();
      for (const [x, y] of [[40, 300], [170, 620]]) {
        g.strokeStyle = '#7a5230';
        g.lineWidth = 8;
        g.beginPath();
        g.moveTo(x, y);
        g.quadraticCurveTo(x + 10, y - 50, x + 4, y - 90);
        g.stroke();
        g.strokeStyle = '#3fae5a';
        g.lineWidth = 9;
        for (let a = 0; a < 5; a++) {
          g.beginPath();
          g.moveTo(x + 4, y - 90);
          g.quadraticCurveTo(x + 4 + Math.cos(a * 1.3) * 30, y - 110, x + 4 + Math.cos(a * 1.3) * 46, y - 80 + Math.sin(a) * 10);
          g.stroke();
        }
      }
    },
  });

  cabinet({
    id: 'sub',
    name: 'Bubble Sub',
    marquee: 'Bubble the fish!',
    colour: 0x7dff9a,
    side: 0x2fb7b0,
    buttons: [0xffd24a, 0x7dff9a, 0xff7ab0],
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
    art(g, w, h) {
      sky(g, w, h, ['#37b8ff', '#1a5aa0', '#0a1a40']);
      g.fillStyle = 'rgba(255,255,255,0.12)';
      for (let k = 0; k < 4; k++) {
        g.beginPath();
        g.moveTo(k * 70, 0);
        g.lineTo(k * 70 + 30, 0);
        g.lineTo(k * 70 - 40, h);
        g.lineTo(k * 70 - 90, h);
        g.fill();
      }
      dots(g, 28, 5, 10, 40, w - 50, h * 0.7, 4, 13, 'rgba(220,250,255,0.75)');
      // The sub, fish, sand.
      g.fillStyle = '#e8c87a';
      g.fillRect(0, h - 70, w, 70);
      g.fillStyle = '#ffd24a';
      g.beginPath();
      g.ellipse(w * 0.42, h * 0.78, 70, 34, 0, 0, TAU);
      g.fill();
      g.fillRect(w * 0.42 - 12, h * 0.78 - 56, 24, 30);
      g.fillStyle = '#37e8ff';
      for (const x of [-34, 0, 34]) {
        g.beginPath();
        g.arc(w * 0.42 + x, h * 0.78, 10, 0, TAU);
        g.fill();
      }
      const fish = (x, y, s, col) => {
        g.fillStyle = col;
        g.beginPath();
        g.ellipse(x, y, 26 * s, 13 * s, 0, 0, TAU);
        g.moveTo(x + 22 * s, y);
        g.lineTo(x + 40 * s, y - 14 * s);
        g.lineTo(x + 40 * s, y + 14 * s);
        g.fill();
        g.fillStyle = '#111';
        g.beginPath();
        g.arc(x - 14 * s, y - 3 * s, 3 * s, 0, TAU);
        g.fill();
      };
      fish(60, 160, 1, '#c8d6e0');
      fish(150, 230, 0.8, '#c8d6e0');
      fish(80, 330, 1.4, '#ff9a3c');
      fish(140, 430, 1, '#ff7ab0');
    },
  });

  cabinet({
    id: 'stack',
    name: 'Lighthouse Stack',
    marquee: 'Build it to the stars!',
    colour: 0xff9a3c,
    side: 0xe0403a,
    buttons: [0xff9a3c, 0xf2efe6, 0xe0403a],
    game: new Stack(),
    price: 1,
    tagline: 'Stack a lighthouse on the end of the pier, as high as it will go.',
    howto: [
      'A block swings from the crane: press to drop it on the tower. Whatever hangs over the edge is sliced off, so the tower gets narrower.',
      'Drop it dead centre for a PERFECT (25, and more for a run of them): the block grows back a little. Every tenth floor is a lamp room: 100, and a full-width block again.',
      'The swing speeds up and the tower sways as it grows. Three blocks in the sea and it\'s over; 75 seconds in all.',
    ],
    keys: 'Space / click / A  drop the block',
    prize: 'One for every 80 points',
    barks: ['Lighthouse Stack! How high can you build it?', 'One dollar! Stack it to the stars!'],
    tickets: (score) => score / 80,
    table: [['ACE', 1800], ['GUS', 1300], ['DOT', 900], ['KIT', 600], ['BOB', 300]],
    art(g, w, h) {
      sky(g, w, h, ['#1a1040', '#5a2e8a', '#ff8a3c']);
      dots(g, 30, 9, 0, 0, w, h * 0.45, 1, 2.5, '#ffffff');
      // A lighthouse of red and white rings, its beam across the night, the sea.
      const x = w * 0.42;
      for (let i = 0; i < 14; i++) {
        const y = h - 90 - i * 30, bw = 110 - i * 3 + Math.sin(i * 1.7) * 6;
        g.fillStyle = i % 2 ? '#f2efe6' : '#e0403a';
        g.fillRect(x - bw / 2 + Math.sin(i * 0.9) * 4, y, bw, 30);
      }
      g.fillStyle = '#ffd24a';
      g.fillRect(x - 38, h - 90 - 14 * 30 - 30, 76, 30);
      g.fillStyle = 'rgba(255,246,200,0.35)';
      g.beginPath();
      g.moveTo(x, h - 525);
      g.lineTo(w + 20, h - 600);
      g.lineTo(w + 20, h - 470);
      g.fill();
      g.fillStyle = '#1a6aa0';
      g.fillRect(0, h - 60, w, 60);
      g.fillStyle = '#5ab8e8';
      for (let k = 0; k < 6; k++) g.fillRect(k * 46, h - 52, 22, 4);
    },
  });

  cabinet({
    id: 'catch',
    name: 'Catch of the Day',
    marquee: 'Fish yes, splats no!',
    colour: 0x37e8ff,
    side: 0x37b8ff,
    buttons: [0x37e8ff, 0xf2efe6, 0xffd24a],
    game: new Catch(),
    price: 1,
    tagline: 'The gulls are dropping fish all over the pier. Catch them in your bucket!',
    howto: [
      'Slide the bucket along the pier under the fish the gulls drop: sardines 10, mackerel 20, golden fish 50 (they zigzag).',
      'Not everything a gull drops is a fish: a splat costs 20 and leaves the bucket slow for a moment. A starfish makes the bucket big.',
      'Catch fish in a row for a multiplier (up to x5); miss one and it starts again. 75 seconds.',
    ],
    keys: 'A D / arrows / left stick / mouse  move the bucket',
    prize: 'One for every 90 points',
    barks: ['Catch of the Day! Fish in the bucket, not on the deck!', 'One dollar! Mind what the gulls drop!'],
    tickets: (score) => score / 90,
    table: [['ACE', 4000], ['GUS', 3000], ['DOT', 2000], ['KIT', 1200], ['BOB', 600]],
    art(g, w, h) {
      sky(g, w, h, ['#8fd3ff', '#ffe9c7', '#2a7ab0', '#1a4a80']);
      // Gulls with fish, fish falling, the bucket on the planks.
      const gull = (x, y, s) => {
        g.strokeStyle = '#ffffff';
        g.lineWidth = 7 * s;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(x - 30 * s, y - 10 * s);
        g.quadraticCurveTo(x - 12 * s, y - 18 * s, x, y);
        g.quadraticCurveTo(x + 12 * s, y - 18 * s, x + 30 * s, y - 10 * s);
        g.stroke();
      };
      gull(60, 90, 1.2);
      gull(170, 170, 0.9);
      gull(80, 260, 0.7);
      const fish = (x, y, r, col) => {
        g.save();
        g.translate(x, y);
        g.rotate(r);
        g.fillStyle = col;
        g.beginPath();
        g.ellipse(0, 0, 26, 11, 0, 0, TAU);
        g.moveTo(20, 0);
        g.lineTo(38, -13);
        g.lineTo(38, 13);
        g.fill();
        g.restore();
      };
      fish(70, 330, 1.4, '#c8d6e0');
      fish(160, 380, 1.8, '#3a7ac8');
      fish(90, 440, 1.2, '#ffd24a');
      g.fillStyle = '#9b6a3c';
      g.fillRect(0, h - 110, w, 110);
      g.fillStyle = '#37b8ff';
      g.beginPath();
      g.moveTo(40, h - 200);
      g.lineTo(170, h - 200);
      g.lineTo(158, h - 110);
      g.lineTo(52, h - 110);
      g.fill();
      g.fillStyle = '#1a6aa0';
      g.fillRect(36, h - 206, 138, 10);
      fish(105, h - 218, -1.4, '#c8d6e0');
    },
  });

  cabinet({
    id: 'serpent',
    name: 'Serpent Supper',
    marquee: 'Grow it long!',
    colour: 0x7dff6a,
    side: 0x2fb7b0,
    buttons: [0x7dff6a, 0xff9ac8, 0xffd24a],
    game: new Serpent(),
    price: 1,
    tagline: 'A hungry young sea serpent and a lagoon full of shrimp.',
    howto: [
      'Steer the serpent to the shrimp: each one is 10 (more as it grows) and makes it a segment longer. Grab a golden pearl for 50 before it sinks.',
      'Don\'t bump a rock, the edge of the lagoon or your own tail: you have three lives, and a bump shrinks you to half. More rocks wash in as the tide turns.',
      'It swims faster as it goes. 75 seconds, and every segment at the end is worth 5 more.',
    ],
    keys: 'Arrows / W A S D / left stick / a flick of the mouse  turn',
    prize: 'One for every 40 points',
    barks: ['Serpent Supper! Feed the serpent, watch it grow!', 'One dollar! How long can you grow it?'],
    tickets: (score) => score / 40,
    table: [['ACE', 900], ['GUS', 700], ['DOT', 500], ['KIT', 300], ['BOB', 150]],
    art(g, w, h) {
      sky(g, w, h, ['#1f8a8a', '#2fb7b0', '#1a5a6a']);
      // A long green serpent coiling down the panel, shrimp, rocks.
      g.lineCap = 'round';
      g.lineJoin = 'round';
      g.strokeStyle = '#3fae5a';
      g.lineWidth = 34;
      g.beginPath();
      g.moveTo(60, h - 40);
      g.bezierCurveTo(220, h - 140, -20, h - 260, 120, h - 350);
      g.bezierCurveTo(240, h - 430, 20, h - 520, 110, h - 600);
      g.stroke();
      g.strokeStyle = '#7dff6a';
      g.lineWidth = 12;
      g.stroke();
      g.fillStyle = '#5ad26a';
      g.beginPath();
      g.ellipse(112, h - 610, 30, 24, -0.4, 0, TAU);
      g.fill();
      g.fillStyle = '#ffffff';
      g.fillRect(100, h - 628, 9, 9);
      g.fillRect(122, h - 632, 9, 9);
      g.fillStyle = '#111';
      g.fillRect(104, h - 625, 4, 4);
      g.fillRect(126, h - 629, 4, 4);
      g.strokeStyle = '#ff9ac8';
      g.lineWidth = 7;
      for (const [x, y] of [[170, 120], [40, 300], [180, 470]]) {
        g.beginPath();
        g.arc(x, y, 12, -0.3, PI + 0.6);
        g.stroke();
      }
      g.fillStyle = '#6b6f78';
      for (const [x, y] of [[20, 200], [190, 300], [30, 560]]) g.fillRect(x, y, 36, 26);
    },
  });

  cabinet({
    id: 'reef',
    name: 'Reef Rebound',
    marquee: 'Pearl versus coral!',
    colour: 0xff7ab0,
    side: 0xb45cff,
    buttons: [0xff7ab0, 0xfff6f0, 0x37e8ff],
    game: new Reef(),
    price: 1,
    tagline: 'A clam shell, a pearl, and a reef that needs breaking up.',
    howto: [
      'Move the shell to keep the pearl bouncing up into the coral: pale coral breaks at one knock (10), orange at two (20), purple at three (30).',
      'Hit the pearl with the shell\'s edge to send it off at an angle: coral broken on one flight scores double, triple, up to five times. Catch a falling bubble for a wide shell (W), three pearls (3) or a slow tide (S).',
      'Three pearls to lose. Clear a reef for 200 and the next one grows. 90 seconds.',
    ],
    keys: 'A D / arrows / left stick / mouse  move the shell   ·   Space / click / A  launch',
    prize: 'One for every 35 points',
    barks: ['Reef Rebound! Smash the coral, free the fish!', 'One dollar, three pearls! Break the reef!'],
    tickets: (score) => score / 35,
    table: [['ACE', 1600], ['GUS', 1200], ['DOT', 800], ['KIT', 500], ['BOB', 250]],
    art(g, w, h) {
      sky(g, w, h, ['#1a6aa0', '#0a2a50']);
      // Coral blocks, a pearl flying up, the shell.
      const cols = ['#ffc8c0', '#ff9a3c', '#b45cff'];
      for (let r = 0; r < 6; r++) for (let k = 0; k < 3; k++) {
        if ((r + k) % 4 === 3) continue;
        g.fillStyle = cols[(r + k) % 3];
        g.fillRect(14 + k * 62, 40 + r * 34, 56, 26);
      }
      g.fillStyle = '#fff6f0';
      g.beginPath();
      g.arc(110, 380, 16, 0, TAU);
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.5)';
      g.lineWidth = 4;
      g.setLineDash([10, 10]);
      g.beginPath();
      g.moveTo(60, h - 120);
      g.lineTo(110, 380);
      g.lineTo(190, 270);
      g.stroke();
      g.setLineDash([]);
      g.fillStyle = '#ff9ac8';
      g.beginPath();
      g.ellipse(60, h - 100, 70, 28, 0, PI, TAU);
      g.fill();
      for (const [x, y, c] of [[40, 300, '#ffd24a'], [170, 330, '#37e8ff'], [150, 460, '#ff9a3c']]) {
        g.fillStyle = c;
        g.fillRect(x - 14, y - 6, 26, 12);
        g.fillRect(x + 12, y - 9, 6, 18);
      }
    },
  });

  cabinet({
    id: 'rhythm',
    name: 'Crab Conga',
    marquee: 'Dance to the beat!',
    colour: 0xff6a5c,
    side: 0x6a3fa0,
    buttons: [0xff7ab0, 0x37e8ff, 0xffb92e],
    game: new Conga(),
    price: 1,
    tagline: 'The band plays, the crab dances, you call the steps.',
    howto: [
      'Arrows drift down the four lanes: press the same arrow just as each one reaches its shell, and the crab dances the step and the tune plays on.',
      'A gold bar across all four lanes is a clap: press the button. A press with nothing there, or a step missed, breaks your run.',
      'Steps in a row grow the conga line and the multiplier (up to x4). One song, 75 seconds; a new dance every go.',
    ],
    keys: 'Arrows / W A S D / stick / flick the mouse  step   ·   Space / click / A  clap',
    prize: 'One for every 100 points',
    barks: ['Crab Conga! Shake a claw!', 'One dollar a dance! Can you keep up with the crab?'],
    tickets: (score) => score / 100,
    table: [['ACE', 5000], ['GUS', 3500], ['DOT', 2200], ['KIT', 1200], ['BOB', 600]],
    art(g, w, h) {
      sky(g, w, h, ['#2a1650', '#5a2a78', '#1a0c30']);
      // Spotlights on a dancing crab, arrows raining down, notes in the air, the boards.
      g.fillStyle = 'rgba(255,240,200,0.12)';
      for (const x of [70, 190]) {
        g.beginPath();
        g.moveTo(x - 12, 0);
        g.lineTo(x + 12, 0);
        g.lineTo(x + 90, h - 120);
        g.lineTo(x - 90, h - 120);
        g.fill();
      }
      const cols = ['#ff7ab0', '#37e8ff', '#7dff6a', '#ffd24a'];
      const arrow = (x, y, a, r, col) => {
        g.save();
        g.translate(x, y);
        g.rotate(a);
        g.fillStyle = col;
        g.strokeStyle = '#ffffff';
        g.lineWidth = 4;
        g.beginPath();
        g.moveTo(0, -r);
        g.lineTo(r, 0);
        g.lineTo(r * 0.42, 0);
        g.lineTo(r * 0.42, r);
        g.lineTo(-r * 0.42, r);
        g.lineTo(-r * 0.42, 0);
        g.lineTo(-r, 0);
        g.closePath();
        g.fill();
        g.stroke();
        g.restore();
      };
      arrow(50, 70, -PI / 2, 26, cols[0]);
      arrow(150, 130, PI, 22, cols[1]);
      arrow(70, 220, 0, 24, cols[2]);
      arrow(190, 40, PI / 2, 20, cols[3]);
      arrow(200, 250, -PI / 2, 18, cols[1]);
      g.fillStyle = '#ffd24a';
      for (const [x, y] of [[30, 300], [215, 330], [120, 30]]) {
        g.beginPath();
        g.ellipse(x, y, 9, 7, -0.4, 0, TAU);
        g.fill();
        g.fillRect(x + 6, y - 32, 4, 32);
        g.fillRect(x + 6, y - 32, 14, 5);
      }
      g.fillStyle = '#8a5a32';
      g.fillRect(0, h - 140, w, 140);
      g.fillStyle = '#6b4220';
      for (let y = h - 125; y < h; y += 22) g.fillRect(0, y, w, 4);
      // The crab, claws up.
      const cx = 118, cy = h - 230;
      g.strokeStyle = '#e8483a';
      g.lineWidth = 9;
      g.lineCap = 'round';
      g.beginPath();
      for (let k = -1; k <= 1; k += 2) for (let j = 0; j < 3; j++) {
        g.moveTo(cx + k * 30, cy + 20);
        g.lineTo(cx + k * (62 + j * 16), cy + 80 - (j === 1 ? 10 : 0));
      }
      for (let k = -1; k <= 1; k += 2) {
        g.moveTo(cx + k * 40, cy - 6);
        g.lineTo(cx + k * 78, cy - 70);
      }
      g.stroke();
      g.fillStyle = '#e8483a';
      g.beginPath();
      g.ellipse(cx, cy, 62, 38, 0, 0, TAU);
      g.fill();
      for (let k = -1; k <= 1; k += 2) {
        g.beginPath();
        g.arc(cx + k * 80, cy - 84, 22, 0, TAU);
        g.fill();
      }
      g.fillStyle = '#ffffff';
      g.fillRect(cx - 28, cy - 62, 18, 18);
      g.fillRect(cx + 10, cy - 62, 18, 18);
      g.fillStyle = '#111111';
      g.fillRect(cx - 22, cy - 56, 8, 8);
      g.fillRect(cx + 16, cy - 56, 8, 8);
      g.fillStyle = '#e8483a';
      g.fillRect(cx - 22, cy - 44, 7, 14);
      g.fillRect(cx + 15, cy - 44, 7, 14);
    },
  });

  Carnival.Arcade = Object.assign(Arcade, { cabinets: CABINETS, HALL, SPOTS, MODELS, Dash, DASH, Sprint, SPRINT, Sub, SUB, Stack, STACK, Catch, CATCH, Serpent, SERP, Reef, REEF, Conga, CONGA, rng, IN, TX, TY, TA });
})();
