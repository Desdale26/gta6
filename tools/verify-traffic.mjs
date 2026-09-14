// verify-traffic.mjs — drive a city's worth of AI traffic with no browser.
//
// Game.validate() has always been able to say "eight of thirty traffic cars are
// on their roof" and "a vehicle is doing 140 m/s", but it could only say it
// from inside a running browser, five minutes per boot, and only when the run
// happened to hit the bug. Everything those reports depend on — the road graph,
// the driver, the tyre model, the collision solver — is plain JavaScript with
// no rendering in it, so it can all run here instead, deterministically, in a
// couple of seconds.
//
// It earns its place: the bug that made ambient traffic roll over across the
// city was a shared scratch vector in applyImpulseAt, and this file is what
// found it. Two cars idling seven metres apart went from 1 m/s to the sim's
// 140 m/s ceiling in a single frame, because the reaction half of a collision
// pair was applied at whatever world point the action half had left in _v1.
// Put that bug back and this reports the rollovers and the 140 m/s again.
//
//   node tools/verify-traffic.mjs
import { PhysicsWorld, SURFACE } from '../src/physics/world.js';
import { VehicleSim } from '../src/physics/vehiclePhysics.js';
import { VEHICLES } from '../src/content/vehicleCatalog.js';
import { RoadGraph, ROAD_TYPE } from '../src/world/roads.js';
import { VehicleAI, DRIVER_MODE } from '../src/entities/traffic.js';
import { RNG } from '../src/core/rng.js';

const FLAT = {
  heightAt: () => 0,
  normalAt: (x, z, o) => { o.x = 0; o.y = 1; o.z = 0; return o; },
  surfaceAt: () => SURFACE.ROAD, isWater: () => false, waterLevel: -50, maxHeight: 1,
};
// Flat ground and no buildings on purpose: anything that goes wrong here went
// wrong between the cars and the road, with no terrain or scenery to blame.
const MIX = ['pennant-meridian', 'helion-quicksilver-ev', 'ardent-sidewinder-gt', 'civicworks-districtliner'];
const SEEDS = [1, 7, 42, 1234, 99999];
const CARS = 24;
const SECONDS = 60;
const DT = 1 / 60;

// Two ceilings, because the two failures look different. A solver that has
// blown up reports a speed no throttle could produce — the collision-impulse
// bug hit the sim's own 140 m/s clamp — so that is caught on total speed, with
// enough headroom that a car genuinely sliding sideways off a corner is not.
// A driver that has lost the plot stays within the solver but outside its
// orders: the reverse-gear runaway sat at a steady 41 m/s backwards while the
// road it was on is posted at 22. That one is caught along the car's own nose,
// where the governor works, and it is signed, so backwards counts.
const MAX_SPEED = 45;
const MAX_DRIVEN_SPEED = 30;
// One car in five sixty-second runs finding a way to end up on its roof is a
// bad driver. Two in one run is the physics.
const MAX_ROLLED = 1;

function grid() {
  const g = new RoadGraph();
  const N = 6, S = 90;
  const n = [];
  for (let i = 0; i < N; i++) { n[i] = []; for (let j = 0; j < N; j++) n[i][j] = g.addNode(i * S, j * S); }
  // Every junction has four ways out: the outer ring closes the grid rather
  // than leaving twenty dead ends around the edge. Cul-de-sacs are not what
  // this file is for — cars nose-to-tail in a cul-de-sac shunt each other, and
  // that is a traffic jam, not a physics fault. The real city's road network
  // has a highway ring for the same reason.
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    g.addEdge(n[i][j], n[(i + 1) % N][j], ROAD_TYPE.ARTERIAL, null);
    g.addEdge(n[i][j], n[i][(j + 1) % N], ROAD_TYPE.ARTERIAL, null);
  }
  g.buildIndex();
  return g;
}

