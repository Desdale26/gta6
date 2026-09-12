# Vice Coast: Leonida — Architecture & Module Contracts

A browser-native open-world action game. **No build step, no external assets, no network at
runtime.** Everything (geometry, textures, audio) is generated procedurally at load time.

- Renderer: Three.js r180 (vendored at `vendor/three/`), WebGL2.
- Modules: native ES modules, loaded through an import map in `index.html`.
- Import specifiers: `three` and `three/addons/...` resolve via the import map.

```
index.html          import map + boot
styles/game.css     HUD / menu styling
vendor/three/       vendored Three.js (build + addons)
src/
  core/     mathx rng events input settings save pool time
  engine/   renderer postfx  (owns WebGLRenderer + EffectComposer)
  render/   proctex materials sky weather particles decals lighting
  physics/  world vehiclePhysics character ragdoll
  world/    worldgen roads buildings props terrain interiors stunts streaming
  entities/ vehicle vehicleBody ped pedBody traffic pedestrians police animals
  combat/   weapons projectiles damage explosions
  gameplay/ game player camera economy shops robbery missions activities wanted radio
  audio/    audio synth musicgen engineSound
  ui/       hud minimap menu dialogs notifications
  content/  *.js — PURE DATA catalogs (no THREE imports, no side effects)
```

## The context object (`ctx`)

Every system receives one shared `ctx`. Systems never import each other's singletons.

```js
ctx = {
  THREE, renderer, scene, camera, composer,
  settings,      // core/settings.js Settings
  input,         // core/input.js Input
  bus,           // core/events.js EventBus
  rng,           // core/rng.js RNG (world seed stream)
  audio,         // audio/audio.js AudioSystem
  physics,       // physics/world.js PhysicsWorld
  world,         // world/worldgen.js World
  traffic, peds, police, particles, decals, weather, sky,
  player,        // gameplay/player.js Player
  cameraRig,     // gameplay/camera.js CameraRig
  hud, notify, dialogs, economy, shops, missions, activities, stunts, radio,
  game,          // gameplay/game.js Game
  time: { dt, elapsed, scale, hour /* 0..24 float */, day },
  dev: { enabled, stats },
}
```

System convention:

```js
export class Thing {
  constructor(ctx) { this.ctx = ctx; }
  async init() {}           // build meshes / buffers
  update(dt) {}             // dt already scaled + clamped (max 0.05)
  fixedUpdate(fdt) {}       // optional, 1/120 s steps, physics only
  dispose() {}
}
```

## Units & conventions

- Metres, kilograms, seconds. **+Y is up. -Z is north.** Vehicle forward is local **+Z**.
- Yaw is rotation about +Y; `0` faces +Z; increases counter-clockwise seen from above.
- Speeds internally in m/s; the HUD shows mph (`* 2.23694`).
- Colours are integers (`0xff8844`) unless a `THREE.Color` is explicitly required.
- The world spans roughly **x,z ∈ [-1600, 1600]**; ocean beyond `x > 1150`.

---

# Content catalog contracts (`src/content/*.js`)

These files are **pure data**: no imports except from `src/core/*`, no DOM, no THREE, no
side effects. Each exports a frozen array/record plus a lookup helper. They are consumed by
systems that build meshes and behaviour from them.

## `content/vehicleCatalog.js`

```js
export const VEHICLE_CLASSES = ['compact','sedan','coupe','sports','super','muscle','suv','pickup',
  'van','truck','bus','motorcycle','offroad','lowrider','service','emergency','military','utility',
  'exotic','classic','kart','quad','boat'];

export const VEHICLES = [ VehicleDef, ... ];   // >= 46 entries
export function getVehicle(id)                 // -> VehicleDef | undefined
export function vehiclesByClass(cls)           // -> VehicleDef[]
export function randomVehicleId(rng, filter)   // filter: {classes?:[], tags?:[], maxPrice?} -> id
```

