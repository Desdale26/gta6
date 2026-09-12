// dialogs.js — queued subtitle dialogue for mission briefings and story beats.
export class Dialogs {
  constructor(ctx) {
    this.ctx = ctx;
    this.queue = [];
    this.timer = 0;
    this.current = null;
  }

  /** Play a list of "SPEAKER: line" strings one after another. */
  play(lines, opts = {}) {
    if (!lines || !lines.length) return;
    for (const l of lines) {
      const i = l.indexOf(':');
      const who = i > 0 && i < 24 ? l.slice(0, i).trim() : null;
      const text = i > 0 && i < 24 ? l.slice(i + 1).trim() : l;
      this.queue.push({ who, text, duration: opts.duration ?? Math.max(2.4, text.length * 0.052) });
    }
    if (!this.current) this._next();
  }

  say(who, text, duration) {
    this.queue.push({ who, text, duration: duration ?? Math.max(2.2, text.length * 0.05) });
    if (!this.current) this._next();
  }

  _next() {
    this.current = this.queue.shift() || null;
    if (!this.current) return;
    this.timer = this.current.duration;
    this.ctx.hud?.subtitle(this.current.who, this.current.text, this.current.duration);
  }

  update(dt) {
    if (!this.current) return;
    this.timer -= dt;
    if (this.timer <= 0) this._next();
  }

  clear() { this.queue.length = 0; this.current = null; }
}
