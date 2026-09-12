// engineSound.js — a real-time engine synthesiser driven by rpm, load and gear.
//
// Cylinder firing pulses from a stack of detuned oscillators, an intake/road-noise layer,
// a turbo whistle, and a transient on each shift. Rewritten per vehicle from the def's
// engine type so a diesel bus and a V12 do not share a voice.
import { clamp, lerp } from '../core/mathx.js';

const PROFILES = {
  v8: { cylinders: 8, base: 0.5, harmonics: [1, 0.62, 0.38, 0.2, 0.12], rasp: 0.55, growl: 0.7, filter: 1800 },
  v6: { cylinders: 6, base: 0.55, harmonics: [1, 0.5, 0.3, 0.16], rasp: 0.42, growl: 0.5, filter: 2100 },
  i4: { cylinders: 4, base: 0.72, harmonics: [1, 0.42, 0.22, 0.1], rasp: 0.35, growl: 0.3, filter: 2600 },
  v12: { cylinders: 12, base: 0.42, harmonics: [1, 0.7, 0.5, 0.34, 0.2, 0.12], rasp: 0.3, growl: 0.85, filter: 3200 },
  electric: { cylinders: 0, base: 1.6, harmonics: [1, 0.3], rasp: 0, growl: 0, filter: 5200 },
  diesel: { cylinders: 6, base: 0.34, harmonics: [1, 0.55, 0.42, 0.3, 0.2], rasp: 0.75, growl: 0.9, filter: 1200 },
  bike: { cylinders: 2, base: 0.9, harmonics: [1, 0.55, 0.3, 0.18], rasp: 0.5, growl: 0.35, filter: 3400 },
  turbine: { cylinders: 0, base: 2.4, harmonics: [1, 0.4, 0.25], rasp: 0.1, growl: 0.2, filter: 4200 },
};

export class EngineSound {
  constructor(ctx) {
    this.ctx = ctx;
    this.vehicle = null;
    this.nodes = null;
    this.a = null;
    this.started = false;
    this.lastGear = 1;
    this.shiftFlash = 0;
  }

  attach(vehicle) {
    this.detach();
    const audio = this.ctx.audio;
    if (!audio || !audio.ready || !audio.actx) return;
    this.a = audio.actx;
    this.vehicle = vehicle;
    const a = this.a;
    const prof = PROFILES[vehicle.def.sound.engineType] || PROFILES.i4;
    this.profile = prof;

    const out = a.createGain();
    out.gain.value = 0;
    out.connect(audio.engineBus);

    const lp = a.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = prof.filter;
    lp.Q.value = 0.9;
    lp.connect(out);

    // Harmonic stack: the firing order fundamental plus overtones.
    const oscs = [];
    for (let i = 0; i < prof.harmonics.length; i++) {
      const o = a.createOscillator();
      o.type = i === 0 ? 'sawtooth' : (i % 2 ? 'square' : 'sawtooth');
      o.frequency.value = 60;
      const g = a.createGain();
      g.gain.value = prof.harmonics[i] * 0.16;
      o.connect(g); g.connect(lp);
      try { o.start(); } catch (e) { /* already started */ }
      oscs.push({ o, g, mult: i + 1, amp: prof.harmonics[i] });
    }

    // Intake / exhaust noise bed.
    const noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    const noise = a.createBufferSource();
    noise.buffer = noiseBuf;
    noise.loop = true;
    const noiseFilter = a.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 700;
    noiseFilter.Q.value = 0.8;
    const noiseGain = a.createGain();
    noiseGain.gain.value = 0;
    noise.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(out);
    try { noise.start(); } catch (e) { /* ignore */ }

    // Turbo whistle.
    const turbo = a.createOscillator();
    turbo.type = 'sine';
    turbo.frequency.value = 3000;
    const turboGain = a.createGain();
    turboGain.gain.value = 0;
    turbo.connect(turboGain); turboGain.connect(out);
    try { turbo.start(); } catch (e) { /* ignore */ }

    // Positional panner so other cars sound like they are where they are.
    const panner = a.createPanner();
    panner.panningModel = 'equalpower';
    panner.distanceModel = 'inverse';
    panner.refDistance = 6;
    panner.maxDistance = 190;
    out.disconnect();
    out.connect(panner);
    panner.connect(audio.engineBus);

    this.nodes = { out, lp, oscs, noise, noiseFilter, noiseGain, turbo, turboGain, panner };
    this.started = true;
    this.lastGear = vehicle.sim.gear;

    this.skid = audio.startLoop('skidLoop', { volume: 0, position: vehicle.sim.position, maxDistance: 90 });
    this.siren = null;
  }

  detach() {
    if (this.nodes) {
      const n = this.nodes;
      const t = this.a ? this.a.currentTime : 0;
      try { n.out.gain.setTargetAtTime(0, t, 0.06); } catch (e) { /* ignore */ }
      const stopAll = () => {
        try {
          for (const o of n.oscs) { o.o.stop(); o.o.disconnect(); o.g.disconnect(); }
          n.noise.stop(); n.noise.disconnect(); n.noiseFilter.disconnect(); n.noiseGain.disconnect();
          n.turbo.stop(); n.turbo.disconnect(); n.turboGain.disconnect();
          n.lp.disconnect(); n.out.disconnect(); n.panner.disconnect();
        } catch (e) { /* ignore */ }
      };
      setTimeout(stopAll, 220);
      this.nodes = null;
    }
    if (this.skid) { this.skid.stop(); this.skid = null; }
    if (this.siren) { this.siren.stop(); this.siren = null; }
    this.vehicle = null;
    this.started = false;
  }