```ts
VehicleDef = {
  id: string,                 // kebab-case unique
  name: string,               // in-world brand + model, clearly parody, never a real trademark
  cls: string,                // one of VEHICLE_CLASSES
  seats: number, doors: number,

  // --- dimensions, metres ---
  length: number, width: number, height: number,
  wheelbase: number,          // front axle to rear axle
  track: number,              // wheel centre to wheel centre across the car
  mass: number,               // kg, dry
  cogHeight: number,          // centre of gravity above ground, m (0.35..0.9)
  weightBiasFront: number,    // 0..1 static front weight fraction (0.40..0.62)

  // --- procedural body shape ---
  // `sections` sweep from tail (t=0) to nose (t=1). halfWidth/top/bottom are metres.
  body: {
    kind: 'car'|'suv'|'pickup'|'van'|'truck'|'bus'|'bike'|'kart'|'quad'|'boat',
    sections: [{ t:number, hw:number, top:number, bottom:number, chamfer?:number }],  // >= 6
    cabin: { start:number, end:number, top:number, inset:number,   // t-range of greenhouse
             frontRake:number, rearRake:number, glassInset?:number },
    hoodDrop?: number, trunkDrop?: number,
    bedStart?: number,          // pickups: t where the tray begins
    trailer?: { length:number, height:number } | null,
  },

  wheels: {
    radius: number, width: number,
    frontT: number, rearT: number,      // t positions of the axles (0..1)
    rimStyle: 'sport5'|'mesh'|'dish'|'spoke'|'steel'|'offroad'|'chrome'|'blade',
    rimColor?: number, tireProfile?: number, // 0=low profile .. 1=balloon
  },

  drivetrain: 'rwd'|'fwd'|'awd',
  engine: {
    kind: 'i4'|'i6'|'v6'|'v8'|'v10'|'v12'|'flat6'|'electric'|'diesel'|'rotary'|'single'|'twin',
    peakPowerKw: number,        // realistic: 60..1200
    peakTorqueNm: number,
    peakPowerRpm: number, peakTorqueRpm: number,
    redlineRpm: number, idleRpm: number,
    gears: number[],            // forward ratios, 1..10 entries
    finalDrive: number, reverseRatio: number,
    turbo?: number,             // 0..1 spool intensity
    shiftTime?: number,         // seconds, default 0.22
  },
  handling: {
    tireGrip: number,           // 0.7 (truck) .. 1.5 (super) — peak friction coefficient
    brakeTorque: number,        // Nm at the wheels, total (4000..30000)
    handbrakeBias: number,      // 0..1 rear lock strength
    steerMaxDeg: number,        // 22..45
    steerSpeed: number,         // rad/s of rack movement
    downforce: number,          // N at 30 m/s
    dragCd: number,             // 0.25..0.9
    frontalArea: number,        // m^2
    rollStiffness: number,      // 0..1
    suspension: { travel:number, stiffness:number, damping:number, restLength:number },
    driftFactor?: number,       // 0..1 how happy it is to slide
  },
  topSpeed: number,             // m/s, informational
  offroadGrip?: number,         // 0..1 multiplier on loose surfaces (default 0.55)

  paint: { palette:number[], metallic:number, roughness:number, twoTone?:boolean,
           matte?:boolean, livery?: 'none'|'taxi'|'police'|'racing'|'flame'|'stripe'|'checker'|'ambulance'|'fire'|'military' },
  features: {
    spoiler?: 'none'|'lip'|'wing'|'gtwing', lightbar?: boolean, siren?: 'police'|'ems'|'fire'|null,
    roofRack?: boolean, bullbar?: boolean, convertible?: boolean, taxiSign?: boolean,
    exhausts?: number, sunroof?: boolean, snorkel?: boolean, rollcage?: boolean, plow?: boolean,
    turret?: boolean, ladder?: boolean, cementMixer?: boolean, trailer?: boolean,
  },
  lights: { headlightY:number, headlightSpread:number, taillightY:number, taillightSpread:number,
            style?: 'round'|'strip'|'quad'|'pop' },
  sound: { engineType:'v8'|'v6'|'i4'|'v12'|'electric'|'diesel'|'bike'|'turbine',
           basePitch:number, rasp:number, turboWhistle?:number, exhaustPop?:number },
  price: number,                // 0 = not purchasable
  spawnWeight: number,          // 0 = never in ambient traffic
  tags: string[],               // 'civilian'|'police'|'ems'|'taxi'|'gang'|'exotic'|'offroad'|'work'|'stunt'|'military'
  durability: number,           // 0.5..2.5 damage resistance
  maxOccupantsAI?: number,
}
```

