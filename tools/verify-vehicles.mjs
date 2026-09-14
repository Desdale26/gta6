// verify-vehicles.mjs — put every vehicle in the catalogue on a flat road and
// see whether it can actually be driven.
//
// The catalogue quotes a top speed for each vehicle, worked out from its
// gearing, and nothing had ever checked that the vehicle could reach it. Ten
// could not. Every bus, both fire engines, the APC, the cement mixer and the
// refuse truck topped out between a third and two thirds of their figure,
// because their wheels were oscillating between spinning forwards and spinning
// backwards while the vehicle was doing 50 km/h — a stiff-system blow-up from
// giving a fourteen-tonne truck a wheel with a hatchback's rotational inertia.
// The Dust Devil could not be ridden at all: 116 kg with a superbike's power to
// weight, it stood on its tail in five seconds, every time.
//
// None of that is visible from reading the code, and none of it showed up in a
// browser check, because nothing in the game ever asks a bus for its top speed.
//
//   node tools/verify-vehicles.mjs
import { PhysicsWorld, SURFACE } from '../src/physics/world.js';
import { VehicleSim } from '../src/physics/vehiclePhysics.js';
import { VEHICLES } from '../src/content/vehicleCatalog.js';

const FLAT = {
  heightAt: () => 0,
  normalAt: (x, z, o) => { o.x = 0; o.y = 1; o.z = 0; return o; },
  surfaceAt: () => SURFACE.ROAD, isWater: () => false, waterLevel: -50, maxHeight: 1,
};
const DT = 1 / 120;
const SKIP = new Set(['boat', 'heli', 'plane']);
const REACH = 0.6;          // fraction of the quoted top speed a 35 s run must reach
const UPRIGHT = 0.35;       // up.y below this for a sustained spell is "fell over"
const TIPPED_STEPS = 120;   // one second of it

function fresh(def, yaw = 0) {
  const phys = new PhysicsWorld(); phys.setTerrain(FLAT);
  const sim = new VehicleSim(def, phys, { yaw });
  sim.position.set(0, sim.rideHeight, 0);
  for (let i = 0; i < 120; i++) { sim.throttle = 0; sim.brake = 1; sim.update(DT); }
  return sim;
}

/** Flat out in a straight line. */
function straight(def) {
  const sim = fresh(def);
  let peak = 0, tipped = 0, backspin = 0;
  for (let i = 0; i < 120 * 35; i++) {
    sim.throttle = 1; sim.brake = 0; sim.steerInput = 0;
    sim.update(DT);
    peak = Math.max(peak, sim.speed);
    if (sim.up.y < UPRIGHT) tipped++;
    // A wheel turning backwards under a vehicle that is driving forwards is not
    // a thing a wheel does. It is the integrator oscillating.
    if (sim.forwardSpeed > 3) {
      for (const w of sim.wheels) if (w.angularVel * w.radius < -1) { backspin++; break; }
    }
  }
  return { peak, end: sim.speed, tipped, backspin, upright: sim.up.y };
}

/** Flat out, full lock, on a surface with nothing to trip over. */
function corner(def, steer) {
  const sim = fresh(def);
  let worst = 1, at = 0;
  for (let i = 0; i < 120 * 25; i++) {
    sim.throttle = 1; sim.brake = 0;
    sim.steerInput = i > 120 * 4 ? steer : 0;
    sim.update(DT);
    if (sim.up.y < worst) { worst = sim.up.y; at = sim.speed; }
  }
  return { worst, at };
}

console.log('vehicles  (every land vehicle, flat road, full throttle)');
const failures = [];
let run = 0, ok = 0;
for (const def of VEHICLES) {
  if (SKIP.has(def.body?.kind)) continue;
  run++;
  const s = straight(def);
  const bad = [];
  if (s.tipped > TIPPED_STEPS) bad.push(`fell over (up.y ${s.upright.toFixed(2)})`);
  if (s.backspin > TIPPED_STEPS) bad.push(`wheels ran backwards for ${(s.backspin / 120).toFixed(1)}s`);
  if (def.topSpeed && s.peak < def.topSpeed * REACH) {
    bad.push(`reached ${s.peak.toFixed(1)} of a quoted ${def.topSpeed.toFixed(1)} m/s`);
  }
  // Bikes lean by design; a car putting a door handle on the road is not leaning.
  if (def.body.kind !== 'bike') {
    for (const st of [1, -1]) {
      const c = corner(def, st);
      if (c.worst < 0.6) bad.push(`rolled onto its side turning ${st > 0 ? 'one' : 'the other'} way at ${c.at.toFixed(0)} m/s`);
    }
  }
  if (bad.length) {
    console.log(`  WRONG  ${def.id.padEnd(28)} ${bad.join('; ')}`);
    failures.push(`${def.id}: ${bad.join('; ')}`);
  } else {
    ok++;
  }
}

console.log('');
console.log(`${ok}/${run} land vehicles reach their quoted top speed, upright, without their wheels changing their minds`);
if (failures.length) {
  console.log('\nFAIL');
  for (const f of failures) console.log('  ! ' + f);
  process.exit(1);
}
