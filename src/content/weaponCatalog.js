// weaponCatalog.js — pure data: every weapon in Vice Coast: Leonida.
//
// No imports, no side effects, no THREE, no DOM. Consumed by combat/weapons.js
// (ballistics + ammo), combat/weaponModel.js (parametric mesh from `model`),
// audio/synth.js (via `sound.type`) and gameplay/shops.js (price/unlockLevel).
//
// Conventions:
//   damage        per bullet/pellet at point blank, before headshot/limb multipliers
//   spread/recoil degrees; recoil.recovery is "degrees per second returned to centre"
//   reloadTime    seconds for a whole reload when reloadType==='mag',
//                 seconds PER SHELL when reloadType==='shell'
//   magazine      rounds in the gun; for thrown weapons it is the max carried count
//   range         hard cull distance (m); damage lerps from 1 to minDamageFrac
//                 between falloffStart and falloffEnd
//   muzzleVelocity 0 means hitscan or melee; anything else is a simulated projectile
//
// Every brand, model and codename here is invented parody. Any resemblance to a real
// firearm, manufacturer or trademark is coincidental and unintended.

export const WEAPON_SLOTS = Object.freeze([
  'fists', 'melee', 'pistol', 'smg', 'shotgun', 'rifle', 'sniper', 'heavy', 'thrown', 'special',
]);

export const PROJECTILE_KINDS = Object.freeze([
  'hitscan', 'bullet', 'rocket', 'grenade', 'molotov', 'melee', 'flame', 'taser', 'none',
]);

export const MODEL_KINDS = Object.freeze([
  'pistol', 'revolver', 'smg', 'shotgun', 'rifle', 'sniper', 'rocket', 'mg', 'bat', 'knife',
  'grenade', 'molotov', 'flame', 'fists', 'taser', 'chainsaw', 'katana', 'crowbar', 'hammer', 'minigun',
]);

export const SOUND_KINDS = Object.freeze([
  'pistol', 'smg', 'shotgun', 'rifle', 'sniper', 'rocket', 'mg', 'melee', 'thrown', 'flame', 'taser',
]);

// Fills the optional half of the contract so every WeaponDef is shape-complete,
// then deep-freezes it. Entries below only spell out what actually matters for them.
const mk = (o) => Object.freeze({
  headshotMult: 2.0,
  limbMult: 0.75,
  auto: false,
  burst: 0,
  pellets: 1,
  magazine: 0,
  reserveMax: 0,
  reloadTime: 0,
  reloadType: 'none',
  muzzleVelocity: 0,
  homing: 0,
  minDamageFrac: 0.35,
  penetration: 0,
  zoomFov: 0,
  scope: false,
  silenced: false,
  tracer: false,
  shell: false,
  ammoPrice: 0,
  ammoPerBuy: 0,
  unlockLevel: 0,
  desc: '',
  ...o,
  spread: Object.freeze({ ...o.spread }),
  recoil: Object.freeze({ ...o.recoil }),
  model: Object.freeze({ ...o.model }),
  sound: Object.freeze({ ...o.sound }),
  explosive: o.explosive ? Object.freeze({ ...o.explosive }) : null,
  melee: o.melee ? Object.freeze({ ...o.melee }) : null,
  tags: Object.freeze([...(o.tags || [])]),
});

// ---------------------------------------------------------------------------
// FISTS
// ---------------------------------------------------------------------------
const FISTS = [
  mk({
    id: 'fists', name: 'Fists', slot: 'fists', order: 0,
    desc: 'Free, always loaded, and deeply unimpressive against body armour.',
    damage: 9, headshotMult: 1.6, limbMult: 0.85,
    fireRateRpm: 170, pellets: 1,
    spread: { hip: 0, aim: 0, moving: 0, jump: 0 },
    recoil: { vert: 0, horiz: 0, recovery: 1, kick: 0.05 },
    range: 1.15, falloffStart: 0.95, falloffEnd: 1.15, minDamageFrac: 0.8,
    projectile: 'melee',
    melee: { arc: 62, reach: 1.15, swingTime: 0.34, stagger: 0.18 },
    price: 0,
    model: { kind: 'fists', length: 0.24, bodyColor: 0xd9a07a, gripColor: 0xb3764f, accentColor: 0xffffff },
    sound: { type: 'melee', pitch: 1.15, bass: 0.35, tail: 0.08 },
    tags: ['starter', 'silent', 'nonlethal-ish'],
  }),
];

// ---------------------------------------------------------------------------
// MELEE — magazine 0, projectile 'melee', populated `melee` block
// ---------------------------------------------------------------------------
const MELEE = [
  mk({
    id: 'brass-knuckles', name: 'Marsh & Coyle Knuckledusters', slot: 'melee', order: 0,
    desc: 'Cast brass, engraved LEONIDA on the strike face. Doubles what a bare fist does.',
    damage: 19, headshotMult: 1.9, limbMult: 0.8,
    fireRateRpm: 188,
    spread: { hip: 0, aim: 0, moving: 0, jump: 0 },
    recoil: { vert: 0, horiz: 0, recovery: 1, kick: 0.1 },
    range: 1.2, falloffStart: 1.0, falloffEnd: 1.2, minDamageFrac: 0.85,
    projectile: 'melee',
    melee: { arc: 55, reach: 1.2, swingTime: 0.32, stagger: 0.34 },
    price: 150, unlockLevel: 1,
    model: { kind: 'fists', length: 0.2, bodyColor: 0xc9a227, gripColor: 0x8a6f1c, accentColor: 0xffe27a },
    sound: { type: 'melee', pitch: 1.05, bass: 0.5, tail: 0.1 },
    tags: ['silent', 'concealable', 'street'],
  }),
  mk({
    id: 'combat-knife', name: 'Palmetto Ridgeback Knife', slot: 'melee', order: 1,
    desc: 'Short, fast and quiet. Rewards getting behind someone instead of in front of them.',
    damage: 27, headshotMult: 2.6, limbMult: 0.7,
    fireRateRpm: 200,
    spread: { hip: 0, aim: 0, moving: 0, jump: 0 },
    recoil: { vert: 0, horiz: 0, recovery: 1, kick: 0.06 },
    range: 1.35, falloffStart: 1.15, falloffEnd: 1.35, minDamageFrac: 0.9,
    projectile: 'melee',
    melee: { arc: 38, reach: 1.35, swingTime: 0.3, stagger: 0.22 },
    price: 250, unlockLevel: 2,
    model: { kind: 'knife', length: 0.29, bodyColor: 0xb9c0c6, gripColor: 0x2a2d31, accentColor: 0x6f7b84 },
    sound: { type: 'melee', pitch: 1.35, bass: 0.18, tail: 0.06 },
    tags: ['silent', 'concealable', 'stealth'],
  }),
  mk({
    id: 'nightstick', name: 'Precinct 9 Nightstick', slot: 'melee', order: 2,
    desc: 'Standard Vice Coast PD side-handle baton. Bruises more than it bleeds.',
    damage: 21, headshotMult: 2.1, limbMult: 0.85,
    fireRateRpm: 150,
    spread: { hip: 0, aim: 0, moving: 0, jump: 0 },
    recoil: { vert: 0, horiz: 0, recovery: 1, kick: 0.12 },
    range: 1.5, falloffStart: 1.25, falloffEnd: 1.5, minDamageFrac: 0.85,
    projectile: 'melee',
    melee: { arc: 72, reach: 1.5, swingTime: 0.4, stagger: 0.62 },
    price: 200, unlockLevel: 1,
    model: { kind: 'bat', length: 0.62, bodyColor: 0x1d1f23, gripColor: 0x35383d, accentColor: 0x8f9499 },
    sound: { type: 'melee', pitch: 1.0, bass: 0.42, tail: 0.12 },
    tags: ['silent', 'police', 'stagger'],
  }),
  mk({
    id: 'baseball-bat', name: 'Sandlot Slugger Ash Bat', slot: 'melee', order: 3,
    desc: 'Thirty-four inches of kiln-dried ash. Nobody in Leonida owns one for baseball.',
    damage: 31, headshotMult: 2.3, limbMult: 0.8,
    fireRateRpm: 115,
    spread: { hip: 0, aim: 0, moving: 0, jump: 0 },
    recoil: { vert: 0, horiz: 0, recovery: 1, kick: 0.2 },
    range: 1.8, falloffStart: 1.5, falloffEnd: 1.8, minDamageFrac: 0.8,
    projectile: 'melee',
    melee: { arc: 92, reach: 1.8, swingTime: 0.52, stagger: 0.78 },
    price: 180,
    model: { kind: 'bat', length: 0.86, bodyColor: 0xc8a06a, gripColor: 0x53381f, accentColor: 0xe4c795 },
    sound: { type: 'melee', pitch: 0.88, bass: 0.6, tail: 0.16 },
    tags: ['silent', 'street', 'knockback'],
  }),
  mk({
    id: 'golf-club', name: 'Coral Links Driver', slot: 'melee', order: 4,
    desc: 'Borrowed from a country club in Emerald Hills and never returned.',
    damage: 26, headshotMult: 2.4, limbMult: 0.72,
    fireRateRpm: 136,
    spread: { hip: 0, aim: 0, moving: 0, jump: 0 },
    recoil: { vert: 0, horiz: 0, recovery: 1, kick: 0.14 },
    range: 1.95, falloffStart: 1.6, falloffEnd: 1.95, minDamageFrac: 0.75,
    projectile: 'melee',
    melee: { arc: 104, reach: 1.95, swingTime: 0.44, stagger: 0.5 },
    price: 220,
    model: { kind: 'bat', length: 1.12, bodyColor: 0x30343a, gripColor: 0x14161a, accentColor: 0xd8dde2 },
    sound: { type: 'melee', pitch: 1.2, bass: 0.3, tail: 0.13 },
    tags: ['silent', 'rich', 'wide-arc'],
  }),
  mk({
    id: 'crowbar', name: 'Dockside 24in Pry Bar', slot: 'melee', order: 5,
    desc: 'Hardened steel. Opens shipping containers, car doors and arguments.',
    damage: 34, headshotMult: 2.2, limbMult: 0.82,
    fireRateRpm: 109,
    spread: { hip: 0, aim: 0, moving: 0, jump: 0 },
    recoil: { vert: 0, horiz: 0, recovery: 1, kick: 0.18 },
    range: 1.6, falloffStart: 1.35, falloffEnd: 1.6, minDamageFrac: 0.85,
    projectile: 'melee',
    melee: { arc: 80, reach: 1.6, swingTime: 0.55, stagger: 0.72 },
    price: 190,
    model: { kind: 'crowbar', length: 0.66, bodyColor: 0x8e2f22, gripColor: 0x5a1d14, accentColor: 0xb9bcc0 },
    sound: { type: 'melee', pitch: 0.95, bass: 0.55, tail: 0.2 },
    tags: ['silent', 'work', 'pry'],
  }),
  mk({
    id: 'machete', name: 'Sawgrass Cane Machete', slot: 'melee', order: 6,
    desc: 'Eighteen inches of carbon steel off a Glades sugar crew. Cuts deep, swings wide.',
    damage: 42, headshotMult: 2.4, limbMult: 0.68,
    fireRateRpm: 130,
    spread: { hip: 0, aim: 0, moving: 0, jump: 0 },
    recoil: { vert: 0, horiz: 0, recovery: 1, kick: 0.11 },
    range: 1.65, falloffStart: 1.4, falloffEnd: 1.65, minDamageFrac: 0.88,
    projectile: 'melee',
    melee: { arc: 76, reach: 1.65, swingTime: 0.46, stagger: 0.4 },
    price: 420, unlockLevel: 4,
    model: { kind: 'knife', length: 0.58, bodyColor: 0x9aa2a8, gripColor: 0x3b2a1c, accentColor: 0xcfd6db },
    sound: { type: 'melee', pitch: 1.25, bass: 0.24, tail: 0.11 },
    tags: ['silent', 'gang', 'bleed'],
  }),
  mk({
    id: 'katana', name: 'Sunset Boulevard Katana', slot: 'melee', order: 7,
    desc: 'Display piece from a Neon Mile collector shop. Turns out it was never a replica.',
    damage: 48, headshotMult: 2.8, limbMult: 0.66,
    fireRateRpm: 143,
    spread: { hip: 0, aim: 0, moving: 0, jump: 0 },
    recoil: { vert: 0, horiz: 0, recovery: 1, kick: 0.09 },
    range: 2.0, falloffStart: 1.7, falloffEnd: 2.0, minDamageFrac: 0.9,
    projectile: 'melee',
    melee: { arc: 124, reach: 2.0, swingTime: 0.42, stagger: 0.46 },
    price: 1900, unlockLevel: 11,
    model: { kind: 'katana', length: 1.02, bodyColor: 0xd6dde3, gripColor: 0x1a1c20, accentColor: 0xb5122e },
    sound: { type: 'melee', pitch: 1.45, bass: 0.16, tail: 0.22 },
    tags: ['silent', 'exotic', 'bleed', 'wide-arc'],
  }),
  mk({
    id: 'sledgehammer', name: 'Ironpine 12lb Sledge', slot: 'melee', order: 8,
    desc: 'Slow enough to dodge, heavy enough that it only has to land once.',
    damage: 62, headshotMult: 2.0, limbMult: 0.88,
    fireRateRpm: 75,
    spread: { hip: 0, aim: 0, moving: 0, jump: 0 },
    recoil: { vert: 0, horiz: 0, recovery: 1, kick: 0.3 },
    range: 1.95, falloffStart: 1.6, falloffEnd: 1.95, minDamageFrac: 0.8,
    projectile: 'melee',
    melee: { arc: 110, reach: 1.95, swingTime: 0.8, stagger: 1.0 },
    price: 650, unlockLevel: 6,
    model: { kind: 'hammer', length: 0.92, bodyColor: 0x4a4d52, gripColor: 0x6b4a2a, accentColor: 0x2b2d31 },
    sound: { type: 'melee', pitch: 0.72, bass: 0.85, tail: 0.3 },
    tags: ['silent', 'work', 'knockback', 'breaches-props'],
  }),
  mk({
    id: 'chainsaw', name: 'Everglade Timberfang 20"', slot: 'melee', order: 9,
    desc: 'Two-stroke, permanently idling, audible from two blocks away. Subtlety is not the pitch.',
    damage: 21, headshotMult: 1.8, limbMult: 0.95,
    fireRateRpm: 375,
    spread: { hip: 0, aim: 0, moving: 0, jump: 0 },
    recoil: { vert: 0, horiz: 0, recovery: 1, kick: 0.4 },
    range: 1.5, falloffStart: 1.3, falloffEnd: 1.5, minDamageFrac: 0.95,
    projectile: 'melee',
    melee: { arc: 44, reach: 1.5, swingTime: 0.16, stagger: 0.38 },
    price: 2400, unlockLevel: 14,
    model: { kind: 'chainsaw', length: 0.78, bodyColor: 0xe06018, gripColor: 0x1c1e22, accentColor: 0xbfc5ca },
    sound: { type: 'melee', pitch: 0.6, bass: 0.7, tail: 0.45 },
    tags: ['loud', 'continuous', 'terrify', 'work'],
  }),
  mk({
    id: 'pipe-wrench', name: 'Ironvale Persuader', slot: 'melee', order: 10,
    desc: 'Eight pounds of drop-forged argument. Slow enough to dodge, heavy enough that it only has to land once.',
    damage: 78, headshotMult: 1.9, limbMult: 0.66,
    fireRateRpm: 42,
    spread: { hip: 0, aim: 0, moving: 0, jump: 0 },
    recoil: { vert: 0, horiz: 0, recovery: 1, kick: 0.32 },
    range: 2.1, falloffStart: 1.8, falloffEnd: 2.1, minDamageFrac: 0.8,
    projectile: 'melee',
    melee: { arc: 82, reach: 2.1, swingTime: 0.86, stagger: 1.4 },
    price: 480,
    model: { kind: 'hammer', length: 0.92, bodyColor: 0x4a4e54, gripColor: 0x2e2114, accentColor: 0x8b9096 },
    sound: { type: 'melee', pitch: 0.72, bass: 0.9, tail: 0.2 },
    tags: ['heavy', 'stagger', 'tool'],
  }),
  mk({
    id: 'hedge-trimmer', name: 'Cypress Widowmaker', slot: 'melee', order: 11,
    desc: 'Bought for mangroves, kept for other reasons. Idles like a wasp in a jar.',
    damage: 18, headshotMult: 1.6, limbMult: 0.9,
    fireRateRpm: 340, auto: true,
    spread: { hip: 0, aim: 0, moving: 0, jump: 0 },
    recoil: { vert: 0, horiz: 0, recovery: 1, kick: 0.12 },
    range: 1.75, falloffStart: 1.5, falloffEnd: 1.75, minDamageFrac: 0.9,
    projectile: 'melee',
    melee: { arc: 66, reach: 1.75, swingTime: 0.15, stagger: 0.9 },
    price: 2400, unlockLevel: 9,
    model: { kind: 'chainsaw', length: 0.72, bodyColor: 0xc8641c, gripColor: 0x1d1f22, accentColor: 0xb9bec4 },
    sound: { type: 'melee', pitch: 1.5, bass: 0.5, tail: 0.7 },
    tags: ['brutal', 'loud', 'tool'],
  }),
  mk({
    id: 'fire-axe', name: 'Station 9 Axe', slot: 'melee', order: 12,
    desc: 'Break glass in case of emergency. Someone did, and then kept walking.',
    damage: 62, headshotMult: 2.0, limbMult: 0.7,
    fireRateRpm: 68,
    spread: { hip: 0, aim: 0, moving: 0, jump: 0 },
    recoil: { vert: 0, horiz: 0, recovery: 1, kick: 0.26 },
    range: 2.0, falloffStart: 1.7, falloffEnd: 2.0, minDamageFrac: 0.8,
    projectile: 'melee',
    melee: { arc: 90, reach: 2.0, swingTime: 0.62, stagger: 1.1 },
    price: 360,
    model: { kind: 'hammer', length: 0.88, bodyColor: 0xb4342a, gripColor: 0x2a1d12, accentColor: 0xc9ced4 },
    sound: { type: 'melee', pitch: 0.86, bass: 0.72, tail: 0.24 },
    tags: ['heavy', 'stagger', 'tool'],
  }),
  mk({
    id: 'tyre-iron', name: 'Roadside Companion', slot: 'melee', order: 13,
    desc: 'Every boot in Leonida has one. Almost none of them have ever changed a tyre.',
    damage: 31, headshotMult: 2.3, limbMult: 0.78,
    fireRateRpm: 132,
    spread: { hip: 0, aim: 0, moving: 0, jump: 0 },
    recoil: { vert: 0, horiz: 0, recovery: 1, kick: 0.15 },
    range: 1.7, falloffStart: 1.5, falloffEnd: 1.7, minDamageFrac: 0.85,
    projectile: 'melee',
    melee: { arc: 98, reach: 1.7, swingTime: 0.4, stagger: 0.55 },
    price: 90,
    model: { kind: 'crowbar', length: 0.6, bodyColor: 0x55595f, gripColor: 0x34383d, accentColor: 0x7d838a },
    sound: { type: 'melee', pitch: 1.18, bass: 0.4, tail: 0.16 },
    tags: ['quick', 'cheap', 'tool'],
  }),
  mk({
    id: 'pool-cue', name: 'Rack \u0027Em Special', slot: 'melee', order: 14,
    desc: 'Maple, tapered, and now slightly bent. The felt never forgave anyone.',
    damage: 24, headshotMult: 2.5, limbMult: 0.8,
    fireRateRpm: 150,
    spread: { hip: 0, aim: 0, moving: 0, jump: 0 },
    recoil: { vert: 0, horiz: 0, recovery: 1, kick: 0.1 },
    range: 2.15, falloffStart: 1.9, falloffEnd: 2.15, minDamageFrac: 0.8,
    projectile: 'melee',
    melee: { arc: 108, reach: 2.15, swingTime: 0.38, stagger: 0.45 },
    price: 60,
    model: { kind: 'bat', length: 1.42, bodyColor: 0xd8b57a, gripColor: 0x2b2420, accentColor: 0x8d6a3c },
    sound: { type: 'melee', pitch: 1.3, bass: 0.3, tail: 0.14 },
    tags: ['quick', 'reach', 'cheap'],
  }),
];