Requirements: at least **46** vehicles spanning every class; at least 6 police/emergency
variants; at least 4 motorcycles; 2 boats; monster truck; go-kart; quad; limo; school bus;
garbage truck; fire truck; ambulance; tank-ish military truck. Names must be invented parody
brands (e.g. "Pfister-style" is fine as an invented brand, but never use a real manufacturer
name). Physics numbers must be internally consistent: `topSpeed ≈ sqrt(2*peakPowerKw*1000 /
(1.225*dragCd*frontalArea))` within ±25 %.

## `content/weaponCatalog.js`

```js
export const WEAPONS = [ WeaponDef, ... ];  // >= 26
export function getWeapon(id)
export function weaponsBySlot(slot)
export const WEAPON_SLOTS = ['fists','melee','pistol','smg','shotgun','rifle','sniper','heavy','thrown','special'];
```

```ts
WeaponDef = {
  id, name, slot: string /* WEAPON_SLOTS entry */, order: number,
  damage: number,             // per bullet at point blank
  headshotMult: number, limbMult: number,
  fireRateRpm: number, auto: boolean, burst: number /* 0 = none */,
  pellets: number,
  spread: { hip:number, aim:number, moving:number, jump:number },  // degrees
  recoil: { vert:number, horiz:number, recovery:number, kick:number },
  magazine: number, reserveMax: number, reloadTime: number, reloadType:'mag'|'shell'|'none',
  muzzleVelocity: number,     // m/s (0 for hitscan/melee)
  range: number, falloffStart: number, falloffEnd: number, minDamageFrac: number,
  projectile: 'hitscan'|'bullet'|'rocket'|'grenade'|'molotov'|'melee'|'flame'|'taser'|'none',
  explosive: null | { radius:number, damage:number, force:number, fuse:number },
  penetration: number,        // 0..1 chance/energy to pass thin cover
  zoomFov: number,            // camera FOV while aiming (0 = no change), sniper uses scope
  scope: boolean, silenced: boolean, tracer: boolean, shell: boolean,
  melee: null | { arc:number, reach:number, swingTime:number, stagger:number },
  price: number, ammoPrice: number, ammoPerBuy: number,
  unlockLevel: number,
  model: {                     // parametric mesh spec built by combat/weaponModel.js
    kind: 'pistol'|'revolver'|'smg'|'shotgun'|'rifle'|'sniper'|'rocket'|'mg'|'bat'|'knife'|
          'grenade'|'molotov'|'flame'|'fists'|'taser'|'chainsaw'|'katana'|'crowbar'|'hammer'|'minigun',
    length:number, bodyColor:number, gripColor:number, accentColor:number,
    barrel?:number, stock?:boolean, mag?:boolean, scopeLen?:number, drum?:boolean, supp?:boolean,
  },
  sound: { type:'pistol'|'smg'|'shotgun'|'rifle'|'sniper'|'rocket'|'mg'|'melee'|'thrown'|'flame'|'taser',
           pitch:number, bass:number, tail:number },
  tags: string[],
}
```

Must include: fists, brass knuckles, knife, bat, crowbar, machete/katana, sledgehammer,
chainsaw, pistol, combat pistol, revolver, .50 pistol, machine pistol, micro SMG, SMG,
assault SMG, pump shotgun, sawn-off, combat shotgun, carbine rifle, assault rifle, bullpup,
sniper rifle, heavy sniper, LMG, minigun, RPG, grenade launcher, grenades, molotovs, sticky
bombs, pipe bombs, flamethrower, taser, flare gun.

## `content/pedCatalog.js`

```js
export const PED_ARCHETYPES = [ PedDef, ... ];   // >= 30
export const FIRST_NAMES, LAST_NAMES;            // string[]
export function getPed(id)
export function randomPedId(rng, districtStyle, hour)
```

