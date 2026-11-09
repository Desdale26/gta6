/*
 * havoc.js — trouble at Vicehaven International: glass that shatters, boards
 * that spark, a terminal that empties, a security alert that grounds every
 * flight, airliners that catch fire and evacuate down their slides, and the
 * airport fire service racing out to them.
 *
 *   new VH.AirportHavoc(game)   game.airportHavoc, a world system in two parts:
 *     .hall   the terminal (HallHavoc, below): every glass pane, the sliding
 *             doors, the flight boards and gate screens, planters, bins,
 *             queue tapes, the forecourt bollards and the suitcases can be
 *             broken, by a bullet, a blast, a car, or Jay sprinting into the
 *             glass. terminal.js owns them and hides what breaks; this does
 *             the breaking, the mess on the floor and the bill.
 *     .air    the apron (HAVOC-AIR): VH.AirportHavoc.Air, if there is one, is
 *             made with (havoc) and gets update(dt) / reset() / stop() /
 *             serialize() / load(d) / stats() like a world system of its own.
 *   The parts both use:
 *     .damage(dollars, x, z)       add to the bill ("Airport chaos" on screen)
 *     .raise(kind, x, z, byJay)    a security alert, or keep one going: the
 *                                  alarm, amber beacons and the PA, the boards
 *                                  (Delayed / Cancelled), a ground stop, the
 *                                  evacuation and the armed guards
 *                                  (airportlife.js), the police at 2 stars with
 *                                  cars at the kerb. Over after two minutes of
 *                                  calm ("the alert is over"), flights resume.
 *     .alert                       { t, calm, kind, x, z, jay } while on, else null
 *     .hold(key, on, reason)       a ground stop that lasts while any key holds
 *                                  (airside.groundStop; airside.js may not have it)
 *   events: havoc:break { what, x, y, z, by }, havoc:alert { on, kind }
 *
 * What's broken mends itself once nobody's looking, five game hours on, or
 * all at once when Jay leaves the airport. The mess on the floor (glass,
 * soil, clothes from burst cases) is one instanced mesh with a cap.
 */