// ---------------------------------------------------------------------------
// PISTOLS
// ---------------------------------------------------------------------------
const PISTOLS = [
  mk({
    id: 'pistol-9', name: 'Vectra P9 Tidewater', slot: 'pistol', order: 0,
    desc: 'The polymer 9mm every pawn shop on Alcazar Row has three of. Honest, boring, reliable.',
    damage: 26, headshotMult: 2.4, limbMult: 0.72,
    fireRateRpm: 330,
    spread: { hip: 2.4, aim: 0.55, moving: 3.8, jump: 7.2 },
    recoil: { vert: 1.15, horiz: 0.4, recovery: 7.5, kick: 0.35 },
    magazine: 12, reserveMax: 120, reloadTime: 1.9, reloadType: 'mag',
    range: 85, falloffStart: 22, falloffEnd: 55, minDamageFrac: 0.42,
    projectile: 'hitscan', penetration: 0.12,
    zoomFov: 56, tracer: false, shell: true,
    price: 700, ammoPrice: 60, ammoPerBuy: 24, unlockLevel: 0,
    model: { kind: 'pistol', length: 0.19, bodyColor: 0x2c2f34, gripColor: 0x1a1c20, accentColor: 0x71787f, barrel: 0.11, mag: true },
    sound: { type: 'pistol', pitch: 1.0, bass: 0.42, tail: 0.28 },
    tags: ['starter', 'sidearm', 'concealable'],
  }),
  mk({
    id: 'pistol-9-supp', name: 'Vectra P9 Nightjar', slot: 'pistol', order: 1,
    desc: 'Same frame, threaded barrel, a can the length of the slide. Costs you velocity and buys you quiet.',
    damage: 24, headshotMult: 2.5, limbMult: 0.7,
    fireRateRpm: 300,
    spread: { hip: 2.0, aim: 0.4, moving: 3.2, jump: 6.4 },
    recoil: { vert: 0.85, horiz: 0.28, recovery: 8.4, kick: 0.26 },
    magazine: 12, reserveMax: 96, reloadTime: 2.1, reloadType: 'mag',
    range: 70, falloffStart: 18, falloffEnd: 46, minDamageFrac: 0.4,
    projectile: 'hitscan', penetration: 0.08,
    zoomFov: 54, silenced: true, shell: true,
    price: 1650, ammoPrice: 95, ammoPerBuy: 24, unlockLevel: 5,
    model: { kind: 'pistol', length: 0.31, bodyColor: 0x23262a, gripColor: 0x15171a, accentColor: 0x4e555b, barrel: 0.1, mag: true, supp: true },
    sound: { type: 'pistol', pitch: 0.78, bass: 0.2, tail: 0.1 },
    tags: ['sidearm', 'stealth', 'silent', 'concealable'],
  }),
  mk({
    id: 'combat-pistol', name: 'Ardent CP-40 Marshal', slot: 'pistol', order: 2,
    desc: 'Duty-issue .40 with a match trigger. Fifteen rounds and a very flat recoil curve.',
    damage: 30, headshotMult: 2.4, limbMult: 0.74,
    fireRateRpm: 360,
    spread: { hip: 2.0, aim: 0.42, moving: 3.1, jump: 6.6 },
    recoil: { vert: 1.3, horiz: 0.36, recovery: 8.0, kick: 0.4 },
    magazine: 15, reserveMax: 150, reloadTime: 2.0, reloadType: 'mag',
    range: 95, falloffStart: 26, falloffEnd: 62, minDamageFrac: 0.45,
    projectile: 'hitscan', penetration: 0.2,
    zoomFov: 54, shell: true,
    price: 2400, ammoPrice: 85, ammoPerBuy: 30, unlockLevel: 3,
    model: { kind: 'pistol', length: 0.21, bodyColor: 0x3a3f45, gripColor: 0x202327, accentColor: 0x9aa2a9, barrel: 0.12, mag: true },
    sound: { type: 'pistol', pitch: 0.94, bass: 0.5, tail: 0.32 },
    tags: ['sidearm', 'police', 'accurate'],
  }),
  mk({
    id: 'heavy-revolver', name: 'Bronco .44 Longshot', slot: 'pistol', order: 3,
    desc: 'Six rounds of magnum with a seven-inch barrel. Hits like a rifle, climbs like a rocket, reloads like a chore.',
    damage: 78, headshotMult: 2.6, limbMult: 0.8,
    fireRateRpm: 90,
    spread: { hip: 3.6, aim: 0.35, moving: 6.2, jump: 11.0 },
    recoil: { vert: 5.2, horiz: 1.6, recovery: 3.2, kick: 1.45 },
    magazine: 6, reserveMax: 60, reloadTime: 3.1, reloadType: 'mag',
    range: 120, falloffStart: 38, falloffEnd: 85, minDamageFrac: 0.55,
    projectile: 'hitscan', penetration: 0.42,
    zoomFov: 50, shell: false,
    price: 5200, ammoPrice: 180, ammoPerBuy: 18, unlockLevel: 9,
    model: { kind: 'revolver', length: 0.32, bodyColor: 0x5c6168, gripColor: 0x4a3323, accentColor: 0xd2d7dc, barrel: 0.18, drum: true },
    sound: { type: 'pistol', pitch: 0.62, bass: 0.92, tail: 0.62 },
    tags: ['sidearm', 'hand-cannon', 'armor-piercing', 'loud'],
  }),
  mk({
    id: 'pistol-50', name: 'Deacon Fifty Sovereign', slot: 'pistol', order: 4,
    desc: 'A gold-accented .50 built to be photographed. Seven rounds, and your wrist knows about all of them.',
    damage: 64, headshotMult: 2.5, limbMult: 0.82,
    fireRateRpm: 150,
    spread: { hip: 3.2, aim: 0.5, moving: 5.6, jump: 10.2 },
    recoil: { vert: 4.1, horiz: 1.25, recovery: 4.0, kick: 1.15 },
    magazine: 7, reserveMax: 70, reloadTime: 2.4, reloadType: 'mag',
    range: 105, falloffStart: 30, falloffEnd: 70, minDamageFrac: 0.5,
    projectile: 'hitscan', penetration: 0.5,
    zoomFov: 52, shell: true,
    price: 7800, ammoPrice: 240, ammoPerBuy: 21, unlockLevel: 13,
    model: { kind: 'pistol', length: 0.27, bodyColor: 0x2a2c30, gripColor: 0x17181b, accentColor: 0xd4af37, barrel: 0.16, mag: true },
    sound: { type: 'pistol', pitch: 0.58, bass: 0.98, tail: 0.55 },
    tags: ['sidearm', 'hand-cannon', 'armor-piercing', 'flashy'],
  }),
  mk({
    id: 'machine-pistol', name: 'Wasp MP-18 Skimmer', slot: 'pistol', order: 5,
    desc: 'A machine pistol you can drive with. Dumps its stick in under a second and a half.',
    damage: 19, headshotMult: 1.9, limbMult: 0.78,
    fireRateRpm: 800, auto: true,
    spread: { hip: 5.4, aim: 2.4, moving: 7.6, jump: 13.0 },
    recoil: { vert: 0.9, horiz: 0.75, recovery: 8.8, kick: 0.28 },
    magazine: 18, reserveMax: 180, reloadTime: 1.8, reloadType: 'mag',
    range: 60, falloffStart: 14, falloffEnd: 38, minDamageFrac: 0.34,
    projectile: 'hitscan', penetration: 0.1,
    zoomFov: 58, tracer: true, shell: true,
    price: 3100, ammoPrice: 110, ammoPerBuy: 54, unlockLevel: 7,
    model: { kind: 'smg', length: 0.26, bodyColor: 0x33373c, gripColor: 0x1c1e22, accentColor: 0x8b9197, barrel: 0.09, mag: true },
    sound: { type: 'smg', pitch: 1.22, bass: 0.34, tail: 0.18 },
    tags: ['sidearm', 'drive-by', 'automatic', 'gang'],
  }),
  mk({
    id: 'derringer', name: 'Palmetto Two-Shot', slot: 'pistol', order: 6,
    desc: 'Two rounds, no sights, fits in a cigarette case. Everything about it is a bad idea except the size.',
    damage: 52, headshotMult: 2.6, limbMult: 0.7,
    fireRateRpm: 240,
    spread: { hip: 6.5, aim: 2.4, moving: 9.0, jump: 14.0 },
    recoil: { vert: 2.4, horiz: 1.1, recovery: 5.0, kick: 0.7 },
    magazine: 2, reserveMax: 24, reloadTime: 0.55, reloadType: 'shell',
    range: 42, falloffStart: 9, falloffEnd: 26, minDamageFrac: 0.4,
    projectile: 'hitscan',
    price: 1400, ammoPrice: 60, ammoPerBuy: 12, unlockLevel: 3,
    model: { kind: 'pistol', length: 0.16, bodyColor: 0xc8b273, gripColor: 0x4a2c1a, accentColor: 0xe0d6b0, barrel: 0.07 },
    sound: { type: 'pistol', pitch: 1.22, bass: 0.5, tail: 0.2 },
    tags: ['concealable', 'burst-damage'],
  }),
  mk({
    id: 'target-pistol', name: 'Meridian Bullseye .22', slot: 'pistol', order: 7,
    desc: 'A range toy with a long barrel and a trigger like a light switch. Accurate to a fault, polite to a fault.',
    damage: 19, headshotMult: 3.0, limbMult: 0.7,
    fireRateRpm: 420,
    spread: { hip: 1.6, aim: 0.14, moving: 3.0, jump: 7.0 },
    recoil: { vert: 0.3, horiz: 0.08, recovery: 12.0, kick: 0.12 },
    magazine: 10, reserveMax: 150, reloadTime: 1.9, reloadType: 'mag',
    range: 70, falloffStart: 26, falloffEnd: 55, minDamageFrac: 0.55,
    projectile: 'hitscan',
    zoomFov: 52,
    price: 2200, ammoPrice: 80, ammoPerBuy: 50, unlockLevel: 4,
    model: { kind: 'pistol', length: 0.29, bodyColor: 0x2f3338, gripColor: 0x6b4a2c, accentColor: 0xb8bec5, barrel: 0.17 },
    sound: { type: 'pistol', pitch: 1.42, bass: 0.28, tail: 0.16 },
    tags: ['accurate', 'quiet-ish', 'headshot'],
  }),
  mk({
    id: 'service-revolver', name: 'Leonida PD Peacekeeper', slot: 'pistol', order: 8,
    desc: 'Six rounds of departmental tradition. Retired from the force, not from the work.',
    damage: 44, headshotMult: 2.4, limbMult: 0.76,
    fireRateRpm: 156,
    spread: { hip: 3.2, aim: 0.7, moving: 5.6, jump: 10.0 },
    recoil: { vert: 1.9, horiz: 0.5, recovery: 6.2, kick: 0.54 },
    magazine: 6, reserveMax: 96, reloadTime: 0.42, reloadType: 'shell',
    range: 90, falloffStart: 26, falloffEnd: 62, minDamageFrac: 0.5,
    projectile: 'hitscan', penetration: 0.3,
    price: 5200, ammoPrice: 140, ammoPerBuy: 36, unlockLevel: 8,
    model: { kind: 'revolver', length: 0.26, bodyColor: 0x33373c, gripColor: 0x3a2a1c, accentColor: 0x9aa1a8, barrel: 0.13 },
    sound: { type: 'pistol', pitch: 0.9, bass: 0.74, tail: 0.38 },
    tags: ['punchy', 'police'],
  }),
  mk({
    id: 'burst-pistol', name: 'Tanuki TP-3 Triplet', slot: 'pistol', order: 9,
    desc: 'Three rounds a squeeze, whether or not three were needed. Popular with people who count later.',
    damage: 20, headshotMult: 2.1, limbMult: 0.76,
    fireRateRpm: 900, burst: 3,
    spread: { hip: 3.6, aim: 0.8, moving: 5.4, jump: 10.5 },
    recoil: { vert: 1.1, horiz: 0.42, recovery: 8.0, kick: 0.3 },
    magazine: 18, reserveMax: 216, reloadTime: 1.95, reloadType: 'mag',
    range: 78, falloffStart: 22, falloffEnd: 52, minDamageFrac: 0.45,
    projectile: 'hitscan',
    price: 6400, ammoPrice: 150, ammoPerBuy: 54, unlockLevel: 10,
    model: { kind: 'pistol', length: 0.21, bodyColor: 0x272b30, gripColor: 0x17191c, accentColor: 0x6f757c, barrel: 0.1 },
    sound: { type: 'pistol', pitch: 1.12, bass: 0.46, tail: 0.22 },
    tags: ['burst', 'automatic'],
  }),
];

