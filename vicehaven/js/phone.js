/*
 * phone.js — Jay's phone: the hub of the Hustle update.
 *
 * P (the input action 'phone') takes it out of his pocket anywhere except a
 * cab (P is taxi duty there, activities.js) or a work vehicle (P goes on
 * duty, oddjobs.js). The game holds still while it's up, like the full map:
 * main.js hands each frame to phone.frame() instead of the simulation, the
 * sound pauses, and the HUD stays put behind a dim.
 *
 *   Home       the time (game clock) like a lock screen, today's hustles at
 *              a glance, and the apps
 *   Hustles    today's three Daily Hustles: progress, rewards, the streak
 *              and how long until the next three
 *   Rep        Street Rep: level, XP, the perks Jay has and the ones to come
 *   Jobs       everything worth doing right now, nearest first: odd jobs,
 *              chop shops and the hot list, the street encounter going on,
 *              stashes (warmer or colder), races, side jobs, story jobs,
 *              taxi fares, hold-ups, Bayline Arms, businesses and paydays.
 *              Each says how it works and what it pays, with Set GPS
 *   Bank       cash, net worth, and where the money came from (this
 *              session and all time, from the money:changed reasons)
 *   Messages   the texts Jay has had
 *   Map        the full map
 *
 * Keys: arrows or WASD move, Enter, E or Space choose, Esc or Backspace go
 * back (and put it away from the home screen), P puts it away, M opens the
 * map, Tab or left/right change the tab in an app. A controller: stick or
 * D-pad, A choose, B back, X Set GPS, LB/RB tabs, Menu puts it away. The
 * mouse: point, click and scroll.
 *
 * Every other system is read through its read API, guarded: one that isn't
 * there (or not finished) shows "coming soon" instead of breaking the phone.
 *
 *   game.phone.isOpen            true while it's up
 *   game.phone.open(app)         'home' (default), 'hustles', 'rep', 'jobs', 'bank', 'messages'
 *   game.phone.close(quiet)      quiet: no pointer lock, no sound (pause() and the map use it)
 *   game.phone.handleKey()       main.js, every frame while playing: P takes it out
 *   game.phone.frame(dt)         main.js, every frame while it's up
 *   game.phone.texts             the texts Jay has had (saved): [{ from, name, text, at, clock }]
 */
