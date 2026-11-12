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
 * mission references. Then the story DLC (js/data/dlc*.js, loaded in
 * index.html's order): the same checks, plus its ids (unique, d01_ / ds…_ /
 * dside_ prefixes), dlc_ flags, its requires chains and the new steps
 * (fly, land, holdup, explode, aircraft, clearOf, escapeTo ...).
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
// The DLC's files, in the order index.html loads them (dlc.js first).
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const dlcFiles = [...indexHtml.matchAll(/src="js\/data\/(dlc[^"]*\.js)"/g)].map((m) => m[1]);
for (const f of fs.readdirSync(dataDir).filter((f) => /^dlc.*\.js$/.test(f))) if (!dlcFiles.includes(f)) console.log('· ' + f + ' is not loaded by index.html');
for (const f of dlcFiles) {
  try {
    vm.runInContext(fs.readFileSync(path.join(dataDir, f), 'utf8'), ctx, { filename: f });
  } catch (err) {
    console.log('✗ ' + f + ' does not run: ' + err.message);
    process.exitCode = 1;
  }
}
// The city's landmark lists (the new districts' landmark place ids).
try {
  vm.runInContext(fs.readFileSync(path.join(dataDir, 'districts.js'), 'utf8'), ctx, { filename: 'districts.js' });
} catch (err) {
  console.log('· districts.js could not be read for landmark ids: ' + err.message);
}
const story = ctx.window.VH.Data.story;
if (!story) {
  console.log('✗ VH.Data.story is not defined');
  process.exit(1);
}
const dlc = story.dlc && story.dlc.id ? story.dlc : null;
const summary = process.argv.includes('--summary');

const problems = [];
const warn = [];
const bad = (where, msg) => problems.push(where + ': ' + msg);
const soft = (where, msg) => warn.push(where + ': ' + msg);

const BUILTIN_PLACES = new Set(['civic_plaza', 'meridian_yard', 'founders_park', 'vicehaven_tower', 'oceanview_pier', 'pier_end', 'the_boardwalk', 'grand_avenue', 'meridian_boulevard', 'old_market', 'palm_crescent', 'harbor_point', 'downtown', 'saltmarsh_docks', 'crestline_estates',
  'pier9_gate', 'bay_14', 'container_maze', 'the_quay', 'freighter_berth', 'fish_market', 'boatworks', 'quay_end', 'voss_estate', 'voss_forecourt', 'voss_pool', 'voss_helipad', 'voss_fountain', 'police_station', 'hospital', 'vpd_central', 'mercy_general', 'tidewater_lot', 'crane_row', 'velvet_tide', 'velvet_tide_floor', 'velvet_tide_bar',
  // the airport, the fort and the big places outside the old grid
  'vicehaven_international', 'fort_breakwater', 'northgate_heights', 'airport_terminal', 'airport_arrivals', 'airport_apron', 'airport_gate', 'airport_hangars', 'airport_helipad',
  'fort_gate', 'fort_airstrip', 'fort_helipad', 'fort_motor_pool']
  .concat((ctx.window.VH.Data.landmarks3 || []).map((l) => l.id)));
const KINDS = new Set(['garage', 'alley', 'rooftop', 'parking', 'storefront', 'bank', 'diner', 'bar', 'motel', 'corner', 'park', 'pier', 'boardwalk', 'warehouse', 'dock', 'mansion', 'construction', 'church', 'hospital_front', 'police_station_front', 'apartment_front', 'beach', 'overlook', 'street']);
const DISTRICTS = new Set(['downtown', 'oldmarket', 'palmcrescent', 'harborpoint', 'saltmarsh_docks', 'crestline_estates',
  // 3.0 (places.js DISTRICT_ALIASES), and the airport (places.js _airport)
  'old_market', 'palm_crescent', 'harbor_point', 'saltmarsh', 'docks', 'crestline', 'airport',
  'sandpiper', 'sandpiper_beach', 'vistaverde', 'vista_verde', 'ironside', 'thebowl', 'the_bowl', 'bowl', 'sunreel', 'sunreel_studios', 'cindercreek', 'cinder_creek',
  'halcyon', 'halcyon_university', 'coralmarina', 'coral_marina', 'neonstrand', 'neon_strand', 'isla_paloma', 'paloma', 'island',
  'oldpaloma', 'old_paloma', 'palomaheights', 'paloma_heights', 'palomafield', 'paloma_field']);
