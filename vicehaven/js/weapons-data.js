/*
 * weapons-data.js — every weapon in Vicehaven, as data.
 *
 *   VH.Data.weaponSlots   the eight weapon-wheel slots, clockwise from the top
 *   VH.Data.weapons       ordered weapon definitions (the order is the order a
 *                         slot cycles through its weapons)
 *   VH.Data.weaponsById   the same definitions keyed by id
 *   VH.Data.weaponDamage  damage of one hit (one pellet for a shotgun) after
 *                         range falloff and the headshot multiplier
 *
 * Balance targets (NPCs have 100 health, 150 with armour):
 *   pistol    3 body shots (4 past 25 m), 1 headshot, even against armour
 *   revolver  2 body shots, 1 headshot
 *   smg       shreds inside 10 m, sprays and weakens past that
 *   shotgun   one blast kills inside 8 m; weak past 20 m
 *   rifle     3 body shots, accurate out to 150 m
 *   sniper    one body shot kills an unarmoured target, a headshot kills anyone
 *
 * Fields (units are metres, seconds and radians):
 *   id, name, slot, kind      kind: 'melee' | 'hitscan' | 'pellets' | 'thrown'
 *   damage                    per hit; per pellet for 'pellets'; blast damage at
 *                             the centre for a grenade; splash for a molotov
 *   headshotMult              multiplier for a hit to the head
 *   fireRate, auto            shots (or swings) per second; hold to keep firing
 *   range                     max hitscan range, or melee reach
 *   spread, aimSpread         (no longer used for Jay's shots: combat.js puts
 *   bloom, bloomMax            single shots dead on the crosshair, gives the
 *                              automatics a small spread and the shotgun a
 *                              pellet pattern round the centre)
 *   pellets                   pellets per shell (shotgun)
 *   magSize, reloadTime       0 for melee; a grenade's "mag" is one grenade
 *                             (spare rounds live in the shared ammo pools)
 *   shellReload, shellTime    loads one shell at a time (shotgun)
 *   maxAmmo, startAmmo        reserve cap and the ammo that comes with a pickup
 *   price, ammoPrice          at the gun shop; ammoPrice buys one magazine
 *   recoil                    camera pitch kick per shot
 *   shake                     camera shake per shot, 0..1
 *   tracer                    draw a tracer streak
 *   zoom                      aim FOV multiplier (the sniper has a scope)
 *   falloff                   { start, end, min }: full damage to `start`,
 *                             easing linearly to damage * min at `end`
 *   drivebyAllowed            can be fired from a car window
 *   throwSpeed, fuse          thrown weapons; fuse 0 = bursts on impact
 *   blastRadius               grenade blast or molotov fire-pool radius
 *   fireDuration, burnDps     molotov fire pool
 *   knockback                 impulse (m/s) given to what it hits
 *   hold                      animation hint: 'none' 'pistol' 'rifle' 'melee'
 *                             'melee2h' 'thrown' 'heavy' (at the hip)
 *   hipSpread                 extra spread (rad) for a single shot fired without
 *                             aiming (automatics and shotguns have their own)
 *   kickVis, fovPunch         how hard the view jumps per shot (rad, degrees);
 *                             purely visual, the aim point stays put
 *   recoilRecover             how quickly aim recoil settles (rad/s)
 *   ammoType                  which shared ammo pool it draws on (VH.Data.ammoTypes:
 *                             the pistol and the Wasp both take 9 mm, every
 *                             shotgun takes 12 gauge); null for melee
 *   moveMult                  how fast Jay moves carrying it (heavy weapons < 1)
 *   shopAfter                 the story job after which Bayline Arms sells it
 *                             (an id or a list of ids; null: always)
 *   stun                      seconds a hit knocks someone down (the stun gun)
 *   projectile                { speed, gravity, fuse, bounce, model } for
 *                             launched explosives (rocket, 40 mm grenade)
 *   spinUp                    seconds the barrels take to spin up (minigun)
 *   sticky                    a thrown charge sticks where it lands and goes
 *                             off on command (R)
 *   soundPitch, soundLevel    variations on a shared sound profile
 *   flash                     muzzle-flash scale
 *   sound                     sound profile for VH.AudioEngine#gunshot
 */
