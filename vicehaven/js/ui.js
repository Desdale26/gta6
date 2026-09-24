/*
 * ui.js — title screen, pause menu, settings, controls, statistics,
 * credits, dialogs and the intro title card.
 *
 * The UI never reaches into game systems directly. main.js hands it a
 * small set of callbacks (newGame, resume, quitToTitle, ...) and it reads
 * and writes options only through VH.settings, so every change is saved
 * and broadcast the same way.
 */
(function () {
  'use strict';

  const VH = window.VH;
  const el = (tag, cls, text) => VH.util.el(tag, cls, text);

  const pct = (v) => Math.round(v * 100) + '%';

  /** Everything on the settings screen, as data. */
  const SETTINGS_SCHEMA = {
    graphics: {
      label: 'Graphics',
      items: [
        { path: 'graphics.quality', label: 'Quality preset', type: 'select', preset: true,
          options: [['low', 'Low'], ['medium', 'Medium'], ['high', 'High'], ['ultra', 'Ultra'], ['custom', 'Custom']],
          help: 'Low suits older laptops; Ultra wants a dedicated graphics card.' },
        { path: 'graphics.renderScale', label: 'Resolution scale', type: 'range', min: 0.5, max: 1, step: 0.05, format: pct,
          help: 'Renders fewer pixels and scales up. The biggest single performance lever.' },
        { path: 'graphics.maxPixelRatio', label: 'High-DPI limit', type: 'select',
          options: [[1, '1× (fastest)'], [1.25, '1.25×'], [1.5, '1.5×'], [2, '2× (sharpest)']] },
        { path: 'graphics.shadows', label: 'Shadows', type: 'select',
          options: [['off', 'Off'], ['low', 'Low'], ['high', 'High'], ['ultra', 'Ultra']] },
        { path: 'graphics.drawDistance', label: 'Draw distance', type: 'range', min: 400, max: 1600, step: 50, format: (v) => v + ' m' },
        { path: 'graphics.propDensity', label: 'Detail distance', type: 'range', min: 0.5, max: 1.5, step: 0.05, format: pct,
          help: 'How far away benches, lamps and trees are still drawn.' },
        { path: 'graphics.effects', label: 'Post-processing', type: 'select',
          options: [['low', 'Off (fastest)'], ['medium', 'Medium: bloom and colour grading'], ['high', 'High: plus film grain, full-res bloom']],
          help: 'The glow on lamps, neon, lit windows and the sun, and the Vicehaven colour grade.' },
        { path: 'graphics.antialias', label: 'Anti-aliasing', type: 'toggle',
          help: 'Smooths jagged edges. With post-processing Off it applies after reloading the page.' },
        { path: 'graphics.fov', label: 'Field of view', type: 'range', min: 50, max: 90, step: 1, format: (v) => v + '°' },
        { path: 'graphics.showFps', label: 'Show FPS counter', type: 'toggle' },
      ],
    },
    gameplay: {
      label: 'Gameplay',
      items: [
        { path: 'gameplay.difficulty', label: 'Difficulty', type: 'select', options: [['easy', 'Easy'], ['normal', 'Normal'], ['hard', 'Hard']],
          later: 'Takes effect once combat and police arrive (Phases 7–8).' },
        { path: 'gameplay.mouseSensitivity', label: 'Mouse sensitivity', type: 'range', min: 0.2, max: 3, step: 0.05, format: (v) => v.toFixed(2) + '×' },
        { path: 'gameplay.invertY', label: 'Invert vertical look', type: 'toggle' },
        { path: 'gameplay.gamepadSensitivity', label: 'Controller look speed', type: 'range', min: 0.3, max: 2.5, step: 0.05, format: (v) => v.toFixed(2) + '×' },
        { path: 'gameplay.aimAssist', label: 'Aim assist', type: 'toggle', later: 'Phase 7' },
        { path: 'gameplay.cameraShake', label: 'Camera shake', type: 'toggle' },
        { path: 'gameplay.showHints', label: 'Show the getting-started checklist', type: 'toggle' },
        { path: 'gameplay.confirmClose', label: 'Ask before closing the tab', type: 'toggle',
          help: 'Catches an accidental Ctrl+W while crouch-walking.' },
      ],
    },
    audio: {
      label: 'Audio',
      note: 'Everything you hear is synthesised live: footsteps, wind, the city and the sea, and the challenge music. Radio stations arrive in Phase 19.',
      items: [
        { path: 'audio.master', label: 'Master', type: 'range', min: 0, max: 1, step: 0.05, format: pct },
        { path: 'audio.music', label: 'Music & radio', type: 'range', min: 0, max: 1, step: 0.05, format: pct },
        { path: 'audio.effects', label: 'Effects', type: 'range', min: 0, max: 1, step: 0.05, format: pct },
        { path: 'audio.ambience', label: 'Ambience', type: 'range', min: 0, max: 1, step: 0.05, format: pct },
        { path: 'audio.dialogue', label: 'Dialogue', type: 'range', min: 0, max: 1, step: 0.05, format: pct },
      ],
    },
    accessibility: {
      label: 'Accessibility',
      items: [
        { path: 'accessibility.textScale', label: 'Interface text size', type: 'range', min: 0.8, max: 1.5, step: 0.05, format: pct },
        { path: 'accessibility.subtitles', label: 'Subtitles', type: 'toggle' },
        { path: 'accessibility.subtitleSize', label: 'Subtitle size', type: 'range', min: 0.8, max: 1.8, step: 0.05, format: pct },
        { path: 'accessibility.colorBlind', label: 'Colour-blind friendly HUD', type: 'toggle',
          help: 'Health, armour and warnings use a blue/amber palette that reads for all common types.' },
        { path: 'accessibility.reducedFlashing', label: 'Reduce flashing effects', type: 'toggle' },
      ],
    },
    controls: { label: 'Controls', custom: true },
  };

  class UI {
    constructor(opts) {
      this.settings = opts.settings;
      this.input = opts.input;
      this.actions = opts.actions; // { newGame, resume, quitToTitle, getStats, toggleFullscreen }
      this.stack = [];
      this.current = null;
      this.screens = {};
      this._buildTitle();
      this._buildPause();
      this._buildSettings();
      this._buildStats();
      this._buildCredits();
      this._buildQuit();
      this._buildDialog();
      this._buildIntro();
      this._applyAccessibility();
      VH.events.on('settings:changed', (e) => {
        if (e.path.startsWith('accessibility') || e.path === '*') this._applyAccessibility();
        if (this.current === 'settings') this._refreshSettingsValues();
      });
      VH.events.on('ui:dialog', (e) => this.openDialog(e.id));
      VH.events.on('input:key', (e) => this._onKey(e));
    }

    // ------------------------------------------------------------- core
    _screen(id, cls) {
      const s = el('div', 'screen ' + (cls || ''));
      s.id = 'screen-' + id;
      document.body.append(s);
      this.screens[id] = s;
      return s;
    }

    show(id, push) {
      if (push && this.current) this.stack.push(this.current);
      for (const key of Object.keys(this.screens)) this.screens[key].classList.toggle('visible', key === id);
      this.current = id;
      const focusable = id && this.screens[id].querySelector('button:not([disabled])');
      if (focusable) focusable.focus({ preventScroll: true });
      if (id === 'settings') this._refreshSettingsValues();
      if (id === 'stats') this._refreshStats();
    }

    back() {
      this.input.cancelCapture();
      const prev = this.stack.pop();
      if (prev) this.show(prev);
      else if (this.current === 'settings' || this.current === 'stats') this.show(null);
    }

    hideAll() {
      this.stack = [];
      this.show(null);
    }

    _button(label, onClick, opts) {
      opts = opts || {};
      const b = el('button', 'btn menu-btn' + (opts.primary ? ' btn-primary' : ''));
      b.type = 'button';
      b.append(el('span', 'btn-label', label));
      if (opts.soon) {
        b.disabled = true;
        b.append(el('span', 'soon-badge', opts.soon));
        b.title = 'Arrives in ' + opts.soon;
      }
      if (onClick) b.addEventListener('click', (e) => {
        VH.events.emit('ui:click', {});
        onClick(e);
      });
      return b;
    }

    _onKey(e) {
      if (!e.down) return;
      if (this.dialogOpen && ['KeyE', 'Enter', 'Space', 'Escape'].includes(e.code)) {
        this.closeDialog();
        return;
      }
      if (this.input._capture) return;
      if (e.code === 'Escape' && (this.current === 'settings' || this.current === 'stats' || this.current === 'credits')) {
        this.back();
        return;
      }
      // Enter resumes from the pause menu (Esc can't: browsers keep it for leaving pointer lock).
      if (e.code === 'Enter' && this.current === 'pause' && document.activeElement && document.activeElement.tagName !== 'BUTTON') {
        this.actions.resume();
      }
    }

    // ------------------------------------------------------------ title
    _buildTitle() {
      const s = this._screen('title', 'screen-title');
      const logo = el('div', 'logo logo-title');
      logo.append(el('span', 'logo-word', 'VICEHAVEN'), el('span', 'logo-sub', 'A city that owes you nothing'));
      const menu = el('nav', 'menu title-menu');
      menu.append(
        this._button('New Game', () => this.actions.newGame(), { primary: true }),
        this._button('Continue', null, { soon: 'Phase 15' }),
        this._button('Load Game', null, { soon: 'Phase 15' }),
        this._button('Settings', () => this.show('settings', true)),
        this._button('Credits', () => this.show('credits', true)),
        this._button('Quit', () => this.show('quit', true))
      );
      const foot = el('div', 'title-footer');
      foot.append(
        el('span', '', VH.BUILD_NAME + ' · v' + VH.VERSION),
        el('span', 'title-footer-hint', VH.features.isEdge ? 'Running in Microsoft Edge ✓' : 'Built for Microsoft Edge')
      );
      const left = el('div', 'title-left');
      left.append(logo, menu);
      s.append(left, foot);
    }

    // ------------------------------------------------------------ pause
    _buildPause() {
      const s = this._screen('pause', 'screen-pause');
      const panel = el('div', 'panel pause-panel');
      const head = el('div', 'panel-head');
      head.append(el('h2', '', 'Paused'));
      this.pauseMeta = el('div', 'pause-meta');
      head.append(this.pauseMeta);
      const menu = el('nav', 'menu pause-menu');
      menu.append(
        this._button('Resume', () => this.actions.resume(), { primary: true }),
        this._button('Map', null, { soon: 'Phase 14' }),
        this._button('Missions', null, { soon: 'Phase 9' }),
        this._button('Inventory', null, { soon: 'Phase 7' }),
        this._button('Settings', () => this.show('settings', true)),
        this._button('Statistics', () => this.show('stats', true)),
        this._button('Save Game', null, { soon: 'Phase 15' }),
        this._button('Load Game', null, { soon: 'Phase 15' }),
        this._button('Quit to Menu', () => this.actions.quitToTitle())
      );
      this.abandonBtn = this._button('Abandon challenge', () => this.actions.abandonChallenge());
      this.abandonBtn.classList.add('btn-warn');
      menu.insertBefore(this.abandonBtn, menu.children[1]);
      const hint = el('div', 'pause-hint', 'Click Resume or press Enter to return to Vicehaven');
      panel.append(head, menu, hint);
      s.append(panel);
    }

    setChallengeActive(on) {
      this.abandonBtn.style.display = on ? '' : 'none';
    }

    setPauseMeta(text) {
      this.pauseMeta.textContent = text;
    }

    // --------------------------------------------------------- settings
    _buildSettings() {
      const s = this._screen('settings', 'screen-settings');
      const panel = el('div', 'panel settings-panel');
      const head = el('div', 'panel-head');
      head.append(el('h2', '', 'Settings'));
      const tabs = el('div', 'tabs');
      const body = el('div', 'settings-body');
      this.settingsControls = [];
      this.tabs = {};
      let first = true;
      for (const key of Object.keys(SETTINGS_SCHEMA)) {
        const group = SETTINGS_SCHEMA[key];
        const tab = el('button', 'tab' + (first ? ' active' : ''), group.label);
        tab.type = 'button';
        const pane = el('div', 'settings-pane' + (first ? ' active' : ''));
        tab.addEventListener('click', () => {
          for (const t of Object.values(this.tabs)) {
            t.tab.classList.remove('active');
            t.pane.classList.remove('active');
          }
          tab.classList.add('active');
          pane.classList.add('active');
        });
        this.tabs[key] = { tab, pane };
        tabs.append(tab);
        body.append(pane);
        if (group.note) pane.append(el('p', 'pane-note', group.note));
        if (group.custom) this._buildControlsPane(pane);
        else for (const item of group.items) pane.append(this._settingRow(item));
        first = false;
      }
      const foot = el('div', 'panel-foot');
      const reset = this._button('Reset all settings', () => {
        if (confirm('Reset every setting (including key bindings) to its default?')) this.settings.resetAll();
      });
      reset.classList.add('btn-ghost');
      const fs = this._button('Toggle fullscreen', () => this.actions.toggleFullscreen());
      fs.classList.add('btn-ghost');
      const back = this._button('Back', () => this.back(), { primary: true });
      foot.append(reset, fs, back);
      const storage = el('div', 'settings-storage', VH.settings.persistent ? 'Settings save automatically in this browser.' : 'This browser is blocking storage, so settings last until you close the tab.');
      panel.append(head, tabs, body, storage, foot);
      s.append(panel);
    }

    _settingRow(item) {
      const row = el('div', 'setting-row');
      const label = el('label', 'setting-label', item.label);
      const control = el('div', 'setting-control');
      let input;
      let valueEl = null;
      if (item.type === 'range') {
        input = el('input');
        input.type = 'range';
        input.min = item.min;
        input.max = item.max;
        input.step = item.step;
        valueEl = el('span', 'setting-value');
        input.addEventListener('input', () => {
          const v = parseFloat(input.value);
          valueEl.textContent = item.format ? item.format(v) : v;
          this.settings.set(item.path, v);
        });
        control.append(input, valueEl);
      } else if (item.type === 'select') {
        input = el('select');
        for (const [v, text] of item.options) {
          const o = el('option', '', text);
          o.value = String(v);
          input.append(o);
        }
        input.addEventListener('change', () => {
          const raw = input.value;
          const opt = item.options.find((o) => String(o[0]) === raw);
          const v = opt ? opt[0] : raw;
          if (item.preset) {
            if (v !== 'custom') this.settings.applyPreset(v);
          } else this.settings.set(item.path, v);
        });
        control.append(input);
      } else if (item.type === 'toggle') {
        input = el('input');
        input.type = 'checkbox';
        const sw = el('label', 'switch');
        sw.append(input, el('span', 'switch-track'));
        input.addEventListener('change', () => this.settings.set(item.path, input.checked));
        control.append(sw);
      }
      row.append(label, control);
      if (item.help || item.later || item.restart) {
        const later = item.later ? (item.later.startsWith('Phase') ? 'Arrives in ' + item.later + '.' : item.later) : '';
        const help = el('div', 'setting-help');
        help.textContent = [item.help, item.restart ? 'Applies after reloading the page.' : '', later].filter(Boolean).join(' ');
        row.append(help);
      }
      this.settingsControls.push({ item, input, valueEl });
      return row;
    }

    _refreshSettingsValues() {
      for (const c of this.settingsControls || []) {
        const v = this.settings.get(c.item.path);
        if (c.item.type === 'range') {
          c.input.value = v;
          c.valueEl.textContent = c.item.format ? c.item.format(v) : v;
        } else if (c.item.type === 'select') c.input.value = String(v);
        else if (c.item.type === 'toggle') c.input.checked = !!v;
      }
      this._refreshBindings();
    }

    _buildControlsPane(pane) {
      pane.append(el('p', 'pane-note', 'Click a key to rebind it, then press the new key or mouse button. Esc cancels, Backspace clears. Pause stays on Esc because the browser reserves it.'));
      const table = el('div', 'bindings');
      this.bindingButtons = [];
      let group = null;
      for (const action of Object.keys(VH.DEFAULT_BINDINGS)) {
        const info = VH.ACTION_INFO[action] || { label: action, group: 'Other' };
        if (info.group !== group) {
          group = info.group;
          table.append(el('div', 'bind-group', group));
        }
        const row = el('div', 'bind-row' + (info.later ? ' later' : ''));
        const name = el('div', 'bind-name', info.label);
        if (info.later) name.append(el('span', 'soon-badge', info.later.replace(' adds weapons', '')));
        row.append(name);
        for (let slot = 0; slot < 2; slot++) {
          const b = el('button', 'bind-key');
          b.type = 'button';
          if (info.fixed && slot === 0) b.disabled = true;
          b.addEventListener('click', () => this._rebind(action, slot, b));
          b.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.settings.setBinding(action, slot, null);
          });
          row.append(b);
          this.bindingButtons.push({ action, slot, b });
        }
        table.append(row);
      }
      const reset = this._button('Reset controls to defaults', () => this.settings.resetBindings());
      reset.classList.add('btn-ghost');
      pane.append(table, reset);
      pane.append(el('p', 'pane-note', 'Controllers (Xbox, PlayStation and most others) work automatically: left stick moves, right stick looks, A/Cross jumps, B/Circle crouches, L3 sprints, LT aims, RB changes camera, Y/Triangle interacts, Menu/Options pauses.'));
    }

    _refreshBindings() {
      for (const { action, slot, b } of this.bindingButtons || []) {
        const code = this.settings.get('controls.bindings')[action][slot];
        b.textContent = code ? VH.util.keyLabel(code) : '—';
        b.classList.toggle('empty', !code);
        b.classList.remove('listening');
      }
    }

    _rebind(action, slot, button) {
      button.textContent = 'Press a key…';
      button.classList.add('listening');
      this.input.captureNext((code, cancelled) => {
        if (!cancelled) {
          if (code === 'Backspace' || code === 'Delete') this.settings.setBinding(action, slot, null);
          else this.settings.setBinding(action, slot, code);
        }
        this._refreshBindings();
      });
    }

    _applyAccessibility() {
      const a = this.settings.data.accessibility;
      const root = document.documentElement;
      root.style.setProperty('--vh-text-scale', String(a.textScale));
      root.style.setProperty('--vh-subtitle-scale', String(a.subtitleSize));
      document.body.classList.toggle('cb-friendly', !!a.colorBlind);
      document.body.classList.toggle('reduced-flashing', !!a.reducedFlashing);
    }

    // ------------------------------------------------------------ stats
    _buildStats() {
      const s = this._screen('stats', 'screen-stats');
      const panel = el('div', 'panel stats-panel');
      const head = el('div', 'panel-head');
      head.append(el('h2', '', 'Statistics'));
      this.statsGrid = el('div', 'stats-grid');
      const foot = el('div', 'panel-foot');
      foot.append(this._button('Back', () => this.back(), { primary: true }));
      panel.append(head, this.statsGrid, el('p', 'pane-note', 'More statistics (vehicles, missions, accuracy, police escapes) are tracked as those systems arrive.'), foot);
      s.append(panel);
    }

    _refreshStats() {
      const list = this.actions.getStats();
      this.statsGrid.innerHTML = '';
      for (const [label, value] of list) {
        const cell = el('div', 'stat');
        cell.append(el('div', 'stat-value', value), el('div', 'stat-label', label));
        this.statsGrid.append(cell);
      }
    }

    // ---------------------------------------------------------- credits
    _buildCredits() {
      const s = this._screen('credits', 'screen-credits');
      const panel = el('div', 'panel credits-panel');
      const head = el('div', 'panel-head');
      head.append(el('h2', '', 'Credits'));
      const body = el('div', 'credits-body');
      const para = (t) => body.append(el('p', '', t));
      body.append(el('h3', '', 'VICEHAVEN'));
      para('An original open-world action game that runs in a browser tab. Every building, texture and person in it is generated from code — there are no downloaded assets.');
      para('Vicehaven, its districts, businesses, characters (including Jay Mercer) and story are fictional. Any resemblance to real places, brands or people is coincidental.');
      body.append(el('h3', '', 'Built with'));
      para('three.js r186 — © 2010–2026 three.js authors, MIT licence.');
      para('Fonts: whatever your system provides (Bahnschrift and Segoe UI on Windows).');
      body.append(el('h3', '', 'This build'));
      para(VH.BUILD_NAME + ' (v' + VH.VERSION + '): the engine, the downtown test city, Jay on foot, the camera, HUD and menus. Vehicles, traffic, pedestrians, combat, police and missions follow in later phases.');
      const foot = el('div', 'panel-foot');
      foot.append(this._button('Back', () => this.back(), { primary: true }));
      panel.append(head, body, foot);
      s.append(panel);
    }

    _buildQuit() {
      const s = this._screen('quit', 'screen-quit');
      const panel = el('div', 'panel quit-panel');
      panel.append(el('h2', '', 'Thanks for playing'), el('p', '', 'Browsers only let a page close tabs it opened itself, so close this tab whenever you like (Ctrl+W).'));
      const row = el('div', 'panel-foot');
      row.append(this._button('Try to close the tab', () => {
        window.close();
        setTimeout(() => this.actions.notify && this.actions.notify('Your browser kept the tab open — close it with Ctrl+W.'), 300);
      }));
      row.append(this._button('Back to Vicehaven', () => this.back(), { primary: true }));
      panel.append(row);
      s.append(panel);
    }

    // ----------------------------------------------------------- dialog
    _buildDialog() {
      this.dialog = el('div', 'dialog');
      this.dialogBox = el('div', 'dialog-box');
      this.dialog.append(this.dialogBox);
      document.body.append(this.dialog);
      this.dialogOpen = false;
    }

    openDialog(id) {
      const box = this.dialogBox;
      box.innerHTML = '';
      if (id === 'cityGuide') {
        const k = (a) => this.input.labelFor(a);
        box.append(el('div', 'dialog-kicker', 'Civic Plaza · Downtown'), el('h2', '', 'Vicehaven City Guide'));
        const p = (t) => box.append(el('p', '', t));
        p('You are standing in Civic Plaza, on the south side of Meridian Boulevard. The towers to the north line Grand Avenue; the tallest is Vicehaven Tower.');
        const ul = el('ul', 'dialog-list');
        const li = (b, t) => {
          const item = el('li');
          item.append(el('b', '', b), document.createTextNode(' ' + t));
          ul.append(item);
        };
        li('North', 'Downtown and Vicehaven Tower.');
        li('West', 'Old Market — brick shophouses and alleys.');
        li('South', 'Palm Crescent and Founders Park.');
        li('East', 'Harbor Point, the boardwalk and Oceanview Pier.');
        box.append(ul);
        const keys = el('div', 'dialog-keys');
        const kb = (label, action) => {
          const row = el('span', 'dk');
          row.append(el('kbd', '', action.map ? action.map(k).join(' ') : k(action)), document.createTextNode(' ' + label));
          keys.append(row);
        };
        kb('move', ['moveForward', 'moveLeft', 'moveBack', 'moveRight']);
        kb('sprint', 'sprint');
        kb('jump / climb', 'jump');
        kb('crouch', 'crouch');
        kb('aim', 'aim');
        kb('camera', 'camera');
        kb('interact', 'interact');
        kb('developer overlay', 'debug');
        box.append(keys);
        p('Cars, traffic, crowds, police and jobs are on their way. For now the city is yours to explore on foot.');
      }
      box.append(el('div', 'dialog-close', 'Press E, Enter or Space to close'));
      this.dialog.classList.add('visible');
      this.dialogOpen = true;
      VH.events.emit('ui:dialogopen', { id });
    }

    closeDialog() {
      if (!this.dialogOpen) return;
      this.dialog.classList.remove('visible');
      this.dialogOpen = false;
      VH.events.emit('ui:dialogclose', {});
    }

    // ------------------------------------------------------------ intro
    _buildIntro() {
      this.intro = el('div', 'intro-card');
      this.introPlace = el('div', 'intro-place');
      this.introLine = el('div', 'intro-line');
      this.intro.append(this.introPlace, this.introLine);
      document.body.append(this.intro);
    }

    showIntro(place, line) {
      this.introPlace.textContent = place;
      this.introLine.textContent = line;
      this.intro.classList.remove('visible');
      void this.intro.offsetWidth;
      this.intro.classList.add('visible');
      clearTimeout(this._introTimer);
      this._introTimer = setTimeout(() => this.intro.classList.remove('visible'), 4200);
    }
  }

  UI.SETTINGS_SCHEMA = SETTINGS_SCHEMA;
  VH.UI = UI;
})();