// ---------------------------------------------------------------------------
// SMGs
// ---------------------------------------------------------------------------
const SMGS = [
  mk({
    id: 'micro-smg', name: 'Hornet Micro-9', slot: 'smg', order: 0,
    desc: 'Eleven hundred rounds a minute out of a 26cm package. Point it in the general direction and hope.',
    damage: 18, headshotMult: 1.8, limbMult: 0.8,
    fireRateRpm: 1100, auto: true,
    spread: { hip: 6.8, aim: 3.0, moving: 8.8, jump: 14.5 },
    recoil: { vert: 0.65, horiz: 0.55, recovery: 9.2, kick: 0.24 },
    magazine: 20, reserveMax: 200, reloadTime: 2.0, reloadType: 'mag',
    range: 55, falloffStart: 12, falloffEnd: 34, minDamageFrac: 0.32,
    projectile: 'hitscan', penetration: 0.1,
    zoomFov: 58, tracer: true, shell: true,
    price: 3400, ammoPrice: 120, ammoPerBuy: 60, unlockLevel: 6,
    model: { kind: 'smg', length: 0.28, bodyColor: 0x2e3237, gripColor: 0x17191c, accentColor: 0x757c83, barrel: 0.1, mag: true },
    sound: { type: 'smg', pitch: 1.3, bass: 0.3, tail: 0.16 },
    tags: ['automatic', 'drive-by', 'close-quarters', 'gang'],
  }),
  mk({
    id: 'smg', name: 'Kestrel SMG-9 Tidal', slot: 'smg', order: 1,
    desc: 'Folding-stock 9mm with a real optic rail. The workhorse of every crew in Little Mirasol.',
    damage: 22, headshotMult: 1.9, limbMult: 0.78,
    fireRateRpm: 750, auto: true,
    spread: { hip: 4.6, aim: 1.3, moving: 6.4, jump: 11.8 },
    recoil: { vert: 0.95, horiz: 0.42, recovery: 8.0, kick: 0.3 },
    magazine: 30, reserveMax: 300, reloadTime: 2.3, reloadType: 'mag',
    range: 78, falloffStart: 20, falloffEnd: 48, minDamageFrac: 0.36,
    projectile: 'hitscan', penetration: 0.16,
    zoomFov: 52, tracer: true, shell: true,
    price: 5900, ammoPrice: 150, ammoPerBuy: 60, unlockLevel: 8,
    model: { kind: 'smg', length: 0.46, bodyColor: 0x272a2e, gripColor: 0x141619, accentColor: 0x8e959c, barrel: 0.17, stock: true, mag: true },
    sound: { type: 'smg', pitch: 1.1, bass: 0.42, tail: 0.24 },
    tags: ['automatic', 'versatile', 'crew'],
  }),
  mk({
    id: 'assault-smg', name: 'Riptide ASW Breaker', slot: 'smg', order: 2,
    desc: 'A .45 SMG that behaves like a short rifle. Heavier rounds, slower cycle, far meaner up close.',
    damage: 26, headshotMult: 1.9, limbMult: 0.8,
    fireRateRpm: 620, auto: true,
    spread: { hip: 3.8, aim: 1.0, moving: 5.4, jump: 10.4 },
    recoil: { vert: 1.35, horiz: 0.5, recovery: 7.2, kick: 0.42 },
    magazine: 30, reserveMax: 270, reloadTime: 2.5, reloadType: 'mag',
    range: 92, falloffStart: 26, falloffEnd: 58, minDamageFrac: 0.4,
    projectile: 'hitscan', penetration: 0.3,
    zoomFov: 50, tracer: true, shell: true,
    price: 9200, ammoPrice: 210, ammoPerBuy: 60, unlockLevel: 15,
    model: { kind: 'smg', length: 0.54, bodyColor: 0x33373b, gripColor: 0x1b1d21, accentColor: 0xa6adb4, barrel: 0.21, stock: true, mag: true, scopeLen: 0.09 },
    sound: { type: 'smg', pitch: 0.92, bass: 0.55, tail: 0.3 },
    tags: ['automatic', 'armor-piercing', 'crew'],
  }),
  mk({
    id: 'vintage-smg', name: 'Bellwether M28 Prohibition', slot: 'smg', order: 3,
    desc: 'Walnut furniture, 50-round drum, a sound like a sewing machine full of gravel. A collector piece that still works.',
    damage: 24, headshotMult: 1.85, limbMult: 0.8,
    fireRateRpm: 700, auto: true,
    spread: { hip: 4.2, aim: 1.6, moving: 6.8, jump: 12.4 },
    recoil: { vert: 1.5, horiz: 0.9, recovery: 6.4, kick: 0.48 },
    magazine: 50, reserveMax: 300, reloadTime: 3.2, reloadType: 'mag',
    range: 82, falloffStart: 22, falloffEnd: 52, minDamageFrac: 0.38,
    projectile: 'hitscan', penetration: 0.22,
    zoomFov: 54, tracer: false, shell: true,
    price: 11500, ammoPrice: 260, ammoPerBuy: 100, unlockLevel: 18,
    model: { kind: 'smg', length: 0.62, bodyColor: 0x5a3c22, gripColor: 0x3a2614, accentColor: 0xb9a06a, barrel: 0.24, stock: true, mag: true, drum: true },
    sound: { type: 'smg', pitch: 0.86, bass: 0.62, tail: 0.34 },
    tags: ['automatic', 'classic', 'collector', 'loud'],
  }),
  mk({
    id: 'pdw', name: 'Wolfram PDW-7', slot: 'smg', order: 4,
    desc: 'Armour-piercing in a package the size of a lunchbox. Designed for pilots, sold to everyone.',
    damage: 23, headshotMult: 2.1, limbMult: 0.78,
    fireRateRpm: 800, auto: true,
    spread: { hip: 3.6, aim: 0.9, moving: 5.4, jump: 10.4 },
    recoil: { vert: 1.0, horiz: 0.34, recovery: 8.6, kick: 0.34 },
    magazine: 40, reserveMax: 320, reloadTime: 2.2, reloadType: 'mag',
    range: 110, falloffStart: 30, falloffEnd: 76, minDamageFrac: 0.44,
    projectile: 'hitscan', penetration: 0.55,
    zoomFov: 50, tracer: true, shell: true,
    price: 14200, ammoPrice: 240, ammoPerBuy: 80, unlockLevel: 18,
    model: { kind: 'smg', length: 0.48, bodyColor: 0x2b2f34, gripColor: 0x17191c, accentColor: 0x878e95, barrel: 0.17, stock: true, mag: true },
    sound: { type: 'smg', pitch: 1.18, bass: 0.48, tail: 0.28 },
    tags: ['automatic', 'armor-piercing', 'compact', 'military'],
  }),
  mk({
    id: 'spray-smg', name: 'Habana Mosquito', slot: 'smg', order: 5,
    desc: 'Open bolt, no sights worth the name, and a rate of fire that empties the magazine before the first casing lands.',
    damage: 16, headshotMult: 1.9, limbMult: 0.8,
    fireRateRpm: 1250, auto: true,
    spread: { hip: 7.2, aim: 3.0, moving: 9.6, jump: 15.0 },
    recoil: { vert: 1.5, horiz: 0.95, recovery: 7.0, kick: 0.3 },
    magazine: 32, reserveMax: 320, reloadTime: 1.85, reloadType: 'mag',
    range: 62, falloffStart: 14, falloffEnd: 42, minDamageFrac: 0.32,
    projectile: 'hitscan',
    price: 4600, ammoPrice: 170, ammoPerBuy: 96, unlockLevel: 6,
    model: { kind: 'smg', length: 0.4, bodyColor: 0x3c3f45, gripColor: 0x232629, accentColor: 0x9aa0a7, barrel: 0.13, stock: false, mag: true },
    sound: { type: 'smg', pitch: 1.34, bass: 0.36, tail: 0.22 },
    tags: ['automatic', 'gang', 'cheap', 'loud'],
  }),
  mk({
    id: 'supp-smg', name: 'Velvet Static VS-9', slot: 'smg', order: 6,
    desc: 'An integral can and subsonic loads. Sounds like a stapler and works like something considerably worse.',
    damage: 21, headshotMult: 2.2, limbMult: 0.76,
    fireRateRpm: 700, auto: true, silenced: true,
    spread: { hip: 3.2, aim: 0.66, moving: 4.8, jump: 9.2 },
    recoil: { vert: 0.72, horiz: 0.24, recovery: 9.4, kick: 0.22 },
    magazine: 30, reserveMax: 270, reloadTime: 2.1, reloadType: 'mag',
    range: 86, falloffStart: 22, falloffEnd: 58, minDamageFrac: 0.4,
    projectile: 'hitscan',
    zoomFov: 50,
    price: 18500, ammoPrice: 280, ammoPerBuy: 60, unlockLevel: 24,
    model: { kind: 'smg', length: 0.56, bodyColor: 0x1f2226, gripColor: 0x131517, accentColor: 0x5b6167, barrel: 0.24, stock: true, mag: true },
    sound: { type: 'smg', pitch: 0.8, bass: 0.3, tail: 0.12 },
    tags: ['automatic', 'silenced', 'stealth'],
  }),
  mk({
    id: 'ripcord-smg', name: 'Rill K-9 Ripcord', slot: 'smg', order: 7,
    desc: 'A counter-balanced bolt that dumps a magazine before the casings hit the floor. Tiny rounds, silly rate.',
    damage: 16, headshotMult: 1.9, limbMult: 0.74,
    fireRateRpm: 1100, auto: true,
    spread: { hip: 5.4, aim: 1.6, moving: 7.4, jump: 13.2 },
    recoil: { vert: 0.85, horiz: 0.55, recovery: 9.6, kick: 0.3 },
    magazine: 25, reserveMax: 250, reloadTime: 2.1, reloadType: 'mag',
    range: 76, falloffStart: 16, falloffEnd: 48, minDamageFrac: 0.4,
    projectile: 'hitscan', penetration: 0.16,
    zoomFov: 52, tracer: true, shell: true,
    price: 14800, ammoPrice: 200, ammoPerBuy: 100, unlockLevel: 20,
    model: { kind: 'smg', length: 0.44, bodyColor: 0x24272b, gripColor: 0x15171a, accentColor: 0xa6adb4, barrel: 0.14, stock: true, mag: true },
    sound: { type: 'smg', pitch: 1.26, bass: 0.4, tail: 0.2 },
    tags: ['automatic', 'fast', 'close-quarters', 'loud'],
  }),
];

