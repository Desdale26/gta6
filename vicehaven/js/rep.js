/*
 * rep.js — Street Rep: experience and levels for everything Jay does, and
 * the perks that come with them.
 *
 * A world system (main.js WORLD_SYSTEMS). Rep comes from the story, side
 * jobs, races, hold-ups, taxi fares, stunt jumps, lanterns, chop shops, odd
 * jobs, street encounters, cash stashes, businesses, achievements and the
 * Daily Hustles (dailies.js), and a little from near misses, new districts
 * and miles on the clock. The small things are rate-limited (so much per few
 * minutes of play), so nothing can be farmed for long.
 *
 * Levels run from 1 to 50: quick at first (level 2 in the first few
 * minutes, level 10 in an hour or two of play), a long-term goal at the
 * top. Every level pays $200 x the new level, and some unlock a perk.
 *
 *   game.rep.add(xp, reason)   → the XP actually given (after rate limits)
 *   game.rep.level              1..50
 *   game.rep.xp                 XP into the current level
 *   game.rep.next               XP the current level takes (the bar is xp / next;
 *                               game.rep.toGo is what's left)
 *   game.rep.total              XP earned in all
 *   game.rep.perk(id)           what a perk is worth right now:
 *     'payday' 'chop' 'oddjob' 'taxi' 'stash'   a multiplier on that pay (1 = no perk yet)
 *     'guns'                                     a multiplier on Bayline Arms prices (0.9 = 10% off)
 *     'health' 'armor'                           extra max health / armour (0 = none yet);
 *                                                rep.js applies these to the player itself
 *   game.rep.perkList()         [{ level, label, unlocked, id, value }] for the phone
 *   game.rep.nextPerk()         the next one still to come, or null
 *   game.rep.banner(b)          a big banner in the middle of the screen, queued so two
 *                               never overlap: { kicker, title, big, sub, lines, tone, sound }
 *
 *   rep:xp { amount, reason }   rep:levelup { level, perks: [labels] }
 *
 * The badge by the money (top right) shows the level and an XP bar that
 * fills as Rep comes in, with a small "+40 REP" float.
 *
 * Max health and armour: rep.js adds its bonus on top of whatever the
 * player's maximum already is, and takes back only what it added, so other
 * systems (oddjobs.js) can add theirs the same way.
 */
