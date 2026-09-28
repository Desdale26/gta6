/*
 * dialogue.js — how people talk in Vicehaven.
 *
 *   subtitles   speaker name in their colour, stage directions in italics
 *   voices      the browser's own text-to-speech (Edge ships good natural
 *               voices), a distinct voice, pitch and pace per character.
 *               Optional (Settings → Gameplay → Voiced dialogue)
 *   modes       ambient (while you play: car banter, phone calls), scene
 *               (letterboxed cutscene: Space skips a line), blackout (text on
 *               black for memories and interiors), radio (police dispatch)
 *   extras      text messages, a choice prompt (keys 1–3), the strong
 *               language filter (Settings → Accessibility)
 */
(function () {
  'use strict';

  const VH = window.VH;
  const el = (tag, cls, text) => VH.util.el(tag, cls, text);

  const STRONG = /\b(fuck(?:ing|ed|er|s)?|motherfucker|shit(?:ty|s|head)?|bullshit|bitch(?:es)?|asshole|bastard|dick(?:head)?|piss(?:ed)?|cocksucker|goddamn)\b/gi;

  const FEMALE_HINTS = /zira|aria|jenny|michelle|sonia|libby|natasha|clara|emma|ava|hazel|susan|linda|heera|samantha|victoria|karen|moira|tessa|fiona|female|salli|joanna|kendra|kimberly|ivy|amber|ana|ashley|cora|elizabeth|jane|nancy|sara|serena|molly|maisie|abbi|bella|hollie|olivia|mia/i;
  const MALE_HINTS = /david|guy|mark|george|ryan|christopher|eric|roger|steffan|brian|andrew|daniel|alex|fred|male|james|william|thomas|liam|noah|oliver|elliot|jacob|jason|tony|davis|brandon|christian|matthew|joey|justin|kevin|russell|william/i;

  class Dialogue {
    constructor(game) {
      this.game = game;
      this.settings = game.settings;
      this.cast = {
        jay: { name: 'Jay', color: '#ffb347', voice: { gender: 'male', pitch: 0.95, rate: 1.0 } },
        caption: { name: '', color: '#9ea9c7', voice: null },
        DISPATCH: { name: 'Dispatch', color: '#56b4ff', voice: { gender: 'female', pitch: 1.05, rate: 1.1 } },
      };
      this.queue = [];
      this.current = null;
      this.active = false;
      this.mode = null;
      this._voices = [];
      this._voiceMap = new Map();
      this._build();
      this._loadVoices();
    }

    _build() {
      const root = (this.root = el('div', 'dlg'));
      this.sub = el('div', 'dlg-sub');
      this.subName = el('div', 'dlg-name');
      this.subText = el('div', 'dlg-text');
      this.sub.append(this.subName, this.subText);
      this.bars = el('div', 'dlg-letterbox');
      this.bars.append(el('div', 'bar top'), el('div', 'bar bottom'));
      this.skipHint = el('div', 'dlg-skip');
      this.blackout = el('div', 'dlg-blackout');
      this.blackText = el('div', 'dlg-black-text');
      this.blackout.append(this.blackText);
      this.phone = el('div', 'dlg-phone');
      this.phoneWho = el('div', 'dlg-phone-who');
      this.phone.append(el('div', 'dlg-phone-icon', '📱'), this.phoneWho);
      this.choiceBox = el('div', 'dlg-choice');
      this.radioBox = el('div', 'dlg-radio');
      root.append(this.bars, this.blackout, this.phone, this.choiceBox, this.radioBox, this.sub, this.skipHint);
      document.body.append(root);
      window.addEventListener('keydown', (e) => this._onKey(e), true);
    }

    /** Register characters from story data: { id: { name, voice, color? } }. */
    addCast(characters) {
      const palette = ['#ff7a59', '#35e0d0', '#ff4f8b', '#b48cff', '#7dffa8', '#ffd166', '#56b4ff', '#ff9f1c', '#f78fb3', '#9be15d', '#e0c3fc', '#8fd3fe'];
      let i = 0;
      for (const id of Object.keys(characters)) {
        const c = characters[id];
        this.cast[id] = {
          name: c.short || (c.name || id).split(' ')[0],
          fullName: c.name,
          color: c.color || palette[i++ % palette.length],
          voice: c.voice || { gender: 'male', pitch: 1, rate: 1 },
        };
      }
      if (characters.jay) this.cast.jay.color = '#ffb347';
    }

    // ------------------------------------------------------------ voices
    _loadVoices() {
      if (!('speechSynthesis' in window)) return;
      const load = () => {
        const all = window.speechSynthesis.getVoices() || [];
        const en = all.filter((v) => /^en/i.test(v.lang));
        // Natural (neural) voices first.
        en.sort((a, b) => (/natural|neural|online/i.test(b.name) ? 1 : 0) - (/natural|neural|online/i.test(a.name) ? 1 : 0));
        this._voices = en;
        this._voiceMap.clear();
      };
      load();
      window.speechSynthesis.addEventListener && window.speechSynthesis.addEventListener('voiceschanged', load);
    }

    _voiceFor(id) {
      if (this._voiceMap.has(id)) return this._voiceMap.get(id);
      const c = this.cast[id];
      if (!c || !c.voice || !this._voices.length) return null;
      const want = c.voice.gender === 'female' ? FEMALE_HINTS : MALE_HINTS;
      let pool = this._voices.filter((v) => want.test(v.name));
      if (!pool.length) pool = this._voices;
      // Spread characters over the available voices (stable per id).
      let h = 0;
      for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
      const natural = pool.filter((v) => /natural|neural|online/i.test(v.name));
      const use = natural.length >= 2 ? natural : pool;
      const v = use[h % use.length];
      this._voiceMap.set(id, v);
      return v;
    }

    _speak(id, text, onEnd) {
      if (!this.settings.get('gameplay.voicedDialogue') && id !== 'DISPATCH') return false;
      if (!('speechSynthesis' in window) || !this._voices.length) return false;
      const c = this.cast[id];
      if (!c || !c.voice) return false;
      const spoken = this._clean(text, true);
      if (!spoken.trim()) return false;
      try {
        const u = new SpeechSynthesisUtterance(spoken);
        const v = this._voiceFor(id);
        if (v) u.voice = v;
        u.pitch = VH.math.clamp(c.voice.pitch || 1, 0.5, 1.6);
        u.rate = VH.math.clamp(c.voice.rate || 1, 0.7, 1.4);
        u.volume = VH.math.clamp(this.settings.get('audio.dialogue') * this.settings.get('audio.master'), 0, 1);
        u.onend = () => onEnd && onEnd();
        u.onerror = () => onEnd && onEnd();
        window.speechSynthesis.speak(u);
        return true;
      } catch (err) {
        return false;
      }
    }

    _stopSpeech() {
      if ('speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
        } catch (err) {
          /* ignore */
        }
      }
    }

    /** Stage directions come out; with the filter on, strong words are masked. */
    _clean(text, forSpeech) {
      let t = text;
      if (forSpeech) t = t.replace(/\([^)]*\)/g, ' ');
      if (!this.settings.get('accessibility.strongLanguage')) {
        t = t.replace(STRONG, (w) => (forSpeech ? '' : w[0] + '*'.repeat(Math.max(1, w.length - 2)) + w[w.length - 1]));
      }
      return t.replace(/\s+/g, ' ').trim();
    }

    _html(text) {
      const safe = this._clean(text, false).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
      return safe.replace(/\(([^)]*)\)/g, '<i>$1</i>');
    }

    // ------------------------------------------------------------- lines
    /**
     * Play lines. opts.mode: 'ambient' | 'scene' | 'phone' | 'blackout'.
     * Resolves when the last line has finished (or everything was skipped).
     */
    play(lines, opts) {
      opts = opts || {};
      return new Promise((resolve) => {
        const job = { lines: lines.slice(), mode: opts.mode || 'ambient', resolve, from: opts.from, i: 0 };
        if (job.mode === 'ambient') {
          this.queue.push(job);
          if (!this.current) this._next();
        } else {
          // Scenes interrupt whatever is being said.
          this._finishCurrent(true);
          this.queue = this.queue.filter((q) => q.mode !== 'ambient' || (q.resolve(), false));
          this.queue.unshift(job);
          this._next();
        }
      });
    }

    _next() {
      const job = this.queue.shift();
      if (!job) {
        this.current = null;
        this.active = false;
        this._setMode(null);
        return;
      }
      this.current = job;
      this.active = true;
      this._setMode(job.mode, job);
      this._line();
    }

    _setMode(mode, job) {
      this.mode = mode;
      this.root.classList.toggle('scene', mode === 'scene');
      this.root.classList.toggle('blackout-on', mode === 'blackout');
      this.root.classList.toggle('phone-on', mode === 'phone');
      if (mode === 'phone' && job) {
        const c = this.cast[job.from] || { name: job.from };
        this.phoneWho.textContent = (c.fullName || c.name || '').toUpperCase();
      }
      this.skipHint.textContent = mode === 'scene' || mode === 'blackout' ? 'Space  skip line' : '';
      if (!mode) {
        this.sub.classList.remove('show');
        this.blackText.innerHTML = '';
      }
      if (this.game.radio) this.game.radio.setDucked(mode ? 0.65 : 0);
    }

    _line() {
      const job = this.current;
      if (!job) return;
      if (job.i >= job.lines.length) {
        const r = job.resolve;
        this.current = null;
        r();
        this._next();
        return;
      }
      const [who, text] = job.lines[job.i];
      const c = this.cast[who] || { name: who, color: '#ffffff', voice: { gender: 'male', pitch: 1, rate: 1 } };
      const showSubs = this.settings.get('accessibility.subtitles') || job.mode === 'blackout' || !this.settings.get('gameplay.voicedDialogue');
      if (job.mode === 'blackout') {
        const p = el('p', who === 'caption' ? 'cap' : 'line');
        if (who !== 'caption') {
          const n = el('span', 'who', c.name);
          n.style.color = c.color;
          p.append(n);
        }
        const t = el('span', 'txt');
        t.innerHTML = this._html(text);
        p.append(t);
        this.blackText.append(p);
        while (this.blackText.children.length > 5) this.blackText.firstChild.remove();
      } else if (showSubs) {
        this.subName.textContent = who === 'caption' ? '' : c.name;
        this.subName.style.color = c.color;
        this.subText.innerHTML = this._html(text);
        this.sub.classList.remove('show');
        void this.sub.offsetWidth;
        this.sub.classList.add('show');
      }
      const chars = this._clean(text, true).length;
      const base = VH.math.clamp(1.0 + chars * 0.058, 1.7, 9.5) * (job.mode === 'blackout' ? 1.25 : 1);
      job.until = performance.now() + base * 1000;
      job.spoken = false;
      job.speechDone = true;
      if (who !== 'caption' && job.mode !== 'blackout') {
        job.speechDone = !this._speak(who, text, () => {
          job.speechDone = true;
        });
        job.spoken = !job.speechDone;
        // Never wait for a voice forever.
        job.hardUntil = performance.now() + base * 1800;
      }
      this._speaker = who;
      VH.events.emit('dialogue:line', { who, text, mode: job.mode });
    }

    get speaker() {
      return this.current ? this._speaker : null;
    }

    update() {
      const job = this.current;
      if (!job || job.i >= job.lines.length) return;
      const now = performance.now();
      const timeUp = now >= job.until && (job.speechDone || now >= job.hardUntil);
      if (timeUp) {
        job.i++;
        this._line();
      }
    }

    /** Space / Enter during a scene: next line. */
    skipLine() {
      const job = this.current;
      if (!job || (job.mode !== 'scene' && job.mode !== 'blackout')) return;
      this._stopSpeech();
      job.i++;
      this._line();
    }

    _finishCurrent(silent) {
      if (!this.current) return;
      this._stopSpeech();
      const r = this.current.resolve;
      this.current = null;
      if (!silent || true) r();
    }

    /** Stop everything (mission failed, quit to title). */
    stop() {
      this._stopSpeech();
      if (this.current) this.current.resolve();
      for (const q of this.queue) q.resolve();
      this.queue = [];
      this.current = null;
      this.active = false;
      this._setMode(null);
      this.letterbox(false);
      this.choiceBox.classList.remove('show');
      if (this._choice) {
        this._choice.resolve(0);
        this._choice = null;
      }
    }

    letterbox(on) {
      this.bars.classList.toggle('on', !!on);
    }

    /** Police radio chatter: a caption in the corner, spoken if allowed. */
    radio(name, text, voiced) {
      const box = el('div', 'dlg-radio-line');
      box.append(el('span', 'tag', '◉ ' + name), el('span', 'txt', this._clean(text, false)));
      this.radioBox.prepend(box);
      while (this.radioBox.children.length > 3) this.radioBox.lastChild.remove();
      requestAnimationFrame(() => box.classList.add('in'));
      setTimeout(() => {
        box.classList.remove('in');
        setTimeout(() => box.remove(), 500);
      }, 5200);
      if (voiced && !this.active) this._speak('DISPATCH', text);
    }

    /** A text message. */
    text(from, message) {
      const c = this.cast[from] || { name: from, fullName: from };
      this.game.hud.notify({ title: '✉ ' + (c.fullName || c.name), text: this._clean(message, false), icon: '📱', duration: 7000 });
      if (this.game.audio.ready) this.game.audio.click();
    }

    /**
     * A choice prompt: resolves with the index picked (keys 1–3, or clicking).
     * While it's open, time keeps running (so choices under pressure feel tense).
     */
    choice(prompt, options) {
      return new Promise((resolve) => {
        const box = this.choiceBox;
        box.innerHTML = '';
        box.append(el('div', 'dlg-choice-prompt', prompt));
        options.forEach((o, i) => {
          const b = el('button', 'dlg-choice-opt');
          b.append(el('kbd', '', String(i + 1)), el('span', '', o.label));
          b.addEventListener('click', () => this._pick(i));
          box.append(b);
        });
        box.classList.add('show');
        this._choice = { resolve, n: options.length };
        document.exitPointerLock && document.exitPointerLock();
      });
    }

    _pick(i) {
      if (!this._choice) return;
      const c = this._choice;
      this._choice = null;
      this.choiceBox.classList.remove('show');
      if (this.game.audio.ready) this.game.audio.click();
      if (this.game.input && this.game.state === 'playing') this.game.input.requestLock();
      c.resolve(i);
    }

    _onKey(e) {
      if (this._choice) {
        const n = parseInt(e.key, 10);
        if (n >= 1 && n <= this._choice.n) {
          e.preventDefault();
          e.stopPropagation();
          this._pick(n - 1);
        }
        return;
      }
      if (this.current && (this.current.mode === 'scene' || this.current.mode === 'blackout') && (e.code === 'Space' || e.code === 'Enter')) {
        e.preventDefault();
        this.skipLine();
      }
    }
  }

  Dialogue.STRONG = STRONG;
  VH.Dialogue = Dialogue;
})();