const CARS = new Set(['vireo', 'halcyon', 'pipit', 'ironclad', 'porter', 'mesa', 'cab', 'interceptor', 'zephyr', 'tern', 'sovereign', 'bulwark', 'hauler', 'medic', 'drifter', 'lowrider', 'beater', 'unmarked']);
// Aircraft and special vehicles (spawnCar only; race rivals stay cars).
const AIRCRAFT = new Set(['skylark', 'albatross', 'talon', 'sparrow', 'warden']);
const VEHICLES = new Set([...CARS, ...AIRCRAFT, 'bastion', 'bagtug', 'caterer', 'followme', 'firetruck']);
// Every weapon the game knows, from its own data file (weapons-data.js).
vm.runInContext(fs.readFileSync(path.join(root, 'js', 'weapons-data.js'), 'utf8'), ctx, { filename: 'weapons-data.js' });
const WEAPONS = new Set(['fists'].concat((ctx.window.VH.Data.weapons || []).map((w) => w.id)));
const FACTIONS = new Set(['halberd', 'kings', 'salts', 'vpd', 'police', 'civilian', 'crew', 'friendly', 'gang'].concat(Object.keys(story.factions || {}), Object.keys((dlc && dlc.factions) || {})));
const BEHAVIORS = new Set(['idle', 'guard', 'patrol', 'attack', 'flee', 'cower', 'follow', 'drive', 'wander']);
const MUSIC = new Set(['tension', 'action', 'sad', 'hope', 'triumph', 'off']);
const STEP_KEYS = ['scene', 'blackout', 'phone', 'text', 'goto', 'spawnCar', 'getIn', 'spawn', 'join', 'leave', 'kill', 'survive', 'protect', 'chase', 'follow', 'race', 'deliver', 'collect', 'destroy', 'heat', 'loseHeat', 'wait', 'timer', 'choice', 'if', 'setFlag', 'music', 'slowmo', 'setTime', 'fade', 'teleport', 'camera', 'reward', 'objective', 'checkpoint', 'fly', 'land', 'holdup', 'explode', 'say'];

const chars = Object.assign({}, story.characters || {});
for (const [id, c] of Object.entries((dlc && dlc.characters) || {})) {
  if (chars[id]) bad('DLC character ' + id, 'clashes with a main-story character');
  chars[id] = c;
}
for (const [id, c] of Object.entries(chars)) {
  if (!c.name) bad('character ' + id, 'no name');
  if (!c.look) bad('character ' + id, 'no look');
  if (!c.voice) soft('character ' + id, 'no voice');
}
const speakers = new Set(Object.keys(chars).concat(['jay', 'caption', 'passenger', 'DISPATCH']));
const dlcPlaceIds = new Set(Object.keys((dlc && dlc.places) || {}));
const places = Object.assign({}, story.places || {});
for (const [id, p] of Object.entries((dlc && dlc.places) || {})) {
  if (places[id]) bad('DLC place ' + id, 'clashes with a main-story place');
  else if (BUILTIN_PLACES.has(id)) bad('DLC place ' + id, 'redefines a built-in place');
  places[id] = p;
}
for (const [id, p] of Object.entries(places)) {
  if (!DISTRICTS.has(p.district)) bad('place ' + id, 'unknown district ' + p.district);
  if (!KINDS.has(p.kind)) bad('place ' + id, 'unknown kind ' + p.kind);
  if (dlcPlaceIds.has(id) && !p.desc) soft('place ' + id, 'no desc');
}
const placeOk = (id) => (id && typeof id === 'object' ? typeof id.x === 'number' && typeof id.z === 'number' : BUILTIN_PLACES.has(id) || places[id] !== undefined);
// A place, or one of this job's cars or actors (spawnCar at, fly over a car ...).
const whereOk = (id, st) => placeOk(id) || st.cars.has(id) || st.actors.has(id);

