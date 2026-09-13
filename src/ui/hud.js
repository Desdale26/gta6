// hud.js — the heads-up display: radar, vitals, weapon, objective, toasts and subtitles.
import * as THREE from 'three';
import { clamp, lerp, damp, formatMoney, formatTime } from '../core/mathx.js';
import { buildWeaponModel } from '../combat/weapons.js';

const HP_DASH = 289;
const AP_DASH = 261;

export class HUD {
  constructor(ctx) {
    this.ctx = ctx;
    this.root = document.getElementById('hud');
    this.el = {
      wanted: document.getElementById('wanted'),
      cash: document.getElementById('cash'),
      cashDelta: document.getElementById('cashDelta'),
      clock: document.getElementById('clock'),
      areaName: document.getElementById('areaName'),
      radio: document.getElementById('radioBox'),
      radioStation: document.getElementById('radioStation'),
      radioTrack: document.getElementById('radioTrack'),
      fps: document.getElementById('fps'),
      objective: document.getElementById('objectivePanel'),
      objTitle: document.getElementById('objTitle'),
      objText: document.getElementById('objText'),
      objMeta: document.getElementById('objMeta'),
      minimap: document.getElementById('minimap'),
      hpArc: document.getElementById('hpArc'),
      apArc: document.getElementById('apArc'),
      vehPanel: document.getElementById('vehiclePanel'),
      vehTyres: document.getElementById('vehTyres'),
      tyreCanvas: document.getElementById('tyreCanvas'),
      tyreTemp: document.getElementById('tyreTemp'),
      brakeTemp: document.getElementById('brakeTemp'),
      vehName: document.getElementById('vehName'),
      spFill: document.getElementById('spFill'),
      spRedline: document.getElementById('spRedline'),
      speedVal: document.getElementById('speedVal'),
      gearVal: document.getElementById('gearVal'),
      vehHp: document.getElementById('vehHp'),
      vehFuel: document.getElementById('vehFuel'),
      vehNitro: document.getElementById('vehNitro'),
      weaponPanel: document.getElementById('weaponPanel'),
      weaponIcon: document.getElementById('weaponIcon'),
      ammoMag: document.getElementById('ammoMag'),
      ammoRes: document.getElementById('ammoRes'),
      ammoWrap: document.querySelector('.ammo'),
      weaponName: document.getElementById('weaponName'),
      crosshair: document.getElementById('crosshair'),
      hitmarker: document.getElementById('hitmarker'),
      prompt: document.getElementById('prompt'),
      notifications: document.getElementById('notifications'),
      subtitle: document.getElementById('subtitle'),
      combo: document.getElementById('comboPanel'),
      comboScore: document.getElementById('comboScore'),
      comboTricks: document.getElementById('comboTricks'),
      comboBar: document.getElementById('comboBar'),
      bigText: document.getElementById('bigText'),
      damageVig: document.getElementById('damageVignette'),
      scope: document.getElementById('scopeOverlay'),
      death: document.getElementById('deathOverlay'),
      deathTitle: document.getElementById('deathTitle'),
      deathSub: document.getElementById('deathSub'),
    };

    this.minimap = new Minimap(ctx, this.el.minimap);
    this.toasts = [];
    this.bigTimer = 0;
    this.subtitleTimer = 0;
    this.displayCash = 0;
    this.lastArea = '';
    this.areaTimer = 0;
    this.weaponIconCache = new Map();
    this._weaponRenderer = null;
    this._lastWeaponId = null;
    this._hpShown = -1;
    this._apShown = -1;
    this._cashShown = -1;
    this.hitmarkerTimer = 0;
    this.damageFlash = 0;

    this._wire();
    this._buildWantedStars();
  }

  _wire() {
    const bus = this.ctx.bus;
    bus.on('money:changed', (e) => this._onMoney(e));
    bus.on('combat:hit', (e) => { if (e.source === this.ctx.player) this.hitmarker(e.killed); });
    bus.on('player:damaged', (e) => { this.damageFlash = Math.min(1, this.damageFlash + e.amount / 45); });
    bus.on('ped:bark', (e) => { if (e.kind === 'panic' || e.kind === 'angry') this.subtitle(null, e.text, 2.2, true); });
    bus.on('weather:changed', (e) => this.toast('Weather', e.label, 'info'));
    bus.on('wanted:changed', (e) => { if (e.up) this.toast('Wanted', `${e.stars} star${e.stars > 1 ? 's' : ''}`, 'bad'); });
  }