// ---------------------------------------------------------------------------
// SHOTGUNS
// ---------------------------------------------------------------------------
const SHOTGUNS = [
  mk({
    id: 'pump-shotgun', name: 'Sawgrass 12 Pump', slot: 'shotgun', order: 0,
    desc: 'Eight in the tube, one pellet spread that fills a doorway. Pump between every shot and mean it.',
    damage: 25, pellets: 8, headshotMult: 1.5, limbMult: 0.85,
    fireRateRpm: 80,
    spread: { hip: 7.5, aim: 4.6, moving: 9.5, jump: 15.0 },
    recoil: { vert: 3.4, horiz: 0.9, recovery: 4.2, kick: 1.1 },
    magazine: 8, reserveMax: 64, reloadTime: 0.55, reloadType: 'shell',
    range: 45, falloffStart: 9, falloffEnd: 27, minDamageFrac: 0.22,
    projectile: 'hitscan', penetration: 0.15,
    zoomFov: 56, shell: true,
    price: 3800, ammoPrice: 140, ammoPerBuy: 16, unlockLevel: 4,
    model: { kind: 'shotgun', length: 0.98, bodyColor: 0x23262a, gripColor: 0x3d2a18, accentColor: 0x848b92, barrel: 0.51, stock: true },
    sound: { type: 'shotgun', pitch: 0.8, bass: 0.95, tail: 0.6 },
    tags: ['close-quarters', 'breaching', 'loud'],
  }),
  mk({
    id: 'sawn-off-shotgun', name: 'Stubby Twin Coachgun', slot: 'shotgun', order: 1,
    desc: 'Two barrels cut down to nothing. Devastating inside five metres, a noisemaker past fifteen.',
    damage: 32, pellets: 10, headshotMult: 1.4, limbMult: 0.9,
    fireRateRpm: 200,
    spread: { hip: 12.5, aim: 9.0, moving: 15.0, jump: 21.0 },
    recoil: { vert: 4.6, horiz: 1.8, recovery: 3.4, kick: 1.6 },
    magazine: 2, reserveMax: 40, reloadTime: 1.0, reloadType: 'shell',
    range: 26, falloffStart: 5, falloffEnd: 15, minDamageFrac: 0.14,
    projectile: 'hitscan', penetration: 0.08,
    zoomFov: 60, shell: true,
    price: 2900, ammoPrice: 140, ammoPerBuy: 16, unlockLevel: 3,
    model: { kind: 'shotgun', length: 0.54, bodyColor: 0x2b2015, gripColor: 0x4a3320, accentColor: 0x9a5a2a, barrel: 0.3 },
    sound: { type: 'shotgun', pitch: 0.7, bass: 1.0, tail: 0.72 },
    tags: ['close-quarters', 'drive-by', 'concealable', 'gang'],
  }),
  mk({
    id: 'combat-shotgun', name: 'Vireo Auto-12 Enforcer', slot: 'shotgun', order: 2,
    desc: 'Gas-operated, box-fed, and rude at four shots a second. Tighter pattern than the pump.',
    damage: 20, pellets: 8, headshotMult: 1.5, limbMult: 0.85,
    fireRateRpm: 240,
    spread: { hip: 6.0, aim: 3.4, moving: 8.0, jump: 13.5 },
    recoil: { vert: 2.5, horiz: 0.8, recovery: 5.6, kick: 0.85 },
    magazine: 8, reserveMax: 80, reloadTime: 2.7, reloadType: 'mag',
    range: 52, falloffStart: 12, falloffEnd: 32, minDamageFrac: 0.24,
    projectile: 'hitscan', penetration: 0.18,
    zoomFov: 54, shell: true,
    price: 14500, ammoPrice: 220, ammoPerBuy: 24, unlockLevel: 19,
    model: { kind: 'shotgun', length: 0.88, bodyColor: 0x1f2226, gripColor: 0x121417, accentColor: 0x6d747b, barrel: 0.42, stock: true, mag: true },
    sound: { type: 'shotgun', pitch: 0.9, bass: 0.85, tail: 0.48 },
    tags: ['close-quarters', 'semi-auto', 'police', 'loud'],
  }),
  mk({
    id: 'heavy-shotgun', name: 'Bulwark HS-10 Drumfire', slot: 'shotgun', order: 3,
    desc: 'Ten-round drum, buckshot loads hot enough to move a car door. Slow to bring on target, terrible to be in front of.',
    damage: 22, pellets: 8, headshotMult: 1.5, limbMult: 0.88,
    fireRateRpm: 180,
    spread: { hip: 8.2, aim: 4.2, moving: 10.5, jump: 16.5 },
    recoil: { vert: 3.0, horiz: 1.1, recovery: 4.8, kick: 1.05 },
    magazine: 10, reserveMax: 80, reloadTime: 3.4, reloadType: 'mag',
    range: 48, falloffStart: 11, falloffEnd: 30, minDamageFrac: 0.26,
    projectile: 'hitscan', penetration: 0.28,
    zoomFov: 55, shell: true,
    price: 19800, ammoPrice: 280, ammoPerBuy: 30, unlockLevel: 24,
    model: { kind: 'shotgun', length: 0.94, bodyColor: 0x2d3136, gripColor: 0x18191d, accentColor: 0xa8aeb4, barrel: 0.44, stock: true, drum: true },
    sound: { type: 'shotgun', pitch: 0.74, bass: 1.0, tail: 0.66 },
    tags: ['close-quarters', 'heist', 'armor-piercing', 'loud'],
  }),
  mk({
    id: 'auto-shotgun', name: 'Bullhorn Streetsweeper', slot: 'shotgun', order: 4,
    desc: 'Drum-fed and entirely without restraint. Clears a doorway and most of the wall beside it.',
    damage: 11, pellets: 8, headshotMult: 1.5, limbMult: 0.85,
    fireRateRpm: 300, auto: true,
    spread: { hip: 7.0, aim: 4.2, moving: 9.5, jump: 14.0 },
    recoil: { vert: 2.2, horiz: 0.8, recovery: 5.6, kick: 0.8 },
    magazine: 20, reserveMax: 120, reloadTime: 3.4, reloadType: 'mag',
    range: 46, falloffStart: 11, falloffEnd: 32, minDamageFrac: 0.22,
    projectile: 'hitscan', shell: true,
    price: 24000, ammoPrice: 380, ammoPerBuy: 40, unlockLevel: 28,
    model: { kind: 'shotgun', length: 0.78, bodyColor: 0x25282c, gripColor: 0x15171a, accentColor: 0x7b8189, barrel: 0.34, stock: true, mag: true },
    sound: { type: 'shotgun', pitch: 1.02, bass: 0.86, tail: 0.46 },
    tags: ['automatic', 'close-range', 'loud', 'military'],
  }),
  mk({
    id: 'bullpup-shotgun', name: 'Ibis Stubgun', slot: 'shotgun', order: 5,
    desc: 'A full barrel folded behind the grip. Handles indoors like a pistol and hits like it very much is not one.',
    damage: 10, pellets: 9, headshotMult: 1.5, limbMult: 0.85,
    fireRateRpm: 170,
    spread: { hip: 5.6, aim: 3.0, moving: 8.0, jump: 12.5 },
    recoil: { vert: 2.5, horiz: 0.7, recovery: 5.2, kick: 0.9 },
    magazine: 14, reserveMax: 112, reloadTime: 3.0, reloadType: 'mag',
    range: 52, falloffStart: 13, falloffEnd: 36, minDamageFrac: 0.24,
    projectile: 'hitscan', shell: true,
    price: 17800, ammoPrice: 340, ammoPerBuy: 32, unlockLevel: 21,
    model: { kind: 'shotgun', length: 0.66, bodyColor: 0x2e3237, gripColor: 0x1a1c1f, accentColor: 0x8d949b, barrel: 0.26, stock: false, mag: true },
    sound: { type: 'shotgun', pitch: 1.1, bass: 0.8, tail: 0.4 },
    tags: ['close-range', 'compact'],
  }),
  mk({
    id: 'coach-gun', name: 'Ocean Mile Coachgun', slot: 'shotgun', order: 6,
    desc: 'Two barrels, side by side, hammers you cock with your thumb. Antique, theatrical, ruinous at four metres.',
    damage: 14, pellets: 10, headshotMult: 1.6, limbMult: 0.85,
    fireRateRpm: 220,
    spread: { hip: 8.5, aim: 5.5, moving: 11.0, jump: 16.0 },
    recoil: { vert: 3.2, horiz: 1.0, recovery: 4.4, kick: 1.1 },
    magazine: 2, reserveMax: 60, reloadTime: 0.6, reloadType: 'shell',
    range: 34, falloffStart: 8, falloffEnd: 22, minDamageFrac: 0.18,
    projectile: 'hitscan', shell: true,
    price: 3800, ammoPrice: 300, ammoPerBuy: 24, unlockLevel: 5,
    model: { kind: 'shotgun', length: 0.72, bodyColor: 0x4a3626, gripColor: 0x3a2717, accentColor: 0xb9a075, barrel: 0.4, stock: true, mag: false },
    sound: { type: 'shotgun', pitch: 0.88, bass: 0.95, tail: 0.55 },
    tags: ['close-range', 'burst-damage', 'loud'],
  }),
  mk({
    id: 'slug-gun', name: 'Sawgrass Rifled Slug', slot: 'shotgun', order: 7,
    desc: 'Rifled barrel, ghost ring sights, one fat lump of lead per pull. A shotgun that behaves like a rifle.',
    damage: 110, headshotMult: 1.9, limbMult: 0.8, pellets: 1,
    fireRateRpm: 200,
    spread: { hip: 4.2, aim: 0.7, moving: 6.4, jump: 12.0 },
    recoil: { vert: 3.4, horiz: 0.7, recovery: 5.2, kick: 1.0 },
    magazine: 8, reserveMax: 64, reloadTime: 0.42, reloadType: 'shell',
    range: 96, falloffStart: 34, falloffEnd: 80, minDamageFrac: 0.52,
    projectile: 'hitscan', penetration: 0.5,
    zoomFov: 46, tracer: false, shell: true,
    price: 16200, ammoPrice: 300, ammoPerBuy: 24, unlockLevel: 21,
    model: { kind: 'shotgun', length: 0.98, bodyColor: 0x3a2b1c, gripColor: 0x241a10, accentColor: 0x767b81, barrel: 0.5, stock: true },
    sound: { type: 'shotgun', pitch: 0.78, bass: 0.95, tail: 0.5 },
    tags: ['slug', 'punchy', 'mid-range', 'loud'],
  }),
];

// ---------------------------------------------------------------------------
// RIFLES
// ---------------------------------------------------------------------------
const RIFLES = [
  mk({
    id: 'carbine-rifle', name: 'Lynx CR-5 Coastguard', slot: 'rifle', order: 0,
    desc: 'Flat-shooting 5.56 carbine with a red dot. Low recoil, high round count, no personality problems.',
    damage: 28, headshotMult: 2.2, limbMult: 0.76,
    fireRateRpm: 480, auto: true,
    spread: { hip: 3.4, aim: 0.55, moving: 5.0, jump: 10.0 },
    recoil: { vert: 1.25, horiz: 0.38, recovery: 7.6, kick: 0.45 },
    magazine: 30, reserveMax: 300, reloadTime: 2.4, reloadType: 'mag',
    range: 180, falloffStart: 55, falloffEnd: 130, minDamageFrac: 0.48,
    projectile: 'hitscan', penetration: 0.45,
    zoomFov: 44, tracer: true, shell: true,
    price: 12800, ammoPrice: 260, ammoPerBuy: 60, unlockLevel: 16,
    model: { kind: 'rifle', length: 0.86, bodyColor: 0x2a2d31, gripColor: 0x16181b, accentColor: 0x7f868d, barrel: 0.38, stock: true, mag: true, scopeLen: 0.11 },
    sound: { type: 'rifle', pitch: 1.04, bass: 0.62, tail: 0.4 },
    tags: ['automatic', 'accurate', 'armor-piercing', 'military'],
  }),
  mk({
    id: 'assault-rifle', name: 'Volkarov AR-47 Stryke', slot: 'rifle', order: 1,
    desc: 'Stamped, stubborn, imported through the docks in crates marked TRACTOR PARTS. Hits harder and kicks harder.',
    damage: 33, headshotMult: 2.2, limbMult: 0.78,
    fireRateRpm: 420, auto: true,
    spread: { hip: 4.4, aim: 0.9, moving: 6.2, jump: 11.6 },
    recoil: { vert: 1.85, horiz: 0.72, recovery: 6.4, kick: 0.62 },
    magazine: 30, reserveMax: 300, reloadTime: 2.7, reloadType: 'mag',
    range: 165, falloffStart: 48, falloffEnd: 118, minDamageFrac: 0.5,
    projectile: 'hitscan', penetration: 0.52,
    zoomFov: 46, tracer: true, shell: true,
    price: 9800, ammoPrice: 240, ammoPerBuy: 60, unlockLevel: 12,
    model: { kind: 'rifle', length: 0.88, bodyColor: 0x3b2d1c, gripColor: 0x4c3720, accentColor: 0x6f7378, barrel: 0.4, stock: true, mag: true },
    sound: { type: 'rifle', pitch: 0.88, bass: 0.78, tail: 0.5 },
    tags: ['automatic', 'armor-piercing', 'gang', 'loud'],
  }),
  mk({
    id: 'bullpup-rifle', name: 'Ibis BR-9 Shortstack', slot: 'rifle', order: 2,
    desc: 'Magazine behind the trigger, so a full-length barrel fits in a car. Fast, twitchy, forgiving.',
    damage: 27, headshotMult: 2.2, limbMult: 0.74,
    fireRateRpm: 640, auto: true,
    spread: { hip: 3.0, aim: 0.48, moving: 4.6, jump: 9.4 },
    recoil: { vert: 1.05, horiz: 0.32, recovery: 8.2, kick: 0.38 },
    magazine: 25, reserveMax: 300, reloadTime: 2.15, reloadType: 'mag',
    range: 172, falloffStart: 50, falloffEnd: 122, minDamageFrac: 0.46,
    projectile: 'hitscan', penetration: 0.42,
    zoomFov: 43, tracer: true, shell: true,
    price: 16500, ammoPrice: 260, ammoPerBuy: 60, unlockLevel: 22,
    model: { kind: 'rifle', length: 0.74, bodyColor: 0x353a3f, gripColor: 0x1d2023, accentColor: 0x9ba2a9, barrel: 0.3, stock: false, mag: true, scopeLen: 0.14 },
    sound: { type: 'rifle', pitch: 1.16, bass: 0.55, tail: 0.34 },
    tags: ['automatic', 'accurate', 'compact', 'military'],
  }),
  mk({
    id: 'battle-rifle', name: 'Reinhalt BR-10 Kaiser', slot: 'rifle', order: 3,
    desc: 'Full-power rounds in a rifle that never got the memo about weight. Every shot is an argument settled.',
    damage: 46, headshotMult: 2.2, limbMult: 0.8,
    fireRateRpm: 300, auto: true,
    spread: { hip: 5.2, aim: 0.8, moving: 7.4, jump: 13.0 },
    recoil: { vert: 2.6, horiz: 0.85, recovery: 5.4, kick: 0.85 },
    magazine: 20, reserveMax: 200, reloadTime: 2.8, reloadType: 'mag',
    range: 210, falloffStart: 70, falloffEnd: 160, minDamageFrac: 0.6,
    projectile: 'hitscan', penetration: 0.7,
    zoomFov: 40, tracer: true, shell: true,
    price: 26500, ammoPrice: 340, ammoPerBuy: 40, unlockLevel: 30,
    model: { kind: 'rifle', length: 0.98, bodyColor: 0x2c2f33, gripColor: 0x3f2d1a, accentColor: 0x8f959c, barrel: 0.46, stock: true, mag: true, scopeLen: 0.13 },
    sound: { type: 'rifle', pitch: 0.78, bass: 0.92, tail: 0.58 },
    tags: ['automatic', 'armor-piercing', 'long-range', 'military'],
  }),
  mk({
    id: 'drum-rifle', name: 'Volkarov AR-47 Barrelhouse', slot: 'rifle', order: 4,
    desc: 'Seventy-five rounds in a drum the size of a dinner plate. Reloading is a scheduled event.',
    damage: 30, headshotMult: 2.1, limbMult: 0.78,
    fireRateRpm: 440, auto: true,
    spread: { hip: 5.0, aim: 1.1, moving: 6.8, jump: 12.4 },
    recoil: { vert: 1.95, horiz: 0.8, recovery: 6.0, kick: 0.66 },
    magazine: 75, reserveMax: 300, reloadTime: 4.2, reloadType: 'mag',
    range: 160, falloffStart: 46, falloffEnd: 112, minDamageFrac: 0.5,
    projectile: 'hitscan', penetration: 0.5,
    zoomFov: 46, tracer: true, shell: true,
    price: 19500, ammoPrice: 300, ammoPerBuy: 150, unlockLevel: 26,
    model: { kind: 'rifle', length: 0.9, bodyColor: 0x43321f, gripColor: 0x533c23, accentColor: 0x74787d, barrel: 0.4, stock: true, mag: true },
    sound: { type: 'rifle', pitch: 0.9, bass: 0.8, tail: 0.52 },
    tags: ['automatic', 'sustained', 'gang', 'loud'],
  }),
  mk({
    id: 'supp-rifle', name: 'Lynx CR-5 Nightshift', slot: 'rifle', order: 5,
    desc: 'The Coastguard with a can on the end and heavier subsonic loads. Quieter than a door closing.',
    damage: 31, headshotMult: 2.3, limbMult: 0.76,
    fireRateRpm: 420, auto: true, silenced: true,
    spread: { hip: 3.2, aim: 0.5, moving: 4.8, jump: 9.6 },
    recoil: { vert: 1.0, horiz: 0.3, recovery: 8.4, kick: 0.36 },
    magazine: 30, reserveMax: 240, reloadTime: 2.5, reloadType: 'mag',
    range: 150, falloffStart: 44, falloffEnd: 104, minDamageFrac: 0.5,
    projectile: 'hitscan', penetration: 0.4,
    zoomFov: 42, tracer: false, shell: true,
    price: 31000, ammoPrice: 380, ammoPerBuy: 60, unlockLevel: 34,
    model: { kind: 'rifle', length: 0.96, bodyColor: 0x1c1f22, gripColor: 0x121415, accentColor: 0x4f555b, barrel: 0.48, stock: true, mag: true, scopeLen: 0.12 },
    sound: { type: 'rifle', pitch: 0.72, bass: 0.4, tail: 0.18 },
    tags: ['automatic', 'silenced', 'stealth', 'accurate'],
  }),
  mk({
    id: 'compact-carbine', name: 'Ibis Shortstack Cub', slot: 'rifle', order: 6,
    desc: 'Barrel cut back until it fits under a jacket. Loud, flashy, and perfectly happy at ten metres.',
    damage: 25, headshotMult: 2.1, limbMult: 0.76,
    fireRateRpm: 700, auto: true,
    spread: { hip: 4.6, aim: 1.2, moving: 6.4, jump: 11.8 },
    recoil: { vert: 1.35, horiz: 0.5, recovery: 7.8, kick: 0.44 },
    magazine: 30, reserveMax: 270, reloadTime: 2.1, reloadType: 'mag',
    range: 120, falloffStart: 30, falloffEnd: 82, minDamageFrac: 0.42,
    projectile: 'hitscan', penetration: 0.38,
    zoomFov: 48, tracer: true, shell: true,
    price: 13600, ammoPrice: 250, ammoPerBuy: 60, unlockLevel: 19,
    model: { kind: 'rifle', length: 0.62, bodyColor: 0x31363b, gripColor: 0x1b1e21, accentColor: 0x9aa1a8, barrel: 0.22, stock: false, mag: true },
    sound: { type: 'rifle', pitch: 1.26, bass: 0.5, tail: 0.3 },
    tags: ['automatic', 'compact', 'loud'],
  }),
  mk({
    id: 'service-rifle', name: 'Pennant M-2 Statesman', slot: 'rifle', order: 7,
    desc: 'Wood furniture, iron sights, semi-automatic and utterly unbothered. Older than most of its owners.',
    damage: 42, headshotMult: 2.4, limbMult: 0.78,
    fireRateRpm: 380,
    spread: { hip: 4.0, aim: 0.4, moving: 6.0, jump: 11.0 },
    recoil: { vert: 2.0, horiz: 0.5, recovery: 6.6, kick: 0.6 },
    magazine: 20, reserveMax: 200, reloadTime: 2.5, reloadType: 'mag',
    range: 200, falloffStart: 64, falloffEnd: 150, minDamageFrac: 0.62,
    projectile: 'hitscan', penetration: 0.6,
    zoomFov: 38, tracer: true, shell: true,
    price: 8400, ammoPrice: 220, ammoPerBuy: 40, unlockLevel: 11,
    model: { kind: 'rifle', length: 1.04, bodyColor: 0x5a3f24, gripColor: 0x46301b, accentColor: 0x83888e, barrel: 0.52, stock: true, mag: true },
    sound: { type: 'rifle', pitch: 0.84, bass: 0.82, tail: 0.5 },
    tags: ['accurate', 'long-range', 'punchy'],
  }),
];