const allMissions = new Map();
const main = story.missions || [];
main.forEach((m) => allMissions.set(m.id, m));
for (const ch of story.side || []) for (const m of ch.missions || []) allMissions.set(m.id, m);
// The DLC's jobs: ids unique across everything.
const dlcMain = (dlc && dlc.missions) || [];
const dlcSide = (dlc && dlc.side) || [];
for (const m of dlcMain.concat(...dlcSide.map((c) => c.missions || []))) {
  if (allMissions.has(m.id)) bad(m.id || '(no id)', 'job id used twice');
  allMissions.set(m.id, m);
}
const flagsSet = new Set();
const flagsUsed = [];
let lineCount = 0;
let wordCount = 0;
let est = 0;
let estSide = 0;
// The DLC's own counts (lines(), mission() add to whichever is current).
const cMain = { lines: 0, words: 0 };
const cDlc = { lines: 0, words: 0, est: 0, estSide: 0 };
let cnt = cMain;
let inDlc = false;

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
    cnt.lines++;
    cnt.words += (l[1] || '').split(/\s+/).length;
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
        if (typeof s.vehicle === 'string' && s.vehicle !== 'aircraft' && !st.cars.has(s.vehicle)) bad(w, 'vehicle "' + s.vehicle + '" was never spawned');
        if (s.clearOf !== undefined) {
          if (!s.clearOf || typeof s.clearOf !== 'object' || !s.clearOf.faction) bad(w, 'clearOf needs { faction, radius? }');
          else if (!FACTIONS.has(s.clearOf.faction)) bad(w, 'clearOf unknown faction "' + s.clearOf.faction + '"');
        }
        break;
      case 'spawnCar':
        if (!VEHICLES.has(s.type)) bad(w, 'unknown vehicle type "' + s.type + '"');
        if (s.at && !whereOk(s.at, st)) bad(w, 'spawnCar place "' + s.at + '" not defined (or a car spawned later)');
        st.cars.add(s.spawnCar);
        if (AIRCRAFT.has(s.type)) st.air.add(s.spawnCar);
        break;
      case 'getIn': if (s.getIn !== 'any' && s.getIn !== 'aircraft' && !st.cars.has(s.getIn)) bad(w, 'getIn car "' + s.getIn + '" was never spawned'); break;
      case 'fly': case 'land':
        if (!whereOk(s[kind], st)) bad(w, kind + ' place "' + (typeof s[kind] === 'string' ? s[kind] : JSON.stringify(s[kind])) + '" not defined (a place id or { x, z })');
        for (const k of ['height', 'radius']) if (s[k] !== undefined && !(typeof s[k] === 'number' && s[k] >= (k === 'height' ? 0 : 1))) bad(w, kind + ' ' + k + ' must be a number');
        if (s.height !== undefined && kind === 'land') soft(w, 'land ignores height');
        if (s.vehicle !== undefined) {
          if (!st.cars.has(s.vehicle)) bad(w, kind + ' vehicle "' + s.vehicle + '" was never spawned');
          else if (!st.air.has(s.vehicle)) bad(w, kind + ' vehicle "' + s.vehicle + '" is not an aircraft');
        }
        break;
      case 'holdup':
        if (typeof s.holdup !== 'string' || (s.holdup !== 'any' && !/^store_\d+$/.test(s.holdup) && !placeOk(s.holdup))) bad(w, 'holdup "' + s.holdup + '": a place id, a store_N id or \'any\'');
        if (s.till !== undefined) soft(w, 'holdup till: is not built (the clerk still fills the bag)');
        break;
      case 'explode': if (!st.cars.has(s.explode)) bad(w, 'explode car "' + s.explode + '" was never spawned'); break;
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
        if (s.escapeTo !== undefined && (kind !== 'chase' || !placeOk(s.escapeTo))) bad(w, 'escapeTo "' + s.escapeTo + '": a place, on a chase');
        if (s.min !== undefined && !(typeof s.min === 'number' && s.min >= 0)) bad(w, 'follow min must be a number (0 = a friendly escort)');
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
          if (o.flag && inDlc && !/^dlc_/.test(o.flag)) bad(w, 'DLC flag "' + o.flag + '" must start with dlc_');
          if (o.then) steps(w + ' [' + o.label + ']', o.then, st);
        }
        break;
      case 'if':
        for (const f of [].concat(s.if)) flagsUsed.push([w, f.replace(/^!/, '')]);
        if (s.then) steps(w + ' [then]', s.then, st);
        if (s.else) steps(w + ' [else]', s.else, st);
        break;
      case 'setFlag':
        for (const f of [].concat(s.setFlag)) {
          flagsSet.add(f);
          if (inDlc && !/^dlc_/.test(f)) bad(w, 'DLC flag "' + f + '" must start with dlc_');
        }
        break;
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
  if (['chain', 'auto', 'intro'].includes(m.start) && !m.resumeAt) bad(where, 'self-starting job has no resumeAt (nowhere to restart it after a quit or a failed attempt)');
  if (m.resumeAt && !placeOk(m.resumeAt)) bad(where, 'resumeAt place "' + m.resumeAt + '" not defined');
  for (const r of m.requires || []) if (!allMissions.has(r)) bad(where, 'requires unknown mission "' + r + '"');
  if (!m.estMinutes) soft(where, 'no estMinutes');
  if (inDlc) cDlc[isMain ? 'est' : 'estSide'] += m.estMinutes || 0;
  else if (isMain) est += m.estMinutes || 0;
  else estSide += m.estMinutes || 0;
  for (const w of (m.reward && m.reward.weapons) || []) if (!WEAPONS.has(w)) bad(where, 'reward weapon "' + w + '" unknown');
  const st = { cars: new Set(), actors: new Set(), groups: new Set(), air: new Set() };
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
for (const t of story.texts || []) {
  if (t.after && !allMissions.has(t.after)) bad('text', 'after unknown mission "' + t.after + '"');
  if (!speakers.has(t.from)) bad('text', 'unknown sender "' + t.from + '"');
}
// ------------------------------------------------------------ the DLC
if (dlc) {
  inDlc = true;
  cnt = cDlc;
  const W = 'DLC ' + dlc.id;
  if (!dlc.title) soft(W, 'no title');
  if (!dlc.unlockAfter) bad(W, 'unlockAfter is empty (the main story job that opens the DLC)');
  else if (!main.some((m) => m.id === dlc.unlockAfter)) bad(W, 'unlockAfter "' + dlc.unlockAfter + '" is not a main-story job');
  for (const [id, f] of Object.entries(dlc.factions || {})) if (!f.name) bad('DLC faction ' + id, 'no name');
  if (dlc.unlockText && !speakers.has(dlc.unlockText.from)) bad(W, 'unlockText from unknown "' + dlc.unlockText.from + '"');
  const dlcIds = new Set(dlcMain.concat(...dlcSide.map((c) => c.missions || [])).map((m) => m.id));
  dlcMain.forEach((m, i) => {
    if (!/^d\d\d_[a-z0-9_]+$/.test(m.id || '')) bad(m.id || W, 'DLC main job ids are d01_snake_case … d30_…');
    if (!(m.act >= 1 && m.act <= 4)) bad(m.id, 'act must be 1 to 4');
    if (i === 0 && (m.start === 'chain' || m.start === 'auto')) bad(m.id, 'the first DLC job needs a start place');
    for (const r of m.requires || []) if (!dlcIds.has(r) && r !== dlc.unlockAfter && !allMissions.has(r)) bad(m.id, 'requires unknown job "' + r + '"');
    mission(m, true);
  });
  for (const ch of dlcSide) {
    const cw = ch.id || 'DLC side chain';
    if (!/^dside_[a-z0-9_]+$/.test(ch.id || '')) bad(cw, 'DLC side chain ids are dside_<chain>');
    if (!ch.title) bad(cw, 'no title');
    if (ch.giver && !chars[ch.giver]) bad(cw, 'giver "' + ch.giver + '" is not a character');
    if (!ch.unlockAfter) soft(cw, 'no unlockAfter (open from the start of the DLC)');
    else if (!allMissions.has(ch.unlockAfter)) bad(cw, 'unlockAfter unknown job "' + ch.unlockAfter + '"');
    for (const m of ch.missions || []) {
      if (!/^ds[a-z]+\d+_[a-z0-9_]+$/.test(m.id || '')) bad(m.id || cw, 'DLC side job ids are ds<chain letter><n>_snake_case');
      mission(m, false);
    }
  }
  for (const m of dlcMain.concat(...dlcSide.map((c) => c.missions || []))) {
    if (m.giver && !chars[m.giver]) bad(m.id, 'giver "' + m.giver + '" is not a character');
    if (m.requiresFlag) flagsUsed.push([m.id, String(m.requiresFlag).replace(/^!/, '')]);
  }
  for (const t of dlc.texts || []) {
    if (t.after && !allMissions.has(t.after)) bad('DLC text', 'after unknown job "' + t.after + '"');
    if (!speakers.has(t.from)) bad('DLC text', 'unknown sender "' + t.from + '"');
    if (t.message && t.message.length > 240) soft('DLC text', 'long message');
  }
  inDlc = false;
  cnt = cMain;
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
    if (a.steps) steps(where, a.steps, { cars: new Set(), actors: new Set(), groups: new Set(), air: new Set() });
  }
}
for (const st of Object.values(act.radio || {})) for (const l of st.lines || []) if (typeof (l.text || l) !== 'string') bad('radio', 'bad radio line');
// Flags last, so ones set by activity choices (bounties) count.
for (const [w, f] of flagsUsed) if (!flagsSet.has(f) && !/^unlocked:/.test(f) && !allMissions.has(f)) soft(w, 'flag "' + f + '" is tested but never set');