```ts
PedDef = {
  id, name, weight: number,
  sex: 'm'|'f'|'x',
  height: [min,max],            // metres, 1.45..2.05
  build: [min,max],             // 0.8 thin .. 1.35 heavy
  palette: { skin:number[], hair:number[], top:number[], bottom:number[], shoes:number[], accent:number[] },
  outfit: 'casual'|'suit'|'beach'|'tourist'|'worker'|'jogger'|'biker'|'gang'|'cop'|'medic'|'fire'|
          'chef'|'nurse'|'security'|'punk'|'skater'|'elder'|'rich'|'homeless'|'lifeguard'|'dealer'|'military',
  props: string[],              // 'phone','bag','umbrella','skateboard','coffee','briefcase','dog','camera','surfboard','cane'
  speed: { walk:number, jog:number, run:number },   // m/s, walk 0.9..1.6
  stats: { bravery:number, aggression:number, wealth:number, fitness:number, awareness:number }, // 0..1
  armed: null | { weaponId:string, chance:number },
  health: number,
  schedule: [{ from:number, to:number, act:'home'|'work'|'shop'|'beach'|'gym'|'bar'|'park'|'wander'|'commute' }],
  barks: { greet:string[], panic:string[], angry:string[], hurt:string[], idle:string[] },
  gang: null | string,
  districts: string[],           // district *styles* they appear in; [] = anywhere
  hours: [number, number],       // spawn window, may wrap midnight
}
```

Barks must be PG-13. Include cops, paramedics, firefighters, gang members, tourists, joggers,
beach-goers, business people, construction workers, skaters, bikers, elders, street vendors.

## `content/districtCatalog.js`

```js
export const DISTRICTS = [ DistrictDef, ... ];   // 12..16
export function districtAt(x, z)                 // -> DistrictDef (nearest by weighted distance)
export const DISTRICT_STYLES = [...]
```

```ts
DistrictDef = {
  id, name, style: 'downtown'|'beach'|'suburb'|'industrial'|'docks'|'airport'|'hills'|
                   'oldtown'|'strip'|'trailer'|'mall'|'marina'|'financial'|'barrio'|'swamp'|'park',
  center: [x, z], radius: number, influence: number,   // influence weights the Voronoi blend
  heightRange: [min, max],       // building height metres
  density: number,               // 0..1 lot fill rate
  blockSize: [min, max],         // metres between arterial roads
  roadWidth: number, sidewalkWidth: number,
  palette: { wall:number[], roof:number[], accent:number[], neon:number[], ground:number },
  facade: ('glass'|'office'|'apartment'|'brick'|'stucco'|'warehouse'|'shopfront'|'artdeco'|'concrete')[],
  props: { palms:number, streetlights:number, billboards:number, benches:number, trees:number,
           hydrants:number, bins:number, parkedCars:number, powerlines:number, neon:number },
  trafficDensity: number, pedDensity: number,          // 0..1
  pedMix: [{ id:string, w:number }],
  vehicleMix: [{ cls:string, w:number }],
  crime: number, policePresence: number,               // 0..1
  waterfront: boolean, elevation: number,              // base ground height, metres
  shopTypes: [{ type:string, w:number }],
  radio: string,                 // default station id
}
```

## `content/shopCatalog.js`

```js
export const SHOP_TYPES = [ ShopTypeDef, ... ];   // >= 14
export function getShopType(type)
export const SHOP_NAME_PARTS  // { prefix:[], core:[], suffix:[] } for procedural signage
```

```ts
ShopTypeDef = {
  type, label, signWords: string[],   // used to build sign text
  signColor: number, neonColor: number, awningColor: number,
  footprint: [w, d], height: number,
  inventory: [{ id:string, label:string, kind:'weapon'|'ammo'|'health'|'armor'|'food'|'clothing'|'upgrade'|'service',
                price:number, value?:number, weaponId?:string, amount?:number }],
  robbery: {
    possible: boolean,
    tillCash: [min, max], safeCash: [min, max],
    grabTime: number,          // seconds to empty the till
    safeTime: number,
    alarmChance: number,       // 0..1 clerk triggers silent alarm
    clerkArmed: number,        // 0..1
    guards: number,
    wanted: number,            // stars gained when the alarm goes off
    panicRadius: number,
    payoutMultiplier: number,
  },
  hours: [open, close],
  interiorStyle: 'small'|'medium'|'large'|'vault'|'openair',
  shelves: number, tills: number,
  restockHours: number,
}
```