  _buildWantedStars() {
    const w = this.el.wanted;
    w.innerHTML = '';
    for (let i = 0; i < 5; i++) w.appendChild(document.createElement('i'));
    this.starEls = [...w.children];
  }

  show() { this.root.classList.remove('hidden'); }
  hide() { this.root.classList.add('hidden'); }

  // -------------------------------------------------------------------------
  update(dt) {
    const ctx = this.ctx;
    const player = ctx.player;
    if (!player) return;

    this._updateVitals(dt, player);
    this._updateWanted();
    this._updateMoney(dt);
    this._updateClock();
    this._updateArea(dt);
    this._updateVehicle(dt, player);
    this._updateWeapon(player);
    this._updateCrosshair(player);
    this._updateObjective();
    this._updatePrompt();
    this._updateRadio();
    this._updateCombo(dt);
    this._updateToasts(dt);
    this._updateOverlays(dt, player);
    this.minimap.update(dt);

    if (ctx.settings.get('showFps')) {
      this.el.fps.classList.remove('hidden');
      const s = ctx.renderer.stats();
      this.el.fps.textContent =
        `${s.fps} fps  ${s.ms}ms\n${s.calls} calls  ${(s.tris / 1000).toFixed(0)}k tris\n` +
        `peds ${ctx.peds?.count ?? 0}  cars ${ctx.traffic?.count ?? 0}  res ${s.resScale}`;
    } else if (!this.el.fps.classList.contains('hidden')) {
      this.el.fps.classList.add('hidden');
    }
  }

  _updateVitals(dt, player) {
    const hp = clamp(player.health / player.maxHealth, 0, 1);
    const ap = clamp(player.armor / player.maxArmor, 0, 1);
    if (Math.abs(hp - this._hpShown) > 0.002) {
      this._hpShown = hp;
      this.el.hpArc.style.strokeDashoffset = String(HP_DASH * (1 - hp));
    }
    if (Math.abs(ap - this._apShown) > 0.002) {
      this._apShown = ap;
      this.el.apArc.style.strokeDashoffset = String(AP_DASH * (1 - ap));
      this.el.apArc.style.opacity = ap > 0.001 ? '1' : '0';
    }
    this.damageFlash = Math.max(0, this.damageFlash - dt * 1.6);
    const lowHp = hp < 0.3 ? (0.3 - hp) / 0.3 : 0;
    const vig = Math.max(this.damageFlash, lowHp * (0.55 + Math.sin(this.ctx.time.elapsed * 4) * 0.12));
    this.el.damageVig.style.opacity = String(clamp(vig, 0, 0.95));
  }

  _updateWanted() {
    const stars = this.ctx.police ? this.ctx.police.stars : 0;
    for (let i = 0; i < 5; i++) {
      const on = i < stars;
      if (this.starEls[i].classList.contains('on') !== on) this.starEls[i].classList.toggle('on', on);
    }
    const searching = this.ctx.police?.searching && stars > 0;
    this.el.wanted.classList.toggle('flash', !!searching);
  }

  _onMoney(e) {
    const el = this.el.cashDelta;
    el.textContent = (e.delta > 0 ? '+' : '') + formatMoney(e.delta);
    el.className = 'cash-delta ' + (e.delta > 0 ? 'up' : 'down');
    clearTimeout(this._cashTimeout);
    this._cashTimeout = setTimeout(() => { el.className = 'cash-delta'; }, 1800);
  }

  _updateMoney(dt) {
    const target = this.ctx.economy.cash;
    this.displayCash = Math.abs(target - this.displayCash) < 2 ? target : damp(this.displayCash, target, 9, dt);
    const shown = Math.round(this.displayCash);
    if (shown !== this._cashShown) {
      this._cashShown = shown;
      this.el.cash.textContent = formatMoney(shown);
    }
  }

