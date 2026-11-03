/*
 * storylog.js — "Story so far": where Jay is in the story, for everybody who
 * skips the cutscenes (most people do).
 *
 * The recaps live in js/data/recap-act1.js to recap-act4.js
 * (VH.Data.story.recap); this file reads them against the flags and the jobs
 * done, and gives the pause menu's Story so far screen (ui.js) and the
 * phone's Story app (phone.js) one model of the story. A stub or half-written
 * recap file never breaks it: a job without a recap falls back to its
 * summary line.
 *
 * It also:
 *   remembers which option each choice took (choices that set no flag can't
 *     be read back from the flags), committed when the job passes
 *   shows "Previously in Vicehaven…" a few seconds into a continued save
 *   counts the scene lines skipped (it wraps dialogue.play and skipLine):
 *     the first scene mostly skipped brings a one-off hint, and a story job
 *     passed with a scene mostly skipped brings "Story so far: <job>" with
 *     its one-liner once the job-result card has gone
 *
 *   game.storyLog.text(parts)   recap parts → a string, for the flags as they stand
 *   game.storyLog.model()       { prologue, now, next, acts, side, who, choices, ending }
 *                               (see model() for the shape)
 *   game.storyLog.previously()  { line, next, place } for the Previously card
 *   game.storyLog.cardUp        true while the Previously card is on screen
 *
 * Saved under 'storylog': { picked: { jobId: [labels] }, order: [jobIds], hint }.
 * A save from before this file loads with nothing picked: choices that set a
 * flag still show, and a choice whose only flagless option must have been
 * the one taken is worked out from the flags.
 */