/** A stand-in for entities/vehicle.js with the mesh, audio and damage art left out. */
function makeCar(def, phys, ctx) {
  const car = { def, ctx, dead: false, indicator: 0, honk() {} };
  car.setControls = (th, br, st, hb, rv) => {
    const s = car.sim;
    s.throttle = Math.min(1, Math.max(0, th));
    s.brake = Math.min(1, Math.max(0, br));
    s.steerInput = Math.min(1, Math.max(-1, st));
    s.handbrake = Math.min(1, Math.max(0, hb));
    s.reverseHeld = Math.min(1, Math.max(0, rv ?? 0));
  };
  Object.defineProperty(car, 'collider', { get() { return car.sim.collider; } });
  return car;
}

function runSeed(seed) {
  const phys = new PhysicsWorld(); phys.setTerrain(FLAT);
  const ctx = { physics: phys };
  const graph = grid();
  const rng = new RNG(seed);
  const point = { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } };
  const cars = [];
  for (let tries = 0; cars.length < CARS && tries < 600; tries++) {
    const e = graph.edges[rng.int(0, graph.edges.length - 1)];
    const dir = rng.bool() ? 1 : -1;
    const lane = rng.int(0, e.lanesPerDir - 1);
    const t = rng.range(0.1, 0.9);
    e.lanePoint(dir, lane, t, point);
    if (cars.some((c) => Math.hypot(c.sim.position.x - point.x, c.sim.position.z - point.z) < 9)) continue;
    const def = VEHICLES.find((v) => v.id === MIX[cars.length % MIX.length]);
    const car = makeCar(def, phys, ctx);
    car.sim = new VehicleSim(def, phys, { yaw: Math.atan2(e.dx * dir, e.dz * dir), owner: car });
    car.sim.position.set(point.x, car.sim.rideHeight, point.z);
    car.sim.velocity.set(e.dx * dir * 8, 0, e.dz * dir * 8);
    const ai = new VehicleAI(car, graph, rng, DRIVER_MODE.TRAFFIC);
    ai.edge = e; ai.dir = dir; ai.lane = lane; ai.t = t;
    car.ai = ai;
    phys.addDynamic(car);
    cars.push(car);
  }

  let fastest = { speed: 0, id: '', t: 0 };
  let driven = { speed: 0, id: '', t: 0 };
  const rolled = [];
  for (let f = 0; f < SECONDS / DT; f++) {
    phys.refreshDynamics();
    graph.update(DT);
    for (const c of cars) c.ai.update(DT);
    for (const c of cars) c.sim.update(DT);
    for (const c of cars) {
      if (process.env.TRAFFIC_VERBOSE && c.sim.speed > (c.__prev ?? 0) + 5 && f > 2) {
        console.log(`    jump t=${(f * DT).toFixed(2)} ${c.def.id} ${(c.__prev ?? 0).toFixed(1)} -> ${c.sim.speed.toFixed(1)} m/s`
          + ` at ${c.sim.position.x.toFixed(0)},${c.sim.position.z.toFixed(0)} up.y ${c.sim.up.y.toFixed(2)}`
          + ` wheels ${c.sim.wheelsOnGround} spin ${c.sim.angularVelocity.length().toFixed(1)}`);
      }
      c.__prev = c.sim.speed;
      if (c.sim.speed > fastest.speed) fastest = { speed: c.sim.speed, id: c.def.id, t: f * DT };
      if (Math.abs(c.sim.forwardSpeed) > Math.abs(driven.speed)) driven = { speed: c.sim.forwardSpeed, id: c.def.id, t: f * DT };
      if (process.env.TRAFFIC_VERBOSE) {
        if (c.sim.up.y < 0.9 && c.__watch === undefined) c.__watch = f;
        if (c.__watch !== undefined && f - c.__watch < 360 && (f - c.__watch) % 6 === 0) {
          console.log(`    tip ${c.def.id.padEnd(22)} t=${(f * DT).toFixed(2)} up.y ${c.sim.up.y.toFixed(2)}`
            + ` v ${c.sim.speed.toFixed(1)} wheels ${c.sim.wheelsOnGround} chassis ${c.sim.chassisContacts ?? 0}`
            + ` spin ${c.sim.angularVelocity.length().toFixed(2)} hp ${Math.round(c.sim.health)}`
            + ` at ${c.sim.position.x.toFixed(0)},${c.sim.position.y.toFixed(2)},${c.sim.position.z.toFixed(0)}`);
        }
      }
      if (c.sim.up.y < 0.2 && !c.__rolled) {
        c.__rolled = true;
        rolled.push({ id: c.def.id, t: f * DT, hp: c.sim.health, max: c.sim.maxHealth });
      }
    }
  }
  if (process.env.TRAFFIC_VERBOSE) {
    for (const c of cars) {
      if (c.sim.speed > 1 && c.sim.health >= c.sim.maxHealth * 0.5) continue;
      console.log(`    idle ${c.def.id.padEnd(24)} ${c.sim.speed.toFixed(1)} m/s hp ${Math.round(c.sim.health)}/${c.sim.maxHealth}`
        + ` at ${c.sim.position.x.toFixed(0)},${c.sim.position.z.toFixed(0)} gear ${c.sim.gear} thr ${c.sim.throttle.toFixed(2)}`
        + ` brk ${c.sim.brake.toFixed(2)} stuck ${c.ai.stuckTime.toFixed(1)} blocked ${c.ai.blockedTime.toFixed(1)}`
        + ` exploded ${!!c.sim.exploded} edge ${c.ai.edge?.id} t ${c.ai.t?.toFixed(2)} dir ${c.ai.dir}`);
    }
  }
  const wrecked = cars.filter((c) => c.sim.health < c.sim.maxHealth * 0.5).length;
  const moved = cars.filter((c) => c.sim.speed > 1).length;
  return { seed, n: cars.length, rolled, wrecked, moved, fastest, driven };
}