  _updateClock() {
    const t = this.ctx.time;
    const s = formatTime(t.hour * 60);
    if (s !== this._clockShown) { this._clockShown = s; this.el.clock.textContent = s; }
  }

  _updateArea(dt) {
    const p = this.ctx.player.position;
    const d = this.ctx.world?.districts?.districtAt(p.x, p.z);
    const name = d ? d.name : '';
    if (name && name !== this.lastArea) {
      this.lastArea = name;
      this.el.areaName.textContent = name;
      this.el.areaName.classList.add('show');
      this.areaTimer = 3.5;
    }
    if (this.areaTimer > 0) {
      this.areaTimer -= dt;
      if (this.areaTimer <= 0) this.el.areaName.classList.remove('show');
    }
  }

  _updateVehicle(dt, player) {
    const v = player.vehicle;
    const show = !!v;
    if (this.el.vehPanel.classList.contains('hidden') === show) {
      this.el.vehPanel.classList.toggle('hidden', !show);
    }
    if (!show) return;
    const sim = v.sim;
    if (this._vehNameShown !== v.def.name) {
      this._vehNameShown = v.def.name;
      this.el.vehName.textContent = v.def.name;
    }
    const mph = Math.round(sim.mph);
    if (mph !== this._mphShown) { this._mphShown = mph; this.el.speedVal.textContent = String(mph); }
    const rpmN = clamp(sim.rpmNormalized, 0, 1);
    this.el.spFill.style.strokeDashoffset = String(157 * (1 - rpmN));
    const red = rpmN > 0.88 ? (rpmN - 0.88) / 0.12 : 0;
    this.el.spRedline.style.opacity = String(red);
    this.el.spRedline.style.strokeDashoffset = String(157 * (1 - rpmN));
    const gear = sim.gear === -1 ? 'R' : sim.gear === 0 ? 'N' : String(sim.gear);
    if (gear !== this._gearShown) { this._gearShown = gear; this.el.gearVal.textContent = gear; }
    this.el.vehHp.style.width = `${clamp(sim.health / sim.maxHealth, 0, 1) * 100}%`;
    this.el.vehFuel.style.width = `${clamp(sim.fuel, 0, 1) * 100}%`;
    this.el.vehNitro.style.width = `${clamp(v.nitro ?? 0, 0, 1) * 100}%`;
    this._updateTyres(sim);
  }

