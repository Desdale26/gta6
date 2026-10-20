/*
 * weather.js — clear skies, cloud, rain and thunderstorms over Vicehaven.
 *
 * A world system (main.js WORLD_SYSTEMS). The sky drifts between states
 * every few minutes, easing from one to the next:
 *   clear → cloudy → overcast → rain → storm (and back)
 * Bad weather dims the sun and greys the sky (environment.setWeather),
 * thickens the fog, makes the roads wet (darker and shiny, and a little
 * slippery for cars: VH.weatherGrip), and brings rain: streaks falling round
 * the camera, the hiss and drum of it, lightning flashes and thunder.
 * Under a roof the rain stops falling in front of you and sounds muffled.
 *
 * Settings → Gameplay → Weather: Changing (the default), Always clear,
 * Rainy or Stormy.
 */
(function () {
  'use strict';

  const VH = window.VH;
  const { clamp, lerp } = VH.math;

  // cloud, dim and fog feed the environment; rain is how hard it falls.
  const STATES = {
    clear: { cloud: 0.0, dim: 0.0, fog: 0.0, rain: 0, storm: false, weight: 40, name: 'Clear' },
    cloudy: { cloud: 0.55, dim: 0.12, fog: 0.08, rain: 0, storm: false, weight: 24, name: 'Cloudy' },
    overcast: { cloud: 0.9, dim: 0.38, fog: 0.28, rain: 0, storm: false, weight: 12, name: 'Overcast' },
    rain: { cloud: 0.95, dim: 0.55, fog: 0.5, rain: 0.6, storm: false, weight: 15, name: 'Rain' },
    storm: { cloud: 1.0, dim: 0.72, fog: 0.7, rain: 1, storm: true, weight: 9, name: 'Thunderstorm' },
  };
  const ORDER = ['clear', 'cloudy', 'overcast', 'rain', 'storm'];
  const BLEND = 35; //     seconds to ease into the next weather
  const HOLD = [150, 330]; // seconds each weather lasts (real time)
  const DROPS = 7000; //   rain streaks at full strength
  const BOX = [56, 30, 56]; // the box of rain kept round the camera (m)
  const WET_SURFACES = ['road', 'asphaltTop', 'sidewalk', 'plaza', 'concrete', 'markings'];

  const RAIN_VERTEX = /* glsl */ `
    attribute float aEnd;
    uniform float uTime;
    uniform vec3 uBox;
    uniform vec3 uCam;
    uniform vec2 uWind;
    uniform float uFall;
    uniform float uLen;
    varying float vFade;
    void main() {
      vec3 p = position * uBox;
      p.y -= uTime * uFall;
      p.xz += uWind * uTime;
      // Keep every drop in a box round the camera (the whole streak wraps as one).
      vec3 origin = uCam - uBox * 0.5;
      p = origin + mod(p - origin, uBox);
      vec3 vel = normalize(vec3(uWind.x, -uFall, uWind.y));
      p -= vel * uLen * aEnd;
      float d = length(p - uCam);
      vFade = (1.0 - aEnd * 0.85) * smoothstep(27.0, 6.0, d) * smoothstep(0.6, 2.0, d);
      gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
    }
  `;
  const RAIN_FRAGMENT = /* glsl */ `
    uniform vec3 uColor;
    uniform float uAlpha;
    varying float vFade;
    void main() {
      gl_FragColor = vec4(uColor, uAlpha * vFade);
    }
  `;

  class Weather {
    constructor(game) {
      this.game = game;
      this.saveKey = 'weather';
      this.ok = !!(game.environment && game.environment.setWeather);
      this.cur = Object.assign({}, STATES.clear);
      this.from = Object.assign({}, STATES.clear);
      this.state = 'clear';
      this.blend = 1;
      this.holdT = this._hold() + 120; // a dry first few minutes in a new game
      this.wet = 0;
      this.time = 0;
      this.sheltered = false;
      this._shelterT = 0;
      this._boltT = 8;
      this._thunder = [];
      this._baseRough = {};
      if (!this.ok) return;
      this._buildRain();
      this._apply(0);
      VH.events.on('settings:changed', (e) => {
        if (e.path === 'gameplay.weather' || e.path === '*') this._followSetting(true);
      });
      this._followSetting(true);
    }

    _hold() {
      return HOLD[0] + Math.random() * (HOLD[1] - HOLD[0]);
    }

    _buildRain() {
      const pos = new Float32Array(DROPS * 6);
      const end = new Float32Array(DROPS * 2);
      for (let i = 0; i < DROPS; i++) {
        const x = Math.random();
        const y = Math.random();
        const z = Math.random();
        pos.set([x, y, z, x, y, z], i * 6);
        end[i * 2 + 1] = 1;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
      g.setDrawRange(0, 0);
      this.uniforms = {
        uTime: { value: 0 },
        uBox: { value: new THREE.Vector3(BOX[0], BOX[1], BOX[2]) },
        uCam: { value: new THREE.Vector3() },
        uWind: { value: new THREE.Vector2(2.5, 1.2) },
        uFall: { value: 19 },
        uLen: { value: 0.85 },
        uColor: { value: new THREE.Color(0.72, 0.78, 0.86) },
        uAlpha: { value: 0.4 },
      };
      const m = new THREE.ShaderMaterial({ vertexShader: RAIN_VERTEX, fragmentShader: RAIN_FRAGMENT, uniforms: this.uniforms, transparent: true, depthWrite: false });
      this.rain = new THREE.LineSegments(g, m);
      this.rain.frustumCulled = false;
      this.rain.renderOrder = 5;
      this.rain.visible = false;
      this.game.scene.add(this.rain);
    }

    /** Settings → Weather: follow the cycle, or hold one kind of weather. */
    _followSetting(quick) {
      const want = this.game.settings.get('gameplay.weather') || 'dynamic';
      const fixed = { clear: 'clear', rain: 'rain', storm: 'storm' }[want];
      if (fixed) this.setState(fixed, quick ? 4 : BLEND);
      this.fixed = !!fixed;
    }

    /** Ease to a weather state over `secs`. */
    setState(name, secs) {
      if (!STATES[name]) return;
      this.from = Object.assign({}, this.cur);
      this.state = name;
      this.blend = 0;
      this._blendLen = secs || BLEND;
      this.holdT = this._hold();
      const g = this.game;
      if (STATES[name].rain > 0 && this.cur.rain < 0.05 && g.hud && g.state === 'playing') g.hud.showToast(name === 'storm' ? 'A storm is rolling in' : 'Rain moving in');
    }

    /** The next weather: a step or two along the scale, never straight from clear to a storm. */
    _next() {
      const i = ORDER.indexOf(this.state);
      const pool = ORDER.filter((n, j) => n !== this.state && Math.abs(j - i) <= 2);
      let total = 0;
      for (const n of pool) total += STATES[n].weight;
      let r = Math.random() * total;
      for (const n of pool) {
        r -= STATES[n].weight;
        if (r <= 0) return n;
      }
      return pool[0];
    }

    update(dt) {
      if (!this.ok) return;
      this.time += dt;
      if (!this.fixed) {
        this.holdT -= dt;
        if (this.holdT <= 0) this.setState(this._next());
      }
      this._apply(dt);
      this._lightning(dt);
    }

    /** Blend toward the target and push it to the sky, the roads, the rain and the sound. */
    _apply(dt) {
      const to = STATES[this.state];
      this.blend = Math.min(1, this.blend + dt / (this._blendLen || BLEND));
      const k = this.blend * this.blend * (3 - 2 * this.blend);
      for (const key of ['cloud', 'dim', 'fog', 'rain']) this.cur[key] = lerp(this.from[key], to[key], k);
      this.cur.storm = to.storm && k > 0.6;
      const g = this.game;
      g.environment.setWeather(this.cur);
      // Roads soak up quickly in rain and dry off slowly after.
      const rain = this.cur.rain;
      this.wet = rain > this.wet ? Math.min(rain * 1.4, this.wet + dt / 20) : Math.max(0, this.wet - dt / 120);
      this.wet = clamp(this.wet, 0, 1);
      this._wetRoads(this.wet);
      VH.weatherGrip = 1 - 0.2 * this.wet;
      // Shelter: something solid overhead (a roof, a bridge) stops the rain in front of the camera.
      this._shelterT -= dt;
      if (this._shelterT <= 0 && rain > 0.01) {
        this._shelterT = 0.4;
        const c = g.renderer.camera.position;
        this.sheltered = !!g.physics.raycast(c.x, c.y + 0.2, c.z, 0, 1, 0, 30, { ground: false });
      }
      const show = rain > 0.01 && !this.sheltered;
      this.rain.visible = show;
      if (show) {
        const u = this.uniforms;
        u.uTime.value = this.time;
        u.uCam.value.copy(g.renderer.camera.position);
        u.uFall.value = 17 + rain * 6;
        u.uWind.value.set(2 + rain * 4, 1 + rain * 2);
        // Bright streaks by day, dim ones at night.
        const night = g.environment.nightFactor || 0;
        u.uAlpha.value = (0.26 + rain * 0.2) * (1 - night * 0.55);
        this.rain.geometry.setDrawRange(0, Math.floor(DROPS * Math.min(1, rain * 1.1)) * 2);
      }
      if (g.audio && g.audio.setRain) g.audio.setRain(rain);
    }

    /** Wet: darker, glossy paving (the sky shows in it). */
    _wetRoads(w) {
      if (this._wetShown !== undefined && Math.abs(this._wetShown - w) < 0.01) return;
      this._wetShown = w;
      const list = VH.Materials && VH.Materials.list;
      if (!list) return;
      for (const id of WET_SURFACES) {
        const m = list[id];
        if (!m) continue;
        if (this._baseRough[id] === undefined) this._baseRough[id] = m.roughness;
        m.roughness = lerp(this._baseRough[id], 0.22, w * 0.9);
        m.color.setScalar(1 - 0.32 * w);
      }
    }

    /** In a storm: a flash every so often, and the thunder a moment later. */
    _lightning(dt) {
      const g = this.game;
      for (const th of this._thunder) th.t -= dt;
      for (const th of this._thunder.filter((q) => q.t <= 0)) if (g.audio && g.audio.thunder) g.audio.thunder(th.near);
      this._thunder = this._thunder.filter((q) => q.t > 0);
      if (!this.cur.storm) return;
      this._boltT -= dt;
      if (this._boltT > 0) return;
      this._boltT = 6 + Math.random() * 14;
      const near = Math.random();
      if (g.renderer.post && g.renderer.post.pulse) g.renderer.post.pulse(0.25 + near * 0.35, [0.82, 0.86, 1]);
      this._thunder.push({ t: 0.3 + (1 - near) * 3.5, near });
    }

    reset() {
      if (!this.ok) return;
      this._followSetting(true);
    }

    stop() {
      if (this.game.audio && this.game.audio.setRain) this.game.audio.setRain(0);
    }

    stats() {
      return [['Weather', STATES[this.state].name]];
    }

    serialize() {
      return { state: this.state, wet: +this.wet.toFixed(2) };
    }

    load(d) {
      if (!this.ok) return;
      if (d && STATES[d.state] && !this.fixed) {
        this.cur = Object.assign({}, STATES[d.state]);
        this.from = Object.assign({}, this.cur);
        this.state = d.state;
        this.blend = 1;
        this.holdT = this._hold();
        this.wet = clamp(+d.wet || 0, 0, 1);
      }
      this._apply(0);
    }

    /** The debug console and photo mode: weather by name. */
    static names() {
      return ORDER.slice();
    }
  }

  VH.Weather = Weather;
})();
