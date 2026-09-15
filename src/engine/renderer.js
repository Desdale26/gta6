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

// One tone curve, used by both renderers.
//
// The composite pass tone-maps with Narkowicz's ACES fit; three.js's own
// ACESFilmicToneMapping is the full RRT/ODT fit and divides exposure by 0.6
// before it starts. So the same city at the same hour came out most of a stop
// brighter on the composer-free path than on the post path — and the governor
// switches between those two paths while the player is standing still. Teaching
// three's CustomToneMapping slot the composite's curve makes the switch
// invisible, which is the only acceptable outcome for a change the player did
// not ask for.
THREE.ShaderChunk.tonemapping_pars_fragment = THREE.ShaderChunk.tonemapping_pars_fragment.replace(
  'vec3 CustomToneMapping( vec3 color ) { return color; }',
  [
    'vec3 CustomToneMapping( vec3 color ) {',
    '  color *= toneMappingExposure;',
    '  const float na = 2.51, nb = 0.03, nc = 2.43, nd = 0.59, ne = 0.14;',
    '  color = clamp((color * (na * color + nb)) / (color * (nc * color + nd) + ne), 0.0, 1.0);',
    '  return clamp((color - 0.5) * 1.06 + 0.5, 0.0, 1.0);',
    '}',
  ].join('\n'),
);

// Radius of the ambient-occlusion sample disc, in metres of world space.
const AO_WORLD_RADIUS = 0.9;

// The only resolutions the governor is allowed to pick. Every change reallocates
// every render target in the chain, so the set is small on purpose.
/**
 * How far the camera can see, from the preset that claims to set it.
 *
 * This was `Math.max(2400, drawDistance * 2.6)`, which meant the far plane never
 * went below 2400 m however low the preset's draw distance was — so a preset
 * asking for 320 m and a preset asking for 900 m drew exactly the same city, and
 * the setting did nothing on four presets out of five. Measured on a busy street
 * at medium: geometry beyond 220 m accounted for 999 of 2884 draw calls, and
 * draw calls are paid by the CPU, so no amount of dropping the resolution could
 * reach them. The sky mesh sets frustumCulled = false, so nothing needs the far
 * plane to be huge.
 */
function farPlaneFor(preset) { return Math.max(420, (preset.drawDistance || 540) * 1.25); }

const RESOLUTION_RUNGS = [1, 0.85, 0.7, 0.55];

