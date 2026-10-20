/*
 * photomode.js — Photo mode (pause menu → Photo mode). The world stands
 * still and the camera comes loose: fly it round Jay, set the time of day
 * and the weather, pick a filter, a frame, a zoom and a tilt, then take the
 * shot. Photos are saved as PNG files (to the browser's downloads).
 *
 *   W A S D / arrows   move          Space / C   up / down
 *   drag the mouse     look          wheel       zoom
 *   Q / E              tilt          Shift       faster
 *   Enter              take photo    H           hide the panel
 *   Esc                back to the pause menu
 *
 * main.js runs it as its own state ('photo'): nothing simulates, and
 * frame() draws the scene from the free camera every frame. Everything it
 * changes (camera, time, weather, Jay's visibility) goes back on close.
 */
(function () {
  'use strict';

  const VH = window.VH;
  const { clamp } = VH.math;
  const RANGE = 60; // metres the camera may stray from Jay
  const FILTERS = [
    ['None', ''],
    ['Vivid', 'saturate(1.45) contrast(1.08)'],
    ['Noir', 'grayscale(1) contrast(1.35) brightness(0.95)'],
    ['Sunset', 'sepia(0.35) saturate(1.45) hue-rotate(-12deg) brightness(1.04)'],
    ['Retro', 'sepia(0.55) contrast(1.12) saturate(1.2) brightness(0.98)'],
    ['Cool', 'saturate(0.85) hue-rotate(14deg) contrast(1.06) brightness(1.02)'],
    ['Dream', 'saturate(1.3) brightness(1.08) contrast(0.9)'],
  ];
  const FRAMES = [['Full', 0], ['Cinema', 2.39], ['Wide', 16 / 9], ['Square', 1]];
  const WEATHER = [['Clear', 'clear'], ['Cloudy', 'cloudy'], ['Overcast', 'overcast'], ['Rain', 'rain'], ['Storm', 'storm']];

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function clock(h) {
    const hh = Math.floor(h) % 24;
    const mm = Math.round((h - Math.floor(h)) * 60) % 60;
    return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
  }

  class PhotoMode {
    constructor(game) {
      this.game = game;
      this.active = false;
      this.shots = 0;
      this.filter = 0;
      this.frameIdx = 0;
      this.vignette = 0.25;
      this.tilt = 0;
      this.showJay = true;
      this.showMarkers = false;
      this.keys = new Set();
      this._euler = new THREE.Euler(0, 0, 0, 'YXZ');
      this._v = new THREE.Vector3();
      this._build();
      this._onKeyDown = (e) => this._key(e, true);
      this._onKeyUp = (e) => this._key(e, false);
      this._onMove = (e) => this._drag(e);
      this._onUp = () => {
        this.dragging = false;
      };
      this._onDown = (e) => {
        if (!this.active) return;
        this.dragging = true;
        e.preventDefault();
      };
      this._onWheel = (e) => {
        if (!this.active) return;
        e.preventDefault();
        this._setFov(this.fov + Math.sign(e.deltaY) * 3);
      };
      this._onMenu = (e) => {
        if (this.active) e.preventDefault();
      };
    }

    // ------------------------------------------------------------ panel
    _build() {
      const root = el('div', 'photo-ui');
      this.vigEl = el('div', 'photo-vignette');
      this.barsEl = el('div', 'photo-bars');
      this.barA = el('i');
      this.barB = el('i');
      this.barsEl.append(this.barA, this.barB);
      this.flashEl = el('div', 'photo-flash');
      const panel = el('div', 'photo-panel');
      this.panel = panel;
      panel.append(el('h2', 'photo-title', 'Photo mode'));
      const row = (label, ...kids) => {
        const r = el('div', 'photo-row');
        r.append(el('span', 'photo-label', label), ...kids);
        panel.append(r);
        return r;
      };
      const cycler = (list, get, set) => {
        const wrap = el('div', 'photo-cycle');
        const name = el('b');
        const prev = el('button', '', '‹');
        const next = el('button', '', '›');
        const show = () => {
          name.textContent = list[get()][0];
        };
        prev.onclick = () => {
          set((get() - 1 + list.length) % list.length);
          show();
        };
        next.onclick = () => {
          set((get() + 1) % list.length);
          show();
        };
        wrap.append(prev, name, next);
        show();
        return { wrap, show };
      };
      const slider = (min, max, step, get, set, fmt) => {
        const wrap = el('div', 'photo-slider');
        const input = el('input');
        input.type = 'range';
        input.min = min;
        input.max = max;
        input.step = step;
        const out = el('em');
        const show = () => {
          input.value = get();
          out.textContent = fmt(get());
        };
        input.oninput = () => {
          set(+input.value);
          out.textContent = fmt(+input.value);
        };
        input.onchange = () => input.blur();
        wrap.append(input, out);
        show();
        return { wrap, show };
      };
      this.filterCtl = cycler(FILTERS, () => this.filter, (i) => {
        this.filter = i;
        this._applyLook();
      });
      row('Filter', this.filterCtl.wrap);
      this.frameCtl = cycler(FRAMES, () => this.frameIdx, (i) => {
        this.frameIdx = i;
        this._applyLook();
      });
      row('Frame', this.frameCtl.wrap);
      this.timeCtl = slider(0, 23.75, 0.25, () => this.hours || 12, (h) => this._setTime(h), clock);
      row('Time', this.timeCtl.wrap);
      const wx = el('div', 'photo-chips');
      this.weatherBtns = WEATHER.map(([label, id]) => {
        const b = el('button', '', label);
        b.onclick = () => this._setWeather(id);
        wx.append(b);
        return [id, b];
      });
      row('Weather', wx);
      this.fovCtl = slider(20, 90, 1, () => this.fov || 60, (v) => this._setFov(v), (v) => Math.round(v) + '°');
      row('Zoom', this.fovCtl.wrap);
      this.tiltCtl = slider(-30, 30, 1, () => this.tilt, (v) => {
        this.tilt = v;
      }, (v) => Math.round(v) + '°');
      row('Tilt', this.tiltCtl.wrap);
      this.vigCtl = slider(0, 1, 0.05, () => this.vignette, (v) => {
        this.vignette = v;
        this._applyLook();
      }, (v) => Math.round(v * 100) + '%');
      row('Vignette', this.vigCtl.wrap);
      const jay = el('button', 'photo-toggle');
      jay.onclick = () => {
        this.showJay = !this.showJay;
        this._applyJay();
      };
      this.jayBtn = jay;
      row('Jay', jay);
      const marks = el('button', 'photo-toggle');
      marks.onclick = () => {
        this.showMarkers = !this.showMarkers;
        this._applyMarkers();
      };
      this.marksBtn = marks;
      row('Markers', marks);
      const actions = el('div', 'photo-actions');
      const take = el('button', 'btn btn-primary', 'Take photo');
      take.onclick = () => this.capture();
      const hide = el('button', 'btn', 'Hide panel');
      hide.onclick = () => this.togglePanel();
      const done = el('button', 'btn', 'Done');
      done.onclick = () => this.game.closePhoto();
      actions.append(take, hide, done);
      panel.append(actions);
      panel.append(el('p', 'photo-help', 'WASD move · Space / C up and down · drag to look · wheel to zoom · Q / E tilt · Shift faster · Enter take photo · H hide panel · Esc done'));
      // A clicked button gives the keyboard straight back to the camera.
      panel.addEventListener('click', (e) => {
        if (e.target && e.target.tagName === 'BUTTON') e.target.blur();
      });
      window.addEventListener('resize', () => {
        if (this.active) this._applyLook();
      });
      this.toastEl = el('div', 'photo-toast');
      root.append(this.vigEl, this.barsEl, this.flashEl, panel, this.toastEl);
      document.body.append(root);
      this.root = root;
    }

    _applyLook() {
      const g = this.game;
      const canvas = g.renderer.canvas;
      canvas.style.filter = this.active && FILTERS[this.filter][1] ? FILTERS[this.filter][1] : '';
      this.vigEl.style.opacity = this.active ? String(this.vignette) : '0';
      // Bars show the frame's crop.
      const r = FRAMES[this.frameIdx][1];
      const W = window.innerWidth;
      const H = window.innerHeight;
      this.barsEl.className = 'photo-bars';
      if (!this.active || !r) {
        this.barA.style.cssText = this.barB.style.cssText = 'display:none';
        return;
      }
      if (W / H > r) {
        const w = (W - H * r) / 2;
        this.barA.style.cssText = 'left:0;top:0;bottom:0;width:' + w + 'px';
        this.barB.style.cssText = 'right:0;top:0;bottom:0;width:' + w + 'px';
      } else {
        const h = (H - W / r) / 2;
        this.barA.style.cssText = 'left:0;right:0;top:0;height:' + h + 'px';
        this.barB.style.cssText = 'left:0;right:0;bottom:0;height:' + h + 'px';
      }
    }

    _applyJay() {
      const p = this.game.player;
      if (p.model && p.model.root) p.model.root.visible = this.showJay || !this.active ? this._jayWas !== false : false;
      this.jayBtn.textContent = this.showJay ? 'Shown' : 'Hidden';
      this.jayBtn.classList.toggle('on', this.showJay);
    }

    /** The glowing job and challenge markers: hidden for photos unless asked for. */
    _markerObjects() {
      const g = this.game;
      const out = [];
      if (g.missions) {
        for (const mk of g.missions.markers || []) if (mk.g) out.push(mk.g);
        if (g.missions._objGroup) out.push(g.missions._objGroup);
      }
      if (g.challenges) for (const mk of g.challenges.markers || []) if (mk.group) out.push(mk.group);
      return out;
    }

    _applyMarkers() {
      if (this.active) {
        if (!this._markWas) this._markWas = new Map(this._markerObjects().map((o) => [o, o.visible]));
        for (const [o, was] of this._markWas) o.visible = was && this.showMarkers;
      } else if (this._markWas) {
        for (const [o, was] of this._markWas) o.visible = was;
        this._markWas = null;
      }
      this.marksBtn.textContent = this.showMarkers ? 'Shown' : 'Hidden';
      this.marksBtn.classList.toggle('on', this.showMarkers);
    }

    _refreshWeather() {
      const w = this.game.weather;
      for (const [id, b] of this.weatherBtns) b.classList.toggle('on', !!w && w.state === id);
    }

    // ------------------------------------------------------------ open / close
    open() {
      const g = this.game;
      const cam = g.renderer.camera;
      const env = g.environment;
      const w = g.weather;
      this.active = true;
      this.saved = {
        pos: cam.position.clone(),
        quat: cam.quaternion.clone(),
        fov: cam.fov,
        hours: env.hours,
        weather: w && w.ok ? { state: w.state, cur: Object.assign({}, w.cur), from: Object.assign({}, w.from), blend: w.blend, len: w._blendLen, hold: w.holdT, wet: w.wet, fixed: w.fixed } : null,
      };
      this._euler.setFromQuaternion(cam.quaternion, 'YXZ');
      this.yaw = this._euler.y;
      this.pitch = this._euler.x;
      this.tilt = 0;
      this.fov = cam.fov;
      this.hours = env.hours;
      env.freeTime = true; // night photos even with Always daytime on
      if (w) w.fixed = true; // the sky holds still
      const p = g.player;
      this._jayWas = p.model && p.model.root ? p.model.root.visible : true;
      this.showJay = true;
      g.hud.root.style.visibility = 'hidden';
      this.root.classList.add('visible');
      this.panel.classList.remove('hidden');
      document.body.classList.add('photo-mode');
      window.addEventListener('keydown', this._onKeyDown, true);
      window.addEventListener('keyup', this._onKeyUp, true);
      window.addEventListener('mousemove', this._onMove);
      window.addEventListener('mouseup', this._onUp);
      g.renderer.canvas.addEventListener('mousedown', this._onDown);
      g.renderer.canvas.addEventListener('wheel', this._onWheel, { passive: false });
      g.renderer.canvas.addEventListener('contextmenu', this._onMenu);
      this.keys.clear();
      for (const c of [this.timeCtl, this.fovCtl, this.tiltCtl, this.vigCtl, this.filterCtl, this.frameCtl]) c.show();
      this._applyLook();
      this._applyJay();
      this._applyMarkers();
      this._refreshWeather();
      const first = this.panel.querySelector('button');
      if (first) first.blur();
    }

    close() {
      if (!this.active) return;
      const g = this.game;
      const cam = g.renderer.camera;
      const env = g.environment;
      const s = this.saved;
      this.active = false;
      cam.position.copy(s.pos);
      cam.quaternion.copy(s.quat);
      cam.fov = s.fov;
      cam.updateProjectionMatrix();
      cam.updateMatrixWorld();
      env.freeTime = false;
      env.setTime(s.hours);
      const w = g.weather;
      if (w && s.weather) {
        const sw = s.weather;
        w.state = sw.state;
        w.cur = sw.cur;
        w.from = sw.from;
        w.blend = sw.blend;
        w._blendLen = sw.len;
        w.holdT = sw.hold;
        w.wet = sw.wet;
        w.fixed = sw.fixed;
        w._apply(0);
      }
      g.world.setNightFactor(env.shared.uWindowGlow.value);
      if (g.fx) g.fx.setNight(env.shared.uWindowGlow.value);
      const p = g.player;
      if (p.model && p.model.root) p.model.root.visible = this._jayWas !== false;
      this._applyMarkers();
      g.hud.root.style.visibility = '';
      this.root.classList.remove('visible');
      document.body.classList.remove('photo-mode');
      window.removeEventListener('keydown', this._onKeyDown, true);
      window.removeEventListener('keyup', this._onKeyUp, true);
      window.removeEventListener('mousemove', this._onMove);
      window.removeEventListener('mouseup', this._onUp);
      g.renderer.canvas.removeEventListener('mousedown', this._onDown);
      g.renderer.canvas.removeEventListener('wheel', this._onWheel);
      g.renderer.canvas.removeEventListener('contextmenu', this._onMenu);
      this.dragging = false;
      this._applyLook();
    }

    togglePanel() {
      this.panel.classList.toggle('hidden');
    }

    // ------------------------------------------------------------ input
    _key(e, down) {
      if (!this.active) return;
      const typing = document.activeElement && document.activeElement.tagName === 'INPUT' && /Arrow/.test(e.code);
      if (down) {
        if (e.code === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          this.game.closePhoto();
          return;
        }
        if (e.code === 'Enter' || e.code === 'NumpadEnter') {
          e.preventDefault();
          this.capture();
          return;
        }
        if (e.code === 'KeyH') this.togglePanel();
        if (e.code === 'KeyR') {
          this.tilt = 0;
          this.tiltCtl.show();
        }
        if (!typing) {
          this.keys.add(e.code);
          if (e.code === 'Space' || /Arrow/.test(e.code)) e.preventDefault();
        }
      } else this.keys.delete(e.code);
      // Keep the game's own key handlers out of it while the camera is loose.
      if (!typing && e.code !== 'F12') e.stopPropagation();
    }

    _drag(e) {
      if (!this.active || !this.dragging) return;
      this.yaw -= e.movementX * 0.0032;
      this.pitch = clamp(this.pitch - e.movementY * 0.0032, -1.5, 1.5);
    }

    _setFov(v) {
      this.fov = clamp(v, 20, 90);
      this.fovCtl.show();
    }

    _setTime(h) {
      const g = this.game;
      this.hours = h;
      g.environment.setTime(h);
      const glow = g.environment.shared.uWindowGlow.value;
      g.world.setNightFactor(glow);
      if (g.fx) g.fx.setNight(glow);
    }

    _setWeather(id) {
      const w = this.game.weather;
      if (!w || !w.ok) return;
      w.setState(id, 1.5);
      w.fixed = true;
      this._refreshWeather();
    }

    // ------------------------------------------------------------ frame
    frame(dt) {
      if (!this.active) return;
      const g = this.game;
      const k = this.keys;
      const pad = g.input.pad;
      g.input.pollGamepad();
      let f = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
      let r = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
      const u = (k.has('Space') ? 1 : 0) - (k.has('KeyC') || k.has('ControlLeft') ? 1 : 0);
      if (pad && pad.connected) {
        if (Math.abs(pad.move.y) > 0.15) f = -pad.move.y;
        if (Math.abs(pad.move.x) > 0.15) r = pad.move.x;
        this.yaw -= pad.look.x * dt * 2.2;
        this.pitch = clamp(this.pitch - pad.look.y * dt * 2.2, -1.5, 1.5);
      }
      if (k.has('KeyQ')) this.tilt = clamp(this.tilt - dt * 30, -30, 30);
      if (k.has('KeyE')) this.tilt = clamp(this.tilt + dt * 30, -30, 30);
      if (k.has('KeyQ') || k.has('KeyE')) this.tiltCtl.show();
      const speed = k.has('ShiftLeft') || k.has('ShiftRight') ? 18 : 5;
      const cam = g.renderer.camera;
      const fx = -Math.sin(this.yaw) * Math.cos(this.pitch);
      const fy = Math.sin(this.pitch);
      const fz = -Math.cos(this.yaw) * Math.cos(this.pitch);
      const rx = Math.cos(this.yaw);
      const rz = -Math.sin(this.yaw);
      const p = cam.position;
      p.x += (fx * f + rx * r) * speed * dt;
      p.y += (fy * f + u) * speed * dt;
      p.z += (fz * f + rz * r) * speed * dt;
      // Stay near Jay, above the ground and below the clouds.
      const c = g.player.renderPos || g.player.pos;
      const dx = p.x - c.x;
      const dz = p.z - c.z;
      const d = Math.hypot(dx, dz);
      if (d > RANGE) {
        p.x = c.x + (dx / d) * RANGE;
        p.z = c.z + (dz / d) * RANGE;
      }
      const ground = g.physics.groundHeight(p.x, p.z, p.y + 0.5);
      p.y = clamp(p.y, ground + 0.25, c.y + 60);
      this._euler.set(this.pitch, this.yaw, (this.tilt * Math.PI) / 180, 'YXZ');
      cam.quaternion.setFromEuler(this._euler);
      if (Math.abs(cam.fov - this.fov) > 0.01) {
        cam.fov = this.fov;
        cam.updateProjectionMatrix();
      }
      cam.updateMatrixWorld();
      // The sky follows the camera; the weather finishes any change asked for.
      if (g.weather && g.weather.ok) g.weather._apply(dt);
      g.world.update(0, p);
      g.environment.update(0, p);
      if (g._updateFrustum) g._updateFrustum();
      g.renderer.render(g.scene, 0);
    }

    // ------------------------------------------------------------ the shot
    capture() {
      if (!this.active) return;
      const g = this.game;
      // Draw a fresh frame and copy it out in the same task (the canvas keeps no back buffer).
      g.renderer.render(g.scene, 0);
      const src = g.renderer.canvas;
      const W = src.width;
      const H = src.height;
      const r = FRAMES[this.frameIdx][1];
      let cw = W;
      let ch = H;
      if (r && W / H > r) cw = Math.round(H * r);
      else if (r) ch = Math.round(W / r);
      const out = document.createElement('canvas');
      out.width = cw;
      out.height = ch;
      const x = out.getContext('2d');
      const css = FILTERS[this.filter][1];
      if (css && 'filter' in x) x.filter = css;
      x.drawImage(src, (W - cw) / 2, (H - ch) / 2, cw, ch, 0, 0, cw, ch);
      x.filter = 'none';
      if (this.vignette > 0) {
        const q = x.createRadialGradient(cw / 2, ch / 2, Math.min(cw, ch) * 0.35, cw / 2, ch / 2, Math.hypot(cw, ch) / 2);
        q.addColorStop(0, 'rgba(0,0,0,0)');
        q.addColorStop(1, 'rgba(0,0,0,' + (0.85 * this.vignette).toFixed(3) + ')');
        x.fillStyle = q;
        x.fillRect(0, 0, cw, ch);
      }
      const s = Math.max(12, Math.round(ch * 0.022));
      x.font = '700 ' + s + "px 'Bahnschrift', 'Arial Narrow', sans-serif";
      x.textAlign = 'right';
      x.textBaseline = 'bottom';
      x.fillStyle = 'rgba(255, 255, 255, 0.55)';
      x.fillText('VICEHAVEN', cw - s, ch - s * 0.8);
      const d = new Date();
      const pad2 = (n) => String(n).padStart(2, '0');
      const name = 'vicehaven-' + d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate()) + '-' + pad2(d.getHours()) + pad2(d.getMinutes()) + pad2(d.getSeconds()) + '.png';
      this.lastShot = out;
      const save = (url, revoke) => {
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.append(a);
        a.click();
        a.remove();
        if (revoke) setTimeout(() => URL.revokeObjectURL(url), 5000);
      };
      try {
        if (out.toBlob) out.toBlob((b) => (b ? save(URL.createObjectURL(b), true) : save(out.toDataURL('image/png'))), 'image/png');
        else save(out.toDataURL('image/png'));
      } catch (e) {
        this._toast("Couldn't save the photo here.");
        return;
      }
      this.shots++;
      this.flashEl.classList.remove('go');
      void this.flashEl.offsetWidth;
      this.flashEl.classList.add('go');
      const a = g.audio;
      if (a && a.ready && a._hit) {
        const t = a.ctx.currentTime;
        a._hit({ t, type: 'bandpass', freq: 2400, q: 1.2, peak: 0.12, attack: 0.002, decay: 0.04, bus: a.ui });
        a._hit({ t: t + 0.07, type: 'bandpass', freq: 1500, q: 1.2, peak: 0.09, attack: 0.002, decay: 0.06, bus: a.ui });
      }
      this._toast('Saved ' + name + ' to your downloads');
      VH.events.emit('photo:taken', { name });
    }

    _toast(text) {
      this.toastEl.textContent = text;
      this.toastEl.classList.remove('show');
      void this.toastEl.offsetWidth;
      this.toastEl.classList.add('show');
    }
  }

  VH.PhotoMode = PhotoMode;
})();
