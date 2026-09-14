// vehicleCatalog.js — pure data: every drivable thing in Leonida.
//
// No imports, no side effects beyond freezing the exported tables. Consumed by
// entities/vehicle.js (behaviour), entities/vehicleBody.js (procedural mesh from `body`),
// physics/vehiclePhysics.js (`engine` + `handling`) and gameplay/shops.js (`price`).
//
// Conventions (see docs/ARCHITECTURE.md):
//   * metres / kilograms / seconds, +Y up, vehicle forward is local +Z.
//   * `body.sections` sweep from the tail (t = 0) to the nose (t = 1).
//   * every brand, model and livery name here is invented parody — no real trademarks.
//
// topSpeed: ARCHITECTURE.md writes the drag-limited speed as
//   sqrt(2*P / (rho*Cd*A))
// which is dimensionally v^1.5 (W / (kg/m^3 * m^2) = m^3/s^3), so the catalogue uses the
// dimensionally correct cube root of exactly the same expression,
//   v = (2*P / (rho*Cd*A))^(1/3)
// scaled by a per-vehicle driveline/gearing/governor efficiency in [0.72, 1.0]. Every entry
// therefore sits inside the +/-25 % tolerance the contract asks for, and the numbers are
// plausible road speeds instead of hypersonic ones.

// ---------------------------------------------------------------------------
// Enumerations
// ---------------------------------------------------------------------------

export const VEHICLE_CLASSES = Object.freeze(['compact', 'sedan', 'coupe', 'sports', 'super', 'muscle', 'suv', 'pickup',
  'van', 'truck', 'bus', 'motorcycle', 'offroad', 'lowrider', 'service', 'emergency', 'military', 'utility',
  'exotic', 'classic', 'kart', 'quad', 'boat']);

export const BODY_KINDS = Object.freeze(['car', 'suv', 'pickup', 'van', 'truck', 'bus', 'bike', 'kart', 'quad', 'boat']);
export const RIM_STYLES = Object.freeze(['sport5', 'mesh', 'dish', 'spoke', 'steel', 'offroad', 'chrome', 'blade']);
export const DRIVETRAINS = Object.freeze(['rwd', 'fwd', 'awd']);
export const ENGINE_KINDS = Object.freeze(['i4', 'i6', 'v6', 'v8', 'v10', 'v12', 'flat6', 'electric', 'diesel', 'rotary', 'single', 'twin']);
export const SOUND_TYPES = Object.freeze(['v8', 'v6', 'i4', 'v12', 'electric', 'diesel', 'bike', 'turbine']);
export const LIVERIES = Object.freeze(['none', 'taxi', 'police', 'racing', 'flame', 'stripe', 'checker', 'ambulance', 'fire', 'military']);
export const SPOILERS = Object.freeze(['none', 'lip', 'wing', 'gtwing']);
export const LIGHT_STYLES = Object.freeze(['round', 'strip', 'quad', 'pop']);
export const VEHICLE_TAGS = Object.freeze(['civilian', 'police', 'ems', 'taxi', 'gang', 'exotic', 'offroad', 'work', 'stunt', 'military']);

const AIR_DENSITY = 1.225;

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

const r3 = (v) => Math.round(v * 1000) / 1000;

const deepFreeze = (o) => {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const k of Object.keys(o)) deepFreeze(o[k]);
  }
  return o;
};

/** Terminal speed (m/s) where engine power equals aerodynamic drag power. */
export const dragLimitedSpeed = (peakPowerKw, dragCd, frontalArea) =>
  Math.cbrt((2 * peakPowerKw * 1000) / (AIR_DENSITY * dragCd * frontalArea));

/**
 * Build a tail(t=0) -> nose(t=1) silhouette sweep.
 * Rows are [t, hwFrac, topFrac, bottomFrac, chamfer?] given as fractions of the vehicle's
 * half-width and overall height, so a section can never escape the stated bounding box.
 */
const sec = (width, height, rows) => rows.map(([t, hwF, topF, botF, chamfer]) => {
  const s = { t: r3(t), hw: r3((width * 0.5) * hwF), top: r3(height * topF), bottom: r3(height * botF) };
  if (chamfer !== undefined) s.chamfer = chamfer;
  return s;
});

/** Normalise one authored entry: derive the front axle t, the top speed and the defaults. */
const veh = (d) => {
  const w = d.wheels;
  const frontT = w.frontT !== undefined ? w.frontT : r3(w.rearT + d.wheelbase / d.length);
  const eff = d.eff !== undefined ? d.eff : 0.9;
  const e = d.engine;
  const h = d.handling;
  return deepFreeze({
    id: d.id, name: d.name, cls: d.cls, seats: d.seats, doors: d.doors,
    length: d.length, width: d.width, height: d.height,
    wheelbase: d.wheelbase, track: d.track, mass: d.mass,
    cogHeight: d.cogHeight, weightBiasFront: d.weightBiasFront,
    body: {
      kind: d.body.kind,
      sections: d.body.sections,
      cabin: d.body.cabin,
      hoodDrop: d.body.hoodDrop !== undefined ? d.body.hoodDrop : 0,
      trunkDrop: d.body.trunkDrop !== undefined ? d.body.trunkDrop : 0,
      bedStart: d.body.bedStart !== undefined ? d.body.bedStart : null,
      trailer: d.body.trailer !== undefined ? d.body.trailer : null,
    },
    wheels: {
      radius: w.radius, width: w.width, frontT, rearT: w.rearT,
      rimStyle: w.rimStyle, rimColor: w.rimColor !== undefined ? w.rimColor : 0x8d939a,
      tireProfile: w.tireProfile !== undefined ? w.tireProfile : 0.5,
    },
    drivetrain: d.drivetrain,
    engine: {
      kind: e.kind, peakPowerKw: e.peakPowerKw, peakTorqueNm: e.peakTorqueNm,
      peakPowerRpm: e.peakPowerRpm, peakTorqueRpm: e.peakTorqueRpm,
      redlineRpm: e.redlineRpm, idleRpm: e.idleRpm,
      gears: e.gears, finalDrive: e.finalDrive, reverseRatio: e.reverseRatio,
      turbo: e.turbo !== undefined ? e.turbo : 0,
      shiftTime: e.shiftTime !== undefined ? e.shiftTime : 0.22,
    },
    handling: {
      tireGrip: h.tireGrip, brakeTorque: h.brakeTorque, handbrakeBias: h.handbrakeBias,
      steerMaxDeg: h.steerMaxDeg, steerSpeed: h.steerSpeed, downforce: h.downforce,
      dragCd: h.dragCd, frontalArea: h.frontalArea, rollStiffness: h.rollStiffness,
      suspension: h.suspension,
      driftFactor: h.driftFactor !== undefined ? h.driftFactor : 0.3,
    },
    topSpeed: r3(dragLimitedSpeed(e.peakPowerKw, h.dragCd, h.frontalArea) * eff),
    offroadGrip: d.offroadGrip !== undefined ? d.offroadGrip : 0.55,
    paint: {
      palette: d.paint.palette, metallic: d.paint.metallic, roughness: d.paint.roughness,
      twoTone: !!d.paint.twoTone, matte: !!d.paint.matte,
      livery: d.paint.livery !== undefined ? d.paint.livery : 'none',
    },
    features: d.features,
    lights: d.lights,
    sound: d.sound,
    price: d.price, spawnWeight: d.spawnWeight, tags: d.tags, durability: d.durability,
    maxOccupantsAI: d.maxOccupantsAI !== undefined ? d.maxOccupantsAI : Math.min(d.seats, 4),
  });
};

// ---------------------------------------------------------------------------
// The catalogue
// ---------------------------------------------------------------------------

