/*
 * audio-holdup.js — the sounds of a shop hold-up, synthesised live like the
 * rest of audio.js (no audio files).
 *
 * Adds methods to VH.AudioEngine.prototype. Every method is a no-op until the
 * audio context is running and shrugs off odd arguments. Sounds in the world
 * take a stereo `pan` (-1..1) and a distance `gain` (0..1) that the caller
 * works out, like audio-weapons.js; quiet (far-off) ones lose their top end.
 *
 *   shopChime()              the two-tone door chime as Jay walks in
 *   tillOpen(pan, gain)      the drawer's latch and clunk, the slide out, the bell
 *   cashRustle(pan, gain)    a handful of notes stuffed into a bag (short; call it often)
 *   bagThrow(pan, gain)      the bag landing on the counter
 *   bagGrab()                Jay takes the bag or the cash (ui bus)
 *   safeTick(pan, gain)      one click of the safe's dial
 *   safeOpen(pan, gain)      the bolts drawing back, then the heavy door creaking open
 *   cameraSmash(pan, gain)   a CCTV camera shot out: plastic, glass and an electrical fizz
 *   holdupSting(kind)        a short musical hit (ui bus): 'start' 'tell' 'done' 'clean'
 *   alarmBell()              voice: update({ gain, pan, muffle 0..1 }), stop()
 *                            the shop's electric alarm bell, ringing until stopped
 *                            (it eases back a little while anyone is talking)
 *   holdupTension()          voice: update({ level 0..1, gain }), duck(0..1), stop()
 *                            a quiet, low pulse under the hold-up, on the music bus;
 *                            it ducks by itself while anyone is talking
 *
 * The voices come from VH.AudioEngine.voiceKit (audio-drive.js): a handle made
 * before the context runs is safe to use; it builds its nodes the first time
 * it is updated with something to play and frees them after a stretch of
 * silence. Inside sounds share a small, bright room reverb. The bell rings
 * outside on the shop front, so it goes into the street reverb and echoes of
 * audio-weapons.js when that is loaded.
 */