  /**
   * Four corners, drawn where they sit on the car: fill is tyre temperature,
   * the inner bar is the brake disc, and the tread is eaten away as the tyre
   * wears. The whole block fades in only once the car is warm or worn enough
   * for any of it to matter, so a gentle drive never sees it.
   */
  _updateTyres(sim) {
    const c = this.el.tyreCanvas;
    if (!c || !sim.wheels || sim.wheels.length < 2) return;
    let peakT = 0, peakB = 0, peakW = 0;
    for (const w of sim.wheels) {
      if (w.temp > peakT) peakT = w.temp;
      if (w.brakeTemp > peakB) peakB = w.brakeTemp;
      if (w.wear > peakW) peakW = w.wear;
    }
    const interesting = peakT > 78 || peakB > 180 || peakW > 0.12;
    if (interesting !== this._tyresOn) {
      this._tyresOn = interesting;
      this.el.vehTyres.classList.toggle('on', interesting);
    }
    if (!interesting) return;
    // Redrawing four rounded rectangles ten times a second is plenty.
    const now = this.ctx.time ? this.ctx.time.elapsed : 0;
    if (now - (this._tyreDrawn || 0) < 0.1) return;
    this._tyreDrawn = now;

    const g = c.getContext('2d');
    g.clearRect(0, 0, c.width, c.height);
    const cols = 2;
    const rows = Math.ceil(sim.wheels.length / 2);
    const cw = c.width / cols, ch = c.height / rows;
    for (let i = 0; i < sim.wheels.length; i++) {
      const w = sim.wheels[i];
      // The sim builds wheels as [-x front, +x front, -x rear, +x rear], and a
      // vehicle's local +X is the driver's LEFT, so the even indices are the
      // right-hand pair. This is a plan view with the nose up the canvas -- the
      // rows already say front and rear -- so the car's right belongs on the
      // canvas right. `i % 2` put it on the left and mirrored the whole car:
      // a dragging left caliper lit the right of the panel.
      const col = 1 - (i % 2), row = Math.floor(i / 2);
      const x = col * cw + cw * 0.28, y = row * ch + ch * 0.18;
      const bw = cw * 0.44, bh = ch * 0.64;
      // Blue when cold, green in the window, amber then red when it goes off.
      const t = clamp((w.temp - 22) / 110, 0, 1);
      const hue = t < 0.45 ? 205 - t * 220 : 100 - (t - 0.45) * 160;
      g.fillStyle = `hsl(${Math.max(0, hue)}, 85%, ${38 + t * 14}%)`;
      g.fillRect(x, y + bh * w.wear * 0.55, bw, bh * (1 - w.wear * 0.55));
      g.fillStyle = 'rgba(255,255,255,.16)';
      g.fillRect(x, y, bw, bh * w.wear * 0.55);
      // Brake disc as a thin inner bar.
      const b = clamp((w.brakeTemp - 22) / 540, 0, 1);
      g.fillStyle = `hsl(${Math.round(40 - b * 40)}, 95%, ${28 + b * 40}%)`;
      g.fillRect(x + bw * 0.3, y + bh * 0.22, bw * 0.4, bh * 0.56 * b);
      g.strokeStyle = 'rgba(0,0,0,.55)';
      g.lineWidth = 1;
      g.strokeRect(x + 0.5, y + 0.5, bw, bh);
    }
    const tTxt = `${Math.round(peakT)}\u00b0 TYRE`;
    if (tTxt !== this._tyreTxt) { this._tyreTxt = tTxt; this.el.tyreTemp.textContent = tTxt; }
    const bTxt = `${Math.round(peakB)}\u00b0 BRAKE`;
    if (bTxt !== this._brakeTxt) { this._brakeTxt = bTxt; this.el.brakeTemp.textContent = bTxt; }
  }

  _updateWeapon(player) {
    const w = player.weapons;
    const def = w.def;
    const inVehicle = player.inVehicle;
    this.el.weaponPanel.style.opacity = inVehicle ? '0.35' : '1';
    if (def.id !== this._lastWeaponId) {
      this._lastWeaponId = def.id;
      this.el.weaponName.textContent = def.name;
      this._drawWeaponIcon(def);
    }
    const s = w.state;
    if (def.projectile === 'melee' || def.magazine === 0) {
      this.el.ammoMag.textContent = '—';
      this.el.ammoRes.textContent = '';
    } else {
      this.el.ammoMag.textContent = String(s ? s.ammoInMag : 0);
      this.el.ammoRes.textContent = String(s ? s.reserve : 0);
    }
    const low = s && def.magazine > 0 && s.ammoInMag <= Math.max(1, def.magazine * 0.25);
    this.el.ammoWrap.classList.toggle('low', !!low);
  }