Types: convenience, liquor, gunstore, jewelry, bank, pharmacy, clothing, electronics, pawn,
gasstation, diner, barber, tattoo, casino, autoshop, supermarket.

## `content/missionCatalog.js`

```js
export const MISSIONS = [ MissionDef, ... ];      // >= 24, of which >= 10 story
export function getMission(id)
export function availableMissions(completedSet, stats)
```

```ts
MissionDef = {
  id, name, giver: string, type: 'story'|'side'|'race'|'rampage'|'heist'|'delivery'|'taxi'|
        'stunt'|'assassination'|'chase'|'collect'|'survival'|'escort',
  tier: number, requires: string[],  // mission ids
  reward: number, rewardRep: number,
  blurb: string, briefing: string[],  // lines of dialogue shown at start
  start: { x:number, z:number, marker:string, radius:number },
  vehicleHint?: string,               // vehicle id spawned for the mission
  objectives: ObjectiveDef[],
  fail: { onDeath:boolean, onWanted?:number, timeLimit?:number, onVehicleDestroyed?:boolean,
          onTargetEscaped?:boolean, onCivilianDeaths?:number },
  music?: string, wantedOnStart?: number, wantedOnEnd?: number,
}

ObjectiveDef = {
  kind: 'goto'|'kill'|'killAll'|'steal'|'deliver'|'survive'|'race'|'destroy'|'rob'|
        'escape'|'protect'|'collect'|'wait'|'photo'|'chase'|'stunt'|'losewanted',
  text: string,                   // HUD objective line
  x?: number, z?: number, radius?: number,
  count?: number, seconds?: number,
  targetPed?: string, targetVehicle?: string, shopId?: string,
  checkpoints?: [[x,z], ...],     // for races
  inVehicle?: boolean, weapon?: string,
  marker?: 'goto'|'kill'|'pickup'|'dropoff'|'checkpoint',
}
```

## `content/radioCatalog.js`

```js
export const STATIONS = [ StationDef, ... ];      // >= 8
export function getStation(id)
```

```ts
StationDef = {
  id, name, tagline, genre, color: number, djName: string,
  tracks: [{
    title: string, artist: string,
    bpm: number, bars: number, swing: number,     // 0..0.3
    key: number,                                   // 0..11 semitone offset from C
    scale: 'minor'|'major'|'dorian'|'phrygian'|'mixolydian'|'harmonicMinor'|'pentatonic'|'blues',
    progression: number[],                         // scale degrees per bar, e.g. [0,5,3,4]
    drums: { kick:number[], snare:number[], hat:number[], open?:number[], clap?:number[],
             tom?:number[], ride?:number[] },      // 16 steps per bar, values 0..1 velocity
    bass: { wave:'saw'|'square'|'sine'|'triangle'|'fm', octave:number, pattern:number[], cutoff:number, glide?:number },
    lead: { wave:string, octave:number, pattern:(number|null)[], cutoff:number, delay:number, on:boolean },
    pad:  { wave:string, octave:number, cutoff:number, on:boolean, attack:number, release:number },
    arp?: { wave:string, octave:number, rate:number, on:boolean },
    energy: number,                                 // 0..1 mix loudness / filter openness
  }],
  idents: string[],       // DJ one-liners between tracks
  ads: [{ brand:string, line:string }],
}
```

Genres to cover: synthwave, latin/reggaeton-ish, hip-hop, rock, electronic/house,
talk radio, classic soul, metal, ambient/chill. All music is generated by
`audio/musicgen.js` from these definitions.

## `content/stuntCatalog.js`

```js
export const STUNT_SPOTS = [ StuntSpotDef, ... ];   // >= 22
export const TRICKS = [ TrickDef, ... ];
export function getSpot(id)
```

