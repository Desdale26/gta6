/*
 * carnival-shack.js — the Prize Shack at Wonder Wharf (tickets in, prizes
 * out), what the prizes do, the fair's achievements' bookkeeping and the
 * fair's page on Jay's phone.
 *
 * The shack is the purple booth at the east end of the midway's north row
 * (carnival-midway.js BOOTHS.shack): shelves of plush toys, the giant crab
 * on the top shelf. E at the counter opens the prize list (W S / ↑ ↓ / the
 * stick choose, E / Space / A swap, Esc / B leave). The prizes are
 * Midway.PRIZES:
 *   plush toys     for Jay's shelf: counted on the phone page and in the stats
 *   the cap        the Wonder Wharf cap: Jay wears it (and can take it off here)
 *   armour         full body armour, there and then
 *   cash voucher   $50
 *   gold paint     Wharf Gold on the colour card at every Fresh Coat (sprayshops.js)
 *   giant crab     the top prize: an achievement, and a gold rosette on the
 *                  shack's own giant crab that says it's Jay's
 * Events: 'carnival:prize' { id, kind, cost }.
 *
 * The bookkeeping (saved with the shack): which rides Jay has finished and
 * which games have paid him (Midway.note), for the "ride everything" and
 * "every game" achievements and the phone page.
 *
 *   VH.Carnival.phonePage(phone, box)   fills the phone's Wonder Wharf app
 */