(function () {
  'use strict';

  const VH = window.VH;
  VH.Data = VH.Data || {};

  VH.Data.weaponSlots = [
    { id: 'unarmed', name: 'Unarmed' },
    { id: 'melee', name: 'Melee' },
    { id: 'pistol', name: 'Pistol' },
    { id: 'smg', name: 'SMG' },
    { id: 'shotgun', name: 'Shotgun' },
    { id: 'rifle', name: 'Rifle' },
    { id: 'sniper', name: 'Sniper' },
    { id: 'thrown', name: 'Thrown' },
    { id: 'heavy', name: 'Heavy' },
  ];

  /**
   * Shared ammo pools: every gun that takes the same rounds draws on the same
   * reserve, so picking up 9 mm feeds the Kestrel and the Wasp alike.
   *   name   what the HUD and the shop call it
   *   max    the most Jay can carry
   *   box    how many come in one box (shop, pickups, drops)
   *   price  one box at Bayline Arms
   */
  VH.Data.ammoTypes = {
    '9mm': { name: '9 mm rounds', max: 360, box: 45, price: 60 },
    '44': { name: '.44 rounds', max: 72, box: 12, price: 80 },
    '57': { name: '5.7 mm rounds', max: 540, box: 90, price: 120 },
    '12g': { name: '12 gauge shells', max: 90, box: 12, price: 90 },
    '556': { name: '5.56 rounds', max: 360, box: 60, price: 110 },
    '762': { name: '7.62 rounds', max: 1200, box: 200, price: 300 },
    '308': { name: '.308 rounds', max: 100, box: 10, price: 150 },
    stun: { name: 'stun cartridges', max: 24, box: 6, price: 60 },
    rocket: { name: 'rockets', max: 10, box: 1, price: 1200 },
    '40mm': { name: '40 mm grenades', max: 36, box: 6, price: 900 },
    grenade: { name: 'grenades', max: 10, box: 1, price: 250 },
    molotov: { name: 'molotovs', max: 10, box: 1, price: 150 },
    limpet: { name: 'limpet charges', max: 8, box: 1, price: 400 },
  };

  // Defaults shared by every definition; each weapon overrides what it needs.
  const BASE = {
    kind: 'hitscan',
    damage: 10,
    headshotMult: 1,
    fireRate: 1,
    auto: false,
    range: 50,
    spread: 0,
    aimSpread: 0,
    bloom: 0,
    bloomMax: 0,
    bloomRecover: 0.5,
    pellets: 1,
    magSize: 0,
    reloadTime: 0,
    shellReload: false,
    shellTime: 0,
    maxAmmo: 0,
    startAmmo: 0,
    price: 0,
    ammoPrice: 0,
    recoil: 0,
    shake: 0,
    tracer: false,
    zoom: 1,
    falloff: null,
    drivebyAllowed: false,
    throwSpeed: 0,
    fuse: 0,
    blastRadius: 0,
    fireDuration: 0,
    burnDps: 0,
    knockback: 0,
    hold: 'pistol',
    flash: 1,
    sound: 'none',
    desc: '',
    hipSpread: 0,
    kickVis: 0,
    fovPunch: 0,
    recoilRecover: 0.12,
    ammoType: null,
    moveMult: 1,
    shopAfter: null,
    stun: 0,
    projectile: null,
    spinUp: 0,
    sticky: false,
    soundPitch: 1,
    soundLevel: 1,
  };

  const LIST = [
    // ------------------------------------------------------------- melee
    {
      id: 'fists', name: 'Fists', slot: 'unarmed', kind: 'melee',
      damage: 12, headshotMult: 1.5, fireRate: 2.4, range: 1.3, knockback: 2.5,
      hold: 'none', sound: 'melee',
      desc: 'Always with you. Good for settling arguments, bad for winning gunfights.',
    },
    {
      id: 'bat', name: 'Baseball Bat', slot: 'melee', kind: 'melee',
      damage: 38, headshotMult: 1.6, fireRate: 1.3, range: 1.9, knockback: 6,
      price: 100, hold: 'melee2h', sound: 'melee',
      desc: 'Ash wood with a taped grip. Three solid swings put most people down.',
    },
    {
      id: 'knife', name: 'Combat Knife', slot: 'melee', kind: 'melee',
      damage: 45, headshotMult: 1.5, fireRate: 2.0, range: 1.5, knockback: 1.5,
      price: 250, hold: 'melee', sound: 'melee',
      desc: 'Quick, quiet and close. A clip-point blade with a rubber grip.',
    },

    // ----------------------------------------------------------- pistols
    {
      id: 'pistol', name: 'Kestrel 9', slot: 'pistol', kind: 'hitscan',
      damage: 34, headshotMult: 4.5, fireRate: 4.5, range: 60,
      spread: 0.035, aimSpread: 0.007,
      magSize: 15, reloadTime: 1.35, maxAmmo: 225, startAmmo: 60,
      price: 400, ammoPrice: 45,
      recoil: 0.032, shake: 0.12, tracer: true, zoom: 0.8,
      falloff: { start: 25, end: 60, min: 0.55 },
      drivebyAllowed: true, hold: 'pistol', flash: 0.8, sound: 'pistol',
      hipSpread: 0.012, kickVis: 0.022, fovPunch: 0.8, ammoType: '9mm', shopAfter: 'm02_what_she_left',
      desc: 'A polymer-frame 9 mm. Light, reliable and fast on target. Three to the body or one to the head.',
    },
    {
      id: 'revolver', name: 'Hammerhead .44', slot: 'pistol', kind: 'hitscan',
      damage: 60, headshotMult: 2.6, fireRate: 1.5, range: 70,
      spread: 0.04, aimSpread: 0.005,
      magSize: 6, reloadTime: 2.4, maxAmmo: 72, startAmmo: 24,
      price: 1200, ammoPrice: 80,
      recoil: 0.1, shake: 0.32, tracer: true, zoom: 0.78,
      falloff: { start: 30, end: 70, min: 0.6 },
      drivebyAllowed: true, hold: 'pistol', flash: 1.25, sound: 'revolver', knockback: 6,
      hipSpread: 0.02, kickVis: 0.055, fovPunch: 1.8, ammoType: '44', shopAfter: 'm13_pension',
      desc: 'A stainless six-shooter with a heavy barrel. Slow to reload, but two hits end any fight.',
    },

    // --------------------------------------------------------------- smg
    {
      id: 'smg', name: 'Wasp', slot: 'smg', kind: 'hitscan',
      damage: 18, headshotMult: 2, fireRate: 14, auto: true, range: 45,
      spread: 0.07, aimSpread: 0.03, bloom: 0.006, bloomMax: 0.06, bloomRecover: 0.35,
      magSize: 32, reloadTime: 1.9, maxAmmo: 480, startAmmo: 128,
      price: 1500, ammoPrice: 70,
      recoil: 0.016, shake: 0.07, tracer: true, zoom: 0.82,
      falloff: { start: 15, end: 45, min: 0.55 },
      drivebyAllowed: true, hold: 'pistol', flash: 0.75, sound: 'smg',
      kickVis: 0.012, fovPunch: 0.35, recoilRecover: 0.1, ammoType: '9mm', shopAfter: 'm07_signal_fire',
      desc: 'A compact machine pistol with a wire stock. It empties a magazine in under three seconds; aim close.',
    },

    // ----------------------------------------------------------- shotgun
    {
      id: 'shotgun', name: 'Gator 12', slot: 'shotgun', kind: 'pellets',
      damage: 16, headshotMult: 1.4, fireRate: 1.1, range: 32, pellets: 9,
      spread: 0.12, aimSpread: 0.085,
      magSize: 6, reloadTime: 2.9, shellReload: true, shellTime: 0.42,
      maxAmmo: 64, startAmmo: 18,
      price: 2200, ammoPrice: 90,
      recoil: 0.11, shake: 0.45, tracer: false, zoom: 0.85,
      falloff: { start: 9, end: 26, min: 0.15 },
      knockback: 9, hold: 'rifle', flash: 1.5, sound: 'shotgun',
      kickVis: 0.06, fovPunch: 2.4, ammoType: '12g', shopAfter: 'm10_sons',
      desc: 'A pump-action 12 gauge. Inside eight metres nothing walks away from it.',
    },

    // ------------------------------------------------------------- rifle
    {
      id: 'rifle', name: 'Mantis AC-7', slot: 'rifle', kind: 'hitscan',
      damage: 36, headshotMult: 3, fireRate: 9, auto: true, range: 150,
      spread: 0.04, aimSpread: 0.006, bloom: 0.003, bloomMax: 0.025, bloomRecover: 0.3,
      magSize: 30, reloadTime: 2.1, maxAmmo: 360, startAmmo: 90,
      price: 4000, ammoPrice: 110,
      recoil: 0.024, shake: 0.1, tracer: true, zoom: 0.7,
      falloff: { start: 60, end: 150, min: 0.6 },
      hold: 'rifle', flash: 1.1, sound: 'rifle',
      kickVis: 0.014, fovPunch: 0.45, recoilRecover: 0.08, ammoType: '556', shopAfter: 'm17_canary',
      desc: 'A short-barrelled assault carbine with a reflex sight. Accurate, hard hitting and easy to control.',
    },

    // ------------------------------------------------------------ sniper
    {
      id: 'sniper', name: 'Heron LR', slot: 'sniper', kind: 'hitscan',
      damage: 110, headshotMult: 4, fireRate: 0.8, range: 450,
      spread: 0.09, aimSpread: 0,
      magSize: 5, reloadTime: 2.9, maxAmmo: 50, startAmmo: 15,
      price: 7000, ammoPrice: 150,
      recoil: 0.14, shake: 0.3, tracer: true, zoom: 0.28,
      falloff: { start: 300, end: 450, min: 0.85 },
      knockback: 8, hold: 'rifle', flash: 1.3, sound: 'sniper',
      hipSpread: 0.09, kickVis: 0.07, fovPunch: 2, ammoType: '308', shopAfter: 'm20_overwatch',
      desc: 'A bolt-action long rifle with a 6x scope. Useless from the hip, merciless through the glass.',
    },

    // ------------------------------------------------------------ thrown
    {
      id: 'grenade', name: 'Frag Grenade', slot: 'thrown', kind: 'thrown',
      damage: 180, fireRate: 1, range: 40,
      magSize: 1, maxAmmo: 10, startAmmo: 3, price: 250, ammoPrice: 250,
      throwSpeed: 17, fuse: 3.2, blastRadius: 7, knockback: 12,
      hold: 'thrown', sound: 'thrown', ammoType: 'grenade', shopAfter: 'm25_iron',
      desc: 'Pull the pin, count to three. Deadly within seven metres; cook it and it bounces less.',
    },
    {
      id: 'molotov', name: 'Molotov', slot: 'thrown', kind: 'thrown',
      damage: 20, fireRate: 1, range: 35,
      magSize: 1, maxAmmo: 10, startAmmo: 3, price: 150, ammoPrice: 150,
      throwSpeed: 15, fuse: 0, blastRadius: 3.5, fireDuration: 9, burnDps: 22,
      hold: 'thrown', sound: 'thrown', ammoType: 'molotov', shopAfter: ['da3_jammer', 'm23_ashes'],
      desc: 'A bottle of fuel and a burning rag. It bursts on impact and leaves a pool of fire.',
    },

    // ======================================================= v1.3 arsenal
    {
      id: 'golfclub', name: 'Fairway 7-Iron', slot: 'melee', kind: 'melee',
      damage: 34, headshotMult: 1.7, fireRate: 1.4, range: 2.0, knockback: 8,
      price: 150, hold: 'melee2h', sound: 'melee',
      desc: 'A steel-shafted seven iron from the Crestline pro shop. Long reach, and it sends people flying.',
    },
    {
      id: 'crowbar', name: 'Pry Bar', slot: 'melee', kind: 'melee',
      damage: 42, headshotMult: 1.5, fireRate: 1.6, range: 1.6, knockback: 5,
      price: 200, hold: 'melee', sound: 'melee',
      desc: 'Forged steel, painted red. Opens crates, doors and arguments.',
    },
    {
      id: 'taser', name: 'Jolt Stun Gun', slot: 'pistol', kind: 'hitscan',
      damage: 4, headshotMult: 1, fireRate: 1.2, range: 11, stun: 5,
      magSize: 1, reloadTime: 1.1, maxAmmo: 24, startAmmo: 8,
      price: 600, ammoPrice: 25,
      recoil: 0.01, shake: 0.05, tracer: true, zoom: 0.85, flash: 0.4,
      hipSpread: 0.01, kickVis: 0.01, fovPunch: 0.3,
      drivebyAllowed: false, hold: 'pistol', sound: 'taser', ammoType: 'stun', shopAfter: 'm03_ten_and_two',
      desc: 'Two darts on wires and a lot of volts. Drops anyone within eleven metres for five seconds, and nobody gets hurt.',
    },
    {
      id: 'pdw', name: 'Hornet PDW', slot: 'smg', kind: 'hitscan',
      damage: 21, headshotMult: 2.2, fireRate: 12, auto: true, range: 60,
      magSize: 45, reloadTime: 2.0, maxAmmo: 540, startAmmo: 135,
      price: 3200, ammoPrice: 95,
      recoil: 0.014, shake: 0.06, tracer: true, zoom: 0.78,
      falloff: { start: 20, end: 55, min: 0.6 },
      hold: 'pistol', flash: 0.8, sound: 'smg', soundPitch: 1.12, soundLevel: 0.95,
      kickVis: 0.01, fovPunch: 0.3, recoilRecover: 0.11, ammoType: '57', shopAfter: 'm10_sons',
      desc: 'A bullpup personal defence weapon with a 45-round top magazine. Steadier than the Wasp, and it reaches further.',
    },
    {
      id: 'sawnoff', name: 'Mule Sawn-off', slot: 'shotgun', kind: 'pellets',
      damage: 14, headshotMult: 1.3, fireRate: 3, range: 22, pellets: 12,
      magSize: 2, reloadTime: 1.7, maxAmmo: 60, startAmmo: 16,
      price: 1200, ammoPrice: 30,
      recoil: 0.12, shake: 0.5, zoom: 0.9,
      falloff: { start: 5, end: 18, min: 0.12 },
      knockback: 10, drivebyAllowed: true, hold: 'pistol', flash: 1.7, sound: 'sawnoff',
      kickVis: 0.07, fovPunch: 2.8, ammoType: '12g', shopAfter: 'm07_signal_fire',
      desc: 'A double-barrelled twelve with the barrels and stock cut down. Two blasts, then reload. Works out of a car window.',
    },
    {
      id: 'autoshotgun', name: 'Bull 12 Auto', slot: 'shotgun', kind: 'pellets',
      damage: 13, headshotMult: 1.4, fireRate: 3.6, range: 30, pellets: 8,
      magSize: 10, reloadTime: 3.1, maxAmmo: 90, startAmmo: 30,
      price: 6500, ammoPrice: 160,
      recoil: 0.07, shake: 0.35, zoom: 0.85,
      falloff: { start: 9, end: 24, min: 0.15 },
      knockback: 8, hold: 'rifle', flash: 1.4, sound: 'shotgun', soundPitch: 0.93,
      kickVis: 0.045, fovPunch: 1.8, recoilRecover: 0.14, ammoType: '12g', shopAfter: 'm17_canary',
      desc: 'A drum-fed semi-automatic shotgun. Ten shells as fast as you can pull the trigger.',
    },
    {
      id: 'lmg', name: 'Rhino LMG', slot: 'rifle', kind: 'hitscan',
      damage: 31, headshotMult: 2.5, fireRate: 10, auto: true, range: 140,
      magSize: 100, reloadTime: 4.6, maxAmmo: 500, startAmmo: 200,
      price: 9500, ammoPrice: 420,
      recoil: 0.03, shake: 0.14, tracer: true, zoom: 0.72,
      falloff: { start: 50, end: 140, min: 0.55 },
      knockback: 4, hold: 'rifle', flash: 1.2, sound: 'lmg', moveMult: 0.85,
      kickVis: 0.016, fovPunch: 0.5, recoilRecover: 0.05, ammoType: '762', shopAfter: 'm20_overwatch',
      desc: 'A belt-fed light machine gun with a hundred-round box. It climbs if you hold it down; short bursts.',
    },
    {
      id: 'dmr', name: 'Osprey DMR', slot: 'sniper', kind: 'hitscan',
      damage: 62, headshotMult: 3.2, fireRate: 3, range: 300,
      magSize: 10, reloadTime: 2.4, maxAmmo: 100, startAmmo: 30,
      price: 5500, ammoPrice: 160,
      recoil: 0.06, shake: 0.18, tracer: true, zoom: 0.42,
      falloff: { start: 150, end: 300, min: 0.75 },
      knockback: 5, hold: 'rifle', flash: 1.1, sound: 'rifle', soundPitch: 0.86, soundLevel: 1.15,
      hipSpread: 0.05, kickVis: 0.04, fovPunch: 1.2, ammoType: '308', shopAfter: 'm17_canary',
      desc: 'A semi-automatic marksman rifle with a 3x scope. Two to the body, one to the head, and quick follow-up shots.',
    },
    {
      id: 'rpg', name: 'Thunderhead RPG', slot: 'heavy', kind: 'projectile',
      damage: 400, fireRate: 0.6, range: 300,
      magSize: 1, reloadTime: 2.6, maxAmmo: 10, startAmmo: 3,
      price: 15000, ammoPrice: 1200,
      recoil: 0.08, shake: 0.6, zoom: 0.7, blastRadius: 8, knockback: 14,
      projectile: { speed: 60, gravity: 0, fuse: 6, bounce: false, model: 'rocket' },
      hold: 'rifle', flash: 2, sound: 'rocket', moveMult: 0.8,
      kickVis: 0.06, fovPunch: 3, ammoType: 'rocket', shopAfter: 'm25_iron',
      desc: 'A shoulder-fired rocket launcher. Cars, helicopters, roadblocks: one rocket and they are gone. Mind the back-blast.',
    },
    {
      id: 'glauncher', name: 'Boomer GL', slot: 'heavy', kind: 'projectile',
      damage: 170, fireRate: 1.4, range: 120,
      magSize: 6, reloadTime: 3.2, maxAmmo: 36, startAmmo: 12,
      price: 11000, ammoPrice: 900,
      recoil: 0.06, shake: 0.35, zoom: 0.75, blastRadius: 6, knockback: 11,
      projectile: { speed: 32, gravity: 12, fuse: 1.8, bounce: true, model: 'gl_grenade' },
      hold: 'rifle', flash: 1.2, sound: 'glauncher', moveMult: 0.85,
      kickVis: 0.045, fovPunch: 1.6, ammoType: '40mm', shopAfter: 'm23_ashes',
      desc: 'A six-shot revolving grenade launcher. Lob them round corners; they bounce, and go off on anyone they hit.',
    },
    {
      id: 'minigun', name: 'Buzzsaw Minigun', slot: 'heavy', kind: 'hitscan',
      damage: 24, headshotMult: 1.5, fireRate: 30, auto: true, range: 110, spinUp: 0.55,
      magSize: 300, reloadTime: 5.5, maxAmmo: 1500, startAmmo: 600,
      price: 35000, ammoPrice: 600,
      recoil: 0.006, shake: 0.12, tracer: true, zoom: 0.85,
      falloff: { start: 40, end: 110, min: 0.5 },
      knockback: 5, hold: 'heavy', flash: 1.1, sound: 'minigun', moveMult: 0.6,
      kickVis: 0.006, fovPunch: 0.15, recoilRecover: 0.2, ammoType: '762', shopAfter: 'm30_salt_and_iron',
      desc: 'Six spinning barrels and three thousand rounds a minute. It takes a moment to spin up, then nothing stands in front of it.',
    },
    {
      id: 'limpet', name: 'Limpet Charge', slot: 'thrown', kind: 'thrown',
      damage: 230, fireRate: 1.2, range: 30,
      magSize: 1, maxAmmo: 8, startAmmo: 3, price: 400, ammoPrice: 400,
      throwSpeed: 13, fuse: 0, blastRadius: 7, knockback: 13, sticky: true,
      hold: 'thrown', sound: 'thrown', ammoType: 'limpet', shopAfter: 'm25_iron',
      desc: 'A magnetic charge that sticks to whatever it hits: walls, the ground, cars. Press R to set them all off.',
    },
  ];

  VH.Data.weapons = LIST.map((w) => Object.freeze(Object.assign({}, BASE, w)));

  const byId = {};
  for (const w of VH.Data.weapons) byId[w.id] = w;
  VH.Data.weaponsById = byId;

  /** Definition by id (undefined if unknown). */
  VH.Data.weapon = function weapon(id) {
    return byId[id];
  };

  /** Whether Bayline Arms sells a weapon yet: its shopAfter job is done (or it has none). */
  VH.Data.weaponUnlocked = function weaponUnlocked(def, completed) {
    if (!def || !def.shopAfter) return true;
    const need = Array.isArray(def.shopAfter) ? def.shopAfter : [def.shopAfter];
    return need.some((id) => !!(completed && completed[id]));
  };

  /** The weapons that live in a slot, in cycle order. */
  VH.Data.weaponsInSlot = function weaponsInSlot(slotId) {
    return VH.Data.weapons.filter((w) => w.slot === slotId);
  };

  /**
   * Damage of one hit (one pellet) at `distance` metres, with range falloff
   * and the headshot multiplier applied.
   */
  VH.Data.weaponDamage = function weaponDamage(def, distance, headshot) {
    let d = def.damage;
    const f = def.falloff;
    if (f && distance > f.start) {
      const t = Math.min(1, (distance - f.start) / Math.max(0.001, f.end - f.start));
      d *= 1 + (f.min - 1) * t;
    }
    if (headshot) d *= def.headshotMult;
    return d;
  };
})();