  /** Draw a small silhouette of the weapon into the HUD canvas. */
  _drawWeaponIcon(def) {
    const canvas = this.el.weaponIcon;
    const g = canvas.getContext('2d');
    g.clearRect(0, 0, canvas.width, canvas.height);
    const m = def.model || {};
    const W = canvas.width, H = canvas.height;
    g.save();
    g.translate(W * 0.5, H * 0.58);
    const L = clamp((m.length || 0.3) * 190, 40, W * 0.86);
    const col = '#e8ecf2';
    g.fillStyle = col;
    g.strokeStyle = col;
    g.lineWidth = 2;
    const kind = m.kind || 'pistol';
    if (kind === 'fists') {
      g.beginPath(); g.arc(-10, 0, 10, 0, Math.PI * 2); g.arc(12, 2, 10, 0, Math.PI * 2); g.fill();
    } else if (kind === 'knife' || kind === 'katana' || kind === 'machete') {
      g.fillRect(-L * 0.5, -2, L * 0.78, 4);
      g.fillRect(L * 0.28, -5, 4, 10);
      g.fillRect(-L * 0.5, -3.5, L * 0.2, 7);
    } else if (kind === 'bat' || kind === 'crowbar' || kind === 'hammer') {
      g.fillRect(-L * 0.5, -2.5, L, 5);
      g.fillRect(L * 0.28, -6, L * 0.22, 12);
    } else if (kind === 'grenade' || kind === 'molotov') {
      g.beginPath(); g.ellipse(0, 0, 11, 15, 0, 0, Math.PI * 2); g.fill();
      g.fillRect(-3, -22, 6, 8);
    } else if (kind === 'rocket' || kind === 'minigun') {
      g.fillRect(-L * 0.5, -6, L, 12);
      g.fillRect(-L * 0.5 - 6, -9, 8, 18);
      g.fillRect(-6, 6, 10, 12);
    } else {
      // Generic firearm silhouette.
      g.fillRect(-L * 0.34, -7, L * 0.5, 12);                   // receiver
      g.fillRect(L * 0.14, -3, L * 0.42, 5);                    // barrel
      g.fillRect(-L * 0.26, 5, 10, 16);                         // grip
      if (m.mag !== false) g.fillRect(-L * 0.06, 5, 8, 14);      // magazine
      if (m.stock) g.fillRect(-L * 0.56, -5, L * 0.24, 9);       // stock
      if (m.scopeLen) g.fillRect(-L * 0.12, -13, L * 0.3, 5);    // scope
      if (m.supp) g.fillRect(L * 0.52, -5, L * 0.18, 9);         // suppressor
    }
    g.restore();
  }

  _updateCrosshair(player) {
    const show = !player.inVehicle && !player.dead
      && (player.weapons.aiming || player.weapons.def.slot !== 'fists');
    this.el.crosshair.classList.toggle('hidden', !show);
    if (!show) return;
    const spread = player.weapons.currentSpread(player.speed, !player.body.grounded);
    const px = clamp(3 + spread * 340, 2, 30);
    this.el.crosshair.style.setProperty('--spread', `${px}px`);
    // Turn red when the reticle is on something alive.
    const hostile = this._aimingAtTarget(player);
    this.el.crosshair.classList.toggle('hostile', hostile);
    const scoped = player.weapons.aiming && player.weapons.def.scope;
    this.el.scope.classList.toggle('hidden', !scoped);
    this.el.crosshair.style.opacity = scoped ? '0' : '1';
  }

  _aimingAtTarget(player) {
    if (!player.weapons.aiming) return false;
    const eye = player.eyePosition;
    const d = player.aimDirection;
    const hit = this.ctx.physics.raycast(eye.x, eye.y, eye.z, d.x, d.y, d.z, 120, 0xffff, { ignore: player });
    return !!(hit.hit && hit.entity && (hit.entity.isPed || hit.entity.isVehicle));
  }

  _updateObjective() {
    const m = this.ctx.missions ? this.ctx.missions.hudState() : null;
    if (!m) {
      if (!this.el.objective.classList.contains('hidden')) this.el.objective.classList.add('hidden');
      return;
    }
    this.el.objective.classList.remove('hidden');
    if (this._objName !== m.name) { this._objName = m.name; this.el.objTitle.textContent = m.name; }
    if (this._objText !== m.text) { this._objText = m.text; this.el.objText.textContent = m.text; }
    if (this._objMeta !== m.meta) { this._objMeta = m.meta; this.el.objMeta.textContent = m.meta; }
  }