(function () {
  'use strict';

  const VH = window.VH;
  const { clamp, lerp } = VH.math;

  // ------------------------------------------------------------ tuning
  const AREA = 30; //         "at the terminal": this close to the building
  const CALM = 120; //        seconds of nothing new before the alert is over
  const MEND = 300; //        broken things are mended this long after, out of sight
  const AWAY = 380; //        Jay this far from the hall: everything mended at once
  const DEBRIS = 520; //      bits on the floor, at most
  // Closing speeds (m/s) a car breaks things at (glass and bins give way, bollards hold to 10).
  const RAM = { glass: 4.5, bollard: 10, bin: 3.5, plant: 4, palm: 5, door: 4 };
  // How many hits a prop takes, and what everything costs.
  const HP = { bin: 1, plant: 2, palm: 3, tape: 1 };
  const PRICE = {
    wall: 1800, shelter: 900, barrier: 1100, case: 650, door: 3200,
    dep: 14000, arr: 14000, reclaim: 6000, gate: 3800,
    palm: 450, plant: 220, bin: 120, tape: 60, bollard: 900, xray: 700, arch: 450, bag: 350,
  };
  const CLOTHES = [0xe8463c, 0x2f6fd6, 0xf2c230, 0xffffff, 0x27ae60, 0xff7fb0, 0x8e44ad, 0x1d2a44, 0xf08a2c, 0x7fd3e8, 0xd9d2c3];
  const GLASS = 0xcfe6f2;

  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const money = (n) => '$' + Math.round(n).toLocaleString('en-GB');

  // ================================================================ the system
  class AirportHavoc {
    constructor(game) {
      this.game = game;
      this.saveKey = 'airportHavoc';
      this.total = 0; //   dollars of damage at the airport, this save
      this.n = { glass: 0, screens: 0, cases: 0, things: 0, alerts: 0 };
      this.alert = null;
      this.holds = new Map(); // ground stop owners → reason
      this._held = false;
      this._t = 0;
      this.spree = 0; //   the bill on screen (since it last faded)
      this._hudT = 0;
      this.hall = new HallHavoc(this);
      // The apron's part, if HAVOC-AIR has defined it (below, or in a file of its own).
      const Air = AirportHavoc.Air;
      this.air = typeof Air === 'function' ? new Air(this) : null;
    }

    /** Where Jay is (his car's position when driving). */
    jay() {
      const p = this.game.player;
      return p.inVehicle && p.vehicle ? p.vehicle.pos : p.pos;
    }

    // ------------------------------------------------------------- the bill
    /** Add to the bill: the running total on screen, the stats. */
    damage(dollars, x, z) {
      if (!(dollars > 0)) return;
      this.total += dollars;
      this.spree += dollars;
      if (this.alert) this.alert.bill += dollars;
      this._hudT = 7;
      this._showBill(dollars);
      void x;
      void z;
    }

    _showBill(add) {
      const g = this.game;
      if (!g.hud || !g.hud.root) return;
      if (!this.el) {
        const el = document.createElement('div');
        el.className = 'vh-chaos';
        el.innerHTML = '<span class="ch-tag">Airport chaos</span><span class="ch-sum"></span><span class="ch-add"></span>';
        g.hud.root.append(el);
        this.el = el;
        this.elSum = el.querySelector('.ch-sum');
        this.elAdd = el.querySelector('.ch-add');
      }
      // Top right under the money and the wanted level, or under the Getting Started list while it's up.
      const hints = g.hud.hints;
      const up = hints && hints.offsetHeight > 0 && !hints.classList.contains('complete') && !hints.classList.contains('hidden-by-setting');
      this.el.style.top = up ? hints.offsetTop + hints.offsetHeight + 10 + 'px' : '';
      this.elSum.textContent = money(this.spree);
      this.elAdd.textContent = '+' + money(add);
      this.elAdd.classList.remove('pop');
      void this.elAdd.offsetWidth; // (restart the little pop)
      this.elAdd.classList.add('pop');
      this.el.classList.add('show');
    }

    _updateHud(dt) {
      if (this._hudT <= 0) return;
      this._hudT -= dt;
      if (this._hudT > 0) return;
      if (this.el) this.el.classList.remove('show');
      this.spree = 0;
    }

    // -------------------------------------------------------- ground stops
    /** A ground stop that lasts while any key holds one (the alert, a burning plane ...). */
    hold(key, on, reason) {
      if (on) this.holds.set(key, reason || 'Ground stop');
      else this.holds.delete(key);
      const a = this.game.airside;
      const want = this.holds.size > 0;
      if (a && typeof a.groundStop === 'function') {
        try {
          if (want) a.groundStop(true, this.holds.values().next().value);
          else if (this._held) a.groundStop(false);
        } catch (err) {
          /* airside.js is still being built: no ground stop */
        }
      }
      this._held = want;
    }

    // ------------------------------------------------------ security alert
    /**
     * Something happened in or at the terminal (kind: gun, blast, crash, damage,
     * vehicle ...): the security alert goes up, or carries on with the clock reset.
     */
    raise(kind, x, z, byJay) {
      const g = this.game;
      const H = this.hall;
      if (!H.ok || g.state === 'title') return;
      const A = this.alert;
      if (A) {
        A.calm = 0;
        if (byJay) A.jay = true;
        if (kind === 'gun' || kind === 'blast' || kind === 'vehicle') A.loud = true;
        // People near the new trouble run from it too (once a second is plenty).
        if (A.t - A.told > 1 || Math.hypot(x - A.x, z - A.z) > 12) {
          A.told = A.t;
          A.x = x;
          A.z = z;
          if (g.airportLife && g.airportLife.securityAlert) g.airportLife.securityAlert(true, { x, z, kind, jay: A.jay });
        }
        return;
      }
      this.alert = { t: 0, calm: 0, kind, x, z, jay: !!byJay, loud: kind === 'gun' || kind === 'blast' || kind === 'vehicle', bill: 0, copT: 4, kerbT: 2, kerb: 0, told: 0 };
      this.n.alerts++;
      if (H.term.setAlert) H.term.setAlert(true);
      if (g.airportLife && g.airportLife.securityAlert) g.airportLife.securityAlert(true, { x, z, kind, jay: !!byJay });
      this.hold('alert', true, 'Security alert');
      if (byJay && g.achievements) g.achievements.unlock('lockdown');
      H.alarm(true);
      VH.events.emit('havoc:alert', { on: true, kind });
    }

    /** The alert is over (quiet: Jay's long gone, or a new game: no PA). */
    _endAlert(quiet) {
      const g = this.game;
      if (!this.alert) return;
      this.alert = null;
      const H = this.hall;
      if (H.ok && H.term.setAlert) H.term.setAlert(false);
      if (g.airportLife && g.airportLife.securityAlert) g.airportLife.securityAlert(false, { quiet: !!quiet });
      this.hold('alert', false);
      H.alarm(false);
      VH.events.emit('havoc:alert', { on: false });
    }

    _updateAlert(dt) {
      const A = this.alert;
      if (!A) return;
      const g = this.game;
      A.t += dt;
      A.calm += dt;
      const d = this.hall.distT(this.jay());
      if (d > AWAY && A.calm > 10) return this._endAlert(true);
      if (A.calm > CALM) return this._endAlert(false);
      const pol = g.police;
      if (!pol || pol.enabled === false || (g.missions && g.missions.suppressHeat)) return;
      // Security has called it in: shooting, a blast, a car in the hall or a big bill is two stars.
      if (A.jay && A.copT > 0 && (A.loud || A.bill > 5000)) {
        A.copT -= dt;
        if (A.copT <= 0 && pol.level < 2 && d < 200) {
          if (pol.crime) pol.crime('airport', A.x, A.z);
          if (pol.level < 2 && pol.setLevel) {
            pol.setLevel(2, 'airport');
            if (pol._sawPlayer) pol._sawPlayer();
          }
        }
      }
      // ...and patrol cars come along Airport Road to the kerb, sirens going.
      if (pol.level >= 2 && A.kerb < 2 && d < 160) {
        A.kerbT -= dt;
        if (A.kerbT <= 0) {
          A.kerbT = 7;
          if (this.hall.kerbUnit()) A.kerb++;
        }
      }
    }

    // ------------------------------------------------------------ system
    update(dt) {
      this._t += dt;
      this.hall.update(dt);
      if (this.air && this.air.update) this.air.update(dt);
      this._updateAlert(dt);
      this._updateHud(dt);
    }

    blips() {
      return this.air && this.air.blips ? this.air.blips() : [];
    }

    reset() {
      this._endAlert(true);
      this.holds.clear();
      if (this._held) this.hold('alert', false);
      this.total = 0;
      this.n = { glass: 0, screens: 0, cases: 0, things: 0, alerts: 0 };
      this.spree = 0;
      this._hudT = 0;
      if (this.el) this.el.classList.remove('show');
      this.hall.reset();
      if (this.air && this.air.reset) this.air.reset();
    }

    stop() {
      this.hall.alarm(false);
      if (this.air && this.air.stop) this.air.stop();
    }

    stats() {
      const out = [];
      if (this.total > 0) out.push(['Damage at the airport', money(this.total)]);
      if (this.n.glass > 0) out.push(['Airport windows smashed', String(this.n.glass)]);
      if (this.n.cases > 0) out.push(['Suitcases burst open', String(this.n.cases)]);
      if (this.n.alerts > 0) out.push(['Airport security alerts', String(this.n.alerts)]);
      if (this.air && this.air.stats) out.push(...this.air.stats());
      return out;
    }

    serialize() {
      return { total: Math.round(this.total), n: Object.assign({}, this.n), air: this.air && this.air.serialize ? this.air.serialize() : undefined };
    }

    load(d) {
      this.total = (d && +d.total) || 0;
      const n = (d && d.n) || {};
      this.n = { glass: n.glass || 0, screens: n.screens || 0, cases: n.cases || 0, things: n.things || 0, alerts: n.alerts || 0 };
      if (this.air && this.air.load) this.air.load(d ? d.air : undefined);
    }
  }

  // ======================================================= the terminal
  // ---------------------------------------------------------------- HAVOC-HALL
  /**
   * The terminal's breakables (world.terminal.breakables, through the
   * Terminal at game.terminal: setPane / setProp / setBollard / setBoard /
   * setDoor), what breaks them, the mess, and what counts as trouble at the
   * terminal (the alert is the system's).
   */
  class HallHavoc {
    constructor(havoc) {
      this.h = havoc;
      const g = (this.game = havoc.game);
      this.T = g.world && g.world.terminal;
      this.term = g.terminal;
      this.ok = !!(this.T && this.term && this.term.ok && this.term.brk && this.term.setPane);
      if (!this.ok) return;
      const B = (this.B = this.term.brk);
      this.FY = this.T.floorY;
      this.box = this.T.bounds;
      this.hp = new Map(); // prop index → hits left
      this.tough = new Map(); // arches and x-ray machines: hits taken
      this.rem = new Map(); // pane → the jagged bits left in its frame
      this.when = { pane: new Map(), prop: new Map(), bollard: new Map(), board: new Map(), door: new Map() }; // broken at (seconds)
      this._t = 0;
      this._mendT = 2;
      this._away = 0;
      this._jv = { x: 0, z: 0 };
      this._spark = 0;
      this._glassT = -1;
      this._fxLeft = 60;
      // Each pane as a plane: across x or z, its span along the wall and its height.
      this.panes = B.panes.map((q) => {
        const acrossZ = q.nz !== 0;
        return { acrossZ, c: acrossZ ? q.z0 : q.x0, a0: acrossZ ? Math.min(q.x0, q.x1) : Math.min(q.z0, q.z1), a1: acrossZ ? Math.max(q.x0, q.x1) : Math.max(q.z0, q.z1), y0: q.y0, y1: q.y1 };
      });
      // A car (vehicles.js collideStatic) asks first before it bounces off these.
      B.panes.forEach((q, i) => q.col && (q.col.brk = { kind: 'pane', i }));
      B.props.forEach((q, i) => q.cols.forEach((c) => c && (c.brk = { kind: 'prop', i })));
      B.bollards.forEach((q, i) => q.col && (q.col.brk = { kind: 'bollard', i }));
      this._buildDebris();
      this._bind();
    }

    /** Distance from a point to the hall's footprint (0 inside). */
    distT(p) {
      const b = this.box;
      if (!b) return Infinity;
      return Math.hypot(Math.max(0, b.x0 - p.x, p.x - b.x1), Math.max(0, b.z0 - p.z, p.z - b.z1));
    }

    /** At the terminal: in it, on its forecourt, at its gates. */
    near(x, z, m) {
      const b = this.box;
      const r = m === undefined ? AREA : m;
      return !!b && x > b.x0 - r && x < b.x1 + r && z > b.z0 - r && z < b.z1 + r;
    }

    _bind() {
      const E = VH.events;
      E.on('combat:ray', (e) => this._ray(e, 'player'));
      E.on('combat:npcRay', (e) => this._ray(e, 'npc'));
      E.on('explosion', (e) => this._blast(e));
      E.on('vehicle:hitStatic', (e) => this._ram(e));
      E.on('gunshot', (e) => {
        if (this.near(e.x, e.z)) this.h.raise('gun', e.x, e.z, !!e.byPlayer);
      });
      E.on('vehicle:impact', (e) => {
        if (!e.v || e.speed < 9 || !this.near(e.x, e.z, 10)) return;
        this.h.raise('crash', e.x, e.z, e.v.driver === 'player');
      });
    }

    // ------------------------------------------------------------ bullets
    /** A bullet's path (combat:ray): every pane, screen, prop and bag it went through or stopped in. */
    _ray(e, by) {
      if (!this.ok) return;
      const { ox, oy, oz, dx, dy, dz } = e;
      const dist = Math.max(0, e.dist || 0);
      const ex = ox + dx * dist;
      const ez = oz + dz * dist;
      const b = this.box;
      if (Math.max(ox, ex) < b.x0 - 8 || Math.min(ox, ex) > b.x1 + 8 || Math.max(oz, ez) < b.z0 - 8 || Math.min(oz, ez) > b.z1 + 10) return;
      const src = { dx, dy, dz, by, power: 1 };
      // Glass: shatters at one hit (the bullet stopped in its collider, a little before or after the pane).
      const P = this.panes;
      for (let i = 0; i < P.length; i++) {
        const q = P[i];
        if (this.B.panes[i].broken) continue;
        const o = q.acrossZ ? oz : ox;
        const d = q.acrossZ ? dz : dx;
        if (Math.abs(d) < 1e-6) continue;
        const t = (q.c - o) / d;
        if (t < 0 || t > dist + 0.45) continue;
        const a = (q.acrossZ ? ox + dx * t : oz + dz * t);
        const y = oy + dy * t;
        if (a < q.a0 || a > q.a1 || y < q.y0 - 0.05 || y > q.y1 + 0.05) continue;
        src.x = q.acrossZ ? a : q.c;
        src.y = y;
        src.z = q.acrossZ ? q.c : a;
        this.breakPane(i, src);
      }
      if (by !== 'player') return;
      // Props: planters, bins, tapes (their posts), and the arches and x-ray machines (they spark).
      const props = this.B.props;
      for (let i = 0; i < props.length; i++) {
        const q = props[i];
        if (q.broken && !q.tough) continue;
        let t = -1;
        if (q.kind === 'tape') {
          for (const [px, pz] of q.posts) {
            t = rayBox(ox, oy, oz, dx, dy, dz, px - 0.12, q.y, pz - 0.12, px + 0.12, q.y + 1.0, pz + 0.12, dist + 0.2);
            if (t >= 0) break;
          }
        } else t = rayBox(ox, oy, oz, dx, dy, dz, q.x - q.hx, q.y, q.z - q.hz, q.x + q.hx, q.y + q.h, q.z + q.hz, dist + 0.3);
        if (t < 0) continue;
        this.hitProp(i, { x: ox + dx * t, y: oy + dy * t, z: oz + dz * t, dx, dy, dz, by, power: 1 });
      }
      // The bollards ring and spark (steel).
      for (const q of this.B.bollards) {
        if (q.broken) continue;
        const t = rayBox(ox, oy, oz, dx, dy, dz, q.x - 0.12, q.y, q.z - 0.12, q.x + 0.12, q.y + 0.95, q.z + 0.12, dist + 0.2);
        if (t >= 0) this._sparks(ox + dx * t, oy + dy * t, oz + dz * t, -dx, -dz, 6);
      }
      // Screens (the nearest one along the way): static on the first hit, dark on the second.
      const boards = this.T.boards;
      let bi = -1;
      let bt = dist + 0.3;
      for (let i = 0; i < boards.length; i++) {
        const t = rayQuad(ox, oy, oz, dx, dy, dz, boards[i], bt);
        if (t >= 0) {
          bi = i;
          bt = t;
        }
      }
      if (bi >= 0) this.hitBoard(bi, { x: ox + dx * bt, y: oy + dy * bt, z: oz + dz * bt, dx, dy, dz, by });
      // Bags going round on a belt, and travellers' cases (held or dropped).
      const bag = this.term.bagHit ? this.term.bagHit(ox, oy, oz, dx, dy, dz, dist + 0.25) : null;
      if (bag) {
        const got = this.term.dropBag(bag.j);
        if (got) this.burstBag({ x: bag.x, y: bag.y, z: bag.z, color: bag.color, dx, dz });
      }
      const L = this.game.airportLife;
      if (L && L.caseHit) {
        const c = L.caseHit(ox, oy, oz, dx, dy, dz, dist + 0.2);
        if (c && L.burstCase(c)) this.burstBag({ x: c.x, y: c.y, z: c.z, color: c.color, dx, dz });
      }
    }

    // ---------------------------------------------------------- explosions
    _blast(e) {
      if (!this.ok || !this.near(e.x, e.z, 25)) return;
      const r = Math.max(4, e.radius || 6);
      const by = e.source === 'player' || (e.source && (e.source.driver === 'player' || e.source.lastHitBy === 'player')) ? 'player' : 'other';
      const y = e.y === undefined ? this.FY + 1 : e.y;
      const away = (x, yy, z) => {
        const l = Math.hypot(x - e.x, z - e.z) || 1;
        return { x, y: yy, z, dx: (x - e.x) / l, dy: 0.2, dz: (z - e.z) / l, by, power: 2 };
      };
      // Glass goes a long way out; screens and props closer in.
      const P = this.panes;
      for (let i = 0; i < P.length; i++) {
        if (this.B.panes[i].broken) continue;
        const q = P[i];
        const a = clamp(q.acrossZ ? e.x : e.z, q.a0, q.a1);
        const yy = clamp(y, q.y0, q.y1);
        const px = q.acrossZ ? a : q.c;
        const pz = q.acrossZ ? q.c : a;
        if (Math.hypot(px - e.x, yy - y, pz - e.z) < r * 1.8) this.breakPane(i, away(px, yy, pz));
      }
      this.B.props.forEach((q, i) => {
        if (q.broken && !q.tough) return;
        if (Math.hypot(q.x - e.x, q.z - e.z) < r + Math.max(q.hx, q.hz)) this.hitProp(i, away(q.x, q.y + 0.5, q.z), true);
      });
      this.B.bollards.forEach((q, i) => {
        if (!q.broken && Math.hypot(q.x - e.x, q.z - e.z) < r * 0.6) this.breakBollard(i, away(q.x, q.y + 0.5, q.z));
      });
      this.T.boards.forEach((q, i) => {
        if (Math.hypot(q.x - e.x, q.y - y, q.z - e.z) < r * 1.3) this.hitBoard(i, away(q.x, q.y, q.z), true);
      });
      const doors = this.term.doors || [];
      doors.forEach((d, i) => {
        if (!d.broken && Math.hypot(d.x - e.x, this.box.z1 - e.z) < r * 1.4) this.breakDoor(i, away(d.x, this.FY + 1.5, this.box.z1));
      });
      this.h.raise('blast', e.x, e.z, by === 'player');
    }

    // --------------------------------------------------------------- cars
    /** vehicles.js: a car is about to bounce off one of ours. Hard enough, it goes instead. */
    _ram(e) {
      const ref = e.col && e.col.brk;
      const v = e.v;
      // (Jay's car, or one he's bailed out of. The police and the traffic stop at the glass.)
      if (!this.ok || !ref || !v || v.driver === 'ai') return;
      const vx = v.vel ? v.vel.x : 0;
      const vz = v.vel ? v.vel.z : 0;
      const closing = -(vx * (e.nx || 0) + vz * (e.nz || 0));
      const sp = Math.max(closing, 0);
      const by = v.driver === 'player' ? 'player' : 'other';
      const sp2 = Math.hypot(vx, vz) || 1;
      const src = { x: e.x, y: v.pos.y + 0.8, z: e.z, dx: vx / sp2, dy: 0, dz: vz / sp2, by, power: 1.5, car: v };
      let slow = 1;
      if (ref.kind === 'pane') {
        if (sp < RAM.glass) return;
        const q = this.B.panes[ref.i];
        src.y = clamp(src.y, q.y0, q.y1);
        if (this.breakPane(ref.i, src)) {
          slow = 0.86;
          // The pane above comes down with it at speed.
          if (sp > 12 && q.row === 0) {
            const up = this.B.panes.findIndex((p, j) => j > ref.i && j < ref.i + 3 && p.row === 1 && p.x0 === q.x0 && p.z0 === q.z0);
            if (up >= 0) this.breakPane(up, Object.assign({}, src, { y: this.B.panes[up].y0 + 1 }));
          }
        }
      } else if (ref.kind === 'bollard') {
        if (sp < RAM.bollard) {
          if (sp > 3 && this._t - this._spark > 0.3) {
            this._spark = this._t;
            this._sparks(e.x, v.pos.y + 0.6, e.z, e.nx || 0, e.nz || 0, 10);
          }
          return;
        }
        if (this.breakBollard(ref.i, src)) slow = 0.72;
      } else if (ref.kind === 'prop') {
        const q = this.B.props[ref.i];
        if (q.tough) {
          if (sp > 3 && this._t - this._spark > 0.3) {
            this._spark = this._t;
            this.hitProp(ref.i, src);
          }
          return;
        }
        if (sp < (RAM[q.kind] || 4)) return;
        if (this.breakProp(ref.i, src)) slow = 0.93;
      }
      if (slow < 1 && v.vel) {
        v.vel.x *= slow;
        v.vel.z *= slow;
        if (v.damage) v.damage(slow < 0.8 ? 45 : 12, null, 'crash');
        if (by === 'player' && this.game.cameraRig && this.game.cameraRig.shake) this.game.cameraRig.shake(slow < 0.8 ? 0.35 : 0.2);
      }
    }

    // -------------------------------------------------------------- break
    /** Shatter pane i (src: where and which way it was hit, and by whom). */
    breakPane(i, src) {
      const q = this.B.panes[i];
      if (!q || q.broken || !this.term.setPane(i, true)) return false;
      this.when.pane.set(i, this._t);
      const p = this.panes[i];
      const w = p.a1 - p.a0;
      const hgt = q.y1 - q.y0;
      const at = (u, v) => (p.acrossZ ? [lerp(p.a0, p.a1, u), lerp(q.y0, q.y1, v), p.c] : [p.c, lerp(q.y0, q.y1, v), lerp(p.a0, p.a1, u)]);
      // A shower of glints, and real bits that fall and stay on the floor.
      const fx = this.game.fx;
      // (A blast takes out dozens at once: the glints are rationed per frame.)
      const bursts = Math.min(this._fxLeft, clamp(Math.round(w * hgt * 1.1), 3, 10));
      this._fxLeft -= bursts;
      for (let k = 0; k < bursts; k++) {
        const [x, y, z] = at(Math.random(), Math.random());
        if (fx && fx.glass) fx.glass(x, y, z, 12);
      }
      const dirX = src.dx || 0;
      const dirZ = src.dz || 0;
      const n = clamp(Math.round(w * hgt * 1.4), 4, 14);
      for (let k = 0; k < n; k++) {
        const [x, y, z] = at(Math.random(), Math.random());
        const s = rnd(0.5, 2.5) * (src.power || 1);
        this._piece(x, y, z, rnd(0.08, 0.26), 0.014, rnd(0.06, 0.2), GLASS, dirX * s + rnd(-0.8, 0.8), rnd(-0.5, 1.2), dirZ * s + rnd(-0.8, 0.8));
      }
      this._remnants(i);
      const cx = (q.x0 + q.x1) / 2;
      const cz = (q.z0 + q.z1) / 2;
      if (this._t - this._glassT > 0.09) {
        this._glassT = this._t;
        this._glassSound(cx, (q.y0 + q.y1) / 2, cz, w * hgt > 4);
      }
      this.h.n.glass++;
      this._broke('glass', PRICE[q.kind] || PRICE.wall, cx, (q.y0 + q.y1) / 2, cz, src.by);
      return true;
    }

    /** Jagged bits left in the frame of pane i: along the sill, hanging from the top, at the sides. */
    _remnants(i) {
      const q = this.B.panes[i];
      const p = this.panes[i];
      const yaw = p.acrossZ ? 0 : Math.PI / 2;
      const out = [];
      const add = (a, y0, w, h) => {
        const P = this._stuck(p.acrossZ ? a : p.c, y0 + h / 2, p.acrossZ ? p.c : a, w, h, yaw, rnd(-0.5, 0.5));
        if (P) out.push(P);
      };
      const w = p.a1 - p.a0;
      for (let k = 0; k < 3; k++) {
        const pw = rnd(0.2, 0.6);
        add(lerp(p.a0 + pw / 2, p.a1 - pw / 2, Math.random()), q.y0 - 0.05, pw, rnd(0.15, 0.5));
      }
      const tw = rnd(0.25, 0.6);
      const th = rnd(0.12, 0.4);
      add(lerp(p.a0 + tw / 2, p.a1 - tw / 2, Math.random()), q.y1 - th + 0.05, tw, th);
      if (w > 1.5) {
        for (const e of [p.a0 + 0.06, p.a1 - 0.06]) {
          const h = rnd(0.4, 1.1);
          add(e, lerp(q.y0, q.y1 - h, Math.random()), rnd(0.08, 0.18), h);
        }
      }
      this.rem.set(i, out);
    }

    /** A piece that stays where it's put (y: its centre), at yaw, turned `roll` in its own plane. */
    _stuck(x, y, z, w, h, yaw, roll) {
      if (!this.deb) return null;
      const i = this._next;
      this._next = (this._next + 1) % DEBRIS;
      const old = this.pieces[i];
      if (old && old.fly) this.flying.splice(this.flying.indexOf(old), 1);
      const P = { i, x, y, z, sx: w, sy: h, sz: 0.014, gy: y - h / 2, fly: false, stuck: true, roll, t: this._t, yaw };
      this.pieces[i] = P;
      this._dc.setHex(GLASS);
      this.deb.setColorAt(i, this._dc);
      if (this.deb.instanceColor) this.deb.instanceColor.needsUpdate = true;
      this.deb.count = Math.max(this.deb.count, i + 1);
      this.deb.visible = true;
      this._place(P);
      return P;
    }

    /** Pane i is mended: its jagged bits go. */
    _unremnant(i) {
      const list = this.rem.get(i);
      if (!list) return;
      this.rem.delete(i);
      for (const P of list) {
        if (this.pieces[P.i] !== P || P.hide) continue;
        P.hide = true;
        this._place(P);
      }
    }

    /** A sliding door set smashed (a car through it while it was shut, a blast). */
    breakDoor(i, src) {
      if (!this.term.setDoor || !this.term.setDoor(i, true)) return false;
      const d = this.term.doors[i];
      this.when.door.set(i, this._t);
      const fx = this.game.fx;
      for (let k = 0; k < 6; k++) if (fx && fx.glass) fx.glass(d.x + rnd(-2, 2), this.FY + rnd(0.3, 3), this.box.z1, 14);
      for (let k = 0; k < 10; k++) this._piece(d.x + rnd(-2, 2), this.FY + rnd(0.3, 3), this.box.z1, rnd(0.08, 0.24), 0.014, rnd(0.06, 0.18), GLASS, (src.dx || 0) * 2 + rnd(-1, 1), rnd(0, 1), (src.dz || 0) * 2 + rnd(-1, 1));
      this._glassSound(d.x, this.FY + 1.5, this.box.z1, true);
      this.h.n.glass++;
      this._broke('door', PRICE.door, d.x, this.FY + 1.5, this.box.z1, src.by);
      return true;
    }

    /** A bullet or a blast hits prop i: knocked over once it's taken enough (tough ones just spark). */
    hitProp(i, src, blast) {
      const q = this.B.props[i];
      if (!q) return false;
      if (q.tough) {
        this._sparks(src.x, src.y, src.z, -(src.dx || 0), -(src.dz || 0), blast ? 30 : 14);
        this._fizz(src.x, src.z);
        if (q.kind === 'arch' && this.term.archBeep) this.term.archBeep(q.lane, true);
        // (It's billed for the first few hits; after that it's just sparks.)
        const n = this.tough.get(i) || 0;
        this.tough.set(i, n + 1);
        if (n < 4) this._broke(q.kind, PRICE[q.kind] || 500, src.x, src.y, src.z, src.by);
        return true;
      }
      if (q.broken) return false;
      const left = (this.hp.has(i) ? this.hp.get(i) : HP[q.kind] || 1) - (blast ? 9 : 1);
      this.hp.set(i, left);
      if (left > 0) {
        // Still standing: a puff of soil and leaves (or a clang off a bin).
        this._bits(q, src, 3);
        this._thud(src.x, src.z, 0.4);
        return false;
      }
      return this.breakProp(i, src);
    }

    /** Knock prop i over: it goes, and what it was lies about. */
    breakProp(i, src) {
      const q = this.B.props[i];
      if (!q || q.tough || q.broken || !this.term.setProp(i, true)) return false;
      this.when.prop.set(i, this._t);
      this.hp.delete(i);
      const dx = src.dx || 0;
      const dz = src.dz || 0;
      const yaw = Math.atan2(dx, dz);
      const y = q.y;
      switch (q.kind) {
        case 'bin':
          this._piece(q.x, y + 0.5, q.z, 0.5, 0.5, 0.95, 0x5a6068, dx * 2, 1.5, dz * 2, yaw, true);
          this._piece(q.x, y + 0.9, q.z, 0.52, 0.08, 0.52, 0x2b2f35, dx * 3 + rnd(-1, 1), 2.5, dz * 3 + rnd(-1, 1));
          this._bits(q, src, 10, [0xffffff, 0xf2c230, 0xe8463c, 0x8e8a82, 0x6fbf73]);
          break;
        case 'tape':
          for (const [px, pz] of q.posts) {
            this._piece(px, y + 0.5, pz, 0.08, 0.08, 1.0, 0xb9bfc6, dx * 1.5 + rnd(-0.5, 0.5), 1, dz * 1.5 + rnd(-0.5, 0.5), rnd(0, 6.3), true);
            this._piece(px, y + 0.9, pz, 0.05, 0.012, 1.4, q.color || 0x1f5fbf, rnd(-0.5, 0.5), 0.5, rnd(-0.5, 0.5), rnd(0, 6.3));
          }
          break;
        default: {
          // A planter: soil, bits of pot, leaves (and the palm's trunk across the floor).
          const big = q.kind === 'palm';
          if (big) this._piece(q.x, y + 1.2, q.z, 0.26, 0.26, 2.6, 0x8b6a45, dx * 1.5, 0.5, dz * 1.5, yaw, true);
          for (let k = 0; k < (big ? 8 : 5); k++) this._piece(q.x + rnd(-0.3, 0.3), y + 0.4, q.z + rnd(-0.3, 0.3), rnd(0.15, 0.4), rnd(0.05, 0.12), rnd(0.15, 0.4), 0x8a8174, dx * 2 + rnd(-1.5, 1.5), rnd(1, 3), dz * 2 + rnd(-1.5, 1.5));
          for (let k = 0; k < (big ? 6 : 4); k++) this._piece(q.x + rnd(-0.4, 0.4), y + 0.2, q.z + rnd(-0.4, 0.4), rnd(0.3, 0.6), 0.03, rnd(0.3, 0.6), 0x4a3a2a, dx + rnd(-1, 1), rnd(0.5, 1.5), dz + rnd(-1, 1));
          this._bits(q, src, big ? 14 : 8, [0x3f7a3a, 0x5b9a45, 0x2f6a2e]);
        }
      }
      const fx = this.game.fx;
      if (fx && fx.dust) fx.dust(q.x, y + 0.3, q.z, 0.6);
      this._thud(q.x, q.z, 1);
      this.h.n.things++;
      this._broke(q.kind, PRICE[q.kind] || 150, q.x, y + 0.5, q.z, src.by);
      return true;
    }

    /** A forecourt bollard knocked flat. */
    breakBollard(i, src) {
      const q = this.B.bollards[i];
      if (!q || q.broken || !this.term.setBollard(i, true)) return false;
      this.when.bollard.set(i, this._t);
      const dx = src.dx || 0;
      const dz = src.dz || 0;
      this._piece(q.x, q.y + 0.5, q.z, 0.22, 0.22, 0.95, 0xb9bfc6, dx * 4, 2, dz * 4, Math.atan2(dx, dz), true);
      this._sparks(q.x, q.y + 0.3, q.z, dx, dz, 18);
      this._clang(q.x, q.z);
      this.h.n.things++;
      this._broke('bollard', PRICE.bollard, q.x, q.y + 0.5, q.z, src.by);
      return true;
    }

    /** A board or gate screen hit: static, then dark (a blast: dark at once). */
    hitBoard(i, src, hard) {
      const q = this.T.boards[i];
      const st = (this.term.boardBroken && this.term.boardBroken[i]) || 0;
      const fx = this.game.fx;
      if (fx) this._sparks(src.x, src.y, src.z, Math.sin(q.yaw), Math.cos(q.yaw), st === 2 ? 4 : 16);
      if (st === 2) return false;
      const next = hard ? 2 : st + 1;
      if (!this.term.setBoard(i, next)) return false;
      this.when.board.set(i, this._t);
      for (let k = 0; k < 4; k++) this._piece(src.x + rnd(-0.3, 0.3), src.y, src.z + rnd(-0.3, 0.3), rnd(0.06, 0.16), 0.012, rnd(0.05, 0.12), 0x1b1d21, Math.sin(q.yaw) * rnd(0.5, 2), rnd(0, 1), Math.cos(q.yaw) * rnd(0.5, 2));
      this._fizz(src.x, src.z);
      if (st === 0) this.h.n.screens++;
      const price = (PRICE[q.kind] || PRICE.gate) * (st === 0 ? 0.6 : 0.4);
      this._broke('screen', price, src.x, src.y, src.z, src.by);
      return true;
    }

    /** A suitcase bursts open: the case lies open and the clothes go everywhere. */
    burstBag(c) {
      const fx = this.game.fx;
      const dx = c.dx || 0;
      const dz = c.dz || 0;
      const yaw = Math.atan2(dx, dz) + rnd(-0.6, 0.6);
      // The two halves, and what was packed.
      this._piece(c.x, c.y, c.z, 0.4, 0.1, 0.62, c.color || 0x2b2f35, dx * 0.8, 1.2, dz * 0.8, yaw);
      this._piece(c.x + Math.cos(yaw) * 0.45, c.y, c.z - Math.sin(yaw) * 0.45, 0.4, 0.08, 0.62, c.color || 0x2b2f35, dx * 1.2 + rnd(-0.5, 0.5), 2, dz * 1.2 + rnd(-0.5, 0.5), yaw);
      for (let k = 0; k < 14; k++) {
        const a = rnd(0, Math.PI * 2);
        const s = rnd(1, 3.2);
        this._piece(c.x, c.y + 0.2, c.z, rnd(0.25, 0.5), 0.03, rnd(0.2, 0.4), pick(CLOTHES), Math.cos(a) * s + dx * 1.5, rnd(2.5, 5.5), Math.sin(a) * s + dz * 1.5, undefined, false, 0.9);
      }
      if (fx && fx.soft) {
        for (let k = 0; k < 10; k++) {
          const col = new THREE.Color(pick(CLOTHES));
          fx.soft.emit({ x: c.x, y: c.y + 0.3, z: c.z, vx: rnd(-2.5, 2.5) + dx, vy: rnd(2, 5), vz: rnd(-2.5, 2.5) + dz, life: rnd(0.8, 1.4), size: 0.14, size1: 0.1, r: col.r, g: col.g, b: col.b, a: 1, drag: 1.2, grav: 6 });
        }
      }
      this._thud(c.x, c.z, 0.7);
      this.h.n.cases++;
      const g = this.game;
      if (g.achievements) g.achievements.unlock('baggage_reclaimed');
      this._broke('bag', PRICE.bag, c.x, c.y, c.z, 'player');
    }

    /** Booked: the bill, the event, and it's trouble at the terminal. */
    _broke(what, price, x, y, z, by) {
      this.h.damage(price, x, z);
      VH.events.emit('havoc:break', { what, x, y, z, by: by || 'other' });
      if (by === 'player' || by === 'other') this.h.raise('damage', x, z, by === 'player');
    }

    // --------------------------------------------------------------- mess
    _buildDebris() {
      const mat = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.15 });
      const m = (this.deb = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat, DEBRIS));
      m.name = 'airport havoc debris';
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.setColorAt(0, new THREE.Color(1, 1, 1));
      m.count = 0;
      m.visible = false;
      m.frustumCulled = false;
      m.receiveShadow = true;
      this.game.scene.add(m);
      this.pieces = new Array(DEBRIS).fill(null);
      this.flying = [];
      this._next = 0;
      this._dm = new THREE.Matrix4();
      this._dq = new THREE.Quaternion();
      this._de = new THREE.Euler(0, 0, 0, 'YXZ');
      this._dv = new THREE.Vector3();
      this._ds = new THREE.Vector3();
      this._dc = new THREE.Color();
    }

    /**
     * A bit of something (a box sx × sy × sz, a colour) thrown from (x, y, z) at
     * (vx, vy, vz). It tumbles, lands and stays, lying along `yaw` (a fallen bin
     * or bollard is a box as long as it was tall). `flutter`: clothes, they float.
     */
    _piece(x, y, z, sx, sy, sz, color, vx, vy, vz, yaw, side, flutter) {
      if (!this.deb) return;
      const i = this._next;
      this._next = (this._next + 1) % DEBRIS;
      const old = this.pieces[i];
      if (old && old.fly) this.flying.splice(this.flying.indexOf(old), 1);
      // Where it lands: the floor (or the forecourt, or a counter top) under where it'll come down.
      const g = 12;
      const fall = Math.max(0.1, y - this.FY);
      const tf = (vy + Math.sqrt(vy * vy + 2 * g * fall)) / g;
      const k = flutter ? 0.55 : 0.85;
      const lx = x + vx * tf * k;
      const lz = z + vz * tf * k;
      const ph = this.game.physics;
      let gy = ph && ph.groundHeight ? ph.groundHeight(lx, lz, y + 0.2) : this.FY;
      if (!(gy > -5)) gy = this.FY;
      const P = { i, x, y, z, vx, vy, vz, sx, sy, sz, gy, fly: true, t: this._t, yaw: yaw === undefined ? rnd(0, Math.PI * 2) : yaw, spin: rnd(-9, 9), rx: 0, rz: 0, flutter: !!flutter };
      void side;
      this.pieces[i] = P;
      this.flying.push(P);
      this._dc.setHex(color);
      this.deb.setColorAt(i, this._dc);
      if (this.deb.instanceColor) this.deb.instanceColor.needsUpdate = true;
      this.deb.count = Math.max(this.deb.count, i + 1);
      this.deb.visible = true;
      this._place(P);
    }

    _place(P) {
      const e = this._de;
      // Down, it lies on the floor along its yaw (its y size is how high it stands).
      if (P.fly) e.set(P.rx, P.yaw, P.rz);
      else e.set(0, P.yaw, P.stuck ? P.roll : 0);
      this._dq.setFromEuler(e);
      this._dv.set(P.x, P.fly ? P.y : P.gy + P.sy / 2 + (P.stuck ? 0 : 0.004), P.z);
      this._ds.set(P.hide ? 0 : P.sx, P.hide ? 0 : P.sy, P.hide ? 0 : P.sz);
      this._dm.compose(this._dv, this._dq, this._ds);
      this.deb.setMatrixAt(P.i, this._dm);
      this.deb.instanceMatrix.needsUpdate = true;
    }

    _updateDebris(dt) {
      const F = this.flying;
      for (let j = F.length - 1; j >= 0; j--) {
        const P = F[j];
        const drag = P.flutter ? 1.6 : 0.3;
        P.vx -= P.vx * drag * dt;
        P.vz -= P.vz * drag * dt;
        P.vy -= (P.flutter ? 7 : 12) * dt;
        if (P.flutter && P.vy < -2.2) P.vy = -2.2;
        P.x += P.vx * dt;
        P.y += P.vy * dt;
        P.z += P.vz * dt;
        P.rx += P.spin * dt;
        P.rz += P.spin * 0.7 * dt;
        if (P.y <= P.gy + 0.02 || this._t - P.t > 4) {
          P.fly = false;
          F.splice(j, 1);
        }
        this._place(P);
      }
    }

    /** Sweep the floor (all of it, or what's been there `age` seconds and is out of sight). */
    _sweep(age) {
      if (!this.deb) return;
      if (age === undefined) {
        this.rem.clear();
        this.pieces.fill(null);
        this.flying.length = 0;
        this._next = 0;
        this.deb.count = 0;
        this.deb.visible = false;
        return;
      }
      for (const P of this.pieces) {
        if (!P || P.hide || P.fly || P.stuck || this._t - P.t < age) continue;
        if (this.game.isVisible && this.game.isVisible(P.x, P.gy + 0.2, P.z, 0.5)) continue;
        P.hide = true;
        this._place(P);
      }
    }

    /** A few bits off something hit (src: where; cols: their colours). */
    _bits(q, src, n, cols) {
      const c = cols || (q.kind === 'bin' ? [0x5a6068, 0xffffff] : [0x4a3a2a, 0x3f7a3a, 0x5b9a45]);
      for (let k = 0; k < n; k++) {
        this._piece(src.x, src.y, src.z, rnd(0.05, 0.14), rnd(0.02, 0.05), rnd(0.05, 0.14), pick(c), -(src.dx || 0) * rnd(0.5, 2) + rnd(-1.2, 1.2), rnd(1, 3), -(src.dz || 0) * rnd(0.5, 2) + rnd(-1.2, 1.2));
      }
    }

    _sparks(x, y, z, nx, nz, n) {
      const fx = this.game.fx;
      if (fx && fx.sparks) fx.sparks(x, y, z, nx, nz, n, 6);
    }

    // ------------------------------------------------------------- sound
    _au(x, z, ref) {
      const g = this.game;
      const au = g.audio;
      if (!au || !au.ready || !au.ctx || !au._wBus) return null;
      const fb = g.vehicleFeedback;
      const pan = fb && fb._pan ? fb._pan(x, z) : 0;
      const gain = fb && fb._gain ? fb._gain(x, z, ref || 14) : 0.5;
      if (gain < 0.02) return null;
      return { au, t: au.ctx.currentTime, pan, gain };
    }

    /** A pane going: the crack, the crash, shards tinkling down for a second. */
    _glassSound(x, y, z, big) {
      const s = this._au(x, z, big ? 30 : 18);
      if (!s) return;
      const { au, t } = s;
      try {
        const bus = au._wBus({ pan: s.pan, gain: s.gain, verb: 0.25, echo: 0.05, life: 3 });
        au._wHit({ t, freq: 1300, q: 0.8, peak: 0.22, attack: 0.001, decay: 0.07, bus });
        au._wHit({ t, type: 'highpass', freq: 2400, peak: big ? 0.36 : 0.26, attack: 0.001, decay: big ? 0.55 : 0.35, bus });
        au._wHit({ t: t + 0.02, type: 'lowpass', brown: true, freq: 500, peak: 0.16, attack: 0.002, decay: 0.12, bus });
        const n = big ? 26 : 14;
        for (let k = 0; k < n; k++) au._wTinkle(t + 0.05 + Math.pow(Math.random(), 1.6) * (big ? 1.3 : 0.8), bus, rnd(2400, 7600), rnd(0.02, 0.05), rnd(-0.4, 0.4));
        au._wHit({ t: t + 0.3, type: 'highpass', freq: 3800, peak: 0.08, attack: 0.05, decay: big ? 0.9 : 0.5, bus });
      } catch (err) {
        /* no sound then */
      }
      void y;
    }

    _thud(x, z, k) {
      const s = this._au(x, z, 12);
      if (!s) return;
      try {
        const bus = s.au._wBus({ pan: s.pan, gain: s.gain * k, verb: 0.15, life: 1.2 });
        s.au._wClack(s.t, bus, rnd(320, 520), 0.16);
        s.au._wHit({ t: s.t, type: 'lowpass', brown: true, freq: 260, peak: 0.24, attack: 0.002, decay: 0.16, bus });
      } catch (err) {
        /* no sound */
      }
    }

    _clang(x, z) {
      const s = this._au(x, z, 16);
      if (!s) return;
      try {
        const bus = s.au._wBus({ pan: s.pan, gain: s.gain, verb: 0.2, life: 2 });
        for (const [f, pk, dc] of [[612, 0.1, 0.7], [1480, 0.05, 0.45], [2310, 0.03, 0.3]]) s.au._wTone({ t: s.t, freq: f, wave: 'triangle', peak: pk, attack: 0.001, decay: dc, bus });
        s.au._wHit({ t: s.t, type: 'lowpass', brown: true, freq: 300, peak: 0.3, attack: 0.002, decay: 0.15, bus });
      } catch (err) {
        /* no sound */
      }
    }

    /** A screen or machine shorting out. */
    _fizz(x, z) {
      const s = this._au(x, z, 12);
      if (!s) return;
      try {
        if (s.au.cameraSmash) s.au.cameraSmash(s.pan, s.gain);
        else s.au._wHit({ t: s.t, type: 'highpass', freq: 5000, peak: 0.12, attack: 0.002, decay: 0.3, bus: s.au._wBus({ pan: s.pan, gain: s.gain, life: 1 }) });
      } catch (err) {
        /* no sound */
      }
    }

    /** The alarm: a two-tone whoop round the hall while the alert is on (louder inside). */
    alarm(on) {
      const g = this.game;
      const au = g.audio;
      if (!on) {
        if (this._alarm) {
          const A = this._alarm;
          this._alarm = null;
          try {
            const t = A.ctx.currentTime;
            A.out.gain.setTargetAtTime(0, t, 0.15);
            A.osc.stop(t + 1);
            A.osc2.stop(t + 1);
          } catch (err) {
            /* already stopped */
          }
        }
        return;
      }
      if (this._alarm || !au || !au.ready || !au.ctx || !au.sfx) return;
      try {
        const ctx = au.ctx;
        const osc = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        osc.type = 'square';
        osc2.type = 'sawtooth';
        osc.frequency.value = 760;
        osc2.frequency.value = 763;
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 2200;
        const out = ctx.createGain();
        out.gain.value = 0;
        osc.connect(lp);
        osc2.connect(lp);
        lp.connect(out);
        out.connect(au.sfx);
        osc.start();
        osc2.start();
        this._alarm = { ctx, osc, osc2, out, ph: 0 };
      } catch (err) {
        this._alarm = null;
      }
    }

    _updateAlarm(dt) {
      const A = this._alarm;
      if (!A) {
        if (this.h.alert && this.game.audio && this.game.audio.ready) this.alarm(true);
        return;
      }
      const p = this.h.jay();
      const inside = this.term.isInside && this.term.isInside(p.x, p.z, p.y);
      const d = this.distT(p);
      const lv = inside ? 0.045 : 0.035 * clamp(1 - d / 140, 0, 1);
      const paused = this.game.state !== 'playing';
      A.ph += dt;
      try {
        const t = A.ctx.currentTime;
        // Whoop: up from 620 to 980 Hz over 0.7 s, again and again.
        const k = (A.ph % 0.85) / 0.85;
        const f = 620 + 360 * Math.min(1, k / 0.8);
        A.osc.frequency.setTargetAtTime(f, t, 0.02);
        A.osc2.frequency.setTargetAtTime(f * 1.004, t, 0.02);
        A.out.gain.setTargetAtTime(paused ? 0 : lv * (k < 0.8 ? 1 : 0.25), t, 0.05);
      } catch (err) {
        /* never mind */
      }
    }

    // --------------------------------------------------------- the police
    /** A patrol car along Airport Road to the kerb, siren on (true if one came). */
    kerbUnit() {
      const g = this.game;
      const pol = g.police;
      if (!pol || !g.vehicles || !VH.Police || !VH.Police.PursuitDriver || !VH.Vehicle || !VH.Vehicle.typeSpec) return false;
      const type = VH.Vehicle.typeSpec('interceptor') ? 'interceptor' : null;
      if (!type) return false;
      const p = this.h.jay();
      const kz = this.T.kerb && this.T.kerb.departures && this.T.kerb.departures[0] ? this.T.kerb.departures[0].z : this.box.z1 + 8.8;
      // From the east (the westbound lanes), well behind where it's going, out of sight if we can.
      const xs = [this.box.x1 + 70, this.box.x1 + 110, Math.min(this.box.x1 + 40, p.x + 120)];
      let at = null;
      for (const x of xs) {
        if (g.isVisible && g.isVisible(x, 1, kz, 3) && Math.abs(x - p.x) < 120) continue;
        at = x;
        break;
      }
      if (at === null) at = xs[1];
      try {
        const v = g.vehicles.spawn(type, at, kz, -Math.PI / 2, { role: 'police' });
        if (!v) return false;
        v.role = 'police';
        v.driver = 'ai';
        v.isPolice = true;
        v.siren = true;
        v.controller = new VH.Police.PursuitDriver(pol, v);
        if (v.setSpeed) v.setSpeed(16);
        pol.units.push(v);
        return true;
      } catch (err) {
        return false;
      }
    }

    // ------------------------------------------------------------ update
    update(dt) {
      if (!this.ok) return;
      this._t += dt;
      this._fxLeft = 60;
      const g = this.game;
      const pl = g.player;
      const p = this.h.jay();
      const d = this.distT(p);
      this._updateDebris(dt);
      this._updateAlarm(dt);
      if (d < 60) {
        this._jayIntoGlass(pl, dt);
        this._cars();
      }
      // Mending: all at once when Jay's gone; otherwise bit by bit, out of sight, a while on.
      this._mendT -= dt;
      if (this._mendT <= 0) {
        this._mendT = 2;
        if (d > AWAY) {
          this._away += 2;
          if (this._away > 4) this.mendAll();
        } else {
          this._away = 0;
          this._mendSome();
        }
      }
    }

    /** Jay sprinting into the glass: through it. */
    _jayIntoGlass(pl, dt) {
      const jv = this._jv;
      const was = Math.hypot(jv.x, jv.z);
      if (pl.inVehicle || pl.isDead) {
        jv.x = jv.z = 0;
        return;
      }
      const p = pl.pos;
      if (was > 5.2) {
        for (let i = 0; i < this.panes.length; i++) {
          const q = this.panes[i];
          const P = this.B.panes[i];
          if (P.broken || !P.col || (P.kind === 'wall' && P.row !== 0)) continue;
          const a = q.acrossZ ? p.x : p.z;
          if (a < q.a0 + 0.2 || a > q.a1 - 0.2 || p.y + 1 < q.y0 || p.y > q.y1) continue;
          const off = (q.acrossZ ? p.z : p.x) - q.c;
          if (Math.abs(off) > 0.85) continue;
          // Moving at it (towards the plane), fast.
          const vn = q.acrossZ ? jv.z : jv.x;
          if (vn * off >= 0 || Math.abs(vn) < 4) continue;
          this.breakPane(i, { x: q.acrossZ ? p.x : q.c, y: p.y + 1, z: q.acrossZ ? q.c : p.z, dx: jv.x / was, dy: 0, dz: jv.z / was, by: 'player', power: 1 });
          // He keeps going (a little slower, and it hurt).
          pl.vel.x = jv.x * 0.8;
          pl.vel.z = jv.z * 0.8;
          if (pl.damage) pl.damage(4, 'fall');
          break;
        }
      }
      jv.x = pl.vel.x;
      jv.z = pl.vel.z;
      void dt;
    }

    /** Cars in the hall and the forecourt: through the queue tapes and shut doors; it's an alert. */
    _cars() {
      const g = this.game;
      const vs = g.vehicles ? g.vehicles.list : [];
      const b = this.box;
      const doors = this.term.doors || [];
      for (const v of vs) {
        if (v.removed || !v.pos) continue;
        const x = v.pos.x;
        const z = v.pos.z;
        if (x < b.x0 - 3 || x > b.x1 + 3 || z < b.z0 - 3 || z > b.z1 + 4) continue;
        const sp = Math.abs(v.speed || 0);
        const inside = z < b.z1 - 0.5 && x > b.x0 && x < b.x1;
        if (inside && sp > 1.5) this.h.raise('vehicle', x, z, v.driver === 'player');
        // Through a door set that hadn't opened: the glass goes.
        if (Math.abs(z - b.z1) < Math.max(1.2, v.hz || 2) && sp > RAM.door) {
          doors.forEach((d, i) => {
            if (!d.broken && Math.abs(x - d.x) < 2.2 && d.open < 0.85) this.breakDoor(i, { dx: Math.sin(v.yaw || 0), dz: Math.cos(v.yaw || 0), by: v.driver === 'player' ? 'player' : 'other' });
          });
        }
        if (!inside || sp < 2) continue;
        // Queue tapes have no collider: a car just takes them down.
        const r = Math.max(v.hx || 1, v.hz || 2);
        this.B.props.forEach((q, i) => {
          if (q.kind !== 'tape' || q.broken) return;
          if (Math.abs(x - q.x) > q.hx + r || Math.abs(z - q.z) > q.hz + r) return;
          if (q.posts.some(([px, pz]) => Math.hypot(px - x, pz - z) < r)) this.breakProp(i, { x, y: this.FY + 0.5, z, dx: v.vel ? v.vel.x / (sp || 1) : 0, dz: v.vel ? v.vel.z / (sp || 1) : 0, by: v.driver === 'player' ? 'player' : 'other' });
        });
      }
    }

    /** Put back whatever's been broken a while (MEND), where Jay isn't looking. */
    _mendSome() {
      const g = this.game;
      const p = this.h.jay();
      const old = (m) => {
        const out = [];
        for (const [i, t] of m) if (this._t - t > MEND) out.push(i);
        return out;
      };
      const unseen = (x, y, z) => Math.hypot(p.x - x, p.z - z) > 45 && !(g.isVisible && g.isVisible(x, y, z, 2));
      for (const i of old(this.when.pane)) {
        const q = this.B.panes[i];
        if (unseen((q.x0 + q.x1) / 2, (q.y0 + q.y1) / 2, (q.z0 + q.z1) / 2)) {
          this.term.setPane(i, false);
          this.when.pane.delete(i);
          this._unremnant(i);
        }
      }
      for (const i of old(this.when.prop)) {
        const q = this.B.props[i];
        if (unseen(q.x, q.y + 0.5, q.z)) {
          this.term.setProp(i, false);
          this.when.prop.delete(i);
        }
      }
      for (const i of old(this.when.bollard)) {
        const q = this.B.bollards[i];
        if (unseen(q.x, q.y + 0.5, q.z)) {
          this.term.setBollard(i, false);
          this.when.bollard.delete(i);
        }
      }
      for (const i of old(this.when.board)) {
        const q = this.T.boards[i];
        if (unseen(q.x, q.y, q.z)) {
          this.term.setBoard(i, 0);
          this.when.board.delete(i);
        }
      }
      for (const i of old(this.when.door)) {
        const d = this.term.doors[i];
        if (d && unseen(d.x, this.FY + 1.5, this.box.z1)) {
          if (this.term.setDoor) this.term.setDoor(i, false);
          this.when.door.delete(i);
        }
      }
      this._sweep(MEND);
    }

    /** Everything as it was (Jay's left the airport; a new game). */
    mendAll() {
      if (!this.ok) return;
      let any = this.deb && this.deb.count > 0;
      for (const m of Object.values(this.when)) {
        if (m.size) any = true;
        m.clear();
      }
      if (!any && !this.term.broken) return;
      this.term.restoreAll();
      if (this.term.setDoor) (this.term.doors || []).forEach((d, i) => this.term.setDoor(i, false));
      this.hp.clear();
      this.tough.clear();
      this._sweep();
    }

    reset() {
      if (!this.ok) return;
      this.alarm(false);
      this.mendAll();
      this._jv.x = this._jv.z = 0;
    }
  }

  // ---------------------------------------------------------------- maths
  /** A ray against an axis-aligned box: the distance in, or -1. */
  function rayBox(ox, oy, oz, dx, dy, dz, x0, y0, z0, x1, y1, z1, maxT) {
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
    if (!slab(ox, dx, x0, x1) || !slab(oy, dy, y0, y1) || !slab(oz, dz, z0, z1)) return -1;
    return t0;
  }

  /** A ray against a board ({ x, y, z, yaw, w, h }: a rectangle facing along yaw): the distance, or -1. */
  function rayQuad(ox, oy, oz, dx, dy, dz, q, maxT) {
    const nx = Math.sin(q.yaw);
    const nz = Math.cos(q.yaw);
    const den = dx * nx + dz * nz;
    if (Math.abs(den) < 1e-6) return -1;
    const t = ((q.x - ox) * nx + (q.z - oz) * nz) / den;
    if (t < 0 || t > maxT) return -1;
    const px = ox + dx * t - q.x;
    const py = oy + dy * t - q.y;
    const pz = oz + dz * t - q.z;
    const u = px * nz - pz * nx; // along the board
    if (Math.abs(u) > q.w / 2 || Math.abs(py) > q.h / 2) return -1;
    return t;
  }

  AirportHavoc.Hall = HallHavoc;
  // ---------------------------------------------------------------- HAVOC-AIR
  // The apron's part goes here: class Air { constructor(havoc) ... } and
  // AirportHavoc.Air = Air (havoc.damage / havoc.raise / havoc.hold are shared).

  VH.AirportHavoc = AirportHavoc;
})();
