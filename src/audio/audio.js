// audio.js — the Web Audio graph: buses, 3D panning, a pooled voice budget, and the radio.
import * as THREE from 'three';
import { clamp } from '../core/mathx.js';
import { buildSfxBank, SFX_NAMES, LOOPING_SFX, sfxVariants } from './synth.js';
import { MusicPlayer } from './musicgen.js';

const MAX_VOICES = 42;
const _fwd = new THREE.Vector3();
const _up = new THREE.Vector3();

export class AudioSystem {
  constructor(ctx) {
    this.ctx = ctx;
    this.actx = null;
    this.bank = new Map();
    this.ready = false;
    this.enabled = true;
    this.voices = new Set();
    this.loops = new Map();
    this.listener = null;
    this.music = null;
    this._lastPos = new THREE.Vector3();
    this._muted = false;
    this._pendingResume = false;
  }

  async init(onProgress) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { console.warn('[audio] Web Audio unavailable'); return this; }
    try {
      this.actx = new AC({ latencyHint: 'interactive' });
    } catch (e) {
      console.warn('[audio] could not create AudioContext', e);
      return this;
    }
    const a = this.actx;

    this.master = a.createGain();
    this.master.gain.value = this.ctx.settings.get('masterVolume');
    this.master.connect(a.destination);

    this.compressor = a.createDynamicsCompressor();
    this.compressor.threshold.value = -14;
    this.compressor.knee.value = 24;
    this.compressor.ratio.value = 6;
    this.compressor.attack.value = 0.004;
    this.compressor.release.value = 0.22;
    this.compressor.connect(this.master);

    this.sfxBus = a.createGain();
    this.sfxBus.gain.value = this.ctx.settings.get('sfxVolume');
    this.sfxBus.connect(this.compressor);

    this.engineBus = a.createGain();
    this.engineBus.gain.value = this.ctx.settings.get('engineVolume');
    this.engineBus.connect(this.compressor);

    this.musicBus = a.createGain();
    this.musicBus.gain.value = this.ctx.settings.get('musicVolume');
    this.musicBus.connect(this.compressor);

    this.uiBus = a.createGain();
    this.uiBus.gain.value = 0.9;
    this.uiBus.connect(this.master);

    // A short reverb send gives the city some space.
    this.reverbSend = a.createGain();
    this.reverbSend.gain.value = 0.16;
    this.convolver = a.createConvolver();
    this.convolver.buffer = makeImpulse(a, 1.6, 2.4);
    this.reverbSend.connect(this.convolver);
    this.convolver.connect(this.compressor);

    this.listener = a.listener;

    this.bank = await buildSfxBank(a, SFX_NAMES, onProgress);
    this.music = new MusicPlayer(a, this.musicBus);
    this.ready = true;