(function () {
  'use strict';

  const VH = window.VH;
  const { clamp } = VH.math;
  const el = (tag, cls, text) => VH.util.el(tag, cls, text);
  const money = (n) => VH.util.formatMoney(n);
  const num = (n) => Math.round(n).toLocaleString('en-US');
  const range = (lo, hi) => '$' + num(lo) + '–' + num(hi);
  const round10 = (x) => Math.round(x / 10) * 10;

  /** Run a read on another system; anything it throws (half-built, a stub) gives the fallback. */
  function safe(fn, fallback) {
    try {
      const v = fn();
      return v === undefined ? fallback : v;
    } catch (err) {
      return fallback;
    }
  }

  const MAX_TEXTS = 40; //   texts kept (and saved)
  const STICK = 0.55; //     stick past this is a press
  const REPEAT0 = 0.38; //   seconds before a held direction repeats
  const REPEAT = 0.11;

  // ---------------------------------------------------------------- icons
  // App and status icons: small inline SVGs (24 x 24), so they look the same
  // on every machine (emoji fonts vary).
  const SVG = {
    flame: '<path d="M12.3 2.2c.5 3.4 5.2 5.6 5.2 10.6a5.5 5.5 0 0 1-11 0c0-2.7 1.4-4.5 3-5.7.1 2.1 1 3.4 2.4 3.8-.7-3.2-.4-6.1.4-8.7z"/>',
    star: '<path d="M12 2.6l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9z"/>',
    case: '<path fill-rule="evenodd" d="M8.8 6V4.9c0-.9.7-1.6 1.6-1.6h3.2c.9 0 1.6.7 1.6 1.6V6h4.1c1 0 1.8.8 1.8 1.8v3.4H2.9V7.8C2.9 6.8 3.7 6 4.7 6zm1.7 0h3V5h-3zM2.9 12.6h7.6v1.6h3v-1.6h7.6v5.9c0 1-.8 1.8-1.8 1.8H4.7c-1 0-1.8-.8-1.8-1.8z"/>',
    bank: '<path d="M12 2.4l9.2 4.7v1.8H2.8V7.1zM4.9 10.2h2.6v7.1H4.9zm5.8 0h2.6v7.1h-2.6zm5.8 0h2.6v7.1h-2.6zM2.8 18.6h18.4v2.2H2.8z"/>',
    chat: '<path d="M4.6 3.8h14.8c1.1 0 2 .9 2 2v9.5c0 1.1-.9 2-2 2h-8.2l-4.9 3.7v-3.7H4.6c-1.1 0-2-.9-2-2V5.8c0-1.1.9-2 2-2z"/>',
    map: '<path fill-rule="evenodd" d="M2.8 5.6l6-2.2 6.4 2.3 6-2.2v15l-6 2.2-6.4-2.3-6 2.2zm6.9.2v12.1l4.6 1.7V7.5z"/>',
    pin: '<path d="M12 2.5a6.6 6.6 0 0 0-6.6 6.6c0 4.9 6.6 12.4 6.6 12.4s6.6-7.5 6.6-12.4A6.6 6.6 0 0 0 12 2.5zm0 9.1a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/>',
    check: '<path d="M9.4 17.6L4 12.2l1.8-1.8 3.6 3.6 8.8-8.8L20 7z"/>',
    lock: '<path fill-rule="evenodd" d="M7 10V7.6a5 5 0 0 1 10 0V10h1c.8 0 1.4.6 1.4 1.4v8.2c0 .8-.6 1.4-1.4 1.4H6c-.8 0-1.4-.6-1.4-1.4v-8.2c0-.8.6-1.4 1.4-1.4zm2.2 0h5.6V7.6a2.8 2.8 0 0 0-5.6 0z"/>',
    back: '<path d="M15.4 4.2l1.8 1.8L11.2 12l6 6-1.8 1.8L7.6 12z"/>',
    sun: '<circle cx="12" cy="12" r="4.4"/><path d="M11 1.8h2v3.4h-2zm0 17h2v3.4h-2zM1.8 11h3.4v2H1.8zm17 0h3.4v2h-3.4zM4.1 5.5l1.4-1.4 2.4 2.4-1.4 1.4zm12 12l1.4-1.4 2.4 2.4-1.4 1.4zM16.1 6.5l2.4-2.4 1.4 1.4-2.4 2.4zm-12 12l2.4-2.4 1.4 1.4-2.4 2.4z"/>',
    moon: '<path d="M14.6 2.6a9.6 9.6 0 1 0 6.8 14.2A8 8 0 0 1 14.6 2.6z"/>',
    cloud: '<path d="M7.2 19a4.7 4.7 0 0 1-.6-9.4 6 6 0 0 1 11.4 1.6A3.9 3.9 0 0 1 17.4 19z"/>',
    rain: '<path d="M7.2 14.6a4.4 4.4 0 0 1-.6-8.8 5.7 5.7 0 0 1 10.9 1.5 3.7 3.7 0 0 1-.2 7.3zM8 16.4l1.6.6-1.4 4-1.6-.6zm4.4 0l1.6.6-1.4 4-1.6-.6zm4.4 0l1.6.6-1.4 4-1.6-.6z"/>',
    bolt: '<path d="M7.2 13.8a4.4 4.4 0 0 1-.6-8.8 5.7 5.7 0 0 1 10.9 1.5 3.7 3.7 0 0 1-.2 7.3h-3.7l1.2-3.2H11l-2 5.5h2.5L10 21.4l5.8-7.6z"/>',
  };

  function svg(name, cls) {
    const s = el('span', 'ph-svg' + (cls ? ' ' + cls : ''));
    s.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + (SVG[name] || '') + '</svg>';
    return s;
  }

  // Map glyphs as little pictures (the phone and the map show the same icons).
  const iconCache = new Map();
  function glyphURL(name) {
    if (iconCache.has(name)) return iconCache.get(name);
    let url = '';
    try {
      const spr = VH.MapKit && VH.MapKit.buildSprites ? VH.MapKit.buildSprites(2)[name] : null;
      if (spr) url = spr.canvas.toDataURL();
    } catch (err) {
      url = '';
    }
    iconCache.set(name, url);
    return url;
  }

  // ----------------------------------------------------------------- apps
  const APPS = {
    hustles: { name: 'Hustles', title: 'Daily Hustles', icon: 'flame' },
    rep: { name: 'Rep', title: 'Street Rep', icon: 'star' },
    jobs: { name: 'Jobs', title: 'Things to do', icon: 'case' },
    bank: { name: 'Bank', title: 'Bank', icon: 'bank' },
    messages: { name: 'Messages', title: 'Messages', icon: 'chat' },
    map: { name: 'Map', title: 'Map', icon: 'map' },
  };
  const GRID = ['hustles', 'rep', 'jobs', 'bank'];
  const DOCK = ['messages', 'map'];

  // The Jobs app's tabs: each thing to do belongs to one.
  const FILTERS = [
    ['all', 'All'],
    ['cash', 'Cash'],
    ['jobs', 'Jobs'],
    ['story', 'Story'],
    ['buy', 'Buy'],
  ];

  // Street encounters (encounters.js): how each one works and roughly what it pays.
  const STREET = {
    cashvan: ['Ram the armoured van until its back doors give, then grab the cash bags. Brings two stars.', [1500, 3000]],
    mugging: ['Catch the mugger and get the bag back (or keep it).', [300, 800]],
    lift: ['A stranded driver needs a lift: get them there before the time runs out.', [300, 900]],
    race: ['Pull up beside the racer to take the challenge, then beat them to the finish.', [500, 1500]],
    wallet: ['Somebody dropped a wallet. Give it back, or keep the cash.', [200, 550]],
    carthief: ['Stop the thief before he gets away in somebody\'s car.', [200, 900]],
    tourist: ['A tourist wants a holiday photo. Walk up and press E.', [200, 350]],
  };

  // Daily Hustles (dailies.js ids) → the thing to do that gets them done: a kind
  // of row in Jobs, one row's id, or the start of some rows' ids ('up:').
  const HUSTLE_AT = {
    chop_sell: 'chop', chop_hot: 'chop', chop_cash: 'chop', taxi: 'taxi', oddjob_cash: 'oddjob',
    paramedic: 'odd:paramedic', vigilante: 'odd:vigilante', courier: 'odd:courier',
    stash: 'stash', lantern: 'lantern', holdup: 'holdup', holdup_safe: 'holdup', race: 'race', stunt: 'stunt',
    story: 'story', side_job: 'side', help: 'street', encounters: 'street', gunshop: 'gunshop', upgrade: 'up:',
  };

  // Where money comes from (the Bank), by money:changed reason.
  const SOURCES = [
    ['story', 'Story jobs', '#ff7a59'],
    ['side', 'Side jobs', '#35e0d0'],
    ['races', 'Races', '#c77dff'],
    ['chop', 'Chop shops', '#ff9a3c'],
    ['oddjob', 'Odd jobs', '#56b4ff'],
    ['street', 'Street', '#ff4f8b'],
    ['holdup', 'Hold-ups', '#ffd447'],
    ['stash', 'Cash stashes', '#f0b429'],
    ['business', 'Business', '#7dffa8'],
    ['taxi', 'Taxi fares', '#ffe14d'],
    ['hustles', 'Daily Hustles', '#ff6fa8'],
    ['rep', 'Rep level-ups', '#b98bff'],
    ['extras', 'Stunts and lanterns', '#8fd3fe'],
    ['other', 'Everything else', '#9ea9c7'],
  ];
  const REASONS = {
    'hold-up': 'holdup', wallet: 'holdup', chop: 'chop', oddjob: 'oddjob', street: 'street', encounter: 'street',
    stash: 'stash', payday: 'business', business: 'business', property: 'business', properties: 'business',
    fare: 'taxi', taxi: 'taxi', daily: 'hustles', dailies: 'hustles', rep: 'rep', stunt: 'extras', lantern: 'extras',
  };

  function compass(dx, dz) {
    // North is -z on the map, east is +x.
    const a = Math.atan2(dx, -dz);
    return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8];
  }

  function distText(d) {
    if (VH.Minimap && VH.Minimap.formatDistance) return VH.Minimap.formatDistance(d);
    return d < 1000 ? Math.max(10, Math.round(d / 10) * 10) + ' m' : (d / 1000).toFixed(1) + ' km';
  }

  function clockOf(seconds) {
    const s = Math.max(0, Math.round(seconds));
    const m = Math.floor(s / 60);
    return m + ':' + String(s % 60).padStart(2, '0');
  }

  // ================================================================ system
  class Phone {
    constructor(game) {
      this.game = game;
      this.saveKey = 'phone';
      this.isOpen = false;
      this.view = 'home'; //    'home', an app id, or 'thread'
      this.texts = [];
      this.readTexts = 0; //   texts seen in Messages
      this._thread = null; //  the sender a thread shows
      this._filter = 'all';
      this._bankAll = false; // the Bank shows all time (or this session)
      this._sel = null; //     the highlighted element
      this._selKey = null; //  ...and what it was, to find it again after a rebuild
      this._padPrev = new Set();
      this._hold = { dir: null, t: 0 };
      this._lastJob = null; //  the job running (or last run), for money from 'job'
      this._stashD = null; //   the nearest stash last time Jobs was opened (warmer or colder)
      this._resetBank(true);
      this._build();
      this._bind();
    }

    // --------------------------------------------------------- the device
    _build() {
      const layer = el('div', 'vh-phone-layer');
      layer.setAttribute('aria-hidden', 'true');
      const dim = el('div', 'vh-phone-dim');
      dim.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this.close();
      });
      const phone = el('div', 'vh-phone');
      phone.addEventListener('contextmenu', (e) => e.preventDefault());
      const frame = el('div', 'ph-frame');
      for (const b of ['ph-btn ph-btn-a', 'ph-btn ph-btn-b', 'ph-btn ph-btn-c']) frame.append(el('i', b));
      const screen = el('div', 'ph-screen');
      this.wallEl = el('div', 'ph-wall');
      this.wallEl.append(el('i', 'ph-wall-sun'), el('i', 'ph-wall-city'));

      // Status bar: the time, the island, signal and battery.
      const bar = el('div', 'ph-status');
      this.timeEl = el('span', 'ph-status-time', '12:00');
      const icons = el('span', 'ph-status-icons');
      const sig = el('span', 'ph-signal');
      for (let i = 0; i < 4; i++) sig.append(el('i'));
      this.sigEl = sig;
      const bat = el('span', 'ph-battery');
      this.batFill = el('i');
      bat.append(this.batFill);
      this.batText = el('span', 'ph-battery-num', '100');
      icons.append(sig, el('span', 'ph-net', '5G'), this.batText, bat);
      bar.append(this.timeEl, el('span', 'ph-island'), icons);

      this.homeEl = el('section', 'ph-view ph-home');
      this.appEl = el('section', 'ph-view ph-app');
      const views = el('div', 'ph-views');
      views.append(this.homeEl, this.appEl);
      this.viewsEl = views;
      this.toastEl = el('div', 'ph-toast');
      screen.append(this.wallEl, views, bar, this.toastEl, el('i', 'ph-homebar'));
      frame.append(screen);
      phone.append(frame);

      // The keys, beside the phone.
      this.hintsEl = el('div', 'vh-phone-hints');

      layer.append(dim, phone, this.hintsEl);
      document.body.append(layer);
      this.layer = layer;
      this.phoneEl = phone;
      this.screenEl = screen;

      // The mouse: point to highlight, click to choose.
      // (Hovering only lights a row up: rows open on a click, so nothing jumps about under the pointer.)
      screen.addEventListener('mousemove', () => this._mouse(true));
      screen.addEventListener('mousedown', (e) => {
        if (e.button !== 0) e.preventDefault();
      });
      screen.addEventListener('click', (e) => this._onClick(e));
      this._onKeyBound = (e) => this._onKey(e);
      window.addEventListener('keydown', this._onKeyBound, true);
    }

    _bind() {
      VH.events.on('money:changed', (e) => this._onMoney(e));
      VH.events.on('mission:start', (e) => {
        if (e && e.m) this._lastJob = e.m;
      });
      // Texts: the dialogue system shows them; the phone keeps them for Messages.
      const d = this.game.dialogue;
      if (d && typeof d.text === 'function' && !d._phoneHooked) {
        const show = d.text.bind(d);
        d.text = (from, message) => {
          this._logText(from, message);
          return show(from, message);
        };
        d._phoneHooked = true;
      }
    }

    // ------------------------------------------------------ open and close
    /** P outside a cab or a work vehicle (main.js asks every frame while playing). */
    handleKey() {
      const g = this.game;
      const v = g.player && g.player.vehicle;
      if (v && v.type === 'cab') return; // taxi duty (activities.js)
      if (v && g.oddJobs && g.oddJobs.dutyFor && safe(() => g.oddJobs.dutyFor(v), null)) return; // duty (oddjobs.js)
      if (!g.input.consume('phone')) return;
      if (!this.open()) g.input.discard('phone');
    }

    _canOpen() {
      const g = this.game;
      if (g.state !== 'playing') return false;
      const b = document.body.classList;
      if (b.contains('cutscene') || b.contains('shop-open') || b.contains('photo-mode')) return false;
      const p = g.player;
      if (!p || p.frozen || g.frozenControls || p.state === 'dead' || g._arresting) return false;
      if (g.minimap && g.minimap.isFullOpen) return false;
      if (g.dialogue && g.dialogue._choice) return false;
      if (g.combat && g.combat.wheelOpen) return false;
      if (g.ui && g.ui.dialogOpen) return false;
      return true;
    }

    open(app) {
      const g = this.game;
      if (this.isOpen || !this._canOpen()) return false;
      this.isOpen = true;
      const inp = g.input;
      inp.exitLock();
      inp.releaseAll();
      inp.clearPresses();
      inp.takeMouseDelta();
      inp.enabled = false; // the phone reads its own keys; nothing reaches Jay
      this._padPrev = new Set(inp.pad && inp.pad.down ? inp.pad.down : []);
      this._hold.dir = null;
      if (g.audio && g.audio.click) g.audio.click();
      if (g.audio) g.audio.setPaused(true);
      this._pollMoney();
      document.body.classList.add('phone-open');
      this._status();
      this._renderHome();
      this.view = 'home';
      this.viewsEl.classList.remove('in-app');
      this.homeEl.classList.add('is-on');
      this.appEl.classList.remove('is-on');
      if (app && app !== 'home' && APPS[app]) this._go(app, true);
      else this._select(this.homeEl.querySelector('[data-nav]'), true);
      this._mouse(false);
      this._hints();
      this.layer.classList.add('is-open');
      this.layer.setAttribute('aria-hidden', 'false');
      return true;
    }

    close(quiet) {
      if (!this.isOpen) return;
      const g = this.game;
      this.isOpen = false;
      this.layer.classList.remove('is-open');
      this.layer.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('phone-open');
      clearTimeout(this._toastTimer);
      this.toastEl.classList.remove('is-on');
      // Keys pressed on the phone mean nothing to the game: no jump, no shot, no phone again.
      const inp = g.input;
      inp.clearPresses();
      inp.releaseAll();
      inp.takeMouseDelta();
      inp.takeWheel();
      inp.enabled = g.state === 'playing' || g.state === 'dialog';
      g._acc = 0;
      if (quiet) return;
      if (g.state === 'playing' || g.state === 'dialog') {
        if (g.audio) {
          g.audio.setPaused(false);
          if (g.audio.click) g.audio.click();
        }
        if (!inp.locked && !(g.dialogue && g.dialogue._choice)) inp.requestLock();
      }
    }

    /** Every frame while it's up (main.js): the controller, and a scene starting puts it away. */
    frame(dt) {
      if (!this.isOpen) return;
      const g = this.game;
      if (document.body.classList.contains('cutscene') || (g.player && g.player.frozen)) {
        this.close();
        return;
      }
      g.input.takeMouseDelta();
      g.input.takeWheel();
      this._pad(dt || 0);
    }

    // ------------------------------------------------------------- input
    _mouse(on) {
      if (this._mouseOn === on) return;
      this._mouseOn = on;
      this.layer.classList.toggle('is-mouse', on);
    }

    _onKey(e) {
      if (!this.isOpen) return;
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      const code = e.code;
      const binds = this.game.input.bindings || {};
      const is = (action) => (binds[action] || []).includes(code);
      if (/^F\d+$/.test(code) || is('debug')) return; // the browser's keys and the developer overlay
      e.preventDefault();
      e.stopPropagation();
      this._mouse(false);
      const dirs = { ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1], ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0] };
      if (dirs[code] && !is('phone') && !is('map')) {
        const [dx, dy] = dirs[code];
        if (dx) this._side(dx);
        else this._move(0, dy);
        return;
      }
      if (e.repeat) return;
      if (is('phone')) this.close();
      else if (code === 'Escape' || code === 'Backspace') this._back();
      else if (code === 'Enter' || code === 'NumpadEnter' || code === 'Space' || code === 'KeyE') this._activate();
      else if (code === 'Tab') this._tab(e.shiftKey ? -1 : 1);
      else if (code === 'KeyX' || code === 'KeyG') this._gpsKey();
      else if (is('map')) this._openMap();
      else if (this.view === 'home' && /^Digit[1-6]$/.test(code)) this._go(GRID.concat(DOCK)[+code.slice(5) - 1]);
    }

    _onClick(e) {
      const back = e.target.closest('.ph-back');
      if (back) {
        this._back();
        return;
      }
      const btn = e.target.closest('[data-click]');
      const t = btn || e.target.closest('[data-nav]');
      if (!t || !this.screenEl.contains(t)) return;
      if (t.dataset.nav !== undefined) this._select(t.closest('[data-nav]'));
      const fn = t._click || t._act;
      if (fn) fn();
    }

    /** The controller, read straight from the pad (the game's own presses are off while the phone is up). */
    _pad(dt) {
      const pad = this.game.input.pad;
      if (!pad || !pad.connected) {
        this._padPrev.clear();
        return;
      }
      const now = pad.down;
      const hit = (a) => now.has(a) && !this._padPrev.has(a);
      if (hit('jump')) this._activate();
      else if (hit('crouch')) this._back();
      else if (hit('reload')) this._gpsKey();
      else if (hit('weaponWheel')) this._tab(-1);
      else if (hit('camera')) this._tab(1);
      else if (hit('map')) this._openMap();
      // A direction: the stick or the D-pad (up, down, left, right are the phone, horn, lights and daytime buttons).
      let dir = null;
      if (now.has('phone') || pad.move.y > STICK) dir = 'u';
      else if (now.has('horn') || pad.move.y < -STICK) dir = 'd';
      else if (now.has('lights') || pad.move.x < -STICK) dir = 'l';
      else if (now.has('daytime') || pad.move.x > STICK) dir = 'r';
      const h = this._hold;
      if (dir && dir !== h.dir) {
        h.dir = dir;
        h.t = REPEAT0;
        this._padDir(dir);
      } else if (dir) {
        h.t -= dt;
        if (h.t <= 0) {
          h.t = REPEAT;
          this._padDir(dir);
        }
      } else h.dir = null;
      if (now.size || pad.move.x || pad.move.y) {
        this._mouse(false);
        if (!this._hintPad) this._hints();
      }
      this._padPrev = new Set(now);
    }

    _padDir(dir) {
      if (!this.isOpen) return;
      if (dir === 'u') this._move(0, -1);
      else if (dir === 'd') this._move(0, 1);
      else this._side(dir === 'l' ? -1 : 1);
    }

    // -------------------------------------------------------- navigation
    _current() {
      return this.view === 'home' ? this.homeEl : this.appEl;
    }

    _navItems() {
      return Array.from(this._current().querySelectorAll('[data-nav]')).filter((n) => n.offsetParent !== null);
    }

    _select(node, scroll) {
      if (this._sel === node) return;
      if (this._sel) this._sel.classList.remove('is-sel');
      this._sel = node || null;
      this._selKey = node ? node.dataset.key || null : null;
      if (!node) return;
      node.classList.add('is-sel');
      if (scroll !== false) {
        this._scrollTo(node);
        // A row that opens up when chosen grows: look again once it has.
        clearTimeout(this._scrollTimer);
        this._scrollTimer = setTimeout(() => this._sel === node && this._scrollTo(node), 230);
      }
    }

    /** Bring a highlighted row into its list's view (layout offsets: the list itself may be mid-animation). */
    _scrollTo(node) {
      const box = node.closest('.ph-scroll, .ph-chips');
      if (!box) return;
      let y = 0;
      let x = 0;
      let n = node;
      while (n && n !== box) {
        y += n.offsetTop;
        x += n.offsetLeft;
        n = n.offsetParent;
      }
      if (n !== box) return;
      const pad = 10;
      if (box.classList.contains('ph-chips')) {
        if (x < box.scrollLeft + pad) box.scrollLeft = x - pad;
        else if (x + node.offsetWidth > box.scrollLeft + box.clientWidth - pad) box.scrollLeft = x + node.offsetWidth - box.clientWidth + pad;
        return;
      }
      const bottom = y + node.offsetHeight;
      if (y < box.scrollTop + pad) box.scrollTop = y - pad;
      else if (bottom > box.scrollTop + box.clientHeight - pad) box.scrollTop = Math.min(y - pad, bottom - box.clientHeight + pad);
    }

    /**
     * Where a node sits on the screen, from the layout rather than the
     * screen (the phone may still be tilting in, and a highlighted icon is
     * scaled up): { left, top, right, bottom } in CSS pixels.
     */
    _pos(node) {
      let x = 0;
      let y = 0;
      let n = node;
      while (n && n !== this.screenEl) {
        x += n.offsetLeft;
        y += n.offsetTop;
        const up = n.offsetParent;
        if (up && up !== this.screenEl) {
          x -= up.scrollLeft;
          y -= up.scrollTop;
        }
        n = up;
      }
      return { left: x, top: y, right: x + node.offsetWidth, bottom: y + node.offsetHeight, width: node.offsetWidth, height: node.offsetHeight };
    }

    /** Spatial: the nearest thing in that direction (works for the grid, the tabs and the lists). */
    _move(dx, dy) {
      const items = this._navItems();
      if (!items.length) {
        // Nothing to pick (a message thread): the arrows scroll.
        const box = this._current().querySelector('.ph-scroll');
        if (box && dy) box.scrollBy({ top: dy * box.clientHeight * 0.4, behavior: 'smooth' });
        return;
      }
      const cur = this._sel && items.includes(this._sel) ? this._sel : null;
      if (!cur) {
        this._select(items[0]);
        return;
      }
      const a = this._pos(cur);
      const ay = a.top + a.height / 2;
      let best = null;
      let bs = Infinity;
      for (const it of items) {
        if (it === cur) continue;
        const b = this._pos(it);
        let along;
        let across;
        if (dy) {
          // Rows: by their edges, so a tall open row doesn't hide the next one.
          along = dy > 0 ? b.top - a.top : a.bottom - b.bottom;
          // Side by side: how far apart the edges are (0 if they overlap; ties go to the left-most).
          across = Math.max(0, Math.max(a.left, b.left) - Math.min(a.right, b.right));
        } else {
          // Left and right stay on the same line.
          if (b.bottom <= a.top || b.top >= a.bottom) continue;
          along = dx > 0 ? b.left - a.left : a.right - b.right;
          across = Math.abs(b.top + b.height / 2 - ay);
        }
        if (along <= 1) continue;
        const score = along + across * 2;
        if (score < bs) {
          bs = score;
          best = it;
        }
      }
      if (best) {
        this._select(best);
        if (this.game.audio && this.game.audio.click) this.game.audio.click();
      } else if (dy) {
        // Nothing further that way: scroll to the end of the list.
        const box = cur.closest('.ph-scroll');
        if (box) box.scrollTop = dy > 0 ? box.scrollHeight : 0;
      }
    }

    /** Left and right: along the row of apps on the home screen, or the app's tabs. */
    _side(dir) {
      if (this.view === 'home') this._move(dir, 0);
      else this._tab(dir);
    }

    /** The next (or previous) tab: the Jobs filters, or the Bank's session and all time. */
    _tab(dir) {
      const onTabs = !!(this._sel && this._sel.closest('.ph-chips, .ph-tabs'));
      if (this.view === 'jobs') {
        const i = FILTERS.findIndex((f) => f[0] === this._filter);
        this._setFilter(FILTERS[(i + dir + FILTERS.length) % FILTERS.length][0], !onTabs);
      } else if (this.view === 'bank') {
        this._bankAll = !this._bankAll;
        this._renderApp(true);
        if (onTabs) this._select(this.appEl.querySelector('[data-key="bank:' + this._bankAll + '"]'));
      } else if (this.view === 'home') this._move(dir, 0);
      else return;
      if (this.game.audio && this.game.audio.click) this.game.audio.click();
    }

    _activate() {
      const s = this._sel;
      if (!s) return;
      const fn = s._act || s._click;
      if (fn) fn();
    }

    _gpsKey() {
      const s = this._sel;
      if (s && s._gps) s._gps();
      else this._activate();
    }

    _back() {
      if (this.view === 'thread') this._go('messages');
      else if (this.view !== 'home') this._home();
      else this.close();
    }

    _home() {
      const from = this.view;
      this.view = 'home';
      this._renderHome();
      this.viewsEl.classList.remove('in-app');
      this.homeEl.classList.add('is-on');
      this.appEl.classList.remove('is-on');
      const icon = this.homeEl.querySelector('[data-key="app:' + from + '"]') || this.homeEl.querySelector('[data-nav]');
      this._select(null);
      this._select(icon);
      this._hints();
    }

    _openMap() {
      const g = this.game;
      if (!g.minimap || !g.openMap) {
        this._toast('No map signal');
        return;
      }
      this.close(true);
      g.openMap();
      // The map pauses the sound and frees the mouse itself; if it couldn't open, back to the game.
      if (!g.minimap.isFullOpen) {
        if (g.audio) g.audio.setPaused(false);
        g.input.requestLock();
      }
    }

    /** Open an app. */
    _go(app, instant) {
      if (!app || !APPS[app]) return;
      if (app === 'map') {
        this._openMap();
        return;
      }
      const g = this.game;
      this.view = app;
      this._renderApp(false);
      this.viewsEl.classList.add('in-app');
      this.homeEl.classList.remove('is-on');
      this.appEl.classList.add('is-on');
      if (instant) {
        this.viewsEl.classList.add('no-anim');
        void this.viewsEl.offsetWidth;
        this.viewsEl.classList.remove('no-anim');
      }
      if (g.audio && g.audio.click && !instant) g.audio.click();
      this._hints();
    }

    /** Open a message thread (from the Messages list). */
    _openThread(from) {
      this.view = 'thread';
      this._thread = from;
      this._renderApp(false);
      this._hints();
    }

    // ---------------------------------------------------------- rendering
    /** The status bar: game time, signal (weaker out of town), battery (runs down through the day). */
    _status() {
      const g = this.game;
      const env = g.environment;
      this.timeEl.textContent = env && env.clockText ? env.clockText() : '12:00';
      const h = env ? env.hours : 12;
      const bat = Math.round(clamp(100 - (((h - 7 + 24) % 24) / 24) * 82, 14, 100));
      this.batFill.style.width = bat + '%';
      this.batText.textContent = String(bat);
      this.batFill.parentNode.classList.toggle('is-low', bat < 25);
      const p = g.player && g.player.pos;
      const far = p ? Math.max(Math.abs(p.x), Math.abs(p.z)) : 0;
      const bars = far > 900 ? 2 : far > 650 ? 3 : 4;
      Array.from(this.sigEl.children).forEach((b, i) => b.classList.toggle('is-on', i < bars));
      const night = env && typeof env.nightFactor === 'number' ? env.nightFactor > 0.55 : h < 6 || h > 20;
      this.wallEl.classList.toggle('is-night', night);
    }

    _hints() {
      const g = this.game;
      const pad = g.input.lastDevice === 'gamepad' && g.input.pad && g.input.pad.connected;
      this._hintPad = pad;
      const key = (k, label) => {
        const r = el('span', 'ph-hint');
        r.append(el('kbd', '', k), el('span', '', label));
        return r;
      };
      const phoneKey = g.input.labelFor('phone');
      const list = [];
      const v = this.view;
      const tabs = v === 'jobs' || v === 'bank';
      // What choosing does here (nothing to choose in Rep or a message thread).
      const choose = { home: 'Open', jobs: 'Set GPS', hustles: 'Show me', messages: 'Open', bank: 'Choose' }[v] || '';
      if (pad) {
        if (choose) list.push(key('A', choose));
        if (tabs) list.push(key('LB/RB', 'Tabs'));
        list.push(key('B', v === 'home' ? 'Put away' : 'Back'));
      } else {
        list.push(key('↑↓', v === 'thread' ? 'Scroll' : 'Move'));
        if (tabs) list.push(key('←→', 'Tabs'));
        if (choose) list.push(key('Enter', choose));
        list.push(key('Esc', v === 'home' ? 'Put away' : 'Back'));
        if (v !== 'home') list.push(key(phoneKey && phoneKey !== '—' ? phoneKey : 'P', 'Put away'));
      }
      this.hintsEl.textContent = '';
      this.hintsEl.append(...list);
    }

    _toast(text, good) {
      const t = this.toastEl;
      t.textContent = '';
      if (good) t.append(svg('pin', 'ph-toast-icon'));
      t.append(el('span', '', text));
      t.classList.add('is-on');
      clearTimeout(this._toastTimer);
      this._toastTimer = setTimeout(() => t.classList.remove('is-on'), 1900);
    }

    /** Something to highlight and choose: `act` runs on Enter (and a click, unless `click` is given). */
    _nav(node, key, act, click) {
      node.dataset.nav = '';
      if (key) node.dataset.key = key;
      if (act) node._act = act;
      if (click) node._click = click;
      return node;
    }

    _head(title, note) {
      const h = el('header', 'ph-head');
      const back = el('button', 'ph-back');
      back.type = 'button';
      back.tabIndex = -1;
      back.title = 'Back';
      back.append(svg('back'));
      back.append(el('span', '', this.view === 'thread' ? 'Messages' : 'Home'));
      h.append(back);
      const t = el('div', 'ph-head-row');
      t.append(el('h2', 'ph-title', title));
      if (note) t.append(el('span', 'ph-head-note', note));
      h.append(t);
      return h;
    }

    _soon(what, text) {
      const c = el('div', 'ph-card ph-soon');
      c.append(el('div', 'ph-soon-icon', '⏳'), el('b', '', what + ' is coming soon'), el('p', '', text || 'This part of the phone is still being set up. Check back after the next update.'));
      return c;
    }

    /** Rebuild the open app (`keep`: stay where the highlight and the scroll were). */
    _renderApp(keep) {
      const view = this.view;
      const box = this.appEl;
      const old = box.querySelector('.ph-scroll');
      const top = keep && old ? old.scrollTop : 0;
      const key = keep ? this._selKey : null;
      box.textContent = '';
      box.dataset.app = view === 'thread' ? 'messages' : view;
      this._sel = null;
      // From one app straight to another (a hustle's "show me where", a message thread): a quick slide.
      box.classList.remove('is-swap');
      if (!keep && this.viewsEl.classList.contains('in-app')) {
        void box.offsetWidth;
        box.classList.add('is-swap');
      }
      const app = APPS[view === 'thread' ? 'messages' : view];
      const fill = {
        hustles: () => this._appHustles(box),
        rep: () => this._appRep(box),
        jobs: () => this._appJobs(box),
        bank: () => this._appBank(box),
        messages: () => this._appMessages(box),
        thread: () => this._appThread(box),
      }[view];
      try {
        if (fill) fill();
      } catch (err) {
        console.warn('[phone] ' + view, err);
        box.textContent = '';
        box.append(this._head(app ? app.title : 'Phone'));
        const s = el('div', 'ph-scroll');
        s.append(this._soon(app ? app.title : 'This app', 'It isn\'t answering right now.'));
        box.append(s);
      }
      const scroll = box.querySelector('.ph-scroll');
      if (scroll) scroll.scrollTop = top;
      const again = key ? box.querySelector('[data-key="' + CSS.escape(key) + '"]') : null;
      const want = this._focusNode && this._focusNode.isConnected ? this._focusNode : null;
      this._focusNode = null;
      this._select(want || again || box.querySelector('.ph-item, .ph-task') || box.querySelector('[data-nav]'), !keep || !again);
    }

    // --------------------------------------------------------------- home
    _renderHome() {
      const g = this.game;
      const box = this.homeEl;
      box.textContent = '';
      this._sel = null;
      this._status();
      const env = g.environment;

      // The lock-screen clock: day, time, weather and where Jay is.
      const lock = el('div', 'ph-lock');
      const day = safe(() => (g.dailies ? g.dailies.day : 0), 0);
      const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = day ? DAYS[(day + 3) % 7] : 'Vicehaven';
      lock.append(el('div', 'ph-lock-date', dayName + (day ? ' · Day ' + day : '')));
      lock.append(el('div', 'ph-lock-time', env && env.clockText ? env.clockText() : '12:00'));
      const w = el('div', 'ph-lock-where');
      const ws = safe(() => g.weather.state, 'clear');
      const night = this.wallEl.classList.contains('is-night');
      const wIcon = ws === 'storm' ? 'bolt' : ws === 'rain' ? 'rain' : ws === 'cloudy' || ws === 'overcast' ? 'cloud' : night ? 'moon' : 'sun';
      w.append(svg(wIcon, 'ph-weather'));
      const where = safe(() => {
        const p = g.player.pos;
        return g._place || g.world.districtAt(p.x, p.z).name;
      }, 'Vicehaven');
      w.append(el('span', '', where));
      lock.append(w);
      box.append(lock);

      // The Daily Hustles widget.
      const wid = el('div', 'ph-widget');
      this._nav(wid, 'widget:hustles', () => this._go('hustles'));
      const D = g.dailies;
      const list = safe(() => (D && D.list ? D.list() : null), null);
      const wh = el('div', 'ph-widget-head');
      wh.append(svg('flame', 'ph-widget-icon'), el('span', 'ph-widget-title', 'Daily Hustles'));
      const streak = safe(() => D.streak, 0) || 0;
      if (list) {
        const done = list.filter((t) => t.done).length;
        wh.append(el('span', 'ph-widget-note', streak ? streak + '-day streak' : done + ' of ' + list.length + ' done'));
      }
      wid.append(wh);
      if (list && list.length) {
        for (const t of list.slice(0, 3)) {
          const r = el('div', 'ph-wrow' + (t.done ? ' is-done' : ''));
          const bar = el('span', 'ph-mini');
          const f = el('i');
          f.style.width = Math.round(clamp(t.goal ? t.progress / t.goal : 0, 0, 1) * 100) + '%';
          bar.append(f);
          r.append(t.done ? svg('check', 'ph-wcheck') : bar, el('span', 'ph-wlabel', t.label));
          wid.append(r);
        }
        const left = safe(() => D.timeLeft(), null);
        if (typeof left === 'number') wid.append(el('div', 'ph-widget-foot', 'New hustles in ' + this._dur(left)));
      } else {
        wid.append(el('div', 'ph-wrow ph-wempty', 'Three new tasks every game day. Coming soon.'));
      }
      box.append(wid);

      // Two small widgets: Street Rep and cash.
      const minis = el('div', 'ph-minis');
      const R = g.rep;
      const rw = el('div', 'ph-mini-w is-rep');
      this._nav(rw, 'widget:rep', () => this._go('rep'));
      rw.append(el('span', 'ph-kicker', 'Street Rep'));
      if (R && typeof R.level === 'number') {
        const frac = R.next ? clamp((R.xp || 0) / R.next, 0, 1) : 1;
        rw.append(el('b', 'ph-mini-big', 'Level ' + R.level));
        const bar = el('span', 'ph-mini-bar');
        const f = el('i');
        f.style.width = Math.round(frac * 100) + '%';
        bar.append(f);
        rw.append(bar, el('small', '', R.next ? num(typeof R.toGo === 'number' ? R.toGo : R.next - R.xp) + ' XP to go' : 'Top level'));
      } else rw.append(el('b', 'ph-mini-big', 'Soon'), el('small', '', 'Levels and perks'));
      const bw = el('div', 'ph-mini-w is-cash');
      this._nav(bw, 'widget:bank', () => this._go('bank'));
      bw.append(el('span', 'ph-kicker', 'Cash'), el('b', 'ph-mini-big ph-money', money(g.player.money)));
      const made = Object.keys(this.session).reduce((a, k) => a + this.session[k], 0);
      bw.append(el('small', '', made > 0 ? '+' + money(made) + ' this session' : 'Nothing earned yet'));
      minis.append(rw, bw);
      box.append(minis);

      // The apps.
      const grid = el('div', 'ph-grid');
      for (const id of GRID) grid.append(this._appIcon(id));
      box.append(grid);
      const dock = el('div', 'ph-dock');
      for (const id of DOCK) dock.append(this._appIcon(id));
      box.append(dock);
    }

    _appIcon(id) {
      const a = APPS[id];
      const b = el('div', 'ph-app-icon is-' + id);
      this._nav(b, 'app:' + id, () => this._go(id));
      const tile = el('span', 'ph-tile');
      tile.append(svg(a.icon));
      const badge = this._badge(id);
      if (badge) tile.append(el('span', 'ph-badge' + (badge === '!' ? ' is-live' : ''), badge));
      b.append(tile, el('span', 'ph-app-name', a.name));
      return b;
    }

    /** The number on an app's icon. */
    _badge(id) {
      const g = this.game;
      if (id === 'hustles') {
        const list = safe(() => g.dailies.list(), null);
        const n = list ? list.filter((t) => !t.done).length : 0;
        return n ? String(n) : '';
      }
      if (id === 'messages') {
        const n = this.texts.length - this.readTexts;
        return n > 0 ? String(Math.min(n, 99)) : '';
      }
      if (id === 'jobs') return safe(() => g.encounters.current(), null) && !(g.missions && g.missions.run) ? '!' : '';
      return '';
    }

    _dur(seconds) {
      const s = Math.max(0, Math.round(seconds));
      if (s >= 3600) return Math.floor(s / 3600) + ' h ' + Math.floor((s % 3600) / 60) + ' min';
      if (s >= 120) return Math.ceil(s / 60) + ' min';
      return clockOf(s);
    }

    // ------------------------------------------------------------ Hustles
    _appHustles(box) {
      const g = this.game;
      const D = g.dailies;
      const list = safe(() => (D && D.list ? D.list() : null), null);
      const day = safe(() => D.day, 0);
      box.append(this._head('Daily Hustles', day ? 'Day ' + day : ''));
      const s = el('div', 'ph-scroll');
      box.append(s);
      if (!list) {
        s.append(this._soon('Daily Hustles', 'Three small tasks every game day, with cash, Rep and a streak bonus for doing all three.'));
        return;
      }
      // The streak.
      const streak = safe(() => D.streak, 0) || 0;
      const best = safe(() => D.best, 0) || 0;
      const allToday = !!safe(() => D.allToday, false) || (list.length && list.every((t) => t.done));
      const card = el('div', 'ph-card ph-streak');
      const top = el('div', 'ph-streak-top');
      const big = el('div', 'ph-streak-num');
      big.append(el('b', '', String(streak)), el('span', '', streak === 1 ? 'day streak' : 'day streak'));
      top.append(big);
      if (best > streak) top.append(el('span', 'ph-streak-best', 'Best ' + best));
      card.append(top);
      const flames = el('div', 'ph-flames');
      for (let i = 0; i < 7; i++) flames.append(svg('flame', 'ph-flame' + (i < Math.min(streak, 7) ? ' is-lit' : '')));
      card.append(flames);
      const bonus = Math.min(7, streak + 1) * 1000;
      card.append(el('div', 'ph-streak-note', allToday ? 'All three done today. Come back tomorrow to keep the streak.' : 'Do all three today: ' + money(bonus) + ' streak bonus.'));
      s.append(card);

      // The three tasks.
      list.forEach((t, i) => {
        const c = el('div', 'ph-card ph-task' + (t.done ? ' is-done' : ''));
        const at = t.done ? null : HUSTLE_AT[t.id] || null;
        this._nav(c, 'task:' + t.id, at ? () => this._pointAt(at) : null, () => {});
        const head = el('div', 'ph-task-head');
        const ic = el('span', 'ph-task-icon', t.icon || '★');
        const lab = el('div', 'ph-task-label', t.label);
        head.append(ic, lab);
        if (t.done) head.append(svg('check', 'ph-task-check'));
        c.append(head);
        const bar = el('div', 'ph-bar');
        const f = el('i');
        f.style.width = Math.round(clamp(t.goal ? t.progress / t.goal : 0, 0, 1) * 100) + '%';
        bar.append(f);
        c.append(bar);
        const foot = el('div', 'ph-task-foot');
        foot.append(el('span', 'ph-task-prog', t.done ? 'Done' : this._progText(t)));
        const rw = el('span', 'ph-task-reward');
        if (t.reward && t.reward.money) rw.append(el('b', 'ph-money', money(t.reward.money)));
        if (t.reward && t.reward.xp) rw.append(el('span', 'ph-xp', '+' + num(t.reward.xp) + ' REP'));
        foot.append(rw);
        c.append(foot);
        const more = el('div', 'ph-more');
        const inner = el('div', 'ph-more-in');
        if (t.hint) inner.append(el('p', 'ph-hint-text', t.hint));
        if (t.reveal) inner.append(el('p', 'ph-hint-text ph-gold', 'Also marks a hidden cash stash on your map.'));
        if (at) inner.append(el('span', 'ph-link', 'Show me where ›'));
        more.append(inner);
        c.append(more);
        c.style.setProperty('--i', i);
        s.append(c);
      });

      const left = safe(() => D.timeLeft(), null);
      if (typeof left === 'number') {
        const f = el('div', 'ph-foot');
        f.append(el('span', '', 'New hustles in '), el('b', '', this._dur(left)));
        s.append(f);
      }
    }

    _progText(t) {
      const p = t.progress;
      const fmt = (x) => (t.goal >= 1000 ? money(x) : Number.isInteger(x) ? num(x) : x.toFixed(1));
      return fmt(p) + ' / ' + fmt(t.goal);
    }

    /** A hustle's "show me where": the Jobs app, on the nearest thing that gets it done. */
    _pointAt(at) {
      this._filter = at === 'up:' ? 'buy' : 'all';
      this._want = at;
      this._go('jobs');
    }

    // ---------------------------------------------------------------- Rep
    _appRep(box) {
      const g = this.game;
      const R = g.rep;
      box.append(this._head('Street Rep'));
      const s = el('div', 'ph-scroll');
      box.append(s);
      if (!R || typeof R.level !== 'number') {
        s.append(this._soon('Street Rep', 'Experience for everything Jay does: levels, cash bonuses and perks.'));
        return;
      }
      const level = R.level;
      const next = R.next || 0;
      const xp = R.xp || 0;
      const max = !next;
      const frac = max ? 1 : clamp(xp / next, 0, 1);

      const hero = el('div', 'ph-card ph-rep-hero');
      const ring = el('div', 'ph-ring');
      const C = 2 * Math.PI * 42;
      ring.innerHTML = '<svg viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="phRingGrad" x1="0" y1="0" x2="1" y2="1">' +
        '<stop offset="0" stop-color="#ffb347"/><stop offset="0.55" stop-color="#ff4f8b"/><stop offset="1" stop-color="#b04ae0"/></linearGradient></defs>' +
        '<circle class="ph-ring-bg" cx="50" cy="50" r="42"/><circle class="ph-ring-fg" cx="50" cy="50" r="42" stroke-dasharray="' + (C * frac).toFixed(1) + ' ' + C.toFixed(1) + '"/></svg>';
      const lv = el('div', 'ph-ring-num');
      lv.append(el('span', '', 'LEVEL'), el('b', '', String(level)));
      ring.append(lv);
      const info = el('div', 'ph-rep-info');
      info.append(el('div', 'ph-rep-xp', max ? 'Top level' : num(xp) + ' / ' + num(next) + ' XP'));
      const toGo = typeof R.toGo === 'number' ? R.toGo : Math.max(0, next - xp);
      if (!max) {
        info.append(el('div', 'ph-rep-to', num(toGo) + ' XP to level ' + (level + 1)));
        info.append(el('div', 'ph-rep-pay', 'Level ' + (level + 1) + ' pays ' + money(200 * (level + 1))));
      } else info.append(el('div', 'ph-rep-to', 'Level ' + level + ' of ' + (R.maxLevel || 50) + '. Nothing left to prove.'));
      if (typeof R.total === 'number') info.append(el('div', 'ph-rep-total', num(R.total) + ' XP in all'));
      hero.append(ring, info);
      s.append(hero);

      const perks = safe(() => (R.perkList ? R.perkList() : null), null);
      if (!perks) {
        s.append(this._soon('The perk list'));
        return;
      }
      const nextPerk = perks.find((p) => !p.unlocked);
      if (nextPerk) {
        const c = el('div', 'ph-card ph-next-perk');
        this._nav(c, 'perk:next');
        c.append(el('div', 'ph-kicker', 'Next perk · level ' + nextPerk.level));
        const row = el('div', 'ph-next-row');
        row.append(svg('star', 'ph-next-star'), el('b', '', nextPerk.label));
        c.append(row);
        const away = nextPerk.level - level;
        c.append(el('div', 'ph-next-away', away === 1 ? 'At the next level' : away + ' levels away'));
        s.append(c);
      }
      const have = perks.filter((p) => p.unlocked);
      s.append(el('div', 'ph-section', have.length ? 'Your perks (' + have.length + ')' : 'Perks'));
      const list = el('div', 'ph-list ph-perks');
      for (const p of perks) {
        const r = el('div', 'ph-perk' + (p.unlocked ? ' is-on' : '') + (p === nextPerk ? ' is-next' : ''));
        this._nav(r, 'perk:' + p.level + ':' + p.label);
        r.append(el('span', 'ph-perk-lv', String(p.level)));
        r.append(el('span', 'ph-perk-label', p.label));
        r.append(svg(p.unlocked ? 'check' : 'lock', 'ph-perk-state'));
        list.append(r);
      }
      s.append(list);
      const tips = el('div', 'ph-card ph-tips');
      tips.append(el('div', 'ph-kicker', 'How to earn Rep'));
      tips.append(el('p', '', 'Everything counts: story and side jobs, races, odd jobs, chop shop sales, street encounters, cash stashes, taxi fares, stunt jumps, lanterns and the Daily Hustles. Every level pays $200 times the new level.'));
      s.append(tips);
    }

    // --------------------------------------------------------------- Jobs
    /** Everything there is to do right now: [{ id, kind, cat, icon, title, tag, how, pay, x, z, d, ... }]. */
    _items() {
      const g = this.game;
      const p = g.player.pos;
      const run = g.missions && g.missions.run;
      const out = [];
      const add = (it) => {
        if (typeof it.x === 'number' && typeof it.z === 'number') {
          it.d = Math.hypot(it.x - p.x, it.z - p.z);
          it.dir = compass(it.x - p.x, it.z - p.z);
        } else it.d = Infinity;
        out.push(it);
      };
      const perk = (id) => {
        const k = safe(() => (g.rep && g.rep.perk ? g.rep.perk(id) : 1), 1);
        return typeof k === 'number' && k > 0 ? k : 1;
      };
      const key = (a) => {
        const k = g.input.labelFor(a);
        return k && k !== '—' ? k : a === 'phone' ? 'P' : 'E';
      };

      // A story job under way comes first: everything else waits.
      if (run && run.m) {
        add({ id: 'run', kind: 'run', cat: 'story', icon: 'objective', title: run.m.title, tag: 'ON A JOB', tone: 'hot', pin: 2,
          how: (run.objective ? run.objective + '. ' : '') + 'Side work waits until this job is done.' });
      }

      // The street encounter going on.
      const enc = safe(() => (g.encounters && g.encounters.current ? g.encounters.current() : null), null);
      if (enc && !run) {
        const info = STREET[enc.kind] || ['Something is happening nearby. Go and see.', null];
        add({ id: 'enc', kind: 'street', cat: 'cash', icon: 'encounter', title: enc.label || 'Something\'s happening', tag: 'LIVE', tone: 'live', pin: 1,
          how: info[0], pay: info[1] ? range(info[1][0], info[1][1]) : '', x: enc.x, z: enc.z });
      }

      // Daily Hustles still to do: a way into the Hustles app.
      const daily = safe(() => (g.dailies && g.dailies.list ? g.dailies.list() : null), null);
      if (daily && daily.length) {
        const left = daily.filter((t) => !t.done);
        if (left.length) {
          const cash = left.reduce((a, t) => a + ((t.reward && t.reward.money) || 0), 0);
          add({ id: 'daily', kind: 'daily', cat: 'cash', emoji: '🔥', title: 'Daily Hustles: ' + (daily.length - left.length) + ' of ' + daily.length + ' done', pin: 0.5,
            how: left.map((t) => t.label).join(' · '), pay: cash ? money(cash) : '', open: 'hustles', go: 'Open Hustles' });
        }
      }

      // Odd jobs, at their depots.
      const jobs = safe(() => (g.oddJobs && g.oddJobs.jobs ? g.oddJobs.jobs() : null), null);
      if (jobs) {
        for (const j of jobs) {
          const lv = clamp(j.level || 1, 1, j.maxLevel || 10);
          const pay = round10((150 + (350 * (lv - 1)) / 9) * perk('oddjob'));
          const dp = j.depot || {};
          add({ id: 'odd:' + j.id, kind: 'oddjob', cat: 'jobs', icon: 'oddjob', title: j.name + (dp.name ? ' · ' + dp.name : ''),
            tag: j.active ? 'ON DUTY' : j.mastered ? 'MASTERED' : 'LEVEL ' + lv + '/' + (j.maxLevel || 10), tone: j.active ? 'live' : '',
            how: (j.how || 'Get in the work vehicle and press ' + key('phone')) + '. Ten levels: ' + money(5000) + ' and ' + (j.perk || 'a perk') + ' for clearing them all.',
            pay: '~' + money(pay) + ' a call', x: dp.x, z: dp.z, gps: dp.name || j.name });
        }
      }

      // Chop shops, with today's hot list.
      const shops = safe(() => (g.chopShops && g.chopShops.shops ? g.chopShops.shops() : null), null);
      if (shops) {
        const hot = safe(() => g.chopShops.hotList(), []) || [];
        const k = perk('chop');
        const top = Math.max(2500 * k, ...hot.map((h) => (h.sold ? 0 : h.price || 0)));
        for (const sh of shops) {
          add({ id: 'chop:' + sh.id, kind: 'chop', cat: 'cash', icon: 'chopshop', title: sh.name, tag: sh.open === false ? 'SHUT' : hot.some((h) => !h.sold) ? 'HOT LIST' : '',
            tone: sh.open === false ? 'off' : 'hot',
            how: sh.open === false ? 'Shut for now: the police were round. Try another garage.' : 'Drive any car into the bay and stop: cash on the spot. Damage costs; a police car pays well but brings heat.',
            pay: 'Up to ' + money(round10(top)), x: sh.x, z: sh.z, hot });
        }
      }

      // Hidden cash stashes: warmer or colder (the phone never gives one away, unless it's been marked).
      const S = g.stashes;
      if (S && typeof S.total === 'number' && S.total > 0) {
        const found = S.found || 0;
        const near = safe(() => S.nearest(p.x, p.z, 1), null);
        const n0 = near && near[0];
        let hint = 'All found. Nice work.';
        let tag = '';
        if (n0 && found < S.total) {
          const d = typeof n0.d === 'number' ? n0.d : Math.hypot(n0.x - p.x, n0.z - p.z);
          tag = d < 60 ? 'RED HOT' : d < 150 ? 'HOT' : d < 300 ? 'WARM' : d < 600 ? 'COOL' : 'COLD';
          hint = d < 60 ? 'One is right here: look around, up and down.' : d < 150 ? 'One is very close.' : d < 300 ? 'You\'re warm: one is a short walk away.' : d < 600 ? 'One is a few streets away.' : 'Nothing near here. Try another district.';
          if (this._stashD !== null && Math.abs(d - this._stashD) > 25) hint += d < this._stashD ? ' Warmer than last time.' : ' Colder than last time.';
          this._stashD = d;
        }
        add({ id: 'stash', kind: 'stash', cat: 'cash', icon: 'stash', title: 'Cash stashes · ' + found + ' of ' + S.total + ' found', tag, tone: tag === 'RED HOT' || tag === 'HOT' ? 'hot' : '',
          how: hint + ' Walk over a bag to take it.', pay: range(round10(300 * perk('stash')), round10(1500 * perk('stash'))), info: true, hintD: n0 ? n0.d : Infinity });
      }
      // Stashes marked on the map (a Daily Hustle reward) can be found by GPS.
      const blips = safe(() => g.blips().slice(), []) || [];
      for (const b of blips) {
        if (b.type !== 'stash') continue;
        add({ id: 'stashmark:' + Math.round(b.x) + ',' + Math.round(b.z), kind: 'stash', cat: 'cash', icon: 'stash', title: b.label || 'Cash stash', tag: 'MARKED',
          how: 'Marked on your map. Walk over the bag to take it.', pay: range(300, 1500), x: b.x, z: b.z });
      }

      // Hold-ups: the nearest corner shop that's open.
      const stores = g.stores;
      if (stores && stores.list && stores.list.length) {
        const s0 = this._nearest(stores.list.filter((s) => safe(() => stores.isOpen(s), true)), (s) => s.door);
        if (s0) {
          add({ id: 'holdup', kind: 'holdup', cat: 'cash', icon: 'store', title: 'Hold up ' + safe(() => stores.brandName(s0), 'a corner shop'),
            how: 'Point a gun at the clerk and keep him calm while he fills the bag. The safe pays more. Brings the police.', pay: range(240, 760), x: s0.door.x, z: s0.door.z });
        }
      }

      // Taxi fares.
      const A = g.activities;
      if (A && A.taxi) {
        const need = A.data && A.data.taxiRequires;
        if (!need || (g.missions && g.missions.completed[need])) {
          const cab = this._nearest((g.vehicles && g.vehicles.list ? g.vehicles.list : []).filter((v) => v.type === 'cab' && !v.removed && !v.wrecked && v !== g.player.vehicle), (v) => v.pos, 450);
          const k = perk('taxi');
          add({ id: 'taxi', kind: 'taxi', cat: 'cash', icon: 'car', title: 'Taxi fares' + (A.taxi.done ? ' · ' + A.taxi.done + ' done' : ''), tag: A.taxi.on ? 'ON DUTY' : '', tone: A.taxi.on ? 'live' : '',
            how: 'Get in any yellow cab and press ' + key('phone') + '. Pick the fare up, get them there before the meter runs out.' + (cab ? '' : ' (No cab near: they drive round every district.)'),
            pay: range(round10(40 * k), round10(250 * k)) + ' a fare', x: cab ? cab.pos.x : undefined, z: cab ? cab.pos.z : undefined, gps: 'A cab' });
        }
        // The nearest stunt jump not yet cleared.
        if (A.ramps && A.ramps.length) {
          const open = A.ramps.filter((r) => r.j && !(A.jumpsDone || {})[r.j.name]);
          const r0 = this._nearest(open, (r) => r.j);
          if (r0) {
            add({ id: 'stunt', kind: 'stunt', cat: 'cash', icon: 'challenge', title: 'Stunt jump: ' + r0.j.name, tag: (A.ramps.length - open.length) + '/' + A.ramps.length,
              how: 'Hit the ramp fast in a car and land it.', pay: money(500) + ' first time', x: r0.j.x, z: r0.j.z });
          }
        }
        const lit = Object.keys(A.lanternsFound || {}).length;
        const all = A.lanterns ? A.lanterns.length : 30;
        if (lit < all) {
          add({ id: 'lantern', kind: 'lantern', cat: 'cash', emoji: '🏮', title: 'Lost lanterns · ' + lit + ' of ' + all, info: true,
            how: 'Red paper lanterns hidden round the city, high and low. Walk through one to light it.', pay: money(100) + ' each' });
        }
      }

      // Story jobs, side jobs and races: the markers on the map.
      if (!run && g.missions && g.missions.markers) {
        for (const mk of g.missions.markers) {
          const m = mk.m;
          const pl = mk.place;
          if (!m || !pl) continue;
          const race = m.giver === 'race' || /^race_/.test(m.id);
          const story = !!m._main;
          const pay = m.reward && m.reward.money ? money(m.reward.money) : '';
          add({ id: 'm:' + m.id, kind: story ? 'story' : race ? 'race' : 'side', cat: story ? 'story' : 'jobs', icon: story ? 'mission' : race ? 'race' : 'challenge',
            title: m.title, tag: story ? 'ACT ' + (m.act || 1) : race ? 'RACE' : m._chain ? 'SIDE STORY' : 'SIDE JOB', tone: story ? 'story' : '',
            how: (race ? 'Drive into the marker to start. ' : 'Walk into the marker to start. ') + (m.summary || ''), pay, x: pl.x, z: pl.z });
        }
      }

      // Bayline Arms.
      const guns = g.gunShops;
      if (guns && guns.list && guns.list.length) {
        const s0 = this._nearest(guns.list.filter((s) => safe(() => guns.isOpen(s), true)), (s) => s.door);
        if (s0) {
          const off = Math.round((1 - perk('guns')) * 100);
          add({ id: 'guns', kind: 'gunshop', cat: 'buy', icon: 'gunshop', title: s0.name || 'Bayline Arms',
            how: 'Guns, ammo and body armour. Press ' + key('interact') + ' at the counter.' + (off > 0 ? ' Your Rep gets you ' + off + '% off.' : ''), pay: off > 0 ? off + '% off' : '', x: s0.door.x, z: s0.door.z });
        }
      }

      // Businesses: paydays, upgrades and the ones for sale.
      const P = g.properties;
      if (P && P.list && P.list.length) {
        const owned = P.list.filter((q) => P.owned && P.owned[q.id]);
        const cash = g.player.money;
        if (owned.length) {
          const pay = safe(() => P.income(), 0) || 0;
          const k = perk('payday');
          const t = this._payday();
          add({ id: 'payday', kind: 'payday', cat: 'buy', icon: 'owned', title: 'Next payday' + (t !== null ? ' in ' + this._dur(t) : ''), info: true,
            how: owned.length + (owned.length === 1 ? ' business pays' : ' businesses pay') + ' out every payday, wherever you are.' + (k > 1 ? ' That includes +' + Math.round((k - 1) * 100) + '% from your Rep.' : ''),
            pay: money(pay) });
          if (P.upgradeCost && P.tier) {
            for (const q of owned) {
              const cost = safe(() => P.upgradeCost(q), 0);
              if (!cost) continue;
              const tier = safe(() => P.tier(q), 0) || 0;
              const inc = safe(() => P.income(q), q.income);
              // The sign's own prompt names the next upgrade ('Upgrade <name>: New sign').
              const what = q.item && typeof q.item.label === 'string' && q.item.label.indexOf(': ') > 0 ? q.item.label.split(': ').pop() : '';
              add({ id: 'up:' + q.id, kind: 'property', cat: 'buy', icon: 'owned', title: 'Upgrade ' + q.name, tag: 'UPGRADE ' + (tier + 1) + '/3', tone: cash >= cost ? 'good' : '',
                how: (what ? what + ': ' : '') + 'press ' + key('interact') + ' at its sign. Each upgrade adds half the base takings again.' + (typeof inc === 'number' ? ' It pays ' + money(inc) + ' a payday now.' : ''),
                pay: money(cost), x: q.sign.x, z: q.sign.z, gps: q.name });
            }
          }
        }
        const sale = P.list.filter((q) => !(P.owned && P.owned[q.id]));
        for (const q of sale) {
          add({ id: 'buy:' + q.id, kind: 'property', cat: 'buy', icon: 'property', title: q.name, tag: cash >= q.price ? 'YOU CAN AFFORD IT' : '', tone: cash >= q.price ? 'good' : '',
            how: 'Walk up to the For Sale sign and press ' + key('interact') + ' to buy it. Pays ' + money(q.income) + ' every payday, for good.', pay: money(q.price),
            x: q.sign.x, z: q.sign.z, gps: q.name, afford: cash >= q.price });
        }
      }

      // The club: dancing for tips at night.
      for (const b of blips) {
        if (b.type !== 'shop' || !/club/i.test(b.label || '')) continue;
        add({ id: 'club', kind: 'club', cat: 'cash', icon: 'shop', title: (b.label || 'The club').replace(/\s*\(club\)/i, ''), how: 'Open every night: dance to the beat for tips.', pay: 'Tips', x: b.x, z: b.z });
        break;
      }
      return out;
    }

    /** Seconds to the next business payday, or null. */
    _payday() {
      const P = this.game.properties;
      if (!P) return null;
      const t = safe(() => (P.nextPayday ? P.nextPayday() : P.paydayT), null);
      return typeof t === 'number' ? t : null;
    }

    _nearest(list, posOf, maxD) {
      const p = this.game.player.pos;
      let best = null;
      let bd = maxD || Infinity;
      for (const it of list || []) {
        const q = posOf(it);
        if (!q) continue;
        const d = Math.hypot(q.x - p.x, q.z - p.z);
        if (d < bd) {
          bd = d;
          best = it;
        }
      }
      return best;
    }

    /** Change the Jobs tab; `toList`: the highlight goes to the first row (or stays on the tab). */
    _setFilter(f, toList) {
      if (this._filter === f) return;
      this._filter = f;
      this._want = null;
      this._renderApp(false);
      const chip = this.appEl.querySelector('[data-key="filter:' + f + '"]');
      const first = this.appEl.querySelector('.ph-item');
      this._select(null);
      this._select(toList ? first || chip : chip);
    }

    _appJobs(box) {
      const g = this.game;
      const items = this._items();
      const wp = g.waypoint;
      const run = g.missions && g.missions.run;
      box.append(this._head('Things to do', 'Nearest first'));
      const chips = el('div', 'ph-chips');
      for (const [id, label] of FILTERS) {
        const n = id === 'all' ? items.length : items.filter((it) => it.cat === id).length;
        const c = el('div', 'ph-chip' + (this._filter === id ? ' is-on' : ''));
        this._nav(c, 'filter:' + id, () => this._setFilter(id, true));
        c.append(el('span', '', label));
        if (n) c.append(el('small', '', String(n)));
        chips.append(c);
      }
      box.append(chips);
      const s = el('div', 'ph-scroll');
      box.append(s);
      if (run) s.append(el('div', 'ph-banner', 'You\'re on a job. The rest can wait: it\'ll all still be here.'));
      let list = items.filter((it) => this._filter === 'all' || it.cat === this._filter);
      // In All, businesses for sale only once Jay can afford one (the Buy tab has them all).
      if (this._filter === 'all') list = list.filter((it) => !(it.id.indexOf('buy:') === 0 && !it.afford));
      list.sort((a, b) => (b.pin || 0) - (a.pin || 0) || (a.info ? a.hintD || Infinity : a.d) - (b.info ? b.hintD || Infinity : b.d));
      if (!list.length) {
        const c = el('div', 'ph-card ph-soon');
        c.append(el('b', '', 'Nothing here yet'), el('p', '', this._filter === 'all' ? 'Keep playing: new things turn up as the story goes on.' : 'Nothing here right now. Try another tab.'));
        s.append(c);
        return;
      }
      for (const it of list) {
        const row = this._jobRow(it, wp);
        // A Daily Hustle's "show me": the first thing of its kind.
        const w = this._want;
        if (!this._focusNode && w && (it.kind === w || it.id === w || (w.slice(-1) === ':' && it.id.indexOf(w) === 0))) this._focusNode = row;
        s.append(row);
      }
      if (this._want && !this._focusNode) {
        this._toast(this._want === 'street' ? 'Nothing happening yet: keep moving, they find you' : 'Nothing for that near you right now');
      }
      this._want = null;
    }

    _jobRow(it, wp) {
      const row = el('div', 'ph-item' + (it.tone ? ' tone-' + it.tone : '') + (it.info ? ' is-info' : ''));
      const has = typeof it.x === 'number';
      const isWp = has && wp && Math.hypot(wp.x - it.x, wp.z - it.z) < 3;
      const setGps = () => this._setGps(it, row);
      this._nav(row, 'item:' + it.id, has ? setGps : it.open ? () => this._go(it.open) : null, () => {});
      if (has) row._gps = setGps;
      const ic = el('span', 'ph-item-icon');
      const url = it.icon ? glyphURL(it.icon) : '';
      if (url) ic.style.backgroundImage = 'url(' + url + ')';
      else ic.append(el('span', 'ph-item-emoji', it.emoji || '•'));
      const main = el('div', 'ph-item-main');
      const top = el('div', 'ph-item-top');
      top.append(el('span', 'ph-item-title', it.title));
      if (has) top.append(el('span', 'ph-item-dist', distText(it.d) + ' ' + it.dir));
      main.append(top);
      const sub = el('div', 'ph-item-sub');
      if (it.tag) sub.append(el('span', 'ph-tag', it.tag));
      if (it.pay) sub.append(el('b', 'ph-item-pay', it.pay));
      sub.append(el('span', 'ph-item-how', it.how || ''));
      main.append(sub);
      row.append(ic, main);

      // Opens up when highlighted: the whole story, the hot list, and the GPS button.
      const more = el('div', 'ph-more');
      const inner = el('div', 'ph-more-in');
      inner.append(el('p', 'ph-item-full', it.how || ''));
      if (it.hot && it.hot.length) {
        inner.append(el('div', 'ph-kicker', 'Today\'s hot list · 2.5x'));
        const hl = el('div', 'ph-hot');
        for (const h of it.hot) {
          const c = el('span', 'ph-hot-car' + (h.sold ? ' is-sold' : ''));
          c.append(el('b', '', h.name || h.type), el('span', '', h.sold ? 'Sold' : money(h.price || 0)));
          hl.append(c);
        }
        inner.append(hl);
      }
      if (has || it.open) {
        const go = el('button', 'ph-go' + (isWp ? ' is-set' : ''));
        go.type = 'button';
        go.tabIndex = -1;
        go.dataset.click = '';
        go._click = has ? setGps : () => this._go(it.open);
        if (has) go.append(svg(isWp ? 'check' : 'pin'));
        go.append(el('span', '', has ? (isWp ? 'GPS set' : 'Set GPS') : it.go || 'Open'));
        inner.append(go);
      }
      more.append(inner);
      row.append(more);
      return row;
    }

    _setGps(it, row) {
      const g = this.game;
      if (typeof it.x !== 'number' || !g.setWaypoint) return;
      g.setWaypoint({ x: it.x, z: it.z, name: it.gps || it.title });
      this._toast('GPS set: ' + (it.gps || it.title), true);
      // Only one row carries the tick.
      for (const b of this.appEl.querySelectorAll('.ph-go.is-set')) {
        b.classList.remove('is-set');
        const lab = b.querySelector('span:last-child');
        if (lab && lab.textContent === 'GPS set') lab.textContent = 'Set GPS';
        const ic = b.querySelector('.ph-svg');
        if (ic) ic.replaceWith(svg('pin'));
      }
      const go = row && row.querySelector('.ph-go');
      if (go) {
        go.classList.add('is-set');
        go.textContent = '';
        go.append(svg('check'), el('span', '', 'GPS set'));
      }
    }

    // --------------------------------------------------------------- Bank
    _resetBank(all) {
      this.session = {};
      this.sessionSpent = 0;
      if (all) {
        this.allTime = {};
        this.allSpent = 0;
      }
      this._lastMoney = null; // the next look sets the baseline
      this._evSum = 0;
      this._lastBiz = null;
    }

    /** money:changed: who paid (the reason), or what it went on. */
    _onMoney(e) {
      const d = e && typeof e.delta === 'number' ? e.delta : 0;
      if (!d) return;
      this._evSum += d;
      if (d > 0) this._credit(this._source(e.reason), d);
      else this._debit(-d);
    }

    _source(reason) {
      if (reason === 'job') {
        const run = this.game.missions && this.game.missions.run;
        const m = (run && run.m) || this._lastJob;
        if (!m) return 'story';
        if (m.giver === 'race' || /^race_/.test(m.id || '')) return 'races';
        return m._main ? 'story' : 'side';
      }
      if (REASONS[reason]) return REASONS[reason];
      return 'other';
    }

    _credit(src, n) {
      this.session[src] = (this.session[src] || 0) + n;
      this.allTime[src] = (this.allTime[src] || 0) + n;
    }

    _debit(n) {
      this.sessionSpent += n;
      this.allSpent += n;
    }

    /**
     * Money that moved without an event (business paydays, the hospital's
     * bill, shop counters): the difference from what the events explain.
     */
    _pollMoney() {
      const g = this.game;
      if (!g.player) return;
      const m = g.player.money;
      const P = g.properties;
      const pe = P && typeof P.earned === 'number' ? P.earned : null;
      if (this._lastMoney === null) {
        this._lastMoney = m;
        this._evSum = 0;
        this._lastBiz = pe;
        return;
      }
      const diff = m - this._lastMoney - this._evSum;
      this._lastMoney = m;
      this._evSum = 0;
      let biz = 0;
      if (pe !== null) {
        biz = Math.max(0, pe - (this._lastBiz === null ? pe : this._lastBiz));
        this._lastBiz = pe;
      }
      if (diff > 0) {
        const b = Math.min(diff, biz);
        if (b > 0) this._credit('business', b);
        if (diff - b > 0) this._credit('other', diff - b);
      } else if (diff < 0) this._debit(-diff);
    }

    _appBank(box) {
      const g = this.game;
      this._pollMoney();
      box.append(this._head('Bank'));
      const s = el('div', 'ph-scroll');
      box.append(s);
      const cash = g.player.money;
      const P = g.properties;
      const owned = P && P.list ? P.list.filter((q) => P.owned && P.owned[q.id]) : [];
      const worthOf = (q) => {
        const v = safe(() => (P.value ? P.value(q) : null), null);
        return typeof v === 'number' ? v : q.price || 0;
      };
      const estate = owned.reduce((a, q) => a + worthOf(q), 0);

      const card = el('div', 'ph-card ph-balance');
      card.append(el('div', 'ph-kicker', 'Cash in hand'));
      card.append(el('div', 'ph-balance-num', money(cash)));
      const nw = el('div', 'ph-balance-worth');
      nw.append(el('span', '', 'Net worth'), el('b', '', money(cash + estate)));
      card.append(nw);
      if (owned.length) card.append(el('div', 'ph-balance-note', 'Includes ' + owned.length + (owned.length === 1 ? ' business' : ' businesses') + ' worth ' + money(estate)));
      card.append(el('i', 'ph-balance-chip'));
      s.append(card);

      const tabs = el('div', 'ph-tabs');
      for (const [all, label] of [[false, 'This session'], [true, 'All time']]) {
        const t = el('div', 'ph-tab' + (this._bankAll === all ? ' is-on' : ''));
        this._nav(t, 'bank:' + all, () => {
          this._bankAll = all;
          this._renderApp(true);
        });
        t.append(el('span', '', label));
        tabs.append(t);
      }
      s.append(tabs);

      const book = this._bankAll ? this.allTime : this.session;
      const spent = this._bankAll ? this.allSpent : this.sessionSpent;
      const rows = SOURCES.map(([id, label, colour]) => ({ id, label, colour, n: Math.round(book[id] || 0) })).filter((r) => r.n > 0).sort((a, b) => b.n - a.n);
      const total = rows.reduce((a, r) => a + r.n, 0);
      const sum = el('div', 'ph-earned');
      sum.append(el('span', '', 'Money in'), el('b', 'ph-money', money(total)));
      s.append(sum);
      if (rows.length) {
        // A stacked strip of where it came from, then each source.
        const strip = el('div', 'ph-strip');
        for (const r of rows) {
          const seg = el('i');
          seg.style.width = ((r.n / total) * 100).toFixed(2) + '%';
          seg.style.background = r.colour;
          strip.append(seg);
        }
        s.append(strip);
        const list = el('div', 'ph-list ph-sources');
        const topN = rows[0].n;
        for (const r of rows) {
          const row = el('div', 'ph-src');
          this._nav(row, 'src:' + r.id);
          const dot = el('i', 'ph-src-dot');
          dot.style.background = r.colour;
          const bar = el('span', 'ph-src-bar');
          const f = el('i');
          f.style.width = Math.max(3, (r.n / topN) * 100).toFixed(1) + '%';
          f.style.background = r.colour;
          bar.append(f);
          const name = el('span', 'ph-src-name');
          name.append(dot, el('span', '', r.label));
          row.append(name, el('b', 'ph-src-n', money(r.n)), bar);
          list.append(row);
        }
        s.append(list);
      } else {
        s.append(el('div', 'ph-empty', this._bankAll ? 'Nothing earned yet.' : 'Nothing earned yet this session. The Jobs app has plenty going.'));
      }
      if (spent > 0) {
        const sp = el('div', 'ph-spent');
        const what = el('span', '');
        what.append(el('span', '', 'Money out'), el('small', '', 'shops, guns, businesses, bills'));
        sp.append(what, el('b', '', '−' + money(spent)));
        s.append(sp);
      }

      // The businesses.
      if (P && P.list && P.list.length) {
        const c = el('div', 'ph-card ph-biz');
        this._nav(c, 'bank:biz', () => {
          this._filter = 'buy';
          this._go('jobs');
        });
        c.append(el('div', 'ph-kicker', 'Businesses · ' + owned.length + ' of ' + P.list.length + ' owned'));
        if (owned.length) {
          const pay = safe(() => P.income(), 0) || 0;
          const r = el('div', 'ph-biz-row');
          r.append(el('span', '', 'Each payday'), el('b', 'ph-money', money(pay)));
          c.append(r);
          const t = this._payday();
          if (t !== null) {
            const r2 = el('div', 'ph-biz-row');
            r2.append(el('span', '', 'Next payday in'), el('b', '', this._dur(t)));
            c.append(r2);
          }
          if (typeof P.earned === 'number') {
            const r3 = el('div', 'ph-biz-row');
            r3.append(el('span', '', 'Takings so far'), el('b', '', money(P.earned)));
            c.append(r3);
          }
        } else {
          const cheapest = P.list.reduce((a, q) => (!a || q.price < a.price ? q : a), null);
          c.append(el('p', '', 'Buy a business and it pays out every payday, wherever you are.' + (cheapest ? ' The cheapest is ' + cheapest.name + ' at ' + money(cheapest.price) + '.' : '')));
        }
        c.append(el('span', 'ph-link', 'Businesses for sale ›'));
        s.append(c);
      }
    }

    // ----------------------------------------------------------- Messages
    _logText(from, message) {
      const g = this.game;
      const c = (g.dialogue && g.dialogue.cast && g.dialogue.cast[from]) || null;
      const name = c ? c.fullName || c.name || from : String(from || 'Unknown');
      this.texts.push({ from: String(from || ''), name, text: String(message || ''), at: Math.round(g.playTime || 0), clock: safe(() => g.environment.clockText(), '') });
      if (this.texts.length > MAX_TEXTS) {
        const cut = this.texts.length - MAX_TEXTS;
        this.texts.splice(0, cut);
        this.readTexts = Math.max(0, this.readTexts - cut);
      }
      if (this.isOpen && (this.view === 'messages' || this.view === 'thread')) this._renderApp(true);
    }

    _clean(text) {
      const d = this.game.dialogue;
      return safe(() => (d && d._clean ? d._clean(text, false) : text), text);
    }

    _avatar(from, name) {
      const g = this.game;
      const c = (g.dialogue && g.dialogue.cast && g.dialogue.cast[from]) || {};
      const a = el('span', 'ph-avatar', (name || '?').replace(/^[^A-Za-z]*/, '').charAt(0).toUpperCase() || '?');
      if (c.color) a.style.setProperty('--av', c.color);
      return a;
    }

    _appMessages(box) {
      this.readTexts = this.texts.length;
      box.append(this._head('Messages'));
      const s = el('div', 'ph-scroll');
      box.append(s);
      if (!this.texts.length) {
        const c = el('div', 'ph-card ph-soon');
        c.append(el('div', 'ph-soon-icon', '✉'), el('b', '', 'No messages yet'), el('p', '', 'Texts from the people Jay knows land here.'));
        s.append(c);
        return;
      }
      // One row per person, the latest first.
      const seen = new Map();
      for (let i = this.texts.length - 1; i >= 0; i--) {
        const t = this.texts[i];
        const k = t.from || t.name;
        if (!seen.has(k)) seen.set(k, { t, n: 0 });
        seen.get(k).n++;
      }
      const list = el('div', 'ph-list ph-threads');
      for (const [k, { t, n }] of seen) {
        const r = el('div', 'ph-thread');
        this._nav(r, 'thread:' + k, () => this._openThread(k));
        const body = el('div', 'ph-thread-main');
        const top = el('div', 'ph-thread-top');
        top.append(el('b', '', t.name), el('span', 'ph-thread-time', t.clock || ''));
        body.append(top, el('div', 'ph-thread-text', this._clean(t.text)));
        r.append(this._avatar(t.from, t.name), body);
        if (n > 1) r.append(el('span', 'ph-thread-n', String(n)));
        list.append(r);
      }
      s.append(list);
    }

    _appThread(box) {
      const k = this._thread;
      const msgs = this.texts.filter((t) => (t.from || t.name) === k);
      const name = msgs.length ? msgs[msgs.length - 1].name : 'Messages';
      box.append(this._head(name));
      const s = el('div', 'ph-scroll ph-chat');
      box.append(s);
      if (msgs.length) s.append(this._avatar(msgs[0].from, name), el('div', 'ph-chat-who', 'Text message'));
      for (const t of msgs) {
        const b = el('div', 'ph-bubble');
        b.append(el('p', '', this._clean(t.text)), el('span', 'ph-bubble-time', t.clock || ''));
        s.append(b);
      }
      // Jay doesn't text back (he's driving).
      const bar = el('div', 'ph-compose');
      bar.append(el('span', '', 'Jay never texts back'), svg('chat'));
      box.append(bar);
      // The newest at the bottom, in view.
      setTimeout(() => {
        s.scrollTop = s.scrollHeight;
      }, 0);
    }

    // ------------------------------------------------------------ system
    /** Fixed step while playing: keep the money ledger in step (paydays and bills raise no event). */
    update() {
      this._pollMoney();
    }

    stats() {
      const all = Object.keys(this.allTime).reduce((a, k) => a + this.allTime[k], 0);
      if (!all) return [];
      let best = null;
      for (const [id, label] of SOURCES) if (this.allTime[id] && (!best || this.allTime[id] > this.allTime[best[0]])) best = [id, label];
      return best ? [['Best earner', best[1] + ' (' + money(this.allTime[best[0]]) + ')']] : [];
    }

    serialize() {
      const round = (o) => {
        const r = {};
        for (const k of Object.keys(o)) if (o[k] > 0) r[k] = Math.round(o[k]);
        return r;
      };
      return { bank: round(this.allTime), spent: Math.round(this.allSpent), texts: this.texts.slice(-MAX_TEXTS), read: this.readTexts };
    }

    load(d) {
      this.close(true);
      this._resetBank(true);
      this.texts = [];
      this.readTexts = 0;
      this._stashD = null;
      this._lastJob = null;
      if (d && d.bank && typeof d.bank === 'object') {
        for (const [id] of SOURCES) if (typeof d.bank[id] === 'number' && d.bank[id] > 0) this.allTime[id] = d.bank[id];
        this.allSpent = typeof d.spent === 'number' ? d.spent : 0;
      } else this._seedBank();
      if (d && Array.isArray(d.texts)) {
        this.texts = d.texts.filter((t) => t && typeof t.text === 'string').slice(-MAX_TEXTS);
        this.readTexts = clamp(d.read | 0, 0, this.texts.length);
      }
    }

    /** A save from before the phone: start the all-time book from what the other systems counted. */
    _seedBank() {
      const g = this.game;
      const put = (id, n) => {
        if (typeof n === 'number' && n > 0) this.allTime[id] = Math.round(n);
      };
      put('chop', safe(() => g.chopShops.earned, 0));
      put('business', safe(() => g.properties.earned, 0));
      put('taxi', safe(() => g.activities.taxi.earned, 0));
      put('holdup', safe(() => g.stores.cash, 0));
      put('oddjob', safe(() => g.oddJobs.jobs().reduce((a, j) => a + (j.earned || 0), 0), 0));
    }

    reset() {
      this.close(true);
      this._resetBank(true);
      this.texts = [];
      this.readTexts = 0;
      this._stashD = null;
      this._lastJob = null;
      this._filter = 'all';
      this._bankAll = false;
    }

    stop() {
      this.close(true);
    }
  }

  VH.Phone = Phone;
})();