export const VEHICLES = Object.freeze([

  // ===== compact =========================================================
  veh({
    id: 'pennant-pip', name: 'Pennant Pip 3-Door', cls: 'compact', seats: 4, doors: 3,
    length: 3.74, width: 1.66, height: 1.46, wheelbase: 2.36, track: 1.44, mass: 1015,
    cogHeight: 0.52, weightBiasFront: 0.61, eff: 0.86,
    body: {
      kind: 'car',
      sections: sec(1.66, 1.46, [[0, 0.86, 0.80, 0.13], [0.07, 0.95, 0.90, 0.11], [0.16, 0.99, 0.97, 0.11],
        [0.30, 1.00, 1.00, 0.11], [0.46, 1.00, 1.00, 0.11], [0.60, 0.99, 0.96, 0.11], [0.73, 0.96, 0.72, 0.12],
        [0.86, 0.90, 0.52, 0.13], [0.95, 0.82, 0.45, 0.15], [1, 0.66, 0.40, 0.18]]),
      cabin: { start: 0.16, end: 0.72, top: 1.44, inset: 0.09, frontRake: 0.52, rearRake: 0.66, glassInset: 0.035 },
      hoodDrop: 0.07, trunkDrop: 0.04,
    },
    wheels: { radius: 0.295, width: 0.185, rearT: 0.135, rimStyle: 'steel', rimColor: 0x9aa0a6, tireProfile: 0.64 },
    drivetrain: 'fwd',
    engine: {
      kind: 'i4', peakPowerKw: 66, peakTorqueNm: 132, peakPowerRpm: 5800, peakTorqueRpm: 3600,
      redlineRpm: 6400, idleRpm: 820, gears: [3.45, 1.94, 1.29, 0.95, 0.76], finalDrive: 4.20, reverseRatio: 3.58,
      turbo: 0, shiftTime: 0.34,
    },
    handling: {
      tireGrip: 1.00, brakeTorque: 6200, handbrakeBias: 0.62, steerMaxDeg: 38, steerSpeed: 3.1,
      downforce: 55, dragCd: 0.33, frontalArea: 2.05, rollStiffness: 0.34,
      suspension: { travel: 0.17, stiffness: 24000, damping: 2050, restLength: 0.33 }, driftFactor: 0.22,
    },
    paint: { palette: [0xd9dee4, 0x8fa7bb, 0xb8402f, 0x2f6b4f, 0xe8c24a, 0x5b5f66], metallic: 0.3, roughness: 0.48 },
    features: { spoiler: 'none', exhausts: 1 },
    lights: { headlightY: 0.70, headlightSpread: 0.62, taillightY: 0.86, taillightSpread: 0.64, style: 'strip' },
    sound: { engineType: 'i4', basePitch: 1.18, rasp: 0.26, turboWhistle: 0, exhaustPop: 0.04 },
    price: 9800, spawnWeight: 1.55, tags: ['civilian'], durability: 0.85, maxOccupantsAI: 3,
  }),

  veh({
    id: 'voltura-mote-ev', name: 'Voltura Mote EV', cls: 'compact', seats: 2, doors: 3,
    length: 3.12, width: 1.62, height: 1.58, wheelbase: 2.02, track: 1.41, mass: 1180,
    cogHeight: 0.46, weightBiasFront: 0.50, eff: 0.80,
    body: {
      kind: 'car',
      sections: sec(1.62, 1.58, [[0, 0.90, 0.84, 0.14], [0.10, 0.98, 0.94, 0.12], [0.22, 1.00, 1.00, 0.12],
        [0.40, 1.00, 1.00, 0.12], [0.56, 1.00, 0.99, 0.12], [0.70, 0.99, 0.90, 0.12], [0.82, 0.95, 0.66, 0.13],
        [0.92, 0.88, 0.55, 0.15], [1, 0.72, 0.48, 0.18]]),
      cabin: { start: 0.14, end: 0.76, top: 1.56, inset: 0.07, frontRake: 0.46, rearRake: 0.24, glassInset: 0.03 },
      hoodDrop: 0.05, trunkDrop: 0.03,
    },
    wheels: { radius: 0.285, width: 0.16, rearT: 0.115, rimStyle: 'blade', rimColor: 0xc9d3dc, tireProfile: 0.55 },
    drivetrain: 'rwd',
    engine: {
      kind: 'electric', peakPowerKw: 92, peakTorqueNm: 260, peakPowerRpm: 7200, peakTorqueRpm: 0,
      redlineRpm: 12000, idleRpm: 0, gears: [8.6], finalDrive: 1.0, reverseRatio: 8.6, turbo: 0, shiftTime: 0,
    },
    handling: {
      tireGrip: 1.02, brakeTorque: 7400, handbrakeBias: 0.55, steerMaxDeg: 42, steerSpeed: 3.4,
      downforce: 40, dragCd: 0.31, frontalArea: 2.12, rollStiffness: 0.40,
      suspension: { travel: 0.15, stiffness: 27000, damping: 2400, restLength: 0.30 }, driftFactor: 0.18,
    },
    paint: { palette: [0xf2f4f7, 0x7fd4c1, 0xf0803c, 0x3a4a5c, 0xcfd733], metallic: 0.42, roughness: 0.38, twoTone: true },
    features: { spoiler: 'none', exhausts: 0, sunroof: true },
    lights: { headlightY: 0.76, headlightSpread: 0.58, taillightY: 0.98, taillightSpread: 0.60, style: 'round' },
    sound: { engineType: 'electric', basePitch: 1.62, rasp: 0.04, turboWhistle: 0.3, exhaustPop: 0 },
    price: 16400, spawnWeight: 1.05, tags: ['civilian'], durability: 0.8, maxOccupantsAI: 2,
  }),

  veh({
    id: 'kabuto-zest-turbo', name: 'Kabuto Zest Turbo', cls: 'compact', seats: 4, doors: 3,
    length: 4.06, width: 1.79, height: 1.41, wheelbase: 2.54, track: 1.56, mass: 1268,
    cogHeight: 0.48, weightBiasFront: 0.60, eff: 0.92,
    body: {
      kind: 'car',
      sections: sec(1.79, 1.41, [[0, 0.90, 0.74, 0.10], [0.08, 0.98, 0.84, 0.09], [0.15, 1.00, 0.90, 0.09],
        [0.26, 0.97, 0.97, 0.09], [0.42, 0.96, 1.00, 0.09], [0.58, 0.96, 0.97, 0.09], [0.70, 0.98, 0.74, 0.10],
        [0.82, 1.00, 0.55, 0.10], [0.92, 0.94, 0.47, 0.11], [1, 0.74, 0.42, 0.14]]),
      cabin: { start: 0.20, end: 0.68, top: 1.39, inset: 0.10, frontRake: 0.60, rearRake: 0.70, glassInset: 0.04 },
      hoodDrop: 0.09, trunkDrop: 0.05,
    },
    wheels: { radius: 0.325, width: 0.225, rearT: 0.145, rimStyle: 'sport5', rimColor: 0x3f4349, tireProfile: 0.26 },
    drivetrain: 'fwd',
    engine: {
      kind: 'i4', peakPowerKw: 165, peakTorqueNm: 340, peakPowerRpm: 6000, peakTorqueRpm: 2600,
      redlineRpm: 7000, idleRpm: 880, gears: [3.62, 2.19, 1.55, 1.18, 0.94, 0.76], finalDrive: 4.06, reverseRatio: 3.55,
      turbo: 0.62, shiftTime: 0.16,
    },
    handling: {
      tireGrip: 1.18, brakeTorque: 10800, handbrakeBias: 0.72, steerMaxDeg: 36, steerSpeed: 3.6,
      downforce: 220, dragCd: 0.32, frontalArea: 2.10, rollStiffness: 0.56,
      suspension: { travel: 0.13, stiffness: 41000, damping: 3400, restLength: 0.28 }, driftFactor: 0.34,
    },
    paint: { palette: [0xe3e7ea, 0x1f2328, 0xd83a2c, 0x2b6fd6, 0xf6d32a], metallic: 0.55, roughness: 0.3 },
    features: { spoiler: 'lip', exhausts: 2, sunroof: true },
    lights: { headlightY: 0.68, headlightSpread: 0.68, taillightY: 0.82, taillightSpread: 0.70, style: 'strip' },
    sound: { engineType: 'i4', basePitch: 1.24, rasp: 0.46, turboWhistle: 0.62, exhaustPop: 0.52 },
    price: 34500, spawnWeight: 0.85, tags: ['civilian', 'stunt'], durability: 0.95, maxOccupantsAI: 3,
  }),

  veh({
    id: 'beaumont-fleur-rs', name: 'Beaumont Fleur RS', cls: 'compact', seats: 5, doors: 5,
    length: 4.32, width: 1.86, height: 1.44, wheelbase: 2.63, track: 1.62, mass: 1495,
    cogHeight: 0.49, weightBiasFront: 0.58, eff: 0.94,
    body: {
      kind: 'car',
      sections: sec(1.86, 1.44, [[0, 0.90, 0.82, 0.10], [0.08, 0.97, 0.90, 0.09], [0.18, 1.00, 0.96, 0.08],
        [0.30, 0.97, 1.00, 0.08], [0.46, 0.95, 1.00, 0.08], [0.60, 0.95, 0.95, 0.08], [0.72, 0.97, 0.72, 0.09],
        [0.84, 1.00, 0.54, 0.09], [0.93, 0.92, 0.47, 0.11], [1, 0.75, 0.43, 0.14]]),
      cabin: { start: 0.18, end: 0.71, top: 1.42, inset: 0.11, frontRake: 0.58, rearRake: 0.52, glassInset: 0.04 },
      hoodDrop: 0.08, trunkDrop: 0.04,
    },
    wheels: { radius: 0.34, width: 0.245, rearT: 0.14, rimStyle: 'mesh', rimColor: 0x6e737a, tireProfile: 0.22 },
    drivetrain: 'awd',
    engine: {
      kind: 'i4', peakPowerKw: 235, peakTorqueNm: 480, peakPowerRpm: 6500, peakTorqueRpm: 2900,
      redlineRpm: 7200, idleRpm: 900, gears: [3.56, 2.25, 1.66, 1.29, 1.03, 0.85, 0.70], finalDrive: 3.94, reverseRatio: 3.30,
      turbo: 0.7, shiftTime: 0.09,
    },
    handling: {
      tireGrip: 1.26, brakeTorque: 13200, handbrakeBias: 0.6, steerMaxDeg: 35, steerSpeed: 3.8,
      downforce: 330, dragCd: 0.34, frontalArea: 2.16, rollStiffness: 0.62,
      suspension: { travel: 0.12, stiffness: 49000, damping: 4100, restLength: 0.27 }, driftFactor: 0.38,
    },
    paint: { palette: [0x2f6fb5, 0xe8eaec, 0x1b1d21, 0x9ba3ad, 0xb5312a], metallic: 0.6, roughness: 0.28 },
    features: { spoiler: 'wing', exhausts: 4, sunroof: true },
    lights: { headlightY: 0.70, headlightSpread: 0.70, taillightY: 0.83, taillightSpread: 0.72, style: 'quad' },
    sound: { engineType: 'i4', basePitch: 1.10, rasp: 0.58, turboWhistle: 0.74, exhaustPop: 0.7 },
    price: 61000, spawnWeight: 0.45, tags: ['civilian', 'stunt'], durability: 1.0, maxOccupantsAI: 4,
  }),

  // ===== sedan ===========================================================
  veh({
    id: 'pennant-meridian', name: 'Pennant Meridian LX', cls: 'sedan', seats: 5, doors: 4,
    length: 4.82, width: 1.83, height: 1.47, wheelbase: 2.81, track: 1.58, mass: 1512,
    cogHeight: 0.53, weightBiasFront: 0.59, eff: 0.87,
    body: {
      kind: 'car',
      sections: sec(1.83, 1.47, [[0, 0.84, 0.54, 0.14], [0.08, 0.94, 0.58, 0.12], [0.17, 0.99, 0.62, 0.11],
        [0.26, 1.00, 0.86, 0.11], [0.40, 1.00, 1.00, 0.11], [0.55, 0.99, 0.98, 0.11], [0.68, 0.97, 0.70, 0.11],
        [0.80, 0.95, 0.53, 0.12], [0.91, 0.90, 0.49, 0.13], [1, 0.72, 0.43, 0.16]]),
      cabin: { start: 0.24, end: 0.68, top: 1.45, inset: 0.10, frontRake: 0.62, rearRake: 0.50, glassInset: 0.04 },
      hoodDrop: 0.10, trunkDrop: 0.12,
    },
    wheels: { radius: 0.32, width: 0.205, rearT: 0.145, rimStyle: 'mesh', rimColor: 0x8f959c, tireProfile: 0.5 },
    drivetrain: 'fwd',
    engine: {
      kind: 'v6', peakPowerKw: 138, peakTorqueNm: 275, peakPowerRpm: 6100, peakTorqueRpm: 4200,
      redlineRpm: 6600, idleRpm: 760, gears: [3.30, 1.95, 1.46, 1.09, 0.85, 0.68], finalDrive: 3.72, reverseRatio: 3.15,
      turbo: 0, shiftTime: 0.28,
    },
    handling: {
      tireGrip: 1.04, brakeTorque: 8600, handbrakeBias: 0.58, steerMaxDeg: 35, steerSpeed: 2.9,
      downforce: 90, dragCd: 0.30, frontalArea: 2.24, rollStiffness: 0.36,
      suspension: { travel: 0.18, stiffness: 29000, damping: 2500, restLength: 0.34 }, driftFactor: 0.26,
    },
    paint: { palette: [0xb9bfc6, 0x22252a, 0xf1f3f5, 0x5f7ea1, 0x7a4b3a, 0x3b5c48], metallic: 0.38, roughness: 0.44 },
    features: { spoiler: 'none', exhausts: 2, sunroof: true },
    lights: { headlightY: 0.72, headlightSpread: 0.66, taillightY: 0.80, taillightSpread: 0.72, style: 'strip' },
    sound: { engineType: 'v6', basePitch: 1.02, rasp: 0.3, turboWhistle: 0, exhaustPop: 0.08 },
    price: 21500, spawnWeight: 2.0, tags: ['civilian'], durability: 1.0, maxOccupantsAI: 4,
  }),

  veh({
    id: 'halcyon-regent-l', name: 'Halcyon Regent L', cls: 'sedan', seats: 5, doors: 4,
    length: 5.24, width: 1.94, height: 1.49, wheelbase: 3.12, track: 1.66, mass: 1965,
    cogHeight: 0.55, weightBiasFront: 0.52, eff: 0.83,
    body: {
      kind: 'car',
      sections: sec(1.94, 1.49, [[0, 0.86, 0.57, 0.16], [0.07, 0.95, 0.61, 0.14], [0.16, 1.00, 0.65, 0.13],
        [0.25, 1.00, 0.90, 0.13], [0.36, 1.00, 1.00, 0.13], [0.52, 1.00, 1.00, 0.13], [0.64, 0.99, 0.94, 0.13],
        [0.74, 0.97, 0.66, 0.13], [0.86, 0.95, 0.56, 0.14], [0.94, 0.90, 0.54, 0.15], [1, 0.76, 0.47, 0.18]]),
      cabin: { start: 0.23, end: 0.69, top: 1.47, inset: 0.12, frontRake: 0.58, rearRake: 0.44, glassInset: 0.05 },
      hoodDrop: 0.09, trunkDrop: 0.11,
    },
    wheels: { radius: 0.355, width: 0.245, rearT: 0.135, rimStyle: 'chrome', rimColor: 0xd8dde2, tireProfile: 0.38 },
    drivetrain: 'rwd',
    engine: {
      kind: 'v8', peakPowerKw: 330, peakTorqueNm: 600, peakPowerRpm: 5800, peakTorqueRpm: 2200,
      redlineRpm: 6400, idleRpm: 620, gears: [4.71, 3.14, 2.10, 1.67, 1.29, 1.00, 0.84, 0.67], finalDrive: 3.07, reverseRatio: 3.32,
      turbo: 0.45, shiftTime: 0.18,
    },
    handling: {
      tireGrip: 1.12, brakeTorque: 13800, handbrakeBias: 0.5, steerMaxDeg: 33, steerSpeed: 2.7,
      downforce: 160, dragCd: 0.28, frontalArea: 2.34, rollStiffness: 0.44,
      suspension: { travel: 0.19, stiffness: 36000, damping: 3300, restLength: 0.36 }, driftFactor: 0.34,
    },
    paint: { palette: [0x101318, 0x1d2b3c, 0x6b6f76, 0xe7e9eb, 0x3c2f2a, 0x2c3f34], metallic: 0.7, roughness: 0.22 },
    features: { spoiler: 'none', exhausts: 4, sunroof: true },
    lights: { headlightY: 0.74, headlightSpread: 0.74, taillightY: 0.82, taillightSpread: 0.78, style: 'strip' },
    sound: { engineType: 'v8', basePitch: 0.84, rasp: 0.42, turboWhistle: 0.3, exhaustPop: 0.3 },
    price: 84000, spawnWeight: 0.7, tags: ['civilian'], durability: 1.15, maxOccupantsAI: 4,
  }),

  veh({
    id: 'reinhalt-kanzler-w12', name: 'Reinhalt Kanzler W12', cls: 'sedan', seats: 5, doors: 4,
    length: 5.31, width: 1.98, height: 1.46, wheelbase: 3.21, track: 1.70, mass: 2210,
    cogHeight: 0.54, weightBiasFront: 0.54, eff: 0.81,
    body: {
      kind: 'car',
      sections: sec(1.98, 1.46, [[0, 0.85, 0.56, 0.14], [0.08, 0.95, 0.60, 0.12], [0.18, 1.00, 0.64, 0.12],
        [0.28, 1.00, 0.92, 0.12], [0.42, 1.00, 1.00, 0.12], [0.56, 0.99, 0.99, 0.12], [0.66, 0.98, 0.82, 0.12],
        [0.76, 0.97, 0.58, 0.12], [0.88, 0.94, 0.53, 0.13], [1, 0.78, 0.46, 0.16]]),
      cabin: { start: 0.25, end: 0.66, top: 1.44, inset: 0.13, frontRake: 0.55, rearRake: 0.48, glassInset: 0.05 },
      hoodDrop: 0.08, trunkDrop: 0.10,
    },
    wheels: { radius: 0.365, width: 0.265, rearT: 0.13, rimStyle: 'mesh', rimColor: 0xb6bcc3, tireProfile: 0.32 },
    drivetrain: 'awd',
    engine: {
      kind: 'v12', peakPowerKw: 460, peakTorqueNm: 900, peakPowerRpm: 5500, peakTorqueRpm: 1900,
      redlineRpm: 6200, idleRpm: 560, gears: [4.38, 2.86, 1.92, 1.37, 1.00, 0.82, 0.67, 0.58], finalDrive: 2.93, reverseRatio: 3.42,
      turbo: 0.55, shiftTime: 0.15,
    },
    handling: {
      tireGrip: 1.16, brakeTorque: 16200, handbrakeBias: 0.46, steerMaxDeg: 32, steerSpeed: 2.6,
      downforce: 210, dragCd: 0.27, frontalArea: 2.40, rollStiffness: 0.48,
      suspension: { travel: 0.18, stiffness: 40000, damping: 3800, restLength: 0.35 }, driftFactor: 0.3,
    },
    paint: { palette: [0x15181c, 0x3a4048, 0xe9ecef, 0x27384d, 0x5a4636], metallic: 0.78, roughness: 0.18 },
    features: { spoiler: 'none', exhausts: 4, sunroof: true },
    lights: { headlightY: 0.73, headlightSpread: 0.76, taillightY: 0.80, taillightSpread: 0.80, style: 'quad' },
    sound: { engineType: 'v12', basePitch: 0.92, rasp: 0.24, turboWhistle: 0.36, exhaustPop: 0.16 },
    price: 158000, spawnWeight: 0.32, tags: ['civilian', 'exotic'], durability: 1.2, maxOccupantsAI: 4,
  }),

  veh({
    id: 'meridian-cab', name: 'Pennant Meridian Cab (Sunline Taxi)', cls: 'sedan', seats: 5, doors: 4,
    length: 4.82, width: 1.83, height: 1.52, wheelbase: 2.81, track: 1.58, mass: 1585,
    cogHeight: 0.54, weightBiasFront: 0.58, eff: 0.82,
    body: {
      kind: 'car',
      sections: sec(1.83, 1.52, [[0, 0.84, 0.53, 0.15], [0.09, 0.94, 0.57, 0.13], [0.18, 0.99, 0.61, 0.12],
        [0.27, 1.00, 0.84, 0.12], [0.41, 1.00, 0.97, 0.12], [0.56, 0.99, 0.95, 0.12], [0.69, 0.97, 0.68, 0.12],
        [0.81, 0.95, 0.52, 0.13], [0.92, 0.90, 0.48, 0.14], [1, 0.72, 0.42, 0.17]]),
      cabin: { start: 0.25, end: 0.69, top: 1.44, inset: 0.10, frontRake: 0.62, rearRake: 0.50, glassInset: 0.04 },
      hoodDrop: 0.10, trunkDrop: 0.12,
    },
    wheels: { radius: 0.32, width: 0.205, rearT: 0.145, rimStyle: 'steel', rimColor: 0x7d838a, tireProfile: 0.58 },
    drivetrain: 'fwd',
    engine: {
      kind: 'v6', peakPowerKw: 124, peakTorqueNm: 248, peakPowerRpm: 5900, peakTorqueRpm: 3800,
      redlineRpm: 6300, idleRpm: 740, gears: [3.30, 1.95, 1.46, 1.09, 0.85], finalDrive: 3.85, reverseRatio: 3.15,
      turbo: 0, shiftTime: 0.32,
    },
    handling: {
      tireGrip: 0.98, brakeTorque: 8100, handbrakeBias: 0.6, steerMaxDeg: 36, steerSpeed: 2.8,
      downforce: 70, dragCd: 0.32, frontalArea: 2.28, rollStiffness: 0.32,
      suspension: { travel: 0.20, stiffness: 26000, damping: 2200, restLength: 0.36 }, driftFactor: 0.28,
    },
    paint: { palette: [0xf2b705, 0xf7d038, 0xe8a400], metallic: 0.2, roughness: 0.56, livery: 'taxi' },
    features: { spoiler: 'none', exhausts: 1, taxiSign: true },
    lights: { headlightY: 0.72, headlightSpread: 0.66, taillightY: 0.80, taillightSpread: 0.72, style: 'strip' },
    sound: { engineType: 'v6', basePitch: 1.0, rasp: 0.36, turboWhistle: 0, exhaustPop: 0.1 },
    price: 0, spawnWeight: 1.35, tags: ['taxi', 'civilian'], durability: 1.05, maxOccupantsAI: 4,
  }),

  veh({
    id: 'halcyon-regent-stretch', name: 'Halcyon Regent Stretch', cls: 'sedan', seats: 10, doors: 6,
    length: 8.42, width: 1.98, height: 1.54, wheelbase: 6.05, track: 1.68, mass: 3140,
    cogHeight: 0.57, weightBiasFront: 0.48, eff: 0.76,
    body: {
      kind: 'car',
      sections: sec(1.98, 1.54, [[0, 0.86, 0.58, 0.17], [0.06, 0.95, 0.62, 0.15], [0.13, 1.00, 0.66, 0.14],
        [0.20, 1.00, 0.95, 0.14], [0.32, 1.00, 1.00, 0.14], [0.50, 1.00, 1.00, 0.14], [0.68, 1.00, 1.00, 0.14],
        [0.80, 0.99, 0.92, 0.14], [0.88, 0.97, 0.62, 0.14], [0.95, 0.93, 0.54, 0.15], [1, 0.78, 0.47, 0.18]]),
      cabin: { start: 0.19, end: 0.81, top: 1.52, inset: 0.11, frontRake: 0.56, rearRake: 0.40, glassInset: 0.05 },
      hoodDrop: 0.08, trunkDrop: 0.10,
    },
    wheels: { radius: 0.355, width: 0.235, rearT: 0.10, rimStyle: 'chrome', rimColor: 0xe2e6ea, tireProfile: 0.44 },
    drivetrain: 'rwd',
    engine: {
      kind: 'v8', peakPowerKw: 268, peakTorqueNm: 540, peakPowerRpm: 5200, peakTorqueRpm: 2400,
      redlineRpm: 5800, idleRpm: 600, gears: [3.06, 1.63, 1.00, 0.70], finalDrive: 3.42, reverseRatio: 2.90,
      turbo: 0, shiftTime: 0.3,
    },
    handling: {
      tireGrip: 0.96, brakeTorque: 15400, handbrakeBias: 0.4, steerMaxDeg: 30, steerSpeed: 2.2,
      downforce: 80, dragCd: 0.36, frontalArea: 2.46, rollStiffness: 0.3,
      suspension: { travel: 0.21, stiffness: 44000, damping: 3600, restLength: 0.38 }, driftFactor: 0.2,
    },
    paint: { palette: [0x0c0e11, 0xf4f6f8, 0x5a1220, 0x1a2b3a], metallic: 0.65, roughness: 0.24 },
    features: { spoiler: 'none', exhausts: 2, sunroof: true },
    lights: { headlightY: 0.74, headlightSpread: 0.74, taillightY: 0.84, taillightSpread: 0.78, style: 'strip' },
    sound: { engineType: 'v8', basePitch: 0.8, rasp: 0.3, turboWhistle: 0, exhaustPop: 0.14 },
    price: 128000, spawnWeight: 0.18, tags: ['civilian'], durability: 1.25, maxOccupantsAI: 4,
  }),

  // ===== coupe ===========================================================
  veh({
    id: 'tanuki-kaze-rs', name: 'Tanuki Kaze RS', cls: 'coupe', seats: 4, doors: 2,
    length: 4.61, width: 1.81, height: 1.29, wheelbase: 2.68, track: 1.55, mass: 1420,
    cogHeight: 0.45, weightBiasFront: 0.53, eff: 0.94,
    body: {
      kind: 'car',
      sections: sec(1.81, 1.29, [[0, 0.86, 0.60, 0.10], [0.07, 0.96, 0.66, 0.09], [0.16, 1.00, 0.72, 0.09],
        [0.26, 0.99, 0.92, 0.09], [0.36, 0.96, 1.00, 0.09], [0.48, 0.94, 0.98, 0.09], [0.60, 0.94, 0.80, 0.09],
        [0.72, 0.96, 0.56, 0.10], [0.85, 0.97, 0.50, 0.10], [0.94, 0.90, 0.46, 0.11], [1, 0.70, 0.40, 0.14]]),
      cabin: { start: 0.24, end: 0.62, top: 1.27, inset: 0.12, frontRake: 0.66, rearRake: 0.74, glassInset: 0.04 },
      hoodDrop: 0.11, trunkDrop: 0.07,
    },
    wheels: { radius: 0.335, width: 0.255, rearT: 0.155, rimStyle: 'sport5', rimColor: 0x2d3136, tireProfile: 0.22 },
    drivetrain: 'rwd',
    engine: {
      kind: 'i6', peakPowerKw: 246, peakTorqueNm: 440, peakPowerRpm: 6800, peakTorqueRpm: 3400,
      redlineRpm: 7600, idleRpm: 880, gears: [3.83, 2.36, 1.69, 1.31, 1.00, 0.79], finalDrive: 3.73, reverseRatio: 3.58,
      turbo: 0.66, shiftTime: 0.14,
    },
    handling: {
      tireGrip: 1.22, brakeTorque: 12400, handbrakeBias: 0.86, steerMaxDeg: 38, steerSpeed: 4.2,
      downforce: 380, dragCd: 0.31, frontalArea: 2.02, rollStiffness: 0.6,
      suspension: { travel: 0.12, stiffness: 46000, damping: 3900, restLength: 0.27 }, driftFactor: 0.78,
    },
    paint: { palette: [0xf5f7f9, 0x1b1e22, 0x1f6fd0, 0xd9413a, 0x8e7d4f], metallic: 0.52, roughness: 0.3 },
    features: { spoiler: 'wing', exhausts: 2, sunroof: true },
    lights: { headlightY: 0.62, headlightSpread: 0.68, taillightY: 0.74, taillightSpread: 0.70, style: 'pop' },
    sound: { engineType: 'v6', basePitch: 1.14, rasp: 0.54, turboWhistle: 0.8, exhaustPop: 0.66 },
    price: 72000, spawnWeight: 0.5, tags: ['civilian', 'stunt'], durability: 0.95, maxOccupantsAI: 2,
  }),

  veh({
    id: 'reinhalt-strassen-gt', name: 'Reinhalt Strassen GT', cls: 'coupe', seats: 4, doors: 2,
    length: 4.88, width: 1.90, height: 1.35, wheelbase: 2.86, track: 1.63, mass: 1740,
    cogHeight: 0.47, weightBiasFront: 0.55, eff: 0.9,
    body: {
      kind: 'car',
      sections: sec(1.90, 1.35, [[0, 0.88, 0.66, 0.11], [0.08, 0.97, 0.72, 0.10], [0.18, 1.00, 0.78, 0.10],
        [0.30, 0.98, 0.95, 0.10], [0.42, 0.95, 1.00, 0.10], [0.55, 0.94, 0.96, 0.10], [0.68, 0.95, 0.76, 0.10],
        [0.80, 0.97, 0.56, 0.10], [0.90, 0.92, 0.50, 0.11], [1, 0.74, 0.44, 0.14]]),
      cabin: { start: 0.26, end: 0.64, top: 1.33, inset: 0.13, frontRake: 0.62, rearRake: 0.68, glassInset: 0.045 },
      hoodDrop: 0.10, trunkDrop: 0.08,
    },
    wheels: { radius: 0.35, width: 0.275, rearT: 0.15, rimStyle: 'mesh', rimColor: 0x585d64, tireProfile: 0.2 },
    drivetrain: 'awd',
    engine: {
      kind: 'v8', peakPowerKw: 404, peakTorqueNm: 700, peakPowerRpm: 6400, peakTorqueRpm: 2700,
      redlineRpm: 7000, idleRpm: 700, gears: [4.10, 2.52, 1.80, 1.39, 1.06, 0.86, 0.70, 0.59], finalDrive: 3.15, reverseRatio: 3.25,
      turbo: 0.58, shiftTime: 0.08,
    },
    handling: {
      tireGrip: 1.30, brakeTorque: 16800, handbrakeBias: 0.56, steerMaxDeg: 34, steerSpeed: 3.9,
      downforce: 620, dragCd: 0.30, frontalArea: 2.08, rollStiffness: 0.66,
      suspension: { travel: 0.11, stiffness: 56000, damping: 4700, restLength: 0.26 }, driftFactor: 0.44,
    },
    paint: { palette: [0x2b3340, 0xc9ccd1, 0x0f1114, 0x6d2f2a, 0x3f5e4a], metallic: 0.72, roughness: 0.2 },
    features: { spoiler: 'lip', exhausts: 4, sunroof: true },
    lights: { headlightY: 0.66, headlightSpread: 0.72, taillightY: 0.76, taillightSpread: 0.76, style: 'strip' },
    sound: { engineType: 'v8', basePitch: 0.95, rasp: 0.5, turboWhistle: 0.5, exhaustPop: 0.6 },
    price: 146000, spawnWeight: 0.34, tags: ['civilian', 'exotic'], durability: 1.1, maxOccupantsAI: 2,
  }),

  // ===== sports ==========================================================
  veh({
    id: 'tanuki-shinobi-gtx', name: 'Tanuki Shinobi GT-X', cls: 'sports', seats: 4, doors: 2,
    length: 4.72, width: 1.92, height: 1.34, wheelbase: 2.78, track: 1.66, mass: 1690,
    cogHeight: 0.44, weightBiasFront: 0.55, eff: 0.93,
    body: {
      kind: 'car',
      sections: sec(1.92, 1.34, [[0, 0.88, 0.64, 0.09], [0.07, 0.98, 0.70, 0.08], [0.15, 1.00, 0.76, 0.08],
        [0.27, 0.97, 0.94, 0.08], [0.39, 0.94, 1.00, 0.08], [0.52, 0.93, 0.97, 0.08], [0.64, 0.95, 0.74, 0.08],
        [0.76, 0.99, 0.54, 0.09], [0.88, 0.96, 0.47, 0.09], [1, 0.72, 0.40, 0.13]]),
      cabin: { start: 0.24, end: 0.61, top: 1.32, inset: 0.13, frontRake: 0.68, rearRake: 0.72, glassInset: 0.04 },
      hoodDrop: 0.12, trunkDrop: 0.06,
    },
    wheels: { radius: 0.355, width: 0.295, rearT: 0.145, rimStyle: 'sport5', rimColor: 0x1f2226, tireProfile: 0.16 },
    drivetrain: 'awd',
    engine: {
      kind: 'v6', peakPowerKw: 419, peakTorqueNm: 652, peakPowerRpm: 6800, peakTorqueRpm: 3600,
      redlineRpm: 7400, idleRpm: 820, gears: [4.06, 2.30, 1.60, 1.25, 1.00, 0.79], finalDrive: 3.70, reverseRatio: 3.38,
      turbo: 0.82, shiftTime: 0.06,
    },
    handling: {
      tireGrip: 1.34, brakeTorque: 17600, handbrakeBias: 0.6, steerMaxDeg: 35, steerSpeed: 4.3,
      downforce: 780, dragCd: 0.31, frontalArea: 2.06, rollStiffness: 0.7,
      suspension: { travel: 0.10, stiffness: 62000, damping: 5200, restLength: 0.25 }, driftFactor: 0.52,
    },
    paint: { palette: [0xc8ccd2, 0x141619, 0x2c56c4, 0xd4342b, 0xf0a11e], metallic: 0.62, roughness: 0.26 },
    features: { spoiler: 'gtwing', exhausts: 4 },
    lights: { headlightY: 0.64, headlightSpread: 0.72, taillightY: 0.72, taillightSpread: 0.76, style: 'round' },
    sound: { engineType: 'v6', basePitch: 1.06, rasp: 0.62, turboWhistle: 0.88, exhaustPop: 0.72 },
    price: 196000, spawnWeight: 0.26, tags: ['civilian', 'exotic', 'stunt'], durability: 1.05, maxOccupantsAI: 2,
  }),

  veh({
    id: 'wolfram-kestrel-t', name: 'Wolfram Kestrel T', cls: 'sports', seats: 2, doors: 2,
    length: 4.52, width: 1.85, height: 1.29, wheelbase: 2.46, track: 1.60, mass: 1425,
    cogHeight: 0.42, weightBiasFront: 0.40, eff: 0.95,
    body: {
      kind: 'car',
      sections: sec(1.85, 1.29, [[0, 0.90, 0.68, 0.09], [0.08, 0.99, 0.74, 0.08], [0.18, 1.00, 0.82, 0.08],
        [0.30, 0.98, 0.96, 0.08], [0.42, 0.95, 1.00, 0.08], [0.54, 0.92, 0.94, 0.08], [0.66, 0.90, 0.68, 0.08],
        [0.78, 0.92, 0.50, 0.09], [0.90, 0.88, 0.44, 0.10], [1, 0.66, 0.38, 0.13]]),
      cabin: { start: 0.28, end: 0.60, top: 1.27, inset: 0.12, frontRake: 0.70, rearRake: 0.64, glassInset: 0.04 },
      hoodDrop: 0.13, trunkDrop: 0.09,
    },
    wheels: { radius: 0.345, width: 0.30, rearT: 0.16, rimStyle: 'dish', rimColor: 0x9aa1a8, tireProfile: 0.15 },
    drivetrain: 'rwd',
    engine: {
      kind: 'flat6', peakPowerKw: 353, peakTorqueNm: 470, peakPowerRpm: 7600, peakTorqueRpm: 5000,
      redlineRpm: 8300, idleRpm: 860, gears: [3.91, 2.29, 1.65, 1.30, 1.08, 0.88, 0.72], finalDrive: 3.44, reverseRatio: 3.12,
      turbo: 0.2, shiftTime: 0.07,
    },
    handling: {
      tireGrip: 1.36, brakeTorque: 16200, handbrakeBias: 0.72, steerMaxDeg: 36, steerSpeed: 4.5,
      downforce: 860, dragCd: 0.29, frontalArea: 1.96, rollStiffness: 0.72,
      suspension: { travel: 0.10, stiffness: 58000, damping: 4900, restLength: 0.24 }, driftFactor: 0.62,
    },
    paint: { palette: [0xe8ebee, 0x1a1c20, 0xb8182a, 0x2f7d5c, 0x5f6d7e], metallic: 0.6, roughness: 0.24 },
    features: { spoiler: 'lip', exhausts: 2 },
    lights: { headlightY: 0.62, headlightSpread: 0.66, taillightY: 0.70, taillightSpread: 0.74, style: 'round' },
    sound: { engineType: 'v6', basePitch: 1.22, rasp: 0.66, turboWhistle: 0.24, exhaustPop: 0.5 },
    price: 168000, spawnWeight: 0.28, tags: ['civilian', 'exotic'], durability: 1.0, maxOccupantsAI: 2,
  }),

  veh({
    id: 'ardent-sidewinder-gt', name: 'Ardent Sidewinder GT', cls: 'sports', seats: 2, doors: 2,
    length: 4.64, width: 1.94, height: 1.23, wheelbase: 2.72, track: 1.68, mass: 1548,
    cogHeight: 0.43, weightBiasFront: 0.51, eff: 0.92,
    body: {
      kind: 'car',
      sections: sec(1.94, 1.23, [[0, 0.86, 0.62, 0.09], [0.08, 0.96, 0.68, 0.08], [0.18, 1.00, 0.74, 0.08],
        [0.28, 0.98, 0.92, 0.08], [0.40, 0.95, 1.00, 0.08], [0.52, 0.93, 0.95, 0.08], [0.64, 0.94, 0.70, 0.08],
        [0.78, 0.98, 0.52, 0.09], [0.90, 0.93, 0.46, 0.09], [1, 0.70, 0.40, 0.12]]),
      cabin: { start: 0.26, end: 0.58, top: 1.21, inset: 0.14, frontRake: 0.72, rearRake: 0.66, glassInset: 0.04 },
      hoodDrop: 0.10, trunkDrop: 0.07,
    },
    wheels: { radius: 0.35, width: 0.315, rearT: 0.15, rimStyle: 'sport5', rimColor: 0x30343a, tireProfile: 0.14 },
    drivetrain: 'rwd',
    engine: {
      kind: 'v8', peakPowerKw: 372, peakTorqueNm: 637, peakPowerRpm: 6000, peakTorqueRpm: 4400,
      redlineRpm: 6800, idleRpm: 700, gears: [2.97, 2.07, 1.43, 1.00, 0.84, 0.66, 0.50], finalDrive: 3.42, reverseRatio: 2.90,
      turbo: 0, shiftTime: 0.11,
    },
    handling: {
      tireGrip: 1.31, brakeTorque: 15600, handbrakeBias: 0.8, steerMaxDeg: 35, steerSpeed: 4.0,
      downforce: 540, dragCd: 0.32, frontalArea: 2.00, rollStiffness: 0.64,
      suspension: { travel: 0.11, stiffness: 52000, damping: 4400, restLength: 0.26 }, driftFactor: 0.7,
    },
    paint: { palette: [0xd6212a, 0xf2f4f6, 0x101216, 0xe8b52a, 0x1c4f8a], metallic: 0.58, roughness: 0.26 },
    features: { spoiler: 'lip', exhausts: 4, convertible: true },
    lights: { headlightY: 0.58, headlightSpread: 0.7, taillightY: 0.68, taillightSpread: 0.74, style: 'quad' },
    sound: { engineType: 'v8', basePitch: 0.9, rasp: 0.7, turboWhistle: 0, exhaustPop: 0.64 },
    price: 132000, spawnWeight: 0.3, tags: ['civilian', 'stunt'], durability: 1.0, maxOccupantsAI: 2,
  }),

  // ===== super ===========================================================
  veh({
    id: 'grifone-tempesta', name: 'Grifone Tempesta V12', cls: 'super', seats: 2, doors: 2,
    length: 4.70, width: 2.02, height: 1.14, wheelbase: 2.65, track: 1.74, mass: 1510,
    cogHeight: 0.38, weightBiasFront: 0.43, eff: 0.9,
    body: {
      kind: 'car',
      sections: sec(2.02, 1.14, [[0, 0.88, 0.55, 0.13], [0.07, 0.97, 0.60, 0.10], [0.16, 1.00, 0.66, 0.09],
        [0.27, 0.99, 0.72, 0.09], [0.38, 0.95, 0.93, 0.10], [0.50, 0.92, 1.00, 0.10], [0.62, 0.88, 0.92, 0.10],
        [0.74, 0.86, 0.58, 0.11], [0.88, 0.76, 0.42, 0.13], [1, 0.42, 0.33, 0.18]]),
      cabin: { start: 0.36, end: 0.66, top: 1.12, inset: 0.15, frontRake: 0.82, rearRake: 0.58, glassInset: 0.035 },
      hoodDrop: 0.16, trunkDrop: 0.05,
    },
    wheels: { radius: 0.355, width: 0.345, rearT: 0.16, rimStyle: 'blade', rimColor: 0x22252a, tireProfile: 0.1 },
    drivetrain: 'rwd',
    engine: {
      kind: 'v12', peakPowerKw: 596, peakTorqueNm: 718, peakPowerRpm: 8250, peakTorqueRpm: 6000,
      redlineRpm: 8800, idleRpm: 950, gears: [3.08, 2.19, 1.71, 1.39, 1.16, 0.97, 0.80], finalDrive: 4.30, reverseRatio: 2.82,
      turbo: 0, shiftTime: 0.05,
    },
    handling: {
      tireGrip: 1.42, brakeTorque: 19800, handbrakeBias: 0.66, steerMaxDeg: 33, steerSpeed: 4.6,
      downforce: 1900, dragCd: 0.33, frontalArea: 1.94, rollStiffness: 0.78,
      suspension: { travel: 0.085, stiffness: 74000, damping: 6100, restLength: 0.22 }, driftFactor: 0.56,
    },
    paint: { palette: [0xf0c419, 0xc0201f, 0x101318, 0x2a5fd0, 0xe9ecef], metallic: 0.68, roughness: 0.2 },
    features: { spoiler: 'wing', exhausts: 3 },
    lights: { headlightY: 0.52, headlightSpread: 0.72, taillightY: 0.66, taillightSpread: 0.7, style: 'strip' },
    sound: { engineType: 'v12', basePitch: 1.3, rasp: 0.72, turboWhistle: 0, exhaustPop: 0.58 },
    price: 412000, spawnWeight: 0.1, tags: ['exotic', 'civilian'], durability: 0.9, maxOccupantsAI: 2,
  }),

  veh({
    id: 'vettano-lampo-sv', name: 'Vettano Lampo SV', cls: 'super', seats: 2, doors: 2,
    length: 4.84, width: 2.10, height: 1.11, wheelbase: 2.70, track: 1.79, mass: 1585,
    cogHeight: 0.37, weightBiasFront: 0.42, eff: 0.9,
    body: {
      kind: 'car',
      sections: sec(2.10, 1.11, [[0, 0.92, 0.58, 0.12], [0.08, 1.00, 0.62, 0.10], [0.18, 1.00, 0.68, 0.09],
        [0.30, 0.98, 0.78, 0.09], [0.42, 0.94, 0.98, 0.09], [0.54, 0.90, 1.00, 0.09], [0.66, 0.86, 0.84, 0.10],
        [0.78, 0.84, 0.52, 0.11], [0.90, 0.72, 0.40, 0.12], [1, 0.38, 0.30, 0.17]]),
      cabin: { start: 0.40, end: 0.68, top: 1.09, inset: 0.16, frontRake: 0.86, rearRake: 0.52, glassInset: 0.03 },
      hoodDrop: 0.17, trunkDrop: 0.04,
    },
    wheels: { radius: 0.36, width: 0.355, rearT: 0.165, rimStyle: 'blade', rimColor: 0x4a4238, tireProfile: 0.1 },
    drivetrain: 'awd',
    engine: {
      kind: 'v10', peakPowerKw: 470, peakTorqueNm: 600, peakPowerRpm: 8000, peakTorqueRpm: 6500,
      redlineRpm: 8700, idleRpm: 920, gears: [3.13, 2.05, 1.52, 1.18, 0.96, 0.81, 0.68], finalDrive: 4.12, reverseRatio: 2.94,
      turbo: 0, shiftTime: 0.05,
    },
    handling: {
      tireGrip: 1.44, brakeTorque: 19200, handbrakeBias: 0.58, steerMaxDeg: 32, steerSpeed: 4.5,
      downforce: 2050, dragCd: 0.35, frontalArea: 1.98, rollStiffness: 0.8,
      suspension: { travel: 0.08, stiffness: 78000, damping: 6400, restLength: 0.21 }, driftFactor: 0.46,
    },
    paint: { palette: [0x8ad02c, 0xf25c05, 0x1b1f24, 0xd9dee3, 0x6f2ad0], metallic: 0.66, roughness: 0.22, matte: false },
    features: { spoiler: 'gtwing', exhausts: 2 },
    lights: { headlightY: 0.50, headlightSpread: 0.76, taillightY: 0.62, taillightSpread: 0.72, style: 'quad' },
    sound: { engineType: 'v12', basePitch: 1.38, rasp: 0.78, turboWhistle: 0, exhaustPop: 0.68 },
    price: 386000, spawnWeight: 0.1, tags: ['exotic', 'civilian'], durability: 0.88, maxOccupantsAI: 2,
  }),

  veh({
    id: 'wolfram-apex-rs', name: 'Wolfram Apex RS', cls: 'super', seats: 2, doors: 2,
    length: 4.58, width: 1.98, height: 1.18, wheelbase: 2.51, track: 1.70, mass: 1620,
    cogHeight: 0.39, weightBiasFront: 0.44, eff: 0.91,
    body: {
      kind: 'car',
      sections: sec(1.98, 1.18, [[0, 0.90, 0.60, 0.11], [0.08, 0.99, 0.66, 0.09], [0.18, 1.00, 0.74, 0.09],
        [0.29, 0.98, 0.86, 0.09], [0.40, 0.95, 1.00, 0.09], [0.53, 0.92, 0.96, 0.09], [0.65, 0.89, 0.74, 0.09],
        [0.77, 0.88, 0.52, 0.10], [0.89, 0.78, 0.42, 0.11], [1, 0.46, 0.34, 0.16]]),
      cabin: { start: 0.34, end: 0.62, top: 1.16, inset: 0.14, frontRake: 0.80, rearRake: 0.60, glassInset: 0.035 },
      hoodDrop: 0.15, trunkDrop: 0.05,
    },
    wheels: { radius: 0.35, width: 0.33, rearT: 0.17, rimStyle: 'mesh', rimColor: 0x1d2024, tireProfile: 0.11 },
    drivetrain: 'awd',
    engine: {
      kind: 'flat6', peakPowerKw: 544, peakTorqueNm: 800, peakPowerRpm: 7000, peakTorqueRpm: 2800,
      redlineRpm: 8000, idleRpm: 900, gears: [3.60, 2.35, 1.71, 1.32, 1.08, 0.90, 0.75, 0.62], finalDrive: 3.61, reverseRatio: 3.05,
      turbo: 0.74, shiftTime: 0.04,
    },
    handling: {
      tireGrip: 1.46, brakeTorque: 20600, handbrakeBias: 0.54, steerMaxDeg: 32, steerSpeed: 4.7,
      downforce: 2400, dragCd: 0.32, frontalArea: 1.92, rollStiffness: 0.82,
      suspension: { travel: 0.08, stiffness: 82000, damping: 6800, restLength: 0.21 }, driftFactor: 0.42,
    },
    paint: { palette: [0xb7bcc3, 0x0d1014, 0x1f4fd8, 0xd8a21c, 0x7a1f2b], metallic: 0.74, roughness: 0.18 },
    features: { spoiler: 'wing', exhausts: 2 },
    lights: { headlightY: 0.54, headlightSpread: 0.7, taillightY: 0.68, taillightSpread: 0.74, style: 'round' },
    sound: { engineType: 'v6', basePitch: 1.26, rasp: 0.68, turboWhistle: 0.86, exhaustPop: 0.62 },
    price: 468000, spawnWeight: 0.08, tags: ['exotic', 'civilian'], durability: 0.95, maxOccupantsAI: 2,
  }),

  // ===== exotic ==========================================================
  veh({
    id: 'fiorenza-aureo-hy', name: 'Fiorenza Aureo Hybrid', cls: 'exotic', seats: 2, doors: 2,
    length: 4.94, width: 2.06, height: 1.10, wheelbase: 2.72, track: 1.76, mass: 1465,
    cogHeight: 0.36, weightBiasFront: 0.42, eff: 0.86,
    body: {
      kind: 'car',
      sections: sec(2.06, 1.10, [[0, 0.86, 0.56, 0.11], [0.07, 0.96, 0.62, 0.09], [0.15, 1.00, 0.70, 0.08],
        [0.26, 0.99, 0.80, 0.08], [0.37, 0.95, 0.96, 0.08], [0.48, 0.91, 1.00, 0.08], [0.60, 0.88, 0.86, 0.09],
        [0.72, 0.86, 0.56, 0.09], [0.84, 0.78, 0.42, 0.10], [0.93, 0.62, 0.34, 0.12], [1, 0.36, 0.28, 0.16]]),
      cabin: { start: 0.35, end: 0.63, top: 1.08, inset: 0.16, frontRake: 0.88, rearRake: 0.56, glassInset: 0.03 },
      hoodDrop: 0.18, trunkDrop: 0.04,
    },
    wheels: { radius: 0.365, width: 0.355, rearT: 0.155, rimStyle: 'blade', rimColor: 0x171a1e, tireProfile: 0.08 },
    drivetrain: 'awd',
    engine: {
      kind: 'v12', peakPowerKw: 1048, peakTorqueNm: 1180, peakPowerRpm: 8200, peakTorqueRpm: 5900,
      redlineRpm: 8500, idleRpm: 1000, gears: [2.92, 2.02, 1.56, 1.26, 1.04, 0.87, 0.73], finalDrive: 3.90, reverseRatio: 2.68,
      turbo: 0.3, shiftTime: 0.035,
    },
    handling: {
      tireGrip: 1.45, brakeTorque: 24500, handbrakeBias: 0.5, steerMaxDeg: 31, steerSpeed: 4.9,
      downforce: 5200, dragCd: 0.36, frontalArea: 2.04, rollStiffness: 0.88,
      suspension: { travel: 0.07, stiffness: 94000, damping: 7600, restLength: 0.19 }, driftFactor: 0.4,
    },
    paint: { palette: [0xc9a227, 0x0b0d10, 0xb31b25, 0xe6e9ec, 0x27408b], metallic: 0.82, roughness: 0.14 },
    features: { spoiler: 'gtwing', exhausts: 2 },
    lights: { headlightY: 0.48, headlightSpread: 0.78, taillightY: 0.60, taillightSpread: 0.76, style: 'strip' },
    sound: { engineType: 'v12', basePitch: 1.42, rasp: 0.8, turboWhistle: 0.42, exhaustPop: 0.74 },
    price: 1650000, spawnWeight: 0.03, tags: ['exotic'], durability: 0.85, maxOccupantsAI: 1,
  }),

  veh({
    id: 'helion-quicksilver-ev', name: 'Helion Quicksilver EV', cls: 'exotic', seats: 2, doors: 2,
    length: 4.78, width: 2.00, height: 1.16, wheelbase: 2.76, track: 1.72, mass: 2010,
    cogHeight: 0.35, weightBiasFront: 0.47, eff: 0.84,
    body: {
      kind: 'car',
      sections: sec(2.00, 1.16, [[0, 0.84, 0.58, 0.11], [0.09, 0.95, 0.66, 0.09], [0.20, 1.00, 0.78, 0.08],
        [0.32, 0.99, 0.92, 0.08], [0.45, 0.96, 1.00, 0.08], [0.57, 0.93, 0.95, 0.08], [0.69, 0.90, 0.76, 0.08],
        [0.80, 0.87, 0.54, 0.09], [0.91, 0.76, 0.42, 0.10], [1, 0.48, 0.32, 0.14]]),
      cabin: { start: 0.32, end: 0.66, top: 1.14, inset: 0.13, frontRake: 0.84, rearRake: 0.62, glassInset: 0.03 },
      hoodDrop: 0.14, trunkDrop: 0.06,
    },
    wheels: { radius: 0.36, width: 0.31, rearT: 0.15, rimStyle: 'blade', rimColor: 0xcfd6dd, tireProfile: 0.12 },
    drivetrain: 'awd',
    engine: {
      kind: 'electric', peakPowerKw: 620, peakTorqueNm: 1500, peakPowerRpm: 9000, peakTorqueRpm: 0,
      redlineRpm: 16000, idleRpm: 0, gears: [9.2, 4.4], finalDrive: 1.0, reverseRatio: 9.2, turbo: 0, shiftTime: 0.02,
    },
    handling: {
      tireGrip: 1.40, brakeTorque: 23000, handbrakeBias: 0.48, steerMaxDeg: 32, steerSpeed: 4.6,
      downforce: 3100, dragCd: 0.32, frontalArea: 2.16, rollStiffness: 0.8,
      suspension: { travel: 0.09, stiffness: 86000, damping: 7000, restLength: 0.22 }, driftFactor: 0.36,
    },
    paint: { palette: [0xdfe5ea, 0x13161a, 0x1e5fb0, 0x9fe8d0, 0x2b2f36], metallic: 0.86, roughness: 0.12 },
    features: { spoiler: 'wing', exhausts: 0 },
    lights: { headlightY: 0.52, headlightSpread: 0.8, taillightY: 0.64, taillightSpread: 0.82, style: 'strip' },
    sound: { engineType: 'electric', basePitch: 1.7, rasp: 0.08, turboWhistle: 0.6, exhaustPop: 0 },
    price: 1180000, spawnWeight: 0.04, tags: ['exotic'], durability: 0.95, maxOccupantsAI: 1,
  }),

  // ===== muscle ==========================================================
  veh({
    id: 'ardent-vandal-440', name: 'Ardent Vandal 440 (1971)', cls: 'muscle', seats: 4, doors: 2,
    length: 5.12, width: 1.96, height: 1.36, wheelbase: 2.90, track: 1.62, mass: 1712,
    cogHeight: 0.52, weightBiasFront: 0.57, eff: 0.86,
    body: {
      kind: 'car',
      sections: sec(1.96, 1.36, [[0, 0.86, 0.58, 0.17], [0.07, 0.95, 0.62, 0.15], [0.16, 1.00, 0.66, 0.14],
        [0.24, 1.00, 0.86, 0.14], [0.34, 0.99, 0.98, 0.14], [0.46, 0.97, 1.00, 0.14], [0.58, 0.97, 0.84, 0.14],
        [0.70, 0.98, 0.58, 0.14], [0.84, 1.00, 0.54, 0.15], [0.93, 0.94, 0.50, 0.16], [1, 0.76, 0.44, 0.20]]),
      cabin: { start: 0.22, end: 0.60, top: 1.34, inset: 0.10, frontRake: 0.56, rearRake: 0.78, glassInset: 0.05 },
      hoodDrop: 0.05, trunkDrop: 0.08,
    },
    wheels: { radius: 0.36, width: 0.275, rearT: 0.145, rimStyle: 'spoke', rimColor: 0xc6ccd2, tireProfile: 0.66 },
    drivetrain: 'rwd',
    engine: {
      kind: 'v8', peakPowerKw: 283, peakTorqueNm: 664, peakPowerRpm: 5000, peakTorqueRpm: 3200,
      redlineRpm: 5800, idleRpm: 640, gears: [2.66, 1.59, 1.00, 0.78], finalDrive: 3.54, reverseRatio: 2.58,
      turbo: 0, shiftTime: 0.38,
    },
    handling: {
      tireGrip: 0.95, brakeTorque: 8800, handbrakeBias: 0.86, steerMaxDeg: 33, steerSpeed: 2.4,
      downforce: 30, dragCd: 0.47, frontalArea: 2.32, rollStiffness: 0.22,
      suspension: { travel: 0.23, stiffness: 26000, damping: 2000, restLength: 0.39 }, driftFactor: 0.88,
    },
    paint: { palette: [0xe36a12, 0x1d8a4b, 0x8e1620, 0x2b3f8c, 0xf2e3c0, 0x1b1c1f], metallic: 0.3, roughness: 0.4, twoTone: true },
    features: { spoiler: 'lip', exhausts: 2, sunroof: false },
    lights: { headlightY: 0.70, headlightSpread: 0.78, taillightY: 0.78, taillightSpread: 0.80, style: 'round' },
    sound: { engineType: 'v8', basePitch: 0.62, rasp: 0.88, turboWhistle: 0, exhaustPop: 0.46 },
    price: 78000, spawnWeight: 0.34, tags: ['civilian', 'gang', 'stunt'], durability: 1.3, maxOccupantsAI: 3,
  }),

  veh({
    id: 'bullhorn-marauder-fb', name: 'Bullhorn Marauder Fastback (1969)', cls: 'muscle', seats: 4, doors: 2,
    length: 4.78, width: 1.88, height: 1.30, wheelbase: 2.74, track: 1.56, mass: 1548,
    cogHeight: 0.50, weightBiasFront: 0.56, eff: 0.87,
    body: {
      kind: 'car',
      sections: sec(1.88, 1.30, [[0, 0.84, 0.62, 0.16], [0.08, 0.94, 0.72, 0.14], [0.18, 0.99, 0.84, 0.13],
        [0.28, 1.00, 0.95, 0.13], [0.40, 0.99, 1.00, 0.13], [0.52, 0.97, 0.97, 0.13], [0.64, 0.97, 0.78, 0.13],
        [0.76, 0.99, 0.56, 0.14], [0.88, 1.00, 0.52, 0.15], [1, 0.78, 0.45, 0.19]]),
      cabin: { start: 0.24, end: 0.62, top: 1.28, inset: 0.09, frontRake: 0.60, rearRake: 1.05, glassInset: 0.05 },
      hoodDrop: 0.06, trunkDrop: 0.05,
    },
    wheels: { radius: 0.345, width: 0.26, rearT: 0.15, rimStyle: 'dish', rimColor: 0x2f3338, tireProfile: 0.62 },
    drivetrain: 'rwd',
    engine: {
      kind: 'v8', peakPowerKw: 261, peakTorqueNm: 583, peakPowerRpm: 5200, peakTorqueRpm: 3400,
      redlineRpm: 6000, idleRpm: 680, gears: [2.78, 1.93, 1.36, 1.00], finalDrive: 3.89, reverseRatio: 2.72,
      turbo: 0, shiftTime: 0.34,
    },
    handling: {
      tireGrip: 0.97, brakeTorque: 8200, handbrakeBias: 0.88, steerMaxDeg: 34, steerSpeed: 2.6,
      downforce: 45, dragCd: 0.45, frontalArea: 2.20, rollStiffness: 0.26,
      suspension: { travel: 0.21, stiffness: 28000, damping: 2150, restLength: 0.37 }, driftFactor: 0.86,
    },
    paint: { palette: [0x1b4fa8, 0x111316, 0xd7d9dc, 0x9c1f22, 0x2e6b3a], metallic: 0.34, roughness: 0.36, twoTone: true },
    features: { spoiler: 'lip', exhausts: 2 },
    lights: { headlightY: 0.68, headlightSpread: 0.74, taillightY: 0.74, taillightSpread: 0.78, style: 'round' },
    sound: { engineType: 'v8', basePitch: 0.66, rasp: 0.84, turboWhistle: 0, exhaustPop: 0.52 },
    price: 69000, spawnWeight: 0.32, tags: ['civilian', 'gang', 'stunt'], durability: 1.25, maxOccupantsAI: 3,
  }),

  veh({
    id: 'ardent-stampede-gt', name: 'Ardent Stampede GT', cls: 'muscle', seats: 4, doors: 2,
    length: 4.80, width: 1.92, height: 1.39, wheelbase: 2.72, track: 1.60, mass: 1745,
    cogHeight: 0.49, weightBiasFront: 0.54, eff: 0.9,
    body: {
      kind: 'car',
      sections: sec(1.92, 1.39, [[0, 0.88, 0.62, 0.12], [0.08, 0.97, 0.68, 0.11], [0.18, 1.00, 0.74, 0.11],
        [0.28, 1.00, 0.94, 0.11], [0.40, 0.98, 1.00, 0.11], [0.52, 0.96, 0.98, 0.11], [0.63, 0.96, 0.80, 0.11],
        [0.74, 0.98, 0.60, 0.11], [0.86, 1.00, 0.56, 0.12], [1, 0.80, 0.48, 0.16]]),
      cabin: { start: 0.25, end: 0.60, top: 1.37, inset: 0.11, frontRake: 0.62, rearRake: 0.86, glassInset: 0.045 },
      hoodDrop: 0.07, trunkDrop: 0.07,
    },
    wheels: { radius: 0.355, width: 0.295, rearT: 0.15, rimStyle: 'sport5', rimColor: 0x24272b, tireProfile: 0.2 },
    drivetrain: 'rwd',
    engine: {
      kind: 'v8', peakPowerKw: 343, peakTorqueNm: 630, peakPowerRpm: 6000, peakTorqueRpm: 4200,
      redlineRpm: 6800, idleRpm: 700, gears: [3.66, 2.43, 1.69, 1.32, 1.00, 0.82], finalDrive: 3.55, reverseRatio: 3.10,
      turbo: 0, shiftTime: 0.16,
    },
    handling: {
      tireGrip: 1.14, brakeTorque: 13600, handbrakeBias: 0.82, steerMaxDeg: 34, steerSpeed: 3.4,
      downforce: 260, dragCd: 0.38, frontalArea: 2.22, rollStiffness: 0.5,
      suspension: { travel: 0.15, stiffness: 42000, damping: 3500, restLength: 0.31 }, driftFactor: 0.8,
    },
    paint: { palette: [0x111418, 0xcf2b26, 0xdfe3e7, 0x3b6fc4, 0xf29f1c], metallic: 0.5, roughness: 0.3, twoTone: true },
    features: { spoiler: 'wing', exhausts: 4 },
    lights: { headlightY: 0.68, headlightSpread: 0.72, taillightY: 0.78, taillightSpread: 0.76, style: 'quad' },
    sound: { engineType: 'v8', basePitch: 0.74, rasp: 0.78, turboWhistle: 0, exhaustPop: 0.68 },
    price: 96000, spawnWeight: 0.45, tags: ['civilian', 'stunt'], durability: 1.15, maxOccupantsAI: 3,
  }),

  veh({
    id: 'cragmont-cyclone-455', name: 'Cragmont Cyclone 455 Sport Wagon', cls: 'muscle', seats: 6, doors: 5,
    length: 5.36, width: 1.99, height: 1.47, wheelbase: 3.02, track: 1.64, mass: 1932,
    cogHeight: 0.55, weightBiasFront: 0.58, eff: 0.84,
    body: {
      kind: 'car',
      sections: sec(1.99, 1.47, [[0, 0.88, 0.86, 0.17], [0.08, 0.97, 0.92, 0.15], [0.18, 1.00, 0.96, 0.14],
        [0.30, 1.00, 0.97, 0.14], [0.44, 0.99, 0.97, 0.14], [0.56, 0.98, 0.94, 0.14], [0.66, 0.97, 0.78, 0.14],
        [0.76, 0.98, 0.56, 0.14], [0.88, 1.00, 0.52, 0.15], [1, 0.78, 0.46, 0.19]]),
      cabin: { start: 0.14, end: 0.66, top: 1.45, inset: 0.09, frontRake: 0.58, rearRake: 0.14, glassInset: 0.05 },
      hoodDrop: 0.05, trunkDrop: 0.02,
    },
    wheels: { radius: 0.365, width: 0.24, rearT: 0.14, rimStyle: 'steel', rimColor: 0xdfe3e7, tireProfile: 0.7 },
    drivetrain: 'rwd',
    engine: {
      kind: 'v8', peakPowerKw: 246, peakTorqueNm: 690, peakPowerRpm: 4600, peakTorqueRpm: 2800,
      redlineRpm: 5400, idleRpm: 600, gears: [2.48, 1.48, 1.00, 0.75], finalDrive: 3.23, reverseRatio: 2.08,
      turbo: 0, shiftTime: 0.42,
    },
    handling: {
      tireGrip: 0.93, brakeTorque: 9400, handbrakeBias: 0.8, steerMaxDeg: 32, steerSpeed: 2.2,
      downforce: 20, dragCd: 0.49, frontalArea: 2.48, rollStiffness: 0.2,
      suspension: { travel: 0.24, stiffness: 27000, damping: 1950, restLength: 0.41 }, driftFactor: 0.82,
    },
    paint: { palette: [0x7b6a3f, 0x2e5a3a, 0xb8b2a4, 0x8c2a22, 0x2b3a52], metallic: 0.26, roughness: 0.46, twoTone: true },
    features: { spoiler: 'none', exhausts: 2, roofRack: true },
    lights: { headlightY: 0.70, headlightSpread: 0.76, taillightY: 0.86, taillightSpread: 0.82, style: 'round' },
    sound: { engineType: 'v8', basePitch: 0.58, rasp: 0.82, turboWhistle: 0, exhaustPop: 0.38 },
    price: 54000, spawnWeight: 0.4, tags: ['civilian', 'gang'], durability: 1.35, maxOccupantsAI: 4,
  }),

  // ===== classic =========================================================
  veh({
    id: 'aldermast-cavalier-56', name: 'Aldermast Cavalier (1956)', cls: 'classic', seats: 6, doors: 2,
    length: 5.44, width: 1.99, height: 1.55, wheelbase: 3.06, track: 1.58, mass: 1878,
    cogHeight: 0.58, weightBiasFront: 0.56, eff: 0.82,
    body: {
      kind: 'car',
      sections: sec(1.99, 1.55, [[0, 0.80, 0.66, 0.18], [0.06, 0.90, 0.74, 0.16], [0.14, 0.98, 0.70, 0.15],
        [0.24, 1.00, 0.88, 0.15], [0.36, 0.99, 1.00, 0.15], [0.50, 0.97, 1.00, 0.15], [0.62, 0.96, 0.82, 0.15],
        [0.74, 0.97, 0.62, 0.15], [0.86, 0.98, 0.60, 0.16], [0.95, 0.90, 0.56, 0.18], [1, 0.70, 0.50, 0.22]]),
      cabin: { start: 0.22, end: 0.64, top: 1.53, inset: 0.08, frontRake: 0.46, rearRake: 0.54, glassInset: 0.06 },
      hoodDrop: 0.04, trunkDrop: 0.06,
    },
    wheels: { radius: 0.385, width: 0.215, rearT: 0.15, rimStyle: 'chrome', rimColor: 0xf0f3f6, tireProfile: 0.82 },
    drivetrain: 'rwd',
    engine: {
      kind: 'v8', peakPowerKw: 151, peakTorqueNm: 420, peakPowerRpm: 4400, peakTorqueRpm: 2400,
      redlineRpm: 5000, idleRpm: 520, gears: [2.40, 1.47, 1.00], finalDrive: 3.36, reverseRatio: 1.92,
      turbo: 0, shiftTime: 0.5,
    },
    handling: {
      tireGrip: 0.86, brakeTorque: 6400, handbrakeBias: 0.78, steerMaxDeg: 31, steerSpeed: 1.9,
      downforce: 10, dragCd: 0.52, frontalArea: 2.44, rollStiffness: 0.16,
      suspension: { travel: 0.26, stiffness: 22000, damping: 1600, restLength: 0.43 }, driftFactor: 0.74,
    },
    paint: { palette: [0x6fc0c4, 0xf3ede0, 0xc2565c, 0x2f4f7a, 0xe8d36b, 0x3c5a42], metallic: 0.24, roughness: 0.4, twoTone: true },
    features: { spoiler: 'none', exhausts: 2, convertible: false },
    lights: { headlightY: 0.76, headlightSpread: 0.72, taillightY: 0.86, taillightSpread: 0.74, style: 'round' },
    sound: { engineType: 'v8', basePitch: 0.56, rasp: 0.6, turboWhistle: 0, exhaustPop: 0.2 },
    price: 62000, spawnWeight: 0.22, tags: ['civilian'], durability: 1.3, maxOccupantsAI: 4,
  }),

  veh({
    id: 'beaumont-etoile-63', name: 'Beaumont Etoile Roadster (1963)', cls: 'classic', seats: 2, doors: 2,
    length: 4.22, width: 1.62, height: 1.28, wheelbase: 2.34, track: 1.34, mass: 1042,
    cogHeight: 0.47, weightBiasFront: 0.51, eff: 0.88,
    body: {
      kind: 'car',
      sections: sec(1.62, 1.28, [[0, 0.82, 0.72, 0.12], [0.08, 0.93, 0.78, 0.11], [0.18, 0.99, 0.80, 0.10],
        [0.30, 1.00, 0.82, 0.10], [0.44, 0.99, 1.00, 0.10], [0.54, 0.97, 0.72, 0.10], [0.66, 0.96, 0.68, 0.10],
        [0.78, 0.97, 0.66, 0.11], [0.90, 0.95, 0.62, 0.12], [1, 0.74, 0.52, 0.16]]),
      cabin: { start: 0.30, end: 0.52, top: 1.26, inset: 0.07, frontRake: 0.5, rearRake: 0.2, glassInset: 0.03 },
      hoodDrop: 0.03, trunkDrop: 0.05,
    },
    wheels: { radius: 0.335, width: 0.175, rearT: 0.155, rimStyle: 'spoke', rimColor: 0xe6eaee, tireProfile: 0.78 },
    drivetrain: 'rwd',
    engine: {
      kind: 'i6', peakPowerKw: 108, peakTorqueNm: 210, peakPowerRpm: 5600, peakTorqueRpm: 3800,
      redlineRpm: 6200, idleRpm: 760, gears: [3.14, 1.98, 1.36, 1.00], finalDrive: 3.90, reverseRatio: 3.20,
      turbo: 0, shiftTime: 0.4,
    },
    handling: {
      tireGrip: 0.98, brakeTorque: 6000, handbrakeBias: 0.74, steerMaxDeg: 36, steerSpeed: 2.8,
      downforce: 25, dragCd: 0.46, frontalArea: 1.74, rollStiffness: 0.3,
      suspension: { travel: 0.18, stiffness: 23000, damping: 1850, restLength: 0.34 }, driftFactor: 0.68,
    },
    paint: { palette: [0xb81e28, 0x1e4d8c, 0xf2f0e8, 0x2f6b4a, 0x4a4f57], metallic: 0.4, roughness: 0.32 },
    features: { spoiler: 'none', exhausts: 2, convertible: true },
    lights: { headlightY: 0.66, headlightSpread: 0.66, taillightY: 0.74, taillightSpread: 0.68, style: 'round' },
    sound: { engineType: 'i4', basePitch: 1.08, rasp: 0.5, turboWhistle: 0, exhaustPop: 0.28 },
    price: 87000, spawnWeight: 0.14, tags: ['civilian', 'exotic'], durability: 0.9, maxOccupantsAI: 2,
  }),

  // ===== lowrider ========================================================
  veh({
    id: 'ardent-solano-64', name: 'Ardent Solano Hardtop (1964)', cls: 'lowrider', seats: 5, doors: 2,
    length: 5.28, width: 1.96, height: 1.38, wheelbase: 3.00, track: 1.60, mass: 1820,
    cogHeight: 0.47, weightBiasFront: 0.55, eff: 0.82,
    body: {
      kind: 'car',
      sections: sec(1.96, 1.38, [[0, 0.84, 0.62, 0.06], [0.07, 0.94, 0.66, 0.05], [0.16, 1.00, 0.70, 0.05],
        [0.25, 1.00, 0.92, 0.05], [0.36, 1.00, 1.00, 0.05], [0.50, 0.99, 1.00, 0.05], [0.62, 0.98, 0.88, 0.05],
        [0.74, 0.98, 0.62, 0.05], [0.86, 0.98, 0.60, 0.06], [0.94, 0.92, 0.56, 0.07], [1, 0.74, 0.50, 0.10]]),
      cabin: { start: 0.23, end: 0.64, top: 1.36, inset: 0.08, frontRake: 0.5, rearRake: 0.64, glassInset: 0.05 },
      hoodDrop: 0.04, trunkDrop: 0.07,
    },
    wheels: { radius: 0.33, width: 0.16, rearT: 0.145, rimStyle: 'spoke', rimColor: 0xf4d77a, tireProfile: 0.86 },
    drivetrain: 'rwd',
    engine: {
      kind: 'v8', peakPowerKw: 182, peakTorqueNm: 468, peakPowerRpm: 4800, peakTorqueRpm: 2600,
      redlineRpm: 5200, idleRpm: 560, gears: [2.52, 1.52, 1.00], finalDrive: 3.08, reverseRatio: 1.94,
      turbo: 0, shiftTime: 0.46,
    },
    handling: {
      tireGrip: 0.90, brakeTorque: 7200, handbrakeBias: 0.8, steerMaxDeg: 32, steerSpeed: 2.0,
      downforce: 10, dragCd: 0.50, frontalArea: 2.36, rollStiffness: 0.14,
      suspension: { travel: 0.34, stiffness: 15000, damping: 1200, restLength: 0.30 }, driftFactor: 0.7,
    },
    paint: { palette: [0x7b2fbe, 0xc8a02e, 0x2f8fc4, 0xb32d5e, 0x1e6b3a, 0xf0e6d2], metallic: 0.88, roughness: 0.1, twoTone: true },
    features: { spoiler: 'none', exhausts: 2, sunroof: true },
    lights: { headlightY: 0.70, headlightSpread: 0.76, taillightY: 0.80, taillightSpread: 0.78, style: 'round' },
    sound: { engineType: 'v8', basePitch: 0.6, rasp: 0.66, turboWhistle: 0, exhaustPop: 0.3 },
    price: 74000, spawnWeight: 0.3, tags: ['gang', 'civilian'], durability: 1.1, maxOccupantsAI: 4,
  }),

  veh({
    id: 'bullhorn-vaquero-lo', name: 'Bullhorn Vaquero Lowrider', cls: 'lowrider', seats: 3, doors: 2,
    length: 5.16, width: 1.92, height: 1.44, wheelbase: 2.96, track: 1.58, mass: 1690,
    cogHeight: 0.49, weightBiasFront: 0.58, eff: 0.8,
    body: {
      kind: 'pickup',
      sections: sec(1.92, 1.44, [[0, 0.90, 0.54, 0.07], [0.09, 0.97, 0.58, 0.06], [0.20, 0.98, 0.58, 0.06],
        [0.32, 0.99, 0.60, 0.06], [0.40, 1.00, 0.94, 0.06], [0.52, 1.00, 1.00, 0.06], [0.64, 0.99, 0.96, 0.06],
        [0.76, 0.98, 0.66, 0.06], [0.88, 0.97, 0.60, 0.07], [1, 0.80, 0.52, 0.11]]),
      cabin: { start: 0.40, end: 0.68, top: 1.42, inset: 0.09, frontRake: 0.52, rearRake: 0.3, glassInset: 0.05 },
      hoodDrop: 0.05, trunkDrop: 0, bedStart: 0.05,
    },
    wheels: { radius: 0.325, width: 0.165, rearT: 0.135, rimStyle: 'spoke', rimColor: 0xe8e2c8, tireProfile: 0.84 },
    drivetrain: 'rwd',
    engine: {
      kind: 'v8', peakPowerKw: 164, peakTorqueNm: 430, peakPowerRpm: 4400, peakTorqueRpm: 2400,
      redlineRpm: 5000, idleRpm: 540, gears: [2.61, 1.56, 1.00], finalDrive: 3.23, reverseRatio: 2.02,
      turbo: 0, shiftTime: 0.48,
    },
    handling: {
      tireGrip: 0.88, brakeTorque: 6800, handbrakeBias: 0.84, steerMaxDeg: 33, steerSpeed: 2.0,
      downforce: 8, dragCd: 0.54, frontalArea: 2.42, rollStiffness: 0.15,
      suspension: { travel: 0.36, stiffness: 14000, damping: 1100, restLength: 0.29 }, driftFactor: 0.72,
    },
    paint: { palette: [0x9b1c3c, 0x1f7a8c, 0xd9b23a, 0x2c2f36, 0xe7dcc6], metallic: 0.84, roughness: 0.12, twoTone: true },
    features: { spoiler: 'none', exhausts: 2 },
    lights: { headlightY: 0.72, headlightSpread: 0.74, taillightY: 0.72, taillightSpread: 0.8, style: 'round' },
    sound: { engineType: 'v8', basePitch: 0.58, rasp: 0.7, turboWhistle: 0, exhaustPop: 0.34 },
    price: 58000, spawnWeight: 0.26, tags: ['gang', 'civilian'], durability: 1.15, maxOccupantsAI: 3,
  }),

  // ===== suv =============================================================
  veh({
    id: 'bruckner-hochland-x', name: 'Bruckner Hochland X', cls: 'suv', seats: 5, doors: 5,
    length: 4.94, width: 2.00, height: 1.74, wheelbase: 2.99, track: 1.72, mass: 2385,
    cogHeight: 0.72, weightBiasFront: 0.53, eff: 0.83,
    body: {
      kind: 'suv',
      sections: sec(2.00, 1.74, [[0, 0.90, 0.88, 0.20], [0.08, 0.98, 0.94, 0.18], [0.18, 1.00, 0.99, 0.18],
        [0.32, 1.00, 1.00, 0.18], [0.48, 1.00, 1.00, 0.18], [0.62, 0.99, 0.98, 0.18], [0.72, 0.98, 0.88, 0.18],
        [0.82, 0.97, 0.66, 0.19], [0.92, 0.94, 0.60, 0.20], [1, 0.80, 0.52, 0.24]]),
      cabin: { start: 0.16, end: 0.74, top: 1.72, inset: 0.12, frontRake: 0.52, rearRake: 0.34, glassInset: 0.05 },
      hoodDrop: 0.12, trunkDrop: 0.03,
    },
    wheels: { radius: 0.395, width: 0.285, rearT: 0.15, rimStyle: 'mesh', rimColor: 0x9ba2a9, tireProfile: 0.34 },
    drivetrain: 'awd',
    engine: {
      kind: 'v8', peakPowerKw: 375, peakTorqueNm: 700, peakPowerRpm: 5800, peakTorqueRpm: 2200,
      redlineRpm: 6400, idleRpm: 640, gears: [4.71, 3.14, 2.11, 1.67, 1.29, 1.00, 0.84, 0.67], finalDrive: 3.46, reverseRatio: 3.32,
      turbo: 0.5, shiftTime: 0.18,
    },
    handling: {
      tireGrip: 1.08, brakeTorque: 16400, handbrakeBias: 0.5, steerMaxDeg: 34, steerSpeed: 2.8,
      downforce: 60, dragCd: 0.36, frontalArea: 2.92, rollStiffness: 0.42,
      suspension: { travel: 0.22, stiffness: 44000, damping: 3900, restLength: 0.42 }, driftFactor: 0.34,
    },
    offroadGrip: 0.72,
    paint: { palette: [0x101418, 0xf0f2f4, 0x394451, 0x6b5a45, 0x1f3d2f], metallic: 0.62, roughness: 0.26 },
    features: { spoiler: 'none', exhausts: 4, roofRack: true, sunroof: true },
    lights: { headlightY: 0.86, headlightSpread: 0.76, taillightY: 1.06, taillightSpread: 0.78, style: 'strip' },
    sound: { engineType: 'v8', basePitch: 0.82, rasp: 0.44, turboWhistle: 0.34, exhaustPop: 0.24 },
    price: 118000, spawnWeight: 0.75, tags: ['civilian'], durability: 1.35, maxOccupantsAI: 4,
  }),

  veh({
    id: 'ardent-summit-xl', name: 'Ardent Summit XL', cls: 'suv', seats: 8, doors: 5,
    length: 5.62, width: 2.06, height: 1.92, wheelbase: 3.35, track: 1.76, mass: 2740,
    cogHeight: 0.79, weightBiasFront: 0.55, eff: 0.8,
    body: {
      kind: 'suv',
      sections: sec(2.06, 1.92, [[0, 0.92, 0.94, 0.22], [0.09, 0.99, 0.98, 0.20], [0.22, 1.00, 1.00, 0.20],
        [0.38, 1.00, 1.00, 0.20], [0.54, 1.00, 1.00, 0.20], [0.68, 1.00, 0.99, 0.20], [0.78, 0.99, 0.92, 0.20],
        [0.86, 0.98, 0.68, 0.21], [0.94, 0.95, 0.62, 0.22], [1, 0.84, 0.56, 0.26]]),
      cabin: { start: 0.14, end: 0.78, top: 1.90, inset: 0.11, frontRake: 0.48, rearRake: 0.2, glassInset: 0.05 },
      hoodDrop: 0.10, trunkDrop: 0.02,
    },
    wheels: { radius: 0.42, width: 0.29, rearT: 0.14, rimStyle: 'chrome', rimColor: 0xdfe4e9, tireProfile: 0.46 },
    drivetrain: 'awd',
    engine: {
      kind: 'v8', peakPowerKw: 313, peakTorqueNm: 624, peakPowerRpm: 5600, peakTorqueRpm: 4100,
      redlineRpm: 6000, idleRpm: 600, gears: [4.03, 2.36, 1.53, 1.15, 0.85, 0.67], finalDrive: 3.73, reverseRatio: 3.06,
      turbo: 0, shiftTime: 0.24,
    },
    handling: {
      tireGrip: 0.98, brakeTorque: 17800, handbrakeBias: 0.46, steerMaxDeg: 33, steerSpeed: 2.4,
      downforce: 30, dragCd: 0.41, frontalArea: 3.34, rollStiffness: 0.3,
      suspension: { travel: 0.25, stiffness: 46000, damping: 3700, restLength: 0.46 }, driftFactor: 0.3,
    },
    offroadGrip: 0.7,
    paint: { palette: [0xe9ebee, 0x1b1e23, 0x7d848c, 0x2f4358, 0x53372a], metallic: 0.46, roughness: 0.34 },
    features: { spoiler: 'none', exhausts: 2, roofRack: true, bullbar: true, sunroof: true },
    lights: { headlightY: 0.92, headlightSpread: 0.8, taillightY: 1.18, taillightSpread: 0.82, style: 'quad' },
    sound: { engineType: 'v8', basePitch: 0.72, rasp: 0.5, turboWhistle: 0, exhaustPop: 0.2 },
    price: 82000, spawnWeight: 1.0, tags: ['civilian'], durability: 1.5, maxOccupantsAI: 4,
  }),

  veh({
    id: 'tanuki-terra-cx', name: 'Tanuki Terra CX', cls: 'suv', seats: 5, doors: 5,
    length: 4.42, width: 1.82, height: 1.66, wheelbase: 2.66, track: 1.58, mass: 1596,
    cogHeight: 0.66, weightBiasFront: 0.59, eff: 0.85,
    body: {
      kind: 'suv',
      sections: sec(1.82, 1.66, [[0, 0.88, 0.86, 0.19], [0.08, 0.96, 0.93, 0.17], [0.18, 1.00, 0.98, 0.17],
        [0.32, 1.00, 1.00, 0.17], [0.48, 0.99, 1.00, 0.17], [0.62, 0.98, 0.96, 0.17], [0.73, 0.97, 0.82, 0.17],
        [0.84, 0.95, 0.62, 0.18], [0.93, 0.91, 0.56, 0.19], [1, 0.76, 0.48, 0.23]]),
      cabin: { start: 0.17, end: 0.72, top: 1.64, inset: 0.10, frontRake: 0.56, rearRake: 0.38, glassInset: 0.04 },
      hoodDrop: 0.11, trunkDrop: 0.03,
    },
    wheels: { radius: 0.345, width: 0.225, rearT: 0.15, rimStyle: 'mesh', rimColor: 0x6d747c, tireProfile: 0.48 },
    drivetrain: 'awd',
    engine: {
      kind: 'i4', peakPowerKw: 137, peakTorqueNm: 300, peakPowerRpm: 5600, peakTorqueRpm: 2200,
      redlineRpm: 6200, idleRpm: 760, gears: [3.54, 2.05, 1.39, 1.00, 0.78, 0.64], finalDrive: 4.11, reverseRatio: 3.28,
      turbo: 0.44, shiftTime: 0.26,
    },
    handling: {
      tireGrip: 1.00, brakeTorque: 9800, handbrakeBias: 0.56, steerMaxDeg: 36, steerSpeed: 3.0,
      downforce: 45, dragCd: 0.35, frontalArea: 2.66, rollStiffness: 0.38,
      suspension: { travel: 0.21, stiffness: 32000, damping: 2750, restLength: 0.38 }, driftFactor: 0.28,
    },
    offroadGrip: 0.66,
    paint: { palette: [0xb9c2c9, 0x24272c, 0x2f5f8c, 0xa8452c, 0xe4e7ea, 0x46584a], metallic: 0.44, roughness: 0.38 },
    features: { spoiler: 'none', exhausts: 1, roofRack: true },
    lights: { headlightY: 0.82, headlightSpread: 0.7, taillightY: 1.02, taillightSpread: 0.72, style: 'strip' },
    sound: { engineType: 'i4', basePitch: 1.1, rasp: 0.3, turboWhistle: 0.44, exhaustPop: 0.1 },
    price: 32800, spawnWeight: 1.5, tags: ['civilian'], durability: 1.1, maxOccupantsAI: 4,
  }),

  // ===== pickup ==========================================================
  veh({
    id: 'ardent-haulster-1500', name: 'Ardent Haulster 1500', cls: 'pickup', seats: 5, doors: 4,
    length: 5.88, width: 2.04, height: 1.93, wheelbase: 3.68, track: 1.74, mass: 2495,
    cogHeight: 0.76, weightBiasFront: 0.57, eff: 0.8,
    body: {
      kind: 'pickup',
      sections: sec(2.04, 1.93, [[0, 0.92, 0.58, 0.22], [0.10, 0.99, 0.62, 0.20], [0.22, 1.00, 0.62, 0.20],
        [0.34, 1.00, 0.63, 0.20], [0.42, 1.00, 0.96, 0.20], [0.55, 1.00, 1.00, 0.20], [0.68, 0.99, 0.98, 0.20],
        [0.78, 0.98, 0.72, 0.20], [0.88, 0.96, 0.64, 0.21], [1, 0.84, 0.58, 0.25]]),
      cabin: { start: 0.41, end: 0.74, top: 1.91, inset: 0.10, frontRake: 0.5, rearRake: 0.22, glassInset: 0.05 },
      hoodDrop: 0.10, trunkDrop: 0, bedStart: 0.06,
    },
    wheels: { radius: 0.415, width: 0.285, rearT: 0.115, rimStyle: 'chrome', rimColor: 0xe1e6ea, tireProfile: 0.52 },
    drivetrain: 'awd',
    engine: {
      kind: 'v8', peakPowerKw: 298, peakTorqueNm: 640, peakPowerRpm: 5400, peakTorqueRpm: 3900,
      redlineRpm: 5900, idleRpm: 580, gears: [4.18, 2.42, 1.56, 1.16, 0.86, 0.69], finalDrive: 3.92, reverseRatio: 3.14,
      turbo: 0, shiftTime: 0.26,
    },
    handling: {
      tireGrip: 0.96, brakeTorque: 17200, handbrakeBias: 0.5, steerMaxDeg: 32, steerSpeed: 2.3,
      downforce: 20, dragCd: 0.44, frontalArea: 3.28, rollStiffness: 0.28,
      suspension: { travel: 0.26, stiffness: 47000, damping: 3600, restLength: 0.47 }, driftFactor: 0.36,
    },
    offroadGrip: 0.74,
    paint: { palette: [0xd8dce0, 0x14181c, 0xa5271f, 0x1f4a7a, 0x3c4a3a, 0xc7a95f], metallic: 0.4, roughness: 0.36 },
    features: { spoiler: 'none', exhausts: 2, bullbar: true, roofRack: false },
    lights: { headlightY: 0.96, headlightSpread: 0.82, taillightY: 0.92, taillightSpread: 0.86, style: 'quad' },
    sound: { engineType: 'v8', basePitch: 0.7, rasp: 0.56, turboWhistle: 0, exhaustPop: 0.22 },
    price: 46500, spawnWeight: 1.3, tags: ['civilian', 'work'], durability: 1.55, maxOccupantsAI: 4,
  }),

  veh({
    id: 'bullhorn-ranchhand-77', name: 'Bullhorn Ranchhand (1977)', cls: 'pickup', seats: 3, doors: 2,
    length: 5.34, width: 1.96, height: 1.79, wheelbase: 3.30, track: 1.66, mass: 1905,
    cogHeight: 0.71, weightBiasFront: 0.60, eff: 0.78,
    body: {
      kind: 'pickup',
      sections: sec(1.96, 1.79, [[0, 0.90, 0.56, 0.24], [0.10, 0.97, 0.60, 0.22], [0.24, 0.98, 0.60, 0.22],
        [0.36, 0.99, 0.61, 0.22], [0.44, 1.00, 0.94, 0.22], [0.58, 1.00, 1.00, 0.22], [0.70, 0.99, 0.96, 0.22],
        [0.80, 0.97, 0.70, 0.22], [0.90, 0.95, 0.64, 0.23], [1, 0.82, 0.58, 0.27]]),
      cabin: { start: 0.43, end: 0.72, top: 1.77, inset: 0.08, frontRake: 0.44, rearRake: 0.16, glassInset: 0.05 },
      hoodDrop: 0.06, trunkDrop: 0, bedStart: 0.06,
    },
    wheels: { radius: 0.395, width: 0.245, rearT: 0.115, rimStyle: 'steel', rimColor: 0xb9bfc5, tireProfile: 0.72 },
    drivetrain: 'rwd',
    engine: {
      kind: 'v8', peakPowerKw: 129, peakTorqueNm: 400, peakPowerRpm: 4000, peakTorqueRpm: 2200,
      redlineRpm: 4800, idleRpm: 520, gears: [2.99, 1.75, 1.00, 0.73], finalDrive: 3.55, reverseRatio: 2.88,
      turbo: 0, shiftTime: 0.5,
    },
    handling: {
      tireGrip: 0.84, brakeTorque: 8600, handbrakeBias: 0.72, steerMaxDeg: 33, steerSpeed: 2.0,
      downforce: 8, dragCd: 0.55, frontalArea: 3.12, rollStiffness: 0.2,
      suspension: { travel: 0.28, stiffness: 34000, damping: 2400, restLength: 0.48 }, driftFactor: 0.6,
    },
    offroadGrip: 0.68,
    paint: { palette: [0x2f6b52, 0x8a5a2b, 0xd9d2c2, 0x7e2a22, 0x38506b], metallic: 0.2, roughness: 0.56, twoTone: true },
    features: { spoiler: 'none', exhausts: 1, bullbar: true },
    lights: { headlightY: 0.88, headlightSpread: 0.74, taillightY: 0.88, taillightSpread: 0.8, style: 'round' },
    sound: { engineType: 'v8', basePitch: 0.6, rasp: 0.74, turboWhistle: 0, exhaustPop: 0.3 },
    price: 19500, spawnWeight: 1.1, tags: ['civilian', 'work'], durability: 1.45, maxOccupantsAI: 3,
  }),

  // ===== van =============================================================
  veh({
    id: 'bruckner-kurier', name: 'Bruckner Kurier Panel Van', cls: 'van', seats: 3, doors: 4,
    length: 5.52, width: 2.02, height: 2.44, wheelbase: 3.66, track: 1.74, mass: 2280,
    cogHeight: 0.86, weightBiasFront: 0.57, eff: 0.78,
    body: {
      kind: 'van',
      sections: sec(2.02, 2.44, [[0, 0.94, 0.86, 0.20], [0.10, 0.99, 0.95, 0.17], [0.25, 1.00, 0.98, 0.16],
        [0.45, 1.00, 1.00, 0.16], [0.62, 1.00, 1.00, 0.16], [0.76, 0.99, 0.99, 0.17], [0.86, 0.96, 0.93, 0.18],
        [0.94, 0.90, 0.72, 0.20], [1, 0.80, 0.50, 0.24]]),
      cabin: { start: 0.74, end: 0.98, top: 2.30, inset: 0.08, frontRake: 0.42, rearRake: 0.05, glassInset: 0.04 },
      hoodDrop: 0.06, trunkDrop: 0,
    },
    wheels: { radius: 0.375, width: 0.235, rearT: 0.105, rimStyle: 'steel', rimColor: 0x8e949b, tireProfile: 0.6 },
    drivetrain: 'rwd',
    engine: {
      kind: 'diesel', peakPowerKw: 125, peakTorqueNm: 400, peakPowerRpm: 3600, peakTorqueRpm: 1600,
      redlineRpm: 4200, idleRpm: 700, gears: [3.79, 2.11, 1.36, 1.00, 0.79, 0.66], finalDrive: 3.92, reverseRatio: 3.44,
      turbo: 0.56, shiftTime: 0.34,
    },
    handling: {
      tireGrip: 0.88, brakeTorque: 12400, handbrakeBias: 0.48, steerMaxDeg: 36, steerSpeed: 2.3,
      downforce: 10, dragCd: 0.40, frontalArea: 4.36, rollStiffness: 0.24,
      suspension: { travel: 0.22, stiffness: 42000, damping: 3200, restLength: 0.42 }, driftFactor: 0.3,
    },
    paint: { palette: [0xf2f4f6, 0xc9ced4, 0x2f5f9e, 0x8c8f95, 0xb8452e], metallic: 0.22, roughness: 0.5 },
    features: { spoiler: 'none', exhausts: 1, roofRack: true },
    lights: { headlightY: 0.98, headlightSpread: 0.76, taillightY: 1.54, taillightSpread: 0.8, style: 'strip' },
    sound: { engineType: 'diesel', basePitch: 0.66, rasp: 0.52, turboWhistle: 0.5, exhaustPop: 0.05 },
    price: 28400, spawnWeight: 1.2, tags: ['civilian', 'work'], durability: 1.3, maxOccupantsAI: 3,
  }),

  veh({
    id: 'pennant-familia-mpv', name: 'Pennant Familia MPV', cls: 'van', seats: 7, doors: 5,
    length: 5.06, width: 1.96, height: 1.79, wheelbase: 3.05, track: 1.70, mass: 1985,
    cogHeight: 0.70, weightBiasFront: 0.58, eff: 0.83,
    body: {
      kind: 'van',
      sections: sec(1.96, 1.79, [[0, 0.90, 0.88, 0.18], [0.09, 0.98, 0.95, 0.16], [0.20, 1.00, 0.99, 0.16],
        [0.36, 1.00, 1.00, 0.16], [0.52, 1.00, 1.00, 0.16], [0.64, 0.99, 0.97, 0.16], [0.74, 0.98, 0.86, 0.16],
        [0.84, 0.96, 0.64, 0.17], [0.93, 0.92, 0.56, 0.18], [1, 0.78, 0.48, 0.22]]),
      cabin: { start: 0.15, end: 0.76, top: 1.77, inset: 0.09, frontRake: 0.64, rearRake: 0.3, glassInset: 0.04 },
      hoodDrop: 0.09, trunkDrop: 0.02,
    },
    wheels: { radius: 0.35, width: 0.225, rearT: 0.145, rimStyle: 'mesh', rimColor: 0xa4abb2, tireProfile: 0.54 },
    drivetrain: 'fwd',
    engine: {
      kind: 'v6', peakPowerKw: 172, peakTorqueNm: 355, peakPowerRpm: 6200, peakTorqueRpm: 3900,
      redlineRpm: 6600, idleRpm: 720, gears: [3.51, 2.04, 1.39, 1.00, 0.77, 0.63], finalDrive: 3.68, reverseRatio: 2.88,
      turbo: 0, shiftTime: 0.3,
    },
    handling: {
      tireGrip: 0.94, brakeTorque: 11200, handbrakeBias: 0.5, steerMaxDeg: 35, steerSpeed: 2.6,
      downforce: 25, dragCd: 0.34, frontalArea: 3.02, rollStiffness: 0.3,
      suspension: { travel: 0.20, stiffness: 34000, damping: 2900, restLength: 0.39 }, driftFactor: 0.24,
    },
    paint: { palette: [0x9aa3ab, 0xe8eaed, 0x2b3c52, 0x6b4e3c, 0x3d5a45], metallic: 0.34, roughness: 0.44 },
    features: { spoiler: 'none', exhausts: 1, roofRack: true, sunroof: true },
    lights: { headlightY: 0.86, headlightSpread: 0.72, taillightY: 1.12, taillightSpread: 0.76, style: 'strip' },
    sound: { engineType: 'v6', basePitch: 0.96, rasp: 0.28, turboWhistle: 0, exhaustPop: 0.06 },
    price: 31900, spawnWeight: 1.25, tags: ['civilian'], durability: 1.15, maxOccupantsAI: 4,
  }),

  // ===== truck ===========================================================
  veh({
    id: 'ironvale-roadliner-900', name: 'Ironvale Roadliner 900 Semi', cls: 'truck', seats: 2, doors: 2,
    length: 6.64, width: 2.54, height: 3.92, wheelbase: 4.22, track: 2.12, mass: 8350,
    cogHeight: 0.88, weightBiasFront: 0.44, eff: 0.78,
    body: {
      kind: 'truck',
      sections: sec(2.54, 3.92, [[0, 0.94, 0.92, 0.26], [0.10, 0.99, 0.98, 0.24], [0.22, 1.00, 1.00, 0.24],
        [0.36, 1.00, 1.00, 0.24], [0.50, 1.00, 0.99, 0.24], [0.60, 0.99, 0.94, 0.24], [0.70, 0.96, 0.62, 0.24],
        [0.82, 0.95, 0.60, 0.25], [0.92, 0.93, 0.58, 0.26], [1, 0.86, 0.50, 0.30]]),
      cabin: { start: 0.12, end: 0.68, top: 3.78, inset: 0.10, frontRake: 0.34, rearRake: 0.06, glassInset: 0.05 },
      hoodDrop: 0.34, trunkDrop: 0,
      trailer: { length: 14.6, height: 4.05 },
    },
    wheels: { radius: 0.53, width: 0.36, rearT: 0.105, rimStyle: 'chrome', rimColor: 0xd2d8de, tireProfile: 0.44 },
    drivetrain: 'rwd',
    engine: {
      kind: 'diesel', peakPowerKw: 392, peakTorqueNm: 2500, peakPowerRpm: 1800, peakTorqueRpm: 1100,
      redlineRpm: 2300, idleRpm: 560, gears: [12.8, 9.2, 6.6, 4.8, 3.5, 2.6, 1.9, 1.4, 1.0, 0.74], finalDrive: 3.55, reverseRatio: 11.4,
      turbo: 0.72, shiftTime: 0.56,
    },
    handling: {
      tireGrip: 0.78, brakeTorque: 29500, handbrakeBias: 0.34, steerMaxDeg: 32, steerSpeed: 1.7,
      downforce: 0, dragCd: 0.72, frontalArea: 9.20, rollStiffness: 0.18,
      suspension: { travel: 0.24, stiffness: 130000, damping: 9000, restLength: 0.58 }, driftFactor: 0.2,
    },
    paint: { palette: [0xb51f27, 0x1b2b44, 0xe8ebee, 0x2e2f33, 0xd8a32a], metallic: 0.6, roughness: 0.28, twoTone: true },
    features: { spoiler: 'none', exhausts: 2, trailer: true, bullbar: true },
    lights: { headlightY: 1.24, headlightSpread: 0.9, taillightY: 1.10, taillightSpread: 0.86, style: 'quad' },
    sound: { engineType: 'diesel', basePitch: 0.42, rasp: 0.74, turboWhistle: 0.82, exhaustPop: 0.04 },
    price: 165000, spawnWeight: 0.5, tags: ['work', 'civilian'], durability: 2.1, maxOccupantsAI: 2,
  }),

  veh({
    id: 'ironvale-churnmaster-8', name: 'Ironvale Churnmaster 8 Mixer', cls: 'truck', seats: 3, doors: 2,
    length: 8.24, width: 2.50, height: 3.74, wheelbase: 4.62, track: 2.08, mass: 13400,
    cogHeight: 0.90, weightBiasFront: 0.42, eff: 0.76,
    body: {
      kind: 'truck',
      sections: sec(2.50, 3.74, [[0, 0.86, 0.70, 0.30], [0.10, 0.94, 0.88, 0.28], [0.22, 1.00, 0.98, 0.28],
        [0.36, 1.00, 1.00, 0.28], [0.50, 0.98, 0.96, 0.28], [0.60, 0.92, 0.84, 0.28], [0.70, 0.96, 0.94, 0.28],
        [0.82, 0.97, 0.92, 0.28], [0.92, 0.95, 0.60, 0.30], [1, 0.88, 0.50, 0.34]]),
      cabin: { start: 0.70, end: 0.92, top: 3.44, inset: 0.09, frontRake: 0.3, rearRake: 0.08, glassInset: 0.05 },
      hoodDrop: 0.24, trunkDrop: 0,
    },
    wheels: { radius: 0.52, width: 0.34, rearT: 0.10, rimStyle: 'steel', rimColor: 0x7c828a, tireProfile: 0.5 },
    drivetrain: 'rwd',
    engine: {
      kind: 'diesel', peakPowerKw: 261, peakTorqueNm: 1600, peakPowerRpm: 2000, peakTorqueRpm: 1200,
      redlineRpm: 2500, idleRpm: 580, gears: [9.6, 6.4, 4.4, 3.1, 2.2, 1.5, 1.0], finalDrive: 4.30, reverseRatio: 8.8,
      turbo: 0.66, shiftTime: 0.6,
    },
    handling: {
      tireGrip: 0.76, brakeTorque: 27000, handbrakeBias: 0.3, steerMaxDeg: 34, steerSpeed: 1.6,
      downforce: 0, dragCd: 0.82, frontalArea: 8.60, rollStiffness: 0.14,
      suspension: { travel: 0.22, stiffness: 145000, damping: 10500, restLength: 0.56 }, driftFactor: 0.14,
    },
    paint: { palette: [0xd4d7da, 0xe0762a, 0x2c4f74, 0x9a9ea3], metallic: 0.28, roughness: 0.56 },
    features: { spoiler: 'none', exhausts: 1, cementMixer: true, bullbar: true },
    lights: { headlightY: 1.18, headlightSpread: 0.86, taillightY: 0.96, taillightSpread: 0.84, style: 'round' },
    sound: { engineType: 'diesel', basePitch: 0.38, rasp: 0.8, turboWhistle: 0.6, exhaustPop: 0.03 },
    price: 0, spawnWeight: 0.4, tags: ['work'], durability: 2.3, maxOccupantsAI: 2,
  }),

  // ===== bus =============================================================
  veh({
    id: 'civicworks-districtliner', name: 'Civic Works Districtliner School Bus', cls: 'bus', seats: 46, doors: 2,
    length: 11.28, width: 2.44, height: 3.16, wheelbase: 6.10, track: 2.02, mass: 11200,
    cogHeight: 0.88, weightBiasFront: 0.41, eff: 0.8,
    body: {
      kind: 'bus',
      sections: sec(2.44, 3.16, [[0, 0.94, 0.94, 0.30], [0.08, 0.99, 0.98, 0.28], [0.20, 1.00, 1.00, 0.28],
        [0.40, 1.00, 1.00, 0.28], [0.60, 1.00, 1.00, 0.28], [0.74, 1.00, 1.00, 0.28], [0.84, 0.99, 0.98, 0.28],
        [0.90, 0.96, 0.62, 0.30], [0.96, 0.93, 0.56, 0.32], [1, 0.84, 0.50, 0.36]]),
      cabin: { start: 0.06, end: 0.88, top: 3.10, inset: 0.07, frontRake: 0.28, rearRake: 0.08, glassInset: 0.04 },
      hoodDrop: 0.22, trunkDrop: 0,
    },
    wheels: { radius: 0.50, width: 0.30, rearT: 0.145, rimStyle: 'steel', rimColor: 0x5c6169, tireProfile: 0.56 },
    drivetrain: 'rwd',
    engine: {
      kind: 'diesel', peakPowerKw: 164, peakTorqueNm: 1030, peakPowerRpm: 2400, peakTorqueRpm: 1300,
      redlineRpm: 3000, idleRpm: 620, gears: [6.6, 3.9, 2.3, 1.4, 1.0, 0.75], finalDrive: 4.56, reverseRatio: 6.1,
      turbo: 0.5, shiftTime: 0.62,
    },
    handling: {
      tireGrip: 0.78, brakeTorque: 24000, handbrakeBias: 0.3, steerMaxDeg: 38, steerSpeed: 1.8,
      downforce: 0, dragCd: 0.76, frontalArea: 7.20, rollStiffness: 0.16,
      suspension: { travel: 0.20, stiffness: 118000, damping: 8600, restLength: 0.54 }, driftFactor: 0.16,
    },
    paint: { palette: [0xf2b705, 0xf5c945, 0xe0a400], metallic: 0.16, roughness: 0.6, livery: 'checker' },
    features: { spoiler: 'none', exhausts: 1 },
    lights: { headlightY: 1.02, headlightSpread: 0.82, taillightY: 1.0, taillightSpread: 0.86, style: 'round' },
    sound: { engineType: 'diesel', basePitch: 0.46, rasp: 0.66, turboWhistle: 0.4, exhaustPop: 0.03 },
    price: 0, spawnWeight: 0.35, tags: ['work', 'civilian'], durability: 2.0, maxOccupantsAI: 4,
  }),

  veh({
    id: 'metroliner-40', name: 'Leonida Transit Metroliner 40', cls: 'bus', seats: 38, doors: 3,
    length: 12.04, width: 2.55, height: 3.24, wheelbase: 6.02, track: 2.14, mass: 12600,
    cogHeight: 0.90, weightBiasFront: 0.40, eff: 0.82,
    body: {
      kind: 'bus',
      sections: sec(2.55, 3.24, [[0, 0.96, 0.96, 0.26], [0.10, 1.00, 1.00, 0.24], [0.30, 1.00, 1.00, 0.24],
        [0.50, 1.00, 1.00, 0.24], [0.70, 1.00, 1.00, 0.24], [0.85, 1.00, 1.00, 0.24], [0.93, 0.99, 0.99, 0.25],
        [0.98, 0.96, 0.94, 0.27], [1, 0.90, 0.86, 0.30]]),
      cabin: { start: 0.04, end: 0.97, top: 3.18, inset: 0.06, frontRake: 0.18, rearRake: 0.10, glassInset: 0.04 },
      hoodDrop: 0.04, trunkDrop: 0,
    },
    wheels: { radius: 0.51, width: 0.31, rearT: 0.115, rimStyle: 'steel', rimColor: 0x4e535a, tireProfile: 0.52 },
    drivetrain: 'rwd',
    engine: {
      kind: 'diesel', peakPowerKw: 194, peakTorqueNm: 1250, peakPowerRpm: 2200, peakTorqueRpm: 1250,
      redlineRpm: 4000, idleRpm: 600, gears: [3.49, 1.86, 1.41, 1.00, 0.75], finalDrive: 5.13, reverseRatio: 5.4,
      turbo: 0.58, shiftTime: 0.7,
    },
    handling: {
      tireGrip: 0.75, brakeTorque: 26000, handbrakeBias: 0.28, steerMaxDeg: 42, steerSpeed: 1.9,
      downforce: 0, dragCd: 0.78, frontalArea: 7.64, rollStiffness: 0.15,
      suspension: { travel: 0.19, stiffness: 124000, damping: 9200, restLength: 0.52 }, driftFactor: 0.14,
    },
    paint: { palette: [0xe8ebee, 0x2f7fb8, 0xf0a41c, 0x6a7078], metallic: 0.2, roughness: 0.54, twoTone: true },
    features: { spoiler: 'none', exhausts: 1 },
    lights: { headlightY: 0.86, headlightSpread: 0.88, taillightY: 1.06, taillightSpread: 0.9, style: 'strip' },
    sound: { engineType: 'diesel', basePitch: 0.44, rasp: 0.58, turboWhistle: 0.46, exhaustPop: 0.02 },
    price: 0, spawnWeight: 0.55, tags: ['work', 'civilian'], durability: 2.05, maxOccupantsAI: 4,
  }),

  // ===== motorcycle ======================================================
  veh({
    id: 'torqvist-revenant-s', name: 'Torqvist Revenant S', cls: 'motorcycle', seats: 2, doors: 0,
    length: 2.07, width: 0.72, height: 1.14, wheelbase: 1.41, track: 0.09, mass: 198,
    cogHeight: 0.54, weightBiasFront: 0.50, eff: 0.9,
    body: {
      kind: 'bike',
      sections: sec(0.72, 1.14, [[0, 0.34, 0.70, 0.54], [0.12, 0.50, 0.74, 0.48], [0.24, 0.62, 0.66, 0.36],
        [0.38, 0.82, 0.60, 0.28], [0.50, 1.00, 0.64, 0.24], [0.62, 0.88, 0.72, 0.28], [0.74, 0.62, 0.86, 0.34],
        [0.86, 0.46, 0.94, 0.40], [1, 0.30, 1.00, 0.48]]),
      cabin: { start: 0.36, end: 0.62, top: 0.86, inset: 0.02, frontRake: 0.62, rearRake: 0.3, glassInset: 0.01 },
      hoodDrop: 0, trunkDrop: 0,
    },
    wheels: { radius: 0.305, width: 0.185, rearT: 0.155, rimStyle: 'sport5', rimColor: 0x1e2126, tireProfile: 0.3 },
    drivetrain: 'rwd',
    engine: {
      kind: 'i4', peakPowerKw: 147, peakTorqueNm: 113, peakPowerRpm: 13500, peakTorqueRpm: 11000,
      redlineRpm: 14800, idleRpm: 1300, gears: [2.62, 2.04, 1.71, 1.50, 1.36, 1.25], finalDrive: 2.69, reverseRatio: 0,
      turbo: 0, shiftTime: 0.08,
    },
    handling: {
      tireGrip: 1.30, brakeTorque: 5600, handbrakeBias: 0.9, steerMaxDeg: 34, steerSpeed: 5.2,
      downforce: 120, dragCd: 0.58, frontalArea: 0.62, rollStiffness: 0.9,
      suspension: { travel: 0.12, stiffness: 21000, damping: 1900, restLength: 0.30 }, driftFactor: 0.5,
    },
    paint: { palette: [0x1b6fd6, 0x131519, 0xd42a26, 0xf2f4f6, 0x2ec27e], metallic: 0.62, roughness: 0.26 },
    features: { spoiler: 'none', exhausts: 1 },
    lights: { headlightY: 0.98, headlightSpread: 0.18, taillightY: 0.74, taillightSpread: 0.12, style: 'strip' },
    sound: { engineType: 'bike', basePitch: 1.66, rasp: 0.72, turboWhistle: 0, exhaustPop: 0.62 },
    price: 26500, spawnWeight: 0.6, tags: ['civilian', 'stunt'], durability: 0.55, maxOccupantsAI: 2,
  }),

  veh({
    id: 'bullhorn-roadsaint-1800', name: 'Bullhorn Roadsaint 1800', cls: 'motorcycle', seats: 2, doors: 0,
    length: 2.48, width: 0.94, height: 1.26, wheelbase: 1.72, track: 0.11, mass: 342,
    cogHeight: 0.48, weightBiasFront: 0.47, eff: 0.86,
    body: {
      kind: 'bike',
      sections: sec(0.94, 1.26, [[0, 0.40, 0.78, 0.50], [0.10, 0.58, 0.82, 0.44], [0.22, 0.72, 0.70, 0.34],
        [0.34, 0.86, 0.62, 0.26], [0.48, 1.00, 0.66, 0.22], [0.60, 0.90, 0.74, 0.26], [0.72, 0.70, 0.80, 0.32],
        [0.86, 0.54, 0.88, 0.38], [1, 0.36, 0.94, 0.46]]),
      cabin: { start: 0.34, end: 0.60, top: 0.92, inset: 0.02, frontRake: 0.5, rearRake: 0.2, glassInset: 0.01 },
      hoodDrop: 0, trunkDrop: 0,
    },
    wheels: { radius: 0.36, width: 0.22, rearT: 0.135, rimStyle: 'spoke', rimColor: 0xd8dde2, tireProfile: 0.56 },
    drivetrain: 'rwd',
    engine: {
      kind: 'twin', peakPowerKw: 78, peakTorqueNm: 158, peakPowerRpm: 5200, peakTorqueRpm: 3000,
      redlineRpm: 6000, idleRpm: 900, gears: [3.14, 2.16, 1.62, 1.30, 1.06], finalDrive: 2.44, reverseRatio: 0,
      turbo: 0, shiftTime: 0.18,
    },
    handling: {
      tireGrip: 1.08, brakeTorque: 4600, handbrakeBias: 0.86, steerMaxDeg: 32, steerSpeed: 3.8,
      downforce: 20, dragCd: 0.76, frontalArea: 0.86, rollStiffness: 0.74,
      suspension: { travel: 0.14, stiffness: 17000, damping: 1500, restLength: 0.30 }, driftFactor: 0.42,
    },
    paint: { palette: [0x121316, 0x6b1f24, 0xc9a24a, 0x2b3f5c, 0xb8bec4], metallic: 0.7, roughness: 0.22 },
    features: { spoiler: 'none', exhausts: 2 },
    lights: { headlightY: 0.94, headlightSpread: 0.14, taillightY: 0.78, taillightSpread: 0.1, style: 'round' },
    sound: { engineType: 'bike', basePitch: 0.82, rasp: 0.9, turboWhistle: 0, exhaustPop: 0.48 },
    price: 21800, spawnWeight: 0.5, tags: ['civilian', 'gang'], durability: 0.7, maxOccupantsAI: 2,
  }),

  veh({
    id: 'tanuki-dustdevil-450', name: 'Tanuki Dust Devil 450', cls: 'motorcycle', seats: 1, doors: 0,
    // 116 kg was this bike dry, with nobody on it, while every other machine in
    // the catalogue is quoted wet and ridden — 198 for the Revenant, 342 for the
    // Roadsaint. Forty-two kilowatts on 116 kg is a better power-to-weight than
    // a superbike, and it showed: full throttle in a straight line stood the
    // thing on its tail. A 450 enduro with fluids and a rider aboard is a bit
    // over two hundred.
    length: 2.18, width: 0.84, height: 1.28, wheelbase: 1.48, track: 0.08, mass: 208,
    cogHeight: 0.58, weightBiasFront: 0.49, eff: 0.82,
    body: {
      kind: 'bike',
      sections: sec(0.84, 1.28, [[0, 0.30, 0.72, 0.52], [0.12, 0.44, 0.76, 0.46], [0.26, 0.58, 0.66, 0.34],
        [0.40, 0.78, 0.58, 0.26], [0.52, 1.00, 0.62, 0.22], [0.64, 0.84, 0.70, 0.26], [0.76, 0.58, 0.82, 0.32],
        [0.88, 0.42, 0.92, 0.40], [1, 0.26, 1.00, 0.50]]),
      cabin: { start: 0.38, end: 0.62, top: 0.84, inset: 0.02, frontRake: 0.58, rearRake: 0.26, glassInset: 0.01 },
      hoodDrop: 0, trunkDrop: 0,
    },
    wheels: { radius: 0.39, width: 0.12, rearT: 0.15, rimStyle: 'spoke', rimColor: 0xc0c6cc, tireProfile: 0.9 },
    drivetrain: 'rwd',
    engine: {
      kind: 'single', peakPowerKw: 42, peakTorqueNm: 50, peakPowerRpm: 9000, peakTorqueRpm: 7000,
      redlineRpm: 11000, idleRpm: 1500, gears: [2.85, 2.05, 1.65, 1.38, 1.18], finalDrive: 3.85, reverseRatio: 0,
      turbo: 0, shiftTime: 0.1,
    },
    handling: {
      tireGrip: 1.02, brakeTorque: 4300, handbrakeBias: 0.92, steerMaxDeg: 40, steerSpeed: 5.6,
      downforce: 0, dragCd: 0.82, frontalArea: 0.70, rollStiffness: 0.8,
      suspension: { travel: 0.30, stiffness: 12000, damping: 1250, restLength: 0.44 }, driftFactor: 0.66,
    },
    offroadGrip: 0.94,
    paint: { palette: [0x2ec27e, 0xf25c05, 0xf2f4f6, 0x1b1e22, 0x2f6fd0], metallic: 0.4, roughness: 0.4 },
    features: { spoiler: 'none', exhausts: 1 },
    lights: { headlightY: 1.02, headlightSpread: 0.12, taillightY: 0.8, taillightSpread: 0.1, style: 'round' },
    sound: { engineType: 'bike', basePitch: 1.34, rasp: 0.86, turboWhistle: 0, exhaustPop: 0.4 },
    price: 9400, spawnWeight: 0.35, tags: ['civilian', 'offroad', 'stunt'], durability: 0.5, maxOccupantsAI: 1,
  }),

  veh({
    id: 'voltura-bumble-125', name: 'Voltura Bumble 125', cls: 'motorcycle', seats: 2, doors: 0,
    length: 1.86, width: 0.70, height: 1.18, wheelbase: 1.30, track: 0.07, mass: 124,
    cogHeight: 0.44, weightBiasFront: 0.44, eff: 0.84,
    body: {
      kind: 'bike',
      sections: sec(0.70, 1.18, [[0, 0.46, 0.68, 0.40], [0.12, 0.64, 0.72, 0.34], [0.26, 0.80, 0.60, 0.26],
        [0.40, 0.94, 0.52, 0.22], [0.54, 1.00, 0.56, 0.20], [0.66, 0.86, 0.68, 0.24], [0.78, 0.64, 0.82, 0.30],
        [0.90, 0.48, 0.92, 0.38], [1, 0.34, 0.98, 0.46]]),
      cabin: { start: 0.40, end: 0.64, top: 0.80, inset: 0.02, frontRake: 0.44, rearRake: 0.18, glassInset: 0.01 },
      hoodDrop: 0, trunkDrop: 0,
    },
    wheels: { radius: 0.22, width: 0.11, rearT: 0.165, rimStyle: 'mesh', rimColor: 0x9aa1a8, tireProfile: 0.62 },
    drivetrain: 'rwd',
    engine: {
      kind: 'single', peakPowerKw: 9, peakTorqueNm: 12, peakPowerRpm: 7500, peakTorqueRpm: 6000,
      redlineRpm: 8600, idleRpm: 1400, gears: [3.6], finalDrive: 4.10, reverseRatio: 0, turbo: 0, shiftTime: 0,
    },
    handling: {
      tireGrip: 0.94, brakeTorque: 4000, handbrakeBias: 0.8, steerMaxDeg: 42, steerSpeed: 5.0,
      downforce: 0, dragCd: 0.66, frontalArea: 0.74, rollStiffness: 0.62,
      suspension: { travel: 0.11, stiffness: 9500, damping: 900, restLength: 0.24 }, driftFactor: 0.3,
    },
    paint: { palette: [0xf5d13a, 0xe8eaec, 0x2f9fd0, 0xd45a2a, 0x3a3f46], metallic: 0.34, roughness: 0.44 },
    features: { spoiler: 'none', exhausts: 1 },
    lights: { headlightY: 0.90, headlightSpread: 0.1, taillightY: 0.72, taillightSpread: 0.1, style: 'round' },
    sound: { engineType: 'bike', basePitch: 1.9, rasp: 0.5, turboWhistle: 0, exhaustPop: 0.12 },
    price: 3200, spawnWeight: 0.7, tags: ['civilian'], durability: 0.5, maxOccupantsAI: 2,
  }),

  // ===== offroad =========================================================
  veh({
    id: 'cragmont-dirt-kaiser', name: 'Cragmont Dirt Kaiser Monster Truck', cls: 'offroad', seats: 2, doors: 2,
    length: 5.92, width: 3.62, height: 3.58, wheelbase: 3.62, track: 2.86, mass: 4650,
    cogHeight: 0.90, weightBiasFront: 0.50, eff: 0.76,
    body: {
      kind: 'pickup',
      sections: sec(3.62, 3.58, [[0, 0.48, 0.52, 0.34], [0.10, 0.54, 0.56, 0.33], [0.24, 0.56, 0.56, 0.33],
        [0.36, 0.56, 0.58, 0.33], [0.44, 0.58, 0.92, 0.33], [0.58, 0.58, 1.00, 0.33], [0.70, 0.57, 0.96, 0.33],
        [0.80, 0.56, 0.70, 0.33], [0.90, 0.54, 0.62, 0.34], [1, 0.46, 0.54, 0.36]]),
      cabin: { start: 0.43, end: 0.74, top: 3.52, inset: 0.12, frontRake: 0.48, rearRake: 0.24, glassInset: 0.05 },
      hoodDrop: 0.12, trunkDrop: 0, bedStart: 0.08,
    },
    wheels: { radius: 0.84, width: 0.68, rearT: 0.19, rimStyle: 'offroad', rimColor: 0xd9dde1, tireProfile: 1.0 },
    drivetrain: 'awd',
    engine: {
      kind: 'v8', peakPowerKw: 559, peakTorqueNm: 1350, peakPowerRpm: 5600, peakTorqueRpm: 3400,
      redlineRpm: 6400, idleRpm: 900, gears: [2.45, 1.45, 1.00], finalDrive: 5.38, reverseRatio: 2.2,
      turbo: 0.4, shiftTime: 0.3,
    },
    handling: {
      tireGrip: 0.92, brakeTorque: 22000, handbrakeBias: 0.66, steerMaxDeg: 40, steerSpeed: 2.6,
      downforce: 0, dragCd: 0.86, frontalArea: 8.10, rollStiffness: 0.2,
      suspension: { travel: 0.62, stiffness: 58000, damping: 5200, restLength: 0.92 }, driftFactor: 0.6,
    },
    offroadGrip: 0.98,
    paint: { palette: [0x8a2be2, 0x22c55e, 0xf59e0b, 0xef4444, 0x0ea5e9], metallic: 0.5, roughness: 0.3, livery: 'flame' },
    features: { spoiler: 'none', exhausts: 2, rollcage: true, bullbar: true, snorkel: true },
    lights: { headlightY: 2.24, headlightSpread: 0.6, taillightY: 1.94, taillightSpread: 0.56, style: 'quad' },
    sound: { engineType: 'v8', basePitch: 0.52, rasp: 0.96, turboWhistle: 0.3, exhaustPop: 0.8 },
    price: 210000, spawnWeight: 0.05, tags: ['offroad', 'stunt'], durability: 2.2, maxOccupantsAI: 2,
  }),

  veh({
    id: 'ardent-trailhound-4x4', name: 'Ardent Trailhound 4x4', cls: 'offroad', seats: 4, doors: 3,
    length: 4.58, width: 1.98, height: 2.02, wheelbase: 2.74, track: 1.70, mass: 2185,
    cogHeight: 0.82, weightBiasFront: 0.52, eff: 0.76,
    body: {
      kind: 'suv',
      sections: sec(1.98, 2.02, [[0, 0.92, 0.88, 0.26], [0.09, 0.99, 0.94, 0.24], [0.20, 1.00, 0.98, 0.24],
        [0.34, 1.00, 1.00, 0.24], [0.50, 1.00, 1.00, 0.24], [0.64, 1.00, 0.99, 0.24], [0.76, 0.99, 0.94, 0.24],
        [0.86, 0.98, 0.64, 0.25], [0.94, 0.96, 0.60, 0.26], [1, 0.88, 0.54, 0.30]]),
      cabin: { start: 0.14, end: 0.80, top: 2.00, inset: 0.08, frontRake: 0.2, rearRake: 0.08, glassInset: 0.04 },
      hoodDrop: 0.14, trunkDrop: 0.02,
    },
    wheels: { radius: 0.45, width: 0.32, rearT: 0.145, rimStyle: 'offroad', rimColor: 0x3d4249, tireProfile: 0.86 },
    drivetrain: 'awd',
    engine: {
      kind: 'v6', peakPowerKw: 213, peakTorqueNm: 470, peakPowerRpm: 5200, peakTorqueRpm: 2000,
      redlineRpm: 6000, idleRpm: 720, gears: [4.71, 2.99, 2.15, 1.77, 1.44, 1.00, 0.84, 0.67], finalDrive: 4.10, reverseRatio: 4.2,
      turbo: 0.48, shiftTime: 0.26,
    },
    handling: {
      tireGrip: 0.90, brakeTorque: 14200, handbrakeBias: 0.6, steerMaxDeg: 40, steerSpeed: 2.7,
      downforce: 0, dragCd: 0.58, frontalArea: 3.38, rollStiffness: 0.24,
      suspension: { travel: 0.34, stiffness: 38000, damping: 3400, restLength: 0.56 }, driftFactor: 0.46,
    },
    offroadGrip: 0.95,
    paint: { palette: [0x4c6b3a, 0xd9c48a, 0x1f2226, 0xb4552a, 0xe8eaed, 0x2f5f7a], metallic: 0.24, roughness: 0.52 },
    features: { spoiler: 'none', exhausts: 1, roofRack: true, bullbar: true, snorkel: true, convertible: true },
    lights: { headlightY: 1.06, headlightSpread: 0.66, taillightY: 1.12, taillightSpread: 0.74, style: 'round' },
    sound: { engineType: 'v6', basePitch: 0.86, rasp: 0.58, turboWhistle: 0.42, exhaustPop: 0.28 },
    price: 52000, spawnWeight: 0.6, tags: ['civilian', 'offroad'], durability: 1.6, maxOccupantsAI: 4,
  }),

  veh({
    id: 'sandpiper-dunewhip', name: 'Sandpiper Dunewhip Buggy', cls: 'offroad', seats: 2, doors: 0,
    length: 3.64, width: 2.04, height: 1.62, wheelbase: 2.42, track: 1.82, mass: 782,
    cogHeight: 0.52, weightBiasFront: 0.42, eff: 0.84,
    body: {
      kind: 'quad',
      sections: sec(2.04, 1.62, [[0, 0.62, 0.62, 0.24], [0.12, 0.78, 0.70, 0.22], [0.26, 0.92, 0.86, 0.22],
        [0.40, 1.00, 1.00, 0.22], [0.54, 0.98, 1.00, 0.22], [0.66, 0.90, 0.82, 0.22], [0.78, 0.78, 0.56, 0.22],
        [0.90, 0.62, 0.46, 0.24], [1, 0.44, 0.40, 0.28]]),
      cabin: { start: 0.30, end: 0.62, top: 1.58, inset: 0.06, frontRake: 0.42, rearRake: 0.3, glassInset: 0.02 },
      hoodDrop: 0.08, trunkDrop: 0.04,
    },
    wheels: { radius: 0.42, width: 0.36, rearT: 0.16, rimStyle: 'offroad', rimColor: 0xf0f2f4, tireProfile: 0.92 },
    drivetrain: 'rwd',
    engine: {
      kind: 'flat6', peakPowerKw: 138, peakTorqueNm: 240, peakPowerRpm: 6400, peakTorqueRpm: 4400,
      redlineRpm: 7200, idleRpm: 980, gears: [3.09, 1.86, 1.26, 0.89], finalDrive: 4.86, reverseRatio: 3.17,
      turbo: 0, shiftTime: 0.2,
    },
    handling: {
      tireGrip: 0.96, brakeTorque: 7400, handbrakeBias: 0.78, steerMaxDeg: 41, steerSpeed: 4.0,
      downforce: 30, dragCd: 0.72, frontalArea: 2.30, rollStiffness: 0.4,
      suspension: { travel: 0.42, stiffness: 19000, damping: 1800, restLength: 0.58 }, driftFactor: 0.82,
    },
    offroadGrip: 0.99,
    paint: { palette: [0xf25c05, 0xf5d13a, 0x2ec27e, 0xe8eaec, 0x1b6fd6], metallic: 0.3, roughness: 0.42, matte: true },
    features: { spoiler: 'none', exhausts: 1, rollcage: true },
    lights: { headlightY: 1.18, headlightSpread: 0.44, taillightY: 0.72, taillightSpread: 0.4, style: 'round' },
    sound: { engineType: 'i4', basePitch: 1.36, rasp: 0.82, turboWhistle: 0, exhaustPop: 0.56 },
    price: 38000, spawnWeight: 0.2, tags: ['offroad', 'stunt'], durability: 0.8, maxOccupantsAI: 2,
  }),

  // ===== quad ============================================================
  veh({
    id: 'tanuki-scrub-450q', name: 'Tanuki Scrub 450 Quad', cls: 'quad', seats: 1, doors: 0,
    length: 2.14, width: 1.22, height: 1.24, wheelbase: 1.31, track: 0.98, mass: 288,
    cogHeight: 0.42, weightBiasFront: 0.46, eff: 0.8,
    body: {
      kind: 'quad',
      sections: sec(1.22, 1.24, [[0, 0.72, 0.56, 0.20], [0.14, 0.86, 0.62, 0.18], [0.28, 0.94, 0.58, 0.18],
        [0.42, 0.88, 0.52, 0.18], [0.54, 0.80, 0.70, 0.18], [0.66, 0.86, 0.96, 0.18], [0.78, 0.92, 0.78, 0.18],
        [0.90, 1.00, 0.60, 0.20], [1, 0.84, 0.52, 0.24]]),
      cabin: { start: 0.34, end: 0.60, top: 0.74, inset: 0.03, frontRake: 0.4, rearRake: 0.2, glassInset: 0.01 },
      hoodDrop: 0.04, trunkDrop: 0.04,
    },
    wheels: { radius: 0.31, width: 0.24, rearT: 0.17, rimStyle: 'offroad', rimColor: 0x2b2f35, tireProfile: 0.96 },
    drivetrain: 'awd',
    engine: {
      kind: 'single', peakPowerKw: 30, peakTorqueNm: 44, peakPowerRpm: 7800, peakTorqueRpm: 5600,
      redlineRpm: 9000, idleRpm: 1350, gears: [2.75, 1.92, 1.48, 1.20, 1.00], finalDrive: 3.42, reverseRatio: 3.0,
      turbo: 0, shiftTime: 0.14,
    },
    handling: {
      tireGrip: 0.86, brakeTorque: 4200, handbrakeBias: 0.7, steerMaxDeg: 38, steerSpeed: 4.8,
      downforce: 0, dragCd: 0.84, frontalArea: 1.02, rollStiffness: 0.36,
      suspension: { travel: 0.26, stiffness: 13000, damping: 1300, restLength: 0.40 }, driftFactor: 0.74,
    },
    offroadGrip: 0.97,
    paint: { palette: [0xd4343a, 0x2f6fd0, 0x1f2327, 0xf0f2f4, 0x6ba32f], metallic: 0.3, roughness: 0.46 },
    features: { spoiler: 'none', exhausts: 1 },
    lights: { headlightY: 0.94, headlightSpread: 0.34, taillightY: 0.6, taillightSpread: 0.3, style: 'round' },
    sound: { engineType: 'bike', basePitch: 1.28, rasp: 0.8, turboWhistle: 0, exhaustPop: 0.34 },
    price: 8600, spawnWeight: 0.22, tags: ['offroad', 'stunt', 'civilian'], durability: 0.7, maxOccupantsAI: 1,
  }),

  // ===== kart ============================================================
  veh({
    id: 'apex-micro-gk5', name: 'Apex Micro GK-5 Kart', cls: 'kart', seats: 1, doors: 0,
    length: 1.94, width: 1.36, height: 0.68, wheelbase: 1.06, track: 1.14, mass: 98,
    cogHeight: 0.35, weightBiasFront: 0.42, eff: 0.88,
    body: {
      kind: 'kart',
      sections: sec(1.36, 0.68, [[0, 0.50, 0.72, 0.10], [0.12, 0.72, 0.90, 0.09], [0.26, 0.86, 1.00, 0.08],
        [0.40, 1.00, 0.86, 0.07], [0.56, 0.96, 0.62, 0.06], [0.70, 0.70, 0.50, 0.06], [0.84, 0.50, 0.44, 0.07],
        [1, 0.34, 0.40, 0.09]]),
      cabin: { start: 0.22, end: 0.52, top: 0.66, inset: 0.04, frontRake: 0.3, rearRake: 0.5, glassInset: 0.01 },
      hoodDrop: 0.02, trunkDrop: 0.02,
    },
    wheels: { radius: 0.14, width: 0.19, rearT: 0.14, rimStyle: 'steel', rimColor: 0xf0f2f4, tireProfile: 0.34 },
    drivetrain: 'rwd',
    engine: {
      kind: 'single', peakPowerKw: 11, peakTorqueNm: 19, peakPowerRpm: 8200, peakTorqueRpm: 6400,
      redlineRpm: 9600, idleRpm: 1800, gears: [2.4], finalDrive: 3.1, reverseRatio: 0, turbo: 0, shiftTime: 0,
    },
    handling: {
      tireGrip: 1.38, brakeTorque: 4000, handbrakeBias: 0.96, steerMaxDeg: 30, steerSpeed: 6.0,
      downforce: 40, dragCd: 0.70, frontalArea: 0.56, rollStiffness: 0.94,
      suspension: { travel: 0.03, stiffness: 96000, damping: 5200, restLength: 0.08 }, driftFactor: 0.6,
    },
    paint: { palette: [0xef4444, 0x0ea5e9, 0xf59e0b, 0x22c55e, 0xf5f7f9], metallic: 0.36, roughness: 0.38, livery: 'racing' },
    features: { spoiler: 'none', exhausts: 1, rollcage: false },
    lights: { headlightY: 0.3, headlightSpread: 0.3, taillightY: 0.34, taillightSpread: 0.28, style: 'round' },
    sound: { engineType: 'bike', basePitch: 2.0, rasp: 0.88, turboWhistle: 0, exhaustPop: 0.2 },
    price: 6400, spawnWeight: 0.06, tags: ['stunt'], durability: 0.5, maxOccupantsAI: 1,
  }),

  // ===== boat ============================================================
  veh({
    id: 'marlinco-riptide-38', name: 'Marlinco Riptide 38', cls: 'boat', seats: 6, doors: 0,
    length: 11.62, width: 2.86, height: 2.64, wheelbase: 7.40, track: 1.60, mass: 4860,
    cogHeight: 0.68, weightBiasFront: 0.44, eff: 0.78,
    body: {
      kind: 'boat',
      sections: sec(2.86, 2.64, [[0, 0.96, 0.62, 0.02], [0.10, 1.00, 0.60, 0.04], [0.25, 0.99, 0.58, 0.06],
        [0.40, 0.95, 0.62, 0.08], [0.55, 0.88, 0.70, 0.12], [0.70, 0.76, 0.78, 0.18], [0.82, 0.60, 0.88, 0.26],
        [0.92, 0.42, 0.95, 0.36], [1, 0.16, 1.00, 0.50]]),
      cabin: { start: 0.34, end: 0.62, top: 1.88, inset: 0.22, frontRake: 0.7, rearRake: 0.4, glassInset: 0.04 },
      hoodDrop: 0, trunkDrop: 0,
    },
    wheels: { radius: 0.30, width: 0.30, rearT: 0.09, rimStyle: 'steel', rimColor: 0xb9c0c7, tireProfile: 0.3 },
    drivetrain: 'rwd',
    engine: {
      kind: 'v8', peakPowerKw: 372, peakTorqueNm: 720, peakPowerRpm: 5200, peakTorqueRpm: 3600,
      redlineRpm: 5600, idleRpm: 700, gears: [1.9], finalDrive: 1.5, reverseRatio: 1.9, turbo: 0, shiftTime: 0.4,
    },
    handling: {
      tireGrip: 0.80, brakeTorque: 4200, handbrakeBias: 0.2, steerMaxDeg: 34, steerSpeed: 1.9,
      downforce: 0, dragCd: 0.88, frontalArea: 5.00, rollStiffness: 0.26,
      suspension: { travel: 0.30, stiffness: 30000, damping: 5000, restLength: 0.40 }, driftFactor: 0.9,
    },
    paint: { palette: [0xf2f4f6, 0x14406b, 0xd42a26, 0x1f8a70, 0x2a2d33], metallic: 0.5, roughness: 0.26, twoTone: true },
    features: { spoiler: 'none', exhausts: 2 },
    lights: { headlightY: 1.72, headlightSpread: 0.3, taillightY: 1.0, taillightSpread: 0.5, style: 'round' },
    sound: { engineType: 'v8', basePitch: 0.68, rasp: 0.6, turboWhistle: 0, exhaustPop: 0.18 },
    price: 224000, spawnWeight: 0.12, tags: ['civilian'], durability: 1.4, maxOccupantsAI: 4,
  }),

  veh({
    id: 'tideline-skimmer-900', name: 'Tideline Skimmer 900', cls: 'boat', seats: 2, doors: 0,
    length: 3.24, width: 1.22, height: 1.16, wheelbase: 1.90, track: 0.62, mass: 372,
    cogHeight: 0.42, weightBiasFront: 0.46, eff: 0.78,
    body: {
      kind: 'boat',
      sections: sec(1.22, 1.16, [[0, 0.88, 0.66, 0.04], [0.12, 0.98, 0.62, 0.06], [0.28, 1.00, 0.60, 0.08],
        [0.42, 0.96, 0.70, 0.10], [0.56, 0.90, 0.86, 0.14], [0.68, 0.80, 1.00, 0.20], [0.80, 0.66, 0.88, 0.28],
        [0.90, 0.48, 0.80, 0.36], [1, 0.22, 0.70, 0.48]]),
      cabin: { start: 0.30, end: 0.58, top: 0.78, inset: 0.06, frontRake: 0.5, rearRake: 0.3, glassInset: 0.02 },
      hoodDrop: 0, trunkDrop: 0,
    },
    wheels: { radius: 0.16, width: 0.18, rearT: 0.10, rimStyle: 'steel', rimColor: 0x9aa1a8, tireProfile: 0.3 },
    drivetrain: 'rwd',
    engine: {
      kind: 'i4', peakPowerKw: 75, peakTorqueNm: 120, peakPowerRpm: 7200, peakTorqueRpm: 5400,
      redlineRpm: 8000, idleRpm: 1200, gears: [1.6], finalDrive: 1.2, reverseRatio: 1.6, turbo: 0.3, shiftTime: 0.3,
    },
    handling: {
      tireGrip: 0.78, brakeTorque: 4000, handbrakeBias: 0.2, steerMaxDeg: 42, steerSpeed: 3.4,
      downforce: 0, dragCd: 0.90, frontalArea: 1.90, rollStiffness: 0.3,
      suspension: { travel: 0.22, stiffness: 14000, damping: 2600, restLength: 0.30 }, driftFactor: 0.95,
    },
    paint: { palette: [0x0ea5e9, 0xf5f7f9, 0xf59e0b, 0xef4444, 0x22c55e], metallic: 0.42, roughness: 0.3 },
    features: { spoiler: 'none', exhausts: 1 },
    lights: { headlightY: 0.7, headlightSpread: 0.2, taillightY: 0.5, taillightSpread: 0.24, style: 'round' },
    sound: { engineType: 'i4', basePitch: 1.42, rasp: 0.64, turboWhistle: 0.3, exhaustPop: 0.1 },
    price: 24800, spawnWeight: 0.18, tags: ['civilian', 'stunt'], durability: 0.75, maxOccupantsAI: 2,
  }),

  // ===== emergency =======================================================
  veh({
    id: 'lpd-cruiser', name: 'Pennant Meridian Patrol (Leonida PD)', cls: 'emergency', seats: 5, doors: 4,
    length: 4.92, width: 1.88, height: 1.51, wheelbase: 2.86, track: 1.60, mass: 1748,
    cogHeight: 0.52, weightBiasFront: 0.57, eff: 0.9,
    body: {
      kind: 'car',
      sections: sec(1.88, 1.51, [[0, 0.85, 0.55, 0.13], [0.08, 0.95, 0.59, 0.11], [0.17, 1.00, 0.63, 0.11],
        [0.27, 1.00, 0.88, 0.11], [0.41, 1.00, 1.00, 0.11], [0.55, 0.99, 0.97, 0.11], [0.68, 0.97, 0.70, 0.11],
        [0.80, 0.96, 0.54, 0.12], [0.91, 0.91, 0.50, 0.13], [1, 0.74, 0.44, 0.16]]),
      cabin: { start: 0.25, end: 0.68, top: 1.49, inset: 0.10, frontRake: 0.62, rearRake: 0.5, glassInset: 0.04 },
      hoodDrop: 0.09, trunkDrop: 0.11,
    },
    wheels: { radius: 0.335, width: 0.235, rearT: 0.14, rimStyle: 'steel', rimColor: 0x33373d, tireProfile: 0.4 },
    drivetrain: 'rwd',
    engine: {
      kind: 'v6', peakPowerKw: 269, peakTorqueNm: 500, peakPowerRpm: 5800, peakTorqueRpm: 3000,
      redlineRpm: 6600, idleRpm: 700, gears: [4.48, 2.87, 1.84, 1.41, 1.00, 0.74], finalDrive: 3.39, reverseRatio: 2.88,
      turbo: 0.52, shiftTime: 0.14,
    },
    handling: {
      tireGrip: 1.20, brakeTorque: 14600, handbrakeBias: 0.74, steerMaxDeg: 36, steerSpeed: 3.4,
      downforce: 150, dragCd: 0.32, frontalArea: 2.28, rollStiffness: 0.5,
      suspension: { travel: 0.16, stiffness: 38000, damping: 3300, restLength: 0.33 }, driftFactor: 0.5,
    },
    paint: { palette: [0x0b1524, 0xf2f4f6, 0x16305a], metallic: 0.34, roughness: 0.38, twoTone: true, livery: 'police' },
    features: { spoiler: 'lip', lightbar: true, siren: 'police', exhausts: 2, bullbar: true },
    lights: { headlightY: 0.72, headlightSpread: 0.68, taillightY: 0.82, taillightSpread: 0.72, style: 'strip' },
    sound: { engineType: 'v6', basePitch: 1.0, rasp: 0.48, turboWhistle: 0.5, exhaustPop: 0.24 },
    price: 0, spawnWeight: 0.9, tags: ['police'], durability: 1.3, maxOccupantsAI: 2,
  }),

  veh({
    id: 'lpd-interceptor', name: 'Ardent Stampede Interceptor (Highway Patrol)', cls: 'emergency', seats: 4, doors: 2,
    length: 4.84, width: 1.94, height: 1.38, wheelbase: 2.74, track: 1.62, mass: 1806,
    cogHeight: 0.48, weightBiasFront: 0.54, eff: 0.93,
    body: {
      kind: 'car',
      sections: sec(1.94, 1.38, [[0, 0.88, 0.62, 0.12], [0.08, 0.97, 0.68, 0.11], [0.18, 1.00, 0.74, 0.11],
        [0.28, 1.00, 0.94, 0.11], [0.40, 0.98, 1.00, 0.11], [0.52, 0.96, 0.98, 0.11], [0.63, 0.96, 0.80, 0.11],
        [0.74, 0.98, 0.60, 0.11], [0.86, 1.00, 0.55, 0.12], [1, 0.80, 0.48, 0.16]]),
      cabin: { start: 0.25, end: 0.60, top: 1.36, inset: 0.11, frontRake: 0.62, rearRake: 0.86, glassInset: 0.045 },
      hoodDrop: 0.07, trunkDrop: 0.07,
    },
    wheels: { radius: 0.355, width: 0.30, rearT: 0.15, rimStyle: 'sport5', rimColor: 0x1c1f23, tireProfile: 0.18 },
    drivetrain: 'rwd',
    engine: {
      kind: 'v8', peakPowerKw: 388, peakTorqueNm: 680, peakPowerRpm: 6200, peakTorqueRpm: 4400,
      redlineRpm: 7000, idleRpm: 720, gears: [3.66, 2.43, 1.69, 1.32, 1.00, 0.82, 0.68], finalDrive: 3.73, reverseRatio: 3.10,
      turbo: 0.2, shiftTime: 0.1,
    },
    handling: {
      tireGrip: 1.28, brakeTorque: 16400, handbrakeBias: 0.8, steerMaxDeg: 34, steerSpeed: 3.8,
      downforce: 420, dragCd: 0.37, frontalArea: 2.20, rollStiffness: 0.58,
      suspension: { travel: 0.13, stiffness: 48000, damping: 4000, restLength: 0.30 }, driftFactor: 0.72,
    },
    paint: { palette: [0x101317, 0xf5f7f9, 0x1b3f7a, 0x9aa1a8], metallic: 0.46, roughness: 0.3, twoTone: true, livery: 'police' },
    features: { spoiler: 'wing', lightbar: true, siren: 'police', exhausts: 4, bullbar: true },
    lights: { headlightY: 0.68, headlightSpread: 0.72, taillightY: 0.78, taillightSpread: 0.76, style: 'quad' },
    sound: { engineType: 'v8', basePitch: 0.76, rasp: 0.8, turboWhistle: 0.2, exhaustPop: 0.7 },
    price: 0, spawnWeight: 0.35, tags: ['police'], durability: 1.25, maxOccupantsAI: 2,
  }),

  veh({
    id: 'lpd-unmarked', name: 'Halcyon Regent Unmarked', cls: 'emergency', seats: 5, doors: 4,
    length: 5.18, width: 1.92, height: 1.47, wheelbase: 3.08, track: 1.64, mass: 1902,
    cogHeight: 0.53, weightBiasFront: 0.53, eff: 0.88,
    body: {
      kind: 'car',
      sections: sec(1.92, 1.47, [[0, 0.86, 0.56, 0.15], [0.07, 0.95, 0.60, 0.13], [0.16, 1.00, 0.64, 0.12],
        [0.26, 1.00, 0.90, 0.12], [0.38, 1.00, 1.00, 0.12], [0.53, 1.00, 0.99, 0.12], [0.65, 0.99, 0.90, 0.12],
        [0.76, 0.97, 0.62, 0.12], [0.88, 0.95, 0.55, 0.13], [1, 0.77, 0.47, 0.17]]),
      cabin: { start: 0.24, end: 0.68, top: 1.45, inset: 0.11, frontRake: 0.58, rearRake: 0.46, glassInset: 0.045 },
      hoodDrop: 0.09, trunkDrop: 0.10,
    },
    wheels: { radius: 0.345, width: 0.24, rearT: 0.14, rimStyle: 'steel', rimColor: 0x2b2f34, tireProfile: 0.42 },
    drivetrain: 'rwd',
    engine: {
      kind: 'v8', peakPowerKw: 306, peakTorqueNm: 560, peakPowerRpm: 5800, peakTorqueRpm: 2600,
      redlineRpm: 6400, idleRpm: 660, gears: [4.17, 2.34, 1.52, 1.14, 0.87, 0.69], finalDrive: 3.27, reverseRatio: 3.40,
      turbo: 0.4, shiftTime: 0.16,
    },
    handling: {
      tireGrip: 1.18, brakeTorque: 14000, handbrakeBias: 0.68, steerMaxDeg: 34, steerSpeed: 3.2,
      downforce: 140, dragCd: 0.30, frontalArea: 2.26, rollStiffness: 0.48,
      suspension: { travel: 0.17, stiffness: 39000, damping: 3400, restLength: 0.34 }, driftFactor: 0.52,
    },
    paint: { palette: [0x22252a, 0x5c6169, 0x8e949b, 0x1f2b3c], metallic: 0.4, roughness: 0.42, livery: 'none' },
    features: { spoiler: 'none', lightbar: false, siren: 'police', exhausts: 2 },
    lights: { headlightY: 0.72, headlightSpread: 0.7, taillightY: 0.82, taillightSpread: 0.74, style: 'strip' },
    sound: { engineType: 'v8', basePitch: 0.86, rasp: 0.52, turboWhistle: 0.34, exhaustPop: 0.3 },
    price: 0, spawnWeight: 0.22, tags: ['police'], durability: 1.25, maxOccupantsAI: 2,
  }),

  veh({
    id: 'lpd-swat-van', name: 'Ironhide Enforcer SWAT Van', cls: 'emergency', seats: 10, doors: 4,
    length: 6.02, width: 2.22, height: 2.76, wheelbase: 3.80, track: 1.90, mass: 4620,
    cogHeight: 0.90, weightBiasFront: 0.52, eff: 0.76,
    body: {
      kind: 'van',
      sections: sec(2.22, 2.76, [[0, 0.96, 0.92, 0.22], [0.10, 1.00, 0.98, 0.20], [0.26, 1.00, 1.00, 0.20],
        [0.44, 1.00, 1.00, 0.20], [0.60, 1.00, 1.00, 0.20], [0.74, 0.99, 0.98, 0.20], [0.84, 0.97, 0.90, 0.21],
        [0.92, 0.93, 0.70, 0.22], [1, 0.84, 0.54, 0.26]]),
      cabin: { start: 0.72, end: 0.97, top: 2.62, inset: 0.09, frontRake: 0.38, rearRake: 0.06, glassInset: 0.06 },
      hoodDrop: 0.08, trunkDrop: 0,
    },
    wheels: { radius: 0.425, width: 0.30, rearT: 0.115, rimStyle: 'steel', rimColor: 0x25282d, tireProfile: 0.64 },
    drivetrain: 'awd',
    engine: {
      kind: 'diesel', peakPowerKw: 246, peakTorqueNm: 830, peakPowerRpm: 3200, peakTorqueRpm: 1700,
      redlineRpm: 3800, idleRpm: 660, gears: [4.36, 2.46, 1.56, 1.16, 0.85, 0.67], finalDrive: 4.30, reverseRatio: 3.9,
      turbo: 0.7, shiftTime: 0.28,
    },
    handling: {
      tireGrip: 0.94, brakeTorque: 21000, handbrakeBias: 0.42, steerMaxDeg: 35, steerSpeed: 2.2,
      downforce: 0, dragCd: 0.56, frontalArea: 5.26, rollStiffness: 0.26,
      suspension: { travel: 0.24, stiffness: 74000, damping: 6200, restLength: 0.48 }, driftFactor: 0.22,
    },
    offroadGrip: 0.78,
    paint: { palette: [0x1b1f24, 0x2f3a44, 0x0b1524], metallic: 0.3, roughness: 0.46, matte: true, livery: 'police' },
    features: { spoiler: 'none', lightbar: true, siren: 'police', exhausts: 1, bullbar: true, roofRack: true },
    lights: { headlightY: 1.06, headlightSpread: 0.78, taillightY: 1.72, taillightSpread: 0.8, style: 'quad' },
    sound: { engineType: 'diesel', basePitch: 0.58, rasp: 0.7, turboWhistle: 0.66, exhaustPop: 0.06 },
    price: 0, spawnWeight: 0.12, tags: ['police', 'military'], durability: 2.0, maxOccupantsAI: 4,
  }),

  veh({
    id: 'ems-ambulance', name: 'Bruckner Lifeline Ambulance', cls: 'emergency', seats: 4, doors: 4,
    length: 6.42, width: 2.32, height: 2.88, wheelbase: 3.92, track: 1.96, mass: 4180,
    cogHeight: 0.89, weightBiasFront: 0.50, eff: 0.78,
    body: {
      kind: 'van',
      sections: sec(2.32, 2.88, [[0, 0.98, 0.98, 0.30], [0.10, 1.00, 1.00, 0.28], [0.30, 1.00, 1.00, 0.28],
        [0.50, 1.00, 1.00, 0.28], [0.66, 1.00, 1.00, 0.28], [0.76, 0.98, 0.98, 0.28], [0.84, 0.94, 0.84, 0.29],
        [0.92, 0.92, 0.70, 0.30], [1, 0.82, 0.58, 0.34]]),
      cabin: { start: 0.78, end: 0.98, top: 2.54, inset: 0.08, frontRake: 0.44, rearRake: 0.05, glassInset: 0.05 },
      hoodDrop: 0.10, trunkDrop: 0,
    },
    wheels: { radius: 0.415, width: 0.27, rearT: 0.105, rimStyle: 'steel', rimColor: 0xdfe3e7, tireProfile: 0.6 },
    drivetrain: 'rwd',
    engine: {
      kind: 'diesel', peakPowerKw: 205, peakTorqueNm: 720, peakPowerRpm: 3400, peakTorqueRpm: 1800,
      redlineRpm: 4000, idleRpm: 640, gears: [3.97, 2.32, 1.52, 1.15, 0.86, 0.69], finalDrive: 4.10, reverseRatio: 3.6,
      turbo: 0.62, shiftTime: 0.3,
    },
    handling: {
      tireGrip: 0.90, brakeTorque: 19000, handbrakeBias: 0.4, steerMaxDeg: 36, steerSpeed: 2.3,
      downforce: 0, dragCd: 0.52, frontalArea: 5.48, rollStiffness: 0.24,
      suspension: { travel: 0.23, stiffness: 66000, damping: 5400, restLength: 0.46 }, driftFactor: 0.2,
    },
    paint: { palette: [0xf5f7f9, 0xd42a26, 0xe8eaec, 0x2fb37a], metallic: 0.22, roughness: 0.42, twoTone: true, livery: 'ambulance' },
    features: { spoiler: 'none', lightbar: true, siren: 'ems', exhausts: 1, roofRack: true },
    lights: { headlightY: 1.02, headlightSpread: 0.76, taillightY: 1.82, taillightSpread: 0.82, style: 'strip' },
    sound: { engineType: 'diesel', basePitch: 0.62, rasp: 0.54, turboWhistle: 0.52, exhaustPop: 0.04 },
    price: 0, spawnWeight: 0.2, tags: ['ems'], durability: 1.6, maxOccupantsAI: 2,
  }),

  veh({
    id: 'fd-pumper-9', name: 'Ironvale Backdraft Pumper 9', cls: 'emergency', seats: 6, doors: 4,
    length: 9.86, width: 2.54, height: 3.44, wheelbase: 5.42, track: 2.10, mass: 15900,
    cogHeight: 0.90, weightBiasFront: 0.46, eff: 0.78,
    body: {
      kind: 'truck',
      sections: sec(2.54, 3.44, [[0, 0.96, 0.86, 0.26], [0.10, 1.00, 0.92, 0.24], [0.26, 1.00, 0.94, 0.24],
        [0.44, 1.00, 0.94, 0.24], [0.58, 1.00, 0.96, 0.24], [0.70, 0.99, 1.00, 0.24], [0.80, 0.98, 0.98, 0.24],
        [0.88, 0.96, 0.86, 0.25], [0.95, 0.93, 0.62, 0.27], [1, 0.86, 0.52, 0.31]]),
      cabin: { start: 0.66, end: 0.94, top: 3.28, inset: 0.08, frontRake: 0.3, rearRake: 0.08, glassInset: 0.05 },
      hoodDrop: 0.16, trunkDrop: 0,
    },
    wheels: { radius: 0.54, width: 0.34, rearT: 0.11, rimStyle: 'chrome', rimColor: 0xe6eaee, tireProfile: 0.52 },
    drivetrain: 'rwd',
    engine: {
      kind: 'diesel', peakPowerKw: 336, peakTorqueNm: 1830, peakPowerRpm: 2100, peakTorqueRpm: 1200,
      redlineRpm: 2600, idleRpm: 580, gears: [7.4, 4.6, 3.2, 2.2, 1.5, 1.0, 0.75], finalDrive: 4.88, reverseRatio: 6.8,
      turbo: 0.68, shiftTime: 0.52,
    },
    handling: {
      tireGrip: 0.80, brakeTorque: 28500, handbrakeBias: 0.32, steerMaxDeg: 36, steerSpeed: 1.8,
      downforce: 0, dragCd: 0.88, frontalArea: 8.40, rollStiffness: 0.18,
      suspension: { travel: 0.22, stiffness: 138000, damping: 10000, restLength: 0.58 }, driftFactor: 0.16,
    },
    paint: { palette: [0xc1121f, 0xd8232f, 0xf2f4f6, 0xf0b323], metallic: 0.4, roughness: 0.3, twoTone: true, livery: 'fire' },
    features: { spoiler: 'none', lightbar: true, siren: 'fire', exhausts: 2, ladder: true, bullbar: true },
    lights: { headlightY: 1.22, headlightSpread: 0.86, taillightY: 1.14, taillightSpread: 0.9, style: 'quad' },
    sound: { engineType: 'diesel', basePitch: 0.4, rasp: 0.76, turboWhistle: 0.58, exhaustPop: 0.04 },
    price: 0, spawnWeight: 0.1, tags: ['ems'], durability: 2.4, maxOccupantsAI: 4,
  }),

  veh({
    id: 'lpd-patrol-bike', name: 'Torqvist Sentinel Patrol Bike', cls: 'emergency', seats: 1, doors: 0,
    length: 2.36, width: 0.92, height: 1.42, wheelbase: 1.62, track: 0.10, mass: 372,
    cogHeight: 0.52, weightBiasFront: 0.49, eff: 0.84,
    body: {
      kind: 'bike',
      sections: sec(0.92, 1.42, [[0, 0.52, 0.66, 0.42], [0.12, 0.68, 0.70, 0.38], [0.24, 0.74, 0.62, 0.30],
        [0.36, 0.84, 0.56, 0.24], [0.48, 1.00, 0.60, 0.20], [0.60, 0.90, 0.68, 0.24], [0.72, 0.72, 0.80, 0.30],
        [0.86, 0.58, 0.92, 0.36], [1, 0.40, 1.00, 0.44]]),
      cabin: { start: 0.34, end: 0.60, top: 0.94, inset: 0.02, frontRake: 0.48, rearRake: 0.24, glassInset: 0.01 },
      hoodDrop: 0, trunkDrop: 0,
    },
    wheels: { radius: 0.345, width: 0.2, rearT: 0.15, rimStyle: 'spoke', rimColor: 0xe8ebee, tireProfile: 0.5 },
    drivetrain: 'rwd',
    engine: {
      kind: 'twin', peakPowerKw: 85, peakTorqueNm: 130, peakPowerRpm: 7200, peakTorqueRpm: 5200,
      redlineRpm: 8400, idleRpm: 1050, gears: [2.92, 2.06, 1.62, 1.34, 1.12, 0.96], finalDrive: 2.62, reverseRatio: 0,
      turbo: 0, shiftTime: 0.12,
    },
    handling: {
      tireGrip: 1.14, brakeTorque: 5200, handbrakeBias: 0.88, steerMaxDeg: 34, steerSpeed: 4.6,
      downforce: 40, dragCd: 0.70, frontalArea: 0.92, rollStiffness: 0.8,
      suspension: { travel: 0.14, stiffness: 19000, damping: 1700, restLength: 0.32 }, driftFactor: 0.44,
    },
    paint: { palette: [0xf2f4f6, 0x0b1524, 0x1b3f7a], metallic: 0.36, roughness: 0.34, twoTone: true, livery: 'police' },
    features: { spoiler: 'none', lightbar: true, siren: 'police', exhausts: 2 },
    lights: { headlightY: 1.08, headlightSpread: 0.16, taillightY: 0.8, taillightSpread: 0.12, style: 'round' },
    sound: { engineType: 'bike', basePitch: 1.1, rasp: 0.78, turboWhistle: 0, exhaustPop: 0.4 },
    price: 0, spawnWeight: 0.3, tags: ['police'], durability: 0.7, maxOccupantsAI: 1,
  }),

  // ===== military ========================================================
  veh({
    id: 'praetor-warhauler-mtv', name: 'Praetor Warhauler MTV-7', cls: 'military', seats: 12, doors: 2,
    length: 7.62, width: 2.48, height: 3.18, wheelbase: 4.42, track: 2.06, mass: 9340,
    cogHeight: 0.90, weightBiasFront: 0.47, eff: 0.76,
    body: {
      kind: 'truck',
      sections: sec(2.48, 3.18, [[0, 0.94, 0.92, 0.32], [0.10, 0.99, 0.96, 0.30], [0.26, 1.00, 0.96, 0.30],
        [0.44, 1.00, 0.96, 0.30], [0.58, 0.99, 0.94, 0.30], [0.68, 0.97, 0.98, 0.30], [0.80, 0.96, 1.00, 0.30],
        [0.90, 0.94, 0.72, 0.32], [1, 0.86, 0.60, 0.36]]),
      cabin: { start: 0.66, end: 0.90, top: 3.08, inset: 0.10, frontRake: 0.28, rearRake: 0.08, glassInset: 0.05 },
      hoodDrop: 0.20, trunkDrop: 0,
    },
    wheels: { radius: 0.62, width: 0.42, rearT: 0.115, rimStyle: 'offroad', rimColor: 0x4a5040, tireProfile: 0.88 },
    drivetrain: 'awd',
    engine: {
      kind: 'diesel', peakPowerKw: 298, peakTorqueNm: 1560, peakPowerRpm: 2200, peakTorqueRpm: 1300,
      redlineRpm: 2700, idleRpm: 600, gears: [8.2, 5.4, 3.6, 2.4, 1.6, 1.0, 0.76], finalDrive: 5.12, reverseRatio: 7.4,
      turbo: 0.64, shiftTime: 0.5,
    },
    handling: {
      tireGrip: 0.82, brakeTorque: 26500, handbrakeBias: 0.36, steerMaxDeg: 36, steerSpeed: 1.8,
      downforce: 0, dragCd: 0.80, frontalArea: 7.90, rollStiffness: 0.2,
      suspension: { travel: 0.38, stiffness: 96000, damping: 8200, restLength: 0.70 }, driftFactor: 0.22,
    },
    offroadGrip: 0.93,
    paint: { palette: [0x4a5340, 0x6b6f4e, 0x39412f, 0x8a8562], metallic: 0.12, roughness: 0.74, matte: true, livery: 'military' },
    features: { spoiler: 'none', exhausts: 1, bullbar: true, snorkel: true, roofRack: true },
    lights: { headlightY: 1.28, headlightSpread: 0.7, taillightY: 1.16, taillightSpread: 0.74, style: 'round' },
    sound: { engineType: 'diesel', basePitch: 0.44, rasp: 0.82, turboWhistle: 0.56, exhaustPop: 0.04 },
    price: 0, spawnWeight: 0.06, tags: ['military'], durability: 2.25, maxOccupantsAI: 4,
  }),

  veh({
    id: 'ironhide-bastion-apc', name: 'Ironhide Bastion APC', cls: 'military', seats: 8, doors: 3,
    length: 6.94, width: 2.74, height: 2.62, wheelbase: 4.08, track: 2.30, mass: 13800,
    cogHeight: 0.86, weightBiasFront: 0.49, eff: 0.79,
    body: {
      kind: 'truck',
      sections: sec(2.74, 2.62, [[0, 0.86, 0.88, 0.28], [0.10, 0.96, 0.94, 0.26, 0.18], [0.24, 1.00, 0.98, 0.26, 0.22],
        [0.40, 1.00, 1.00, 0.26, 0.24], [0.56, 1.00, 0.98, 0.26, 0.24], [0.70, 0.98, 0.92, 0.26, 0.22],
        [0.82, 0.94, 0.80, 0.27, 0.20], [0.92, 0.88, 0.66, 0.28, 0.16], [1, 0.74, 0.54, 0.32, 0.12]]),
      cabin: { start: 0.58, end: 0.86, top: 2.40, inset: 0.16, frontRake: 0.62, rearRake: 0.4, glassInset: 0.07 },
      hoodDrop: 0.18, trunkDrop: 0,
    },
    wheels: { radius: 0.60, width: 0.44, rearT: 0.13, rimStyle: 'offroad', rimColor: 0x3c4234, tireProfile: 0.8 },
    drivetrain: 'awd',
    engine: {
      kind: 'diesel', peakPowerKw: 447, peakTorqueNm: 2050, peakPowerRpm: 2400, peakTorqueRpm: 1400,
      redlineRpm: 2900, idleRpm: 620, gears: [6.9, 4.3, 2.9, 1.9, 1.3, 1.0], finalDrive: 4.62, reverseRatio: 6.2,
      turbo: 0.74, shiftTime: 0.4,
    },
    handling: {
      tireGrip: 0.88, brakeTorque: 29000, handbrakeBias: 0.34, steerMaxDeg: 34, steerSpeed: 1.9,
      downforce: 0, dragCd: 0.84, frontalArea: 6.90, rollStiffness: 0.26,
      suspension: { travel: 0.30, stiffness: 155000, damping: 11500, restLength: 0.62 }, driftFactor: 0.18,
    },
    offroadGrip: 0.92,
    paint: { palette: [0x3f4738, 0x5a6047, 0x2e3327, 0x767a5e], metallic: 0.1, roughness: 0.8, matte: true, livery: 'military' },
    features: { spoiler: 'none', exhausts: 2, turret: true, bullbar: true, snorkel: true, rollcage: true },
    lights: { headlightY: 1.06, headlightSpread: 0.62, taillightY: 0.98, taillightSpread: 0.66, style: 'round' },
    sound: { engineType: 'diesel', basePitch: 0.36, rasp: 0.88, turboWhistle: 0.7, exhaustPop: 0.03 },
    price: 0, spawnWeight: 0.02, tags: ['military'], durability: 2.5, maxOccupantsAI: 4,
  }),

  // ===== utility =========================================================
  veh({
    id: 'sentinel-bullion-armored', name: 'Sentinel Bullion 4000 Armored Truck', cls: 'utility', seats: 3, doors: 4,
    length: 6.86, width: 2.40, height: 3.06, wheelbase: 4.28, track: 2.02, mass: 7850,
    cogHeight: 0.88, weightBiasFront: 0.48, eff: 0.76,
    body: {
      kind: 'truck',
      sections: sec(2.40, 3.06, [[0, 0.96, 0.96, 0.26], [0.10, 1.00, 1.00, 0.24], [0.28, 1.00, 1.00, 0.24],
        [0.48, 1.00, 1.00, 0.24], [0.64, 1.00, 0.99, 0.24], [0.74, 0.98, 0.96, 0.24], [0.84, 0.96, 0.88, 0.25],
        [0.93, 0.92, 0.66, 0.26], [1, 0.82, 0.54, 0.30]]),
      cabin: { start: 0.74, end: 0.97, top: 2.86, inset: 0.11, frontRake: 0.4, rearRake: 0.06, glassInset: 0.08 },
      hoodDrop: 0.10, trunkDrop: 0,
    },
    wheels: { radius: 0.47, width: 0.32, rearT: 0.105, rimStyle: 'steel', rimColor: 0x4c5158, tireProfile: 0.66 },
    drivetrain: 'rwd',
    engine: {
      kind: 'diesel', peakPowerKw: 231, peakTorqueNm: 1080, peakPowerRpm: 2600, peakTorqueRpm: 1500,
      redlineRpm: 3200, idleRpm: 620, gears: [5.9, 3.6, 2.4, 1.6, 1.1, 0.82], finalDrive: 4.44, reverseRatio: 5.4,
      turbo: 0.6, shiftTime: 0.42,
    },
    handling: {
      tireGrip: 0.84, brakeTorque: 25000, handbrakeBias: 0.34, steerMaxDeg: 34, steerSpeed: 1.9,
      downforce: 0, dragCd: 0.74, frontalArea: 6.60, rollStiffness: 0.2,
      suspension: { travel: 0.22, stiffness: 104000, damping: 8000, restLength: 0.52 }, driftFactor: 0.18,
    },
    paint: { palette: [0x9aa1a8, 0x2b3f5c, 0xd9dde1, 0x1f2327], metallic: 0.44, roughness: 0.4, twoTone: true },
    features: { spoiler: 'none', exhausts: 1, bullbar: true, lightbar: false },
    lights: { headlightY: 1.08, headlightSpread: 0.74, taillightY: 1.52, taillightSpread: 0.76, style: 'quad' },
    sound: { engineType: 'diesel', basePitch: 0.5, rasp: 0.72, turboWhistle: 0.54, exhaustPop: 0.04 },
    price: 0, spawnWeight: 0.14, tags: ['work'], durability: 2.3, maxOccupantsAI: 3,
  }),

  veh({
    id: 'bruckner-lineworker', name: 'Bruckner Lineworker Utility', cls: 'utility', seats: 3, doors: 4,
    length: 6.18, width: 2.14, height: 2.92, wheelbase: 3.84, track: 1.84, mass: 3980,
    cogHeight: 0.86, weightBiasFront: 0.55, eff: 0.79,
    body: {
      kind: 'truck',
      sections: sec(2.14, 2.92, [[0, 0.90, 0.62, 0.24], [0.10, 0.97, 0.66, 0.22], [0.24, 1.00, 0.86, 0.22],
        [0.38, 1.00, 0.88, 0.22], [0.50, 0.98, 0.70, 0.22], [0.62, 0.96, 0.94, 0.22], [0.74, 0.95, 0.96, 0.22],
        [0.86, 0.93, 0.72, 0.23], [0.94, 0.90, 0.62, 0.24], [1, 0.80, 0.52, 0.28]]),
      cabin: { start: 0.60, end: 0.88, top: 2.72, inset: 0.09, frontRake: 0.4, rearRake: 0.1, glassInset: 0.05 },
      hoodDrop: 0.12, trunkDrop: 0, bedStart: 0.08,
    },
    wheels: { radius: 0.43, width: 0.26, rearT: 0.11, rimStyle: 'steel', rimColor: 0xc6ccd2, tireProfile: 0.62 },
    drivetrain: 'rwd',
    engine: {
      kind: 'diesel', peakPowerKw: 168, peakTorqueNm: 610, peakPowerRpm: 3200, peakTorqueRpm: 1700,
      redlineRpm: 3900, idleRpm: 660, gears: [5.2, 3.1, 2.0, 1.4, 1.0, 0.78], finalDrive: 4.30, reverseRatio: 4.8,
      turbo: 0.58, shiftTime: 0.38,
    },
    handling: {
      tireGrip: 0.86, brakeTorque: 18000, handbrakeBias: 0.38, steerMaxDeg: 36, steerSpeed: 2.1,
      downforce: 0, dragCd: 0.62, frontalArea: 5.10, rollStiffness: 0.22,
      suspension: { travel: 0.24, stiffness: 68000, damping: 5600, restLength: 0.50 }, driftFactor: 0.2,
    },
    paint: { palette: [0xf0f2f4, 0xe0a92a, 0x2f6fb5, 0x8e949b], metallic: 0.2, roughness: 0.52, twoTone: true },
    features: { spoiler: 'none', exhausts: 1, ladder: true, lightbar: true, bullbar: true },
    lights: { headlightY: 1.02, headlightSpread: 0.72, taillightY: 0.96, taillightSpread: 0.74, style: 'round' },
    sound: { engineType: 'diesel', basePitch: 0.56, rasp: 0.64, turboWhistle: 0.48, exhaustPop: 0.04 },
    price: 0, spawnWeight: 0.35, tags: ['work'], durability: 1.7, maxOccupantsAI: 3,
  }),

  // ===== service =========================================================
  veh({
    id: 'civicworks-grubber', name: 'Civic Works Grubber Refuse Truck', cls: 'service', seats: 3, doors: 3,
    length: 9.36, width: 2.52, height: 3.46, wheelbase: 5.04, track: 2.08, mass: 14200,
    cogHeight: 0.90, weightBiasFront: 0.44, eff: 0.79,
    body: {
      kind: 'truck',
      sections: sec(2.52, 3.46, [[0, 0.92, 0.88, 0.26], [0.10, 0.98, 0.96, 0.24], [0.26, 1.00, 1.00, 0.24],
        [0.44, 1.00, 1.00, 0.24], [0.58, 1.00, 0.98, 0.24], [0.68, 0.98, 0.92, 0.24], [0.78, 0.96, 0.94, 0.24],
        [0.88, 0.95, 0.90, 0.25], [0.95, 0.92, 0.62, 0.27], [1, 0.84, 0.52, 0.31]]),
      cabin: { start: 0.76, end: 0.94, top: 3.24, inset: 0.08, frontRake: 0.3, rearRake: 0.08, glassInset: 0.05 },
      hoodDrop: 0.14, trunkDrop: 0,
    },
    wheels: { radius: 0.52, width: 0.33, rearT: 0.10, rimStyle: 'steel', rimColor: 0x6b7078, tireProfile: 0.58 },
    drivetrain: 'rwd',
    engine: {
      kind: 'diesel', peakPowerKw: 239, peakTorqueNm: 1420, peakPowerRpm: 2100, peakTorqueRpm: 1200,
      redlineRpm: 2600, idleRpm: 580, gears: [8.8, 5.6, 3.8, 2.6, 1.8, 1.2, 0.9], finalDrive: 5.29, reverseRatio: 8.0,
      turbo: 0.62, shiftTime: 0.6,
    },
    handling: {
      tireGrip: 0.76, brakeTorque: 27500, handbrakeBias: 0.3, steerMaxDeg: 36, steerSpeed: 1.7,
      downforce: 0, dragCd: 0.85, frontalArea: 8.30, rollStiffness: 0.16,
      suspension: { travel: 0.21, stiffness: 142000, damping: 10200, restLength: 0.55 }, driftFactor: 0.14,
    },
    paint: { palette: [0x2f7a4a, 0x9aa1a8, 0x3f4a52, 0xd9dde1], metallic: 0.22, roughness: 0.62, twoTone: true },
    features: { spoiler: 'none', exhausts: 1, lightbar: true, bullbar: true },
    lights: { headlightY: 1.16, headlightSpread: 0.82, taillightY: 1.02, taillightSpread: 0.84, style: 'round' },
    sound: { engineType: 'diesel', basePitch: 0.38, rasp: 0.84, turboWhistle: 0.5, exhaustPop: 0.03 },
    price: 0, spawnWeight: 0.3, tags: ['work'], durability: 2.25, maxOccupantsAI: 3,
  }),

  veh({
    id: 'sundae-cruiser', name: 'Sundae Cruiser Frozen Treats Van', cls: 'service', seats: 3, doors: 3,
    length: 5.34, width: 2.06, height: 2.58, wheelbase: 3.42, track: 1.74, mass: 2460,
    cogHeight: 0.84, weightBiasFront: 0.56, eff: 0.76,
    body: {
      kind: 'van',
      sections: sec(2.06, 2.58, [[0, 0.94, 0.90, 0.22], [0.10, 0.99, 0.96, 0.20], [0.26, 1.00, 1.00, 0.20],
        [0.44, 1.00, 1.00, 0.20], [0.60, 1.00, 1.00, 0.20], [0.72, 0.99, 0.98, 0.20], [0.82, 0.96, 0.90, 0.21],
        [0.92, 0.92, 0.68, 0.22], [1, 0.80, 0.52, 0.26]]),
      cabin: { start: 0.70, end: 0.96, top: 2.42, inset: 0.08, frontRake: 0.46, rearRake: 0.08, glassInset: 0.04 },
      hoodDrop: 0.08, trunkDrop: 0,
    },
    wheels: { radius: 0.35, width: 0.22, rearT: 0.12, rimStyle: 'steel', rimColor: 0xf0f2f4, tireProfile: 0.66 },
    drivetrain: 'fwd',
    engine: {
      kind: 'i4', peakPowerKw: 96, peakTorqueNm: 240, peakPowerRpm: 4800, peakTorqueRpm: 2400,
      redlineRpm: 5400, idleRpm: 780, gears: [3.73, 2.05, 1.32, 0.96, 0.76], finalDrive: 4.21, reverseRatio: 3.6,
      turbo: 0.3, shiftTime: 0.36,
    },
    handling: {
      tireGrip: 0.88, brakeTorque: 10400, handbrakeBias: 0.46, steerMaxDeg: 37, steerSpeed: 2.5,
      downforce: 0, dragCd: 0.48, frontalArea: 4.30, rollStiffness: 0.22,
      suspension: { travel: 0.22, stiffness: 39000, damping: 3000, restLength: 0.42 }, driftFactor: 0.26,
    },
    paint: { palette: [0xf7f2e6, 0xf06f8f, 0x6fd0c4, 0xf5d13a, 0x8ad02c], metallic: 0.16, roughness: 0.56, twoTone: true },
    features: { spoiler: 'none', exhausts: 1, roofRack: true, taxiSign: false },
    lights: { headlightY: 0.94, headlightSpread: 0.7, taillightY: 1.48, taillightSpread: 0.74, style: 'round' },
    sound: { engineType: 'i4', basePitch: 1.06, rasp: 0.34, turboWhistle: 0.24, exhaustPop: 0.06 },
    price: 24000, spawnWeight: 0.22, tags: ['work', 'civilian'], durability: 1.1, maxOccupantsAI: 2,
  }),

  veh({
    id: 'steadman-recovery-tow', name: 'Steadman Recovery Tow Truck', cls: 'service', seats: 3, doors: 2,
    length: 6.72, width: 2.28, height: 2.74, wheelbase: 4.06, track: 1.92, mass: 4720,
    cogHeight: 0.82, weightBiasFront: 0.54, eff: 0.76,
    body: {
      kind: 'truck',
      sections: sec(2.28, 2.74, [[0, 0.88, 0.60, 0.22], [0.12, 0.96, 0.64, 0.20], [0.26, 1.00, 0.66, 0.20],
        [0.40, 1.00, 0.68, 0.20], [0.52, 0.99, 0.92, 0.20], [0.64, 0.98, 1.00, 0.20], [0.76, 0.96, 0.98, 0.20],
        [0.86, 0.94, 0.74, 0.21], [0.94, 0.91, 0.64, 0.22], [1, 0.80, 0.54, 0.26]]),
      cabin: { start: 0.52, end: 0.82, top: 2.58, inset: 0.09, frontRake: 0.42, rearRake: 0.12, glassInset: 0.05 },
      hoodDrop: 0.12, trunkDrop: 0, bedStart: 0.06,
    },
    wheels: { radius: 0.44, width: 0.28, rearT: 0.115, rimStyle: 'steel', rimColor: 0xb0b7be, tireProfile: 0.6 },
    drivetrain: 'rwd',
    engine: {
      kind: 'diesel', peakPowerKw: 186, peakTorqueNm: 780, peakPowerRpm: 3000, peakTorqueRpm: 1600,
      redlineRpm: 3600, idleRpm: 640, gears: [6.2, 3.7, 2.4, 1.6, 1.1, 0.82], finalDrive: 4.56, reverseRatio: 5.6,
      turbo: 0.6, shiftTime: 0.4,
    },
    handling: {
      tireGrip: 0.84, brakeTorque: 20000, handbrakeBias: 0.4, steerMaxDeg: 35, steerSpeed: 2.0,
      downforce: 0, dragCd: 0.66, frontalArea: 5.40, rollStiffness: 0.22,
      suspension: { travel: 0.24, stiffness: 78000, damping: 6200, restLength: 0.50 }, driftFactor: 0.22,
    },
    paint: { palette: [0xe0762a, 0x1f2327, 0xf0f2f4, 0x2f6fb5], metallic: 0.3, roughness: 0.48, twoTone: true },
    features: { spoiler: 'none', exhausts: 1, lightbar: true, bullbar: true, plow: false },
    lights: { headlightY: 1.0, headlightSpread: 0.76, taillightY: 0.9, taillightSpread: 0.78, style: 'quad' },
    sound: { engineType: 'diesel', basePitch: 0.54, rasp: 0.7, turboWhistle: 0.52, exhaustPop: 0.05 },
    price: 42000, spawnWeight: 0.3, tags: ['work', 'civilian'], durability: 1.85, maxOccupantsAI: 3,
  }),

]);

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------