(function () {
  'use strict';

  const VH = window.VH;
  const Carnival = VH.Carnival;
  if (!Carnival || !Carnival.Midway) return;
  const Midway = Carnival.Midway;
  const KERB = 0.15;
  const PI = Math.PI;
  const el = (tag, cls, text) => VH.util.el(tag, cls, text);
  const hex = (n) => '#' + (n >>> 0).toString(16).padStart(6, '0');
  const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
  const PRIZES = Midway.PRIZES;
  const RIDES = ['wheel', 'riptide', 'skyhook', 'carousel', 'helter', 'dodgems'];
  // One-off prizes (the rest can be had again and again).
  const ONCE = { cap: 1, gold: 1, crab: 1 };

  // ------------------------------------------------------------ the dressing
  // Shelves on the back wall, plush toys on them, the giant crab on top, the
  // cap, the paint and the vest on show; all merged into the chunk with the booth.
  const GIANT = { u: 0, v: -2.25, y: KERB + 2.36 }; // the giant crab's middle (on the top shelf)

  function giantCrab(box, x, y, z, s) {
    const R = VH.col(0xff5a3c), D = VH.col(0xd23a24), W = VH.col(0xffffff), K = VH.col(0x111111);
    const b = (x0, y0, z0, x1, y1, z1, c) => box(x + x0 * s, y + y0 * s, z + z0 * s, x + x1 * s, y + y1 * s, z + z1 * s, c);
    b(-0.55, 0, -0.3, 0.55, 0.32, 0.3, R); //    the body
    b(-0.45, 0.32, -0.24, 0.45, 0.42, 0.24, D); // the shell's top
    for (const sx of [-1, 1]) {
      b(sx * 0.16 - 0.03, 0.32, 0.1, sx * 0.16 + 0.03, 0.62, 0.16, R); // eye stalks
      b(sx * 0.16 - 0.07, 0.6, 0.06, sx * 0.16 + 0.07, 0.74, 0.2, W); //  eyes
      b(sx * 0.16 - 0.03, 0.64, 0.19, sx * 0.16 + 0.03, 0.7, 0.21, K);
      // The claws: an arm out and up, a big pincer.
      b(sx * 0.55, 0.08, -0.06, sx * 0.85, 0.2, 0.08, R);
      b(sx * 0.78, 0.2, -0.1, sx * 1.02, 0.56, 0.14, R);
      b(sx * 0.82, 0.56, -0.06, sx * 0.9, 0.72, 0.1, D);
      for (let k = 0; k < 3; k++) b(sx * 0.5, 0.0, -0.22 + k * 0.16, sx * 0.78, 0.06, -0.16 + k * 0.16, D); // legs
    }
    b(-0.2, 0.12, 0.3, 0.2, 0.16, 0.31, K); // a smile
  }

  Midway.builders.push((world, K) => {
    const B = K.BOOTHS.shack;
    if (!B) return;
    const F = K.frame(B);
    const ctx = world.ctxAt(B.x, B.z);
    const r = [0, 0, 0, 0];
    const put = (surf, u0, y0, v0, u1, y1, v1, col) => {
      F.box(u0, v0, u1, v1, r);
      surf.box(r[0], y0, r[1], r[2], y1, r[3], VH.col(col));
    };
    // Three shelves along the back wall.
    const v0 = -2.76, v1 = -2.3;
    for (const y of [KERB + 1.0, KERB + 1.6, KERB + 2.2]) put(ctx.wood, -4.1, y - 0.05, v0, 4.1, y, v1, 0x9b6a3c);
    for (const u of [-4.05, 0, 4.05]) put(ctx.wood, u - 0.05, KERB + 0.95, v0, u + 0.05, KERB + 2.2, v0 + 0.08, 0x6b4a32);
    // Plush toys along the two lower shelves (the cheaper ones low, the dearer ones higher).
    const plush = PRIZES.filter((P) => P.kind === 'plush');
    const box = (x0, y0, z0, x1, y1, z1, c) => ctx.prop.box(x0, y0, z0, x1, y1, z1, c);
    const g = { box };
    plush.forEach((P, i) => {
      const shelf = i < 4 ? 0 : 1, row = i < 4 ? i : i - 4, n = shelf ? 3 : 4;
      const s = 0.26 + 0.05 * shelf + 0.01 * i;
      for (let k = 0; k < 3; k++) {
        const u = -3.7 + (row * 7.4) / n + k * 0.62 * s * 2.2;
        const c = new THREE.Color(P.color).multiplyScalar(0.92 + 0.08 * k);
        Midway.PLUSH.sit(g, F.wx(u, -2.53), KERB + 1.0 + shelf * 0.6, F.wz(u, -2.53), s, VH.col(c.getHex()), VH.col(0xfff6e8), F.yaw);
      }
    });
    // The top shelf: the cap on a stand, the gold paint, the vest, the voucher; the giant crab in the middle.
    put(ctx.prop, -3.55, KERB + 2.2, -2.62, -3.45, KERB + 2.42, -2.52, 0x222222);
    put(ctx.prop, -3.68, KERB + 2.42, -2.7, -3.32, KERB + 2.54, -2.44, 0xe0403a);
    put(ctx.prop, -3.6, KERB + 2.42, -2.44, -3.4, KERB + 2.45, -2.3, 0xe0403a);
    put(ctx.prop, -2.75, KERB + 2.2, -2.66, -2.45, KERB + 2.5, -2.4, 0xd4a017);
    put(ctx.screen, -2.72, KERB + 2.5, -2.63, -2.48, KERB + 2.52, -2.43, VH.col(0xffe680, 1.4));
    put(ctx.prop, 2.4, KERB + 2.2, -2.68, 2.95, KERB + 2.85, -2.5, 0x37b8ff);
    put(ctx.prop, 2.48, KERB + 2.55, -2.5, 2.87, KERB + 2.7, -2.48, 0xffffff);
    put(ctx.prop, 3.25, KERB + 2.25, -2.72, 3.95, KERB + 2.65, -2.68, 0x7dcf6a);
    put(ctx.prop, 3.35, KERB + 2.38, -2.68, 3.85, KERB + 2.52, -2.67, 0xffffff);
    giantCrab(box, F.wx(GIANT.u, GIANT.v), GIANT.y - 0.16, F.wz(GIANT.u, GIANT.v), 0.82);
    // A price board on the counter.
    K.wantSign('shack_board', ['GIANT CRAB · 600 TICKETS', 'Plush from 12 · Cap 60 · Gold paint 150'], 0xb45cff, 0xffd24a);
    K.QUADS.push(['shack_board', F.wx(2.6, 3.07), KERB + 1.22, F.wz(2.6, 3.07), F.yaw, 1.6, 0.4]);
    put(ctx.prop, 1.78, KERB + 1.0, 2.96, 3.42, KERB + 1.44, 3.04, 0x1a0f2e);
  });

  // --------------------------------------------------------------- the cap
  let capMesh = null;
  /** The Wonder Wharf cap on Jay's head (made the first time it's needed). */
  function wearCap(game, on) {
    const model = game.player && game.player.model;
    if (!model || !model.headGroup) return;
    if (!capMesh) {
      if (!on) return;
      const red = new THREE.MeshStandardMaterial({ color: 0xe0403a, roughness: 0.75 });
      const white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
      capMesh = new THREE.Group();
      capMesh.name = 'wharf-cap';
      const crown = new THREE.Mesh(new THREE.SphereGeometry(0.127, 16, 8, 0, PI * 2, 0, PI * 0.5), red);
      crown.scale.set(0.96, 0.78, 1.06);
      crown.position.set(0, 0.112, -0.004);
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.012, 14, 1, false, -PI / 2, PI), red);
      brim.position.set(0, 0.118, 0.07);
      brim.rotation.x = 0.16;
      const badge = new THREE.Mesh(new THREE.CircleGeometry(0.03, 10), white);
      badge.position.set(0, 0.165, 0.112);
      badge.rotation.x = -0.45;
      const button = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 4), red);
      button.position.set(0, 0.212, -0.004);
      for (const m of [crown, brim, badge, button]) {
        m.castShadow = true;
        capMesh.add(m);
      }
    }
    if (capMesh.parent !== model.headGroup) model.headGroup.add(capMesh);
    capMesh.visible = !!on;
  }

  // ---------------------------------------------------------------- the list
  class ShackUI {
    constructor(root) {
      this.el = el('div', 'cv-shack');
      this.head = el('div', 'cv-shack-head');
      this.title = el('div', 'cv-shack-title', 'Prize Shack');
      this.have = el('div', 'cv-shack-have');
      this.head.append(this.title, this.have);
      this.list = el('div', 'cv-shack-list');
      this.rows = PRIZES.map((P) => {
        const row = el('div', 'cv-shack-row');
        const sw = el('span', 'cv-shack-sw');
        sw.style.background = hex(P.color);
        const name = el('span', 'cv-shack-name', P.name);
        const own = el('span', 'cv-shack-own');
        const cost = el('b', 'cv-shack-cost', P.cost + ' 🎟');
        const line = el('div', 'cv-shack-line', P.line);
        row.append(sw, name, own, cost, line);
        this.list.append(row);
        return { row, own, cost, line };
      });
      this.foot = el('div', 'cv-shack-foot', 'W S / ↑ ↓  choose   ·   E / Space / A  swap   ·   Esc / B  leave');
      this.el.append(this.head, this.list, this.foot);
      root.append(this.el);
      this._ver = -1;
    }

    show(on) {
      this.el.classList.toggle('on', !!on);
      this._ver = -1;
    }

    /** Redraw the rows when something changed (ver: the shack's count of swaps). */
    render(c, sel, capOn, ver) {
      if (c.tickets === this._t && sel === this._sel && capOn === this._cap && ver === this._ver) return;
      this._t = c.tickets;
      this._sel = sel;
      this._cap = capOn;
      this._ver = ver;
      this.have.textContent = 'You have ' + c.tickets + ' 🎟';
      PRIZES.forEach((P, i) => {
        const R = this.rows[i], n = c.prizes[P.id] || 0;
        const got = ONCE[P.id] && n > 0;
        R.row.classList.toggle('sel', i === sel);
        R.row.classList.toggle('poor', !got && c.tickets < P.cost);
        R.row.classList.toggle('got', !!got);
        R.own.textContent = P.kind === 'cap' && n ? (capOn ? 'wearing it' : 'yours') : got ? 'yours' : n ? '×' + n : '';
        R.cost.textContent = P.kind === 'cap' && n ? (capOn ? 'Take it off' : 'Put it on') : got ? '✓' : P.cost + ' 🎟';
      });
      const R = this.rows[sel];
      if (R && R.row.scrollIntoView) R.row.scrollIntoView({ block: 'nearest' });
    }
  }

  // --------------------------------------------------------------- the shack
  const _pad = { y: 0 };

  Carnival.define({
    id: 'shack',
    name: 'the Prize Shack',
    kind: 'shop',
    label: 'Swap tickets at the Prize Shack',
    price: 0,
    scored: false,
    radius: 2.4,
    sleep: 70,
    hint: 'W S / ↑ ↓  choose   ·   E / Space / A  swap   ·   Esc / B  leave',
    barks: ['Prize Shack! Tickets in, prizes out!', 'Win enough tickets and the giant crab could be yours!', 'Plush toys, caps, the lot! Bring your tickets here!'],

    setup(c) {
      this.c = c;
      const B = Midway.BOOTHS.shack;
      this.F = Midway.frame(B);
      this.x = this.F.wx(0, B.d / 2 + 0.25);
      this.z = this.F.wz(0, B.d / 2 + 0.25);
      this.capOn = true;
      this.rode = {};
      this.ui = null;
      this.ver = 0; // swaps made (the list redraws when it changes)
      // The rosette on the giant crab once it's Jay's.
      const g = new THREE.Group();
      const gold = new THREE.MeshStandardMaterial({ color: 0xffd24a, roughness: 0.4, metalness: 0.3, emissive: 0x6a4a00 });
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.02, 14), gold);
      disc.rotation.x = PI / 2;
      const tails = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.01), new THREE.MeshStandardMaterial({ color: 0xe0403a, roughness: 0.6 }));
      tails.position.set(0, -0.16, -0.005);
      g.add(disc, tails);
      g.position.set(this.F.wx(GIANT.u, GIANT.v + 0.31), GIANT.y + 0.05, this.F.wz(GIANT.u, GIANT.v + 0.31));
      g.rotation.y = this.F.yaw;
      g.visible = false;
      c.game.scene.add(g);
      this.rosette = g;
      VH.events.on('carnival:end', (e) => this._ended(e));
    },

    /** Rides finished and games won: the achievements' bookkeeping. */
    _ended(e) {
      const c = this.c, A = c.game.achievements;
      if (e.completed && RIDES.includes(e.id)) {
        this.rode[e.id] = 1;
        if (A && RIDES.every((id) => this.rode[id])) A.unlock('fair_rides');
      }
      if (e.completed && e.tickets > 0 && A) {
        const own = c.midway && c.midway.won;
        const games = Carnival.Midway.games;
        if (own && games.length && games.every((d) => own[d.id])) A.unlock('fair_midway');
      }
    },

    idle() {
      const F = this.F;
      this.c.figures.add('stand', F.wx(-2.2, 1.9), KERB, F.wz(-2.2, 1.9), F.yaw, 5);
      this.rosette.visible = !!this.c.prizes.crab;
    },

    sleepNow() {
      this.rosette.visible = false;
    },

    start(s) {
      const D = s.data, F = this.F;
      D.phase = 'walk';
      D.sel = 0;
      D.stand = { x: F.wx(0, F.d / 2 + 0.75), z: F.wz(0, F.d / 2 + 0.75), yaw: F.yaw + PI };
      D.camT = 0;
      // Start on the dearest prize Jay can have now.
      let best = 0;
      PRIZES.forEach((P, i) => {
        if (P.cost <= s.carnival.tickets && !(ONCE[P.id] && s.carnival.prizes[P.id])) best = i;
      });
      D.sel = best;
      if (!this.ui) this.ui = new ShackUI(s.carnival.overlay.root);
    },

    update(dt, s) {
      const D = s.data, F = this.F, c = s.carnival;
      c.figures.add('stand', F.wx(-2.2, 1.9), KERB, F.wz(-2.2, 1.9), F.yaw, 5);
      this.rosette.visible = !!c.prizes.crab;
      if (D.phase === 'walk') {
        const P = s.game.player.pos;
        s.chase(P.x, P.y, P.z, s.game.player.heading, 4, { height: 1.3 });
        if (s.walk(D.stand.x, D.stand.z)) {
          D.phase = 'list';
          const cam = s.game.renderer.camera;
          D.from = [cam.position.x, cam.position.y, cam.position.z];
          this.ui.show(true);
        }
        return;
      }
      s.seat(D.stand.x, KERB + Carnival.HIP, D.stand.z, D.stand.yaw, Carnival.ARMS_REST);
      // The camera eases round to look past Jay at the shelves.
      D.camT = Math.min(1, D.camT + dt / 0.8);
      const k = ease(D.camT), px = F.wx(-1.6, 6.2), pz = F.wz(-1.6, 6.2);
      s.shot(D.from[0] + (px - D.from[0]) * k, D.from[1] + (KERB + 2.0 - D.from[1]) * k, D.from[2] + (pz - D.from[2]) * k, F.wx(-0.9, -1.5), KERB + 1.75, F.wz(-0.9, -1.5), 50);
      // Choosing: keys, and the stick (a push moves one row).
      const pad = s.game.input.pad;
      const py = pad && pad.connected ? pad.move.y : 0;
      let step = 0;
      if (s.pressed('moveForward') || (py > 0.6 && _pad.y <= 0.6)) step--;
      if (s.pressed('moveBack') || (py < -0.6 && _pad.y >= -0.6)) step++;
      _pad.y = py;
      if (step) {
        D.sel = (D.sel + step + PRIZES.length) % PRIZES.length;
        s.sound('tick');
      }
      if (s.pressed('interact') || s.pressed('jump') || s.pressed('fire')) this.swap(s, PRIZES[D.sel]);
      this.ui.render(c, D.sel, this.capOn, this.ver);
    },

    /** Swap tickets for a prize, and do what it does. */
    swap(s, P) {
      const c = s.carnival, g = s.game, p = g.player, n = c.prizes[P.id] || 0;
      if (P.kind === 'cap' && n) {
        this.capOn = !this.capOn;
        wearCap(g, this.capOn);
        s.ui.caption(this.capOn ? 'Cap on.' : 'Cap off.', 1600);
        s.sound('tick');
        return;
      }
      if (ONCE[P.id] && n) {
        s.ui.caption('That one\'s yours already.', 2000);
        s.sound('buzz', { gain: 0.5 });
        return;
      }
      if (c.tickets < P.cost) {
        s.ui.caption('You need ' + (P.cost - c.tickets) + ' more tickets for the ' + P.name.replace(/^\$50 /, '').toLowerCase() + '.', 2400);
        s.sound('buzz', { gain: 0.5 });
        return;
      }
      if (P.kind === 'armour' && p.armor >= p.maxArmor) {
        s.ui.caption('Your armour is as good as new already.', 2200);
        s.sound('buzz', { gain: 0.5 });
        return;
      }
      c.spend(P.cost);
      c.prizes[P.id] = n + 1;
      this.ver++;
      let line = P.name + '! ' + P.line;
      if (P.kind === 'cap') {
        this.capOn = true;
        wearCap(g, true);
        line = 'The Wonder Wharf cap. Jay puts it on.';
      } else if (P.kind === 'armour') {
        p.armor = p.maxArmor;
        line = 'Full body armour, courtesy of the dodgems crew.';
      } else if (P.kind === 'cash') {
        p.money += 50;
        VH.events.emit('money:changed', { delta: 50, reason: 'Prize Shack voucher' });
        line = 'Fifty dollars, cash.';
      } else if (P.kind === 'paint') {
        line = 'Wharf Gold is on the colour card at every Fresh Coat now.';
      } else if (P.kind === 'giant') {
        line = 'The GIANT plush crab is yours! It stays on the top shelf with a rosette on.';
        s.sound('cheer', { gain: 0.6 });
        if (g.achievements) g.achievements.unlock('fair_giant');
      }
      s.ui.big(P.kind === 'giant' ? 'WINNER!' : 'YOURS!', 900);
      s.ui.caption(line, 3200);
      s.sound('win', { gain: 0.6 });
      VH.events.emit('carnival:prize', { id: P.id, kind: P.kind, cost: P.cost });
    },

    escape(s) {
      if (this.ui) this.ui.show(false);
      s.end('done');
      return true;
    },

    stop() {
      if (this.ui) this.ui.show(false);
    },

    serialize() {
      const won = this.c && this.c.midway ? Object.assign({}, this.c.midway.won) : {};
      return { cap: this.capOn, rode: Object.assign({}, this.rode), won };
    },

    load(d) {
      this.capOn = !(d && d.cap === false);
      this.rode = {};
      if (d && d.rode) for (const id of RIDES) if (d.rode[id]) this.rode[id] = 1;
      if (this.c) {
        this.c.midway = { won: {} };
        if (d && d.won) for (const k in d.won) if (typeof d.won[k] === 'number') this.c.midway.won[k] = d.won[k];
        wearCap(this.c.game, this.capOn && !!this.c.prizes.cap);
      }
    },
  });

  // --------------------------------------------------------- the phone page
  /**
   * The phone's Wonder Wharf app: tickets, the attractions (price, best), prizes won and to win.
   * phone: the phone (its _head and _soon helpers), box: the app's element.
   */
  Carnival.phonePage = function (phone, box) {
    const g = phone.game, c = g.carnival;
    box.textContent = '';
    box.append(phone._head('Wonder Wharf'));
    const s = el('div', 'ph-scroll ph-wharf');
    if (!c || !c.byId) {
      s.append(phone._soon('Wonder Wharf', 'The fair is shut.'));
      box.append(s);
      return;
    }
    const money = (n) => VH.util.formatMoney(n);
    const top = el('div', 'ph-wharf-top');
    top.append(el('b', '', c.tickets + ' 🎟'), el('span', '', 'tickets to spend · ' + c.earned + ' won in all'));
    s.append(top);
    const section = (title) => s.append(el('div', 'ph-wharf-h', title));
    let n = 0;
    const row = (name, mid, right, cls) => {
      const r = el('div', 'ph-wharf-row' + (cls ? ' ' + cls : ''));
      r.append(el('span', 'ph-wharf-name', name), el('span', 'ph-wharf-mid', mid || ''), el('b', 'ph-wharf-right', right || ''));
      if (phone._nav) phone._nav(r, 'wharf:' + n++); // the arrows step down the rows
      s.append(r);
    };
    const defs = Object.keys(c.byId).map((k) => c.byId[k]);
    const nice = (d) => d.name.replace(/^the /, 'The ');
    section('Rides');
    const rode = (c.byId.shack && c.byId.shack.rode) || {};
    for (const d of defs) if (d.kind === 'ride') row(nice(d), rode[d.id] ? 'ridden ✓' : 'not yet', money(d.price || 0), rode[d.id] ? 'done' : '');
    section('Games');
    const won = (c.midway && c.midway.won) || {};
    for (const d of defs) {
      if (d.kind !== 'game' || d.id === 'dodgems') continue;
      const best = c.best[d.id];
      row(nice(d), best ? 'best ' + best + ' ' + (d.unit || 'points') : 'not played', money(d.price || 0), won[d.id] ? 'done' : '');
    }
    if (c.best.dodgems) row('Dodgems best', c.best.dodgems + ' points', '');
    section('Prizes');
    for (const P of PRIZES) {
      const n = c.prizes[P.id] || 0;
      row(P.name, n ? (ONCE[P.id] ? 'yours ✓' : 'won ×' + n) : 'to win', P.cost + ' 🎟', n ? 'done' : c.tickets >= P.cost ? 'can' : '');
    }
    const plush = PRIZES.filter((P) => P.kind === 'plush').reduce((m, P) => m + (c.prizes[P.id] || 0), 0) + (c.prizes.teddy || 0);
    s.append(el('div', 'ph-wharf-foot', 'Plush toys on Jay\'s shelf: ' + plush + (c.prizes.teddy ? ' (' + c.prizes.teddy + ' from the Golden Grabber)' : '') + '. Wonder Wharf is on Isla Paloma, open every day.'));
    box.append(s);
  };
})();
