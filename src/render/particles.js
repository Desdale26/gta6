// particles.js — one pooled point-sprite system for everything that puffs, sparks or splashes.
//
// Two buffers: alpha-blended (smoke, dust, water, debris) and additive (fire, sparks, glow).
// Both are single draw calls with per-particle size, colour, rotation and fade.
import * as THREE from 'three';
import { clamp, lerp } from '../core/mathx.js';
import { tex } from './proctex.js';

const VERT = /* glsl */`
  attribute float aSize;
  attribute float aRot;
  attribute vec4 aColor;
  attribute float aFrame;
  varying vec4 vColor;
  varying float vRot;
  varying float vFrame;
  uniform float uPixelScale;
  void main(){
    vColor = aColor;
    vRot = aRot;
    vFrame = aFrame;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uPixelScale / max(-mv.z, 0.6);
  }
`;

const FRAG = /* glsl */`
  precision mediump float;
  varying vec4 vColor;
  varying float vRot;
  varying float vFrame;
  uniform sampler2D uSmoke;
  uniform sampler2D uSpark;
  void main(){
    vec2 uv = gl_PointCoord - 0.5;
    float c = cos(vRot), s = sin(vRot);
    uv = vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c) + 0.5;
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) discard;
    vec4 t = vFrame < 0.5 ? texture2D(uSmoke, uv) : texture2D(uSpark, uv);
    float a = t.a * vColor.a;
    if (a < 0.01) discard;
    gl_FragColor = vec4(t.rgb * vColor.rgb, a);
  }
`;

