// stuntCatalog.js — trick spots scattered across Leonida, and the tricks you can land on them.

export const STUNT_SPOTS = Object.freeze([
  { id: 'canal-megaramp', name: 'Canal Megaramp', kind: 'megaramp', x: -148, z: -60, yaw: 0,
    params: { width: 12, length: 52, height: 17, angleDeg: 34, boost: 1.25, landingAngle: 16 },
    color: 0xff2d95, accent: 0x22e3ff,
    challenge: { name: 'Cross the Canal', metric: 'distance', bronze: 34, silver: 50, gold: 66, reward: 4500 },
    hint: 'Hit it flat out in something with long gearing.' },
  { id: 'fairground-loop', name: 'Fairground Loop', kind: 'loop', x: 812, z: 214, yaw: 1.2,
    params: { radius: 12, width: 9, segments: 26 },
    color: 0xffc93c, accent: 0xff7a29,
    challenge: { name: 'Full Circle', metric: 'speed', bronze: 22, silver: 28, gold: 34, reward: 3800 },
    hint: 'Under 22 m/s and gravity wins.' },
  { id: 'pier-jumppad', name: 'Pier Launch', kind: 'jumppad', x: 1040, z: -180, yaw: -1.57,
    params: { width: 8, length: 14, height: 5.5, angleDeg: 30, boost: 1.5 },
    color: 0x22e3ff, accent: 0xffffff,
    challenge: { name: 'Sea Legs', metric: 'airtime', bronze: 1.9, silver: 2.7, gold: 3.4, reward: 3200 },
    hint: 'Land in the water and it still counts. Swimming home does not.' },
  { id: 'centro-rooftop-gap', name: 'Centro Rooftop Gap', kind: 'gap', x: 330, z: -210, y: 46, yaw: 0.4,
    params: { gapLength: 26, width: 10, height: 46, angleDeg: 12, landingAngle: 8 },
    color: 0xff2d95, accent: 0xffc93c,
    challenge: { name: 'Skyline Hop', metric: 'distance', bronze: 24, silver: 30, gold: 38, reward: 9000 },
    hint: 'Getting up there is half the trick.' },
  { id: 'skatepark-bowl', name: 'Cypress Bowl', kind: 'bowl', x: -560, z: 470, yaw: 0,
    params: { radius: 17, height: 4.4, segments: 22 },
    color: 0x4dff9e, accent: 0xffc93c,
    challenge: { name: 'Bowl Rider', metric: 'score', bronze: 2500, silver: 6000, gold: 12000, reward: 2800 },
    hint: 'Chain airs without touching the flat.' },
  { id: 'skatepark-halfpipe', name: 'Cypress Halfpipe', kind: 'halfpipe', x: -516, z: 506, yaw: 0.3,
    params: { width: 11, length: 30, radius: 7.5, segments: 16 },
    color: 0x8a5cff, accent: 0x22e3ff,
    challenge: { name: 'Wall to Wall', metric: 'flips', bronze: 1, silver: 3, gold: 5, reward: 2400 },
    hint: 'Bikes flip fastest.' },
  { id: 'garage-spiral', name: 'Meridian Spiral', kind: 'spiral', x: 190, z: 268, yaw: 0,
    params: { radius: 16, turns: 3, height: 22, width: 7, segments: 60 },
    color: 0xffc93c, accent: 0xffffff,
    challenge: { name: 'Corkscrew Descent', metric: 'speed', bronze: 14, silver: 19, gold: 25, reward: 3600 },
    hint: 'Down is easy. Up is the challenge.' },
  { id: 'docks-corkscrew', name: 'Port Corkscrew', kind: 'corkscrew', x: 604, z: -978, yaw: 2.1,
    params: { length: 34, width: 9, radius: 7, turns: 1, angleDeg: 8 },
    color: 0xff7a29, accent: 0xffc93c,
    challenge: { name: 'Barrel Roll', metric: 'spins', bronze: 1, silver: 2, gold: 3, reward: 5200 },
    hint: 'Commit. Lifting off mid-roll ends badly.' },
  { id: 'alley-wallride', name: 'Habana Wallride', kind: 'wallride', x: 546, z: 440, yaw: 0.9,
    params: { length: 28, height: 6, angleDeg: 68, width: 5 },
    color: 0xffc93c, accent: 0xff2d95,
    challenge: { name: 'Up the Wall', metric: 'airtime', bronze: 1.0, silver: 1.6, gold: 2.2, reward: 2100 },
    hint: 'Approach shallow or you just crash into a wall.' },
  { id: 'quarry-quarterpipe', name: 'Foundry Quarter', kind: 'quarterpipe', x: 128, z: -906, yaw: 1.9,
    params: { width: 16, radius: 9, height: 9, segments: 14 },
    color: 0xff7a29, accent: 0xffffff,
    challenge: { name: 'Vertical', metric: 'airtime', bronze: 1.6, silver: 2.4, gold: 3.2, reward: 3100 },
    hint: 'Straight up, straight down.' },
  { id: 'hills-hairpin-jump', name: 'Mirador Hairpin Jump', kind: 'ramp', x: -905, z: 120, yaw: 2.5,
    params: { width: 9, length: 22, height: 6.5, angleDeg: 28 },
    color: 0xffc93c, accent: 0x4dff9e,
    challenge: { name: 'Over the Bend', metric: 'distance', bronze: 26, silver: 38, gold: 50, reward: 4200 },
    hint: 'Cuts three corners if you land it.' },
  { id: 'mall-hoops', name: 'Vista Flame Hoops', kind: 'hoop', x: -694, z: -600, yaw: 0.6,
    params: { radius: 5.5, height: 7, tiers: 3, gapLength: 22 },
    color: 0xff7a29, accent: 0xff2d95,
    challenge: { name: 'Threading Fire', metric: 'score', bronze: 1500, silver: 4000, gold: 8000, reward: 3400 },
    hint: 'Three hoops, one run.' },
  { id: 'airport-runway-ramp', name: 'Runway 27 Ramp', kind: 'megaramp', x: -400, z: -1140, yaw: 0,
    params: { width: 14, length: 66, height: 22, angleDeg: 30, boost: 1.35, landingAngle: 14 },
    color: 0x22e3ff, accent: 0xffffff,
    challenge: { name: 'Cleared for Takeoff', metric: 'distance', bronze: 45, silver: 62, gold: 82, reward: 8000 },
    hint: 'The longest run-up in Leonida.' },
  { id: 'beach-dune-gap', name: 'Dune Gap', kind: 'gap', x: 985, z: 330, yaw: -0.4,
    params: { gapLength: 17, width: 12, height: 3.4, angleDeg: 20, landingAngle: 14 },
    color: 0xffc93c, accent: 0xd9c495,
    challenge: { name: 'Sand Blast', metric: 'distance', bronze: 15, silver: 22, gold: 30, reward: 1900 },
    hint: 'Offroaders only — sand eats supercars.' },
  { id: 'saintmercy-seesaw', name: 'Saint Mercy Seesaw', kind: 'seesaw', x: 452, z: 862, yaw: 1.1,
    params: { width: 6, length: 18, height: 2.4 },
    color: 0xff2d95, accent: 0xffc93c,
    challenge: { name: 'Tipping Point', metric: 'airtime', bronze: 0.9, silver: 1.4, gold: 2.0, reward: 1600 },
    hint: 'Heavier is better here.' },
  { id: 'marina-pipe', name: 'Marina Drain Pipe', kind: 'pipe', x: 904, z: -716, yaw: 0.2,
    params: { radius: 6.5, length: 42, segments: 20 },
    color: 0x22e3ff, accent: 0xffffff,
    challenge: { name: 'Full Pipe', metric: 'spins', bronze: 1, silver: 3, gold: 5, reward: 4400 },
    hint: 'Ride the wall, keep the throttle pinned.' },
  { id: 'industrial-stack-ramp', name: 'Stack Jump', kind: 'ramp', x: 206, z: -812, yaw: -1.0,
    params: { width: 8, length: 20, height: 7.5, angleDeg: 36 },
    color: 0xff7a29, accent: 0xffc93c,
    challenge: { name: 'Over the Stacks', metric: 'flips', bronze: 1, silver: 2, gold: 3, reward: 3900 },
    hint: 'Backflip territory.' },
  { id: 'oceanmile-taxi-jump', name: 'Ocean Mile Taxi Jump', kind: 'ramp', x: 806, z: -286, yaw: 1.57,
    params: { width: 10, length: 26, height: 8.5, angleDeg: 30 },
    color: 0xff2d95, accent: 0x22e3ff,
    challenge: { name: 'Neon Arc', metric: 'distance', bronze: 30, silver: 42, gold: 56, reward: 5000 },
    hint: 'Best at night, for the lights.' },
  { id: 'palmview-school-gap', name: 'Palmview School Gap', kind: 'gap', x: -186, z: -404, yaw: 0.8,
    params: { gapLength: 20, width: 9, height: 4.2, angleDeg: 22, landingAngle: 12 },
    color: 0x4dff9e, accent: 0xffffff,
    challenge: { name: 'Recess', metric: 'distance', bronze: 18, silver: 25, gold: 33, reward: 2200 },
    hint: 'Try not to be here at 3pm.' },
  { id: 'rustrow-dirt-double', name: 'Rust Row Double', kind: 'ramp', x: -1032, z: -790, yaw: 2.0,
    params: { width: 7, length: 16, height: 4.5, angleDeg: 32 },
    color: 0xff7a29, accent: 0x9c7a4e,
    challenge: { name: 'Double Up', metric: 'flips', bronze: 1, silver: 2, gold: 4, reward: 2600 },
    hint: 'Dirt bikes were made for this.' },
  { id: 'glades-pool-gap', name: 'Glades Pool Gap', kind: 'gap', x: -140, z: 690, yaw: -0.6,
    params: { gapLength: 15, width: 10, height: 3.0, angleDeg: 18, landingAngle: 10 },
    color: 0x22e3ff, accent: 0x4dff9e,
    challenge: { name: 'Cannonball', metric: 'distance', bronze: 13, silver: 19, gold: 26, reward: 1800 },
    hint: 'Clear the pool or take a swim.' },
  { id: 'centro-parking-drop', name: 'Centro Parking Drop', kind: 'megaramp', x: 396, z: -96, yaw: 3.0,
    params: { width: 11, length: 40, height: 26, angleDeg: 40, boost: 1.1, landingAngle: 22 },
    color: 0xffc93c, accent: 0xff2d95,
    challenge: { name: 'Six Storeys', metric: 'airtime', bronze: 2.4, silver: 3.2, gold: 4.2, reward: 7000 },
    hint: 'Steer on the way down.' },
  { id: 'port-crane-ramp', name: 'Crane Ramp', kind: 'ramp', x: 660, z: -1046, yaw: -2.2,
    params: { width: 9, length: 30, height: 12, angleDeg: 26 },
    color: 0xff7a29, accent: 0xffffff,
    challenge: { name: 'Containerised', metric: 'distance', bronze: 28, silver: 40, gold: 54, reward: 4800 },
    hint: 'Line it up with the container stacks.' },
  { id: 'park-bmx-quarter', name: 'Cypress Quarter', kind: 'quarterpipe', x: -604, z: 552, yaw: 1.4,
    params: { width: 12, radius: 6, height: 6, segments: 12 },
    color: 0x4dff9e, accent: 0x8a5cff,
    challenge: { name: 'Air Time', metric: 'airtime', bronze: 1.2, silver: 1.9, gold: 2.6, reward: 2000 },
    hint: 'Small, but it links into the bowl.' },
  { id: 'hills-cliff-launch', name: 'Mirador Cliff Launch', kind: 'megaramp', x: -1120, z: 200, yaw: 1.0,
    params: { width: 10, length: 44, height: 30, angleDeg: 28, boost: 1.2, landingAngle: 20 },
    color: 0xffc93c, accent: 0x4dff9e,
    challenge: { name: 'Off the Mountain', metric: 'airtime', bronze: 2.8, silver: 3.8, gold: 5.0, reward: 9500 },
    hint: 'The longest hang time on the map.' },
  { id: 'beach-boardwalk-rail', name: 'Boardwalk Wallride', kind: 'wallride', x: 1008, z: 120, yaw: -1.4,
    params: { length: 24, height: 5, angleDeg: 72, width: 4.5 },
    color: 0x22e3ff, accent: 0xffc93c,
    challenge: { name: 'Sidewalk Surfer', metric: 'airtime', bronze: 0.9, silver: 1.5, gold: 2.1, reward: 1700 },
    hint: 'Mind the tourists.' },
  { id: 'mall-roof-loop', name: 'Vista Roof Loop', kind: 'loop', x: -740, z: -520, y: 14, yaw: 0.2,
    params: { radius: 10, width: 8, segments: 24 },
    color: 0xff2d95, accent: 0x22e3ff,
    challenge: { name: 'Rooftop Roll', metric: 'speed', bronze: 20, silver: 26, gold: 32, reward: 6200 },
    hint: 'Get onto the roof first. The ramp is round the back.' },
  { id: 'foundry-bowl', name: 'Foundry Bowl', kind: 'bowl', x: 96, z: -948, yaw: 0,
    params: { radius: 14, height: 5.2, segments: 20 },
    color: 0xff7a29, accent: 0x9a8f7e,
    challenge: { name: 'Industrial Carve', metric: 'score', bronze: 2000, silver: 5000, gold: 10000, reward: 3000 },
    hint: 'Old cement silo base. Smooth as glass.' },
]);

