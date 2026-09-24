/*
 * hud.js — the in-game heads-up display.
 *
 *   top right     money (with +/- change flashes); wanted stars (Phase 8)
 *   bottom left   location (place · street · district), health and armour
 *   centre        crosshair while aiming, interaction prompt
 *   top left      notifications, FPS counter
 *   right         the "Getting started" checklist (the Phase 1 tutorial)
 *   full screen   fades, and the knocked-out overlay
 *
 * DOM writes only happen when a value actually changes, so the HUD costs
 * almost nothing per frame.
 */
(function () {
  'use strict';

  const VH = window.VH;
  const el = (tag, cls, text) => VH.util.el(tag, cls, text);

  const CHECKLIST = [
    { id: 'move', label: 'Walk around', keys: ['moveForward', 'moveLeft', 'moveBack', 'moveRight'] },
    { id: 'look', label: 'Look around', keysText: 'Mouse' },
    { id: 'sprint', label: 'Sprint', keys: ['sprint'] },
    { id: 'jump', label: 'Jump', keys: ['jump'] },
    { id: 'climb', label: 'Climb a crate or vault a wall', keys: ['jump'], note: 'NE corner of the plaza' },
    { id: 'crouch', label: 'Crouch', keys: ['crouch'] },
    { id: 'aim', label: 'Raise your guard (aim)', keys: ['aim'] },
    { id: 'camera', label: 'Change camera', keys: ['camera'], extra: 'Wheel to zoom' },
    { id: 'interact', label: 'Use a vending machine or the city guide', keys: ['interact'] },
  ];

  class HUD {
    constructor(root, input, settings) {
      this.input = input;
      this.settings = settings;
      this.root = root;
      this._cache = {};
      this._lastMoney = null;
      this._notifyQueue = [];
      this.checklist = {};
      this._build();
      this._bindEvents();
    }

    _build() {
      const r = this.root;
      r.className = 'hud';

      // Top right: money and (later) wanted level.
      const tr = el('div', 'hud-top-right');
      this.moneyEl = el('div', 'hud-money');
      this.moneyValue = el('span', 'money-value', '$0');
      this.moneyDelta = el('span', 'money-delta');
      this.moneyEl.append(this.moneyValue, this.moneyDelta);
      this.wantedEl = el('div', 'hud-wanted');
      this.wantedEl.hidden = true;
      tr.append(this.moneyEl, this.wantedEl);

      // Bottom left: location and vitals.
      const bl = el('div', 'hud-bottom-left');
      this.locPlace = el('div', 'loc-place');
      this.locSub = el('div', 'loc-sub');
      const loc = el('div', 'hud-location');
      loc.append(this.locPlace, this.locSub);
      const bars = el('div', 'hud-bars');
      this.healthFill = el('div', 'fill');
      this.armorFill = el('div', 'fill');
      const health = el('div', 'bar bar-health');
      const hIcon = el('span', 'bar-icon', '✚');
      const hTrack = el('div', 'bar-track');
      hTrack.append(this.healthFill);
      health.append(hIcon, hTrack);
      const armor = el('div', 'bar bar-armor');
      const aIcon = el('span', 'bar-icon', '⛨');
      const aTrack = el('div', 'bar-track');
      aTrack.append(this.armorFill);
      armor.append(aIcon, aTrack);
      this.healthBar = health;
      this.armorBar = armor;
      bars.append(health, armor);
      bl.append(loc, bars);

      // Centre.
      this.crosshair = el('div', 'hud-crosshair');
      this.crosshair.append(el('i'), el('i'), el('i'), el('i'));
      this.prompt = el('div', 'hud-prompt');
      this.promptKey = el('kbd', '', 'E');
      this.promptLabel = el('span', 'prompt-label');
      this.promptPrice = el('span', 'prompt-price');
      this.prompt.append(this.promptKey, this.promptLabel, this.promptPrice);
      this.lockHint = el('div', 'hud-lock-hint', 'Click to capture the mouse');

      // Top left.
      this.fpsEl = el('div', 'hud-fps');
      this.notifyStack = el('div', 'hud-notify-stack');

      // District banner.
      this.banner = el('div', 'hud-banner');
      this.bannerTitle = el('div', 'banner-title');
      this.bannerSub = el('div', 'banner-sub');
      this.banner.append(this.bannerTitle, this.bannerSub);

      // Toast for camera mode etc.
      this.toast = el('div', 'hud-toast');

      // Getting-started checklist.
      this.hints = el('div', 'hud-hints');
      const hh = el('div', 'hints-title', 'Getting started');
      this.hintsList = el('ul', 'hints-list');
      this.hints.append(hh, this.hintsList);
      this._buildChecklist();

      // Knocked-out overlay and fades.
      this.knockout = el('div', 'hud-knockout');
      this.knockout.append(el('h2', '', 'Knocked out'), el('p', '', 'You come to a few moments later…'));
      this.fade = el('div', 'hud-fade');

      r.append(tr, bl, this.crosshair, this.prompt, this.lockHint, this.fpsEl, this.notifyStack, this.banner, this.toast, this.hints, this.knockout, this.fade);
    }

    _buildChecklist() {
      this.hintsList.innerHTML = '';
      this.hintItems = {};
      for (const item of CHECKLIST) {
        const li = el('li', 'hint');
        const box = el('span', 'hint-box');
        const text = el('span', 'hint-text', item.label);
        const keys = el('span', 'hint-keys');
        const labels = item.keysText ? [item.keysText] : item.keys.map((k) => this.input.labelFor(k));
        const unique = [...new Set(labels)];
        keys.textContent = unique.join(' ') + (item.extra ? ' · ' + item.extra : '');
        li.append(box, text, keys);
        if (item.note) li.append(el('span', 'hint-note', item.note));
        if (this.checklist[item.id]) li.classList.add('done');
        this.hintsList.append(li);
        this.hintItems[item.id] = li;
      }
    }

    _bindEvents() {
      VH.events.on('notify', (n) => this.notify(n));
      VH.events.on('money:changed', (e) => this._flashMoney(e.delta));
      VH.events.on('interaction:focus', (e) => this._setPrompt(e.item));
      VH.events.on('camera:mode', (e) => {
        this.showToast('Camera: ' + e.mode.label);
        this.tick('camera');
      });
      VH.events.on('player:jump', () => this.tick('jump'));
      VH.events.on('player:climb', () => this.tick('climb'));
      VH.events.on('interaction:used', () => this.tick('interact'));
      VH.events.on('settings:changed', (e) => {
        if (e.path === 'controls.bindings' || e.path === '*') this._buildChecklist();
        if (e.path === 'gameplay.showHints' || e.path === '*') this._applyHintVisibility();
      });
    }

    // --------------------------------------------------------- per frame
    /** state = { player, camera, district, place, road, fps, locked, playing } */
    update(dt, s) {
      const p = s.player;
      this._set('money', p.money, (v) => {
        this.moneyValue.textContent = VH.util.formatMoney(v);
      });
      this._set('health', Math.round(p.health), (v) => {
        this.healthFill.style.width = Math.max(0, (v / p.maxHealth) * 100) + '%';
        this.healthBar.classList.toggle('low', v < 25);
      });
      this._set('armor', Math.round(p.armor), (v) => {
        this.armorFill.style.width = Math.max(0, (v / p.maxArmor) * 100) + '%';
        this.armorBar.classList.toggle('empty', v <= 0);
      });
      this._set('crosshair', p.aimAmount > 0.6 && !p.isDead, (v) => this.crosshair.classList.toggle('visible', v));
      this._set('lockHint', s.playing && !s.locked && VH.features.pointerLock, (v) => this.lockHint.classList.toggle('visible', v));
      this._set('knockout', p.isDead, (v) => this.knockout.classList.toggle('visible', v));

      const placeLine = s.place || (s.road ? s.road : s.district.name);
      const subLine = s.place ? [s.road, s.district.name].filter(Boolean).join(' · ') : s.road ? s.district.name : s.district.tagline;
      this._set('place', placeLine, (v) => {
        this.locPlace.textContent = v;
      });
      this._set('sub', subLine, (v) => {
        this.locSub.textContent = v;
      });
      if (this._lastDistrict !== s.district.id) {
        if (this._lastDistrict !== undefined) this.showBanner(s.district.name, s.district.tagline);
        this._lastDistrict = s.district.id;
      }

      const showFps = this.settings.get('graphics.showFps');
      this._set('fpsVisible', showFps, (v) => this.fpsEl.classList.toggle('visible', v));
      if (showFps) this._set('fps', s.fps, (v) => {
        this.fpsEl.textContent = v + ' FPS';
        this.fpsEl.classList.toggle('warn', v < 45);
        this.fpsEl.classList.toggle('bad', v < 25);
      });

      // Checklist items that are detected by polling.
      if (p.speed > 0.5 && p.grounded) this.tick('move');
      if (p.sprinting && p.speed > 5.5) this.tick('sprint');
      if (p.crouched) this.tick('crouch');
      if (p.aiming) this.tick('aim');
      if (s.lookedAround) this.tick('look');
    }

    _set(key, value, apply) {
      if (this._cache[key] === value) return;
      this._cache[key] = value;
      apply(value);
    }

    // ---------------------------------------------------------- elements
    _setPrompt(item) {
      if (!item) {
        this.prompt.classList.remove('visible');
        return;
      }
      this.promptKey.textContent = this.input.labelFor('interact');
      this.promptLabel.textContent = item.label;
      this.promptPrice.textContent = item.price ? VH.util.formatMoney(item.price) : '';
      this.prompt.classList.add('visible');
    }

    _flashMoney(delta) {
      if (!delta) return;
      this.moneyDelta.textContent = (delta > 0 ? '+' : '−') + VH.util.formatMoney(Math.abs(delta));
      this.moneyDelta.className = 'money-delta show ' + (delta > 0 ? 'gain' : 'loss');
      clearTimeout(this._moneyTimer);
      this._moneyTimer = setTimeout(() => {
        this.moneyDelta.className = 'money-delta';
      }, 1800);
    }

    notify(n) {
      const card = el('div', 'notify' + (n.tone ? ' ' + n.tone : ''));
      if (n.icon) card.append(el('div', 'notify-icon', n.icon));
      const body = el('div', 'notify-body');
      if (n.title) body.append(el('div', 'notify-title', n.title));
      if (n.text) body.append(el('div', 'notify-text', n.text));
      card.append(body);
      this.notifyStack.prepend(card);
      while (this.notifyStack.children.length > 4) this.notifyStack.lastChild.remove();
      requestAnimationFrame(() => card.classList.add('in'));
      setTimeout(() => {
        card.classList.remove('in');
        card.classList.add('out');
        setTimeout(() => card.remove(), 400);
      }, n.duration || 4200);
    }

    showBanner(title, sub) {
      this.bannerTitle.textContent = title;
      this.bannerSub.textContent = sub || '';
      this.banner.classList.remove('visible');
      void this.banner.offsetWidth; // restart the animation
      this.banner.classList.add('visible');
      clearTimeout(this._bannerTimer);
      this._bannerTimer = setTimeout(() => this.banner.classList.remove('visible'), 3800);
    }

    showToast(text) {
      this.toast.textContent = text;
      this.toast.classList.add('visible');
      clearTimeout(this._toastTimer);
      this._toastTimer = setTimeout(() => this.toast.classList.remove('visible'), 1500);
    }

    tick(id) {
      if (this.checklist[id]) return;
      this.checklist[id] = true;
      const li = this.hintItems[id];
      if (li) li.classList.add('done');
      const all = CHECKLIST.every((c) => this.checklist[c.id]);
      if (all && !this._allDone) {
        this._allDone = true;
        this.notify({ title: 'You\'ve got the basics', text: 'Vicehaven is yours to explore. Try the pier at the end of Meridian Boulevard.', icon: '★', duration: 6000 });
        setTimeout(() => this.hints.classList.add('complete'), 2500);
      }
    }

    _applyHintVisibility() {
      this.hints.classList.toggle('hidden-by-setting', !this.settings.get('gameplay.showHints'));
    }

    resetChecklist() {
      this.checklist = {};
      this._allDone = false;
      this.hints.classList.remove('complete');
      this._buildChecklist();
      this._applyHintVisibility();
    }

    setFade(opacity, ms) {
      this.fade.style.transitionDuration = (ms === undefined ? 600 : ms) + 'ms';
      this.fade.style.opacity = String(opacity);
    }

    show(v) {
      this.root.classList.toggle('visible', v);
    }
  }

  VH.HUD = HUD;
})();