(function () {
  'use strict';

  const VH = window.VH;
  const el = (tag, cls, text) => VH.util.el(tag, cls, text);

  const ENDINGS = [['ending_a', 'Taillights'], ['ending_b', 'The Long Way Home'], ['ending_c', 'Wheelman']];
  const CARD_SECONDS = 10; //  the Previously card stays this long (playing time)
  const CARD_DELAY = 2.5; //   ...and comes this long after play starts (the intro card has gone)
  const SKIP_SHARE = 0.6; //   a scene counts as skipped with this share of its lines skipped
  const SKIP_MIN = 4; //       ...and at least this many
  const RESULT_WAIT = 1.5; //  quiet seconds after a job passes (the result card counts as busy)
  const MAX_ORDER = 120;

  /** Run a read; anything it throws gives the fallback. */
  function safe(fn, fallback) {
    try {
      const v = fn();
      return v === undefined ? fallback : v;
    } catch (err) {
      return fallback;
    }
  }

  function testFlag(flags, expr) {
    if (VH.MissionEngine && VH.MissionEngine.testFlag) return VH.MissionEngine.testFlag(flags, expr);
    if (Array.isArray(expr)) return expr.every((e) => testFlag(flags, e));
    if (typeof expr === 'string' && expr.startsWith('!')) return !flags[expr.slice(1)];
    return !!flags[expr];
  }

  function story() {
    return (VH.Data && VH.Data.story) || {};
  }

  /** The recap data (an act file that is still a stub adds nothing to it). */
  function recap() {
    const R = story().recap;
    return R && typeof R === 'object' ? R : {};
  }

  /** Every choice step in a job: [{ prompt, options: [{ label, flag }], top }] (top: not inside a branch). */
  function choiceSteps(m) {
    const out = [];
    const walk = (steps, top) => {
      for (const s of steps || []) {
        if (!s || typeof s !== 'object') continue;
        if (s.choice && Array.isArray(s.choice.options)) {
          out.push({ prompt: s.choice.prompt || '', options: s.choice.options.map((o) => ({ label: o.label || '', flag: o.flag || null })), top });
          for (const o of s.choice.options) walk(o.then, false);
        }
        if (s.then) walk(s.then, false);
        if (s.else) walk(s.else, false);
      }
    };
    walk(m && m.steps, true);
    return out;
  }

  /** '#rrggbb' from a three.js colour number. */
  function hex(n) {
    return typeof n === 'number' ? '#' + (n & 0xffffff).toString(16).padStart(6, '0') : null;
  }

  /** A pale colour (white shirts): an initial on it wants dark ink. */
  function pale(n) {
    if (typeof n !== 'number') return false;
    return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255 > 0.62;
  }

  // ================================================================ system
  class StoryLog {
    constructor(game) {
      this.game = game;
      this.saveKey = 'storylog';
      this.picked = {}; //   job id → the option labels chosen in it, in order (committed on a pass)
      this.order = []; //    story jobs in the order they were passed (oldest first)
      this.hintShown = false;
      this.cardUp = false;
      this._run = null; //   the job running: { id, picks: [{ label, flag, cp }] }
      this._skim = null; //  the job running, if a scene in it was mostly skipped
      this._queue = []; //   notifies waiting for a quiet moment: { kind, id, wait }
      this._prev = null; //  the Previously card, waiting to be shown: { t, waited }
      this._cardT = 0;
      this._buildCard();
      this._bind();
      this._hookDialogue();
    }

    _bind() {
      VH.events.on('mission:start', (e) => this._onStart(e && e.m));
      VH.events.on('mission:choice', (e) => this._onChoice(e || {}));
      VH.events.on('mission:pass', (e) => this._onPass(e && e.m));
    }

    // ------------------------------------------------------------ choices
    _onStart(m) {
      if (!m) return;
      const run = this.game.missions && this.game.missions.run;
      const cp = (run && run.checkpoint) || 0;
      // A retry from a checkpoint keeps the choices made before it (they're not asked again).
      if (this._run && this._run.id === m.id && cp > 0) this._run.picks = this._run.picks.filter((p) => p.cp < cp);
      else this._run = { id: m.id, picks: [] };
      if (this._skim !== m.id) this._skim = null; // a retry keeps what was skipped the first time
      if (this.cardUp) this.hideCard();
      this._prev = null; // a job under way: no Previously card now
    }

    _onChoice(e) {
      const run = this.game.missions && this.game.missions.run;
      if (!run || !run.m) return;
      if (!this._run || this._run.id !== run.m.id) this._run = { id: run.m.id, picks: [] };
      this._run.picks.push({ label: String(e.label || ''), flag: e.flag || null, cp: run.checkpoint || 0 });
    }

    _onPass(m) {
      if (!m) return;
      if (this._run && this._run.id === m.id) {
        const labels = this._run.picks.map((p) => p.label).filter(Boolean);
        if (labels.length) this.picked[m.id] = labels;
        else delete this.picked[m.id];
      }
      this._run = null;
      if (!(m._main || m._chain)) return;
      const i = this.order.indexOf(m.id);
      if (i >= 0) this.order.splice(i, 1);
      this.order.push(m.id);
      if (this.order.length > MAX_ORDER) this.order.splice(0, this.order.length - MAX_ORDER);
      // Scenes skipped: say what happened once the result card has gone.
      if (this._skim === m.id) this._queue.push({ kind: 'added', id: m.id, wait: RESULT_WAIT });
      this._skim = null;
    }

    // ------------------------------------------------------------ skipping
    /** Count the lines skipped in each scene (Space or Enter in dialogue.js). */
    _hookDialogue() {
      const d = this.game.dialogue;
      if (!d || d._storyHooked || typeof d.play !== 'function' || typeof d.skipLine !== 'function') return;
      d._storyHooked = true;
      const play = d.play.bind(d);
      const skip = d.skipLine.bind(d);
      d.play = (lines, opts) => {
        const done = play(lines, opts);
        const mode = opts && opts.mode;
        const job = d.current;
        // A scene starts at once (it interrupts whatever was being said), so it's the current job now.
        if ((mode === 'scene' || mode === 'blackout') && job && job.mode === mode && lines && lines.length) {
          const n = lines.length;
          done.then(() => this._sceneOver(job, n));
        }
        return done;
      };
      d.skipLine = () => {
        const job = d.current;
        if (job && (job.mode === 'scene' || job.mode === 'blackout') && job.i < job.lines.length) job._skipped = (job._skipped || 0) + 1;
        return skip();
      };
    }

    _sceneOver(job, n) {
      const skipped = job._skipped || 0;
      if (skipped < SKIP_MIN || skipped / n < SKIP_SHARE) return;
      const run = this.game.missions && this.game.missions.run;
      if (run && run.m && (run.m._main || run.m._chain)) this._skim = run.m.id;
      if (!this.hintShown && !this._queue.some((q) => q.kind === 'hint')) this._queue.unshift({ kind: 'hint', wait: 1.2 });
    }

    // ------------------------------------------------------------- text
    _flags() {
      const m = this.game.missions;
      return Object.assign({}, m ? m.completed : {}, m ? m.flags : {});
    }

    /** Recap parts (a string, or strings and { if, text } objects) → one string for these flags. */
    text(parts, flags) {
      const f = flags || this._flags();
      const out = [];
      const add = (p, depth) => {
        if (p === null || p === undefined || depth > 6) return;
        if (typeof p === 'string') {
          const s = p.trim();
          if (s) out.push(s);
        } else if (Array.isArray(p)) {
          for (const q of p) add(q, depth + 1);
        } else if (typeof p === 'object') {
          if (p.if !== undefined && p.if !== null && !testFlag(f, p.if)) return;
          add(p.text, depth + 1);
        }
      };
      try {
        add(parts, 0);
      } catch (err) {
        return '';
      }
      return out.join(' ').replace(/\s+/g, ' ').trim();
    }

    _name(id) {
      if (!id) return '';
      const c = (story().characters || {})[id];
      return c && c.name ? c.name : '';
    }

    /** Where a job starts: { x, z, name } or null (a job that starts by itself waits at its resumeAt). */
    _where(m) {
      const g = this.game;
      const self = VH.MissionEngine && VH.MissionEngine.selfStarting ? VH.MissionEngine.selfStarting(m) : false;
      const id = self ? m.resumeAt : m.start;
      if (!id || !g.places) return null;
      const p = safe(() => g.places.get(id), null);
      if (!p || typeof p.x !== 'number' || typeof p.z !== 'number') return null;
      const def = (story().places || {})[id];
      return { x: p.x, z: p.z, name: p.name || (def && def.name) || 'the job marker' };
    }

    /** Older first: the order jobs were passed in, then (for a save from before this file) story order. */
    _rank(id) {
      const i = this.order.indexOf(id);
      if (i >= 0) return 1000 + i;
      return this._storyPos(id);
    }

    _storyPos(id) {
      const ms = this.game.missions;
      const m = ms && ms.all && ms.all.get(id);
      if (!m) return 999;
      if (m._main) return m._index || 0;
      if (m._chain) {
        const at = ms.all.get(m._chain.unlockAfter);
        const k = m._chain.missions.indexOf(m);
        return (at && at._main ? at._index || 0 : 0) + 0.5 + k * 0.01;
      }
      return 999;
    }

    _job(m, state, flags, n) {
      const r = (recap().jobs || {})[m.id] || {};
      const shown = state !== 'locked';
      const t = (k) => (shown ? this.text(r[k], flags) || m.summary || '' : '');
      return {
        id: m.id, title: m.title || m.id, act: m.act || 0, n, state,
        recap: state === 'done' ? t('recap') : '',
        setup: state === 'current' || state === 'next' ? t('setup') : '',
        line: state === 'done' ? t('line') : '',
        giver: shown ? this._name(m.giver) : '',
        place: state === 'next' ? this._where(m) : null,
        auto: !!(VH.MissionEngine && VH.MissionEngine.selfStarting && VH.MissionEngine.selfStarting(m)),
        chain: m._chain ? m._chain.id : null,
      };
    }

    _endingName(flags) {
      for (const [f, name] of ENDINGS) if (flags[f]) return name;
      return '';
    }

    // ------------------------------------------------------------- model
    /**
     * Everything the screens show:
     *   prologue   string
     *   now        { kind: 'mission'|'next'|'done', id, title, text, objective, place, giver, act, side }
     *   next       the next main job (a job, as in acts[].jobs) or null
     *   acts       [{ n, title, intro, outro, state: 'done'|'current'|'locked', done, total,
     *                 jobs: [{ id, title, act, n, state: 'done'|'current'|'next'|'locked',
     *                          recap, setup, line, giver, place: { x, z, name } | null }] }]
     *   side       [{ id, title, giver, state: 'done'|'current'|'available'|'locked', done, total, jobs }]
     *   who        [{ id, name, role, bio, news: [string] (newest first), colour, light, initial }]
     *              (colour: their shirt, for a round avatar; light: it's pale, so dark ink on it)
     *   choices    [{ mission, missionTitle, act, side, title, picked, text }]
     *   ending     string (the game is finished) or null
     * Locked jobs carry no text (nothing past the next job can leak).
     */
    model() {
      const g = this.game;
      const ms = g.missions;
      const R = recap();
      const flags = this._flags();
      const out = { prologue: this.text(R.prologue, flags), now: null, next: null, acts: [], side: [], who: [], choices: [], ending: null };
      if (!ms) return out;
      const done = ms.completed || {};
      const run = ms.run && ms.run.m ? ms.run : null;
      const runId = run ? run.m.id : null;

      // The main story, act by act.
      const main = ms.main || [];
      const nextMain = main.find((m) => !done[m.id]) || null;
      const byAct = new Map();
      main.forEach((m, i) => {
        const state = done[m.id] ? 'done' : m.id === runId ? 'current' : m === nextMain ? 'next' : 'locked';
        const j = this._job(m, state, flags, i + 1);
        const a = m.act || 1;
        if (!byAct.has(a)) byAct.set(a, []);
        byAct.get(a).push(j);
        if (m === nextMain) out.next = state === 'current' ? this._job(m, 'next', flags, i + 1) : j;
      });
      for (const n of Array.from(byAct.keys()).sort((a, b) => a - b)) {
        const jobs = byAct.get(n);
        const nDone = jobs.filter((j) => j.state === 'done').length;
        const state = nDone === jobs.length ? 'done' : jobs.some((j) => j.state === 'current' || j.state === 'next') ? 'current' : 'locked';
        const a = (R.acts || {})[n] || {};
        out.acts.push({
          n, state, done: nDone, total: jobs.length,
          title: state === 'locked' ? '' : (typeof a.title === 'string' && a.title) || '',
          intro: state === 'locked' ? '' : this.text(a.intro, flags),
          outro: state === 'done' ? this.text(a.outro, flags) : '',
          jobs,
        });
      }
      if (!nextMain && main.length) {
        const last = main[main.length - 1];
        const lastAct = out.acts[out.acts.length - 1];
        out.ending = (lastAct && lastAct.outro) || this.text(((R.jobs || {})[last.id] || {}).recap, flags) || last.summary || '';
      }

      // Side stories.
      for (const chain of ms.side || []) {
        const list = chain.missions || [];
        let nextFound = false;
        const jobs = list.map((m, i) => {
          let state = 'locked';
          if (done[m.id]) state = 'done';
          else if (m.id === runId) state = 'current';
          else if (!nextFound && ms.isAvailable(m)) state = 'next';
          if (!done[m.id]) nextFound = true;
          return this._job(m, state, flags, i + 1);
        });
        const nDone = jobs.filter((j) => j.state === 'done').length;
        const live = jobs.some((j) => j.state === 'current');
        const avail = jobs.some((j) => j.state === 'next');
        const state = list.length && nDone === list.length ? 'done' : nDone || live ? 'current' : avail ? 'available' : 'locked';
        out.side.push({ id: chain.id, title: chain.title || chain.id, giver: this._name(chain.giver), state, done: nDone, total: list.length, jobs });
      }

      // Where things stand.
      const job = run && (run.m._main || run.m._chain) ? run.m : null;
      if (job) {
        const r = (R.jobs || {})[job.id] || {};
        out.now = {
          kind: 'mission', id: job.id, title: job.title, text: this.text(r.setup, flags) || job.summary || '',
          objective: run.objective || '', place: null, giver: this._name(job.giver || (job._chain && job._chain.giver)),
          act: job._main ? job.act || 1 : 0, side: job._chain ? job._chain.title : null,
        };
      } else if (out.next) {
        const j = out.next;
        out.now = { kind: 'next', id: j.id, title: j.title, text: j.setup, objective: '', place: j.place, giver: j.giver, act: j.act, side: null, auto: j.auto, n: j.n };
      } else {
        const name = this._endingName(flags);
        out.now = { kind: 'done', id: null, title: name ? 'Ending: ' + name : 'The end', text: out.ending || '', objective: '', place: null, giver: '', act: 0, side: null };
      }

      // Who's who: the people Jay has met, in the order he met them.
      const C = story().characters || {};
      const met = (intro) => intro === null || intro === undefined || [].concat(intro).some((id) => done[id]);
      const firstMet = (intro) => (intro === null || intro === undefined ? -1 : Math.min(...[].concat(intro).filter((id) => done[id]).map((id) => this._rank(id))));
      const who = [];
      const W = R.who && typeof R.who === 'object' ? R.who : {};
      Object.keys(W).forEach((id, i) => {
        const w = W[id] || {};
        if (!met(w.intro)) return;
        const c = C[id] || {};
        const name = c.name || w.name || id;
        const news = (Array.isArray(R.updates) ? R.updates : [])
          .filter((u) => u && u.who === id && u.after && [].concat(u.after).some((a) => done[a]) && (u.if === undefined || testFlag(flags, u.if)))
          .map((u, k) => ({ text: this.text(u.text, flags), rank: Math.max(...[].concat(u.after).filter((a) => done[a]).map((a) => this._rank(a))), k }))
          .filter((u) => u.text)
          .sort((a, b) => b.rank - a.rank || b.k - a.k)
          .map((u) => u.text);
        who.push({
          id, name, role: c.role || w.role || '', bio: this.text(w.bio, flags), news,
          colour: hex(c.look && c.look.top) || '#ff4f8b', light: pale(c.look && c.look.top), initial: (name.replace(/^[^A-Za-z]*/, '').charAt(0) || '?').toUpperCase(),
          _met: firstMet(w.intro), _i: i,
        });
      });
      who.sort((a, b) => a._met - b._met || a._i - b._i);
      out.who = who.map((w) => {
        delete w._met;
        delete w._i;
        return w;
      });

      // The choices made, in the order the jobs were done.
      const C2 = R.choices && typeof R.choices === 'object' ? R.choices : {};
      const ids = Object.keys(C2).filter((id) => done[id] && ms.all && ms.all.has(id)).sort((a, b) => this._rank(a) - this._rank(b));
      for (const id of ids) {
        const m = ms.all.get(id);
        const steps = choiceSteps(m);
        const picks = this.picked[id] || [];
        for (const e of [].concat(C2[id])) {
          if (!e || !e.options) continue;
          const keys = Object.keys(e.options);
          let pick = keys.find((k) => ms.flags[k]);
          if (!pick) pick = keys.find((k) => picks.includes(k));
          if (!pick) {
            // A save from before the log: the one option that sets no flag, if no other option's flag is set.
            const st = steps.find((s) => s.options.some((o) => keys.includes(o.flag || o.label)));
            const plain = st ? st.options.filter((o) => !o.flag) : [];
            if (st && st.top && plain.length === 1 && keys.includes(plain[0].label) && !st.options.some((o) => o.flag && ms.flags[o.flag])) pick = plain[0].label;
          }
          if (!pick) continue;
          let label = pick;
          for (const s of steps) for (const o of s.options) if (o.flag === pick || o.label === pick) label = o.label;
          out.choices.push({
            mission: id, missionTitle: m.title || id, act: m._main ? m.act || 1 : 0, side: m._chain ? m._chain.title : null,
            title: (typeof e.title === 'string' && e.title) || (steps[0] && steps[0].prompt) || m.title, picked: label, text: this.text(e.options[pick], flags),
          });
        }
      }
      return out;
    }

    /** The Previously card: the last main job's one-liner (or the prologue) and what's next. */
    previously() {
      const ms = this.game.missions;
      const R = recap();
      const flags = this._flags();
      const main = (ms && ms.main) || [];
      let last = null;
      for (const m of main) if (ms.completed[m.id]) last = m;
      let line = '';
      if (last) line = this.text(((R.jobs || {})[last.id] || {}).line, flags) || last.summary || '';
      else {
        // The start of the prologue (the card is short): its first few sentences.
        const p = this.text(R.prologue, flags);
        const s = p.match(/[^.!?]+[.!?]+["”']?/g) || (p ? [p] : []);
        for (const x of s) {
          if (line && (line + x).length > 300) break;
          line += x;
        }
        line = line.trim();
        if (!line && main[0]) line = main[0].summary || '';
      }
      const next = main.find((m) => !ms.completed[m.id]) || null;
      return { line, next: next ? next.title : null, place: next ? (this._where(next) || {}).name || '' : '', act: last ? last.act || 1 : 0 };
    }

    // ------------------------------------------------------------- card
    _buildCard() {
      const c = el('div', 'vh-prev');
      c.setAttribute('aria-live', 'polite');
      const x = el('button', 'vh-prev-x', '✕');
      x.type = 'button';
      x.tabIndex = -1;
      x.title = 'Dismiss';
      x.addEventListener('click', () => this.hideCard());
      this.cardLine = el('p', 'vh-prev-line');
      this.cardNext = el('div', 'vh-prev-next');
      this.cardFoot = el('div', 'vh-prev-foot');
      const bar = el('div', 'vh-prev-bar');
      this.cardBar = el('i');
      bar.append(this.cardBar);
      const kick = el('div', 'vh-prev-kicker');
      kick.append(el('span', 'vh-prev-book', '📖'), el('span', 'vh-prev-kicker-text', 'Previously in Vicehaven…'));
      c.append(x, kick, this.cardLine, this.cardNext, this.cardFoot, bar);
      document.body.append(c);
      this.card = c;
      window.addEventListener('keydown', (e) => {
        if (!this.cardUp || e.code !== 'Backspace' || this.game.state !== 'playing') return;
        const t = e.target;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
        e.preventDefault();
        this.hideCard();
      });
    }

    _showCard() {
      const g = this.game;
      const p = this.previously();
      if (!p.line) return;
      this.cardLine.textContent = p.line;
      this.cardNext.textContent = '';
      if (p.next) {
        this.cardNext.append(el('span', 'vh-prev-label', 'Up next'), el('b', '', p.next));
        if (p.place) this.cardNext.append(el('span', 'vh-prev-place', ' · ' + p.place));
      } else this.cardNext.append(el('span', 'vh-prev-label', 'The end'), el('b', '', 'The story is done. The city is still out there.'));
      this.cardFoot.textContent = '';
      const pad = g.input && g.input.lastDevice === 'gamepad';
      const key = (k, label) => {
        const s = el('span', 'vh-prev-key');
        s.append(el('kbd', '', k), document.createTextNode(' ' + label));
        return s;
      };
      const phone = g.input ? g.input.labelFor('phone') : 'P';
      if (g.phone) this.cardFoot.append(key(pad ? 'D-pad ↑' : phone && phone !== '—' ? phone : 'P', 'Story app'));
      this.cardFoot.append(el('span', 'vh-prev-or', 'or Pause → Story so far'));
      if (!pad) this.cardFoot.append(key('Backspace', 'Dismiss'));
      this.card.classList.add('is-on');
      this.cardUp = true;
      this._cardT = CARD_SECONDS;
      this.cardBar.style.transform = 'scaleX(1)';
    }

    hideCard() {
      this.cardUp = false;
      this._cardT = 0;
      this.card.classList.remove('is-on');
    }

    // ------------------------------------------------------------ system
    /** Nothing on screen that a notify or the card would get in the way of. */
    _quiet() {
      const g = this.game;
      if (g.state !== 'playing') return false;
      const b = document.body.classList;
      if (b.contains('cutscene') || b.contains('phone-open') || b.contains('shop-open') || b.contains('photo-mode')) return false;
      if ((g.player && g.player.frozen) || g.frozenControls || g._arresting) return false;
      if (g.minimap && g.minimap.isFullOpen) return false;
      if (g.dialogue && (g.dialogue._choice || (g.dialogue.current && g.dialogue.current.mode !== 'ambient'))) return false;
      if (g.hud && g.hud.mResult && g.hud.mResult.classList.contains('show')) return false;
      return true;
    }

    update(dt) {
      const g = this.game;
      const quiet = this._quiet();
      // "Previously in Vicehaven…": a few seconds into a continued save, before any job starts.
      if (this._prev) {
        if (!g._continuing) this._prev = null;
        else if (quiet && !(g.missions && g.missions.run)) {
          this._prev.t += dt;
          if (this._prev.t >= CARD_DELAY) {
            this._prev = null;
            this._showCard();
          }
        } else if ((this._prev.waited += dt) > 120) this._prev = null;
      }
      if (this.cardUp) {
        if (g.missions && g.missions.run) this.hideCard();
        else if (quiet) {
          this._cardT -= dt;
          this.cardBar.style.transform = 'scaleX(' + Math.max(0, this._cardT / CARD_SECONDS).toFixed(3) + ')';
          if (this._cardT <= 0) this.hideCard();
        }
      }
      // The skip hint and "Story so far: <job>", one at a time when nothing else is going on.
      const q = this._queue[0];
      if (q && quiet) {
        q.wait -= dt;
        if (q.wait <= 0) {
          this._queue.shift();
          this._say(q);
          if (this._queue[0]) this._queue[0].wait = Math.max(this._queue[0].wait, 1.6);
        }
      }
    }

    _say(q) {
      const g = this.game;
      if (!g.hud) return;
      if (q.kind === 'hint') {
        if (this.hintShown) return;
        this.hintShown = true;
        // A controller has no phone key of its own (labelFor gives the keyboard's): the D-pad opens the phone.
        const pad = g.input && g.input.lastDevice === 'gamepad';
        const k = pad ? 'D-pad ↑' : g.input ? g.input.labelFor('phone') : 'P';
        const where = g.phone ? ' (or the Story app, ' + (k && k !== '—' ? k : 'P') + ')' : '';
        g.hud.notify({ title: 'Skipping the scenes?', text: 'No problem. ' + (pad ? 'Menu' : 'Pause') + ' → Story so far' + where + ' keeps you up to date.', icon: '📖', duration: 10000 });
        return;
      }
      const m = g.missions && g.missions.all && g.missions.all.get(q.id);
      if (!m) return;
      const line = this.text(((recap().jobs || {})[m.id] || {}).line) || m.summary || '';
      g.hud.notify({ title: 'Story so far: ' + m.title, text: line, icon: '📖', duration: 9000 });
    }

    serialize() {
      const picked = {};
      for (const k of Object.keys(this.picked)) if (Array.isArray(this.picked[k]) && this.picked[k].length) picked[k] = this.picked[k].slice(0, 8);
      return { picked, order: this.order.slice(-MAX_ORDER), hint: !!this.hintShown };
    }

    /** A continued save (missions.load → loadSystems); undefined for a save from before the log. */
    load(d) {
      this.reset();
      if (d && typeof d === 'object') {
        if (d.picked && typeof d.picked === 'object') {
          for (const k of Object.keys(d.picked)) {
            const v = d.picked[k];
            if (Array.isArray(v)) this.picked[k] = v.filter((s) => typeof s === 'string').slice(0, 8);
          }
        }
        if (Array.isArray(d.order)) this.order = d.order.filter((s) => typeof s === 'string').slice(-MAX_ORDER);
        this.hintShown = !!d.hint;
      }
      this._prev = { t: 0, waited: 0 };
    }

    reset() {
      this.picked = {};
      this.order = [];
      this.hintShown = false;
      this._run = null;
      this._skim = null;
      this._queue = [];
      this._prev = null;
      this.hideCard();
    }

    stop() {
      this._queue = [];
      this._prev = null;
      this.hideCard();
    }
  }

  StoryLog.choiceSteps = choiceSteps;
  VH.StoryLog = StoryLog;
})();