// ---------------------------------------------------------------------------
// SNIPERS / PRECISION
// ---------------------------------------------------------------------------
const SNIPERS = [
  mk({
    id: 'marksman-rifle', name: 'Harrier DMR-7 Longcoast', slot: 'sniper', order: 0,
    desc: 'Semi-auto designated marksman rifle. Not a true sniper — it just refuses to miss at 200 metres.',
    damage: 52, headshotMult: 2.8, limbMult: 0.7,
    fireRateRpm: 200,
    spread: { hip: 5.5, aim: 0.16, moving: 8.0, jump: 15.0 },
    recoil: { vert: 2.4, horiz: 0.5, recovery: 5.4, kick: 0.8 },
    magazine: 12, reserveMax: 96, reloadTime: 2.8, reloadType: 'mag',
    range: 320, falloffStart: 140, falloffEnd: 260, minDamageFrac: 0.62,
    projectile: 'hitscan', penetration: 0.6,
    zoomFov: 30, scope: true, tracer: false, shell: true,
    price: 21000, ammoPrice: 340, ammoPerBuy: 24, unlockLevel: 20,
    model: { kind: 'sniper', length: 1.06, bodyColor: 0x2f3338, gripColor: 0x1a1c1f, accentColor: 0x8a9199, barrel: 0.5, stock: true, mag: true, scopeLen: 0.24 },
    sound: { type: 'rifle', pitch: 0.8, bass: 0.82, tail: 0.62 },
    tags: ['precision', 'scoped', 'semi-auto', 'armor-piercing'],
  }),
  mk({
    id: 'sniper-rifle', name: 'Ospreye SR-700 Kingfisher', slot: 'sniper', order: 1,
    desc: 'Bolt-action .308 with a 10x glass. One breath, one shot, then work the bolt and find new cover.',
    damage: 105, headshotMult: 3.2, limbMult: 0.66,
    fireRateRpm: 45,
    spread: { hip: 9.5, aim: 0.05, moving: 14.0, jump: 22.0 },
    recoil: { vert: 4.4, horiz: 0.6, recovery: 3.0, kick: 1.5 },
    magazine: 10, reserveMax: 60, reloadTime: 3.4, reloadType: 'mag',
    range: 520, falloffStart: 260, falloffEnd: 440, minDamageFrac: 0.75,
    projectile: 'bullet', muzzleVelocity: 860, penetration: 0.72,
    zoomFov: 16, scope: true, tracer: false, shell: true,
    price: 27500, ammoPrice: 420, ammoPerBuy: 20, unlockLevel: 25,
    model: { kind: 'sniper', length: 1.24, bodyColor: 0x26292d, gripColor: 0x2d3a2a, accentColor: 0x707880, barrel: 0.62, stock: true, mag: true, scopeLen: 0.32 },
    sound: { type: 'sniper', pitch: 0.66, bass: 0.94, tail: 0.95 },
    tags: ['precision', 'scoped', 'bolt-action', 'one-shot', 'loud'],
  }),
  mk({
    id: 'heavy-sniper', name: 'Anvil .408 Longbore', slot: 'sniper', order: 2,
    desc: 'An anti-materiel rifle that fits in a golf bag if you take the scope off. Punches through engine blocks.',
    damage: 165, headshotMult: 3.0, limbMult: 0.8,
    fireRateRpm: 32,
    spread: { hip: 12.0, aim: 0.04, moving: 18.0, jump: 26.0 },
    recoil: { vert: 6.8, horiz: 1.1, recovery: 2.2, kick: 2.4 },
    magazine: 6, reserveMax: 36, reloadTime: 4.2, reloadType: 'mag',
    range: 700, falloffStart: 380, falloffEnd: 620, minDamageFrac: 0.82,
    projectile: 'bullet', muzzleVelocity: 1010, penetration: 0.95,
    zoomFov: 11, scope: true, tracer: false, shell: true,
    price: 48000, ammoPrice: 760, ammoPerBuy: 12, unlockLevel: 32,
    model: { kind: 'sniper', length: 1.42, bodyColor: 0x1c1f22, gripColor: 0x121416, accentColor: 0x59606a, barrel: 0.78, stock: true, mag: true, scopeLen: 0.38 },
    sound: { type: 'sniper', pitch: 0.5, bass: 1.0, tail: 1.2 },
    tags: ['precision', 'scoped', 'anti-vehicle', 'armor-piercing', 'loud'],
  }),
  mk({
    id: 'hunting-rifle', name: 'Glades Boltmaster', slot: 'sniper', order: 3,
    desc: 'Bolt action, wooden stock, a scope older than the truck it lives behind. Kills deer and other things.',
    damage: 96, headshotMult: 2.8, limbMult: 0.6,
    fireRateRpm: 48,
    spread: { hip: 9.0, aim: 0.10, moving: 13.0, jump: 20.0 },
    recoil: { vert: 3.4, horiz: 0.5, recovery: 4.2, kick: 1.0 },
    magazine: 5, reserveMax: 60, reloadTime: 3.0, reloadType: 'mag',
    range: 300, falloffStart: 140, falloffEnd: 260, minDamageFrac: 0.75,
    projectile: 'hitscan', penetration: 0.7,
    zoomFov: 22, scope: true, shell: true,
    price: 9600, ammoPrice: 260, ammoPerBuy: 20, unlockLevel: 13,
    model: { kind: 'sniper', length: 1.14, bodyColor: 0x5b4026, gripColor: 0x452f1b, accentColor: 0x6e7379, barrel: 0.6, stock: true, mag: true, scopeLen: 0.3 },
    sound: { type: 'sniper', pitch: 0.86, bass: 0.88, tail: 0.72 },
    tags: ['accurate', 'long-range', 'punchy'],
  }),
  mk({
    id: 'anti-materiel', name: 'Praetor AM-12 Longshore', slot: 'sniper', order: 4,
    desc: 'Meant for engine blocks and radar dishes. Against people it is simply an overreaction that works.',
    damage: 165, headshotMult: 2.2, limbMult: 0.85,
    fireRateRpm: 32,
    spread: { hip: 12.0, aim: 0.06, moving: 16.0, jump: 24.0 },
    recoil: { vert: 5.5, horiz: 1.2, recovery: 3.0, kick: 1.6 },
    magazine: 5, reserveMax: 30, reloadTime: 4.2, reloadType: 'mag',
    range: 420, falloffStart: 200, falloffEnd: 380, minDamageFrac: 0.85,
    projectile: 'hitscan', penetration: 1.0,
    zoomFov: 16, scope: true, shell: true,
    price: 58000, ammoPrice: 900, ammoPerBuy: 10, unlockLevel: 40,
    model: { kind: 'sniper', length: 1.42, bodyColor: 0x23262a, gripColor: 0x141618, accentColor: 0x5f656b, barrel: 0.78, stock: true, mag: true, scopeLen: 0.36 },
    sound: { type: 'sniper', pitch: 0.62, bass: 1.0, tail: 0.95 },
    tags: ['armor-piercing', 'long-range', 'anti-vehicle', 'military'],
  }),
  mk({
    id: 'supp-marksman', name: 'Velvet Static VS-7 Whisper', slot: 'sniper', order: 5,
    desc: 'Semi-automatic, suppressed, and painted the colour of a parking garage. Nothing about it wants to be noticed.',
    damage: 74, headshotMult: 2.6, limbMult: 0.66,
    fireRateRpm: 110, silenced: true,
    spread: { hip: 7.0, aim: 0.14, moving: 10.5, jump: 17.0 },
    recoil: { vert: 2.2, horiz: 0.4, recovery: 5.6, kick: 0.7 },
    magazine: 10, reserveMax: 80, reloadTime: 2.8, reloadType: 'mag',
    range: 260, falloffStart: 110, falloffEnd: 220, minDamageFrac: 0.7,
    projectile: 'hitscan', penetration: 0.6,
    zoomFov: 24, scope: true, tracer: false, shell: true,
    price: 44000, ammoPrice: 560, ammoPerBuy: 30, unlockLevel: 36,
    model: { kind: 'sniper', length: 1.22, bodyColor: 0x2a2d31, gripColor: 0x17191b, accentColor: 0x4c5257, barrel: 0.66, stock: true, mag: true, scopeLen: 0.32 },
    sound: { type: 'sniper', pitch: 0.7, bass: 0.44, tail: 0.24 },
    tags: ['silenced', 'stealth', 'long-range', 'accurate'],
  }),
];