```ts
StuntSpotDef = {
  id, name, kind: 'ramp'|'megaramp'|'loop'|'halfpipe'|'quarterpipe'|'gap'|'corkscrew'|
                  'spiral'|'skatepark'|'wallride'|'seesaw'|'jumppad'|'hoop'|'bowl'|'pipe',
  x:number, z:number, y?:number, yaw:number,
  params: { width?:number, length?:number, height?:number, angleDeg?:number, radius?:number,
            turns?:number, gapLength?:number, landingAngle?:number, segments?:number,
            boost?:number, tiers?:number },
  color?: number, accent?: number,
  challenge: null | { name:string, metric:'distance'|'airtime'|'flips'|'spins'|'score'|'speed',
                      bronze:number, silver:number, gold:number, reward:number },
  hint: string,
}

TrickDef = { id, name, metric:'flip'|'spin'|'roll'|'air'|'wheelie'|'stoppie'|'drift'|'nearmiss'|'twowheel',
             base:number, per:number, text:string }
```

## Delegated implementation modules

### `render/proctex.js`

```js
export function initProcTex(THREE, opts)      // must be called once before tex()
export function tex(name, opts = {})          // -> THREE.CanvasTexture (cached by name+opts)
export function texSet(name, opts = {})       // -> { map, normalMap, roughnessMap } (normal/rough may be null)
export function signTexture(text, opts)       // -> THREE.CanvasTexture with rendered sign text
export function gradientTexture(stops, opts)  // stops: [[t, '#rrggbb'], ...]
export function noiseTexture(opts)
export function clearTexCache()
export const TEX_NAMES = [...]                // every supported `name`
```

`opts` always accepts `{ size=512, repeat=1, color, color2, seed=0, roughness, anisotropy=8,
srgb=true }`. Textures must be seamless/tileable, use `THREE.RepeatWrapping`, set
`colorSpace = THREE.SRGBColorSpace` for albedo only, and be generated with an
`OffscreenCanvas` when available (falling back to `document.createElement('canvas')`).
Generation for the whole set must stay under ~350 ms on a mid laptop: prefer 256–512 px.

Required `TEX_NAMES`: `asphalt, asphaltCracked, concrete, sidewalk, kerb, brick, stucco,
glassFacade, officeFacade, apartmentFacade, warehouseWall, shopFront, artdeco, metalPanel,
corrugated, rustMetal, chrome, sand, grass, dirt, gravel, mud, water, waterNormal, marble,
woodPlank, woodOld, tile, roofShingle, roofTar, roadLineWhite, roadLineYellow, crosswalk,
manhole, graffiti, neon, billboard, carPaintFlake, carbonFibre, leather, denim, cloth, skin,
hair, palmBark, palmFrond, foliage, hedge, cloud, star, smoke, spark, bulletHole, bloodSplat,
tireMark, scorch, glassCrack, rain, ripple, lightFalloff, muzzleFlash, moon, sunFlare, dashboard,
licensePlate, tarp, canvasAwning, fence, chainlink, solarPanel, ac, vent, pipe, trash`

### `audio/synth.js`

```js
export const SFX_NAMES = [...]
export function renderSfx(audioCtx, name, opts = {}) // -> AudioBuffer, synthesised offline
export async function buildSfxBank(audioCtx, names)  // -> Map<string, AudioBuffer>
export function sfxVariants(name)                    // -> number of pitch variants to pre-render
```

No samples: build every buffer numerically (noise bursts, filtered impulses, FM, karplus-strong).
Required names include: `gunPistol, gunSmg, gunShotgun, gunRifle, gunSniper, gunMg, gunSilenced,
rocketLaunch, explosion, explosionBig, grenadeBounce, bulletWhiz, ricochet, impactMetal,
impactConcrete, impactGlass, impactFlesh, impactWood, impactWater, shellDrop, reload, reloadShotgun,
dryFire, weaponSwitch, punch, swing, knifeStab, bodyFall, glassBreak, carCrashLight, carCrashHeavy,
tireScreech, tireBlow, carDoorOpen, carDoorClose, carHorn, carHornTruck, sirenWail, sirenYelp,
sirenAir, alarmShop, alarmCar, footstepConcrete, footstepGrass, footstepSand, footstepWater,
jumpGrunt, landThud, splash, swim, rainLoop, thunder, wind, seagull, dogBark, crowdMurmur,
cashRegister, pickupCash, pickupHealth, pickupArmor, pickupWeapon, uiClick, uiHover, uiConfirm,
uiCancel, uiWanted, missionPass, missionFail, checkpoint, comboUp, phoneRing, radioStatic,
helicopterLoop, boatEngine, skidLoop, fireLoop, gasLeak, elevatorDing, clockTick, cameraShutter`

