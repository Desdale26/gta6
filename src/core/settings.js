// settings.js — quality presets + persisted user options.
const KEY = 'vicecoast.settings.v1';

// Quality presets.
//
// These were built as a showcase and shipped as a default, and the result was a
// game that stuttered on the machine it was written for. Every one of them has
// come down. The things that changed, and why:
//
// - `cascades` is gone. Nothing implemented cascaded shadow maps; the number was
//   only ever used to pick a shadow extent, so the extent is now stated outright
//   as `shadowExtent` and it is much smaller. The shadow pass redraws every
//   caster inside that box, so the extent is the single biggest multiplier on
//   the draw-call count in the whole renderer.
// - `shadows` is true everywhere. Whether a light casts a shadow is part of
//   every material's shader cache key in three.js, so turning shadows off
//   recompiled the entire city — and it was the adaptive system, on the slowest
//   machines, that did the turning off. Shadow cost is now controlled by
//   `shadowMapSize` and `shadowExtent`, neither of which is in the key.
// - `smaa` is new and off below `high`. The composer runs at the reduced render
//   resolution and the canvas is stretched back up, so morphological
//   antialiasing below about 0.95 scale is undone by the bilinear upscale that
//   follows it. Three passes and two full-resolution half-float targets, for
//   nothing.
// - `dprCap` is new. A 4K frame on a high-density laptop display is eight
//   megapixels through a seventeen-pass post chain, which is where most of "very
//   laggy" came from.
// - `post` is new, and it is the largest single lever here. The two bottom
//   presets no longer build or run the post chain at all: the scene is drawn
//   once, straight to the canvas, with ACES tone mapping done on the way out.
//   That is seventeen full-screen passes and an HDR ping-pong replaced by one
//   draw. It is also exactly how the reference build the player asked this to
//   be like works, and that one looks good — the look comes from the tone
//   mapping, the prefiltered environment map and emissive neon, none of which
//   needs a composer.
// - Medium renders at full resolution now, where it used to render at 0.85 and
//   stretch the result back up to the window. That softness was the single most
//   visible difference between this game and the reference build it was measured
//   against, and it is bought outright by everything else on this list: the
//   bottom presets dropped their whole post chain, the sky stopped drawing
//   underneath the city, the environment probe stopped rebuilding fifteen times
//   a minute, and three dead per-pixel effects came out of the composite. If a
//   particular machine still cannot hold it, the governor drops the rung — which
//   is a thing it can now actually do.
// - `bloomMips`, `aoTaps` and `blurTaps` are new: the passes that DO run are now
//   sized per preset instead of every preset paying ultra's tap counts. Bloom
//   was five mip levels (ten blur draws) at every preset that had it on; the
//   composite's ambient-occlusion loop was ten taps and its motion blur seven,
//   compiled in and paid by every pixel whose wave straddled the horizon.
// - The population and draw-distance budgets are roughly halved throughout. 900 m
//   of draw distance in a city this dense was 2.5 million triangles and 5800 draw
//   calls a frame, and draw calls are paid by the CPU, so no amount of dropping
//   the resolution could rescue it.
export const QUALITY_PRESETS = {
  // Minimal is not "potato but worse" — it is a different way of drawing the same
  // city, and it is the only preset that can hold 120 fps on ordinary hardware.
  //
  // Measured on the shipped build at potato, which was already the cheapest thing
  // here: 353 draw calls, 547k triangles, 111 textures, and 594 materials of which
  // every single one ran a full per-fragment PBR lighting loop over fourteen lights
  // plus an image-based lighting sample. CPU update was 2.8 ms. So the frame was
  // never CPU-bound — it was bound on shading, a shadow pass and an environment
  // probe, and no amount of dropping pedestrians or draw distance was going to fix
  // that. Minimal attacks the shading instead: Lambert in place of Standard and
  // Physical, no normal or roughness maps, no environment probe, no shadow pass,
  // and a smaller light pool.
  //
  // Because it costs so much less per pixel it can afford a nearly full-resolution
  // frame, which is why pixelRatio is 0.9 here against potato's 0.55: a sharp flat
  // image reads far better than a blurry lit one.
  minimal: {
    label: 'Minimal (120 fps)', pixelRatio: 0.9, post: false, shadows: false, shadowMapSize: 0, shadowExtent: 0,
    ssao: false, bloom: false, motionBlur: false, dof: false, reflections: false, smaa: false,
    drawDistance: 300, pedBudget: 14, trafficBudget: 14, particleBudget: 120,
    grassDensity: 0, anisotropy: 1, waterQuality: 0, decalBudget: 32, volumetrics: false,
    dprCap: 1,
  },
  potato: {
    label: 'Potato', pixelRatio: 0.55, post: false, shadows: true, shadowMapSize: 512, shadowExtent: 55,
    ssao: false, bloom: false, motionBlur: false, dof: false, reflections: false, smaa: false,
    drawDistance: 320, pedBudget: 18, trafficBudget: 16, particleBudget: 180,
    grassDensity: 0, anisotropy: 1, waterQuality: 0, decalBudget: 48, volumetrics: false,
    dprCap: 1,
  },
  low: {
    label: 'Low', pixelRatio: 0.7, post: false, shadows: true, shadowMapSize: 1024, shadowExtent: 70,
    ssao: false, bloom: false, motionBlur: false, dof: false, reflections: false, smaa: false,
    drawDistance: 420, pedBudget: 28, trafficBudget: 24, particleBudget: 320,
    grassDensity: 0.2, anisotropy: 2, waterQuality: 1, decalBudget: 96, volumetrics: false,
    dprCap: 1,
  },
  medium: {
    label: 'Medium', pixelRatio: 1.0, post: true, bloomMips: 3, aoTaps: 0, blurTaps: 3,
    shadows: true, shadowMapSize: 1024, shadowExtent: 90,
    ssao: false, bloom: true, motionBlur: true, dof: false, reflections: true, smaa: false,
    drawDistance: 540, pedBudget: 42, trafficBudget: 34, particleBudget: 650,
    grassDensity: 0.45, anisotropy: 4, waterQuality: 2, decalBudget: 160, volumetrics: true,
    dprCap: 1,
  },
  high: {
    label: 'High', pixelRatio: 1.0, post: true, bloomMips: 3, aoTaps: 6, blurTaps: 3,
    shadows: true, shadowMapSize: 2048, shadowExtent: 120,
    ssao: true, bloom: true, motionBlur: true, dof: false, reflections: true, smaa: true,
    drawDistance: 720, pedBudget: 75, trafficBudget: 55, particleBudget: 1100,
    grassDensity: 0.75, anisotropy: 8, waterQuality: 3, decalBudget: 240, volumetrics: true,
    dprCap: 1,
  },
  ultra: {
    label: 'Ultra', pixelRatio: 1.15, post: true, bloomMips: 4, aoTaps: 10, blurTaps: 7,
    shadows: true, shadowMapSize: 2048, shadowExtent: 160,
    ssao: true, bloom: true, motionBlur: true, dof: true, reflections: true, smaa: true,
    drawDistance: 1000, pedBudget: 120, trafficBudget: 85, particleBudget: 2000,
    grassDensity: 1.0, anisotropy: 16, waterQuality: 3, decalBudget: 380, volumetrics: true,
    // Ultra is the preset that means "I have the machine for this", and the
    // global 1080p budget was quietly cancelling the higher display density it
    // asks for. It gets its own ceiling.
    dprCap: 1.25, pixelBudget: 2560 * 1440,
  },
};

