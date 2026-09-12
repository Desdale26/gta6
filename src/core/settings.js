// settings.js — quality presets + persisted user options.
const KEY = 'vicecoast.settings.v1';

export const QUALITY_PRESETS = {
  potato: {
    label: 'Potato', pixelRatio: 0.6, shadows: false, shadowMapSize: 1024, cascades: 1,
    ssao: false, bloom: false, motionBlur: false, dof: false, reflections: false,
    drawDistance: 320, pedBudget: 24, trafficBudget: 22, particleBudget: 200,
    grassDensity: 0, anisotropy: 1, waterQuality: 0, decalBudget: 48, volumetrics: false,
  },
  low: {
    label: 'Low', pixelRatio: 0.75, shadows: true, shadowMapSize: 1024, cascades: 2,
    ssao: false, bloom: true, motionBlur: false, dof: false, reflections: false,
    drawDistance: 450, pedBudget: 40, trafficBudget: 34, particleBudget: 400,
    grassDensity: 0.25, anisotropy: 2, waterQuality: 1, decalBudget: 96, volumetrics: false,
  },
  medium: {
    label: 'Medium', pixelRatio: 1.0, shadows: true, shadowMapSize: 2048, cascades: 3,
    ssao: true, bloom: true, motionBlur: true, dof: false, reflections: true,
    drawDistance: 650, pedBudget: 70, trafficBudget: 55, particleBudget: 900,
    grassDensity: 0.55, anisotropy: 4, waterQuality: 2, decalBudget: 192, volumetrics: true,
  },
  high: {
    label: 'High', pixelRatio: 1.0, shadows: true, shadowMapSize: 2048, cascades: 4,
    ssao: true, bloom: true, motionBlur: true, dof: true, reflections: true,
    drawDistance: 900, pedBudget: 110, trafficBudget: 80, particleBudget: 1600,
    grassDensity: 0.85, anisotropy: 8, waterQuality: 3, decalBudget: 320, volumetrics: true,
  },
  ultra: {
    label: 'Ultra', pixelRatio: 1.25, shadows: true, shadowMapSize: 4096, cascades: 4,
    ssao: true, bloom: true, motionBlur: true, dof: true, reflections: true,
    drawDistance: 1300, pedBudget: 160, trafficBudget: 110, particleBudget: 2600,
    grassDensity: 1.0, anisotropy: 16, waterQuality: 3, decalBudget: 512, volumetrics: true,
  },
};

const DEFAULTS = {
  quality: 'high',
  autoQuality: true,
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
  targetFps: 60,
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
  }
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
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) Object.assign(this.data, JSON.parse(raw));
    } catch (e) { /* storage may be blocked — defaults are fine */ }
  }
  save() {
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* ignore */ }
  }
  /** Downgrade quality one notch; returns true if it changed. */
  stepDown() {
    const order = ['ultra', 'high', 'medium', 'low', 'potato'];
    const i = order.indexOf(this.data.quality);
    if (i < 0 || i === order.length - 1) return false;
    this.set('quality', order[i + 1]);
    return true;
  }
  stepUp() {
    const order = ['potato', 'low', 'medium', 'high', 'ultra'];
    const i = order.indexOf(this.data.quality);
    if (i < 0 || i === order.length - 1) return false;
    this.set('quality', order[i + 1]);
    return true;
  }
}