for (const p of problems) console.log('✗ ' + p);
for (const p of warn) console.log('· ' + p);
console.log((problems.length ? '✗ ' : '✓ ') + problems.length + ' problems, ' + warn.length + ' warnings · ' + main.length + ' main missions, ' + (story.side || []).reduce((n, c) => n + (c.missions || []).length, 0) + ' side missions · ' + lineCount + ' lines, ' + wordCount + ' words · est ' + Math.round(est) + ' min main + ' + Math.round(estSide) + ' min side');
if (dlc || summary) {
  const nSide = dlcSide.reduce((n, c) => n + (c.missions || []).length, 0);
  console.log('  DLC "' + ((dlc && dlc.title) || '-') + '": ' + dlcMain.length + ' main jobs, ' + dlcSide.length + ' side chains, ' + nSide + ' side jobs · ' + cDlc.lines + ' lines, ' + cDlc.words + ' words · est ' + Math.round(cDlc.est) + ' min main + ' + Math.round(cDlc.estSide) + ' min side (' + ((cDlc.est + cDlc.estSide) / 60).toFixed(1) + ' h)');
}
if (summary) {
  console.log('  main story: ' + main.length + ' main, ' + (story.side || []).reduce((n, c) => n + (c.missions || []).length, 0) + ' side · ' + cMain.lines + ' lines, ' + cMain.words + ' words · est ' + Math.round(est) + ' + ' + Math.round(estSide) + ' min');
  if (dlc) for (const a of Object.keys(dlc.acts || {})) {
    const js = dlcMain.filter((m) => String(m.act) === String(a));
    console.log('  DLC act ' + a + ' "' + (dlc.acts[a].title || '') + '": ' + js.length + ' jobs, est ' + js.reduce((n, m) => n + (m.estMinutes || 0), 0) + ' min');
  }
}
if (problems.length) process.exitCode = 1;