const DEFAULTS = {
  // 'high' out of the box asked an ordinary laptop for a 4K frame, seventeen
  // full-screen post passes, a 190 m shadow box and 900 m of draw distance. It
  // ran at single-figure frame rates and the adaptive system then spent the next
  // half minute clawing its way down, stalling on every step. Start where a
  // laptop can actually live and let a fast machine earn its way up.
  quality: 'minimal',
  autoQuality: true,
  // Render scale multiplies the preset's resolution; pixelBudget is the ceiling
  // on the frame the GPU is actually asked to draw. One 4K frame by default.
  renderScale: 1.0,
  // One 1080p frame, not one 4K frame. The old budget meant a 2x-density display
  // rendered eight megapixels through the whole post chain by default.
  pixelBudget: 1920 * 1080,
  masterVolume: 0.8,
  sfxVolume: 1.0,
  musicVolume: 0.55,
  engineVolume: 0.9,
  mouseSensitivity: 1.0,
  invertY: false,
  fov: 74,
  cameraShake: 1.0,
  filmGrain: 0.35,
  chromaticAberration: 0.3,
  vignette: 0.5,
  showFps: false,
  minimapSize: 1.0,
  bloodFx: true,
  targetFps: 120,
  autoSave: true,
  seed: 'leonida-2026',
  invertSteerInReverse: true,
  drivingAssist: 0.35,
  subtitles: true,
};