  _updatePrompt() {
    const ctx = this.ctx;
    let text = null;
    let hold = 0;
    if (ctx.shops && ctx.shops.robbery) { text = ctx.shops.promptText(); }
    else if (ctx.missions && ctx.missions.promptText) { text = ctx.missions.promptText; }
    if (!text && ctx.shops) {
      const t = ctx.shops.promptText();
      if (t) { text = t; hold = ctx.shops.holdProgress; }
    }
    if (!text && ctx.player && !ctx.player.inVehicle && !ctx.player.dead) {
      const near = ctx.player.findNearbyVehicle();
      if (near) text = `<b>F</b> ${near.seat === 0 ? 'drive' : 'ride in'} the ${near.vehicle.def.name}`;
    }
    if (!text && ctx.player && ctx.player.inVehicle) {
      if (ctx.player.vehicle.sim.flipTimer > 0.6) text = '<b>K</b> flip the car back over';
    }
    // The bar has to be part of what decides whether to rewrite the prompt. The
    // text does not change when you start holding E, so rewriting only on a text
    // change meant the markup written while hold was still 0 -- with no bar in
    // it -- stayed put, and a robbery ran to completion with no feedback at all.
    const wantBar = hold > 0;
    if (text !== this._promptText || wantBar !== this._promptBar) {
      this._promptText = text;
      this._promptBar = wantBar;
      if (text) {
        this.el.prompt.innerHTML = text + (wantBar ? '<div class="hold-bar"><i></i></div>' : '');
        this.el.prompt.classList.remove('hidden');
      } else {
        this.el.prompt.classList.add('hidden');
      }
    }
    if (hold > 0) {
      const bar = this.el.prompt.querySelector('.hold-bar i');
      if (bar) bar.style.width = `${clamp(hold, 0, 1) * 100}%`;
    }
  }

  _updateRadio() {
    const r = this.ctx.radio;
    const show = !!(r && r.playing && this.ctx.player.inVehicle);
    this.el.radio.classList.toggle('hidden', !show);
    if (!show) return;
    const np = r.nowPlaying;
    if (!np) return;
    if (this._radioStation !== np.station) {
      this._radioStation = np.station;
      this.el.radioStation.textContent = np.station;
      this.el.radioStation.style.color = '#' + (np.color || 0xff2d95).toString(16).padStart(6, '0');
    }
    const line = np.ident ? `${np.dj}: ${np.ident}` : `${np.title} — ${np.artist}`;
    if (this._radioTrack !== line) { this._radioTrack = line; this.el.radioTrack.textContent = line; }
  }

  _updateCombo(dt) {
    const s = this.ctx.stunts;
    const show = s && s.combo.length > 0;
    this.el.combo.classList.toggle('hidden', !show);
    if (!show) return;
    const total = Math.round(s.comboScore * s.multiplier);
    this.el.comboScore.textContent = `${total.toLocaleString()}${s.multiplier > 1.05 ? ` ×${s.multiplier.toFixed(1)}` : ''}`;
    this.el.comboTricks.textContent = s.combo.slice(-4).map((c) => c.text).join(' + ');
    this.el.comboBar.style.width = `${clamp(s.comboTimer / 3.2, 0, 1) * 100}%`;
  }

  _updateOverlays(dt, player) {
    if (this.bigTimer > 0) {
      this.bigTimer -= dt;
      if (this.bigTimer <= 0) this.el.bigText.classList.add('hidden');
    }
    if (this.subtitleTimer > 0) {
      this.subtitleTimer -= dt;
      if (this.subtitleTimer <= 0) this.el.subtitle.classList.add('hidden');
    }
    if (this.hitmarkerTimer > 0) {
      this.hitmarkerTimer -= dt;
      if (this.hitmarkerTimer <= 0) this.el.hitmarker.classList.remove('show', 'kill');
    }
    const dead = player.dead;
    this.el.death.classList.toggle('hidden', !dead);
    if (dead) {
      this.el.death.classList.toggle('busted', player.busted);
      this.el.deathTitle.textContent = player.busted ? 'BUSTED' : 'WASTED';
      this.el.deathSub.textContent = player.busted
        ? 'Weapons confiscated. Bail posted.'
        : 'They will find you at the hospital.';
    }
  }

