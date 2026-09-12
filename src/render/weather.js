// weather.js — rolling weather: cloud cover, rain, storms, fog, wind and wet roads.
//
// Weather drives the sky shader, the colour grade, road roughness, and how the AI behaves,
// so a storm actually changes how the city looks and feels rather than just adding particles.
import * as THREE from 'three';
import { clamp, lerp, damp, smoothstep } from '../core/mathx.js';
import { fbm2D } from '../core/rng.js';
import { tex } from './proctex.js';

export const WEATHER_TYPES = {
  clear: { cloud: 0.12, rain: 0, fog: 0.02, wind: 0.25, storm: 0, weight: 5, label: 'Clear' },
  fair: { cloud: 0.34, rain: 0, fog: 0.05, wind: 0.35, storm: 0, weight: 4, label: 'Fair' },
  overcast: { cloud: 0.82, rain: 0, fog: 0.12, wind: 0.5, storm: 0.1, weight: 2, label: 'Overcast' },
  drizzle: { cloud: 0.72, rain: 0.35, fog: 0.18, wind: 0.4, storm: 0.1, weight: 2, label: 'Drizzle' },
  rain: { cloud: 0.9, rain: 0.8, fog: 0.25, wind: 0.7, storm: 0.35, weight: 2, label: 'Rain' },
  storm: { cloud: 0.98, rain: 1, fog: 0.3, wind: 1, storm: 1, weight: 1, label: 'Thunderstorm' },
  fog: { cloud: 0.55, rain: 0, fog: 0.85, wind: 0.15, storm: 0, weight: 1, label: 'Sea Fog' },
};

const RAIN_COUNT = 3200;
// A full storm blows about 25 m/s (90 km/h) at the surface.
const MAX_WIND_MS = 25;

export class Weather {
  constructor(ctx) {
    this.ctx = ctx;
    this.type = 'clear';
    this.target = WEATHER_TYPES.clear;
    this.cloudCover = 0.15;
    this.rain = 0;
    this.fog = 0.02;
    this.windSpeed = 0.3;
    this.windDir = 0.6;
    this.gust = 1;
    this._t = 0;
    // Wind in m/s, world space, mean plus gust. Physics reads this, not the
    // normalised windSpeed the visuals use.
    this.windVector = new THREE.Vector3();
    this.storm = 0;
    this.wetness = 0;
    this.changeTimer = 120;
    this.lightningTimer = 0;
    this.flash = 0;
    this.rainMesh = null;
    this._splashTimer = 0;
    this._buildRain();
  }

