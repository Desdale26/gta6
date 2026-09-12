// decals.js — bullet holes, blood, tyre marks and scorch, drawn as one ring-buffered mesh.
import * as THREE from 'three';
import { clamp } from '../core/mathx.js';
import { tex } from './proctex.js';

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _q = new THREE.Quaternion();
const UP = new THREE.Vector3(0, 1, 0);

/** One buffered quad pool per decal texture. */
class DecalLayer {
  constructor(ctx, texture, capacity, opts = {}) {
    this.cap = capacity;
    this.head = 0;
    this.count = 0;
    this.life = new Float32Array(capacity);
    this.maxLife = new Float32Array(capacity);
    const pos = new Float32Array(capacity * 4 * 3);
    const uv = new Float32Array(capacity * 4 * 2);
    const alpha = new Float32Array(capacity * 4);
    const idx = new Uint32Array(capacity * 6);
    for (let i = 0; i < capacity; i++) {
      const v = i * 4;
      idx[i * 6] = v; idx[i * 6 + 1] = v + 1; idx[i * 6 + 2] = v + 2;
      idx[i * 6 + 3] = v; idx[i * 6 + 4] = v + 2; idx[i * 6 + 5] = v + 3;
      uv[v * 2] = 0; uv[v * 2 + 1] = 0;
      uv[v * 2 + 2] = 1; uv[v * 2 + 3] = 0;
      uv[v * 2 + 4] = 1; uv[v * 2 + 5] = 1;
      uv[v * 2 + 6] = 0; uv[v * 2 + 7] = 1;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.setDrawRange(0, 0);
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
    this.geo = geo;
    this.pos = pos;
    this.alpha = alpha;

    const mat = new THREE.ShaderMaterial({
      uniforms: { uMap: { value: texture }, uColor: { value: new THREE.Color(opts.color ?? 0xffffff) } },
      vertexShader: `
        attribute float aAlpha; varying float vA; varying vec2 vUv;
        void main(){ vA = aAlpha; vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        uniform sampler2D uMap; uniform vec3 uColor; varying float vA; varying vec2 vUv;
        void main(){
          vec4 t = texture2D(uMap, vUv);
          float a = t.a * vA;
          if (a < 0.02) discard;
          gl_FragColor = vec4(t.rgb * uColor, a);
        }`,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: opts.offset ?? -6,
      polygonOffsetUnits: opts.offset ?? -6,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = opts.renderOrder ?? 5;
    this.mesh.matrixAutoUpdate = false;
    ctx.scene.add(this.mesh);
  }

  /** Place a quad at a point with a surface normal and a size. */
  add(x, y, z, nx, ny, nz, size, life, rotation = Math.random() * Math.PI * 2) {
    const i = this.head;
    this.head = (this.head + 1) % this.cap;
    this.count = Math.min(this.count + 1, this.cap);
    this.life[i] = life;
    this.maxLife[i] = life;

    // Build a basis on the surface.
    _v1.set(nx, ny, nz).normalize();
    _q.setFromUnitVectors(UP, _v1);
    const cr = Math.cos(rotation), sr = Math.sin(rotation);
    const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    const base = i * 12;
    for (let c = 0; c < 4; c++) {
      const [cx, cz] = corners[c];
      const rx = (cx * cr - cz * sr) * size;
      const rz = (cx * sr + cz * cr) * size;
      _v2.set(rx, 0, rz).applyQuaternion(_q);
      this.pos[base + c * 3] = x + _v2.x + nx * 0.012;
      this.pos[base + c * 3 + 1] = y + _v2.y + ny * 0.012;
      this.pos[base + c * 3 + 2] = z + _v2.z + nz * 0.012;
      this.alpha[i * 4 + c] = 1;
    }
    this.geo.setDrawRange(0, this.count * 6);
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.aAlpha.needsUpdate = true;
    return i;
  }

  /** Place a quad spanning two points — used for tyre marks. */
  addStrip(ax, ay, az, bx, by, bz, width, life, alpha = 1) {
    const i = this.head;
    this.head = (this.head + 1) % this.cap;
    this.count = Math.min(this.count + 1, this.cap);
    this.life[i] = life;
    this.maxLife[i] = life;
    const dx = bx - ax, dz = bz - az;
    const l = Math.hypot(dx, dz) || 1;
    const nx = (-dz / l) * width * 0.5, nz = (dx / l) * width * 0.5;
    const base = i * 12;
    const pts = [
      [ax - nx, ay, az - nz], [ax + nx, ay, az + nz],
      [bx + nx, by, bz + nz], [bx - nx, by, bz - nz],
    ];
    for (let c = 0; c < 4; c++) {
      this.pos[base + c * 3] = pts[c][0];
      this.pos[base + c * 3 + 1] = pts[c][1] + 0.015;
      this.pos[base + c * 3 + 2] = pts[c][2];
      this.alpha[i * 4 + c] = alpha;
    }
    this.geo.setDrawRange(0, this.count * 6);
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.aAlpha.needsUpdate = true;
    return i;
  }

  update(dt) {
    let dirty = false;
    for (let i = 0; i < this.count; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      const t = clamp(this.life[i] / this.maxLife[i], 0, 1);
      // Fade only over the last quarter of the lifetime.
      const a = t > 0.25 ? 1 : t * 4;
      for (let c = 0; c < 4; c++) {
        if (this.alpha[i * 4 + c] !== a) { this.alpha[i * 4 + c] = a; dirty = true; }
      }
    }
    if (dirty) this.geo.attributes.aAlpha.needsUpdate = true;
  }

  clear() {
    this.count = 0; this.head = 0;
    this.geo.setDrawRange(0, 0);
  }
}

export class DecalSystem {
  constructor(ctx) {
    this.ctx = ctx;
    const budget = ctx.settings.preset.decalBudget || 192;
    const T = (n, opts) => { try { return tex(n, opts); } catch (e) { return null; } };
    this.holes = new DecalLayer(ctx, T('bulletHole', { size: 128 }), Math.floor(budget * 0.4), { renderOrder: 6 });
    this.blood = new DecalLayer(ctx, T('bloodSplat', { size: 128 }), Math.floor(budget * 0.22), { renderOrder: 5, color: 0xffffff });
    this.marks = new DecalLayer(ctx, T('tireMark', { size: 128 }), Math.floor(budget * 0.3), { renderOrder: 4 });
    this.scorch = new DecalLayer(ctx, T('scorch', { size: 128 }), Math.floor(budget * 0.08) + 4, { renderOrder: 3 });
    this.layers = [this.holes, this.blood, this.marks, this.scorch];
  }

  addBulletHole(hit, size = 0.1) {
    this.holes.add(hit.x, hit.y, hit.z, hit.nx, hit.ny, hit.nz, size, 40);
  }
  addBlood(x, y, z, size = 1) {
    if (!this.ctx.settings.get('bloodFx')) return;
    this.blood.add(x, y + 0.01, z, 0, 1, 0, size * 0.6, 55);
  }
  addTireMark(from, to, width, strength) {
    this.marks.addStrip(from.x, from.y, from.z, to.x, to.y, to.z, width, 26, clamp(strength, 0.15, 1));
  }
  addScorch(x, y, z, size) {
    this.scorch.add(x, y, z, 0, 1, 0, size, 90);
  }

  update(dt) { for (const l of this.layers) l.update(dt); }
  clear() { for (const l of this.layers) l.clear(); }
  dispose() {
    for (const l of this.layers) { this.ctx.scene.remove(l.mesh); l.geo.dispose(); l.mesh.material.dispose(); }
  }
}