// ---------------------------------------------------------------------------
// HEAVY
// ---------------------------------------------------------------------------
const HEAVY = [
  mk({
    id: 'lmg', name: 'Groundhog LMG-60 Belt', slot: 'heavy', order: 0,
    desc: 'Hundred-round belt box and a bipod you never get to use. Suppresses a whole street, reloads in a geological age.',
    damage: 32, headshotMult: 1.9, limbMult: 0.82,
    fireRateRpm: 600, auto: true,
    spread: { hip: 6.2, aim: 1.8, moving: 9.0, jump: 16.0 },
    recoil: { vert: 1.7, horiz: 0.95, recovery: 6.0, kick: 0.7 },
    magazine: 100, reserveMax: 400, reloadTime: 5.0, reloadType: 'mag',
    range: 190, falloffStart: 55, falloffEnd: 135, minDamageFrac: 0.5,
    projectile: 'hitscan', penetration: 0.62,
    zoomFov: 48, tracer: true, shell: true,
    price: 32000, ammoPrice: 520, ammoPerBuy: 200, unlockLevel: 27,
    model: { kind: 'mg', length: 1.08, bodyColor: 0x2b3033, gripColor: 0x191c1e, accentColor: 0x7d858c, barrel: 0.52, stock: true, drum: true },
    sound: { type: 'mg', pitch: 0.82, bass: 0.9, tail: 0.55 },
    tags: ['automatic', 'suppressive', 'military', 'heavy', 'loud'],
  }),
  mk({
    id: 'combat-mg', name: 'Steelcat MG-7 Bayfront', slot: 'heavy', order: 1,
    desc: 'A 150-round belt of 7.62 in a hard case. Slower cycle than the Groundhog, far more per hit.',
    damage: 36, headshotMult: 1.9, limbMult: 0.84,
    fireRateRpm: 500, auto: true,
    spread: { hip: 5.4, aim: 1.4, moving: 8.2, jump: 15.0 },
    recoil: { vert: 2.1, horiz: 0.85, recovery: 5.4, kick: 0.88 },
    magazine: 150, reserveMax: 450, reloadTime: 6.2, reloadType: 'mag',
    range: 210, falloffStart: 62, falloffEnd: 150, minDamageFrac: 0.54,
    projectile: 'hitscan', penetration: 0.7,
    zoomFov: 47, tracer: true, shell: true,
    price: 41000, ammoPrice: 640, ammoPerBuy: 300, unlockLevel: 30,
    model: { kind: 'mg', length: 1.18, bodyColor: 0x33383c, gripColor: 0x1d2023, accentColor: 0x9aa1a8, barrel: 0.58, stock: true, drum: true },
    sound: { type: 'mg', pitch: 0.74, bass: 0.96, tail: 0.62 },
    tags: ['automatic', 'suppressive', 'military', 'heavy', 'anti-vehicle', 'loud'],
  }),
  mk({
    id: 'minigun', name: 'Cyclone Sixgate Rotary', slot: 'heavy', order: 2,
    desc: 'Six barrels, a backpack of linked ammunition, and a spin-up you will learn to time. You cannot sprint. You will not need to.',
    damage: 24, headshotMult: 1.5, limbMult: 0.9,
    fireRateRpm: 2400, auto: true,
    spread: { hip: 6.5, aim: 3.2, moving: 9.5, jump: 18.0 },
    recoil: { vert: 0.55, horiz: 0.9, recovery: 11.0, kick: 0.35 },
    magazine: 500, reserveMax: 2000, reloadTime: 8.0, reloadType: 'mag',
    range: 150, falloffStart: 42, falloffEnd: 108, minDamageFrac: 0.45,
    projectile: 'hitscan', penetration: 0.55,
    zoomFov: 0, tracer: true, shell: true,
    price: 195000, ammoPrice: 1400, ammoPerBuy: 1000, unlockLevel: 38,
    model: { kind: 'minigun', length: 1.26, bodyColor: 0x24282b, gripColor: 0x141617, accentColor: 0x6a7179, barrel: 0.7, drum: true },
    sound: { type: 'mg', pitch: 1.0, bass: 1.0, tail: 0.8 },
    tags: ['automatic', 'suppressive', 'rampage', 'heavy', 'slow-move', 'loud'],
  }),
  mk({
    id: 'rpg', name: 'Skyhammer RPG-8 Harbourmaster', slot: 'heavy', order: 3,
    desc: 'Single tube, single rocket, four seconds to reload. Everything within nine metres files an insurance claim.',
    damage: 110, headshotMult: 1.0, limbMult: 1.0,
    fireRateRpm: 25,
    spread: { hip: 2.2, aim: 0.6, moving: 3.5, jump: 7.0 },
    recoil: { vert: 3.2, horiz: 0.7, recovery: 3.5, kick: 1.9 },
    magazine: 1, reserveMax: 10, reloadTime: 4.0, reloadType: 'mag',
    range: 420, falloffStart: 60, falloffEnd: 400, minDamageFrac: 0.85,
    projectile: 'rocket', muzzleVelocity: 95, penetration: 0.9,
    explosive: { radius: 9.0, damage: 240, force: 4200, fuse: 0 },
    zoomFov: 52, tracer: false,
    price: 86000, ammoPrice: 2200, ammoPerBuy: 3, unlockLevel: 34,
    model: { kind: 'rocket', length: 1.3, bodyColor: 0x35402c, gripColor: 0x20271a, accentColor: 0xb8482a, barrel: 0.9, scopeLen: 0.12 },
    sound: { type: 'rocket', pitch: 0.7, bass: 1.0, tail: 1.1 },
    tags: ['explosive', 'anti-vehicle', 'rampage', 'heavy', 'loud'],
  }),
  mk({
    id: 'grenade-launcher', name: 'Thumper GL-40 Sixpack', slot: 'heavy', order: 4,
    desc: 'Six 40mm rounds in a revolving cylinder. Arcs over cover, bounces around corners, ruins traffic.',
    damage: 60, headshotMult: 1.0, limbMult: 1.0,
    fireRateRpm: 60,
    spread: { hip: 3.0, aim: 1.0, moving: 4.6, jump: 9.0 },
    recoil: { vert: 2.6, horiz: 0.8, recovery: 4.4, kick: 1.25 },
    magazine: 6, reserveMax: 24, reloadTime: 4.4, reloadType: 'mag',
    range: 220, falloffStart: 40, falloffEnd: 200, minDamageFrac: 0.8,
    projectile: 'grenade', muzzleVelocity: 78, penetration: 0.4,
    explosive: { radius: 7.0, damage: 150, force: 2600, fuse: 0.15 },
    zoomFov: 50,
    price: 62000, ammoPrice: 900, ammoPerBuy: 12, unlockLevel: 31,
    model: { kind: 'rocket', length: 0.76, bodyColor: 0x2c3130, gripColor: 0x181b1a, accentColor: 0x8d9497, barrel: 0.34, stock: true, drum: true },
    sound: { type: 'rocket', pitch: 0.95, bass: 0.85, tail: 0.7 },
    tags: ['explosive', 'indirect-fire', 'rampage', 'heavy', 'loud'],
  }),
  mk({
    id: 'flamethrower', name: 'Ember Widowmaker Lance', slot: 'heavy', order: 5,
    desc: 'Backpack tank, gelled fuel, a nine-metre cone. Low per-tick damage that stacks fast and keeps burning.',
    damage: 8, headshotMult: 1.0, limbMult: 1.0,
    fireRateRpm: 900, auto: true,
    spread: { hip: 9.0, aim: 7.0, moving: 10.0, jump: 13.0 },
    recoil: { vert: 0.1, horiz: 0.1, recovery: 14.0, kick: 0.1 },
    magazine: 200, reserveMax: 600, reloadTime: 4.5, reloadType: 'mag',
    range: 11, falloffStart: 6, falloffEnd: 11, minDamageFrac: 0.4,
    projectile: 'flame', muzzleVelocity: 22, penetration: 0,
    zoomFov: 0,
    price: 38000, ammoPrice: 480, ammoPerBuy: 400, unlockLevel: 29,
    model: { kind: 'flame', length: 0.92, bodyColor: 0x6c2a18, gripColor: 0x1e1b18, accentColor: 0xf0902a, barrel: 0.4 },
    sound: { type: 'flame', pitch: 0.9, bass: 0.6, tail: 0.9 },
    tags: ['fire', 'area-denial', 'continuous', 'heavy', 'terrify'],
  }),
  mk({
    id: 'auto-gl', name: 'Thumper AGL-40 Belt', slot: 'heavy', order: 6,
    desc: 'Belt-fed forty-mil. It walks a line of airbursts down a street and does not care what was standing there.',
    damage: 20, headshotMult: 1.0, limbMult: 1.0,
    fireRateRpm: 220, auto: true,
    spread: { hip: 6.0, aim: 2.4, moving: 8.6, jump: 15.0 },
    recoil: { vert: 2.6, horiz: 1.1, recovery: 4.6, kick: 0.9 },
    magazine: 12, reserveMax: 60, reloadTime: 4.2, reloadType: 'mag',
    range: 150, falloffStart: 6, falloffEnd: 150, minDamageFrac: 1.0,
    projectile: 'grenade', muzzleVelocity: 60, penetration: 0.3,
    explosive: { radius: 6.5, damage: 130, force: 1900, fuse: 0 },
    zoomFov: 50, tracer: true, shell: true,
    price: 68000, ammoPrice: 900, ammoPerBuy: 12, unlockLevel: 40,
    model: { kind: 'rocket', length: 0.94, bodyColor: 0x2f3428, gripColor: 0x1b1f17, accentColor: 0x8a9080, barrel: 0.4, stock: true, drum: true },
    sound: { type: 'rocket', pitch: 0.92, bass: 0.85, tail: 0.5 },
    tags: ['explosive', 'automatic', 'military', 'heavy', 'loud'],
  }),
  mk({
    id: 'guided-rpg', name: 'Skyhammer Mk II Lockjaw', slot: 'heavy', order: 7,
    desc: 'Thermal seeker in the nose. Hold the reticle on a vehicle until it chirps, then let go and look away.',
    damage: 30, headshotMult: 1.0, limbMult: 1.0,
    fireRateRpm: 30,
    spread: { hip: 2.4, aim: 0.3, moving: 3.6, jump: 7.0 },
    recoil: { vert: 3.0, horiz: 0.6, recovery: 3.4, kick: 1.1 },
    magazine: 1, reserveMax: 10, reloadTime: 4.0, reloadType: 'mag',
    range: 300, falloffStart: 8, falloffEnd: 300, minDamageFrac: 1.0,
    projectile: 'rocket', muzzleVelocity: 44, penetration: 0.4, homing: 0.6,
    explosive: { radius: 10.0, damage: 300, force: 4200, fuse: 0 },
    zoomFov: 40, tracer: true,
    price: 96000, ammoPrice: 2200, ammoPerBuy: 3, unlockLevel: 45,
    model: { kind: 'rocket', length: 1.28, bodyColor: 0x353b30, gripColor: 0x1e221b, accentColor: 0xb4643a, barrel: 0.9, scopeLen: 0.16 },
    sound: { type: 'rocket', pitch: 0.8, bass: 1.0, tail: 0.8 },
    tags: ['explosive', 'homing', 'anti-vehicle', 'military', 'heavy', 'loud'],
  }),
  mk({
    id: 'compact-lmg', name: 'Groundhog Cub SAW', slot: 'heavy', order: 8,
    desc: 'The belt gun cut down to a sixty-round soft pack. Still a machine gun, now it fits in a boot.',
    damage: 26, headshotMult: 1.9, limbMult: 0.82,
    fireRateRpm: 780, auto: true,
    spread: { hip: 5.6, aim: 1.5, moving: 8.2, jump: 14.6 },
    recoil: { vert: 1.45, horiz: 0.85, recovery: 6.6, kick: 0.58 },
    magazine: 60, reserveMax: 300, reloadTime: 4.0, reloadType: 'mag',
    range: 160, falloffStart: 40, falloffEnd: 112, minDamageFrac: 0.46,
    projectile: 'hitscan', penetration: 0.5,
    zoomFov: 50, tracer: true, shell: true,
    price: 26500, ammoPrice: 460, ammoPerBuy: 180, unlockLevel: 24,
    model: { kind: 'mg', length: 0.86, bodyColor: 0x33383c, gripColor: 0x1d2023, accentColor: 0x8b939a, barrel: 0.36, stock: true, drum: true },
    sound: { type: 'mg', pitch: 0.94, bass: 0.82, tail: 0.44 },
    tags: ['automatic', 'suppressive', 'heavy', 'loud'],
  }),
];

