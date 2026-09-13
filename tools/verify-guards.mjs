// verify-guards.mjs — checks the checks.
//
// Every catalogue in this project validates itself, and for a long time one of
// them validated nothing: validateDistricts confirmed its reference lists were
// non-empty and never confirmed that a single id resolved, so a district whose
// entire ped mix was misspelled passed clean. A validator that reports no
// problems looks exactly like a validator that asks no questions, and the only
// way to tell them apart is to hand each one something broken and insist it
// complains.
//
// So this hands each validator a deep copy of its own catalogue with one field
// wrecked, and fails if the validator stays quiet. The real catalogues are
// never touched: every validate* function takes the data to check as an
// argument precisely so this file can pass a copy.
//
//   node tools/verify-guards.mjs
import { WEAPONS, validateWeapons } from '../src/content/weaponCatalog.js';
import { VEHICLES, validateVehicles } from '../src/content/vehicleCatalog.js';
import { SHOP_TYPES, validateShops } from '../src/content/shopCatalog.js';
import { STUNT_SPOTS, TRICKS, validateStunts } from '../src/content/stuntCatalog.js';
import { STATIONS, validateStations } from '../src/content/radioCatalog.js';
import { MISSIONS, validateMissions } from '../src/content/missionCatalog.js';
import { DISTRICTS, validateDistricts } from '../src/content/districtCatalog.js';
import { RoadEdge } from '../src/world/roads.js';
import * as THREE from 'three';
import { PhysicsWorld, SURFACE } from '../src/physics/world.js';
import { VehicleSim, wheelMeshLocalY } from '../src/physics/vehiclePhysics.js';

const copy = (x) => structuredClone(x);
/** A weapon that actually fires bullets, so the damage-model rules apply to it. */
const gunIndex = WEAPONS.findIndex((w) => w.slot !== 'melee' && w.slot !== 'throwable' && w.magazine > 0);
const carIndex = Math.max(0, VEHICLES.findIndex((v) => v.cls === 'sedan'));
const challengeIndex = STUNT_SPOTS.findIndex((s) => s.challenge);
const racePath = (() => {
  for (let i = 0; i < MISSIONS.length; i++) {
    const j = MISSIONS[i].objectives.findIndex((o) => o.kind === 'race' && o.checkpoints && o.checkpoints.length >= 2);
    if (j >= 0) return [i, j];
  }
  return null;
})();