(function () {
  'use strict';

  const VH = window.VH;
  if (!VH || !VH.AudioEngine) {
    console.warn('[audio-holdup] load audio.js first');
    return;
  }
  const P = VH.AudioEngine.prototype;
  const kit = VH.AudioEngine.voiceKit;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  const fin = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const smooth = (a, b, x) => {
    const k = clamp((x - a) / (b - a), 0, 1);
    return k * k * (3 - 2 * k);
  };
  // A quiet (far-off) sound loses its top end: a lowpass from 16 kHz down to 2 kHz.
  const far = (g) => (g < 0.5 ? 2000 * Math.pow(8, g / 0.5) : 0);

  /** A caller's pan and gain, made safe. */
  function args(pan, gain) {
    return [clamp(fin(pan, 0), -1, 1), clamp(fin(gain, 0), 0, 1.5)];
  }

  /** Shared buffers, made once per audio context (each one on first use). */
  function assets(e) {
    let a = e._hupAssets;
    if (a && a.ctx === e.ctx) return a;
    a = e._hupAssets = { ctx: e.ctx };
    return a;
  }

  /** Disconnect a one-shot's nodes once it has finished (real-time contexts only). */
  function release(e, nodes, seconds) {
    if (typeof OfflineAudioContext !== 'undefined' && e.ctx instanceof OfflineAudioContext) return;
    setTimeout(() => {
      for (const n of nodes) {
        try {
          n.disconnect();
        } catch (_) {
          /* already gone */
        }
      }
    }, (seconds + 0.5) * 1000);
  }

  /** Exponential attack / hold / decay on a gain param that starts at silence. */
  function env(param, t, a, h, d, peak) {
    const p = Math.max(0.0002, peak || 0.1);
    param.setValueAtTime(0.0001, t);
    param.exponentialRampToValueAtTime(p, t + a);
    if (h > 0) param.setValueAtTime(p, t + a + h);
    param.exponentialRampToValueAtTime(0.0001, t + a + h + d);
  }

  /**
   * Brown noise for thuds, with its slow drift taken out and its peak held
   * to 1, so a thud is never much louder than asked for (the shared brown
   * buffer has the odd big excursion).
   */
  function thudNoise(e) {
    const a = assets(e);
    if (a.thud) return a.thud;
    const ctx = e.ctx;
    const sr = ctx.sampleRate;
    const len = Math.floor(sr * 2);
    const buf = ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    const k = 1 - Math.exp((-2 * Math.PI * 25) / sr);
    let last = 0;
    let slow = 0;
    let peak = 0;
    for (let i = 0; i < len; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      slow += k * (last - slow);
      d[i] = last - slow;
      peak = Math.max(peak, Math.abs(d[i]));
    }
    for (let i = 0; i < len; i++) d[i] /= peak || 1;
    a.thud = buf;
    return buf;
  }

  /** A small shop: tiled floor, a glass front, shelves. Short and bright, with a few close reflections. */
  function roomImpulse(ctx) {
    const sr = ctx.sampleRate;
    const secs = 0.55;
    const len = Math.floor(sr * secs);
    const buf = ctx.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const x = i / sr;
        lp += (0.9 - 0.6 * (x / secs)) * (Math.random() * 2 - 1 - lp);
        d[i] = lp * Math.exp(-x / 0.11) * Math.min(1, x / 0.002);
      }
      for (let r = 0; r < 6; r++) {
        const at = Math.floor(sr * rnd(0.004, 0.035));
        d[at] += (Math.random() < 0.5 ? -1 : 1) * rnd(0.3, 0.7);
      }
    }
    return buf;
  }

  // ----------------------------------------------------------- plumbing
  /** The shared room reverb (created once per context). */
  P._hupRoom = function () {
    const a = assets(this);
    if (a.room) return a.room;
    const ctx = this.ctx;
    const verb = ctx.createConvolver();
    verb.buffer = roomImpulse(ctx);
    const out = ctx.createGain();
    out.gain.value = 0.7;
    verb.connect(out);
    out.connect(this.sfx);
    a.room = verb;
    return verb;
  };

  /**
   * A per-sound input: gain → optional lowpass → pan → bus (sfx unless
   * o.bus), with a send to the room reverb (o.room). Its nodes are let go
   * after o.life seconds. Returns the input node.
   */
  P._hupBus = function (pan, gain, o) {
    const ctx = this.ctx;
    const opt = o || {};
    const bus = opt.bus || this.sfx;
    const input = ctx.createGain();
    input.gain.value = gain;
    const nodes = [input];
    let node = input;
    if (opt.lowpass) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = clamp(opt.lowpass, 200, 20000);
      f.Q.value = 0.5;
      node.connect(f);
      node = f;
      nodes.push(f);
    }
    const out = this._pan(bus, pan);
    if (out !== bus) nodes.push(out);
    node.connect(out);
    if (opt.room > 0) {
      const s = ctx.createGain();
      s.gain.value = opt.room;
      node.connect(s);
      s.connect(this._hupRoom());
      nodes.push(s);
    }
    release(this, nodes, opt.life || 2);
    return input;
  };

  /** True at most once every `gap` seconds per key (stops per-frame spam). */
  P._hupGate = function (key, gap) {
    const t = this.ctx.currentTime;
    const map = this._hupGates || (this._hupGates = {});
    if (map[key] !== undefined && t - map[key] < gap && t >= map[key]) return false;
    map[key] = t;
    return true;
  };

  /**
   * Filtered noise on a looping buffer (so it can last as long as it likes):
   * white, or brown (for thuds) with o.brown. o = { t, dest, brown, buffer,
   * rate, type, freq, freqEnd, sweep, q, peak, attack, hold, decay }.
   */
  P._hupNoise = function (o) {
    const ctx = this.ctx;
    const t = o.t;
    const a = o.attack || 0.003;
    const h = o.hold || 0;
    const d = o.decay || 0.05;
    const src = ctx.createBufferSource();
    src.buffer = o.buffer || (o.brown ? thudNoise(this) : this.white);
    src.loop = true;
    if (o.rate) src.playbackRate.value = o.rate;
    const f = ctx.createBiquadFilter();
    f.type = o.type || 'bandpass';
    f.frequency.setValueAtTime(o.freq || 1000, t);
    if (o.freqEnd) f.frequency.exponentialRampToValueAtTime(o.freqEnd, t + (o.sweep || a + h + d));
    f.Q.value = o.q == null ? 1 : o.q;
    const g = ctx.createGain();
    g.gain.value = 0;
    env(g.gain, t, a, h, d, o.peak);
    src.connect(f);
    f.connect(g);
    g.connect(o.dest);
    src.start(t, Math.random() * src.buffer.duration * 0.8);
    src.stop(t + a + h + d + 0.05);
  };

  /** An oscillator note: { t, dest, freq, freqEnd, sweep, wave, peak, attack, hold, decay, detune, lowpass, lpq }. */
  P._hupTone = function (o) {
    const ctx = this.ctx;
    const t = o.t;
    const a = o.attack || 0.003;
    const h = o.hold || 0;
    const d = o.decay || 0.1;
    const osc = ctx.createOscillator();
    osc.type = o.wave || 'sine';
    osc.frequency.setValueAtTime(o.freq, t);
    if (o.freqEnd) osc.frequency.exponentialRampToValueAtTime(o.freqEnd, t + (o.sweep || a + h + d));
    if (o.detune) osc.detune.value = o.detune;
    let node = osc;
    if (o.lowpass) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = o.lowpass;
      f.Q.value = o.lpq || 0.7;
      osc.connect(f);
      node = f;
    }
    const g = ctx.createGain();
    g.gain.value = 0;
    node.connect(g);
    g.connect(o.dest);
    env(g.gain, t, a, h, d, o.peak);
    osc.start(t);
    osc.stop(t + a + h + d + 0.05);
  };

  /** Struck metal: inharmonic partials [ratio, level, decay] on f, each with a slightly detuned twin so it beats. */
  P._hupRing = function (t, dest, f, peak, parts, beat) {
    for (const [r, lv, dc] of parts) {
      this._hupTone({ t, dest, freq: f * r, peak: peak * lv, attack: 0.001, decay: dc });
      if (beat) this._hupTone({ t, dest, freq: f * r * (1 + beat), peak: peak * lv * 0.6, attack: 0.001, decay: dc * 0.8 });
    }
  };

  /** A coin or a sliver of glass. */
  P._hupTinkle = function (t, dest, f, peak) {
    this._hupTone({ t, dest, freq: f, peak, attack: 0.001, decay: rnd(0.04, 0.12) });
    this._hupTone({ t, dest, freq: f * rnd(1.35, 1.6), peak: peak * 0.5, attack: 0.001, decay: rnd(0.03, 0.07) });
  };

  /** A low hit: a falling sine and a puff of brown noise. */
  P._hupBoom = function (t, dest, p) {
    this._hupTone({ t, dest, freq: 100, freqEnd: 44, peak: p, attack: 0.003, decay: 0.5 });
    this._hupNoise({ t, dest, brown: true, type: 'lowpass', freq: 600, q: 0.7, peak: p * 1.4, attack: 0.003, decay: 0.3 });
  };

  /** Detuned saw chord through a blooming lowpass: the game's brass stabs and pads (as in audio-drive.js). */
  P._hupStab = function (t, dest, notes, dur, o) {
    const ctx = this.ctx;
    const att = o.attack || 0.012;
    const rel = o.release || 0.08;
    const bloom = o.bloom || 0.05;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = o.q || 1.2;
    lp.frequency.setValueAtTime(o.cut0 || 500, t);
    lp.frequency.linearRampToValueAtTime(o.cut || 2500, t + bloom);
    lp.frequency.setTargetAtTime(o.cutEnd || 700, t + bloom, o.close || dur * 0.5);
    const g = ctx.createGain();
    const lvl = o.level || 0.05;
    g.gain.value = 0;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(lvl, t + att);
    g.gain.setTargetAtTime(lvl * (o.sustain == null ? 0.6 : o.sustain), t + att, 0.18);
    g.gain.setTargetAtTime(0, t + dur, rel);
    lp.connect(g);
    g.connect(dest);
    const stop = t + dur + rel * 7 + 0.05;
    for (const m of notes) {
      for (const det of o.detunes || [-8, 8]) {
        const osc = ctx.createOscillator();
        osc.type = o.wave || 'sawtooth';
        osc.frequency.value = mtof(m);
        osc.detune.setValueAtTime(det, t);
        if (o.bend) osc.detune.linearRampToValueAtTime(det + o.bend, t + dur + rel * 3);
        osc.connect(lp);
        osc.start(t);
        osc.stop(stop);
      }
    }
  };

  /**
   * A heavy hinge creaking open: stick-slip, a train of tiny jolts whose rate
   * wanders between about 22 and 75 a second, rung through the door's
   * resonances, with a grinding groan under it.
   */
  P._hupCreak = function (t, dest, dur, peak) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    let f = rnd(24, 30);
    osc.frequency.setValueAtTime(f, t);
    const g = ctx.createGain();
    g.gain.value = 0;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak * 0.4, t + 0.1);
    // The rate and the pressure wander together: it sticks, frees up, sticks again.
    for (let x = 0.1; x < dur - 0.15; x += rnd(0.07, 0.17)) {
      f = clamp(f + rnd(-12, 15), 22, 75);
      osc.frequency.linearRampToValueAtTime(f, t + x);
      g.gain.linearRampToValueAtTime(peak * rnd(0.45, 1), t + x);
    }
    g.gain.linearRampToValueAtTime(0, t + dur);
    for (const [fr, q, lv] of [[260, 7, 1.6], [610, 9, 1.4], [1180, 11, 1.0], [2050, 13, 0.5]]) {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = fr * rnd(0.95, 1.05);
      bp.Q.value = q;
      const bg = ctx.createGain();
      bg.gain.value = lv;
      osc.connect(bp);
      bp.connect(bg);
      bg.connect(g);
    }
    const groan = ctx.createBiquadFilter();
    groan.type = 'lowpass';
    groan.frequency.value = 180;
    groan.Q.value = 0.8;
    const gg = ctx.createGain();
    gg.gain.value = 0.18;
    osc.connect(groan);
    groan.connect(gg);
    gg.connect(g);
    g.connect(dest);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  };

  // ------------------------------------------------------------ one-shots
  /** The shop door's two-tone chime, "ding-dong" (E then C), heard from just inside. */
  P.shopChime = function () {
    if (!this.ready || !this._hupGate('chime', 0.8)) return;
    const t = this.ctx.currentTime + 0.01;
    const bus = this._hupBus(0, 1, { room: 0.35, life: 3 });
    [[76, 0], [72, 0.38]].forEach(([m, d]) => {
      const f = mtof(m);
      const tt = t + d;
      this._hupNoise({ t: tt, dest: bus, type: 'highpass', freq: 5000, q: 0.7, peak: 0.02, attack: 0.001, decay: 0.02 });
      this._hupTone({ t: tt, dest: bus, freq: f, peak: 0.13, attack: 0.002, decay: 1.6 });
      this._hupTone({ t: tt, dest: bus, freq: f * 1.002, wave: 'triangle', peak: 0.04, attack: 0.002, decay: 1.1 });
      this._hupTone({ t: tt, dest: bus, freq: f * 2, peak: 0.032, attack: 0.002, decay: 0.7 });
      this._hupTone({ t: tt, dest: bus, freq: f * 3.01, peak: 0.011, attack: 0.001, decay: 0.25 });
    });
  };

  /** The till: the latch releases with a clunk, the bell goes "ching", the drawer rolls out and hits its stop. */
  P.tillOpen = function (pan = 0, gain = 1) {
    if (!this.ready) return;
    const [pn, g] = args(pan, gain);
    if (g <= 0.001 || !this._hupGate('till', 0.25)) return;
    const t = this.ctx.currentTime + 0.005;
    const bus = this._hupBus(pn, g, { room: 0.25, lowpass: far(g), life: 2.5 });
    // Release: the latch clicks and the spring throws the drawer with a clunk.
    this._hupNoise({ t, dest: bus, type: 'highpass', freq: 3800, q: 0.8, peak: 0.12, attack: 0.0008, decay: 0.012 });
    this._hupNoise({ t: t + 0.012, dest: bus, brown: true, type: 'lowpass', freq: 700, q: 0.8, peak: 0.6, attack: 0.002, decay: 0.07 });
    this._hupTone({ t: t + 0.012, dest: bus, freq: 170, freqEnd: 95, wave: 'triangle', peak: 0.22, attack: 0.002, decay: 0.08 });
    this._hupNoise({ t: t + 0.014, dest: bus, freq: 1500, q: 2.5, peak: 0.14, attack: 0.001, decay: 0.03 });
    // The bell: one bright "ching" from the little hammer.
    this._hupRing(t + 0.03, bus, rnd(2280, 2360), 0.11, [[1, 1, 0.95], [2.32, 0.42, 0.42], [3.88, 0.22, 0.2], [5.4, 0.1, 0.1]], 0.0035);
    // The slide: rollers rumbling out, the coins shifting in their cups.
    this._hupNoise({ t: t + 0.03, dest: bus, freq: 650, freqEnd: 1250, q: 1.6, peak: 0.13, attack: 0.04, hold: 0.12, decay: 0.08 });
    for (let i = 0; i < 5; i++) this._hupTinkle(t + rnd(0.05, 0.27), bus, rnd(3200, 5600), rnd(0.012, 0.024));
    // ...and it hits its stop.
    const s = t + 0.27;
    this._hupNoise({ t: s, dest: bus, brown: true, type: 'lowpass', freq: 900, q: 0.7, peak: 0.5, attack: 0.002, decay: 0.06 });
    this._hupTone({ t: s, dest: bus, freq: 230, freqEnd: 150, wave: 'triangle', peak: 0.14, attack: 0.001, decay: 0.07 });
    this._hupNoise({ t: s + 0.004, dest: bus, freq: 2400, q: 2, peak: 0.08, attack: 0.001, decay: 0.03 });
    for (let i = 0; i < 3; i++) this._hupTinkle(s + rnd(0.01, 0.1), bus, rnd(3600, 6000), rnd(0.01, 0.018));
  };

  /** A handful of notes stuffed into a bag: a crinkly rustle, different every time. */
  P.cashRustle = function (pan = 0, gain = 1) {
    if (!this.ready) return;
    const [pn, g] = args(pan, gain);
    if (g <= 0.001 || !this._hupGate('rustle', 0.09)) return;
    const t = this.ctx.currentTime + 0.005;
    const len = rnd(0.22, 0.42);
    const bus = this._hupBus(pn, g, { room: 0.15, lowpass: far(g), life: len + 1 });
    // The body: a soft, papery hiss that swells and falls.
    this._hupNoise({ t, dest: bus, freq: rnd(2600, 3400), q: 0.6, peak: 0.06, attack: len * 0.3, decay: len * 0.7 });
    // Crinkles: tiny bright crackles, bunched.
    const n = 9 + Math.floor(Math.random() * 8);
    for (let i = 0; i < n; i++) {
      this._hupNoise({ t: t + Math.random() * len, dest: bus, freq: rnd(2200, 7500), q: rnd(1.5, 4), peak: rnd(0.05, 0.13), attack: 0.001, decay: rnd(0.006, 0.025) });
    }
    // The bag taking it: a dull canvas "fump".
    this._hupNoise({ t: t + len * rnd(0.5, 0.8), dest: bus, brown: true, type: 'lowpass', freq: 500, q: 0.7, peak: 0.4, attack: 0.008, decay: 0.07 });
  };

  /** The bag lands on the counter: a fat canvas thud on the laminate, a slap of paper, a coin or two. */
  P.bagThrow = function (pan = 0, gain = 1) {
    if (!this.ready) return;
    const [pn, g] = args(pan, gain);
    if (g <= 0.001 || !this._hupGate('bag', 0.2)) return;
    const t = this.ctx.currentTime + 0.005;
    const bus = this._hupBus(pn, g, { room: 0.3, lowpass: far(g), life: 1.6 });
    this._hupTone({ t, dest: bus, freq: 120, freqEnd: 58, peak: 0.45, attack: 0.002, decay: 0.12 });
    this._hupNoise({ t, dest: bus, brown: true, type: 'lowpass', freq: 800, freqEnd: 260, q: 0.7, peak: 0.42, attack: 0.002, decay: 0.11 });
    // The counter top knocks.
    this._hupNoise({ t, dest: bus, freq: 1100, q: 1.8, peak: 0.16, attack: 0.001, decay: 0.035 });
    this._hupTone({ t, dest: bus, freq: 260, freqEnd: 210, wave: 'triangle', peak: 0.1, attack: 0.001, decay: 0.06 });
    // Paper slaps and settles.
    this._hupNoise({ t: t + 0.006, dest: bus, freq: 3200, q: 0.7, peak: 0.1, attack: 0.002, decay: 0.07 });
    for (let i = 0; i < 6; i++) {
      this._hupNoise({ t: t + rnd(0.02, 0.22), dest: bus, freq: rnd(2500, 6000), q: 2.5, peak: rnd(0.02, 0.05), attack: 0.001, decay: rnd(0.008, 0.02) });
    }
    // Coins in the bottom of the bag.
    this._hupTinkle(t + rnd(0.01, 0.03), bus, rnd(3000, 4200), 0.018);
    if (Math.random() < 0.6) this._hupTinkle(t + rnd(0.06, 0.12), bus, rnd(3400, 5000), 0.012);
  };

  /** Jay grabs the bag (or the cash from the safe): a swipe, a riffle of notes and a bright little payoff. */
  P.bagGrab = function () {
    if (!this.ready || !this._hupGate('grab', 0.2)) return;
    const t = this.ctx.currentTime + 0.005;
    const dest = this.ui;
    this._hupNoise({ t, dest, freq: 700, freqEnd: 2600, q: 0.8, peak: 0.1, attack: 0.05, decay: 0.08 });
    // The notes flicking past a thumb.
    for (let i = 0; i < 7; i++) {
      this._hupNoise({ t: t + 0.05 + i * 0.022 + rnd(0, 0.006), dest, freq: rnd(2800, 5200), q: 2.2, peak: 0.07 * (1 - i / 9), attack: 0.001, decay: 0.012 });
    }
    // The weight of it in the hand.
    this._hupNoise({ t: t + 0.1, dest, brown: true, type: 'lowpass', freq: 600, q: 0.7, peak: 0.6, attack: 0.004, decay: 0.08 });
    this._hupTone({ t: t + 0.1, dest, freq: 140, freqEnd: 70, peak: 0.22, attack: 0.003, decay: 0.1 });
    // The payoff: a quick rising G major with a sparkle on top.
    [[79, 0.13], [83, 0.19], [86, 0.25], [91, 0.31]].forEach(([m, d], i) => {
      this._hupTone({ t: t + d, dest, freq: mtof(m), wave: 'triangle', peak: 0.075, attack: 0.003, decay: 0.32 + i * 0.08 });
      this._hupTone({ t: t + d, dest, freq: mtof(m) * 2, peak: 0.018, attack: 0.002, decay: 0.2 });
    });
    this._hupNoise({ t: t + 0.3, dest, type: 'highpass', freq: 7000, q: 0.4, peak: 0.035, attack: 0.02, decay: 0.45 });
  };

  /** One click of the safe's dial: a crisp detent with a tiny metallic ring and a faint knock from the door. */
  P.safeTick = function (pan = 0, gain = 1) {
    if (!this.ready) return;
    const [pn, g] = args(pan, gain);
    if (g <= 0.001 || !this._hupGate('tick', 0.035)) return;
    const t = this.ctx.currentTime + 0.003;
    const r = rnd(0.95, 1.05);
    const bus = this._hupBus(pn, g, { room: 0.12, lowpass: far(g), life: 0.6 });
    this._hupNoise({ t, dest: bus, type: 'highpass', freq: 4500 * r, q: 0.9, peak: 0.14, attack: 0.0005, decay: 0.008 });
    this._hupNoise({ t, dest: bus, freq: 1700 * r, q: 3, peak: 0.09, attack: 0.0006, decay: 0.014 });
    this._hupTone({ t, dest: bus, freq: 2950 * r, wave: 'triangle', peak: 0.035, attack: 0.0006, decay: 0.03 });
    this._hupTone({ t, dest: bus, freq: 4420 * r, peak: 0.015, attack: 0.0006, decay: 0.02 });
    this._hupTone({ t, dest: bus, freq: 310 * r, freqEnd: 260, wave: 'triangle', peak: 0.035, attack: 0.001, decay: 0.04 });
  };

  /** The safe: the handle ratchets round, the bolts slam back, then the heavy door creaks open to its stop. */
  P.safeOpen = function (pan = 0, gain = 1) {
    if (!this.ready) return;
    const [pn, g] = args(pan, gain);
    if (g <= 0.001 || !this._hupGate('safe', 1)) return;
    const t = this.ctx.currentTime + 0.005;
    const bus = this._hupBus(pn, g, { room: 0.32, lowpass: far(g), life: 3.6 });
    for (let i = 0; i < 3; i++) {
      this._hupNoise({ t: t + i * 0.045, dest: bus, freq: 2600 - i * 200, q: 2.4, peak: 0.09, attack: 0.0008, decay: 0.02 });
    }
    // The bolts: a heavy steel clunk that rings through the box, and a lighter clack as they bottom out.
    const b = t + 0.2;
    this._hupTone({ t: b, dest: bus, freq: 105, freqEnd: 48, peak: 0.5, attack: 0.002, decay: 0.2 });
    this._hupNoise({ t: b, dest: bus, brown: true, type: 'lowpass', freq: 900, freqEnd: 200, q: 0.8, peak: 0.55, attack: 0.002, decay: 0.16 });
    this._hupNoise({ t: b, dest: bus, freq: 1900, q: 1.4, peak: 0.16, attack: 0.001, decay: 0.04 });
    this._hupRing(b, bus, rnd(300, 340), 0.05, [[1, 1, 0.45], [1.71, 0.7, 0.35], [2.63, 0.5, 0.22], [3.94, 0.3, 0.12]], 0.006);
    this._hupNoise({ t: b + 0.07, dest: bus, freq: 1300, q: 2, peak: 0.1, attack: 0.001, decay: 0.03 });
    // The hinges, long and low.
    this._hupCreak(t + 0.5, bus, 1.75, 0.5);
    // The door swings to its stop.
    const s = t + 2.25;
    this._hupNoise({ t: s, dest: bus, brown: true, type: 'lowpass', freq: 500, q: 0.7, peak: 0.4, attack: 0.004, decay: 0.12 });
    this._hupTone({ t: s, dest: bus, freq: 80, freqEnd: 50, peak: 0.25, attack: 0.003, decay: 0.15 });
  };

  /** A CCTV camera shot out: the plastic housing cracks, the lens tinkles down, the wiring fizzes and dies. */
  P.cameraSmash = function (pan = 0, gain = 1) {
    if (!this.ready) return;
    const [pn, g] = args(pan, gain);
    if (g <= 0.001 || !this._hupGate('cam', 0.15)) return;
    const t = this.ctx.currentTime + 0.004;
    const bus = this._hupBus(pn, g, { room: 0.3, lowpass: far(g), life: 2.2 });
    // Plastic cracking apart, then bits of casing clattering down.
    this._hupNoise({ t, dest: bus, type: 'highpass', freq: 2500, q: 0.7, peak: 0.3, attack: 0.0006, decay: 0.03 });
    this._hupNoise({ t, dest: bus, freq: 1400, q: 1.6, peak: 0.3, attack: 0.0008, decay: 0.06 });
    this._hupTone({ t, dest: bus, freq: 720, freqEnd: 430, wave: 'triangle', peak: 0.12, attack: 0.001, decay: 0.05 });
    this._hupNoise({ t: t + 0.03, dest: bus, freq: 1900, q: 2.5, peak: 0.13, attack: 0.001, decay: 0.03 });
    for (let i = 0; i < 4; i++) {
      this._hupNoise({ t: t + rnd(0.18, 0.5), dest: bus, freq: rnd(1100, 2200), q: 3, peak: rnd(0.04, 0.08), attack: 0.001, decay: rnd(0.02, 0.04) });
    }
    // The lens.
    this._hupNoise({ t: t + 0.004, dest: bus, type: 'highpass', freq: 6000, q: 0.6, peak: 0.1, attack: 0.001, decay: 0.12 });
    for (let i = 0; i < 9; i++) this._hupTinkle(t + 0.01 + Math.pow(Math.random(), 1.5) * 0.45, bus, rnd(3000, 7800), rnd(0.012, 0.035));
    // The wiring: a zap, a crackling fizz, a dying mains buzz and a couple of last sputters.
    const crackle = kit ? kit.assets(this).crackle : null;
    this._hupTone({ t: t + 0.01, dest: bus, freq: 3200, freqEnd: 700, wave: 'square', peak: 0.03, attack: 0.001, decay: 0.09, lowpass: 5000 });
    if (crackle) {
      this._hupNoise({ t: t + 0.02, dest: bus, buffer: crackle, rate: 1.8, type: 'highpass', freq: 1800, q: 0.7, peak: 0.7, attack: 0.01, hold: 0.25, decay: 0.55 });
    } else {
      this._hupNoise({ t: t + 0.02, dest: bus, type: 'highpass', freq: 2500, q: 0.7, peak: 0.05, attack: 0.01, hold: 0.2, decay: 0.5 });
    }
    this._hupTone({ t: t + 0.02, dest: bus, freq: 100, wave: 'sawtooth', peak: 0.05, attack: 0.005, hold: 0.15, decay: 0.6, lowpass: 900 });
    for (let i = 0; i < 3; i++) {
      const tt = t + rnd(0.25, 0.85);
      this._hupNoise({ t: tt, dest: bus, type: 'highpass', freq: rnd(2500, 4000), q: 0.7, peak: rnd(0.06, 0.12), attack: 0.001, decay: rnd(0.01, 0.03) });
      this._hupTone({ t: tt, dest: bus, freq: 100, wave: 'sawtooth', peak: 0.03, attack: 0.002, decay: 0.05, lowpass: 1200 });
    }
  };

  // --------------------------------------------------------------- stings
  // Short hits in the style of audio-drive.js's stings (t = start, dest = bus).
  const STINGS = {
    /** It's on: a low hit under a punchy brass "da-DAM", then a clock ticking away. */
    start(t, dest) {
      const brass = { level: 0.05, cut: 2800, cutEnd: 800, detunes: [-9, 0, 9], release: 0.08 };
      this._hupStab(t, dest, [38, 50, 53, 57], 0.09, brass);
      this._hupStab(t + 0.16, dest, [38, 50, 53, 58, 62], 0.55, Object.assign({}, brass, { level: 0.055, cutEnd: 500, close: 0.4, release: 0.22 }));
      this._hupBoom(t + 0.16, dest, 0.5);
      for (let i = 0; i < 10; i++) {
        this._hupNoise({ t: t + 0.34 + i * 0.072, dest, type: 'highpass', freq: 7500, q: 0.6, peak: 0.055 * (1 - i / 11), attack: 0.001, decay: i % 2 ? 0.02 : 0.035 });
      }
      this._hupNoise({ t: t + 0.16, dest, type: 'highpass', freq: 5000, q: 0.5, peak: 0.05, attack: 0.004, decay: 0.9 });
    },
    /** Something's wrong: a quick swell into a clashing stab and a shrill stutter on top. */
    tell(t, dest) {
      this._hupNoise({ t, dest, freq: 500, freqEnd: 4200, sweep: 0.18, q: 1.4, peak: 0.11, attack: 0.17, decay: 0.05 });
      const h = t + 0.18;
      this._hupStab(h, dest, [50, 62, 63, 69, 70], 0.16, { level: 0.045, cut0: 1500, cut: 4200, cutEnd: 900, detunes: [-10, 10], release: 0.22, bend: -70 });
      this._hupBoom(h, dest, 0.4);
      for (let i = 0; i < 3; i++) {
        this._hupStab(h + 0.04 + i * 0.11, dest, [88, 89], 0.05, { level: 0.022, cut0: 3000, cut: 6000, cutEnd: 3000, detunes: [-6, 6], release: 0.04 });
      }
    },
    /** The bag's on the counter: a cool little minor lift that settles on an open chord. */
    done(t, dest) {
      const pad = { level: 0.032, cut0: 900, cut: 3000, cutEnd: 1300, detunes: [-9, 9], release: 0.1 };
      this._hupStab(t, dest, [50, 57, 62, 65], 0.2, pad);
      this._hupStab(t + 0.24, dest, [48, 55, 60, 64], 0.2, pad);
      this._hupStab(t + 0.48, dest, [50, 57, 62, 64, 69], 0.75, Object.assign({}, pad, { level: 0.036, cutEnd: 900, close: 0.5, sustain: 0.8, release: 0.2 }));
      const bass = { level: 0.08, cut: 900, cutEnd: 300, detunes: [0] };
      this._hupStab(t, dest, [38], 0.2, bass);
      this._hupStab(t + 0.24, dest, [36], 0.2, bass);
      this._hupStab(t + 0.48, dest, [38], 0.7, Object.assign({}, bass, { release: 0.18 }));
      [[0, 140], [0.24, 140], [0.48, 160]].forEach(([d, f]) => this._hupTone({ t: t + d, dest, freq: f, freqEnd: 45, peak: 0.3, decay: 0.2 }));
      [81, 86].forEach((m, i) => this._hupTone({ t: t + 0.52 + i * 0.09, dest, freq: mtof(m), wave: 'triangle', peak: 0.035, decay: 0.6 }));
    },
    /** A clean job: a bright B-flat major 9 run over a warm pad, with a shimmer. */
    clean(t, dest) {
      [70, 74, 77, 81, 84].forEach((m, i) => {
        this._hupStab(t + i * 0.07, dest, [m], 0.12, { level: 0.07, cut0: 1500, cut: 4200, cutEnd: 1600, detunes: [-6, 6], release: 0.14 });
      });
      this._hupStab(t, dest, [46, 58, 62, 65, 69], 0.95, { level: 0.028, cut0: 600, cut: 2400, bloom: 0.3, cutEnd: 1000, attack: 0.1, sustain: 0.85, release: 0.24, detunes: [-10, 10] });
      this._hupBoom(t, dest, 0.3);
      this._hupNoise({ t, dest, type: 'highpass', freq: 6500, q: 0.5, peak: 0.05, attack: 0.4, decay: 0.8 });
      [94, 98].forEach((m, i) => this._hupTone({ t: t + 0.4 + i * 0.08, dest, freq: mtof(m), peak: 0.025, decay: 0.8 }));
    },
  };

  /** A short musical hit for the hold-up: 'start' | 'tell' | 'done' | 'clean' (anything else is ignored). */
  P.holdupSting = function (kind) {
    if (!this.ready) return;
    const k = typeof kind === 'string' ? kind.toLowerCase() : '';
    if (!Object.prototype.hasOwnProperty.call(STINGS, k) || !this._hupGate('sting-' + k, 0.3)) return;
    STINGS[k].call(this, this.ctx.currentTime + 0.01, this.ui);
  };

  // --------------------------------------------------------------- voices
  const SILENT_VOICE = Object.freeze({ update() {}, stop() {}, duck() {}, awake: false });

  /** Let a voice die away (time constant tc), then free its nodes. */
  function fadeOut(v, tc) {
    const n = v.n;
    const ctx = v.engine && v.engine.ctx;
    if (!n || !n.out || !ctx) {
      v._sleep(0);
      return;
    }
    const t = ctx.currentTime;
    const g = n.out.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.setTargetAtTime(0, t, tc);
    setTimeout(() => v._sleep(0), tc * 7000 + 50);
  }

  // The alarm bell: an electromagnet hammers a steel gong about 17 times a
  // second. One loop of strikes is rendered per context through a bank of
  // resonators (the gong's modes), then played on repeat by each bell.
  const BELL_RATE = 17.5; // strikes a second
  const BELL_STRIKES = 35; // strikes in one loop (2 s)
  // The gong's modes: [Hz, level, decay seconds, twin level]. The strongest
  // have a slightly detuned twin (no gong is perfectly round), so the ring
  // shimmers. The decays are short next to a real gong's because the hammer
  // keeps choking it: that is what makes the "trrrr".
  const BELL_MODES = [
    [742, 0.5, 0.24, 0.4], [1488, 0.35, 0.18, 0.4], [1917, 1, 0.2, 0.4], [2731, 0.6, 0.13, 0.35],
    [3478, 0.45, 0.1, 0], [4620, 0.32, 0.075, 0], [5815, 0.2, 0.05, 0], [7260, 0.12, 0.04, 0],
  ];
  const BELL_CHOKE = 0.5; // how much ring is left after the hammer lands

  function bellBuffer(e) {
    const a = assets(e);
    if (a.bell) return a.bell;
    const ctx = e.ctx;
    const sr = ctx.sampleRate;
    const period = sr / BELL_RATE;
    const loop = Math.round(period * BELL_STRIKES);
    // The end of the loop before is rung first, so the seam is already steady
    // (with the hammer choking it, nothing older than that can still be heard).
    const warm = Math.round(sr * 0.6);
    const total = warm + loop;
    // The strike pattern (the same in every loop): force and timing wander a little.
    const hits = [];
    for (let i = 0; i < BELL_STRIKES; i++) hits.push([i ? Math.round((i + rnd(-0.03, 0.03)) * period) : 0, rnd(0.78, 1)]);
    const width = Math.max(2, Math.round(sr * 0.00015)); // the hammer's contact
    const exc = new Float32Array(total);
    const choke = new Uint8Array(total);
    for (const base of [warm - loop, warm]) {
      for (const [at, amp] of hits) {
        const i0 = base + at;
        if (i0 < 0) continue;
        choke[i0] = 1;
        for (let j = 0; j < width; j++) exc[i0 + j] += amp * Math.sin((Math.PI * (j + 0.5)) / width);
      }
    }
    const buf = ctx.createBuffer(1, loop, sr);
    const d = buf.getChannelData(0);
    // One two-pole resonator per mode (and twin): y = a1·y1 + a2·y2 + g·x
    // rings at the mode's pitch and dies away; each strike chokes it first.
    for (const [f, lv, dc, twin] of BELL_MODES) {
      for (const [df, k] of twin ? [[1, 1], [1.0042, twin]] : [[1, 1]]) {
        const w = (2 * Math.PI * f * df) / sr;
        const r = Math.exp(-1 / (dc * (k < 1 ? 0.8 : 1) * sr));
        const a1 = 2 * r * Math.cos(w);
        const a2 = -r * r;
        const g = lv * k * Math.sin(w);
        let y1 = 0;
        let y2 = 0;
        for (let i = 0; i < total; i++) {
          if (choke[i]) {
            y1 *= BELL_CHOKE;
            y2 *= BELL_CHOKE;
          }
          const y = a1 * y1 + a2 * y2 + g * exc[i];
          y2 = y1;
          y1 = y;
          if (i >= warm) d[i - warm] += y;
        }
      }
    }
    // Each strike's own rattle: the clapper's clack and the armature's knock.
    for (const [at, amp] of hits) {
      let lp = 0;
      const n = Math.min(loop - at, Math.round(sr * 0.012));
      for (let j = 0; j < n; j++) {
        const x = j / sr;
        lp += 0.6 * (Math.random() * 2 - 1 - lp);
        d[at + j] += amp * (0.8 * (Math.random() * 2 - 1 - lp) * Math.exp(-x / 0.0012) + 0.5 * Math.sin(2 * Math.PI * 210 * x) * Math.exp(-x / 0.005));
      }
    }
    let peak = 0;
    for (let i = 0; i < loop; i++) peak = Math.max(peak, Math.abs(d[i]));
    for (let i = 0; i < loop; i++) d[i] *= 0.9 / (peak || 1);
    a.bell = buf;
    return buf;
  }

  /**
   * The shop's alarm bell, out on the front wall. p = { gain, pan, muffle }
   * (muffle 0..1: heard through a wall). Loud near the shop, but its own
   * peak is held under a soft clip, so it never runs away with the mix.
   */
  class AlarmBellVoice extends (kit ? kit.Voice : Object) {
    _level(p) {
      return clamp(fin(p.gain, 0), 0, 1.2);
    }

    _build(ctx, n, e) {
      const src = this._loop(ctx, bellBuffer(e));
      const hp = this._filter(ctx, 'highpass', 320, 0.7);
      const pk = this._filter(ctx, 'peaking', 2100, 1.1);
      pk.gain.value = 3;
      const drive = this._gain(ctx, 1.4);
      const sh = this._node(ctx.createWaveShaper());
      sh.curve = kit.curve(e, 1.8);
      n.lp = this._filter(ctx, 'lowpass', 16000, 0.6);
      src.connect(hp);
      hp.connect(pk);
      pk.connect(drive);
      drive.connect(sh);
      sh.connect(n.lp);
      n.lp.connect(n.out);
      // The street gives it back (the room reverb if audio-weapons.js is missing).
      if (typeof e._wFx === 'function') {
        const fx = e._wFx();
        for (const [key, lvl] of [['verb', 0.22], ['echo', 0.1], ['echo2', 0.05]]) {
          const s = this._gain(ctx, lvl);
          n.out.connect(s);
          s.connect(fx[key]);
        }
      } else {
        const s = this._gain(ctx, 0.3);
        n.out.connect(s);
        s.connect(e._hupRoom());
      }
    }

    _apply(p, t, gain) {
      // Far away, or through a wall, the top end goes first.
      const muffle = clamp(fin(p.muffle, 0), 0, 1);
      const lp = Math.min(16000, 2600 + 14000 * Math.min(1, gain * 1.6)) * (1 - 0.75 * muffle);
      this._to(this.n.lp.frequency, 'lp', Math.max(400, lp), t, 0.08, true);
      // It eases back a little while someone is talking, so the lines still carry.
      const g = VH.game;
      const talk = !!(g && g.dialogue && g.dialogue.active);
      this._mix(p, t, gain * 0.45 * (talk ? 0.65 : 1));
    }

    /** Cut the power: the gong rings on for a moment. */
    stop() {
      if (this.stopped) return;
      this.stopped = true;
      fadeOut(this, 0.1);
    }
  }

  // The tension bed: 104 bpm in A minor. Its rhythm lives in four control
  // loops, two bars long and started together, so everything stays locked.
  const T_BPM = 104;

  /** Stamp a note's envelope (attack, exponential decay, faded to zero by the end of `room`) into a control buffer. */
  function stamp(d, sr, at, amp, attack, decay, room) {
    const i0 = Math.round(at * sr);
    const n = Math.min(d.length - i0, Math.round(room * sr));
    const fade = sr * 0.003;
    for (let j = 0; j < n; j++) {
      const x = j / sr;
      const v = x < attack ? x / attack : Math.exp(-(x - attack) / decay);
      d[i0 + j] = Math.max(d[i0 + j], amp * v * Math.min(1, (n - j) / fade));
    }
  }

  function tensionLoops(e) {
    const a = assets(e);
    if (a.tension) return a.tension;
    const ctx = e.ctx;
    // Envelopes need no more detail than this; the sources resample them.
    const sr = 8000;
    const beat = 60 / T_BPM;
    const len = Math.round(sr * beat * 8);
    const make = () => ctx.createBuffer(1, len, sr);
    const L = { pulse: make(), heart: make(), tick: make(), pitch: make() };
    // Bass: straight eighths, leaning on the beat.
    const pulse = L.pulse.getChannelData(0);
    const ACC = [1, 0.5, 0.72, 0.5, 0.9, 0.5, 0.72, 0.62];
    for (let i = 0; i < 16; i++) stamp(pulse, sr, (i * beat) / 2, ACC[i % 8], 0.004, 0.085, beat / 2);
    // A racing heart: lub-dub on every beat.
    const heart = L.heart.getChannelData(0);
    for (let i = 0; i < 8; i++) {
      stamp(heart, sr, i * beat, 1, 0.006, 0.07, 0.17);
      stamp(heart, sr, i * beat + 0.17, 0.6, 0.006, 0.06, 0.25);
    }
    // A clock that won't stop: sixteenths, the off-beats louder.
    const tick = L.tick.getChannelData(0);
    for (let i = 0; i < 32; i++) stamp(tick, sr, (i * beat) / 4, i % 2 ? 1 : 0.45, 0.001, 0.012, beat / 4);
    // The bass line (cents): A all the way, nudging up to B flat for the last two eighths.
    const pitch = L.pitch.getChannelData(0);
    const flat = Math.round((len * 14) / 16);
    for (let i = flat; i < len; i++) pitch[i] = 100;
    a.tension = L;
    return L;
  }

  /**
   * A quiet, low tension bed under the hold-up. p = { level 0..1, gain }:
   * the level brings in the heartbeat, then the ticking clock, then a
   * clashing pad, and opens the bass up. Ducks under dialogue by itself;
   * duck(0..1) ducks it by hand as well.
   */
  class TensionVoice extends (kit ? kit.Voice : Object) {
    constructor(engine) {
      super(engine);
      this._duck = 0;
      this._lvl = 0;
      this._gn = 1;
    }

    update(p) {
      if (p && typeof p === 'object') {
        this._lvl = p.level;
        this._gn = p.gain;
      }
      super.update(p);
    }

    duck(level) {
      this._duck = clamp(fin(level, 0), 0, 1);
      if (this.n) super.update({ level: this._lvl, gain: this._gn });
    }

    _level(p) {
      return clamp(fin(p.level, 0), 0, 1) * clamp(fin(p.gain, 1), 0, 1.5);
    }

    _build(ctx, n, e) {
      // Music, not effects: off the sfx bus and onto the music bus.
      const head = n.pan || n.out;
      head.disconnect();
      head.connect(e.musicBus || e.sfx);
      const L = tensionLoops(e);
      const loop = (buf) => {
        const s = this._src(ctx.createBufferSource(), 0);
        s.buffer = buf;
        s.loop = true;
        return s;
      };
      const pulse = loop(L.pulse);
      const heart = loop(L.heart);
      const tick = loop(L.tick);
      const pitch = loop(L.pitch);
      // Bass: two detuned saws and a sine on A1, plucked by the pulse through a resonant lowpass.
      n.bassLp = this._filter(ctx, 'lowpass', 300, 5);
      const amp = this._gain(ctx, 0);
      for (const [type, det, lvl] of [['sawtooth', -7, 0.5], ['sawtooth', 7, 0.5], ['sine', 0, 0.7]]) {
        const o = this._osc(ctx, type, 55);
        o.detune.value = det;
        pitch.connect(o.detune);
        const g = this._gain(ctx, lvl);
        o.connect(g);
        g.connect(n.bassLp);
      }
      n.bassLp.connect(amp);
      pulse.connect(amp.gain);
      n.envF = this._gain(ctx, 500);
      pulse.connect(n.envF);
      n.envF.connect(n.bassLp.frequency);
      n.bass = this._gain(ctx, 0);
      amp.connect(n.bass);
      n.bass.connect(n.out);
      // Heartbeat: a sub thump that drops in pitch as it dies.
      const hb = this._osc(ctx, 'sine', 42);
      const hbF = this._gain(ctx, 38);
      heart.connect(hbF);
      hbF.connect(hb.frequency);
      const hbAmp = this._gain(ctx, 0);
      heart.connect(hbAmp.gain);
      hb.connect(hbAmp);
      n.heart = this._gain(ctx, 0);
      hbAmp.connect(n.heart);
      n.heart.connect(n.out);
      // The clock: dry, high clicks.
      const nz = this._loop(ctx, e.white);
      const tbp = this._filter(ctx, 'bandpass', 5200, 2.2);
      const tAmp = this._gain(ctx, 0);
      tick.connect(tAmp.gain);
      nz.connect(tbp);
      tbp.connect(tAmp);
      n.tick = this._gain(ctx, 0);
      tAmp.connect(n.tick);
      n.tick.connect(n.out);
      // A clashing pad (A, B flat and E) for when it gets hairy, with a slow shiver.
      n.padLp = this._filter(ctx, 'lowpass', 700, 0.8);
      for (const [f, det] of [[220, -6], [233.08, 6], [329.63, 0]]) {
        const o = this._osc(ctx, 'sawtooth', f);
        o.detune.value = det;
        o.connect(n.padLp);
      }
      const trem = this._gain(ctx, 1);
      const shiver = this._loop(ctx, kit.assets(e).wobble, 1.3);
      const depth = this._gain(ctx, 0.35);
      shiver.connect(depth);
      depth.connect(trem.gain);
      n.pad = this._gain(ctx, 0);
      n.padLp.connect(trem);
      trem.connect(n.pad);
      n.pad.connect(n.out);
    }

    _apply(p, t) {
      const n = this.n;
      const k = clamp(fin(p.level, 0), 0, 1);
      this._to(n.bassLp.frequency, 'lp', 140 + 650 * k, t, 0.3);
      this._to(n.envF.gain, 'ef', 250 + 900 * k, t, 0.3);
      this._to(n.bass.gain, 'b', 0.55 + 0.45 * k, t, 0.3);
      this._to(n.heart.gain, 'h', smooth(0.15, 0.55, k) * 0.9, t, 0.3);
      this._to(n.tick.gain, 'k', smooth(0.4, 0.85, k) * 0.35, t, 0.3);
      this._to(n.pad.gain, 'p', smooth(0.55, 1, k) * 0.05, t, 0.6);
      this._to(n.padLp.frequency, 'pl', 500 + 900 * k, t, 0.6);
      // Quiet, and quieter still while anyone is talking (as the radio ducks).
      const g = VH.game;
      const talk = !!(g && g.dialogue && g.dialogue.active);
      const duck = Math.max(this._duck, talk ? 0.65 : 0);
      const vol = clamp(fin(p.gain, 1), 0, 1.5) * 0.26 * smooth(0, 0.15, k) * (0.55 + 0.45 * k) * (1 - 0.8 * duck);
      this._to(n.out.gain, 'out', vol, t, 0.12);
    }

    /** Fade out over about a second. */
    stop() {
      if (this.stopped) return;
      this.stopped = true;
      fadeOut(this, 0.22);
    }
  }

  P.alarmBell = function () {
    return kit ? new AlarmBellVoice(this) : SILENT_VOICE;
  };

  P.holdupTension = function () {
    return kit ? new TensionVoice(this) : SILENT_VOICE;
  };
})();