const BY_ID = new Map(VEHICLES.map((v) => [v.id, v]));
const BY_CLASS = new Map(VEHICLE_CLASSES.map((c) => [c, Object.freeze(VEHICLES.filter((v) => v.cls === c))]));

/** One vehicle definition by id, or undefined. */
export function getVehicle(id) {
  return BY_ID.get(id);
}

/** Every vehicle of a class (frozen, never null). */
export function vehiclesByClass(cls) {
  return BY_CLASS.get(cls) || EMPTY;
}
const EMPTY = Object.freeze([]);

/**
 * Pick a vehicle id with an RNG, weighted by spawnWeight.
 * filter: { classes?: string[], tags?: string[], maxPrice?: number, minPrice?: number }
 * Falls back to ignoring spawnWeight (then to the whole catalogue) rather than returning null
 * for a filter that only matches never-ambient vehicles.
 */
export function randomVehicleId(rng, filter = {}) {
  const { classes, tags, maxPrice, minPrice } = filter;
  const matches = [];
  for (const v of VEHICLES) {
    if (classes && classes.length && !classes.includes(v.cls)) continue;
    if (tags && tags.length && !tags.some((t) => v.tags.includes(t))) continue;
    if (maxPrice !== undefined && v.price > maxPrice) continue;
    if (minPrice !== undefined && v.price < minPrice) continue;
    matches.push(v);
  }
  if (!matches.length) return undefined;
  const spawnable = matches.filter((v) => v.spawnWeight > 0);
  const pool = spawnable.length ? spawnable : matches;
  if (!rng) return pool[0].id;
  const picked = spawnable.length ? rng.weighted(pool, (v) => v.spawnWeight) : pool[Math.floor(rng.float() * pool.length)];
  return (picked || pool[pool.length - 1]).id;
}