export class Settings {
  constructor() {
    this.data = { ...DEFAULTS };
    this.load();
    this._listeners = [];
    // Latched here and never written again. Everything that bakes a decision into
    // a GPU resource — material type, light pool size, whether the environment
    // probe exists at all — reads this once while it is being built.
    this.shadingMode = this.data.quality === 'minimal' ? 'minimal' : 'full';
  }

  /** True when this session is drawing the cheap way. Constant for the session. */
  get minimal() { return this.shadingMode === 'minimal'; }
  get preset() { return QUALITY_PRESETS[this.data.quality] || QUALITY_PRESETS.high; }
  get(k) { return this.data[k]; }
  set(k, v) {
    if (this.data[k] === v) return;
    this.data[k] = v;
    this.save();
    for (const fn of this._listeners) fn(k, v);
  }
  onChange(fn) { this._listeners.push(fn); return () => { const i = this._listeners.indexOf(fn); if (i >= 0) this._listeners.splice(i, 1); }; }
  reset() { this.data = { ...DEFAULTS }; this.save(); for (const fn of this._listeners) fn('*', null); }
  load() {
    // `wasLoaded` is how boot tells a returning player from a new one. A stored
    // preference is a choice and must survive; the device probe only gets to
    // pick the opening preset for somebody who has never played before.
    this.wasLoaded = false;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { Object.assign(this.data, JSON.parse(raw)); this.wasLoaded = true; }
    } catch (e) { /* storage may be blocked — defaults are fine */ }
  }
  save() {
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* ignore */ }
  }
  /** Downgrade quality one notch; returns true if it changed. */
  /**
   * Which presets this session is allowed to move between.
   *
   * Shading is decided once, at boot, and cannot change afterwards: a material's
   * type is fixed when it is constructed, and rebuilding every material mid-play
   * to switch between Lambert and Standard would be a far worse stall than
   * anything the governor is trying to avoid. So a session that booted minimal
   * stays inside the cheap presets, and one that did not never drops into minimal
   * and finds itself with PBR materials on a preset that assumes it has none.
   */
  get ladder() {
    return this.shadingMode === 'minimal'
      ? ['minimal', 'potato', 'low']
      : ['potato', 'low', 'medium', 'high', 'ultra'];
  }

  stepDown() {
    const order = this.ladder.slice().reverse();
    const i = order.indexOf(this.data.quality);
    if (i < 0 || i === order.length - 1) return false;
    this.set('quality', order[i + 1]);
    return true;
  }
  stepUp() {
    const order = this.ladder;
    const i = order.indexOf(this.data.quality);
    if (i < 0 || i === order.length - 1) return false;
    this.set('quality', order[i + 1]);
    return true;
  }
}
