/*
 * dailies.js — the Daily Hustles: three small tasks every in-game day, with
 * a streak bonus for doing all three.
 *
 * A world system (main.js WORLD_SYSTEMS). A new day's three come at 06:00
 * on the game clock (a game day is 24 minutes of play), or every 24 minutes
 * of play while the clock is stopped (Settings: Always daytime, or Time of
 * day: Stopped). They're drawn from the templates below, only ones that can
 * be done at this point in the story, one from each group, sized to Jay's
 * Street Rep level. Each pays cash and Rep when it's done (some also mark a
 * hidden cash stash on the map); all three in a day pays a streak bonus of
 * $1,000 a day in a row, up to $7,000. A day missed resets the streak.
 *
 *   game.dailies.list()      [{ id, label, progress, goal, done, reward: { money, xp },
 *                               icon, hint, reveal }]
 *   game.dailies.streak      days in a row with all three done
 *   game.dailies.timeLeft()  seconds of play until the next three
 *   game.dailies.day         which day this is (1 on a new game)
 *
 *   daily:progress { task }  daily:done { task }  daily:all { streak }
 *   (task is a list() row)
 *
 * Progress comes from the game's events (the Hustle update's own, like
 * chop:sold and oddjob:done, and older ones like mission:pass); a couple of
 * tasks (miles driven, districts visited) are counted here.
 */
