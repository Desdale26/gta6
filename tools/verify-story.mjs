// verify-story.mjs — is the campaign actually a campaign?
//
// A mission catalogue can look full and still not be playable end to end: a
// mission whose `requires` names an id that no longer exists is simply never
// offered, and nothing anywhere would say so. The same goes for a mission with
// no objectives, a story beat with no briefing, or — the one that took longest
// to notice — a final mission that ends exactly like a courier job, so the
// player finishes six acts and eighteen thousand words of script and is told
// nothing at all.
//
// So this walks the unlock graph from a fresh save and insists every mission is
// reachable, every reference resolves, and the last act has an ending attached
// to it.
//
//   node tools/verify-story.mjs
import { MISSIONS } from '../src/content/missionCatalog.js';

const byId = new Map(MISSIONS.map((m) => [m.id, m]));
const story = MISSIONS.filter((m) => m.act);
const side = MISSIONS.filter((m) => !m.act);
const failures = [];

// --- everything a mission points at must exist -------------------------------
const dangling = [];
for (const m of MISSIONS) {
  for (const r of m.requires || []) if (!byId.has(r)) dangling.push(`${m.id} requires "${r}", which is not a mission`);
}

// --- walk the unlock graph from nothing --------------------------------------
const reached = new Set();
let waves = 0;
for (;;) {
  const next = MISSIONS.filter((m) => !reached.has(m.id) && (m.requires || []).every((r) => reached.has(r)));
  if (!next.length) break;
  for (const m of next) reached.add(m.id);
  if (++waves > MISSIONS.length + 5) break;
}
const stranded = MISSIONS.filter((m) => !reached.has(m.id));

// --- every mission has to be playable, every story beat has to be written ----
const empty = MISSIONS.filter((m) => !m.objectives || !m.objectives.length);
const unbriefed = story.filter((m) => !m.briefing || !m.briefing.length);
const undebriefed = story.filter((m) => !m.debrief || !m.debrief.length);

// --- and it has to end --------------------------------------------------------
const lastAct = story.reduce((n, m) => Math.max(n, m.act), 0);
const finale = story.filter((m) => m.act === lastAct)
  .sort((a, b) => (a.tier || 0) - (b.tier || 0)).pop();

const acts = new Map();
for (const m of story) {
  if (!acts.has(m.act)) acts.set(m.act, []);
  acts.get(m.act).push(m);
}
const words = (m) => ((m.briefing || '') + ' ' + (m.debrief || '') + ' ' + (m.blurb || '') + ' '
  + (m.objectives || []).map((o) => `${o.text || ''} ${o.say || ''}`).join(' '))
  .split(/\s+/).filter(Boolean).length;

console.log('story  (missionCatalog + campaign)');
console.log(`  ${MISSIONS.length} missions: ${story.length} story across ${acts.size} acts, ${side.length} side jobs`);
for (const act of [...acts.keys()].sort((a, b) => a - b)) {
  const ms = acts.get(act).slice().sort((a, b) => (a.tier || 0) - (b.tier || 0));
  const objs = ms.reduce((n, m) => n + (m.objectives || []).length, 0);
  const w = ms.reduce((n, m) => n + words(m), 0);
  console.log(`    act ${act}: ${String(ms.length).padStart(2)} missions, ${String(objs).padStart(3)} objectives,`
    + ` ~${String(w).padStart(4)} words — ends on "${ms[ms.length - 1].name}"`);
}
const totalWords = MISSIONS.reduce((n, m) => n + words(m), 0);
const totalObjs = MISSIONS.reduce((n, m) => n + (m.objectives || []).length, 0);
console.log(`  ${totalObjs} objectives and ~${totalWords} words of script in total`);
console.log(`  reachable from a fresh save: ${reached.size}/${MISSIONS.length} over ${waves} waves`);
console.log(`  the campaign ends on "${finale ? finale.name : '(nothing)'}"`);

// Floors, not exact numbers: the campaign is meant to grow.
if (story.length < 60) failures.push(`only ${story.length} story missions`);
if (acts.size < 5) failures.push(`only ${acts.size} acts`);
if (totalWords < 12000) failures.push(`only ${totalWords} words of script across the whole game`);
if (dangling.length) failures.push(...dangling.slice(0, 6));
if (stranded.length) {
  failures.push(`${stranded.length} missions can never be offered (e.g. ${stranded.slice(0, 4).map((m) => m.id).join(', ')})`);
}
if (empty.length) failures.push(`${empty.length} missions have no objectives (e.g. ${empty.slice(0, 3).map((m) => m.id).join(', ')})`);
if (unbriefed.length) failures.push(`${unbriefed.length} story missions have no briefing`);
if (undebriefed.length) failures.push(`${undebriefed.length} story missions have no debrief`);
if (!finale) failures.push('there is no final mission');
for (const [act, ms] of acts) {
  if (ms.length < 6) failures.push(`act ${act} has only ${ms.length} missions`);
}

console.log('');
if (failures.length) {
  console.log('FAIL');
  for (const f of failures) console.log('  ! ' + f);
  process.exit(1);
}
console.log('every mission is reachable, every act is written, and the story has an ending');
