import { makeCar, yawOf } from './harness.mjs';
import { VEHICLES } from '../src/content/vehicleCatalog.js';
const car = VEHICLES.find(v => v.cls === 'sedan') || VEHICLES[0];
console.log('vehicle:', car.id, car.cls, 'drivetrain', car.drivetrain);

// --- A: hold W then D (steer right) ---
for (const [label, steer] of [['D (moveX=+1)', 1], ['A (moveX=-1)', -1]]) {
  const sim = makeCar(car.id, { assist: 0 });
  sim.throttle = 1; sim.brake = 0; sim.steerInput = 0;
  for (let i = 0; i < 180; i++) sim.update(1/60);   // 3 s accelerate
  const y0 = yawOf(sim), p0 = { x: sim.position.x, z: sim.position.z };
  sim.steerInput = steer;
  for (let i = 0; i < 120; i++) sim.update(1/60);   // 2 s steering
  const y1 = yawOf(sim);
  console.log(`${label}: speed ${sim.speed.toFixed(1)} m/s  yaw ${y0.toFixed(3)} -> ${y1.toFixed(3)}  (delta ${(y1-y0).toFixed(3)})  lateral offset ${(sim.position.x - p0.x).toFixed(2)} m  => turns ${(y1-y0) > 0 ? 'RIGHT' : 'LEFT'}`);
}