// ---------------------------------------------------------------------------
// THROWN — magazine is the carried count, reloadType 'none'
// ---------------------------------------------------------------------------
const THROWN = [
  mk({
    id: 'grenade', name: 'M-7 Frag Grenade', slot: 'thrown', order: 0,
    desc: 'Three-second fuse from the moment the spoon flies. Cook it or throw it, but decide quickly.',
    damage: 40, headshotMult: 1.0, limbMult: 1.0,
    fireRateRpm: 50,
    spread: { hip: 1.5, aim: 0.5, moving: 2.5, jump: 5.0 },
    recoil: { vert: 0.3, horiz: 0.2, recovery: 9.0, kick: 0.15 },
    magazine: 10, reserveMax: 10, reloadTime: 0, reloadType: 'none',
    range: 42, falloffStart: 2, falloffEnd: 42, minDamageFrac: 1.0,
    projectile: 'grenade', muzzleVelocity: 18, penetration: 0.2,
    explosive: { radius: 8.5, damage: 180, force: 2400, fuse: 3.2 },
    zoomFov: 58,
    price: 240, ammoPrice: 240, ammoPerBuy: 2, unlockLevel: 10,
    model: { kind: 'grenade', length: 0.13, bodyColor: 0x3f4a33, gripColor: 0x2a3122, accentColor: 0xc9b24a },
    sound: { type: 'thrown', pitch: 1.0, bass: 0.3, tail: 0.2 },
    tags: ['explosive', 'thrown', 'timed', 'loud'],
  }),
  mk({
    id: 'molotov', name: 'Mirasol Molotov', slot: 'thrown', order: 1,
    desc: 'Liquor bottle, siphoned fuel, a rag from somebody’s tailgate. Denies ground better than it kills.',
    damage: 22, headshotMult: 1.0, limbMult: 1.0,
    fireRateRpm: 55,
    spread: { hip: 2.2, aim: 0.9, moving: 3.4, jump: 6.0 },
    recoil: { vert: 0.25, horiz: 0.2, recovery: 9.5, kick: 0.12 },
    magazine: 8, reserveMax: 8, reloadTime: 0, reloadType: 'none',
    range: 38, falloffStart: 2, falloffEnd: 38, minDamageFrac: 1.0,
    projectile: 'molotov', muzzleVelocity: 16, penetration: 0,
    explosive: { radius: 5.5, damage: 90, force: 520, fuse: 0 },
    zoomFov: 58,
    price: 160, ammoPrice: 160, ammoPerBuy: 2, unlockLevel: 5,
    model: { kind: 'molotov', length: 0.28, bodyColor: 0x3f7a3a, gripColor: 0xd8cba0, accentColor: 0xf2a03a },
    sound: { type: 'thrown', pitch: 1.15, bass: 0.2, tail: 0.5 },
    tags: ['fire', 'thrown', 'area-denial', 'cheap', 'gang'],
  }),
  mk({
    id: 'sticky-bomb', name: 'Tackpack Adhesive Charge', slot: 'thrown', order: 2,
    desc: 'Sticks to anything with a surface, including moving vehicles. Detonates when you say so, not before.',
    damage: 50, headshotMult: 1.0, limbMult: 1.0,
    fireRateRpm: 40,
    spread: { hip: 1.8, aim: 0.6, moving: 2.8, jump: 5.5 },
    recoil: { vert: 0.3, horiz: 0.2, recovery: 9.0, kick: 0.14 },
    magazine: 6, reserveMax: 6, reloadTime: 0, reloadType: 'none',
    range: 36, falloffStart: 2, falloffEnd: 36, minDamageFrac: 1.0,
    projectile: 'grenade', muzzleVelocity: 15, penetration: 0.5,
    explosive: { radius: 10.0, damage: 220, force: 3400, fuse: 0 },
    zoomFov: 58,
    price: 1100, ammoPrice: 1100, ammoPerBuy: 2, unlockLevel: 21,
    model: { kind: 'grenade', length: 0.16, bodyColor: 0x1f2429, gripColor: 0x141719, accentColor: 0x2ad6a8 },
    sound: { type: 'thrown', pitch: 0.9, bass: 0.35, tail: 0.22 },
    tags: ['explosive', 'thrown', 'remote', 'heist', 'anti-vehicle'],
  }),
  mk({
    id: 'pipe-bomb', name: 'Backlot Pipe Bomb', slot: 'thrown', order: 3,
    desc: 'Threaded pipe, kitchen timer, roofing nails. Four long seconds, then a very wide mess.',
    damage: 30, headshotMult: 1.0, limbMult: 1.0,
    fireRateRpm: 48,
    spread: { hip: 2.6, aim: 1.1, moving: 3.8, jump: 6.5 },
    recoil: { vert: 0.28, horiz: 0.22, recovery: 9.0, kick: 0.13 },
    magazine: 8, reserveMax: 8, reloadTime: 0, reloadType: 'none',
    range: 34, falloffStart: 2, falloffEnd: 34, minDamageFrac: 1.0,
    projectile: 'grenade', muzzleVelocity: 15, penetration: 0.15,
    explosive: { radius: 7.0, damage: 140, force: 1800, fuse: 4.0 },
    zoomFov: 58,
    price: 320, ammoPrice: 320, ammoPerBuy: 2, unlockLevel: 8,
    model: { kind: 'grenade', length: 0.2, bodyColor: 0x6d6a63, gripColor: 0x3a3833, accentColor: 0xc0392b },
    sound: { type: 'thrown', pitch: 0.95, bass: 0.4, tail: 0.28 },
    tags: ['explosive', 'thrown', 'timed', 'improvised', 'cheap'],
  }),
  mk({
    id: 'tear-gas', name: 'Cloudbank CS Canister', slot: 'thrown', order: 4,
    desc: 'Crowd-control smoke. Barely scratches anyone, but nobody in the cloud is shooting straight.',
    damage: 4, headshotMult: 1.0, limbMult: 1.0,
    fireRateRpm: 52,
    spread: { hip: 2.0, aim: 0.8, moving: 3.0, jump: 5.8 },
    recoil: { vert: 0.2, horiz: 0.15, recovery: 10.0, kick: 0.1 },
    magazine: 6, reserveMax: 6, reloadTime: 0, reloadType: 'none',
    range: 40, falloffStart: 2, falloffEnd: 40, minDamageFrac: 1.0,
    projectile: 'grenade', muzzleVelocity: 17, penetration: 0,
    explosive: { radius: 9.5, damage: 14, force: 140, fuse: 2.0 },
    zoomFov: 58,
    price: 280, ammoPrice: 280, ammoPerBuy: 2, unlockLevel: 17,
    model: { kind: 'grenade', length: 0.15, bodyColor: 0x4c5560, gripColor: 0x2b3038, accentColor: 0xe4e9ee },
    sound: { type: 'thrown', pitch: 1.3, bass: 0.15, tail: 0.65 },
    tags: ['thrown', 'nonlethal-ish', 'area-denial', 'police', 'escape'],
  }),
  mk({
    id: 'smoke-grenade', name: 'Driftwood Smoke Pot', slot: 'thrown', order: 5,
    desc: 'Two minutes of grey wall in a can. Kills nobody, ends more chases than anything else in the bag.',
    damage: 4, headshotMult: 1.0, limbMult: 1.0,
    fireRateRpm: 50,
    spread: { hip: 1.5, aim: 0.5, moving: 2.5, jump: 5.0 },
    recoil: { vert: 0.3, horiz: 0.2, recovery: 9.0, kick: 0.12 },
    magazine: 10, reserveMax: 10, reloadTime: 0, reloadType: 'none',
    range: 40, falloffStart: 2, falloffEnd: 40, minDamageFrac: 1.0,
    projectile: 'grenade', muzzleVelocity: 17, penetration: 0.1,
    explosive: { radius: 5.0, damage: 10, force: 200, fuse: 1.8 },
    zoomFov: 58,
    price: 180, ammoPrice: 180, ammoPerBuy: 3, unlockLevel: 8,
    model: { kind: 'grenade', length: 0.14, bodyColor: 0x4a4e53, gripColor: 0x2d3034, accentColor: 0xd8d8d2 },
    sound: { type: 'thrown', pitch: 1.1, bass: 0.18, tail: 0.3 },
    tags: ['thrown', 'smoke', 'nonlethal-ish', 'escape'],
  }),
  mk({
    id: 'flashbang', name: 'Whitewall M84 Stun', slot: 'thrown', order: 6,
    desc: 'One and a half seconds, then everybody in the room is blind and deaf and very cross about it.',
    damage: 6, headshotMult: 1.0, limbMult: 1.0,
    fireRateRpm: 50,
    spread: { hip: 1.5, aim: 0.5, moving: 2.5, jump: 5.0 },
    recoil: { vert: 0.3, horiz: 0.2, recovery: 9.0, kick: 0.12 },
    magazine: 10, reserveMax: 10, reloadTime: 0, reloadType: 'none',
    range: 42, falloffStart: 2, falloffEnd: 42, minDamageFrac: 1.0,
    projectile: 'grenade', muzzleVelocity: 18, penetration: 0.1,
    explosive: { radius: 6.0, damage: 22, force: 500, fuse: 1.5 },
    zoomFov: 58,
    price: 420, ammoPrice: 420, ammoPerBuy: 3, unlockLevel: 14,
    model: { kind: 'grenade', length: 0.13, bodyColor: 0x2f3237, gripColor: 0x1b1d20, accentColor: 0xe2e6ea },
    sound: { type: 'thrown', pitch: 1.35, bass: 0.25, tail: 0.4 },
    tags: ['thrown', 'stun', 'nonlethal-ish', 'breach'],
  }),
  mk({
    id: 'thermite', name: 'Foundry Thermite Charge', slot: 'thrown', order: 7,
    desc: 'Burns through a bank shutter, an engine block, or a safe door. Aim low and stand well back.',
    damage: 10, headshotMult: 1.0, limbMult: 1.0,
    fireRateRpm: 45,
    spread: { hip: 1.8, aim: 0.6, moving: 2.8, jump: 5.4 },
    recoil: { vert: 0.35, horiz: 0.2, recovery: 8.4, kick: 0.16 },
    magazine: 6, reserveMax: 6, reloadTime: 0, reloadType: 'none',
    range: 34, falloffStart: 2, falloffEnd: 34, minDamageFrac: 1.0,
    projectile: 'molotov', muzzleVelocity: 15, penetration: 0.2,
    explosive: { radius: 4.5, damage: 90, force: 600, fuse: 2.4 },
    zoomFov: 58,
    price: 1600, ammoPrice: 1600, ammoPerBuy: 2, unlockLevel: 23,
    model: { kind: 'molotov', length: 0.18, bodyColor: 0x6a5320, gripColor: 0x3c2f12, accentColor: 0xffb03a },
    sound: { type: 'thrown', pitch: 0.9, bass: 0.4, tail: 0.9 },
    tags: ['thrown', 'incendiary', 'breach', 'heist'],
  }),
];

// ---------------------------------------------------------------------------
// SPECIAL
// ---------------------------------------------------------------------------
const SPECIAL = [
  mk({
    id: 'taser', name: 'Volt Cadence X2', slot: 'special', order: 0,
    desc: 'Two barbs on a wire. Drops a target for about six seconds and does almost no damage doing it.',
    damage: 6, headshotMult: 1.0, limbMult: 1.0,
    fireRateRpm: 30,
    spread: { hip: 3.0, aim: 1.2, moving: 5.0, jump: 9.0 },
    recoil: { vert: 0.4, horiz: 0.2, recovery: 8.0, kick: 0.18 },
    magazine: 1, reserveMax: 20, reloadTime: 2.6, reloadType: 'mag',
    range: 12, falloffStart: 8, falloffEnd: 12, minDamageFrac: 0.6,
    projectile: 'taser', muzzleVelocity: 45, penetration: 0,
    zoomFov: 56,
    price: 4400, ammoPrice: 180, ammoPerBuy: 6, unlockLevel: 12,
    model: { kind: 'taser', length: 0.2, bodyColor: 0xf0c419, gripColor: 0x1c1d20, accentColor: 0x2f6fd0 },
    sound: { type: 'taser', pitch: 1.4, bass: 0.2, tail: 0.4 },
    tags: ['nonlethal-ish', 'stun', 'police', 'silent-ish'],
  }),
  mk({
    id: 'flare-gun', name: 'Signal Amber 26.5mm', slot: 'special', order: 1,
    desc: 'Marine distress launcher. One flare, a lazy arc, and anything flammable it lands on.',
    damage: 28, headshotMult: 1.4, limbMult: 1.0,
    fireRateRpm: 30,
    spread: { hip: 4.5, aim: 1.8, moving: 6.5, jump: 11.0 },
    recoil: { vert: 1.6, horiz: 0.5, recovery: 5.0, kick: 0.5 },
    magazine: 1, reserveMax: 12, reloadTime: 2.2, reloadType: 'mag',
    range: 120, falloffStart: 30, falloffEnd: 100, minDamageFrac: 0.7,
    projectile: 'bullet', muzzleVelocity: 62, penetration: 0,
    zoomFov: 56, tracer: true, shell: true,
    price: 1200, ammoPrice: 90, ammoPerBuy: 4, unlockLevel: 2,
    model: { kind: 'pistol', length: 0.22, bodyColor: 0xd9552b, gripColor: 0x2a1d17, accentColor: 0xffd27a, barrel: 0.13 },
    sound: { type: 'pistol', pitch: 1.05, bass: 0.35, tail: 0.45 },
    tags: ['fire', 'signal', 'cheap', 'boat'],
  }),
  mk({
    id: 'fire-extinguisher', name: 'Halcyon Dry-Chem 9kg', slot: 'special', order: 2,
    desc: 'Puts out fires, blinds pursuers, and wins exactly zero gunfights. Surprisingly good at all three jobs it has.',
    damage: 1, headshotMult: 1.0, limbMult: 1.0,
    fireRateRpm: 600, auto: true,
    spread: { hip: 11.0, aim: 9.0, moving: 12.0, jump: 15.0 },
    recoil: { vert: 0.05, horiz: 0.08, recovery: 16.0, kick: 0.05 },
    magazine: 300, reserveMax: 300, reloadTime: 5.0, reloadType: 'mag',
    range: 9, falloffStart: 5, falloffEnd: 9, minDamageFrac: 0.5,
    projectile: 'flame', muzzleVelocity: 20, penetration: 0,
    zoomFov: 0,
    price: 300, ammoPrice: 60, ammoPerBuy: 300, unlockLevel: 0,
    model: { kind: 'flame', length: 0.52, bodyColor: 0xb0241c, gripColor: 0x16181a, accentColor: 0xc8ccd0, barrel: 0.16 },
    sound: { type: 'flame', pitch: 1.5, bass: 0.18, tail: 0.5 },
    tags: ['nonlethal-ish', 'utility', 'firefighting', 'continuous'],
  }),
  mk({
    id: 'nail-gun', name: 'Civicworks Framer', slot: 'special', order: 3,
    desc: 'A pneumatic framing nailer with the safety filed off. Contractors hate this one weird trick.',
    damage: 16, headshotMult: 2.4, limbMult: 0.8,
    fireRateRpm: 260, auto: true,
    spread: { hip: 5.0, aim: 2.0, moving: 7.5, jump: 12.0 },
    recoil: { vert: 0.5, horiz: 0.2, recovery: 9.0, kick: 0.14 },
    magazine: 40, reserveMax: 240, reloadTime: 2.0, reloadType: 'mag',
    range: 34, falloffStart: 8, falloffEnd: 24, minDamageFrac: 0.3,
    projectile: 'hitscan',
    price: 900, ammoPrice: 60, ammoPerBuy: 120, unlockLevel: 2,
    model: { kind: 'pistol', length: 0.3, bodyColor: 0xd0a01c, gripColor: 0x24262a, accentColor: 0x8d9298, barrel: 0.08 },
    sound: { type: 'pistol', pitch: 1.5, bass: 0.22, tail: 0.1 },
    tags: ['improvised', 'cheap', 'quiet-ish'],
  }),
  mk({
    id: 'speargun', name: 'Marlinco Bluewater', slot: 'special', order: 4,
    desc: 'Rubber-powered and meant for grouper. Silent, slow to reload, and disconcertingly effective on land.',
    damage: 85, headshotMult: 2.0, limbMult: 0.7,
    fireRateRpm: 26, silenced: true,
    spread: { hip: 2.0, aim: 0.3, moving: 5.0, jump: 9.0 },
    recoil: { vert: 0.6, horiz: 0.2, recovery: 6.0, kick: 0.3 },
    magazine: 1, reserveMax: 12, reloadTime: 2.3, reloadType: 'mag',
    range: 60, falloffStart: 25, falloffEnd: 50, minDamageFrac: 0.7,
    projectile: 'bullet', muzzleVelocity: 62,
    price: 1600, ammoPrice: 90, ammoPerBuy: 6, unlockLevel: 5,
    model: { kind: 'rifle', length: 0.9, bodyColor: 0x1d4f63, gripColor: 0x14181b, accentColor: 0xb9c2c8, barrel: 0.5, stock: false, mag: false },
    sound: { type: 'thrown', pitch: 1.1, bass: 0.3, tail: 0.12 },
    tags: ['silenced', 'stealth', 'improvised'],
  }),
  mk({
    id: 'tranq-gun', name: 'Glades Vet Special', slot: 'special', order: 5,
    desc: 'Loaded for alligators, which is more sedative than a person strictly needs.',
    damage: 8, headshotMult: 1.2, limbMult: 1.0,
    fireRateRpm: 40, silenced: true,
    spread: { hip: 3.0, aim: 0.4, moving: 6.0, jump: 10.0 },
    recoil: { vert: 0.4, horiz: 0.1, recovery: 8.0, kick: 0.16 },
    magazine: 1, reserveMax: 20, reloadTime: 1.8, reloadType: 'mag',
    range: 55, falloffStart: 22, falloffEnd: 45, minDamageFrac: 0.9,
    projectile: 'bullet', muzzleVelocity: 48,
    price: 7200, ammoPrice: 180, ammoPerBuy: 10, unlockLevel: 14,
    model: { kind: 'rifle', length: 0.78, bodyColor: 0x2f4434, gripColor: 0x1a231c, accentColor: 0xa8b0a4, barrel: 0.42, stock: true, mag: false },
    sound: { type: 'thrown', pitch: 1.25, bass: 0.2, tail: 0.1 },
    tags: ['silenced', 'stealth', 'non-lethal'],
  }),
  mk({
    id: 'signal-launcher', name: 'Port Esperanza Star Shell', slot: 'special', order: 6,
    desc: 'Throws a burning star four hundred feet up. Coastguard issue, and a genuinely terrible idea indoors.',
    damage: 45, headshotMult: 1.4, limbMult: 0.9,
    fireRateRpm: 34,
    spread: { hip: 4.0, aim: 1.2, moving: 7.0, jump: 11.0 },
    recoil: { vert: 1.6, horiz: 0.4, recovery: 5.0, kick: 0.5 },
    magazine: 1, reserveMax: 16, reloadTime: 2.0, reloadType: 'mag',
    range: 90, falloffStart: 30, falloffEnd: 70, minDamageFrac: 0.6,
    projectile: 'bullet', muzzleVelocity: 52,
    price: 2600, ammoPrice: 140, ammoPerBuy: 8, unlockLevel: 7,
    model: { kind: 'pistol', length: 0.24, bodyColor: 0xd8541c, gripColor: 0x2a1a12, accentColor: 0xf0c25a, barrel: 0.12 },
    sound: { type: 'thrown', pitch: 0.95, bass: 0.5, tail: 0.4 },
    tags: ['incendiary', 'improvised', 'signal'],
  }),
];