const SUITES = [
  {
    name: 'weapons', file: 'weaponCatalog.js',
    args: () => [copy(WEAPONS)], validate: validateWeapons,
    cases: [
      ['a duplicate weapon id', (w) => { w[1].id = w[0].id; }],
      ['a weapon that does no damage', (w) => { w[gunIndex].damage = 0; }],
      ['a weapon less accurate aimed than from the hip', (w) => { w[gunIndex].spread.aim = w[gunIndex].spread.hip + 1; }],
      ['less reserve ammunition than one magazine', (w) => { w[gunIndex].reserveMax = w[gunIndex].magazine - 1; }],
      ['damage falloff that ends before it starts', (w) => { w[gunIndex].falloffEnd = w[gunIndex].falloffStart - 1; }],
      ['a fire rate of zero rounds per minute', (w) => { w[gunIndex].fireRateRpm = 0; }],
      ['a weapon slot that does not exist', (w) => { w[gunIndex].slot = 'trouser-leg'; }],
      ['an id that is not kebab-case', (w) => { w[2].id = 'Not Kebab Case'; }],
      ['a magazine that reloads in no time', (w) => { w[gunIndex].reloadTime = 0; }],
      ['a required weapon deleted from the catalogue', (w) => { w.splice(0, 4); }],
    ],
  },
  {
    name: 'vehicles', file: 'vehicleCatalog.js',
    args: () => [copy(VEHICLES)], validate: validateVehicles,
    cases: [
      ['a duplicate vehicle id', (v) => { v[1].id = v[0].id; }],
      ['a wheelbase longer than the car', (v) => { v[carIndex].wheelbase = v[carIndex].length + 1; }],
      ['a track wider than the body', (v) => { v[carIndex].track = v[carIndex].width + 1; }],
      ['a car that weighs ten kilograms', (v) => { v[carIndex].mass = 10; }],
      ['a vehicle class that does not exist', (v) => { v[carIndex].cls = 'hovercraft'; }],
      ['a centre of gravity above the roof', (v) => { v[carIndex].cogHeight = 4; }],
      ['more AI occupants than seats', (v) => { v[carIndex].maxOccupantsAI = v[carIndex].seats + 3; }],
      ['every motorcycle removed', (v) => { for (let i = v.length - 1; i >= 0; i--) if (v[i].cls === 'motorcycle') v.splice(i, 1); }],
      ['every boat removed', (v) => { for (let i = v.length - 1; i >= 0; i--) if (v[i].cls === 'boat') v.splice(i, 1); }],
    ],
  },
  {
    name: 'shops', file: 'shopCatalog.js',
    args: () => [copy(SHOP_TYPES)], validate: validateShops,
    cases: [
      ['a shop with nothing to sell', (s) => { s[0].inventory = []; }],
      ['a till range that runs backwards', (s) => { s[0].robbery.tillCash = [900, 100]; }],
      ['a robbery worth six wanted stars', (s) => { s[1].robbery.wanted = 6; }],
      ['a grab that takes no time at all', (s) => { s[2].robbery.grabTime = 0; }],
      ['an item priced below zero', (s) => { s[0].inventory[0].price = -5; }],
      ['a gun shop selling a weapon with no weapon id', (s) => {
        for (const t of s) { const it = t.inventory.find((i) => i.kind === 'weapon'); if (it) { delete it.weaponId; return; } }
        s[0].inventory.push({ id: 'ghost', kind: 'weapon', price: 10 });
      }],
      ['a car service in a shop you cannot drive into', (s) => {
        for (const t of s) if (t.driveIn) { delete t.driveIn; return; }
        s[0].inventory.push({ id: 'refuel', kind: 'service', price: 90 });
      }],
      ['a shop selling a weapon that does not exist', (s) => {
        for (const t of s) { const it = t.inventory.find((i) => i.kind === 'weapon'); if (it) { it.weaponId = 'plasma-rifle'; return; } }
      }],
      ['a safe that cannot be cracked', (s) => {
        for (const t of s) if (t.robbery.safeCash[1] > 0) { t.robbery.safeTime = 0; return; }
        s[0].robbery.safeCash = [100, 200]; s[0].robbery.safeTime = 0;
      }],
    ],
  },
  {
    name: 'stunts', file: 'stuntCatalog.js',
    args: () => [copy(STUNT_SPOTS), copy(TRICKS)], validate: validateStunts,
    cases: [
      ['a duplicate stunt spot', (sp) => { sp[1].id = sp[0].id; }],
      ['a stunt kind nothing can build', (sp) => { sp[0].kind = 'trampoline'; }],
      ['a stunt spot outside the map', (sp) => { sp[0].x = 99999; }],
      ['medal times that do not ascend', (sp) => { sp[challengeIndex].challenge.silver = sp[challengeIndex].challenge.gold + 1; }],
      ['a medal worth nothing', (sp) => { sp[challengeIndex].challenge.reward = 0; }],
      ['a trick worth negative points', (sp, tr) => { tr[0].base = -10; }],
      ['half the stunt spots deleted', (sp) => { sp.splice(0, Math.ceil(sp.length / 2)); }],
    ],
  },
  {
    name: 'radio', file: 'radioCatalog.js',
    args: () => [copy(STATIONS)], validate: validateStations,
    cases: [
      ['a duplicate station id', (st) => { st[1].id = st[0].id; }],
      ['a station with one track', (st) => { st[0].tracks = [st[0].tracks[0]]; }],
      ['a station with no idents', (st) => { st[0].idents = []; }],
      ['a track at four hundred beats per minute', (st) => { st[0].tracks[0].bpm = 400; }],
      ['a drum pattern that is not sixteen steps', (st) => { st[0].tracks[0].drums.kick = [1, 0, 1]; }],
      ['a bass line in an unplayable octave', (st) => { st[0].tracks[0].bass.octave = 12; }],
      ['a track in a scale the synth cannot play', (st) => { st[0].tracks[0].scale = 'klingon'; }],
      ['half the stations taken off the air', (st) => { st.splice(0, Math.ceil(st.length / 2)); }],
    ],
  },
  {
    name: 'missions', file: 'missionCatalog.js',
    args: () => [copy(MISSIONS)], validate: validateMissions,
    cases: [
      ['a mission that requires one that does not exist', (m) => { m[4].requires = ['no-such-mission']; }],
      ['a mission with no objectives', (m) => { m[3].objectives = []; }],
      ['a mission that pays nothing', (m) => { m[2].reward = 0; }],
      ['a mission that starts outside the map', (m) => { m[1].start = { x: 99999, z: 0 }; }],
      ['an objective kind nothing can run', (m) => { m[5].objectives[0].kind = 'befriend-a-pelican'; }],
      ['a mission with no briefing', (m) => { m[6].briefing = []; }],
      ['a race whose text promises a different lap count', (m) => {
        // Leave `laps` alone so the circuit-closes rule stays quiet and only
        // the text-versus-data rule can be what objects.
        const o = m[racePath[0]].objectives[racePath[1]];
        o.text = `Win the ${(o.laps ?? 1) === 5 ? 'four' : 'five'} lap race`;
      }, () => !!racePath],
      ['a race with a single checkpoint', (m) => { const [i, j] = racePath; m[i].objectives[j].checkpoints = [[0, 0]]; }, () => !!racePath],
      ['a duplicate mission id', (m) => { m[7].id = m[6].id; }],
    ],
  },
  {
    name: 'districts', file: 'districtCatalog.js',
    args: () => [copy(DISTRICTS)], validate: validateDistricts,
    cases: [
      ['a ped archetype that was never written', (d) => { d[0].pedMix = [{ id: 'beachgoerr', w: 4 }]; }],
      ['a vehicle class that does not exist', (d) => { d[0].vehicleMix = [{ cls: 'hovercraft', w: 1 }]; }],
      ['a shop type nothing sells', (d) => { d[0].shopTypes = [{ type: 'wizard-supplies', w: 1 }]; }],
      ['a radio station that is off the air', (d) => { d[0].radio = 'pirate-fm'; }],
      ['a facade the builder cannot render', (d) => { d[0].facade = ['artdeco', 'marzipan']; }],
      ['a missing prop dial', (d) => { delete d[0].props.palms; }],
      ['a prop dial nothing reads', (d) => { d[0].props.gargoyles = 0.5; }],
      ['an empty colour band', (d) => { d[0].palette.neon = []; }],
      ['a spawn weight of zero', (d) => { d[0].pedMix[0].w = 0; }],
      ['a district style that does not exist', (d) => { d[0].style = 'moonbase'; }],
      ['two districts on top of each other', (d) => { d[1].center = [...d[0].center]; }],
    ],
  },
];