const COMPOSITE_SHADER = {
  name: 'ViceComposite',
  uniforms: {
    tDiffuse: { value: null },
    tDepth: { value: null },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uExposure: { value: 1.0 },
    uContrast: { value: 1.04 },
    uSaturation: { value: 1.08 },
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
    uniform float uMotionScale;
    uniform mat4 uPrevViewProj, uInvViewProj;
    uniform vec2 uCameraNearFar;
    uniform float uDofFocus, uDofRange, uDofStrength;
    uniform vec3 uFogColor;
    uniform float uHazeStrength, uWetLens, uFlash;
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

      // Three effects used to live here and in the tail below — a drunk warp, a
      // damage tint and a scanline — and nothing in the game has ever written
      // any of their uniforms. The damage tint was not even branched, so every
      // pixel of every frame mixed towards red by exactly zero and then paid a
      // smoothstep for the privilege.

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
        // Four taps, not seven. There are no shader permutations here — every
        // preset compiles the same program, so the tap counts set register
        // pressure and therefore occupancy for everyone, including the machine
        // running at the bottom preset that never switches this effect on.
        const int STEPS = 4;
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
        vec2 texel = 1.0 / uResolution;
        // Fit a plane to the surface under this pixel. Without it a road seen at
        // a grazing angle occludes itself, because its neighbours are genuinely
        // metres further away — the darkening looked like dirt on the asphalt.
        float slopeX = linearDepth(texture2D(tDepth, uv + vec2(texel.x, 0.0)).x) - lin;
        float slopeY = linearDepth(texture2D(tDepth, uv + vec2(0.0, texel.y)).x) - lin;
        float lim = 0.02 * lin;                     // ignore slopes across an edge
        slopeX = clamp(slopeX, -lim, lim);
        slopeY = clamp(slopeY, -lim, lim);
        float occ = 0.0;
        const int AO_TAPS = 6;
        for (int i = 0; i < AO_TAPS; i++){
          float fi = float(i);
          float a = fi * 2.3999632;                 // golden angle spiral
          float rr = sqrt((fi + 0.5) / float(AO_TAPS));
          vec2 o = vec2(cos(a), sin(a)) * rr;
          o = vec2(o.x * ca - o.y * sa, o.x * sa + o.y * ca) * rad;
          o.x *= uResolution.y / uResolution.x;     // keep the disc round
          float sd = linearDepth(texture2D(tDepth, uv + o).x);
          // Depth this tap would have if the surface simply carried on flat.
          float flat_ = lin + slopeX * (o.x / texel.x) + slopeY * (o.y / texel.y);
          float diff = flat_ - sd;                  // >0: the sample stands proud
          occ += smoothstep(0.05, 0.55, diff) * (1.0 - smoothstep(1.6, 3.2, diff));
        }
        occ /= float(AO_TAPS);
        // Fade out with distance so the far city is not speckled.
        float fade = 1.0 - smoothstep(120.0, 220.0, lin);
        col *= 1.0 - clamp(occ, 0.0, 1.0) * uAOStrength * fade;
      }

      // ---- chromatic aberration (lens, strongest at the edges) ----
      // Added as a DIFFERENCE, never as a replacement. Assigning the offset
      // samples straight into col.r and col.b overwrote two of the three
      // channels with the raw scene, so the motion blur, the depth of field and
      // the ambient occlusion computed above all survived in the green channel
      // alone -- every one of them rendered as a green ghost of itself.
      if (uChroma > 0.001){
        float amt = uChroma * 0.0028 * (0.25 + r2 * 3.0);
        vec2 dir = normalize(center + 1e-5);
        vec3 flatCol = texture2D(tDiffuse, uv).rgb;
        col.r += texture2D(tDiffuse, uv + dir * amt).r - flatCol.r;
        col.b += texture2D(tDiffuse, uv - dir * amt).b - flatCol.b;
      }

      // ---- aerial perspective haze ----
      if (uHazeStrength > 0.001 && depth < 1.0){
        float h = 1.0 - exp(-lin * uHazeStrength * 0.0011);
        col = mix(col, uFogColor, clamp(h, 0.0, 0.72));
      }

      // ---- exposure + tonemap ----
      col *= uExposure;
      col = aces(col);

      // ---- grade: contrast, saturation ----
      // Lift, gain and gamma used to sit here as three more vec3 uniforms and a
      // pow(). Nothing in the game ever wrote any of them, so every pixel of
      // every frame computed zero plus col times one, then raised the result to the
      // power of one — three transcendentals a pixel to arrive back where it
      // started. Contrast and saturation below are driven by the weather and do
      // real work, so they stay.
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
          // The droplet reads the scene buffer, which is still linear HDR, while
          // col has already been exposed, tonemapped and graded. Mixing the two
          // spaces put a raw over-bright smear on the lens instead of a bead of
          // water; running the sample through the same exposure and tonemap puts
          // it back in the picture's own range.
          vec3 dropCol = aces(texture2D(tDiffuse, uv + f * 0.02).rgb * uExposure);
          col = mix(col, dropCol * 1.15, drop * uWetLens * 0.7);
        }
        col += uWetLens * 0.015 * hash(uv * 700.0 + uTime);
      }

      // ---- flash ----
      col = mix(col, vec3(1.0), uFlash);

      // ---- vignette ----
      col *= 1.0 - uVignette * smoothstep(0.16, 0.78, r2);

      // ---- film grain (animated, luminance-weighted so shadows stay clean) ----
      if (uGrain > 0.001){
        float n = hash(uv * uResolution + fract(uTime) * 1234.5) - 0.5;
        col += n * uGrain * 0.055 * (0.35 + 0.65 * (1.0 - luma));
      }

      gl_FragColor = vec4(toSRGB(clamp(col, 0.0, 1.0)), 1.0);
    }
  `,
};

// Settings the renderer has to re-read when they change. '*' (a reset) counts too.
const RENDER_SETTINGS = new Set([
  'fov', 'renderScale', 'pixelBudget', 'quality', 'filmGrain',
  'chromaticAberration', 'vignette', 'targetFps',
]);

export class Renderer {
  constructor(canvas, settings) {
    this.canvas = canvas;
    this.settings = settings;
    this.frame = 0;
    /** Called with (width, height) whenever the drawing surface changes size. */
    this.onResized = null;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      // The composer-free presets draw the scene straight into this buffer and
      // have no antialiasing of any kind without this. The flag can only be set
      // when the context is created, so it cannot be a preset — and on the post
      // path the only thing ever drawn here is a full-screen quad with no
      // interior edges, so it costs the resolve and nothing else.
      antialias: true,
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
    this.camera = new THREE.PerspectiveCamera(settings.get('fov'), 1, 0.22, farPlaneFor(preset));
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

    // Post-processing settings used to be written into the store and left there.
    // The renderer only re-reads them in applyQuality(), and the pause menu only
    // called that for the two settings it happened to render as a cycle — so
    // film grain, chromatic aberration, vignette and render scale moved their
    // sliders, showed their new numbers, and changed nothing on screen at all.
    // (Field of view was fine: the camera controller reads that one every frame
    // because it also has to widen it with speed.) Listening here means the
    // renderer picks up a change whoever makes it — the menu, a loaded profile,
    // or anything added later.
    this._offSettings = settings.onChange((k) => {
      if (k === '*' || RENDER_SETTINGS.has(k)) this.applyQuality();
    });
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

    this._renderPass = this.renderPass;
    this._bindDepth = bindDepth;

    this.compositePass = new ShaderPass(COMPOSITE_SHADER);
    this.compositePass.material.depthTest = false;
    this.compositePass.material.depthWrite = false;
    this.compositePass.uniforms.tDepth.value = this.depthTexture;
    this.composer.addPass(this.compositePass);

    this.bloomPass = null;
    this.smaaPass = null;
    this.grade = this.compositePass.uniforms;
    this.applyQuality();
  }

  /**
   * The pass list is rebuilt per preset rather than having passes sit in it
   * switched off.
   *
   * EffectComposer walks every pass it holds on every resize with no regard for
   * `enabled` — so a preset with bloom off still churned eleven render targets
   * on every adaptive-resolution step, and a pass that ran once and was then
   * switched off held its VRAM for the rest of the session. `composer.passes` is
   * a plain array, so the honest fix is to put in it only what is going to run.
   */
  _syncPasses() {
    const p = this.settings.preset;
    if (this._direct) { this.composer.passes = [this._renderPass, this._bindDepth, this.compositePass]; return; }
    const wantBloom = !!p.bloom;
    const wantSmaa = !!p.smaa && (this.renderScaleUsed ?? 1) >= 0.95;
    if (wantBloom && !this.bloomPass) {
      this.bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.34, 0.52, 0.92);
    } else if (!wantBloom && this.bloomPass) {
      this.bloomPass.dispose?.();
      this.bloomPass = null;
    }
    if (wantSmaa && !this.smaaPass) this.smaaPass = new SMAAPass();
    else if (!wantSmaa && this.smaaPass) { this.smaaPass.dispose?.(); this.smaaPass = null; }

    const list = [this._renderPass, this._bindDepth];
    if (this.bloomPass) list.push(this.bloomPass);
    list.push(this.compositePass);
    if (this.smaaPass) list.push(this.smaaPass);
    this.composer.passes = list;
  }

  /** Re-read the quality preset and reconfigure passes. */
  applyQuality() {
    const p = this.settings.preset;
    // Which of the two renderers we are. `post: false` presets never touch the
    // composer, so none of its targets are bound, resized or cleared.
    const direct = p.post === false;
    if (direct !== this._direct) {
      this._direct = direct;
      // ACES has to happen somewhere. In direct mode the renderer does it on the
      // way out; with the chain running, the composite does it and the renderer
      // must not do it twice.
      this.renderer.toneMapping = direct ? THREE.CustomToneMapping : THREE.NoToneMapping;
      this.renderer.toneMappingExposure = direct ? (this.exposure ?? this.grade.uExposure.value ?? 1) : 1.0;
      // No rebuild here. Tone mapping is part of three.js's program cache key, so
      // crossing this line needs a second program variant for every material —
      // and the governor crosses it, on the machine least able to afford a stall,
      // at the exact moment it has decided that machine is struggling. Both
      // variants are compiled during the loading screen instead (see main.js), so
      // by the time this flips, the programs the flip needs are already warm and
      // three.js swaps to them without touching the compiler.
    }
    this._syncPasses();
    this.renderer.shadowMap.enabled = !!p.shadows;
    this.grade.uGrain.value = this.settings.get('filmGrain');
    this.grade.uChroma.value = this.settings.get('chromaticAberration');
    this.grade.uVignette.value = this.settings.get('vignette');
    this.grade.uDofStrength.value = p.dof ? 0.9 : 0.0;
    this.grade.uAOStrength.value = p.ssao ? 0.55 : 0.0;
    this.camera.far = farPlaneFor(p);
    this.camera.updateProjectionMatrix();
    this.resize();
  }

  setMotionBlur(scale) { this.grade.uMotionScale.value = this.settings.preset.motionBlur ? scale : 0; }

  /**
   * The look of the world: exposure, contrast, saturation, the colour of the
   * air, and how much water is on the lens. Driven every frame by the weather,
   * which reads the sky's palette for the hour.
   *
   * This method did not exist. Weather has called it every frame since the
   * engine was written, so every frame threw a TypeError at that line — and
   * because the call sits in the middle of Game.update, everything after it
   * never ran: the street lights never came on at night, the ambience never
   * played, the audio listener never followed the camera, the HUD never
   * updated, and input.endFrame() never cleared the frame's key edges. The
   * error was caught by the loop's own try/catch and logged, so nothing ever
   * stopped, which is exactly why it survived this long: the game kept running,
   * slightly wrong, in a dozen places at once.
   */
  setGrade(g) {
    if (!g) return;
    const u = this.grade;
    if (g.exposure !== undefined) this.exposure = u.uExposure.value = g.exposure;
    if (g.contrast !== undefined) u.uContrast.value = g.contrast;
    if (g.saturation !== undefined) u.uSaturation.value = g.saturation;
    if (g.haze !== undefined) u.uHazeStrength.value = g.haze;
    if (g.wetLens !== undefined) u.uWetLens.value = g.wetLens;
    if (g.fogColor) {
      if (g.fogColor.isColor) u.uFogColor.value.copy(g.fogColor);
      else u.uFogColor.value.set(g.fogColor);
    }
    // With no composite pass to apply it, the exposure has to be handed to the
    // renderer's own tone mapping instead — otherwise the cheap path renders the
    // same city two stops darker than the expensive one.
    if (this._direct && g.exposure !== undefined) this.renderer.toneMappingExposure = g.exposure;
  }

  resize() {
    const p = this.settings.preset;
    // In direct mode nothing downstream of the scene exists, so none of it is
    // resized. EffectComposer.setSize ignores a pass's `enabled` flag, which
    // means a disabled bloom still reallocated its eleven half-float render
    // targets on every resize — tens of megabytes of VRAM, churned, for a pass
    // that was never going to run.
    if (this._direct) {
      const dprD = Math.min(window.devicePixelRatio || 1, p.dprCap ?? 1);
      const wD = Math.max(320, window.innerWidth || 1280);
      const hD = Math.max(240, window.innerHeight || 720);
      const userD = clamp(this.settings.get('renderScale') ?? 1, 0.5, 2);
      const budgetD = p.pixelBudget || this.settings.get('pixelBudget') || (1920 * 1080);
      let baseD = p.pixelRatio * userD * dprD;
      if (wD * hD * baseD * baseD > budgetD) baseD = Math.sqrt(budgetD / Math.max(1, wD * hD));
      let rD = baseD * this._resolutionScale;
      if (wD * hD * rD * rD < 240_000) rD = Math.sqrt(240_000 / Math.max(1, wD * hD));
      rD = Math.min(rD, baseD);
      this.renderScaleUsed = rD;
      this.width = wD; this.height = hD;
      this.renderer.setPixelRatio(rD);
      this.renderer.setSize(wD, hD, false);
      this.camera.aspect = wD / hD;
      this.camera.fov = this.settings.get('fov');
      this.camera.far = farPlaneFor(p);
      this.camera.updateProjectionMatrix();
      if (this.onResized) this.onResized(wD, hD);
      return;
    }
    const w = Math.max(320, window.innerWidth || 1280);
    const h = Math.max(240, window.innerHeight || 720);
    // Resolution is budgeted in pixels rather than clamped as a ratio. A ratio
    // cap of 2 quietly denied a full 4K frame on a high-density display, and a
    // pixel budget is the honest limit anyway — it is what the GPU actually
    // pays. The default budget is one 4K frame; the render scale lets you sit
    // below it on a slower machine or push past it for a downsampled image.
    // Capped by the preset, not taken at face value. A 2x-density laptop panel
    // asked for four times the pixels of the same window on a 1x panel, through
    // the whole post chain, and nothing in the picture was four times better.
    const dpr = Math.min(window.devicePixelRatio || 1, p.dprCap ?? 1);
    const userScale = clamp(this.settings.get('renderScale') ?? 1, 0.5, 2);
    // Budget first, THEN the governor's rung — in that order, and it matters.
    // The other way round, the clamp simply overwrote the rung: on any window
    // big enough to exceed the pixel budget, dropping from rung 1.0 to 0.85 to
    // 0.7 produced three byte-identical frames, because all three landed above
    // the budget and were flattened to the same number. The governor's fastest
    // lever did nothing at all, while still reallocating every render target in
    // the chain each time it pulled it.
    const budget = p.pixelBudget || this.settings.get('pixelBudget') || (1920 * 1080);
    let base = p.pixelRatio * userScale * dpr;
    if (w * h * base * base > budget) base = Math.sqrt(budget / Math.max(1, w * h));
    // The floor is on pixels, not on the ratio: a fixed ratio floor collapses the
    // bottom rungs into each other on a large display for the same reason.
    const MIN_PIXELS = 240_000;
    let ratio = base * this._resolutionScale;
    if (w * h * ratio * ratio < MIN_PIXELS) ratio = Math.sqrt(MIN_PIXELS / Math.max(1, w * h));
    ratio = Math.min(ratio, base);
    this.renderScaleUsed = ratio;
    this.width = w; this.height = h;
    // The pass list is settled BEFORE the composer is sized, not after: a pass
    // constructed here for the first time is only given its render targets by
    // the setSize sweep below, and one that never gets sized renders into
    // nothing at all.
    this._syncPasses();
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
    // Morphological antialiasing reconstructs edges at the resolution it runs at,
    // and the composer runs at `ratio` while the canvas is stretched back up to
    // the window. Below about 0.95 the upscale undoes everything SMAA just did,
    // so it is three passes and two full-size half-float targets spent on a
    // result the next blit throws away.

    // Particle points are sized in pixels, from the height of the frame they are
    // drawn into. That was set once during boot and never again, so every spark,
    // splash and puff of smoke stayed the size it was when the window first
    // opened however the window was resized afterwards.
    if (this.onResized) this.onResized(w, h);
  }

  /** Current render-resolution multiplier, 0.55 to 1. */
  get resolutionScale() { return this._resolutionScale; }

  /**
   * One rung down, one rung up. The decision belongs to Game's governor — there
   * used to be a second control loop in here, walking the scale on its own timer
   * against its own signal, and two controllers reading different numbers while
   * pulling the same lever is how a frame rate ends up oscillating.
   *
   * Four rungs and nothing between them, because every change reallocates the
   * HDR targets, the depth texture, the composer's buffers, eleven bloom targets
   * and two SMAA targets. The loop this replaces stepped by 0.08 every 1.2
   * seconds, which on the only machine that ever ran it meant a GPU
   * reallocation every 1.2 seconds, forever: the thing meant to cure the stutter
   * was a metronome for it.
   */
  stepResolutionDown() {
    const at = RESOLUTION_RUNGS.indexOf(this._resolutionScale);
    const i = at < 0 ? 0 : at;
    if (i >= RESOLUTION_RUNGS.length - 1) return false;
    this._resolutionScale = RESOLUTION_RUNGS[i + 1];
    this.resize();
    return true;
  }

  stepResolutionUp() {
    const at = RESOLUTION_RUNGS.indexOf(this._resolutionScale);
    const i = at < 0 ? 0 : at;
    if (i <= 0) return false;
    this._resolutionScale = RESOLUTION_RUNGS[i - 1];
    this.resize();
    return true;
  }

  render(dt, elapsed) {
    const t0 = performance.now();
    this.frame++;

    // Direct mode: no composer at all. One draw of the scene, straight to the
    // canvas, with the tone mapping done by the material instead of by a
    // full-screen pass.
    //
    // The chain this replaces is seventeen full-screen passes a frame — a bloom
    // high-pass, ten bloom blurs, a mip composite, an additive blend, the big
    // composite with up to twenty-nine texture fetches per pixel, and three SMAA
    // passes — plus the bandwidth of an HDR half-float target with a depth
    // texture, ping-ponged. At the bottom two presets that is the entire frame
    // budget of a slow machine spent on grading a picture it is struggling to
    // draw at all. The reference build the player asked this to be like has no
    // post-processing whatsoever and looks good on ACES tone mapping, a
    // prefiltered environment map and emissive neon, which is exactly what is
    // left standing here.
    if (this._direct) {
      this.renderer.info.reset();
      this.renderer.setRenderTarget(null);
      this.renderer.render(this.scene, this.camera);
      const msD = performance.now() - t0;
      this.frameMs.push(msD);
      this._fpsAccum += dt; this._fpsFrames++;
      if (this._fpsAccum >= 0.5) { this.fps = this._fpsFrames / this._fpsAccum; this._fpsAccum = 0; this._fpsFrames = 0; }
      return;
    }

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