    this.ctx.settings.onChange((k, v) => {
      if (k === 'masterVolume' && this.master) this.master.gain.value = v;
      if (k === 'sfxVolume' && this.sfxBus) this.sfxBus.gain.value = v;
      if (k === 'musicVolume' && this.musicBus) this.musicBus.gain.value = v;
      if (k === 'engineVolume' && this.engineBus) this.engineBus.gain.value = v;
    });
    return this;
  }

  /** Browsers require a gesture; call this from the first click/keypress. */
  resume() {
    if (!this.actx) return;
    if (this.actx.state === 'suspended') this.actx.resume().catch(() => {});
  }
  suspend() { if (this.actx && this.actx.state === 'running') this.actx.suspend().catch(() => {}); }
  get running() { return !!this.actx && this.actx.state === 'running'; }

  _buffer(name, variant) {
    const list = this.bank.get(name);
    if (!list || !list.length) return null;
    const i = variant === undefined ? Math.floor(Math.random() * list.length) : variant % list.length;
    return list[i];
  }

  /** Non-positional one-shot (UI, notifications). */
  play(name, opts = {}) {
    if (!this.ready || !this.enabled) return null;
    const buf = this._buffer(name, opts.variant);
    if (!buf) return null;
    const a = this.actx;
    const src = a.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = opts.pitch ?? 1;
    const g = a.createGain();
    g.gain.value = opts.volume ?? 1;
    src.connect(g);
    g.connect(opts.ui ? this.uiBus : this.sfxBus);
    src.start(0, opts.offset || 0);
    this._track(src, g, null);
    return { src, gain: g };
  }

  /** Positional one-shot. `position` is a THREE.Vector3 or {x,y,z}. */
  playAt(name, position, opts = {}) {
    if (!this.ready || !this.enabled || !position) return null;
    // Distance cull before allocating anything.
    const cam = this.ctx.camera.position;
    const dx = position.x - cam.x, dy = position.y - cam.y, dz = position.z - cam.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const maxD = opts.maxDistance ?? 190;
    if (dist > maxD) return null;
    if (this.voices.size >= MAX_VOICES) {
      // Only let a close sound steal a voice.
      if (dist > 42) return null;
      const victim = this.voices.values().next().value;
      if (victim) this._stopVoice(victim);
    }
    const buf = this._buffer(name, opts.variant);
    if (!buf) return null;
    const a = this.actx;
    const src = a.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = opts.pitch ?? 1;
    const panner = a.createPanner();
    panner.panningModel = 'equalpower';
    panner.distanceModel = 'inverse';
    panner.refDistance = opts.refDistance ?? 8;
    panner.maxDistance = maxD;
    panner.rolloffFactor = opts.rolloff ?? 1.1;
    setPannerPosition(panner, position, a.currentTime);
    const g = a.createGain();
    g.gain.value = opts.volume ?? 1;
    src.connect(g);
    g.connect(panner);
    panner.connect(opts.bus || this.sfxBus);
    if (this.reverbSend && (opts.reverb ?? 0.5) > 0) {
      const send = a.createGain();
      send.gain.value = (opts.reverb ?? 0.5) * 0.4;
      panner.connect(send);
      send.connect(this.reverbSend);
    }
    src.start();
    this._track(src, g, panner);
    return { src, gain: g, panner };
  }

  /** A looping, movable sound (sirens, engines, fire). Returns a handle. */
  startLoop(name, opts = {}) {
    if (!this.ready || !this.enabled) return null;
    const buf = this._buffer(name, 0);
    if (!buf) return null;
    const a = this.actx;
    const src = a.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.playbackRate.value = opts.pitch ?? 1;
    const g = a.createGain();
    g.gain.value = opts.volume ?? 0.6;
    let panner = null;
    src.connect(g);
    if (opts.position) {
      panner = a.createPanner();
      panner.panningModel = 'equalpower';
      panner.distanceModel = 'inverse';
      panner.refDistance = opts.refDistance ?? 10;
      panner.maxDistance = opts.maxDistance ?? 220;
      panner.rolloffFactor = opts.rolloff ?? 1.0;
      setPannerPosition(panner, opts.position, a.currentTime);
      g.connect(panner);
      panner.connect(opts.bus || this.sfxBus);
    } else {
      g.connect(opts.bus || this.sfxBus);
    }
    src.start();
    const handle = {
      src, gain: g, panner, stopped: false,
      setVolume: (v) => { try { g.gain.setTargetAtTime(v, a.currentTime, 0.05); } catch (e) { g.gain.value = v; } },
      setPitch: (p) => { try { src.playbackRate.setTargetAtTime(p, a.currentTime, 0.05); } catch (e) { src.playbackRate.value = p; } },
      setPosition: (pos) => { if (panner) setPannerPosition(panner, pos, a.currentTime); },
      stop: () => {
        if (handle.stopped) return;
        handle.stopped = true;
        try { g.gain.setTargetAtTime(0, a.currentTime, 0.05); } catch (e) { /* ignore */ }
        try { src.stop(a.currentTime + 0.25); } catch (e) { /* ignore */ }
        setTimeout(() => { try { src.disconnect(); g.disconnect(); panner?.disconnect(); } catch (e) { /* ignore */ } }, 400);
      },
    };
    return handle;
  }

  _track(src, g, panner) {
    const entry = { src, g, panner };
    this.voices.add(entry);
    src.onended = () => {
      this.voices.delete(entry);
      try { src.disconnect(); g.disconnect(); panner?.disconnect(); } catch (e) { /* ignore */ }
    };
  }
  _stopVoice(entry) {
    try { entry.src.stop(); } catch (e) { /* ignore */ }
    this.voices.delete(entry);
  }

  /** Position and orient the listener from the camera each frame. */
  update(dt) {
    if (!this.ready) return;
    const a = this.actx;
    const cam = this.ctx.camera;
    const l = a.listener;
    const p = cam.position;
    const t = a.currentTime;
    cam.getWorldDirection(_fwd);
    _up.set(0, 1, 0).applyQuaternion(cam.quaternion);
    try {
      if (l.positionX) {
        l.positionX.setTargetAtTime(p.x, t, 0.02);
        l.positionY.setTargetAtTime(p.y, t, 0.02);
        l.positionZ.setTargetAtTime(p.z, t, 0.02);
        l.forwardX.setTargetAtTime(_fwd.x, t, 0.02);
        l.forwardY.setTargetAtTime(_fwd.y, t, 0.02);
        l.forwardZ.setTargetAtTime(_fwd.z, t, 0.02);
        l.upX.setTargetAtTime(_up.x, t, 0.02);
        l.upY.setTargetAtTime(_up.y, t, 0.02);
        l.upZ.setTargetAtTime(_up.z, t, 0.02);
      } else {
        l.setPosition(p.x, p.y, p.z);
        l.setOrientation(_fwd.x, _fwd.y, _fwd.z, _up.x, _up.y, _up.z);
      }
    } catch (e) { /* some engines throw on rapid automation; not fatal */ }
    if (this.music) this.music.update(a.currentTime);
  }

  setMuted(m) {
    this._muted = m;
    if (this.master) this.master.gain.value = m ? 0 : this.ctx.settings.get('masterVolume');
  }
  dispose() {
    for (const v of [...this.voices]) this._stopVoice(v);
    this.music?.stop();
    this.actx?.close?.().catch(() => {});
  }
}

function setPannerPosition(panner, pos, time) {
  try {
    if (panner.positionX) {
      panner.positionX.setValueAtTime(pos.x, time);
      panner.positionY.setValueAtTime(pos.y, time);
      panner.positionZ.setValueAtTime(pos.z, time);
    } else {
      panner.setPosition(pos.x, pos.y, pos.z);
    }
  } catch (e) { /* ignore */ }
}

/** A synthetic impulse response — exponentially decaying filtered noise. */
function makeImpulse(a, seconds, decay) {
  const rate = a.sampleRate;
  const len = Math.floor(rate * seconds);
  const buf = a.createBuffer(2, len, rate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const n = Math.random() * 2 - 1;
      lp += 0.22 * (n - lp);
      d[i] = lp * Math.pow(1 - i / len, decay);
    }
  }
  return buf;
}