let run = 0, caught = 0;
const failures = [];

for (const suite of SUITES) {
  const clean = suite.validate(...suite.args());
  console.log(`\n${suite.name}  (${suite.file})`);
  if (clean.length) {
    failures.push(`${suite.name}: the unmodified catalogue already has ${clean.length} problem(s): ${clean[0]}`);
    console.log(`  ! the catalogue is not clean to begin with: ${clean[0]}`);
  }
  for (const [what, wreck, applies] of suite.cases) {
    if (applies && !applies()) { console.log(`  -- skipped: ${what}`); continue; }
    const args = suite.args();
    run++;
    let problems;
    try {
      wreck(...args);
      problems = suite.validate(...args);
    } catch (e) {
      // A validator that throws on bad data has still noticed it, but a throw
      // loses the message and takes the rest of the run with it, so it counts
      // as a miss.
      failures.push(`${suite.name}: "${what}" made the validator throw instead of report — ${e.message}`);
      console.log(`  THREW  ${what.padEnd(52)} ${e.message.slice(0, 60)}`);
      continue;
    }
    const ok = problems.length > 0;
    if (ok) caught++; else failures.push(`${suite.name}: nothing objected to ${what}`);
    console.log(`  ${ok ? 'caught ' : 'MISSED '}${what.padEnd(52)} ${ok ? problems[0].slice(0, 66) : ''}`);
  }
  // The real catalogue must be untouched by all of that.
  const after = suite.validate();
  if (after.length) failures.push(`${suite.name}: the live catalogue now reports ${after.length} problem(s) — a copy leaked`);
}