console.log('traffic  (24 AI cars, 60 s, flat 6x6 arterial grid)');
const failures = [];
for (const seed of SEEDS) {
  const r = runSeed(seed);
  const bad = [];
  if (r.rolled.length > MAX_ROLLED) {
    const e = r.rolled[0];
    bad.push(`${r.rolled.length} rolled over (first: ${e.id} at ${e.t.toFixed(0)}s on ${Math.round(e.hp)}/${Math.round(e.max)} hp)`);
  }
  if (r.fastest.speed > MAX_SPEED) bad.push(`${r.fastest.id} reached ${r.fastest.speed.toFixed(0)} m/s at ${r.fastest.t.toFixed(0)}s`);
  if (Math.abs(r.driven.speed) > MAX_DRIVEN_SPEED) {
    bad.push(`${r.driven.id} drove at ${r.driven.speed.toFixed(0)} m/s along its own nose at ${r.driven.t.toFixed(0)}s`);
  }
  if (r.wrecked > r.n * 0.3) bad.push(`${r.wrecked} of ${r.n} wrecked`);
  // A seed where nothing moves would pass every check above by doing nothing.
  if (r.moved < r.n * 0.5) bad.push(`only ${r.moved} of ${r.n} were still driving`);
  const ok = !bad.length;
  console.log(`  ${ok ? 'ok     ' : 'WRONG  '}seed ${String(r.seed).padStart(5)}: `
    + `${r.rolled.length} rolled, ${r.wrecked} wrecked, ${r.moved}/${r.n} driving, `
    + `peak ${r.fastest.speed.toFixed(1)} m/s (${r.driven.speed.toFixed(1)} driven)`);
  for (const b of bad) failures.push(`traffic seed ${r.seed}: ${b}`);
}

console.log('');
if (failures.length) {
  console.log('FAIL');
  for (const f of failures) console.log('  ! ' + f);
  process.exit(1);
}
console.log(`${SEEDS.length}/${SEEDS.length} seeds clean — the city drives itself without rolling over`);
