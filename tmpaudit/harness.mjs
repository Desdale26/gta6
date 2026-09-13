import { VehicleSim } from '../src/physics/vehiclePhysics.js';
import { SURFACE } from '../src/physics/world.js';
import { getVehicle, VEHICLES } from '../src/content/vehicleCatalog.js';

export function makePhys() {
  return {
    gravity: -9.81,
    waterLevel: 0,
    wind: { x: 0, y: 0, z: 0 },
    terrain: { heightAt: () => 0, isWater: () => false, isRoad: () => true },
    overlapSphereStatic: (x, y, z, r, out) => { out.length = 0; return out; },
    overlapSphereDynamic: (x, y, z, r, out) => { out.length = 0; return out; },
    raycast(ox, oy, oz, dx, dy, dz, maxDist) {
      // flat ground at y=0, ray pointing down
      if (dy >= -1e-6) return { hit: false };
      const t = (0 - oy) / dy;
      if (t < 0 || t > maxDist) return { hit: false };
      return { hit: true, dist: t, px: ox + dx * t, py: 0, pz: oz + dz * t,
               nx: 0, ny: 1, nz: 0, surface: SURFACE.ROAD };
    },
  };
}

export function makeCar(id, opts = {}) {
  const def = getVehicle(id) || VEHICLES[0];
  const sim = new VehicleSim(def, makePhys(), opts);
  sim.setTransform(0, sim.rideHeight, 0, 0);
  return sim;
}
export const yawOf = (sim) => Math.atan2(sim.forward.x, sim.forward.z);