// ---------------------------------------------------------------------------
// Self-check
// ---------------------------------------------------------------------------

// Small-displacement classes are allowed below the 60 kW floor the contract quotes for cars:
// a 125 cc scooter or a rental go-kart cannot plausibly make 60 kW.
const SMALL_ENGINE_CLASSES = new Set(['motorcycle', 'kart', 'quad']);

// Every vehicle the design brief names explicitly, so a rename or deletion is caught here.
const REQUIRED_IDS = Object.freeze([
  'cragmont-dirt-kaiser', 'apex-micro-gk5', 'tanuki-scrub-450q', 'halcyon-regent-stretch',
  'civicworks-districtliner', 'metroliner-40', 'civicworks-grubber', 'ironvale-roadliner-900',
  'ironvale-churnmaster-8', 'steadman-recovery-tow', 'meridian-cab', 'sundae-cruiser',
  'sentinel-bullion-armored', 'praetor-warhauler-mtv', 'ems-ambulance', 'fd-pumper-9',
  'lpd-swat-van', 'lpd-patrol-bike', 'marlinco-riptide-38', 'tideline-skimmer-900',
]);

const num = (v) => typeof v === 'number' && Number.isFinite(v);
const inRange = (v, lo, hi) => num(v) && v >= lo && v <= hi;