export const TRICKS = Object.freeze([
  { id: 'frontflip', name: 'Front Flip', metric: 'flip', base: 800, per: 700, text: 'FRONT FLIP' },
  { id: 'backflip', name: 'Back Flip', metric: 'flip', base: 900, per: 800, text: 'BACKFLIP' },
  { id: 'doubleflip', name: 'Double Flip', metric: 'flip', base: 2400, per: 1400, text: 'DOUBLE FLIP' },
  { id: 'tripleflip', name: 'Triple Flip', metric: 'flip', base: 5200, per: 2200, text: 'TRIPLE FLIP!' },
  { id: 'spin180', name: '180', metric: 'spin', base: 220, per: 180, text: '180' },
  { id: 'spin360', name: '360', metric: 'spin', base: 620, per: 340, text: '360 SPIN' },
  { id: 'spin540', name: '540', metric: 'spin', base: 1200, per: 460, text: '540 SPIN' },
  { id: 'spin720', name: '720', metric: 'spin', base: 2100, per: 620, text: '720 SPIN' },
  { id: 'spin900', name: '900', metric: 'spin', base: 3600, per: 800, text: '900 SPIN!' },
  { id: 'roll', name: 'Barrel Roll', metric: 'roll', base: 1100, per: 900, text: 'BARREL ROLL' },
  { id: 'doubleroll', name: 'Double Roll', metric: 'roll', base: 3000, per: 1500, text: 'DOUBLE ROLL' },
  { id: 'air-small', name: 'Air', metric: 'air', base: 90, per: 130, text: 'AIR' },
  { id: 'air-big', name: 'Big Air', metric: 'air', base: 420, per: 320, text: 'BIG AIR' },
  { id: 'air-huge', name: 'Huge Air', metric: 'air', base: 1100, per: 620, text: 'HUGE AIR!' },
  { id: 'air-insane', name: 'Insane Air', metric: 'air', base: 2600, per: 1100, text: 'INSANE AIR!!' },
  { id: 'wheelie', name: 'Wheelie', metric: 'wheelie', base: 60, per: 140, text: 'WHEELIE' },
  { id: 'stoppie', name: 'Stoppie', metric: 'stoppie', base: 90, per: 190, text: 'STOPPIE' },
  { id: 'twowheel', name: 'Two Wheels', metric: 'twowheel', base: 110, per: 210, text: 'TWO WHEELS' },
  { id: 'drift', name: 'Drift', metric: 'drift', base: 50, per: 120, text: 'DRIFT' },
  { id: 'bigdrift', name: 'Big Drift', metric: 'drift', base: 340, per: 260, text: 'BIG DRIFT' },
  { id: 'nearmiss', name: 'Near Miss', metric: 'nearmiss', base: 140, per: 120, text: 'NEAR MISS' },
  { id: 'precision', name: 'Precision Landing', metric: 'air', base: 700, per: 0, text: 'PERFECT LANDING' },
  { id: 'combo', name: 'Combo', metric: 'air', base: 0, per: 0, text: 'COMBO' },
]);

