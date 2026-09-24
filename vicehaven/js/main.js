/*
 * main.js — boots the game and runs the main loop.
 *
 * Boot: check the browser → create the renderer → paint textures → lay out
 * and build the city (time-sliced, with a progress bar) → create Jay, the
 * camera, HUD and menus → compile shaders → title screen.
 *
 * States:  loading → title → intro → playing ⇄ paused
 *                                   playing → dialog → playing
 *
 * The loop separates update rates (see the Scheduler below):
 *   every frame   camera, animation, rendering
 *   60 Hz fixed   player physics (interpolated when drawn)
 *   15 Hz         interaction checks
 *   4 Hz          location/district lookups, prop distance culling
 * Later phases slot traffic, pedestrian AI and world events into the same
 * scheduler at their own rates.
 */
(function () {
  'use strict';

  const VH = window.VH;
  const FIXED_DT = 1 / 60;
  const CDN_THREE = 'https://cdn.jsdelivr.net/npm/three@0.186.0/build/three.module.js';

  const TIPS = [
    'Tip: Hold Shift to sprint. Press Space beside a low wall to climb it.',
    'Tip: Run at a waist-high wall and jump to vault it without stopping.',
    'Tip: Crouch is a toggle — tap Ctrl or C.',
    'Tip: Scroll the mouse wheel to move the camera closer or further away.',
    'Tip: F8 opens the developer overlay with FPS and a command console.',
    'Vicehaven: 312 days of sunshine a year. The other 53 are complicated.',
    'Tip: Settings → Graphics → Quality "Low" helps on older laptops.',
    'Harbor Point hotels offer a sea view, a pool and absolutely no questions.',
  ];

  // --------------------------------------------------------- scheduler
  /** Runs tasks at fixed rates independent of the frame rate. */
  class Scheduler {
    constructor() {
      this.tasks = [];
    }
    every(hz, fn) {
      this.tasks.push({ interval: 1 / hz, acc: Math.random() / hz, fn });
    }
    update(dt) {
      for (const t of this.tasks) {
        t.acc += dt;
        if (t.acc >= t.interval) {
          const elapsed = t.acc;
          t.acc = t.acc % t.interval;
          t.fn(elapsed);
        }
      }
    }
  }

  // ------------------------------------------------------ loading UI
  const Loading = {
    bar: null,
    status: null,
    step: null,
    tip: null,
    init() {
      this.bar = document.getElementById('loading-bar');
      this.status = document.getElementById('loading-status');
      this.step = document.getElementById('loading-step');
      this.tip = document.getElementById('loading-tip');
      let i = Math.floor(Math.random() * TIPS.length);
      this.tip.textContent = TIPS[i];
      this._tipTimer = setInterval(() => {
        i = (i + 1) % TIPS.length;
        this.tip.textContent = TIPS[i];
      }, 3800);
    },
    set(p, label) {
      this.bar.style.width = (Math.max(0, Math.min(1, p)) * 100).toFixed(1) + '%';
      if (label) this.step.textContent = label;
    },
    done() {
      clearInterval(this._tipTimer);
      document.getElementById('screen-loading').classList.remove('visible');
    },
  };

  // ------------------------------------------------------------ errors
  function webglHelp() {
    return (
      '<p>Vicehaven needs <b>WebGL 2</b> (hardware-accelerated 3D graphics). To turn it on in Microsoft Edge:</p>' +
      '<ol><li>Open <code>edge://settings/system</code></li>' +
      '<li>Switch on <b>Use graphics acceleration when available</b> and restart Edge</li>' +
      '<li>Check <code>edge://gpu</code> — "WebGL2" should say <i>Hardware accelerated</i></li></ol>' +
      '<p>Updating your graphics driver (Windows Update → Advanced options → Optional updates) also often fixes this.</p>'
    );
  }

  async function ensureThree() {
    if (window.THREE && window.THREE.WebGLRenderer) return;
    // The bundled copy is missing: try the CDN (needs an internet connection).
    Loading.set(0.01, 'Fetching three.js from the CDN');
    try {
      const mod = await import(CDN_THREE);
      window.THREE = mod;
    } catch (err) {
      const e = new Error('three.js could not be loaded (js/lib/three.min.js is missing and the CDN is unreachable).');
      e.code = 'NO_THREE';
      e.cause = err;
      throw e;
    }
  }

  // --------------------------------------------------------------- game
  const Game = {
    state: 'boot',
    fps: 0,
    frameMs: 16.7,
    cpuMs: 0,
    playTime: 0,
    _acc: 0,
    _last: 0,
    _frames: 0,
    _fpsTimer: 0,
    _lookedAround: 0,
    _statePausedAt: 0,

    async boot() {
      Loading.init();
      if (VHBoot.fatalShown) return; // a file failed to load; its message is already on screen
      Loading.set(0.005, 'Checking your browser');
      await VH.util.nextFrameOrTimeout(30);
      await ensureThree();
      if (!VH.features.webgl2) {
        VHBoot.fatal('Your browser can\'t run 3D graphics right now', 'WebGL 2 is not available.', webglHelp(), VH.features.webgl2Error || navigator.userAgent);
        return;
      }
      VH.util.loadKeyboardLayout();

      const settings = (this.settings = VH.settings);
      const canvas = document.getElementById('game-canvas');
      this.input = new VH.Input(canvas, settings);
      this.renderer = new VH.Renderer(canvas, settings);
      try {
        this.renderer.init();
      } catch (err) {
        VHBoot.fatal('Your browser can\'t run 3D graphics right now', err.message, webglHelp(), String(err.stack || err));
        return;
      }
      VH.PropSystem.init();
      const scene = (this.scene = new THREE.Scene());
      scene.name = 'Vicehaven';

      // Textures and materials.
      Loading.status.textContent = 'Loading city...';
      await VH.Textures.generate(this.renderer.maxAnisotropy, (p, label) => Loading.set(0.02 + p * 0.1, label));
      const materials = VH.Materials.create(VH.Textures.list);
      materials._anisotropy = this.renderer.maxAnisotropy;
      this.materials = materials;

      // Sky and light.
      Loading.set(0.13, 'Hanging the sun');
      this.environment = new VH.Environment(scene, this.renderer, settings, VH.Materials.shared);
      this.environment.init();
      await VH.util.nextFrameOrTimeout(30);

      // The city.
      Loading.set(0.15, 'Drawing the street plan');
      this.layout = VH.CityGen.generate('vicehaven');
      this.physics = new VH.CollisionWorld(16);
      this.world = new VH.World(scene, materials, this.physics, settings);
      await this.world.build(this.layout, (p, label) => Loading.set(0.16 + p * 0.72, label));

      // Jay, the camera and the systems around him.
      Loading.set(0.89, 'Jay Mercer is on his way');
      this.player = new VH.Player(scene, this.physics, this.input, settings);
      this.player.spawn(this.layout.spawn);
      this.player.surfaceResolver = (x, z, col) => this.world.surfaceAt(x, z, col);
      this.audio = new VH.AudioEngine(settings);
      this.cameraRig = new VH.CameraRig(this.renderer.camera, this.physics, settings, this.input);
      this.cameraRig.snapBehind(this.player);
      this.interaction = new VH.InteractionSystem(this.player, this.input);
      this.interaction.registerAll(this.world.interactables);

      this.hud = new VH.HUD(document.createElement('div'), this.input, settings);
      document.body.append(this.hud.root);
      this.ui = new VH.UI({
        settings,
        input: this.input,
        actions: {
          newGame: () => this.newGame(),
          resume: () => this.resume(),
          quitToTitle: () => this.quitToTitle(),
          getStats: () => this.statsList(),
          abandonChallenge: () => {
            this.challenges.abandon();
            this.resume();
          },
          challengeActive: () => this.challenges && this.challenges.active,
          toggleFullscreen: () => this.toggleFullscreen(),
          notify: (text) => this.hud.notify({ title: 'Vicehaven', text }),
        },
      });
      this.debug = new VH.DebugOverlay(this);
      this.challenges = new VH.ChallengeSystem(this);
      this.challenges.init();

      // Warm up: reflections, then compile every shader before the first frame.
      Loading.set(0.93, 'Mixing the sunset');
      this.environment.update(0, new THREE.Vector3(this.layout.spawn.x, 0, this.layout.spawn.z));
      this.world.setNightFactor(this.environment.shared.uWindowGlow.value);
      this.cameraRig.titleShot(0, this._titleCenter());
      Loading.set(0.96, 'Compiling shaders');
      await this.renderer.precompile(scene);
      Loading.set(1, 'Welcome to Vicehaven');

      this._bindEvents();
      this._setupScheduler();
      this._installRuntimeErrorHandler();

      await VH.util.nextFrameOrTimeout(60);
      Loading.done();
      this.toTitle();
      this._last = performance.now();
      requestAnimationFrame((t) => this._frame(t));
      console.info('[Vicehaven] ready in ' + ((performance.now() - VHBoot.started) / 1000).toFixed(1) + ' s —',
        this.world.stats.buildings, 'buildings,', this.world.stats.props, 'props,', this.world.stats.colliders, 'colliders');
    },

    _titleCenter() {
      return { x: 40, z: -150 };
    },

    _setupScheduler() {
      const s = (this.scheduler = new Scheduler());
      s.every(15, () => {
        if (this.state === 'playing') this.interaction.update();
      });
      s.every(4, () => {
        const p = this.player.pos;
        this._district = this.world.districtAt(p.x, p.z);
        this._road = this.world.roadNameAt(p.x, p.z);
        this._place = this.world.placeAt(p.x, p.z);
      });
    },

    _bindEvents() {
      // Sound effects follow gameplay events.
      const audio = this.audio;
      VH.events.on('player:step', (e) => audio.footstep(e.surface, e.speed));
      VH.events.on('player:jump', () => audio.jump());
      VH.events.on('player:land', (e) => audio.land(e.impact, e.surface));
      VH.events.on('player:climb', () => audio.climb());
      VH.events.on('interaction:used', (e) => {
        if (e.item.kind === 'vending') audio.purchase();
        else audio.click();
      });
      VH.events.on('ui:click', () => audio.click());
      VH.events.on('input:lockchange', (e) => {
        if (!e.locked && this.state === 'playing' && !this.debug.inputEl.matches(':focus')) this.pause();
      });
      VH.events.on('input:lockerror', () => {
        if (this.state === 'playing') this.hud.showToast('Click the game to capture the mouse');
      });
      document.getElementById('game-canvas').addEventListener('click', () => {
        if (this.state === 'playing' && !this.input.locked) this.input.requestLock();
      });
      VH.events.on('player:died', () => {
        this.hud.notify({ title: 'Knocked out', text: 'Take it easy on those drops.', icon: '✕', tone: 'bad' });
      });
      VH.events.on('ui:dialogopen', () => {
        document.body.classList.add('dialog-open');
        if (this.state === 'playing') {
          this.state = 'dialog';
          this.input.enabled = false;
        }
      });
      VH.events.on('ui:dialogclose', () => {
        document.body.classList.remove('dialog-open');
        if (this.state === 'dialog') {
          this.state = 'playing';
          this.input.enabled = true;
          this.input.clearPresses();
        }
      });
      VH.events.on('settings:changed', () => {
        this._needsRender = true;
      });
      VH.events.on('renderer:resize', () => {
        this._needsRender = true;
      });
      VH.events.on('renderer:contextlost', () => {
        this.hud.notify({ title: 'Graphics reset', text: 'The graphics driver restarted. If the picture doesn\'t come back, reload the page.', icon: '⚠', tone: 'bad', duration: 8000 });
      });
      window.addEventListener('beforeunload', (e) => {
        if ((this.state === 'playing' || this.state === 'paused' || this.state === 'dialog') && this.settings.get('gameplay.confirmClose')) {
          e.preventDefault();
          e.returnValue = '';
        }
      });
      document.addEventListener('visibilitychange', () => {
        if (document.hidden && this.state === 'playing') this.pause();
      });
    },

    _installRuntimeErrorHandler() {
      let shown = false;
      VHBoot.runtimeErrorHandler = (err, message) => {
        console.error('[Vicehaven] runtime error:', err);
        if (shown || !this.hud) return;
        shown = true;
        this.hud.notify({ title: 'Something went wrong', text: message + ' — the game will try to keep running. Details are in the console (F12).', icon: '⚠', tone: 'bad', duration: 10000 });
        setTimeout(() => {
          shown = false;
        }, 10000);
      };
    },

    // ------------------------------------------------------------ states
    toTitle() {
      this.state = 'title';
      this.environment.setShadowExtent(260);
      this.input.enabled = false;
      this.hud.show(false);
      this.ui.hideAll();
      this.ui.show('title');
      document.body.classList.add('in-menu');
    },

    newGame() {
      this.input.requestLock();
      this.audio.unlock();
      this.audio.setPaused(false);
      this.environment.setShadowExtent(null);
      this.ui.hideAll();
      document.body.classList.remove('in-menu');
      this.player.money = 2500;
      this.player.armor = 0;
      this.player.respawn();
      this.cameraRig.snapBehind(this.player);
      this.cameraRig.modeIndex = 0;
      this.cameraRig.zoom = 0;
      this.playTime = 0;
      this.hud.resetChecklist();
      this.hud.show(true);
      this.hud.setFade(1, 0);
      this.state = 'intro';
      this._introTime = 0;
      this.ui.showIntro('Civic Plaza, Downtown · ' + this.environment.clockText(), 'Jay Mercer is back in Vicehaven.');
      requestAnimationFrame(() => this.hud.setFade(0, 1400));
    },

    _startPlaying() {
      this.state = 'playing';
      this.input.enabled = true;
      this.input.clearPresses();
      this.input.takeMouseDelta();
      this._acc = 0;
      if (!this.input.locked) this.input.requestLock();
      this.hud.notify({ title: 'Welcome back, Jay', text: 'Try the checklist on the right. Press ' + this.input.labelFor('interact') + ' at the city guide for directions.', icon: '☀', duration: 6500 });
    },

    pause() {
      if (this.state !== 'playing' && this.state !== 'dialog') return;
      if (this.ui.dialogOpen) this.ui.closeDialog();
      this.state = 'paused';
      this.audio.setPaused(true);
      this._statePausedAt = performance.now();
      this.input.enabled = false;
      this.input.releaseAll();
      this.input.exitLock();
      const d = this._district || this.world.districtAt(this.player.pos.x, this.player.pos.z);
      this.ui.setPauseMeta(this.player.name + ' · ' + VH.util.formatMoney(this.player.money) + ' · ' + (this._place || d.name));
      this.ui.hideAll();
      this.ui.setChallengeActive(this.challenges.active);
      this.ui.show('pause');
      document.body.classList.add('in-menu');
      this._needsRender = true;
    },

    resume() {
      if (this.state !== 'paused') return;
      this.input.requestLock();
      this.audio.setPaused(false);
      this.ui.hideAll();
      document.body.classList.remove('in-menu');
      this.state = 'playing';
      this.input.enabled = true;
      this.input.clearPresses();
      this.input.takeMouseDelta();
      this._acc = 0;
    },

    quitToTitle() {
      this.challenges.abandon(true);
      this.input.exitLock();
      this.audio.setPaused(false);
      this.audio.stopMusic(0.2);
      this.toTitle();
    },

    toggleFullscreen() {
      const doc = document;
      if (!doc.fullscreenElement) {
        doc.documentElement.requestFullscreen().then(() => {
          // In fullscreen, Edge lets the page keep keys like Ctrl+W instead of closing the tab.
          if (navigator.keyboard && navigator.keyboard.lock) navigator.keyboard.lock(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Escape']).catch(() => {});
        }).catch(() => {});
      } else {
        if (navigator.keyboard && navigator.keyboard.unlock) navigator.keyboard.unlock();
        doc.exitFullscreen().catch(() => {});
      }
    },

    statsList() {
      const s = this.player.stats;
      const km = (m) => (m >= 1000 ? (m / 1000).toFixed(2) + ' km' : Math.round(m) + ' m');
      const t = Math.floor(this.playTime);
      const time = Math.floor(t / 3600) + 'h ' + String(Math.floor((t % 3600) / 60)).padStart(2, '0') + 'm ' + String(t % 60).padStart(2, '0') + 's';
      return [
        ['Time played', time],
        ['Distance on foot', km(s.distanceOnFoot)],
        ['Distance sprinted', km(s.sprintDistance)],
        ['Jumps', String(s.jumps)],
        ['Ledges climbed', String(s.climbs)],
        ['Walls vaulted', String(s.vaults)],
        ['Longest fall', s.longestFall.toFixed(1) + ' m'],
        ['Times knocked out', String(s.deaths)],
        ['Challenges finished', String(s.challengesCompleted || 0)],
        ['Money', VH.util.formatMoney(this.player.money)],
      ];
    },

    // ------------------------------------------------- test/debug hooks
    /**
     * Automated tests freeze the real loop and drive time themselves, so
     * results don't depend on how fast the machine renders.
     */
    freeze(on) {
      this.frozen = !!on;
    },

    /** Advance the game by `seconds` of simulated time without rendering. */
    advance(seconds) {
      const steps = Math.round(seconds / FIXED_DT);
      for (let i = 0; i < steps; i++) {
        this.input.pollGamepad();
        if (this.input.consume('debug')) this.debug.toggle();
        if (this.state === 'playing') this.cameraRig.handleInput(FIXED_DT, this.player.aiming);
        if (this.state === 'intro') {
          this._introTime += FIXED_DT;
          if (this._introTime > 2.2) this._startPlaying();
        }
        if (this.state === 'playing') this.challenges.update(FIXED_DT);
        this._acc = 0;
        this._simulate(FIXED_DT, this.state === 'playing');
        this.player.updateVisual(FIXED_DT, 1, this.cameraRig.pitch);
        this.cameraRig.update(FIXED_DT, this.player);
        this.world.update(FIXED_DT, this.renderer.camera.position);
        this.environment.update(FIXED_DT, this.player.renderPos);
      }
    },

    /** Draw one frame of the current state right now (used for screenshots). */
    renderOnce() {
      if (this.state === 'title') this.cameraRig.titleShot(this._titleTime || 0, this._titleCenter());
      else {
        this.player.updateVisual(0, 1, this.cameraRig.pitch);
        this.cameraRig.update(1 / 60, this.player);
        this.hud.update(0, {
          player: this.player, district: this.world.districtAt(this.player.pos.x, this.player.pos.z),
          road: this.world.roadNameAt(this.player.pos.x, this.player.pos.z), place: this.world.placeAt(this.player.pos.x, this.player.pos.z),
          fps: this.fps, locked: true, playing: true, lookedAround: false,
        });
      }
      this.world.update(1, this.renderer.camera.position);
      this.environment.update(0, this.state === 'title' ? new THREE.Vector3(40, 0, -150) : this.player.renderPos);
      if (this.renderer.post) this.renderer.post.flash = 0; // stills shouldn't catch a flash mid-fade
      this.renderer.render(this.scene, 1 / 60);
    },

    // -------------------------------------------------------------- loop
    _frame(now) {
      requestAnimationFrame((t) => this._frame(t));
      const rawDt = (now - this._last) / 1000;
      this._last = now;
      if (this.frozen) return;
      const dt = Math.min(Math.max(rawDt, 0), 0.1);
      const cpuStart = performance.now();
      try {
        this._update(dt);
      } catch (err) {
        if (VHBoot.runtimeErrorHandler) VHBoot.runtimeErrorHandler(err, err && err.message ? err.message : String(err));
        else throw err;
      }
      this.cpuMs = this.cpuMs * 0.9 + (performance.now() - cpuStart) * 0.1;
      this.frameMs = this.frameMs * 0.9 + rawDt * 1000 * 0.1;
      this.debug.recordFrame(rawDt * 1000);
      this._frames++;
      this._fpsTimer += rawDt;
      if (this._fpsTimer >= 0.5) {
        this.fps = Math.round(this._frames / this._fpsTimer);
        this._frames = 0;
        this._fpsTimer = 0;
      }
    },

    _update(dt) {
      const input = this.input;
      input.pollGamepad();

      // Global keys: pause and the developer overlay.
      if (input.consume('debug')) this.debug.toggle();
      // (In menus, Esc is handled by ui.js; resuming needs a click or Enter,
      // because browsers only grant pointer lock from a real user gesture.)
      if (input.consume('pause')) {
        const recent = performance.now() - this._statePausedAt < 400;
        if ((this.state === 'playing' || this.state === 'dialog') && !recent) this.pause();
      }

      const env = this.environment;
      switch (this.state) {
        case 'title': {
          this._titleTime = (this._titleTime || 0) + dt;
          this.cameraRig.titleShot(this._titleTime, this._titleCenter());
          const c = this._titleCenter();
          const focus = this._tmpFocus || (this._tmpFocus = new THREE.Vector3());
          focus.set(c.x, 0, c.z);
          env.update(dt, focus);
          this.world.update(dt, this.renderer.camera.position);
          this.player.updateVisual(dt, 1, 0);
          this.audio.update(dt, { playing: false, height: 0, speed: 0, sea: 0 });
          this.renderer.render(this.scene, dt);
          break;
        }
        case 'intro': {
          this._introTime += dt;
          this._simulate(dt, false);
          this._drawGameplay(dt, true);
          if (this._introTime > 2.2) this._startPlaying();
          break;
        }
        case 'playing':
        case 'dialog': {
          this.playTime += dt;
          if (this.state === 'playing') {
            this.cameraRig.handleInput(dt, this.player.aiming);
            this._laterFeatureHints();
            this.challenges.update(dt);
          } else input.takeMouseDelta();
          this._simulate(dt, true);
          this._drawGameplay(dt, false);
          break;
        }
        case 'paused': {
          // Nothing moves; redraw only when something (settings, window size) changed.
          if (this._needsRender) {
            this.renderer.render(this.scene, dt);
            this._needsRender = false;
          }
          break;
        }
        default:
          break;
      }
      this.debug.update(dt);
    },

    /** Keys for systems that arrive in later phases say so, instead of doing nothing. */
    _laterFeatureHints() {
      const LATER = {
        map: 'The map arrives in Phase 14',
        phone: 'The phone arrives in Phase 16',
        weaponWheel: 'Weapons arrive in Phase 7',
        reload: 'Weapons arrive in Phase 7',
        vehicle: 'Vehicles arrive in Phase 4',
        horn: 'Vehicles arrive in Phase 4',
        lights: 'Vehicles arrive in Phase 4',
      };
      for (const action of Object.keys(LATER)) {
        if (this.input.consume(action)) this.hud.showToast(LATER[action]);
      }
      for (let i = 1; i <= 6; i++) this.input.discard('weapon' + i);
      this.input.discard('fire');
    },

    /** Fixed-step simulation plus the scheduled tasks. */
    _simulate(dt, live) {
      this._acc += dt;
      let steps = 0;
      while (this._acc >= FIXED_DT && steps < 5) {
        this.player._camPitch = this.cameraRig.pitch;
        this.player.fixedUpdate(FIXED_DT, this.cameraRig.yaw);
        this._acc -= FIXED_DT;
        steps++;
      }
      if (steps === 5) this._acc = 0; // far behind (e.g. after a hitch): drop the backlog
      this.scheduler.update(dt);

      if (live) {
        // Knocked out: respawn after a pause.
        if (this.player.isDead && !this.challenges.active && this.player.deadTime > 4.5) {
          this.hud.setFade(1, 400);
          if (this.player.deadTime > 5.1) {
            this.player.respawn();
            this.cameraRig.snapBehind(this.player);
            this.hud.setFade(0, 900);
            this.hud.notify({ title: 'Back on your feet', text: 'You come to in ' + (this.world.placeAt(this.player.pos.x, this.player.pos.z) || 'the city') + '.', icon: '✚' });
          }
        }
        // "Look around" counts as done after a little mouse movement.
        this._lookedAround += Math.abs(this.cameraRig.yaw - (this._lastYaw || this.cameraRig.yaw));
        this._lastYaw = this.cameraRig.yaw;
      }
    },

    _drawGameplay(dt, intro) {
      const alpha = this._acc / FIXED_DT;
      const player = this.player;
      player.updateVisual(dt, alpha, this.cameraRig.pitch);
      if (intro) {
        // Settle from a high establishing shot down behind Jay.
        const t = VH.math.smoothstep(0, 2.2, this._introTime);
        this.cameraRig.update(dt, player);
        const cam = this.renderer.camera;
        const from = this._introFrom || (this._introFrom = new THREE.Vector3());
        from.set(player.pos.x - 30, player.pos.y + 38, player.pos.z + 50);
        const to = cam.position.clone();
        cam.position.lerpVectors(from, to, t);
        const look = new THREE.Vector3(player.renderPos.x, player.renderPos.y + 1.4, player.renderPos.z);
        if (t < 0.999) {
          const q0 = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(cam.position, look, new THREE.Vector3(0, 1, 0)));
          const q1 = cam.quaternion.clone();
          cam.quaternion.slerpQuaternions(q0, q1, t * t);
        }
        cam.updateMatrixWorld();
      } else {
        this.cameraRig.update(dt, player);
      }
      this.world.update(dt, this.renderer.camera.position);
      this.environment.update(dt, player.renderPos);
      if (this.environment.clockRunning) this.world.setNightFactor(this.environment.shared.uWindowGlow.value);
      const d = this._district || this.world.districtAt(player.pos.x, player.pos.z);
      this.hud.update(dt, {
        player,
        district: d,
        road: this._road,
        place: this._place,
        fps: this.fps,
        locked: this.input.locked,
        playing: this.state === 'playing',
        lookedAround: this._lookedAround > 1.2,
      });
      const px = player.pos.x;
      const pier = this.layout.waterfront.pier;
      const onPier = px > pier.x0 && Math.abs(player.pos.z) < 30 ? 1 : 0;
      this.audio.update(dt, {
        playing: this.state === 'playing',
        height: player.pos.y,
        speed: player.speed,
        sea: Math.max(onPier, VH.math.smoothstep(250, 420, px)),
      });
      this.renderer.render(this.scene, dt);
    },
  };

  VH.Game = Game;
  VH.game = Game; // handy from the browser console: VH.game.player.pos

  function start() {
    Game.boot().catch((err) => {
      console.error(err);
      if (err && err.code === 'NO_THREE') {
        VHBoot.fatal('A game file is missing', err.message,
          '<p>The file <code>js/lib/three.min.js</code> should be inside the vicehaven folder. Re-download or re-extract the game, or connect to the internet so it can be fetched from the CDN.</p>',
          String(err.cause || ''));
      } else {
        VHBoot.fatal('Vicehaven couldn\'t start', err && err.message ? err.message : String(err),
          '<p>Try reloading the page. If it keeps happening, the details below will help track it down.</p>',
          err && err.stack ? err.stack : String(err));
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
