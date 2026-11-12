/*
 * carnival-audio.js — Wonder Wharf's sounds (VH.CarnivalAudio, owned by
 * game.carnival as carnival.audio). Everything is made on the fly on the
 * game's audio engine (audio.js): no sound files.
 *
 *   fair(k, dt, pos, session)  every frame Jay is near: k is how close he is to the fair (0..1).
 *                              Crowd hum, the band organ (loudest by the carousel), the dodgems'
 *                              beat by the arena and a rumble when the Riptide's train goes by.
 *   ride(speed, wind, o)       a ride's own sound while Jay is on it: track roar and rush of wind
 *                              (0..1 each); o.clank: the lift-hill chain. rideStop() silences it.
 *   one-shots: klaxon, bump, ding, clank, whoosh, cheer, buzz, win, lose, tick, nope, spark,
 *   scream, bell, pop, splash, thud — each takes { gain, pan } (all optional).
 */
(function () {
  'use strict';

  const VH = window.VH;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const NOTE = (n) => 261.63 * Math.pow(2, n / 12); // semitones from middle C

  // The band organ's waltz (original): [semitone, beats] pairs, bars of three beats.
  const TUNE = [
    [7, 1], [12, 1], [11, 1], [9, 2], [7, 1], [5, 1], [4, 1], [5, 1], [7, 3],
    [9, 1], [12, 1], [11, 1], [9, 2], [7, 1], [5, 2], [2, 1], [7, 3],
    [7, 1], [12, 1], [14, 1], [16, 2], [14, 1], [12, 1], [11, 1], [9, 1], [7, 3],
    [5, 1], [9, 1], [7, 1], [5, 1], [4, 1], [2, 1], [0, 3], [-1, 1], [2, 1], [0, 1],
  ];
  const CHORDS = [[0, 4, 7], [0, 4, 7], [-3, 0, 5], [-3, 0, 5], [-5, -1, 2], [-5, -1, 2], [0, 4, 7], [-5, -1, 2]];
  const BEAT = 0.36; // seconds a beat (a bright waltz)

  // Spots the music and noise come from (x, z): the band organ in the carousel, the dodgems.
  const ORGAN = { x: 935, z: -20 };
  const DODGEMS = { x: 851, z: 144 };

  class CarnivalAudio {
    constructor(game) {
      this.game = game;
      this.a = game.audio;
      this.on = false;
      this._organ = 0;
      this._beat = 0;
      this._timer = null;
      this._next = 0;
      this._step = 0;
      this._noteI = 0;
      this._noteLeft = 0;
      this._chordBeat = 0;
      this._clankT = 0;
    }

    get ready() {
      return !!(this.a && this.a.ready && this.a.ctx);
    }

    _init() {
      if (this.on || !this.ready) return this.on;
      const a = this.a;
      const ctx = a.ctx;
      this.hum = a._loop(a.brown, 'lowpass', 520, 0.5); //    the crowd
      this.chatter = a._loop(a.white, 'bandpass', 1400, 2.5); // voices, far off
      this.roar = a._loop(a.brown, 'lowpass', 260, 0.8); //   a train going by, or under Jay
      this.rush = a._loop(a.white, 'bandpass', 900, 0.6); //   wind on a ride
      this.organGain = ctx.createGain();
      this.organGain.gain.value = 0;
      this.organGain.connect(a.musicBus);
      this.beatGain = ctx.createGain();
      this.beatGain.gain.value = 0;
      this.beatGain.connect(a.musicBus);
      this._rideK = 0;
      this._windK = 0;
      this.on = true;
      return true;
    }

    // ------------------------------------------------------------ the fair
    fair(k, dt, pos, session) {
      if (!k) {
        if (this.on) this._quiet();
        return;
      }
      if (!this._init()) return;
      const a = this.a;
      const t = a.ctx.currentTime;
      const g = this.game;
      const playing = g.state === 'playing' || g.state === 'dialog';
      if (!playing) k = 0;
      const life = g.districtSystems && g.districtSystems.neonstrand;
      const dOrgan = pos ? Math.hypot(pos.x - ORGAN.x, pos.z - ORGAN.z) : 999;
      const dDodge = pos ? Math.hypot(pos.x - DODGEMS.x, pos.z - DODGEMS.z) : 999;
      const high = pos ? clamp((pos.y - 6) / 30, 0, 1) : 0; // up on a ride the fair goes quiet below
      const near = k * (1 - 0.6 * high);
      this.hum.gain.gain.setTargetAtTime(0.16 * near, t, 0.5);
      this.chatter.gain.gain.setTargetAtTime(0.025 * near * (0.7 + 0.3 * Math.sin(t * 0.7)), t, 0.4);
      // The band organ: loud by the carousel, a tune on the breeze across the fair.
      this._organ = near * clamp(1.15 - dOrgan / 120, 0.18, 1);
      this.organGain.gain.setTargetAtTime(this._organ * 0.55, t, 0.4);
      this._beat = near * clamp(1 - dDodge / 45, 0, 1);
      this.beatGain.gain.setTargetAtTime(this._beat * 0.5, t, 0.3);
      if (this._organ > 0.02 || this._beat > 0.02) this._startMusic();
      else this._stopMusic();
      // The Riptide's train thunders past.
      let train = 0;
      if (life && life.trainPos && pos && !(session && session.id === 'riptide')) {
        const tp = life.trainPos;
        const d = Math.hypot(tp.x - pos.x, tp.y - pos.y, tp.z - pos.z);
        train = clamp(1 - d / 70, 0, 1) * clamp(life.v / 18, 0, 1);
      }
      if (!session || !this._rideK) this.roar.gain.gain.setTargetAtTime(0.32 * train * k, t, 0.25);
      if (!session) this.rush.gain.gain.setTargetAtTime(0, t, 0.3);
    }

    _quiet() {
      const t = this.a.ctx.currentTime;
      for (const L of [this.hum, this.chatter, this.roar, this.rush]) L.gain.gain.setTargetAtTime(0, t, 0.3);
      this.organGain.gain.setTargetAtTime(0, t, 0.3);
      this.beatGain.gain.setTargetAtTime(0, t, 0.3);
      this._stopMusic();
    }

    _startMusic() {
      if (this._timer) return;
      this._next = this.a.ctx.currentTime + 0.1;
      this._timer = setInterval(() => this._schedule(), 30);
    }

    _stopMusic() {
      if (!this._timer) return;
      clearInterval(this._timer);
      this._timer = null;
    }

    /** Queue the next half-beats of the waltz and the dodgems' beat a little ahead. */
    _schedule() {
      const a = this.a;
      if (!a.ctx || a.ctx.state !== 'running') return;
      const ahead = a.ctx.currentTime + 0.2;
      while (this._next < ahead) {
        const t = this._next;
        const s = this._step;
        const half = s % 2 === 0;
        if (this._organ > 0.02) {
          // The melody: piping flute and a reedy octave.
          if (half) {
            if (this._noteLeft <= 0) {
              const [n, beats] = TUNE[this._noteI];
              this._noteI = (this._noteI + 1) % TUNE.length;
              this._noteLeft = beats;
              const dur = beats * BEAT * 0.92;
              a._tone({ t, freq: NOTE(n + 12), wave: 'triangle', peak: 0.12, attack: 0.01, decay: dur, bus: this.organGain });
              a._tone({ t, freq: NOTE(n), wave: 'square', peak: 0.025, attack: 0.01, decay: dur * 0.8, lowpass: 1800, bus: this.organGain });
            }
            this._noteLeft--;
            // Oom-pah-pah: the bass on the first beat of the bar, the chord on two and three.
            const beat = (s / 2) % 3;
            const ch = CHORDS[Math.floor(s / 6) % CHORDS.length];
            if (beat === 0) a._tone({ t, freq: NOTE(ch[0] - 24), wave: 'triangle', peak: 0.16, decay: BEAT * 0.8, bus: this.organGain });
            else for (const c of ch) a._tone({ t, freq: NOTE(c), wave: 'square', peak: 0.018, decay: BEAT * 0.4, lowpass: 1400, bus: this.organGain });
            if (beat === 0) a._hit({ t, freq: 5200, q: 2, peak: 0.03, decay: 0.05, bus: this.organGain }); // the glockenspiel's tick
          }
        }
        if (this._beat > 0.02) {
          // The dodgems: a thumping four to the floor with an offbeat hat.
          if (half) a._tone({ t, freq: 110, freqEnd: 45, wave: 'sine', peak: 0.5, decay: 0.16, bus: this.beatGain });
          else a._hit({ t, freq: 8000, type: 'highpass', peak: 0.06, decay: 0.04, bus: this.beatGain });
          if (s % 8 === 4) a._hit({ t, freq: 1800, q: 0.8, peak: 0.12, decay: 0.12, bus: this.beatGain });
        }
        this._step++;
        this._next += BEAT / 2;
      }
    }

    // --------------------------------------------------------- a ride's own
    /** speed: track roar 0..1, wind 0..1; o.clank: a lift chain tick rate (per second). */
    ride(speed, wind, o) {
      if (!this._init()) return;
      const a = this.a;
      const t = a.ctx.currentTime;
      this._rideK = speed;
      this._windK = wind;
      this.roar.gain.gain.setTargetAtTime(0.42 * speed, t, 0.15);
      this.roar.filter.frequency.setTargetAtTime(160 + speed * 420, t, 0.2);
      this.rush.gain.gain.setTargetAtTime(0.3 * wind, t, 0.15);
      this.rush.filter.frequency.setTargetAtTime(500 + wind * 1500, t, 0.2);
      if (o && o.clank) {
        this._clankT -= o.dt || 1 / 60;
        if (this._clankT <= 0) {
          this._clankT = 1 / o.clank;
          this.clank({ gain: 0.6 });
        }
      }
    }

    rideStop() {
      if (!this.on) return;
      const t = this.a.ctx.currentTime;
      this._rideK = this._windK = 0;
      this.roar.gain.gain.setTargetAtTime(0, t, 0.3);
      this.rush.gain.gain.setTargetAtTime(0, t, 0.3);
    }

    // ------------------------------------------------------------- one-shots
    _ok() {
      return this.ready;
    }

    klaxon(o) {
      if (!this._ok()) return;
      const a = this.a, t = a.ctx.currentTime, k = (o && o.gain) || 1;
      for (let i = 0; i < 3; i++) a._tone({ t: t + i * 0.32, freq: 440, freqEnd: 330, wave: 'sawtooth', peak: 0.12 * k, decay: 0.26, lowpass: 1600 });
    }

    bump(o) {
      if (!this._ok()) return;
      const a = this.a, t = a.ctx.currentTime, k = (o && o.gain) || 1;
      a._hit({ t, brown: true, type: 'lowpass', freq: 600, peak: 0.6 * k, decay: 0.12, pan: o && o.pan });
      a._tone({ t, freq: 140, freqEnd: 70, wave: 'sine', peak: 0.35 * k, decay: 0.14, pan: o && o.pan });
      a._hit({ t: t + 0.01, freq: 2500, q: 3, peak: 0.08 * k, decay: 0.06, pan: o && o.pan }); // the rubber squeak
    }

    spark(o) {
      if (!this._ok()) return;
      const a = this.a, t = a.ctx.currentTime, k = (o && o.gain) || 1;
      a._hit({ t, freq: 6000, type: 'highpass', peak: 0.12 * k, decay: 0.09 });
    }

    ding(o) {
      if (!this._ok()) return;
      const a = this.a, t = a.ctx.currentTime, k = (o && o.gain) || 1;
      a._tone({ t, freq: 1318, wave: 'sine', peak: 0.2 * k, decay: 0.5, bus: a.ui });
      a._tone({ t: t + 0.09, freq: 1760, wave: 'sine', peak: 0.16 * k, decay: 0.6, bus: a.ui });
    }

    bell(o) {
      if (!this._ok()) return;
      const a = this.a, t = a.ctx.currentTime, k = (o && o.gain) || 1;
      for (const [f, p] of [[880, 0.3], [1320, 0.16], [2210, 0.08]]) a._tone({ t, freq: f, wave: 'sine', peak: p * k, decay: 1.6 });
    }

    clank(o) {
      if (!this._ok()) return;
      const a = this.a, t = a.ctx.currentTime, k = (o && o.gain) || 1;
      a._hit({ t, freq: 1900, q: 6, peak: 0.16 * k, decay: 0.05 });
      a._hit({ t: t + 0.02, freq: 700, q: 4, peak: 0.1 * k, decay: 0.07 });
    }

    whoosh(o) {
      if (!this._ok()) return;
      const a = this.a, t = a.ctx.currentTime, k = (o && o.gain) || 1;
      a._hit({ t, freq: 400, freqEnd: 2200, q: 0.8, attack: 0.15, peak: 0.3 * k, decay: 0.6 });
    }

    cheer(o) {
      if (!this._ok()) return;
      const a = this.a, t = a.ctx.currentTime, k = (o && o.gain) || 1;
      for (let i = 0; i < 5; i++) a._hit({ t: t + i * 0.05, freq: 900 + i * 260, q: 3, attack: 0.08, peak: 0.07 * k, decay: 0.9 });
    }

    scream(o) {
      if (!this._ok()) return;
      const a = this.a, t = a.ctx.currentTime, k = (o && o.gain) || 1;
      for (let i = 0; i < 4; i++) a._tone({ t: t + i * 0.07, freq: 820 + i * 140, freqEnd: 600 + i * 90, wave: 'sawtooth', attack: 0.08, peak: 0.025 * k, decay: 1.1, lowpass: 2600 });
    }

    buzz(o) {
      if (!this._ok()) return;
      const a = this.a, t = a.ctx.currentTime, k = (o && o.gain) || 1;
      a._tone({ t, freq: 110, wave: 'square', peak: 0.12 * k, decay: 0.35, lowpass: 900 });
    }

    win(o) {
      if (!this._ok()) return;
      const a = this.a, t = a.ctx.currentTime, k = (o && o.gain) || 1;
      [0, 4, 7, 12].forEach((n, i) => a._tone({ t: t + i * 0.09, freq: NOTE(n + 12), wave: 'triangle', peak: 0.16 * k, decay: 0.3, bus: a.ui }));
    }

    lose(o) {
      if (!this._ok()) return;
      const a = this.a, t = a.ctx.currentTime, k = (o && o.gain) || 1;
      [7, 4, 0].forEach((n, i) => a._tone({ t: t + i * 0.14, freq: NOTE(n), wave: 'triangle', peak: 0.14 * k, decay: 0.3, bus: a.ui }));
    }

    tick(o) {
      if (!this._ok()) return;
      const a = this.a, t = a.ctx.currentTime, k = (o && o.gain) || 1;
      a._tone({ t, freq: 1600, wave: 'square', peak: 0.05 * k, decay: 0.03, bus: a.ui });
    }

    nope() {
      this.buzz({ gain: 0.6 });
    }

    pop(o) {
      if (!this._ok()) return;
      const a = this.a, t = a.ctx.currentTime, k = (o && o.gain) || 1;
      a._hit({ t, freq: 1200, q: 1, peak: 0.3 * k, decay: 0.05 });
    }

    splash(o) {
      if (!this._ok()) return;
      const a = this.a, t = a.ctx.currentTime, k = (o && o.gain) || 1;
      a._hit({ t, freq: 1200, freqEnd: 300, q: 0.6, peak: 0.25 * k, decay: 0.4 });
    }

    thud(o) {
      if (!this._ok()) return;
      const a = this.a, t = a.ctx.currentTime, k = (o && o.gain) || 1;
      a._tone({ t, freq: 90, freqEnd: 45, wave: 'sine', peak: 0.4 * k, decay: 0.2 });
    }
  }

  VH.CarnivalAudio = CarnivalAudio;
})();