(function () {
  'use strict';

  const VH = window.VH;
  const { clamp } = VH.math;
  const money = (n) => VH.util.formatMoney(n);

  const DAY = 24 * 60; //     seconds of play in a game day (one game hour a minute)
  const ROLL_HOUR = 6; //     a new day's hustles at 06:00
  const MIN_GAP = 6 * 60; //  a clock that jumps (a job that sets the time) can't roll two days in a few minutes
  const BASE = [0, 750, 1100, 1500]; // reward by difficulty (1-3) at Rep level 1
  const MAX_REWARD = 2500;
  const STREAK_CAP = 7;
  const NOT_EARNED = { daily: true, rep: true, debug: true }; // "earn $N" doesn't count the rewards themselves

  const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many || one + 's');
  const aOr = (n, one, many) => (n === 1 ? 'a ' + one : plural(n, one, many));

  /** A goal between lo (Rep level 1) and hi (level 30 and up), in steps. */
  function span(level, lo, hi, step) {
    const k = clamp((level - 1) / 29, 0, 1);
    return Math.max(lo, Math.round((lo + (hi - lo) * k) / step) * step);
  }

  // ------------------------------------------------- what can be done now
  function safe(fn, fallback) {
    try {
      return fn();
    } catch (err) {
      return fallback;
    }
  }

  function hasGun(g) {
    const inv = g.combat && g.combat.inventory;
    if (!inv) return false;
    for (const id of Object.keys(inv)) {
      const w = VH.Data && VH.Data.weaponsById ? VH.Data.weaponsById[id] : null;
      if (w && (w.kind === 'hitscan' || w.kind === 'pellets' || w.kind === 'projectile') && !w.stun) return true;
    }
    return false;
  }

  const chopOpen = (g) => !!(g.chopShops && g.chopShops.shops && safe(() => g.chopShops.shops().length, 0));
  const storesOpen = (g) => !!(g.stores && g.stores.ok);
  const encountersOn = (g) => !!(g.encounters && g.encounters.current);
  const taxiOpen = (g) => {
    const a = g.activities;
    if (!a) return false;
    const need = a.data && a.data.taxiRequires;
    return !need || !!g.missions.completed[need];
  };
  const stashesLeft = (g) => {
    const s = g.stashes;
    return s && s.total ? Math.max(0, s.total - (s.found || 0)) : 0;
  };
  const lanternsLeft = (g) => {
    const a = g.activities;
    return a && a.lanterns ? a.lanterns.length - Object.keys(a.lanternsFound || {}).length : 0;
  };
  const jobsOpen = (g, test) => safe(() => g.missions.available().some(test), false);
  function oddJob(g, id) {
    const o = g.oddJobs;
    if (!o || !o.jobs) return null;
    const j = safe(() => o.jobs().find((x) => x.id === id), null);
    return j && !j.locked && j.available !== false ? j : null;
  }
  function canUpgrade(g) {
    const pr = g.properties;
    if (!pr || !pr.upgradeCost || !pr.list || !pr.owned) return false;
    return pr.list.some((p) => pr.owned[p.id] && safe(() => pr.upgradeCost(p) > 0, false));
  }
  const mine = (g, v) => v && v === g.player.vehicle;

  // ------------------------------------------------------------ templates
  // id; group (one task per group a day; tag: one 'cash' total a day);
  // icon; diff (1-3: the size of the reward); w (how often it comes up);
  // make(level) → { goal, arg }; label(goal, arg); hint (for the phone);
  // need(game) → can it be done now; on: { event: (e, task, D) → progress };
  // poll(dt, task, D) → progress (counted here, every frame).
  // unit: the goal is kept in metres and shown in km; cash: a dollar goal.
  const ODD = [['paramedic', 'Complete', 'paramedic call', 'paramedic calls', '🚑', 'Get in an ambulance and go on duty'],
    ['vigilante', 'Complete', 'vigilante call', 'vigilante calls', '🚓', 'Get in a police car and go on duty'],
    ['courier', 'Make', 'courier delivery', 'courier deliveries', '📦', 'Get in a delivery van and go on duty']];

  const TEMPLATES = [
    // --- chop shops
    { id: 'chop_sell', group: 'chop', icon: '🔧', diff: 2, w: 1.6,
      make: (L) => ({ goal: span(L, 1, 3, 1) }), label: (n) => 'Sell ' + aOr(n, 'car') + ' at a chop shop',
      hint: 'Any car will do: drive it into a chop shop.', need: chopOpen, on: { 'chop:sold': () => 1 } },
    { id: 'chop_hot', group: 'chop', icon: '🌶', diff: 2, w: 1,
      label: () => 'Sell a car from the chop shop hot list', hint: 'The hot list is on the phone. Hot cars pay extra.',
      need: chopOpen, on: { 'chop:sold': (e) => (e.hot ? 1 : 0) } },
    { id: 'chop_cash', group: 'chop', tag: 'cash', icon: '💵', diff: 3, cash: true,
      make: (L) => ({ goal: span(L, 2000, 8000, 500) }), label: (n) => 'Make ' + money(n) + ' at chop shops',
      hint: 'Faster cars and hot-list cars pay more. Keep them in one piece.', need: chopOpen, on: { 'chop:sold': (e) => e.value || 0 } },
    // --- taxi and odd jobs
    { id: 'taxi', group: 'taxi', icon: '🚕', diff: 2, w: 1.3,
      make: (L) => ({ goal: span(L, 2, 5, 1) }), label: (n) => 'Finish ' + plural(n, 'taxi fare'),
      hint: 'Get in a cab and press P to go on duty.', need: taxiOpen, on: { 'taxi:fare': () => 1 } },
    ...ODD.map(([id, verb, one, many, icon, hint]) => ({
      id, group: id, icon, diff: 2, w: 1.3,
      make: (L) => ({ goal: span(L, 2, 6, 1) }), label: (n) => verb + ' ' + plural(n, one, many),
      hint: (g) => (oddJob(g, id) || {}).how || hint,
      need: (g) => !!oddJob(g, id), on: { 'oddjob:done': (e) => (e.job === id ? 1 : 0) },
    })),
    { id: 'oddjob_cash', group: 'oddjob', tag: 'cash', icon: '💼', diff: 3, cash: true,
      make: (L) => ({ goal: span(L, 3000, 9000, 500) }), label: (n) => 'Earn ' + money(n) + ' from odd jobs',
      hint: 'Paramedic, vigilante or courier: the pay goes up with each level.',
      need: (g) => !!(oddJob(g, 'paramedic') || oddJob(g, 'vigilante') || oddJob(g, 'courier')), on: { 'oddjob:done': (e) => e.pay || 0 } },
    // --- finding things
    { id: 'stash', group: 'stash', icon: '💰', diff: 2, w: 1.3,
      make: (L) => ({ goal: span(L, 1, 2, 1) }), label: (n) => (n === 1 ? 'Find a cash stash' : 'Find ' + n + ' cash stashes'),
      hint: 'The phone says when you\'re getting warm.', need: (g) => stashesLeft(g) > 0, on: { 'stash:found': () => 1 } },
    { id: 'lantern', group: 'lantern', icon: '🏮', diff: 2,
      label: () => 'Find a lost lantern', hint: 'Red paper lanterns, hidden all over Vicehaven.',
      need: (g) => lanternsLeft(g) > 0, on: { 'lantern:found': () => 1 } },
    { id: 'pickups', group: 'pickups', icon: '📦', diff: 1, w: 0.7,
      make: (L) => ({ goal: span(L, 3, 6, 1) }), label: (n) => 'Collect ' + plural(n, 'pickup'),
      hint: 'Weapons, ammo, armour, first-aid kits and cash lying about.', on: { 'pickup:collected': () => 1 } },
    { id: 'districts', group: 'explore', icon: '🗺', diff: 1, w: 0.8,
      make: (L) => ({ goal: span(L, 3, 5, 1) }), label: (n) => 'Visit ' + n + ' different districts',
      hint: 'Old Market, Palm Crescent, Harbor Point, downtown, the docks, Crestline, Northgate...', tick: (task, D) => {
        const g = D.game;
        const d = g.world && g.world.districtAt ? g.world.districtAt(g.player.pos.x, g.player.pos.z) : null;
        const seen = task.data.seen || (task.data.seen = []);
        if (!d || !d.id || seen.includes(d.id)) return 0;
        seen.push(d.id);
        return 1;
      } },
    // --- crime and the police
    { id: 'holdup', group: 'holdup', icon: '🏪', diff: 2,
      label: () => 'Hold up a shop', hint: 'Walk into a corner shop with a gun out and aim at the clerk.',
      need: (g) => storesOpen(g) && hasGun(g), on: { 'holdup:bag': () => 1 } },
    { id: 'holdup_safe', group: 'holdup', icon: '🔐', diff: 3,
      label: () => 'Get the safe opened in a hold-up', hint: 'Keep the clerk covered and tell him to open the safe.',
      need: (g) => storesOpen(g) && hasGun(g), on: { 'holdup:safe': () => 1 } },
    { id: 'evade', group: 'police', icon: '🚨', diff: 2,
      make: (L) => ({ goal: 1, arg: span(L, 1, 3, 1) }), label: (n, s) => 'Lose a ' + s + '-star wanted level',
      hint: 'Get the police after you, then shake them off (a respray works too).',
      on: { 'police:evaded': (e, task, D) => (D._maxHeat >= (task.arg || 1) ? 1 : 0) } },
    { id: 'headshots', group: 'combat', icon: '🎯', diff: 2, w: 0.7,
      make: (L) => ({ goal: span(L, 5, 15, 1) }), label: (n) => 'Land ' + plural(n, 'headshot'),
      hint: 'Story jobs, bounties and turf wars have plenty of targets.', need: hasGun, on: { 'combat:hit': (e) => (e.head ? 1 : 0) } },
    // --- driving
    { id: 'race', group: 'race', icon: '🏁', diff: 2,
      label: () => 'Win a street race', hint: 'Chequered flags on the map.',
      need: (g) => jobsOpen(g, (m) => m.giver === 'race'), on: { 'mission:pass': (e) => (e.m && e.m.giver === 'race' ? 1 : 0) } },
    { id: 'stunt', group: 'stunt', icon: '🛹', diff: 1,
      make: (L) => ({ goal: span(L, 1, 2, 1) }), label: (n) => (n === 1 ? 'Clear a stunt jump' : 'Clear ' + n + ' stunt jumps'),
      hint: 'Ramps at the docks, the fields and the building sites. Hit them fast.',
      need: (g) => !!(g.activities && g.activities.ramps && g.activities.ramps.length), on: { 'stunt:jump': () => 1 } },
    { id: 'drive', group: 'drive', icon: '🛣', diff: 1, unit: 1000,
      make: (L) => ({ goal: span(L, 5, 15, 1) * 1000 }), label: (n) => 'Drive ' + n / 1000 + ' km',
      hint: 'Any car or bike counts.', poll: (dt, task, D) => {
        const p = D.game.player;
        const v = p.inVehicle ? p.vehicle : null;
        return v && (v.kind === 'car' || v.kind === 'bike') && !v.wrecked ? Math.abs(v.speed) * dt : 0;
      } },
    { id: 'near_miss', group: 'traffic', icon: '😬', diff: 1,
      make: (L) => ({ goal: span(L, 10, 30, 5) }), label: (n) => 'Make ' + n + ' near misses in traffic',
      hint: 'Drive fast and close past other cars without touching them.',
      on: { 'vehicle:nearMiss': (e, task, D) => (mine(D.game, e.v) ? 1 : 0) } },
    { id: 'cars', group: 'cars', icon: '🔑', diff: 1,
      make: (L) => ({ goal: span(L, 3, 6, 1) }), label: (n) => 'Take ' + n + ' different cars',
      hint: 'Parked or not.', on: { 'vehicle:enter': (e) => {
        if (!e.v || e.v._dailyTaken) return 0;
        e.v._dailyTaken = true;
        return 1;
      } } },
    { id: 'respray', group: 'respray', icon: '🎨', diff: 1,
      label: () => 'Respray a car', hint: 'Drive into a spray shop.',
      need: (g) => !!(g.sprayShops && g.sprayShops.ok), on: { 'respray:done': () => 1 } },
    // --- jobs
    { id: 'story', group: 'jobs', icon: '🎬', diff: 2,
      label: () => 'Finish a story job', hint: 'The yellow markers on the map.',
      need: (g) => jobsOpen(g, (m) => m._main), on: { 'mission:pass': (e) => (e.m && e.m._main ? 1 : 0) } },
    { id: 'side_job', group: 'jobs', icon: '📋', diff: 2,
      label: () => 'Finish a side job', hint: 'Dex\'s list, bounties, turf wars and the side stories.',
      need: (g) => jobsOpen(g, (m) => !m._main && m.giver !== 'race'), on: { 'mission:pass': (e) => (e.m && !e.m._main && e.m.giver !== 'race' ? 1 : 0) } },
    { id: 'challenge', group: 'challenge', icon: '🥇', diff: 2, w: 0.7,
      label: () => 'Win a medal in a challenge', hint: 'Challenge markers around the city.',
      need: (g) => !!(g.challenges && g.challenges.defs && g.challenges.defs.length), on: { 'challenge:finish': (e) => (e.medal ? 1 : 0) } },
    { id: 'help', group: 'street', icon: '🤝', diff: 2, w: 1.3,
      make: (L) => ({ goal: span(L, 1, 3, 1) }), label: (n) => (n === 1 ? 'Help someone out in the street' : 'Help ' + n + ' people out in the street'),
      hint: 'Keep an eye out for someone in trouble.', need: encountersOn, on: { 'encounter:done': (e) => (e.good ? 1 : 0) } },
    { id: 'encounters', group: 'street', icon: '❗', diff: 2,
      make: (L) => ({ goal: span(L, 2, 4, 1) }), label: (n) => 'Deal with ' + n + ' street encounters',
      hint: 'The flashing ! on the radar.', need: encountersOn, on: { 'encounter:done': () => 1 } },
    // --- money
    { id: 'earn', group: 'earn', tag: 'cash', icon: '💵', diff: 2, cash: true,
      make: (L) => ({ goal: span(L, 5000, 25000, 1000) }), label: (n) => 'Earn ' + money(n) + ' today',
      hint: 'From anything: jobs, fares, chop shops, paydays...', on: { 'money:changed': (e) => (e.delta > 0 && !NOT_EARNED[e.reason] ? e.delta : 0) } },
    { id: 'rep', group: 'rep', icon: '★', diff: 2,
      make: (L) => ({ goal: span(L, 300, 1500, 50) }), label: (n) => 'Earn ' + n.toLocaleString('en-GB') + ' Street Rep',
      hint: 'Everything you do earns Rep.', on: { 'rep:xp': (e) => (e.reason === 'daily' || e.reason === 'streak' ? 0 : e.amount || 0) } },
    // --- shops and businesses
    { id: 'gunshop', group: 'shop', icon: '🛒', diff: 1,
      label: () => 'Buy something at Bayline Arms', hint: 'Ammo, armour or a new gun.',
      need: (g) => !!(g.gunShops && g.gunShops.list && g.gunShops.list.length), on: { 'gunshop:buy': () => 1 } },
    { id: 'snack', group: 'shop', icon: '🥤', diff: 1, w: 0.6,
      label: () => 'Grab a snack at a corner shop', hint: 'Walk up to the counter.',
      need: storesOpen, on: { 'money:changed': (e) => (e.reason === 'snacks' ? 1 : 0) } },
    { id: 'upgrade', group: 'business', icon: '🏢', diff: 2,
      label: () => 'Upgrade a business', hint: 'At one of your businesses\' signs.',
      need: canUpgrade, on: { 'property:upgraded': () => 1 } },
    { id: 'photo', group: 'photo', icon: '📷', diff: 1, w: 0.4,
      label: () => 'Take a picture in photo mode', hint: 'Pause and pick Photo mode.',
      need: (g) => !!g.photo, on: { 'photo:taken': () => 1 } },
  ];
  const BY_ID = new Map(TEMPLATES.map((t) => [t.id, t]));
  const EVENTS = Array.from(new Set([].concat(...TEMPLATES.map((t) => Object.keys(t.on || {})))));

  // ================================================================ system
  class Dailies {
    constructor(game) {
      this.game = game;
      this.saveKey = 'dailies';
      this.tasks = [];
      this.day = 1;
      this.streak = 0;
      this.best = 0;
      this.doneTotal = 0;
      this.allToday = false;
      this.left = DAY;
      this._lastRoll = 0;
      this._lastH = undefined;
      this._yesterday = [];
      this._maxHeat = 0;
      this._announce = -1;
      this._t = 0;
      this._toastAt = 0;
      this._bind();
    }

    get level() {
      const r = this.game.rep;
      return r && r.level ? r.level : 1;
    }

    // ----------------------------------------------------------- reading
    list() {
      return this.tasks.map((t) => this._view(t));
    }

    timeLeft() {
      return Math.max(0, Math.round(this.left));
    }

    _view(t) {
      const tpl = BY_ID.get(t.id);
      const u = tpl.unit || 1;
      return {
        id: t.id,
        label: tpl.label(t.goal, t.arg),
        progress: u > 1 ? Math.floor((t.p / u) * 10) / 10 : Math.floor(t.p),
        goal: t.goal / u,
        done: t.done,
        reward: { money: t.money, xp: t.xp },
        icon: tpl.icon,
        hint: typeof tpl.hint === 'function' ? safe(() => tpl.hint(this.game), '') : tpl.hint || '',
        reveal: !!t.reveal,
      };
    }

    _progressText(t) {
      const tpl = BY_ID.get(t.id);
      if (tpl.cash) return money(Math.floor(t.p)) + ' / ' + money(t.goal);
      if (tpl.unit) return (t.p / tpl.unit).toFixed(1) + ' / ' + t.goal / tpl.unit + ' km';
      return Math.floor(t.p) + ' / ' + t.goal;
    }

    // ----------------------------------------------------------- picking
    /** Three for a new day: one easy one, then any two, each from a different group. */
    _pick(n, keep) {
      const g = this.game;
      const L = this.level;
      const groups = new Set();
      const tags = new Set();
      for (const t of keep || []) {
        const tpl = BY_ID.get(t.id);
        groups.add(tpl.group);
        if (tpl.tag) tags.add(tpl.tag);
      }
      const prev = new Set(this._yesterday);
      const pool = TEMPLATES.filter((t) => !t.need || safe(() => t.need(g), false));
      const out = [];
      for (let k = 0; k < n; k++) {
        let cand = pool.filter((t) => !groups.has(t.group) && !(t.tag && tags.has(t.tag)));
        // The first of the day is an easy one, so there's always something quick to tick off.
        if (k === 0 && !(keep && keep.length)) {
          const easy = cand.filter((t) => t.diff === 1);
          if (easy.length) cand = easy;
        }
        if (!cand.length) break;
        const ws = cand.map((t) => (t.w || 1) * (prev.has(t.id) ? 0.25 : 1));
        let r = Math.random() * ws.reduce((s, w) => s + w, 0);
        let tpl = cand[cand.length - 1];
        for (let i = 0; i < cand.length; i++) {
          r -= ws[i];
          if (r <= 0) {
            tpl = cand[i];
            break;
          }
        }
        groups.add(tpl.group);
        if (tpl.tag) tags.add(tpl.tag);
        out.push(this._make(tpl, L));
      }
      return out;
    }

    _make(tpl, L) {
      const g = this.game;
      const m = tpl.make ? tpl.make(L) : { goal: 1 };
      if (tpl.id === 'stash') m.goal = Math.max(1, Math.min(m.goal, stashesLeft(g)));
      const cash = Math.min(MAX_REWARD, Math.round((BASE[tpl.diff] * (1 + 0.03 * (L - 1))) / 50) * 50);
      const xp = 60 + 30 * tpl.diff + 5 * (L - 1);
      // Some also mark a hidden cash stash on the map (the bigger ones always do).
      const reveal = tpl.group !== 'stash' && !!(g.stashes && g.stashes.reveal) && stashesLeft(g) > 0 && (tpl.diff >= 3 || Math.random() < 0.3);
      return { id: tpl.id, goal: m.goal, arg: m.arg, p: 0, done: false, money: cash, xp, reveal, data: {}, step: 0 };
    }

    // ---------------------------------------------------------- the day
    _rollover(quiet) {
      const g = this.game;
      const had = this.tasks.length > 0;
      if (had && !this.allToday && this.streak > 0) {
        if (!quiet) g.hud.notify({ title: 'Streak lost', text: 'Yesterday\'s Daily Hustles weren\'t all done. Today\'s three start a new streak.', icon: '📅', tone: 'bad', duration: 6000 });
        this.streak = 0;
      }
      if (had) this.day++;
      this._yesterday = this.tasks.map((t) => t.id);
      this.tasks = this._pick(3);
      this.allToday = false;
      this.left = DAY;
      this._lastRoll = g.playTime || 0;
      this._announce = quiet ? -1 : 1.5;
    }

    /** Tell Jay what today's three are (once he's free to read it). */
    _announceNow() {
      const g = this.game;
      if (!this.tasks.length) return;
      const lines = this.tasks.map((t) => {
        const v = this._view(t);
        return v.icon + '  ' + v.label + '  ·  ' + money(v.reward.money);
      });
      if (g.phone && g.input && g.input.labelFor) lines.push('Phone (' + g.input.labelFor('phone') + ') → Hustles');
      g.hud.notify({ title: 'Daily Hustles · day ' + this.day, text: lines.join('\n'), icon: '📅', tone: 'hustle-new', duration: 9000 });
    }

    // ---------------------------------------------------------- progress
    _live() {
      const s = this.game.state;
      return s === 'playing' || s === 'dialog' || s === 'photo';
    }

    _bind() {
      // Wanted level: the most stars since it went up (the "lose a 3-star level" task).
      VH.events.on('police:level', (e) => {
        if (e && e.level > 0) this._maxHeat = Math.max(this._maxHeat, e.level);
        else if (e && e.reason !== 'evaded' && e.reason !== 'respray') this._maxHeat = 0; // (police:evaded follows those)
      });
      for (const type of EVENTS) VH.events.on(type, (e) => this._event(type, e || {}));
      // After the tasks have seen it (handlers run in the order they were added).
      VH.events.on('police:evaded', () => {
        this._maxHeat = 0;
      });
    }

    _event(type, e) {
      if (!this._live()) return;
      for (const t of this.tasks) {
        if (t.done) continue;
        const tpl = BY_ID.get(t.id);
        const h = tpl.on && tpl.on[type];
        if (!h) continue;
        const n = Number(h(e, t, this)) || 0;
        if (n > 0) this._progress(t, n);
      }
    }

    _progress(t, n) {
      if (t.done) return;
      t.p = Math.min(t.goal, t.p + n);
      VH.events.emit('daily:progress', { task: this._view(t) });
      if (t.p >= t.goal) this._complete(t);
      else this._toast(t);
    }

    /** A small card now and then: every step of a short task, every quarter of a long one. */
    _toast(t) {
      const g = this.game;
      const tpl = BY_ID.get(t.id);
      const long = tpl.cash || tpl.unit || t.goal > 6;
      if (long) {
        const q = Math.floor((t.p / t.goal) * 4);
        if (q <= (t.step || 0)) return;
        t.step = q;
      }
      const now = performance.now();
      if (now - this._toastAt < 2500) return;
      this._toastAt = now;
      g.hud.notify({ title: 'Daily Hustle', text: tpl.label(t.goal, t.arg) + '  ·  ' + this._progressText(t), icon: tpl.icon, tone: 'hustle', duration: 3200 });
    }

    _complete(t) {
      const g = this.game;
      const tpl = BY_ID.get(t.id);
      t.done = true;
      t.p = t.goal;
      this.doneTotal++;
      const label = tpl.label(t.goal, t.arg);
      const lines = [];
      if (t.reveal && g.stashes && g.stashes.reveal) {
        safe(() => g.stashes.reveal(1));
        lines.push('A hidden cash stash is marked on your map');
      }
      const rep = g.rep;
      if (rep && rep.banner) rep.banner({ kicker: 'Daily Hustle done', title: label, sub: '+' + money(t.money) + '  ·  +' + t.xp + ' REP', lines, tone: 'daily', sound: 'daily' });
      else g.hud.centerBanner('Daily Hustle done', label);
      g.giveMoney(t.money, 'daily');
      if (rep && rep.add) rep.add(t.xp, 'daily');
      VH.events.emit('daily:done', { task: this._view(t) });
      if (!this.allToday && this.tasks.length && this.tasks.every((x) => x.done)) this._allDone();
      if (g._autoSaveSoon) g._autoSaveSoon();
    }

    _allDone() {
      const g = this.game;
      this.allToday = true;
      this.streak++;
      this.best = Math.max(this.best, this.streak);
      const k = Math.min(STREAK_CAP, this.streak);
      const cash = 1000 * k;
      const xp = 100 + 40 * k;
      const rep = g.rep;
      const next = this.streak < STREAK_CAP ? 'Do all three tomorrow for ' + money(1000 * (k + 1)) : 'Top streak bonus: keep it going';
      if (rep && rep.banner) rep.banner({ kicker: 'All three Daily Hustles done', title: this.streak === 1 ? 'Day streak' : 'Days in a row', big: String(this.streak), sub: '+' + money(cash) + ' bonus  ·  +' + xp + ' REP', lines: [next], tone: 'streak', sound: 'streak', hold: 4800 });
      else g.hud.centerBanner('All three done', 'Streak ' + this.streak);
      g.giveMoney(cash, 'daily');
      if (rep && rep.add) rep.add(xp, 'streak');
      VH.events.emit('daily:all', { streak: this.streak });
    }

    // ------------------------------------------------------------ update
    update(dt) {
      const g = this.game;
      this._clock(dt);
      // Counted here: miles driven (a bit at a time), districts (once a second).
      for (const t of this.tasks) {
        if (t.done) continue;
        const tpl = BY_ID.get(t.id);
        if (!tpl.poll) continue;
        t._acc = (t._acc || 0) + tpl.poll(dt, t, this);
        if (t._acc >= (tpl.unit || 1) / 10) {
          const n = t._acc;
          t._acc = 0;
          this._progress(t, n);
        }
      }
      this._t -= dt;
      if (this._t <= 0) {
        this._t = 1;
        if (!document.body.classList.contains('cutscene')) {
          for (const t of this.tasks) {
            const tpl = BY_ID.get(t.id);
            if (!t.done && tpl.tick) {
              const n = tpl.tick(t, this);
              if (n > 0) this._progress(t, n);
            }
          }
        }
      }
      if (this._announce >= 0) {
        const busy = document.body.classList.contains('cutscene') || (g.missions && g.missions.run);
        if (!busy) this._announce -= dt;
        if (this._announce < 0) this._announceNow();
      }
    }

    /** The day: 06:00 on the game clock, or 24 minutes of play while it's stopped. */
    _clock(dt) {
      const g = this.game;
      const env = g.environment;
      const running = env && env.clockRunning && !(g.settings && g.settings.get('gameplay.alwaysDay'));
      if (running) {
        const h = env.hours;
        if (this._lastH !== undefined && h !== this._lastH) {
          // Forward by a little (a jump of half a day or more is a time skip or a load: it only re-syncs).
          const moved = (h - this._lastH + 24) % 24;
          const until = (ROLL_HOUR - this._lastH + 24) % 24;
          if (moved < 12 && until > 0 && until <= moved && (g.playTime || 0) - this._lastRoll >= MIN_GAP) this._rollover(false);
        }
        this._lastH = h;
        this.left = (((ROLL_HOUR - h + 24) % 24) || 24) * 60;
      } else {
        this._lastH = undefined;
        this.left -= dt;
        if (this.left <= 0) this._rollover(false);
      }
    }

    // ---------------------------------------------------------- contract
    stats() {
      const s = this.streak;
      return [
        ['Daily Hustles done', String(this.doneTotal)],
        ['Daily Hustle streak', plural(s, 'day') + (this.best > s ? ' (best ' + this.best + ')' : '')],
      ];
    }

    serialize() {
      return {
        day: this.day, streak: this.streak, best: this.best, done: this.doneTotal, all: this.allToday,
        left: Math.round(this.left), last: Math.round(this._lastRoll), prev: this._yesterday,
        tasks: this.tasks.map((t) => ({ id: t.id, goal: t.goal, arg: t.arg, p: Math.round(t.p * 10) / 10, done: t.done, money: t.money, xp: t.xp, reveal: t.reveal, data: t.data, step: t.step })),
      };
    }

    load(d) {
      this.reset();
      if (!d) {
        // A save from before the Daily Hustles: today's three, said soon after the game starts.
        this._announce = 8;
        return;
      }
      this.day = Math.max(1, d.day | 0);
      this.streak = Math.max(0, d.streak | 0);
      this.best = Math.max(this.streak, d.best | 0);
      this.doneTotal = Math.max(0, d.done | 0);
      this.allToday = !!d.all;
      this.left = d.left > 0 ? Math.min(DAY, d.left) : DAY;
      this._lastRoll = Math.min(Number(d.last) || 0, this.game.playTime || 0);
      this._yesterday = Array.isArray(d.prev) ? d.prev.slice(0, 3) : [];
      const tasks = [];
      for (const s of d.tasks || []) {
        const tpl = s && BY_ID.get(s.id);
        if (!tpl || tasks.some((t) => BY_ID.get(t.id).group === tpl.group)) continue;
        const goal = Number(s.goal) > 0 ? Number(s.goal) : 1;
        tasks.push({ id: s.id, goal, arg: s.arg, p: clamp(Number(s.p) || 0, 0, goal), done: !!s.done, money: s.money | 0, xp: s.xp | 0, reveal: !!s.reveal, data: s.data && typeof s.data === 'object' ? s.data : {}, step: s.step | 0 });
        if (tasks.length >= 3) break;
      }
      // A task that has gone from the game since: something else today instead.
      if (tasks.length < 3 && !this.allToday) tasks.push(...this._pick(3 - tasks.length, tasks));
      this.tasks = tasks;
      this._announce = -1;
    }

    reset() {
      this.day = 1;
      this.streak = 0;
      this.best = 0;
      this.doneTotal = 0;
      this.allToday = false;
      this.tasks = [];
      this._yesterday = [];
      this._maxHeat = 0;
      this._lastH = undefined;
      this._lastRoll = 0;
      this._t = 0;
      this._rollover(true);
      this._lastRoll = -MIN_GAP; // (the play clock is about to restart from 0)
      this._announce = 40; // a new game: once the opening has settled
    }

    stop() {
      this._announce = -1;
    }
  }

  Dailies.templates = TEMPLATES;
  VH.Dailies = Dailies;
})();
