/*
 * fx.js — particles, skid marks, debris and light pools.
 *
 *   particles   two GPU point clouds: "soft" (alpha-blended smoke, dust,
 *               water) and "glow" (additive fire, sparks, muzzle flashes,
 *               explosions). HDR colours above 1 bloom in post-processing.
 *   tracers     short additive line segments for bullets
 *   skid marks  a ring buffer of dark quads laid down by sliding tyres
 *   debris      knocked-over street furniture tumbling away; lamp posts
 *               topple from the base
 *   light pools the warm circles under street lamps at night, and car
 *               headlight beams on the road. They use multiply-add blending
 *               (surface × (1 + light)), so they light the ground rather
 *               than fogging it
 *   flash light one point light that moves to explosions and gunfire
 */
(function () {
  'use strict';

  const VH = window.VH;
  const { clamp, lerp } = VH.math;

  const POINT_VERT = /* glsl */ `
    attribute float aSize;
    attribute vec4 aColor;
    varying vec4 vColor;
    uniform float uScale;
    void main() {
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mv;
      gl_PointSize = aSize * uScale / max(0.2, -mv.z);
      vColor = aColor;
    }
  `;
  const SOFT_FRAG = /* glsl */ `
    varying vec4 vColor;
    uniform vec3 uLight;
    void main() {
      vec2 p = gl_PointCoord * 2.0 - 1.0;
      float r = dot(p, p);
      if (r > 1.0) discard;
      // Puffy edge: a little angular wobble in the falloff.
      float ang = atan(p.y, p.x);
      float edge = 1.0 - r * (0.85 + 0.15 * sin(ang * 5.0 + vColor.a * 17.0));
      float a = clamp(edge, 0.0, 1.0);
      a *= a;
      gl_FragColor = vec4(vColor.rgb * uLight, fract(vColor.a) * a);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `;
  const GLOW_FRAG = /* glsl */ `
    varying vec4 vColor;
    void main() {
      vec2 p = gl_PointCoord * 2.0 - 1.0;
      float r = dot(p, p);
      if (r > 1.0) discard;
      float a = 1.0 - r;
      a = a * a * a;
      gl_FragColor = vec4(vColor.rgb * a * vColor.a, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `;

  /** A pool of particles drawn as one THREE.Points. */
  class ParticlePool {
    constructor(max, material) {
      this.max = max;
      this.count = 0;
      this.p = new Float32Array(max * 3);
      this.v = new Float32Array(max * 3);
      this.life = new Float32Array(max);
      this.maxLife = new Float32Array(max);
      this.size0 = new Float32Array(max);
      this.size1 = new Float32Array(max);
      this.col = new Float32Array(max * 3);
      this.col1 = new Float32Array(max * 3);
      this.alpha = new Float32Array(max);
      this.drag = new Float32Array(max);
      this.grav = new Float32Array(max);
      this.seed = new Float32Array(max);
      const geo = new THREE.BufferGeometry();
      this.posAttr = new THREE.BufferAttribute(new Float32Array(max * 3), 3).setUsage(THREE.DynamicDrawUsage);
      this.sizeAttr = new THREE.BufferAttribute(new Float32Array(max), 1).setUsage(THREE.DynamicDrawUsage);
      this.colAttr = new THREE.BufferAttribute(new Float32Array(max * 4), 4).setUsage(THREE.DynamicDrawUsage);
      geo.setAttribute('position', this.posAttr);
      geo.setAttribute('aSize', this.sizeAttr);
      geo.setAttribute('aColor', this.colAttr);
      geo.setDrawRange(0, 0);
      this.points = new THREE.Points(geo, material);
      this.points.frustumCulled = false;
      this.points.renderOrder = 10;
    }

    /** o: { x,y,z, vx,vy,vz, life, size, size1, r,g,b, r1,g1,b1, a, drag, grav } */
    emit(o) {
      if (this.count >= this.max) return;
      const i = this.count++;
      const i3 = i * 3;
      this.p[i3] = o.x;
      this.p[i3 + 1] = o.y;
      this.p[i3 + 2] = o.z;
      this.v[i3] = o.vx || 0;
      this.v[i3 + 1] = o.vy || 0;
      this.v[i3 + 2] = o.vz || 0;
      this.life[i] = 0;
      this.maxLife[i] = o.life || 1;
      this.size0[i] = o.size || 1;
      this.size1[i] = o.size1 === undefined ? o.size || 1 : o.size1;
      this.col[i3] = o.r;
      this.col[i3 + 1] = o.g;
      this.col[i3 + 2] = o.b;
      this.col1[i3] = o.r1 === undefined ? o.r : o.r1;
      this.col1[i3 + 1] = o.g1 === undefined ? o.g : o.g1;
      this.col1[i3 + 2] = o.b1 === undefined ? o.b : o.b1;
      this.alpha[i] = o.a === undefined ? 1 : o.a;
      this.drag[i] = o.drag || 0;
      this.grav[i] = o.grav || 0;
      this.seed[i] = Math.random();
    }

    _kill(i) {
      const last = --this.count;
      if (i === last) return;
      const i3 = i * 3;
      const l3 = last * 3;
      for (let k = 0; k < 3; k++) {
        this.p[i3 + k] = this.p[l3 + k];
        this.v[i3 + k] = this.v[l3 + k];
        this.col[i3 + k] = this.col[l3 + k];
        this.col1[i3 + k] = this.col1[l3 + k];
      }
      this.life[i] = this.life[last];
      this.maxLife[i] = this.maxLife[last];
      this.size0[i] = this.size0[last];
      this.size1[i] = this.size1[last];
      this.alpha[i] = this.alpha[last];
      this.drag[i] = this.drag[last];
      this.grav[i] = this.grav[last];
      this.seed[i] = this.seed[last];
    }

    update(dt, soft) {
      const P = this.posAttr.array;
      const S = this.sizeAttr.array;
      const C = this.colAttr.array;
      let i = 0;
      while (i < this.count) {
        this.life[i] += dt;
        const t = this.life[i] / this.maxLife[i];
        if (t >= 1) {
          this._kill(i);
          continue;
        }
        const i3 = i * 3;
        const d = Math.exp(-this.drag[i] * dt);
        this.v[i3] *= d;
        this.v[i3 + 1] = this.v[i3 + 1] * d - this.grav[i] * dt;
        this.v[i3 + 2] *= d;
        this.p[i3] += this.v[i3] * dt;
        this.p[i3 + 1] += this.v[i3 + 1] * dt;
        this.p[i3 + 2] += this.v[i3 + 2] * dt;
        if (this.p[i3 + 1] < 0.02 && this.v[i3 + 1] < 0) {
          this.p[i3 + 1] = 0.02;
          this.v[i3 + 1] *= -0.3;
          this.v[i3] *= 0.6;
          this.v[i3 + 2] *= 0.6;
        }
        P[i3] = this.p[i3];
        P[i3 + 1] = this.p[i3 + 1];
        P[i3 + 2] = this.p[i3 + 2];
        S[i] = lerp(this.size0[i], this.size1[i], soft ? Math.sqrt(t) : t);
        const i4 = i * 4;
        C[i4] = lerp(this.col[i3], this.col1[i3], t);
        C[i4 + 1] = lerp(this.col[i3 + 1], this.col1[i3 + 1], t);
        C[i4 + 2] = lerp(this.col[i3 + 2], this.col1[i3 + 2], t);
        // Fade in fast, out slow. Soft particles keep a per-particle seed in the integer part.
        const fade = Math.min(1, t * 8) * (1 - t) * (1 - t);
        const a = this.alpha[i] * fade;
        C[i4 + 3] = soft ? Math.floor(this.seed[i] * 60) + Math.min(0.999, a) : a;
        i++;
      }
      this.points.geometry.setDrawRange(0, this.count);
      this.posAttr.needsUpdate = true;
      this.sizeAttr.needsUpdate = true;
      this.colAttr.needsUpdate = true;
      this.posAttr.clearUpdateRanges();
      this.posAttr.addUpdateRange(0, this.count * 3);
      this.sizeAttr.clearUpdateRanges();
      this.sizeAttr.addUpdateRange(0, this.count);
      this.colAttr.clearUpdateRanges();
      this.colAttr.addUpdateRange(0, this.count * 4);
    }
  }

  // ------------------------------------------------------------ skid marks
  class SkidMarks {
    constructor(max) {
      this.max = max;
      this.next = 0;
      const geo = new THREE.BufferGeometry();
      this.pos = new THREE.BufferAttribute(new Float32Array(max * 4 * 3), 3).setUsage(THREE.DynamicDrawUsage);
      this.col = new THREE.BufferAttribute(new Float32Array(max * 4 * 4), 4).setUsage(THREE.DynamicDrawUsage);
      const idx = new Uint32Array(max * 6);
      for (let i = 0; i < max; i++) {
        idx.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 2, i * 4 + 1, i * 4 + 3], i * 6);
      }
      geo.setAttribute('position', this.pos);
      geo.setAttribute('color', this.col);
      geo.setIndex(new THREE.BufferAttribute(idx, 1));
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff, vertexColors: true, transparent: true, depthWrite: false,
        polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4,
      });
      this.mesh = new THREE.Mesh(geo, mat);
      this.mesh.frustumCulled = false;
      this.mesh.renderOrder = 2;
      this.mesh.name = 'skid marks';
      this.last = new Map(); // "vehicle:wheel" → { x, y, z, lx, lz }
    }

    /** Continue (or start) a mark for one wheel. */
    add(key, x, y, z, dirX, dirZ, strength, width, dark) {
      const prev = this.last.get(key);
      if (!prev || strength <= 0.05) {
        if (strength > 0.05) this.last.set(key, { x, y, z });
        else this.last.delete(key);
        return;
      }
      const dx = x - prev.x;
      const dz = z - prev.z;
      const len = Math.hypot(dx, dz);
      if (len < 0.35) return;
      if (len > 3) {
        this.last.set(key, { x, y, z });
        return;
      }
      const nx = (-dz / len) * width * 0.5;
      const nz = (dx / len) * width * 0.5;
      const i = this.next;
      this.next = (this.next + 1) % this.max;
      const P = this.pos.array;
      const C = this.col.array;
      const b = i * 12;
      const y0 = prev.y + 0.012;
      const y1 = y + 0.012;
      P.set([prev.x + nx, y0, prev.z + nz, prev.x - nx, y0, prev.z - nz, x + nx, y1, z + nz, x - nx, y1, z - nz], b);
      const a = clamp(strength, 0, 1) * 0.55;
      const c = dark ? 0.03 : 0.07;
      const cb = i * 16;
      for (let k = 0; k < 4; k++) C.set([c, c, c, a], cb + k * 4);
      this.pos.needsUpdate = true;
      this.col.needsUpdate = true;
      this.last.set(key, { x, y, z });
      void dirX;
      void dirZ;
    }

    clear() {
      this.pos.array.fill(0);
      this.col.array.fill(0);
      this.pos.needsUpdate = true;
      this.col.needsUpdate = true;
      this.last.clear();
    }
  }

  // ------------------------------------------------------------ light pools
  const POOL_VERT = /* glsl */ `
    attribute vec4 aPool; // x, z of the light's centre in instance-local space, radius, strength
    attribute vec3 aTint;
    varying vec2 vLocal;
    varying vec4 vPool;
    varying vec3 vTint;
    void main() {
      vLocal = position.xz;
      vPool = aPool;
      vTint = aTint;
      vec4 wp = instanceMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * viewMatrix * modelMatrix * wp;
    }
  `;
  const POOL_FRAG = /* glsl */ `
    uniform float uIntensity;
    uniform vec3 uColor;
    varying vec2 vLocal;
    varying vec4 vPool;
    varying vec3 vTint;
    void main() {
      vec2 d = (vLocal - vPool.xy) / vPool.z;
      float r = dot(d, d);
      if (r > 1.0) discard;
      float f = (1.0 - r);
      f = f * f * (0.35 + 0.65 * (1.0 - sqrt(r)));
      vec3 c = uColor * vTint * f * uIntensity * vPool.w;
      gl_FragColor = vec4(c, 1.0);
    }
  `;

  /** Instanced ground-light decals. Each instance is a quad in its own local frame. */
  class LightPools {
    constructor(max, quad, color, name) {
      const geo = new THREE.PlaneGeometry(quad.w, quad.d).rotateX(-Math.PI / 2).translate(quad.cx || 0, 0, quad.cz || 0);
      this.aPool = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4).setUsage(THREE.DynamicDrawUsage);
      this.aTint = new THREE.InstancedBufferAttribute(new Float32Array(max * 3).fill(1), 3).setUsage(THREE.DynamicDrawUsage);
      geo.setAttribute('aPool', this.aPool);
      geo.setAttribute('aTint', this.aTint);
      this.material = new THREE.ShaderMaterial({
        uniforms: { uIntensity: { value: 0 }, uColor: { value: new THREE.Color(color) } },
        vertexShader: POOL_VERT,
        fragmentShader: POOL_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.CustomBlending,
        blendEquation: THREE.AddEquation,
        blendSrc: THREE.DstColorFactor,
        blendDst: THREE.OneFactor,
        polygonOffset: true,
        polygonOffsetFactor: -3,
        polygonOffsetUnits: -6,
        fog: false,
      });
      this.mesh = new THREE.InstancedMesh(geo, this.material, max);
      this.mesh.count = 0;
      this.mesh.frustumCulled = false;
      this.mesh.renderOrder = 3;
      this.mesh.name = name;
      this.max = max;
    }

    set(i, matrix, px, pz, radius, strength, tint) {
      this.mesh.setMatrixAt(i, matrix);
      this.aPool.setXYZW(i, px, pz, radius, strength);
      if (tint) this.aTint.setXYZ(i, tint[0], tint[1], tint[2]);
      if (i >= this.mesh.count) this.mesh.count = i + 1;
    }

    commit() {
      this.mesh.instanceMatrix.needsUpdate = true;
      this.aPool.needsUpdate = true;
      this.aTint.needsUpdate = true;
    }
  }

  // ------------------------------------------------------------------ FX
  class FX {
    constructor(game) {
      this.game = game;
      this.scene = game.scene;
      this.physics = game.physics;
      this.uScale = { value: 400 };
      this.uLight = { value: new THREE.Vector3(1, 1, 1) };
      const softMat = new THREE.ShaderMaterial({
        uniforms: { uScale: this.uScale, uLight: this.uLight },
        vertexShader: POINT_VERT, fragmentShader: SOFT_FRAG,
        transparent: true, depthWrite: false, blending: THREE.NormalBlending,
      });
      const glowMat = new THREE.ShaderMaterial({
        uniforms: { uScale: this.uScale },
        vertexShader: POINT_VERT, fragmentShader: GLOW_FRAG,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      });
      this.soft = new ParticlePool(3000, softMat);
      this.glow = new ParticlePool(2500, glowMat);
      this.soft.points.name = 'fx soft';
      this.glow.points.name = 'fx glow';
      this.scene.add(this.soft.points, this.glow.points);

      this.skids = new SkidMarks(2600);
      this.scene.add(this.skids.mesh);

      // Tracers.
      this.maxTracers = 64;
      const tg = new THREE.BufferGeometry();
      this.tracerPos = new THREE.BufferAttribute(new Float32Array(this.maxTracers * 6), 3).setUsage(THREE.DynamicDrawUsage);
      tg.setAttribute('position', this.tracerPos);
      tg.setDrawRange(0, 0);
      this.tracerMat = new THREE.LineBasicMaterial({ color: new THREE.Color(5, 3.6, 1.6), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
      this.tracers = new THREE.LineSegments(tg, this.tracerMat);
      this.tracers.frustumCulled = false;
      this.tracerList = [];
      this.scene.add(this.tracers);

      // The one moving flash light (explosions, muzzle flashes).
      this.flash = new THREE.PointLight(0xffa04a, 0, 30, 2);
      this.flash.position.set(0, -100, 0);
      this.scene.add(this.flash);
      this._flashT = 0;
      this._flashPeak = 0;

      this.debris = [];
      this.fires = []; // { x, y, z, t, dur, scale } burning spots (molotovs, wrecks)
      this.geysers = []; // broken hydrants
      this.lampPools = null;
      this.carPools = null;
      this._carPoolCount = 0;
      this._acc = 0;
    }

    /** Build the street-lamp light pools once the city exists. */
    buildLampPools(lamps) {
      if (!lamps || !lamps.length) return;
      // Road side (at road level) and pavement side (at kerb height) of each lamp.
      // Local frame of a lamp: the pole at the origin, the arm along +Z; the kerb edge is at z = 0.7.
      const n = lamps.length;
      this.roadPools = new LightPools(n, { w: 14, d: 9.3, cz: 0.7 + 4.65 }, 0xffc58a, 'lamp pools (road)');
      this.walkPools = new LightPools(n, { w: 14, d: 4.6, cz: 0.7 - 2.3 }, 0xffc58a, 'lamp pools (pavement)');
      const m = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const y = new THREE.Vector3(0, 1, 0);
      lamps.forEach((l, i) => {
        q.setFromAxisAngle(y, l.yaw);
        m.compose(new THREE.Vector3(l.x, 0.006, l.z), q, new THREE.Vector3(1, 1, 1));
        this.roadPools.set(i, m, 0, 2.2, 7.2, 1);
        m.compose(new THREE.Vector3(l.x, 0.157, l.z), q, new THREE.Vector3(1, 1, 1));
        this.walkPools.set(i, m, 0, 2.2, 7.2, 1);
      });
      this.roadPools.commit();
      this.walkPools.commit();
      this.scene.add(this.roadPools.mesh, this.walkPools.mesh);
      // Headlight beams and emergency lights (updated every frame).
      this.carPools = new LightPools(96, { w: 9, d: 22, cz: 11 }, 0xffffff, 'car light pools');
      this.scene.add(this.carPools.mesh);
    }

    /** Street lamps and headlights fade in at dusk. */
    setNight(n) {
      const k = clamp((n - 0.15) / 0.6, 0, 1);
      if (this.roadPools) {
        this.roadPools.material.uniforms.uIntensity.value = k * 2.4;
        this.walkPools.material.uniforms.uIntensity.value = k * 2.4;
        this.roadPools.mesh.visible = this.walkPools.mesh.visible = k > 0.01;
      }
      this.night = k;
    }

    beginCarPools() {
      this._carPoolCount = 0;
    }

    /** A headlight beam (or a coloured flash pool) in front of / around a car. */
    carPool(matrix, px, pz, radius, strength, tint) {
      if (!this.carPools || this._carPoolCount >= this.carPools.max) return;
      this.carPools.set(this._carPoolCount++, matrix, px, pz, radius, strength, tint);
    }

    endCarPools() {
      if (!this.carPools) return;
      this.carPools.mesh.count = this._carPoolCount;
      this.carPools.material.uniforms.uIntensity.value = 1;
      this.carPools.commit();
    }

    // ------------------------------------------------------------ emitters
    tyreSmoke(x, y, z, strength, vx, vz, surface) {
      const dirt = surface === 'grass' || surface === 'gravel';
      const c = dirt ? [0.34, 0.27, 0.18] : [0.8, 0.8, 0.82];
      this.soft.emit({
        x: x + (Math.random() - 0.5) * 0.3, y: y + 0.15, z: z + (Math.random() - 0.5) * 0.3,
        vx: vx * 0.2 + (Math.random() - 0.5) * 1.2, vy: 0.5 + Math.random() * 0.7, vz: vz * 0.2 + (Math.random() - 0.5) * 1.2,
        life: 1.1 + Math.random() * 1.2, size: 0.5, size1: 1.9 + strength * 1.5,
        r: c[0] * 0.85, g: c[1] * 0.85, b: c[2] * 0.85, a: 0.14 * strength + 0.04, drag: 1.8, grav: -0.2,
      });
    }

    dust(x, y, z, amount) {
      for (let i = 0; i < amount; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 1.5 + Math.random() * 3;
        this.soft.emit({
          x, y: y + 0.2, z, vx: Math.cos(a) * s, vy: 0.4 + Math.random(), vz: Math.sin(a) * s,
          life: 1 + Math.random(), size: 0.8, size1: 3, r: 0.55, g: 0.5, b: 0.42, a: 0.35, drag: 2.2,
        });
      }
    }

    /** Engine smoke from a damaged car (darker as it gets worse). */
    engineSmoke(x, y, z, dark, vx, vz) {
      const c = lerp(0.75, 0.12, dark);
      this.soft.emit({
        x: x + (Math.random() - 0.5) * 0.4, y, z: z + (Math.random() - 0.5) * 0.4,
        vx: vx * 0.3 + (Math.random() - 0.5) * 0.4, vy: 1.4 + Math.random(), vz: vz * 0.3 + (Math.random() - 0.5) * 0.4,
        life: 1.8 + Math.random() * 1.2, size: 0.5, size1: 2.6 + dark * 1.5,
        r: c, g: c, b: c * 1.02, a: 0.35 + dark * 0.3, drag: 0.9, grav: -0.3,
      });
    }

    flame(x, y, z, scale) {
      const s = scale || 1;
      this.glow.emit({
        x: x + (Math.random() - 0.5) * 0.6 * s, y: y + Math.random() * 0.2, z: z + (Math.random() - 0.5) * 0.6 * s,
        vx: (Math.random() - 0.5) * 0.6, vy: 2 + Math.random() * 2.2 * s, vz: (Math.random() - 0.5) * 0.6,
        life: 0.35 + Math.random() * 0.35, size: 0.9 * s, size1: 0.2,
        r: 6, g: 2.6, b: 0.6, r1: 3, g1: 0.5, b1: 0.1, a: 0.9, drag: 1.2, grav: -1.5,
      });
      if (Math.random() < 0.35) {
        this.soft.emit({
          x, y: y + 0.8 * s, z, vx: (Math.random() - 0.5) * 0.5, vy: 2 + Math.random(), vz: (Math.random() - 0.5) * 0.5,
          life: 2 + Math.random(), size: 0.8 * s, size1: 3.5 * s, r: 0.08, g: 0.08, b: 0.08, a: 0.45, drag: 0.6, grav: -0.4,
        });
      }
    }

    sparks(x, y, z, nx, nz, count, speed) {
      const n = count || 10;
      const sp = speed || 6;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = sp * (0.4 + Math.random());
        this.glow.emit({
          x, y, z,
          vx: nx * s * 0.8 + Math.cos(a) * s * 0.5, vy: 1 + Math.random() * 3, vz: nz * s * 0.8 + Math.sin(a) * s * 0.5,
          life: 0.25 + Math.random() * 0.45, size: 0.09, size1: 0.03,
          r: 8, g: 5, b: 1.6, r1: 5, g1: 1.2, b1: 0.2, a: 1, drag: 0.8, grav: 12,
        });
      }
    }

    glass(x, y, z, count) {
      for (let i = 0; i < (count || 14); i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 1 + Math.random() * 3;
        this.glow.emit({
          x, y, z, vx: Math.cos(a) * s, vy: 1 + Math.random() * 2.5, vz: Math.sin(a) * s,
          life: 0.5 + Math.random() * 0.6, size: 0.06, size1: 0.05, r: 1.4, g: 1.8, b: 2.2, a: 0.8, drag: 0.5, grav: 11,
        });
      }
    }

    water(x, y, z, strength) {
      for (let i = 0; i < 3; i++) {
        this.soft.emit({
          x: x + (Math.random() - 0.5) * 0.2, y, z: z + (Math.random() - 0.5) * 0.2,
          vx: (Math.random() - 0.5) * 1.6, vy: 8 + Math.random() * 3 * strength, vz: (Math.random() - 0.5) * 1.6,
          life: 1.3 + Math.random() * 0.5, size: 0.35, size1: 1.4, r: 0.85, g: 0.92, b: 1.0, a: 0.45, drag: 0.4, grav: 9.8,
        });
      }
    }

    /** Muzzle flash and a brief light. */
    muzzle(x, y, z, big) {
      this.glow.emit({ x, y, z, life: 0.05, size: big ? 0.9 : 0.55, size1: 0.2, r: 9, g: 6, b: 2.4, a: 1 });
      this.soft.emit({ x, y, z, vy: 0.6, life: 0.5, size: 0.15, size1: 0.9, r: 0.6, g: 0.6, b: 0.6, a: 0.15, drag: 2 });
      this._pulse(x, y, z, big ? 6 : 4, 0xffb060, 0.06, 12);
    }

    /** A bullet hitting something. */
    impact(x, y, z, nx, ny, nz, surface) {
      if (surface === 'metal' || surface === 'car') this.sparks(x, y, z, nx, nz, 6, 4);
      if (surface === 'flesh') {
        for (let i = 0; i < 4; i++) {
          this.soft.emit({
            x, y, z, vx: nx * 1.5 + (Math.random() - 0.5), vy: 0.5 + Math.random(), vz: nz * 1.5 + (Math.random() - 0.5),
            life: 0.4, size: 0.12, size1: 0.35, r: 0.35, g: 0.02, b: 0.02, a: 0.6, drag: 2, grav: 6,
          });
        }
        return;
      }
      if (surface === 'glass') this.glass(x, y, z, 8);
      const c = surface === 'wood' ? [0.45, 0.35, 0.22] : [0.62, 0.6, 0.56];
      for (let i = 0; i < 3; i++) {
        this.soft.emit({
          x, y, z, vx: nx * 2 + (Math.random() - 0.5), vy: ny * 2 + Math.random() * 0.8, vz: nz * 2 + (Math.random() - 0.5),
          life: 0.6 + Math.random() * 0.3, size: 0.1, size1: 0.6, r: c[0], g: c[1], b: c[2], a: 0.5, drag: 3,
        });
      }
    }

    tracer(x0, y0, z0, x1, y1, z1) {
      if (this.tracerList.length >= this.maxTracers) this.tracerList.shift();
      this.tracerList.push({ x0, y0, z0, x1, y1, z1, t: 0 });
    }

    nitro(x, y, z, dx, dz) {
      this.glow.emit({
        x, y, z, vx: -dx * 6 + (Math.random() - 0.5), vy: (Math.random() - 0.3) * 0.5, vz: -dz * 6 + (Math.random() - 0.5),
        life: 0.12 + Math.random() * 0.08, size: 0.5, size1: 0.1, r: 1.2, g: 2.4, b: 8, r1: 6, g1: 2, b1: 0.6, a: 1, drag: 3,
      });
    }

    explosion(x, y, z, scale) {
      const s = scale || 1;
      // Fireball.
      for (let i = 0; i < 70 * s; i++) {
        const a = Math.random() * Math.PI * 2;
        const e = Math.random() * 0.9 - 0.1;
        const sp = 3 + Math.random() * 9 * s;
        this.glow.emit({
          x, y: y + 0.5, z,
          vx: Math.cos(a) * Math.cos(e) * sp, vy: Math.sin(e) * sp + 3, vz: Math.sin(a) * Math.cos(e) * sp,
          life: 0.5 + Math.random() * 0.7, size: 2.5 * s, size1: 0.6,
          r: 9, g: 4.2, b: 1.2, r1: 4, g1: 0.6, b1: 0.1, a: 0.85, drag: 2.6, grav: -2,
        });
      }
      // Flash.
      this.glow.emit({ x, y: y + 1, z, life: 0.18, size: 16 * s, size1: 4, r: 12, g: 9, b: 6, a: 1 });
      // Debris sparks.
      this.sparks(x, y + 0.8, z, 0, 0, 40, 14);
      // Smoke column and shock dust.
      for (let i = 0; i < 40 * s; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 1 + Math.random() * 5;
        this.soft.emit({
          x: x + Math.cos(a) * 0.5, y: y + 0.5 + Math.random() * 1.5, z: z + Math.sin(a) * 0.5,
          vx: Math.cos(a) * sp, vy: 2 + Math.random() * 4, vz: Math.sin(a) * sp,
          life: 3 + Math.random() * 3, size: 1.5 * s, size1: 7 * s,
          r: 0.1, g: 0.09, b: 0.09, a: 0.55, drag: 1.3, grav: -0.35,
        });
      }
      this.dust(x, 0.1, z, 16);
      this._pulse(x, y + 2, z, 60 * s, 0xff9040, 0.9, 60);
      this.fires.push({ x, y: y + 0.4, z, t: 0, dur: 6, scale: 1.3 });
    }

    /** A patch of burning ground (molotov) or a burning wreck. */
    fireAt(x, y, z, seconds, scale) {
      this.fires.push({ x, y, z, t: 0, dur: seconds, scale: scale || 1 });
    }

    geyser(x, y, z) {
      this.geysers.push({ x, y, z, t: 0, dur: 14 });
    }

    _pulse(x, y, z, intensity, color, seconds, range) {
      if (intensity < this._flashPeak * (1 - this._flashT) && this._flashT < 0.5) return;
      this.flash.position.set(x, y, z);
      this.flash.color.setHex(color);
      this.flash.distance = range || 30;
      this._flashPeak = intensity;
      this._flashDur = seconds;
      this._flashT = 0;
    }

    // ---------------------------------------------------------- debris
    /** A knocked-over prop: its instanced parts become a tumbling group. */
    propDebris(parts, item, vehicle, type) {
      const group = new THREE.Group();
      for (const part of parts) {
        const mesh = new THREE.Mesh(part.geo, part.mat);
        mesh.castShadow = !!part.shadow;
        mesh.receiveShadow = true;
        if (part.depth) mesh.customDepthMaterial = part.depth;
        group.add(mesh);
      }
      group.position.set(item.x, item.y, item.z);
      group.rotation.y = item.yaw;
      group.scale.setScalar(item.s || 1);
      this.scene.add(group);
      const pole = type === 'streetlight';
      const vx = vehicle ? vehicle.vel.x : 0;
      const vz = vehicle ? vehicle.vel.z : 0;
      const sp = Math.hypot(vx, vz) || 1;
      const d = {
        group, pole, t: 0,
        vx: pole ? 0 : vx * 0.75 + (Math.random() - 0.5) * 2,
        vy: pole ? 0 : 2 + sp * 0.18 + Math.random() * 2,
        vz: pole ? 0 : vz * 0.75 + (Math.random() - 0.5) * 2,
        ax: (Math.random() - 0.5) * 8, az: (Math.random() - 0.5) * 8,
        fallDirX: vx / sp, fallDirZ: vz / sp, fall: 0, fallV: pole ? 0.6 : 0,
        rest: false,
      };
      this.debris.push(d);
      if (this.debris.length > 28) {
        const old = this.debris.shift();
        this.scene.remove(old.group);
      }
      if (type === 'hydrant') this.geyser(item.x, item.y + 0.4, item.z);
      if (pole) this.sparks(item.x, item.y + 0.5, item.z, vx / sp, vz / sp, 14, 6);
      this.dust(item.x, item.y, item.z, 5);
    }

    _updateDebris(dt) {
      const ph = this.physics;
      for (const d of this.debris) {
        d.t += dt;
        if (d.rest) continue;
        const g = d.group;
        if (d.pole) {
          // Topple from the base toward the direction of the hit.
          d.fallV += dt * (2.2 + d.fall * 5);
          d.fall = Math.min(Math.PI / 2 - 0.02, d.fall + d.fallV * dt);
          const axis = this._axis || (this._axis = new THREE.Vector3());
          axis.set(d.fallDirZ, 0, -d.fallDirX).normalize();
          const q = this._q || (this._q = new THREE.Quaternion());
          q.setFromAxisAngle(axis, d.fall);
          if (!d.baseQ) d.baseQ = g.quaternion.clone();
          g.quaternion.copy(q).multiply(d.baseQ);
          if (d.fall >= Math.PI / 2 - 0.03) {
            d.rest = true;
            this.dust(g.position.x + d.fallDirX * 6, 0.2, g.position.z + d.fallDirZ * 6, 10);
            if (VH.game && VH.game.audio) VH.game.audio.crash && VH.game.audio.crash(0.35, 0);
          }
          continue;
        }
        d.vy -= 18 * dt;
        g.position.x += d.vx * dt;
        g.position.y += d.vy * dt;
        g.position.z += d.vz * dt;
        g.rotation.x += d.ax * dt;
        g.rotation.z += d.az * dt;
        const floor = ph.groundHeight(g.position.x, g.position.z, g.position.y + 0.5);
        if (g.position.y < floor) {
          g.position.y = floor;
          d.vy = Math.abs(d.vy) > 3 ? -d.vy * 0.3 : 0;
          d.vx *= 0.6;
          d.vz *= 0.6;
          d.ax *= 0.5;
          d.az *= 0.5;
          if (Math.abs(d.vx) + Math.abs(d.vz) < 0.3 && d.vy === 0) {
            d.rest = true;
            // Lie flat-ish.
            g.rotation.x = Math.round(g.rotation.x / (Math.PI / 2)) * (Math.PI / 2);
            g.rotation.z = Math.round(g.rotation.z / (Math.PI / 2)) * (Math.PI / 2);
          }
        }
      }
    }

    clearDebris() {
      for (const d of this.debris) this.scene.remove(d.group);
      this.debris.length = 0;
      this.fires.length = 0;
      this.geysers.length = 0;
      this.skids.clear();
    }

    // ------------------------------------------------------------ frame
    update(dt, camera, viewportHeight) {
      this.uScale.value = (viewportHeight * 0.5) / Math.tan((camera.fov * Math.PI) / 360);
      const env = this.game.environment;
      if (env) {
        // Smoke is lit by the sky: bright by day, dim blue-grey at night.
        const n = env.nightFactor || 0;
        const k = lerp(1.25, 0.16, n);
        this.uLight.value.set(k, k * (1 - n * 0.05), k * (1 + n * 0.25));
      }
      for (const f of this.fires) {
        f.t += dt;
        const k = f.t < f.dur - 1 ? 1 : Math.max(0, f.dur - f.t);
        if (Math.random() < 0.9 * k) this.flame(f.x, f.y, f.z, f.scale * (0.7 + 0.3 * k));
      }
      this.fires = this.fires.filter((f) => f.t < f.dur);
      for (const gy of this.geysers) {
        gy.t += dt;
        this.water(gy.x, gy.y, gy.z, Math.max(0, 1 - gy.t / gy.dur));
      }
      this.geysers = this.geysers.filter((g) => g.t < g.dur);
      this.soft.update(dt, true);
      this.glow.update(dt, false);
      this._updateDebris(dt);

      // Tracers.
      const T = this.tracerPos.array;
      let n = 0;
      for (const t of this.tracerList) {
        t.t += dt;
        const k = Math.min(1, t.t / 0.05);
        const x0 = lerp(t.x0, t.x1, Math.max(0, k - 0.35));
        const y0 = lerp(t.y0, t.y1, Math.max(0, k - 0.35));
        const z0 = lerp(t.z0, t.z1, Math.max(0, k - 0.35));
        const x1 = lerp(t.x0, t.x1, k);
        const y1 = lerp(t.y0, t.y1, k);
        const z1 = lerp(t.z0, t.z1, k);
        T.set([x0, y0, z0, x1, y1, z1], n * 6);
        n++;
      }
      this.tracerList = this.tracerList.filter((t) => t.t < 0.07);
      this.tracers.geometry.setDrawRange(0, n * 2);
      this.tracerPos.needsUpdate = true;

      // Flash light decay.
      if (this._flashPeak > 0) {
        this._flashT += dt / (this._flashDur || 0.1);
        const k = Math.max(0, 1 - this._flashT);
        this.flash.intensity = this._flashPeak * k * k;
        if (k <= 0) this._flashPeak = 0;
      } else this.flash.intensity = 0;
    }
  }

  VH.FX = FX;
})();