### `audio/musicgen.js`

```js
export class MusicPlayer {
  constructor(audioCtx, destinationNode)
  setStation(stationDef)        // picks a track and starts scheduling
  play() / stop() / next() / prev()
  setVolume(v)                  // 0..1
  update(nowSeconds)            // call each frame; schedules ~0.4 s ahead
  get nowPlaying()              // { title, artist, station, dj, progress }
}
```

Real-time scheduled synthesis only (OscillatorNode/BiquadFilter/GainNode). It must never
allocate more than ~64 live nodes, must clean up finished nodes, and must survive
`audioCtx.state === 'suspended'`.

### `world/buildings.js`

```js
export function initBuildings(THREE, deps)  // deps: { tex, texSet, materials, rng }
export function buildBuilding(spec, rng)    // -> { group: THREE.Group, colliders: [...], lights: [...] }
export function buildingFootprintFor(spec)  // -> { w, d } cheap, no meshes
export const BUILDING_KINDS = [...]
```

```ts
spec = { kind:'tower'|'office'|'apartment'|'shophouse'|'warehouse'|'house'|'villa'|'motel'|
                'artdeco'|'hotel'|'mall'|'parking'|'church'|'stadium'|'trailer'|'shack'|'hangar'|'silo',
         w:number, d:number, h:number, floors:number,
         palette:{ wall:number, roof:number, accent:number, neon:number },
         facade:string, seed:number, district:string,
         shopFront?: { type:string, name:string, signColor:number },
         lod:0|1|2 }
```

Returned `colliders` are `{ type:'box', x,y,z, hw,hh,hd, yaw }` in **local** space (the caller
positions the group). `lights` are `{ x,y,z, color, intensity, distance, kind:'neon'|'window'|'sign' }`
— the caller decides how many to instantiate. Geometry must be merged per material
(`BufferGeometryUtils.mergeGeometries`) so one building is at most ~6 draw calls.

### `world/props.js`

```js
export function initProps(THREE, deps)
export function makeProp(kind, opts, rng)   // -> { group, colliders, lights, breakable }
export const PROP_KINDS = [...]
export function propInstancer(kind, count)  // -> THREE.InstancedMesh factory for cheap repeats
```

Required kinds: `streetlight, trafficLight, palm, tree, bush, hedge, bench, bin, hydrant,
postbox, phonebox, busStop, signStop, signSpeed, signDirection, billboard, neonSign, awning,
barrier, cone, planter, fence, chainlink, dumpster, pallet, crate, barrel, ac, vent, antenna,
watertower, powerpole, parkingMeter, atm, newsstand, umbrella, deckchair, surfRack, lifeguard,
buoy, bollard, statue, fountain, playground, basketballHoop, trashbag, cardboard, tyreStack,
sandbag, jetty, boatDock, crane, container, forklift, scaffolding, roadwork, manhole, grate,
flagpole, clock, kiosk, foodcart, tables, parasol, streetart, ramp`

`breakable` is `null` or `{ hp:number, debris:'wood'|'metal'|'glass'|'plastic'|'concrete' }`.

---

# Rules for every file

1. **No `Math.random()`** anywhere in world generation — take an `RNG` instance.
2. **No external network calls, no asset files.** Everything procedural.
3. Prefer `const`, arrow functions, and early returns. No TypeScript syntax — plain JS.
4. Every file must parse as an ES module under Node 22 with no side effects on import
   (except pure data catalogs, which may freeze their exports).
5. Keep per-frame allocation near zero in `update()` — reuse scratch vectors declared at
   module scope.
6. Guard every optional dependency (`ctx.audio?.play?.(...)`).
7. Public functions get a one-line comment saying what they do when it is not obvious.
