/*
 * audio-weapons.js — gunfire, reloads, impacts and weapon UI sounds.
 *
 * Adds methods to VH.AudioEngine.prototype, synthesised live like the rest
 * of audio.js (no audio files). Every method is a no-op until the audio
 * context is running. The caller works out distance attenuation and passes
 * it as `gain` (0..1) together with a stereo `pan` (-1..1).
 *
 *   gunshot(weaponId, pan, gain, distant, opts)
 *                         one shot. distant: 0 (near) .. 1 (far; or a boolean)
 *                         fades in a duller, echoing shot. opts: { noMech,
 *                         suppressed, pitch, level }. The weapon's soundPitch
 *                         and soundLevel vary its shared profile. Also takes
 *                         a profile key: 'cannon', 'autocannon' (vehicles).
 *   reload(weaponId)      the whole reload, timed to the data; always returns
 *                         { stop() } to cut it short
 *   shellIn(weaponId)  rack(weaponId)  dryFire()  lowAmmo(roundsLeft)
 *   taser(pan, gain)  stunCrackle(pan, gain)
 *   rocketLaunch(pan, gain)  glLaunch(pan, gain)
 *   minigun()             voice: update({ spin, firing, gain, pan }), stop()
 *   createRocket()        voice for a rocket in flight: update({ gain, pan }), stop()
 *   bulletImpact(surface, pan, gain)   'concrete' 'metal' 'wood' 'glass' 'flesh' 'car'
 *   ricochet(pan, gain)  whizz(pan)
 *   hitConfirm(head, kill)  playerHit(pan, armored)
 *   meleeSwing(kind)  meleeHit(kind)   'fist' 'blunt' 'blade' 'metal' 'throw'
 *   grenadePin()  molotovLight()  limpetStick(pan, gain)  detonatorClick()
 *   grenadeBounce(pan, gain)  molotovBurst(pan, gain)
 *   scope(on)  weaponSwitch(weaponId)  wheelTick()
 *   pickup()  weaponPickup()  ammoPickup()  healthPickup()  armorPickup()
 *
 * A shot is layered from a filtered-noise crack, a mid "snap", a low noise
 * body, a pitched-down sine thump and a short tonal click, with a little
 * random variation per shot, then sent into a shared city reverb and two
 * building echoes. Each sound profile (SHOTS) also says how the gun cycles,
 * whether it throws out a casing and how it reloads. Shots and impacts go
 * to the sfx bus, UI sounds to the ui bus. A burst limiter keeps massed
 * gunfire from piling up into clipping.
 */