  // -------------------------------------------------------------------------
  toast(title, body, kind = 'info') {
    const el = document.createElement('div');
    el.className = `toast ${kind}`;
    el.innerHTML = `<div class="t-title">${escapeHtml(title)}</div>${body ? `<div class="t-body">${escapeHtml(body)}</div>` : ''}`;
    this.el.notifications.appendChild(el);
    this.toasts.push({ el, life: 4.5 });
    while (this.toasts.length > 5) {
      const old = this.toasts.shift();
      old.el.remove();
    }
  }
  _updateToasts(dt) {
    for (let i = this.toasts.length - 1; i >= 0; i--) {
      const t = this.toasts[i];
      t.life -= dt;
      if (t.life <= 0.45 && !t.fading) { t.fading = true; t.el.classList.add('fading'); }
      if (t.life <= 0) { t.el.remove(); this.toasts.splice(i, 1); }
    }
  }

  big(title, sub) {
    this.el.bigText.innerHTML = `${escapeHtml(title)}${sub ? `<small>${escapeHtml(sub)}</small>` : ''}`;
    this.el.bigText.classList.remove('hidden');
    // Restart the entrance animation.
    this.el.bigText.style.animation = 'none';
    void this.el.bigText.offsetWidth;
    this.el.bigText.style.animation = '';
    this.bigTimer = 3;
  }

  subtitle(who, text, duration = 3.5, minor = false) {
    if (!this.ctx.settings.get('subtitles')) return;
    if (minor && this.subtitleTimer > 0.6) return;
    this.el.subtitle.innerHTML = (who ? `<span class="who">${escapeHtml(who)}:</span>` : '') + escapeHtml(text);
    this.el.subtitle.classList.remove('hidden');
    this.subtitleTimer = duration;
  }

  hitmarker(kill) {
    this.el.hitmarker.classList.remove('show', 'kill');
    void this.el.hitmarker.offsetWidth;
    this.el.hitmarker.classList.add('show');
    if (kill) this.el.hitmarker.classList.add('kill');
    this.hitmarkerTimer = 0.25;
    this.ctx.audio?.play('uiClick', { ui: true, volume: kill ? 0.32 : 0.18, pitch: kill ? 1.4 : 1 });
  }
}

// ---------------------------------------------------------------------------
// Minimap — a rotating radar drawn from the road graph.
// ---------------------------------------------------------------------------
export class Minimap {
  constructor(ctx, canvas) {
    this.ctx = ctx;
    this.canvas = canvas;
    this.g = canvas.getContext('2d');
    this.scale = 0.42;          // pixels per metre
    this.range = 190;
    this._edgeBuf = [];
    this.blips = [];
    this.waypoint = null;
    this._t = 0;
  }

  addBlip(blip) { this.blips.push(blip); return blip; }
  removeBlip(blip) { const i = this.blips.indexOf(blip); if (i >= 0) this.blips.splice(i, 1); }
  setWaypoint(x, z) { this.waypoint = x === null ? null : { x, z }; }

  update(dt) {
    this._t += dt;
    // 20 Hz is plenty for a radar and saves a lot of canvas work.
    if (this._t < 0.05) return;
    this._t = 0;
    this.draw();
  }