  update(dt, vehicle) {
    if (vehicle && vehicle !== this.vehicle) this.attach(vehicle);
    if (!this.nodes || !this.vehicle) return;
    const a = this.a;
    if (!a || a.state !== 'running') return;
    const v = this.vehicle;
    const sim = v.sim;
    const n = this.nodes;
    const prof = this.profile;
    const t = a.currentTime;

    const rpm = sim.rpmSmoothed;
    const redline = v.def.engine.redlineRpm;
    const rpmN = clamp(rpm / redline, 0, 1.1);
    const running = sim.engineOn && sim.engineHealth > 0.02 && !sim.exploded;

    // Fundamental = firing frequency. Cylinders fire twice per two revolutions.
    const fireHz = prof.cylinders > 0
      ? (rpm / 60) * (prof.cylinders / 2) * prof.base * (v.def.sound.basePitch || 1)
      : (rpm / 60) * prof.base * 3 * (v.def.sound.basePitch || 1);

    for (const osc of n.oscs) {
      const f = clamp(fireHz * osc.mult, 20, 8000);
      osc.o.frequency.setTargetAtTime(f, t, 0.03);
      // Overtones come up with load and revs — that is the "growl".
      const load = clamp(sim.throttle * 0.7 + rpmN * 0.5, 0, 1);
      const amp = osc.amp * (0.09 + load * 0.16) * (osc.mult > 1 ? lerp(0.4, 1.2, load) : 1);
      osc.g.gain.setTargetAtTime(running ? amp : 0, t, 0.05);
    }
    n.lp.frequency.setTargetAtTime(prof.filter * (0.5 + rpmN * 0.9 + sim.throttle * 0.4), t, 0.06);

    // Road / intake noise rises with speed.
    const speedN = clamp(sim.speed / 45, 0, 1);
    n.noiseFilter.frequency.setTargetAtTime(400 + speedN * 2600 + rpmN * 900, t, 0.08);
    n.noiseGain.gain.setTargetAtTime(running ? 0.03 + speedN * 0.085 + sim.throttle * 0.03 * prof.rasp : speedN * 0.05, t, 0.1);

    // Turbo spool.
    const turboAmt = (v.def.engine.turbo || 0) * clamp((rpmN - 0.35) / 0.5, 0, 1) * sim.throttle;
    n.turbo.frequency.setTargetAtTime(2400 + rpmN * 4200, t, 0.08);
    n.turboGain.gain.setTargetAtTime(running ? turboAmt * 0.035 : 0, t, 0.08);

    // Shift transient.
    if (sim.gear !== this.lastGear) {
      this.lastGear = sim.gear;
      this.shiftFlash = 1;
      if (v.def.sound.exhaustPop && sim.throttle > 0.4) {
        this.ctx.audio?.playAt('impactMetal', sim.position, { volume: 0.18, pitch: 1.6, maxDistance: 60 });
      }
    }
    this.shiftFlash = Math.max(0, this.shiftFlash - dt * 5);

    // Volume: a bit louder when you're the one driving.
    const isPlayerCar = v.isPlayerVehicle;
    const vol = (running ? 0.38 : 0.05) * (isPlayerCar ? 1 : 0.55) * (1 - this.shiftFlash * 0.35);
    n.out.gain.setTargetAtTime(vol, t, 0.06);

    // Position
    try {
      const p = sim.position;
      if (n.panner.positionX) {
        n.panner.positionX.setTargetAtTime(p.x, t, 0.02);
        n.panner.positionY.setTargetAtTime(p.y, t, 0.02);
        n.panner.positionZ.setTargetAtTime(p.z, t, 0.02);
      } else n.panner.setPosition(p.x, p.y, p.z);
    } catch (e) { /* ignore */ }

    // Tyre squeal.
    if (this.skid) {
      const skid = sim.averageSkid;
      this.skid.setVolume(clamp(skid * 0.55, 0, 0.55));
      this.skid.setPitch(0.85 + skid * 0.5);
      this.skid.setPosition(sim.position);
    }

    // Siren.
    if (v.sirenOn && !this.siren) {
      this.siren = this.ctx.audio?.startLoop('sirenWail', { volume: 0.5, position: sim.position, maxDistance: 320 });
    } else if (!v.sirenOn && this.siren) {
      this.siren.stop(); this.siren = null;
    }
    if (this.siren) this.siren.setPosition(sim.position);
  }

  dispose() { this.detach(); }
}

/** Lightweight engine audio for ambient AI traffic: one loop, pitch-shifted. */
export class AmbientEngineSound {
  constructor(ctx, vehicle) {
    this.ctx = ctx;
    this.vehicle = vehicle;
    this.handle = ctx.audio?.startLoop('boatEngine', {
      volume: 0, position: vehicle.sim.position, maxDistance: 110, refDistance: 7,
    });
  }
  update(dt) {
    if (!this.handle) return;
    const sim = this.vehicle.sim;
    const rpmN = clamp(sim.rpmSmoothed / this.vehicle.def.engine.redlineRpm, 0, 1.1);
    this.handle.setPitch(0.55 + rpmN * 1.5);
    this.handle.setVolume(sim.engineOn && !sim.exploded ? 0.10 + rpmN * 0.14 : 0);
    this.handle.setPosition(sim.position);
  }
  dispose() { if (this.handle) { this.handle.stop(); this.handle = null; } }
}
