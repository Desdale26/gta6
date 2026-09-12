// musicgen.js — the radio. Real-time generative synthesis from the station definitions.
//
// A lookahead scheduler walks the 16-step grid of each bar and schedules oscillator voices
// a fraction of a second ahead of the clock, so timing stays tight without pre-rendering.

const SCALES = {
  minor: [0, 2, 3, 5, 7, 8, 10],
  major: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
  pentatonic: [0, 2, 4, 7, 9],
  blues: [0, 3, 5, 6, 7, 10],
};

const LOOKAHEAD = 0.42;      // seconds scheduled ahead of the audio clock
const MAX_LIVE_NODES = 64;

/** Frequency for a scale degree. Degrees beyond the scale wrap into higher octaves. */
export function degreeToFreq(degree, key = 0, scale = 'minor', octave = 4) {
  const steps = SCALES[scale] || SCALES.minor;
  const n = steps.length;
  const oct = Math.floor(degree / n);
  let idx = degree % n;
  if (idx < 0) { idx += n; }
  const semitone = steps[idx] + (oct + (degree < 0 && degree % n !== 0 ? -1 : 0)) * 12;
  const midi = 12 * (octave + 1) + key + semitone;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export class MusicPlayer {
  constructor(audioCtx, destination) {
    this.a = audioCtx;
    this.dest = destination || (audioCtx && audioCtx.destination);
    this.station = null;
    this.track = null;
    this.trackIndex = 0;
    this.playing = false;
    this.volume = 1;
    this.liveNodes = 0;
    this.nextStepTime = 0;
    this.step = 0;
    this.bar = 0;
    this.startTime = 0;
    this.identUntil = 0;
    this._fadeTarget = 1;
    this._ready = !!audioCtx;

    if (!this._ready) return;
    const a = audioCtx;
    this.out = a.createGain();
    this.out.gain.value = 0;
    this.out.connect(this.dest);

    // shared delay + a small reverb send
    this.delay = a.createDelay(1.0);
    this.delay.delayTime.value = 0.28;
    this.delayFb = a.createGain();
    this.delayFb.gain.value = 0.34;
    this.delayFilter = a.createBiquadFilter();
    this.delayFilter.type = 'lowpass';
    this.delayFilter.frequency.value = 2600;
    this.delay.connect(this.delayFilter);
    this.delayFilter.connect(this.delayFb);
    this.delayFb.connect(this.delay);
    this.delaySend = a.createGain();
    this.delaySend.gain.value = 0.32;
    this.delaySend.connect(this.delay);
    this.delay.connect(this.out);

    this.verb = a.createConvolver();
    this.verb.buffer = this._impulse(1.4, 2.6);
    this.verbSend = a.createGain();
    this.verbSend.gain.value = 0.18;
    this.verbSend.connect(this.verb);
    this.verb.connect(this.out);
  }

  _impulse(seconds, decay) {
    const a = this.a;
    const len = Math.max(2, Math.floor(a.sampleRate * seconds));
    const buf = a.createBuffer(2, len, a.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const n = Math.random() * 2 - 1;
        lp += 0.25 * (n - lp);
        d[i] = lp * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  }

  setStation(stationDef, trackIndex) {
    if (!this._ready || !stationDef) return;
    const changing = this.station && this.station.id !== stationDef.id;
    this.station = stationDef;
    this.trackIndex = trackIndex !== undefined ? trackIndex
      : Math.floor(Math.random() * stationDef.tracks.length);
    this.track = stationDef.tracks[this.trackIndex];
    this.step = 0; this.bar = 0;
    this.nextStepTime = this.a.currentTime + 0.06;
    this.startTime = this.nextStepTime;
    this.identUntil = changing ? this.a.currentTime + 2.2 : 0;
    if (changing) this._staticBurst();
    this.playing = true;
    this._rampTo(this.volume, 1.2);
  }

  play() { if (!this._ready) return; this.playing = true; this._rampTo(this.volume, 0.6); }
  stop() {
    if (!this._ready) return;
    this.playing = false;
    this._rampTo(0, 0.5);
  }
  next() {
    if (!this.station) return;
    this.setStation(this.station, (this.trackIndex + 1) % this.station.tracks.length);
  }
  prev() {
    if (!this.station) return;
    const n = this.station.tracks.length;
    this.setStation(this.station, (this.trackIndex - 1 + n) % n);
  }
  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.playing) this._rampTo(this.volume, 0.25);
  }
  _rampTo(v, time) {
    if (!this.out) return;
    try {
      const t = this.a.currentTime;
      this.out.gain.cancelScheduledValues(t);
      this.out.gain.setTargetAtTime(v, t, Math.max(0.05, time / 3));
    } catch (e) { this.out.gain.value = v; }
  }

  get nowPlaying() {
    if (!this.track || !this.station) return null;
    const spb = 60 / this.track.bpm;
    const barLen = spb * 4;
    return {
      title: this.track.title, artist: this.track.artist,
      station: this.station.name, dj: this.station.djName,
      genre: this.station.genre, color: this.station.color,
      progress: this.track.bars ? (this.bar % this.track.bars) / this.track.bars : 0,
      ident: this.a && this.a.currentTime < this.identUntil
        ? this.station.idents[this.bar % this.station.idents.length] : null,
    };
  }

  /** Schedule everything that falls inside the lookahead window. */
  update(now) {
    if (!this._ready || !this.playing || !this.track) return;
    if (this.a.state !== 'running') return;
    const t = this.track;
    const spb = 60 / t.bpm;
    const stepDur = spb / 4;
    let guard = 0;
    while (this.nextStepTime < now + LOOKAHEAD && guard++ < 64) {
      const swung = (this.step % 2 === 1) ? stepDur * (t.swing || 0) : 0;
      this._scheduleStep(this.step, this.nextStepTime + swung, stepDur);
      this.step++;
      this.nextStepTime += stepDur;
      if (this.step >= 16) {
        this.step = 0;
        this.bar++;
        if (t.bars && this.bar >= t.bars) this._advanceTrack();
      }
    }
  }

  _advanceTrack() {
    if (!this.station) return;
    this.bar = 0;
    // Move to the next track on the station, with a short ident gap.
    this.trackIndex = (this.trackIndex + 1) % this.station.tracks.length;
    this.track = this.station.tracks[this.trackIndex];
    this.identUntil = this.a.currentTime + 2.0;
    this._staticBurst();
  }

  _scheduleStep(step, time, stepDur) {
    const t = this.track;
    if (!t) return;
    const energy = t.energy ?? 0.7;
    const progIdx = this.bar % t.progression.length;
    const root = t.progression[progIdx];
    const talky = this.a.currentTime < this.identUntil;
    const gate = talky ? 0.25 : 1;

    const d = t.drums;
    if (d.kick && d.kick[step] > 0) this._kick(time, d.kick[step] * gate);
    if (d.snare && d.snare[step] > 0) this._snare(time, d.snare[step] * gate);
    if (d.hat && d.hat[step] > 0) this._hat(time, d.hat[step] * 0.75 * gate, false);
    if (d.open && d.open[step] > 0) this._hat(time, d.open[step] * 0.7 * gate, true);
    if (d.clap && d.clap[step] > 0) this._clap(time, d.clap[step] * 0.8 * gate);
    if (d.tom && d.tom[step] > 0) this._tom(time, d.tom[step] * gate);
    if (d.ride && d.ride[step] > 0) this._hat(time, d.ride[step] * 0.35 * gate, true, 7200);

    // bass
    const bp = t.bass.pattern;
    const bIdx = (this.bar * 16 + step) % bp.length;
    const bDeg = bp[bIdx];
    if (bDeg !== null && bDeg !== undefined) {
      const f = degreeToFreq(root + bDeg, t.key, t.scale, t.bass.octave ?? 2);
      this._bass(time, f, stepDur * 1.6, t.bass, energy * gate);
    }

    // lead
    if (t.lead && t.lead.on) {
      const lp = t.lead.pattern;
      const lIdx = (this.bar * 16 + step) % lp.length;
      const lDeg = lp[lIdx];
      if (lDeg !== null && lDeg !== undefined) {
        const f = degreeToFreq(root + lDeg, t.key, t.scale, t.lead.octave ?? 5);
        this._lead(time, f, stepDur * 1.8, t.lead, energy * 0.7 * gate);
      }
    }

    // arp
    if (t.arp && t.arp.on) {
      const rate = t.arp.rate || 8;
      if (step % Math.max(1, Math.round(16 / rate)) === 0) {
        const deg = root + [0, 2, 4, 6][(step / 2) % 4 | 0];
        const f = degreeToFreq(deg, t.key, t.scale, t.arp.octave ?? 5);
        this._lead(time, f, stepDur * 0.7, { wave: t.arp.wave, cutoff: 3200, delay: 0.3 }, energy * 0.32 * gate);
      }
    }

    // pad — one chord at the top of each bar
    if (step === 0 && t.pad && t.pad.on) {
      const chord = [0, 2, 4];
      for (const c of chord) {
        const f = degreeToFreq(root + c, t.key, t.scale, t.pad.octave ?? 3);
        this._pad(time, f, stepDur * 16, t.pad, energy * 0.22 * (talky ? 0.6 : 1));
      }
    }
  }

  // --- voices ---------------------------------------------------------------
  /** `cost` is how many nodes the caller is about to create, so the cap actually holds. */
  _voiceBudget(cost = 1) { return this.liveNodes + cost <= MAX_LIVE_NODES; }
  _retire(node, at) {
    this.liveNodes++;
    const clean = () => { this.liveNodes = Math.max(0, this.liveNodes - 1); try { node.disconnect(); } catch (e) { /* ignore */ } };
    node.onended = clean;
    // Safety net for engines that drop onended.
    setTimeout(clean, Math.max(200, (at - this.a.currentTime) * 1000 + 2500));
  }

  _kick(time, vel) {
    if (!this._voiceBudget(2)) return;
    const a = this.a;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, time);
    o.frequency.exponentialRampToValueAtTime(42, time + 0.12);
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(0.9 * vel, time + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.34);
    o.connect(g); g.connect(this.out);
    o.start(time); o.stop(time + 0.38);
    this._retire(o, time + 0.38);
    // click
    const c = a.createOscillator(); const cg = a.createGain();
    c.type = 'square'; c.frequency.setValueAtTime(1200, time);
    cg.gain.setValueAtTime(0.14 * vel, time);
    cg.gain.exponentialRampToValueAtTime(0.0001, time + 0.02);
    c.connect(cg); cg.connect(this.out);
    c.start(time); c.stop(time + 0.03);
    this._retire(c, time + 0.03);
  }

  _snare(time, vel) {
    if (!this._voiceBudget(2)) return;
    const a = this.a;
    const n = this._noiseSource(0.22);
    const f = a.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = 1400;
    const g = a.createGain();
    g.gain.setValueAtTime(0.55 * vel, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.18);
    n.connect(f); f.connect(g); g.connect(this.out);
    g.connect(this.verbSend);
    n.start(time); n.stop(time + 0.22);
    this._retire(n, time + 0.22);

    const o = a.createOscillator(); const og = a.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(190, time);
    o.frequency.exponentialRampToValueAtTime(120, time + 0.1);
    og.gain.setValueAtTime(0.3 * vel, time);
    og.gain.exponentialRampToValueAtTime(0.0001, time + 0.12);
    o.connect(og); og.connect(this.out);
    o.start(time); o.stop(time + 0.14);
    this._retire(o, time + 0.14);
  }

  _hat(time, vel, open, freq = 9000) {
    if (!this._voiceBudget()) return;
    const a = this.a;
    const dur = open ? 0.28 : 0.06;
    const n = this._noiseSource(dur + 0.02);
    const f = a.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = freq * 0.75;
    const g = a.createGain();
    g.gain.setValueAtTime(0.3 * vel, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    n.connect(f); f.connect(g); g.connect(this.out);
    n.start(time); n.stop(time + dur + 0.02);
    this._retire(n, time + dur + 0.02);
  }

  _clap(time, vel) {
    if (!this._voiceBudget(3)) return;
    const a = this.a;
    for (let i = 0; i < 3; i++) {
      const at = time + i * 0.012;
      const n = this._noiseSource(0.16);
      const f = a.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 1.4;
      const g = a.createGain();
      g.gain.setValueAtTime(0.32 * vel * (i === 2 ? 1.3 : 0.7), at);
      g.gain.exponentialRampToValueAtTime(0.0001, at + (i === 2 ? 0.14 : 0.04));
      n.connect(f); f.connect(g); g.connect(this.out);
      if (i === 2) g.connect(this.verbSend);
      n.start(at); n.stop(at + 0.16);
      this._retire(n, at + 0.16);
    }
  }

  _tom(time, vel) {
    if (!this._voiceBudget()) return;
    const a = this.a;
    const o = a.createOscillator(); const g = a.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(260, time);
    o.frequency.exponentialRampToValueAtTime(90, time + 0.2);
    g.gain.setValueAtTime(0.4 * vel, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.24);
    o.connect(g); g.connect(this.out);
    o.start(time); o.stop(time + 0.26);
    this._retire(o, time + 0.26);
  }

  _bass(time, freq, dur, cfg, vel) {
    if (!this._voiceBudget()) return;
    const a = this.a;
    const o = a.createOscillator();
    o.type = mapWave(cfg.wave);
    if (cfg.glide) {
      o.frequency.setValueAtTime(freq * 0.72, time);
      o.frequency.exponentialRampToValueAtTime(freq, time + cfg.glide);
    } else {
      o.frequency.setValueAtTime(freq, time);
    }
    const f = a.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(Math.max(120, (cfg.cutoff || 800) * 1.4), time);
    f.frequency.exponentialRampToValueAtTime(Math.max(100, cfg.cutoff || 800), time + dur * 0.6);
    f.Q.value = 4;
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(0.34 * vel, time + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    o.connect(f); f.connect(g); g.connect(this.out);
    o.start(time); o.stop(time + dur + 0.02);
    this._retire(o, time + dur + 0.02);
  }

  _lead(time, freq, dur, cfg, vel) {
    if (!this._voiceBudget(2)) return;
    const a = this.a;
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(0.22 * vel, time + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    const f = a.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = cfg.cutoff || 2400;
    f.Q.value = 1.2;
    f.connect(g);
    g.connect(this.out);
    if (cfg.delay) {
      const send = a.createGain();
      send.gain.value = cfg.delay * 0.5;
      g.connect(send);
      send.connect(this.delaySend);
    }
    for (let i = 0; i < 2; i++) {
      const o = a.createOscillator();
      o.type = mapWave(cfg.wave);
      o.frequency.value = freq * (i === 0 ? 1 : 1.006);
      o.connect(f);
      o.start(time); o.stop(time + dur + 0.03);
      this._retire(o, time + dur + 0.03);
    }
  }

  _pad(time, freq, dur, cfg, vel) {
    if (!this._voiceBudget(3)) return;
    const a = this.a;
    const attack = cfg.attack ?? 1.2;
    const release = cfg.release ?? 2.0;
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(0.16 * vel, time + attack);
    g.gain.setValueAtTime(0.16 * vel, time + Math.max(attack, dur - release));
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur + release);
    const f = a.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime((cfg.cutoff || 1200) * 0.6, time);
    f.frequency.linearRampToValueAtTime(cfg.cutoff || 1200, time + dur * 0.5);
    f.connect(g);
    g.connect(this.out);
    g.connect(this.verbSend);
    for (let i = 0; i < 3; i++) {
      const o = a.createOscillator();
      o.type = mapWave(cfg.wave);
      o.detune.value = (i - 1) * 9;
      o.frequency.value = freq;
      o.connect(f);
      o.start(time); o.stop(time + dur + release + 0.1);
      this._retire(o, time + dur + release + 0.1);
    }
  }

  /** Radio chatter between tracks: filtered noise plus a two-note jingle. */
  _staticBurst() {
    if (!this._ready || this.a.state !== 'running') return;
    if (!this._voiceBudget(3)) return;
    const a = this.a;
    const time = a.currentTime + 0.02;
    const n = this._noiseSource(0.5);
    const f = a.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 2200; f.Q.value = 1.0;
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(0.18, time + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.45);
    n.connect(f); f.connect(g); g.connect(this.out);
    n.start(time); n.stop(time + 0.5);
    this._retire(n, time + 0.5);
    const notes = [880, 1320];
    for (let i = 0; i < notes.length; i++) {
      const at = time + 0.5 + i * 0.14;
      const o = a.createOscillator(); const og = a.createGain();
      o.type = 'triangle'; o.frequency.value = notes[i];
      og.gain.setValueAtTime(0.0001, at);
      og.gain.exponentialRampToValueAtTime(0.14, at + 0.01);
      og.gain.exponentialRampToValueAtTime(0.0001, at + 0.3);
      o.connect(og); og.connect(this.out);
      o.start(at); o.stop(at + 0.32);
      this._retire(o, at + 0.32);
    }
  }

  _noiseSource(seconds) {
    const a = this.a;
    if (!this._noiseBuf || this._noiseBuf.duration < seconds) {
      const len = Math.max(2, Math.floor(a.sampleRate * Math.max(seconds, 1)));
      const buf = a.createBuffer(1, len, a.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this._noiseBuf = buf;
    }
    const src = a.createBufferSource();
    src.buffer = this._noiseBuf;
    src.loop = true;
    return src;
  }
}

function mapWave(w) {
  if (w === 'saw') return 'sawtooth';
  if (w === 'square') return 'square';
  if (w === 'triangle') return 'triangle';
  if (w === 'fm') return 'sawtooth';
  return 'sine';
}

/**
 * Compute the note events for one bar of a track without touching an AudioContext.
 * Used to verify the musical data is sane.
 */
export function createRadioSynthTest() {
  return function eventsForBar(track, bar = 0) {
    const events = [];
    const spb = 60 / track.bpm;
    const stepDur = spb / 4;
    const root = track.progression[bar % track.progression.length];
    for (let step = 0; step < 16; step++) {
      const swung = (step % 2 === 1) ? stepDur * (track.swing || 0) : 0;
      const time = step * stepDur + swung;
      const d = track.drums;
      if (d.kick && d.kick[step] > 0) events.push({ time, voice: 'kick', freq: 60, vel: d.kick[step] });
      if (d.snare && d.snare[step] > 0) events.push({ time, voice: 'snare', freq: 190, vel: d.snare[step] });
      if (d.hat && d.hat[step] > 0) events.push({ time, voice: 'hat', freq: 9000, vel: d.hat[step] });
      if (d.clap && d.clap[step] > 0) events.push({ time, voice: 'clap', freq: 1800, vel: d.clap[step] });
      if (d.open && d.open[step] > 0) events.push({ time, voice: 'open', freq: 9000, vel: d.open[step] });
      if (d.tom && d.tom[step] > 0) events.push({ time, voice: 'tom', freq: 260, vel: d.tom[step] });
      if (d.ride && d.ride[step] > 0) events.push({ time, voice: 'ride', freq: 7200, vel: d.ride[step] });

      const bp = track.bass.pattern;
      const bDeg = bp[(bar * 16 + step) % bp.length];
      if (bDeg !== null && bDeg !== undefined) {
        events.push({ time, voice: 'bass', freq: degreeToFreq(root + bDeg, track.key, track.scale, track.bass.octave ?? 2), vel: 1 });
      }
      if (track.lead && track.lead.on) {
        const lp = track.lead.pattern;
        const lDeg = lp[(bar * 16 + step) % lp.length];
        if (lDeg !== null && lDeg !== undefined) {
          events.push({ time, voice: 'lead', freq: degreeToFreq(root + lDeg, track.key, track.scale, track.lead.octave ?? 5), vel: 1 });
        }
      }
      if (step === 0 && track.pad && track.pad.on) {
        for (const c of [0, 2, 4]) {
          events.push({ time, voice: 'pad', freq: degreeToFreq(root + c, track.key, track.scale, track.pad.octave ?? 3), vel: 1 });
        }
      }
    }
    events.sort((a, b) => a.time - b.time);
    return events;
  };
}