  draw() {
    const ctx = this.ctx;
    const g = this.g;
    const W = this.canvas.width, H = this.canvas.height;
    const cx = W / 2, cy = H / 2;
    const player = ctx.player;
    if (!player || !ctx.world) return;
    const px = player.position.x, pz = player.position.z;
    const yaw = player.inVehicle
      ? Math.atan2(player.vehicle.sim.forward.x, player.vehicle.sim.forward.z)
      : (player.bodyYaw ?? player.yaw);

    g.save();
    g.clearRect(0, 0, W, H);
    // circular clip
    g.beginPath();
    g.arc(cx, cy, W / 2 - 1, 0, Math.PI * 2);
    g.clip();

    const night = ctx.sky ? ctx.sky.palette.night : 0;
    g.fillStyle = night > 0.5 ? '#0d1018' : '#1a2230';
    g.fillRect(0, 0, W, H);

    g.translate(cx, cy);
    g.rotate(yaw);
    // Everything below is placed at (dx, -dz), which is a MIRROR of the plan
    // view rather than the plan view itself: looking down at the ground with
    // world +Z up the page puts world +X on the LEFT, because a three.js camera
    // looks down its own -Z. A mirror composed with the heading rotation does
    // not even keep ahead pointing up -- measured on a real canvas, a point
    // 100 m ahead at yaw 1.0 landed 38 px right and 17 px BELOW centre, and a
    // point 100 m to the player's right landed above and to the left. With the
    // flip, ahead lands at 0,-42 and right at +42,0 at every heading.
    g.scale(-1, 1);
    const s = this.scale * (W / 320);

    // --- water ---
    const terrain = ctx.world.terrain;
    if (terrain) {
      g.fillStyle = '#10293a';
      const step = 26;
      for (let dx = -this.range; dx <= this.range; dx += step) {
        for (let dz = -this.range; dz <= this.range; dz += step) {
          if (terrain.isWater(px + dx, pz + dz)) {
            g.fillRect(dx * s - step * s * 0.5, -(dz * s) - step * s * 0.5, step * s, step * s);
          }
        }
      }
    }

    // --- roads ---
    const graph = ctx.world.roads;
    const list = graph.edgeHash.queryRadius(px, pz, this.range, this._edgeBuf);
    for (const e of list) {
      const w = Math.max(1.4, e.halfWidth * 2 * s * 0.6);
      g.strokeStyle = e.type === 'highway' ? '#4a5568' : e.type === 'arterial' ? '#3d4654' : '#333b47';
      g.lineWidth = w;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo((e.a.x - px) * s, -(e.a.z - pz) * s);
      g.lineTo((e.b.x - px) * s, -(e.b.z - pz) * s);
      g.stroke();
    }

    // --- shops ---
    for (const shop of ctx.world.shops) {
      const dx = shop.x - px, dz = shop.z - pz;
      if (Math.abs(dx) > this.range || Math.abs(dz) > this.range) continue;
      g.fillStyle = '#' + (shop.typeDef.signColor || 0xffffff).toString(16).padStart(6, '0');
      g.globalAlpha = 0.85;
      g.beginPath();
      g.arc(dx * s, -dz * s, 3, 0, Math.PI * 2);
      g.fill();
      g.globalAlpha = 1;
    }

    // --- mission markers ---
    if (ctx.missions) {
      for (const s2 of ctx.missions.startMarkers) {
        if (!s2.mesh.visible) continue;
        this._blip(g, (s2.mission.start.x - px) * s, -(s2.mission.start.z - pz) * s, '#ffc93c', 5, true);
      }
      for (const m of ctx.missions.markers) {
        this._blip(g, (m.x - px) * s, -(m.z - pz) * s, '#' + m.color.toString(16).padStart(6, '0'), 6, true);
      }
    }

    // --- police ---
    if (ctx.police) {
      for (const u of ctx.police.units) {
        if (u.dead) continue;
        this._blip(g, (u.sim.position.x - px) * s, -(u.sim.position.z - pz) * s, '#4a9eff', 4);
      }
      for (const o of ctx.police.officers) {
        if (o.dead) continue;
        this._blip(g, (o.body.position.x - px) * s, -(o.body.position.z - pz) * s, '#4a9eff', 3);
      }
    }

    // --- custom blips + waypoint ---
    for (const b of this.blips) {
      this._blip(g, (b.x - px) * s, -(b.z - pz) * s, b.color || '#ffffff', b.size || 4);
    }
    if (this.waypoint) {
      this._blip(g, (this.waypoint.x - px) * s, -(this.waypoint.z - pz) * s, '#ff2d95', 6, true);
    }

    g.restore();

    // --- player arrow, always pointing up ---
    g.save();
    g.translate(cx, cy);
    g.fillStyle = '#ffffff';
    g.strokeStyle = '#101018';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(0, -9);
    g.lineTo(6.5, 8);
    g.lineTo(0, 4.5);
    g.lineTo(-6.5, 8);
    g.closePath();
    g.fill();
    g.stroke();
    g.restore();
  }

  _blip(g, x, y, color, size, pulse) {
    const r = pulse ? size * (1 + Math.sin(this.ctx.time.elapsed * 3.5) * 0.16) : size;
    g.fillStyle = color;
    g.strokeStyle = 'rgba(0,0,0,0.7)';
    g.lineWidth = 1.5;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
    g.stroke();
  }
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