class Buffer {
  constructor(capacity, material, scene) {
    this.cap = capacity;
    this.count = 0;
    this.pos = new Float32Array(capacity * 3);
    this.vel = new Float32Array(capacity * 3);
    this.size = new Float32Array(capacity);
    this.rot = new Float32Array(capacity);
    this.rotVel = new Float32Array(capacity);
    this.color = new Float32Array(capacity * 4);
    this.frame = new Float32Array(capacity);
    this.life = new Float32Array(capacity);
    this.maxLife = new Float32Array(capacity);
    this.grow = new Float32Array(capacity);
    this.drag = new Float32Array(capacity);
    this.gravity = new Float32Array(capacity);
    this.fadeIn = new Float32Array(capacity);

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aRot', new THREE.BufferAttribute(this.rot, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aColor', new THREE.BufferAttribute(this.color, 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aFrame', new THREE.BufferAttribute(this.frame, 1).setUsage(THREE.DynamicDrawUsage));
    g.setDrawRange(0, 0);
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
    this.geometry = g;
    this.points = new THREE.Points(g, material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 10;
    this.points.matrixAutoUpdate = false;
    scene.add(this.points);
  }

  spawn(p) {
    let i;
    if (this.count < this.cap) i = this.count++;
    else {
      // recycle the oldest (shortest remaining life)
      i = 0; let worst = Infinity;
      for (let k = 0; k < this.cap; k += 7) { if (this.life[k] < worst) { worst = this.life[k]; i = k; } }
    }
    const i3 = i * 3, i4 = i * 4;
    this.pos[i3] = p.x; this.pos[i3 + 1] = p.y; this.pos[i3 + 2] = p.z;
    this.vel[i3] = p.vx || 0; this.vel[i3 + 1] = p.vy || 0; this.vel[i3 + 2] = p.vz || 0;
    this.size[i] = p.size;
    this.rot[i] = p.rot || 0;
    this.rotVel[i] = p.rotVel || 0;
    this.color[i4] = p.r; this.color[i4 + 1] = p.g; this.color[i4 + 2] = p.b; this.color[i4 + 3] = p.a;
    this.frame[i] = p.frame || 0;
    this.life[i] = p.life; this.maxLife[i] = p.life;
    this.grow[i] = p.grow || 0;
    this.drag[i] = p.drag ?? 1.2;
    this.gravity[i] = p.gravity ?? 0;
    this.fadeIn[i] = p.fadeIn || 0;
    this._alpha0 = p.a;
    return i;
  }

  update(dt) {
    let live = 0;
    for (let i = 0; i < this.count; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      const i3 = i * 3, i4 = i * 4;
      if (this.life[i] <= 0) { this.color[i4 + 3] = 0; this.size[i] = 0; continue; }
      const d = Math.max(0, 1 - this.drag[i] * dt);
      this.vel[i3] *= d;
      this.vel[i3 + 1] = this.vel[i3 + 1] * d + this.gravity[i] * dt;
      this.vel[i3 + 2] *= d;
      this.pos[i3] += this.vel[i3] * dt;
      this.pos[i3 + 1] += this.vel[i3 + 1] * dt;
      this.pos[i3 + 2] += this.vel[i3 + 2] * dt;
      this.rot[i] += this.rotVel[i] * dt;
      this.size[i] += this.grow[i] * dt;
      const t = this.life[i] / this.maxLife[i];
      let a = t;
      if (this.fadeIn[i] > 0) a *= clamp((1 - t) / this.fadeIn[i], 0, 1);
      this.color[i4 + 3] = a * a;
      live++;
    }
    const g = this.geometry;
    g.setDrawRange(0, this.count);
    g.attributes.position.needsUpdate = true;
    g.attributes.aSize.needsUpdate = true;
    g.attributes.aRot.needsUpdate = true;
    g.attributes.aColor.needsUpdate = true;
    g.attributes.aFrame.needsUpdate = true;
    return live;
  }
  clear() { for (let i = 0; i < this.cap; i++) { this.life[i] = 0; this.size[i] = 0; this.color[i * 4 + 3] = 0; } this.count = 0; }
}

export class ParticleSystem {
  constructor(ctx) {
    this.ctx = ctx;
    const budget = ctx.settings.preset.particleBudget || 900;
    let smokeTex = null, sparkTex = null;
    try { smokeTex = tex('smoke', { size: 128 }); sparkTex = tex('spark', { size: 64 }); } catch (e) { /* fallback below */ }
    if (!smokeTex) smokeTex = fallbackTexture(0.55);
    if (!sparkTex) sparkTex = fallbackTexture(0.14);

    const uniforms = {
      uSmoke: { value: smokeTex },
      uSpark: { value: sparkTex },
      uPixelScale: { value: 520 },
    };
    this.alphaMat = new THREE.ShaderMaterial({
      uniforms, vertexShader: VERT, fragmentShader: FRAG,
      transparent: true, depthWrite: false, depthTest: true,
      blending: THREE.NormalBlending,
    });
    this.addMat = new THREE.ShaderMaterial({
      uniforms, vertexShader: VERT, fragmentShader: FRAG,
      transparent: true, depthWrite: false, depthTest: true,
      blending: THREE.AdditiveBlending,
    });

    this.soft = new Buffer(Math.floor(budget * 0.68), this.alphaMat, ctx.scene);
    this.glow = new Buffer(Math.floor(budget * 0.32), this.addMat, ctx.scene);
    this.liveCount = 0;
    // The two pools together are the ceiling, so asking whether liveCount has
    // gone past the settings budget can never be true -- which is what the
    // check in Game.validate() was doing. The reachable questions are whether
    // the bookkeeping has run past the buffers, and whether the pool has been
    // pinned full long enough that effects are visibly being cut short.
    this.capacity = this.soft.cap + this.glow.cap;
    this._c = new THREE.Color();
    this.budgetGuard = 0;
  }

  setPixelScale(h) { this.alphaMat.uniforms.uPixelScale.value = h * 0.72; }

  _rgb(hex) { this._c.setHex(hex); return this._c; }

  spawnSmoke(x, y, z, size = 1, color = 0xbbbbbb, strength = 1) {
    const c = this._rgb(color);
    this.soft.spawn({
      x, y, z,
      vx: (Math.random() - 0.5) * 0.9, vy: 0.5 + Math.random() * 0.8, vz: (Math.random() - 0.5) * 0.9,
      size: size * 26, grow: size * 22, rot: Math.random() * 6.28, rotVel: (Math.random() - 0.5) * 1.1,
      r: c.r, g: c.g, b: c.b, a: clamp(0.42 * strength, 0, 0.8),
      life: 1.1 + Math.random() * 1.3, drag: 0.9, gravity: 0.35, frame: 0, fadeIn: 0.15,
    });
  }
  spawnDust(x, y, z, color = 0xc0a878, strength = 1) {
    const c = this._rgb(color);
    this.soft.spawn({
      x, y, z,
      vx: (Math.random() - 0.5) * 2.2, vy: 0.4 + Math.random() * 1.1, vz: (Math.random() - 0.5) * 2.2,
      size: 22, grow: 34, rot: Math.random() * 6.28, rotVel: (Math.random() - 0.5) * 2,
      r: c.r, g: c.g, b: c.b, a: clamp(0.45 * strength, 0, 0.75),
      life: 0.7 + Math.random() * 0.9, drag: 1.5, gravity: -0.6, frame: 0, fadeIn: 0.12,
    });
  }
  spawnSpark(x, y, z, count = 6, color = 0xffb340, speed = 6) {
    const c = this._rgb(color);
    for (let i = 0; i < count; i++) {
      this.glow.spawn({
        x, y, z,
        vx: (Math.random() - 0.5) * speed, vy: Math.random() * speed * 0.9, vz: (Math.random() - 0.5) * speed,
        size: 5 + Math.random() * 5, grow: -3,
        r: c.r, g: c.g, b: c.b, a: 1,
        life: 0.24 + Math.random() * 0.5, drag: 0.7, gravity: -14, frame: 1,
      });
    }
  }
  spawnFire(x, y, z, strength = 1) {
    this.glow.spawn({
      x: x + (Math.random() - 0.5) * 0.3, y, z: z + (Math.random() - 0.5) * 0.3,
      vx: (Math.random() - 0.5) * 0.5, vy: 1.6 + Math.random() * 1.4, vz: (Math.random() - 0.5) * 0.5,
      size: 18 * strength, grow: 16 * strength, rot: Math.random() * 6.28, rotVel: (Math.random() - 0.5) * 3,
      r: 1, g: 0.46 + Math.random() * 0.28, b: 0.10, a: 0.85,
      life: 0.32 + Math.random() * 0.36, drag: 0.9, gravity: 1.6, frame: 0,
    });
  }
  spawnMuzzleFlash(x, y, z, dx, dy, dz, scale = 1) {
    this.glow.spawn({
      x, y, z, vx: dx * 2, vy: dy * 2, vz: dz * 2,
      size: 40 * scale, grow: -70 * scale, r: 1, g: 0.82, b: 0.45, a: 1,
      life: 0.055, drag: 2, frame: 1,
    });
    this.spawnSpark(x + dx * 0.2, y + dy * 0.2, z + dz * 0.2, 3, 0xffd27a, 4);
    this.soft.spawn({
      x, y, z, vx: dx * 3.2, vy: dy * 3.2 + 0.3, vz: dz * 3.2,
      size: 9, grow: 26, r: 0.6, g: 0.6, b: 0.6, a: 0.28,
      life: 0.45, drag: 2.6, gravity: 0.4, frame: 0, rot: Math.random() * 6.3,
    });
  }
  spawnImpact(x, y, z, nx, ny, nz, surface = 'concrete') {
    const table = {
      concrete: { color: 0xbdb8b0, sparks: 0, dust: 5 },
      road: { color: 0x8e8e92, sparks: 0, dust: 5 },
      metal: { color: 0xd8d8e0, sparks: 9, dust: 1 },
      glass: { color: 0xd8f0ff, sparks: 5, dust: 3 },
      wood: { color: 0xa9834f, sparks: 0, dust: 6 },
      sand: { color: 0xd9c08a, sparks: 0, dust: 10 },
      grass: { color: 0x6f8a4a, sparks: 0, dust: 6 },
      dirt: { color: 0x9c7a4e, sparks: 0, dust: 8 },
      water: { color: 0xa8e0f0, sparks: 0, dust: 8 },
      flesh: { color: 0x8a1212, sparks: 0, dust: 7 },
    };
    const t = table[surface] || table.concrete;
    if (t.sparks) this.spawnSpark(x + nx * 0.05, y + ny * 0.05, z + nz * 0.05, t.sparks, 0xffc060, 7);
    const c = this._rgb(t.color);
    for (let i = 0; i < t.dust; i++) {
      this.soft.spawn({
        x, y, z,
        vx: nx * 2.2 + (Math.random() - 0.5) * 2.4,
        vy: ny * 2.2 + Math.random() * 1.6,
        vz: nz * 2.2 + (Math.random() - 0.5) * 2.4,
        size: 5 + Math.random() * 7, grow: 12, rot: Math.random() * 6.28, rotVel: (Math.random() - 0.5) * 4,
        r: c.r, g: c.g, b: c.b, a: 0.7,
        life: 0.32 + Math.random() * 0.5, drag: 2.2, gravity: -7, frame: 0,
      });
    }
  }
  spawnBlood(x, y, z, dx, dy, dz, amount = 1) {
    if (!this.ctx.settings.get('bloodFx')) return;
    for (let i = 0; i < 6 * amount; i++) {
      this.soft.spawn({
        x, y, z,
        vx: dx * 2 + (Math.random() - 0.5) * 3, vy: dy * 2 + Math.random() * 2, vz: dz * 2 + (Math.random() - 0.5) * 3,
        size: 4 + Math.random() * 5, grow: 3,
        r: 0.48, g: 0.03, b: 0.04, a: 0.9,
        life: 0.4 + Math.random() * 0.4, drag: 1.4, gravity: -13, frame: 1,
      });
    }
  }
  spawnSplash(x, y, z, strength = 1) {
    for (let i = 0; i < 4 + strength * 3; i++) {
      this.soft.spawn({
        x: x + (Math.random() - 0.5) * 1.6, y, z: z + (Math.random() - 0.5) * 1.6,
        vx: (Math.random() - 0.5) * 3, vy: 1.6 + Math.random() * 3 * strength, vz: (Math.random() - 0.5) * 3,
        size: 8 + Math.random() * 12, grow: 16,
        r: 0.82, g: 0.92, b: 0.98, a: 0.55,
        life: 0.4 + Math.random() * 0.5, drag: 1.1, gravity: -11, frame: 0,
      });
    }
  }
  spawnExplosion(x, y, z, radius = 8) {
    const n = clamp(Math.round(radius * 3), 8, 60);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, e = Math.random() * 0.8;
      const sp = radius * (0.5 + Math.random());
      this.glow.spawn({
        x, y, z,
        vx: Math.cos(a) * Math.cos(e) * sp, vy: Math.sin(e) * sp + 2, vz: Math.sin(a) * Math.cos(e) * sp,
        size: radius * 7 * (0.5 + Math.random()), grow: radius * 6,
        r: 1, g: 0.55 + Math.random() * 0.3, b: 0.12, a: 1,
        life: 0.3 + Math.random() * 0.5, drag: 1.6, gravity: 2, frame: 0, rot: Math.random() * 6.3,
      });
    }
    for (let i = 0; i < n * 0.8; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = radius * (0.3 + Math.random() * 0.7);
      this.soft.spawn({
        x, y, z,
        vx: Math.cos(a) * sp, vy: Math.random() * sp * 0.9 + 1, vz: Math.sin(a) * sp,
        size: radius * 9, grow: radius * 12, rot: Math.random() * 6.3, rotVel: (Math.random() - 0.5) * 1.6,
        r: 0.16, g: 0.15, b: 0.14, a: 0.72,
        life: 1.6 + Math.random() * 1.6, drag: 1.0, gravity: 1.1, frame: 0, fadeIn: 0.1,
      });
    }
    this.spawnSpark(x, y, z, Math.round(radius * 2.5), 0xffcc66, radius * 2.2);
  }
  spawnDebris(x, y, z, count, color = 0x555555, speed = 6) {
    const c = this._rgb(color);
    for (let i = 0; i < count; i++) {
      this.soft.spawn({
        x, y, z,
        vx: (Math.random() - 0.5) * speed, vy: Math.random() * speed, vz: (Math.random() - 0.5) * speed,
        size: 4 + Math.random() * 6, grow: 0, rot: Math.random() * 6.28, rotVel: (Math.random() - 0.5) * 9,
        r: c.r, g: c.g, b: c.b, a: 1,
        life: 0.9 + Math.random() * 1.1, drag: 0.35, gravity: -17, frame: 1,
      });
    }
  }
  spawnRainSplash(x, y, z) {
    this.soft.spawn({
      x, y, z, vx: 0, vy: 0.6, vz: 0,
      size: 4, grow: 9, r: 0.8, g: 0.88, b: 0.95, a: 0.32,
      life: 0.22, drag: 3, frame: 0,
    });
  }
  spawnGlow(x, y, z, color, size, life) {
    const c = this._rgb(color);
    this.glow.spawn({ x, y, z, size: size * 30, grow: -size * 18, r: c.r, g: c.g, b: c.b, a: 0.9, life, drag: 3, frame: 1 });
  }

  update(dt) {
    this.liveCount = this.soft.update(dt) + this.glow.update(dt);
  }
  clear() { this.soft.clear(); this.glow.clear(); }
  dispose() {
    this.ctx.scene.remove(this.soft.points, this.glow.points);
    this.soft.geometry.dispose(); this.glow.geometry.dispose();
    this.alphaMat.dispose(); this.addMat.dispose();
  }
}

function fallbackTexture(softness) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(clamp(softness, 0.05, 0.9), 'rgba(255,255,255,0.55)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
