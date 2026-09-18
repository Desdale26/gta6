// menus.js — pause menu, settings, the big map, shop UI, weapon wheel and the phone.
import { clamp, formatMoney, formatTime } from '../core/mathx.js';
import { QUALITY_PRESETS } from '../core/settings.js';
import { getWeapon, WEAPON_SLOTS } from '../content/weaponCatalog.js';
import { STATIONS } from '../content/radioCatalog.js';
import { getMission, storyProgress } from '../content/missionCatalog.js';
import { WORLD } from '../world/terrain.js';

const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export class Menus {
  constructor(ctx) {
    this.ctx = ctx;
    this.el = {
      pause: document.getElementById('pauseMenu'),
      list: document.getElementById('menuList'),
      detail: document.getElementById('menuDetail'),
      map: document.getElementById('mapOverlay'),
      bigMap: document.getElementById('bigMap'),
      mapLegend: document.getElementById('mapLegend'),
      shop: document.getElementById('shopOverlay'),
      shopName: document.getElementById('shopName'),
      shopCash: document.getElementById('shopCash'),
      shopList: document.getElementById('shopList'),
      shopDetail: document.getElementById('shopDetail'),
      wheel: document.getElementById('wheelOverlay'),
      wheelCanvas: document.getElementById('wheelCanvas'),
      phone: document.getElementById('phoneOverlay'),
      phoneApps: document.getElementById('phoneApps'),
      phoneContent: document.getElementById('phoneContent'),
      phoneTime: document.getElementById('phoneTime'),
      crash: document.getElementById('crashOverlay'),
      crashText: document.getElementById('crashText'),
    };
    this.open = null;              // 'pause' | 'map' | 'shop' | 'wheel' | 'phone'
    this.menuIndex = 0;
    this.menuPage = 'root';
    this.shopIndex = 0;
    this.wheelIndex = 0;
    this.phoneApp = 'missions';
    this.mapZoom = 1;
    this.mapPan = { x: 0, z: 0 };
    this.mapDrag = null;
    this._mapDirty = true;
    this._wire();
  }

  get isOpen() { return this.open !== null; }

  _wire() {
    const bus = this.ctx.bus;
    bus.on('shop:opened', () => this.openShop());
    bus.on('shop:closed', () => { if (this.open === 'shop') this._close(); });

    this.el.bigMap.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.mapZoom = clamp(this.mapZoom * (e.deltaY < 0 ? 1.15 : 0.87), 0.5, 6);
      this._mapDirty = true;
    }, { passive: false });
    this.el.bigMap.addEventListener('mousedown', (e) => {
      this.mapDrag = { x: e.clientX, y: e.clientY, panX: this.mapPan.x, panZ: this.mapPan.z, moved: false };
    });
    window.addEventListener('mousemove', (e) => {
      if (!this.mapDrag) return;
      const dx = e.clientX - this.mapDrag.x, dy = e.clientY - this.mapDrag.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) this.mapDrag.moved = true;
      const scale = this._mapScale();
      this.mapPan.x = this.mapDrag.panX - dx / scale;
      this.mapPan.z = this.mapDrag.panZ - dy / scale;
      this._mapDirty = true;
    });
    window.addEventListener('mouseup', (e) => {
      if (this.mapDrag && !this.mapDrag.moved && this.open === 'map') {
        const rect = this.el.bigMap.getBoundingClientRect();
        const wx = (e.clientX - rect.left) / rect.width;
        const wy = (e.clientY - rect.top) / rect.height;
        if (wx >= 0 && wx <= 1 && wy >= 0 && wy <= 1) this._setWaypointFromCanvas(wx, wy);
      }
      this.mapDrag = null;
    });
  }

  // -------------------------------------------------------------------------
  update(dt) {
    const input = this.ctx.input;
    const player = this.ctx.player;

    // --- hotkeys ---
    if (input.pressed('pause')) {
      if (this.open) this._close();
      else this.openPause();
    }
    if (input.pressed('map')) {
      if (this.open === 'map') this._close();
      else if (!this.open) this.openMap();
    }
    if (input.pressed('phone')) {
      if (this.open === 'phone') this._close();
      else if (!this.open) this.openPhone();
    }
    if (!this.open && input.down('wheel') && player && !player.dead) this.openWheel();
    else if (this.open === 'wheel' && !input.down('wheel')) this._confirmWheel();

    if (!this.open) return;

    switch (this.open) {
      case 'pause': this._updatePause(); break;
      case 'map': this._updateMap(); break;
      case 'shop': this._updateShop(); break;
      case 'wheel': this._updateWheel(); break;
      case 'phone': this._updatePhone(); break;
      default: break;
    }
  }

  _close() {
    const was = this.open;
    this.open = null;
    for (const k of ['pause', 'map', 'shop', 'wheel', 'phone']) this.el[k].classList.add('hidden');
    this.ctx.input.uiCaptured = false;
    if (was === 'shop') this.ctx.shops.leave();
    this.ctx.audio?.play('uiCancel', { ui: true, volume: 0.4 });
    this.ctx.bus.emit('menu:closed', { was });
    this.ctx.input.lockPointer();
  }

  _show(name) {
    this.open = name;
    this.el[name].classList.remove('hidden');
    this.ctx.input.uiCaptured = name !== 'wheel';
    if (name !== 'wheel') this.ctx.input.unlockPointer();
    this.ctx.audio?.play('uiConfirm', { ui: true, volume: 0.4 });
    this.ctx.bus.emit('menu:opened', { name });
  }

  // ---- pause / settings ---------------------------------------------------
  openPause() {
    this.menuPage = 'root';
    this.menuIndex = 0;
    this._show('pause');
    this._renderPause();
  }

  _menuItems() {
    const s = this.ctx.settings;
    const g = this.ctx.game;
    if (this.menuPage === 'root') {
      const items = [
        { id: 'resume', label: 'Resume' },
        { id: 'settings', label: 'Settings', sub: 'Graphics, audio, controls' },
        { id: 'stats', label: 'Statistics' },
        { id: 'controls', label: 'Controls' },
        { id: 'save', label: 'Save game' },
        { id: 'restart', label: 'New game', sub: 'Wipes your progress' },
      ];
      if (this.ctx.missions?.active) items.splice(1, 0, { id: 'abandon', label: 'Abandon mission' });
      return items;
    }
    if (this.menuPage === 'settings') {
      // Only the presets this session can actually reach. Shading is latched at
      // boot, so a session that started minimal cannot be cycled onto a preset
      // that expects PBR materials and a post chain it has no materials for, and
      // one that did not start minimal must not be cycled into it.
      const q = s.ladder;
      return [
        { id: 'back', label: '‹ Back' },
        { id: 'h1', label: 'Graphics', header: true },
        { id: 'shading', label: 'Surface detail',
          value: (s.get('shading') === 'full' ? 'Full — lit, reflective' : 'Flat — fastest')
            + (s.shadingNeedsReload ? '  (restart to apply)' : ''),
          cycle: ['minimal', 'full'], get: () => s.get('shading'), apply: (v) => s.setShading(v) },
        { id: 'quality', label: 'Quality preset', value: QUALITY_PRESETS[s.get('quality')].label, cycle: q, get: () => s.get('quality') },
        { id: 'autoQuality', label: 'Adaptive quality', value: s.get('autoQuality') ? 'On' : 'Off', toggle: true },
        { id: 'targetFps', label: 'Target frame rate', value: `${s.get('targetFps')} fps`,
          cycle: [30, 60, 90, 120, 144], get: () => s.get('targetFps') },
        { id: 'renderScale', label: 'Render scale', value: pct(s.get('renderScale')), range: [0.5, 2, 0.05] },
        { id: 'pixelBudget', label: 'Resolution limit', value: budgetLabel(s.get('pixelBudget')),
          cycle: PIXEL_BUDGETS.map((b) => b.value), get: () => s.get('pixelBudget') },
        { id: 'fov', label: 'Field of view', value: `${Math.round(s.get('fov'))}°`, range: [60, 105, 1] },
        { id: 'filmGrain', label: 'Film grain', value: pct(s.get('filmGrain')), range: [0, 1, 0.05] },
        { id: 'chromaticAberration', label: 'Chromatic aberration', value: pct(s.get('chromaticAberration')), range: [0, 1, 0.05] },
        { id: 'vignette', label: 'Vignette', value: pct(s.get('vignette')), range: [0, 1, 0.05] },
        { id: 'h2', label: 'Audio', header: true },
        { id: 'masterVolume', label: 'Master volume', value: pct(s.get('masterVolume')), range: [0, 1, 0.05] },
        { id: 'sfxVolume', label: 'Effects', value: pct(s.get('sfxVolume')), range: [0, 1, 0.05] },
        { id: 'musicVolume', label: 'Radio', value: pct(s.get('musicVolume')), range: [0, 1, 0.05] },
        { id: 'engineVolume', label: 'Engines', value: pct(s.get('engineVolume')), range: [0, 1, 0.05] },
        { id: 'h3', label: 'Gameplay', header: true },
        { id: 'mouseSensitivity', label: 'Mouse sensitivity', value: s.get('mouseSensitivity').toFixed(2), range: [0.2, 3, 0.05] },
        { id: 'invertY', label: 'Invert look', value: s.get('invertY') ? 'On' : 'Off', toggle: true },
        { id: 'drivingAssist', label: 'Driving assist', value: pct(s.get('drivingAssist')), range: [0, 1, 0.05] },
        { id: 'cameraShake', label: 'Camera shake', value: pct(s.get('cameraShake')), range: [0, 1.5, 0.05] },
        { id: 'bloodFx', label: 'Blood effects', value: s.get('bloodFx') ? 'On' : 'Off', toggle: true },
        { id: 'subtitles', label: 'Subtitles', value: s.get('subtitles') ? 'On' : 'Off', toggle: true },
        { id: 'showFps', label: 'Show performance', value: s.get('showFps') ? 'On' : 'Off', toggle: true },
        { id: 'reset', label: 'Reset to defaults' },
      ];
    }
    if (this.menuPage === 'stats' || this.menuPage === 'controls') {
      return [{ id: 'back', label: '‹ Back' }];
    }
    return [];
  }

  _renderPause() {
    const items = this._menuItems();
    const list = this.el.list;
    list.innerHTML = '';
    items.forEach((it, i) => {
      const el = document.createElement('div');
      el.className = 'mi' + (i === this.menuIndex ? ' sel' : '') + (it.header ? ' header' : '');
      el.innerHTML = `<span>${esc(it.label)}</span>${it.value !== undefined ? `<span class="val">${esc(it.value)}</span>` : ''}`;
      if (!it.header) {
        el.addEventListener('click', () => { this.menuIndex = i; this._activate(); });
        el.addEventListener('mouseenter', () => { this.menuIndex = i; this._renderPause(); });
      }
      list.appendChild(el);
    });
    this._renderDetail(items[this.menuIndex]);
  }

  _renderDetail(item) {
    const d = this.el.detail;
    if (this.menuPage === 'stats') { d.innerHTML = this._statsHtml(); return; }
    if (this.menuPage === 'controls') { d.innerHTML = this._controlsHtml(); return; }
    if (!item) { d.innerHTML = ''; return; }
    const help = {
      resume: 'Back to Leonida.',
      settings: 'Tune how the game looks, sounds and drives.',
      stats: 'Everything you have done so far.',
      controls: 'Full key list.',
      save: 'Progress is also saved automatically after every mission.',
      restart: 'Start over from the bus station. This cannot be undone.',
      abandon: 'Give up the current mission. You can retry it from its marker.',
      shading: 'Flat is the fast path: every surface is lit by a single dot product, with no shadows, no reflections and no surface texture beyond its colour. Full turns on proper lighting — normal and roughness detail, specular highlights and environment reflections — and costs a large part of your frame rate. This one takes effect when you reload the page, because a surface\'s type is fixed when it is built and swapping every material in the city mid-game would stall far worse than it is worth.',
      quality: 'Minimal draws the whole city with flat shading, no shadows and no reflections — it looks simpler and runs several times faster. The richer presets are only offered if the session started on one, because how surfaces are shaded is decided when the game loads.',
      targetFps: 'What the adaptive system aims for. It scales the render resolution, and drops a quality level if that is not enough, to hold this number.',
      renderScale: 'Multiplies the rendered resolution. Above 100% the frame is drawn larger than the window and downsampled, which is the cleanest image the game can produce.',
      pixelBudget: 'The largest frame the GPU will be asked to draw, whatever the render scale and display density work out to.',
      autoQuality: 'Holds your target frame rate by scaling the render resolution, and dropping a quality level if that is not enough. Turn it off to keep the level you picked.',
      drivingAssist: 'How much the car helps you catch a slide. Zero is raw.',
      fov: 'Wider feels faster. The camera widens further with speed either way.',
      bloodFx: 'Turns off blood particles and decals.',
    };
    d.innerHTML = `<h3>${esc(item.label)}</h3><p>${esc(help[item.id] || item.sub || '')}</p>`;
  }

  _statsHtml() {
    const c = this.ctx;
    const p = c.player, e = c.economy, s = c.stunts, m = c.missions;
    const rows = [
      ['Cash', formatMoney(e.cash)], ['Bank', formatMoney(e.bank)],
      ['Reputation', `${e.rep} (level ${e.level})`],
      ['Missions completed', `${m.completed.size} / ${m.available.length + m.completed.size}`],
      ['Stunt score', s.totalScore.toLocaleString()],
      ['Best combo', s.bestCombo.toLocaleString()],
      ['Longest air time', `${s.maxAirTime.toFixed(2)} s`],
      ['Stunt medals', `${s.medalsWon} / ${s.challenges.size}`],
      ['Distance driven', `${(p.distanceDriven / 1000).toFixed(2)} km`],
      ['Distance on foot', `${(p.distanceWalked / 1000).toFixed(2)} km`],
      ['Highest wanted level', `${c.police.maxStarsSeen} stars`],
      ['Crimes reported', String(c.police.totalCrimes)],
      ['Weapons owned', String(p.weapons.order.length)],
      ['Time in the city', formatTime(c.time.hour * 60) + `, day ${c.time.day}`],
    ];
    return `<h3>Statistics</h3>` + rows.map(([k, v]) =>
      `<div class="stat"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('');
  }

  _controlsHtml() {
    const rows = [
      ['Move / drive', 'W A S D'], ['Look', 'Mouse'], ['Sprint / boost', 'Shift'],
      ['Jump / handbrake', 'Space'], ['Crouch', 'C'], ['Enter & exit vehicle', 'F'],
      ['Interact, rob, start mission', 'E'], ['Fire', 'Left mouse'], ['Aim', 'Right mouse'],
      ['Reload', 'R'], ['Weapon wheel', 'Tab (hold)'], ['Weapon slots', '1 – 9'],
      ['Next / previous weapon', 'Q / Z or wheel'], ['Horn', 'H'], ['Look behind', 'B'],
      ['Camera mode', 'V'], ['Headlights', 'L'], ['Flip car upright', 'K'],
      ['Radio station', '[ and ]'], ['Map', 'M'], ['Phone', 'P'],
      ['Performance overlay', 'F3'], ['Pause', 'Esc'],
    ];
    return `<h3>Controls</h3>` + rows.map(([k, v]) =>
      `<div class="stat"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('');
  }

  _updatePause() {
    const input = this.ctx.input;
    const items = this._menuItems();
    let moved = false;
    if (input.keyPressed('ArrowDown') || input.keyPressed('KeyS')) { this.menuIndex = this._step(items, 1); moved = true; }
    if (input.keyPressed('ArrowUp') || input.keyPressed('KeyW')) { this.menuIndex = this._step(items, -1); moved = true; }
    const item = items[this.menuIndex];
    if (item && (item.range || item.cycle || item.toggle)) {
      const left = input.keyPressed('ArrowLeft') || input.keyPressed('KeyA');
      const right = input.keyPressed('ArrowRight') || input.keyPressed('KeyD');
      if (left || right) { this._adjust(item, right ? 1 : -1); moved = true; }
    }
    if (input.keyPressed('Enter') || input.keyPressed('Space')) { this._activate(); return; }
    if (moved) {
      this.ctx.audio?.play('uiHover', { ui: true, volume: 0.25 });
      this._renderPause();
    }
  }

  _step(items, dir) {
    let i = this.menuIndex;
    for (let n = 0; n < items.length; n++) {
      i = (i + dir + items.length) % items.length;
      if (!items[i].header) return i;
    }
    return this.menuIndex;
  }

  _adjust(item, dir) {
    const s = this.ctx.settings;
    if (item.toggle) { s.set(item.id, !s.get(item.id)); }
    else if (item.range) {
      const [min, max, stepSize] = item.range;
      s.set(item.id, clamp(Math.round((s.get(item.id) + dir * stepSize) / stepSize) * stepSize, min, max));
    } else if (item.cycle) {
      const cur = item.cycle.indexOf(item.get());
      const next = item.cycle[(cur + dir + item.cycle.length) % item.cycle.length];
      // A row can own how its value is stored — the shading row has to move the
      // quality preset with it, because the two ladders do not overlap.
      if (item.apply) item.apply(next); else s.set(item.id, next);
      this.ctx.game.applyQuality();
    }
    this.ctx.audio?.play('uiClick', { ui: true, volume: 0.25 });
  }

  _activate() {
    const items = this._menuItems();
    const item = items[this.menuIndex];
    if (!item || item.header) return;
    this.ctx.audio?.play('uiConfirm', { ui: true, volume: 0.4 });
    switch (item.id) {
      case 'resume': this._close(); return;
      case 'back': this.menuPage = 'root'; this.menuIndex = 0; break;
      case 'settings': this.menuPage = 'settings'; this.menuIndex = 2; break;
      case 'stats': this.menuPage = 'stats'; this.menuIndex = 0; break;
      case 'controls': this.menuPage = 'controls'; this.menuIndex = 0; break;
      case 'save': {
        // saveGame returns false when storage is blocked -- a private window,
        // site data turned off. Throwing that away told the player their run
        // was stored when nothing had been written at all.
        const ok = this.ctx.game.save();
        if (ok) this.ctx.hud.toast('Saved', 'Progress stored locally', 'good');
        else this.ctx.hud.toast('Could not save', 'This browser is blocking local storage', 'bad');
        break;
      }
      case 'restart': this.ctx.game.restart(); this._close(); return;
      case 'abandon': this.ctx.missions.abandon(); this._close(); return;
      case 'reset': this.ctx.settings.reset(); this.ctx.game.applyQuality(); break;
      default:
        if (item.toggle || item.cycle || item.range) this._adjust(item, 1);
        break;
    }
    this._renderPause();
  }

  // ---- map ----------------------------------------------------------------
  openMap() {
    this._show('map');
    this._mapDirty = true;
    this._renderLegend();
    this._drawMap();
  }
  _updateMap() {
    if (this._mapDirty) { this._mapDirty = false; this._drawMap(); }
    else if ((this.ctx.time.elapsed * 4 | 0) !== this._mapTick) {
      this._mapTick = this.ctx.time.elapsed * 4 | 0;
      this._drawMap();
    }
  }
  _mapScale() {
    const c = this.el.bigMap;
    return (c.width / (WORLD.maxX - WORLD.minX)) * this.mapZoom;
  }
  _worldToMap(x, z) {
    const c = this.el.bigMap;
    const s = this._mapScale();
    const px = this.ctx.player ? this.ctx.player.position.x : 0;
    const pz = this.ctx.player ? this.ctx.player.position.z : 0;
    const ox = this.mapZoom > 1.02 ? px + this.mapPan.x : this.mapPan.x;
    const oz = this.mapZoom > 1.02 ? pz + this.mapPan.z : this.mapPan.z;
    return [c.width / 2 + (x - ox) * s, c.height / 2 + (z - oz) * s];
  }
  _setWaypointFromCanvas(u, v) {
    const c = this.el.bigMap;
    const s = this._mapScale();
    const px = this.ctx.player ? this.ctx.player.position.x : 0;
    const pz = this.ctx.player ? this.ctx.player.position.z : 0;
    const ox = this.mapZoom > 1.02 ? px + this.mapPan.x : this.mapPan.x;
    const oz = this.mapZoom > 1.02 ? pz + this.mapPan.z : this.mapPan.z;
    const x = (u * c.width - c.width / 2) / s + ox;
    const z = (v * c.height - c.height / 2) / s + oz;
    this.ctx.hud.minimap.setWaypoint(x, z);
    this.ctx.hud.toast('Waypoint set', `${Math.round(x)}, ${Math.round(z)}`, 'info');
    this._mapDirty = true;
  }

  _drawMap() {
    const c = this.el.bigMap;
    const g = c.getContext('2d');
    const ctx = this.ctx;
    if (!ctx.world) return;
    g.fillStyle = '#0a1420';
    g.fillRect(0, 0, c.width, c.height);

    // land mass
    const terrain = ctx.world.terrain;
    const step = 14;
    for (let x = WORLD.minX; x < WORLD.maxX; x += step) {
      for (let z = WORLD.minZ; z < WORLD.maxZ; z += step) {
        if (terrain.isWater(x, z)) continue;
        const [mx, my] = this._worldToMap(x, z);
        const s = this._mapScale() * step + 1;
        if (mx < -s || my < -s || mx > c.width + s || my > c.height + s) continue;
        const surf = terrain.surfaceCodeAt(x, z);
        g.fillStyle = surf === 2 ? '#c2ad82' : surf === 3 ? '#2f4a26' : '#232a33';
        g.fillRect(mx, my, s, s);
      }
    }
    // roads
    const graph = ctx.world.roads;
    for (const e of graph.edges) {
      const [ax, ay] = this._worldToMap(e.a.x, e.a.z);
      const [bx, by] = this._worldToMap(e.b.x, e.b.z);
      if ((ax < 0 && bx < 0) || (ax > c.width && bx > c.width)) continue;
      g.strokeStyle = e.type === 'highway' ? '#6b7684' : e.type === 'arterial' ? '#525d6b' : '#41495a';
      g.lineWidth = Math.max(1, (e.type === 'highway' ? 4 : e.type === 'arterial' ? 3 : 1.6) * this.mapZoom);
      g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke();
    }
    // district labels
    g.textAlign = 'center';
    for (const d of ctx.world.districts.DISTRICTS) {
      const [dx, dy] = this._worldToMap(d.center[0], d.center[1]);
      if (dx < 0 || dy < 0 || dx > c.width || dy > c.height) continue;
      g.fillStyle = 'rgba(255,255,255,0.42)';
      g.font = `${Math.max(10, 13 * Math.min(this.mapZoom, 2))}px Inter, sans-serif`;
      g.fillText(d.name.toUpperCase(), dx, dy);
    }
    // shops
    for (const shop of ctx.world.shops) {
      const [sx, sy] = this._worldToMap(shop.x, shop.z);
      if (sx < 0 || sy < 0 || sx > c.width || sy > c.height) continue;
      g.fillStyle = '#' + (shop.typeDef.signColor || 0xffffff).toString(16).padStart(6, '0');
      g.fillRect(sx - 2, sy - 2, 4, 4);
    }
    // stunt spots
    for (const s of ctx.world.stuntSpots) {
      const [sx, sy] = this._worldToMap(s.x, s.z);
      const rec = ctx.stunts.challenges.get(s.def.id);
      g.fillStyle = rec && rec.medal === 'gold' ? '#ffc93c' : rec && rec.medal !== 'none' ? '#cfd6e0' : '#8a5cff';
      g.beginPath(); g.moveTo(sx, sy - 5); g.lineTo(sx + 5, sy + 4); g.lineTo(sx - 5, sy + 4); g.closePath(); g.fill();
    }
    // missions
    for (const sm of ctx.missions.startMarkers) {
      if (!sm.mesh.visible && !ctx.missions.completed.has(sm.mission.id)) {
        const avail = ctx.missions.available.some((m) => m.id === sm.mission.id);
        if (!avail) continue;
      }
      const done = ctx.missions.completed.has(sm.mission.id);
      const [mx, my] = this._worldToMap(sm.mission.start.x, sm.mission.start.z);
      g.fillStyle = done ? 'rgba(120,130,140,0.6)' : '#' + sm.color.toString(16).padStart(6, '0');
      g.beginPath(); g.arc(mx, my, done ? 3 : 6, 0, Math.PI * 2); g.fill();
      if (!done) {
        g.strokeStyle = '#000'; g.lineWidth = 1.5; g.stroke();
        g.fillStyle = '#1a1020';
        g.font = 'bold 9px Inter, sans-serif';
        g.fillText(sm.mission.start.marker || 'M', mx, my + 3);
      }
    }
    // waypoint
    const wp = ctx.hud.minimap.waypoint;
    if (wp) {
      const [wx, wy] = this._worldToMap(wp.x, wp.z);
      g.strokeStyle = '#ff2d95'; g.lineWidth = 2.5;
      g.beginPath(); g.arc(wx, wy, 9, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.moveTo(wx - 13, wy); g.lineTo(wx + 13, wy);
      g.moveTo(wx, wy - 13); g.lineTo(wx, wy + 13); g.stroke();
    }
    // player
    if (ctx.player) {
      const [px, py] = this._worldToMap(ctx.player.position.x, ctx.player.position.z);
      const yaw = ctx.player.inVehicle
        ? Math.atan2(ctx.player.vehicle.sim.forward.x, ctx.player.vehicle.sim.forward.z)
        : (ctx.player.bodyYaw ?? ctx.player.yaw);
      g.save();
      g.translate(px, py);
      // The map is north-up: _worldToMap sends world +Z DOWN the canvas, so a
      // player at yaw 0 -- facing +Z -- is heading down the page. The arrow
      // below is drawn pointing up, hence the half turn. Without it the arrow
      // pointed exactly opposite to the way the player was travelling: measured
      // on a real canvas, the tip sat at cos -1.000 to the heading at every yaw.
      g.rotate(Math.PI - yaw);
      g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(0, -9); g.lineTo(6, 8); g.lineTo(0, 4); g.lineTo(-6, 8); g.closePath();
      g.fill(); g.stroke();
      g.restore();
    }
  }

  _renderLegend() {
    const items = [
      ['#ffc93c', 'Story mission'], ['#4dff9e', 'Heist'], ['#22e3ff', 'Race'],
      ['#ff3b30', 'Rampage'], ['#ff2d95', 'Side job'], ['#8a5cff', 'Stunt spot'],
      ['#e0e0e0', 'Shop'], ['#ff2d95', 'Waypoint'],
    ];
    this.el.mapLegend.innerHTML = items.map(([c, l]) =>
      `<span><i style="background:${c}"></i>${esc(l)}</span>`).join('');
  }

  // ---- shop ---------------------------------------------------------------
  openShop() {
    this.shopIndex = 0;
    this._show('shop');
    this._renderShop();
  }
  _renderShop() {
    const shop = this.ctx.shops.open;
    if (!shop) { this._close(); return; }
    this.el.shopName.textContent = shop.name.toUpperCase();
    this.el.shopCash.textContent = formatMoney(this.ctx.economy.cash);
    const items = shop.typeDef.inventory;
    this.el.shopList.innerHTML = '';
    items.forEach((it, i) => {
      const afford = this.ctx.economy.canAfford(it.price);
      const el = document.createElement('div');
      el.className = 'mi' + (i === this.shopIndex ? ' sel' : '') + (afford ? '' : ' cant');
      el.innerHTML = `<span>${esc(it.label)}</span><span class="val">${it.price > 0 ? esc(formatMoney(it.price)) : 'Free'}</span>`;
      el.addEventListener('click', () => { this.shopIndex = i; this._buySelected(); });
      el.addEventListener('mouseenter', () => { this.shopIndex = i; this._renderShop(); });
      this.el.shopList.appendChild(el);
    });
    const it = items[this.shopIndex];
    if (it) {
      let extra = '';
      if (it.kind === 'weapon' && it.weaponId) {
        const w = getWeapon(it.weaponId);
        if (w) {
          extra = [
            ['Damage', w.damage], ['Rate of fire', `${w.fireRateRpm} rpm`],
            ['Magazine', w.magazine || '—'], ['Range', `${w.range} m`],
            ['Owned', this.ctx.player.weapons.has(it.weaponId) ? 'Yes' : 'No'],
          ].map(([k, v]) => `<div class="stat"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('');
        }
      } else if (it.value) {
        extra = `<div class="stat"><span>Restores</span><b>${it.value}</b></div>`;
      }
      this.el.shopDetail.innerHTML =
        `<h3>${esc(it.label)}</h3><div class="price">${it.price > 0 ? esc(formatMoney(it.price)) : 'Free'}</div>${extra}`;
    }
  }
  _updateShop() {
    const input = this.ctx.input;
    const items = this.ctx.shops.open ? this.ctx.shops.open.typeDef.inventory : [];
    if (!items.length) return;
    let moved = false;
    if (input.keyPressed('ArrowDown') || input.keyPressed('KeyS')) { this.shopIndex = (this.shopIndex + 1) % items.length; moved = true; }
    if (input.keyPressed('ArrowUp') || input.keyPressed('KeyW')) { this.shopIndex = (this.shopIndex - 1 + items.length) % items.length; moved = true; }
    if (input.keyPressed('Enter') || input.keyPressed('Space')) { this._buySelected(); return; }
    if (moved) { this.ctx.audio?.play('uiHover', { ui: true, volume: 0.22 }); this._renderShop(); }
  }
  _buySelected() {
    const shop = this.ctx.shops.open;
    if (!shop) return;
    const it = shop.typeDef.inventory[this.shopIndex];
    this.ctx.shops.buy(it);
    this._renderShop();
  }

  // ---- weapon wheel -------------------------------------------------------
  openWheel() {
    const order = this.ctx.player.weapons.order;
    if (order.length < 2) return;
    this.wheelIndex = order.indexOf(this.ctx.player.weapons.currentId);
    this._show('wheel');
    this.ctx.game.setTimeScale(0.22);
  }
  _updateWheel() {
    const input = this.ctx.input;
    const order = this.ctx.player.weapons.order;
    if (!order.length) return;
    // Choose by mouse angle; fall back to the scroll wheel.
    const dx = input.mouse.x - window.innerWidth / 2;
    const dy = input.mouse.y - window.innerHeight / 2;
    if (Math.hypot(dx, dy) > 60) {
      const a = Math.atan2(dx, -dy);
      const idx = Math.round(((a + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2) * order.length) % order.length;
      if (idx !== this.wheelIndex) { this.wheelIndex = idx; this.ctx.audio?.play('uiHover', { ui: true, volume: 0.2 }); }
    }
    if (input.mouse.wheel) {
      this.wheelIndex = (this.wheelIndex + Math.sign(input.mouse.wheel) + order.length) % order.length;
    }
    this._drawWheel();
  }
  _confirmWheel() {
    const order = this.ctx.player.weapons.order;
    const id = order[this.wheelIndex];
    if (id) this.ctx.player.weapons.select(id);
    // Back to whatever the clock was before the wheel slowed it, not flatly to
    // 1: a player with slow motion toggled on had it silently cancelled, and
    // then had to press T twice to get it back because game.slowmo still said
    // it was on.
    this.ctx.game.setTimeScale(this.ctx.game.slowmo ? 0.35 : 1);
    this.open = null;
    this.el.wheel.classList.add('hidden');
    this.ctx.input.uiCaptured = false;
  }
  _drawWheel() {
    const c = this.el.wheelCanvas;
    const g = c.getContext('2d');
    const order = this.ctx.player.weapons.order;
    const W = c.width, H = c.height, cx = W / 2, cy = H / 2;
    g.clearRect(0, 0, W, H);
    const R = W * 0.38, r = W * 0.16;
    for (let i = 0; i < order.length; i++) {
      const a0 = (i / order.length) * Math.PI * 2 - Math.PI / 2 - Math.PI / order.length;
      const a1 = a0 + (Math.PI * 2) / order.length;
      const sel = i === this.wheelIndex;
      g.beginPath();
      g.arc(cx, cy, sel ? R * 1.06 : R, a0 + 0.02, a1 - 0.02);
      g.arc(cx, cy, r, a1 - 0.02, a0 + 0.02, true);
      g.closePath();
      g.fillStyle = sel ? 'rgba(255,45,149,0.5)' : 'rgba(10,4,20,0.68)';
      g.fill();
      g.strokeStyle = sel ? '#ff2d95' : 'rgba(255,255,255,0.14)';
      g.lineWidth = sel ? 3 : 1.5;
      g.stroke();

      const def = getWeapon(order[i]);
      const mid = (a0 + a1) / 2;
      const tx = cx + Math.cos(mid) * (R + r) / 2;
      const ty = cy + Math.sin(mid) * (R + r) / 2;
      g.fillStyle = sel ? '#fff' : '#cbb7e8';
      g.font = `${sel ? 'bold ' : ''}15px Inter, sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      const words = def.name.split(' ');
      const lines = words.length > 2 ? [words.slice(0, 2).join(' '), words.slice(2).join(' ')] : [def.name];
      lines.forEach((ln, k) => g.fillText(ln, tx, ty + (k - (lines.length - 1) / 2) * 16));
      const st = this.ctx.player.weapons.slots.get(order[i]);
      if (st && def.magazine > 0) {
        g.font = '12px Inter, sans-serif';
        g.fillStyle = 'rgba(255,255,255,0.55)';
        g.fillText(`${st.ammoInMag}/${st.reserve}`, tx, ty + 24);
      }
    }
    const cur = getWeapon(order[this.wheelIndex]);
    g.fillStyle = '#fff';
    g.font = 'bold 20px Inter, sans-serif';
    g.fillText(cur ? cur.name : '', cx, cy - 8);
    g.font = '13px Inter, sans-serif';
    g.fillStyle = '#22e3ff';
    g.fillText(cur ? cur.slot.toUpperCase() : '', cx, cy + 14);
  }

  // ---- phone --------------------------------------------------------------
  openPhone() {
    this._show('phone');
    this._renderPhone();
  }
  _updatePhone() {
    const input = this.ctx.input;
    if (input.keyPressed('ArrowLeft')) this._cyclePhone(-1);
    if (input.keyPressed('ArrowRight')) this._cyclePhone(1);
  }
  _cyclePhone(dir) {
    const apps = ['missions', 'radio', 'stats', 'map'];
    const i = apps.indexOf(this.phoneApp);
    this.phoneApp = apps[(i + dir + apps.length) % apps.length];
    this.ctx.audio?.play('uiHover', { ui: true, volume: 0.25 });
    this._renderPhone();
  }
  _renderPhone() {
    const ctx = this.ctx;
    this.el.phoneTime.textContent = formatTime(ctx.time.hour * 60);
    const apps = [
      { id: 'missions', icon: '📋', label: 'Jobs', bg: '#ff2d95' },
      { id: 'radio', icon: '📻', label: 'Radio', bg: '#22e3ff' },
      { id: 'stats', icon: '📊', label: 'Stats', bg: '#4dff9e' },
      { id: 'map', icon: '🗺️', label: 'Map', bg: '#ffc93c' },
    ];
    this.el.phoneApps.innerHTML = apps.map((a) =>
      `<div class="app${a.id === this.phoneApp ? ' sel' : ''}" data-app="${a.id}">
         <i style="background:${a.bg}">${a.icon}</i>${esc(a.label)}</div>`).join('');
    for (const el of this.el.phoneApps.children) {
      el.addEventListener('click', () => {
        this.phoneApp = el.dataset.app;
        if (this.phoneApp === 'map') { this._close(); this.openMap(); return; }
        this._renderPhone();
      });
    }
    let html = '';
    if (this.phoneApp === 'missions') {
      // The story first, because six acts of it is the spine of the game, then
      // whatever freelance work is currently on the board.
      const acts = storyProgress(ctx.missions.completed);
      html = '<h4>Story</h4>' + acts.map((a) => {
        const label = a.unlocked || a.done ? esc(a.name) : 'Locked';
        const bar = a.total ? Math.round((a.done / a.total) * 100) : 0;
        return `<div class="row"><span>${label}</span><b>${a.done}/${a.total}${bar === 100 ? ' \u2713' : ''}</b></div>`;
      }).join('');

      const avail = ctx.missions.available;
      const story = avail.filter((m) => m.act);
      const jobs = avail.filter((m) => !m.act);
      const row = (m) => `<div class="row"><span>${esc(m.name)}<br><small>${esc(m.giver)}</small></span>`
        + `<b>${esc(formatMoney(m.reward))}</b></div>`;
      html += '<h4>Next in the story</h4>' + (story.length
        ? story.slice(0, 4).map(row).join('')
        : '<div class="row">Nothing waiting</div>');
      html += '<h4>Freelance</h4>' + (jobs.length
        ? jobs.slice(0, 10).map(row).join('')
        : '<div class="row">Nothing right now</div>');

      const recent = [...ctx.missions.completed].slice(-6).reverse();
      html += '<h4>Recently finished</h4>' + (recent.map((id) => {
        const m = getMission(id);
        return `<div class="row"><span>${esc(m ? m.name : id)}</span></div>`;
      }).join('') || '<div class="row">None yet</div>');
    } else if (this.phoneApp === 'radio') {
      html = '<h4>Stations</h4>' + STATIONS.map((s) => {
        const on = ctx.radio && ctx.radio.stationId === s.id;
        return `<div class="row" data-station="${s.id}"><span>${on ? '▶ ' : ''}${esc(s.name)}</span><b>${esc(s.genre)}</b></div>`;
      }).join('') + '<div class="row" data-station="off"><span>Radio off</span></div>';
    } else if (this.phoneApp === 'stats') {
      html = this._statsHtml();
    }
    this.el.phoneContent.innerHTML = html;
    for (const el of this.el.phoneContent.querySelectorAll('[data-station]')) {
      el.addEventListener('click', () => {
        const id = el.dataset.station;
        if (id === 'off') ctx.radio.stop();
        else ctx.radio.setStationById(id);
        this._renderPhone();
      });
    }
  }

  showCrash(message) {
    this.el.crashText.textContent = message;
    this.el.crash.classList.remove('hidden');
  }
}

function pct(v) { return `${Math.round(v * 100)}%`; }

// Resolution ceilings offered in the options, by total pixels per frame.
const PIXEL_BUDGETS = [
  { value: 1280 * 720, label: '720p' },
  { value: 1920 * 1080, label: '1080p' },
  { value: 2560 * 1440, label: '1440p' },
  { value: 3840 * 2160, label: '4K' },
  { value: 5120 * 2880, label: '5K' },
  { value: 7680 * 4320, label: '8K' },
];
function budgetLabel(v) {
  const hit = PIXEL_BUDGETS.find((b) => b.value === v);
  return hit ? hit.label : `${(v / 1e6).toFixed(1)} MP`;
}
