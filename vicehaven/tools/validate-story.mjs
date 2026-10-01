/*
 * validate-story.mjs — checks the story data against the mission engine.
 *
 *   node vicehaven/tools/validate-story.mjs            (all story files)
 *   node vicehaven/tools/validate-story.mjs --summary  (also print counts and estimated play time)
 *
 * Loads js/data/story*.js the way the game does (classic scripts on a
 * window.VH namespace) and reports anything the engine couldn't run:
 * unknown step types, speakers or characters that don't exist, places that
 * aren't defined, cars used before they're spawned, bad flags, and missing
 * mission references.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'js', 'data');
const files = fs.readdirSync(dataDir).filter((f) => /^story.*\.js$/.test(f)).sort((a, b) => (a === 'story.js' ? -1 : b === 'story.js' ? 1 : a.localeCompare(b)));
const ctx = { window: { VH: { Data: {} } }, console };
ctx.window.window = ctx.window;
vm.createContext(ctx);
for (const f of files) {
  try {
    vm.runInContext(fs.readFileSync(path.join(dataDir, f), 'utf8'), ctx, { filename: f });
  } catch (err) {
    console.log('✗ ' + f + ' does not run: ' + err.message);
    process.exitCode = 1;
  }
}
const story = ctx.window.VH.Data.story;
if (!story) {
  console.log('✗ VH.Data.story is not defined');
  process.exit(1);
}

const problems = [];
const warn = [];
const bad = (where, msg) => problems.push(where + ': ' + msg);
const soft = (where, msg) => warn.push(where + ': ' + msg);

const BUILTIN_PLACES = new Set(['civic_plaza', 'meridian_yard', 'founders_park', 'vicehaven_tower', 'oceanview_pier', 'pier_end', 'the_boardwalk', 'grand_avenue', 'meridian_boulevard', 'old_market', 'palm_crescent', 'harbor_point', 'downtown', 'saltmarsh_docks', 'crestline_estates',
  'pier9_gate', 'bay_14', 'container_maze', 'the_quay', 'freighter_berth', 'fish_market', 'boatworks', 'quay_end', 'voss_estate', 'voss_forecourt', 'voss_pool', 'voss_helipad', 'voss_fountain', 'police_station', 'hospital', 'vpd_central', 'mercy_general', 'tidewater_lot', 'crane_row']);
const KINDS = new Set(['garage', 'alley', 'rooftop', 'parking', 'storefront', 'bank', 'diner', 'bar', 'motel', 'corner', 'park', 'pier', 'boardwalk', 'warehouse', 'dock', 'mansion', 'construction', 'church', 'hospital_front', 'police_station_front', 'apartment_front', 'beach', 'overlook', 'street']);
const DISTRICTS = new Set(['downtown', 'oldmarket', 'palmcrescent', 'harborpoint', 'saltmarsh_docks', 'crestline_estates']);
const CARS = new Set(['vireo', 'halcyon', 'pipit', 'ironclad', 'porter', 'mesa', 'cab', 'interceptor', 'zephyr', 'tern', 'sovereign', 'bulwark', 'hauler', 'medic', 'drifter', 'lowrider', 'beater', 'unmarked']);
const WEAPONS = new Set(['fists', 'bat', 'knife', 'pistol', 'revolver', 'smg', 'shotgun', 'rifle', 'sniper', 'grenade', 'molotov']);
const FACTIONS = new Set(['halberd', 'kings', 'salts', 'vpd', 'police', 'civilian', 'crew', 'friendly', 'gang']);
const BEHAVIORS = new Set(['idle', 'guard', 'patrol', 'attack', 'flee', 'cower', 'follow', 'drive', 'wander']);
const MUSIC = new Set(['tension', 'action', 'sad', 'hope', 'triumph', 'off']);
const STEP_KEYS = ['scene', 'blackout', 'phone', 'text', 'goto', 'spawnCar', 'getIn', 'spawn', 'join', 'leave', 'kill', 'survive', 'protect', 'chase', 'follow', 'race', 'deliver', 'collect', 'destroy', 'heat', 'loseHeat', 'wait', 'timer', 'choice', 'if', 'setFlag', 'music', 'slowmo', 'setTime', 'fade', 'teleport', 'camera', 'reward', 'objective', 'say'];

const chars = story.characters || {};
for (const [id, c] of Object.entries(chars)) {
  if (!c.name) bad('character ' + id, 'no name');
  if (!c.look) bad('character ' + id, 'no look');
  if (!c.voice) soft('character ' + id, 'no voice');
}
const speakers = new Set(Object.keys(chars).concat(['jay', 'caption', 'passenger', 'DISPATCH']));
const places = story.places || {};
for (const [id, p] of Object.entries(places)) {
  if (!DISTRICTS.has(p.district)) bad('place ' + id, 'unknown district ' + p.district);
  if (!KINDS.has(p.kind)) bad('place ' + id, 'unknown kind ' + p.kind);
}
const placeOk = (id) => typeof id === 'object' || BUILTIN_PLACES.has(id) || places[id] !== undefined;

const allMissions = new Map();
const main = story.missions || [];
main.forEach((m) => allMissions.set(m.id, m));
for (const ch of story.side || []) for (const m of ch.missions || []) allMissions.set(m.id, m);
const flagsSet = new Set();
const flagsUsed = [];
let lineCount = 0;
let wordCount = 0;
let est = 0;
let estSide = 0;

function lines(where, list) {
  if (!Array.isArray(list)) {
    bad(where, 'lines must be an array of [speaker, text]');
    return;
  }
  for (const l of list) {
    if (!Array.isArray(l) || l.length < 2) {
      bad(where, 'bad line ' + JSON.stringify(l));
      continue;
    }
    if (!speakers.has(l[0])) bad(where, 'unknown speaker "' + l[0] + '"');
    if (typeof l[1] !== 'string' || !l[1].trim()) bad(where, 'empty line');
    else if (l[1].length > 240) soft(where, 'long line (' + l[1].length + ' chars): ' + l[1].slice(0, 40) + '…');
    lineCount++;
    wordCount += (l[1] || '').split(/\s+/).length;
  }
}

function steps(where, list, st) {
  if (!Array.isArray(list)) {
    bad(where, 'steps must be an array');
    return;
  }
  list.forEach((s, i) => {
    const w = where + ' step ' + (i + 1);
    const kind = STEP_KEYS.find((k) => s[k] !== undefined);
    if (!kind) {
      bad(w, 'no known step type in ' + JSON.stringify(Object.keys(s)));
      return;
    }
    if (s.say && kind !== 'say') lines(w + ' (say)', s.say);
    switch (kind) {
      case 'say': lines(w, s.say); break;
      case 'scene':
        if (s.scene.at && !placeOk(s.scene.at) && !st.actors.has(s.scene.at) && !st.cars.has(s.scene.at)) bad(w, 'scene place "' + s.scene.at + '" not defined');
        for (const c of s.scene.cast || []) {
          const id = typeof c === 'string' ? c : c.id;
          if (id !== 'jay' && !chars[id]) bad(w, 'cast member "' + id + '" is not a character');
        }
        if (!s.say) bad(w, 'scene without lines');
        break;
      case 'blackout': lines(w, s.blackout); break;
      case 'phone':
        if (!chars[s.phone]) bad(w, 'phone caller "' + s.phone + '" is not a character');
        lines(w, s.say || []);
        break;
      case 'text': if (!chars[s.text] && s.text !== 'caption') bad(w, 'text sender "' + s.text + '" is not a character'); break;
      case 'goto':
        if (!placeOk(s.goto) && !st.actors.has(s.goto) && !st.cars.has(s.goto)) bad(w, 'goto place "' + s.goto + '" not defined');
        if (typeof s.vehicle === 'string' && !st.cars.has(s.vehicle)) bad(w, 'vehicle "' + s.vehicle + '" was never spawned');
        break;
      case 'spawnCar':
        if (!CARS.has(s.type)) bad(w, 'unknown car type "' + s.type + '"');
        if (s.at && !placeOk(s.at)) bad(w, 'spawnCar place "' + s.at + '" not defined');
        st.cars.add(s.spawnCar);
        break;
      case 'getIn': if (s.getIn !== 'any' && !st.cars.has(s.getIn)) bad(w, 'getIn car "' + s.getIn + '" was never spawned'); break;
      case 'spawn':
        for (const e of [].concat(s.spawn)) {
          if (e.char && !chars[e.char]) bad(w, 'spawn char "' + e.char + '" is not a character');
          if (e.faction && !FACTIONS.has(e.faction)) bad(w, 'unknown faction "' + e.faction + '"');
          if (e.at && !placeOk(e.at) && !st.actors.has(e.at) && !st.cars.has(e.at)) bad(w, 'spawn place "' + e.at + '" not defined');
          if (e.weapon && !WEAPONS.has(e.weapon)) bad(w, 'unknown weapon "' + e.weapon + '"');
          if (e.behavior && !BEHAVIORS.has(e.behavior)) bad(w, 'unknown behavior "' + e.behavior + '"');
          if (e.car && !st.cars.has(e.car)) bad(w, 'spawn car "' + e.car + '" was never spawned');
          const id = e.char ? e.id || e.char : e.id;
          if (id) st.actors.add(id);
          if (e.group) st.groups.add(e.group);
        }
        break;
      case 'join':
        for (const id of [].concat(s.join)) {
          if (!chars[id]) bad(w, 'join "' + id + '" is not a character');
          st.actors.add(id);
        }
        break;
      case 'leave': break;
      case 'kill': {
        const ref = s.kill;
        if (typeof ref === 'string' && ref.startsWith('group:')) {
          if (!st.groups.has(ref.slice(6))) bad(w, 'kill group "' + ref.slice(6) + '" was never spawned');
        } else for (const id of [].concat(ref)) if (!st.actors.has(id) && !st.groups.has(id)) bad(w, 'kill target "' + id + '" was never spawned');
        break;
      }
      case 'survive':
        if (!(s.survive > 0)) bad(w, 'survive needs seconds');
        for (const wv of s.waves || []) {
          if (wv.at && !placeOk(wv.at)) bad(w, 'wave place "' + wv.at + '" not defined');
          if (wv.faction && !FACTIONS.has(wv.faction)) bad(w, 'unknown faction "' + wv.faction + '"');
          if (wv.weapon && !WEAPONS.has(wv.weapon)) bad(w, 'unknown weapon "' + wv.weapon + '"');
        }
        break;
      case 'chase': case 'follow':
        if (!st.cars.has(s[kind])) bad(w, kind + ' car "' + s[kind] + '" was never spawned');
        if (s.to && !placeOk(s.to)) bad(w, 'follow destination "' + s.to + '" not defined');
        for (const r of s.route || []) if (!placeOk(r)) bad(w, 'route place "' + r + '" not defined');
        break;
      case 'race':
        for (const c of s.race.checkpoints || []) if (!placeOk(c)) bad(w, 'race checkpoint "' + (typeof c === 'string' ? c : JSON.stringify(c)) + '" not defined');
        for (const r of s.race.rivals || []) if (!CARS.has(r.car)) bad(w, 'rival car "' + r.car + '" unknown');
        break;
      case 'deliver':
        if (!st.cars.has(s.deliver)) soft(w, 'deliver car "' + s.deliver + '" was never spawned (it will use the player\'s car)');
        if (!placeOk(s.to)) bad(w, 'deliver destination "' + s.to + '" not defined');
        break;
      case 'collect': for (const c of [].concat(s.collect)) if (!placeOk(c)) bad(w, 'collect place "' + c + '" not defined'); break;
      case 'destroy': for (const c of [].concat(s.destroy)) if (!st.cars.has(c)) bad(w, 'destroy car "' + c + '" was never spawned'); break;
      case 'choice':
        if (!s.choice.prompt || !Array.isArray(s.choice.options) || s.choice.options.length < 2 || s.choice.options.length > 3) bad(w, 'a choice needs a prompt and 2 or 3 options');
        for (const o of s.choice.options || []) {
          if (o.flag) flagsSet.add(o.flag);
          if (o.then) steps(w + ' [' + o.label + ']', o.then, st);
        }
        break;
      case 'if':
        for (const f of [].concat(s.if)) flagsUsed.push([w, f.replace(/^!/, '')]);
        if (s.then) steps(w + ' [then]', s.then, st);
        if (s.else) steps(w + ' [else]', s.else, st);
        break;
      case 'setFlag': for (const f of [].concat(s.setFlag)) flagsSet.add(f); break;
      case 'music': if (!MUSIC.has(s.music)) bad(w, 'unknown music mood "' + s.music + '"'); break;
      case 'teleport': case 'camera': if (!placeOk(s[kind]) && !st.actors.has(s[kind])) bad(w, kind + ' place "' + s[kind] + '" not defined'); break;
      case 'reward': for (const wp of (s.reward.weapons || [])) if (!WEAPONS.has(wp)) bad(w, 'unknown weapon "' + wp + '"'); break;
      default: break;
    }
  });
}

function mission(m, isMain) {
  const where = m.id || '(no id)';
  if (!m.id || !m.title) bad(where, 'missing id or title');
  if (!m.start) bad(where, 'missing start');
  else if (m.start !== 'chain' && m.start !== 'auto' && !placeOk(m.start)) bad(where, 'start place "' + m.start + '" not defined');
  for (const r of m.requires || []) if (!allMissions.has(r)) bad(where, 'requires unknown mission "' + r + '"');
  if (!m.estMinutes) soft(where, 'no estMinutes');
  if (isMain) est += m.estMinutes || 0;
  else estSide += m.estMinutes || 0;
  for (const w of (m.reward && m.reward.weapons) || []) if (!WEAPONS.has(w)) bad(where, 'reward weapon "' + w + '" unknown');
  const st = { cars: new Set(), actors: new Set(), groups: new Set() };
  steps(where, m.steps || [], st);
  for (const f of m.failIf || []) {
    const [kind, id] = f.split(':');
    if (!['dead', 'wrecked', 'left', 'heat'].includes(kind)) bad(where, 'unknown failIf "' + f + '"');
    if (kind === 'wrecked' && !st.cars.has(id)) soft(where, 'failIf wrecked:' + id + ' but that car is never spawned');
  }
  if (!(m.steps || []).length) bad(where, 'no steps');
}

main.forEach((m) => mission(m, true));
for (const ch of story.side || []) {
  if (!ch.id || !ch.title) bad('side chain', 'missing id or title');
  if (ch.unlockAfter && !allMissions.has(ch.unlockAfter)) bad(ch.id, 'unlockAfter unknown mission "' + ch.unlockAfter + '"');
  for (const m of ch.missions || []) mission(m, false);
}
for (const [w, f] of flagsUsed) if (!flagsSet.has(f) && !/^unlocked:/.test(f) && !allMissions.has(f)) soft(w, 'flag "' + f + '" is tested but never set');
for (const t of story.texts || []) {
  if (t.after && !allMissions.has(t.after)) bad('text', 'after unknown mission "' + t.after + '"');
  if (!speakers.has(t.from)) bad('text', 'unknown sender "' + t.from + '"');
}
// Activities: flavour lines, plus full step lists where an activity overrides the default.
const act = story.activities || {};
for (const [i, f] of (act.taxi || []).entries()) {
  lines('taxi ' + (i + 1), f.lines || []);
  if (f.after && !allMissions.has(f.after)) bad('taxi ' + (i + 1), 'after unknown mission "' + f.after + '"');
}
for (const key of ['races', 'carList', 'bounties', 'turf']) {
  for (const [i, a] of (act[key] || []).entries()) {
    const where = key + ' ' + (i + 1);
    if (a.lines) lines(where, a.lines);
    if (a.place && !placeOk(a.place)) bad(where, 'place "' + a.place + '" not defined');
    if (a.type && !CARS.has(a.type)) bad(where, 'unknown car type "' + a.type + '"');
    if (a.faction && !FACTIONS.has(a.faction)) bad(where, 'unknown faction "' + a.faction + '"');
    for (const r of [].concat(a.requires || [])) if (!allMissions.has(r) && !/^(race_|list_|bounty_|turf_)/.test(r)) bad(where, 'requires unknown mission "' + r + '"');
    for (const r of a.rivals || []) if (r.car && !CARS.has(r.car)) bad(where, 'unknown rival car "' + r.car + '"');
    if (a.steps) steps(where, a.steps, { cars: new Set(), actors: new Set(), groups: new Set() });
  }
}
for (const st of Object.values(act.radio || {})) for (const l of st.lines || []) if (typeof (l.text || l) !== 'string') bad('radio', 'bad radio line');

for (const p of problems) console.log('✗ ' + p);
for (const p of warn) console.log('· ' + p);
console.log((problems.length ? '✗ ' : '✓ ') + problems.length + ' problems, ' + warn.length + ' warnings · ' + main.length + ' main missions, ' + (story.side || []).reduce((n, c) => n + (c.missions || []).length, 0) + ' side missions · ' + lineCount + ' lines, ' + wordCount + ' words · est ' + Math.round(est) + ' min main + ' + Math.round(estSide) + ' min side');
if (problems.length) process.exitCode = 1;