// --- which side of the road does traffic drive on? -------------------------
// Not a catalogue, but the same kind of question and just as cheap to ask: a
// sign error here put every car in the city on the left-hand side, with the
// code's own comment claiming right-hand traffic.
console.log('');
console.log('roads  (roads.js)');
{
  const node = (x, z) => ({ x, z, edges: [] });
  const out = { set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; } };
  const bearings = [['due north', 0, 100], ['due east', 100, 0], ['due south', 0, -100],
    ['due west', -100, 0], ['north-east', 70, 70], ['south-west', -70, -70]];
  for (const [name, bx, bz] of bearings) {
    const a = node(0, 0), b = node(bx, bz);
    const e = new RoadEdge(a, b, 'street', null);
    e.lanePoint(1, 0, 0.5, out);
    const ox = out.x - bx / 2, oz = out.z - bz / 2;
    // Facing (dx, dz), the driver's right is (-dz, dx).
    const side = ox * -e.dz + oz * e.dx;
    const ok = side > 0.5;
    console.log(`  ${ok ? 'ok     ' : 'WRONG  '}heading ${name.padEnd(11)} lane centre `
      + `${Math.abs(side).toFixed(2)} m to the ${side > 0 ? 'right' : 'left'}`);
    if (!ok) failures.push(`roads: heading ${name}, traffic is put on the LEFT of the road`);
    run++;
    if (ok) caught++;
  }
}

// --- do the wheels the player sees touch the ground? -----------------------
// The sim and the renderer place the wheel independently, and for a long time
// they disagreed by a whole suspension rest length: every car in the city was
// drawn floating, by a quarter of a metre on a coupe and two thirds on a bus.
console.log('');
console.log('wheels  (vehicle.js syncMesh vs vehiclePhysics)');
{
  const flat = {
    heightAt: () => 0,
    normalAt: (x, z, o) => { o.x = 0; o.y = 1; o.z = 0; return o; },
    surfaceAt: () => SURFACE.ROAD, isWater: () => false, waterLevel: -50, maxHeight: 1,
  };
  const dt = 1 / 120;
  const _wheelPoint = new THREE.Vector3();
  for (const id of ['pennant-meridian', 'tanuki-shinobi-gtx', 'ironvale-roadliner-900', 'civicworks-districtliner']) {
    const def = VEHICLES.find((v) => v.id === id);
    if (!def) continue;
    const phys = new PhysicsWorld(); phys.setTerrain(flat);
    const sim = new VehicleSim(def, phys, {});
    sim.position.set(0, sim.rideHeight + 0.4, 0);
    for (let i = 0; i < 120 * 4; i++) { sim.throttle = 0; sim.brake = 1; sim.steerInput = 0; sim.update(dt); }
    let worst = 0;
    for (const w of sim.wheels) {
      // Exactly what vehicle.js syncMesh writes into the wheel mesh, carried
      // through the body's own transform: a settled car sits with a little
      // rake, and comparing a local y against the ground would read that rake
      // as an error. Correctly placed, this comes out under a millimetre.
      sim.localToWorld(w.lx, wheelMeshLocalY(w), w.lz, _wheelPoint);
      const bottom = _wheelPoint.y - sim.up.y * w.radius;
      if (Math.abs(bottom) > Math.abs(worst)) worst = bottom;
    }
    const ok = Math.abs(worst) < 0.02;
    console.log(`  ${ok ? 'ok     ' : 'WRONG  '}${id.padEnd(26)} drawn tyre bottom `
      + `${worst >= 0 ? '+' : ''}${worst.toFixed(3)} m from the ground`);
    if (!ok) failures.push(`wheels: ${id} is drawn ${worst.toFixed(2)} m off the ground`);
    run++;
    if (ok) caught++;
  }
}

console.log('');
console.log(`${caught}/${run} checks passed`);
if (failures.length) {
  console.log('\nFAIL');
  for (const f of failures) console.log('  ! ' + f);
  process.exit(1);
}
console.log('every content validator objects when the data is wrong, traffic keeps right, and the wheels touch the ground');