const spotById = new Map(STUNT_SPOTS.map((s) => [s.id, s]));
export function getSpot(id) { return spotById.get(id); }
export function getTrick(id) { return TRICKS.find((t) => t.id === id); }

export function validateStunts() {
  const problems = [];
  const kinds = new Set(['ramp', 'megaramp', 'loop', 'halfpipe', 'quarterpipe', 'gap', 'corkscrew',
    'spiral', 'skatepark', 'wallride', 'seesaw', 'jumppad', 'hoop', 'bowl', 'pipe']);
  const seen = new Set();
  for (const s of STUNT_SPOTS) {
    if (seen.has(s.id)) problems.push(`duplicate spot ${s.id}`);
    seen.add(s.id);
    if (!kinds.has(s.kind)) problems.push(`${s.id}: unknown kind ${s.kind}`);
    if (s.x < -1500 || s.x > 1100 || s.z < -1500 || s.z > 1500) problems.push(`${s.id}: out of bounds`);
    if (s.params.radius !== undefined && (s.params.radius < 4 || s.params.radius > 20)) problems.push(`${s.id}: radius out of range`);
    if (s.params.angleDeg !== undefined && (s.params.angleDeg < 5 || s.params.angleDeg > 60)) problems.push(`${s.id}: ramp angle out of range`);
    if (s.params.gapLength !== undefined && (s.params.gapLength < 10 || s.params.gapLength > 60)) problems.push(`${s.id}: gap out of range`);
    if (s.challenge) {
      const c = s.challenge;
      if (!(c.bronze < c.silver && c.silver < c.gold)) problems.push(`${s.id}: challenge tiers not ascending`);
      if (!(c.reward > 0)) problems.push(`${s.id}: challenge reward must be positive`);
    }
  }
  const tseen = new Set();
  for (const t of TRICKS) {
    if (tseen.has(t.id)) problems.push(`duplicate trick ${t.id}`);
    tseen.add(t.id);
    if (t.base < 0 || t.per < 0) problems.push(`${t.id}: negative score`);
  }
  if (STUNT_SPOTS.length < 26) problems.push(`only ${STUNT_SPOTS.length} stunt spots`);
  if (TRICKS.length < 22) problems.push(`only ${TRICKS.length} tricks`);
  return problems;
}