export const WEAPONS = Object.freeze([
  ...FISTS, ...MELEE, ...PISTOLS, ...SMGS, ...SHOTGUNS,
  ...RIFLES, ...SNIPERS, ...HEAVY, ...THROWN, ...SPECIAL,
]);

const BY_ID = new Map(WEAPONS.map((w) => [w.id, w]));
const BY_SLOT = new Map(WEAPON_SLOTS.map((s) => [s, Object.freeze(WEAPONS.filter((w) => w.slot === s))]));

/** Look up a weapon definition by id. */
export const getWeapon = (id) => BY_ID.get(id);

/** All weapons in a slot, already sorted by `order` (frozen array; never mutate). */
export const weaponsBySlot = (slot) => BY_SLOT.get(slot) || EMPTY;
const EMPTY = Object.freeze([]);

/** Default loadout order for the weapon wheel: slot order, then `order`. */
export const weaponWheel = () => WEAPONS.map((w) => w.id);

/**
 * Sustained damage per second, reloads included.
 * Melee uses swing time; guns use magazine / (fire time + reload); shell-fed
 * guns pay reloadTime per shell. Explosive payload is added to the per-shot
 * damage so launchers are comparable to bullet weapons on a single target.
 */
export function dpsOf(def) {
  if (!def) return 0;
  if (def.projectile === 'melee') {
    const swing = def.melee?.swingTime || 60 / Math.max(1, def.fireRateRpm);
    return (def.damage * Math.max(1, def.pellets)) / Math.max(0.05, swing);
  }
  const perShot = def.damage * Math.max(1, def.pellets) + (def.explosive ? def.explosive.damage : 0);
  const shotInterval = 60 / Math.max(1, def.fireRateRpm);
  const mag = def.magazine > 0 ? def.magazine : 1;
  const reload = def.reloadType === 'shell' ? def.reloadTime * mag
    : def.reloadType === 'mag' ? def.reloadTime
      : 0;
  const cycle = mag * shotInterval + reload;
  return cycle > 0 ? (mag * perShot) / cycle : 0;
}

/** Rounds per second, ignoring reloads — used by the HUD and by recoil tuning. */
export const rpsOf = (def) => (def ? def.fireRateRpm / 60 : 0);

/** Burst damage available without reloading (one full magazine / carried stack). */
export const magazineDamage = (def) => {
  if (!def) return 0;
  if (def.projectile === 'melee') return def.damage;
  const perShot = def.damage * Math.max(1, def.pellets) + (def.explosive ? def.explosive.damage : 0);
  return perShot * Math.max(1, def.magazine);
};

/** Damage multiplier at distance d, applying the falloff ramp. */
export function damageAtRange(def, d) {
  if (!def || d > def.range) return 0;
  if (d <= def.falloffStart) return 1;
  if (d >= def.falloffEnd) return def.minDamageFrac;
  const t = (d - def.falloffStart) / (def.falloffEnd - def.falloffStart);
  return 1 + (def.minDamageFrac - 1) * t;
}

const DPS_BANDS = {
  fists: [15, 45],
  melee: [25, 150],
  pistol: [50, 115],
  smg: [90, 190],
  shotgun: [140, 300],
  rifle: [120, 175],
  sniper: [35, 115],
  heavy: [40, 700],
  thrown: [10, 400],   // the low end is the CS canister, which is utility, not damage
  special: [0.5, 60],
};

/**
 * Self-check for the catalog. Returns an array of human-readable problem
 * strings; an empty array means the data satisfies the contract.
 */
/**
 * @param {object[]} [list] the catalogue to check; defaults to the real one.
 *   Passing a copy is how tools/verify-guards.mjs proves this function still
 *   objects when the data is wrong.
 */
export function validateWeapons(list = WEAPONS) {
  const WEAPONS = list;
  const BY_ID = new Map(list.map((w) => [w.id, w]));
  const problems = [];
  const seenId = new Set();
  const seenSlotOrder = new Set();
  const usedSlots = new Set();

  if (WEAPONS.length < 26) problems.push(`WEAPONS has ${WEAPONS.length} entries, contract requires >= 26`);

  for (const w of WEAPONS) {
    const at = (msg) => problems.push(`${w.id || '<no id>'}: ${msg}`);

    if (!w.id || typeof w.id !== 'string') { problems.push('entry with missing/invalid id'); continue; }
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(w.id)) at('id is not kebab-case');
    if (seenId.has(w.id)) at('duplicate id');
    seenId.add(w.id);

    if (!w.name || typeof w.name !== 'string') at('missing name');
    if (!WEAPON_SLOTS.includes(w.slot)) at(`slot "${w.slot}" is not in WEAPON_SLOTS`);
    usedSlots.add(w.slot);
    if (!Number.isInteger(w.order) || w.order < 0) at('order must be a non-negative integer');
    const key = `${w.slot}#${w.order}`;
    if (seenSlotOrder.has(key)) at(`duplicate (slot, order) pair ${key}`);
    seenSlotOrder.add(key);

    // --- damage model ---
    if (!(w.damage > 0)) at('damage must be > 0');
    if (!(w.headshotMult >= 1)) at('headshotMult must be >= 1');
    if (!(w.limbMult > 0 && w.limbMult <= 1)) at('limbMult must be in (0, 1]');
    if (!(w.pellets >= 1 && Number.isInteger(w.pellets))) at('pellets must be an integer >= 1');
    if (!(w.fireRateRpm > 0 && w.fireRateRpm <= 6000)) at('fireRateRpm must be in (0, 6000]');
    if (typeof w.auto !== 'boolean') at('auto must be a boolean');
    if (!Number.isInteger(w.burst) || w.burst < 0) at('burst must be an integer >= 0');
    if (w.auto && w.burst > 0) at('cannot be both auto and burst');

    // --- spread / recoil ---
    for (const k of ['hip', 'aim', 'moving', 'jump']) {
      if (typeof w.spread[k] !== 'number' || w.spread[k] < 0 || w.spread[k] > 40) at(`spread.${k} out of range 0..40`);
    }
    if (w.spread.aim > w.spread.hip) at('spread.aim must be <= spread.hip');
    if (w.spread.jump < w.spread.moving) at('spread.jump must be >= spread.moving');
    for (const k of ['vert', 'horiz', 'kick']) {
      if (typeof w.recoil[k] !== 'number' || w.recoil[k] < 0 || w.recoil[k] > 12) at(`recoil.${k} out of range 0..12`);
    }
    if (!(w.recoil.recovery > 0)) at('recoil.recovery must be > 0');

    // --- ammo ---
    if (!Number.isInteger(w.magazine) || w.magazine < 0) at('magazine must be an integer >= 0');
    if (!Number.isInteger(w.reserveMax) || w.reserveMax < 0) at('reserveMax must be an integer >= 0');
    if (!['mag', 'shell', 'none'].includes(w.reloadType)) at(`reloadType "${w.reloadType}" invalid`);
    if (w.reloadType === 'none' && w.reloadTime !== 0) at('reloadType none must have reloadTime 0');
    if (w.reloadType !== 'none' && !(w.reloadTime > 0)) at('reloadTime must be > 0 when reloading');
    if (w.magazine > 0 && w.reserveMax < w.magazine) at('reserveMax must be >= magazine');

    // --- ranges ---
    if (!(w.range > 0)) at('range must be > 0');
    if (!(w.falloffStart >= 0)) at('falloffStart must be >= 0');
    if (!(w.falloffStart < w.falloffEnd)) at('falloffStart must be < falloffEnd');
    if (!(w.falloffEnd <= w.range)) at('falloffEnd must be <= range');
    if (!(w.minDamageFrac > 0 && w.minDamageFrac <= 1)) at('minDamageFrac must be in (0, 1]');
    if (!(w.penetration >= 0 && w.penetration <= 1)) at('penetration must be in 0..1');
    if (!(w.homing >= 0 && w.homing <= 1)) at('homing must be in 0..1');
    if (w.homing > 0 && w.projectile !== 'rocket') at('homing is only supported on rocket projectiles');
    if (!(w.zoomFov === 0 || (w.zoomFov >= 8 && w.zoomFov <= 70))) at('zoomFov must be 0 or 8..70');
    if (w.scope && w.zoomFov === 0) at('scope true requires a zoomFov');

    // --- projectile ---
    if (!PROJECTILE_KINDS.includes(w.projectile)) at(`projectile "${w.projectile}" invalid`);
    const hitscanish = w.projectile === 'hitscan' || w.projectile === 'melee' || w.projectile === 'none';
    if (hitscanish && w.muzzleVelocity !== 0) at('hitscan/melee must have muzzleVelocity 0');
    if (!hitscanish && !(w.muzzleVelocity > 0)) at('travelling projectiles need muzzleVelocity > 0');

    // --- melee contract ---
    const isMeleeSlot = w.slot === 'melee' || w.slot === 'fists';
    if (isMeleeSlot) {
      if (w.projectile !== 'melee') at('melee/fists slot must use projectile "melee"');
      if (w.magazine !== 0) at('melee weapons must have magazine 0');
      if (!w.melee) at('melee weapons need a populated melee block');
    }
    if (w.melee) {
      if (!(w.melee.arc > 0 && w.melee.arc <= 180)) at('melee.arc must be in (0, 180]');
      if (!(w.melee.reach > 0 && w.melee.reach <= 3)) at('melee.reach must be in (0, 3]');
      if (!(w.melee.swingTime > 0 && w.melee.swingTime <= 2)) at('melee.swingTime must be in (0, 2]');
      if (!(w.melee.stagger >= 0 && w.melee.stagger <= 2)) at('melee.stagger must be in 0..2');
      if (Math.abs(w.melee.reach - w.range) > 0.26) at('melee.reach should match range');
    } else if (w.projectile === 'melee') {
      at('projectile "melee" requires a melee block');
    }

    // --- thrown contract ---
    if (w.slot === 'thrown') {
      if (!['grenade', 'molotov'].includes(w.projectile)) at('thrown slot must use projectile grenade|molotov');
      if (!w.explosive) at('thrown weapons need an explosive block');
      if (!(w.magazine > 0)) at('thrown magazine is the carried count and must be > 0');
      if (w.reserveMax !== w.magazine) at('thrown reserveMax should equal the carried count');
      if (w.reloadType !== 'none') at('thrown weapons do not reload');
    }
    if (w.explosive) {
      const e = w.explosive;
      if (!(e.radius > 0 && e.radius <= 30)) at('explosive.radius must be in (0, 30]');
      if (!(e.damage > 0 && e.damage <= 600)) at('explosive.damage must be in (0, 600]');
      if (!(e.force >= 0 && e.force <= 20000)) at('explosive.force out of range');
      if (!(e.fuse >= 0 && e.fuse <= 10)) at('explosive.fuse must be in 0..10');
    }

    // --- flags, economy, presentation ---
    for (const k of ['scope', 'silenced', 'tracer', 'shell']) {
      if (typeof w[k] !== 'boolean') at(`${k} must be a boolean`);
    }
    if (!(w.price >= 0)) at('price must be >= 0');
    if (!(w.ammoPrice >= 0)) at('ammoPrice must be >= 0');
    if (!(w.ammoPerBuy >= 0)) at('ammoPerBuy must be >= 0');
    if (w.magazine > 0 && w.ammoPerBuy === 0 && w.price > 0) at('purchasable firearm needs ammoPerBuy > 0');
    if (!Number.isInteger(w.unlockLevel) || w.unlockLevel < 0 || w.unlockLevel > 50) at('unlockLevel must be 0..50');

    if (!MODEL_KINDS.includes(w.model.kind)) at(`model.kind "${w.model.kind}" invalid`);
    if (!(w.model.length > 0 && w.model.length <= 2)) at('model.length must be in (0, 2] metres');
    for (const k of ['bodyColor', 'gripColor', 'accentColor']) {
      const c = w.model[k];
      if (!Number.isInteger(c) || c < 0 || c > 0xffffff) at(`model.${k} must be a 24-bit colour int`);
    }
    if (!SOUND_KINDS.includes(w.sound.type)) at(`sound.type "${w.sound.type}" invalid`);
    if (!(w.sound.pitch > 0.2 && w.sound.pitch < 3)) at('sound.pitch out of range');
    if (!(w.sound.bass >= 0 && w.sound.bass <= 1)) at('sound.bass must be 0..1');
    if (!(w.sound.tail >= 0 && w.sound.tail <= 2)) at('sound.tail must be 0..2');
    if (!Array.isArray(w.tags) || w.tags.length === 0) at('tags must be a non-empty array');

    // --- balance band ---
    const band = DPS_BANDS[w.slot];
    if (band) {
      const dps = dpsOf(w);
      if (!(dps >= band[0] && dps <= band[1])) {
        at(`sustained DPS ${dps.toFixed(1)} outside the ${w.slot} band ${band[0]}..${band[1]}`);
      }
    }
  }

  for (const s of WEAPON_SLOTS) {
    if (!usedSlots.has(s)) problems.push(`slot "${s}" has no weapons`);
  }

  // Every weapon the design doc explicitly calls for must exist.
  const REQUIRED = [
    'fists', 'brass-knuckles', 'combat-knife', 'baseball-bat', 'crowbar', 'machete', 'katana',
    'sledgehammer', 'chainsaw', 'pistol-9', 'combat-pistol', 'heavy-revolver', 'pistol-50',
    'machine-pistol', 'micro-smg', 'smg', 'assault-smg', 'pump-shotgun', 'sawn-off-shotgun',
    'combat-shotgun', 'carbine-rifle', 'assault-rifle', 'bullpup-rifle', 'sniper-rifle',
    'heavy-sniper', 'lmg', 'minigun', 'rpg', 'grenade-launcher', 'grenade', 'molotov',
    'sticky-bomb', 'pipe-bomb', 'flamethrower', 'taser', 'flare-gun',
  ];
  for (const id of REQUIRED) if (!BY_ID.has(id)) problems.push(`required weapon "${id}" is missing`);

  return problems;
}
