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
          options: [['low', 'Off (fastest)'], ['medium', 'Medium: bloom and colour grading'], ['high', 'High: plus full-res bloom and film grain']],
          help: 'The glow on lamps, neon, lit windows and the sun, and the Vicehaven colour grade.' },
        { path: 'graphics.antialias', label: 'Anti-aliasing', type: 'toggle',
          help: 'Smooths jagged edges. With post-processing Off it applies after reloading the page.' },
        { path: 'graphics.filmGrain', label: 'Film grain', type: 'select', options: [['off', 'Off'], ['light', 'Light'], ['strong', 'Strong']],
          help: 'The fine flicker over the picture, like old film. Only with post-processing on High.' },
        { path: 'graphics.nightBrightness', label: 'Night brightness', type: 'range', min: 0.5, max: 2, step: 0.05, format: pct,
          help: 'How much the moon and street light brighten the city after dark. Turn it up if nights are hard to see on your screen.' },
        { path: 'graphics.fov', label: 'Field of view', type: 'range', min: 50, max: 90, step: 1, format: (v) => v + '°' },
        { path: 'graphics.showFps', label: 'Show FPS counter', type: 'toggle' },
      ],
    },
    gameplay: {
      label: 'Gameplay',
      items: [
        { path: 'gameplay.blood', label: 'Blood', type: 'select', options: [['lots', 'Lots'], ['some', 'Some'], ['off', 'Off']],
          help: 'Blood sprays, splats and pools when people are hurt. Bodies still fall as ragdolls with it off.' },
        { path: 'gameplay.difficulty', label: 'Difficulty', type: 'select', options: [['easy', 'Easy'], ['normal', 'Normal'], ['hard', 'Hard']],
          help: 'How well enemies and police shoot, how much damage Jay takes and how fast his health comes back.' },
        { path: 'gameplay.mouseSensitivity', label: 'Mouse sensitivity', type: 'range', min: 0.2, max: 3, step: 0.05, format: (v) => v.toFixed(2) + '×' },
        { path: 'gameplay.invertY', label: 'Invert vertical look', type: 'toggle' },
        { path: 'gameplay.gamepadSensitivity', label: 'Controller look speed', type: 'range', min: 0.3, max: 2.5, step: 0.05, format: (v) => v.toFixed(2) + '×' },
        { path: 'gameplay.aimAssist', label: 'Aim assist', type: 'toggle', help: 'Near misses on enemies are pulled onto target (more on a controller).' },
        { path: 'gameplay.cameraShake', label: 'Camera shake', type: 'toggle' },
        { path: 'gameplay.voicedDialogue', label: 'Voiced dialogue', type: 'toggle',
          help: 'Characters speak their lines with your browser\'s built-in voices (Edge\'s online voices sound best).' },
        { path: 'gameplay.policeVoice', label: 'Police radio voice', type: 'toggle', help: 'Dispatch reads its calls out loud during a chase.' },
        { path: 'gameplay.slowMotion', label: 'Slow-motion moments', type: 'toggle', help: 'Big crashes, takedowns and getting busted play for a beat in slow motion.' },
        { path: 'gameplay.timeOfDay', label: 'Time of day', type: 'select', options: [['cycle', 'Day and night cycle'], ['stopped', 'Stopped where it is']],
          help: 'Story scenes still set their own time. Stopped keeps the sky as it is now.' },
        { path: 'gameplay.weather', label: 'Weather', type: 'select', options: [['dynamic', 'Changing'], ['clear', 'Always clear'], ['rain', 'Rainy'], ['storm', 'Stormy']],
          help: 'Sun, cloud, rain and thunderstorms come and go. Wet roads are a little slippery.' },
        { path: 'gameplay.alwaysDay', label: 'Always daytime', type: 'toggle', help: 'Keeps the sun up: no night at all, even in story scenes. The Daytime key (T, or D-pad right) switches it in the game.' },
        { path: 'gameplay.showHints', label: 'Show the getting-started checklist', type: 'toggle' },
        { path: 'gameplay.confirmClose', label: 'Ask before closing the tab', type: 'toggle',
          help: 'Catches an accidental Ctrl+W while crouch-walking. Your progress is saved either way.' },
      ],
    },
    audio: {
      label: 'Audio',
      note: 'Everything you hear is synthesised live: engines, gunfire, sirens, the city and the sea, the score and all three radio stations. Dialogue is read by your browser\'s built-in voices (Gameplay → Voiced dialogue).',
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
        { path: 'accessibility.strongLanguage', label: 'Strong language', type: 'toggle',
          help: 'Off masks the swearing in subtitles (f**k) and leaves it out of voiced lines.' },
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
      this._buildWhatsNew();
      this._buildProgress();
      this._buildQuit();
      this._buildDialog();
      this._buildIntro();
      this._applyAccessibility();
      VH.events.on('settings:changed', (e) => {
        if (e.path.startsWith('accessibility') || e.path === '*') this._applyAccessibility();
        if (this.current === 'settings') this._refreshSettingsValues();
        if (e.path === 'gameplay.alwaysDay' || e.path === '*') this._refreshDaytime();
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
      if (id === 'progress') this._refreshProgress();
      if (id === 'pause') this._refreshDaytime();
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
      if (e.code === 'Escape' && (this.current === 'settings' || this.current === 'stats' || this.current === 'credits' || this.current === 'whatsnew' || this.current === 'progress')) {
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
      logo.append(el('span', 'logo-word', 'VICEHAVEN'), el('span', 'logo-sub', 'Ten and Two'));
      const menu = el('nav', 'menu title-menu');
      this.continueBtn = this._button('Continue', () => this.actions.continueGame(), { primary: true });
      this.continueInfo = el('span', 'continue-info');
      this.continueBtn.append(this.continueInfo);
      this.newGameBtn = this._button('New Game', () => {
        if (this.actions.hasSave && this.actions.hasSave() && !confirm('Start a new story? Your saved progress will be replaced when the game next saves.')) return;
        this.actions.newGame();
      });
      const news = this._button("What's new", () => this.show('whatsnew', true));
      news.classList.add('btn-new');
      menu.append(
        this.continueBtn,
        this.newGameBtn,
        news,
        this._button('Settings', () => this.show('settings', true)),
        this._button('Credits', () => this.show('credits', true)),
        this._button('Quit', () => this.show('quit', true))
      );
      const foot = el('div', 'title-footer');
      foot.append(
        el('span', '', 'v' + VH.VERSION.replace(/\.0$/, '') + ' · ' + VH.UPDATE_NAME),
        el('span', 'title-footer-hint', VH.features.isEdge ? 'Running in Microsoft Edge ✓' : 'Built for Microsoft Edge')
      );
      const left = el('div', 'title-left');
      left.append(logo, menu);
      s.append(left, foot);
    }

    /** Show or hide Continue (info: "Act 2 · 34% · $12,400" or null). */
    setContinue(info) {
      this.continueBtn.style.display = info ? '' : 'none';
      this.continueInfo.textContent = info || '';
      this.newGameBtn.classList.toggle('btn-primary', !info);
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
        this._button('City map', () => this.actions.openMap()),
        this._button('Photo mode', () => this.actions.photoMode && this.actions.photoMode()),
        (this.dayBtn = this._button('Daytime: Off', () => this.actions.toggleDaytime && this.actions.toggleDaytime())),
        this._button('Job log', () => this.openDialog('jobLog')),
        this._button('Settings', () => this.show('settings', true)),
        this._button('Progress', () => this.show('progress', true)),
        this._button('Statistics', () => this.show('stats', true)),
        this._button('Stuck? Back to the street', () => this.actions.unstick && this.actions.unstick()),
        this._button('Save game', () => this.actions.save()),
        this._button('Quit to Menu', () => this.actions.quitToTitle())
      );
      this.abandonBtn = this._button('Abandon', () => this.actions.abandonChallenge());
      this.abandonBtn.classList.add('btn-warn');
      menu.insertBefore(this.abandonBtn, menu.children[1]);
      const hint = el('div', 'pause-hint', 'Click Resume or press Enter to return to Vicehaven');
      panel.append(head, menu, hint);
      s.append(panel);
    }

    setChallengeActive(on, label) {
      this.abandonBtn.style.display = on ? '' : 'none';
      this.abandonBtn.querySelector('.btn-label').textContent = label || 'Abandon challenge';
    }

    setPauseMeta(text) {
      this.pauseMeta.textContent = text;
    }

    /** The pause menu's daytime button says what pressing it will leave you with. */
    _refreshDaytime() {
      if (!this.dayBtn || !this.actions.isDaytime) return;
      const on = this.actions.isDaytime();
      this.dayBtn.querySelector('.btn-label').textContent = on ? '☀ Daytime: On' : '☾ Daytime: Off';
      const key = this.actions.daytimeKey && this.actions.daytimeKey();
      this.dayBtn.title = (on ? 'The sun stays up' : 'Day and night cycle') + (key ? ' (' + key + ' in the game)' : '');
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

    // --------------------------------------------------------- progress
    _buildProgress() {
      const s = this._screen('progress', 'screen-progress');
      const panel = el('div', 'panel progress-panel');
      const head = el('div', 'panel-head');
      head.append(el('h2', '', 'Progress'));
      const top = el('div', 'progress-top');
      this.progRing = el('div', 'progress-ring');
      this.progPct = el('div', 'progress-pct');
      this.progRing.append(this.progPct);
      this.progCats = el('div', 'progress-cats');
      top.append(this.progRing, this.progCats);
      this.progAchHead = el('h3', 'progress-ach-head');
      this.progAch = el('div', 'progress-ach');
      const body = el('div', 'progress-body');
      body.append(top, this.progAchHead, this.progAch);
      const foot = el('div', 'panel-foot');
      foot.append(this._button('Back', () => this.back(), { primary: true }));
      panel.append(head, body, foot);
      s.append(panel);
    }

    _refreshProgress() {
      const p = this.actions.getProgress && this.actions.getProgress();
      if (!p) return;
      this.progPct.textContent = p.percent + '%';
      this.progRing.style.setProperty('--pct', Math.min(100, p.percent));
      this.progCats.textContent = '';
      for (const c of p.cats) {
        if (!c.total) continue;
        const row = el('div', 'progress-cat');
        const bar = el('div', 'progress-bar');
        const fill = el('div', 'progress-fill');
        fill.style.width = Math.round(Math.min(1, c.done / c.total) * 100) + '%';
        bar.append(fill);
        row.append(el('div', 'progress-cat-label', c.label), bar, el('div', 'progress-cat-num', c.done + ' / ' + c.total));
        this.progCats.append(row);
      }
      this.progAchHead.textContent = 'Achievements · ' + p.unlocked + ' of ' + p.total;
      this.progAch.textContent = '';
      let cat = null;
      for (const a of p.list) {
        if (a.cat !== cat) {
          cat = a.cat;
          this.progAch.append(el('div', 'progress-ach-cat', cat));
        }
        const card = el('div', 'ach-card' + (a.unlocked ? ' is-unlocked' : ''));
        const text = el('div', 'ach-card-text');
        text.append(el('div', 'ach-card-title', a.title), el('div', 'ach-card-how', a.how));
        card.append(el('div', 'ach-card-icon', a.unlocked ? a.icon : '🔒'), text, el('div', 'ach-card-date', a.unlocked ? a.unlocked : ''));
        this.progAch.append(card);
      }
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
      para(VH.BUILD_NAME + ' (v' + VH.VERSION + ', ' + VH.UPDATE_NAME + '): the full city from Crestline Estates to the Saltmarsh docks, Northgate Heights, the airport and Fort Breakwater, 19 cars, five aircraft and a tank, 23 weapons, 14 corner shops, three gun shops, four body shops, eight businesses (with upgrades), three chop shops, Street Rep with 50 levels, the Daily Hustles, paramedic, vigilante and courier odd jobs, street encounters, 40 cash stashes, Jay\'s phone, weather, 68 achievements, photo mode, traffic, crowds, the police, three radio stations, and the story of Jay Mercer: 31 main jobs in four acts, four side stories and the jobs in between.');
      const foot = el('div', 'panel-foot');
      foot.append(this._button('Back', () => this.back(), { primary: true }));
      panel.append(head, body, foot);
      s.append(panel);
    }

    /** What the open world update added, and where to find it. */
    _buildWhatsNew() {
      const s = this._screen('whatsnew', 'screen-whatsnew');
      const panel = el('div', 'panel credits-panel whatsnew-panel');
      const head = el('div', 'panel-head');
      head.append(el('h2', '', "What's new in v" + VH.VERSION.replace(/\.0$/, '')));
      const body = el('div', 'credits-body whatsnew-body');
      const item = (title, text) => {
        const row = el('div', 'whatsnew-item');
        row.append(el('h3', '', title), el('p', '', text));
        body.append(row);
      };
      body.append(el('p', 'whatsnew-lead', 'The Hustle update: there is always something to do now, and a lot more ways to make money. Press P for Jay\'s phone: today\'s Daily Hustles, your Street Rep, and everything worth doing near you, with the GPS one tap away.'));
      item('📱  Jay\'s phone (P)', 'The hub for everything new. Hustles shows today\'s three tasks and your streak, Rep shows your level and the perks still to come, Jobs lists what is worth doing near you right now (odd jobs, the chop shop hot list, races, bounties, taxi fares, paydays, story jobs) with Set GPS on each, and Bank shows where your money came from. The game pauses while it is open.');
      item('⭐  Street Rep', 'Everything you do earns Rep: story jobs, races, hold-ups, taxi fares, stunt jumps, odd jobs, chop shops, street encounters, stashes. 50 levels, quick at first. Every level pays $200 times the new level, and 25 perks come along the way: bigger paydays, better prices at the chop shop, more max health and armour, money off at Bayline Arms.');
      item('📅  Daily Hustles', 'Three tasks every in-game day (a day is 24 real minutes): sell a car from the hot list, finish two taxi fares, find a stash, win a race... Each pays $750 to $2,500 plus Rep. Finish all three for a streak bonus: $1,000 times the streak, up to 7 days in a row.');
      item('🔧  Busted Spanner chop shops', 'Three garages (the spanner on the map) buy any car you drive into the bay: about $400 for a hatchback up to $2,500 for a Zephyr, less if it is smashed up. Cars on today\'s hot list (Gus texts it to you) pay 2.5 times as much. Police cars sell too, but the police come looking.');
      item('🚑  Odd jobs', 'Get in an ambulance, a police car or a delivery van and press P to go on duty. Paramedic: pick up the injured and race them to Mercy General. Vigilante: chase down suspects and stop them. Courier: deliver parcels against the clock. Ten levels each, $150 to $500 a call plus tips, and clearing level 10 pays $5,000 and a perk for good. The vehicles wait at depots (the briefcase on the map).');
      item('❗  Street encounters', 'Every couple of minutes something happens near you: an armoured cash van to crack open, a mugging, someone who needs a lift, a street racer who wants a race, a lost wallet, a car thief, a tourist who wants a photo. Help people out, or keep the money.');
      item('💰  40 hidden cash stashes', 'Gold-glowing bags of cash hidden all over the city: on rooftops (take the stairs), on top of the containers at Meridian Yard, by the pier, behind the airport hangars, in Old Market alleys. $300 to $1,500 each; listen for the chime as you get close. Every 10 found marks 2 more on the map, and finding 20 and then all 40 pays a big bonus.');
      item('🏢  Business upgrades', 'Press E at the sign of a business you own to upgrade it: a new sign, a refit, then an expansion. Each one adds half its base takings again, so a fully upgraded business pays two and a half times as much, and the payday note shows what every upgrade and your Rep perk added.');
      body.append(el('h3', 'whatsnew-sub', 'Also new since v1.3'));
      item('🏁  A checkpoint at every objective', 'Fail a job and press E: you go back to the start of the objective you were on, not half the job ago. Everything is put back as it was then: who is still standing, which car you were in, your crew, the police if the job had them after you.');
      item('💰  Hold-ups, done properly', 'Aim a gun at a shop clerk and he fills a bank bag from the till, then throws it on the counter for you. Every clerk is different: nervous, steady (watch him, or he hits the silent alarm), stubborn, or a hero reaching for a shotgun (tap E to shout him down). Make him open the safe in the bigger shops, shoot out the CCTV camera for a clean job with no police, and watch the shoppers: one might run for help. Rob a shop too often and it hires a security guard.');
      item('🚪  Getting in, and carjacking', 'Doors open now: the car\'s own door swings out on its hinge (window, handle, badges and all) and you can see the seats inside. Jay pulls the handle, climbs in and the door shuts behind him: scissor doors on the Zephyr, a step up into vans and trucks, a canopy on the jet, a sliding door on the Sparrow, a hatch on the tank, and the old Pipit\'s door sticks. Steal a car with someone in it and Jay drags them out (punches first, sometimes), hauls them up out of a low sports car, pulls them down from a truck cab, or heaves them over the side of a jeep. Hold a gun and they get out with their hands up instead.');
      item('🛟  Stuck? Back to the street', 'Drive or fall into the bay and Jay is back on the nearest street a second or two later. Wedged somewhere else? Pause and pick Stuck? Back to the street.');
      body.append(el('h3', 'whatsnew-sub', 'Also new in v1.3'));
      item('🔫  12 new weapons', 'A golf club and a pry bar, the Jolt stun gun (drops people without hurting them), the Hornet PDW, a sawn-off and the Bull 12 auto shotgun, the Rhino machine gun, the Osprey marksman rifle with a scope, and a new Heavy slot (key 9): the Thunderhead rocket launcher, the Boomer grenade launcher and the Buzzsaw minigun. Plus limpet charges: stick them anywhere, press R to set them off.');
      item('🛒  Bayline Arms', 'Three gun shops. Walk up to the counter and press E for ammo, body armour and guns. New guns come into stock as the story goes on. Do not pull a gun on the clerk.');
      item('📦  Ammo everywhere', 'Guns that take the same rounds share their ammo. Weapons, ammo, armour and first aid lie around the city and come back a few minutes after you take them; enemies drop their guns; police cars and army trucks have spare ammo in the back. Story rewards top up ammo for guns you already have.');
      item('💥  Guns that kick', 'Every shot kicks the view, bullets leave holes and sparks, tracers you can see, shells fly out, enemies flinch and get thrown by big hits. Hit markers go gold for a headshot and red for a kill, with a sound to match. The sniper and marksman rifles have real scopes.');
      item('🎯  Aiming fixed', 'Jay holds long guns level at the shoulder (they used to point at the sky), turns to face where he shoots from the hip, and has a crosshair dot even without aiming. Enemies hold their guns properly and you can see them. Crouching in cover now really does protect people.');
      body.append(el('h3', 'whatsnew-sub', 'Also new in v1.2'));
      item('⛈  Weather, body shops, businesses', 'Rain and storms, Fresh Coat body shops (respray and lose the police), eight businesses to buy, 42 achievements with a Progress screen, and photo mode.');
      body.append(el('h3', 'whatsnew-sub', 'Also new since v1.0'));
      item('🗺  The map', 'Press M in the game for the full-screen map: a search box, filters, an info card for every place, pins, and a GPS bar with the drive time. Click anything to set your GPS.');
      item('✈  New aircraft and tank', 'The airliner, the Skylark, the Talon jet, both helicopters and the Bastion tank have all been rebuilt: real wings and engines, windows and doors, cockpits, liveries, tread links and camouflage. Airliner windows light up at night.');
      item('🗺  A brand new map', 'Search for places, shops and streets; filter what shows; click a place for how far it is and how long the drive takes; right-click to drop coloured pins (they show on the radar too). The game pauses while it is open, and it works with a controller.');
      item('✈  Vicehaven International', 'Drive north up Grand Avenue to the airport. Steal a Skylark plane or the Sparrow helicopter, or the big Albatross jet, and fly. Airliners take off and land every few minutes.');
      item('★  Fort Breakwater', 'The army base at the far west end of Meridian Boulevard. Tanks, army jeeps, a fighter jet and a gunship, if you can get past the soldiers. Five stars if you take one.');
      item('▮  Northgate Heights', 'Eight new skyscrapers just north of downtown on Skyline Drive, one with a helipad on the roof.');
      item('$  14 corner shops', 'Walk in, press E at the counter for snacks (they heal you), or aim a gun at the clerk to hold the shop up. Yellow bags on the map.');
      item('🚓  A busier city', 'Police chases tear past now and then, office workers fill the plazas, and a tour helicopter flies over the bay.');
      item('🛣  The roads out of town', 'Grand Avenue North and Meridian West are proper streets now: motels, diners, hotels and workshops, people, traffic and green signs pointing the way. Taxi fares go there too.');
      item('☀  Daytime at the press of a key', 'Night too dark? Press T (D-pad right on a controller) and the sun comes straight up and stays up. Press it again for day and night. It is in the pause menu too. Nights are a quarter brighter than before as well.');
      item('🎞  Less film grain', 'The grain over the picture is much lighter now. Settings → Graphics → Film grain turns it off, or back to Strong.');
      item('Flying', 'W/S throttle, A/D roll, Space/Ctrl nose up and down, mouse to look. Jump out high up and the parachute opens.');
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
        p('Press ' + k('vehicle') + ' next to a car to get in. Hold ' + k('weaponWheel') + ' for the weapon wheel, and ' + k('map') + ' opens the city map.');
      } else if (id === 'jobLog' && this.actions.jobLog) {
        const log = this.actions.jobLog();
        box.append(el('div', 'dialog-kicker', log.kicker), el('h2', '', 'Job log'));
        const ul = el('ul', 'dialog-list joblog');
        for (const row of log.rows) {
          const li = el('li', row.state);
          li.append(el('b', '', row.title), document.createTextNode(' ' + row.text));
          ul.append(li);
        }
        box.append(ul);
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

    /**
     * The end credits after the last job: the ending's name, the cast, the
     * player's own numbers, then back to the city. Any key past the first
     * few seconds skips to the end.
     */
    showCredits(info, onDone) {
      const root = el('div', 'credits-roll');
      const inner = el('div', 'credits-inner');
      const add = (cls, text) => {
        const e = el('div', cls, text || '');
        inner.append(e);
        return e;
      };
      add('credits-title', 'VICEHAVEN');
      add('credits-sub', 'Ten and Two');
      if (info.ending) add('credits-ending', info.ending);
      add('credits-gap');
      add('credits-head', 'Starring');
      for (const c of info.cast) {
        const r = el('div', 'credits-row');
        r.append(el('span', 'credits-role', c.role), el('span', 'credits-name', c.name));
        inner.append(r);
      }
      add('credits-gap');
      add('credits-head', 'Your Vicehaven');
      for (const [k, v] of info.stats) {
        const r = el('div', 'credits-row');
        r.append(el('span', 'credits-role', k), el('span', 'credits-name', v));
        inner.append(r);
      }
      add('credits-gap');
      add('credits-line', 'In memory of everyone who got left in the lot.');
      add('credits-gap');
      add('credits-last', 'Thanks for driving.');
      add('credits-hint', 'The city is still out there. Press E to keep driving.');
      root.append(inner);
      document.body.append(root);
      requestAnimationFrame(() => root.classList.add('visible'));
      const dur = Math.max(40, inner.childElementCount * 1.7);
      inner.style.animationDuration = dur + 's';
      const t0 = performance.now();
      const close = () => {
        window.removeEventListener('keydown', onKey, true);
        root.classList.remove('visible');
        setTimeout(() => root.remove(), 1200);
        if (onDone) onDone();
      };
      const onKey = (e) => {
        if (performance.now() - t0 < 4000) return;
        if (e.code === 'KeyE' || e.code === 'Escape' || e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          e.stopPropagation();
          close();
        }
      };
      window.addEventListener('keydown', onKey, true);
      inner.addEventListener('animationend', () => setTimeout(close, 6000));
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