(function () {
  'use strict';

  const VH = window.VH;
  if (!VH.AudioEngine) {
    console.warn('[audio-weapons] load audio.js first');
    return;
  }
  const P = VH.AudioEngine.prototype;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  const fin = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);
  const own = (o, k) => typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);

  // ------------------------------------------------------------ profiles
  // crack/snap/body/tail: [filterHz, peak, decay(, q)]; thump: [f0, f1, peak, decay];
  // tone: [f0, f1, peak, decay, wave]; hiss: [f0, f1, peak, attack, decay] (gas,
  // back-blast); verb/echo/echo2: send levels; echoes: rolls back off far buildings.
  // mech: what the action does after the shot ('slide' 'tick' 'cycle' 'pump'
  // 'bolt' 'cylinder' 'none'); casing: chance a casing tinkles down (hull: a
  // plastic shotgun hull); reload: the reload script ('mag' 'cylinder' 'shells'
  // 'bolt' 'break' 'belt' 'tube' 'cartridge' 'none'), written for reloadNominal
  // seconds and stretched to the weapon's reloadTime; reloadTimes: the 'mag'
  // script's beats; reloadPitch: pitch of the handling sounds.
  const SHOTS = {
    pistol: {
      crack: [2900, 0.3, 0.05], snap: [1900, 0.3, 0.09, 1.1], body: [1500, 0.2, 0.2], bodyBrown: false,
      thump: [150, 50, 0.34, 0.2], tone: [1150, 460, 0.07, 0.04, 'triangle'], tail: [720, 0.05, 0.6],
      verb: 0.26, echo: 0.12, echo2: 0.05, mech: 'slide', casing: 0.8,
      reload: 'mag', reloadNominal: 1.35, reloadTimes: { out: 0.05, in: 0.62, rack: 1.05 }, reloadPitch: 1.28,
    },
    revolver: {
      crack: [2300, 0.34, 0.07], snap: [1400, 0.34, 0.13, 1.0], body: [1050, 0.3, 0.32], bodyBrown: false,
      thump: [118, 38, 0.46, 0.32], tone: [820, 300, 0.07, 0.05, 'triangle'], tail: [620, 0.09, 1.0],
      verb: 0.34, echo: 0.18, echo2: 0.1, mech: 'none', casing: 0,
      reload: 'cylinder', reloadNominal: 2.4,
    },
    smg: {
      crack: [3700, 0.22, 0.035], snap: [2600, 0.2, 0.06, 1.3], body: [1900, 0.12, 0.12], bodyBrown: false,
      thump: [170, 72, 0.22, 0.12], tone: [1500, 720, 0.045, 0.028, 'square'], tail: [900, 0.03, 0.35],
      verb: 0.18, echo: 0.08, echo2: 0.03, mech: 'tick', casing: 0.35,
      reload: 'mag', reloadNominal: 1.9, reloadTimes: { out: 0.08, in: 0.88, pull: 1.22, rack: 1.38 },
    },
    shotgun: {
      crack: [1900, 0.3, 0.08], snap: [1100, 0.34, 0.16, 0.8], body: [900, 0.36, 0.45], bodyBrown: true,
      thump: [96, 34, 0.52, 0.4], tone: [520, 200, 0.06, 0.07, 'triangle'], tail: [520, 0.12, 1.3],
      verb: 0.36, echo: 0.22, echo2: 0.12, mech: 'pump', level: 0.85, casing: 0.8, hull: true, casingAt: 0.6,
      reload: 'shells', reloadNominal: 2.9,
    },
    rifle: {
      crack: [3300, 0.32, 0.045], snap: [2200, 0.28, 0.08, 1.2], body: [1650, 0.2, 0.2], bodyBrown: false,
      thump: [140, 48, 0.34, 0.2], tone: [1400, 600, 0.06, 0.035, 'triangle'], tail: [820, 0.06, 0.7],
      verb: 0.26, echo: 0.14, echo2: 0.07, mech: 'tick', casing: 0.8,
      reload: 'mag', reloadNominal: 2.1, reloadTimes: { out: 0.05, in: 0.9, slap: 1.02, rack: 1.62 },
    },
    sniper: {
      crack: [2700, 0.4, 0.06], snap: [1500, 0.4, 0.14, 0.9], body: [1150, 0.36, 0.42], bodyBrown: true,
      thump: [100, 32, 0.55, 0.45], tone: [900, 300, 0.07, 0.06, 'triangle'], tail: [650, 0.16, 1.8],
      verb: 0.45, echo: 0.3, echo2: 0.34, mech: 'bolt', echoes: true, level: 0.85, casing: 0.8, casingAt: 0.85,
      reload: 'bolt', reloadNominal: 2.9,
    },
    // A belt-fed 7.62: heavier and lower than the carbine, with links rattling out.
    lmg: {
      crack: [3000, 0.32, 0.05], snap: [1800, 0.3, 0.09, 1.1], body: [1350, 0.24, 0.24], bodyBrown: false,
      thump: [124, 42, 0.4, 0.22], tone: [1080, 430, 0.06, 0.04, 'triangle'], tail: [700, 0.08, 0.85],
      verb: 0.28, echo: 0.16, echo2: 0.08, mech: 'tick', mechPitch: 0.72, level: 0.95, casing: 0.5, links: true,
      reload: 'belt', reloadNominal: 4.6,
    },
    // Two short barrels: more blast and boom than the pump gun, and nothing cycles.
    sawnoff: {
      crack: [1700, 0.34, 0.09], snap: [1000, 0.38, 0.18, 0.7], body: [800, 0.42, 0.5], bodyBrown: true,
      thump: [88, 30, 0.58, 0.42], tone: [460, 180, 0.06, 0.08, 'triangle'], tail: [480, 0.14, 1.4],
      verb: 0.38, echo: 0.24, echo2: 0.14, mech: 'none', level: 0.82, casing: 0,
      reload: 'break', reloadNominal: 1.7,
    },
    // A gas-cartridge pop and the hiss of the wires paying out (taser() adds the arc).
    taser: {
      crack: [5200, 0.1, 0.012], snap: [2600, 0.13, 0.03, 1.2], body: [1800, 0.06, 0.05], bodyBrown: false,
      thump: [230, 120, 0.08, 0.04], tone: [1900, 1500, 0.03, 0.02, 'triangle'], tail: [900, 0.01, 0.15],
      verb: 0.06, echo: 0.02, echo2: 0, mech: 'none', level: 0.7, casing: 0,
      hiss: [6500, 3600, 0.05, 0.002, 0.28],
      reload: 'cartridge', reloadNominal: 1.1,
    },
    // The 40 mm "thoonk": a low hollow pop, then the cylinder indexes round.
    glauncher: {
      crack: [1800, 0.07, 0.02], snap: [620, 0.3, 0.09, 1.4], body: [520, 0.3, 0.18], bodyBrown: true,
      thump: [150, 62, 0.55, 0.14], tone: [270, 125, 0.12, 0.06, 'sine'], tail: [500, 0.05, 0.6],
      verb: 0.24, echo: 0.12, echo2: 0.06, mech: 'cylinder', mechPitch: 0.7, level: 0.9, casing: 0,
      hiss: [1700, 700, 0.06, 0.004, 0.12],
      reload: 'cylinder', reloadHeavy: true, reloadNominal: 3.2, reloadPitch: 0.62,
    },
    // A shoulder-launched rocket: the kick of the launch and the back-blast roar.
    rocket: {
      crack: [2000, 0.26, 0.06], snap: [900, 0.36, 0.2, 0.7], body: [700, 0.48, 0.6], bodyBrown: true,
      thump: [86, 30, 0.6, 0.45], tone: [400, 150, 0.05, 0.08, 'triangle'], tail: [420, 0.16, 1.6],
      verb: 0.42, echo: 0.28, echo2: 0.18, echoes: true, mech: 'none', level: 0.85, casing: 0,
      hiss: [700, 2600, 0.3, 0.015, 0.42],
      reload: 'tube', reloadNominal: 2.6,
    },
    // One tight round, for layering over the minigun's roar now and then.
    minigun: {
      crack: [3400, 0.26, 0.03], snap: [2100, 0.22, 0.05, 1.2], body: [1400, 0.16, 0.09], bodyBrown: false,
      thump: [130, 55, 0.24, 0.08], tone: [1200, 520, 0.04, 0.025, 'triangle'], tail: [700, 0.03, 0.4],
      verb: 0.18, echo: 0.1, echo2: 0.05, mech: 'none', level: 0.9, casing: 0,
      reload: 'belt', reloadNominal: 4.6,
    },
    // Vehicle guns: the tank's main gun and the mounted cannons. No hands on them.
    cannon: {
      crack: [1500, 0.34, 0.1], snap: [700, 0.44, 0.26, 0.6], body: [600, 0.55, 0.9], bodyBrown: true,
      thump: [72, 22, 0.8, 0.8], tone: [300, 90, 0.08, 0.1, 'triangle'], tail: [300, 0.26, 2.4],
      verb: 0.5, echo: 0.36, echo2: 0.42, echoes: true, mech: 'none', level: 0.9, casing: 0,
      reload: 'none', reloadNominal: 1,
    },
    autocannon: {
      crack: [2600, 0.34, 0.05], snap: [1500, 0.34, 0.1, 0.9], body: [1100, 0.3, 0.3], bodyBrown: true,
      thump: [105, 38, 0.45, 0.22], tone: [900, 340, 0.06, 0.05, 'triangle'], tail: [600, 0.08, 0.9],
      verb: 0.3, echo: 0.18, echo2: 0.1, mech: 'none', level: 0.8, casing: 0,
      reload: 'none', reloadNominal: 1,
    },
  };

  // Guns that share a profile but work differently, by weapon id.
  const VARIANTS = {
    // A drum-fed semi-automatic: no pump, and a drum to swap.
    autoshotgun: {
      mech: 'cycle', casingAt: 0.25, reload: 'mag', reloadNominal: 3.1, reloadPitch: 0.78,
      reloadTimes: { out: 0.12, in: 1.7, slap: 1.86, pull: 2.42, rack: 2.6 },
    },
    dmr: { echoes: true },
  };

  // Near and far shots blend between these multipliers (and a suppressor's).
  const FAR = { crack: 0.12, snap: 0.45, body: 0.95, thump: 0.7, tone: 0.15, tail: 1.5, hiss: 0.5, verb: 2.2, echo: 2.6 };
  const SUPPRESSED = { crack: 0.3, snap: 0.3, body: 0.45, thump: 0.5, tone: 0.25, tail: 0.3, hiss: 1, verb: 0.4, echo: 0.3 };

  const SURFACES = ['concrete', 'metal', 'wood', 'glass', 'flesh', 'car'];
  const MELEE_KINDS = ['fist', 'blunt', 'blade', 'metal', 'throw'];
  const NO_RELOAD = Object.freeze({ stop() {} });

  function weaponDef(id) {
    const byId = VH.Data && VH.Data.weaponsById;
    return byId && own(byId, id) ? byId[id] : null;
  }

  /**
   * The sound profile for a weapon id (or a profile key such as 'cannon'):
   * { key, p, def }. p is null for melee and thrown weapons (they make no
   * shot); anything else unknown sounds like the pistol.
   */
  const merged = {};
  function profileFor(weaponId) {
    const def = weaponDef(weaponId);
    let key = def && own(SHOTS, def.sound) ? def.sound : own(SHOTS, weaponId) ? weaponId : null;
    if (!key && def && (def.kind === 'melee' || def.kind === 'thrown')) return { key: null, p: null, def };
    if (!key) key = 'pistol';
    let p = SHOTS[key];
    if (def && own(VARIANTS, def.id)) p = merged[def.id] || (merged[def.id] = Object.assign({}, p, VARIANTS[def.id]));
    return { key, p, def };
  }

  /** An urban reverb impulse: early reflections, then a decaying tail that darkens over time. */
  function makeImpulse(ctx, seconds) {
    const rate = ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = ctx.createBuffer(2, len, rate);
    const pre = Math.floor(rate * 0.009);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let lp = 0;
      for (let i = pre; i < len; i++) {
        const t = (i - pre) / rate;
        const k = 0.85 - 0.72 * Math.min(1, t / 0.9);
        lp += (Math.random() * 2 - 1 - lp) * k;
        d[i] = lp * Math.exp(-t / 0.24) * Math.min(1, t / 0.004);
      }
      // Early reflections off nearby walls, different per ear.
      for (let r = 0; r < 7; r++) {
        const at = pre + Math.floor(rate * (0.012 + Math.random() * 0.09));
        if (at < len) d[at] += (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 0.5);
      }
    }
    return buf;
  }

  // ----------------------------------------------------------- plumbing
  /** Shared effects: city reverb and two building echoes, created once per context. */
  P._wFx = function () {
    if (this._wfx && this._wfx.ctx === this.ctx) return this._wfx;
    const ctx = this.ctx;
    const verb = ctx.createConvolver();
    verb.buffer = makeImpulse(ctx, 1.7);
    const verbOut = ctx.createGain();
    verbOut.gain.value = 0.85;
    verb.connect(verbOut);
    verbOut.connect(this.sfx);
    const echoLine = (time, feedback, cutoff, pan) => {
      const input = ctx.createGain();
      const delay = ctx.createDelay(1.5);
      delay.delayTime.value = time;
      const damp = ctx.createBiquadFilter();
      damp.type = 'lowpass';
      damp.frequency.value = cutoff;
      damp.Q.value = 0.4;
      const fb = ctx.createGain();
      fb.gain.value = feedback;
      input.connect(delay);
      delay.connect(damp);
      damp.connect(fb);
      fb.connect(delay);
      const out = ctx.createGain();
      out.gain.value = 0.75;
      damp.connect(out);
      out.connect(this._pan(this.sfx, pan));
      return input;
    };
    this._wfx = {
      ctx,
      verb,
      echo: echoLine(0.19, 0.3, 2100, -0.35),
      echo2: echoLine(0.43, 0.4, 1300, 0.4),
    };
    return this._wfx;
  };

  /** Disconnect nodes once a one-shot has finished (real-time contexts only). */
  P._wRelease = function (nodes, seconds) {
    if (typeof OfflineAudioContext !== 'undefined' && this.ctx instanceof OfflineAudioContext) return;
    setTimeout(() => {
      for (const n of nodes) {
        try {
          n.disconnect();
        } catch (err) {
          // Already gone.
        }
      }
    }, (seconds + 0.5) * 1000);
  };

  /**
   * A per-sound input: gain → optional lowpass → pan → sfx (or `bus`), with
   * optional sends to the reverb and echoes. Returns the input node.
   */
  P._wBus = function (o) {
    const ctx = this.ctx;
    const input = ctx.createGain();
    input.gain.value = Math.max(0, fin(o.gain, 1));
    let node = input;
    const nodes = [input];
    if (o.lowpass) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = clamp(o.lowpass, 40, 20000);
      f.Q.value = 0.5;
      node.connect(f);
      node = f;
      nodes.push(f);
    }
    const out = this._pan(o.bus || this.sfx, clamp(fin(o.pan, 0), -1, 1));
    node.connect(out);
    if (out !== (o.bus || this.sfx)) nodes.push(out);
    if (o.verb || o.echo || o.echo2) {
      const fx = this._wFx();
      for (const key of ['verb', 'echo', 'echo2']) {
        if (!(o[key] > 0)) continue;
        const s = ctx.createGain();
        s.gain.value = o[key];
        node.connect(s);
        s.connect(fx[key]);
        nodes.push(s);
      }
    }
    this._wRelease(nodes, o.life || 3);
    return input;
  };

  /**
   * Keeps massed gunfire (a street full of SMGs) from stacking into clipping.
   * Returns a gain multiplier, or 0 to drop the shot. Quiet (distant) shots
   * are dropped first; shots fired on the same game tick are turned down so
   * their transients do not add up sample for sample.
   */
  P._wShotGain = function (gain) {
    const now = this.ctx.currentTime;
    const log = this._wShotLog || (this._wShotLog = []);
    while (log.length && now - log[0] > 0.1) log.shift();
    if (log.length >= 8 && gain < 0.9) return 0;
    if (log.length >= 4 && gain < 0.35) return 0;
    let sameTick = 0;
    for (const t of log) if (now - t < 0.004) sameTick++;
    log.push(now);
    return 1 / Math.sqrt(1 + sameTick * 0.9 + Math.max(0, log.length - 3) * 0.15);
  };

  /** True at most once every `gap` seconds per key (stops per-frame spam). */
  P._wGate = function (key, gap) {
    const t = this.ctx.currentTime;
    const map = this._wGates || (this._wGates = {});
    if (map[key] !== undefined && t - map[key] < gap && t >= map[key]) return false;
    map[key] = t;
    return true;
  };

  /**
   * Filtered-noise burst and oscillator note, like audio.js's _hit/_tone but
   * with the gain starting at 0: a GainNode defaults to 1 until its first
   * scheduled event, so a sound scheduled ahead could leak a one-sample
   * click at full level.
   */
  P._wHit = function (o) {
    const ctx = this.ctx;
    const t = o.t || ctx.currentTime;
    const attack = o.attack || 0.004;
    const decay = o.decay || 0.05;
    const src = ctx.createBufferSource();
    src.buffer = o.brown ? this.brown : this.white;
    const f = ctx.createBiquadFilter();
    f.type = o.type || 'bandpass';
    f.frequency.value = o.freq || 1000;
    f.frequency.setValueAtTime(o.freq || 1000, t);
    if (o.freqEnd) f.frequency.exponentialRampToValueAtTime(o.freqEnd, t + attack + decay);
    f.Q.value = o.q || 1;
    const g = ctx.createGain();
    g.gain.value = 0;
    src.connect(f);
    f.connect(g);
    g.connect(this._pan(o.bus || this.sfx, o.pan));
    this._envelope(g.gain, t, attack, o.peak || 0.2, decay);
    // Start somewhere random in the noise, leaving room to play it out; a long
    // sound loops the buffer rather than running off its end.
    const dur = attack + decay + 0.05;
    const room = src.buffer.duration - dur;
    if (room < 0.05) src.loop = true;
    src.start(t, Math.random() * (room < 0.05 ? src.buffer.duration * 0.9 : Math.min(1.5, room)), dur);
  };

  P._wTone = function (o) {
    const ctx = this.ctx;
    const t = o.t || ctx.currentTime;
    const attack = o.attack || 0.005;
    const decay = o.decay || 0.1;
    const osc = ctx.createOscillator();
    osc.type = o.wave || 'sine';
    osc.frequency.setValueAtTime(o.freq, t);
    if (o.freqEnd) osc.frequency.exponentialRampToValueAtTime(o.freqEnd, t + attack + decay);
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
    g.connect(this._pan(o.bus || this.sfx, o.pan));
    this._envelope(g.gain, t, attack, o.peak || 0.2, decay);
    osc.start(t);
    osc.stop(t + attack + decay + 0.05);
  };

  // Small mechanical building blocks (t = start time, bus = destination).
  P._wClick = function (t, bus, f, peak) {
    this._wHit({ t, type: 'highpass', freq: 4200, q: 0.8, peak: peak * 0.8, attack: 0.0008, decay: 0.018, bus });
    this._wTone({ t, freq: f, wave: 'triangle', peak: peak * 0.5, attack: 0.0008, decay: 0.035, bus });
    this._wTone({ t, freq: f * 1.51, peak: peak * 0.25, attack: 0.0008, decay: 0.025, bus });
  };

  P._wClack = function (t, bus, f, peak) {
    this._wHit({ t, freq: 1900, q: 1.3, peak: peak, attack: 0.001, decay: 0.045, bus });
    this._wHit({ t, type: 'lowpass', freq: 900, q: 0.6, peak: peak * 0.6, attack: 0.001, decay: 0.06, bus });
    this._wTone({ t, freq: f, wave: 'triangle', peak: peak * 0.35, attack: 0.001, decay: 0.07, bus });
    this._wTone({ t, freq: 190, freqEnd: 120, peak: peak * 0.4, attack: 0.001, decay: 0.05, bus });
  };

  P._wScrape = function (t, bus, dur, f0, f1, peak) {
    this._wHit({ t, freq: f0, freqEnd: f1, q: 2.2, peak, attack: dur * 0.35, decay: dur * 0.65, bus });
  };

  P._wTinkle = function (t, bus, f, peak, pan) {
    const b = pan ? this._pan(bus, pan) : bus;
    this._wTone({ t, freq: f, peak, attack: 0.001, decay: rnd(0.05, 0.14), bus: b });
    this._wTone({ t, freq: f * rnd(1.35, 1.6), peak: peak * 0.5, attack: 0.001, decay: rnd(0.03, 0.08), bus: b });
  };

  /** A spent case hitting the ground: brass tinkles, a shotgun hull goes tok-tok. */
  P._wCasing = function (t, bus, hull, k) {
    const lv = k || 1;
    if (hull) {
      for (const [dt, pk] of [[0, 0.035], [rnd(0.09, 0.14), 0.018]]) {
        this._wTone({ t: t + dt, freq: rnd(560, 720), wave: 'triangle', peak: pk * lv, attack: 0.001, decay: 0.05, bus });
        this._wHit({ t: t + dt, freq: rnd(1500, 2100), q: 1.6, peak: pk * 0.8 * lv, attack: 0.0008, decay: 0.025, bus });
      }
      return;
    }
    this._wTinkle(t, bus, rnd(3800, 5200), 0.022 * lv);
    this._wTinkle(t + rnd(0.07, 0.12), bus, rnd(4200, 5600), 0.012 * lv);
  };

  /** A pump gun racked: back, clack, forward, clack. */
  P._wPump = function (t, bus, k) {
    const s = k || 1;
    this._wScrape(t, bus, 0.07 * s, 900, 1800, 0.07);
    this._wClack(t + 0.07 * s, bus, 640, 0.16);
    this._wScrape(t + 0.13 * s, bus, 0.06 * s, 1700, 900, 0.06);
    this._wClack(t + 0.19 * s, bus, 720, 0.18);
  };

  /** A bolt worked: lift, back, forward, down. */
  P._wBolt = function (t, bus) {
    this._wClick(t, bus, 2200, 0.08);
    this._wScrape(t + 0.05, bus, 0.1, 1100, 2400, 0.06);
    this._wClack(t + 0.17, bus, 900, 0.1);
    this._wScrape(t + 0.25, bus, 0.09, 2200, 1100, 0.05);
    this._wClack(t + 0.35, bus, 760, 0.14);
  };

  /** A charging handle or slide pulled and let go. */
  P._wCharge = function (t, bus, rp, k) {
    const lv = k || 1;
    this._wScrape(t, bus, 0.1, 1000 * rp, 2200 * rp, 0.05 * lv);
    this._wClack(t + 0.14, bus, 820 * rp, 0.18 * lv);
    this._wClick(t + 0.144, bus, 3000 * rp, 0.07 * lv);
  };

  /** Electric arc pulses (the stun gun): sharp clicks at about 19 a second over a thin buzz. */
  P._wArc = function (t, bus, dur, k) {
    const rate = rnd(17, 21);
    const n = Math.max(1, Math.round(dur * rate));
    for (let i = 0; i < n; i++) {
      const tt = t + i / rate + rnd(0, 0.006);
      const f = 1 - 0.35 * (i / n);
      this._wHit({ t: tt, type: 'highpass', freq: rnd(2600, 4200), q: 0.7, peak: rnd(0.08, 0.13) * k * f, attack: 0.0005, decay: rnd(0.004, 0.009), bus });
      this._wHit({ t: tt, freq: rnd(1100, 1600), q: 3, peak: 0.06 * k * f, attack: 0.0005, decay: 0.012, bus });
    }
    this._wTone({ t, freq: rate * 6, wave: 'sawtooth', peak: 0.02 * k, attack: 0.01, decay: dur, lowpass: 2600, bus });
    this._wTone({ t, freq: rnd(2900, 3300), wave: 'square', peak: 0.006 * k, attack: 0.01, decay: dur * 0.8, lowpass: 5000, bus });
  };

  // ------------------------------------------------------------ gunshots
  /**
   * The layered shot for profile `p`. o = { pan, gain, dk (0 near .. 1 far),
   * pitch, noMech, suppressed }.
   */
  P._wShot = function (p, o) {
    const k = this._wShotGain(o.gain);
    if (!k) return;
    const gain = o.gain * k;
    const dk = o.dk;
    // Other people's shots get a few ms of jitter so a volley never lines up exactly.
    const t = this.ctx.currentTime + 0.002 + (o.gain < 0.9 ? Math.random() * 0.012 : 0);
    const r = rnd(0.94, 1.06) * o.pitch;
    const dl = 1 / Math.sqrt(o.pitch); // lower guns ring a little longer
    const D = {};
    for (const key of Object.keys(FAR)) D[key] = (1 + (FAR[key] - 1) * dk) * (o.suppressed ? SUPPRESSED[key] : 1);
    // Distance closes a lowpass from 16 kHz down to about 1.1 kHz.
    let lowpass = dk > 0.01 ? 1150 * Math.pow(14, 1 - dk) * r : 0;
    if (o.suppressed) lowpass = Math.min(lowpass || 3200, 3200);
    const bus = this._wBus({
      pan: o.pan, gain: gain * rnd(0.9, 1.04) * (p.level || 1) * (1 - 0.15 * dk) * (o.suppressed ? 0.7 : 1),
      lowpass, verb: p.verb * D.verb, echo: p.echo * D.echo, echo2: (p.echo2 || 0) * D.echo,
      life: 1.6 + p.tail[2] * dl + (p.echoes ? 1.9 : 0),
    });
    // Crack: the supersonic snap, bright filtered noise with a near-instant attack.
    this._wHit({ t, type: 'highpass', freq: p.crack[0] * r, q: 0.7, peak: p.crack[1] * D.crack, attack: 0.0006, decay: p.crack[2] * dl, bus });
    // Snap: the mid-range report.
    this._wHit({ t, freq: p.snap[0] * r, q: p.snap[3], peak: p.snap[1] * D.snap, attack: 0.0008, decay: p.snap[2] * dl, bus });
    // Body: the boom, noise through a lowpass that closes as it decays.
    this._wHit({
      t, type: 'lowpass', brown: p.bodyBrown, freq: p.body[0] * r, freqEnd: p.body[0] * r * 0.35, q: 0.7,
      peak: p.body[1] * D.body, attack: 0.0015, decay: p.body[2] * dl, bus,
    });
    // Thump: a pitched-down sine for chest punch.
    this._wTone({ t, freq: p.thump[0] * r, freqEnd: p.thump[1] * o.pitch, peak: p.thump[2] * D.thump, attack: 0.0015, decay: p.thump[3] * dl, bus });
    // Tonal crack: a very short pitched click that gives each gun its voice.
    this._wTone({
      t, freq: p.tone[0] * r, freqEnd: p.tone[1] * o.pitch, wave: p.tone[4], peak: p.tone[2] * D.tone,
      attack: 0.0006, decay: p.tone[3] * dl, lowpass: 5200, bus,
    });
    // Tail: low rumble rolling off the buildings.
    this._wHit({ t: t + 0.01, type: 'lowpass', brown: true, freq: p.tail[0] * o.pitch, q: 0.5, peak: p.tail[1] * D.tail, attack: 0.03, decay: p.tail[2] * dl, bus });
    // Gas and back-blast.
    if (p.hiss) {
      const h = p.hiss;
      this._wHit({ t, freq: h[0] * r, freqEnd: h[1] * r, q: 0.8, peak: h[2] * D.hiss, attack: h[3], decay: h[4], bus });
    }
    // The big guns also roll back from far buildings.
    if (p.echoes) {
      for (const [dt, e] of [[0.34, 0.35], [0.78, 0.2], [1.3, 0.1]]) {
        this._wHit({ t: t + dt * rnd(0.95, 1.08), type: 'lowpass', freq: 700 * o.pitch, q: 0.6, peak: p.body[1] * e * (1 + 0.3 * dk), attack: 0.02, decay: 0.5, bus });
      }
    }
    // A suppressor turns the report into a hard "thup".
    if (o.suppressed) this._wHit({ t, freq: 750 * r, q: 0.9, peak: 0.22, attack: 0.001, decay: 0.05, bus });

    // Mechanical follow-through and the casing, near the player only.
    const mk = o.noMech ? 0 : clamp(1 - dk / 0.4, 0, 1);
    if (mk < 0.05) return;
    const mech = this._wBus({ pan: o.pan, gain: gain * 0.9 * mk, life: 2 });
    const mp = r * (p.mechPitch || 1);
    switch (p.mech) {
      case 'slide':
        this._wClick(t + 0.03, mech, 2600 * mp, 0.08);
        break;
      case 'tick':
        this._wClick(t + 0.018, mech, 3100 * mp, 0.045);
        break;
      case 'cycle':
        this._wClack(t + 0.035, mech, 900 * mp, 0.07);
        this._wClick(t + 0.05, mech, 2600 * mp, 0.035);
        break;
      case 'pump':
        this._wPump(t + 0.33, mech);
        break;
      case 'bolt':
        this._wBolt(t + 0.55, mech);
        break;
      case 'cylinder':
        this._wClick(t + 0.2, mech, 1700 * mp, 0.06);
        this._wClack(t + 0.24, mech, 520 * mp, 0.07);
        break;
      default:
        break;
    }
    if (p.casing > 0 && Math.random() < p.casing) {
      this._wCasing(t + (p.casingAt || 0.35) + rnd(0, 0.2), mech, p.hull);
      // Belt links clink down with the brass.
      if (p.links && Math.random() < 0.5) this._wTinkle(t + rnd(0.3, 0.5), mech, rnd(2600, 3200), 0.014);
    }
  };

  /** One shot. See the header for the arguments. */
  P.gunshot = function (weaponId, pan = 0, gain = 1, distant = false, opts) {
    if (!this.ready) return;
    gain = fin(gain, 0);
    if (gain <= 0.001) return;
    const { key, p, def } = profileFor(weaponId);
    if (!p) return; // melee and thrown weapons make no shot
    const o = opts || {};
    const dk = distant === true ? 1 : clamp(fin(distant, 0), 0, 1);
    const pitch = clamp(fin(def && def.soundPitch, 1) * fin(o.pitch, 1), 0.5, 2);
    const level = clamp(fin(def && def.soundLevel, 1) * fin(o.level, 1), 0, 2);
    pan = clamp(fin(pan, 0), -1, 1);
    // The stun gun and the launchers have sounds of their own.
    if (key === 'taser') return this.taser(pan, gain * level, dk);
    if (key === 'rocket') return this.rocketLaunch(pan, gain * level, dk);
    if (key === 'glauncher') return this.glLaunch(pan, gain * level, dk);
    this._wShot(p, { pan, gain: gain * level, dk, pitch, noMech: !!o.noMech, suppressed: !!o.suppressed });
  };

  /** The stun gun fires: a gas pop, the wires hissing out, and a short burst of current. */
  P.taser = function (pan = 0, gain = 1, distant = 0) {
    if (!this.ready) return;
    gain = fin(gain, 0);
    if (gain <= 0.001) return;
    pan = clamp(fin(pan, 0), -1, 1);
    const dk = clamp(fin(distant, 0), 0, 1);
    this._wShot(SHOTS.taser, { pan, gain, dk, pitch: 1, noMech: true });
    const bus = this._wBus({ pan, gain: gain * (1 - 0.6 * dk), lowpass: dk > 0.01 ? 1800 * Math.pow(8, 1 - dk) : 0, life: 1 });
    this._wArc(this.ctx.currentTime + 0.07, bus, 0.42, 0.55);
  };

  /** Someone hit by the stun gun: the darts crackling as the current pulses. */
  P.stunCrackle = function (pan = 0, gain = 1) {
    if (!this.ready) return;
    gain = fin(gain, 0);
    if (gain <= 0.001 || !this._wGate('stun', 0.25)) return;
    const bus = this._wBus({ pan: clamp(fin(pan, 0), -1, 1), gain, verb: 0.05, life: 1.6 });
    this._wArc(this.ctx.currentTime + 0.01, bus, 1.1, 1);
  };

  /** A rocket leaves the launcher: the kick and back-blast, then the motor roaring away. */
  P.rocketLaunch = function (pan = 0, gain = 1, distant = 0) {
    if (!this.ready) return;
    gain = fin(gain, 0);
    if (gain <= 0.001) return;
    pan = clamp(fin(pan, 0), -1, 1);
    const dk = clamp(fin(distant, 0), 0, 1);
    this._wShot(SHOTS.rocket, { pan, gain, dk, pitch: 1, noMech: true });
    const t = this.ctx.currentTime + 0.03;
    const bus = this._wBus({ pan, gain: gain * (1 - 0.5 * dk), lowpass: dk > 0.01 ? 1400 * Math.pow(10, 1 - dk) : 0, verb: 0.22, echo: 0.1, life: 2.2 });
    this._wHit({ t, freq: 900, freqEnd: 2600, q: 0.6, peak: 0.2, attack: 0.04, decay: 0.85, bus });
    this._wHit({ t, type: 'lowpass', brown: true, freq: 320, freqEnd: 1300, q: 0.7, peak: 0.34, attack: 0.05, decay: 0.8, bus });
    for (let i = 0; i < 10; i++) {
      this._wHit({ t: t + rnd(0.02, 0.6), type: 'highpass', freq: rnd(1800, 3800), peak: rnd(0.03, 0.07), attack: 0.001, decay: rnd(0.008, 0.02), bus });
    }
  };

  /** A 40 mm grenade launched: a hollow "thoonk" and the cylinder turning. */
  P.glLaunch = function (pan = 0, gain = 1, distant = 0) {
    if (!this.ready) return;
    gain = fin(gain, 0);
    if (gain <= 0.001) return;
    this._wShot(SHOTS.glauncher, { pan: clamp(fin(pan, 0), -1, 1), gain, dk: clamp(fin(distant, 0), 0, 1), pitch: 1, noMech: false });
  };

  /** The click of an empty chamber. */
  P.dryFire = function () {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const bus = this._wBus({ gain: 1, life: 0.5 });
    this._wClick(t, bus, 2700, 0.16);
    this._wTone({ t, freq: 520, freqEnd: 380, wave: 'triangle', peak: 0.05, attack: 0.001, decay: 0.05, bus });
  };

  /** A light hollow tick as the magazine runs low, brighter on the last rounds. */
  P.lowAmmo = function (mag) {
    if (!this.ready || !this._wGate('low', 0.07)) return;
    const t = this.ctx.currentTime + 0.03;
    const n = clamp(fin(mag, 3), 1, 12);
    const k = 1 - (n - 1) / 11;
    const f = 1900 + 900 * k;
    this._wTone({ t, freq: f, wave: 'triangle', peak: 0.03 + 0.035 * k, attack: 0.0008, decay: 0.04, bus: this.ui });
    this._wTone({ t, freq: f * 1.5, peak: 0.01 + 0.012 * k, attack: 0.0008, decay: 0.03, bus: this.ui });
  };

  // -------------------------------------------------------------- reloads
  // Each script is written for the profile's reloadNominal seconds: T(s) maps
  // a time in it to the context clock, out is the reload's own gain, rp the
  // pitch of the handling sounds.
  const RELOADS = {
    // Magazine out (and a drum or box), new one in, a slap, the charging handle.
    mag(T, out, p, def, rp) {
      const m = Object.assign({ out: 0.05, in: 0.6, rack: 1.05 }, p.reloadTimes);
      this._wClick(T(m.out), out, 2400 * rp, 0.1);
      this._wScrape(T(m.out + 0.05), out, 0.13, 1500 * rp, 700 * rp, 0.05);
      this._wScrape(T(m.in - 0.1), out, 0.1, 700 * rp, 1400 * rp, 0.045);
      this._wClack(T(m.in), out, 700 * rp, 0.15);
      if (m.slap) this._wHit({ t: T(m.slap), type: 'lowpass', freq: 1200 * rp, peak: 0.12, attack: 0.002, decay: 0.05, bus: out });
      if (m.pull) this._wScrape(T(m.pull), out, 0.1, 1000 * rp, 2200 * rp, 0.05);
      if (m.rack !== undefined) {
        this._wClack(T(m.rack), out, 820 * rp, 0.19);
        this._wClick(T(m.rack + 0.004), out, 3000 * rp, 0.07);
      }
    },
    // A revolver's speed-loader, or the launcher's big cylinder loaded round by round.
    cylinder(T, out, p, def, rp) {
      const rounds = Math.round(clamp(def && def.magSize ? def.magSize : 6, 1, 8));
      this._wClick(T(0.04), out, 2100 * rp, 0.1);
      this._wScrape(T(0.1), out, 0.08, 700 * rp, 1400 * rp, 0.05);
      if (!p.reloadHeavy) {
        for (let i = 0; i < rounds; i++) this._wTinkle(T(0.42 + i * 0.045 + rnd(0, 0.03)), out, rnd(3000, 4600), 0.03, rnd(-0.3, 0.3));
        this._wScrape(T(1.25), out, 0.14, 1400, 700, 0.05);
        this._wClick(T(1.42), out, 1900, 0.09);
        this._wClack(T(1.95), out, 700, 0.15);
        return;
      }
      // Empty 40 mm cases knock out, fresh rounds go in, the spring is wound.
      for (let i = 0; i < rounds; i++) {
        this._wTone({ t: T(0.38 + i * 0.05 + rnd(0, 0.03)), freq: rnd(650, 900), wave: 'triangle', peak: 0.04, attack: 0.001, decay: 0.08, bus: out });
      }
      for (let i = 0; i < rounds; i++) {
        const s = 0.9 + (i * 1.45) / Math.max(1, rounds - 1);
        this._wScrape(T(s), out, 0.07, 900 * rp * 1.6, 600 * rp * 1.6, 0.04);
        this._wClack(T(s + 0.07), out, 680 * rp, 0.1);
      }
      for (let i = 0; i < 6; i++) this._wClick(T(2.5 + i * 0.07), out, 1800 * rp * 1.5, 0.05);
      this._wClack(T(3.0), out, 760 * rp, 0.18);
    },
    // Shells thumbed into the tube one by one, then a rack.
    shells(T, out, p, def) {
      const shells = def && def.magSize ? Math.min(def.magSize, 4) : 4;
      for (let i = 0; i < shells; i++) {
        const s = 0.32 + i * 0.44;
        this._wScrape(T(s), out, 0.08, 1300, 700, 0.05);
        this._wClack(T(s + 0.08), out, 480, 0.1);
      }
      this._wPump(T(0.32 + shells * 0.44 + 0.08), out);
    },
    // Bolt open, rounds pressed into the magazine, bolt closed.
    bolt(T, out) {
      this._wClick(T(0.05), out, 2200, 0.08);
      this._wScrape(T(0.12), out, 0.16, 1100, 2400, 0.06);
      this._wClick(T(0.5), out, 2600, 0.08);
      this._wScrape(T(0.56), out, 0.16, 1500, 800, 0.05);
      this._wScrape(T(1.45), out, 0.12, 800, 1500, 0.05);
      this._wClack(T(1.58), out, 820, 0.13);
      this._wScrape(T(2.2), out, 0.14, 2400, 1100, 0.06);
      this._wClack(T(2.42), out, 760, 0.15);
    },
    // A break-action: the latch, barrels drop, two hulls pop out, two shells in, snap shut.
    break(T, out) {
      this._wClick(T(0.05), out, 2000, 0.1);
      this._wScrape(T(0.1), out, 0.06, 1200, 700, 0.04);
      this._wClack(T(0.16), out, 520, 0.14);
      this._wHit({ t: T(0.24), freq: 2600, q: 1.5, peak: 0.05, attack: 0.001, decay: 0.03, bus: out });
      this._wCasing(T(0.4), out, true);
      this._wCasing(T(0.47), out, true, 0.8);
      for (const s of [0.75, 0.98]) {
        this._wScrape(T(s), out, 0.07, 1300, 750, 0.045);
        this._wClack(T(s + 0.07), out, 560, 0.08);
      }
      this._wScrape(T(1.32), out, 0.05, 700, 1200, 0.04);
      this._wClack(T(1.42), out, 700, 0.2);
      this._wClick(T(1.425), out, 2300, 0.08);
    },
    // Feed cover up, the old belt out, a new box on, the belt laid in, cover slammed, cocked.
    belt(T, out) {
      this._wClick(T(0.1), out, 2100, 0.09);
      this._wClack(T(0.2), out, 600, 0.12);
      for (let i = 0; i < 7; i++) this._wTinkle(T(0.5 + i * 0.07 + rnd(0, 0.02)), out, rnd(2400, 3400), 0.02);
      this._wClick(T(1.1), out, 2300, 0.08);
      this._wScrape(T(1.16), out, 0.18, 1300, 600, 0.05);
      this._wHit({ t: T(1.6), type: 'lowpass', freq: 700, peak: 0.1, attack: 0.002, decay: 0.08, bus: out });
      this._wScrape(T(2.0), out, 0.14, 600, 1200, 0.045);
      this._wClack(T(2.15), out, 560, 0.15);
      for (let i = 0; i < 7; i++) this._wTinkle(T(2.6 + i * 0.065 + rnd(0, 0.02)), out, rnd(2600, 3600), 0.018);
      this._wClack(T(3.5), out, 640, 0.2);
      this._wCharge(T(3.95), out, 0.85, 1);
    },
    // A rocket slid into the tube, seated, and the launcher cocked.
    tube(T, out) {
      this._wScrape(T(0.4), out, 0.55, 600, 1100, 0.05);
      this._wTone({ t: T(1.0), freq: 150, freqEnd: 95, peak: 0.16, attack: 0.002, decay: 0.12, bus: out });
      this._wClack(T(1.0), out, 380, 0.14);
      this._wClick(T(1.5), out, 1900, 0.08);
      this._wClack(T(2.0), out, 700, 0.15);
      this._wClick(T(2.1), out, 2600, 0.06);
    },
    // The stun gun: spent cartridge off, a new one snapped on, a test crackle.
    cartridge(T, out) {
      this._wClick(T(0.08), out, 2600, 0.09);
      this._wTone({ t: T(0.16), freq: 1100, wave: 'triangle', peak: 0.04, attack: 0.001, decay: 0.05, bus: out });
      this._wScrape(T(0.55), out, 0.08, 1800, 2600, 0.04);
      this._wClick(T(0.7), out, 3000, 0.12);
      this._wArc(T(0.92), out, 0.1, 0.3);
    },
    none() {},
  };

  /**
   * A full reload for the weapon, spread over its reload time. Always returns
   * a handle whose stop() cuts it short (harmless if nothing is playing).
   */
  P.reload = function (weaponId) {
    if (!this.ready) return NO_RELOAD;
    const { p, def } = profileFor(weaponId);
    if (!p || (def && (def.kind === 'melee' || def.kind === 'thrown'))) return NO_RELOAD;
    const style = own(RELOADS, p.reload) ? p.reload : 'none';
    if (style === 'none') return NO_RELOAD;
    const ctx = this.ctx;
    const t0 = ctx.currentTime + 0.01;
    const out = ctx.createGain();
    out.gain.value = 1;
    out.connect(this.sfx);
    const nominal = p.reloadNominal > 0 ? p.reloadNominal : 1.5;
    const k = clamp(def && def.reloadTime > 0 ? def.reloadTime / nominal : 1, 0.4, 2.5);
    const T = (s) => t0 + s * k;
    try {
      RELOADS[style].call(this, T, out, p, def, p.reloadPitch || 1);
    } catch (err) {
      console.warn('[audio-weapons] reload sound failed', err);
    }
    this._wRelease([out], nominal * k + 0.5);
    return {
      stop: () => {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        out.gain.cancelScheduledValues(t);
        out.gain.setValueAtTime(out.gain.value, t);
        out.gain.linearRampToValueAtTime(0, t + 0.04);
      },
    };
  };

  /** One shell (or round) loaded by hand. */
  P.shellIn = function (weaponId) {
    if (!this.ready) return;
    const { p } = profileFor(weaponId);
    const t = this.ctx.currentTime + 0.01;
    const bus = this._wBus({ gain: 1, life: 0.6 });
    if (p && p.hull) {
      this._wScrape(t + 0.04, bus, 0.08, 1300, 700, 0.05);
      this._wClack(t + 0.12, bus, 480, 0.1);
    } else {
      const rp = (p && p.reloadPitch) || 1;
      this._wScrape(t, bus, 0.05, 1600 * rp, 2400 * rp, 0.035);
      this._wClick(t + 0.05, bus, 2800 * rp, 0.07);
    }
  };

  /** The action worked by hand: pump, bolt, or slide / charging handle. */
  P.rack = function (weaponId) {
    if (!this.ready) return;
    const { p } = profileFor(weaponId);
    const t = this.ctx.currentTime + 0.01;
    const bus = this._wBus({ gain: 1, life: 1.2 });
    if (p && (p.mech === 'pump' || p.reload === 'shells')) this._wPump(t, bus);
    else if (p && p.mech === 'bolt') this._wBolt(t, bus);
    else this._wCharge(t, bus, (p && p.reloadPitch) || 1, 1);
  };

  // ------------------------------------------------------------ voices
  const kit = VH.AudioEngine.voiceKit;
  const SILENT_VOICE = { update() {}, stop() {}, awake: false };

  /** The minigun's buffers, made once per context: a run of rounds, and the barrel clatter. */
  function minigunAssets(e) {
    let a = e._wMini;
    if (a && a.ctx === e.ctx) return a;
    const ctx = e.ctx;
    const sr = ctx.sampleRate;
    const def = weaponDef('minigun');
    const rate = clamp(fin(def && def.fireRate, 30), 10, 60);
    // Ten slightly different rounds, back to back at the fire rate.
    const period = Math.floor(sr / rate);
    const count = 10;
    const rounds = ctx.createBuffer(1, period * count, sr);
    const d = rounds.getChannelData(0);
    let peak = 0;
    for (let n = 0; n < count; n++) {
      const amp = 0.8 + Math.random() * 0.2;
      const jit = Math.floor(Math.random() * period * 0.08);
      const f0 = 95 + Math.random() * 25;
      let lp = 0;
      let lp2 = 0;
      let ph = 0;
      for (let j = 0; j + jit < period; j++) {
        const x = j / sr;
        const w = Math.random() * 2 - 1;
        lp += 0.35 * (w - lp);
        lp2 += 0.06 * (w - lp2);
        ph += (2 * Math.PI * f0 * (1 - Math.min(0.5, x * 12))) / sr;
        const crack = (w - lp) * Math.exp(-x / 0.0015);
        const body = lp * Math.exp(-x / 0.008) + lp2 * 3 * Math.exp(-x / 0.02);
        const v = amp * (0.9 * crack + 0.8 * body + 0.6 * Math.sin(ph) * Math.exp(-x / 0.018));
        d[n * period + jit + j] = v;
        peak = Math.max(peak, Math.abs(v));
      }
    }
    for (let i = 0; i < d.length; i++) d[i] *= 0.9 / (peak || 1);
    // One turn of the barrel cluster: six clicks, at the fire rate when the buffer plays at 1x.
    const clat = ctx.createBuffer(1, period * 6, sr);
    const c = clat.getChannelData(0);
    peak = 0;
    for (let n = 0; n < 6; n++) {
      const amp = n === 0 ? 1 : 0.6 + Math.random() * 0.3;
      let lp = 0;
      for (let j = 0; j < period; j++) {
        const x = j / sr;
        lp += 0.5 * (Math.random() * 2 - 1 - lp);
        const v = amp * (lp * Math.exp(-x / 0.0015) + 0.5 * Math.sin(2 * Math.PI * 2300 * x) * Math.exp(-x / 0.004) + 0.4 * Math.sin(2 * Math.PI * 780 * x) * Math.exp(-x / 0.006));
        c[n * period + j] = v;
        peak = Math.max(peak, Math.abs(v));
      }
    }
    for (let i = 0; i < c.length; i++) c[i] *= 0.9 / (peak || 1);
    a = e._wMini = { ctx, rounds, clat };
    return a;
  }

  /**
   * The minigun: a motor whine that climbs with the spin, the barrels'
   * mechanical whirr, and while it fires one dense, continuous roar of rounds.
   * p = { spin 0..1, firing, gain, pan }.
   */
  class MinigunVoice extends (kit ? kit.Voice : Object) {
    _level(p) {
      const spin = clamp(fin(p.spin, 0), 0, 1);
      return clamp(fin(p.gain, 0), 0, 1.5) * Math.min(1, spin * 4 + (p.firing ? 1 : 0));
    }

    _build(ctx, n, e) {
      const A = kit.assets(e);
      const M = minigunAssets(e);
      // Motor and gear whine.
      n.motor = this._gain(ctx, 0);
      n.m1 = this._osc(ctx, 'triangle', 80);
      n.m2 = this._osc(ctx, 'sine', 160);
      n.m3 = this._osc(ctx, 'sawtooth', 20);
      const g2 = this._gain(ctx, 0.35);
      const g3 = this._gain(ctx, 0.5);
      const m3lp = this._filter(ctx, 'lowpass', 500, 1.2);
      n.m1.connect(n.motor);
      n.m2.connect(g2);
      g2.connect(n.motor);
      n.m3.connect(m3lp);
      m3lp.connect(g3);
      g3.connect(n.motor);
      const wob = this._loop(ctx, A.wobble, 0.6);
      const wg = this._gain(ctx, 6);
      wob.connect(wg);
      wg.connect(n.m1.detune);
      wg.connect(n.m2.detune);
      n.motor.connect(n.out);
      // Whirr: the barrel cluster clattering round, and the air it stirs.
      n.clat = this._loop(ctx, M.clat, 0.05);
      const chp = this._filter(ctx, 'highpass', 400, 0.7);
      n.clatG = this._gain(ctx, 0);
      n.clat.connect(chp);
      chp.connect(n.clatG);
      n.clatG.connect(n.out);
      const air = this._loop(ctx, e.white);
      n.airBp = this._filter(ctx, 'bandpass', 400, 0.9);
      n.air = this._gain(ctx, 0);
      air.connect(n.airBp);
      n.airBp.connect(n.air);
      n.air.connect(n.out);
      // The roar of fire: the run of rounds, a low rumble under it, a little grit.
      n.fire = this._gain(ctx, 0);
      const rounds = this._loop(ctx, M.rounds, 1);
      const rlp = this._filter(ctx, 'lowpass', 6500, 0.6);
      const body = this._filter(ctx, 'peaking', 170, 0.9);
      body.gain.value = 5;
      rounds.connect(rlp);
      rlp.connect(body);
      body.connect(n.fire);
      const rum = this._loop(ctx, e.brown);
      const rumLp = this._filter(ctx, 'lowpass', 420, 0.6);
      const rumG = this._gain(ctx, 0.5);
      rum.connect(rumLp);
      rumLp.connect(rumG);
      rumG.connect(n.fire);
      const sh = this._node(ctx.createWaveShaper());
      sh.curve = kit.curve(e, 1.5);
      n.fire.connect(sh);
      sh.connect(n.out);
      // Into the street: reverb and echoes, after the output level.
      const fx = e._wFx();
      for (const [key, lvl] of [['verb', 0.22], ['echo', 0.1], ['echo2', 0.05]]) {
        const s = this._gain(ctx, lvl);
        n.out.connect(s);
        s.connect(fx[key]);
      }
    }

    _apply(p, t, level) {
      const n = this.n;
      const spin = clamp(fin(p.spin, 0), 0, 1);
      const firing = !!p.firing && spin > 0.9;
      const fm = 70 + 1150 * Math.pow(spin, 0.85);
      this._to(n.m1.frequency, 'm1', fm, t, 0.04, true);
      this._to(n.m2.frequency, 'm2', fm * 2.02, t, 0.04, true);
      this._to(n.m3.frequency, 'm3', fm * 0.25, t, 0.04, true);
      this._to(n.motor.gain, 'mg', (0.05 + 0.08 * spin) * Math.min(1, spin * 6) * (firing ? 0.7 : 1), t, 0.04);
      this._to(n.clat.playbackRate, 'cr', Math.max(0.05, spin), t, 0.04, true);
      this._to(n.clatG.gain, 'cg', 0.28 * Math.min(1, spin * 3), t, 0.04);
      this._to(n.airBp.frequency, 'af', 300 + 2000 * spin, t, 0.05, true);
      this._to(n.air.gain, 'ag', 0.14 * spin, t, 0.05);
      // The roar starts and stops hard.
      const f = firing ? 1 : 0;
      if (this._last.fire !== f) {
        this._last.fire = f;
        n.fire.gain.cancelScheduledValues(t);
        n.fire.gain.setTargetAtTime(f * 0.72, t, f ? 0.006 : 0.025);
      }
      this._mix(p, t, clamp(fin(p.gain, 0), 0, 1.5) * 0.55);
    }
  }

  /** A rocket in flight: a ragged motor roar with crackle. p = { gain, pan }. */
  class RocketVoice extends (kit ? kit.Voice : Object) {
    _build(ctx, n, e) {
      const A = kit.assets(e);
      const roar = this._loop(ctx, e.brown);
      const rlp = this._filter(ctx, 'lowpass', 750, 0.6);
      const rg = this._gain(ctx, 0.9);
      roar.connect(rlp);
      rlp.connect(rg);
      rg.connect(n.out);
      const flut = this._loop(ctx, A.wobble, 3.2);
      const fg = this._gain(ctx, 0.3);
      flut.connect(fg);
      fg.connect(rg.gain);
      const hiss = this._loop(ctx, e.white);
      const hbp = this._filter(ctx, 'bandpass', 2300, 0.6);
      const hg = this._gain(ctx, 0.22);
      hiss.connect(hbp);
      hbp.connect(hg);
      hg.connect(n.out);
      const cr = this._loop(ctx, A.crackle, 1.7);
      const chp = this._filter(ctx, 'highpass', 1200, 0.7);
      const cg = this._gain(ctx, 0.5);
      cr.connect(chp);
      chp.connect(cg);
      cg.connect(n.out);
    }

    _apply(p, t, gain) {
      this._mix(p, t, gain * 0.5);
    }
  }

  P.minigun = function () {
    return kit ? new MinigunVoice(this) : SILENT_VOICE;
  };

  P.createRocket = function () {
    return kit ? new RocketVoice(this) : SILENT_VOICE;
  };

  // ------------------------------------------------------------- impacts
  P.bulletImpact = function (surface, pan = 0, gain = 1) {
    gain = fin(gain, 0);
    if (!this.ready || gain <= 0.001) return;
    const t = this.ctx.currentTime;
    const r = rnd(0.92, 1.08);
    const bus = this._wBus({ pan, gain: gain * rnd(0.85, 1), verb: 0.08, life: 1.2 });
    switch (SURFACES.indexOf(surface) >= 0 ? surface : 'concrete') {
      case 'metal': {
        this._wHit({ t, type: 'highpass', freq: 3000 * r, peak: 0.2, attack: 0.0006, decay: 0.035, bus });
        const f = rnd(1600, 2300);
        [[1, 0.07, 0.4], [1.47, 0.05, 0.3], [2.09, 0.035, 0.22], [2.73, 0.02, 0.15]].forEach(([m, pk, dc]) => {
          this._wTone({ t, freq: f * m, wave: m === 1 ? 'triangle' : 'sine', peak: pk, attack: 0.0008, decay: dc, bus });
        });
        break;
      }
      case 'wood':
        this._wHit({ t, freq: 900 * r, q: 1.5, peak: 0.3, attack: 0.0008, decay: 0.08, bus });
        this._wTone({ t, freq: 240 * r, freqEnd: 170, wave: 'triangle', peak: 0.12, attack: 0.001, decay: 0.1, bus });
        this._wHit({ t: t + 0.008, type: 'highpass', freq: 3600, peak: 0.05, attack: 0.001, decay: 0.05, bus });
        break;
      case 'glass':
        this._wHit({ t, type: 'highpass', freq: 4500 * r, peak: 0.2, attack: 0.0006, decay: 0.12, bus });
        this._wHit({ t: t + 0.005, freq: 5200, q: 0.8, peak: 0.1, attack: 0.004, decay: 0.35, bus });
        for (let i = 0; i < 8; i++) this._wTinkle(t + rnd(0.01, 0.38), bus, rnd(2800, 7200), rnd(0.02, 0.045), rnd(-0.25, 0.25));
        break;
      case 'flesh':
        this._wHit({ t, type: 'lowpass', brown: true, freq: 700 * r, peak: 0.36, attack: 0.001, decay: 0.12, bus });
        this._wTone({ t, freq: 115 * r, freqEnd: 55, peak: 0.24, attack: 0.001, decay: 0.12, bus });
        this._wHit({ t: t + 0.004, freq: 1400, freqEnd: 480, q: 2, peak: 0.09, attack: 0.002, decay: 0.09, bus });
        break;
      case 'car':
        this._wHit({ t, freq: 1800 * r, q: 1.2, peak: 0.24, attack: 0.0006, decay: 0.05, bus });
        this._wTone({ t, freq: 820 * r, freqEnd: 760 * r, wave: 'triangle', peak: 0.07, attack: 0.001, decay: 0.22, bus });
        this._wTone({ t, freq: 1245 * r, peak: 0.035, attack: 0.001, decay: 0.16, bus });
        this._wTone({ t, freq: 140, freqEnd: 80, peak: 0.14, attack: 0.001, decay: 0.09, bus });
        break;
      default: // concrete
        this._wHit({ t, freq: 2600 * r, q: 0.9, peak: 0.26, attack: 0.0006, decay: 0.06, bus });
        this._wHit({ t, type: 'lowpass', brown: true, freq: 900, peak: 0.18, attack: 0.001, decay: 0.09, bus });
        this._wTone({ t, freq: 180 * r, freqEnd: 90, peak: 0.08, attack: 0.001, decay: 0.06, bus });
        for (let i = 0; i < 3; i++) {
          this._wHit({ t: t + 0.02 + i * rnd(0.018, 0.035), type: 'highpass', freq: rnd(2500, 4500), peak: 0.035, attack: 0.001, decay: 0.02, bus });
        }
    }
  };

  /** The whine of a round glancing off something hard. */
  P.ricochet = function (pan = 0, gain = 1) {
    gain = fin(gain, 0);
    if (!this.ready || gain <= 0.001) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const bus = this._wBus({ pan, gain, verb: 0.2, echo: 0.08, life: 1 });
    this._wHit({ t, type: 'highpass', freq: 3200, peak: 0.12, attack: 0.0006, decay: 0.03, bus });
    const f0 = rnd(2500, 3700);
    const len = rnd(0.3, 0.48);
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(f0 * rnd(0.36, 0.5), t + len);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = rnd(24, 38);
    const depth = ctx.createGain();
    depth.gain.value = f0 * 0.012;
    lfo.connect(depth);
    depth.connect(osc.frequency);
    const g = ctx.createGain();
    g.gain.value = 0;
    osc.connect(g);
    g.connect(bus);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.1, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    osc.start(t);
    lfo.start(t);
    osc.stop(t + len + 0.05);
    lfo.stop(t + len + 0.05);
  };

  /** A bullet flying past Jay's head, from the side given by `pan`. */
  P.whizz = function (pan = 0) {
    if (!this.ready) return;
    pan = clamp(fin(pan, 0), -1, 1);
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.white;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 3.2;
    const f0 = rnd(3000, 3800);
    f.frequency.setValueAtTime(f0, t);
    f.frequency.exponentialRampToValueAtTime(f0 * 0.32, t + 0.16);
    const g = ctx.createGain();
    g.gain.value = 0;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.6, t + 0.035);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    src.connect(f);
    f.connect(g);
    let dest = this.sfx;
    if (ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.setValueAtTime(Math.max(-1, Math.min(1, pan * 1.1)), t);
      p.pan.linearRampToValueAtTime(-pan * 0.35, t + 0.2);
      p.connect(this.sfx);
      dest = p;
      this._wRelease([p], 0.5);
    }
    g.connect(dest);
    src.start(t, Math.random() * 1.5, 0.25);
    // The sonic crack of a close round.
    this._wHit({ t, type: 'highpass', freq: 5200, peak: 0.07, attack: 0.0005, decay: 0.012, pan: pan * 0.8 });
  };

  /** A hit marker: a tick for a hit, a bright ping for the head, a low thunk for a takedown. */
  P.hitConfirm = function (head, kill) {
    if (!this.ready) return;
    if (!head && !kill && !this._wGate('hit', 0.045)) return;
    const t = this.ctx.currentTime;
    const ui = this.ui;
    if (kill) {
      this._wTone({ t, freq: 190, freqEnd: 95, peak: 0.16, attack: 0.002, decay: 0.12, bus: ui });
      this._wTone({ t, freq: 1250, wave: 'triangle', peak: 0.07, attack: 0.001, decay: 0.09, bus: ui });
      this._wTone({ t: t + 0.06, freq: 940, wave: 'triangle', peak: 0.06, attack: 0.001, decay: 0.16, bus: ui });
      this._wHit({ t, type: 'highpass', freq: 4200, peak: 0.04, attack: 0.0006, decay: 0.02, bus: ui });
    }
    if (head) {
      this._wTone({ t, freq: 2350, wave: 'triangle', peak: 0.07, attack: 0.0008, decay: 0.14, bus: ui });
      this._wTone({ t, freq: 3530, peak: 0.03, attack: 0.0008, decay: 0.1, bus: ui });
    }
    if (!head && !kill) {
      this._wHit({ t, type: 'highpass', freq: 3800, peak: 0.05, attack: 0.0006, decay: 0.012, bus: ui });
      this._wTone({ t, freq: 1650, wave: 'triangle', peak: 0.045, attack: 0.0008, decay: 0.03, bus: ui });
    }
  };

  /** Jay is hit: a hard thump to the body, or the tack of a round stopped by the vest. */
  P.playerHit = function (pan = 0, armored = false) {
    if (!this.ready || !this._wGate('phit', 0.05)) return;
    const t = this.ctx.currentTime;
    const r = rnd(0.92, 1.08);
    const bus = this._wBus({ pan: clamp(fin(pan, 0), -1, 1) * 0.6, gain: 1, life: 0.8 });
    if (armored) {
      this._wHit({ t, freq: 2300 * r, q: 1.6, peak: 0.2, attack: 0.0006, decay: 0.035, bus });
      this._wTone({ t, freq: 700 * r, freqEnd: 560, wave: 'triangle', peak: 0.06, attack: 0.001, decay: 0.07, bus });
      this._wTone({ t, freq: 120 * r, freqEnd: 60, peak: 0.26, attack: 0.002, decay: 0.12, bus });
      this._wHit({ t, type: 'lowpass', brown: true, freq: 800, peak: 0.2, attack: 0.001, decay: 0.08, bus });
    } else {
      this._wTone({ t, freq: 105 * r, freqEnd: 45, peak: 0.4, attack: 0.002, decay: 0.18, bus });
      this._wHit({ t, type: 'lowpass', brown: true, freq: 600, peak: 0.34, attack: 0.001, decay: 0.14, bus });
      this._wHit({ t: t + 0.003, freq: 1300, q: 1.2, peak: 0.08, attack: 0.001, decay: 0.05, bus });
    }
  };

  // --------------------------------------------------------------- melee
  // Swing whooshes: [f0, f1, peak, attack, decay].
  const SWINGS = {
    fist: [420, 1500, 0.15, 0.04, 0.12],
    blunt: [260, 1100, 0.22, 0.07, 0.2],
    blade: [900, 3200, 0.13, 0.035, 0.1],
    metal: [380, 1800, 0.19, 0.06, 0.17],
    throw: [300, 1200, 0.16, 0.06, 0.18],
  };

  /** A swing through the air: 'fist' 'blunt' 'blade' 'metal' 'throw'. */
  P.meleeSwing = function (kind) {
    if (!this.ready) return;
    const s = SWINGS[MELEE_KINDS.indexOf(kind) >= 0 ? kind : 'fist'];
    const t = this.ctx.currentTime;
    const r = rnd(0.9, 1.1);
    this._wHit({ t, freq: s[0] * r, freqEnd: s[1] * r, q: 0.9, peak: s[2], attack: s[3], decay: s[4] });
    this._wHit({ t: t + 0.01, type: 'lowpass', freq: 500, freqEnd: 260, q: 0.7, peak: s[2] * 0.4, attack: s[3] * 0.8, decay: s[4] * 0.85 });
    // A long steel shaft whistles.
    if (kind === 'metal') this._wTone({ t: t + s[3] * 0.5, freq: 1300 * r, freqEnd: 2100 * r, peak: 0.018, attack: s[3] * 0.6, decay: s[4] * 0.7 });
    if (kind === 'throw') this._wHit({ t, freq: 1600, q: 0.7, peak: 0.04, attack: 0.02, decay: 0.08 });
  };

  /**
   * A landed blow: 'fist' 'blunt' (the bat's wooden crack) 'blade' 'metal'
   * (a ringing steel bar) 'throw'. true / false mean 'blunt' / 'fist'.
   */
  P.meleeHit = function (kind) {
    if (!this.ready) return;
    const k = kind === true ? 'blunt' : MELEE_KINDS.indexOf(kind) >= 0 ? kind : 'fist';
    const t = this.ctx.currentTime;
    const r = rnd(0.92, 1.08);
    const bus = this._wBus({ gain: 1, verb: 0.06, life: 0.9 });
    switch (k) {
      case 'blunt':
        this._wTone({ t, freq: 96 * r, freqEnd: 42, peak: 0.36, attack: 0.001, decay: 0.22, bus });
        this._wHit({ t, freq: 1100 * r, q: 1.8, peak: 0.28, attack: 0.0008, decay: 0.09, bus });
        this._wTone({ t, freq: 330 * r, freqEnd: 260, wave: 'triangle', peak: 0.12, attack: 0.001, decay: 0.12, bus });
        this._wHit({ t, type: 'lowpass', brown: true, freq: 700, peak: 0.22, attack: 0.001, decay: 0.16, bus });
        break;
      case 'metal': {
        this._wTone({ t, freq: 105 * r, freqEnd: 45, peak: 0.32, attack: 0.001, decay: 0.18, bus });
        this._wHit({ t, freq: 1300 * r, q: 1.6, peak: 0.22, attack: 0.0008, decay: 0.07, bus });
        this._wHit({ t, type: 'lowpass', brown: true, freq: 650, peak: 0.2, attack: 0.001, decay: 0.12, bus });
        const f = rnd(900, 1200);
        [[1, 0.05, 0.18], [2.76, 0.025, 0.1], [5.4, 0.012, 0.06]].forEach(([m, pk, dc]) => {
          this._wTone({ t, freq: f * m, wave: m === 1 ? 'triangle' : 'sine', peak: pk, attack: 0.0008, decay: dc, bus });
        });
        break;
      }
      case 'blade':
        this._wTone({ t, freq: 140 * r, freqEnd: 70, peak: 0.2, attack: 0.001, decay: 0.08, bus });
        this._wHit({ t, freq: 2400 * r, q: 1, peak: 0.1, attack: 0.002, decay: 0.05, bus });
        this._wHit({ t: t + 0.01, type: 'highpass', freq: 5000, peak: 0.04, attack: 0.002, decay: 0.03, bus });
        break;
      case 'throw':
        this._wTone({ t, freq: 160 * r, freqEnd: 80, peak: 0.18, attack: 0.001, decay: 0.08, bus });
        this._wHit({ t, type: 'lowpass', freq: 1000 * r, peak: 0.15, attack: 0.0008, decay: 0.05, bus });
        break;
      default: // fist
        this._wTone({ t, freq: 125 * r, freqEnd: 55, peak: 0.32, attack: 0.001, decay: 0.13, bus });
        this._wHit({ t, type: 'lowpass', freq: 1300 * r, peak: 0.26, attack: 0.0008, decay: 0.07, bus });
        this._wHit({ t, freq: 2300, q: 1, peak: 0.09, attack: 0.0006, decay: 0.035, bus });
    }
  };

  // -------------------------------------------------------------- thrown
  /** The pin pulled (a bright ting) and the lever springing off. */
  P.grenadePin = function () {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const bus = this._wBus({ gain: 1, life: 0.8 });
    this._wScrape(t, bus, 0.05, 2600, 3400, 0.05);
    this._wTone({ t: t + 0.04, freq: 3100, wave: 'triangle', peak: 0.05, attack: 0.001, decay: 0.15, bus });
    this._wTone({ t: t + 0.04, freq: 4650, peak: 0.02, attack: 0.001, decay: 0.1, bus });
    this._wClick(t + 0.26, bus, 2400, 0.06);
    this._wTone({ t: t + 0.26, freq: 1900, wave: 'triangle', peak: 0.03, attack: 0.001, decay: 0.12, bus });
  };

  /** A lighter flicked and the rag catching. */
  P.molotovLight = function () {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const bus = this._wBus({ gain: 1, life: 1 });
    this._wClick(t, bus, 2900, 0.06);
    this._wHit({ t: t + 0.02, type: 'highpass', freq: 3800, peak: 0.07, attack: 0.004, decay: 0.05, bus });
    this._wHit({ t: t + 0.12, type: 'lowpass', brown: true, freq: 300, freqEnd: 900, q: 0.8, peak: 0.2, attack: 0.05, decay: 0.35, bus });
    this._wHit({ t: t + 0.12, freq: 1400, q: 0.6, peak: 0.04, attack: 0.06, decay: 0.4, bus });
  };

  /** A limpet charge clamps on with a magnetic clunk and beeps twice as it arms. */
  P.limpetStick = function (pan = 0, gain = 1) {
    gain = fin(gain, 0);
    if (!this.ready || gain <= 0.001) return;
    const t = this.ctx.currentTime;
    const bus = this._wBus({ pan, gain, verb: 0.06, life: 0.8 });
    this._wTone({ t, freq: 180, freqEnd: 110, peak: 0.3, attack: 0.001, decay: 0.1, bus });
    this._wClack(t, bus, 620, 0.14);
    for (const dt of [0.18, 0.3]) this._wTone({ t: t + dt, freq: 2400, wave: 'square', peak: 0.035, attack: 0.002, decay: 0.05, lowpass: 5000, bus });
  };

  /** The detonator's switch and a rising chirp. */
  P.detonatorClick = function () {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const bus = this._wBus({ gain: 1, life: 0.6 });
    this._wClick(t, bus, 2000, 0.12);
    this._wClack(t + 0.01, bus, 900, 0.08);
    this._wTone({ t: t + 0.04, freq: 1800, freqEnd: 2600, wave: 'triangle', peak: 0.05, attack: 0.004, decay: 0.09, bus: this.ui });
  };

  P.grenadeBounce = function (pan = 0, gain = 1) {
    gain = fin(gain, 0);
    if (!this.ready || gain <= 0.001) return;
    const t = this.ctx.currentTime;
    const f = rnd(1250, 1750);
    const bus = this._wBus({ pan, gain, verb: 0.08, life: 0.6 });
    this._wHit({ t, freq: 2600, q: 1.1, peak: 0.12, attack: 0.0006, decay: 0.025, bus });
    this._wTone({ t, freq: f, wave: 'triangle', peak: 0.075, attack: 0.0008, decay: 0.14, bus });
    this._wTone({ t, freq: f * 2.31, peak: 0.03, attack: 0.0008, decay: 0.08, bus });
    this._wTone({ t, freq: 300, freqEnd: 220, peak: 0.06, attack: 0.001, decay: 0.05, bus });
  };

  /** Glass shattering, then the whoomph of fuel catching and a crackle. */
  P.molotovBurst = function (pan = 0, gain = 1) {
    gain = fin(gain, 0);
    if (!this.ready || gain <= 0.001) return;
    const t = this.ctx.currentTime;
    const bus = this._wBus({ pan, gain, verb: 0.2, echo: 0.06, life: 2.5 });
    this._wHit({ t, type: 'highpass', freq: 3000, peak: 0.24, attack: 0.0006, decay: 0.25, bus });
    this._wHit({ t, freq: 1400, q: 0.9, peak: 0.12, attack: 0.001, decay: 0.08, bus });
    for (let i = 0; i < 12; i++) this._wTinkle(t + rnd(0.01, 0.45), bus, rnd(2600, 7000), rnd(0.018, 0.04), rnd(-0.3, 0.3));
    this._wHit({ t: t + 0.04, type: 'lowpass', brown: true, freq: 180, freqEnd: 1100, q: 0.9, peak: 0.42, attack: 0.08, decay: 0.9, bus });
    this._wTone({ t: t + 0.04, freq: 72, freqEnd: 48, peak: 0.2, attack: 0.06, decay: 0.7, bus });
    for (let i = 0; i < 12; i++) {
      this._wHit({ t: t + rnd(0.2, 1.4), type: 'highpass', freq: rnd(2200, 4200), peak: rnd(0.02, 0.055), attack: 0.001, decay: rnd(0.01, 0.03), bus });
    }
  };

  // ------------------------------------------------------------------ UI
  /** Into the scope (a soft lens slide and a click) or back out of it. */
  P.scope = function (on) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const bus = this._wBus({ gain: 1, life: 0.6 });
    if (on) {
      this._wHit({ t, freq: 900, freqEnd: 2200, q: 1.2, peak: 0.04, attack: 0.05, decay: 0.12, bus });
      this._wClick(t + 0.1, bus, 2600, 0.04);
    } else {
      this._wHit({ t, freq: 2000, freqEnd: 800, q: 1.2, peak: 0.03, attack: 0.03, decay: 0.1, bus });
      this._wClick(t + 0.06, bus, 2100, 0.025);
    }
  };

  /** A weapon or ammo pickup: a bright two-note chime plus a little handling clack. */
  P.pickup = function () {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    this._wTone({ t, freq: 1318.5, wave: 'triangle', peak: 0.12, decay: 0.22, bus: this.ui });
    this._wTone({ t: t + 0.075, freq: 1975.5, wave: 'triangle', peak: 0.11, decay: 0.35, bus: this.ui });
    this._wTone({ t: t + 0.075, freq: 3951, peak: 0.025, decay: 0.3, bus: this.ui });
    this._wHit({ t: t + 0.05, type: 'highpass', freq: 6500, q: 0.4, peak: 0.03, attack: 0.02, decay: 0.3, bus: this.ui });
    const bus = this._wBus({ gain: 1, life: 0.5 });
    this._wClack(t, bus, 760, 0.09);
  };

  /** A new gun: the chime, then it is checked over (a clack-clack). */
  P.weaponPickup = function () {
    if (!this.ready) return;
    this.pickup();
    const t = this.ctx.currentTime;
    const bus = this._wBus({ gain: 1, life: 0.8 });
    this._wScrape(t + 0.16, bus, 0.07, 1000, 2000, 0.04);
    this._wClack(t + 0.24, bus, 820, 0.12);
    this._wClick(t + 0.244, bus, 2900, 0.05);
  };

  /** Rounds rattling in a box, and a short chime. */
  P.ammoPickup = function () {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const bus = this._wBus({ gain: 1, life: 0.8 });
    this._wHit({ t, type: 'lowpass', freq: 900, peak: 0.1, attack: 0.002, decay: 0.06, bus });
    for (let i = 0; i < 6; i++) this._wTinkle(t + 0.02 + i * rnd(0.025, 0.045), bus, rnd(2800, 4600), 0.02, rnd(-0.2, 0.2));
    this._wTone({ t: t + 0.05, freq: 1567.98, wave: 'triangle', peak: 0.08, decay: 0.25, bus: this.ui });
  };

  /** A warm rising chime. */
  P.healthPickup = function () {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const ui = this.ui;
    this._wTone({ t, freq: 659.25, wave: 'triangle', peak: 0.1, attack: 0.01, decay: 0.3, bus: ui });
    this._wTone({ t: t + 0.09, freq: 880, wave: 'triangle', peak: 0.1, attack: 0.01, decay: 0.4, bus: ui });
    this._wTone({ t: t + 0.18, freq: 1318.5, peak: 0.05, attack: 0.01, decay: 0.45, bus: ui });
    this._wHit({ t: t + 0.08, type: 'highpass', freq: 7000, q: 0.4, peak: 0.02, attack: 0.03, decay: 0.3, bus: ui });
  };

  /** Straps pulled tight (a rip of hook-and-loop), a plate knock and a low chime. */
  P.armorPickup = function () {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const bus = this._wBus({ gain: 1, life: 0.8 });
    for (let i = 0; i < 9; i++) this._wHit({ t: t + i * 0.018, freq: rnd(1800, 2600), q: 1.2, peak: rnd(0.04, 0.07), attack: 0.002, decay: 0.012, bus });
    this._wTone({ t: t + 0.2, freq: 220, freqEnd: 160, peak: 0.14, attack: 0.002, decay: 0.1, bus });
    this._wHit({ t: t + 0.2, freq: 1300, q: 1.4, peak: 0.08, attack: 0.001, decay: 0.04, bus });
    this._wTone({ t: t + 0.22, freq: 987.77, wave: 'triangle', peak: 0.08, decay: 0.3, bus: this.ui });
    this._wTone({ t: t + 0.22, freq: 1479.98, peak: 0.03, decay: 0.3, bus: this.ui });
  };

  /** Drawing a weapon: a cloth rustle, then the sound of that kind of weapon in the hand. */
  P.weaponSwitch = function (weaponId) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const def = weaponDef(weaponId);
    const slot = def ? def.slot : 'pistol';
    const bus = this._wBus({ gain: 1, life: 0.8 });
    this._wHit({ t, freq: 1800, q: 0.7, peak: slot === 'unarmed' ? 0.045 : 0.07, attack: 0.025, decay: 0.1, bus });
    switch (slot) {
      case 'unarmed':
        break;
      case 'melee':
        this._wTone({ t: t + 0.08, freq: 260, freqEnd: 200, wave: 'triangle', peak: 0.07, attack: 0.002, decay: 0.06, bus });
        this._wHit({ t: t + 0.08, type: 'lowpass', freq: 900, peak: 0.07, attack: 0.002, decay: 0.04, bus });
        if (def && (def.id === 'crowbar' || def.id === 'golfclub')) this._wTone({ t: t + 0.08, freq: rnd(1500, 1800), peak: 0.012, attack: 0.001, decay: 0.2, bus });
        break;
      case 'thrown':
        if (def && def.id === 'molotov') this._wTinkle(t + 0.08, bus, rnd(2100, 2500), 0.03);
        else this._wClack(t + 0.08, bus, 900, 0.06);
        break;
      case 'heavy':
        this._wTone({ t: t + 0.1, freq: 120, freqEnd: 70, peak: 0.16, attack: 0.002, decay: 0.12, bus });
        this._wClack(t + 0.12, bus, 520, 0.14);
        this._wTinkle(t + 0.18, bus, rnd(2600, 3200), 0.015);
        break;
      case 'shotgun':
      case 'rifle':
      case 'sniper':
        this._wTinkle(t + 0.04, bus, rnd(2600, 3200), 0.012);
        this._wClick(t + 0.07, bus, 2200, 0.07);
        this._wClack(t + 0.12, bus, 700, 0.12);
        break;
      default:
        this._wClick(t + 0.06, bus, 2300, 0.07);
        this._wClack(t + 0.11, bus, 820, 0.1);
    }
  };

  /** The soft tick as the weapon wheel's highlight moves. */
  P.wheelTick = function () {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    if (this._wTickAt !== undefined && t - this._wTickAt < 0.035) return;
    this._wTickAt = t;
    this._wTone({ t, freq: 2150, wave: 'triangle', peak: 0.04, attack: 0.001, decay: 0.03, bus: this.ui });
    this._wHit({ t, type: 'highpass', freq: 5000, peak: 0.02, attack: 0.0006, decay: 0.012, bus: this.ui });
  };

  VH.AudioEngine.weaponSoundProfiles = Object.keys(SHOTS);
  VH.AudioEngine.weaponSoundProfile = (weaponId) => profileFor(weaponId).p;
  VH.AudioEngine.reloadStyles = Object.keys(RELOADS);
  VH.AudioEngine.impactSurfaces = SURFACES.slice();
  VH.AudioEngine.meleeKinds = MELEE_KINDS.slice();
})();
