// credits.js — the end of the story.
//
// Six acts, seventy-four story missions and about eighteen thousand words of
// script used to finish the way a courier job finishes: MISSION PASSED, here is
// your money, the city carries on. Nothing told the player they had reached the
// end of anything. A campaign you cannot finish is not a campaign, it is a list.
//
// This watches for the last story mission and, when it lands, gives the run an
// ending: the epilogue, what they actually did with their time in Leonida, and
// the people they did it with. Then it hands the city back — Leonida keeps
// running afterwards, because half the missions are side work and a lot of
// players will want to go and finish them.
import { formatMoney } from '../core/mathx.js';
import { MISSIONS } from '../content/missionCatalog.js';

// Taken from the campaign itself, in order of how much they have to say —
// Yaz 189 lines, Tito 175, Rey 175, Elena 72, Mona 65, Amaro 46, Rowe 38.
const CAST = [
  ['Yaz Okonkwo', '21 jobs, and never once early'],
  ['Tito Barrow', '30 jobs, and never once on time'],
  ['Rey Delgado', 'who counted it twice'],
  ['Elena Sandoval', 'who knew before you did'],
  ['Mona Castellanos', 'who met the bus'],
  ['Father Amaro', 'who slept in the plastic chair'],
  ['Special Agent Rowe', 'who is still filing'],
  ['Nadia Brant', 'off the record'],
  ['Detective Ruiz', 'suspended, pending review'],
  ['Leonida', 'herself'],
];

export class Credits {
  constructor(ctx) {
    this.ctx = ctx;
    this.el = document.getElementById('creditsOverlay');
    this.scroll = document.getElementById('creditsScroll');
    this.closeBtn = document.getElementById('creditsClose');
    this.shown = false;
    this.open = false;

    // The final story mission is whatever sits last in the highest act, worked
    // out from the catalogue rather than written down here, so that adding an
    // act to the campaign moves the ending without anyone remembering to.
    const story = MISSIONS.filter((m) => m.act);
    this.lastAct = story.reduce((n, m) => Math.max(n, m.act), 0);
    this.storyIds = new Set(story.map((m) => m.id));
    this.finaleId = story
      .filter((m) => m.act === this.lastAct)
      .sort((a, b) => (a.tier || 0) - (b.tier || 0))
      .map((m) => m.id)
      .pop();

    if (this.closeBtn) this.closeBtn.addEventListener('click', () => this.close());
    ctx.bus.on('mission:completed', (e) => this._onMission(e));
  }

  _onMission(e) {
    if (this.shown || !e || !e.mission) return;
    if (e.mission.id !== this.finaleId) return;
    // Let the debrief play out before the screen goes dark on it.
    this._pending = 4.5;
  }

  update(dt) {
    if (this._pending > 0) {
      this._pending -= dt;
      if (this._pending <= 0) { this._pending = 0; this.show(); }
    }
  }

  /** How much of the story, and of everything else, this run actually got through. */
  stats() {
    const ctx = this.ctx;
    const done = ctx.missions ? ctx.missions.completed : new Set();
    let story = 0;
    for (const id of done) if (this.storyIds.has(id)) story++;
    const hours = Math.floor(ctx.time.elapsed / 3600);
    const mins = Math.floor((ctx.time.elapsed % 3600) / 60);
    return {
      story: `${story}/${this.storyIds.size}`,
      side: String(Math.max(0, done.size - story)),
      earned: formatMoney(Math.round(ctx.economy?.lifetimeEarned || 0)),
      days: String(Math.max(1, ctx.time.day || 1)),
      time: hours ? `${hours}h ${mins}m` : `${mins}m`,
      stunts: String(Math.round(ctx.stunts?.totalScore || 0)),
    };
  }

  show() {
    if (!this.el || !this.scroll) return;
    this.shown = true;
    this.open = true;
    const s = this.stats();
    const stat = (v, label) => `<div><b>${v}</b><span>${label}</span></div>`;
    this.scroll.innerHTML = `
      <h1>VICE COAST</h1>
      <p class="quiet">Leonida, and everyone still in it</p>

      <h2>Epilogue</h2>
      <p>The bus that brought you in still runs. It leaves the terminal on Ocean Mile at
      ten past the hour, every hour, and it is nearly always empty going north.</p>
      <p>Nobody who matters is watching the causeway any more. The names on the
      board got crossed off one at a time, and the board went in a skip behind
      the precinct with everything else nobody wanted found.</p>
      <p>You could get on that bus. Plenty of people do.</p>

      <h2>This run</h2>
      <div class="credits-stats">
        ${stat(s.story, 'story missions')}
        ${stat(s.side, 'side jobs')}
        ${stat(s.earned, 'earned')}
        ${stat(s.days, 'days in Leonida')}
        ${stat(s.time, 'time played')}
        ${stat(s.stunts, 'stunt score')}
      </div>

      <h2>Cast</h2>
      <div class="credits-cast">
        ${CAST.map(([who, what]) => `<span>${who} <i>— ${what}</i></span>`).join('')}
      </div>

      <h2>Leonida</h2>
      <p class="quiet">The city is still out there. Half the work in it is not story work,
      and none of that has gone anywhere.</p>
    `;
    this.scroll.scrollTop = 0;
    this.el.classList.remove('hidden');
    this.ctx.input.uiCaptured = true;
    this.ctx.input.unlockPointer();
    this.ctx.game?.setPaused(true);
    this.ctx.audio?.play('missionPass', { ui: true, volume: 0.8 });
    this.ctx.bus.emit('campaign:complete', { stats: s });
    this.ctx.game?.save();
  }

  close() {
    if (!this.el) return;
    this.open = false;
    this.el.classList.add('hidden');
    this.ctx.input.uiCaptured = false;
    this.ctx.game?.setPaused(false);
    this.ctx.input.lockPointer();
  }

  save() { return { shown: this.shown }; }
  load(d) { if (d && d.shown) this.shown = true; }
}
