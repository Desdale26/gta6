// renderer.js — WebGL renderer, camera, and the HDR post-processing chain.
//
// Pipeline:  scene → HDR target (linear, half-float, + depth texture)
//            → bloom (still linear HDR)
//            → composite (depth-only ambient occlusion, camera motion blur,
//                         depth of field, chromatic aberration, aerial haze,
//                         ACES tonemap, grade, grain, vignette, wet lens)
//            → SMAA → screen
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { Pass } from 'three/addons/postprocessing/Pass.js';
import { clamp, RollingAverage } from '../core/mathx.js';

// Radius of the ambient-occlusion sample disc, in metres of world space.
const AO_WORLD_RADIUS = 0.9;

const COMPOSITE_SHADER = {
  name: 'ViceComposite',
  uniforms: {
    tDiffuse: { value: null },
    tDepth: { value: null },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uExposure: { value: 1.0 },
    uContrast: { value: 1.04 },
    uSaturation: { value: 1.08 },
    uLift: { value: new THREE.Vector3(0, 0, 0) },
    uGain: { value: new THREE.Vector3(1, 1, 1) },
    uGamma: { value: new THREE.Vector3(1, 1, 1) },
    uVignette: { value: 0.5 },
    uGrain: { value: 0.35 },
    uChroma: { value: 0.3 },
    uTime: { value: 0 },
    uMotionScale: { value: 0 },
    uPrevViewProj: { value: new THREE.Matrix4() },
    uInvViewProj: { value: new THREE.Matrix4() },
    uCameraNearFar: { value: new THREE.Vector2(0.1, 1000) },
    uDofFocus: { value: 30.0 },
    uDofRange: { value: 240.0 },
    uDofStrength: { value: 0.0 },
    uFogColor: { value: new THREE.Color(0.6, 0.7, 0.85) },
    uHazeStrength: { value: 0.0 },
    uAOStrength: { value: 0.0 },
    uAORadius: { value: 0.9 },
    uWetLens: { value: 0.0 },
    uFlash: { value: 0.0 },
    uDamage: { value: 0.0 },
    uDrunk: { value: 0.0 },
    uScanline: { value: 0.0 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
  `,
  fragmentShader: /* glsl */`
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D tDiffuse;
    uniform sampler2D tDepth;
    uniform vec2 uResolution;
    uniform float uExposure, uContrast, uSaturation, uVignette, uGrain, uChroma, uTime;
    uniform vec3 uLift, uGain, uGamma;
    uniform float uMotionScale;
    uniform mat4 uPrevViewProj, uInvViewProj;
    uniform vec2 uCameraNearFar;
    uniform float uDofFocus, uDofRange, uDofStrength;
    uniform vec3 uFogColor;
    uniform float uHazeStrength, uWetLens, uFlash, uDamage, uDrunk, uScanline;
    uniform float uAOStrength, uAORadius;

    float linearDepth(float d){
      float n = uCameraNearFar.x, f = uCameraNearFar.y;
      float z = d * 2.0 - 1.0;
      return (2.0 * n * f) / (f + n - z * (f - n));
    }

    // Narkowicz ACES fit — cheap and close enough to the reference curve.
    vec3 aces(vec3 x){
      const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
      return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
    }
    vec3 toSRGB(vec3 c){
      return mix(c * 12.92, 1.055 * pow(max(c, vec3(0.0)), vec3(1.0/2.4)) - 0.055, step(0.0031308, c));
    }
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }

    void main(){
      vec2 uv = vUv;
      vec2 center = uv - 0.5;
      float r2 = dot(center, center);

      // Drunk / impact warp
      if (uDrunk > 0.001){
        uv += vec2(sin(uTime * 1.7 + uv.y * 9.0), cos(uTime * 1.3 + uv.x * 7.0)) * 0.006 * uDrunk;
      }

      float depth = texture2D(tDepth, uv).x;
      float lin = linearDepth(depth);

      // ---- camera motion blur via depth reprojection ----
      vec3 col;
      float mScale = uMotionScale;
      if (mScale > 0.0005 && depth < 1.0){
        vec4 clip = vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
        vec4 world = uInvViewProj * clip;
        world /= world.w;
        vec4 prev = uPrevViewProj * world;
        vec2 prevUv = (prev.xy / prev.w) * 0.5 + 0.5;
        vec2 vel = (uv - prevUv) * mScale;
        float vlen = length(vel);
        vel = vlen > 0.06 ? vel * (0.06 / vlen) : vel;
        vec3 sum = vec3(0.0);
        const int STEPS = 7;
        for (int i = 0; i < STEPS; i++){
          float t = (float(i) / float(STEPS - 1)) - 0.5;
          sum += texture2D(tDiffuse, uv + vel * t).rgb;
        }
        col = sum / float(STEPS);
      } else {
        col = texture2D(tDiffuse, uv).rgb;
      }

      // ---- cheap depth-of-field: blur what is far outside the focus band ----
      if (uDofStrength > 0.001){
        float coc = clamp((lin - uDofFocus) / uDofRange, -1.0, 1.0);
        coc = abs(coc) * uDofStrength;
        if (coc > 0.01){
          vec2 px = coc * 2.6 / uResolution;
          vec3 b = col;
          b += texture2D(tDiffuse, uv + vec2( px.x,  px.y)).rgb;
          b += texture2D(tDiffuse, uv + vec2(-px.x,  px.y)).rgb;
          b += texture2D(tDiffuse, uv + vec2( px.x, -px.y)).rgb;
          b += texture2D(tDiffuse, uv + vec2(-px.x, -px.y)).rgb;
          b += texture2D(tDiffuse, uv + vec2( px.x * 1.6, 0.0)).rgb;
          b += texture2D(tDiffuse, uv + vec2(-px.x * 1.6, 0.0)).rgb;
          col = mix(col, b / 7.0, clamp(coc, 0.0, 1.0));
        }
      }

      // ---- ambient occlusion ----
      // Depth-only, in the same pass: sample a disc whose world size is fixed
      // (so it shrinks correctly with distance) and darken wherever the
      // neighbourhood sits in front of this pixel. Contacts between a wall and
      // the pavement, under parked cars and inside doorways are what sell
      // procedural boxes as solid objects. Differences beyond the radius are
      // ignored so silhouettes do not get a halo.
      if (uAOStrength > 0.001 && depth < 1.0 && lin < 220.0){
        float rad = clamp(uAORadius / max(lin, 0.5), 0.0015, 0.045);
        float ang = hash(gl_FragCoord.xy) * 6.2831853;
        float ca = cos(ang), sa = sin(ang);
        float occ = 0.0;
        const int AO_TAPS = 10;
        for (int i = 0; i < AO_TAPS; i++){
          float fi = float(i);
          float a = fi * 2.3999632;                 // golden angle spiral
          float rr = sqrt((fi + 0.5) / float(AO_TAPS));
          vec2 o = vec2(cos(a), sin(a)) * rr;
          o = vec2(o.x * ca - o.y * sa, o.x * sa + o.y * ca) * rad;
          o.x *= uResolution.y / uResolution.x;     // keep the disc round
          float sd = linearDepth(texture2D(tDepth, uv + o).x);
          float diff = lin - sd;                    // >0: the sample is nearer
          occ += smoothstep(0.03, 0.5, diff) * (1.0 - smoothstep(1.6, 3.2, diff));
        }
        occ /= float(AO_TAPS);
        // Fade out with distance so the far city is not speckled.
        float fade = 1.0 - smoothstep(120.0, 220.0, lin);
        col *= 1.0 - clamp(occ, 0.0, 1.0) * uAOStrength * fade;
      }

      // ---- chromatic aberration (lens, strongest at the edges) ----
      if (uChroma > 0.001){
        float amt = uChroma * 0.0028 * (0.25 + r2 * 3.0);
        vec2 dir = normalize(center + 1e-5);
        col.r = texture2D(tDiffuse, uv + dir * amt).r;
        col.b = texture2D(tDiffuse, uv - dir * amt).b;
      }

      // ---- aerial perspective haze ----
      if (uHazeStrength > 0.001 && depth < 1.0){
        float h = 1.0 - exp(-lin * uHazeStrength * 0.0011);
        col = mix(col, uFogColor, clamp(h, 0.0, 0.72));
      }

      // ---- exposure + tonemap ----
      col *= uExposure;
      col = aces(col);

      // ---- grade: lift / gamma / gain, contrast, saturation ----
      col = uLift + col * uGain;
      col = pow(max(col, vec3(0.0)), uGamma);
      col = (col - 0.5) * uContrast + 0.5;
      float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(luma), col, uSaturation);

      // ---- wet lens droplets ----
      if (uWetLens > 0.001){
        vec2 g = floor(uv * vec2(24.0, 14.0));
        float d = hash(g);
        if (d > 0.965 - uWetLens * 0.06){
          vec2 f = fract(uv * vec2(24.0, 14.0)) - 0.5;
          float drop = smoothstep(0.34, 0.05, length(f));
          col = mix(col, texture2D(tDiffuse, uv + f * 0.02).rgb * 1.15, drop * uWetLens * 0.7);
        }
        col += uWetLens * 0.015 * hash(uv * 700.0 + uTime);
      }

      // ---- damage + flash ----
      col = mix(col, vec3(0.55, 0.03, 0.03), uDamage * smoothstep(0.05, 0.42, r2) * 0.8);
      col = mix(col, vec3(1.0), uFlash);

      // ---- vignette ----
      col *= 1.0 - uVignette * smoothstep(0.16, 0.78, r2);

      // ---- film grain (animated, luminance-weighted so shadows stay clean) ----
      if (uGrain > 0.001){
        float n = hash(uv * uResolution + fract(uTime) * 1234.5) - 0.5;
        col += n * uGrain * 0.055 * (0.35 + 0.65 * (1.0 - luma));
      }
      if (uScanline > 0.001){
        col *= 1.0 - uScanline * 0.12 * step(0.5, fract(gl_FragCoord.y * 0.5));
      }

      gl_FragColor = vec4(toSRGB(clamp(col, 0.0, 1.0)), 1.0);
    }
  `,
};

export class Renderer {
  constructor(canvas, settings) {
    this.canvas = canvas;
    this.settings = settings;
    this.frame = 0;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
      preserveDrawingBuffer: false,
    });
    this.renderer.setClearColor(0x0a0a12, 1);
    this.renderer.toneMapping = THREE.NoToneMapping;      // done in the composite pass
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = true;
    this.renderer.info.autoReset = false;
    this.maxAnisotropy = this.renderer.capabilities.getMaxAnisotropy();

    this.scene = new THREE.Scene();
    this.scene.matrixWorldAutoUpdate = true;

    const preset = settings.preset;
    this.camera = new THREE.PerspectiveCamera(settings.get('fov'), 1, 0.22, Math.max(2400, preset.drawDistance * 2.6));
    this.camera.rotation.order = 'YXZ';
    this.scene.add(this.camera);

    this._prevViewProj = new THREE.Matrix4();
    this._invViewProj = new THREE.Matrix4();
    this._tmpMat = new THREE.Matrix4();
    this.frameMs = new RollingAverage(90);
    this.fps = 60;
    this._fpsAccum = 0;
    this._fpsFrames = 0;
    this._autoTimer = 0;
    this._resolutionScale = 1;

    this._buildTargets();
    this._buildComposer();
    this.resize();

    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);
    this._onLost = (e) => { e.preventDefault(); console.warn('[renderer] WebGL context lost'); };
    canvas.addEventListener('webglcontextlost', this._onLost, false);
  }

  get domElement() { return this.renderer.domElement; }

  _makeTarget() {
    const dt = new THREE.DepthTexture(1, 1);
    dt.type = THREE.UnsignedIntType;
    dt.format = THREE.DepthFormat;
    dt.minFilter = THREE.NearestFilter;
    dt.magFilter = THREE.NearestFilter;
    return new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: true,
      depthTexture: dt,
      samples: 0,
      colorSpace: THREE.LinearSRGBColorSpace,
    });
  }

  _buildTargets() {
    // EffectComposer ping-pongs between two targets and the scene lands in a different one
    // on alternate frames, so each target needs its OWN depth texture. The composite pass is
    // then pointed at whichever depth belongs to the frame it is reading.
    this.hdrTarget = this._makeTarget();
    this.hdrTarget2 = this._makeTarget();
    this.depthTexture = this.hdrTarget.depthTexture;
  }

  _buildComposer() {
    const p = this.settings.preset;
    this.composer = new EffectComposer(this.renderer, this.hdrTarget);
    this.composer.renderToScreen = true;
    // Replace the composer's cloned second buffer with one that owns its depth.
    if (this.composer.renderTarget2) this.composer.renderTarget2.dispose();
    this.composer.renderTarget2 = this.hdrTarget2;
    this.composer.readBuffer = this.composer.renderTarget2;
    this.composer.writeBuffer = this.composer.renderTarget1;

    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);

    // Immediately after the scene is drawn, bind the matching depth texture.
    const self = this;
    const bindDepth = new Pass();
    bindDepth.needsSwap = false;
    bindDepth.render = function (renderer, writeBuffer, readBuffer) {
      if (readBuffer && readBuffer.depthTexture) self.compositePass.uniforms.tDepth.value = readBuffer.depthTexture;
    };
    this.composer.addPass(bindDepth);

    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.34, 0.52, 0.92);
    this.bloomPass.enabled = !!p.bloom;
    this.composer.addPass(this.bloomPass);

    this.compositePass = new ShaderPass(COMPOSITE_SHADER);
    this.compositePass.material.depthTest = false;
    this.compositePass.material.depthWrite = false;
    this.compositePass.uniforms.tDepth.value = this.depthTexture;
    this.composer.addPass(this.compositePass);
    // bindDepth was inserted before the composite existed; give it the reference now.

    this.smaaPass = new SMAAPass();
    this.smaaPass.enabled = true;
    this.composer.addPass(this.smaaPass);

    this.grade = this.compositePass.uniforms;
    this.applyQuality();
  }

  /** Re-read the quality preset and reconfigure passes. */
  applyQuality() {
    const p = this.settings.preset;
    this.bloomPass.enabled = !!p.bloom;
    this.bloomPass.strength = p.bloom ? 0.34 : 0;
    this.renderer.shadowMap.enabled = !!p.shadows;
    this.grade.uGrain.value = this.settings.get('filmGrain');
    this.grade.uChroma.value = this.settings.get('chromaticAberration');
    this.grade.uVignette.value = this.settings.get('vignette');
    this.grade.uDofStrength.value = p.dof ? 0.9 : 0.0;
    this.grade.uAOStrength.value = p.ssao ? 0.55 : 0.0;
    this.camera.far = Math.max(2400, p.drawDistance * 2.6);
    this.camera.updateProjectionMatrix();
    this.resize();
  }

  setMotionBlur(scale) { this.grade.uMotionScale.value = this.settings.preset.motionBlur ? scale : 0; }

  resize() {
    const p = this.settings.preset;
    const w = Math.max(320, window.innerWidth || 1280);
    const h = Math.max(240, window.innerHeight || 720);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const ratio = clamp(p.pixelRatio * this._resolutionScale * dpr, 0.35, 2);
    this.width = w; this.height = h;
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(w, h, false);
    this.composer.setPixelRatio(ratio);
    this.composer.setSize(w, h);
    const tw = Math.ceil(w * ratio), th = Math.ceil(h * ratio);
    this.hdrTarget.setSize(tw, th);
    this.hdrTarget2.setSize(tw, th);
    this.camera.aspect = w / h;
    this.camera.fov = this.settings.get('fov');
    this.camera.updateProjectionMatrix();
    this.grade.uResolution.value.set(w * ratio, h * ratio);
    // The AO disc is a fixed size in metres; convert it to vertical UV per unit
    // of view depth, which is what the shader divides by.
    this.grade.uAORadius.value = AO_WORLD_RADIUS * this.camera.projectionMatrix.elements[5] * 0.5;
    if (this.bloomPass) this.bloomPass.setSize(w * ratio, h * ratio);
  }

  /** Current render-resolution multiplier, 0.55 to 1. */
  get resolutionScale() { return this._resolutionScale; }

  /** Adaptive resolution: keep the frame time near the target. */
  _autoScale(dt, frameMs) {
    if (!this.settings.get('autoQuality')) return;
    this._autoTimer += dt;
    if (this._autoTimer < 1.2) return;
    this._autoTimer = 0;
    const target = 1000 / (this.settings.get('targetFps') || 60);
    const avg = this.frameMs.avg;
    if (avg > target * 1.35 && this._resolutionScale > 0.55) {
      this._resolutionScale = Math.max(0.55, this._resolutionScale - 0.08);
      this.resize();
    } else if (avg < target * 0.72 && this._resolutionScale < 1) {
      this._resolutionScale = Math.min(1, this._resolutionScale + 0.05);
      this.resize();
    }
  }

  /** Per-frame grading hook used by the weather/time-of-day systems. */
  setGrade({ exposure, contrast, saturation, lift, gain, gamma, fogColor, haze, wetLens }) {
    const g = this.grade;
    if (exposure !== undefined) g.uExposure.value = exposure;
    if (contrast !== undefined) g.uContrast.value = contrast;
    if (saturation !== undefined) g.uSaturation.value = saturation;
    if (lift) g.uLift.value.set(lift[0], lift[1], lift[2]);
    if (gain) g.uGain.value.set(gain[0], gain[1], gain[2]);
    if (gamma) g.uGamma.value.set(gamma[0], gamma[1], gamma[2]);
    if (fogColor !== undefined) g.uFogColor.value.set(fogColor);
    if (haze !== undefined) g.uHazeStrength.value = haze;
    if (wetLens !== undefined) g.uWetLens.value = wetLens;
  }

  render(dt, elapsed) {
    const t0 = performance.now();
    this.frame++;

    const g = this.grade;
    g.uTime.value = elapsed;
    g.uCameraNearFar.value.set(this.camera.near, this.camera.far);

    // Reprojection matrices for motion blur.
    this.camera.updateMatrixWorld();
    this._tmpMat.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
    this._invViewProj.copy(this._tmpMat).invert();
    g.uInvViewProj.value.copy(this._invViewProj);
    // uPrevViewProj holds last frame's matrix (set at the end of the previous render).

    this.renderer.info.reset();
    this.composer.render(dt);

    g.uPrevViewProj.value.copy(this._tmpMat);

    const ms = performance.now() - t0;
    this.frameMs.push(ms);
    this._fpsAccum += dt; this._fpsFrames++;
    if (this._fpsAccum >= 0.5) { this.fps = this._fpsFrames / this._fpsAccum; this._fpsAccum = 0; this._fpsFrames = 0; }
    this._autoScale(dt, ms);
  }

  stats() {
    const i = this.renderer.info;
    return {
      fps: Math.round(this.fps),
      ms: +this.frameMs.avg.toFixed(2),
      calls: i.render.calls,
      tris: i.render.triangles,
      geometries: i.memory.geometries,
      textures: i.memory.textures,
      programs: i.programs ? i.programs.length : 0,
      resScale: +this._resolutionScale.toFixed(2),
    };
  }

  dispose() {
    window.removeEventListener('resize', this._onResize);
    this.canvas.removeEventListener('webglcontextlost', this._onLost);
    this.composer.dispose?.();
    this.hdrTarget.dispose();
    this.hdrTarget2.dispose();
    this.renderer.dispose();
  }
}