  _buildRain() {
    const ctx = this.ctx;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(RAIN_COUNT * 6);
    const alpha = new Float32Array(RAIN_COUNT * 2);
    this.rainPos = pos;
    this.rainAlpha = alpha;
    this.rainVel = new Float32Array(RAIN_COUNT * 3);
    for (let i = 0; i < RAIN_COUNT; i++) {
      this._respawnDrop(i, true);
      alpha[i * 2] = 0.0;
      alpha[i * 2 + 1] = 0.5;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setDrawRange(0, 0);
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
    const mat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(0xbcd4e8) }, uOpacity: { value: 0.5 } },
      vertexShader: `attribute float aAlpha; varying float vA;
        void main(){ vA = aAlpha; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 uColor; uniform float uOpacity; varying float vA;
        void main(){ gl_FragColor = vec4(uColor, vA * uOpacity); }`,
      transparent: true, depthWrite: false, blending: THREE.NormalBlending,
    });
    this.rainMesh = new THREE.LineSegments(geo, mat);
    this.rainMesh.frustumCulled = false;
    this.rainMesh.renderOrder = 9;
    this.rainMesh.visible = false;
    ctx.scene.add(this.rainMesh);
  }

  _respawnDrop(i, initial) {
    const cam = this.ctx.camera ? this.ctx.camera.position : { x: 0, y: 10, z: 0 };
    const r = 34;
    const x = cam.x + (Math.random() - 0.5) * r * 2;
    const z = cam.z + (Math.random() - 0.5) * r * 2;
    const y = cam.y + (initial ? Math.random() * 26 : 14 + Math.random() * 12);
    const o = i * 6;
    this.rainPos[o] = x; this.rainPos[o + 1] = y; this.rainPos[o + 2] = z;
    this.rainPos[o + 3] = x; this.rainPos[o + 4] = y - 0.7; this.rainPos[o + 5] = z;
    const v = i * 3;
    this.rainVel[v] = 0; this.rainVel[v + 1] = -(22 + Math.random() * 12); this.rainVel[v + 2] = 0;
  }

  setWeather(type, instant = false) {
    const t = WEATHER_TYPES[type];
    if (!t) return;
    const changed = this.type !== type;
    this.type = type;
    // Reflective surfaces read the sky through the probe, so it has to be
    // retaken when the sky changes.
    if (this.ctx.sky) this.ctx.sky.envNeedsUpdate = true;
    this.target = t;
    if (instant) {
      this.cloudCover = t.cloud; this.rain = t.rain; this.fog = t.fog;
      this.windSpeed = t.wind; this.storm = t.storm;
      this.wetness = t.rain > 0.2 ? 1 : 0;
    }
    // Only announce a real change — the roll can land on the weather we already
    // have, and "Weather: Clear" twice in a row is just noise on screen.
    if (changed) this.ctx.bus.emit('weather:changed', { type, label: t.label });
  }

  randomWeather(rng) {
    const entries = Object.entries(WEATHER_TYPES);
    const r = rng || this.ctx.rng;
    const choices = entries.filter(([k]) => k !== this.type);
    const pool = (choices.length ? choices : entries).map(([k, v]) => ({ k, w: v.weight }));
    this.setWeather(r.weighted(pool, (o) => o.w).k);
  }

  update(dt, hour) {
    const ctx = this.ctx;
    // --- drift toward the target conditions ---
    this.cloudCover = damp(this.cloudCover, this.target.cloud, 0.22, dt);
    this.rain = damp(this.rain, this.target.rain, 0.3, dt);
    this.fog = damp(this.fog, this.target.fog, 0.25, dt);
    this.windSpeed = damp(this.windSpeed, this.target.wind, 0.2, dt);
    this.storm = damp(this.storm, this.target.storm, 0.2, dt);
    this.windDir += dt * 0.02;

    // Gusts: the mean wind is the weather, the gust is the minute. Both go into
    // the physics world so cars, props and particles all feel the same air.
    this.gust = damp(this.gust ?? 0, 0.65 + 0.35 * Math.sin(this._t * 0.37) * Math.sin(this._t * 0.11 + 1.7),
      0.5, dt);
    this._t = (this._t || 0) + dt;
    const speed = this.windSpeed * MAX_WIND_MS * this.gust;
    this.windVector.set(Math.cos(this.windDir) * speed, 0, Math.sin(this.windDir) * speed);
    if (ctx.physics) ctx.physics.wind.copy(this.windVector);

    // Roads stay wet for a while after the rain stops.
    const wetTarget = this.rain > 0.12 ? 1 : 0;
    this.wetness = damp(this.wetness, wetTarget, this.rain > 0.12 ? 0.5 : 0.09, dt);

    // --- schedule a change ---
    this.changeTimer -= dt;
    if (this.changeTimer <= 0) {
      this.changeTimer = 90 + Math.random() * 260;
      this.randomWeather();
    }

    // --- lightning ---
    this.flash = Math.max(0, this.flash - dt * 4);
    if (this.storm > 0.4) {
      this.lightningTimer -= dt;
      if (this.lightningTimer <= 0) {
        this.lightningTimer = 4 + Math.random() * 14 * (1.2 - this.storm);
        this.flash = 0.9 * this.storm;
        const delay = 300 + Math.random() * 2600;
        setTimeout(() => ctx.audio?.play('thunder', { volume: 0.7 * this.storm }), delay);
        ctx.bus.emit('weather:lightning', { intensity: this.storm });
      }
    }

    this._updateRain(dt);

    // --- push the look into the renderer ---
    if (ctx.renderer && ctx.sky) {
      const night = ctx.sky.palette.night;
      const fogCol = ctx.sky.fogColor;
      ctx.renderer.setGrade({
        // Under a storm the eye adapts up, not down — cutting exposure as well
        // as the light was the third place the same weather dimmed the scene.
        exposure: ctx.sky.exposure * 0.85 * (1 + this.storm * 0.04) * (1 + night * 0.5),
        contrast: lerp(1.04, 1.12, this.storm) - this.fog * 0.06,
        saturation: lerp(1.1, 0.72, Math.max(this.storm, this.fog * 0.7)),
        fogColor: fogCol,
        haze: 0.16 + this.fog * 1.9 + this.storm * 0.45,
        wetLens: clamp(this.rain * 0.9, 0, 1),
      });
      ctx.renderer.grade.uFlash.value = Math.max(ctx.renderer.grade.uFlash.value * 0.85, this.flash);
    }
    if (ctx.materials) ctx.materials.update(ctx.sky ? ctx.sky.palette.night : 0, this.wetness);
  }

  _updateRain(dt) {
    const visible = this.rain > 0.04;
    this.rainMesh.visible = visible;
    if (!visible) { this.rainMesh.geometry.setDrawRange(0, 0); return; }
    const cam = this.ctx.camera.position;
    const count = Math.floor(RAIN_COUNT * clamp(this.rain, 0, 1));
    const wx = Math.cos(this.windDir) * this.windSpeed * 9;
    const wz = Math.sin(this.windDir) * this.windSpeed * 9;
    const ground = this.ctx.physics;

    for (let i = 0; i < count; i++) {
      const o = i * 6, v = i * 3;
      const vy = this.rainVel[v + 1];
      const nx = this.rainPos[o] + wx * dt;
      const ny = this.rainPos[o + 1] + vy * dt;
      const nz = this.rainPos[o + 2] + wz * dt;
      // Recycle drops that fall past the camera or drift too far.
      if (ny < cam.y - 16 || Math.abs(nx - cam.x) > 40 || Math.abs(nz - cam.z) > 40) {
        this._respawnDrop(i, false);
        continue;
      }
      this.rainPos[o] = nx; this.rainPos[o + 1] = ny; this.rainPos[o + 2] = nz;
      const streak = 0.5 + this.rain * 0.9;
      this.rainPos[o + 3] = nx - wx * 0.03;
      this.rainPos[o + 4] = ny - streak;
      this.rainPos[o + 5] = nz - wz * 0.03;
    }
    const geo = this.rainMesh.geometry;
    geo.setDrawRange(0, count * 2);
    geo.attributes.position.needsUpdate = true;
    this.rainMesh.material.uniforms.uOpacity.value = clamp(this.rain * 0.55, 0, 0.6);

    // Splashes on the ground near the camera.
    this._splashTimer -= dt;
    if (this._splashTimer <= 0 && this.ctx.particles) {
      this._splashTimer = 0.05;
      for (let i = 0; i < Math.ceil(this.rain * 5); i++) {
        const a = Math.random() * Math.PI * 2, r = Math.random() * 14;
        const x = cam.x + Math.cos(a) * r, z = cam.z + Math.sin(a) * r;
        this.ctx.particles.spawnRainSplash(x, ground.groundHeight(x, z) + 0.03, z);
      }
    }
  }

  get label() { return this.target.label; }
  get isWet() { return this.wetness > 0.25; }

  /** Traction multiplier the vehicle AI and the player's car both feel. */
  get gripMultiplier() { return 1 - this.wetness * 0.22; }

  dispose() {
    this.ctx.scene.remove(this.rainMesh);
    this.rainMesh.geometry.dispose();
    this.rainMesh.material.dispose();
  }
}