(function () {
  'use strict';

  const VH = window.VH;
  const el = (tag, cls, text) => VH.util.el(tag, cls, text);
  const money = (n) => VH.util.formatMoney(n);

  const MAX_LEVEL = 50;
  const LEVEL_CASH = 200; // dollars x the new level

  /** XP it takes to go from `level` to the next: 80, 120, 190, 270 ... about 7,000 near the top. */
  function needFor(level) {
    return Math.round((80 + 40 * Math.pow(Math.max(0, level - 1), 1.4)) / 10) * 10;
  }

  // ------------------------------------------------------------- perks
  // [level, id, step]: steps of the same perk add up.
  const PERKS = [
    [3, 'taxi', 0.15],
    [5, 'health', 25],
    [7, 'payday', 0.1],
    [9, 'guns', 0.1],
    [11, 'chop', 0.15],
    [13, 'armor', 25],
    [15, 'oddjob', 0.15],
    [18, 'stash', 0.25],
    [20, 'payday', 0.2],
    [22, 'taxi', 0.2],
    [24, 'health', 25],
    [26, 'chop', 0.15],
    [28, 'guns', 0.1],
    [30, 'oddjob', 0.2],
    [32, 'armor', 25],
    [34, 'stash', 0.25],
    [36, 'payday', 0.2],
    [38, 'chop', 0.2],
    [40, 'health', 25],
    [42, 'taxi', 0.25],
    [44, 'guns', 0.1],
    [46, 'oddjob', 0.25],
    [48, 'armor', 25],
    [50, 'payday', 0.25],
    [50, 'stash', 0.5],
  ];
  const FLAT = { health: true, armor: true };
  const pct = (k) => Math.round(k * 100) + '%';
  // How each perk reads, given its new total.
  const PERK_TEXT = {
    payday: (t) => 'Business paydays +' + pct(t),
    chop: (t) => 'Chop shop payouts +' + pct(t),
    oddjob: (t) => 'Odd job pay +' + pct(t),
    taxi: (t) => 'Taxi fares and tips +' + pct(t),
    stash: (t) => 'Cash stash finds +' + pct(t),
    guns: (t) => pct(t) + ' off at Bayline Arms',
    health: (t) => 'Max health +' + t,
    armor: (t) => 'Max armour +' + t,
  };
  const PERK_LIST = (() => {
    const sum = {};
    return PERKS.map(([level, id, step]) => {
      sum[id] = (sum[id] || 0) + step;
      return { level, id, value: step, label: PERK_TEXT[id](Math.round(sum[id] * 100) / 100) };
    });
  })();

  // ------------------------------------------------------------ XP table
  // What things are worth. Events from the other systems are wired in _bind().
  const XP = {
    district: 25, //    first time in a district (per save)
    tutorial: 6, //     each "Getting started" item ticked
    tutorialAll: 30,
    carFirst: 10,
    car: 2, //          each car taken after that (rate-limited)
    nearMiss: 2, //     (rate-limited)
    perKm: 3, //        driving
    lantern: 50,
    lanternsAll: 500,
    stunt: 100, //      a jump cleared for the first time
    stuntAgain: 10, //  (rate-limited)
    stash: 40,
    respray: 15,
    gunshop: 5,
    pickup: 2,
    achievement: 75,
    holdup: 60,
    holdupClean: 40,
    holdupSafe: 40,
    evadePerStar: 20,
  };
  // Rate limits: [most XP, per seconds of play].
  const LIMITS = {
    nearMiss: [40, 300],
    car: [24, 300],
    stuntAgain: [40, 300],
    respray: [15, 300],
    gunshop: [15, 300],
    pickup: [20, 300],
    evade: [200, 300],
    challenge: [300, 600],
    drive: [90, 600],
  };

  // ============================================================== system
  class Rep {
    constructor(game) {
      this.game = game;
      this.saveKey = 'rep';
      this.level = 1;
      this.xp = 0;
      this.total = 0;
      this._hpOn = 0; //   extra max health rep.js has put on the player
      this._armorOn = 0;
      this._buckets = {};
      this._banners = [];
      this._bannerUntil = 0;
      this._t = 0;
      this._maxHeat = 0;
      this._metres = 0;
      this.seen = {}; //   districts visited (per save)
      this.tut = {}; //    checklist items paid for (per save)
      this.firstCar = false;
      this._buildDom();
      this._bind();
      this._render(false);
    }

    get next() {
      return this.level >= MAX_LEVEL ? 0 : needFor(this.level);
    }

    get toGo() {
      return this.level >= MAX_LEVEL ? 0 : Math.max(0, this.next - this.xp);
    }

    get maxLevel() {
      return MAX_LEVEL;
    }

    // ------------------------------------------------------------ perks
    /** What a perk is worth at the current level (see the header). */
    perk(id) {
      let sum = 0;
      for (const p of PERK_LIST) if (p.id === id && p.level <= this.level) sum += p.value;
      if (FLAT[id]) return sum;
      if (id === 'guns') return Math.max(0.5, 1 - sum);
      if (!PERK_TEXT[id]) return 1;
      return 1 + sum;
    }

    perkList() {
      return PERK_LIST.map((p) => ({ level: p.level, label: p.label, unlocked: p.level <= this.level, id: p.id, value: p.value }));
    }

    nextPerk() {
      const p = PERK_LIST.find((q) => q.level > this.level);
      return p ? { level: p.level, label: p.label, id: p.id } : null;
    }

    /** Put the health and armour perks on the player (only the difference from what's there). */
    _applyVitals(topUp) {
      const p = this.game.player;
      if (!p) return;
      const hp = this.perk('health');
      const ar = this.perk('armor');
      const dh = hp - this._hpOn;
      if (dh) {
        p.maxHealth = Math.max(1, p.maxHealth + dh);
        this._hpOn = hp;
        if (topUp && dh > 0 && !p.isDead) p.health = Math.min(p.maxHealth, p.health + dh);
        else p.health = Math.min(p.health, p.maxHealth);
      }
      const da = ar - this._armorOn;
      if (da) {
        p.maxArmor = Math.max(1, p.maxArmor + da);
        this._armorOn = ar;
        p.armor = Math.min(p.armor, p.maxArmor);
      }
    }

    // --------------------------------------------------------------- XP
    /**
     * Give Rep. `reason` names where it came from (rep:xp); a reason with a
     * rate limit (LIMITS) is capped. Returns the XP actually given.
     */
    add(xp, reason) {
      xp = Math.round(Number(xp) || 0);
      if (xp <= 0) return 0;
      if (reason && LIMITS[reason]) xp = this._budget(reason, xp);
      if (xp <= 0) return 0;
      this.total += xp;
      VH.events.emit('rep:xp', { amount: xp, reason: reason || '' });
      if (this.level >= MAX_LEVEL) {
        this._float(xp);
        return xp;
      }
      this.xp += xp;
      const gained = [];
      while (this.level < MAX_LEVEL && this.xp >= needFor(this.level)) {
        this.xp -= needFor(this.level);
        this.level++;
        gained.push(this.level);
      }
      if (this.level >= MAX_LEVEL) this.xp = 0;
      this._float(xp);
      if (gained.length) {
        for (const lv of gained) this._levelUp(lv);
        this._applyVitals(true);
        this._render(true);
        if (this.game._autoSaveSoon) this.game._autoSaveSoon();
      } else this._render(false);
      return xp;
    }

    /** So much XP of one kind per stretch of play. */
    _budget(key, amount) {
      const lim = LIMITS[key];
      const now = this.game.playTime || 0;
      let b = this._buckets[key];
      if (!b || now - b.t > lim[1] || now < b.t) b = this._buckets[key] = { t: now, used: 0 };
      const give = Math.min(Math.max(0, lim[0] - b.used), amount);
      b.used += give;
      return give;
    }

    _levelUp(level) {
      const g = this.game;
      const perks = PERK_LIST.filter((p) => p.level === level).map((p) => p.label);
      const cash = LEVEL_CASH * level;
      g.giveMoney(cash, 'rep');
      VH.events.emit('rep:levelup', { level, perks });
      // Two level-ups in a row (a big job) make one banner.
      const last = this._banners[this._banners.length - 1];
      if (last && last.levelUp) {
        last.big = String(level);
        last.cash += cash;
        last.lines = last.lines.concat(perks);
        last.sub = '+' + money(last.cash) + ' bonus';
        last.level = level;
        return;
      }
      this.banner({ levelUp: true, level, cash, kicker: 'Street Rep', title: 'Level up', big: String(level), sub: '+' + money(cash) + ' bonus', lines: perks.slice(), tone: 'level', sound: 'level' });
    }

    // ------------------------------------------------------------ events
    _live() {
      const s = this.game.state;
      return s === 'playing' || s === 'dialog';
    }

    _bind() {
      const g = this.game;
      const on = (type, fn) => VH.events.on(type, (e) => {
        if (this._live()) fn(e || {});
      });
      const mine = (v) => v && v === g.player.vehicle;

      // The story and the side jobs (races, Dex's list, bounties, turf wars, side stories).
      on('mission:pass', (e) => {
        const m = e.m || {};
        const mins = m.estMinutes || (m._main ? 8 : 6);
        let xp;
        if (m._main) xp = 80 + 15 * mins;
        else if (m.giver === 'race') xp = 120; // the same every time: a race takes a while
        else xp = Math.round((50 + 12 * mins) * (m.repeatable ? 0.6 : 1));
        this.add(xp, m._main ? 'story' : m.giver === 'race' ? 'race' : 'side job');
      });
      on('challenge:finish', (e) => {
        const xp = { gold: 120, silver: 80, bronze: 50 }[e.medal] || 15;
        this.add(xp, 'challenge');
      });
      // Hold-ups.
      on('holdup:bag', (e) => this.add(XP.holdup + (e.clean ? XP.holdupClean : 0), 'holdup'));
      on('holdup:safe', () => this.add(XP.holdupSafe, 'holdup'));
      // Police: losing them pays by how hot it got.
      VH.events.on('police:level', (e) => {
        if (e && e.level > 0) this._maxHeat = Math.max(this._maxHeat, e.level);
        else if (e && e.reason !== 'evaded' && e.reason !== 'respray') this._maxHeat = 0; // (police:evaded follows those)
      });
      on('police:evaded', () => {
        const stars = Math.max(1, this._maxHeat);
        this._maxHeat = 0;
        this.add(XP.evadePerStar * stars, 'evade');
      });
      // Driving.
      on('vehicle:enter', (e) => {
        if (!e.v || e.v.kind === 'tank') return;
        if (!this.firstCar) {
          this.firstCar = true;
          this.add(XP.carFirst, 'car');
        } else if (e.jacked || !e.v._repTaken) this.add(XP.car, 'car');
        e.v._repTaken = true;
      });
      on('vehicle:nearMiss', (e) => {
        if (mine(e.v)) this.add(XP.nearMiss, 'nearMiss');
      });
      on('respray:done', () => this.add(XP.respray, 'respray'));
      // Activities (activities.js).
      on('taxi:fare', (e) => this.add(25 + Math.min(45, Math.round((e.pay || 0) / 10)), 'taxi'));
      on('stunt:jump', (e) => {
        if (e.first === false) this.add(XP.stuntAgain, 'stuntAgain');
        else this.add(XP.stunt, 'stunt');
      });
      on('lantern:found', () => {
        const a = g.activities;
        const n = a && a.lanternsFound ? Object.keys(a.lanternsFound).length : 0;
        this.add(XP.lantern + (a && a.lanterns && n >= a.lanterns.length ? XP.lanternsAll : 0), 'lantern');
      });
      // Shops and businesses.
      on('gunshop:buy', () => this.add(XP.gunshop, 'gunshop'));
      on('property:bought', (e) => this.add(200 + Math.round(((e.p && e.p.price) || 0) / 500), 'property'));
      on('property:upgraded', (e) => this.add(100 * Math.max(1, e.tier || 1), 'property'));
      on('pickup:collected', () => this.add(XP.pickup, 'pickup'));
      on('achievement:unlocked', () => this.add(XP.achievement, 'achievement'));
      // The Hustle update's money makers.
      on('chop:sold', (e) => this.add(Math.min(120, 20 + Math.round((e.value || 0) / 40)) + (e.hot ? 25 : 0), 'chop'));
      on('oddjob:done', (e) => this.add(20 + 4 * Math.max(1, e.level || 1), 'oddjob'));
      on('oddjob:level', (e) => this.add(25 * Math.max(1, e.level || 1), 'oddjob'));
      on('encounter:done', (e) => this.add(Math.min(100, 30 + Math.round((e.pay || 0) / 40)) + (e.good ? 20 : 0), 'encounter'));
      on('stash:found', (e) => this.add(XP.stash + Math.min(30, Math.round((e.value || 0) / 50)), 'stash'));
    }

    // ------------------------------------------------------------ update
    update(dt) {
      const g = this.game;
      const p = g.player;
      // Miles on the clock (cars and bikes; not flying about).
      const v = p.inVehicle ? p.vehicle : null;
      if (v && (v.kind === 'car' || v.kind === 'bike') && !v.wrecked) {
        this._metres += Math.abs(v.speed) * dt;
        if (this._metres >= 1000) {
          this._metres -= 1000;
          this.add(XP.perKm, 'drive');
        }
      }
      this._t -= dt;
      if (this._t <= 0) {
        this._t = 1;
        this._poll();
      }
      this._showBanners();
    }

    /** Once a second: new districts, the getting-started checklist. */
    _poll() {
      const g = this.game;
      if (document.body.classList.contains('cutscene')) return;
      const d = g.world && g.world.districtAt ? g.world.districtAt(g.player.pos.x, g.player.pos.z) : null;
      if (d && d.id && !this.seen[d.id]) {
        this.seen[d.id] = true;
        this.add(XP.district, 'district');
      }
      const list = g.hud && g.hud.checklist;
      if (list) {
        let fresh = 0;
        for (const id of Object.keys(list)) {
          if (!list[id] || this.tut[id]) continue;
          this.tut[id] = true;
          fresh++;
        }
        if (fresh) this.add(XP.tutorial * fresh + (g.hud._allDone && !this.tut._all ? XP.tutorialAll : 0), 'tutorial');
        if (g.hud._allDone) this.tut._all = true;
      }
    }

    // ------------------------------------------------------------- the HUD
    _buildDom() {
      const hud = this.game.hud;
      if (!hud || !hud.root) return;
      const b = el('div', 'vh-rep');
      this.discEl = el('div', 'rep-disc');
      this.lvlEl = el('b', '', '1');
      this.discEl.append(this.lvlEl);
      const body = el('div', 'rep-body');
      const top = el('div', 'rep-top');
      top.append(el('span', 'rep-name', 'Street Rep'));
      this.numEl = el('span', 'rep-num', '');
      top.append(this.numEl);
      const track = el('div', 'rep-track');
      this.fillEl = el('i', 'rep-fill');
      track.append(this.fillEl);
      body.append(top, track);
      this.floatEl = el('div', 'rep-float');
      b.append(this.discEl, body, this.floatEl);
      this.badge = b;
      // Beside the money (its box is position: relative): the badge sits to its left.
      if (hud.moneyEl) hud.moneyEl.append(b);
      else hud.root.append(b);

      const ban = el('div', 'vh-hb');
      this.bKicker = el('div', 'hb-kicker');
      const t = el('div', 'hb-title');
      this.bTitle = el('span', 'hb-word');
      this.bBig = el('b', 'hb-big');
      t.append(this.bTitle, this.bBig);
      this.bSub = el('div', 'hb-sub');
      this.bLines = el('ul', 'hb-lines');
      ban.append(this.bKicker, t, this.bSub, this.bLines);
      this.bannerEl = ban;
      hud.root.append(ban);
    }

    _render(levelled) {
      if (!this.badge) return;
      const max = this.level >= MAX_LEVEL;
      const frac = max ? 1 : Math.min(1, this.xp / this.next);
      const fmt = (n) => n.toLocaleString('en-GB');
      const apply = () => {
        this.lvlEl.textContent = String(this.level);
        this.numEl.textContent = max ? 'MAX' : fmt(this.xp) + '/' + fmt(this.next);
        this.badge.classList.toggle('max', max);
      };
      clearTimeout(this._snapTimer);
      if (levelled) {
        // Fill up, flash, then start the new level's bar from where it is.
        this.fillEl.classList.remove('snap');
        this.fillEl.style.width = '100%';
        this.badge.classList.remove('up');
        void this.badge.offsetWidth;
        this.badge.classList.add('up');
        this._snapTimer = setTimeout(() => {
          apply();
          this.fillEl.classList.add('snap');
          this.fillEl.style.width = (frac * 100).toFixed(1) + '%';
          void this.fillEl.offsetWidth;
          this.fillEl.classList.remove('snap');
        }, 650);
      } else {
        apply();
        this.fillEl.style.width = (frac * 100).toFixed(1) + '%';
      }
    }

    /** "+40 REP" by the bar; quick ones in a row add up into one. */
    _float(xp) {
      if (!this.floatEl) return;
      const now = performance.now();
      this._floatSum = now - (this._floatAt || 0) < 1400 ? (this._floatSum || 0) + xp : xp;
      this._floatAt = now;
      this.floatEl.textContent = '+' + this._floatSum + ' REP';
      this.floatEl.classList.remove('show');
      void this.floatEl.offsetWidth;
      this.floatEl.classList.add('show');
      this.badge.classList.remove('gain');
      void this.badge.offsetWidth;
      this.badge.classList.add('gain');
    }

    // ----------------------------------------------------------- banners
    /** Queue a centre banner (level-ups here, the Daily Hustles in dailies.js). */
    banner(b) {
      if (!b) return;
      if (this._banners.length > 6) this._banners.shift();
      this._banners.push(Object.assign({ lines: [] }, b));
    }

    /** Show the next banner once the screen is free: no cutscene, no centre banner, no job result card. */
    _showBanners() {
      if (!this._banners.length || !this.bannerEl) return;
      const now = performance.now();
      if (now < this._bannerUntil) return;
      const g = this.game;
      const body = document.body.classList;
      if (g.state !== 'playing' || body.contains('cutscene') || body.contains('in-menu')) return;
      // Wait for a centre banner (STUNT JUMP, SOLD, MASTERED...) given in the same breath.
      if (g.hud && now < (g.hud.cbannerUntil || 0)) return;
      const mr = g.hud && g.hud.mResult;
      if (mr && mr.classList.contains('show') && !(this._mrWait > 0 && now - this._mrWait > 9000)) {
        if (!this._mrWait) this._mrWait = now;
        return;
      }
      this._mrWait = 0;
      const b = this._banners.shift();
      const e = this.bannerEl;
      this.bKicker.textContent = b.kicker || '';
      this.bTitle.textContent = b.title || '';
      this.bBig.textContent = b.big || '';
      this.bSub.textContent = b.sub || '';
      this.bLines.replaceChildren(...(b.lines || []).map((t) => el('li', '', t)));
      e.className = 'vh-hb ' + (b.tone || 'level') + (b.big ? ' has-big' : '');
      void e.offsetWidth;
      e.classList.add('show');
      const hold = b.hold || (b.tone === 'daily' ? 3200 : 4000) + (b.lines && b.lines.length ? 600 : 0);
      this._bannerUntil = now + hold + 400;
      clearTimeout(this._bannerTimer);
      this._bannerTimer = setTimeout(() => e.classList.remove('show'), hold);
      const au = g.audio;
      if (b.sound === 'level') {
        if (au.missionPassed) au.missionPassed();
        else if (au.success) au.success('gold');
      } else if (b.sound === 'daily') {
        if (au.success) au.success('silver');
        else if (au.cash) au.cash();
      } else if (b.sound === 'streak') {
        if (au.missionPassed) au.missionPassed();
      }
    }

    _clearBanners() {
      this._banners.length = 0;
      this._bannerUntil = 0;
      this._mrWait = 0;
      clearTimeout(this._bannerTimer);
      if (this.bannerEl) this.bannerEl.classList.remove('show');
    }

    // ---------------------------------------------------------- contract
    stats() {
      const rows = [['Street Rep', 'Level ' + this.level + (this.level < MAX_LEVEL ? ' · ' + this.xp.toLocaleString('en-GB') + ' / ' + this.next.toLocaleString('en-GB') + ' XP' : ' (max)')]];
      rows.push(['Rep earned', this.total.toLocaleString('en-GB') + ' XP']);
      const n = PERK_LIST.filter((p) => p.level <= this.level).length;
      rows.push(['Rep perks', n + ' / ' + PERK_LIST.length]);
      return rows;
    }

    serialize() {
      return { level: this.level, xp: this.xp, total: this.total, seen: Object.keys(this.seen), tut: Object.keys(this.tut), car: this.firstCar };
    }

    load(d) {
      this.reset();
      if (!d) {
        this._backdate();
        return;
      }
      this.level = Math.max(1, Math.min(MAX_LEVEL, Math.floor(d.level) || 1));
      this.xp = this.level >= MAX_LEVEL ? 0 : Math.max(0, Math.min(this.next - 1, Math.floor(d.xp) || 0));
      this.total = Math.max(0, Math.floor(d.total) || 0);
      for (const id of d.seen || []) this.seen[id] = true;
      for (const id of d.tut || []) this.tut[id] = true;
      this.firstCar = !!d.car;
      this._applyVitals(false);
      this._render(false);
    }

    /**
     * A save from before Street Rep: the work already done counts. Levels
     * come back quietly (no bonus cash), with one note to say so.
     */
    _backdate() {
      const g = this.game;
      const ms = g.missions;
      let xp = 0;
      if (ms && ms.completed && ms.all) {
        for (const id of Object.keys(ms.completed)) {
          const m = ms.all.get(id);
          if (!m) continue;
          const mins = m.estMinutes || (m._main ? 8 : 6);
          xp += m._main ? 80 + 15 * mins : m.giver === 'race' ? 120 : 50 + 12 * mins;
        }
      }
      const a = g.activities;
      if (a) {
        xp += Object.keys(a.jumpsDone || {}).length * XP.stunt;
        xp += Object.keys(a.lanternsFound || {}).length * XP.lantern;
        xp += ((a.taxi && a.taxi.done) || 0) * 35;
      }
      const pr = g.properties;
      if (pr && pr.list) for (const p of pr.list) if (pr.owned && pr.owned[p.id]) xp += 200 + Math.round(p.price / 500);
      if (xp <= 0) return;
      this.total = xp;
      this.xp = xp;
      while (this.level < MAX_LEVEL && this.xp >= needFor(this.level)) {
        this.xp -= needFor(this.level);
        this.level++;
      }
      if (this.level >= MAX_LEVEL) this.xp = 0;
      this._applyVitals(false);
      this._render(false);
      if (this.level > 1) {
        const lvl = this.level;
        setTimeout(() => {
          if (g.hud && g.state !== 'title') g.hud.notify({ title: 'Street Rep: level ' + lvl, text: 'Everything you\'ve done so far counts. Earn Rep from jobs, races, fares and the new Daily Hustles to unlock perks.', icon: '★', duration: 8000 });
        }, 4000);
      }
    }

    reset() {
      this.level = 1;
      this.xp = 0;
      this.total = 0;
      this.seen = {};
      this.tut = {};
      this.firstCar = false;
      this._buckets = {};
      this._maxHeat = 0;
      this._metres = 0;
      this._t = 0;
      this._applyVitals(false);
      this._clearBanners();
      this._render(false);
    }

    stop() {
      this._clearBanners();
    }
  }

  Rep.need = needFor;
  Rep.MAX_LEVEL = MAX_LEVEL;
  VH.Rep = Rep;
})();