/**
 * Run every consistency assertion over the catalogue.
 * Returns an array of human-readable problem strings — empty when the data is clean.
 */
/**
 * @param {object[]} [list] the catalogue to check; defaults to the real one.
 *   Passing a copy is how tools/verify-guards.mjs proves this function still
 *   objects when the data is wrong.
 */
export function validateVehicles(list = VEHICLES) {
  const VEHICLES = list;
  const BY_ID = new Map(list.map((v) => [v.id, v]));
  const vehiclesByClass = (cls) => list.filter((v) => v.cls === cls);
  const problems = [];
  const P = (msg) => problems.push(msg);
  const seen = new Set();

  if (VEHICLES.length < 50) P(`catalogue has ${VEHICLES.length} vehicles, need >= 50`);

  for (const cls of VEHICLE_CLASSES) {
    if (!VEHICLES.some((v) => v.cls === cls)) P(`class "${cls}" has no vehicles`);
  }
  for (const id of REQUIRED_IDS) {
    if (!BY_ID.has(id)) P(`required vehicle "${id}" is missing`);
  }

  const countTag = (t) => VEHICLES.filter((v) => v.tags.includes(t)).length;
  const emergency = VEHICLES.filter((v) => v.cls === 'emergency' || v.tags.includes('police') || v.tags.includes('ems')).length;
  if (emergency < 6) P(`only ${emergency} emergency/police variants, need >= 6`);
  if (vehiclesByClass('motorcycle').length < 4) P('need >= 4 motorcycles');
  if (vehiclesByClass('boat').length < 2) P('need >= 2 boats');
  if (vehiclesByClass('kart').length < 1) P('need a go-kart');
  if (vehiclesByClass('quad').length < 1) P('need a quad');
  if (countTag('work') < 6) P('need >= 6 work vehicles');
  if (!VEHICLES.some((v) => v.features.trailer && v.body.trailer)) P('no semi truck with a trailer');
  if (!VEHICLES.some((v) => v.features.cementMixer)) P('no cement mixer');
  if (!VEHICLES.some((v) => v.features.turret)) P('no turreted military vehicle');
  if (!VEHICLES.some((v) => v.paint.livery === 'taxi' && v.features.taxiSign)) P('no taxi');
  if (!VEHICLES.some((v) => v.paint.livery === 'ambulance' && v.features.siren === 'ems')) P('no ambulance');
  if (!VEHICLES.some((v) => v.paint.livery === 'fire' && v.features.ladder)) P('no fire truck');

  for (const v of VEHICLES) {
    const at = (m) => P(`${v.id}: ${m}`);

    // identity ------------------------------------------------------------
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(v.id)) at('id is not kebab-case');
    if (seen.has(v.id)) at('duplicate id'); else seen.add(v.id);
    if (typeof v.name !== 'string' || v.name.length < 3) at('missing name');
    if (!VEHICLE_CLASSES.includes(v.cls)) at(`unknown class "${v.cls}"`);
    if (!Number.isInteger(v.seats) || v.seats < 1 || v.seats > 60) at(`bad seats ${v.seats}`);
    if (!Number.isInteger(v.doors) || v.doors < 0 || v.doors > 6) at(`bad doors ${v.doors}`);
    if (!Number.isInteger(v.maxOccupantsAI) || v.maxOccupantsAI < 1 || v.maxOccupantsAI > v.seats) at('maxOccupantsAI out of range');

    // dimensions -----------------------------------------------------------
    if (!(v.length > 1 && v.length < 30)) at(`bad length ${v.length}`);
    if (!(v.width > 0.5 && v.width < 4)) at(`bad width ${v.width}`);
    if (!(v.height > 0.5 && v.height < 5)) at(`bad height ${v.height}`);
    if (!(v.wheelbase > 0.5 && v.wheelbase < v.length)) at('wheelbase must be < length');
    if (!(v.track > 0 && v.track < v.width)) at('track must be < width');
    if (!(v.mass > 50 && v.mass < 40000)) at(`bad mass ${v.mass}`);
    if (!inRange(v.cogHeight, 0.35, 0.9)) at(`cogHeight ${v.cogHeight} outside 0.35..0.9`);
    if (!inRange(v.weightBiasFront, 0.4, 0.62)) at(`weightBiasFront ${v.weightBiasFront} outside 0.40..0.62`);
    if (!inRange(v.durability, 0.5, 2.5)) at(`durability ${v.durability} outside 0.5..2.5`);

    // body -----------------------------------------------------------------
    const b = v.body;
    if (!BODY_KINDS.includes(b.kind)) at(`unknown body kind "${b.kind}"`);
    const s = b.sections;
    if (!Array.isArray(s) || s.length < 7 || s.length > 11) at(`sections length ${s && s.length} outside 7..11`);
    else {
      if (s[0].t !== 0) at(`first section t is ${s[0].t}, must be 0`);
      if (s[s.length - 1].t !== 1) at(`last section t is ${s[s.length - 1].t}, must be 1`);
      for (let i = 0; i < s.length; i++) {
        const c = s[i];
        if (i > 0 && !(c.t > s[i - 1].t)) at(`sections not sorted by t at index ${i}`);
        if (!inRange(c.t, 0, 1)) at(`section ${i} t out of 0..1`);
        if (!(c.hw > 0)) at(`section ${i} hw must be > 0`);
        if (c.hw > v.width / 2 + 1e-6) at(`section ${i} hw ${c.hw} exceeds half width ${v.width / 2}`);
        if (!(c.top > c.bottom)) at(`section ${i} top ${c.top} must exceed bottom ${c.bottom}`);
        if (c.top > v.height + 1e-6) at(`section ${i} top ${c.top} exceeds height ${v.height}`);
        if (c.bottom < 0) at(`section ${i} bottom below ground`);
        if (c.chamfer !== undefined && !inRange(c.chamfer, 0, 1)) at(`section ${i} chamfer out of 0..1`);
      }
    }
    const cab = b.cabin;
    if (!cab || !inRange(cab.start, 0, 1) || !inRange(cab.end, 0, 1) || !(cab.end > cab.start)) at('bad cabin t-range');
    else {
      if (!(cab.top > 0) || cab.top > v.height + 1e-6) at(`cabin top ${cab.top} outside 0..height`);
      if (!inRange(cab.inset, 0, v.width / 2)) at('cabin inset out of range');
      if (!inRange(cab.frontRake, 0, 1.6) || !inRange(cab.rearRake, 0, 1.6)) at('cabin rake out of 0..1.6 rad');
    }
    if (b.trailer && !(b.trailer.length > 2 && b.trailer.height > 1)) at('bad trailer dimensions');

    // wheels ---------------------------------------------------------------
    const w = v.wheels;
    if (!(w.radius > 0.05 && w.radius < 1.2)) at(`bad wheel radius ${w.radius}`);
    if (!(w.width > 0.05 && w.width < 0.9)) at(`bad wheel width ${w.width}`);
    if (!RIM_STYLES.includes(w.rimStyle)) at(`unknown rimStyle "${w.rimStyle}"`);
    if (!inRange(w.tireProfile, 0, 1)) at('tireProfile outside 0..1');
    if (!inRange(w.rearT, 0, 1) || !inRange(w.frontT, 0, 1)) at('axle t outside 0..1');
    if (!(w.frontT > w.rearT)) at('frontT must be ahead of rearT');
    const axleSpan = (w.frontT - w.rearT) * v.length;
    if (Math.abs(axleSpan - v.wheelbase) > v.wheelbase * 0.08) {
      at(`axle span ${axleSpan.toFixed(3)} m disagrees with wheelbase ${v.wheelbase} m (>8%)`);
    }

    // drivetrain -----------------------------------------------------------
    if (!DRIVETRAINS.includes(v.drivetrain)) at(`unknown drivetrain "${v.drivetrain}"`);
    const e = v.engine;
    if (!ENGINE_KINDS.includes(e.kind)) at(`unknown engine kind "${e.kind}"`);
    const powerFloor = SMALL_ENGINE_CLASSES.has(v.cls) ? 3 : 60;
    if (!inRange(e.peakPowerKw, powerFloor, 1200)) at(`peakPowerKw ${e.peakPowerKw} outside ${powerFloor}..1200`);
    if (!(e.peakTorqueNm > 5 && e.peakTorqueNm < 3000)) at(`bad peakTorqueNm ${e.peakTorqueNm}`);
    if (!(e.redlineRpm > 1500 && e.redlineRpm <= 20000)) at(`bad redlineRpm ${e.redlineRpm}`);
    if (!(e.idleRpm >= 0 && e.idleRpm < e.redlineRpm)) at('idleRpm must be below redline');
    if (e.kind !== 'electric' && !(e.peakPowerRpm > e.peakTorqueRpm)) at('peak power rpm must be above peak torque rpm');
    if (!(e.peakPowerRpm > 0 && e.peakPowerRpm <= e.redlineRpm * 1.05)) at('peakPowerRpm above redline');
    if (!Array.isArray(e.gears) || e.gears.length < 1 || e.gears.length > 10) at('gears must hold 1..10 ratios');
    else {
      for (let i = 0; i < e.gears.length; i++) {
        if (!(e.gears[i] > 0)) at(`gear ${i} ratio must be > 0`);
        if (i > 0 && !(e.gears[i] < e.gears[i - 1])) at(`gear ${i} is not shorter than gear ${i - 1}`);
      }
    }
    if (!(e.finalDrive > 0.5 && e.finalDrive < 8)) at(`bad finalDrive ${e.finalDrive}`);
    if (!(e.reverseRatio >= 0 && e.reverseRatio < 15)) at('bad reverseRatio');
    if (!inRange(e.turbo, 0, 1)) at('turbo outside 0..1');
    if (!inRange(e.shiftTime, 0, 1)) at('shiftTime outside 0..1');

    // handling -------------------------------------------------------------
    const h = v.handling;
    if (!inRange(h.tireGrip, 0.7, 1.5)) at(`tireGrip ${h.tireGrip} outside 0.7..1.5`);
    if (!inRange(h.brakeTorque, 4000, 30000)) at(`brakeTorque ${h.brakeTorque} outside 4000..30000`);
    if (!inRange(h.handbrakeBias, 0, 1)) at('handbrakeBias outside 0..1');
    if (!inRange(h.steerMaxDeg, 22, 45)) at(`steerMaxDeg ${h.steerMaxDeg} outside 22..45`);
    if (!(h.steerSpeed > 0.5 && h.steerSpeed < 10)) at(`bad steerSpeed ${h.steerSpeed}`);
    if (!(h.downforce >= 0 && h.downforce < 8000)) at('downforce out of range');
    if (!inRange(h.dragCd, 0.25, 0.9)) at(`dragCd ${h.dragCd} outside 0.25..0.9`);
    if (!(h.frontalArea > 0.3 && h.frontalArea < 12)) at(`bad frontalArea ${h.frontalArea}`);
    if (!inRange(h.rollStiffness, 0, 1)) at('rollStiffness outside 0..1');
    if (!inRange(h.driftFactor, 0, 1)) at('driftFactor outside 0..1');
    const sus = h.suspension;
    if (!sus || !(sus.travel > 0.02) || !(sus.stiffness > 5000) || !(sus.damping > 500) || !(sus.restLength > 0.05)) {
      at('bad suspension values');
    }
    if (!inRange(v.offroadGrip, 0, 1)) at('offroadGrip outside 0..1');

    // top speed vs. drag ---------------------------------------------------
    const ideal = dragLimitedSpeed(e.peakPowerKw, h.dragCd, h.frontalArea);
    const ratio = v.topSpeed / ideal;
    if (!(ratio >= 0.75 && ratio <= 1.25)) {
      at(`topSpeed ${v.topSpeed.toFixed(1)} m/s is ${(ratio * 100).toFixed(0)}% of the drag-limited ${ideal.toFixed(1)} m/s`);
    }
    if (!(v.topSpeed > 8 && v.topSpeed < 160)) at(`implausible topSpeed ${v.topSpeed}`);

    // presentation ---------------------------------------------------------
    const p = v.paint;
    if (!Array.isArray(p.palette) || p.palette.length < 3) at('paint palette needs >= 3 colours');
    else for (const c of p.palette) {
      if (!Number.isInteger(c) || c < 0 || c > 0xffffff) at(`palette colour ${c} is not a 24-bit integer`);
    }
    if (!inRange(p.metallic, 0, 1) || !inRange(p.roughness, 0, 1)) at('metallic/roughness outside 0..1');
    if (!LIVERIES.includes(p.livery)) at(`unknown livery "${p.livery}"`);

    const f = v.features;
    if (!f || typeof f !== 'object') at('missing features');
    else {
      if (f.spoiler !== undefined && !SPOILERS.includes(f.spoiler)) at(`unknown spoiler "${f.spoiler}"`);
      if (f.siren !== undefined && f.siren !== null && !['police', 'ems', 'fire'].includes(f.siren)) at('unknown siren type');
      if (f.exhausts !== undefined && !(Number.isInteger(f.exhausts) && f.exhausts >= 0 && f.exhausts <= 4)) at('bad exhaust count');
    }

    const li = v.lights;
    if (!(li.headlightY > 0 && li.headlightY <= v.height)) at('headlightY outside the body');
    if (!(li.taillightY > 0 && li.taillightY <= v.height)) at('taillightY outside the body');
    if (!inRange(li.headlightSpread, 0, 1) || !inRange(li.taillightSpread, 0, 1)) at('light spread outside 0..1');
    if (!LIGHT_STYLES.includes(li.style)) at(`unknown light style "${li.style}"`);

    const so = v.sound;
    if (!SOUND_TYPES.includes(so.engineType)) at(`unknown sound engineType "${so.engineType}"`);
    if (!(so.basePitch > 0.2 && so.basePitch < 3)) at(`bad basePitch ${so.basePitch}`);
    if (!inRange(so.rasp, 0, 1)) at('rasp outside 0..1');
    if (so.turboWhistle !== undefined && !inRange(so.turboWhistle, 0, 1)) at('turboWhistle outside 0..1');
    if (so.exhaustPop !== undefined && !inRange(so.exhaustPop, 0, 1)) at('exhaustPop outside 0..1');

    // economy --------------------------------------------------------------
    if (!(num(v.price) && v.price >= 0)) at('bad price');
    if (!(num(v.spawnWeight) && v.spawnWeight >= 0 && v.spawnWeight <= 5)) at('spawnWeight outside 0..5');
    if (!Array.isArray(v.tags) || !v.tags.length) at('needs at least one tag');
    else for (const t of v.tags) if (!VEHICLE_TAGS.includes(t)) at(`unknown tag "${t}"`);

    // consistency of intent ------------------------------------------------
    if (v.cls === 'emergency' && !v.tags.some((t) => t === 'police' || t === 'ems' || t === 'military')) {
      at('emergency class without a police/ems tag');
    }
    if (v.features.siren && !(v.tags.includes('police') || v.tags.includes('ems'))) at('siren on a civilian vehicle');
    if (v.price === 0 && v.spawnWeight === 0) at('neither purchasable nor spawnable');
  }

  return problems;
}

export default VEHICLES;
